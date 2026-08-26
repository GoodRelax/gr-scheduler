// FR-055's fit must be able to CHOOSE the deep group level-of-detail tiers --
// 4, 5, and as far as S-125's own upper bound reaches -- and not only 1 to 3.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// named below, the published entity types the fixtures are built from, and the
// signatures of `layoutFromSchedule`, `regionsFromScreen` and
// `commandFromInput`. Not one expected figure below was measured off a run:
// every one is derived from a requirement or a table row.
//
// ⭐ WHY THIS FILE EXISTS BESIDE `fr-055-vertical-lod-fit.test.ts`. That file
// says in as many words that it leaves depths 4 and 5 out, because their rungs
// stand ABOVE FR-094's floor -- which is precisely the arm the rule printed
// after table T-068 calls pass 2, and the only arm that can answer a tier
// deeper than 3. Nothing there exercises it. This file exercises exactly that,
// and touches no fixture of that file.
//
// ⭐ EVERY CASE PRESSES `F` (SK-18 of table T-036, IC-10 of table T-109) AND
// READS THE `CM-71` WRITE, for the reason the neighbouring file gives: the rule
// after table T-068 runs that table up to twice over more than one zoom, and no
// row says which component holds the loop.
//
// The rows these cases answer to (rule 03: name the row, never copy its value):
//   FR-055   the RATIONALE's vertical paragraph -- choose the display amount
//            rather than shrink the zoom; take the DEEPEST tier whose drawing
//            fits the Row Area; take depth 1 when even that does not fit and
//            leave the vertical scroll; never drop the zoom below the smallest
//            one that draws the chosen tier; a gap at the bottom is allowed
//   FR-018   the ladder, its domain starting at depth 2, the MAY that lets the
//            level-of-detail judgement cap the depth at S-125, and the ban on
//            drawing MORE as the zoom falls
//   FR-094   the floor on the plan height -- what makes tiers 1 to 3 invariant
//            in `zoomY` and tiers 4 and up NOT invariant
//   FR-016   the zoom stays inside S-75 / S-76's range (S-54 / S-55)
//   T-068    LC-1, LC-2, LC-9, and the two-pass rule printed after the table
//   T-205    S-87 / S-88 -- the ladder's first term and its ratio
//   T-201    S-4 / S-5 / S-6 (the vertical chain), S-12, S-54 / S-55
//   T-203    S-75 / S-76, S-125 (the depth cap and its own upper bound)
//   T-221    LF-2 / LF-3 (the band height and the row pitch)
//   T-108    CM-71 -- the write the fit places the zoom in
//   T-206    S-96 / S-97 / S-98
//
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, and why:
//   * WHICH OF THE TWO PASSES ANSWERED. The rule after table T-068 fixes the
//     number of runs, not an observable; FR-055 fixes the answer. Only the
//     answer is asserted.
//   * THE LANDING ZOOM WHEN THE CHOSEN TIER IS 1. FR-055's MUST NOT is a LOWER
//     bound and depth 1 has no rung, FR-018 keeping it out of the ladder's
//     domain. Bounded here from above (under the depth-2 rung) and from below
//     (S-54) only, exactly as the specification bounds it.
//   * ANY FIGURE FOR THE HORIZONTAL. FR-055 settles that axis by another rule.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_BOUNDS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

// ---------------------------------------------------------------------------
// Settings and screens. Every key not pinned here comes from SETTINGS_DEFAULTS,
// which `npm run gen` prints from the manuscript, so a re-ruled row moves these
// cases with it instead of leaving a stale figure behind.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01', // S-77, pinned so the time axis has an origin
  scrollGroupId: null, // S-78
  stackDirection: 'down', // S-58, pinned so every y reads from the top
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/** Twice the height, same width. Used to open a tier the short screen refused. */
const ENV_TALL: ScreenEnvironment = { ...ENV, height: 1400 }

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const REGIONS_TALL = regionsFromScreen(ENV_TALL, SETTINGS)

// ---------------------------------------------------------------------------
// The ladder and the floor, straight out of the manuscript.
// ---------------------------------------------------------------------------

const BASE = settingNumber('groupLevelOfDetailBase') // S-87
const RATIO = settingNumber('groupLevelOfDetailRatio') // S-88
const MAX_GROUP_DEPTH = settingNumber('maxGroupDepth') // S-125, the default

