// Unit tests for the sentence FR-032 gained on 2026-09-01, which defect D-171
// is the report of.
//
// ⭐ THE SENTENCE, verbatim from docs/spec/01-04-requirements.md (FR-032):
//
//   「⛔⛔ **導出元の `Task` が名前を持たないときは、行の名前を既定の名前に確定
//     させること（MUST）。名前が無いことを理由に削除を拒んではならない
//     （MUST NOT）** —— ⭐ **語は `FR-038` の辞書が持ち、ここに綴らない。**」
//
// and the two sentences above it that it qualifies rather than replaces:
//
//   「**`Task` を消す前に、その `Task` を名前の導出元にしている行の名前を確定
//     させ、`derivedFromTaskUid` を空にすること（MUST）。名前も導出元も無い行を
//     残してはならない（MUST NOT）**」
//   「**行そのものは消さない**」
//
// ⚠️ WHY THIS IS THE ORDINARY CASE AND NOT AN EDGE. FR-032 says so itself --
// 「⚠️ **この場合は例外ではなく、最も普通に起きる**」 -- because FR-001 (MUST)
// makes a drag onto empty space produce a `Task` with no name AND a row that
// takes its name from that very task, at one stroke: 「**その場で作った行は名前
// の指定を持たないので、載せたタスクをその行の名前の導出元とすること（MUST）**」.
// ⇒ 「**描いたばかりのタスクは必ずこの形になる。**」 ⛔ So the first case below
// does not hand-build the shape; it asks FR-001 for it, which is the only way to
// be sure the shape under test is the one the reader actually meets.
//
// ⭐ Every expectation is read off docs/spec and off the manuscript FR-038
// points at -- never off the unit (Chapter 1.9; docs/development-rules/
// 04-verification.md section 1). ⛔ No file under `src/` was opened. The
// commands are reached through `edit-document.ts`, the public entry of the
// component (Chapter 5.3).
//
// Test placement is TS-6 of table T-218: tests/unit/.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type {
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
} from '../../src/entity/document-model/schedule/schedule'
import {
  editTask,
  editTaskGroup,
  type EditResult,
  type TaskCommand,
  type TaskGroupCommand,
} from '../../src/use-case/edit-document/edit-document'

// ---------------------------------------------------------------------------
// The word, read from the manuscript FR-032 sends the reader to.
// ---------------------------------------------------------------------------

/**
 * Chapter 6.2 (MUST) fixes the manuscript of FR-038's dictionary here, and
 * FR-032 refuses to spell the word itself: 「⭐ **語は `FR-038` の辞書が持ち、
 * ここに綴らない。**」
 *
 * ⛔ SO NEITHER MAY THIS FILE. A test that typed 「名前なし」 would hold the unit
 * to a word this file had chosen, and the user's next edit of the manuscript
 * would leave the screen and this file disagreeing in silence with nothing red.
 */
const MANUSCRIPT_PATH = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')

/** One entry of the `defaultNames` section: what the default is for, and its words. */
interface DefaultName {
  readonly use: string
  readonly text: Readonly<Record<string, string>>
}

/**
 * The words the manuscript holds for the default a ROW is settled to.
 *
 * ⭐ KEYED BY `use: "row"` AND NOT BY POSITION: FR-032 names one use -- the row
 * -- and a second use added to the section must not silently become the one this
 * file reads.
 *
 * ⚠️ ALL THE LANGUAGES, AS A SET, AND THAT IS DELIBERATE. FR-038 gives the
 * dictionary two languages; a settled `TaskGroup.label` is ONE string in the
 * document and FR-038 (MUST NOT) keeps the reader's language out of the document
 * entirely -- 「どの言語で開くかは読む人の環境であり、文書に保存しない
 * （MUST NOT）」 -- while FR-032 names no language at all. ⛔ Pinning one here
 * would record the implementation's choice as though the specification had made
 * it, which Chapter 1.9 forbids. ⭐ What IS asserted is the claim the
 * specification does make: the settled label is a word of this section and not a
 * literal someone typed into a unit (FR-038, MUST NOT).
 */
const DEFAULT_ROW_NAMES: readonly string[] = (() => {
  const manuscript = JSON.parse(readFileSync(MANUSCRIPT_PATH, 'utf8')) as {
    readonly defaultNames?: readonly DefaultName[]
  }
  const forTheRow = (manuscript.defaultNames ?? []).find((one) => one.use === 'row')
  if (forTheRow === undefined) {
    throw new Error(
      'FR-032 (MUST) settles a row to a default name and leaves the word to FR-038 s dictionary, ' +
        'but the manuscript holds no defaultNames entry with use "row"',
    )
  }
  return Object.values(forTheRow.text).filter((word) => word !== '')
})()

