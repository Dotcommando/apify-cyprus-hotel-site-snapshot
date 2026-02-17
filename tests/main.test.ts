import test from 'node:test';
import assert from 'node:assert/strict';

import { MOCK_SITE_1_HTML } from './mocks/mock-site-1-html.js';
import { MOCK_SITE_1_ROBOTS_TXT } from './mocks/mock-site-1-robots-txt.js';
import { MOCK_SITE_1_LLMS_TXT } from './mocks/mock-site-1-llms-txt.js';
import { MOCK_SITE_1_SITEMAP_XML } from './mocks/mock-site-1-sitemap-xml.js';

type AnyFn = (...args: any[]) => any;

function makeRecorder() {
  const calls: any[] = [];
  const fn: AnyFn = (...args) => {
    calls.push(args);
  };
  return { fn, calls };
}

test('main.ts produces OUTPUT and stores screenshots (mocked apify/crawlee/playwright)', async () => {
  const { fn: setValue, calls: setValueCalls } = makeRecorder();
  const { fn: pushData, calls: pushDataCalls } = makeRecorder();

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

  const modUrl = new URL('../src/main.js', import.meta.url);

  const Actor = {
    main: async (fn: AnyFn) => fn(),
    getInput: async () => input,
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

  const reqQueueRequests: any[] = [];

  const RequestQueue = {
    open: async () => ({
      addRequest: async (r: any) => {
        reqQueueRequests.push(r);
      },
    }),
  };

  const responseForUrl = (u: string) => {
    const isRobots = u.endsWith('/robots.txt');
    const isLlms = u.endsWith('/llms.txt');
    const isSitemap = u.endsWith('/sitemap.xml');

    const contentType = isRobots || isLlms ? 'text/plain; charset=utf-8' : isSitemap ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8';

    const bodyText = isRobots ? MOCK_SITE_1_ROBOTS_TXT : isLlms ? MOCK_SITE_1_LLMS_TXT : isSitemap ? MOCK_SITE_1_SITEMAP_XML : MOCK_SITE_1_HTML;

    return {
      status: () => 200,
      url: () => u,
      headers: () => ({ 'content-type': contentType }),
      text: async () => bodyText,
    };
  };

  const makePage = (url: string) => {
    let currentUrl = url;

    const locatorObj = {
      first() {
        return this;
      },
      async count() {
        return 0;
      },
      async click() {},
      async getAttribute(name: string) {
        if (name === 'content') return 'Mock meta description for site-1';
        return null;
      },
    };

    return {
      async setViewportSize() {},

      async goto(u: string) {
        currentUrl = u;
        return responseForUrl(u);
      },

      url() {
        return currentUrl;
      },

      async content() {
        return MOCK_SITE_1_HTML;
      },

      async title() {
        return 'Mock Site 1 — Luxury Resort';
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
    private opts: any;

    constructor(opts: any) {
      this.opts = opts;
    }

    async run() {
      assert.ok(this.opts?.requestHandler, 'requestHandler is required');

      // emulate that crawler will visit queued requests (home + special files)
      // order is not important for this test
      for (const r of reqQueueRequests) {
        const url = r.url as string;
        const userData = r.userData ?? { depth: 0, isSeed: true, isHome: url === 'https://www.site-1.mock/' };

        const ctx = {
          request: { url, userData },
          page: makePage(url),
          enqueueLinks: async () => {},
        };

        await this.opts.requestHandler(ctx);
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

  (globalThis as any).__apifyMock = { Actor, log };
  (globalThis as any).__crawleeMock = Crawlee;

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

  try {
    await import(modUrl.href);

    const outputCall = setValueCalls.find((c) => c[0] === 'OUTPUT');
    assert.ok(outputCall, 'Actor.setValue("OUTPUT", ...) not called');

    const output = outputCall[1];

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
      (c) => typeof c[0] === 'string' && String(c[0]).startsWith('home-mobile-') && String(c[0]).endsWith('.png')
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

    const robotsPage = output.pages.find((p: any) => String(p.url).endsWith('/robots.txt'));
    const llmsPage = output.pages.find((p: any) => String(p.url).endsWith('/llms.txt'));
    const sitemapPage = output.pages.find((p: any) => String(p.url).endsWith('/sitemap.xml'));
    assert.equal(Boolean(robotsPage), false, 'robots.txt must not be in pages[]');
    assert.equal(Boolean(llmsPage), false, 'llms.txt must not be in pages[]');
    assert.equal(Boolean(sitemapPage), false, 'sitemap.xml must not be in pages[]');

    assert.equal(pushDataCalls.length, 1, 'Dataset.pushData should be called exactly once');
  } finally {
    (globalThis as any).__apifyMock = prevApify;
    (globalThis as any).__crawleeMock = prevCrawlee;
  }
});
