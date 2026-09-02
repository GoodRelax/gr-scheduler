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
//     ⭐ THE LAST THREE BLOCKS OF THIS FILE NARROW THAT (ledger row D-24,
//     2026-09-03). They still count no runs -- what they measure is what the
//     passes leave behind: that the ordinary layout cannot fit at all, that a
//     tier the FLOOR measurement admits is refused anyway (which only a second
//     measurement can do), and that the retreat never goes past one tier (which
//     a third would).
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
import { specTable } from '../contract/spec-table'

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

/** The plan height FR-094 pins a lane at, once the zoom is under that floor. */
const PINNED_PLAN_HEIGHT = settingNumber('actualMin') / settingNumber('actualOfPlan')

/**
 * The px figure one row of 表 T-206 prints in its default column.
 *
 * ⛔ Not read off SETTINGS_DEFAULTS: 表 T-206 says of both rows below that the
 * document does not keep them, so they are screen tooling and not settings.
 */
const settingsTablePx = (id: string): number => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(row.by['既定'] ?? '')
  if (found === null) throw new Error(`table T-206 row ${id} states no number in its default`)
  return Number(found[0])
}

/**
 * 表 T-221 の `LF-3` / 表 T-051 の `HF-19` (MUST, 利用者の裁定 2026-09-03): the
 * floor a row's band may not fall below, which is `HF-1`'s 2 x 2 lattice.
 *
 * ⛔ NEITHER ROW STATES A NUMBER -- 「⚠️ **床を数で書かない** —— 操作子 1 つの外形は
 * … 表 T-206 の `S-138` と `S-141` が決めており、格子はその 2 段ぶんである」. So it is
 * composed here: `FR-029` (MUST) draws the glyph in a box of `S-138` a side and
 * keeps at least `S-141` between that box and the entrance's frame on each side,
 * and `HF-1` (MUST) stacks four of those 「2 × 2 の格子」.
 * ⚠️ A CONSTANT: `HF-19` 「⛔⛔ **この床を閲覧者の文字サイズに追随させてはならない
 * （MUST NOT）**」, so it does not climb with the tier the way the rungs do.
 */
const CONTROL_LATTICE_FLOOR = (settingsTablePx('S-138') + settingsTablePx('S-141') * 2) * 2

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
//
// ⭐⭐ AND SINCE 2026-09-03 A SECOND FLOOR STANDS UNDER EVERY BAND (CR-339 +
// CR-342). 表 T-221 の `LF-3`: 「**帯高は矩形が縦に取る高さを下回らず、かつ、その行の
// 操作子（表 T-051 の `HF-1` の格子）が縦に取る高さも下回らない**」, restated as a
// MUST NOT by 表 T-051 の `HF-19`. `CONTROL_LATTICE_FLOOR` below composes it out
// of 表 T-206, and it stands above the plan height at every rung whose zoom is
// under FR-094's floor -- so a row at tiers 1 to 4 is the LATTICE tall, and only
// tier 5's rung lifts the plan height clear of it.
// ⇒ the sizes below were re-chosen when that floor landed. ⛔ The ANSWERS each
// fixture is named for did not move; the row counts that produce them did.
// ---------------------------------------------------------------------------

