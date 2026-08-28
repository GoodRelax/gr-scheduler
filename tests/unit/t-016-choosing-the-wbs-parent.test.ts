// Unit tests for `PR-15` of 表 T-016 -- the WBS parent, and the route the
// `Properties Panel` gives a person for changing it.
//
// The units driven are UF-64 `properties-panel.ts` (`ScreenRenderer`, CP-37 of
// 表 T-062, published through PI-37), UF-30 `input-command-translator.ts`
// (`InputCommandTranslator`, CP-18, PI-18), UF-11 `edit-task.ts`
// (`EditDocument`, PI-9) and UF-1 `schedule.ts` (`Schedule`, CP-1, PI-1). One
// file drives four because ONE item of 表 T-016 only becomes an edit by
// crossing all of them: the panel offers the chooser, the translator turns what
// was settled into `CM-18` of 表 T-108, the aggregate judges the ring, and the
// document invariants say which depth is bounded and which is not.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-006     「作成者がタスクを選んだとき、`GRS` は、**表 T-016 の項目**をプロパ
//              ティパネルに出し、**同表が読み取り専用と記した項目を除いて**編集で
//              きるようにすること。」 PR-15 carries no read-only mark.
//   表 T-016   `PR-15` | `wbsParentUid` | WBS の親 | 選択 | 「階層の深さはここから
//              導出する」 | 「`Task/OutlineLevel` へ導出」.
//   the paragraph under 表 T-016 (MUST): 「入力の形は同表の「入力の型」の欄に従う
//              こと」 -- and (MUST NOT) 「選択の候補・数値の下限と上限・日付である
//              列は … 本表へ写してはならない」, which is why no case below states
//              WHAT the candidates are.
//   表 T-108   `CM-18` | `Task` | `setTaskWbsParent` | 「WBS の親を移す」 | 正
//              `FR-005`. ⭐ It is the only row of that table that moves a WBS
//              parent, so it is the only thing a settled PR-15 can become.
//   表 T-015a  `HM-4` (MUST NOT) 「自分の子孫を親にする移動を受け付けてはならない
//              —— 循環になる。外から来た循環は `FR-023` が別に弾く」.
//   表 T-220   `IV-4` 「`Task.wbsParentUid` がたどる親子に輪が無いこと」 and `IV-5`
//              「`TaskGroup.parentId` がたどる入れ子の深さが、行の深さの上限を超え
//              ないこと。⚠️ **WBS の深さは対象外** —— 上限を持たない」.
//   `IV-2`     「外部キーが非 `null` のとき、それが指す先の行が同じ文書にあること」,
//              with `AT-25` of 表 T-058 -- `Task.wbsParentUid` is the FK to
//              `Task` and 「`null` = 根」.
//   FR-004     「**WBS の深さをクランプしてはならない（MUST NOT）。** … 階層は
//              `Task.wbsParentUid` がそのまま持ち」 and 「⚠️ **`S-125` は
//              `TaskGroup` の深さである。WBS の深さではない**」.
//   `S-125`    表 T-211, `maxGroupDepth` -- 「`TaskGroup` の深さの上限」. `S-115`
//              beside it repeats the split: 「**`maxGroupDepth`（`S-125`）とは別
//              物**（WBS はクランプしない）」, and `G-2` of 表 T-005 says the same
//              a third time: 「⚠️ **WBS の深さはこれと別物で、上限を持たない**」.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT THIS FILE DELIBERATELY DOES NOT ASSERT
// ---------------------------------------------------------------------------
//
//   1. WHICH candidates PR-15 offers, in what order, and how a candidate that
//      means 「no parent」 is spelled. The paragraph under 表 T-016 (MUST NOT)
//      forbids that table to hold a roster of candidates, `wbsParentUid` gets
//      no enumeration from `_source/grs-document.schema.json` (its candidates
//      are the document's own tasks), and the question is on the pending list
//      as PD-272, 未裁定. So the cases below ask only what no reading of the
//      manuscript can deny: that a roster exists, that it can reach another
//      `Task`, and that nothing in it names a `Task` the document has lost.
//   2. WHETHER `CM-18` MAY REFUSE A MOVE FOR BEING TOO DEEP. ⛔ THE
//      MANUSCRIPT READS TWO WAYS AND THE CASE IS DROPPED RATHER THAN INVENTED
//      (rule 04 section 1: 仕様が曖昧ならその件を落とし、食い違いとして報告する).
//      `HM-3a` of 表 T-015a says 「移動後の深さが `FR-004` の上限を超える移動を
//      受け付けてはならない（MUST NOT）」 while FR-004 says 「WBS の深さをクラン
//      プしてはならない（MUST NOT）」 and `IV-5` puts the WBS outside the bounded
//      depth altogether. 表 T-108 carries no command that changes
//      `TaskGroup.parentId`, so `HM-3a` has no other move to bite on -- which
//      leaves it either contradicting FR-004 or addressed to nothing. The
//      round's report names this; no case here takes a side.
//   3. WHICH rule id a refusal reports. The manuscript names both `HM-4` and
//      `IV-4` for the ring and says nothing about which one a refusal is filed
//      under, so the ring cases assert that the edit was refused and stop.
//   4. Whether a candidate may be the selected task itself. `HM-4` is addressed
//      to what is ACCEPTED, not to what is OFFERED, and no row says a chooser
//      must pre-judge -- reported with 1. above rather than guessed at.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT OF `src/` WAS READ, STATED HONESTLY
// ---------------------------------------------------------------------------
//
// Every expectation above was decided against the rows it names before any of
// `src/` was opened (rule 04 section 1). What was then read:
//
//   - the declarations these cases must call: `properties-panel.ts`
//     (`propertiesPanelFromSelection`), `screen-renderer.ts` (`PropertiesPanel`,
//     `PropertyControl`, `PropertyField`, `PropertyFieldKey`, `ScreenSession`,
//     `FieldCommit`), `input-command-translator.ts` (`InputContext`,
//     `commandFromFieldCommit`), `edit-document.ts` (`editTask`, `EditResult`,
//     `TaskCommand`, `DocumentCommand`, `NOT_STORED_ZOOM_BOUNDS`),
//     `schedule.ts` (`scheduleViolations`, `ScheduleViolation`), the three
//     layout entries the fixture is built from, and the entity types;
//   - ⚠️ TWO PIECES OF BODY, named here so a reader can weigh the cases against
//     that: `choicesOf` in `properties-panel.ts` and the `setTaskWbsParent` arm
//     of `edit-task.ts`. They were opened for the round's own instruction --
//     report every comment in `src/` that is not true, and do not write a case
//     that already exists -- and NOT to learn an answer. Nothing below takes an
//     expected value from either.
//
// ⚠️ `FieldCommit.text` is 「ALWAYS A STRING, whatever the control's kind …
// a number as its digits」, which is that declaration's own words -- so the
// digits a case settles are the published spelling and not a coined one.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  scheduleViolations,
  type Schedule,
  type Task,
  type TaskGroup,
} from '../../src/entity/document-model/schedule/schedule'
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
  type EditResult,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// 表 T-016's own row, READ OUT OF THE MANUSCRIPT rather than copied here.
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by fixed data copied from that table; `tests/contract/spec-table.ts`
// makes the copy at read time so it cannot fall behind the table.
// ---------------------------------------------------------------------------

