/**
 * Unit coverage for the LINES / CURSOR / DEPENDENCY batch (pure-logic parts). The
 * ACTUAL rendered SVG DOM for each item (cursor guide colors/counts in both themes,
 * today-line stroke, live progress bend, link-mode + panel edge creation) is asserted
 * against the built app in tests/e2e/lines-cursor-dependency-batch.spec.ts; here the
 * pure domain the DOM behavior is built on is locked:
 *
 *  1. Cursor-guide / today-line stroke color constants.
 *  3. The progress line bends at the touched ITEM's vertical center, not the band center.
 *  4. Per-item dependency arrays project from the canonical edge list (1:1 / 1:n / n:1 /
 *     n:n), the rewire command updates BOTH endpoints undoably, and the arrays round-trip
 *     through the JSON codec (with dangling-ref repair).
 */

import { describe, expect, it } from 'vitest';
import {
  CURSOR_GUIDE_DOUBLE_LINE_COLOR,
  CURSOR_GUIDE_LINE_COLOR,
  TODAY_LINE_COLOR,
  type Dependency,
  type Row,
  type ScheduleDocument,
  type ScheduleItem,
  type ViewState,
} from '../src/domain/model/schedule-model.js';
import {
  buildIlluminatedLine,
  type RowProgressFront,
} from '../src/domain/usecase/progress-line-builder.js';
import { layoutRows } from '../src/domain/usecase/layout-engine.js';
import {
  DEFAULT_DEPENDENCY_FROM_ANCHOR,
  DEFAULT_DEPENDENCY_TO_ANCHOR,
  planPredecessorRewire,
  planSuccessorRewire,
  predecessorItemIds,
  projectItemDependencyArrays,
  successorItemIds,
} from '../src/domain/usecase/dependency-projection.js';
import {
  addDependencyCommand,
  rewireItemDependenciesCommand,
} from '../src/domain/command/commands.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

describe('item 1/2: cursor-guide and today-line stroke colors', () => {
  it('crosshair + single vertical use shocking pink; double vertical uses the shocking-green complement', () => {
    expect(CURSOR_GUIDE_LINE_COLOR).toBe('#FF1493');
    expect(CURSOR_GUIDE_DOUBLE_LINE_COLOR).toBe('#00EB6C');
    // The two accents are distinct so the span (double) guide never reads as the single.
    expect(CURSOR_GUIDE_LINE_COLOR).not.toBe(CURSOR_GUIDE_DOUBLE_LINE_COLOR);
  });

  it('the today line is a high-brightness blue', () => {
    expect(TODAY_LINE_COLOR).toBe('#1E90FF');
  });
});

describe('item 3: the progress line bends at the item vertical center, not the band center', () => {
  const epoch = '2026-01-01';
  const viewState: ViewState = { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' };
  const rows: Row[] = [{ id: 'r0', sectionId: 's0', classificationLabel: 'A', order: 0 }];
  const actual: ScheduleItem = {
    id: 'a0',
    rowId: 'r0',
    itemKind: 'task',
    startDate: '2026-02-01',
    endDate: '2026-02-11',
    abbrev: 'A',
    importance: 1,
    fillColor: '#0072b2',
    strokeColor: 'transparent',
    actualStart: '2026-02-01',
    progressRatio: 0.5,
  };

  it('places the per-row bend at the actual item placement center (within ~1px)', () => {
    const layout = layoutRows([actual], rows, epoch, viewState);
    const placement = layout.placements.find((candidate) => candidate.itemId === 'a0')!;
    const itemCenterY = placement.worldY + placement.worldHeight / 2;
    const bandCenterY = layout.geometry.rowTops[0]! + layout.geometry.rowHeights[0]! / 2;

    const fronts: RowProgressFront[] = [{ rowIndex: 0, frontDate: '2026-02-06' }];
    const vertices = buildIlluminatedLine(
      '2026-02-06',
      fronts,
      epoch,
      viewState.zoomX,
      viewState.zoomY,
      (rowIndex) => layout.geometry.rowTops[rowIndex]!,
      (rowIndex) => layout.geometry.rowHeights[rowIndex]!,
      () => itemCenterY,
    );
    // vertices: [top anchor, per-row bend, bottom anchor]. The bend is the middle one.
    expect(vertices).toHaveLength(3);
    expect(vertices[1]!.worldY).toBeCloseTo(itemCenterY, 1);
    // The fix matters: the item center is meaningfully ABOVE the old band center.
    expect(Math.abs(vertices[1]!.worldY - bandCenterY)).toBeGreaterThan(1);
    expect(itemCenterY).toBeLessThan(bandCenterY);
  });

  it('defaults to the band center when no item-center resolver is supplied (back-compat)', () => {
    const layout = layoutRows([actual], rows, epoch, viewState);
    const bandCenterY = layout.geometry.rowTops[0]! + layout.geometry.rowHeights[0]! / 2;
    const vertices = buildIlluminatedLine(
      '2026-02-06',
      [{ rowIndex: 0, frontDate: '2026-02-06' }],
      epoch,
      viewState.zoomX,
      viewState.zoomY,
      (rowIndex) => layout.geometry.rowTops[rowIndex]!,
      (rowIndex) => layout.geometry.rowHeights[rowIndex]!,
    );
    expect(vertices[1]!.worldY).toBeCloseTo(bandCenterY, 6);
  });
});

/** Three items on distinct rows, no dependencies. */
function threeItemDocument(): ScheduleDocument {
  const item = (id: string, rowId: string, day: string): ScheduleItem => ({
    id,
    rowId,
    itemKind: 'milestone',
    startDate: day,
    endDate: null,
    abbrev: id,
    importance: 1,
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
  });
  return {
    schemaVersion: 1,
    title: 'dep-arrays',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 's0', name: 'S', order: 0, rowIds: ['r0', 'r1', 'r2'] }],
    rows: [
      { id: 'r0', sectionId: 's0', classificationLabel: 'A', order: 0 },
      { id: 'r1', sectionId: 's0', classificationLabel: 'B', order: 1 },
      { id: 'r2', sectionId: 's0', classificationLabel: 'C', order: 2 },
    ],
    items: [item('SYS1', 'r0', '2026-02-01'), item('SYS2', 'r1', '2026-03-01'), item('SYS3', 'r2', '2026-04-01')],
    dependencies: [],
  };
}

