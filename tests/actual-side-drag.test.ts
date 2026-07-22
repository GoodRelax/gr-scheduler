/**
 * Review H-1 / M-1 / M-2 coverage: dragging the ACTUAL (as-run) bar.
 *
 * H-1 (the defect being fixed): grabbing the actual bar used to start a PLAN move,
 * so the pointer silently rewrote `startDate` / `endDate` -- invisibly under
 * `actual-only`, where the plan glyph is not even drawn. Every gesture that STARTS on
 * the actual bar must therefore leave the planned dates byte-identical, at any zoom
 * and under both display filters that draw an actual.
 *
 * M-1 (the feature CR-013 Part 2 asked for): the actual is grabbable so the user can
 * RECORD real dates with it -- right edge writes `actualEnd` (turning a
 * "started, not finished" actual into a finished one), left edge writes `actualStart`,
 * body shifts the whole recorded span -- each as one undoable command.
 *
 * M-2 (hot-path reordering): the hit tester now rejects items by lane band and plan
 * rectangle BEFORE constructing any actual rectangle. A differential test pins that
 * the reordering is behaviour-preserving: for a dense grid of pointer positions the
 * real tester must agree with a naive reference that builds every rectangle for every
 * mounted item, exactly as the pre-M-2 code did.
 *
 * The editing controller is driven through a fake host + a mock renderer whose
 * hit-testing is the REAL {@link HitTester}, so press -> move -> release runs the same
 * gesture routing the app runs.
 */

import { describe, expect, it } from 'vitest';
import type {
  IsoDate,
  PlanActualDisplay,
  Row,
  ScheduleDocument,
  ScheduleItem,
  Section,
  ViewState,
} from '../src/domain/model/schedule-model.js';
import { EditingController } from '../src/adapters/input/editing-controller.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import { HitTester, type ItemHit } from '../src/adapters/render/hit-tester.js';
import { layoutRows, type ItemPlacement } from '../src/domain/usecase/layout-engine.js';
import {
  actualSideLaneRect,
  computeItemDisplayedBars,
  drawsActualBar,
  isActualSideShown,
  isPlanSideShown,
  type ItemLaneRect,
} from '../src/domain/usecase/plan-actual-display.js';
import {
  resolvePlanActualStyle,
  separateActualBarOffsetPx,
  type PlanActualStyle,
} from '../src/domain/usecase/plan-actual-geometry.js';
import { pickItemHit, type HitCandidate } from '../src/domain/usecase/edge-hit.js';
import { dateToWorldX, pixelsPerDay } from '../src/domain/usecase/time-coordinate-mapper.js';
import type { RenderContext } from '../src/adapters/render/render-context.js';
import type { SvgRenderer } from '../src/adapters/render/svg-renderer.js';
import { makeRenderContext, makeTask } from './helpers/make-render-context.js';

const EPOCH_DATE = '2026-01-01' as IsoDate;

const SECTIONS: readonly Section[] = [
  { id: 'section-0', name: 'Section', order: 0, rowIds: ['row-0'] },
];
const ROWS: readonly Row[] = [
  { id: 'row-0', sectionId: 'section-0', classificationLabel: 'Row', order: 0 },
];

/** A task with a fully recorded actual span (a wide, body-grabbable actual bar). */
const TASK_WITH_ACTUAL: ScheduleItem = makeTask('with-actual', {
  rowId: 'row-0',
  abbrev: '',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
  actualStart: '2026-01-03' as IsoDate,
  actualEnd: '2026-01-20' as IsoDate,
});

/** The same task with NO recorded actual end: the CR-013 "started, not finished" case. */
const TASK_STARTED_NOT_FINISHED: ScheduleItem = makeTask('started', {
  rowId: 'row-0',
  abbrev: '',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
  actualStart: '2026-01-03' as IsoDate,
});

function viewStateOf(style: PlanActualStyle, display: PlanActualDisplay, zoomX = 1): ViewState {
  return {
    zoomX,
    zoomY: 1,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
    planActualStyle: style,
    planActualDisplay: display,
  };
}

function documentOf(items: readonly ScheduleItem[], viewState: ViewState): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'actual-side drag',
    epochDate: EPOCH_DATE,
    viewState,
    sections: [...SECTIONS],
    rows: [...ROWS],
    items: [...items],
  };
}

