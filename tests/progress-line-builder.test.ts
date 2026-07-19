import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  buildIlluminatedLine,
  collectPreviousPlanGhosts,
  filterByPlanActualDisplay,
  type RowProgressFront,
} from '../src/domain/usecase/progress-line-builder.js';
import { dateToWorldX } from '../src/domain/usecase/time-coordinate-mapper.js';
import { rowBandHeight, rowWorldY } from '../src/domain/usecase/layout-engine.js';

const EPOCH = '2026-01-01';

/** Minimal item factory keeping unrelated required fields valid. */
function makeItem(partial: Partial<ScheduleItem> & Pick<ScheduleItem, 'id'>): ScheduleItem {
  return {
    rowId: 'row-0',
    itemKind: 'task',
    startDate: '2026-02-01',
    endDate: '2026-02-10',
    abbrev: 'X',
    importance: 1,
    fillColor: '#000',
    strokeColor: '#000',
    ...partial,
  };
}

describe('plan/actual display filter (PLAN-L1-002)', () => {
  const plan = makeItem({ id: 'p', planActualKind: 'plan' });
  const actual = makeItem({ id: 'a', planActualKind: 'actual' });
  const untagged = makeItem({ id: 'u' }); // no planActualKind -> treated as plan

  it('both shows every item', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], 'both').map((i) => i.id);
    expect(ids).toEqual(['p', 'a', 'u']);
  });

  it('undefined behaves like both', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], undefined).map((i) => i.id);
    expect(ids).toEqual(['p', 'a', 'u']);
  });

  it('plan-only hides actual, keeps plan and untagged', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], 'plan-only').map((i) => i.id);
    expect(ids).toEqual(['p', 'u']);
  });

  it('actual-only keeps only actual', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], 'actual-only').map((i) => i.id);
    expect(ids).toEqual(['a']);
  });

  it('none hides everything (both toggles off, fix 8)', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], 'none').map((i) => i.id);
    expect(ids).toEqual([]);
  });
});

describe('illuminated (progress) line builder (PLAN-L1-003 / L2-001)', () => {
  const baseDate = '2026-03-01';
  const zoomX = 1;
  const zoomY = 1;

  // Row 0 delayed (front before base), row 1 on-time (front == base),
  // row 2 ahead (front after base).
  const fronts: RowProgressFront[] = [
    { rowIndex: 0, frontDate: '2026-02-20' }, // behind base -> past side
    { rowIndex: 1, frontDate: '2026-03-01' }, // on base axis
    { rowIndex: 2, frontDate: '2026-03-12' }, // ahead -> future side
  ];

  it('returns empty when there are no fronts', () => {
    expect(buildIlluminatedLine(baseDate, [], EPOCH, zoomX, zoomY)).toEqual([]);
  });

  it('produces a plain polyline: one vertex per row plus top/bottom base anchors', () => {
    const vertices = buildIlluminatedLine(baseDate, fronts, EPOCH, zoomX, zoomY);
    // fronts.length + 2 anchor vertices, no duplicated terminal-dot vertices.
    expect(vertices).toHaveLength(fronts.length + 2);
  });

  it('anchors the first and last vertex on the base-date axis', () => {
    const baseX = dateToWorldX(baseDate, EPOCH, zoomX);
    const vertices = buildIlluminatedLine(baseDate, fronts, EPOCH, zoomX, zoomY);
    expect(vertices[0]!.worldX).toBeCloseTo(baseX, 6);
    expect(vertices[vertices.length - 1]!.worldX).toBeCloseTo(baseX, 6);
    // Top anchor at first row top edge; bottom anchor at last row bottom edge.
    expect(vertices[0]!.worldY).toBeCloseTo(rowWorldY(0, zoomY), 6);
    expect(vertices[vertices.length - 1]!.worldY).toBeCloseTo(
      rowWorldY(2, zoomY) + rowBandHeight(zoomY),
      6,
    );
  });

  it('places delayed rows past the axis, on-time on it, ahead rows beyond it', () => {
    const baseX = dateToWorldX(baseDate, EPOCH, zoomX);
    const vertices = buildIlluminatedLine(baseDate, fronts, EPOCH, zoomX, zoomY);
    // vertices[0] is the top anchor; row vertices start at index 1.
    const delayed = vertices[1]!;
    const onTime = vertices[2]!;
    const ahead = vertices[3]!;
    expect(delayed.worldX).toBeLessThan(baseX);
    expect(onTime.worldX).toBeCloseTo(baseX, 6);
    expect(ahead.worldX).toBeGreaterThan(baseX);
  });

  it('sorts fronts by row index so vertices follow vertical order', () => {
    const shuffled: RowProgressFront[] = [fronts[2]!, fronts[0]!, fronts[1]!];
    const vertices = buildIlluminatedLine(baseDate, shuffled, EPOCH, zoomX, zoomY);
    const rowYs = vertices.slice(1, -1).map((v) => v.worldY);
    const sorted = [...rowYs].sort((a, b) => a - b);
    expect(rowYs).toEqual(sorted);
  });
});

describe('previous-plan ghost collection (PLAN-L1-004)', () => {
  it('emits a ghost only for items carrying a previousPlan', () => {
    const changed = makeItem({
      id: 'c',
      previousPlan: { startDate: '2026-01-20', endDate: '2026-01-30' },
    });
    const unchanged = makeItem({ id: 'n' });
    const ghosts = collectPreviousPlanGhosts([changed, unchanged]);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toMatchObject({
      itemId: 'c',
      startDate: '2026-01-20',
      endDate: '2026-01-30',
    });
  });

  it('preserves a null end date for a milestone previous plan', () => {
    const milestone = makeItem({
      id: 'm',
      itemKind: 'milestone',
      endDate: null,
      previousPlan: { startDate: '2026-01-15', endDate: null },
    });
    const ghosts = collectPreviousPlanGhosts([milestone]);
    expect(ghosts[0]!.endDate).toBeNull();
  });
});
