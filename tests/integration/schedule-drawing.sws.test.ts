// Integration cases for the SW_SPEC nodes of Chapter 6.1 -- table T-218, TS-2.
//
//   TS-2 | Software specification test | Chapter 9's SW_SPEC_TEST | parent
//        | SWS-xxx | Integration | tests/integration/ | Vitest
//
// WHAT IS HERE. Chapter 6.1 carries six SW_SPEC nodes. Five of them are the
// drawing chain, and every one of them is covered below:
//
//   SWS-1  the tick thinning of the fine steps   FR-017   table T-221 LF-1
//   SWS-2  the band height and top of a row      FR-003   LF-2 / LF-3
//   SWS-3  the route of a dependency line        FR-009   LF-4 / LF-5, T-222
//   SWS-4  the vertices of what is drawn         FR-094   LF-6..LF-11, LF-13
//   SWS-5  the vertices of the progress line     FR-014   LF-12
//
// SWS-6 (normalising two MSPDI files before comparing them, FR-021, W3C
// Canonical XML) HAS NO CASE HERE ON PURPOSE: the unit that would answer it is
// not written yet, so a case would only assert that nothing exists. When
// DocumentCodec (PI-20) grows the comparison, its cases belong in this file
// next to the five below, and the completeness check at the bottom of this
// file will not notice the gap -- SWS-6 points at no row of table T-221.
//
// HOW THEY ARE DRIVEN. Chapter 1.9 of docs/spec/01-04-requirements.md, :275:
// a test that verifies a requirement pointing at a table is driven by fixed
// data copied from that table, and ONE test walks every row. The copy is taken
// at read time by tests/contract/spec-table.ts, so it cannot fall behind the
// table the way a re-typed copy does. Three things come from the tables rather
// than from this file:
//
//   * the roster of rows. `coverage` below fails when a row of T-221 or T-222
//     has no case, so adding a row to the specification breaks this file.
//   * the bend count of every route. Table T-222's own column supplies it.
//   * the terms each formula names. `mentions()` fails when a formula stops
//     naming the settings key a case computes with, so moving LF-6 off
//     `chevronNotchOfWidth` breaks the case that reads it.
//
// The arithmetic itself is transcribed from the formula cell, because prose is
// not executable. Every expected value is built out of the settings keys the
// formula names -- never out of a number read off the implementation.
//
// THE SHAPE A GENERATOR CAN READ. Table T-219, TW-2: Chapter 9's cases are
// GENERATED from this code, so the facts a generator needs are declared, not
// narrated. Every case is introduced by exactly one `swsCase({...})` literal
// with these six keys and no others:
//
//   sws     the SW_SPEC node the case hangs from  -> the generated node's parent
//   level   the TEST_LEVEL of table T-218         -> always 'Integration' here
//   covers  the table rows verified               -> LF-n of T-221, RP-n of T-222
//   given   the state the document is in
//   when    the entry of table T-064 that is called
//   then    what must hold of the answer
//
// `swsCase` returns the `it` title, so the declaration and the name a failure
// prints cannot drift apart, and it files the case in CASES for the coverage
// check. To find every case: grep for `swsCase({`. To find one node's cases:
// grep for `sws: 'SWS-3'`.
//
// WHAT IS EXERCISED. These are Integration cases, so they run through the
// public entries of table T-064 and never reach past one (LR-2 / LR-5 of table
// T-061; `npm run layers` does not police tests):
//
//   PI-35 regionsFromScreen  -> PI-5 layoutFromSchedule -> PI-6 geometryFromLayout
//   PI-19 svgFromSchedule    where the case is about what is drawn
//
// TWO CASES ARE LEFT FAILING. They are findings, not chores (04-verification
// section 1): the expected value states what the specification says, and the
// specification is quoted in the case. Search for `FINDING` below.

import { describe, expect, it } from 'vitest'
import { specTable, type SpecTable } from '../contract/spec-table'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Calendar,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  layoutFromSchedule,
  tickStrideOf,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  geometryFromLayout,
  type Path,
  type Point,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'

// ---------------------------------------------------------------------------
// The declaration every case carries (table T-219, TW-2)
// ---------------------------------------------------------------------------

type SwsId = 'SWS-1' | 'SWS-2' | 'SWS-3' | 'SWS-4' | 'SWS-5'

interface SwsCase {
  /** The SW_SPEC node of Chapter 6.1 the generated case takes as its parent. */
  readonly sws: SwsId
  /** TEST_LEVEL. Table T-218 gives TS-2 exactly one. */
  readonly level: 'Integration'
  /** Row IDs of table T-221 (`LF-n`) or table T-222 (`RP-n`). */
  readonly covers: readonly string[]
  readonly given: string
  readonly when: string
  readonly then: string
}

// Filled while the module is evaluated -- one push per `swsCase` literal, all
// of them before the first case body runs. Nothing written below ever mutates
// it, so no case can see a different registry than any other (R6.1).
const CASES: SwsCase[] = []

/** Declare a case and return the name Vitest prints for it. */
function swsCase(one: SwsCase): string {
  CASES.push(one)
  return `${one.sws} [${one.covers.join(' ')}] GIVEN ${one.given} WHEN ${one.when} THEN ${one.then}`
}

// ---------------------------------------------------------------------------
// The tables, read out of the specification at read time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T221: SpecTable = specTable('T-221')
const T222: SpecTable = specTable('T-222')

const rowOf = (table: SpecTable, id: string) => {
  const row = table.rows.find((r) => r.id === id)
  if (row === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return row
}

/** The last column of a row: T-221 writes the formula there, T-222 the route. */
const formulaOf = (table: SpecTable, id: string): string => {
  const cells = rowOf(table, id).cells
  return cells[cells.length - 1] ?? ''
}

/**
 * Fail unless the row still names every term the case computes with.
 *
 * This is what keeps the transcription honest: the arithmetic below is a copy
 * of prose, and a copy goes stale silently. If LF-6 stops naming
 * `chevronNotchOfWidth`, the case that multiplies by it fails here rather than
 * quietly testing a formula the specification no longer states.
 */
const mentions = (table: SpecTable, id: string, ...terms: readonly string[]): void => {
  const text = formulaOf(table, id)
  for (const term of terms) {
    expect(text, `table ${table.id} row ${id} no longer names ${term}`).toContain(term)
  }
}

/** Table T-222's own bend count for a row -- the only all-digit cell it has. */
const bendsOf = (id: string): number => {
  const cell = rowOf(T222, id).cells.find((c) => /^\d+$/.test(c.trim()))
  if (cell === undefined) throw new Error(`table T-222 row ${id} states no bend count`)
  return Number(cell.trim())
}

// ---------------------------------------------------------------------------
// The document under test
//
// tests/fixtures/grs-document.ts deliberately carries no sample document, so
// the shapes below are built here. They are plain data and nothing mutates
// them: every builder returns a fresh object (R6.1).
// ---------------------------------------------------------------------------

/** Expand SETTINGS_DEFAULTS' dotted keys into the nested shape the type has. */
const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

/**
 * A calendar on which every weekday is worked.
 *
 * FR-054 resolves the document's calendar to what `Project.calendarUid` names.
 * Working every day is what makes a day of the month and a worked day the same
 * number here, so the expected x of a date is arithmetic rather than a second
 * calendar walk inside the test. IV-17 wants at least one worked weekday.
 */
const EVERY_DAY_WORKED: Calendar = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    ordinal: n,
    dayType: n,
    dayWorking: true,
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
}

const task = (over: Partial<Task> & { readonly uid: number }): Task => ({
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
  ...over,
})

const taskGroup = (id: string, order: number, over: Partial<TaskGroup> = {}): TaskGroup => ({
  id,
  parentId: null,
  label: id,
  derivedFromTaskUid: null,
  order,
  isCollapsed: false,
  isHidden: false,
  color: null,
  height: null,
  ...over,
})

const taskVisual = (taskUid: number, over: Partial<TaskVisual> = {}): TaskVisual => ({
  taskUid,
  nameAnchor: null,
  nameAlign: null,
  shapeKind: 'rectangle',
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
  ...over,
})

const dependency = (predecessorUid: number, linkType: number) => ({
  predecessorUid,
  linkType,
  lag: null,
  lagFormat: null,
  carry: {},
  carryElements: [],
})

