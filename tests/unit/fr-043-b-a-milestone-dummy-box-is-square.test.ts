// FR-043 -- a milestone's not-started dummy is drawn in the SAME SQUARE its
// actual figure would use, not in the bar-shape dummies' box.
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
// 利用者の申し立て 2026-09-10（不具合 7）、逐語:
// 「○型マイルストーンの実績ダミーの形状が真円でない。真円にしろ。他のマイルス
// トーンのダミーも予定とアスペクト比を合わせろ」
//
// `docs/spec/01-04-requirements.md` の `FR-043` に同日、次の MUST / MUST NOT が
// 足された（逐語、一度だけここに引く）:
// 「大きさも例外とすること（MUST）。マイルストーンのダミーを描く箱は、そのマイ
// ルストーンの実績の図形と同じ正方形とすること（MUST）。1 日ぶんと `S-180` の
// 小さい方を横幅としてはならない（MUST NOT）」
//
// `dummiesOf` drew EVERY dummy's ink from one shared rectangle --
// `width: Math.min(pxPerDay, S-180)`, `height: actualHeight` -- a box shaped
// for the BAR dummies (GR-9 / GR-17) and never a square. A milestone's real
// actual figure (`taskGeometryOf`'s `'sideways'` arm) is a square of side
// `placed.planHeight * settings.actualOfPlan`, centred on its day -- a circle
// glyph fit to the old box came out an ellipse.
//
// ---------------------------------------------------------------------------
// THE ROWS THIS CASE RESTS ON
// ---------------------------------------------------------------------------
//
//   FR-043            the milestone's third dummy exception (figure, colour,
//                      and now size), quoted above
//   表 T-221 LF-10     the real actual milestone figure: a square of side
//                      `planHeight * actualOfPlan`, centred on its day
//   表 T-023d GR-18    the one grab a milestone's dummy answers to

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  NOT_STORED_DUMMY_SIZES,
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

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

// Not started: no `actualStart`, so `placed.actualX` is `null` and the ONE
// GR-18 dummy is drawn.
const TASK_MILESTONE = taskOf({ uid: 1, milestone: true, start: '2026-01-05', finish: '2026-01-05' })

const SCHEDULE = scheduleOf({
  tasks: [TASK_MILESTONE],
  taskGroups: [{ id: 'g1', parentId: null, label: 'row 1', order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
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

describe('the fixture this case stands on', () => {
  it('is a milestone, not started, drawing its one GR-18 dummy', () => {
    expect(placedOf(1).shapeKind).toBe('milestone')
    expect(placedOf(1).actualPlacement).toBe('sideways')
    expect(placedOf(1).actualX).toBeNull()
    expect(geometryOf(1).dummies.length).toBe(1)
    expect(geometryOf(1).dummies[0]!.grab).toBe('GR-18')
  })
})

describe('FR-043 -- a milestone dummy box is the same square as its actual figure', () => {
  it('is a square (MUST): width equals height', () => {
    const ink = geometryOf(1).dummies[0]!.ink
    expect(ink.width).toBeCloseTo(ink.height, 9)
  })

  it('has the actual milestone figure\'s own side, `planHeight * actualOfPlan` (MUST)', () => {
    // `taskGeometryOf`'s `'sideways'` arm: `const side = placed.planHeight *
    // settings.actualOfPlan` -- the very side FR-043 now asks the dummy box to
    // share, read here from the same two published values rather than copied
    // as a literal.
    const placed = placedOf(1)
    const expectedSide = placed.planHeight * SETTINGS.actualOfPlan

    const ink = geometryOf(1).dummies[0]!.ink
    expect(ink.width).toBeCloseTo(expectedSide, 6)
    expect(ink.height).toBeCloseTo(expectedSide, 6)
  })

  it('does NOT take 1 day\'s pixels or S-180 for its width (MUST NOT)', () => {
    // The bar-shape dummies' own rule (unchanged, GR-9 / GR-17): `min(1 day's
    // pixels, S-180)`. FR-043 now forbids applying that width to a milestone.
    const placed = placedOf(1)
    const barDummyWidth = Math.min(LAYOUT.pxPerDay, NOT_STORED_DUMMY_SIZES['S-180'])
    const expectedSide = placed.planHeight * SETTINGS.actualOfPlan
    // The fixture is only a useful red/green witness while the two differ --
    // guard the assumption rather than let a coincidence pass silently.
    expect(barDummyWidth).not.toBeCloseTo(expectedSide, 3)

    const ink = geometryOf(1).dummies[0]!.ink
    expect(ink.width).not.toBeCloseTo(barDummyWidth, 3)
  })
})
