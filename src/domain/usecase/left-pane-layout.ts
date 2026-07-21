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

/** Default right property-panel width in CSS pixels when none is stored. */
export const DEFAULT_PROPERTY_PANEL_WIDTH = 260;

/** Narrowest the property panel may be dragged (keeps its controls usable). */
export const MIN_PROPERTY_PANEL_WIDTH = 180;

/** Widest the property panel may be dragged (never eats more than this). */
export const MAX_PROPERTY_PANEL_WIDTH = 560;

/**
 * Clamp a proposed property-panel width to the allowed range, mirroring
 * {@link clampLeftPaneWidth}: never narrower than the control-legibility minimum,
 * never wider than the fixed maximum, and never more than a fraction of the
 * available canvas width so the schedule area is never squeezed to nothing.
 *
 * @param proposedWidth - The width the user dragged to.
 * @param availableWidth - Total canvas width in pixels (0 = unknown).
 * @returns The clamped, safe panel width.
 */
export function clampPropertyPanelWidth(proposedWidth: number, availableWidth = 0): number {
  const canvasCap = availableWidth > 0 ? availableWidth * 0.6 : MAX_PROPERTY_PANEL_WIDTH;
  const upperBound = Math.min(
    MAX_PROPERTY_PANEL_WIDTH,
    Math.max(MIN_PROPERTY_PANEL_WIDTH, canvasCap),
  );
  return Math.min(upperBound, Math.max(MIN_PROPERTY_PANEL_WIDTH, proposedWidth));
}

/** Resolve the effective property-panel width from an optional stored value. */
export function resolvePropertyPanelWidth(storedWidth: number | undefined): number {
  return storedWidth === undefined || Number.isNaN(storedWidth)
    ? DEFAULT_PROPERTY_PANEL_WIDTH
    : storedWidth;
}

/**
 * Approximate pane-tier text LINE HEIGHT in CSS pixels per UI font scale
 * (CR-004 Part 3, ALIGN-L2-005). The classification pane renders its labels at
 * ~0.8em of the S/M/L root font size (12 / 14 / 17 px) with a 1.4 line-height, so a
 * tier's rendered line grows with the chosen scale. The section tree stacks three
 * tiers (major / middle / minor) at fixed pixel offsets; those offsets MUST grow
 * with this line height, otherwise at a large font the top minor (小分類) row
 * overlaps the middle (中分類) row above it (the reported defect). Rounded up so the
 * offsets always clear the rendered text.
 */
const PANE_TIER_LINE_HEIGHT_PX: Readonly<Record<'S' | 'M' | 'L', number>> = {
  S: 14,
  M: 16,
  L: 19,
};

/**
 * Vertical offsets (from a category band's top) at which the left pane draws its
 * middle (中分類) and minor (小分類) labels, spaced by the font-scaled tier line
 * height so no tier overlaps the next (CR-004 Part 3, ALIGN-L2-005). The minor row
 * is placed exactly one tier line below the middle row, so the middle label's
 * rendered bottom never crosses the minor label's top at any font scale.
 *
 * @param fontScale - The active UI font scale (drives the tier line height).
 * @returns The middle / minor top offsets and the tier line height, all in CSS px.
 */
export function sectionRowLabelOffsets(fontScale: 'S' | 'M' | 'L'): {
  readonly middleTopPx: number;
  readonly minorTopPx: number;
  readonly lineHeightPx: number;
} {
  const lineHeightPx = PANE_TIER_LINE_HEIGHT_PX[fontScale];
  // Keep the middle tier clear of the (14px) section header line at small scales.
  const middleTopPx = Math.max(15, lineHeightPx);
  const minorTopPx = middleTopPx + lineHeightPx;
  return { middleTopPx, minorTopPx, lineHeightPx };
}
