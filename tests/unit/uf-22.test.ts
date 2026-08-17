// Unit tests for ValidateImportedDocument (unit UF-22, component CP-13).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// Everything asserted here comes from FR-023 and NFR-009, from the settings
// rows those two point at (table T-211's S-113 / S-114 / S-115 and table
// T-214's S-119 / S-120), and from FR-012 (which sends both of its own rules
// to this check: 「取り込む入力は `FR-023` の検証で弾く」). Nothing was read off
// the implementation: Chapter 1.9 asks a test that verifies a requirement
// pointing at a table to be driven by a fixed copy of that table, which is
// what `T_211`, `T_214` and `T_058_DATE_COLUMNS` below are.
//
// ⚠️ WHAT IS NOT TESTED HERE, and why:
//
//   - The fourteen other invariants of table T-220 (IV-1 to IV-3, IV-5 to
//     IV-9, IV-11 to IV-13, IV-15 to IV-17). Chapter 6.1 gives those to
//     `scheduleViolations` (PI-1) and requires it to be DRIVEN by table T-220
//     rather than written out row by row (MUST), so duplicating them here
//     would widen CP-13's scope. Three conditions do appear on both sides --
//     the WBS ring (IV-4), the accepted date range (IV-14) and `finish`
//     before `start` (IV-10) -- and they are tested here because FR-023 and
//     FR-012 name them in as many words for the moment BEFORE the document is
//     adopted (OP-5 of table T-024a runs before OP-3 is even asked), not
//     because this unit owns the invariant.
//   - The megabyte boundary of S-113. Its value column reads 「`32` MB」 under
//     a key named `importMaxBytes`, and docs/spec nowhere says how many bytes
//     a megabyte is, so 32,000,001 is accepted on one reading and refused on
//     the other. The cases below stay far away from that boundary on purpose.
//   - Where the depth of a WBS root starts counting (S-115). docs/spec does
//     not say whether a `Task` with no `wbsParentUid` is at depth 1 or 0, so
//     the chains below are far deeper or far shallower than the bound.
//   - A date column holding a string that names no day at all (an empty
//     string, or text). Table T-214 bounds dates, IV-14 asks the date columns
//     to sit inside that range, and FR-023 refuses 「範囲の外にある日付」 --
//     none of the three decides what an unreadable value is.
//
// The three above are reported as disagreements rather than asserted either
// way, because choosing would be making the decision docs/spec has not made.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type {
  BaselineTask,
  Calendar,
  CommentBox,
  Exception,
  HighlightBox,
  Project,
  Task,
  TaskGroup,
} from '../../src/entity/document-model/schedule/schedule'
import {
  validateImportedDocument,
  type ImportBounds,
  type ImportCandidate,
  type ImportVerdict,
} from '../../src/use-case/validate-imported-document/validate-imported-document'

// ---------------------------------------------------------------------------
// The tables, copied out
// ---------------------------------------------------------------------------

/**
 * Table T-211 — 保存と受け入れの上限, the three rows FR-023 calls 資源の上限
 * (「ファイルサイズ・件数・ネストの深さ」). 値 / 下限 / 上限 are the table's
 * own three columns.
 */
const T_211 = {
  'S-113': { key: 'importMaxBytes', value: 32, min: 1, max: 256 },
  'S-114': { key: 'importMaxItems', value: 20000, min: 1000, max: 200000 },
  'S-115': { key: 'importMaxDepth', value: 64, min: 8, max: 256 },
} as const

/** Table T-214 — 受け入れる日付の範囲（`FR-023`）. */
const T_214 = {
  'S-119': { key: 'importMinDate', value: '1970-01-01' },
  'S-120': { key: 'importMaxDate', value: '2200-12-31' },
} as const

/**
 * The bounds every case starts from: the value column of both tables, taken
 * through `ImportBounds` so a renamed settings key breaks the build.
 *
 * ⛔ They are the RECEIVING document's, never the arriving input's -- OP-5 of
 * table T-024a puts this check before OP-3 is asked, so the settings in force
 * are necessarily the current document's, and reading the input's own would
 * let an untrusted file raise its own ceiling (NFR-009).
 */
