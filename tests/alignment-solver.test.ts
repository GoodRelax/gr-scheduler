import { describe, expect, it } from 'vitest';
import {
  collectStartDateBaselinesX,
  snapToNearestBaseline,
  DEFAULT_SNAP_THRESHOLD_PX,
} from '../src/domain/usecase/alignment-solver.js';
import { dateToWorldX } from '../src/domain/usecase/time-coordinate-mapper.js';
import type { ScheduleItem } from '../src/domain/model/schedule-model.js';

function task(id: string, startDate: string): ScheduleItem {
  return {
    id,
    rowId: 'row-0',
    itemKind: 'task',
    startDate,
    endDate: '2026-06-01',
    abbrev: id,
    importance: 1,
    taskShape: 'bar',
    fillColor: '#0072b2',
    strokeColor: '#4d4d4d',
  };
}

describe('alignment-solver: snapToNearestBaseline', () => {
  it('snaps to a baseline within the threshold', () => {
    const result = snapToNearestBaseline(100, [96, 130], DEFAULT_SNAP_THRESHOLD_PX);
    expect(result.snapped).toBe(true);
    expect(result.value).toBe(96);
    expect(result.baseline).toBe(96);
  });

  it('does not snap when every baseline is beyond the threshold', () => {
    const result = snapToNearestBaseline(100, [90, 130], DEFAULT_SNAP_THRESHOLD_PX);
    expect(result.snapped).toBe(false);
    expect(result.value).toBe(100);
    expect(result.baseline).toBeNull();
  });

  it('chooses the nearest baseline when several are within the threshold', () => {
    const result = snapToNearestBaseline(100, [96, 103], DEFAULT_SNAP_THRESHOLD_PX);
    expect(result.value).toBe(103);
  });

  it('snaps exactly at the threshold boundary (inclusive)', () => {
    const result = snapToNearestBaseline(100, [100 + DEFAULT_SNAP_THRESHOLD_PX], DEFAULT_SNAP_THRESHOLD_PX);
    expect(result.snapped).toBe(true);
  });
});

describe('alignment-solver: collectStartDateBaselinesX', () => {
  it('collects distinct same-start-date x baselines excluding the dragged item', () => {
    const items = [
      task('dragged', '2026-02-01'),
      task('other-1', '2026-03-01'),
      task('other-2', '2026-03-01'), // shares a start date with other-1
      task('other-3', '2026-04-01'),
    ];
    const baselines = collectStartDateBaselinesX(items, 'dragged', '2026-01-01', 1);
    expect(baselines).toEqual([
      dateToWorldX('2026-03-01', '2026-01-01', 1),
      dateToWorldX('2026-04-01', '2026-01-01', 1),
    ]);
  });

  it('lets a dragged item snap onto a sibling sharing a start date', () => {
    const epoch = '2026-01-01';
    const items = [task('dragged', '2026-02-27'), task('anchor', '2026-03-01')];
    const baselines = collectStartDateBaselinesX(items, 'dragged', epoch, 1);
    const proposed = dateToWorldX('2026-02-28', epoch, 1); // one day short of the anchor
    const result = snapToNearestBaseline(proposed, baselines, DEFAULT_SNAP_THRESHOLD_PX);
    expect(result.snapped).toBe(true);
    expect(result.value).toBe(dateToWorldX('2026-03-01', epoch, 1));
  });
});
