import test from 'node:test';
import assert from 'node:assert/strict';

import { MOCK_SITE_1_HTML } from './mocks/mock-site-1-html.js';
import { MOCK_SITE_1_ROBOTS_TXT } from './mocks/mock-site-1-robots-txt.js';
import { MOCK_SITE_1_LLMS_TXT } from './mocks/mock-site-1-llms-txt.js';
import { MOCK_SITE_1_SITEMAP_XML } from './mocks/mock-site-1-sitemap-xml.js';

import { MOCK_SITE_2_HTML } from './mocks/mock-site-2-html.js';
import { MOCK_SITE_2_ROBOTS_TXT } from './mocks/mock-site-2-robots-txt.js';
import { MOCK_SITE_2_LLMS_TXT } from './mocks/mock-site-2-llms-txt.js';
import { MOCK_SITE_2_SITEMAP_XML } from './mocks/mock-site-2-sitemap-xml.js';

type AnyFn = (...args: any[]) => any;

function makeRecorder() {
  const calls: any[] = [];
  const fn: AnyFn = (...args) => {
    calls.push(args);
  };
  return { fn, calls };
}

async function ensureNodeLoaderHackInstalled() {
  if ((globalThis as any).__nodeLoaderHackInstalled) return;

  const nodeLoaderHack = `
    const Module = await import('node:module');
    const original = Module.createRequire;
    Module.createRequire = (url) => {
      const req = original(url);
      return new Proxy(req, {
        apply(target, thisArg, args) {
          const name = args[0];
          if (name === 'apify') return globalThis.__apifyMock;
          if (name === 'crawlee') return globalThis.__crawleeMock;
          return Reflect.apply(target, thisArg, args);
        }
      });
    };
  `;

  await import(`data:text/javascript,${encodeURIComponent(nodeLoaderHack)}`);
  (globalThis as any).__nodeLoaderHackInstalled = true;
}

type IRunOpts = {
  input: any;
  responseForUrl: (u: string) => any;
  makePageTitle: (url: string) => string;
  makeMetaDescription: (url: string) => string;

  // Optional: allow simulating a load event timeout per URL.
  loadEventOkForUrl?: (url: string) => boolean;

  // Optional: allow simulating network activity per URL during "load" state.
  networkForUrl?: (url: string) => { imageFinished: number; imageFailed: number; mediaFinished: number; mediaFailed: number };
};

type IQueuedRequest = { request: any; options?: any };

function makeMockRequest(resourceType: string, isNavigationRequest: boolean) {
  return {
    resourceType: () => resourceType,
    isNavigationRequest: () => isNavigationRequest,
  };
}

