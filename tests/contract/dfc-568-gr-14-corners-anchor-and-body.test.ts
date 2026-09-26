// DFC-568: GR-14 splits by box kind; highlight corners and body write CM-54 per T-246, comment body CM-51 and anchor CM-50.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPhase,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type {
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type Point,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  type RowPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from './spec-table'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS_RAW = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8')
const REQUIREMENTS = unbroken(REQUIREMENTS_RAW)
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))
const GLOSSARY = readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8')
const ERD_DETAIL = readFileSync(join(SPEC, '_assets', 'fig-erd-detail.md'), 'utf8')

const GR_14_SPLIT = '⭐ `GR-14` の場所は、箱の種類で分けること（MUST）。'
const HIGHLIGHT_PARTS = 'ハイライトボックスは枠と四隅を持つ。'
const HIGHLIGHT_CM_54 =
  '枠（枠線から内と外へ `_assets/tbl-settings.md` の 表 T-206 の `S-293`）を掴めば囲む範囲を大きさを変えずに動かし、四隅（隅から同表の `S-230`）を掴めば囲む範囲の大きさを変える —— どちらも `_assets/tbl-glossary.md` の 表 T-108 の `CM-54` で書くこと（MUST）。'
const HIGHLIGHT_COLUMNS =
  '⭐ ハイライトボックスの位置と大きさを持つ列は囲む範囲の 4 列（`_assets/fig-erd-detail.md` の `AT-117` 〜 `AT-120`）だけであり、それを書く命令は同表に `CM-54` 1 つしか無い。'
const COMMENT_PARTS = 'コメントボックスは本体・引出し線・線先を持つ。'
const COMMENT_COMMANDS =
  '本体（本文の箱の全体）と引出し線（線から左右へ同表の `S-291`）を掴めば `CM-51` で、線先（線先から同表の `S-292`）を掴めば `CM-50` で書くこと（MUST）。'
const COMMENT_NO_CORNERS =
  '⛔ コメントボックスに四隅を持たせてはならない（MUST NOT） —— 本文の箱の大きさは `FR-097` が本文に合わせて決めており、文書は大きさの列を持たない（`AT-110` 〜 `AT-115`）。'
const INSIDE_PASSES_THROUGH =
  '⛔ 囲んだ内側を掴み代にしてはならない（MUST NOT） —— 内側の押下は下のタスクへ素通しにすること（MUST）。'
const T_246_HOLDS_THE_VALUES = '**ハイライトボックスの本体と四隅を離したときに置く値は 表 T-246 が持つ。**'
const T_246_NO_NEW_REFUSAL =
  '⚠️ 同表は新しい拒み方を立てない —— 拒むときの理由は 表 T-233 の `RS-44` であり、告げる作法は `FR-029` に従う。'
const ANCHOR_READ =
  '⭐ 線先は離した位置で読むこと（MUST） —— 離した点の下の日の列の日を `anchorDate` に、離した点の下に描かれた行を `anchorGroupId` に置く。'
const ANCHOR_SAME_AS_PLACING = '置いたときに位置を日付と行の識別子で持つ読み（`FR-019`）と同じであり、引いた量では読まない。'
const ANCHOR_NO_ROW =
  '離した点の下に描かれた行が無いときは動かさず、表 T-233 の `RS-44` を告げる —— 置くときに行が無ければ作らずに告げる `FR-019` と同じである。'
const ANCHOR_NOT_NEAREST =
  '⚠️ 四隅（表 T-246 の `HB-4`）と違い、最寄りの境目へは合わせない —— 四隅は日の列の境目に立つが、線先は日を 1 つ指す点であり、その日の列の中央に描く（`05-07-design.md` の 表 T-221 の `LF-15`）。'
const ANCHOR_HORIZONTAL =
  '⭐ 横にだけ引いて離したときに行が変わらないのは、線先を行の帯の中央に描き、掴み代 `S-292` が既定で帯の高さの半分より狭いからである —— 表 T-246 の `HB-5` の根拠と同じである。'
const FR_019_BODY_OFFSET =
  '⛔ コメントボックスの本文の箱は、留めた点からのずれで置き、その基準隅を左下とすること（MUST） —— **ずれ（`bodyOffsetPx`）は、留めた点から本文の**左下隅**へのものである。**'
const FR_019_POINT_IS_LF_15 = '⭐ 留めた点を描く位置は `05-07-design.md` の 表 T-221 の `LF-15` が持つ。'
const FR_019_LEADER = '⭐ 描き方はこうである（MUST）: 留めた点と、本文の箱の左下隅とを、1 本の線で結ぶこと。'
const LF_15 =
  '横は `anchorDate` の日の列の中央、縦は `anchorGroupId` の行が描かれた帯（`LF-2` / `LF-3`、ピン止めした行は `LF-14`）の中央とする。'
const LF_15_BODY_FOLLOWS = '⚠️ 本文の箱は留めた点からのずれで置く（`FR-019`）ので、アンカーと共に動く'

const IV_19 ='ハイライトボックスの `startDate` が `endDate` より後でないこと、および `topGroupId` が `bottomGroupId` より下でないこと。'

const HB_1_ROW =
  '| HB-1 | 四隅を向かいの隅へ寄せて縮める | 開始日 ＝ 終了日、上端の行 ＝ 下端の行まで縮められる。<br>別の下限は置かない |'
const HB_1 = '開始日 ＝ 終了日、上端の行 ＝ 下端の行まで縮められる。'
const HB_2_ROW =
  '| HB-2 | 隅を向かいの隅の先まで引く | 拒まない。<br>`startDate` と `endDate`、`topGroupId` と `bottomGroupId` を入れ替えて持つ。<br>上下は `FR-019` の「行の木における順位で判ずる」規則で判ずる |'
const HB_2 = '`startDate` と `endDate`、`topGroupId` と `bottomGroupId` を入れ替えて持つ。'
const HB_2_TREE = '上下は `FR-019` の「行の木における順位で判ずる」規則で判ずる'
const HB_3_ROW =
  '| HB-3 | 本体を縦に動かす | `topGroupId` と `bottomGroupId` を、画面に描かれた行で同じ行数だけずらす。<br>離した時点で `HB-2` と同じく木の順位で持ち直す。<br>ずらした先に描かれた行が無いときは動かさず、`RS-44` を告げる |'
const HB_3 = '`topGroupId` と `bottomGroupId` を、画面に描かれた行で同じ行数だけずらす。'
const HB_3_NO_ROW = 'ずらした先に描かれた行が無いときは動かさず、`RS-44` を告げる'
const HB_3_FOLDED =
  '⚠️ 畳んだ行やピン留めした行（`FR-098`）をまたぐと、保存される範囲が文書の行の数で伸び縮みする'
const HB_4_HEAD = '| HB-4 | 四隅を横に動かす |'
const HB_4_NEAREST = '離した点に一番近い日の列の境目へ、掴んだ隅を合わせる。'
const HB_4_TIE = '左右の 2 つの境目から等しい距離のときは、後の日の側の境目を採る。'
const HB_4_DAYS = '左の隅はその境目の右の日を `startDate` に、右の隅はその境目の左の日を `endDate` に置く。'
const HB_4_KEEP = '向かいの辺の日は据え置く。'
const HB_4_REACH = '境目が向かいの辺に届いたときは `HB-6` に従う'
const HB_5_HEAD = '| HB-5 | 四隅を縦に動かす |'
const HB_5_GAP =
  '行の境目は、画面に描かれた行の帯と帯のあいだの隙間とする —— 行は `HB-3` と同じく画面に描かれた行で数え、ピン留めした行（`FR-098`）は上に描かれたとおりに数える。'
const HB_5_DISTANCE = '境目までの距離は隙間の範囲までの距離とし、隙間の中では 0 とする。'
const HB_5_ENDS = '最初に描かれた帯より上は最初の行の上の境目、最後に描かれた帯より下は最後の行の下の境目とする。'
const HB_5_TIE = '上下の 2 つの境目から等しい距離のときは、下の境目を採る。'
const HB_5_ROWS =
  '上の隅はその境目のすぐ下に描かれた行を `topGroupId` に、下の隅はその境目のすぐ上に描かれた行を `bottomGroupId` に置く。'
const HB_5_HORIZONTAL = '横にだけ引いて離したときは行が変わらない'
const HB_5_NO_REFUSAL = '行が 1 つでも描かれていれば、どこで離しても一番近い境目が在るので、`RS-44` で拒む場面は生じない。'
const HB_6_HEAD = '| HB-6 | 隅を向かいの辺に届くまで、または越えて引く |'
const HB_6_RIGHT =
  '右の隅を合わせた境目 b が s の左の境目か、それより左に在るときは、`startDate` ＝ b の右の日、`endDate` ＝ s とする。'
