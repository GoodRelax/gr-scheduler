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
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type BarGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import * as scheduleLayoutModule from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
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
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import * as screenRendererModule from '../../src/adapter/screen-renderer/screen-renderer'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  commandFromInput,
  NOT_STORED_ZOOM_STEP,
  type InputContext,
  type KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const OC_10_LOWERED_BY_THE_LABEL =
  'てのみ、名称ラベルが縦に取る高さと `_assets/tbl-settings.md` の 表 T-206 の `S-196` を、予定の縦幅（形状の比を掛けた予定の帯）の上端の上に数え、形状をそのぶん段の上端から下げて置くこと（MUST）'

const OC_10_HEIGHT_IS_THE_FONT_SIZE =
  '⭐ 名称ラベルが縦に取る高さは、字の大きさ（`FR-094` の縦の寸法）そのものとすること（MUST）'

const OC_10_NOT_THE_S_233_RATIO =
  '⛔ 同表の `S-233` の比を掛けて数えてはならない（MUST NOT）'

const OC_10_LABEL_SITS_ON_THE_LINE_EDGE =
  '⭐ ラベルの下端（数えた高さの下端）から `S-196` だけ下に、予定の線の上の縁を置くこと（MUST）'

const OC_10_BASELINE_BELOW_THE_CENTRE =
  '⭐ 字の基線は、数えた高さの縦の中央から、字の大きさに `_assets/tbl-settings.md` の 表 T-201 の `S-33` を掛けたぶん下に置くこと（MUST）'

const OC_10_WITH_OR_WITHOUT_A_NAME =
  '⭐ `S-196` と `S-233` を持って他のコンポーネントへ渡すのは `05-07-design.md` の 表 T-064 の `PI-5` である。⚠️ 段割当の重なりに当てはめないことは `OC-6` と同じである。⭐ 名前の有無によらず数えること（MUST）'

const T_273_WIDTH_FROM_THE_MARKER =
  '⭐ 「入る」とは、（マーカーを出すなら マーカーの径 ＋ `S-32`、出さないなら `S-31`）＋ 名前の幅 ＋ 実績の終了の内側の幅（表 T-206 の `S-260`）が、基準の幅以下であることとすること（MUST）。'

const T_013_COUNTED_IN_THE_BASE_COMBINATION =
  'ならない（MUST NOT） —— 状態の記号も名前も読めなくなる。⭐ マーカーの位置は、いまの予実の表示の組（同書の 表 T-202 の `S-227` / `S-228`）によらず、基準の組で立つ位置で数えること（MUST）'

const T_273_FADE_OR_MARKER_WHICHEVER_IS_RIGHT =
  'マーカーを出すときは、`fadeIn` が終わる位置とマーカーの右端 ＋ `S-32` の遠いほうから書くこと（MUST）。'

const T_273_FADE_IN_END_IS_THE_BOX_LEFT =
  '⭐ 基準が予定（`RF-3`）のときは、フェードを除いた幅で「入る」を数え、名前は `fadeIn` が終わる位置から書くこと（MUST）。'

const T_273_BOTH_FADE_AND_MARKER_WIDTH =
  '⭐ 基準が予定（`RF-3`）のときは、フェードを除いた幅で「入る」を数え、名前は `fadeIn` が終わる位置から書くこと（MUST）。'

const FR_002_WRITE_START_IS_T_273 =
  '⭐ 字を書き出す位置は `FR-109` の 表 T-273 が持つ（`_assets/tbl-settings.md` の 表 T-201 の `S-31` ／ `S-32` ／ `S-301` のいずれか 1 つを、基準の端か進捗マーカーの右端に足した位置）。'

const T_273_FITS_WITH_S_31 =
  '⭐ 「入る」とは、（マーカーを出すなら マーカーの径 ＋ `S-32`、出さないなら `S-31`）＋ 名前の幅 ＋ 実績の終了の内側の幅（表 T-206 の `S-260`）が、基準の幅以下であることとすること（MUST）。'

const FR_002_S_31_NOT_TWICE =
  '⛔ その値を 2 回数えてはならない（MUST NOT） —— 同表が与えるのは基準の端から**字そのもの**までの長さであり、箱の内側の余白ではない。'

const FR_049_THE_ACCIDENT_IS_NAME_OCCUPANCY_AND_BAND =
  '⛔ 隠したものを占有から外してはならない（MUST NOT） —— 外すと、予定だけ・実績だけの表示に切り替えるたびに名称ラベルの位置と、`OC-1` を経た占有幅と、行の帯高が動き、段が組み替わる。⚠️ 進捗マーカーを描く位置は本段の対象ではない —— 表示の組で決めるのは `FR-013` であり、予定だけの表示ではマーカーは予定バーの右端の外側へ移る。'

const T_273_LP_2_ROW_AT_THE_REFERENCE_END =
  '| LP-2 | `===` | 出す | 入らない | 基準の終了のすぐ右 | マーカーの右端 ＋ `S-32` |'

const T_273_LP_4_NO_MARKER_OUTSIDE =
  '| LP-4 | `===` | 出さない | 入らない | — | 基準の終了 ＋ `S-31`（形の外へ）|'

const T_273_LP_1_ROW_AT_THE_REFERENCE_START =
  '| LP-1 | `===` | 出す | 入る | 基準の開始 | マーカーの右端 ＋ `S-32` |'

const T_273_LP_3_NO_MARKER_INSIDE =
  '| LP-3 | `===` | 出さない | 入る | — | 基準の開始 ＋ `S-31` |'

const T_273_DATED_ICON_IS_NOT_IN_THE_ROW =
  '⚠️ 再開日が先のときは 実績 → マーカー → 名前 …（破線）… アイコン となり、破線は札の下を通る。'

const T_273_NO_OTHER_ROOM =
  '⭐ 矩形で「入らない」とき、札（マーカーと名前）は実績のすぐ右に置き、その並びが再開アイコンに届くときだけ、アイコンの掴む箱（表 T-266 の `GA-20`）の右端から並べること（MUST）。'

const T_243_NO_NEW_SETTING =
  '） —— ① が形状の中に立つときに ① のぶんを足したり、マーカーと再開アイコンの幅を一定の量として足したりすると、名称ラベルが形状から離れて立ち、どのタスクの名前かが読みにくくなる。⭐ 新しい設定値を立ててはならない（MUST NOT）'

const T_273_PA_4_COUNTS_THE_ICON =
  '⚠️ 未定のアイコンは実績のすぐ右に立つので、いつも 実績 → アイコン → マーカー → 名前 になる。'

const FR_049_HIDDEN_KEEPS_ITS_OCCUPANCY =
  'すたびに行が伸び縮みすると、見ている場所が動く。⭐ `S-227` / `S-228` で隠した予定・実績・実績のダミーは、占有（表 T-038 の算入と、名称ラベルの位置の数え方）をそのまま残し、描かず、当たり判定から外すこと（MUST）'

const FR_049_HIDDEN_NOT_TAKEN_OUT =
  '⛔ 隠したものを占有から外してはならない（MUST NOT）'

const FR_049_THE_DRAWN_LABEL_DOES_MOVE =
  '⭐ 動かないのは占有と帯高であり、動くのは描く位置である'

const FR_016_ROW_CEILING_IS_THE_SMALLER =
  'ちょうど埋めた先には、見せられるものが残っていない。**⛔ **このために新しい設定値の行を立ててはならない（MUST NOT）** —— **画面の高さから導く。**⭐ 行の軸の上限は、上の倍率と、次の倍率の小さい方とすること（MUST）'

const FR_016_MEASURED_ON_THE_RECTANGLE =
  'ets/tbl-settings.md` の 表 T-201 の `S-13`）のタスクの名称ラベルの字が、深さ 1 の行の名前の字（同表の `S-36` × `S-38`）に等しくなる倍率である。⭐ 形状によらず矩形で測ること（MUST）'

