/**
 * Unit coverage for the UI/interaction feedback batch (pure-logic parts). The real
 * rendered-DOM behavior for each item is asserted in
 * tests/e2e/ui-feedback-batch.spec.ts; here we lock the pure domain functions the
 * DOM behavior is built on:
 *
 *  1.  Fit leaves a LEFT margin: after the item-based Fit the leftmost RENDERED
 *      content sits one margin INSIDE the pane (screen-local x > 0), not clipped.
 *  5.  displayFillColor honors an EXPLICIT fill over the plan/actual hue, and the
 *      edit-property command sets it undoably.
 *  7.  A category row with >2 time-overlapping items stacks into >2 sub-lanes and
 *      the row band GROWS (up to 64 lanes); the rows below shift down; hit-testing
 *      (rowIndexAtWorldY) follows the taller rows.
 *  8.  Each stacked bar is ~95% of its lane height, leaving a visible gap between
 *      adjacent stacked bars.
 *  9-12. The cursor-guide mode round-trips through the JSON codec.
 */

import { describe, expect, it } from 'vitest';
import type { Row, ScheduleItem, ViewState } from '../src/domain/model/schedule-model.js';
import {
  BASE_LANE_HEIGHT,
  BASE_ROW_HEIGHT,
  MAX_STACK_LANES,
  STACKED_BAR_HEIGHT_RATIO,
  computeRowGeometry,
  layoutRows,
  rowBandUnitHeight,
  rowBoundaryY,
  rowIndexAtWorldY,
} from '../src/domain/usecase/layout-engine.js';
import {
  actualColorFrom,
  actualDisplayFillColor,
  displayFillColor,
  planColorFrom,
} from '../src/domain/usecase/plan-actual-colors.js';
import { editPropertyCommand } from '../src/domain/command/commands.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import {
  computeFitViewForItems,
  measureItemsFitExtent,
  type FitViewportInputs,
} from '../src/domain/usecase/viewport.js';
import { generateTemplateDocument } from '../src/app/sample-data.js';
import { orderedVisibleRows } from '../src/domain/usecase/section-organizer.js';
import { rulerTierCount } from '../src/domain/usecase/date-ruler.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

