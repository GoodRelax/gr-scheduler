// Unit tests for the ruling of 2026-08-27 that took the plain press away from
// the two rows of 表 T-023d which carry only a double click -- GR-10 and GR-11
// -- and folded MK-13's name-label and body targets into one.
//
// The units driven are UF-7 `item-hit-area.ts` (`ItemHitArea`, CP-7 of table
// T-062, published as PI-7 of table T-064) and UF-30
// `input-command-translator.ts` (`InputCommandTranslator`, CP-18, PI-18). One
// file drives both because the ruling is a seam between them: the hit test says
// WHICH row claimed the point, and the translator says what the row then does.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ EVERY EXPECTED VALUE BELOW COMES FROM docs/spec, never from the tree
// (docs/development-rules/04-verification.md section 1 -- the one who wrote a
// unit does not write its test). The specification was read first and in full
// for each row named below, and each case was decided against the row before
// anything in `src/` was opened.
//
// ⚠️ WHAT WAS READ OF `src/`, STATED HONESTLY RATHER THAN CLAIMED AWAY. Beyond
// the head comments and the exported declarations these cases must call --
// `item-hit-area.ts` (`Item`, `GrabArea`, `Hit`, `PointerSlop`, `itemAtPointer`,
// `NOT_STORED_SIZES`), `schedule-geometry.ts` (`TaskGeometry`, `BarGeometry`,
// `geometryFromLayout`), `schedule-layout.ts` (`TaskPlacement`,
// `layoutFromSchedule`, `taskPlacement`), `screen-state.ts` (its writers and
// `EscapeContext`) and `input-command-translator.ts` (`InputContext`,
// `InputAction`, `TranslatedInput`, `PointerPress`, `pressRowOf`,
// `commandFromInput`, `screenStateFromInput`) -- FOUR PIECES OF BODY WERE ALSO
// READ, and they are named here so a reader can weigh the cases against that:
//   - `commandFromGrab`'s two MK-13 branches and its GR-12 arm, to learn which
//     `DocumentCommand` spells a plan move (`setTaskPlanDates`);
//   - the `isTextEntryUnsettled` and `Esc` branches of the key path, and
//     `escapeContextOf`, to learn that `EscapeContext` has no member for the
//     in-place edit;
//   - `changed`, to learn that an empty bundle still answers 「assigned」;
//   - `edit-task.ts`'s command union, to learn CM-25's spelling.
// ⭐ NONE OF THAT SET AN EXPECTED VALUE. It supplied spellings and told the
// tester where the tree stands, which is what makes the ⛔ notes below able to
// say WHY a case is red instead of merely that it is.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose):
//   T-023d  GR-10 / GR-11 -- the two rows that carry only a double click, and
//           the closing rule under the table that takes the plain press away
//           from them
//   T-023d  GR-12 -- the plan bar body, which the closing rule protects
//   T-023   MK-13 -- the double click, as it now reads
//   T-028   IN-4 -- the order Esc consumes, with the unsettled in-place edit
//           now at its head
//   T-028   IN-5a -- the keys an unsettled in-place edit takes
//   T-013   NL-1 -- the label drawn inside the shape, which is the whole reason
//           the closing rule exists
//   T-012   SH-1 -- the shape the fixture uses
//   T-038   OC-2 -- where the assignee label juts out
//   FR-093  the label width estimate the fixture is built on
//   FR-011 / FR-029 / FR-031 / FR-072
//
// ⭐ SOME OF THESE ARE EXPECTED TO BE RED, and that is the point (04-verification
// section 1): the expected value states what the specification says. Each such
// case names the row it reads and says what the tree does instead.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithSurface,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  NOT_STORED_SIZES,
  itemAtPointer,
  type Hit,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type BarGeometry,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  pressRowOf,
  screenStateFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type PointerInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

// ---------------------------------------------------------------------------
// Fixed copies of the rows these cases are driven by. Chapter 1.9 asks a test
// of a requirement that points at a table to be driven by a fixed copy of it.
// ---------------------------------------------------------------------------

/**
 * 表 T-023d, most-preferred first, in the table's own PRINTED order -- which is
 * not the numeric order of the row ids. 「上の行ほど優先すること（MUST）」.
 */
const T_023D = [
  'GR-19',
  'GR-1', 'GR-2', 'GR-3', 'GR-4', 'GR-5', 'GR-6', 'GR-7', 'GR-8', 'GR-9', 'GR-17',
  'GR-10', 'GR-11', 'GR-15', 'GR-18', 'GR-12', 'GR-13', 'GR-14', 'GR-16',
] as const

