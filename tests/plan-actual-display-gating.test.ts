/**
 * DEF-008 regression coverage: the `[P]` / `[A]` plan-actual display filter must gate
 * the DRAWN BARS, not only which items are drawn (PLAN-L1-002).
 *
 * | display     | plan bar                | actual bar                      |
 * |-------------|-------------------------|---------------------------------|
 * | both        | drawn                   | drawn when an actual is recorded |
 * | plan-only   | drawn, filling the lane | NOT drawn                       |
 * | actual-only | NOT drawn               | drawn over the actual extent    |
 * | none        | NOT drawn               | NOT drawn                       |
 *
 * Both halves are asserted: the pure gate (`computeDisplayedPlanActualBars`) for every
 * mode x style combination, and the real ItemLayer render path against the fake SVG
 * DOM for an item WITH and WITHOUT actual dates. Under `actual-only` the item's single
 * glyph stands in for the actual side, so it carries `data-plan-actual-side="actual"`
 * and the THICK plan/actual outline weight (CR-002 Part 1) while no separate
 * `actual-bar` node is mounted.
 */

import { describe, expect, it } from 'vitest';
import type {
  IsoDate,
  PlanActualDisplay,
  ScheduleDocument,
  ScheduleItem,
  ViewState,
} from '../src/domain/model/schedule-model.js';
import { ItemLayer } from '../src/adapters/render/layers/item-layer.js';
import {
  computeDisplayedPlanActualBars,
  isActualSideShown,
  isPlanSideShown,
  planActualDisplayFromSides,
} from '../src/domain/usecase/plan-actual-display.js';
import {
  type PlanActualBarsInput,
  type PlanActualStyle,
} from '../src/domain/usecase/plan-actual-geometry.js';
import { planActualStrokeWidthPx } from '../src/domain/usecase/a11y-tokens.js';
import { dateToWorldX } from '../src/domain/usecase/time-coordinate-mapper.js';
import type { ViewportWindow } from '../src/domain/usecase/viewport.js';
import { createGroup, installFakeSvgDocument, type FakeSvgNode } from './helpers/fake-svg-dom.js';
import { makePlacement, makeRenderContext, makeTask } from './helpers/make-render-context.js';

const SVG_G = (): SVGGElement => createGroup() as unknown as SVGGElement;
const WIDE_WINDOW: ViewportWindow = {
  worldLeft: -1000,
  worldRight: 5000,
  worldTop: -1000,
  worldBottom: 5000,
};

const EPOCH_DATE = '2026-01-01' as IsoDate;
const LANE_X = 100;
const LANE_TOP = 40;
const LANE_WIDTH = 120;
const LANE_HEIGHT = 20;
const ACTUAL_START = '2026-01-03' as IsoDate;
const ACTUAL_END = '2026-01-08' as IsoDate;

const ALL_DISPLAYS: readonly PlanActualDisplay[] = ['both', 'plan-only', 'actual-only', 'none'];
const ALL_STYLES: readonly PlanActualStyle[] = ['overlap', 'separate'];

/** The world-x the ACTUAL span maps to inside the placement's frame (origin-shifted). */
function actualWorldX(date: IsoDate): number {
  // The sample item starts ON the epoch, so the origin shift is exactly the lane x.
  return dateToWorldX(date, EPOCH_DATE, 1) + LANE_X;
}

function sampleDocument(items: readonly ScheduleItem[]): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'DEF-008',
    epochDate: EPOCH_DATE,
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items,
  };
}

function viewStateFor(display: PlanActualDisplay, style: PlanActualStyle): ViewState {
  return {
    zoomX: 1,
    zoomY: 1,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
    planActualDisplay: display,
    planActualStyle: style,
  };
}

/** Render one item through the REAL ItemLayer against the fake SVG DOM. */
function renderItem(
  item: ScheduleItem,
  display: PlanActualDisplay,
  style: PlanActualStyle,
): FakeSvgNode {
  const install = installFakeSvgDocument();
  try {
    const content = SVG_G();
    new ItemLayer(content).render(
      makeRenderContext({
        scheduleDocument: sampleDocument([item]),
        viewState: viewStateFor(display, style),
        placements: [makePlacement(item.id, LANE_X, LANE_TOP, LANE_WIDTH, LANE_HEIGHT)],
        itemById: new Map<string, ScheduleItem>([[item.id, item]]),
      }),
      WIDE_WINDOW,
    );
    return content as unknown as FakeSvgNode;
  } finally {
    install.restore();
  }
}