/** A fake render host that records the capture-phase listeners `attach()` registers. */
class FakeHost {
  public readonly listeners = new Map<string, Array<(event: unknown) => void>>();
  public readonly style: Record<string, string> = {};
  public addEventListener(type: string, handler: (event: unknown) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }
  public removeEventListener(): void {
    /* not needed for the test */
  }
  public setPointerCapture(): void {
    /* pointer capture is a no-op in the fake host */
  }
  /** Fire every listener registered for a pointer event type. */
  public firePointer(type: string, clientX: number, clientY: number, buttons: number): void {
    const handlers = this.listeners.get(type) ?? [];
    if (handlers.length === 0) {
      throw new Error(`no ${type} listener registered`);
    }
    for (const handler of handlers) {
      handler({
        button: 0,
        buttons,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        target: null,
        pointerId: 1,
        type,
        clientX,
        clientY,
        stopPropagation: () => undefined,
        preventDefault: () => undefined,
      });
    }
  }
}

interface DragHarness {
  readonly store: ScheduleStore;
  readonly host: FakeHost;
  readonly controller: EditingController;
  readonly placement: ItemPlacement;
  readonly context: RenderContext;
  readonly viewState: ViewState;
  /** Press at (fromX, y), move to (toX, y), release. World px == client px here. */
  drag(fromX: number, toX: number, y: number): void;
  /** What the REAL hit tester answers at a world point (== client point here). */
  hitAt(worldX: number, worldY: number): ItemHit | null;
}

/**
 * Build a controller over ONE item, wired to the real hit tester and a real store.
 * `screenToWorld` is the identity (the render context uses no pane offsets/scroll),
 * so a test can address the drawn geometry directly in world pixels.
 */
function makeDragHarness(
  item: ScheduleItem,
  style: PlanActualStyle,
  display: PlanActualDisplay,
  zoomX = 1,
): DragHarness {
  const viewState = viewStateOf(style, display, zoomX);
  const scheduleDocument = documentOf([item], viewState);
  const placements = layoutRows([item], ROWS, EPOCH_DATE, viewState).placements;
  const placement = placements[0]!;
  const context = makeRenderContext({
    scheduleDocument,
    viewState,
    placements,
    itemById: new Map<string, ScheduleItem>([[item.id, item]]),
  });
  const store = new ScheduleStore(scheduleDocument);
  const host = new FakeHost();
  const tester = new HitTester();
  const renderer = {
    getHostElement: () => host,
    getViewState: () => viewState,
    screenToWorld: (screenX: number, screenY: number) => ({ worldX: screenX, worldY: screenY }),
    hitTest: (clientX: number, clientY: number) => tester.hitTest(context, clientX, clientY),
    hitTestAnnotation: () => null,
    hitTestDependency: () => null,
    rowIndexAtWorldY: () => 0,
    updateItems: () => undefined,
    setSelection: () => undefined,
    setSelectedAnnotation: () => undefined,
    setSelectedDependency: () => undefined,
    showAlignmentGuide: () => undefined,
    showCreatePreview: () => undefined,
    showDependencyPreview: () => undefined,
    showMarquee: () => undefined,
  } as unknown as SvgRenderer;
  const controller = new EditingController(renderer, store);
  controller.attach();
  return {
    store,
    host,
    controller,
    placement,
    context,
    viewState,
    drag: (fromX, toX, y) => {
      host.firePointer('pointerdown', fromX, y, 1);
      host.firePointer('pointermove', toX, y, 1);
      host.firePointer('pointerup', toX, y, 0);
    },
    hitAt: (worldX, worldY) => tester.hitTest(context, worldX, worldY),
  };
}

/** The single item of a harness document, after whatever the drag committed. */
function itemOf(store: ScheduleStore): ScheduleItem {
  return store.getDocument().items[0]!;
}

/** World-space rectangle of the ACTUAL bar as the renderer draws it. */
function actualRectOf(
  item: ScheduleItem,
  placement: ItemPlacement,
  style: PlanActualStyle,
  display: PlanActualDisplay,
  zoomX: number,
): ItemLaneRect {
  if (!isPlanSideShown(display)) {
    return actualSideLaneRect(item, placement, EPOCH_DATE, zoomX)!;
  }
  const bars = computeItemDisplayedBars(item, placement, EPOCH_DATE, zoomX, style, display);
  const actual = bars.actual!;
  return {
    worldX: actual.x,
    worldY: actual.y,
    worldWidth: actual.width,
    worldHeight: actual.height,
  };
}

