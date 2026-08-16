// Unit tests for the documentModel units of wave W1.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification and Chapter 7 has not said where they live. They sit apart
// from tests/contract/ because they test the inside of a unit, which its own
// implementer owns -- see tests/README.md.
//
// Where a table decides the answer, the table drives the test and the case
// names the row, the same way the contract tests do.

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
  emptyDialogueLog,
  latestSequence,
  logWithMessage,
  messagesSince,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'

import {
  advancedStamp,
  isNewerStamp,
  isStampMatched,
  type DocumentStamp,
} from '../../src/entity/document-model/document-stamp/document-stamp'

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
    expect(swept.ordered).toBe(false)
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
  const limits = { maxSteps: 3, maxTotalSize: 1000 }

  it('FR-031 undoes the previous edit and redoes what was undone', () => {
    let history = emptyHistory<string>()
    history = historyWithStep(history, 'a', 1, limits)
    history = historyWithStep(history, 'b', 1, limits)

    const undo = previousStep(history)
    expect(undo.step).toBe('b')
    expect(stepCount(undo.history)).toBe(1)

    const redo = nextStep(undo.history)
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
    history = historyWithStep(history, 'big', 900, { maxSteps: 9, maxTotalSize: 1000 })
    history = historyWithStep(history, 'also big', 900, { maxSteps: 9, maxTotalSize: 1000 })
    expect(history.done.map((held) => held.step)).toEqual(['also big'])
  })

  it('a new edit makes what was undone unreachable', () => {
    let history = historyWithStep(emptyHistory<string>(), 'a', 1, limits)
    history = previousStep(history).history
    history = historyWithStep(history, 'b', 1, limits)
    expect(nextStep(history).step).toBeNull()
  })

  it('undo and redo on an empty history hand back nothing', () => {
    expect(previousStep(emptyHistory<string>()).step).toBeNull()
    expect(nextStep(emptyHistory<string>()).step).toBeNull()
  })
})

describe('DialogueLog (PI-33)', () => {
  const settle = (author: string, text: string) => ({
    author,
    text,
    settledAt: '2026-08-17T00:00:00Z',
  })

  it('AG-11 counts in an order of its own, not the revision', () => {
    let log = emptyDialogueLog()
    log = logWithMessage(log, settle('human', 'wait'))
    log = logWithMessage(log, settle('agent', 'why'))
    expect(log.messages.map((m) => m.sequence)).toEqual([1, 2])
    expect(latestSequence(log)).toBe(2)
  })

  it('AG-6 hands a watcher what it has not seen, from someone else', () => {
    let log = emptyDialogueLog()
    log = logWithMessage(log, settle('human', 'one'))
    log = logWithMessage(log, settle('agent', 'two'))
    log = logWithMessage(log, settle('human', 'three'))

    expect(messagesSince(log, 0, 'agent').map((m) => m.text)).toEqual(['one', 'three'])
    expect(messagesSince(log, 2, 'agent').map((m) => m.text)).toEqual(['three'])
    expect(messagesSince(log, 3, 'agent')).toEqual([])
  })

  it('AG-6 does not wake a writer for its own utterance', () => {
    const log = logWithMessage(emptyDialogueLog(), settle('agent', 'mine'))
    expect(messagesSince(log, 0, 'agent')).toEqual([])
  })
})

describe('DocumentStamp (PI-3)', () => {
  const stamp: DocumentStamp = {
    revision: 4,
    lastEditedBy: 'human',
    updatedAt: '2026-08-17T00:00:00Z',
  }

  it('FR-063 raises the revision for a schedule-data write', () => {
    const next = advancedStamp(stamp, 'agent', '2026-08-17T00:01:00Z', { raisesRevision: true })
    expect(next).toEqual({
      revision: 5,
      lastEditedBy: 'agent',
      updatedAt: '2026-08-17T00:01:00Z',
    })
  })

  it('FR-063 leaves the revision alone for a presentation-only write, but not who and when', () => {
    const next = advancedStamp(stamp, 'agent', '2026-08-17T00:01:00Z', { raisesRevision: false })
    expect(next.revision).toBe(4)
    expect(next.lastEditedBy).toBe('agent')
    expect(next.updatedAt).toBe('2026-08-17T00:01:00Z')
  })

  it('AG-2 compares all three, so a presentation-only write is still a mismatch', () => {
    const after = advancedStamp(stamp, 'agent', '2026-08-17T00:01:00Z', { raisesRevision: false })
    expect(isStampMatched(stamp, stamp)).toBe(true)
    expect(isStampMatched(stamp, after)).toBe(false)
  })

  it('a higher revision is newer, and at the same revision the later write is', () => {
    expect(isNewerStamp({ ...stamp, revision: 5 }, stamp)).toBe(true)
    expect(isNewerStamp({ ...stamp, updatedAt: '2026-08-17T00:02:00Z' }, stamp)).toBe(true)
    expect(isNewerStamp(stamp, stamp)).toBe(false)
  })
})

