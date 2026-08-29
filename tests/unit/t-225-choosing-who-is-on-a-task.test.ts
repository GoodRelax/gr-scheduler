// Unit tests for 表 T-225 of `FR-008` -- how a person is put on a task and
// taken off it.
//
// The units driven are UF-64 `properties-panel.ts` (`ScreenRenderer`, CP-37 of
// table T-062, published through PI-37), UF-30 `input-command-translator.ts`
// (`InputCommandTranslator`, CP-18, PI-18) and UF-7 `item-hit-area.ts`
// (`ItemHitArea`, CP-7, PI-7). One file drives three because 表 T-225 is one
// rule spread across three seams: the panel offers the surface (AS-5 / AS-6 /
// AS-9), the translator turns what was settled into the rows of 表 T-108 (AS-3
// / AS-4 / AS-7 / AS-8 / AS-10), and the hit test is what makes the label
// reachable at all (AS-1 / AS-2).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ EVERY EXPECTED VALUE BELOW COMES FROM docs/spec, never from the tree
// (docs/development-rules/04-verification.md section 1 -- the one who wrote a
// unit does not write its test). Each case was decided against the row it names
// before anything in `src/` was opened.
//
// ⚠️ WHAT WAS READ OF `src/`, STATED HONESTLY RATHER THAN CLAIMED AWAY. Beyond
// the exported declarations these cases must call -- `properties-panel.ts`
// (`propertiesPanelFromSelection`), `screen-renderer.ts` (`PropertiesPanel`,
// `PropertyField`, `PropertyControl`, `PropertyControlKind`,
// `PropertyFieldKey`, `ScreenSession`, `FieldCommit`),
// `input-command-translator.ts` (`InputContext`, `TranslatedInput`,
// `PointerInput`, `PointerPress`, `commandFromFieldCommit`, `commandFromInput`,
// `pressRowOf`), `item-hit-area.ts` (`Hit`, `PointerSlop`, `itemAtPointer`,
// `NOT_STORED_SIZES`), the three layout entries the fixture is built with and
// the entity types the arguments are made of -- FOUR PIECES OF BODY WERE ALSO
// READ, and are named here so a reader can weigh the cases against that:
//   - the `ResourceCommand` union of `edit-resource.ts`, to learn how CM-40,
//     CM-44 and CM-45 are spelled and what fields they carry;
//   - the first six lines of `commandFromFieldCommit`, to learn that the answer
//     is a flat list of commands and that a subject the document has lost
//     answers with an empty one;
//   - the two STOP notes that stand over `commandFromTaskColumn` and
//     `controlsOfItem`, which say in as many words that PR-16 has neither a
//     control nor a command today;
//   - `GrabArea`, which today has no `GR-11` member -- which is why the grab
//     rows below are compared as widened strings.
// ⭐ NONE OF THAT SET AN EXPECTED VALUE. It supplied spellings and told the
// tester where the tree stands, which is what lets the ⛔ notes say WHY a case
// is red rather than merely that it is.
//
// The rows these cases answer to (rule 03: name the row, never copy its value):
//   表 T-225  AS-1 to AS-10, the whole table. ⚠️ TEN ROWS, not nine.
//   FR-008    the paragraphs above the table: a new 担当者 is a 作業資源 (MUST),
//             its `uid` follows `Project.uidHighWaterMark` (MUST), and two
//             assignments of the same Task-and-Resource pair are forbidden
//             (MUST NOT); and the paragraph BELOW it, which makes AS-7 one call
//   FR-059    what the assignee label draws, and that AS-2 owns the empty case
//   FR-006    表 T-016 stands in the panel and everything not marked read-only
//             is editable; the paragraph under it makes 「入力の形は同表の
//             「入力の型」の欄に従うこと（MUST）」
//   表 T-016  PR-16 -- 入力の型 is 選択, the row carries no read-only mark, and
//             the item is an `Assignment` rather than a column of `Task`
//   表 T-023  MK-13 -- 担当ラベル ＝ 担当者名の変更
//   表 T-023d GR-11 -- the assignee label, jutting out past the bar, reached by
//             a double click alone
//   表 T-038  OC-2 -- the label is counted in the occupied width while shown
//   表 T-108  CM-40 `createResource`, CM-44 `createAssignment`,
//             CM-45 `unassignResource`
//   表 T-032  MG-5 -- ⛔ merging same-named 担当者 is the MERGE path only, and
//             the screen MUST NOT do it (the row says so pointing back at AS-8)
//
// ⭐ SEVERAL OF THESE ARE EXPECTED TO BE RED, and that is the point
// (04-verification section 1): the expected value states what the specification
// says. Each such case names its row and says what the tree does instead.
//
// ⭐ WHAT THIS FILE DELIBERATELY DOES NOT ASSERT, because the specification
// settles none of it. Each was searched for before being given up on:
//
//   1. AS-3's OTHER half -- 「担当者を選んだ状態で `Del` を押した」. Nothing
//      settles what "an assignee is selected" is at this seam: SL-1 of 表
//      T-023c does not admit an assignee among the things that may be selected
//      (`Item` has no member for one), and `ScreenSession.selectedResourceUids`
//      belongs to FR-099's roster, which is a different surface with a
//      different verb (削除, not 解除). Searched 表 T-023c, 表 T-028, FR-099
//      and 表 T-225 itself. Only the 「`-` を確定した」 half is asserted.
//   2. The partial-match search AS-5 makes a MUST. `PropertyControl` publishes
//      `kind`, `choices`, `min` and `max` and nothing that could carry a
//      search, and no table gives one a shape. The dropdown half IS asserted --
//      that the control offers the roster -- and the search half is reported
//      as a hole rather than tested against an invented member.
//   3. How several assignees on one task are written into one field, and in
//      what order. FR-059's 「先頭 1 名と残りの人数」 is written for the assignee
//      LABEL; AS-5 makes the panel a different surface and no row says how it
//      joins them.
//   4. Any word or spelling shown to a person. FR-038 puts panels in the chosen
//      language and no table holds a translated string.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  NOT_STORED_SIZES,
  itemAtPointer,
  type Hit,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  PropertyFieldKey,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import {
  commandFromFieldCommit,
  commandFromInput,
  pressRowOf,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The two tables these cases walk, READ OUT OF THE MANUSCRIPT AT RUN TIME.
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by fixed data copied FROM THAT TABLE. `tests/contract/spec-table.ts`
// takes that literally and makes the copy at read time, so a row added to 表
// T-225 -- the way AS-10 was -- cannot leave a hand-written list here claiming
// a count the table stopped having.
// ---------------------------------------------------------------------------

const T_225 = specTable('T-225')

/** The heading of 表 T-016's column that FR-006's paragraph makes a MUST. */
const INPUT_KIND_COLUMN = '入力の型'

/** FR-006 looks for this mark wherever the row writes it. PR-9 alone carries it. */
const READ_ONLY_MARK = '読み取り専用'

const T_016_PR_16 = specTable('T-016').rows.find((row) => row.id === 'PR-16')
if (T_016_PR_16 === undefined) throw new Error('table T-016 no longer has row PR-16')

/**
 * 表 T-016's own words for a control's form, paired with the members
 * `PropertyControlKind` declares -- that type names that very column as what it
 * is and gives each member the table's word in a comment. ⛔ Only the pairing is
 * written here; which word PR-16 carries is read from the manuscript below.
 */
const KIND_OF: Readonly<Record<string, PropertyControl['kind']>> = {
  文字: 'text',
  複数行: 'multiline',
  日付: 'date',
  数値: 'number',
  真偽: 'boolean',
  選択: 'choice',
  色: 'color',
}

/** The un-assign token AS-3 confirms and AS-4 refuses to put in the roster. */
const UNASSIGN_TOKEN = '-'

/** 表 T-108: CM-40, CM-44 and CM-45, as `edit-resource.ts` spells them. */
const CM_40 = 'createResource'
const CM_44 = 'createAssignment'
const CM_45 = 'unassignResource'

// ---------------------------------------------------------------------------
// Inputs. A whole DocumentSettings is 100+ keys, so a case pins the ones it
// means and everything else comes from SETTINGS_DEFAULTS, which is generated
// from the manuscript.
// ---------------------------------------------------------------------------

/**
 * S-73's default hue, READ OUT OF 表 T-216 rather than written here (rule 03
 * section 1: a value the manuscript holds is generated, never re-typed).
 *
 * ⚠️ DR-5 of 表 T-052 keeps the hue on `Project`, so `SETTINGS_DEFAULTS` -- which
 * is where every other manuscript value in this file comes from -- does not
 * carry it. ⛔ No case here reads it; it is required to build the fixture.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS = {
  ...SETTINGS_DEFAULTS,
  ...NESTED,
  scrollDate: '2026-01-01', // S-77, so the day-to-x map has an origin
  scrollGroupId: 'g1', // S-78, so a row is at the top
  stackDirection: 'down', // S-58, so every y reads from the top
  // ⭐ S-60. OC-2 of 表 T-038 counts the assignee label ONLY while it is shown
  // (MUST NOT otherwise), and AS-2 opens with 「担当ラベルを出しているあいだは」 --
  // so the two label cases cannot be written at the default.
  assigneeVisible: true,
} as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * S-53 arrives as a value (`InputContext.zoomStep`) because no generator brings
 * 表 T-201 into `src/`. Deliberately NOT the figure the manuscript prints -- no
 * case here reads it, and a stand-in makes that plain.
 */
const ZOOM_STEP = 3

/** Today, spelled the way a date column is spelled. */
const TODAY = '2026-03-01T00:00:00'

/** Every nullable column spelled out; leaving one `undefined` reads as "set". */
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
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
    carryElements: [],
    ...part,
  }) as unknown as Task