const HB_6_LEFT =
  '左の隅を合わせた境目 b が e の右の境目か、それより右に在るときは、`startDate` ＝ e、`endDate` ＝ b の左の日とする。'
const HB_6_BOTTOM_UP =
  '下の隅を合わせた境目が `topGroupId` の行の上の境目か、それより上に在るときは、`topGroupId` ＝ その境目のすぐ下の行、`bottomGroupId` ＝ 元の `topGroupId` の行とする。'
const HB_6_TOP_DOWN =
  '上の隅を合わせた境目が `bottomGroupId` の行の下の境目か、それより下に在るときは、`topGroupId` ＝ 元の `bottomGroupId` の行、`bottomGroupId` ＝ その境目のすぐ上の行とする。'
const HB_6_NORMALISE = '離した時点で `HB-2` と同じく木の順位で持ち直す'
const HB_6_EXAMPLE =
  '例: 箱の日が 5 日 〜 7 日のとき、右の隅を 9 日の左の境目で離すと 5 日 〜 8 日、8 日の左で 5 日 〜 7 日、6 日の左で 5 日 〜 5 日、5 日の左で 5 日 〜 5 日、4 日の左で 4 日 〜 5 日、3 日の左で 3 日 〜 5 日となる。'
const HB_6_WIDTHS = '幅は順に 4・3・1・1・2・3 日であり、どの幅にも届く位置が在る'

const specRowLine = (head: string): string => {
  const found = REQUIREMENTS_RAW.split(/\r?\n/).filter((line) => line.startsWith(head))
  if (found.length !== 1) throw new Error(`expected one line starting ${head}; found ${found.length}`)
  return found[0]!
}

const FR_019_TREE_ORDER = '⛔ その「下」は、行の木における順位で判ずること（MUST）。'
const FR_019_WIDTH =
  '⭐ **横は日の列で囲む** —— 箱の左端は `startDate` の日の列の左端、右端は `endDate` の日の列の右端とし、`startDate` ＝ `endDate` の箱は 1 日の幅で描くこと（MUST）。'
const FR_019_ZERO_WIDTH = '⚠️ **幅 0 で描くと、本体（表 T-023d の `GR-14`）を掴む所が消える**'

const CM_54_ROW = '| CM-54 | `HighlightBox` | `setHighlightBoxRange` |'
const CM_50_ROW = '| CM-50 | `CommentBox` | `setCommentBoxAnchor` |'
const CM_51_ROW = '| CM-51 | `CommentBox` | `setCommentBoxBodyOffsetPx` |'

const CM_54_COLUMNS = ['startDate', 'endDate', 'topGroupId', 'bottomGroupId'] as const
const CM_50_COLUMNS = ['anchorDate', 'anchorGroupId'] as const
const CM_51_COLUMNS = ['bodyOffsetPx'] as const

const t206Default = (rowId: string): string => {
  const row = specTable('T-206').rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-206 has no row ${rowId}`)
  const cell = row.by['既定']
  if (cell === undefined) throw new Error(`table T-206 has no 既定 column; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

const grabMarginPx = (): number => {
  const pointed = /`(S-\d+)`/.exec(t206Default('S-230'))
  const cell = pointed === null ? t206Default('S-230') : t206Default(pointed[1]!)
  const numbers = cell.match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`S-230 does not resolve to one number: ${cell}`)
  return Number(numbers[0])
}

const S_230 = grabMarginPx()

// WHY: `S-293` is the reach the frame keeps either side of its drawn line; the
// inside of the box is no grab margin since CR-430, so the move is on the frame.
const S_293 =((): number => {
  const cell = t206Default('S-293')
  const numbers = cell.match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`S-293 does not resolve to one number: ${cell}`)
  return Number(numbers[0])
})()

const RS_44_WORDS = ((): string => {
  const reasons = (displayWords as unknown as { reasons: { rowId: string; text: { en: string } }[] }).reasons
  const found = reasons.find((one) => one.rowId === 'RS-44')
  if (found === undefined) throw new Error('the dictionary holds no row RS-44')
  return found.text.en
})()

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const ROW_A = '3a000000-0000-4000-8000-000000000001'
const ROW_B = '3a000000-0000-4000-8000-000000000002'
const ROW_C = '3a000000-0000-4000-8000-000000000003'
const ROW_D = '3a000000-0000-4000-8000-000000000004'
const ROW_E = '3a000000-0000-4000-8000-000000000005'
const ROW_F = '3a000000-0000-4000-8000-000000000006'
const ROW_C1 = '3a000000-0000-4000-8000-000000000031'
const ROW_C2 = '3a000000-0000-4000-8000-000000000032'

const HIGHLIGHT_ID = '3b000000-0000-4000-8000-000000000001'
const COMMENT_ID = '3c000000-0000-4000-8000-000000000001'

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const PX_PER_DAY_AT_1X = 20 / DEFAULT_DISPLAY_RATIO
const TRAVEL_DAYS = 3

const group = (id: string, order: number, part: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  parentId: null,
  label: `row ${id.slice(-2)}`,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', color: null,
  height: null,
  ...part,
})

const FLAT_ROWS = [ROW_A, ROW_B, ROW_C, ROW_D, ROW_E, ROW_F].map((id, index) => group(id, index))

const FOLDED_ROWS = [
  group(ROW_A, 0),
  group(ROW_B, 1),
  group(ROW_C, 2, { treeState: 'collapsed' }),
  group(ROW_C1, 0, { parentId: ROW_C }),
  group(ROW_C2, 1, { parentId: ROW_C }),
  group(ROW_D, 3),
  group(ROW_E, 4),
  group(ROW_F, 5),
]

interface HighlightRange {
  readonly startDate: string
  readonly endDate: string
  readonly topGroupId: string
  readonly bottomGroupId: string
}

const DEFAULT_RANGE: HighlightRange = { startDate: day(6), endDate: day(16), topGroupId: ROW_B, bottomGroupId: ROW_D }

interface Fixture {
  readonly rows?: readonly Record<string, unknown>[]
  readonly range?: HighlightRange
  readonly pinned?: readonly string[]
}

function fixtureDocument(fixture: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100 },
      calendars: schedule['calendars'],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: structuredClone(fixture.rows ?? FLAT_ROWS),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [
        {
          id: COMMENT_ID,
          leaderShapeKind: 'polyline',
          text: 'Note',
          anchorDate: day(22),
          anchorGroupId: ROW_F,
          bodyOffsetPx: { dx: 60, dy: -60 },
        },
      ],
      highlightBoxes: [
        {
          id: HIGHLIGHT_ID,
          ...(fixture.range ?? DEFAULT_RANGE),
          strokeColor: null,
          cornerRadiusPx: null,
        },
      ],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
      scrollDate: '2026-04-01',
      scrollDayOffset: 0,
      scrollGroupId: ROW_A,
      scrollGroupOffset: 0,
      pinnedGroupIds: [...(fixture.pinned ?? [])],
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  noticeTexts(): readonly string[]
  lastSvg(): string
}

function stage(fixture: Fixture = {}): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  let svg = ''
  const svgSurface = {
    showSvg: (drawn: string) => {
      svg = drawn
    },
  }
  const loop = frameLoop(svgSurface as never, fixtureDocument(fixture), SCREEN, wiring)
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    noticeTexts: () => (views[views.length - 1]?.notices ?? []).map((one: Notice) => one.text),
    lastSvg: () => svg,
  }
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

function dragTo(built: Stage, from: Point, dx: number, dy: number): void {
  built.send(pointer('down', from))
  built.send(pointer('move', { x: from.x + dx / 2, y: from.y + dy / 2 }))
  built.send(pointer('move', { x: from.x + dx, y: from.y + dy }))
  built.send(pointer('up', { x: from.x + dx, y: from.y + dy }))
}

function dragBy(built: Stage, from: Point, dx: number): void {
  dragTo(built, from, dx, 0)
}

const highlightRect = (loop: FrameLoop): ScreenRect => {
  const found = frameOf(loop).geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)
  if (found === undefined) throw new Error('the frame drew no highlight box')
  return found.box
}

const commentDrawn = (loop: FrameLoop) => {
  const found = frameOf(loop).geometry.commentBoxes.find((one) => one.id === COMMENT_ID)
  if (found === undefined) throw new Error('the frame drew no comment box')
  return found
}

