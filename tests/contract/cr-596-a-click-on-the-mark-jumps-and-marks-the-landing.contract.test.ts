// CR-596 spec-only cases, as CR-598 and CR-602 revised them: the continuation mark click, the landing mark, the emphasised line and its end outlines.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  selectionFromInput,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type PointerInput,
  type PointerPress,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { commandFromGrab } from '../../src/adapter/input-command-translator/item-grab'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionWith, type Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
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
import { bare, specTable, unbroken } from './spec-table'

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

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const numberIn = (cell: string): number => {
  const found = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`no number in ${cell}`)
  return Number(found[0])
}

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const STATE_MACHINES = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'),
)

// see T-201, T-206, T-236
const T201 = (id: string): number => numberIn(cellOf('T-201', id, '既定値'))
const T206 = (id: string): number => numberIn(cellOf('T-206', id, '既定'))
const colourOf = (id: string, column: string): string => cellOf('T-236', id, column).replace(/`/g, '').trim().toLowerCase()
const LIGHT = (id: string): string => colourOf(id, '明るいテーマ')
const DARK = (id: string): string => colourOf(id, '暗いテーマ')

const commandKindOf = (commandRow: string): string => {
  const named = bare(cellOf('T-108', commandRow, '確定名'))
  if (named === '') throw new Error(`table T-108 row ${commandRow} names no command`)
  return named
}
const SET_ZOOM = commandKindOf('CM-65')
const SET_SCROLL = commandKindOf('CM-66')
const SET_TREE_STATE = commandKindOf('CM-85')
const SET_LEVEL_ZERO = commandKindOf('CM-86')
const VIEW_KINDS: ReadonlySet<string> = new Set([SET_ZOOM, SET_SCROLL])
const TREE_KINDS: ReadonlySet<string> = new Set([SET_TREE_STATE, SET_LEVEL_ZERO])

const EL_6 = rowCells('T-303', 'EL-6')
const EL_9 = rowCells('T-303', 'EL-9')
const EL_10 = rowCells('T-303', 'EL-10')
const EL_12 = rowCells('T-303', 'EL-12')
const EL_16 = rowCells('T-303', 'EL-16')
const EL_17 = rowCells('T-303', 'EL-17')
const EL_18 = rowCells('T-303', 'EL-18')
const EL_19 = rowCells('T-303', 'EL-19')
const EL_20 = rowCells('T-303', 'EL-20')
const EL_21 = rowCells('T-303', 'EL-21')
const PE_12_RELEASE = cellOf('T-270', 'PE-12', '押して離す（動かさない）')
const PE_12_SIDEWAYS = cellOf('T-270', 'PE-12', '横に引く')
const MK_13 = rowCells('T-023', 'MK-13')
const SL_8 = rowCells('T-023c', 'SL-8')
const ZO_10 = rowCells('T-020', 'ZO-10')
const EP_12 = rowCells('T-076', 'EP-12')
const UN_8 = rowCells('T-027', 'UN-8')
const UN_14 = rowCells('T-027', 'UN-14')
const SJ_2 = rowCells('T-332', 'SJ-2')
const S_447 = rowCells('T-206', 'S-447')

const EL_6_NONE = '描かない（MUST NOT）。'
const EL_9_COLOUR = '色は依存線の色（表 T-236 の `S-159`）とすること（MUST） —— 選んだ線（表 T-023c の `SL-8`）でも変えない。'
const EL_10_FOLDED = '⚠️ 先の端が `EL-20` の端のときは、倍率を変えずに `EL-21` で開く。'
const EL_12_OPENED = '`EL-21` でタスクグループを展開したときは、その端のタスクグループが帯の下の残りの上端に来るよう、表示位置を縦に送ること（MUST）'
const EL_12_HOW = '`S-78` をそのタスクグループに、`S-176` を 0 にする'
const EL_16_MARK = '印の先の端の `Task` と、押した印の依存線（`EL-13` が応えた線）に、送った先の印を付けること（MUST）'
const EL_16_LOOK =
  '依存線は `EL-19` の形で、表 T-023c の `SL-8` が選んだ依存線に定める色と太さ（色は `_assets/tbl-settings.md` の 表 T-236 の `S-159` のまま、太さは線自身の太さに 表 T-206 の `S-447` を足した太さ、矢じりを含む）で描くこと（MUST） —— 印が出ているあいだは選ばれている線が無い（表 T-270 の `PE-12`）ので、同じ見せ方でも紛れない。'
const EL_16_ENDS = '線の両端の `Task` を、表 T-023c の `SL-8` が選んだ依存線の端に定める囲みで囲むこと（MUST）'
const EL_16_EL_2 = '⭐ 先の端が `EL-2` の端のときは、`EL-10` で描かれるようになった `Task` を囲む。'
const EL_16_UNDRAWN = '⚠️ 印を付けた `Task` か依存線が描かれていないとき（文書に無い、`RT-4a` が落とした）は、その分を描かない。'
const EL_16_NOT_UNDONE = '⛔ 印を文書に保存してはならず、取り消しの対象にしてはならない（MUST NOT）'
const EL_17_CLEAR = '印が出ているあいだに、人が次のどれかを行ったら、印を消すこと（MUST）: 押下（どのボタンでも、画面のどこでも）、キーの押下。'
const EL_17_WHEEL_KEEPS =
  'ホイール（表 T-023 の `MK-1` 〜 `MK-5`、面やパネルの上でその中を送るものを含め、ホイールはどれも消さない）'
const EL_17_MODIFIER_KEEPS = '修飾キー（`Ctrl` ・ `Shift` ・ `Alt` ・ `Meta`）だけの押下でも消さないこと（MUST）'
const EL_17_MOVE = '⚠️ ポインタを動かすだけでは消さない'
const EL_18_NOTHING =
  '印が出ているあいだの 2 回目の押下（宿主が数える押下の回数が 2 以上の押下）では、何もしないこと（MUST） —— 選ばず、表 T-023 の `MK-13` の宛先を読まず、印も消さない。'
const EL_19_WHOLE =
  '印が出ているあいだ、印を付けた線は `EL-3` 〜 `EL-8` で省かず、経路（表 T-018 ／ 表 T-018a）の全体を描き、後続の入口に矢じりを描くこと（MUST）'
const EL_19_EL_6 = '⛔ `EL-6` の「描いてはならない（MUST NOT）」も、この線には当てない。'
const EL_19_NO_DOTS = '続きの印は描かない —— 省いていない。'
const EL_19_BACK = '⚠️ 印が消えたら、本表の省き方（`EL-3` 〜 `EL-8`）に戻す。'
const EL_20_HIDDEN = '人が隠したタスクグループ（表 T-015 の `HR-6`、表 T-328 の `hidden` —— 端のタスクグループそのものが隠されているときを含む）'
const EL_20_NOT_SEEN = 'その端は見えていない端とすること（MUST）。'
const EL_20_STAND = '経路を引くために立つ所は `EL-2` と同じとする —— 描かれている最も近い祖先のタスクグループの帯の下端であり'
const EL_20_NO_ANCESTOR =
  '⚠️ 描かれている祖先が無いとき（端のタスクグループの最も浅い段の祖先（端のタスクグループそのものを含む）が隠されている）は、木の順（`05-07-design.md` の 表 T-068 の `LC-9`）で端のタスクグループより前に在る、描かれているスクロールするタスクグループのうち最後のタスクグループの下端に立つものとし、そういうタスクグループが無ければ帯の下の残りの上端に立つものとすること（MUST） —— 隠しを解けば端のタスクグループが現れる所であり、`EL-2` がピン止めした祖先に定める置き方と同じである。'
const EL_20_ACROSS = '横の位置は `EL-2` と同じく、予定の日付と 表 T-018 のアンカーから決める。'
const EL_20_TOWARD =
  '見えている他方の端の短い線（`EL-7` ／ `EL-8`）と続きの印（`EL-9`）は、この所の側へ向く —— その所が画面の外なら、画面の端の側を指す。'
const EL_20_NOT_DROPPED =
  '⛔ 立つ所が無いとして線を落としてはならない（MUST NOT） —— 見えている端から先を展開する入口（`EL-21`）が消え、隠したタスクグループの深さによって印が出たり出なかったりする。'
const EL_20_LEVEL_ZERO =
  '⚠️ 段 0 が折りたたまれているときはタスクグループが 1 つも描かれず（表 T-015 の `HR-2`）、見えている端も無いので、線は `EL-6` に当たる。'
const EL_20_LOD = '⚠️ 折りたたみとグループ LOD の両方で描かれない端は、本行の端とする'
const EL_21_OPEN =
  '印の先の端が `EL-20` の端のときは、送る前に、その端の `Task` のタスクグループとその祖先をすべて見える状態に展開すること（MUST） —— 隠されているタスクグループは隠しを解き、折りたたまれているタスクグループは展開する（どちらも 表 T-328 の `expanded` になる）。'
const EL_21_SEND = '展開した後、`EL-11` ・ `EL-12` に従って送ること（MUST）。'
const EL_21_NO_ZOOM = '`EL-10` の倍率は変えない'
const EL_21_ONE_STEP = '取り消しの 1 段である（表 T-027 の `UN-14`）'
const EL_21_SEND_OUTSIDE = '送り（`EL-11` ・ `EL-12`）はその段に入らない（`UN-8`）。'
const PE_12_SEND =
  '続きの印では選ばず、選択を空にしたうえで `FR-009` の 表 T-303 の `EL-10` 〜 `EL-12` に従って印の先へ送り（先の端が折りたたんだタスクグループか隠したタスクグループの配下なら、先に同表の `EL-21` で展開する）、`EL-16` の印を付ける'
const PE_12_SELECTS = '選ぶ。'
const PE_12_WIDTH = '選べば、印が消えても選んだ線の太さと両端の囲み（表 T-023c の `SL-8`）が残り'
const PE_12_DRAG = '何もしない'
const MK_13_MARK =
  '依存線の続きの印 ＝ 宛先を持たない —— 送るのは 1 回の押して離すであり（表 T-270 の `PE-12`）、先の端が折りたたんだタスクグループか隠したタスクグループの配下なら展開してから送る（`FR-009` の 表 T-303 の `EL-21`）。'
const MK_13_SECOND = '2 回目の押下は同表の `EL-18` に従う'
const SL_8_WIDTH =
  '依存線は、その線自身の太さに 表 T-206 の `S-447` を足した太さで描き、色は変えないこと（MUST） —— 色は依存線の色（同書の 表 T-236 の `S-159`）のままとし、矢じりと、`FR-009` の 表 T-303 の `EL-9` の続きの印の点も同じとする。'
const SL_8_ENDS =
  '選んだ依存線の両端の `Task`（マイルストーンを含む）は、描いた予定の図形を、その輪郭と同じ所・同じ形の線で囲むこと（MUST） —— どのタスクがどのタスクに依存するかを、線のまわりで読ませる。'
const SL_8_OUTLINE_INK =
  '囲む線は、色を `S-159`、太さをその輪郭の太さ（表 T-201 の `S-39` に `FR-039` の描く比を掛けた太さ）に `S-447` を足した太さとし、図形の前（`FR-110` の 表 T-020 の `ZO-10`）に描くこと（MUST） —— 輪郭を太くせずに前へ重ねるので、図形を描く手順は変わらない。'
const SL_8_ONCE = '⚠️ 同じ `Task` が 2 本以上の選んだ線の端になるときも、囲みは 1 つである。'
const SL_8_UNDRAWN = '⚠️ 描かれていない端（画面の外、`EL-2` の端）は囲まない。'
const SL_8_FRAME_OVER = '⚠️ 端の `Task` そのものも選ばれているときは、囲みの上に破線の枠を描く'
const ZO_10_OUTLINE =
  '依存線の端の `Task` の囲み（表 T-023c の `SL-8` の選んだ依存線の端と、`FR-009` の 表 T-303 の `EL-16` の送った先の線の端。選択の枠はその上に描く。線そのものは `ZO-4` の中で描く）'
const FR_009_ZERO = '⓪ 表 T-303 の `EL-16` の印を付けた線は、ほかのどの線よりも手前である'
const EP_12_LANDING = '続きの印で送った先の印（`FR-009` の 表 T-303 の `EL-16`）'
const EP_12_SELECTION = '`Selection`（`U-39`）'
const UN_8_VIEW = 'ズーム・スクロール・パン'
const UN_14_ONE_STEP = '⭐ 1 回の押下が書き換えるタスクグループの木の状態は、タスクグループがいくつでも同じ 1 段に入れること（MUST）'
const SJ_2_EXPANDED = 'その祖先のすべての `treeState` を `expanded` にする —— 今の値が `hidden` でも、確かめを問わない。'
const S_447_PX = '画面の px である —— 表示の倍率（`FR-039`）にもズームにも追随させない'
const S_447_ADDS =
  '絶対値ではなく、線自身の太さに足す値である —— 依存線はその線自身の太さ（表 T-201 の `S-18` に描く比を掛けた太さ）に、両端の囲みは予定の輪郭の太さ（同表の `S-39` に描く比を掛けた太さ）に足す。'
const T_280_CLICKED = '| `screen/continuationMarkClicked` | → `shown` | → 自己（中身を書き換える） |'
const T_280_CLEARED = '| `screen/landingMarkClearAsked` | — | → `hidden` |'
const T_280_OTHERS = '表に無い出来事は `landingMarkDisplayStateMachine` を変えない（同じ参照）。'
const T_280_HIDDEN_FIRST = '`landingMarkDisplayStateMachine.hidden` —— 初期。'
const T_328_HIDDEN_OPENS = 'treeStateMachine_hidden --> treeStateMachine_expanded : taskGroupRevealAsked'

describe('CR-596 -- the manuscript these cases are driven by', () => {
  it.each([
    ['T-303 EL-6', EL_6, EL_6_NONE],
    ['T-303 EL-9', EL_9, EL_9_COLOUR],
    ['T-303 EL-10', EL_10, EL_10_FOLDED],
    ['T-303 EL-12 (opened)', EL_12, EL_12_OPENED],
    ['T-303 EL-12 (how)', EL_12, EL_12_HOW],
    ['T-303 EL-16 (mark)', EL_16, EL_16_MARK],
    ['T-303 EL-16 (look)', EL_16, EL_16_LOOK],
    ['T-303 EL-16 (ends)', EL_16, EL_16_ENDS],
    ['T-303 EL-16 (EL-2 end)', EL_16, EL_16_EL_2],
    ['T-303 EL-16 (undrawn)', EL_16, EL_16_UNDRAWN],
    ['T-303 EL-16 (not undone)', EL_16, EL_16_NOT_UNDONE],
    ['T-303 EL-17 (clear)', EL_17, EL_17_CLEAR],
    ['T-303 EL-17 (move)', EL_17, EL_17_MOVE],
    ['T-303 EL-18', EL_18, EL_18_NOTHING],
    ['T-303 EL-19 (whole)', EL_19, EL_19_WHOLE],
    ['T-303 EL-19 (EL-6)', EL_19, EL_19_EL_6],
    ['T-303 EL-19 (no dots)', EL_19, EL_19_NO_DOTS],
    ['T-303 EL-19 (back)', EL_19, EL_19_BACK],
    ['T-303 EL-20 (hidden)', EL_20, EL_20_HIDDEN],
    ['T-303 EL-20 (not seen)', EL_20, EL_20_NOT_SEEN],
    ['T-303 EL-20 (stand)', EL_20, EL_20_STAND],
    ['T-303 EL-20 (no drawn ancestor)', EL_20, EL_20_NO_ANCESTOR],
    ['T-303 EL-20 (across)', EL_20, EL_20_ACROSS],
    ['T-303 EL-20 (toward)', EL_20, EL_20_TOWARD],
    ['T-303 EL-20 (not dropped)', EL_20, EL_20_NOT_DROPPED],
    ['T-303 EL-20 (level zero)', EL_20, EL_20_LEVEL_ZERO],
    ['T-303 EL-20 (LOD)', EL_20, EL_20_LOD],
    ['T-303 EL-21 (open)', EL_21, EL_21_OPEN],
    ['T-303 EL-21 (send)', EL_21, EL_21_SEND],
    ['T-303 EL-21 (no zoom)', EL_21, EL_21_NO_ZOOM],
    ['T-303 EL-21 (one step)', EL_21, EL_21_ONE_STEP],
    ['T-303 EL-21 (send outside)', EL_21, EL_21_SEND_OUTSIDE],
    ['T-270 PE-12 (release)', PE_12_RELEASE, PE_12_SEND],
    ['T-270 PE-12 (the line)', PE_12_RELEASE, PE_12_SELECTS],
    ['T-270 PE-12 (width stays)', PE_12_RELEASE, PE_12_WIDTH],
    ['T-270 PE-12 (sideways)', PE_12_SIDEWAYS, PE_12_DRAG],
    ['T-023 MK-13 (mark)', MK_13, MK_13_MARK],
    ['T-023 MK-13 (second)', MK_13, MK_13_SECOND],
    ['T-023c SL-8 (width)', SL_8, SL_8_WIDTH],
    ['T-023c SL-8 (ends)', SL_8, SL_8_ENDS],
    ['T-023c SL-8 (outline ink)', SL_8, SL_8_OUTLINE_INK],
    ['T-023c SL-8 (once)', SL_8, SL_8_ONCE],
    ['T-023c SL-8 (undrawn)', SL_8, SL_8_UNDRAWN],
    ['T-023c SL-8 (frame over)', SL_8, SL_8_FRAME_OVER],
    ['T-020 ZO-10', ZO_10, ZO_10_OUTLINE],
    ['T-076 EP-12 (landing)', EP_12, EP_12_LANDING],
    ['T-076 EP-12 (selection)', EP_12, EP_12_SELECTION],
    ['T-027 UN-8', UN_8, UN_8_VIEW],
    ['T-027 UN-14', UN_14, UN_14_ONE_STEP],
    ['T-332 SJ-2', SJ_2, SJ_2_EXPANDED],
    ['T-206 S-447 (px)', S_447, S_447_PX],
    ['T-206 S-447 (adds)', S_447, S_447_ADDS],
  ] as const)('%s still says it', (_name, cell, clause) => {
    expect(flat(cell), clause).toContain(flat(clause))
  })

  it('FR-009 front order, table T-280 and table T-328 still say it', () => {
    expect(REQUIREMENTS, FR_009_ZERO).toContain(FR_009_ZERO)
    expect(REQUIREMENTS, 'EP-12 does not draw it').toMatch(/\| EP-12 \|[^\n]*\| 描かない \|/)
    for (const clause of [T_280_CLICKED, T_280_CLEARED, T_280_OTHERS, T_280_HIDDEN_FIRST, T_328_HIDDEN_OPENS]) {
      expect(STATE_MACHINES, clause).toContain(clause)
    }
  })

  it(`the values: S-447 is a positive addend (${S_447_ADDS}); S-159 is a colour in both themes`, () => {
    expect(T206('S-447')).toBeGreaterThan(0)
    expect(LIGHT('S-159')).toMatch(/^#[0-9a-f]{6}$/)
    expect(DARK('S-159')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

const DRAW_RATIO_AT_100 = T206('S-236')
// see FR-039, T-252
const ratioAt = (displayScale: number): number => (DRAW_RATIO_AT_100 * displayScale) / 100
const LINE_WIDTH = (displayScale = 100): number => T201('S-18') * ratioAt(displayScale)
// see SL-8, EL-16, S-447
const EMPHASISED_WIDTH = (displayScale = 100): number => LINE_WIDTH(displayScale) + T206('S-447')
// see SL-8, S-39, S-447
const OUTLINE_WIDTH = (displayScale = 100): number => T201('S-39') * ratioAt(displayScale) + T206('S-447')
const DRAG_PAST = T206('S-208') * 5

const S_53 = T201('S-53')
const S_54 = T201('S-54')
const S_55 = T201('S-55')
const S_87 = numberIn(cellOf('T-205', 'S-87', '既定'))
const S_88 = numberIn(cellOf('T-205', 'S-88', '既定'))
// see FR-018, T-205
const thresholdOf = (depth: number): number => S_87 * S_88 ** (depth - 2)

type Loose = Record<string, unknown>
type Settings = Parameters<typeof layoutFromSchedule>[1]
type Schedule = Parameters<typeof layoutFromSchedule>[0]
type Environment = Parameters<typeof regionsFromScreen>[0]
type ViewerArgument = Parameters<typeof svgFromSchedule>[7]
type TreeState = 'auto' | 'collapsed' | 'expanded' | 'temporarilyExpanded' | 'hidden'

interface Pt {
  readonly x: number
  readonly y: number
}

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Line {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly points: readonly Pt[]
  readonly elision?: string
  readonly drawnPoints?: readonly Pt[]
  readonly continuation?: { readonly dots: readonly Pt[]; readonly farUid: number } | null
}

interface Placement {
  readonly taskUid: number
  readonly x: number
  readonly width: number
  readonly y: number
  readonly planHeight: number
}

interface Row {
  readonly groupId: string
  readonly y: number
  readonly height: number
}

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)
const HOME = iso(-7)
const FAR = 400

const taskOf = (uid: number, start: number, days: number, links: readonly number[] = []): Loose => ({
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
  dependencies: links.map((predecessorUid) => ({
    predecessorUid,
    linkType: 1,
    lag: null,
    lagFormat: null,
    carry: {},
    carryElements: [],
  })),
  carry: {},
})

type GroupSpec = readonly [string, string | null, TreeState?]

interface SceneSpec {
  readonly groups: readonly GroupSpec[]
  readonly tasks: readonly (readonly [Loose, string])[]
  readonly settings?: Loose
}

interface Scene {
  readonly spec: SceneSpec
  readonly settings: Loose
  readonly schedule: Schedule
  readonly taskGroupArea: Rect
  readonly rows: readonly Row[]
  readonly placements: readonly Placement[]
  readonly lines: readonly Line[]
  readonly selection: Selection
  readonly context: InputContext
  readonly raw: { readonly layout: unknown; readonly regions: unknown; readonly geometry: unknown }
}

const scheduleOf = (spec: SceneSpec): Schedule =>
  ({
    project: { ...structuredClone(TEMPLATE.schedule.project), calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
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
  }) as unknown as Schedule

type LandingState =
  | { readonly kind: 'hidden' }
  | {
      readonly kind: 'shown'
      readonly landedLink: { readonly predecessorUid: number; readonly successorUid: number }
      readonly landedTaskUid: number
    }

const HIDDEN: LandingState = { kind: 'hidden' }
const landed = (predecessorUid: number, successorUid: number, landedTaskUid: number): LandingState => ({
  kind: 'shown',
  landedLink: { predecessorUid, successorUid },
  landedTaskUid,
})

const sceneOf = (spec: SceneSpec, override: Loose = {}, selection: Selection = emptySelection(), landing: LandingState = HIDDEN): Scene => {
  const settings = { ...SETTINGS_DEFAULTS, scrollDate: HOME, zoomX: 1, ...spec.settings, ...override }
  const regions = regionsFromScreen(ENVIRONMENT as unknown as Environment, settings as unknown as Settings)
  const schedule = scheduleOf(spec)
  const layout = layoutFromSchedule(schedule, settings as unknown as Settings, regions)
  const geometry = geometryFromLayout(schedule, settings as unknown as Settings, layout, regions, selection, null)
  const document = {
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule,
    documentSettings: settings,
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }
  const context = {
    document,
    layout,
    geometry,
    regions,
    screen: { ...emptyScreenSession.screen, landingMarkDisplayState: landing },
    selection,
    zoomStep: S_53,
    zoomMin: S_54,
    zoomMax: S_55,
    isPictureAtStoredZoom: true,
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
  const typedLayout = layout as unknown as { readonly taskGroups: readonly Row[]; readonly placements: readonly Placement[] }
  return {
    spec,
    settings,
    schedule,
    taskGroupArea: (regions as unknown as { readonly taskGroupArea: Rect }).taskGroupArea,
    rows: typedLayout.taskGroups,
    placements: typedLayout.placements,
    lines: geometry.dependencies as unknown as readonly Line[],
    selection,
    context,
    raw: { layout, regions, geometry },
  }
}

const lineOf = (scene: Scene, predecessorUid: number, successorUid: number): Line => {
  const found = scene.lines.find((one) => one.predecessorUid === predecessorUid && one.successorUid === successorUid)
  if (found === undefined) throw new Error(`geometry.dependencies holds no line ${predecessorUid} -> ${successorUid}`)
  return found
}

const maybeLineOf = (scene: Scene, predecessorUid: number, successorUid: number): Line | undefined =>
  scene.lines.find((one) => one.predecessorUid === predecessorUid && one.successorUid === successorUid)

const placementOf = (scene: Scene, uid: number): Placement | undefined => scene.placements.find((one) => one.taskUid === uid)

const rowOf = (scene: Scene, groupId: string): Row => {
  const found = scene.rows.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the layout drew no task group ${groupId}`)
  return found
}

