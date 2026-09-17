// CR-420: whenever a progress marker and a name label are both drawn, the marker stands left of the name.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
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
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'

// see T-201, T-206
const firstNumber = (table: string, id: string, column: string): number => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by[column] ?? '').replace(/`/g, ''))
  if (found === null) throw new Error(`table ${table} row ${id} column ${column} holds no number`)
  return Number(found[0])
}

const RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)
const S_23_DRAWN = firstNumber('T-201', 'S-23', '既定値') * RATIO
const S_32_DRAWN = firstNumber('T-201', 'S-32', '既定値') * RATIO
const S_91 = firstNumber('T-206', 'S-91', '既定')
const EPS = 1e-6

const FR_002_NEVER_NAME_LEFT_OF_MARKER =
  '⛔ 進捗マーカーと名称ラベルを両方描くときは、名称ラベルをマーカーの左に置いてはならない（MUST NOT）'
const FR_002_HOW_THEY_STAND_INSIDE =
  '置き方は、実績の右端から `S-91` だけ内側に名称ラベルの箱の右端を、その箱の左端から `S-32` だけ左にマーカーの右端を置く —— 左から「マーカー → 名前」の順である。'
const FR_002_HIDDEN_MARKER_KEEPS_THE_NAME =
  'マーカーを描くときと同じ位置なので、実績の中に収まっているあいだは `S-63` を切り替えても名前は動かない。'
const FR_002_THE_FIT_SUM =
  '名称ラベルの箱の幅（打ち切った後の字の幅に `S-31` を足した長さ）＋ `S-32` ＋ 進捗マーカーの径 ＋ `S-23` ＋ `S-91` × 2 が実績の幅以下のときは、本表を当てず、名称ラベルと進捗マーカーを実績の中に置くこと（MUST）'

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

const scheduleOf = (task: Task): Schedule =>
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
    taskVisuals: [{ taskUid: task.uid, shapeKind: 'rectangle' }],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

interface Scene {
  readonly placed: TaskPlacement
  readonly drawn: TaskGeometry
}

const sceneOf = (task: Task, part: Record<string, unknown> = {}): Scene => {
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENV, settings)
  const schedule = scheduleOf(task)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const placed = taskPlacement(layout, task.uid)
  if (placed === null) throw new Error('the task was not placed')
  const drawn = geometryFromLayout(schedule, settings, layout, regions, emptySelection()).tasks.find(
    (one) => one.taskUid === task.uid,
  )
  if (drawn === undefined) throw new Error('the task was not drawn')
  return { placed, drawn }
}

const PLAN_START = '2026-02-02'

const startedTask = (planDays: number, actualDays: number, name: string): Task =>
  taskOf({
    name,
    start: PLAN_START,
    finish: isoPlus(PLAN_START, planDays),
    percentComplete: 40,
    actualStart: PLAN_START,
    stop: isoPlus(PLAN_START, actualDays),
    resumeValid: true,
  })

const markerLeft = (scene: Scene): number => scene.drawn.marker!.centre.x - scene.drawn.marker!.radius
const markerRight = (scene: Scene): number => scene.drawn.marker!.centre.x + scene.drawn.marker!.radius
const nameLeft = (scene: Scene): number => scene.drawn.label!.x
const nameRight = (scene: Scene): number => scene.drawn.label!.x + scene.drawn.label!.width
const actualRight = (scene: Scene): number => scene.placed.actualReach ?? Number.NaN

const nameInsideTheActual = (scene: Scene): boolean =>
  scene.drawn.label !== null && nameRight(scene) <= actualRight(scene) + EPS

const WIDE = startedTask(160, 150, 'ab')

describe('FR-002 (MUST) -- inside a wide actual the order is marker, then name', () => {
  it('premise: the name, the marker and both grips fit in the actual, so both stand inside it', () => {
    const scene = sceneOf(WIDE)
    expect(scene.drawn.marker, 'premise: a marker is drawn').not.toBeNull()
    expect(scene.drawn.label, 'premise: a name is drawn').not.toBeNull()
    expect(nameInsideTheActual(scene), FR_002_THE_FIT_SUM).toBe(true)
  })

  it(`puts the name box right edge S-91 inside the actual right edge: ${FR_002_HOW_THEY_STAND_INSIDE}`, () => {
    const scene = sceneOf(WIDE)
    expect(nameRight(scene), FR_002_HOW_THEY_STAND_INSIDE).toBeCloseTo(actualRight(scene) - S_91, 6)
  })

  it('puts the marker right edge S-32 left of the name box left edge', () => {
    const scene = sceneOf(WIDE)
    expect(markerRight(scene), FR_002_HOW_THEY_STAND_INSIDE).toBeCloseTo(nameLeft(scene) - S_32_DRAWN, 6)
  })

  it(FR_002_NEVER_NAME_LEFT_OF_MARKER, () => {
    const scene = sceneOf(WIDE)
    expect(markerRight(scene), FR_002_NEVER_NAME_LEFT_OF_MARKER).toBeLessThanOrEqual(nameLeft(scene) + EPS)
  })

  it('leaves at least S-91 + S-23 between the actual left edge and the marker left edge', () => {
    const scene = sceneOf(WIDE)
    const actualLeft = scene.placed.actualX ?? scene.placed.x
    expect(markerLeft(scene) - actualLeft).toBeGreaterThanOrEqual(S_91 + S_23_DRAWN - EPS)
  })
})

describe('FR-002 (MUST NOT) -- the order does not flip while the actual shrinks day by day', () => {
  const frames = Array.from({ length: 200 }, (_, index) => 200 - index).map((actualDays) => ({
    actualDays,
    scene: sceneOf(startedTask(20, actualDays, 'a name long enough to leave a short shape')),
  }))

  it('premise: the sweep holds frames with the name inside the actual and frames with it outside', () => {
    expect(frames.some((one) => nameInsideTheActual(one.scene))).toBe(true)
    expect(frames.some((one) => !nameInsideTheActual(one.scene))).toBe(true)
  })

  it(`keeps the marker box left of the name box in every frame: ${FR_002_NEVER_NAME_LEFT_OF_MARKER}`, () => {
    for (const { actualDays, scene } of frames) {
      expect(scene.drawn.marker, `premise at ${actualDays} days: a marker`).not.toBeNull()
      expect(scene.drawn.label, `premise at ${actualDays} days: a name`).not.toBeNull()
      expect(
        markerRight(scene),
        `actual of ${actualDays} days: ${FR_002_NEVER_NAME_LEFT_OF_MARKER}`,
      ).toBeLessThanOrEqual(nameLeft(scene) + EPS)
    }
  })

  // WHY: FR-002 names S-32 and S-23 of T-201, which T-252 DS-1 draws at the display ratio; S-91 is DS-7's, never scaled.
  it('keeps the fit sum where it was: the switch happens where the drawn sum passes the actual width', () => {
    const insideFrames = frames.filter((one) => nameInsideTheActual(one.scene))
    const firstInside = insideFrames[insideFrames.length - 1]!
    const lastOutside = frames.find((one) => one.actualDays === firstInside.actualDays - 1)!
    expect(nameInsideTheActual(lastOutside.scene), 'premise: one day less leaves the actual').toBe(false)
    const sumAt = (scene: Scene, gap: number, markerGap: number): number =>
      scene.drawn.label!.width + gap + scene.drawn.marker!.radius * 2 + markerGap + S_91 * 2
    const widthOf = (scene: Scene): number => actualRight(scene) - (scene.placed.actualX ?? scene.placed.x)
    expect(sumAt(firstInside.scene, S_32_DRAWN, S_23_DRAWN), FR_002_THE_FIT_SUM).toBeLessThanOrEqual(
      widthOf(firstInside.scene) + EPS,
    )
    const outsideLabelWidth = firstInside.scene.drawn.label!.width
    const outsideSum =
      outsideLabelWidth + S_32_DRAWN + lastOutside.scene.drawn.marker!.radius * 2 + S_23_DRAWN + S_91 * 2
    expect(outsideSum, FR_002_THE_FIT_SUM).toBeGreaterThan(widthOf(lastOutside.scene) - EPS)
  })
})

describe('FR-002 (MUST) -- hiding the marker (S-63 false) does not move a name standing inside the actual', () => {
  it('keeps the name box right edge at the actual right edge less S-91', () => {
    const hidden = sceneOf(WIDE, { progressMarkerVisible: false })
    expect(hidden.drawn.marker, 'premise: S-63 false draws no marker').toBeNull()
    expect(nameRight(hidden), FR_002_HIDDEN_MARKER_KEEPS_THE_NAME).toBeCloseTo(actualRight(hidden) - S_91, 6)
  })

  it('draws the name at the same box with the marker shown and hidden', () => {
    const shown = sceneOf(WIDE)
    const hidden = sceneOf(WIDE, { progressMarkerVisible: false })
    expect(hidden.drawn.label!.x, FR_002_HIDDEN_MARKER_KEEPS_THE_NAME).toBeCloseTo(shown.drawn.label!.x, 6)
    expect(nameRight(hidden), FR_002_HIDDEN_MARKER_KEEPS_THE_NAME).toBeCloseTo(nameRight(shown), 6)
  })
})
