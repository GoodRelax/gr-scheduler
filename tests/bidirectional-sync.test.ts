import { describe, expect, it } from 'vitest';
import {
  editPropertyCommand,
  moveItemCommand,
  resizeItemCommand,
} from '../src/domain/command/commands.js';
import {
  dateToWorldX,
  pixelsPerDay,
  worldXToDate,
} from '../src/domain/usecase/time-coordinate-mapper.js';
import type { ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';

const EPOCH = '2026-01-01';

function taskItem(): ScheduleItem {
  return {
    id: 'task-1',
    rowId: 'row-0',
    itemKind: 'task',
    startDate: '2026-02-01',
    endDate: '2026-02-11',
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
    title: 'sync-fixture',
    epochDate: EPOCH,
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 'section-0', name: 'S', order: 0, rowIds: ['row-0', 'row-1'] }],
    rows: [
      { id: 'row-0', sectionId: 'section-0', classificationLabel: 'A', order: 0 },
      { id: 'row-1', sectionId: 'section-0', classificationLabel: 'B', order: 1 },
    ],
    items: [item],
  };
}

/** Convert a horizontal pixel drag into whole days the way the controller does. */
function pixelsToDays(deltaPx: number, zoomX: number): number {
  return Math.round(deltaPx / pixelsPerDay(zoomX));
}

describe('bidirectional coordinate <-> date sync', () => {
  it('dragging a task by N pixels shifts start and end by the mapped days', () => {
    const document = documentWith(taskItem());
    const deltaPx = 60; // at zoomX=1, pixelsPerDay = 6, so 60px => 10 days
    const deltaDays = pixelsToDays(deltaPx, 1);
    expect(deltaDays).toBe(10);

    const next = moveItemCommand('task-1', deltaDays).execute(document);
    const moved = next.items[0]!;
    expect(moved.startDate).toBe('2026-02-11');
    expect(moved.endDate).toBe('2026-02-21');
  });

  it('moving to a target row updates rowId while preserving duration', () => {
    const document = documentWith(taskItem());
    const next = moveItemCommand('task-1', 5, 'row-1').execute(document);
    const moved = next.items[0]!;
    expect(moved.rowId).toBe('row-1');
    expect(moved.startDate).toBe('2026-02-06');
    expect(moved.endDate).toBe('2026-02-16');
  });

  it('resizing the end edge changes only the end date by the mapped days', () => {
    const document = documentWith(taskItem());
    const deltaDays = pixelsToDays(-18, 1); // -3 days
    const next = resizeItemCommand('task-1', 'end', deltaDays).execute(document);
    const resized = next.items[0]!;
    expect(resized.startDate).toBe('2026-02-01');
    expect(resized.endDate).toBe('2026-02-08');
  });

  it('resizing the start edge is clamped to keep a positive duration', () => {
    const document = documentWith(taskItem());
    // Try to drag the start far past the end; it must clamp to end - 1 day.
    const next = resizeItemCommand('task-1', 'start', 100).execute(document);
    const resized = next.items[0]!;
    expect(resized.startDate).toBe('2026-02-10');
    expect(resized.endDate).toBe('2026-02-11');
  });

  it('editing start_date in the panel moves the item to the matching coordinate (reverse sync)', () => {
    const document = documentWith(taskItem());
    const next = editPropertyCommand('task-1', { startDate: '2026-03-01' }).execute(document);
    const edited = next.items[0]!;
    const worldX = dateToWorldX(edited.startDate, EPOCH, 1);
    // The coordinate the renderer would place it at maps back to the edited date.
    expect(worldXToDate(worldX, EPOCH, 1)).toBe('2026-03-01');
  });

  it('editing fade_in_days / fade_out_days on a task reshapes the bar (bidirectional with corner-drag)', () => {
    const document = documentWith(taskItem()); // 10-day span (Feb 1..11)
    const next = editPropertyCommand('task-1', { fadeInDays: 3, fadeOutDays: 2 }).execute(document);
    const edited = next.items[0]!;
    expect(edited.fadeInDays).toBe(3);
    expect(edited.fadeOutDays).toBe(2);
  });

  it('clamps an over-long fade so in + out never exceeds the task length', () => {
    const document = documentWith(taskItem()); // 10-day span
    const next = editPropertyCommand('task-1', { fadeInDays: 8, fadeOutDays: 8 }).execute(document);
    const edited = next.items[0]!;
    expect((edited.fadeInDays ?? 0) + (edited.fadeOutDays ?? 0)).toBeLessThanOrEqual(10);
  });

  it('drops fade fields requested on a milestone (fade is tasks-only)', () => {
    const milestone: ScheduleItem = { ...taskItem(), itemKind: 'milestone', endDate: null };
    const next = editPropertyCommand('task-1', { fadeInDays: 4 }).execute(documentWith(milestone));
    const edited = next.items[0]!;
    expect(edited.fadeInDays).toBeUndefined();
  });

  it('a milestone move keeps end null', () => {
    const milestone: ScheduleItem = { ...taskItem(), itemKind: 'milestone', endDate: null };
    const next = moveItemCommand('task-1', 4).execute(documentWith(milestone));
    const moved = next.items[0]!;
    expect(moved.endDate).toBeNull();
    expect(moved.startDate).toBe('2026-02-05');
  });
});