/**
 * The rows the closing rule under 表 T-023d names -- 「ダブルクリックだけを持つ行」.
 * ⭐ Both are ONLY that: GR-10 lost 「ラベルだけをずらす」 on 2026-08-27 and now
 * carries 「掴んで動かさない（MUST NOT）」; GR-11 never carried anything else.
 */
const DOUBLE_CLICK_ONLY = ['GR-10', 'GR-11'] as const

/**
 * The row the closing rule protects, and its reason in one word: with GR-10
 * standing as a grab, a Task that has a name puts its label inside its own bar
 * (NL-1) and GR-12 can no longer be reached there.
 */
const PROTECTED_BY_THE_CLOSING_RULE = 'GR-12'

/**
 * MK-13's targets, as the row now prints them. FOUR, not five: the name label
 * and the body were folded into one target on 2026-08-27, and the row now
 * carries a MUST NOT against the properties panel.
 */
const MK_13_TARGETS = [
  { what: 'commentBox', edits: 'the comment text (FR-097)' },
  { what: 'task -- name label OR body', edits: 'the name' },
  { what: 'assigneeLabel', edits: 'the resource name' },
  { what: 'rowTitle', edits: 'the row name' },
] as const

/** What MK-13 may NOT be a road to (MUST NOT), spelled as `InputAction.kind`. */
const MK_13_FORBIDDEN_ACTION = 'openPropertiesPanel'

/**
 * IN-4's levels, outermost LAST, in the order the row now fixes.
 *
 * ⚠️ SIX SINCE 2026-08-27, and the first one is new: 「確定していないその場の
 * 編集」 stands ahead of the open surface because it is the innermost thing on
 * screen. The row's own reason is that RS-8 of table T-233 already said the
 * next move is 「確定するか取り消すか」 and no way to cancel had been fixed.
 */
const IN_4_LEVELS = [
  'unsettled in-place edit',
  'open surface',
  'gesture in flight / half-drawn arrow',
  'armed',
  'Dual Cursor mode',
  'standing tooltip',
] as const

/**
 * IN-5a's in-place fields. ⚠️ 注記の本文（`FR-097`）joined the list in the same
 * pass that put the in-place edit at the head of IN-4.
 */
const IN_5A_FIELDS = ['name', 'resource name', 'row name', 'document name', 'comment text'] as const

// ---------------------------------------------------------------------------
// Inputs. A whole DocumentSettings is 100+ keys, so a case pins the ones it
// means and everything else comes from SETTINGS_DEFAULTS, which is generated
// from the manuscript.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01', // S-77, pinned so the day-to-x map has an origin
  scrollGroupId: 'g1', // S-78, pinned so a row is at the top
  stackDirection: 'down', // S-58, pinned so every y reads from the top
  rulerHeight: 48,
  rulerFont: 12,
  // ⭐ S-60. OC-2 of table T-038 counts the assignee label ONLY while it is
  // shown (MUST NOT otherwise), so the GR-11 case below cannot be written at
  // the default. Every other case is indifferent to it.
  assigneeVisible: true,
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * S-53 arrives as a value (`InputContext.zoomStep`) because no generator brings
 * table T-201 into `src/`. Deliberately NOT the figure the manuscript prints --
 * no case here reads it, and a stand-in makes that plain.
 */
const ZOOM_STEP = 3

/** Today, spelled the way a date column is spelled. */
const TODAY = '2026-03-01T00:00:00'

const NEW_GROUP_ID = 'row-minted-outside'

// Every nullable column has to be spelled `null`; leaving one `undefined` reads
// as "set".
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: 10,
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

// ---------------------------------------------------------------------------
// ⭐ THE FIXTURE, AND WHY THE LABEL REALLY LANDS INSIDE THE BAR.
//
// NL-1 of table T-013 puts the label inside the shape when the truncated label
// FITS the Task's width, and FR-093 fixes how that width is reckoned: units
// counted 2 for a full-width character and 1 for a half-width one, times the
// type size, times `labelCoef` (S-30). ⛔ Nothing here measures a glyph -- the
// same MUST NOT FR-093 puts on the product applies to its test.
//
// So the fixture is chosen at the two ends of that estimate:
//   - the NAME is two half-width characters, which is 2 units, the smallest
//     estimate a visible name can have that is still more than one glyph;
//   - the SPAN is a whole month, which at `pxPerDayAt1x` (S-1) and `zoomX` at
//     its default is well over a hundred pixels.
// The estimate is therefore a small fraction of the bar, with room to spare for
// `labelPad` (S-31) at both ends.
//
// ⚠️ NONE OF THAT IS TRUSTED. The first describe below RE-DERIVES the estimate
// from `SETTINGS.labelCoef`, `SETTINGS.labelPad` and the drawn type size the
// layout reports (`TaskPlacement.labelFontSize`), and asserts against the
// layout's own answer (`labelPlacement`) and the drawn rectangle
// (`TaskGeometry.label`) that the label is inside the bar. A fixture that
// stopped being inside would fail there, loudly, instead of quietly turning
// every case in this file into a test of NL-3.
// ---------------------------------------------------------------------------