const BOUNDS: ImportBounds = {
  importMaxBytes: T_211['S-113'].value,
  importMaxItems: T_211['S-114'].value,
  importMaxDepth: T_211['S-115'].value,
  importMinDate: T_214['S-119'].value,
  importMaxDate: T_214['S-120'].value,
}

/**
 * Table T-058's date and datetime columns, one row at a time. IV-14 points at
 * 「表 T-058 の型の欄が日付または日時とする列」 rather than listing them, so
 * the list is the table's; `entity` is the array of the schedule group each
 * row sits in.
 */
const T_058_DATE_COLUMNS = [
  { row: 'AT-9', entity: 'project', column: 'created' },
  { row: 'AT-11', entity: 'project', column: 'lastSaved' },
  { row: 'AT-12', entity: 'project', column: 'startDate' },
  { row: 'AT-13', entity: 'project', column: 'statusDate' },
  { row: 'AT-28', entity: 'task', column: 'start' },
  { row: 'AT-29', entity: 'task', column: 'finish' },
  { row: 'AT-31', entity: 'task', column: 'deadline' },
  { row: 'AT-34', entity: 'task', column: 'actualStart' },
  { row: 'AT-36', entity: 'task', column: 'actualFinish' },
  { row: 'AT-37', entity: 'task', column: 'resume' },
  { row: 'AT-79', entity: 'exception', column: 'fromDate' },
  { row: 'AT-80', entity: 'exception', column: 'toDate' },
  { row: 'AT-113', entity: 'commentBox', column: 'anchorDate' },
  { row: 'AT-117', entity: 'highlightBox', column: 'startDate' },
  { row: 'AT-118', entity: 'highlightBox', column: 'endDate' },
  { row: 'AT-136', entity: 'baselineTask', column: 'start' },
  { row: 'AT-137', entity: 'baselineTask', column: 'finish' },
] as const

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// ⚠️ Every nullable column is spelled `null`, never left out. A column left
// `undefined` reads as "held" to anything that asks whether the row has one.

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