const PR_15 = specTable('T-016').rows.find((row) => row.id === 'PR-15')
if (PR_15 === undefined) throw new Error('table T-016 no longer has row PR-15')

/** The heading of the column FR-006's paragraph makes a MUST. */
const INPUT_KIND_COLUMN = '入力の型'

/** FR-006 looks for this mark wherever the row writes it. */
const READ_ONLY_MARK = '読み取り専用'

/**
 * 表 T-016's own word for a 選択, paired with the member `PropertyControlKind`
 * declares for it -- that type names that very column as what it is and gives
 * each member the table's word in a comment. ⛔ Only the pairing is written
 * here; which word PR-15 carries is read from the manuscript.
 */
const CHOICE_WORD = '選択'

/** 表 T-108's `CM-18`, as `edit-task.ts` spells its 確定名. */
const CM_18 = 'setTaskWbsParent'

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * `SETTINGS_DEFAULTS` is printed with the dotted keys `_assets/tbl-settings.md`
 * writes, while `DocumentSettings` is the nested shape.
 *
 * ⭐ Expanding the generated roster is what keeps this file from re-typing a
 * value the manuscript already holds (rule 03 section 1).
 */
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

/** A case pins the dotted keys it means; every other value is the manuscript's. */
const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  nested({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01', // S-77, so the day-to-x map has an origin
  scrollGroupId: 'g1', // S-78, so a row is at the top
})