/** Two half-width units (FR-093), so the estimate is as small as it can honestly be. */
const NAME_INSIDE = 'ab'

/**
 * The assignee the GR-11 case presses beside. Four half-width units, so that
 * the label OC-2 juts out to the left of the bar is wide enough for its own
 * middle to stand clear of the endpoint grabs that sit above GR-11.
 */
const ASSIGNEE_NAME = 'RRRR'

/** The Task the closing rule is about: named, with its label inside its bar. */
const TASK_NAMED = taskOf({
  uid: 1,
  name: NAME_INSIDE,
  start: '2026-01-05',
  finish: '2026-02-05',
})

/**
 * The Task the GR-11 case presses beside.
 *
 * ⚠️ IT CARRIES AN ACTUAL ON PURPOSE. FR-043 draws the two dummies of GR-9 and
 * GR-17 on a Task that has not started, and their hit box is S-93 -- which
 * reaches further to the left of the plan start than the assignee label sits.
 * With an actual recorded there is no dummy, so what the probe left of the bar
 * answers is about GR-11 and nothing else.
 */
const TASK_ASSIGNED = taskOf({
  uid: 2,
  name: NAME_INSIDE,
  start: '2026-01-05',
  finish: '2026-02-05',
  actualStart: '2026-01-05',
  // AT-35, counted in worked days.
  actualDuration: 10,
  percentComplete: 50,
})

const ROW_COUNT = 8

const SCHEDULE = scheduleOf({
  tasks: [TASK_NAMED, TASK_ASSIGNED],
  resources: [
    {
      uid: 11,
      name: ASSIGNEE_NAME,
      resourceKind: null,
      isCostResource: null,
      calendarUid: null,
      carry: {},
      carryElements: [],
    },
  ],
  assignments: [{ uid: 21, taskUid: 2, resourceUid: 11, carry: {}, carryElements: [] }],
  taskGroups: Array.from({ length: ROW_COUNT }, (_unused, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    height: null,
  })),
  taskGroupMembers: [
    { groupId: 'g1', taskUid: 1 },
    { groupId: 'g2', taskUid: 2 },
  ],
})

/** ADR-001 has the shell compute these once a frame and hand them round. */
const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY: ScheduleGeometry = geometryFromLayout(
  SCHEDULE,
  SETTINGS,
  LAYOUT,
  REGIONS,
  emptySelection(),
)

const documentOf = (schedule: Schedule, settings: DocumentSettings = SETTINGS): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const DOCUMENT = documentOf(SCHEDULE)

const BASE: InputContext = {
  document: DOCUMENT,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
  screenState: emptyScreenState(),
  selection: emptySelection(),
  zoomStep: ZOOM_STEP,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  // table T-023's closing rule -- no surface stands over these cases.
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: TODAY,
  newGroupId: NEW_GROUP_ID,
  newCommentBoxId: 'comment-box-minted-outside',
  newHighlightBoxId: 'highlight-box-minted-outside',
}

const contextOf = (part: Partial<InputContext> = {}): InputContext => ({ ...BASE, ...part })

/**
 * The reach each row of table T-023d is grabbed by.
 *
 * ⭐ READ FROM THE GENERATED CONSTANT, not typed out. Table T-206 keeps S-90 to
 * S-93 and S-137 out of the document because they belong to the reader's
 * environment, so `itemAtPointer` ships no default and takes them as an
 * argument; `NOT_STORED_SIZES` is what the manuscript prints into `src/`.
 */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // S-92 is a square, and this member is its half-width.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'][0],
  dummyHeight: NOT_STORED_SIZES['S-93'][1],
  line: NOT_STORED_SIZES['S-137'],
}

// ---------------------------------------------------------------------------
// Reading the fixture's own geometry. Coordinates are taken from what the
// layout and the geometry drew, never guessed.
// ---------------------------------------------------------------------------

const placementOf = (uid: number): TaskPlacement => {
  const at = taskPlacement(LAYOUT, uid)
  if (at === null) throw new Error(`no placement for task ${uid}`)
  return at
}