// ---------------------------------------------------------------------------
// Fixtures. ⚠️ Every nullable column of tables T-019a and T-058 is spelled
// `null`: an `undefined` reads as "set" and would let a case pass for the wrong
// reason.
// ---------------------------------------------------------------------------

const jan = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    // ⭐ THE DEFAULT IS `null`, WHICH IS THE WHOLE SUBJECT OF THIS FILE. FR-032's
    // new sentence is about the source `Task` having no name, and every case
    // that wants a named one says so.
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

/** AT-54 / IV-8: `label` and `derivedFromTaskUid` are never both null. */
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

const memberOf = (taskUid: number, groupId: string): TaskGroupMember =>
  ({ taskUid, groupId, stackOrder: null }) as unknown as TaskGroupMember

const visualOf = (taskUid: number): Record<string, unknown> => ({
  taskUid,
  nameAnchor: null,
  nameAlign: null,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
})

/** All twelve arrays of the schedule group (DR-2 of table T-052) are present. */
const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: 214,
      uidHighWaterMark: 10, // AT-20
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

/**
 * The settings rows both aggregates read, each at its table value. ⚠️ A row a
 * cascade reads and the fixture forgets makes an answer `NaN` or an array
 * `undefined`, and the case would then fail for a reason the specification never
 * states.
 */
const SETTINGS = {
  importMinDate: '1970-01-01', // S-119
  importMaxDate: '2200-12-31', // S-120
  actualInitialDuration: 1, // S-129
  milestoneActualDuration: 0, // S-130
  maxGroupDepth: 5, // S-125
  pinnedGroupIds: [], // S-126
  pinnedRowMax: 5, // S-127
  scrollDate: null,
  scrollGroupId: null, // S-78
  stackSafetyCap: 255, // S-89
}

