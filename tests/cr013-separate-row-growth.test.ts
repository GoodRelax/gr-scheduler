/**
 * CR-013 coverage.
 *
 * Part 1 -- `separate` grows the ROW, never halves the BAR:
 *   - a row that really carries an actual bar is TALLER, and both its plan and actual
 *     bars keep the normal bar height;
 *   - a row without an actual-bearing item is untouched;
 *   - under `plan-only` / `actual-only` (a single bar survives) no extra height is
 *     reserved, and `overlap` is byte-for-byte unchanged (regression guard).
 *
 * Part 2 -- a newly added actual is grabbable:
 *   - an actual that records only `actualStart` ("started, not finished") maps to a
 *     zero-length span, so the renderer floors it at a SCREEN-space minimum width --
 *     the same px at every zoomX -- and the hit tester grabs exactly that rectangle.
 */

import { describe, expect, it } from 'vitest';
import type {
  IsoDate,
  PlanActualDisplay,
  Row,
  ScheduleDocument,
  ScheduleItem,
  ViewState,
} from '../src/domain/model/schedule-model.js';
import {
  BASE_LANE_HEIGHT,
  layoutRows,
  rowBandUnitHeight,
  separateActualLaneExtraUnitHeight,
  STACKED_BAR_HEIGHT_RATIO,
  type ItemPlacement,
} from '../src/domain/usecase/layout-engine.js';
import {
  MIN_ACTUAL_BAR_WIDTH_PX,
  separateActualBarOffsetPx,
  type PlanActualStyle,
} from '../src/domain/usecase/plan-actual-geometry.js';
import { defaultActualStartDate } from '../src/domain/usecase/progress-line-builder.js';
import { dateToWorldX } from '../src/domain/usecase/time-coordinate-mapper.js';
import { ItemLayer } from '../src/adapters/render/layers/item-layer.js';
import { HitTester } from '../src/adapters/render/hit-tester.js';
import type { ViewportWindow } from '../src/domain/usecase/viewport.js';
import { createGroup, installFakeSvgDocument, type FakeSvgNode } from './helpers/fake-svg-dom.js';
import { makeRenderContext, makeTask } from './helpers/make-render-context.js';

const EPOCH_DATE = '2026-01-01' as IsoDate;

const ROWS: readonly Row[] = [
  { id: 'row-actual', sectionId: 'section-0', classificationLabel: 'With actual', order: 0 },
  { id: 'row-plan', sectionId: 'section-0', classificationLabel: 'Plan only', order: 1 },
];

/** A task that records an actual span (draws a second, stacked bar under `separate`). */
const TASK_WITH_ACTUAL = makeTask('with-actual', {
  rowId: 'row-actual',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
  actualStart: '2026-01-03' as IsoDate,
  actualEnd: '2026-01-20' as IsoDate,
});

/** The same task with no recorded actual END: a zero-length actual span. */
const TASK_STARTED_NOT_FINISHED = makeTask('started', {
  rowId: 'row-actual',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
  actualStart: EPOCH_DATE,
});

/** A task on the SECOND row that records no actual at all. */
const TASK_WITHOUT_ACTUAL = makeTask('no-actual', {
  rowId: 'row-plan',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
});

function viewStateOf(
  style: PlanActualStyle,
  display: PlanActualDisplay,
  zoomY = 1,
  zoomX = 1,
): ViewState {
  return {
    zoomX,
    zoomY,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
    planActualStyle: style,
    planActualDisplay: display,
  };
}

function layoutOf(
  items: readonly ScheduleItem[],
  style: PlanActualStyle,
  display: PlanActualDisplay,
  zoomY = 1,
): ReturnType<typeof layoutRows> {
  return layoutRows(items, ROWS, EPOCH_DATE, viewStateOf(style, display, zoomY));
}

const ALL_ITEMS: readonly ScheduleItem[] = [TASK_WITH_ACTUAL, TASK_WITHOUT_ACTUAL];