const projectOf = (part: Partial<Project> = {}): Project => ({
  id: null,
  name: null,
  title: 'A',
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

const exceptionOf = (part: Partial<Exception> = {}): Exception => ({
  ordinal: 1,
  name: null,
  fromDate: null,
  toDate: null,
  dayWorking: null,
  recurrenceKind: null,
  carry: {},
  carryElements: [],
  ...part,
})

const calendarOf = (part: Partial<Calendar> = {}): Calendar => ({
  uid: 1,
  name: null,
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 1,
  carry: {},
  carryElements: [],
  weekDays: [],
  exceptions: [],
  ...part,
})

const commentBoxOf = (part: Partial<CommentBox> = {}): CommentBox => ({
  id: 'c1',
  leaderShapeKind: null,
  text: null,
  anchorDate: null,
  anchorGroupId: null,
  bodyOffsetPx: null,
  ...part,
})

const highlightBoxOf = (part: Partial<HighlightBox> = {}): HighlightBox => ({
  id: 'h1',
  startDate: null,
  endDate: null,
  topGroupId: null,
  bottomGroupId: null,
  strokeColor: null,
  cornerRadiusPx: null,
  ...part,
})

const baselineTaskOf = (part: Partial<BaselineTask> = {}): BaselineTask => ({
  uid: 1,
  name: null,
  start: null,
  finish: null,
  milestone: null,
  ...part,
})

const taskGroupOf = (part: Partial<TaskGroup> & { readonly id: string }): TaskGroup => ({
  parentId: null,
  label: 'row',
  derivedFromTaskUid: null,
  order: 0,
  isCollapsed: null,
  isHidden: null,
  color: null,
  height: null,
  ...part,
})

interface DocumentParts {
  readonly project?: Project
  readonly tasks?: readonly Task[]
  readonly calendars?: readonly Calendar[]
  readonly taskGroups?: readonly TaskGroup[]
  readonly commentBoxes?: readonly CommentBox[]
  readonly highlightBoxes?: readonly HighlightBox[]
  readonly baselineTasks?: readonly BaselineTask[]
  readonly documentSettings?: Record<string, unknown>
}

/**
 * A whole `Document` is far more than these cases read, so the fixture carries
 * the keys this unit touches. Same idiom as the other unit files.
 *
 * ⚠️ The arriving document's OWN `importMax*` keys are spelled here at the
 * WIDEST the settings rows allow (the 上限 column of table T-211). Any case
 * that would pass only because the input's own ceiling was consulted therefore
 * stands out, which is the shape NFR-009 asks for.
 */
const documentOf = (part: DocumentParts = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: part.project ?? projectOf(),
      calendars: part.calendars ?? [],
      tasks: part.tasks ?? [],
      resources: [],
      assignments: [],
      taskGroups: part.taskGroups ?? [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: part.commentBoxes ?? [],
      highlightBoxes: part.highlightBoxes ?? [],
      taskOrigins: [],
      baselineTasks: part.baselineTasks ?? [],
    },
    documentSettings: {
      importMaxBytes: T_211['S-113'].max,
      importMaxItems: T_211['S-114'].max,
      importMaxDepth: T_211['S-115'].max,
      importMinDate: '0001-01-01',
      importMaxDate: '9999-12-31',
      ...(part.documentSettings ?? {}),
    },
    revisionStamp: { revision: 1, lastEditedBy: 'user', updatedAt: '2026-08-17T00:00:00' },
    changeLog: [],
  }) as unknown as Document

/** 1 KiB is below `importMaxBytes` on either reading of 「32 MB」. */
const SMALL = 1024

const candidateOf = (document: Document, part: Partial<ImportCandidate> = {}): ImportCandidate => ({
  document,
  byteLength: SMALL,
  emptyRowTaskUids: [],
  ...part,
})

const verdictOf = (document: Document, bounds: ImportBounds = BOUNDS): ImportVerdict =>
  validateImportedDocument(candidateOf(document), bounds)

/** In range on both ends of table T-214, and `finish` not before `start`. */
const IN_RANGE = { start: '2026-01-05', finish: '2026-01-09' } as const

const plainTask = (uid: number): Task => taskOf({ uid, name: `t${uid}`, ...IN_RANGE })

const refusalsOf = (verdict: ImportVerdict) => (verdict.ok ? [] : verdict.refusals)

// ---------------------------------------------------------------------------

describe('ValidateImportedDocument (UF-22) -- a sound candidate', () => {
  it('FR-023 accepts an input that breaks none of its rules, and hands back nothing else', () => {
    // FR-023 admits no partially applied import, so there is no third answer
    // and no mended document to be mistaken for one.
    expect(verdictOf(documentOf({ tasks: [plainTask(1), plainTask(2)] }))).toEqual({ ok: true })
  })
})

describe('ValidateImportedDocument (UF-22) -- table T-211, the resource ceilings', () => {
  it('S-113 refuses a source past `importMaxBytes` and accepts one well inside it', () => {
    // FR-023: 「資源の上限（ファイルサイズ・件数・ネストの深さ）を…表 T-211 に
    // 従って持ち、超えた入力は取り込まずに知らせること（MUST）」.
    const document = documentOf({ tasks: [plainTask(1)] })
    expect(validateImportedDocument(candidateOf(document), BOUNDS).ok).toBe(true)

    // 256 MiB is past 「32 MB」 whichever factor a megabyte is given, so this
    // case does not depend on the boundary docs/spec leaves open.
    const huge = validateImportedDocument(
      candidateOf(document, { byteLength: 256 * 1024 * 1024 }),
      BOUNDS,
    )
    expect(huge.ok).toBe(false)
    if (!huge.ok) {
      expect(huge.refusals[0]!.rule).toBe('S-113')
      // NT-6 of table T-037 is 「資源の上限に達したとき」, and FR-023 calls the
      // file size exactly that; NT-1 is for everything else it refuses.
      expect(huge.refusals[0]!.notice).toBe('NT-6')
    }
  })

  it('S-113 judges by the bound it is handed, not by a size of its own', () => {
    // 8 MiB is inside 「32 MB」 and past the row's 下限 of 1 on either reading.
    const document = documentOf({ tasks: [plainTask(1)] })
    const eightMiB = { byteLength: 8 * 1024 * 1024 }
    expect(validateImportedDocument(candidateOf(document, eightMiB), BOUNDS).ok).toBe(true)
    const tight = validateImportedDocument(candidateOf(document, eightMiB), {
      ...BOUNDS,
      importMaxBytes: T_211['S-113'].min,
    })
    expect(tight.ok).toBe(false)
    if (!tight.ok) expect(tight.refusals[0]!.rule).toBe('S-113')
  })

  it('S-114 refuses more `Task` rows than `importMaxItems`', () => {
    // Table T-211: 「取り込む `Task` の件数の上限」, value 20000.
    const rows = (count: number) => Array.from({ length: count }, (_, i) => plainTask(i + 1))
    expect(verdictOf(documentOf({ tasks: rows(T_211['S-114'].value) })).ok).toBe(true)

    const over = verdictOf(documentOf({ tasks: rows(T_211['S-114'].value + 1) }))
    expect(over.ok).toBe(false)
    if (!over.ok) {
      expect(over.refusals[0]!.rule).toBe('S-114')
      expect(over.refusals[0]!.notice).toBe('NT-6')
    }
  })

  it('S-115 refuses a WBS nesting deeper than `importMaxDepth`', () => {
    // Table T-211: 「WBS のネストの深さの上限」, value 64. A chain of 200 is
    // past it and a chain of 10 is inside it whether a root row counts as
    // depth 1 or 0, so neither case rests on the boundary docs/spec leaves open.
    const chain = (length: number): Task[] =>
      Array.from({ length }, (_, i) =>
        taskOf({ uid: i + 1, name: `t${i + 1}`, wbsParentUid: i === 0 ? null : i, ...IN_RANGE }),
      )
    expect(verdictOf(documentOf({ tasks: chain(10) })).ok).toBe(true)

    const deep = verdictOf(documentOf({ tasks: chain(200) }))
    expect(deep.ok).toBe(false)
    if (!deep.ok) {
      expect(deep.refusals[0]!.rule).toBe('S-115')
      expect(deep.refusals[0]!.notice).toBe('NT-6')
    }

    // And the bound is the one handed in: a chain of 10 is past the row's 下限
    // of 8 on either reading of where depth starts.
    const tight = verdictOf(documentOf({ tasks: chain(10) }), {
      ...BOUNDS,
      importMaxDepth: T_211['S-115'].min,
    })
    expect(tight.ok).toBe(false)
    if (!tight.ok) expect(tight.refusals[0]!.rule).toBe('S-115')
  })

  it('S-114 counts `Task` rows, and no other array of the schedule group', () => {
    // Table T-211 spells the row 「取り込む `Task` の件数の上限」. A document
    // whose `Task` rows sit at the bound is accepted however many rows the
    // other arrays hold -- here twice the bound again in `baselineTasks`.
    const bound = T_211['S-114'].min
    const document = documentOf({
      tasks: Array.from({ length: bound }, (_, i) => plainTask(i + 1)),
      baselineTasks: Array.from({ length: bound * 2 }, (_, i) => baselineTaskOf({ uid: i + 1 })),
    })
    expect(verdictOf(document, { ...BOUNDS, importMaxItems: bound })).toEqual({ ok: true })
  })

  it('NFR-009 keeps an untrusted input from raising its own ceiling', () => {
    // The arriving document states the widest `importMaxItems` table T-211
    // allows (200000). It is not the bound: OP-5 runs before OP-3 is asked and
    // OP-6 restores an arriving `documentSettings` only after 置き換え has been
    // chosen, so the settings in force are the receiving document's.
    const document = documentOf({
      tasks: Array.from({ length: T_211['S-114'].value + 1 }, (_, i) => plainTask(i + 1)),
      documentSettings: { importMaxItems: T_211['S-114'].max },
    })
    const verdict = verdictOf(document)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.refusals[0]!.rule).toBe('S-114')
  })
})

