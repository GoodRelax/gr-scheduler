import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  IsoDate,
  ScheduleDocument,
  ScheduleItem,
} from '../src/domain/model/schedule-model.js';
import {
  DEFAULT_DEPENDENCY_LINE_COLOR,
  TODAY_LINE_COLOR,
} from '../src/domain/model/schedule-model.js';
import type { ViewportWindow } from '../src/domain/usecase/viewport.js';
import type { Annotation } from '../src/domain/model/annotation.js';
import { GridLayer } from '../src/adapters/render/layers/grid-layer.js';
import { RulerLayer } from '../src/adapters/render/layers/ruler-layer.js';
import { WatermarkLayer } from '../src/adapters/render/layers/watermark-layer.js';
import { ItemLayer } from '../src/adapters/render/layers/item-layer.js';
import { DependencyLayer } from '../src/adapters/render/layers/dependency-layer.js';
import { ProgressTodayLayer } from '../src/adapters/render/layers/progress-today-layer.js';
import { CursorGuideLayer } from '../src/adapters/render/layers/cursor-guide-layer.js';
import { RoundedBoxLayer } from '../src/adapters/render/layers/rounded-box-layer.js';
import { CommentLayer } from '../src/adapters/render/layers/comment-layer.js';
import { HitTester } from '../src/adapters/render/hit-tester.js';
import { LOD_FULL_RENDER_ITEM_CAP } from '../src/domain/usecase/lod-selector.js';
import {
  createGroup,
  installFakeSvgDocument,
  type FakeSvgNode,
} from './helpers/fake-svg-dom.js';
import {
  makePlacement,
  makeRenderContext,
  makeTask,
} from './helpers/make-render-context.js';

/**
 * jsdom-style UNIT tests for the layers and hit-tester extracted from the
 * svg-renderer god-object (review M-4 / R6). Each layer is mounted against a real
 * (fake) SVG DOM node and asserted on its produced `data-role`/attributes/positions
 * using a pinned ViewTransform; the hit-tester is asserted for target + priority
 * order. jsdom / happy-dom are not installed and package.json is frozen, so the
 * compact real-DOM shim in `helpers/fake-svg-dom.ts` hosts the REAL layer code.
 */

const SVG_G = () => createGroup() as unknown as SVGGElement;

/** A wide window that contains every placement used below. */
const WIDE_WINDOW: ViewportWindow = {
  worldLeft: -100,
  worldRight: 5000,
  worldTop: -100,
  worldBottom: 5000,
};

function sampleDocument(over: Partial<ScheduleDocument> = {}): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'Test',
    epochDate: '2026-01-01' as IsoDate,
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items: [],
    ...over,
  };
}

let dom: { restore(): void };

beforeEach(() => {
  dom = installFakeSvgDocument();
});

afterEach(() => {
  dom.restore();
});

describe('GridLayer', () => {
  it('draws date + category gridlines and honors the toggles', () => {
    const group = SVG_G();
    const layer = new GridLayer(group);
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument(),
      displayRows: [
        { id: 'r0' },
        { id: 'r1' },
      ] as unknown as ScheduleDocument['rows'],
      rowBoundary: (index) => index * 40,
    });
    layer.render(ctx, WIDE_WINDOW);
    const node = group as unknown as FakeSvgNode;
    const lines = node.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
    // Category boundaries at rowBoundary(0..2) = 0,40,80 all inside the window.
    const horizontal = lines.filter((line) => line.getAttribute('y1') === line.getAttribute('y2'));
    expect(horizontal.length).toBe(3);
    for (const line of lines) {
      expect(line.getAttribute('stroke-opacity')).toBe('0.08');
    }
  });

  it('omits date gridlines when gridDateLinesVisible is false', () => {
    const group = SVG_G();
    const layer = new GridLayer(group);
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument(),
      viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', gridDateLinesVisible: false, gridCategoryLinesVisible: false },
      displayRows: [{ id: 'r0' }] as unknown as ScheduleDocument['rows'],
    });
    layer.render(ctx, WIDE_WINDOW);
    expect((group as unknown as FakeSvgNode).childNodes.length).toBe(0);
  });
});