const markOf = (scene: Scene, predecessorUid: number, successorUid: number): Pt => {
  const dots = maybeLineOf(scene, predecessorUid, successorUid)?.continuation?.dots ?? []
  if (dots.length !== 3) throw new Error(`premise: line ${predecessorUid} -> ${successorUid} carries no mark (EL-9)`)
  return dots[1]!
}

// see EL-7, EL-8, EL-20
const firstRiseOf = (drawn: readonly Pt[]): 'up' | 'down' | 'none' => {
  for (let at = 1; at < drawn.length; at += 1) {
    const dy = drawn[at]!.y - drawn[at - 1]!.y
    if (Math.abs(dy) > 1e-6) return dy > 0 ? 'down' : 'up'
  }
  return 'none'
}

const MODS: InputModifiers ={ ctrl: false, shift: false, alt: false, meta: false }

const pointerAt = (phase: PointerInput['phase'], at: Pt, clickCount = 1, button: PointerInput['button'] = 'left'): PointerInput =>
  ({ kind: 'pointer', phase, button, x: at.x, y: at.y, modifiers: MODS, clickCount }) as unknown as PointerInput

interface Released {
  readonly press: PointerPress
  readonly out: TranslatedInput
  readonly selection: Selection
}

// WHY: the press and its release read as the shell hands them over; a second click is read with the
// double-click reading (the TRAP on PointerPress.hit).
const release = (scene: Scene, at: Pt, clickCount = 1, to: Pt = at): Released => {
  const hit = itemAtPointer(scene.context.geometry, at.x, at.y, grabSizesOf(), clickCount >= 2 ? 'doubleClick' : 'press')
  const press = { at: pointerAt('down', at, clickCount), hit, on: null, pressRow: 'PTD-3' } as unknown as PointerPress
  const context = { ...scene.context, pressed: press } as InputContext
  const up = pointerAt('up', to, clickCount)
  return { press, out: commandFromGrab(up, press, context), selection: selectionFromInput(up as HumanInput, context) }
}

