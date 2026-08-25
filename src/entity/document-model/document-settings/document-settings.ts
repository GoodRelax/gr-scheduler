// DocumentSettings -- public entry of this folder.
//
// @unit      UF-2   (docs/spec/05-07-design.md, table T-075)
// @component DocumentSettings, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-2
//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// The keys are table T-104 of the glossary and the values are tbl-settings.md;
// FR-063 says what belongs to this group. Both reach this file through the
// generated GRS JSON schema, which check 17 keeps in step with those sources --
// so the type and the bounds below are read from one place, not typed twice.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

export {}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json
//   docs/spec/_source/erd.json
//   docs/spec/_source/grs-document.schema.json (itself generated from the two above)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/** The presentation group. DR-3 of table T-052; FR-063 says what is in it. */
export interface DocumentSettings {
  readonly actualGap: number
  readonly actualInitialDuration: number
  readonly actualMin: number
  readonly actualOfPlan: number
  readonly appHeaderMaxHeight: number
  readonly arrowHeadOfSpan: number
  readonly arrowHeadOfStroke: number
  readonly assigneeVisible: boolean
  readonly autosaveIdleMs: number
  readonly basePlanHeight: number
  readonly baselineVisible: boolean
  readonly canvasPadding: number
  readonly carryMaxDepth: number
  readonly chevronNotchOfHeight: number
  readonly chevronNotchOfWidth: number
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
  readonly exportPngScale: 1 | 2
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
  readonly guideCursorMode: 'none' | 'crosshair' | 'single-vertical' | 'double-vertical'
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
  readonly planActualDisplay: 'both' | 'plan-only' | 'actual-only'
  readonly planActualGuidePattern: {
    readonly off: number
    readonly on: number
  }
  readonly planActualGuideWeight: number
  readonly planStroke: number
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
  readonly watermarkVisible: boolean
  readonly zoomX: number
  readonly zoomY: number
}

/**
 * The default settings.json states for each key.
 *
 * ⭐ Before CR-175 nothing generated these. SETTINGS_BOUNDS carried a
 * key's range but never its value, so every caller that wanted a default
 * typed the number again -- and when CR-174 moved `minShapeWidth` from 2
 * to 6 not one check, type or test noticed.
 */
export const SETTINGS_DEFAULTS: Readonly<Record<string, unknown>> = {
  'actualGap': 2,
  'actualInitialDuration': 1,
  'actualMin': 16,
  'actualOfPlan': 0.73,
  'appHeaderMaxHeight': 56,
  'arrowHeadOfSpan': 0.4,
  'arrowHeadOfStroke': 3.2,
  'assigneeVisible': false,
  'autosaveIdleMs': 3000,
  'basePlanHeight': 28,
  'baselineVisible': false,
  'canvasPadding': 10,
  'carryMaxDepth': 16,
  'chevronNotchOfHeight': 0.45,
  'chevronNotchOfWidth': 0.35,
  'dateGridLinesVisible': false,
  'dependencyArrowLength': 10,
  'dependencyLagDefault': 0,
  'dependencyRunOfArrow': 2,
  'dependencyVisible': true,
  'dependencyWidth': 1.5,
  'dualCursor': null,
  'dummyOpacity': 0.20,
  'exportCanvas.height': 900,
  'exportCanvas.width': 1600,
  'exportPngScale': 1,
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
  'iconHintDelayMs': 3000,
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
  'planActualDisplay': 'both',
  'planActualGuidePattern.off': 2,
  'planActualGuidePattern.on': 2,
  'planActualGuideWeight': 1,
  'planStroke': 1,
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
  'rowTitleIndent': 12,
  'rowTitlePanelWidth': 170,
  'rowTitleTopScale': 1.3,
  'rulerFont': 14,
  'rulerHeight': 48,
  'rulerLabelBottomPad': 3,
  'rulerLabelGap': 8,
  'rulerLabelPad': 2,
  'rulerTierPxPerDayDay': 8,
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
  'truncateUnits': 24,
  'watermarkVisible': true,
  'zoomX': 1,
  'zoomY': 1,
}

/** One piece of a bound stated as an expression, in postfix order. */
export type SettingsBoundToken =
  | { readonly key: string }
  | { readonly num: number }
  | { readonly op: '+' | '-' | '*' | '/' }