const drawnRow = (loop: FrameLoop, groupId: string): RowPlacement => {
  const found = frameOf(loop).layout.rows.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the frame drew no row ${groupId}`)
  return found
}

const rowsApart = (loop: FrameLoop, from: string, to: string): number => drawnRow(loop, to).y - drawnRow(loop, from).y

const storedOf = (loop: FrameLoop, list: 'highlightBoxes' | 'commentBoxes', id: string): Record<string, unknown> => {
  const boxes = (loop.document().schedule as unknown as Record<string, readonly Record<string, unknown>[]>)[list]
  const found = boxes?.find((one) => one['id'] === id)
  if (found === undefined) throw new Error(`the document has no ${list} entry ${id}`)
  return structuredClone(found)
}

const storedRange = (loop: FrameLoop): Record<string, unknown> => {
  const stored = storedOf(loop, 'highlightBoxes', HIGHLIGHT_ID)
  return Object.fromEntries(CM_54_COLUMNS.map((column) => [column, stored[column]]))
}

const changedColumns = (before: Record<string, unknown>, after: Record<string, unknown>): string[] =>
  Object.keys({ ...before, ...after }).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))

const serialDay = (stored: unknown): number => {
  const text = String(stored)
  return Date.UTC(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10))) / 86400000
}

const ROW_LETTER: Readonly<Record<string, string>> = { [ROW_A]: 'A', [ROW_B]: 'B', [ROW_C]: 'C', [ROW_D]: 'D', [ROW_E]: 'E', [ROW_F]: 'F', [ROW_C1]: 'C1', [ROW_C2]: 'C2' }

const rowLetter = (id: unknown): string => ROW_LETTER[String(id)] ?? String(id)

const expectRange = (loop: FrameLoop, expected: { start: number; end: number; top: string; bottom: string }, what: string): void => {
  const after = storedRange(loop)
  const dayZero = serialDay(day(1)) - 1
  expect(
    `${serialDay(after['startDate']) - dayZero}..${serialDay(after['endDate']) - dayZero} ${rowLetter(after['topGroupId'])}..${rowLetter(after['bottomGroupId'])}`,
    what,
  ).toBe(`${expected.start}..${expected.end} ${rowLetter(expected.top)}..${rowLetter(expected.bottom)}`)
}

const expectNoRs44 = (built: Stage, what: string): void => {
  expect(built.noticeTexts(), `${what}: RS-44 was told`).not.toContain(RS_44_WORDS)
}

type CornerName = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface Corner {
  readonly name: CornerName
  readonly at: (box: ScreenRect) => Point
  readonly inward: Point
  readonly dateColumn: 'startDate' | 'endDate'
  readonly oppositeColumns: readonly string[]
}

const CORNERS: readonly Corner[] = [
  { name: 'top-left', at: (b) => ({ x: b.x, y: b.y }), inward: { x: 1, y: 1 }, dateColumn: 'startDate', oppositeColumns: ['endDate', 'bottomGroupId'] },
  { name: 'top-right', at: (b) => ({ x: b.x + b.width, y: b.y }), inward: { x: -1, y: 1 }, dateColumn: 'endDate', oppositeColumns: ['startDate', 'bottomGroupId'] },
  { name: 'bottom-left', at: (b) => ({ x: b.x, y: b.y + b.height }), inward: { x: 1, y: -1 }, dateColumn: 'startDate', oppositeColumns: ['endDate', 'topGroupId'] },
  { name: 'bottom-right', at: (b) => ({ x: b.x + b.width, y: b.y + b.height }), inward: { x: -1, y: -1 }, dateColumn: 'endDate', oppositeColumns: ['startDate', 'topGroupId'] },
]

const cornerNamed = (name: CornerName): Corner => CORNERS.find((one) => one.name === name)!

const offsetFrom = (point: Point, direction: Point, by: number): Point => ({
  x: point.x + direction.x * by,
  y: point.y + direction.y * by,
})

// WHY: the middle of the top frame line is on the frame and clear of both corners.
const onTheFrame =(box: ScreenRect): Point => ({ x: box.x + box.width / 2, y: box.y })

// WHY: the left frame line at a chosen height lets a move start in a named row.
const onTheLeftFrame =(box: ScreenRect, y: number): Point => ({ x: box.x, y })

const justInside = (loop: FrameLoop, name: CornerName): Point => {
  const corner = cornerNamed(name)
  return offsetFrom(corner.at(highlightRect(loop)), corner.inward, S_230 / 2)
}

function releaseAt(built: Stage, press: Point, to: Point): void {
  dragTo(built, press, to.x - press.x, to.y - press.y)
}

const dayLeftX = (built: Stage, startDay: number, d: number): number =>
  highlightRect(built.loop).x + (d - startDay) * pxPerDay(built.loop)

const bandTop = (loop: FrameLoop, groupId: string): number => drawnRow(loop, groupId).y

const bandBottom = (loop: FrameLoop, groupId: string): number => {
  const row = drawnRow(loop, groupId)
  return row.y + row.height
}

const START_OF = (range: HighlightRange): number => Number(range.startDate.slice(8, 10))

function expectCornerResize(built: Stage, corner: Corner, press: Point): void {
  const before = storedOf(built.loop, 'highlightBoxes', HIGHLIGHT_ID)
  dragBy(built, press, TRAVEL_DAYS * pxPerDay(built.loop))
  const after = storedOf(built.loop, 'highlightBoxes', HIGHLIGHT_ID)
  const changed = changedColumns(before, after)
  expect(changed, `${corner.name}: the release wrote nothing to the highlight box`).not.toEqual([])
  for (const column of changed) {
    expect(CM_54_COLUMNS as readonly string[], `${corner.name}: ${column} is not a column CM-54 writes`).toContain(column)
  }
  expect(serialDay(after[corner.dateColumn]), `${corner.name}: ${corner.dateColumn} did not follow the grabbed corner`).toBeGreaterThan(
    serialDay(before[corner.dateColumn]),
  )
  for (const column of corner.oppositeColumns) {
    expect(after[column], `${corner.name}: the opposite corner's ${column} moved`).toEqual(before[column])
  }
}

function expectBodyMove(built: Stage, press: Point, what: string): void {
  const before = storedOf(built.loop, 'highlightBoxes', HIGHLIGHT_ID)
  dragBy(built, press, TRAVEL_DAYS * pxPerDay(built.loop))
  const after = storedOf(built.loop, 'highlightBoxes', HIGHLIGHT_ID)
  for (const column of changedColumns(before, after)) {
    expect(CM_54_COLUMNS as readonly string[], `${what}: ${column} is not a column CM-54 writes`).toContain(column)
  }
  expect(serialDay(after['startDate']), `${what}: startDate did not move`).toBeGreaterThan(serialDay(before['startDate']))
  expect(serialDay(after['endDate']) - serialDay(after['startDate']), `${what}: the span changed`).toBe(
    serialDay(before['endDate']) - serialDay(before['startDate']),
  )
  expect(after['topGroupId'], `${what}: topGroupId moved`).toEqual(before['topGroupId'])
  expect(after['bottomGroupId'], `${what}: bottomGroupId moved`).toEqual(before['bottomGroupId'])
}

// WHY: the inside of a highlight box holds no grab margin since CR-430, so a
// press there reaches what the box was drawn over and its columns stay put.
function expectInsidePassesThrough(built: Stage, press: Point, what: string): void {
  const before = storedOf(built.loop, 'highlightBoxes', HIGHLIGHT_ID)
  dragBy(built, press, TRAVEL_DAYS * pxPerDay(built.loop))
  const after = storedOf(built.loop, 'highlightBoxes', HIGHLIGHT_ID)
  expect(changedColumns(before, after), `${what}: the inside wrote to the highlight box`).toEqual([])
}

const drawnWidth = (range: HighlightRange): { readonly box: ScreenRect; readonly pxPerDay: number } => {
  const document = fixtureDocument({ range })
  const schedule = document.schedule as Schedule
  const settings = document.documentSettings as DocumentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  const found = geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)
  if (found === undefined) throw new Error('the geometry drew no highlight box')
  return { box: found.box, pxPerDay: layout.pxPerDay }
}

const WIDTH_SLACK = 0.05