describe('CR-013 Part 1: `separate` grows the row, not the bar', () => {
  it('makes the actual-bearing row TALLER while both bars keep the normal height', () => {
    const overlap = layoutOf(ALL_ITEMS, 'overlap', 'both');
    const separate = layoutOf(ALL_ITEMS, 'separate', 'both');

    const barHeight = BASE_LANE_HEIGHT * STACKED_BAR_HEIGHT_RATIO;
    // The BAR is not halved: it is the same height under both styles.
    for (const layout of [overlap, separate]) {
      for (const placement of layout.placements) {
        expect(placement.worldHeight).toBeCloseTo(barHeight, 6);
      }
    }
    // The ROW grows by exactly one stacked-lane allowance.
    expect(separate.geometry.rowHeights[0]).toBeGreaterThan(overlap.geometry.rowHeights[0] ?? 0);
    expect(separate.geometry.rowHeights[0]).toBeCloseTo(
      (overlap.geometry.rowHeights[0] ?? 0) + separateActualLaneExtraUnitHeight(),
      6,
    );
    expect(separate.geometry.rowHeights[0]).toBeCloseTo(rowBandUnitHeight(1, 1), 6);
    expect(separate.geometry.stacksActualBars).toEqual([true, false]);
  });

  it('leaves a row WITHOUT an actual-bearing item unchanged, but shifts it down', () => {
    const overlap = layoutOf(ALL_ITEMS, 'overlap', 'both');
    const separate = layoutOf(ALL_ITEMS, 'separate', 'both');

    expect(separate.geometry.rowHeights[1]).toBe(overlap.geometry.rowHeights[1]);
    // The taller row above pushes it down by exactly the growth.
    expect((separate.geometry.rowTops[1] ?? 0) - (overlap.geometry.rowTops[1] ?? 0)).toBeCloseTo(
      separateActualLaneExtraUnitHeight(),
      6,
    );
    // The plan-only row's own bar is placed exactly as before, relative to its band.
    const planOnlyRowItem = (layout: ReturnType<typeof layoutRows>): ItemPlacement =>
      layout.placements.find((placement) => placement.itemId === TASK_WITHOUT_ACTUAL.id)!;
    const overlapOffset =
      planOnlyRowItem(overlap).worldY - (overlap.geometry.rowTops[1] ?? 0);
    const separateOffset =
      planOnlyRowItem(separate).worldY - (separate.geometry.rowTops[1] ?? 0);
    expect(separateOffset).toBeCloseTo(overlapOffset, 6);
  });

  it('fits the stacked plan + actual bars inside the grown band', () => {
    const separate = layoutOf(ALL_ITEMS, 'separate', 'both');
    const placement = separate.placements.find(
      (candidate) => candidate.itemId === TASK_WITH_ACTUAL.id,
    )!;
    const actualBarBottom =
      placement.worldY +
      separateActualBarOffsetPx(placement.worldHeight) +
      placement.worldHeight;
    const bandBottom = (separate.geometry.rowTops[0] ?? 0) + (separate.geometry.rowHeights[0] ?? 0);
    expect(actualBarBottom).toBeLessThanOrEqual(bandBottom);
  });

  it('reserves NO extra height under plan-only / actual-only (only one bar is drawn)', () => {
    const overlap = layoutOf(ALL_ITEMS, 'overlap', 'both');
    for (const display of ['plan-only', 'actual-only', 'none'] as const) {
      const separate = layoutOf(ALL_ITEMS, 'separate', display);
      expect(separate.geometry.rowHeights, `display=${display}`).toEqual(
        overlap.geometry.rowHeights,
      );
      expect(separate.geometry.stacksActualBars, `display=${display}`).toEqual([false, false]);
    }
  });

  it('leaves the `overlap` layout completely unchanged (regression guard)', () => {
    const withStyle = layoutOf(ALL_ITEMS, 'overlap', 'both');
    const withoutStyle = layoutRows(ALL_ITEMS, ROWS, EPOCH_DATE, {
      zoomX: 1,
      zoomY: 1,
      scrollX: 0,
      scrollY: 0,
      fontScale: 'M',
    });
    expect(withStyle.placements).toEqual(withoutStyle.placements);
    expect(withStyle.geometry.rowHeights).toEqual([rowBandUnitHeight(1), rowBandUnitHeight(1)]);
    expect(withStyle.geometry.stacksActualBars).toEqual([false, false]);
  });

  it('scales the growth with zoomY', () => {
    const single = layoutOf(ALL_ITEMS, 'separate', 'both', 1);
    const doubled = layoutOf(ALL_ITEMS, 'separate', 'both', 2);
    expect(doubled.geometry.rowHeights[0]).toBeCloseTo((single.geometry.rowHeights[0] ?? 0) * 2, 6);
  });

  it('grows only the LANES that carry an actual, not every lane of the row', () => {
    // Two time-overlapping items on one row -> two sub-lanes, but only one of them
    // records an actual, so the band grows by exactly ONE stacked-lane allowance.
    const mixed: readonly ScheduleItem[] = [
      { ...TASK_WITH_ACTUAL, id: 'has-actual' },
      {
        ...TASK_WITHOUT_ACTUAL,
        id: 'no-actual-same-row',
        rowId: 'row-actual',
        startDate: '2026-01-05' as IsoDate,
      },
    ];
    const separate = layoutRows(mixed, ROWS, EPOCH_DATE, viewStateOf('separate', 'both'));
    const overlap = layoutRows(mixed, ROWS, EPOCH_DATE, viewStateOf('overlap', 'both'));
    expect(separate.geometry.laneCounts[0]).toBe(2);
    expect(separate.geometry.rowHeights[0]).toBeCloseTo(
      (overlap.geometry.rowHeights[0] ?? 0) + separateActualLaneExtraUnitHeight(),
      6,
    );
  });

  it('spaces stacked sub-lanes so an actual bar never lands on the lane below', () => {
    const overlapping: readonly ScheduleItem[] = [
      { ...TASK_WITH_ACTUAL, id: 'upper' },
      { ...TASK_WITH_ACTUAL, id: 'lower', startDate: '2026-01-05' as IsoDate },
    ];
    const separate = layoutOf(overlapping, 'separate', 'both');
    const byLane = [...separate.placements].sort((left, right) => left.worldY - right.worldY);
    expect(byLane).toHaveLength(2);
    const upper = byLane[0]!;
    const lower = byLane[1]!;
    const upperActualBottom =
      upper.worldY + separateActualBarOffsetPx(upper.worldHeight) + upper.worldHeight;
    expect(upperActualBottom).toBeLessThanOrEqual(lower.worldY);
    // ...and the two-lane band still contains the lower lane's own actual bar.
    const bandBottom = (separate.geometry.rowTops[0] ?? 0) + (separate.geometry.rowHeights[0] ?? 0);
    expect(
      lower.worldY + separateActualBarOffsetPx(lower.worldHeight) + lower.worldHeight,
    ).toBeLessThanOrEqual(bandBottom);
  });
});