describe('ValidateImportedDocument (UF-22) -- FR-023, the WBS ring', () => {
  // FR-023 (MUST NOT): 「階層の循環（あるタスクの親が、その子孫である状態）を
  // 検出して取り込まないこと」——「`FR-005` が禁じているのは作成者が画面で行う
  // 移動だけで、外から来た循環は素通りする」. Table T-220's IV-4 states the same
  // condition for a document already in hand; it is checked here because FR-023
  // names it for the moment before the document is adopted.

  it('FR-023 refuses two tasks when each is the WBS parent of the other', () => {
    const verdict = verdictOf(
      documentOf({
        tasks: [
          taskOf({ uid: 1, name: 'a', wbsParentUid: 2, ...IN_RANGE }),
          taskOf({ uid: 2, name: 'b', wbsParentUid: 1, ...IN_RANGE }),
        ],
      }),
    )
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.refusals[0]!.rule).toBe('FR-023')
      // NT-1 of table T-037: 「入力を受け付けないとき」. A ring is not one of
      // FR-023's three 資源の上限, so it is not NT-6.
      expect(verdict.refusals[0]!.notice).toBe('NT-1')
    }
  })

  it('FR-023 refuses a longer ring, and answers rather than walking it forever', () => {
    // 「循環では深さが確定しないので、ネストの深さの上限でも検出できない」 --
    // the depth walk cannot terminate on a ring, so the ring has to be found
    // as a ring. A refusal is a value, never a throw (AG-8 of table T-035).
    const ringOfThree = documentOf({
      tasks: [
        taskOf({ uid: 1, name: 'a', wbsParentUid: 3, ...IN_RANGE }),
        taskOf({ uid: 2, name: 'b', wbsParentUid: 1, ...IN_RANGE }),
        taskOf({ uid: 3, name: 'c', wbsParentUid: 2, ...IN_RANGE }),
      ],
    })
    expect(() => verdictOf(ringOfThree)).not.toThrow()
    const verdict = verdictOf(ringOfThree)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.refusals[0]!.rule).toBe('FR-023')
  })

  it('FR-023 refuses a task that is its own WBS parent', () => {
    // IV-4 asks that 「`Task.wbsParentUid` がたどる親子に輪が無いこと」, and a
    // row pointing at itself is a loop of one. Its depth is no more decidable
    // than a longer ring's.
    const verdict = verdictOf(
      documentOf({ tasks: [taskOf({ uid: 1, name: 'a', wbsParentUid: 1, ...IN_RANGE })] }),
    )
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.refusals[0]!.rule).toBe('FR-023')
  })

  it('FR-023 lets an ordinary tree through -- a shared parent is not a ring', () => {
    expect(
      verdictOf(
        documentOf({
          tasks: [
            taskOf({ uid: 1, name: 'a', wbsParentUid: null, ...IN_RANGE }),
            taskOf({ uid: 2, name: 'b', wbsParentUid: 1, ...IN_RANGE }),
            taskOf({ uid: 3, name: 'c', wbsParentUid: 1, ...IN_RANGE }),
            taskOf({ uid: 4, name: 'd', wbsParentUid: 3, ...IN_RANGE }),
          ],
        }),
      ),
    ).toEqual({ ok: true })
  })
})

