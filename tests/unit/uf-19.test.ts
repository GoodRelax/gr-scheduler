// Unit tests for ImportDocument (unit UF-19 of table T-075, component CP-10).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// Every case below is driven by the requirements, never by the implementation:
//   FR-087 with table T-024a  -- OP-1 .. OP-10, the whole of 「開く」
//   FR-022 with table T-032a  -- MM-1 .. MM-4, and the MUST NOT against
//                                deciding same-or-different for the person
//   FR-056 with table T-032   -- MG-1 .. MG-13, the whole of 合流
//   FR-023                    -- what is refused (reached here through OP-5)
//   FR-015                    -- 重ね, the third answer to OP-3
//   FR-074 with table T-224   -- the ten columns MG-4 calls プロジェクトの基本情報
//   FR-032 with table T-050   -- what a merge may not orphan (CD-1 / CD-2),
//                                which is IV-2 of table T-220 read forward
//   table T-027 UN-6          -- 合流での上書き is undoable, 置き換え is not
//
// Chapter 1.9 asks a test of a requirement that POINTS AT A TABLE to be driven
// by a fixed copy of that table rather than by a re-reading of the prose, so
// `T_224`, `T_032a` and `T_050` below are copies, and the cases loop over them.
//
// ⚠️ The unit settles nothing (CP-8 owns the one write path, MS-1). It answers
// with a new document or a refusal, so "the document was not changed" is tested
// as "the answer was a refusal" -- exactly what MG-6 needs.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Assignment,
  Calendar,
  CommentBox,
  Project,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskOrigin,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  importDocument,
  type ImportOutcome,
  type ImportReport,
  type ImportRequest,
  type MergeChoices,
} from '../../src/use-case/import-document/import-document'

// --------------------------------------------------------------- fixtures ----

// ⚠️ Every nullable column of table T-058 is spelled `null`, never left out. A
// column left `undefined` reads as "held" to anything that asks whether the row
// has one, and both MG-4 (does the profile conflict?) and MG-1 (is this the
// same master?) are decided by exactly that question.
const projectOf = (part: Partial<Project> = {}): Project => ({
  id: null,
  name: null,
  title: null,
  subject: null,
  category: null,
  company: null,
  manager: null,
  author: null,
  created: null,
  revision: null,
  lastSaved: null,
  startDate: null,
  statusDate: null,
  minutesPerDay: null,
  minutesPerWeek: null,
  daysPerMonth: null,
  weekStartDay: null,
  calendarUid: null,
  themeHue: 214,
  uidHighWaterMark: 0,
  importSeq: 0,
  carry: {},
  carryElements: [],
  ...part,
})

const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
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
})

const groupOf = (part: Partial<TaskGroup> & { readonly id: string }): TaskGroup => ({
  parentId: null,
  label: null,
  derivedFromTaskUid: null,
  order: 0,
  isCollapsed: null,
  isHidden: null,
  color: null,
  height: null,
  ...part,
})

const visualOf = (part: Partial<TaskVisual> & { readonly taskUid: number }): TaskVisual => ({
  nameAnchor: null,
  nameAlign: null,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
  ...part,
})

const originOf = (
  part: Partial<TaskOrigin> & { readonly taskUid: number; readonly sourceUid: number },
): TaskOrigin => ({
  sourceProjectUid: null,
  lastSeenImportSeq: 0,
  importSessionId: null,
  ...part,
})

const calendarOf = (part: Partial<Calendar> & { readonly uid: number }): Calendar => ({
  name: null,
  isBaseCalendar: null,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [],
  exceptions: [],
  ...part,
})

const resourceOf = (part: Partial<Resource> & { readonly uid: number }): Resource => ({
  name: null,
  resourceKind: null,
  isCostResource: null,
  calendarUid: null,
  carry: {},
  carryElements: [],
  ...part,
})

const assignmentOf = (part: Partial<Assignment> & { readonly uid: number }): Assignment => ({
  taskUid: null,
  resourceUid: null,
  carry: {},
  carryElements: [],
  ...part,
})

const commentBoxOf = (part: Partial<CommentBox> & { readonly id: string }): CommentBox => ({
  leaderShapeKind: null,
  text: null,
  anchorDate: null,
  anchorGroupId: null,
  bodyOffsetPx: null,
  ...part,
})

const memberOf = (taskUid: number, groupId: string): TaskGroupMember => ({
  taskUid,
  groupId,
  stackOrder: null,
})

// A whole `DocumentSettings` is far more than these cases read, so the fixture
// carries the keys they touch -- and carries them on BOTH sides, so a key that
// happens to be absent can never be mistaken for a conflict by MG-12.
// `scrollDate` / `scrollGroupId` are S-77 / S-78, which OP-10 reads.
const SETTINGS_BASE = {
  scrollDate: '2026-01-05',
  scrollGroupId: 'g1',
  pinnedGroupIds: [] as readonly string[],
  rowGap: 6,
  stackDirection: 'up',
  fontScale: 'M',
  fontScaleSizes: { S: 12, M: 14, L: 16 },
  zoomX: 1,
  zoomY: 1,
  exportPngScale: 1,
  baselineVisible: true,
  dependencyVisible: true,
  dependencyLagDefault: 0,
} as const

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_BASE, ...part }) as unknown as DocumentSettings

const scheduleOf = (part: Partial<Schedule> = {}): Schedule => ({
  project: projectOf(),
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
})

const documentOf = (
  part: { schedule?: Partial<Schedule>; documentSettings?: Record<string, unknown> } = {},
): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleOf(part.schedule),
    documentSettings: settingsOf(part.documentSettings),
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

/**
 * A document whose tasks all sit on one row. IV-6 of table T-220 wants exactly
 * one `TaskGroupMember` per `Task` and FR-058 forbids leaving a `Task` off a
 * row, so no fixture here builds a task without one.
 */
const rowed = (
  tasks: readonly Task[],
  part: Partial<Schedule> = {},
  documentSettings: Record<string, unknown> = {},
): Document =>
  documentOf({
    schedule: {
      tasks,
      taskGroups: [groupOf({ id: 'g1', label: 'row 1', order: 0 })],
      taskGroupMembers: tasks.map((task) => memberOf(task.uid, 'g1')),
      ...part,
    },
    documentSettings,
  })

