/**
 * UseCase layer: left classification pane sizing (CANVAS-L2-001).
 *
 * Pure helpers shared by the renderer (which offsets world content by the pane
 * width so items are not hidden behind the frozen pane) and the left-pane adapter
 * (which owns the resize divider). Keeping the clamp here makes the resizable-width
 * bound testable without a DOM.
 */

/** Default pane width in CSS pixels when a document has no stored width. */
export const DEFAULT_LEFT_PANE_WIDTH = 200;

/** Narrowest the pane may be dragged (keeps a label legible). */
export const MIN_LEFT_PANE_WIDTH = 64;

/** Widest the pane may be dragged (never eats more than this many pixels). */
export const MAX_LEFT_PANE_WIDTH = 520;

/**
 * Clamp a proposed pane width to the allowed range, additionally never letting
 * the pane exceed a fraction of the available canvas width so the schedule area
 * cannot be squeezed to nothing.
 *
 * @param proposedWidth - The width the user dragged to.
 * @param availableWidth - Total canvas width in pixels (0 = unknown).
 * @returns The clamped, safe pane width.
 */
export function clampLeftPaneWidth(proposedWidth: number, availableWidth = 0): number {
  const canvasCap = availableWidth > 0 ? availableWidth * 0.6 : MAX_LEFT_PANE_WIDTH;
  const upperBound = Math.min(MAX_LEFT_PANE_WIDTH, Math.max(MIN_LEFT_PANE_WIDTH, canvasCap));
  return Math.min(upperBound, Math.max(MIN_LEFT_PANE_WIDTH, proposedWidth));
}

/** Resolve the effective pane width from an optional stored value. */
export function resolveLeftPaneWidth(storedWidth: number | undefined): number {
  return storedWidth === undefined || Number.isNaN(storedWidth)
    ? DEFAULT_LEFT_PANE_WIDTH
    : storedWidth;
}