describe('review H-1: a grab that starts on the ACTUAL bar never moves the plan', () => {
  const CASES = [
    { style: 'separate', display: 'both' },
    { style: 'overlap', display: 'actual-only' },
  ] as const;

  for (const { style, display } of CASES) {
    for (const zoomX of [0.5, 1, 4] as const) {
      it(`[${style}/${display} zoomX=${zoomX}] leaves startDate/endDate byte-identical`, () => {
        const harness = makeDragHarness(TASK_WITH_ACTUAL, style, display, zoomX);
        const rect = actualRectOf(TASK_WITH_ACTUAL, harness.placement, style, display, zoomX);
        const centerY = rect.worldY + rect.worldHeight / 2;
        const grabPoints = [
          rect.worldX + 1, // left edge
          rect.worldX + rect.worldWidth / 2, // body
          rect.worldX + rect.worldWidth - 1, // right edge
        ];
        for (const grabX of grabPoints) {
          const before = itemOf(harness.store);
          // Every grab must land on the ACTUAL side to begin with (else the assertion
          // below would pass vacuously by never touching the actual bar at all).
          expect(harness.hitAt(grabX, centerY)?.side, `grab=${grabX}`).toBe('actual');
          harness.drag(grabX, grabX + 40, centerY);
          const after = itemOf(harness.store);
          expect(after.startDate, `grab=${grabX}`).toBe(before.startDate);
          expect(after.endDate, `grab=${grabX}`).toBe(before.endDate);
          expect(after.rowId, `grab=${grabX}`).toBe(before.rowId);
        }
        // ...and the drags were not inert: the ACTUAL dates did move.
        const finalItem = itemOf(harness.store);
        expect(finalItem.actualStart).not.toBe(TASK_WITH_ACTUAL.actualStart);
        expect(finalItem.actualEnd).not.toBe(TASK_WITH_ACTUAL.actualEnd);
      });
    }
  }

  it('[actual-only] a grab on the lone actual glyph reports the actual side', () => {
    const harness = makeDragHarness(TASK_WITH_ACTUAL, 'overlap', 'actual-only', 1);
    const rect = actualRectOf(TASK_WITH_ACTUAL, harness.placement, 'overlap', 'actual-only', 1);
    const tester = new HitTester();
    const hit = tester.hitTest(
      harness.context,
      rect.worldX + rect.worldWidth / 2,
      rect.worldY + rect.worldHeight / 2,
    );
    expect(hit).toEqual({ itemId: TASK_WITH_ACTUAL.id, region: 'body', side: 'actual' });
  });

  it('[separate] a multi-selection does NOT bulk-shift plan dates from an actual grab', () => {
    const harness = makeDragHarness(TASK_WITH_ACTUAL, 'separate', 'both', 1);
    // A >1 selection normally begins a multi-item PLAN shift on a body grab (CR-007
    // Part 2). An actual grab must be routed to the actual span before that branch.
    harness.controller.setSelection(new Set([TASK_WITH_ACTUAL.id, 'other-selected-item']));
    const rect = actualRectOf(TASK_WITH_ACTUAL, harness.placement, 'separate', 'both', 1);
    const before = itemOf(harness.store);
    harness.drag(
      rect.worldX + rect.worldWidth / 2,
      rect.worldX + rect.worldWidth / 2 + 30,
      rect.worldY + rect.worldHeight / 2,
    );
    const after = itemOf(harness.store);
    expect(after.startDate).toBe(before.startDate);
    expect(after.endDate).toBe(before.endDate);
    expect(after.actualStart).not.toBe(before.actualStart);
  });
});

