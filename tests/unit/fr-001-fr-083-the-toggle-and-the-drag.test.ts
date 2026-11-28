// Unit tests: the palette entrance is a toggle, and a bar-shaped task needs a drag.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressedRowOf,
  NOT_STORED_TASK_GROUP_GRAB_SIZES,
  type HumanInput,
  type InputAction,
  type InputContext,
  type InputModifiers,
  type PointerButton,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { screenEventFromInput } from '../../src/adapter/input-command-translator/screen-state-input'
import type {
  DisplayLanguage,
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { FieldEditNotice } from '../../src/adapter/screen-renderer/screen-surface'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionOfAll,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  advanceScreenSession,
  type ScreenValues,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the dictionary and the document are read as untyped JSON */

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const SP_4_DOES_NOT_TURN_ON_THE_SELECTION = '構えている入口を再び押したとき、`GRS` は、選択の有無によらず構えを解除すること（表 T-023b の注）。'

const SP_4_DISARM_IS_NOT_REFUSED_FOR_A_SELECTION =
  '`GRS` は、選択が在ることを理由に `SP-4` の解除を拒まないこと。'

const T_023B_THE_REPRESS_MEANS_THE_SAME =
  '`GRS` は、選んでいるものの有無で、パレットの同じ入口の再押下の意味を変えないこと。'

const EVERY_TASK_GROUP_ARMS_THE_PRESSED_SHAPE = '構えている入口ではない入口を押したとき、`GRS` は、選択の有無によらず押した入口の形状を構えること。'

// Spec: IMPS-1891
const ARMING_IS_NOT_REFUSED_FOR_A_SELECTION =
  '`GRS` は、選んでいるものが在ることを理由に構えを拒まないこと。'

const FR_083_THE_ARMING_STANDS_THROUGH_A_REFUSAL =
  'もし `GRS` が形状の変更を拒んだ場合（`CM-20`）、`GRS` は押した入口の形状を構えること。'

const BAR_SHAPE_DRAG_MAKES_THE_SPAN =
  'バーの形状（表 T-012 の `SH-1` 〜 `SH-4`）を構えている間、ドラッグしたとき、`GRS` は引いた期間のタスクを作ること。'

const FR_001_A_CLICK_MAKES_NO_BAR_TASK =
  '`GRS` は、クリックではバーの形状のタスクを作らないこと。'

// Why: TC-8 carries RS-53 and leaves showing it to the T-233 display column (FR-076).
const FR_001_TELLS_IT_MADE_NOTHING =
  'もしクリックでバーの形状のタスクを作らなかった場合、`GRS` は、作らなかった理由として 表 T-233 の `RS-53` を `FR-029` の運び方で運ぶこと。'

const MILESTONE_IS_PLACED_BY_A_PRESS_ALONE =
  'マイルストーンの形状を構えている間、押したとき、`GRS` は押しただけでマイルストーンを置くこと。'

const MILESTONE_LANDS_ON_THE_PRESSED_POINT =
  'マイルストーンの形状を構えている間、引いたとき、`GRS` は押した点にマイルストーンを置くこと。'

const MILESTONE_IS_NOT_REFUSED_FOR_A_DRAG =
  '`GRS` は、引いたことを理由にマイルストーンを置く操作を拒まないこと。'

const PD_4_DRAWS_WHAT_WOULD_BE_PLACED =
  '押している間、`GRS` は、置くことになる姿を、表 T-023d の閉じの規則と同じ作法で描くこと。'

const PD_4_STRETCHES_THE_WAY_THE_POINTER_WENT =
  '`GRS` は、置くことになる姿を、引いた向きへ伸ばすこと。'

const PD_4_THE_DRAFT_IS_THE_ARMED_SHAPE =
  '`GRS` は、置くことになる姿を、構えているタスクグループが 表 T-012 で持つ形状だけで描くこと。'

const PD_4_NO_OTHER_SHAPE_IS_DRAWN =
  '構えているタスクグループが 表 T-012 で持つ形状だけで描くこと'

const PD_4_THE_SHAPE_IS_NOT_KEPT_IN_TWO_PLACES =
  '`GRS` は、形状を 2 か所に持たせないこと。'

const PD_4_NOTHING_IS_WRITTEN_WHILE_HELD =
  '押している間、`GRS` は値を文書へ書かないこと（`FR-031`）。'

const FR_091_ONE_PRESS_CLOSES_AND_LETS_GO =
  '作った直後の名称を `Enter` で確定したとき、`GRS` は、同じ 1 回の押下でプロパティパネルを閉じること。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-083 SP-4 (MUST) -- the re-press does not turn on the selection', SP_4_DOES_NOT_TURN_ON_THE_SELECTION],
  ['FR-083 SP-4 (MUST NOT) -- the disarm is not refused for a selection', SP_4_DISARM_IS_NOT_REFUSED_FOR_A_SELECTION],
  ['T-023b (MUST NOT) -- a re-press means the same thing either way', T_023B_THE_REPRESS_MEANS_THE_SAME],
  ['FR-083 (MUST) -- every row of the table arms the pressed shape', EVERY_TASK_GROUP_ARMS_THE_PRESSED_SHAPE],
  ['FR-083 (MUST NOT) -- arming is not refused for a selection', ARMING_IS_NOT_REFUSED_FOR_A_SELECTION],
  ['FR-083 (MUST) -- the arming stands even when the shape change is refused', FR_083_THE_ARMING_STANDS_THROUGH_A_REFUSAL],
  ['FR-001 (MUST) -- a bar shape dragged makes a task of the span drawn', BAR_SHAPE_DRAG_MAKES_THE_SPAN],
  ['FR-001 (MUST NOT) -- a click makes no bar-shaped task', FR_001_A_CLICK_MAKES_NO_BAR_TASK],
  ['FR-001 TC-8 (MUST) -- the reason nothing was made is carried', FR_001_TELLS_IT_MADE_NOTHING],
  ['FR-001 (MUST) -- a milestone is placed by a press alone', MILESTONE_IS_PLACED_BY_A_PRESS_ALONE],
  ['FR-001 (MUST) -- a dragged milestone lands on the pressed point', MILESTONE_LANDS_ON_THE_PRESSED_POINT],
  ['FR-001 (MUST NOT) -- a milestone is not refused for having been dragged', MILESTONE_IS_NOT_REFUSED_FOR_A_DRAG],
  ['T-023a PTD-4 (MUST) -- the held press draws what it would place', PD_4_DRAWS_WHAT_WOULD_BE_PLACED],
  ['T-023a PTD-4 (MUST) -- the draft stretches the way the pointer went', PD_4_STRETCHES_THE_WAY_THE_POINTER_WENT],
  ['T-023a PTD-4 (MUST) -- the draft is the armed row of table T-012', PD_4_THE_DRAFT_IS_THE_ARMED_SHAPE],
  ['T-023a PTD-4 (MUST NOT) -- no other shape is drawn', PD_4_NO_OTHER_SHAPE_IS_DRAWN],
  ['T-023a PTD-4 (MUST NOT) -- the shape is not kept in two places', PD_4_THE_SHAPE_IS_NOT_KEPT_IN_TWO_PLACES],
  ['T-023a PTD-4 (MUST NOT) -- nothing is written to the document while held', PD_4_NOTHING_IS_WRITTEN_WHILE_HELD],
  ['FR-091 (MUST) -- one press closes the panel and lets that selection go', FR_091_ONE_PRESS_CLOSES_AND_LETS_GO],
  ['FR-091 (MUST) -- one press closes the panel and lets that selection go', '作った直後の名称を `Enter` で確定したとき、`GRS` は、同じ 1 回の押下で作ったタスクの選択を解除すること。'],
]

