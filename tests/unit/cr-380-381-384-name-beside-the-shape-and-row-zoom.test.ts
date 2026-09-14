// Where a task name stands (CR-380), how far the row axis zooms (CR-381), and rows without a gap (CR-384).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_BOUNDS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  NOT_STORED_LABEL_SIZES,
  type BarGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type ScheduleLayout,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  NOT_STORED_ZOOM_STEP,
  type InputContext,
  type KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const OC_10_LOWERED_BY_THE_LABEL =
  'は `OC-1` が数える）。縦の占有としてのみ、名称ラベルが縦に取る高さと `_assets/tbl-settings.md` の 表 T-206 の `S-196` を予定の上に数え、形状をそのぶん段の上端から下げて置くこと（MUST）'

const OC_10_WITH_OR_WITHOUT_A_NAME =
  'gs.md` の 表 T-206 の `S-196` を予定の上に数え、形状をそのぶん段の上端から下げて置くこと（MUST）。⚠️ 段割当の重なりに当てはめないことは `OC-6` と同じである。⭐ 名前の有無によらず数えること（MUST）'

const T_013_NO_LABEL_OVER_THE_MARKER =
  '中に書くときは、その位置から書き始めること（MUST） —— 名称ラベルの左に状態の記号が来る並びは、形状の外へ出したときの 表 T-243 の `OR-1` と同じである。⛔ マーカーの上に名称ラベルを重ねてはならない（MUST NOT）'

const T_013_MARKER_COUNTED_WHERE_DRAWN =
  'マーカーの上に名称ラベルを重ねてはならない（MUST NOT） —— 状態の記号も名前も読めなくなる。⭐ マーカーの位置は、同書の 表 T-202 の `S-63` で描いているかどうかによらず、描いたときに立つ位置で数えること（MUST）'

const T_243_SAME_LEFT_EDGE_WHETHER_DRAWN =
  'と `OC-4` を実際に描いたかどうかによらず、同じ位置とすること（MUST）'

const T_243_COUNTED_WHERE_DRAWN =
  '` と `OC-4` を実際に描いたかどうかによらず、同じ位置とすること（MUST）。`OC-3` / `OC-4` を描かないときも、描いたときに立つ位置で数えること（MUST）'

const T_243_NOT_ONLY_WHEN_DRAWN =
  'OC-3` と `OC-4` を実際に描いたかどうかによらず、同じ位置とすること（MUST）。`OC-3` / `OC-4` を描かないときも、描いたときに立つ位置で数えること（MUST）。描いたときだけ数えてはならない（MUST NOT）'

const T_243_LABEL_LEFT_EDGE =
  ' T-202 の `S-63` がマーカーと再開アイコンの両方を持つ。⭐ 名称ラベルの左端は、形状の右端と、形状の外へ出た進捗マーカーの右端のうち、右にあるほうに 同書の 表 T-201 の `S-32` を足した位置とすること（MUST）'

const T_243_HIDDEN_SHAPE_KEEPS_ITS_EDGE =
  '01 の `S-32` を足した位置とすること（MUST）。⭐ ここでいう形状の右端は、予定・実績・ダミーを表示の切り替え（表 T-202 の `S-227` / `S-228`）で隠しているときも、描いたときの占有で数えること（MUST）'

const T_243_RIGHTMOST_MARKER_OF_EVERY_COMBINATION =
  'えること（MUST）。⭐ マーカーの右端は、`S-63` / `S-227` / `S-228` のどの組でマーカーが立つ位置（`FR-013` が予定だけの表示で予定バーへ移す位置を含む）でも、そのうち右にあるほうで数えること（MUST）'

const T_243_NO_NEW_SETTING =
  '重ならない。⛔ 形状の中に立つマーカーのために、形状の外に場所を空けてはならない（MUST NOT） —— 空けると、名称ラベルが形状から離れて立ち、どのタスクの名前かが読みにくくなる。⭐ 新しい設定値を立ててはならない（MUST NOT）'

const T_243_NO_ROOM_FOR_A_DATED_RESUME_ICON =
  'ない。⇒ `OC-3` / `OC-4` の MUST NOT が守っているものは、1 文字も変わらない。⛔ 再開アイコンが 表 T-221 の `LF-11` の日付位置に立つときは、本並びの中に場所を空けてはならない（MUST NOT）'

