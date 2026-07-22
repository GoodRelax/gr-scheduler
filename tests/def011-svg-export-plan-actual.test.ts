/**
 * DEF-011 coverage: the SVG export follows the SAME plan/actual rules as the screen
 * (PLAN-L1-005 revised by CR-013, PLAN-L1-002 / DEF-008, ARCH-C-022).
 *
 * Before the fix the exporter shared the row GEOMETRY with the screen -- so a
 * `separate` row grew by the actual-bar allowance -- but never drew an actual bar,
 * leaving that space empty and the actual missing. These tests pin:
 *
 * - an actual bar is exported under `overlap` (over the plan extent) and under
 *   `separate` (stacked below the plan, inside the grown band);
 * - `plan-only` exports no actual side; `actual-only` exports the actual side only;
 * - a row with no actual-bearing item exports byte-for-byte as before (regression);
 * - the abbreviation text paints AFTER (above) every bar in document order (DEF-009);
 * - the exported rectangles equal the rectangles the real {@link ItemLayer} mounts,
 *   which is what keeps the two paths from drifting apart again.
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
  EXPORT_MARGIN,
  exportScheduleSvg,
} from '../src/domain/usecase/svg-exporter.js';
import { computeRowGeometry, layoutRows } from '../src/domain/usecase/layout-engine.js';
import {
  MIN_ACTUAL_BAR_WIDTH_PX,
  separateActualBarOffsetPx,
  type PlanActualStyle,
} from '../src/domain/usecase/plan-actual-geometry.js';
import {
  actualDisplayFillColor,
  displayFillColor,
} from '../src/domain/usecase/plan-actual-colors.js';
import {
  ACTUAL_STROKE_WIDTH_PX,
  PLAN_STROKE_WIDTH_PX,
} from '../src/domain/usecase/a11y-tokens.js';
import { ItemLayer } from '../src/adapters/render/layers/item-layer.js';
import type { ViewportWindow } from '../src/domain/usecase/viewport.js';
import { createGroup, installFakeSvgDocument, type FakeSvgNode } from './helpers/fake-svg-dom.js';
import { makeRenderContext, makeTask } from './helpers/make-render-context.js';

const EPOCH_DATE = '2026-01-01' as IsoDate;

const ROWS: readonly Row[] = [
  { id: 'row-actual', sectionId: 'sec-1', classificationLabel: 'With actual', order: 0 },
  { id: 'row-plan', sectionId: 'sec-1', classificationLabel: 'Plan only', order: 1 },
];

/** A task that records a full actual span: it draws a SECOND, vivid actual bar. */
const TASK_WITH_ACTUAL = makeTask('with-actual', {
  rowId: 'row-actual',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
  actualStart: '2026-01-03' as IsoDate,
  actualEnd: '2026-01-20' as IsoDate,
});

/** "Started, not finished": a zero-length actual span that takes the width floor. */
const TASK_STARTED_NOT_FINISHED = makeTask('started', {
  rowId: 'row-actual',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
  actualStart: EPOCH_DATE,
});

/** A task on the second row that records no actual at all. */
const TASK_WITHOUT_ACTUAL = makeTask('no-actual', {
  rowId: 'row-plan',
  startDate: EPOCH_DATE,
  endDate: '2026-02-01' as IsoDate,
});

/** A milestone that records an actual point (CR-002 Part 2: two markers, no span). */
const MILESTONE_WITH_ACTUAL: ScheduleItem = {
  id: 'ms-actual',
  rowId: 'row-actual',
  itemKind: 'milestone',
  startDate: EPOCH_DATE,
  endDate: null,
  abbrev: 'MS',
  importance: 1,
  milestoneShape: 'diamond',
  fillColor: '#4477aa',
  strokeColor: '#28527a',
  actualStart: '2026-01-10' as IsoDate,
};

function viewStateOf(
  style: PlanActualStyle,
  display: PlanActualDisplay,
  zoomX = 1,
): ViewState {
  return {
    zoomX,
    zoomY: 1,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
    leftPaneWidth: 200,
    planActualStyle: style,
    planActualDisplay: display,
  };
}

function documentOf(
  items: readonly ScheduleItem[],
  style: PlanActualStyle,
  display: PlanActualDisplay,
  zoomX = 1,
): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'DEF-011',
    epochDate: EPOCH_DATE,
    viewState: viewStateOf(style, display, zoomX),
    sections: [{ id: 'sec-1', name: 'Body', order: 0, rowIds: ['row-actual', 'row-plan'] }],
    rows: [...ROWS],
    items: [...items],
  };
}

/** One rectangle (or polygon) parsed back out of the exported SVG. */
interface ExportedShape {
  readonly tagName: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly planActualSide: string | null;
  readonly role: string | null;
}