const WIDE_WINDOW: ViewportWindow = {
  worldLeft: -10000,
  worldRight: 100000,
  worldTop: -10000,
  worldBottom: 100000,
};

function documentOf(items: readonly ScheduleItem[]): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'CR-013',
    epochDate: EPOCH_DATE,
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [...ROWS],
    items: [...items],
  };
}

/** Render one item through the REAL ItemLayer at a given zoom, against the fake DOM. */
function renderActualBarWidth(
  item: ScheduleItem,
  style: PlanActualStyle,
  display: PlanActualDisplay,
  zoomX: number,
): number | null {
  const install = installFakeSvgDocument();
  try {
    const viewState = viewStateOf(style, display, 1, zoomX);
    const placements = layoutRows([item], ROWS, EPOCH_DATE, viewState).placements;
    const content = createGroup() as unknown as SVGGElement;
    new ItemLayer(content).render(
      makeRenderContext({
        scheduleDocument: documentOf([item]),
        viewState,
        placements,
        itemById: new Map<string, ScheduleItem>([[item.id, item]]),
      }),
      WIDE_WINDOW,
    );
    const node = content as unknown as FakeSvgNode;
    const bar =
      node.querySelector('[data-role="actual-bar"]') ??
      node.querySelector('[data-plan-actual-side="actual"]');
    const width = bar?.getAttribute('width');
    return width === null || width === undefined ? null : Number(width);
  } finally {
    install.restore();
  }
}

describe('CR-013 Part 2: a zero-length actual keeps a screen-space minimum width', () => {
  const ZOOM_LEVELS = [0.25, 1, 4] as const;

  for (const style of ['overlap', 'separate'] as const) {
    it(`[${style}] renders the floor width at every zoomX (screen-space, not world)`, () => {
      for (const zoomX of ZOOM_LEVELS) {
        expect(
          renderActualBarWidth(TASK_STARTED_NOT_FINISHED, style, 'both', zoomX),
          `zoomX=${zoomX}`,
        ).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
      }
    });
  }

  it('[actual-only] the lone actual glyph also gets the floor at every zoomX', () => {
    for (const zoomX of ZOOM_LEVELS) {
      expect(
        renderActualBarWidth(TASK_STARTED_NOT_FINISHED, 'separate', 'actual-only', zoomX),
        `zoomX=${zoomX}`,
      ).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
    }
  });

  it('leaves a real (multi-day) actual span scaling with the zoom', () => {
    const atUnitZoom = renderActualBarWidth(TASK_WITH_ACTUAL, 'overlap', 'both', 1) ?? 0;
    const atDoubleZoom = renderActualBarWidth(TASK_WITH_ACTUAL, 'overlap', 'both', 2) ?? 0;
    expect(atUnitZoom).toBeGreaterThan(MIN_ACTUAL_BAR_WIDTH_PX);
    expect(atDoubleZoom).toBeCloseTo(atUnitZoom * 2, 6);
  });

  it('defaults a newly recorded actual start to the item PLANNED start date', () => {
    expect(defaultActualStartDate(TASK_WITHOUT_ACTUAL)).toBe(TASK_WITHOUT_ACTUAL.startDate);
    // An already recorded actual start is never overwritten.
    expect(defaultActualStartDate(TASK_WITH_ACTUAL)).toBe(TASK_WITH_ACTUAL.actualStart);
  });
});