const documentOf = (schedule: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleOf(schedule),
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/**
 * The document an accepted edit answers with.
 *
 * ⭐ THE MESSAGE CARRIES THE REFUSING RULE, which is what makes a red here read
 * as D-171 rather than as "something went wrong": the defect's own measurement
 * is that `CM-7` / `IV-8` refused, and the plan was then dropped whole.
 */
const accepted = (result: EditResult, what: string): Document => {
  expect(
    result.ok,
    `FR-032 (MUST NOT): 「名前が無いことを理由に削除を拒んではならない」 -- ${what} was refused: ` +
      (result.ok ? '' : result.refusals.map((one) => `${one.rule}: ${one.what}`).join('; ')),
  ).toBe(true)
  if (!result.ok) throw new Error('refused')
  return result.document
}

const groupIn = (document: Document, id: string): TaskGroup | undefined =>
  document.schedule.taskGroups.find((group) => group.id === id)

const deleteTask = (document: Document, uid: number): EditResult =>
  editTask(document, { kind: 'deleteTask', uid } as TaskCommand)

const deleteTaskGroup = (document: Document, groupId: string): EditResult =>
  editTaskGroup(document, { kind: 'deleteTaskGroup', groupId } as TaskGroupCommand)

// ---------------------------------------------------------------------------
// The manuscript itself, before anything is asked of a unit.
// ---------------------------------------------------------------------------

describe('FR-032 / FR-038 -- the word the default name is settled to', () => {
  it('FR-032 leaves the word to FR-038 -> the manuscript is read -> the row s default is written in both languages', () => {
    // ⛔ GOES RED IF: the `defaultNames` entry keyed `use: "row"` leaves
    // `docs/spec/_source/display-words.json`, is re-keyed, or has a cell
    // emptied. ⭐ An empty cell is not a cell PD-160 leaves to the user here:
    // FR-032 (MUST) settles the row TO this word, and settling a row to the
    // empty string leaves a row that shows no name at all, which is the state
    // AT-54 exists to forbid.
    // ⚠️ Two, because FR-038 fixes the target languages: 「対象は `ja` と `en`
    // の 2 言語とする」.
    expect(
      DEFAULT_ROW_NAMES,
      'FR-032 (MUST): the row is settled to this word, so an empty cell settles it to nothing',
    ).toHaveLength(2)
    for (const word of DEFAULT_ROW_NAMES) expect(word.trim()).not.toBe('')
  })
})

// ---------------------------------------------------------------------------
// D-171 itself: draw a task onto empty space, then delete it.
// ---------------------------------------------------------------------------

describe('FR-032 (D-171) -- a Task drawn onto empty space can be deleted', () => {
  /**
   * The document FR-001 leaves behind after a drag onto empty space: the task
   * it made carries no name, and the row it made for it takes its name from
   * that task.
   *
   * ⭐ ASKED OF FR-001 RATHER THAN WRITTEN OUT. The defect is that the two
   * requirements meet, so a fixture that hand-built the shape would be this
   * file's reading of FR-001 rather than the unit's -- and if FR-001 ever stops
   * producing this shape, the case should stop claiming it does.
   */
  const drawnOntoEmptySpace = (): { readonly document: Document; readonly uid: number } => {
    const made = accepted(
      editTask(documentOf(), {
        kind: 'createTask',
        shapeKind: 'rectangle',
        start: jan(5),
        finish: jan(9),
        // FR-001 (MUST): 「指す `TaskGroup` が無いときは行を 1 つ作ってそこへ
        // 載せること」 -- so naming a row the document does not hold is how the
        // drag onto empty space is spelled.
        groupId: 'drawn',
      } as TaskCommand),
      'FR-001 s drag onto empty space',
    )
    const task = made.schedule.tasks[0]
    expect(task, 'FR-001 (MUST) makes a Task for the drag, and none is in the document').toBeDefined()
    // ⛔ THE PRECONDITION OF EVERY CASE BELOW, asserted rather than assumed: if
    // FR-001 ever gave the drawn task a name, or gave the row a label of its
    // own, D-171's shape would not arise and the cases would be testing air.
    expect(task!.name, 'FR-001 (MUST): a task drawn onto empty space carries no name').toBeNull()
    const row = groupIn(made, 'drawn')
    expect(row?.label, 'FR-001 (MUST): 「その場で作った行は名前の指定を持たない」').toBeNull()
    expect(
      row?.derivedFromTaskUid,
      'FR-001 (MUST): 「載せたタスクをその行の名前の導出元とすること」',
    ).toBe(task!.uid)
    return { document: made, uid: task!.uid }
  }

  it('⛔ MUST NOT refuse the delete for want of a name -> the drawn task is deleted -> the edit is accepted and the task is gone', () => {
    // ⛔ GOES RED IF: the refusal D-171 measured comes back -- `deleteTask`
    // asking for 「group.label ?? source?.name ?? null」 and finding neither, so
    // that `CM-7` / `IV-8` rejects and 表 T-067's `WS-3` drops the whole plan.
    // ⭐ THIS IS THE DEFECT AS THE READER MET IT: 「⛔⛔ **拒むと、そうして描いた
    // タスクが 1 つも消せなくなる**」, and 「⛔⛔ **`Ctrl+A` は関係ない** ——
    // **1 つだけ選んでも消せない。**」 -- so one task, selected alone, is the
    // whole of the reproduction.
    const { document, uid } = drawnOntoEmptySpace()
    const after = accepted(deleteTask(document, uid), 'the delete of the drawn task')
    expect(
      after.schedule.tasks.map((task) => task.uid),
      'FR-032 (MUST): 「選ばれたタスク…を削除し」',
    ).toEqual([])
  })

  it('FR-032 keeps the row -> the drawn task is deleted -> the row is still there, with a name and no derivation source', () => {
    // ⛔ GOES RED IF: the row is deleted with the task (FR-032: 「行そのものは
    // 消さない」 -- HM-6 of table T-015a keeps its name, colour, height and
    // collapsed state), or `derivedFromTaskUid` is left pointing at a `Task`
    // the document no longer holds (IV-2), or the label is left `null` while
    // the source is emptied, which is the very row AT-54 / IV-8 forbid.
    // ⭐ ALL THREE ARE ONE SENTENCE OF FR-032: 「その `Task` を名前の導出元にして
    // いる行の名前を確定させ、`derivedFromTaskUid` を空にすること（MUST）。名前も
    // 導出元も無い行を残してはならない（MUST NOT）」.
    const { document, uid } = drawnOntoEmptySpace()
    const after = accepted(deleteTask(document, uid), 'the delete of the drawn task')

    const row = groupIn(after, 'drawn')
    expect(row, 'FR-032: 「行そのものは消さない」').toBeDefined()
    expect(
      row?.derivedFromTaskUid,
      'FR-032 (MUST): 「`derivedFromTaskUid` を空にすること」',
    ).toBeNull()
    expect(
      typeof row?.label === 'string' && row.label.trim() !== '',
      'FR-032 (MUST NOT): 「名前も導出元も無い行を残してはならない」 (AT-54 / IV-8)',
    ).toBe(true)
  })

  it('FR-038 owns the word -> the drawn task is deleted -> the settled label is the manuscript s, not a literal', () => {
    // ⛔ GOES RED IF: the unit settles the row to anything the manuscript does
    // not hold -- an empty string, the row id, `'(no name)'`, or a Japanese or
    // English string spelt into `src/`. ⭐ THAT LAST ONE IS THE POINT: FR-038
    // (MUST NOT) admits one store of printed words -- 「画面に刷る語は、言語ごと
    // の辞書として 1 か所に持つこと（MUST）。要求にも表にも語そのものを書いては
    // ならない（MUST NOT）」 -- and FR-032 hands this word to it by name.
    //
    // ⚠️ WHICH OF THE TWO IS NOT ASSERTED, AND THAT IS A GAP IN THE
    // SPECIFICATION RATHER THAN A LOOSENING HERE. The settled label is a
    // `TaskGroup.label`, so FR-038 puts it beyond translation -- 「**タスク名と
    // 行名、および表 T-016 の項目名は翻訳の対象ではない**」 -- and forbids the
    // reader's language being saved into the document at all (MUST NOT). ⇒ ONE
    // of the two words is written and kept for every reader, and no row of
    // docs/spec says which. ⛔ Pinning one here would settle a question the
    // reader has not been asked.
    const { document, uid } = drawnOntoEmptySpace()
    const after = accepted(deleteTask(document, uid), 'the delete of the drawn task')

    expect(
      DEFAULT_ROW_NAMES,
      'FR-032 (MUST): 「⭐ **語は `FR-038` の辞書が持ち、ここに綴らない。**」 -- ' +
        `the row was settled to ${JSON.stringify(groupIn(after, 'drawn')?.label)}, which the ` +
        'defaultNames entry keyed use "row" does not hold in either language',
    ).toContain(groupIn(after, 'drawn')?.label)
  })
})

// ---------------------------------------------------------------------------
// CM-27: the same shape reached through the cascade of table T-050's CD-2.
// ---------------------------------------------------------------------------

describe('FR-032 (D-171) -- the cascade of a deleted row takes a nameless Task the same way', () => {
  /**
   * `g1` is the row about to go; `kept` is a row that survives it but takes its
   * name from a `Task` the cascade carries off.
   *
   * ⭐ HOW THE CASCADE REACHES IT: task 4 is a WBS child of task 1, which
   * table T-015a's `HM-10` lets sit on another row. `CD-2` takes every `Task`
   * on `g1` and `CD-1` takes each one's WBS descendants -- so deleting `g1`
   * takes task 4 off `kept`, and `kept` loses its derivation source without
   * being deleted itself.
   * ⚠️ Task 4 carries NO NAME, which is the only difference from the case
   * `edit-task-group.test.ts` already holds, and the whole of D-171: 「⛔ **同じ
   * 判断が `edit-task-group.ts` の `CM-27` にもあり、2 か所を一緒に直す。**」
   */
  const before = documentOf({
    taskGroups: [groupOf({ id: 'g1' }), groupOf({ id: 'kept', label: null, derivedFromTaskUid: 4, color: 'blue' })],
    tasks: [taskOf({ uid: 1 }), taskOf({ uid: 4, wbsParentUid: 1 })],
    taskGroupMembers: [memberOf(1, 'g1'), memberOf(4, 'kept')],
    taskVisuals: [visualOf(1), visualOf(4)],
  })

  it('⛔ MUST NOT refuse the row delete for want of a name -> g1 is deleted -> the edit is accepted', () => {
    // ⛔ GOES RED IF: `CM-27` keeps the refusal D-171 found in it. ⚠️ This is
    // the second of the two places the defect names, and it is reached by a
    // different entrance -- FR-032 makes the row delete ask a confirmation and
    // the task delete not, so a repair made in one aggregate alone leaves the
    // reader able to delete a drawn task but not the row it sits beside.
    const after = accepted(deleteTaskGroup(before, 'g1'), 'the delete of row g1')
    expect(
      after.schedule.tasks.map((task) => task.uid),
      'CD-2 takes every Task on the row, and CD-1 takes each one s WBS descendants',
    ).toEqual([])
  })

  it('FR-032 settles the surviving row -> g1 is deleted -> kept holds the manuscript s word and no derivation source', () => {
    // ⛔ GOES RED IF: `kept` is deleted along with `g1` (it is not 配下の行 --
    // `CD-2` takes 「配下の行」 by `parentId`, and `kept` has none), if its
    // `derivedFromTaskUid` still names task 4, or if the settled label is
    // anything the manuscript does not hold.
    // ⭐ HM-6 of table T-015a is why the colour is read too: 「名前・色・高さ・
    // 畳み状態を保つ」 -- settling the name must not reset the rest of the row.
    const after = accepted(deleteTaskGroup(before, 'g1'), 'the delete of row g1')

    const row = groupIn(after, 'kept')
    expect(row, 'FR-032: 「行そのものは消さない」').toBeDefined()
    expect(row?.derivedFromTaskUid, 'FR-032 (MUST): 「`derivedFromTaskUid` を空にすること」').toBeNull()
    expect(
      DEFAULT_ROW_NAMES,
      'FR-032 (MUST): the source Task had no name, so the row settles to FR-038 s default -- ' +
        `it settled to ${JSON.stringify(row?.label)}`,
    ).toContain(row?.label)
    expect(row?.color, 'HM-6 of table T-015a keeps the row s colour').toBe('blue')
  })
})

// ---------------------------------------------------------------------------
// The guard on the repair: the default is for the nameless case ONLY.
// ---------------------------------------------------------------------------

describe('FR-032 -- a source Task that HAS a name still settles the row to that name', () => {
  it('FR-058 gives the row the source Task s name -> a named task is deleted -> the row holds that name and not the default', () => {
    // ⛔ GOES RED IF: the repair over-reaches and settles every row to the
    // default -- the cheapest wrong fix for D-171, and one that would silently
    // throw away every derived row name in the document.
    // ⭐ FR-058 is the sentence being protected: 「器の名前を指定しなかった行は、
    // その行の導出元となったタスクの名前を表示する」, and FR-032's new sentence
    // is conditioned on 「導出元の `Task` が名前を持たないとき」 -- so a named
    // source is outside its scope entirely.
    const document = documentOf({
      taskGroups: [groupOf({ id: 'g1', label: null, derivedFromTaskUid: 1 })],
      tasks: [taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9) })],
      taskGroupMembers: [memberOf(1, 'g1')],
      taskVisuals: [visualOf(1)],
    })

    const after = accepted(deleteTask(document, 1), 'the delete of a named task')
    const row = groupIn(after, 'g1')
    expect(row?.label, 'FR-058: the row shows the name of the Task it derived from').toBe('Design')
    expect(row?.derivedFromTaskUid).toBeNull()
    // ⚠️ Held explicitly, because 'Design' happening not to be the default word
    // is the whole content of the claim: if the manuscript ever held it, this
    // case would be passing while asserting nothing.
    expect(
      DEFAULT_ROW_NAMES,
      'the fixture s name must differ from the default, or this case cannot tell the two apart',
    ).not.toContain('Design')
  })

  it('the same through the cascade -> a row is deleted -> a surviving row keeps its named source s name', () => {
    // ⛔ GOES RED IF: the repair in `CM-27` settles to the default whenever it
    // settles at all. ⚠️ The two aggregates are repaired together (D-171), so
    // the guard is owed to both.
    const document = documentOf({
      taskGroups: [groupOf({ id: 'g1' }), groupOf({ id: 'kept', label: null, derivedFromTaskUid: 4 })],
      tasks: [taskOf({ uid: 1 }), taskOf({ uid: 4, wbsParentUid: 1, name: 'Detail A' })],
      taskGroupMembers: [memberOf(1, 'g1'), memberOf(4, 'kept')],
      taskVisuals: [visualOf(1), visualOf(4)],
    })

    const after = accepted(deleteTaskGroup(document, 'g1'), 'the delete of row g1')
    const row = groupIn(after, 'kept')
    expect(row?.label, 'FR-058: the row shows the name of the Task it derived from').toBe('Detail A')
    expect(row?.derivedFromTaskUid).toBeNull()
    expect(DEFAULT_ROW_NAMES).not.toContain('Detail A')
  })
})
