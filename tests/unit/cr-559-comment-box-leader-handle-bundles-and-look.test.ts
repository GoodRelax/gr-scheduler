// CR-559: comment box bundles, the anchor handle, the LF-17 corner and the five look columns.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { HumanInput, PointerInput, PointerPhase } from '../../src/adapter/input-command-translator/input-command-translator'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type { Notice, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  leaderOf,
  type CommentGeometry,
  type Point,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { pointerImageOf, pointerRowOf } from '../../src/framework/single-html-shell/pointer-shape'
import { editAnnotation } from '../../src/use-case/edit-document/edit-annotation'
import { specTable, unbroken } from '../contract/spec-table'
import { boxOfBar } from './cr-430-bench'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8').replace(/\r\n/g, '\n'))
const GLOSSARY = readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8').replace(/\r\n/g, '\n')

// see T-023d
const BODY_OR_LEADER_MOVES_BOTH =
  '⭐ 本体（本文の箱の全体）か引出し線（線から左右へ同表の `S-291`）を掴んで引いたときは、本文の箱と線先を一緒に動かすこと（MUST） —— 本文の箱は引いた量だけ動かし、線先は、押したときに描いていた線先の点を引いた量だけずらした点で読む（読み方は下の「線先は離した位置で読む」と同じ）。'
const ONE_BUNDLE =
  'その 2 つは、`_assets/tbl-glossary.md` の 表 T-108 の `CM-50`（線先）と `CM-51`（ずれ）を 1 つの束にして書くこと（MUST） —— `CM-51` のずれは、置き直した線先を描く点（`05-07-design.md` の 表 T-221 の `LF-15`）から、動かした本文の箱の左下隅までとする。'
const ANCHOR_STEPS_BY_HALVES =
  '⚠️ 線先は日の列の中央と行の帯の中央に立つので、線先の動く量は、引いた量から日の列と行の帯の半分まで離れることがある —— 本文の箱は引いた量のとおりに動く。'
const BODY_NO_ROW =
  'ずらした点の下に描かれた行が無いときは、どちらも動かさず、表 T-233 の `RS-44` を告げる —— 表 T-246 の `HB-3` と同じ扱いである。'
const ANCHOR_MOVES_ALONE =
  '⭐ 線先（線先から同表の `S-292`）を掴んで引いたときは、線先だけを動かし、本文の箱を画面の上で動かさないこと（MUST） —— `CM-50` で線先を、`CM-51` で、置き直した線先を描く点から押したときの本文の箱の左下隅までのずれを、1 つの束にして書く。'
const ONE_UNDO = '⭐ どちらも 1 つの束なので、1 度の取り消し（`FR-031`）で 2 つとも戻る。'
const HANDLE_WHILE_SELECTED =
  '⭐ コメントボックスを選んでいるあいだ（表 T-023c の `SL-8`）は、線先に四角の印を描き、線先を掴めることを示すこと（MUST）。'
const HANDLE_SHAPE =
  '印は、線先の点を中心とする一辺 `_assets/tbl-settings.md` の 表 T-206 の `S-376` の正方形とし、中を同書の 表 T-236 の `S-146`、縁を同表の `S-151` で、縁の太さを 表 T-206 の `S-174` で描くこと（MUST）。'
const HANDLE_NOT_SCALED = '⛔ 印に倍率を掛けてはならない（MUST NOT） —— 印が示す掴み代 `S-292` は画面の px である。'
const HANDLE_AT_ZO_10 = '重ね順は 表 T-020 の `ZO-10` とする —— 線先が本文の箱の中やタスクの上に在っても、印は隠れない。'
const NO_HANDLE_UNSELECTED = '⛔ 選んでいないコメントボックスの線先に印を描いてはならない（MUST NOT）'
const HANDLE_KEEPS_THE_REACH = '⚠️ 印は見せ方だけであり、掴み代を変えない —— 線先は、選んでいてもいなくても `S-292` で応える。'
const BODY_DOES_NOT_PASS_THROUGH =
  '⛔ 本文の箱の中を素通しにしてはならない（MUST NOT） —— 箱の中は、塗りの透過率（`_assets/fig-erd-detail.md` の `AT-151`、`FR-019`）によらず本体として応える。'
// see FR-106
const FR_106_ANCHOR =
  '⭐ コメントボックスの線先の掴み代（表 T-023d の `GR-14`、`_assets/tbl-settings.md` の 表 T-206 の `S-292`）では、表 T-269 の `PK-11` とすること（MUST）'
// see FR-019
const LEADER_ONE_CORNER =
  '⭐ 描き方はこうである（MUST）: 留めた点と、本文の箱の 4 隅のうち `05-07-design.md` の 表 T-221 の `LF-17` が選ぶ 1 隅とを、1 本の線で結ぶこと。'
const NULLS_DRAW_DEFAULTS =
  '⭐ 太さと透過率の列が `null` のときは 表 T-217 の同じ列の既定で、色の 3 列が `null` のときは、線を注記の色（`_assets/tbl-settings.md` の 表 T-236 の `S-312`）、塗りを地の色（同表の `S-146`）、字を文字の色（同表の `S-147`）で描くこと（MUST） —— 5 列がすべて `null` の箱は、列を足す前と同じ絵になる。'
const PLACED_WITH_NULLS = '⭐ 置くとき（`_assets/tbl-glossary.md` の 表 T-108 の `CM-46`）は 5 列を `null` とすること（MUST）'
const ONE_COLOUR_ONE_WIDTH = '⭐ 枠と引出し線は 1 つの色と 1 つの太さで描く'
const WIDTH_NOT_SCALED = '⛔ 線の太さに倍率を掛けてはならない（MUST NOT）'
const FILL_RULE =
  '⭐ `CommentBox.fillColor`（`AT-150`）は、本文の箱の中を、その色の塗りの値で、不透明度を 1 − `AT-151` ÷ 100 として塗ること（MUST）'
const STROKE_RULE = '⭐ `CommentBox.strokeColor`（`AT-148`）は、本文の箱の枠と引出し線を、その色の縁の値で描くこと（MUST）'
const TEXT_RULE = '⭐ `CommentBox.textColor`（`AT-152`）は、本文の字を、その色の縁の値で描くこと（MUST）'
const FILL_ONLY = '透過率は塗りにだけ掛け、枠・引出し線・字には掛けない。'
const NO_TRANSPARENT_LINE_OR_TEXT = '⛔ コメントボックスの線の色と字の色に透明を選ばせてはならない（MUST NOT）'
const FILL_MAY_BE_TRANSPARENT = '塗りには透明を選ばせてよい。'
const CLAMPED_NOT_REWRITTEN = '範囲へ寄せて描き、文書を書き換えないこと（MUST）'
const OUT_OF_RANGE_REFUSED =
  '⭐ 同じ範囲の外の値を置く命令（表 T-108 の `CM-77` ・ `CM-79` ・ `CM-81` ・ `CM-83`）は拒むこと（MUST）'
// see LF-17
const LF_17_SIDE = '横は、留めた点（`LF-15`）が本文の箱の横の中点より右に在れば右、そうでなければ左の隅とする。'
const LF_17_UPDOWN = '縦は、留めた点が箱の縦の中点より上に在れば上、そうでなければ下の隅とする。'
const LF_17_TIE = '⭐ 中点に等しいときは左と下を採る'
const LF_17_INSIDE = '⭐ 留めた点が本文の箱の中（縁を含む）に在るときは、引出し線を描かない'
const LF_17_HANDLE_INSIDE = '⚠️ 線先の印（同書の 表 T-023d の結び）はそのときも描く'
const MISSING_COLUMNS_READ_AS_NULL =
  '`AT-148` 〜 `AT-152` の列を持たない `CommentBox` の項には、その列を `null` として足して読むこと（MUST）'
const WHATEVER_THE_VERSION = '⭐ 形式の版（`FR-073`）によらずに足す'
const SILENTLY = '足したことを通知してはならない（MUST NOT）'

