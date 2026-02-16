import { Actor } from 'apify';
import { PlaywrightCrawler, RequestQueue, log, sleep } from 'crawlee';
import type { PlaywrightCrawlingContext } from 'crawlee';

import {
  EErrorCode,
  EErrorStage,
  ERunStatus,
  EXTRA_FILE_TYPE,
  type IActorError,
  type IActorInput,
  type IActorOutput,
  type IAssetsSummary,
  type IConsentLog,
  type IDomMeta,
  type IExtraFileRecord,
  type IExtraFilesBlock,
  type ILayoutSnapshot,
  type IPageRecord,
  type IRedirectChainItem,
  type IViewport,
} from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeDomain(domain: string): string {
  const d = String(domain || '').trim().toLowerCase();
  return d.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function ensureHttps(urlOrDomain: string): string | null {
  const s = String(urlOrDomain || '').trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `https://${s.replace(/^\/+/, '')}`;
}

function safeUrl(u: string): string | null {
  try {
    return new URL(u).toString();
  } catch {
    return null;
  }
}

function stripHash(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    return u.toString();
  } catch {
    return urlStr;
  }
}

function canonicalize(urlStr: string): string {
  return stripHash(urlStr);
}

function isInternalUrl(urlStr: string, baseDomain: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    const bd = baseDomain.toLowerCase();
    return host === bd || host === `www.${bd}` || host.endsWith(`.${bd}`);
  } catch {
    return false;
  }
}

function detectErrorCode(errMsg: string, status: number | null, isRobots: boolean, bodySnippet: string): EErrorCode {
  const m = String(errMsg || '').toLowerCase();
  const b = String(bodySnippet || '').toLowerCase();

  if (isRobots) return EErrorCode.ROBOTS_BLOCKED;
  if (status === 401 || status === 403) return EErrorCode.HTTP_401_403;
  if (status === 429) return EErrorCode.HTTP_429;
  if (status !== null && status >= 500 && status <= 599) return EErrorCode.HTTP_5XX;

  if (m.includes('dns') || m.includes('name not resolved') || m.includes('enotfound')) return EErrorCode.DNS_NOT_FOUND;
  if (m.includes('ssl') || m.includes('tls') || m.includes('certificate') || m.includes('cert')) return EErrorCode.TLS_ERROR;
  if (m.includes('too many redirects')) return EErrorCode.TOO_MANY_REDIRECTS;
  if (m.includes('timeout') || m.includes('navigation timeout')) return EErrorCode.TIMEOUT;
  if (m.includes('net::') || m.includes('navigation') || m.includes('blocked')) return EErrorCode.NAVIGATION_FAILED;
  if (m.includes('target closed') || m.includes('page crashed')) return EErrorCode.JS_CRASH;

  if (b.includes('captcha') || b.includes('are you human') || b.includes('verify you are') || b.includes('access denied')) {
    return EErrorCode.CAPTCHA_DETECTED;
  }

  return EErrorCode.UNKNOWN;
}

function buildErrorId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function truncate(s: string, max: number): string {
  const str = String(s || '');
  return str.length > max ? str.slice(0, max) : str;
}