/** The primary glyph (the single node that carries the item's own shape). */
function primaryGlyph(content: FakeSvgNode): FakeSvgNode | null {
  const group = content.querySelector('[data-item-id]');
  if (group === null) {
    return null;
  }
  return (
    group.children.find(
      (child) =>
        (child.tagName === 'rect' || child.tagName === 'path' || child.tagName === 'polygon') &&
        child.getAttribute('data-role') === null,
    ) ?? null
  );
}

/** Every node the render marked as the ACTUAL side (bar, marker, or lone glyph). */
function actualSideNodes(content: FakeSvgNode): FakeSvgNode[] {
  return content.querySelectorAll('[data-plan-actual-side="actual"]');
}

const taskWithActual = makeTask('with-actual', {
  abbrev: 'WA',
  startDate: EPOCH_DATE,
  endDate: '2026-01-10' as IsoDate,
  actualStart: ACTUAL_START,
  actualEnd: ACTUAL_END,
});
const taskWithoutActual = makeTask('no-actual', {
  abbrev: 'NA',
  startDate: EPOCH_DATE,
  endDate: '2026-01-10' as IsoDate,
});
const milestoneWithActual: ScheduleItem = {
  ...makeTask('ms-actual', { abbrev: 'MS' }),
  itemKind: 'milestone',
  startDate: EPOCH_DATE,
  endDate: EPOCH_DATE,
  actualStart: ACTUAL_START,
  actualEnd: null,
};

describe('DEF-008 gate: the display filter decides which BARS exist (pure)', () => {
  const baseInput = (style: PlanActualStyle, hasActual: boolean): PlanActualBarsInput => ({
    planStartWorldX: 0,
    planEndWorldX: 120,
    actualStartWorldX: hasActual ? 20 : null,
    actualEndWorldX: hasActual ? 80 : null,
    laneTop: 0,
    laneHeight: LANE_HEIGHT,
    style,
  });

  it('exposes the four modes through two side predicates', () => {
    expect(
      ALL_DISPLAYS.map((display) => [isPlanSideShown(display), isActualSideShown(display)]),
    ).toEqual([
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ]);
    // Absent view state behaves as `both` (a fresh document shows everything).
    expect([isPlanSideShown(undefined), isActualSideShown(undefined)]).toEqual([true, true]);
    expect(
      ALL_DISPLAYS.map((display) =>
        planActualDisplayFromSides(isPlanSideShown(display), isActualSideShown(display)),
      ),
    ).toEqual([...ALL_DISPLAYS]);
  });

  for (const style of ALL_STYLES) {
    it(`[${style}] both draws the plan and the recorded actual`, () => {
      const bars = computeDisplayedPlanActualBars(baseInput(style, true), 'both');
      expect(bars.plan).not.toBeNull();
      expect(bars.actual).not.toBeNull();
      if (style === 'separate') {
        // The two sub-lanes stay stacked and each is shorter than the lane.
        expect(bars.actual!.y).toBeGreaterThan(bars.plan!.y + bars.plan!.height);
        expect(bars.plan!.height).toBeLessThan(LANE_HEIGHT);
      } else {
        expect(bars.actual!.y).toBe(bars.plan!.y);
        expect(bars.plan!.height).toBe(LANE_HEIGHT);
      }
    });

    it(`[${style}] plan-only drops the actual and lets the plan fill the lane`, () => {
      const bars = computeDisplayedPlanActualBars(baseInput(style, true), 'plan-only');
      expect(bars.actual).toBeNull();
      expect(bars.plan).toEqual({ x: 0, y: 0, width: 120, height: LANE_HEIGHT });
    });

    it(`[${style}] actual-only drops the plan and lets the actual fill the lane`, () => {
      const bars = computeDisplayedPlanActualBars(baseInput(style, true), 'actual-only');
      expect(bars.plan).toBeNull();
      expect(bars.actual).toEqual({ x: 20, y: 0, width: 60, height: LANE_HEIGHT });
    });

    it(`[${style}] none draws nothing, with or without a recorded actual`, () => {
      expect(computeDisplayedPlanActualBars(baseInput(style, true), 'none')).toEqual({
        plan: null,
        actual: null,
      });
      expect(computeDisplayedPlanActualBars(baseInput(style, false), 'none')).toEqual({
        plan: null,
        actual: null,
      });
    });

    it(`[${style}] an item WITHOUT an actual never yields an actual bar`, () => {
      for (const display of ['both', 'plan-only', 'actual-only'] as const) {
        expect(computeDisplayedPlanActualBars(baseInput(style, false), display).actual).toBeNull();
      }
      // ...and its plan bar survives wherever the plan side is shown.
      expect(computeDisplayedPlanActualBars(baseInput(style, false), 'both').plan).not.toBeNull();
      expect(
        computeDisplayedPlanActualBars(baseInput(style, false), 'plan-only').plan,
      ).not.toBeNull();
      expect(
        computeDisplayedPlanActualBars(baseInput(style, false), 'actual-only').plan,
      ).toBeNull();
    });
  }
});

