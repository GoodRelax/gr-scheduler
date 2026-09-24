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
  readonly assigneeLabelGap: number
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
  readonly dependencyArrowWidth: number
  readonly dependencyLagDefault: number
  readonly dependencyLeadIn: number
  readonly dependencyLeadOut: number
  readonly dependencyVisible: boolean
  readonly dependencyWidth: number
  readonly displayScale: 50 | 67 | 75 | 90 | 100 | 110 | 125 | 150 | 175 | 200
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
  readonly markerSize: number
  readonly markerStroke: number
  readonly maxGroupDepth: number
  readonly milestoneActualDuration: number
  readonly milestoneNameMarkerGap: number
  readonly milestoneNameStartOfWidth: number
  readonly minShapeWidth: number
  readonly percentCompleteVisible: boolean
  readonly pinnedGroupIds: readonly string[]
  readonly pinnedRowMax: number
  readonly planActualGuidePattern: {
    readonly off: number
    readonly on: number
  }
  readonly planActualGuideWeight: number
  readonly planDatesVisible: boolean
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
  readonly resumeDashWidth: number
  readonly resumeHeadOfMarker: number
  readonly resumeOpacityInvalid: number
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
  readonly spanDotSize: number
  readonly stackDirection: 'up' | 'down'
  readonly stackGap: number
  readonly stackSafetyCap: number
  readonly starInnerOfOuter: number
  readonly themeMonochrome: boolean
  readonly themePreference: 'light' | 'dark'
  readonly thinArrowHeadHeight: number
  readonly thinArrowHeadLength: number
  readonly thinFontScale: number
  readonly thinStrokeWidth: number
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
  'assigneeLabelGap': 6.4,
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
  'dependencyArrowLength': 9.6,
  'dependencyArrowWidth': 8,
  'dependencyLagDefault': 0,
  'dependencyLeadIn': 16,
  'dependencyLeadOut': 9.6,
  'dependencyVisible': true,
  'dependencyWidth': 2.4,
  'displayScale': 100,
  'dualCursor': null,
  'dummyOpacity': 0.20,
  'exportCanvas.height': 900,
  'exportCanvas.width': 1600,
  'exportCanvasHeightCap': 4096,
  'fadeHandleHalfPx': 2.5,
  'fadeHandleStrokePx': 1.0,
  'fontMin': 12,
  'fontOfActual': 0.90,
  'fontScale': 'M',
  'fontScaleSizes.L': 16,
  'fontScaleSizes.M': 14,
  'fontScaleSizes.S': 12,
  'groupGridLinesVisible': true,
  'groupLevelOfDetailBase': 0.32,
  'groupLevelOfDetailRatio': 1.5,
  'guideCursorMode': 'none',
  'iconHintDelayMs': 1000,
  'importMaxBytes': 32,
  'importMaxDate': '2200-12-31',
  'importMaxDepth': 64,
  'importMaxItems': 20000,
  'importMinDate': '1970-01-01',
  'labelBaseline': 0.35,
  'labelCoef': 0.5,
  'labelGap': 9.6,
  'labelHaloOfFont': 0.10,
  'labelPad': 9.6,
  'markerSize': 22.4,
  'markerStroke': 1.3,
  'maxGroupDepth': 5,
  'milestoneActualDuration': 0,
  'milestoneNameMarkerGap': 9.6,
  'milestoneNameStartOfWidth': 0.25,
  'minShapeWidth': 6.4,
  'percentCompleteVisible': false,
  'pinnedGroupIds': [],
  'pinnedRowMax': 5,
  'planActualGuidePattern.off': 2,
  'planActualGuidePattern.on': 2,
  'planActualGuideWeight': 1,
  'planDatesVisible': false,
  'planStroke': 1,
  'planVisible': true,
  'progressLineOverhang': 6,
  'progressLineVisible': false,
  'progressLineWidth': 2,
  'progressMarkerVisible': false,
  'propertyPanelWidth': 0,
  'pxPerDayAt1x': 6,
  'resumeArmOfMarker': 0.62,
  'resumeDashOff': 2,
  'resumeDashOn': 3,
  'resumeDashWidth': 1.92,
  'resumeHeadOfMarker': 0.22,
  'resumeOpacityInvalid': 0.55,
  'resumeScaleInvalid': 0.7,
  'rowGap': 0,
  'rowTitleFont': 19.5,
  'rowTitleIndent': 16,
  'rowTitlePanelWidth': 300,
  'rowTitleTopScale': 1.3,
  'rulerFont': 21,
  'rulerHeight': 69,
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
  'shapeHeightOf.milestone': 1.0,
  'shapeHeightOf.rectangle': 1.0,
  'spanDotSize': 6.4,
  'stackDirection': 'up',
  'stackGap': 1,
  'stackSafetyCap': 255,
  'starInnerOfOuter': 0.45,
  'themeMonochrome': false,
  'themePreference': 'light',
  'thinArrowHeadHeight': 5.6,
  'thinArrowHeadLength': 5.6,
  'thinFontScale': 0.85,
  'thinStrokeWidth': 2.8,
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
  'assigneeLabelGap': { min: 0, max: 30 },
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
  'dependencyArrowWidth': {
    max: 40,
    minExpression: [{ key: 'dependencyWidth' }, { num: 2 }, { op: '*' }],
  },
  'dependencyLeadIn': { max: 40, minExpression: [{ key: 'dependencyArrowLength' }] },
  'dependencyLeadOut': { min: 0, max: 40 },
  'dependencyWidth': {
    min: 0.5,
    maxExpression: [{ key: 'dependencyArrowWidth' }, { num: 2 }, { op: '/' }],
  },
  'dummyOpacity': { min: 0.05, max: 0.5 },
  'fadeHandleHalfPx': { min: 2.5, max: 8 },
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
  'markerSize': {
    minExpression: [{ key: 'fontMin' }],
    maxExpression: [{ key: 'actualMin' }, { key: 'actualOfPlan' }, { op: '/' }],
  },
  'markerStroke': { min: 0.5, max: 4 },
  'maxGroupDepth': { min: 3, max: 8 },
  'milestoneActualDuration': { min: 0, max: 0 },
  'milestoneNameMarkerGap': { min: 0, max: 30 },
  'milestoneNameStartOfWidth': { min: 0, max: 1 },
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
  'resumeDashWidth': { min: 0.5, max: 20 },
  'resumeHeadOfMarker': { min: 0.05, max: 0.5 },
  'resumeOpacityInvalid': { min: 0.05, max: 1 },
  'resumeScaleInvalid': { min: 0.3, max: 1 },
  'rowGap': { min: 0, max: 0 },
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
  'shapeHeightOf.milestone': { min: 0.1, max: 1 },
  'shapeHeightOf.rectangle': { min: 1, max: 1 },
  'spanDotSize': { min: 0.5, max: 40 },
  'stackGap': { min: 1, max: 1 },
  'starInnerOfOuter': { min: 0.2, max: 0.8 },
  'thinArrowHeadHeight': { min: 0.5, max: 40 },
  'thinArrowHeadLength': { min: 0.5, max: 40 },
  'thinFontScale': { min: 0.3, max: 1 },
  'thinStrokeWidth': { min: 0.5, max: 20 },
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
// TRAP: a rule with index instead of from is index[by] * times.
export const SETTINGS_DERIVED = {
  'rulerFont': { index: 'fontScaleSizes', by: 'fontScale', times: 1.5 },
  'rulerHeight': { from: 'rulerFont', times: 3, plus: 0, plusFrom: 'rulerLabelPad', plusTimes: 3 },
} as const
// </generated>

