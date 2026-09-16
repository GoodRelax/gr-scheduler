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
  type BarGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import * as scheduleLayoutModule from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
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
import * as screenRendererModule from '../../src/adapter/screen-renderer/screen-renderer'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
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
  'てのみ、名称ラベルが縦に取る高さと `_assets/tbl-settings.md` の 表 T-206 の `S-196` を、予定の縦幅（形状の比を掛けた予定の帯）の上端の上に数え、形状をそのぶん段の上端から下げて置くこと（MUST）'

const OC_10_HEIGHT_IS_FONT_TIMES_S_233 =
  '⭐ 名称ラベルが縦に取る高さは、描いた字の箱の高さを見積もった値とし、字の大きさ（`FR-094` の縦の寸法）に同表の `S-233` を掛けて求めること（MUST）'

const OC_10_NOT_THE_FONT_SIZE_ITSELF =
  '`S-233` を掛けて求めること（MUST）。⛔ 字の大きさそのものを高さとして数えてはならない（MUST NOT）'

const OC_10_LABEL_SITS_ON_THE_FIGURE_TOP =
  '（量と導出は `S-233` の注）。⭐ ラベルの下端（数えた高さの下端）を置く基準は、`S-196` の注のとおり、予定の図形の上端（矢じりと端点の点を含む、描いた線の上端）とすること（MUST）'

const OC_10_BASELINE_BELOW_THE_CENTRE =
  '⭐ 字の基線は、数えた高さの縦の中央から、字の大きさに `_assets/tbl-settings.md` の 表 T-201 の `S-33` を掛けたぶん下に置くこと（MUST）'

const OC_10_WITH_OR_WITHOUT_A_NAME =
  '⭐ `S-196` と `S-233` を持って他のコンポーネントへ渡すのは `05-07-design.md` の 表 T-064 の `PI-5` である。⚠️ 段割当の重なりに当てはめないことは `OC-6` と同じである。⭐ 名前の有無によらず数えること（MUST）'

const T_013_WIDTH_FROM_THE_MARKER =
  '置の左端が、形状の右端より左にあるときは、`NL-1` の「タスクの幅」を、そのマーカーの右端に `_assets/tbl-settings.md` の 表 T-201 の `S-32` を足した位置から形状の右端までとすること（MUST）'

const T_013_WRITING_STARTS_THERE =
  'スクの幅」を、そのマーカーの右端に `_assets/tbl-settings.md` の 表 T-201 の `S-32` を足した位置から形状の右端までとすること（MUST）。形状の中に書くときは、その位置を名称ラベルの箱の左端とすること（MUST）'

const T_013_NO_LABEL_OVER_THE_MARKER =
  '中に書くときは、その位置を名称ラベルの箱の左端とすること（MUST） —— 名称ラベルの左に状態の記号が来る並びは、形状の外へ出したときの 表 T-243 の `OR-1` と同じである。⛔ マーカーの上に名称ラベルを重ねてはならない（MUST NOT）'

const T_013_COUNTED_IN_THE_BASE_COMBINATION =
  'ならない（MUST NOT） —— 状態の記号も名前も読めなくなる。⭐ マーカーの位置は、いまの予実の表示の組（同書の 表 T-202 の `S-227` / `S-228`）によらず、基準の組で立つ位置で数えること（MUST）'

const T_013_HIDDEN_MARKER_IS_NOT_COUNTED =
  '⭐ ただし進捗マーカーを隠しているとき（同表の `S-63` が偽）は、本段のマーカーを数えないこと（MUST）'

const T_013_FADE_OR_MARKER_WHICHEVER_IS_RIGHT =
  '形状の中に書いたラベルには重ならない —— そのラベルは形状の右端より左で終わる。⚠️ フェードを持つ形状では、箱の左端は `fadeIn` が終わる位置と、マーカーの右端に `S-32` を足した位置の、右にあるほうとすること（MUST）'

const T_013_FADE_IN_END_IS_THE_BOX_LEFT =
  'フェードを持つ形状では、`NL-1` の「タスクの幅」を、形状の幅から `fadeIn` と `fadeOut` を引いた残りとすること（MUST）。形状の中に書くときは、`fadeIn` が終わる位置を名称ラベルの箱の左端とすること（MUST）'

const T_013_BOTH_FADE_AND_MARKER_WIDTH =
  '⭐ フェードとマーカーの両方があるときの `NL-1` の「タスクの幅」は、その箱の左端から、形状の右端から `fadeOut` を引いた位置までとし、ラベルの内側の余白（同書の 表 T-201 の `S-31`）はこの幅から 1 回だけ引くこと（MUST）'

const T_013_S_31_IS_INSIDE_THE_BOX =
  '後者だけで数えるとフェードの上に、名称ラベルが乗る。⭐ `S-31` は名称ラベルの箱の内側の余白であり、字は箱の左端から `S-31` だけ右から書くこと（MUST）'