const groupsOf = (out: TranslatedInput): readonly (readonly Loose[])[] => {
  const action = out.action as unknown as { readonly kind?: string; readonly writes?: readonly (readonly Loose[])[] } | null
  if (action === null || action.kind !== 'changeDocument') return []
  return (action.writes ?? []).filter((group) => group.length > 0)
}

const writesOf = (out: TranslatedInput): readonly Loose[] => groupsOf(out).flat()

const onlyOf = (writes: readonly Loose[], kind: string): Loose | undefined => {
  const found = writes.filter((one) => one['kind'] === kind)
  expect(found.length, `at most one ${kind} is written`).toBeLessThanOrEqual(1)
  return found[0]
}

const landingOf = (out: TranslatedInput): unknown => (out as unknown as { readonly landingMarked?: unknown }).landingMarked

const sceneAfter = (scene: Scene, writes: readonly Loose[]): Scene => {
  const next: Loose = {}
  for (const write of writes) {
    if (!VIEW_KINDS.has(String(write['kind']))) continue
    const { kind: _kind, ...fields } = write
    Object.assign(next, fields)
  }
  return sceneOf(scene.spec, { ...scene.settings, ...next })
}

const dayOf = (value: unknown): unknown => (typeof value === 'string' ? value.slice(0, 10) : value)

const itemsOf = (selection: Selection): readonly Loose[] => (selection as unknown as { readonly items: readonly Loose[] }).items

const TASK_1 = selectionWith(emptySelection(), { kind: 'task', uid: 1 })
const LINE_1_2 = selectionWith(emptySelection(), { kind: 'dependency', successorUid: 2, ordinal: 0 })

// see EL-4
const offRight = (selection?: Selection, landing?: LandingState, settings: Loose = {}): Scene =>
  sceneOf(
    {
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, FAR, 5, [1]), 'b'],
      ],
      settings,
    },
    {},
    selection,
    landing,
  )

// see EL-3
const bothSeen = (selection?: Selection, landing?: LandingState, settings: Loose = {}): Scene =>
  sceneOf(
    {
      groups: [['a', null], ['b', null], ['c', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 10, 5, [1]), 'b'],
        [taskOf(3, 20, 5, [1, 2]), 'c'],
      ],
      settings,
    },
    {},
    selection,
    landing,
  )

// see EL-6
const neitherSeen = (landing?: LandingState): Scene =>
  sceneOf(
    {
      groups: [['a', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 1000, 5, [1]), 'a'],
      ],
      settings: { scrollDate: iso(300) },
    },
    {},
    emptySelection(),
    landing,
  )

// see EL-20
const FOLDED: SceneSpec = {
  groups: [['a', null], ['a1', 'a', 'collapsed'], ['a11', 'a1'], ['z', null]],
  tasks: [
    [taskOf(1, 0, 5), 'a'],
    [taskOf(2, 20, 5, [1]), 'a11'],
  ],
}
const FOLDED_OPEN: SceneSpec = { ...FOLDED, groups: [['a', null], ['a1', 'a'], ['a11', 'a1'], ['z', null]] }

// see EL-20
const HIDDEN_OWN: SceneSpec = {
  groups: [['a', null], ['p', null], ['b', 'p', 'hidden'], ['z', null]],
  tasks: [
    [taskOf(1, 0, 5), 'a'],
    [taskOf(2, 20, 5, [1]), 'b'],
  ],
}

// see EL-20
const HIDDEN_AND_FOLDED: SceneSpec = {
  groups: [['a', null], ['p', null], ['h', 'p', 'hidden'], ['k', 'h', 'collapsed'], ['c', 'k'], ['z', null]],
  tasks: [
    [taskOf(1, 0, 5), 'a'],
    [taskOf(2, 20, 5, [1]), 'c'],
  ],
}

// see EL-20
const HIDDEN_AT_THE_TOP: SceneSpec = {
  groups: [['a', null], ['b', null, 'hidden'], ['z', null]],
  tasks: [
    [taskOf(1, 0, 5), 'a'],
    [taskOf(2, 20, 5, [1]), 'b'],
  ],
}

// WHY: the seen end sits in the second drawn task group, so the upward mark stays inside the Task Group Area.
const HIDDEN_FIRST_AT_THE_TOP: SceneSpec = {
  groups: [['b', null, 'hidden'], ['y', null], ['a', null], ['z', null]],
  tasks: [
    [taskOf(1, 0, 5), 'a'],
    [taskOf(2, 20, 5, [1]), 'b'],
  ],
}

// see EL-20
const HIDDEN_BETWEEN_AT_THE_TOP: SceneSpec = {
  groups: [['a', null], ['b', null, 'hidden'], ['c', null], ['z', null]],
  tasks: [
    [taskOf(1, 0, 5), 'c'],
    [taskOf(2, 20, 5, [1]), 'b'],
  ],
}

const PINNED_KEY = bare(cellOf('T-203', 'S-126', 'キー'))
const LEVEL_ZERO_KEY = bare(cellOf('T-203', 'S-418', 'キー'))

// see EL-20, S-126
const HIDDEN_PINNED_AT_THE_TOP: SceneSpec = { ...HIDDEN_AT_THE_TOP, settings: { [PINNED_KEY]: ['b'] } }

// see EL-20
const FOLDED_AND_LOD: SceneSpec = {
  groups: [['a', null], ['a1', 'a', 'collapsed'], ['a11', 'a1'], ['a111', 'a11'], ['z', null]],
  tasks: [
    [taskOf(1, 0, 5), 'a'],
    [taskOf(2, 20, 5, [1]), 'a111'],
  ],
  settings: { zoomY: 0.4 },
}

// see EL-2, EL-10
const DEEP: SceneSpec = {
  groups: [['a', null], ['a1', 'a'], ['a11', 'a1'], ['b', null]],
  tasks: [
    [taskOf(1, 0, 5), 'a'],
    [taskOf(2, 20, 5, [1]), 'a11'],
  ],
  settings: { zoomY: 0.4 },
}

const treeWritesOf = (writes: readonly Loose[]): Readonly<Record<string, unknown>> => {
  const out: Record<string, unknown> = {}
  for (const write of writes) {
    if (write['kind'] === SET_TREE_STATE) out[String(write['groupId'])] = write['treeState']
    if (write['kind'] === SET_LEVEL_ZERO) out['(level zero)'] = write['levelZeroTreeState']
  }
  return out
}

