/**
 * UseCase layer: the fixed top date-ruler model (ARCH-C-009 companion; item25 /
 * item26 / item50). Pure and side-effect free so the renderer can draw it and the
 * tests can assert granularity/labels without a DOM.
 *
 * The ruler shows one or more stacked tiers whose granularity follows the current
 * horizontal zoom (via {@link timeGranularity}):
 * - `year`        -> a single YEAR tier.
 * - `year-month`  -> a YEAR tier over a MONTH tier.
 * - `month-day`   -> THREE stacked tiers: (a) year-month, (b) day-of-month number,
 *   (c) weekday abbreviation. Splitting the day number and the weekday onto their
 *   OWN rows keeps the fine zoom readable and fixes the day+weekday collision that
 *   happened when both were crammed into one cell (user feedback / screenshot).
 *
 * Every cell is placed in SCREEN space (world x minus scroll plus the frozen
 * left-pane width) so the ruler scrolls and zooms horizontally with the timeline,
 * while the renderer pins it to the top so it stays visible on vertical scroll.
 *
 * Density-aware LOD: on the day and weekday tiers a single day cell can be only a
 * few pixels wide, so drawing every label would overlap into an unreadable blur.
 * Each of those tiers therefore keeps a label only every Nth day, where N is chosen
 * from the current pixels-per-day so consecutive KEPT labels never sit closer than
 * their minimum readable width. Thinned cells keep an empty label; the renderer
 * skips those, so text never overlaps at any zoom.
 */

import type { IsoDate, ViewState } from '../model/schedule-model.js';
import {
  pixelsPerDay,
  timeGranularity,
  toDayNumber,
  type TimeGranularity,
} from './time-coordinate-mapper.js';
import { resolveLeftPaneWidth } from './left-pane-layout.js';

/** Milliseconds in one calendar day. */
const MILLIS_PER_DAY = 86_400_000;

/** Abbreviated weekday names (UTC), index 0 = Sunday. */
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Upper bound on the number of cells generated for any one tier, a safety valve
 * against a pathological zoom/scroll producing an unbounded loop. In practice the
 * DAY tier is only generated when at least 8 px/day (month-day granularity), so a
 * realistic viewport yields a few hundred day cells at most.
 */
const MAX_CELLS_PER_TIER = 800;

/** The unit a ruler tier segments the time axis by. */
export type RulerUnit = 'year' | 'month' | 'day' | 'weekday';

/**
 * Minimum readable width in CSS pixels for a (up to two-digit) day-number label.
 * Kept labels on the day tier are spaced at least this far apart so their glyph
 * boxes never touch (density-aware LOD).
 */
const DAY_LABEL_MIN_PX = 22;

/**
 * Minimum readable width in CSS pixels for a three-letter weekday label. Wider than
 * the day-number minimum so the weekday tier thins a touch earlier.
 */
const WEEKDAY_LABEL_MIN_PX = 30;

/**
 * Choose the label stride (in days) so that KEPT labels are at least `minPx`
 * apart at the current density. Returns 1 (label every day) once each day cell is
 * wide enough to hold the label on its own.
 *
 * @param density - Pixels per day at the current horizontal zoom.
 * @param minPx - Minimum readable label width in CSS pixels.
 * @returns The stride in days between kept labels (>= 1).
 */
function labelStrideDays(density: number, minPx: number): number {
  if (density <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(minPx / density));
}

/** One labelled segment of a ruler tier, positioned in screen space. */
export interface RulerCell {
  /** The text shown in the cell (year, month, or day+weekday). */
  readonly label: string;
  /** Screen-space left x in CSS pixels (may be off-screen; caller clips). */
  readonly startScreenX: number;
  /** Screen-space right x in CSS pixels. */
  readonly endScreenX: number;
}

/** One horizontal band of the ruler, at a single granularity unit. */
export interface RulerTier {
  readonly unit: RulerUnit;
  readonly cells: readonly RulerCell[];
}

/** The full ruler model for the current view: a granularity plus stacked tiers. */
export interface DateRuler {
  readonly granularity: TimeGranularity;
  /** Top-to-bottom tiers (coarsest first). */
  readonly tiers: readonly RulerTier[];
}

