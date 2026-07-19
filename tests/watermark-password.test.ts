/**
 * Coverage for the watermark hide-password gate (security-design §6, TOOL-L2-003)
 * and the "only the hash, never the raw password" persistence invariant.
 *
 * The DEFAULT raw password is DELIBERATELY not imported here: it lives only in the
 * StrictDoc spec (docs/spec/19-tools-watermark.sdoc) for server-side rotation. We
 * verify (a) the adapter hashes + compares correctly, (b) the default hash matches
 * the documented default password, and (c) an exported document carries the HASH
 * but not the raw password.
 */

import { describe, expect, it } from 'vitest';
import {
  matchesWatermarkHidePassword,
  sha256Hex,
} from '../src/adapters/security/watermark-password.js';
import {
  DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
  type ScheduleDocument,
  type Watermark,
} from '../src/domain/model/schedule-model.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

/** The documented default password (StrictDoc 19-tools-watermark.sdoc). */
const DEFAULT_WATERMARK_PASSWORD = 'watermark-unlock';

function documentWithWatermark(watermark: Watermark): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'watermark test',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', watermark },
    sections: [],
    rows: [],
    items: [],
  };
}

describe('watermark hide-password gate (SHA-256 via Web Crypto)', () => {
  it('computes a stable lowercase-hex SHA-256 digest', async () => {
    // A known vector: SHA-256("") is the canonical empty-string digest.
    expect(await sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('the DEFAULT hash matches SHA-256 of the documented default password', async () => {
    expect(await sha256Hex(DEFAULT_WATERMARK_PASSWORD)).toBe(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH);
  });

  it('accepts the correct password and rejects a wrong one', async () => {
    expect(
      await matchesWatermarkHidePassword(
        DEFAULT_WATERMARK_PASSWORD,
        DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
      ),
    ).toBe(true);
    expect(
      await matchesWatermarkHidePassword('wrong-password', DEFAULT_WATERMARK_HIDE_PASSWORD_HASH),
    ).toBe(false);
    // An empty entry never unlocks.
    expect(await matchesWatermarkHidePassword('', DEFAULT_WATERMARK_HIDE_PASSWORD_HASH)).toBe(false);
  });
});

describe('only the HASH is serialized, never the raw password', () => {
  it('exports the hide hash but not the raw default password', () => {
    const document = documentWithWatermark({
      enabled: true,
      userName: 'GoodRelax',
      timestamp: '2026-07-19T05:12Z',
      hideHash: DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
    });
    const json = serializeScheduleDocument(document);
    // The hash IS present.
    expect(json).toContain(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH);
    // The raw default password is NOT present anywhere in the serialized output.
    expect(json.includes(DEFAULT_WATERMARK_PASSWORD)).toBe(false);
  });

  it('round-trips the watermark (enabled, userName, UTC timestamp, hideHash)', () => {
    const watermark: Watermark = {
      enabled: false,
      userName: 'GoodRelax',
      timestamp: '2026-07-19T05:12Z',
      hideHash: DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
    };
    const restored = deserializeScheduleDocument(
      serializeScheduleDocument(documentWithWatermark(watermark)),
    );
    expect(restored.viewState.watermark).toEqual(watermark);
  });
});
