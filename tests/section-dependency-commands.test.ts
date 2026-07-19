import { describe, expect, it } from 'vitest';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import {
  addDependencyCommand,
  removeDependencyCommand,
  reorderSectionCommand,
  setSectionCollapsedCommand,
} from '../src/domain/command/commands.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';

function baseDocument(): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'section-dep-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [
      { id: 's0', name: 'S0', order: 0, rowIds: ['r0'], collapsed: false },
      { id: 's1', name: 'S1', order: 1, rowIds: ['r1'], collapsed: false },
    ],
    rows: [
      { id: 'r0', sectionId: 's0', classificationLabel: 'A', order: 0 },
      { id: 'r1', sectionId: 's1', classificationLabel: 'B', order: 0 },
    ],
    items: [
      { id: 'it0', rowId: 'r0', itemKind: 'milestone', startDate: '2026-01-10', endDate: null, abbrev: 'a', importance: 1, fillColor: '#0072b2', strokeColor: '#4d4d4d' },
      { id: 'it1', rowId: 'r1', itemKind: 'milestone', startDate: '2026-02-10', endDate: null, abbrev: 'b', importance: 1, fillColor: '#0072b2', strokeColor: '#4d4d4d' },
    ],
    dependencies: [],
  };
}

describe('section commands are undoable via the store', () => {
  it('reorder-section is applied and reversible', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(reorderSectionCommand('s1', 0));
    expect(store.getDocument().sections.find((s) => s.id === 's1')?.order).toBe(0);

    store.undo();
    expect(store.getDocument().sections.find((s) => s.id === 's1')?.order).toBe(1);
  });

  it('set-section-collapsed hides then re-shows via undo/redo', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(setSectionCollapsedCommand('s0', true));
    expect(store.getDocument().sections.find((s) => s.id === 's0')?.collapsed).toBe(true);

    store.undo();
    expect(store.getDocument().sections.find((s) => s.id === 's0')?.collapsed).toBe(false);

    store.redo();
    expect(store.getDocument().sections.find((s) => s.id === 's0')?.collapsed).toBe(true);
  });

  it('a no-op collapse (already in that state) adds no history', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(setSectionCollapsedCommand('s0', false));
    expect(store.canUndo()).toBe(false);
  });
});

describe('dependency commands are undoable via the store', () => {
  it('add-dependency appends and undo removes it', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(
      addDependencyCommand({ id: 'd0', fromItemId: 'it0', fromAnchor: 7, toItemId: 'it1', toAnchor: 1 }),
    );
    expect(store.getDocument().dependencies).toHaveLength(1);

    store.undo();
    expect(store.getDocument().dependencies ?? []).toHaveLength(0);
  });

  it('ignores a self-dependency and duplicate dependency (no history)', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(
      addDependencyCommand({ id: 'self', fromItemId: 'it0', fromAnchor: 7, toItemId: 'it0', toAnchor: 1 }),
    );
    expect(store.canUndo()).toBe(false);

    store.dispatch(
      addDependencyCommand({ id: 'd0', fromItemId: 'it0', fromAnchor: 7, toItemId: 'it1', toAnchor: 1 }),
    );
    store.dispatch(
      addDependencyCommand({ id: 'd1', fromItemId: 'it0', fromAnchor: 7, toItemId: 'it1', toAnchor: 1 }),
    );
    expect(store.getDocument().dependencies).toHaveLength(1);
  });

  it('remove-dependency deletes by id and is a no-op when absent', () => {
    const store = new ScheduleStore(baseDocument());
    store.dispatch(
      addDependencyCommand({ id: 'd0', fromItemId: 'it0', fromAnchor: 7, toItemId: 'it1', toAnchor: 1 }),
    );
    store.dispatch(removeDependencyCommand('missing'));
    expect(store.getDocument().dependencies).toHaveLength(1);

    store.dispatch(removeDependencyCommand('d0'));
    expect(store.getDocument().dependencies).toHaveLength(0);
  });
});
