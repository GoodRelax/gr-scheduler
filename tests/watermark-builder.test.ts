import { describe, expect, it } from 'vitest';
import {
  buildWatermarkLayer,
  formatWatermarkTimestampUtc,
  resolveWatermark,
} from '../src/domain/usecase/watermark-builder.js';
import {
  DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
  DEFAULT_WATERMARK_TEXT,
} from '../src/domain/model/schedule-model.js';

describe('watermark-builder (TOOL-L1-007, TOOL-L2-001/002, DATA-SVG-002)', () => {
  it('builds a label from user name + timestamp (TOOL-L2-001)', () => {
    const layer = buildWatermarkLayer({ userName: 'pm-local', timestamp: '2026-07-18T09:00:00Z' }, 400, 300);
    expect(layer.label).toBe('pm-local 2026-07-18T09:00:00Z');
  });

  it('tiles the whole area with a constant diagonal rotation (TOOL-L2-002)', () => {
    const width = 800;
    const height = 600;
    const layer = buildWatermarkLayer({ userName: 'u', timestamp: 't' }, width, height);
    expect(layer.tiles.length).toBeGreaterThan(1);
    // Every tile shares the same (negative) diagonal tilt.
    for (const tile of layer.tiles) {
      expect(tile.rotationDeg).toBe(-30);
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeGreaterThanOrEqual(0);
    }
    // Coverage: tiles extend to at least the far edges of the area.
    const maxX = Math.max(...layer.tiles.map((tile) => tile.x));
    const maxY = Math.max(...layer.tiles.map((tile) => tile.y));
    expect(maxX).toBeGreaterThanOrEqual(width);
    expect(maxY).toBeGreaterThanOrEqual(height);
  });

  it('keeps the layer faint (bounded low opacity, TOOL-L2-002)', () => {
    const layer = buildWatermarkLayer({ userName: 'u', timestamp: 't' }, 100, 100);
    expect(layer.opacity).toBeGreaterThan(0);
    expect(layer.opacity).toBeLessThanOrEqual(0.2);
  });

  it('is FAINTER than the previous 0.12 opacity (subtle but legible)', () => {
    const layer = buildWatermarkLayer({ userName: 'u', timestamp: 't' }, 100, 100);
    // Lowered from the historical 0.12; still > 0 so it stays visible.
    expect(layer.opacity).toBe(0.06);
    expect(layer.opacity).toBeLessThan(0.12);
    expect(layer.opacity).toBeGreaterThan(0);
  });

  it('caps the tile count so a huge canvas cannot explode (bounded)', () => {
    const layer = buildWatermarkLayer({ userName: 'u', timestamp: 't' }, 1_000_000, 1_000_000);
    expect(layer.tiles.length).toBeLessThanOrEqual(2000);
  });

  it('always emits at least one tile for a small area', () => {
    const layer = buildWatermarkLayer({ userName: 'u', timestamp: 't' }, 10, 10);
    expect(layer.tiles.length).toBeGreaterThanOrEqual(1);
  });
});

describe('resolveWatermark: default-ON "GoodRelax" mark (TOOL-L1-007, TOOL-L2-003)', () => {
  it('resolves an ABSENT watermark to an enabled default "GoodRelax" mark', () => {
    const resolved = resolveWatermark(undefined);
    expect(resolved.enabled).toBe(true);
    expect(resolved.userName).toBe('GoodRelax');
    expect(resolved.userName).toBe(DEFAULT_WATERMARK_TEXT);
    // No timestamp is read from a clock in the pure default path.
    expect(resolved.timestamp).toBe('');
    // The default mark renders as just the text (no trailing timestamp).
    const layer = buildWatermarkLayer(
      { userName: resolved.userName, timestamp: resolved.timestamp },
      400,
      300,
    );
    expect(layer.label).toBe('GoodRelax');
  });

  it('back-fills the DEFAULT hide-password hash when the mark omits one', () => {
    const resolved = resolveWatermark({ enabled: true, userName: 'x', timestamp: 't' });
    expect(resolved.hideHash).toBe(DEFAULT_WATERMARK_HIDE_PASSWORD_HASH);
  });

  it('preserves an explicit hide hash and enabled=false', () => {
    const resolved = resolveWatermark({
      enabled: false,
      userName: 'x',
      timestamp: 't',
      hideHash: 'abc123',
    });
    expect(resolved.enabled).toBe(false);
    expect(resolved.hideHash).toBe('abc123');
  });
});

describe('formatWatermarkTimestampUtc: minute-precision UTC ISO-8601 with Z (TOOL-L2-001)', () => {
  it('formats an injected fixed instant as UTC ISO-8601 with a trailing Z', () => {
    // 2026-07-19T05:12:34.567Z -> minute precision, UTC, trailing Z.
    const fixed = Date.UTC(2026, 6, 19, 5, 12, 34, 567);
    expect(formatWatermarkTimestampUtc(fixed)).toBe('2026-07-19T05:12Z');
  });

  it('zero-pads month/day/hour/minute and stays in UTC', () => {
    const fixed = Date.UTC(2026, 0, 3, 4, 5, 0, 0);
    expect(formatWatermarkTimestampUtc(fixed)).toBe('2026-01-03T04:05Z');
    // The format is clock-free and deterministic for the same input.
    expect(formatWatermarkTimestampUtc(fixed)).toBe('2026-01-03T04:05Z');
  });
});