const scheduleOf = (
  tasks: readonly Task[],
  groups: readonly TaskGroup[],
  members: readonly TaskGroupMember[],
  visuals: readonly TaskVisual[],
  statusDate: string | null,
): Schedule => ({
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
    startDate: '2026-03-01T00:00:00',
    statusDate,
    minutesPerDay: null,
    minutesPerWeek: null,
    daysPerMonth: null,
    weekStartDay: null,
    calendarUid: EVERY_DAY_WORKED.uid,
    themeHue: 214,
    uidHighWaterMark: 1000,
    importSeq: 0,
    carry: {},
    carryElements: [],
  },
  calendars: [EVERY_DAY_WORKED],
  tasks,
  resources: [],
  assignments: [],
  taskGroups: groups,
  taskGroupMembers: members,
  taskVisuals: visuals,
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
})

/** BO-1 of table T-077: what the environment settles, not the document. */
const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8 }

/** A day of March 2026, as a stored date column writes it. */
const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

/** The x the left edge of a bar starting on `d` gets, from the axis FR-017 fixes. */
const xOfDay = (d: number, regions: { rowArea: { x: number } }, pxPerDay: number): number =>
  regions.rowArea.x + (d - 1) * pxPerDay

interface Drawn {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly regions: ReturnType<typeof regionsFromScreen>
  readonly layout: ScheduleLayout
  readonly geometry: ReturnType<typeof geometryFromLayout>
}

/**
 * One pass of the chain: PI-35 -> PI-5 -> PI-6.
 *
 * `groupIds[i]` says which row `tasks[i]` is drawn on. The rows are created in
 * the sorted order of those IDs, so `g1` is the topmost row. `allRows` names
 * every row the document holds when that is more than the Tasks reach -- which
 * is how a row carrying nothing is set up.
 */
const draw = (
  tasks: readonly Task[],
  groupIds: readonly string[],
  visuals: readonly TaskVisual[],
  over: Readonly<Record<string, unknown>> = {},
  statusDate: string | null = null,
  allRows: readonly string[] = groupIds,
): Drawn => {
  const ids = [...new Set([...groupIds, ...allRows])].sort()
  const groups = ids.map((id, i) => taskGroup(id, i))
  const members: TaskGroupMember[] = tasks.map((t, i) => ({
    taskUid: t.uid,
    groupId: groupIds[i] ?? ids[0] ?? 'g1',
    stackOrder: null,
  }))
  const schedule = scheduleOf(tasks, groups, members, visuals, statusDate)
  // scrollDate (S-77) pins the left edge of the Row Area, so the axis is fixed
  // and a case can state the x it expects. stackDirection is pinned per case.
  const settings = settingsOf({ zoomX: 10, scrollDate: day(1), stackDirection: 'down', ...over })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions)
  return { schedule, settings, regions, layout, geometry }
}

const placementOf = (drawn: Drawn, uid: number) => {
  const found = drawn.layout.placements.find((p) => p.taskUid === uid)
  if (found === undefined) throw new Error(`this zoom drew no Task ${uid}`)
  return found
}

const rowByIdOf = (drawn: Drawn, groupId: string) => {
  const found = drawn.layout.rows.find((r) => r.groupId === groupId)
  if (found === undefined) throw new Error(`this zoom drew no row ${groupId}`)
  return found
}

const geometryOf = (drawn: Drawn, uid: number) => {
  const found = drawn.geometry.tasks.find((t) => t.taskUid === uid)
  if (found === undefined) throw new Error(`no geometry for Task ${uid}`)
  return found
}

const outlineOf = (bar: ReturnType<typeof geometryOf>['plan']): Path => {
  if (bar === null || bar.form !== 'outline') throw new Error('this bar is not an outline')
  return bar.points
}

const lineOf = (bar: ReturnType<typeof geometryOf>['plan']) => {
  if (bar === null || bar.form !== 'line') throw new Error('this bar is not a line')
  return bar
}

/** Both coordinates of a point, to the precision floating point leaves. */
const closeTo = (p: Point, x: number, y: number): void => {
  expect(p.x).toBeCloseTo(x, 6)
  expect(p.y).toBeCloseTo(y, 6)
}

// ===========================================================================
// SWS-1 -- the tick thinning of the fine steps. FR-017, table T-221 LF-1.
// ===========================================================================

/**
 * The width LF-1 divides by the width of one day, recovered from the answer.
 *
 * LF-1 states `stride = ceil(W / pxPerDay)`, so `stride` is one exactly when
 * `W <= pxPerDay`: the smallest day width that leaves the ticks unthinned IS
 * W. Bisecting for it needs no knowledge of what the label says, which is what
 * lets these cases test the formula without inventing a label the
 * specification does not fix.
 *
 * ⚠️ W is LF-1's OCCUPIED width, not FR-093's estimate: since CR-200 the row
 * reads "the estimated label width (`FR-093`) plus `rulerLabelGap`", so what
 * the bisection recovers is `estimate + rulerLabelGap` (table T-006b A-11
 * keeps the two words apart).
 *
 * The day step (`L-1` of table T-005a, the fourth) is the only step LF-1 acts
 * on, so the search runs with the day threshold at its floor -- `S-85`'s lower
 * bound is `rulerTierPxPerDayWeek` -- and asserts it stayed on that step.
 */
const DAY_STEP_FLOOR = SETTINGS_DEFAULTS['rulerTierPxPerDayWeek'] as number
const FONT_MIN = SETTINGS_DEFAULTS['fontMin'] as number

/** The narrowest day that still shows the day step, once S-85 is at its floor. */
const dayStepFrom = (rulerFont: number): number => (DAY_STEP_FLOOR * rulerFont) / FONT_MIN

/** What S-135 states, printed from the manuscript by `npm run gen`. */
const RULER_LABEL_GAP = SETTINGS_DEFAULTS['rulerLabelGap'] as number

/** Settings that put the ruler on its day step at `pxPerDay`, however narrow. */
const dayStepSettings = (
  pxPerDay: number,
  rulerFont: number,
  labelCoef: number,
  rulerLabelGap: number = RULER_LABEL_GAP,
): DocumentSettings =>
  settingsOf({
    pxPerDayAt1x: 1,
    zoomX: pxPerDay,
    rulerFont,
    labelCoef,
    rulerLabelGap,
    // S-85's own lower bound is rulerTierPxPerDayWeek, so this is the widest
    // stretch of the axis the specification lets the day step cover. FR-017
    // divides by the ruler font over S-8 before testing, which is why the
    // threshold in pixels moves with the font.
    rulerTierPxPerDayDay: DAY_STEP_FLOOR,
    scrollDate: day(1),
  })

const impliedLabelWidth = (
  rulerFont: number,
  labelCoef: number,
  rulerLabelGap: number = RULER_LABEL_GAP,
): number => {
  const strideAt = (pxPerDay: number): number => {
    const settings = dayStepSettings(pxPerDay, rulerFont, labelCoef, rulerLabelGap)
    const regions = regionsFromScreen(SCREEN, settings)
    const layout = layoutFromSchedule(ONE_TASK_SCHEDULE, settings, regions)
    expect(layout.tier).toBe('yearMonthDayWeekday')
    expect(layout.pxPerDay).toBeCloseTo(pxPerDay, 9)
    return tickStrideOf(layout, settings)
  }
  let thinned = dayStepFrom(rulerFont) * 1.001 // narrow enough that thinning is on
  let clear = rulerFont * 400 // wide enough that none is
  expect(strideAt(thinned), 'the narrowest day on the day step is not thinned').toBeGreaterThan(1)
  expect(strideAt(clear)).toBe(1)
  for (let i = 0; i < 60; i += 1) {
    const mid = (thinned + clear) / 2
    if (strideAt(mid) === 1) clear = mid
    else thinned = mid
  }
  return clear
}