const geometryOf = (uid: number) => {
  const one = GEOMETRY.tasks.find((each) => each.taskUid === uid)
  if (one === undefined) throw new Error(`no geometry for task ${uid}`)
  return one
}

/**
 * The rectangle a drawn bar occupies.
 *
 * ⚠️ Only the filled form is handled. Table T-012 splits the five shapes two
 * ways and the fixture is SH-1, which has an area; a fixture that drifted to a
 * line shape would throw here rather than answer a box it does not have.
 */
function boxOfBar(bar: BarGeometry | null): ScreenRect {
  if (bar === null) throw new Error('the fixture Task has no plan bar')
  if (bar.form !== 'outline') throw new Error(`SH-1 was expected, the bar is ${bar.form}`)
  const xs = bar.points.map((one) => one.x)
  const ys = bar.points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

const labelOf = (uid: number): ScreenRect => {
  const rect = geometryOf(uid).label
  if (rect === null) throw new Error(`task ${uid} drew no name label`)
  return rect
}

const centreOf = (rect: ScreenRect): { readonly x: number; readonly y: number } => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
})

/**
 * FR-093's estimate: units counted 2 for a full-width character and 1 for a
 * half-width one, times the type size, times `labelCoef`.
 *
 * ⛔ No glyph is measured and no measurement is kept -- FR-093 forbids both
 * (MUST NOT), and a test that measured would be asserting against a rule it
 * had itself broken.
 */
const unitsOf = (text: string): number =>
  [...text].reduce((sum, one) => sum + ((one.codePointAt(0) ?? 0) > 0x7f ? 2 : 1), 0)

const estimatedLabelWidth = (text: string, fontSize: number): number =>
  unitsOf(text) * fontSize * SETTINGS.labelCoef

// ---------------------------------------------------------------------------
// Building the happenings IF-2 of table T-065 supplies.
// ---------------------------------------------------------------------------

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const modsOf = (part: Partial<InputModifiers> = {}): InputModifiers => ({ ...NO_MODS, ...part })

const pointerOf = (
  phase: PointerInput['phase'],
  x: number,
  y: number,
  part: Partial<PointerInput> = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODS,
  clickCount: 1,
  ...part,
})

const keyOf = (key: string, mods: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key,
  modifiers: modsOf(mods),
})

/**
 * A `Hit` naming one row of table T-023d on the first Task.
 *
 * ⚠️ THE CAST IS DELIBERATE AND NARROW. `GrabArea` is the set of rows PI-7 has
 * a target for TODAY, and this file walks the table's WHOLE printed order --
 * including GR-19, which is the palette's band and not a Task at all, and
 * GR-11, whose subject `item-hit-area.ts` records in its own header as undrawn
 * at this milestone. The roster is the manuscript's, so the roster is what the
 * walk is typed by; narrowing it to the union would make the test's coverage
 * shrink silently whenever the union does, which is the opposite of what a walk
 * over a table is for.
 */
const taskHitOn = (grab: string, uid = 1): Hit =>
  ({ item: { kind: 'task', taskUid: uid }, grab }) as unknown as Hit

/**
 * IN-1 settles a pointer operation on release, so a gesture is a press and then
 * a release read against it. The caller resolves the press's row, the way the
 * shell does at its own `collectPress`.
 */
function afterGesture(
  from: PointerInput,
  to: PointerInput,
  hit: Hit | null,
  part: Partial<InputContext> = {},
): TranslatedInput {
  const before = contextOf(part)
  const pressed = { at: from, hit, on: null, pressRow: pressRowOf({ at: from, hit }, before) }
  return commandFromInput(to, contextOf({ ...part, pressed }))
}

/** A double click: one press and one release, both carrying MK-13's count. */
function afterDoubleClick(
  x: number,
  y: number,
  hit: Hit | null,
  part: Partial<InputContext> = {},
): TranslatedInput {
  const down = pointerOf('down', x, y, { clickCount: 2 })
  const up = pointerOf('up', x, y, { clickCount: 2 })
  return afterGesture(down, up, hit, part)
}

/** The writes a `changeDocument` asks for, flattened; empty when it is not one. */
function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const kindsOf = (answer: TranslatedInput): readonly string[] =>
  commandsOf(answer).map((one) => one.kind)

function oneCommand(answer: TranslatedInput, kind: string): Record<string, unknown> {
  const found = commandsOf(answer).filter((one) => one.kind === kind)
  expect(found, `expected exactly one ${kind}, saw ${JSON.stringify(kindsOf(answer))}`).toHaveLength(
    1,
  )
  return found[0] as unknown as Record<string, unknown>
}

