import { describe, expect, it } from 'vitest';
import type { ViewState } from '../src/domain/model/schedule-model.js';
import { buildDateRuler, rulerTierCount } from '../src/domain/usecase/date-ruler.js';
import { DEFAULT_LEFT_PANE_WIDTH } from '../src/domain/usecase/left-pane-layout.js';

const EPOCH = '2026-01-01'; // a Thursday (UTC)

function view(partial: Partial<ViewState>): ViewState {
  return { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', ...partial };
}

/** Non-empty (kept) labels of a tier, in cell order. */
function keptLabels(cells: readonly { label: string }[]): string[] {
  return cells.map((cell) => cell.label).filter((label) => label.length > 0);
}

describe('date-ruler granularity follows the horizontal zoom (item25/26/50)', () => {
  it('shows a single YEAR tier when zoomed far out (density < 1 px/day)', () => {
    const ruler = buildDateRuler(EPOCH, view({ zoomX: 0.1 }), 600);
    expect(ruler.granularity).toBe('year');
    expect(ruler.tiers).toHaveLength(1);
    expect(ruler.tiers[0]?.unit).toBe('year');
    expect(ruler.tiers[0]?.cells.some((cell) => cell.label === '2026')).toBe(true);
  });

  it('shows YEAR + MONTH tiers at a medium zoom', () => {
    const ruler = buildDateRuler(EPOCH, view({ zoomX: 1 }), 600);
    expect(ruler.granularity).toBe('year-month');
    expect(ruler.tiers.map((tier) => tier.unit)).toEqual(['year', 'month']);
    expect(ruler.tiers[1]?.cells.some((cell) => cell.label === '01')).toBe(true);
  });

  it('shows THREE stacked tiers (year-month / day / weekday) when zoomed in', () => {
    // zoomX 5 -> 30 px/day: dense enough that every day and weekday label is kept.
    const ruler = buildDateRuler(EPOCH, view({ zoomX: 5 }), 200);
    expect(ruler.granularity).toBe('month-day');
    expect(ruler.tiers.map((tier) => tier.unit)).toEqual(['month', 'day', 'weekday']);
    // (a) year-month tier carries the year so the header reads "year + month".
    expect(ruler.tiers[0]?.cells.some((cell) => cell.label === '2026-01')).toBe(true);
    // (b) day tier holds bare day-of-month numbers (no weekday crammed in).
    const dayLabels = keptLabels(ruler.tiers[1]?.cells ?? []);
    expect(dayLabels.length).toBeGreaterThan(0);
    for (const label of dayLabels) {
      expect(label).toMatch(/^\d+$/);
    }
    expect(dayLabels).toContain('1');
    // (c) weekday tier holds the weekday names on their OWN row (no overlap).
    const weekdayLabels = keptLabels(ruler.tiers[2]?.cells ?? []);
    for (const label of weekdayLabels) {
      expect(label).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    }
    // 2026-01-01 is a Thursday.
    expect(weekdayLabels).toContain('Thu');
  });
});

describe('date-ruler density-aware LOD (no overlapping labels)', () => {
  it('keeps every day label when each day cell is wide enough', () => {
    // zoomX 5 -> 30 px/day (>= the 18px day-label minimum) so nothing is thinned.
    const ruler = buildDateRuler(EPOCH, view({ zoomX: 5 }), 400);
    const dayTier = ruler.tiers[1]?.cells ?? [];
    expect(dayTier.length).toBeGreaterThan(0);
    expect(dayTier.every((cell) => cell.label.length > 0)).toBe(true);
  });

  it('thins day labels and spaces the kept ones at least their min width apart', () => {
    // zoomX 1.5 -> 9 px/day: a bare day cell (9px) is narrower than the 18px label,
    // so labels must be thinned to avoid the day+weekday collision the user saw.
    const ruler = buildDateRuler(EPOCH, view({ zoomX: 1.5 }), 600);
    const dayCells = ruler.tiers[1]?.cells ?? [];
    const kept = dayCells.filter((cell) => cell.label.length > 0);
    const skipped = dayCells.filter((cell) => cell.label.length === 0);
    // Some labels are dropped (LOD is active) ...
    expect(skipped.length).toBeGreaterThan(0);
    // ... and consecutive kept labels never sit closer than the min readable width.
    const centers = kept
      .map((cell) => (cell.startScreenX + cell.endScreenX) / 2)
      .sort((a, b) => a - b);
    for (let i = 1; i < centers.length; i += 1) {
      expect((centers[i] ?? 0) - (centers[i - 1] ?? 0)).toBeGreaterThanOrEqual(17);
    }
  });
});

describe('rulerTierCount matches the granularity without building cells', () => {
  it('returns 1 / 2 / 3 for year / year-month / month-day zooms', () => {
    expect(rulerTierCount(0.1)).toBe(1);
    expect(rulerTierCount(1)).toBe(2);
    expect(rulerTierCount(5)).toBe(3);
  });
});

describe('date-ruler screen positioning', () => {
  it('places the epoch day at the frozen left-pane edge when unscrolled', () => {
    const ruler = buildDateRuler(EPOCH, view({ zoomX: 5 }), 200);
    // The day tier's "1" cell (2026-01-01) starts at the frozen pane edge.
    const firstDay = ruler.tiers[1]?.cells.find((cell) => cell.label === '1');
    expect(firstDay?.startScreenX).toBeCloseTo(DEFAULT_LEFT_PANE_WIDTH, 5);
  });

  it('shifts horizontally with scrollX (scrolls with the timeline)', () => {
    const unscrolled = buildDateRuler(EPOCH, view({ zoomX: 5 }), 200);
    const scrolled = buildDateRuler(EPOCH, view({ zoomX: 5, scrollX: 12 }), 200);
    // The SAME calendar day (2026-01-05, a Monday) moves left by exactly the scroll
    // delta on the weekday tier; both rulers keep it (dense zoom keeps all labels).
    const cellA = unscrolled.tiers[2]?.cells.find((cell) => cell.label === 'Mon');
    const cellB = scrolled.tiers[2]?.cells.find((cell) => cell.label === 'Mon');
    expect(cellA).toBeDefined();
    expect(cellB).toBeDefined();
    expect((cellA?.startScreenX ?? 0) - (cellB?.startScreenX ?? 0)).toBeCloseTo(12, 5);
  });

  it('is independent of vertical scroll (stays fixed on vertical pan)', () => {
    const a = buildDateRuler(EPOCH, view({ zoomX: 1, scrollY: 0 }), 600);
    const b = buildDateRuler(EPOCH, view({ zoomX: 1, scrollY: 999 }), 600);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