/**
 * Number of stacked tiers the ruler renders at the given horizontal zoom, without
 * building the cells. The renderer multiplies this by the per-tier height to offset
 * the schedule content so the first row starts flush beneath the ruler (item: no
 * wasted band under the date ruler).
 *
 * @param zoomX - Horizontal zoom multiplier.
 * @returns 1 (year), 2 (year+month) or 3 (year-month / day / weekday).
 */
export function rulerTierCount(zoomX: number): number {
  switch (timeGranularity(zoomX)) {
    case 'year':
      return 1;
    case 'year-month':
      return 2;
    case 'month-day':
    default:
      return 3;
  }
}

/** Screen-space x of a whole day number under the current view state. */
function dayToScreenX(
  dayNumber: number,
  epochDay: number,
  viewState: ViewState,
  leftPaneWidth: number,
): number {
  return (dayNumber - epochDay) * pixelsPerDay(viewState.zoomX) - viewState.scrollX + leftPaneWidth;
}

/** UTC calendar parts of a day number. */
function partsOfDay(dayNumber: number): { year: number; month: number; day: number; weekday: number } {
  const date = new Date(dayNumber * MILLIS_PER_DAY);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(), // 0-based
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

/** Day number of the first day of the given UTC year. */
function firstDayOfYear(year: number): number {
  return Math.round(Date.UTC(year, 0, 1) / MILLIS_PER_DAY);
}

/** Day number of the first day of the given UTC month (month is 0-based). */
function firstDayOfMonth(year: number, month: number): number {
  return Math.round(Date.UTC(year, month, 1) / MILLIS_PER_DAY);
}

/** Build the coarse YEAR tier spanning [leftDay, rightDay]. */
function buildYearTier(
  leftDay: number,
  rightDay: number,
  epochDay: number,
  viewState: ViewState,
  leftPaneWidth: number,
): RulerTier {
  const cells: RulerCell[] = [];
  const startYear = partsOfDay(leftDay).year;
  const endYear = partsOfDay(rightDay).year;
  for (let year = startYear; year <= endYear && cells.length < MAX_CELLS_PER_TIER; year += 1) {
    const cellStartDay = firstDayOfYear(year);
    const cellEndDay = firstDayOfYear(year + 1);
    cells.push({
      label: String(year),
      startScreenX: dayToScreenX(cellStartDay, epochDay, viewState, leftPaneWidth),
      endScreenX: dayToScreenX(cellEndDay, epochDay, viewState, leftPaneWidth),
    });
  }
  return { unit: 'year', cells };
}

/** Build the MONTH tier spanning [leftDay, rightDay]. */
function buildMonthTier(
  leftDay: number,
  rightDay: number,
  epochDay: number,
  viewState: ViewState,
  leftPaneWidth: number,
  withYear: boolean,
): RulerTier {
  const cells: RulerCell[] = [];
  const start = partsOfDay(leftDay);
  let year = start.year;
  let month = start.month;
  while (cells.length < MAX_CELLS_PER_TIER) {
    const cellStartDay = firstDayOfMonth(year, month);
    const cellEndDay = firstDayOfMonth(year, month + 1);
    if (cellStartDay > rightDay) {
      break;
    }
    const monthLabel = String(month + 1).padStart(2, '0');
    cells.push({
      label: withYear ? `${year}-${monthLabel}` : monthLabel,
      startScreenX: dayToScreenX(cellStartDay, epochDay, viewState, leftPaneWidth),
      endScreenX: dayToScreenX(cellEndDay, epochDay, viewState, leftPaneWidth),
    });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return { unit: 'month', cells };
}

/**
 * Build the fine DAY-NUMBER tier spanning [leftDay, rightDay]. Each cell is one
 * day; the day-of-month number is kept only every `stride` days (density-aware
 * LOD) so the numbers never overlap, while thinned cells carry an empty label.
 */
function buildDayNumberTier(
  leftDay: number,
  rightDay: number,
  epochDay: number,
  viewState: ViewState,
  leftPaneWidth: number,
  density: number,
): RulerTier {
  const stride = labelStrideDays(density, DAY_LABEL_MIN_PX);
  const cells: RulerCell[] = [];
  for (let day = leftDay; day <= rightDay && cells.length < MAX_CELLS_PER_TIER; day += 1) {
    const parts = partsOfDay(day);
    // Anchor the kept-label pattern to the absolute day number so it stays put as
    // the user scrolls (the same calendar day is always kept or always skipped).
    const keepLabel = ((day % stride) + stride) % stride === 0;
    cells.push({
      label: keepLabel ? String(parts.day) : '',
      startScreenX: dayToScreenX(day, epochDay, viewState, leftPaneWidth),
      endScreenX: dayToScreenX(day + 1, epochDay, viewState, leftPaneWidth),
    });
  }
  return { unit: 'day', cells };
}

/**
 * Build the WEEKDAY tier spanning [leftDay, rightDay]. Each cell is one day; the
 * weekday abbreviation is kept only every `stride` days so the three-letter names
 * never collide, with thinned cells carrying an empty label.
 */
function buildWeekdayTier(
  leftDay: number,
  rightDay: number,
  epochDay: number,
  viewState: ViewState,
  leftPaneWidth: number,
  density: number,
): RulerTier {
  const stride = labelStrideDays(density, WEEKDAY_LABEL_MIN_PX);
  const cells: RulerCell[] = [];
  for (let day = leftDay; day <= rightDay && cells.length < MAX_CELLS_PER_TIER; day += 1) {
    const parts = partsOfDay(day);
    const keepLabel = ((day % stride) + stride) % stride === 0;
    cells.push({
      label: keepLabel ? (WEEKDAY_NAMES[parts.weekday] ?? '') : '',
      startScreenX: dayToScreenX(day, epochDay, viewState, leftPaneWidth),
      endScreenX: dayToScreenX(day + 1, epochDay, viewState, leftPaneWidth),
    });
  }
  return { unit: 'weekday', cells };
}

/**
 * Build the date-ruler model for the current viewport (item25/26/50).
 *
 * @param epochDate - Time-axis origin (world x = 0).
 * @param viewState - Current zoom / scroll / left-pane width.
 * @param scheduleWidthPx - Width in CSS pixels of the schedule area (canvas width
 *   minus the frozen left pane).
 * @returns The ruler granularity plus its stacked, screen-positioned tiers.
 */
export function buildDateRuler(
  epochDate: IsoDate,
  viewState: ViewState,
  scheduleWidthPx: number,
): DateRuler {
  const granularity = timeGranularity(viewState.zoomX);
  const leftPaneWidth = resolveLeftPaneWidth(viewState.leftPaneWidth);
  const epochDay = toDayNumber(epochDate);
  const density = pixelsPerDay(viewState.zoomX);

  // Visible world-x window -> day range (padded by one unit each side so edge
  // cells are always drawn).
  const worldLeft = viewState.scrollX;
  const worldRight = viewState.scrollX + Math.max(0, scheduleWidthPx);
  const leftDay = Math.floor(epochDay + worldLeft / density) - 1;
  const rightDay = Math.ceil(epochDay + worldRight / density) + 1;

  const tiers: RulerTier[] = [];
  switch (granularity) {
    case 'year':
      tiers.push(buildYearTier(leftDay, rightDay, epochDay, viewState, leftPaneWidth));
      break;
    case 'year-month':
      tiers.push(buildYearTier(leftDay, rightDay, epochDay, viewState, leftPaneWidth));
      tiers.push(buildMonthTier(leftDay, rightDay, epochDay, viewState, leftPaneWidth, false));
      break;
    case 'month-day':
    default:
      // Three stacked tiers: year-month, day-of-month number, weekday (item26).
      tiers.push(buildMonthTier(leftDay, rightDay, epochDay, viewState, leftPaneWidth, true));
      tiers.push(buildDayNumberTier(leftDay, rightDay, epochDay, viewState, leftPaneWidth, density));
      tiers.push(buildWeekdayTier(leftDay, rightDay, epochDay, viewState, leftPaneWidth, density));
      break;
  }
  return { granularity, tiers };
}
