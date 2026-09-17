// An arrow shape names itself from the plan's start point, sizes its marker to that name, and a rectangle may hold both inside its actual.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
  NOT_STORED_SIZES,
  type ScheduleLayout,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const T_013_ARROW_STARTS_AT_THE_PLAN_START =
  '⭐ 表 T-012 の `SH-3` / `SH-4` の名称ラベルには本表を当てず、名称ラベルの箱の左端を予定の開始点（`start` の位置）とすること（MUST） —— 予定の幅や実績の幅によらず、ラベルは同じ位置から書き始める。'

const T_013_WIDTH_NEVER_MOVES_THE_ARROW_NAME =
  '⛔ 予定や実績の幅で、その形状の名称ラベルの横の位置を変えてはならない（MUST NOT）'

const T_013_THE_OVERHANG_IS_COUNTED_IN_OC_1 =
  '⭐ そのラベルのうち形状の右端より右へ出たぶんは 表 T-038 の `OC-1` に数えること（MUST）'

const FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT =
  '⭐ 表 T-012 の `SH-3` / `SH-4` の進捗マーカーの径は、表 T-201 の `S-22` に代えて、そのタスクの名称ラベルの字の大きさとすること（MUST）'

const FR_094_THE_RESUME_ICON_FOLLOWS_THAT_DIAMETER =
  '⭐ その形状の再開アイコンの広がり（`S-26` / `S-27`）も、この径から導くこと（MUST）'

const T_013_THE_RECTANGLE_MAY_HOLD_BOTH_INSIDE =
  '⭐ 表 T-012 の `SH-1` / `SH-2` で、名称ラベルの箱の幅（打ち切った後の字の幅に `S-31` を足した長さ）＋ `S-32` ＋ 進捗マーカーの径 ＋ `S-23` ＋ `S-91` × 2 が実績の幅以下のときは、本表を当てず、名称ラベルと進捗マーカーを実績の中に置くこと（MUST）。'

const T_013_HOW_THEY_STAND_INSIDE =
  '置き方は、実績の右端から `S-91` だけ内側に名称ラベルの箱の右端を、その箱の左端から `S-32` だけ左にマーカーの右端を置く —— 左から「マーカー → 名前」の順である。'

const T_013_THE_LEFT_GAP_THAT_REMAINS =
  '⚠️ マーカーの左端と実績の左端のあいだには、`S-91` と `S-23` を足した長さ以上が残る —— 上の判定の和が実績の幅以下だからであり、判定の和は並びを入れ替えても変わらない。'

const FR_002_THE_NAME_NEVER_LEFT_OF_THE_MARKER =
  '⛔ 進捗マーカーと名称ラベルを両方描くときは、名称ラベルをマーカーの左に置いてはならない（MUST NOT）'

const T_013_THE_GRIPS_ARE_KEPT_CLEAR =
  '⭐ `S-91` を両端に数えるのは、実績の端点の掴み代（表 T-023d の `GR-5` / `GR-6`）の上に名前もマーカーも置かないためである。'

const T_013_INSIDE_WITH_THE_MARKER_HIDDEN =
  '⭐ 進捗マーカーを隠しているとき（`_assets/tbl-settings.md` の 表 T-202 の `S-63` が偽）は、判定からマーカーの径と `S-23` を除き、名称ラベルの箱の右端を実績の右端から `S-91` だけ内側に置くこと（MUST）'

const T_013_AN_UNSTARTED_TASK_IS_OUT_OF_SCOPE =
  '⚠️ 実績を持たない未着手のタスクには本段が当たらない —— 実績のダミー（`FR-043`）は実績ではない。'