const T_013_NL_1_FITS_WITH_S_31 =
  '⭐ `NL-1` の「収まる」は、打ち切った後のラベルの字の幅に `S-31` を足した長さが、箱の左端から形状の右端 − `fadeOut`（フェードもマーカーも無ければ形状の右端）までに収まることとすること（MUST）'

const T_013_S_31_NOT_TWICE =
  'までに収まることとすること（MUST）。⛔ `S-31` を 2 回数えてはならない（MUST NOT）'

const T_243_THE_LEFT_EDGE_IS_THE_BOX =
  '予定バーの右端の外側へ移した位置。⭐ ここでいう名称ラベルの左端は、名称ラベルの箱の左端とすること（MUST）'

const FR_049_THE_ACCIDENT_IS_NAME_OCCUPANCY_AND_BAND =
  '⛔ 隠したものを占有から外してはならない（MUST NOT） —— 外すと、予定だけ・実績だけの表示に切り替えるたびに名称ラベルの位置と、`OC-1` を経た占有幅と、行の帯高が動き、段が組み替わる。⚠️ 進捗マーカーを描く位置は本段の対象ではない —— 表示の組で決めるのは `FR-013` であり、予定だけの表示ではマーカーは予定バーの右端の外側へ移る。'

const T_243_SAME_LEFT_EDGE_WHETHER_DRAWN =
  'と `OC-4` を描かないときも、描いたときと同じ位置とすること（MUST）'

const T_243_COUNTED_WHERE_DRAWN =
  '` と `OC-4` を描かないときも、描いたときと同じ位置とすること（MUST）。予実の表示の切り替えで `OC-3` / `OC-4` を描かないときも、描いたときに立つ位置で数えること（MUST）'

const T_243_NOT_ONLY_WHEN_DRAWN =
  'OC-3` と `OC-4` を描かないときも、描いたときと同じ位置とすること（MUST）。予実の表示の切り替えで `OC-3` / `OC-4` を描かないときも、描いたときに立つ位置で数えること（MUST）。描いたときだけ数えてはならない（MUST NOT）'

const T_243_LABEL_LEFT_EDGE =
  '⭐ `S-63` が真のとき、名称ラベルの左端は、形状の右端と、次の ① ② に立つ進捗マーカーの右端のうち、いちばん右にあるものに 同書の 表 T-201 の `S-32` を足した位置とすること（MUST）'

const T_243_HIDDEN_MARKER_MOVES_THE_NAME_LEFT =
  '⭐ `S-63` が偽のとき（マーカーと再開アイコンを隠しているとき）は、下の ① ② を数えず、名称ラベルの左端を形状の右端に 同書の 表 T-201 の `S-32` を足した位置とすること（MUST）'

const T_243_HIDDEN_SHAPE_KEEPS_ITS_EDGE =
  '1 回だけ数える（規則は 表 T-013 の後の段が持ち、形状の中と同じ数え方である）。⭐ ここでいう形状の右端は、予定・実績・ダミーを表示の切り替え（表 T-202 の `S-227` / `S-228`）で隠しているときも、描いたときの占有で数えること（MUST）'

const T_243_BOTH_COUNTED_WHATEVER_IS_SHOWN =
  '隠しているときも、描いたときの占有で数えること（MUST）。⭐ `S-63` が真のとき、`S-227` / `S-228` のどの組でも、マーカーが立つ位置は ① か ② のどちらかであるので、この 2 つを予実の表示の組によらず数えること（MUST）'

const T_243_NOT_BY_MARKER_1_ALONE =
  'ちらかであるので、この 2 つを予実の表示の組によらず数えること（MUST） —— 数え方が予実の表示の切り替えに依らないので、名称ラベルも行の帯高も動かず、どの組でもマーカーが名称ラベルに重ならない。⛔ ① だけで数えてはならない（MUST NOT）'

const T_243_NO_OTHER_ROOM =
  'けの表示で ② へ移ったマーカー（予定の右端から `S-23` 離れて `S-22` の幅を取る）に重なる（`OR-1` の MUST NOT）。⛔ ① と ② のほかに、マーカーのための場所を形状の外に空けてはならない（MUST NOT）'

const T_243_NO_NEW_SETTING =
  '） —— ① が形状の中に立つときに ① のぶんを足したり、マーカーと再開アイコンの幅を一定の量として足したりすると、名称ラベルが形状から離れて立ち、どのタスクの名前かが読みにくくなる。⭐ 新しい設定値を立ててはならない（MUST NOT）'

const T_243_NO_ROOM_FOR_A_DATED_RESUME_ICON =
  '⇒ `OC-3` / `OC-4` の MUST NOT は 1 文字も変わらない —— `S-63` の切り替えで動くのは、上の段が定める名称ラベルの左端だけである。⛔ 再開アイコンが 表 T-221 の `LF-11` の日付位置に立つときは、本並びの中に場所を空けてはならない（MUST NOT）'

const T_243_PA_4_COUNTS_THE_ICON =
  'e` を持たないとき（表 T-019 の `PA-4`）だけは、`LF-11` がアイコンをマーカーの右端から `S-23` 離して並びの中に立てるので、① と ② のどちらでも、マーカーの右端に代えてアイコンの右端で数えること（MUST）'