describe('CR-013 Part 2: the floored actual bar is hit-testable', () => {
  const tester = new HitTester();

  function hitContextOf(
    item: ScheduleItem,
    style: PlanActualStyle,
    display: PlanActualDisplay,
    zoomX: number,
  ): { ctx: ReturnType<typeof makeRenderContext>; placement: ItemPlacement } {
    const viewState = viewStateOf(style, display, 1, zoomX);
    const placements = layoutRows([item], ROWS, EPOCH_DATE, viewState).placements;
    return {
      ctx: makeRenderContext({
        scheduleDocument: documentOf([item]),
        viewState,
        placements,
        itemById: new Map<string, ScheduleItem>([[item.id, item]]),
      }),
      placement: placements[0]!,
    };
  }

  for (const zoomX of [0.25, 1, 4] as const) {
    it(`[separate zoomX=${zoomX}] grabs the stacked actual bar below the plan bar`, () => {
      const { ctx, placement } = hitContextOf(
        TASK_STARTED_NOT_FINISHED,
        'separate',
        'both',
        zoomX,
      );
      const actualTop = placement.worldY + separateActualBarOffsetPx(placement.worldHeight);
      // The point is BELOW the plan bar, so only the actual bar can answer for it.
      expect(actualTop).toBeGreaterThan(placement.worldY + placement.worldHeight);
      const centerY = actualTop + placement.worldHeight / 2;
      // The actual starts on the plan start, so its left edge is the placement's.
      // The floored bar is exactly two edge zones wide, so its right half records the
      // actual END and its left half the actual START (review M-1); either way the hit
      // reports the ACTUAL side, which is what keeps the plan dates safe (H-1).
      const insideFloorRight = placement.worldX + MIN_ACTUAL_BAR_WIDTH_PX - 1;
      expect(tester.hitTest(ctx, insideFloorRight, centerY)).toEqual({
        itemId: TASK_STARTED_NOT_FINISHED.id,
        region: 'resize-end',
        side: 'actual',
      });
      expect(tester.hitTest(ctx, placement.worldX + 1, centerY)).toEqual({
        itemId: TASK_STARTED_NOT_FINISHED.id,
        region: 'resize-start',
        side: 'actual',
      });
      // Just past the floor there is nothing to grab (the floor is exactly the target).
      expect(tester.hitTest(ctx, placement.worldX + MIN_ACTUAL_BAR_WIDTH_PX + 2, centerY)).toBeNull();
    });
  }

  it('[actual-only] moves the grab target onto the actual extent', () => {
    const started = { ...TASK_STARTED_NOT_FINISHED, actualStart: '2026-01-20' as IsoDate };
    const { ctx, placement } = hitContextOf(started, 'separate', 'actual-only', 1);
    const centerY = placement.worldY + placement.worldHeight / 2;
    // The lone actual glyph sits well to the right of the plan start, and its grab
    // rectangle follows it rather than staying on the hidden plan span.
    const hit = tester.hitTest(ctx, placement.worldX + 2, centerY);
    expect(hit).toBeNull();
    const actualLeft =
      placement.worldX +
      dateToWorldX(started.actualStart!, EPOCH_DATE, 1) -
      dateToWorldX(started.startDate, EPOCH_DATE, 1);
    expect(
      tester.hitTest(ctx, actualLeft + MIN_ACTUAL_BAR_WIDTH_PX - 1, centerY),
    ).toEqual({ itemId: started.id, region: 'resize-end', side: 'actual' });
  });

  it('[overlap] keeps the plan bar edges resizable (regression guard)', () => {
    const { ctx, placement } = hitContextOf(TASK_WITH_ACTUAL, 'overlap', 'both', 1);
    const centerY = placement.worldY + placement.worldHeight / 2;
    expect(tester.hitTest(ctx, placement.worldX + 1, centerY)).toEqual({
      itemId: TASK_WITH_ACTUAL.id,
      region: 'resize-start',
      side: 'plan',
    });
    expect(
      tester.hitTest(ctx, placement.worldX + placement.worldWidth - 1, centerY),
    ).toEqual({ itemId: TASK_WITH_ACTUAL.id, region: 'resize-end', side: 'plan' });
  });
});
