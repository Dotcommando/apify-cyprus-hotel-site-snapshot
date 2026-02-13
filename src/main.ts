import { Actor } from 'apify';
import { PlaywrightCrawler, RequestQueue, log, sleep } from 'crawlee';
import type { PlaywrightCrawlingContext } from 'crawlee';

import {
  EErrorCode,
  EErrorStage,
  ERunStatus,
  type IActorError,
  type IActorInput,
  type IActorOutput,
  type IAssetsSummary,
  type IConsentLog,
  type IDomMeta,
  type ILayoutSnapshot,
  type IPageRecord,
  type IRedirectChainItem,
  type IViewport,
} from './types.js';

function nowIso(): string {
  return new Date().toISOString();
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

function detectErrorCode(
  errMsg: string,
  status: number | null,
  isRobots: boolean,
  bodySnippet: string,
): EErrorCode {
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

  if (
    b.includes('captcha') ||
    b.includes('are you human') ||
    b.includes('verify you are') ||
    b.includes('access denied')
  ) {
    return EErrorCode.CAPTCHA_DETECTED;
  }

  return EErrorCode.UNKNOWN;
}

async function extractDomMeta(page: PlaywrightCrawlingContext['page']): Promise<IDomMeta> {
  return page.evaluate(() => {
    const title = document.title || null;
    const html = document.documentElement;
    const lang = html?.getAttribute('lang') || null;

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl?.getAttribute('href') || null;

    const hreflang = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
      .map((el) => ({
        hreflang: el.getAttribute('hreflang') || '',
        href: el.getAttribute('href') || '',
      }))
      .filter((x) => Boolean(x.hreflang) && Boolean(x.href));

    return { title, lang, canonical, hreflang };
  });
}

async function extractOutboundDomains(
  page: PlaywrightCrawlingContext['page'],
  baseDomain: string,
): Promise<string[]> {
  return page.evaluate((bd) => {
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

    document.querySelectorAll('a[href]').forEach((a) => addUrl((a as HTMLAnchorElement).getAttribute('href')));
    document.querySelectorAll('script[src]').forEach((s) => addUrl((s as HTMLScriptElement).getAttribute('src')));
    document
      .querySelectorAll('link[rel="stylesheet"][href]')
      .forEach((l) => addUrl((l as HTMLLinkElement).getAttribute('href')));
    document.querySelectorAll('iframe[src]').forEach((f) => addUrl((f as HTMLIFrameElement).getAttribute('src')));

    return Array.from(domains).sort();
  }, baseDomain);
}

async function extractAssetsSummary(page: PlaywrightCrawlingContext['page']): Promise<IAssetsSummary> {
  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const styleTags = Array.from(document.querySelectorAll('style'));
    const imgs = Array.from(document.images || []);

    const scriptsCount = scripts.filter((s) => (s as HTMLScriptElement).src).length;
    const stylesCount = stylesheets.length;

    const inlineJsBytes = scripts
      .filter((s) => !(s as HTMLScriptElement).src)
      .reduce((sum, s) => sum + ((s.textContent || '').length || 0), 0);

    const inlineCssBytes = styleTags.reduce((sum, s) => sum + ((s.textContent || '').length || 0), 0);

    const imagesCount = imgs.length;
    const lazyImagesCount = imgs.filter((img) => ((img.getAttribute('loading') || '').toLowerCase() === 'lazy')).length;

    return { scriptsCount, stylesCount, inlineJsBytes, inlineCssBytes, imagesCount, lazyImagesCount };
  });
}

