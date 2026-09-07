// Unit tests for EditDocument's Calendar aggregate (UF-16) -- CM-39 of table
// T-108, the one command of the `Calendar` group.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⚠️ Every expectation below is read out of docs/spec, not out of the unit:
// FR-088 (暦を編集する), FR-054 (稼働日と非稼働日を区別する), table T-209
// (S-106 / S-108), table T-220's IV-17, table T-058's AT-17 / AT-73 and table
// T-027's UN-13. Chapter 1.9 asks a test that points at a table to be driven
// by fixed data copied from it, which is what `S_106_WORKING` and
// `weekDaysOf` below are.
//
// ⛔ NOT TESTED, because the unit deliberately does not have it: the exception
// -day half of FR-088 (「例外日（休業日）」). `CalendarCommand` declares no
// field for it -- AT-82's `recurrenceKind` has no code that means "does not
// recur", so GRS cannot write a day of its own, and no rule says whether a new
// list replaces, adds to or deletes the rows already there. Nothing here may
// invent either answer.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Calendar, WeekDay } from '../../src/entity/document-model/schedule/schedule'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import { editCalendar } from '../../src/use-case/edit-document/edit-calendar'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'

// ---------------------------------------------------------------------------
// Fixed data copied from the tables (Chapter 1.9)
// ---------------------------------------------------------------------------

/** AT-73: `WeekDay.dayType` is an integer 1..7. The sweep is the column. */
const DAY_TYPES = [1, 2, 3, 4, 5, 6, 7] as const

/**
 * Table T-209's `S-106` -- 稼働する曜日: 月・火・水・木・金, i.e. the five
 * weekdays between the two the row calls non-working. Written in AT-73's
 * coding, whose authority is the official XSD Chapter 6.2 points at: the
 * first code is Sunday, so Monday..Friday are 2..6.
 */
const S_106_WORKING: readonly number[] = [2, 3, 4, 5, 6]

/**
 * ⚠️ Both nullable columns of `WeekDay` are spelled: an absent `dayWorking`
 * would read as "not set", which is a different row of the table from `false`.
 */
const weekDaysOf = (working: readonly number[]): readonly WeekDay[] =>
  DAY_TYPES.map((dayType, ordinal) => ({
    ordinal,
    dayType,
    dayWorking: working.includes(dayType),
    carry: {},
    carryElements: [],
  }))

const calendarOf = (part: Partial<Calendar> = {}): Calendar => ({
  uid: 1,
  name: 'Standard',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: weekDaysOf(S_106_WORKING),
  exceptions: [],
  ...part,
})