describe('item 4: per-item dependency arrays project from the edge list', () => {
  it('adding an edge updates BOTH items arrays; removing updates both', () => {
    const store = new ScheduleStore(threeItemDocument());
    store.dispatch(
      addDependencyCommand({ id: 'd0', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS2', toAnchor: 3 }),
    );
    let deps = store.getDocument().dependencies;
    // from = predecessor, to = successor.
    expect(successorItemIds(deps, 'SYS1')).toEqual(['SYS2']);
    expect(predecessorItemIds(deps, 'SYS2')).toEqual(['SYS1']);

    store.undo();
    deps = store.getDocument().dependencies;
    expect(successorItemIds(deps, 'SYS1')).toEqual([]);
    expect(predecessorItemIds(deps, 'SYS2')).toEqual([]);
  });

  it('projects 1:n (one predecessor, two successors) and n:1 (two predecessors)', () => {
    const deps: Dependency[] = [
      { id: 'd0', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS2', toAnchor: 3 },
      { id: 'd1', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS3', toAnchor: 3 },
    ];
    // 1:n -- SYS1 has two successors.
    expect(successorItemIds(deps, 'SYS1')).toEqual(['SYS2', 'SYS3']);
    // n:1 -- SYS2 and SYS3 each have SYS1 as their sole predecessor.
    expect(predecessorItemIds(deps, 'SYS2')).toEqual(['SYS1']);
    expect(predecessorItemIds(deps, 'SYS3')).toEqual(['SYS1']);
  });

  it('projects n:n (SYS3 has two predecessors and no successors)', () => {
    const deps: Dependency[] = [
      { id: 'd0', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS3', toAnchor: 3 },
      { id: 'd1', fromItemId: 'SYS2', fromAnchor: 5, toItemId: 'SYS3', toAnchor: 3 },
    ];
    expect(projectItemDependencyArrays(deps, 'SYS3')).toEqual({
      predecessorItemIds: ['SYS1', 'SYS2'],
      successorItemIds: [],
    });
  });
});

describe('item 4: the panel rewire plan/command updates the edge list undoably', () => {
  it('planning predecessors wires the missing edges with default anchors', () => {
    const store = new ScheduleStore(threeItemDocument());
    const doc = store.getDocument();
    const validIds = new Set(doc.items.map((candidate) => candidate.id));
    let serial = 0;
    const plan = planPredecessorRewire(doc.dependencies, 'SYS2', ['SYS1', 'SYS3'], validIds, () => `e${serial++}`);
    expect(plan.addEdges).toHaveLength(2);
    expect(plan.removeEdgeIds).toHaveLength(0);
    expect(plan.addEdges[0]!.fromAnchor).toBe(DEFAULT_DEPENDENCY_FROM_ANCHOR);
    expect(plan.addEdges[0]!.toAnchor).toBe(DEFAULT_DEPENDENCY_TO_ANCHOR);

    store.dispatch(rewireItemDependenciesCommand(plan.addEdges, plan.removeEdgeIds));
    const deps = store.getDocument().dependencies;
    expect(predecessorItemIds(deps, 'SYS2')).toEqual(['SYS1', 'SYS3']);
    // Both endpoints stay consistent (SYS1 + SYS3 each gain SYS2 as a successor).
    expect(successorItemIds(deps, 'SYS1')).toEqual(['SYS2']);
    expect(successorItemIds(deps, 'SYS3')).toEqual(['SYS2']);

    store.undo();
    expect(store.getDocument().dependencies ?? []).toHaveLength(0);
  });

  it('rewiring to a smaller set removes the dropped edges in one undoable step', () => {
    const store = new ScheduleStore(threeItemDocument());
    store.dispatch(
      rewireItemDependenciesCommand(
        [
          { id: 'd0', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS2', toAnchor: 3 },
          { id: 'd1', fromItemId: 'SYS3', fromAnchor: 5, toItemId: 'SYS2', toAnchor: 3 },
        ],
        [],
      ),
    );
    expect(predecessorItemIds(store.getDocument().dependencies, 'SYS2')).toEqual(['SYS1', 'SYS3']);

    const doc = store.getDocument();
    const validIds = new Set(doc.items.map((candidate) => candidate.id));
    // Clear SYS3 -> keep only SYS1 as a predecessor.
    const plan = planPredecessorRewire(doc.dependencies, 'SYS2', ['SYS1'], validIds, () => 'x');
    expect(plan.removeEdgeIds).toEqual(['d1']);
    expect(plan.addEdges).toHaveLength(0);
    store.dispatch(rewireItemDependenciesCommand(plan.addEdges, plan.removeEdgeIds));
    expect(predecessorItemIds(store.getDocument().dependencies, 'SYS2')).toEqual(['SYS1']);
    expect(successorItemIds(store.getDocument().dependencies, 'SYS3')).toEqual([]);
  });

  it('ignores unknown (dangling) and self ids when planning a rewire', () => {
    const store = new ScheduleStore(threeItemDocument());
    const doc = store.getDocument();
    const validIds = new Set(doc.items.map((candidate) => candidate.id));
    const plan = planSuccessorRewire(doc.dependencies, 'SYS1', ['SYS1', 'GHOST', 'SYS2'], validIds, () => 'e0');
    // Self (SYS1) and unknown (GHOST) are dropped; only SYS2 survives.
    expect(plan.addEdges).toHaveLength(1);
    expect(plan.addEdges[0]!.toItemId).toBe('SYS2');
  });
});

describe('item 4: per-item dependency arrays round-trip through the JSON codec', () => {
  it('serializes the projected arrays and rebuilds the edges on import', () => {
    const store = new ScheduleStore(threeItemDocument());
    store.dispatch(
      rewireItemDependenciesCommand(
        [
          { id: 'd0', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS2', toAnchor: 3 },
          { id: 'd1', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS3', toAnchor: 3 },
        ],
        [],
      ),
    );
    const text = serializeScheduleDocument(store.getDocument());
    // The exported JSON carries the per-item arrays (AI / manual authoring contract).
    expect(text).toContain('"successorItemIds"');
    expect(text).toContain('"predecessorItemIds"');

    const restored = deserializeScheduleDocument(text);
    // The canonical edges survive and the projection is identical.
    expect(successorItemIds(restored.dependencies, 'SYS1')).toEqual(['SYS2', 'SYS3']);
    // The in-memory items carry NO derived arrays (no duplicate state).
    for (const item of restored.items) {
      const raw = item as unknown as Record<string, unknown>;
      expect(raw['predecessorItemIds']).toBeUndefined();
      expect(raw['successorItemIds']).toBeUndefined();
    }
  });

  it('reconstructs edges from arrays-only JSON (AI authoring) and repairs dangling refs', () => {
    const base = threeItemDocument();
    // Author arrays directly with NO dependencies edge list, plus a dangling ref.
    const raw = {
      ...base,
      dependencies: [],
      items: base.items.map((item) =>
        item.id === 'SYS2'
          ? { ...item, predecessorItemIds: ['SYS1', 'GHOST'], successorItemIds: [] }
          : { ...item, predecessorItemIds: [], successorItemIds: [] },
      ),
    };
    const restored = deserializeScheduleDocument(JSON.stringify(raw));
    // SYS1 -> SYS2 was reconstructed; GHOST (no such item) was dropped, not thrown.
    expect(predecessorItemIds(restored.dependencies, 'SYS2')).toEqual(['SYS1']);
    expect((restored.dependencies ?? []).some((edge) => edge.fromItemId === 'GHOST')).toBe(false);
    expect((restored.dependencies ?? [])).toHaveLength(1);
    expect(restored.dependencies![0]!.fromAnchor).toBe(DEFAULT_DEPENDENCY_FROM_ANCHOR);
  });

  it('does not duplicate an edge already present in both the edge list and the arrays', () => {
    const base = threeItemDocument();
    const raw = {
      ...base,
      dependencies: [{ id: 'd0', fromItemId: 'SYS1', fromAnchor: 5, toItemId: 'SYS2', toAnchor: 3 }],
      items: base.items.map((item) =>
        item.id === 'SYS2'
          ? { ...item, predecessorItemIds: ['SYS1'], successorItemIds: [] }
          : item.id === 'SYS1'
            ? { ...item, predecessorItemIds: [], successorItemIds: ['SYS2'] }
            : item,
      ),
    };
    const restored = deserializeScheduleDocument(JSON.stringify(raw));
    expect(restored.dependencies).toHaveLength(1);
  });
});