function kvSafeKey(key: string): string {
  return key
    .replace(/[\/\\]+/g, '_')
    .replace(/[^a-zA-Z0-9!\-_.()']/g, '_')
    .slice(0, 240);
}

function buildHostCandidates(domain: string): string[] {
  const d = normalizeDomain(domain);
  const hosts = new Set<string>();
  if (d) hosts.add(d);
  if (d && !d.startsWith('www.')) hosts.add(`www.${d}`);
  return Array.from(hosts);
}

function buildUrlCandidates(hosts: string[], path: string): string[] {
  const p = path.startsWith('/') ? path : `/${path}`;
  const urls: string[] = [];
  for (const h of hosts) {
    urls.push(`https://${h}${p}`);
  }
  for (const h of hosts) {
    urls.push(`http://${h}${p}`);
  }
  return urls;
}

async function extractDomMeta(page: PlaywrightCrawlingContext['page']): Promise<IDomMeta> {
  return page.evaluate<IDomMeta>(() => {
    const title = document.title || null;
    const html = document.documentElement;
    const lang = html ? html.getAttribute('lang') : null;

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl ? canonicalEl.getAttribute('href') : null;

    const hreflang = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
      .map((el) => {
        const hreflangAttr = el.getAttribute('hreflang') || '';
        const hrefAttr = el.getAttribute('href') || '';
        return { hreflang: hreflangAttr, href: hrefAttr };
      })
      .filter((x) => Boolean(x.hreflang) && Boolean(x.href));

    return { title, lang, canonical, hreflang };
  });
}

async function extractOutboundDomains(page: PlaywrightCrawlingContext['page'], baseDomain: string): Promise<string[]> {
  return page.evaluate<string[], string>((bd) => {
    const domains = new Set<string>();

    function addUrl(u: string | null) {
      if (!u) return;
      try {
        const x = new URL(u, location.href);
        const h = x.hostname.toLowerCase();
        if (!h) return;
        const isInternal = h === bd || h === `www.${bd}` || h.endsWith(`.${bd}`);
        if (!isInternal) domains.add(h);
      } catch {
        // ignore
      }
    }

    document.querySelectorAll('a[href]').forEach((el) => {
      if (el instanceof HTMLAnchorElement) addUrl(el.getAttribute('href'));
    });

    document.querySelectorAll('script[src]').forEach((el) => {
      if (el instanceof HTMLScriptElement) addUrl(el.getAttribute('src'));
    });

    document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => {
      if (el instanceof HTMLLinkElement) addUrl(el.getAttribute('href'));
    });

    document.querySelectorAll('iframe[src]').forEach((el) => {
      if (el instanceof HTMLIFrameElement) addUrl(el.getAttribute('src'));
    });

    return Array.from(domains).sort();
  }, baseDomain);
}

async function extractAssetsSummary(page: PlaywrightCrawlingContext['page']): Promise<IAssetsSummary> {
  return page.evaluate<IAssetsSummary>(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const styleTags = Array.from(document.querySelectorAll('style'));
    const imgs = Array.from(document.images || []);

    const scriptsCount = scripts.filter((s) => s instanceof HTMLScriptElement && Boolean(s.src)).length;
    const stylesCount = stylesheets.length;

    const inlineJsBytes = scripts
      .filter((s) => s instanceof HTMLScriptElement && !s.src)
      .reduce((sum, s) => sum + (s.textContent ? s.textContent.length : 0), 0);

    const inlineCssBytes = styleTags.reduce((sum, s) => sum + (s.textContent ? s.textContent.length : 0), 0);

    const imagesCount = imgs.length;
    const lazyImagesCount = imgs.filter((img) => (img.getAttribute('loading') || '').toLowerCase() === 'lazy').length;

    return { scriptsCount, stylesCount, inlineJsBytes, inlineCssBytes, imagesCount, lazyImagesCount };
  });
}

