// DocumentSettings: the presentation group, with its defaults and bounds.
// @unit      UF-2   (docs/spec/05-07-design.md, table T-075)
// @component DocumentSettings, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-2

export {}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json
//   docs/spec/_source/erd.json
//   docs/spec/_source/grs-document.schema.json (itself generated from the two above)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see DR-3, FR-063
export interface DocumentSettings {
  readonly actualGap: number
  readonly actualInitialDuration: number
  readonly actualMin: number
  readonly actualOfPlan: number
  readonly actualVisible: boolean
  readonly appHeaderMaxHeight: number
  readonly arrowHeadOfSpan: number
  readonly arrowHeadOfStroke: number
  readonly assigneeVisible: boolean
  readonly basePlanHeight: number
  readonly baselineVisible: boolean
  readonly canvasPadding: number
  readonly carryMaxDepth: number
  readonly chevronNotchOfHeight: number
  readonly chevronNotchOfWidth: number
  readonly commentBoxPad: number
  readonly commentBoxWrapUnits: number
  readonly dateGridLinesVisible: boolean
  readonly dependencyArrowLength: number
  readonly dependencyLagDefault: number
  readonly dependencyRunOfArrow: number
  readonly dependencyVisible: boolean
  readonly dependencyWidth: number
  readonly dualCursor: {
    readonly date1: string
    readonly date2: string
  } | null
  readonly dummyOpacity: number
  readonly exportCanvas: {
    readonly width: number
    readonly height: number
  }
  readonly exportCanvasHeightCap: number
  readonly fadeHandleHalfPx: number
  readonly fadeHandleStrokePx: number
  readonly fontMin: number
  readonly fontOfActual: number
  readonly fontScale: 'S' | 'M' | 'L'
  readonly fontScaleSizes: {
    readonly L: number
    readonly M: number
    readonly S: number
  }
  readonly groupGridLinesVisible: boolean
  readonly groupLevelOfDetailBase: number
  readonly groupLevelOfDetailRatio: number
  readonly guideCursorMode: 'none' | 'crosshair' | 'single-vertical'
  readonly iconHintDelayMs: number
  readonly importMaxBytes: number
  readonly importMaxDate: string
  readonly importMaxDepth: number
  readonly importMaxItems: number
  readonly importMinDate: string
  readonly labelBaseline: number
  readonly labelCoef: number
  readonly labelGap: number
  readonly labelHaloOfFont: number
  readonly labelPad: number
  readonly markerGap: number
  readonly markerSize: number
  readonly markerStroke: number
  readonly maxGroupDepth: number
  readonly milestoneActualDuration: number
  readonly minShapeWidth: number
  readonly percentCompleteVisible: boolean
  readonly pinnedGroupIds: readonly string[]
  readonly pinnedRowMax: number
  readonly planActualGuidePattern: {
    readonly off: number
    readonly on: number
  }
  readonly planActualGuideWeight: number
  readonly planStroke: number
  readonly planVisible: boolean
  readonly progressLineOverhang: number
  readonly progressLineVisible: boolean
  readonly progressLineWidth: number
  readonly progressMarkerVisible: boolean
  readonly propertyPanelWidth: number
  readonly pxPerDayAt1x: number
  readonly resumeArmOfMarker: number
  readonly resumeDashOff: number
  readonly resumeDashOn: number
  readonly resumeHeadOfMarker: number
  readonly resumeScaleInvalid: number
  readonly rowGap: number
  readonly rowTitleFont: number
  readonly rowTitleIndent: number
  readonly rowTitlePanelWidth: number
  readonly rowTitleTopScale: number
  readonly rulerFont: number
  readonly rulerHeight: number
  readonly rulerLabelBottomPad: number
  readonly rulerLabelGap: number
  readonly rulerLabelPad: number
  readonly rulerTierPxPerDayDay: number
  readonly rulerTierPxPerDayMonth: number
  readonly rulerTierPxPerDayWeek: number
  readonly scrollDate: string | null
  readonly scrollDayOffset: number
  readonly scrollGroupId: string | null
  readonly scrollGroupOffset: number
  readonly shapeHeightOf: {
    readonly arrow: number
    readonly chevron: number
    readonly endpointSpan: number
    readonly milestone: number
    readonly rectangle: number
  }
  readonly spanDotOfStroke: number
  readonly stackDirection: 'up' | 'down'
  readonly stackGap: number
  readonly stackSafetyCap: number
  readonly starInnerOfOuter: number
  readonly taskLevelOfDetailReadablePx: number
  readonly themeMonochrome: boolean
  readonly themePreference: 'light' | 'dark'
  readonly thinFontScale: number
  readonly thinStrokeMax: number
  readonly thinStrokeMin: number
  readonly thinStrokeOfPlan: number
  readonly truncateUnits: number
  readonly zoomX: number
  readonly zoomY: number
}