describe('the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    // Why: this keeps the copies above honest: a reworded clause takes this case red, so
    // the copy and the case that presses it move too.
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    // Why: two constants that were one quote would hold one clause while the list claims
    // two.
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const ARM_COLUMN = '構え'
const WHAT_COLUMN = '何の入口か'
const SURFACE_COLUMN = '面'
const VALUE_COLUMN = '値'

// Spec: T-023b, AR-2, AR-3
const TASK_SHAPE_ARM = 'AR-2'
const MILESTONE_ARM = 'AR-3'

interface Entrance {
  readonly row: string
  readonly surface: string
}

// Spec: T-109, T-012
function entranceArming(arm: string, shapeRow: string): Entrance {
  const found = specTable('T-109').rows.filter(
    (row) =>
      bare(row.by[ARM_COLUMN] ?? '') === arm && bare(row.by[WHAT_COLUMN] ?? '') === shapeRow,
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 arms ${shapeRow} from ${found.length} entrances`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
}

const RECTANGLE = entranceArming(TASK_SHAPE_ARM, 'SH-1')
// Why: a different bar shape from the rectangle, so a second press is not a re-press.
const CHEVRON = entranceArming(TASK_SHAPE_ARM, 'SH-2')
// Why: T-109 gives AR-3 many entrances; this takes the first.
const MILESTONE = ((): Entrance => {
  const found = specTable('T-109').rows.filter(
    (row) => bare(row.by[ARM_COLUMN] ?? '') === MILESTONE_ARM,
  )
  if (found.length === 0) throw new Error('table T-109 arms AR-3 from no entrance')
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

function shapeSpelling(specTableRowId: string): string {
  const row = specTable('T-012').rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-012 no longer has row ${specTableRowId}`)
  return bare(row.by[VALUE_COLUMN] ?? '').replace(/'/g, '')
}

const RECTANGLE_SPELLING = shapeSpelling('SH-1')
const CHEVRON_SPELLING = shapeSpelling('SH-2')

// Spec: T-233, RS-53, RS-27, RS-54, RS-10
const RS_53 = 'RS-53'
const RS_27 = 'RS-27'
const RS_54 = 'RS-54'
// Why: RS-10's next step tells the reader to take out the refused change, and a
// palette press holds only one, so RS-54 forbids RS-10 in its place.
const RS_10 = 'RS-10'

function mannerOf(specTableRowId: string): string {
  const row = specTable('T-233').rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-233 no longer has row ${specTableRowId}`)
  return bare(row.cells[1] ?? '')
}

// Spec: FR-038
const wordsOf = (specTableRowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${specTableRowId}`)
  return found.text
}

// Spec: T-206, S-208
const DRAG_THRESHOLD = NOT_STORED_TASK_GROUP_GRAB_SIZES['S-208']

describe('the rows these cases are driven by are still in the manuscript', () => {
  it('⭐ table T-109 arms SH-1, SH-2 and SH-5 from the Command Palette', () => {
    // Why: a second entrance given one of these arms would make every press below
    // ambiguous.
    expect(RECTANGLE.surface).toBe('Command Palette')
    expect(CHEVRON.surface).toBe('Command Palette')
    expect(MILESTONE.surface).toBe('Command Palette')
    expect(new Set([RECTANGLE.row, CHEVRON.row, MILESTONE.row]).size).toBe(3)
  })

  it('⭐ table T-012 still spells SH-1 and SH-2, and they are two spellings', () => {
    expect(RECTANGLE_SPELLING.length).toBeGreaterThan(0)
    expect(CHEVRON_SPELLING.length).toBeGreaterThan(0)
    expect(RECTANGLE_SPELLING).not.toBe(CHEVRON_SPELLING)
  })

  it('⭐ table T-233 holds RS-53, and writes it against NT-1', () => {
    // Why: not NT-3a, which is the manner of an operation that failed; nothing here
    // failed, the press only did not say a span.
    expect(mannerOf(RS_53)).toBe('NT-1')
    expect(wordsOf(RS_53).ja.length).toBeGreaterThan(0)
    expect(wordsOf(RS_53).en.length).toBeGreaterThan(0)
  })

  it('⭐ table T-233 holds RS-54, writes it against NT-1, and it is not RS-10', () => {
    expect(mannerOf(RS_54)).toBe('NT-1')
    expect(wordsOf(RS_54).ja.length).toBeGreaterThan(0)
    expect(wordsOf(RS_54).en.length).toBeGreaterThan(0)
    // Why: if RS-54 and RS-10 had the same words, the section 5 assertions would be
    // vacuous.
    expect(wordsOf(RS_54).ja).not.toBe(wordsOf(RS_10).ja)
    expect(wordsOf(RS_54).en).not.toBe(wordsOf(RS_10).en)
  })

  it('⭐ S-208 reaches src/ as a positive number of pixels', () => {
    expect(DRAG_THRESHOLD).toBeGreaterThan(0)
  })
})

const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontSizeStepSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS: DocumentSettings = {
  ...SETTINGS_DEFAULTS,
  ...NESTED,
  // Why: S-77 and S-78 pinned so that the day drawn at an x is the same every run.
  scrollDate: '2026-01-01',
  scrollTaskGroupId: null,
  // Why: S-58 pinned so every y reads from the top.
  stackDirection: 'down',
} as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

// Why: no task group at all, so a press on empty ground points at no TaskGroup, the
// case FR-001 answers by minting one.
const SCHEDULE = {
  project: {
    calendarUid: null,
    statusDate: null,
    themeHue: 214,
    title: null,
    uidHighWaterMark: 100,
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
} as unknown as Schedule

const DOCUMENT = {
  schemaVersion: '2026-01-01',
  schedule: SCHEDULE,
  documentSettings: SETTINGS,
  documentStamp: {
    scheduleUpdatedAt: '2026-01-01T00:00:00Z',
    lastEditedBy: 'test',
    settingsUpdatedAt: '2026-01-01T00:00:00Z',
  },
  changeLog: [],
} as unknown as Document

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection(), null)

const NEW_GROUP_ID = 'task-group-minted-outside'

const BASE: InputContext = {
  document: DOCUMENT,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
  screen: emptyScreenSession.screen,
  selection: emptySelection(),
  // Why: a stand-in: no case reads S-53, and a figure that is not the manuscript's
  // makes that plain.
  zoomStep: 3,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: '2026-03-01T00:00:00',
  newTaskGroupId: NEW_GROUP_ID,
  newCommentBoxId: 'comment-box-minted-outside',
  newHighlightBoxId: 'highlight-box-minted-outside',
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const partOf = (entrance: Entrance): ScreenPart =>
  ({
    part: entrance.surface,
    entry: entrance.row,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as unknown as ScreenPart

interface Gesture {
  readonly screen: ScreenValues
  readonly action: InputAction | null
}

// Why: down and up are both offered, because IN-1 settles on the release while no
// row says which one an arming lands on; threading both is what a shell does.
function screenAfter(screen: ScreenValues, event: ReturnType<typeof screenEventFromInput>): ScreenValues {
  return event === null
    ? screen
    : advanceScreenSession({ ...emptyScreenSession, screen }, event).state.screen
}

function gesture(options: {
  readonly screen: ScreenValues
  readonly selection?: Selection
  readonly on?: ScreenPart | null
  readonly from: { readonly x: number; readonly y: number }
  readonly to?: { readonly x: number; readonly y: number }
}): Gesture {
  const selection = options.selection ?? emptySelection()
  const on = options.on ?? null
  const to = options.to ?? options.from
  const down = pointer('down', options.from.x, options.from.y)
  const press: PointerPress = {
    at: down,
    hit: null,
    on,
    pressRow: pressedRowOf(
      { at: down, hit: null },
      { screen: options.screen, dualCursorFollowing: null, selection },
    ),
  }
  const atPress: InputContext = {
    ...BASE,
    screen: options.screen,
    selection,
    pressed: press,
  }
  const afterDown = screenAfter(options.screen, screenEventFromInput(down, atPress))
  const up = pointer('up', to.x, to.y)
  const atRelease: InputContext = { ...BASE, screen: afterDown, selection, pressed: press }
  const afterUp = screenAfter(afterDown, screenEventFromInput(up, atRelease))
  const released = commandFromInput(up, atRelease)
  return { screen: afterUp, action: released.action }
}

function pressEntrance(
  entrance: Entrance,
  screen: ScreenValues,
  selection: Selection = emptySelection(),
): ScreenValues {
  return gesture({
    screen,
    selection,
    on: partOf(entrance),
    // Why: any point: the T-023a decision order does not reach a point the screen
    // surface answered for.
    from: { x: 40, y: 200 },
  }).screen
}

const GROUND = { x: 700, y: 400 }

const SOMETHING_SELECTED: Selection = selectionOfAll([{ kind: 'task', uid: 1 }])

function creations(action: InputAction | null): readonly any[] {
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat().filter((one: any) => one.kind === 'createTask')
}

// Why: every arm is held as a child of the composite armed state; this reads the
// arm itself, the child or notArmed.
function armOf(screen: ScreenValues): { readonly kind: string } {
  const state = screen.armModeState
  return state.kind === 'armed' ? state.child : state
}

// Spec: FR-083, T-023a, SP-1, SP-4, T-023b, AR-1, AR-2, AR-3, AR-6
describe('FR-083 SP-1..SP-4 and table T-023b: the entrance is a toggle', () => {
  it('⛔ THE CONTROL: pressing an entrance with nothing armed ARMS it', () => {
    // Why: the control (SP-1): a build that armed nothing would pass every disarm case
    // below, since an arm that never stands is always down.
    const armed = pressEntrance(RECTANGLE, emptyScreenSession.screen)
    expect(armOf(armed).kind).toBe('taskShapeArmed')
    expect((armOf(armed) as any).shapeKind).toBe(RECTANGLE_SPELLING)
  })

  it('⭐ SP-4: pressing the ARMED entrance again puts the arm down', () => {
    // Why: this half of SP-4 held before the ruling too; it is here so the case below
    // isolates the ruling and not the row.
    const once = pressEntrance(RECTANGLE, emptyScreenSession.screen)
    const twice = pressEntrance(RECTANGLE, once)
    expect(twice.armModeState.kind).toBe('notArmed')
  })

  // Spec: IMPS-1890
  it('⭐⭐ THE RULING: the same re-press puts the arm down WITH SOMETHING SELECTED', () => {
    // Why: its controls are the case above (the arm can stand) and the case below (a
    // press can still arm while a selection stands).
    const once = pressEntrance(RECTANGLE, emptyScreenSession.screen, SOMETHING_SELECTED)
    const twice = pressEntrance(RECTANGLE, once, SOMETHING_SELECTED)
    expect(armOf(once).kind, 'the first press armed nothing').toBe('taskShapeArmed')
    expect(twice.armModeState.kind).toBe('notArmed')
  })

  // Spec: IMPS-1499
  it('⭐ the two roads answer the same: a selection changes NOTHING about the re-press', () => {
    // Why: one comparison, not two expectations, so the only way to pass is for the
    // selection to have no say at all.
    const alone = pressEntrance(RECTANGLE, pressEntrance(RECTANGLE, emptyScreenSession.screen))
    const holding = pressEntrance(
      RECTANGLE,
      pressEntrance(RECTANGLE, emptyScreenSession.screen, SOMETHING_SELECTED),
      SOMETHING_SELECTED,
    )
    expect(holding.armModeState).toEqual(alone.armModeState)
  })

  // Spec: IMPS-1500, IMPS-1501
  it('⛔ THE CONTROL: pressing a DIFFERENT entrance ARMS it, selection or not', () => {
    // Why: the control: a build that disarmed on every palette press would pass the
    // three cases above.
    const armed = pressEntrance(RECTANGLE, emptyScreenSession.screen, SOMETHING_SELECTED)
    const moved = pressEntrance(CHEVRON, armed, SOMETHING_SELECTED)
    expect(armOf(moved).kind).toBe('taskShapeArmed')
    expect((armOf(moved) as any).shapeKind).toBe(CHEVRON_SPELLING)
  })

  // Spec: IMPS-1502
  it('⭐ the arms of table T-023b are exclusive: the milestone press takes the shape arm off', () => {
    const armed = pressEntrance(RECTANGLE, emptyScreenSession.screen)
    const moved = pressEntrance(MILESTONE, armed)
    expect(armOf(moved).kind).toBe('milestoneShapeArmed')
  })
})

const FAR = { x: GROUND.x + DRAG_THRESHOLD * 20, y: GROUND.y }

// Spec: FR-001, FR-083, T-206, S-208
describe('FR-001 / FR-083: a bar shape is made by a drag and by nothing else', () => {
  it('⛔ THE CONTROL: a bar shape DRAGGED past S-208 does make a task', () => {
    // Why: the control: a build that refused every press would pass the refusal case
    // below.
    const armed = pressEntrance(RECTANGLE, emptyScreenSession.screen)
    const drawn = gesture({ screen: armed, from: GROUND, to: FAR })
    const made = creations(drawn.action)
    expect(made.length, 'the drag planned no createTask').toBe(1)
    expect(made[0].shapeKind).toBe(RECTANGLE_SPELLING)
    expect(made[0].start < made[0].finish, 'the span drawn was not carried').toBe(true)
  })

  // Spec: TC-7
  it('⭐⭐ THE RULING: a bar shape released without traveling makes NO task', () => {
    const armed = pressEntrance(RECTANGLE, emptyScreenSession.screen)
    const pressed = gesture({ screen: armed, from: GROUND })
    expect(creations(pressed.action).length).toBe(0)
  })

  it('⭐⭐ THE RULING: and it is TOLD that nothing was made', () => {
    // Why: the situation may not be null: FR-029 forbids the fallback where a T-233 row
    // fits, and RS-53 is that row.
    const armed = pressEntrance(RECTANGLE, emptyScreenSession.screen)
    const pressed = gesture({ screen: armed, from: GROUND })
    expect(pressed.action?.kind).toBe('tellEntryHasNothingToDo')
    expect((pressed.action as any)?.situation ?? null).not.toBeNull()
  })

  it('⭐ the boundary is S-208 and not zero: a travel INSIDE the slop is still a click', () => {
    const armed = pressEntrance(RECTANGLE, emptyScreenSession.screen)
    const trembled = gesture({
      screen: armed,
      from: GROUND,
      to: { x: GROUND.x + Math.max(1, DRAG_THRESHOLD - 1), y: GROUND.y },
    })
    expect(creations(trembled.action).length).toBe(0)
    expect(trembled.action?.kind).toBe('tellEntryHasNothingToDo')
  })

  it('⛔ THE CONTROL: with NOTHING armed the same press tells nothing', () => {
    // Why: the control: a build that told on every press of the ground would pass above;
    // with no arm, PTD-5 makes the press a range selection.
    const bare = gesture({ screen: emptyScreenSession.screen, from: GROUND })
    expect(bare.action?.kind).not.toBe('tellEntryHasNothingToDo')
  })
})

describe('FR-001: the milestone is exempt from the ruling, in both directions', () => {
  it('⛔ THE CONTROL THAT STOPS "REFUSE EVERY PRESS" FROM PASSING: a milestone is placed by a press alone', () => {
    const armed = pressEntrance(MILESTONE, emptyScreenSession.screen)
    const pressed = gesture({ screen: armed, from: GROUND })
    const made = creations(pressed.action)
    expect(made.length, 'the milestone press planned no createTask').toBe(1)
    expect(made[0].shapeKind).toBe(shapeSpelling('SH-5'))
    expect(pressed.action?.kind).not.toBe('tellEntryHasNothingToDo')
  })

  it('⭐ a DRAGGED milestone is not refused, and lands on the pressed point', () => {
    // Why: the point is read by comparison, so no case needs the day-to-x map: the
    // dragged milestone answers the day of a plain press where it started.
    const armed = pressEntrance(MILESTONE, emptyScreenSession.screen)
    const dragged = creations(gesture({ screen: armed, from: GROUND, to: FAR }).action)
    const atPress = creations(gesture({ screen: armed, from: GROUND }).action)
    const atRelease = creations(gesture({ screen: armed, from: FAR }).action)
    expect(dragged.length, 'the dragged milestone was refused').toBe(1)
    expect(dragged[0].start).toBe(atPress[0].start)
    expect(dragged[0].finish).toBe(atPress[0].start)
    // Why: the assertion above would be vacuous if the two points named one day.
    expect(atRelease[0].start).not.toBe(atPress[0].start)
  })
})

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Why: vitest runs under node with no requestAnimationFrame; the fake decides
// nothing about a telling.
function host(): { readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  // Trap: a constant false lets the FR-091 case pass on a build with no fix; it is
  // off until a case turns it on, since WS-2 refuses a write while an entry stands.
  holdTextEntry(standing: boolean): void
  endHeldEntryOnEnter(which: string): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  let textEntryStanding = false
  // Why: IF-9's notices raised since the shell last read them, in order.
  const pending: FieldEditNotice[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readFieldEditNotices: () => pending.splice(0, pending.length),
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    holdTextEntry: (standing) => {
      if (standing === textEntryStanding) return
      textEntryStanding = standing
      // Why: PR-1 is the row the name field names (table T-016).
      pending.push({ kind: standing ? 'began' : 'ended', row: 'PR-1' })
    },
    endHeldEntryOnEnter(which) {
      if (which !== 'Enter' || !textEntryStanding) return
      textEntryStanding = false
      pending.push({ kind: 'ended', row: 'PR-1' })
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

function emptyDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
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
    },
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

interface Stage {
  readonly loop: FrameLoop
  notices(): readonly Notice[]
  // Why: armedText is read, not the row ID, because T-023b keeps row IDs off the
  // screen; it is all a person sees of the arm.
  armedText(): string | null
  pressEntry(entrance: Entrance): void
  pressGround(x: number, y: number): void
  dragGround(from: { x: number; y: number }, to: { x: number; y: number }): void
  // Why: a press left held is the only moment the PTD-4 picture can be looked at.
  holdGround(at: { x: number; y: number }): void
  movePointer(at: { x: number; y: number }): void
  letGo(at: { x: number; y: number }): void
  pressKey(which: string): void
  holdTextEntry(standing: boolean): void
  picture(): any
  panel(): ScreenView['propertiesPanel']
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    notices: () => screen.last().notices,
    armedText: () => screen.last().commandPalette?.armedText ?? null,
    pressEntry: (entrance) => {
      screen.drawAt(partOf(entrance))
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      screen.drawAt(null)
    },
    pressGround: (x, y) => {
      screen.drawAt(null)
      send(pointer('down', x, y))
      send(pointer('up', x, y))
    },
    dragGround: (from, to) => {
      screen.drawAt(null)
      send(pointer('down', from.x, from.y))
      send(pointer('move', to.x, to.y))
      send(pointer('up', to.x, to.y))
    },
    holdGround: (at) => {
      screen.drawAt(null)
      send(pointer('down', at.x, at.y))
    },
    movePointer: (at) => send(pointer('move', at.x, at.y)),
    letGo: (at) => send(pointer('up', at.x, at.y)),
    pressKey: (which) => {
      screen.endHeldEntryOnEnter(which)
      send({ kind: 'key', key: which, modifiers: { ...NO_MODIFIERS } } as HumanInput)
    },
    picture: () => loop.current() as any,
    panel: () => screen.last().propertiesPanel,
    holdTextEntry: (standing) => screen.holdTextEntry(standing),
  }
}

// Why: UF-30 names the situation and UF-48 maps it to the T-233 row, so the cases
// that read the row drive the whole shell.
describe('FR-029 / table T-233: the press carries RS-53, which table T-233 does not show (CR-712)', () => {
  for (const language of ['ja', 'en'] as const) {
    it(`⭐ a bar shape released without traveling shows neither RS-53's nor RS-27's words in ${language}`, () => {
      // Why: with no row for the situation the dictionary falls back to RS-27, which is
      // untrue here and says nothing about what to do instead.
      const built = stage(language)
      built.pressEntry(RECTANGLE)
      built.pressGround(GROUND.x, GROUND.y)
      const told = built.notices().map((one) => one.text)
      expect(told).not.toContain(wordsOf(RS_53)[language])
      expect(told).not.toContain(wordsOf(RS_27)[language])
    })
  }

  it('⭐ and RS-53 keeps NT-1 in table T-233 while the press puts no notice up', () => {
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices()).toEqual([])
    expect(mannerOf(RS_53)).toBe('NT-1')
  })

  it('⛔ and nothing reached the document', () => {
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(RECTANGLE)
    built.pressGround(GROUND.x, GROUND.y)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('⛔ THE CONTROL: the milestone press reaches the document and tells nobody', () => {
    // Why: the control: a build that told RS-53 on every armed press and made nothing
    // would pass every case above.
    const built = stage()
    built.pressEntry(MILESTONE)
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices().length).toBe(0)
    expect((built.loop.document().schedule as any).tasks.length).toBe(1)
    expect((built.loop.document().schedule as any).tasks[0].milestone).toBe(true)
  })
})

// Spec: FR-083, SP-2, CM-20, AG-3, RS-54
// Why: a milestone drawn and left selected, then the rectangle pressed, so SP-2
// plans a shape change the selection cannot take; only the words are under test.
function shapeRefusedOnTheSelection(language: DisplayLanguage = 'ja'): Stage {
  const built = stage(language)
  built.pressEntry(MILESTONE)
  built.pressGround(GROUND.x, GROUND.y)
  built.pressEntry(RECTANGLE)
  return built
}

describe('FR-083 / table T-233: a shape the selection cannot take is told RS-54', () => {
  it('⛔ THE SETUP IS REAL: the milestone was drawn, and it is the only task', () => {
    // Why: without this every case below could pass on an empty selection, where nothing
    // is planned and nothing is refused.
    const built = stage()
    built.pressEntry(MILESTONE)
    built.pressGround(GROUND.x, GROUND.y)
    const tasks = (built.loop.document().schedule as any).tasks
    expect(tasks.length).toBe(1)
    expect(tasks[0].milestone).toBe(true)
    expect(built.notices().length, 'the milestone press itself told nobody').toBe(0)
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⭐⭐ THE DEFECT: the refusal is told RS-54's words and NOT RS-10's, in ${language}`, () => {
      const told = shapeRefusedOnTheSelection(language).notices()
      expect(told.length, 'FR-083: the refusal is told').toBe(1)
      expect(told[0]?.text).toBe(wordsOf(RS_54)[language])
      expect(told[0]?.text).not.toBe(wordsOf(RS_10)[language])
    })
  }

  // Spec: IMPS-1893
  it('⭐ and it is told in NT-1s manner, the manner table T-233 writes RS-54 against', () => {
    expect(shapeRefusedOnTheSelection().notices()[0]?.manner).toBe(mannerOf(RS_54))
  })

  // Spec: IMPS-1892
  it('⭐⭐ FR-083 (MUST): the arming STANDS through the refusal', () => {
    const built = shapeRefusedOnTheSelection()
    const armed = built.armedText()
    expect(armed).not.toBe(null)
    expect(armed?.length ?? 0).toBeGreaterThan(0)
  })

  // Spec: FR-161
  it('⛔ and nothing reached the document: AG-3 makes the bundle atomic', () => {
    const built = stage()
    built.pressEntry(MILESTONE)
    built.pressGround(GROUND.x, GROUND.y)
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(RECTANGLE)
    expect(JSON.stringify(built.loop.document())).toBe(before)
  })

  it('⛔ THE CONTROL: a shape the selection CAN take is refused nothing and tells nobody', () => {
    // Why: the control: a build that told RS-54 on every palette press would pass every
    // case above; a rectangle takes the chevron, both being bar shapes.
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.dragGround(GROUND, { x: GROUND.x + 240, y: GROUND.y })
    const drawn = (built.loop.document().schedule as any).tasks
    expect(drawn.length, 'the drag drew no bar-shaped task to select').toBe(1)
    expect(drawn[0].milestone).not.toBe(true)
    built.pressEntry(CHEVRON)
    expect(built.notices().length, 'a shape it CAN take was told as a refusal').toBe(0)
  })
})

// Spec: T-023a, PTD-4
// Why: PTD-4 asks for a picture, which UF-48 computes; UF-30 plans only the release
// and says nothing while the press is held.
describe('table T-023a PTD-4: the held press draws what it would place', () => {
  // Why: ten times the slop, so S-208 is passed on any machine.
  const TRAVEL = DRAG_THRESHOLD * 10

  function heldFor(entrance: Entrance, travel: number): Stage {
    const built = stage()
    built.pressEntry(entrance)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + travel, y: GROUND.y })
    return built
  }

  it('⛔ THE CONTROL: with NOTHING armed the same held drag draws no task', () => {
    // Why: the control: a build that drew a task for every held press would pass every
    // case below; with no arm, PTD-5 makes a range selection.
    const built = stage()
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect(built.picture().layout.placements.length).toBe(0)
  })

  it('⭐⭐ THE RULING: a bar shape held past S-208 stands in the PICTURE', () => {
    const built = heldFor(RECTANGLE, TRAVEL)
    expect(built.picture().layout.placements.length).toBe(1)
  })

  it('⛔ and NOTHING reached the document while it was held (FR-031)', () => {
    const built = stage()
    built.pressEntry(RECTANGLE)
    const before = JSON.stringify(built.loop.document())
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('⭐ the picture stretches the way the pointer went, and the document does not', () => {
    const near = heldFor(RECTANGLE, TRAVEL)
    const nearWidth = near.picture().layout.placements[0].width
    near.movePointer({ x: GROUND.x + TRAVEL * 3, y: GROUND.y })
    const farWidth = near.picture().layout.placements[0].width
    expect(farWidth).toBeGreaterThan(nearWidth)
    expect((near.loop.document().schedule as any).tasks.length).toBe(0)
  })

  it('⭐ 伸びる向きは、引いた向き: a leftward drag draws to the LEFT of the press', () => {
    const rightward = heldFor(RECTANGLE, TRAVEL)
    const leftward = heldFor(RECTANGLE, -TRAVEL)
    expect(leftward.picture().layout.placements[0].x).toBeLessThan(
      rightward.picture().layout.placements[0].x,
    )
  })

  it('⛔ FR-001 (MUST NOT): a bar shape that has not traveled draws nothing either', () => {
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + 1, y: GROUND.y })
    expect(built.picture().layout.placements.length).toBe(0)
  })

  it('⭐ the release then writes ONCE, and the picture is the document from there on', () => {
    const built = heldFor(RECTANGLE, TRAVEL)
    built.letGo({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect((built.loop.document().schedule as any).tasks.length).toBe(1)
    expect(built.picture().layout.placements.length).toBe(1)
  })
})

describe('table T-023a PTD-4 / 台帳 DFC-373: the draft is the ARMED shape', () => {
  const TRAVEL = DRAG_THRESHOLD * 10

  it('⭐ a bar shape armed draws table T-012s bar spelling', () => {
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect(built.picture().layout.placements[0].shapeKind).toBe(RECTANGLE_SPELLING)
  })

  it('⭐⭐ THE DEFECT DFC-373 IS ABOUT: a milestone armed does NOT draw a bar', () => {
    const built = stage()
    built.pressEntry(MILESTONE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    const drawn = built.picture().layout.placements
    expect(drawn.length).toBe(1)
    expect(drawn[0].shapeKind).not.toBe(RECTANGLE_SPELLING)
    expect(drawn[0].shapeKind).toBe(shapeSpelling('SH-5'))
  })

  it('⭐⭐ 形状を 2 か所に持たせない: what is DRAWN is what is PLACED, figure and all', () => {
    // Why: the relation is the assertion: the drawing side and the placing side must
    // answer the same, which a second store of the shape would break.
    const built = stage()
    built.pressEntry(MILESTONE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    const held = built.picture().layout.placements[0]
    built.letGo({ x: GROUND.x + TRAVEL, y: GROUND.y })
    const placed = built.picture().layout.placements[0]
    expect(held.shapeKind).toBe(placed.shapeKind)
    expect(held.milestoneGlyph).toBe(placed.milestoneGlyph)
  })
})

describe('FR-091: the created name is settled by ONE press', () => {
  const TRAVEL = DRAG_THRESHOLD * 10

  function drawnTask(): Stage {
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.dragGround(GROUND, { x: GROUND.x + TRAVEL, y: GROUND.y })
    return built
  }

  it('⛔ THE CONTROL: drawing one puts the panel up (FR-001 with FR-091)', () => {
    // Why: the control: a build that never opened the panel would pass the case below.
    expect(drawnTask().panel()).not.toBe(null)
  })

  // Spec: IMPS-1910
  it('⭐⭐ THE RULING: one Enter closes it', () => {
    const built = drawnTask()
    // Trap: the field must be standing, or this case passes on a build with no fix,
    // since the ordinary guard turns that Enter away.
    built.holdTextEntry(true)
    built.pressKey('Enter')
    expect(built.panel()).toBe(null)
  })

  it('⭐ and that selection is let go: the next Delete has nothing to take', () => {
    // Why: the selection is read through Delete (SK-3), because the T-023c value does not
    // leave the loop.
    const built = drawnTask()
    built.holdTextEntry(true)
    built.pressKey('Enter')
    built.pressKey('Delete')
    expect((built.loop.document().schedule as any).tasks.length).toBe(1)
  })

  it('⛔ THE CONTROL: without that Enter the selection stands and Delete takes it', () => {
    // Why: the control: a build that never chose the new task, or whose Delete does
    // nothing, would pass the case above.
    const built = drawnTask()
    built.pressKey('Delete')
    expect((built.loop.document().schedule as any).tasks.length).toBe(0)
  })

  // Spec: IMPS-1913
  it('⛔ FR-091 (MUST NOT): the arming stands through that press', () => {
    const built = drawnTask()
    const armedBefore = built.armedText()
    built.pressKey('Enter')
    expect(armedBefore).not.toBe(null)
    expect(built.armedText()).toBe(armedBefore)
  })

  it('⭐ so the next drag draws a second task with no palette press in between', () => {
    const built = drawnTask()
    built.pressKey('Enter')
    const lower = { x: GROUND.x, y: GROUND.y + 120 }
    built.dragGround(lower, { x: lower.x + TRAVEL, y: lower.y })
    expect((built.loop.document().schedule as any).tasks.length).toBe(2)
  })
})