const FR_016_SOLVED_FOR_THE_ZOOM =
  'ること（MUST） —— 描かれている形状で測ると、マイルストーンを 1 つ置いただけで上限が動く。⭐ その倍率は、矩形の名称ラベルの字の式（`FR-077` と `FR-094` の縦の寸法の鎖）を倍率について解いて求めること（MUST）'

const FR_016_NOT_FROM_THE_RATIO =
  'いただけで上限が動く。⭐ その倍率は、矩形の名称ラベルの字の式（`FR-077` と `FR-094` の縦の寸法の鎖）を倍率について解いて求めること（MUST）。⛔ いまの字の大きさといまの倍率の比から求めてはならない（MUST NOT）'

const FR_016_FLOOR_ONLY_STOPS_WHERE_THE_FLOOR_LETS_GO =
  ' `FR-094` の予定の縦幅の床で止まるので、止まっている倍率では字が倍率に比例しない。⭐ 床だけで矩形の名前の字が既に深さ 1 の行の名前の字以上になる設定の組では、その倍率を、床が外れて字が大きくなり始める倍率とすること（MUST）'

const FR_016_ASK_BOTH_COPY_NEITHER =
  'の持ち主は `05-07-design.md` の 表 T-064 の `PI-5` であり、深さ 1 の行の名前の字は同表の `PI-37` が答える —— 上限を求める側は 2 つを問い、どちらの式も写してはならない（MUST NOT）'

const FR_016_TALLEST_BAND_ASKED_OF_PI_5 =
  '表の `PI-37` が答える —— 上限を求める側は 2 つを問い、どちらの式も写してはならない（MUST NOT）。⭐ いちばん高い行の帯も、同表の `PI-5` の `rowPlacesAtZoomY` に問うて求めること（MUST）'

const T_023D_FRACTION_OF_THE_PITCH =
  '⛔ その端数は、行の帯の高さではなく、行が占める送り（帯の高さと、その下の隙間を合わせた長さ）に対する比とすること（MUST）'

const T_273_INSIDE_THE_ACTUAL =
  '⭐ 終了側だけを取り置くのは、マーカーが実績の開始の掴み代の上に立つ設計だからである —— 開始側は取り置かない。'

const T_273_INSIDE_HOW_THEY_STAND =
  '⚠️ 「入る」ときは、マーカーと名前は実績の中、アイコンは実績の右に立つ —— 「入る」の判定は実績の幅のままとし、アイコンの幅を足さない（MUST NOT）。'

const T_273_MARKER_BEFORE_NAME =
  '⛔ 名称ラベルをマーカーの左に置いてはならない（MUST NOT） —— どの行でも左から マーカー → 名前 の順である。'

const T_267_MARKER_STANDS_WHERE_T_273_PUTS_IT =
  'マーカーは `FR-109` の 表 T-273 が置く所に立つので、入らないとき（`LP-2`）は基準の終了のすぐ右に来る'

const T_273_INSIDE_WITH_THE_MARKER_HIDDEN =
  '⭐ 「入る」とは、（マーカーを出すなら マーカーの径 ＋ `S-32`、出さないなら `S-31`）＋ 名前の幅 ＋ 実績の終了の内側の幅（表 T-206 の `S-260`）が、基準の幅以下であることとすること（MUST）。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['T-038 OC-10 (MUST) -- the label height and S-196 are counted above the plan strip', OC_10_LOWERED_BY_THE_LABEL],
  ['T-038 OC-10 (MUST) -- the counted height is the font size itself', OC_10_HEIGHT_IS_THE_FONT_SIZE],
  ['T-038 OC-10 (MUST NOT) -- the S-233 ratio is not multiplied in', OC_10_NOT_THE_S_233_RATIO],
  ['T-038 OC-10 (MUST) -- S-196 runs from the counted bottom to the plan line edge', OC_10_LABEL_SITS_ON_THE_LINE_EDGE],
  ['T-038 OC-10 (MUST) -- the baseline is S-33 x font below the counted centre', OC_10_BASELINE_BELOW_THE_CENTRE],
  ['T-038 OC-10 (MUST) -- counted whether or not the task has a name', OC_10_WITH_OR_WITHOUT_A_NAME],
  ['FR-049 (MUST NOT) -- the accident is the name, the occupancy and the band, not where the marker is drawn', FR_049_THE_ACCIDENT_IS_NAME_OCCUPANCY_AND_BAND],
  ['FR-049 (MUST) -- a hidden plan or actual keeps its occupancy', FR_049_HIDDEN_KEEPS_ITS_OCCUPANCY],
  ['FR-049 (MUST NOT) -- a hidden thing is not taken out of the occupancy', FR_049_HIDDEN_NOT_TAKEN_OUT],
  ['FR-049 -- what stays is the occupancy and the band, what moves is where it is drawn', FR_049_THE_DRAWN_LABEL_DOES_MOVE],
  ['FR-016 (MUST) -- the row ceiling is the smaller of the two', FR_016_ROW_CEILING_IS_THE_SMALLER],
  ['FR-016 (MUST) -- measured on the rectangle whatever is drawn', FR_016_MEASURED_ON_THE_RECTANGLE],
  ['FR-016 (MUST) -- the zoom is solved from the font formula', FR_016_SOLVED_FOR_THE_ZOOM],
  ['FR-016 (MUST NOT) -- not from the ratio of the present font and zoom', FR_016_NOT_FROM_THE_RATIO],
  ['FR-016 (MUST) -- a floor-only combination stops where the floor lets go', FR_016_FLOOR_ONLY_STOPS_WHERE_THE_FLOOR_LETS_GO],
  ['FR-016 (MUST NOT) -- the ceiling asks PI-5 and PI-37 and copies neither formula', FR_016_ASK_BOTH_COPY_NEITHER],
  ['FR-016 (MUST) -- the tallest band is asked of PI-5 rowPlacesAtZoomY', FR_016_TALLEST_BAND_ASKED_OF_PI_5],
  ['T-023d (MUST) -- S-176 is a fraction of the pitch', T_023D_FRACTION_OF_THE_PITCH],
  ['T-273 (MUST NOT) -- the name never stands left of the marker', T_273_MARKER_BEFORE_NAME],
  ['HT-3 -- the marker stands where table T-273 puts it', T_267_MARKER_STANDS_WHERE_T_273_PUTS_IT],
  ['FR-002 -- the write start is what table T-273 gives', FR_002_WRITE_START_IS_T_273],
  ['FR-002 (MUST NOT) -- S-31 is not counted twice, it is not a box padding', FR_002_S_31_NOT_TWICE],
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

// see FR-039, T-252
const DRAWN_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...NESTED_DEFAULTS,
    displayScale: DEFAULT_DISPLAY_SCALE,
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

const dayPlus = (from: string, days: number): string =>
  new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000).toISOString().slice(0, 10)

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

const centreLineOf = (bar: BarGeometry | null): number => {
  if (bar === null || bar.form !== 'line') throw new Error('a lifted shape draws its plan as a line')
  return (bar.from.y + bar.to.y) / 2
}

const tallestBand = (layout: ScheduleLayout): number => Math.max(...layout.rows.map((row) => row.height))

const drawnOf = (
  schedule: Schedule,
  settings: DocumentSettings,
): { layout: ScheduleLayout; tasks: readonly TaskGeometry[] } => {
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  return { layout, tasks: geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection()).tasks }
}

const S_196_ROW = specTable('T-206').rows.find((one) => one.id === 'S-196')
const S_196 = Number.parseFloat(S_196_ROW?.by['既定'] ?? 'NaN')
const S_233_ROW = specTable('T-206').rows.find((one) => one.id === 'S-233')
const S_233 = Number.parseFloat(S_233_ROW?.by['既定'] ?? 'NaN')

