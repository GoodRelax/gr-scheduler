import { describe, expect, it } from 'vitest';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import { editPropertyCommand } from '../src/domain/command/commands.js';
import type { ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';

function milestone(): ScheduleItem {
  return {
    id: 'm0',
    rowId: 'r0',
    itemKind: 'milestone',
    startDate: '2026-01-10',
    endDate: null,
    abbrev: 'M',
    importance: 1,
    milestoneShape: 'diamond',
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
  };
}

function taskItem(): ScheduleItem {
  return {
    id: 't0',
    rowId: 'r0',
    itemKind: 'task',
    startDate: '2026-01-10',
    endDate: '2026-01-20',
    abbrev: 'T',
    importance: 1,
    taskShape: 'bar',
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
  };
}

function documentWith(item: ScheduleItem): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'invariant-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 's0', name: 'S', order: 0, rowIds: ['r0'] }],
    rows: [{ id: 'r0', sectionId: 's0', classificationLabel: 'A', order: 0 }],
    items: [item],
  };
}

describe('M-01: a no-op property edit adds no history', () => {
  it('editing a field to its current value leaves the undo stack empty', () => {
    const store = new ScheduleStore(documentWith(taskItem()));
    store.dispatch(editPropertyCommand('t0', { abbrev: 'T' })); // same value
    expect(store.canUndo()).toBe(false);
    // The document reference is unchanged (structural no-op).
    expect(store.getDocument().items[0]!.abbrev).toBe('T');
  });

  it('a genuine change still records exactly one history entry', () => {
    const store = new ScheduleStore(documentWith(taskItem()));
    store.dispatch(editPropertyCommand('t0', { abbrev: 'renamed' }));
    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(store.getDocument().items[0]!.abbrev).toBe('T');
  });

  it('the same edit dispatched twice records only one entry', () => {
    const store = new ScheduleStore(documentWith(taskItem()));
    store.dispatch(editPropertyCommand('t0', { assignee: 'alice' }));
    store.dispatch(editPropertyCommand('t0', { assignee: 'alice' })); // no-op second time
    store.undo();
    expect(store.getDocument().items[0]!.assignee).toBeUndefined();
    expect(store.canUndo()).toBe(false);
  });
});

describe('M-03: a milestone never gains a non-null endDate', () => {
  it('drops an endDate patch aimed at a milestone (invariant preserved)', () => {
    const store = new ScheduleStore(documentWith(milestone()));
    store.dispatch(editPropertyCommand('m0', { endDate: '2026-03-01' }));
    expect(store.getDocument().items[0]!.endDate).toBeNull();
    // The dropped-only patch is a no-op, so no spurious history either.
    expect(store.canUndo()).toBe(false);
  });

  it('still applies other fields in a mixed patch while dropping endDate', () => {
    const store = new ScheduleStore(documentWith(milestone()));
    store.dispatch(editPropertyCommand('m0', { endDate: '2026-03-01', abbrev: 'X' }));
    const edited = store.getDocument().items[0]!;
    expect(edited.endDate).toBeNull();
    expect(edited.abbrev).toBe('X');
  });

  it('allows a task to change its endDate normally', () => {
    const store = new ScheduleStore(documentWith(taskItem()));
    store.dispatch(editPropertyCommand('t0', { endDate: '2026-01-25' }));
    expect(store.getDocument().items[0]!.endDate).toBe('2026-01-25');
  });
});
