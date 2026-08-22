// Unit tests for the layoutEngine units of wave W2.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  dateAtX,
  fitZoom,
  groupDepthLimit,
  layoutFromSchedule,
  rulerTierOf,
  StackSafetyCapReached,
  taskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  geometryFromLayout,
  type BarGeometry,
  type Path,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  itemAtPointer,
  itemsInMarquee,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  regionAtPointer,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// A whole DocumentSettings is 97 keys. A case states the ones it deliberately
// pins -- values chosen to make the sums easy to check -- and every other key
// comes from SETTINGS_DEFAULTS, which is generated from the manuscript
// (CR-175). ⚠️ Before that a case re-typed the specification's own defaults,
// so moving `minShapeWidth` from 2 to 6 changed nothing here and 671 tests
// stayed green while the fixture quietly disagreed with the specification.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * One generated default, read as the number it is. `SETTINGS_DEFAULTS` is
 * published as `Record<string, unknown>`, so the kind is checked here rather
 * than assumed -- a key that stopped being a number would otherwise reach an
 * arithmetic expression as `NaN` and leave the case green for the wrong reason.
 */
const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/** The four (or six) corners of a bar table T-012 draws as an outline. */
const outlinePoints = (bar: BarGeometry | null): Path => {
  if (bar === null || bar.form !== 'outline') throw new Error('this bar is not an outline')
  return bar.points
}

/** The `line` arm of `BarGeometry` -- SH-3's head and SH-4's two ends. */
const lineBar = (bar: BarGeometry | null): Extract<BarGeometry, { form: 'line' }> => {
  if (bar === null || bar.form !== 'line') throw new Error('this bar is not a line')
  return bar
}

/** The five keys regionsFromScreen reads, at values that make the sums easy to check. */
const SETTINGS = settingsOf({
  rulerHeight: 48, // S-2
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

describe('ScreenRegions (PI-35)', () => {
  it('FR-051 caps the measured header at appHeaderMaxHeight', () => {
    const tall = regionsFromScreen({ ...ENV, appHeaderHeight: 80 }, SETTINGS)
    expect(tall.appHeader.height).toBe(56)
    // The canvas takes whatever the capped header leaves.
    expect(tall.scheduleCanvas).toEqual({ x: 0, y: 56, width: 1000, height: 644 })
  })

  it('leaves a header shorter than the cap alone', () => {
    const short = regionsFromScreen({ ...ENV, appHeaderHeight: 40 }, SETTINGS)
    expect(short.appHeader.height).toBe(40)
    expect(short.scheduleCanvas.y).toBe(40)
  })

  it('FR-052 takes the padding, both panels and the vertical scrollbar off the Row Area width', () => {
    // 1000 - 10 padding - 170 titles - 280 properties - 8 scrollbar.
    expect(regionsFromScreen(ENV, SETTINGS).rowArea.width).toBe(532)
  })

  it('U-50 puts the Row Area inside the Row Title Panel and below the ruler band', () => {
    const { rowArea } = regionsFromScreen(ENV, SETTINGS)
    expect(rowArea.x).toBe(170)
    expect(rowArea.y).toBe(56 + 48)
  })

  it('takes the ruler band, the padding and the horizontal scrollbar off the Row Area height', () => {
    // 644 canvas - 48 band - 10 padding - 8 scrollbar.
    expect(regionsFromScreen(ENV, SETTINGS).rowArea.height).toBe(578)
  })

  it('leaves exactly the padding and the scrollbar between the Row Area and what follows it', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    const rightGap = r.propertiesPanel.x - (r.rowArea.x + r.rowArea.width)
    const bottomGap =
      r.scheduleCanvas.y + r.scheduleCanvas.height - (r.rowArea.y + r.rowArea.height)
    expect(rightGap).toBe(10 + 8)
    expect(bottomGap).toBe(10 + 8)
  })

  it('gives the Row Title Panel the whole canvas height, so it owns the corner under the ruler', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(r.rowTitlePanel).toEqual({ x: 0, y: 56, width: 170, height: 644 })
    expect(regionAtPointer(r, 50, 60)).toBe('rowTitlePanel')
  })

  it('SC-2 spans the Time Ruler across the Row Area, not across the panels', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(r.timeRuler).toEqual({ x: 170, y: 56, width: 532, height: 48 })
  })

  it('FR-052 reports a width of zero or less rather than clamping it', () => {
    const wide = settingsOf({ ...SETTINGS, rowTitlePanelWidth: 600, propertyPanelWidth: 400 })
    // 1000 - 10 - 600 - 400 - 8 is negative, and that IS the answer FR-052 tests.
    expect(regionsFromScreen(ENV, wide).rowArea.width).toBeLessThanOrEqual(0)
  })

  it('answers with the innermost region a point falls in', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 200, 200)).toBe('rowArea')
    expect(regionAtPointer(r, 200, 60)).toBe('timeRuler')
    expect(regionAtPointer(r, 50, 200)).toBe('rowTitlePanel')
    expect(regionAtPointer(r, 800, 200)).toBe('propertiesPanel')
    expect(regionAtPointer(r, 500, 10)).toBe('appHeader')
  })

  it('treats every region as half-open, so an edge belongs to what comes next', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    // The Row Area's own corner is inside it.
    expect(regionAtPointer(r, 170, 104)).toBe('rowArea')
    // Its right edge is not: 170 + 532 = 702 falls into the scrollbar lane.
    expect(regionAtPointer(r, 702, 200)).toBe('scheduleCanvas')
  })

  it('falls through to the canvas in the padding and the scrollbar lanes', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 710, 200)).toBe('scheduleCanvas')
    expect(regionAtPointer(r, 400, 690)).toBe('scheduleCanvas')
  })

  it('returns null outside the window', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 1200, 200)).toBeNull()
    expect(regionAtPointer(r, 200, -1)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ScheduleLayout (PI-5) -- table T-068's LC-1 to LC-9.
// ---------------------------------------------------------------------------

/** The keys layoutFromSchedule reads, at their table T-201 / T-205 values. */
const LAYOUT_SETTINGS = settingsOf({
  rulerHeight: 48,
  scrollDate: '2026-01-01', // S-77
  rulerFont: 12, // S-3
  // ⚠️ S-58 defaults to 'up'; these cases pin 'down' so every y below reads
  // from the top of the band. The 'up' half of ST-5 has its own cases.
  stackDirection: 'down', // S-58
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
})

const REGIONS = regionsFromScreen(ENV, LAYOUT_SETTINGS)

// ⚠️ Every nullable column table T-019a reads has to be spelled `null` here.
// Leaving one `undefined` reads as "set" -- `actualFinish` undefined made
// planActualState answer PS-2 for a task that had never finished.
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

// ⚠️ `project` and `calendars` are not optional padding: DR-2 makes both part
// of the schedule group, and FR-054 has layoutFromSchedule resolve the
// document's one calendar through them. Naming no calendar is what sends
// workingCalendarOf to table T-209's default, which is what these cases want.
const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    ...part,
  }) as unknown as Schedule

