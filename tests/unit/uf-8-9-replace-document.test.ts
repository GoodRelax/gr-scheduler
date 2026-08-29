// Unit tests for `replaceDocument` -- row PI-8 of table T-064, the ONE path by
// which a document computed outside ApplyDocumentChange becomes the current
// value. The unit is UF-8 `apply-document-change.ts` (WS-6 / WS-7) over UF-9
// `document-change-plan.ts` (WS-1 to WS-5) -- table T-075 of
// docs/spec/05-07-design.md, component CP-8 of table T-062.
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODIES (docs/development-rules/
// 04-verification.md §1 -- 「ユニットを書いた者が、そのユニットの試験を書いて
// はならない。実装を読んで書いた試験は、実装の読み違いごと緑になる。」).
// What was read of the unit: the head comment of `apply-document-change.ts`,
// `DocumentHolder`, `ChangeAudience`, `ApplyOutcome`, `ReplaceOutcome`, and the
// two signatures; and, from `document-change-plan.ts`, only the declarations of
// `WriteMoment`, `StampRefusal`, `MomentRefusal`, `ImportCall`,
// `ReplacementCall`, `ReplacementInput` and `ReplacementRefusal` -- the types
// the published face re-exports, which a caller cannot be written without.
// EVERY EXPECTED VALUE BELOW COMES FROM THE MANUSCRIPT, never from the code.
//
// ⛔ AND NEVER OUT OF THE HOLDER AFTER THE RUN. A case that asks
// `one.held()` what went in, and then judges the answer the unit gave about
// what went in, is comparing the unit with itself: it stays green however the
// unit derives that answer. Both documents a claim is about are built by the
// case -- the one that was current before, and the one it sends in.
//
// ⭐ THE RULE THESE CASES ARE DRIVEN BY:
//
//   表 T-230 「まるごと差し替えるときの呼び手ごとの扱い」, every row it prints
//             (RD-1 .. RD-4 and RD-6 -- RD-5 「自動保存からの復帰」 left the
//             table with CR-280, which took 「自動保存」 out of the manuscript),
//             read out of docs/spec/05-07-design.md at load time through
//             `specTable` rather than copied. Chapter 1.9 (:275) asks that a
//             test of a requirement pointing at a table be driven by the table,
//             so every block below asserts the CELL it is about before it
//             asserts the behaviour: a manuscript that moves a cell reaches
//             this file rather than sliding past it.
//   表 T-067  WS-1 .. WS-7, the seven steps 「文書をまるごと差し替える道も、本表
//             の 7 つの順を踏む」
//   the six MUST paragraphs printed under table T-230, quoted at each block
//   表 T-035  AG-2 (「照合は刻印の 3 つすべての等値で行うこと（MUST）。1 つでも
//             違えば拒否すること（MUST）」), AG-6, AG-9, AG-10
//   FR-063    「刻印を順序として読んではならない（MUST NOT）。どの判定も等値で
//             行うこと（MUST）」 and what WS-5 updates
//   FR-031 / 表 T-027  what earns 取り消しの 1 段 and what does not (UN-6)
//   表 T-024a OP-3 / OP-4, and 表 T-004 の LM-9
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because docs/spec does not decide it:
//   - the difference between RD-4's 「捨てる」 and RD-6's 「空にする」.
//     Both leave a history with nothing to undo and nothing to redo, and that
//     common ground is what the cases assert; a reading that tells the two
//     words apart is not written down anywhere.
//   - what a row whose WS-3 component has nothing to answer does (RD-1 on an
//     empty history, RD-2 with no undone side). T-230 has no column for it.
//   - the shape of the value a refusal returns to an `Agent API` caller. AG-9a
//     owns that, and it is CP-17's face, not this one's.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { DocumentStamp } from '../../src/entity/document-model/document-stamp/document-stamp'
import {
  emptyHistory,
  historyWithStep,
  stepCount,
  type EditHistory,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
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
  replaceDocument,
  type ChangeAudience,
  type ChangeStep,
  type DocumentHolder,
  type HeldDocument,
  type ImportCall,
  type ReplacementCall,
  type ReplaceOutcome,
  type WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import {
  importDocument,
  type ImportOutcome,
  type MergeChoices,
} from '../../src/use-case/import-document/import-document'
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { validateImportedDocument } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// 1. The manuscript, read at load time rather than copied.
// ---------------------------------------------------------------------------

const T_230 = specTable('T-230')

const headingWith = (needle: string): string => {
  const found = T_230.headings.find((heading) => heading.includes(needle))
  if (found === undefined) throw new Error(`table T-230 has no column mentioning ${needle}`)
  return found
}

/** The columns table T-230 answers with, by their own heading text. */
const COL_WS3 = headingWith('WS-3')
const COL_HISTORY = headingWith('履歴')
const COL_STAMP = headingWith('刻印')
const COL_UNDO_STEP = headingWith('取り消し')

const cellOf = (row: string, column: string): string => {
  const found = T_230.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-230 has no row ${row}`)
  return found.by[column] ?? ''
}

/** The row IDs table T-230 prints, in the order it prints them. */
const ROWS = T_230.rows.map((row) => row.id)

// ---------------------------------------------------------------------------
// 2. Fixtures. Every nullable column of table T-058 is spelled `null`, because
//    a column left `undefined` reads as "held" to anything that asks.
// ---------------------------------------------------------------------------

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

const memberOf = (taskUid: number, groupId: string): TaskGroupMember => ({
  taskUid,
  groupId,
  stackOrder: null,
})

// Carried on BOTH sides of every merge, so that a key which happens to be
// absent can never be mistaken for the conflict MG-12 asks about.
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
  calendars: [] as readonly Calendar[],
  tasks: [],
  resources: [] as readonly Resource[],
  assignments: [] as readonly Assignment[],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [] as readonly TaskVisual[],
  commentBoxes: [] as readonly CommentBox[],
  highlightBoxes: [],
  taskOrigins: [] as readonly TaskOrigin[],
  baselineTasks: [],
  ...part,
})

const stampOf = (part: Partial<DocumentStamp> = {}): DocumentStamp => ({
  scheduleUpdatedUtc: '2026-08-20T09:00:00Z',
  lastEditedBy: 'the person at the keyboard',
  settingsUpdatedUtc: '2026-08-20T09:00:00Z',
  ...part,
})

/**
 * A document whose tasks all sit on one row. IV-6 of table T-220 wants exactly
 * one `TaskGroupMember` per `Task`, so no fixture builds a task without one.
 */
const rowed = (
  tasks: readonly Task[],
  documentStamp: DocumentStamp = stampOf(),
  documentSettings: Record<string, unknown> = {},
): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleOf({
      tasks,
      taskGroups: [groupOf({ id: 'g1', label: 'row 1', order: 0 })],
      taskGroupMembers: tasks.map((task) => memberOf(task.uid, 'g1')),
    }),
    documentSettings: settingsOf(documentSettings),
    documentStamp,
    changeLog: [],
  }) as unknown as Document

// FR-063: 「刻はいずれも `ISO 8601`・UTC・秒まで」.
const EARLIER = '2026-08-10T09:00:00Z'
const NOW = '2026-08-20T09:00:00Z'
const FROM_A_FILE = '2026-08-01T12:00:00Z'
const WRITE_INSTANT = '2026-08-22T10:00:00Z'
const WRITER = 'the case at the keyboard'

/** The document the holder holds when a case begins. */
const CURRENT = rowed([taskOf({ uid: 1, name: 'ours' })], stampOf())

/** The document one undo step back -- an EARLIER 刻, on purpose (FR-063). */
const ONE_STEP_BACK = rowed(
  [taskOf({ uid: 1, name: 'as it was' })],
  stampOf({ scheduleUpdatedUtc: EARLIER, settingsUpdatedUtc: EARLIER }),
)

/**
 * The document one undo step back when the write that produced `CURRENT`
 * touched ONLY the 見せ方の群 (表 T-108 の `CM-62`, `setFontScale`). WS-5:
 * 「日程データの群の刻を動かすのは、その群を変えたときだけ」 —— so that 刻
 * never moved, and this document carries the SAME one as `CURRENT` while the
 * other two stamp fields differ. An undo that restores it is a replacement the
 * MUST under table T-230 has to call 「動いていない」.
 */
const ONE_STEP_BACK_SAME_SCHEDULE = rowed(
  [taskOf({ uid: 1, name: 'ours' })],
  stampOf({ settingsUpdatedUtc: EARLIER, lastEditedBy: 'somebody else' }),
  { fontScale: 'L' },
)

/** A document out of a file: a different schedule AND a different 刻印. */
const OUT_OF_A_FILE = rowed(
  [taskOf({ uid: 9, name: 'from a file' })],
  stampOf({
    scheduleUpdatedUtc: FROM_A_FILE,
    settingsUpdatedUtc: FROM_A_FILE,
    lastEditedBy: 'somebody else',
  }),
)

/**
 * A document whose 日程データの群の刻 is the SAME as the current one, and whose
 * other two stamp fields are not. The equality under table T-230's last MUST
 * has to answer "did not move" for this one.
 */
const SAME_SCHEDULE_STAMP = rowed(
  [taskOf({ uid: 9, name: 'a different schedule, the same 刻' })],
  stampOf({ settingsUpdatedUtc: FROM_A_FILE, lastEditedBy: 'somebody else' }),
)

/**
 * Wide enough that neither bound of FR-031 binds here. What the bounds do when
 * they DO bind is uf-8-9-history-depth's case, not this file's.
 */
const GENEROUS: HistoryLimits = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }

const oneStepOf = (
  document: Document,
  commands: readonly string[] = ['setTaskName'],
): EditHistory<ChangeStep> =>
  historyWithStep(
    emptyHistory<ChangeStep>(),
    { document, commands },
    JSON.stringify(document).length,
    GENEROUS,
  )

/** What the holder holds at the start of almost every case: one undoable 段. */
const heldWithOneStep = (): HeldDocument => ({
  document: CURRENT,
  history: oneStepOf(ONE_STEP_BACK),
})

/** The same holder, with a 段 that moved only the 見せ方の群 behind it. */
const heldWithOneSettingsStep = (): HeldDocument => ({
  document: CURRENT,
  history: oneStepOf(ONE_STEP_BACK_SAME_SCHEDULE, ['setFontScale']),
})

const CALM: WriteMoment = {
  gestureInFlight: false,
  editingInPlace: false,
  deliveringNotices: false,
}

const answersOf = (part: Partial<MergeChoices> = {}): MergeChoices => ({
  mapping: null,
  profileConflict: null,
  settingsConflict: null,
  ...part,
})

/** RD-3's caller: 取り込み（合流）, whose overwrite is UN-6's 対象. */
const MERGE_CALL: ImportCall<'merge' | 'baseline'> = {
  incoming: rowed([taskOf({ uid: 1, name: 'theirs' })], stampOf({ lastEditedBy: 'somebody else' })),
  format: 'grsJson',
  choice: 'merge',
  // OP-5 has already run: FR-023 passed. OP-8: nothing else is open.
  validationPassed: true,
  anotherOpenInProgress: false,
  unsavedEditsDiscardConfirmed: true,
  merge: answersOf({ mapping: { kind: 'allSame' } }),
  defaultSettings: settingsOf(),
  importSessionId: 'session-rd-3',
}

/** RD-4's caller: `OP-3` の置き換え, whose OP-4 confirmation has been answered. */
const REPLACE_CALL: ImportCall<'replace'> = {
  incoming: OUT_OF_A_FILE,
  format: 'grsJson',
  choice: 'replace',
  validationPassed: true,
  anotherOpenInProgress: false,
  unsavedEditsDiscardConfirmed: true,
  merge: null,
  defaultSettings: settingsOf(),
  importSessionId: 'session-rd-4',
}

const acceptedImport = (outcome: ImportOutcome): Document => {
  if (!outcome.ok) throw new Error(`the import was refused: ${JSON.stringify(outcome.refusal)}`)
  return outcome.document
}

// ---------------------------------------------------------------------------
// 3. One running write path, and the six rows driven through it.
// ---------------------------------------------------------------------------

interface Delivery {
  readonly document: Document
  readonly hasMovedSchedule: boolean
  /** What a subscriber reading the holder from inside `deliver` would see. */
  readonly visibleToASubscriber: Document
}

interface RunPart {
  readonly readStamp: DocumentStamp | null
  readonly moment: WriteMoment
}

interface Bench {
  held(): HeldDocument
  /** Every argument WS-6 was handed, in order. */
  readonly swapped: HeldDocument[]
  /** Every call WS-7 made, in order. */
  readonly delivered: Delivery[]
  /** `'WS-6'` / `'WS-7'`, in the order the two actually happened. */
  readonly order: string[]
  run(call: ReplacementCall, part?: Partial<RunPart>): ReplaceOutcome
}

function bench(start: HeldDocument, onDeliver?: (self: Bench) => void): Bench {
  let held = start
  const swapped: HeldDocument[] = []
  const delivered: Delivery[] = []
  const order: string[] = []

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      order.push('WS-6')
      swapped.push(next)
      held = next
    },
  }

  const audience: ChangeAudience = {
    deliver: (document, hasMovedSchedule) => {
      order.push('WS-7')
      delivered.push({ document, hasMovedSchedule, visibleToASubscriber: held.document })
      if (onDeliver !== undefined) onDeliver(one)
    },
  }

  const one: Bench = {
    held: () => held,
    swapped,
    delivered,
    order,
    run: (call, part = {}) =>
      replaceDocument(
        {
          readStamp: 'readStamp' in part ? (part.readStamp ?? null) : held.document.documentStamp,
          moment: part.moment ?? CALM,
          call,
        },
        holder,
        audience,
      ),
  }
  return one
}

const accepted = (outcome: ReplaceOutcome): { document: Document; hasMovedSchedule: boolean } => {
  if (!outcome.accepted) {
    throw new Error(`the replacement was refused: ${JSON.stringify(outcome.refusal)}`)
  }
  return { document: outcome.document, hasMovedSchedule: outcome.hasMovedSchedule }
}

/**
 * One row of table T-230, ready to drive: where the holder starts, what the
 * caller names itself, and -- computed HERE by asking the very component the
 * `WS-3` column names -- what WS-3 answered.
 */
interface RowDrive {
  readonly start: HeldDocument
  readonly call: ReplacementCall
  /** The document WS-3 answered with, before WS-5 had any say. */
  readonly ws3Document: Document
  /** The history WS-3 answered with, for the two rows whose 履歴 column is it. */
  readonly ws3History: EditHistory<ChangeStep> | null
  /**
   * ⭐ THE TWO 刻 THE LAST MUST UNDER TABLE T-230 COMPARES, both built HERE out
   * of the fixtures this case set up.
   *
   *   「`WS-7` へ渡す「日程データの群が動いたか」は、出て行く文書と入ってくる
   *    文書の `scheduleUpdatedUtc` の等値で導くこと（MUST）」
   *
   * 「出て行く文書」 is what the holder held when the run began; 「入ってくる
   * 文書」 is what this row sends in, carrying the 刻 the 刻印 column says it
   * will carry -- the one it arrived with on the five 「入ってきたまま」 rows,
   * and the instant the caller handed on the one row that 「進める」 (WS-5:
   * 「どちらの群であれ動いた刻と、最後に書いた者は必ず更新する」, and the merge
   * this file drives overwrites a `Task`).
   *
   * ⛔ NEITHER MAY BE READ OUT OF THE HOLDER AFTER THE RUN. A case that asks
   * the holder what went in is recomputing its expectation from the very value
   * it is judging, and can then never disagree with the unit: a unit comparing
   * the wrong pair of instants keeps such a case green.
   */
  readonly outgoingScheduleUpdatedUtc: string
  readonly incomingScheduleUpdatedUtc: string
}

/**
 * Which pair of 刻 a row is driven with. Both are ordinary: `'differ'` sends in
 * a document written at another 刻, `'match'` one whose 日程データの群の刻 is
 * the one already current -- an undo of a 見せ方 edit (`CM-62`), a file whose
 * schedule group was never touched, a merge written inside the same second
 * (表 T-035 の `AG-2`: 「同じ刻に 2 度書かれたときは後から来たほうが残る」).
 * ⭐ Every row is driven both ways, so half the answers are `false`: a table
 * whose rows all expect the same value cannot tell a derivation from a habit.
 */
type Instants = 'differ' | 'match'

const INSTANT_FLAVOURS: readonly Instants[] = ['differ', 'match']

function driveOf(row: string, instants: Instants = 'differ'): RowDrive {
  const start = instants === 'differ' ? heldWithOneStep() : heldWithOneSettingsStep()
  // What one undo step back holds, and therefore what an undo sends in.
  const stepBack = instants === 'differ' ? ONE_STEP_BACK : ONE_STEP_BACK_SAME_SCHEDULE
  // What a caller that brings its own document brings.
  const brought = instants === 'differ' ? OUT_OF_A_FILE : SAME_SCHEDULE_STAMP
  const outgoingScheduleUpdatedUtc = start.document.documentStamp.scheduleUpdatedUtc
  switch (row) {
    case 'RD-1': {
      // 「`UndoEdit`（`PI-11`）」 -- asked here, exactly as the column names it.
      const answer = undoEdit(start)
      return {
        start,
        call: { row: 'RD-1' },
        ws3Document: answer.next.document,
        ws3History: answer.next.history,
        outgoingScheduleUpdatedUtc,
        incomingScheduleUpdatedUtc: stepBack.documentStamp.scheduleUpdatedUtc,
      }
    }
    case 'RD-2': {
      // RD-2 needs something on the redo side, which only an undo can put there.
      const stepped = undoEdit(start).next
      const answer = redoEdit(stepped)
      return {
        start: stepped,
        call: { row: 'RD-2' },
        ws3Document: answer.next.document,
        ws3History: answer.next.history,
        // Undo left the 段's document current; redo sends back the one this
        // case started from.
        outgoingScheduleUpdatedUtc: stepBack.documentStamp.scheduleUpdatedUtc,
        incomingScheduleUpdatedUtc: CURRENT.documentStamp.scheduleUpdatedUtc,
      }
    }
    case 'RD-3': {
      // 「進める」: the instant the caller hands is the one the 日程データの群
      // carries afterwards, because this merge overwrites a `Task`.
      const writeInstant = instants === 'differ' ? WRITE_INSTANT : NOW
      const answer = acceptedImport(importDocument({ ...MERGE_CALL, current: start.document }))
      return {
        start,
        call: {
          row: 'RD-3',
          importing: MERGE_CALL,
          historyLimits: GENEROUS,
          editedBy: WRITER,
          updatedUtc: writeInstant,
        },
        ws3Document: answer,
        ws3History: null,
        outgoingScheduleUpdatedUtc,
        incomingScheduleUpdatedUtc: writeInstant,
      }
    }
    case 'RD-4': {
      const importing: ImportCall<'replace'> = { ...REPLACE_CALL, incoming: brought }
      const answer = acceptedImport(importDocument({ ...importing, current: start.document }))
      return {
        start,
        call: { row: 'RD-4', importing },
        ws3Document: answer,
        ws3History: null,
        outgoingScheduleUpdatedUtc,
        incomingScheduleUpdatedUtc: brought.documentStamp.scheduleUpdatedUtc,
      }
    }
    case 'RD-6':
      // 「呼び手が持って来る」 -- 「呼び手が渡した文書がそのまま `WS-3` の答え」.
      return {
        start,
        call: { row: 'RD-6', document: brought },
        ws3Document: brought,
        ws3History: null,
        outgoingScheduleUpdatedUtc,
        incomingScheduleUpdatedUtc: brought.documentStamp.scheduleUpdatedUtc,
      }
    default:
      throw new Error(`table T-230 has grown a row this file does not drive: ${row}`)
  }
}

// ---------------------------------------------------------------------------
// 4. 表 T-230 itself, before anything is driven by it.
//    「本表の …… が、まるごと差し替える呼び手の全数である。」
//
// ⛔ THE COUNT IN THAT SENTENCE IS NOT ASSERTED, AND THE ROW IDS ARE. The
// manuscript still spells 「本表の 6 つ」 in its prose while the table prints
// five rows -- CR-280 took RD-5 「自動保存からの復帰」 out with the mechanism it
// named and left the sentence behind. A case driven by the prose would be
// asserting a number the table itself contradicts, so the rows are what is read.
// ---------------------------------------------------------------------------

describe('表 T-230 -- the whole set of callers, before any of them is driven', () => {
  it('GIVEN the manuscript WHEN its rows are read THEN this file drives every one', () => {
    expect(ROWS).toEqual(['RD-1', 'RD-2', 'RD-3', 'RD-4', 'RD-6'])
    for (const instants of INSTANT_FLAVOURS) {
      for (const row of ROWS) expect(() => driveOf(row, instants), `${row} / ${instants}`).not.toThrow()
    }
  })

  it('GIVEN the WS-3 column WHEN it is read THEN it names a component for four rows and the caller for one', () => {
    // 「`WS-3` の位置に立つのは本表がその欄に名指したものである（MUST）」 and
    // 「「呼び手が持って来る」の行では、呼び手が渡した文書がそのまま `WS-3` の
    // 答えである。」
    expect(cellOf('RD-1', COL_WS3)).toContain('UndoEdit')
    expect(cellOf('RD-2', COL_WS3)).toContain('RedoEdit')
    expect(cellOf('RD-3', COL_WS3)).toContain('ImportDocument')
    expect(cellOf('RD-4', COL_WS3)).toContain('ImportDocument')
    expect(cellOf('RD-6', COL_WS3)).toBe('呼び手が持って来る')
  })

  it('GIVEN a caller that names no row WHEN it asks for a replacement THEN nothing is swapped and nothing is told', () => {
    // 「呼び手は、自分がどの行かを名乗ること（MUST）。名乗らない差し替えを受け
    // 付けてはならない（MUST NOT）」 —— 履歴を捨てるか残すかが呼び手の心得に
    // なると、`OP-4` が MUST で定めた履歴の扱いを経路の中で誰も検査しなくなる。
    const one = bench(heldWithOneStep())
    const before = one.held()
    // Refusing by throwing is also "not accepted", so both endings are allowed
    // -- but neither may end in a swap. ⚠️ The `expect` sits OUTSIDE the `try`,
    // so a failing assertion cannot be mistaken for the unit throwing.
    let outcome: ReplaceOutcome | 'threw'
    try {
      outcome = one.run({} as unknown as ReplacementCall)
    } catch {
      outcome = 'threw'
    }
    if (outcome !== 'threw') {
      expect(outcome.accepted, 'a nameless replacement was accepted').toBe(false)
    }
    expect(one.swapped).toEqual([])
    expect(one.delivered).toEqual([])
    expect(one.held()).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// 5. WS-1 -- 「刻印 3 つを照合する。食い違えば拒否し、現在の文書を返す」
//    「`WS-1` が照合するのは、呼び手が申告した「読んだ刻印」と現在の文書の刻印
//     である（MUST）。入ってくる文書の刻印と照合してはならない（MUST NOT）」
//    「申告が無いことだけを理由に拒否してはならない（MUST NOT）」
// ---------------------------------------------------------------------------

describe('WS-1 -- 照合するのは申告された刻印と現在の文書である', () => {
  it('GIVEN a caller that declares the CURRENT 刻印 WHEN it replaces THEN the replacement is accepted', () => {
    const one = bench(heldWithOneStep())
    const outcome = one.run(driveOf('RD-6').call, { readStamp: CURRENT.documentStamp })
    expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
  })

  // AG-2: 「照合は刻印の 3 つすべての等値で行うこと（MUST）。1 つでも違えば拒否
  // すること（MUST）」 —— 日程データの群の刻だけでは見せ方の群の衝突を見落とす。
  const THREE_FIELDS: readonly (keyof DocumentStamp)[] = [
    'scheduleUpdatedUtc',
    'lastEditedBy',
    'settingsUpdatedUtc',
  ]
  for (const field of THREE_FIELDS) {
    it(`GIVEN a declared 刻印 differing only in \`${field}\` WHEN it replaces THEN WS-1 refuses and nothing is swapped`, () => {
      const one = bench(heldWithOneStep())
      const before = one.held()
      const outcome = one.run(driveOf('RD-6').call, {
        readStamp: { ...CURRENT.documentStamp, [field]: 'not what the document says' },
      })
      expect(outcome.accepted).toBe(false)
      if (!outcome.accepted) {
        expect(outcome.refusal.step).toBe('WS-1')
        expect(outcome.refusal.reason).toBe('staleStamp')
      }
      expect(one.swapped).toEqual([])
      expect(one.delivered).toEqual([])
      expect(one.held()).toBe(before)
    })
  }

  it('GIVEN a caller that declares NO 刻印 WHEN it replaces THEN it is accepted -- 申告が無いことだけを理由に拒否してはならない', () => {
    // 「`AG-2` の申告は能力であって義務ではない。」
    const one = bench(heldWithOneStep())
    const outcome = one.run(driveOf('RD-6').call, { readStamp: null })
    expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
    expect(one.swapped).toHaveLength(1)
    expect(accepted(outcome).document).toEqual(OUT_OF_A_FILE)
  })

  it('GIVEN an INCOMING 刻印 that differs from the current one WHEN the current one is declared THEN it is still accepted', () => {
    // 「入ってくる文書の刻印と照合してはならない（MUST NOT）」 —— 入ってくる
    // 文書の刻印は定義により現在のものと違うので、照合するとあらゆる差し替えが
    // 拒否される。
    expect(OUT_OF_A_FILE.documentStamp).not.toEqual(CURRENT.documentStamp)
    const one = bench(heldWithOneStep())
    const outcome = one.run(
      { row: 'RD-6', document: OUT_OF_A_FILE },
      { readStamp: CURRENT.documentStamp },
    )
    expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
    expect(accepted(outcome).document).toEqual(OUT_OF_A_FILE)
  })

  it('GIVEN a caller that declares the INCOMING 刻印 WHEN it replaces THEN WS-1 refuses, because the current one is what is matched', () => {
    // The mirror of the case above: if the incoming 刻印 were what WS-1 read,
    // this is the call that would have passed.
    const one = bench(heldWithOneStep())
    const outcome = one.run(
      { row: 'RD-6', document: OUT_OF_A_FILE },
      { readStamp: OUT_OF_A_FILE.documentStamp },
    )
    expect(outcome.accepted).toBe(false)
    if (!outcome.accepted) expect(outcome.refusal.step).toBe('WS-1')
    expect(one.swapped).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 6. WS-2 -- 「書ける時機かを見る。身振りの最中・編集入力の確定前・通知の配布中
//    は拒否する」 (AG-9 and Chapter 5.5).
// ---------------------------------------------------------------------------

describe('WS-2 -- 書ける時機かを見る、三つの moment', () => {
  const MOMENTS: readonly (keyof WriteMoment)[] = [
    'gestureInFlight',
    'editingInPlace',
    'deliveringNotices',
  ]

  for (const moment of MOMENTS) {
    it(`GIVEN \`${moment}\` at the moment of the call WHEN it replaces THEN WS-2 refuses, nothing is swapped and nothing is told`, () => {
      const one = bench(heldWithOneStep())
      const before = one.held()
      const outcome = one.run(driveOf('RD-6').call, { moment: { ...CALM, [moment]: true } })
      expect(outcome.accepted).toBe(false)
      if (!outcome.accepted) {
        expect(outcome.refusal.step).toBe('WS-2')
        expect(outcome.refusal.reason).toBe(moment)
      }
      expect(one.swapped).toEqual([])
      expect(one.delivered).toEqual([])
      expect(one.held()).toBe(before)
    })
  }

  it('GIVEN a subscriber inside WS-7 WHEN it writes back THEN it is refused -- 通知を配っているあいだの書き込みは拒否する', () => {
    // 「通知を配っているあいだの書き込みは拒否すること（MUST）」 —— 購読者が
    // 通知を受けてそのまま書き込むと、どの版に対する通知だったのかが決まらなく
    // なる。⚠️ The re-entering caller says `deliveringNotices: false` in perfect
    // good faith: it is a subscriber, and it cannot know.
    let fromInside: ReplaceOutcome | null = null
    const one = bench(heldWithOneStep(), (self) => {
      if (fromInside !== null) return
      fromInside = self.run(
        { row: 'RD-6', document: SAME_SCHEDULE_STAMP },
        { readStamp: null, moment: CALM },
      )
    })
    const outer = one.run(driveOf('RD-6').call, { readStamp: null })

    expect(outer.accepted, JSON.stringify(outer)).toBe(true)
    expect(fromInside).not.toBeNull()
    const inner = fromInside as unknown as ReplaceOutcome
    expect(inner.accepted, JSON.stringify(inner)).toBe(false)
    if (!inner.accepted) {
      expect(inner.refusal.step).toBe('WS-2')
      expect(inner.refusal.reason).toBe('deliveringNotices')
    }
    // Exactly one swap: the outer one. 待ち行列は作らない (FR-028).
    expect(one.swapped).toHaveLength(1)
  })

  it('GIVEN the delivery window has closed WHEN the next write comes THEN it is accepted, so one refusal does not wedge the path shut', () => {
    // IN-1a of table T-028 records the same hazard for AG-9: a state that never
    // clears refuses every write for ever after.
    let fromInside: ReplaceOutcome | null = null
    const one = bench(heldWithOneStep(), (self) => {
      if (fromInside !== null) return
      fromInside = self.run({ row: 'RD-6', document: SAME_SCHEDULE_STAMP }, { readStamp: null })
    })
    one.run(driveOf('RD-6').call, { readStamp: null })
    expect(fromInside).not.toBeNull()

    const after = one.run({ row: 'RD-6', document: SAME_SCHEDULE_STAMP }, { readStamp: null })
    expect(after.accepted, JSON.stringify(after)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 7. The 刻印 column, row by row.
//    「`WS-5` は、本表の刻印の欄が「進める」の行でだけ刻印を進めること（MUST）。
//     「入ってきたまま」の行で進めてはならない（MUST NOT）」
// ---------------------------------------------------------------------------

describe('表 T-230 の刻印の欄 -- 行ごとに', () => {
  it('GIVEN the 刻印 column WHEN its six cells are read THEN exactly one says 進める, and it is the 取り込み row', () => {
    const advancing = ROWS.filter((row) => cellOf(row, COL_STAMP).includes('進める'))
    expect(advancing).toEqual(['RD-3'])
    for (const row of ROWS) {
      if (row === 'RD-3') continue
      expect(cellOf(row, COL_STAMP), row).toBe('入ってきたまま')
    }
  })

  for (const row of ROWS) {
    it(`GIVEN ${row} WHEN the replacement lands THEN its 刻印 is what the 刻印 column of table T-230 says`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      const landed = accepted(one.run(drive.call)).document

      if (cellOf(row, COL_STAMP) === '入ってきたまま') {
        // 「取り消しは以前の文書を刻印ごと復元し（`FR-063`）、ファイルと起動テン
        // プレートから来る文書は、書かれたときの刻印を持っていなければ `FR-063`
        // の等値の判定が意味を成さない。」
        expect(landed.documentStamp).toEqual(drive.ws3Document.documentStamp)
        // 「入ってきたまま」の行で進めてはならない（MUST NOT）: not this
        // writer's name and not this write's instant, on any of the three.
        expect(landed.documentStamp.lastEditedBy).not.toBe(WRITER)
        expect(landed.documentStamp.settingsUpdatedUtc).not.toBe(WRITE_INSTANT)
        expect(landed.documentStamp.scheduleUpdatedUtc).not.toBe(WRITE_INSTANT)
      } else {
        // WS-5: 「どちらの群であれ動いた刻と、最後に書いた者は必ず更新する」, and
        // 「日程データの群の刻を動かすのは、その群を変えたときだけ」 -- the merge
        // this row drives overwrites a `Task`, so that group moved.
        expect(landed.documentStamp.lastEditedBy).toBe(WRITER)
        expect(landed.documentStamp.settingsUpdatedUtc).toBe(WRITE_INSTANT)
        // ⚠️ A precondition of the fixture, and it is read from what WS-3
        // answered -- not from the landed document, which is the thing being
        // judged: 「その群を変えたとき」 has to be true of the merge itself.
        expect(
          drive.ws3Document.schedule,
          'the merge this row drives is meant to change the 日程データの群',
        ).not.toEqual(drive.start.document.schedule)
        expect(landed.documentStamp.scheduleUpdatedUtc).toBe(WRITE_INSTANT)
      }
    })
  }
})

// ---------------------------------------------------------------------------
// 8. The 取り消しの 1 段 column, row by row.
//    「`WS-4` は、本表の欄が「積まない」の行で取り消しの 1 段を積んではならない
//     （MUST NOT）」 —— 表 T-027 が分類しているのは人が文書に対して行う操作で
//     あり、履歴を歩くこと自体はその対象ではない。
// ---------------------------------------------------------------------------

describe('表 T-230 の取り消しの 1 段の欄 -- 行ごとに', () => {
  it('GIVEN the 取り消しの 1 段 column WHEN its six cells are read THEN five say 積まない and one delegates to 表 T-027', () => {
    const delegating = ROWS.filter((row) => cellOf(row, COL_UNDO_STEP).includes('T-027'))
    expect(delegating).toEqual(['RD-3'])
    for (const row of ROWS) {
      if (row === 'RD-3') continue
      expect(cellOf(row, COL_UNDO_STEP), row).toBe('積まない')
    }
  })

  for (const row of ROWS) {
    if (row === 'RD-3') continue
    it(`GIVEN ${row} (積まない) WHEN the replacement lands THEN no 段 was pushed`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      accepted(one.run(drive.call))

      const expected =
        drive.ws3History !== null
          ? // 「問う先が答えたもの」 -- and not that plus a 段 of the path's own.
            stepCount(drive.ws3History)
          : // 捨てる / 空にする: nothing is left to have been pushed onto.
            0
      expect(stepCount(one.held().history)).toBe(expected)
    })
  }

  it('GIVEN RD-3 (表 T-027 に従う) WHEN a 合流での上書き lands THEN one 段 is pushed, because UN-6 files it under 対象', () => {
    // 表 T-027 の `UN-6`: 「対象 | 合流での上書き（表 T-032a の `MM-1`）」.
    const un6 = specTable('T-027').rows.find((one) => one.id === 'UN-6')
    expect(un6?.by['区分']).toBe('対象')
    expect(un6?.by['操作']).toContain('合流での上書き')

    const drive = driveOf('RD-3')
    const before = stepCount(drive.start.history)
    const one = bench(drive.start)
    accepted(one.run(drive.call))
    expect(stepCount(one.held().history)).toBe(before + 1)

    // And the 段 really undoes the merge: one press lands on what was held.
    const back = undoEdit(one.held())
    expect(back.undone).toBe(true)
    expect(back.next.document.schedule).toEqual(drive.start.document.schedule)
  })
})

// ---------------------------------------------------------------------------
// 9. The 履歴 column, row by row.
// ---------------------------------------------------------------------------

describe('表 T-230 の履歴の欄 -- 行ごとに', () => {
  it('GIVEN the 履歴 column WHEN its five cells are read THEN they are 問う先が答えたもの ×2, いまのものを残す, 捨てる, 空にする', () => {
    expect(ROWS.map((row) => cellOf(row, COL_HISTORY))).toEqual([
      '問う先が答えたものを据える',
      '問う先が答えたものを据える',
      'いまのものを残す',
      '捨てる',
      '空にする',
    ])
  })

  for (const row of ['RD-1', 'RD-2']) {
    const asked = row === 'RD-1' ? 'UndoEdit' : 'RedoEdit'
    it(`GIVEN ${row} WHEN the replacement lands THEN the 履歴 is exactly the one ${asked} answered with`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      accepted(one.run(drive.call))
      expect(drive.ws3History).not.toBeNull()
      expect(one.held().history).toEqual(drive.ws3History)
    })
  }

  it('GIVEN RD-3 (いまのものを残す) WHEN the merge lands THEN what could be undone before can still be undone after', () => {
    const drive = driveOf('RD-3')
    const one = bench(drive.start)
    accepted(one.run(drive.call))

    // One press undoes the merge; the second reaches the 段 the history already
    // held, which is the one that had to survive.
    const first = undoEdit(one.held())
    expect(first.undone).toBe(true)
    const second = undoEdit(first.next)
    expect(second.undone, 'the 段 the history already held was thrown away').toBe(true)
    expect(second.next.document.schedule).toEqual(ONE_STEP_BACK.schedule)
  })

  for (const row of ['RD-4', 'RD-6']) {
    it(`GIVEN ${row} (${cellOf(row, COL_HISTORY)}) WHEN the replacement lands THEN nothing is left to undo and nothing to redo`, () => {
      // OP-4: 「取り消しの履歴は引き継がない（`LM-9` と同じ理由）」, and UN-6's
      // own warning: 「置き換え（`OP-3`）は対象外 —— 取り消しの履歴を引き継がない
      // ので戻せない」. LM-9: 「文書を開き直したとき、取り消しの履歴は戻らない」.
      const drive = driveOf(row)
      expect(stepCount(drive.start.history), 'the case starts with something to lose').toBe(1)

      const one = bench(drive.start)
      accepted(one.run(drive.call))

      expect(stepCount(one.held().history)).toBe(0)
      expect(undoEdit(one.held()).undone).toBe(false)
      expect(redoEdit(one.held()).redone).toBe(false)
    })
  }

  it('GIVEN RD-4 without OP-4 answered WHEN it replaces THEN WS-3 refuses and the 履歴 is still there', () => {
    // 「置き換えを選んだときは、捨てる前に確認を求めること（MUST）。黙って捨てて
    // はならない（MUST NOT）」. The path does not ask -- ImportDocument does --
    // so an unconfirmed replacement has to come back as a WS-3 refusal with the
    // holder untouched.
    const start = heldWithOneStep()
    const one = bench(start)
    const outcome = one.run({
      row: 'RD-4',
      importing: { ...REPLACE_CALL, unsavedEditsDiscardConfirmed: false },
    })
    expect(outcome.accepted).toBe(false)
    if (!outcome.accepted) expect(outcome.refusal.step).toBe('WS-3')
    expect(one.swapped).toEqual([])
    expect(one.held()).toBe(start)
    expect(stepCount(one.held().history)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 10. The WS-3 column, row by row, and the MUST NOT against re-validating.
// ---------------------------------------------------------------------------

describe('表 T-230 の `WS-3` の位置に立つもの -- 行ごとに', () => {
  for (const row of ROWS) {
    it(`GIVEN ${row} WHEN the replacement lands THEN the document is the one ${cellOf(row, COL_WS3)} answered with`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      const landed = accepted(one.run(drive.call)).document

      // The 刻印 is the 刻印 column's business (block 7); everything else has to
      // be exactly what WS-3 answered -- 「命令を組み立てる `editDocument` は
      // この道では呼ばれない」.
      expect(landed.schedule).toEqual(drive.ws3Document.schedule)
      expect(landed.documentSettings).toEqual(drive.ws3Document.documentSettings)
      expect(landed.schemaVersion).toBe(drive.ws3Document.schemaVersion)
    })
  }

  for (const row of ['RD-6']) {
    it(`GIVEN ${row} (呼び手が持って来る) WHEN the replacement lands THEN the caller's own document lands unchanged`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      const landed = accepted(one.run(drive.call)).document
      expect(landed).toEqual(OUT_OF_A_FILE)
    })
  }

  it('GIVEN a document FR-023 would refuse WHEN RD-6 brings it THEN it still lands -- 入ってくる文書を検証し直してはならない', () => {
    // 「外から来た文書の検証は `OP-5` と `FR-023` が既に負っており、取り消しの
    // 履歴が持つ文書はその対象ではない。」 RD-6 is the startup road (`FR-062` ／
    // 表 T-034), whose document was already put through OP-5 on the way in.
    const outOfRange = rowed(
      [taskOf({ uid: 3, name: 'written long ago', start: '1801-05-04', finish: '1801-05-08' })],
      stampOf({ scheduleUpdatedUtc: FROM_A_FILE, settingsUpdatedUtc: FROM_A_FILE }),
    )
    // ⚠️ The bounds are the case's own preconditions, not an expectation about
    // the unit: they only have to make the fixture one FR-023 turns away, and
    // the next line asserts that they did.
    const verdict = validateImportedDocument(
      { document: outOfRange, byteLength: 1024, emptyRowTaskUids: [] },
      {
        importMaxBytes: 32,
        importMaxItems: 20000,
        importMaxDepth: 64,
        importMinDate: '1970-01-01',
        importMaxDate: '2200-12-31',
      },
    )
    expect(verdict.ok, 'the fixture is meant to be one FR-023 turns away').toBe(false)

    const one = bench(heldWithOneStep())
    const landed = accepted(one.run({ row: 'RD-6', document: outOfRange })).document
    expect(landed).toEqual(outOfRange)
  })
})

// ---------------------------------------------------------------------------
// 11. WS-6 then WS-7, in that order -- and the equality that decides whether
//     the schedule moved.
// ---------------------------------------------------------------------------

describe('WS-6 then WS-7 -- 差し替えの後に通知を配る', () => {
  for (const row of ROWS) {
    it(`GIVEN ${row} WHEN the replacement is accepted THEN WS-6 runs once, first, and WS-7 once after it`, () => {
      // 「差し替えは 1 つの参照の置き換えとすること（MUST）」 and 「通知は差し
      // 替えの後とすること（MUST）。前に配ってはならない（MUST NOT）」.
      const drive = driveOf(row)
      const one = bench(drive.start)
      accepted(one.run(drive.call))
      expect(one.order).toEqual(['WS-6', 'WS-7'])
      expect(one.swapped).toHaveLength(1)
      expect(one.delivered).toHaveLength(1)
    })
  }

  it('GIVEN a subscriber reading the holder inside WS-7 WHEN it is told THEN it sees the NEW document, never the old one', () => {
    // 「前に配ると購読者が読む文書がまだ古い。」 ⚠️ The document a subscriber
    // has to be able to read is the one THIS CASE brought (RD-6 は「呼び手が
    // 持って来る」で刻印は「入ってきたまま」), so it is named here rather than
    // taken back out of the outcome: three of the unit's own outputs agreeing
    // with each other would agree just as well on the wrong document.
    const drive = driveOf('RD-6')
    const one = bench(drive.start)
    const landed = accepted(one.run(drive.call)).document
    expect(one.delivered[0]?.visibleToASubscriber).toEqual(OUT_OF_A_FILE)
    expect(one.delivered[0]?.visibleToASubscriber).toEqual(landed)
    expect(one.delivered[0]?.visibleToASubscriber).not.toEqual(CURRENT)
  })

  it('GIVEN an accepted replacement WHEN WS-7 runs THEN it is handed the very document WS-6 put in place', () => {
    const drive = driveOf('RD-6')
    const one = bench(drive.start)
    const outcome = accepted(one.run(drive.call))
    // What WS-6 was handed and what WS-7 was told are pinned to the document
    // the CASE brought, and only then to each other.
    expect(one.swapped[0]?.document).toEqual(OUT_OF_A_FILE)
    expect(one.delivered[0]?.document).toEqual(OUT_OF_A_FILE)
    expect(one.delivered[0]?.document).toEqual(outcome.document)
    expect(one.swapped[0]?.document).toEqual(outcome.document)
  })

  it('GIVEN a refused write WHEN it is turned away THEN neither WS-6 nor WS-7 runs', () => {
    const one = bench(heldWithOneStep())
    one.run(driveOf('RD-6').call, { moment: { ...CALM, gestureInFlight: true } })
    expect(one.order).toEqual([])
  })
})

describe('日程データの群が動いたか -- 出て行く文書と入ってくる文書の等値で導く', () => {
  it('GIVEN two different `scheduleUpdatedUtc` WHEN the replacement lands THEN WS-7 is told the schedule moved', () => {
    // 「`WS-7` へ渡す「日程データの群が動いたか」は、出て行く文書と入ってくる
    // 文書の `scheduleUpdatedUtc` の等値で導くこと（MUST）。」
    expect(OUT_OF_A_FILE.documentStamp.scheduleUpdatedUtc).not.toBe(
      CURRENT.documentStamp.scheduleUpdatedUtc,
    )
    const one = bench(heldWithOneStep())
    const outcome = accepted(one.run({ row: 'RD-6', document: OUT_OF_A_FILE }))
    expect(outcome.hasMovedSchedule).toBe(true)
    expect(one.delivered[0]?.hasMovedSchedule).toBe(true)
  })

  it('GIVEN two equal `scheduleUpdatedUtc` WHEN the replacement lands THEN WS-7 is told it did not move, however different the rest is', () => {
    // AG-6: 「見せ方の群だけが動いた書き込みで起きてはならない（MUST NOT）」 --
    // and the judgement is the equality of that ONE field, not of the 刻印.
    expect(SAME_SCHEDULE_STAMP.documentStamp.scheduleUpdatedUtc).toBe(
      CURRENT.documentStamp.scheduleUpdatedUtc,
    )
    expect(SAME_SCHEDULE_STAMP.documentStamp).not.toEqual(CURRENT.documentStamp)
    const one = bench(heldWithOneStep())
    const outcome = accepted(one.run({ row: 'RD-6', document: SAME_SCHEDULE_STAMP }))
    expect(outcome.hasMovedSchedule).toBe(false)
    expect(one.delivered[0]?.hasMovedSchedule).toBe(false)
  })

  it('GIVEN an undo restoring an EARLIER 刻 WHEN it lands THEN it still counts as moved -- an equality, never an order', () => {
    // 「刻印を順序として読んではならない（MUST NOT）。どの判定も等値で行うこと
    // （MUST）」 —— 取り消しは以前の文書を刻印ごと復元するので、順序で読むと
    // 「戻った文書」を「新しくない」と読み、`AG-6` が通知を落とす。
    const drive = driveOf('RD-1')
    expect(drive.ws3Document.documentStamp.scheduleUpdatedUtc).toBe(EARLIER)
    expect(EARLIER < NOW, 'the restored 刻 is the EARLIER of the two').toBe(true)

    const one = bench(drive.start)
    const outcome = accepted(one.run(drive.call))
    expect(outcome.hasMovedSchedule).toBe(true)
    expect(one.delivered[0]?.hasMovedSchedule).toBe(true)
  })

  it('GIVEN the twelve drives WHEN their two 刻 are compared THEN six differ and six match, so the row-by-row case can answer either way', () => {
    // ⭐ The guard on the case below. If every drive expected 「動いた」, a unit
    // that never judged at all would pass it -- which is exactly how a case
    // that recomputed its expectation from the holder stayed green while the
    // unit compared the wrong pair of instants.
    const expectations = INSTANT_FLAVOURS.map((instants) =>
      ROWS.map((row) => {
        const drive = driveOf(row, instants)
        return drive.outgoingScheduleUpdatedUtc !== drive.incomingScheduleUpdatedUtc
      }),
    )
    expect(expectations[0], 'the `differ` flavour must expect 動いた on every row').toEqual(
      ROWS.map(() => true),
    )
    expect(expectations[1], 'the `match` flavour must expect 動いていない on every row').toEqual(
      ROWS.map(() => false),
    )
  })

  it('GIVEN every row of table T-230, driven both ways WHEN each lands THEN WS-7 is told the equality of the two 刻 THE CASE SET UP', () => {
    // 「`WS-7` へ渡す「日程データの群が動いたか」は、出て行く文書と入ってくる
    // 文書の `scheduleUpdatedUtc` の等値で導くこと（MUST）」 —— 「`WS-5` が判定
    // を下さない行があるためである。」
    // ⛔ Both instants come from `RowDrive`, which built them out of THIS case's
    // fixtures. Reading either of them back out of `one.held()` would make the
    // expectation a copy of the answer (FR-063: 「どの判定も等値で行うこと」 is
    // a claim about which two values are compared, and a case that reads one of
    // them from the unit's own output cannot check that claim at all).
    for (const instants of INSTANT_FLAVOURS) {
      for (const row of ROWS) {
        const where = `${row} / ${instants}`
        const drive = driveOf(row, instants)

        // Preconditions on the fixture, both taken from what the CASE built:
        // the document that goes out is the holder's own before the run, and
        // the document that goes in carries what the 刻印 column says it does.
        expect(drive.start.document.documentStamp.scheduleUpdatedUtc, where).toBe(
          drive.outgoingScheduleUpdatedUtc,
        )
        if (cellOf(row, COL_STAMP) === '入ってきたまま') {
          expect(drive.ws3Document.documentStamp.scheduleUpdatedUtc, where).toBe(
            drive.incomingScheduleUpdatedUtc,
          )
        }

        const moved = drive.outgoingScheduleUpdatedUtc !== drive.incomingScheduleUpdatedUtc
        const one = bench(drive.start)
        const outcome = accepted(one.run(drive.call))
        expect(outcome.hasMovedSchedule, where).toBe(moved)
        expect(one.delivered[0]?.hasMovedSchedule, where).toBe(moved)
      }
    }
  })

  it('GIVEN a caller that declares no 刻印 WHEN it replaces THEN the answer still follows the two DOCUMENTS, not the declaration', () => {
    // 「出て行く文書と入ってくる文書の」 —— the two documents, and 「申告が無い
    // ことだけを理由に拒否してはならない（MUST NOT）」 leaves a write with no
    // declaration at all, which a derivation reading `readStamp` could not
    // answer for.
    for (const instants of INSTANT_FLAVOURS) {
      const drive = driveOf('RD-6', instants)
      const moved = drive.outgoingScheduleUpdatedUtc !== drive.incomingScheduleUpdatedUtc
      const one = bench(drive.start)
      const outcome = accepted(one.run(drive.call, { readStamp: null }))
      expect(outcome.hasMovedSchedule, instants).toBe(moved)
      expect(one.delivered[0]?.hasMovedSchedule, instants).toBe(moved)
    }
  })
})
