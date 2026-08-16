// ScreenRegions -- public entry of this folder.
//
// @unit      UF-58   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRegions, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-35
//
// The rectangles the screen divides into -- every name is table T-103's -- and
// which one a pointer sits in. CP-35 names FR-051 as the rule these obey.
//
// LR-6 denies this layer the browser's own types, so ScreenRect is declared
// here rather than borrowed from the DOM. PI-35 says so in as many words.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'

/** A rectangle: its top-left corner and its size. PI-35. */
export interface ScreenRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * What the environment settles at BO-1 of table T-077. FR-051 forbids a setting
 * to hold either of the last two: both differ from one machine to the next, and
 * holding them makes the picture wrong the moment the document is opened
 * somewhere else.
 */
export interface ScreenEnvironment {
  /** The window, not the canvas: FR-051 puts the whole allocation in one place. */
  readonly width: number
  readonly height: number
  /**
   * Measured, not configured. `appHeaderMaxHeight` (S-116) caps it and is not
   * the height itself -- table T-212 is a table of upper bounds.
   */
  readonly appHeaderHeight: number
  /**
   * Half the environment's own default (FR-051). It takes width from the Row
   * Area: SC-4 keeps scrollbars showing at all times precisely because one that
   * came and went would change the canvas width and re-run the layout.
   */
  readonly scrollbarThickness: number
}

/** The parts of the screen. Every name is table T-103's. */
export interface ScreenRegions {
  /** U-31. */
  readonly appHeader: ScreenRect
  /** U-32 -- everything the header leaves. */
  readonly scheduleCanvas: ScreenRect
  /** U-22. Full height of the canvas: the PoC's corner block sits under the ruler. */
  readonly rowTitlePanel: ScreenRect
  /** U-19. Starts where the Row Title Panel ends (SC-2 scrolls it sideways only). */
  readonly timeRuler: ScreenRect
  /** U-25. */
  readonly propertiesPanel: ScreenRect
  /** U-50. */
  readonly rowArea: ScreenRect
}

/** Which part a pointer is in. `null` means outside the window. */
export type RegionName = keyof ScreenRegions | null

/**
 * The order regionAtPointer asks in: innermost first, so a point inside the
 * Row Area is not reported as the canvas that contains it. What no inner part
 * claims -- the padding and the scrollbar lanes -- falls through to the canvas.
 */
const INNER_FIRST = [
  'rowArea',
  'timeRuler',
  'rowTitlePanel',
  'propertiesPanel',
  'appHeader',
  'scheduleCanvas',
] as const

function rect(x: number, y: number, width: number, height: number): ScreenRect {
  return { x, y, width, height }
}

/**
 * Half-open on both axes, as R3.4 of the review standard asks: a point on the
 * right or bottom edge belongs to whatever comes next, so adjoining regions
 * never both claim it.
 *
 * Kept inside the folder: PI-35 declares four members and this is not one of
 * them, and Chapter 5.3 lets nothing outside read past the public entry.
 *
 * @purity pure
 */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
}

/**
 * Cuts the window into the parts of table T-103.
 *
 * The width of the Row Area is FR-052's arithmetic, verbatim: the canvas width
 * less `canvasPadding` (S-56), less the two panel widths, less the vertical
 * scrollbar. Its height is U-50's: the canvas less the Time Ruler band and the
 * padding, less the horizontal scrollbar that FR-051 adds.
 *
 * ⚠️ It does NOT clamp that width to zero. FR-052 makes "the Row Area's width
 * is greater than zero" the test a caller applies before accepting a pair of
 * panel widths, so a non-positive width here is the answer, not a fault.
 *
 * @purity pure
 */
export function regionsFromScreen(
  env: ScreenEnvironment,
  settings: DocumentSettings,
): ScreenRegions {
  // FR-051's RATIONALE caps the header at table T-212's value (MUST).
  const headerHeight = Math.min(env.appHeaderHeight, settings.appHeaderMaxHeight)

  const appHeader = rect(0, 0, env.width, headerHeight)
  const canvas = rect(0, headerHeight, env.width, env.height - headerHeight)

  const titleWidth = settings.rowTitlePanelWidth
  const propsWidth = settings.propertyPanelWidth
  const bandHeight = settings.rulerHeight
  const bar = env.scrollbarThickness

  // The Row Title Panel runs the full height of the canvas, so the corner where
  // it meets the ruler band belongs to the panel; the ruler starts to its right.
  const rowTitlePanel = rect(canvas.x, canvas.y, titleWidth, canvas.height)
  const propertiesPanel = rect(
    canvas.x + canvas.width - propsWidth,
    canvas.y,
    propsWidth,
    canvas.height,
  )

  // U-50 pins the Row Area's left edge to the panel's inside and its top to
  // below the ruler band, which leaves the padding and the two scrollbar lanes
  // on the right and the bottom.
  const rowAreaX = canvas.x + titleWidth
  const rowAreaY = canvas.y + bandHeight
  const rowAreaWidth = canvas.width - settings.canvasPadding - titleWidth - propsWidth - bar
  const rowAreaHeight = canvas.height - bandHeight - settings.canvasPadding - bar

  return {
    appHeader,
    scheduleCanvas: canvas,
    rowTitlePanel,
    // SC-2 slaves the ruler to the body sideways, so it spans the Row Area and
    // stops where the vertical scrollbar begins.
    timeRuler: rect(rowAreaX, canvas.y, rowAreaWidth, bandHeight),
    propertiesPanel,
    rowArea: rect(rowAreaX, rowAreaY, rowAreaWidth, rowAreaHeight),
  }
}

/**
 * Which part of the screen a pointer sits in, innermost first.
 *
 * @purity pure
 */
export function regionAtPointer(regions: ScreenRegions, x: number, y: number): RegionName {
  for (const name of INNER_FIRST) {
    if (rectHoldsPoint(regions[name], x, y)) return name
  }
  return null
}