const answersOf = (part: Partial<MergeChoices> = {}): MergeChoices => ({
  mapping: null,
  profileConflict: null,
  settingsConflict: null,
  ...part,
})

const requestOf = (part: Partial<ImportRequest> = {}): ImportRequest => ({
  current: rowed([]),
  incoming: rowed([]),
  format: 'grsJson',
  choice: 'merge',
  // OP-5 has already run: FR-023 passed. This unit is told, it does not check.
  validationPassed: true,
  // OP-8: nothing else is open.
  anotherOpenInProgress: false,
  // OP-4: answered, or there was nothing unsaved.
  unsavedEditsDiscardConfirmed: true,
  merge: null,
  defaultSettings: settingsOf(),
  importSessionId: 'session-1',
  ...part,
})

const accepted = (outcome: ImportOutcome): { document: Document; report: ImportReport } => {
  expect(outcome.ok).toBe(true)
  if (!outcome.ok) throw new Error(`refused: ${JSON.stringify(outcome.refusal)}`)
  return { document: outcome.document, report: outcome.report }
}

const taskIn = (document: Document, uid: number): Task | undefined =>
  document.schedule.tasks.find((task) => task.uid === uid)

const rowOf = (document: Document, uid: number): string | undefined =>
  document.schedule.taskGroupMembers.find((member) => member.taskUid === uid)?.groupId

// ------------------------------------------------- OP-8 / OP-5 / OP-4 gates ----

describe('ImportDocument (UF-19) -- the gates of table T-024a', () => {
  it('OP-8 refuses while another open or import is running', () => {
    // 「取込または別の開く操作が進行中のあいだは受け付けないこと（MUST NOT）」
    // —— 「取込前の状態」が決まらなくなる（表 T-032 の MG-6）.
    const outcome = importDocument(requestOf({ anotherOpenInProgress: true }))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.rule).toBe('OP-8')
  })

  it('OP-5 refuses input that has not passed FR-023', () => {
    // 「経路によらず `FR-023` の検証を通すこと（MUST）」. FR-023 itself says
    // 「部分的に適用してはならない（MUST NOT）」, so nothing of the file may
    // reach the document before the validation has passed.
    const outcome = importDocument(requestOf({ validationPassed: false }))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.rule).toBe('OP-5')
  })

  it('OP-5 is answered before any question OP-3 leads to', () => {
    // 「`OP-3` を問う前に通すこと（MUST）」 —— 後に回すと、検証で弾かれる入力の
    // ために現在の文書を先に捨てることになる。So a request that both failed the
    // validation AND is missing FR-022's answer must come back as OP-5: the
    // person is never asked about input that is going to be thrown away.
    const outcome = importDocument(
      requestOf({
        validationPassed: false,
        current: rowed([taskOf({ uid: 1, name: 'a' })]),
        incoming: rowed([taskOf({ uid: 1, name: 'b' })]),
        merge: null,
      }),
    )
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.rule).toBe('OP-5')
  })

  it('OP-4 refuses a 置き換え whose unsaved edits were not confirmed', () => {
    // 「置き換えを選んだときは、捨てる前に確認を求めること（MUST）。黙って
    // 捨ててはならない（MUST NOT）」.
    const outcome = importDocument(
      requestOf({ choice: 'replace', unsavedEditsDiscardConfirmed: false }),
    )
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.rule).toBe('OP-4')
  })

  it('OP-4 asks nothing of a 合流', () => {
    // 「合流を選んだときは現在の文書を捨てないので、この確認は要らない」.
    const outcome = importDocument(
      requestOf({ choice: 'merge', unsavedEditsDiscardConfirmed: false }),
    )
    expect(outcome.ok).toBe(true)
  })

  it('OP-4 asks nothing of a 重ね either', () => {
    // OP-9: 「現在の文書を置き換えも合流もしないこと（MUST NOT）」 —— nothing is
    // discarded, and OP-4's confirmation is scoped to 置き換え.
    const outcome = importDocument(
      requestOf({ choice: 'baseline', unsavedEditsDiscardConfirmed: false }),
    )
    expect(outcome.ok).toBe(true)
  })
})

// ------------------------------------------------------- OP-3 / OP-6 / OP-10 ----