/** One chain of five rows -- every tier fits, so the deepest one wins. */
const FIVE_DEEP_CHAIN: TreeShape = { roots: 1, depths: 5, fanOut: 1 }
/** Two chains: ten rows at tier 5 overflow, eight rows at tier 4 fit. */
const FOUR_IS_DEEPEST: TreeShape = { roots: 2, depths: 5, fanOut: 1 }
/** Three chains: twelve rows at tier 4 overflow, nine rows at tier 3 fit. */
const THREE_IS_DEEPEST: TreeShape = { roots: 3, depths: 5, fanOut: 1 }
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

  it('⭐ and LF-3 puts the CONTROLS under every band the low tiers draw', () => {
    // 表 T-221 の `LF-3` (MUST, 利用者の裁定 2026-09-03): 「**帯高は矩形が縦に取る
    // 高さを下回らず、かつ、その行の操作子（表 T-051 の `HF-1` の格子）が縦に取る
    // 高さも下回らない**」, restated as a MUST NOT by 表 T-051 の `HF-19`.
    // ⛔ THIS IS WHAT SIZES EVERY FIXTURE ABOVE. Tiers 1 to 4 draw a row the
    // LATTICE tall, because the lattice outruns the plan height at any rung
    // under FR-094's floor and at tier 4's rung as well; only tier 5's rung
    // lifts the plan clear of it, which is what makes tier 5 the tier a
    // document overflows at.
    expect(CONTROL_LATTICE_FLOOR).toBeGreaterThan(PINNED_PLAN_HEIGHT)
    const planAt = (depth: number): number => settingNumber('basePlanHeight') * thresholdOf(depth)
    expect(planAt(4)).toBeLessThan(CONTROL_LATTICE_FLOOR)
    expect(planAt(5)).toBeGreaterThan(CONTROL_LATTICE_FLOOR)
    // ...and the manuscript still says both halves of the rule.
    const says = (table: string, id: string): string => {
      const row = specTable(table).rows.find((one) => one.id === id)
      if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
      return row.cells.join(' ')
    }
    expect(says('T-221', 'LF-3')).toContain(
      '帯高は矩形が縦に取る高さを下回らず、かつ、その行の操作子（表 T-051 の `HF-1` の格子）が縦に取る高さも下回らない',
    )
    expect(says('T-051', 'HF-19')).toContain('行の帯がそれを下回ってはならない（MUST NOT）')
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

// ---------------------------------------------------------------------------
// The rule printed after table T-068 -- the two passes, and the third that is
// forbidden (ledger row D-24)
//
//   「⭐ **全体を収める表示（`FR-055`）だけが本表を 2 回まで走らせる。**」
//   | 1 | 人が畳んだ状態をすべて捨て…**帯の高さが `FR-094` の床に達する倍率で、
//       その文書が持つすべての深さを通して** `LC-1` 〜 `LC-9` を走らせ…⭐ **その床
//       より下では絵が倍率に依らないので、1 回測れば床の内側に収まる段の縦幅は算術
//       で出る** |
//   | — | **採った段が床の内側の倍率で描けるなら、それで決まる** |
//   | 2 | **採った段が床より上の倍率を要するときだけ**もう 1 度通し、その倍率での
//       実寸を見て、**収まらなければ 1 つ浅い段へ退く** |
//   「**3 回目を走らせてはならない（MUST NOT）** —— 反復が終わる保証が無く、**表示
//     量が行き来すると振動する。**」
//
// ⛔ THE HEAD OF THIS FILE SAYS 「WHICH OF THE TWO PASSES ANSWERED」 IS NOT
// ASSERTED, and that stays true: no case below counts runs. What they measure is
// what the passes leave BEHIND, which the rule does make observable:
//
//   (a) 「だけ」 -- the ordinary road runs the order once. A second pass is what
//       fitting IS, so the ordinary layout cannot know how tall the Row Area is;
//       if it ran one, its answer would move when the Row Area's height moved.
//   (b) 「2 回目」 -- pass 1 measures at the floor, where the drawing does not
//       move with `zoomY`, so a tier whose rows fit AT THE FLOOR is a tier pass 1
//       admits. A fit that then refuses such a tier has measured it again
//       somewhere else, and pass 2 is the only place the rule allows.
//   (c) 「3 回目を走らせてはならない」 -- pass 2 may retreat 「1 つ浅い段へ」, once.
//       So the tier answered can never be more than one tier shallower than the
//       one pass 1 admits. A walk that kept retreating until something fitted
//       would break that bound on the shapes below, and would be the iteration
//       the MUST NOT forbids.
//
// ⭐ WHAT PASS 1 ADMITS IS RECONSTRUCTED, NOT GUESSED. `FLOOR_BINDS_BELOW` is
// the zoom under which FR-094 pins the plan height, so every row is the same
// height there whatever the tier; a FLAT document of `rowsDownTo(shape, d)` rows
// laid out under that floor therefore has exactly the extent tier `d` has at the
// floor -- which is the arithmetic the pass-1 row says can be done from one
// measurement (「1 回測れば床の内側に収まる段の縦幅は算術で出る」).
// ---------------------------------------------------------------------------

/** `LC-1` .. `LC-9` under FR-094's floor, where the drawing does not move. */
const UNDER_THE_FLOOR = settingsOf({ ...SETTINGS, zoomY: FLOOR_BINDS_BELOW / 2 })

/** The extent tier `depth` of a shape has when it is drawn at the floor. */
const floorExtentOf = (shape: TreeShape, depth: number): number =>
  layoutFromSchedule(
    scheduleOf({ roots: rowsDownTo(shape, depth), depths: 1, fanOut: 1 }),
    UNDER_THE_FLOOR,
    REGIONS,
  ).contentHeight

/** The deepest tier pass 1's floor measurement admits; 0 when none of them fits. */
const floorAdmits = (shape: TreeShape): number => {
  for (let depth = Math.min(shape.depths, MAX_GROUP_DEPTH); depth >= 1; depth--) {
    if (floorExtentOf(shape, depth) <= REGIONS.rowArea.height) return depth
  }
  return 0
}

describe('T-068 -- only the fit runs the order more than once', () => {
  it('⛔ the ordinary layout cannot fit: its answer does not move with the Row Area height', () => {
    // 「⭐ **全体を収める表示（`FR-055`）だけが本表を 2 回まで走らせる。**」 and the
    // closing MUST of the table itself: 「上から順に 1 度だけ通ること（MUST）。後の
    // 段の結果を前の段へ戻してはならない（MUST NOT）」.
    // ⭐ Fitting means choosing the display amount against the room there is
    // (FR-055), so a layout that chose would read `rowArea.height`. Doubling the
    // screen must leave the drawing where it was.
    // GOES RED IF: `layoutFromSchedule` starts fitting on its own -- the deeper
    // shapes below would then draw a different number of rows on the tall screen.
    for (const [name, shape] of EVERY_SHAPE) {
      const schedule = scheduleOf(shape)
      const short = layoutFromSchedule(schedule, SETTINGS, REGIONS)
      const tall = layoutFromSchedule(schedule, SETTINGS, REGIONS_TALL)
      expect(tall.contentHeight, `${name}: the extent followed the Row Area`).toBeCloseTo(
        short.contentHeight,
        6,
      )
      expect(deepestDrawnDepth(tall), `${name}: the tier followed the Row Area`).toBe(
        deepestDrawnDepth(short),
      )
    }
  })
})

describe('T-068 pass 2 -- the tier the floor admits and the fit refuses', () => {
  it('⭐ the premise: the floor measurement really does admit the deepest tier here', () => {
    // ⛔ Without this the case below would only be saying "the fit answered 4",
    // which this file already says elsewhere. What makes it pass 2's is that
    // pass 1 had no reason to refuse tier 5.
    const deepest = Math.min(FOUR_IS_DEEPEST.depths, MAX_GROUP_DEPTH)
    expect(floorExtentOf(FOUR_IS_DEEPEST, deepest)).toBeLessThanOrEqual(REGIONS.rowArea.height)
    expect(floorAdmits(FOUR_IS_DEEPEST)).toBe(deepest)
    // And its rung stands above the floor, which is the condition the rule puts
    // on pass 2 running at all: 「採った段が床より上の倍率を要するときだけ」.
    expect(drawingZoomOf(deepest)).toBeGreaterThan(FLOOR_BINDS_BELOW)
  })

  it('⛔ refuses that tier all the same, which only a second measurement can do', () => {
    // 「2 | **採った段が床より上の倍率を要するときだけ**もう 1 度通し、その倍率での
    // 実寸を見て、**収まらなければ 1 つ浅い段へ退く**」.
    // GOES RED IF: the fit answers from the floor measurement alone -- it would
    // then keep tier 5, whose rows fit at the floor and overflow at their rung,
    // and write a picture that does not fit. That is the state D-24 records
    // (「`frame-loop.ts` は 1 回走らせて無条件に採る」).
    const deepest = Math.min(FOUR_IS_DEEPEST.depths, MAX_GROUP_DEPTH)
    const drawn = drawnAfterFit(scheduleOf(FOUR_IS_DEEPEST))
    expect(deepestDrawnDepth(drawn), '表 T-068 の 2 回目が走っていない').toBe(deepest - 1)
    // ⭐ And the drawing it landed on does fit, which is what the second
    // measurement bought.
    expect(drawn.contentHeight).toBeLessThanOrEqual(REGIONS.rowArea.height)
  })
})

describe('T-068 (MUST NOT) -- and no third run', () => {
  it('⛔ retreats at most ONE tier from the one the floor measurement admits', () => {
    // 「**3 回目を走らせてはならない（MUST NOT）** —— 反復が終わる保証が無く、表示量
    // が行き来すると振動する。」 Pass 2 retreats 「1 つ浅い段へ」 and stops, so the
    // gap between what pass 1 admits and what is drawn is at most one -- and
    // FR-055 floors the whole thing at depth 1 (「収まらない軸にスクロールを残す
    // ことは `FR-055` が既に定めている」).
    // GOES RED IF: the fit walks the tiers down until one fits. On the shape
    // whose tier 4 also overflows, such a walk would land two tiers below what
    // the floor admits, which is a third run of the order.
    for (const [name, shape] of EVERY_SHAPE) {
      const admitted = floorAdmits(shape)
      const answered = deepestDrawnDepth(drawnAfterFit(scheduleOf(shape)))
      expect(answered, `${name}: 表 T-068 の 3 回目が走っている`).toBeGreaterThanOrEqual(
        Math.max(1, admitted - 1),
      )
      expect(answered, `${name}: the fit drew deeper than the floor admits`).toBeLessThanOrEqual(
        Math.max(1, admitted),
      )
    }
  })

  it('⛔ so one press is already the end of it: pressing again moves nothing', () => {
    // The MUST NOT's own reason, stated as what a reader would see:
    // 「表示量が行き来すると振動する」. ⭐ The measurement D-24 records for the
    // naive second pass was 1.0 → 0.4291 → 0.7322 → 0.3785 → …, a sequence that
    // never settles; what stops it is that there is no third run.
    // GOES RED IF: the fit becomes an iteration -- the second press then answers
    // something other than the first.
    for (const [name, shape] of EVERY_SHAPE) {
      const schedule = scheduleOf(shape)
      const once = fitWrite(schedule, SETTINGS, REGIONS)
      const settled = settingsAfterFit(once)
      const twice = fitWrite(schedule, settled, REGIONS)
      expect(twice['zoomY'], `${name}: the vertical went on moving`).toBeCloseTo(
        once['zoomY'] as number,
        6,
      )
      // ⚠️ THE VERTICAL ONLY. This file's head keeps every horizontal figure
      // out (FR-055 settles that axis by another rule), and the `CM-71` write
      // does not carry `zoomX` under that name at all -- measured 2026-09-03.
      expect(
        deepestDrawnDepth(
          layoutFromSchedule(schedule, settingsAfterFit(twice, settled), REGIONS),
        ),
        `${name}: the tier moved on the second press`,
      ).toBe(deepestDrawnDepth(layoutFromSchedule(schedule, settled, REGIONS)))
    }
  })
})
