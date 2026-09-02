// Contract test: FD-6 of table T-012a and IV-12 of table T-220 count the same
// days.
//
// Table T-218 row TS-5 puts this here: the claim belongs to neither side of the
// seam. FD-6's truncation lives with the layout (`ScheduleLayout` carries it on
// `TaskPlacement`, appendix version 1.43) and IV-12 lives with the document
// model (`scheduleViolations`, PI-1 of table T-064) -- and the requirement is
// that the two AGREE, which is a statement about the pair and not about either
// unit.
//
// ---------------------------------------------------------------------------
// THE TWO ROWS, AND THE SENTENCE THAT BINDS THEM
// ---------------------------------------------------------------------------
//
//   T-012a FD-6 「`fadeIn` を `[0, 期間]` に丸めた後、`fadeOut` を
//            `[0, 期間 − fadeIn]` に丸める（**`fadeIn` が勝つ**）。⛔ **本表の
//            「期間」は暦日で数えること（MUST）。稼働日で数えてはならない
//            （MUST NOT）** —— フェードは**予定の日付が確定していない**ことを
//            表す印であり、非稼働日をまたぐかどうかで許される長さが変わる根拠が
//            無い。⚠️ **表 T-220 の `IV-12` も同じ数え方に従うこと（MUST）**
//            —— 一方が暦日、他方が稼働日だと、`FR-016` の掴み点が許した日数を
//            不変条件が拒む」
//   T-220 IV-12 「`fadeInDays` と `fadeOutDays` の和が、その `Task` の期間を
//            超えないこと。⛔ **ここでいう「期間」は、表 T-012a の `FD-6` と
//            同じく暦日で数えること（MUST）**」
//   T-064 PI-1 「`calendarDaysBetween`（2 つの日付のあいだの**暦日**数。表
//            T-012a の `FD-6` がフェードの単位として定め、`IV-12` が同じ数え方に
//            従う）」
//
// ⭐ THE FIXTURE SPANS THREE WEEKENDS ON PURPOSE. Ledger row D-15 is the
// disagreement itself: 「非稼働日をまたぐ予定で、`FD-6` が許すフェードを `IV-12`
// が拒む」. On a task that spans no non-working day the two counts coincide and
// every case below would pass over a unit that counted either way -- which is
// exactly what tests/unit/edit-task.test.ts says of its own IV-12 case
// (「Monday to Friday: four days, whichever way the span is counted」) and what
// tests/contract/document-invariants.contract.test.ts:48 files as missing.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md, section 1). ⛔ NO FILE UNDER src/ WAS READ. The fixtures
// are copied from tests/contract/document-invariants.contract.test.ts,
// tests/unit/document-model.test.ts and tests/unit/t-013-label-clears-the-
// fade.test.ts, all of which are tests.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, and why
// ---------------------------------------------------------------------------
//
//   - WHETHER BOTH ENDS OF THE SPAN COUNT. Both rows say 「期間」 and neither
//     says whether it is `finish` less `start`, or that plus the day itself.
//     ⛔ Missing: a sentence fixing the endpoints. So the cases below assert
//     that the boundary is one of the two readings IN CALENDAR DAYS (within one
//     day of `calendarDaysBetween`) and never which of them it is. The
//     AGREEMENT between FD-6 and IV-12 is asserted exactly, because that is
//     what the two rows state.
//   - WHAT FD-6 DOES TO THE OTHER FOUR SHAPES. FD-5 gives the fade to `SH-1`
//     and `SH-2` only, and FD-6's own heading says 「切り詰め（矩形）」, so the
//     fixture is a rectangle and nothing here speaks for the rest.
//   - HOW A CLIPPED FADE IS DRAWN. The cases read `TaskPlacement`'s two fade
//     measurements because that is where appendix version 1.43 says FD-6's
//     answer is carried; no case claims a shape or a colour.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable } from './spec-table'
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

// ---------------------------------------------------------------------------
// The rows, read out of the manuscript at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const cellOf = (tableId: string, rowId: string): string => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.cells.join(' ')
}

/**
 * One row of table T-012a, read by its row ID.
 *
 * ⚠️ NOT THROUGH `specTable`. That helper takes the FIRST markdown table under
 * a caption, and table T-012a's caption is followed by the four-vertex table
 * (whose first column is 「点」) before the row-ID one -- so `specTable('T-012a')`
 * throws rather than answering. ⛔ The helper is shared by many files and is not
 * this row's to change, so the one row this file needs is found by its ID
 * instead, which is what Chapter 1.9 (:274) makes the first column for.
 */
const fadeRow = (rowId: string): string => {
  const text = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
  const line = text.split('\n').find((one) => one.startsWith(`| ${rowId} |`))
  if (line === undefined) throw new Error(`no row ${rowId} in 01-04-requirements.md`)
  return line
}

/**
 * ⚠️ A Japanese literal in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- the unit of the count
 * is a Japanese word in a Japanese manuscript, and the pairing this file exists
 * to protect is the one both rows spell with it.
 */
const CALENDAR_DAYS = '暦日'
const WORKING_DAYS = '稼働日'

// ---------------------------------------------------------------------------
// The fixture: ONE rectangle that spans three weekends
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
  scrollDate: '2026-01-01', // S-77
  stackDirection: 'down', // S-58
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
  fontScaleSizes: { S: 12, M: 14, L: 16 }, // S-121 .. S-123
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