/** One root row holding the tasks given, each a member of it. */
const oneRow = (tasks: readonly Task[], group: Record<string, unknown> = {}): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null, ...group }],
    taskGroupMembers: tasks.map((t) => ({ groupId: 'g1', taskUid: t.uid })),
  })

/** A task starting on `from` and running `days`. At zoomX 1 one day is 6px. */
const spanning = (uid: number, from: string, days: number, part: Record<string, unknown> = {}): Task => {
  const finish = new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

describe('ScheduleLayout (PI-5) -- the time axis', () => {
  it('FR-017 makes one day pxPerDayAt1x times zoomX', () => {
    expect(layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS).pxPerDay).toBe(6)
    const zoomed = settingsOf({ ...LAYOUT_SETTINGS, zoomX: 3 })
    expect(layoutFromSchedule(oneRow([]), zoomed, REGIONS).pxPerDay).toBe(18)
  })

  it('FR-017 steps the ruler through its four tiers', () => {
    expect(rulerTierOf(1.0, LAYOUT_SETTINGS)).toBe('year')
    expect(rulerTierOf(1.4, LAYOUT_SETTINGS)).toBe('yearMonth')
    expect(rulerTierOf(4.3, LAYOUT_SETTINGS)).toBe('yearMonthWeek')
    expect(rulerTierOf(30, LAYOUT_SETTINGS)).toBe('yearMonthDayWeekday')
  })

  it('FR-017 cancels the text scale first, so the three thresholds stay fixed', () => {
    // At rulerFont 24 the effective scale is 2, so 30px a day only counts as 15.
    const larger = settingsOf({ ...LAYOUT_SETTINGS, rulerFont: 24 })
    expect(rulerTierOf(30, larger)).toBe('yearMonthWeek')
    expect(rulerTierOf(60, larger)).toBe('yearMonthDayWeekday')
  })

  it('S-77 pins the left edge of the Row Area to scrollDate', () => {
    const layout = layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS)
    expect(dateAtX(layout, REGIONS.rowArea.x)).toEqual({ year: 2026, month: 1, day: 1 })
    expect(dateAtX(layout, REGIONS.rowArea.x + 60)).toEqual({ year: 2026, month: 1, day: 11 })
  })

  it('answers null for the day while no origin is set, which is when OP-10 picks one', () => {
    const unset = settingsOf({ ...LAYOUT_SETTINGS, scrollDate: null })
    expect(dateAtX(layoutFromSchedule(oneRow([]), unset, REGIONS), 0)).toBeNull()
  })

  it('reads the axis off the layout it was built from, so x inverts xOfDay exactly', () => {
    // ⚠️ The inverse has to divide by layout.originX. Re-deriving the origin
    // from a ScreenRegions the caller hands in lets a value arrive that the
    // layout was NOT built from, and x -> day then lands on a different day
    // without saying so.
    const layout = layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS)
    const dayAfterOrigin = (days: number): Record<string, number> => {
      const at = new Date(Date.UTC(2026, 0, 1) + days * 86400000)
      return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
    }
    // -1 covers a point LEFT of the origin, which S-77 reaches by scrolling.
    for (const days of [-1, 0, 1, 7, 100]) {
      expect(dateAtX(layout, layout.originX + days * layout.pxPerDay)).toEqual(
        dayAfterOrigin(days),
      )
    }
  })
})

describe('ScheduleLayout (PI-5) -- LC-1 and LC-2', () => {
  const hierarchy = (part: Record<string, unknown>): Schedule =>
    scheduleOf({
      tasks: [spanning(1, '2026-01-01', 10)],
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null, ...part },
        { id: 'g2', parentId: 'g1', order: 0, height: null },
      ],
      taskGroupMembers: [{ groupId: 'g2', taskUid: 1 }],
    })

  it('HR-6 drops a hidden row and everything under it', () => {
    const layout = layoutFromSchedule(hierarchy({ isHidden: true }), LAYOUT_SETTINGS, REGIONS)
    expect(layout.rows).toHaveLength(0)
    expect(layout.placements).toHaveLength(0)
  })

  it('HR-1a drops what a collapsed row holds, without re-parenting it', () => {
    const layout = layoutFromSchedule(hierarchy({ isCollapsed: true }), LAYOUT_SETTINGS, REGIONS)
    expect(layout.rows.map((r) => r.groupId)).toEqual(['g1'])
    // The task sat on g2, so it must not reappear on g1.
    expect(layout.placements).toHaveLength(0)
  })

  it('FR-018 drops the deeper rows as zoomY falls, and never depth 1', () => {
    // threshold(d) = 0.32 x 1.875^(d-2), so depth 4 wants 1.125 and misses at 1.
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 1 }))).toBe(3)
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 1.125 }))).toBe(4)
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 0.32 }))).toBe(2)
    expect(groupDepthLimit(settingsOf({ ...LAYOUT_SETTINGS, zoomY: 0.001 }))).toBe(1)
  })

  it('CR-163 keeps a shape that clears S-86 and drops one that does not', () => {
    // 10 days at 6px is 60; 3 days is 18, under the 24px threshold.
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-02-01', 3)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((p) => p.taskUid)).toEqual([1])
  })

  it('FR-018 draws a zero-duration Task at every zoom, because its width is not a duration', () => {
    // UC-001's extension 2a: ドラッグせずにクリックしたときは開始日と終了日が
    // 同じタスクを作ること（MUST）. FR-018 measures 期間から出た幅 and 幅が期間
    // から出ていない形状を落としてはならない（MUST NOT）-- a zero-duration shape
    // is drawn at S-49's floor, which is not a duration, so it stays (CR-174).
    // ⚠️ 6 < 24, so before CR-174 this Task was dropped at EVERY zoom.
    const schedule = oneRow([spanning(1, '2026-01-01', 0), spanning(2, '2026-02-01', 30)])
    for (const zoomX of [1, 0.5, 0.1, 0.02]) {
      const layout = layoutFromSchedule(schedule, settingsOf({ ...LAYOUT_SETTINGS, zoomX }), REGIONS)
      expect(layout.placements.map((p) => p.taskUid)).toContain(1)
    }
  })

  it('FR-018 still drops a Task that is merely short, so the exemption is not a hole', () => {
    // 3 days at 6px is 18, under the 24px S-86 states. Its width DID come from
    // a duration, so the CR-174 exemption must not reach it.
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-02-01', 3)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((p) => p.taskUid)).toEqual([1])
  })

  it('never draws more as the zoom falls, which is FR-018 without an argument', () => {
    const schedule = oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-02-01', 30)])
    const counts = [1, 0.5, 0.1].map(
      (zoomX) =>
        layoutFromSchedule(schedule, settingsOf({ ...LAYOUT_SETTINGS, zoomX }), REGIONS).placements.length,
    )
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })
})

