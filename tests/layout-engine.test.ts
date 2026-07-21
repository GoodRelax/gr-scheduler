import { describe, expect, it } from 'vitest';
import { layoutItems, layoutRows, rowWorldY, BASE_ROW_HEIGHT } from '../src/domain/usecase/layout-engine.js';
import type { Row, ScheduleItem, ViewState } from '../src/domain/model/schedule-model.js';

const EPOCH = '2026-01-01';
const VIEW: ViewState = { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' };

function task(id: string, rowId: string, startDate: string, endDate: string): ScheduleItem {
  return {
    id,
    rowId,
    itemKind: 'task',
    startDate,
    endDate,
    abbrev: id,
    importance: 1,
    taskShape: 'bar',
    fillColor: '#4477aa',
    strokeColor: '#333333',
  };
}

const ROWS: Row[] = [
  { id: 'row-0', sectionId: 'section-0', classificationLabel: 'A', order: 0 },
  { id: 'row-1', sectionId: 'section-0', classificationLabel: 'B', order: 1 },
];

describe('layout-engine', () => {
  it('places every item exactly once', () => {
    const items = [
      task('a', 'row-0', '2026-01-01', '2026-01-10'),
      task('b', 'row-0', '2026-02-01', '2026-02-10'),
      task('c', 'row-1', '2026-01-01', '2026-01-05'),
    ];
    const placements = layoutItems(items, ROWS, EPOCH, VIEW);
    expect(placements).toHaveLength(3);
    expect(new Set(placements.map((placement) => placement.itemId)).size).toBe(3);
  });

  it('stacks time-overlapping items on the same row into different lanes (no overlap)', () => {
    const items = [
      task('a', 'row-0', '2026-01-01', '2026-01-20'),
      task('b', 'row-0', '2026-01-10', '2026-01-30'),
      task('c', 'row-0', '2026-01-15', '2026-02-05'),
    ];
    const placements = layoutItems(items, ROWS, EPOCH, VIEW);
    const byLane = new Map<number, typeof placements>();
    for (const placement of placements) {
      const bucket = byLane.get(placement.laneIndex) ?? [];
      bucket.push(placement);
      byLane.set(placement.laneIndex, bucket);
    }
    // All three overlap in time, so each must occupy its own lane.
    expect(byLane.size).toBe(3);

    // Assert no two placements sharing a lane overlap horizontally.
    for (const bucket of byLane.values()) {
      const sorted = [...bucket].sort((left, right) => left.worldX - right.worldX);
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1]!;
        const current = sorted[index]!;
        expect(current.worldX).toBeGreaterThanOrEqual(previous.worldX + previous.worldWidth);
      }
    }
  });

  it('reuses a lane for non-overlapping items on the same row', () => {
    const items = [
      task('a', 'row-0', '2026-01-01', '2026-01-10'),
      task('b', 'row-0', '2026-03-01', '2026-03-10'),
    ];
    const placements = layoutItems(items, ROWS, EPOCH, VIEW);
    expect(new Set(placements.map((placement) => placement.laneIndex))).toEqual(new Set([0]));
  });

  it('separates rows vertically by the row band height', () => {
    expect(rowWorldY(0, 1)).toBe(0);
    expect(rowWorldY(1, 1)).toBe(BASE_ROW_HEIGHT);
    expect(rowWorldY(1, 2)).toBe(BASE_ROW_HEIGHT * 2);
  });
});

/** A point-in-time milestone item for the reversed-stacking check (CR-004 Part 1). */
function milestone(id: string, rowId: string, startDate: string): ScheduleItem {
  return {
    id,
    rowId,
    itemKind: 'milestone',
    startDate,
    endDate: null,
    abbrev: id,
    importance: 1,
    milestoneShape: 'diamond',
    fillColor: '#ffffff',
    strokeColor: '#333333',
  };
}

describe('layout-engine reversed sub-lane stacking (CR-004 Part 1, ALIGN-L2-004)', () => {
  it('assigns lanes from the BOTTOM UP so the earliest item sinks to the lowest lane', () => {
    // Four items all overlapping in time on one row, added earliest-start first.
    const items = [
      task('a', 'row-0', '2026-01-01', '2026-01-30'),
      task('b', 'row-0', '2026-01-02', '2026-01-30'),
      task('c', 'row-0', '2026-01-03', '2026-01-30'),
      task('d', 'row-0', '2026-01-04', '2026-01-30'),
    ];
    const { placements } = layoutRows(items, ROWS, EPOCH, VIEW);
    const laneOf = (id: string): number =>
      placements.find((placement) => placement.itemId === id)!.laneIndex;
    // Four distinct lanes, and the FIRST-placed item lands on the BOTTOM (highest index).
    expect(new Set(placements.map((p) => p.laneIndex))).toEqual(new Set([0, 1, 2, 3]));
    expect(laneOf('a')).toBe(3);
    expect(laneOf('b')).toBe(2);
    expect(laneOf('c')).toBe(1);
    expect(laneOf('d')).toBe(0);
    // A larger lane index is drawn lower (larger worldY): bottom-up stacking.
    expect(placements.find((p) => p.itemId === 'a')!.worldY).toBeGreaterThan(
      placements.find((p) => p.itemId === 'd')!.worldY,
    );
  });

  it('lands a later-overlapping milestone on the TOPMOST lane above the earlier tasks', () => {
    // Two tasks placed first, then a milestone that overlaps both -> milestone is the
    // last-assigned, so after the flip it rises to lane 0 (the top).
    const items = [
      task('t1', 'row-0', '2026-01-01', '2026-01-20'),
      task('t2', 'row-0', '2026-01-05', '2026-01-25'),
      milestone('m', 'row-0', '2026-01-10'),
    ];
    const { placements } = layoutRows(items, ROWS, EPOCH, VIEW);
    const milestonePlacement = placements.find((p) => p.itemId === 'm')!;
    expect(milestonePlacement.laneIndex).toBe(0);
    // Every task sits on a lower lane (larger index) than the top milestone.
    for (const id of ['t1', 't2']) {
      expect(placements.find((p) => p.itemId === id)!.laneIndex).toBeGreaterThan(0);
    }
  });
});
