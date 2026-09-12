// FR-044 (MUST) -- erasing a resume date that WAS PUT sends `resumeValid` back
// to `false`; a task that never had one is left where it stands.
//
// ---------------------------------------------------------------------------
// THE CLAUSE, QUOTED VERBATIM (docs/spec/01-04-requirements.md:2051)
// ---------------------------------------------------------------------------
//
//   **再開予定日を置いたとき、`resumeValid` を `true` にすること（MUST）** ——
//   置かないと表 T-019a の `PS-3` が先に当たり、日付を置いても状態が変わらない。
//   **再開日を未定のままにもできること。** **置いた再開日を消したときは、
//   `resumeValid` を `false` に戻すこと（MUST）** —— 戻さないと表 T-019a の `PS-5`
//   に落ち、**日付を消しただけで中断が黙って解ける。**
//
// ⭐⭐ THE REQUIREMENT NAMES ITS OWN FAILURE, AND THE FAILURE IS WHAT D-286
// MEASURED: 「戻さないと表 T-019a の `PS-5` に落ち、日付を消しただけで中断が黙って
// 解ける」. `PS-5` is 表 T-019a's last row -- 「上のどれにも当たらない | 進行中」 --
// so a suspended task whose date is erased and whose `resumeValid` stays `true`
// walks straight past `PS-3` and `PS-4` and comes out RUNNING.
//
// ⭐⭐ AND THE WORD 「置いた」 IS HALF THE RULE. Writing `false` for every empty
// commit would take a task that is running -- one that never had a resume date
// to erase -- and suspend it, which nobody asked for. ⇒ the cases below are
// paired: the same empty commit, on a task that had a date and on one that did
// not, and the two must answer differently.
//
// ---------------------------------------------------------------------------
// WHERE 表 T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- 「単体テスト | 持たない | —— | Unit | `tests/unit/` |
// Vitest」. ⛔ NOT tests/integration/: `TS-2` takes 「`SWS-xxx`」 for a parent,
// Chapter 9 holds no node for FR-044, and this body owns tests/ only -- it may
// not write one into docs/spec to give itself a parent.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: only the head, the
// published types and the signatures.)
//
//   input-command-translator.ts  `InputContext` and the signature
//                                `commandFromFieldCommit(commit, context)`
//   screen-renderer.ts           `FieldCommit`, `PropertiesPanel`,
//                                `PropertyControl`, `PropertyField`,
//                                `ScreenSession`
//   properties-panel.ts          the signature `propertiesPanelFromSelection`
//   edit-document.ts             `editTask`, `DocumentCommand`, `EditResult`,
//                                `NOT_STORED_ZOOM_BOUNDS`
// ⛔ NO FUNCTION BODY WAS READ. Nothing was read of how a date branch decides
// what to place; every expectation below is 表 T-019's and FR-044's.
// ⭐ THE SHAPE OF THE FIXTURE AND OF `BASE_CONTEXT` IS COPIED, NOT INVENTED --
// tests/unit/t-016-choosing-the-wbs-parent.test.ts drives the same seam for
// `PR-15` and says at length why each member is where it is.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   `FR-044`      the clause above -- the whole of this file.
//   表 T-016 PR-7 「`resume` | 日付 | `Task` | 中断したときだけ入る |
//                 `Task/Resume`」 -- the item a person erases, and the column
//                 the commit is keyed by (read at run time, never typed).
//   表 T-016 PR-8 「`resumeValid` | 真偽 | `Task` | `false` = 再開日未定の中断」.
//   表 T-019      `PA-3` 中断・再開予定あり: `resume` 日付 / `resumeValid` `true`.
//                 `PA-4` 中断・再開日未定: `resume` 空 / **`resumeValid` `false`**.
//                 `PA-2` 進行中: `resume` 空 / `resumeValid` `true`.
//                 ⇒ the erase the clause rules on is exactly `PA-3` → `PA-4`.
//   表 T-019a     the discrimination, applied 「上から順に当て、最初に当たった行の
//                 状態とすること（MUST）」: `PS-3` 「`resumeValid` が `false`」 →
//                 中断・再開日未定, `PS-5` 「上のどれにも当たらない」 → 進行中.
//                 ⭐ READ AND WALKED at the foot of this file rather than
//                 restated, so a case names the STATE the clause names.
//   `FR-006`      「**表 T-016 の項目**をプロパティパネルに出し、**同表が読み取り
//                 専用と記した項目を除いて**編集できるようにすること」 -- why
//                 `PR-7` has a control at all, asserted as a premise.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   1. WHICH ROW OF 表 T-108 CARRIES THE ERASE. FR-044 rules on the VALUES, not
//      on the command that places them, and 表 T-016 gives `PR-7` no 命令 column.
//      So these cases run whatever the translator answers with through
//      `editTask` and read the columns back.
//   2. THE RESUME ICON. The same STATEMENT carries two more MUSTs about drawing
//      it (「中断のあいだは再開アイコンを描くこと（MUST）」); those are the
//      renderer's and are not this seam's.
//   3. HOW THE PANEL SPELLS AN EMPTY DATE. `FieldCommit.text` is a string and
//      an erased date field settles as the empty one; nothing here rules on
//      what the host put in the box.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  editTask,
  type DocumentCommand,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The clause, read out of the manuscript rather than believed
