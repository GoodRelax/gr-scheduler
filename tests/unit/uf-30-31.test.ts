// Unit tests for UF-30 `input-command-translator.ts` (the public entry) and
// UF-31 `input-source.ts` (the seam IF-2) -- table T-075 of
// docs/spec/05-07-design.md, component `InputCommandTranslator` (CP-18 of table
// T-062), published as PI-18 of table T-064.
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, the entity and use-case types the inputs are built from, and of the
// unit itself only its head comment, its published types and the three
// signatures `commandFromInput`, `selectionFromInput` and
// `screenStateFromInput`. Every expected value here comes from a requirement or
// a table, never from the implementation.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose):
//   T-023a  PD-1..PD-5 -- the press decision order, first row that holds wins
//   T-023b  AR-1..AR-6 -- what may be armed
//   T-023   MK-1..MK-13 -- the pointer and keyboard assignment
//   T-023c  SL-1..SL-8 -- selection (FR-081)
//   T-023d  GR-1..GR-19 -- grab areas and their priority, and the closing rule
//           that takes the plain press away from the double-click-only rows
//   T-036   SK-1..SK-20 -- the shortcut assignment (FR-070)
//   T-028   IN-1..IN-5a -- input manners (FR-040)
//   T-027   UN-8/UN-9/UN-11/UN-16 -- what undo does not carry
//   T-067   WS-3/WS-4 -- all-or-nothing, and no step for an empty bundle
//   T-066   CS-1/CS-2 -- the frame's frozen copy, the gesture's press
//   T-078   FT-1 -- a person's input is the trigger, so IF-2 pushes
//   FR-001 / FR-011 / FR-016 / FR-029 / FR-031 / FR-046 / FR-055 / FR-070 /
//   FR-071 / FR-081 / FR-083 / FR-097 and T-029a DC-5
//
// Chapter 1.9 (:275) asks a test of a requirement that points at a table to be
// driven by a fixed copy of that table, one case walking every row. T_023,
// T_023A, T_023B, T_023C, T_023D, T_036 and T_028 below are those copies.
//
// ONE CASE IS LEFT FAILING. It is a finding, not a chore (04-verification
// section 1): the expected value states what the specification says and the
// requirement is quoted in the case. Search for `FINDING` below.

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
  screenStateWithFullScreen,
  screenStateWithPalette,
  screenStateWithSurface,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionOfAll,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type { Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
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
import {
  commandFromInput,
  pressRowOf,
  screenStateFromInput,
  selectionFromInput,
  type InputContext,
  type InputModifiers,
  type InputSource,
  type KeyInput,
  type PointerInput,
  type TranslatedInput,
  type WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/** 表 T-023a -- the press decision order, evaluated from the top (MUST). */
const T_023A = ['PD-1', 'PD-2', 'PD-3', 'PD-4', 'PD-4a', 'PD-5'] as const

/** 表 T-023b -- what the palette may have armed. */
const T_023B = [
  { row: 'AR-1', armed: { kind: 'none' } as Armed, makesATask: false },
  { row: 'AR-2', armed: { kind: 'taskShape', shapeKind: 'rectangle' } as Armed, makesATask: true },
  { row: 'AR-3', armed: { kind: 'milestoneShape', glyph: 'diamond' } as Armed, makesATask: true },
  { row: 'AR-4', armed: { kind: 'dependency' } as Armed, makesATask: false },
  { row: 'AR-5', armed: { kind: 'commentBox' } as Armed, makesATask: false },
  { row: 'AR-6', armed: { kind: 'highlightBox' } as Armed, makesATask: false },
] as const

/** 表 T-023 -- the pointer and keyboard assignment (FR-016). */
const T_023 = [
  'MK-1', 'MK-2', 'MK-3', 'MK-4', 'MK-5', 'MK-6', 'MK-7', 'MK-8',
  'MK-9', 'MK-9a', 'MK-10', 'MK-11', 'MK-12', 'MK-13',
] as const

/** 表 T-023c -- the selection rules (FR-081). */
const T_023C = [
  'SL-1', 'SL-2', 'SL-3', 'SL-4', 'SL-5', 'SL-6', 'SL-7', 'SL-7a', 'SL-7b', 'SL-8',
] as const

/**
 * SL-1's set of selectable kinds. Rows (`TaskGroup`) are deliberately absent:
 * FR-085 owns that other set.
 */
const SL_1_KINDS = ['task', 'dependency', 'highlightBox', 'commentBox', 'statusLine'] as const

/**
 * 表 T-023d -- the grab areas, most-preferred first, in the table's own order.
 *
 * ⚠️ GR-19 stands at the HEAD of that table -- 「帯の下に何が描かれていても帯が
 * 勝つ」 -- and was missing from this copy, which asserted 18 where the table
 * prints 19. Its target is the `Command Palette`'s band and not one of SL-1's
 * five kinds, so the walk below steps over it and says why.
 *
 * ⭐ THE ORDER IS STILL THE PRINTED ONE, closing rule and all. 「ダブルクリック
 * だけを持つ行（`GR-10` / `GR-11`）は、素の押下では掴みとして成立させないこと
 * （MUST NOT）」 does not reorder the table and does not drop a row from it:
 * 「⚠️ **ダブルクリックの宛先は本表の順をそのまま使う** —— 消えるのは素の押下の
 * ときだけである。」 So this roster needs no case of its own for those two rows.
 * WHICH row a plain press lands on is `itemAtPointer`'s answer (UF-7), not this
 * unit's; the cases for it are in `t-023d-double-click-only-rows.test.ts`.
 */
const T_023D = [
  'GR-19',
  'GR-1', 'GR-2', 'GR-3', 'GR-4', 'GR-5', 'GR-6', 'GR-7', 'GR-8', 'GR-9', 'GR-17',
  'GR-10', 'GR-11', 'GR-15', 'GR-18', 'GR-12', 'GR-13', 'GR-14', 'GR-16',
] as const

/** 表 T-028 -- the input manners (FR-040). */
const T_028 = ['IN-1', 'IN-1a', 'IN-2', 'IN-3', 'IN-4', 'IN-4a', 'IN-5', 'IN-5a'] as const

/** IN-4's levels, in the order the row fixes, outermost first. */
const IN_4_LEVELS = ['surface', 'gesture', 'armed', 'dualCursorMode'] as const

/** 表 T-027 -- the rows this unit answers to. */
const T_027_HERE = ['UN-8', 'UN-9', 'UN-11', 'UN-16'] as const

/**
 * 表 T-036 -- the whole shortcut assignment (FR-070). `keys` is the assignment
 * column, spelled as `KeyInput.key` spells it; a row whose column is a dash
 * carries none. `member` says which of PI-18's three members answers the row.
 */
type ShortcutRow = {
  readonly row: string
  readonly keys: readonly { readonly key: string; readonly mods?: Partial<InputModifiers> }[]
  readonly member: 'action' | 'selection' | 'screenState' | 'none'
  readonly action?: string
}

const T_036: readonly ShortcutRow[] = [
  { row: 'SK-1', keys: [], member: 'none' },
  { row: 'SK-1a', keys: [], member: 'none' },
  { row: 'SK-19', keys: [{ key: 'Enter' }], member: 'action', action: 'settleTextEntry' },
  { row: 'SK-2', keys: [{ key: 'A', mods: { ctrl: true } }], member: 'selection' },
  { row: 'SK-3', keys: [{ key: 'Delete' }, { key: 'Backspace' }], member: 'action', action: 'changeDocument' },
  { row: 'SK-4', keys: [{ key: 'C', mods: { ctrl: true } }], member: 'action', action: 'copySelection' },
  { row: 'SK-5', keys: [{ key: 'V', mods: { ctrl: true } }], member: 'action', action: 'pasteClipboard' },
  { row: 'SK-6', keys: [{ key: 'Z', mods: { ctrl: true } }], member: 'action', action: 'undoEdit' },
  {
    row: 'SK-7',
    keys: [{ key: 'Y', mods: { ctrl: true } }, { key: 'Z', mods: { ctrl: true, shift: true } }],
    member: 'action',
    action: 'redoEdit',
  },
  { row: 'SK-8', keys: [{ key: 'Esc' }], member: 'screenState' },
  { row: 'SK-9', keys: [{ key: 'F2' }], member: 'action', action: 'editInPlace' },
  { row: 'SK-10', keys: [{ key: 'O', mods: { ctrl: true } }], member: 'action', action: 'openDocumentFile' },
  { row: 'SK-11', keys: [{ key: 'S', mods: { ctrl: true } }], member: 'action', action: 'saveDocumentFile' },
  // ⭐ `screenState` since 2026-08-21: 表 T-103 settled `Export Chooser` (U-54)
  // for the surface FR-096 opens, so its name is one `ScreenState.surface`
  // (S-99g) can hold and IN-4's first level closes it -- the same shape SK-13
  // has for the help. Before the name existed it could only be an action.
  { row: 'SK-12', keys: [{ key: 'E', mods: { ctrl: true, shift: true } }], member: 'screenState' },
  { row: 'SK-13', keys: [{ key: 'F1' }], member: 'screenState' },
  { row: 'SK-14', keys: [{ key: 'P' }], member: 'screenState' },
  { row: 'SK-15', keys: [{ key: 'F11' }], member: 'screenState' },
  {
    row: 'SK-16',
    keys: [{ key: '+', mods: { shift: true } }, { key: '-', mods: { shift: true } }],
    member: 'action',
    action: 'changeDocument',
  },
  {
    row: 'SK-16a',
    keys: [{ key: '+', mods: { alt: true } }, { key: '-', mods: { alt: true } }],
    member: 'action',
    action: 'changeDocument',
  },
  { row: 'SK-17', keys: [{ key: '0', mods: { ctrl: true } }], member: 'action', action: 'changeDocument' },
  { row: 'SK-18', keys: [{ key: 'F' }], member: 'action', action: 'changeDocument' },
  {
    row: 'SK-20',
    keys: [{ key: 'D', mods: { ctrl: true, shift: true } }],
    member: 'action',
    action: 'changeDocument',
  },
]

/**
 * MK-10's own two examples of combinations this tool did NOT assign, which it
 * therefore may not take from the browser (MUST NOT). Both letters carry a
 * bare-key row of table T-036 (SK-14 and SK-18), so a translator that matched
 * on the letter alone would fail here.
 */
const MK_10_UNASSIGNED = [
  { key: 'P', mods: { ctrl: true } },
  { key: 'F', mods: { ctrl: true } },
] as const

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
  scrollDate: '2026-01-01', // S-77, pinned so `dateAtX` has an origin
  scrollGroupId: 'g1', // S-78, pinned so a vertical move is visible
  stackDirection: 'down', // S-58, pinned so every y reads from the top
  rulerHeight: 48,
  rulerFont: 12,
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * S-53 arrives as a value (`InputContext.zoomStep`) because no generator brings
 * table T-201 into `src/`. Deliberately NOT the figure the manuscript prints:
 * a translator that re-typed the constant instead of reading the argument
 * would pass every zoom case below if this were that figure.
 */
const ZOOM_STEP = 3

/** Today, spelled the way `textOfDay` spells a date column. FR-046 / SK-20. */
const TODAY = '2026-03-01T00:00:00'

const NEW_GROUP_ID = 'row-minted-outside'

// Every nullable column has to be spelled `null`; leaving one `undefined`
// reads as "set".
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

/** Two rows; task 1 lives on the first, task 2 on the second and far later. */
const TASK_1 = taskOf({ uid: 1, name: 'one', start: '2026-01-05', finish: '2026-01-09' })
const TASK_2 = taskOf({ uid: 2, name: 'two', start: '2026-02-10', finish: '2026-02-14' })

/**
 * Enough rows that the drawn schedule is taller than the Row Area: a wheel
 * over a schedule that already fits has nowhere to scroll to, and MK-1 could
 * not be told from doing nothing.
 */
const ROW_COUNT = 24

const SCHEDULE = scheduleOf({
  tasks: [TASK_1, TASK_2],
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

/**
 * The same schedule with one of every other SL-1 kind on it, so that a case
 * about a dependency, a box or the status line has something real to name.
 * Kept apart from `SCHEDULE` because `statusDate` decides which way SK-20's
 * switch goes (FR-046).
 */
const RICH_SCHEDULE = scheduleOf({
  ...(SCHEDULE as unknown as Record<string, unknown>),
  project: { ...SCHEDULE.project, statusDate: '2026-02-01T00:00:00' },
  tasks: [
    TASK_1,
    taskOf({
      ...(TASK_2 as unknown as Record<string, unknown>),
      dependencies: [
        { predecessorUid: 1, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] },
      ],
    }),
  ],
  commentBoxes: [
    {
      id: 'c1',
      leaderShapeKind: null,
      text: null,
      anchorDate: '2026-01-06',
      anchorGroupId: 'g1',
      bodyOffsetPx: null,
    },
  ],
  highlightBoxes: [
    {
      id: 'h1',
      startDate: '2026-01-05',
      endDate: '2026-01-09',
      topGroupId: 'g1',
      bottomGroupId: 'g1',
      strokeColor: null,
      cornerRadiusPx: null,
    },
  ],
})

/** ADR-001 has the shell compute these once a frame and hand them round. */
const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection())

const RICH_LAYOUT = layoutFromSchedule(RICH_SCHEDULE, SETTINGS, REGIONS)
const RICH_GEOMETRY = geometryFromLayout(RICH_SCHEDULE, SETTINGS, RICH_LAYOUT, REGIONS, emptySelection())

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
  // S-54 / S-55, travelling as values the way S-53 does. The range CM-71
  // clamps its write into; no case in this file reads either figure.
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  // table T-023's closing rule -- no surface stands over these cases.
  isSurfaceStanding: false,
  // DC-1 of table T-029a puts both dates down on the way in, so 「in the mode」
  // and 「which side follows」 are one value, not two that could disagree.
  dualCursorFollowing: null,
  today: TODAY,
  newGroupId: NEW_GROUP_ID,
}

const contextOf = (part: Partial<InputContext> = {}): InputContext => ({ ...BASE, ...part })

/** The same frame, drawn from the schedule that carries every SL-1 kind. */
const richOf = (part: Partial<InputContext> = {}): InputContext =>
  contextOf({
    document: documentOf(RICH_SCHEDULE),
    layout: RICH_LAYOUT,
    geometry: RICH_GEOMETRY,
    ...part,
  })

// ---------------------------------------------------------------------------
// Building the happenings IF-2 supplies.
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

const wheelOf = (
  x: number,
  y: number,
  notches: number,
  mods: InputModifiers = NO_MODS,
): WheelInput => ({
  kind: 'wheel',
  x,
  y,
  modifiers: mods,
  notches,
  // The two axes differ so that a case can tell which one was read.
  scrollPx: { x: notches * 60, y: notches * 100 },
})

const keyOf = (key: string, mods: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key,
  modifiers: modsOf(mods),
})