describe('RulerLayer', () => {
  it('appends a date-ruler group with a tier count and labels', () => {
    const overlay = SVG_G();
    const layer = new RulerLayer(overlay);
    layer.render(makeRenderContext({ scheduleDocument: sampleDocument() }));
    const node = overlay as unknown as FakeSvgNode;
    const ruler = node.querySelector('[data-role="date-ruler"]');
    expect(ruler).not.toBeNull();
    const tierCount = Number(ruler?.getAttribute('data-tier-count'));
    expect(tierCount).toBeGreaterThanOrEqual(1);
    expect(ruler?.querySelectorAll('[data-role="date-ruler-label"]').length).toBeGreaterThan(0);
  });
});

describe('WatermarkLayer', () => {
  it('draws the default GoodRelax watermark + mandatory UTC time at opacity 0.06', () => {
    const overlay = SVG_G();
    new WatermarkLayer(overlay).render(makeRenderContext({ scheduleDocument: sampleDocument() }));
    const mark = (overlay as unknown as FakeSvgNode).querySelector('[data-role="watermark"]');
    expect(mark).not.toBeNull();
    expect(mark?.getAttribute('opacity')).toBe('0.06');
    const tiles = mark?.querySelectorAll('text') ?? [];
    expect(tiles.length).toBeGreaterThan(0);
    // CR-009 Part 2: the default mark is "GoodRelax" followed by a mandatory
    // minute-precision UTC ISO-8601 time (trailing Z) -- never time-less.
    expect(tiles[0]?.textContent).toMatch(/^GoodRelax \d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
  });
});

describe('ItemLayer', () => {
  const item = makeTask('a', { abbrev: 'A' });
  const placement = makePlacement('a', 100, 100, 80, 40);

  function itemContext() {
    return makeRenderContext({
      scheduleDocument: sampleDocument({ items: [item] }),
      placements: [placement],
      itemById: new Map<string, ScheduleItem>([['a', item]]),
    });
  }

  it('mounts an item group with a rect glyph, label and title at the placed position', () => {
    const content = SVG_G();
    const layer = new ItemLayer(content);
    const metrics = layer.render(itemContext(), WIDE_WINDOW);
    expect(metrics.createdCount).toBe(1);
    expect(metrics.liveNodeCount).toBe(1);
    const node = content as unknown as FakeSvgNode;
    const glyph = node.querySelector('rect');
    expect(glyph?.getAttribute('x')).toBe('100');
    expect(glyph?.getAttribute('y')).toBe('100');
    expect(glyph?.getAttribute('width')).toBe('80');
    expect(glyph?.getAttribute('height')).toBe('40');
    expect(node.querySelector('text')?.textContent).toBe('A');
    expect(node.querySelector('title')).not.toBeNull();
  });

  it('is diff-idempotent: rendering the same state twice yields no duplicate nodes', () => {
    const content = SVG_G();
    const layer = new ItemLayer(content);
    const ctx = itemContext();
    layer.render(ctx, WIDE_WINDOW);
    const first = (content as unknown as FakeSvgNode).children.length;
    const second = layer.render(ctx, WIDE_WINDOW);
    expect((content as unknown as FakeSvgNode).children.length).toBe(first);
    expect(second.createdCount).toBe(0);
    expect(second.removedCount).toBe(0);
    expect(second.liveNodeCount).toBe(1);
  });

  it('removes an item node once it leaves the viewport window (large document)', () => {
    // Virtualization only culls off-window items for a LARGE document (> the small-doc
    // full-render cap); pad the item set past the cap so this path is exercised. Only
    // 'a' has a placement, so it is the sole processed item.
    const padding = Array.from({ length: LOD_FULL_RENDER_ITEM_CAP }, (_, index) =>
      makeTask(`pad-${index}`),
    );
    const content = SVG_G();
    const layer = new ItemLayer(content);
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument({ items: [item, ...padding] }),
      placements: [placement],
      itemById: new Map<string, ScheduleItem>([['a', item]]),
    });
    layer.render(ctx, WIDE_WINDOW);
    const far: ViewportWindow = { worldLeft: 9000, worldRight: 9500, worldTop: 9000, worldBottom: 9500 };
    const metrics = layer.render(ctx, far);
    expect(metrics.removedCount).toBe(1);
    expect(metrics.liveNodeCount).toBe(0);
    expect((content as unknown as FakeSvgNode).children.length).toBe(0);
  });

  it('keeps every item of a SMALL document mounted even off the viewport window', () => {
    // Startup-Fit under-render fix: a small schedule renders in full, so an item stays
    // mounted regardless of scroll/zoom -- the whole overview is always shown.
    const content = SVG_G();
    const layer = new ItemLayer(content);
    const ctx = itemContext();
    layer.render(ctx, WIDE_WINDOW);
    const far: ViewportWindow = { worldLeft: 9000, worldRight: 9500, worldTop: 9000, worldBottom: 9500 };
    const metrics = layer.render(ctx, far);
    expect(metrics.removedCount).toBe(0);
    expect(metrics.liveNodeCount).toBe(1);
  });

  it('adds a dashed selection outline only for a selected item', () => {
    const content = SVG_G();
    const layer = new ItemLayer(content);
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument({ items: [item] }),
      placements: [placement],
      itemById: new Map<string, ScheduleItem>([['a', item]]),
      selectedItemIds: new Set(['a']),
    });
    layer.render(ctx, WIDE_WINDOW);
    expect((content as unknown as FakeSvgNode).querySelector('[data-role="selection-outline"]')).not.toBeNull();
  });
});