const T_243_PA_4_COUNTS_THE_ICON =
  'である。⚠️ `resume` を持たないとき（表 T-019 の `PA-4`）だけは、`LF-11` がアイコンをマーカーの右端から `S-23` 離して並びの中に立てるので、マーカーの右端に代えてアイコンの右端で数えること（MUST）'

const FR_049_HIDDEN_KEEPS_ITS_OCCUPANCY =
  'すたびに行が伸び縮みすると、見ている場所が動く。⭐ `S-227` / `S-228` で隠した予定・実績・実績のダミーは、占有（表 T-038 の算入と、名称ラベルの位置の数え方）をそのまま残し、描かず、当たり判定から外すこと（MUST）'

const FR_049_HIDDEN_NOT_TAKEN_OUT =
  'ラベルの位置の数え方）をそのまま残し、描かず、当たり判定から外すこと（MUST） —— 見た目は透明に描いたときと同じであり、表示を切り替えても名称ラベルも行の帯高も段も動かない。⛔ 隠したものを占有から外してはならない（MUST NOT）'

const FR_016_ROW_CEILING_IS_THE_SMALLER =
  'ちょうど埋めた先には、見せられるものが残っていない。**⛔ **このために新しい設定値の行を立ててはならない（MUST NOT）** —— **画面の高さから導く。**⭐ 行の軸の上限は、上の倍率と、次の倍率の小さい方とすること（MUST）'

const FR_016_MEASURED_ON_THE_RECTANGLE =
  'ets/tbl-settings.md` の 表 T-201 の `S-13`）のタスクの名称ラベルの字が、深さ 1 の行の名前の字（同表の `S-36` × `S-38`）に等しくなる倍率である。⭐ 形状によらず矩形で測ること（MUST）'

const T_023D_FRACTION_OF_THE_PITCH =
  'が何も起こさず、等倍が成り立たない。**端数は同表の `S-176` と `S-177` が持つ（MUST）。**⛔ その端数は、行の帯の高さではなく、行が占める送り（帯の高さと、その下の隙間を合わせた長さ）に対する比とすること（MUST）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['T-038 OC-10 (MUST) -- the shape is lowered by the label and S-196', OC_10_LOWERED_BY_THE_LABEL],
  ['T-038 OC-10 (MUST) -- counted whether or not the task has a name', OC_10_WITH_OR_WITHOUT_A_NAME],
  ['T-013 (MUST NOT) -- no name over the marker', T_013_NO_LABEL_OVER_THE_MARKER],
  ['T-013 (MUST) -- the marker is counted where it stands when drawn', T_013_MARKER_COUNTED_WHERE_DRAWN],
  ['T-243 (MUST) -- the same left edge whether OC-3 / OC-4 are drawn', T_243_SAME_LEFT_EDGE_WHETHER_DRAWN],
  ['T-243 (MUST) -- counted where they stand when drawn', T_243_COUNTED_WHERE_DRAWN],
  ['T-243 (MUST NOT) -- not counted only while drawn', T_243_NOT_ONLY_WHEN_DRAWN],
  ['T-243 (MUST) -- the name starts S-32 past the shape or the outside marker', T_243_LABEL_LEFT_EDGE],
  ['T-243 (MUST) -- a hidden plan or actual keeps its right edge', T_243_HIDDEN_SHAPE_KEEPS_ITS_EDGE],
  ['T-243 (MUST) -- the rightmost marker of every S-63 / S-227 / S-228 combination', T_243_RIGHTMOST_MARKER_OF_EVERY_COMBINATION],
  ['T-243 (MUST NOT) -- no new setting', T_243_NO_NEW_SETTING],
  ['T-243 (MUST NOT) -- no room for a resume icon on its own day', T_243_NO_ROOM_FOR_A_DATED_RESUME_ICON],
  ['T-243 (MUST) -- PA-4 counts the icon right edge', T_243_PA_4_COUNTS_THE_ICON],
  ['FR-049 (MUST) -- a hidden plan or actual keeps its occupancy', FR_049_HIDDEN_KEEPS_ITS_OCCUPANCY],
  ['FR-049 (MUST NOT) -- a hidden thing is not taken out of the occupancy', FR_049_HIDDEN_NOT_TAKEN_OUT],
  ['FR-016 (MUST) -- the row ceiling is the smaller of the two', FR_016_ROW_CEILING_IS_THE_SMALLER],
  ['FR-016 (MUST) -- measured on the rectangle whatever is drawn', FR_016_MEASURED_ON_THE_RECTANGLE],
  ['T-023d (MUST) -- S-176 is a fraction of the pitch', T_023D_FRACTION_OF_THE_PITCH],
]

