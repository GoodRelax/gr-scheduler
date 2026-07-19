/**
 * Unit tests for {@link computeFitView} (fix 7 "Fit"): the pure zoom/scroll
 * solver that frames the whole schedule in the viewport. Verifies that at the
 * fitted zoom the full date span and every row map inside the usable drawing area,
 * and that the anchoring keeps the first item on-screen.
 */

import { describe, expect, it } from 'vitest';
import { computeFitView, type FitContentExtent } from '../src/domain/usecase/viewport.js';
import { BASE_PIXELS_PER_DAY } from '../src/domain/usecase/time-coordinate-mapper.js';
import { BASE_ROW_HEIGHT } from '../src/domain/usecase/layout-engine.js';

const inputs = {
  canvasSize: { widthPx: 1200, heightPx: 800 },
  leftPaneWidth: 200,
  // A fixed 32px ruler for the test (independent of the chosen zoomX).
  topOffsetForZoomX: (): number => 32,
};

describe('computeFitView (fix 7)', () => {
  it('frames the full date span within the usable width', () => {
    const extent: FitContentExtent = { minStartDay: 100, maxEndDay: 900, rowCount: 10, epochDay: 0 };
    const fit = computeFitView(extent, inputs);
    const spanWorldWidth = (extent.maxEndDay - extent.minStartDay) * BASE_PIXELS_PER_DAY * fit.zoomX;
    const usableWidth = inputs.canvasSize.widthPx - inputs.leftPaneWidth;
    // The whole span fits within the schedule width (with the margin budget spare).
    expect(spanWorldWidth).toBeLessThanOrEqual(usableWidth);
    expect(spanWorldWidth).toBeGreaterThan(usableWidth * 0.7);
  });

  it('frames every row within the usable height', () => {
    const extent: FitContentExtent = { minStartDay: 0, maxEndDay: 400, rowCount: 24, epochDay: 0 };
    const fit = computeFitView(extent, inputs);
    const rowsWorldHeight = extent.rowCount * BASE_ROW_HEIGHT * fit.zoomY;
    const usableHeight = inputs.canvasSize.heightPx - 32;
    expect(rowsWorldHeight).toBeLessThanOrEqual(usableHeight);
  });

  it('anchors scroll so the first item is on-screen (not clipped left)', () => {
    const extent: FitContentExtent = { minStartDay: 300, maxEndDay: 700, rowCount: 6, epochDay: 100 };
    const fit = computeFitView(extent, inputs, 24);
    const firstItemWorldX = (extent.minStartDay - extent.epochDay) * BASE_PIXELS_PER_DAY * fit.zoomX;
    // The first item's world x is at or to the right of the scroll origin (visible).
    expect(firstItemWorldX).toBeGreaterThanOrEqual(fit.scrollX);
    // ... and within one margin of it (framed to the left edge, not far away).
    expect(firstItemWorldX - fit.scrollX).toBeLessThanOrEqual(24 + 0.001);
    expect(fit.scrollY).toBe(0);
  });

  it('clamps zoom to the operating range for a degenerate (single-day) extent', () => {
    const extent: FitContentExtent = { minStartDay: 10, maxEndDay: 10, rowCount: 1, epochDay: 0 };
    const fit = computeFitView(extent, inputs);
    expect(fit.zoomX).toBeGreaterThan(0);
    expect(fit.zoomX).toBeLessThanOrEqual(64);
    expect(fit.zoomY).toBeGreaterThan(0);
    expect(fit.zoomY).toBeLessThanOrEqual(64);
  });
});