/** CM-25 -- the one command that writes `nameAnchor` / `nameAlign` (AT-98 / AT-99). */
const CM_25 = 'setTaskVisualNamePlacement'

const ARMED_RECTANGLE: Armed = { kind: 'taskShape', shapeKind: 'rectangle' }

const surfaceOpen = (): ScreenState => screenStateWithSurface(emptyScreenState(), 'U-30')

// ---------------------------------------------------------------------------
// The rosters and the fixture, before anything walks them.
// ---------------------------------------------------------------------------

describe('the rosters and the fixture these cases stand on', () => {
  // A walk over an empty roster passes without asserting anything, so the
  // counts are pinned first and a vacuous case cannot go green.
  it('carries the rows of 表 T-023d, 表 T-023 MK-13 and 表 T-028 IN-4 / IN-5a', () => {
    expect(T_023D).toHaveLength(19)
    expect(new Set(T_023D).size).toBe(19)
    // 「上の行ほど優先すること（MUST）」 and GR-19 is the row printed first.
    expect(T_023D[0]).toBe('GR-19')
    // The closing rule names exactly these two, and the table prints GR-10
    // ahead of GR-11.
    expect(DOUBLE_CLICK_ONLY).toHaveLength(2)
    for (const row of DOUBLE_CLICK_ONLY) expect(T_023D).toContain(row)
    expect(T_023D.indexOf('GR-10')).toBeLessThan(T_023D.indexOf('GR-11'))
    // ⭐ The row the closing rule protects sits BELOW both of them, which is
    // the whole of why the plain press had to be taken away rather than the
    // order rearranged: GR-10 wins wherever it is drawn, and NL-1 draws it on
    // top of GR-12.
    expect(T_023D.indexOf(PROTECTED_BY_THE_CLOSING_RULE)).toBeGreaterThan(T_023D.indexOf('GR-11'))
    // MK-13 prints FOUR targets since 2026-08-27, the name label and the body
    // having been folded into one.
    expect(MK_13_TARGETS).toHaveLength(4)
    expect(IN_4_LEVELS).toHaveLength(6)
    expect(IN_4_LEVELS[0]).toBe('unsettled in-place edit')
    expect(IN_4_LEVELS[IN_4_LEVELS.length - 1]).toBe('standing tooltip')
    expect(IN_5A_FIELDS).toHaveLength(5)
  })

  it('draws a schedule the coordinates can be read from', () => {
    expect(LAYOUT.pxPerDay).toBeGreaterThan(0)
    expect(LAYOUT.rows).toHaveLength(ROW_COUNT)
    expect(placementOf(1).width).toBeGreaterThan(0)
    expect(placementOf(2).width).toBeGreaterThan(0)
  })

  it('NL-1 -- the fixture Task really has its label drawn INSIDE its bar', () => {
    const placed = placementOf(1)
    const bar = boxOfBar(geometryOf(1).plan)
    const label = labelOf(1)

    // The layout's own answer to table T-013: NL-1, not NL-3.
    expect(placed.labelPlacement).toBe('inside')

    // FR-093's estimate, re-derived here from the settings and the drawn type
    // size, with `labelPad` (S-31) at both ends -- the width the fixture was
    // chosen against.
    const estimate = estimatedLabelWidth(placed.label, placed.labelFontSize)
    expect(placed.label).toBe(NAME_INSIDE)
    expect(estimate + SETTINGS.labelPad * 2).toBeLessThan(bar.width)

    // And the drawn rectangle is inside the drawn bar, horizontally.
    expect(label.x).toBeGreaterThanOrEqual(bar.x)
    expect(label.x + label.width).toBeLessThanOrEqual(bar.x + bar.width)

    // ⭐ The probe used by every case below is clear of BOTH end grabs, so what
    // it answers is a question about GR-10 against GR-12 and about nothing
    // else. GR-3 and GR-4 reach S-90 to either side of an end.
    const probe = centreOf(label)
    expect(probe.x - bar.x).toBeGreaterThan(SLOP.planEndpoint)
    expect(bar.x + bar.width - probe.x).toBeGreaterThan(SLOP.planEndpoint)
  })
})

// ---------------------------------------------------------------------------
// 表 T-023d, the closing rule -- 「ダブルクリックだけを持つ行（GR-10 / GR-11）は、
// 素の押下では掴みとして成立させないこと（MUST NOT）」
// ---------------------------------------------------------------------------

