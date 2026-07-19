/**
 * UseCase layer: today-line, dual-cursor span and rounded-box geometry
 * (ARCH-C-016). All functions are pure and side-effect free.
 *
 * The dual cursor measures a span in whole days between a base (基準 / primary)
 * and a diff (差分 / secondary) marker; the sign follows secondary - primary so
 * the caller can tell which way the diff lies. The day-count is displayed above
 * the secondary marker (mock feedback), which the renderer positions using
 * {@link cursorScreenX}.
 *
 * The rounded-box geometry keeps the enclosed region in world space (so it grows
 * with zoom) but returns the corner radius as a fixed SCREEN-pixel value, which
 * is what makes the corner rounding invariant to zoom (CURS-L2-001 / ADR-004).
 */

import type { RoundedBoxAnnotation } from '../model/annotation.js';
import type { IsoDate, ViewState } from '../model/schedule-model.js';
import { dateToWorldX, toDayNumber, worldXToDate } from './time-coordinate-mapper.js';
import { rowWorldY } from './layout-engine.js';
import { resolveLeftPaneWidth } from './left-pane-layout.js';

/**
 * Signed span in whole days from the base (primary) marker to the diff
 * (secondary) marker (CURS-L1-002). Positive means the diff marker is later than
 * the base; negative means earlier; zero means the same day.
 *
 * @param baseDate - The primary (基準) marker date.
 * @param diffDate - The secondary (差分) marker date.
 * @returns `diffDay - baseDay` in whole days.
 */
export function cursorSpanDays(baseDate: IsoDate, diffDate: IsoDate): number {
  return toDayNumber(diffDate) - toDayNumber(baseDate);
}

/**
 * Screen-space x of a date under the current view state. Mirrors the renderer's
 * content transform: world x, minus horizontal scroll, plus the frozen left-pane
 * width. Used to place the today line and both cursors (CURS-L1-001/002).
 *
 * @param atDate - The date to place.
 * @param epochDate - Time-axis origin.
 * @param viewState - Provides zoomX, scrollX and leftPaneWidth.
 * @returns Screen-space x in CSS pixels.
 */
export function cursorScreenX(
  atDate: IsoDate,
  epochDate: IsoDate,
  viewState: ViewState,
): number {
  const worldX = dateToWorldX(atDate, epochDate, viewState.zoomX);
  return worldX - viewState.scrollX + resolveLeftPaneWidth(viewState.leftPaneWidth);
}

/**
 * The whole-day span the `double-vertical` measurement guide reports between its
 * FIXED reference line (line-1, pinned to `referenceDate`) and its pointer-tracking
 * measuring line (line-2, at `pointerScreenX`). Positive means the pointer lies
 * LATER than the reference; negative earlier; zero the same day (cursor-guide span
 * rework). Pure: inverts the same screen<->world transform the renderer draws with.
 *
 * @param referenceDate - The fixed reference-line date (line-1).
 * @param pointerScreenX - The measuring line's screen-space x (line-2), CSS px.
 * @param epochDate - Time-axis origin.
 * @param viewState - Provides zoomX, scrollX and leftPaneWidth.
 * @returns `pointerDay - referenceDay` in whole days.
 */
export function cursorGuideSpanDays(
  referenceDate: IsoDate,
  pointerScreenX: number,
  epochDate: IsoDate,
  viewState: ViewState,
): number {
  const worldX = pointerScreenX - resolveLeftPaneWidth(viewState.leftPaneWidth) + viewState.scrollX;
  const pointerDate = worldXToDate(worldX, epochDate, viewState.zoomX);
  return cursorSpanDays(referenceDate, pointerDate);
}

/** The date under a screen-space x, inverting the renderer's content transform. */
export function dateAtCursorScreenX(
  screenX: number,
  epochDate: IsoDate,
  viewState: ViewState,
): IsoDate {
  const worldX = screenX - resolveLeftPaneWidth(viewState.leftPaneWidth) + viewState.scrollX;
  return worldXToDate(worldX, epochDate, viewState.zoomX);
}

/**
 * Human-readable day-span label the double-vertical guide draws (e.g. `"5 days"`,
 * `"1 day"`, `"0 days"`). ASCII-only and sign-free (the magnitude of the span); the
 * caller places it near the measuring line.
 *
 * @param spanDays - Signed day span (only its magnitude is shown).
 * @returns The label text.
 */
export function cursorGuideSpanLabel(spanDays: number): string {
  const magnitude = Math.abs(spanDays);
  return `${magnitude} ${magnitude === 1 ? 'day' : 'days'}`;
}

/** Alias with today-line intent (CURS-L1-001); identical math to {@link cursorScreenX}. */
export function todayLineScreenX(
  today: IsoDate,
  epochDate: IsoDate,
  viewState: ViewState,
): number {
  return cursorScreenX(today, epochDate, viewState);
}

/** A rounded-box laid out in screen space with a zoom-invariant corner radius. */
export interface RoundedBoxScreenRect {
  /** Screen-space left x in CSS pixels. */
  readonly x: number;
  /** Screen-space top y in CSS pixels. */
  readonly y: number;
  /** Screen-space width in CSS pixels (scales with zoomX). */
  readonly width: number;
  /** Screen-space height in CSS pixels (scales with zoomY). */
  readonly height: number;
  /** Corner radius in CSS pixels, INVARIANT to zoom (CURS-L2-001). */
  readonly cornerRadiusPx: number;
}

/**
 * Lay out a rounded-box enclosure in screen space (CURS-L1-007 / L2-001). The
 * rectangle position and size follow zoom/pan (they are derived from world
 * coordinates), while `cornerRadiusPx` is copied straight from the annotation
 * and therefore stays constant across every zoom level - the property the
 * zoom-invariance test asserts.
 *
 * @param box - The rounded-box annotation.
 * @param epochDate - Time-axis origin.
 * @param viewState - Provides zoom, scroll and left-pane width.
 * @param topOffsetPx - Extra downward screen offset applied to `y` so the box stays
 *   aligned with schedule rows that are themselves pushed below the date ruler
 *   (defaults to 0 for callers that render at the raw scroll origin).
 * @param rowBoundaryWorldY - Optional resolver for the world-space y of the boundary
 *   ABOVE a row index, so the box tracks variable-height rows (multi-lane stacking).
 *   Defaults to the uniform {@link rowWorldY} for callers with equal-height rows.
 * @returns The screen-space rectangle plus its zoom-invariant corner radius.
 */
export function roundedBoxScreenRect(
  box: RoundedBoxAnnotation,
  epochDate: IsoDate,
  viewState: ViewState,
  topOffsetPx = 0,
  rowBoundaryWorldY: (rowIndex: number) => number = (rowIndex) =>
    rowWorldY(rowIndex, viewState.zoomY),
): RoundedBoxScreenRect {
  const leftPaneWidth = resolveLeftPaneWidth(viewState.leftPaneWidth);
  const worldLeft = dateToWorldX(box.startDate, epochDate, viewState.zoomX);
  const worldRight = dateToWorldX(box.endDate, epochDate, viewState.zoomX);
  const worldTop = rowBoundaryWorldY(box.topRowIndex);
  const worldBottom = rowBoundaryWorldY(box.bottomRowIndex + 1);
  return {
    x: worldLeft - viewState.scrollX + leftPaneWidth,
    y: worldTop - viewState.scrollY + topOffsetPx,
    width: Math.max(0, worldRight - worldLeft),
    height: Math.max(0, worldBottom - worldTop),
    // Screen-space: independent of zoomX/zoomY (CURS-L2-001 / ADR-004).
    cornerRadiusPx: box.cornerRadiusPx,
  };
}
