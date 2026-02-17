import test from 'node:test';
import assert from 'node:assert/strict';

import { SNAPSHOT_STATUS } from '../../src/types.js';
import { MOCK_SITE_1_SNAPSHOT } from './mock-site-1.js';
import { MOCK_SITE_2_SNAPSHOT } from './mock-site-2.js';

test('mock snapshots are shaped as expected', () => {
  for (const snap of [MOCK_SITE_1_SNAPSHOT, MOCK_SITE_2_SNAPSHOT]) {
    assert.ok(snap.hotelId);
    assert.ok(snap.domain);
    assert.ok(snap.homeUrl);
    assert.equal(snap.status, SNAPSHOT_STATUS.OK);

    assert.ok(snap.home);

    assert.ok(snap.home?.screenshotKey, 'home.screenshotKey must be set');
    assert.ok(snap.home?.secondScreenshotKey, 'home.secondScreenshotKey must be set');

    assert.ok(snap.home!.screenshotKey.endsWith('-1.png'), `unexpected screenshotKey: ${snap.home!.screenshotKey}`);
    assert.ok(
      snap.home!.secondScreenshotKey.endsWith('-2.png'),
      `unexpected secondScreenshotKey: ${snap.home!.secondScreenshotKey}`
    );

    assert.equal('html' in (snap.home as any), false, 'home.html must NOT exist anymore');

    assert.ok(snap.files, 'files must exist in snapshot (mock expects robots/sitemap/llms present)');
    assert.ok(typeof snap.files!.robotsTxt === 'string' && snap.files!.robotsTxt.length > 0, 'files.robotsTxt must be set');
    assert.ok(
      typeof snap.files!.sitemapXml === 'string' && snap.files!.sitemapXml.length > 0,
      'files.sitemapXml must be set'
    );
    assert.ok(typeof snap.files!.llmsTxt === 'string' && snap.files!.llmsTxt.length > 0, 'files.llmsTxt must be set');

    for (const p of snap.pages) {
      assert.notEqual(p.url.endsWith('/robots.txt'), true, 'robots.txt must not be in pages[]');
      assert.notEqual(p.url.endsWith('/llms.txt'), true, 'llms.txt must not be in pages[]');
      assert.notEqual(p.url.endsWith('/sitemap.xml'), true, 'sitemap.xml must not be in pages[]');
      assert.notEqual(p.url.endsWith('mock-site-sitemap.xml'), true, 'mock-site-sitemap.xml must not be in pages[]');
    }
  }
});
