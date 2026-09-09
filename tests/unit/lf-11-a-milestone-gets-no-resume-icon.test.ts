// LF-11 of table T-221 -- the resume icon is never PLACED on a milestone.
//
// The unit driven is UF-6 `schedule-geometry.ts` (`ScheduleGeometry`, CP-6 of
// table T-062, published as PI-6 of table T-064), with UF-7
// `item-hit-area.ts` (CP-7, PI-7) beside it for the half of the same ruling
// that table T-023d carries.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLE IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// LF-11 gained its milestone clause on 2026-09-09 and nothing asked for it:
// the whole suite -- 7434 cases -- was green on 2026-09-10 with the icon still
// being drawn. ⚠️⚠️ MEASURED ON THE SHIPPED BUILD THAT DAY, 1920 × 1080, one
// day 6px wide: one press on the GR-7 marker of task 9 (a milestone -- its two
// drawn polygons are 42 × 42 and 24 × 24, squares, not bars) put
// `data-figure="task-9-resume"` on the page at (1538, 388, 6.9 × 8px), and a
// press on that figure's own middle answered `grab=-` in FR-102's record.
// ⇒ a mark that can be seen and not grabbed, which is the state LF-11 names
// as its own reason for forbidding the figure (its sentence spells the verb
// with a different character, so it is pointed at here rather than quoted).
// ⭐ The control was measured the same way: task 2, whose plan
// polygon is 1272 × 28, still drew its two resume nodes after one press.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   表 T-221 LF-11  the placing of the marker and the resume icon, and the two
//                   MUST NOTs quoted verbatim on their own lines below
//   表 T-023d GR-8  the grab region, whose own MUST NOT is the other half
//   表 T-023d GR-15 / GR-18  what a milestone's actual DOES carry
//   FR-044          the icon that is drawn while a Task is suspended
//   表 T-019a PS-4  the state 「中断（再開日あり）」 this fixture stands in

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { planActualState } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  NOT_STORED_SIZES,
  itemAtPointer,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
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
// The fixture. Two Tasks in the SAME state, differing only in their shape.
// ---------------------------------------------------------------------------

/**
 * The four keys SETTINGS_DEFAULTS carries under dotted names, as objects --
 * the same stand-in tests/unit/t-023d-double-click-only-rows.test.ts builds.
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
  // S-77 / S-78, pinned so the day-to-x map has an origin and a row is on top.
  scrollDate: '2026-01-01',
  scrollGroupId: 'g1',
  stackDirection: 'down',
  // S-63: FR-044's icon is built inside the marker's own test, so the switch
  // that carries both figures has to be on for this fixture to say anything.
  progressMarkerVisible: true,
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
    milestone: null,
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

/**
 * PS-4 of table T-019a -- 中断（再開日あり）: an actual has begun, no finish is
 * recorded, and a `resume` day is named.
 *
 * ⭐ THE TWO FIXTURES DIFFER IN ONE COLUMN. `milestone` is the only thing that
 * is not the same between them, so a case that separates them is separating
 * them BY SHAPE and by nothing else.
 */
const SUSPENDED = {
  start: '2026-01-05',
  finish: '2026-02-05',
  actualStart: '2026-01-05',
  actualDuration: 6,
  actualFinish: null,
  resume: '2026-01-20',
  resumeValid: null,
} as const

const TASK_BAR = taskOf({ uid: 1, milestone: false, ...SUSPENDED })
const TASK_MILESTONE = taskOf({ uid: 2, milestone: true, ...SUSPENDED })