/**
 * S-125's own upper bound, which settles how deep a tier the fit can ever be
 * asked for. Read off SETTINGS_BOUNDS, which `npm run gen` prints from the
 * manuscript, rather than typed here -- rule 03 asks for the value to be
 * generated and not copied, so re-ruling the row moves this case with it.
 */
const boundCeilingOf = (key: string): number => {
  const max = SETTINGS_BOUNDS[key]?.max
  if (typeof max !== 'number') throw new Error(`SETTINGS_BOUNDS.${key} states no plain max`)
  return max
}

const MAX_GROUP_DEPTH_CEILING = boundCeilingOf('maxGroupDepth') // S-125's upper bound

/**
 * S-87 prints the ladder as an expression rather than a list of figures:
 * threshold(d) = base * ratio ^ (d - 2), with S-88 as the ratio.
 *
 * ⚠️ FR-018 (MUST / MUST NOT) starts the domain at depth 2 and forbids depth 1
 * from being a candidate at all, so there is no threshold(1) to ask for and no
 * use below asks for one.
 */
const thresholdOf = (depth: number): number => BASE * Math.pow(RATIO, depth - 2)

/**
 * FR-094 (MUST) puts the floor on the plan height once, before the shape ratio.
 * The floor's own value is not printed as a figure anywhere: S-6 states
 * `actualMin` as the height the ACTUAL bar may not fall below and S-5 states the
 * actual as the plan times `actualOfPlan`, so flooring the plan once means
 * flooring it at `actualMin` / `actualOfPlan` -- the expression S-4's lower
 * bound column already prints for `basePlanHeight`. Below this zoom the plan
 * height is pinned and the drawing does not move with `zoomY`.
 */
const FLOOR_BINDS_BELOW =
  settingNumber('actualMin') / settingNumber('actualOfPlan') / settingNumber('basePlanHeight')

/**
 * The smallest `zoomY` that draws a given depth, which is what FR-055's MUST
 * NOT measures against and, with its "do not add vertical height for nothing"
 * note, is where the fit lands. For d >= 2 that is the rung itself; depth 1 has
 * no rung, so a zoom well inside the band under the depth-2 rung is taken.
 */
const drawingZoomOf = (depth: number): number =>
  depth >= 2 ? thresholdOf(depth) : thresholdOf(2) / 2

// ---------------------------------------------------------------------------
// Fixtures. A tree of `TaskGroup` rows, `roots` wide, `depths` deep, each
// non-leaf row carrying `fanOut` children, and every row carrying one `Task`.
//
// ⚠️ EVERY TASK RUNS THE SAME DATES ON PURPOSE. The horizontal extent is then
// one bar's width whatever the tree is, so the vertical answers compared below
// cannot be moved by the horizontal half of the same press, and every row sits
// at one lane (ST-2 / ST-3 have nothing to stack) so LF-2 gives every band the
// same height and the extent really is the row count.
// ⚠️ The span is long enough that FR-018's task level of detail keeps it: what
// that rule judges is the duration times one day's px (S-1 at zoomX 1) against
// S-86.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

const TASK_FROM = '2026-01-05'
const TASK_DAYS = 60

// Every nullable column has to be spelled `null`; leaving one `undefined` reads
// as "set".
const taskOf = (uid: number): Task =>
  ({
    uid,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: TASK_FROM,
    finish: dayAfter(TASK_FROM, TASK_DAYS),
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
  }) as unknown as Task

const groupOf = (id: string, parentId: string | null, order: number): TaskGroup =>
  ({
    id,
    parentId,
    label: null,
    derivedFromTaskUid: null,
    order,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
  }) as unknown as TaskGroup

interface TreeShape {
  /** How many rows stand at depth 1. */
  readonly roots: number
  /** How deep the document goes. `1` is roots only. */
  readonly depths: number
  /** How many children each non-leaf row carries. */
  readonly fanOut: number
}

