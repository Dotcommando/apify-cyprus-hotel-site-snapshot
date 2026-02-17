import type { ICrawledPageSnapshot, ICyprusHotelSiteSnapshotOutput, IHomeMobileSnapshot, IViewport } from '../../src/types.js';
import { CONSENT_ACTION_TYPE, SNAPSHOT_STATUS } from '../../src/types.js';

import { MOCK_SITE_2_HTML } from '../mocks/mock-site-2-html.js';
import { MOCK_SITE_2_LLMS_TXT } from '../mocks/mock-site-2-llms-txt.js';
import { MOCK_SITE_2_ROBOTS_TXT } from '../mocks/mock-site-2-robots-txt.js';
import { MOCK_SITE_2_SITEMAP_XML } from '../mocks/mock-site-2-sitemap-xml.js';

const HOTEL_ID = '65f0c1a2b3c4d5e6f7a80002';
const DOMAIN = 'www.site-2.mock';
const HOME_URL = 'https://www.site-2.mock/';

const VIEWPORT: IViewport = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  isLandscape: false,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const HOME: IHomeMobileSnapshot = {
  url: HOME_URL,
  finalUrl: HOME_URL,
  viewport: VIEWPORT,
  startedAt: '2026-02-17T09:12:00.000Z',
  finishedAt: '2026-02-17T09:12:06.000Z',
  status: 200,
  redirectChain: [],
  consentAttempted: true,
  consentLog: [
    {
      at: '2026-02-17T09:12:02.100Z',
      type: CONSENT_ACTION_TYPE.CLICK,
      label: 'Clicked consent accept button (id=cmp-accept)',
      selector: '#cmp-accept',
      ok: true,
    },
  ],
  html: MOCK_SITE_2_HTML,
  screenshotKey: 'mock-site-2/home-mobile.png',
  screenshotContentType: 'image/png',
  title: 'Site 2 Mock Resort — Official Website',
  metaDescription: 'Mock beachfront resort on Cyprus. Book direct, enjoy member rates, spa, restaurants and events.',
  notes: [
    'robots.txt did not include Sitemap directive; sitemap discovered at default path /sitemap.xml (test case).',
    'Homepage contains multiple analytics providers (GTM+GA4+Meta+Clarity+Hotjar) and live chat (Crisp).',
  ],
};

export const MOCK_SITE_2_SNAPSHOT: ICyprusHotelSiteSnapshotOutput = {
  hotelId: HOTEL_ID,
  domain: DOMAIN,
  homeUrl: HOME_URL,
  status: SNAPSHOT_STATUS.OK,
  startedAt: '2026-02-17T09:12:00.000Z',
  finishedAt: '2026-02-17T09:12:25.000Z',
  home: HOME,
  pages: [],
  warnings: [
    'robots.txt contained no Sitemap directive; used https://www.site-2.mock/sitemap.xml',
    'sitemap.xml contained URLs with UTM query parameters (should be normalized/filtered)',
  ],
  meta: {
    mock: true,
    fixtures: {
      robotsTxt: true,
      llmsTxt: true,
      sitemapXml: true,
    },
  },
};

const P = (p: ICrawledPageSnapshot): ICrawledPageSnapshot => p;

