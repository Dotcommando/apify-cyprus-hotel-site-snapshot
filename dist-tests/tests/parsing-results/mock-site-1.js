import { CONSENT_ACTION_TYPE, SNAPSHOT_STATUS, } from '../../src/types.js';
import { MOCK_SITE_1_HTML } from '../mocks/mock-site-1-html.js';
import { MOCK_SITE_1_LLMS_TXT } from '../mocks/mock-site-1-llms-txt.js';
import { MOCK_SITE_1_ROBOTS_TXT } from '../mocks/mock-site-1-robots-txt.js';
import { MOCK_SITE_1_SITEMAP_XML } from '../mocks/mock-site-1-sitemap-xml.js';
const NOW_ISO = '2026-02-17T10:15:30.000Z';
const FINISH_ISO = '2026-02-17T10:16:12.000Z';
const MOCK_HOTEL_ID = '65c8d8a8c2a8b0f5a1b2c3d4';
const MOCK_SNAPSHOT_ID = '65c8d8f1d2a8b0f5a1b2c3e5';
const HOME_URL = 'https://www.site-1.mock/';
const DOMAIN = 'site-1.mock';
const HOME_VIEWPORT = {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const HOME_REDIRECT_CHAIN = [
    { url: 'http://www.site-1.mock/', status: 301, location: 'https://www.site-1.mock/' },
    { url: 'https://www.site-1.mock/', status: 200, resolvedUrl: 'https://www.site-1.mock/' },
];
const HOME_SNAPSHOT = {
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
    html: MOCK_SITE_1_HTML,
    screenshotKey: 'mock/site-1/home-mobile.png',
    screenshotContentType: 'image/png',
    title: 'Site One Resort & Spa — Luxury Seafront Hotel',
    metaDescription: 'A luxury seafront resort with private villas, fine dining, signature spa, and direct booking offers.',
    notes: ['Some third-party resources were blocked in mock environment'],
};
export const MOCK_SITE_1_SNAPSHOT = {
    _id: MOCK_SNAPSHOT_ID,
    hotelId: MOCK_HOTEL_ID,
    domain: DOMAIN,
    homeUrl: HOME_URL,
    status: SNAPSHOT_STATUS.OK,
    startedAt: NOW_ISO,
    finishedAt: FINISH_ISO,
    home: HOME_SNAPSHOT,
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
const makeHtmlPage = (url, title, h1, description) => {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MOCKGA41"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config','G-MOCKGA41');
    </script>
  </head>
  <body>
    <header>
      <a href="https://www.site-1.mock/">Home</a>
      <a href="https://www.site-1.mock/rooms/">Rooms</a>
      <a href="https://www.site-1.mock/dining/">Dining</a>
      <a href="https://www.site-1.mock/spa/">Spa</a>
      <a href="https://www.site-1.mock/offers/">Offers</a>
    </header>
    <main>
      <h1>${h1}</h1>
      <p>${description}</p>
      <a href="https://www.site-1.mock/contact/" data-track="contact">Contact</a>
    </main>
  </body>
</html>`;
};
export const MOCK_SITE_PAGES = [
    {
        _id: '65c8d911d2a8b0f5a1b2c3f1',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: HOME_URL,
        finalUrl: HOME_URL,
        status: 200,
        contentType: 'text/html; charset=utf-8',
        redirectChain: HOME_REDIRECT_CHAIN,
        startedAt: NOW_ISO,
        finishedAt: FINISH_ISO,
        html: MOCK_SITE_1_HTML,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            server: 'mock-nginx',
        },
        createdAt: NOW_ISO,
        updatedAt: FINISH_ISO,
    },
    {
        _id: '65c8d922d2a8b0f5a1b2c3f2',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: 'https://www.site-1.mock/rooms/',
        finalUrl: 'https://www.site-1.mock/rooms/',
        status: 200,
        contentType: 'text/html; charset=utf-8',
        redirectChain: [{ url: 'https://www.site-1.mock/rooms/', status: 200, resolvedUrl: 'https://www.site-1.mock/rooms/' }],
        startedAt: '2026-02-17T10:15:45.000Z',
        finishedAt: '2026-02-17T10:15:49.000Z',
        html: makeHtmlPage('https://www.site-1.mock/rooms/', 'Rooms & Villas — Site One Resort & Spa', 'Rooms & Villas', 'Sea-view suites and private villas with curated amenities.'),
        headers: { 'content-type': 'text/html; charset=utf-8', server: 'mock-nginx' },
        createdAt: '2026-02-17T10:15:49.000Z',
        updatedAt: '2026-02-17T10:15:49.000Z',
    },
    {
        _id: '65c8d933d2a8b0f5a1b2c3f3',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: 'https://www.site-1.mock/dining/',
        finalUrl: 'https://www.site-1.mock/dining/',
        status: 200,
        contentType: 'text/html; charset=utf-8',
        redirectChain: [{ url: 'https://www.site-1.mock/dining/', status: 200, resolvedUrl: 'https://www.site-1.mock/dining/' }],
        startedAt: '2026-02-17T10:15:50.000Z',
        finishedAt: '2026-02-17T10:15:54.000Z',
        html: makeHtmlPage('https://www.site-1.mock/dining/', 'Dining — Site One Resort & Spa', 'Dining', 'Mediterranean fine dining, beachfront grill, and wine cellar tastings.'),
        headers: { 'content-type': 'text/html; charset=utf-8', server: 'mock-nginx' },
        createdAt: '2026-02-17T10:15:54.000Z',
        updatedAt: '2026-02-17T10:15:54.000Z',
    },
    {
        _id: '65c8d944d2a8b0f5a1b2c3f4',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: 'https://www.site-1.mock/spa/',
        finalUrl: 'https://www.site-1.mock/spa/',
        status: 200,
        contentType: 'text/html; charset=utf-8',
        redirectChain: [{ url: 'https://www.site-1.mock/spa/', status: 200, resolvedUrl: 'https://www.site-1.mock/spa/' }],
        startedAt: '2026-02-17T10:15:55.000Z',
        finishedAt: '2026-02-17T10:15:58.000Z',
        html: makeHtmlPage('https://www.site-1.mock/spa/', 'Spa & Wellness — Site One Resort & Spa', 'Spa & Wellness', 'Signature rituals, hammam, and wellbeing experiences by the sea.'),
        headers: { 'content-type': 'text/html; charset=utf-8', server: 'mock-nginx' },
        createdAt: '2026-02-17T10:15:58.000Z',
        updatedAt: '2026-02-17T10:15:58.000Z',
    },
    {
        _id: '65c8d955d2a8b0f5a1b2c3f5',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: 'https://www.site-1.mock/offers/',
        finalUrl: 'https://www.site-1.mock/offers/',
        status: 200,
        contentType: 'text/html; charset=utf-8',
        redirectChain: [{ url: 'https://www.site-1.mock/offers/', status: 200, resolvedUrl: 'https://www.site-1.mock/offers/' }],
        startedAt: '2026-02-17T10:15:59.000Z',
        finishedAt: '2026-02-17T10:16:03.000Z',
        html: makeHtmlPage('https://www.site-1.mock/offers/', 'Offers — Site One Resort & Spa', 'Offers', 'Direct booking perks, seasonal packages, and flexible stay benefits.'),
        headers: { 'content-type': 'text/html; charset=utf-8', server: 'mock-nginx' },
        createdAt: '2026-02-17T10:16:03.000Z',
        updatedAt: '2026-02-17T10:16:03.000Z',
    },
    {
        _id: '65c8d966d2a8b0f5a1b2c3f6',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: 'https://www.site-1.mock/robots.txt',
        finalUrl: 'https://www.site-1.mock/robots.txt',
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        redirectChain: [{ url: 'https://www.site-1.mock/robots.txt', status: 200, resolvedUrl: 'https://www.site-1.mock/robots.txt' }],
        startedAt: '2026-02-17T10:16:04.000Z',
        finishedAt: '2026-02-17T10:16:05.000Z',
        headers: { 'content-type': 'text/plain; charset=utf-8', server: 'mock-nginx' },
        bodyText: MOCK_SITE_1_ROBOTS_TXT,
        createdAt: '2026-02-17T10:16:05.000Z',
        updatedAt: '2026-02-17T10:16:05.000Z',
    },
    {
        _id: '65c8d977d2a8b0f5a1b2c3f7',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: 'https://www.site-1.mock/llms.txt',
        finalUrl: 'https://www.site-1.mock/llms.txt',
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        redirectChain: [{ url: 'https://www.site-1.mock/llms.txt', status: 200, resolvedUrl: 'https://www.site-1.mock/llms.txt' }],
        startedAt: '2026-02-17T10:16:06.000Z',
        finishedAt: '2026-02-17T10:16:07.000Z',
        headers: { 'content-type': 'text/plain; charset=utf-8', server: 'mock-nginx' },
        bodyText: MOCK_SITE_1_LLMS_TXT,
        createdAt: '2026-02-17T10:16:07.000Z',
        updatedAt: '2026-02-17T10:16:07.000Z',
    },
    {
        _id: '65c8d988d2a8b0f5a1b2c3f8',
        snapshotId: MOCK_SNAPSHOT_ID,
        hotelId: MOCK_HOTEL_ID,
        domain: DOMAIN,
        url: 'https://www.site-1.mock/mock-site-sitemap.xml',
        finalUrl: 'https://www.site-1.mock/mock-site-sitemap.xml',
        status: 200,
        contentType: 'application/xml; charset=utf-8',
        redirectChain: [
            { url: 'https://www.site-1.mock/mock-site-sitemap.xml', status: 200, resolvedUrl: 'https://www.site-1.mock/mock-site-sitemap.xml' },
        ],
        startedAt: '2026-02-17T10:16:08.000Z',
        finishedAt: '2026-02-17T10:16:10.000Z',
        headers: { 'content-type': 'application/xml; charset=utf-8', server: 'mock-nginx' },
        bodyText: MOCK_SITE_1_SITEMAP_XML,
        createdAt: '2026-02-17T10:16:10.000Z',
        updatedAt: '2026-02-17T10:16:10.000Z',
    },
];
