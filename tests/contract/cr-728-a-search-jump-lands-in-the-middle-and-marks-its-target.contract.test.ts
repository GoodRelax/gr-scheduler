// CR-728 spec-only cases: SJ-5, SJ-6, SJ-9, SJ-10 of table T-332 and the landing mark of table T-280.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  installAgentApi,
  type AgentApi,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { HumanInput, PointerInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionWith, type Selection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  searchJumpReachOf,
  searchJumpWrites,
  type SearchJumpPlan,
  type SearchJumpTarget,
} from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from './spec-table'

const rowCells = (table: string, id: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell
}

const numberIn = (cell: string): number => {
  const found = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`no number in ${cell}`)
  return Number(found[0])
}

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const STATE_MACHINES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'))


const SJ_10_MARK = '飛ぶ先のタスクかコメントボックスに、飛んだ先の印を付けること（MUST）'
const SJ_10_KEEP = '波紋の後は囲みだけを残し、`FR-009` の 表 T-303 の `EL-17` の決まりで消すこと（MUST）'
const SJ_10_RING = '① 囲み —— 予定の形（タスクは描いた予定の図形で実績を含めず、コメントボックスは箱）の外接矩形から `_assets/tbl-settings.md` の `S-555` だけ外に、表 T-236 の `S-151` の色で描く、太さ `S-556` の実線の矩形 —— 選択の枠（表 T-023c の `SL-8`）の外側に在る。'
const SJ_10_RIPPLE =
  '② 波紋 —— 印を付けた時から、囲みと同じ色と太さの矩形を、`S-558` の長さのあいだに囲みの所から各辺 `S-559` だけ外へ広げながら、不透明から透明へ消す。'
const SJ_10_TIMES = 'これを `S-557` 回続けて出し、出し終えたら消す。'
const SJ_10_INSIDE = '囲みと波紋は `Task Group Area`（`_assets/tbl-glossary.md` の `U-50`）の中に描く。'
const SJ_10_Z = '日程表の前後（`FR-110` の 表 T-020）では `ZO-10` に在る。'
const SJ_10_REDUCED =
  '⭐ 閲覧環境が動きを減らす設定（`prefers-reduced-motion: reduce`）のときは波紋を出さず、囲みだけとする'
const SJ_10_ENTRANCES =
  '⭐ 押して飛ぶ入口（`SJ-1` のセル、`FR-134` の行、表 T-351 の `PTL-16` の親の名、`_assets/tbl-property-items.md` の `PR-37`・`PR-38` の名）では、押下が古い印を消し（`EL-17`）、離して飛んだときに新しい印を付ける。'
const SJ_10_AM_16 = '`SJ-9` の `AM-16` は古い印を新しい印に置き換える。'
const SJ_10_NOT_DRAWN =
  '⚠️ `SJ-8` で画面に出せなかったときと、飛ぶ先の予定の形が描かれていないとき（予定を持たないタスク、予定を表示していないとき —— `S-227` が偽）は、囲みも波紋も描かない。'
const SJ_10_NOT_SAVED =
  '⛔ 保存と取り消しは `EL-16` の送った先の印と同じとする —— 同じ状態機械（`_assets/tbl-state-machines.md` の 表 T-280 の `landingMarkDisplayStateMachine`）が持つ。'
const SJ_10_EXPORT = '⚠️ 書き出す絵（`FR-080`）には描かない。'
const SJ_10_NO_GAP = '⚠️ 掴み代（`FR-105`）と縦の隙間（`FR-094`）は印で変えない'
const SJ_5_MIDDLE =
  '飛ぶ先の予定の形（タスクは描いた予定の図形、コメントボックスは箱）の縦の中点が、ピン止めの帯（`FR-098`）の下に残る `Task Group Area`（`_assets/tbl-glossary.md` の `U-50`）の上の縁から、その高さに `_assets/tbl-settings.md` の `S-554` を掛けた所に来るよう、`S-78` と `S-176` を置く。'
const SJ_5_AFTER_REVEAL = '⭐ 縦の位置は `SJ-2` で展開した後の割付けで読む —— 展開は飛ぶ先より上のタスクグループの高さを変える。'
const SJ_5_FIRST = '⚠️ 最初のタスクグループより上へは送れない（`S-176` は 0 から） —— 送れる所で止め、形はそれより上に来る。'
const SJ_6_MIDDLE =
  '倍率を変えない。飛ぶ先の予定の形の横の中点が `Task Group Area` の横の中点に来るよう、`S-77` と `S-177` を置く'
const SJ_6_WIDE =
  '⭐ ただし形の幅が `Task Group Area` の幅から `S-428` の 2 つ分を引いた幅より広いときは、飛ぶ先の日付（タスクは `AT-28`、コメントボックスは `AT-113`）が表示の左端から `S-428` だけ内側に来るよう置く。'
const SJ_6_OCCUPANCY =
  '飛ぶ先がタスクで、表 T-038 が左へ数える占有（担当と完了率の札 `OC-2` ほか）が日付より左へ出ているときは、日付ではなくその占有の左端を `S-428` だけ内側に置く'
const SJ_9_STEPS = '`_assets/tbl-glossary.md` の 表 T-107 の `AM-16` は `SJ-0`・`SJ-2`・`SJ-5` 〜 `SJ-8`・`SJ-10` を行う'
const SJ_9_NO_PANEL = 'ただし `SJ-4` を行わず、パネルに触れず、`SJ-8` では告げずに、寄せなかったことを答えの値で返す'
const FR_134_JUMP = '表の 1 行の名前を押したら、その行の `Task` へ、`FR-151` の 表 T-332 の飛び方（`SJ-0`・`SJ-2` 〜 `SJ-8`・`SJ-10`）で飛ぶこと（MUST）。'
const PTL_16_JUMP = 'その親の `Task` へ、`FR-151` の 表 T-332 の飛び方（`SJ-0`・`SJ-2` 〜 `SJ-8`・`SJ-10`）で飛び、親を選ぶ。'
const T_280_JUMP_ROW = '| `screen/searchJumpLanded` | → `shown` | → 自己（中身を書き換える） |'
const T_280_CLEAR_ROW = '| `screen/landingMarkClearAsked` | — | → `hidden` |'
const T_280_SHOWN_CARRIES =
  '運ぶ値 `landedBy`（印を付けたもの —— `continuationMark`（続きの印、`EL-16`） ／ `jump`（飛び方、`SJ-10`）） ／ `landedLink`（印を付けた依存線の先行と後続の `UID`。`landedBy` が `continuationMark` のときだけ持ち、`jump` では `null`） ／ `landedTarget`（印の先の `Task` の `UID`、またはコメントボックスの id）。'
const EL_16_NOT_SAVED = '⛔ 印を文書に保存してはならず、取り消しの対象にしてはならない（MUST NOT）'
const EL_17_CLEAR = '印が出ているあいだに、人が次のどれかを行ったら、印を消すこと（MUST）: 押下（どのボタンでも、画面のどこでも）、キーの押下。'
const EL_17_VIEW_KEEPS = '⭐ ただし、見る位置と倍率だけを動かす操作'
const EL_17_WHEEL = 'ホイール（表 T-023 の `MK-1` 〜 `MK-5`、面やパネルの上でその中を送るものを含め、ホイールはどれも消さない）'
const EL_17_MODIFIER = '修飾キー（`Ctrl` ・ `Shift` ・ `Alt` ・ `Meta`）だけの押下でも消さないこと（MUST）'
const EL_18_NOTHING =
  '印が出ているあいだの 2 回目の押下（宿主が数える押下の回数が 2 以上の押下）では、何もしないこと（MUST）'
const ZO_10_RING = '飛んだ先の印の囲みと波紋（`FR-151` の 表 T-332 の `SJ-10`）'
const UZ_12_INSIDE = '中の前後は `FR-110` の 表 T-020 に従うこと（MUST）'

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

