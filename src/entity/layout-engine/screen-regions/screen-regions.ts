// ScreenRegions: the rectangles the screen is divided into.
// @unit      UF-58   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRegions, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-35

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../document-model/document-settings/document-settings'

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

// see FR-039, T-252
// TRAP: never answer a non-finite ratio. Callers multiply with it directly, and a NaN
// would travel silently -- as a refused panel drag, or as a shape drawn nowhere.
/** @purity pure */
export function displayRatioOf(settings: DocumentSettings): number {
  const step = settings.displayScale
  const held =
    typeof step === 'number' && Number.isFinite(step)
      ? step
      : (SETTINGS_DEFAULTS['displayScale'] as number)
  return (held / 100) * NOT_STORED_DISPLAY_SCALE_BASE['S-236']
}

// TRAP: DS-1 to DS-4 and DS-9 only; S-56 (DS-5) and every ratio row keep out.
const SCALED_BY_THE_DISPLAY: readonly (keyof DocumentSettings)[] = [
  'pxPerDayAt1x', 'rulerHeight', 'rulerFont', 'rulerLabelGap', 'rulerLabelPad',
  'rulerLabelBottomPad', 'basePlanHeight', 'actualMin', 'fontMin', 'actualGap',
  'stackGap', 'rowGap', 'dependencyWidth', 'dependencyArrowLength', 'markerSize',
  'markerGap', 'markerStroke', 'resumeDashOn', 'resumeDashOff', 'labelPad', 'labelGap',
  'rowTitleFont', 'rowTitleIndent', 'planStroke', 'thinStrokeMin', 'thinStrokeMax',
  'minShapeWidth', 'progressLineWidth', 'progressLineOverhang', 'commentBoxPad',
  'taskLevelOfDetailReadablePx', 'rowTitlePanelWidth',
]

// TRAP: the stored values are never rewritten (FR-039 MUST NOT). Each drawing side
// multiplies the STORED settings once on its way in; none of them scales a scaled value.
/** @purity pure */
export function drawnSettingsOf(settings: DocumentSettings): DocumentSettings {
  const ratio = displayRatioOf(settings)
  if (!(ratio > 0) || ratio === 1) return settings
  const drawn: Record<string, unknown> = { ...settings }
  for (const key of SCALED_BY_THE_DISPLAY) {
    const value = settings[key]
    if (typeof value === 'number') drawn[key] = value * ratio
  }
  return drawn as unknown as DocumentSettings
}

/** @purity pure */
export function regionsFromScreen(
  env: ScreenEnvironment,
  settings: DocumentSettings,
): ScreenRegions {
  const drawn = drawnSettingsOf(settings)
  const headerHeight = Math.min(env.appHeaderHeight, drawn.appHeaderMaxHeight)

  const appHeader = rect(0, 0, env.width, headerHeight)
  const canvas = rect(0, headerHeight, env.width, env.height - headerHeight)

  const titleWidth = drawn.rowTitlePanelWidth
  const propsWidth = drawn.propertyPanelWidth
  const bandHeight = drawn.rulerHeight
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

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_DISPLAY_SCALE_BASE: {
  readonly 'S-236': number
} = {
  'S-236': 0.6667,
}
// </generated>