/** The exported markup of ONE item group (up to its closing tag). */
function itemGroupMarkup(svg: string, itemId: string): string {
  const start = svg.indexOf(`<g data-item-id="${itemId}">`);
  expect(start, `item group ${itemId} present`).toBeGreaterThanOrEqual(0);
  const end = svg.indexOf('</g>', start);
  expect(end, `item group ${itemId} closed`).toBeGreaterThan(start);
  return svg.slice(start, end);
}

function attributesOf(markup: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of markup.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)) {
    attributes.set(match[1] as string, match[2] as string);
  }
  return attributes;
}

/** Every `<rect>` of one exported item group, in document (paint) order. */
function exportedRects(svg: string, itemId: string): ExportedShape[] {
  const group = itemGroupMarkup(svg, itemId);
  const shapes: ExportedShape[] = [];
  for (const match of group.matchAll(/<rect ([^>]*)\/>/g)) {
    const attributes = attributesOf(match[1] as string);
    shapes.push({
      tagName: 'rect',
      x: Number(attributes.get('x')),
      y: Number(attributes.get('y')),
      width: Number(attributes.get('width')),
      height: Number(attributes.get('height')),
      fill: attributes.get('fill') ?? '',
      stroke: attributes.get('stroke') ?? '',
      strokeWidth: Number(attributes.get('stroke-width')),
      planActualSide: attributes.get('data-plan-actual-side') ?? null,
      role: attributes.get('data-role') ?? null,
    });
  }
  return shapes;
}

/** Export with the left label column OFF, so the content origin is just the margin. */
function exportOf(document_: ScheduleDocument): string {
  return exportScheduleSvg(document_, { includeLeftLabels: false });
}

const CONTENT_ORIGIN = EXPORT_MARGIN;

const WIDE_WINDOW: ViewportWindow = {
  worldLeft: -100000,
  worldRight: 100000,
  worldTop: -100000,
  worldBottom: 100000,
};

/** A rectangle in WORLD space, the frame both the screen and the export agree on. */
interface WorldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The primary glyph + optional actual bar the REAL {@link ItemLayer} mounts. */
function screenRects(
  scheduleDocument: ScheduleDocument,
  itemId: string,
): { primary: WorldRect | null; actual: WorldRect | null } {
  const install = installFakeSvgDocument();
  try {
    const placements = layoutRows(
      scheduleDocument.items,
      scheduleDocument.rows,
      scheduleDocument.epochDate,
      scheduleDocument.viewState,
    ).placements;
    const content = createGroup() as unknown as SVGGElement;
    new ItemLayer(content).render(
      makeRenderContext({
        scheduleDocument,
        viewState: scheduleDocument.viewState,
        placements,
        itemById: new Map(scheduleDocument.items.map((item) => [item.id, item])),
      }),
      WIDE_WINDOW,
    );
    const node = content as unknown as FakeSvgNode;
    const group = node.querySelector(`[data-item-id="${itemId}"]`);
    if (group === null) {
      return { primary: null, actual: null };
    }
    const readRect = (element: FakeSvgNode | null): WorldRect | null =>
      element === null
        ? null
        : {
            x: Number(element.getAttribute('x')),
            y: Number(element.getAttribute('y')),
            width: Number(element.getAttribute('width')),
            height: Number(element.getAttribute('height')),
          };
    const bars = group
      .querySelectorAll('rect')
      .filter((element) => element.getAttribute('data-role') === null);
    return {
      primary: readRect(bars[0] ?? null),
      actual: readRect(group.querySelector('[data-role="actual-bar"]')),
    };
  } finally {
    install.restore();
  }
}

/** The exported rectangles of one item, translated back into world space. */
function exportedWorldRects(
  scheduleDocument: ScheduleDocument,
  itemId: string,
): { primary: WorldRect | null; actual: WorldRect | null } {
  const svg = exportOf(scheduleDocument);
  if (!svg.includes(`<g data-item-id="${itemId}">`)) {
    return { primary: null, actual: null };
  }
  const rects = exportedRects(svg, itemId);
  const toWorld = (shape: ExportedShape | undefined): WorldRect | null =>
    shape === undefined
      ? null
      : {
          x: shape.x - CONTENT_ORIGIN,
          y: shape.y - CONTENT_ORIGIN,
          width: shape.width,
          height: shape.height,
        };
  return {
    primary: toWorld(rects.find((shape) => shape.role !== 'actual-bar')),
    actual: toWorld(rects.find((shape) => shape.role === 'actual-bar')),
  };
}

/**
 * Assert two world rectangles are the same. Translating the exported coordinates back
 * through the margin re-introduces float noise, so the fields are compared with a
 * tolerance rather than by identity.
 */