const ONE_TASK_SCHEDULE = scheduleOf(
  [task({ uid: 1, name: 'A', start: day(2), finish: day(6) })],
  [taskGroup('g1', 0)],
  [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
  [taskVisual(1)],
  null,
)

describe('SWS-1 -- thin out the fine steps of the ruler (FR-017)', () => {
  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-1'],
      given: 'a zoom that puts the ruler on the year, the month or the week step',
      when: 'tickStrideOf reads the layout',
      then: 'nothing is thinned out, whatever the label would cost',
    }),
    () => {
      // LF-1: "the year, month and week steps are NOT thinned -- FR-017 forbids
      // it". So the answer is one on every step but the fourth.
      mentions(T221, 'LF-1', 'FR-017')
      const coarse: ReadonlyArray<readonly [number, string]> = [
        [0.1, 'year'],
        [0.5, 'yearMonth'],
        [1, 'yearMonthWeek'],
        [4, 'yearMonthWeek'],
        // S-85's threshold is measured at a 12 px ruler font, so 5.8 * S-1 is
        // the widest day that still misses the day step at the default font.
        [5.8, 'yearMonthWeek'],
      ]
      for (const [zoomX, tier] of coarse) {
        // labelCoef at its ceiling (S-30) is the most expensive label allowed,
        // so if anything could thin a coarse step it would be this.
        const settings = settingsOf({ zoomX, labelCoef: 1, scrollDate: day(1) })
        const regions = regionsFromScreen(SCREEN, settings)
        const layout = layoutFromSchedule(ONE_TASK_SCHEDULE, settings, regions)
        expect(layout.tier, `zoomX ${zoomX}`).toBe(tier)
        expect(tickStrideOf(layout, settings), `zoomX ${zoomX}`).toBe(1)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-1'],
      given: 'the ruler on its day and weekday step at many zooms',
      when: 'tickStrideOf reads each layout',
      then: 'one width divided by the day, rounded up, explains every answer',
    }),
    () => {
      // LF-1: "divide the estimated label width by the width of one day, round
      // up, and keep one tick every that many days". Three things follow, and
      // none of them needs to know what the label says:
      //   * the answer is a whole number of days, never below one
      //   * a wider day never asks for MORE thinning
      //   * `stride = ceil(W / px)` means `(stride - 1) * px < W <= stride * px`
      //     for ONE W, so the bands the samples cut out must overlap. A floor
      //     instead of a ceiling, or a width that moves with the zoom, empties
      //     the intersection.
      let lower = 0
      let upper = Number.POSITIVE_INFINITY
      let previous = Number.POSITIVE_INFINITY
      let previousPx = 0
      for (let i = 0; i < 60; i += 1) {
        const pxPerDay = dayStepFrom(FONT_MIN) * 1.001 + i * 1.5
        const settings = dayStepSettings(pxPerDay, FONT_MIN, 1)
        const regions = regionsFromScreen(SCREEN, settings)
        const layout = layoutFromSchedule(ONE_TASK_SCHEDULE, settings, regions)
        expect(layout.tier).toBe('yearMonthDayWeekday')
        const stride = tickStrideOf(layout, settings)
        expect(Number.isInteger(stride), `px ${pxPerDay} gave ${stride}`).toBe(true)
        expect(stride, `px ${pxPerDay}`).toBeGreaterThanOrEqual(1)
        expect(stride, `px ${pxPerDay} after px ${previousPx}`).toBeLessThanOrEqual(previous)
        previous = stride
        previousPx = pxPerDay
        lower = Math.max(lower, (stride - 1) * pxPerDay)
        upper = Math.min(upper, stride * pxPerDay)
      }
      expect(lower, 'no single label width explains every stride').toBeLessThan(upper)
    },
  )

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-1'],
      given: 'the ruler font doubled, and labelCoef doubled',
      when: 'the width LF-1 divides by is recovered from the strides',
      then: 'the estimate doubles with each and rulerLabelGap rides along unchanged',
    }),
    () => {
      // LF-1 divides by an OCCUPIED width: "the estimated label width
      // (`FR-093`) plus `rulerLabelGap`". The two halves answer to different
      // things, and this case pins each of them:
      //
      //   * FR-093 fixes the estimate as
      //         units counted 2 per full-width and 1 per half-width
      //           * font size * labelCoef
      //     -- a product of three, with nothing added. So the ESTIMATE doubles
      //     with each factor, whatever the unit count of the day and weekday
      //     label turns out to be.
      //   * `rulerLabelGap` (S-135) names no font and no coefficient, so it is
      //     the same number of pixels at every font and every coefficient.
      //
      // ⚠️ The occupied width is therefore NOT proportional to either factor
      // -- taking the gap off first is what makes the proportion testable.
      // Before CR-200 LF-1 stated a bare estimate and this case demanded the
      // proportion of the sum; it was red, and the manuscript moved.
      mentions(T221, 'LF-1', 'FR-093', 'rulerLabelGap')
      const estimate = (rulerFont: number, labelCoef: number): number =>
        impliedLabelWidth(rulerFont, labelCoef) - RULER_LABEL_GAP
      const base = estimate(12, 0.5)
      expect(base, 'a label of no width would make the proportions vacuous').toBeGreaterThan(0)
      expect(estimate(12, 1), 'doubling labelCoef must double the estimate').toBeCloseTo(base * 2, 6)
      expect(estimate(24, 0.5), 'doubling the ruler font must double the estimate').toBeCloseTo(
        base * 2,
        6,
      )
      expect(estimate(24, 1), 'doubling both must quadruple the estimate').toBeCloseTo(base * 4, 6)

      // 04-verification section 2: a value that comes from the manuscript is
      // only shown to ARRIVE when moving it moves the answer. Widening S-135
      // by six pixels has to widen the occupied width by exactly six -- the
      // gap is added once, and it is added at the same place whatever the
      // font. A bare number in the code, or the old `labelGap` (S-32, which is
      // for labels put OUTSIDE a shape, per K-32), leaves this flat.
      const wider = RULER_LABEL_GAP + 6
      expect(
        impliedLabelWidth(12, 0.5, wider) - impliedLabelWidth(12, 0.5, RULER_LABEL_GAP),
        'S-135 does not reach the thinning',
      ).toBeCloseTo(wider - RULER_LABEL_GAP, 6)
      expect(impliedLabelWidth(24, 1, wider) - estimate(24, 1)).toBeCloseTo(wider, 6)
    },
  )
})

// ===========================================================================
// SWS-2 -- the band height and the top of a row. FR-003, LF-2 and LF-3.
// ===========================================================================

/** Three documents that stress LF-2 and LF-3 in different ways. */
const bandDocuments = (): ReadonlyArray<readonly [string, Drawn]> => {
  const long = (uid: number, from: number, to: number) =>
    task({ uid, name: `t${uid}`, start: day(from), finish: day(to) })
  return [
    [
      'three lanes of rectangles',
      draw(
        [long(1, 2, 20), long(2, 3, 21), long(3, 4, 22)],
        ['g1', 'g1', 'g1'],
        [taskVisual(1), taskVisual(2), taskVisual(3)],
      ),
    ],
    [
      'three lanes, stackGap widened',
      draw(
        [long(1, 2, 20), long(2, 3, 21), long(3, 4, 22)],
        ['g1', 'g1', 'g1'],
        [taskVisual(1), taskVisual(2), taskVisual(3)],
        { stackGap: 30 },
      ),
    ],
    [
      'one lane holding a rectangle and a taller milestone, then an empty row',
      draw(
        [long(1, 2, 4), task({ uid: 2, name: 'm', start: day(10), finish: day(10), milestone: true })],
        ['g1', 'g1'],
        [taskVisual(1), taskVisual(2, { shapeKind: 'milestone', milestoneGlyph: 'diamond' })],
        {},
        null,
        ['g1', 'g2'],
      ),
    ],
    [
      'rows of unequal height at twice the vertical zoom',
      draw(
        [long(1, 2, 20), long(2, 3, 21), long(3, 2, 20)],
        ['g1', 'g1', 'g2'],
        [taskVisual(1), taskVisual(2), taskVisual(3)],
        { zoomY: 2 },
      ),
    ],
  ]
}

