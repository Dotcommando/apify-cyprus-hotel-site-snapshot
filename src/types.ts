export interface IViewport {
  width: number;
  height: number;
}

export enum ERunStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
}

export enum EErrorStage {
  SEED_RESOLVE = 'seed-resolve',
  FETCH = 'fetch',
  NAVIGATION = 'navigation',
  RENDER = 'render',
  PARSE = 'parse',
  SCREENSHOT = 'screenshot',
  ENQUEUE = 'enqueue',
  STORAGE = 'storage',
}

export enum EErrorCode {
  DNS_NOT_FOUND = 'DNS_NOT_FOUND',
  TLS_ERROR = 'TLS_ERROR',
  TOO_MANY_REDIRECTS = 'TOO_MANY_REDIRECTS',
  HTTP_401_403 = 'HTTP_401_403',
  HTTP_429 = 'HTTP_429',
  HTTP_5XX = 'HTTP_5XX',
  TIMEOUT = 'TIMEOUT',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  CAPTCHA_DETECTED = 'CAPTCHA_DETECTED',
  ROBOTS_BLOCKED = 'ROBOTS_BLOCKED',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  UNSUPPORTED_CONTENT_TYPE = 'UNSUPPORTED_CONTENT_TYPE',
  JS_CRASH = 'JS_CRASH',
  STORAGE_WRITE_FAILED = 'STORAGE_WRITE_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export interface IActorInput {
  hotelId: string;
  domain: string;
  seedUrls?: string[];
  maxPages?: number;
  maxDepth?: number;
  collectHtml?: boolean;
  mobileViewport?: IViewport;
  collectDesktop?: boolean;
  consentClickStrategy?: 'none' | 'minimal';
  timeoutMsPerPage?: number;
}

export interface IDomMeta {
  title: string | null;
  lang: string | null;
  canonical: string | null;
  hreflang: Array<{ hreflang: string; href: string }>;
}

export interface IAssetsSummary {
  scriptsCount: number;
  stylesCount: number;
  inlineJsBytes: number;
  inlineCssBytes: number;
  imagesCount: number;
  lazyImagesCount: number;
}

export interface IRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ILayoutElement {
  tag: string;
  id: string | null;
  className: string | null;
  rect: IRect;
  position: string | null;
  zIndex: number | null;
  bottomOffset: number;
  topOffset: number;
  text: string | null;
  href?: string | null;
  pointerEvents?: string | null;
  opacity?: string | null;
}

export interface ILayoutSnapshot {
  viewport: IViewport;
  fixedStickyElements: ILayoutElement[];
  clickableCandidates: ILayoutElement[];
}

export interface IConsentLog {
  consentAction: 'none' | 'clickedAccept' | 'clickedClose';
  consentSelectorUsed: string | null;
  consentError: string | null;
}

export interface IHomeMobileState {
  screenshotRef: string | null;
  layoutSnapshot: ILayoutSnapshot | null;
}

export interface IHomeMobileBlock {
  viewport: IViewport;
  consent: IConsentLog | null;
  initial: IHomeMobileState | null;
  afterConsent: IHomeMobileState | null;
  afterScroll: (IHomeMobileState & { scrollY: number }) | null;
}

export interface IPageRecord {
  hotelId: string;
  domain: string;
  url: string;
  finalUrl: string | null;
  depth: number | null;
  referrerUrl: string | null;
  status: number | null;
  contentType: string | null;
  fetchedAt: string;
  timings: { totalMs: number };
  domMeta: IDomMeta | null;
  outboundDomains: string[];
  assetsSummary: IAssetsSummary | null;
  contentStorage: { html: string | null };
  mobile?: IHomeMobileBlock;
  desktop?: { viewport: IViewport; screenshotRef: string | null };
}

export interface IRedirectChainItem {
  requestUrl: string;
  from: string;
  location: string | null;
  status: number;
  at: string;
}

export interface IErrorEvidence {
  finalUrl?: string | null;
  contentType?: string | null;
  bodySnippet?: string | null;
  retries?: number;
}

export interface IActorError {
  id: string;
  stage: EErrorStage;
  code: EErrorCode;
  message: string;
  url: string | null;
  httpStatus: number | null;
  evidence: IErrorEvidence;
  createdAt: string;
}

export interface IRunMeta {
  startedAt: string;
  finishedAt: string;
  actorVersion: string;
  inputEcho: Record<string, unknown>;
  runId: string | null;
}

export interface ISnapshotStats {
  pagesVisited: number;
  errorsCount: number;
  totalHtmlBytes: number;
}

export interface ISnapshot {
  hotelId: string;
  domain: string;
  seedUrls: string[];
  collectedAt: string;
  stats: ISnapshotStats;
}

export interface IActorOutput {
  runMeta: IRunMeta;
  snapshot: ISnapshot;
  pages: IPageRecord[];
  errors: IActorError[];
  debug: { redirectChains: IRedirectChainItem[] };
  runStatus: ERunStatus;
}