describe('DependencyLayer', () => {
  it('routes and draws a dependency line with the default gold stroke', () => {
    const from = makePlacement('a', 100, 100, 80, 40);
    const to = makePlacement('b', 400, 100, 80, 40);
    const content = SVG_G();
    const depGroup = SVG_G();
    const layer = new DependencyLayer(content, depGroup);
    const depItemA = makeTask('a');
    const depItemB = makeTask('b');
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument({
        items: [depItemA, depItemB],
        dependencies: [{ id: 'd1', fromItemId: 'a', fromAnchor: 5, toItemId: 'b', toAnchor: 3 }],
      }),
      placements: [from, to],
      itemById: new Map<string, ScheduleItem>([['a', depItemA], ['b', depItemB]]),
    });
    layer.render(ctx, WIDE_WINDOW);
    const path = (depGroup as unknown as FakeSvgNode).querySelector('[data-role="dependency-line"]');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('data-dependency-id')).toBe('d1');
    expect(path?.getAttribute('stroke')).toBe(DEFAULT_DEPENDENCY_LINE_COLOR);
    expect(path?.getAttribute('marker-end')).toContain('grsch-dep-arrow');
  });
});

describe('ProgressTodayLayer', () => {
  it('draws the today line in the today color when enabled', () => {
    const overlay = SVG_G();
    const layer = new ProgressTodayLayer(overlay);
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument(),
      today: '2026-02-01' as IsoDate,
      viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', todayLineVisible: true },
    });
    layer.renderTodayLine(ctx);
    const line = (overlay as unknown as FakeSvgNode).querySelector('[data-role="today-line"]');
    expect(line).not.toBeNull();
    expect(line?.getAttribute('stroke')).toBe(TODAY_LINE_COLOR);
  });

  it('draws nothing when the today line is disabled', () => {
    const overlay = SVG_G();
    new ProgressTodayLayer(overlay).renderTodayLine(
      makeRenderContext({ scheduleDocument: sampleDocument() }),
    );
    expect((overlay as unknown as FakeSvgNode).childNodes.length).toBe(0);
  });
});

