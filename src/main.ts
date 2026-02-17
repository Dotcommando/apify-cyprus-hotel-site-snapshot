import { Actor, log } from 'apify';
import { PlaywrightCrawler, RequestQueue, Dataset } from 'crawlee';
import type { Page, Response } from 'playwright';

import {
  SNAPSHOT_STATUS,
  CONSENT_ACTION_TYPE,
  type ICyprusHotelSiteSnapshotInput,
  type ICyprusHotelSiteSnapshotOutput,
  type ICrawledPageSnapshot,
  type IHomeMobileSnapshot,
  type IConsentLog,
  type IViewport,
  type IHotelSiteSnapshotFiles,
} from './types.js';

import {
  nowIso,
  msToSecsCeil,
  normalizeDomainToHomeUrl,
  ensureHttpsUrl,
  uniqStrings,
  pickHeader,
  isProbablyHtml,
  buildRedirectChainSimple,
  clampInt,
  waitForAboveTheFoldMedia,
  buildKvsRecordPublicUrl,
} from './utils/index.js';

type SPECIAL_FILE_KIND = 'robots' | 'sitemap' | 'llms';

interface IRequestUserData {
  depth: number;
  isSeed: boolean;
  isHome: boolean;
  specialFile?: SPECIAL_FILE_KIND;
}

const DEFAULT_VIEWPORT: IViewport = {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  isLandscape: false,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const MAX_SITEMAP_URLS_FROM_ROBOTS = 10;
const SPECIAL_REQUEST_BUDGET = 2 + MAX_SITEMAP_URLS_FROM_ROBOTS; // robots + llms + up to N sitemap urls

function mergeViewport(partialViewport?: Partial<IViewport>): IViewport {
  return { ...DEFAULT_VIEWPORT, ...(partialViewport ?? {}) };
}

function buildSiteFileUrl(homeUrl: string, path: string): string {
  return new URL(path, homeUrl).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSpecialFileKind(value: unknown): value is SPECIAL_FILE_KIND {
  return value === 'robots' || value === 'sitemap' || value === 'llms';
}

function parseRequestUserData(value: unknown): IRequestUserData {
  if (!isRecord(value)) return { depth: 0, isSeed: false, isHome: false };

  const depthRaw = value['depth'];
  const isSeedRaw = value['isSeed'];
  const isHomeRaw = value['isHome'];
  const specialFileRaw = value['specialFile'];

  const depth = typeof depthRaw === 'number' && Number.isFinite(depthRaw) ? depthRaw : Number(depthRaw ?? 0);
  const isSeed = typeof isSeedRaw === 'boolean' ? isSeedRaw : Boolean(isSeedRaw);
  const isHome = typeof isHomeRaw === 'boolean' ? isHomeRaw : Boolean(isHomeRaw);

  const specialFile = isSpecialFileKind(specialFileRaw) ? specialFileRaw : undefined;

  return {
    depth: Number.isFinite(depth) ? depth : 0,
    isSeed,
    isHome,
    ...(specialFile ? { specialFile } : {}),
  };
}

function extractSitemapUrlsFromRobots(robotsText: string): string[] {
  const out: string[] = [];
  const lines = robotsText.split(/\r?\n/g);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = /^sitemap\s*:\s*(.+)\s*$/i.exec(line);
    if (!match) continue;

    const url = match[1]?.trim();
    if (url) out.push(url);
  }

  return uniqStrings(out);
}

function resolveSitemapUrls(params: { robotsText: string; baseUrl: string }): string[] {
  const { robotsText, baseUrl } = params;

  const rawUrls = extractSitemapUrlsFromRobots(robotsText);
  const resolved: string[] = [];

  for (const rawUrl of rawUrls) {
    const trimmed = rawUrl.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      resolved.push(ensureHttpsUrl(trimmed));
      continue;
    }

    try {
      resolved.push(new URL(trimmed, baseUrl).toString());
    } catch {
      // ignore invalid url
    }
  }

  return uniqStrings(resolved);
}