describe('ScheduleLayout (PI-5) -- LC-8 and LC-9', () => {
  it('ST-10 does not call touching ends an overlap, so a series stays on one lane', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10), spanning(2, '2026-01-11', 10)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((p) => p.stack)).toEqual([0, 0])
    expect(layout.rows[0]!.stackCount).toBe(1)
  })

  it('ST-3 puts an overlapping Task on the next lane down', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((p) => p.stack)).toEqual([0, 1])
  })

  it('ST-2 orders by start, then by the later finish, then by uid', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(9, '2026-01-01', 10), spanning(3, '2026-01-01', 30)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(layout.placements.map((p) => p.taskUid)).toEqual([3, 9])
  })

  it('LF-2 puts stackGap between the lanes and not after the last one', () => {
    const one = layoutFromSchedule(oneRow([spanning(1, '2026-01-01', 20)]), LAYOUT_SETTINGS, REGIONS)
    const two = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // A rectangle reserves basePlanHeight, 28, at zoomY 1.
    expect(one.rows[0]!.height).toBe(28)
    expect(two.rows[0]!.height).toBe(28 + 12 + 28)
  })

  it('ST-5 stacks down from the top of the band, and S-58 up reverses only the y', () => {
    // Lane 0 takes a 28-tall rectangle and lane 1 a 42-tall milestone that
    // overlaps it, so the band is 28 + 12 + 42 = 82 whichever way it stacks --
    // and the reversal has to use each lane's OWN height, not one of them.
    const overlapping = oneRow([
      spanning(1, '2026-01-01', 20),
      taskOf({ uid: 2, start: '2026-01-05', finish: '2026-01-05', milestone: true }),
    ])
    const top = REGIONS.rowArea.y

    const down = layoutFromSchedule(overlapping, LAYOUT_SETTINGS, REGIONS)
    expect(down.rows[0]!.height).toBe(82)
    expect(down.rows[0]!.stackTops).toEqual([top, top + 28 + 12])
    expect(down.placements.map((p) => p.y)).toEqual([top, top + 40])

    const up = layoutFromSchedule(
      overlapping,
      settingsOf({ ...LAYOUT_SETTINGS, stackDirection: 'up' }),
      REGIONS,
    )
    // ST-2 and ST-3 do not read the direction: every Task keeps its lane.
    expect(up.placements.map((p) => p.stack)).toEqual(down.placements.map((p) => p.stack))
    expect(up.rows[0]!.height).toBe(82)
    // Lane 0 is now the lowest, and lane 1 -- the taller -- takes the top.
    expect(up.rows[0]!.stackTops).toEqual([top + 42 + 12, top])
    expect(up.placements.map((p) => p.y)).toEqual([top + 54, top])
  })

  it('LF-3 advances the next row by the band height and rowGap', () => {
    const schedule = scheduleOf({
      tasks: [spanning(1, '2026-01-01', 20)],
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null },
        { id: 'g2', parentId: null, order: 1, height: null },
      ],
      taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
    })
    const layout = layoutFromSchedule(schedule, LAYOUT_SETTINGS, REGIONS)
    expect(layout.rows[1]!.y - layout.rows[0]!.y).toBe(28 + 8)
  })

  it('LF-2 gives an empty row one rectangle lane, so its band does not vanish', () => {
    expect(layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS).rows[0]!.height).toBe(28)
  })

  it('FR-042 reads a stated row height as a floor, never as a cap', () => {
    const tall = layoutFromSchedule(oneRow([], { height: 90 }), LAYOUT_SETTINGS, REGIONS)
    expect(tall.rows[0]!.height).toBe(90)
    const packed = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)], { height: 10 }),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // Two lanes need 68; a stated 10 must not squeeze them out.
    expect(packed.rows[0]!.height).toBe(68)
  })

  it('ST-7 stops rather than truncating or overlapping when the cap is reached', () => {
    const many = Array.from({ length: 4 }, (_, i) => spanning(i + 1, '2026-01-01', 20))
    const capped = settingsOf({ ...LAYOUT_SETTINGS, stackSafetyCap: 2 })
    expect(() => layoutFromSchedule(oneRow(many), capped, REGIONS)).toThrow(StackSafetyCapReached)
  })
})