describe('SWS-2 -- decide a row band and where it sits (FR-003)', () => {
  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-2'],
      given: 'rows of one, two and three lanes, and a row holding no Task',
      when: 'layoutFromSchedule places them',
      then: 'each band is the sum of its lanes plus stackGap once per join',
    }),
    () => {
      // LF-2: "for each lane take the greatest height a Task on it occupies,
      // add them up, and add stackGap once for every join between two lanes. A
      // lane carrying no Task takes the height the rectangle occupies."
      mentions(T221, 'LF-2', 'stackGap')
      for (const [name, drawn] of bandDocuments()) {
        for (const row of drawn.layout.rows) {
          const lanes = Math.max(row.stackCount, 1)
          let sum = 0
          for (let lane = 0; lane < lanes; lane += 1) {
            const onLane = drawn.layout.placements.filter(
              (p) => p.groupId === row.groupId && p.stack === lane,
            )
            // A lane with no Task on it takes the rectangle's height.
            sum += onLane.length === 0
              ? drawn.layout.rectangleHeight
              : Math.max(...onLane.map((p) => p.height))
          }
          const expected = sum + drawn.settings.stackGap * (lanes - 1)
          expect(row.height, `${name}: row ${row.groupId}`).toBeCloseTo(expected, 6)
        }
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-2'],
      given: 'a row on which no Task is drawn at all',
      when: 'layoutFromSchedule places it',
      then: 'it still takes the height the rectangle occupies',
    }),
    () => {
      // LF-2's last sentence, and SWS-2's RATIONALE: an empty row keeps its
      // band so the row heading and the band do not drift apart.
      const drawn = draw(
        [task({ uid: 1, name: 'a', start: day(2), finish: day(20) })],
        ['g1'],
        [taskVisual(1)],
        {},
        null,
        ['g1', 'g2', 'g3'],
      )
      const empty = rowByIdOf(drawn, 'g2')
      expect(empty.stackCount).toBe(0)
      expect(empty.height).toBeCloseTo(drawn.layout.rectangleHeight, 6)
      // and the rectangle's own height is FR-094's chain, not a number of its own
      expect(drawn.layout.rectangleHeight).toBeCloseTo(
        drawn.settings.basePlanHeight *
          drawn.settings.zoomY *
          drawn.settings.shapeHeightOf.rectangle,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-3'],
      given: 'several rows of different band heights',
      when: 'layoutFromSchedule places them',
      then: 'each top is the one above plus that band and rowGap',
    }),
    () => {
      // LF-3: "the top of a row is the top of the row before it, plus that
      // row's band and rowGap."
      mentions(T221, 'LF-3', 'rowGap')
      for (const [name, drawn] of bandDocuments()) {
        const rows = drawn.layout.rows
        expect(rows.length, name).toBeGreaterThan(0)
        expect(rows[0]?.y, `${name}: the first row starts at the Row Area`).toBeCloseTo(
          drawn.regions.rowArea.y,
          6,
        )
        for (let i = 1; i < rows.length; i += 1) {
          const above = rows[i - 1]
          const here = rows[i]
          if (above === undefined || here === undefined) throw new Error('unreachable')
          expect(here.y, `${name}: row ${here.groupId}`).toBeCloseTo(
            above.y + above.height + drawn.settings.rowGap,
            6,
          )
        }
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-3'],
      given: 'a row holding only an arrow, which is drawn thinner than a rectangle',
      when: 'layoutFromSchedule places it',
      then: 'the band still does not fall below the rectangle',
    }),
    () => {
      // LF-3: "the band does not fall below the height the rectangle occupies."
      // SH-3 of table T-012 has no thickness and S-15 halves it, so an arrow is
      // the shape that reaches for the floor.
      const drawn = draw(
        [task({ uid: 1, name: 'arrow', start: day(2), finish: day(4) })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'arrow' })],
      )
      const placed = placementOf(drawn, 1)
      expect(placed.height, 'the arrow itself is drawn shorter than a rectangle').toBeLessThan(
        drawn.layout.rectangleHeight,
      )
      expect(rowByIdOf(drawn, 'g1').height).toBeCloseTo(drawn.layout.rectangleHeight, 6)
    },
  )
})

// ===========================================================================
// SWS-3 -- the route of a dependency line. FR-009, LF-4, LF-5 and table T-222.
// ===========================================================================

/**
 * One scenario per row of table T-222.
 *
 * Every one is two Tasks and one dependency; `linkType` picks the family out of
 * table T-018 (1 = FS and 2 = SF are the opposing family, 0 = FF and 3 = SS the
 * same-side one), and the rows they are drawn on pick the vertical relation.
 * The route the layout chooses must be the row this scenario was written for.
 */
const routeScenarios = (): Readonly<Record<string, Drawn>> => {
  const t = (uid: number, from: number, to: number, deps: ReadonlyArray<readonly [number, number]> = []) =>
    task({
      uid,
      name: `t${uid}`,
      start: day(from),
      finish: day(to),
      dependencies: deps.map(([p, k]) => dependency(p, k)),
    })
  const pair = (a: Task, b: Task, rows: readonly [string, string], over: Readonly<Record<string, unknown>> = {}) =>
    draw([a, b], rows, [taskVisual(a.uid), taskVisual(b.uid)], over)

  return {
    // opposing, one lane, the edges further apart than the entry run
    'RP-1': pair(t(1, 2, 6), t(2, 12, 16, [[1, 1]]), ['g1', 'g1']),
    // opposing, the successor lower, x2 at or beyond x1
    'RP-2': pair(t(1, 2, 6), t(2, 12, 16, [[1, 1]]), ['g1', 'g2']),
    // the same, upside down: the successor is the upper row
    'RP-3': pair(t(1, 2, 6), t(2, 12, 16, [[1, 1]]), ['g2', 'g1']),
    // opposing, the successor lower and to the LEFT, so x2 falls short of x1
    'RP-4': pair(t(1, 2, 6), t(2, 3, 5, [[1, 1]]), ['g1', 'g2']),
    // the same, upside down
    'RP-5': pair(t(1, 12, 16), t(2, 2, 6, [[1, 1]]), ['g2', 'g1']),
    // same-side (FF), the successor lower
    'RP-6': pair(t(1, 2, 6), t(2, 12, 16, [[1, 0]]), ['g1', 'g2']),
    // same-side (FF), the successor upper
    'RP-7': pair(t(1, 2, 6), t(2, 12, 16, [[1, 0]]), ['g2', 'g1']),
    // same-side (FF), one lane
    'RP-8': pair(t(1, 2, 6), t(2, 12, 16, [[1, 0]]), ['g1', 'g1']),
  }
}

const dependencyOf = (drawn: Drawn) => {
  const [only, ...rest] = drawn.geometry.dependencies
  if (only === undefined) throw new Error('the scenario drew no dependency line')
  if (rest.length > 0) throw new Error('the scenario drew more than one dependency line')
  return only
}

