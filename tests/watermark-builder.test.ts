import { describe, expect, it } from 'vitest';
import { buildWatermarkLayer } from '../src/domain/usecase/watermark-builder.js';

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

  it('caps the tile count so a huge canvas cannot explode (bounded)', () => {
    const layer = buildWatermarkLayer({ userName: 'u', timestamp: 't' }, 1_000_000, 1_000_000);
    expect(layer.tiles.length).toBeLessThanOrEqual(2000);
  });

  it('always emits at least one tile for a small area', () => {
    const layer = buildWatermarkLayer({ userName: 'u', timestamp: 't' }, 10, 10);
    expect(layer.tiles.length).toBeGreaterThanOrEqual(1);
  });
});