async function takeLayoutSnapshot(page: PlaywrightCrawlingContext['page']): Promise<ILayoutSnapshot> {
  return page.evaluate<ILayoutSnapshot>(() => {
    type RectObj = { x: number; y: number; w: number; h: number };
    type LayoutEl = {
      tag: string;
      id: string | null;
      className: string | null;
      rect: RectObj;
      position: string | null;
      zIndex: number | null;
      bottomOffset: number;
      topOffset: number;
      text: string | null;
      href?: string | null;
      pointerEvents?: string | null;
      opacity?: string | null;
    };

    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;

    function rectToObj(r: DOMRect): RectObj {
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }

    function isVisible(el: Element): boolean {
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      const r = (el instanceof HTMLElement ? el : null)?.getBoundingClientRect();
      if (!r) return false;
      return r.width >= 1 && r.height >= 1;
    }

    function inViewport(r: DOMRect): boolean {
      return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
    }

    function getText(el: Element): string | null {
      const raw = (el instanceof HTMLElement ? el.innerText : el.textContent) || '';
      const t = raw.replace(/\s+/g, ' ').trim();
      return t ? t.slice(0, 160) : null;
    }

    const fixedStickyElements: LayoutEl[] = [];
    const clickableCandidates: LayoutEl[] = [];

    const all = Array.from(document.querySelectorAll('body *'));
    for (const el of all) {
      if (!isVisible(el)) continue;

      const cs = window.getComputedStyle(el);
      const r = el instanceof HTMLElement ? el.getBoundingClientRect() : null;
      if (!r) continue;
      if (!inViewport(r)) continue;

      const zIndexRaw = cs.zIndex;
      const zIndexNum = Number(zIndexRaw);
      const zIndex = Number.isFinite(zIndexNum) ? zIndexNum : null;

      if (cs.position === 'fixed' || cs.position === 'sticky') {
        fixedStickyElements.push({
          tag: el.tagName.toLowerCase(),
          id: el instanceof HTMLElement && el.id ? el.id : null,
          className: el instanceof HTMLElement && typeof el.className === 'string' ? el.className.slice(0, 200) : null,
          position: cs.position,
          zIndex,
          rect: rectToObj(r),
          bottomOffset: vh - r.bottom,
          topOffset: r.top,
          pointerEvents: cs.pointerEvents || null,
          opacity: cs.opacity || null,
          text: getText(el),
        });
      }

      const tag = el.tagName.toLowerCase();
      const role = el instanceof HTMLElement ? el.getAttribute('role') : null;

      const isClickable =
        tag === 'a' ||
        tag === 'button' ||
        role === 'button' ||
        (el instanceof HTMLElement && typeof (el.onclick || null) === 'function') ||
        (el instanceof HTMLElement && el.hasAttribute('onclick'));

      if (isClickable) {
        const minW = 120;
        const minH = 32;
        if (r.width >= minW && r.height >= minH) {
          const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') : null;
          clickableCandidates.push({
            tag,
            id: el instanceof HTMLElement && el.id ? el.id : null,
            className: el instanceof HTMLElement && typeof el.className === 'string' ? el.className.slice(0, 200) : null,
            rect: rectToObj(r),
            position: cs.position || null,
            zIndex,
            bottomOffset: vh - r.bottom,
            topOffset: r.top,
            text: getText(el),
            href,
          });
        }
      }

      if (fixedStickyElements.length >= 250 && clickableCandidates.length >= 250) break;
    }

    return {
      viewport: { width: vw, height: vh },
      fixedStickyElements: fixedStickyElements.slice(0, 250),
      clickableCandidates: clickableCandidates.slice(0, 250),
    };
  });
}

async function attemptMinimalConsentAction(page: PlaywrightCrawlingContext['page']): Promise<IConsentLog> {
  const result: IConsentLog = {
    consentAction: 'none',
    consentSelectorUsed: null,
    consentError: null,
  };

  try {
    const candidates = [
      'button:has-text("Accept")',
      'button:has-text("I agree")',
      'button:has-text("Agree")',
      'button:has-text("Allow")',
      'button:has-text("OK")',
      'button:has-text("Got it")',
      'button:has-text("Accept all")',
      'button:has-text("Allow all")',
      'button:has-text("Yes")',
      'button[aria-label*="close" i]',
      'button:has-text("Close")',
      '[role="button"][aria-label*="close" i]',
      'text=/^×$/',
    ];

    for (const sel of candidates) {
      const loc = page.locator(sel).first();
      const visible = await loc.isVisible().catch(() => false);
      if (!visible) continue;

      result.consentSelectorUsed = sel;

      await loc.click({ timeout: 1500 }).catch(() => null);

      if (sel.toLowerCase().includes('close') || sel.includes('×')) {
        result.consentAction = 'clickedClose';
      } else {
        result.consentAction = 'clickedAccept';
      }

      return result;
    }

    return result;
  } catch (e) {
    result.consentError = String((e instanceof Error ? e.message : e) || e);
    return result;
  }
}

type IFetchBody = {
  requestUrl: string;
  finalUrl: string | null;
  status: number | null;
  contentType: string | null;
  body: Buffer | null;
  isBinary: boolean;
  truncated: boolean;
  error: string | null;
};

async function fetchWithTimeout(url: string, timeoutMs: number, maxBytes: number): Promise<IFetchBody> {
  const controller = new AbortController();
  const started = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'apify-hotel-site-snapshot/1.0',
        accept: '*/*',
      },
    });

    const status = resp.status;
    const contentType = resp.headers.get('content-type');
    const finalUrl = resp.url || null;

    const ab = await resp.arrayBuffer();
    const buf = Buffer.from(ab);

    const truncated = buf.length > maxBytes;
    const body = truncated ? buf.subarray(0, maxBytes) : buf;

    const ct = (contentType || '').toLowerCase();
    const isBinary =
      url.toLowerCase().endsWith('.gz') ||
      ct.includes('application/gzip') ||
      ct.includes('application/x-gzip') ||
      ct.includes('octet-stream');

    return {
      requestUrl: url,
      finalUrl,
      status,
      contentType,
      body,
      isBinary,
      truncated,
      error: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const elapsed = Date.now() - started;
    const err = elapsed >= timeoutMs ? 'timeout' : msg;
    return {
      requestUrl: url,
      finalUrl: null,
      status: null,
      contentType: null,
      body: null,
      isBinary: false,
      truncated: false,
      error: err,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseSitemapFromRobots(robotsText: string, baseUrl: string): string | null {
  const lines = robotsText.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*sitemap\s*:\s*(.+)\s*$/i);
    if (!m) continue;
    const raw = (m[1] || '').trim();
    if (!raw) continue;
    try {
      return new URL(raw, baseUrl).toString();
    } catch {
      // ignore
    }
  }
  return null;
}