describe('SWS-3 -- draw the route of a dependency line (FR-009)', () => {
  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-1', 'RP-2', 'RP-3', 'RP-4', 'RP-5', 'RP-6', 'RP-7', 'RP-8'],
      given: 'one document per situation table T-222 distinguishes',
      when: 'geometryFromLayout routes the single dependency of each',
      then: 'the row of table T-222 that is chosen, and its bend count, are the row written for it',
    }),
    () => {
      // One test walks every row (Chapter 1.9, :275). The bend count is not
      // transcribed: table T-222 states it in a column of its own and this
      // reads it from there.
      const scenarios = routeScenarios()
      for (const row of T222.rows) {
        const drawn = scenarios[row.id]
        expect(drawn, `no scenario is written for table T-222 row ${row.id}`).toBeDefined()
        if (drawn === undefined) continue
        const line = dependencyOf(drawn)
        expect(line.pattern, `the scenario for ${row.id} was routed as ${line.pattern}`).toBe(row.id)
        expect(line.points.length - 2, `bends of ${row.id}`).toBe(bendsOf(row.id))
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['LF-4'],
      given: 'a four-bend route at two different dependencyArrowLength values',
      when: 'geometryFromLayout routes it',
      then: 'the exit run is one arrow length short of the entry run',
    }),
    () => {
      // LF-4: "the entry run is dependencyArrowLength times
      // dependencyRunOfArrow; the exit run is that less one dependencyArrowLength.
      // The exit and the entry do NOT get settings of their own."
      //
      // RP-4 is the route that shows both: it leaves the exit edge, turns at
      // x1 (the exit edge plus the exit run) and reaches the entry edge from
      // x2 (the entry edge less the entry run).
      mentions(T221, 'LF-4', 'dependencyArrowLength', 'dependencyRunOfArrow')
      for (const [arrowLength, runOfArrow] of [[10, 2], [20, 3]] as ReadonlyArray<readonly [number, number]>) {
        const drawn = draw(
          [
            task({ uid: 1, name: 'p', start: day(2), finish: day(6) }),
            task({
              uid: 2,
              name: 's',
              start: day(3),
              finish: day(5),
              dependencies: [dependency(1, 1)],
            }),
          ],
          ['g1', 'g2'],
          [taskVisual(1), taskVisual(2)],
          { dependencyArrowLength: arrowLength, dependencyRunOfArrow: runOfArrow },
        )
        const line = dependencyOf(drawn)
        expect(line.pattern).toBe('RP-4')
        const predecessor = placementOf(drawn, 1)
        const successor = placementOf(drawn, 2)
        const exitEdge = predecessor.x + predecessor.width
        const entryEdge = successor.x
        const entryRun = arrowLength * runOfArrow
        const exitRun = entryRun - arrowLength
        const at = (i: number): Point => {
          const p = line.points[i]
          if (p === undefined) throw new Error(`the route has no point ${i}`)
          return p
        }
        expect(at(0).x, 'the route leaves the exit edge').toBeCloseTo(exitEdge, 6)
        expect(at(1).x - exitEdge, 'the exit run').toBeCloseTo(exitRun, 6)
        expect(entryEdge - at(3).x, 'the entry run').toBeCloseTo(entryRun, 6)
        expect(at(5).x, 'the route reaches the entry edge').toBeCloseTo(entryEdge, 6)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['LF-5'],
      given: 'four-bend routes running down, running up, and inside one lane',
      when: 'geometryFromLayout routes each',
      then: 'the corridor sits where LF-5 puts it for that direction',
    }),
    () => {
      // LF-5: "going down, the midpoint of the predecessor's bottom and the
      // successor's top; going up, the midpoint of the successor's bottom and
      // the predecessor's top; between two Tasks on the SAME lane, that lane's
      // bottom plus half of stackGap."
      mentions(T221, 'LF-5', 'stackGap')
      const corridorOf = (drawn: Drawn): number => {
        const line = dependencyOf(drawn)
        const mid = line.points[2]
        const back = line.points[3]
        if (mid === undefined || back === undefined) throw new Error('not a four-bend route')
        expect(mid.y, 'the corridor is one horizontal run').toBeCloseTo(back.y, 6)
        return mid.y
      }

      const down = draw(
        [
          task({ uid: 1, name: 'p', start: day(2), finish: day(6) }),
          task({ uid: 2, name: 's', start: day(3), finish: day(5), dependencies: [dependency(1, 1)] }),
        ],
        ['g1', 'g2'],
        [taskVisual(1), taskVisual(2)],
      )
      const dp = placementOf(down, 1)
      const ds = placementOf(down, 2)
      expect(corridorOf(down), 'running down').toBeCloseTo(
        (dp.y + dp.planHeight + ds.y) / 2,
        6,
      )

      const up = draw(
        [
          task({ uid: 1, name: 'p', start: day(12), finish: day(16) }),
          task({ uid: 2, name: 's', start: day(2), finish: day(6), dependencies: [dependency(1, 1)] }),
        ],
        ['g2', 'g1'],
        [taskVisual(1), taskVisual(2)],
      )
      const up1 = placementOf(up, 1)
      const up2 = placementOf(up, 2)
      expect(corridorOf(up), 'running up').toBeCloseTo(
        (up2.y + up2.planHeight + up1.y) / 2,
        6,
      )

      // One lane: the two Tasks touch, so RP-1's clearance is not met and the
      // route drops into the corridor of LF-5's third clause.
      const same = draw(
        [
          task({ uid: 1, name: 'p', start: day(2), finish: day(6) }),
          task({ uid: 2, name: 's', start: day(6), finish: day(9), dependencies: [dependency(1, 1)] }),
        ],
        ['g1', 'g1'],
        [taskVisual(1), taskVisual(2)],
      )
      const lane = placementOf(same, 1)
      expect(placementOf(same, 2).stack, 'both are on one lane').toBe(lane.stack)
      expect(corridorOf(same), 'inside one lane').toBeCloseTo(
        lane.y + lane.planHeight + same.settings.stackGap / 2,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-1', 'RP-4'],
      given: 'two Tasks on one lane whose edges are exactly the entry run apart, and one pixel less',
      when: 'geometryFromLayout routes the dependency between them',
      then: 'the clearance is met at the boundary and RP-4 takes over below it',
    }),
    () => {
      // RP-1: "one lane, the entry and exit edges at least the entry run
      // apart". "At least" is the boundary, and RP-4 catches "one lane, RP-1
      // not met". At a day of exactly the entry run wide, one day of clear air
      // between the two bars is exactly the threshold.
      const entryRun =
        (SETTINGS_DEFAULTS['dependencyArrowLength'] as number) *
        (SETTINGS_DEFAULTS['dependencyRunOfArrow'] as number)
      const at = (pxPerDay: number): string => {
        const drawn = draw(
          [
            task({ uid: 1, name: 'p', start: day(2), finish: day(6) }),
            task({ uid: 2, name: 's', start: day(7), finish: day(9), dependencies: [dependency(1, 1)] }),
          ],
          ['g1', 'g1'],
          [taskVisual(1), taskVisual(2)],
          { pxPerDayAt1x: pxPerDay, zoomX: 1 },
        )
        const p = placementOf(drawn, 1)
        const s = placementOf(drawn, 2)
        expect(s.stack, 'both are on one lane').toBe(p.stack)
        expect(s.x - (p.x + p.width), 'the clearance under test').toBeCloseTo(pxPerDay, 6)
        return dependencyOf(drawn).pattern
      }
      expect(at(entryRun), 'exactly the entry run apart').toBe('RP-1')
      expect(at(entryRun + 1), 'wider than the entry run').toBe('RP-1')
      expect(at(entryRun - 1), 'narrower than the entry run').toBe('RP-4')
    },
  )

  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-2'],
      given: 'a two-bend route whose plain midpoint falls outside x1 and x2',
      when: 'geometryFromLayout routes it',
      then: 'the bend is pulled back inside x1 and x2',
    }),
    () => {
      // RP-2: "exit edge -> midpoint -> down -> entry edge. The midpoint is
      // held inside x1 and x2." One day of clearance at 35 px a day leaves the
      // plain midpoint past x2, so the clamp has to bite.
      const drawn = draw(
        [
          task({ uid: 1, name: 'p', start: day(2), finish: day(6) }),
          task({ uid: 2, name: 's', start: day(7), finish: day(12), dependencies: [dependency(1, 1)] }),
        ],
        ['g1', 'g2'],
        [taskVisual(1), taskVisual(2)],
        { pxPerDayAt1x: 35, zoomX: 1 },
      )
      const line = dependencyOf(drawn)
      expect(line.pattern).toBe('RP-2')
      const predecessor = placementOf(drawn, 1)
      const successor = placementOf(drawn, 2)
      const exitEdge = predecessor.x + predecessor.width
      const entryEdge = successor.x
      const entryRun =
        (drawn.settings.dependencyArrowLength as number) * drawn.settings.dependencyRunOfArrow
      const exitRun = entryRun - drawn.settings.dependencyArrowLength
      const x1 = exitEdge + exitRun
      const x2 = entryEdge - entryRun
      const plain = (exitEdge + entryEdge) / 2
      expect(plain, 'the scenario is only worth running if the clamp bites').toBeGreaterThan(x2)
      const bend = line.points[1]
      const drop = line.points[2]
      if (bend === undefined || drop === undefined) throw new Error('not a two-bend route')
      expect(bend.x).toBeCloseTo(drop.x, 6)
      expect(bend.x, 'held inside x1 and x2').toBeCloseTo(Math.min(Math.max(plain, x1), x2), 6)
    },
  )

  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-8'],
      given: 'a same-side dependency on one lane whose two verticals would land together',
      when: 'geometryFromLayout routes it',
      then: 'x1 is pushed out to x2 plus the exit run',
    }),
    () => {
      // RP-8: "when x1 and x2 are closer than the exit run, push x1 out to x2
      // plus the exit run -- two vertical lines on top of each other cannot be
      // told apart, there and back." The successor ends just to the left of the
      // predecessor, which is what brings the two together.
      const arrowLength = 40
      const runOfArrow = 2
      const drawn = draw(
        [
          task({ uid: 1, name: 'p', start: day(9), finish: day(11) }),
          task({ uid: 2, name: 's', start: day(2), finish: day(8), dependencies: [dependency(1, 0)] }),
        ],
        ['g1', 'g1'],
        [taskVisual(1), taskVisual(2)],
        { pxPerDayAt1x: 12, zoomX: 1, dependencyArrowLength: arrowLength, dependencyRunOfArrow: runOfArrow },
      )
      const line = dependencyOf(drawn)
      expect(line.pattern).toBe('RP-8')
      const predecessor = placementOf(drawn, 1)
      const successor = placementOf(drawn, 2)
      expect(successor.stack, 'both are on one lane').toBe(predecessor.stack)
      const entryRun = arrowLength * runOfArrow
      const exitRun = entryRun - arrowLength
      // FF: both anchors are a right edge, so both runs go to the right.
      const x2 = successor.x + successor.width + entryRun
      const plainX1 = predecessor.x + predecessor.width + exitRun
      expect(Math.abs(plainX1 - x2), 'the scenario only bites when they are closer than the exit run')
        .toBeLessThan(exitRun)
      const pushed = line.points[1]
      if (pushed === undefined) throw new Error('the route has no first bend')
      expect(pushed.x).toBeCloseTo(x2 + exitRun, 6)
    },
  )
})

// ===========================================================================
// SWS-4 -- the vertices of what is drawn. FR-094, LF-6..LF-11 and LF-13.
// ===========================================================================