const CM_ROWS = [
  ['CM-80', 'setCommentBoxStrokeColor'],
  ['CM-81', 'setCommentBoxStrokeWidth'],
  ['CM-82', 'setCommentBoxFillColor'],
  ['CM-83', 'setCommentBoxFillTransparency'],
  ['CM-84', 'setCommentBoxTextColor'],
] as const

const cellOf = (table: string, row: string, heading: string): string => {
  const found = specTable(table).rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table ${table} has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no column ${heading}`)
  return cell
}

const oneNumberIn = (cell: string, what: string): number => {
  const numbers = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`${what} does not hold one number: ${cell}`)
  return Number(numbers[0])
}

const t206 = (row: string): number => oneNumberIn(cellOf('T-206', row, '既定'), row)
const S_291 = t206('S-291')
const S_292 = t206('S-292')
const S_376 = t206('S-376')
const S_174 = t206('S-174')

interface Bounds {
  readonly fallback: number
  readonly low: number
  readonly high: number
}

const t217 = (row: string): Bounds => ({
  fallback: oneNumberIn(cellOf('T-217', row, '既定'), `${row} 既定`),
  low: oneNumberIn(cellOf('T-217', row, '下限'), `${row} 下限`),
  high: oneNumberIn(cellOf('T-217', row, '上限'), `${row} 上限`),
})
const S_374 = t217('S-374')
const S_375 = t217('S-375')

// WHY: a palette name is drawn with the value table T-294 holds for it, in whichever theme is drawn (CV-6).
const paletteValues = (spelling: string, kind: '塗り' | '縁'): readonly string[] => {
  const row = specTable('T-294').rows.find((one) => one.by['保存する綴り'] === `\`${spelling}\``)
  if (row === undefined) throw new Error(`table T-294 has no spelling ${spelling}`)
  return [row.by[`明るいテーマの${kind}`] ?? '', row.by[`暗いテーマの${kind}`] ?? ''].map((one) => one.replace(/`/g, '').toLowerCase())
}

// WHY: a T-236 colour may carry the theme hue H, so it is read as a pattern with H any whole number.
const themeColourPattern = (row: string): RegExp => {
  const cells = [cellOf('T-236', row, '明るいテーマ'), cellOf('T-236', row, '暗いテーマ')].map((one) =>
    one.replace(/`/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\bH\b/, '\\d+(?:\\.\\d+)?'),
  )
  return new RegExp(`^(?:${cells.join('|')})$`, 'i')
}

const environmentShapeOf = (pk: string): string => {
  const found = /`([a-z-]+)`/.exec(cellOf('T-269', pk, '形'))
  if (found === null) throw new Error(`table T-269 row ${pk} names no environment shape`)
  return found[1] ?? ''
}

const RS_44_WORDS = ((): string => {
  const reasons = (displayWords as unknown as { reasons: { rowId: string; text: { en: string } }[] }).reasons
  const found = reasons.find((one) => one.rowId === 'RS-44')
  if (found === undefined) throw new Error('the dictionary holds no row RS-44')
  return found.text.en
})()

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
type Letter = (typeof LETTERS)[number]
const ROW: Readonly<Record<Letter, string>> = Object.fromEntries(
  LETTERS.map((letter, index) => [letter, `3a000000-0000-4000-8000-00000000000${String(index + 1)}`]),
) as Record<Letter, string>
const LETTER_OF: Readonly<Record<string, string>> = Object.fromEntries(LETTERS.map((letter) => [ROW[letter], letter]))

const NOTE_ID = '3c000000-0000-4000-8000-000000000001'
const OTHER_NOTE_ID = '3c000000-0000-4000-8000-000000000002'

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`
const dayOf = (stored: unknown): number => Number(String(stored).slice(8, 10))
const PX_PER_DAY_AT_1X = 20 / DEFAULT_DISPLAY_RATIO

const ANCHOR_DAY = 10
const ANCHOR_ROW: Letter = 'E'

interface NoteSpec {
  readonly id?: string
  readonly anchorDay?: number
  readonly anchorRow?: Letter
  readonly dx?: number
  readonly dy?: number
  readonly text?: string
  readonly strokeColor?: string | null
  readonly strokeWidthPx?: number | null
  readonly fillColor?: string | null
  readonly fillTransparencyPercent?: number | null
  readonly textColor?: string | null
}

interface Fixture {
  readonly notes?: readonly NoteSpec[]
  readonly withTasks?: boolean
  readonly zoomFactor?: number
}

const noteRecord = (spec: NoteSpec): Record<string, unknown> => ({
  id: spec.id ?? NOTE_ID,
  leaderShapeKind: 'polyline',
  text: spec.text ?? 'Note',
  anchorDate: day(spec.anchorDay ?? ANCHOR_DAY),
  anchorGroupId: ROW[spec.anchorRow ?? ANCHOR_ROW],
  bodyOffsetPx: { dx: spec.dx ?? 60, dy: spec.dy ?? -60 },
  strokeColor: spec.strokeColor ?? null,
  strokeWidthPx: spec.strokeWidthPx ?? null,
  fillColor: spec.fillColor ?? null,
  fillTransparencyPercent: spec.fillTransparencyPercent ?? null,
  textColor: spec.textColor ?? null,
})

// WHY: one plain Task per row from day 2 to day 28, so every band has a drawn shape under the note.
const taskOf = (uid: number): Record<string, unknown> => ({
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: null,
  start: day(2),
  finish: day(28),
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
  dependencies: [],
  carry: {},
  carryElements: [],
})

function fixtureDocument(fixture: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  const withTasks = fixture.withTasks === true
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100 },
      calendars: schedule['calendars'],
      tasks: withTasks ? LETTERS.map((_, index) => taskOf(index + 1)) : [],
      resources: [],
      assignments: [],
      taskGroups: LETTERS.map((letter, order) => ({
        id: ROW[letter],
        parentId: null,
        label: `row ${letter}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: withTasks ? LETTERS.map((letter, index) => ({ taskUid: index + 1, groupId: ROW[letter] })) : [],
      taskVisuals: [],
      commentBoxes: (fixture.notes ?? [{}]).map(noteRecord),
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      zoomX: (PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x) * (fixture.zoomFactor ?? 1),
      scrollDate: '2026-04-01',
      scrollDayOffset: 0,
      scrollGroupId: ROW.A,
      scrollGroupOffset: 0,
      pinnedGroupIds: [],
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