const FR_018_THE_WIDTH_IS_THE_SPAN_TIMES_THE_DAY =
  'しきい値は表 T-205 の `S-86` に従うこと（MUST） —— 幅は期間に 1 日あたりの表示幅（`FR-017`）を掛けた値である。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['T-013 (MUST) -- an arrow name starts at the plan start point', T_013_ARROW_STARTS_AT_THE_PLAN_START],
  ['T-013 (MUST NOT) -- neither width moves that name', T_013_WIDTH_NEVER_MOVES_THE_ARROW_NAME],
  ['T-013 (MUST) -- the part right of the shape is counted in OC-1', T_013_THE_OVERHANG_IS_COUNTED_IN_OC_1],
  ['FR-094 (MUST) -- the arrow marker diameter is that task\'s name font', FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT],
  ['FR-094 (MUST) -- the resume icon is derived from that same diameter', FR_094_THE_RESUME_ICON_FOLLOWS_THAT_DIAMETER],
  ['T-013 (MUST) -- a rectangle holds name and marker inside the actual when they fit', T_013_THE_RECTANGLE_MAY_HOLD_BOTH_INSIDE],
  ['T-013 -- how the two stand inside, marker then name', T_013_HOW_THEY_STAND_INSIDE],
  ['T-013 -- the gap left of the marker inside the actual', T_013_THE_LEFT_GAP_THAT_REMAINS],
  ['FR-002 (MUST NOT) -- the name never stands left of the marker', FR_002_THE_NAME_NEVER_LEFT_OF_THE_MARKER],
  ['T-013 -- S-91 at both ends keeps the endpoint grips clear', T_013_THE_GRIPS_ARE_KEPT_CLEAR],
  ['T-013 (MUST) -- with S-63 false the marker leaves the judgement and the name moves right', T_013_INSIDE_WITH_THE_MARKER_HIDDEN],
  ['T-013 -- a task with no actual is out of this paragraph\'s scope', T_013_AN_UNSTARTED_TASK_IS_OUT_OF_SCOPE],
  ['FR-018 (MUST) -- the dropped width is the span times one day\'s drawn width', FR_018_THE_WIDTH_IS_THE_SPAN_TIMES_THE_DAY],
]

describe('CR-393 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const num = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const S_23 = num('markerGap')
const S_32 = num('labelGap')
const S_91 = NOT_STORED_SIZES['S-91']

// see FR-039, T-252
const DRAWN_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

const NESTED_DEFAULTS: Record<string, unknown> = (() => {
  const out: Record<string, unknown> = { ...SETTINGS_DEFAULTS }
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) continue
    const head = key.slice(0, dot)
    out[head] = {
      ...((out[head] as Record<string, unknown> | undefined) ?? {}),
      [key.slice(dot + 1)]: value,
    }
  }
  return out
})()

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...NESTED_DEFAULTS,
    rulerHeight: 48,
    rulerFont: 12,
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    assigneeVisible: false,
    percentCompleteVisible: false,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1400,
  height: 900,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, settingsOf())

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const spanning = (uid: number, from: string, days: number, part: Record<string, unknown> = {}): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

const rowsOf = (
  tasks: readonly Task[],
  visuals: readonly Record<string, unknown>[] = [],
): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((task) => ({ groupId: 'g1', taskUid: task.uid })),
    taskVisuals: visuals,
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

interface Scene {
  readonly layout: ScheduleLayout
  readonly placed: TaskPlacement
  readonly drawn: TaskGeometry
}

const sceneOf = (task: Task, shapeKind: string | null, part: Record<string, unknown> = {}): Scene => {
  const settings = settingsOf(part)
  const schedule = rowsOf(
    [task],
    shapeKind === null ? [] : [{ taskUid: task.uid, shapeKind }],
  )
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  const placed = taskPlacement(layout, task.uid)
  if (placed === null) throw new Error('the task was not placed')
  const drawn = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection()).tasks.find(
    (one) => one.taskUid === task.uid,
  )
  if (drawn === undefined) throw new Error('the task was not drawn')
  return { layout, placed, drawn }
}

const ARROW_SHAPES = ['arrow', 'endpointSpan'] as const

const arrowNamed = (plannedDays: number, actualStop: string): Task =>
  spanning(1, '2026-02-02', plannedDays, {
    name: 'an arrow name long enough to reach past its own shape',
    percentComplete: 40,
    actualStart: '2026-02-02',
    stop: actualStop,
    resumeValid: true,
  })

