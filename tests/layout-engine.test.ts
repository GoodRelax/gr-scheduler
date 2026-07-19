import { describe, expect, it } from 'vitest';
import { layoutItems, rowWorldY, BASE_ROW_HEIGHT } from '../src/domain/usecase/layout-engine.js';
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