describe('ValidateImportedDocument (UF-22) -- table T-214, the accepted date range', () => {
  // FR-023 (MUST NOT): 「受け入れる日付の範囲を表 T-214 に従って持ち、範囲の外に
  // ある日付を含む入力を取り込まないこと」. S-119 is 「これより前の日付を持つ
  // 入力を受け付けない」 and S-120 is 「これより後を受け付けない」, so each end
  // of the range is refused by its own row.

  /** The same date planted in one column of table T-058, whichever row it is. */
  const documentWithDate = (
    entity: (typeof T_058_DATE_COLUMNS)[number]['entity'],
    column: string,
    text: string,
  ): Document => {
    const at = <T>(base: T): T => ({ ...base, [column]: text }) as T
    // ⚠️ `start` and `finish` move together, so that planting an out-of-range
    // date in one of them cannot also put `finish` before `start` and add a
    // second, unrelated FR-012 refusal to the answer.
    const bothEnds = entity === 'task' && (column === 'start' || column === 'finish')
    const task =
      entity !== 'task'
        ? plainTask(1)
        : bothEnds
          ? taskOf({ uid: 1, name: 't1', start: text, finish: text })
          : at(plainTask(1))
    return documentOf({
      project: entity === 'project' ? at(projectOf()) : projectOf(),
      tasks: [task],
      calendars:
        entity === 'exception' ? [calendarOf({ exceptions: [at(exceptionOf())] })] : [calendarOf()],
      commentBoxes: entity === 'commentBox' ? [at(commentBoxOf())] : [],
      highlightBoxes: entity === 'highlightBox' ? [at(highlightBoxOf())] : [],
      baselineTasks: entity === 'baselineTask' ? [at(baselineTaskOf())] : [],
    })
  }

  it('S-119 refuses a date before `importMinDate`, in every date column of table T-058', () => {
    for (const { row, entity, column } of T_058_DATE_COLUMNS) {
      const verdict = verdictOf(documentWithDate(entity, column, '1969-12-31'))
      expect({ row, ok: verdict.ok }).toEqual({ row, ok: false })
      expect({ row, rules: refusalsOf(verdict).map((refusal) => refusal.rule) }).toEqual({
        row,
        rules: expect.arrayContaining(['S-119']),
      })
      // NT-1 of table T-037 requires the notice to say 「どの項目が、なぜ誤りか」,
      // so the refusal has to name the column and not only the rule.
      expect({
        row,
        named: refusalsOf(verdict).some((refusal) => refusal.at.includes(column)),
      }).toEqual({ row, named: true })
    }
  })

  it('S-120 refuses a date after `importMaxDate`, in every date column of table T-058', () => {
    for (const { row, entity, column } of T_058_DATE_COLUMNS) {
      const verdict = verdictOf(documentWithDate(entity, column, '2201-01-01'))
      expect({ row, ok: verdict.ok }).toEqual({ row, ok: false })
      expect({ row, rules: refusalsOf(verdict).map((refusal) => refusal.rule) }).toEqual({
        row,
        rules: expect.arrayContaining(['S-120']),
      })
      expect({
        row,
        named: refusalsOf(verdict).some((refusal) => refusal.at.includes(column)),
      }).toEqual({ row, named: true })
    }
  })

  it('S-119 and S-120 accept the two days they name -- the range is inclusive', () => {
    // 「これより前」 and 「これより後」: the ends themselves are inside.
    expect(
      verdictOf(
        documentOf({
          project: projectOf({
            startDate: T_214['S-119'].value,
            statusDate: T_214['S-120'].value,
          }),
          tasks: [
            taskOf({
              uid: 1,
              name: 'a',
              start: T_214['S-119'].value,
              finish: T_214['S-120'].value,
            }),
          ],
        }),
      ),
    ).toEqual({ ok: true })
  })

  it('S-119 and S-120 are read off the bounds handed in, not off the two dates', () => {
    const document = documentOf({ tasks: [plainTask(1)] })
    expect(verdictOf(document).ok).toBe(true)
    // IN_RANGE is 2026, so a receiving document whose range stops in 2020
    // refuses it -- the numbers are the settings rows', not this unit's.
    const narrow = verdictOf(document, { ...BOUNDS, importMaxDate: '2020-12-31' })
    expect(narrow.ok).toBe(false)
    if (!narrow.ok) {
      expect(narrow.refusals[0]!.rule).toBe('S-120')
      // Not a 資源の上限, so table T-037's NT-1 rather than NT-6.
      expect(narrow.refusals[0]!.notice).toBe('NT-1')
    }
  })

  it('S-119 reads a date column carrying a time part, the way EX-7 spells one', () => {
    // Table T-058 types most of these columns 日時, and EX-7 of table T-033
    // fixes the spelling GRS writes as 「交換相手の型（`xsd:dateTime`）」 with a
    // time of `00:00:00` -- so an imported file ordinarily arrives with a time
    // part on it. The day such a value names is what table T-214 bounds.
    expect(
      verdictOf(
        documentOf({
          tasks: [
            taskOf({
              uid: 1,
              name: 'a',
              start: '2026-01-05T00:00:00',
              finish: '2026-01-09T00:00:00',
            }),
          ],
        }),
      ),
    ).toEqual({ ok: true })

    const early = verdictOf(
      documentOf({
        tasks: [
          taskOf({
            uid: 1,
            name: 'a',
            start: '1969-12-31T00:00:00',
            finish: '1969-12-31T00:00:00',
          }),
        ],
      }),
    )
    expect(early.ok).toBe(false)
    if (!early.ok) expect(early.refusals[0]!.rule).toBe('S-119')
  })

  it('IV-14 leaves a null date column alone -- absent is not out of range', () => {
    // Every date column of table T-058 is 可 (nullable), so a document that
    // holds none of them must not be refused for the range.
    expect(verdictOf(documentOf({ tasks: [plainTask(1)], calendars: [calendarOf()] }))).toEqual({
      ok: true,
    })
  })

  // CR-179. FR-023 now names one class -- 「文書が使えない日付」 -- covering a
  // value that names no day AND one outside table T-214, and forbids taking
  // either in silence. ⛔ Before it, a date column holding text went STRAIGHT
  // THROUGH and no test noticed, because none asked.
  it('IV-14 refuses a date column that names no day, in every date column of table T-058', () => {
    for (const { row, entity, column } of T_058_DATE_COLUMNS) {
      const verdict = verdictOf(documentWithDate(entity, column, 'not a date'))
      expect({ row, ok: verdict.ok }).toEqual({ row, ok: false })
      expect({ row, rules: refusalsOf(verdict).map((refusal) => refusal.rule) }).toEqual({
        row,
        rules: expect.arrayContaining(['IV-14']),
      })
      // NT-1 wants 「どの項目が、なぜ誤りか」, and FR-023 makes the caller offer
      // "drop those rows" -- which it cannot do unless the refusal says which
      // row and which column.
      expect({ row, named: refusalsOf(verdict).some((one) => one.at.endsWith(`/${column}`)) })
        .toEqual({ row, named: true })
    }
  })

  it('IV-14 refuses an EMPTY date column -- absence is spelled `null`, not `""`', () => {
    // ⚠️ The tempting special case. A column that allows absence carries
    // `null` (FR-024's contract), so `""` is already outside the contract and
    // is not a second way of saying "absent".
    const verdict = verdictOf(documentWithDate('task', 'deadline', ''))
    expect(verdict.ok).toBe(false)
    expect(refusalsOf(verdict).map((one) => one.rule)).toEqual(expect.arrayContaining(['IV-14']))
  })

  it('IV-14 sends its refusal down the NT-1 notice, not the resource one', () => {
    // NT-6 is 「資源の上限に達したとき」 and belongs to table T-211. An unusable
    // date is an item the reader can be pointed at, which is what parts the two
    // treatments: FR-023 offers the two choices here and not for a ceiling.
    const verdict = verdictOf(documentWithDate('task', 'deadline', 'not a date'))
    expect(refusalsOf(verdict).every((one) => one.notice === 'NT-1')).toBe(true)
  })
})