describe('SWS-4 -- make the vertices of what is drawn (FR-094)', () => {
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-6'],
      given: 'a chevron whose notch is capped by its height, and one capped by its width',
      when: 'geometryFromLayout outlines the plan and the actual',
      then: 'the actual notch is the plan notch times actualOfPlan and is not capped a second time',
    }),
    () => {
      // LF-6: "on the plan side, the smaller of the width times
      // chevronNotchOfWidth and the height times chevronNotchOfHeight. The
      // actual side is the plan side times actualOfPlan, and MUST NOT be capped
      // a second time."
      mentions(T221, 'LF-6', 'chevronNotchOfWidth', 'chevronNotchOfHeight', 'actualOfPlan')
      // The notch of a chevron is how far its point runs past the body: the
      // second vertex of the outline is the top edge stopping short of the tip.
      const notchOf = (points: Path): number => {
        const shoulder = points[1]
        const tip = points[2]
        if (shoulder === undefined || tip === undefined) throw new Error('not a chevron outline')
        return tip.x - shoulder.x
      }
      for (const [name, from, to] of [
        ['a wide chevron, so the height caps it', 2, 10],
        // Zero days wide: FR-001 keeps it at minShapeWidth, and at that width
        // it is the WIDTH that caps the plan notch -- which is the case that
        // tells a second cap apart from none, because capping the actual on its
        // own would use the actual's much greater width instead.
        ['a chevron of no duration, so the width caps it', 2, 2],
      ] as ReadonlyArray<readonly [string, number, number]>) {
        const drawn = draw(
          [
            task({
              uid: 1,
              name: 'c',
              start: day(from),
              finish: day(to),
              actualStart: day(2),
              actualDuration: 3,
            }),
          ],
          ['g1'],
          [taskVisual(1, { shapeKind: 'chevron' })],
        )
        const placed = placementOf(drawn, 1)
        const geometry = geometryOf(drawn, 1)
        const planNotch = Math.min(
          placed.width * drawn.settings.chevronNotchOfWidth,
          placed.planHeight * drawn.settings.chevronNotchOfHeight,
        )
        expect(notchOf(outlineOf(geometry.plan)), `${name}: the plan notch`).toBeCloseTo(
          planNotch,
          6,
        )
        expect(notchOf(outlineOf(geometry.actual)), `${name}: the actual notch`).toBeCloseTo(
          planNotch * drawn.settings.actualOfPlan,
          6,
        )
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-7', 'LF-8'],
      given: 'an arrow and an endpoint span, both drawn as a line',
      when: 'geometryFromLayout gives them a stroke, a head and end dots',
      then: 'each is the product LF-7 and LF-8 state, with LF-8 held inside its two bounds',
    }),
    () => {
      // LF-8: "multiply the plan height by thinStrokeOfPlan and hold it inside
      // thinStrokeMin and thinStrokeMax."
      // LF-7: "the head is the smaller of the stroke times arrowHeadOfStroke
      // and the width times arrowHeadOfSpan. The radius of an endpoint dot is
      // the stroke times spanDotOfStroke."
      mentions(T221, 'LF-8', 'thinStrokeOfPlan', 'thinStrokeMin', 'thinStrokeMax')
      mentions(T221, 'LF-7', 'arrowHeadOfStroke', 'arrowHeadOfSpan', 'spanDotOfStroke')

      // Three settings: the product falls inside the bounds, under the floor,
      // and over the ceiling.
      for (const over of [
        {},
        { thinStrokeMin: 6, thinStrokeMax: 20 },
        { thinStrokeMin: 0.5, thinStrokeMax: 1 },
      ]) {
        const drawn = draw(
          [task({ uid: 1, name: 'a', start: day(2), finish: day(10) })],
          ['g1'],
          [taskVisual(1, { shapeKind: 'arrow' })],
          over,
        )
        const placed = placementOf(drawn, 1)
        const line = lineOf(geometryOf(drawn, 1).plan)
        const stroke = Math.min(
          Math.max(
            placed.planHeight * drawn.settings.thinStrokeOfPlan,
            drawn.settings.thinStrokeMin,
          ),
          drawn.settings.thinStrokeMax,
        )
        expect(line.strokeWidth, JSON.stringify(over)).toBeCloseTo(stroke, 6)

        const head = line.head
        expect(head, 'SH-3 is drawn with a head').not.toBeNull()
        if (head === null) continue
        const tip = head[0]
        const base = head[1]
        if (tip === undefined || base === undefined) throw new Error('not a head')
        expect(tip.x - base.x, `head length ${JSON.stringify(over)}`).toBeCloseTo(
          Math.min(
            stroke * drawn.settings.arrowHeadOfStroke,
            placed.width * drawn.settings.arrowHeadOfSpan,
          ),
          6,
        )
      }

      const span = draw(
        [task({ uid: 1, name: 's', start: day(2), finish: day(10) })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'endpointSpan' })],
      )
      const spanLine = lineOf(geometryOf(span, 1).plan)
      expect(spanLine.head, 'SH-4 has no head').toBeNull()
      expect(spanLine.dots.length, 'SH-4 has two ends').toBe(2)
      for (const dot of spanLine.dots) {
        expect(dot.radius).toBeCloseTo(spanLine.strokeWidth * span.settings.spanDotOfStroke, 6)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-9'],
      given: 'a rectangle, which overlays its actual, and an arrow, which drops it below',
      when: 'geometryFromLayout places the actual bar',
      then: 'the overlay is centred in the plan and the drop clears it by actualGap',
    }),
    () => {
      // LF-9: "a shape that overlays the actual inside itself drops it by half
      // the difference between the plan height and the actual height. A shape
      // that pushes the actual below drops it by the plan height plus
      // actualGap."
      mentions(T221, 'LF-9', 'actualGap')
      const started = { actualStart: day(2), actualDuration: 3 } as const

      const inside = draw(
        [task({ uid: 1, name: 'r', start: day(2), finish: day(10), ...started })],
        ['g1'],
        [taskVisual(1)],
      )
      const insidePlaced = placementOf(inside, 1)
      expect(insidePlaced.actualPlacement, 'SH-1 overlays').toBe('inside')
      const insidePlan = outlineOf(geometryOf(inside, 1).plan)
      const insideActual = outlineOf(geometryOf(inside, 1).actual)
      const topOf = (points: Path): number => Math.min(...points.map((p) => p.y))
      const heightOf = (points: Path): number =>
        Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y))
      expect(topOf(insideActual) - topOf(insidePlan)).toBeCloseTo(
        (heightOf(insidePlan) - heightOf(insideActual)) / 2,
        6,
      )

      const below = draw(
        [task({ uid: 1, name: 'a', start: day(2), finish: day(10), ...started })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'arrow' })],
      )
      const belowPlaced = placementOf(below, 1)
      expect(belowPlaced.actualPlacement, 'SH-3 drops below').toBe('below')
      const planLine = lineOf(geometryOf(below, 1).plan)
      const actualLine = lineOf(geometryOf(below, 1).actual)
      // A line carries no top of its own: it is drawn down the middle of its
      // band, so the two bands' tops are the two centres less half of each.
      const actualHeight = belowPlaced.planHeight * below.settings.actualOfPlan
      const planTop = planLine.from.y - belowPlaced.planHeight / 2
      const actualTop = actualLine.from.y - actualHeight / 2
      expect(actualTop - planTop).toBeCloseTo(
        belowPlaced.planHeight + below.settings.actualGap,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-10'],
      given: 'a milestone that has an actual date of its own',
      when: 'geometryFromLayout draws both figures',
      then: 'the plan is a side of its plan height centred on start, the actual that times actualOfPlan centred on its own day, at the same middle',
    }),
    () => {
      // LF-10: "the plan is a figure whose side is that Task's plan height,
      // centred on start. The actual is that times actualOfPlan, centred on the
      // actual date. The vertical middle is the same as the plan's."
      mentions(T221, 'LF-10', 'actualOfPlan')
      const drawn = draw(
        [
          task({
            uid: 1,
            name: 'm',
            start: day(5),
            finish: day(5),
            milestone: true,
            actualStart: day(8),
            actualDuration: 0,
          }),
        ],
        ['g1'],
        [taskVisual(1, { shapeKind: 'milestone', milestoneGlyph: 'diamond' })],
      )
      const placed = placementOf(drawn, 1)
      const extent = (points: Path) => ({
        left: Math.min(...points.map((p) => p.x)),
        right: Math.max(...points.map((p) => p.x)),
        top: Math.min(...points.map((p) => p.y)),
        bottom: Math.max(...points.map((p) => p.y)),
      })
      const plan = extent(outlineOf(geometryOf(drawn, 1).plan))
      const actual = extent(outlineOf(geometryOf(drawn, 1).actual))
      const side = placed.planHeight

      expect(plan.right - plan.left, 'the plan side').toBeCloseTo(side, 6)
      expect(plan.bottom - plan.top, 'the plan side').toBeCloseTo(side, 6)
      expect((plan.left + plan.right) / 2, 'centred on start').toBeCloseTo(
        xOfDay(5, drawn.regions, drawn.layout.pxPerDay),
        6,
      )
      expect(actual.right - actual.left, 'the actual side').toBeCloseTo(
        side * drawn.settings.actualOfPlan,
        6,
      )
      expect((actual.left + actual.right) / 2, 'centred on the actual day').toBeCloseTo(
        xOfDay(8, drawn.regions, drawn.layout.pxPerDay),
        6,
      )
      expect((actual.top + actual.bottom) / 2, 'the same middle as the plan').toBeCloseTo(
        (plan.top + plan.bottom) / 2,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-11'],
      given: 'a Task that is under way, so an actual bar is on screen beside its plan',
      when: 'geometryFromLayout places the progress marker',
      then: 'the marker clears the right end of the actual bar by markerGap',
    }),
    () => {
      // FINDING (left failing). LF-11: "the marker goes markerGap clear of the
      // right end of the bar FR-013 names, as a square of side markerSize. Its
      // middle is the middle of the plan bar." FR-013 names that bar in as many
      // words: the marker goes outside the right end of the ACTUAL bar, and
      // outside the plan bar's right end only while the plan alone is shown
      // (MUST).
      //
      // Measured, a Task with an actual bar has its marker at the right end of
      // the PLAN bar instead -- so the marker walks away from the actual bar it
      // is meant to sit beside, and the further behind the Task is the further
      // away it goes. Two things say this is the code and not the reading:
      // FR-013's MUST spells the two cases out, and the not-started case below
      // already places the marker off FR-043's dummy actual bar, so the two
      // branches of one rule disagree with each other.
      mentions(T221, 'LF-11', 'markerGap', 'markerSize', 'FR-013')
      const drawn = draw(
        [
          task({
            uid: 1,
            name: 'x',
            start: day(2),
            finish: day(10),
            actualStart: day(2),
            actualDuration: 3,
          }),
        ],
        ['g1'],
        [taskVisual(1)],
        {},
        day(10),
      )
      const placed = placementOf(drawn, 1)
      expect(drawn.settings.planActualDisplay, 'both bars are on screen').toBe('both')
      expect(placed.actualX, 'the Task has an actual bar').not.toBeNull()
      const actualRight = (placed.actualX ?? 0) + placed.actualWidth
      expect(actualRight, 'and it ends short of the plan').toBeLessThan(placed.x + placed.width)

      const marker = geometryOf(drawn, 1).marker
      expect(marker, 'a Task under way carries a marker').not.toBeNull()
      if (marker === null) return
      expect(marker.radius * 2, 'a square of side markerSize').toBeCloseTo(
        drawn.settings.markerSize,
        6,
      )
      expect(marker.centre.y, 'the middle of the plan bar').toBeCloseTo(
        placed.y + placed.planHeight / 2,
        6,
      )
      expect(
        marker.centre.x - marker.radius - actualRight,
        'markerGap clear of the actual bar',
      ).toBeCloseTo(drawn.settings.markerGap, 6)
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-11'],
      given: 'a Task not started, whose only actual bar is FR-043 dummy',
      when: 'geometryFromLayout places the marker',
      then: 'it clears that bar by markerGap and sits on the plan middle',
    }),
    () => {
      // The other half of LF-11's first sentence. A Task with nothing entered
      // still shows a marker (FR-013 gives PM-1a a target to press), and the
      // bar it clears is the dummy FR-043 draws.
      const drawn = draw(
        [task({ uid: 1, name: 'x', start: day(2), finish: day(10) })],
        ['g1'],
        [taskVisual(1)],
        {},
        day(10),
      )
      const placed = placementOf(drawn, 1)
      expect(placed.actualX, 'nothing is entered, so no actual bar is held').toBeNull()
      const marker = geometryOf(drawn, 1).marker
      expect(marker).not.toBeNull()
      if (marker === null) return
      expect(marker.centre.y).toBeCloseTo(placed.y + placed.planHeight / 2, 6)
      // FR-043's dummy runs actualInitialDuration worked days from start.
      const dummyRight = xOfDay(
        2 + drawn.settings.actualInitialDuration,
        drawn.regions,
        drawn.layout.pxPerDay,
      )
      expect(marker.centre.x - marker.radius - dummyRight).toBeCloseTo(
        drawn.settings.markerGap,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-13', 'LF-11'],
      given: 'a suspended Task, once with resumeValid true and once false',
      when: 'geometryFromLayout draws the resume icon',
      then: 'the L sits markerGap past the marker, its arm and head scale off the marker, and a false resumeValid shrinks the side',
    }),
    () => {
      // LF-13: "an L-shaped bent arrow with its foot on the bottom of the
      // marker and its point at the middle of the marker. The arm is the side
      // of the figure times resumeArmOfMarker and the head that side times
      // resumeHeadOfMarker. When resumeValid is false the side is multiplied by
      // resumeScaleInvalid."
      // LF-11: "the resume icon stands a further markerGap clear of the right
      // of the marker."
      mentions(T221, 'LF-13', 'resumeArmOfMarker', 'resumeHeadOfMarker', 'resumeScaleInvalid')
      for (const resumeValid of [true, false]) {
        const drawn = draw(
          [
            task({
              uid: 1,
              name: 'r',
              start: day(2),
              finish: day(10),
              actualStart: day(2),
              actualDuration: 3,
              resume: day(8),
              resumeValid,
            }),
          ],
          ['g1'],
          [taskVisual(1)],
          {},
          day(10),
        )
        const marker = geometryOf(drawn, 1).marker
        const resume = geometryOf(drawn, 1).resume
        expect(marker, `resumeValid ${resumeValid}`).not.toBeNull()
        expect(resume, `resumeValid ${resumeValid}`).not.toBeNull()
        if (marker === null || resume === null) continue

        expect(resume.valid).toBe(resumeValid)
        const side = resumeValid
          ? drawn.settings.markerSize
          : drawn.settings.markerSize * drawn.settings.resumeScaleInvalid

        const foot = resume.arm[0]
        const corner = resume.arm[1]
        const armEnd = resume.arm[2]
        if (foot === undefined || corner === undefined || armEnd === undefined) {
          throw new Error('an L has three points')
        }
        expect(foot.x, 'markerGap past the right of the marker').toBeCloseTo(
          marker.centre.x + marker.radius + drawn.settings.markerGap,
          6,
        )
        expect(foot.y, 'its foot on the bottom of the marker').toBeCloseTo(
          marker.centre.y + marker.radius,
          6,
        )
        expect(corner.x, 'the upright of the L').toBeCloseTo(foot.x, 6)
        expect(corner.y, 'turning at the middle of the marker').toBeCloseTo(marker.centre.y, 6)
        expect(armEnd.y).toBeCloseTo(marker.centre.y, 6)
        expect(armEnd.x - corner.x, 'the arm').toBeCloseTo(
          side * drawn.settings.resumeArmOfMarker,
          6,
        )

        const back = resume.head[0]
        const point = resume.head[1]
        if (back === undefined || point === undefined) throw new Error('a head has three points')
        expect(point.x - back.x, 'the head').toBeCloseTo(
          side * drawn.settings.resumeHeadOfMarker,
          6,
        )
        expect(point.y, 'the point at the middle of the marker').toBeCloseTo(marker.centre.y, 6)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-6'],
      given: 'the same chevron carried on to the renderer',
      when: 'svgFromSchedule draws the frame',
      then: 'the notch vertices reach the drawn polygon unchanged',
    }),
    () => {
      // The chain does not end at the geometry: FR-080 has SvgRenderer (PI-19)
      // put those vertices on screen, and ADR-001 says it measures nothing of
      // its own. So the same numbers must come out the far end -- a renderer
      // that rounds or recomputes the notch would be caught here and by no
      // case above.
      const drawn = draw(
        [task({ uid: 1, name: 'c', start: day(2), finish: day(10) })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'chevron' })],
      )
      const points = outlineOf(geometryOf(drawn, 1).plan)
      expect(points.length, 'a chevron is six vertices').toBe(6)
      const svg = svgFromSchedule(
        drawn.schedule,
        drawn.settings,
        drawn.layout,
        drawn.geometry,
        drawn.regions,
        emptySelection(),
      )
      const drawnPoints = points.map((p) => `${p.x},${p.y}`).join(' ')
      expect(svg).toContain(`points="${drawnPoints}"`)
    },
  )
})