function stageOf(document: Document): Stage {
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
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  let svg = ''
  const loop = frameLoop({ showSvg: (drawn: string) => void (svg = drawn) } as never, document, SCREEN, wiring)
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

const stage = (fixture: Fixture = {}): Stage => stageOf(fixtureDocument(fixture))

const NO_MODIFIERS = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const undo = (built: Stage): void => built.send({ kind: 'key', key: 'Z', modifiers: { ...NO_MODIFIERS, ctrl: true } })

const valuesOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const drawnNote = (loop: FrameLoop, id: string = NOTE_ID): CommentGeometry => {
  const found = valuesOf(loop).geometry.commentBoxes.find((one) => one.id === id)
  if (found === undefined) throw new Error(`the frame drew no comment box ${id}`)
  return found
}

const rowBand = (loop: FrameLoop, letter: Letter): { readonly y: number; readonly height: number } => {
  const found = valuesOf(loop).layout.rows.find((one) => one.groupId === ROW[letter])
  if (found === undefined) throw new Error(`the frame drew no row ${letter}`)
  return found
}

const rowStep = (loop: FrameLoop): number => rowBand(loop, 'D').y - rowBand(loop, 'C').y
const pxPerDay = (loop: FrameLoop): number => valuesOf(loop).layout.pxPerDay

const hitAt = (loop: FrameLoop, at: Point): Hit | null => itemAtPointer(valuesOf(loop).geometry, at.x, at.y, grabSizesOf())

const storedNote = (loop: FrameLoop, id: string = NOTE_ID): Record<string, unknown> => {
  const found = (loop.document().schedule.commentBoxes as unknown as readonly Record<string, unknown>[]).find(
    (one) => one['id'] === id,
  )
  if (found === undefined) throw new Error(`the document has no comment box ${id}`)
  return structuredClone(found)
}

const anchorText = (loop: FrameLoop): string => {
  const stored = storedNote(loop)
  return `${dayOf(stored['anchorDate'])} ${LETTER_OF[String(stored['anchorGroupId'])] ?? String(stored['anchorGroupId'])}`
}

function drag(built: Stage, from: Point, dx: number, dy: number): void {
  built.send(pointer('down', from))
  built.send(pointer('move', { x: from.x + dx / 2, y: from.y + dy / 2 }))
  built.send(pointer('move', { x: from.x + dx, y: from.y + dy }))
  built.send(pointer('up', { x: from.x + dx, y: from.y + dy }))
}

function dragInSteps(built: Stage, from: Point, dx: number, dy: number, steps: number): void {
  built.send(pointer('down', from))
  for (let step = 1; step <= steps; step += 1) {
    built.send(pointer('move', { x: from.x + (dx * step) / steps, y: from.y + (dy * step) / steps }))
  }
  built.send(pointer('up', { x: from.x + dx, y: from.y + dy }))
}

function click(built: Stage, at: Point): void {
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

const centreOf = (box: ScreenRect): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

interface Tag {
  readonly text: string
  readonly at: number
}

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const tagsOf = (svg: string, element: string, figure: RegExp): readonly Tag[] =>
  [...svg.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))]
    .filter((one) => figure.test(/data-figure="([^"]*)"/.exec(one[0])?.[1] ?? ''))
    .map((one) => ({ text: one[0], at: one.index ?? 0 }))