async function runMainWithMocks(opts: IRunOpts) {
  const { fn: setValue, calls: setValueCalls } = makeRecorder();
  const { fn: pushData, calls: pushDataCalls } = makeRecorder();

  const Actor = {
    main: async (fn: AnyFn) => fn(),
    getInput: async () => opts.input,
    setValue,
    getEnv: () => ({
      defaultKeyValueStoreId: 'pfi1mt53icgvHopFf',
    }),
  };

  const log = {
    LEVELS: { DEBUG: 1 },
    setLevel: () => {},
  };

  const Dataset = {
    open: async () => ({ pushData }),
  };

  const reqQueueRequests: IQueuedRequest[] = [];
  const visitedUrls: string[] = [];

  const RequestQueue = {
    open: async () => ({
      addRequest: async (r: any, options?: any) => {
        reqQueueRequests.push({ request: r, options });
      },
    }),
  };

  const makePage = (url: string) => {
    let currentUrl = url;

    const listeners = new Map<string, Set<AnyFn>>();

    const on = (event: string, handler: AnyFn) => {
      const set = listeners.get(event) ?? new Set<AnyFn>();
      set.add(handler);
      listeners.set(event, set);
    };

    const off = (event: string, handler: AnyFn) => {
      const set = listeners.get(event);
      if (!set) return;
      set.delete(handler);
    };

    const emit = (event: string, payload: any) => {
      const set = listeners.get(event);
      if (!set) return;
      for (const handler of set) handler(payload);
    };

    const locatorObj = {
      first() {
        return this;
      },
      async count() {
        return 0;
      },
      async click() {},
      async getAttribute(name: string) {
        if (name === 'content') return opts.makeMetaDescription(currentUrl);
        return null;
      },
    };

    return {
      on,
      off,

      async setViewportSize() {},

      async goto(u: string) {
        currentUrl = u;
        const rawResponse = opts.responseForUrl(u);
        if (!rawResponse) return rawResponse;

        // Ensure main.ts can call response.finished()
        if (typeof rawResponse.finished !== 'function') {
          rawResponse.finished = async () => undefined;
        }

        return rawResponse;
      },

      url() {
        return currentUrl;
      },

      async waitForLoadState(state: string, _opts?: any) {
        if (state !== 'load') return undefined;

        const ok = opts.loadEventOkForUrl ? opts.loadEventOkForUrl(currentUrl) : true;
        if (!ok) {
          throw new Error('Timeout');
        }

        const net = opts.networkForUrl
          ? opts.networkForUrl(currentUrl)
          : { imageFinished: 1, imageFailed: 1, mediaFinished: 1, mediaFailed: 0 };

        for (let i = 0; i < net.imageFinished; i++) emit('requestfinished', makeMockRequest('image', false));
        for (let i = 0; i < net.imageFailed; i++) emit('requestfailed', makeMockRequest('image', false));
        for (let i = 0; i < net.mediaFinished; i++) emit('requestfinished', makeMockRequest('media', false));
        for (let i = 0; i < net.mediaFailed; i++) emit('requestfailed', makeMockRequest('media', false));

        return undefined;
      },

      async content() {
        const res = opts.responseForUrl(currentUrl);
        return res?.text ? await res.text() : '';
      },

      async title() {
        return opts.makePageTitle(currentUrl);
      },

      locator() {
        return locatorObj;
      },

      async screenshot() {
        return Buffer.from([1, 2, 3, 4]);
      },

      async waitForTimeout() {
        return undefined;
      },

      async evaluate(fnOrString: any, arg?: any) {
        if (typeof fnOrString === 'function') {
          const src = String(fnOrString);
          // Special-casing waitForAboveTheFoldMedia evaluate: return "ready" so tests don't spin.
          if (src.includes('querySelectorAll') && src.includes('video') && src.includes('img')) {
            return { videoCount: 1, imgCount: 1, videoOk: true, imgOk: true };
          }

          try {
            const res = fnOrString(arg);
            return res;
          } catch {
            return undefined;
          }
        }
        return undefined;
      },

      mouse: {
        async wheel() {},
      },
    };
  };

  class PlaywrightCrawler {
    private optsInner: any;

    constructor(o: any) {
      this.optsInner = o;
    }

    async run() {
      assert.ok(this.optsInner?.requestHandler, 'requestHandler is required');

      // Iterate the live array so newly queued requests are processed too.
      for (let i = 0; i < reqQueueRequests.length; i++) {
        const entry = reqQueueRequests[i];
        const r = entry.request;

        const url = r.url as string;
        const userData = r.userData ?? { depth: 0, isSeed: true, isHome: false };

        visitedUrls.push(url);

        const ctx = {
          request: { url, userData },
          page: makePage(url),
          enqueueLinks: async () => {},
        };

        try {
          await this.optsInner.requestHandler(ctx);
        } catch (error) {
          if (typeof this.optsInner.failedRequestHandler === 'function') {
            await this.optsInner.failedRequestHandler({ request: ctx.request, error });
            continue;
          }
          throw error;
        }
      }
    }
  }

  const Crawlee = {
    PlaywrightCrawler,
    RequestQueue,
    Dataset,
  };

  const prevApify = (globalThis as any).__apifyMock;
  const prevCrawlee = (globalThis as any).__crawleeMock;

  const prevDateNow = Date.now;
  let fakeNow = 1_700_000_000_000; // stable-ish baseline
  Date.now = () => {
    fakeNow += 25; // advance on every call to make timing assertions deterministic-ish
    return fakeNow;
  };

  (globalThis as any).__apifyMock = { Actor, log };
  (globalThis as any).__crawleeMock = Crawlee;

  await ensureNodeLoaderHackInstalled();

  const modUrl = new URL('../src/main.js', import.meta.url);
  const uniqueImport = `${modUrl.href}?t=${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    await import(uniqueImport);

    const outputCall = setValueCalls.find((c) => c[0] === 'OUTPUT');
    assert.ok(outputCall, 'Actor.setValue("OUTPUT", ...) not called');

    return {
      setValueCalls,
      pushDataCalls,
      reqQueueRequests,
      visitedUrls,
      output: outputCall[1],
    };
  } finally {
    Date.now = prevDateNow;
    (globalThis as any).__apifyMock = prevApify;
    (globalThis as any).__crawleeMock = prevCrawlee;
  }
}

test('home is always requested first; special files are requested only after successful home (site-1)', async () => {
  const input = {
    hotelId: '507f1f77bcf86cd799439011',
    domain: 'www.site-1.mock',
    seedUrls: [],
    maxPages: 5,
    maxDepth: 0,
    maxRequestsPerMinute: 999,
    navigationTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    storeHtml: true,
    storeHeaders: true,
    takeHomeMobileScreenshot: true,
    tryDismissConsent: true,
    debug: false,
  };

  const responseForUrl = (u: string) => {
    const isRobots = u.endsWith('/robots.txt');
    const isLlms = u.endsWith('/llms.txt');
    const isSitemapDefault = u.endsWith('/sitemap.xml');
    const isSitemapFromRobots = u.endsWith('/mock-site-sitemap.xml');

    const isSitemap = isSitemapDefault || isSitemapFromRobots;

    const contentType =
      isRobots || isLlms
        ? 'text/plain; charset=utf-8'
        : isSitemap
          ? 'application/xml; charset=utf-8'
          : 'text/html; charset=utf-8';

    const bodyText = isRobots
      ? MOCK_SITE_1_ROBOTS_TXT
      : isLlms
        ? MOCK_SITE_1_LLMS_TXT
        : isSitemap
          ? MOCK_SITE_1_SITEMAP_XML
          : MOCK_SITE_1_HTML;

    return {
      status: () => 200,
      url: () => u,
      headers: () => ({ 'content-type': contentType }),
      text: async () => bodyText,
      finished: async () => undefined,
    };
  };

  const { output, setValueCalls, pushDataCalls, reqQueueRequests, visitedUrls } = await runMainWithMocks({
    input,
    responseForUrl,
    makePageTitle: () => 'Mock Site 1 — Luxury Resort',
    makeMetaDescription: () => 'Mock meta description for site-1',
    networkForUrl: (u) => (u.endsWith('/robots.txt') || u.endsWith('/llms.txt') || u.endsWith('.xml')
      ? { imageFinished: 0, imageFailed: 0, mediaFinished: 0, mediaFailed: 0 }
      : { imageFinished: 1, imageFailed: 1, mediaFinished: 1, mediaFailed: 0 }),
  });

  const queuedUrls = reqQueueRequests.map((e) => e.request.url);

  // 1) First request is ALWAYS home
  assert.equal(queuedUrls[0], 'https://www.site-1.mock/');
  assert.equal(visitedUrls[0], 'https://www.site-1.mock/');

  // 2) After successful home: robots + llms MUST be queued (and intended to be forefront)
  const robotsEntry = reqQueueRequests.find((e) => e.request.url === 'https://www.site-1.mock/robots.txt');
  const llmsEntry = reqQueueRequests.find((e) => e.request.url === 'https://www.site-1.mock/llms.txt');

  assert.ok(robotsEntry, 'robots.txt must be queued after successful home');
  assert.ok(llmsEntry, 'llms.txt must be queued after successful home');
  assert.equal(Boolean(robotsEntry?.options?.forefront), true, 'robots.txt should be queued with forefront=true');
  assert.equal(Boolean(llmsEntry?.options?.forefront), true, 'llms.txt should be queued with forefront=true');

  // 3) Sitemap must be queued from robots directive (non-standard location); default /sitemap.xml must NOT be queued
  assert.ok(queuedUrls.includes('https://www.site-1.mock/mock-site-sitemap.xml'), 'expected sitemap from robots.txt to be queued');
  assert.equal(queuedUrls.includes('https://www.site-1.mock/sitemap.xml'), false, 'did not expect default /sitemap.xml for site-1');

  // 4) Special file requests happen only AFTER home (ordering by visit index)
  const indexHome = visitedUrls.indexOf('https://www.site-1.mock/');
  const indexRobots = visitedUrls.indexOf('https://www.site-1.mock/robots.txt');
  const indexLlms = visitedUrls.indexOf('https://www.site-1.mock/llms.txt');
  const indexSitemap = visitedUrls.indexOf('https://www.site-1.mock/mock-site-sitemap.xml');

  assert.equal(indexHome, 0);
  assert.ok(indexRobots > indexHome, 'robots.txt must be fetched after home');
  assert.ok(indexLlms > indexHome, 'llms.txt must be fetched after home');
  assert.ok(indexSitemap > indexHome, 'sitemap must be fetched after home');

  // Existing assertions (output shape etc.)
  assert.equal(output.hotelId, input.hotelId);
  assert.equal(output.domain, input.domain);
  assert.equal(output.homeUrl, 'https://www.site-1.mock/');
  assert.equal(output.status, 'ok');

  assert.ok(output.home, 'home snapshot missing');
  assert.equal(output.home.url, 'https://www.site-1.mock/');
  assert.equal('html' in output.home, false, 'home.html must NOT exist anymore');
  assert.equal(output.home.title, 'Mock Site 1 — Luxury Resort');
  assert.equal(output.home.metaDescription, 'Mock meta description for site-1');

  assert.ok(typeof output.home.screenshotKey === 'string' && output.home.screenshotKey.includes('/records/home-mobile-'));
  assert.ok(output.home.screenshotKey.endsWith('-1.png'));

  assert.ok(typeof output.home.secondScreenshotKey === 'string' && output.home.secondScreenshotKey.includes('/records/home-mobile-'));
  assert.ok(output.home.secondScreenshotKey.endsWith('-2.png'));

  const screenshotCalls = setValueCalls.filter(
    (c) => typeof c[0] === 'string' && String(c[0]).startsWith('home-mobile-') && String(c[0]).endsWith('.png'),
  );

  const shot1 = screenshotCalls.find((c) => String(c[0]).endsWith('-1.png'));
  const shot2 = screenshotCalls.find((c) => String(c[0]).endsWith('-2.png'));

  assert.ok(shot1, 'Actor.setValue(home-mobile-*-1.png, ...) not called');
  assert.ok(shot2, 'Actor.setValue(home-mobile-*-2.png, ...) not called');

  for (const call of [shot1, shot2] as any[]) {
    const [sKey, sBuf, sOpts] = call;
    assert.equal(typeof sKey, 'string');
    assert.ok(Buffer.isBuffer(sBuf));
    assert.deepEqual(sOpts, { contentType: 'image/png' });
  }

  assert.ok(output.files, 'files must be present when robots/llms/sitemap are fetched');
  assert.equal(output.files.robotsTxt, MOCK_SITE_1_ROBOTS_TXT);
  assert.equal(output.files.llmsTxt, MOCK_SITE_1_LLMS_TXT);
  assert.equal(output.files.sitemapXml, MOCK_SITE_1_SITEMAP_XML);

  assert.ok(Array.isArray(output.pages));
  assert.ok(output.pages.length >= 1);

  const homePage = output.pages.find((p: any) => p.url === 'https://www.site-1.mock/');
  assert.ok(homePage, 'home page snapshot missing in pages[]');
  assert.equal(homePage.status, 200);
  assert.equal(homePage.contentType, 'text/html; charset=utf-8');
  assert.equal(homePage.html, MOCK_SITE_1_HTML);

  // 5) Timings must be present and consistent on crawled pages
  assert.ok(homePage.timings, 'pages[].timings must be collected');
  assert.equal(typeof homePage.timings.imageRequests, 'number');
  assert.equal(typeof homePage.timings.mediaRequests, 'number');
  assert.equal(homePage.timings.imageRequests, 2, 'expected imageRequests to count finished+failed');
  assert.equal(homePage.timings.mediaRequests, 1, 'expected mediaRequests to count finished+failed');
  assert.equal(homePage.timings.loadEventReached, true);

  if (typeof homePage.timings.htmlMs === 'number' && typeof homePage.timings.htmlAndImagesMs === 'number') {
    assert.ok(homePage.timings.htmlAndImagesMs >= homePage.timings.htmlMs, 'expected htmlAndImagesMs >= htmlMs');
  }
  if (
    typeof homePage.timings.htmlAndImagesMs === 'number' &&
    typeof homePage.timings.htmlAndImagesAndMediaMs === 'number'
  ) {
    assert.ok(
      homePage.timings.htmlAndImagesAndMediaMs >= homePage.timings.htmlAndImagesMs,
      'expected htmlAndImagesAndMediaMs >= htmlAndImagesMs',
    );
  }

  const robotsPage = output.pages.find((p: any) => String(p.url).endsWith('/robots.txt'));
  const llmsPage = output.pages.find((p: any) => String(p.url).endsWith('/llms.txt'));
  const sitemapPage1 = output.pages.find((p: any) => String(p.url).endsWith('/sitemap.xml'));
  const sitemapPage2 = output.pages.find((p: any) => String(p.url).endsWith('mock-site-sitemap.xml'));

  assert.equal(Boolean(robotsPage), false, 'robots.txt must not be in pages[]');
  assert.equal(Boolean(llmsPage), false, 'llms.txt must not be in pages[]');
  assert.equal(Boolean(sitemapPage1), false, 'sitemap.xml must not be in pages[]');
  assert.equal(Boolean(sitemapPage2), false, 'mock-site-sitemap.xml must not be in pages[]');

  assert.equal(pushDataCalls.length, 1, 'Dataset.pushData should be called exactly once');
});

test('if home request fails, robots/llms/sitemap are NOT requested', async () => {
  const input = {
    hotelId: '507f1f77bcf86cd799439099',
    domain: 'www.site-1.mock',
    seedUrls: [],
    maxPages: 5,
    maxDepth: 0,
    maxRequestsPerMinute: 999,
    navigationTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    storeHtml: true,
    storeHeaders: true,
    takeHomeMobileScreenshot: true,
    tryDismissConsent: true,
    debug: false,
  };

  const responseForUrl = (u: string) => {
    const isHome = u === 'https://www.site-1.mock/';
    const statusCode = isHome ? 503 : 200;

    const contentType = u.endsWith('/robots.txt')
      ? 'text/plain; charset=utf-8'
      : u.endsWith('/llms.txt')
        ? 'text/plain; charset=utf-8'
        : u.endsWith('.xml')
          ? 'application/xml; charset=utf-8'
          : 'text/html; charset=utf-8';

    const bodyText = u.endsWith('/robots.txt')
      ? MOCK_SITE_1_ROBOTS_TXT
      : u.endsWith('/llms.txt')
        ? MOCK_SITE_1_LLMS_TXT
        : u.endsWith('.xml')
          ? MOCK_SITE_1_SITEMAP_XML
          : MOCK_SITE_1_HTML;

    return {
      status: () => statusCode,
      url: () => u,
      headers: () => ({ 'content-type': contentType }),
      text: async () => bodyText,
      finished: async () => undefined,
    };
  };

  const { output, reqQueueRequests, visitedUrls } = await runMainWithMocks({
    input,
    responseForUrl,
    makePageTitle: () => 'Mock Site 1 — Luxury Resort',
    makeMetaDescription: () => 'Mock meta description for site-1',
  });

  const queuedUrls = reqQueueRequests.map((e) => e.request.url);

  assert.equal(queuedUrls[0], 'https://www.site-1.mock/');
  assert.deepEqual(queuedUrls, ['https://www.site-1.mock/'], 'only home should be queued');
  assert.deepEqual(visitedUrls, ['https://www.site-1.mock/'], 'only home should be visited');

  assert.equal(output.status, 'failed', 'overall run must fail if home failed');
  assert.equal(Boolean(output.home), false, 'home snapshot must not exist if home failed');

  assert.equal(Boolean(output.files), false, 'files must not be present if home failed (no follow-up requests)');
  assert.equal(Array.isArray(output.pages), true);
  assert.equal(output.pages.length, 0, 'pages must be cleared on FAILED run');

  assert.equal(queuedUrls.includes('https://www.site-1.mock/robots.txt'), false);
  assert.equal(queuedUrls.includes('https://www.site-1.mock/llms.txt'), false);
  assert.equal(queuedUrls.includes('https://www.site-1.mock/sitemap.xml'), false);
  assert.equal(queuedUrls.includes('https://www.site-1.mock/mock-site-sitemap.xml'), false);
});

test('main.ts falls back to default /sitemap.xml when robots.txt has no Sitemap directive (site-2)', async () => {
  const input = {
    hotelId: '507f1f77bcf86cd799439012',
    domain: 'www.site-2.mock',
    seedUrls: [],
    maxPages: 5,
    maxDepth: 0,
    maxRequestsPerMinute: 999,
    navigationTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    storeHtml: true,
    storeHeaders: true,
    takeHomeMobileScreenshot: true,
    tryDismissConsent: true,
    debug: false,
  };

  const responseForUrl = (u: string) => {
    const isRobots = u.endsWith('/robots.txt');
    const isLlms = u.endsWith('/llms.txt');
    const isSitemap = u.endsWith('/sitemap.xml');

    const contentType =
      isRobots || isLlms
        ? 'text/plain; charset=utf-8'
        : isSitemap
          ? 'application/xml; charset=utf-8'
          : 'text/html; charset=utf-8';

    const bodyText = isRobots
      ? MOCK_SITE_2_ROBOTS_TXT
      : isLlms
        ? MOCK_SITE_2_LLMS_TXT
        : isSitemap
          ? MOCK_SITE_2_SITEMAP_XML
          : MOCK_SITE_2_HTML;

    return {
      status: () => 200,
      url: () => u,
      headers: () => ({ 'content-type': contentType }),
      text: async () => bodyText,
      finished: async () => undefined,
    };
  };

  const { output, pushDataCalls, reqQueueRequests, visitedUrls } = await runMainWithMocks({
    input,
    responseForUrl,
    makePageTitle: () => 'Mock Site 2 — Official Website',
    makeMetaDescription: () => 'Mock meta description for site-2',
  });

  const queuedUrls = reqQueueRequests.map((e) => e.request.url);

  assert.equal(queuedUrls[0], 'https://www.site-2.mock/');
  assert.equal(visitedUrls[0], 'https://www.site-2.mock/');

  assert.ok(queuedUrls.includes('https://www.site-2.mock/sitemap.xml'), 'expected default /sitemap.xml to be queued for site-2');

  assert.equal(output.hotelId, input.hotelId);
  assert.equal(output.domain, input.domain);
  assert.equal(output.homeUrl, 'https://www.site-2.mock/');
  assert.equal(output.status, 'ok');

  assert.ok(output.files, 'files must be present when robots/llms/sitemap are fetched');
  assert.equal(output.files.robotsTxt, MOCK_SITE_2_ROBOTS_TXT);
  assert.equal(output.files.llmsTxt, MOCK_SITE_2_LLMS_TXT);
  assert.equal(output.files.sitemapXml, MOCK_SITE_2_SITEMAP_XML);

  // Special files must not leak into pages[]
  assert.ok(Array.isArray(output.pages));
  const robotsPage = output.pages.find((p: any) => String(p.url).endsWith('/robots.txt'));
  const llmsPage = output.pages.find((p: any) => String(p.url).endsWith('/llms.txt'));
  const sitemapPage = output.pages.find((p: any) => String(p.url).endsWith('/sitemap.xml'));
  assert.equal(Boolean(robotsPage), false, 'robots.txt must not be in pages[]');
  assert.equal(Boolean(llmsPage), false, 'llms.txt must not be in pages[]');
  assert.equal(Boolean(sitemapPage), false, 'sitemap.xml must not be in pages[]');

  assert.equal(pushDataCalls.length, 1, 'Dataset.pushData should be called exactly once');
});
