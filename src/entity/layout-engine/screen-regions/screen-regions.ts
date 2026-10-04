// ScreenRegions: the rectangles the screen is divided into.
// @unit      UF-58   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRegions, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-35

import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
  type DrawnSettings,
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
  readonly propertyPanelWidth: number
  readonly topBandHeight?: number
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
  return displayScaleFractionOf(settings) * NOT_STORED_DISPLAY_SCALE_BASE['S-236']
}

// WHY: S-234 alone, never S-236: a DS-13 value is screen px already, as the author typed it.
/** @purity pure */
export function displayScaleFractionOf(settings: DocumentSettings): number {
  const step = settings.displayScale
  const held =
    typeof step === 'number' && Number.isFinite(step)
      ? step
      : (SETTINGS_DEFAULTS['displayScale'] as number)
  return held / 100
}

// TRAP: DS-1, DS-3, DS-4 and DS-9 only; S-56 (DS-5), S-11 (DS-10) and every ratio row keep out.
const SCALED_BY_THE_DISPLAY: readonly (keyof DrawnSettings)[] = [
  'pxPerDayAt1x', 'rulerHeight', 'rulerFont', 'rulerLabelGap', 'rulerLabelPad',
  'rulerLabelBottomPad', 'basePlanHeight', 'actualMin', 'fontMin', 'actualGap',
  'rowGap', 'dependencyWidth', 'dependencyArrowLength', 'dependencyLeadOut',
  'dependencyLeadIn', 'dependencyArrowWidth', 'markerSize',
  'markerStroke', 'resumeDashOn', 'resumeDashOff', 'resumeDashWidth', 'labelPad', 'labelGap',
  'milestoneNameMarkerGap', 'assigneeLabelGap',
  'rowTitleFont', 'rowTitleIndent', 'planStroke', 'thinStrokeWidth',
  'thinArrowHeadLength', 'thinArrowHeadHeight', 'spanDotSize',
  'minShapeWidth', 'progressLineWidth', 'progressLineOverhang', 'commentBoxPad',
  'rowTitlePanelWidth',
]

// TRAP: S-243, not S-141: every entrance composed here sits on the Row Title Panel.
/** @purity pure */
function entranceOuterHeightPx(): number {
  return NOT_STORED_ENTRANCE_SIZES['S-138'] + NOT_STORED_ENTRANCE_SIZES['S-243'] * 2
}

/** @purity pure */
function entranceOuterWidthPx(): number {
  return entranceOuterHeightPx() + NOT_STORED_ENTRANCE_SIZES['S-237'] * 2
}

// see HF-4
const ROW_CONTROL_COLUMNS = 4

const ROW_CONTROL_LATTICE_RANKS = 2

// see LF-16, HF-19, FR-029
/** @purity pure */
export function rowControlLatticeHeightPx(): number {
  return entranceOuterHeightPx() * NOT_STORED_CHROME_SCALE['S-235'] * ROW_CONTROL_LATTICE_RANKS
}

// see FR-039, T-252
/** @purity pure */
function drawnRowTitlePanelWidthPx(settings: DocumentSettings, ratio: number): number {
  const indents = SETTINGS_CONSTANTS.rowTitleIndent * ratio * SETTINGS_CONSTANTS.maxGroupDepth
  const grabStrip = NOT_STORED_ENTRANCE_SIZES['S-138'] * NOT_STORED_CHROME_SCALE['S-235']
  const rowControls =
    ROW_CONTROL_COLUMNS * entranceOuterWidthPx() * NOT_STORED_CHROME_SCALE['S-235']
  return Math.max(settings.rowTitlePanelWidth * ratio, indents + grabStrip + rowControls)
}

const DRAWN_AT_RATIO = '__drawnAtDisplayRatio'

// TRAP: the stored values are never rewritten (FR-039 MUST NOT). Each drawing side
// multiplies the STORED settings once on its way in; none of them scales a scaled value.
/** @purity pure */
export function drawnSettingsOf(settings: DocumentSettings): DrawnSettings {
  if (Object.prototype.hasOwnProperty.call(settings, DRAWN_AT_RATIO)) return settings as DrawnSettings
  const ratio = displayRatioOf(settings)
  // WHY: constants last, so a same-named key the input carries never outvotes them.
  const merged: Record<string, unknown> = { ...settings, ...SETTINGS_CONSTANTS }
  if (ratio > 0) {
    if (ratio !== 1) {
      for (const key of SCALED_BY_THE_DISPLAY) {
        const value = merged[key]
        if (typeof value === 'number') merged[key] = value * ratio
      }
    }
    merged['rowTitlePanelWidth'] = drawnRowTitlePanelWidthPx(settings, ratio)
  }
  Object.defineProperty(merged, DRAWN_AT_RATIO, { value: ratio, enumerable: false })
  return merged as unknown as DrawnSettings
}

/** @purity pure */
export function regionsFromScreen(
  env: ScreenEnvironment,
  settings: DocumentSettings,
): ScreenRegions {
  const drawn = drawnSettingsOf(settings)
  const headerHeight = Math.min(env.appHeaderHeight, drawn.appHeaderMaxHeight)

  const appHeader = rect(0, 0, env.width, headerHeight)
  const canvasTop = headerHeight + (env.topBandHeight ?? 0)
  const canvas = rect(0, canvasTop, env.width, env.height - canvasTop)

  const titleWidth = drawn.rowTitlePanelWidth
  const propsWidth = env.propertyPanelWidth
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
  const rowAreaWidth = canvas.width - drawn.canvasPadding - titleWidth - propsWidth - bar
  const rowAreaHeight = canvas.height - bandHeight - drawn.canvasPadding - bar

  return {
    appHeader,
    scheduleCanvas: canvas,
    rowTitlePanel,
    timeRuler: rect(rowAreaX, canvas.y, rowAreaWidth, bandHeight),
    propertiesPanel,
    rowArea: rect(rowAreaX, rowAreaY, rowAreaWidth, rowAreaHeight),
  }
}

// see FR-039, T-252, DS-1
/** @purity pure */
export function regionsAtDisplayScale(
  regions: ScreenRegions,
  settings: DocumentSettings,
  displayScale: DocumentSettings['displayScale'],
): ScreenRegions {
  const canvas = regions.scheduleCanvas
  const drawn = drawnSettingsOf(settings)
  const env: ScreenEnvironment = {
    width: regions.appHeader.width,
    height: canvas.y + canvas.height,
    appHeaderHeight: regions.appHeader.height,
    scrollbarThickness:
      canvas.height - drawn.rulerHeight - drawn.canvasPadding - regions.rowArea.height,
    propertyPanelWidth: regions.propertiesPanel.width,
    topBandHeight: canvas.y - regions.appHeader.height,
  }
  return regionsFromScreen(env, { ...settings, displayScale })
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
const NOT_STORED_DISPLAY_SCALE_BASE: {
  readonly 'S-236': number
} = {
  'S-236': 0.625,
}

// see T-206
const NOT_STORED_ENTRANCE_SIZES: {
  readonly 'S-138': number
  readonly 'S-237': number
  readonly 'S-243': number
} = {
  'S-138': 16,
  'S-237': 1,
  'S-243': 1,
}

// see T-206
const NOT_STORED_CHROME_SCALE: {
  readonly 'S-235': number
} = {
  'S-235': 0.6667,
}
// </generated>
