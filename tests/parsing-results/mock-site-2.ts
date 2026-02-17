import type { ICyprusHotelSiteSnapshotOutput, IHomeMobileSnapshot, IViewport } from '../../src/types.js';
import { CONSENT_ACTION_TYPE, SNAPSHOT_STATUS } from '../../src/types.js';

import { MOCK_SITE_2_LLMS_TXT } from '../mocks/mock-site-2-llms-txt.js';
import { MOCK_SITE_2_ROBOTS_TXT } from '../mocks/mock-site-2-robots-txt.js';
import { MOCK_SITE_2_SITEMAP_XML } from '../mocks/mock-site-2-sitemap-xml.js';

const HOTEL_ID = '65f0c1a2b3c4d5e6f7a80002';
const DOMAIN = 'www.site-2.mock';
const HOME_URL = 'https://www.site-2.mock/';
const KVS_ID = 'MOCK_KVS_ID_SITE_2';

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

const screenshotKey1Raw = `home-mobile-${HOTEL_ID}-1.png`;
const screenshotKey2Raw = `home-mobile-${HOTEL_ID}-2.png`;
const screenshotUrl1 = `https://api.apify.com/v2/key-value-stores/${KVS_ID}/records/${encodeURIComponent(screenshotKey1Raw)}`;
const screenshotUrl2 = `https://api.apify.com/v2/key-value-stores/${KVS_ID}/records/${encodeURIComponent(screenshotKey2Raw)}`;

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
  screenshotKey: screenshotUrl1,
  secondScreenshotKey: screenshotUrl2,
  screenshotContentType: 'image/png',
  title: 'Site 2 Mock Resort — Official Website',
  metaDescription: 'Mock beachfront resort on Cyprus. Book direct, enjoy member rates, spa, restaurants and events.',
  notes: ['robots.txt did not include Sitemap directive; sitemap discovered at default path /sitemap.xml (test case).'],
};

export const MOCK_SITE_2_SNAPSHOT: ICyprusHotelSiteSnapshotOutput = {
  hotelId: HOTEL_ID,
  domain: DOMAIN,
  homeUrl: HOME_URL,
  status: SNAPSHOT_STATUS.OK,
  startedAt: '2026-02-17T09:12:00.000Z',
  finishedAt: '2026-02-17T09:12:25.000Z',
  home: HOME,
  files: {
    robotsTxt: MOCK_SITE_2_ROBOTS_TXT,
    llmsTxt: MOCK_SITE_2_LLMS_TXT,
    sitemapXml: MOCK_SITE_2_SITEMAP_XML,
  },
  pages: [],
  warnings: [
    'robots.txt contained no Sitemap directive; used https://www.site-2.mock/sitemap.xml',
    'sitemap.xml contained URLs with UTM query parameters (should be normalized/filtered)',
  ],
  meta: { mock: true },
};