// ===========================================================================

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

/**
 * ⚠️ A Japanese literal in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- this string IS the
 * clause, and matching it against the manuscript is what makes the cases below
 * cases about the specification rather than about this file's opinion.
 *
 * ⭐ IT ENDS AT THE MARKER'S OWN CLOSING PARENTHESIS, and it is the WHOLE of the
 * trailing window: check 39 takes the last 120 characters up to and including
 * `（MUST）` and looks for them under tests/, so a quote that began at the
 * sentence and stopped before the marker would hold nothing at all.
 */
const FR_044_ERASING_SENDS_IT_BACK =
  ' 置かないと表 T-019a の `PS-3` が先に当たり、日付を置いても状態が変わらない。**再開日を未定のままにもできること。** 置いた再開日を消したときは、`resumeValid` を `false` に戻すこと（MUST）'

/** The other half of the same pair -- putting a date puts `true`. */
const FR_044_PUTTING_ONE_SETS_IT =
  'STATEMENT**: `Task` が中断しているあいだ、`GRS` は、作成者が再開予定日を画面上で置き、置いた後に動かせるようにすること。再開予定日を置いたとき、`resumeValid` を `true` にすること（MUST）'

/** The failure the requirement names for itself, and the one D-286 measured. */
const FR_044_THE_NAMED_FAILURE = '戻さないと表 T-019a の `PS-5` に落ち、**日付を消しただけで中断が黙って解ける。**'

// ===========================================================================
// 2. 表 T-016 and 表 T-019 / T-019a, read at run time
// ===========================================================================

const T_016: SpecTable = specTable('T-016')
const T_019: SpecTable = specTable('T-019')
const T_019A: SpecTable = specTable('T-019a')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/** The `GRS JSON` column 表 T-016 gives one row. ⛔ Never the name shown on screen. */
const columnOf = (id: string): string => bare(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

/** `PR-7` `resume` -- the item a person erases. */
const RESUME_COLUMN = columnOf('PR-7')
/** `PR-8` `resumeValid` -- the column the clause rules on. */
const RESUME_VALID_COLUMN = columnOf('PR-8')

/** The 状態 one row of 表 T-019 names, e.g. 「中断・再開日未定」. */
const stateNameOf = (id: string): string => bare(rowOf(T_019, id).by['状態'] ?? '')

// ===========================================================================
// 3. The fixture. Shape copied from tests/unit/t-016-choosing-the-wbs-parent.test.ts
// ===========================================================================

const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    const last = path[path.length - 1] as string
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[last] = flat[key]
  }
  return out
}

const SETTINGS = nested({
  ...SETTINGS_DEFAULTS,
  scrollDate: '2026-01-01',
  scrollGroupId: 'g1',
}) as unknown as DocumentSettings

const THEME_HUE = Number(bare(rowOf(specTable('T-216'), 'S-73').by['既定'] ?? ''))

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const ZOOM_STEP = 3
const TODAY = '2026-03-01T00:00:00'

const THE_TASK = 1

/** ⚠️ Every nullable column spelled out; leaving one `undefined` reads as "set". */
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: THE_TASK,
    wbsParentUid: null,
    wbsOrder: 1,
    name: 'the one task',
    start: '2026-04-06',
    finish: '2026-04-24',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

const groupOf = (): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
  }) as unknown as TaskGroup

