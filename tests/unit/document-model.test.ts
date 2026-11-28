// Unit tests: the documentModel units, with a table driving the cases where a table decides the answer.

import { describe, expect, it } from 'vitest'

import {
  emptySelection,
  isSelected,
  lastPicked,
  selectionOfAll,
  selectionWith,
  selectionWithout,
  type ItemRef,
} from '../../src/entity/document-model/selection/selection'

import {
  emptyHistory,
  historyWithStep,
  nextStep,
  previousStep,
  stepCount,
} from '../../src/entity/document-model/edit-history/edit-history'

import {
  advancedStamp,
  isStampMatched,
  type DocumentStamp,
} from '../../src/entity/document-model/document-stamp/document-stamp'
import * as documentStampModule from '../../src/entity/document-model/document-stamp/document-stamp'

import {
  planActualState,
  type PlanActualState,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'

const taskA: ItemRef = { kind: 'task', uid: 1 }
const taskB: ItemRef = { kind: 'task', uid: 2 }
const statusLine: ItemRef = { kind: 'statusLine' }

describe('Selection (PI-32)', () => {
  it('SL-7b keeps the order things were picked in', () => {
    const selection = selectionWith(selectionWith(emptySelection(), taskB), taskA)
    expect(selection.items).toEqual([taskB, taskA])
    expect(lastPicked(selection)).toEqual(taskA)
  })

  it('SL-7b gives a marquee or a select-all no order to line up against', () => {
    const swept = selectionOfAll([taskA, taskB])
    expect(swept.isOrdered).toBe(false)
    expect(lastPicked(swept)).toBeNull()
  })

  it('picking the same thing twice does not move it in the order', () => {
    const twice = selectionWith(selectionWith(selectionWith(emptySelection(), taskA), taskB), taskA)
    expect(twice.items).toEqual([taskA, taskB])
  })

  it('holds and drops the single status line, which carries no id', () => {
    const withLine = selectionWith(emptySelection(), statusLine)
    expect(isSelected(withLine, statusLine)).toBe(true)
    expect(isSelected(selectionWithout(withLine, statusLine), statusLine)).toBe(false)
  })

  it('leaves the value alone when there is nothing to remove', () => {
    const selection = selectionWith(emptySelection(), taskA)
    expect(selectionWithout(selection, taskB)).toBe(selection)
  })
})

describe('EditHistory (PI-4)', () => {
  const limits = { maxSteps: 3, maxTotalSizeBytes: 1000 }
  const kept = (step: string): string => step

  it('FR-031 undoes the previous edit and redoes what was undone', () => {
    let history = emptyHistory<string>()
    history = historyWithStep(history, 'a', 1, limits)
    history = historyWithStep(history, 'b', 1, limits)

    const undo = previousStep(history, kept)
    expect(undo.step).toBe('b')
    expect(stepCount(undo.history)).toBe(1)

    const redo = nextStep(undo.history, kept)
    expect(redo.step).toBe('b')
    expect(stepCount(redo.history)).toBe(2)
  })

  it('FR-031 drops the oldest step once the step bound is passed', () => {
    let history = emptyHistory<string>()
    for (const step of ['a', 'b', 'c', 'd']) history = historyWithStep(history, step, 1, limits)
    expect(history.done.map((held) => held.step)).toEqual(['b', 'c', 'd'])
  })

  it('FR-031 drops the oldest step once the memory bound is passed', () => {
    let history = emptyHistory<string>()
    history = historyWithStep(history, 'big', 900, { maxSteps: 9, maxTotalSizeBytes: 1000 })
    history = historyWithStep(history, 'also big', 900, { maxSteps: 9, maxTotalSizeBytes: 1000 })
    expect(history.done.map((held) => held.step)).toEqual(['also big'])
  })

  it('a new edit makes what was undone unreachable', () => {
    let history = historyWithStep(emptyHistory<string>(), 'a', 1, limits)
    history = previousStep(history, kept).history
    history = historyWithStep(history, 'b', 1, limits)
    expect(nextStep(history, kept).step).toBeNull()
  })

  it('undo and redo on an empty history hand back nothing', () => {
    expect(previousStep(emptyHistory<string>(), kept).step).toBeNull()
    expect(nextStep(emptyHistory<string>(), kept).step).toBeNull()
  })
})

describe('DocumentStamp (PI-3)', () => {
  const stamp: DocumentStamp = {
    scheduleUpdatedAt: '2026-08-17T00:00:00Z',
    lastEditedBy: 'human',
    settingsUpdatedAt: '2026-08-17T00:00:00Z',
    fileSavedAt: null,
  }

  it('FR-063 moves the schedule-data instant for a schedule-data write', () => {
    // Why: fileSavedAt (AT-140) is left out on purpose: an edit is not a write to a file, and FR-101 owns that field.
    const next = advancedStamp(stamp, 'agent', '2026-08-17T00:01:00Z', { hasUpdatedSchedule: true })
    expect(next).toEqual({
      scheduleUpdatedAt: '2026-08-17T00:01:00Z',
      lastEditedBy: 'agent',
      settingsUpdatedAt: '2026-08-17T00:01:00Z',
      fileSavedAt: null,
    })
  })

  it('FR-063 leaves the schedule instant alone for a presentation-only write, but not who and when', () => {
    const next = advancedStamp(stamp, 'agent', '2026-08-17T00:01:00Z', { hasUpdatedSchedule: false })
    expect(next.scheduleUpdatedAt).toBe('2026-08-17T00:00:00Z')
    expect(next.lastEditedBy).toBe('agent')
    expect(next.settingsUpdatedAt).toBe('2026-08-17T00:01:00Z')
  })

  it('AG-2 compares all three, so a presentation-only write is still a mismatch', () => {
    const after = advancedStamp(stamp, 'agent', '2026-08-17T00:01:00Z', { hasUpdatedSchedule: false })
    expect(isStampMatched(stamp, stamp)).toBe(true)
    expect(isStampMatched(stamp, after)).toBe(false)
  })

  it('FR-063 answers only "the same one?", so an EARLIER stamp differs exactly as a later one does', () => {
    // Why: an undo restores an earlier stamp (FR-031), so a stamp that ran backwards must read as different.
    const earlier: DocumentStamp = { ...stamp, scheduleUpdatedAt: '2026-08-16T00:00:00Z' }
    const later: DocumentStamp = { ...stamp, scheduleUpdatedAt: '2026-08-18T00:00:00Z' }
    expect(isStampMatched(earlier, stamp)).toBe(false)
    expect(isStampMatched(later, stamp)).toBe(false)
    expect(isStampMatched(stamp, earlier)).toBe(false)
    expect(isStampMatched(stamp, later)).toBe(false)
    // Why: an order is never symmetric, so a symmetric answer shows no order is read.
    expect(isStampMatched(earlier, later)).toBe(isStampMatched(later, earlier))
  })

  it('AG-2 rejects on any ONE of the three (MUST), including the settings instant alone', () => {
    for (const differing of [
      { scheduleUpdatedAt: '2026-08-17T00:00:01Z' },
      { lastEditedBy: 'agent' },
      { settingsUpdatedAt: '2026-08-17T00:00:01Z' },
    ] as const) {
      expect(isStampMatched({ ...stamp, ...differing }, stamp)).toBe(false)
    }
  })

  it('PI-3 publishes no member that answers which of two stamps is newer', () => {
    // Why: FR-063 forbids reading stamps as an order, and a caller cannot reach for a member that is not published.
    expect(Object.keys(documentStampModule).sort()).toEqual(['advancedStamp', 'isStampMatched'])
  })
})

const emptyTask: Task = {
  uid: 1,
  parentTaskUid: null,
  wbsOrder: null,
  name: null,
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
}

const T019A: readonly {
  row: string
  task: Partial<Task>
  state: PlanActualState
}[] = [
  { row: 'PS-1', task: { actualStart: null }, state: 'notStarted' },
  {
    row: 'PS-2',
    task: { actualStart: '2026-08-01', actualFinish: '2026-08-05' },
    state: 'finished',
  },
  {
    row: 'PS-3',
    task: { actualStart: '2026-08-01', resumeValid: false },
    state: 'suspendedResumeUnknown',
  },
  {
    row: 'PS-4',
    task: { actualStart: '2026-08-01', resumeValid: true, resume: '2026-08-09' },
    state: 'suspendedResumePlanned',
  },
  { row: 'PS-5', task: { actualStart: '2026-08-01' }, state: 'inProgress' },
]

describe('Schedule (PI-1) -- table T-019a', () => {
  // Spec: FR-010
  it.each(T019A)('$row gives $state', ({ task, state }) => {
    expect(planActualState({ ...emptyTask, ...task })).toBe(state)
  })

  // Spec: IMPS-391, IMPS-392
  it('is total: the task that suspended and then finished still lands on a row', () => {
    // Why: an actualFinish together with resume and resumeValid is the combination an earlier rule set matched to no row.
    expect(
      planActualState({
        ...emptyTask,
        actualStart: '2026-08-01',
        actualFinish: '2026-08-10',
        resume: '2026-08-05',
        resumeValid: false,
      }),
    ).toBe('finished')
  })
})

import {
  compareDays,
  dateFromWorkingDays,
  DaySpanTooWide,
  dayOf,
  delayWorkingDays,
  isDelayed,
  isWorkingDay,
  NoWorkingDayReached,
  textOfDay,
  workingCalendarOf,
  DEFAULT_CALENDAR_VALUES,
  workingDaysBetween,
  type Calendar,
  type CalendarDay,
  type Exception,
  type WeekDay,
  type WorkingCalendar,
} from '../../src/entity/document-model/schedule/schedule'

const day = (year: number, month: number, d: number): CalendarDay => ({ year, month, day: d })

// Spec: AT-73, S-106
const weekDays: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType) => ({
  ordinal: dayType,
  dayType,
  dayWorking: dayType !== 1 && dayType !== 7,
  workingTimes: [],
  carry: {},
  carryElements: [],
}))

