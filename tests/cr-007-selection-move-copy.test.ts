import { describe, expect, it } from 'vitest';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import type {
  Dependency,
  ScheduleDocument,
  ScheduleItem,
} from '../src/domain/model/schedule-model.js';
import type { Annotation } from '../src/domain/model/annotation.js';
import { rebuildClassification } from '../src/domain/usecase/classification-tree.js';
import {
  collectSelectableIds,
  commentIdsOf,
  composeMarqueeSelection,
  selectedCommentIds,
  toggleSelectionMembership,
} from '../src/domain/usecase/selection-set.js';
import {
  applyAdjacentSiblingMove,
  deepestSharedClassificationLevel,
  resolveAdjacentSiblingMove,
} from '../src/domain/usecase/multi-item-move.js';
import {
  makeDependencyIdFactory,
  nextNumericSuffixName,
  partitionDependenciesForCopy,
} from '../src/domain/usecase/classification-copy.js';
import {
  bulkReassignClassificationCommand,
  bulkShiftItemsCommand,
  copyClassificationCommand,
  deleteSelectedTargetsCommand,
} from '../src/domain/command/commands.js';
import {
  deleteAnnotationsCommand,
  editCommentTextCommand,
  resolveCommentEditOutcome,
} from '../src/domain/command/annotation-commands.js';

/**
 * CR-007 pure-seam coverage: selection-set math (Part 1 + 4), deepest-shared-level
 * and adjacent-sibling resolution with edge stop (Part 2, D-5), comment text edit
 * commit/revert (Part 3, D-7), and classification copy suffix numbering + id-remap
 * dependency partition (Part 5, D-4). DOM-wired gestures are live-verified separately.
 */

/** A task item carrying an explicit three-level classification path. */
function item(id: string, major: string, middle?: string, minor?: string): ScheduleItem {
  return {
    id,
    rowId: 'pending',
    itemKind: 'task',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    abbrev: id,
    importance: 1,
    fillColor: '#4477aa',
    strokeColor: '#333333',
    majorCategory: major,
    ...(middle !== undefined ? { middleCategory: middle } : {}),
    ...(minor !== undefined ? { minorCategory: minor } : {}),
  };
}

function documentOf(
  items: ScheduleItem[],
  extras: Partial<ScheduleDocument> = {},
): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'cr-007-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items,
    dependencies: [],
    ...extras,
  };
}

function storeOf(items: ScheduleItem[], extras: Partial<ScheduleDocument> = {}): ScheduleStore {
  return new ScheduleStore(documentOf(items, extras), undefined, rebuildClassification);
}

function comment(id: string, text: string): Annotation {
  return {
    id,
    annotationKind: 'callout-box',
    text,
    anchorDate: '2026-01-02',
    anchorRowIndex: 0,
    bodyOffsetPx: { dx: 20, dy: -20 },
  };
}

// ---------------------------------------------------------------------------
// Part 1 + 4: selection-set math
// ---------------------------------------------------------------------------