// A whole Document is far more than these cases read, so the fixture carries
// the keys the aggregate actually touches. Same idiom as use-case.test.ts.
// ⚠️ `weekStartDay` and `calendarUid` are spelled on every fixture: AT-17 and
// AT-18 are nullable, and leaving one `undefined` reads as "set".
const documentOf = (part: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        title: 'A',
        statusDate: null,
        startDate: null,
        themeHue: 214,
        minutesPerDay: null,
        weekStartDay: 1, // S-108's 月曜 in AT-17's coding (first code = Sunday)
        calendarUid: null,
        carry: {},
        carryElements: [],
        ...((part.project as Record<string, unknown>) ?? {}),
      },
      calendars: (part.calendars as readonly Calendar[]) ?? [calendarOf()],
      tasks: (part.tasks as readonly unknown[]) ?? [],
      resources: (part.resources as readonly unknown[]) ?? [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    // ⚠️ Every key of the presentation group is carried even though this
    // aggregate reads none of them: `planDocumentChange` clamps settings, and
    // one missing key turns a comparison into NaN.
    documentSettings: {
      stackDirection: 'up',
      planActualDisplay: 'both',
      guideCursorMode: 'none',
      dualCursor: null,
      fontScale: 'M',
      fontScaleSizes: { S: 12, M: 14, L: 16 },
      rulerFont: 14,
      rulerHeight: 48,
      canvasPadding: 10,
      rowTitlePanelWidth: 170,
      propertyPanelWidth: 280,
      pinnedGroupIds: [],
      pinnedRowMax: 5,
      zoomX: 1,
      zoomY: 1,
      scrollDate: null,
      scrollGroupId: null,
      dependencyVisible: true,
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// What table T-067's WS-1 to WS-5 need around one command. Same values as
// use-case.test.ts; only the UN-13 case below reads them.
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

/** The dayTypes the named calendar works, so a case can name a set, not rows. */
const workingOf = (document: Document, uid: number): readonly number[] =>
  document.schedule.calendars
    .filter((one) => one.uid === uid)
    .flatMap((one) => one.weekDays)
    .filter((weekDay) => weekDay.dayWorking === true)
    .map((weekDay) => weekDay.dayType as number)

const calendarWithUid = (document: Document, uid: number): Calendar =>
  document.schedule.calendars.find((one) => one.uid === uid) as Calendar

/**
 * A `Task` for the FR-012 cases. Every column of table T-058 the formula reads
 * is spelled; the rest is what the aggregate never looks at.
 */
const taskOf = (part: Record<string, unknown>): unknown => ({
  uid: 0,
  wbsParentUid: null,
  wbsOrder: 0,
  name: 'a task',
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

const percentOf = (document: Document, uid: number): number | null =>
  document.schedule.tasks.find((one) => one.uid === uid)?.percentComplete ?? null

describe('EditCalendar (UF-16) -- CM-39 of table T-108', () => {
  it('FR-088 settles the working weekdays and the week start in ONE document', () => {
    // FR-088 (MUST): 「1 回の編集が `Calendar` と `Project` の両方に及ぶときも、
    // まとめて 1 回の書き込みで確定すること」。 What this unit owes towards it
    // is ONE new Document carrying both halves -- never one half at a time.
    const document = documentOf()
    const result = editCalendar(document, {
      kind: 'setCalendar',
      workingDayTypes: [2, 3, 4, 5, 6, 7],
      weekStartDay: 0,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(workingOf(result.document, 1)).toEqual([2, 3, 4, 5, 6, 7])
    expect(result.document.schedule.project.weekStartDay).toBe(0)
    // 「別々に確定させると、稼働する曜日だけが変わって週の始まりが変わらない
    // 中間状態を人が読める」 -- the document handed in is not the one that
    // moved, so no intermediate state exists to be read.
    expect(workingOf(document, 1)).toEqual(S_106_WORKING)
    expect(document.schedule.project.weekStartDay).toBe(1)
  })

  it('S-106 is a set of weekdays, and the ones the command omits stop working', () => {
    // The command's list is the whole answer, so switching to S-106's five
    // leaves the other two non-working rather than untouched.
    const saturdayToo = documentOf({ calendars: [calendarOf({ weekDays: weekDaysOf([1, 7]) })] })
    const result = editCalendar(saturdayToo, {
      kind: 'setCalendar',
      workingDayTypes: S_106_WORKING,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const byDayType = new Map(
      calendarWithUid(result.document, 1).weekDays.map((weekDay) => [
        weekDay.dayType,
        weekDay.dayWorking,
      ]),
    )
    // Driven by the row, not by a rule written out one weekday at a time.
    for (const dayType of DAY_TYPES) {
      expect(byDayType.get(dayType)).toBe(S_106_WORKING.includes(dayType))
    }
  })

  it('IV-17 leaves the resolved calendar working the named days even with no rows to start from', () => {
    // An imported calendar can arrive with no `WeekDay` row at all -- CR-171
    // records that 「`WeekDays` は必須ではない」 in the exchange partner's
    // schema -- and IV-17 still asks the calendar FR-054 resolves to work at
    // least one weekday. An edit that quietly did nothing would leave the
    // invariant broken while reporting success.
    const bare = documentOf({ calendars: [calendarOf({ weekDays: [] })] })
    const result = editCalendar(bare, { kind: 'setCalendar', workingDayTypes: [2, 3] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect([...workingOf(result.document, 1)].sort()).toEqual([2, 3])
  })

  it('FR-088 leaves alone the half a command does not carry', () => {
    // FR-088 folds the parts into one command so a combined edit commits once.
    // It does not ask every edit to carry every part.
    const document = documentOf()
    const weekStartOnly = editCalendar(document, { kind: 'setCalendar', weekStartDay: 4 })
    expect(weekStartOnly.ok).toBe(true)
    if (weekStartOnly.ok) {
      expect(weekStartOnly.document.schedule.project.weekStartDay).toBe(4)
      expect(workingOf(weekStartOnly.document, 1)).toEqual(S_106_WORKING)
    }
    const daysOnly = editCalendar(document, { kind: 'setCalendar', workingDayTypes: [3] })
    expect(daysOnly.ok).toBe(true)
    if (daysOnly.ok) {
      expect(workingOf(daysOnly.document, 1)).toEqual([3])
      expect(daysOnly.document.schedule.project.weekStartDay).toBe(1)
    }
  })

  it('AT-17 admits null for the week start, which S-108 answers where the ruler is drawn', () => {
    // AT-17 is nullable and table T-209 covers 「取り込んだが値が空の文書」, so
    // an empty week start is a state, not an error. FR-054 has the week ruler
    // read S-108 when it is empty -- it is not filled in here.
    const result = editCalendar(documentOf(), { kind: 'setCalendar', weekStartDay: null })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.schedule.project.weekStartDay).toBeNull()
  })

  it('FR-088 keeps the two weekday codings apart -- AT-17 is 0..6, AT-73 is 1..7', () => {
    // FR-088: 「2 つの曜日の符号は別である —— `Project.weekStartDay` と
    // `WeekDay.dayType` は範囲が違い（表 T-058 の `AT-17` / `AT-73`）」。
    // The two values that separate the ranges decide it: 0 is a week start and
    // never a dayType, 7 is a dayType and never a week start. A unit that
    // converted between the codings, or validated one by the other's range,
    // cannot answer all four the way the two rows do.
    expect(editCalendar(documentOf(), { kind: 'setCalendar', weekStartDay: 0 }).ok).toBe(true)
    expect(editCalendar(documentOf(), { kind: 'setCalendar', weekStartDay: 7 }).ok).toBe(false)
    expect(
      editCalendar(documentOf(), { kind: 'setCalendar', workingDayTypes: [7] }).ok,
    ).toBe(true)
    expect(
      editCalendar(documentOf(), { kind: 'setCalendar', workingDayTypes: [0, 2] }).ok,
    ).toBe(false)
  })

  it('FR-088 refuses a calendar that works no weekday at all, and resets nothing', () => {
    // FR-088 (MUST NOT / MUST): 「稼働する曜日を 1 つも持たない暦を、文書の暦
    // にしてはならない（MUST NOT）。受け付けずに通知すること（MUST）」。The
    // condition is IV-17 of table T-220; the refusal is this requirement's.
    const document = documentOf()
    const result = editCalendar(document, { kind: 'setCalendar', workingDayTypes: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.refusals[0]!.rule).toBe('FR-088')
      // Table T-108 gives this command its row, and AG-9a reports it.
      expect(result.refusals[0]!.command).toBe('CM-39')
    }
    // MUST NOT: 「既定の暦（表 T-209）へ黙って戻してはならない」 —— the
    // calendar in hand is exactly as it was, not S-106 put back quietly.
    expect(workingOf(document, 1)).toEqual(S_106_WORKING)
  })

  it('FR-088 refuses the whole edit when the weekday half is empty, week start included', () => {
    // The two halves are one command, so a refused half does not let the other
    // through -- that is the same all-or-nothing FR-088 hands to WS-3.
    const document = documentOf()
    const result = editCalendar(document, {
      kind: 'setCalendar',
      workingDayTypes: [],
      weekStartDay: 5,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusals[0]!.rule).toBe('FR-088')
    expect(document.schedule.project.weekStartDay).toBe(1)
  })

  it('FR-054 edits the calendar `Project.calendarUid` names, and no other', () => {
    // FR-054 (MUST): 「文書の暦は 1 つとし、`Project.calendarUid` が指す
    // `Calendar` とすること」。
    const document = documentOf({
      project: { weekStartDay: 1, calendarUid: 7 },
      calendars: [
        calendarOf({ uid: 4, ordinal: 0, weekDays: weekDaysOf(S_106_WORKING) }),
        calendarOf({ uid: 7, ordinal: 1, weekDays: weekDaysOf(S_106_WORKING) }),
      ],
    })
    const result = editCalendar(document, { kind: 'setCalendar', workingDayTypes: [1, 7] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(workingOf(result.document, 7)).toEqual([1, 7])
    // The other calendar is carried for the round trip and is not the
    // document's calendar, so nothing may reach it.
    expect(workingOf(result.document, 4)).toEqual(S_106_WORKING)
  })

  it('FR-054 falls to the lowest-ordinal base calendar when the pointer is empty or dangling', () => {
    // FR-054 (MUST): 「指していないとき、および指す先が無いときは、
    // `isBaseCalendar` が真の `Calendar` のうち `ordinal` が最小のもの」。
    // The decoy is a NON-base calendar with the smallest ordinal of all: it
    // wins only if `isBaseCalendar` is skipped.
    const calendars = [
      calendarOf({ uid: 1, ordinal: 0, isBaseCalendar: false }),
      calendarOf({ uid: 2, ordinal: 5, isBaseCalendar: true }),
      calendarOf({ uid: 3, ordinal: 2, isBaseCalendar: true }),
    ]
    for (const calendarUid of [null, 999]) {
      const document = documentOf({ project: { weekStartDay: 1, calendarUid }, calendars })
      const result = editCalendar(document, { kind: 'setCalendar', workingDayTypes: [1] })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(workingOf(result.document, 3)).toEqual([1])
      expect(workingOf(result.document, 1)).toEqual(S_106_WORKING)
      expect(workingOf(result.document, 2)).toEqual(S_106_WORKING)
    }
  })

  it('FR-054 must not read Task.calendarUid or Resource.calendarUid', () => {
    // FR-054 (MUST NOT): 「`Task.calendarUid` と `Resource.calendarUid` は、
    // 交換相手の値を往復させるために保持するだけであり、稼働日の数え上げに
    // 使ってはならない」。 Here they name a calendar that FR-054's own order
    // never reaches -- it is not base, and `Project.calendarUid` is empty --
    // so an edit landing there would be that MUST NOT.
    const document = documentOf({
      project: { weekStartDay: 1, calendarUid: null },
      calendars: [
        calendarOf({ uid: 8, ordinal: 0, isBaseCalendar: false }),
        calendarOf({ uid: 9, ordinal: 5, isBaseCalendar: true }),
      ],
      tasks: [{ uid: 1, name: 'T', calendarUid: 8, start: null, finish: null }],
      resources: [{ uid: 1, name: 'R', calendarUid: 8 }],
    })
    const result = editCalendar(document, { kind: 'setCalendar', workingDayTypes: [2] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(workingOf(result.document, 9)).toEqual([2])
    expect(workingOf(result.document, 8)).toEqual(S_106_WORKING)
  })

  it('S-107 keeps the exception days an edit of the weekdays was not asked to touch', () => {
    // FR-088 puts the exception days on the same command, so an edit that
    // carries only the weekdays says nothing about them. 「データを黙って変え
    // ない」 (FR-088, quoting FR-012) leaves the rows exactly where they are --
    // including the recurring ones FR-054 deliberately does not expand, and
    // the `carry` columns (AT-83) that exist to be written back unchanged.
    const exceptions = [
      {
        ordinal: 0,
        name: 'shutdown',
        fromDate: '2026-08-13T00:00:00',
        toDate: '2026-08-15T00:00:00',
        dayWorking: false,
        recurrenceKind: 1,
        carry: { EnteredByOccurrences: '0' },
        carryElements: [],
      },
    ]
    const document = documentOf({ calendars: [calendarOf({ exceptions })] })
    const result = editCalendar(document, { kind: 'setCalendar', workingDayTypes: [2, 3] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(calendarWithUid(result.document, 1).exceptions).toEqual(exceptions)
  })

  it('UN-13 of table T-027 makes an edit of the calendar undoable and moves the schedule instant', () => {
    // UN-13 lists 暦（`FR-088`）among the document-wide settings undo covers,
    // and table T-209 files its values in 日程データの群, which WS-5 of table
    // T-067 is the one that moves `documentStamp.scheduleUpdatedUtc` for.
    const document = documentOf()
    const command: DocumentCommand = {
      kind: 'setCalendar',
      workingDayTypes: [2, 3, 4, 5, 6, 7],
      weekStartDay: 0,
    }
    const plan = planDocumentChange({
      document,
      readStamp: document.documentStamp,
      commands: [command],
      moment: CALM,
      history: EMPTY_HISTORY,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'user',
      updatedUtc: '2026-08-17T01:00:00Z',
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.history.done).toHaveLength(1)
    expect(plan.hasMovedSchedule).toBe(true)
    // One write, both halves (FR-088).
    expect(workingOf(plan.document, 1)).toEqual([2, 3, 4, 5, 6, 7])
    expect(plan.document.schedule.project.weekStartDay).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// FR-012 -- 「稼働日の暦を編集したときも、格納済みの完了率を数え直すこと（MUST）」
//           （利用者の裁定 2026-09-07。台帳 D-353）
//
// ⭐ THE ONE FIXTURE ALL FOUR CASES SHARE. A plan of 2026-09-07 (Mon) to
// 2026-09-14 (Mon) with 3 worked days behind it, counted once by 表 T-209's
// S-106 calendar (月〜金) and once by that calendar with Saturday added.
//
// ⛔⛔ THE LEDGER'S OWN ARITHMETIC FOR THIS EXAMPLE IS WRONG, AND THE
// SPECIFICATION SAYS SO. D-353 records 「月〜金の暦では 6 稼働日で 50%、土曜を
// 足すと 7 稼働日で 43%」, which counts 2026-09-14 as a worked day of the plan.
// FR-012 forbids exactly that: 「期間は開始日と終了日の差とし、端を含む日数と取り
// 違えないこと（MUST NOT）—— 含めると期間 0 が存在しなくなり、この規定が空振り
// する」, and `workingDaysBetween` counts [from, to). ⇒ MEASURED 2026-09-07:
// 月〜金 = 5 worked days = 60%, 土曜を足すと 6 worked days = 50%. ⭐ The example
// still shows what it was written to show -- the stored figure moves although
// no date moved -- and the two numbers below are the measured pair, not the
// ledger's.
// ---------------------------------------------------------------------------

const PLAN_START = '2026-09-07T00:00:00' // Monday
const PLAN_FINISH = '2026-09-14T00:00:00' // the Monday after; a bound, not a worked day
const WORKED_DAYS = 3

/** What FR-012 stores while the calendar is 表 T-209's S-106 (月〜金). */
const PERCENT_UNDER_MON_TO_FRI = 60
/** What it stores once Saturday is worked. AT-73's first code is Sunday, so 7. */
const SATURDAY = 7
const PERCENT_WITH_SATURDAY = 50

/** The document both FR-012 cases start from: one task that moves, one that does not. */
const documentWithAPricedTask = (): Document =>
  documentOf({
    tasks: [
      taskOf({
        uid: 10,
        name: 'the task whose figure moves',
        start: PLAN_START,
        finish: PLAN_FINISH,
        actualDuration: WORKED_DAYS,
        percentComplete: PERCENT_UNDER_MON_TO_FRI,
      }),
      // ⛔ NOT DECORATION. FR-012's count is 「値が変わった `Task` の件数」 and not
      // every task the calendar reaches, so a task the change leaves alone has to
      // be in the document for the count to be a claim. EX-5 of table T-033 -- 中身
      // のない行 -- is the case FR-012 excepts from its own MUST NOT, and its stored
      // figure is kept as it stands.
      taskOf({ uid: 11, name: '中身のない行 (EX-5)', percentComplete: 99 }),
    ],
  })

describe('FR-012 -- 暦を編集したときの完了率の数え直し (D-353)', () => {
  it('GIVEN a plan of 9/7 to 9/14 with 3 worked days WHEN Saturday becomes a worked day THEN the stored 完了率 is counted again', () => {
    // FR-012 (MUST): 「稼働日の暦を編集したときも、格納済みの完了率を数え直すこと
    // （MUST）」. The requirement's own reason: both the numerator and the
    // denominator are counted in working days, so the right figure moves when
    // the calendar moves even though no date does.
    const document = documentWithAPricedTask()
    expect(percentOf(document, 10), 'the figure the document arrives with').toBe(
      PERCENT_UNDER_MON_TO_FRI,
    )

    const result = editCalendar(document, {
      kind: 'setCalendar',
      workingDayTypes: [...S_106_WORKING, SATURDAY],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // eslint-disable-next-line no-console
    console.log(
      `FR-012 / D-353: 2026-09-07 to 2026-09-14, ${WORKED_DAYS} worked days -- `
        + `月〜金 = ${percentOf(document, 10)}% , 土曜を足すと = ${percentOf(result.document, 10)}%`,
    )
    expect(percentOf(result.document, 10)).toBe(PERCENT_WITH_SATURDAY)
    // ⛔ AND THE DATES DID NOT MOVE. The whole point of the ruling is that the
    // stored figure goes stale without any edit to the task at all.
    const moved = result.document.schedule.tasks.find((one) => one.uid === 10)
    expect(moved?.start).toBe(PLAN_START)
    expect(moved?.finish).toBe(PLAN_FINISH)
    expect(moved?.actualDuration).toBe(WORKED_DAYS)
  })

  it('GIVEN the same edit WHEN it is accepted THEN the report names the `Task`s whose value CHANGED, and only those', () => {
    // FR-012 (MUST): 「数え直したことを、値が変わった `Task` の件数を添えて告げること
    // （MUST）」, and NT-3 of table T-037 asks for 対象の件数 on a destructive result,
    // naming 暦の変更（`FR-088`） as its own example. The count is this list's length.
    const result = editCalendar(documentWithAPricedTask(), {
      kind: 'setCalendar',
      workingDayTypes: [...S_106_WORKING, SATURDAY],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.report.recountedTaskUids).toEqual([10])
    // ⛔ 11 IS NOT IN IT. Its figure did not move, so counting it would report a
    // number bigger than the one FR-012 asks for.
    expect(result.report.recountedTaskUids).not.toContain(11)
    expect(percentOf(result.document, 11), 'EX-5 の中身のない行 keeps what it holds').toBe(99)
  })

  it('GIVEN a calendar edit that moves no figure WHEN it is accepted THEN the report is empty', () => {
    // ⛔ NOT VACUOUS: the calendar DOES change here -- Saturday is added, and
    // the case asserts it landed -- while this task's plan holds no Saturday,
    // so its span in worked days is the same before and after. 「値が変わった
    // `Task`」 is then nobody, and the count NT-3 asks for is 0.
    // ⚠️ 2026-09-07 (Mon) to 2026-09-11 (Fri) spans [Mon..Thu] = 4 worked days
    // under 表 T-209's S-106, and the same 4 with Saturday worked.
    const document = documentOf({
      tasks: [
        taskOf({
          uid: 10,
          start: '2026-09-07T00:00:00',
          finish: '2026-09-11T00:00:00',
          actualDuration: 3,
          percentComplete: 75,
        }),
      ],
    })
    const result = editCalendar(document, {
      kind: 'setCalendar',
      workingDayTypes: [...S_106_WORKING, SATURDAY],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(workingOf(result.document, 1)).toContain(SATURDAY)
    expect(percentOf(result.document, 10)).toBe(75)
    expect(result.report.recountedTaskUids).toEqual([])
  })

  it('FR-012 -- 暦の変更と同じ書き込みの中で行うこと（MUST）。別の書き込みに分けてはならない（MUST NOT）', () => {
    // 「暦の変更は取り消せるので、分けると取り消しが暦だけを戻し、数え直した完了率が
    // 残る」. ⭐ So the proof is that ONE plan carries both halves and pushes ONE
    // undo step: the step holds the document as it stood BEFORE the write, which
    // is where the old figure is, and there is no second write for a second step.
    const document = documentWithAPricedTask()
    const plan = planDocumentChange({
      document,
      readStamp: document.documentStamp,
      commands: [
        { kind: 'setCalendar', workingDayTypes: [...S_106_WORKING, SATURDAY] } as DocumentCommand,
      ],
      moment: CALM,
      history: EMPTY_HISTORY,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'user',
      updatedUtc: '2026-08-17T01:00:00Z',
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    // Both halves in the one settled document.
    expect(workingOf(plan.document, 1)).toContain(SATURDAY)
    expect(percentOf(plan.document, 10)).toBe(PERCENT_WITH_SATURDAY)
    // ONE step, and it holds the figure as it was, so one undo puts both back.
    expect(plan.history.done).toHaveLength(1)
    expect(percentOf(plan.history.done[0]?.step.document as Document, 10)).toBe(
      PERCENT_UNDER_MON_TO_FRI,
    )
    // The count reaches WS-7 through the plan, because the telling happens
    // after the swap and the figures it would compare are gone by then.
    expect(plan.report.recountedTaskUids).toEqual([10])
  })
})

// ---------------------------------------------------------------------------
// FR-012 -- THE CONTROLS. Every case above passes for more than one build, so
// each of the three ways this could have been built WRONG is given a case that
// tells it apart from the right one:
//
//   ⓐ a build that RE-COUNTS ON EVERY WRITE (the trigger is not read at all),
//   ⓑ a build that re-counts in a SECOND write (so one undo splits the halves),
//   ⓒ a build that TELLS WITHOUT A COUNT (or counts the wrong set).
//
// ⭐ ⓐ IS TOLD APART BY A STORED FIGURE THAT DISAGREES WITH THE FORMULA. FR-012
// STORES the figure and lists WHEN it is counted again -- 日付を編集したとき and,
// since 2026-09-07, 稼働日の暦を編集したとき. A figure that arrived from an
// exchange partner disagreeing with our arithmetic is therefore a state the
// document may hold, and a write that is neither of those two occasions must
// leave it exactly as it stands. ⛔ A build that re-counted unconditionally
// would quietly repair it, and every case above would still pass.
// ---------------------------------------------------------------------------

/**
 * The same plan as the cases above, but holding a figure NO calendar in this
 * file counts to: 99 against 60 (月〜金) and 50 (土曜を足して). So whichever
 * calendar a wrong build counted by, the disagreement shows.
 */
const documentWithADisagreeingFigure = (): Document =>
  documentOf({
    tasks: [
      taskOf({
        uid: 10,
        name: 'a figure an exchange partner stored',
        start: PLAN_START,
        finish: PLAN_FINISH,
        actualDuration: WORKED_DAYS,
        percentComplete: 99,
      }),
    ],
  })

const planOf = (document: Document, commands: readonly DocumentCommand[]) =>
  planDocumentChange({
    document,
    readStamp: document.documentStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'user',
    updatedUtc: '2026-08-17T01:00:00Z',
  })

describe('FR-012 -- the controls on the recount (D-353)', () => {
  it('ⓐ GIVEN a calendar command that moves only the week start WHEN it lands THEN nothing is counted again', () => {
    // ⭐ THE WEEK START IS NOT AN INPUT TO 稼働日. FR-054 counts the working days
    // by the document's `Calendar`; AT-17's `Project.weekStartDay` is where the
    // week RULER begins. So this write is neither of FR-012's two occasions.
    // ⛔ CONTROL: a build that re-counted on every write would answer 60 here --
    // the formula's own figure -- and would name uid 10 in the report. Both
    // assertions below fail for that build and hold for this one.
    const document = documentWithADisagreeingFigure()
    const result = editCalendar(document, { kind: 'setCalendar', weekStartDay: 4 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.schedule.project.weekStartDay, 'the half that DID move').toBe(4)
    expect(percentOf(result.document, 10)).toBe(99)
    expect(result.report.recountedTaskUids).toEqual([])
  })

  it('ⓐ GIVEN a write that is not a calendar edit at all WHEN it lands THEN nothing is counted again', () => {
    // ⛔ CONTROL, and the wider one: the recount must be keyed to the OCCASION,
    // not fired by whatever write happens to pass. `setTaskName` moves no input
    // of the formula, so the stored 99 stands and the report is the one frozen
    // empty value every non-calendar edit answers with. A build that re-counted
    // on every write repairs it to 60 and reports [10].
    const plan = planOf(documentWithADisagreeingFigure(), [
      { kind: 'setTaskName', uid: 10, name: 'renamed' } as DocumentCommand,
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.document.schedule.tasks[0]?.name).toBe('renamed')
    expect(percentOf(plan.document, 10)).toBe(99)
    expect(plan.report.recountedTaskUids).toEqual([])
  })

  it('ⓐ GIVEN the same calendar edit applied twice WHEN the second lands THEN the document does not move', () => {
    // ⛔ CONTROL on the OTHER half of "every write": a build that rebuilt the
    // schedule unconditionally would answer a NEW document here even though the
    // calendar already said Saturday. `edit-calendar.ts` returns the very
    // document it was handed, which is what FR-063's schedule instant is read
    // off (`document-change-plan.ts` compares the schedule REFERENCE), so an
    // unconditional rebuild would move the instant for a write that changed
    // nothing.
    const once = editCalendar(documentWithAPricedTask(), {
      kind: 'setCalendar',
      workingDayTypes: [...S_106_WORKING, SATURDAY],
    })
    expect(once.ok).toBe(true)
    if (!once.ok) return
    expect(percentOf(once.document, 10)).toBe(PERCENT_WITH_SATURDAY)

    const twice = editCalendar(once.document, {
      kind: 'setCalendar',
      workingDayTypes: [...S_106_WORKING, SATURDAY],
    })
    expect(twice.ok).toBe(true)
    if (!twice.ok) return
    expect(twice.document, 'the same document, not an equal one').toBe(once.document)
    expect(twice.report.recountedTaskUids).toEqual([])
  })

  it('ⓑ GIVEN the calendar edit WHEN ONE undo is pressed THEN both the calendar and the 完了率 go back', () => {
    // FR-012 (MUST NOT): 「別の書き込みに分けてはならない」——「暦の変更は取り消せる
    // ので、分けると取り消しが暦だけを戻し、数え直した完了率が残る」.
    // ⭐ THE UNDO IS ACTUALLY PRESSED HERE, not inferred from the step's contents:
    // `undoEdit` is asked for the pair the plan answered with.
    // ⛔ CONTROL: for a build that wrote the recount as a SECOND step, `done`
    // would hold 2 and this single undo would put back one half only -- the
    // calendar back to 月〜金 with the 完了率 still 50, or the 完了率 back to 60
    // with Saturday still worked. Both of the paired assertions below catch it,
    // and so does the length.
    const document = documentWithAPricedTask()
    const plan = planOf(document, [
      { kind: 'setCalendar', workingDayTypes: [...S_106_WORKING, SATURDAY] } as DocumentCommand,
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.history.done, 'ONE step for the one gesture (FR-031)').toHaveLength(1)

    const undone = undoEdit({ document: plan.document, history: plan.history })
    expect(undone.undone).toBe(true)
    expect(workingOf(undone.next.document, 1), 'the calendar half').not.toContain(SATURDAY)
    expect(percentOf(undone.next.document, 10), 'the 完了率 half').toBe(PERCENT_UNDER_MON_TO_FRI)
    // ⛔ AND THERE IS NOTHING LEFT TO UNDO. A second step would still be here.
    expect(undone.next.history.done).toHaveLength(0)
  })

  it('ⓒ GIVEN two tasks whose figures move and one whose figure does not WHEN the calendar is edited THEN the count is 2', () => {
    // FR-012 (MUST): 「値が変わった `Task` の件数を添えて告げること」, and NT-3 of
    // table T-037 is the manner -- 「対象の件数」. The count the shell raises is
    // `recountedTaskUids.length`, so this case fixes WHICH SET is counted.
    // ⛔ CONTROL, three wrong builds at once: one that told without a count has
    // no list to answer with at all; one that counted every task the calendar
    // REACHES answers 3; one that counted the tasks it merely rebuilt answers 3
    // as well, because `repriced` builds a new object every time. Only the set
    // 「値が変わった `Task`」 answers 2.
    const document = documentOf({
      tasks: [
        taskOf({
          uid: 10,
          start: PLAN_START,
          finish: PLAN_FINISH,
          actualDuration: WORKED_DAYS,
          percentComplete: PERCENT_UNDER_MON_TO_FRI,
        }),
        taskOf({
          uid: 12,
          start: PLAN_START,
          finish: PLAN_FINISH,
          actualDuration: WORKED_DAYS,
          percentComplete: PERCENT_UNDER_MON_TO_FRI,
        }),
        // 2026-09-07 (Mon) to 2026-09-11 (Fri) spans [Mon..Thu] = 4 worked days
        // with or without Saturday, so this one's figure stands.
        taskOf({
          uid: 11,
          start: '2026-09-07T00:00:00',
          finish: '2026-09-11T00:00:00',
          actualDuration: 3,
          percentComplete: 75,
        }),
      ],
    })
    const result = editCalendar(document, {
      kind: 'setCalendar',
      workingDayTypes: [...S_106_WORKING, SATURDAY],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.report.recountedTaskUids).toEqual([10, 12])
    expect(result.report.recountedTaskUids).toHaveLength(2)
    expect(percentOf(result.document, 11), 'the one that did not move').toBe(75)
  })
})