describe('CR-380 / CR-381 / CR-384 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const NESTED_DEFAULTS: Record<string, unknown> = (() => {
  const out: Record<string, unknown> = { ...SETTINGS_DEFAULTS }
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) continue
    const head = key.slice(0, dot)
    out[head] = { ...((out[head] as Record<string, unknown> | undefined) ?? {}), [key.slice(dot + 1)]: value }
  }
  return out
})()

const num = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...NESTED_DEFAULTS,
    rulerHeight: 48,
    rulerFont: 12,
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const TALL: ScreenEnvironment = { ...ENV, height: 4000 }
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
  const finish = new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

const rowsOf = (
  rows: readonly (readonly Task[])[],
  visuals: readonly Record<string, unknown>[] = [],
): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: rows.flat(),
    taskGroups: rows.map((_tasks, index) => ({ id: `g${index + 1}`, parentId: null, order: index, height: null })),
    taskGroupMembers: rows.flatMap((tasks, index) =>
      tasks.map((task) => ({ groupId: `g${index + 1}`, taskUid: task.uid })),
    ),
    taskVisuals: visuals,
  }) as unknown as Schedule

const extentOf = (bar: BarGeometry | null): { top: number; bottom: number } => {
  if (bar === null) throw new Error('no bar was drawn')
  if (bar.form === 'outline') {
    const ys = bar.points.map((one) => one.y)
    return { top: Math.min(...ys), bottom: Math.max(...ys) }
  }
  const half = bar.strokeWidth / 2
  const ys = [bar.from.y - half, bar.from.y + half, bar.to.y - half, bar.to.y + half]
  for (const one of bar.head ?? []) ys.push(one.y)
  for (const dot of bar.dots) ys.push(dot.at.y - dot.radius, dot.at.y + dot.radius)
  return { top: Math.min(...ys), bottom: Math.max(...ys) }
}

const tallestBand = (layout: ScheduleLayout): number => Math.max(...layout.rows.map((row) => row.height))

const drawnOf = (
  schedule: Schedule,
  settings: DocumentSettings,
): { layout: ScheduleLayout; tasks: readonly TaskGeometry[] } => {
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  return { layout, tasks: geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection()).tasks }
}

const S_196 = NOT_STORED_LABEL_SIZES['S-196']

