// Contract tests: FD-6 of table T-012a and IV-12 of table T-220 count the same calendar days.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  calendarDaysBetween,
  dayOf,
  scheduleViolations,
  workingCalendarOf,
  workingDaysBetween,
  type Calendar,
  type Schedule,
  type Task,
  type WeekDay,
} from '../../src/entity/document-model/schedule/schedule'
import {
  layoutFromSchedule,
  taskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

const cellOf = (tableId: string, specTableRowId: string): string => {
  const found = specTable(tableId).rows.find((row) => row.id === specTableRowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${specTableRowId}`)
  return found.cells.join(' ')
}

// Trap: specTable('T-012a') throws, because its caption is followed by the vertex table
// first; the shared helper is not this file's to change, so the row is found by its ID.
const fadeRow = (specTableRowId: string): string => {
  const text = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
  const line = text.split('\n').find((one) => one.startsWith(`| ${specTableRowId} |`))
  if (line === undefined) throw new Error(`no row ${specTableRowId} in 01-04-requirements.md`)
  return line
}

// Why: a Japanese literal in code, because the unit of the count is a Japanese word that
// both rows spell, and the pairing this file protects is that word.
const CALENDAR_DAYS = '暦日'
const WORKING_DAYS = '稼働日'

// Why: the fixture spans three weekends on purpose: on a span with no non-working day the
// two counts coincide and every case would pass over a unit counting either way.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  rulerHeightPx: 48,
  rulerFontSizePx: 12,
  scrollDate: '2026-01-01',
  stackDirection: 'down',
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

const START = '2026-01-05T08:00:00'
// Why: it ends at the day's close, as GRS writes an end (WT-2), so FR-054 reads it as that day.
const FINISH = '2026-01-26T17:00:00'

// Why: AT-73 codes dayType 1..7 from Sunday, and S-106 works Monday to Friday, so the
// calendar has non-working days for the task to span.
const WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType) => ({
  ordinal: dayType,
  dayType,
  dayWorking: dayType !== 1 && dayType !== 7,
  workingTimes: [],
  carry: {},
  carryElements: [],
}))

const CALENDAR: Calendar = {
  uid: 1,
  name: 'Standard',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 1,
  carry: {},
  carryElements: [],
  weekDays: WEEK_DAYS,
  exceptions: [],
}

const GROUP_ID = '00000000-0000-4000-8000-000000000001'

const taskWith = (fadeIn: number, fadeOut: number): Task =>
  ({
    uid: 1,
    parentTaskUid: null,
    wbsOrder: 1,
    name: 'alpha',
    start: START,
    finish: FINISH,
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
    fadeInDays: fadeIn,
    fadeOutDays: fadeOut,
    dependencies: [],
    carry: {},
    carryElements: [],
  }) as unknown as Task

const documentWith = (fadeIn: number, fadeOut: number): Schedule =>
  ({
    project: {
      id: null,
      name: null,
      title: null,
      subject: null,
      category: null,
      company: null,
      manager: null,
      author: null,
      creationDate: null,
      revision: null,
      startDate: null,
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: CALENDAR.uid,
      defaultStartTime: null,
      defaultFinishTime: null,
      themeHue: 0,
      uidHighWaterMark: 400,
      importSequence: 3,
      carry: {},
      carryElements: [],
    },
    calendars: [CALENDAR],
    tasks: [taskWith(fadeIn, fadeOut)],
    resources: [],
    assignments: [],
    taskGroups: [
      {
        id: GROUP_ID,
        parentId: null,
        name: 'task group one',
        derivedFromTaskUid: null,
        order: 1,
        treeState: 'auto', color: null,
        minHeightPx: null,
      },
    ],
    // Why: IV-6 asks for exactly one of these per Task.
    taskGroupMembers: [{ taskUid: 1, taskGroupId: GROUP_ID }],
    // Why: FD-5 of table T-012a gives the fade to SH-1 and SH-2 only, so the shape is named
    // rather than left to a default.
    taskVisuals: [
      {
        taskUid: 1,
        shapeKind: 'rectangle',
        milestoneGlyph: null,
        fillColor: null,
        strokeColor: null,
        strokeWidthPx: null,
      },
    ],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const breaksIv12 = (fadeIn: number, fadeOut: number): boolean =>
  scheduleViolations(documentWith(fadeIn, fadeOut), SETTINGS).some((one) => one.row === 'IV-12')

const afterFd6 = (fadeIn: number, fadeOut: number): { in: number; out: number } => {
  const schedule = documentWith(fadeIn, fadeOut)
  const layout = layoutFromSchedule(schedule, SETTINGS, REGIONS)
  const placed = taskPlacement(layout, 1)
  if (placed === null) throw new Error('the one task was not drawn at this zoom')
  return { in: placed.fadeInPx / layout.pxPerDay, out: placed.fadeOutPx / layout.pxPerDay }
}

const clippedByFd6 = (fadeIn: number, fadeOut: number): boolean => {
  const left = afterFd6(fadeIn, fadeOut)
  return left.in < fadeIn - 1e-9 || left.out < fadeOut - 1e-9
}

const CALENDAR_SPAN = calendarDaysBetween(dayOf(START)!, dayOf(FINISH)!)
const WORKED_SPAN = workingDaysBetween(
  workingCalendarOf(documentWith(0, 0)),
  dayOf(START)!,
  dayOf(FINISH)!,
)

const PROBED = Array.from({ length: CALENDAR_SPAN + 5 }, (_, days) => days)

// Spec: FD-6, IV-12, PI-1
describe('FD-6 and IV-12 -- the manuscript keeps both in calendar days', () => {
  it('FD-6 says 暦日 and forbids 稼働日, and points at IV-12', () => {
    // Why: read rather than copied, so a sentence taken back out of the row fails here.
    const fd6 = fadeRow('FD-6')
    expect(fd6).toContain(CALENDAR_DAYS)
    expect(fd6).toContain(WORKING_DAYS)
    expect(fd6).toContain('IV-12')
  })

  it('IV-12 says the same 期間 is counted the same way', () => {
    const iv12 = cellOf('T-220', 'IV-12')
    expect(iv12).toContain(CALENDAR_DAYS)
    expect(iv12).toContain('FD-6')
  })
})

describe('FD-6 and IV-12 -- a Task that spans non-working days', () => {
  it('the fixture really spans them, or nothing below discriminates', () => {
    // Why: if the two counts were equal here, every case in this file would be green over a
    // unit that counted worked days.
    expect(CALENDAR_SPAN).toBeGreaterThan(WORKED_SPAN)
  })

  it('⭐ IV-12 admits a fade longer than the worked days of the same span', () => {
    const beyondWorked = WORKED_SPAN + 1
    expect(beyondWorked).toBeLessThan(CALENDAR_SPAN)
    expect(breaksIv12(beyondWorked, 0), `${beyondWorked} days of fade was refused`).toBe(false)
  })

  it('⭐ FD-6 leaves that same fade whole', () => {
    const beyondWorked = WORKED_SPAN + 1
    expect(afterFd6(beyondWorked, 0).in).toBeCloseTo(beyondWorked, 6)
  })

  it('⛔⛔ the two boundaries are the SAME boundary, day for day (MUST)', () => {
    // Why: the row's own reason: with one count in calendar days and the other in worked days,
    // IV-12 would refuse the days FR-016's grab point allowed.
    for (const days of PROBED) {
      const clipped = clippedByFd6(days, 0)
      const reported = breaksIv12(days, 0)
      expect(
        clipped,
        `a fadeIn of ${days} days: FD-6 clipped it ${clipped}, IV-12 reported it ${reported}`,
      ).toBe(reported)
    }
  })

  it('⛔⛔ and the same for the SUM of the two fades (IV-12 weighs the sum)', () => {
    for (const days of PROBED) {
      const half = Math.floor(days / 2)
      const rest = days - half
      const clipped = clippedByFd6(half, rest)
      const reported = breaksIv12(half, rest)
      expect(
        clipped,
        `fadeIn ${half} + fadeOut ${rest}: FD-6 clipped ${clipped}, IV-12 reported ${reported}`,
      ).toBe(reported)
    }
  })

  it('⛔ that shared boundary is a COUNT OF CALENDAR DAYS, not of worked days', () => {
    // Why: whether both ends of the span count is not settled, so the boundary is held within
    // one day of calendarDaysBetween and out of reach of every worked-day reading.
    const admitted = PROBED.filter((days) => !breaksIv12(days, 0))
    const largest = admitted[admitted.length - 1] as number

    expect(Math.abs(largest - CALENDAR_SPAN), `the boundary stood at ${largest}`).toBeLessThanOrEqual(1)
    expect(largest, `the boundary stood at ${largest}`).toBeGreaterThan(WORKED_SPAN + 1)
    expect(afterFd6(largest, 0).in, 'FD-6 leaves the largest admitted fade whole').toBeCloseTo(
      largest,
      6,
    )
  })
})