describe('ValidateImportedDocument (UF-22) -- FR-012, the two rules it sends here', () => {
  it('FR-012 refuses a `Task` with no `start` and one with no `finish`', () => {
    // FR-012 (MUST NOT): 「`start` または `finish` を持たない `Task` を、画面に
    // 出す `Task` として受け付けてはならない」——「取り込む入力は `FR-023` の
    // 検証で弾く」.
    for (const missing of [{ start: null }, { finish: null }] as const) {
      const verdict = verdictOf(
        documentOf({ tasks: [taskOf({ uid: 1, name: 'a', ...IN_RANGE, ...missing })] }),
      )
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) {
        expect(verdict.refusals[0]!.rule).toBe('FR-012')
        expect(verdict.refusals[0]!.notice).toBe('NT-1')
      }
    }
  })

  it('FR-012 refuses a `Task` whose `finish` is before its `start`', () => {
    // FR-012 (MUST NOT): 「`finish` が `start` より前の入力を受け付けてはなら
    // ない」——「外から来た入力は `FR-023` の検証で弾く」. And it must not be
    // mended: 「丸めて `finish` = `start` にしてはならない（MUST NOT）」, which
    // is why the answer carries no document at all.
    const verdict = verdictOf(
      documentOf({
        tasks: [taskOf({ uid: 1, name: 'a', start: '2026-01-09', finish: '2026-01-05' })],
      }),
    )
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.refusals[0]!.rule).toBe('FR-012')
    expect('document' in verdict).toBe(false)
  })

  it('FR-012 accepts `finish` equal to `start` -- a duration of 0 is a task', () => {
    // IV-10 asks only that 「`finish` が `start` より前でない」, and FR-012's
    // own text keeps a task of duration 0 (「`UC-001` 拡張 2a が作る『開始日 ＝
    // 終了日のタスク』も期間 0 である」).
    expect(
      verdictOf(
        documentOf({
          tasks: [taskOf({ uid: 1, name: 'a', start: '2026-01-05', finish: '2026-01-05' })],
        }),
      ),
    ).toEqual({ ok: true })
  })

  it('FR-012 does not fail a whole file for the 中身のない行 of EX-5', () => {
    // FR-012 (MUST): 「表 T-033 の `EX-5` が定める「中身のない行」は、この禁止の
    // 対象外とすること」, and (MUST NOT) 「中身のない行が含まれることを理由に
    // ファイルごと拒んではならない」 -- 「中身のない行が 1 つあるだけで取込が
    // 丸ごと失敗し、`FR-021` の往復無損失も同時に落ちる」.
    const document = documentOf({ tasks: [plainTask(1), taskOf({ uid: 2 })] })

    const declared = validateImportedDocument(
      candidateOf(document, { emptyRowTaskUids: [2] }),
      BOUNDS,
    )
    expect(declared).toEqual({ ok: true })

    // The very same document, with nobody saying uid 2 is an empty row, is a
    // `Task` holding neither date -- which is the refusal above.
    const undeclared = verdictOf(document)
    expect(undeclared.ok).toBe(false)
    if (!undeclared.ok) expect(undeclared.refusals[0]!.rule).toBe('FR-012')
  })
})