describe('DFC-568 premises: the clauses and the fixture still read this way', () => {
  it('T-023d, T-108, AT-117..120 and IV-19 still hold the clauses verbatim', () => {
    for (const clause of [GR_14_SPLIT, HIGHLIGHT_PARTS, HIGHLIGHT_CM_54, HIGHLIGHT_COLUMNS, COMMENT_PARTS, COMMENT_COMMANDS, COMMENT_NO_CORNERS, INSIDE_PASSES_THROUGH]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    expect(GLOSSARY).toContain(CM_54_ROW)
    expect(GLOSSARY).toContain(CM_50_ROW)
    expect(GLOSSARY).toContain(CM_51_ROW)
    for (const [row, column] of [['AT-117', 'startDate'], ['AT-118', 'endDate'], ['AT-119', 'topGroupId'], ['AT-120', 'bottomGroupId'], ['AT-113', 'anchorDate'], ['AT-114', 'anchorGroupId'], ['AT-115', 'bodyOffsetPx']]) {
      expect(ERD_DETAIL).toMatch(new RegExp(`\\| ${row} \\| \`\\w+\` \\| \`${column}\` \\|`))
    }
    expect(DESIGN).toContain(IV_19)
  })

  it('T-246 HB-1..HB-3 and the FR-019 width and tree-order clauses still read verbatim', () => {
    for (const clause of [T_246_HOLDS_THE_VALUES, T_246_NO_NEW_REFUSAL, HB_3_FOLDED, FR_019_TREE_ORDER, FR_019_WIDTH, FR_019_ZERO_WIDTH]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    for (const row of [HB_1_ROW, HB_2_ROW, HB_3_ROW]) {
      expect(REQUIREMENTS_RAW).toContain(row)
    }
    for (const [row, clause] of [[HB_1_ROW, HB_1], [HB_2_ROW, HB_2], [HB_2_ROW, HB_2_TREE], [HB_3_ROW, HB_3], [HB_3_ROW, HB_3_NO_ROW]] as const) {
      expect(row).toContain(clause)
    }
    expect(RS_44_WORDS.length).toBeGreaterThan(0)
  })

  it('T-246 HB-4..HB-6 still read verbatim, each clause on its own row', () => {
    const rows: readonly (readonly [string, readonly string[]])[] = [
      [HB_4_HEAD, [HB_4_NEAREST, HB_4_TIE, HB_4_DAYS, HB_4_KEEP, HB_4_REACH]],
      [HB_5_HEAD, [HB_5_GAP, HB_5_DISTANCE, HB_5_ENDS, HB_5_TIE, HB_5_ROWS, HB_5_HORIZONTAL, HB_5_NO_REFUSAL, HB_4_REACH]],
      [HB_6_HEAD, [HB_6_RIGHT, HB_6_LEFT, HB_6_BOTTOM_UP, HB_6_TOP_DOWN, HB_6_NORMALISE, HB_6_EXAMPLE, HB_6_WIDTHS]],
    ]
    for (const [head, clauses] of rows) {
      const line = specRowLine(head)
      for (const clause of clauses) {
        expect(line, `${head} lost: ${clause}`).toContain(clause)
      }
    }
  })

  it('the bands touch (CR-384, S-12 fixed at 0), and there is room below the last row to press outside every band', () => {
    const built = stage()
    const ids = [ROW_A, ROW_B, ROW_C, ROW_D, ROW_E, ROW_F]
    for (let index = 1; index < ids.length; index += 1) {
      const gap = bandTop(built.loop, ids[index]!) - bandBottom(built.loop, ids[index - 1]!)
      expect(gap, `S-12 is fixed at 0; row ${index} is not flush against the row above it`).toBe(0)
    }
    expect(bandBottom(built.loop, ROW_F) + 4 * S_230).toBeLessThan(SCREEN.height)
    expect(highlightRect(built.loop).y).toBe(bandTop(built.loop, ROW_B))
    expect(highlightRect(built.loop).y + highlightRect(built.loop).height).toBe(bandBottom(built.loop, ROW_D))
  })

  it('S-230 and S-293 each resolve to one positive number of their own', () => {
    // WHY: S-230 pointed at `S-137` until CR-430 and carries its own figure now,
    // with the frame's reach `S-293` a separate row beside it -- one value, one role.
    expect(S_230).toBeGreaterThan(0)
    expect(S_293).toBeGreaterThan(0)
  })

  it('the highlight box is wider and taller than four margins, and the comment anchor stands two margins clear of its body', () => {
    const built = stage()
    const box = highlightRect(built.loop)
    const area = frameOf(built.loop).regions.rowArea
    const inside = (p: Point): boolean =>
      p.x - S_230 > area.x && p.x + S_230 < area.x + area.width && p.y - S_230 > area.y && p.y + S_230 < area.y + area.height
    for (const corner of CORNERS) {
      expect(inside(corner.at(box)), `the highlight ${corner.name} corner is drawn inside the row area`).toBe(true)
    }
    expect(box.width).toBeGreaterThan(4 * S_230)
    expect(box.height).toBeGreaterThan(4 * S_230)
    const drawn = commentDrawn(built.loop)
    expect(inside(drawn.anchor), 'the comment anchor is drawn inside the row area').toBe(true)
    for (const corner of CORNERS) {
      expect(inside(corner.at(drawn.body)), `the comment body ${corner.name} corner is drawn inside the row area`).toBe(true)
    }
    const gapX = Math.max(drawn.body.x - drawn.anchor.x, drawn.anchor.x - (drawn.body.x + drawn.body.width), 0)
    const gapY = Math.max(drawn.body.y - drawn.anchor.y, drawn.anchor.y - (drawn.body.y + drawn.body.height), 0)
    expect(Math.hypot(gapX, gapY)).toBeGreaterThan(2 * S_230)
    expect(box.x + box.width + 2 * S_230).toBeLessThan(Math.min(drawn.body.x, drawn.anchor.x))
  })

  it('the rows are drawn one above the other in tree order, each taller than two margins', () => {
    const built = stage()
    const ys = [ROW_A, ROW_B, ROW_C, ROW_D, ROW_E, ROW_F].map((id) => drawnRow(built.loop, id).y)
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
    for (const id of [ROW_A, ROW_B, ROW_C, ROW_D, ROW_E, ROW_F]) {
      expect(drawnRow(built.loop, id).height).toBeGreaterThan(2 * S_230)
    }
  })

  it('the folded fixture hides C1 and C2 from the screen, and the pinned fixture draws F above A', () => {
    const folded = stage({ rows: FOLDED_ROWS, range: { ...DEFAULT_RANGE, topGroupId: ROW_A, bottomGroupId: ROW_B } })
    const drawnIds = frameOf(folded.loop).layout.rows.map((one) => one.groupId)
    expect(drawnIds).not.toContain(ROW_C1)
    expect(drawnIds).not.toContain(ROW_C2)
    expect(drawnIds).toContain(ROW_D)
    const pinned = stage({ pinned: [ROW_F] })
    expect(drawnRow(pinned.loop, ROW_F).y).toBeLessThan(drawnRow(pinned.loop, ROW_A).y)
  })
})

describe('DFC-568 highlight box: the four corners resize with CM-54', () => {
  for (const corner of CORNERS) {
    it(`本体を掴めば囲む範囲を大きさを変えずに動かし、四隅を掴めば囲む範囲の大きさを変える —— どちらも \`_assets/tbl-glossary.md\` の 表 T-108 の \`CM-54\` で書くこと（MUST）。 -- the ${corner.name} corner moves only itself`, () => {
      const built = stage()
      const box = highlightRect(built.loop)
      expectCornerResize(built, corner, offsetFrom(corner.at(box), corner.inward, S_230 / 2))
    })
  }
})

describe('DFC-568 highlight box: the frame moves the range with CM-54 and keeps its size', () => {
  it('枠（枠線から内と外へ `_assets/tbl-settings.md` の 表 T-206 の `S-293`）を掴めば囲む範囲を大きさを変えずに動かし、四隅（隅から同表の `S-230`）を掴めば囲む範囲の大きさを変える —— どちらも `_assets/tbl-glossary.md` の 表 T-108 の `CM-54` で書くこと（MUST）。 -- the frame moves and the span is kept', () => {
    const built = stage()
    expectBodyMove(built, onTheFrame(highlightRect(built.loop)), 'the top frame line')
  })

  it('枠（枠線から内と外へ `_assets/tbl-settings.md` の 表 T-206 の `S-293`）を掴めば囲む範囲を大きさを変えずに動かし、四隅（隅から同表の `S-230`）を掴めば囲む範囲の大きさを変える —— どちらも `_assets/tbl-glossary.md` の 表 T-108 の `CM-54` で書くこと（MUST）。 -- S-293 inside the frame line still moves it', () => {
    const built = stage()
    const box = highlightRect(built.loop)
    expectBodyMove(built, { x: box.x + box.width / 2, y: box.y + S_293 / 2 }, 'inside the top frame line')
  })
})

describe('DFC-568 highlight box: S-230 parts a corner from the frame, and the inside answers neither', () => {
  for (const corner of CORNERS) {
    it(`⭐ 四隅（隅から同表の \`S-230\`）を掴めば囲む範囲の大きさを変える -- just outside the ${corner.name} corner, within S-230, is the corner`, () => {
      const built = stage()
      const box = highlightRect(built.loop)
      expectCornerResize(built, corner, offsetFrom(corner.at(box), corner.inward, -S_230 / 2))
    })

    it(`⛔ 囲んだ内側を掴み代にしてはならない（MUST NOT） —— 内側の押下は下のタスクへ素通しにすること（MUST）。 -- inside the box two S-230 from the ${corner.name} corner writes nothing to the box`, () => {
      const built = stage()
      const box = highlightRect(built.loop)
      expectInsidePassesThrough(
        built,
        offsetFrom(corner.at(box), corner.inward, 2 * S_230),
        `two margins in from ${corner.name}`,
      )
    })
  }
})

describe('DFC-568 T-246 HB-1: a corner shrinks the box down to one day and one row', () => {
  it(`${HB_1} -- bottom-right onto top-left keeps the start day and the top row`, () => {
    const built = stage()
    const ppd = pxPerDay(built.loop)
    dragTo(built, justInside(built.loop, 'bottom-right'), -(16 - 6) * ppd, -rowsApart(built.loop, ROW_B, ROW_D))
    expectRange(built.loop, { start: 6, end: 6, top: ROW_B, bottom: ROW_B }, 'HB-1 bottom-right')
    expectNoRs44(built, 'HB-1 bottom-right')
  })

  it(`${HB_1} -- top-left onto bottom-right keeps the end day and the bottom row`, () => {
    const built = stage()
    const ppd = pxPerDay(built.loop)
    dragTo(built, justInside(built.loop, 'top-left'), (16 - 6) * ppd, rowsApart(built.loop, ROW_B, ROW_D))
    expectRange(built.loop, { start: 16, end: 16, top: ROW_D, bottom: ROW_D }, 'HB-1 top-left')
    expectNoRs44(built, 'HB-1 top-left')
  })
})

describe('DFC-568 T-246 HB-2: a corner dragged past its opposite is swapped, not refused', () => {
  it(`${HB_6_LEFT} -- top-left released at the left boundary of day 19, three past the right edge, gives 16..18`, () => {
    const built = stage()
    dragTo(built, justInside(built.loop, 'top-left'), (16 - 6 + 3) * pxPerDay(built.loop), 0)
    expectRange(built.loop, { start: 16, end: 18, top: ROW_B, bottom: ROW_D }, 'HB-2 left past right')
    expectNoRs44(built, 'HB-2 left past right')
  })

  it(`${HB_6_RIGHT} -- bottom-right released at the left boundary of day 4, three past the left edge, gives 4..6`, () => {
    const built = stage()
    dragTo(built, justInside(built.loop, 'bottom-right'), -(16 - 6 + 3) * pxPerDay(built.loop), 0)
    expectRange(built.loop, { start: 4, end: 6, top: ROW_B, bottom: ROW_D }, 'HB-2 right past left')
  })

  it(`${HB_6_TOP_DOWN} -- top-left released in the top of row F takes the E/F boundary, so D..E`, () => {
    const built = stage()
    dragTo(built, justInside(built.loop, 'top-left'), 0, rowsApart(built.loop, ROW_B, ROW_F))
    expectRange(built.loop, { start: 6, end: 16, top: ROW_D, bottom: ROW_E }, 'HB-2 top past bottom')
    expectNoRs44(built, 'HB-2 top past bottom')
  })

  it(`${HB_2_TREE} -- bottom-left released in the bottom of a pinned row F takes the F/A boundary, so A..B`, () => {
    const built = stage({ pinned: [ROW_F] })
    dragTo(built, justInside(built.loop, 'bottom-left'), 0, rowsApart(built.loop, ROW_D, ROW_F))
    expectRange(built.loop, { start: 6, end: 16, top: ROW_A, bottom: ROW_B }, 'HB-2 onto a pinned row')
  })

  it(`${IV_19} -- the stored range still satisfies it after both axes are swapped`, () => {
    const built = stage()
    const ppd = pxPerDay(built.loop)
    dragTo(built, justInside(built.loop, 'bottom-right'), -(16 - 6 + 5) * ppd, -rowsApart(built.loop, ROW_A, ROW_D))
    const after = storedRange(built.loop)
    expect(serialDay(after['startDate'])).toBeLessThanOrEqual(serialDay(after['endDate']))
    expectRange(built.loop, { start: 2, end: 6, top: ROW_B, bottom: ROW_B }, 'HB-2 both axes')
  })

  it(`${HB_6_NORMALISE} -- bottom-left released in the top of a pinned row F drawn above is held B..F in tree order`, () => {
    const built = stage({ pinned: [ROW_F] })
    const press = justInside(built.loop, 'bottom-left')
    releaseAt(built, press, { x: press.x, y: bandTop(built.loop, ROW_F) + 2 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_B, bottom: ROW_F }, 'HB-6 then HB-2 on a pinned row')
    expectNoRs44(built, 'HB-6 then HB-2 on a pinned row')
  })
})

describe('DFC-568 T-246 HB-3: the body moves vertically by drawn rows', () => {
  it(`${HB_3} -- one drawn row down moves both edges one row`, () => {
    const built = stage()
    dragTo(built, onTheFrame(highlightRect(built.loop)), 0, rowsApart(built.loop, ROW_B, ROW_C))
    expectRange(built.loop, { start: 6, end: 16, top: ROW_C, bottom: ROW_E }, 'HB-3 one row')
    expectNoRs44(built, 'HB-3 one row')
  })

  it(`${HB_3_FOLDED} -- two drawn rows down across a folded group lands on C and D`, () => {
    const built = stage({ rows: FOLDED_ROWS, range: { ...DEFAULT_RANGE, topGroupId: ROW_A, bottomGroupId: ROW_B } })
    const inRowB = drawnRow(built.loop, ROW_B)
    const box = highlightRect(built.loop)
    dragTo(built, onTheLeftFrame(box, inRowB.y + inRowB.height / 2), 0, rowsApart(built.loop, ROW_B, ROW_D))
    expectRange(built.loop, { start: 6, end: 16, top: ROW_C, bottom: ROW_D }, 'HB-3 across the fold')
  })

  it(`${HB_3_NO_ROW} -- two drawn rows down reaches the last row and is kept`, () => {
    const built = stage()
    dragTo(built, onTheFrame(highlightRect(built.loop)), 0, 2 * rowsApart(built.loop, ROW_B, ROW_C))
    expectRange(built.loop, { start: 6, end: 16, top: ROW_D, bottom: ROW_F }, 'HB-3 to the last row')
    expectNoRs44(built, 'HB-3 to the last row')
  })

  it(`${HB_3_NO_ROW} -- three drawn rows down leaves the bottom edge with no row, so nothing moves and RS-44 is told`, () => {
    const built = stage()
    const before = storedRange(built.loop)
    dragTo(built, onTheFrame(highlightRect(built.loop)), 0, 3 * rowsApart(built.loop, ROW_B, ROW_C))
    expect(storedRange(built.loop), 'HB-3: the box moved').toEqual(before)
    expect(built.noticeTexts(), 'HB-3: RS-44 was not told').toContain(RS_44_WORDS)
  })
})

describe('DFC-568 T-246 HB-4: a corner moved sideways takes the day boundary nearest the release', () => {
  it(`${HB_4_NEAREST} -- top-right released in the left third of day 12 takes the boundary left of 12, so endDate is 11`, () => {
    const built = stage()
    const press = justInside(built.loop, 'top-right')
    releaseAt(built, press, { x: dayLeftX(built, 6, 12) + pxPerDay(built.loop) / 4, y: press.y })
    expectRange(built.loop, { start: 6, end: 11, top: ROW_B, bottom: ROW_D }, 'HB-4 right corner, left third')
    expectNoRs44(built, 'HB-4 right corner, left third')
  })

  it(`${HB_4_DAYS} -- top-left released in the left third of day 9 takes the boundary left of 9, so startDate is 9`, () => {
    const built = stage()
    const press = justInside(built.loop, 'top-left')
    releaseAt(built, press, { x: dayLeftX(built, 6, 9) + pxPerDay(built.loop) / 4, y: press.y })
    expectRange(built.loop, { start: 9, end: 16, top: ROW_B, bottom: ROW_D }, 'HB-4 left corner, left third')
  })

  it(`${HB_4_NEAREST} -- the release position, not the travel, decides: pressed inside the corner, released just short of mid day 12`, () => {
    const built = stage()
    const press = justInside(built.loop, 'bottom-right')
    releaseAt(built, press, { x: dayLeftX(built, 6, 12) + 0.45 * pxPerDay(built.loop), y: press.y })
    expectRange(built.loop, { start: 6, end: 11, top: ROW_B, bottom: ROW_D }, 'HB-4 position not amount')
  })

  it(`${HB_4_TIE} -- top-right released at the exact middle of day 12 takes the later boundary, so endDate is 12`, () => {
    const built = stage()
    const press = justInside(built.loop, 'top-right')
    releaseAt(built, press, { x: dayLeftX(built, 6, 12) + pxPerDay(built.loop) / 2, y: press.y })
    expectRange(built.loop, { start: 6, end: 12, top: ROW_B, bottom: ROW_D }, 'HB-4 tie, right corner')
  })

  it(`${HB_4_TIE} -- bottom-left released at the exact middle of day 9 takes the later boundary, so startDate is 10`, () => {
    const built = stage()
    const press = justInside(built.loop, 'bottom-left')
    releaseAt(built, press, { x: dayLeftX(built, 6, 9) + pxPerDay(built.loop) / 2, y: press.y })
    expectRange(built.loop, { start: 10, end: 16, top: ROW_B, bottom: ROW_D }, 'HB-4 tie, left corner')
  })
})

describe('DFC-568 T-246 HB-5: a corner moved vertically takes the row gap nearest the release', () => {
  it(`${HB_5_HORIZONTAL} -- top-left pressed and released in the gap above B, moved only sideways, keeps the rows and is not refused`, () => {
    const built = stage()
    const box = highlightRect(built.loop)
    const gapY = (bandBottom(built.loop, ROW_A) + bandTop(built.loop, ROW_B)) / 2
    const press = { x: box.x - 1, y: gapY }
    expect(Math.hypot(press.x - box.x, press.y - box.y), 'the press is not within S-230 of the corner').toBeLessThan(S_230)
    releaseAt(built, press, { x: dayLeftX(built, 6, 9), y: gapY })
    expectRange(built.loop, { start: 9, end: 16, top: ROW_B, bottom: ROW_D }, 'HB-5 sideways in the gap')
    expectNoRs44(built, 'HB-5 sideways in the gap')
  })

  it(`${HB_5_ROWS} -- top-left released in the upper half of row C takes the B/C gap, so C..D`, () => {
    const built = stage()
    const press = justInside(built.loop, 'top-left')
    const c = drawnRow(built.loop, ROW_C)
    releaseAt(built, press, { x: press.x, y: c.y + c.height / 4 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_C, bottom: ROW_D }, 'HB-5 upper half')
  })

  it(`${HB_5_ROWS} -- top-left released in the lower half of row C takes the C/D gap, so D..D`, () => {
    const built = stage()
    const press = justInside(built.loop, 'top-left')
    const c = drawnRow(built.loop, ROW_C)
    releaseAt(built, press, { x: press.x, y: c.y + (3 * c.height) / 4 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_D, bottom: ROW_D }, 'HB-5 lower half')
  })

  it(`${HB_5_ROWS} -- bottom-right released in the lower half of row E takes the E/F gap, so B..E`, () => {
    const built = stage()
    const press = justInside(built.loop, 'bottom-right')
    const e = drawnRow(built.loop, ROW_E)
    releaseAt(built, press, { x: press.x, y: e.y + (3 * e.height) / 4 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_B, bottom: ROW_E }, 'HB-5 bottom corner lower half')
  })

  it(`${HB_5_TIE} -- top-left released at the exact middle of row C takes the lower gap, so D..D`, () => {
    const built = stage()
    const press = justInside(built.loop, 'top-left')
    const c = drawnRow(built.loop, ROW_C)
    releaseAt(built, press, { x: press.x, y: c.y + c.height / 2 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_D, bottom: ROW_D }, 'HB-5 tie')
  })

  it(`${HB_5_ENDS} -- top-left released above the first drawn band takes the upper boundary of A`, () => {
    const built = stage()
    const press = justInside(built.loop, 'top-left')
    releaseAt(built, press, { x: press.x, y: bandTop(built.loop, ROW_A) - 2 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_A, bottom: ROW_D }, 'HB-5 above the first band')
    expectNoRs44(built, 'HB-5 above the first band')
  })

  it(`${HB_5_ENDS} -- bottom-right released well below the last drawn band takes the lower boundary of F`, () => {
    const built = stage()
    const press = justInside(built.loop, 'bottom-right')
    releaseAt(built, press, { x: press.x, y: bandBottom(built.loop, ROW_F) + 4 * S_230 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_B, bottom: ROW_F }, 'HB-5 below the last band')
    expectNoRs44(built, 'HB-5 below the last band')
  })

  it(`${HB_5_GAP} -- top-left released in the bottom of a pinned row F drawn above takes the F/A gap, so A..D`, () => {
    const built = stage({ pinned: [ROW_F] })
    const press = justInside(built.loop, 'top-left')
    releaseAt(built, press, { x: press.x, y: bandBottom(built.loop, ROW_F) - 2 })
    expectRange(built.loop, { start: 6, end: 16, top: ROW_A, bottom: ROW_D }, 'HB-5 pinned row drawn above')
    expectNoRs44(built, 'HB-5 pinned row drawn above')
  })
})

describe('DFC-568 T-246 HB-6: a corner reaching or passing the opposite edge is read as the opposite corner', () => {
  const EXAMPLE_RANGE: HighlightRange = { ...DEFAULT_RANGE, startDate: day(5), endDate: day(7) }

  for (const [boundaryDay, start, end] of [[9, 5, 8], [8, 5, 7], [6, 5, 5], [5, 5, 5], [4, 4, 5], [3, 3, 5]] as const) {
    it(`${HB_6_EXAMPLE} -- the right corner released at the left boundary of day ${boundaryDay} gives ${start}..${end}`, () => {
      const built = stage({ range: EXAMPLE_RANGE })
      const press = justInside(built.loop, 'top-right')
      releaseAt(built, press, { x: dayLeftX(built, START_OF(EXAMPLE_RANGE), boundaryDay), y: press.y })
      expectRange(built.loop, { start, end, top: ROW_B, bottom: ROW_D }, `HB-6 right corner at day ${boundaryDay}`)
      expectNoRs44(built, `HB-6 right corner at day ${boundaryDay}`)
    })
  }

  for (const [boundaryDay, start, end] of [[4, 4, 7], [5, 5, 7], [7, 7, 7], [8, 7, 7], [9, 7, 8], [10, 7, 9]] as const) {
    it(`${HB_6_LEFT} -- mirrored: the left corner released at the left boundary of day ${boundaryDay} gives ${start}..${end}`, () => {
      const built = stage({ range: EXAMPLE_RANGE })
      const press = justInside(built.loop, 'bottom-left')
      releaseAt(built, press, { x: dayLeftX(built, START_OF(EXAMPLE_RANGE), boundaryDay), y: press.y })
      expectRange(built.loop, { start, end, top: ROW_B, bottom: ROW_D }, `HB-6 left corner at day ${boundaryDay}`)
      expectNoRs44(built, `HB-6 left corner at day ${boundaryDay}`)
    })
  }

  it(`${HB_6_BOTTOM_UP} -- bottom-right released in the gap above B gives B..B, and above the first band gives A..B`, () => {
    const inGap = stage()
    const pressGap = justInside(inGap.loop, 'bottom-right')
    releaseAt(inGap, pressGap, { x: pressGap.x, y: (bandBottom(inGap.loop, ROW_A) + bandTop(inGap.loop, ROW_B)) / 2 })
    expectRange(inGap.loop, { start: 6, end: 16, top: ROW_B, bottom: ROW_B }, 'HB-6 bottom corner onto the top boundary')
    const above = stage()
    const pressAbove = justInside(above.loop, 'bottom-right')
    releaseAt(above, pressAbove, { x: pressAbove.x, y: bandTop(above.loop, ROW_A) - 2 })
    expectRange(above.loop, { start: 6, end: 16, top: ROW_A, bottom: ROW_B }, 'HB-6 bottom corner above the first band')
    expectNoRs44(above, 'HB-6 bottom corner above the first band')
  })

  it(`${HB_6_TOP_DOWN} -- top-left released in the E/F gap gives D..E, and below the last band gives D..F`, () => {
    const inGap = stage()
    const pressGap = justInside(inGap.loop, 'top-left')
    releaseAt(inGap, pressGap, { x: pressGap.x, y: (bandBottom(inGap.loop, ROW_E) + bandTop(inGap.loop, ROW_F)) / 2 })
    expectRange(inGap.loop, { start: 6, end: 16, top: ROW_D, bottom: ROW_E }, 'HB-6 top corner into the E/F gap')
    const below = stage()
    const pressBelow = justInside(below.loop, 'top-left')
    releaseAt(below, pressBelow, { x: pressBelow.x, y: bandBottom(below.loop, ROW_F) + 4 * S_230 })
    expectRange(below.loop, { start: 6, end: 16, top: ROW_D, bottom: ROW_F }, 'HB-6 top corner below the last band')
    expectNoRs44(below, 'HB-6 top corner below the last band')
  })
})

describe('DFC-568 FR-019: the box is drawn by whole day columns', () => {
  it(`${FR_019_WIDTH} -- startDate equal to endDate is one day wide`, () => {
    const drawn = drawnWidth({ ...DEFAULT_RANGE, startDate: day(10), endDate: day(10) })
    expect(drawn.pxPerDay).toBeGreaterThan(0)
    expect(Math.abs(drawn.box.width - drawn.pxPerDay)).toBeLessThanOrEqual(WIDTH_SLACK)
  })

  it(`${FR_019_WIDTH} -- one day apart is two days wide and starts at the same column`, () => {
    const single = drawnWidth({ ...DEFAULT_RANGE, startDate: day(10), endDate: day(10) })
    const pair = drawnWidth({ ...DEFAULT_RANGE, startDate: day(10), endDate: day(11) })
    const next = drawnWidth({ ...DEFAULT_RANGE, startDate: day(11), endDate: day(11) })
    expect(Math.abs(pair.box.width - 2 * pair.pxPerDay)).toBeLessThanOrEqual(WIDTH_SLACK)
    expect(Math.abs(pair.box.x - single.box.x)).toBeLessThanOrEqual(WIDTH_SLACK)
    expect(Math.abs(next.box.x - single.box.x - single.pxPerDay)).toBeLessThanOrEqual(WIDTH_SLACK)
  })
})

describe('DFC-568 comment box: no corners, body CM-51, anchor CM-50', () => {
  for (const corner of CORNERS) {
    it(`⛔ コメントボックスに四隅を持たせてはならない（MUST NOT） —— 本文の箱の大きさは \`FR-097\` が本文に合わせて決めており、文書は大きさの列を持たない（\`AT-110\` 〜 \`AT-115\`）。 -- the ${corner.name} corner of the body resizes nothing`, () => {
      const built = stage()
      const drawn = commentDrawn(built.loop)
      const before = storedOf(built.loop, 'commentBoxes', COMMENT_ID)
      const press = offsetFrom(corner.at(drawn.body), corner.inward, S_230 / 2)
      dragBy(built, press, TRAVEL_DAYS * pxPerDay(built.loop))
      const now = commentDrawn(built.loop)
      expect(now.body.width, `${corner.name}: the body width changed`).toBeCloseTo(drawn.body.width, 6)
      expect(now.body.height, `${corner.name}: the body height changed`).toBeCloseTo(drawn.body.height, 6)
      const after = storedOf(built.loop, 'commentBoxes', COMMENT_ID)
      for (const column of changedColumns(before, after)) {
        expect([...CM_50_COLUMNS, ...CM_51_COLUMNS] as readonly string[], `${corner.name}: ${column} was written`).toContain(column)
      }
    })
  }

  it('本体を掴めば `CM-51` で、アンカーを掴めば `CM-50` で書くこと（MUST）。 -- the body writes bodyOffsetPx and leaves the anchor', () => {
    const built = stage()
    const drawn = commentDrawn(built.loop)
    const before = storedOf(built.loop, 'commentBoxes', COMMENT_ID)
    dragBy(built, { x: drawn.body.x + drawn.body.width / 2, y: drawn.body.y + drawn.body.height / 2 }, TRAVEL_DAYS * pxPerDay(built.loop))
    const after = storedOf(built.loop, 'commentBoxes', COMMENT_ID)
    expect(changedColumns(before, after)).toEqual([...CM_51_COLUMNS])
  })

  for (const [label, shift] of [['on the anchor', 0], ['within S-230 of the anchor', -S_230 / 2]] as const) {
    it(`本体を掴めば \`CM-51\` で、アンカーを掴めば \`CM-50\` で書くこと（MUST）。 -- a press ${label} writes the anchor with CM-50 alone`, () => {
      const built = stage()
      const drawn = commentDrawn(built.loop)
      const before = storedOf(built.loop, 'commentBoxes', COMMENT_ID)
      dragBy(built, { x: drawn.anchor.x + shift, y: drawn.anchor.y }, TRAVEL_DAYS * pxPerDay(built.loop))
      const after = storedOf(built.loop, 'commentBoxes', COMMENT_ID)
      expect(changedColumns(before, after), 'the anchor press wrote something other than CM-50').toEqual(['anchorDate'])
      expectAnchor(built.loop, { day: ANCHOR_DAY + TRAVEL_DAYS, row: ROW_F }, `press ${label}`)
    })
  }
})

const ANCHOR_DAY = 22

const dayColumnLeft = (built: Stage, d: number): number => dayLeftX(built, START_OF(DEFAULT_RANGE), d)

const bandCentre = (loop: FrameLoop, groupId: string): number => {
  const row = drawnRow(loop, groupId)
  return row.y + row.height / 2
}

const expectAnchor = (loop: FrameLoop, expected: { day: number; row: string }, what: string): void => {
  const stored = storedOf(loop, 'commentBoxes', COMMENT_ID)
  const dayZero = serialDay(day(1)) - 1
  expect(`${serialDay(stored['anchorDate']) - dayZero} ${rowLetter(stored['anchorGroupId'])}`, what).toBe(
    `${expected.day} ${rowLetter(expected.row)}`,
  )
}

function moveAnchor(built: Stage, pressFromAnchor: Point, release: Point): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const anchor = commentDrawn(built.loop).anchor
  const before = storedOf(built.loop, 'commentBoxes', COMMENT_ID)
  releaseAt(built, { x: anchor.x + pressFromAnchor.x, y: anchor.y + pressFromAnchor.y }, release)
  return { before, after: storedOf(built.loop, 'commentBoxes', COMMENT_ID) }
}

function expectOnlyCm50(moved: { before: Record<string, unknown>; after: Record<string, unknown> }, what: string): void {
  for (const column of changedColumns(moved.before, moved.after)) {
    expect(CM_50_COLUMNS as readonly string[], `${what}: ${column} is not a column CM-50 writes`).toContain(column)
  }
}

const NEAR_RIGHT: Point = { x: 0.9 * S_230, y: 0 }
const NEAR_LEFT: Point = { x: -0.9 * S_230, y: 0 }
const DEAD_ON: Point = { x: 0, y: 0 }

function createdAnchorAt(built: Stage, at: Point): Record<string, unknown> {
  const values = frameOf(built.loop)
  const base: InputContext = {
    document: built.loop.document(),
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen: { ...emptyScreenSession.screen, armModeState: { kind: 'commentBoxArmed' } },
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: day(1),
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  }
  const down = pointer('down', at)
  const pressed = { at: down, hit: null, on: null, pressRow: pressRowOf({ at: down, hit: null }, base) }
  const answer: TranslatedInput = commandFromInput(pointer('up', at), { ...base, pressed })
  const action = answer.action
  const writes = action !== null && action.kind === 'changeDocument' ? action.writes.flat() : []
  const created = writes.filter((one) => one.kind === 'createCommentBox')
  expect(created, `AR-5 at (${at.x}, ${at.y}) created ${created.length} comment boxes`).toHaveLength(1)
  return (created[0] as unknown as Record<string, unknown>)['anchor'] as Record<string, unknown>
}

describe('DFC-568 JDG-72 premises: the anchor clauses read verbatim', () => {
  it('GR-14, FR-019 and T-221 LF-15 still hold the anchor clauses', () => {
    for (const clause of [ANCHOR_READ, ANCHOR_SAME_AS_PLACING, ANCHOR_NO_ROW, ANCHOR_NOT_NEAREST, ANCHOR_HORIZONTAL, FR_019_BODY_OFFSET, FR_019_POINT_IS_LF_15, FR_019_LEADER]) {
      expect(REQUIREMENTS, 'the requirements lost a clause').toContain(clause)
    }
    const lf15 = DESIGN.split('\n').filter((line) => line.startsWith('| LF-15 |'))
    expect(lf15).toHaveLength(1)
    expect(lf15[0]).toContain(LF_15)
    expect(lf15[0]).toContain(LF_15_BODY_FOLLOWS)
  })

  it('in the fixture S-230 is narrower than half a day column and half a row band, and the anchor sits on day 22 of row F', () => {
    const built = stage()
    expect(S_230).toBeLessThan(pxPerDay(built.loop) / 2)
    for (const id of [ROW_A, ROW_B, ROW_C, ROW_D, ROW_E, ROW_F]) {
      expect(S_230, `row ${rowLetter(id)}`).toBeLessThan(drawnRow(built.loop, id).height / 2)
    }
    expectAnchor(built.loop, { day: ANCHOR_DAY, row: ROW_F }, 'fixture')
    expect(Math.abs(dayColumnLeft(built, 7) - dayColumnLeft(built, 6) - pxPerDay(built.loop))).toBeLessThanOrEqual(WIDTH_SLACK)
  })
})

describe('DFC-568 T-221 LF-15: the anchor is drawn at the day column centre and the band centre', () => {
  it(`${LF_15} -- day 22 of row F`, () => {
    const built = stage()
    const anchor = commentDrawn(built.loop).anchor
    expect(anchor.x, 'the anchor is not at the centre of the day 22 column').toBeCloseTo(dayColumnLeft(built, ANCHOR_DAY) + pxPerDay(built.loop) / 2, 1)
    expect(anchor.y, 'the anchor is not at the centre of the row F band').toBeCloseTo(bandCentre(built.loop, ROW_F), 1)
  })

  it(`${LF_15} -- a pinned row F is drawn in the LF-14 band, and the anchor follows it`, () => {
    const built = stage({ pinned: [ROW_F] })
    const anchor = commentDrawn(built.loop).anchor
    expect(anchor.y).toBeCloseTo(bandCentre(built.loop, ROW_F), 1)
    expect(anchor.x).toBeCloseTo(dayColumnLeft(built, ANCHOR_DAY) + pxPerDay(built.loop) / 2, 1)
  })
})

describe('DFC-568 FR-019: the body and the leader stand on the drawn anchor', () => {
  it(`${FR_019_BODY_OFFSET} -- the body's bottom-left is the anchor plus bodyOffsetPx`, () => {
    const built = stage()
    const drawn = commentDrawn(built.loop)
    expect(drawn.body.x).toBeCloseTo(drawn.anchor.x + 60, 1)
    expect(drawn.body.y + drawn.body.height).toBeCloseTo(drawn.anchor.y - 60, 1)
  })

  it(`${LF_15_BODY_FOLLOWS} -- after the anchor moves, the body keeps the same offset from the new anchor`, () => {
    const built = stage()
    const moved = moveAnchor(built, DEAD_ON, { x: dayColumnLeft(built, 25) + pxPerDay(built.loop) / 2, y: bandCentre(built.loop, ROW_C) })
    expect(moved.after['bodyOffsetPx']).toEqual(moved.before['bodyOffsetPx'])
    const drawn = commentDrawn(built.loop)
    expect(drawn.anchor.x).toBeCloseTo(dayColumnLeft(built, 25) + pxPerDay(built.loop) / 2, 1)
    expect(drawn.body.x).toBeCloseTo(drawn.anchor.x + 60, 1)
    expect(drawn.body.y + drawn.body.height).toBeCloseTo(drawn.anchor.y - 60, 1)
  })

  it(`${FR_019_LEADER} -- one line from the pinned point to the body's bottom-left, in the drawn picture`, () => {
    const built = stage()
    const svg = built.lastSvg()
    const key = `data-figure="comment-${COMMENT_ID}-leader"`
    const lines = [...svg.matchAll(/<([a-z]+)\s([^>]*?)\/>/g)].filter((hit) => (hit[2] ?? '').includes(key))
    expect(lines.map((hit) => hit[1]), 'the picture draws no single leader line').toEqual(['line'])
    const attrs = lines[0]![2]!
    const num = (name: string): number => Number.parseFloat(new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1] ?? 'NaN')
    const body = new RegExp(`<rect x="([\\d.-]+)" y="([\\d.-]+)" width="([\\d.-]+)" height="([\\d.-]+)"[^>]*data-figure="comment-${COMMENT_ID}"`).exec(svg)
    expect(body, 'the picture draws no comment body').not.toBeNull()
    const left = Number(body![1])
    const bottom = Number(body![2]) + Number(body![4])
    const ends = [
      [num('x1'), num('y1')],
      [num('x2'), num('y2')],
    ].sort((a, b) => a[0]! - b[0]!)
    // STEP: the pinned point is the body's bottom-left minus bodyOffsetPx, in the picture's own space
    expect(ends[0]![0]).toBeCloseTo(left - 60, 1)
    expect(ends[0]![1]).toBeCloseTo(bottom + 60, 1)
    expect(ends[1]![0]).toBeCloseTo(left, 1)
    expect(ends[1]![1]).toBeCloseTo(bottom, 1)
  })
})