const EPOCH = '2026-01-01';
const VIEW: ViewState = { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' };

function task(id: string, rowId: string, startDate: string, endDate: string): ScheduleItem {
  return {
    id,
    rowId,
    itemKind: 'task',
    startDate,
    endDate,
    abbrev: id,
    importance: 1,
    taskShape: 'bar',
    fillColor: '#4477aa',
    strokeColor: 'transparent',
  };
}

const ROWS: Row[] = [
  { id: 'row-0', sectionId: 'section-0', classificationLabel: 'A', order: 0 },
  { id: 'row-1', sectionId: 'section-0', classificationLabel: 'B', order: 1 },
];

describe('item 7: multi-lane stacking grows the row up to 64 lanes', () => {
  it('stacks three time-overlapping items into three lanes and grows the band', () => {
    const items = [
      task('a', 'row-0', '2026-01-01', '2026-01-20'),
      task('b', 'row-0', '2026-01-05', '2026-01-25'),
      task('c', 'row-0', '2026-01-10', '2026-01-30'),
      task('d', 'row-1', '2026-01-01', '2026-01-05'),
    ];
    const { placements, geometry } = layoutRows(items, ROWS, EPOCH, VIEW);
    const lanes = new Set(
      placements.filter((placement) => placement.rowId === 'row-0').map((p) => p.laneIndex),
    );
    // More than two lanes are actually assigned (the old cap allowed only two visible).
    expect(lanes.size).toBe(3);
    expect(Math.max(...lanes)).toBeGreaterThanOrEqual(2);

    // Row 0 grew past the base height, and row 1 shifted down to make room.
    expect(geometry.laneCounts[0]).toBe(3);
    expect(geometry.rowHeights[0]).toBeGreaterThan(BASE_ROW_HEIGHT);
    expect(geometry.rowTops[1]).toBe(geometry.rowHeights[0]);
    expect(geometry.rowTops[0]).toBe(0);
  });

  it('a single-lane (or empty) row keeps the base band height', () => {
    const items = [task('a', 'row-0', '2026-01-01', '2026-01-10')];
    const { geometry } = layoutRows(items, ROWS, EPOCH, VIEW);
    expect(geometry.rowHeights[0]).toBe(BASE_ROW_HEIGHT);
    // row-1 has no items -> also the base height.
    expect(geometry.rowHeights[1]).toBe(BASE_ROW_HEIGHT);
  });

  it('grows up to 64 lanes and caps the band there', () => {
    // 64 lanes: full stack.
    expect(rowBandUnitHeight(64)).toBe(64 * BASE_LANE_HEIGHT + 8);
    // Beyond the cap the band does not keep growing.
    expect(rowBandUnitHeight(70)).toBe(rowBandUnitHeight(MAX_STACK_LANES));

    // 10 mutually-overlapping items -> 10 lanes, band grows accordingly.
    const items = Array.from({ length: 10 }, (_unused, index) =>
      task(`x${index}`, 'row-0', '2026-02-01', '2026-03-01'),
    );
    const { geometry } = layoutRows(items, ROWS, EPOCH, VIEW);
    expect(geometry.laneCounts[0]).toBe(10);
    expect(geometry.rowHeights[0]).toBe(rowBandUnitHeight(10));
  });

  it('rowIndexAtWorldY / rowBoundaryY follow the variable row heights', () => {
    const items = [
      task('a', 'row-0', '2026-01-01', '2026-01-20'),
      task('b', 'row-0', '2026-01-05', '2026-01-25'),
      task('c', 'row-0', '2026-01-10', '2026-01-30'),
      task('d', 'row-1', '2026-01-01', '2026-01-05'),
    ];
    const geometry = computeRowGeometry(items, ROWS, EPOCH, VIEW);
    const row0Height = geometry.rowHeights[0]!;
    // A y inside the tall row 0 resolves to row 0; just past its bottom -> row 1.
    expect(rowIndexAtWorldY(geometry, row0Height - 1, 1)).toBe(0);
    expect(rowIndexAtWorldY(geometry, row0Height + 1, 1)).toBe(1);
    // The boundary above row 1 equals the bottom of the (tall) row 0.
    expect(rowBoundaryY(geometry, 1, 1)).toBe(row0Height);
    expect(rowBoundaryY(geometry, 0, 1)).toBe(0);
    expect(rowBoundaryY(geometry, 2, 1)).toBe(geometry.totalHeight);
  });
});

describe('item 8: stacked bars are 90% of the lane height with a visible gap', () => {
  it('uses a 0.90 stacked-bar height ratio (widened from 0.95)', () => {
    // Canvas-objects batch item 3: the ratio dropped to 0.90 so a bar's own border
    // no longer makes adjacent stacked bars look cramped.
    expect(STACKED_BAR_HEIGHT_RATIO).toBe(0.9);
  });

  it('leaves a gap between two vertically adjacent stacked bars', () => {
    const items = [
      task('a', 'row-0', '2026-01-01', '2026-01-20'),
      task('b', 'row-0', '2026-01-05', '2026-01-25'),
    ];
    const { placements } = layoutRows(items, ROWS, EPOCH, VIEW);
    const lane0 = placements.find((p) => p.laneIndex === 0)!;
    const lane1 = placements.find((p) => p.laneIndex === 1)!;
    // Each bar is 90% of the lane height (10% gap).
    expect(lane0.worldHeight).toBeCloseTo(BASE_LANE_HEIGHT * STACKED_BAR_HEIGHT_RATIO, 6);
    // The bottom of lane 0's bar is ABOVE the top of lane 1's bar (a visible gap).
    const gap = lane1.worldY - (lane0.worldY + lane0.worldHeight);
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeCloseTo(BASE_LANE_HEIGHT * (1 - STACKED_BAR_HEIGHT_RATIO), 6);
  });
});

describe('item 1: Fit leaves a left margin (leftmost content not clipped)', () => {
  const canvasSize = { widthPx: 1200, heightPx: 800 };
  const leftPaneWidth = 200;
  const inputs: FitViewportInputs = {
    canvasSize,
    leftPaneWidth,
    topOffsetForZoomX: (zoomX) => rulerTierCount(zoomX) * 16,
  };

  it('places the leftmost RENDERED edge a margin inside the pane (screen x > 0)', () => {
    const marginPx = 24;
    const document = generateTemplateDocument();
    const rows = orderedVisibleRows(document.sections, document.rows);
    const fit = computeFitViewForItems(document.items, rows, document.epochDate, inputs, marginPx);
    expect(fit).not.toBeNull();
    if (fit === null) {
      return;
    }
    const measured = measureItemsFitExtent(document.items, rows, document.epochDate, fit.zoomX)!;
    // Schedule-local x of the leftmost rendered content (0 == the pane's right edge).
    const leftLocalX = measured.contentLeftPx - fit.scrollX;
    expect(leftLocalX).toBeGreaterThan(0);
    expect(leftLocalX).toBeCloseTo(marginPx, 3);
  });
});

describe('item 5: fill color overrides the saturation-derived plan/actual color', () => {
  // CR-002 Part 1: a plan-only item keeps its own stored fill (no actual to contrast);
  // an item with an actual is drawn with the PALE plan shade, and its actual side with
  // the VIVID shade; an EXPLICIT fill overrides both.
  it('keeps a plan-only item own stored fill (nothing to contrast against)', () => {
    expect(displayFillColor({ fillColor: '#123456' })).toBe('#123456');
    expect(displayFillColor({ fillColor: '#abcdef' })).toBe('#abcdef');
  });

  it('derives pale plan / vivid actual for an item that records an actual', () => {
    const withActual = { fillColor: '#2f80ed', actualStart: '2026-02-03' } as const;
    // Plan = pale derivation; actual = vivid derivation; the two differ.
    expect(displayFillColor(withActual)).toBe(planColorFrom('#2f80ed'));
    expect(actualDisplayFillColor(withActual)).toBe(actualColorFrom('#2f80ed'));
    expect(displayFillColor(withActual)).not.toBe(actualDisplayFillColor(withActual));
  });

  it('honors an explicit fill over the saturation-derived plan/actual shade', () => {
    const explicit = {
      fillColor: '#123456',
      fillColorExplicit: true,
      actualStart: '2026-02-03',
    } as const;
    // fillColorExplicit=true keeps the exact chosen color on BOTH sides.
    expect(displayFillColor(explicit)).toBe('#123456');
    expect(actualDisplayFillColor(explicit)).toBe('#123456');
  });

  it('an edit-property fill change is applied and is undoable', () => {
    const document = generateTemplateDocument();
    const planItem = document.items.find((item) => item.itemKind === 'task')!;
    const store = new ScheduleStore(document);
    store.dispatch(editPropertyCommand(planItem.id, { fillColor: '#ff0000', fillColorExplicit: true }));
    const edited = store.getDocument().items.find((item) => item.id === planItem.id)!;
    expect(edited.fillColor).toBe('#ff0000');
    expect(edited.fillColorExplicit).toBe(true);
    expect(displayFillColor(edited)).toBe('#ff0000');
    store.undo();
    const reverted = store.getDocument().items.find((item) => item.id === planItem.id)!;
    expect(reverted.fillColorExplicit ?? false).toBe(false);
    // With the explicit override gone, the plan side is the pale derivation for an
    // item with an actual, else the item's own stored fill.
    const expected =
      reverted.actualStart !== undefined ? planColorFrom(reverted.fillColor) : reverted.fillColor;
    expect(displayFillColor(reverted)).toBe(expected);
  });
});

describe('items 9-12: cursor-guide mode round-trips through the JSON codec', () => {
  for (const mode of ['none', 'crosshair', 'single-vertical', 'double-vertical'] as const) {
    it(`round-trips cursorGuideMode = ${mode}`, () => {
      const base = generateTemplateDocument();
      const document = {
        ...base,
        viewState: { ...base.viewState, cursorGuideMode: mode },
      };
      const restored = deserializeScheduleDocument(serializeScheduleDocument(document));
      expect(restored.viewState.cursorGuideMode).toBe(mode);
    });
  }
});

describe('item 2: sample/template items default to no border', () => {
  it('every template item has a transparent (no-border) stroke by default', () => {
    const document = generateTemplateDocument();
    for (const item of document.items) {
      expect(item.strokeColor, `item ${item.id} stroke`).toBe('transparent');
    }
  });
});