async function saveToKv(
  kvStore: Awaited<ReturnType<typeof Actor.openKeyValueStore>>,
  key: string,
  value: string | Buffer,
  contentType: string,
): Promise<string | null> {
  const safeKey = kvSafeKey(key);
  try {
    await kvStore.setValue(safeKey, value, { contentType });
    const publicUrl = kvStore.getPublicUrl(safeKey);
    if (typeof publicUrl === 'string' && publicUrl.length > 0) return publicUrl;
    return `KV:${safeKey}`;
  } catch {
    return null;
  }
}

async function collectExtraFiles(
  kvStore: Awaited<ReturnType<typeof Actor.openKeyValueStore>>,
  domain: string,
  runId: string | null,
  timeoutMs: number,
): Promise<IExtraFilesBlock> {
  const hosts = buildHostCandidates(domain);
  const baseUrl = ensureHttps(domain) || `https://${normalizeDomain(domain)}`;
  const baseKey = runId ? `files_${runId}` : 'files';

  const robotsCandidates = buildUrlCandidates(hosts, '/robots.txt');
  const sitemapCandidates = buildUrlCandidates(hosts, '/sitemap.xml');
  const llmsCandidates = [
    ...buildUrlCandidates(hosts, '/llms.txt'),
    ...buildUrlCandidates(hosts, '/.well-known/llms.txt'),
  ];

  async function firstOk(candidates: string[], maxBytes: number): Promise<IFetchBody> {
    let last: IFetchBody | null = null;
    for (const u of candidates) {
      const r = await fetchWithTimeout(u, timeoutMs, maxBytes);
      last = r;
      if (r.status !== null && r.status >= 200 && r.status <= 399) return r;
    }
    return last || {
      requestUrl: candidates[0] || '',
      finalUrl: null,
      status: null,
      contentType: null,
      body: null,
      isBinary: false,
      truncated: false,
      error: 'no-candidates',
    };
  }

  function toRecord(type: EXTRA_FILE_TYPE, fetchedAt: string, fetched: IFetchBody, storageRef: string | null): IExtraFileRecord {
    const bytes = fetched.body ? fetched.body.length : null;
    return {
      type,
      requestUrl: fetched.requestUrl,
      finalUrl: fetched.finalUrl,
      status: fetched.status,
      contentType: fetched.contentType,
      storageRef,
      bytes,
      isBinary: fetched.isBinary,
      truncated: fetched.truncated,
      fetchedAt,
      error: fetched.error,
    };
  }

  const fetchedAt = nowIso();

  const robots = await firstOk(robotsCandidates, 256_000);
  let robotsRef: string | null = null;
  let robotsText = '';

  if (robots.body) {
    const ct = robots.contentType || 'text/plain; charset=utf-8';
    if (!robots.isBinary) robotsText = robots.body.toString('utf-8');
    robotsRef = await saveToKv(kvStore, `${baseKey}_robots.txt`, robots.isBinary ? robots.body : robotsText, ct);
  }

  let sitemapUrlFromRobots: string | null = null;
  if (robotsText) sitemapUrlFromRobots = parseSitemapFromRobots(robotsText, baseUrl);

  const sitemap = sitemapUrlFromRobots
    ? await firstOk([sitemapUrlFromRobots], 2_000_000)
    : await firstOk(sitemapCandidates, 2_000_000);

  let sitemapRef: string | null = null;
  if (sitemap.body) {
    const ct = sitemap.contentType || 'application/xml; charset=utf-8';
    const value = sitemap.isBinary ? sitemap.body : sitemap.body.toString('utf-8');
    sitemapRef = await saveToKv(kvStore, `${baseKey}_sitemap.xml`, typeof value === 'string' ? value : value, ct);
  }

  const llms = await firstOk(llmsCandidates, 256_000);
  let llmsRef: string | null = null;
  if (llms.body) {
    const ct = llms.contentType || 'text/plain; charset=utf-8';
    const value = llms.isBinary ? llms.body : llms.body.toString('utf-8');
    llmsRef = await saveToKv(kvStore, `${baseKey}_llms.txt`, typeof value === 'string' ? value : value, ct);
  }

  return {
    robotsTxt: robots.requestUrl ? toRecord(EXTRA_FILE_TYPE.ROBOTS_TXT, fetchedAt, robots, robotsRef) : null,
    sitemapXml: sitemap.requestUrl ? toRecord(EXTRA_FILE_TYPE.SITEMAP_XML, fetchedAt, sitemap, sitemapRef) : null,
    llmsTxt: llms.requestUrl ? toRecord(EXTRA_FILE_TYPE.LLMS_TXT, fetchedAt, llms, llmsRef) : null,
  };
}