describe('T-038 OC-10 -- a lifted name label is counted in the band height', () => {
  const LIFTED = ['arrow', 'endpointSpan'] as const
  const ZOOMS = [1, 4] as const

  const liftedRows = (shapeKind: string, name: string | null): Schedule =>
    rowsOf(
      [
        [spanning(1, '2026-01-05', 20, { name, actualStart: '2026-01-05', stop: '2026-01-09' })],
        [spanning(2, '2026-01-05', 20, { name, actualStart: '2026-01-05', stop: '2026-01-09' })],
      ],
      [
        { taskUid: 1, shapeKind },
        { taskUid: 2, shapeKind },
      ],
    )

  it.each(LIFTED)('%s: the label box starts at its lane top, the shape label height + S-196 under it (MUST)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const { layout, tasks } = drawnOf(liftedRows(shapeKind, 'ab'), settingsOf({ zoomY }))
      for (const [index, uid] of [[0, 1], [1, 2]] as const) {
        const tag = `zoomY ${zoomY}, row ${index + 1}`
        const row = layout.rows[index]!
        const drawn = tasks.find((one) => one.taskUid === uid)!
        const label = drawn.label!
        const planTop = extentOf(drawn.plan).top
        expect(label.y + label.height, `${tag}: T-012 premise, label bottom = plan top - S-196`).toBeCloseTo(
          planTop - S_196,
          6,
        )
        expect(label.y, `${tag}: lane top + label height + S-196 = plan top`).toBeCloseTo(row.stackTops[0]!, 6)
        expect(label.y, `${tag}: the label does not reach into the band above`).toBeGreaterThanOrEqual(row.y - 1e-9)
      }
      expect(tasks.find((one) => one.taskUid === 1)!.label!.y, 'the top row keeps its label in the Row Area')
        .toBeGreaterThanOrEqual(REGIONS.rowArea.y - 1e-9)
    }
  })

  it.each(LIFTED)('%s: taking the name away moves neither the band nor the shape (MUST)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const named = drawnOf(liftedRows(shapeKind, 'ab'), settingsOf({ zoomY }))
      const nameless = drawnOf(liftedRows(shapeKind, null), settingsOf({ zoomY }))
      expect(nameless.tasks[0]!.label, 'premise: nothing is written for a task with no name').toBeNull()
      expect(nameless.layout.rows.map((row) => [row.y, row.height])).toEqual(
        named.layout.rows.map((row) => [row.y, row.height]),
      )
      for (const [at, drawn] of nameless.tasks.entries()) {
        expect(extentOf(drawn.plan).top, `zoomY ${zoomY}, task ${at + 1}`).toBeCloseTo(
          extentOf(named.tasks[at]!.plan).top,
          6,
        )
      }
    }
  })
})

interface Showing {
  readonly marks: boolean
  readonly plan: boolean
  readonly actual: boolean
}

const SHOWN: Showing = { marks: true, plan: true, actual: true }
const EVERY_SHOWING: readonly Showing[] = [true, false].flatMap((marks) =>
  [true, false].flatMap((plan) => [true, false].map((actual) => ({ marks, plan, actual }))),
)

const OUTSIDE_NAME = 'a name far too long for this bar to hold inside itself'

const pastThePlan = (part: Record<string, unknown>): Task =>
  spanning(1, '2026-02-02', 20, {
    name: OUTSIDE_NAME,
    percentComplete: 40,
    actualStart: '2026-02-02',
    stop: '2026-02-27',
    ...part,
  })

const IN_PROGRESS = pastThePlan({ resume: null, resumeValid: true })
const RESUME_DATED = pastThePlan({ resume: '2026-03-10', resumeValid: true })
const RESUME_UNDATED = pastThePlan({ resume: null, resumeValid: false })
const STOPS_INSIDE = spanning(1, '2026-02-02', 20, {
  name: OUTSIDE_NAME,
  percentComplete: 40,
  actualStart: '2026-02-02',
  stop: '2026-02-06',
  resumeValid: true,
})

const sceneOf = (
  task: Task,
  showing: Showing = SHOWN,
): { layout: ScheduleLayout; placed: TaskPlacement; drawn: TaskGeometry | null } => {
  const settings = settingsOf({
    progressMarkerVisible: showing.marks,
    planVisible: showing.plan,
    actualVisible: showing.actual,
    assigneeVisible: false,
    percentCompleteVisible: false,
  })
  const schedule = rowsOf([[task]])
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  const placed = taskPlacement(layout, 1)
  if (placed === null) throw new Error('task 1 was not drawn at this zoom')
  const drawn =
    geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection()).tasks.find(
      (one) => one.taskUid === 1,
    ) ?? null
  return { layout, placed, drawn }
}

const S_22 = num('markerSize')
const S_23 = num('markerGap')
const S_32 = num('labelGap')