describe('表 T-023d closing rule -- a plain press does not land on GR-10', () => {
  it('answers GR-12 where the name label is drawn inside the bar', () => {
    // ⛔ EXPECTED RED. `item-hit-area.ts` still puts GR-10 in table T-023d's
    // order ahead of GR-12 and claims the label rectangle, which is exactly
    // the accident the closing rule names: 「名前を持つタスクでは GR-12 に手が
    // 届かない」.
    const probe = centreOf(labelOf(1))
    const hit = itemAtPointer(GEOMETRY, probe.x, probe.y, SLOP)
    expect(hit).not.toBeNull()
    expect(hit?.item).toEqual({ kind: 'task', taskUid: 1 })
    expect(hit?.grab).toBe(PROTECTED_BY_THE_CLOSING_RULE)
  })

  it('FR-011 -- a drag from the label moves the plan dates by whole days', () => {
    const probe = centreOf(labelOf(1))
    const hit = itemAtPointer(GEOMETRY, probe.x, probe.y, SLOP)
    // Ten days to the right, measured in the layout's own scale so the shift is
    // exact whatever `pxPerDay` is. The row is unchanged, so HM-3 of table
    // T-015a has nothing to add.
    const from = pointerOf('down', probe.x, probe.y)
    const to = pointerOf('up', probe.x + 10 * LAYOUT.pxPerDay, probe.y)
    const answer = afterGesture(from, to, hit)

    const write = oneCommand(answer, 'setTaskPlanDates')
    expect(write.uid).toBe(1)
    // ⚠️ AT-28 and AT-29 make `start` / `finish` 日時, not dates, and EX-7 of
    // table T-033 has GRS write a day it decided itself AT MIDNIGHT -- so the
    // stored text carries the time part. This assertion first read a bare date;
    // corrected against those two rows (2026-08-27).
    expect(write.start).toBe('2026-01-15T00:00:00')
    expect(write.finish).toBe('2026-02-15T00:00:00')
  })

  it('GR-10 -- even handed the row itself, a plain drag never moves the label', () => {
    // ⭐ THE OTHER HALF OF THE RULING, and the one that does not depend on
    // which unit enforces it. GR-10 now reads 「掴んで動かさない（MUST NOT）」 and
    // sends the only road to the position to PR-13 of table T-016 -- so a plain
    // drag that begins on a GR-10 hit MUST NOT ask for CM-25.
    const probe = centreOf(labelOf(1))
    const from = pointerOf('down', probe.x, probe.y)
    const to = pointerOf('up', probe.x + 10 * LAYOUT.pxPerDay, probe.y)
    const answer = afterGesture(from, to, taskHitOn('GR-10'))
    expect(kindsOf(answer)).not.toContain(CM_25)
  })

  it('FR-029 -- no pointer gesture anywhere on the table writes nameAnchor', () => {
    // The example FR-029 keeps of an allowed two-faced edit now reads 「PR-13 と
    // FR-028」 for `nameAnchor` / `nameAlign`; GR-10 was struck from it on
    // 2026-08-27 because it stopped being a face that grabs. So no row of table
    // T-023d may reach CM-25 from a drag.
    const probe = centreOf(labelOf(1))
    for (const row of T_023D) {
      const from = pointerOf('down', probe.x, probe.y)
      const to = pointerOf('up', probe.x + 4 * LAYOUT.pxPerDay, probe.y + 3)
      const answer = afterGesture(from, to, taskHitOn(row))
      expect(kindsOf(answer), `${row} must not reach CM-25`).not.toContain(CM_25)
    }
  })

  it('GR-11 -- a plain press beside the bar does not land on the assignee label', () => {
    // OC-2 of table T-038 puts the assignee label to the LEFT, jutting out past
    // the bar, and S-60 is on in this fixture so it is drawn at all.
    //
    // ⚠️ WHAT THIS CASE CAN AND CANNOT SEE. `item-hit-area.ts` records in its
    // own header that GR-11 has no target at this milestone because
    // ScheduleGeometry draws no assignee label -- so today the case passes for
    // a reason that is not the ruling. It is written all the same, and it is
    // the guard that matters when the picture arrives: the row must come back
    // as a double-click destination only, never as a plain-press grab.
    const bar = boxOfBar(geometryOf(2).plan)
    // Where OC-2 puts it: `labelGap` (S-32) clear of the bar, then the label's
    // own estimated width (FR-093). The probe is its middle.
    const width = estimatedLabelWidth(ASSIGNEE_NAME, placementOf(2).labelFontSize)
    const probe = { x: bar.x - SETTINGS.labelGap - width / 2, y: bar.y + bar.height / 2 }

    // ⭐ FIXTURE GUARD. The probe has to be clear of the reach of every endpoint
    // grab that sits above GR-11 in the table, or the case would be answered by
    // one of them and would say nothing about GR-11 at all.
    expect(bar.x - probe.x).toBeGreaterThan(Math.max(SLOP.planEndpoint, SLOP.actualEndpoint))

    const hit = itemAtPointer(GEOMETRY, probe.x, probe.y, SLOP)
    const grab: string | null = hit === null ? null : (hit.grab as string)
    for (const row of DOUBLE_CLICK_ONLY) expect(grab).not.toBe(row)
  })
})

