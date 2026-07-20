import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  buildIlluminatedLine,
  collectPreviousPlanGhosts,
  computeProgressFrontDate,
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

describe('plan/actual display filter (PLAN-L1-002, actual-date model)', () => {
  // Under the actual-date model an item "has an actual side" iff actualStart is present.
  // plan-only keeps every item (all carry a plan span); actual-only keeps only items
  // with recorded actual dates.
  const planOnlyItem = makeItem({ id: 'p' });
  const withActual = makeItem({ id: 'a', actualStart: '2026-02-03' });
  const untagged = makeItem({ id: 'u' });

  it('both shows every item', () => {
    const ids = filterByPlanActualDisplay([planOnlyItem, withActual, untagged], 'both').map(
      (i) => i.id,
    );
    expect(ids).toEqual(['p', 'a', 'u']);
  });

  it('undefined behaves like both', () => {
    const ids = filterByPlanActualDisplay([planOnlyItem, withActual, untagged], undefined).map(
      (i) => i.id,
    );
    expect(ids).toEqual(['p', 'a', 'u']);
  });

  it('plan-only shows every item (all carry a planned span)', () => {
    const ids = filterByPlanActualDisplay([planOnlyItem, withActual, untagged], 'plan-only').map(
      (i) => i.id,
    );
    expect(ids).toEqual(['p', 'a', 'u']);
  });

  it('actual-only keeps only items with recorded actual dates', () => {
    const ids = filterByPlanActualDisplay([planOnlyItem, withActual, untagged], 'actual-only').map(
      (i) => i.id,
    );
    expect(ids).toEqual(['a']);
  });

  it('none hides everything (both toggles off, fix 8)', () => {
    const ids = filterByPlanActualDisplay([planOnlyItem, withActual, untagged], 'none').map(
      (i) => i.id,
    );
    expect(ids).toEqual([]);
  });
});

describe('progress front rule (PLAN-L2-001, 4-case MECE + milestone point)', () => {
  it('case 1: completed actual span interpolates on actualStart..actualEnd', () => {
    const front = computeProgressFrontDate(
      makeItem({
        id: 'c1',
        startDate: '2026-02-01',
        endDate: '2026-02-21',
        actualStart: '2026-02-05',
        actualEnd: '2026-02-15',
        progressRatio: 0.5,
      }),
    );
    // 2026-02-05 + 0.5 * (10 days) = 2026-02-10.
    expect(front).toBe('2026-02-10');
  });

  it('case 2: in progress interpolates on actualStart..endDate (Formula A)', () => {
    const front = computeProgressFrontDate(
      makeItem({
        id: 'c2',
        startDate: '2026-02-01',
        endDate: '2026-02-21',
        actualStart: '2026-02-05',
        actualEnd: null,
        progressRatio: 0.5,
      }),
    );
    // 2026-02-05 + 0.5 * (16 days to endDate) = 2026-02-13.
    expect(front).toBe('2026-02-13');
  });

  it('case 2 edge: clamps to actualStart when endDate <= actualStart', () => {
    const front = computeProgressFrontDate(
      makeItem({
        id: 'c2e',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
        actualStart: '2026-02-10',
        actualEnd: null,
        progressRatio: 0.9,
      }),
    );
    expect(front).toBe('2026-02-10');
  });

  it('case 3: plan-side progress interpolates on startDate..endDate', () => {
    const front = computeProgressFrontDate(
      makeItem({
        id: 'c3',
        startDate: '2026-02-01',
        endDate: '2026-02-11',
        progressRatio: 0.3,
      }),
    );
    // 2026-02-01 + 0.3 * (10 days) = 2026-02-04.
    expect(front).toBe('2026-02-04');
  });

  it('case 4: no actualStart and ratio absent yields no vertex', () => {
    const front = computeProgressFrontDate(
      makeItem({ id: 'c4a', startDate: '2026-02-01', endDate: '2026-02-11' }),
    );
    expect(front).toBeNull();
  });

  it('case 4 boundary: present-but-zero ratio yields no vertex (not case 3)', () => {
    const front = computeProgressFrontDate(
      makeItem({ id: 'c4b', startDate: '2026-02-01', endDate: '2026-02-11', progressRatio: 0 }),
    );
    expect(front).toBeNull();
  });

  it('milestone with an actual is a point at actualStart (no interpolation)', () => {
    const front = computeProgressFrontDate(
      makeItem({
        id: 'ms1',
        itemKind: 'milestone',
        endDate: null,
        startDate: '2026-02-01',
        actualStart: '2026-02-04',
        progressRatio: 0.5,
      }),
    );
    expect(front).toBe('2026-02-04');
  });

  it('milestone without an actual is a point at startDate', () => {
    const front = computeProgressFrontDate(
      makeItem({ id: 'ms2', itemKind: 'milestone', endDate: null, startDate: '2026-02-01' }),
    );
    expect(front).toBe('2026-02-01');
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
