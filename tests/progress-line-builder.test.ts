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
  // TODO(IM2): the plan-only / actual-only split is deferred to IM2 (the actual-date
  // model has no per-item plan/actual discriminator). For IM1 only `none` (hide all)
  // vs show-all is honored, so the single-sided cases are skipped below.
  const plan = makeItem({ id: 'p' });
  const actual = makeItem({ id: 'a' });
  const untagged = makeItem({ id: 'u' });

  it('both shows every item', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], 'both').map((i) => i.id);
    expect(ids).toEqual(['p', 'a', 'u']);
  });

  it('undefined behaves like both', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], undefined).map((i) => i.id);
    expect(ids).toEqual(['p', 'a', 'u']);
  });

  it.skip('TODO(IM2): plan-only hides actual, keeps plan and untagged', () => {
    const ids = filterByPlanActualDisplay([plan, actual, untagged], 'plan-only').map((i) => i.id);
    expect(ids).toEqual(['p', 'u']);
  });

  it.skip('TODO(IM2): actual-only keeps only actual', () => {
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
  // TODO(IM3): CR-002 Part 3 moves the baseline out of the item (`previousPlan` removed)
  // into a separately-loaded reference document + gray underlay. collectPreviousPlanGhosts
  // is neutralized to [] until that loader lands, so the ghost assertions are skipped.
  it('collects no ghosts from items alone (baseline is a separate reference document)', () => {
    const changed = makeItem({ id: 'c' });
    const unchanged = makeItem({ id: 'n' });
    expect(collectPreviousPlanGhosts([changed, unchanged])).toHaveLength(0);
  });

  it.skip('TODO(IM3): emits a ghost for each item with a baseline (from the reference doc)', () => {
    const changed = makeItem({ id: 'c' });
    const ghosts = collectPreviousPlanGhosts([changed]);
    expect(ghosts).toHaveLength(1);
  });

  it.skip('TODO(IM3): preserves a null end date for a milestone baseline', () => {
    const milestone = makeItem({ id: 'm', itemKind: 'milestone', endDate: null });
    const ghosts = collectPreviousPlanGhosts([milestone]);
    expect(ghosts[0]!.endDate).toBeNull();
  });
});