describe('CursorGuideLayer', () => {
  it('draws a crosshair guide (vertical + horizontal) at the pointer', () => {
    const overlay = SVG_G();
    const layer = new CursorGuideLayer(overlay);
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument(),
      viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', cursorGuideMode: 'crosshair' },
      pointerClient: { clientX: 300, clientY: 200 },
      leftPaneWidth: 0,
    });
    layer.renderGuide(ctx);
    const guide = (overlay as unknown as FakeSvgNode).querySelector('[data-role="cursor-guide"]');
    expect(guide).not.toBeNull();
    expect(guide?.getAttribute('data-guide-mode')).toBe('crosshair');
    expect(guide?.querySelectorAll('line').length).toBe(2);
  });
});

describe('RoundedBoxLayer', () => {
  it('draws a rounded-box annotation with its data-role and id', () => {
    const box: Annotation = {
      id: 'box1',
      annotationKind: 'rounded-box',
      startDate: '2026-01-01',
      endDate: '2026-01-20',
      startRowIndex: 0,
      endRowIndex: 1,
      strokeColor: '#8452b3',
    } as unknown as Annotation;
    const overlay = SVG_G();
    new RoundedBoxLayer(overlay).render(
      makeRenderContext({
        scheduleDocument: sampleDocument({ annotations: [box] }),
        rowBoundary: (index) => index * 40,
      }),
    );
    const rect = (overlay as unknown as FakeSvgNode).querySelector('[data-role="annotation-box"]');
    expect(rect).not.toBeNull();
    expect(rect?.getAttribute('data-annotation-id')).toBe('box1');
    expect(rect?.getAttribute('stroke')).toBe('#8452b3');
  });
});

describe('CommentLayer', () => {
  it('draws a callout-box comment with a bubble, leader and text', () => {
    const comment: Annotation = {
      id: 'c1',
      annotationKind: 'callout-box',
      text: 'hello',
      anchorDate: '2026-01-05',
      anchorRowIndex: 0,
      anchorPoint: 4,
      bodyOffsetPx: { dx: 40, dy: -30 },
    } as unknown as Annotation;
    const overlay = SVG_G();
    new CommentLayer(overlay).render(
      makeRenderContext({
        scheduleDocument: sampleDocument({ annotations: [comment] }),
        rowTop: () => 0,
        rowHeight: () => 40,
      }),
    );
    const node = overlay as unknown as FakeSvgNode;
    const bubble = node.querySelector('[data-role="comment-bubble"]');
    expect(bubble).not.toBeNull();
    expect(node.querySelector('[data-role="comment-leader"]')).not.toBeNull();
    expect(node.querySelector('text')?.textContent).toBe('hello');
    // A pointer (finger) cursor advertises the bubble as selectable/draggable.
    expect(bubble?.getAttribute('cursor')).toBe('pointer');
    // No anchor handle unless the comment is selected.
    expect(node.querySelector('[data-role="comment-anchor-handle"]')).toBeNull();
  });

  it('draws a grabbable anchor handle when the comment is selected', () => {
    const comment: Annotation = {
      id: 'c1',
      annotationKind: 'callout-box',
      text: 'hello',
      anchorDate: '2026-01-05',
      anchorRowIndex: 0,
      bodyOffsetPx: { dx: 40, dy: -30 },
    } as unknown as Annotation;
    const overlay = SVG_G();
    new CommentLayer(overlay).render(
      makeRenderContext({
        scheduleDocument: sampleDocument({ annotations: [comment] }),
        selectedAnnotationId: 'c1',
        rowTop: () => 0,
        rowHeight: () => 40,
      }),
    );
    const node = overlay as unknown as FakeSvgNode;
    const handle = node.querySelector('[data-role="comment-anchor-handle"]');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-annotation-id')).toBe('c1');
    expect(handle?.getAttribute('cursor')).toBe('move');
  });
});