describe('review M-1: the actual-side drag records actual dates (CR-013 Part 2 AC)', () => {
  const PX_PER_DAY = pixelsPerDay(1);

  it('right-edge drag turns an absent actualEnd into a real date, and nothing else', () => {
    const harness = makeDragHarness(TASK_STARTED_NOT_FINISHED, 'separate', 'both', 1);
    const rect = actualRectOf(TASK_STARTED_NOT_FINISHED, harness.placement, 'separate', 'both', 1);
    const centerY = rect.worldY + rect.worldHeight / 2;
    expect(TASK_STARTED_NOT_FINISHED.actualEnd).toBeUndefined();

    harness.drag(rect.worldX + rect.worldWidth - 1, rect.worldX + rect.worldWidth - 1 + 5 * PX_PER_DAY, centerY);

    const after = itemOf(harness.store);
    expect(after.actualEnd).toBe('2026-01-08'); // actualStart 2026-01-03 + 5 days
    expect(after.actualStart).toBe(TASK_STARTED_NOT_FINISHED.actualStart);
    expect(after.startDate).toBe(TASK_STARTED_NOT_FINISHED.startDate);
    expect(after.endDate).toBe(TASK_STARTED_NOT_FINISHED.endDate);

    harness.store.undo();
    expect(itemOf(harness.store).actualEnd).toBeUndefined();
    harness.store.redo();
    expect(itemOf(harness.store).actualEnd).toBe('2026-01-08');
  });

  it('left-edge drag writes actualStart only', () => {
    const harness = makeDragHarness(TASK_WITH_ACTUAL, 'separate', 'both', 1);
    const rect = actualRectOf(TASK_WITH_ACTUAL, harness.placement, 'separate', 'both', 1);
    const centerY = rect.worldY + rect.worldHeight / 2;

    harness.drag(rect.worldX + 1, rect.worldX + 1 + 2 * PX_PER_DAY, centerY);

    const after = itemOf(harness.store);
    expect(after.actualStart).toBe('2026-01-05'); // 2026-01-03 + 2 days
    expect(after.actualEnd).toBe(TASK_WITH_ACTUAL.actualEnd);
    expect(after.startDate).toBe(TASK_WITH_ACTUAL.startDate);
    expect(after.endDate).toBe(TASK_WITH_ACTUAL.endDate);

    harness.store.undo();
    expect(itemOf(harness.store).actualStart).toBe(TASK_WITH_ACTUAL.actualStart);
    harness.store.redo();
    expect(itemOf(harness.store).actualStart).toBe('2026-01-05');
  });

  it('body drag shifts BOTH actual dates and leaves the plan dates untouched', () => {
    const harness = makeDragHarness(TASK_WITH_ACTUAL, 'separate', 'both', 1);
    const rect = actualRectOf(TASK_WITH_ACTUAL, harness.placement, 'separate', 'both', 1);
    const centerY = rect.worldY + rect.worldHeight / 2;
    const grabX = rect.worldX + rect.worldWidth / 2;

    harness.drag(grabX, grabX + 3 * PX_PER_DAY, centerY);

    const after = itemOf(harness.store);
    expect(after.actualStart).toBe('2026-01-06'); // 2026-01-03 + 3 days
    expect(after.actualEnd).toBe('2026-01-23'); // 2026-01-20 + 3 days
    expect(after.startDate).toBe(TASK_WITH_ACTUAL.startDate);
    expect(after.endDate).toBe(TASK_WITH_ACTUAL.endDate);

    harness.store.undo();
    expect(itemOf(harness.store).actualStart).toBe(TASK_WITH_ACTUAL.actualStart);
    expect(itemOf(harness.store).actualEnd).toBe(TASK_WITH_ACTUAL.actualEnd);
    harness.store.redo();
    expect(itemOf(harness.store).actualStart).toBe('2026-01-06');
    expect(itemOf(harness.store).actualEnd).toBe('2026-01-23');
  });

  it('[actual-only] the same three gestures work on the lone actual glyph', () => {
    const harness = makeDragHarness(TASK_WITH_ACTUAL, 'overlap', 'actual-only', 1);
    const rect = actualRectOf(TASK_WITH_ACTUAL, harness.placement, 'overlap', 'actual-only', 1);
    const centerY = rect.worldY + rect.worldHeight / 2;
    const grabX = rect.worldX + rect.worldWidth / 2;

    harness.drag(grabX, grabX + 4 * PX_PER_DAY, centerY);

    const after = itemOf(harness.store);
    expect(after.actualStart).toBe('2026-01-07');
    expect(after.actualEnd).toBe('2026-01-24');
    expect(after.startDate).toBe(TASK_WITH_ACTUAL.startDate);
    expect(after.endDate).toBe(TASK_WITH_ACTUAL.endDate);
  });

  it('keeps a MILESTONE actual a point: its marker is not a resize target', () => {
    const milestone = makeTask('ms', {
      rowId: 'row-0',
      abbrev: '',
      itemKind: 'milestone',
      startDate: '2026-01-10' as IsoDate,
      endDate: null,
      actualStart: '2026-01-14' as IsoDate,
      actualEnd: null,
    });
    const harness = makeDragHarness(milestone, 'overlap', 'actual-only', 1);
    const rect = actualSideLaneRect(milestone, harness.placement, EPOCH_DATE, 1)!;
    const centerY = rect.worldY + rect.worldHeight / 2;
    const tester = new HitTester();
    // Every point of the actual marker is a BODY hit: a point has no resizable edge.
    for (const offset of [1, rect.worldWidth / 2, rect.worldWidth - 1]) {
      expect(tester.hitTest(harness.context, rect.worldX + offset, centerY)).toEqual({
        itemId: milestone.id,
        region: 'body',
        side: 'actual',
      });
    }
    harness.drag(rect.worldX + 1, rect.worldX + 1 + 2 * PX_PER_DAY, centerY);
    const after = itemOf(harness.store);
    expect(after.actualStart).toBe('2026-01-16');
    expect(after.actualEnd).toBeNull();
    expect(after.startDate).toBe(milestone.startDate);
    expect(after.endDate).toBeNull();
  });
});