describe('ScheduleLayout (PI-5) -- labels, shapes and fit', () => {
  it('T-013 keeps a label inside a shape wide enough, and puts it right when not', () => {
    const layout = layoutFromSchedule(
      oneRow([
        spanning(1, '2026-01-01', 60, { name: 'ab' }),
        spanning(2, '2027-01-01', 10, { name: 'a very long name indeed' }),
      ]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(taskPlacement(layout, 1)!.labelPlacement).toBe('inside')
    expect(taskPlacement(layout, 2)!.labelPlacement).toBe('right')
  })

  it('OC-1 counts a label pushed outside toward the occupied width', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 10, { name: 'a very long name indeed' })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    const placed = taskPlacement(layout, 1)!
    expect(placed.occupiedX1).toBeGreaterThan(placed.x + placed.width)
  })

  it('LC-4 cuts a label to truncateUnits before anything measures it', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 60, { name: 'x'.repeat(50) })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    expect(taskPlacement(layout, 1)!.label).toHaveLength(24)
  })

  it('AT-100 resolves a shapeKind of null through Task.milestone', () => {
    const asMilestone = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20, { milestone: true })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    const asBar = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20, { milestone: false })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // shapeHeightOf.milestone is 1.5 against the rectangle's 1.
    expect(asMilestone.placements[0]!.height).toBe(42)
    expect(asBar.placements[0]!.height).toBe(28)
  })

  it('FR-055 scales each axis on its own from the drawn extent', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20, { name: '' })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    const fit = fitZoom(layout, LAYOUT_SETTINGS, REGIONS)
    expect(fit.zoomX).toBeCloseTo(REGIONS.rowArea.width / layout.contentWidth, 6)
    expect(fit.zoomY).toBeCloseTo(REGIONS.rowArea.height / layout.contentHeight, 6)
  })

  it('FR-055 returns to unity when there is no extent to divide by', () => {
    // ⚠️ A row with no Task still draws: LF-2 gives it one rectangle lane. So
    // "nothing drawn" means no rows at all, not an empty row.
    const layout = layoutFromSchedule(scheduleOf({}), LAYOUT_SETTINGS, REGIONS)
    expect(layout.contentHeight).toBe(0)
    // OP-10 (MUST) makes the fit answer the position as well as the scale,
    // so all four of S-75..S-78 are asserted here. With nothing drawn there
    // is no leftmost edge and no top row, and FR-055's empty-document arm
    // hands back what the settings already hold rather than inventing one.
    expect(fitZoom(layout, LAYOUT_SETTINGS, REGIONS)).toEqual({
      zoomX: 1,
      zoomY: 1,
      scrollDate: LAYOUT_SETTINGS.scrollDate,
      scrollGroupId: LAYOUT_SETTINGS.scrollGroupId,
    })
  })

  it('still has an extent when a row holds no Task, because the band is drawn', () => {
    const layout = layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS)
    expect(layout.contentHeight).toBe(28)
  })

  it('FR-055 measures to the RIGHTMOST occupied edge, even when every one is negative', () => {
    // S-77 puts the origin a year after the content, so the whole occupancy
    // sits left of the Row Area. Measuring the right edge from a floor of 0
    // reported the distance to x = 0 instead -- here 2020px for 120px of bar,
    // which would have zoomed the fit out by nearly 17x.
    const scrolled = settingsOf({ ...LAYOUT_SETTINGS, scrollDate: '2027-01-01' })
    const layout = layoutFromSchedule(oneRow([spanning(1, '2026-01-01', 20)]), scrolled, REGIONS)
    expect(taskPlacement(layout, 1)!.occupiedX1).toBeLessThan(0)
    expect(layout.contentWidth).toBeCloseTo(120, 6)
  })

  it('FR-077 carries the drawn type size on the placement, with S-8 applied last', () => {
    const layout = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 60, { name: 'ab' })]),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // A rectangle: 28 x actualOfPlan x fontOfActual = 16.352, clear of S-8.
    expect(taskPlacement(layout, 1)!.labelFontSize).toBeCloseTo(28 * 0.73 * 0.8, 6)

    const thin = layoutFromSchedule(
      scheduleOf({
        tasks: [spanning(2, '2026-01-01', 60, { name: 'ab' })],
        taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
        taskGroupMembers: [{ groupId: 'g1', taskUid: 2 }],
        taskVisuals: [{ taskUid: 2, shapeKind: 'arrow' }],
      }),
      LAYOUT_SETTINGS,
      REGIONS,
    )
    // An arrow is 14 tall, so 14 x 0.73 x 0.8 x thinFontScale is 6.95. FR-094
    // puts S-8's floor on AFTER the thin scale, so the answer is 12, not 6.95.
    expect(taskPlacement(thin, 2)!.labelFontSize).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// ScheduleGeometry (PI-6) -- table T-068's LC-10 and LC-11, and RV-5.
// ---------------------------------------------------------------------------

/** LAYOUT_SETTINGS plus every key LC-10 and LC-11 read, at their table T-201 values. */
const GEOM_SETTINGS = settingsOf({
  ...(LAYOUT_SETTINGS as unknown as Record<string, unknown>),
  progressLineVisible: true, // S-64
})

const geometryOf = (
  schedule: Schedule,
  settings: DocumentSettings = GEOM_SETTINGS,
): ScheduleGeometry =>
  geometryFromLayout(schedule, settings, layoutFromSchedule(schedule, settings, REGIONS), REGIONS)

/** The x of a day index, at pxPerDay 6 from a Row Area starting at 170. */
const xOf = (dayIndex: number): number => REGIONS.rowArea.x + dayIndex * 6

// LF-11 places the marker `markerGap` past the right end of the bar FR-013
// names, as a square of side `markerSize`, so its CENTRE stands this far past
// that end. Read from the generated defaults (S-23 = 4, S-22 = 16) rather than
// re-typed, so moving either value moves these cases with it.
const MARKER_OFFSET = settingNumber('markerGap') + settingNumber('markerSize') / 2

/** One row holding the tasks given, with a shape chosen for each. */
const withVisuals = (tasks: readonly Task[], visuals: readonly Record<string, unknown>[]): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((t) => ({ groupId: 'g1', taskUid: t.uid })),
    taskVisuals: visuals,
  })

