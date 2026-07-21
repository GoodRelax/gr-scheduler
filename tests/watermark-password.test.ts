/**
 * Coverage for the watermark hide-password gate (security-design §6, TOOL-L2-003,
 * CR-009 Part 1) and the "only the hash, never a raw password field" persistence
 * invariant.
 *
 * The raw default password is DELIBERATELY not written as a fresh literal here: the
 * CR-009 default happens to equal the default watermark brand text "GoodRelax"
 * ({@link DEFAULT_WATERMARK_TEXT}), so where a plaintext is needed to prove the hash
 * we reuse that existing constant rather than store a new password literal. We verify
 * (a) the adapter hashes + compares correctly, (b) the default hash is exactly the
 * CR-009 verified digest AND is the SHA-256 of that plaintext, (c) the OLD default no
 * longer unlocks, and (d) an exported document persists only the HASH for the hide
 * credential.
 */

import { describe, expect, it } from 'vitest';
import {
  matchesWatermarkHidePassword,
  sha256Hex,
} from '../src/adapters/security/watermark-password.js';
import {
  DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
  DEFAULT_WATERMARK_TEXT,
  type ScheduleDocument,
  type Watermark,
} from '../src/domain/model/schedule-model.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

/** The CR-009 verified SHA-256 digest of the default hide password. */
const VERIFIED_DEFAULT_HASH =
  '380e83c38461aa049922c0d277df334b01cfa0783f312be5e486ac06dc9c8ec3';
/** The OLD (pre-CR-009) default password; kept only to prove it no longer unlocks. */
const OLD_DEFAULT_PASSWORD = 'watermark-unlock';

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

  it('pins the DEFAULT hash to the CR-009 verified digest', () => {
    // Assert the constant is exactly the verified digest (Part 1), and that the OLD
    // default hash is no longer in use.
    expect(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH).toBe(VERIFIED_DEFAULT_HASH);
    expect(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH).not.toBe(
      'a8f81cfc4f489a27c6e6fa3a31c6089878a3648e24c04ee1b934ac03b99ce46c',
    );
  });

  it('the DEFAULT hash IS the SHA-256 of the default password plaintext (CR-009)', async () => {
    // The CR-009 default password equals the default watermark brand text "GoodRelax"
    // (DEFAULT_WATERMARK_TEXT); reuse that constant instead of storing a fresh
    // password literal. Hashing it with the app's own function must yield the digest.
    expect(await sha256Hex(DEFAULT_WATERMARK_TEXT)).toBe(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH);
  });

  it('accepts the correct password, rejects the OLD default and a wrong one', async () => {
    expect(
      await matchesWatermarkHidePassword(
        DEFAULT_WATERMARK_TEXT,
        DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
      ),
    ).toBe(true);
    // The pre-CR-009 default password no longer unlocks.
    expect(
      await matchesWatermarkHidePassword(OLD_DEFAULT_PASSWORD, DEFAULT_WATERMARK_HIDE_PASSWORD_HASH),
    ).toBe(false);
    expect(
      await matchesWatermarkHidePassword('wrong-password', DEFAULT_WATERMARK_HIDE_PASSWORD_HASH),
    ).toBe(false);
    // An empty entry never unlocks.
    expect(await matchesWatermarkHidePassword('', DEFAULT_WATERMARK_HIDE_PASSWORD_HASH)).toBe(false);
  });
});

describe('only the HASH is persisted for the hide credential', () => {
  it('exports the hide credential as a 64-hex hash, not a plaintext field', () => {
    const document = documentWithWatermark({
      enabled: true,
      userName: 'pm-local',
      timestamp: '2026-07-19T05:12Z',
      hideHash: DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
    });
    const json = serializeScheduleDocument(document);
    // The hide credential is persisted, and only as the hash.
    expect(json).toContain(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH);
    expect(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH).toMatch(/^[0-9a-f]{64}$/);
    // The OLD raw default password is not present anywhere in the serialized output.
    expect(json.includes(OLD_DEFAULT_PASSWORD)).toBe(false);
    const restored = deserializeScheduleDocument(json);
    // Round-trip keeps the credential as the hash (never a raw password field).
    expect(restored.viewState.watermark?.hideHash).toBe(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH);
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