const resourceOf = (uid: number, name: string | null): Schedule['resources'][number] =>
  ({
    uid,
    name,
    // AT-87 codes 作業資源 as 1, and FR-008 makes that the kind a new 担当者 is
    // created with (MUST) so that FR-059 will draw it. Every fixture person is
    // one, so that no case is answered by FR-059's filter instead of by AS-n.
    resourceKind: 1,
    isCostResource: false,
    calendarUid: null,
    carry: {},
    carryElements: [],
  }) as unknown as Schedule['resources'][number]

const assignmentOf = (
  uid: number,
  taskUid: number,
  resourceUid: number,
): Schedule['assignments'][number] =>
  ({ uid, taskUid, resourceUid, carry: {}, carryElements: [] }) as unknown as
    Schedule['assignments'][number]

/**
 * AT-20, pinned. FR-008 (MUST) numbers a new `Resource` and a new `Assignment`
 * from it, so the uid AS-7's `createAssignment` has to name is this plus one.
 */
const HIGH_WATER_MARK = 10

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: THEME_HUE,
      title: null,
      uidHighWaterMark: HIGH_WATER_MARK,
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
// ⭐ THE FIXTURE, AND WHY THE PEOPLE IN IT ARE NAMED THE WAY THEY ARE.
//
//   - `SEATED` is on the task from the start, so AS-3's 解除 and AS-10's
//     already-there test have a real assignment to answer about.
//   - `ROSTERED` is in the roster and NOT on the task, so the difference
//     between AS-7 (make one, then seat) and the plain seat can be told apart.
//   - `TWIN_LOW` and `TWIN_HIGH` share one name, which is the whole of AS-8 and
//     the reason AS-9 exists at all. Their uids are given in the WRONG order on
//     purpose -- the one printed second holds the smaller uid -- so a reading
//     that answers "the first one found" cannot pass by luck.
//   - `TASK_ALONE` has nobody on it, which is AS-2's 「割当の無いタスク」.
//
// ⚠️ Every name is half-width ASCII. FR-093 counts a full-width character as
// two units, and a fixture that drifted into full width would change the drawn
// width of the label the two GR-11 cases sweep for.
// ---------------------------------------------------------------------------