const FR_049_HIDDEN_KEEPS_ITS_OCCUPANCY =
  'すたびに行が伸び縮みすると、見ている場所が動く。⭐ `S-227` / `S-228` で隠した予定・実績・実績のダミーは、占有（表 T-038 の算入と、名称ラベルの位置の数え方）をそのまま残し、描かず、当たり判定から外すこと（MUST）'

const FR_049_HIDDEN_NOT_TAKEN_OUT =
  'ラベルの位置の数え方）をそのまま残し、描かず、当たり判定から外すこと（MUST） —— 見た目は透明に描いたときと同じであり、表示を切り替えても名称ラベルも行の帯高も段も動かない。⛔ 隠したものを占有から外してはならない（MUST NOT）'

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
  'が何も起こさず、等倍が成り立たない。**端数は同表の `S-176` と `S-177` が持つ（MUST）。**⛔ その端数は、行の帯の高さではなく、行が占める送り（帯の高さと、その下の隙間を合わせた長さ）に対する比とすること（MUST）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['T-038 OC-10 (MUST) -- the label height and S-196 are counted above the plan strip', OC_10_LOWERED_BY_THE_LABEL],
  ['T-038 OC-10 (MUST) -- the counted height is the font size x S-233', OC_10_HEIGHT_IS_FONT_TIMES_S_233],
  ['T-038 OC-10 (MUST NOT) -- the font size itself is not the counted height', OC_10_NOT_THE_FONT_SIZE_ITSELF],
  ['T-038 OC-10 (MUST) -- the counted height bottom is placed from the drawn figure top', OC_10_LABEL_SITS_ON_THE_FIGURE_TOP],
  ['T-038 OC-10 (MUST) -- the baseline is S-33 x font below the counted centre', OC_10_BASELINE_BELOW_THE_CENTRE],
  ['T-038 OC-10 (MUST) -- counted whether or not the task has a name', OC_10_WITH_OR_WITHOUT_A_NAME],
  ['T-013 (MUST) -- the NL-1 width runs from marker (1) + S-32 to the shape right', T_013_WIDTH_FROM_THE_MARKER],
  ['T-013 (MUST) -- a name written inside has its box left edge there', T_013_WRITING_STARTS_THERE],
  ['T-013 (MUST) -- with a fade, the fadeIn end is the box left edge', T_013_FADE_IN_END_IS_THE_BOX_LEFT],
  ['T-013 (MUST) -- with both a fade and a marker, the width takes S-31 off once', T_013_BOTH_FADE_AND_MARKER_WIDTH],
  ['T-013 (MUST) -- S-31 is the padding inside the box, the glyphs start S-31 right of it', T_013_S_31_IS_INSIDE_THE_BOX],
  ['T-013 (MUST) -- NL-1 fits the glyph width plus S-31', T_013_NL_1_FITS_WITH_S_31],
  ['T-013 (MUST NOT) -- S-31 is not counted twice', T_013_S_31_NOT_TWICE],
  ['T-243 (MUST) -- the name label left edge is the box left edge', T_243_THE_LEFT_EDGE_IS_THE_BOX],
  ['FR-049 (MUST NOT) -- the accident is the name, the occupancy and the band, not where the marker is drawn', FR_049_THE_ACCIDENT_IS_NAME_OCCUPANCY_AND_BAND],
  ['T-013 (MUST NOT) -- no name over the marker', T_013_NO_LABEL_OVER_THE_MARKER],
  ['T-013 (MUST) -- the marker is counted where it stands in the base combination', T_013_COUNTED_IN_THE_BASE_COMBINATION],
  ['T-013 (MUST) -- with a fade, the start is whichever of fadeIn end and marker + S-32 is right', T_013_FADE_OR_MARKER_WHICHEVER_IS_RIGHT],
  ['T-243 (MUST) -- the same left edge whether OC-3 / OC-4 are drawn', T_243_SAME_LEFT_EDGE_WHETHER_DRAWN],
  ['T-243 (MUST) -- counted where they stand when drawn', T_243_COUNTED_WHERE_DRAWN],
  ['T-243 (MUST NOT) -- not counted only while drawn', T_243_NOT_ONLY_WHEN_DRAWN],
  ['T-243 (MUST) -- with S-63 true, the name starts S-32 past the rightmost of shape, (1) and (2)', T_243_LABEL_LEFT_EDGE],
  ['T-243 (MUST) -- with S-63 false, the name starts S-32 past the shape right edge alone', T_243_HIDDEN_MARKER_MOVES_THE_NAME_LEFT],
  ['T-013 (MUST) -- with S-63 false, the marker is not counted for the width either', T_013_HIDDEN_MARKER_IS_NOT_COUNTED],
  ['T-243 (MUST) -- a hidden plan or actual keeps its right edge', T_243_HIDDEN_SHAPE_KEEPS_ITS_EDGE],
  ['T-243 (MUST) -- (1) and (2) are both counted whatever is shown', T_243_BOTH_COUNTED_WHATEVER_IS_SHOWN],
  ['T-243 (MUST NOT) -- not by (1) alone', T_243_NOT_BY_MARKER_1_ALONE],
  ['T-243 (MUST NOT) -- no room for the marker beyond (1) and (2)', T_243_NO_OTHER_ROOM],
  ['T-243 (MUST NOT) -- no new setting', T_243_NO_NEW_SETTING],
  ['T-243 (MUST NOT) -- no room for a resume icon on its own day', T_243_NO_ROOM_FOR_A_DATED_RESUME_ICON],
  ['T-243 (MUST) -- PA-4 counts the icon right edge at (1) and (2)', T_243_PA_4_COUNTS_THE_ICON],
  ['FR-049 (MUST) -- a hidden plan or actual keeps its occupancy', FR_049_HIDDEN_KEEPS_ITS_OCCUPANCY],
  ['FR-049 (MUST NOT) -- a hidden thing is not taken out of the occupancy', FR_049_HIDDEN_NOT_TAKEN_OUT],
  ['FR-016 (MUST) -- the row ceiling is the smaller of the two', FR_016_ROW_CEILING_IS_THE_SMALLER],
  ['FR-016 (MUST) -- measured on the rectangle whatever is drawn', FR_016_MEASURED_ON_THE_RECTANGLE],
  ['FR-016 (MUST) -- the zoom is solved from the font formula', FR_016_SOLVED_FOR_THE_ZOOM],
  ['FR-016 (MUST NOT) -- not from the ratio of the present font and zoom', FR_016_NOT_FROM_THE_RATIO],
  ['FR-016 (MUST) -- a floor-only combination stops where the floor lets go', FR_016_FLOOR_ONLY_STOPS_WHERE_THE_FLOOR_LETS_GO],
  ['FR-016 (MUST NOT) -- the ceiling asks PI-5 and PI-37 and copies neither formula', FR_016_ASK_BOTH_COPY_NEITHER],
  ['FR-016 (MUST) -- the tallest band is asked of PI-5 rowPlacesAtZoomY', FR_016_TALLEST_BAND_ASKED_OF_PI_5],
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
const S_40 = num('thinStrokeOfPlan')
const S_41 = num('thinStrokeMin')
const S_42 = num('thinStrokeMax')
const S_45 = num('arrowHeadOfStroke')
const S_47 = num('spanDotOfStroke')
const S_33 = num('labelBaseline')

