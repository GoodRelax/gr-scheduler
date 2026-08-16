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

// <generated from docs/spec/_assets/source/erd.json -- do not edit by hand>
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
  readonly dualCursor:
{
    /** the source does not say what this holds */
    readonly date1: unknown
    /** the source does not say what this holds */
    readonly date2: unknown
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
  /** the source does not say what this holds */
  readonly planActualGuidePattern: unknown
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