// ===========================================================================
// SWS-5 -- the vertices of the progress line. FR-014, LF-12.
// ===========================================================================

/** A document of two rows: two lanes above, one finished Task below. */
const progressDocument = (over: Readonly<Record<string, unknown>> = {}): Drawn =>
  draw(
    [
      task({ uid: 1, name: 'behind', start: day(2), finish: day(20) }),
      task({ uid: 2, name: 'also behind', start: day(3), finish: day(21) }),
      task({
        uid: 3,
        name: 'done',
        start: day(2),
        finish: day(20),
        actualStart: day(2),
        actualDuration: 5,
        actualFinish: day(6),
      }),
    ],
    ['g1', 'g1', 'g2'],
    [taskVisual(1), taskVisual(2), taskVisual(3)],
    { progressLineVisible: true, ...over },
    day(10),
  )

describe('SWS-5 -- put the vertices of the progress line (FR-014)', () => {
  it(
    swsCase({
      sws: 'SWS-5',
      level: 'Integration',
      covers: ['LF-12'],
      given: 'rows of one and two lanes, one of them carrying a milestone',
      when: 'geometryFromLayout puts the vertices',
      then: 'each lane gets one at its own top plus half the RECTANGLE height, whatever shape sits on it',
    }),
    () => {
      // LF-12: "for each lane, that lane's top plus half the plan height of the
      // RECTANGLE." The note under table T-221 says why it is the rectangle and
      // not the shape actually on the lane: otherwise two lanes of one row put
      // their vertices at different heights.
      const drawn = progressDocument()
      const half = drawn.layout.rectangleHeight / 2
      const lanes = drawn.layout.rows.flatMap((row) => row.stackTops.map((top) => top + half))
      const inner = drawn.geometry.progressLine.slice(1, -1)
      expect(inner.length, 'one vertex per lane').toBe(lanes.length)
      expect([...inner.map((p) => p.y)].sort((a, b) => a - b)).toEqual(
        [...lanes].sort((a, b) => a - b),
      )

      // A milestone stands 1.5 rectangles tall (S-17), so a lane carrying one
      // is where measuring the shape instead of the rectangle would show.
      const withMilestone = draw(
        [task({ uid: 1, name: 'm', start: day(2), finish: day(2), milestone: true })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'milestone', milestoneGlyph: 'diamond' })],
        { progressLineVisible: true },
        day(10),
      )
      const row = rowByIdOf(withMilestone, 'g1')
      expect(row.height, 'the milestone made the band taller than a rectangle').toBeGreaterThan(
        withMilestone.layout.rectangleHeight,
      )
      const vertex = withMilestone.geometry.progressLine[1]
      if (vertex === undefined) throw new Error('the line has no vertex')
      expect(vertex.y).toBeCloseTo(row.y + withMilestone.layout.rectangleHeight / 2, 6)
    },
  )

  it(
    swsCase({
      sws: 'SWS-5',
      level: 'Integration',
      covers: ['LF-12'],
      given: 'a status date, and progressLineOverhang at two values',
      when: 'geometryFromLayout puts the ends of the line',
      then: 'both ends sit on the status date and run past the first and last row by that much',
    }),
    () => {
      // LF-12: "the top and the bottom of the line are at the status date, and
      // they run progressLineOverhang past the top of the first row and the
      // bottom of the last."
      mentions(T221, 'LF-12', 'progressLineOverhang')
      for (const overhang of [6, 25]) {
        const drawn = progressDocument({ progressLineOverhang: overhang })
        const line = drawn.geometry.progressLine
        const top = line[0]
        const bottom = line[line.length - 1]
        const rows = drawn.layout.rows
        const first = rows[0]
        const last = rows[rows.length - 1]
        if (top === undefined || bottom === undefined || first === undefined || last === undefined) {
          throw new Error('the line or the rows came out empty')
        }
        const statusX = xOfDay(10, drawn.regions, drawn.layout.pxPerDay)
        expect(top.x, `overhang ${overhang}`).toBeCloseTo(statusX, 6)
        expect(bottom.x, `overhang ${overhang}`).toBeCloseTo(statusX, 6)
        expect(top.y, `overhang ${overhang}`).toBeCloseTo(first.y - overhang, 6)
        expect(bottom.y, `overhang ${overhang}`).toBeCloseTo(last.y + last.height + overhang, 6)
      }
      // No status date: FR-014 has nothing to draw from, so there is no line.
      const none = progressDocument()
      expect(none.geometry.progressLine.length).toBeGreaterThan(0)
      const unset = draw(
        [task({ uid: 1, name: 'a', start: day(2), finish: day(20) })],
        ['g1'],
        [taskVisual(1)],
        { progressLineVisible: true },
        null,
      )
      expect(unset.geometry.progressLine).toEqual([])
      expect(unset.geometry.statusLine).toBeNull()
    },
  )

  it(
    swsCase({
      sws: 'SWS-5',
      level: 'Integration',
      covers: ['LF-12'],
      given: 'the same two rows stacked upwards and stacked downwards',
      when: 'geometryFromLayout strings the vertices into one line',
      then: 'the line runs from its top end to its bottom end without turning back',
    }),
    () => {
      // FINDING (left failing) for stackDirection 'up', which is the default
      // S-58 states. LF-12 calls the two ends of the line its top and its
      // bottom, and FR-014 asks for one unbroken polyline from the top down to
      // the bottom. ST-5 lets stackDirection put lane 0 at the BOTTOM of the
      // band, and RowPlacement.stackTops then descends in y -- its own comment
      // says so, and warns that a caller drawing through the lanes must visit
      // them by increasing y and not by index.
      //
      // Measured, the vertices come out in lane order, so with the lanes
      // stacked upwards the line goes down, back up, and down again inside a
      // single row. Drawn, that is not a progress line: the two lanes of one
      // row are joined by a segment that runs the wrong way.
      for (const stackDirection of ['down', 'up']) {
        const drawn = progressDocument({ stackDirection })
        const line = drawn.geometry.progressLine
        expect(line.length, `${stackDirection}: the line was not drawn`).toBeGreaterThan(2)
        for (let i = 1; i < line.length; i += 1) {
          const before = line[i - 1]
          const here = line[i]
          if (before === undefined || here === undefined) throw new Error('unreachable')
          expect(
            here.y,
            `${stackDirection}: vertex ${i} at y ${here.y} turns back above ${before.y}`,
          ).toBeGreaterThanOrEqual(before.y)
        }
      }
    },
  )
})