describe('CR-007 Part 1: selection toggle math (D-6)', () => {
  it('adds an absent id and removes a present id without mutating the input', () => {
    const base = new Set(['a', 'b']);
    const added = toggleSelectionMembership(base, 'c');
    expect([...added].sort()).toEqual(['a', 'b', 'c']);
    const removed = toggleSelectionMembership(base, 'a');
    expect([...removed].sort()).toEqual(['b']);
    // Input untouched (immutability).
    expect([...base].sort()).toEqual(['a', 'b']);
  });

  it('composes a marquee: plain replaces, additive unions (so Ctrl+click can trim)', () => {
    const current = new Set(['a', 'b']);
    expect([...composeMarqueeSelection(current, ['x', 'y'], false)].sort()).toEqual(['x', 'y']);
    expect([...composeMarqueeSelection(current, ['b', 'c'], true)].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('CR-007 Part 4: select-all includes comments', () => {
  it('collects item ids AND comment ids into the union', () => {
    const doc = documentOf([item('i1', 'A'), item('i2', 'A')], {
      annotations: [comment('c1', 'hi'), comment('c2', 'yo')],
    });
    expect(commentIdsOf(doc).sort()).toEqual(['c1', 'c2']);
    const selectable = collectSelectableIds(doc);
    expect(selectable.itemIds.sort()).toEqual(['i1', 'i2']);
    expect(selectable.commentIds.sort()).toEqual(['c1', 'c2']);
    expect([...selectable.all].sort()).toEqual(['c1', 'c2', 'i1', 'i2']);
  });

  it('excludes rounded-box annotations (only comments are selectable comments)', () => {
    const box: Annotation = {
      id: 'box1',
      annotationKind: 'rounded-box',
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      topRowIndex: 0,
      bottomRowIndex: 1,
      strokeColor: '#000',
      cornerRadiusPx: 6,
    };
    const doc = documentOf([item('i1', 'A')], { annotations: [box, comment('c1', 'hi')] });
    expect(commentIdsOf(doc)).toEqual(['c1']);
  });
});

describe('CR-007 Part 4 (M2): delete acts on selected comments too', () => {
  it('deleteSelectedTargetsCommand removes BOTH selected items and comments (undoable)', () => {
    const store = storeOf([item('i1', 'A'), item('i2', 'A')], {
      annotations: [comment('c1', 'hi'), comment('c2', 'yo')],
    });
    // Simulate Ctrl+A (items + comments) then Delete.
    const selected = collectSelectableIds(store.getDocument()).all;
    store.dispatch(deleteSelectedTargetsCommand(selected));
    const doc = store.getDocument();
    expect(doc.items).toHaveLength(0);
    expect(doc.annotations ?? []).toHaveLength(0);
    store.undo();
    expect(store.getDocument().items).toHaveLength(2);
    expect(store.getDocument().annotations ?? []).toHaveLength(2);
  });

  it('deleteSelectedTargetsCommand deletes only the selected comment, keeping the rest', () => {
    const store = storeOf([item('i1', 'A')], {
      annotations: [comment('c1', 'hi'), comment('c2', 'yo')],
    });
    store.dispatch(deleteSelectedTargetsCommand(new Set(['c1'])));
    const remaining = store.getDocument().annotations ?? [];
    expect(remaining.map((a) => a.id)).toEqual(['c2']);
    // Item untouched.
    expect(store.getDocument().items).toHaveLength(1);
  });

  it('is a no-op (no history) when no id matches', () => {
    const store = storeOf([item('i1', 'A')], { annotations: [comment('c1', 'hi')] });
    store.dispatch(deleteSelectedTargetsCommand(new Set(['nope'])));
    expect(store.canUndo()).toBe(false);
  });

  it('deleteAnnotationsCommand removes every matching comment (undoable)', () => {
    const store = storeOf([item('i1', 'A')], {
      annotations: [comment('c1', 'a'), comment('c2', 'b'), comment('c3', 'c')],
    });
    store.dispatch(deleteAnnotationsCommand(new Set(['c1', 'c3'])));
    expect((store.getDocument().annotations ?? []).map((a) => a.id)).toEqual(['c2']);
    store.undo();
    expect((store.getDocument().annotations ?? []).map((a) => a.id)).toEqual(['c1', 'c2', 'c3']);
  });
});

describe('CR-007 Part 4 (M2): selection-highlight builder marks all selected comments', () => {
  it('highlights every comment in the selection set plus the singly-selected annotation', () => {
    const doc = documentOf([item('i1', 'A')], {
      annotations: [comment('c1', 'a'), comment('c2', 'b'), comment('c3', 'c')],
    });
    // c1 + c2 via the flat multi-selection, c3 via the single-annotation channel.
    const highlighted = selectedCommentIds(doc, new Set(['i1', 'c1', 'c2']), 'c3');
    expect([...highlighted].sort()).toEqual(['c1', 'c2', 'c3']);
  });

  it('returns an empty set when nothing is selected', () => {
    const doc = documentOf([item('i1', 'A')], { annotations: [comment('c1', 'a')] });
    expect(selectedCommentIds(doc, new Set(), null).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Part 2: deepest shared level + adjacent sibling (D-5)
// ---------------------------------------------------------------------------

describe('CR-007 Part 2: deepest shared classification level', () => {
  it('returns major when the selection shares only the major', () => {
    const items = [item('a', 'Dev', 'Frontend'), item('b', 'Dev', 'Backend')];
    expect(deepestSharedClassificationLevel(items)).toBe('major');
  });

  it('returns middle when it shares major+middle but differs in minor', () => {
    const items = [item('a', 'Dev', 'Frontend', 'UI'), item('b', 'Dev', 'Frontend', 'UX')];
    expect(deepestSharedClassificationLevel(items)).toBe('middle');
  });

  it('returns minor when it shares the full path', () => {
    const items = [item('a', 'Dev', 'Frontend', 'UI'), item('b', 'Dev', 'Frontend', 'UI')];
    expect(deepestSharedClassificationLevel(items)).toBe('minor');
  });

  it('returns null when the selection does not even share a major', () => {
    const items = [item('a', 'Dev'), item('b', 'Ops')];
    expect(deepestSharedClassificationLevel(items)).toBeNull();
    expect(deepestSharedClassificationLevel([])).toBeNull();
  });
});

describe('CR-007 Part 2: adjacent-sibling resolution + edge stop (D-5)', () => {
  it('moves to the adjacent SECTION (major) when sharing only major', () => {
    const store = storeOf([item('a', 'Alpha'), item('b', 'Beta'), item('c', 'Gamma')]);
    const doc = store.getDocument();
    const selected = doc.items.filter((it) => it.majorCategory === 'Alpha');
    const down = resolveAdjacentSiblingMove(doc, selected, 'down');
    expect(down).toEqual({ level: 'major', fromValue: 'Alpha', toValue: 'Beta', major: 'Alpha' });
    // First section moving up is a tree edge -> silent no-op (null).
    expect(resolveAdjacentSiblingMove(doc, selected, 'up')).toBeNull();
  });

  it('moves to the adjacent TRACK (middle) within the same major', () => {
    const store = storeOf([
      item('a', 'Dev', 'Frontend'),
      item('b', 'Dev', 'Backend'),
      item('c', 'Dev', 'Infra'),
    ]);
    const doc = store.getDocument();
    const selected = doc.items.filter((it) => it.middleCategory === 'Backend');
    const move = resolveAdjacentSiblingMove(doc, selected, 'up');
    expect(move).toEqual({
      level: 'middle',
      fromValue: 'Backend',
      toValue: 'Frontend',
      major: 'Dev',
    });
    expect(resolveAdjacentSiblingMove(doc, doc.items.filter((it) => it.middleCategory === 'Infra'), 'down')).toBeNull();
  });

  it('moves to the adjacent DETAIL (minor) within the same track', () => {
    const store = storeOf([
      item('a', 'Dev', 'Frontend', 'UI'),
      item('b', 'Dev', 'Frontend', 'UX'),
    ]);
    const doc = store.getDocument();
    const selected = doc.items.filter((it) => it.minorCategory === 'UI');
    const move = resolveAdjacentSiblingMove(doc, selected, 'down');
    expect(move).toEqual({
      level: 'minor',
      fromValue: 'UI',
      toValue: 'UX',
      major: 'Dev',
      middle: 'Frontend',
    });
  });

  it('applyAdjacentSiblingMove changes only the reassigned level', () => {
    const source = item('a', 'Dev', 'Frontend', 'UI');
    const moved = applyAdjacentSiblingMove(source, {
      level: 'middle',
      fromValue: 'Frontend',
      toValue: 'Backend',
      major: 'Dev',
    });
    expect(moved.middleCategory).toBe('Backend');
    expect(moved.majorCategory).toBe('Dev');
    expect(moved.minorCategory).toBe('UI');
  });
});

describe('CR-007 Part 2: bulk-move commands are undoable', () => {
  it('bulk date shift moves every selected item and reverts on undo', () => {
    const store = storeOf([item('a', 'A'), item('b', 'A'), item('c', 'A')]);
    store.dispatch(bulkShiftItemsCommand(new Set(['a', 'b']), 3));
    const shifted = store.getDocument().items;
    expect(shifted.find((it) => it.id === 'a')?.startDate).toBe('2026-01-04');
    expect(shifted.find((it) => it.id === 'b')?.endDate).toBe('2026-01-08');
    expect(shifted.find((it) => it.id === 'c')?.startDate).toBe('2026-01-01');
    store.undo();
    expect(store.getDocument().items.find((it) => it.id === 'a')?.startDate).toBe('2026-01-01');
  });

  it('bulk reclassify reassigns the selection and reverts on undo/redo', () => {
    const store = storeOf([
      item('a', 'Dev', 'Frontend'),
      item('b', 'Dev', 'Frontend'),
      item('c', 'Dev', 'Backend'),
    ]);
    const move = resolveAdjacentSiblingMove(
      store.getDocument(),
      store.getDocument().items.filter((it) => it.id === 'a' || it.id === 'b'),
      'down',
    );
    expect(move).not.toBeNull();
    store.dispatch(bulkReassignClassificationCommand(new Set(['a', 'b']), move as never));
    expect(store.getDocument().items.filter((it) => it.middleCategory === 'Backend').map((it) => it.id).sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
    store.undo();
    expect(store.getDocument().items.find((it) => it.id === 'a')?.middleCategory).toBe('Frontend');
    store.redo();
    expect(store.getDocument().items.find((it) => it.id === 'a')?.middleCategory).toBe('Backend');
  });

  it('a zero-delta bulk shift adds no history entry (no-op)', () => {
    const store = storeOf([item('a', 'A')]);
    store.dispatch(bulkShiftItemsCommand(new Set(['a']), 0));
    expect(store.canUndo()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Part 3: comment text edit (D-7)
// ---------------------------------------------------------------------------

describe('CR-007 Part 3: comment edit commit/revert (D-7)', () => {
  it('commit keeps edited text; cancel reverts to prior text', () => {
    expect(resolveCommentEditOutcome('commit', 'old', 'new')).toEqual({ commit: true, text: 'new' });
    expect(resolveCommentEditOutcome('cancel', 'old', 'new')).toEqual({ commit: false, text: 'old' });
    // A commit that did not change the text is reported as no-commit.
    expect(resolveCommentEditOutcome('commit', 'same', 'same')).toEqual({ commit: false, text: 'same' });
  });

  it('editCommentTextCommand is undoable and no-ops on unchanged text', () => {
    const store = storeOf([item('a', 'A')], { annotations: [comment('c1', 'first')] });
    store.dispatch(editCommentTextCommand('c1', 'second'));
    expect((store.getDocument().annotations?.[0] as { text: string }).text).toBe('second');
    store.undo();
    expect((store.getDocument().annotations?.[0] as { text: string }).text).toBe('first');
    // Re-dispatch the identical text -> no history entry.
    store.dispatch(editCommentTextCommand('c1', 'first'));
    expect(store.canUndo()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Part 5: classification copy suffix + dependency partition (D-4)
// ---------------------------------------------------------------------------

describe('CR-007 Part 5: numeric-suffix naming', () => {
  it('appends -1, then -2 when -1 is taken, stripping any prior suffix', () => {
    expect(nextNumericSuffixName('Body', [])).toBe('Body-1');
    expect(nextNumericSuffixName('Body', ['Body', 'Body-1'])).toBe('Body-2');
    expect(nextNumericSuffixName('Body-1', ['Body-1'])).toBe('Body-2');
  });
});

describe('CR-007 Part 5: dependency partition for a copy (D-4)', () => {
  it('reproduces internal edges remapped and drops boundary-crossing edges', () => {
    const idRemap = new Map<string, string>([
      ['i1', 'i1c'],
      ['i2', 'i2c'],
    ]);
    const deps: Dependency[] = [
      { id: 'd-internal', fromItemId: 'i1', fromAnchor: 5, toItemId: 'i2', toAnchor: 3 },
      { id: 'd-crossing', fromItemId: 'i1', fromAnchor: 5, toItemId: 'outside', toAnchor: 3 },
      { id: 'd-unrelated', fromItemId: 'x', fromAnchor: 5, toItemId: 'y', toAnchor: 3 },
    ];
    const makeId = makeDependencyIdFactory(new Set(deps.map((d) => d.id)));
    const result = partitionDependenciesForCopy(deps, idRemap, makeId);
    expect(result.internalCount).toBe(1);
    expect(result.crossingCount).toBe(1);
    expect(result.reproduced).toHaveLength(1);
    const reproduced = result.reproduced[0] as Dependency;
    expect(reproduced.fromItemId).toBe('i1c');
    expect(reproduced.toItemId).toBe('i2c');
    expect(reproduced.id).not.toBe('d-internal');
  });
});

describe('CR-007 Part 5: copy-classification command (end to end)', () => {
  it('copies a MAJOR with -1 suffix, cloned items, reproduced internal dep, dropped crossing dep', () => {
    const items = [item('i1', 'Body'), item('i2', 'Body'), item('o1', 'Other')];
    const dependencies: Dependency[] = [
      { id: 'dep-in', fromItemId: 'i1', fromAnchor: 5, toItemId: 'i2', toAnchor: 3 },
      { id: 'dep-cross', fromItemId: 'i1', fromAnchor: 5, toItemId: 'o1', toAnchor: 3 },
    ];
    const store = storeOf(items, { dependencies });
    store.dispatch(copyClassificationCommand({ major: 'Body' }));
    const doc = store.getDocument();

    // Section named with the numeric suffix, placed right after the original.
    expect(doc.sections.map((s) => s.name)).toEqual(['Body', 'Body-1', 'Other']);
    // Items cloned under the copy with fresh ids.
    const copied = doc.items.filter((it) => it.majorCategory === 'Body-1');
    expect(copied).toHaveLength(2);
    const copiedIds = new Set(copied.map((it) => it.id));
    expect(copiedIds.has('i1')).toBe(false);

    // Internal dep reproduced between the two COPIED items; crossing dep NOT reproduced.
    const reproduced = (doc.dependencies ?? []).filter(
      (d) => copiedIds.has(d.fromItemId) && copiedIds.has(d.toItemId),
    );
    expect(reproduced).toHaveLength(1);
    const crossingReproduced = (doc.dependencies ?? []).filter(
      (d) => copiedIds.has(d.fromItemId) && d.toItemId === 'o1',
    );
    expect(crossingReproduced).toHaveLength(0);

    store.undo();
    expect(store.getDocument().sections.map((s) => s.name)).toEqual(['Body', 'Other']);
  });

  it('copies a MIDDLE track as the next sibling with a numeric suffix', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend'), item('b', 'Dev', 'Backend')]);
    store.dispatch(copyClassificationCommand({ major: 'Dev', middle: 'Frontend' }));
    const middles = store
      .getDocument()
      .rows.filter((r) => r.majorLabel === 'Dev' && r.middleLabel !== undefined)
      .map((r) => r.middleLabel);
    expect(middles).toContain('Frontend-1');
    // Copy sits immediately after the original, before Backend.
    expect(middles.indexOf('Frontend')).toBeLessThan(middles.indexOf('Frontend-1'));
    expect(middles.indexOf('Frontend-1')).toBeLessThan(middles.indexOf('Backend'));
  });
});