function expectSameRect(
  exported: WorldRect | null,
  onScreen: WorldRect | null,
  label: string,
): void {
  if (onScreen === null || exported === null) {
    expect(exported, label).toBe(onScreen);
    return;
  }
  expect(exported.x, `${label} x`).toBeCloseTo(onScreen.x, 6);
  expect(exported.y, `${label} y`).toBeCloseTo(onScreen.y, 6);
  expect(exported.width, `${label} width`).toBeCloseTo(onScreen.width, 6);
  expect(exported.height, `${label} height`).toBeCloseTo(onScreen.height, 6);
}

const ALL_ITEMS: readonly ScheduleItem[] = [TASK_WITH_ACTUAL, TASK_WITHOUT_ACTUAL];

describe('DEF-011: the SVG export draws the actual bar', () => {
  it('[overlap] paints the actual bar over the plan extent', () => {
    const svg = exportOf(documentOf(ALL_ITEMS, 'overlap', 'both'));
    const rects = exportedRects(svg, TASK_WITH_ACTUAL.id);
    const plan = rects.find((shape) => shape.planActualSide === 'plan');
    const actual = rects.find((shape) => shape.role === 'actual-bar');
    expect(plan).toBeDefined();
    expect(actual).toBeDefined();
    // Overlaid: same band, starting inside the plan span, never taller than it.
    expect(actual!.y).toBeCloseTo(plan!.y, 6);
    expect(actual!.height).toBeCloseTo(plan!.height, 6);
    expect(actual!.x).toBeGreaterThan(plan!.x);
    expect(actual!.x + actual!.width).toBeLessThanOrEqual(plan!.x + plan!.width + 1e-6);
  });

  it('[separate] stacks the actual bar below the plan, inside the grown band', () => {
    const scheduleDocument = documentOf(ALL_ITEMS, 'separate', 'both');
    const svg = exportOf(scheduleDocument);
    const rects = exportedRects(svg, TASK_WITH_ACTUAL.id);
    const plan = rects.find((shape) => shape.planActualSide === 'plan');
    const actual = rects.find((shape) => shape.role === 'actual-bar');
    expect(plan).toBeDefined();
    expect(actual).toBeDefined();
    // Stacked one full bar height + gap below the plan bar, same height (CR-013 Part 1).
    expect(actual!.y).toBeCloseTo(plan!.y + separateActualBarOffsetPx(plan!.height), 6);
    expect(actual!.height).toBeCloseTo(plan!.height, 6);
    expect(actual!.y).toBeGreaterThan(plan!.y + plan!.height);
    // ...and the grown row band that made room for it really contains it.
    const geometry = computeRowGeometry(
      scheduleDocument.items,
      scheduleDocument.rows,
      scheduleDocument.epochDate,
      scheduleDocument.viewState,
    );
    const bandBottom = CONTENT_ORIGIN + (geometry.rowTops[0] ?? 0) + (geometry.rowHeights[0] ?? 0);
    expect(actual!.y + actual!.height).toBeLessThanOrEqual(bandBottom + 1e-6);
    // The empty-space symptom is gone: the grown band is not taller than the drawing.
    expect(geometry.rowHeights[0]).toBeGreaterThan(plan!.height);
  });

  it('[plan-only] exports no actual side at all', () => {
    for (const style of ['overlap', 'separate'] as const) {
      const svg = exportOf(documentOf(ALL_ITEMS, style, 'plan-only'));
      expect(svg, style).not.toContain('data-role="actual-bar"');
      expect(svg, style).not.toContain('data-plan-actual-side="actual"');
      const rects = exportedRects(svg, TASK_WITH_ACTUAL.id);
      expect(rects, style).toHaveLength(1);
    }
  });

  it('[actual-only] exports the actual side only, and drops items with no actual', () => {
    for (const style of ['overlap', 'separate'] as const) {
      const svg = exportOf(documentOf(ALL_ITEMS, style, 'actual-only'));
      // The plan-only item has nothing to show and is not exported at all.
      expect(svg, style).not.toContain(`data-item-id="${TASK_WITHOUT_ACTUAL.id}"`);
      const rects = exportedRects(svg, TASK_WITH_ACTUAL.id);
      // A LONE bar: one rect, tagged as the actual side, no second (actual-bar) node.
      expect(rects, style).toHaveLength(1);
      expect(rects[0]!.planActualSide, style).toBe('actual');
      expect(rects[0]!.role, style).toBeNull();
      // It sits on the ACTUAL extent, right of the (hidden) plan start.
      const planStartX = exportedRects(
        exportOf(documentOf(ALL_ITEMS, style, 'plan-only')),
        TASK_WITH_ACTUAL.id,
      )[0]!.x;
      expect(rects[0]!.x, style).toBeGreaterThan(planStartX);
    }
  });

  it('[none] exports no item glyphs', () => {
    const svg = exportOf(documentOf(ALL_ITEMS, 'separate', 'none'));
    expect(svg).not.toContain('data-item-id=');
  });

  it('keeps a row with no actual-bearing item byte-for-byte unchanged', () => {
    const planOnlyItems = [TASK_WITHOUT_ACTUAL];
    const overlap = exportOf(documentOf(planOnlyItems, 'overlap', 'both'));
    const separate = exportOf(documentOf(planOnlyItems, 'separate', 'both'));
    // No growth, no extra rect: `separate` changes nothing without an actual.
    expect(separate).toBe(overlap);
    expect(exportedRects(overlap, TASK_WITHOUT_ACTUAL.id)).toHaveLength(1);
    expect(overlap).not.toContain('data-role="actual-bar"');
  });

  it('paints the abbreviation AFTER every bar in document order (DEF-009)', () => {
    for (const style of ['overlap', 'separate'] as const) {
      const group = itemGroupMarkup(
        exportOf(documentOf(ALL_ITEMS, style, 'both')),
        TASK_WITH_ACTUAL.id,
      );
      const lastRectEnd = group.lastIndexOf('<rect');
      const textStart = group.indexOf('<text');
      expect(textStart, style).toBeGreaterThan(lastRectEnd);
      expect(group, style).toContain(TASK_WITH_ACTUAL.abbrev);
    }
  });

  it('derives pale plan / vivid actual fills and the thin/thick stroke pair', () => {
    const svg = exportOf(documentOf(ALL_ITEMS, 'separate', 'both'));
    const rects = exportedRects(svg, TASK_WITH_ACTUAL.id);
    const plan = rects.find((shape) => shape.planActualSide === 'plan')!;
    const actual = rects.find((shape) => shape.role === 'actual-bar')!;
    expect(plan.fill).toBe(displayFillColor(TASK_WITH_ACTUAL));
    expect(actual.fill).toBe(actualDisplayFillColor(TASK_WITH_ACTUAL));
    expect(plan.fill).not.toBe(actual.fill);
    // CR-002 Part 1 redundancy: plan thin, actual thick (SC 1.4.1 without hue).
    expect(plan.strokeWidth).toBe(PLAN_STROKE_WIDTH_PX);
    expect(actual.strokeWidth).toBe(ACTUAL_STROKE_WIDTH_PX);
    // A plain, actual-free bar keeps its own stored fill and stroke (regression).
    const plain = exportedRects(svg, TASK_WITHOUT_ACTUAL.id)[0]!;
    expect(plain.fill).toBe(TASK_WITHOUT_ACTUAL.fillColor);
    expect(plain.planActualSide).toBeNull();
  });

  it('honours the screen-space minimum actual width at every zoom (CR-013 Part 2)', () => {
    for (const zoomX of [0.25, 1, 4] as const) {
      for (const style of ['overlap', 'separate'] as const) {
        const svg = exportOf(documentOf([TASK_STARTED_NOT_FINISHED], style, 'both', zoomX));
        const actual = exportedRects(svg, TASK_STARTED_NOT_FINISHED.id).find(
          (shape) => shape.role === 'actual-bar',
        );
        expect(actual?.width, `${style} zoomX=${zoomX}`).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
      }
    }
  });

  it('exports a milestone actual marker only while both sides are shown', () => {
    const both = exportOf(documentOf([MILESTONE_WITH_ACTUAL], 'overlap', 'both'));
    expect(both).toContain('data-role="milestone-actual-marker"');
    expect(both).toContain('data-role="milestone-plan-actual-leader"');
    const planOnly = exportOf(documentOf([MILESTONE_WITH_ACTUAL], 'overlap', 'plan-only'));
    expect(planOnly).not.toContain('data-role="milestone-actual-marker"');
  });
});

describe('DEF-011: exported rectangles equal the on-screen rectangles (ARCH-C-022)', () => {
  const items: readonly ScheduleItem[] = [
    TASK_WITH_ACTUAL,
    TASK_STARTED_NOT_FINISHED,
    TASK_WITHOUT_ACTUAL,
  ];

  for (const style of ['overlap', 'separate'] as const) {
    for (const display of ['both', 'plan-only', 'actual-only'] as const) {
      it(`[${style} / ${display}] every item paints the same rects on screen and in the export`, () => {
        const scheduleDocument = documentOf(items, style, display);
        for (const item of items) {
          const onScreen = screenRects(scheduleDocument, item.id);
          const exported = exportedWorldRects(scheduleDocument, item.id);
          expectSameRect(exported.primary, onScreen.primary, `${item.id} primary`);
          expectSameRect(exported.actual, onScreen.actual, `${item.id} actual`);
        }
      });
    }
  }
});