export const SETTINGS_DEFAULTS: Readonly<Record<string, unknown>> = {
  'actualGap': 2,
  'actualInitialDuration': 1,
  'actualMin': 16,
  'actualOfPlan': 0.5715,
  'actualVisible': true,
  'appHeaderMaxHeight': 56,
  'arrowHeadOfSpan': 0.4,
  'arrowHeadOfStroke': 3.2,
  'assigneeVisible': false,
  'basePlanHeight': 28,
  'baselineVisible': false,
  'canvasPadding': 10,
  'carryMaxDepth': 16,
  'chevronNotchOfHeight': 0.45,
  'chevronNotchOfWidth': 0.35,
  'commentBoxPad': 3,
  'commentBoxWrapUnits': 128,
  'dateGridLinesVisible': false,
  'dependencyArrowLength': 7,
  'dependencyLagDefault': 0,
  'dependencyRunOfArrow': 2,
  'dependencyVisible': true,
  'dependencyWidth': 1.5,
  'dualCursor': null,
  'dummyOpacity': 0.20,
  'exportCanvas.height': 900,
  'exportCanvas.width': 1600,
  'exportCanvasHeightCap': 4096,
  'fadeHandleHalfPx': 4.5,
  'fadeHandleStrokePx': 1.5,
  'fontMin': 12,
  'fontOfActual': 0.80,
  'fontScale': 'M',
  'fontScaleSizes.L': 16,
  'fontScaleSizes.M': 14,
  'fontScaleSizes.S': 12,
  'groupGridLinesVisible': true,
  'groupLevelOfDetailBase': 0.32,
  'groupLevelOfDetailRatio': 1.875,
  'guideCursorMode': 'none',
  'iconHintDelayMs': 2000,
  'importMaxBytes': 32,
  'importMaxDate': '2200-12-31',
  'importMaxDepth': 64,
  'importMaxItems': 20000,
  'importMinDate': '1970-01-01',
  'labelBaseline': 0.35,
  'labelCoef': 0.5,
  'labelGap': 8,
  'labelHaloOfFont': 0.17,
  'labelPad': 6,
  'markerGap': 4,
  'markerSize': 16,
  'markerStroke': 1.3,
  'maxGroupDepth': 5,
  'milestoneActualDuration': 0,
  'minShapeWidth': 6,
  'percentCompleteVisible': false,
  'pinnedGroupIds': [],
  'pinnedRowMax': 5,
  'planActualGuidePattern.off': 2,
  'planActualGuidePattern.on': 2,
  'planActualGuideWeight': 1,
  'planStroke': 1,
  'planVisible': true,
  'progressLineOverhang': 6,
  'progressLineVisible': false,
  'progressLineWidth': 2,
  'progressMarkerVisible': true,
  'propertyPanelWidth': 0,
  'pxPerDayAt1x': 6,
  'resumeArmOfMarker': 0.62,
  'resumeDashOff': 2,
  'resumeDashOn': 3,
  'resumeHeadOfMarker': 0.22,
  'resumeScaleInvalid': 0.7,
  'rowGap': 8,
  'rowTitleFont': 13,
  'rowTitleIndent': 16,
  'rowTitlePanelWidth': 200,
  'rowTitleTopScale': 1.3,
  'rulerFont': 14,
  'rulerHeight': 48,
  'rulerLabelBottomPad': 3,
  'rulerLabelGap': 2,
  'rulerLabelPad': 2,
  'rulerTierPxPerDayDay': 17.5,
  'rulerTierPxPerDayMonth': 1.4,
  'rulerTierPxPerDayWeek': 4.3,
  'scrollDate': null,
  'scrollDayOffset': 0,
  'scrollGroupId': null,
  'scrollGroupOffset': 0,
  'shapeHeightOf.arrow': 0.5,
  'shapeHeightOf.chevron': 1.0,
  'shapeHeightOf.endpointSpan': 0.5,
  'shapeHeightOf.milestone': 1.5,
  'shapeHeightOf.rectangle': 1.0,
  'spanDotOfStroke': 1.15,
  'stackDirection': 'up',
  'stackGap': 12,
  'stackSafetyCap': 255,
  'starInnerOfOuter': 0.45,
  'taskLevelOfDetailReadablePx': 24,
  'themeMonochrome': false,
  'themePreference': 'light',
  'thinFontScale': 0.85,
  'thinStrokeMax': 4,
  'thinStrokeMin': 1.2,
  'thinStrokeOfPlan': 0.20,
  'truncateUnits': 48,
  'zoomX': 1,
  'zoomY': 1,
}