const SEATED = resourceOf(1, 'Seated')
const ROSTERED = resourceOf(2, 'Rostered')
const TWIN_NAME = 'Twin'
const TWIN_HIGH = resourceOf(4, TWIN_NAME)
const TWIN_LOW = resourceOf(3, TWIN_NAME)
const UNKNOWN_NAME = 'Nobody'

/** The task somebody is on: AS-3, AS-7, AS-8 and AS-10 all speak about this one. */
const TASK_HELD = 5

/** AS-2's task -- drawn, shown, and with no assignment at all. */
const TASK_ALONE = 6

const SCHEDULE = scheduleOf({
  tasks: [
    taskOf({ uid: TASK_HELD, name: 'ab', start: '2026-01-05', finish: '2026-02-05' }),
    // ⚠️ AN ACTUAL IS RECORDED ON PURPOSE. FR-043 draws the two dummies of GR-9
    // and GR-17 on a Task that has not started, and their hit box (S-93) reaches
    // further to the left of the plan start than the assignee label sits -- so
    // without an actual, what a probe left of the bar answers would be about a
    // dummy rather than about GR-11.
    taskOf({
      uid: TASK_ALONE,
      name: 'ab',
      start: '2026-01-05',
      finish: '2026-02-05',
      actualStart: '2026-01-05',
      actualDuration: 10,
      percentComplete: 50,
    }),
  ],
  resources: [SEATED, ROSTERED, TWIN_HIGH, TWIN_LOW],
  assignments: [assignmentOf(9, TASK_HELD, SEATED.uid)],
  taskGroups: Array.from({ length: 8 }, (_unused, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    height: null,
  })),
  taskGroupMembers: [
    { groupId: 'g1', taskUid: TASK_HELD },
    { groupId: 'g2', taskUid: TASK_ALONE },
  ],
  taskVisuals: [],
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

const documentOf = (schedule: Schedule): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule,
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const BASE: InputContext = {
  document: documentOf(SCHEDULE),
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
  dualCursorFollowing: null,
  today: TODAY,
  newGroupId: 'row-minted-outside',
}

const contextOf = (schedule: Schedule = SCHEDULE): InputContext => ({
  ...BASE,
  document: documentOf(schedule),
})

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: 'selection',
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const holding = (...items: readonly ItemRef[]): Selection =>
  items.reduce((selection, item) => selectionWith(selection, item), emptySelection())

// ---------------------------------------------------------------------------
// Reading the answers.
// ---------------------------------------------------------------------------

const panelOf = (taskUid: number, schedule: Schedule = SCHEDULE): PropertiesPanel => {
  const panel = propertiesPanelFromSelection(
    schedule,
    SETTINGS,
    holding({ kind: 'task', uid: taskUid } as ItemRef),
    SESSION,
  )
  expect(panel, 'the panel is described while `propertiesShowing` names one of the two').not.toBe(
    null,
  )
  return panel as PropertiesPanel
}

const fieldAt = (panel: PropertiesPanel, row: string): PropertyField => {
  const found = panel.fields.filter((field) => field.row === row)
  expect(found.length, `exactly one field for ${row}`).toBe(1)
  return found[0] as PropertyField
}

const assigneeField = (taskUid: number, schedule: Schedule = SCHEDULE): PropertyField =>
  fieldAt(panelOf(taskUid, schedule), 'PR-16')

/**
 * The key a commit on PR-16 carries back.
 *
 * ⭐ TAKEN FROM THE PANEL WHEREVER THE PANEL OFFERS ONE, so that this file stops
 * minting its own the moment AS-5's control arrives and the two seams are then
 * tested against each other rather than against a shared guess.
 *
 * ⛔ THE FALLBACK IS MINTED, AND IT HAS TO BE. `PropertyFieldKey` publishes four
 * members -- `task`, `taskVisual`, `taskGroup`, `dependency` -- and NONE of them
 * can name the assignee: 表 T-016's own remark on PR-16 says 「`Task` の列では
 * ない —— 実体は `Assignment` であり」. That missing member IS one of the defects
 * these cases are here to report, so the fallback is spelled from the words the
 * specification already owns (the ERD entity `Assignment`, and 表 T-016's item
 * name `assignee`) and from nothing else.
 */
const assigneeKeyFor = (taskUid: number): PropertyFieldKey => {
  const offered = assigneeField(taskUid).controls[0]
  if (offered !== undefined) return offered.key
  return { holder: 'assignment', taskUid, column: 'assignee' } as unknown as PropertyFieldKey
}

/** What `commandFromFieldCommit` writes for a value settled on PR-16. */
const commandsForAssignee = (
  text: string,
  taskUid: number = TASK_HELD,
  schedule: Schedule = SCHEDULE,
): readonly DocumentCommand[] => {
  const commit: FieldCommit = { row: 'PR-16', key: assigneeKeyFor(taskUid), text }
  return commandFromFieldCommit(commit, contextOf(schedule))
}

const kindsOf = (commands: readonly DocumentCommand[]): readonly string[] =>
  commands.map((one) => one.kind)

/** One command of a kind, widened so a field the union does not carry can be read. */
function oneCommand(
  commands: readonly DocumentCommand[],
  kind: string,
): Record<string, unknown> {
  const found = commands.filter((one) => one.kind === kind)
  expect(
    found,
    `expected exactly one ${kind}, saw ${JSON.stringify(kindsOf(commands))}`,
  ).toHaveLength(1)
  return found[0] as unknown as Record<string, unknown>
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

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

/**
 * A `Hit` naming one row of 表 T-023d on a Task.
 *
 * ⚠️ THE CAST IS DELIBERATE AND NARROW. `GrabArea` is the set of rows PI-7 has a
 * target for TODAY and it has no `GR-11` member, which is itself what AS-2 says
 * must not be so. The roster this file walks is the manuscript's, so the
 * manuscript's row id is what the walk is typed by.
 */
const taskHitOn = (grab: string, uid: number): Hit =>
  ({ item: { kind: 'task', taskUid: uid }, grab }) as unknown as Hit

/** IN-1 settles a pointer operation on release, so a gesture is a press and a release. */
function afterDoubleClick(x: number, y: number, hit: Hit | null): TranslatedInput {
  const down = pointerOf('down', x, y, { clickCount: 2 })
  const up = pointerOf('up', x, y, { clickCount: 2 })
  const pressed = { at: down, hit, on: null, pressRow: pressRowOf({ at: down, hit }, BASE) }
  return commandFromInput(up, { ...BASE, pressed })
}

/** The reach each row of 表 T-023d is grabbed by, read from the generated constant. */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // S-92 is a square, and this member is its half-width.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'][0],
  dummyHeight: NOT_STORED_SIZES['S-93'][1],
  line: NOT_STORED_SIZES['S-137'],
}

/**
 * Every row of 表 T-023d that answers anywhere along one Task's band, under the
 * given reading of the pointer.
 *
 * ⭐ A SWEEP RATHER THAN A PLACED PROBE, and the reason is a hole rather than
 * laziness: OC-2 of 表 T-038 says the assignee label juts out past the bar and
 * counts in the occupied width, but `TaskGeometry` publishes no rectangle for
 * it, so this file has no honest way to name the point it is drawn at. What AS-2
 * makes a MUST is that the figure EXISTS -- 「何も描かないと `GR-11` に当たる
 * 図形がそのタスクだけ存在せず」 -- and a sweep is exactly the question "does it
 * exist anywhere on this band", asked without guessing where.
 *
 * ⚠️ The sweep therefore proves presence and never placement. A case here may
 * not conclude that a row it did not see is drawn in the wrong place.
 */
function grabsAlongTheBandOf(
  taskUid: number,
  resolving: 'press' | 'doubleClick',
): readonly string[] {
  const placed = taskPlacement(LAYOUT, taskUid)
  if (placed === null) throw new Error(`no placement for task ${taskUid}`)
  const one = GEOMETRY.tasks.find((each) => each.taskUid === taskUid)
  const plan = one?.plan ?? null
  if (plan === null) throw new Error(`task ${taskUid} drew no plan bar`)
  // ⚠️ Only the filled form is handled. 表 T-012 splits the five shapes two ways
  // and the fixture is SH-1, which has an area; a fixture that drifted to a line
  // shape would throw here rather than sweep a band it does not occupy.
  if (plan.form !== 'outline') throw new Error(`SH-1 was expected, the bar is ${plan.form}`)

  const ys = plan.points.map((point) => point.y)
  const y = (Math.min(...ys) + Math.max(...ys)) / 2
  const xs = plan.points.map((point) => point.x)
  const left = Math.min(...xs)
  const right = Math.max(...xs)

  const seen = new Set<string>()
  // From well clear of the bar's left edge to well clear of its right one, so
  // that a label jutting out either way is crossed. One pixel at a time: the
  // narrowest thing AS-2 can ask for is one half-width glyph.
  for (let x = Math.floor(left) - 200; x <= Math.ceil(right) + 200; x += 1) {
    const hit = itemAtPointer(GEOMETRY, x, y, SLOP, resolving)
    if (hit !== null && hit.item.kind === 'task' && hit.item.taskUid === taskUid) {
      seen.add(hit.grab as string)
    }
  }
  return [...seen].sort()
}

// ---------------------------------------------------------------------------
// The rosters and the fixture, before anything walks them.
// ---------------------------------------------------------------------------

describe('the tables and the fixture these cases stand on', () => {
  it('carries all TEN rows of 表 T-225', () => {
    // ⭐ A walk over a table that lost its rows passes without asserting
    // anything, so the count is pinned before any case leans on it.
    const ids = T_225.rows.map((row) => row.id)
    expect(ids).toEqual([
      'AS-1',
      'AS-2',
      'AS-3',
      'AS-4',
      'AS-5',
      'AS-6',
      'AS-7',
      'AS-8',
      'AS-9',
      'AS-10',
    ])
  })

  it('PR-16 of 表 T-016 is a 選択 and carries no read-only mark', () => {
    // FR-006 (MUST): 「同表が読み取り専用と記した項目を除いて」編集できること --
    // so the absence of the mark is what makes PR-16 editable, and the paragraph
    // under the table (MUST) makes 入力の型 the form it is edited through.
    const word = bare(T_016_PR_16.by[INPUT_KIND_COLUMN] ?? '')
    expect(KIND_OF[word], `表 T-016 writes PR-16's 入力の型 as ${JSON.stringify(word)}`).toBe(
      'choice',
    )
    expect(T_016_PR_16.cells.some((cell) => cell.includes(READ_ONLY_MARK))).toBe(false)
  })

  it('draws a schedule the sweeps can be read from', () => {
    expect(LAYOUT.pxPerDay).toBeGreaterThan(0)
    // S-60 is on, or OC-2 draws no label and the two GR-11 cases would be
    // asking about a picture the settings had switched off.
    expect(SETTINGS.assigneeVisible).toBe(true)
    // The fixture really does hold one person on one task and nobody on the
    // other -- AS-2's condition and AS-3's, side by side.
    expect(SCHEDULE.assignments.filter((one) => one.taskUid === TASK_HELD)).toHaveLength(1)
    expect(SCHEDULE.assignments.filter((one) => one.taskUid === TASK_ALONE)).toHaveLength(0)
    // AS-8's pair: one name, two people, and the smaller uid printed second.
    expect(TWIN_LOW.uid).toBeLessThan(TWIN_HIGH.uid)
    const twins = SCHEDULE.resources.filter((one) => one.name === TWIN_NAME)
    expect(twins).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// AS-5 / AS-6 / AS-9 -- the surface the panel offers for PR-16.
// ---------------------------------------------------------------------------

describe('表 T-225 AS-5 -- the form the panel offers for PR-16', () => {
  it('⛔ MUST offer a control, of the form 表 T-016 names', () => {
    // ⛔ EXPECTED RED. Three rows put a control here and the panel offers none:
    // FR-006 (MUST) makes every item not marked read-only editable, the
    // paragraph under 表 T-016 (MUST) says 「入力の形は同表の「入力の型」の欄に
    // 従うこと」 and PR-16's word there is 選択, and AS-5 (MUST) says 「編集できる
    // こと。名簿から選ばせる形とし、ドロップダウンと部分一致の検索を添えること」.
    //
    // ⚠️ `PropertyField.controls` is declared as what a field is EDITED THROUGH
    // and its own doc says an empty list means this side has no control to
    // offer. So an empty list on PR-16 is the panel saying the assignee cannot
    // be edited here, which is what AS-5 forbids -- and `isEditable` being true
    // does not repair it, because the mark is not a control.
    const controls = assigneeField(TASK_HELD).controls
    expect(controls).toHaveLength(1)
    expect((controls[0] as PropertyControl).kind).toBe('choice')
  })

  it('⛔ MUST let the choice be made from the roster (the dropdown half)', () => {
    // ⛔ EXPECTED RED, for the same reason. AS-5: 「名簿から選ばせる形とし」. The
    // roster is the document's 担当者, so every one of them is a candidate --
    // ⚠️ including the ones not on this task, which is the only way a person is
    // put on one from here at all.
    const control = assigneeField(TASK_HELD).controls[0]
    expect(control, 'AS-5 (MUST): the assignee is chosen from the roster').not.toBe(undefined)
    const choices = (control as PropertyControl).choices
    expect(choices, 'a 選択 control publishes what it offers').not.toBe(null)
    expect(choices as readonly string[]).toHaveLength(SCHEDULE.resources.length)
  })

  it('⛔ AS-9 -- MUST offer the two same-named people as two candidates', () => {
    // ⛔ EXPECTED RED. AS-9: 「プロパティパネルで `uid` を選んだ …… 同姓同名を
    // 見分ける経路はここだけである」. If the roster were folded to one entry per
    // NAME, that only route would not exist -- and MG-5 of 表 T-032 (MUST NOT)
    // says in as many words that folding same-named 担当者 is the merge path's
    // business and not the screen's.
    //
    // ⚠️ ONLY THE COUNT IS ASSERTED. AS-6 (MUST NOT) forbids making a person
    // read a `uid`, so what the two entries are LABELLED is a thing no row
    // settles; that they are two is the whole of what AS-9 needs.
    const control = assigneeField(TASK_HELD).controls[0]
    expect(control, 'AS-5 (MUST): the assignee is chosen from the roster').not.toBe(undefined)
    const choices = ((control as PropertyControl).choices ?? []) as readonly string[]
    expect(choices.filter((one) => one.includes(TWIN_NAME))).toHaveLength(2)
  })
})

describe('表 T-225 AS-6 -- what is SHOWN against what is WRITTEN', () => {
  it('shows the name and never the uid', () => {
    // AS-6 (MUST / MUST NOT): 「人に見せるのは担当者名、文書に書くのは `uid` と
    // すること。利用者に `uid` を覚えさせてはならない」.
    const text = assigneeField(TASK_HELD).text
    expect(text).toContain(SEATED.name as string)
    expect(text, 'AS-6 (MUST NOT): a person is never made to remember a uid').not.toContain(
      String(SEATED.uid),
    )
  })

  it('⛔ writes the uid, not the name, into the document', () => {
    // ⛔ EXPECTED RED. The other half of AS-6: 「文書に書くのは `uid`」. CM-44
    // takes a `resourceUid`, so the value that leaves this seam has to be the
    // number even though the value a person settled was a name.
    const command = oneCommand(commandsForAssignee(ROSTERED.name as string), CM_44)
    expect(command['resourceUid']).toBe(ROSTERED.uid)
    expect(Object.values(command)).not.toContain(ROSTERED.name)
  })
})

// ---------------------------------------------------------------------------
// AS-7 / AS-8 / AS-10 -- turning a settled name into the rows of 表 T-108.
// ---------------------------------------------------------------------------

describe('表 T-225 AS-7 -- a name the roster does not hold', () => {
  it('⛔ MUST carry BOTH commands back from ONE call, in that order', () => {
    // ⛔ EXPECTED RED. AS-7 (MUST): 「その名前の `Resource` を作ってから割り当てる
    // こと（表 T-108 の `CM-40` と `CM-44`）」, and the paragraph under the table
    // (MUST): 「`AS-7` は 2 つの命令を 1 回の呼び出しで走らせること …… 別々に
    // 走らせると、担当者だけができて割当ができていない状態が履歴に残る」.
    //
    // ⭐ SO THE ORDER IS PART OF THE RULE, not a preference: 作ってから割り当てる.
    // The tree answers with an empty list -- `commandFromTaskColumn` carries a
    // STOP saying PR-16 has no row of 表 T-108 to become.
    expect(kindsOf(commandsForAssignee(UNKNOWN_NAME))).toEqual([CM_40, CM_44])
  })

  it('⛔ MUST name the new person by the uid FR-008 fixes for them', () => {
    // ⛔ EXPECTED RED. This is the one value AS-7's single call forces: CM-44
    // takes a `resourceUid`, the resource does not exist yet, and FR-008 (MUST)
    // says 「新しい `Resource` と `Assignment` の `uid` も
    // `Project.uidHighWaterMark` に従って採ること」 -- AT-20 being the highest uid
    // ever ISSUED. So the number the assignment names is that mark plus one, and
    // there is no other reading under which the two commands can travel
    // together.
    //
    // ⚠️ A HOLE IS REPORTED HERE RATHER THAN INVENTED AROUND: no row says
    // outright that CM-44 may name a `Resource` that CM-40 has not yet made.
    // The value below is derived from FR-008, not chosen.
    const commands = commandsForAssignee(UNKNOWN_NAME)
    expect(oneCommand(commands, CM_40)['name']).toBe(UNKNOWN_NAME)
    expect(oneCommand(commands, CM_44)['taskUid']).toBe(TASK_HELD)
    expect(oneCommand(commands, CM_44)['resourceUid']).toBe(HIGH_WATER_MARK + 1)
  })

  it('⛔ MUST NOT make a second person when the roster already holds the name', () => {
    // ⛔ EXPECTED RED. AS-7 is written for 「名簿に無い名前」 alone, and FR-008
    // (MUST NOT) forbids two assignments of the same Task-and-Resource pair --
    // ⚠️ but the reason a duplicate PERSON must not appear is AS-8, which sends
    // a name the roster already holds to an existing uid instead.
    expect(kindsOf(commandsForAssignee(ROSTERED.name as string))).toEqual([CM_44])
  })
})

describe('表 T-225 AS-8 -- two people of the same name stay two people', () => {
  it('⛔ MUST take the smaller uid, and MUST NOT merge them', () => {
    // ⛔ EXPECTED RED. AS-8 (MUST / MUST NOT): 「`uid` の小さいほうへ割り当てる
    // こと。統合してはならない —— 統合するのは合流の経路だけである（表 T-032 の
    // `MG-5`）」. MG-5 itself carries the same MUST NOT pointing back here:
    // 「画面で同名を入力したときは統合してはならない」.
    //
    // ⭐ THE TWO HALVES ARE ASSERTED SEPARATELY. Taking the smaller uid is the
    // first; that NOTHING ELSE is written -- no deletion, no rename, no new
    // person -- is what "not merging" means at this seam, and a reading that
    // quietly folded the twins together would show up as a second command here.
    const commands = commandsForAssignee(TWIN_NAME)
    expect(kindsOf(commands)).toEqual([CM_44])
    expect(oneCommand(commands, CM_44)['resourceUid']).toBe(TWIN_LOW.uid)
  })
})

describe('表 T-225 AS-10 -- the person is already on this task', () => {
  it('⛔ MUST NOT add a second assignment for a pair the task already holds', () => {
    // AS-10 (MUST): 「割当を増やさないこと」, and FR-008 (MUST NOT) above the
    // table: 「同じ `Task` と同じ `Resource` の組の割当を 2 つ作ってはならない」.
    expect(kindsOf(commandsForAssignee(SEATED.name as string))).not.toContain(CM_44)

    // ⛔ EXPECTED RED, and this second half is here so the case cannot pass
    // vacuously: the tree writes NOTHING for PR-16 at all, so the assertion
    // above is satisfied today for a reason that has nothing to do with AS-10.
    // A surface that obeys AS-10 still has to seat somebody who is not yet on
    // the task, which is what makes the first assertion mean something.
    expect(kindsOf(commandsForAssignee(ROSTERED.name as string))).toEqual([CM_44])
  })
})

// ---------------------------------------------------------------------------
// AS-3 / AS-4 -- the one-character token that takes a person off.
// ---------------------------------------------------------------------------

describe('表 T-225 AS-3 / AS-4 -- the un-assign token', () => {
  it('⛔ AS-3 -- MUST unassign when `-` is confirmed', () => {
    // ⛔ EXPECTED RED. AS-3 (MUST): 「`-` を確定した …… その割当を解くこと（表
    // T-108 の `CM-45`）」. ⚠️ 「担当者そのものは消えない」 -- CM-42 is FR-099's
    // and must not appear here, which is the second assertion.
    const commands = commandsForAssignee(UNASSIGN_TOKEN)
    expect(kindsOf(commands)).toEqual([CM_45])
    const command = oneCommand(commands, CM_45)
    expect(command['taskUid']).toBe(TASK_HELD)
    expect(command['resourceUid']).toBe(SEATED.uid)
  })

  it('⛔ AS-4 -- MUST NOT put a person named `-` in the roster', () => {
    // AS-4 (MUST NOT): 「その名前の `Resource` を作ってはならない —— `AS-3` が
    // 解除の合図に使う 1 文字なので、名簿に入ると二度と打てなくなる」.
    //
    // ⚠️ THE TOKEN IS ASKED FOR ON A TASK NOBODY IS ON, which is the case AS-4
    // is really about: with no assignment to unseat, a reading that fell through
    // to AS-7 would mint the forbidden person. AS-3's answer for that task is
    // decided nowhere, so nothing is asserted about WHAT it writes -- only that
    // it does not write this.
    expect(kindsOf(commandsForAssignee(UNASSIGN_TOKEN, TASK_ALONE))).not.toContain(CM_40)

    // ⛔ EXPECTED RED. Again the guard against a vacuous pass: the same surface
    // has to be able to mint a person for a name that is NOT the token (AS-7),
    // or the assertion above says nothing about AS-4.
    expect(kindsOf(commandsForAssignee(UNKNOWN_NAME, TASK_ALONE))).toContain(CM_40)
  })

  it('leaves the document alone for a task it no longer holds', () => {
    // Not a row of 表 T-225 -- a guard. The field was drawn one frame and the
    // commit collected the next, and nothing may be written for a subject that
    // went between the two.
    const gone = scheduleOf({ tasks: [], resources: [SEATED], assignments: [] })
    expect(commandsForAssignee(UNKNOWN_NAME, TASK_HELD, gone)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// AS-1 / AS-2 -- the label, the grab region that carries it, and the glyph that
// keeps the target standing.
// ---------------------------------------------------------------------------

describe('表 T-225 AS-2 -- the glyph that keeps GR-11 reachable', () => {
  it('⛔ MUST leave a figure GR-11 can claim on a task nobody is on', () => {
    // ⛔ EXPECTED RED. AS-2 (MUST / MUST NOT): 「担当ラベルを出しているあいだは、
    // 担当者名の代わりに `-` の 1 文字を出すこと。空欄にしてはならない —— 何も
    // 描かないと `GR-11` に当たる図形がそのタスクだけ存在せず、担当者がまだ
    // 1 人も就いていないタスクにだけ `AS-1` の経路が無い」. FR-059 hands the
    // empty case to this row in as many words.
    //
    // ⚠️ The tree is further back than that: `item-hit-area.ts` records in its
    // own header that GR-11 has no target at ALL because ScheduleGeometry draws
    // no assignee label, and `GrabArea` has no member for the row -- so this is
    // red for every task, not only for the empty one.
    //
    // ⚠️ Table T-023d's closing rule (MUST NOT) keeps GR-11 off the plain press,
    // so the sweep asks under the double click -- the one reading that reaches
    // the row at all.
    expect(grabsAlongTheBandOf(TASK_ALONE, 'doubleClick')).toContain('GR-11')
  })

  it('⛔ leaves it standing for a task somebody IS on, which is the ordinary case', () => {
    // ⛔ EXPECTED RED, same reason. AS-2 is about the EMPTY task; that the label
    // is a target on a task with a person on it is what AS-1 and GR-11 assume
    // throughout, and the pair of cases is what tells "AS-2 unmet" apart from
    // "the label unmet everywhere".
    expect(grabsAlongTheBandOf(TASK_HELD, 'doubleClick')).toContain('GR-11')
  })

  it('keeps GR-11 off the plain press, whatever is drawn', () => {
    // The closing rule under 表 T-023d (MUST NOT): 「ダブルクリックだけを持つ行
    // （`GR-10` / `GR-11`）は、素の押下では掴みとして成立させないこと」. ⚠️ This
    // one passes today for a reason that is not the rule -- nothing draws the
    // label -- and is the guard that matters when the picture arrives.
    expect(grabsAlongTheBandOf(TASK_ALONE, 'press')).not.toContain('GR-11')
    expect(grabsAlongTheBandOf(TASK_HELD, 'press')).not.toContain('GR-11')
  })
})

describe('表 T-225 AS-1 -- the in-place route the assignee label carries', () => {
  it('⛔ MUST open an in-place edit of the assignee name on a double click', () => {
    // ⛔ EXPECTED RED. AS-1 (MUST): 「担当ラベルをダブルクリックした …… その場で
    // 担当者名を編集させること。入口の割当は表 T-023 の `MK-13`、掴み領域は表
    // T-023d の `GR-11` が既に持つ」, and MK-13 spells the destination
    // 「担当ラベル ＝ 担当者名の変更」. IN-5a of 表 T-028 lists 「an assignee」
    // among the things typed in place, so the state AS-1 opens is one the rest
    // of the specification already knows about.
    //
    // ⚠️ The hit is handed in rather than found, because the sweep above has
    // already reported that nothing draws GR-11 -- so this case asks the second
    // question on its own: given the row, is there a destination? `InPlaceTarget`
    // publishes two members, `documentTitle` and `taskName`, and neither is it.
    const answer = afterDoubleClick(0, 0, taskHitOn('GR-11', TASK_HELD))
    const action = answer.action
    expect(action?.kind, 'MK-13 sends 担当ラベル to an in-place edit').toBe('editInPlace')
    if (action !== null && action.kind === 'editInPlace') {
      const target: string = action.target.kind
      // ⚠️ ONLY WHAT THE ROWS SETTLE. MK-13 gives 担当ラベル its own destination,
      // separate from 「タスク（名称ラベルと本体のどちらでも） ＝ 名称の編集」, so
      // what AS-1 opens may not be the task name -- and FR-035 owns the other
      // member. What it IS called is a name no row has settled, so no case here
      // spells one.
      expect(target).not.toBe('taskName')
      expect(target).not.toBe('documentTitle')
    }
  })

  it('⛔ MUST NOT be the properties panel', () => {
    // MK-13 (MUST NOT, 利用者の裁定 2026-08-27): 「プロパティパネルを開く経路を
    // 本行に置いてはならない」. AS-5's panel is the OTHER of FR-008's two
    // entrances, reached by selecting -- not by double-clicking the label.
    const answer = afterDoubleClick(0, 0, taskHitOn('GR-11', TASK_HELD))
    expect(answer.action?.kind).not.toBe('openPropertiesPanel')
  })
})