const SCHEDULE = scheduleOf({
  tasks: [TASK_BAR, TASK_MILESTONE],
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

const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'],
  line: NOT_STORED_SIZES['S-137'],
}

const geometryOf = (uid: number) => {
  const one = GEOMETRY.tasks.find((each) => each.taskUid === uid)
  if (one === undefined) throw new Error(`no geometry for task ${uid}`)
  return one
}

// ---------------------------------------------------------------------------

describe('the fixture both cases stand on', () => {
  it('PS-4 -- both Tasks are 中断（再開日あり）, and differ only in their shape', () => {
    expect(planActualState(TASK_BAR)).toBe('suspendedResumePlanned')
    expect(planActualState(TASK_MILESTONE)).toBe('suspendedResumePlanned')
    expect(geometryOf(1).shapeKind).toBe('rectangle')
    expect(geometryOf(2).shapeKind).toBe('milestone')
    // ⛔ WITHOUT THIS THE FILE COULD PASS VACUOUSLY. FR-044's icon hangs off
    // the marker, and a fixture whose marker was never built would answer
    // `resume: null` for BOTH Tasks for a reason that is not LF-11.
    expect(geometryOf(1).marker).not.toBeNull()
    expect(geometryOf(2).marker).not.toBeNull()
  })
})

describe('表 T-221 LF-11 -- a milestone is given no resume icon', () => {
  it('places none on the milestone (MUST NOT)', () => {
    // 表 T-221 の LF-11（利用者の裁定 2026-09-09、逐語「マイルストーンは再開が無い。」）:
    // 「 **本行が勝つ。**⚠️ **場所の予約は残る** —— **並びの中に空けた `OC-4` のぶんは、何も描かれないまま空いている**（理由は同表の結びが持つ）。⭐⭐ **マイルストーンには再開アイコンを置かないこと（MUST NOT）」
    expect(geometryOf(2).resume).toBeNull()
  })

  it('places none even though this milestone NAMES a resume day (MUST NOT)', () => {
    // 表 T-221 の LF-11、続き:
    // 「こと（MUST NOT）**（利用者の裁定 2026-09-09、逐語「マイルストーンは再開が無い。」） —— **点は期間を持たないので、中断も再開も無い。**⛔ **`resume` を持つマイルストーンでも描かない（MUST NOT）」
    expect(TASK_MILESTONE.resume).not.toBeNull()
    expect(geometryOf(2).resume).toBeNull()
  })

  it('still places one on a BAR in the very same state (FR-044)', () => {
    // ⭐ THE CONTROL -- what would pass if the repair had gone the other
    // way: a repair that
    // simply stopped building the figure would pass the two cases above and
    // take FR-044's icon away from every suspended Task in the document.
    const drawn = geometryOf(1).resume
    expect(drawn).not.toBeNull()
    expect(drawn?.arm.length).toBeGreaterThan(0)
    expect(drawn?.head.length).toBeGreaterThan(0)
  })
})

describe('表 T-023d GR-8 -- and nothing on a milestone answers that row', () => {
  it('answers no GR-8 anywhere across the milestone band (MUST NOT)', () => {
    // 表 T-023d の結び（利用者の裁定 2026-09-09）:
    // 「イルストーンに再開アイコン（`GR-8`）を当ててはならない（MUST NOT）」
    //
    // ⭐ SWEPT RATHER THAN PROBED AT ONE POINT: the icon is no longer placed,
    // so there is no drawn figure to take a coordinate from -- and a case that
    // pressed where it USED to stand would be reading a place the manuscript
    // no longer gives it. The whole width of the milestone's own row band is
    // asked instead, one pixel of every four.
    const at = LAYOUT.rows.find((row) => row.groupId === 'g2')
    expect(at, 'the fixture lost the milestone row').not.toBeUndefined()
    if (at === undefined) throw new Error('unreachable')
    const middle = at.y + at.height / 2
    let asked = 0
    for (let x = Math.round(REGIONS.rowArea.x); x < REGIONS.rowArea.x + REGIONS.rowArea.width; x += 4) {
      const hit = itemAtPointer(GEOMETRY, x, middle, SLOP)
      if (hit === null) continue
      asked += 1
      expect(hit.grab, `GR-8 answered at x=${x} on a milestone`).not.toBe('GR-8')
    }
    expect(asked, 'the sweep crossed nothing at all, so it asked nothing').toBeGreaterThan(0)
  })
})