describe('ImportDocument (UF-19) -- OP-3 置き換え', () => {
  it('OP-3 置き換え puts the read schedule in place of the current one', () => {
    // 「置き換える（現在の文書を捨てて新しい日程を出す）」.
    const { document, report } = accepted(
      importDocument(
        requestOf({
          choice: 'replace',
          current: rowed([taskOf({ uid: 1, name: 'old' })]),
          incoming: rowed([taskOf({ uid: 9, name: 'new' })]),
        }),
      ),
    )
    expect(document.schedule.tasks.map((task) => task.uid)).toEqual([9])
    expect(taskIn(document, 9)!.name).toBe('new')
    expect(report.choice).toBe('replace')
  })

  it('OP-4 / UN-6: a 置き換え carries no history and is not undoable', () => {
    // OP-4: 「取り消しの履歴は引き継がない」. UN-6 of table T-027 names it in as
    // many words: 「⚠️ 置き換え（`OP-3`）は対象外 —— 取り消しの履歴を引き継が
    // ないので戻せない（`OP-4`）」.
    const { report } = accepted(importDocument(requestOf({ choice: 'replace' })))
    expect(report.discardsHistory).toBe(true)
    expect(report.undo).toBe('notUndoable')
  })

  it('UN-6: 合流での上書き is undoable and discards no history', () => {
    // UN-6 files 合流での上書き（表 T-032a の `MM-1`）under 対象.
    const { report } = accepted(
      importDocument(
        requestOf({
          choice: 'merge',
          current: rowed([taskOf({ uid: 1, name: 'a' })]),
          incoming: rowed([taskOf({ uid: 1, name: 'b' })]),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(report.undo).toBe('oneStep')
    expect(report.discardsHistory).toBe(false)
  })

  it('OP-6 fills a missing setting from the default and keeps a key it does not know', () => {
    // 「文書のデータと `documentSettings` を復元すること。欠けている設定値は
    // 既定値で補い、知らないキーは捨てずに保つ（往復で失わないため）」.
    const fromFile = settingsOf({ rowGap: 21, futureKeyNobodyKnows: 'kept' }) as unknown as Record<
      string,
      unknown
    >
    delete fromFile['fontScale']
    const incoming = {
      ...rowed([taskOf({ uid: 9 })]),
      documentSettings: fromFile as unknown as DocumentSettings,
    } as Document

    const { document } = accepted(
      importDocument(
        requestOf({
          choice: 'replace',
          format: 'grsJson',
          incoming,
          defaultSettings: settingsOf({ fontScale: 'L', rowGap: 6 }),
        }),
      ),
    )
    const settings = document.documentSettings as unknown as Record<string, unknown>
    // the file's own value wins where the file has one,
    expect(settings['rowGap']).toBe(21)
    // the default fills the one the file was missing,
    expect(settings['fontScale']).toBe('L')
    // and the key nobody knows survives the round trip.
    expect(settings['futureKeyNobodyKnows']).toBe('kept')
  })
})

/**
 * OP-10 read as a fixed table. 表示位置 is the pair S-77 `scrollDate` and S-78
 * `scrollGroupId` of table T-203; `null` on either is 「人がまだ場所を決めて
 * いない」, and S-78 may also name a row that is not there.
 */
const T_024a_OP10 = [
  { case: 'both resolve', scrollDate: '2026-01-05', scrollGroupId: 'g1', fit: false },
  { case: 'S-77 is null', scrollDate: null, scrollGroupId: 'g1', fit: true },
  { case: 'S-78 is null', scrollDate: '2026-01-05', scrollGroupId: null, fit: true },
  { case: 'S-78 names no row', scrollDate: '2026-01-05', scrollGroupId: 'gone', fit: true },
] as const

describe('ImportDocument (UF-19) -- OP-10 表示位置', () => {
  it('OP-10 asks for the fit when the position is null or names no row', () => {
    // 「表示位置が `null`、または指す行が存在しないとき | `FR-055` の全体表示が
    // 選ぶ倍率と表示位置にすること（MUST）」. The fit itself is not computed
    // here; what OP-10 decides is WHETHER it is required.
    for (const row of T_024a_OP10) {
      const { report } = accepted(
        importDocument(
          requestOf({
            choice: 'replace',
            incoming: rowed(
              [taskOf({ uid: 9 })],
              {},
              { scrollDate: row.scrollDate, scrollGroupId: row.scrollGroupId },
            ),
          }),
        ),
      )
      expect({ case: row.case, fit: report.fitToScreenRequired }).toEqual({
        case: row.case,
        fit: row.fit,
      })
    }
  })
})

// --------------------------------------------------------- OP-9 / FR-015 重ね ----

describe('ImportDocument (UF-19) -- OP-9 重ね', () => {
  it('OP-9 neither replaces nor merges, and puts the file in the overlay frame alone', () => {
    // 「現在の文書を置き換えも合流もしないこと（MUST NOT）。合流させず、重ね
    // 専用の枠へ入れること（MUST）」. FR-015 adds 「重ねる相手を文書に持つこと
    // （MUST）」 -- the frame is `Schedule.baselineTasks`.
    const current = rowed(
      [taskOf({ uid: 1, name: 'now', start: '2026-02-02', finish: '2026-02-06' })],
      { project: projectOf({ name: 'mine', importSeq: 3 }) },
      { rowGap: 6 },
    )
    const incoming = rowed(
      [
        taskOf({ uid: 1, name: 'was', start: '2026-01-05', finish: '2026-01-09' }),
        taskOf({ uid: 3, name: 'only theirs', start: '2026-01-05', finish: '2026-01-09' }),
      ],
      { project: projectOf({ name: 'theirs', importSeq: 9 }) },
      { rowGap: 99 },
    )

    const { document, report } = accepted(
      importDocument(requestOf({ choice: 'baseline', current, incoming })),
    )
    // nothing of the current document moved,
    expect(document.schedule.tasks.map((task) => [task.uid, task.name])).toEqual([[1, 'now']])
    expect(document.schedule.project.name).toBe('mine')
    expect((document.documentSettings as unknown as Record<string, unknown>)['rowGap']).toBe(6)
    // and the read file is in the frame of its own.
    expect(document.schedule.baselineTasks.find((row) => row.uid === 1)?.name).toBe('was')
    expect(report.choice).toBe('baseline')
  })

  it('FR-015 does not draw an overlay task with no counterpart, and says so', () => {
    // 「現在の文書のタスクとの対応づけは `UID` の一致で行うこと（MUST）。対応
    // するタスクが無い重ねる側のタスクは、描かずに知らせること（MUST）」, and
    // 「片側にしか存在しない `Task` は描いてはならない（MUST NOT）」.
    const { report } = accepted(
      importDocument(
        requestOf({
          choice: 'baseline',
          current: rowed([taskOf({ uid: 1, name: 'now' })]),
          incoming: rowed([
            taskOf({ uid: 1, name: 'was' }),
            taskOf({ uid: 3, name: 'only theirs' }),
          ]),
        }),
      ),
    )
    expect(report.baselineTaskUidsNotDrawn).toEqual([3])
  })

  it('MG-1 is not judged outside 合流', () => {
    // FR-056 scopes the whole of table T-032 to 「現在の文書へ合流させるとき」,
    // so MG-1's 出自の判別 does not run on the other two answers to OP-3.
    for (const choice of ['replace', 'baseline'] as const) {
      const { report } = accepted(importDocument(requestOf({ choice })))
      expect({ choice, source: report.source }).toEqual({ choice, source: 'notJudged' })
    }
  })

  // ⛔ Whether 重ね is undoable is NOT decided: table T-027 has no row naming
  // it, and UN-6 covers only 合流での上書き and its 置き換え exception. The unit
  // answers `notDecided`; this case pins that the gap is REPORTED rather than
  // guessed, and must be rewritten the day a row is added to table T-027.
  it('⛔ 重ね has no row in table T-027, so the undo disposition is reported as undecided', () => {
    const { report } = accepted(importDocument(requestOf({ choice: 'baseline' })))
    expect(report.undo).toBe('notDecided')
  })
})

// ------------------------------------------------------- FR-022 / table T-032a ----

/** Table T-032a copied out, one row at a time. */
const T_032a = [
  { row: 'MM-1', choice: '全件を同じものとして扱う', act: '対応付けの候補すべてを上書きする' },
  { row: 'MM-2', choice: '全件を別のものとして取り込む', act: '候補すべてを新しいタスクとして足す' },
  { row: 'MM-3', choice: '1 件ずつ決める', act: '同じ / 別 / 以降すべて同じ / 以降すべて別' },
  { row: 'MM-4', choice: '取込をやめる', act: 'MG-6 に従って取込前の状態へ戻す' },
] as const

describe('ImportDocument (UF-19) -- FR-022 and table T-032a', () => {
  it('FR-022 will not decide same-or-different, and hands back what has to be asked', () => {
    // 「同じか別かを `GRS` が自動で確定してはならない（MUST NOT）」, and
    // 「対応の候補は `UID` の一致で集めること（MUST）」. There are four rows in
    // table T-032a and the unit is given none of them, so the only answer it
    // may give is the question itself.
    expect(T_032a).toHaveLength(4)
    const outcome = importDocument(
      requestOf({
        current: rowed([taskOf({ uid: 1, name: 'ours' }), taskOf({ uid: 2, name: 'unrelated' })]),
        incoming: rowed([taskOf({ uid: 1, name: 'theirs' })]),
        merge: null,
      }),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.refusal.rule).toBe('FR-022')
    if (outcome.refusal.reason !== 'mappingNotChosen') throw new Error('wrong refusal')
    // MG-10 owes a warning BEFORE MM-2 / MM-3 are offered, which needs the
    // names, not a pair of integers.
    expect(outcome.refusal.candidates).toEqual([
      { incomingTaskUid: 1, incomingTaskName: 'theirs', currentTaskUid: 1, currentTaskName: 'ours' },
    ])
  })

  it('MG-2: nothing is asked when no incoming task could correspond', () => {
    // MG-9 makes 一括 the default and 「取込 1 回につき 1 度だけ問うこと」; a
    // question with nothing to ask about is not a question. FR-022 is reached
    // only 「読んだファイルのタスクが現在の文書のタスクに対応するかもしれない
    // とき」.
    const { report } = accepted(
      importDocument(
        requestOf({
          current: rowed([taskOf({ uid: 1, name: 'ours' })]),
          incoming: rowed([taskOf({ uid: 7, name: 'theirs' })]),
          merge: null,
        }),
      ),
    )
    expect(report.candidates).toEqual([])
  })

  it('MM-1 overwrites every candidate', () => {
    // 「全件を同じものとして扱う | 対応付けの候補すべてを上書きする」.
    const { document, report } = accepted(
      importDocument(
        requestOf({
          current: rowed([
            taskOf({ uid: 1, name: 'ours', start: '2026-01-05', finish: '2026-01-09' }),
            taskOf({ uid: 2, name: 'ours too', start: '2026-01-05', finish: '2026-01-09' }),
          ]),
          incoming: rowed([
            taskOf({ uid: 1, name: 'theirs', start: '2026-03-02', finish: '2026-03-06' }),
            taskOf({ uid: 2, name: 'theirs too', start: '2026-03-02', finish: '2026-03-06' }),
          ]),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(document.schedule.tasks.map((task) => [task.uid, task.name])).toEqual([
      [1, 'theirs'],
      [2, 'theirs too'],
    ])
    expect([...report.overwrittenTaskUids].sort()).toEqual([1, 2])
    expect(report.addedTaskUids).toEqual([])
  })

  it('MM-2 adds every candidate as a new task, under a uid FR-001 hands out', () => {
    // 「候補すべてを新しいタスクとして足す。`MG-10` の告知の対象」. The uid of a
    // new task comes from FR-001: 「新しい `Task` の `UID` は
    // `Project.uidHighWaterMark` に従って採ること（MUST）。実在する `UID` の
    // 最大値から採ってはならない（MUST NOT）」 -- AT-20 makes that column
    // 発番済みの `uid` の最大値.
    const current = rowed([taskOf({ uid: 1, name: 'ours' })], {
      project: projectOf({ uidHighWaterMark: 50 }),
    })
    const { document, report } = accepted(
      importDocument(
        requestOf({
          current,
          incoming: rowed([taskOf({ uid: 1, name: 'theirs' })]),
          merge: answersOf({ mapping: { kind: 'allDifferent' } }),
        }),
      ),
    )
    // nothing was overwritten, and the current task is untouched,
    expect(report.overwrittenTaskUids).toEqual([])
    expect(taskIn(document, 1)!.name).toBe('ours')
    // one row was added, above the high-water mark and NOT from the largest
    // uid in use (which would have been 2),
    expect(report.addedTaskUids).toHaveLength(1)
    const addedUid = report.addedTaskUids[0]!
    expect(addedUid).toBeGreaterThan(50)
    expect(addedUid).not.toBe(2)
    expect(document.schedule.project.uidHighWaterMark).toBeGreaterThanOrEqual(addedUid)
    // and MG-10's subject is named, with the uid its master still knows it by.
    expect(report.addedAsDifferent).toEqual([{ incomingTaskUid: 1, taskUid: addedUid }])
  })

  it('MM-3 refuses a candidate that got neither an answer nor 以降すべて', () => {
    // 「候補を 1 件ずつ示し、同じ / 別 / 以降すべて同じ / 以降すべて別 から
    // 選ばせる」 -- a candidate with none of the four is still unanswered, and
    // FR-022's MUST NOT forbids filling it in.
    const outcome = importDocument(
      requestOf({
        current: rowed([taskOf({ uid: 1, name: 'ours' }), taskOf({ uid: 2, name: 'ours too' })]),
        incoming: rowed([taskOf({ uid: 1, name: 'theirs' }), taskOf({ uid: 2, name: 'theirs too' })]),
        merge: answersOf({
          mapping: {
            kind: 'eachCandidate',
            decisions: [{ incomingTaskUid: 1, mapping: 'same' }],
            rest: null,
          },
        }),
      }),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.refusal.rule).toBe('MM-3')
    if (outcome.refusal.reason !== 'candidateNotDecided') throw new Error('wrong refusal')
    expect(outcome.refusal.candidates.map((row) => row.incomingTaskUid)).toEqual([2])
  })

  it("MM-3's 以降すべて同じ answers every candidate that was not named", () => {
    // The last two of MM-3's four are what a person picks in order to stop
    // being asked, so they answer for every candidate left.
    const { document, report } = accepted(
      importDocument(
        requestOf({
          current: rowed([taskOf({ uid: 1, name: 'ours' }), taskOf({ uid: 2, name: 'ours too' })]),
          incoming: rowed([
            taskOf({ uid: 1, name: 'theirs' }),
            taskOf({ uid: 2, name: 'theirs too' }),
          ]),
          merge: answersOf({
            mapping: {
              kind: 'eachCandidate',
              decisions: [{ incomingTaskUid: 1, mapping: 'same' }],
              rest: 'same',
            },
          }),
        }),
      ),
    )
    expect([...report.overwrittenTaskUids].sort()).toEqual([1, 2])
    expect(taskIn(document, 2)!.name).toBe('theirs too')
  })

  it('MM-3 answers one candidate 同じ and another 別 in the same import', () => {
    // 「1 件ずつ決める」 has to be able to differ per candidate, or the row is
    // the same as MM-1 and MM-2.
    const { document, report } = accepted(
      importDocument(
        requestOf({
          current: rowed([taskOf({ uid: 1, name: 'ours' }), taskOf({ uid: 2, name: 'ours too' })], {
            project: projectOf({ uidHighWaterMark: 50 }),
          }),
          incoming: rowed([
            taskOf({ uid: 1, name: 'theirs' }),
            taskOf({ uid: 2, name: 'theirs too' }),
          ]),
          merge: answersOf({
            mapping: {
              kind: 'eachCandidate',
              decisions: [
                { incomingTaskUid: 1, mapping: 'same' },
                { incomingTaskUid: 2, mapping: 'different' },
              ],
              rest: null,
            },
          }),
        }),
      ),
    )
    expect(report.overwrittenTaskUids).toEqual([1])
    expect(taskIn(document, 1)!.name).toBe('theirs')
    expect(taskIn(document, 2)!.name).toBe('ours too')
    expect(report.addedAsDifferent.map((row) => row.incomingTaskUid)).toEqual([2])
  })

  it('MM-4 / MG-6 leaves the document exactly as it was', () => {
    // MM-4: 「`MG-6` に従って取込前の状態へ戻す」. MG-6: 「文書が取込前と完全に
    // 同じ状態であること（MUST）。暦や資源だけが統合済みで残ってはならない」 --
    // for a pure unit that is a refusal: no document comes back at all.
    const outcome = importDocument(
      requestOf({
        current: rowed([taskOf({ uid: 1, name: 'ours' })], {
          calendars: [calendarOf({ uid: 1, name: 'Standard' })],
        }),
        incoming: rowed([taskOf({ uid: 1, name: 'theirs' })], {
          calendars: [calendarOf({ uid: 1, name: 'Standard' })],
          resources: [resourceOf({ uid: 5, name: 'yamada' })],
        }),
        merge: answersOf({ mapping: { kind: 'cancelImport' } }),
      }),
    )
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.rule).toBe('MG-6')
    expect(outcome).not.toHaveProperty('document')
  })
})

// ---------------------------------------------------------- table T-032 rules ----

describe('ImportDocument (UF-19) -- table T-032, the rules of 合流', () => {
  it('MG-7 / FR-022 keeps a task the read file did not have, and says so', () => {
    // MG-7: 「消さずに残し、そのことを知らせるだけにする」. FR-022 states the
    // prohibition: 「取込側に無かったタスクを消してはならない（MUST NOT）」.
    const { document, report } = accepted(
      importDocument(
        requestOf({
          current: rowed([taskOf({ uid: 1, name: 'ours' }), taskOf({ uid: 2, name: 'only ours' })]),
          incoming: rowed([taskOf({ uid: 1, name: 'theirs' })]),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(taskIn(document, 2)).toBeDefined()
    expect(taskIn(document, 2)!.name).toBe('only ours')
    expect(report.taskUidsOnlyInCurrent).toEqual([2])
  })

  it('MG-13 advances importSeq once per import and records it on what came in', () => {
    // 「取込 1 回につき `importSeq`（`S-71`）を 1 つ進め、その回に取り込んだ
    // ものへ記録すること（MUST）」. `S-71` is 取込のたびに +1, kept at
    // `Project.importSeq`; the record is `TaskOrigin.lastSeenImportSeq`
    // (AT-108) with AT-109's `importSessionId`.
    const { document, report } = accepted(
      importDocument(
        requestOf({
          importSessionId: 'session-42',
          current: rowed([taskOf({ uid: 1, name: 'ours' })], {
            project: projectOf({ id: 'P', importSeq: 3 }),
          }),
          incoming: rowed([taskOf({ uid: 7, name: 'theirs' })], {
            project: projectOf({ id: 'P', importSeq: 0 }),
          }),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(document.schedule.project.importSeq).toBe(4)
    expect(report.importSeq).toBe(4)
    const origin = document.schedule.taskOrigins.find((row) => row.sourceUid === 7)
    expect(origin).toBeDefined()
    expect(origin!.lastSeenImportSeq).toBe(4)
    expect(origin!.importSessionId).toBe('session-42')
  })

  it('MG-3 does not duplicate a task that was last taken in as 別のもの', () => {
    // 「前回「別のものとして取り込む」を選んだタスク | 再取込で再び複製しては
    // ならない（MUST NOT）。取込元での出自を保って照合する」. The origin is the
    // only record of that: uid 7 of the master is uid 100 here.
    // FR-022 then allows the pairing even though the uids differ:
    // 「`UID` が一致しないものを候補に含めるかどうかは表 T-032 の `MG-1`」.
    const current = rowed([taskOf({ uid: 100, name: 'ours' })], {
      project: projectOf({ id: 'P', importSeq: 3, uidHighWaterMark: 100 }),
      taskOrigins: [
        originOf({ taskUid: 100, sourceProjectUid: 'P', sourceUid: 7, lastSeenImportSeq: 3 }),
      ],
    })
    const incoming = rowed([taskOf({ uid: 7, name: 'theirs' })], {
      project: projectOf({ id: 'P' }),
    })

    // The answer used here is 全件を別のものとして取り込む -- the one that WOULD
    // duplicate. MG-3's MUST NOT holds whichever of table T-032a's four rows is
    // chosen, so this is the sharp case: uid 7 of the master must not become a
    // second row beside uid 100.
    const { document } = accepted(
      importDocument(
        requestOf({ current, incoming, merge: answersOf({ mapping: { kind: 'allDifferent' } }) }),
      ),
    )
    expect(document.schedule.tasks.map((task) => task.uid)).toEqual([100])
    expect(taskIn(document, 7)).toBeUndefined()
  })

  it('MG-1 judges the read file the same master when the origins name it', () => {
    // 「取り込んだファイルの出自 | 同じ外部 WBS マスタの再取込か、別のマスタかを
    // 判別する」. AT-1 makes `Project.id` the exchange partner's `Project/UID`
    // and AT-106 makes `TaskOrigin.sourceProjectUid` 取り込み元のプロジェクト,
    // so equal values are the one written record of the same master.
    const { report } = accepted(
      importDocument(
        requestOf({
          current: rowed([taskOf({ uid: 100, name: 'ours' })], {
            project: projectOf({ id: 'P', importSeq: 3, uidHighWaterMark: 100 }),
            taskOrigins: [
              originOf({ taskUid: 100, sourceProjectUid: 'P', sourceUid: 7, lastSeenImportSeq: 3 }),
            ],
          }),
          incoming: rowed([taskOf({ uid: 7, name: 'theirs' })], { project: projectOf({ id: 'P' }) }),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(report.source).toBe('sameMaster')
  })

  it('MG-11 lists what arrived last time and did not arrive now', () => {
    // 「前回は届いていて、今回届かなかったタスク | 一覧で示し、作成者が選んで
    // 消せるようにすること」, and MG-13: 「`MG-11` の照合は、この番号で「前回」
    // を特定する —— 他に前回を知る手段が無い」. 前回 is importSeq 3 here, so
    // the row last seen at 2 is not 前回 and is not on the list.
    const { report } = accepted(
      importDocument(
        requestOf({
          current: rowed(
            [taskOf({ uid: 100, name: 'seen last time' }), taskOf({ uid: 200, name: 'older' })],
            {
              project: projectOf({ id: 'P', importSeq: 3, uidHighWaterMark: 200 }),
              taskOrigins: [
                originOf({ taskUid: 100, sourceProjectUid: 'P', sourceUid: 7, lastSeenImportSeq: 3 }),
                originOf({ taskUid: 200, sourceProjectUid: 'P', sourceUid: 8, lastSeenImportSeq: 2 }),
              ],
            },
          ),
          incoming: rowed([taskOf({ uid: 9, name: 'a new one' })], {
            project: projectOf({ id: 'P' }),
          }),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(report.taskUidsMissingSinceLastImport).toEqual([100])
  })

  it('MG-5 unifies an identical calendar, a same-named resource and the same 組 of 割当 without asking', () => {
    // 「内容が同じ暦・同名の担当者・同じ組の割当 | 利用者に問わず 1 つに統合
    // する。問うと合流のたびに同じ確認が積み上がる」.
    const { document } = accepted(
      importDocument(
        requestOf({
          current: rowed([taskOf({ uid: 1, name: 'ours' })], {
            calendars: [calendarOf({ uid: 1, name: 'Standard', ordinal: 0 })],
            resources: [resourceOf({ uid: 5, name: 'yamada' })],
            assignments: [assignmentOf({ uid: 1, taskUid: 1, resourceUid: 5 })],
            project: projectOf({ uidHighWaterMark: 5 }),
          }),
          incoming: rowed([taskOf({ uid: 1, name: 'theirs' })], {
            calendars: [calendarOf({ uid: 2, name: 'Standard', ordinal: 0 })],
            resources: [resourceOf({ uid: 9, name: 'yamada' })],
            assignments: [assignmentOf({ uid: 2, taskUid: 1, resourceUid: 9 })],
          }),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(document.schedule.calendars).toHaveLength(1)
    expect(document.schedule.resources.map((row) => row.name)).toEqual(['yamada'])
    expect(document.schedule.assignments).toHaveLength(1)
  })

  it('MG-8 keeps the look and the row when MSPDI overwrites', () => {
    // 「MSPDI で「上書き」を選んだ | 見た目（色・形状・名称ラベルの位置）と、
    // どの行に載っているかを保つこと（MUST）。置き換えるのは取込元が持つ値だけ
    // であり、MSPDI はこれらを持たない」.
    const { document } = accepted(importDocument(requestOf(LOOK_AND_ROW('mspdi'))))
    expect(document.schedule.taskVisuals.find((row) => row.taskUid === 1)).toEqual(
      visualOf({ taskUid: 1, fillColor: '#111111', shapeKind: 'rectangle', nameAnchor: 3 }),
    )
    expect(rowOf(document, 1)).toBe('g1')
    // 置き換えるのは取込元が持つ値だけ -- the columns MSPDI DOES carry did move.
    expect(taskIn(document, 1)!.name).toBe('theirs')
  })

  it('MG-8a replaces the look and the row when GRS JSON overwrites', () => {
    // 「`GRS JSON` で「上書き」を選んだ | 見た目と行の所属も取込元の値で置き
    // 換えること（MUST）—— `GRS JSON` はこれらを持つので「取込元が持つ値だけを
    // 置き換える」に含まれる」. Same fixture, one field different.
    const { document } = accepted(importDocument(requestOf(LOOK_AND_ROW('grsJson'))))
    expect(document.schedule.taskVisuals.find((row) => row.taskUid === 1)).toEqual(
      visualOf({ taskUid: 1, fillColor: '#999999', shapeKind: 'chevron', nameAnchor: 7 }),
    )
    expect(rowOf(document, 1)).toBe('g2')
  })

  it('MG-12 brings the GRS-only things across', () => {
    // 「`GRS JSON` を合流させた | 本ツール固有のもの（`TaskGroup`・
    // `TaskGroupMember`・依存・注記・担当者）も合流の対象とすること（MUST）」.
    const { document } = accepted(
      importDocument(
        requestOf({
          format: 'grsJson',
          current: rowed([taskOf({ uid: 1, name: 'ours' })], {
            project: projectOf({ uidHighWaterMark: 1 }),
          }),
          incoming: documentOf({
            schedule: {
              tasks: [
                taskOf({ uid: 7, name: 'theirs' }),
                taskOf({ uid: 8, name: 'theirs too', dependencies: [
                  { predecessorUid: 7, linkType: 1, lag: 0, lagFormat: null, carry: {}, carryElements: [] },
                ] }),
              ],
              taskGroups: [groupOf({ id: 'g9', label: 'their row', order: 0 })],
              taskGroupMembers: [memberOf(7, 'g9'), memberOf(8, 'g9')],
              resources: [resourceOf({ uid: 5, name: 'suzuki' })],
              assignments: [assignmentOf({ uid: 1, taskUid: 7, resourceUid: 5 })],
              commentBoxes: [commentBoxOf({ id: 'c1', text: 'note', anchorGroupId: 'g9' })],
            },
          }),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    expect(document.schedule.taskGroups.map((row) => row.id)).toContain('g9')
    expect(rowOf(document, 7)).toBe('g9')
    expect(taskIn(document, 8)!.dependencies.map((row) => row.predecessorUid)).toEqual([7])
    expect(document.schedule.resources.map((row) => row.name)).toContain('suzuki')
    expect(document.schedule.commentBoxes.map((row) => row.id)).toContain('c1')
  })
})

/**
 * The one fixture MG-8 and MG-8a share. The header of the unit says they differ
 * ONLY by the format, so the cases differ only by this argument.
 */
const LOOK_AND_ROW = (format: 'mspdi' | 'grsJson'): Partial<ImportRequest> => ({
  format,
  current: documentOf({
    schedule: {
      tasks: [taskOf({ uid: 1, name: 'ours', start: '2026-01-05', finish: '2026-01-09' })],
      taskGroups: [groupOf({ id: 'g1', label: 'our row', order: 0 })],
      taskGroupMembers: [memberOf(1, 'g1')],
      taskVisuals: [
        visualOf({ taskUid: 1, fillColor: '#111111', shapeKind: 'rectangle', nameAnchor: 3 }),
      ],
      project: projectOf({ uidHighWaterMark: 1 }),
    },
  }),
  incoming: documentOf({
    schedule: {
      tasks: [taskOf({ uid: 1, name: 'theirs', start: '2026-03-02', finish: '2026-03-06' })],
      taskGroups: [groupOf({ id: 'g2', label: 'their row', order: 0 })],
      taskGroupMembers: [memberOf(1, 'g2')],
      taskVisuals: [
        visualOf({ taskUid: 1, fillColor: '#999999', shapeKind: 'chevron', nameAnchor: 7 }),
      ],
    },
  }),
  merge: answersOf({ mapping: { kind: 'allSame' } }),
})

// ------------------------------------------- MG-4 with table T-224, and MG-12 ----

/**
 * Table T-224 copied out. MG-4 calls these プロジェクトの基本情報; the table is
 * 「この面が書く列の全数」, and rows PF-9 / PF-10 are on it even though they are
 * 編集 不可, because they are still values the read file can disagree about.
 */
const T_224 = [
  { row: 'PF-1', column: 'name', ours: 'ours', theirs: 'theirs' },
  { row: 'PF-2', column: 'subject', ours: 'ours', theirs: 'theirs' },
  { row: 'PF-3', column: 'category', ours: 'ours', theirs: 'theirs' },
  { row: 'PF-4', column: 'company', ours: 'ours', theirs: 'theirs' },
  { row: 'PF-5', column: 'manager', ours: 'ours', theirs: 'theirs' },
  { row: 'PF-6', column: 'author', ours: 'ours', theirs: 'theirs' },
  { row: 'PF-7', column: 'revision', ours: 3, theirs: 9 },
  { row: 'PF-8', column: 'startDate', ours: '2026-01-05', theirs: '2026-03-02' },
  { row: 'PF-9', column: 'created', ours: '2026-01-01T00:00:00', theirs: '2026-02-02T00:00:00' },
  { row: 'PF-10', column: 'lastSaved', ours: '2026-01-02T00:00:00', theirs: '2026-02-03T00:00:00' },
] as const satisfies readonly {
  row: string
  column: keyof Project
  ours: string | number
  theirs: string | number
}[]

describe('ImportDocument (UF-19) -- MG-4 and MG-12, the two questions beside the tasks', () => {
  it('MG-4 refuses each column of table T-224 that holds two different values', () => {
    // 「プロジェクトの基本情報が衝突した | タスクとは別に「上書き / 既存を保持
    // / 取込をやめる」から選ばせる」. FR-074 puts the ten columns in table
    // T-224 and says 「本表が、この面が書く列の全数である（MUST）」.
    for (const row of T_224) {
      const outcome = importDocument(
        requestOf({
          current: rowed([], { project: projectOf({ [row.column]: row.ours }) }),
          incoming: rowed([], { project: projectOf({ [row.column]: row.theirs }) }),
          merge: answersOf(),
        }),
      )
      expect({ row: row.row, ok: outcome.ok }).toEqual({ row: row.row, ok: false })
      if (outcome.ok) continue
      expect({ row: row.row, rule: outcome.refusal.rule }).toEqual({ row: row.row, rule: 'MG-4' })
      if (outcome.refusal.reason !== 'profileConflictNotChosen') throw new Error('wrong refusal')
      expect(outcome.refusal.rows).toEqual([row.row])
    }
  })

  it('MG-4 does not ask when the two profiles agree', () => {
    const { report } = accepted(
      importDocument(
        requestOf({
          current: rowed([], { project: projectOf({ author: 'same', revision: 3 }) }),
          incoming: rowed([], { project: projectOf({ author: 'same', revision: 3 }) }),
          merge: answersOf(),
        }),
      ),
    )
    expect(report.choice).toBe('merge')
  })

  it('MG-4 takes the read values on 上書き and keeps the held ones on 既存を保持', () => {
    const sides = {
      current: rowed([], { project: projectOf({ author: 'ours', company: 'ours inc' }) }),
      incoming: rowed([], { project: projectOf({ author: 'theirs', company: 'theirs inc' }) }),
    }
    const overwritten = accepted(
      importDocument(requestOf({ ...sides, merge: answersOf({ profileConflict: 'overwrite' }) })),
    )
    expect([
      overwritten.document.schedule.project.author,
      overwritten.document.schedule.project.company,
    ]).toEqual(['theirs', 'theirs inc'])

    const kept = accepted(
      importDocument(requestOf({ ...sides, merge: answersOf({ profileConflict: 'keepExisting' }) })),
    )
    expect([kept.document.schedule.project.author, kept.document.schedule.project.company]).toEqual([
      'ours',
      'ours inc',
    ])
  })

  it("MG-4's 取込をやめる is MG-6 as well", () => {
    // MG-4 offers the same third answer FR-022 does, and MG-6 owns it:
    // 「文書が取込前と完全に同じ状態であること（MUST）」.
    const outcome = importDocument(
      requestOf({
        current: rowed([], { project: projectOf({ author: 'ours' }) }),
        incoming: rowed([], { project: projectOf({ author: 'theirs' }) }),
        merge: answersOf({ profileConflict: 'cancelImport' }),
      }),
    )
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.rule).toBe('MG-6')
  })

  it('MG-12 refuses when documentSettings conflicts and nothing was chosen', () => {
    // 「文書の設定（`documentSettings`）が衝突したときは、タスクとは別に `MG-4`
    // と同じ選択肢から選ばせること（MUST）」.
    const outcome = importDocument(
      requestOf({
        format: 'grsJson',
        current: rowed([], {}, { rowGap: 6, stackDirection: 'up' }),
        incoming: rowed([], {}, { rowGap: 12, stackDirection: 'down' }),
        merge: answersOf(),
      }),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.refusal.rule).toBe('MG-12')
    if (outcome.refusal.reason !== 'settingsConflictNotChosen') throw new Error('wrong refusal')
    // ⚠️ 「設定の項目ごとに問うてはならない（MUST NOT）」 -- one refusal carrying
    // every key, not one refusal per key.
    expect([...outcome.refusal.keys].sort()).toEqual(['rowGap', 'stackDirection'])
  })

  it('MG-12 applies the one answer to documentSettings as a whole', () => {
    // 「問う粒度は `MG-9` に従い、`documentSettings` 全体へ一括して適用する」 --
    // so both keys move together, never one each way.
    const sides = {
      format: 'grsJson' as const,
      current: rowed([], {}, { rowGap: 6, stackDirection: 'up' }),
      incoming: rowed([], {}, { rowGap: 12, stackDirection: 'down' }),
    }
    const read = (document: Document, key: string): unknown =>
      (document.documentSettings as unknown as Record<string, unknown>)[key]

    const overwritten = accepted(
      importDocument(requestOf({ ...sides, merge: answersOf({ settingsConflict: 'overwrite' }) })),
    )
    expect([read(overwritten.document, 'rowGap'), read(overwritten.document, 'stackDirection')]).toEqual([
      12,
      'down',
    ])

    const kept = accepted(
      importDocument(requestOf({ ...sides, merge: answersOf({ settingsConflict: 'keepExisting' }) })),
    )
    expect([read(kept.document, 'rowGap'), read(kept.document, 'stackDirection')]).toEqual([
      6,
      'up',
    ])
  })
})

// ------------------------------------------ table T-050 read forward (IV-2) ----

/**
 * Table T-050 copied out for the three rows a merge can break. `CD-1` and
 * `CD-2` say what dies WITH a row; read forward, a merge that carried in one
 * half of any of those pairs would leave exactly the dangling reference they
 * exist to prevent -- which is `IV-2` of table T-220: 「外部キーが非 `null` の
 * とき、それが指す先の行が同じ文書にあること」.
 */
const T_050 = [
  { row: 'CD-1', what: 'dependency', of: 'その `Task` を端点とする依存' },
  { row: 'CD-1', what: 'assignment', of: 'その `Task` を指す割当' },
  { row: 'CD-2', what: 'commentBox', of: 'その行を指す注記' },
] as const

describe('ImportDocument (UF-19) -- table T-050 / IV-2, what a 合流 may not orphan', () => {
  it('a merge carries in no reference whose other half is missing, and says which', () => {
    expect(T_050).toHaveLength(3)
    const { document, report } = accepted(
      importDocument(
        requestOf({
          format: 'grsJson',
          current: rowed([taskOf({ uid: 1, name: 'ours' })], {
            project: projectOf({ uidHighWaterMark: 1 }),
          }),
          incoming: documentOf({
            schedule: {
              tasks: [
                taskOf({
                  uid: 30,
                  name: 'theirs',
                  // CD-1: a dependency whose predecessor is in neither document
                  dependencies: [
                    {
                      predecessorUid: 999,
                      linkType: 1,
                      lag: 0,
                      lagFormat: null,
                      carry: {},
                      carryElements: [],
                    },
                  ],
                }),
              ],
              taskGroups: [groupOf({ id: 'g9', label: 'their row', order: 0 })],
              taskGroupMembers: [memberOf(30, 'g9')],
              // CD-1: an assignment pointing at a resource that is not there
              assignments: [assignmentOf({ uid: 1, taskUid: 30, resourceUid: 777 })],
              // CD-2: a note pointing at a row that is not there
              commentBoxes: [commentBoxOf({ id: 'c9', text: 'note', anchorGroupId: 'gone' })],
            },
          }),
          merge: answersOf({ mapping: { kind: 'allSame' } }),
        }),
      ),
    )
    // nothing dangling reached the document,
    expect(taskIn(document, 30)!.dependencies).toEqual([])
    expect(document.schedule.assignments).toEqual([])
    expect(document.schedule.commentBoxes).toEqual([])
    // and every one of them was named rather than dropped in silence.
    expect([...report.droppedReferences.map((row) => row.what)].sort()).toEqual([
      'assignment',
      'commentBox',
      'dependency',
    ])
  })
})