const S_4 = num('basePlanHeight')
const S_5 = num('actualOfPlan')
const S_6 = num('actualMin')
const S_7 = num('fontOfActual')
const S_8 = num('fontMin')
const S_13 = num('shapeHeightOf.rectangle')
const S_15 = num('shapeHeightOf.arrow')
const S_16 = num('shapeHeightOf.endpointSpan')
const S_17 = num('shapeHeightOf.milestone')
const S_304 = num('thinStrokeWidth')
const S_306 = num('thinArrowHeadHeight')
const S_307 = num('spanDotSize')
const S_33 = num('labelBaseline')

const PLAN_HEIGHT_FLOOR_PX = S_6 / S_5
// see T-252
const planStripOf = (ratio: number, zoomY: number): number =>
  Math.max(PLAN_HEIGHT_FLOOR_PX, S_4 * zoomY) * ratio * DRAWN_RATIO
// see T-271, LF-8
const thinStrokeOf = (): number => S_304 * DRAWN_RATIO
// see XS-5
const planLineTopOf = (drawn: TaskGeometry): number => centreLineOf(drawn.plan) - thinStrokeOf() / 2
const LIFTED_RATIO: Readonly<Record<string, number>> = { arrow: S_15, endpointSpan: S_16 }

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

  it('premise (CR-380 decision 8): S-196 is 2px in table T-206, and PI-5 publishes it as NOT_STORED_LABEL_SIZES', () => {
    expect(S_196).toBe(2)
    const published = (scheduleLayoutModule as Record<string, unknown>)['NOT_STORED_LABEL_SIZES'] as
      | Record<string, unknown>
      | undefined
    expect(published?.['S-196'], 'T-064 PI-5 owns NOT_STORED_LABEL_SIZES').toBe(S_196)
  })

  it.each(ZOOMS)('premise at zoomY %s: arrow head and span dot stay inside half the plan strip, so the figure top is inside the counted strip', (zoomY) => {
    for (const shapeKind of LIFTED) {
      const strip = planStripOf(LIFTED_RATIO[shapeKind]!, zoomY)
      const stroke = thinStrokeOf()
      const reach = Math.max((S_306 * DRAWN_RATIO) / 2, (S_307 * DRAWN_RATIO) / 2, stroke / 2)
      expect(reach, `${shapeKind}: max(S-306 / 2, S-307 / 2, stroke / 2) <= strip / 2`).toBeLessThanOrEqual(strip / 2)
    }
  })

  const sceneAt = (
    shapeKind: string,
    name: string | null,
    zoomY: number,
  ): { layout: ScheduleLayout; tasks: readonly TaskGeometry[]; svg: string } => {
    const schedule = liftedRows(shapeKind, name)
    const settings = settingsOf({ zoomY })
    const layout = layoutFromSchedule(schedule, settings, REGIONS)
    const geometry = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection())
    const svg = svgFromSchedule(schedule, settings, layout, geometry, REGIONS, emptySelection(), 'screen')
    return { layout, tasks: geometry.tasks, svg }
  }

  const countedOf = (layout: ScheduleLayout, uid: number): { fontPx: number; heightPx: number } => {
    const placed = taskPlacement(layout, uid)
    if (placed === null) throw new Error(`task ${uid} was not placed`)
    return { fontPx: placed.labelFontSize, heightPx: placed.labelFontSize }
  }

  const nameTextAttributeOf = (svg: string, uid: number, attribute: string): string | null => {
    const figure = svg.indexOf(`data-figure="task-${uid}-label"`)
    const opened = figure < 0 ? -1 : svg.lastIndexOf('<text ', figure)
    if (opened < 0) throw new Error(`task ${uid}: the name label was not drawn as a text`)
    const found = new RegExp(`\\s${attribute}="([^"]*)"`).exec(svg.slice(opened, svg.indexOf('>', figure)))
    return found === null ? null : (found[1] ?? null)
  }

  it('premise (CR-380 decision 11): S-233 is 1.5 in table T-206, and PI-5 publishes it beside S-196 in NOT_STORED_LABEL_SIZES', () => {
    expect(S_233).toBe(1.5)
    const published = (scheduleLayoutModule as Record<string, unknown>)['NOT_STORED_LABEL_SIZES'] as
      | Record<string, unknown>
      | undefined
    expect(published?.['S-233'], 'T-064 PI-5 owns NOT_STORED_LABEL_SIZES').toBe(S_233)
  })

  it('premise (CR-430): at zoomY 1 an arrow name sits on the S-8 floor x the drawn ratio, so (S-8 + S-196) x the ratio is 14 x the ratio where the S-233 ratio would have given 20 x the ratio', () => {
    const { layout } = sceneAt('arrow', 'ab', 1)
    const { fontPx, heightPx } = countedOf(layout, 1)
    expect(
      fontPx,
      'FR-077: 可読の下限は S-8 × 描く比であり、矢印の名前は zoomY 1 でその床に立つ',
    ).toBeCloseTo(S_8 * DRAWN_RATIO, 9)
    expect(heightPx + S_196 * DRAWN_RATIO, '(S-8 + S-196) × 描く比').toBeCloseTo(
      14 * DRAWN_RATIO,
      9,
    )
    expect(
      fontPx * S_233 + S_196 * DRAWN_RATIO,
      'the forbidden count, (S-8 × S-233 + S-196) × 描く比',
    ).toBeCloseTo(20 * DRAWN_RATIO, 9)
  })

  it.each(LIFTED)('%s: lane top + font + S-196 is the plan line upper edge, and lane top + font x S-233 + S-196 is not (MUST, MUST NOT)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const { layout, tasks } = sceneAt(shapeKind, 'ab', zoomY)
      for (const [index, uid] of [[0, 1], [1, 2]] as const) {
        const tag = `zoomY ${zoomY}, row ${index + 1}`
        const laneTop = layout.rows[index]!.stackTops[0]!
        const drawn = tasks.find((one) => one.taskUid === uid)!
        const { fontPx, heightPx } = countedOf(layout, uid)
        const lineTop = planLineTopOf(drawn)
        expect(lineTop, `${tag}: line upper edge = lane top + font + S-196 x 描く比; ${OC_10_HEIGHT_IS_THE_FONT_SIZE}`)
          .toBeCloseTo(laneTop + heightPx + S_196 * DRAWN_RATIO, 6)
        expect(lineTop, `${tag}: ${OC_10_NOT_THE_S_233_RATIO}`)
          .not.toBeCloseTo(laneTop + fontPx * S_233 + S_196 * DRAWN_RATIO, 6)
      }
    }
  })

  it.each(LIFTED)('%s: the counted height ends S-196 above the plan line, holds the label box at its centre, and stays in the band (MUST)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const { layout, tasks } = sceneAt(shapeKind, 'ab', zoomY)
      for (const [index, uid] of [[0, 1], [1, 2]] as const) {
        const tag = `zoomY ${zoomY}, row ${index + 1}`
        const row = layout.rows[index]!
        const drawn = tasks.find((one) => one.taskUid === uid)!
        const label = drawn.label!
        const { heightPx } = countedOf(layout, uid)
        const lineTop = planLineTopOf(drawn)
        const countedBottom = lineTop - S_196 * DRAWN_RATIO
        const countedTop = countedBottom - heightPx
        expect(extentOf(drawn.plan).top, `${tag}: premise, the drawn end mark reaches above the line edge`)
          .toBeLessThanOrEqual(lineTop + 1e-9)
        expect(label.y + label.height / 2, `${tag}: label centre = line edge - S-196 - font / 2; ${OC_10_LABEL_SITS_ON_THE_LINE_EDGE}`)
          .toBeCloseTo(countedBottom - heightPx / 2, 6)
        expect(label.y, `${tag}: label top = counted top + (font - label height) / 2, inside the counted height`)
          .toBeGreaterThanOrEqual(countedTop - 1e-9)
        expect(label.y + label.height, `${tag}: label bottom inside the counted height, whose bottom is line edge - S-196`)
          .toBeLessThanOrEqual(countedBottom + 1e-9)
        expect(countedTop, `${tag}: counted top = line edge - S-196 - font stays in the band; ${OC_10_LOWERED_BY_THE_LABEL}`)
          .toBeGreaterThanOrEqual(row.y - 1e-9)
      }
      expect(tasks.find((one) => one.taskUid === 1)!.label!.y, 'the top row keeps its label in the Row Area')
        .toBeGreaterThanOrEqual(REGIONS.rowArea.y - 1e-9)
    }
  })

  it.each(LIFTED)('%s: the name baseline is the counted centre + S-33 x font (MUST)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const { layout, tasks, svg } = sceneAt(shapeKind, 'ab', zoomY)
      for (const uid of [1, 2] as const) {
        const tag = `zoomY ${zoomY}, task ${uid}`
        const drawn = tasks.find((one) => one.taskUid === uid)!
        const { fontPx, heightPx } = countedOf(layout, uid)
        const countedCentre = planLineTopOf(drawn) - S_196 * DRAWN_RATIO - heightPx / 2
        expect(nameTextAttributeOf(svg, uid, 'dominant-baseline'), `${tag}: premise, y is the alphabetic baseline`).toBeNull()
        expect(nameTextAttributeOf(svg, uid, 'alignment-baseline'), `${tag}: premise, y is the alphabetic baseline`).toBeNull()
        const written = nameTextAttributeOf(svg, uid, 'y') ?? 'NaN'
        const halfOfLastWrittenPlace = 0.5 * 10 ** -(written.split('.')[1] ?? '').length
        const expectedBaseline = countedCentre + S_33 * fontPx
        expect(
          Math.abs(Number(written) - expectedBaseline),
          `${tag}: drawn y ${written} against line edge - S-196 - font / 2 + S-33 x font = ${expectedBaseline}; ${OC_10_BASELINE_BELOW_THE_CENTRE}`,
        ).toBeLessThanOrEqual(halfOfLastWrittenPlace + 1e-9)
      }
    }
  })

  it.each(LIFTED)('%s: taking the name away moves neither the band nor the shape (MUST)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const named = drawnOf(liftedRows(shapeKind, 'ab'), settingsOf({ zoomY }))
      const nameless = drawnOf(liftedRows(shapeKind, null), settingsOf({ zoomY }))
      expect(nameless.tasks[0]!.label, 'premise: nothing is written for a task with no name').toBeNull()
      expect(nameless.layout.rows.map((row) => [row.y, row.height]), OC_10_WITH_OR_WITHOUT_A_NAME).toEqual(
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
const PLAN_ONLY: Showing = { marks: true, plan: true, actual: false }
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
const STOPS_ONE_DAY_SHORT = spanning(1, '2026-02-02', 20, {
  name: OUTSIDE_NAME,
  percentComplete: 40,
  actualStart: '2026-02-02',
  stop: dayPlus('2026-02-02', 18),
  resumeValid: true,
})
const DATED_AND_INSIDE = spanning(1, '2026-02-02', 20, {
  name: OUTSIDE_NAME,
  percentComplete: 40,
  actualStart: '2026-02-02',
  stop: '2026-02-06',
  resume: '2026-02-16',
  resumeValid: true,
})
const UNDATED_AND_INSIDE = spanning(1, '2026-02-02', 20, {
  name: OUTSIDE_NAME,
  percentComplete: 40,
  actualStart: '2026-02-02',
  stop: '2026-02-06',
  resume: null,
  resumeValid: false,
})
const NAME_INSIDE = spanning(1, '2026-02-02', 40, {
  name: 'ab',
  percentComplete: 40,
  actualStart: '2026-02-02',
  stop: '2026-02-21',
  resumeValid: true,
})

const sceneOf = (
  task: Task,
  showing: Showing = SHOWN,
  part: Record<string, unknown> = {},
): { layout: ScheduleLayout; placed: TaskPlacement; drawn: TaskGeometry | null } => {
  const settings = settingsOf({
    progressMarkerVisible: showing.marks,
    planVisible: showing.plan,
    actualVisible: showing.actual,
    assigneeVisible: false,
    percentCompleteVisible: false,
    ...part,
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
const S_30 = num('labelCoef')
const S_32 = num('labelGap')
const S_260 = NOT_STORED_SIZES['S-260']
const RESUME_GRAB_MARGIN = NOT_STORED_SIZES['S-286']

// see T-273, T-252
const MARKER_REACH = S_22 * DRAWN_RATIO
// see FR-013, LF-11, T-252
const MARKER_REACH_OFF_THE_ACTUAL = S_22 * DRAWN_RATIO
// see T-252
const MARKER_SIZE_DRAWN = S_22 * DRAWN_RATIO
// see T-252
const LABEL_GAP_DRAWN = S_32 * DRAWN_RATIO

const markerRightOf = (drawn: TaskGeometry | null): number => {
  const marker = drawn?.marker ?? null
  if (marker === null) throw new Error('no marker was drawn')
  return marker.centre.x + marker.radius
}

const iconRightOf = (drawn: TaskGeometry | null): number => {
  const icon = drawn?.resume ?? null
  if (icon === null) throw new Error('no resume icon was drawn')
  return Math.max(...[...icon.arm, ...icon.head].map((one) => one.x))
}

const shapeRightOf = (placed: TaskPlacement): number => Math.max(placed.x + placed.width, placed.actualReach ?? -Infinity)

describe('T-273 LP-2 / LP-4 -- the row stands just right of the reference the name did not fit', () => {
  const PAST_THE_PLAN = [
    ['PA-2', IN_PROGRESS, 0],
    ['PA-3', RESUME_DATED, 0],
    ['PA-4', RESUME_UNDATED, MARKER_SIZE_DRAWN + RESUME_GRAB_MARGIN],
  ] as const

  it.each(PAST_THE_PLAN)('%s premise: the name does not fit, so LP-2 stands the marker at the reference end', (_row, task, iconRoom) => {
    const { placed, drawn } = sceneOf(task)
    expect(placed.labelPlacement).toBe('right')
    expect(placed.actualReach).not.toBeNull()
    expect(placed.actualReach!).toBeGreaterThan(placed.x + placed.width + MARKER_REACH)
    expect(markerRightOf(drawn) - MARKER_SIZE_DRAWN, T_273_LP_2_ROW_AT_THE_REFERENCE_END).toBeCloseTo(
      placed.actualReach! + iconRoom,
      6,
    )
  })

  it('PA-2: the name starts at actual right + S-22 + S-32, from existing settings only (MUST)', () => {
    const { placed } = sceneOf(IN_PROGRESS)
    expect(placed.labelX, T_243_NO_NEW_SETTING).toBeCloseTo(placed.actualReach! + MARKER_REACH_OFF_THE_ACTUAL + LABEL_GAP_DRAWN, 6)
  })

  it('PA-3: a resume icon standing on its own day takes no room in the order (MUST NOT)', () => {
    for (const task of [RESUME_DATED, DATED_AND_INSIDE]) {
      const { placed, drawn } = sceneOf(task)
      expect(drawn!.resume, 'premise: FR-044 draws the icon while suspended').not.toBeNull()
      expect(placed.labelX, T_273_DATED_ICON_IS_NOT_IN_THE_ROW).toBeCloseTo(
        placed.actualReach! + MARKER_SIZE_DRAWN + LABEL_GAP_DRAWN,
        6,
      )
    }
  })

  it('an actual one day short of the plan end: the row follows the ACTUAL, not the plan right (MUST NOT)', () => {
    const both = sceneOf(STOPS_ONE_DAY_SHORT)
    const shapeRight = shapeRightOf(both.placed)
    expect(both.layout.pxPerDay, 'premise: one day is narrower than S-22').toBeLessThan(MARKER_SIZE_DRAWN)
    expect(both.placed.actualReach!, 'premise: the actual stops short of the plan right').toBeLessThan(shapeRight)
    expect(markerRightOf(both.drawn) - MARKER_SIZE_DRAWN, T_273_LP_2_ROW_AT_THE_REFERENCE_END)
      .toBeCloseTo(both.placed.actualReach!, 6)
    expect(both.placed.labelX, T_273_LP_2_ROW_AT_THE_REFERENCE_END)
      .toBeCloseTo(both.placed.actualReach! + MARKER_SIZE_DRAWN + LABEL_GAP_DRAWN, 6)
    expect(both.placed.labelX, T_273_NO_OTHER_ROOM)
      .not.toBeCloseTo(shapeRight + MARKER_SIZE_DRAWN + LABEL_GAP_DRAWN, 6)
  })

  it('an actual that stops well inside the plan writes its name over the plan bar (MUST)', () => {
    const both = sceneOf(STOPS_INSIDE)
    expect(both.placed.labelPlacement, 'premise: the name does not fit the short actual').toBe('right')
    expect(both.placed.labelX, T_273_LP_2_ROW_AT_THE_REFERENCE_END)
      .toBeCloseTo(both.placed.actualReach! + MARKER_SIZE_DRAWN + LABEL_GAP_DRAWN, 6)
    expect(both.placed.labelX, `${T_273_NO_OTHER_ROOM} -- the plan right is not consulted`)
      .toBeLessThan(shapeRightOf(both.placed))
  })

  it('PA-4, actual past the plan: the undated icon stands between the actual and the marker (MUST)', () => {
    const { placed, drawn } = sceneOf(RESUME_UNDATED)
    expect(iconRightOf(drawn), 'premise: LF-13 draws the undated icon inside the grab box it keeps')
      .toBeLessThanOrEqual(placed.actualReach! + MARKER_SIZE_DRAWN + RESUME_GRAB_MARGIN + 1e-9)
    expect(markerRightOf(drawn) - MARKER_SIZE_DRAWN, T_273_PA_4_COUNTS_THE_ICON)
      .toBeCloseTo(placed.actualReach! + MARKER_SIZE_DRAWN + RESUME_GRAB_MARGIN, 6)
    expect(placed.labelX, T_273_PA_4_COUNTS_THE_ICON).toBeCloseTo(markerRightOf(drawn) + LABEL_GAP_DRAWN, 6)
  })

  it('PA-4, actual inside the plan: the same order stands, and the plan right is not consulted (MUST)', () => {
    const both = sceneOf(UNDATED_AND_INSIDE)
    expect(both.placed.actualReach!, 'premise: the actual stops inside the plan').toBeLessThan(shapeRightOf(both.placed))
    expect(markerRightOf(both.drawn) - MARKER_SIZE_DRAWN, T_273_PA_4_COUNTS_THE_ICON)
      .toBeCloseTo(both.placed.actualReach! + MARKER_SIZE_DRAWN + RESUME_GRAB_MARGIN, 6)
    expect(both.placed.labelX, T_273_PA_4_COUNTS_THE_ICON)
      .toBeCloseTo(markerRightOf(both.drawn) + LABEL_GAP_DRAWN, 6)
  })

  const EVERY_TASK = [
    ['PA-2', IN_PROGRESS],
    ['PA-3', RESUME_DATED],
    ['PA-4', RESUME_UNDATED],
    ['stops inside the plan', STOPS_INSIDE],
    ['stops one day short', STOPS_ONE_DAY_SHORT],
    ['PA-4 inside the plan', UNDATED_AND_INSIDE],
    ['name written inside', NAME_INSIDE],
  ] as const

  it.each(EVERY_TASK)('%s: no S-227 / S-228 combination moves the name, the occupancy or the band (MUST, MUST NOT)', (_row, task) => {
    const shown = sceneOf(task)
    const readingOf = (scene: ReturnType<typeof sceneOf>) => ({
      labelPlacement: scene.placed.labelPlacement,
      labelX: scene.placed.labelX,
      occupied: [scene.placed.occupiedX0, scene.placed.occupiedX1],
      stack: scene.placed.stack,
      band: scene.layout.rows[0]!.height,
    })
    for (const showing of EVERY_SHOWING.filter((one) => one.marks)) {
      const tag = `${JSON.stringify(showing)} ${T_013_COUNTED_IN_THE_BASE_COMBINATION}`
      expect({ tag, ...readingOf(sceneOf(task, showing)) }).toEqual({ tag, ...readingOf(shown) })
    }
  })

  it.each(PAST_THE_PLAN)('%s: hiding the marker (S-63 false) is LP-4 -- the reference end + S-31 (MUST)', (_row, task) => {
    const withMarker = sceneOf(task)
    const hidden = sceneOf(task, { marks: false, plan: true, actual: true })
    expect(withMarker.placed.labelPlacement, 'premise: this task writes its name outside the shape').toBe('right')
    expect(hidden.drawn!.resume, 'premise: S-63 draws neither the marker nor the icon').toBeNull()
    expect(
      hidden.placed.labelX,
      T_273_LP_4_NO_MARKER_OUTSIDE,
    ).toBeCloseTo(hidden.placed.actualReach! + LABEL_PAD_DRAWN, 6)
    expect(
      withMarker.placed.labelX - hidden.placed.labelX,
      `${T_273_LP_4_NO_MARKER_OUTSIDE} -- the name moves left by exactly the room the marker took`,
    ).toBeGreaterThan(0)
  })

  it('hiding the marker drops its diameter and S-32 from the judgement, and LP-3 starts the name S-31 into the actual (MUST)', () => {
    const withMarker = sceneOf(NAME_INSIDE)
    const hidden = sceneOf(NAME_INSIDE, { marks: false, plan: true, actual: true })
    expect(withMarker.placed.labelPlacement, 'premise: the short name is written inside').toBe('inside')
    expect(hidden.placed.labelPlacement, T_273_INSIDE_WITH_THE_MARKER_HIDDEN).toBe('inside')
    expect(hidden.drawn!.marker, 'premise: S-63 false draws no marker').toBeNull()
    expect(hidden.placed.labelX, T_273_LP_3_NO_MARKER_INSIDE).toBeCloseTo(hidden.placed.actualX! + LABEL_PAD_DRAWN, 6)
    expect(hidden.placed.labelX + hidden.placed.labelTextWidth + S_260, T_273_INSIDE_WITH_THE_MARKER_HIDDEN)
      .toBeLessThanOrEqual(hidden.placed.actualReach! + 1e-9)
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

const RECTANGLE_NAME_PX_AT_UNITY = S_4 * S_13 * S_5 * S_7

const OUTSIDE_LABEL_EDGE_OFFSET = (): number => {
  const { placed, drawn } = sceneOf(IN_PROGRESS)
  if (placed.labelPlacement !== 'right') throw new Error('premise: PA-2 puts its name outside')
  return drawn!.label!.x - (placed.actualReach! + MARKER_REACH_OFF_THE_ACTUAL + LABEL_GAP_DRAWN)
}

// see T-252
const AT_THE_SIZES_THIS_CASE_NAMES = { zoomX: 1 / DRAWN_RATIO, zoomY: 1 / DRAWN_RATIO }

describe('T-273 -- a name and a marker written inside a wide enough actual', () => {
  it('premise: an outside name and an inside name share one left-edge convention, read off PA-2', () => {
    expect(Number.isFinite(OUTSIDE_LABEL_EDGE_OFFSET())).toBe(true)
  })

  it('premise: LP-1 stands the marker on the actual start and the name inside, S-260 clear of its right edge', () => {
    const { placed, drawn } = sceneOf(NAME_INSIDE)
    expect(markerRightOf(drawn) - MARKER_SIZE_DRAWN, T_273_LP_1_ROW_AT_THE_REFERENCE_START)
      .toBeCloseTo(placed.actualX!, 6)
    expect(drawn!.label!.x + drawn!.label!.width + S_260, T_273_INSIDE_HOW_THEY_STAND)
      .toBeLessThanOrEqual(placed.actualReach! + 1e-9)
    expect(markerRightOf(drawn), T_273_INSIDE_THE_ACTUAL).toBeLessThan(placed.actualReach!)
  })

  it('a short name is written inside, its box left edge S-32 right of the marker (MUST)', () => {
    const { placed, drawn } = sceneOf(NAME_INSIDE)
    expect(placed.labelPlacement).toBe('inside')
    const markerRight = markerRightOf(drawn)
    const nameLeft = drawn!.label!.x
    expect(markerRight, T_273_INSIDE_HOW_THEY_STAND).toBeCloseTo(nameLeft - LABEL_GAP_DRAWN, 6)
    expect(markerRight, T_273_MARKER_BEFORE_NAME).toBeLessThan(nameLeft)
  })

  it('a name that fits the whole shape but not the width from marker (1) goes to the right (MUST)', () => {
    const probe = sceneOf(NAME_INSIDE, SHOWN, AT_THE_SIZES_THIS_CASE_NAMES)
    const fullWidth = probe.placed.width
    const fromTheMarker = probe.placed.x + probe.placed.width - (probe.placed.actualReach! + MARKER_REACH_OFF_THE_ACTUAL + LABEL_GAP_DRAWN)
    const perHalfWidthUnit = RECTANGLE_NAME_PX_AT_UNITY * S_30
    const units = Math.round((fullWidth + fromTheMarker) / 2 / perHalfWidthUnit)
    expect(units * perHalfWidthUnit, 'premise (FR-093): the name is wider than the width from the marker').toBeGreaterThan(fromTheMarker + 30)
    expect(units * perHalfWidthUnit, 'premise (FR-093): and narrower than the whole shape').toBeLessThan(fullWidth - 30)
    const task = spanning(1, '2026-02-02', 40, {
      name: 'a'.repeat(units),
      percentComplete: 40,
      actualStart: '2026-02-02',
      stop: '2026-02-21',
      resumeValid: true,
    })
    expect(
      sceneOf(task, SHOWN, AT_THE_SIZES_THIS_CASE_NAMES).placed.labelPlacement,
      T_273_WIDTH_FROM_THE_MARKER,
    ).toBe('right')
  })

  it('RF-3: with a fade, the name starts at whichever of the fadeIn end and the marker right + S-32 stands further right (MUST)', () => {
    const fadedFor = (fadeInDays: number) =>
      sceneOf(
        spanning(1, '2026-02-02', 40, {
          name: 'ab',
          percentComplete: 40,
          actualStart: '2026-02-02',
          stop: '2026-02-03',
          resumeValid: true,
          fadeInDays,
        }),
        PLAN_ONLY,
      )
    for (const fadeInDays of [1, 10]) {
      const { layout, placed, drawn } = fadedFor(fadeInDays)
      const fadeEnd = placed.x + fadeInDays * layout.pxPerDay
      const markerRight = markerRightOf(drawn)
      expect(markerRight - MARKER_SIZE_DRAWN, `fadeInDays ${fadeInDays}: ${T_273_LP_1_ROW_AT_THE_REFERENCE_START}`)
        .toBeCloseTo(placed.x, 6)
      expect(
        drawn!.label!.x,
        `fadeInDays ${fadeInDays}: ${T_273_FADE_OR_MARKER_WHICHEVER_IS_RIGHT}`,
      ).toBeCloseTo(Math.max(fadeEnd, markerRight + LABEL_GAP_DRAWN), 6)
    }
  })
})

const S_31 = num('labelPad')

// see T-252
const LABEL_PAD_DRAWN = S_31 * DRAWN_RATIO

// see T-272, T-273
const nameGlyphTextOf = (task: Task): string => {
  const settings = settingsOf({ assigneeVisible: false, percentCompleteVisible: false })
  const schedule = rowsOf([[task]])
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  const geometry = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection())
  const svg = svgFromSchedule(schedule, settings, layout, geometry, REGIONS, emptySelection(), 'screen')
  const figure = svg.indexOf('data-figure="task-1-label"')
  const opened = figure < 0 ? -1 : svg.lastIndexOf('<text ', figure)
  const x = opened < 0 ? null : / x="(-?[\d.]+)"/.exec(svg.slice(opened, figure))
  if (x === null || x === undefined) throw new Error('the name label was not drawn as a text with an x')
  return x[1] ?? 'NaN'
}

const halfOfLastWrittenPlaceOf = (written: string): number =>
  0.5 * 10 ** -(written.split('.')[1] ?? '').length

const shortActualNamed = (name: string, fade: { readonly fadeInDays?: number; readonly fadeOutDays?: number }): Task =>
  spanning(1, '2026-02-02', 40, {
    name,
    percentComplete: 40,
    actualStart: '2026-02-02',
    stop: '2026-02-03',
    resumeValid: true,
    ...fade,
  })

// see RF-1
const wideActualNamed = (name: string, fade: { readonly fadeInDays?: number; readonly fadeOutDays?: number }): Task =>
  spanning(1, '2026-02-02', 40, {
    name,
    percentComplete: 40,
    actualStart: '2026-02-02',
    stop: '2026-03-13',
    resumeValid: true,
    ...fade,
  })

describe('T-273 (CR-387, CR-430) -- the name start, and S-31 never counted as a box padding', () => {
  it('the box left edge is the marker right + S-32, the fadeIn end takes over on the RF-3 reference, and LP-2 carries it outside (MUST)', () => {
    const inside = sceneOf(NAME_INSIDE)
    expect(inside.placed.labelPlacement).toBe('inside')
    expect(
      inside.drawn!.label!.x + inside.drawn!.label!.width + S_260,
      T_273_INSIDE_HOW_THEY_STAND,
    ).toBeLessThanOrEqual(inside.placed.actualReach! + 1e-9)
    expect(markerRightOf(inside.drawn) + LABEL_GAP_DRAWN, T_273_LP_1_ROW_AT_THE_REFERENCE_START).toBeCloseTo(inside.drawn!.label!.x, 6)
    const faded = sceneOf(shortActualNamed('ab', { fadeInDays: 10 }), PLAN_ONLY)
    const fadeEnd = faded.placed.x + 10 * faded.layout.pxPerDay
    expect(fadeEnd, 'premise: the fade ends right of the marker right + S-32').toBeGreaterThan(markerRightOf(faded.drawn) + LABEL_GAP_DRAWN)
    expect(faded.drawn!.label!.x, T_273_FADE_IN_END_IS_THE_BOX_LEFT).toBeCloseTo(fadeEnd, 6)
    const outside = sceneOf(IN_PROGRESS)
    expect(outside.placed.labelPlacement).toBe('right')
    expect(outside.drawn!.label!.x, T_273_LP_2_ROW_AT_THE_REFERENCE_END).toBeCloseTo(outside.placed.actualReach! + MARKER_SIZE_DRAWN + LABEL_GAP_DRAWN, 6)
  })

  it('the glyphs start where T-273 puts the name -- the marker right + S-32 inside and outside alike, with no S-31 on top (MUST, MUST NOT)', () => {
    const inside = sceneOf(NAME_INSIDE)
    const insideStart = markerRightOf(inside.drawn) + LABEL_GAP_DRAWN
    const insideWritten = nameGlyphTextOf(NAME_INSIDE)
    expect(
      Math.abs(Number(insideWritten) - insideStart),
      `drawn x ${insideWritten} against マーカーの右端 + S-32 × 描く比 = ${insideStart}; ${T_273_LP_1_ROW_AT_THE_REFERENCE_START} ${FR_002_WRITE_START_IS_T_273}`,
    ).toBeLessThanOrEqual(halfOfLastWrittenPlaceOf(insideWritten) + 1e-9)
    expect(
      Math.abs(Number(insideWritten) - (insideStart + LABEL_PAD_DRAWN)),
      `drawn x ${insideWritten}: S-31 added on top; ${FR_002_S_31_NOT_TWICE}`,
    ).toBeGreaterThan(halfOfLastWrittenPlaceOf(insideWritten) + 1e-9)
    const outside = sceneOf(IN_PROGRESS)
    const outsideStart = outside.placed.actualReach! + MARKER_SIZE_DRAWN + LABEL_GAP_DRAWN
    const outsideWritten = nameGlyphTextOf(IN_PROGRESS)
    expect(
      Math.abs(Number(outsideWritten) - outsideStart),
      `drawn x ${outsideWritten} against マーカーの右端 + S-32 × 描く比 = ${outsideStart}; ${T_273_LP_2_ROW_AT_THE_REFERENCE_END} ${FR_002_WRITE_START_IS_T_273}`,
    ).toBeLessThanOrEqual(halfOfLastWrittenPlaceOf(outsideWritten) + 1e-9)
    expect(
      Math.abs(Number(outsideWritten) - (outsideStart + LABEL_PAD_DRAWN)),
      `drawn x ${outsideWritten}: S-31 added on top; ${FR_002_S_31_NOT_TWICE}`,
    ).toBeGreaterThan(halfOfLastWrittenPlaceOf(outsideWritten) + 1e-9)
  })

  it('T-273 judges the fit on the reference width alone, so the plan fades never move it (MUST)', () => {
    const halfWidthUnit = RECTANGLE_NAME_PX_AT_UNITY * S_30 * DRAWN_RATIO
    const FADES = [
      {},
      { fadeInDays: 10 },
      { fadeOutDays: 5 },
      { fadeInDays: 10, fadeOutDays: 5 },
      { fadeInDays: 3, fadeOutDays: 5 },
      { fadeInDays: 1, fadeOutDays: 2 },
    ] as const
    let bothAnswers = 0
    for (const fade of FADES) {
      const probe = sceneOf(wideActualNamed('a', fade))
      const room = probe.placed.actualReach! - probe.placed.actualX! - MARKER_SIZE_DRAWN - LABEL_GAP_DRAWN - S_260
      const clause = 'fadeInDays' in fade && 'fadeOutDays' in fade ? T_273_BOTH_FADE_AND_MARKER_WIDTH : T_273_FITS_WITH_S_31
      let sawInside = 0
      let sawRight = 0
      for (let units = 1; units <= 40; units += 1) {
        const expected = room - units * halfWidthUnit >= -1e-6 ? 'inside' : 'right'
        if (expected === 'inside') sawInside += 1
        else sawRight += 1
        const placement = sceneOf(wideActualNamed('a'.repeat(units), fade)).placed.labelPlacement
        expect({ clause, fade, units, placement }).toEqual({ clause, fade, units, placement: expected })
      }
      if (sawInside > 0 && sawRight > 0) bothAnswers += 1
    }
    expect(bothAnswers, 'premise: every fade combination shows the judgement turning over').toBe(FADES.length)
  })

  it('FR-049: the plan-only view moves where the marker is drawn, and not the name, the occupancy or the band', () => {
    const shown = sceneOf(STOPS_INSIDE)
    const planOnly = sceneOf(STOPS_INSIDE, PLAN_ONLY)
    expect(markerRightOf(planOnly.drawn), 'premise: FR-013 moves the marker in the plan-only view')
      .not.toBeCloseTo(markerRightOf(shown.drawn), 6)
    const readingOf = (scene: ReturnType<typeof sceneOf>) => [
      scene.placed.labelX,
      scene.placed.occupiedX0,
      scene.placed.occupiedX1,
      scene.layout.rows[0]!.height,
    ]
    expect(readingOf(planOnly), FR_049_THE_ACCIDENT_IS_NAME_OCCUPANCY_AND_BAND).toEqual(readingOf(shown))
  })
})

const S_36 = num('rowTitleFont')
const S_38 = num('rowTitleTopScale')
const S_96 = NOT_STORED_ZOOM_STEP['S-96']

// WHY: CR-418 grew S-36 from 13 to 19.5, so the type ceiling and every zoom these cases start from grew by the
// same 1.5; the starts keep their place against the ceiling (1.25 and 1.3 before, above and below it).
const START_ABOVE_THE_TYPE_CEILING = 1.25 * 1.5
const START_UNDER_THE_WIDER_CEILING = 1.3 * 1.5

const DEPTH_1_ROW_NAME_PX = S_36 * S_38
const MILESTONE_NAME_PX_AT_UNITY = S_4 * S_17 * S_5 * S_7
const ROW_CEILING_BY_TYPE = DEPTH_1_ROW_NAME_PX / RECTANGLE_NAME_PX_AT_UNITY
const CEILING_IF_MEASURED_ON_THE_MILESTONE = DEPTH_1_ROW_NAME_PX / MILESTONE_NAME_PX_AT_UNITY
const PLAN_FLOOR_LETS_GO_AT = PLAN_HEIGHT_FLOOR_PX / S_4
const FONT_FLOOR_LETS_GO_AT = S_8 / RECTANGLE_NAME_PX_AT_UNITY
const FLOOR_FONT_PX = Math.max(S_8, PLAN_HEIGHT_FLOOR_PX * S_13 * S_5 * S_7)

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

function zoomYAfterRaise(
  schedule: Schedule,
  zoomY: number,
  env: ScreenEnvironment,
  part: Record<string, unknown> = {},
): number {
  const settings = settingsOf({ zoomY, scrollGroupId: 'g1', ...part })
  const regions = regionsFromScreen(env, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const context: InputContext = {
    document: documentOf(schedule, settings),
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
    screen: emptyScreenSession.screen,
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
  it('premise: S-36 x S-38 / (S-4 x S-13 x S-5 x S-7) is the 1.760197 CR-418 section 2 names, and the floors let go below it', () => {
    expect(ROW_CEILING_BY_TYPE).toBeCloseTo(1.760197, 6)
    expect(PLAN_FLOOR_LETS_GO_AT, '(S-6 / S-5) / S-4').toBeCloseTo(0.99988, 5)
    expect(FONT_FLOOR_LETS_GO_AT, 'S-8 / (S-4 x S-13 x S-5 x S-7)').toBeCloseTo(0.83323, 5)
    expect(Math.max(ROW_CEILING_BY_TYPE, PLAN_FLOOR_LETS_GO_AT, FONT_FLOOR_LETS_GO_AT)).toBe(ROW_CEILING_BY_TYPE)
    const layout = layoutFromSchedule(RECTANGLE_ROW, settingsOf({ zoomY: ROW_CEILING_BY_TYPE }), REGIONS)
    expect(
      taskPlacement(layout, 1)!.labelFontSize,
      'the rectangle name at that zoom, 描く比を掛けたあと（表 T-252 の DS-1）',
    ).toBeCloseTo(DEPTH_1_ROW_NAME_PX * DRAWN_RATIO, 6)
  })

  it('premise: under both ceilings one raise moves by S-53, and the tall band ceiling lies above the raise from the start above the type ceiling', () => {
    expect(S_96).toBeLessThan(ROW_CEILING_BY_TYPE)
    expect(zoomYAfterRaise(RECTANGLE_ROW, 1, TALL)).toBeCloseTo(S_96, 3)
    const settings = settingsOf({ zoomY: START_ABOVE_THE_TYPE_CEILING * S_96 })
    const regions = regionsFromScreen(TALL, settings)
    expect(START_ABOVE_THE_TYPE_CEILING * S_96).toBeGreaterThan(ROW_CEILING_BY_TYPE)
    expect(tallestBand(layoutFromSchedule(RECTANGLE_ROW, settings, regions))).toBeLessThan(regions.rowArea.height)
  })

  it('a raise past the type ceiling stops at or under it (MUST)', () => {
    expect(zoomYAfterRaise(RECTANGLE_ROW, START_ABOVE_THE_TYPE_CEILING, TALL), FR_016_SOLVED_FOR_THE_ZOOM).toBeLessThanOrEqual(ROW_CEILING_BY_TYPE + 1e-9)
  })

  it('the ceiling follows S-38: a depth-1 scale of 1.5 lets the raise reach past 1.760197 and stops at S-36 x 1.5 / 14.4018 (MUST)', () => {
    const solved = (S_36 * 1.5) / RECTANGLE_NAME_PX_AT_UNITY
    expect(solved, 'premise: 29.25 / 14.4018').toBeCloseTo(2.031, 3)
    const start = START_UNDER_THE_WIDER_CEILING
    expect(start, 'premise: the start is past the S-38 1.3 ceiling').toBeGreaterThan(ROW_CEILING_BY_TYPE)
    expect(start * S_96, 'premise: the raise asks for more than that').toBeGreaterThan(solved)
    const answered = zoomYAfterRaise(RECTANGLE_ROW, start, TALL, { rowTitleTopScale: 1.5 })
    expect(answered, FR_016_SOLVED_FOR_THE_ZOOM).toBeLessThanOrEqual(solved + 1e-9)
    expect(answered).toBeGreaterThan(start)
  })

  it('a floor-only combination (S-36 12, S-38 1) stops where the floor lets go, not below the zoom it started from (MUST, MUST NOT)', () => {
    const part = { rowTitleFont: 12, rowTitleTopScale: 1 }
    const target = 12 * 1
    expect(target, 'premise: the floors alone already reach the depth-1 name').toBeLessThanOrEqual(FLOOR_FONT_PX)
    const floorLetsGo = Math.max(PLAN_FLOOR_LETS_GO_AT, FONT_FLOOR_LETS_GO_AT)
    const start = 0.95
    const fromTheRatio = (target / FLOOR_FONT_PX) * start
    expect(fromTheRatio, 'premise: the forbidden ratio would answer below the start').toBeLessThan(start)
    expect(start * S_96, 'premise: the raise asks for more than the floor zoom').toBeGreaterThan(floorLetsGo)
    const answered = zoomYAfterRaise(RECTANGLE_ROW, start, TALL, part)
    expect(answered, FR_016_FLOOR_ONLY_STOPS_WHERE_THE_FLOOR_LETS_GO).toBeLessThanOrEqual(floorLetsGo + 1e-9)
    expect(answered, FR_016_NOT_FROM_THE_RATIO).toBeGreaterThan(start)
  })

  it('a milestone on the page does not move the ceiling -- it is measured on the rectangle (MUST)', () => {
    const alone = zoomYAfterRaise(RECTANGLE_ROW, START_ABOVE_THE_TYPE_CEILING, TALL)
    const beside = zoomYAfterRaise(WITH_A_MILESTONE, START_ABOVE_THE_TYPE_CEILING, TALL)
    expect(CEILING_IF_MEASURED_ON_THE_MILESTONE).toBeLessThan(START_ABOVE_THE_TYPE_CEILING)
    expect(beside).toBeCloseTo(alone, 10)
    expect(beside).toBeLessThanOrEqual(ROW_CEILING_BY_TYPE + 1e-9)
    expect(MILESTONE_NAME_PX_AT_UNITY, 'S-17 caps the milestone at the rectangle').toBeLessThanOrEqual(
      RECTANGLE_NAME_PX_AT_UNITY + 1e-9,
    )
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
    const s239 = Number(
      /\d+(?:\.\d+)?/.exec(specTable('T-206').rows.find((one) => one.id === 'S-239')?.by['既定'] ?? '')?.[0] ?? 'NaN',
    )
    expect(s239, 'premise: S-239 is read from table T-206').toBeGreaterThan(0)
    expect(answered).toBeLessThan(ROW_CEILING_BY_TYPE)
    expect(bandAt(answered), `${FR_016_TALLEST_BAND_ASKED_OF_PI_5} -- T-253 BC-2 / BC-5: reached at the answer`).toBeGreaterThanOrEqual(
      regions.rowArea.height,
    )
    const inside = Array.from({ length: 9 }, (_unused, index) => answered - s239 * (1 - index / 8))
    for (let index = 1; index < inside.length; index++) {
      expect(bandAt(inside[index]!), 'premise: six equal lanes grow without falling back inside the last S-239').toBeGreaterThanOrEqual(
        bandAt(inside[index - 1]!),
      )
    }
    expect(bandAt(answered - s239), `${FR_016_TALLEST_BAND_ASKED_OF_PI_5} -- T-253 BC-4 / BC-5: not reached S-239 below`).toBeLessThan(
      regions.rowArea.height,
    )
  })

  it('T-064: PI-5 publishes zoomYAtRectangleLabelFont and PI-37 publishes rowTitleFontPxOf', () => {
    expect(typeof (scheduleLayoutModule as Record<string, unknown>)['zoomYAtRectangleLabelFont']).toBe('function')
    expect(typeof (screenRendererModule as Record<string, unknown>)['rowTitleFontPxOf']).toBe('function')
    expect(typeof (scheduleLayoutModule as Record<string, unknown>)['rowPlacesAtZoomY']).toBe('function')
  })

  it('the translator imports the three members rather than holding the formulas itself (MUST NOT)', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'adapter', 'input-command-translator', 'input-command-translator.ts'),
      'utf8',
    )
    const importedFrom = (member: string, modulePath: string): boolean =>
      [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']*)'/g)].some(
        (hit) => (hit[2] ?? '').endsWith(modulePath) && new RegExp(`\\b${member}\\b`).test(hit[1] ?? ''),
      )
    expect(importedFrom('zoomYAtRectangleLabelFont', 'schedule-layout/schedule-layout'), FR_016_ASK_BOTH_COPY_NEITHER).toBe(true)
    expect(importedFrom('rowTitleFontPxOf', 'screen-renderer/screen-renderer'), FR_016_ASK_BOTH_COPY_NEITHER).toBe(true)
    expect(importedFrom('rowPlacesAtZoomY', 'schedule-layout/schedule-layout'), FR_016_TALLEST_BAND_ASKED_OF_PI_5).toBe(true)
  })
})

describe('T-201 S-17 -- a milestone is no taller than its rectangle (CR-413, JDG-148)', () => {
  it('the manuscript and the generated default both hold 1.0, under the ceiling 1', () => {
    const row = specTable('T-201').rows.find((one) => one.id === 'S-17')
    expect(Number(bare(row?.by['既定値'] ?? ''))).toBe(1)
    expect(Number(bare(row?.by['上限'] ?? ''))).toBe(1)
    expect(S_17).toBe(1)
  })

  it('a milestone name at unity is S-4 x S-17 x S-5 x S-7 and does not pass the depth-1 row name', () => {
    const layout = layoutFromSchedule(
      rowsOf([[taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true, name: 'm' })]]),
      settingsOf({ zoomY: 1 }),
      REGIONS,
    )
    expect(
      taskPlacement(layout, 1)!.labelFontSize,
      'S-4 × S-17 × S-5 × S-7 に描く比を掛けた字（表 T-252 の DS-1）',
    ).toBeCloseTo(MILESTONE_NAME_PX_AT_UNITY * DRAWN_RATIO, 6)
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
      // WHY: toBeCloseTo, not toBe: the VG-2 gap carries 0.75px widths, so the running sum is not binary-exact.
      expect(layout.rows[at]!.y - layout.rows[at - 1]!.y, `row ${at + 1}`).toBeCloseTo(layout.rows[at - 1]!.height, 9)
    }
  })

  it('T-023d: S-176 is a fraction of the pitch, and the pitch is now the band itself (MUST)', () => {
    const schedule = rowsOf([[spanning(1, '2026-01-01', 20)], [spanning(2, '2026-01-01', 20)], []])
    const topOf = (offset: number): number =>
      layoutFromSchedule(schedule, settingsOf({ scrollGroupId: 'g1', scrollGroupOffset: offset }), REGIONS).rows[0]!.y
    const layout = layoutFromSchedule(schedule, settingsOf({ scrollGroupId: 'g1', scrollGroupOffset: 0 }), REGIONS)
    const pitch = layout.rows[1]!.y - layout.rows[0]!.y
    expect(pitch, 'pitch = band + S-12 = band').toBe(layout.rows[0]!.height)
    expect(topOf(0) - topOf(0.5), T_023D_FRACTION_OF_THE_PITCH).toBeCloseTo(pitch / 2, 6)
  })
})