describe('HitTester', () => {
  const tester = new HitTester();
  const item = makeTask('a', { abbrev: 'LONGLABEL' });
  const placement = makePlacement('a', 100, 100, 80, 40);

  function ctxWith(over = {}) {
    return makeRenderContext({
      scheduleDocument: sampleDocument({ items: [item] }),
      placements: [placement],
      itemById: new Map<string, ScheduleItem>([['a', item]]),
      ...over,
    });
  }

  it('returns null over empty canvas', () => {
    expect(tester.hitTest(ctxWith(), 500, 500)).toBeNull();
  });

  it('returns a body hit for a point inside the bar', () => {
    expect(tester.hitTest(ctxWith(), 140, 120)).toEqual({ itemId: 'a', region: 'body' });
  });

  it('centers a task auto-label INSIDE the bar, so a point past the bar end hits nothing', () => {
    // Task auto labels now center inside the bar (item 2), so there is no side label
    // to the right of the bar end (x = 180) to fall back onto; the point is empty.
    expect(tester.hitTest(ctxWith(), 200, 120)).toBeNull();
    // A point in the bar's own body still resolves to a body (move) hit.
    expect(tester.hitTest(ctxWith(), 140, 120)).toEqual({ itemId: 'a', region: 'body' });
  });

  it('prioritizes a selected task fade handle over the body/edge', () => {
    const hit = tester.hitTest(ctxWith({ selectedItemIds: new Set(['a']) }), 101, 101);
    expect(hit).toEqual({ itemId: 'a', region: 'fade-in' });
  });

  it('returns an anchor-handle hit near a selected comment leader anchor', () => {
    const comment = {
      id: 'c1',
      annotationKind: 'callout-box',
      text: 'note',
      // Anchor on the epoch date at row 0 -> world (0, 20) under the identity test
      // transform; the bubble is offset far to the right so the two never overlap.
      anchorDate: '2026-01-01',
      anchorRowIndex: 0,
      bodyOffsetPx: { dx: 200, dy: 0 },
    } as unknown as Annotation;
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument({ annotations: [comment] }),
      selectedAnnotationId: 'c1',
      rowTop: () => 0,
      rowHeight: () => 40,
    });
    // Over the anchor point -> anchor handle; over the bubble body -> body.
    expect(tester.hitTestAnnotation(ctx, 0, 20)).toEqual({ annotationId: 'c1', region: 'anchor' });
    expect(tester.hitTestAnnotation(ctx, 205, 20)).toEqual({ annotationId: 'c1', region: 'body' });
  });

  it('does not report an anchor handle for an UNselected comment', () => {
    const comment = {
      id: 'c1',
      annotationKind: 'callout-box',
      text: 'note',
      anchorDate: '2026-01-01',
      anchorRowIndex: 0,
      bodyOffsetPx: { dx: 200, dy: 0 },
    } as unknown as Annotation;
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument({ annotations: [comment] }),
      selectedAnnotationId: null,
      rowTop: () => 0,
      rowHeight: () => 40,
    });
    // No selection -> the anchor handle is not drawn and not hit-testable.
    expect(tester.hitTestAnnotation(ctx, 0, 20)).toBeNull();
  });

  it('resolves a dependency line where no item sits', () => {
    const from = makePlacement('a', 100, 100, 80, 40);
    const to = makePlacement('b', 400, 100, 80, 40);
    const depItemA = makeTask('a');
    const depItemB = makeTask('b');
    const ctx = makeRenderContext({
      scheduleDocument: sampleDocument({
        items: [depItemA, depItemB],
        dependencies: [{ id: 'd1', fromItemId: 'a', fromAnchor: 5, toItemId: 'b', toAnchor: 3 }],
      }),
      placements: [from, to],
      itemById: new Map<string, ScheduleItem>([['a', depItemA], ['b', depItemB]]),
    });
    // No item glyph at (300,120), so item hit is null but the routed line is grabbable.
    expect(tester.hitTest(ctx, 300, 120)).toBeNull();
    // The connector's final segment enters the target center-left at y=120, so a point
    // on that horizontal run is on the routed polyline.
    expect(tester.hitTestDependency(ctx, 300, 120)).toBe('d1');
  });
});