// ---------------------------------------------------------------------------
// 表 T-023 MK-13 -- the double click, as it now reads
// ---------------------------------------------------------------------------

describe('表 T-023 MK-13 -- what a double click reaches', () => {
  it('reaches the name edit through the name label (GR-10)', () => {
    // 「ダブルクリックの宛先は本表の順をそのまま使う —— 消えるのは素の押下の
    // ときだけである」, so GR-10 is still a destination even though it is no
    // longer a grab.
    const probe = centreOf(labelOf(1))
    const answer = afterDoubleClick(probe.x, probe.y, taskHitOn('GR-10'))
    expect(answer.action).toEqual({
      kind: 'editInPlace',
      target: { kind: 'taskName', uid: 1 },
    })
  })

  it('reaches the name edit through the task body (GR-12)', () => {
    // ⛔ EXPECTED RED. MK-13 now reads 「タスク（名称ラベルと本体のどちらでも）
    // ＝ 名称の編集」; the tree still answers the body with the properties
    // panel, which the same row now forbids (MUST NOT).
    const bar = boxOfBar(geometryOf(1).plan)
    const probe = { x: bar.x + bar.width * 0.75, y: bar.y + bar.height / 2 }
    const answer = afterDoubleClick(probe.x, probe.y, taskHitOn('GR-12'))
    expect(answer.action).toEqual({
      kind: 'editInPlace',
      target: { kind: 'taskName', uid: 1 },
    })
  })

  it('gives the label and the body the SAME answer, which is why they folded', () => {
    // The row's own reason for folding two lines into one: 「2 行に分けると同じ
    // 操作が表の 2 か所に並ぶ」. Whatever the two destinations resolve to, they
    // have to resolve to the same thing.
    const probe = centreOf(labelOf(1))
    const throughLabel = afterDoubleClick(probe.x, probe.y, taskHitOn('GR-10'))
    const throughBody = afterDoubleClick(probe.x, probe.y, taskHitOn('GR-12'))
    expect(throughBody.action).toEqual(throughLabel.action)
  })

  it('⛔ opens the properties panel from no row of 表 T-023d at all', () => {
    // ⛔ EXPECTED RED, on GR-12. 「プロパティパネルを開く経路を本行に置いては
    // ならない（MUST NOT）」 -- the panel's contents are FR-072's business, and
    // the selecting press is already the operation FR-072 reads.
    const probe = centreOf(labelOf(1))
    for (const row of T_023D) {
      const answer = afterDoubleClick(probe.x, probe.y, taskHitOn(row))
      expect(answer.action?.kind, `${row} must not open the panel`).not.toBe(
        MK_13_FORBIDDEN_ACTION,
      )
    }
    // And with nothing under the pointer either -- MK-11 clears the selection,
    // and FR-072 decides what the panel shows without a road of its own here.
    const empty = afterDoubleClick(probe.x, probe.y, null)
    expect(empty.action?.kind).not.toBe(MK_13_FORBIDDEN_ACTION)
  })
})

// ---------------------------------------------------------------------------
// 表 T-028 IN-4 -- the order Esc consumes, with the in-place edit at its head
// ---------------------------------------------------------------------------