describe('DFC-568 JDG-72: a moved anchor is read where it is released, not by the travel', () => {
  it(`${ANCHOR_SAME_AS_PLACING} -- pressed right of the anchor, released in the left third of day 25, pins day 25`, () => {
    const built = stage()
    const moved = moveAnchor(built, NEAR_RIGHT, { x: dayColumnLeft(built, 25) + 0.1 * pxPerDay(built.loop), y: bandCentre(built.loop, ROW_F) })
    expectAnchor(built.loop, { day: 25, row: ROW_F }, 'left third of day 25')
    expectOnlyCm50(moved, 'left third of day 25')
    expectNoRs44(built, 'left third of day 25')
  })

  it(`${ANCHOR_NOT_NEAREST} -- pressed left of the anchor, released on the right side of day 25, pins day 25, not the nearer boundary's day 26`, () => {
    const built = stage()
    const moved = moveAnchor(built, NEAR_LEFT, { x: dayColumnLeft(built, 25) + 0.9 * pxPerDay(built.loop), y: bandCentre(built.loop, ROW_F) })
    expectAnchor(built.loop, { day: 25, row: ROW_F }, 'right side of day 25')
    expectOnlyCm50(moved, 'right side of day 25')
  })

  it(`${ANCHOR_NOT_NEAREST} -- pressed left of the drawn anchor within S-230 and released without moving keeps day 22`, () => {
    const built = stage()
    const anchor = commentDrawn(built.loop).anchor
    const press = { x: anchor.x + NEAR_LEFT.x, y: anchor.y }
    const moved = moveAnchor(built, NEAR_LEFT, press)
    expect(moved.after, 'a release in place changed the comment box').toEqual(moved.before)
    expectAnchor(built.loop, { day: ANCHOR_DAY, row: ROW_F }, 'release in place')
    expectNoRs44(built, 'release in place')
  })

  it(`${ANCHOR_READ} -- released straight up in row C pins row C and keeps day 22`, () => {
    const built = stage()
    const anchor = commentDrawn(built.loop).anchor
    const moved = moveAnchor(built, DEAD_ON, { x: anchor.x, y: bandCentre(built.loop, ROW_C) })
    expectAnchor(built.loop, { day: ANCHOR_DAY, row: ROW_C }, 'row C')
    expectOnlyCm50(moved, 'row C')
    expectNoRs44(built, 'row C')
  })

  it(`${ANCHOR_HORIZONTAL} -- pressed below the anchor within S-230 and moved only sideways keeps row F`, () => {
    const built = stage()
    const press: Point = { x: 0, y: 0.9 * S_230 }
    const anchor = commentDrawn(built.loop).anchor
    releaseAt(built, { x: anchor.x, y: anchor.y + press.y }, { x: dayColumnLeft(built, 25) + pxPerDay(built.loop) / 2, y: anchor.y + press.y })
    expectAnchor(built.loop, { day: 25, row: ROW_F }, 'sideways only')
    expectNoRs44(built, 'sideways only')
  })

  it(`${ANCHOR_READ} -- released in a pinned row A drawn at the top pins row A`, () => {
    const built = stage({ pinned: [ROW_A] })
    const anchor = commentDrawn(built.loop).anchor
    moveAnchor(built, DEAD_ON, { x: anchor.x, y: bandCentre(built.loop, ROW_A) })
    expectAnchor(built.loop, { day: ANCHOR_DAY, row: ROW_A }, 'pinned row A')
    expectNoRs44(built, 'pinned row A')
  })
})

