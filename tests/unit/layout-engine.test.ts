// Unit tests for the layoutEngine units of wave W2.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.

import { describe, expect, it } from 'vitest'

import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
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
  regionAtPointer,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// A whole DocumentSettings is 97 keys; regionsFromScreen reads five of them, so
// the cases below carry only those. Same idiom as document-model.test.ts.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  part as unknown as DocumentSettings

/** The five keys regionsFromScreen reads, at values that make the sums easy to check. */
const SETTINGS = settingsOf({
  appHeaderMaxHeight: 56, // S-116
  rowTitlePanelWidth: 170, // S-79
  propertyPanelWidth: 280, // S-80
  rulerHeight: 48, // S-2
  canvasPadding: 10, // S-56
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
  appHeaderMaxHeight: 56,
  rowTitlePanelWidth: 170,
  propertyPanelWidth: 280,
  rulerHeight: 48,
  canvasPadding: 10,
  pxPerDayAt1x: 6, // S-1
  zoomX: 1,
  zoomY: 1, // S-75 / S-76
  scrollDate: '2026-01-01', // S-77
  maxGroupDepth: 5, // S-125
  groupLevelOfDetailBase: 0.32, // S-87
  groupLevelOfDetailRatio: 1.875, // S-88
  taskLevelOfDetailReadablePx: 24, // S-86
  rulerTierPxPerDayMonth: 1.4, // S-83
  rulerTierPxPerDayWeek: 4.3, // S-84
  rulerTierPxPerDayDay: 30, // S-85
  rulerFont: 12, // S-3
  fontMin: 12, // S-8
  fontOfActual: 0.8, // S-7
  truncateUnits: 24, // S-35
  labelCoef: 0.5, // S-30
  labelGap: 8, // S-32
  basePlanHeight: 28, // S-4
  actualMin: 16, // S-6
  actualOfPlan: 0.73, // S-5
  actualGap: 2, // S-10
  stackGap: 12, // S-11
  rowGap: 8, // S-12
  stackSafetyCap: 255, // S-89
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
})

const REGIONS = regionsFromScreen(ENV, LAYOUT_SETTINGS)

const taskOf = (part: Record<string, unknown>): Task =>
  ({ name: null, start: null, finish: null, milestone: null, ...part }) as unknown as Task

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({ tasks: [], taskGroups: [], taskGroupMembers: [], taskVisuals: [], ...part }) as unknown as Schedule

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
    expect(dateAtX(layout, REGIONS, REGIONS.rowArea.x)).toEqual({ year: 2026, month: 1, day: 1 })
    expect(dateAtX(layout, REGIONS, REGIONS.rowArea.x + 60)).toEqual({ year: 2026, month: 1, day: 11 })
  })

  it('answers null for the day while no origin is set, which is when OP-10 picks one', () => {
    const unset = settingsOf({ ...LAYOUT_SETTINGS, scrollDate: null })
    expect(dateAtX(layoutFromSchedule(oneRow([]), unset, REGIONS), REGIONS, 0)).toBeNull()
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
    expect(fitZoom(layout, LAYOUT_SETTINGS, REGIONS)).toEqual({ zoomX: 1, zoomY: 1 })
  })

  it('still has an extent when a row holds no Task, because the band is drawn', () => {
    const layout = layoutFromSchedule(oneRow([]), LAYOUT_SETTINGS, REGIONS)
    expect(layout.contentHeight).toBe(28)
  })
})