describe('DEF-008 render: a task WITH actual dates under every mode', () => {
  for (const style of ALL_STYLES) {
    it(`[${style}] both draws the plan bar plus a separate actual bar`, () => {
      const content = renderItem(taskWithActual, 'both', style);
      const glyph = primaryGlyph(content);
      expect(glyph?.getAttribute('data-plan-actual-side')).toBe('plan');
      expect(glyph?.getAttribute('x')).toBe(String(LANE_X));
      const actualBars = content.querySelectorAll('[data-role="actual-bar"]');
      expect(actualBars).toHaveLength(1);
      expect(actualBars[0]?.getAttribute('x')).toBe(String(actualWorldX(ACTUAL_START)));
    });

    it(`[${style}] plan-only draws NO actual bar and the plan fills the lane`, () => {
      const content = renderItem(taskWithActual, 'plan-only', style);
      expect(content.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(0);
      expect(actualSideNodes(content)).toHaveLength(0);
      const glyph = primaryGlyph(content);
      expect(glyph?.getAttribute('data-plan-actual-side')).toBeNull();
      expect(glyph?.getAttribute('x')).toBe(String(LANE_X));
      expect(glyph?.getAttribute('width')).toBe(String(LANE_WIDTH));
      expect(glyph?.getAttribute('height')).toBe(String(LANE_HEIGHT));
    });

    it(`[${style}] actual-only draws ONE bar, over the actual extent, marked actual`, () => {
      const content = renderItem(taskWithActual, 'actual-only', style);
      // No second node: the single glyph IS the actual side.
      expect(content.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(0);
      expect(actualSideNodes(content)).toHaveLength(1);
      expect(content.querySelectorAll('[data-plan-actual-side="plan"]')).toHaveLength(0);
      const glyph = primaryGlyph(content);
      expect(glyph?.getAttribute('data-plan-actual-side')).toBe('actual');
      expect(glyph?.getAttribute('x')).toBe(String(actualWorldX(ACTUAL_START)));
      expect(glyph?.getAttribute('width')).toBe(
        String(actualWorldX(ACTUAL_END) - actualWorldX(ACTUAL_START)),
      );
      expect(glyph?.getAttribute('height')).toBe(String(LANE_HEIGHT));
      // CR-002 Part 1: a lone actual keeps the THICK non-color weight redundancy.
      expect(glyph?.getAttribute('stroke-width')).toBe(String(planActualStrokeWidthPx('actual')));
    });

    it(`[${style}] none mounts no item node at all`, () => {
      const content = renderItem(taskWithActual, 'none', style);
      expect(content.children).toHaveLength(0);
    });
  }
});

describe('DEF-008 render: a task WITHOUT actual dates under every mode', () => {
  for (const style of ALL_STYLES) {
    it(`[${style}] both draws the plan bar only`, () => {
      const content = renderItem(taskWithoutActual, 'both', style);
      expect(content.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(0);
      expect(actualSideNodes(content)).toHaveLength(0);
      expect(primaryGlyph(content)?.getAttribute('x')).toBe(String(LANE_X));
    });

    it(`[${style}] plan-only draws the plan bar over the full lane`, () => {
      const content = renderItem(taskWithoutActual, 'plan-only', style);
      expect(actualSideNodes(content)).toHaveLength(0);
      expect(primaryGlyph(content)?.getAttribute('height')).toBe(String(LANE_HEIGHT));
    });

    it(`[${style}] actual-only drops the item entirely (nothing to show)`, () => {
      expect(renderItem(taskWithoutActual, 'actual-only', style).children).toHaveLength(0);
    });

    it(`[${style}] none mounts no item node at all`, () => {
      expect(renderItem(taskWithoutActual, 'none', style).children).toHaveLength(0);
    });
  }
});

describe('DEF-008 render: a milestone follows the same gate (CR-002 Part 2)', () => {
  it('both draws the plan marker, the actual marker and the leader', () => {
    const content = renderItem(milestoneWithActual, 'both', 'overlap');
    expect(content.querySelectorAll('[data-role="milestone-actual-marker"]')).toHaveLength(1);
    expect(content.querySelectorAll('[data-role="milestone-plan-actual-leader"]')).toHaveLength(1);
    expect(primaryGlyph(content)?.getAttribute('data-plan-actual-side')).toBeNull();
  });

  it('plan-only removes the actual marker and its leader', () => {
    const content = renderItem(milestoneWithActual, 'plan-only', 'overlap');
    expect(content.querySelectorAll('[data-role="milestone-actual-marker"]')).toHaveLength(0);
    expect(content.querySelectorAll('[data-role="milestone-plan-actual-leader"]')).toHaveLength(0);
    expect(actualSideNodes(content)).toHaveLength(0);
    expect(primaryGlyph(content)).not.toBeNull();
  });

  it('actual-only keeps ONE marker, drawn at the actual point', () => {
    const bothMarker = renderItem(milestoneWithActual, 'both', 'overlap').querySelector(
      '[data-role="milestone-actual-marker"]',
    );
    const content = renderItem(milestoneWithActual, 'actual-only', 'overlap');
    expect(content.querySelectorAll('[data-role="milestone-actual-marker"]')).toHaveLength(0);
    expect(content.querySelectorAll('[data-role="milestone-plan-actual-leader"]')).toHaveLength(0);
    const glyph = primaryGlyph(content);
    expect(actualSideNodes(content)).toHaveLength(1);
    expect(glyph?.getAttribute('data-plan-actual-side')).toBe('actual');
    // The lone marker sits exactly where the two-marker mode drew the actual one.
    expect(glyph?.getAttribute('d')).toBe(bothMarker?.getAttribute('d'));
  });
});

describe('DEF-008 render: toggling the filter strands no nodes', () => {
  it('adds and removes the actual bar in place across repeated toggles', () => {
    const install = installFakeSvgDocument();
    try {
      const content = SVG_G();
      const layer = new ItemLayer(content);
      const node = content as unknown as FakeSvgNode;
      const renderWith = (display: PlanActualDisplay): void => {
        layer.render(
          makeRenderContext({
            scheduleDocument: sampleDocument([taskWithActual]),
            viewState: viewStateFor(display, 'overlap'),
            placements: [
              makePlacement(taskWithActual.id, LANE_X, LANE_TOP, LANE_WIDTH, LANE_HEIGHT),
            ],
            itemById: new Map<string, ScheduleItem>([[taskWithActual.id, taskWithActual]]),
          }),
          WIDE_WINDOW,
        );
      };
      renderWith('both');
      const bothChildCount = node.querySelector('[data-item-id]')?.children.length ?? 0;
      expect(node.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(1);

      for (let pass = 0; pass < 3; pass += 1) {
        renderWith('plan-only');
        expect(node.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(0);
        expect(actualSideNodes(node)).toHaveLength(0);

        renderWith('actual-only');
        expect(node.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(0);
        expect(actualSideNodes(node)).toHaveLength(1);

        renderWith('both');
        expect(node.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(1);
        // The group returns to exactly its two-bar shape: no stranded duplicates.
        expect(node.querySelector('[data-item-id]')?.children.length).toBe(bothChildCount);
        expect(node.children).toHaveLength(1);
      }
    } finally {
      install.restore();
    }
  });
});
