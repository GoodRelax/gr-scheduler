// FR-043 / 表 T-012 -- the not-started dummy's ink follows the actual bar's
// OWN band, not the plan's centre line.
//
// The unit driven is UF-6 `schedule-geometry.ts` (`ScheduleGeometry`, CP-6 of
// table T-062, published as PI-6 of table T-064), function `dummiesOf`.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so this case has no node in
// the specification. Table T-218 of Chapter 7 gives it its place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLE IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// 表 T-012 has SH-3 (`arrow`, `--->`) and SH-4 (`endpointSpan`, `*----*`) push
// their REAL actual bar 「下へずらす」 -- below the plan line, so the plan, the
// actual and the label do not land on the same pixel (LF-7's own note gives
// the reason). `dummiesOf` did not follow: it read `placed.y + placed.planHeight
// / 2` UNCONDITIONALLY for the dummy ink's middle, which is the plan's own
// centre line -- the very place SH-3 / SH-4 keep the REAL actual bar OFF of.
// ⇒ 利用者の申し立て 2026-09-10（不具合 6）: 「`*---*` や `--->` 型タスクの実績の
// ダミーが予定の上にかぶっている。実績のダミーは、予定の下に置け」.
//
// ---------------------------------------------------------------------------
// THE ROWS THIS CASE RESTS ON
// ---------------------------------------------------------------------------
//
//   表 T-012          SH-3 / SH-4's 「実績の置き方」 column: 「下へずらす」
//   FR-043            draws GR-9 / GR-17 while a Task is not started
//   表 T-023d GR-9/17 the two grabs the one drawn mark answers to

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// ---------------------------------------------------------------------------
// The fixture. One `arrow` Task, unstarted, alongside one `rectangle` Task in
// the same state -- the CONTROL that shows the `'inside'` road is untouched.
// ---------------------------------------------------------------------------

/**
 * The four keys SETTINGS_DEFAULTS carries under dotted names, as objects --
 * the same stand-in tests/unit/lf-11-a-milestone-gets-no-resume-icon.test.ts
 * builds.
 */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS: DocumentSettings = ({
  ...SETTINGS_DEFAULTS,
  ...NESTED,
  scrollDate: '2026-01-01',
  scrollGroupId: 'g1',
  stackDirection: 'down',
}) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: false,
    percentComplete: null,
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

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: 10,
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

// Neither Task has started: no `actualStart`, so `placed.actualX` is `null`
// and `dummiesOf` draws its pair (GR-9 / GR-17) for both.
const TASK_ARROW = taskOf({ uid: 1, start: '2026-01-05', finish: '2026-02-05' })
const TASK_RECT = taskOf({ uid: 2, start: '2026-01-05', finish: '2026-02-05' })

const SCHEDULE = scheduleOf({
  tasks: [TASK_ARROW, TASK_RECT],
  taskVisuals: [{ taskUid: 1, shapeKind: 'arrow' }],
  taskGroups: [
    { id: 'g1', parentId: null, label: 'row 1', order: 0, height: null },
    { id: 'g2', parentId: null, label: 'row 2', order: 1, height: null },
  ],
  taskGroupMembers: [
    { groupId: 'g1', taskUid: 1 },
    { groupId: 'g2', taskUid: 2 },
  ],
})

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY: ScheduleGeometry = geometryFromLayout(
  SCHEDULE,
  SETTINGS,
  LAYOUT,
  REGIONS,
  emptySelection(),
)

const placedOf = (uid: number) => {
  const one = LAYOUT.placements.find((each) => each.taskUid === uid)
  if (one === undefined) throw new Error(`no placement for task ${uid}`)
  return one
}

const geometryOf = (uid: number) => {
  const one = GEOMETRY.tasks.find((each) => each.taskUid === uid)
  if (one === undefined) throw new Error(`no geometry for task ${uid}`)
  return one
}

// ---------------------------------------------------------------------------

describe('the fixture both cases stand on', () => {
  it('the arrow is laid BELOW, and the control rectangle is laid INSIDE', () => {
    expect(placedOf(1).shapeKind).toBe('arrow')
    expect(placedOf(1).actualPlacement).toBe('below')
    expect(placedOf(2).shapeKind).toBe('rectangle')
    expect(placedOf(2).actualPlacement).toBe('inside')
    // Neither Task has an actual yet, so both draw the not-started pair.
    expect(placedOf(1).actualX).toBeNull()
    expect(placedOf(2).actualX).toBeNull()
    expect(geometryOf(1).dummies.length).toBe(2)
    expect(geometryOf(2).dummies.length).toBe(2)
  })
})

describe('表 T-012 -- an arrow/endpointSpan dummy sits in the actual band, below the plan', () => {
  it('puts the ink where a STARTED arrow would draw its actual bar (MUST)', () => {
    const placed = placedOf(1)
    const actualHeight = placed.planHeight * SETTINGS.actualOfPlan
    // 表 T-012's own column, read for a STARTED Task by `taskGeometryOf`:
    // `planTop + placed.planHeight + settings.actualGap`. The dummy must land
    // on the very same band once it has begun -- table T-012 and FR-043 have
    // not moved WHERE the actual belongs merely because none is drawn yet.
    const belowTop = placed.y + placed.planHeight + SETTINGS.actualGap

    const ink = geometryOf(1).dummies[0]!.ink
    expect(ink.height).toBeCloseTo(actualHeight, 6)
    expect(ink.y).toBeCloseTo(belowTop, 6)
    // ⛔ THE DEFECT, MADE EXPLICIT: the plan bar occupies
    // [placed.y, placed.y + placed.planHeight). An ink box that starts before
    // that band ends is still overlapping the plan -- which is what 「予定の
    // 上にかぶっている」 reported.
    expect(ink.y).toBeGreaterThanOrEqual(placed.y + placed.planHeight)
  })

  it('centres BOTH grabs (GR-9 and GR-17) on that same lowered band', () => {
    // `DummyGeometry.at` feeds `centreFromLeftEdge` in `svg-renderer.ts`,
    // which takes `at.y` AS ALREADY the ink's own vertical centre (it passes
    // the y through unchanged). Left at the plan's centre line while the ink
    // moved below it, the hover highlight would darken a box the mark was
    // never drawn in.
    const placed = placedOf(1)
    const actualHeight = placed.planHeight * SETTINGS.actualOfPlan
    const belowTop = placed.y + placed.planHeight + SETTINGS.actualGap
    const bandMiddle = belowTop + actualHeight / 2

    const dummies = geometryOf(1).dummies
    expect(dummies.find((one) => one.grab === 'GR-9')?.at.y).toBeCloseTo(bandMiddle, 6)
    expect(dummies.find((one) => one.grab === 'GR-17')?.at.y).toBeCloseTo(bandMiddle, 6)
  })

  it('still centres the CONTROL rectangle on the plan (unchanged, `actualPlacement === "inside"`)', () => {
    const placed = placedOf(2)
    const actualHeight = placed.planHeight * SETTINGS.actualOfPlan
    const planMiddle = placed.y + placed.planHeight / 2

    const ink = geometryOf(2).dummies[0]!.ink
    expect(ink.y).toBeCloseTo(planMiddle - actualHeight / 2, 6)
    expect(geometryOf(2).dummies[0]!.at.y).toBeCloseTo(planMiddle, 6)
  })
})