describe('CR-728 -- the manuscript these cases are driven by', () => {
  it.each([
    ['T-332 SJ-10 (a mark is put on the target)', rowCells('T-332', 'SJ-10'), SJ_10_MARK],
    ['T-332 SJ-10 (the ring stays and is cleared by EL-17)', rowCells('T-332', 'SJ-10'), SJ_10_KEEP],
    ['T-332 SJ-10 (ring)', rowCells('T-332', 'SJ-10'), SJ_10_RING],
    ['T-332 SJ-10 (ripple)', rowCells('T-332', 'SJ-10'), SJ_10_RIPPLE],
    ['T-332 SJ-10 (times)', rowCells('T-332', 'SJ-10'), SJ_10_TIMES],
    ['T-332 SJ-10 (inside the Task Group Area)', rowCells('T-332', 'SJ-10'), SJ_10_INSIDE],
    ['T-332 SJ-10 (ZO-10)', rowCells('T-332', 'SJ-10'), SJ_10_Z],
    ['T-332 SJ-10 (reduced motion)', rowCells('T-332', 'SJ-10'), SJ_10_REDUCED],
    ['T-332 SJ-10 (entrances)', rowCells('T-332', 'SJ-10'), SJ_10_ENTRANCES],
    ['T-332 SJ-10 (AM-16)', rowCells('T-332', 'SJ-10'), SJ_10_AM_16],
    ['T-332 SJ-10 (not drawn)', rowCells('T-332', 'SJ-10'), SJ_10_NOT_DRAWN],
    ['T-332 SJ-10 (not saved)', rowCells('T-332', 'SJ-10'), SJ_10_NOT_SAVED],
    ['T-332 SJ-10 (export)', rowCells('T-332', 'SJ-10'), SJ_10_EXPORT],
    ['T-332 SJ-10 (no grab change)', rowCells('T-332', 'SJ-10'), SJ_10_NO_GAP],
    ['T-332 SJ-5 (middle)', rowCells('T-332', 'SJ-5'), SJ_5_MIDDLE],
    ['T-332 SJ-5 (after the reveal)', rowCells('T-332', 'SJ-5'), SJ_5_AFTER_REVEAL],
    ['T-332 SJ-5 (first task group)', rowCells('T-332', 'SJ-5'), SJ_5_FIRST],
    ['T-332 SJ-6 (middle)', rowCells('T-332', 'SJ-6'), SJ_6_MIDDLE],
    ['T-332 SJ-6 (wide)', rowCells('T-332', 'SJ-6'), SJ_6_WIDE],
    ['T-332 SJ-6 (occupancy)', rowCells('T-332', 'SJ-6'), SJ_6_OCCUPANCY],
    ['T-332 SJ-9 (steps)', rowCells('T-332', 'SJ-9'), SJ_9_STEPS],
    ['T-332 SJ-9 (no panel)', rowCells('T-332', 'SJ-9'), SJ_9_NO_PANEL],
    ['T-303 EL-16 (not saved)', rowCells('T-303', 'EL-16'), EL_16_NOT_SAVED],
    ['T-303 EL-17 (clear)', rowCells('T-303', 'EL-17'), EL_17_CLEAR],
    ['T-303 EL-17 (view keeps)', rowCells('T-303', 'EL-17'), EL_17_VIEW_KEEPS],
    ['T-303 EL-17 (wheel)', rowCells('T-303', 'EL-17'), EL_17_WHEEL],
    ['T-303 EL-17 (modifier)', rowCells('T-303', 'EL-17'), EL_17_MODIFIER],
    ['T-303 EL-18', rowCells('T-303', 'EL-18'), EL_18_NOTHING],
    ['T-020 ZO-10', rowCells('T-020', 'ZO-10'), ZO_10_RING],
    ['T-337 UZ-12', rowCells('T-337', 'UZ-12'), UZ_12_INSIDE],
    ['T-351 PTL-16', rowCells('T-351', 'PTL-16'), PTL_16_JUMP],
  ] as const)('%s still says it', (_name, cell, clause) => {
    expect(flat(cell), clause).toContain(flat(clause))
  })

  it('FR-134, table T-280 and the state machine rows still say it', () => {
    expect(REQUIREMENTS, FR_134_JUMP).toContain(FR_134_JUMP)
    for (const clause of [T_280_JUMP_ROW, T_280_CLEAR_ROW, T_280_SHOWN_CARRIES]) {
      expect(STATE_MACHINES, clause).toContain(clause)
    }
  })

  it('the values: S-554 is a ratio inside (0, 1), S-555 / S-556 / S-558 / S-559 are positive, S-557 is a whole count', () => {
    expect(S_554).toBeGreaterThan(0)
    expect(S_554).toBeLessThan(1)
    for (const value of [S_555, S_556, S_558, S_559, S_428]) expect(value).toBeGreaterThan(0)
    expect(Number.isInteger(S_557) && S_557 > 0).toBe(true)
  })
})

const T206 = (id: string): number => numberIn(cellOf('T-206', id, '既定'))
const S_554 = T206('S-554')
const S_555 = T206('S-555')
const S_556 = T206('S-556')
const S_557 = T206('S-557')
const S_558 = T206('S-558')
const S_559 = T206('S-559')
const S_428 = T206('S-428')


type Loose = Record<string, any>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)
const HOME = iso(-7)
const WITHIN_A_PIXEL = 1

const taskOf = (uid: number, start: number, days: number): Loose => ({
  uid,
  parentTaskUid: null,
  wbsOrder: null,
  name: `t${uid}`,
  start: iso(start),
  finish: iso(start + days),
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
})

type TreeState = 'auto' | 'collapsed' | 'expanded' | 'temporarilyExpanded' | 'hidden'
type GroupSpec = readonly [string, string | null, TreeState?]

interface SceneSpec {
  readonly groups: readonly GroupSpec[]
  readonly tasks: readonly (readonly [Loose, string])[]
  readonly commentBoxes?: readonly Loose[]
  readonly resources?: readonly Loose[]
  readonly assignments?: readonly Loose[]
  readonly settings?: Loose
  readonly screenHeight?: number
}

const commentBoxOf = (id: string, anchorGroupId: string, anchorDate: string | null): Loose => ({
  id,
  leaderShapeKind: null,
  text: id,
  anchorDate,
  anchorGroupId,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
})

const scheduleOf = (spec: SceneSpec): Loose => ({
  project: { ...structuredClone(TEMPLATE['schedule'].project), calendarUid: null, statusDate: null, title: null, themeHue: 214 },
  calendars: [],
  resources: spec.resources ?? [],
  assignments: spec.assignments ?? [],
  highlightBoxes: [],
  commentBoxes: spec.commentBoxes ?? [],
  tasks: spec.tasks.map(([task]) => task),
  taskGroups: spec.groups.map(([id, parentId, treeState], order) => ({
    id,
    parentId,
    order,
    minHeight: null,
    label: id,
    derivedFromTaskUid: null,
    treeState: treeState ?? 'auto',
    editGroup: null,
    color: null,
  })),
  taskGroupMembers: spec.tasks.map(([task, groupId]) => ({ groupId, taskUid: task['uid'] })),
  taskVisuals: spec.tasks.map(([task]) => ({ taskUid: task['uid'], shapeKind: 'rectangle' })),
  taskOrigins: [],
  baselineTasks: [],
})

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Placement {
  readonly taskUid: number
  readonly x: number
  readonly width: number
  readonly y: number
  readonly planHeight: number
  readonly occupiedX0: number
}

interface Scene {
  readonly spec: SceneSpec
  readonly settings: Loose
  readonly schedule: Loose
  readonly document: Document
  readonly regions: { readonly taskGroupArea: Rect }
  readonly layout: { readonly placements: readonly Placement[]; readonly pxPerDay: number; readonly pinnedBandHeight?: number }
  readonly geometry: { readonly commentBoxes: readonly { readonly id: string; readonly body: Rect }[] }
  readonly selection: Selection
}

