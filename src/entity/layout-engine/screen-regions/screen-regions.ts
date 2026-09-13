// ScreenRegions: the rectangles the screen is divided into.
// @unit      UF-58   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRegions, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-35

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'

export interface ScreenRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface ScreenEnvironment {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

export interface ScreenRegions {
  readonly appHeader: ScreenRect
  readonly scheduleCanvas: ScreenRect
  readonly rowTitlePanel: ScreenRect
  readonly timeRuler: ScreenRect
  readonly propertiesPanel: ScreenRect
  readonly rowArea: ScreenRect
}

export type RegionName = keyof ScreenRegions | null

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

/** @purity pure */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
}

/** @purity pure */
export function regionsFromScreen(
  env: ScreenEnvironment,
  settings: DocumentSettings,
): ScreenRegions {
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
    timeRuler: rect(rowAreaX, canvas.y, rowAreaWidth, bandHeight),
    propertiesPanel,
    rowArea: rect(rowAreaX, rowAreaY, rowAreaWidth, rowAreaHeight),
  }
}

/** @purity pure */
export function regionAtPointer(regions: ScreenRegions, x: number, y: number): RegionName {
  for (const name of INNER_FIRST) {
    if (rectHoldsPoint(regions[name], x, y)) return name
  }
  return null
}
