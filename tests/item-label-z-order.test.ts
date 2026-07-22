/**
 * DEF-009 regression coverage: an item's TEXT must always paint ABOVE its bars.
 *
 * SVG paints later siblings on top, and the vivid ACTUAL bar (PLAN-L1-005) is created
 * lazily AFTER the plan glyph, so before the fix it buried the plan bar's `inner-left`
 * abbreviation (ITEM-L1-009 / ITEM-L2-002) on every item that records actual dates.
 * The structural fix mounts every bar / marker BEFORE a dedicated, never-removed
 * `item-label-layer` group that carries the abbreviation and the assignee name
 * (CR-004 Part 5), so the text layer stays last among the painted children.
 *
 * These tests run the REAL {@link ItemLayer} against the fake SVG DOM (the same
 * helpers `plan-actual-display-gating.test.ts` uses) and assert the flattened PAINT
 * ORDER -- a depth-first walk of the item group, which is exactly the order a browser
 * paints -- rather than any single attribute.
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
import type { PlanActualStyle } from '../src/domain/usecase/plan-actual-geometry.js';
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

const ALL_STYLES: readonly PlanActualStyle[] = ['overlap', 'separate'];

const conceptTask = makeTask('concept', {
  abbrev: 'Concept',
  startDate: EPOCH_DATE,
  endDate: '2026-01-10' as IsoDate,
  actualStart: '2026-01-03' as IsoDate,
  actualEnd: '2026-01-08' as IsoDate,
  assignee: 'Sato',
});
const validationTask = makeTask('validation', {
  abbrev: 'Validation',
  startDate: EPOCH_DATE,
  endDate: '2026-01-10' as IsoDate,
  assignee: 'Suzuki',
});
const launchMilestone: ScheduleItem = {
  ...makeTask('launch', { abbrev: 'Launch' }),
  itemKind: 'milestone',
  startDate: EPOCH_DATE,
  endDate: EPOCH_DATE,
  actualStart: '2026-01-05' as IsoDate,
  actualEnd: null,
};

function sampleDocument(items: readonly ScheduleItem[]): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'DEF-009',
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
    assigneeVisible: true,
  };
}

/** A live layer plus a `renderWith` that re-runs the REAL diff on the same DOM. */
function mountLayer(item: ScheduleItem): {
  content: FakeSvgNode;
  renderWith(display: PlanActualDisplay, style: PlanActualStyle): void;
} {
  const content = SVG_G();
  const layer = new ItemLayer(content);
  return {
    content: content as unknown as FakeSvgNode,
    renderWith(display: PlanActualDisplay, style: PlanActualStyle): void {
      layer.render(
        makeRenderContext({
          scheduleDocument: sampleDocument([item]),
          viewState: viewStateFor(display, style),
          placements: [makePlacement(item.id, LANE_X, LANE_TOP, LANE_WIDTH, LANE_HEIGHT)],
          itemById: new Map<string, ScheduleItem>([[item.id, item]]),
        }),
        WIDE_WINDOW,
      );
    },
  };
}

/** Render one item once, through the real layer, and return the content group. */
function renderItem(
  item: ScheduleItem,
  display: PlanActualDisplay,
  style: PlanActualStyle,
): FakeSvgNode {
  const install = installFakeSvgDocument();
  try {
    const mount = mountLayer(item);
    mount.renderWith(display, style);
    return mount.content;
  } finally {
    install.restore();
  }
}

/** The mounted group of the single item under test. */
function itemGroup(content: FakeSvgNode): FakeSvgNode {
  const group = content.querySelector('[data-item-id]');
  expect(group).not.toBeNull();
  return group as FakeSvgNode;
}

/**
 * The item group's descendants in PAINT order: a depth-first pre-order walk, which is
 * exactly how a browser paints an SVG subtree (later entries paint on top).
 */
function paintOrder(group: FakeSvgNode): FakeSvgNode[] {
  const painted: FakeSvgNode[] = [];
  const walk = (node: FakeSvgNode): void => {
    for (const child of node.children) {
      painted.push(child);
      walk(child);
    }
  };
  walk(group);
  return painted;
}

/** The abbreviation text node (the only text without a `data-role`). */
function abbrevText(group: FakeSvgNode): FakeSvgNode | null {
  return (
    group.querySelectorAll('text').find((node) => node.getAttribute('data-role') === null) ?? null
  );
}

/** The primary glyph: the item's own shape node, never a role-tagged extra. */
function primaryGlyph(group: FakeSvgNode): FakeSvgNode | null {
  return (
    group.children.find(
      (child) =>
        (child.tagName === 'rect' || child.tagName === 'path' || child.tagName === 'polygon') &&
        child.getAttribute('data-role') === null,
    ) ?? null
  );
}

/**
 * Assert the DEF-009 invariant on a mounted item: the abbreviation (and any assignee
 * name) paints after every bar / marker, and the text layer is the last child.
 */
