// Unit tests: the Calendar aggregate of EditDocument settles the working weekdays and the week start in one write.

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

const DEFAULT_TASK_GROUP_NAME_FIXTURE = 'fixture default task group name'

// Spec: AT-73
const DAY_TYPES = [1, 2, 3, 4, 5, 6, 7] as const

// Why: S-106's five weekdays in AT-73's coding, whose first code is Sunday, so Monday..Friday are 2..6.
const S_106_WORKING: readonly number[] = [2, 3, 4, 5, 6]

// Trap: an absent dayWorking reads as not set, which is a different row of the table from false.
const weekDaysOf = (working: readonly number[]): readonly WeekDay[] =>
  DAY_TYPES.map((dayType, ordinal) => ({
    ordinal,
    dayType,
    dayWorking: working.includes(dayType),
    workingTimes: [],
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

// Trap: weekStartDay and calendarUid are spelled on every fixture; AT-17 and AT-18 are nullable, and
// leaving one undefined reads as set.
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
        weekStartDay: 1, // Why: S-108's Monday in AT-17's coding, whose first code is Sunday.
        calendarUid: null,
        defaultStartTime: null,
        defaultFinishTime: null,
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
    // Trap: every presentation key is carried though this aggregate reads none: planDocumentChange clamps
    // settings, and one missing key turns a comparison into NaN.
    documentSettings: {
      stackDirection: 'up',
      planActualDisplay: 'both',
      guideCursorMode: 'none',
      dualCursor: null,
      fontSizeStep: 'M',
      fontSizeStepSizes: { S: 12, M: 14, L: 16 },
      rulerFontSizePx: 14,
      rulerHeightPx: 48,
      canvasPadding: 10,
      taskGroupPanelWidthPx: 170,
      propertyPanelWidth: 280,
      pinnedTaskGroupIds: [],
      pinnedTaskGroupMax: 5,
      zoomX: 1,
      zoomY: 1,
      scrollDate: null,
      scrollTaskGroupId: null,
      isDependencyVisible: true,
    },
    documentStamp: {
      scheduleUpdatedAt: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedAt: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

const workingOf = (document: Document, uid: number): readonly number[] =>
  document.schedule.calendars
    .filter((one) => one.uid === uid)
    .flatMap((one) => one.weekDays)
    .filter((weekDay) => weekDay.dayWorking === true)
    .map((weekDay) => weekDay.dayType as number)

const calendarWithUid = (document: Document, uid: number): Calendar =>
  document.schedule.calendars.find((one) => one.uid === uid) as Calendar

const taskOf = (part: Record<string, unknown>): unknown => ({
  uid: 0,
  parentTaskUid: null,
  wbsOrder: 0,
  name: 'a task',
  start: null,
  finish: null,
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
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

// Spec: UF-16, CM-39, AG-9a, FR-088, FR-054, S-106, S-108, IV-17, AT-17, AT-73, UN-13
// Why: the exception-day half of FR-088 is not tested: CalendarCommand has no field for it, and no rule
// says whether a new list replaces, adds to or deletes the rows already there.
describe('EditCalendar (UF-16) -- CM-39 of table T-108', () => {
  it('FR-088 settles the working weekdays and the week start in ONE document', () => {
    // Why: what this unit owes the one-write MUST is one new Document carrying both halves, never one.
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
    // Why: the document handed in is not the one that moved, so no intermediate state can be read.
    expect(workingOf(document, 1)).toEqual(S_106_WORKING)
    expect(document.schedule.project.weekStartDay).toBe(1)
  })

  it('S-106 is a set of weekdays, and the ones the command omits stop working', () => {
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
    for (const dayType of DAY_TYPES) {
      expect(byDayType.get(dayType)).toBe(S_106_WORKING.includes(dayType))
    }
  })

  it('IV-17 leaves the resolved calendar working the named days even with no rows to start from', () => {
    // Why: an imported calendar can arrive with no WeekDay row; an edit that quietly did nothing would
    // leave IV-17 broken while reporting success.
    const bare = documentOf({ calendars: [calendarOf({ weekDays: [] })] })
    const result = editCalendar(bare, { kind: 'setCalendar', workingDayTypes: [2, 3] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect([...workingOf(result.document, 1)].sort()).toEqual([2, 3])
  })

  it('FR-088 leaves alone the half a command does not carry', () => {
    // Why: FR-088 folds the parts into one command so a combined edit commits once, not so every edit
    // carries every part.
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
    // Why: AT-17 is nullable and T-209 covers an imported empty value, so an empty week start is a state;
    // FR-054 has the ruler read S-108 then, so it is not filled in here.
    const result = editCalendar(documentOf(), { kind: 'setCalendar', weekStartDay: null })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.schedule.project.weekStartDay).toBeNull()
  })

  it('FR-088 keeps the two weekday codings apart -- AT-17 is 0..6, AT-73 is 1..7', () => {
    // Why: 0 is a week start and never a dayType, 7 a dayType and never a week start, so a unit that
    // converted or cross-validated the codings cannot answer all four as the two rows do.
    expect(editCalendar(documentOf(), { kind: 'setCalendar', weekStartDay: 0 }).ok).toBe(true)
    expect(editCalendar(documentOf(), { kind: 'setCalendar', weekStartDay: 7 }).ok).toBe(false)
    expect(
      editCalendar(documentOf(), { kind: 'setCalendar', workingDayTypes: [7] }).ok,
    ).toBe(true)
    expect(
      editCalendar(documentOf(), { kind: 'setCalendar', workingDayTypes: [0, 2] }).ok,
    ).toBe(false)
  })

  // Spec: IMPS-723, FR-300
  it('FR-088 refuses a calendar that works no weekday at all, and resets nothing', () => {
    const document = documentOf()
    const result = editCalendar(document, { kind: 'setCalendar', workingDayTypes: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.refusals[0]!.rule).toBe('FR-088')
      expect(result.refusals[0]!.command).toBe('CM-39')
    }
    expect(workingOf(document, 1)).toEqual(S_106_WORKING)
  })

  it('FR-088 refuses the whole edit when the weekday half is empty, week start included', () => {
    // Why: the two halves are one command, the same all-or-nothing FR-088 hands to WS-3.
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
    // Why: the other calendar is carried only for the round trip, so nothing may reach it.
    expect(workingOf(result.document, 4)).toEqual(S_106_WORKING)
  })

  it('FR-054 falls to the lowest-ordinal base calendar when the pointer is empty or dangling', () => {
    // Why: the decoy is a non-base calendar with the smallest ordinal of all; it wins only if
    // isBaseCalendar is skipped.
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

  // Spec: IMPS-763
  it('FR-054 must not read Task.calendarUid or Resource.calendarUid', () => {
    // Why: these pointers name a calendar FR-054's own order never reaches, so an edit landing there
    // would break its MUST NOT.
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
    // Why: an edit carrying only the weekdays says nothing about the exception days, so the rows stay,
    // including the recurring ones FR-054 does not expand and the carry columns (AT-83).
    const exceptions = [
      {
        ordinal: 0,
        name: 'shutdown',
        fromDate: '2026-08-13T00:00:00',
        toDate: '2026-08-15T00:00:00',
        dayWorking: false,
        recurrenceKind: 1,
        workingTimes: [],
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
    // Why: UN-13 lists the calendar among the settings undo covers, and T-209 files it in the schedule
    // data group, for which WS-5 of T-067 moves documentStamp.scheduleUpdatedAt.
    const document = documentOf()
    const command: DocumentCommand = {
      kind: 'setCalendar',
      workingDayTypes: [2, 3, 4, 5, 6, 7],
      weekStartDay: 0,
    }
    const plan = planDocumentChange({
      defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME_FIXTURE,
      document,
      expectedStamp: document.documentStamp,
      commands: [command],
      moment: CALM,
      history: EMPTY_HISTORY,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'user',
      updatedAt: '2026-08-17T01:00:00Z',
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.history.done).toHaveLength(1)
    expect(plan.hasUpdatedSchedule).toBe(true)
    expect(workingOf(plan.document, 1)).toEqual([2, 3, 4, 5, 6, 7])
    expect(plan.document.schedule.project.weekStartDay).toBe(0)
  })
})

// Why: one plan of 9/7 to 9/14 with 3 worked days, counted by S-106 and by S-106 plus Saturday, shows
// the stored figure moving although no date moved; the plan counts both end days, as FR-011 does.
const PLAN_START = '2026-09-07T08:00:00'
const PLAN_FINISH = '2026-09-14T17:00:00'
const WORKED_DAYS = 3
const WORKED_LAST_DAY = '2026-09-09T17:00:00'

const PERCENT_UNDER_MON_TO_FRI = 50
// Why: AT-73's first code is Sunday, so Saturday is 7.
const SATURDAY = 7
const PERCENT_WITH_SATURDAY = 43

const documentWithAPricedTask = (): Document =>
  documentOf({
    tasks: [
      taskOf({
        uid: 10,
        name: 'the task whose figure moves',
        start: PLAN_START,
        finish: PLAN_FINISH,
        actualStart: PLAN_START,
        stop: WORKED_LAST_DAY,
        percentComplete: PERCENT_UNDER_MON_TO_FRI,
      }),
      // Why: FR-012 counts only the tasks whose value changed, so a task the change leaves alone must be in
      // the document for the count to be a claim; the EX-5 row keeps its stored figure.
      taskOf({ uid: 11, name: '中身のない行 (EX-5)', percentComplete: 99 }),
    ],
  })

// Spec: FR-012, NT-3, EX-5
describe('FR-012 -- 暦を編集したときの完了率の数え直し (DFC-353)', () => {
  // Spec: IMPS-464
  it('GIVEN a plan of 9/7 to 9/14 with 3 worked days WHEN Saturday becomes a worked day THEN the stored 完了率 is counted again', () => {
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

    // eslint-disable-next-line no-console -- the case prints both figures for the record
    console.log(
      `FR-012 / DFC-353: 2026-09-07 to 2026-09-14, ${WORKED_DAYS} worked days -- `
        + `月〜金 = ${percentOf(document, 10)}% , 土曜を足すと = ${percentOf(result.document, 10)}%`,
    )
    expect(percentOf(result.document, 10)).toBe(PERCENT_WITH_SATURDAY)
    // Why: the dates are asserted unmoved, because the figure must go stale without any edit to the task.
    const moved = result.document.schedule.tasks.find((one) => one.uid === 10)
    expect(moved?.start).toBe(PLAN_START)
    expect(moved?.finish).toBe(PLAN_FINISH)
    expect(moved?.actualStart).toBe(PLAN_START)
    expect(moved?.stop).toBe(WORKED_LAST_DAY)
  })

  it('GIVEN the same edit WHEN it is accepted THEN the report names the `Task`s whose value CHANGED, and only those', () => {
    const result = editCalendar(documentWithAPricedTask(), {
      kind: 'setCalendar',
      workingDayTypes: [...S_106_WORKING, SATURDAY],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.report.recountedTaskUids).toEqual([10])
    // Why: uid 11's figure did not move, so counting it would report more than FR-012 asks for.
    expect(result.report.recountedTaskUids).not.toContain(11)
    expect(percentOf(result.document, 11), 'EX-5 の中身のない行 keeps what it holds').toBe(99)
  })

  it('GIVEN a calendar edit that moves no figure WHEN it is accepted THEN the report is empty', () => {
    // Why: not vacuous: Saturday is added and asserted, while this plan of Mon 9/7 to Fri 9/11 holds no
    // Saturday, so its worked days are 5 before and after and the count is 0.
    const document = documentOf({
      tasks: [
        taskOf({
          uid: 10,
          start: '2026-09-07T08:00:00',
          finish: '2026-09-11T17:00:00',
          actualStart: '2026-09-07T08:00:00',
          stop: WORKED_LAST_DAY,
          percentComplete: 60,
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
    expect(percentOf(result.document, 10)).toBe(60)
    expect(result.report.recountedTaskUids).toEqual([])
  })

  // Spec: IMPS-466
  it('FR-012 -- 暦の変更と同じ書き込みの中で行うこと（MUST）。別の書き込みに分けてはならない（MUST NOT）', () => {
    // Why: the proof is one plan carrying both halves and one undo step holding the document before the
    // write, where the old figure is.
    const document = documentWithAPricedTask()
    const plan = planDocumentChange({
      defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME_FIXTURE,
      document,
      expectedStamp: document.documentStamp,
      commands: [
        { kind: 'setCalendar', workingDayTypes: [...S_106_WORKING, SATURDAY] } as DocumentCommand,
      ],
      moment: CALM,
      history: EMPTY_HISTORY,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'user',
      updatedAt: '2026-08-17T01:00:00Z',
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    expect(workingOf(plan.document, 1)).toContain(SATURDAY)
    expect(percentOf(plan.document, 10)).toBe(PERCENT_WITH_SATURDAY)
    expect(plan.history.done).toHaveLength(1)
    expect(percentOf(plan.history.done[0]?.step.document as Document, 10)).toBe(
      PERCENT_UNDER_MON_TO_FRI,
    )
    // Why: the count reaches WS-7 through the plan, because the telling happens after the swap and the
    // figures it would compare are gone by then.
    expect(plan.report.recountedTaskUids).toEqual([10])
  })
})

// Why: 99 is a figure no calendar in this file counts to, so a build that re-counts on every write,
// not only on FR-012's two occasions, shows by repairing it.
const documentWithADisagreeingFigure = (): Document =>
  documentOf({
    tasks: [
      taskOf({
        uid: 10,
        name: 'a figure an exchange partner stored',
        start: PLAN_START,
        finish: PLAN_FINISH,
        actualStart: PLAN_START,
        stop: WORKED_LAST_DAY,
        percentComplete: 99,
      }),
    ],
  })

const planOf = (document: Document, commands: readonly DocumentCommand[]) =>
  planDocumentChange({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME_FIXTURE,
    document,
    expectedStamp: document.documentStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'user',
    updatedAt: '2026-08-17T01:00:00Z',
  })

describe('FR-012 -- the controls on the recount (DFC-353)', () => {
  it('ⓐ GIVEN a calendar command that moves only the week start WHEN it lands THEN nothing is counted again', () => {
    // Why: the week start is no input to working days (FR-054, AT-17), so this write is neither of FR-012's
    // occasions; a build that re-counted on every write would repair the figure and name uid 10.
    const document = documentWithADisagreeingFigure()
    const result = editCalendar(document, { kind: 'setCalendar', weekStartDay: 4 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.schedule.project.weekStartDay, 'the half that DID move').toBe(4)
    expect(percentOf(result.document, 10)).toBe(99)
    expect(result.report.recountedTaskUids).toEqual([])
  })

  it('ⓐ GIVEN a write that is not a calendar edit at all WHEN it lands THEN nothing is counted again', () => {
    // Why: the recount is keyed to the occasion; setTaskName moves no input of the formula, so a build
    // that re-counted on every write repairs the stored 99 and reports [10].
    const plan = planOf(documentWithADisagreeingFigure(), [
      { kind: 'setTaskName', taskUid: 10, name: 'renamed' } as DocumentCommand,
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.document.schedule.tasks[0]?.name).toBe('renamed')
    expect(percentOf(plan.document, 10)).toBe(99)
    expect(plan.report.recountedTaskUids).toEqual([])
  })

  it('ⓐ GIVEN the same calendar edit applied twice WHEN the second lands THEN the document does not move', () => {
    // Why: the schedule instant (FR-063) is read off the schedule reference, so an unconditional rebuild
    // would move it for a write that changed nothing.
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

  // Spec: IMPS-467
  it('ⓑ GIVEN the calendar edit WHEN ONE undo is pressed THEN both the calendar and the 完了率 go back', () => {
    // Why: the undo is pressed, not inferred; a build that wrote the recount as a second step would put
    // back one half only, and the paired assertions and the history length catch it.
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
    expect(undone.next.history.done).toHaveLength(0)
  })

  // Spec: IMPS-725
  it('ⓒ GIVEN two tasks whose figures move and one whose figure does not WHEN the calendar is edited THEN the count is 2', () => {
    // Why: a build that told without a count has no list; one counting every task reached or rebuilt
    // answers 3; only the tasks whose value changed answer 2.
    const document = documentOf({
      tasks: [
        taskOf({
          uid: 10,
          start: PLAN_START,
          finish: PLAN_FINISH,
          actualStart: PLAN_START,
        stop: WORKED_LAST_DAY,
          percentComplete: PERCENT_UNDER_MON_TO_FRI,
        }),
        taskOf({
          uid: 12,
          start: PLAN_START,
          finish: PLAN_FINISH,
          actualStart: PLAN_START,
        stop: WORKED_LAST_DAY,
          percentComplete: PERCENT_UNDER_MON_TO_FRI,
        }),
        // Why: Mon 9/7 to Fri 9/11 spans 5 worked days with or without Saturday, so this figure stands.
        taskOf({
          uid: 11,
          start: '2026-09-07T08:00:00',
          finish: '2026-09-11T17:00:00',
          actualStart: '2026-09-07T08:00:00',
          stop: WORKED_LAST_DAY,
          percentComplete: 60,
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
    expect(percentOf(result.document, 11), 'the one that did not move').toBe(60)
  })
})
