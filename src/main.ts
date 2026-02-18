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
import { CLICK_SELECTORS } from './const/index.js';

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

const HOME_RENDER_WAIT_MS = 1000;
const HOME_MEDIA_WAIT_MS = 2000;
const CONSENT_CLICK_TIMEOUT_MS = 800;
const SECOND_SCREENSHOT_WAIT_MS = 400;

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

  for (const selector of CLICK_SELECTORS) {
    try {
      const locator = page.locator(selector).first();
      const count = await locator.count();
      if (count === 0) continue;

      await locator.click({ timeout: CONSENT_CLICK_TIMEOUT_MS });
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

function isOkHttpStatus(status: number | undefined): boolean {
  if (typeof status !== 'number') return false;
  return status >= 200 && status < 400;
}

function statusLabel(status: number | undefined): string {
  return typeof status === 'number' ? String(status) : 'no-status';
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

  const seedUrlsAll = uniqStrings([...(input.seedUrls ?? []), homeUrl]).map(ensureHttpsUrl);

  const maxPages = clampInt(input.maxPages ?? 1, 1, 500);
  const maxDepth = clampInt(input.maxDepth ?? 0, 0, 25);
  const maxRequestsPerMinute = clampInt(input.maxRequestsPerMinute ?? 30, 1, 6000);
  const maxRequestRetries = clampInt(input.maxRequestRetries ?? 0, 0, 10);
  const navigationTimeoutSecs = msToSecsCeil(input.navigationTimeoutMs ?? 10_000);
  const requestHandlerTimeoutSecs = msToSecsCeil(input.requestTimeoutMs ?? 15_000);
  const storeHtml = Boolean(input.storeHtml ?? true);
  const storeHeaders = Boolean(input.storeHeaders ?? true);
  const takeHomeMobileScreenshot = Boolean(input.takeHomeMobileScreenshot ?? true);
  const tryDismissConsentFlag = Boolean(input.tryDismissConsent ?? true);
  const viewport = mergeViewport(input.homeMobileViewport);

  if (input.debug) log.setLevel(log.LEVELS.DEBUG);

  const startedAt = nowIso();
  const requestQueue = await RequestQueue.open();

  const pages: ICrawledPageSnapshot[] = [];
  let homeSnapshot: IHomeMobileSnapshot | undefined;
  const warnings: string[] = [];
  let files: IHotelSiteSnapshotFiles | undefined;

  const storeId = String(Actor.getEnv().defaultKeyValueStoreId ?? '').trim();

  let followUpQueued = false;
  let sitemapQueued = false;

  const maxRequestsPerCrawl = maxPages + SPECIAL_REQUEST_BUDGET;

  await requestQueue.addRequest({
    url: homeUrl,
    userData: { depth: 0, isSeed: true, isHome: true } satisfies IRequestUserData,
  });

  const crawler = new PlaywrightCrawler({
    requestQueue,
    maxRequestsPerCrawl,
    maxRequestsPerMinute,
    maxRequestRetries,
    navigationTimeoutSecs,
    requestHandlerTimeoutSecs,

    async requestHandler(ctx) {
      const { request, page, enqueueLinks } = ctx;

      const requestUserData = parseRequestUserData(request.userData);
      const depth = requestUserData.depth;
      const isHome = requestUserData.isHome;
      const specialFile = requestUserData.specialFile;

      const pageStartedAt = nowIso();

      let response: Response | null = null;
      let status: number | undefined;
      let finalUrl: string | undefined;
      let headers: Record<string, string> | undefined;
      let contentType: string | undefined;

      if (!specialFile) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      }

      response = await page.goto(request.url, { waitUntil: 'domcontentloaded' });
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
        const bodyText = await readResponseText(response);

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
                    userData: {
                      depth: 0,
                      isSeed: true,
                      isHome: false,
                      specialFile: 'sitemap',
                    } satisfies IRequestUserData,
                  },
                  { forefront: true },
                );
              }
            } else {
              await requestQueue.addRequest(
                {
                  url: sitemapFallbackUrl,
                  userData: {
                    depth: 0,
                    isSeed: true,
                    isHome: false,
                    specialFile: 'sitemap',
                  } satisfies IRequestUserData,
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
                userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'sitemap' } satisfies IRequestUserData,
              },
              { forefront: true },
            );
          }

          return;
        }

        if (specialFile === 'sitemap') {
          if (status !== 200) warnings.push(`sitemap-non-200: ${request.url}: ${statusLabel(status)}`);
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

      if (isHome) {
        if (!isOkHttpStatus(status)) {
          throw new Error(`home-bad-status:${statusLabel(status)}`);
        }

        if (!takeHomeMobileScreenshot) {
          throw new Error('home-screenshot-disabled');
        }

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
        await page.waitForTimeout(HOME_RENDER_WAIT_MS);

        const mediaWait = await waitForAboveTheFoldMedia({ page, timeoutMs: HOME_MEDIA_WAIT_MS, pollIntervalMs: 250 });
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
        await page.waitForTimeout(SECOND_SCREENSHOT_WAIT_MS);

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

        homeSnapshot = {
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
        };

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

        if (!followUpQueued) {
          followUpQueued = true;

          await requestQueue.addRequest(
            {
              url: robotsUrl,
              userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'robots' } satisfies IRequestUserData,
            },
            { forefront: true },
          );

          await requestQueue.addRequest(
            {
              url: llmsUrl,
              userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'llms' } satisfies IRequestUserData,
            },
            { forefront: true },
          );

          if (maxPages > 1) {
            const extraSeedUrls = seedUrlsAll.filter((url) => url !== homeUrl);
            for (const url of extraSeedUrls) {
              await requestQueue.addRequest({
                url,
                userData: { depth: 0, isSeed: true, isHome: false } satisfies IRequestUserData,
              });
            }
          }
        }
      } else {
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
    },

    async failedRequestHandler(ctx) {
      const requestUserData = parseRequestUserData(ctx.request.userData);
      const errorMessage = ctx.error instanceof Error ? ctx.error.message : String(ctx.error);

      const finishedAt = nowIso();
      const startedAt = finishedAt;

      if (requestUserData.specialFile) {
        warnings.push(`request-failed: ${ctx.request.url}: ${errorMessage}`);

        if (requestUserData.specialFile === 'robots' && !sitemapQueued) {
          sitemapQueued = true;
          const sitemapFallbackUrl = buildSiteFileUrl(ctx.request.url, '/sitemap.xml');

          await requestQueue.addRequest(
            {
              url: sitemapFallbackUrl,
              userData: { depth: 0, isSeed: true, isHome: false, specialFile: 'sitemap' } satisfies IRequestUserData,
            },
            { forefront: true },
          );
        }

        return;
      }

      warnings.push(`request-failed: ${ctx.request.url}: ${errorMessage}`);

      if (requestUserData.isHome) {
        return;
      }

      pages.push({
        url: ctx.request.url,
        finalUrl: ctx.request.url,
        redirectChain: buildRedirectChainSimple({ url: ctx.request.url, finalUrl: ctx.request.url }),
        startedAt,
        finishedAt,
        ...(storeHtml ? { html: undefined } : {}),
        ...(storeHeaders ? { headers: undefined } : {}),
        error: errorMessage,
      });
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

  const hasUsefulHome = Boolean(homeSnapshot);

  if (status === SNAPSHOT_STATUS.OK && !hasUsefulHome) {
    status = SNAPSHOT_STATUS.FAILED;
    fatalError = fatalError ?? 'no-home-snapshot';
  }

  if (status === SNAPSHOT_STATUS.FAILED) {
    pages.length = 0;
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
