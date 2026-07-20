import { describe, expect, it } from 'vitest';
import type { IsoDate, Row, ScheduleItem, ViewState } from '../src/domain/model/schedule-model.js';
import { layoutRows } from '../src/domain/usecase/layout-engine.js';
import { estimateInnerLeftLabelExtentPx } from '../src/adapters/render/item-geometry.js';

/**
 * CR-003 Part 2 label collision avoidance: a task's inner-left label may overflow the
 * bar; when its overflow reaches a LATER task in the same row/section, the layout
 * engine's pure lane-assignment pass shifts the later item DOWN into a new lane (the
 * minimal deterministic vertical offset), driven by an adapter-supplied label extent.
 */

const VIEW: ViewState = { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' };
const EPOCH = '2026-01-01' as IsoDate;

function row(id: string): Row {
  return { id, sectionId: 'sec-0', classificationLabel: id, order: 0 };
}

function task(id: string, startDate: string, endDate: string, abbrev: string): ScheduleItem {
  return {
    id,
    rowId: 'row-0',
    itemKind: 'task',
    startDate: startDate as IsoDate,
    endDate: endDate as IsoDate,
    abbrev,
    importance: 1,
    fillColor: '#4477aa',
    strokeColor: 'none',
  };
}

describe('label collision: an overflowing inner-left label shifts the later item down', () => {
  // A short bar (one day) whose long inner-left abbreviation overflows far to the
  // right, and a later short bar that starts only two days after A -- well inside A's
  // label overflow.
  const shortLongLabel = task('a', '2026-01-01', '2026-01-02', 'AAAAAAAAAAAAAAAAAAAA');
  const later = task('b', '2026-01-03', '2026-01-04', 'B');
  const rows = [row('row-0')];

  it('keeps both items in the SAME lane when labels are ignored (no estimator)', () => {
    const laid = layoutRows([shortLongLabel, later], rows, EPOCH, VIEW);
    const a = laid.placements.find((p) => p.itemId === 'a')!;
    const b = laid.placements.find((p) => p.itemId === 'b')!;
    expect(a.laneIndex).toBe(0);
    expect(b.laneIndex).toBe(0);
    expect(b.worldY).toBe(a.worldY);
  });

  it('shifts the LATER item to a lower lane when its predecessor label overflows onto it', () => {
    const laid = layoutRows([shortLongLabel, later], rows, EPOCH, VIEW, estimateInnerLeftLabelExtentPx);
    const a = laid.placements.find((p) => p.itemId === 'a')!;
    const b = laid.placements.find((p) => p.itemId === 'b')!;
    // A stays on the top lane; the later B is bumped down by the minimal one-lane offset.
    expect(a.laneIndex).toBe(0);
    expect(b.laneIndex).toBe(1);
    expect(b.worldY).toBeGreaterThan(a.worldY);
    // The row grew a lane to make room (deterministic vertical offset within the band).
    expect(laid.geometry.laneCounts[0]).toBe(2);
  });

  it('does NOT shift a later item whose bar clears the (short) label overflow', () => {
    // A one-character label barely overflows; a far-later item (a month out) is clear
    // of that overflow, so it stays on the top lane.
    const shortLabel = task('a', '2026-01-01', '2026-01-02', 'A');
    const farLater = task('b', '2026-02-01', '2026-02-05', 'B');
    const laid = layoutRows([shortLabel, farLater], rows, EPOCH, VIEW, estimateInnerLeftLabelExtentPx);
    const a = laid.placements.find((p) => p.itemId === 'a')!;
    const b = laid.placements.find((p) => p.itemId === 'b')!;
    expect(a.laneIndex).toBe(0);
    expect(b.laneIndex).toBe(0);
    expect(b.worldY).toBe(a.worldY);
  });

  it('is deterministic: repeated layouts yield identical placements', () => {
    const first = layoutRows([shortLongLabel, later], rows, EPOCH, VIEW, estimateInnerLeftLabelExtentPx);
    const second = layoutRows([shortLongLabel, later], rows, EPOCH, VIEW, estimateInnerLeftLabelExtentPx);
    expect(second.placements).toEqual(first.placements);
  });
});