describe('ScheduleGeometry (PI-6) -- the shapes of table T-012', () => {
  it('LF-10 centres a milestone on its day and gives it its own plan height', () => {
    // A real milestone has start === finish, so its date span is zero. CR-163
    // measures the SHAPE, which LF-10 makes 28 x 1.5 = 42 wide, clearing S-86.
    const schedule = oneRow([
      taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true }),
    ])
    const geometry = geometryOf(schedule)
    expect(geometry.tasks).toHaveLength(1)
    const points = outlinePoints(geometry.tasks[0]!.plan)
    expect(points).toHaveLength(4)
    const xs = points.map((p) => p.x)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(xOf(10), 6)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(42, 6)
  })

  it('T-012a draws a rectangle as its own four points when no fade is set', () => {
    const geometry = geometryOf(oneRow([spanning(1, '2026-01-01', 20)]))
    const points = outlinePoints(geometry.tasks[0]!.plan)
    expect(points).toHaveLength(4)
    expect(new Set(points.map((p) => p.x))).toEqual(new Set([xOf(0), xOf(20)]))
  })

  it('FD-6 lets fadeIn win and cuts fadeOut to what is left', () => {
    const geometry = geometryOf(
      oneRow([spanning(1, '2026-01-01', 20, { fadeInDays: 15, fadeOutDays: 15 })]),
    )
    const points = outlinePoints(geometry.tasks[0]!.plan)
    // Point 2 is end - fadeOut and point 4 is start + fadeIn. fadeIn takes 15
    // of the 20 days, so fadeOut is cut to the 5 that are left and they meet.
    expect(points[1]!.x).toBeCloseTo(xOf(15), 6)
    expect(points[3]!.x).toBeCloseTo(xOf(15), 6)
  })

  it('FD-6a keeps the fade off the actual bar', () => {
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { fadeInDays: 5, actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    const points = outlinePoints(geometryOf(schedule).tasks[0]!.actual)
    // With no fade the trapezoid is a rectangle: two distinct x, not three.
    expect(new Set(points.map((p) => p.x)).size).toBe(2)
  })

  it('LF-6 derives the actual chevron notch from the plan and does not clamp it twice', () => {
    const schedule = withVisuals(
      [spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 3 })],
      [{ taskUid: 1, shapeKind: 'chevron' }],
    )
    const geometry = geometryOf(schedule)
    const planX = outlinePoints(geometry.tasks[0]!.plan).map((p) => p.x)
    const actualX = outlinePoints(geometry.tasks[0]!.actual).map((p) => p.x)
    // The plan notch is min(120 x 0.35, 28 x 0.45) = 12.6. The actual's is that
    // times actualOfPlan -- NOT min(its own width x 0.35, ...), which would be
    // smaller and would tilt the two slopes apart.
    expect(Math.max(...planX) - planX[1]!).toBeCloseTo(12.6, 6)
    expect(Math.max(...actualX) - actualX[1]!).toBeCloseTo(12.6 * 0.73, 6)
  })

  it('LF-9 centres an actual laid inside and pushes one laid below by actualGap', () => {
    const build = (kind: string): Schedule =>
      withVisuals(
        [spanning(1, '2026-01-01', 40, { actualStart: '2026-01-01', actualDuration: 5 })],
        [{ taskUid: 1, shapeKind: kind }],
      )
    const inside = geometryOf(build('rectangle')).tasks[0]!
    const actualTop = Math.min(...outlinePoints(inside.actual).map((p) => p.y))
    expect(actualTop).toBeCloseTo(REGIONS.rowArea.y + (28 - 28 * 0.73) / 2, 6)

    const below = geometryOf(build('arrow')).tasks[0]!
    const planLine = lineBar(below.plan)
    const actualLine = lineBar(below.actual)
    // An arrow's plan is 28 x 0.5 = 14 tall, so its line runs at 7 from the
    // top; the actual sits 14 + actualGap below that top, on its own centre.
    const planTop = planLine.from.y - 7
    expect(actualLine.from.y - planTop).toBeCloseTo(14 + 2 + (14 * 0.73) / 2, 6)
  })

  it('LF-7 gives an arrow a head and a span two dots', () => {
    const build = (kind: string): Schedule =>
      withVisuals([spanning(1, '2026-01-01', 40)], [{ taskUid: 1, shapeKind: kind }])
    const arrow = lineBar(geometryOf(build('arrow')).tasks[0]!.plan)
    expect(arrow.head).toHaveLength(3)
    expect(arrow.dots).toHaveLength(0)
    const span = lineBar(geometryOf(build('endpointSpan')).tasks[0]!.plan)
    expect(span.head).toBeNull()
    expect(span.dots).toHaveLength(2)
  })
})

describe('ScheduleGeometry (PI-6) -- RV-1, RV-5 and LF-11', () => {
  it('RV-1 counts actualDuration in WORKED days, so a weekend does not shorten the bar', () => {
    // 2026-01-01 is a Thursday. Five worked days from it reaches the 8th, not
    // the 6th -- table T-209 works Monday to Friday.
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    const placed = layoutFromSchedule(schedule, GEOM_SETTINGS, REGIONS).placements[0]!
    expect(placed.actualX).toBeCloseTo(xOf(0), 6)
    expect(placed.actualX! + placed.actualWidth).toBeCloseTo(xOf(7), 6)
  })

  it('holds no actual bar at all while the Task has not started', () => {
    const placed = layoutFromSchedule(
      oneRow([spanning(1, '2026-01-01', 20)]),
      GEOM_SETTINGS,
      REGIONS,
    ).placements[0]!
    expect(placed.actualX).toBeNull()
  })

  it('RV-5 answers table T-021, and PM-4 wins whenever it holds', () => {
    // Read through the marker: table T-064's PI-6 declares two members, and the
    // symbol leaves the component on MarkerGeometry rather than on its own.
    const symbolOf = (part: Record<string, unknown>, statusDate: string | null): string =>
      geometryOf(
        scheduleOf({
          project: { calendarUid: null, statusDate },
          tasks: [spanning(1, '2026-01-01', 20, part)],
          taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
          taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
        }),
      ).tasks[0]!.marker!.symbol

    expect(symbolOf({}, '2026-06-01')).toBe('PM-4')
    expect(symbolOf({}, null)).toBe('PM-1a')
    expect(symbolOf({ actualStart: '2026-01-01', actualFinish: '2026-01-21' }, null)).toBe('PM-2')
    expect(symbolOf({ actualStart: '2026-01-01', resumeValid: false }, null)).toBe('PM-3')
    expect(symbolOf({ actualStart: '2026-01-01' }, null)).toBe('PM-1')
  })

  it('LF-11 puts the marker markerGap past the ACTUAL bar, on the plan bar centre', () => {
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    const marker = geometryOf(schedule).tasks[0]!.marker!
    // FR-013: 実績バーの右端の外側に進捗マーカーを出し -- the marker hangs off
    // the ACTUAL bar. ⛔ Not "the rightmost bar": FR-013 names exactly one
    // exception, 予定だけを表示しているとき, and this Task shows both bars.
    // Five worked days from Thursday 2026-01-01 end the actual at day 7 (RV-1)
    // while the plan runs to day 20, so the two candidates are 78px apart and
    // the case can tell them apart.
    expect(marker.centre.x).toBeCloseTo(xOf(7) + MARKER_OFFSET, 6)
    // LF-11: 縦は予定バーの中心 -- the plan's centre, not the actual's.
    expect(marker.centre.y).toBeCloseTo(REGIONS.rowArea.y + 14, 6)
    // LF-11: markerSize を一辺とする正方形.
    expect(marker.radius).toBe(settingNumber('markerSize') / 2)
  })

  it('FR-013 moves the marker to the plan bar when only the plan is displayed', () => {
    // 予定だけを表示しているときは、予定バーの右端の外側に出すこと（MUST）--
    // the one exception FR-013 names, keyed on S-59, and the same form as
    // FR-009's 予定を表示していないときに限り、実績の幾何に付ける.
    const planOnly = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      planActualDisplay: 'plan-only', // S-59
    })
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 5 }),
    ])
    expect(geometryOf(schedule, planOnly).tasks[0]!.marker!.centre.x).toBeCloseTo(
      xOf(20) + MARKER_OFFSET,
      6,
    )
  })

  it('GR-7 hangs the marker off the end-point dummy while nothing is started', () => {
    // 実績バーの右端の外側。未着手のときは終了点の掴みシロの外側 -- a Task not
    // started has no actual bar, so FR-043's GR-17 stands in for its right end
    // and the marker leaves the plan's own right end alone.
    const fresh = geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).tasks[0]!
    expect(fresh.marker!.centre.x).toBeCloseTo(fresh.dummies[1]!.at.x + MARKER_OFFSET, 6)
    expect(fresh.marker!.centre.x).toBeCloseTo(xOf(1) + MARKER_OFFSET, 6)
  })

  it('GR-7 keeps a milestone on its figure, which has no GR-17 to follow', () => {
    // マイルストーンのときは図形の外側. GR-15 gives it no actual bar and so no
    // end-point dummy either; LF-10 already makes the plan figure's right edge
    // the outside of the figure.
    const milestone = geometryOf(
      oneRow([taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true })]),
    ).tasks[0]!
    expect(milestone.dummies.map((one) => one.grab)).toEqual(['GR-18'])
    // The figure is 42 across and centred on day 10, so its right edge is at 21.
    expect(milestone.marker!.centre.x).toBeCloseTo(xOf(10) + 21 + MARKER_OFFSET, 6)
  })

  it('S-63 takes the marker away', () => {
    const hidden = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      progressMarkerVisible: false,
    })
    expect(geometryOf(oneRow([spanning(1, '2026-01-01', 20)]), hidden).tasks[0]!.marker).toBeNull()
  })

  it('FR-044 draws the resume icon on a suspended Task only', () => {
    const suspended = oneRow([
      spanning(1, '2026-01-01', 20, {
        actualStart: '2026-01-01',
        actualDuration: 2,
        resumeValid: false,
      }),
    ])
    expect(geometryOf(suspended).tasks[0]!.resume).not.toBeNull()
    const running = oneRow([
      spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 2 }),
    ])
    expect(geometryOf(running).tasks[0]!.resume).toBeNull()
  })

  it('FR-043 draws both dummies while nothing is started, and none once it is', () => {
    const fresh = geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).tasks[0]!
    expect(fresh.dummies.map((one) => one.grab)).toEqual(['GR-9', 'GR-17'])
    // S-129 is ONE worked day, and 2026-01-01 is a Thursday, so GR-17 lands on
    // the Friday -- one day along rather than on a day nobody works.
    expect(fresh.dummies[1]!.at.x).toBeCloseTo(xOf(1), 6)
    const started = geometryOf(
      oneRow([spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualDuration: 1 })]),
    ).tasks[0]!
    expect(started.dummies).toHaveLength(0)
  })
})

