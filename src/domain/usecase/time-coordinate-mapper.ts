/**
 * UseCase layer: time <-> x coordinate mapping under anisotropic zoom
 * (ARCH-C-009, ADR-004). All functions are pure and side-effect free so they
 * can be unit-tested and reused for both on-screen rendering and export.
 *
 * The horizontal axis is governed solely by zoomX; the vertical axis (rows) is
 * governed by zoomY in the layout engine, keeping the two axes independent.
 */

import type { IsoDate } from '../model/schedule-model.js';

/** Milliseconds in one calendar day. */
const MILLIS_PER_DAY = 86_400_000;

/**
 * Base horizontal density in CSS pixels per day at zoomX = 1. World x for a
 * date is `daysSinceEpoch * BASE_PIXELS_PER_DAY * zoomX`.
 */
export const BASE_PIXELS_PER_DAY = 6;

/** Time-axis label granularity derived from the effective horizontal density. */
export type TimeGranularity = 'year' | 'year-month' | 'month-day';

/**
 * Parse an ISO date into whole days since the Unix epoch (UTC), avoiding
 * local-timezone drift by anchoring to midnight UTC.
 *
 * @param isoDate - ISO-8601 calendar date, e.g. "2026-07-18".
 * @returns Whole days since 1970-01-01 (can be negative).
 * @throws {RangeError} If the string is not a valid date.
 */
export function toDayNumber(isoDate: IsoDate): number {
  const millis = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(millis)) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }
  return Math.round(millis / MILLIS_PER_DAY);
}

/**
 * Convert a day number back into an ISO calendar date (UTC).
 *
 * @param dayNumber - Whole days since 1970-01-01.
 * @returns ISO-8601 date string.
 */
export function fromDayNumber(dayNumber: number): IsoDate {
  const iso = new Date(Math.round(dayNumber) * MILLIS_PER_DAY).toISOString();
  return iso.slice(0, 10);
}

/**
 * Effective horizontal density (pixels per day) at a given zoomX.
 *
 * @param zoomX - Horizontal zoom multiplier (> 0).
 * @returns Pixels per day.
 */
export function pixelsPerDay(zoomX: number): number {
  return BASE_PIXELS_PER_DAY * zoomX;
}

/**
 * Earliest date the timeline may be scrolled/panned to (fix: extend range back to
 * the year 2000). Independent of the document epoch: the horizontal scroll is
 * clamped so the left edge can reveal this date even when the epoch is later.
 */
export const MIN_TIMELINE_DATE: IsoDate = '2000-01-01';

/**
 * Latest date the timeline may be scrolled/panned to (a sane far-future bound so
 * panning right never runs off into unbounded blank space).
 */
export const MAX_TIMELINE_DATE: IsoDate = '2100-01-01';

/**
 * Minimum world-space scrollX that still keeps the left edge at/after
 * {@link MIN_TIMELINE_DATE}. Negative when the epoch is later than 2000 (world x 0
 * maps to the epoch), which is exactly what lets the user pan back before the epoch
 * to reach the year 2000.
 *
 * @param epochDate - The document time-axis origin (world x = 0).
 * @param zoomX - Horizontal zoom multiplier.
 * @returns The minimum permitted scrollX in world pixels.
 */
export function minTimelineScrollX(epochDate: IsoDate, zoomX: number): number {
  return dateToWorldX(MIN_TIMELINE_DATE, epochDate, zoomX);
}

/**
 * Maximum world-space scrollX that keeps the left edge at/before
 * {@link MAX_TIMELINE_DATE}.
 *
 * @param epochDate - The document time-axis origin (world x = 0).
 * @param zoomX - Horizontal zoom multiplier.
 * @returns The maximum permitted scrollX in world pixels.
 */
export function maxTimelineScrollX(epochDate: IsoDate, zoomX: number): number {
  return dateToWorldX(MAX_TIMELINE_DATE, epochDate, zoomX);
}

/**
 * Clamp a proposed horizontal scroll into the permitted timeline range
 * [{@link minTimelineScrollX}, {@link maxTimelineScrollX}].
 *
 * @param scrollX - The proposed scrollX in world pixels.
 * @param epochDate - The document time-axis origin.
 * @param zoomX - Horizontal zoom multiplier.
 * @returns The clamped scrollX.
 */
export function clampTimelineScrollX(scrollX: number, epochDate: IsoDate, zoomX: number): number {
  const min = minTimelineScrollX(epochDate, zoomX);
  const max = maxTimelineScrollX(epochDate, zoomX);
  return Math.min(Math.max(scrollX, min), Math.max(min, max));
}

/**
 * Map a date to its world-space x coordinate (before scroll is applied).
 *
 * @param isoDate - The date to place.
 * @param epochDate - Time-axis origin (maps to x = 0).
 * @param zoomX - Horizontal zoom multiplier.
 * @returns World x in CSS pixels.
 */
export function dateToWorldX(isoDate: IsoDate, epochDate: IsoDate, zoomX: number): number {
  const days = toDayNumber(isoDate) - toDayNumber(epochDate);
  return days * pixelsPerDay(zoomX);
}

/**
 * Inverse of {@link dateToWorldX}: map a world x back to the nearest date.
 *
 * @param worldX - World x in CSS pixels.
 * @param epochDate - Time-axis origin (x = 0).
 * @param zoomX - Horizontal zoom multiplier.
 * @returns The ISO date whose world x is closest to `worldX`.
 */
export function worldXToDate(worldX: number, epochDate: IsoDate, zoomX: number): IsoDate {
  const days = worldX / pixelsPerDay(zoomX);
  return fromDayNumber(toDayNumber(epochDate) + days);
}

/**
 * Derive the time-axis label granularity from zoomX. Monotonic: zooming in
 * (larger zoomX -> more pixels per day) reveals finer granularity, never
 * coarser.
 *
 * @param zoomX - Horizontal zoom multiplier.
 * @returns The appropriate label granularity.
 */
export function timeGranularity(zoomX: number): TimeGranularity {
  const density = pixelsPerDay(zoomX);
  if (density < 1) {
    return 'year';
  }
  if (density < 8) {
    return 'year-month';
  }
  return 'month-day';
}