export const MOCK_SITE_2_PAGES: ICrawledPageSnapshot[] = [
  P({
    url: 'https://www.site-2.mock/robots.txt',
    finalUrl: 'https://www.site-2.mock/robots.txt',
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:06.500Z',
    finishedAt: '2026-02-17T09:12:06.650Z',
    html: MOCK_SITE_2_ROBOTS_TXT,
  }),

  P({
    url: 'https://www.site-2.mock/llms.txt',
    finalUrl: 'https://www.site-2.mock/llms.txt',
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:06.700Z',
    finishedAt: '2026-02-17T09:12:06.860Z',
    html: MOCK_SITE_2_LLMS_TXT,
  }),

  P({
    url: 'https://www.site-2.mock/sitemap.xml',
    finalUrl: 'https://www.site-2.mock/sitemap.xml',
    status: 200,
    contentType: 'application/xml; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:06.900Z',
    finishedAt: '2026-02-17T09:12:07.200Z',
    html: MOCK_SITE_2_SITEMAP_XML,
  }),

  P({
    url: 'https://www.site-2.mock/',
    finalUrl: 'https://www.site-2.mock/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:00.000Z',
    finishedAt: '2026-02-17T09:12:06.000Z',
    html: MOCK_SITE_2_HTML,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache',
    },
  }),

  P({
    url: 'https://www.site-2.mock/rooms/',
    finalUrl: 'https://www.site-2.mock/rooms/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:07.500Z',
    finishedAt: '2026-02-17T09:12:08.200Z',
    html:
      '<!doctype html><html><head><title>Rooms | Site 2 Mock Resort</title><meta name="description" content="Rooms and suites at Site 2 Mock Resort."></head><body><h1>Rooms & Suites</h1><a href="/book/">Book</a></body></html>',
  }),
  P({
    url: 'https://www.site-2.mock/offers/',
    finalUrl: 'https://www.site-2.mock/offers/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:08.300Z',
    finishedAt: '2026-02-17T09:12:08.900Z',
    html:
      '<!doctype html><html><head><title>Offers | Site 2 Mock Resort</title><meta name="description" content="Special offers and packages."></head><body><h1>Offers</h1><p>Member rates available.</p></body></html>',
  }),
  P({
    url: 'https://www.site-2.mock/dining/',
    finalUrl: 'https://www.site-2.mock/dining/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:09.000Z',
    finishedAt: '2026-02-17T09:12:09.700Z',
    html:
      '<!doctype html><html><head><title>Dining | Site 2 Mock Resort</title></head><body><h1>Dining</h1><p>Mediterranean cuisine.</p></body></html>',
  }),
  P({
    url: 'https://www.site-2.mock/spa/',
    finalUrl: 'https://www.site-2.mock/spa/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:09.750Z',
    finishedAt: '2026-02-17T09:12:10.400Z',
    html:
      '<!doctype html><html><head><title>Spa | Site 2 Mock Resort</title></head><body><h1>Spa & Wellness</h1><p>Signature treatments.</p></body></html>',
  }),
  P({
    url: 'https://www.site-2.mock/contact/',
    finalUrl: 'https://www.site-2.mock/contact/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:10.450Z',
    finishedAt: '2026-02-17T09:12:11.000Z',
    html:
      '<!doctype html><html><head><title>Contact | Site 2 Mock Resort</title></head><body><h1>Contact</h1><a href="mailto:reservations@site-2.mock">Email</a></body></html>',
  }),

  P({
    url: 'https://www.site-2.mock/de/',
    finalUrl: 'https://www.site-2.mock/de/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:11.050Z',
    finishedAt: '2026-02-17T09:12:11.600Z',
    html:
      '<!doctype html><html lang="de"><head><title>Startseite | Site 2 Mock Resort</title></head><body><h1>Willkommen</h1></body></html>',
  }),
  P({
    url: 'https://www.site-2.mock/ru/',
    finalUrl: 'https://www.site-2.mock/ru/',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:11.650Z',
    finishedAt: '2026-02-17T09:12:12.200Z',
    html:
      '<!doctype html><html lang="ru"><head><title>Главная | Site 2 Mock Resort</title></head><body><h1>Добро пожаловать</h1></body></html>',
  }),

  P({
    url: 'https://www.site-2.mock/?utm_source=sitemap&utm_medium=organic',
    finalUrl: 'https://www.site-2.mock/?utm_source=sitemap&utm_medium=organic',
    status: 200,
    contentType: 'text/html; charset=utf-8',
    redirectChain: [],
    startedAt: '2026-02-17T09:12:12.250Z',
    finishedAt: '2026-02-17T09:12:13.000Z',
    html: MOCK_SITE_2_HTML,
  }),
];