describe('T-013 (MUST) -- an SH-3 / SH-4 name starts at the plan start, whatever the widths', () => {
  it.each(ARROW_SHAPES)('%s: the name box left edge is the plan start x', (shapeKind) => {
    const scene = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind)
    expect(scene.drawn.label, 'premise: the task has a name to draw').not.toBeNull()
    expect(scene.drawn.label!.x, T_013_ARROW_STARTS_AT_THE_PLAN_START).toBeCloseTo(
      scene.placed.x,
      6,
    )
    expect(scene.placed.labelX, T_013_ARROW_STARTS_AT_THE_PLAN_START).toBeCloseTo(scene.placed.x, 6)
  })

  it.each(ARROW_SHAPES)('%s: neither the plan width nor the actual width moves it (MUST NOT)', (shapeKind) => {
    const first = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind)
    const widerPlan = sceneOf(arrowNamed(60, '2026-02-10'), shapeKind)
    const widerActual = sceneOf(arrowNamed(20, '2026-03-20'), shapeKind)

    expect(widerPlan.placed.width, 'premise: the plan really is wider').toBeGreaterThan(
      first.placed.width,
    )
    expect(widerPlan.placed.labelX, T_013_WIDTH_NEVER_MOVES_THE_ARROW_NAME).toBeCloseTo(
      first.placed.labelX,
      6,
    )
    expect(widerActual.placed.labelX, T_013_WIDTH_NEVER_MOVES_THE_ARROW_NAME).toBeCloseTo(
      first.placed.labelX,
      6,
    )
  })

  it.each(ARROW_SHAPES)('%s: the part standing right of the shape is counted in the occupied width', (shapeKind) => {
    const scene = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind)
    expect(scene.placed.width, FR_018_THE_WIDTH_IS_THE_SPAN_TIMES_THE_DAY).toBeGreaterThan(0)
    const shapeRight = scene.placed.x + scene.placed.width
    const labelRight = scene.drawn.label!.x + scene.drawn.label!.width
    expect(labelRight, 'premise: this name reaches past its own shape').toBeGreaterThan(shapeRight)
    expect(scene.placed.occupiedX1, T_013_THE_OVERHANG_IS_COUNTED_IN_OC_1).toBeGreaterThanOrEqual(
      labelRight - 1e-6,
    )
  })
})

describe('FR-094 (MUST) -- an SH-3 / SH-4 marker is as wide as that task\'s name', () => {
  it.each(ARROW_SHAPES)('%s: the marker diameter equals the name font size', (shapeKind) => {
    const scene = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind)
    expect(scene.drawn.marker, 'premise: a marker is drawn for this task').not.toBeNull()
    expect(
      scene.drawn.marker!.radius * 2,
      FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT,
    ).toBeCloseTo(scene.placed.labelFontSize, 6)
  })

  it.each(ARROW_SHAPES)('%s: the marker follows the name font as the row axis zooms', (shapeKind) => {
    const low = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind, { zoomY: 1 })
    const high = sceneOf(arrowNamed(20, '2026-02-10'), shapeKind, { zoomY: 6 })
    expect(high.placed.labelFontSize, 'premise: the name really does grow').toBeGreaterThan(
      low.placed.labelFontSize,
    )
    expect(high.drawn.marker!.radius * 2, FR_094_THE_ARROW_MARKER_IS_THE_NAME_FONT).toBeCloseTo(
      high.placed.labelFontSize,
      6,
    )
  })

  it('a rectangle keeps the fixed S-22 diameter -- only SH-3 / SH-4 read the name font', () => {
    const rectangle = sceneOf(arrowNamed(20, '2026-02-10'), 'rectangle')
    expect(rectangle.drawn.marker, 'premise: a marker is drawn').not.toBeNull()
    expect(
      rectangle.drawn.marker!.radius * 2,
      'FR-094 replaces S-22 for the line shapes alone; DS-1 still draws S-22 at the display ratio',
    ).toBeCloseTo(num('markerSize') * DRAWN_RATIO, 6)
  })
})