describe('ScheduleGeometry (PI-6) -- LC-10, the routes of table T-222', () => {
  /** Three Tasks on one row -- 1 and 2 overlap, so they take separate lanes. */
  const linked = (linkType: number, predecessor: number, successor: number): Schedule => {
    const tasks = [
      spanning(1, '2026-01-01', 20), // lane 0
      spanning(2, '2026-01-05', 20), // overlaps 1, so lane 1
      spanning(3, '2026-03-01', 20), // clear of both, so lane 0
    ].map((task) =>
      task.uid === successor
        ? taskOf({
            ...(task as unknown as Record<string, unknown>),
            dependencies: [{ predecessorUid: predecessor, linkType }],
          })
        : task,
    )
    return oneRow(tasks)
  }

  it('RP-1 draws one horizontal line when the lane is shared and the gap clears the entry run', () => {
    const route = geometryOf(linked(1, 1, 3)).dependencies[0]!
    expect(route.pattern).toBe('RP-1')
    expect(route.points).toHaveLength(2)
    expect(route.points[0]!.y).toBeCloseTo(route.points[1]!.y, 6)
  })

  it('RP-3 folds at a midpoint held inside x1 and x2 when the lanes differ', () => {
    const route = geometryOf(linked(1, 2, 3)).dependencies[0]!
    expect(route.pattern).toBe('RP-3')
    expect(route.points).toHaveLength(4) // 2 bends
    expect(route.points[1]!.x).toBeCloseTo(route.points[2]!.x, 6)
  })

  it('RP-4 takes a backwards dependency on one lane out through the corridor', () => {
    const route = geometryOf(linked(1, 3, 1)).dependencies[0]!
    expect(route.pattern).toBe('RP-4')
    expect(route.points).toHaveLength(6) // 4 bends
  })

  it('the same-side family turns back once and never draws 0 bends', () => {
    const route = geometryOf(linked(0, 2, 3)).dependencies[0]! // FF
    expect(route.pattern).toBe('RP-7')
    expect(route.points).toHaveLength(4)
    // Both runs leave by the right edge, so the turn-back is right of both.
    expect(route.points[1]!.x).toBeGreaterThan(route.points[0]!.x)
    expect(route.points[2]!.x).toBeGreaterThan(route.points[3]!.x)
  })

  it('RP-8 uses two verticals when a same-side pair shares a lane', () => {
    const route = geometryOf(linked(0, 1, 3)).dependencies[0]! // FF, one lane
    expect(route.pattern).toBe('RP-8')
    expect(route.points).toHaveLength(6)
  })

  it('mirrors x for SS rather than holding a second set of rules', () => {
    const forward = geometryOf(linked(0, 2, 3)).dependencies[0]! // FF, exits right
    const mirrored = geometryOf(linked(3, 2, 3)).dependencies[0]! // SS, exits left
    expect(mirrored.pattern).toBe(forward.pattern)
    // Every run leaves by the LEFT edge now, so the turn-back is left of both.
    expect(mirrored.points[1]!.x).toBeLessThan(mirrored.points[0]!.x)
    expect(mirrored.points[2]!.x).toBeLessThan(mirrored.points[3]!.x)
  })

  it('RT-4a draws nothing when either end is not on screen', () => {
    const zoomedOut = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      zoomX: 0.05,
    })
    expect(geometryOf(linked(1, 2, 3), zoomedOut).dependencies).toHaveLength(0)
  })

  it('S-62 takes every dependency line away', () => {
    const hidden = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      dependencyVisible: false,
    })
    expect(geometryOf(linked(1, 1, 3), hidden).dependencies).toHaveLength(0)
  })
})