describe('plan-side regression: the plan bar still moves and resizes exactly as before', () => {
  const PX_PER_DAY = pixelsPerDay(1);

  it('body drag on the PLAN bar shifts startDate and endDate together', () => {
    const harness = makeDragHarness(TASK_WITH_ACTUAL, 'separate', 'both', 1);
    const centerY = harness.placement.worldY + harness.placement.worldHeight / 2;
    const grabX = harness.placement.worldX + harness.placement.worldWidth / 2;

    harness.drag(grabX, grabX + 7 * PX_PER_DAY, centerY);

    const after = itemOf(harness.store);
    expect(after.startDate).toBe('2026-01-08'); // 2026-01-01 + 7
    expect(after.endDate).toBe('2026-02-08'); // 2026-02-01 + 7
    // A plan move never touches the recorded actual (unchanged behaviour).
    expect(after.actualStart).toBe(TASK_WITH_ACTUAL.actualStart);
    expect(after.actualEnd).toBe(TASK_WITH_ACTUAL.actualEnd);
  });

  it('edge drag on the PLAN bar resizes only the dragged end', () => {
    const harness = makeDragHarness(TASK_WITH_ACTUAL, 'separate', 'both', 1);
    const centerY = harness.placement.worldY + harness.placement.worldHeight / 2;
    const rightEdgeX = harness.placement.worldX + harness.placement.worldWidth - 1;

    harness.drag(rightEdgeX, rightEdgeX + 6 * PX_PER_DAY, centerY);

    const after = itemOf(harness.store);
    expect(after.startDate).toBe(TASK_WITH_ACTUAL.startDate);
    expect(after.endDate).toBe('2026-02-07'); // 2026-02-01 + 6
    expect(after.actualStart).toBe(TASK_WITH_ACTUAL.actualStart);
    expect(after.actualEnd).toBe(TASK_WITH_ACTUAL.actualEnd);
  });
});

// ----- M-2: the hot-path reordering is behaviour-preserving ---------------------

/** Screen-px edge zone the hit tester uses (mirrors its private RESIZE_HANDLE_PX). */
const HANDLE_PX = 9;

/**
 * The grab rectangles of an item, built the way the PRE-M-2 hit tester built them:
 * unconditionally, for every mounted item, with no cheap rejection in front. The
 * reference the reordered implementation is diffed against.
 */
function referenceGrabRects(
  item: ScheduleItem | undefined,
  placement: ItemPlacement,
  epochDate: IsoDate | undefined,
  viewState: ViewState,
): readonly (ItemLaneRect & { readonly isPlanSide: boolean })[] {
  const planRect = { ...placement, isPlanSide: true };
  if (item === undefined || epochDate === undefined) {
    return [planRect];
  }
  const display = viewState.planActualDisplay;
  const planShown = isPlanSideShown(display);
  const actualShown = isActualSideShown(display);
  if (!planShown && actualShown) {
    const lone = actualSideLaneRect(item, placement, epochDate, viewState.zoomX);
    return lone === null ? [planRect] : [{ ...lone, isPlanSide: false }];
  }
  if (!planShown || !actualShown || !drawsActualBar(item)) {
    return [planRect];
  }
  const bars = computeItemDisplayedBars(
    item,
    placement,
    epochDate,
    viewState.zoomX,
    resolvePlanActualStyle(viewState.planActualStyle),
    display,
  );
  if (bars.actual === null) {
    return [planRect];
  }
  return [
    planRect,
    {
      worldX: bars.actual.x,
      worldY: bars.actual.y,
      worldWidth: bars.actual.width,
      worldHeight: bars.actual.height,
      isPlanSide: false,
    },
  ];
}

