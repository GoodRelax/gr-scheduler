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
  readonly actualVisible: boolean
  readonly assigneeVisible: boolean
  readonly baselineVisible: boolean
  readonly dateGridLinesVisible: boolean
  readonly dependencyVisible: boolean
  readonly displayScale: 50 | 67 | 75 | 90 | 100 | 110 | 125 | 150 | 175 | 200
  readonly fontScale: 'S' | 'M' | 'L'
  readonly groupGridLinesVisible: boolean
  readonly levelZeroTreeState: 'auto' | 'collapsed'
  readonly percentCompleteVisible: boolean
  readonly pinnedGroupIds: readonly string[]
  readonly planDatesVisible: boolean
  readonly planVisible: boolean
  readonly progressLineVisible: boolean
  readonly progressMarkerVisible: boolean
  readonly rowTitlePanelWidth: number
  readonly rulerFont: number
  readonly rulerHeight: number
  readonly scrollDate: string | null
  readonly scrollDayOffset: number
  readonly scrollGroupId: string | null
  readonly scrollGroupOffset: number
  readonly stackDirection: 'up' | 'down'
  readonly themeMonochrome: boolean
  readonly zoomX: number
  readonly zoomY: number
}

export const SETTINGS_DEFAULTS: Readonly<Record<string, unknown>> = {
  'actualVisible': true,
  'assigneeVisible': false,
  'baselineVisible': false,
  'dateGridLinesVisible': false,
  'dependencyVisible': true,
  'displayScale': 100,
  'fontScale': 'M',
  'groupGridLinesVisible': true,
  'levelZeroTreeState': 'auto',
  'percentCompleteVisible': false,
  'pinnedGroupIds': [],
  'planDatesVisible': false,
  'planVisible': true,
  'progressLineVisible': false,
  'progressMarkerVisible': false,
  'rowTitlePanelWidth': 300,
  'rulerFont': 21,
  'rulerHeight': 69,
  'scrollDate': null,
  'scrollDayOffset': 0,
  'scrollGroupId': null,
  'scrollGroupOffset': 0,
  'stackDirection': 'up',
  'themeMonochrome': false,
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
  'pinnedGroupIds': { maxExpression: [{ num: 5 }] },
  'rowTitlePanelWidth': { minExpression: [{ num: 16 }, { num: 5 }, { op: '*' }] },
  'rulerFont': {
    minExpression: [{ num: 12 }],
    maxExpression: [{ key: 'rulerHeight' }, { num: 2 }, { num: 3 }, { op: '*' }, { op: '-' }, { num: 3 }, { op: '/' }],
  },
  'rulerHeight': {
    max: 150,
    minExpression: [{ key: 'rulerFont' }, { num: 3 }, { op: '*' }, { num: 2 }, { num: 3 }, { op: '*' }, { op: '+' }],
  },
  'zoomX': { minExpression: [{ num: 0.02 }], maxExpression: [{ num: 64 }] },
  'zoomY': { minExpression: [{ num: 0.02 }], maxExpression: [{ num: 64 }] },
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

// see FR-063, table T-064 PI-2
// TRAP: never read one of these from a document; a file does not carry them.
export const SETTINGS_CONSTANTS: {
  readonly actualGap: number
  readonly actualInitialDuration: number
  readonly actualMin: number
  readonly actualOfPlan: number
  readonly appHeaderMaxHeight: number
  readonly arrowHeadOfSpan: number
  readonly assigneeLabelGap: number
  readonly basePlanHeight: number
  readonly canvasPadding: number
  readonly carryMaxDepth: number
  readonly chevronNotchOfHeight: number
  readonly chevronNotchOfWidth: number
  readonly commentBoxPad: number
  readonly commentBoxWrapUnits: number
  readonly dependencyArrowLength: number
  readonly dependencyArrowWidth: number
  readonly dependencyLagDefault: number
  readonly dependencyLeadIn: number
  readonly dependencyLeadOut: number
  readonly dependencyWidth: number
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
  readonly fontScaleSizes: {
    readonly S: number
    readonly M: number
    readonly L: number
  }
  readonly groupLevelOfDetailBase: number
  readonly groupLevelOfDetailRatio: number
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
  readonly pinnedRowMax: number
  readonly planActualGuidePattern: {
    readonly on: number
    readonly off: number
  }
  readonly planActualGuideWeight: number
  readonly planStroke: number
  readonly progressLineOverhang: number
  readonly progressLineWidth: number
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
  readonly rowTitleTopScale: number
  readonly rulerLabelBottomPad: number
  readonly rulerLabelGap: number
  readonly rulerLabelPad: number
  readonly rulerTierPxPerDayDay: number
  readonly rulerTierPxPerDayMonth: number
  readonly rulerTierPxPerDayWeek: number
  readonly shapeHeightOf: {
    readonly rectangle: number
    readonly chevron: number
    readonly arrow: number
    readonly endpointSpan: number
    readonly milestone: number
  }
  readonly spanDotSize: number
  readonly stackGap: number
  readonly stackSafetyCap: number
  readonly starInnerOfOuter: number
  readonly taskHintDelayMs: number
  readonly thinArrowHeadHeight: number
  readonly thinArrowHeadLength: number
  readonly thinFontScale: number
  readonly thinStrokeWidth: number
  readonly truncateUnits: number
  readonly watermarkOpacity: number
  readonly zoomMax: number
  readonly zoomMin: number
  readonly zoomStep: number
} = {
  actualGap: 2,
  actualInitialDuration: 1,
  actualMin: 16,
  actualOfPlan: 0.5715,
  appHeaderMaxHeight: 56,
  arrowHeadOfSpan: 0.4,
  assigneeLabelGap: 6.4,
  basePlanHeight: 28,
  canvasPadding: 10,
  carryMaxDepth: 16,
  chevronNotchOfHeight: 0.45,
  chevronNotchOfWidth: 0.35,
  commentBoxPad: 3,
  commentBoxWrapUnits: 128,
  dependencyArrowLength: 9.6,
  dependencyArrowWidth: 8,
  dependencyLagDefault: 0,
  dependencyLeadIn: 16,
  dependencyLeadOut: 9.6,
  dependencyWidth: 2.4,
  dummyOpacity: 0.20,
  exportCanvas: {
    width: 1920,
    height: 1080,
  },
  exportCanvasHeightCap: 4096,
  fadeHandleHalfPx: 2.5,
  fadeHandleStrokePx: 1.0,
  fontMin: 12,
  fontOfActual: 0.90,
  fontScaleSizes: {
    S: 12,
    M: 14,
    L: 16,
  },
  groupLevelOfDetailBase: 0.32,
  groupLevelOfDetailRatio: 1.5,
  iconHintDelayMs: 300,
  importMaxBytes: 32,
  importMaxDate: '2200-12-31',
  importMaxDepth: 64,
  importMaxItems: 20000,
  importMinDate: '1970-01-01',
  labelBaseline: 0.35,
  labelCoef: 0.5,
  labelGap: 9.6,
  labelHaloOfFont: 0.10,
  labelPad: 9.6,
  markerSize: 22.4,
  markerStroke: 1.3,
  maxGroupDepth: 5,
  milestoneActualDuration: 0,
  milestoneNameMarkerGap: 9.6,
  milestoneNameStartOfWidth: 0.25,
  minShapeWidth: 6.4,
  pinnedRowMax: 5,
  planActualGuidePattern: {
    on: 2,
    off: 2,
  },
  planActualGuideWeight: 1,
  planStroke: 1,
  progressLineOverhang: 6,
  progressLineWidth: 2,
  pxPerDayAt1x: 6,
  resumeArmOfMarker: 0.62,
  resumeDashOff: 2,
  resumeDashOn: 3,
  resumeDashWidth: 1.92,
  resumeHeadOfMarker: 0.22,
  resumeOpacityInvalid: 0.55,
  resumeScaleInvalid: 0.7,
  rowGap: 0,
  rowTitleFont: 19.5,
  rowTitleIndent: 16,
  rowTitleTopScale: 1.3,
  rulerLabelBottomPad: 3,
  rulerLabelGap: 2,
  rulerLabelPad: 2,
  rulerTierPxPerDayDay: 17.5,
  rulerTierPxPerDayMonth: 0.5,
  rulerTierPxPerDayWeek: 2,
  shapeHeightOf: {
    rectangle: 1.0,
    chevron: 1.0,
    arrow: 0.5,
    endpointSpan: 0.5,
    milestone: 1.0,
  },
  spanDotSize: 6.4,
  stackGap: 1,
  stackSafetyCap: 255,
  starInnerOfOuter: 0.45,
  taskHintDelayMs: 500,
  thinArrowHeadHeight: 5.6,
  thinArrowHeadLength: 5.6,
  thinFontScale: 0.85,
  thinStrokeWidth: 2.8,
  truncateUnits: 48,
  watermarkOpacity: 0.06,
  zoomMax: 64,
  zoomMin: 0.02,
  zoomStep: 1.1,
  // TRAP: these keys state no machine value, so none is generated:
  //   planActualGuideColor (S-105)
}

// see table T-064 PI-2, PI-35
// TRAP: only drawnSettingsOf builds one; nothing else joins the two.
export type DrawnSettings = DocumentSettings & typeof SETTINGS_CONSTANTS
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