await Actor.init();

const inputRaw = (await Actor.getInput<IActorInput>()) || ({} as never);

const hotelId = String(inputRaw.hotelId || '').trim();
const domain = normalizeDomain(inputRaw.domain || '');

const maxPages = Number.isFinite(Number(inputRaw.maxPages)) ? Number(inputRaw.maxPages) : 1;
const maxDepth = Number.isFinite(Number(inputRaw.maxDepth)) ? Number(inputRaw.maxDepth) : 0;

const collectHtml = inputRaw.collectHtml !== false;
const collectDesktop = inputRaw.collectDesktop === true;
const consentClickStrategy = inputRaw.consentClickStrategy || 'minimal';
const collectFiles = inputRaw.collectFiles !== false;

const viewport: IViewport =
  inputRaw.mobileViewport && Number.isFinite(Number(inputRaw.mobileViewport.width)) && Number.isFinite(Number(inputRaw.mobileViewport.height))
    ? { width: Number(inputRaw.mobileViewport.width), height: Number(inputRaw.mobileViewport.height) }
    : { width: 390, height: 844 };

const timeoutMsPerPage = Number.isFinite(Number(inputRaw.timeoutMsPerPage)) ? Number(inputRaw.timeoutMsPerPage) : 60_000;

const seedUrlsInput = Array.isArray(inputRaw.seedUrls) ? inputRaw.seedUrls : [];
const seedUrls = seedUrlsInput.length
  ? seedUrlsInput.map((u) => safeUrl(u)).filter((x): x is string => Boolean(x))
  : [ensureHttps(domain)].filter((x): x is string => Boolean(x));

if (!hotelId) throw new Error('Input error: hotelId is required');
if (!domain) throw new Error('Input error: domain is required');
if (seedUrls.length === 0) throw new Error('Input error: seedUrls could not be constructed');

const startedAt = nowIso();
const runId = Actor.getEnv().actorRunId || null;

const pages: IPageRecord[] = [];
const errors: IActorError[] = [];
const redirectChains: IRedirectChainItem[] = [];

function pushError(e: Omit<IActorError, 'id' | 'createdAt'>): void {
  errors.push({
    id: buildErrorId(),
    createdAt: nowIso(),
    ...e,
  });
}

const kvStore = await Actor.openKeyValueStore();

const files: IExtraFilesBlock = collectFiles
  ? await collectExtraFiles(kvStore, domain, runId, Math.max(5000, Math.min(20_000, timeoutMsPerPage)))
  : { robotsTxt: null, sitemapXml: null, llmsTxt: null };

const requestQueue = await RequestQueue.open();

for (const url of seedUrls) {
  const u = canonicalize(url);
  await requestQueue.addRequest({
    url: u,
    uniqueKey: u,
    userData: { depth: 0, referrerUrl: null, isHome: true },
  });
}

async function saveScreenshot(key: string, buf: Buffer | null): Promise<string | null> {
  if (!buf) return null;
  const safeKey = kvSafeKey(key);

  try {
    await kvStore.setValue(safeKey, buf, { contentType: 'image/png' });
    const publicUrl = kvStore.getPublicUrl(safeKey);
    if (typeof publicUrl === 'string' && publicUrl.length > 0) return publicUrl;
    return `KV:${safeKey}`;
  } catch (e) {
    pushError({
      stage: EErrorStage.STORAGE,
      code: EErrorCode.STORAGE_WRITE_FAILED,
      message: truncate(String(e instanceof Error ? e.message : e), 500),
      url: null,
      httpStatus: null,
      evidence: { bodySnippet: null },
    });
    return null;
  }
}

