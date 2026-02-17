import type { Page } from 'playwright';
import type { IRedirectChainItem } from '../types.js';

export function nowIso(): string {
  return new Date().toISOString();
}

export function msToSecsCeil(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 1000);
}

export function ensureHttpsUrl(input: string): string {
  const s = input.trim();
  if (!s) return s;

  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;

  return `https://${s}`;
}

export function normalizeDomainToHomeUrl(domain: string): string {
  return ensureHttpsUrl(domain.replace(/^\s*https?:\/\//i, '').replace(/\/+$/g, '')) + '/';
}

export function uniqStrings(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const s = raw.trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function pickHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedName) return value;
  }
  return undefined;
}

export function isProbablyHtml(contentType: string | undefined): boolean {
  if (typeof contentType !== 'string') return true;
  return contentType.toLowerCase().includes('text/html');
}

export function isProbablyTextDocument(contentType: string | undefined): boolean {
  if (typeof contentType !== 'string') return true;

  const lower = contentType.toLowerCase();

  if (lower.includes('text/')) return true;
  if (lower.includes('application/xml')) return true;
  if (lower.includes('text/xml')) return true;
  if (lower.includes('application/xhtml+xml')) return true;
  if (lower.includes('application/json')) return true;
  if (lower.includes('+json')) return true;

  return false;
}

export function buildRedirectChainSimple(params: { url: string; finalUrl?: string; status?: number }): IRedirectChainItem[] {
  const { url, finalUrl, status } = params;

  if (!finalUrl || finalUrl === url) return [{ url, status }];

  return [
    { url, status, resolvedUrl: finalUrl },
    { url: finalUrl, status, resolvedUrl: finalUrl },
  ];
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function buildKvsRecordPublicUrl(params: { storeId: string; key: string }): string {
  const { storeId, key } = params;
  const safeStoreId = encodeURIComponent(storeId);
  const safeKey = encodeURIComponent(key);
  return `https://api.apify.com/v2/key-value-stores/${safeStoreId}/records/${safeKey}`;
}

export async function waitForAboveTheFoldMedia(params: {
  page: Page;
  timeoutMs: number;
  pollIntervalMs?: number;
}): Promise<{ ok: boolean; reason?: string }> {
  const { page, timeoutMs, pollIntervalMs = 250 } = params;

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const res = await page
      .evaluate(() => {
        const videos = Array.from(document.querySelectorAll('video'));
        const imgs = Array.from(document.querySelectorAll('img'));
        const videoOk = videos.every((video) => video.readyState >= 2 || video.networkState === 3);
        const imgOk = imgs.every((img) => img.complete);

        return { videoCount: videos.length, imgCount: imgs.length, videoOk, imgOk };
      })
      .catch(() => null);

    if (res && res.videoOk && res.imgOk) return { ok: true };

    await page.waitForTimeout(pollIntervalMs);
  }

  return { ok: false, reason: 'timeout' };
}
