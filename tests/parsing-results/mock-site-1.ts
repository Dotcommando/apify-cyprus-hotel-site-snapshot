import {
  CONSENT_ACTION_TYPE,
  SNAPSHOT_STATUS,
  type ICyprusHotelSiteSnapshotOutput,
  type IHomeMobileSnapshot,
  type IRedirectChainItem,
  type IViewport,
} from '../../src/types.js';

import { MOCK_SITE_1_LLMS_TXT } from '../mocks/mock-site-1-llms-txt.js';
import { MOCK_SITE_1_ROBOTS_TXT } from '../mocks/mock-site-1-robots-txt.js';
import { MOCK_SITE_1_SITEMAP_XML } from '../mocks/mock-site-1-sitemap-xml.js';

type IHotelSiteSnapshotDoc = ICyprusHotelSiteSnapshotOutput & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

const NOW_ISO = '2026-02-17T10:15:30.000Z';
const FINISH_ISO = '2026-02-17T10:16:12.000Z';

const MOCK_HOTEL_ID = '65c8d8a8c2a8b0f5a1b2c3d4';
const MOCK_SNAPSHOT_ID = '65c8d8f1d2a8b0f5a1b2c3e5';

const HOME_URL = 'https://www.site-1.mock/';
const DOMAIN = 'site-1.mock';
const KVS_ID = 'MOCK_KVS_ID_SITE_1';

const HOME_VIEWPORT: IViewport = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  isLandscape: false,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const HOME_REDIRECT_CHAIN: IRedirectChainItem[] = [
  { url: 'http://www.site-1.mock/', status: 301, location: 'https://www.site-1.mock/' },
  { url: 'https://www.site-1.mock/', status: 200, resolvedUrl: 'https://www.site-1.mock/' },
];

const screenshotKey1Raw = `home-mobile-${MOCK_HOTEL_ID}-1.png`;
const screenshotKey2Raw = `home-mobile-${MOCK_HOTEL_ID}-2.png`;

const screenshotUrl1 = `https://api.apify.com/v2/key-value-stores/${KVS_ID}/records/${encodeURIComponent(screenshotKey1Raw)}`;
const screenshotUrl2 = `https://api.apify.com/v2/key-value-stores/${KVS_ID}/records/${encodeURIComponent(screenshotKey2Raw)}`;

const HOME_SNAPSHOT: IHomeMobileSnapshot = {
  url: HOME_URL,
  finalUrl: HOME_URL,
  viewport: HOME_VIEWPORT,
  startedAt: NOW_ISO,
  finishedAt: FINISH_ISO,
  status: 200,
  redirectChain: HOME_REDIRECT_CHAIN,
  consentAttempted: true,
  consentLog: [
    {
      at: '2026-02-17T10:15:33.000Z',
      type: CONSENT_ACTION_TYPE.WAIT,
      label: 'Wait for consent dialog',
      durationMs: 1200,
      ok: true,
    },
    {
      at: '2026-02-17T10:15:35.000Z',
      type: CONSENT_ACTION_TYPE.CLICK,
      label: 'Click accept button (Cookiebot)',
      selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      ok: false,
      error: 'Selector not found',
    },
    {
      at: '2026-02-17T10:15:37.000Z',
      type: CONSENT_ACTION_TYPE.CLICK,
      label: 'Click accept button (fallback text match)',
      textMatch: 'Accept all',
      ok: true,
    },
  ],
  screenshotKey: screenshotUrl1,
  secondScreenshotKey: screenshotUrl2,
  screenshotContentType: 'image/png',
  title: 'Site One Resort & Spa — Luxury Seafront Hotel',
  metaDescription: 'A luxury seafront resort with private villas, fine dining, signature spa, and direct booking offers.',
  notes: ['Some third-party resources were blocked in mock environment'],
};

export const MOCK_SITE_1_SNAPSHOT: IHotelSiteSnapshotDoc = {
  _id: MOCK_SNAPSHOT_ID,
  hotelId: MOCK_HOTEL_ID,
  domain: DOMAIN,
  homeUrl: HOME_URL,
  status: SNAPSHOT_STATUS.OK,
  startedAt: NOW_ISO,
  finishedAt: FINISH_ISO,
  home: HOME_SNAPSHOT,
  files: {
    robotsTxt: MOCK_SITE_1_ROBOTS_TXT,
    llmsTxt: MOCK_SITE_1_LLMS_TXT,
    sitemapXml: MOCK_SITE_1_SITEMAP_XML,
  },
  pages: [],
  warnings: ['mock-warning: blocked third-party scripts'],
  meta: {
    actor: 'apify-cyprus-hotel-site-snapshot',
    actorVersion: '1.0.0-mock',
    runId: 'MOCK_RUN_SITE_1',
    crawl: { maxPages: 10, maxDepth: 2 },
  },
  createdAt: NOW_ISO,
  updatedAt: FINISH_ISO,
};