describe(`(a) PE-12 -- one still click on the mark: ${PE_12_SEND}`, () => {
  it('premise: the press lands on the mark (GA-24) with the ordinary press reading', () => {
    const scene = offRight()
    expect(lineOf(scene, 1, 2).continuation?.farUid, 'premise: the mark leads to Task 2').toBe(2)
    expect(release(scene, markOf(scene, 1, 2)).press.hit?.grab).toBe('GA-24')
  })

  it(`EL-11: the first release already sends the far end to the Task Group Area middle (${MK_13_MARK})`, () => {
    const scene = offRight()
    const writes = writesOf(release(scene, markOf(scene, 1, 2)).out)
    expect(onlyOf(writes, SET_SCROLL), MK_13_MARK).toBeDefined()
    const moved = placementOf(sceneAfter(scene, writes), 2)
    expect(moved, 'the far end is laid out after the send').toBeDefined()
    expect(moved!.x + moved!.width / 2, MK_13_MARK).toBeCloseTo(scene.taskGroupArea.x + scene.taskGroupArea.width / 2, 2)
  })

  it(`EL-16: the release carries the landing mark on the line and its far end -- ${EL_16_MARK}`, () => {
    const scene = offRight()
    expect(landingOf(release(scene, markOf(scene, 1, 2)).out), EL_16_MARK).toEqual({
      predecessorUid: 1,
      successorUid: 2,
      landedTaskUid: 2,
    })
  })

  it(`EL-16 (successor side): the mark at the successor lands on the predecessor`, () => {
    const scene = sceneOf({
      groups: [['a', null], ['b', null]],
      tasks: [
        [taskOf(1, 0, 5), 'a'],
        [taskOf(2, 110, 5, [1]), 'b'],
      ],
      settings: { scrollDate: iso(100) },
    })
    expect(lineOf(scene, 1, 2).continuation?.farUid, 'premise: the mark leads to Task 1').toBe(1)
    expect(landingOf(release(scene, markOf(scene, 1, 2)).out), EL_16_MARK).toEqual({
      predecessorUid: 1,
      successorUid: 2,
      landedTaskUid: 1,
    })
  })

  it(`UN-8: the send writes nothing but CM-65 / CM-66 (${UN_8_VIEW}) -- ${EL_16_NOT_UNDONE}`, () => {
    const scene = offRight()
    const kinds = writesOf(release(scene, markOf(scene, 1, 2)).out).map((one) => String(one['kind']))
    expect(kinds.length, 'premise: the send writes the view').toBeGreaterThan(0)
    expect(kinds.filter((kind) => !VIEW_KINDS.has(kind)), UN_8_VIEW).toEqual([])
  })

  it(`the selection becomes empty on the release (${PE_12_SEND})`, () => {
    const scene = offRight(TASK_1)
    expect(itemsOf(scene.selection).length, 'premise: Task 1 is held selected').toBe(1)
    expect(itemsOf(release(scene, markOf(scene, 1, 2)).selection), PE_12_SEND).toEqual([])
  })

  it(`control: a still release on the line itself (not the mark) selects the line (${PE_12_SELECTS})`, () => {
    const scene = bothSeen()
    const route = lineOf(scene, 1, 2).points
    const a = route[1]!
    const b = route[2]!
    const on = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const { press, selection, out } = release(scene, on)
    expect(press.hit?.grab, 'premise: the press is on the line, not on a mark').not.toBe('GA-24')
    expect(landingOf(out), 'no landing mark for the line itself').toBeUndefined()
    expect(
      itemsOf(selection).some((one) => one['kind'] === 'dependency' && one['successorUid'] === 2),
      PE_12_SELECTS,
    ).toBe(true)
  })

  it(`T-270 PE-12 (横に引く: ${PE_12_DRAG}): a drag past S-208 sends nothing and marks nothing`, () => {
    const scene = offRight()
    const at = markOf(scene, 1, 2)
    const { out } = release(scene, at, 1, { x: at.x + DRAG_PAST, y: at.y })
    expect(landingOf(out), PE_12_DRAG).toBeUndefined()
    expect(writesOf(out).filter((one) => VIEW_KINDS.has(String(one['kind']))), PE_12_DRAG).toEqual([])
  })
})

describe(`(a) EL-18 -- ${EL_18_NOTHING}`, () => {
  it('a second press on the mark while the mark is shown sends nothing, marks nothing, keeps the selection', () => {
    const scene = offRight(LINE_1_2, landed(1, 2, 2))
    const { out, selection } = release(scene, markOf(scene, 1, 2), 2)
    expect(out.action, EL_18_NOTHING).toBeNull()
    expect(landingOf(out), EL_18_NOTHING).toBeUndefined()
    expect(selection, `${EL_18_NOTHING} (選ばず)`).toBe(scene.selection)
  })

  it('a second press on a Task body while the mark is shown does not read MK-13 and keeps the selection', () => {
    const scene = offRight(emptySelection(), landed(1, 2, 2))
    const body = placementOf(scene, 1)!
    const on = { x: body.x + body.width / 2, y: body.y + body.planHeight / 2 }
    const { out, selection } = release(scene, on, 2)
    expect(out.action, `${EL_18_NOTHING} (MK-13 の宛先を読まず)`).toBeNull()
    expect(itemsOf(selection), `${EL_18_NOTHING} (選ばず)`).toEqual([])
  })

  it('control: one press on the mark while a mark is shown sends and marks anew (EL-17 ⭐)', () => {
    const scene = offRight(emptySelection(), landed(9, 9, 9))
    const { out } = release(scene, markOf(scene, 1, 2), 1)
    expect(landingOf(out)).toEqual({ predecessorUid: 1, successorUid: 2, landedTaskUid: 2 })
    expect(onlyOf(writesOf(out), SET_SCROLL)).toBeDefined()
  })

  it('control: one press on the Task body while a mark is shown selects the Task (T-270 PE-1)', () => {
    const scene = offRight(emptySelection(), landed(1, 2, 2))
    const body = placementOf(scene, 1)!
    const { selection } = release(scene, { x: body.x + body.width / 2, y: body.y + body.planHeight / 2 }, 1)
    expect(itemsOf(selection).some((one) => one['kind'] === 'task' && one['uid'] === 1)).toBe(true)
  })
})

describe(`(a) EL-20 / EL-21 -- ${EL_21_OPEN}`, () => {
  const cases = [
    ['a folded task group (HR-1a)', FOLDED, 'a11', { a11: 'expanded', a1: 'expanded', a: 'expanded' }],
    ['a hidden own task group (HR-6)', HIDDEN_OWN, 'b', { b: 'expanded', p: 'expanded' }],
    [
      'a hidden and a folded ancestor',
      HIDDEN_AND_FOLDED,
      'c',
      { c: 'expanded', k: 'expanded', h: 'expanded', p: 'expanded' },
    ],
    ['a hidden task group at the shallowest level, no drawn ancestor (CR-598)', HIDDEN_AT_THE_TOP, 'b', { b: 'expanded' }],
    ['a hidden first task group at the shallowest level (CR-598)', HIDDEN_FIRST_AT_THE_TOP, 'b', { b: 'expanded' }],
  ] as const

  for (const [name, spec, ownTaskGroup, opened] of cases) {
    it(`${name}: premise -- Task 2 is not drawn, and the line carries a mark leading to it (${EL_20_NOT_SEEN})`, () => {
      const scene = sceneOf(spec)
      expect(placementOf(scene, 2), 'premise: Task 2 is not drawn').toBeUndefined()
      expect(maybeLineOf(scene, 1, 2)?.continuation?.farUid, EL_20_NOT_SEEN).toBe(2)
    })

    it(`${name}: the release opens the far task group and every ancestor, and nothing else (${SJ_2_EXPANDED})`, () => {
      const scene = sceneOf(spec)
      const writes = writesOf(release(scene, markOf(scene, 1, 2)).out)
      expect(treeWritesOf(writes), EL_21_OPEN).toEqual(opened)
    })

    it(`${name}: the open is one group before the send, the send another (${UN_14_ONE_STEP} / ${EL_21_SEND_OUTSIDE})`, () => {
      const scene = sceneOf(spec)
      const groups = groupsOf(release(scene, markOf(scene, 1, 2)).out)
      const treeGroups = groups.filter((group) => group.some((one) => TREE_KINDS.has(String(one['kind']))))
      expect(treeGroups.length, UN_14_ONE_STEP).toBe(1)
      expect(
        treeGroups[0]!.every((one) => TREE_KINDS.has(String(one['kind']))),
        `${EL_21_SEND_OUTSIDE}: the open's group holds no view write`,
      ).toBe(true)
      const at = groups.indexOf(treeGroups[0]!)
      const viewAt = groups.findIndex((group) => group.some((one) => VIEW_KINDS.has(String(one['kind']))))
      expect(viewAt, EL_21_SEND).toBeGreaterThan(at)
    })

    it(`${name}: no zoom (${EL_21_NO_ZOOM}); ${EL_12_OPENED} -- ${EL_12_HOW}`, () => {
      const scene = sceneOf(spec)
      const writes = writesOf(release(scene, markOf(scene, 1, 2)).out)
      expect(onlyOf(writes, SET_ZOOM), EL_21_NO_ZOOM).toBeUndefined()
      const scroll = onlyOf(writes, SET_SCROLL)
      expect(scroll, EL_12_OPENED).toBeDefined()
      expect(scroll!['scrollGroupId'], `${EL_12_HOW} (S-78 = the far Task's own task group)`).toBe(ownTaskGroup)
      expect(scroll!['scrollGroupOffset'], `${EL_12_HOW} (S-176)`).toBe(0)
      expect(dayOf(scroll!['scrollDate']), 'EL-11: Task 2 lies inside across, so the day stays').toBe(dayOf(scene.settings['scrollDate']))
    })

    it(`${name}: the release marks the landing and empties the selection (${PE_12_SEND})`, () => {
      const scene = sceneOf(spec, {}, TASK_1)
      const { out, selection } = release(scene, markOf(scene, 1, 2))
      expect(landingOf(out), EL_16_MARK).toEqual({ predecessorUid: 1, successorUid: 2, landedTaskUid: 2 })
      expect(itemsOf(selection), PE_12_SEND).toEqual([])
    })
  }

  it(`${EL_20_LOD}: folded and below the LOD -- the release opens and writes no zoom (${EL_10_FOLDED})`, () => {
    const scene = sceneOf(FOLDED_AND_LOD)
    expect(zoomYOf(scene) < thresholdOf(4), 'premise: the LOD alone would hide depth 4 too').toBe(true)
    const writes = writesOf(release(scene, markOf(scene, 1, 2)).out)
    expect(onlyOf(writes, SET_ZOOM), EL_10_FOLDED).toBeUndefined()
    expect(treeWritesOf(writes)['a1'], EL_21_OPEN).toBe('expanded')
    expect(onlyOf(writes, SET_SCROLL)?.['scrollGroupId'], EL_12_OPENED).toBe('a111')
  })

  it('control: an end the LOD alone hides is zoomed to (EL-10), not opened -- no tree write', () => {
    const scene = sceneOf(DEEP)
    const writes = writesOf(release(scene, markOf(scene, 1, 2)).out)
    expect(onlyOf(writes, SET_ZOOM), 'EL-10').toBeDefined()
    expect(treeWritesOf(writes), 'EL-21 applies only to an EL-20 end').toEqual({})
  })

  it(`${EL_20_HIDDEN}: a pinned task group that is hidden is an end like any other -- the release opens it and marks the landing`, () => {
    const scene = sceneOf(HIDDEN_PINNED_AT_THE_TOP)
    expect(placementOf(scene, 2), 'premise: Task 2 is not drawn').toBeUndefined()
    expect(maybeLineOf(scene, 1, 2)?.continuation?.farUid, `${EL_20_NOT_SEEN} / ${EL_20_NOT_DROPPED}`).toBe(2)
    const { out } = release(scene, markOf(scene, 1, 2))
    expect(treeWritesOf(writesOf(out))['b'], EL_21_OPEN).toBe('expanded')
    expect(landingOf(out), EL_16_MARK).toEqual({ predecessorUid: 1, successorUid: 2, landedTaskUid: 2 })
  })

  it('control: an end already drawn opens nothing -- the send writes the view only', () => {
    const scene = offRight()
    expect(treeWritesOf(writesOf(release(scene, markOf(scene, 1, 2)).out))).toEqual({})
  })
})

