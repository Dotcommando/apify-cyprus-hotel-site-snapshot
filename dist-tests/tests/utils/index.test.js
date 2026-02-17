import test from 'node:test';
import assert from 'node:assert/strict';
import { nowIso, msToSecsCeil, ensureHttpsUrl, normalizeDomainToHomeUrl, uniqStrings, pickHeader, isProbablyHtml, buildRedirectChainSimple, clampInt, } from '../../src/utils/index.js';
test('nowIso returns ISO string', () => {
    const s = nowIso();
    assert.equal(typeof s, 'string');
    assert.ok(s.includes('T'));
    assert.ok(s.endsWith('Z'));
});
test('msToSecsCeil', () => {
    assert.equal(msToSecsCeil(0), 0);
    assert.equal(msToSecsCeil(-1), 0);
    assert.equal(msToSecsCeil(1), 1);
    assert.equal(msToSecsCeil(999), 1);
    assert.equal(msToSecsCeil(1000), 1);
    assert.equal(msToSecsCeil(1001), 2);
});
test('ensureHttpsUrl', () => {
    assert.equal(ensureHttpsUrl('example.com'), 'https://example.com');
    assert.equal(ensureHttpsUrl('https://example.com'), 'https://example.com');
    assert.equal(ensureHttpsUrl('http://example.com'), 'http://example.com');
    assert.equal(ensureHttpsUrl('//example.com/path'), 'https://example.com/path');
});
test('normalizeDomainToHomeUrl', () => {
    assert.equal(normalizeDomainToHomeUrl('example.com'), 'https://example.com/');
    assert.equal(normalizeDomainToHomeUrl('https://example.com'), 'https://example.com/');
    assert.equal(normalizeDomainToHomeUrl('https://example.com/'), 'https://example.com/');
    assert.equal(normalizeDomainToHomeUrl('  example.com///  '), 'https://example.com/');
});
test('uniqStrings trims and dedupes', () => {
    assert.deepEqual(uniqStrings([' a ', 'a', 'b', '', '  ', 'b  ']), ['a', 'b']);
});
test('pickHeader is case-insensitive', () => {
    const h = { 'Content-Type': 'text/html; charset=utf-8', server: 'nginx' };
    assert.equal(pickHeader(h, 'content-type'), 'text/html; charset=utf-8');
    assert.equal(pickHeader(h, 'Server'), 'nginx');
    assert.equal(pickHeader(h, 'x-nope'), undefined);
});
test('isProbablyHtml', () => {
    assert.equal(isProbablyHtml(undefined), true);
    assert.equal(isProbablyHtml('text/html'), true);
    assert.equal(isProbablyHtml('TEXT/HTML; charset=utf-8'), true);
    assert.equal(isProbablyHtml('application/json'), false);
});
test('buildRedirectChainSimple', () => {
    assert.deepEqual(buildRedirectChainSimple({ url: 'https://a', status: 200 }), [{ url: 'https://a', status: 200 }]);
    assert.deepEqual(buildRedirectChainSimple({ url: 'https://a', finalUrl: 'https://a', status: 200 }), [
        { url: 'https://a', status: 200 },
    ]);
    assert.deepEqual(buildRedirectChainSimple({ url: 'https://a', finalUrl: 'https://b', status: 301 }), [
        { url: 'https://a', status: 301, resolvedUrl: 'https://b' },
        { url: 'https://b', status: 301, resolvedUrl: 'https://b' },
    ]);
});
test('clampInt', () => {
    assert.equal(clampInt(NaN, 1, 10), 1);
    assert.equal(clampInt(-5, 1, 10), 1);
    assert.equal(clampInt(0, 1, 10), 1);
    assert.equal(clampInt(1.9, 1, 10), 1);
    assert.equal(clampInt(10.9, 1, 10), 10);
    assert.equal(clampInt(50, 1, 10), 10);
});