// ===========================================================================
// The file checking itself: every row of the two tables has a case, and every
// declaration is well formed. Table T-219 TW-2 makes Chapter 9's case list a
// generated artifact, and it can only be generated from what is declared here.
// ===========================================================================

describe('coverage of the tables the five SW_SPEC nodes point at', () => {
  it('every row of table T-221 is verified by at least one case', () => {
    const covered = new Set(CASES.flatMap((c) => c.covers))
    for (const row of T221.rows) {
      expect(covered.has(row.id), `table T-221 row ${row.id} has no case`).toBe(true)
    }
  })

  it('every row of table T-222 is verified by at least one case', () => {
    const covered = new Set(CASES.flatMap((c) => c.covers))
    for (const row of T222.rows) {
      expect(covered.has(row.id), `table T-222 row ${row.id} has no case`).toBe(true)
    }
  })

  it('every declared case names a real row, at the level table T-218 gives TS-2', () => {
    const known = new Set([...T221.rows, ...T222.rows].map((r) => r.id))
    expect(CASES.length).toBeGreaterThan(0)
    for (const one of CASES) {
      expect(one.level, `${one.sws}`).toBe('Integration')
      expect(one.covers.length, `${one.sws} covers nothing`).toBeGreaterThan(0)
      for (const id of one.covers) {
        expect(known.has(id), `${one.sws} names ${id}, which is in neither table`).toBe(true)
      }
      for (const [field, text] of [
        ['given', one.given],
        ['when', one.when],
        ['then', one.then],
      ] as ReadonlyArray<readonly [string, string]>) {
        expect(text.length, `${one.sws} has an empty ${field}`).toBeGreaterThan(0)
      }
    }
  })

  it('each of SWS-1 to SWS-5 is taken as a parent by at least one case', () => {
    const parents = new Set(CASES.map((c) => c.sws))
    for (const id of ['SWS-1', 'SWS-2', 'SWS-3', 'SWS-4', 'SWS-5']) {
      expect(parents.has(id as SwsId), `${id} has no case`).toBe(true)
    }
  })
})