const zoomYOf = (scene: Scene): number => Number(scene.settings['zoomY'])

describe(`(b) EL-20 -- ${EL_20_STAND}`, () => {
  it('a folded end stands on the foot of the drawn task group a1, where Task 2 opens across', () => {
    const scene = sceneOf(FOLDED)
    const open = sceneOf(FOLDED_OPEN)
    const line = lineOf(scene, 1, 2)
    expect(line.elision, EL_20_NOT_SEEN).toBe('EL-4')
    const foot = rowOf(scene, 'a1')
    expect(line.points.at(-1)!.y, EL_20_STAND).toBeCloseTo(foot.y + foot.height, 9)
    expect(line.points.at(-1)!.x, EL_20_STAND).toBeCloseTo(placementOf(open, 2)!.x, 9)
  })

  it(`a hidden own task group stands on the foot of the drawn task group p (${EL_20_HIDDEN})`, () => {
    const scene = sceneOf(HIDDEN_OWN)
    const line = lineOf(scene, 1, 2)
    expect(line.elision, EL_20_NOT_SEEN).toBe('EL-4')
    const foot = rowOf(scene, 'p')
    expect(line.points.at(-1)!.y, EL_20_STAND).toBeCloseTo(foot.y + foot.height, 9)
  })

  it('under a hidden and a folded ancestor, the end stands on the foot of p', () => {
    const scene = sceneOf(HIDDEN_AND_FOLDED)
    const foot = rowOf(scene, 'p')
    expect(lineOf(scene, 1, 2).points.at(-1)!.y, EL_20_STAND).toBeCloseTo(foot.y + foot.height, 9)
  })

  it(`the mark of a folded end is drawn: three dots in the line colour (EL-9)`, () => {
    const scene = sceneOf(FOLDED)
    const dots = lineOf(scene, 1, 2).continuation?.dots ?? []
    expect(dots.length, EL_20_NOT_SEEN).toBe(3)
    expect(circlesAt(svgOf(scene), dots).length, EL_20_NOT_SEEN).toBe(3)
  })

  it(`${EL_20_NOT_DROPPED}: a hidden task group at the shallowest level still gets the short line and the mark`, () => {
    const scene = sceneOf(HIDDEN_AT_THE_TOP)
    expect(placementOf(scene, 1), 'premise: Task 1 is drawn').toBeDefined()
    expect(placementOf(scene, 2), 'premise: Task 2 is not drawn').toBeUndefined()
    const line = lineOf(scene, 1, 2)
    expect(line.elision, `${EL_20_NOT_SEEN} (EL-4)`).toBe('EL-4')
    expect(line.continuation?.farUid, EL_20_NOT_DROPPED).toBe(2)
    const dots = line.continuation?.dots ?? []
    expect(dots.length, EL_20_NOT_DROPPED).toBe(3)
    const svg = svgOf(scene)
    expect(inkedLines(svg, 'light').length, EL_20_NOT_DROPPED).toBe(1)
    expect(circlesAt(svg, dots).length, EL_20_NOT_DROPPED).toBe(3)
  })

  it(`${EL_20_NO_ANCESTOR} -- task group b sorts after a: the end stands on the foot of a; ${EL_20_ACROSS}`, () => {
    const scene = sceneOf(HIDDEN_AT_THE_TOP)
    const open = sceneOf({ ...HIDDEN_AT_THE_TOP, groups: [['a', null], ['b', null], ['z', null]] })
    const stand = lineOf(scene, 1, 2).points.at(-1)!
    const foot = rowOf(scene, 'a')
    expect(stand.y, EL_20_NO_ANCESTOR).toBeCloseTo(foot.y + foot.height, 9)
    expect(stand.x, EL_20_ACROSS).toBeCloseTo(placementOf(open, 2)!.x, 9)
  })

  it(`${EL_20_NO_ANCESTOR} -- task group b sorts first: the end stands on the top of the task groups under the band`, () => {
    const scene = sceneOf(HIDDEN_FIRST_AT_THE_TOP)
    expect(lineOf(scene, 1, 2).points.at(-1)!.y, EL_20_NO_ANCESTOR).toBeCloseTo(scene.taskGroupArea.y, 9)
  })

  it(`${EL_20_NO_ANCESTOR} -- task group b sits between a and c: the end stands on the foot of a, not of c`, () => {
    const scene = sceneOf(HIDDEN_BETWEEN_AT_THE_TOP)
    const foot = rowOf(scene, 'a')
    expect(lineOf(scene, 1, 2).points.at(-1)!.y, EL_20_NO_ANCESTOR).toBeCloseTo(foot.y + foot.height, 9)
  })

  for (const [name, spec, down] of [
    ['b sorts after the seen end: the short line bends down', HIDDEN_AT_THE_TOP, true],
    ['b sorts first: the short line bends up', HIDDEN_FIRST_AT_THE_TOP, false],
    ['b sits above the seen end, below a drawn task group: the short line bends up', HIDDEN_BETWEEN_AT_THE_TOP, false],
  ] as const) {
    it(`${EL_20_TOWARD} -- ${name}`, () => {
      const drawn = lineOf(sceneOf(spec), 1, 2).drawnPoints ?? []
      expect(drawn.length, 'premise: the short line is drawn').toBeGreaterThan(1)
      expect(firstRiseOf(drawn), EL_20_TOWARD).toBe(down ? 'down' : 'up')
    })
  }

  it(`${EL_20_LEVEL_ZERO} -- ${EL_6_NONE}`, () => {
    const scene = sceneOf({ ...HIDDEN_AT_THE_TOP, settings: { [LEVEL_ZERO_KEY]: 'collapsed' } })
    expect(scene.rows, 'premise: no task group is drawn (HR-2)').toEqual([])
    const line = maybeLineOf(scene, 1, 2)
    expect(line?.continuation ?? null, EL_20_LEVEL_ZERO).toBeNull()
    expect(line?.drawnPoints ?? [], `${EL_20_LEVEL_ZERO} (${EL_6_NONE})`).toEqual([])
    const svg = svgOf(scene)
    expect(inkedLines(svg, 'light').length, EL_6_NONE).toBe(0)
    expect(elementsOf(svg).filter((one) => one.tag === 'circle').length, EL_6_NONE).toBe(0)
  })

  it('control: with the task group shown, the same line is drawn whole (EL-3)', () => {
    const scene = sceneOf({ ...HIDDEN_AT_THE_TOP, groups: [['a', null], ['b', null], ['z', null]] })
    expect(lineOf(scene, 1, 2).elision).toBe('EL-3')
  })
})

// WHY: the SVG prints two decimals.
const SVG_EPS = 0.006

interface Element {
  readonly tag: string
  readonly attrs: string
  readonly zo: string | null
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return found === null ? null : found[1]!
}

const parsed = new Map<string, readonly Element[]>()

// see T-020
const elementsOf = (svg: string): readonly Element[] => {
  const held = parsed.get(svg)
  if (held !== undefined) return held
  const out: Element[] = []
  const groups: (string | null)[] = []
  // WHY: a marker is a definition, not a drawn thing; its ink is read through the line that uses it.
  const drawn = svg.replace(/<marker\b[\s\S]*?<\/marker>/g, '')
  for (const match of drawn.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrOf(attrs!, 'data-zo'))
      continue
    }
    if (closing === '/') continue
    const zo = [...groups].reverse().find((one) => one !== null) ?? null
    out.push({ tag: tag!, attrs: attrs!, zo })
  }
  parsed.set(svg, out)
  return out
}

const pointsAttr = (attrs: string): readonly Pt[] =>
  (attrOf(attrs, 'points') ?? '')
    .trim()
    .split(/\s+/)
    .filter((one) => one !== '')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x: x!, y: y! }
    })

const near = (a: Pt, b: Pt, eps = SVG_EPS): boolean => Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
const samePath = (actual: readonly Pt[], expected: readonly Pt[]): boolean =>
  actual.length === expected.length && actual.every((one, at) => near(one, expected[at]!))

const strokeOf = (one: Element): string => (attrOf(one.attrs, 'stroke') ?? '').toLowerCase()
const fillOf = (one: Element): string => (attrOf(one.attrs, 'fill') ?? '').toLowerCase()
const widthOf = (one: Element): number => Number(attrOf(one.attrs, 'stroke-width'))

type Theme = 'light' | 'dark'
const THEMED = new Map<string, string>()
const themed = (id: string, theme: Theme): string => {
  const key = `${id} ${theme}`
  const held = THEMED.get(key)
  if (held !== undefined) return held
  const read = theme === 'light' ? LIGHT(id) : DARK(id)
  THEMED.set(key, read)
  return read
}

const svgOf = (scene: Scene, picture: 'screen' | 'export' = 'screen', landing: LandingState = HIDDEN, theme: Theme = 'light'): string =>
  svgFromSchedule(
    scene.schedule,
    scene.settings as unknown as Settings,
    scene.raw.layout as never,
    scene.raw.geometry as never,
    scene.raw.regions as never,
    scene.selection,
    picture,
    { themePreference: theme, guideCursorMode: 'none', landingMarkDisplayState: landing } as unknown as ViewerArgument,
  )

const inkedLines = (svg: string, theme: Theme): readonly Element[] =>
  elementsOf(svg).filter((one) => one.tag === 'polyline' && strokeOf(one) === themed('S-159', theme))

// WHY: an emphasised line keeps S-159 (SL-8, EL-16), so only its width tells it apart.
const isEmphasised = (one: Element, displayScale = 100): boolean =>
  Math.abs(widthOf(one) - EMPHASISED_WIDTH(displayScale)) <= SVG_EPS

const emphasisedLines = (svg: string, theme: Theme = 'light', displayScale = 100): readonly Element[] =>
  inkedLines(svg, theme).filter((one) => isEmphasised(one, displayScale))

const lineDrawnAs = (svg: string, route: readonly Pt[], theme: Theme = 'light'): Element | undefined =>
  inkedLines(svg, theme).find((one) => samePath(pointsAttr(one.attrs), route))

const circlesAt = (svg: string, centres: readonly Pt[]): readonly Element[] =>
  elementsOf(svg).filter(
    (one) =>
      one.tag === 'circle' &&
      centres.some((centre) => near({ x: Number(attrOf(one.attrs, 'cx')), y: Number(attrOf(one.attrs, 'cy')) }, centre)),
  )