function expectTextPaintsAboveBars(content: FakeSvgNode, expectedAbbrev: string): void {
  const group = itemGroup(content);
  const painted = paintOrder(group);
  const label = abbrevText(group);
  expect(label?.textContent).toBe(expectedAbbrev);
  const labelIndex = painted.indexOf(label as FakeSvgNode);
  expect(labelIndex).toBeGreaterThanOrEqual(0);

  const glyph = primaryGlyph(group);
  expect(glyph).not.toBeNull();
  expect(labelIndex).toBeGreaterThan(painted.indexOf(glyph as FakeSvgNode));

  // Every bar / marker the render mounted must sit BELOW the text.
  for (const role of ['actual-bar', 'milestone-actual-marker', 'milestone-plan-actual-leader']) {
    for (const bar of group.querySelectorAll(`[data-role="${role}"]`)) {
      expect(labelIndex).toBeGreaterThan(painted.indexOf(bar));
    }
  }

  // The assignee name shares the text layer, so it clears the bars as well.
  const assigneeLabel = group.querySelector('[data-role="assignee-label"]');
  if (assigneeLabel !== null) {
    const assigneeIndex = painted.indexOf(assigneeLabel);
    expect(assigneeIndex).toBeGreaterThan(painted.indexOf(glyph as FakeSvgNode));
    for (const bar of group.querySelectorAll('[data-role="actual-bar"]')) {
      expect(assigneeIndex).toBeGreaterThan(painted.indexOf(bar));
    }
  }

  // Structural guarantee: the text layer is the last painted child of the group, so a
  // bar created on a later frame still lands beneath it.
  const labelLayer = group.querySelector('[data-role="item-label-layer"]');
  expect(labelLayer).not.toBeNull();
  expect(group.children[group.children.length - 1]).toBe(labelLayer);
  expect(label?.parentNode).toBe(labelLayer);
}

describe('DEF-009: a task WITH actuals keeps its abbreviation above both bars', () => {
  for (const style of ALL_STYLES) {
    it(`[${style}] the actual bar exists and paints BELOW the abbreviation`, () => {
      const content = renderItem(conceptTask, 'both', style);
      const group = itemGroup(content);
      // Guard the premise: this is the two-bar case the defect was reported on.
      expect(group.querySelectorAll('[data-role="actual-bar"]')).toHaveLength(1);
      expect(group.querySelector('[data-plan-actual-side="plan"]')).not.toBeNull();
      expectTextPaintsAboveBars(content, 'Concept');
    });

    it(`[${style}] a lone ACTUAL glyph still carries a readable abbreviation`, () => {
      expectTextPaintsAboveBars(renderItem(conceptTask, 'actual-only', style), 'Concept');
    });

    it(`[${style}] a plan-only render keeps the label on top of the plan bar`, () => {
      expectTextPaintsAboveBars(renderItem(conceptTask, 'plan-only', style), 'Concept');
    });
  }
});

describe('DEF-009: a task WITHOUT actuals renders its label unchanged', () => {
  for (const style of ALL_STYLES) {
    it(`[${style}] no actual bar is mounted and the label still paints last`, () => {
      const content = renderItem(validationTask, 'both', style);
      expect(itemGroup(content).querySelectorAll('[data-role="actual-bar"]')).toHaveLength(0);
      expectTextPaintsAboveBars(content, 'Validation');
    });
  }
});

describe('DEF-009: a milestone caption paints above its actual marker', () => {
  it('the actual marker and its leader stay below the caption', () => {
    const content = renderItem(launchMilestone, 'both', 'overlap');
    const group = itemGroup(content);
    expect(group.querySelectorAll('[data-role="milestone-actual-marker"]')).toHaveLength(1);
    expect(group.querySelectorAll('[data-role="milestone-plan-actual-leader"]')).toHaveLength(1);
    expectTextPaintsAboveBars(content, 'Launch');
  });
});

describe('DEF-009: the paint order survives repeated display / style toggling', () => {
  it('never buries or duplicates the text across [P]/[A] and [Ao]/[As] cycles', () => {
    const install = installFakeSvgDocument();
    try {
      const mount = mountLayer(conceptTask);
      const cycle: readonly (readonly [PlanActualDisplay, PlanActualStyle])[] = [
        ['both', 'overlap'],
        ['plan-only', 'overlap'],
        ['both', 'separate'],
        ['actual-only', 'separate'],
        ['both', 'overlap'],
        ['actual-only', 'overlap'],
        ['both', 'separate'],
        ['plan-only', 'separate'],
        ['both', 'overlap'],
      ];
      for (let pass = 0; pass < 3; pass += 1) {
        for (const [display, style] of cycle) {
          mount.renderWith(display, style);
          expectTextPaintsAboveBars(mount.content, 'Concept');
          const group = itemGroup(mount.content);
          // Exactly one abbreviation and one assignee name: no stranded text clones.
          expect(group.querySelectorAll('text')).toHaveLength(2);
          expect(group.querySelectorAll('[data-role="item-label-layer"]')).toHaveLength(1);
        }
      }
      // The `both` + `overlap` end state is the reported defect's configuration.
      expect(
        itemGroup(mount.content).querySelectorAll('[data-role="actual-bar"]'),
      ).toHaveLength(1);
    } finally {
      install.restore();
    }
  });

  it('re-creating the actual bar after a removal still puts it under the text', () => {
    const install = installFakeSvgDocument();
    try {
      const mount = mountLayer(conceptTask);
      mount.renderWith('both', 'overlap');
      const firstBar = itemGroup(mount.content).querySelector('[data-role="actual-bar"]');
      // `plan-only` removes the bar node entirely; returning to `both` creates a NEW
      // one, which must be inserted beneath the (untouched) text layer.
      mount.renderWith('plan-only', 'overlap');
      expect(itemGroup(mount.content).querySelectorAll('[data-role="actual-bar"]')).toHaveLength(0);
      mount.renderWith('both', 'overlap');
      const secondBar = itemGroup(mount.content).querySelector('[data-role="actual-bar"]');
      expect(secondBar).not.toBe(firstBar);
      expectTextPaintsAboveBars(mount.content, 'Concept');
    } finally {
      install.restore();
    }
  });
});