describe('T-243 closing rule -- the name starts S-32 past the shape or the outside marker', () => {
  const PAST_THE_PLAN = [
    ['PA-2', IN_PROGRESS],
    ['PA-3', RESUME_DATED],
    ['PA-4', RESUME_UNDATED],
  ] as const

  it.each(PAST_THE_PLAN)('%s premise: the actual reaches past the plan and LF-11 hangs the marker S-23 past it', (_row, task) => {
    const { placed, drawn } = sceneOf(task)
    expect(placed.labelPlacement).toBe('right')
    expect(placed.actualReach).not.toBeNull()
    expect(placed.actualReach!).toBeGreaterThan(placed.x + placed.width)
    const marker = drawn!.marker!
    expect(marker.centre.x + marker.radius, 'marker right = actual right + S-23 + S-22').toBeCloseTo(
      placed.actualReach! + S_23 + S_22,
      6,
    )
  })

  it('PA-2: the name starts at actual right + S-23 + S-22 + S-32, from existing settings only (MUST)', () => {
    const { placed } = sceneOf(IN_PROGRESS)
    expect(placed.labelX).toBeCloseTo(placed.actualReach! + S_23 + S_22 + S_32, 6)
  })

  it('PA-3: a resume icon standing on its own day takes no room in the order (MUST NOT)', () => {
    const { placed, drawn } = sceneOf(RESUME_DATED)
    expect(drawn!.resume, 'premise: FR-044 draws the icon while suspended').not.toBeNull()
    expect(placed.labelX, 'the same edge as PA-2: marker right + S-32').toBeCloseTo(
      placed.actualReach! + S_23 + S_22 + S_32,
      6,
    )
  })

  it('PA-4: the undated resume icon stands in the order and is counted by its own right edge (MUST)', () => {
    const { placed, drawn } = sceneOf(RESUME_UNDATED)
    const marker = drawn!.marker!
    const icon = drawn!.resume!
    const iconRight = Math.max(...[...icon.arm, ...icon.head].map((one) => one.x))
    expect(iconRight, 'premise: LF-11 stands the icon right of the marker').toBeGreaterThan(
      marker.centre.x + marker.radius,
    )
    expect(placed.labelX, 'icon right + S-32').toBeCloseTo(iconRight + S_32, 6)
  })

  const EVERY_TASK = [...PAST_THE_PLAN, ['stops inside the plan', STOPS_INSIDE]] as const

  it.each(EVERY_TASK)('%s: no S-63 / S-227 / S-228 combination moves the name, the occupancy or the band (MUST, MUST NOT)', (_row, task) => {
    const shown = sceneOf(task)
    const readingOf = (scene: ReturnType<typeof sceneOf>) => ({
      labelPlacement: scene.placed.labelPlacement,
      labelX: scene.placed.labelX,
      occupied: [scene.placed.occupiedX0, scene.placed.occupiedX1],
      stack: scene.placed.stack,
      band: scene.layout.rows[0]!.height,
    })
    for (const showing of EVERY_SHOWING) {
      const tag = JSON.stringify(showing)
      expect({ tag, ...readingOf(sceneOf(task, showing)) }).toEqual({ tag, ...readingOf(shown) })
    }
  })

  it.each(EVERY_TASK)('%s: in no combination does the drawn name lie over the drawn marker (MUST NOT)', (_row, task) => {
    let pairs = 0
    for (const showing of EVERY_SHOWING) {
      const { drawn } = sceneOf(task, showing)
      const marker = drawn?.marker ?? null
      const label = drawn?.label ?? null
      if (marker === null || label === null) continue
      pairs += 1
      const apart =
        label.x >= marker.centre.x + marker.radius ||
        label.x + label.width <= marker.centre.x - marker.radius ||
        label.y >= marker.centre.y + marker.radius ||
        label.y + label.height <= marker.centre.y - marker.radius
      expect({ showing: JSON.stringify(showing), apart }).toEqual({ showing: JSON.stringify(showing), apart: true })
    }
    expect(pairs, 'premise: some combination draws both').toBeGreaterThan(0)
  })
})

const S_4 = num('basePlanHeight')
const S_5 = num('actualOfPlan')
const S_7 = num('fontOfActual')
const S_13 = num('shapeHeightOf.rectangle')
const S_17 = num('shapeHeightOf.milestone')
const S_36 = num('rowTitleFont')
const S_38 = num('rowTitleTopScale')
const S_96 = NOT_STORED_ZOOM_STEP['S-96']