const markerFillOf = (svg: string, line: Element): string | null => {
  const ref = /url\(#([^)]+)\)/.exec(attrOf(line.attrs, 'marker-end') ?? '')
  if (ref === null) return null
  const body = new RegExp(`<marker id="${ref[1]}"[^>]*>([\\s\\S]*?)</marker>`).exec(svg)
  if (body === null) return null
  const fill = /fill="([^"]*)"/.exec(body[1]!)
  return fill === null ? null : fill[1]!.toLowerCase()
}

const numbersOf = (text: string): readonly number[] => [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((one) => Number(one[0]))

const boxOfElement = (one: Element): Rect => {
  if (one.tag === 'rect') {
    return {
      x: Number(attrOf(one.attrs, 'x')),
      y: Number(attrOf(one.attrs, 'y')),
      width: Number(attrOf(one.attrs, 'width')),
      height: Number(attrOf(one.attrs, 'height')),
    }
  }
  const values = one.tag === 'path' ? numbersOf(attrOf(one.attrs, 'd') ?? '') : pointsAttr(one.attrs).flatMap((p) => [p.x, p.y])
  const xs = values.filter((_v, at) => at % 2 === 0)
  const ys = values.filter((_v, at) => at % 2 === 1)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

// see T-020, ZO-1
const planFiguresOf = (svg: string, uid: number): readonly Element[] =>
  elementsOf(svg).filter((one) => attrOf(one.attrs, 'data-figure') === `task-${uid}-plan`)

const verticesOf = (one: Element): readonly Pt[] => {
  const at = (x: string, y: string): Pt => ({ x: Number(attrOf(one.attrs, x)), y: Number(attrOf(one.attrs, y)) })
  if (one.tag === 'line') return [at('x1', 'y1'), at('x2', 'y2')]
  if (one.tag === 'circle') return [at('cx', 'cy')]
  if (one.tag === 'rect') {
    const box = boxOfElement(one)
    return [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ]
  }
  if (one.tag === 'path') {
    const values = numbersOf(attrOf(one.attrs, 'd') ?? '')
    const out: Pt[] = []
    for (let index = 0; index + 1 < values.length; index += 2) out.push({ x: values[index]!, y: values[index + 1]! })
    return out
  }
  return pointsAttr(one.attrs)
}

const sameVertices = (a: readonly Pt[], b: readonly Pt[]): boolean =>
  a.length > 0 && a.every((one) => b.some((other) => near(one, other))) && b.every((one) => a.some((other) => near(one, other)))

// see SL-8, ZO-10
const outlinesOf = (svg: string, theme: Theme = 'light'): readonly Element[] =>
  elementsOf(svg).filter(
    (one) => one.zo === 'ZO-10' && strokeOf(one) === themed('S-159', theme) && attrOf(one.attrs, 'stroke-dasharray') === null,
  )

// see SL-8
const tracesPlanOf = (svg: string, outline: Element, uid: number): boolean =>
  planFiguresOf(svg, uid).some((figure) => sameVertices(verticesOf(figure), verticesOf(outline)))

const outlinedUids = (svg: string, uids: readonly number[], theme: Theme = 'light'): readonly number[] =>
  uids.filter((uid) => outlinesOf(svg, theme).some((one) => tracesPlanOf(svg, one, uid)))

const planBoxOf = (scene: Scene, uid: number): Rect => {
  const placed = placementOf(scene, uid)
  if (placed === undefined) throw new Error(`premise: Task ${uid} is drawn`)
  return { x: placed.x, y: placed.y, width: placed.width, height: placed.planHeight }
}

// see SL-8
const framesBox = (frame: Element, box: Rect): boolean => {
  const drawn = boxOfElement(frame)
  const middle = (r: Rect): Pt => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })
  return near(middle(drawn), middle(box), 0.02) && drawn.width >= box.width - SVG_EPS && drawn.height >= box.height - SVG_EPS
}

describe(`(c) EL-16 / EL-19 -- the landing line: ${EL_19_WHOLE}`, () => {
  it(`an EL-4 line marked as landed draws its whole route in S-159 at its own width + S-447, its head in S-159 (${EL_16_LOOK})`, () => {
    const scene = offRight()
    const line = lineOf(scene, 1, 2)
    expect(line.elision, 'premise').toBe('EL-4')
    const svg = svgOf(scene, 'screen', landed(1, 2, 2))
    const landing = lineDrawnAs(svg, line.points)
    expect(landing, EL_19_WHOLE).toBeDefined()
    expect(widthOf(landing!), EL_16_LOOK).toBeCloseTo(EMPHASISED_WIDTH(), 2)
    expect(markerFillOf(svg, landing!), `${EL_19_WHOLE} / ${EL_16_LOOK} (矢じりを含む)`).toBe(LIGHT('S-159'))
    expect(emphasisedLines(svg).length, EL_16_LOOK).toBe(1)
  })

  it(`no dots are drawn on the landing line (${EL_19_NO_DOTS})`, () => {
    const scene = offRight()
    const dots = lineOf(scene, 1, 2).continuation?.dots ?? []
    expect(dots.length, 'premise: the unmarked line has a mark').toBe(3)
    expect(circlesAt(svgOf(scene, 'screen', landed(1, 2, 2)), dots), EL_19_NO_DOTS).toEqual([])
  })

  it(`the dark theme paints it in the dark S-159, at the same width`, () => {
    const scene = offRight()
    const svg = svgOf(scene, 'screen', landed(1, 2, 2), 'dark')
    const landing = lineDrawnAs(svg, lineOf(scene, 1, 2).points, 'dark')
    expect(landing, EL_16_LOOK).toBeDefined()
    expect(widthOf(landing!), EL_16_LOOK).toBeCloseTo(EMPHASISED_WIDTH(), 2)
  })

  it(`${EL_19_EL_6}: an EL-6 line marked as landed draws its whole route`, () => {
    const scene = neitherSeen()
    const line = lineOf(scene, 1, 2)
    const landing = lineDrawnAs(svgOf(scene, 'screen', landed(1, 2, 2)), line.points)
    expect(landing, EL_19_EL_6).toBeDefined()
    expect(widthOf(landing!), EL_16_LOOK).toBeCloseTo(EMPHASISED_WIDTH(), 2)
  })

  it(`control (${EL_19_BACK}): the same line with the mark hidden is drawn short at its own width, with its dots`, () => {
    const scene = offRight()
    const line = lineOf(scene, 1, 2)
    const svg = svgOf(scene)
    expect(emphasisedLines(svg), 'nothing emphasised').toEqual([])
    expect(outlinesOf(svg), 'nothing traced').toEqual([])
    const inked = inkedLines(svg, 'light')
    expect(inked.length).toBe(1)
    expect(widthOf(inked[0]!)).toBeCloseTo(LINE_WIDTH(), 2)
    expect(samePath(pointsAttr(inked[0]!.attrs), line.points), EL_19_BACK).toBe(false)
    expect(circlesAt(svg, line.continuation?.dots ?? []).length, EL_19_BACK).toBe(3)
  })

  it(`${FR_009_ZERO}: the landing line is drawn after every other line in ZO-4, even a selected one`, () => {
    // WHY: 1 -> 2 is made before 1 -> 3 and 2 -> 3, so rule (2) alone would draw it behind them.
    const route = lineOf(bothSeen(), 1, 2).points
    const plain = svgOf(bothSeen(), 'screen', landed(1, 2, 2))
    const withSelected = svgOf(
      bothSeen(selectionWith(emptySelection(), { kind: 'dependency', successorUid: 3, ordinal: 0 })),
      'screen',
      landed(1, 2, 2),
    )
    for (const svg of [plain, withSelected]) {
      const inZo4 = inkedLines(svg, 'light').filter((one) => one.zo === 'ZO-4')
      expect(inZo4.length, 'premise: three lines drawn in ZO-4').toBe(3)
      const last = inZo4.at(-1)!
      expect(samePath(pointsAttr(last.attrs), route), FR_009_ZERO).toBe(true)
      expect(widthOf(last), FR_009_ZERO).toBeCloseTo(EMPHASISED_WIDTH(), 2)
    }
  })

  it(`${EL_16_UNDRAWN}: a landing that names a line the document does not hold emphasises and traces nothing`, () => {
    const svg = svgOf(bothSeen(), 'screen', landed(7, 8, 8))
    expect(emphasisedLines(svg), EL_16_UNDRAWN).toEqual([])
    expect(outlinesOf(svg), EL_16_UNDRAWN).toEqual([])
  })
})

describe(`(c) EL-16 / SL-8 -- the end outlines: ${EL_16_ENDS}`, () => {
  it(`both ends of a landing line are traced once each -- ${SL_8_ENDS}`, () => {
    const svg = svgOf(bothSeen(), 'screen', landed(1, 2, 2))
    expect(outlinedUids(svg, [1, 2, 3]), `${EL_16_ENDS} / ${SL_8_ENDS}`).toEqual([1, 2])
    const outlines = outlinesOf(svg)
    expect(outlines.length, EL_16_ENDS).toBe(2)
    for (const one of outlines) {
      expect(['none', 'transparent'], `${SL_8_ENDS} (an outline, not a fill)`).toContain(fillOf(one))
      expect(one.zo, ZO_10_OUTLINE).toBe('ZO-10')
    }
  })

  it(`${SL_8_OUTLINE_INK} -- the width is S-39 x the drawn ratio + S-447`, () => {
    const outlines = outlinesOf(svgOf(bothSeen(), 'screen', landed(1, 2, 2)))
    expect(outlines.length, 'premise: two outlines').toBe(2)
    for (const one of outlines) expect(Math.abs(widthOf(one) - OUTLINE_WIDTH()), SL_8_OUTLINE_INK).toBeLessThanOrEqual(SVG_EPS)
  })

  it(`${SL_8_OUTLINE_INK} -- each trace is drawn after the plan figure it traces`, () => {
    const svg = svgOf(bothSeen(), 'screen', landed(1, 2, 2))
    const all = elementsOf(svg)
    for (const uid of [1, 2]) {
      const figures = planFiguresOf(svg, uid)
      expect(figures.length, `premise: Task ${uid}'s plan is drawn`).toBeGreaterThan(0)
      const trace = outlinesOf(svg).find((one) => tracesPlanOf(svg, one, uid))
      expect(trace, SL_8_ENDS).toBeDefined()
      expect(all.indexOf(trace!), SL_8_OUTLINE_INK).toBeGreaterThan(Math.max(...figures.map((one) => all.indexOf(one))))
    }
  })

  it(`${SL_8_UNDRAWN}: an EL-4 landing traces only the drawn end`, () => {
    const scene = offRight()
    expect(placementOf(scene, 2), 'premise: Task 2 lies off screen, but is laid out').toBeDefined()
    const svg = svgOf(scene, 'screen', landed(1, 2, 2))
    expect(outlinesOf(svg).length, SL_8_UNDRAWN).toBe(1)
    expect(outlinedUids(svg, [1]), SL_8_UNDRAWN).toEqual([1])
  })

  it(`${EL_16_EL_2}: after EL-10's zoom Task 2 is drawn and traced; before it, it is not`, () => {
    const before = sceneOf(DEEP)
    expect(placementOf(before, 2), 'premise: the LOD hides Task 2').toBeUndefined()
    expect(outlinesOf(svgOf(before, 'screen', landed(1, 2, 2))).length, SL_8_UNDRAWN).toBe(1)
    const after = sceneOf(DEEP, { zoomY: thresholdOf(3) })
    expect(placementOf(after, 2), 'premise: the threshold of depth 3 draws Task 2').toBeDefined()
    expect(outlinedUids(svgOf(after, 'screen', landed(1, 2, 2)), [1, 2]), EL_16_EL_2).toEqual([1, 2])
  })

  it(`${S_447_PX}: at display scale 200 and zoomX 2 the added S-447 stays S-447 px`, () => {
    const scene = bothSeen(LINE_1_2, HIDDEN, { displayScale: 200, zoomX: 2 })
    const svg = svgOf(scene)
    const outlines = outlinesOf(svg)
    expect(outlines.length, 'premise: two outlines').toBe(2)
    for (const one of outlines) expect(Math.abs(widthOf(one) - OUTLINE_WIDTH(200)), S_447_PX).toBeLessThanOrEqual(SVG_EPS)
    const chosen = lineDrawnAs(svg, lineOf(scene, 1, 2).points)
    expect(chosen, 'premise: the selected line is drawn').toBeDefined()
    expect(widthOf(chosen!), S_447_PX).toBeCloseTo(EMPHASISED_WIDTH(200), 2)
  })

  it('control: with nothing selected and no landing, nothing is traced', () => {
    expect(outlinesOf(svgOf(bothSeen())), 'no outline').toEqual([])
  })
})

