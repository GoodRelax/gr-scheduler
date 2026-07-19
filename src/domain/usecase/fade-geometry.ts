/**
 * UseCase layer: task-bar fade (trapezoid / parallelogram) geometry (ITEM fade
 * cross-fade). Pure and side-effect free so it is unit-testable and shared by the
 * renderer, the SVG exporter and the editing controller.
 *
 * A task can taper on its left (fade-in) and/or right (fade-out) so chained
 * hand-over tasks interlock without visual overlap: the previous task fades out
 * while the next fades in. When `fadeInDays === fadeOutDays > 0` the two slanted
 * edges are parallel and the shape is a PARALLELOGRAM; when both are 0 the shape
 * is a plain rectangle (identical to a non-fading bar).
 *
 * The four polygon vertices are authored in the fixed order the renderer expects:
 *   1. bottom-left  = (dayToX(start),               bottom)
 *   2. bottom-right = (dayToX(end - fadeOutDays),    bottom)
 *   3. top-right    = (dayToX(end),                  top)
 *   4. top-left     = (dayToX(start + fadeInDays),   top)
 * and the path closes back to vertex 1. `top` is the smaller y (screen up).
 */

/** A world-space polygon vertex (CSS pixels). */
export interface FadePoint {
  readonly x: number;
  readonly y: number;
}

/** Inputs describing a task's fade trapezoid in day-space plus a day->x mapper. */
export interface FadeTrapezoidInput {
  /** Task start as a whole day number (e.g. days since epoch). */
  readonly startDay: number;
  /** Task end as a whole day number (must be >= startDay for a real span). */
  readonly endDay: number;
  /** Requested left taper in days (clamped to a valid, non-crossing range). */
  readonly fadeInDays: number;
  /** Requested right taper in days (clamped to a valid, non-crossing range). */
  readonly fadeOutDays: number;
  /** Smaller-y (upper) edge of the drawn y-band. */
  readonly top: number;
  /** Larger-y (lower) edge of the drawn y-band. */
  readonly bottom: number;
  /** Maps a (possibly non-integer) day number to a world x coordinate. */
  readonly dayToX: (day: number) => number;
}

/**
 * Clamp a requested fade-in/fade-out pair so the trapezoid's top edge can never
 * invert or cross the bottom edge. Both values are forced non-negative; fade-in is
 * clamped into `[0, length]` and fade-out into `[0, length - fadeIn]`, so their
 * sum never exceeds the task length in days. When the requested pair already fits
 * it is returned unchanged (equal in/out is preserved, keeping a parallelogram).
 *
 * @param taskLengthDays - Whole-day span of the task (`end - start`).
 * @param fadeInDays - Requested left taper in days.
 * @param fadeOutDays - Requested right taper in days.
 * @returns The clamped, non-crossing fade pair.
 */
export function clampFadeDays(
  taskLengthDays: number,
  fadeInDays: number,
  fadeOutDays: number,
): { readonly fadeInDays: number; readonly fadeOutDays: number } {
  const length = Math.max(0, taskLengthDays);
  const clampedIn = Math.min(Math.max(0, fadeInDays), length);
  const clampedOut = Math.min(Math.max(0, fadeOutDays), length - clampedIn);
  return { fadeInDays: clampedIn, fadeOutDays: clampedOut };
}

/**
 * Whether a task carries any fade taper (either side > 0). Milestones never fade;
 * callers should gate on `itemKind === 'task'` before consulting this.
 *
 * @param fadeInDays - The item's fade-in days (undefined == 0).
 * @param fadeOutDays - The item's fade-out days (undefined == 0).
 * @returns True when at least one side tapers.
 */
export function hasFade(
  fadeInDays: number | undefined,
  fadeOutDays: number | undefined,
): boolean {
  return (fadeInDays ?? 0) > 0 || (fadeOutDays ?? 0) > 0;
}

/**
 * Compute the four fade-trapezoid vertices for a task, in the fixed vertex order
 * (bottom-left, bottom-right, top-right, top-left). The requested fade pair is
 * clamped first so the result is always a simple (non-self-intersecting) polygon:
 * a rectangle when both fades are 0, a parallelogram when they are equal and
 * positive, and a trapezoid otherwise.
 *
 * @param input - Day-space geometry plus a day->x mapper.
 * @returns Exactly four vertices ready to serialize as an SVG polygon.
 */
export function fadeTrapezoidPoints(input: FadeTrapezoidInput): readonly FadePoint[] {
  const { startDay, endDay, top, bottom, dayToX } = input;
  const { fadeInDays, fadeOutDays } = clampFadeDays(
    endDay - startDay,
    input.fadeInDays,
    input.fadeOutDays,
  );
  return [
    { x: dayToX(startDay), y: bottom }, // 1. bottom-left
    { x: dayToX(endDay - fadeOutDays), y: bottom }, // 2. bottom-right
    { x: dayToX(endDay), y: top }, // 3. top-right
    { x: dayToX(startDay + fadeInDays), y: top }, // 4. top-left
  ];
}

/** Clamp a number into `[min, max]`, tolerating an inverted (max < min) range. */
function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

/**
 * Map a fade-in corner drag (top-left vertex) to a whole-day fade-in value.
 * Dragging the corner RIGHT (a later pointer day) increases fade-in. The result
 * is rounded to whole days and clamped to `[0, lengthDays - currentFadeOutDays]`
 * so the taper never crosses the fade-out side.
 *
 * @param pointerDay - Day number under the pointer (from its world x).
 * @param startDay - The task's start day number.
 * @param lengthDays - The task's whole-day span (`end - start`).
 * @param currentFadeOutDays - The task's existing fade-out days.
 * @returns The clamped fade-in day count.
 */
export function fadeInDaysFromPointer(
  pointerDay: number,
  startDay: number,
  lengthDays: number,
  currentFadeOutDays: number,
): number {
  return clampRange(Math.round(pointerDay - startDay), 0, lengthDays - Math.max(0, currentFadeOutDays));
}

/**
 * Map a fade-out corner drag (bottom-right vertex) to a whole-day fade-out value.
 * Dragging the corner LEFT (an earlier pointer day) increases fade-out. Rounded to
 * whole days and clamped to `[0, lengthDays - currentFadeInDays]`.
 *
 * @param pointerDay - Day number under the pointer (from its world x).
 * @param endDay - The task's end day number.
 * @param lengthDays - The task's whole-day span (`end - start`).
 * @param currentFadeInDays - The task's existing fade-in days.
 * @returns The clamped fade-out day count.
 */
export function fadeOutDaysFromPointer(
  pointerDay: number,
  endDay: number,
  lengthDays: number,
  currentFadeInDays: number,
): number {
  return clampRange(Math.round(endDay - pointerDay), 0, lengthDays - Math.max(0, currentFadeInDays));
}

/**
 * Serialize fade points to an SVG `points` attribute value (space-separated
 * `x,y` pairs). Pure string builder, kept here so the renderer and exporter share
 * one formatting rule.
 *
 * @param points - The polygon vertices.
 * @returns The `points` attribute string.
 */
export function fadePointsToAttribute(points: readonly FadePoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
