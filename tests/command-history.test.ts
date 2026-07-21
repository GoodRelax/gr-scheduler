import { describe, expect, it } from 'vitest';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import {
  createItemCommand,
  deleteItemsCommand,
  editPropertyCommand,
} from '../src/domain/command/commands.js';
import type { ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';

function milestone(id: string): ScheduleItem {
  return {
    id,
    rowId: 'row-0',
    itemKind: 'milestone',
    startDate: '2026-01-10',
    endDate: null,
    abbrev: id,
    importance: 1,
    milestoneShape: 'diamond',
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
  };
}

function baseDocument(): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'history-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 'section-0', name: 'S', order: 0, rowIds: ['row-0'] }],
    rows: [{ id: 'row-0', sectionId: 'section-0', classificationLabel: 'A', order: 0 }],
    items: [milestone('a')],
  };
}

describe('ScheduleStore command history', () => {
  it('applies a create command and grows the item set', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(createItemCommand(milestone('b')));
    expect(store.getDocument().items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('undo restores the prior state and redo re-applies it', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(createItemCommand(milestone('b')));
    expect(store.canUndo()).toBe(true);

    store.undo();
    expect(store.getDocument().items.map((item) => item.id)).toEqual(['a']);
    expect(store.canRedo()).toBe(true);

    store.redo();
    expect(store.getDocument().items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('supports multi-step undo/redo in history order', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(createItemCommand(milestone('b')));
    store.dispatch(createItemCommand(milestone('c')));
    store.dispatch(editPropertyCommand('a', { abbrev: 'renamed' }));

    store.undo(); // undo rename
    store.undo(); // undo create c
    expect(store.getDocument().items.map((item) => item.id)).toEqual(['a', 'b']);

    store.redo(); // redo create c
    expect(store.getDocument().items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('branching after an undo discards the abandoned redo future', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(createItemCommand(milestone('b')));
    store.undo(); // back to just [a], with [b-creation] on the redo stack
    expect(store.canRedo()).toBe(true);

    // A new command must clear the redo stack (branching).
    store.dispatch(createItemCommand(milestone('c')));
    expect(store.canRedo()).toBe(false);
    expect(store.getDocument().items.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('treats a no-op command as non-mutating (no history entry)', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(deleteItemsCommand(new Set(['does-not-exist'])));
    expect(store.canUndo()).toBe(false);
  });

  it('notifies subscribers on every change and stops after unsubscribe', () => {
    const store = new ScheduleStore(baseDocument());
    const seen: number[] = [];
    const unsubscribe = store.subscribe((document) => seen.push(document.items.length));

    store.dispatch(createItemCommand(milestone('b')));
    store.undo();
    unsubscribe();
    store.dispatch(createItemCommand(milestone('c')));

    expect(seen).toEqual([2, 1]);
  });

  it('replaceDocument clears all history', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(createItemCommand(milestone('b')));
    store.replaceDocument(baseDocument());
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
  });
});

describe('ScheduleStore content-change signal (CR-009 Part 3 / DEC-005 #3)', () => {
  it('fires once for a mutating dispatch, and undo and redo', () => {
    const store = new ScheduleStore(baseDocument());
    let contentChanges = 0;
    store.onContentChange(() => {
      contentChanges += 1;
    });

    // A content command (add item) re-stamps exactly once -- not a loop.
    store.dispatch(createItemCommand(milestone('b')));
    expect(contentChanges).toBe(1);

    // Undo and redo are content changes too (the document content moves).
    store.undo();
    expect(contentChanges).toBe(2);
    store.redo();
    expect(contentChanges).toBe(3);
  });

  it('does NOT fire for a no-op dispatch (nothing changed)', () => {
    const store = new ScheduleStore(baseDocument());
    let contentChanges = 0;
    store.onContentChange(() => {
      contentChanges += 1;
    });

    store.dispatch(deleteItemsCommand(new Set(['does-not-exist'])));
    expect(contentChanges).toBe(0);
  });

  it('does NOT fire for a no-op undo/redo when the stacks are empty', () => {
    const store = new ScheduleStore(baseDocument());
    let contentChanges = 0;
    store.onContentChange(() => {
      contentChanges += 1;
    });

    store.undo();
    store.redo();
    expect(contentChanges).toBe(0);
  });

  it('does NOT fire for replaceDocument (a file load is not an edit)', () => {
    const store = new ScheduleStore(baseDocument());
    let contentChanges = 0;
    store.onContentChange(() => {
      contentChanges += 1;
    });

    store.replaceDocument(baseDocument());
    expect(contentChanges).toBe(0);
  });

  it('does not recurse when a listener reacts by writing outside the command flow', () => {
    // A listener that does side-effect work (e.g. re-stamps a watermark in a
    // renderer's view state) must not re-trigger itself. Since the listener never
    // dispatches, exactly one content change yields exactly one notification.
    const store = new ScheduleStore(baseDocument());
    let contentChanges = 0;
    let sideEffectRuns = 0;
    store.onContentChange(() => {
      contentChanges += 1;
      // Simulate the re-stamp side effect: pure external write, no dispatch.
      sideEffectRuns += 1;
    });

    store.dispatch(createItemCommand(milestone('b')));
    expect(contentChanges).toBe(1);
    expect(sideEffectRuns).toBe(1);
  });

  it('stops notifying after unsubscribe', () => {
    const store = new ScheduleStore(baseDocument());
    let contentChanges = 0;
    const unsubscribe = store.onContentChange(() => {
      contentChanges += 1;
    });

    store.dispatch(createItemCommand(milestone('b')));
    unsubscribe();
    store.dispatch(createItemCommand(milestone('c')));
    expect(contentChanges).toBe(1);
  });
});