describe(`(c) SL-8 -- the selected line: ${SL_8_WIDTH}`, () => {
  it(`a selected EL-3 line is drawn in S-159 with its head in S-159, at S-18 x ratio + S-447`, () => {
    const scene = bothSeen(LINE_1_2)
    const svg = svgOf(scene)
    const chosen = lineDrawnAs(svg, lineOf(scene, 1, 2).points)
    expect(chosen, 'the drawn form is unchanged').toBeDefined()
    expect(markerFillOf(svg, chosen!), `${SL_8_WIDTH} (矢じり)`).toBe(LIGHT('S-159'))
    expect(widthOf(chosen!), SL_8_WIDTH).toBeCloseTo(EMPHASISED_WIDTH(), 2)
    expect(emphasisedLines(svg).length, SL_8_WIDTH).toBe(1)
  })

  it('the unselected lines of the same picture stay in S-159 at S-18 x ratio (control)', () => {
    const scene = bothSeen(LINE_1_2)
    const route = lineOf(scene, 1, 2).points
    const others = inkedLines(svgOf(scene), 'light').filter((one) => !samePath(pointsAttr(one.attrs), route))
    expect(others.length).toBe(2)
    for (const one of others) expect(widthOf(one)).toBeCloseTo(LINE_WIDTH(), 2)
  })

  it(`the dark theme paints the selected line in the dark S-159, at the same width`, () => {
    const scene = bothSeen(LINE_1_2)
    const chosen = lineDrawnAs(svgOf(scene, 'screen', HIDDEN, 'dark'), lineOf(scene, 1, 2).points, 'dark')
    expect(chosen, SL_8_WIDTH).toBeDefined()
    expect(widthOf(chosen!), SL_8_WIDTH).toBeCloseTo(EMPHASISED_WIDTH(), 2)
  })

  it(`a selected EL-4 line keeps its short form, S-159 and wider, its dots in S-159 at their own size (${EL_9_COLOUR})`, () => {
    const scene = offRight(LINE_1_2)
    const line = lineOf(scene, 1, 2)
    const svg = svgOf(scene)
    const chosen = inkedLines(svg, 'light')
    expect(chosen.length).toBe(1)
    expect(samePath(pointsAttr(chosen[0]!.attrs), line.drawnPoints ?? []), 'the drawn form is as today').toBe(true)
    expect(widthOf(chosen[0]!), SL_8_WIDTH).toBeCloseTo(EMPHASISED_WIDTH(), 2)
    const dots = circlesAt(svg, line.continuation?.dots ?? [])
    expect(dots.length, 'premise: three dots').toBe(3)
    const plainDots = circlesAt(svgOf(offRight()), line.continuation?.dots ?? [])
    expect(plainDots.length, 'premise: three dots when not selected').toBe(3)
    for (const dot of dots) {
      expect(fillOf(dot), EL_9_COLOUR).toBe(LIGHT('S-159'))
      expect(attrOf(dot.attrs, 'r'), 'EL-9: the dot keeps its size').toBe(attrOf(plainDots[0]!.attrs, 'r'))
    }
  })

  it(`both ends of a selected line are traced, each once (${SL_8_ENDS})`, () => {
    const svg = svgOf(bothSeen(LINE_1_2))
    expect(outlinedUids(svg, [1, 2, 3]), SL_8_ENDS).toEqual([1, 2])
    expect(outlinesOf(svg).length, SL_8_ENDS).toBe(2)
  })

  it(`${SL_8_ONCE}: 1 -> 3 and 2 -> 3 selected trace Tasks 1, 2, 3 -- Task 3 once`, () => {
    const both = selectionWith(
      selectionWith(emptySelection(), { kind: 'dependency', successorUid: 3, ordinal: 0 }),
      { kind: 'dependency', successorUid: 3, ordinal: 1 },
    )
    const svg = svgOf(bothSeen(both))
    expect(emphasisedLines(svg).length, 'premise: two lines selected').toBe(2)
    expect(outlinedUids(svg, [1, 2, 3]), SL_8_ONCE).toEqual([1, 2, 3])
    expect(outlinesOf(svg).length, SL_8_ONCE).toBe(3)
  })

  it(`${SL_8_UNDRAWN}: a selected EL-4 line traces only Task 1`, () => {
    const svg = svgOf(offRight(LINE_1_2))
    expect(outlinedUids(svg, [1]), SL_8_UNDRAWN).toEqual([1])
    expect(outlinesOf(svg).length, SL_8_UNDRAWN).toBe(1)
  })

  it(`${SL_8_FRAME_OVER}: in ZO-10 Task 1's trace comes before its dashed frame (${ZO_10_OUTLINE})`, () => {
    const scene = bothSeen(selectionWith(LINE_1_2, { kind: 'task', uid: 1 }))
    const svg = svgOf(scene)
    const box = planBoxOf(scene, 1)
    const zo10 = elementsOf(svg).filter((one) => one.zo === 'ZO-10')
    const outlines = outlinesOf(svg)
    const outlineAt = zo10.findIndex((one) => outlines.includes(one) && tracesPlanOf(svg, one, 1))
    const frameAt = zo10.findIndex((one) => attrOf(one.attrs, 'stroke-dasharray') !== null && framesBox(one, box))
    expect(outlineAt, `${SL_8_FRAME_OVER}: the trace is drawn`).toBeGreaterThanOrEqual(0)
    expect(frameAt, 'premise: the dashed frame is drawn').toBeGreaterThanOrEqual(0)
    expect(outlineAt, SL_8_FRAME_OVER).toBeLessThan(frameAt)
  })
})

describe(`(c) EP-12 -- ${EP_12_LANDING} and the ${EP_12_SELECTION} are not drawn in an export`, () => {
  it('an exported picture with a selected line and a landing holds no emphasised line and no trace', () => {
    const scene = offRight(LINE_1_2)
    const line = lineOf(scene, 1, 2)
    const svg = svgOf(scene, 'export', landed(1, 2, 2))
    expect(emphasisedLines(svg), EP_12_LANDING).toEqual([])
    expect(outlinesOf(svg), EP_12_SELECTION).toEqual([])
    expect(
      inkedLines(svg, 'light').some((one) => samePath(pointsAttr(one.attrs), line.points)),
      'EL-15: the export elides the line as usual',
    ).toBe(false)
  })

  it('control: the same scene on the screen draws both', () => {
    const svg = svgOf(offRight(LINE_1_2), 'screen', landed(1, 2, 2))
    expect(emphasisedLines(svg).length).toBeGreaterThan(0)
    expect(outlinesOf(svg).length).toBeGreaterThan(0)
  })
})

const clicked = (predecessorUid: number, successorUid: number, landedTaskUid: number): SessionEvent =>
  ({ type: 'continuationMarkClicked', landedLink: { predecessorUid, successorUid }, landedTaskUid }) as SessionEvent
const CLEAR = { type: 'landingMarkClearAsked' } as SessionEvent

const stepped = (session: ScreenSession, event: SessionEvent): ScreenSession => advanceScreenSession(session, event).state

describe('(d) T-280 -- landingMarkDisplayStateMachine', () => {
  it(`${T_280_HIDDEN_FIRST}: the empty session holds it hidden`, () => {
    expect(emptyScreenSession.screen.landingMarkDisplayState).toEqual({ kind: 'hidden' })
  })

  it(`${T_280_CLICKED}: hidden -> shown, carrying landedLink and landedTaskUid`, () => {
    const after = stepped(emptyScreenSession, clicked(1, 2, 2))
    expect(after.screen.landingMarkDisplayState).toEqual(landed(1, 2, 2))
  })

  it(`${T_280_CLICKED}: shown -> shown with the new contents`, () => {
    const after = stepped(stepped(emptyScreenSession, clicked(1, 2, 2)), clicked(3, 4, 3))
    expect(after.screen.landingMarkDisplayState).toEqual(landed(3, 4, 3))
  })

  it(`${T_280_CLEARED}: shown -> hidden`, () => {
    const after = stepped(stepped(emptyScreenSession, clicked(1, 2, 2)), CLEAR)
    expect(after.screen.landingMarkDisplayState).toEqual({ kind: 'hidden' })
  })

  it(`${T_280_OTHERS}: an event of another machine keeps the shown mark`, () => {
    const shown = stepped(emptyScreenSession, clicked(1, 2, 2))
    const after = stepped(shown, { type: 'choiceMoved' } as SessionEvent)
    expect(after.screen.landingMarkDisplayState, T_280_OTHERS).toBe(shown.screen.landingMarkDisplayState)
  })
})

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 0, scrollbarThickness: 0 }
const REAL_RAF = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (REAL_RAF === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = REAL_RAF
})