// ---------------------------------------------------------------------------
// Coordinates. Read from the layout the shell built, never guessed.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const serialOf = (text: string): number =>
  Date.UTC(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10))) /
  MS_PER_DAY

const ORIGIN_SERIAL = serialOf('2026-01-01')

/** The left edge of the column the given day is drawn in. */
const xOfDay = (text: string): number =>
  LAYOUT.originX + (serialOf(text) - ORIGIN_SERIAL) * LAYOUT.pxPerDay

const rowOf = (groupId: string) => {
  const row = LAYOUT.rows.find((one) => one.groupId === groupId)
  if (row === undefined) throw new Error(`no row ${groupId} in the layout`)
  return row
}

const midYOfRow = (groupId: string): number => {
  const row = rowOf(groupId)
  return row.y + row.height / 2
}

const placementOf = (uid: number) => {
  const at = taskPlacement(LAYOUT, uid)
  if (at === null) throw new Error(`no placement for task ${uid}`)
  return at
}

/**
 * A rectangle that wholly encloses the first Task's bar and nothing else.
 *
 * ⚠️ Both corners sit inside the Row Area on purpose: the note under table
 * T-023a applies the press decision order to the schedule's drawing area only,
 * so a press one pixel above the first row is not a marquee at all.
 */
const marqueeOverTask1 = (): {
  readonly from: PointerInput
  readonly to: PointerInput
} => {
  const at = placementOf(1)
  const row = rowOf('g1')
  return {
    from: pointerOf('down', at.x - 12, row.y),
    to: pointerOf('up', at.x + at.width + 12, row.y + row.height + 8),
  }
}

const hitOf = (item: Hit['item'], grab: Hit['grab']): Hit => ({ item, grab })

const TASK_1_HIT = hitOf({ kind: 'task', taskUid: 1 }, 'GR-12')

// ---------------------------------------------------------------------------
// Reading the three answers.
// ---------------------------------------------------------------------------

// ⚠️ `on: null` below is 「the screen surface had drawn nothing where the press
// landed」 -- the third thing IF-9 of 表 T-065 supplies, and the state every case
// in this file is about. The cases that press an ENTRY say so themselves.

/** IN-1 settles a pointer operation on release, so a gesture is press + up. */
function afterGesture(
  from: PointerInput,
  to: PointerInput,
  hit: Hit | null,
  part: Partial<InputContext> = {},
): { readonly answer: TranslatedInput; readonly context: InputContext } {
  // PI-18 answers which row of table T-023a the press began on, and the caller
  // puts it on the press -- the same order the shell keeps at `collectPress`.
  const before = contextOf({ ...part })
  const pressed = { at: from, hit, on: null, pressRow: pressRowOf({ at: from, hit }, before) }
  const context = contextOf({ ...part, pressed })
  return { answer: commandFromInput(to, context), context }
}

const gestureAction = (
  from: PointerInput,
  to: PointerInput,
  hit: Hit | null,
  part: Partial<InputContext> = {},
): TranslatedInput => afterGesture(from, to, hit, part).answer

function gestureSelection(
  from: PointerInput,
  to: PointerInput,
  hit: Hit | null,
  part: Partial<InputContext> = {},
): Selection {
  const context = contextOf({ ...part, pressed: { at: from, hit, on: null, pressRow: pressRowOf({ at: from, hit }, contextOf({ ...part })) } })
  return selectionFromInput(to, context)
}

/**
 * The commands of a `changeDocument`, or an empty list when it is not one.
 *
 * ⚠️ One input may owe more than one write -- FR-031 (MUST) makes the fit press
 * CM-71 then CM-72 -- so the writes are flattened here. The cases below are
 * about WHICH commands an input asks for; the ORDER of the writes is what
 * `use-case.test.ts` holds.
 */
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

/** Every command kind of table T-108 that writes an actual-side column. */
const ACTUAL_WRITERS = [
  'beginTaskActual',
  'cycleTaskPlanActualState',
  'setTaskPlanActualState',
] as const

// ---------------------------------------------------------------------------
// The rosters themselves, before anything walks them.
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  // A walk over an empty roster passes without asserting anything. These pin
  // the counts so a vacuous case cannot go green.
  it('carries every row of the seven tables, with no repeats', () => {
    expect(T_023A).toHaveLength(6)
    expect(T_023B).toHaveLength(6)
    expect(T_023).toHaveLength(14)
    expect(T_023C).toHaveLength(10)
    expect(T_023D).toHaveLength(19)
    expect(T_028).toHaveLength(8)
    expect(T_036).toHaveLength(22)
    expect(new Set(T_036.map((one) => one.row)).size).toBe(22)
    expect(new Set(T_023D).size).toBe(19)
    // 「上の行ほど優先すること（MUST）」 and GR-19 is the row printed first.
    expect(T_023D[0]).toBe('GR-19')
    expect(SL_1_KINDS).toHaveLength(5)
    expect(IN_4_LEVELS).toHaveLength(4)
    expect(T_027_HERE).toHaveLength(4)
  })

  it('draws a schedule the coordinates can be read from', () => {
    expect(LAYOUT.originDay).not.toBeNull()
    expect(LAYOUT.pxPerDay).toBeGreaterThan(0)
    expect(LAYOUT.rows).toHaveLength(ROW_COUNT)
    // MK-1 needs somewhere to scroll to.
    expect(LAYOUT.contentHeight).toBeGreaterThan(REGIONS.rowArea.height)
    expect(placementOf(1).width).toBeGreaterThan(0)
    expect(placementOf(2).x).toBeGreaterThan(placementOf(1).x + placementOf(1).width)
  })
})

// ---------------------------------------------------------------------------
// UF-31 -- the seam IF-2 of table T-065
// ---------------------------------------------------------------------------

describe('UF-31 input-source.ts -- the seam IF-2 of 表 T-065', () => {
  it('is re-exported from the public entry (Chapter 5.3, MUST)', () => {
    // Type-only: 5.3 makes the public entry the only door out of the folder,
    // and the seam's implementer lives in another layer. That this compiles
    // against the entry rather than the declaring file is the assertion.
    const seam: InputSource | null = null
    expect(seam).toBeNull()
  })

  it('spells a key the way 表 T-036 spells it, not the way a host does', () => {
    // FT-1 makes IF-2 the whole vocabulary a person can operate in, so a row
    // of table T-036 that no `KeyInput.key` can carry is unreachable.
    for (const row of T_036) {
      for (const stroke of row.keys) {
        expect(stroke.key, `${row.row}`).not.toBe('')
        expect(stroke.key, `${row.row} must not carry a host's spelling`).not.toBe('Escape')
        // A letter or a sign travels as ONE character; the named keys are the
        // table's own words.
        const isNamed = ['Esc', 'Enter', 'Delete', 'Backspace', 'F1', 'F2', 'F11'].includes(
          stroke.key,
        )
        expect(isNamed || stroke.key.length === 1, `${row.row} ${stroke.key}`).toBe(true)
        if (!isNamed) expect(stroke.key, `${row.row}`).toBe(stroke.key.toUpperCase())
      }
    }
  })
})

// ---------------------------------------------------------------------------
// FR-028 -- a failure is a value, never an exception
// ---------------------------------------------------------------------------