const scheduleWith = (task: Task): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: THEME_HUE,
      uidHighWaterMark: 100,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [task],
    resources: [],
    assignments: [],
    taskGroups: [groupOf()],
    taskGroupMembers: [{ taskUid: THE_TASK, groupId: 'g1', stackOrder: null }],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

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

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
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
} as unknown as ScreenSession

const holding = (...items: readonly ItemRef[]): Selection =>
  items.reduce((selection, item) => selectionWith(selection, item), emptySelection())

// ---------------------------------------------------------------------------
// The three tasks 表 T-019 names, built from that table's own cells
// ---------------------------------------------------------------------------

/** ⚠️ The actual columns every suspended and running row shares. */
const STARTED = { actualStart: '2026-04-06', actualDuration: 5 }

/** `PA-3` 中断・再開予定あり -- 「`resume` **日付**」, 「`resumeValid` `true`」. */
const THE_RESUME_DAY = '2026-05-11'
/** ⭐ A different day, so a case that MOVES the date cannot pass on the old one. */
const A_LATER_RESUME_DAY = '2026-06-15'
const PA_3 = (): Task => taskOf({ ...STARTED, resume: THE_RESUME_DAY, resumeValid: true })

/** `PA-4` 中断・再開日未定 -- 「`resume` 空」, 「`resumeValid` **`false`**」. */
const PA_4 = (): Task => taskOf({ ...STARTED, resume: null, resumeValid: false })

/**
 * `PA-2` 進行中 -- 「`resume` 空」, 「`resumeValid` `true`」.
 *
 * ⭐⭐ THIS IS THE CONTROL THE LEDGER ROW ASKED FOR. It has nothing to erase, so
 * 「**置いた**再開日を消したとき」 does not reach it; a build that wrote `false`
 * for every empty commit would suspend it, and 表 T-019a's `PS-3` would then
 * call it 中断・再開日未定 -- a suspension nobody asked for.
 */
const PA_2 = (): Task => taskOf({ ...STARTED, resume: null, resumeValid: true })

// ===========================================================================
// 4. Driving one settled value
// ===========================================================================