describe('ScheduleGeometry (PI-6) -- FR-014 and LF-12', () => {
  const withStatus = (tasks: readonly Task[], statusDate: string): Schedule =>
    scheduleOf({
      project: { calendarUid: null, statusDate },
      tasks,
      taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
      taskGroupMembers: tasks.map((t) => ({ groupId: 'g1', taskUid: t.uid })),
    })

  it('runs one unbroken line, one vertex per lane, from above the first row to below the last', () => {
    const schedule = withStatus(
      [spanning(1, '2026-01-01', 20), spanning(2, '2026-01-05', 20)],
      '2026-02-01',
    )
    const line = geometryOf(schedule).progressLine
    // Two lanes, plus the entry above and the exit below.
    expect(line).toHaveLength(4)
    expect(line[0]!.y).toBeCloseTo(REGIONS.rowArea.y - 6, 6)
    expect(line[0]!.x).toBeCloseTo(xOf(31), 6)
    // LF-12 puts each vertex half a RECTANGLE's height below its lane's top.
    expect(line[1]!.y).toBeCloseTo(REGIONS.rowArea.y + 14, 6)
  })

  it('PL-4 marks a Task not started whose start has gone by; PL-1 leaves a finished one alone', () => {
    const late = geometryOf(withStatus([spanning(1, '2026-01-01', 20)], '2026-02-01')).progressLine
    expect(late[1]!.x).toBeCloseTo(xOf(0), 6) // its own start
    const done = geometryOf(
      withStatus(
        [spanning(1, '2026-01-01', 20, { actualStart: '2026-01-01', actualFinish: '2026-01-21' })],
        '2026-02-01',
      ),
    ).progressLine
    // No vertex, so that lane passes through the status date and the line holds.
    expect(done[1]!.x).toBeCloseTo(xOf(31), 6)
  })

  it('S-64 and an unset status date each take the line away', () => {
    const hidden = settingsOf({
      ...(GEOM_SETTINGS as unknown as Record<string, unknown>),
      progressLineVisible: false,
    })
    expect(
      geometryOf(withStatus([spanning(1, '2026-01-01', 20)], '2026-02-01'), hidden).progressLine,
    ).toHaveLength(0)
    expect(geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).progressLine).toHaveLength(0)
    expect(geometryOf(oneRow([spanning(1, '2026-01-01', 20)])).statusLine).toBeNull()
  })
})

describe('ScheduleGeometry (PI-6) -- table T-020a, GR-10 and FR-019', () => {
  const asMilestone = (part: Record<string, unknown>): Schedule =>
    oneRow([taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true, ...part })])

  it('GD-4 judges a milestone on its DAY, having no notion of overlap', () => {
    // The two figures are 42 and 30 across and one day -- 6px -- apart, so they
    // overlap heavily. GD-1's overlap gate would leave this row unable to fire.
    const apart = geometryOf(asMilestone({ actualStart: '2026-01-12' })).tasks[0]!
    expect(apart.guides).toHaveLength(1)
    expect(apart.guides[0]![0]!.x).toBeCloseTo(xOf(11), 6)
    expect(apart.guides[0]![1]!.x).toBeCloseTo(xOf(10), 6)
    const together = geometryOf(asMilestone({ actualStart: '2026-01-11' })).tasks[0]!
    expect(together.guides).toHaveLength(0)
  })

  it('GD-2 draws two lines once the two bars have come apart, and none while they meet', () => {
    const apart = geometryOf(
      oneRow([spanning(1, '2026-01-01', 5, { actualStart: '2026-02-02', actualDuration: 3 })]),
    ).tasks[0]!
    expect(apart.guides).toHaveLength(2)
    const overlapping = geometryOf(
      oneRow([spanning(1, '2026-01-01', 20, { actualStart: '2026-01-05', actualDuration: 3 })]),
    ).tasks[0]!
    expect(overlapping.guides).toHaveLength(0)
  })

  it('GR-10 takes the label font LC-6 stored rather than deriving it a second time', () => {
    // An arrow's plan bar is 14 tall, so planHeight x actualOfPlan x fontOfActual
    // is 8.176 -- under S-8. FR-094 applies the text floor SEPARATELY and has
    // S-9 multiply the thin shapes, which is the value LC-5 measured with.
    const schedule = withVisuals(
      [spanning(1, '2026-01-01', 5, { name: 'a'.repeat(40) })],
      [{ taskUid: 1, shapeKind: 'arrow' }],
    )
    const placed = layoutFromSchedule(schedule, GEOM_SETTINGS, REGIONS).placements[0]!
    const label = geometryOf(schedule).tasks[0]!.label!
    expect(placed.labelPlacement).toBe('right')
    expect(label.height).toBe(placed.labelFontSize)
    expect(label.height).toBe(12)
  })

  it('FR-019 encloses both rows when the range names the top one below the bottom', () => {
    const schedule = scheduleOf({
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null },
        { id: 'g2', parentId: null, order: 1, height: null },
      ],
      highlightBoxes: [
        {
          id: 'h1',
          startDate: '2026-01-11',
          endDate: '2026-01-01',
          topGroupId: 'g2',
          bottomGroupId: 'g1',
          strokeColor: null,
          cornerRadiusPx: null,
        },
      ],
    })
    const rows = layoutFromSchedule(schedule, GEOM_SETTINGS, REGIONS).rows
    const box = geometryOf(schedule).highlightBoxes[0]!.box
    // Both axes read both edges: the range is inverted on each, and the last
    // row of it has to stay inside the box.
    expect(box.x).toBeCloseTo(xOf(0), 6)
    expect(box.x + box.width).toBeCloseTo(xOf(10), 6)
    expect(box.y).toBeCloseTo(rows[0]!.y, 6)
    expect(box.y + box.height).toBeCloseTo(rows[1]!.y + rows[1]!.height, 6)
  })
})

// ---------------------------------------------------------------------------
// ItemHitArea (PI-7) -- table T-023d's order, and SL-3.
// ---------------------------------------------------------------------------