/**
 * `S-125` of 表 T-211, taken from the generated roster and never typed.
 *
 * ⚠️ The row counts 「根の行を深さ 1」, so a chain of this many links stands
 * exactly at the bound and one more link is past it.
 */
const MAX_GROUP_DEPTH = SETTINGS.maxGroupDepth

/**
 * S-73's default hue, read out of 表 T-216 rather than written here.
 *
 * ⚠️ `DR-5` of 表 T-052 keeps the hue on `Project`, so `SETTINGS_DEFAULTS` does
 * not carry it. ⛔ No case reads it; the fixture needs it to exist.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * `S-53` arrives as a value (`InputContext.zoomStep`) because no generator
 * brings 表 T-201 into `src/`. ⛔ Deliberately NOT the figure the manuscript
 * prints -- no case here reads it, and a stand-in makes that plain.
 */
const ZOOM_STEP = 3

/** Today, spelled the way a date column is spelled (`EX-7`'s midnight). */
const TODAY = '2026-03-01T00:00:00'

/** ⚠️ Every nullable column spelled out; leaving one `undefined` reads as "set". */
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

/** `AT-54`: `label` and `derivedFromTaskUid` are never both null (`IV-8`). */
const groupOf = (part: Record<string, unknown>): TaskGroup =>
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
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: THEME_HUE,
      uidHighWaterMark: 100, // AT-20
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
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

/**
 * ⭐ THE FIXTURE. Three ROOT tasks, none of them anybody's parent, so that a
 * case about what the chooser offers cannot be answered by `HM-4`'s ring rule
 * instead of by FR-006 -- every one of the three is a lawful parent for the
 * other two.
 */
const THE_TASK = 1
const ANOTHER_TASK = 2
const A_THIRD_TASK = 3

const THREE_ROOTS = scheduleOf({
  tasks: [
    taskOf({ uid: THE_TASK, name: 'alpha' }),
    taskOf({ uid: ANOTHER_TASK, name: 'beta' }),
    taskOf({ uid: A_THIRD_TASK, name: 'gamma' }),
  ],
  taskGroups: [groupOf({ id: 'g1' })],
  taskGroupMembers: [THE_TASK, ANOTHER_TASK, A_THIRD_TASK].map((taskUid) => ({
    taskUid,
    groupId: 'g1',
    stackOrder: null,
  })),
})

/**
 * A WBS chain of `links` tasks, uid 1 at the root and each next task the child
 * of the one before it. Every task is on the one row, so `IV-6` holds whatever
 * the chain's length is -- ⭐ which is the point: the chain is a WBS depth and
 * the row depth stays 1.
 */