describe('表 T-028 IN-4 -- Esc spends one level, innermost first', () => {
  it('takes the unsettled in-place edit BEFORE the open surface', () => {
    // ⛔ EXPECTED RED. IN-4 now begins 「確定していないその場の編集 → 開いている
    // 面 → …」 and spends ONE level per press (MUST), so with text being typed
    // over an open surface the surface MUST still stand afterwards.
    const state = surfaceOpen()
    const after = screenStateFromInput(
      keyOf('Esc'),
      contextOf({ screenState: state, isTextEntryUnsettled: true }),
    )
    expect(after.surface).toBe(state.surface)
  })

  it('consumes the key when the in-place edit is the only level standing', () => {
    // ⛔ EXPECTED RED. IN-4a passes Esc to the browser only when there is
    // NOTHING to consume; an unsettled in-place edit is now a level, so the key
    // is this tool's.
    const answer = commandFromInput(keyOf('Esc'), contextOf({ isTextEntryUnsettled: true }))
    expect(answer.isBrowserDefaultStopped).toBe(true)
  })

  it('FR-031 -- cancelling writes nothing to the document, and does not settle', () => {
    // 「取り消したときは、編集を始める前の値へ戻すこと（MUST）。書きかけの文字を
    // 文書へ書いてはならない（MUST NOT）」. Whatever carries the cancellation, it
    // is not a document write, and it is emphatically not SK-19's settle.
    const answer = commandFromInput(keyOf('Esc'), contextOf({ isTextEntryUnsettled: true }))
    expect(commandsOf(answer)).toHaveLength(0)
    expect(answer.action?.kind).not.toBe('settleTextEntry')
  })

  it('takes the open surface before the arming, with nothing being typed', () => {
    const state = screenStateWithArmed(surfaceOpen(), ARMED_RECTANGLE)
    const after = screenStateFromInput(keyOf('Esc'), contextOf({ screenState: state }))
    expect(after.surface).toBeNull()
    // One level per press: the arming is untouched.
    expect(after.armed).toEqual(ARMED_RECTANGLE)
  })

  it('takes the gesture in flight before the arming', () => {
    const probe = centreOf(labelOf(1))
    const down = pointerOf('down', probe.x, probe.y)
    const hit = itemAtPointer(GEOMETRY, probe.x, probe.y, SLOP)
    const state = screenStateWithArmed(emptyScreenState(), ARMED_RECTANGLE)
    const context = contextOf({
      screenState: state,
      pressed: { at: down, hit, on: null, pressRow: pressRowOf({ at: down, hit }, contextOf({ screenState: state })) },
    })
    // ⭐ The gesture is the Framework's to drop (LY-5), so the screen state is
    // answered UNCHANGED -- the level was consumed by a holder this member
    // cannot reach. What the case pins is that the ARMING survived the press.
    const after = screenStateFromInput(keyOf('Esc'), context)
    expect(after.armed).toEqual(ARMED_RECTANGLE)
    expect(commandFromInput(keyOf('Esc'), context).isBrowserDefaultStopped).toBe(true)
  })

  it('takes the arming when it is the innermost thing standing', () => {
    const state = screenStateWithArmed(emptyScreenState(), ARMED_RECTANGLE)
    const after = screenStateFromInput(keyOf('Esc'), contextOf({ screenState: state }))
    expect(after.armed).toEqual({ kind: 'none' })
  })

  it('takes the Dual Cursor mode after the arming', () => {
    const context = contextOf({ dualCursorFollowing: 'date1' })
    // Same shape as the gesture: the mode is the Framework's, so the state is
    // unchanged and what is pinned is that the key was consumed (IN-4a).
    expect(commandFromInput(keyOf('Esc'), context).isBrowserDefaultStopped).toBe(true)
  })

  it('IN-4a -- passes the key to the browser when no level stands', () => {
    const answer = commandFromInput(keyOf('Esc'), contextOf())
    expect(answer.isBrowserDefaultStopped).toBe(false)
    expect(answer.action).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 表 T-028 IN-5a -- what an unsettled in-place edit takes away
// ---------------------------------------------------------------------------

describe('表 T-028 IN-5a -- the keys an unsettled in-place edit leaves alone', () => {
  it('lets a single-character key and Delete / Backspace reach the browser', () => {
    // 「単文字キーと Delete / Backspace は、文字入力を確定していない間は効かない
    // こと（MUST NOT）」 -- SK-3 and 「1 文字消す」 are the same key.
    for (const key of ['P', 'F', 'Delete', 'Backspace']) {
      const answer = commandFromInput(keyOf(key), contextOf({ isTextEntryUnsettled: true }))
      expect(answer.action, key).toBeNull()
      expect(answer.isBrowserDefaultStopped, key).toBe(false)
    }
  })

  it('lets Ctrl+C and Ctrl+V reach the browser -- MK-10 names this its exception', () => {
    for (const key of ['C', 'V']) {
      const answer = commandFromInput(
        keyOf(key, { ctrl: true }),
        contextOf({ isTextEntryUnsettled: true }),
      )
      expect(answer.action, key).toBeNull()
      expect(answer.isBrowserDefaultStopped, key).toBe(false)
    }
  })

  it('takes those same keys back once nothing is being typed', () => {
    // The pair to the case above: without an unsettled edit the rows of table
    // T-036 own the keys again, so the guard above cannot be passing because
    // the keys are unassigned everywhere.
    for (const key of ['Delete', 'Backspace']) {
      const answer = commandFromInput(keyOf(key), contextOf())
      expect(answer.isBrowserDefaultStopped, key).toBe(true)
    }
  })
})