const sceneOf = (spec: SceneSpec, override: Loose = {}, selection: Selection = emptySelection()): Scene => {
  const settings = { ...SETTINGS_DEFAULTS, scrollDate: HOME, zoomX: 1, ...spec.settings, ...override }
  const regions = regionsFromScreen({ ...ENVIRONMENT, height: spec.screenHeight ?? ENVIRONMENT.height } as never, settings as never)
  const schedule = scheduleOf(spec)
  const layout = layoutFromSchedule(schedule as never, settings as never, regions)
  const geometry = geometryFromLayout(schedule as never, settings as never, layout, regions, selection, null)
  const document = { ...TEMPLATE, schedule, documentSettings: settings } as unknown as Document
  return { spec, settings, schedule, document, regions, layout, geometry, selection } as unknown as Scene
}

const GROUP_COUNT = 30
const GROUP_IDS = Array.from({ length: GROUP_COUNT }, (_, at) => `g${String(at)}`)
// WHY: task N sits in group g(N-1), so a task's uid says how far down the task group list it is.
const LONG_LIST: SceneSpec = {
  groups: GROUP_IDS.map((id): GroupSpec => [id, null]),
  tasks: GROUP_IDS.map((id, at) => [taskOf(at + 1, at * 3, 5), id] as const),
  commentBoxes: [commentBoxOf('box-dated', 'g14', iso(40)), commentBoxOf('box-undated', 'g14', null)],
}

const TASK = (taskUid: number): SearchJumpTarget => ({ kind: 'task', taskUid })
const BOX = (commentBoxId: string): SearchJumpTarget => ({ kind: 'commentBox', commentBoxId })

const placementOf = (scene: Scene, uid: number): Placement => {
  const found = scene.layout.placements.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`the layout drew no task ${String(uid)}`)
  return found
}

interface Landed {
  readonly plan: SearchJumpPlan
  readonly before: Scene
  readonly after: Scene
}

const scrollFieldsOf = (plan: SearchJumpPlan): Loose => {
  if (plan.scrollWrite === null) return {}
  const { kind: _kind, ...fields } = plan.scrollWrite as unknown as Loose
  return fields
}

// WHY: the shell reads the reach on the picture drawn after SJ-2's reveal (SJ-5); `revealed` is that picture's schedule,
// and `after` is the same picture with the written view position.
/** @purity pure */
function jump(spec: SceneSpec, target: SearchJumpTarget, start: Loose = {}, revealed: SceneSpec = spec): Landed {
  const before = sceneOf(spec, start)
  const picture = sceneOf(revealed, start)
  const reach = searchJumpReachOf(picture.layout as never, picture.geometry as never, picture.regions.taskGroupArea as never, target)
  const plan = searchJumpWrites(before.document, target, true, reach)
  return { plan, before, after: sceneOf(revealed, { ...start, ...scrollFieldsOf(plan) }) }
}

const middleOfTask = (scene: Scene, uid: number): { readonly x: number; readonly y: number } => {
  const placed = placementOf(scene, uid)
  return { x: placed.x + placed.width / 2, y: placed.y + placed.planHeight / 2 }
}

const middleOfBox = (scene: Scene, id: string): { readonly x: number; readonly y: number } => {
  const found = scene.geometry.commentBoxes.find((one) => one.id === id)
  if (found === undefined) throw new Error(`the geometry drew no comment box ${id}`)
  return { x: found.body.x + found.body.width / 2, y: found.body.y + found.body.height / 2 }
}

const areaMiddleX = (scene: Scene): number => scene.regions.taskGroupArea.x + scene.regions.taskGroupArea.width / 2
const wantedMiddleY = (scene: Scene): number => scene.regions.taskGroupArea.y + scene.regions.taskGroupArea.height * S_554

const FAR_START = { scrollDate: iso(300), scrollGroupId: 'g25', scrollGroupOffset: 0.4, scrollDayOffset: 0.3 }

