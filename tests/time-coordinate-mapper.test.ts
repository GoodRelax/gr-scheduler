import { describe, expect, it } from 'vitest';
import {
  dateToWorldX,
  fromDayNumber,
  pixelsPerDay,
  timeGranularity,
  toDayNumber,
  worldXToDate,
} from '../src/domain/usecase/time-coordinate-mapper.js';

describe('time-coordinate-mapper', () => {
  it('round-trips date <-> world x across zoom levels', () => {
    const epoch = '2026-01-01';
    for (const zoomX of [0.25, 1, 4, 16]) {
      for (const date of ['2026-01-01', '2026-03-15', '2027-12-31']) {
        const worldX = dateToWorldX(date, epoch, zoomX);
        expect(worldXToDate(worldX, epoch, zoomX)).toBe(date);
      }
    }
  });

  it('maps the epoch to world x = 0', () => {
    expect(dateToWorldX('2026-01-01', '2026-01-01', 3)).toBe(0);
  });

  it('round-trips day-number conversions', () => {
    for (const date of ['1970-01-01', '2000-02-29', '2026-07-18']) {
      expect(fromDayNumber(toDayNumber(date))).toBe(date);
    }
  });

  it('scales pixels-per-day linearly with zoomX', () => {
    expect(pixelsPerDay(2)).toBe(pixelsPerDay(1) * 2);
  });

  it('derives coarser granularity when zoomed out, finer when zoomed in', () => {
    expect(timeGranularity(0.05)).toBe('year');
    expect(timeGranularity(1)).toBe('year-month');
    expect(timeGranularity(8)).toBe('month-day');
  });

  it('keeps granularity monotonic (never coarser as zoomX grows)', () => {
    const rank: Record<string, number> = { year: 0, 'year-month': 1, 'month-day': 2 };
    let previousRank = -1;
    for (const zoomX of [0.01, 0.1, 0.5, 1, 2, 4, 8, 32]) {
      const currentRank = rank[timeGranularity(zoomX)] ?? 0;
      expect(currentRank).toBeGreaterThanOrEqual(previousRank);
      previousRank = currentRank;
    }
  });
});
