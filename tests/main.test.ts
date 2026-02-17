import test from 'node:test';
import assert from 'node:assert/strict';

import { MOCK_SITE_1_HTML } from './mocks/mock-site-1-html.js';

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
        return {
          status: () => 200,
          url: () => u,
          headers: () => ({ 'content-type': 'text/html; charset=utf-8' }),
        };
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

      async evaluate(fnOrString: any) {
        if (typeof fnOrString === 'function') {
          try {
            const res = fnOrString(100);
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

      const homeUrl = 'https://www.site-1.mock/';
      const ctx = {
        request: { url: homeUrl, userData: { depth: 0, isSeed: true, isHome: true } },
        page: makePage(homeUrl),
        enqueueLinks: async () => {},
      };

      await this.opts.requestHandler(ctx);
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
    assert.equal(output.home.html, MOCK_SITE_1_HTML);
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

    assert.ok(Array.isArray(output.pages));
    assert.ok(output.pages.length >= 1);

    const homePage = output.pages.find((p: any) => p.url === 'https://www.site-1.mock/');
    assert.ok(homePage, 'home page snapshot missing in pages[]');
    assert.equal(homePage.status, 200);
    assert.equal(homePage.contentType, 'text/html; charset=utf-8');
    assert.equal(homePage.html, MOCK_SITE_1_HTML);

    assert.equal(pushDataCalls.length, 1, 'Dataset.pushData should be called exactly once');
  } finally {
    (globalThis as any).__apifyMock = prevApify;
    (globalThis as any).__crawleeMock = prevCrawlee;
  }
});