const chainOf = (links: number): Schedule =>
  scheduleOf({
    tasks: Array.from({ length: links }, (_unused, index) =>
      taskOf({
        uid: index + 1,
        name: `link ${index + 1}`,
        wbsParentUid: index === 0 ? null : index,
      }),
    ),
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: Array.from({ length: links }, (_unused, index) => ({
      taskUid: index + 1,
      groupId: 'g1',
      stackOrder: null,
    })),
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
// Reading the answers
// ---------------------------------------------------------------------------

const panelOf = (taskUid: number, schedule: Schedule = THREE_ROOTS): PropertiesPanel => {
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

/**
 * The one control PR-15 offers. ⚠️ The row holds ONE column, so the field has
 * one control -- 表 T-016 writes `wbsParentUid` alone in its 項目名 cell, where
 * `PR-3` and `PR-12` write several with ' / ' between them.
 */
const parentControlOf = (
  taskUid: number = THE_TASK,
  schedule: Schedule = THREE_ROOTS,
): PropertyControl => {
  const controls = fieldAt(panelOf(taskUid, schedule), 'PR-15').controls
  expect(
    controls.length,
    'FR-006 (MUST): PR-15 is not marked read-only, so the panel offers a control for it',
  ).toBe(1)
  return controls[0] as PropertyControl
}

/**
 * What each candidate of a `choice` control COMMITS.
 *
 * ⭐ `PropertyControl` declares `choiceValues` as 「What each candidate of
 * `choices` COMMITS, one per candidate and in the same order -- absent where
 * every candidate commits the word it shows」, so the two are read together
 * rather than the word being taken for the value.
 */
const committedBy = (control: PropertyControl): readonly string[] => {
  const words = control.choices ?? []
  const values = control.choiceValues
  return words.map((word, at) => values?.[at] ?? word)
}

const BASE_CONTEXT = (schedule: Schedule): InputContext => {
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
    dualCursorFollowing: null,
    today: TODAY,
    newGroupId: 'row-minted-outside',
  }
}

/**
 * What `commandFromFieldCommit` writes for a value settled on PR-15.
 *
 * ⭐ THE KEY IS THE PANEL'S OWN, never minted here: `PropertyControl.key` is
 * declared as the very value the drawing side is handed and hands back, so the
 * two seams are tested against each other rather than against a shared guess.
 */
const commandsForParent = (
  text: string,
  taskUid: number = THE_TASK,
  schedule: Schedule = THREE_ROOTS,
): readonly DocumentCommand[] => {
  const commit: FieldCommit = { row: 'PR-15', key: parentControlOf(taskUid, schedule).key, text }
  return commandFromFieldCommit(commit, BASE_CONTEXT(schedule))
}

const run = (schedule: Schedule, command: TaskCommand): EditResult =>
  editTask(documentOf(schedule), command)

// ---------------------------------------------------------------------------

describe('表 T-016 PR-15 -- the chooser the Properties Panel offers', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A CELL WOULD MAKE THE CASES BELOW
    // AGREE WITH ANYTHING (rule 04 section 2). The row still calls the item a
    // 選択 and still carries no read-only mark; if either changes, the cases
    // below are asking about a rule the table stopped having.
    expect(PR_15.by[INPUT_KIND_COLUMN]?.trim()).toBe(CHOICE_WORD)
    expect(PR_15.cells.some((cell) => cell.includes(READ_ONLY_MARK))).toBe(false)
    // The bound the depth cases lean on arrived from the generated roster.
    expect(Number.isInteger(MAX_GROUP_DEPTH)).toBe(true)
    expect(MAX_GROUP_DEPTH).toBeGreaterThan(0)
  })

  it('⛔ MUST publish a roster of candidates -- a 選択 offering none is no way to edit', () => {
    // FR-006 (MUST): 「同表が読み取り専用と記した項目を除いて編集できるようにする
    // こと」, and the paragraph under 表 T-016 (MUST): 「入力の形は同表の「入力の
    // 型」の欄に従うこと」. ⚠️ `PropertyControl.choices` is declared as 「The
    // WORDS a `choice` control offers」 -- so a `null` roster against a 選択 is
    // the panel saying there is nothing to choose, and an item nobody can
    // choose a value for is not the editable item FR-006 requires.
    //
    // ⛔ WHAT IS IN THE ROSTER IS NOT ASKED. The paragraph under 表 T-016 (MUST
    // NOT) forbids that table to hold the candidates and PD-272 records the
    // question as 未裁定.
    const control = parentControlOf()
    expect(control.choices, 'a 選択 control publishes what it offers').not.toBe(null)
    expect((control.choices ?? []).length).toBeGreaterThan(0)
  })

  it('⛔ MUST be able to reach another Task, or the parent cannot be CHANGED', () => {
    // FR-006 (MUST) makes PR-15 editable and 表 T-016 says 「階層の深さはここから
    // 導出する」, so this is the one route by which a person gives a task a
    // different place in the WBS. `AT-25` makes the only non-null values the
    // column can hold the `uid` of a `Task`, so a roster that can reach no other
    // task can change nothing -- the value already stored would be the only one
    // a person could settle on.
    //
    // ⚠️ THE FIXTURE IS THREE ROOTS, so `HM-4`'s ring rule excludes none of
    // them: whichever of the two other tasks is offered, the case is answered
    // by FR-006 and not by a filter the manuscript never asked for.
    const held = new Set(THREE_ROOTS.tasks.map((task) => String(task.uid)))
    const reachable = committedBy(parentControlOf()).filter(
      (value) => held.has(value) && value !== String(THE_TASK),
    )
    expect(
      reachable.length,
      'FR-006 (MUST): PR-15 offers no candidate naming another Task, so the WBS parent ' +
        'cannot be changed from the panel at all',
    ).toBeGreaterThan(0)
  })

  it('⛔ MUST NOT offer a candidate naming a Task the document does not hold (IV-2)', () => {
    // `IV-2` of 表 T-220: 「外部キーが非 `null` のとき、それが指す先の行が同じ文書に
    // あること」, and `AT-25` makes `wbsParentUid` that foreign key. A candidate
    // that committed a uid the document has lost would put a document-breaking
    // value in front of a person as though it were a lawful one.
    //
    // ⚠️ ONLY THE CANDIDATES THAT READ AS A `uid` ARE JUDGED. `AT-25` writes
    // 「`null` = 根」 and no row says how the panel spells that candidate
    // (PD-272), so a candidate that is not a number is left alone here.
    const held = new Set(THREE_ROOTS.tasks.map((task) => task.uid))
    for (const value of committedBy(parentControlOf())) {
      if (!/^-?\d+$/.test(value)) continue
      expect(held.has(Number(value)), `PR-15 offers uid ${value}, which the document does not hold`)
        .toBe(true)
    }
  })
})