// Table T-019a, driven by the table: one case per row, and the row IDs are the
// case names, so a failure points at one line of the specification.
const emptyTask: Task = {
  uid: 1,
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
  it.each(T019A)('$row gives $state', ({ task, state }) => {
    expect(planActualState({ ...emptyTask, ...task })).toBe(state)
  })

  it('is total: the task that suspended and then finished still lands on a row', () => {
    // The case that made table T-019a replace the earlier set of conditions:
    // an actualFinish together with resume and resumeValid matched none of them.
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

// ---------------------------------------------------------------- dates ----

import {
  compareDays,
  dateFromWorkingDays,
  dayOf,
  delayWorkingDays,
  isDelayed,
  isWorkingDay,
  textOfDay,
  workingDaysBetween,
  type Calendar,
  type CalendarDay,
  type Exception,
  type WeekDay,
  type WorkingCalendar,
} from '../../src/entity/document-model/schedule/schedule'

const day = (year: number, month: number, d: number): CalendarDay => ({ year, month, day: d })

// AT-73: dayType is 1..7 with 1 = Sunday, the coding of the exchange partner.
const weekDays: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType) => ({
  ordinal: dayType,
  dayType,
  dayWorking: dayType !== 1 && dayType !== 7, // S-106: Monday to Friday
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
  carry: {},
  carryElements: [],
}

const plain: WorkingCalendar = { calendar, weekDays, exceptions: [] }
const withHoliday: WorkingCalendar = { calendar, weekDays, exceptions: [holiday] }

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
    // Monday 2026-08-17 .. Monday 2026-08-24 is five worked days.
    expect(workingDaysBetween(plain, day(2026, 8, 17), day(2026, 8, 24))).toBe(5)
    expect(workingDaysBetween(plain, day(2026, 8, 17), day(2026, 8, 17))).toBe(0)
    expect(isWorkingDay(calendar, weekDays, [], day(2026, 8, 22))).toBe(false) // Saturday
  })

  it('an exception that covers the day beats the weekly pattern', () => {
    expect(isWorkingDay(calendar, weekDays, [holiday], day(2026, 8, 19))).toBe(false)
    expect(workingDaysBetween(withHoliday, day(2026, 8, 17), day(2026, 8, 24))).toBe(4)
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
    // The end is a bound, not the last day worked, and it is the earliest one
    // that satisfies the count: Monday plus five worked days ends on the
    // Saturday, because the weekend adds nothing to the count.
    expect(dateFromWorkingDays(plain, from, 5)).toEqual(day(2026, 8, 22))
    expect(dateFromWorkingDays(withHoliday, from, 5)).toEqual(day(2026, 8, 25))
  })

  it('S-129: one worked day from a Monday ends on the Tuesday', () => {
    // Version 0.38 ruled that grabbing an untouched task books one worked day.
    // The task covers the Monday alone, so the end it reaches is the Tuesday.
    expect(dateFromWorkingDays(plain, day(2026, 8, 17), 1)).toEqual(day(2026, 8, 18))
    expect(workingDaysBetween(plain, day(2026, 8, 17), day(2026, 8, 18))).toBe(1)
  })

  it('compares days without touching the time', () => {
    expect(compareDays(day(2026, 8, 17), day(2026, 8, 18))).toBeLessThan(0)
    expect(compareDays(day(2026, 9, 1), day(2026, 8, 31))).toBeGreaterThan(0)
    expect(compareDays(day(2026, 8, 17), day(2026, 8, 17))).toBe(0)
  })
})

// Table T-021b, driven by the table: the row names the day the count starts.
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

// -------------------------------------------------- the last three units ----