const DEPTH_1_ROW_NAME_PX = S_36 * S_38
const RECTANGLE_NAME_PX_AT_UNITY = S_4 * S_13 * S_5 * S_7
const MILESTONE_NAME_PX_AT_UNITY = S_4 * S_17 * S_5 * S_7
const ROW_CEILING_BY_TYPE = DEPTH_1_ROW_NAME_PX / RECTANGLE_NAME_PX_AT_UNITY
const CEILING_IF_MEASURED_ON_THE_MILESTONE = DEPTH_1_ROW_NAME_PX / MILESTONE_NAME_PX_AT_UNITY

const RAISE_ROWS: KeyInput = {
  kind: 'key',
  key: '+',
  modifiers: { ctrl: false, shift: false, alt: true, meta: false },
}

const documentOf = (schedule: Schedule, settings: DocumentSettings): Document =>
  ({
    schemaVersion: '1',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-26T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-08-26T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

function zoomYAfterRaise(schedule: Schedule, zoomY: number, env: ScreenEnvironment): number {
  const settings = settingsOf({ zoomY, scrollGroupId: 'g1' })
  const regions = regionsFromScreen(env, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const context: InputContext = {
    document: documentOf(schedule, settings),
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    zoomStep: S_96,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  }
  const action = commandFromInput(RAISE_ROWS, context).action
  if (action === null || action.kind !== 'changeDocument') throw new Error('SK-16a owes a changeDocument')
  const zooms = (action.writes as readonly (readonly DocumentCommand[])[])
    .flat()
    .filter((one) => one.kind === 'setZoom')
  expect(zooms, 'exactly one setZoom per press').toHaveLength(1)
  return (zooms[0] as unknown as Record<string, number>)['zoomY'] as number
}

const RECTANGLE_ROW = rowsOf([[spanning(1, '2026-01-05', 20)]])
const WITH_A_MILESTONE = rowsOf(
  [[spanning(1, '2026-01-05', 20)], [taskOf({ uid: 2, start: '2026-01-11', finish: '2026-01-11', milestone: true })]],
)
const SIX_LANES = rowsOf([Array.from({ length: 6 }, (_unused, index) => spanning(index + 1, '2026-01-05', 20))])

describe('FR-016 -- the row axis stops where a rectangle name reaches the depth-1 row name', () => {
  it('premise: S-36 x S-38 / (S-4 x S-13 x S-5 x S-7) is the 1.320 CR-381 and JDG-115 name', () => {
    expect(ROW_CEILING_BY_TYPE).toBeCloseTo(1.32, 3)
    const layout = layoutFromSchedule(RECTANGLE_ROW, settingsOf({ zoomY: ROW_CEILING_BY_TYPE }), REGIONS)
    expect(taskPlacement(layout, 1)!.labelFontSize, 'the rectangle name at that zoom').toBeCloseTo(
      DEPTH_1_ROW_NAME_PX,
      6,
    )
  })

  it('premise: under both ceilings one raise moves by S-53, and the tall band ceiling lies above 1.25 x S-53', () => {
    expect(S_96).toBeLessThan(ROW_CEILING_BY_TYPE)
    expect(zoomYAfterRaise(RECTANGLE_ROW, 1, TALL)).toBeCloseTo(S_96, 3)
    const settings = settingsOf({ zoomY: 1.25 * S_96 })
    const regions = regionsFromScreen(TALL, settings)
    expect(1.25 * S_96).toBeGreaterThan(ROW_CEILING_BY_TYPE)
    expect(tallestBand(layoutFromSchedule(RECTANGLE_ROW, settings, regions))).toBeLessThan(regions.rowArea.height)
  })

  it('a raise past the type ceiling stops at or under it (MUST)', () => {
    expect(zoomYAfterRaise(RECTANGLE_ROW, 1.25, TALL)).toBeLessThanOrEqual(ROW_CEILING_BY_TYPE + 1e-9)
  })

  it('a milestone on the page does not move the ceiling -- it is measured on the rectangle (MUST)', () => {
    const alone = zoomYAfterRaise(RECTANGLE_ROW, 1.25, TALL)
    const beside = zoomYAfterRaise(WITH_A_MILESTONE, 1.25, TALL)
    expect(CEILING_IF_MEASURED_ON_THE_MILESTONE).toBeLessThan(1.25)
    expect(beside).toBeCloseTo(alone, 10)
    expect(beside).toBeLessThanOrEqual(ROW_CEILING_BY_TYPE + 1e-9)
    expect(beside).toBeGreaterThan(CEILING_IF_MEASURED_ON_THE_MILESTONE)
  })

  it('the smaller of the two: a short Row Area stops the raise before the type ceiling (MUST)', () => {
    const bandAt = (zoomY: number): number =>
      tallestBand(layoutFromSchedule(SIX_LANES, settingsOf({ zoomY }), REGIONS))
    const [atUnity, afterRaise] = [bandAt(1), bandAt(S_96)]
    let env: ScreenEnvironment | null = null
    for (let height = 150; height <= 3000 && env === null; height += 1) {
      const tried = { ...ENV, height }
      const area = regionsFromScreen(tried, settingsOf()).rowArea.height
      if (area >= atUnity && area < afterRaise) env = tried
    }
    if (env === null) throw new Error('no window height puts the band ceiling between 1 and S-53')
    const regions = regionsFromScreen(env, settingsOf())
    const answered = zoomYAfterRaise(SIX_LANES, 1, env)
    expect(answered).toBeLessThan(ROW_CEILING_BY_TYPE)
    expect(bandAt(answered), 'the tallest band does not pass the Row Area').toBeLessThanOrEqual(
      regions.rowArea.height + 1e-6,
    )
  })
})

describe('T-201 S-17 -- a milestone is 1.25 of its plan height (CR-381, JDG-110, JDG-115)', () => {
  it('the manuscript and the generated default both hold 1.25', () => {
    expect(S_17).toBe(1.25)
    const row = specTable('T-201').rows.find((one) => one.id === 'S-17')
    expect(row?.by['既定値'] ?? '').toContain('1.25')
  })

  it('a milestone name at unity is S-4 x S-17 x S-5 x S-7 and does not pass the depth-1 row name', () => {
    const layout = layoutFromSchedule(
      rowsOf([[taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true, name: 'm' })]]),
      settingsOf({ zoomY: 1 }),
      REGIONS,
    )
    expect(taskPlacement(layout, 1)!.labelFontSize).toBeCloseTo(MILESTONE_NAME_PX_AT_UNITY, 6)
    expect(MILESTONE_NAME_PX_AT_UNITY).toBeLessThanOrEqual(DEPTH_1_ROW_NAME_PX)
  })
})

describe('T-201 S-12 / T-221 LF-3 -- rows sit without a gap (CR-384, JDG-93, JDG-108)', () => {
  it('S-12 is fixed at 0 -- default, lower bound and upper bound', () => {
    expect(SETTINGS_DEFAULTS['rowGap']).toBe(0)
    expect(SETTINGS_BOUNDS['rowGap']).toEqual({ min: 0, max: 0 })
  })

  it('LF-3: each row starts where the band above it ends, whatever the depth or content', () => {
    const layout = layoutFromSchedule(
      rowsOf([[spanning(1, '2026-01-01', 20)], [spanning(2, '2026-01-01', 20), spanning(3, '2026-01-05', 20)], []]),
      settingsOf(),
      REGIONS,
    )
    expect(layout.rows).toHaveLength(3)
    for (let at = 1; at < layout.rows.length; at += 1) {
      expect(layout.rows[at]!.y - layout.rows[at - 1]!.y, `row ${at + 1}`).toBe(layout.rows[at - 1]!.height)
    }
  })

  it('T-023d: S-176 is a fraction of the pitch, and the pitch is now the band itself (MUST)', () => {
    const schedule = rowsOf([[spanning(1, '2026-01-01', 20)], [spanning(2, '2026-01-01', 20)], []])
    const topOf = (offset: number): number =>
      layoutFromSchedule(schedule, settingsOf({ scrollGroupId: 'g1', scrollGroupOffset: offset }), REGIONS).rows[0]!.y
    const layout = layoutFromSchedule(schedule, settingsOf({ scrollGroupId: 'g1', scrollGroupOffset: 0 }), REGIONS)
    const pitch = layout.rows[1]!.y - layout.rows[0]!.y
    expect(pitch, 'pitch = band + S-12 = band').toBe(layout.rows[0]!.height)
    expect(topOf(0) - topOf(0.5)).toBeCloseTo(pitch / 2, 6)
  })
})