describe('表 T-108 CM-18 -- what a value settled on PR-15 becomes', () => {
  it('⛔ MUST become one setTaskWbsParent, naming the task the field was drawn for', () => {
    // 表 T-108 carries exactly one row that moves a WBS parent -- `CM-18`
    // `setTaskWbsParent`, 正 `FR-005` -- so it is the only thing a settled PR-15
    // can turn into. FR-006 (MUST) makes the item editable, and `IF-9` of 表
    // T-065 has the surface hand back 「プロパティパネルの欄で確定した値を、その
    // 欄が名乗る行 ID とともに」; a route that answers with no command is a route
    // that changes nothing, which is the MUST unmet.
    //
    // ⚠️ EXACTLY ONE. `FR-031` with `UN-3` of 表 T-027 makes one property change
    // ONE step of the undo history, so a second command would put a second step
    // on it for a single settled value.
    const commands = commandsForParent(String(ANOTHER_TASK))
    expect(
      commands.map((one) => one.kind),
      `a value settled on PR-15 has to become ${CM_18}`,
    ).toEqual([CM_18])

    const written = commands[0] as unknown as Record<string, unknown>
    expect(written['uid'], 'the task whose panel this is').toBe(THE_TASK)
    expect(written['parentUid'], 'the uid that was settled').toBe(ANOTHER_TASK)
  })

  it('carries the value that was settled, and not the one the field already held', () => {
    // ⚠️ 04-verification section 2: a value that reaches nothing is a value
    // nobody notices going stale. Two unlike settled values have to arrive
    // unlike, or the seam is carrying a constant.
    const first = commandsForParent(String(ANOTHER_TASK))[0] as unknown as Record<string, unknown>
    const second = commandsForParent(String(A_THIRD_TASK))[0] as unknown as Record<string, unknown>
    expect(first['parentUid']).not.toBe(second['parentUid'])
    expect(second['parentUid']).toBe(A_THIRD_TASK)
  })
})