type IUserData = { depth: number; referrerUrl: string | null; isHome: boolean };

function readUserData(v: unknown): IUserData {
  if (!isRecord(v)) return { depth: 0, referrerUrl: null, isHome: false };

  const depthRaw = v.depth;
  const refRaw = v.referrerUrl;
  const homeRaw = v.isHome;

  const depth = typeof depthRaw === 'number' && Number.isFinite(depthRaw) ? depthRaw : 0;
  const referrerUrl = typeof refRaw === 'string' ? refRaw : null;
  const isHome = homeRaw === true;

  return { depth, referrerUrl, isHome };
}

const crawler = new PlaywrightCrawler({
  requestQueue,
  maxRequestsPerCrawl: maxPages,
  maxConcurrency: 1,
  navigationTimeoutSecs: Math.max(30, Math.floor(timeoutMsPerPage / 1000)),
  launchContext: {
    launchOptions: { headless: true },
  },
  preNavigationHooks: [
    async ({ page, request }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.route('**/*', (route) => {
        const r = route.request();
        const rt = r.resourceType();
        if (rt === 'font' || rt === 'media') return route.abort();
        return route.continue();
      });

      page.on('response', (resp) => {
        try {
          const status = resp.status();
          if (status >= 300 && status <= 399) {
            const from = resp.url();
            const headers = resp.headers();
            const loc = headers['location'] || null;

            redirectChains.push({
              requestUrl: request.url,
              from,
              location: loc,
              status,
              at: nowIso(),
            });
          }
        } catch {
          // ignore
        }
      });
    },
  ],
  requestHandler: async ({ page, request, response, enqueueLinks }: PlaywrightCrawlingContext) => {
    const ud = readUserData(request.userData);
    const depth = ud.depth;
    const referrerUrl = ud.referrerUrl;
    const isHome = ud.isHome;

    const t0 = Date.now();

    let status: number | null = null;
    let contentType: string | null = null;
    let finalUrl: string | null = null;

    try {
      finalUrl = page.url();
      status = response ? response.status() : null;

      if (response) {
        const headers = response.headers();
        contentType = headers['content-type'] || null;
      }

      const domMeta = await extractDomMeta(page).catch((): IDomMeta | null => null);
      const outboundDomains = await extractOutboundDomains(page, domain).catch(() => []);
      const assetsSummary = await extractAssetsSummary(page).catch((): IAssetsSummary | null => null);

      let html: string | null = null;
      if (collectHtml) {
        html = await page.content().catch(() => null);
      }

      const item: IPageRecord = {
        hotelId,
        domain,
        url: request.url,
        finalUrl,
        depth,
        referrerUrl,
        status,
        contentType,
        fetchedAt: nowIso(),
        timings: { totalMs: Date.now() - t0 },
        domMeta,
        outboundDomains,
        assetsSummary,
        contentStorage: { html },
      };

      if (isHome) {
        const baseKey = runId ? `screenshots_${runId}` : 'screenshots';

        item.mobile = {
          viewport,
          consent: null,
          initial: null,
          afterConsent: null,
          afterScroll: null,
        };

        const shotABytes = await page.screenshot({ fullPage: false }).catch(() => null);
        const shotA = shotABytes ? Buffer.from(shotABytes) : null;
        const shotARef = await saveScreenshot(`${baseKey}/home-initial.png`, shotA);
        const layoutA = await takeLayoutSnapshot(page).catch((): ILayoutSnapshot | null => null);

        item.mobile.initial = { screenshotRef: shotARef, layoutSnapshot: layoutA };

        if (consentClickStrategy !== 'none') {
          const consentLog = await attemptMinimalConsentAction(page);
          item.mobile.consent = consentLog;

          await sleep(350);

          const shotBBytes = await page.screenshot({ fullPage: false }).catch(() => null);
          const shotB = shotBBytes ? Buffer.from(shotBBytes) : null;
          const shotBRef = await saveScreenshot(`${baseKey}/home-after-consent.png`, shotB);
          const layoutB = await takeLayoutSnapshot(page).catch((): ILayoutSnapshot | null => null);

          item.mobile.afterConsent = { screenshotRef: shotBRef, layoutSnapshot: layoutB };
        }

        await page.evaluate(() => window.scrollTo(0, 550)).catch(() => null);
        await sleep(500);

        const shotCBytes = await page.screenshot({ fullPage: false }).catch(() => null);
        const shotC = shotCBytes ? Buffer.from(shotCBytes) : null;
        const shotCRef = await saveScreenshot(`${baseKey}/home-after-scroll.png`, shotC);
        const layoutC = await takeLayoutSnapshot(page).catch((): ILayoutSnapshot | null => null);

        item.mobile.afterScroll = { scrollY: 550, screenshotRef: shotCRef, layoutSnapshot: layoutC };

        if (collectDesktop) {
          const desktopViewport: IViewport = { width: 1366, height: 768 };
          await page.setViewportSize(desktopViewport).catch(() => null);
          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => null);
          await sleep(250);

          const deskBytes = await page.screenshot({ fullPage: false }).catch(() => null);
          const deskShot = deskBytes ? Buffer.from(deskBytes) : null;
          const deskRef = await saveScreenshot(`${baseKey}/home-desktop.png`, deskShot);

          item.desktop = { viewport: desktopViewport, screenshotRef: deskRef };

          await page.setViewportSize({ width: viewport.width, height: viewport.height }).catch(() => null);
        }
      }

      pages.push(item);

      if (depth < maxDepth) {
        await enqueueLinks({
          selector: 'a[href]',
          strategy: 'same-domain',
          transformRequestFunction: (req) => {
            const u = canonicalize(req.url);
            if (!u) return null;
            if (!isInternalUrl(u, domain)) return null;

            const nextDepth = depth + 1;
            if (nextDepth > maxDepth) return null;

            const lu = u.toLowerCase();
            if (lu.includes('logout') || lu.includes('wp-admin') || lu.includes('cart')) return null;

            return {
              url: u,
              uniqueKey: u,
              userData: {
                depth: nextDepth,
                referrerUrl: finalUrl || request.url,
                isHome: false,
              },
            };
          },
        });
      }
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);

      let bodySnippet = '';
      try {
        const txt = await page.content();
        bodySnippet = txt ? txt.slice(0, 2000) : '';
      } catch {
        bodySnippet = '';
      }

      const code = detectErrorCode(msg, status, false, bodySnippet);

      pushError({
        stage: EErrorStage.RENDER,
        code,
        message: truncate(msg, 500),
        url: request.url,
        httpStatus: status,
        evidence: {
          finalUrl: finalUrl || null,
          contentType: contentType || null,
          bodySnippet: bodySnippet ? truncate(bodySnippet, 500) : null,
        },
      });

      log.warning(`Failed: ${request.url} (${code}) ${truncate(msg, 160)}`);
    }
  },
  failedRequestHandler: async ({ request, error }) => {
    const msg = String(error instanceof Error ? error.message : error);
    const code = detectErrorCode(msg, null, false, '');

    pushError({
      stage: EErrorStage.FETCH,
      code,
      message: truncate(msg, 500),
      url: request.url,
      httpStatus: null,
      evidence: { retries: request.retryCount },
    });
  },
});

await crawler.run();

const finishedAt = nowIso();

const output: IActorOutput = {
  runMeta: {
    startedAt,
    finishedAt,
    actorVersion: '1.0.0',
    runId,
    inputEcho: {
      hotelId,
      domain,
      seedUrls,
      maxPages,
      maxDepth,
      viewport,
      collectHtml,
      collectDesktop,
      consentClickStrategy,
      timeoutMsPerPage,
      collectFiles,
    },
  },
  snapshot: {
    hotelId,
    domain,
    seedUrls,
    collectedAt: finishedAt,
    stats: {
      pagesVisited: pages.length,
      errorsCount: errors.length,
      totalHtmlBytes: pages.reduce((sum, p) => sum + (p.contentStorage.html ? p.contentStorage.html.length : 0), 0),
    },
  },
  files,
  pages,
  errors,
  debug: { redirectChains },
  runStatus: (() => {
    if (pages.length === 0) return ERunStatus.FAILED;
    if (errors.length > 0) return ERunStatus.PARTIAL_SUCCESS;
    return ERunStatus.SUCCESS;
  })(),
};

await Actor.pushData(output);
await Actor.exit();
