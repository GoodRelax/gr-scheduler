// CR-421: the actual dummy is min(marker diameter x S-247, S-180) wide, and the marker touches the actual or dummy with no gap.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, displayRatioAt } from '../fixtures/display-scale'

// see T-201, T-206
const firstNumber = (table: string, id: string, column: string): number => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by[column] ?? '').replace(/`/g, ''))
  if (found === null) throw new Error(`table ${table} row ${id} column ${column} holds no number`)
  return Number(found[0])
}

const S_22 = firstNumber('T-201', 'S-22', '既定値')
const S_23 = firstNumber('T-201', 'S-23', '既定値')
const S_180 = firstNumber('T-206', 'S-180', '既定')
const S_247 = firstNumber('T-206', 'S-247', '既定')
const LOWEST_SCALE = DISPLAY_SCALE_STEPS[0]!
const HIGHEST_SCALE = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!
const EPS = 1e-6

const DM_3_WIDTH =
  '⭐ ダミーを描く幅は、そのタスクの進捗マーカーの径に `_assets/tbl-settings.md` の 表 T-206 の `S-247` を掛けた幅と、同表の `S-180` の小さい方とすること（MUST）'
const DM_3_LEFT_EDGE = '表 T-012 の `SH-3` / `SH-4` では `FR-094` が名称ラベルの字から導く値である。日の列の左端に揃えること（MUST）'
const DM_3_NOT_ONE_DAY = '日の列の左端に揃えること（MUST）。⛔ 1 日ぶんの幅で印の幅を切ってはならない（MUST NOT）'
const DM_9_SQUARE =
  'マイルストーンのダミーを描く箱は、そのマイルストーンの実績の図形と同じ正方形とすること（MUST）。`DM-3` の幅を横幅としてはならない（MUST NOT）'
const FR_013_NO_GAP = '⛔ 実績バーの右端と進捗マーカーのあいだに隙間を空けてはならない（MUST NOT）'
const T_023D_NO_WIDER_BOX = '⛔ ダミーの当たり判定を、描いた印より広い箱で取ってはならない（MUST NOT）'
const T_023D_MARKER_FIRST =
  '⭐ 進捗マーカー（`GR-7`）の描いた形の上では、予定の端点（`GR-1` / `GR-2` / `GR-3` / `GR-4`）の掴み代と予定バー本体（`GR-12`）より先に、`GR-7` を成立させること（MUST）'

// see T-252
const nestedDefaults = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = key.split('.')
    let into = out
    for (const step of path.slice(0, -1)) {
      into[step] = { ...((into[step] as Record<string, unknown> | undefined) ?? {}) }
      into = into[step] as Record<string, unknown>
    }
    into[path[path.length - 1]!] = value
  }
  return out
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...nestedDefaults(),
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    assigneeVisible: false,
    percentCompleteVisible: false,
    displayScale: DEFAULT_DISPLAY_SCALE,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 2400, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }

const isoPlus = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)

const taskOf = (part: Record<string, unknown>): Task =>
  ({
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
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    ...part,
  }) as unknown as Task

const scheduleOf = (task: Task, shapeKind: string): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: [task],
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: [{ groupId: 'g1', taskUid: task.uid }],
    taskVisuals: [{ taskUid: task.uid, shapeKind }],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

interface Scene {
  readonly placed: TaskPlacement
  readonly drawn: TaskGeometry
  readonly geometry: ScheduleGeometry
}

const sceneOf = (task: Task, part: Record<string, unknown> = {}, shapeKind = 'rectangle'): Scene => {
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENV, settings)
  const schedule = scheduleOf(task, shapeKind)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const placed = taskPlacement(layout, task.uid)
  if (placed === null) throw new Error('the task was not placed')
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  const drawn = geometry.tasks.find((one) => one.taskUid === task.uid)
  if (drawn === undefined) throw new Error('the task was not drawn')
  return { placed, drawn, geometry }
}

const PLAN_START = '2026-02-02'

const unstarted = (planDays = 30): Task =>
  taskOf({ name: 'a', start: PLAN_START, finish: isoPlus(PLAN_START, planDays) })

const started = (planDays: number, actualDays: number): Task =>
  taskOf({
    name: 'a',
    start: PLAN_START,
    finish: isoPlus(PLAN_START, planDays),
    percentComplete: 40,
    actualStart: PLAN_START,
    stop: isoPlus(PLAN_START, actualDays),
    resumeValid: true,
  })

const inkOf = (scene: Scene) => {
  const dummy = scene.drawn.dummies.find((one) => one.grab === 'GR-9' || one.grab === 'GR-17')
  if (dummy === undefined) throw new Error('premise: a bar dummy is drawn for the task not started')
  return dummy.ink
}

const markerLeft = (scene: Scene): number => scene.drawn.marker!.centre.x - scene.drawn.marker!.radius
const markerRight = (scene: Scene): number => scene.drawn.marker!.centre.x + scene.drawn.marker!.radius

// see DM-3, FR-039
const expectedDummyWidth = (displayScale: number): number =>
  Math.min(S_22 * displayRatioAt(displayScale) * S_247, S_180)

describe('T-240 DM-3 (MUST) -- the dummy is half a marker wide, whatever the day width', () => {
  it('premise: at the default display scale the manuscript numbers give 5px', () => {
    expect(expectedDummyWidth(DEFAULT_DISPLAY_SCALE)).toBeCloseTo(5, 9)
  })

  it(`draws it at marker diameter x S-247 at the default scale: ${DM_3_WIDTH}`, () => {
    const scene = sceneOf(unstarted())
    expect(scene.drawn.marker, 'premise: a marker is drawn').not.toBeNull()
    expect(inkOf(scene).width, DM_3_WIDTH).toBeCloseTo(scene.drawn.marker!.radius * 2 * S_247, 6)
    expect(inkOf(scene).width, DM_3_WIDTH).toBeCloseTo(expectedDummyWidth(DEFAULT_DISPLAY_SCALE), 6)
  })

  it.each([0.02, 64])(`keeps that width at zoomX %s: ${DM_3_NOT_ONE_DAY}`, (zoomX) => {
    const scene = sceneOf(unstarted(400), { zoomX })
    expect(inkOf(scene).width, `zoomX ${zoomX}: ${DM_3_NOT_ONE_DAY}`).toBeCloseTo(
      expectedDummyWidth(DEFAULT_DISPLAY_SCALE),
      6,
    )
  })

  it.each([LOWEST_SCALE, HIGHEST_SCALE])('follows the display scale %s through the marker diameter', (scale) => {
    const scene = sceneOf(unstarted(), { displayScale: scale })
    expect(inkOf(scene).width, `display scale ${scale}: ${DM_3_WIDTH}`).toBeCloseTo(expectedDummyWidth(scale), 6)
  })

  it(`starts it at the plan start column (DM-1): ${DM_3_LEFT_EDGE}`, () => {
    const scene = sceneOf(unstarted(), { zoomX: 64 })
    expect(inkOf(scene).x, DM_3_LEFT_EDGE).toBeCloseTo(scene.placed.x, 6)
  })
})

describe('T-240 DM-9 (MUST NOT) -- a milestone dummy stays the square of its actual figure', () => {
  it(DM_9_SQUARE, () => {
    const milestone = taskOf({ name: 'm', start: PLAN_START, finish: PLAN_START, milestone: true })
    const scene = sceneOf(milestone, {}, 'milestone')
    const dummy = scene.drawn.dummies.find((one) => one.grab === 'GR-18')
    expect(dummy, 'premise: a milestone dummy is drawn').toBeDefined()
    expect(dummy!.ink.width, DM_9_SQUARE).toBeCloseTo(dummy!.ink.height, 6)
    expect(dummy!.ink.width, DM_9_SQUARE).not.toBeCloseTo(expectedDummyWidth(DEFAULT_DISPLAY_SCALE), 3)
  })
})

describe('T-023d closing rule (MUST NOT) -- the dummy is held on its drawn mark and nothing wider', () => {
  const zoomX = 64
  const middleOf = (scene: Scene): number => inkOf(scene).y + inkOf(scene).height / 2

  it('takes GR-9 on the left half and GR-17 on the right half of the mark', () => {
    const scene = sceneOf(unstarted(), { zoomX })
    const ink = inkOf(scene)
    const y = middleOf(scene)
    expect(itemAtPointer(scene.geometry, ink.x + ink.width * 0.25, y, grabSizesOf())?.grab).toBe('GR-9')
    expect(itemAtPointer(scene.geometry, ink.x + ink.width * 0.75, y, grabSizesOf())?.grab).toBe('GR-17')
  })

  it(`does not take a dummy 1px outside either side of the mark: ${T_023D_NO_WIDER_BOX}`, () => {
    const scene = sceneOf(unstarted(), { zoomX })
    const ink = inkOf(scene)
    const y = middleOf(scene)
    for (const x of [ink.x - 1, ink.x + ink.width + 1]) {
      const grab = itemAtPointer(scene.geometry, x, y, grabSizesOf())?.grab
      expect(grab === 'GR-9' || grab === 'GR-17', `x ${x}: ${T_023D_NO_WIDER_BOX}`).toBe(false)
    }
  })
})

describe('FR-013 / LF-11 (MUST NOT) -- the marker touches what it follows', () => {
  it(`stands the marker left edge on the actual bar right edge: ${FR_013_NO_GAP}`, () => {
    const scene = sceneOf(started(40, 10))
    expect(scene.drawn.marker, 'premise: a marker is drawn').not.toBeNull()
    expect(markerLeft(scene), FR_013_NO_GAP).toBeCloseTo(scene.placed.actualReach!, 6)
  })

  it('stands the marker left edge on the dummy mark right edge for a task not started', () => {
    const scene = sceneOf(unstarted(), { zoomX: 64 })
    const ink = inkOf(scene)
    expect(markerLeft(scene), FR_013_NO_GAP).toBeCloseTo(ink.x + ink.width, 6)
  })

  it('keeps S-23 drawn at the display ratio between the plan right edge and the marker when only the plan is shown', () => {
    const scene = sceneOf(started(40, 10), { planVisible: true, actualVisible: false })
    const planRight = scene.placed.x + scene.placed.width
    expect(markerLeft(scene)).toBeCloseTo(planRight + S_23 * displayRatioAt(DEFAULT_DISPLAY_SCALE), 6)
  })
})

describe('T-023d closing rule (MUST) -- the marker drawn shape wins over the plan grabs', () => {
  const ratio = displayRatioAt(DEFAULT_DISPLAY_SCALE)
  const zoomX = 2 / (firstNumber('T-201', 'S-1', '既定値') * ratio)

  const PLAN_DAYS = 40

  // see FR-017, T-023d
  const nearThePlanEnd = (): Scene => {
    for (let actualDays = PLAN_DAYS; actualDays > 0; actualDays -= 1) {
      const scene = sceneOf(started(PLAN_DAYS, actualDays), { zoomX })
      const gap = scene.placed.x + scene.placed.width - scene.placed.actualReach!
      if (gap > EPS) return scene
    }
    throw new Error('premise: no actual of whole days ends left of the plan end')
  }

  it(`answers GR-7 inside the marker where it stands in the plan end grab margin: ${T_023D_MARKER_FIRST}`, () => {
    const scene = nearThePlanEnd()
    const planRight = scene.placed.x + scene.placed.width
    expect(planRight - scene.placed.actualReach!, 'premise: the actual ends 2px left of the plan end').toBeCloseTo(
      firstNumber('T-201', 'S-1', '既定値') * zoomX * displayRatioAt(DEFAULT_DISPLAY_SCALE),
      6,
    )
    const marker = scene.drawn.marker!
    expect(marker.centre.x, 'premise: the marker centre stands past the plan right edge').toBeGreaterThan(planRight)
    expect(itemAtPointer(scene.geometry, marker.centre.x, marker.centre.y, grabSizesOf())?.grab, T_023D_MARKER_FIRST).toBe(
      'GR-7',
    )
  })

  it('answers GR-7 inside the marker where it stands over the plan body', () => {
    const scene = sceneOf(started(40, 10))
    const marker = scene.drawn.marker!
    expect(itemAtPointer(scene.geometry, marker.centre.x, marker.centre.y, grabSizesOf())?.grab, T_023D_MARKER_FIRST).toBe(
      'GR-7',
    )
  })

  it.each(['over the plan body', 'near the plan end'] as const)(
    'grabs neither GR-12 nor GR-4 at the boundary between the actual and the marker, %s',
    (where) => {
    const scene = where === 'near the plan end' ? nearThePlanEnd() : sceneOf(started(PLAN_DAYS, 10), { zoomX })
    const boundary = scene.placed.actualReach!
    const y = scene.drawn.marker!.centre.y
    for (const x of [boundary - 0.5, boundary, boundary + 0.5]) {
      const grab = itemAtPointer(scene.geometry, x, y, grabSizesOf())?.grab
      expect(grab === 'GR-12' || grab === 'GR-4', `x ${x} took ${grab}: ${FR_013_NO_GAP}`).toBe(false)
    }
    expect(markerLeft(scene) - boundary, FR_013_NO_GAP).toBeLessThanOrEqual(EPS)
    expect(markerRight(scene)).toBeGreaterThan(boundary)
    },
  )
})