describe('T-013 (MUST) -- a rectangle draws the name and the marker inside a wide enough actual', () => {
  const WIDE_ACTUAL = spanning(1, '2026-02-02', 120, {
    name: 'ab',
    percentComplete: 40,
    actualStart: '2026-02-02',
    stop: '2026-05-20',
    resumeValid: true,
  })

  it('premise: the name box, the gaps, the marker and both grips fit inside the actual', () => {
    const scene = sceneOf(WIDE_ACTUAL, 'rectangle')
    const nameBox = scene.drawn.label!.width
    const diameter = scene.drawn.marker!.radius * 2
    const actualWidth = (scene.placed.actualReach ?? 0) - scene.placed.x
    expect(nameBox + S_32 + diameter + S_23 + S_91 * 2, T_013_THE_RECTANGLE_MAY_HOLD_BOTH_INSIDE)
      .toBeLessThanOrEqual(actualWidth)
  })

  it('stands the name box S-91 inside the actual right edge, and the marker S-32 left of it', () => {
    const scene = sceneOf(WIDE_ACTUAL, 'rectangle')
    const actualRight = scene.placed.actualReach ?? 0
    const markerRight = scene.drawn.marker!.centre.x + scene.drawn.marker!.radius
    const nameLeft = scene.drawn.label!.x
    const nameRight = scene.drawn.label!.x + scene.drawn.label!.width

    expect(nameRight, T_013_HOW_THEY_STAND_INSIDE).toBeCloseTo(actualRight - S_91, 6)
    expect(markerRight, T_013_HOW_THEY_STAND_INSIDE).toBeCloseTo(nameLeft - S_32 * DRAWN_RATIO, 6)
    expect(markerRight, FR_002_THE_NAME_NEVER_LEFT_OF_THE_MARKER).toBeLessThan(nameLeft)
  })

  it('leaves the endpoint grips clear at both ends of the actual', () => {
    const scene = sceneOf(WIDE_ACTUAL, 'rectangle')
    const actualRight = scene.placed.actualReach ?? 0
    const markerLeft = scene.drawn.marker!.centre.x - scene.drawn.marker!.radius
    const nameRight = scene.drawn.label!.x + scene.drawn.label!.width
    expect(actualRight - nameRight, T_013_THE_GRIPS_ARE_KEPT_CLEAR).toBeGreaterThanOrEqual(
      S_91 - 1e-6,
    )
    expect(markerLeft - scene.placed.x, T_013_THE_LEFT_GAP_THAT_REMAINS).toBeGreaterThanOrEqual(
      S_91 + S_23 * DRAWN_RATIO - 1e-6,
    )
  })

  it.each([
    ['a wide actual that holds both', 120, 'ab'],
    ['a short plan and actual that send the name outside the shape', 8, 'a name far too long for this plan'],
  ] as const)('never puts the name left of the marker: %s (MUST NOT)', (_how, planDays, name) => {
    const task = spanning(1, '2026-02-02', planDays, {
      name,
      percentComplete: 40,
      actualStart: '2026-02-02',
      stop: planDays === 8 ? '2026-02-03' : '2026-05-20',
      resumeValid: true,
    })
    const scene = sceneOf(task, 'rectangle')
    expect(scene.placed.labelPlacement === 'inside', 'premise: only the wide actual keeps the name in the shape').toBe(planDays !== 8)
    expect(scene.drawn.marker, 'premise: a marker is drawn').not.toBeNull()
    expect(scene.drawn.label, 'premise: a name is drawn').not.toBeNull()
    expect(
      scene.drawn.marker!.centre.x + scene.drawn.marker!.radius,
      FR_002_THE_NAME_NEVER_LEFT_OF_THE_MARKER,
    ).toBeLessThanOrEqual(scene.drawn.label!.x + 1e-6)
  })

  it('counts nothing in OC-1, because the name never leaves the shape', () => {
    const scene = sceneOf(WIDE_ACTUAL, 'rectangle')
    const shapeRight = Math.max(scene.placed.x + scene.placed.width, scene.placed.actualReach ?? 0)
    expect(scene.placed.occupiedX1, T_013_THE_RECTANGLE_MAY_HOLD_BOTH_INSIDE).toBeCloseTo(
      shapeRight,
      6,
    )
  })

  it('with the marker hidden, the name box right edge is S-91 inside the actual right edge (MUST)', () => {
    const scene = sceneOf(WIDE_ACTUAL, 'rectangle', { progressMarkerVisible: false })
    const actualRight = scene.placed.actualReach ?? 0
    const nameRight = scene.drawn.label!.x + scene.drawn.label!.width
    expect(scene.drawn.marker, 'premise: S-63 false draws no marker').toBeNull()
    expect(nameRight, T_013_INSIDE_WITH_THE_MARKER_HIDDEN).toBeCloseTo(actualRight - S_91, 6)
    const shown = sceneOf(WIDE_ACTUAL, 'rectangle')
    expect(nameRight, 'switching S-63 does not move a name that stays inside the actual').toBeCloseTo(
      shown.drawn.label!.x + shown.drawn.label!.width,
      6,
    )
  })

  it('does not reach a task that has no actual at all', () => {
    const unstarted = spanning(2, '2026-02-02', 120, { name: 'ab' })
    const scene = sceneOf(unstarted, 'rectangle')
    expect(scene.placed.actualReach, 'premise: nothing has been worked on this task').toBeNull()
    expect(scene.placed.labelPlacement, T_013_AN_UNSTARTED_TASK_IS_OUT_OF_SCOPE).toBe('inside')
  })
})