import {
  clampedSettings,
  SETTINGS_BOUNDS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'

import {
  emptyScreenState,
  escapeTarget,
  screenStateWithArmed,
  screenStateWithFullScreen,
  screenStateWithPalette,
  screenStateWithSurface,
} from '../../src/entity/document-model/screen-state/screen-state'

import {
  documentViolations,
  ROOT_KEYS,
} from '../../src/entity/document-model/document/document'

// A whole DocumentSettings is 97 keys; a clamp reads one key at a time, so the
// cases below carry only the keys they are about.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  part as unknown as DocumentSettings

describe('DocumentSettings (PI-2)', () => {
  it('reads its bounds from the sources, not from a second copy', () => {
    // S-1 pxPerDayAt1x: 0.5 to 60 in table T-201.
    expect(SETTINGS_BOUNDS['pxPerDayAt1x']).toEqual({ min: 0.5, max: 60 })
  })

  it('pulls a value up to the lower bound and says it moved', () => {
    const result = clampedSettings(settingsOf({ pxPerDayAt1x: 0.1 }))
    expect(result.settings.pxPerDayAt1x).toBe(0.5)
    expect(result.clamped).toEqual([{ key: 'pxPerDayAt1x', was: 0.1, now: 0.5 }])
  })

  it('pushes a value down to the upper bound', () => {
    const result = clampedSettings(settingsOf({ pxPerDayAt1x: 999 }))
    expect(result.settings.pxPerDayAt1x).toBe(60)
  })

  it('leaves a value that is already inside alone, and reports nothing', () => {
    const result = clampedSettings(settingsOf({ pxPerDayAt1x: 6 }))
    expect(result.settings.pxPerDayAt1x).toBe(6)
    expect(result.clamped).toEqual([])
  })

  it('reaches a nested key the way tbl-settings.md writes it', () => {
    // S-121: fontScaleSizes.S is bounded above by fontScaleSizes.M, which is
    // not a number, so only the numeric side of the row can be clamped.
    const result = clampedSettings(settingsOf({ fontScaleSizes: { S: 1, M: 14, L: 999 } }))
    expect(result.settings.fontScaleSizes.L).toBe(40)
    expect(result.clamped.map((one) => one.key)).toContain('fontScaleSizes.L')
  })

  it('does not touch what is not a number', () => {
    const result = clampedSettings(settingsOf({ stackDirection: 'up', pxPerDayAt1x: 6 }))
    expect(result.settings.stackDirection).toBe('up')
    expect(result.clamped).toEqual([])
  })
})

describe('ScreenState (PI-36)', () => {
  const quiet = { gestureInFlight: false, dualCursorMode: false }

  it('starts with the palette showing and nothing armed or open (S-99e to S-99g)', () => {
    const state = emptyScreenState()
    expect(state.armed.kind).toBe('none')
    expect(state.paletteShown).toBe(true)
    expect(state.fullScreen).toBe(false)
    expect(state.surface).toBeNull()
  })

  it('IN-4 consumes in order: surface, gesture, armed, then the dual cursor', () => {
    const armed = screenStateWithArmed(emptyScreenState(), { kind: 'dependency' })
    const opened = screenStateWithSurface(armed, 'help')

    expect(escapeTarget(opened, { gestureInFlight: true, dualCursorMode: true })).toBe('surface')
    expect(escapeTarget(armed, { gestureInFlight: true, dualCursorMode: true })).toBe('gesture')
    expect(escapeTarget(armed, { ...quiet, dualCursorMode: true })).toBe('armed')
    expect(escapeTarget(emptyScreenState(), { ...quiet, dualCursorMode: true }))
      .toBe('dualCursorMode')
  })

  it('IN-4a hands the key to the browser when there is nothing to consume', () => {
    expect(escapeTarget(emptyScreenState(), quiet)).toBeNull()
  })

  it('IN-4a: being armed still consumes, even in full screen', () => {
    // The note on IN-4a: someone who armed something and then went full screen
    // presses Esc twice.
    const state = screenStateWithFullScreen(
      screenStateWithArmed(emptyScreenState(), { kind: 'commentBox' }),
      true,
    )
    expect(escapeTarget(state, quiet)).toBe('armed')
  })

  it('replaces the value whole rather than setting a field', () => {
    const state = emptyScreenState()
    const hidden = screenStateWithPalette(state, false)
    expect(hidden.paletteShown).toBe(false)
    expect(state.paletteShown).toBe(true)
  })
})

describe('Document (PI-34) -- table T-052', () => {
  const sound = {
    schemaVersion: '1',
    schedule: {},
    documentSettings: {},
    revisionStamp: {},
    changeLog: [],
  }

  it('holds the five keys DR-1 to DR-4 name', () => {
    expect([...ROOT_KEYS]).toEqual([
      'schemaVersion',
      'schedule',
      'documentSettings',
      'revisionStamp',
      'changeLog',
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