const keyOf = (id: string): KeyInput => {
  const first = (specTable('T-036').rows.find((row) => row.id === id)?.by['割当'] ?? '').split('／')[0] ?? ''
  const parts = [...first.matchAll(/`([^`]+)`/g)].map((span) => span[1] as string)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return { kind: 'key', key: last, modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: false } }
}
const UNDO = keyOf('SK-6')

const uuid = (n: number): string => `cccccccc-0000-4000-8000-${String(n).padStart(12, '0')}`
const TASK_GROUP_A = uuid(1)
const TASK_GROUP_B = uuid(2)
const TASK_GROUP_C = uuid(3)
const TASK_GROUP_Z = uuid(9)

interface ShellTaskGroup {
  readonly id: string
  readonly parentId: string | null
  readonly treeState?: TreeState
}

const shellTask = (uid: number, start: string, finish: string, links: readonly number[] = []): Loose => ({
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name: `Task${uid}`,
  start: `${start}T08:00:00`,
  finish: `${finish}T17:00:00`,
  milestone: false,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: 0,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: links.map((predecessorUid) => ({
    predecessorUid,
    linkType: 1,
    lag: null,
    lagFormat: null,
    carry: {},
    carryElements: [],
  })),
  carry: {},
  carryElements: [],
})

const shellDocument = (rows: readonly ShellTaskGroup[], tasks: readonly (readonly [Loose, string])[]): Document =>
  ({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 1000, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: tasks.map(([task]) => task),
      resources: [],
      assignments: [],
      taskGroups: rows.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `Row${index + 1}`,
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
      ...structuredClone(TEMPLATE.documentSettings),
      pinnedGroupIds: [],
      scrollDate: '2026-03-30',
      scrollDayOffset: 0,
      scrollGroupId: rows[0]!.id,
      scrollGroupOffset: 0,
      zoomX: 1,
      zoomY: 1,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }) as unknown as Document

// see EL-4
const SHELL_PLAIN = (): Document =>
  shellDocument(
    [
      { id: TASK_GROUP_A, parentId: null },
      { id: TASK_GROUP_B, parentId: null },
      { id: TASK_GROUP_Z, parentId: null },
    ],
    [
      [shellTask(1, '2026-04-01', '2026-04-03'), TASK_GROUP_A],
      [shellTask(2, '2027-06-01', '2027-06-03', [1]), TASK_GROUP_B],
    ],
  )

// see EL-20
const SHELL_FOLDED_TASK_GROUPS: readonly ShellTaskGroup[] = [
  { id: TASK_GROUP_A, parentId: null },
  { id: TASK_GROUP_B, parentId: TASK_GROUP_A, treeState: 'collapsed' },
  { id: TASK_GROUP_C, parentId: TASK_GROUP_B },
  { id: TASK_GROUP_Z, parentId: null },
]
const SHELL_FOLDED = (): Document =>
  shellDocument(SHELL_FOLDED_TASK_GROUPS, [
    [shellTask(1, '2026-04-01', '2026-04-03'), TASK_GROUP_A],
    [shellTask(2, '2026-04-10', '2026-04-14', [1]), TASK_GROUP_C],
  ])

// see EL-20
const SHELL_HIDDEN_AT_THE_TOP = (): Document =>
  shellDocument(
    [
      { id: TASK_GROUP_A, parentId: null },
      { id: TASK_GROUP_B, parentId: null, treeState: 'hidden' },
      { id: TASK_GROUP_Z, parentId: null },
    ],
    [
      [shellTask(1, '2026-04-01', '2026-04-03'), TASK_GROUP_A],
      [shellTask(2, '2026-04-10', '2026-04-14', [1]), TASK_GROUP_B],
    ],
  )

interface Shell {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  svg(): string
  lines(): readonly Line[]
  taskGroupArea(): Rect
}

const shellOf = (document: Document): Shell => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
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
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    svg: () => shown,
    lines: () => frame().geometry.dependencies as unknown as readonly Line[],
    taskGroupArea: () => frame().regions.taskGroupArea as unknown as Rect,
  }
}

const shellMark = (shell: Shell): Pt => {
  const dots = shell.lines().find((one) => one.predecessorUid === 1 && one.successorUid === 2)?.continuation?.dots ?? []
  if (dots.length !== 3) throw new Error('premise: the line 1 -> 2 carries a mark in the shell')
  return dots[1]!
}

const clickAt = (shell: Shell, at: Pt, clickCount = 1, button: PointerInput['button'] = 'left'): void => {
  shell.send(pointerAt('down', at, clickCount, button))
  shell.send(pointerAt('up', at, clickCount, button))
}

// see EL-16
const isLandingShown = (shell: Shell): boolean => emphasisedLines(shell.svg(), 'light', displayScaleOf(shell)).length > 0

const displayScaleOf = (shell: Shell): number => Number(shell.loop.document().documentSettings.displayScale ?? 100)

const emptyPlace = (shell: Shell): Pt => {
  const area = shell.taskGroupArea()
  return { x: area.x + area.width - 30, y: area.y + area.height - 30 }
}

const settingOf = (shell: Shell, key: string): unknown => (shell.loop.document().documentSettings as unknown as Loose)[key]
const treeStatesOf = (shell: Shell): Readonly<Record<string, string>> =>
  Object.fromEntries(shell.loop.document().schedule.taskGroups.map((one) => [one.id, String(one.treeState)]))

describe(`(e) the shell -- EL-17: ${EL_17_CLEAR}`, () => {
  const landedShell = (): Shell => {
    const shell = shellOf(SHELL_PLAIN())
    expect(isLandingShown(shell), 'premise: no landing before the click').toBe(false)
    clickAt(shell, shellMark(shell))
    return shell
  }

  it(`one click on the mark sends the view and shows the landing (${PE_12_SEND})`, () => {
    const shell = shellOf(SHELL_PLAIN())
    const before = settingOf(shell, 'scrollDate')
    clickAt(shell, shellMark(shell))
    expect(settingOf(shell, 'scrollDate'), 'EL-11 sent the view across').not.toBe(before)
    expect(isLandingShown(shell), EL_16_MARK).toBe(true)
    expect(
      elementsOf(shell.svg()).filter((one) => attrOf(one.attrs, 'stroke-dasharray') !== null && one.zo === 'ZO-10'),
      `${PE_12_SEND} (選択を空に)`,
    ).toEqual([])
  })

  it(`${EL_17_MOVE}: a pointer move keeps it`, () => {
    const shell = landedShell()
    const place = emptyPlace(shell)
    shell.send(pointerAt('move', place))
    shell.send(pointerAt('move', { x: place.x - 200, y: place.y - 100 }))
    expect(isLandingShown(shell), EL_17_MOVE).toBe(true)
  })

  it(`${EL_17_MODIFIER_KEEPS} -- a modifier-only key down keeps it`, () => {
    const shell = landedShell()
    shell.send({ kind: 'key', key: 'Shift', modifiers: { ...MODS, shift: true } })
    expect(isLandingShown(shell), EL_17_MODIFIER_KEEPS).toBe(true)
  })

  it(`${EL_17_WHEEL_KEEPS} -- a wheel keeps it`, () => {
    const shell = landedShell()
    const place = emptyPlace(shell)
    shell.send({ kind: 'wheel', x: place.x, y: place.y, modifiers: MODS, notches: 1, scrollPx: { x: 0, y: 100 } })
    expect(isLandingShown(shell), EL_17_WHEEL_KEEPS).toBe(true)
  })

  it(`${EL_17_CLEAR} -- a left press on an empty place clears it`, () => {
    const shell = landedShell()
    clickAt(shell, emptyPlace(shell))
    expect(isLandingShown(shell), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_17_CLEAR} -- a right press clears it (どのボタンでも)`, () => {
    const shell = landedShell()
    clickAt(shell, emptyPlace(shell), 1, 'right')
    expect(isLandingShown(shell), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_18_NOTHING} -- the second press of the double click keeps the mark, the document and the selection`, () => {
    const shell = shellOf(SHELL_PLAIN())
    const at = shellMark(shell)
    clickAt(shell, at, 1)
    const after = JSON.stringify(shell.loop.document())
    clickAt(shell, at, 2)
    expect(isLandingShown(shell), `${EL_18_NOTHING} (印も消さない)`).toBe(true)
    expect(JSON.stringify(shell.loop.document()), EL_18_NOTHING).toBe(after)
    expect(
      elementsOf(shell.svg()).filter((one) => attrOf(one.attrs, 'stroke-dasharray') !== null && one.zo === 'ZO-10'),
      `${EL_18_NOTHING} (選ばず)`,
    ).toEqual([])
  })

  it(`control (${EL_19_BACK}): once cleared, the line is drawn short again with its dots`, () => {
    const shell = landedShell()
    shell.send({ kind: 'key', key: 'Enter', modifiers: MODS })
    expect(emphasisedLines(shell.svg()), 'no emphasised line once cleared').toEqual([])
    expect(outlinesOf(shell.svg()), 'no trace once cleared').toEqual([])
  })
})

describe(`(e) the shell -- EL-21 / UN-14 / UN-8: ${EL_21_ONE_STEP}; ${EL_21_SEND_OUTSIDE}`, () => {
  it(`a click on the mark of a folded end opens B and its ancestors, draws Task 2 and shows the landing`, () => {
    const shell = shellOf(SHELL_FOLDED())
    expect(
      shell.loop.current()!.layout.placements.some((one) => one.taskUid === 2),
      'premise: Task 2 is not drawn',
    ).toBe(false)
    clickAt(shell, shellMark(shell))
    const states = treeStatesOf(shell)
    expect([states[TASK_GROUP_A], states[TASK_GROUP_B], states[TASK_GROUP_C]], EL_21_OPEN).toEqual(['expanded', 'expanded', 'expanded'])
    expect(states[TASK_GROUP_Z], 'no other task group is touched').toBe('auto')
    expect(shell.loop.current()!.layout.placements.some((one) => one.taskUid === 2), EL_21_SEND).toBe(true)
    expect(settingOf(shell, 'scrollGroupId'), EL_12_OPENED).toBe(TASK_GROUP_C)
    expect(isLandingShown(shell), EL_16_MARK).toBe(true)
    expect(shell.loop.hasUnsavedEdits(), 'EL-21: the open is an unsaved edit (FR-100)').toBe(true)
  })

  it(`CR-598: a click on the mark of a hidden shallowest task group reveals it, sends and marks; one undo hides it again (${EL_20_NOT_DROPPED})`, () => {
    const shell = shellOf(SHELL_HIDDEN_AT_THE_TOP())
    expect(
      shell.loop.current()!.layout.placements.some((one) => one.taskUid === 2),
      'premise: Task 2 is not drawn',
    ).toBe(false)
    clickAt(shell, shellMark(shell))
    expect(treeStatesOf(shell)[TASK_GROUP_B], EL_21_OPEN).toBe('expanded')
    expect(shell.loop.current()!.layout.placements.some((one) => one.taskUid === 2), EL_21_SEND).toBe(true)
    expect(settingOf(shell, 'scrollGroupId'), EL_12_OPENED).toBe(TASK_GROUP_B)
    expect(isLandingShown(shell), EL_16_MARK).toBe(true)
    shell.send(UNDO)
    expect(treeStatesOf(shell)[TASK_GROUP_B], UN_14_ONE_STEP).toBe('hidden')
  })

  it(`one undo folds every task group back at once (${UN_14_ONE_STEP})`, () => {
    const shell = shellOf(SHELL_FOLDED())
    const before = treeStatesOf(shell)
    clickAt(shell, shellMark(shell))
    expect(treeStatesOf(shell), 'premise: the task groups were opened').not.toEqual(before)
    shell.send(UNDO)
    expect(treeStatesOf(shell), UN_14_ONE_STEP).toEqual(before)
  })

  it(`control: an undo after a plain send leaves the view where it was sent (${UN_8_VIEW} is outside the history)`, () => {
    const shell = shellOf(SHELL_PLAIN())
    clickAt(shell, shellMark(shell))
    const sent = [settingOf(shell, 'scrollDate'), settingOf(shell, 'scrollDayOffset'), settingOf(shell, 'scrollGroupId')]
    shell.send(UNDO)
    expect(
      [settingOf(shell, 'scrollDate'), settingOf(shell, 'scrollDayOffset'), settingOf(shell, 'scrollGroupId')],
      EL_21_SEND_OUTSIDE,
    ).toEqual(sent)
  })
})