const scheduleOf = (shape: TreeShape): Schedule => {
  const groups: TaskGroup[] = []

  const grow = (parentId: string | null, depth: number, count: number): void => {
    if (depth > shape.depths) return
    for (let index = 0; index < count; index++) {
      const id = parentId === null ? `r${index}` : `${parentId}.${index}`
      groups.push(groupOf(id, parentId, index))
      grow(id, depth + 1, shape.fanOut)
    }
  }
  grow(null, 1, shape.roots)

  const tasks = groups.map((_group, index) => taskOf(index + 1))
  return {
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: tasks.length + 1,
    },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: groups.map((group, index) => ({
      groupId: group.id,
      taskUid: index + 1,
      stackOrder: null,
    })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

/** How many rows a shape holds at `depth` and above. */
const rowsDownTo = (shape: TreeShape, depth: number): number => {
  let count = 0
  let atThisDepth = shape.roots
  for (let level = 1; level <= Math.min(depth, shape.depths); level++) {
    count += atThisDepth
    atThisDepth *= shape.fanOut
  }
  return count
}

const documentOf = (schedule: Schedule, settings: DocumentSettings): Document =>
  ({
    schemaVersion: '1',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-26T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-08-26T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// ---------------------------------------------------------------------------
// One frame, built the way ADR-001 has the shell build it, and one press of the
// entrance SK-18 names.
// ---------------------------------------------------------------------------

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const keyOf = (key: string): KeyInput => ({ kind: 'key', key, modifiers: NO_MODS })

const contextOf = (
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
): InputContext => {
  const layout = layoutFromSchedule(schedule, settings, regions)
  return {
    document: documentOf(schedule, settings),
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    // S-53 arrives as a value. Deliberately not the figure the manuscript
    // prints: no case here reads it.
    zoomStep: 3,
    pressed: null,
    isTextEntryUnsettled: false,
    isDualCursorMode: false,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
  } as unknown as InputContext
}

/** The `CM-71` write one press of `F` places, as a plain record. */
function fitWrite(
  schedule: Schedule,
  settings: DocumentSettings = SETTINGS,
  regions: ScreenRegions = REGIONS,
): Record<string, unknown> {
  const answer = commandFromInput(keyOf('F'), contextOf(schedule, settings, regions))
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') {
    throw new Error('SK-18 owes a changeDocument and this press did not ask for one')
  }
  const fit = (action.writes as readonly (readonly DocumentCommand[])[])
    .flat()
    .filter((one) => one.kind === 'fitScheduleToScreen')
  expect(fit, 'exactly one CM-71 per press (FR-031)').toHaveLength(1)
  return fit[0] as unknown as Record<string, unknown>
}

/** The settings a document is left holding once `CM-71` has been applied. */
function settingsAfterFit(write: Record<string, unknown>, from = SETTINGS): DocumentSettings {
  return settingsOf({
    ...from,
    zoomX: write['zoomX'],
    zoomY: write['zoomY'],
    scrollDate: write['scrollDate'],
    scrollGroupId: write['scrollGroupId'],
    scrollDayOffset: write['scrollDayOffset'], // S-177
    scrollGroupOffset: write['scrollGroupOffset'], // S-176
  })
}

const fittedZoomY = (
  schedule: Schedule,
  settings: DocumentSettings = SETTINGS,
  regions: ScreenRegions = REGIONS,
): number => fitWrite(schedule, settings, regions)['zoomY'] as number

/** LC-1..LC-9 over the whole document at the smallest zoom that draws `depth`. */
const layoutAtDepth = (
  schedule: Schedule,
  depth: number,
  regions: ScreenRegions = REGIONS,
  settings: DocumentSettings = SETTINGS,
): ScheduleLayout =>
  layoutFromSchedule(schedule, settingsOf({ ...settings, zoomY: drawingZoomOf(depth) }), regions)

const deepestDrawnDepth = (layout: ScheduleLayout): number =>
  layout.rows.reduce((deepest, row) => Math.max(deepest, row.depth), 0)

/** What one press leaves drawn. */
const drawnAfterFit = (
  schedule: Schedule,
  regions: ScreenRegions = REGIONS,
  settings: DocumentSettings = SETTINGS,
): ScheduleLayout =>
  layoutFromSchedule(
    schedule,
    settingsAfterFit(fitWrite(schedule, settings, regions), settings),
    regions,
  )

/**
 * FR-055's vertical rule, spelled out: walk from the deepest tier the document
 * holds towards the shallowest, take the first whose drawing fits the Row Area,
 * and take depth 1 when even that does not fit.
 *
 * ⭐ Each tier is measured at ITS OWN smallest drawing zoom, because that is
 * where FR-055's MUST NOT lands the fit once the tier is chosen. For tiers 1 to
 * 3 that zoom is under FR-094's floor and the measurement is the same at any
 * zoom in the band; for 4 and up it is not, which is the whole subject here.
 */
function depthTheFitOwes(
  shape: TreeShape,
  regions: ScreenRegions = REGIONS,
  settings: DocumentSettings = SETTINGS,
): number {
  const schedule = scheduleOf(shape)
  const deepest = Math.min(shape.depths, settings.maxGroupDepth)
  for (let depth = deepest; depth >= 2; depth--) {
    const drawn = layoutAtDepth(schedule, depth, regions, settings)
    if (drawn.contentHeight <= regions.rowArea.height) return depth
  }
  return 1
}

// ---------------------------------------------------------------------------
// The shapes. Every one is five tiers deep, which is what S-125's default
// allows, and each is named for the answer FR-055 owes on the 1000x700 screen
// above. Each case re-derives that answer from the rule rather than trusting
// the name, and section 0 proves the names are not vacuous.
//
// ⚠️ HOW THE SIZES WERE CHOSEN, so they are choices and not guesses. Under
// FR-094's floor every one-lane row is `actualMin` / `actualOfPlan` tall; above
// it the plan height is `basePlanHeight` times `zoomY` (S-4), and LF-3 adds
// `rowGap` (S-12) between rows. So the extent of n rows at a tier's own rung is
// arithmetic, and it grows with the tier twice over: more rows AND a taller
// rung. That is why a document can fit at tier 4 and overflow at tier 5.
// ---------------------------------------------------------------------------

/** One chain of five rows -- every tier fits, so the deepest one wins. */
const FIVE_DEEP_CHAIN: TreeShape = { roots: 1, depths: 5, fanOut: 1 }
/** Two chains: ten rows at tier 5 overflow, eight rows at tier 4 fit. */
const FOUR_IS_DEEPEST: TreeShape = { roots: 2, depths: 5, fanOut: 1 }
/** Five chains: tier 4 overflows too, and tier 3 is back under the floor. */
const THREE_IS_DEEPEST: TreeShape = { roots: 5, depths: 5, fanOut: 1 }
/** Forty chains -- forty root rows alone overrun the Row Area. */
const NOTHING_FITS: TreeShape = { roots: 40, depths: 5, fanOut: 1 }

const EVERY_SHAPE: [string, TreeShape][] = [
  ['five deep, every tier fits', FIVE_DEEP_CHAIN],
  ['tier 4 is the deepest that fits', FOUR_IS_DEEPEST],
  ['tier 3 is the deepest that fits', THREE_IS_DEEPEST],
  ['not even tier 1 fits', NOTHING_FITS],
]

// ---------------------------------------------------------------------------
// 0. The premises. If any of these falls the cases below are measuring
//    something other than what they claim, so they are asserted first.
// ---------------------------------------------------------------------------

describe('the premises -- tiers 4 and 5 exist, stand above FR-094 floor, and are reachable', () => {
  it('S-125 admits a fifth tier by default, and more at its own upper bound', () => {
    // FR-004 sets the cap and table T-203's S-125 carries it, counting the root
    // row as depth 1. ⛔ A fit that can only ever answer 1 to 3 leaves tiers the
    // settings row admits unreachable. No figure is typed here: the default and
    // the bound both come out of the generated tables.
    expect(MAX_GROUP_DEPTH, 'the fixtures below are five tiers deep').toBeGreaterThanOrEqual(5)
    expect(MAX_GROUP_DEPTH_CEILING).toBeGreaterThanOrEqual(MAX_GROUP_DEPTH)
  })

  it('puts the rungs of tiers 4 and 5 ABOVE the floor and inside S-55', () => {
    // ⭐ This is why the deep tiers need pass 2 of the rule printed after table
    // T-068: below FR-094's floor the drawing does not move with `zoomY`, and
    // these two rungs are not below it. S-88 being over one is what orders them.
    expect(RATIO).toBeGreaterThan(1) // S-88
    expect(thresholdOf(3)).toBeLessThan(FLOOR_BINDS_BELOW)
    expect(thresholdOf(4)).toBeGreaterThan(FLOOR_BINDS_BELOW)
    expect(thresholdOf(5)).toBeGreaterThan(thresholdOf(4))
    // ...and FR-016 can still hold them: S-55, published for this layer as S-98.
    expect(thresholdOf(MAX_GROUP_DEPTH)).toBeLessThanOrEqual(NOT_STORED_ZOOM_BOUNDS['S-98'])
    expect(thresholdOf(MAX_GROUP_DEPTH_CEILING)).toBeLessThanOrEqual(
      NOT_STORED_ZOOM_BOUNDS['S-98'],
    )
  })

  it('FR-018 really does draw tiers 4 and 5 once the zoom reaches their rungs', () => {
    // The zoom-to-depth direction of FR-018, with S-87 / S-88 as the ladder. If
    // this fails, no fit could answer 4 or 5 whatever it decided, and the cases
    // below would be blaming the wrong unit.
    const schedule = scheduleOf(FIVE_DEEP_CHAIN)
    for (let depth = 2; depth <= MAX_GROUP_DEPTH; depth++) {
      const drawn = layoutAtDepth(schedule, depth)
      expect(deepestDrawnDepth(drawn), `depth ${depth} at its own rung`).toBe(depth)
      expect(drawn.rows).toHaveLength(rowsDownTo(FIVE_DEEP_CHAIN, depth))
    }
  })

  it('the fixtures really exercise the answers 5, 4, 3 and 1', () => {
    // ⭐ The guard the whole file rests on: re-rule the ladder, the vertical
    // chain or the screen and this fails, rather than letting the cases below
    // go quietly vacuous by all landing on the same tier.
    expect(depthTheFitOwes(FIVE_DEEP_CHAIN)).toBe(5)
    expect(depthTheFitOwes(FOUR_IS_DEEPEST)).toBe(4)
    expect(depthTheFitOwes(THREE_IS_DEEPEST)).toBe(3)
    expect(depthTheFitOwes(NOTHING_FITS)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// A. The fit reaches tier 5 and tier 4.
// ---------------------------------------------------------------------------

describe('FR-055 -- the fit chooses tiers 4 and 5, not only 1 to 3', () => {
  it('answers tier 5 for a document deep enough and a Row Area tall enough', () => {
    // FR-055 RATIONALE (MUST): settle the vertical by choosing the display
    // amount, walking from the deepest tier the document holds and taking the
    // deepest whose drawing fits the Row Area. Here that is 5.
    const schedule = scheduleOf(FIVE_DEEP_CHAIN)
    expect(depthTheFitOwes(FIVE_DEEP_CHAIN)).toBe(5)

    const drawn = drawnAfterFit(schedule)
    expect(deepestDrawnDepth(drawn)).toBe(5)
    expect(drawn.rows).toHaveLength(rowsDownTo(FIVE_DEEP_CHAIN, 5))
    expect(drawn.contentHeight).toBeLessThanOrEqual(REGIONS.rowArea.height)
  })

  it('answers tier 4 when tier 5 does not fit', () => {
    // The same rule one rung down: tier 5's rung is taller AND the tier holds
    // more rows, so a document can overflow at 5 and fit at 4.
    const schedule = scheduleOf(FOUR_IS_DEEPEST)
    expect(depthTheFitOwes(FOUR_IS_DEEPEST)).toBe(4)

    const drawn = drawnAfterFit(schedule)
    expect(deepestDrawnDepth(drawn)).toBe(4)
    expect(drawn.rows).toHaveLength(rowsDownTo(FOUR_IS_DEEPEST, 4))
    expect(drawn.contentHeight).toBeLessThanOrEqual(REGIONS.rowArea.height)
    // ...and the case is not vacuous: tier 5 really is the one that overflows.
    expect(layoutAtDepth(schedule, 5).contentHeight).toBeGreaterThan(REGIONS.rowArea.height)
  })

  it('answers the DEEPEST tier that fits, not merely a tier that fits', () => {
    // ⛔ THE DISCRIMINATING CASE. On FIVE_DEEP_CHAIN tiers 2, 3 and 4 all fit,
    // so an implementation that stops at the first tier it finds acceptable --
    // or that caps the walk at 3 -- answers something that FITS and is still
    // wrong. FR-055 asks for the deepest.
    const schedule = scheduleOf(FIVE_DEEP_CHAIN)
    for (let depth = 2; depth <= MAX_GROUP_DEPTH; depth++) {
      expect(
        layoutAtDepth(schedule, depth).contentHeight,
        `tier ${depth} fits, so answering it would be "a tier that fits"`,
      ).toBeLessThanOrEqual(REGIONS.rowArea.height)
    }
    expect(deepestDrawnDepth(drawnAfterFit(schedule))).toBe(MAX_GROUP_DEPTH)
  })

  it.each(EVERY_SHAPE)('draws every row at or above the tier it chose (%s)', (_name, shape) => {
    // LC-1 has nothing to drop in these fixtures (nothing is collapsed and
    // nothing is hidden), so what LC-2 keeps is the whole prefix of the tree.
    const schedule = scheduleOf(shape)
    const owed = depthTheFitOwes(shape)
    const drawn = drawnAfterFit(schedule)

    expect(deepestDrawnDepth(drawn)).toBe(owed)
    expect(drawn.rows).toHaveLength(rowsDownTo(shape, owed))
  })
})

// ---------------------------------------------------------------------------
// B. The zoom the deep tiers land on.
// ---------------------------------------------------------------------------

describe('FR-055 -- the zoom never falls below the rung of the tier that was chosen', () => {
  it.each(EVERY_SHAPE)('stands at or above its chosen tier rung (%s)', (_name, shape) => {
    // FR-055 (MUST NOT): do not take `zoomY` below the smallest zoom that draws
    // the chosen tier. For tiers 4 and 5 that zoom is ABOVE FR-094's floor, so
    // the fit has to RAISE the zoom to honour its own choice -- which is the
    // half of the rule a shrink-to-fit implementation cannot satisfy.
    const owed = depthTheFitOwes(shape)
    const zoomY = fittedZoomY(scheduleOf(shape))
    if (owed >= 2) expect(zoomY).toBeGreaterThanOrEqual(thresholdOf(owed))
    // ⛔ And no higher than the tier below the next one, wherever the document
    // actually holds a deeper tier: FR-055's "take the deepest that fits" is
    // what forbids climbing, and it has nothing to bite on when there is none.
    if (owed < Math.min(shape.depths, MAX_GROUP_DEPTH)) {
      expect(zoomY).toBeLessThan(thresholdOf(owed + 1))
    }
  })

  it('raises the zoom above FR-094 floor when the tier it chose demands it', () => {
    // ⭐ Stated separately because it is the observable that separates choosing
    // a tier from dividing by the extent: FIVE_DEEP_CHAIN draws five rows in a
    // Row Area that would hold far more of them at FR-094's floor, and FR-055's
    // MUST NOT still requires the zoom to sit on the chosen tier's own rung.
    expect(fittedZoomY(scheduleOf(FIVE_DEEP_CHAIN))).toBeGreaterThan(FLOOR_BINDS_BELOW)
    expect(fittedZoomY(scheduleOf(FOUR_IS_DEEPEST))).toBeGreaterThan(FLOOR_BINDS_BELOW)
  })

  it.each(EVERY_SHAPE)('stays inside S-75 / S-76 (FR-016, with S-54 and S-55) (%s)', (
    _name,
    shape,
  ) => {
    const zoomY = fittedZoomY(scheduleOf(shape))
    expect(zoomY).toBeGreaterThanOrEqual(NOT_STORED_ZOOM_BOUNDS['S-97'])
    expect(zoomY).toBeLessThanOrEqual(NOT_STORED_ZOOM_BOUNDS['S-98'])
  })
})

// ---------------------------------------------------------------------------
// C. Nothing fits -- the shallowest tier, never a refusal.
// ---------------------------------------------------------------------------

describe('FR-055 -- when not even tier 1 fits, it answers tier 1 and leaves the scroll', () => {
  const schedule = scheduleOf(NOTHING_FITS)

  it('answers tier 1 rather than refusing, on a document five tiers deep', () => {
    // FR-055 STATEMENT: fitting is not guaranteed, and the axis that does not
    // fit keeps its scroll. RATIONALE: when depth 1 does not fit either, take
    // depth 1 and leave the vertical scroll.
    const drawn = drawnAfterFit(schedule)
    expect(deepestDrawnDepth(drawn)).toBe(1)
    expect(drawn.rows).toHaveLength(NOTHING_FITS.roots)
    expect(drawn.contentHeight).toBeGreaterThan(REGIONS.rowArea.height)
  })

  it('does not keep shrinking past the point where shrinking only deletes rows', () => {
    // FR-018 (MUST NOT) forbids the reversal, and FR-055's MUST NOT explains
    // why going lower buys nothing: under FR-094's floor the bands do not
    // shrink. Depth 1 has no rung of its own, so the bounds the specification
    // does state are these two.
    const zoomY = fittedZoomY(schedule)
    expect(zoomY).toBeLessThan(thresholdOf(2))
    expect(zoomY).toBeGreaterThanOrEqual(NOT_STORED_ZOOM_BOUNDS['S-97'])
  })
})

// ---------------------------------------------------------------------------
// D. More room opens a deeper tier -- monotonicity carried across the fit.
// ---------------------------------------------------------------------------

describe('FR-018 / FR-055 -- a taller Row Area never answers a shallower tier', () => {
  it.each(EVERY_SHAPE)('the tall screen answers at least as deep (%s)', (_name, shape) => {
    expect(REGIONS_TALL.rowArea.height).toBeGreaterThan(REGIONS.rowArea.height)
    const schedule = scheduleOf(shape)
    const short = deepestDrawnDepth(drawnAfterFit(schedule, REGIONS))
    const tall = deepestDrawnDepth(drawnAfterFit(schedule, REGIONS_TALL))
    expect(tall).toBeGreaterThanOrEqual(short)
  })

  it('and the tall screen really opens tier 5 where the short one answered 4', () => {
    // Otherwise the walk above is a row of tautologies. FOUR_IS_DEEPEST
    // overflows at tier 5 on the short screen and fits on the tall one.
    expect(depthTheFitOwes(FOUR_IS_DEEPEST, REGIONS)).toBe(4)
    expect(depthTheFitOwes(FOUR_IS_DEEPEST, REGIONS_TALL)).toBe(5)
    expect(deepestDrawnDepth(drawnAfterFit(scheduleOf(FOUR_IS_DEEPEST), REGIONS_TALL))).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// E. S-125's own upper bound. The cap is a setting, not the figure 3 or 5.
// ---------------------------------------------------------------------------

describe('FR-055 / FR-018 -- the fit follows S-125 rather than a tier number of its own', () => {
  // FR-018 (MAY / MUST NOT) lets the level-of-detail judgement cap the depth at
  // S-125 and forbids capping the value written back. ⛔ The figure is not typed
  // here: a document standing at S-125's own upper bound has that many tiers for
  // the fit to choose among, and FR-055's "deepest that fits" reaches the last
  // of them.

  it('reaches the deepest tier S-125 upper bound admits, given a Row Area to hold it', () => {
    const settings = settingsOf({ ...SETTINGS, maxGroupDepth: MAX_GROUP_DEPTH_CEILING })
    const shape: TreeShape = { roots: 1, depths: MAX_GROUP_DEPTH_CEILING, fanOut: 1 }
    const schedule = scheduleOf(shape)
    // The screen is SIZED FROM THE RULE rather than guessed. At the deepest
    // tier's own rung the plan height is `basePlanHeight` times that rung (S-4,
    // above FR-094's floor) and LF-3 puts `rowGap` (S-12) between the rows, so
    // the extent of a chain that deep is arithmetic. Half again, plus room for
    // the header, the ruler band, the padding and the scrollbar lane.
    const bandHeight = settingNumber('basePlanHeight') * thresholdOf(MAX_GROUP_DEPTH_CEILING)
    const extent =
      MAX_GROUP_DEPTH_CEILING * bandHeight + (MAX_GROUP_DEPTH_CEILING - 1) * settingNumber('rowGap')
    const env: ScreenEnvironment = { ...ENV, height: Math.ceil(extent * 1.5) + 400 }
    const regions = regionsFromScreen(env, settings)
    expect(regions.rowArea.height).toBeGreaterThan(extent)

    expect(depthTheFitOwes(shape, regions, settings)).toBe(MAX_GROUP_DEPTH_CEILING)
    const drawn = drawnAfterFit(schedule, regions, settings)
    expect(deepestDrawnDepth(drawn)).toBe(MAX_GROUP_DEPTH_CEILING)
    expect(fittedZoomY(schedule, settings, regions)).toBeGreaterThanOrEqual(
      thresholdOf(MAX_GROUP_DEPTH_CEILING),
    )
  })

  it('does not reach past S-125 when the document itself is shallower', () => {
    // The other half of the same rule: the walk starts at the deepest tier the
    // DOCUMENT holds, so a three-tier document is answered with three even
    // though S-125 would admit more.
    const shape: TreeShape = { roots: 1, depths: 3, fanOut: 1 }
    const schedule = scheduleOf(shape)
    expect(depthTheFitOwes(shape)).toBe(3)
    expect(deepestDrawnDepth(drawnAfterFit(schedule))).toBe(3)
  })
})