async function tryDismissConsent(page: Page): Promise<IConsentLog[]> {
  const logs: IConsentLog[] = [];
  const add = (entry: Omit<IConsentLog, 'at'>) => logs.push({ at: nowIso(), ...entry });

  const clickSelectors = [
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button:has-text("Agree")',
    'button:has-text("Allow all")',
    'button:has-text("Accept all")',
    'button:has-text("OK")',
    'button:has-text("Got it")',
    '[aria-label*="accept" i]',
    '[id*="accept" i]',
    '[class*="accept" i]',
  ];

  for (const selector of clickSelectors) {
    try {
      const locator = page.locator(selector).first();
      const count = await locator.count();
      if (count === 0) continue;

      await locator.click({ timeout: 1500 });
      add({ type: CONSENT_ACTION_TYPE.CLICK, label: 'consent-click', selector, ok: true });
      return logs;
    } catch (e) {
      add({
        type: CONSENT_ACTION_TYPE.CLICK,
        label: 'consent-click',
        selector,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return logs;
}

function buildHomeSnapshot(params: {
  url: string;
  finalUrl?: string;
  viewport: IViewport;
  startedAt: string;
  finishedAt: string;
  status?: number;
  redirectChain: ReturnType<typeof buildRedirectChainSimple>;
  consentAttempted: boolean;
  consentLog: IConsentLog[];
  screenshotKey: string;
  secondScreenshotKey: string;
  screenshotContentType: string;
  title?: string;
  metaDescription?: string;
  notes?: string[];
}): IHomeMobileSnapshot {
  const {
    url,
    finalUrl,
    viewport,
    startedAt,
    finishedAt,
    status,
    redirectChain,
    consentAttempted,
    consentLog,
    screenshotKey,
    secondScreenshotKey,
    screenshotContentType,
    title,
    metaDescription,
    notes,
  } = params;

  return {
    url,
    finalUrl,
    viewport,
    startedAt,
    finishedAt,
    status,
    redirectChain,
    consentAttempted,
    consentLog,
    screenshotKey,
    secondScreenshotKey,
    screenshotContentType,
    title,
    metaDescription,
    notes,
  };
}

async function readResponseText(response: Response | null): Promise<string | undefined> {
  if (!response) return undefined;

  try {
    const text = await response.text();
    return text;
  } catch {
    // ignore
  }

  try {
    const buffer = await response.body();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  } catch {
    return undefined;
  }
}

await Actor.main(async () => {
  const rawInput = await Actor.getInput<ICyprusHotelSiteSnapshotInput>();
  const input: Partial<ICyprusHotelSiteSnapshotInput> = rawInput ?? {};

  const hotelId = String(input.hotelId ?? '').trim();
  const domain = String(input.domain ?? '').trim();

  if (!hotelId) throw new Error('Input.hotelId is required');
  if (!domain) throw new Error('Input.domain is required');

  const homeUrl = normalizeDomainToHomeUrl(domain);

  const robotsUrl = buildSiteFileUrl(homeUrl, '/robots.txt');
  const llmsUrl = buildSiteFileUrl(homeUrl, '/llms.txt');

  const seedUrls = uniqStrings([...(input.seedUrls ?? []), homeUrl]).map(ensureHttpsUrl);

  const maxPages = clampInt(input.maxPages ?? 25, 1, 500);
  const maxDepth = clampInt(input.maxDepth ?? 1, 0, 25);
  const maxRequestsPerMinute = clampInt(input.maxRequestsPerMinute ?? 60, 1, 6000);
  const navigationTimeoutSecs = msToSecsCeil(input.navigationTimeoutMs ?? 45_000);
  const requestHandlerTimeoutSecs = msToSecsCeil(input.requestTimeoutMs ?? 60_000);
  const storeHtml = Boolean(input.storeHtml ?? true);
  const storeHeaders = Boolean(input.storeHeaders ?? true);
  const takeHomeMobileScreenshot = Boolean(input.takeHomeMobileScreenshot ?? true);
  const tryDismissConsentFlag = Boolean(input.tryDismissConsent ?? true);
  const viewport = mergeViewport(input.homeMobileViewport);

  if (input.debug) log.setLevel(log.LEVELS.DEBUG);

  const startedAt = nowIso();
  const requestQueue = await RequestQueue.open();

  for (const url of seedUrls) {
    const userData: IRequestUserData = { depth: 0, isSeed: true, isHome: url === homeUrl };
    await requestQueue.addRequest({ url, userData });
  }

  await requestQueue.addRequest(
    {
      url: robotsUrl,
      userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'robots' },
    },
    { forefront: true },
  );

  await requestQueue.addRequest(
    {
      url: llmsUrl,
      userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'llms' },
    },
    { forefront: true },
  );

  const pages: ICrawledPageSnapshot[] = [];
  let homeSnapshot: IHomeMobileSnapshot | undefined;
  const warnings: string[] = [];

  let files: IHotelSiteSnapshotFiles | undefined;

  const storeId = String(Actor.getEnv().defaultKeyValueStoreId ?? '').trim();

  let sitemapQueued = false;

  const maxRequestsPerCrawl = maxPages + SPECIAL_REQUEST_BUDGET;

  const crawler = new PlaywrightCrawler({
    requestQueue,
    maxRequestsPerCrawl,
    maxRequestsPerMinute,
    navigationTimeoutSecs,
    requestHandlerTimeoutSecs,
    async requestHandler(ctx) {
      const { request, page, enqueueLinks } = ctx;

      const requestUserData = parseRequestUserData(request.userData);

      const depth = requestUserData.depth;
      const isHome = requestUserData.isHome;
      const specialFile = requestUserData.specialFile;

      const pageStartedAt = nowIso();

      let status: number | undefined;
      let finalUrl: string | undefined;
      let headers: Record<string, string> | undefined;
      let contentType: string | undefined;

      try {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const response = await page.goto(request.url, { waitUntil: 'domcontentloaded' });
        status = response?.status();
        finalUrl = response?.url() ?? page.url();

        try {
          headers = response ? response.headers() : undefined;
        } catch {
          headers = undefined;
        }

        contentType = pickHeader(headers, 'content-type');

        const redirectChain = buildRedirectChainSimple({ url: request.url, finalUrl, status });
        const pageFinishedAt = nowIso();

        if (specialFile) {
          const bodyText = await readResponseText(response ?? null);

          if (specialFile === 'robots') {
            const sitemapFallbackUrl = buildSiteFileUrl(finalUrl ?? request.url, '/sitemap.xml');

            if (status === 200 && typeof bodyText === 'string' && bodyText.trim()) {
              files = files ?? {};
              files.robotsTxt = bodyText;

              const sitemapUrlsAll = resolveSitemapUrls({
                robotsText: bodyText,
                baseUrl: finalUrl ?? request.url,
              });

              const sitemapUrls = sitemapUrlsAll.slice(0, MAX_SITEMAP_URLS_FROM_ROBOTS);

              sitemapQueued = true;

              if (sitemapUrls.length) {
                for (const sitemapUrl of sitemapUrls) {
                  await requestQueue.addRequest(
                    {
                      url: sitemapUrl,
                      userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'sitemap' },
                    },
                    { forefront: true },
                  );
                }
              } else {
                await requestQueue.addRequest(
                  {
                    url: sitemapFallbackUrl,
                    userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'sitemap' },
                  },
                  { forefront: true },
                );
              }

              if (sitemapUrlsAll.length > MAX_SITEMAP_URLS_FROM_ROBOTS) {
                warnings.push(
                  `robots-sitemap-limit: ${finalUrl ?? request.url}: found ${sitemapUrlsAll.length}, queued ${MAX_SITEMAP_URLS_FROM_ROBOTS}`,
                );
              }

              return;
            }

            if (!sitemapQueued) {
              sitemapQueued = true;
              await requestQueue.addRequest(
                {
                  url: sitemapFallbackUrl,
                  userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'sitemap' },
                },
                { forefront: true },
              );
            }

            return;
          }

          if (specialFile === 'sitemap') {
            const statusLabel = typeof status === 'number' ? String(status) : 'no-status';
            if (status !== 200) warnings.push(`sitemap-non-200: ${request.url}: ${statusLabel}`);
            if (status === 200 && (!bodyText || !bodyText.trim())) warnings.push(`sitemap-empty: ${request.url}`);
          }

          if (status === 200 && typeof bodyText === 'string' && bodyText.trim()) {
            files = files ?? {};

            if (specialFile === 'llms') {
              files.llmsTxt = bodyText;
            }

            if (specialFile === 'sitemap') {
              files.sitemapXml = bodyText;
            }
          }

          return;
        }

        let html: string | undefined;

        if (storeHtml && isProbablyHtml(contentType)) {
          html = await page.content().catch(() => undefined);
        }

        pages.push({
          url: request.url,
          finalUrl,
          status,
          contentType,
          redirectChain,
          startedAt: pageStartedAt,
          finishedAt: pageFinishedAt,
          ...(storeHtml ? { html } : {}),
          ...(storeHeaders ? { headers } : {}),
        });

        if (isHome && takeHomeMobileScreenshot) {
          const notes: string[] = [];

          const title = await page.title().catch(() => undefined);

          let metaDescription: string | undefined;
          try {
            metaDescription =
              (await page.locator('meta[name="description"]').first().getAttribute('content')) ?? undefined;
          } catch {
            metaDescription = undefined;
          }

          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
          await page.waitForTimeout(3000);

          const mediaWait = await waitForAboveTheFoldMedia({ page, timeoutMs: 5000, pollIntervalMs: 250 });
          if (!mediaWait.ok) notes.push(`media-wait:${mediaWait.reason ?? 'unknown'}`);

          const screenshotContentType = 'image/png';
          const screenshotKey1Raw = `home-mobile-${hotelId}-1.png`;
          const buffer1 = await page.screenshot({ fullPage: false, type: 'png' });

          await Actor.setValue(screenshotKey1Raw, buffer1, { contentType: screenshotContentType });

          const consentAttempted = tryDismissConsentFlag;
          let consentLog: IConsentLog[] = [];

          if (tryDismissConsentFlag) consentLog = await tryDismissConsent(page);

          await page
            .evaluate((scrollY: number) => window.scrollBy(0, scrollY), Math.floor(viewport.height * 0.9))
            .catch(() => undefined);
          await page.waitForTimeout(800);

          const screenshotKey2Raw = `home-mobile-${hotelId}-2.png`;
          const buffer2 = await page.screenshot({ fullPage: false, type: 'png' });

          await Actor.setValue(screenshotKey2Raw, buffer2, { contentType: screenshotContentType });

          if (!storeId) notes.push('kvs-id-missing');

          const screenshotUrl1 = storeId
            ? buildKvsRecordPublicUrl({ storeId, key: screenshotKey1Raw })
            : screenshotKey1Raw;

          const screenshotUrl2 = storeId
            ? buildKvsRecordPublicUrl({ storeId, key: screenshotKey2Raw })
            : screenshotKey2Raw;

          homeSnapshot = buildHomeSnapshot({
            url: request.url,
            finalUrl,
            viewport,
            startedAt: pageStartedAt,
            finishedAt: pageFinishedAt,
            status,
            redirectChain,
            consentAttempted,
            consentLog,
            screenshotKey: screenshotUrl1,
            secondScreenshotKey: screenshotUrl2,
            screenshotContentType,
            title,
            metaDescription,
            notes: notes.length ? notes : undefined,
          });
        }

        if (depth < maxDepth) {
          await enqueueLinks({
            strategy: 'same-domain',
            transformRequestFunction: (enqueueRequest) => {
              const nextDepth = depth + 1;
              const nextUserData: IRequestUserData = {
                depth: nextDepth,
                isSeed: false,
                isHome: enqueueRequest.url === homeUrl,
              };
              enqueueRequest.userData = nextUserData;
              return enqueueRequest;
            },
          });
        }
      } catch (e) {
        const pageFinishedAt = nowIso();
        finalUrl = finalUrl ?? page.url();

        const redirectChain = buildRedirectChainSimple({ url: request.url, finalUrl, status });
        const error = e instanceof Error ? e.message : String(e);

        if (!specialFile) {
          pages.push({
            url: request.url,
            finalUrl,
            status,
            contentType,
            redirectChain,
            startedAt: pageStartedAt,
            finishedAt: pageFinishedAt,
            ...(storeHtml ? { html: undefined } : {}),
            ...(storeHeaders ? { headers } : {}),
            error,
          });
        }

        warnings.push(`request-failed: ${request.url}: ${error}`);
      }
    },
  });

  let status: SNAPSHOT_STATUS = SNAPSHOT_STATUS.OK;
  let fatalError: string | undefined;

  try {
    await crawler.run();
  } catch (e) {
    status = SNAPSHOT_STATUS.FAILED;
    fatalError = e instanceof Error ? e.message : String(e);
  }

  const finishedAt = nowIso();

  const output: ICyprusHotelSiteSnapshotOutput = {
    hotelId,
    domain,
    homeUrl,
    status,
    startedAt,
    finishedAt,
    home: homeSnapshot,
    pages,
    ...(files && (files.robotsTxt || files.sitemapXml || files.llmsTxt) ? { files } : {}),
    ...(warnings.length ? { warnings } : {}),
    ...(fatalError ? { error: fatalError } : {}),
  };

  await Actor.setValue('OUTPUT', output);

  const dataset = await Dataset.open();
  await dataset.pushData(output);
});