describe('DFC-568 JDG-72: no drawn row under the release writes nothing and tells RS-44', () => {
  it(`${ANCHOR_NO_ROW} -- released below every drawn band`, () => {
    const built = stage()
    const moved = moveAnchor(built, DEAD_ON, { x: dayColumnLeft(built, 25) + pxPerDay(built.loop) / 2, y: bandBottom(built.loop, ROW_F) + 4 * S_230 })
    expect(moved.after, 'the release below the rows moved the anchor').toEqual(moved.before)
    expect(built.noticeTexts(), 'RS-44 was not told').toContain(RS_44_WORDS)
  })
})

describe('DFC-568 JDG-72: placing and moving read the same place for the same point', () => {
  for (const [label, fraction] of [['left third', 0.1], ['right side', 0.9]] as const) {
    it(`${ANCHOR_SAME_AS_PLACING} -- the ${label} of day 25 in row A`, () => {
      const placed = stage()
      const at: Point = { x: dayColumnLeft(placed, 25) + fraction * pxPerDay(placed.loop), y: bandCentre(placed.loop, ROW_A) }
      const created = createdAnchorAt(placed, at)
      const moving = stage()
      moveAnchor(moving, DEAD_ON, at)
      const stored = storedOf(moving.loop, 'commentBoxes', COMMENT_ID)
      // STEP: the created anchor and the moved anchor name the same day and row
      expect(`${String(created['date']).slice(0, 10)} ${rowLetter(created['groupId'])}`).toBe(
        `${String(stored['anchorDate']).slice(0, 10)} ${rowLetter(stored['anchorGroupId'])}`,
      )
      expect(String(stored['anchorDate']).slice(0, 10)).toBe(day(25).slice(0, 10))
    })
  }
})