describe('FR-028 -- every answer is a value; nothing is thrown', () => {
  it('answers a record for a happening this tool assigns to nothing (MK-12)', () => {
    // MK-12's own example of an unassigned combination.
    const answer = commandFromInput(
      pointerOf('up', xOfDay('2026-01-20'), midYOfRow('g3'), { modifiers: modsOf({ alt: true }) }),
      contextOf(),
    )
    expect(answer.action).toBeNull()
    expect(answer.isBrowserDefaultStopped).toBe(false)
  })

  it('answers rather than throwing for a pointer outside every region', () => {
    const far = pointerOf('up', 10_000, 10_000)
    expect(() => commandFromInput(far, contextOf())).not.toThrow()
    expect(() => selectionFromInput(far, contextOf())).not.toThrow()
    expect(() => screenStateFromInput(far, contextOf())).not.toThrow()
  })

  it('answers rather than throwing for a document with nothing in it', () => {
    const bare = scheduleOf({})
    const regions = regionsFromScreen(ENV, SETTINGS)
    const layout = layoutFromSchedule(bare, SETTINGS, regions)
    const context = contextOf({
      document: documentOf(bare),
      layout,
      geometry: geometryFromLayout(bare, SETTINGS, layout, regions, emptySelection()),
      regions,
    })
    for (const input of [
      keyOf('A', { ctrl: true }),
      keyOf('Delete'),
      keyOf('F'),
      keyOf('D', { ctrl: true, shift: true }),
      wheelOf(REGIONS.rowArea.x + 10, REGIONS.rowArea.y + 10, 1),
      pointerOf('up', REGIONS.rowArea.x + 10, REGIONS.rowArea.y + 10),
    ]) {
      expect(() => commandFromInput(input, context), JSON.stringify(input.kind)).not.toThrow()
      expect(() => selectionFromInput(input, context)).not.toThrow()
      expect(() => screenStateFromInput(input, context)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-067 の WS-3 / WS-4 -- one gesture, one bundle, never an empty one
// ---------------------------------------------------------------------------

describe('WS-3 / WS-4 of 表 T-067 and FR-031 -- one write per gesture', () => {
  it('never answers `changeDocument` with an empty command list (WS-4)', () => {
    const from = pointerOf('down', xOfDay('2026-01-05'), midYOfRow('g1'))
    const answers = [
      gestureAction(from, pointerOf('up', xOfDay('2026-01-12'), midYOfRow('g1')), TASK_1_HIT),
      commandFromInput(keyOf('Delete'), contextOf({ selection: selectionWith(emptySelection(), { kind: 'task', uid: 1 }) })),
      commandFromInput(keyOf('F'), contextOf()),
      commandFromInput(keyOf('0', { ctrl: true }), contextOf()),
      commandFromInput(keyOf('D', { ctrl: true, shift: true }), contextOf()),
    ]
    for (const answer of answers) {
      if (answer.action !== null && answer.action.kind === 'changeDocument') {
        expect(answer.action.writes.flat().length).toBeGreaterThan(0)
      }
    }
  })

  it('carries a whole gesture as ONE `changeDocument` (FR-031, MUST)', () => {
    // A body drag that crosses a row asks two rows of table T-108 at once
    // (GR-12: the parallel move, and HM-3's transplant).
    const from = pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1'))
    const to = pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g2'))
    const answer = gestureAction(from, to, TASK_1_HIT)
    expect(answer.action?.kind).toBe('changeDocument')
    expect(commandsOf(answer).length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// 表 T-028 -- the input manners (FR-040)
// ---------------------------------------------------------------------------

describe('表 T-028 -- the input manners (FR-040)', () => {
  it('IN-1: a press carries no action; the release settles the operation', () => {
    const down = pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1'))
    const answer = commandFromInput(down, contextOf({ pressed: null }))
    expect(answer.action).toBeNull()
  })

  it('IN-1: leaving the drawing area is NOT an interruption (MUST NOT)', () => {
    // A marquee that reaches past the edge of the Row Area is an ordinary
    // operation, so the release still settles it.
    const from = pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g1'))
    const beyond = pointerOf('up', REGIONS.rowArea.x + REGIONS.rowArea.width + 400, 10_000)
    const picked = gestureSelection(from, beyond, null)
    expect(picked.items.map((one) => one.kind)).toContain('task')
  })

  it('IN-1a: a lost pointer ends the drag as an abort and writes nothing (MUST)', () => {
    const from = pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1'))
    const lost = pointerOf('lost', xOfDay('2026-01-20'), midYOfRow('g2'))
    const answer = gestureAction(from, lost, TASK_1_HIT)
    expect(answer.action).toBeNull()
    expect(commandsOf(answer)).toHaveLength(0)
  })

  it('IN-1a: an aborted creation drag writes nothing either', () => {
    const armed = screenStateWithArmed(emptyScreenState(), {
      kind: 'taskShape',
      shapeKind: 'rectangle',
    })
    const from = pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3'))
    const lost = pointerOf('lost', xOfDay('2026-01-11'), midYOfRow('g3'))
    expect(gestureAction(from, lost, null, { screenState: armed }).action).toBeNull()
  })

  it('IN-4: one press of Esc consumes ONE level, in the order the row fixes', () => {
    // All four levels are up at once; each Esc takes the outermost that is
    // left, so four presses walk IN_4_LEVELS from the top.
    let state: ScreenState = screenStateWithSurface(
      screenStateWithArmed(emptyScreenState(), { kind: 'dependency' }),
      'Help Modal',
    )
    // `on: null` is what admits table T-023a: the press landed on the
    // schedule's drawing area and on no drawn entry.
    // PD-2 of table T-023a: in Dual Cursor mode the press hits nothing by rule.
    const pressed = { at: pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')), hit: null, on: null, pressRow: 'PD-2' as const }

    // Level 1 -- the open surface.
    state = screenStateFromInput(keyOf('Esc'), contextOf({ screenState: state, pressed, dualCursorFollowing: 'date1' }))
    expect(state.surface).toBeNull()
    expect(state.armed.kind).toBe('dependency')

    // Level 2 -- the gesture in flight. Nothing in ScreenState moves, because
    // the gesture is the Framework's to hold (LY-5).
    const afterGestureEsc = screenStateFromInput(
      keyOf('Esc'),
      contextOf({ screenState: state, pressed, dualCursorFollowing: 'date1' }),
    )
    expect(afterGestureEsc.armed.kind).toBe('dependency')

    // Level 3 -- what is armed, once no gesture is in flight.
    state = screenStateFromInput(
      keyOf('Esc'),
      contextOf({ screenState: state, pressed: null, dualCursorFollowing: 'date1' }),
    )
    expect(state.armed.kind).toBe('none')
  })

  it('IN-4: Esc that consumes a level emits no command (UN-11 of 表 T-027)', () => {
    const armed = screenStateWithArmed(emptyScreenState(), { kind: 'commentBox' })
    const answer = commandFromInput(keyOf('Esc'), contextOf({ screenState: armed }))
    expect(answer.action).toBeNull()
    expect(answer.isBrowserDefaultStopped).toBe(true)
  })

  it('IN-4a: Esc with nothing to consume MUST reach the browser', () => {
    const answer = commandFromInput(keyOf('Esc'), contextOf())
    expect(answer.action).toBeNull()
    expect(answer.isBrowserDefaultStopped).toBe(false)
  })

  it('IN-4a: while something is armed the key is consumed, so it does not reach the browser', () => {
    const armed = screenStateWithArmed(emptyScreenState(), { kind: 'taskShape', shapeKind: 'arrow' })
    expect(
      commandFromInput(keyOf('Esc'), contextOf({ screenState: armed })).isBrowserDefaultStopped,
    ).toBe(true)
  })

  it('IN-5a: a single-character key and Delete/Backspace do nothing while text entry is unsettled (MUST NOT)', () => {
    const typing = contextOf({
      isTextEntryUnsettled: true,
      // table T-023's closing rule -- no surface stands over these cases.
      isSurfaceStanding: false,
      selection: selectionWith(emptySelection(), { kind: 'task', uid: 1 }),
    })
    for (const key of ['P', 'F', 'Delete', 'Backspace']) {
      const answer = commandFromInput(keyOf(key), typing)
      expect(answer.action, key).toBeNull()
      expect(screenStateFromInput(keyOf(key), typing), key).toBe(typing.screenState)
    }
  })

  it('IN-5a: Ctrl+C and Ctrl+V are handed to the browser while text entry is unsettled (MUST)', () => {
    const typing = contextOf({ isTextEntryUnsettled: true })
    for (const key of ['C', 'V']) {
      const answer = commandFromInput(keyOf(key, { ctrl: true }), typing)
      expect(answer.action, key).toBeNull()
      // The exception MK-10 names: not stopped, so the character can be
      // copied and pasted.
      expect(answer.isBrowserDefaultStopped, key).toBe(false)
    }
  })

  it('SK-19: Enter settles the in-place edit that IN-5a describes', () => {
    const typing = contextOf({ isTextEntryUnsettled: true })
    expect(commandFromInput(keyOf('Enter'), typing).action?.kind).toBe('settleTextEntry')
  })

  it('walks 表 T-028 and records which rows this unit answers', () => {
    const answeredHere = ['IN-1', 'IN-1a', 'IN-4', 'IN-4a', 'IN-5a']
    const elsewhere = ['IN-2', 'IN-3', 'IN-5']
    for (const row of T_028) {
      expect(answeredHere.includes(row) || elsewhere.includes(row), row).toBe(true)
    }
    // IN-2 (the pointer's shape) and IN-3 (tooltips) are drawing, and IN-5's
    // third branch is met by the host that decides focus; none of the three
    // has a member here.
    expect(answeredHere).toHaveLength(5)
    expect(elsewhere).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// 表 T-036 -- the shortcut assignment (FR-070)
// ---------------------------------------------------------------------------

describe('表 T-036 -- the shortcut assignment (FR-070)', () => {
  /** The context each row needs to have something to act on. */
  function contextFor(row: string): InputContext {
    if (row === 'SK-19') return contextOf({ isTextEntryUnsettled: true })
    if (row === 'SK-8') return contextOf({ screenState: screenStateWithSurface(emptyScreenState(), 'Help Modal') })
    if (row === 'SK-3') {
      return contextOf({ selection: selectionWith(emptySelection(), { kind: 'task', uid: 1 }) })
    }
    return contextOf()
  }

  it('answers every row of 表 T-036 through the member PI-18 gives it', () => {
    for (const row of T_036) {
      if (row.member === 'none') {
        // The assignment column is a dash: the row records that no route
        // exists, so it carries no key to press.
        expect(row.keys, row.row).toHaveLength(0)
        continue
      }
      expect(row.keys.length, row.row).toBeGreaterThan(0)
      for (const stroke of row.keys) {
        const context = contextFor(row.row)
        const input = keyOf(stroke.key, stroke.mods)
        const answer = commandFromInput(input, context)
        const where = `${row.row} ${stroke.key}`

        if (row.member === 'action') {
          expect(answer.action?.kind, where).toBe(row.action)
        } else {
          // UN-9 and UN-11 keep selection and arming out of the undo record,
          // so neither travels as a command.
          expect(answer.action, where).toBeNull()
        }

        if (row.member === 'selection') {
          expect(selectionFromInput(input, context), where).not.toBe(context.selection)
        }
        if (row.member === 'screenState') {
          expect(screenStateFromInput(input, context), where).not.toBe(context.screenState)
        }

        // MK-10 (MUST): a combination this tool assigned is taken from the
        // browser. Every row above is assigned.
        expect(answer.isBrowserDefaultStopped, where).toBe(true)
      }
    }
  })

  it('SK-2: Ctrl+A picks exactly the kinds SL-1 admits, and no row', () => {
    const picked = selectionFromInput(keyOf('A', { ctrl: true }), contextOf())
    expect(picked.items.length).toBeGreaterThan(0)
    for (const item of picked.items) expect(SL_1_KINDS).toContain(item.kind)
    expect(picked.items.map((one) => one.kind)).not.toContain('taskGroup')
    // SL-5 picks everything at once, so SL-7b leaves no order behind.
    expect(picked.ordered).toBe(false)
  })

  it('SK-3: Delete removes every selected thing, one command per SL-1 kind', () => {
    const items: readonly ItemRef[] = [
      { kind: 'task', uid: 1 },
      { kind: 'dependency', successorUid: 2, ordinal: 0 },
      { kind: 'highlightBox', id: 'h1' },
      { kind: 'commentBox', id: 'c1' },
      { kind: 'statusLine' },
    ]
    const answer = commandFromInput(keyOf('Delete'), richOf({ selection: selectionOfAll(items) }))
    const kinds = kindsOf(answer)
    expect(kinds).toContain('deleteTask')
    expect(kinds).toContain('deleteDependency')
    expect(kinds).toContain('deleteHighlightBox')
    expect(kinds).toContain('deleteCommentBox')
    // FR-046 owns the status line: removing it is `statusDate` going null.
    expect(kinds).toContain('clearStatusDate')
  })

  it('SK-3: Backspace does the same as Delete (both are in the row)', () => {
    const selection = selectionWith(emptySelection(), { kind: 'task', uid: 1 })
    const byDelete = kindsOf(commandFromInput(keyOf('Delete'), contextOf({ selection })))
    const byBackspace = kindsOf(commandFromInput(keyOf('Backspace'), contextOf({ selection })))
    expect(byBackspace).toEqual(byDelete)
  })

  it('SK-3: nothing selected asks for no write (WS-4)', () => {
    const answer = commandFromInput(keyOf('Delete'), contextOf({ selection: emptySelection() }))
    expect(commandsOf(answer)).toHaveLength(0)
  })

  it('SK-9 / FR-035: F2 opens the one entrance to the document name', () => {
    const action = commandFromInput(keyOf('F2'), contextOf()).action
    expect(action?.kind).toBe('editInPlace')
    if (action !== null && action.kind === 'editInPlace') {
      expect(action.target.kind).toBe('documentTitle')
    }
  })

  it('SK-13 / FR-029: F1 OPENS the help and does not toggle it', () => {
    // The assignment column says open, where SK-14 and SK-15 say switch. IN-4
    // already owns the closing, and FR-029 forbids a second entrance.
    const opened = screenStateFromInput(keyOf('F1'), contextOf())
    expect(opened.surface).toBe('Help Modal')
    const again = screenStateFromInput(keyOf('F1'), contextOf({ screenState: opened }))
    expect(again.surface).toBe('Help Modal')
  })

  it('SK-14: P switches the palette both ways', () => {
    const first = screenStateFromInput(keyOf('P'), contextOf())
    expect(first.paletteShown).toBe(!emptyScreenState().paletteShown)
    const back = screenStateFromInput(keyOf('P'), contextOf({ screenState: first }))
    expect(back.paletteShown).toBe(emptyScreenState().paletteShown)
  })

  it('SK-15 / FR-071: F11 switches full screen both ways', () => {
    const on = screenStateFromInput(keyOf('F11'), contextOf())
    expect(on.fullScreen).toBe(true)
    const off = screenStateFromInput(
      keyOf('F11'),
      contextOf({ screenState: screenStateWithFullScreen(emptyScreenState(), true) }),
    )
    expect(off.fullScreen).toBe(false)
  })

  it('SK-16: Shift + sign zooms the time axis only, by the step handed in', () => {
    const bigger = oneCommand(commandFromInput(keyOf('+', { shift: true }), contextOf()), 'setZoom')
    expect(bigger['zoomX']).toBeCloseTo(SETTINGS.zoomX * ZOOM_STEP, 10)
    expect(bigger['zoomY']).toBeCloseTo(SETTINGS.zoomY, 10)

    const smaller = oneCommand(commandFromInput(keyOf('-', { shift: true }), contextOf()), 'setZoom')
    expect(smaller['zoomX']).toBeCloseTo(SETTINGS.zoomX / ZOOM_STEP, 10)
    expect(smaller['zoomY']).toBeCloseTo(SETTINGS.zoomY, 10)
  })

  it('SK-16a: Alt + sign zooms the row axis only', () => {
    const bigger = oneCommand(commandFromInput(keyOf('+', { alt: true }), contextOf()), 'setZoom')
    expect(bigger['zoomY']).toBeCloseTo(SETTINGS.zoomY * ZOOM_STEP, 10)
    expect(bigger['zoomX']).toBeCloseTo(SETTINGS.zoomX, 10)

    const smaller = oneCommand(commandFromInput(keyOf('-', { alt: true }), contextOf()), 'setZoom')
    expect(smaller['zoomY']).toBeCloseTo(SETTINGS.zoomY / ZOOM_STEP, 10)
    expect(smaller['zoomX']).toBeCloseTo(SETTINGS.zoomX, 10)
  })

  it('SK-17: Ctrl+0 puts both axes back to unity', () => {
    const zoomed = settingsOf({ ...SETTINGS, zoomX: 4, zoomY: 0.5 })
    const context = contextOf({ document: documentOf(SCHEDULE, zoomed) })
    const back = oneCommand(commandFromInput(keyOf('0', { ctrl: true }), context), 'setZoom')
    expect(back['zoomX']).toBe(1)
    expect(back['zoomY']).toBe(1)
  })

  it('SK-18 / FR-055: F asks for one fit, zoom and position together', () => {
    const fitted = oneCommand(commandFromInput(keyOf('F'), contextOf()), 'fitScheduleToScreen')
    expect(typeof fitted['zoomX']).toBe('number')
    expect(typeof fitted['zoomY']).toBe('number')
    expect(fitted).toHaveProperty('scrollDate')
    expect(fitted).toHaveProperty('scrollGroupId')
  })

  it('SK-20 / FR-046: showing the line writes today, hiding it writes null', () => {
    const shown = commandFromInput(keyOf('D', { ctrl: true, shift: true }), contextOf())
    expect(oneCommand(shown, 'setStatusDate')['date']).toBe(TODAY)

    const withLine = scheduleOf({
      ...(SCHEDULE as unknown as Record<string, unknown>),
      project: { ...SCHEDULE.project, statusDate: '2026-02-01T00:00:00' },
    })
    const hidden = commandFromInput(
      keyOf('D', { ctrl: true, shift: true }),
      contextOf({ document: documentOf(withLine) }),
    )
    expect(kindsOf(hidden)).toContain('clearStatusDate')
  })
})

// ---------------------------------------------------------------------------
// 表 T-023 の MK-10 / MK-12 -- what may and may not be taken from the browser
// ---------------------------------------------------------------------------

describe('MK-10 / MK-12 of 表 T-023 -- the browser keeps what this tool did not assign', () => {
  it('MK-10 (MUST NOT): leaves the combinations the row itself names alone', () => {
    for (const stroke of MK_10_UNASSIGNED) {
      const answer = commandFromInput(keyOf(stroke.key, stroke.mods), contextOf())
      expect(answer.action, stroke.key).toBeNull()
      expect(answer.isBrowserDefaultStopped, `Ctrl+${stroke.key}`).toBe(false)
    }
  })

  it('MK-10 (MUST): takes the assigned ones, whatever the answer turns out to be', () => {
    for (const stroke of [
      { key: 'S', mods: { ctrl: true } },
      { key: 'O', mods: { ctrl: true } },
      { key: 'A', mods: { ctrl: true } },
      { key: 'Z', mods: { ctrl: true } },
    ]) {
      expect(
        commandFromInput(keyOf(stroke.key, stroke.mods), contextOf()).isBrowserDefaultStopped,
        stroke.key,
      ).toBe(true)
    }
  })

  it('MK-12 (MUST NOT): an unassigned modified drag still lands on 表 T-023a', () => {
    // Alt + drag and Ctrl + Shift + drag have no assignment of their own, and
    // the row forbids answering "nothing": PD-3 decides, because something is
    // under the pointer.
    for (const mods of [modsOf({ alt: true }), modsOf({ ctrl: true, shift: true })]) {
      const from = pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1'), { modifiers: mods })
      const to = pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1'), { modifiers: mods })
      const answer = gestureAction(from, to, TASK_1_HIT)
      expect(kindsOf(answer), JSON.stringify(mods)).toContain('setTaskPlanDates')
    }
  })

  // ⚠️ CORRECTED 2026-08-23: this case carried a header calling itself
  // deliberately failing, and it is green. What it holds is MK-12's own
  // sentence, 「この組合せに本ツールの割当を与えない。ブラウザの既定動作はその
  // まま委ねる —— `MK-10` が、割り当てていない組合せを止めることを禁じている」
  // (docs/spec/01-04-requirements.md:2295), against the prohibition MK-10
  // states: 「割り当てていない組合せを止めてはならない（MUST NOT）」
  // (docs/spec/01-04-requirements.md:2293).
  it('MK-12 (MUST NOT): an unassigned modified drag does not silence the browser', () => {
    for (const mods of [modsOf({ alt: true }), modsOf({ ctrl: true, shift: true })]) {
      const from = pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1'), { modifiers: mods })
      const to = pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1'), { modifiers: mods })
      expect(
        gestureAction(from, to, TASK_1_HIT).isBrowserDefaultStopped,
        JSON.stringify(mods),
      ).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-023 の MK-1 〜 MK-5 -- the wheel
// ---------------------------------------------------------------------------

describe('MK-1 〜 MK-5 of 表 T-023 -- the wheel', () => {
  const X = () => REGIONS.rowArea.x + 40
  const Y = () => REGIONS.rowArea.y + 40

  /** A bare wheel that would carry the view `px` pixels down the schedule. */
  const wheelDown = (px: number): WheelInput => ({
    kind: 'wheel',
    x: X(),
    y: Y(),
    modifiers: NO_MODS,
    notches: 1,
    scrollPx: { x: px, y: px },
  })

  /**
   * How far one detent of an input device carries.
   *
   * ⚠️ NOT a figure any table holds, and deliberately so: `S-96` of
   * `_assets/tbl-settings.md` leaves the distance of one notch to the input
   * device, so a case that wants a device has to bring one rather than read
   * one. Everything below asserts WHICH axis moved and WHETHER it moved --
   * never how far, because no row turns a distance into a number of rows.
   */
  const NOTCH_PX = 100

  /** The nth row the layout drew, in the order it drew them. */
  const nthRow = (layout: InputContext['layout'], index: number) => {
    const row = layout.rows[index]
    if (row === undefined) throw new Error(`no row ${index} in the layout`)
    return row
  }

  /**
   * A frame drawn from `settings`, the way ADR-001 has the shell draw one.
   *
   * ⚠️ Redrawn rather than reused: `S-78` is an argument to the layout, so a
   * case that feeds one answer back in has to draw the frame that answer would
   * have produced, or it goes on asking about a frame nobody would ever see.
   */
  function frameOf(settings: DocumentSettings): InputContext {
    const regions = regionsFromScreen(ENV, settings)
    const layout = layoutFromSchedule(SCHEDULE, settings, regions)
    return contextOf({
      document: documentOf(SCHEDULE, settings),
      layout,
      geometry: geometryFromLayout(SCHEDULE, settings, layout, regions, emptySelection()),
      regions,
    })
  }

  /**
   * A bare wheel turned `notches` detents, spelled the way a wheel with no
   * tilt reports itself: the whole distance on the vertical axis, nothing on
   * the horizontal one. Negative is away from the person, which reads a
   * document further up.
   */
  const bareWheel = (context: InputContext, notches: number): WheelInput => ({
    kind: 'wheel',
    x: context.regions.rowArea.x + 40,
    y: context.regions.rowArea.y + 40,
    modifiers: NO_MODS,
    notches,
    scrollPx: { x: 0, y: notches * NOTCH_PX },
  })

  /**
   * The same schedule drawn with rows TALLER than one notch, which the row
   * axis zoom (`S-76` of table T-203) is what makes them.
   * ⚠️ The fixture the rest of this file uses
   * draws rows SHORTER than one notch, and over those a turn of any length
   * lands past a row boundary whatever it does -- so it cannot tell a vertical
   * scroll from doing nothing. The case below asserts the height it actually
   * got, never the setting it asked for.
   */
  const TALL_SETTINGS = settingsOf({ ...SETTINGS, zoomY: 5 })

  it('MK-1: a bare wheel scrolls, and is not a zoom', () => {
    const answer = commandFromInput(wheelDown(120), contextOf())
    expect(kindsOf(answer)).toContain('setScrollPosition')
    expect(kindsOf(answer)).not.toContain('setZoom')
    // Vertical: the row at the top moves, the day at the left edge does not.
    // The two spellings of one day differ (`textOfDay` writes the exchange
    // partner's own type), so the comparison is of the day, not the text.
    const moved = oneCommand(answer, 'setScrollPosition')
    expect(String(moved['scrollDate']).slice(0, 10)).toBe(SETTINGS.scrollDate)
    expect(moved['scrollGroupId']).not.toBe(SETTINGS.scrollGroupId)
  })

  // ⚠️ CORRECTED 2026-08-23. This case carried a header calling itself
  // deliberately failing and blaming the gap between two rows (`S-12`). It is
  // green, and that diagnosis was wrong twice over: the distances it named are
  // longer than a whole row of THIS fixture, so they clear a row whatever the
  // gap does, and the row it cited for the gap is not the gap's row at all.
  // ⛔ What the case actually holds is the WEAKER half of MK-1: over rows
  // shorter than one turn, a turn moves the row at the top. That is why the
  // bench could not see the running application's `MK-1` break -- the next
  // case is the one that can, and this one is kept because it pins the answer
  // for a schedule whose rows are small.
  it('MK-1: every turn longer than one row moves the row at the top', () => {
    const pitch = rowOf('g2').y - rowOf('g1').y
    for (const px of [36, 100, 120, 200, 250, 300]) {
      expect(px, 'the case only means distances longer than one row').toBeGreaterThanOrEqual(pitch)
      const moved = oneCommand(commandFromInput(wheelDown(px), contextOf()), 'setScrollPosition')
      expect(moved['scrollGroupId'], `${px}px`).not.toBe(SETTINGS.scrollGroupId)
    }
  })

  it('MK-1: a turn moves the row at the top even where one row is taller than the turn', () => {
    // ⛔ The case MK-1 earns, and the one the fixture above cannot make.
    // `S-78` pins the top of the `Row Area` to a WHOLE row and table T-206 has
    // nowhere to keep part of one, so a turn whose landing point stays inside
    // the row already at the top can only answer that same row. MK-1 assigns a
    // bare wheel to 「**縦スクロール**（ズームではない）」
    // (docs/spec/01-04-requirements.md:2283), and a turn that carries the view
    // nowhere is not a vertical scroll; FR-016's STATEMENT makes taking the
    // assignment the requirement:
    // 「`GRS` は、ポインタとキーボードの操作を**表 T-023 の割当**で受け付けること」
    // (docs/spec/01-04-requirements.md:2231).
    // ⚠️ HOW FAR one turn carries is not asserted -- `S-96` leaves that to the
    // device, and no row anywhere turns a distance into a count of rows.
    const context = frameOf(TALL_SETTINGS)
    const pitch = nthRow(context.layout, 1).y - nthRow(context.layout, 0).y
    expect(pitch, 'the case only means a row taller than one notch').toBeGreaterThan(NOTCH_PX)
    // MK-1 needs somewhere to scroll to here as well.
    expect(context.layout.contentHeight).toBeGreaterThan(context.regions.rowArea.height)

    const answer = commandFromInput(bareWheel(context, 1), context)
    expect(kindsOf(answer)).not.toContain('setZoom')
    const moved = oneCommand(answer, 'setScrollPosition')
    expect(moved['scrollGroupId']).not.toBe(TALL_SETTINGS.scrollGroupId)
    // The row axis alone: the day at the left edge (`S-77`) stays where it was.
    expect(String(moved['scrollDate']).slice(0, 10)).toBe(TALL_SETTINGS.scrollDate)
  })

  it('MK-1: a turn that runs off the top reaches the first row and settles there', () => {
    // ⛔ Above the first row there is no row: `S-78` anchors the top of the
    // `Row Area` to a row of the document, and the first one is the top of the
    // stack. So a turn upward long enough to pass it has to answer either a row
    // that exists further up or the one the view already sat on -- and MK-1
    // assigns the bare wheel to 「**縦スクロール**（ズームではない）」
    // (docs/spec/01-04-requirements.md:2283), which the second is not. That
    // second answer is exactly the shape of the break: a schedule whose head
    // can never be brought back into view.
    // ⚠️ HOW FAR one turn carries is still not asserted -- `S-96` leaves that
    // to the device. The walk only has to ARRIVE and then stop moving, so any
    // rate satisfies it. Neither is it asserted that the first row is reached
    // in one turn: that would pin an answer the specification does not fix.
    const drawn = frameOf(TALL_SETTINGS).layout.rows
    const orderOf = (groupId: unknown): number =>
      drawn.findIndex((one) => one.groupId === groupId)

    /**
     * Turned far enough that the whole stack passes the top edge, so that the
     * turn really does ask for a place above the first row. ⚠️ The premise is
     * asserted below rather than trusted.
     */
    const FAR = -2 * ROW_COUNT

    /** The anchor after one such turn; the same anchor when none was written. */
    const afterTurnUp = (anchor: unknown): unknown => {
      const context = frameOf(settingsOf({ ...TALL_SETTINGS, scrollGroupId: anchor }))
      const answer = commandFromInput(bareWheel(context, FAR), context)
      const written = commandsOf(answer).filter((one) => one.kind === 'setScrollPosition')
      // WS-3 / WS-4 of 表 T-067: a turn with nowhere to go may ask for no write
      // at all, but no input may ask for two positions at once.
      expect(written.length, 'one turn owes at most one position').toBeLessThanOrEqual(1)
      if (written[0] === undefined) return anchor
      const moved = written[0] as unknown as Record<string, unknown>
      // Still the row axis alone: the day at the left edge (`S-77`) holds.
      expect(String(moved['scrollDate']).slice(0, 10)).toBe(TALL_SETTINGS.scrollDate)
      return moved['scrollGroupId']
    }

    const layout = frameOf(TALL_SETTINGS).layout
    const pitch = nthRow(layout, 1).y - nthRow(layout, 0).y
    expect(
      Math.abs(FAR) * NOTCH_PX,
      'the turn only means one that runs past every row there is',
    ).toBeGreaterThan(ROW_COUNT * pitch)

    const startedAt = 3
    let anchor: unknown = afterTurnUp(nthRow(layout, startedAt).groupId)
    // ⛔ The turn has to MOVE, and upward: the walk starts on a row that is not
    // the first, so 「縦スクロール」 has somewhere to go.
    expect(orderOf(anchor), 'a turn upward must name a row that exists').toBeGreaterThanOrEqual(0)
    expect(orderOf(anchor), 'a turn upward must not stick').toBeLessThan(startedAt)

    // One turn per row is more than enough to bring the head into view.
    for (let turn = 0; turn < ROW_COUNT; turn += 1) {
      anchor = afterTurnUp(anchor)
      expect(orderOf(anchor), `turn ${turn}`).toBeGreaterThanOrEqual(0)
    }
    expect(anchor, 'the walk must arrive at the head of the schedule').toBe(
      nthRow(layout, 0).groupId,
    )
    // And stay: the first row is not a place to slip past.
    expect(afterTurnUp(anchor)).toBe(anchor)
  })

  it('MK-5: Ctrl+Shift+wheel scrolls sideways', () => {
    const answer = commandFromInput(
      wheelOf(X(), Y(), 1, modsOf({ ctrl: true, shift: true })),
      contextOf(),
    )
    const moved = oneCommand(answer, 'setScrollPosition')
    expect(String(moved['scrollDate']).slice(0, 10)).not.toBe(SETTINGS.scrollDate)
    expect(moved['scrollGroupId']).toBe(SETTINGS.scrollGroupId)
  })

  /**
   * The two ways one device may report the turn MK-5 is assigned to.
   *
   * ⚠️ A wheel held with the two keys down reports its turn on the VERTICAL
   * axis and leaves the horizontal one at zero -- the axis the DEVICE reports
   * on is not the axis the row scrolls. A tilt wheel spells the same row the
   * other way round. Both are MK-5, so both owe the same answer.
   */
  const MK_5_SPELLINGS = [
    { how: 'the turn reported on the vertical axis', px: { x: 0, y: NOTCH_PX } },
    { how: 'the turn reported on the horizontal axis', px: { x: NOTCH_PX, y: 0 } },
  ] as const

  it('MK-5: either spelling of the turn moves the time axis and leaves the row axis alone', () => {
    // MK-5 assigns `Ctrl` ＋ `Shift` ＋ wheel to 「横スクロール」
    // (docs/spec/01-04-requirements.md:2287). The row fixes the AXIS, so the
    // case asks which axis moved, never how far along it.
    for (const spelling of MK_5_SPELLINGS) {
      const answer = commandFromInput(
        {
          kind: 'wheel',
          x: X(),
          y: Y(),
          modifiers: modsOf({ ctrl: true, shift: true }),
          notches: 1,
          scrollPx: spelling.px,
        },
        contextOf(),
      )
      expect(kindsOf(answer), spelling.how).not.toContain('setZoom')
      const moved = oneCommand(answer, 'setScrollPosition')
      expect(String(moved['scrollDate']).slice(0, 10), spelling.how).not.toBe(SETTINGS.scrollDate)
      expect(moved['scrollGroupId'], spelling.how).toBe(SETTINGS.scrollGroupId)
      // MK-10 (MUST): this tool assigned the combination, so it takes it.
      expect(answer.isBrowserDefaultStopped, spelling.how).toBe(true)
    }
  })

  it('MK-2: Ctrl+wheel zooms both axes by the same factor', () => {
    const zoomed = oneCommand(
      commandFromInput(wheelOf(X(), Y(), -1, modsOf({ ctrl: true })), contextOf()),
      'setZoom',
    )
    expect(zoomed['zoomX']).not.toBe(SETTINGS.zoomX)
    expect(zoomed['zoomY']).not.toBe(SETTINGS.zoomY)
    expect(Number(zoomed['zoomX']) / SETTINGS.zoomX).toBeCloseTo(
      Number(zoomed['zoomY']) / SETTINGS.zoomY,
      10,
    )
  })

  it('MK-3: Shift+wheel zooms the time axis only', () => {
    const zoomed = oneCommand(
      commandFromInput(wheelOf(X(), Y(), -1, modsOf({ shift: true })), contextOf()),
      'setZoom',
    )
    expect(zoomed['zoomX']).not.toBe(SETTINGS.zoomX)
    expect(zoomed['zoomY']).toBeCloseTo(SETTINGS.zoomY, 10)
  })

  it('MK-4: Alt+wheel zooms the row axis only', () => {
    const zoomed = oneCommand(
      commandFromInput(wheelOf(X(), Y(), -1, modsOf({ alt: true })), contextOf()),
      'setZoom',
    )
    expect(zoomed['zoomY']).not.toBe(SETTINGS.zoomY)
    expect(zoomed['zoomX']).toBeCloseTo(SETTINGS.zoomX, 10)
  })

  it('MK-2 〜 MK-4: one notch steps by the factor handed in (S-53 through the context)', () => {
    const oneNotch = oneCommand(
      commandFromInput(wheelOf(X(), Y(), -1, modsOf({ shift: true })), contextOf()),
      'setZoom',
    )
    const twoNotches = oneCommand(
      commandFromInput(wheelOf(X(), Y(), -2, modsOf({ shift: true })), contextOf()),
      'setZoom',
    )
    const first = Number(oneNotch['zoomX']) / SETTINGS.zoomX
    const second = Number(twoNotches['zoomX']) / SETTINGS.zoomX
    expect(first).toBeCloseTo(ZOOM_STEP, 10)
    expect(second).toBeCloseTo(ZOOM_STEP * ZOOM_STEP, 10)
  })

  it('MK-2 〜 MK-4: turning the other way undoes the step', () => {
    const away = oneCommand(
      commandFromInput(wheelOf(X(), Y(), -1, modsOf({ shift: true })), contextOf()),
      'setZoom',
    )
    const toward = oneCommand(
      commandFromInput(wheelOf(X(), Y(), 1, modsOf({ shift: true })), contextOf()),
      'setZoom',
    )
    expect(Number(away['zoomX']) * Number(toward['zoomX'])).toBeCloseTo(SETTINGS.zoomX ** 2, 10)
  })

  it('FR-016 (MUST NOT): a wheel during a drag is refused', () => {
    // `on: null`: the press that started the drag landed on the drawing area,
    // not on a drawn entry, which is what puts table T-023a in charge of it.
    const pressed = {
      at: pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      hit: TASK_1_HIT,
      on: null,
      // PD-3: the press landed on something, so it is an operation on that.
      pressRow: 'PD-3' as const,
    }
    for (const mods of [modsOf({ ctrl: true }), modsOf({ shift: true }), modsOf({ alt: true })]) {
      const answer = commandFromInput(wheelOf(X(), Y(), -1, mods), contextOf({ pressed }))
      expect(answer.action, JSON.stringify(mods)).toBeNull()
      // Still an assigned combination, so MK-10 still takes it (MUST).
      expect(answer.isBrowserDefaultStopped, JSON.stringify(mods)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-023a -- the press decision order
// ---------------------------------------------------------------------------

describe('表 T-023a -- the press decision order, first row that holds (MUST)', () => {
  const armedShape = screenStateWithArmed(emptyScreenState(), {
    kind: 'taskShape',
    shapeKind: 'rectangle',
  })

  it('walks 表 T-023a and settles each row on what it names', () => {
    const from = xOfDay('2026-01-06')
    const to = xOfDay('2026-01-13')
    const y1 = midYOfRow('g1')
    const y3 = midYOfRow('g3')

    const seen: Record<string, boolean> = {}
    for (const row of T_023A) {
      switch (row) {
        case 'PD-1': {
          // Ctrl alone, on top of something: still a pan.
          const mods = modsOf({ ctrl: true })
          const answer = gestureAction(
            pointerOf('down', from, y1, { modifiers: mods }),
            pointerOf('up', to, y1, { modifiers: mods }),
            TASK_1_HIT,
          )
          expect(kindsOf(answer), row).toContain('setScrollPosition')
          expect(kindsOf(answer), row).not.toContain('setTaskPlanDates')
          seen[row] = true
          break
        }
        case 'PD-2': {
          // Dual Cursor mode: DC-5 refuses creation, movement and editing.
          const answer = gestureAction(
            pointerOf('down', from, y1),
            pointerOf('up', to, y1),
            TASK_1_HIT,
            { dualCursorFollowing: 'date1', screenState: armedShape },
          )
          expect(kindsOf(answer), row).not.toContain('setTaskPlanDates')
          expect(kindsOf(answer), row).not.toContain('createTask')
          seen[row] = true
          break
        }
        case 'PD-3': {
          const answer = gestureAction(
            pointerOf('down', from, y1),
            pointerOf('up', to, y1),
            TASK_1_HIT,
          )
          expect(kindsOf(answer), row).toContain('setTaskPlanDates')
          seen[row] = true
          break
        }
        case 'PD-4': {
          const answer = gestureAction(
            pointerOf('down', from, y3),
            pointerOf('up', to, y3),
            null,
            { screenState: armedShape },
          )
          expect(kindsOf(answer), row).toContain('createTask')
          seen[row] = true
          break
        }
        case 'PD-4a': {
          const armedLine = screenStateWithArmed(emptyScreenState(), { kind: 'dependency' })
          const context = contextOf({
            screenState: armedLine,
            // PD-4a: the dependency arm on ground that hit nothing.
            pressed: { at: pointerOf('down', from, y3), hit: null, on: null, pressRow: 'PD-4a' as const },
          })
          const up = pointerOf('up', to, y3)
          expect(commandFromInput(up, context).action, row).toBeNull()
          // The arm is not released by the gesture.
          expect(screenStateFromInput(up, context).armed.kind, row).toBe('dependency')
          seen[row] = true
          break
        }
        case 'PD-5': {
          const marquee = marqueeOverTask1()
          const picked = gestureSelection(marquee.from, marquee.to, null)
          expect(picked.items.map((one) => one.kind), row).toContain('task')
          seen[row] = true
          break
        }
      }
    }
    expect(Object.keys(seen).sort()).toEqual([...T_023A].sort())
  })

  it('PD-1: the middle button pans too', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1'), { button: 'middle' }),
      pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1'), { button: 'middle' }),
      TASK_1_HIT,
    )
    expect(kindsOf(answer)).toContain('setScrollPosition')
  })

  it('MK-7 (MUST): the pan is one-to-one -- the schedule moves as far as the pointer', () => {
    const mods = modsOf({ ctrl: true })
    const days = 5
    const from = xOfDay('2026-01-06')
    const to = from + days * LAYOUT.pxPerDay
    const answer = gestureAction(
      pointerOf('down', from, midYOfRow('g1'), { modifiers: mods }),
      pointerOf('up', to, midYOfRow('g1'), { modifiers: mods }),
      null,
    )
    const moved = oneCommand(answer, 'setScrollPosition')
    const landed = String(moved['scrollDate']).slice(0, 10)
    expect(Math.abs(serialOf(landed) - ORIGIN_SERIAL)).toBe(days)
  })

  // -- 「パンは等倍とすること（MUST）」 for a drag SHORTER than one row / one day --
  //
  // 表 T-023d: 「パンは等倍とすること（MUST）—— ポインタが動いた距離だけ日程表が
  // 動く。倍率を掛けない。⛔ 錠の上にしか着地できない形にしてはならない
  // （MUST NOT）—— …`S-77` と `S-78` は日付と行の識別子しか持てないので、それだけ
  // では 1 日・1 行より短い移動が何も起こさず、等倍が成り立たない。端数は同表の
  // `S-176` と `S-177` が持つ（MUST）」

  /**
   * Where the top edge of the `Row Area` sits, in the schedule's own pixels,
   * for a written position.
   *
   * ⭐ Read off the layout the shell built, never computed from a setting: the
   * anchor names a row and the fraction is 「その行自身の高さに対する比」
   * (`S-176`), so the two together are one distance only once the row's own
   * height is known. ⚠️ Distances between rows are the same whichever row the
   * band is anchored to, so ONE layout answers for both readings.
   */
  const topEdgeOf = (position: Record<string, unknown>): number => {
    const row = rowOf(String(position['scrollGroupId']))
    return row.y + Number(position['scrollGroupOffset']) * row.height
  }

  /** The same, along the time axis: 「横の軸の `S-176` である」(`S-177`). */
  const leftEdgeOf = (position: Record<string, unknown>): number =>
    xOfDay(String(position['scrollDate']).slice(0, 10)) +
    Number(position['scrollDayOffset']) * LAYOUT.pxPerDay

  const WHERE_IT_STARTED = {
    scrollGroupId: SETTINGS.scrollGroupId,
    scrollGroupOffset: SETTINGS.scrollGroupOffset,
    scrollDate: SETTINGS.scrollDate,
    scrollDayOffset: SETTINGS.scrollDayOffset,
  }

  /** `Ctrl` + drag is the pan of PD-1 / MK-7; `from` and `to` are the pointer. */
  const pannedBy = (dx: number, dy: number): Record<string, unknown> => {
    const mods = modsOf({ ctrl: true })
    const from = { x: xOfDay('2026-01-06'), y: midYOfRow('g3') }
    return oneCommand(
      gestureAction(
        pointerOf('down', from.x, from.y, { modifiers: mods }),
        pointerOf('up', from.x + dx, from.y + dy, { modifiers: mods }),
        null,
      ),
      'setScrollPosition',
    )
  }

  it('⛔ MUST NOT land only on an anchor: a drag shorter than one row still moves the picture, by that same distance', () => {
    // ⭐ The whole of the MUST NOT in one case. A drag of a few pixels is shorter
    // than a row, so a position that could only name a row would answer 「動かない」
    // -- and 等倍 would be broken exactly where it is easiest to see.
    const row = rowOf('g1')
    const dy = Math.round(row.height / 3)
    expect(dy, 'the case only means a drag SHORTER than one row').toBeLessThan(row.height)
    expect(dy, 'and a drag that really is a drag').toBeGreaterThan(0)

    // Dragging the pointer UP carries the schedule up with it (等倍), which is
    // the direction there is room in: the view starts at the first row.
    const moved = pannedBy(0, -dy)

    expect(topEdgeOf(moved) - topEdgeOf(WHERE_IT_STARTED), 'ポインタが動いた距離だけ動く').toBeCloseTo(
      dy,
      6,
    )
  })

  it('⛔ the same along the time axis: a drag shorter than one day moves the picture by that distance', () => {
    const dx = Math.round(LAYOUT.pxPerDay / 3)
    expect(dx, 'the case only means a drag SHORTER than one day').toBeLessThan(LAYOUT.pxPerDay)
    expect(dx, 'and a drag that really is a drag').toBeGreaterThan(0)

    const moved = pannedBy(-dx, 0)

    expect(leftEdgeOf(moved) - leftEdgeOf(WHERE_IT_STARTED), 'ポインタが動いた距離だけ動く').toBeCloseTo(
      dx,
      6,
    )
  })

  it('MUST: 等倍 -- twice the drag is twice the distance, and no factor is applied to either', () => {
    // 「倍率を掛けない」. Two drags of the same axis, one twice the other: a pan
    // that multiplied by anything at all would keep the ratio and miss the
    // distance, so both are held against the pointer itself.
    const row = rowOf('g1')
    const dy = Math.round(row.height / 4)
    const near = topEdgeOf(pannedBy(0, -dy)) - topEdgeOf(WHERE_IT_STARTED)
    const far = topEdgeOf(pannedBy(0, -2 * dy)) - topEdgeOf(WHERE_IT_STARTED)

    expect(near).toBeCloseTo(dy, 6)
    expect(far).toBeCloseTo(2 * dy, 6)
  })

  it('MUST: the fraction the pan writes stays inside its own range (S-176 / S-177)', () => {
    // 「⚠️ 上限の 1 は含まない。1 以上になったら錠を 1 つ隣へ送る」-- the writer's
    // half of what OP-10a forgives on the reading side, so that one position has
    // one spelling and NS-4's round trip stays true.
    const row = rowOf('g1')
    for (const dy of [-3, -row.height, -2 * row.height, -3 * row.height - 5]) {
      const moved = pannedBy(0, dy)
      const held = Number(moved['scrollGroupOffset'])
      expect(held, `${dy}px`).toBeGreaterThanOrEqual(0)
      expect(held, `${dy}px`).toBeLessThan(1)
    }
    for (const dx of [-2, -LAYOUT.pxPerDay, -5 * LAYOUT.pxPerDay - 1]) {
      const moved = pannedBy(dx, 0)
      const held = Number(moved['scrollDayOffset'])
      expect(held, `${dx}px`).toBeGreaterThanOrEqual(0)
      expect(held, `${dx}px`).toBeLessThan(1)
    }
  })

  it('第 1 の分岐 (MUST): what was hit decides before what is armed', () => {
    // PD-3 comes before PD-4, so an armed shape does not make a new Task on
    // top of an existing one.
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1')),
      TASK_1_HIT,
      { screenState: armedShape },
    )
    expect(kindsOf(answer)).not.toContain('createTask')
    expect(kindsOf(answer)).toContain('setTaskPlanDates')
  })
})

// ---------------------------------------------------------------------------
// 表 T-023b -- what may be armed, and FR-001's creation
// ---------------------------------------------------------------------------

describe('表 T-023b and FR-001 -- creating from an armed palette', () => {
  const armedWith = (armed: Armed): ScreenState => screenStateWithArmed(emptyScreenState(), armed)

  it('walks 表 T-023b: only a shape row makes a Task on empty ground', () => {
    for (const row of T_023B) {
      const answer = gestureAction(
        pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3')),
        pointerOf('up', xOfDay('2026-01-11'), midYOfRow('g3')),
        null,
        { screenState: armedWith(row.armed) },
      )
      expect(kindsOf(answer).includes('createTask'), `${row.row}`).toBe(row.makesATask)
      // UN-11: arming is outside the undo record, so nothing here ever asks
      // for a write that changes what is armed.
      expect(kindsOf(answer), row.row).not.toContain('setArmed')
    }
  })

  it('AR-2 / FR-001: the created Task carries the armed shape', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3')),
      pointerOf('up', xOfDay('2026-01-11'), midYOfRow('g3')),
      null,
      { screenState: armedWith({ kind: 'taskShape', shapeKind: 'chevron' }) },
    )
    expect(oneCommand(answer, 'createTask')['shapeKind']).toBe('chevron')
  })

  it('AR-3 / FR-001 (MUST): a milestone arm makes a milestone-shaped Task', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3')),
      pointerOf('up', xOfDay('2026-01-11'), midYOfRow('g3')),
      null,
      { screenState: armedWith({ kind: 'milestoneShape', glyph: 'diamond' }) },
    )
    expect(oneCommand(answer, 'createTask')['shapeKind']).toBe('milestone')
  })

  it('FR-001 (MUST): the row is the one the START of the drag points at', () => {
    // "ドラッグを始めた縦位置が指す TaskGroup に載せること（MUST）"
    // -- docs/spec/01-04-requirements.md:943 (FR-001 STATEMENT).
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3')),
      pointerOf('up', xOfDay('2026-01-11'), midYOfRow('g5')),
      null,
      { screenState: armedWith({ kind: 'taskShape', shapeKind: 'rectangle' }) },
    )
    expect(oneCommand(answer, 'createTask')['groupId']).toBe('g3')
  })

  it('FR-001 (MUST): a click, not a drag, makes start and finish the same day', () => {
    const at = xOfDay('2026-01-04')
    const y = midYOfRow('g3')
    const answer = gestureAction(pointerOf('down', at, y), pointerOf('up', at, y), null, {
      screenState: armedWith({ kind: 'taskShape', shapeKind: 'rectangle' }),
    })
    const made = oneCommand(answer, 'createTask')
    expect(made['start']).toBe(made['finish'])
  })

  it('FR-001 (MUST): a drag shorter than one day makes start and finish the same day', () => {
    const at = xOfDay('2026-01-04')
    const y = midYOfRow('g3')
    const answer = gestureAction(
      pointerOf('down', at, y),
      pointerOf('up', at + LAYOUT.pxPerDay / 3, y),
      null,
      { screenState: armedWith({ kind: 'taskShape', shapeKind: 'rectangle' }) },
    )
    const made = oneCommand(answer, 'createTask')
    expect(made['start']).toBe(made['finish'])
  })

  it('FR-001 (MUST): a drag on no row at all names the row that has to be made', () => {
    const bare = scheduleOf({})
    const regions = regionsFromScreen(ENV, SETTINGS)
    const layout = layoutFromSchedule(bare, SETTINGS, regions)
    const answer = gestureAction(
      pointerOf('down', regions.rowArea.x + 30, regions.rowArea.y + 20),
      pointerOf('up', regions.rowArea.x + 90, regions.rowArea.y + 20),
      null,
      {
        document: documentOf(bare),
        layout,
        regions,
        geometry: geometryFromLayout(bare, SETTINGS, layout, regions, emptySelection()),
        screenState: armedWith({ kind: 'taskShape', shapeKind: 'rectangle' }),
      },
    )
    // FR-001's second MUST is answered by naming an id no row holds: CM-6 is
    // the entrance that makes the row, and `newGroupId` is the identifier the
    // caller minted for it (AT-51 is a UUID, so minting is not a pure act).
    expect(oneCommand(answer, 'createTask')['groupId']).toBe(NEW_GROUP_ID)
    expect(
      SCHEDULE.taskGroups.some((one) => one.id === NEW_GROUP_ID),
      'the id must be one no row holds',
    ).toBe(false)
  })

  it('FR-001 (MUST): a created Task is given no WBS parent', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3')),
      pointerOf('up', xOfDay('2026-01-11'), midYOfRow('g3')),
      null,
      { screenState: armedWith({ kind: 'taskShape', shapeKind: 'rectangle' }) },
    )
    expect(oneCommand(answer, 'createTask')).not.toHaveProperty('wbsParentUid')
    expect(kindsOf(answer)).not.toContain('setTaskWbsParent')
  })

  it('AR-4 / PD-4a: the dependency arm on empty ground writes nothing and keeps the arm', () => {
    const context = contextOf({
      screenState: armedWith({ kind: 'dependency' }),
      // PD-4a: the dependency arm on ground that hit nothing.
      pressed: { at: pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3')), hit: null, on: null, pressRow: 'PD-4a' as const },
    })
    const up = pointerOf('up', xOfDay('2026-01-11'), midYOfRow('g3'))
    expect(commandFromInput(up, context).action).toBeNull()
    expect(screenStateFromInput(up, context).armed.kind).toBe('dependency')
  })
})

// ---------------------------------------------------------------------------
// 表 T-023c -- the selection rules (FR-081)
// ---------------------------------------------------------------------------

describe('表 T-023c -- the selection rules (FR-081)', () => {
  const wholeRow1 = marqueeOverTask1

  it('SL-1: never answers with a row, whatever the gesture', () => {
    const marquee = wholeRow1()
    const answers = [
      gestureSelection(marquee.from, marquee.to, null),
      selectionFromInput(keyOf('A', { ctrl: true }), contextOf()),
      gestureSelection(
        pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
        pointerOf('up', xOfDay('2026-01-06'), midYOfRow('g1')),
        TASK_1_HIT,
      ),
    ]
    for (const picked of answers) {
      for (const item of picked.items) expect(SL_1_KINDS).toContain(item.kind)
    }
  })

  it('SL-2: a click on a target replaces what was selected', () => {
    const held = selectionWith(emptySelection(), { kind: 'task', uid: 2 })
    const at = xOfDay('2026-01-06')
    const y = midYOfRow('g1')
    const picked = gestureSelection(pointerOf('down', at, y), pointerOf('up', at, y), TASK_1_HIT, {
      selection: held,
    })
    expect(picked.items).toEqual([{ kind: 'task', uid: 1 }])
  })

  it('SL-2: a click selects a dependency, a box and the status line (SL-1 kinds)', () => {
    const cases: readonly { readonly hit: Hit; readonly expected: ItemRef }[] = [
      {
        hit: hitOf({ kind: 'dependency', predecessorUid: 1, successorUid: 2 }, 'GR-13'),
        expected: { kind: 'dependency', successorUid: 2, ordinal: 0 },
      },
      {
        hit: hitOf({ kind: 'highlightBox', id: 'h1' }, 'GR-14'),
        expected: { kind: 'highlightBox', id: 'h1' },
      },
      {
        hit: hitOf({ kind: 'commentBox', id: 'c1' }, 'GR-14'),
        expected: { kind: 'commentBox', id: 'c1' },
      },
      { hit: hitOf({ kind: 'statusLine' }, 'GR-16'), expected: { kind: 'statusLine' } },
    ]
    for (const one of cases) {
      const at = xOfDay('2026-01-06')
      const y = midYOfRow('g1')
      const picked = gestureSelection(
        pointerOf('down', at, y),
        pointerOf('up', at, y),
        one.hit,
        richOf(),
      )
      expect(picked.items, one.hit.item.kind).toContainEqual(one.expected)
    }
  })

  it('SL-3 (MUST): a marquee takes only what it wholly encloses', () => {
    const marquee = wholeRow1()
    const picked = gestureSelection(marquee.from, marquee.to, null)
    expect(picked.items).toContainEqual({ kind: 'task', uid: 1 })
    expect(picked.items).not.toContainEqual({ kind: 'task', uid: 2 })
  })

  it('SL-3 (MUST NOT): a marquee that merely touches a bar does not take it', () => {
    const at = placementOf(1)
    const row = rowOf('g1')
    // Left edge only: the rectangle overlaps the first pixels of the bar.
    const picked = gestureSelection(
      pointerOf('down', at.x - 12, row.y),
      pointerOf('up', at.x + at.width / 2, row.y + row.height + 8),
      null,
    )
    expect(picked.items).not.toContainEqual({ kind: 'task', uid: 1 })
  })

  it('SL-1 (MUST NOT): a marquee never sweeps in the status line', () => {
    const picked = gestureSelection(
      pointerOf('down', REGIONS.rowArea.x, REGIONS.rowArea.y),
      pointerOf(
        'up',
        REGIONS.rowArea.x + REGIONS.rowArea.width,
        REGIONS.rowArea.y + REGIONS.rowArea.height,
      ),
      null,
      richOf(),
    )
    expect(picked.items.length).toBeGreaterThan(0)
    expect(picked.items).not.toContainEqual({ kind: 'statusLine' })
  })

  it('SL-4: Shift + click adds one at a time', () => {
    const held = selectionWith(emptySelection(), { kind: 'task', uid: 2 })
    const at = xOfDay('2026-01-06')
    const y = midYOfRow('g1')
    const shift = modsOf({ shift: true })
    const picked = gestureSelection(
      pointerOf('down', at, y, { modifiers: shift }),
      pointerOf('up', at, y, { modifiers: shift }),
      TASK_1_HIT,
      { selection: held },
    )
    expect(picked.items).toContainEqual({ kind: 'task', uid: 2 })
    expect(picked.items).toContainEqual({ kind: 'task', uid: 1 })
  })

  it('SL-4: Shift + click a second time takes it out again', () => {
    const held = selectionOfAll([
      { kind: 'task', uid: 1 },
      { kind: 'task', uid: 2 },
    ])
    const at = xOfDay('2026-01-06')
    const y = midYOfRow('g1')
    const shift = modsOf({ shift: true })
    const picked = gestureSelection(
      pointerOf('down', at, y, { modifiers: shift }),
      pointerOf('up', at, y, { modifiers: shift }),
      TASK_1_HIT,
      { selection: held },
    )
    expect(picked.items).not.toContainEqual({ kind: 'task', uid: 1 })
    expect(picked.items).toContainEqual({ kind: 'task', uid: 2 })
  })

  it('SL-4: Shift + marquee adds the enclosed to what was already held', () => {
    const held = selectionWith(emptySelection(), { kind: 'task', uid: 2 })
    const marquee = wholeRow1()
    const shift = modsOf({ shift: true })
    const picked = gestureSelection(
      { ...marquee.from, modifiers: shift },
      { ...marquee.to, modifiers: shift },
      null,
      { selection: held },
    )
    expect(picked.items).toContainEqual({ kind: 'task', uid: 1 })
    expect(picked.items).toContainEqual({ kind: 'task', uid: 2 })
  })

  it('SL-6 / MK-11: a bare click on nothing clears the selection', () => {
    const held = selectionOfAll([
      { kind: 'task', uid: 1 },
      { kind: 'task', uid: 2 },
    ])
    const at = xOfDay('2026-01-20')
    const y = midYOfRow('g4')
    const picked = gestureSelection(pointerOf('down', at, y), pointerOf('up', at, y), null, {
      selection: held,
    })
    expect(picked.items).toEqual([])
  })

  it('MK-11 only bites when nothing is armed (FR-083 note)', () => {
    // With a shape armed, a click on empty ground is PD-4 and makes a Task of
    // zero length, so the selection is not the answer being asked for.
    const held = selectionWith(emptySelection(), { kind: 'task', uid: 2 })
    const at = xOfDay('2026-01-20')
    const y = midYOfRow('g4')
    const answer = gestureAction(pointerOf('down', at, y), pointerOf('up', at, y), null, {
      selection: held,
      screenState: screenStateWithArmed(emptyScreenState(), {
        kind: 'taskShape',
        shapeKind: 'rectangle',
      }),
    })
    expect(kindsOf(answer)).toContain('createTask')
  })

  it('SL-7 (MUST): a body drag moves every selected Task', () => {
    const held = selectionOfAll([
      { kind: 'task', uid: 1 },
      { kind: 'task', uid: 2 },
    ])
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1')),
      TASK_1_HIT,
      { selection: held },
    )
    const moved = commandsOf(answer).filter((one) => one.kind === 'setTaskPlanDates')
    expect(moved.map((one) => (one as unknown as Record<string, unknown>)['uid']).sort()).toEqual([
      1, 2,
    ])
  })

  it('SL-7a (MUST): an END drag narrows to the one that was grabbed', () => {
    const held = selectionOfAll([
      { kind: 'task', uid: 1 },
      { kind: 'task', uid: 2 },
    ])
    const answer = gestureAction(
      pointerOf('down', placementOf(1).x + placementOf(1).width, midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-15'), midYOfRow('g1')),
      hitOf({ kind: 'task', taskUid: 1 }, 'GR-4'),
      { selection: held },
    )
    const moved = commandsOf(answer).filter((one) => one.kind === 'setTaskPlanDates')
    expect(moved).toHaveLength(1)
    expect((moved[0] as unknown as Record<string, unknown>)['uid']).toBe(1)
  })

  it('SL-1 (MUST NOT): the status line is not carried along by a group move', () => {
    const held = selectionOfAll([
      { kind: 'task', uid: 1 },
      { kind: 'statusLine' },
    ])
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1')),
      TASK_1_HIT,
      { selection: held },
    )
    expect(kindsOf(answer)).not.toContain('setStatusDate')
  })

  it('SL-7b (MUST): picking one at a time keeps an order; a marquee does not', () => {
    const at = xOfDay('2026-01-06')
    const y = midYOfRow('g1')
    const oneByOne = gestureSelection(pointerOf('down', at, y), pointerOf('up', at, y), TASK_1_HIT)
    expect(oneByOne.ordered).toBe(true)

    const marquee = wholeRow1()
    expect(gestureSelection(marquee.from, marquee.to, null).ordered).toBe(false)
  })

  it('UN-9 of 表 T-027: a selection change is never a command', () => {
    const at = xOfDay('2026-01-06')
    const y = midYOfRow('g1')
    const answer = gestureAction(pointerOf('down', at, y), pointerOf('up', at, y), TASK_1_HIT)
    expect(commandsOf(answer)).toHaveLength(0)
    expect(commandFromInput(keyOf('A', { ctrl: true }), contextOf()).action).toBeNull()
  })

  it('UN-9: an input with no effect on the selection gives back the same value', () => {
    const held = selectionWith(emptySelection(), { kind: 'task', uid: 1 })
    const context = contextOf({ selection: held })
    for (const input of [keyOf('S', { ctrl: true }), keyOf('F11'), wheelOf(300, 300, 1)]) {
      expect(selectionFromInput(input, context), JSON.stringify(input)).toBe(held)
    }
  })

  it('walks 表 T-023c and records where each row is answered', () => {
    const here = ['SL-1', 'SL-2', 'SL-3', 'SL-4', 'SL-5', 'SL-6', 'SL-7', 'SL-7a', 'SL-7b']
    const drawing = ['SL-8']
    for (const row of T_023C) {
      expect(here.includes(row) || drawing.includes(row), row).toBe(true)
    }
    expect(here).toHaveLength(9)
    expect(drawing).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 表 T-023d -- the grab areas
// ---------------------------------------------------------------------------

describe('表 T-023d -- what a grab does', () => {
  /** The rows whose operation the published vocabulary can already express. */
  const ROUTED: Readonly<Record<string, string>> = {
    'GR-3': 'setTaskPlanDates',
    'GR-4': 'setTaskPlanDates',
    'GR-7': 'cycleTaskPlanActualState',
    // FR-043's three faint dummies all place the same three columns, so all
    // three rows route to CM-14. TASK_1 carries no actual, which is the state
    // 「`Task` が未着手であるあいだ」 names.
    'GR-9': 'beginTaskActual',
    'GR-17': 'beginTaskActual',
    'GR-18': 'beginTaskActual',
    'GR-12': 'setTaskPlanDates',
    'GR-16': 'setStatusDate',
  }

  const itemFor = (row: string): Hit['item'] =>
    row === 'GR-16'
      ? { kind: 'statusLine' }
      : row === 'GR-13'
        ? { kind: 'dependency', predecessorUid: 1, successorUid: 2 }
        : row === 'GR-14'
          ? { kind: 'commentBox', id: 'c1' }
          : { kind: 'task', taskUid: 1 }

  it('walks 表 T-023d: every row answers with a value, and the routed ones name their command', () => {
    for (const row of T_023D) {
      // GR-19 grabs the `Command Palette`'s band, which is no `Item` of table
      // T-023c's SL-1 and so cannot arrive as a `Hit` at all. FR-053's drag is
      // covered by its own cases; what this walk is about is the schedule.
      if (row === 'GR-19') continue
      const hit = hitOf(itemFor(row), row as Hit['grab'])
      const from = pointerOf('down', xOfDay('2026-01-07'), midYOfRow('g1'))
      const to = pointerOf('up', xOfDay('2026-01-14'), midYOfRow('g1'))
      let answer: TranslatedInput | null = null
      expect(() => {
        answer = gestureAction(from, to, hit)
      }, row).not.toThrow()
      expect(answer, row).not.toBeNull()
      const routed = ROUTED[row]
      if (routed !== undefined) {
        expect(kindsOf(answer as unknown as TranslatedInput), row).toContain(routed)
      }
    }
  })

  it('GR-9 / GR-17 / GR-18 (FR-043): a release on any dummy asks for exactly one CM-14', () => {
    // FR-043 (MUST): 「実績の入力を始める掴みシロを 2 つ…実績の開始点と終了点と
    // して薄くタスクの上に示し、どちらが掴まれたときも実績開始日と実績期間
    // （`actualDuration`）と `resumeValid`（`true`）を置くこと」。One placement
    // whichever handle was taken, so ONE command -- and it carries no day:
    // 「開始点を掴んだときは終了点をその既定の位置で、終了点を掴んだときは開始点
    // を予定の開始日で確定させること（MUST）」 fixes both ends from the plan and
    // `S-129` / `S-130`, never from where the pointer was let go.
    // ⚠️ Table T-028's IN-1 settles a pointer operation on the release, so the
    // gesture below is press then up.
    for (const row of ['GR-9', 'GR-17', 'GR-18'] as const) {
      const answer = gestureAction(
        pointerOf('down', xOfDay('2026-01-05'), midYOfRow('g1')),
        // Let go on a different day from the press, so a translator that read
        // the drop day into the command would be seen doing it.
        pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1')),
        hitOf({ kind: 'task', taskUid: 1 }, row),
      )
      const commands = commandsOf(answer)
      expect(commands, row).toHaveLength(1)
      expect(commands[0], row).toEqual({ kind: 'beginTaskActual', uid: 1 })
    }
  })

  // FINDING (left failing). The unit answers nothing for GR-1 and GR-2, and
  // the note that records why says the derivation 「is not in any table of the
  // specification」. ⛔ IT IS, in table T-023d's own closing rules, three
  // paragraphs under the table the note names among what it searched:
  //
  //   「**`GR-1` / `GR-2` の日数は、ポインタの下の日から求めること（MUST）。**
  //     `GR-1` は `start` からの日数、`GR-2` は `end` までの日数とし、**いずれも
  //     1 日単位に四捨五入する。** **得た日数は 表 T-012a の `FD-6` で切り詰める
  //     こと（MUST）。**」
  //
  // And the vocabulary is already there: `edit-task.ts` publishes CM-16
  // `setTaskFadeInDays` and CM-17 `setTaskFadeOutDays`, both taking a number of
  // days. FR-075 (MUST) hands the author these two points 「作成者がその日数を…
  // 編集できるようにすること」, so a release that produces no command leaves the
  // one path to a fade shut -- which is the same shape of defect PD-191 was
  // raised for, one step further along.
  //
  // ⚠️ The sample keeps to one week (Monday 2026-01-05 to Wednesday 2026-01-07)
  // so that 「日数」 is 2 whether the count is calendar days or worked days --
  // the two readings are not separated anywhere, and this case does not need
  // them to be.
  it('GR-1 / GR-2 (FR-075, MUST): a corner dragged two days along sets the fade days', () => {
    const twoDaysIn = xOfDay('2026-01-07')
    const fadeIn = gestureAction(
      pointerOf('down', xOfDay('2026-01-05'), midYOfRow('g1')),
      pointerOf('up', twoDaysIn, midYOfRow('g1')),
      hitOf({ kind: 'task', taskUid: 1 }, 'GR-1'),
    )
    expect(commandsOf(fadeIn)).toEqual([{ kind: 'setTaskFadeInDays', uid: 1, days: 2 }])

    const fadeOut = gestureAction(
      pointerOf('down', xOfDay('2026-01-09'), midYOfRow('g1')),
      pointerOf('up', twoDaysIn, midYOfRow('g1')),
      hitOf({ kind: 'task', taskUid: 1 }, 'GR-2'),
    )
    expect(commandsOf(fadeOut)).toEqual([{ kind: 'setTaskFadeOutDays', uid: 1, days: 2 }])
  })

  it('GR-3: dragging the left end moves `start` to the day it was dropped on', () => {
    const answer = gestureAction(
      pointerOf('down', placementOf(1).x, midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-02'), midYOfRow('g1')),
      hitOf({ kind: 'task', taskUid: 1 }, 'GR-3'),
    )
    const moved = oneCommand(answer, 'setTaskPlanDates')
    expect(String(moved['start']).slice(0, 10)).toBe('2026-01-02')
    expect(String(moved['finish']).slice(0, 10)).toBe('2026-01-09')
  })

  it('GR-4: dragging the right end moves `finish` only', () => {
    const answer = gestureAction(
      pointerOf('down', placementOf(1).x + placementOf(1).width, midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-15'), midYOfRow('g1')),
      hitOf({ kind: 'task', taskUid: 1 }, 'GR-4'),
    )
    const moved = oneCommand(answer, 'setTaskPlanDates')
    expect(String(moved['start']).slice(0, 10)).toBe('2026-01-05')
    expect(String(moved['finish']).slice(0, 10)).toBe('2026-01-15')
  })

  it('GR-12 / FR-011 (MUST): a body drag shifts the plan and keeps its length', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-09'), midYOfRow('g1')),
      TASK_1_HIT,
    )
    const moved = oneCommand(answer, 'setTaskPlanDates')
    const start = serialOf(String(moved['start']).slice(0, 10))
    const finish = serialOf(String(moved['finish']).slice(0, 10))
    expect(finish - start).toBe(serialOf('2026-01-09') - serialOf('2026-01-05'))
    expect(start - serialOf('2026-01-05')).toBe(3)
  })

  it('GR-12 / FR-011 (MUST NOT): a body drag never writes an actual date', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g2')),
      TASK_1_HIT,
    )
    for (const forbidden of ACTUAL_WRITERS) expect(kindsOf(answer)).not.toContain(forbidden)
  })

  it('GR-12 / HM-3 of 表 T-015a: a vertical body drag transplants the row', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-06'), midYOfRow('g4')),
      TASK_1_HIT,
    )
    const moved = oneCommand(answer, 'moveTaskToTaskGroup')
    expect(moved['uid']).toBe(1)
    expect(moved['groupId']).toBe('g4')
  })

  it('GR-12: a body drag that stays on its row asks for no transplant', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1')),
      TASK_1_HIT,
    )
    expect(kindsOf(answer)).not.toContain('moveTaskToTaskGroup')
  })

  it('GR-7 / FR-013: pressing the progress marker cycles the state', () => {
    const at = xOfDay('2026-01-10')
    const y = midYOfRow('g1')
    const answer = gestureAction(
      pointerOf('down', at, y),
      pointerOf('up', at, y),
      hitOf({ kind: 'task', taskUid: 1 }, 'GR-7'),
    )
    expect(oneCommand(answer, 'cycleTaskPlanActualState')['uid']).toBe(1)
  })

  it('GR-16 / FR-046 (MUST): dragging the status line makes `statusDate` follow', () => {
    const answer = gestureAction(
      pointerOf('down', xOfDay('2026-01-10'), midYOfRow('g1')),
      pointerOf('up', xOfDay('2026-01-22'), midYOfRow('g1')),
      hitOf({ kind: 'statusLine' }, 'GR-16'),
    )
    expect(String(oneCommand(answer, 'setStatusDate')['date']).slice(0, 10)).toBe('2026-01-22')
  })
})

// ---------------------------------------------------------------------------
// MK-13 -- the double click
// ---------------------------------------------------------------------------

describe('MK-13 of 表 T-023 -- the double click', () => {
  const doubleClickOn = (hit: Hit): TranslatedInput => {
    const at = xOfDay('2026-01-06')
    const y = midYOfRow('g1')
    return gestureAction(
      pointerOf('down', at, y, { clickCount: 2 }),
      pointerOf('up', at, y, { clickCount: 2 }),
      hit,
    )
  }

  it('the name label opens the name for editing', () => {
    const action = doubleClickOn(hitOf({ kind: 'task', taskUid: 1 }, 'GR-10')).action
    expect(action?.kind).toBe('editInPlace')
    if (action !== null && action.kind === 'editInPlace') {
      expect(action.target).toEqual({ kind: 'taskName', uid: 1 })
    }
  })

  // ⛔ THIS CASE USED TO SAY 「the task body opens the properties panel」. That
  // rule is gone (利用者の裁定 2026-08-27). MK-13 now folds the two places into
  // ONE entry -- 「タスク（名称ラベルと本体のどちらでも） ＝ 名称の編集」 -- and
  // the same row forbids the route the old expected value named:
  //   「⛔ **プロパティパネルを開く経路を本行に置いてはならない（MUST NOT）**
  //     …**パネルの中身は `FR-072` が「最後に行われた操作」で決めており、選ぶ
  //     操作がすでにその操作である。**」
  // FR-072 is where the panel's contents are settled instead: 「プロパティパネル
  // に出す中身を**最後に行われた操作**で決めること」 -- no input has to ask.
  // ⚠️ The body is GR-12 of 表 T-023d, and the closing rule under that table
  // says 「ダブルクリックの宛先は本表の順をそのまま使う」, so the hit this case
  // hands in is the one a double click on the bar really arrives with.
  it('the task body opens the SAME name for editing (MK-13, one entry)', () => {
    const action = doubleClickOn(TASK_1_HIT).action
    expect(action?.kind).toBe('editInPlace')
    if (action !== null && action.kind === 'editInPlace') {
      expect(action.target).toEqual({ kind: 'taskName', uid: 1 })
    }
  })

  // MK-13 assigns the name edit to a DOUBLE click. A bare press on the same
  // body is PD-3 of 表 T-023a and MK-8 of 表 T-023 -- 「そのものへの操作」, which
  // for a press that goes nowhere is the selection (SL-2 of 表 T-023c).
  // ⛔ WHAT THIS CASE USED TO SAY -- that a single click does not open the
  // properties panel -- states no rule any more: MK-13 forbids that route to
  // the double click too, so no press of any count can open it. What survives
  // is the distinction the case was really drawing, between one click and two.
  it('a single click on the same body does not open the name for editing', () => {
    const at = xOfDay('2026-01-06')
    const y = midYOfRow('g1')
    const answer = gestureAction(pointerOf('down', at, y), pointerOf('up', at, y), TASK_1_HIT)
    expect(answer.action?.kind).not.toBe('editInPlace')
  })
})

// ---------------------------------------------------------------------------
// 表 T-027 -- what still travels as a command, and what does not
// ---------------------------------------------------------------------------

describe('表 T-027 -- undo carries the document, not the view', () => {
  it('walks the four rows this unit answers', () => {
    for (const row of T_027_HERE) {
      switch (row) {
        case 'UN-8': {
          // Zoom, scroll and pan are outside undo yet are saved settings, so
          // they still reach the document as commands.
          const zoom = commandFromInput(keyOf('+', { shift: true }), contextOf())
          expect(kindsOf(zoom), row).toContain('setZoom')
          const scroll = commandFromInput(
            wheelOf(REGIONS.rowArea.x + 20, REGIONS.rowArea.y + 20, 1),
            contextOf(),
          )
          expect(kindsOf(scroll), row).toContain('setScrollPosition')
          break
        }
        case 'UN-9': {
          expect(commandFromInput(keyOf('A', { ctrl: true }), contextOf()).action, row).toBeNull()
          break
        }
        case 'UN-11': {
          const armed = screenStateWithArmed(emptyScreenState(), { kind: 'highlightBox' })
          const context = contextOf({ screenState: armed })
          expect(commandFromInput(keyOf('Esc'), context).action, row).toBeNull()
          expect(screenStateFromInput(keyOf('Esc'), context).armed.kind, row).toBe('none')
          break
        }
        case 'UN-16': {
          // Panel widths, pins and the PNG scale have no entrance here; the
          // row is recorded so the walk covers it.
          expect(kindsOf(commandFromInput(keyOf('F'), contextOf())), row).not.toContain(
            'setPanelWidths',
          )
          break
        }
      }
    }
  })

  it('LY-1: an input with no effect on the screen gives back the same state', () => {
    const state = screenStateWithPalette(emptyScreenState(), false)
    const context = contextOf({ screenState: state })
    for (const input of [keyOf('S', { ctrl: true }), keyOf('Delete'), wheelOf(300, 300, 1)]) {
      expect(screenStateFromInput(input, context), JSON.stringify(input)).toBe(state)
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-029a の DC-5 -- the Dual Cursor refuses creation, movement and editing
// ---------------------------------------------------------------------------

describe('DC-5 of 表 T-029a / PD-2 -- the Dual Cursor mode is exclusive', () => {
  const dual = { dualCursorFollowing: 'date1' as const }

  it('refuses to create, move or edit while the mode is up (MUST NOT)', () => {
    const armed = screenStateWithArmed(emptyScreenState(), {
      kind: 'taskShape',
      shapeKind: 'rectangle',
    })
    const cases: readonly TranslatedInput[] = [
      gestureAction(
        pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1')),
        pointerOf('up', xOfDay('2026-01-13'), midYOfRow('g1')),
        TASK_1_HIT,
        dual,
      ),
      gestureAction(
        pointerOf('down', xOfDay('2026-01-04'), midYOfRow('g3')),
        pointerOf('up', xOfDay('2026-01-11'), midYOfRow('g3')),
        null,
        { ...dual, screenState: armed },
      ),
      gestureAction(
        pointerOf('down', xOfDay('2026-01-06'), midYOfRow('g1'), { clickCount: 2 }),
        pointerOf('up', xOfDay('2026-01-06'), midYOfRow('g1'), { clickCount: 2 }),
        hitOf({ kind: 'task', taskUid: 1 }, 'GR-10'),
        dual,
      ),
    ]
    for (const answer of cases) {
      for (const forbidden of ['createTask', 'setTaskPlanDates', 'setTaskName']) {
        expect(kindsOf(answer), forbidden).not.toContain(forbidden)
      }
      expect(answer.action?.kind).not.toBe('editInPlace')
    }
  })

  it('IN-4: the mode is the last level Esc consumes', () => {
    const context = contextOf({ ...dual })
    // Nothing else is up, so this Esc is consumed by the mode and does not
    // reach the browser (IN-4a's exception).
    expect(commandFromInput(keyOf('Esc'), context).isBrowserDefaultStopped).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The three entrances of the `Row Title Panel` (U-22) -- IC-58 / IC-59 / IC-60
// of table T-109, whose rules are HF-1 / HF-2 / HF-3 of table T-051 and FR-098.
//
// The note under table T-023a keeps the press decision order off this panel, so
// none of these cases is about one of the six gestures: what the surface drew
// is read first (`PointerPress.on`), and the row it drew the control against
// arrives as `ScreenPart.rowGroupId`.
// ---------------------------------------------------------------------------

/** table T-109 -- the three rows that table stands on the `Row Title Panel`. */
const T_109_ROW_PANEL = [
  { row: 'IC-58', rule: 'HF-2' },
  { row: 'IC-59', rule: 'HF-3' },
  { row: 'IC-60', rule: 'FR-098' },
] as const

/** table T-051 -- the rows about the two folding controls. */
const T_051_CONTROLS = ['HF-1', 'HF-2', 'HF-3'] as const

/** table T-015 -- the folding operations HF-2 and HF-3 are measured against. */
const T_015_FOLDS = ['HR-2', 'HR-3', 'HR-4', 'HR-5'] as const

/**
 * A chain three deep beside a second root, so that "one level" and "all of
 * them" cannot answer the same list, and so that a subtree which is NOT the
 * pressed row's has something in it to be left alone.
 */
const NEST_ROWS = [
  { id: 'n1', parentId: null as string | null, order: 0 },
  { id: 'n1a', parentId: 'n1' as string | null, order: 1 },
  { id: 'n1a1', parentId: 'n1a' as string | null, order: 2 },
  { id: 'n2', parentId: null as string | null, order: 3 },
  { id: 'n2a', parentId: 'n2' as string | null, order: 4 },
] as const

const nestedScheduleOf = (collapsed: Readonly<Record<string, boolean>>): Schedule =>
  scheduleOf({
    tasks: [TASK_1],
    taskGroups: NEST_ROWS.map((one) => ({
      id: one.id,
      parentId: one.parentId,
      label: one.id,
      derivedFromTaskUid: null,
      order: one.order,
      isCollapsed: collapsed[one.id] ?? false,
      isHidden: null,
      color: null,
      height: null,
    })),
    taskGroupMembers: [{ groupId: 'n1a1', taskUid: 1 }],
  })

/** S-126 is where FR-098 keeps what is pinned, so a case sets it there. */
const nestedSettingsOf = (pinned: readonly string[]): DocumentSettings =>
  settingsOf({
    scrollDate: '2026-01-01',
    scrollGroupId: 'n1',
    stackDirection: 'down',
    rulerHeight: 48,
    rulerFont: 12,
    pinnedGroupIds: pinned,
  })

function panelContextOf(
  collapsed: Readonly<Record<string, boolean>> = {},
  pinned: readonly string[] = [],
): InputContext {
  const schedule = nestedScheduleOf(collapsed)
  const settings = nestedSettingsOf(pinned)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  return contextOf({
    document: documentOf(schedule, settings),
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
  })
}

/** A point on the panel. The surface answered for it, so no coordinate decides. */
const PANEL_AT = { x: 20, y: 200 }

/** IN-1 settles a pointer operation on release, so a press is down then up. */
function pressPanelEntry(
  entry: string,
  rowGroupId: string | null,
  context: InputContext,
): TranslatedInput {
  const down = pointerOf('down', PANEL_AT.x, PANEL_AT.y)
  const pressed = {
    at: down,
    hit: null,
    on: {
      // U-23 (MUST): an entrance for an operation is named by the panel.
      part: 'Row Title Panel',
      entry,
      format: null,
      rowGroupId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    },
    pressRow: pressRowOf({ at: down, hit: null }, context),
  }
  return commandFromInput(
    pointerOf('up', PANEL_AT.x, PANEL_AT.y),
    contextOf({ ...context, pressed }),
  )
}

type FoldCommand = Extract<DocumentCommand, { kind: 'setTaskGroupCollapsed' }>

const foldsOf = (answer: TranslatedInput): readonly FoldCommand[] =>
  commandsOf(answer).filter((one): one is FoldCommand => one.kind === 'setTaskGroupCollapsed')

/** The rows one press asks to be folded the given way. */
const rowsFolded = (answer: TranslatedInput, collapsed: boolean): readonly string[] =>
  foldsOf(answer)
    .filter((one) => one.collapsed === collapsed)
    .map((one) => one.groupId)

describe('HF-1 / HF-2 / HF-3 of table T-051 and FR-098 -- the Row Title Panel entrances', () => {
  it('walks the rows these cases are driven by, with no repeats', () => {
    expect(T_109_ROW_PANEL).toHaveLength(3)
    expect(new Set(T_109_ROW_PANEL.map((one) => one.row)).size).toBe(3)
    expect(T_051_CONTROLS).toHaveLength(3)
    expect(T_015_FOLDS).toHaveLength(4)
    expect(NEST_ROWS).toHaveLength(5)
  })

  it('HF-1: the opening side and the closing side are two controls, not one in two states', () => {
    // Same row, same document, two entrances: the answers differ. One control
    // in two states could only ever give one answer here.
    const open = panelContextOf()
    expect(commandsOf(pressPanelEntry('IC-58', 'n1', open))).not.toEqual(
      commandsOf(pressPanelEntry('IC-59', 'n1', open)),
    )

    // ONE MAY BE SPENT WHILE THE OTHER IS NOT. However the rows stand, the
    // opening side never asks for a fold and the closing side never asks for an
    // unfold -- so on a subtree already open the closer has work and the opener
    // has none, and on one already shut it is the other way round.
    const shut = panelContextOf({ n1: true, n1a: true })
    expect(rowsFolded(pressPanelEntry('IC-58', 'n1', open), true)).toEqual([])
    expect(rowsFolded(pressPanelEntry('IC-58', 'n1', shut), true)).toEqual([])
    expect(rowsFolded(pressPanelEntry('IC-59', 'n1', open), false)).toEqual([])
    expect(rowsFolded(pressPanelEntry('IC-59', 'n1', shut), false)).toEqual([])

    expect(rowsFolded(pressPanelEntry('IC-59', 'n1', open), true).length).toBeGreaterThan(0)
    expect(rowsFolded(pressPanelEntry('IC-58', 'n1', shut), false).length).toBeGreaterThan(0)
  })

  it('HF-2: the opening side opens the WHOLE subtree -- HR-3 of table T-015', () => {
    // HF-2 (MUST): 「開く操作子は、その行の配下をすべて開くこと」—— 表 T-015 の
    // `HR-3`（「選択した `TaskGroup` の配下をすべて開く」）である。
    // ⚠️ 「1 段だけ開く」 was the rule until 2026-08-25; HF-2 itself records
    // that it was retired because nothing then re-opened what HF-3 folded.
    const shut = panelContextOf({ n1: true, n1a: true, n1a1: true })
    const answer = pressPanelEntry('IC-58', 'n1', shut)

    // 配下 is every row under it, however deep -- not one level.
    expect(rowsFolded(answer, false)).toContain('n1a')
    expect(rowsFolded(answer, false)).toContain('n1a1')
    // ⛔ THE PRESSED ROW IS NOT ITSELF OPENED. HF-3 says the pair plainly:
    // 「畳んだ行は、1 つ上の行の開く操作子が開く」, and HF-10 exists only
    // because 「最上位の行が自分を畳むと、それを開く操作子がどこにも無くなる」
    // -- which is false if a row's own opening control reaches itself.
    expect(rowsFolded(answer, false)).not.toContain('n1')
    // A second root is under no part of the pressed row.
    expect(rowsFolded(answer, false)).not.toContain('n2')
    expect(rowsFolded(answer, false)).not.toContain('n2a')
  })

  it('HF-3: the closing side folds THIS row alone -- HR-5 of table T-015', () => {
    // HF-3 (MUST): 「閉じる操作子は、その行自身を畳むこと」—— 表 T-015 の
    // `HR-5`（「選択した `TaskGroup` を閉じる」）である。
    // ⚠️ 「配下をすべて閉じる」 is HR-4, and table T-109 gives HR-4 no entrance.
    const open = panelContextOf()
    const answer = pressPanelEntry('IC-59', 'n1', open)
    const closed = rowsFolded(answer, true)

    expect(closed).toEqual(['n1'])
    // ⛔ THE SUBTREE IS NOT FOLDED -- that would be HR-4. HR-1a already hides
    // 「畳んだ `TaskGroup` の配下の行」, so folding them too changes no picture.
    expect(closed).not.toContain('n1a')
    expect(closed).not.toContain('n1a1')
    // A second root and its child are under no part of the pressed row.
    expect(closed).not.toContain('n2')

    // THE TWO SIDES CANNOT BE TOLD APART BY DIRECTION ALONE. HF-3 names one row
    // and HF-2 names the whole depth, so the counts must differ too -- and it
    // is now the OPENING side that carries the larger list.
    const shut = panelContextOf({ n1: true, n1a: true, n1a1: true })
    expect(rowsFolded(pressPanelEntry('IC-58', 'n1', shut), false).length).toBeGreaterThan(
      closed.length,
    )
  })

  it('FR-031: what HF-2 asks for arrives as ONE undo step, not one per row', () => {
    // ⚠️ THE MANY-ROW SIDE IS NOW HF-2. Until 2026-08-25 the closing control
    // was HR-4 and this case pressed IC-59; HF-3 is HR-5 and writes exactly one
    // row, so it can no longer tell one step from one step per row. HF-2 is
    // HR-3 and reaches the whole subtree, so the question lives here.
    const shut = panelContextOf({ n1: true, n1a: true, n1a1: true })
    const answer = pressPanelEntry('IC-58', 'n1', shut)
    const action = answer.action
    expect(action?.kind).toBe('changeDocument')
    if (action === null || action.kind !== 'changeDocument') throw new Error('not a change')

    // WS-4 of table T-067 pushes one step per write, so one step is one write.
    expect(action.writes).toHaveLength(1)
    // Not enough on its own: one write carrying one row would pass that and
    // still be one step per row. The unfold really does reach several rows.
    expect(action.writes[0]?.length).toBeGreaterThan(1)
  })

  it('FR-098: the SAME entrance pins and unpins, read from the document', () => {
    const notPinned = panelContextOf({}, [])
    const pinned = panelContextOf({}, ['n1'])

    expect(kindsOf(pressPanelEntry('IC-60', 'n1', notPinned))).toEqual(['pinTaskGroup'])
    expect(oneCommand(pressPanelEntry('IC-60', 'n1', notPinned), 'pinTaskGroup').groupId).toBe('n1')

    expect(kindsOf(pressPanelEntry('IC-60', 'n1', pinned))).toEqual(['unpinTaskGroup'])
    expect(oneCommand(pressPanelEntry('IC-60', 'n1', pinned), 'unpinTaskGroup').groupId).toBe('n1')
  })

  it('FR-098: which way it goes is read from S-126, so a stale frame cannot pin twice', () => {
    // A picture drawn before the row was pinned would send the same entrance
    // again; the document says the row is already there, so the answer is the
    // release and never a second pinTaskGroup.
    const alreadyPinned = panelContextOf({}, ['n2', 'n1'])
    expect(kindsOf(pressPanelEntry('IC-60', 'n1', alreadyPinned))).toEqual(['unpinTaskGroup'])

    // The same document, a row that is not in S-126: that one pins.
    expect(kindsOf(pressPanelEntry('IC-60', 'n1a', alreadyPinned))).toEqual(['pinTaskGroup'])
  })

  it('MK-10: a press these entrances answered keeps the browser out of it (MUST)', () => {
    // Each of the three is assigned here -- the row is named and the document
    // says which way it goes -- so the browser's own behaviour is stopped.
    const cases = [
      // ⚠️ THE ROW ITSELF IS NOT WHAT IC-58 OPENS -- HF-2 is HR-3 and reaches
      // 配下 only, so the state that gives it work is a folded DESCENDANT.
      // `{ n1: true }` left it nothing to do and the press stopped being one
      // this tool answered.
      pressPanelEntry('IC-58', 'n1', panelContextOf({ n1a: true })),
      pressPanelEntry('IC-59', 'n1', panelContextOf()),
      pressPanelEntry('IC-60', 'n1', panelContextOf({}, [])),
      pressPanelEntry('IC-60', 'n1', panelContextOf({}, ['n1'])),
    ]
    for (const answer of cases) {
      expect(answer.action, JSON.stringify(kindsOf(answer))).not.toBeNull()
      expect(answer.isBrowserDefaultStopped, JSON.stringify(kindsOf(answer))).toBe(true)
    }
  })

  it('a press carrying no row answers nothing at all', () => {
    // `rowGroupId` is null wherever the point is on no row. All three commands
    // are keyed by the row, so there is nothing to plan.
    const context = panelContextOf()
    for (const one of T_109_ROW_PANEL) {
      expect(pressPanelEntry(one.row, null, context).action, one.row).toBeNull()
    }
  })
})