describe('ValidateImportedDocument (UF-22) -- what FR-023 does not refuse', () => {
  it('FR-058 accepts a `TaskGroup` nesting deeper than S-125', () => {
    // FR-058 (MUST NOT): 「取り込みでは `TaskGroup` の深さ上限で受け付けを拒んで
    // はならない」——「上限が掛かるのは人が階層を作るときだけである（`FR-004`）」.
    // S-125 of table T-211 is 5; twelve nested rows must still come in.
    const groups = Array.from({ length: 12 }, (_, i) =>
      taskGroupOf({ id: `g${i + 1}`, parentId: i === 0 ? null : `g${i}`, order: i }),
    )
    expect(verdictOf(documentOf({ tasks: [plainTask(1)], taskGroups: groups }))).toEqual({
      ok: true,
    })
  })

  it('FR-023 answers about the WHOLE candidate -- refused means nothing to adopt', () => {
    // 「超えた入力は取り込まずに知らせること（MUST）。部分的に適用してはならない
    // （MUST NOT）」——「途中まで取り込んだ状態は、利用者から見て「壊れた文書」と
    // 区別がつかない」. The refusal names items so a person can fix the file
    // (NT-1), and carries no repaired document a caller could adopt in part.
    const verdict = verdictOf(
      documentOf({
        tasks: [taskOf({ uid: 1, name: 'a', start: null, finish: null })],
        project: projectOf({ statusDate: '1900-01-01' }),
      }),
    )
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.refusals.length).toBeGreaterThan(0)
      for (const refusal of verdict.refusals) {
        expect(typeof refusal.what).toBe('string')
        expect(refusal.what.length).toBeGreaterThan(0)
      }
    }
    expect(Object.keys(verdict).sort()).toEqual(['ok', 'refusals'])
  })
})