const calendar: Calendar = {
  uid: 1,
  name: 'Standard',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays,
  exceptions: [],
}

const holiday: Exception = {
  ordinal: 1,
  name: 'closed',
  fromDate: '2026-08-19T00:00:00',
  toDate: '2026-08-19T00:00:00',
  dayWorking: false,
  recurrenceKind: 1,
  workingTimes: [],
  carry: {},
  carryElements: [],
}

const plain: WorkingCalendar = { calendar, weekDays, exceptions: [] }
const withHoliday: WorkingCalendar = { calendar, weekDays, exceptions: [holiday] }

describe('Schedule (PI-1) -- one calendar for the document (FR-054)', () => {
  const scheduleWith = (project: Record<string, unknown>, calendars: readonly Calendar[]) =>
    ({ project, calendars, tasks: [] }) as unknown as Parameters<typeof workingCalendarOf>[0]

  const second: Calendar = { ...calendar, uid: 2, name: 'Night', ordinal: 5 }
  const third: Calendar = { ...calendar, uid: 3, name: 'Derived', isBaseCalendar: false, ordinal: 1 }

  it('takes what Project.calendarUid names, ahead of any base calendar', () => {
    const held = workingCalendarOf(scheduleWith({ calendarUid: 3 }, [calendar, second, third]))
    expect(held.calendar.uid).toBe(3)
  })

  it('falls to the lowest-ordinal base calendar when the project names none', () => {
    // Why: second has the lower uid of the two bases but the higher ordinal, so a uid order would pick it.
    const held = workingCalendarOf(scheduleWith({ calendarUid: null }, [second, calendar, third]))
    expect(held.calendar.uid).toBe(1)
  })

  it('falls to the same place when the project names a calendar that is not there', () => {
    expect(workingCalendarOf(scheduleWith({ calendarUid: 99 }, [calendar])).calendar.uid).toBe(1)
  })

  // Spec: IMPS-757
  it('falls to table T-209 default -- Monday to Friday, no exception -- when the document holds none', () => {
    const held = workingCalendarOf(scheduleWith({ calendarUid: null }, []))
    expect(held.exceptions).toEqual([])
    expect(isWorkingDay(held, day(2026, 8, 17))).toBe(true)
    expect(isWorkingDay(held, day(2026, 8, 16))).toBe(false)
  })

  it('works exactly the days S-106 names, in the dayType numbering AT-73 states', () => {
    const held = workingCalendarOf(scheduleWith({ calendarUid: null }, []))
    const working = held.weekDays.filter((one) => one.dayWorking === true).map((one) => one.dayType)
    expect(working).toEqual([...DEFAULT_CALENDAR_VALUES['S-106']])
    // Why: FR-054 counts by this calendar, so a day missing from it would be neither working nor non-working.
    expect(held.weekDays.map((one) => one.dayType)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('stops rather than spinning when a calendar works none of its days', () => {
    // Why: nothing in the specification forbids such a calendar arriving, and the walk would otherwise never end.
    const closed: Calendar = {
      ...calendar,
      weekDays: weekDays.map((one) => ({ ...one, dayWorking: false })),
    }
    const held = workingCalendarOf(scheduleWith({ calendarUid: 1 }, [closed]))
    expect(() => dateFromWorkingDays(held, day(2026, 1, 1), 1)).toThrow(NoWorkingDayReached)
  })
})

describe('Schedule (PI-1) -- dates are days (FR-054, EX-7)', () => {
  it('takes the day from the lexical date part, whatever time came with it', () => {
    expect(dayOf('2026-08-17T08:00:00')).toEqual(day(2026, 8, 17))
    expect(dayOf('2026-08-17')).toEqual(day(2026, 8, 17))
    expect(dayOf('2026-08-17T23:59:59+09:00')).toEqual(day(2026, 8, 17))
    expect(dayOf(null)).toBeNull()
    expect(dayOf('not a date')).toBeNull()
    expect(dayOf('2026-02-30T00:00:00')).toBeNull()
  })

  it('EX-7 writes what GRS decided at midnight, in the exchange type', () => {
    expect(textOfDay(day(2026, 8, 5))).toBe('2026-08-05T00:00:00')
    expect(textOfDay(day(999, 1, 2))).toBe('0999-01-02T00:00:00')
  })

  it('S-106 leaves the weekend out of the count', () => {
    expect(workingDaysBetween(plain, day(2026, 8, 17), day(2026, 8, 24))).toBe(5)
    expect(workingDaysBetween(plain, day(2026, 8, 17), day(2026, 8, 17))).toBe(0)
    expect(isWorkingDay(plain, day(2026, 8, 22))).toBe(false)
  })

  it('an exception that covers the day beats the weekly pattern', () => {
    expect(isWorkingDay(withHoliday, day(2026, 8, 19))).toBe(false)
    expect(workingDaysBetween(withHoliday, day(2026, 8, 17), day(2026, 8, 24))).toBe(4)
  })

  it('stops rather than counting a span table T-214 does not accept', () => {
    // Why: FR-023 keeps a date outside table T-214 out of the document, but this valve still stops a stray one
    // from costing millions of steps on one command.
    expect(() => workingDaysBetween(plain, day(1500, 1, 1), day(2026, 8, 17)))
      .toThrow(DaySpanTooWide)
    expect(() => workingDaysBetween(plain, day(2026, 8, 17), day(1500, 1, 1)))
      .toThrow(DaySpanTooWide)
    expect(() => workingDaysBetween(plain, day(1984, 1, 1), day(2149, 12, 31)))
      .not.toThrow()
  })

  it('counting backwards is the mirror of counting forwards', () => {
    expect(workingDaysBetween(plain, day(2026, 8, 24), day(2026, 8, 17))).toBe(-5)
  })

  it('dateFromWorkingDays is the inverse of workingDaysBetween', () => {
    const from = day(2026, 8, 17)
    for (const count of [0, 1, 5, 12]) {
      const reached = dateFromWorkingDays(plain, from, count)
      expect(workingDaysBetween(plain, from, reached)).toBe(count)
    }
    // Why: the end is a bound, not the last day worked, and the earliest one that satisfies the count;
    // the weekend adds nothing, so Monday plus five worked days ends on the Saturday.
    expect(dateFromWorkingDays(plain, from, 5)).toEqual(day(2026, 8, 22))
    expect(dateFromWorkingDays(withHoliday, from, 5)).toEqual(day(2026, 8, 25))
  })

  it('S-129: one worked day from a Monday ends on the Tuesday', () => {
    // Why: the task covers the Monday alone, so the end bound it reaches is the Tuesday.
    expect(dateFromWorkingDays(plain, day(2026, 8, 17), 1)).toEqual(day(2026, 8, 18))
    expect(workingDaysBetween(plain, day(2026, 8, 17), day(2026, 8, 18))).toBe(1)
  })

  it('compares days without touching the time', () => {
    expect(compareDays(day(2026, 8, 17), day(2026, 8, 18))).toBeLessThan(0)
    expect(compareDays(day(2026, 9, 1), day(2026, 8, 31))).toBeGreaterThan(0)
    expect(compareDays(day(2026, 8, 17), day(2026, 8, 17))).toBe(0)
  })
})

const T021B: readonly {
  row: string
  task: Partial<Task>
  delayed: boolean
  workingDays: number
}[] = [
  {
    row: 'DL-1',
    task: { actualStart: '2026-08-10T00:00:00', finish: '2026-08-17T00:00:00' },
    delayed: true,
    workingDays: 5,
  },
  { row: 'DL-2', task: { start: '2026-08-17T00:00:00' }, delayed: true, workingDays: 5 },
  {
    row: 'DL-3',
    task: {
      actualStart: '2026-08-10T00:00:00',
      resumeValid: true,
      resume: '2026-08-17T00:00:00',
    },
    delayed: true,
    workingDays: 5,
  },
]

describe('Schedule (PI-1) -- table T-021b', () => {
  const statusDate = day(2026, 8, 24)

  it.each(T021B)('$row counts $workingDays worked days to the status date', (row) => {
    const task = { ...emptyTask, ...row.task }
    expect(isDelayed(task, statusDate)).toBe(row.delayed)
    expect(delayWorkingDays(plain, task, statusDate)).toBe(row.workingDays)
  })

  it('a finished task is not behind, whatever its dates say', () => {
    const finished = {
      ...emptyTask,
      actualStart: '2026-08-01T00:00:00',
      actualFinish: '2026-08-20T00:00:00',
      finish: '2026-08-05T00:00:00',
    }
    expect(isDelayed(finished, statusDate)).toBe(false)
    expect(delayWorkingDays(plain, finished, statusDate)).toBe(0)
  })

  it('without a status date nothing is behind (FR-046 may leave it unset)', () => {
    expect(isDelayed({ ...emptyTask, start: '2026-01-01T00:00:00' }, null)).toBe(false)
  })
})

import {
  clampedSettings,
  SETTINGS_BOUNDS,
  SETTINGS_CONSTANTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'

import {
  escapeTarget,
  type EscapeContext,
} from '../../src/entity/document-model/screen-state/screen-state'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenValues,
  type ScreenValuesEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

import {
  escapeContextOf,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'

import { documentViolations } from '../../src/entity/document-model/document/document'

// Why: a clamp reads one key at a time, so the cases carry only the keys they are about.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  part as unknown as DocumentSettings

// Spec: S-2, T-202, S-75, S-54, S-55
describe('DocumentSettings (PI-2)', () => {
  it('reads its bounds from the sources, not from a second copy', () => {
    expect(SETTINGS_BOUNDS['rulerHeightPx']?.max).toBe(150)
  })

  it('pulls a value up to the lower bound and says it moved', () => {
    const result = clampedSettings(settingsOf({ zoomX: 0.001 }))
    expect(result.settings.zoomX).toBe(SETTINGS_CONSTANTS.zoomMin)
    expect(result.clamped).toEqual([{ key: 'zoomX', was: 0.001, now: SETTINGS_CONSTANTS.zoomMin }])
  })

  it('pushes a value down to the upper bound', () => {
    const result = clampedSettings(settingsOf({ zoomX: 999 }))
    expect(result.settings.zoomX).toBe(SETTINGS_CONSTANTS.zoomMax)
  })

  it('leaves a value that is already inside alone, and reports nothing', () => {
    const result = clampedSettings(settingsOf({ zoomX: 6 }))
    expect(result.settings.zoomX).toBe(6)
    expect(result.clamped).toEqual([])
  })

  it('does not touch what is not a number', () => {
    const result = clampedSettings(settingsOf({ stackDirection: 'up', zoomX: 6 }))
    expect(result.settings.stackDirection).toBe('up')
    expect(result.clamped).toEqual([])
  })
})

type Flags = Pick<EscapeContext, 'isTextEntryUnsettled' | 'gestureInFlight' | 'dualCursorMode'> & {
  readonly isConfirmationStanding?: boolean
}

// Spec: T-280
const stepped = (screen: ScreenValues, ...events: readonly ScreenValuesEvent[]): ScreenValues =>
  events.reduce(
    (session, event) => advanceScreenSession(session, event).state,
    { ...emptyScreenSession, screen },
  ).screen

const EMPTY = emptyScreenSession.screen

const armedWith = (armKind: 'dependencyArmed' | 'commentBoxArmed'): ScreenValues =>
  stepped(EMPTY, { type: 'armEntryPressed', armKind, shapeKind: null, glyph: null })

const withSurface = (screen: ScreenValues, surfaceName: string): ScreenValues =>
  stepped(screen, { type: 'surfaceEntryPressed', surfaceName })

// Spec: IN-4
const rungOf = (screen: ScreenValues, flags: Flags): ReturnType<typeof escapeTarget> => {
  const context = {
    screen,
    isTextEntryUnsettled: flags.isTextEntryUnsettled,
    pressed: flags.gestureInFlight ? {} : null,
    dualCursorFollowing: flags.dualCursorMode ? 'cursorA' : null,
    selection: { items: [] },
  } as unknown as InputContext
  const standing = flags.isConfirmationStanding === undefined ? {} : { isConfirmationStanding: flags.isConfirmationStanding }
  return escapeTarget({ ...escapeContextOf(context), ...standing })
}

describe('ScreenState (PI-36)', () => {
  const quiet = { isTextEntryUnsettled: false, gestureInFlight: false, dualCursorMode: false }

  it('starts with the palette showing and nothing armed or open (S-99e to S-99g)', () => {
    const state = EMPTY
    expect(state.armModeState.kind).toBe('notArmed')
    expect(state.paletteDisplayState.kind).toBe('shown')
    expect(state.fullScreenModeState.kind).toBe('normal')
    expect(state.openSurfaceState.kind).toBe('closed')
  })

  it('IN-4 consumes in order: surface, gesture, armed, then the dual cursor', () => {
    const armed = armedWith('dependencyArmed')
    const opened = withSurface(armed, 'help')

    expect(rungOf(opened, { isTextEntryUnsettled: false, gestureInFlight: true, dualCursorMode: true })).toBe('surface')
    expect(rungOf(armed, { isTextEntryUnsettled: false, gestureInFlight: true, dualCursorMode: true })).toBe('gesture')
    expect(rungOf(armed, { ...quiet, dualCursorMode: true })).toBe('armed')
    expect(rungOf(EMPTY, { ...quiet, dualCursorMode: true }))
      .toBe('dualCursorMode')
  })

  it('IN-4a hands the key to the browser when there is nothing to consume', () => {
    expect(rungOf(EMPTY, quiet)).toBeNull()
  })

  it('IN-4a: being armed still consumes, even in full screen', () => {
    const state = stepped(armedWith('commentBoxArmed'), { type: 'fullScreenChanged', isFullScreen: true })
    expect(state.fullScreenModeState.kind).toBe('full')
    expect(rungOf(state, quiet)).toBe('armed')
  })

  it('replaces the value whole rather than setting a field', () => {
    const state = EMPTY
    const hidden = stepped(state, { type: 'paletteToggled' })
    expect(hidden.paletteDisplayState.kind).toBe('hidden')
    expect(state.paletteDisplayState.kind).toBe('shown')
  })
})

// Spec: IN-4, IN-4a, S-99g, U-55
// Why: S-99g makes a surface what Esc's first level closes and U-55 calls a Confirmation a surface,
// so a standing question sits on that first level, ahead of the surface it was raised over.
describe('ScreenState (PI-36) -- Esc over a standing question (IN-4, IN-4a)', () => {
  const quiet = { isTextEntryUnsettled: false, gestureInFlight: false, dualCursorMode: false }
  const everything = {
    isTextEntryUnsettled: false,
    isConfirmationStanding: true,
    gestureInFlight: true,
    dualCursorMode: true,
  }
  // Why: S-99g holds exactly one open surface, so this value never carries a second; the question is raised outside it.
  const loaded = withSurface(armedWith('dependencyArmed'), 'help')
  const armedOnly = armedWith('dependencyArmed')

  it('IN-4: a standing question is spent first, above every level below it', () => {
    expect(rungOf(armedOnly, everything)).toBe('confirmation')
  })

  it('IN-4 (DFC-540 6): over an open surface a standing question is spent first, the surface only on the next press', () => {
    expect(rungOf(loaded, { ...everything, gestureInFlight: false, dualCursorMode: false })).toBe('confirmation')
    expect(rungOf(loaded, { ...quiet, isConfirmationStanding: true })).toBe('confirmation')
    expect(rungOf(loaded, { ...quiet, isConfirmationStanding: false })).toBe('surface')
  })

  it('IN-4: one press spends exactly ONE level, in the order the row states', () => {
    // Why: walking the ladder press by press catches a press that skips a level.
    const walked: Array<string | null> = []
    let state = armedOnly
    let context = { ...everything }
    for (let press = 0; press < 5; press += 1) {
      const target = rungOf(state, context)
      walked.push(target)
      if (target === 'confirmation') context = { ...context, isConfirmationStanding: false }
      else if (target === 'gesture') context = { ...context, gestureInFlight: false }
      else if (target === 'armed') state = stepped(state, { type: 'escapePressed', rung: 'armed' })
      else if (target === 'dualCursorMode') context = { ...context, dualCursorMode: false }
    }
    expect(walked).toEqual([
      'confirmation',
      'gesture',
      'armed',
      'dualCursorMode',
      null,
    ])
  })

  it('IN-4: the question outranks a gesture in flight even with no surface open', () => {
    expect(
      rungOf(EMPTY, {
        isTextEntryUnsettled: false,
        isConfirmationStanding: true,
        gestureInFlight: true,
        dualCursorMode: false,
      }),
    ).toBe('confirmation')
  })

  it('IN-4a: a question standing alone consumes, so the key does not reach the browser', () => {
    expect(rungOf(EMPTY, { ...quiet, isConfirmationStanding: true }))
      .toBe('confirmation')
  })

  it('IN-4a: with nothing at all to spend the press goes to the browser (MUST)', () => {
    expect(rungOf(EMPTY, { ...quiet, isConfirmationStanding: false }))
      .toBeNull()
  })

  it('IN-4a: in full screen the full-screen rung always stands, so nothing goes to the browser -- 全画面表示のあいだは、`IN-4` の全画面表示の段がいつも立つので、本行の「渡す」は起きない', () => {
    const full = stepped(EMPTY, { type: 'fullScreenChanged', isFullScreen: true })
    expect(rungOf(full, { ...quiet, isConfirmationStanding: true })).toBe('confirmation')
    expect(rungOf(full, { ...quiet, isConfirmationStanding: false })).toBe('fullScreen')
  })

  it('IN-4a: a caller that cannot see the question omits it, and absence is no level', () => {
    // Why: the field is optional because PI-18's screenStateFromInput holds nothing and reports only the levels it sees.
    expect(rungOf(EMPTY, quiet)).toBeNull()
    expect(rungOf(loaded, quiet)).toBe('surface')
  })

  it('IN-4: reckoning the level does not spend it -- the same input answers the same', () => {
    const context = { ...everything }
    expect(rungOf(armedOnly, context)).toBe('confirmation')
    expect(rungOf(armedOnly, context)).toBe('confirmation')
    expect(context.isConfirmationStanding).toBe(true)
    expect(armedOnly.armModeState).toEqual({ kind: 'armed', child: { kind: 'dependencyArmed' } })
  })
})

describe('Document (PI-34) -- table T-052', () => {
  const sound = {
    $schema: 'any string',
    schemaVersion: '1',
    schedule: {},
    documentSettings: {},
    documentStamp: {},
    changeLog: [],
  }

  // Spec: DR-1, DR-4
  it('holds the six keys DR-1 to DR-4 name, the address first', () => {
    expect(documentViolations({}).filter((one) => one.row === 'DR-4').map((one) => one.at)).toEqual([
      '/$schema',
      '/schemaVersion',
      '/schedule',
      '/documentSettings',
      '/documentStamp',
      '/changeLog',
    ])
    expect(documentViolations(sound)).toEqual([])
  })

  it('DR-1 catches a value put straight onto the root', () => {
    const found = documentViolations({ ...sound, themeHue: 214 })
    expect(found).toHaveLength(1)
    expect(found[0]?.row).toBe('DR-1')
    expect(found[0]?.at).toBe('/themeHue')
  })

  it('DR-4 catches a missing root key', () => {
    const { changeLog: _dropped, ...without } = sound
    const found = documentViolations(without)
    expect(found.map((one) => one.row)).toEqual(['DR-4'])
    expect(found[0]?.at).toBe('/changeLog')
  })

  it('DR-5 catches the theme hue kept in the presentation group', () => {
    const found = documentViolations({ ...sound, documentSettings: { themeHue: 214 } })
    expect(found.map((one) => one.row)).toEqual(['DR-5'])
  })

  it('DR-1 catches a root that is not an object at all', () => {
    expect(documentViolations(null).map((one) => one.row)).toEqual(['DR-1'])
    expect(documentViolations([]).map((one) => one.row)).toEqual(['DR-1'])
  })
})