/** Monday. */
const START = '2026-01-05'
/** Monday, three weekends later. */
const FINISH = '2026-01-26'

// AT-73: dayType is 1..7 with 1 = Sunday, the coding of the exchange partner.
// S-106 works Monday to Friday, so this calendar has non-working days for the
// task to span -- which is the whole point of the fixture.
const WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType) => ({
  ordinal: dayType,
  dayType,
  dayWorking: dayType !== 1 && dayType !== 7,
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
    wbsParentUid: null,
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

/** The whole document, sound but for whatever the two fades do to it. */
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
      created: null,
      revision: null,
      lastSaved: null,
      startDate: null,
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      // FR-054: the document's calendar is the one this names.
      calendarUid: CALENDAR.uid,
      themeHue: 0,
      uidHighWaterMark: 400,
      importSeq: 3,
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
        label: 'row one',
        derivedFromTaskUid: null,
        order: 1,
        isCollapsed: null,
        isHidden: null,
        color: null,
        height: null,
      },
    ],
    // IV-6 asks for exactly one of these per `Task`.
    taskGroupMembers: [{ taskUid: 1, groupId: GROUP_ID, stackOrder: 1 }],
    // FD-5 of table T-012a gives the fade to SH-1 and SH-2 only, so the shape
    // is named rather than left to a default.
    taskVisuals: [
      {
        taskUid: 1,
        nameAnchor: null,
        nameAlign: null,
        shapeKind: 'rectangle',
        milestoneGlyph: null,
        fillColor: null,
        strokeColor: null,
        lineWeight: null,
      },
    ],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

// ---------------------------------------------------------------------------
// The two answers, read the way each row makes them observable
// ---------------------------------------------------------------------------

/** Whether IV-12 reports this pair of fades. */
const breaksIv12 = (fadeIn: number, fadeOut: number): boolean =>
  scheduleViolations(documentWith(fadeIn, fadeOut), SETTINGS).some((one) => one.row === 'IV-12')

/** The days FD-6 leaves of a pair of fades, read off `TaskPlacement`. */
const afterFd6 = (fadeIn: number, fadeOut: number): { in: number; out: number } => {
  const schedule = documentWith(fadeIn, fadeOut)
  const layout = layoutFromSchedule(schedule, SETTINGS, REGIONS)
  const placed = taskPlacement(layout, 1)
  if (placed === null) throw new Error('the one task was not drawn at this zoom')
  return { in: placed.fadeInPx / layout.pxPerDay, out: placed.fadeOutPx / layout.pxPerDay }
}

/** Whether FD-6 had to cut either fade down. */
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

/** Every fade this file probes: from nothing to well past the whole bar. */
const PROBED = Array.from({ length: CALENDAR_SPAN + 5 }, (_, days) => days)

// ---------------------------------------------------------------------------

describe('FD-6 and IV-12 -- the manuscript keeps both in calendar days', () => {
  it('FD-6 says 暦日 and forbids 稼働日, and points at IV-12', () => {
    // Read rather than copied, so a hand that takes the sentence back out of
    // the row fails here instead of leaving the cases below asserting a rule
    // the specification no longer holds.
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
    // ⚠️ 04-verification section 2. If the two counts were equal here, every
    // case in this file would be green over a unit that counted worked days --
    // which is the defect (ledger D-15), not the absence of one.
    expect(CALENDAR_SPAN).toBeGreaterThan(WORKED_SPAN)
  })

  it('⭐ IV-12 admits a fade longer than the worked days of the same span', () => {
    // 「本表の「期間」は暦日で数えること（MUST）。稼働日で数えてはならない
    // （MUST NOT）」. One more day than the worked span, counted either way,
    // and still well inside the calendar span.
    const beyondWorked = WORKED_SPAN + 1
    expect(beyondWorked).toBeLessThan(CALENDAR_SPAN)
    expect(breaksIv12(beyondWorked, 0), `${beyondWorked} days of fade was refused`).toBe(false)
  })

  it('⭐ FD-6 leaves that same fade whole', () => {
    // The other half of the pair: 「`fadeIn` を `[0, 期間]` に丸め」 -- with
    // 期間 in calendar days, a fade past the worked span is not past 期間.
    const beyondWorked = WORKED_SPAN + 1
    expect(afterFd6(beyondWorked, 0).in).toBeCloseTo(beyondWorked, 6)
  })

  it('⛔⛔ the two boundaries are the SAME boundary, day for day (MUST)', () => {
    // ⭐ THE ROW'S OWN REASON, ASSERTED AS WRITTEN: 「一方が暦日、他方が稼働日
    // だと、`FR-016` の掴み点が許した日数を不変条件が拒む」. So for every fade
    // from nothing to well past the bar: FD-6 cuts it down exactly when IV-12
    // reports it, and neither one before the other.
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
    // IV-12: 「`fadeInDays` と `fadeOutDays` の和が … 超えないこと」, and FD-6
    // rounds `fadeOut` into 「`[0, 期間 − fadeIn]`」 -- so the pair is cut
    // exactly when the sum passes 期間.
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
    // The largest fade both sides still admit. ⚠️ Which of the two readings of
    // 「期間」 the boundary follows is NOT asserted -- docs/spec does not say
    // whether both ends count -- so it is held to within one day of
    // `calendarDaysBetween` (table T-064's PI-1) and put out of reach of every
    // reading in worked days.
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