// TRAP: the tokens are in postfix order.
export type SettingsBoundToken =
  | { readonly key: string }
  | { readonly num: number }
  | { readonly op: '+' | '-' | '*' | '/' }

export interface SettingsBound {
  readonly min?: number
  readonly max?: number
  readonly exclusiveMin?: number
  readonly exclusiveMax?: number
  readonly minExpression?: readonly SettingsBoundToken[]
  readonly maxExpression?: readonly SettingsBoundToken[]
}

// see IV-16
export const SETTINGS_BOUNDS: Readonly<Record<string, SettingsBound>> = {
  'actualGap': { min: 0, max: 20 },
  'actualInitialDuration': { min: 0, max: 1 },
  'actualMin': {
    max: 80,
    minExpression: [{ key: 'fontMin' }, { key: 'fontOfActual' }, { op: '/' }],
  },
  'actualOfPlan': { min: 0.05, exclusiveMax: 1 },
  'appHeaderMaxHeight': { min: 32, max: 96 },
  'arrowHeadOfSpan': { min: 0.1, max: 1 },
  'arrowHeadOfStroke': { min: 1.5, max: 8 },
  'basePlanHeight': {
    max: 200,
    minExpression: [{ key: 'actualMin' }, { key: 'actualOfPlan' }, { op: '/' }],
  },
  'canvasPadding': { min: 0, max: 60 },
  'carryMaxDepth': { min: 4, max: 64 },
  'chevronNotchOfHeight': { min: 0.05, max: 1 },
  'chevronNotchOfWidth': { min: 0.05, max: 0.5 },
  'commentBoxPad': { min: 0, max: 30 },
  'commentBoxWrapUnits': { min: 4, max: 240 },
  'dependencyArrowLength': {
    max: 40,
    minExpression: [{ key: 'dependencyWidth' }, { num: 2 }, { op: '*' }],
  },
  'dependencyRunOfArrow': { exclusiveMin: 1, max: 6 },
  'dependencyWidth': {
    min: 0.5,
    maxExpression: [{ key: 'stackGap' }, { num: 2 }, { op: '/' }],
  },
  'dummyOpacity': { min: 0.05, max: 0.5 },
  'fadeHandleHalfPx': { min: 3, max: 8 },
  'fadeHandleStrokePx': { min: 1, max: 3 },
  'fontMin': { min: 12, max: 40 },
  'fontOfActual': { min: 0.05, exclusiveMax: 1 },
  'fontScaleSizes.L': { max: 40, minExpression: [{ key: 'fontScaleSizes.M' }] },
  'fontScaleSizes.M': {
    minExpression: [{ key: 'fontScaleSizes.S' }],
    maxExpression: [{ key: 'fontScaleSizes.L' }],
  },
  'fontScaleSizes.S': {
    minExpression: [{ key: 'fontMin' }],
    maxExpression: [{ key: 'fontScaleSizes.M' }],
  },
  'groupLevelOfDetailBase': { min: 0.01, max: 2 },
  'groupLevelOfDetailRatio': { exclusiveMin: 1, max: 4 },
  'iconHintDelayMs': { min: 500, max: 10000 },
  'importMaxBytes': { min: 1, max: 256 },
  'importMaxDepth': { min: 8, max: 256 },
  'importMaxItems': { min: 1000, max: 200000 },
  'labelBaseline': { min: 0, max: 0.8 },
  'labelCoef': { min: 0.3, max: 1 },
  'labelGap': { min: 0, max: 30 },
  'labelHaloOfFont': { min: 0, max: 0.3 },
  'labelPad': { min: 0, max: 30 },
  'markerGap': { min: 4, max: 4 },
  'markerSize': {
    minExpression: [{ key: 'fontMin' }],
    maxExpression: [{ key: 'actualMin' }],
  },
  'markerStroke': { min: 0.5, max: 4 },
  'maxGroupDepth': { min: 3, max: 8 },
  'milestoneActualDuration': { min: 0, max: 0 },
  'minShapeWidth': { min: 1, max: 20 },
  'pinnedGroupIds': { maxExpression: [{ key: 'pinnedRowMax' }] },
  'planActualGuideWeight': { min: 0.5, max: 2 },
  'planStroke': { min: 0, max: 4 },
  'progressLineOverhang': { min: 0, max: 40 },
  'progressLineWidth': { min: 0.5, max: 8 },
  'pxPerDayAt1x': { min: 0.5, max: 60 },
  'resumeArmOfMarker': {
    min: 0.2,
    maxExpression: [{ num: 1 }, { key: 'resumeHeadOfMarker' }, { op: '-' }],
  },
  'resumeDashOff': { min: 1, max: 12 },
  'resumeDashOn': { min: 1, max: 12 },
  'resumeHeadOfMarker': { min: 0.05, max: 0.5 },
  'resumeScaleInvalid': { min: 0.3, max: 1 },
  'rowGap': { min: 0, max: 60 },
  'rowTitleFont': { max: 40, minExpression: [{ key: 'fontMin' }] },
  'rowTitleIndent': { min: 0, max: 60 },
  'rowTitlePanelWidth': {
    minExpression: [{ key: 'rowTitleIndent' }, { key: 'maxGroupDepth' }, { op: '*' }],
  },
  'rowTitleTopScale': { min: 1, max: 2 },
  'rulerFont': {
    minExpression: [{ key: 'fontMin' }],
    maxExpression: [{ key: 'rulerHeight' }, { key: 'rulerLabelPad' }, { num: 3 }, { op: '*' }, { op: '-' }, { num: 3 }, { op: '/' }],
  },
  'rulerHeight': {
    max: 150,
    minExpression: [{ key: 'rulerFont' }, { num: 3 }, { op: '*' }, { key: 'rulerLabelPad' }, { num: 3 }, { op: '*' }, { op: '+' }],
  },
  'rulerLabelBottomPad': { min: 0, maxExpression: [{ key: 'rulerFont' }] },
  'rulerLabelGap': { min: 0, max: 30 },
  'rulerLabelPad': { min: 0, max: 20 },
  'rulerTierPxPerDayDay': { max: 60, minExpression: [{ key: 'rulerTierPxPerDayWeek' }] },
  'rulerTierPxPerDayMonth': { min: 0.1, maxExpression: [{ key: 'rulerTierPxPerDayWeek' }] },
  'rulerTierPxPerDayWeek': {
    minExpression: [{ key: 'rulerTierPxPerDayMonth' }],
    maxExpression: [{ key: 'rulerTierPxPerDayDay' }],
  },
  'shapeHeightOf.arrow': { min: 0.1, exclusiveMax: 1 },
  'shapeHeightOf.chevron': { min: 0.2, max: 3 },
  'shapeHeightOf.endpointSpan': { min: 0.1, exclusiveMax: 1 },
  'shapeHeightOf.milestone': { exclusiveMin: 1, max: 4 },
  'shapeHeightOf.rectangle': { min: 1, max: 1 },
  'spanDotOfStroke': { min: 0.5, max: 4 },
  'stackGap': {
    max: 60,
    minExpression: [{ key: 'dependencyWidth' }, { num: 2 }, { op: '*' }],
  },
  'starInnerOfOuter': { min: 0.2, max: 0.8 },
  'taskLevelOfDetailReadablePx': { max: 200, minExpression: [{ key: 'fontMin' }] },
  'thinFontScale': { min: 0.3, max: 1 },
  'thinStrokeMax': { max: 20, minExpression: [{ key: 'thinStrokeMin' }] },
  'thinStrokeMin': { min: 0.5, maxExpression: [{ key: 'thinStrokeMax' }] },
  'thinStrokeOfPlan': { min: 0.05, max: 0.6 },
  'truncateUnits': { min: 4, max: 120 },
  // TRAP: IV-16 cannot judge these bounds on a document alone; each
  // names a key this group does not hold:
  //   zoomX (S-75) min names zoomMin
  //   zoomX (S-75) max names zoomMax
  //   zoomY (S-76) min names zoomMin
  //   zoomY (S-76) max names zoomMax
}

