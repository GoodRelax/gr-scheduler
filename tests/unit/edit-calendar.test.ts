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
      exportPngScale: 1,
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
    // にしてはならない（MUST NOT）。受け付けずに知らせること（MUST）」。The
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