const PLAN_HEIGHT_FLOOR_PX = S_6 / S_5
const planStripOf = (ratio: number, zoomY: number): number => Math.max(PLAN_HEIGHT_FLOOR_PX, S_4 * zoomY) * ratio
const thinStrokeOf = (strip: number): number => Math.min(S_42, Math.max(S_41, strip * S_40))
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
      const stroke = thinStrokeOf(strip)
      const reach = Math.max((stroke * S_45) / 2, stroke * S_47, stroke / 2)
      expect(reach, `${shapeKind}: max(stroke x S-45 / 2, stroke x S-47) <= strip / 2`).toBeLessThanOrEqual(strip / 2)
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
    return { fontPx: placed.labelFontSize, heightPx: placed.labelFontSize * S_233 }
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

  it('premise (CR-380 8.3): at zoomY 1 an arrow name sits on the S-8 floor, so S-8 x S-233 + S-196 = 20 where the font size itself gave 14', () => {
    const { layout } = sceneAt('arrow', 'ab', 1)
    const { fontPx, heightPx } = countedOf(layout, 1)
    expect(fontPx, 'FR-094: the arrow name at zoomY 1 is the S-8 floor').toBe(S_8)
    expect(heightPx + S_196, 'S-8 x S-233 + S-196').toBeCloseTo(20, 9)
    expect(fontPx + S_196, 'the forbidden count, S-8 + S-196').toBeCloseTo(14, 9)
  })

  it.each(LIFTED)('%s: lane top + font x S-233 + S-196 is the plan strip top, and lane top + font + S-196 is not (MUST, MUST NOT)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const { layout, tasks } = sceneAt(shapeKind, 'ab', zoomY)
      for (const [index, uid] of [[0, 1], [1, 2]] as const) {
        const tag = `zoomY ${zoomY}, row ${index + 1}`
        const laneTop = layout.rows[index]!.stackTops[0]!
        const drawn = tasks.find((one) => one.taskUid === uid)!
        const { fontPx, heightPx } = countedOf(layout, uid)
        const stripTop = centreLineOf(drawn.plan) - planStripOf(LIFTED_RATIO[shapeKind]!, zoomY) / 2
        expect(stripTop, `${tag}: strip top = lane top + font x S-233 + S-196; ${OC_10_HEIGHT_IS_FONT_TIMES_S_233}`)
          .toBeCloseTo(laneTop + heightPx + S_196, 6)
        expect(stripTop, `${tag}: ${OC_10_NOT_THE_FONT_SIZE_ITSELF}`).not.toBeCloseTo(laneTop + fontPx + S_196, 6)
      }
    }
  })

  it.each(LIFTED)('%s: the counted height ends S-196 above the figure top, holds the label box at its centre, and stays in the band (MUST)', (shapeKind) => {
    for (const zoomY of ZOOMS) {
      const { layout, tasks } = sceneAt(shapeKind, 'ab', zoomY)
      for (const [index, uid] of [[0, 1], [1, 2]] as const) {
        const tag = `zoomY ${zoomY}, row ${index + 1}`
        const row = layout.rows[index]!
        const drawn = tasks.find((one) => one.taskUid === uid)!
        const label = drawn.label!
        const { heightPx } = countedOf(layout, uid)
        const stripTop = centreLineOf(drawn.plan) - planStripOf(LIFTED_RATIO[shapeKind]!, zoomY) / 2
        const figureTop = extentOf(drawn.plan).top
        const countedBottom = figureTop - S_196
        const countedTop = countedBottom - heightPx
        expect(figureTop, `${tag}: premise, the figure top lies inside the strip`).toBeGreaterThanOrEqual(stripTop - 1e-9)
        expect(label.y + label.height / 2, `${tag}: label centre = figure top - S-196 - font x S-233 / 2; ${OC_10_LABEL_SITS_ON_THE_FIGURE_TOP}`)
          .toBeCloseTo(countedBottom - heightPx / 2, 6)
        expect(label.y, `${tag}: label top = counted top + (font x S-233 - label height) / 2, inside the counted height`)
          .toBeGreaterThanOrEqual(countedTop - 1e-9)
        expect(label.y + label.height, `${tag}: label bottom inside the counted height, whose bottom is figure top - S-196`)
          .toBeLessThanOrEqual(countedBottom + 1e-9)
        expect(countedTop, `${tag}: counted top = figure top - S-196 - font x S-233 stays in the band; ${OC_10_LOWERED_BY_THE_LABEL}`)
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
        const countedCentre = extentOf(drawn.plan).top - S_196 - heightPx / 2
        expect(nameTextAttributeOf(svg, uid, 'dominant-baseline'), `${tag}: premise, y is the alphabetic baseline`).toBeNull()
        expect(nameTextAttributeOf(svg, uid, 'alignment-baseline'), `${tag}: premise, y is the alphabetic baseline`).toBeNull()
        const written = nameTextAttributeOf(svg, uid, 'y') ?? 'NaN'
        const halfOfLastWrittenPlace = 0.5 * 10 ** -(written.split('.')[1] ?? '').length
        const expectedBaseline = countedCentre + S_33 * fontPx
        expect(
          Math.abs(Number(written) - expectedBaseline),
          `${tag}: drawn y ${written} against figure top - S-196 - font x S-233 / 2 + S-33 x font = ${expectedBaseline}; ${OC_10_BASELINE_BELOW_THE_CENTRE}`,
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
const S_25 = num('resumeScaleInvalid')
const S_26 = num('resumeArmOfMarker')
const S_27 = num('resumeHeadOfMarker')
const S_30 = num('labelCoef')
const S_32 = num('labelGap')

const MARKER_REACH = S_23 + S_22
const UNDATED_ICON_REACH = S_23 + S_22 * S_25 * (S_26 + S_27)

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

describe('T-243 closing rule -- the name starts S-32 past the rightmost of the shape, marker (1) and marker (2)', () => {
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
    expect(markerRightOf(drawn), 'marker right = actual right + S-23 + S-22').toBeCloseTo(
      placed.actualReach! + MARKER_REACH,
      6,
    )
  })

  it('PA-2: the name starts at actual right + S-23 + S-22 + S-32, from existing settings only (MUST)', () => {
    const { placed } = sceneOf(IN_PROGRESS)
    expect(placed.labelX, T_243_NO_NEW_SETTING).toBeCloseTo(placed.actualReach! + MARKER_REACH + S_32, 6)
  })

  it('PA-3: a resume icon standing on its own day takes no room in the order (MUST NOT)', () => {
    for (const task of [RESUME_DATED, DATED_AND_INSIDE]) {
      const { placed, drawn } = sceneOf(task)
      expect(drawn!.resume, 'premise: FR-044 draws the icon while suspended').not.toBeNull()
      expect(placed.labelX, T_243_NO_ROOM_FOR_A_DATED_RESUME_ICON).toBeCloseTo(
        shapeRightOf(placed) + MARKER_REACH + S_32,
        6,
      )
    }
  })

  it('an actual one day short of the plan end: (1) stands outside the shape, (2) further right, and the name counts (2) (MUST, MUST NOT)', () => {
    const both = sceneOf(STOPS_ONE_DAY_SHORT)
    const planOnly = sceneOf(STOPS_ONE_DAY_SHORT, PLAN_ONLY)
    const shapeRight = shapeRightOf(both.placed)
    const marker1 = markerRightOf(both.drawn)
    const marker2 = markerRightOf(planOnly.drawn)
    expect(both.layout.pxPerDay, 'premise: one day is narrower than S-23 + S-22').toBeLessThan(MARKER_REACH)
    expect(marker1, 'premise: (1) right = actual right + S-23 + S-22, right of the shape').toBeGreaterThan(shapeRight)
    expect(marker2, 'premise: FR-013 moves (2) S-23 off the plan right').toBeCloseTo(both.placed.x + both.placed.width + MARKER_REACH, 6)
    expect(both.placed.labelX, T_243_LABEL_LEFT_EDGE).toBeCloseTo(Math.max(shapeRight, marker1, marker2) + S_32, 6)
    expect(both.placed.labelX, T_243_NOT_BY_MARKER_1_ALONE).not.toBeCloseTo(Math.max(shapeRight, marker1) + S_32, 6)
    expect(both.placed.labelX - shapeRight, `${T_243_NO_OTHER_ROOM} -- CR-380 7.3: 34px to the glyphs = S-23 + S-22 + S-32 + S-31`).toBeCloseTo(
      MARKER_REACH + S_32,
      6,
    )
  })

  it('a marker (1) standing inside the shape takes no room outside it: the name is S-32 past (2) (MUST NOT)', () => {
    const both = sceneOf(STOPS_INSIDE)
    const planOnly = sceneOf(STOPS_INSIDE, PLAN_ONLY)
    expect(markerRightOf(both.drawn) - S_22, 'premise: (1) left edge inside the shape').toBeLessThan(shapeRightOf(both.placed))
    expect(both.placed.labelX, T_243_NO_OTHER_ROOM).toBeCloseTo(markerRightOf(planOnly.drawn) + S_32, 6)
    expect(both.placed.labelX, T_243_BOTH_COUNTED_WHATEVER_IS_SHOWN).toBeCloseTo(shapeRightOf(both.placed) + MARKER_REACH + S_32, 6)
  })

  it('PA-4, actual past the plan: the undated icon at (1) is counted by its own right edge (MUST)', () => {
    const { placed, drawn } = sceneOf(RESUME_UNDATED)
    expect(iconRightOf(drawn), 'premise: LF-11 / LF-13 icon right = marker right + S-23 + S-22 x S-25 x (S-26 + S-27)').toBeCloseTo(
      markerRightOf(drawn) + UNDATED_ICON_REACH,
      6,
    )
    expect(placed.labelX, T_243_PA_4_COUNTS_THE_ICON).toBeCloseTo(iconRightOf(drawn) + S_32, 6)
  })

  it('PA-4, actual inside the plan: the undated icon at (2) is counted by its own right edge (MUST)', () => {
    const both = sceneOf(UNDATED_AND_INSIDE)
    const planOnly = sceneOf(UNDATED_AND_INSIDE, PLAN_ONLY)
    const iconAt2 = iconRightOf(planOnly.drawn)
    expect(iconAt2, 'premise: (2) icon right = plan right + S-23 + S-22 + S-23 + S-22 x S-25 x (S-26 + S-27)').toBeCloseTo(
      both.placed.x + both.placed.width + MARKER_REACH + UNDATED_ICON_REACH,
      6,
    )
    expect(both.placed.labelX, T_243_PA_4_COUNTS_THE_ICON).toBeCloseTo(Math.max(iconRightOf(both.drawn), iconAt2) + S_32, 6)
  })

  const EVERY_TASK = [
    ...PAST_THE_PLAN,
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

  it.each(PAST_THE_PLAN)('%s: hiding the marker (S-63 false) moves the name left to the shape right + S-32 (MUST)', (_row, task) => {
    const withMarker = sceneOf(task)
    const hidden = sceneOf(task, { marks: false, plan: true, actual: true })
    expect(withMarker.placed.labelPlacement, 'premise: this task writes its name outside the shape').toBe('right')
    expect(
      hidden.placed.labelX,
      T_243_HIDDEN_MARKER_MOVES_THE_NAME_LEFT,
    ).toBeCloseTo(shapeRightOf(hidden.placed) + S_32, 6)
    expect(
      withMarker.placed.labelX - hidden.placed.labelX,
      `${T_243_HIDDEN_MARKER_MOVES_THE_NAME_LEFT} -- the name moves left by exactly the room the marker took`,
    ).toBeGreaterThan(0)
  })

  it('hiding the marker also takes it out of the width T-013 measures inside the shape (MUST)', () => {
    const withMarker = sceneOf(NAME_INSIDE)
    const hidden = sceneOf(NAME_INSIDE, { marks: false, plan: true, actual: true })
    expect(withMarker.placed.labelPlacement, 'premise: the short name is written inside').toBe('inside')
    expect(hidden.placed.labelPlacement, T_013_HIDDEN_MARKER_IS_NOT_COUNTED).toBe('inside')
    expect(hidden.drawn!.label!.x, T_013_HIDDEN_MARKER_IS_NOT_COUNTED).toBeLessThan(
      withMarker.drawn!.label!.x,
    )
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
  return drawn!.label!.x - (placed.actualReach! + MARKER_REACH + S_32)
}

describe('T-013 -- a name written inside a shape starts S-32 right of marker (1)', () => {
  it('premise: an outside name and an inside name share one left-edge convention, read off PA-2', () => {
    expect(Number.isFinite(OUTSIDE_LABEL_EDGE_OFFSET())).toBe(true)
  })

  it('premise: marker (1) stands inside the 40-day plan, S-23 past the actual right', () => {
    const { placed, drawn } = sceneOf(NAME_INSIDE)
    expect(markerRightOf(drawn)).toBeCloseTo(placed.actualReach! + MARKER_REACH, 6)
    expect(markerRightOf(drawn) - S_22).toBeLessThan(placed.x + placed.width)
  })

  it('a short name is written inside, from marker (1) right + S-32 (MUST)', () => {
    const { placed, drawn } = sceneOf(NAME_INSIDE)
    expect(placed.labelPlacement).toBe('inside')
    expect(drawn!.label!.x - (markerRightOf(drawn) + S_32), T_013_WRITING_STARTS_THERE).toBeCloseTo(
      OUTSIDE_LABEL_EDGE_OFFSET(),
      6,
    )
  })

  it('a name that fits the whole shape but not the width from marker (1) goes to the right, NL-3 (MUST)', () => {
    const probe = sceneOf(NAME_INSIDE)
    const fullWidth = probe.placed.width
    const fromTheMarker = probe.placed.x + probe.placed.width - (markerRightOf(probe.drawn) + S_32)
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
    expect(sceneOf(task).placed.labelPlacement, T_013_WIDTH_FROM_THE_MARKER).toBe('right')
  })

  it('with a fade, the name starts at whichever of the fadeIn end and marker (1) + S-32 stands further right (MUST)', () => {
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
      )
    for (const fadeInDays of [1, 10]) {
      const { layout, placed, drawn } = fadedFor(fadeInDays)
      const fadeEnd = placed.x + fadeInDays * layout.pxPerDay
      expect(placed.labelPlacement, `fadeInDays ${fadeInDays}`).toBe('inside')
      expect(
        drawn!.label!.x - Math.max(fadeEnd, markerRightOf(drawn) + S_32),
        `fadeInDays ${fadeInDays}: ${T_013_FADE_OR_MARKER_WHICHEVER_IS_RIGHT}`,
      ).toBeCloseTo(OUTSIDE_LABEL_EDGE_OFFSET(), 6)
    }
  })
})

const S_31 = num('labelPad')

// see T-013, T-243
const nameGlyphXOf = (task: Task): number => {
  const settings = settingsOf({ assigneeVisible: false, percentCompleteVisible: false })
  const schedule = rowsOf([[task]])
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  const geometry = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection())
  const svg = svgFromSchedule(schedule, settings, layout, geometry, REGIONS, emptySelection(), 'screen')
  const figure = svg.indexOf('data-figure="task-1-label"')
  const opened = figure < 0 ? -1 : svg.lastIndexOf('<text ', figure)
  const x = opened < 0 ? null : / x="(-?[\d.]+)"/.exec(svg.slice(opened, figure))
  if (x === null || x === undefined) throw new Error('the name label was not drawn as a text with an x')
  return Number(x[1])
}

const shortActualNamed = (name: string, fade: { readonly fadeInDays?: number; readonly fadeOutDays?: number }): Task =>
  spanning(1, '2026-02-02', 40, {
    name,
    percentComplete: 40,
    actualStart: '2026-02-02',
    stop: '2026-02-03',
    resumeValid: true,
    ...fade,
  })

describe('T-013 / T-243 (CR-387) -- the name box, and S-31 counted once inside it', () => {
  it('the box left edge is marker (1) + S-32 inside, the fadeIn end when that is further right, and T-243\'s left edge outside (MUST)', () => {
    const inside = sceneOf(NAME_INSIDE)
    expect(inside.placed.labelPlacement).toBe('inside')
    expect(inside.drawn!.label!.x, T_013_WRITING_STARTS_THERE).toBeCloseTo(markerRightOf(inside.drawn) + S_32, 6)
    const faded = sceneOf(shortActualNamed('ab', { fadeInDays: 10 }))
    const fadeEnd = faded.placed.x + 10 * faded.layout.pxPerDay
    expect(fadeEnd, 'premise: the fade ends right of marker (1) + S-32').toBeGreaterThan(markerRightOf(faded.drawn) + S_32)
    expect(faded.drawn!.label!.x, T_013_FADE_IN_END_IS_THE_BOX_LEFT).toBeCloseTo(fadeEnd, 6)
    const outside = sceneOf(IN_PROGRESS)
    expect(outside.placed.labelPlacement).toBe('right')
    expect(outside.drawn!.label!.x, T_243_THE_LEFT_EDGE_IS_THE_BOX).toBeCloseTo(outside.placed.actualReach! + MARKER_REACH + S_32, 6)
  })

  it('the glyphs start S-31 right of the box left edge, inside and outside alike, and not 2 x S-31 (MUST, MUST NOT)', () => {
    const inside = sceneOf(NAME_INSIDE)
    const insideBoxLeft = markerRightOf(inside.drawn) + S_32
    expect(nameGlyphXOf(NAME_INSIDE), T_013_S_31_IS_INSIDE_THE_BOX).toBeCloseTo(insideBoxLeft + S_31, 6)
    expect(nameGlyphXOf(NAME_INSIDE), T_013_S_31_NOT_TWICE).not.toBeCloseTo(insideBoxLeft + 2 * S_31, 6)
    const outside = sceneOf(IN_PROGRESS)
    const outsideBoxLeft = outside.placed.actualReach! + MARKER_REACH + S_32
    expect(nameGlyphXOf(IN_PROGRESS), T_013_S_31_IS_INSIDE_THE_BOX).toBeCloseTo(outsideBoxLeft + S_31, 6)
  })

  it('NL-1 fits the glyphs plus S-31 into the room from the box left edge to the shape right less fadeOut (MUST)', () => {
    const halfWidthUnit = RECTANGLE_NAME_PX_AT_UNITY * S_30
    const FADES = [
      {},
      { fadeInDays: 10 },
      { fadeOutDays: 5 },
      { fadeInDays: 10, fadeOutDays: 5 },
      { fadeInDays: 3, fadeOutDays: 5 },
      { fadeInDays: 1, fadeOutDays: 2 },
    ] as const
    let fitsOnlyWithoutS31 = 0
    let fitsOnceNotTwice = 0
    for (const fade of FADES) {
      const probe = sceneOf(shortActualNamed('a', fade))
      const pxPerDay = probe.layout.pxPerDay
      const fadeIn = 'fadeInDays' in fade ? fade.fadeInDays : 0
      const fadeOut = 'fadeOutDays' in fade ? fade.fadeOutDays : 0
      const boxLeft = Math.max(probe.placed.x + fadeIn * pxPerDay, markerRightOf(probe.drawn) + S_32)
      const room = probe.placed.x + probe.placed.width - fadeOut * pxPerDay - boxLeft
      const clause = fadeIn > 0 && fadeOut > 0 ? T_013_BOTH_FADE_AND_MARKER_WIDTH : T_013_NL_1_FITS_WITH_S_31
      for (let units = 1; units <= 40; units += 1) {
        const spare = room - units * halfWidthUnit
        if (spare >= 0 && spare < S_31) fitsOnlyWithoutS31 += 1
        if (spare >= S_31 && spare < 2 * S_31) fitsOnceNotTwice += 1
        const expected = spare >= S_31 - 1e-6 ? 'inside' : 'right'
        const placement = sceneOf(shortActualNamed('a'.repeat(units), fade)).placed.labelPlacement
        expect({ clause, fade, units, placement }).toEqual({ clause, fade, units, placement: expected })
      }
    }
    expect(fitsOnlyWithoutS31, 'premise: some name would fit if S-31 were not counted').toBeGreaterThan(0)
    expect(fitsOnceNotTwice, 'premise: some name fits with S-31 once but not twice').toBeGreaterThan(0)
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
  it('premise: S-36 x S-38 / (S-4 x S-13 x S-5 x S-7) is the 1.3201 CR-381 7.3 names, and the floors let go below it', () => {
    expect(ROW_CEILING_BY_TYPE).toBeCloseTo(1.3201, 4)
    expect(PLAN_FLOOR_LETS_GO_AT, '(S-6 / S-5) / S-4').toBeCloseTo(0.99988, 5)
    expect(FONT_FLOOR_LETS_GO_AT, 'S-8 / (S-4 x S-13 x S-5 x S-7)').toBeCloseTo(0.93738, 5)
    expect(Math.max(ROW_CEILING_BY_TYPE, PLAN_FLOOR_LETS_GO_AT, FONT_FLOOR_LETS_GO_AT)).toBe(ROW_CEILING_BY_TYPE)
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
    expect(zoomYAfterRaise(RECTANGLE_ROW, 1.25, TALL), FR_016_SOLVED_FOR_THE_ZOOM).toBeLessThanOrEqual(ROW_CEILING_BY_TYPE + 1e-9)
  })

  it('the ceiling follows S-38: a depth-1 scale of 1.5 lets the raise reach past 1.3201 and stops at S-36 x 1.5 / 12.8016 (MUST)', () => {
    const solved = (S_36 * 1.5) / RECTANGLE_NAME_PX_AT_UNITY
    expect(solved, 'premise: 19.5 / 12.8016').toBeCloseTo(1.5232, 4)
    const start = 1.4
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
    expect(bandAt(answered), FR_016_TALLEST_BAND_ASKED_OF_PI_5).toBeLessThanOrEqual(
      regions.rowArea.height + 1e-6,
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
    expect(topOf(0) - topOf(0.5), T_023D_FRACTION_OF_THE_PITCH).toBeCloseTo(pitch / 2, 6)
  })
})