describe('HM-4 and IV-4 -- the ring a WBS parent may not close', () => {
  it('⛔ MUST NOT accept a Task as its own parent', () => {
    // `IV-4` of 表 T-220: 「`Task.wbsParentUid` がたどる親子に輪が無いこと」. A task
    // naming itself is the shortest ring there is, and `HM-4` of 表 T-015a
    // (MUST NOT) forbids 「自分の子孫を親にする移動」 -- a subtree's own root is
    // the first member of that subtree.
    //
    // ⚠️ WHICH RULE ID THE REFUSAL REPORTS IS NOT ASSERTED: the manuscript names
    // both rows for this ring and nowhere says which one a refusal is filed
    // under, so inventing one here would be this file's decision and not the
    // specification's.
    const result = run(THREE_ROOTS, { kind: CM_18, uid: THE_TASK, parentUid: THE_TASK })
    expect(result.ok, 'IV-4 (a ring of one link) has to be refused').toBe(false)
  })

  it('⛔ MUST NOT accept a ring that closes further away than S-125', () => {
    // `HM-4` (MUST NOT) puts no distance on 「自分の子孫」 and `IV-4` puts none on
    // 「輪」 -- and FR-004 says why a walk over this axis may not stop early:
    // 「**WBS の深さをクランプしてはならない（MUST NOT）**」, with `IV-5` writing
    // the same split a second time -- 「⚠️ **WBS の深さは対象外** —— 上限を持た
    // ない」 -- and `S-115` a third: 「**`maxGroupDepth`（`S-125`）とは別物**（WBS
    // はクランプしない）」.
    //
    // ⭐ SO THE CHAIN IS BUILT PAST `S-125` ON PURPOSE. A cycle check that
    // walked only as far as the ROW depth allows would answer 「no ring」 for
    // this move and quietly write a document `IV-4` forbids.
    const links = MAX_GROUP_DEPTH + 2
    const chain = chainOf(links)
    const deepest = links

    const result = run(chain, { kind: CM_18, uid: THE_TASK, parentUid: deepest })
    expect(
      result.ok,
      `HM-4 (MUST NOT): uid ${deepest} is a descendant of uid ${THE_TASK}, ` +
        `${links - 1} links away, which is past S-125 (${MAX_GROUP_DEPTH})`,
    ).toBe(false)
  })

  it('accepts a move that closes no ring, however deep the chain already is', () => {
    // The other half of the same rule, so that the case above cannot be passed
    // by a seam that refuses everything. `HM-1` reflects the change to the WBS
    // and `HM-2` keeps the uid; moving the deepest link up to the root closes no
    // ring and takes the chain no deeper.
    const links = MAX_GROUP_DEPTH + 2
    const result = run(chainOf(links), { kind: CM_18, uid: links, parentUid: THE_TASK })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.schedule.tasks.find((task) => task.uid === links)?.wbsParentUid).toBe(
      THE_TASK,
    )
  })
})

describe('FR-004 -- S-125 bounds the row depth and not the WBS depth', () => {
  it('⛔ MUST NOT hold a WBS chain deeper than S-125 against the document', () => {
    // Three rows say this in as many words. FR-004: 「**WBS の深さをクランプして
    // はならない（MUST NOT）。** … 階層は `Task.wbsParentUid` がそのまま持ち」 and
    // 「⚠️ **`S-125` は `TaskGroup` の深さである。WBS の深さではない**」. `IV-5` of
    // 表 T-220: 「⚠️ **WBS の深さは対象外** —— 上限を持たない」. `G-2` of 表 T-005:
    // 「⚠️ **WBS の深さはこれと別物で、上限を持たない**」.
    //
    // ⭐ THE ROW DEPTH IS HELD AT 1 WHILE THE WBS GOES PAST THE BOUND: every
    // task of the chain sits on the one root row, so anything answered about
    // depth here is answered about the WBS.
    //
    // ⚠️ ONLY THE TWO ROWS THIS FILE IS ABOUT ARE READ OFF THE ANSWER. The
    // fixture is not built to satisfy every row of 表 T-220 -- it holds no
    // calendar, for one -- and a case that demanded an empty answer would be
    // asking about rows it never set up. That IV-5 does fire on the ROW axis is
    // already shown by tests/contract/document-invariants.contract.test.ts.
    const links = MAX_GROUP_DEPTH + 2
    const chain = chainOf(links)
    expect(chain.taskGroups.every((group) => group.parentId === null)).toBe(true)

    const answered = scheduleViolations(chain, SETTINGS)
      .filter((one) => one.row === 'IV-4' || one.row === 'IV-5')
      .map((one) => `${one.row}: ${one.what}`)
    expect(answered, 'a WBS chain past S-125 is not a breach of either depth row').toEqual([])
  })
})
