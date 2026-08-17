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
  readonly chevronNotchOfHeight: number
  readonly chevronNotchOfWidth: number
  readonly dateGridLinesVisible: boolean
  readonly dependencyArrowLength: number
  readonly dependencyLagDefault: number
  readonly dependencyRunOfArrow: number
  readonly dependencyVisible: boolean
  readonly dependencyWidth: number
  readonly dualCursor: object | null
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
  readonly rulerTierPxPerDayDay: number
  readonly rulerTierPxPerDayMonth: number
  readonly rulerTierPxPerDayWeek: number
  readonly scrollDate: string | null
  readonly scrollGroupId: string | null
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
  'chevronNotchOfHeight': 0.45,
  'chevronNotchOfWidth': 0.35,
  'dateGridLinesVisible': false,
  'dependencyArrowLength': 10,
  'dependencyLagDefault': 0,
  'dependencyRunOfArrow': 2,
  'dependencyVisible': true,
  'dependencyWidth': 1.5,
  'dummyOpacity': 0.20,
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
  'importMaxDepth': 64,
  'importMaxItems': 20000,
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
  'pinnedRowMax': 5,
  'planActualDisplay': 'both',
  'planActualGuideWeight': 1,
  'planStroke': 1,
  'progressLineOverhang': 6,
  'progressLineVisible': false,
  'progressLineWidth': 2,
  'progressMarkerVisible': true,
  'propertyPanelWidth': 280,
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
  'rulerTierPxPerDayDay': 30,
  'rulerTierPxPerDayMonth': 1.4,
  'rulerTierPxPerDayWeek': 4.3,
  'scrollDate': null,
  'scrollGroupId': null,
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
  'zoomX': 1,
  'zoomY': 1,
  // ⛔ Not stated as a machine value by settings.json,
  // so not generated rather than guessed:
  //   dualCursor.date1
  //   dualCursor.date2
  //   exportCanvas.height
  //   exportCanvas.width
  //   importMaxDate
  //   importMinDate
  //   pinnedGroupIds
  //   planActualGuidePattern.off
  //   planActualGuidePattern.on
  //   rulerFont
  //   rulerHeight
}

/**
 * The bounds tbl-settings.md states for one key on its own.
 * A bound written as another key rather than a number is NOT here: those
 * hold BETWEEN two keys -- FR-052 is the one with a rule of its own -- and
 * no per-key clamp can decide them.
 */
export const SETTINGS_BOUNDS: Readonly<
  Record<string, { readonly min?: number; readonly max?: number }>
> = {
  'actualGap': { min: 0, max: 20 },
  'actualInitialDuration': { min: 0, max: 1 },
  'actualMin': { max: 80 },
  'actualOfPlan': { min: 0.05 },
  'appHeaderMaxHeight': { min: 32, max: 96 },
  'arrowHeadOfSpan': { min: 0.1, max: 1 },
  'arrowHeadOfStroke': { min: 1.5, max: 8 },
  'autosaveIdleMs': { min: 300, max: 10000 },
  'basePlanHeight': { max: 200 },
  'canvasPadding': { min: 0, max: 60 },
  'chevronNotchOfHeight': { min: 0.05, max: 1 },
  'chevronNotchOfWidth': { min: 0.05, max: 0.5 },
  'dependencyArrowLength': { max: 40 },
  'dependencyRunOfArrow': { max: 6 },
  'dependencyWidth': { min: 0.5 },
  'dummyOpacity': { min: 0.05, max: 0.5 },
  'fadeHandleHalfPx': { min: 3, max: 8 },
  'fadeHandleStrokePx': { min: 1, max: 3 },
  'fontMin': { min: 12, max: 40 },
  'fontOfActual': { min: 0.05 },
  'fontScaleSizes.L': { max: 40 },
  'groupLevelOfDetailBase': { min: 0.01, max: 2 },
  'groupLevelOfDetailRatio': { max: 4 },
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
  'markerStroke': { min: 0.5, max: 4 },
  'maxGroupDepth': { min: 3, max: 8 },
  'milestoneActualDuration': { min: 0, max: 0 },
  'minShapeWidth': { min: 1, max: 20 },
  'planActualGuideWeight': { min: 0.5, max: 2 },
  'planStroke': { min: 0, max: 4 },
  'progressLineOverhang': { min: 0, max: 40 },
  'progressLineWidth': { min: 0.5, max: 8 },
  'pxPerDayAt1x': { min: 0.5, max: 60 },
  'resumeArmOfMarker': { min: 0.2 },
  'resumeDashOff': { min: 1, max: 12 },
  'resumeDashOn': { min: 1, max: 12 },
  'resumeHeadOfMarker': { min: 0.05, max: 0.5 },
  'resumeScaleInvalid': { min: 0.3, max: 1 },
  'rowGap': { min: 0, max: 60 },
  'rowTitleFont': { max: 40 },
  'rowTitleIndent': { min: 0, max: 60 },
  'rowTitleTopScale': { min: 1, max: 2 },
  'rulerHeight': { max: 150 },
  'rulerTierPxPerDayDay': { max: 60 },
  'rulerTierPxPerDayMonth': { min: 0.1 },
  'shapeHeightOf.arrow': { min: 0.1 },
  'shapeHeightOf.chevron': { min: 0.2, max: 3 },
  'shapeHeightOf.endpointSpan': { min: 0.1 },
  'shapeHeightOf.milestone': { max: 4 },
  'shapeHeightOf.rectangle': { min: 1, max: 1 },
  'spanDotOfStroke': { min: 0.5, max: 4 },
  'stackGap': { max: 60 },
  'starInnerOfOuter': { min: 0.2, max: 0.8 },
  'taskLevelOfDetailReadablePx': { max: 200 },
  'thinFontScale': { min: 0.3, max: 1 },
  'thinStrokeMax': { max: 20 },
  'thinStrokeMin': { min: 0.5 },
  'thinStrokeOfPlan': { min: 0.05, max: 0.6 },
  'truncateUnits': { min: 4, max: 120 },
}
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

