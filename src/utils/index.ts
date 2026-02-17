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
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === n) return v;
  }
  return undefined;
}

export function isProbablyHtml(contentType: string | undefined): boolean {
  if (typeof contentType !== 'string') return true;
  return contentType.toLowerCase().includes('text/html');
}

export function buildRedirectChainSimple(params: {
  url: string;
  finalUrl?: string;
  status?: number;
}): IRedirectChainItem[] {
  const { url, finalUrl, status } = params;

  if (!finalUrl || finalUrl === url) {
    return [{ url, status }];
  }

  return [
    { url, status, resolvedUrl: finalUrl },
    { url: finalUrl, status, resolvedUrl: finalUrl },
  ];
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
