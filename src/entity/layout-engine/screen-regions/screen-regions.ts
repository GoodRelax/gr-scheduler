// ScreenRegions -- public entry of this folder.
//
// @unit      UF-58   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRegions, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-35
//
// CP-35. ScreenRect is declared here rather than borrowed from the DOM (LR-6).

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'

/** A rectangle: its top-left corner and its size. PI-35. */
export interface ScreenRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** What the environment settles at BO-1 of table T-077 (FR-051). */
export interface ScreenEnvironment {
  /** The window, not the canvas: FR-051 puts the whole allocation in one place. */
  readonly width: number
  readonly height: number
  /**
   * Measured, not configured. `appHeaderMaxHeight` (S-116) caps it and is not
   * the height itself -- table T-212 is a table of upper bounds.
   */
  readonly appHeaderHeight: number
  /** Half the environment's own default (FR-051). */
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

/** @purity pure */
function rect(x: number, y: number, width: number, height: number): ScreenRect {
  return { x, y, width, height }
}

/**
 * Half-open on both axes (R3.4), so adjoining regions never both claim an edge.
 * Not exported: PI-35 does not declare it.
 *
 * @purity pure
 */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
}

/**
 * Row Area width is FR-052's, height U-50's (FR-051).
 *
 * The width is not clamped to zero: FR-052 has the caller test for a positive
 * width before accepting panel widths, so a non-positive width is the answer.
 *
 * @purity pure
 */
export function regionsFromScreen(
  env: ScreenEnvironment,
  settings: DocumentSettings,
): ScreenRegions {
  // FR-051, table T-212
  const headerHeight = Math.min(env.appHeaderHeight, settings.appHeaderMaxHeight)

  const appHeader = rect(0, 0, env.width, headerHeight)
  const canvas = rect(0, headerHeight, env.width, env.height - headerHeight)

  const titleWidth = settings.rowTitlePanelWidth
  const propsWidth = settings.propertyPanelWidth
  const bandHeight = settings.rulerHeight
  const bar = env.scrollbarThickness

  const rowTitlePanel = rect(canvas.x, canvas.y, titleWidth, canvas.height)
  const propertiesPanel = rect(
    canvas.x + canvas.width - propsWidth,
    canvas.y,
    propsWidth,
    canvas.height,
  )

  const rowAreaX = canvas.x + titleWidth
  const rowAreaY = canvas.y + bandHeight
  const rowAreaWidth = canvas.width - settings.canvasPadding - titleWidth - propsWidth - bar
  const rowAreaHeight = canvas.height - bandHeight - settings.canvasPadding - bar

  return {
    appHeader,
    scheduleCanvas: canvas,
    rowTitlePanel,
    // SC-2
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