const contextFor = (schedule: Schedule): InputContext => {
  const regions = regionsFromScreen(ENV, SETTINGS)
  const layout = layoutFromSchedule(schedule, SETTINGS, regions)
  const geometry: ScheduleGeometry = geometryFromLayout(
    schedule,
    SETTINGS,
    layout,
    regions,
    emptySelection(),
  )
  return {
    document: documentOf(schedule),
    layout,
    geometry,
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    zoomStep: ZOOM_STEP,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: TODAY,
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
}

const panelOf = (schedule: Schedule): PropertiesPanel | null =>
  propertiesPanelFromSelection(
    schedule,
    SETTINGS,
    holding({ kind: 'task', uid: THE_TASK } as ItemRef),
    SESSION,
  )

const fieldFor = (schedule: Schedule, row: string): PropertyField | null =>
  panelOf(schedule)?.fields.find((field) => field.row === row) ?? null

/**
 * What a person settling `PR-7` leaves on the seam.
 *
 * ⭐ THE KEY IS THE TABLE'S, NOT THIS FILE'S: `holder` / `uid` / `column`, with
 * the column read out of 表 T-016's own 「列（`GRS JSON`）」 cell. ⚠️ It is built
 * rather than taken off the panel because `PR-7`'s 備考 says 「中断したときだけ
 * 入る」 -- a running task may be offered no such field at all, and the control
 * below is exactly about a running task.
 */
const commitOf = (text: string): FieldCommit =>
  ({
    row: 'PR-7',
    key: { holder: 'task', uid: THE_TASK, column: RESUME_COLUMN },
    text,
  }) as unknown as FieldCommit

/** The document that stands after a settled value has been spent. */
function afterSettling(task: Task, text: string): Document {
  const schedule = scheduleWith(task)
  const commands: readonly DocumentCommand[] = commandFromFieldCommit(
    commitOf(text),
    contextFor(schedule),
  )
  let document = documentOf(schedule)
  for (const command of commands) {
    const result = editTask(document, command as TaskCommand)
    if (!result.ok) {
      throw new Error(
        `the settled value was refused: ${result.refusals
          .map((one) => `${one.command} ${one.rule} ${one.what}`)
          .join('; ')}`,
      )
    }
    document = result.document
  }
  return document
}

const theTask = (document: Document): Record<string, unknown> =>
  (document as any).schedule.tasks.find((one: any) => one.uid === THE_TASK) as Record<
    string,
    unknown
  >

/**
 * 表 T-019a, walked rather than restated: 「判別は上から順に当て、最初に当たった行
 * の状態とすること（MUST）」.
 *
 * ⭐ THE CONDITIONS ARE THIS FILE'S READING OF THE TABLE'S 条件 CELLS, and each
 * one is asserted against that cell below before any case leans on it -- so a
 * row whose wording moves fails the premise rather than passing quietly.
 */
function stateOf(task: Record<string, unknown>): string {
  const order = ['PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5']
  const holds: Record<string, (one: Record<string, unknown>) => boolean> = {
    'PS-1': (one) => one[columnOf('PR-4')] === null || one[columnOf('PR-4')] === undefined,
    'PS-2': (one) => one[columnOf('PR-6')] !== null && one[columnOf('PR-6')] !== undefined,
    'PS-3': (one) => one[RESUME_VALID_COLUMN] === false,
    'PS-4': (one) => one[RESUME_COLUMN] !== null && one[RESUME_COLUMN] !== undefined,
    'PS-5': () => true,
  }
  for (const id of order) {
    if ((holds[id] as (one: Record<string, unknown>) => boolean)(task)) {
      return bare(rowOf(T_019A, id).by['状態'] ?? '')
    }
  }
  throw new Error('表 T-019a is 全域 and this walk fell off the end of it')
}

// ===========================================================================
// 5. The premises every case below stands on
// ===========================================================================

describe('FR-044 -- the manuscript this file is driven by', () => {
  it('still carries both halves of the pair, each ending at its own （MUST）', () => {
    expect(REQUIREMENTS).toContain(FR_044_PUTTING_ONE_SETS_IT)
    expect(REQUIREMENTS).toContain(FR_044_ERASING_SENDS_IT_BACK)
    expect(REQUIREMENTS).toContain(FR_044_THE_NAMED_FAILURE)
  })

  it('表 T-016 still holds the two columns this file drives', () => {
    expect(RESUME_COLUMN).toBe('resume')
    expect(RESUME_VALID_COLUMN).toBe('resumeValid')
    // ⛔ AND NEITHER IS READ-ONLY, or FR-006 would offer no control to settle.
    expect(rowOf(T_016, 'PR-7').cells.some((cell) => cell.includes('読み取り専用'))).toBe(false)
  })

  it('表 T-019 still separates the three rows this file stands between', () => {
    // ⭐ WITHOUT THIS, THE PAIRING BELOW COULD PASS ON A TABLE THAT HAD MERGED
    // them. Read from the cells, so a table that moves reaches this file.
    const pa3 = rowOf(T_019, 'PA-3').cells.join(' ')
    const pa4 = rowOf(T_019, 'PA-4').cells.join(' ')
    const pa2 = rowOf(T_019, 'PA-2').cells.join(' ')
    expect(stateNameOf('PA-3')).toContain('中断')
    expect(stateNameOf('PA-4')).toContain('中断')
    expect(stateNameOf('PA-2')).toContain('進行中')
    expect(pa3).toContain('`true`')
    expect(pa4).toContain('`false`')
    expect(pa2).toContain('`true`')
  })

  it('表 T-019a still discriminates the way this file walks it', () => {
    // ⚠️ THE RAW CELL, NOT `bare`: that helper answers with the FIRST backticked
    // token, which for 「`resumeValid` が `false`」 is the column name alone --
    // and it is the whole condition these cases walk.
    expect(rowOf(T_019A, 'PS-3').by['条件'] ?? '').toContain('`resumeValid` が `false`')
    expect(rowOf(T_019A, 'PS-4').by['条件'] ?? '').toContain('`resume` に日付がある')
    expect(rowOf(T_019A, 'PS-5').by['条件'] ?? '').toContain('上のどれにも当たらない')
    expect(rowOf(T_019A, 'PS-5').by['状態'] ?? '').toContain('進行中')
    // ⭐ THE WALK ITSELF, CHECKED AGAINST THE THREE FIXTURES BEFORE ANY CASE
    // LEANS ON IT.
    expect(stateOf(PA_3() as unknown as Record<string, unknown>)).toBe(stateNameOf('PA-3'))
    expect(stateOf(PA_4() as unknown as Record<string, unknown>)).toBe(stateNameOf('PA-4'))
    expect(stateOf(PA_2() as unknown as Record<string, unknown>)).toBe(stateNameOf('PA-2'))
  })

  it('FR-006 really does offer a control for PR-7 on a suspended task', () => {
    // ⛔ THE ROAD THIS FILE DRIVES HAS TO EXIST. 表 T-016's 備考 for PR-7 reads
    // 「中断したときだけ入る」, and PA-3 is suspended -- so a panel with no field
    // here would mean the erase has no entrance and the cases below are about a
    // seam nobody can reach.
    const field = fieldFor(scheduleWith(PA_3()), 'PR-7')
    expect(field, '表 T-016 PR-7 has no field on a suspended task').not.toBeNull()
    expect((field?.controls ?? []).length, 'PR-7 is not read-only, so it has a control').toBe(1)
    expect((field?.controls[0] as PropertyControl | undefined)?.kind).toBe('date')
  })
})

// ===========================================================================
// 6. 「置いた再開日を消したときは、`resumeValid` を `false` に戻すこと（MUST）」
// ===========================================================================

describe('FR-044 (MUST) -- erasing a resume date that was put', () => {
  it('sends `resumeValid` back to false', () => {
    const after = theTask(afterSettling(PA_3(), ''))

    expect(
      after[RESUME_VALID_COLUMN],
      'FR-044 (MUST): 「置いた再開日を消したときは、`resumeValid` を `false` に戻すこと」',
    ).toBe(false)
  })

  it('leaves the task on 表 T-019 の `PA-4`, not on `PA-2`', () => {
    const after = theTask(afterSettling(PA_3(), ''))

    // ⭐ THE STATE, NOT THE COLUMN -- which is what the requirement's own named
    // failure is about: 「戻さないと表 T-019a の `PS-5` に落ち、日付を消しただけで
    // 中断が黙って解ける」.
    expect(after[RESUME_COLUMN], '表 T-019 `PA-4` gives `resume` 空').toBeNull()
    expect(stateOf(after), 'the suspension came undone from erasing a date alone').toBe(
      stateNameOf('PA-4'),
    )
  })

  it('⭐ the control: MOVING the date on the same field leaves `resumeValid` true', () => {
    // ⛔ WITHOUT THIS, THE TWO CASES ABOVE WOULD PASS ON A BUILD THAT WROTE
    // `false` FOR EVERY COMMIT ON PR-7. It is the same task and the same field;
    // only the settled text differs. ⭐ FR-044's STATEMENT asks for exactly this
    // -- 「作成者が再開予定日を画面上で置き、**置いた後に動かせる**ようにすること」.
    const after = theTask(afterSettling(PA_3(), A_LATER_RESUME_DAY))

    expect(after[RESUME_VALID_COLUMN]).toBe(true)
    expect(String(after[RESUME_COLUMN] ?? '')).toContain(A_LATER_RESUME_DAY)
    expect(stateOf(after)).toBe(stateNameOf('PA-3'))
  })
})

// ===========================================================================
// 8. ⛔⛔ RED ON PURPOSE -- FR-044's FIRST MUST, on the one state that needs it
// ===========================================================================
//
// ⛔⛔ THIS CASE IS RED AND IS NOT WEAKENED. `docs/development-rules/
// 04-verification.md` allows a case that is red on purpose, and the honest
// answer here is red: `FR-044`'s first MUST is not kept for the one state from
// which putting a resume date is a NEW act.
//
// ⭐ MEASURED, NOT INFERRED (2026-09-06, through the same seam every case above
// drives -- `commandFromFieldCommit` then `editTask`):
//
//   current 表 T-019 row | settled text | row the command places
//   ---------------------+--------------+------------------------
//   PA-3 中断・再開予定あり | ''           | PA-4   ⭐ D-286's fix, kept
//   PA-3                 | a date       | PA-3, resume moved  ⭐ kept
//   PA-2 進行中           | ''           | PA-2   ⭐ D-286's ⭐ half, kept
//   PA-2                 | a date       | PA-3   ⭐ kept
//   PA-4 中断・再開日未定  | ''           | PA-4   ⭐ kept
//   ⛔ PA-4              | a date       | PA-4 -- THE DATE IS DROPPED
//
// ⛔⛔ AND THE REQUIREMENT NAMED THIS FAILURE IN ITS OWN WORDS, beside the very
// MUST it breaks: 「**再開予定日を置いたとき、`resumeValid` を `true` にすること
// （MUST）** —— 置かないと表 T-019a の `PS-3` が先に当たり、**日付を置いても状態が
// 変わらない**」. `PA-4` carries `resumeValid` `false`, so `PS-3` catches it first
// and the placement comes back on `PA-4` with no `resume` at all.
//
// ⭐⭐ AND `PA-4` IS THE ONLY STATE THAT MATTERS FOR THAT MUST. The same
// STATEMENT lets a person suspend a task without naming a day -- 「**再開日を未定
// のままにもできること。**」 -- so 中断・再開日未定 is exactly where somebody
// stands when they later decide the day. From `PA-3` the act is a MOVE (which
// works, above) and from `PA-2` it is not a suspension the person asked for.
// ⇒ the entrance FR-044's first MUST exists for is the one that does not work.
//
// ⚠️ THIS IS NOT D-286. That row is 「再開予定日を空にしても `resumeValid` が真の
// まま残り」 -- the ERASE half -- and its repair holds, as the four ⭐ rows above
// show. This is its mirror, and no ledger row was found for it.

describe('⛔ RED ON PURPOSE -- FR-044 (MUST): putting a resume date sets `resumeValid` true', () => {
  it('⛔ a task that is 中断・再開日未定 cannot be given a resume date at all', () => {
    const after = theTask(afterSettling(PA_4(), THE_RESUME_DAY))

    expect(
      String(after[RESUME_COLUMN] ?? ''),
      'the settled date never reached the document -- FR-044 (MUST): 「再開予定日を置いたとき、' +
        '`resumeValid` を `true` にすること」, and 表 T-019a の `PS-3` は先に当たっている',
    ).toContain(THE_RESUME_DAY)
    expect(after[RESUME_VALID_COLUMN]).toBe(true)
    expect(stateOf(after)).toBe(stateNameOf('PA-3'))
  })
})

// ===========================================================================
// 7. ⭐ 「**置いた**再開日を消したとき」 -- and only then
// ===========================================================================

describe('FR-044 -- a task that had no resume date is not suspended by an empty commit', () => {
  it('⛔ a running task stays running', () => {
    // ⭐⭐ THE HALF THE LEDGER ROW SPELLED OUT: 「無条件に偽を書くと、進行中の
    // タスクが誰も頼んでいない中断に入る。⇒ 元の再開日が在ったときだけ戻す」.
    // 表 T-019's `PA-2` 進行中 carries 「`resume` 空」 and 「`resumeValid` `true`」,
    // so there is no 「置いた再開日」 to erase.
    const after = theTask(afterSettling(PA_2(), ''))

    expect(
      after[RESUME_VALID_COLUMN],
      'an empty commit suspended a running task -- FR-044 releases `resumeValid` only for a date ' +
        'that was PUT',
    ).not.toBe(false)
    expect(stateOf(after), '表 T-019a `PS-3` caught a task nobody suspended').toBe(
      stateNameOf('PA-2'),
    )
  })

  it('⛔ a task already 中断・再開日未定 is left where it stands', () => {
    // ⚠️ `PA-4` already carries `false`, so this case cannot tell a build that
    // writes unconditionally from one that reads 「置いた」 -- it is here to say
    // that an empty commit on an already-empty field disturbs neither column.
    const after = theTask(afterSettling(PA_4(), ''))

    expect(after[RESUME_VALID_COLUMN]).toBe(false)
    expect(after[RESUME_COLUMN]).toBeNull()
    expect(stateOf(after)).toBe(stateNameOf('PA-4'))
  })

  it('⭐ the control: the two empty commits really do part company', () => {
    // ⛔ THE ONE CASE THAT CANNOT PASS ON EITHER BROKEN BUILD. Same field, same
    // empty text, two tasks that differ only in whether a resume date was put --
    // and 表 T-019a must call them different states.
    const fromSuspended = stateOf(theTask(afterSettling(PA_3(), '')))
    const fromRunning = stateOf(theTask(afterSettling(PA_2(), '')))

    expect(
      fromRunning,
      'the same empty commit answered alike on both tasks, so 「置いた」 decided nothing',
    ).not.toBe(fromSuspended)
    expect(fromSuspended).toBe(stateNameOf('PA-4'))
    expect(fromRunning).toBe(stateNameOf('PA-2'))
  })
})