async function takeLayoutSnapshot(page: PlaywrightCrawlingContext['page']): Promise<ILayoutSnapshot> {
  return page.evaluate(() => {
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;

    function rectToObj(r: DOMRect) {
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }

    function isVisible(el: Element) {
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width >= 1 && r.height >= 1;
    }

    function inViewport(r: DOMRect) {
      return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
    }

    function getText(el: Element) {
      const t = ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      return t ? t.slice(0, 160) : null;
    }

    const fixedStickyElements: any[] = [];
    const clickableCandidates: any[] = [];

    const all = Array.from(document.querySelectorAll('body *'));
    for (const el of all) {
      if (!isVisible(el)) continue;

      const cs = window.getComputedStyle(el);
      const r = (el as HTMLElement).getBoundingClientRect();
      if (!inViewport(r)) continue;

      const zIndexRaw = cs.zIndex;
      const zIndex = Number.isFinite(Number(zIndexRaw)) ? Number(zIndexRaw) : null;

      if (cs.position === 'fixed' || cs.position === 'sticky') {
        fixedStickyElements.push({
          tag: el.tagName.toLowerCase(),
          id: (el as HTMLElement).id || null,
          className: typeof (el as any).className === 'string' ? (el as any).className.slice(0, 200) : null,
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
      const isClickable =
        tag === 'a' ||
        tag === 'button' ||
        (el as HTMLElement).getAttribute('role') === 'button' ||
        typeof (el as any).onclick === 'function' ||
        (el as HTMLElement).hasAttribute('onclick');

      if (isClickable) {
        const minW = 120;
        const minH = 32;
        if (r.width >= minW && r.height >= minH) {
          const href = tag === 'a' ? ((el as HTMLElement).getAttribute('href') || null) : null;
          clickableCandidates.push({
            tag,
            id: (el as HTMLElement).id || null,
            className: typeof (el as any).className === 'string' ? (el as any).className.slice(0, 200) : null,
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
    result.consentError = String((e as Error)?.message || e);
    return result;
  }
}

function buildErrorId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function truncate(s: string, max: number): string {
  const str = String(s || '');
  return str.length > max ? str.slice(0, max) : str;
}

function kvSafeKey(key: string): string {
  // Apify KV key must be a single "filename-like" token (no slashes).
  // Keep it deterministic and readable.
  return key
    .replace(/[\/\\]+/g, '_')
    .replace(/[^a-zA-Z0-9!\-_.()']/g, '_')
    .slice(0, 240);
}

await Actor.init();

const kvStoreId = Actor.getEnv().defaultKeyValueStoreId || null;

const inputRaw = (await Actor.getInput<IActorInput>()) || ({} as IActorInput);

const hotelId = String(inputRaw.hotelId || '').trim();
const domain = normalizeDomain(inputRaw.domain || '');

const maxPages = Number.isFinite(Number(inputRaw.maxPages)) ? Number(inputRaw.maxPages) : 4;
const maxDepth = Number.isFinite(Number(inputRaw.maxDepth)) ? Number(inputRaw.maxDepth) : 1;

const collectHtml = inputRaw.collectHtml !== false;
const collectDesktop = inputRaw.collectDesktop === true;
const consentClickStrategy = inputRaw.consentClickStrategy || 'minimal';

const viewport: IViewport = inputRaw.mobileViewport?.width && inputRaw.mobileViewport?.height
  ? { width: Number(inputRaw.mobileViewport.width), height: Number(inputRaw.mobileViewport.height) }
  : { width: 390, height: 844 };

const timeoutMsPerPage = Number.isFinite(Number(inputRaw.timeoutMsPerPage)) ? Number(inputRaw.timeoutMsPerPage) : 60000;

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

function kvRecordUrlOrRef(key: string): string {
  if (!kvStoreId) return `KV:${key}`;
  return `https://api.apify.com/v2/key-value-stores/${kvStoreId}/records/${encodeURIComponent(key)}?attachment=true`;
}

function pushError(e: Omit<IActorError, 'id' | 'createdAt'>): void {
  errors.push({
    id: buildErrorId(),
    createdAt: nowIso(),
    ...e,
  });
}

const requestQueue = await RequestQueue.open();

for (const url of seedUrls) {
  const u = canonicalize(url);
  await requestQueue.addRequest({
    url: u,
    uniqueKey: u,
    userData: { depth: 0, referrerUrl: null as string | null, isHome: true },
  });
}

async function saveScreenshot(key: string, buf: Buffer | null): Promise<string | null> {
  if (!buf) return null;
  const safeKey = kvSafeKey(key);

  try {
    await Actor.setValue(safeKey, buf, { contentType: 'image/png' });
    return kvRecordUrlOrRef(safeKey);
  } catch (e) {
    pushError({
      stage: EErrorStage.STORAGE,
      code: EErrorCode.STORAGE_WRITE_FAILED,
      message: truncate(String((e as Error)?.message || e), 500),
      url: null,
      httpStatus: null,
      evidence: { bodySnippet: null },
    });
    return null;
  }
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
        if (rt === 'font') return route.abort();
        return route.continue();
      });

      page.on('response', (resp) => {
        try {
          const status = resp.status();
          if (status >= 300 && status <= 399) {
            const from = resp.url();
            const loc = resp.headers()?.location || null;
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
  requestHandler: async ({ page, request, response, enqueueLinks: enqueueLinksFn }: PlaywrightCrawlingContext) => {
    const ud = (request.userData || {}) as { depth?: number; referrerUrl?: string | null; isHome?: boolean };
    const depth = Number.isFinite(Number(ud.depth)) ? Number(ud.depth) : 0;
    const referrerUrl = ud.referrerUrl ?? null;
    const isHome = ud.isHome === true;

    const t0 = Date.now();

    let status: number | null = null;
    let contentType: string | null = null;
    let finalUrl: string | null = null;

    try {
      finalUrl = page.url();
      status = response?.status?.() ?? null;
      contentType = (response?.headers?.()['content-type'] as string | undefined) ?? null;

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

        const shotA = await page.screenshot({ fullPage: false }).catch(() => null);
        const shotARef = await saveScreenshot(`${baseKey}/home-initial.png`, shotA ? Buffer.from(shotA) : null);
        const layoutA = await takeLayoutSnapshot(page).catch((): ILayoutSnapshot | null => null);

        item.mobile.initial = { screenshotRef: shotARef, layoutSnapshot: layoutA };

        if (consentClickStrategy !== 'none') {
          const consentLog = await attemptMinimalConsentAction(page);
          item.mobile.consent = consentLog;

          await sleep(350);

          const shotB = await page.screenshot({ fullPage: false }).catch(() => null);
          const shotBRef = await saveScreenshot(`${baseKey}/home-after-consent.png`, shotB ? Buffer.from(shotB) : null);
          const layoutB = await takeLayoutSnapshot(page).catch((): ILayoutSnapshot | null => null);

          item.mobile.afterConsent = { screenshotRef: shotBRef, layoutSnapshot: layoutB };
        }

        await page.evaluate(() => window.scrollTo(0, 550)).catch(() => null);
        await sleep(500);

        const shotC = await page.screenshot({ fullPage: false }).catch(() => null);
        const shotCRef = await saveScreenshot(`${baseKey}/home-after-scroll.png`, shotC ? Buffer.from(shotC) : null);
        const layoutC = await takeLayoutSnapshot(page).catch((): ILayoutSnapshot | null => null);

        item.mobile.afterScroll = { scrollY: 550, screenshotRef: shotCRef, layoutSnapshot: layoutC };

        if (collectDesktop) {
          const desktopViewport: IViewport = { width: 1366, height: 768 };
          await page.setViewportSize(desktopViewport).catch(() => null);
          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => null);
          await sleep(250);

          const deskShot = await page.screenshot({ fullPage: false }).catch(() => null);
          const deskRef = await saveScreenshot(`${baseKey}/home-desktop.png`, deskShot ? Buffer.from(deskShot) : null);

          item.desktop = { viewport: desktopViewport, screenshotRef: deskRef };

          await page.setViewportSize({ width: viewport.width, height: viewport.height }).catch(() => null);
        }
      }

      pages.push(item);

      if (depth < maxDepth) {
        try {
          await enqueueLinksFn({
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
        } catch (e) {
          pushError({
            stage: EErrorStage.ENQUEUE,
            code: EErrorCode.UNKNOWN,
            message: truncate(String((e as Error)?.message || e), 500),
            url: request.url,
            httpStatus: status,
            evidence: { finalUrl, contentType },
          });
        }
      }
    } catch (e) {
      const msg = String((e as Error)?.message || e);

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
    const msg = String((error as Error)?.message || error);
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
      totalHtmlBytes: pages.reduce((sum, p) => sum + ((p.contentStorage.html || '').length || 0), 0),
    },
  },
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