describe(`T-332 SJ-5 / SJ-6 -- ${SJ_5_MIDDLE}`, () => {
  it.each([
    ['from the top', {}, 15],
    ['from a view far below and to the right', FAR_START, 13],
    ['from a view above the target', { scrollGroupId: 'g2', scrollGroupOffset: 0.7 }, 21],
    ['from a view that already shows the target', { scrollGroupId: 'g10', scrollDate: iso(30) }, 15],
  ] as const)('a task is put at the Task Group Area middle across and S-554 down, %s', (_name, start, uid) => {
    const { after } = jump(LONG_LIST, TASK(uid), start)
    expect(placementOf(after, uid), 'premise: the task is drawn after the jump').toBeDefined()
    const middle = middleOfTask(after, uid)
    expect(Math.abs(middle.x - areaMiddleX(after)), `${SJ_6_MIDDLE} (x ${String(middle.x)})`).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(Math.abs(middle.y - wantedMiddleY(after)), `${SJ_5_MIDDLE} (y ${String(middle.y)})`).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it.each([[500], [1000]])('S-554 is a share of the room: on a screen %i high the middle stands at the same share', (screenHeight) => {
    const { after } = jump({ ...LONG_LIST, screenHeight }, TASK(15), FAR_START)
    expect(Math.abs(middleOfTask(after, 15).y - wantedMiddleY(after)), SJ_5_MIDDLE).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it('SJ-5: with pinned task groups the share is taken of the room the pinned band leaves, from its top edge', () => {
    const pinned: SceneSpec = { ...LONG_LIST, settings: { pinnedGroupIds: ['g0', 'g1'] } }
    const { after } = jump(pinned, TASK(15), FAR_START)
    const band = after.layout.pinnedBandHeight ?? 0
    expect(band, 'premise: the pinned band takes room').toBeGreaterThan(0)
    const area = after.regions.taskGroupArea
    const wanted = area.y + band + (area.height - band) * S_554
    expect(Math.abs(middleOfTask(after, 15).y - wanted), SJ_5_MIDDLE).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it('SJ-7: a target in a pinned task group is centered across and the vertical anchor is left alone', () => {
    const pinned: SceneSpec = { ...LONG_LIST, settings: { pinnedGroupIds: ['g0', 'g1'] } }
    const { plan, after } = jump(pinned, TASK(1), FAR_START)
    expect(Math.abs(middleOfTask(after, 1).x - areaMiddleX(after)), SJ_6_MIDDLE).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(scrollFieldsOf(plan)['scrollGroupId']).toBe(FAR_START.scrollGroupId)
    expect(scrollFieldsOf(plan)['scrollGroupOffset']).toBe(FAR_START.scrollGroupOffset)
  })

  it('SJ-6: the zoom is not changed -- no write of the plan touches it', () => {
    const { plan } = jump(LONG_LIST, TASK(15), { ...FAR_START, zoomX: 2, zoomY: 1.5 })
    const kinds = [...plan.treeStateWrites, ...(plan.scrollWrite === null ? [] : [plan.scrollWrite])].map(
      (write) => (write as unknown as Loose)['kind'],
    )
    for (const kind of kinds) expect(['setTaskGroupTreeState', 'setLevelZeroTreeState', 'setScrollPosition']).toContain(kind)
  })

  it('SJ-6: the middle is the middle at any horizontal zoom', () => {
    for (const zoomX of [0.5, 2]) {
      const { after } = jump(LONG_LIST, TASK(15), { zoomX })
      expect(Math.abs(middleOfTask(after, 15).x - areaMiddleX(after)), `zoomX ${String(zoomX)}`).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    }
  })

  it('SJ-5: the middle is read at any vertical zoom', () => {
    for (const zoomY of [0.6, 1.8]) {
      const { after } = jump(LONG_LIST, TASK(15), { zoomY, ...FAR_START })
      expect(Math.abs(middleOfTask(after, 15).y - wantedMiddleY(after)), `zoomY ${String(zoomY)}`).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    }
  })

  it.each([[1], [4]])('a dated comment box goes to the same place, by the middle of the box, at zoomX %i', (zoomX) => {
    const { after } = jump(LONG_LIST, BOX('box-dated'), { ...FAR_START, zoomX })
    const middle = middleOfBox(after, 'box-dated')
    expect(Math.abs(middle.x - areaMiddleX(after)), `SJ-6 for a box (x ${String(middle.x)} against ${String(areaMiddleX(after))})`).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(Math.abs(middle.y - wantedMiddleY(after)), 'SJ-5 for a box').toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it('SJ-6: a comment box with no date does not move sideways, and is still put S-554 down', () => {
    const { plan, after } = jump(LONG_LIST, BOX('box-undated'), FAR_START)
    expect(scrollFieldsOf(plan)['scrollDate']).toBe(FAR_START.scrollDate)
    expect(scrollFieldsOf(plan)['scrollDayOffset']).toBe(FAR_START.scrollDayOffset)
    expect(Math.abs(middleOfBox(after, 'box-undated').y - wantedMiddleY(after))).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it(`${SJ_5_AFTER_REVEAL}: a task under a folded task group is put S-554 down on the picture the reveal draws`, () => {
    const folded: SceneSpec = {
      groups: [
        ...GROUP_IDS.slice(0, 5).map((id): GroupSpec => [id, null]),
        ['p', null, 'collapsed'],
        ...GROUP_IDS.slice(5, 20).map((id): GroupSpec => [id, null]),
        ...Array.from({ length: 8 }, (_, at): GroupSpec => [`c${String(at)}`, 'p']),
      ],
      tasks: [
        ...GROUP_IDS.slice(0, 5).map((id, at) => [taskOf(at + 1, at * 3, 5), id] as const),
        [taskOf(100, 20, 5), 'c5'] as const,
      ],
    }
    const opened: SceneSpec = { ...folded, groups: folded.groups.map((group): GroupSpec => (group[0] === 'p' ? ['p', null, 'expanded'] : group)) }
    const landed = jump(folded, TASK(100), {}, opened)
    expect(landed.plan.treeStateWrites.length, 'SJ-2 opens the folded task group').toBeGreaterThan(0)
    expect(Math.abs(middleOfTask(landed.after, 100).y - wantedMiddleY(landed.after))).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })
})

describe(`T-332 SJ-5 -- ${SJ_5_FIRST}`, () => {
  it.each([[2], [1]])('a task %i rows from the top stops at the first task group, so the shape is above the S-554 line', (uid) => {
    const { plan, after } = jump(LONG_LIST, TASK(uid), FAR_START)
    expect(scrollFieldsOf(plan)['scrollGroupId'], SJ_5_FIRST).toBe('g0')
    expect(scrollFieldsOf(plan)['scrollGroupOffset'], SJ_5_FIRST).toBe(0)
    expect(middleOfTask(after, uid).y, SJ_5_FIRST).toBeLessThan(wantedMiddleY(after))
    expect(Math.abs(middleOfTask(after, uid).x - areaMiddleX(after)), 'SJ-6 still centers it').toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it('the offset the plan writes is never below 0 and below 1 (S-176)', () => {
    for (const uid of [1, 2, 3, 8, 15, 22]) {
      const fields = scrollFieldsOf(jump(LONG_LIST, TASK(uid), FAR_START).plan)
      expect(fields['scrollGroupOffset'], `task ${String(uid)}`).toBeGreaterThanOrEqual(0)
      expect(fields['scrollGroupOffset'], `task ${String(uid)}`).toBeLessThan(1)
    }
  })
})

describe(`T-332 SJ-6 -- ${SJ_6_WIDE}`, () => {
  const areaWidth = sceneOf(LONG_LIST).regions.taskGroupArea.width
  const pxPerDay = sceneOf(LONG_LIST).layout.pxPerDay
  const daysFor = (px: number): number => Math.round(px / pxPerDay)
  const withWidth = (days: number, extra: Partial<SceneSpec> = {}): SceneSpec => ({
    ...LONG_LIST,
    ...extra,
    tasks: LONG_LIST.tasks.map(([task, group]) => (task['uid'] === 15 ? ([taskOf(15, 45, days), group] as const) : ([task, group] as const))),
  })

  it('a shape well under the width less two insets is centered', () => {
    const spec = withWidth(daysFor(areaWidth - 2 * S_428 - 120))
    const { after } = jump(spec, TASK(15), FAR_START)
    expect(placementOf(after, 15).width, 'premise: the shape is narrower than the limit').toBeLessThan(areaWidth - 2 * S_428)
    expect(Math.abs(middleOfTask(after, 15).x - areaMiddleX(after))).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it('a shape wider than the area less two insets puts its date S-428 inside the left edge of the display', () => {
    const spec = withWidth(daysFor(areaWidth - 2 * S_428 + 200))
    const { after } = jump(spec, TASK(15), FAR_START)
    const placed = placementOf(after, 15)
    expect(placed.width, 'premise: the shape is wider than the limit').toBeGreaterThan(areaWidth - 2 * S_428)
    expect(Math.abs(placed.x - (after.regions.taskGroupArea.x + S_428)), SJ_6_WIDE).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(Math.abs(middleOfTask(after, 15).y - wantedMiddleY(after)), 'SJ-5 still holds for a wide shape').toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })

  it('a wide shape with a left-hanging assignee and percent label puts the left end of that occupancy S-428 inside', () => {
    const spec = withWidth(daysFor(areaWidth - 2 * S_428 + 200), {
      resources: [{ ...(TEMPLATE['schedule'].resources[0] as Loose), uid: 1001, name: 'Analyst A' }],
      assignments: [{ ...(TEMPLATE['schedule'].assignments[0] as Loose), uid: 2001, taskUid: 15, resourceUid: 1001 }],
      settings: { assigneeVisible: true, percentCompleteVisible: true },
    })
    const withLabel = spec.tasks.map(([task, group]) => (task['uid'] === 15 ? ([{ ...task, percentComplete: 40 }, group] as const) : ([task, group] as const)))
    const { after } = jump({ ...spec, tasks: withLabel }, TASK(15), FAR_START)
    const placed = placementOf(after, 15)
    expect(placed.occupiedX0, 'premise: the label hangs left of the date (OC-2)').toBeLessThan(placed.x - 1)
    expect(Math.abs(placed.occupiedX0 - (after.regions.taskGroupArea.x + S_428)), SJ_6_OCCUPANCY).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  })
})


interface Element {
  readonly tag: string
  readonly attrs: string
  readonly zo: string | null
  readonly at: number
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return found === null ? null : found[1]!
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const groups: (string | null)[] = []
  const drawn = svg.replace(/<marker\b[\s\S]*?<\/marker>/g, '').replace(/<clipPath\b[\s\S]*?<\/clipPath>/g, '')
  for (const match of drawn.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrOf(attrs!, 'data-zo'))
      continue
    }
    if (closing === '/') continue
    out.push({ tag: tag!, attrs: attrs!, zo: [...groups].reverse().find((one) => one !== null) ?? null, at: match.index ?? 0 })
  }
  return out
}

const RING = 'Jump Landing Ring'
const RIPPLE = 'Jump Landing Ripple'
const ringsOf = (svg: string): readonly Element[] => elementsOf(svg).filter((one) => attrOf(one.attrs, 'data-role') === RING)

type LandingState =
  | { readonly kind: 'hidden' }
  | {
      readonly kind: 'shown'
      readonly landedBy: 'jump'
      readonly landedLink: null
      readonly landedTarget: SearchJumpTarget
    }

const HIDDEN: LandingState = { kind: 'hidden' }
const landedOn = (target: SearchJumpTarget): LandingState => ({ kind: 'shown', landedBy: 'jump', landedLink: null, landedTarget: target })

type Theme = 'light' | 'dark'

const svgOf = (scene: Scene, landing: LandingState, picture: 'screen' | 'export' = 'screen', theme: Theme = 'light'): string =>
  svgFromSchedule(
    scene.schedule as never,
    scene.settings as never,
    scene.layout as never,
    scene.geometry as never,
    scene.regions as never,
    scene.selection,
    picture,
    { themePreference: theme, guideCursorMode: 'none', landingMarkDisplayState: landing } as never,
  )

const S_151 = (theme: Theme): string => cellOf('T-236', 'S-151', theme === 'light' ? '明るいテーマ' : '暗いテーマ').replace(/`/g, '').trim()
// WHY: the color row is written with the theme hue as H (the project's hue is 214 in these scenes).
const inkOf = (theme: Theme): string => S_151(theme).replace(/\bH\b/, '214').toLowerCase()
const colorOnly = (value: string | null): string => (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

const boxOfRing = (ring: Element): { x: number; y: number; width: number; height: number; stroke: number } => ({
  x: Number(attrOf(ring.attrs, 'x')),
  y: Number(attrOf(ring.attrs, 'y')),
  width: Number(attrOf(ring.attrs, 'width')),
  height: Number(attrOf(ring.attrs, 'height')),
  stroke: Number(attrOf(ring.attrs, 'stroke-width')),
})

describe(`T-332 SJ-10 -- ${SJ_10_RING}`, () => {
  const landed = jump(LONG_LIST, TASK(15), FAR_START)
  const scene = landed.after
  const svg = svgOf(scene, landedOn(TASK(15)))

  it('exactly one ring is drawn, and it is an SVG rect', () => {
    const rings = ringsOf(svg)
    expect(rings.length, SJ_10_MARK).toBe(1)
    expect(rings[0]?.tag).toBe('rect')
  })

  it('with no landing state there is no ring', () => {
    expect(ringsOf(svgOf(scene, HIDDEN)), SJ_10_MARK).toEqual([])
  })

  it('the ring is a frame: S-556 thick, the S-151 color (light), no fill', () => {
    const ring = ringsOf(svg)[0]!
    expect(Number(attrOf(ring.attrs, 'stroke-width')), 'S-556').toBeCloseTo(S_556, 6)
    expect(colorOnly(attrOf(ring.attrs, 'stroke')), 'S-151 light').toBe(inkOf('light'))
    const fill = colorOnly(attrOf(ring.attrs, 'fill'))
    expect(fill === 'none' || fill === 'transparent' || Number(attrOf(ring.attrs, 'fill-opacity') ?? '1') === 0, 'a frame, not a patch').toBe(true)
    expect(attrOf(ring.attrs, 'stroke-dasharray'), 'a solid line (SJ-10 ①)').toBeNull()
  })

  it('the ring takes the dark theme S-151 color in the dark theme', () => {
    const ring = ringsOf(svgOf(scene, landedOn(TASK(15)), 'screen', 'dark'))[0]!
    expect(colorOnly(attrOf(ring.attrs, 'stroke')), 'S-151 dark').toBe(inkOf('dark'))
  })

  // WHY: the spec says "S-555 outside the bounding box" and the stroke is S-556 wide; a reader may count the gap to the
  // stroke's inner edge or to its center line, so both readings are accepted and the case says which it saw.
  it('the ring stands S-555 outside the plan figure (the box without the actual), on every side', () => {
    const placed = placementOf(scene, 15)
    const ring = boxOfRing(ringsOf(svg)[0]!)
    const centerGap = (side: 'left' | 'top' | 'right' | 'bottom'): number => {
      if (side === 'left') return placed.x - ring.x
      if (side === 'top') return placed.y - ring.y
      if (side === 'right') return ring.x + ring.width - (placed.x + placed.width)
      return ring.y + ring.height - (placed.y + placed.planHeight)
    }
    for (const side of ['left', 'top', 'right', 'bottom'] as const) {
      const innerEdgeGap = centerGap(side) - S_556 / 2
      const reading = Math.abs(innerEdgeGap - S_555) <= 0.5 ? 'inner edge' : Math.abs(centerGap(side) - S_555) <= 0.5 ? 'center line' : 'neither'
      expect(reading, `${side}: gap ${String(innerEdgeGap)} to the inner edge, ${String(centerGap(side))} to the center line`).not.toBe('neither')
    }
  })

  it('the ring lies outside the selection frame of the task (SL-8) when the task is selected', () => {
    const selected = sceneOf(LONG_LIST, { ...FAR_START, ...scrollFieldsOf(landed.plan) }, selectionWith(emptySelection(), { kind: 'task', uid: 15 }))
    const picture = svgOf(selected, landedOn(TASK(15)))
    const frames = elementsOf(picture).filter((one) => one.tag === 'rect' && attrOf(one.attrs, 'stroke-dasharray') !== null && one.zo === 'ZO-10')
    expect(frames.length, 'premise: the selection frame is drawn').toBeGreaterThan(0)
    const ring = boxOfRing(ringsOf(picture)[0]!)
    for (const frame of frames) {
      const inner = boxOfRing(frame)
      expect(inner.x, 'the frame is right of the ring left').toBeGreaterThan(ring.x)
      expect(inner.y).toBeGreaterThan(ring.y)
      expect(inner.x + inner.width).toBeLessThan(ring.x + ring.width)
      expect(inner.y + inner.height).toBeLessThan(ring.y + ring.height)
    }
  })

  it(`${SJ_10_Z}: the ring is in the ZO-10 layer, after every task figure`, () => {
    const ring = ringsOf(svg)[0]!
    expect(ring.zo).toBe('ZO-10')
    const taskFigures = elementsOf(svg).filter((one) => /^task-\d+-/.test(attrOf(one.attrs, 'data-figure') ?? ''))
    expect(taskFigures.length, 'premise: task figures are drawn').toBeGreaterThan(0)
    for (const one of taskFigures) expect(one.at, attrOf(one.attrs, 'data-figure') ?? '').toBeLessThan(ring.at)
  })

  it(`${SJ_10_INSIDE}: the ring is clipped to the ground the task figures are clipped to, which starts at the Task Group Area's top left and spans its height`, () => {
    const area = scene.regions.taskGroupArea
    const clipOf = (marker: string): string | null => {
      const before = svg.slice(0, svg.indexOf(marker))
      return [...before.matchAll(/<g clip-path="url\(#([^)]+)\)">/g)].pop()?.[1] ?? null
    }
    const ringClip = clipOf(`data-role="${RING}"`)
    expect(ringClip, 'a clip group opens before the ring').not.toBeNull()
    expect(ringClip, 'the ring shares the clip of the task figures').toBe(clipOf('data-figure="task-15-plan"'))
    const clip = new RegExp(`<clipPath id="${ringClip!}">\s*<rect ([^>]*)/?>`).exec(svg)
    expect(clip, 'the clip names a rect').not.toBeNull()
    const rect = clip![1]!
    expect(Number(attrOf(rect, 'x'))).toBeCloseTo(area.x, 1)
    expect(Number(attrOf(rect, 'y'))).toBeCloseTo(area.y, 1)
    expect(Number(attrOf(rect, 'height'))).toBeCloseTo(area.height, 1)
    expect(Number(attrOf(rect, 'width')), 'wide enough to reach the area right edge').toBeGreaterThanOrEqual(area.width - 0.1)
  })

  it('a comment box target gets a ring around the box', () => {
    const box = jump(LONG_LIST, BOX('box-dated'), FAR_START)
    const picture = svgOf(box.after, landedOn(BOX('box-dated')))
    const rings = ringsOf(picture)
    expect(rings.length, SJ_10_MARK).toBe(1)
    const body = box.after.geometry.commentBoxes.find((one) => one.id === 'box-dated')!.body
    const ring = boxOfRing(rings[0]!)
    expect(ring.x).toBeLessThan(body.x)
    expect(ring.y).toBeLessThan(body.y)
    expect(ring.x + ring.width).toBeGreaterThan(body.x + body.width)
    expect(ring.y + ring.height).toBeGreaterThan(body.y + body.height)
  })

  it('the ring follows its target: after the view moves it surrounds the same task at its new place', () => {
    const moved = sceneOf(LONG_LIST, { ...FAR_START, ...scrollFieldsOf(landed.plan), scrollDate: iso(-30) })
    const picture = svgOf(moved, landedOn(TASK(15)))
    const rings = ringsOf(picture)
    const placed = moved.layout.placements.find((one) => one.taskUid === 15)
    if (placed === undefined) expect(rings, 'an undrawn shape has no ring').toEqual([])
    else {
      expect(rings.length).toBe(1)
      expect(boxOfRing(rings[0]!).x).toBeLessThan(placed.x)
    }
  })
})

describe(`T-332 SJ-10 -- ${SJ_10_EXPORT}`, () => {
  it.each([['light'], ['dark']] as const)('an export picture (%s) holds no ring, with the landing state shown', (theme) => {
    const { after } = jump(LONG_LIST, TASK(15), FAR_START)
    expect(ringsOf(svgOf(after, landedOn(TASK(15)), 'export', theme)), SJ_10_EXPORT).toEqual([])
    expect(svgOf(after, landedOn(TASK(15)), 'export', theme)).not.toContain(RING)
    expect(svgOf(after, landedOn(TASK(15)), 'export', theme)).not.toContain(RIPPLE)
    expect(ringsOf(svgOf(after, landedOn(TASK(15)), 'screen', theme)).length, 'control: the screen draws it').toBe(1)
  })
})

describe(`T-332 SJ-10 -- ${SJ_10_NOT_DRAWN}`, () => {
  it('a plan that is not shown (S-227 false) has no ring', () => {
    const { after } = jump({ ...LONG_LIST, settings: { planVisible: false } }, TASK(15), FAR_START)
    expect(ringsOf(svgOf(after, landedOn(TASK(15)))), SJ_10_NOT_DRAWN).toEqual([])
  })

  it('a target the document does not hold has no ring', () => {
    const { after } = jump(LONG_LIST, TASK(15), FAR_START)
    expect(ringsOf(svgOf(after, landedOn(TASK(9999)))), SJ_10_NOT_DRAWN).toEqual([])
    expect(ringsOf(svgOf(after, landedOn(BOX('no-such-box')))), SJ_10_NOT_DRAWN).toEqual([])
  })

  it('a task with no plan dates has no ring', () => {
    const undated: SceneSpec = {
      ...LONG_LIST,
      tasks: LONG_LIST.tasks.map(([task, group]) => (task['uid'] === 15 ? ([{ ...task, start: null, finish: null }, group] as const) : ([task, group] as const))),
    }
    const scene = sceneOf(undated, FAR_START)
    expect(ringsOf(svgOf(scene, landedOn(TASK(15)))), SJ_10_NOT_DRAWN).toEqual([])
  })
})

describe('T-332 SJ-10 -- the mark changes no drawn gap (FR-105 / FR-094)', () => {
  it(`${SJ_10_NO_GAP}: the layout and the geometry are the same with the mark shown and hidden`, () => {
    const { after } = jump(LONG_LIST, TASK(15), FAR_START)
    // WHY: the layout and the geometry are computed without the landing state; the picture only adds the ring.
    const plain = svgOf(after, HIDDEN)
    const marked = svgOf(after, landedOn(TASK(15)))
    const withoutRing = marked.replace(/<g clip-path="[^"]*"><g data-zo="ZO-10"><rect [^>]*data-role="Jump Landing Ring"[^>]*\/><\/g><\/g>/, '')
    expect(ringsOf(marked).length, 'premise').toBe(1)
    expect(withoutRing, 'everything but the ring is the same picture').toBe(plain)
  })
})


const stepped = (session: ScreenSession, event: SessionEvent): ScreenSession => advanceScreenSession(session, event).state
const JUMP_LANDED = (target: SearchJumpTarget): SessionEvent => ({ type: 'searchJumpLanded', landedTarget: target }) as unknown as SessionEvent
const CLICKED = (predecessorUid: number, successorUid: number, landedTaskUid: number): SessionEvent =>
  ({ type: 'continuationMarkClicked', landedLink: { predecessorUid, successorUid }, landedTarget: { kind: 'task', taskUid: landedTaskUid } }) as unknown as SessionEvent
const CLEAR = { type: 'landingMarkClearAsked' } as unknown as SessionEvent
const landingOf = (session: ScreenSession): unknown => session.screen.landingMarkDisplayState

describe('(T-280) landingMarkDisplayStateMachine -- searchJumpLanded', () => {
  it(`${T_280_JUMP_ROW}: hidden -> shown, landedBy jump, landedLink null, landedTarget the target`, () => {
    expect(landingOf(emptyScreenSession), 'hidden is the first state').toEqual({ kind: 'hidden' })
    expect(landingOf(stepped(emptyScreenSession, JUMP_LANDED(TASK(15))))).toEqual({
      kind: 'shown',
      landedBy: 'jump',
      landedLink: null,
      landedTarget: { kind: 'task', taskUid: 15 },
    })
  })

  it('a comment box id is carried by landedTarget', () => {
    expect(landingOf(stepped(emptyScreenSession, JUMP_LANDED(BOX('box-dated'))))).toEqual({
      kind: 'shown',
      landedBy: 'jump',
      landedLink: null,
      landedTarget: { kind: 'commentBox', commentBoxId: 'box-dated' },
    })
  })

  it(`${T_280_JUMP_ROW}: shown -> shown with the new contents (a jump replaces a jump)`, () => {
    const after = stepped(stepped(emptyScreenSession, JUMP_LANDED(TASK(15))), JUMP_LANDED(TASK(20)))
    expect(landingOf(after)).toEqual({ kind: 'shown', landedBy: 'jump', landedLink: null, landedTarget: { kind: 'task', taskUid: 20 } })
  })

  it('a jump replaces the mark of a continuation mark, and the other way round (one machine, one mark)', () => {
    const afterMark = stepped(emptyScreenSession, CLICKED(1, 2, 2))
    expect(landingOf(afterMark)).toMatchObject({ kind: 'shown', landedBy: 'continuationMark', landedLink: { predecessorUid: 1, successorUid: 2 } })
    const jumped = stepped(afterMark, JUMP_LANDED(TASK(15)))
    expect(landingOf(jumped)).toEqual({ kind: 'shown', landedBy: 'jump', landedLink: null, landedTarget: { kind: 'task', taskUid: 15 } })
    const backToMark = stepped(jumped, CLICKED(3, 4, 4))
    expect(landingOf(backToMark)).toMatchObject({ kind: 'shown', landedBy: 'continuationMark', landedLink: { predecessorUid: 3, successorUid: 4 } })
  })

  it(`${T_280_CLEAR_ROW}: shown -> hidden`, () => {
    expect(landingOf(stepped(stepped(emptyScreenSession, JUMP_LANDED(TASK(15))), CLEAR))).toEqual({ kind: 'hidden' })
  })

  it('hidden stays hidden when a clear arrives (no mark to clear)', () => {
    expect(landingOf(stepped(emptyScreenSession, CLEAR))).toEqual({ kind: 'hidden' })
  })

  it('an event of another machine keeps the shown mark (the same reference)', () => {
    const shown = stepped(emptyScreenSession, JUMP_LANDED(TASK(15)))
    const after = stepped(shown, { type: 'choiceMoved' } as unknown as SessionEvent)
    expect(landingOf(after)).toBe(landingOf(shown))
  })
})


const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 0, scrollbarThickness: 0 }
const REAL_RAF = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (REAL_RAF === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = REAL_RAF
})

const uuid = (n: number): string => `dddddddd-0000-4000-8000-${String(n).padStart(12, '0')}`
const GROUP_UUIDS = GROUP_IDS.map((_, at) => uuid(at + 1))
const PARENT_UUID = uuid(90)
const CHILD_UUID = (at: number): string => uuid(100 + at)

interface ShellGroup {
  readonly id: string
  readonly parentId: string | null
  readonly treeState?: TreeState
}

const shellTask = (uid: number, start: string, finish: string): Loose => ({
  ...taskOf(uid, 0, 1),
  wbsOrder: uid,
  name: `Task${String(uid)}`,
  start: `${start}T08:00:00`,
  finish: `${finish}T17:00:00`,
  milestone: false,
  percentComplete: 0,
  carryElements: [],
})

const shellDocument = (
  rows: readonly ShellGroup[],
  tasks: readonly (readonly [Loose, string])[],
  settings: Loose = {},
): Document =>
  ({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE['schemaVersion'],
    schedule: {
      project: { ...structuredClone(TEMPLATE['schedule'].project), uidHighWaterMark: 1000, statusDate: null },
      calendars: structuredClone(TEMPLATE['schedule'].calendars),
      tasks: tasks.map(([task]) => task),
      resources: [],
      assignments: [],
      taskGroups: rows.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `Row${String(index + 1)}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: one.treeState ?? 'auto',
        editGroup: null,
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: tasks.map(([task, groupId]) => ({ taskUid: task['uid'], groupId })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE['documentSettings']),
      pinnedGroupIds: [],
      scrollDate: '2026-03-30',
      scrollDayOffset: 0,
      scrollGroupId: rows[0]!.id,
      scrollGroupOffset: 0,
      zoomX: 1,
      zoomY: 1,
      levelZeroTreeState: 'auto',
      ...settings,
    },
    documentStamp: structuredClone(TEMPLATE['documentStamp']),
    changeLog: [],
  }) as unknown as Document

const dayText = (offset: number): string => new Date(Date.UTC(2026, 3, 1) + offset * 86400000).toISOString().slice(0, 10)

// WHY: task N (1..20) is in group N, one every 4 days; a folded parent with 8 children stands between group 5 and group 6.
const SHELL_LONG = (settings: Loose = {}): Document => {
  const groups: ShellGroup[] = [
    ...GROUP_UUIDS.slice(0, 5).map((id): ShellGroup => ({ id, parentId: null })),
    { id: PARENT_UUID, parentId: null, treeState: 'collapsed' },
    ...Array.from({ length: 8 }, (_, at): ShellGroup => ({ id: CHILD_UUID(at), parentId: PARENT_UUID })),
    ...GROUP_UUIDS.slice(5, 22).map((id): ShellGroup => ({ id, parentId: null })),
  ]
  const tasks: (readonly [Loose, string])[] = [
    ...GROUP_UUIDS.slice(0, 5).map((id, at) => [shellTask(at + 1, dayText(at * 4), dayText(at * 4 + 3)), id] as const),
    [shellTask(50, dayText(60), dayText(64)), CHILD_UUID(5)] as const,
    ...GROUP_UUIDS.slice(5, 22).map((id, at) => [shellTask(at + 6, dayText((at + 5) * 4), dayText((at + 5) * 4 + 3)), id] as const),
  ]
  return shellDocument(groups, tasks, settings)
}

interface Shell {
  readonly loop: FrameLoop
  readonly api: AgentApi
  send(input: HumanInput): void
  svg(): string
  area(): Rect
  placements(): readonly Placement[]
  document(): Document
}

const MODS = { ctrl: false, shift: false, alt: false, meta: false }

const shellOf = (document: Document): Shell => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 12 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let shown = ''
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const loop = frameLoop({ showSvg: (svg: string) => void (shown = svg) } as never, document, SCREEN, { surface, language: 'en' })
  drain()
  const frame = () => {
    const now = loop.current()
    if (now === null) throw new Error('the loop has drawn no frame')
    return now
  }
  const api = installAgentApi({
    ...loop.agentApiSeams(),
    writerName: 'cr-728-tester',
    schemaVersion: (TEMPLATE['schemaVersion'] as string),
  } as never)
  const shell: Shell = {
    loop,
    api,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    svg: () => shown,
    area: () => frame().regions.taskGroupArea as unknown as Rect,
    placements: () => (frame().layout as unknown as { readonly placements: readonly Placement[] }).placements,
    document: () => loop.document(),
  }
  ;(shell as unknown as { drain: () => void }).drain = drain
  return shell
}

const drainOf = (shell: Shell): (() => void) => (shell as unknown as { drain: () => void }).drain

const focus = (shell: Shell, uid: number): ReturnType<AgentApi['focusTask']> => {
  const outcome = shell.api.focusTask(uid)
  drainOf(shell)()
  return outcome
}

const shellMiddle = (shell: Shell, uid: number): { x: number; y: number } => {
  const placed = shell.placements().find((one) => one.taskUid === uid)
  if (placed === undefined) throw new Error(`the shell drew no task ${String(uid)}`)
  return { x: placed.x + placed.width / 2, y: placed.y + placed.planHeight / 2 }
}

const pointerAt = (phase: PointerInput['phase'], x: number, y: number, clickCount = 1, button: PointerInput['button'] = 'left'): PointerInput =>
  ({ kind: 'pointer', phase, button, x, y, modifiers: MODS, clickCount }) as unknown as PointerInput

const clickAt = (shell: Shell, at: { x: number; y: number }, clickCount = 1, button: PointerInput['button'] = 'left'): void => {
  shell.send(pointerAt('down', at.x, at.y, clickCount, button))
  shell.send(pointerAt('up', at.x, at.y, clickCount, button))
}

const emptyPlace = (shell: Shell): { x: number; y: number } => {
  const area = shell.area()
  return { x: area.x + area.width - 30, y: area.y + area.height - 30 }
}

const ringCount = (shell: Shell): number => ringsOf(shell.svg()).length

describe(`AM-16 focusTask -- ${SJ_9_STEPS}`, () => {
  it('a plain task is put at the middle and marked at once', () => {
    const shell = shellOf(SHELL_LONG())
    expect(ringCount(shell), 'premise: no mark before the jump').toBe(0)
    const outcome = focus(shell, 15)
    expect(outcome.accepted, 'AM-16 accepts').toBe(true)
    const middle = shellMiddle(shell, 15)
    expect(Math.abs(middle.x - (shell.area().x + shell.area().width / 2)), SJ_6_MIDDLE).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(Math.abs(middle.y - (shell.area().y + shell.area().height * S_554)), SJ_5_MIDDLE).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(ringCount(shell), SJ_10_MARK).toBe(1)
  })

  it(`${SJ_5_AFTER_REVEAL}: a task under a folded task group is revealed first and then put S-554 down`, () => {
    const shell = shellOf(SHELL_LONG())
    expect(shell.placements().some((one) => one.taskUid === 50), 'premise: the folded task is not drawn').toBe(false)
    expect(focus(shell, 50).accepted).toBe(true)
    const middle = shellMiddle(shell, 50)
    expect(Math.abs(middle.y - (shell.area().y + shell.area().height * S_554)), SJ_5_AFTER_REVEAL).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(Math.abs(middle.x - (shell.area().x + shell.area().width / 2)), SJ_6_MIDDLE).toBeLessThanOrEqual(WITHIN_A_PIXEL)
    expect(ringCount(shell), SJ_10_MARK).toBe(1)
  })

  it(`${SJ_10_AM_16}: a second focus leaves one ring, around the new task`, () => {
    const shell = shellOf(SHELL_LONG())
    focus(shell, 12)
    focus(shell, 8)
    const rings = ringsOf(shell.svg())
    expect(rings.length, SJ_10_AM_16).toBe(1)
    const placed = shell.placements().find((one) => one.taskUid === 8)!
    const ring = boxOfRing(rings[0]!)
    expect(ring.x).toBeLessThan(placed.x)
    expect(ring.x + ring.width).toBeGreaterThan(placed.x + placed.width)
  })

  it('the Agent API jump does not select (SJ-9: no SJ-4)', () => {
    const shell = shellOf(SHELL_LONG())
    focus(shell, 15)
    const selected = shell.loop.agentApiSeams().source.readSnapshot().selection as unknown as { readonly items?: readonly unknown[] }
    expect(selected.items ?? []).toEqual([])
  })

  it('an unknown task is refused and leaves no mark', () => {
    const shell = shellOf(SHELL_LONG())
    expect(focus(shell, 9999).accepted).toBe(false)
    expect(ringCount(shell)).toBe(0)
  })
})

describe(`T-280 and EL-17 / EL-18 in the shell -- ${EL_17_CLEAR}`, () => {
  const marked = (): Shell => {
    const shell = shellOf(SHELL_LONG())
    focus(shell, 15)
    expect(ringCount(shell), 'premise: the jump marked its target').toBe(1)
    return shell
  }

  it(`${EL_17_WHEEL}: a wheel keeps the mark`, () => {
    const shell = marked()
    const place = emptyPlace(shell)
    shell.send({ kind: 'wheel', x: place.x, y: place.y, modifiers: MODS, notches: 1, scrollPx: { x: 0, y: 100 } } as unknown as HumanInput)
    expect(ringCount(shell), EL_17_WHEEL).toBe(1)
  })

  it('a zoom by the wheel with Ctrl keeps the mark', () => {
    const shell = marked()
    const place = emptyPlace(shell)
    shell.send({ kind: 'wheel', x: place.x, y: place.y, modifiers: { ...MODS, ctrl: true }, notches: -1, scrollPx: { x: 0, y: -100 } } as unknown as HumanInput)
    expect(ringCount(shell), EL_17_VIEW_KEEPS).toBe(1)
  })

  it(`${EL_17_MODIFIER}: a modifier-only key keeps the mark`, () => {
    const shell = marked()
    shell.send({ kind: 'key', key: 'Shift', modifiers: { ...MODS, shift: true } } as unknown as HumanInput)
    expect(ringCount(shell), EL_17_MODIFIER).toBe(1)
  })

  it('moving the pointer keeps the mark', () => {
    const shell = marked()
    const place = emptyPlace(shell)
    shell.send(pointerAt('move', place.x, place.y))
    shell.send(pointerAt('move', place.x - 200, place.y - 100))
    expect(ringCount(shell)).toBe(1)
  })

  it(`${EL_17_CLEAR} -- a left press on an empty place clears the mark`, () => {
    const shell = marked()
    clickAt(shell, emptyPlace(shell))
    expect(ringCount(shell), EL_17_CLEAR).toBe(0)
  })

  it('a right press clears the mark (どのボタンでも)', () => {
    const shell = marked()
    clickAt(shell, emptyPlace(shell), 1, 'right')
    expect(ringCount(shell), EL_17_CLEAR).toBe(0)
  })

  it('a key press clears the mark', () => {
    const shell = marked()
    shell.send({ kind: 'key', key: 'Enter', modifiers: MODS } as unknown as HumanInput)
    expect(ringCount(shell), EL_17_CLEAR).toBe(0)
  })

  it(`${SJ_10_KEEP}: a cleared mark stays cleared and a later jump marks again`, () => {
    const shell = marked()
    clickAt(shell, emptyPlace(shell))
    expect(ringCount(shell)).toBe(0)
    focus(shell, 9)
    expect(ringCount(shell), SJ_10_MARK).toBe(1)
  })

  it(`${SJ_10_NOT_SAVED}: the document the shell holds carries no trace of the mark`, () => {
    const shell = shellOf(SHELL_LONG())
    const before = JSON.stringify(shell.document())
    focus(shell, 15)
    const after = JSON.stringify(shell.document())
    expect(after, SJ_10_NOT_SAVED).not.toMatch(/landed|landing|Jump Landing/i)
    const settingsBefore = (JSON.parse(before) as Loose)['documentSettings'] as Loose
    const settingsAfter = (JSON.parse(after) as Loose)['documentSettings'] as Loose
    expect(Object.keys(settingsAfter).sort(), 'no new setting is stored for the mark').toEqual(Object.keys(settingsBefore).sort())
  })

  it(`${SJ_10_NOT_SAVED}: a saved GRS JSON (AM-11 exportJson) carries no trace of the mark`, async () => {
    const shell = shellOf(SHELL_LONG())
    focus(shell, 15)
    expect(ringCount(shell), 'premise: marked').toBe(1)
    const exported = await shell.api.exportJson()
    drainOf(shell)()
    expect(exported.ok, 'AM-11 answers').toBe(true)
    expect(String((exported as { value?: unknown }).value), SJ_10_NOT_SAVED).not.toMatch(/landed|landing|Jump Landing/i)
  })

  it(`${SJ_10_EXPORT}: the exported SVG (AM-13) holds no ring while the mark is on the screen`, async () => {
    const shell = shellOf(SHELL_LONG())
    focus(shell, 15)
    expect(ringCount(shell), 'premise: the screen draws it').toBe(1)
    const exported = await shell.api.exportSvg()
    drainOf(shell)()
    expect(exported.ok, 'AM-13 answers').toBe(true)
    expect(String((exported as { value?: unknown }).value), SJ_10_EXPORT).not.toContain(RING)
  })

  it(`${SJ_10_NOT_SAVED}: the jump leaves no undo step of its own -- Undo after a scroll-only jump keeps the view and the document`, () => {
    // WHY: task 12 is in an open task group, so SJ-2 writes nothing and the move is only a view change (UN-8).
    const shell = shellOf(SHELL_LONG())
    focus(shell, 12)
    const afterJump = JSON.stringify(shell.document().documentSettings)
    expect(ringCount(shell), 'premise: marked').toBe(1)
    shell.send({ kind: 'key', key: 'z', modifiers: { ...MODS, ctrl: true } } as unknown as HumanInput)
    expect(JSON.stringify(shell.document().documentSettings), 'Undo does not take the view back, so no step was stacked').toBe(afterJump)
  })
})

describe('SJ-8 / SJ-10 in the shell -- no room, no mark', () => {
  it(`${SJ_10_NOT_DRAWN}: a plan that is not shown draws no ring after the Agent API jump`, () => {
    const shell = shellOf(SHELL_LONG({ planVisible: false }))
    focus(shell, 15)
    expect(ringCount(shell), SJ_10_NOT_DRAWN).toBe(0)
  })

  it(`${SJ_10_NOT_DRAWN}: when pinned task groups leave no room the view is not brought and no ring is drawn`, () => {
    const pinned = GROUP_UUIDS.slice(0, 5)
    const shell = shellOf(SHELL_LONG({ pinnedGroupIds: pinned, zoomY: 8 }))
    const outcome = focus(shell, 15)
    expect(outcome.accepted, 'AM-16 still answers').toBe(true)
    expect((outcome as { isScrolled?: boolean }).isScrolled, 'SJ-8 / SJ-9: the answer says the view was not brought').toBe(false)
    expect(ringCount(shell), SJ_10_NOT_DRAWN).toBe(0)
    const control = shellOf(SHELL_LONG({ zoomY: 8 }))
    focus(control, 15)
    expect(ringCount(control), 'control: the same zoom with no pins marks the target').toBe(1)
  })
})
