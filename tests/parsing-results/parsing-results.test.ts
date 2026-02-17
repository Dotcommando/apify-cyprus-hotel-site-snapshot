import test from 'node:test';
import assert from 'node:assert/strict';

import { SNAPSHOT_STATUS } from '../../src/types.js';
import { MOCK_SITE_1_SNAPSHOT } from '../parsing-results/mock-site-1.js';
import { MOCK_SITE_2_SNAPSHOT } from '../parsing-results/mock-site-2.js';

test('mock snapshots are shaped as expected', () => {
  for (const snap of [MOCK_SITE_1_SNAPSHOT, MOCK_SITE_2_SNAPSHOT]) {
    assert.ok(snap.hotelId);
    assert.ok(snap.domain);
    assert.ok(snap.homeUrl);
    assert.equal(snap.status, SNAPSHOT_STATUS.OK);
    assert.ok(snap.home);
    assert.ok(snap.home?.screenshotKey, 'home.screenshotKey must be set');
    assert.ok(snap.home!.screenshotKey.endsWith('-1.png'), `unexpected screenshotKey: ${snap.home!.screenshotKey}`);


    const notes = snap.home?.notes ?? [];
    assert.ok(notes.some((n) => n.startsWith('second-screenshot:')));
  }
});