/** What the lower- and upper-bound columns of one settings row state. */
export interface SettingsBound {
  /** A floor the value may sit on. */
  readonly min?: number
  /** A ceiling the value may sit on. */
  readonly max?: number
  /** A floor the value must stay ABOVE. Never equal to it. */
  readonly exclusiveMin?: number
  /** A ceiling the value must stay BELOW. Never equal to it. */
  readonly exclusiveMax?: number
  /** A floor stated over other keys, which IV-16 judges. */
  readonly minExpression?: readonly SettingsBoundToken[]
  /** A ceiling stated over other keys, which IV-16 judges. */
  readonly maxExpression?: readonly SettingsBoundToken[]
}

/**
 * The bounds the settings manuscript states for each key.
 *
 * ⚠️ An open bound is kept APART from a closed one rather than written
 * into the same field. A reader that clamps has no value to clamp an open
 * bound to -- the nearest allowed number does not exist -- so folding the
 * two together would quietly turn a bound the manuscript marks open into
 * one a value is allowed to sit on.
 *
 * ⭐ A bound that names ANOTHER key is here as its expression, in postfix
 * order. It holds BETWEEN keys, so no per-key clamp can decide it; IV-16
 * of table T-220 is what judges it, and it needs the whole document.
 */
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
  'autosaveIdleMs': { min: 300, max: 10000 },
  'basePlanHeight': {
    max: 200,
    minExpression: [{ key: 'actualMin' }, { key: 'actualOfPlan' }, { op: '/' }],
  },
  'canvasPadding': { min: 0, max: 60 },
  'carryMaxDepth': { min: 4, max: 64 },
  'chevronNotchOfHeight': { min: 0.05, max: 1 },
  'chevronNotchOfWidth': { min: 0.05, max: 0.5 },
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
  // ⛔ A bound that names a key the presentation group does
  // not hold, so IV-16 cannot judge it on a document alone:
  //   zoomX (S-75) min names zoomMin
  //   zoomX (S-75) max names zoomMax
  //   zoomY (S-76) min names zoomMin
  //   zoomY (S-76) max names zoomMax
}

/**
 * The defaults settings.json states as a rule over OTHER keys, printed as
 * the rule rather than as its answer.
 *
 * ⭐ SETTINGS_DEFAULTS holds what such a key works out to while the keys it
 * reads are still at THEIR defaults. That answer goes stale the moment one
 * of them is edited, and S-2 follows S-3 by FR-039, so the band height has
 * to be worked out again every time the ruler type changes.
 *
 * ⛔ Before CR-200 there was nowhere to read the rule from, so
 * edit-document-settings.ts wrote S-2's arithmetic out a second time --
 * with the padding as a bare 6, which no longer even names a value.
 *
 * ⚠️ Only the `from` family is here. S-3's `index` rule is not: the one
 * caller that needs it already reads fontScaleSizes directly, and a second
 * path to the same answer is what this constant exists to prevent.
 *
 * ⭐ `as const` is deliberate: it makes every key name a literal type, so
 * `settings[rule.from]` type checks and a key renamed in the manuscript
 * fails the build instead of reading undefined at run time.
 *
 * The value is `from x times + plus + plusFrom x plusTimes`, and a rule
 * that names no second key states plusFrom as null.
 */
export const SETTINGS_DERIVED = {
  'rulerHeight': { from: 'rulerFont', times: 3, plus: 0, plusFrom: 'rulerLabelPad', plusTimes: 3 },
} as const
// </generated>

/** One value that had to be moved to get inside the bounds. */
export interface ClampedValue {
  /** The dotted key, as tbl-settings.md writes it. */
  readonly key: string
  readonly was: number
  readonly now: number
}

export interface ClampResult {
  readonly settings: DocumentSettings
  /** Empty when nothing had to move. */
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

/**
 * Bring every value inside the bounds its own row states, and say which ones
 * had to move. A value the sources give no numeric bound for is left alone.
 *
 * The bounds that hold BETWEEN two keys are NOT decided here. FR-052 says
 * the two panel widths may not be judged one at a time -- the Row Area has to
 * stay wider than zero -- and no per-key clamp can see that. It belongs where
 * the pair is validated, not here.
 *
 * @purity pure
 */
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