// see S-234, FR-039
// TRAP: the order is table T-202's own type column, and FR-039 (MUST NOT) forbids either
// end wrapping round, so the ends are read from this list rather than counted modulo it.
export const DISPLAY_SCALE_STEPS: readonly DocumentSettings['displayScale'][] = [
  50, 67, 75, 90, 100, 110, 125, 150, 175, 200,
]

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

// TRAP: repeats boundValueOf of schedule-invariants.ts (IV-16); change both together.
/** @purity pure */
function expressionValueOf(expression: readonly SettingsBoundToken[], held: unknown): number | null {
  const stack: number[] = []
  for (const token of expression) {
    if ('key' in token) {
      const value = reach(held, token.key.split('.'))
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      stack.push(value)
      continue
    }
    if ('num' in token) {
      stack.push(token.num)
      continue
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) return null
    stack.push(token.op === '+' ? left + right
      : token.op === '-' ? left - right
        : token.op === '*' ? left * right
          : left / right)
  }
  const answer = stack.length === 1 ? stack[0] : undefined
  return answer === undefined || !Number.isFinite(answer) ? null : answer
}

// see RS-51, IV-16
/** @purity pure */
export function clampedSettings(settings: DocumentSettings): ClampResult {
  let held: unknown = settings
  const wasByKey = new Map<string, number>()
  const keys = Object.keys(SETTINGS_BOUNDS)

  // WHY: a floor or ceiling naming another key reads that key after its own clamp; a chain
  // (fontOfActual -> actualMin -> basePlanHeight) settles within one pass per key at most.
  for (let pass = 0; pass <= keys.length; pass++) {
    let moved = false
    for (const key of keys) {
      const bound = SETTINGS_BOUNDS[key]
      if (bound === undefined) continue
      const path = key.split('.')
      const value = reach(held, path)
      if (typeof value !== 'number' || !Number.isFinite(value)) continue

      let now = value
      const ceiling = bound.maxExpression === undefined ? null : expressionValueOf(bound.maxExpression, held)
      if (ceiling !== null && now > ceiling) now = ceiling
      const floor = bound.minExpression === undefined ? null : expressionValueOf(bound.minExpression, held)
      if (floor !== null && now < floor) now = floor
      // WHY: the fixed bounds last, so a floor read from another key never lifts a value past its own maximum.
      if (bound.min !== undefined && now < bound.min) now = bound.min
      if (bound.max !== undefined && now > bound.max) now = bound.max
      if (now !== value) {
        if (!wasByKey.has(key)) wasByKey.set(key, value)
        held = replace(held, path, now)
        moved = true
      }
    }
    if (!moved) break
  }

  const clamped: ClampedValue[] = []
  for (const [key, was] of wasByKey) {
    const now = reach(held, key.split('.')) as number
    if (now !== was) clamped.push({ key, was, now })
  }
  return { settings: held as DocumentSettings, clamped }
}

