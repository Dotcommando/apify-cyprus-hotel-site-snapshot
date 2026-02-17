import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureHttpsUrl, normalizeDomainToHomeUrl, uniqStrings, pickHeader, isProbablyHtml, buildRedirectChainSimple, clampInt, waitForAboveTheFoldMedia, } from '../../src/utils/index.js';
test('ensureHttpsUrl', () => {
    assert.equal(ensureHttpsUrl('example.com'), 'https://example.com');
    assert.equal(ensureHttpsUrl('http://example.com'), 'http://example.com');
    assert.equal(ensureHttpsUrl('https://example.com'), 'https://example.com');
    assert.equal(ensureHttpsUrl('//example.com'), 'https://example.com');
});
test('normalizeDomainToHomeUrl', () => {
    assert.equal(normalizeDomainToHomeUrl('example.com'), 'https://example.com/');
    assert.equal(normalizeDomainToHomeUrl('https://example.com/'), 'https://example.com/');
});
test('uniqStrings trims and removes duplicates', () => {
    assert.deepEqual(uniqStrings([' a ', 'a', 'b', '  ', 'b ']), ['a', 'b']);
});
test('pickHeader is case-insensitive', () => {
    const h = { 'Content-Type': 'text/html', foo: 'bar' };
    assert.equal(pickHeader(h, 'content-type'), 'text/html');
    assert.equal(pickHeader(h, 'FOO'), 'bar');
    assert.equal(pickHeader(undefined, 'x'), undefined);
});
test('isProbablyHtml', () => {
    assert.equal(isProbablyHtml(undefined), true);
    assert.equal(isProbablyHtml('text/html; charset=utf-8'), true);
    assert.equal(isProbablyHtml('application/xml'), false);
});
test('buildRedirectChainSimple', () => {
    assert.deepEqual(buildRedirectChainSimple({ url: 'https://a/', finalUrl: 'https://a/', status: 200 }), [
        { url: 'https://a/', status: 200 },
    ]);
    assert.deepEqual(buildRedirectChainSimple({ url: 'https://a/', finalUrl: 'https://b/', status: 301 }), [
        { url: 'https://a/', status: 301, resolvedUrl: 'https://b/' },
        { url: 'https://b/', status: 301, resolvedUrl: 'https://b/' },
    ]);
});
test('clampInt', () => {
    assert.equal(clampInt(10, 1, 5), 5);
    assert.equal(clampInt(-10, 1, 5), 1);
    assert.equal(clampInt(3.9, 1, 5), 3);
    assert.equal(clampInt(Number.NaN, 1, 5), 1);
});
test('waitForAboveTheFoldMedia returns ok=true when evaluate reports ready', async () => {
    const page = {
        evaluate: async () => ({ videoCount: 1, imgCount: 1, videoOk: true, imgOk: true }),
        waitForTimeout: async () => undefined,
    };
    const res = await waitForAboveTheFoldMedia({ page, timeoutMs: 50, pollIntervalMs: 5 });
    assert.equal(res.ok, true);
});
test('waitForAboveTheFoldMedia times out when never ready', async () => {
    const page = {
        evaluate: async () => ({ videoCount: 1, imgCount: 1, videoOk: false, imgOk: false }),
        waitForTimeout: async (ms) => new Promise((r) => setTimeout(r, ms)),
    };
    const res = await waitForAboveTheFoldMedia({ page, timeoutMs: 30, pollIntervalMs: 10 });
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'timeout');
});