/** The pre-M-2 candidate collection: every rectangle of every mounted item, then pick. */
function referenceHitTest(ctx: RenderContext, worldX: number, worldY: number): ItemHit | null {
  const candidates: HitCandidate[] = [];
  for (const placement of ctx.placements) {
    if (!ctx.hasMountedItem(placement.itemId)) {
      continue;
    }
    const item = ctx.itemById.get(placement.itemId);
    for (const grab of referenceGrabRects(
      item,
      placement,
      ctx.scheduleDocument?.epochDate,
      ctx.viewState,
    )) {
      const withinX = worldX >= grab.worldX && worldX <= grab.worldX + grab.worldWidth;
      const withinY = worldY >= grab.worldY && worldY <= grab.worldY + grab.worldHeight;
      if (!withinX || !withinY) {
        continue;
      }
      candidates.push({
        itemId: placement.itemId,
        laneIndex: placement.laneIndex,
        worldLeft: grab.worldX,
        worldWidth: grab.worldWidth,
        isTask: item?.itemKind === 'task',
        isSelected: ctx.selectedItemIds.has(placement.itemId),
        side: grab.isPlanSide ? 'plan' : 'actual',
      });
    }
  }
  const hit = pickItemHit(candidates, worldX, HANDLE_PX);
  if (hit === null) {
    return null;
  }
  return hit.side === 'actual'
    ? { side: 'actual', itemId: hit.itemId, region: hit.region }
    : { side: 'plan', itemId: hit.itemId, region: hit.region };
}

describe('review M-2: the cheap-rejection reordering keeps the same hit winner', () => {
  const tester = new HitTester();

  /** A representative population: plan-only, finished actual, unfinished actual, milestone. */
  const POPULATION: readonly ScheduleItem[] = [
    makeTask('plain', { rowId: 'row-0', abbrev: '', startDate: EPOCH_DATE, endDate: '2026-01-12' as IsoDate }),
    { ...TASK_WITH_ACTUAL, id: 'finished', startDate: '2026-01-06' as IsoDate },
    { ...TASK_STARTED_NOT_FINISHED, id: 'running', startDate: '2026-01-14' as IsoDate },
    makeTask('point', {
      rowId: 'row-0',
      abbrev: '',
      itemKind: 'milestone',
      startDate: '2026-01-22' as IsoDate,
      endDate: null,
      actualStart: '2026-01-25' as IsoDate,
      actualEnd: null,
    }),
  ];

  const STYLES: readonly PlanActualStyle[] = ['overlap', 'separate'];
  const DISPLAYS: readonly PlanActualDisplay[] = ['both', 'plan-only', 'actual-only', 'none'];

  for (const style of STYLES) {
    for (const display of DISPLAYS) {
      for (const zoomX of [0.5, 2] as const) {
        it(`[${style}/${display} zoomX=${zoomX}] agrees with the naive reference everywhere`, () => {
          const viewState = viewStateOf(style, display, zoomX);
          const placements = layoutRows(POPULATION, ROWS, EPOCH_DATE, viewState).placements;
          const ctx = makeRenderContext({
            scheduleDocument: documentOf(POPULATION, viewState),
            viewState,
            placements,
            itemById: new Map(POPULATION.map((item) => [item.id, item])),
          });
          const laneHeight = placements[0]!.worldHeight;
          const bandBottom =
            Math.max(...placements.map((placement) => placement.worldY + placement.worldHeight)) +
            separateActualBarOffsetPx(laneHeight) +
            laneHeight;
          const worldRight = dateToWorldX('2026-02-05' as IsoDate, EPOCH_DATE, zoomX);
          let agreements = 0;
          let nonNullHits = 0;
          for (let worldY = -6; worldY <= bandBottom + 6; worldY += 2) {
            for (let worldX = -6; worldX <= worldRight; worldX += 3) {
              const actual = tester.hitTest(ctx, worldX, worldY);
              const expected = referenceHitTest(ctx, worldX, worldY);
              expect(actual, `x=${worldX} y=${worldY}`).toEqual(expected);
              agreements += 1;
              if (expected !== null) {
                nonNullHits += 1;
              }
            }
          }
          // Guard against a vacuous sweep: the grid really did land on items.
          expect(agreements).toBeGreaterThan(500);
          if (display !== 'none') {
            expect(nonNullHits).toBeGreaterThan(50);
          }
        });
      }
    }
  }
});