const attributeOf = (tag: string, name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null
const numberAttribute = (tag: string, name: string): number => Number(attributeOf(tag, name) ?? Number.NaN)

// WHY: the layer an element sits in is the last data-zo opened before it in the drawn text.
const layerOf = (svg: string, at: number): string | null => {
  const opened = [...svg.slice(0, at).matchAll(/data-zo="([^"]+)"/g)]
  return opened.length === 0 ? null : (opened[opened.length - 1]![1] ?? null)
}

const BODY_FIGURE = (id: string = NOTE_ID): RegExp => new RegExp(`^comment-${escaped(id)}$`)
const LEADER_FIGURE = (id: string = NOTE_ID): RegExp => new RegExp(`^comment-${escaped(id)}-leader$`)
const LINE_FIGURE = (id: string = NOTE_ID): RegExp => new RegExp(`^comment-${escaped(id)}-line-\\d+$`)
const HANDLE_FIGURE = (id: string = NOTE_ID): RegExp => new RegExp(`^comment-${escaped(id)}-handle$`)

const bodyTag = (svg: string, id: string = NOTE_ID): string => {
  const found = tagsOf(svg, 'rect', BODY_FIGURE(id))
  expect(found, 'the picture draws one comment body').toHaveLength(1)
  return found[0]!.text
}

const leaderTags = (svg: string, id: string = NOTE_ID): readonly Tag[] => tagsOf(svg, 'line', LEADER_FIGURE(id))

const endsOf = (tag: string): readonly Point[] => [
  { x: numberAttribute(tag, 'x1'), y: numberAttribute(tag, 'y1') },
  { x: numberAttribute(tag, 'x2'), y: numberAttribute(tag, 'y2') },
]

const near = (a: Point, b: Point, within = 0.05): boolean => Math.abs(a.x - b.x) <= within && Math.abs(a.y - b.y) <= within

const CORNERS = {
  'top-left': (b: ScreenRect): Point => ({ x: b.x, y: b.y }),
  'top-right': (b: ScreenRect): Point => ({ x: b.x + b.width, y: b.y }),
  'bottom-left': (b: ScreenRect): Point => ({ x: b.x, y: b.y + b.height }),
  'bottom-right': (b: ScreenRect): Point => ({ x: b.x + b.width, y: b.y + b.height }),
} as const
type CornerName = keyof typeof CORNERS

// WHY: the leader joins two points; the order it lists them in is not the specification's.
const expectJoins = (ends: readonly Point[] | null, anchor: Point, corner: Point, what: string): void => {
  expect(ends, `${what}: no leader`).not.toBeNull()
  expect(ends!.length, `${what}: the leader is not one straight line`).toBe(2)
  const [a, b] = ends!
  const joins = (near(a!, anchor) && near(b!, corner)) || (near(a!, corner) && near(b!, anchor))
  expect(joins, `${what}: the leader joins (${a!.x}, ${a!.y}) and (${b!.x}, ${b!.y}), not the anchor and the corner`).toBe(true)
}

describe('CR-559 premises: the clauses these cases read, and the fixture they stand on', () => {
  it('T-023d, FR-106 and FR-019 still say it, word for word', () => {
    for (const clause of [
      BODY_OR_LEADER_MOVES_BOTH,
      ONE_BUNDLE,
      ANCHOR_STEPS_BY_HALVES,
      BODY_NO_ROW,
      ANCHOR_MOVES_ALONE,
      ONE_UNDO,
      HANDLE_WHILE_SELECTED,
      HANDLE_SHAPE,
      HANDLE_NOT_SCALED,
      HANDLE_AT_ZO_10,
      NO_HANDLE_UNSELECTED,
      HANDLE_KEEPS_THE_REACH,
      BODY_DOES_NOT_PASS_THROUGH,
      FR_106_ANCHOR,
      LEADER_ONE_CORNER,
      NULLS_DRAW_DEFAULTS,
      PLACED_WITH_NULLS,
      ONE_COLOUR_ONE_WIDTH,
      WIDTH_NOT_SCALED,
      FILL_RULE,
      STROKE_RULE,
      TEXT_RULE,
      FILL_ONLY,
      NO_TRANSPARENT_LINE_OR_TEXT,
      FILL_MAY_BE_TRANSPARENT,
      CLAMPED_NOT_REWRITTEN,
      OUT_OF_RANGE_REFUSED,
    ]) {
      expect(REQUIREMENTS, 'the requirements lost a clause').toContain(clause)
    }
  })

  it('T-221 LF-17 and the loader paragraph of 05-07-design still say it, word for word', () => {
    const lf17 = DESIGN.split('\n').filter((line) => line.startsWith('| LF-17 |'))
    expect(lf17).toHaveLength(1)
    for (const clause of [LF_17_SIDE, LF_17_UPDOWN, LF_17_TIE, LF_17_INSIDE, LF_17_HANDLE_INSIDE]) {
      expect(lf17[0], 'LF-17 lost a clause').toContain(clause)
    }
    for (const clause of [MISSING_COLUMNS_READ_AS_NULL, WHATEVER_THE_VERSION, SILENTLY]) {
      expect(DESIGN, 'the design lost a clause').toContain(clause)
    }
  })

  it('T-108 holds CM-80 .. CM-84 on CommentBox, and T-206 / T-217 give every value one number', () => {
    for (const [row, name] of CM_ROWS) {
      expect(GLOSSARY).toContain(`| ${row} | \`CommentBox\` | \`${name}\` |`)
    }
    for (const value of [S_291, S_292, S_376, S_174]) expect(value).toBeGreaterThan(0)
    expect(S_376, 'S-376 fits inside the S-292 reach').toBeLessThanOrEqual(2 * S_292)
    expect(S_374.low).toBeLessThanOrEqual(S_374.fallback)
    expect(S_374.fallback).toBeLessThanOrEqual(S_374.high)
    expect(S_375.low).toBeLessThanOrEqual(S_375.fallback)
    expect(S_375.fallback).toBeLessThanOrEqual(S_375.high)
    expect(environmentShapeOf('PK-11')).toMatch(/^[a-z-]+$/)
  })

  it('the default note stands up-right of its anchor, clear of it by more than S-292, inside the row area', () => {
    const built = stage()
    const note = drawnNote(built.loop)
    expect(note.body.x - note.anchor.x).toBeCloseTo(60, 1)
    expect(note.anchor.y - (note.body.y + note.body.height)).toBeCloseTo(60, 1)
    const area = valuesOf(built.loop).regions.rowArea
    expect(note.body.y).toBeGreaterThan(area.y)
    expect(rowBand(built.loop, 'F').y + rowBand(built.loop, 'F').height + 4 * S_292, 'room below the last band').toBeLessThan(SCREEN.height)
    expect(S_292, 'S-292 is narrower than half a day').toBeLessThan(pxPerDay(built.loop) / 2)
    for (const letter of LETTERS) expect(rowBand(built.loop, letter).height).toBeGreaterThan(2 * S_292)
    expect(rowStep(built.loop)).toBeGreaterThan(0)
  })
})

describe(`T-023d: ${BODY_OR_LEADER_MOVES_BOTH}`, () => {
  const pull = (loop: FrameLoop): Point => ({ x: Math.round(3.3 * pxPerDay(loop)), y: Math.round(rowStep(loop)) + 3 })

  it('premise: the body centre answers as the body and the leader midpoint as the leader', () => {
    const built = stage()
    const note = drawnNote(built.loop)
    expect(hitAt(built.loop, centreOf(note.body))?.boxPart).toEqual({ kind: 'body' })
    const leader = leaderOf(note)
    expect(leader).not.toBeNull()
    const middle = { x: (leader![0]!.x + leader![1]!.x) / 2, y: (leader![0]!.y + leader![1]!.y) / 2 }
    const hit = hitAt(built.loop, middle)
    expect(hit?.item).toEqual({ kind: 'commentBox', id: NOTE_ID })
    expect(hit?.boxPart).toEqual({ kind: 'leader' })
  })

  for (const part of ['body', 'leader'] as const) {
    it(`the ${part}, pulled 3.3 days right and one row down, moves the box by the pull and pins day 13 of row F`, () => {
      const built = stage()
      const before = drawnNote(built.loop)
      const leader = leaderOf(before)!
      const press =
        part === 'body' ? centreOf(before.body) : { x: (leader[0]!.x + leader[1]!.x) / 2, y: (leader[0]!.y + leader[1]!.y) / 2 }
      const by = pull(built.loop)
      drag(built, press, by.x, by.y)
      expect(anchorText(built.loop), `${part}: the anchor was not re-read at the moved point`).toBe('13 F')
      const after = drawnNote(built.loop)
      expect(after.body.x, `${part}: the box did not move by the pull`).toBeCloseTo(before.body.x + by.x, 1)
      expect(after.body.y, `${part}: the box did not move by the pull`).toBeCloseTo(before.body.y + by.y, 1)
      // STEP: CM-51 holds the move from the new LF-15 point to the moved bottom-left corner
      const offset = storedNote(built.loop)['bodyOffsetPx'] as { dx: number; dy: number }
      expect(after.anchor.x + offset.dx).toBeCloseTo(after.body.x, 1)
      expect(after.anchor.y + offset.dy).toBeCloseTo(after.body.y + after.body.height, 1)
    })
  }

  it(`${ANCHOR_STEPS_BY_HALVES} -- pulled under half a day, the box moves by the pull and the anchor stays on day 10`, () => {
    const built = stage()
    const before = drawnNote(built.loop)
    // WHY: the pull stays clear of S-208 (the press/pull split FR-019 names for placing) and under half a day.
    const by = Math.floor(pxPerDay(built.loop) / 2) - 1
    expect(by, 'premise: the pull is longer than S-208').toBeGreaterThan(t206('S-208'))
    drag(built, centreOf(before.body), by, 0)
    expect(anchorText(built.loop)).toBe(`${ANCHOR_DAY} ${ANCHOR_ROW}`)
    const after = drawnNote(built.loop)
    expect(after.body.x).toBeCloseTo(before.body.x + by, 1)
    expect(after.body.y).toBeCloseTo(before.body.y, 1)
    expect(after.anchor).toEqual(before.anchor)
  })

  it(`${ONE_BUNDLE} ${ONE_UNDO} -- one undo after a body pull brings back both the anchor and the offset`, () => {
    const built = stage()
    const stored = storedNote(built.loop)
    const before = drawnNote(built.loop)
    const by = pull(built.loop)
    drag(built, centreOf(before.body), by.x, by.y)
    const moved = storedNote(built.loop)
    expect(moved['anchorDate'], 'premise: the anchor moved').not.toEqual(stored['anchorDate'])
    expect(moved['bodyOffsetPx'], 'premise: the offset moved').not.toEqual(stored['bodyOffsetPx'])
    undo(built)
    expect(storedNote(built.loop), 'one undo left part of the move in place').toEqual(stored)
    expect(drawnNote(built.loop).body).toEqual(before.body)
  })

  it(`${BODY_NO_ROW} -- the body pulled so far down that the moved anchor point has no drawn row`, () => {
    const built = stage()
    const note = drawnNote(built.loop)
    const stored = storedNote(built.loop)
    const bottom = rowBand(built.loop, 'F').y + rowBand(built.loop, 'F').height
    const by = Math.round(bottom - note.anchor.y + 2 * S_292)
    drag(built, centreOf(note.body), 0, by)
    expect(storedNote(built.loop), 'a pull with no row under the moved anchor moved something').toEqual(stored)
    expect(built.noticeTexts(), 'RS-44 was not told').toContain(RS_44_WORDS)
  })

  // WHY: the pull is the release minus the press; how many moves the pointer reported on the way is not in it.
  const PULLS: readonly (readonly [string, (loop: FrameLoop) => Point, string])[] = [
    ['1.2 days right only', (loop) => ({ x: Math.round(1.2 * pxPerDay(loop)), y: 0 }), `11 ${ANCHOR_ROW}`],
    ['one row down only', (loop) => ({ x: 0, y: Math.round(rowStep(loop)) }), '10 F'],
    ['3.3 days right and one row down', (loop) => pull(loop), '13 F'],
  ]

  for (const [label, pullOf, pinned] of PULLS) {
    for (const steps of [1, 2, 6]) {
      it(`the body pulled ${label}, reported in ${steps} move(s), moves the box by the pull and pins ${pinned}`, () => {
        const built = stage()
        const before = drawnNote(built.loop)
        const by = pullOf(built.loop)
        dragInSteps(built, centreOf(before.body), by.x, by.y, steps)
        expect(anchorText(built.loop), 'the anchor').toBe(pinned)
        const after = drawnNote(built.loop)
        expect(after.body.x - before.body.x, 'the box did not move across by the pull').toBeCloseTo(by.x, 1)
        expect(after.body.y - before.body.y, 'the box did not move down by the pull').toBeCloseTo(by.y, 1)
      })
    }
  }
})

describe(`T-023d: ${ANCHOR_MOVES_ALONE}`, () => {
  const releaseOn = (loop: FrameLoop, d: number, letter: Letter): Point => {
    const band = rowBand(loop, letter)
    const note = drawnNote(loop)
    const dayTen = note.anchor.x - pxPerDay(loop) / 2
    return { x: dayTen + (d - ANCHOR_DAY + 0.2) * pxPerDay(loop), y: band.y + band.height / 2 }
  }

  it('the anchor released on day 16 of row C pins there, and the box does not move on screen', () => {
    const built = stage()
    const before = drawnNote(built.loop)
    const to = releaseOn(built.loop, 16, 'C')
    drag(built, before.anchor, to.x - before.anchor.x, to.y - before.anchor.y)
    expect(anchorText(built.loop)).toBe('16 C')
    const after = drawnNote(built.loop)
    expect(after.body.x, 'the box moved with the anchor').toBeCloseTo(before.body.x, 1)
    expect(after.body.y, 'the box moved with the anchor').toBeCloseTo(before.body.y, 1)
    expect(after.anchor.x).not.toBeCloseTo(before.anchor.x, 1)
  })

  it(`a press within S-292 of the anchor, not on it, moves the anchor the same way`, () => {
    const built = stage()
    const before = drawnNote(built.loop)
    const press = { x: before.anchor.x, y: before.anchor.y + S_292 - 1 }
    const to = releaseOn(built.loop, 13, 'C')
    drag(built, press, to.x - press.x, to.y - press.y)
    expect(anchorText(built.loop)).toBe('13 C')
    expect(drawnNote(built.loop).body.x).toBeCloseTo(before.body.x, 1)
  })

  it(`${ONE_UNDO} -- one undo after an anchor move brings back both the anchor and the offset`, () => {
    const built = stage()
    const stored = storedNote(built.loop)
    const before = drawnNote(built.loop)
    const to = releaseOn(built.loop, 16, 'C')
    drag(built, before.anchor, to.x - before.anchor.x, to.y - before.anchor.y)
    const moved = storedNote(built.loop)
    expect(moved['anchorGroupId'], 'premise: the anchor moved').not.toEqual(stored['anchorGroupId'])
    expect(moved['bodyOffsetPx'], 'premise: the offset was rewritten to keep the box still').not.toEqual(stored['bodyOffsetPx'])
    undo(built)
    expect(storedNote(built.loop), 'one undo left part of the move in place').toEqual(stored)
    expect(drawnNote(built.loop).anchor).toEqual(before.anchor)
  })

  for (const steps of [1, 6]) {
    for (const [label, d, letter] of [['day 16 of row C', 16, 'C'], ['day 13 of its own row', 13, ANCHOR_ROW]] as const) {
      it(`the anchor released on ${label}, reported in ${steps} move(s), pins there and leaves the box still`, () => {
        const built = stage()
        const before = drawnNote(built.loop)
        const to = releaseOn(built.loop, d, letter)
        dragInSteps(built, before.anchor, to.x - before.anchor.x, to.y - before.anchor.y, steps)
        expect(anchorText(built.loop)).toBe(`${d} ${letter}`)
        expect(drawnNote(built.loop).body.x, 'the box moved with the anchor').toBeCloseTo(before.body.x, 1)
        expect(drawnNote(built.loop).body.y, 'the box moved with the anchor').toBeCloseTo(before.body.y, 1)
      })
    }
  }
})

describe(`T-221 LF-17: ${LEADER_ONE_CORNER}`, () => {
  const BODY: ScreenRect = { x: 100, y: 100, width: 80, height: 40 }
  const geometryAt = (anchor: Point): CommentGeometry => ({
    id: NOTE_ID,
    anchor,
    body: BODY,
    lines: ['Note'],
    fontSize: 12,
    strokeWidthPx: 1,
    fillOpacity: 1,
    strokeColor: null,
    fillColor: null,
    textColor: null,
  })

  const CASES: readonly (readonly [string, Point, CornerName])[] = [
    ['up-left', { x: 50, y: 50 }, 'top-left'],
    ['up-right', { x: 250, y: 50 }, 'top-right'],
    ['down-left', { x: 50, y: 200 }, 'bottom-left'],
    ['down-right', { x: 250, y: 200 }, 'bottom-right'],
    ['straight above, right of the middle', { x: 160, y: 50 }, 'top-right'],
    ['straight above, left of the middle', { x: 120, y: 50 }, 'top-left'],
    ['straight below, right of the middle', { x: 170, y: 190 }, 'bottom-right'],
    ['beside on the right, above the middle', { x: 230, y: 110 }, 'top-right'],
    ['beside on the left, below the middle', { x: 40, y: 130 }, 'bottom-left'],
    ['just outside the left edge at the middle height', { x: 99.9, y: 120 }, 'bottom-left'],
  ]

  for (const [label, anchor, corner] of CASES) {
    it(`${LF_17_SIDE} ${LF_17_UPDOWN} -- ${label} takes the ${corner} corner`, () => {
      expectJoins(leaderOf(geometryAt(anchor)), anchor, CORNERS[corner](BODY), label)
    })
  }

  const TIES: readonly (readonly [string, Point, CornerName])[] = [
    ['above, on the horizontal middle', { x: 140, y: 50 }, 'top-left'],
    ['below, on the horizontal middle', { x: 140, y: 200 }, 'bottom-left'],
    ['left, on the vertical middle', { x: 40, y: 120 }, 'bottom-left'],
    ['right, on the vertical middle', { x: 250, y: 120 }, 'bottom-right'],
  ]

  for (const [label, anchor, corner] of TIES) {
    it(`${LF_17_TIE} -- ${label} takes the ${corner} corner`, () => {
      expectJoins(leaderOf(geometryAt(anchor)), anchor, CORNERS[corner](BODY), label)
    })
  }

  const INSIDE: readonly (readonly [string, Point])[] = [
    ['the centre', { x: 140, y: 120 }],
    ['inside, up-left of the middle', { x: 110, y: 105 }],
    ['on the left edge', { x: 100, y: 120 }],
    ['on the right edge', { x: 180, y: 130 }],
    ['on the top edge', { x: 150, y: 100 }],
    ['on the bottom edge', { x: 140, y: 140 }],
    ['on the top-right corner', { x: 180, y: 100 }],
    ['on the bottom-left corner', { x: 100, y: 140 }],
  ]

  for (const [label, anchor] of INSIDE) {
    it(`${LF_17_INSIDE} -- ${label}: no leader`, () => {
      expect(leaderOf(geometryAt(anchor)), label).toBeNull()
    })
  }
})

describe(`FR-019: ${LEADER_ONE_CORNER} -- in the drawn picture`, () => {
  // WHY: the body's size comes from its text (FR-097), so each placement is set from the drawn size.
  const measured = (): ScreenRect => drawnNote(stage().loop).body

  const placements = (body: ScreenRect): readonly (readonly [CornerName, number, number])[] => [
    ['bottom-left', 60, -60],
    ['bottom-right', -(body.width + 60), -60],
    ['top-left', 60, body.height + 60],
    ['top-right', -(body.width + 60), body.height + 60],
  ]

  for (const index of [0, 1, 2, 3]) {
    it(`placement ${index + 1}: one line from the anchor to the corner LF-17 picks, in the drawn picture`, () => {
      const [corner, dx, dy] = placements(measured())[index]!
      const built = stage({ notes: [{ dx, dy }] })
      const note = drawnNote(built.loop)
      const lines = leaderTags(built.lastSvg())
      expect(lines, `${corner}: the picture draws not one leader line`).toHaveLength(1)
      const body = bodyTag(built.lastSvg())
      const drawnBody: ScreenRect = {
        x: numberAttribute(body, 'x'),
        y: numberAttribute(body, 'y'),
        width: numberAttribute(body, 'width'),
        height: numberAttribute(body, 'height'),
      }
      expectJoins(endsOf(lines[0]!.text), note.anchor, CORNERS[corner](drawnBody), corner)
    })
  }

  for (const [label, dx, dy] of [
    ['inside the body', -10, 5],
    ['on the bottom-left corner of the body', 0, 0],
    ['on the left edge of the body', 0, 5],
  ] as const) {
    it(`${LF_17_INSIDE} -- the anchor ${label}: no leader is drawn and no press answers as the leader`, () => {
      const built = stage({ notes: [{ dx, dy }] })
      const note = drawnNote(built.loop)
      expect(note.body.width, 'premise: the body is wider than the offset').toBeGreaterThan(20)
      expect(note.body.height, 'premise: the body is taller than the offset').toBeGreaterThan(10)
      expect(leaderOf(note)).toBeNull()
      expect(leaderTags(built.lastSvg()), 'a leader was drawn').toEqual([])
      for (const corner of Object.values(CORNERS)) {
        const to = corner(note.body)
        for (let step = 0; step <= 10; step += 1) {
          const at = { x: note.anchor.x + ((to.x - note.anchor.x) * step) / 10, y: note.anchor.y + ((to.y - note.anchor.y) * step) / 10 }
          expect(hitAt(built.loop, at)?.boxPart?.kind ?? 'none', `(${at.x}, ${at.y})`).not.toBe('leader')
        }
      }
    })
  }

  it(`${LF_17_HANDLE_INSIDE} -- the anchor inside the body still answers as the anchor, and its handle is drawn when selected`, () => {
    const built = stage({ notes: [{ dx: -10, dy: 5 }] })
    const note = drawnNote(built.loop)
    expect(hitAt(built.loop, note.anchor)?.boxPart).toEqual({ kind: 'anchor' })
    click(built, { x: note.body.x + note.body.width - 3, y: note.body.y + 3 })
    expect(tagsOf(built.lastSvg(), 'rect', HANDLE_FIGURE()), 'no handle on the anchor inside the body').toHaveLength(1)
  })
})

describe(`T-023d: ${HANDLE_WHILE_SELECTED}`, () => {
  const TWO_NOTES: Fixture = { notes: [{}, { id: OTHER_NOTE_ID, anchorDay: 20, anchorRow: 'E', dx: 40, dy: -40 }] }

  it(`${NO_HANDLE_UNSELECTED} -- nothing selected, no handle`, () => {
    const built = stage(TWO_NOTES)
    expect(tagsOf(built.lastSvg(), 'rect', HANDLE_FIGURE(NOTE_ID))).toEqual([])
    expect(tagsOf(built.lastSvg(), 'rect', HANDLE_FIGURE(OTHER_NOTE_ID))).toEqual([])
  })

  it(`selecting one note draws its handle alone, ${HANDLE_AT_ZO_10}`, () => {
    const built = stage(TWO_NOTES)
    click(built, centreOf(drawnNote(built.loop).body))
    const svg = built.lastSvg()
    const handles = tagsOf(svg, 'rect', HANDLE_FIGURE(NOTE_ID))
    expect(handles).toHaveLength(1)
    expect(layerOf(svg, handles[0]!.at)).toBe('ZO-10')
    expect(tagsOf(svg, 'rect', HANDLE_FIGURE(OTHER_NOTE_ID)), 'the unselected note drew a handle').toEqual([])
  })

  it(`${HANDLE_SHAPE}`, () => {
    const built = stage()
    const note = drawnNote(built.loop)
    click(built, centreOf(note.body))
    const handle = tagsOf(built.lastSvg(), 'rect', HANDLE_FIGURE())[0]
    expect(handle, 'no handle').toBeDefined()
    const tag = handle!.text
    expect(numberAttribute(tag, 'width')).toBe(S_376)
    expect(numberAttribute(tag, 'height')).toBe(S_376)
    expect(numberAttribute(tag, 'x') + S_376 / 2).toBeCloseTo(note.anchor.x, 1)
    expect(numberAttribute(tag, 'y') + S_376 / 2).toBeCloseTo(note.anchor.y, 1)
    expect(attributeOf(tag, 'fill') ?? '').toMatch(themeColourPattern('S-146'))
    expect(attributeOf(tag, 'stroke') ?? '').toMatch(themeColourPattern('S-151'))
    expect(numberAttribute(tag, 'stroke-width')).toBe(S_174)
  })

  it(`${HANDLE_NOT_SCALED} -- at twice and half the zoom the side is still S-376`, () => {
    for (const zoomFactor of [2, 0.5]) {
      const built = stage({ zoomFactor })
      click(built, centreOf(drawnNote(built.loop).body))
      const handle = tagsOf(built.lastSvg(), 'rect', HANDLE_FIGURE())[0]
      expect(handle, `zoom x${zoomFactor}: no handle`).toBeDefined()
      expect(numberAttribute(handle!.text, 'width'), `zoom x${zoomFactor}`).toBe(S_376)
      expect(numberAttribute(handle!.text, 'height'), `zoom x${zoomFactor}`).toBe(S_376)
      expect(numberAttribute(handle!.text, 'stroke-width'), `zoom x${zoomFactor}`).toBe(S_174)
    }
  })
})

describe(`FR-106: ${FR_106_ANCHOR}`, () => {
  it('the anchor shows PK-11, drawn as the environment shape table T-269 names', () => {
    const built = stage()
    const hit = hitAt(built.loop, drawnNote(built.loop).anchor)
    expect(hit?.grab).toBe('GR-14')
    expect(hit?.item).toEqual({ kind: 'commentBox', id: NOTE_ID })
    expect(hit?.boxPart).toEqual({ kind: 'anchor' })
    const row = pointerRowOf(hit as never, false)
    expect(row).toBe('PK-11')
    expect(pointerImageOf(row as never)).toBe(environmentShapeOf('PK-11'))
  })

  it('the body and the leader keep no pointer of their own (CR-559 section 10)', () => {
    const built = stage()
    const note = drawnNote(built.loop)
    const leader = leaderOf(note)!
    const body = hitAt(built.loop, centreOf(note.body))
    const line = hitAt(built.loop, { x: (leader[0]!.x + leader[1]!.x) / 2, y: (leader[0]!.y + leader[1]!.y) / 2 })
    expect(body?.boxPart).toEqual({ kind: 'body' })
    expect(line?.boxPart).toEqual({ kind: 'leader' })
    expect(pointerRowOf(body as never, false)).toBeNull()
    expect(pointerRowOf(line as never, false)).toBeNull()
  })

  for (const selected of [false, true]) {
    it(`${HANDLE_KEEPS_THE_REACH} -- ${selected ? 'selected' : 'not selected'}: within S-292 below the anchor is the anchor, beyond it is not`, () => {
      const built = stage()
      const note = drawnNote(built.loop)
      if (selected) {
        click(built, centreOf(note.body))
        expect(tagsOf(built.lastSvg(), 'rect', HANDLE_FIGURE()), 'premise: selected').toHaveLength(1)
      }
      const anchor = drawnNote(built.loop).anchor
      expect(hitAt(built.loop, { x: anchor.x, y: anchor.y + S_292 - 0.5 })?.boxPart).toEqual({ kind: 'anchor' })
      expect(hitAt(built.loop, { x: anchor.x, y: anchor.y + S_292 + 0.5 })?.boxPart?.kind ?? 'none').not.toBe('anchor')
    })
  }
})

describe(`T-023d: ${BODY_DOES_NOT_PASS_THROUGH}`, () => {
  // WHY: find a point inside the body that is also inside a drawn plan bar, so the press has a task to fall to.
  const overlap = (loop: FrameLoop): Point => {
    const note = drawnNote(loop)
    for (const task of valuesOf(loop).geometry.tasks) {
      const bar = boxOfBar(task.plan, 'the plan bar')
      const x0 = Math.max(bar.x0, note.body.x) + 1
      const x1 = Math.min(bar.x1, note.body.x + note.body.width) - 1
      const y0 = Math.max(bar.y0, note.body.y) + 1
      const y1 = Math.min(bar.y1, note.body.y + note.body.height) - 1
      if (x0 < x1 && y0 < y1) return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
    }
    throw new Error('premise: no plan bar lies under the body')
  }

  for (const percent of [100, 0, null]) {
    it(`transparency ${String(percent)}: a press on the body over a plan bar answers as the body`, () => {
      const built = stage({ withTasks: true, notes: [{ fillTransparencyPercent: percent, text: 'Note\nsecond line\nthird line' }] })
      const at = overlap(built.loop)
      const hit = hitAt(built.loop, at)
      expect(hit?.item).toEqual({ kind: 'commentBox', id: NOTE_ID })
      expect(hit?.boxPart).toEqual({ kind: 'body' })
    })
  }

  it('control: with no comment box, the same point answers as the task', () => {
    const built = stage({ withTasks: true, notes: [{ fillTransparencyPercent: 100, text: 'Note\nsecond line\nthird line' }] })
    const at = overlap(built.loop)
    const bare = stageOf({ ...fixtureDocument({ withTasks: true }), schedule: { ...fixtureDocument({ withTasks: true }).schedule, commentBoxes: [] } } as Document)
    expect(hitAt(bare.loop, at)?.item.kind).toBe('task')
  })
})

describe('FR-019: the five look columns AT-148 .. AT-152 as drawn', () => {
  const drawnSvg = (spec: NoteSpec, zoomFactor = 1): string => stage({ notes: [spec], zoomFactor }).lastSvg()
  const textTags = (svg: string): readonly Tag[] => tagsOf(svg, 'text', LINE_FIGURE())

  it(`${NULLS_DRAW_DEFAULTS}`, () => {
    const svg = drawnSvg({})
    const body = bodyTag(svg)
    const leader = leaderTags(svg)[0]?.text ?? ''
    expect(numberAttribute(body, 'stroke-width')).toBe(S_374.fallback)
    expect(numberAttribute(leader, 'stroke-width')).toBe(S_374.fallback)
    expect(numberAttribute(body, 'fill-opacity')).toBeCloseTo(1 - S_375.fallback / 100, 6)
    expect(attributeOf(body, 'stroke') ?? '').toMatch(themeColourPattern('S-312'))
    expect(attributeOf(leader, 'stroke') ?? '').toMatch(themeColourPattern('S-312'))
    expect(attributeOf(body, 'fill') ?? '').toMatch(themeColourPattern('S-146'))
    const texts = textTags(svg)
    expect(texts.length, 'no text line drawn').toBeGreaterThan(0)
    for (const text of texts) expect(attributeOf(text.text, 'fill') ?? '', text.text).toMatch(themeColourPattern('S-147'))
  })

  it(`${STROKE_RULE} ${ONE_COLOUR_ONE_WIDTH} -- red draws the T-294 outline value on the frame and the leader`, () => {
    const svg = drawnSvg({ strokeColor: 'red', strokeWidthPx: 3 })
    const body = bodyTag(svg)
    const leader = leaderTags(svg)[0]?.text ?? ''
    expect(paletteValues('red', '縁')).toContain((attributeOf(body, 'stroke') ?? '').toLowerCase())
    expect(attributeOf(leader, 'stroke')).toBe(attributeOf(body, 'stroke'))
    expect(numberAttribute(body, 'stroke-width')).toBe(3)
    expect(numberAttribute(leader, 'stroke-width')).toBe(3)
  })

  it(`${FILL_RULE} -- blue draws the T-294 fill value`, () => {
    const body = bodyTag(drawnSvg({ fillColor: 'blue' }))
    expect(paletteValues('blue', '塗り')).toContain((attributeOf(body, 'fill') ?? '').toLowerCase())
  })

  it(`${TEXT_RULE} -- green draws the T-294 outline value on every text line`, () => {
    const texts = textTags(drawnSvg({ textColor: 'green', text: 'one\ntwo' }))
    expect(texts.length).toBeGreaterThanOrEqual(2)
    for (const text of texts) expect(paletteValues('green', '縁')).toContain((attributeOf(text.text, 'fill') ?? '').toLowerCase())
  })

  it('a custom colour is drawn with the value it holds (CV-3 / CV-6) on the line, the fill and the text', () => {
    const svg = drawnSvg({ strokeColor: '#123456/', fillColor: '#234567/', textColor: '#345678/' })
    expect(attributeOf(bodyTag(svg), 'stroke')?.toLowerCase()).toBe('#123456')
    expect(attributeOf(leaderTags(svg)[0]?.text ?? '', 'stroke')?.toLowerCase()).toBe('#123456')
    expect(attributeOf(bodyTag(svg), 'fill')?.toLowerCase()).toBe('#234567')
    for (const text of textTags(svg)) expect(attributeOf(text.text, 'fill')?.toLowerCase()).toBe('#345678')
  })

  it(`${FILL_RULE} -- 30 draws fill-opacity 0.7, 0 draws 1, 100 draws 0`, () => {
    for (const [percent, opacity] of [[30, 0.7], [0, 1], [100, 0], [75, 0.25]] as const) {
      const body = bodyTag(drawnSvg({ fillColor: 'red', fillTransparencyPercent: percent }))
      expect(numberAttribute(body, 'fill-opacity'), `transparency ${percent}`).toBeCloseTo(opacity, 6)
    }
  })

  it(`${FILL_ONLY} -- at 60 the frame, the leader and the text carry no opacity below 1`, () => {
    const svg = drawnSvg({ fillColor: 'red', fillTransparencyPercent: 60 })
    const drawn = [bodyTag(svg), leaderTags(svg)[0]?.text ?? '', ...textTags(svg).map((one) => one.text)]
    for (const tag of drawn) {
      for (const name of ['opacity', 'stroke-opacity']) {
        const value = attributeOf(tag, name)
        if (value !== null) expect(Number(value), `${name} on ${tag}`).toBe(1)
      }
    }
    for (const text of textTags(svg)) {
      const value = attributeOf(text.text, 'fill-opacity')
      if (value !== null) expect(Number(value), `fill-opacity on ${text.text}`).toBe(1)
    }
  })

  it(`${WIDTH_NOT_SCALED} -- at twice the zoom the frame and the leader keep the width the column holds`, () => {
    for (const zoomFactor of [1, 2, 0.5]) {
      const svg = drawnSvg({ strokeWidthPx: 4 }, zoomFactor)
      expect(numberAttribute(bodyTag(svg), 'stroke-width'), `zoom x${zoomFactor}`).toBe(4)
      expect(numberAttribute(leaderTags(svg)[0]?.text ?? '', 'stroke-width'), `zoom x${zoomFactor}`).toBe(4)
    }
  })

  it(`${CLAMPED_NOT_REWRITTEN} -- out-of-range stored values are drawn at the nearer bound, and the document keeps them`, () => {
    const cases = [
      { spec: { strokeWidthPx: S_374.high + 12, fillTransparencyPercent: S_375.high + 50 }, width: S_374.high, opacity: 1 - S_375.high / 100 },
      { spec: { strokeWidthPx: S_374.low - 1, fillTransparencyPercent: S_375.low - 10 }, width: S_374.low, opacity: 1 - S_375.low / 100 },
    ]
    for (const one of cases) {
      const built = stage({ notes: [{ fillColor: 'red', ...one.spec }] })
      const svg = built.lastSvg()
      expect(numberAttribute(bodyTag(svg), 'stroke-width')).toBe(one.width)
      expect(numberAttribute(leaderTags(svg)[0]?.text ?? '', 'stroke-width')).toBe(one.width)
      expect(numberAttribute(bodyTag(svg), 'fill-opacity')).toBeCloseTo(one.opacity, 6)
      const stored = storedNote(built.loop)
      expect(stored['strokeWidthPx'], 'the document was rewritten').toBe(one.spec.strokeWidthPx)
      expect(stored['fillTransparencyPercent'], 'the document was rewritten').toBe(one.spec.fillTransparencyPercent)
    }
  })
})

describe(`05-07-design: ${MISSING_COLUMNS_READ_AS_NULL}`, () => {
  const COLUMNS = ['strokeColor', 'strokeWidthPx', 'fillColor', 'fillTransparencyPercent', 'textColor'] as const

  const withoutColumns = (schemaVersion?: string): string => {
    const document = JSON.parse(JSON.stringify(fixtureDocument())) as Record<string, any>
    for (const note of document['schedule']['commentBoxes'] as Record<string, unknown>[]) {
      for (const column of COLUMNS) delete note[column]
    }
    if (schemaVersion !== undefined) document['schemaVersion'] = schemaVersion
    return JSON.stringify(document)
  }

  for (const [label, version] of [['the version this build writes', undefined], ['an older version', '2026-08-20']] as const) {
    it(`${WHATEVER_THE_VERSION} -- ${label}: the note opens with the five columns null, and ${SILENTLY}`, () => {
      const read = documentFromJson(withoutColumns(version))
      if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
      const note = (read.document.schedule.commentBoxes as unknown as readonly Record<string, unknown>[])[0]!
      for (const column of COLUMNS) {
        expect(Object.prototype.hasOwnProperty.call(note, column), `${column} was not added`).toBe(true)
        expect(note[column], column).toBeNull()
      }
      expect(read.unreadColumns, 'the added columns were told as unread').toEqual([])
      expect(read.clampedCount, 'the added columns were told as clamped').toBe(0)
    })
  }

  it(`${NULLS_DRAW_DEFAULTS} -- the note read without the columns draws the same picture as one holding five nulls`, () => {
    const read = documentFromJson(withoutColumns('2026-08-20'))
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
    const opened = bodyTag(stageOf(read.document).lastSvg())
    const nulls = bodyTag(stage().lastSvg())
    expect(opened).toBe(nulls)
  })

  it(`${CLAMPED_NOT_REWRITTEN} -- an out-of-range stored value is read as it stands`, () => {
    const document = fixtureDocument({ notes: [{ strokeWidthPx: S_374.high + 12, fillTransparencyPercent: S_375.high + 50 }] })
    const read = documentFromJson(JSON.stringify(document))
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
    const note = (read.document.schedule.commentBoxes as unknown as readonly Record<string, unknown>[])[0]!
    expect(note['strokeWidthPx']).toBe(S_374.high + 12)
    expect(note['fillTransparencyPercent']).toBe(S_375.high + 50)
  })
})

describe(`T-108 CM-80 .. CM-84: ${OUT_OF_RANGE_REFUSED} ${NO_TRANSPARENT_LINE_OR_TEXT}`, () => {
  type Command = Parameters<typeof editAnnotation>[1]

  const refusalOf = (command: Command): { command?: string; rule: string } | null => {
    const result = editAnnotation(fixtureDocument(), command)
    if (result.ok) return null
    expect(result.refusals).toHaveLength(1)
    return result.refusals[0] as { command?: string; rule: string }
  }

  const acceptedNote = (command: Command): Record<string, unknown> => {
    const result = editAnnotation(fixtureDocument(), command)
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    const found = (result.document.schedule.commentBoxes as unknown as readonly Record<string, unknown>[]).find((one) => one['id'] === NOTE_ID)
    if (found === undefined) throw new Error('the note is gone')
    return found
  }

  it('CM-81 places a width inside S-374, and null, and refuses one outside it or not whole', () => {
    for (const width of [S_374.low, S_374.high, null]) {
      expect(acceptedNote({ kind: 'setCommentBoxStrokeWidth', id: NOTE_ID, strokeWidthPx: width })['strokeWidthPx']).toBe(width)
    }
    for (const width of [S_374.low - 1, S_374.high + 1, S_374.low + 0.5]) {
      expect(refusalOf({ kind: 'setCommentBoxStrokeWidth', id: NOTE_ID, strokeWidthPx: width }), `width ${width}`).toEqual(
        expect.objectContaining({ command: 'CM-81', rule: 'S-374' }),
      )
    }
  })

  it('CM-83 places a transparency inside S-375, and null, and refuses one outside it or not whole', () => {
    for (const percent of [S_375.low, S_375.high, null]) {
      expect(acceptedNote({ kind: 'setCommentBoxFillTransparency', id: NOTE_ID, fillTransparencyPercent: percent })['fillTransparencyPercent']).toBe(percent)
    }
    for (const percent of [S_375.low - 1, S_375.high + 1, 12.5]) {
      expect(refusalOf({ kind: 'setCommentBoxFillTransparency', id: NOTE_ID, fillTransparencyPercent: percent }), `percent ${percent}`).toEqual(
        expect.objectContaining({ command: 'CM-83', rule: 'S-375' }),
      )
    }
  })

  it(`CM-82 places a palette name, a custom colour, transparent and null (${FILL_MAY_BE_TRANSPARENT}), and refuses what is not a colour (CV-1)`, () => {
    for (const colour of ['red', '#123456/', 'transparent', null]) {
      expect(acceptedNote({ kind: 'setCommentBoxFillColor', id: NOTE_ID, fillColor: colour })['fillColor']).toBe(colour)
    }
    for (const colour of ['crimson', '#12345', '']) {
      expect(refusalOf({ kind: 'setCommentBoxFillColor', id: NOTE_ID, fillColor: colour }), `colour ${colour}`).toEqual(
        expect.objectContaining({ command: 'CM-82', rule: 'CV-1' }),
      )
    }
  })

  for (const [row, kind, key] of [
    ['CM-80', 'setCommentBoxStrokeColor', 'strokeColor'],
    ['CM-84', 'setCommentBoxTextColor', 'textColor'],
  ] as const) {
    it(`${row} places a palette name, a custom colour and null, refuses transparent (FR-019) and what is not a colour (CV-1)`, () => {
      for (const colour of ['red', '#123456/', null]) {
        expect(acceptedNote({ kind, id: NOTE_ID, [key]: colour } as Command)[key], `colour ${String(colour)}`).toBe(colour)
      }
      expect(refusalOf({ kind, id: NOTE_ID, [key]: 'transparent' } as Command), 'transparent').toEqual(
        expect.objectContaining({ command: row, rule: 'FR-019' }),
      )
      for (const colour of ['crimson', '#12345', '']) {
        expect(refusalOf({ kind, id: NOTE_ID, [key]: colour } as Command), `colour ${colour}`).toEqual(
          expect.objectContaining({ command: row, rule: 'CV-1' }),
        )
      }
    })
  }

  it('each of the five commands refuses a note that does not exist (AT-110)', () => {
    const missing = '3c000000-0000-4000-8000-0000000000ff'
    const commands: readonly (readonly [string, Command])[] = [
      ['CM-80', { kind: 'setCommentBoxStrokeColor', id: missing, strokeColor: 'red' }],
      ['CM-81', { kind: 'setCommentBoxStrokeWidth', id: missing, strokeWidthPx: 2 }],
      ['CM-82', { kind: 'setCommentBoxFillColor', id: missing, fillColor: 'red' }],
      ['CM-83', { kind: 'setCommentBoxFillTransparency', id: missing, fillTransparencyPercent: 2 }],
      ['CM-84', { kind: 'setCommentBoxTextColor', id: missing, textColor: 'red' }],
    ]
    for (const [row, command] of commands) {
      expect(refusalOf(command), row).toEqual(expect.objectContaining({ command: row, rule: 'AT-110' }))
    }
  })

  it(`${PLACED_WITH_NULLS} -- createCommentBox leaves the five columns null`, () => {
    const result = editAnnotation(fixtureDocument(), { kind: 'createCommentBox', id: OTHER_NOTE_ID, anchor: { date: day(20), groupId: ROW.E } })
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    const made = (result.document.schedule.commentBoxes as unknown as readonly Record<string, unknown>[]).find((one) => one['id'] === OTHER_NOTE_ID)
    for (const column of ['strokeColor', 'strokeWidthPx', 'fillColor', 'fillTransparencyPercent', 'textColor']) {
      expect(Object.prototype.hasOwnProperty.call(made ?? {}, column), `${column} is missing`).toBe(true)
      expect(made?.[column], column).toBeNull()
    }
  })
})

describe('control -- the checks here can go red', () => {
  it('an anchor text reads a moved anchor differently from an unmoved one', () => {
    const built = stage()
    const before = anchorText(built.loop)
    const note = drawnNote(built.loop)
    drag(built, note.anchor, 0, rowStep(built.loop))
    expect(anchorText(built.loop)).not.toBe(before)
  })

  it('the corner check tells a wrong corner from the right one', () => {
    const body: ScreenRect = { x: 0, y: 0, width: 10, height: 10 }
    const anchor = { x: -5, y: -5 }
    const ends = [anchor, CORNERS['bottom-right'](body)]
    expect(near(ends[1]!, CORNERS['top-left'](body))).toBe(false)
  })

  it('one character off a quoted clause is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(ONE_UNDO.replace('1 度', '2 度'))
  })
})