// see FR-039
// TRAP: SETTINGS_DEFAULTS holds these keys worked out at the defaults only;
// once a key they read is edited, work them out again from this rule.
// TRAP: the value is from * times + plus + plusFrom * plusTimes, and
// plusFrom is null when the rule names no second key.
export const SETTINGS_DERIVED = {
  'rulerHeight': { from: 'rulerFont', times: 3, plus: 0, plusFrom: 'rulerLabelPad', plusTimes: 3 },
} as const
// </generated>

export interface ClampedValue {
  readonly key: string
  readonly was: number
  readonly now: number
}

export interface ClampResult {
  readonly settings: DocumentSettings
  readonly clamped: readonly ClampedValue[]
}

/** @purity pure */
function reach(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (at, key) => (at !== null && typeof at === 'object' ? (at as Record<string, unknown>)[key] : undefined),
    value,
  )
}

/** @purity pure */
function replace(value: unknown, path: readonly string[], put: number): unknown {
  const [head, ...rest] = path
  if (head === undefined) return put
  const held = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return { ...held, [head]: rest.length === 0 ? put : replace(held[head], rest, put) }
}

/** @purity pure */
export function clampedSettings(settings: DocumentSettings): ClampResult {
  let held: unknown = settings
  const clamped: ClampedValue[] = []

  for (const key of Object.keys(SETTINGS_BOUNDS)) {
    const bound = SETTINGS_BOUNDS[key]
    if (bound === undefined) continue
    const path = key.split('.')
    const value = reach(held, path)
    if (typeof value !== 'number' || !Number.isFinite(value)) continue

    let now = value
    if (bound.min !== undefined && now < bound.min) now = bound.min
    if (bound.max !== undefined && now > bound.max) now = bound.max
    if (now !== value) {
      clamped.push({ key, was: value, now })
      held = replace(held, path, now)
    }
  }

  return { settings: held as DocumentSettings, clamped }
}

