import { Actor, log } from 'apify';
import { PlaywrightCrawler, RequestQueue, Dataset } from 'crawlee';
import { SNAPSHOT_STATUS, CONSENT_ACTION_TYPE, } from './types.js';
import { nowIso, msToSecsCeil, normalizeDomainToHomeUrl, ensureHttpsUrl, uniqStrings, pickHeader, isProbablyHtml, buildRedirectChainSimple, clampInt, waitForAboveTheFoldMedia, } from './utils/index.js';
const DEFAULT_VIEWPORT = {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
function mergeViewport(v) {
    return { ...DEFAULT_VIEWPORT, ...(v ?? {}) };
}
async function tryDismissConsent(page) {
    const logs = [];
    const add = (entry) => logs.push({ at: nowIso(), ...entry });
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
            const loc = page.locator(selector).first();
            const count = await loc.count();
            if (count === 0)
                continue;
            await loc.click({ timeout: 1500 });
            add({ type: CONSENT_ACTION_TYPE.CLICK, label: 'consent-click', selector, ok: true });
            return logs;
        }
        catch (e) {
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
function buildHomeSnapshot(params) {
    const { url, finalUrl, viewport, startedAt, finishedAt, status, redirectChain, consentAttempted, consentLog, html, screenshotKey, screenshotContentType, title, metaDescription, notes, } = params;
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
        html,
        screenshotKey,
        screenshotContentType,
        title,
        metaDescription,
        notes,
    };
}
await Actor.main(async () => {
    const input = (await Actor.getInput()) ?? {};
    const hotelId = String(input.hotelId ?? '').trim();
    const domain = String(input.domain ?? '').trim();
    if (!hotelId)
        throw new Error('Input.hotelId is required');
    if (!domain)
        throw new Error('Input.domain is required');
    const homeUrl = normalizeDomainToHomeUrl(domain);
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
    if (input.debug)
        log.setLevel(log.LEVELS.DEBUG);
    const startedAt = nowIso();
    const rq = await RequestQueue.open();
    for (const url of seedUrls) {
        await rq.addRequest({ url, userData: { depth: 0, isSeed: true, isHome: url === homeUrl } });
    }
    const pages = [];
    let homeSnapshot;
    const warnings = [];
    const crawler = new PlaywrightCrawler({
        requestQueue: rq,
        maxRequestsPerCrawl: maxPages,
        maxRequestsPerMinute,
        navigationTimeoutSecs,
        requestHandlerTimeoutSecs,
        async requestHandler(ctx) {
            const { request, page, enqueueLinks } = ctx;
            const depth = Number(request.userData?.depth ?? 0);
            const isHome = Boolean(request.userData?.isHome);
            const pageStartedAt = nowIso();
            let status;
            let finalUrl;
            let html;
            let headers;
            let contentType;
            let title;
            let metaDescription;
            try {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                const response = await page.goto(request.url, { waitUntil: 'domcontentloaded' });
                status = response?.status();
                finalUrl = response?.url() ?? page.url();
                try {
                    headers = response ? response.headers() : undefined;
                }
                catch {
                    headers = undefined;
                }
                contentType = pickHeader(headers, 'content-type');
                if (storeHtml && isProbablyHtml(contentType))
                    html = await page.content();
                title = await page.title().catch(() => undefined);
                try {
                    metaDescription = (await page.locator('meta[name="description"]').first().getAttribute('content')) ?? undefined;
                }
                catch {
                    metaDescription = undefined;
                }
                const pageFinishedAt = nowIso();
                const redirectChain = buildRedirectChainSimple({ url: request.url, finalUrl, status });
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
                    const notes = [];
                    // 1) Wait for hero media: always 3s after DOMContentLoaded, plus a best-effort media readiness wait.
                    await page.waitForTimeout(3000);
                    const mediaWait = await waitForAboveTheFoldMedia({ page, timeoutMs: 5000, pollIntervalMs: 250 });
                    if (!mediaWait.ok)
                        notes.push(`media-wait:${mediaWait.reason ?? 'unknown'}`);
                    // First screenshot (before consent)
                    const screenshotContentType = 'image/png';
                    const screenshotKey1 = `home-mobile-${hotelId}-1.png`;
                    const buffer1 = await page.screenshot({ fullPage: true, type: 'png' });
                    await Actor.setValue(screenshotKey1, buffer1, { contentType: screenshotContentType });
                    // 2) Dismiss consent (so it stops covering interesting UI)
                    const consentAttempted = tryDismissConsentFlag;
                    let consentLog = [];
                    if (tryDismissConsentFlag)
                        consentLog = await tryDismissConsent(page);
                    // 3) Scroll down and let CSS/animations settle
                    await page.evaluate((y) => window.scrollBy(0, y), Math.floor(viewport.height * 0.9));
                    await page.waitForTimeout(800);
                    // Second screenshot (after consent + scroll)
                    const screenshotKey2 = `home-mobile-${hotelId}-2.png`;
                    const buffer2 = await page.screenshot({ fullPage: true, type: 'png' });
                    await Actor.setValue(screenshotKey2, buffer2, { contentType: screenshotContentType });
                    notes.push(`second-screenshot:${screenshotKey2}`);
                    if (!html && storeHtml && isProbablyHtml(contentType))
                        notes.push('home-html-missing');
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
                        html: html ?? '',
                        screenshotKey: screenshotKey1,
                        screenshotContentType,
                        title,
                        metaDescription,
                        notes: notes.length ? notes : undefined,
                    });
                }
                if (depth < maxDepth) {
                    await enqueueLinks({
                        strategy: 'same-domain',
                        transformRequestFunction: (req) => {
                            const nextDepth = depth + 1;
                            req.userData = { ...(req.userData ?? {}), depth: nextDepth, isHome: req.url === homeUrl };
                            return req;
                        },
                    });
                }
            }
            catch (e) {
                const pageFinishedAt = nowIso();
                finalUrl = finalUrl ?? page.url();
                const redirectChain = buildRedirectChainSimple({ url: request.url, finalUrl, status });
                const error = e instanceof Error ? e.message : String(e);
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
                    error,
                });
                warnings.push(`request-failed: ${request.url}: ${error}`);
            }
        },
    });
    let status = SNAPSHOT_STATUS.OK;
    let fatalError;
    try {
        await crawler.run();
    }
    catch (e) {
        status = SNAPSHOT_STATUS.FAILED;
        fatalError = e instanceof Error ? e.message : String(e);
    }
    const finishedAt = nowIso();
    const output = {
        hotelId,
        domain,
        homeUrl,
        status,
        startedAt,
        finishedAt,
        home: homeSnapshot,
        pages,
        ...(warnings.length ? { warnings } : {}),
        ...(fatalError ? { error: fatalError } : {}),
    };
    await Actor.setValue('OUTPUT', output);
    const dataset = await Dataset.open();
    await dataset.pushData(output);
});