describe('ItemHitArea (PI-7)', () => {
  // ⚠️ itemAtPointer takes the slop as an argument and ships no default, the
  // same way EditHistory takes S-94 / S-95: table T-206 keeps these values out
  // of the document because they belong to the reader's environment. So the
  // cases below state them, at the numbers table T-206 records.
  const SLOP: PointerSlop = {
    planEndpoint: 6, // S-90 -- 6px above and below the plan bar
    actualEndpoint: 6, // S-91 -- the actual bar's own band
    fadeHandle: 7.5, // S-92 -- half of the 15 x 15 square
    dummyWidth: 30, // S-93 -- 30 x 20
    dummyHeight: 20, // S-93
    // ⛔ No row of table T-206 states this one, and no other table does either:
    // GR-13 and GR-16 give the place as 線の上 and stop. The value here is the
    // test's own, chosen so a probe sitting exactly ON the line answers.
    line: 4,
  }
  const oneTask = (part: Record<string, unknown> = {}): ScheduleGeometry =>
    geometryOf(oneRow([spanning(1, '2026-01-01', 20, part)]))
  const middleY = REGIONS.rowArea.y + 14

  it('GR-12 answers the plan bar body', () => {
    expect(itemAtPointer(oneTask(), xOf(10), middleY, SLOP)).toEqual({
      item: { kind: 'task', taskUid: 1 },
      grab: 'GR-12',
    })
  })

  it('GR-3 and GR-4 beat GR-12 at the two ends', () => {
    const geometry = oneTask()
    expect(itemAtPointer(geometry, xOf(0), middleY, SLOP)?.grab).toBe('GR-3')
    expect(itemAtPointer(geometry, xOf(20), middleY, SLOP)?.grab).toBe('GR-4')
  })

  it('S-90 reaches past the top and the bottom of the bar', () => {
    const geometry = oneTask()
    expect(itemAtPointer(geometry, xOf(10), REGIONS.rowArea.y - 4, SLOP)?.grab).toBe('GR-12')
    expect(itemAtPointer(geometry, xOf(10), REGIONS.rowArea.y - 9, SLOP)).toBeNull()
  })

  it('GR-5 takes the actual start, and the actual BODY is not a grab area at all', () => {
    // 2026-01-05 is a Monday, so five worked days reach the 10th: x 194 to 230.
    const geometry = oneTask({ actualStart: '2026-01-05', actualDuration: 5 })
    expect(itemAtPointer(geometry, xOf(4), middleY, SLOP)?.grab).toBe('GR-5')
    // The MIDDLE of the actual bar answers GR-12: the plan is the taller of the
    // two, so where they overlap the plan is what is picked up.
    expect(itemAtPointer(geometry, xOf(7), middleY, SLOP)?.grab).toBe('GR-12')
  })

  it('GR-7 takes the marker markerGap outside the ACTUAL bar, over the plan body', () => {
    // GR-7: 進捗マーカー -- 実績バーの右端の外側. ⛔ Outside the ACTUAL bar,
    // which is not "outside every bar": the actual ends at day 7 while the plan
    // runs to day 20, so the marker lands ON the plan bar. GR-7 stands above
    // GR-12 in table T-023d, so the marker wins there anyway.
    const running = oneTask({ actualStart: '2026-01-01', actualDuration: 5 })
    expect(itemAtPointer(running, xOf(7) + MARKER_OFFSET, middleY, SLOP)?.grab).toBe('GR-7')
    // A whole markerSize further along the same plan body -- clear of the
    // square -- GR-12 answers, which is what makes the line above a real win.
    expect(
      itemAtPointer(running, xOf(7) + MARKER_OFFSET + settingNumber('markerSize'), middleY, SLOP)
        ?.grab,
    ).toBe('GR-12')
  })

  it('GR-7 follows the end-point dummy while the Task is not started', () => {
    // 未着手のときは終了点の掴みシロの外側: the marker leaves the plan's right
    // end and joins the two faint dummies at the head of the bar.
    expect(itemAtPointer(oneTask(), xOf(1) + MARKER_OFFSET, middleY, SLOP)?.grab).toBe('GR-7')
  })

  it('GR-9 beats GR-17 where the two dummies overlap', () => {
    // Both are 30 x 20 and one worked day apart -- 6px here -- so they do. The
    // probe stands clear of GR-3, which is above BOTH of them in the table and
    // would otherwise win at the plan's own start, and clear of GR-7, which
    // GR-7's own 未着手 clause has just brought within 8px of GR-17.
    expect(itemAtPointer(oneTask(), xOf(0) + 8, middleY, SLOP)?.grab).toBe('GR-9')
  })

  it('holds table T-023d order ACROSS Tasks, not within one', () => {
    // Two Tasks on ONE lane. Task 1's plan stops at day 15 but its actual runs
    // on to day 20 -- 14 worked days from Thursday 2026-01-01 (RV-1) -- and
    // Task 2 starts on day 20, which ST-10 does not call an overlap. GR-7 hangs
    // the marker off the ACTUAL bar's right end (FR-013), and OC-3 keeps it out
    // of the occupancy, so Task 1's marker lands inside Task 2's BODY. GR-7 is
    // above GR-12 in table T-023d, so it wins -- walking Task by Task instead
    // would answer GR-12 whenever Task 2 was reached first.
    // ⚠️ Task 1 is under way on purpose: 未着手 would send GR-7 back to the
    // end-point dummy at Task 1's own head, and the two Tasks would not meet.
    const geometry = geometryOf(
      oneRow([
        spanning(1, '2026-01-01', 15, { actualStart: '2026-01-01', actualDuration: 14 }),
        spanning(2, '2026-01-21', 20),
      ]),
    )
    // Day 20 is the actual's right end, not the plan's, which stopped at 15.
    expect(geometry.tasks[0]!.marker!.centre.x).toBeCloseTo(xOf(20) + MARKER_OFFSET, 6)
    expect(itemAtPointer(geometry, xOf(20) + MARKER_OFFSET, middleY, SLOP)?.grab).toBe('GR-7')
  })

  it('GR-13 takes a dependency line where it runs clear of the bars', () => {
    const schedule = oneRow([
      spanning(1, '2026-01-01', 20),
      taskOf({
        uid: 3,
        start: '2026-03-01',
        finish: '2026-03-21',
        dependencies: [{ predecessorUid: 1, linkType: 1 }],
      }),
    ])
    const geometry = geometryOf(schedule)
    const line = geometry.dependencies[0]!
    const between = (line.points[0]!.x + line.points[1]!.x) / 2
    expect(itemAtPointer(geometry, between, line.points[0]!.y, SLOP)?.item).toEqual({
      kind: 'dependency',
      predecessorUid: 1,
      successorUid: 3,
    })
  })

  it('answers null off everything', () => {
    expect(itemAtPointer(oneTask(), xOf(200), REGIONS.rowArea.y + 400, SLOP)).toBeNull()
  })

  it('SL-3 takes what the rectangle wholly encloses and leaves what it merely touches', () => {
    const geometry = oneTask()
    expect(itemsInMarquee(geometry, { x: 0, y: 0, width: 2000, height: 2000 })).toEqual([
      { kind: 'task', taskUid: 1 },
    ])
    // Cutting the bar in half touches it, which SL-3 forbids counting.
    expect(itemsInMarquee(geometry, { x: 0, y: 0, width: xOf(10), height: 2000 })).toEqual([])
  })

  it('SL-1 keeps the status line out of a marquee but leaves GR-16 answering', () => {
    const schedule = scheduleOf({
      project: { calendarUid: null, statusDate: '2026-06-01' },
      tasks: [spanning(1, '2026-01-01', 20)],
      taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
      taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
    })
    const geometry = geometryOf(schedule)
    expect(geometry.statusLine).not.toBeNull()
    const taken = itemsInMarquee(geometry, { x: 0, y: 0, width: 4000, height: 4000 })
    expect(taken.every((one) => one.kind !== 'statusLine')).toBe(true)
    expect(itemAtPointer(geometry, geometry.statusLine!.x, REGIONS.rowArea.y + 200, SLOP)?.grab).toBe(
      'GR-16',
    )
  })
})
