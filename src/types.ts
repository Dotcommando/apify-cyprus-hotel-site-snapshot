export enum SNAPSHOT_STATUS {
  OK = 'ok',
  FAILED = 'failed',
}

export enum CONSENT_ACTION_TYPE {
  CLICK = 'click',
  WAIT = 'wait',
  PRESS_KEY = 'pressKey',
  SCROLL = 'scroll',
}

export interface IViewport {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Device pixel ratio (DPR). */
  deviceScaleFactor: number;
  /** Whether the viewport is considered a mobile device. */
  isMobile: boolean;
  /** Whether to emulate touch input. */
  hasTouch: boolean;
  /** Whether the viewport is in landscape mode. */
  isLandscape: boolean;
  /** User-Agent string used for the page. */
  userAgent: string;
}

export interface IRedirectChainItem {
  /** The requested URL at this hop. */
  url: string;
  /** HTTP status code for the hop, if known. */
  status?: number;
  /** Redirect target URL, if this hop redirected. */
  location?: string;
  /** Final resolved URL if this hop ended the chain. */
  resolvedUrl?: string;
}

export interface IHomeMobileSnapshot {
  /** The homepage URL that was opened for the snapshot. */
  url: string;
  /** Final URL after redirects (if any). */
  finalUrl?: string;
  /** Mobile viewport used to render the page. */
  viewport: IViewport;
  /** When the snapshot process started (ISO string). */
  startedAt: string;
  /** When the snapshot process finished (ISO string). */
  finishedAt: string;
  /** HTTP status code of the main document response (if available). */
  status?: number;
  /** Redirect chain observed while opening the homepage. */
  redirectChain: IRedirectChainItem[];
  /** Whether a consent/banner interaction was attempted. */
  consentAttempted: boolean;
  /** Consent action log (attempts, clicks, waits, etc.). */
  consentLog: IConsentLog[];
  /** Raw HTML of the final homepage document. */
  html: string;
  /**
   * Public screenshot URL (no token).
   * Example: https://api.apify.com/v2/key-value-stores/<storeId>/records/<key>
   */
  screenshotKey: string;
  /** Screenshot content type, usually "image/png". */
  screenshotContentType: string;
  /**
   * Public URL of the second screenshot (after consent + scroll).
   * Same format as screenshotKey.
   */
  secondScreenshotKey?: string;
  /** Content type of the second screenshot (usually "image/png"). */
  secondScreenshotContentType?: string;
  /** Page title as reported by the browser. */
  title?: string;
  /** Detected <meta name="description"> content, if found. */
  metaDescription?: string;
  /** Any non-fatal notes captured during snapshot (timeouts, blocked resources, etc.). */
  notes?: string[];
}

export interface IConsentLog {
  /** When the action was executed (ISO string). */
  at: string;
  /** Action kind used to try to dismiss/accept a consent banner. */
  type: CONSENT_ACTION_TYPE;
  /** Human-readable description of what was attempted. */
  label: string;
  /** CSS selector used (for click actions), if any. */
  selector?: string;
  /** Text that was searched for / matched, if any. */
  textMatch?: string;
  /** How long we waited (ms) for waits/timeouts, if applicable. */
  durationMs?: number;
  /** Whether the action succeeded. */
  ok: boolean;
  /** Error message, if action failed. */
  error?: string;
}

export interface ICyprusHotelSiteSnapshotInput {
  /** MongoDB hotels._id as string. Used to join snapshot with your database. */
  hotelId: string;
  /** Hotel website domain without protocol (example.com). */
  domain: string;
  /** Optional list of starting URLs. If empty, https://<domain>/ will be used. */
  seedUrls: string[];
  /** Maximum number of pages to crawl (including seed). */
  maxPages: number;
  /** Maximum crawl depth from seed URLs (0 = only seed). */
  maxDepth: number;
  /** Max requests per minute to keep load reasonable. */
  maxRequestsPerMinute: number;
  /** Navigation timeout in milliseconds for page loads. */
  navigationTimeoutMs: number;
  /** Request timeout in milliseconds for each HTTP fetch. */
  requestTimeoutMs: number;
  /** Whether to store raw HTML for crawled pages (not only home). */
  storeHtml: boolean;
  /** Whether to store response headers for crawled pages. */
  storeHeaders: boolean;
  /** Whether to store a mobile screenshot of the homepage. */
  takeHomeMobileScreenshot: boolean;
  /** If true, tries to click common cookie/consent banners on homepage. */
  tryDismissConsent: boolean;
  /** If provided, overrides default mobile viewport settings. */
  homeMobileViewport?: Partial<IViewport>;
  /** Optional tags to add into output for debugging/segmentation. */
  tags?: string[];
  /** If true, prints more detailed logs. */
  debug?: boolean;
}

export interface ICrawledPageSnapshot {
  /** Page URL as requested. */
  url: string;
  /** Final URL after redirects. */
  finalUrl?: string;
  /** HTTP status code, if available. */
  status?: number;
  /** Content-Type header of the main document, if known. */
  contentType?: string;
  /** Redirect chain observed while fetching the document. */
  redirectChain: IRedirectChainItem[];
  /** When the fetch started (ISO string). */
  startedAt: string;
  /** When the fetch finished (ISO string). */
  finishedAt: string;
  /** Raw HTML of the document (only if storeHtml=true and content is HTML). */
  html?: string;
  /** Response headers (only if storeHeaders=true). */
  headers?: Record<string, string>;
  /** Error message for failed requests, if any. */
  error?: string;
}

export interface ICyprusHotelSiteSnapshotOutput {
  /** MongoDB hotels._id as string. */
  hotelId: string;
  /** Domain that was processed (as provided). */
  domain: string;
  /** Normalized homepage URL used as primary entry point. */
  homeUrl: string;
  /** Overall actor run status. */
  status: SNAPSHOT_STATUS;
  /** When the actor run started (ISO string). */
  startedAt: string;
  /** When the actor run finished (ISO string). */
  finishedAt: string;
  /** Snapshot of the homepage (HTML + optional mobile screenshot). */
  home?: IHomeMobileSnapshot;
  /** Crawled pages (may include home, depending on implementation). */
  pages: ICrawledPageSnapshot[];
  /** Non-fatal warnings collected during processing. */
  warnings?: string[];
  /** Fatal error if status=FAILED. */
  error?: string;
  /** Arbitrary debug/meta fields (versioning, timings, etc.). */
  meta?: Record<string, unknown>;
}
