// CR-558: a highlight box answers on eight grab points and its frame, and draws its stroke width and fill.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { PointerInput, PointerPhase } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
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

// see T-023d
const EIGHT_THEN_FRAME = '⭐ 同表の `HB-8` 〜 `HB-11` の 8 つの掴み点を先に、`HB-12` の枠をその後に応えさせること（MUST）。'
const NEAREST_WINS =
  '⭐ 8 つの掴み点は 1 つの段とし、押した点を掴み代に含む点のうち、押した点にいちばん近い点を採ること（MUST）'
const TIE_ORDER = '距離が等しいときは同表の上の行を採り、同じ行の 2 点では上の点（左右の辺の中点は左）を採る。'
const DRAWN_WHILE_SELECTED =
  '⭐ 掴み点は、その箱を選んでいるあいだだけ描くこと（MUST） —— 1 辺 `S-372` の正方形を点に中心を合わせて置き、地を `_assets/tbl-settings.md` の 表 T-236 の `S-146`、縁を同表の `S-151`、縁の太さを 表 T-206 の `S-174` で描く。'
const POINTS_AT_ZO_10 = '重ね順は `FR-110` の 表 T-020 の `ZO-10` とすること（MUST）。'
const UNDRAWN_STILL_ANSWER =
  '⭐ 描いていない掴み点も応えること（MUST） —— 選んでいない箱の隅も、今までどおり引けば大きさを変える。'
const FRAME_ON_A_SHAPE =
  '⚠️ 描いた形の上では、枠は描いた線そのもの（線の中心から、描いた太さ `AT-145` の半分）でだけ応えること（MUST）'
const POINTS_ON_A_SHAPE = '⭐ 掴み点は、描いた形の上でも同じ掴み代で応えること（MUST）'
const INSIDE_PASSES_THROUGH =
  '⛔ 囲んだ内側を掴み代にしてはならない（MUST NOT） —— 内側の押下は下のタスクへ素通しにすること（MUST）。'
// see FR-106
const FR_106_HIGHLIGHT =
  '⭐ ハイライトボックスの掴み代（表 T-023d の `GR-14`）では、`FR-016` の 表 T-246 の `HB-8` 〜 `HB-12` が名指す形とすること（MUST）'
// see FR-019
// WHY: the fill's null is no longer T-217's default but the theme colour (CR-606 E-31).
const NULL_DRAWS_THE_DEFAULT = '⭐ 線の太さと透過率の列が `null` のときは、表 T-217 の同じ列の既定で描くこと（MUST）'
const NULL_FILL_IS_THE_THEME =
  '⭐ 塗りの色の列が `null` のときは、テーマの色（`_assets/tbl-settings.md` の 表 T-236 の `S-155`）で塗ること（MUST）'
const PLACED_UNFILLED = '⭐ 置くとき（表 T-108 の `CM-52`）は、塗りの色の列に 表 T-217 の `S-370`（透明）を写すこと（MUST）'
const OPACITY = '不透明度を 1 − `AT-147` ÷ 100 として塗ること（MUST）'
const TRANSPARENT_IS_NOT_FILLED = '塗りの色が透明の箱は塗らない —— 後ろが見える。'
const FILL_AT_ZO_14 = '⭐ 塗りは `FR-110` の 表 T-020 の `ZO-14` に描くこと（MUST）'
const CLAMPED_NOT_REWRITTEN = '範囲へ寄せて描き、文書を書き換えないこと（MUST）'
const OUT_OF_RANGE_REFUSED =
  '⭐ 同じ範囲の外の値を置く命令（表 T-108 の `CM-77` ・ `CM-79` ・ `CM-81` ・ `CM-83`）は拒むこと（MUST）'
const NO_TRANSPARENT_OUTLINE = 'ハイライトボックスの枠の線にも、タスクと同じく透明（線なし）を選ばせること（MUST）'
const NOT_BOTH_TRANSPARENT = '⛔ ただし、塗りと枠の線を同時に透明にすることを許してはならない（MUST NOT）'
const FILL_MAY_BE_TRANSPARENT = '⭐ 塗りには透明を選ばせてよい'
// WHY: 05-07-design reads a GRS JSON document this way before the schema runs.
const MISSING_COLUMNS_READ_AS_NULL =
  '⭐ 同じくスキーマを走らせる前に、`_assets/fig-erd-detail.md` の `AT-145` ・ `AT-146` ・ `AT-147` の列を持たない `HighlightBox` の項と、`AT-148` 〜 `AT-152` の列を持たない `CommentBox` の項には、その列を `null` として足して読むこと（MUST）'
const WHATEVER_THE_VERSION = '⭐ 形式の版（`FR-073`）によらずに足す'
const SILENTLY = '足したことを通知してはならない（MUST NOT）'

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
const S_230 = t206('S-230')
const S_293 = t206('S-293')
const S_372 = t206('S-372')
const S_373 = t206('S-373')
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
const S_369 = t217('S-369')
const S_371 = t217('S-371')
const S_370_FALLBACK = /'([a-z]+)'/.exec(cellOf('T-217', 'S-370', '既定'))?.[1] ?? ''

// WHY: a palette name is drawn with the fill value table T-294 holds for it, in whichever theme is drawn.
const paletteFills = (spelling: string): readonly string[] => {
  const row = specTable('T-294').rows.find((one) => one.by['保存する綴り'] === `\`${spelling}\``)
  if (row === undefined) throw new Error(`table T-294 has no spelling ${spelling}`)
  return [row.by['明るいテーマの塗り'] ?? '', row.by['暗いテーマの塗り'] ?? ''].map((one) => one.replace(/`/g, ''))
}

// WHY: a T-236 colour may carry the theme hue H, so it is read as a pattern with H any whole number.
const themeColourPattern = (row: string): RegExp => {
  const cells = [cellOf('T-236', row, '明るいテーマ'), cellOf('T-236', row, '暗いテーマ')].map((one) =>
    one.replace(/`/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\bH\b/, '\\d+(?:\\.\\d+)?'),
  )
  return new RegExp(`^(?:${cells.join('|')})$`)
}

const pointerOfHb = (row: string): string => {
  const found = /`(PK-\d+)`/.exec(cellOf('T-246', row, '置く値'))
  if (found === null) throw new Error(`table T-246 row ${row} names no pointer`)
  return found[1] ?? ''
}

const environmentShapeOf = (pk: string): string => {
  const found = /`([a-z-]+)`/.exec(cellOf('T-269', pk, '形'))
  if (found === null) throw new Error(`table T-269 row ${pk} names no environment shape`)
  return found[1] ?? ''
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
type Letter = (typeof LETTERS)[number]
const ROW: Readonly<Record<Letter, string>> = Object.fromEntries(
  LETTERS.map((letter, index) => [letter, `3a000000-0000-4000-8000-00000000000${String(index + 1)}`]),
) as Record<Letter, string>
const LETTER_OF: Readonly<Record<string, string>> = Object.fromEntries(LETTERS.map((letter) => [ROW[letter], letter]))

const BOX_ID = '3b000000-0000-4000-8000-000000000001'
const OTHER_ID = '3b000000-0000-4000-8000-000000000002'
const TASK_UID = 1

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`
const PX_PER_DAY_AT_1X = 20 / DEFAULT_DISPLAY_RATIO

interface BoxSpec {
  readonly id?: string
  readonly start?: number
  readonly end?: number
  readonly top?: Letter
  readonly bottom?: Letter
  readonly strokeWidthPx?: number | null
  readonly fillColor?: string | null
  readonly fillTransparencyPercent?: number | null
}

interface Fixture {
  readonly boxes?: readonly BoxSpec[]
  readonly withTask?: boolean
  readonly zoomFactor?: number
}

const boxRecord = (spec: BoxSpec): Record<string, unknown> => ({
  id: spec.id ?? BOX_ID,
  startDate: day(spec.start ?? 6),
  endDate: day(spec.end ?? 16),
  topGroupId: ROW[spec.top ?? 'B'],
  bottomGroupId: ROW[spec.bottom ?? 'D'],
  strokeColor: null,
  cornerRadiusPx: null,
  strokeWidthPx: spec.strokeWidthPx === undefined ? null : spec.strokeWidthPx,
  fillColor: spec.fillColor === undefined ? null : spec.fillColor,
  fillTransparencyPercent: spec.fillTransparencyPercent === undefined ? null : spec.fillTransparencyPercent,
})

// WHY: a plain Task in row B from day 2 to day 12, so the left frame line of the default box crosses its bar.
const TASK = {
  uid: TASK_UID,
  wbsParentUid: null,
  wbsOrder: 1,
  name: null,
  start: day(2),
  finish: day(12),
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
}

function fixtureDocument(fixture: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100 },
      calendars: schedule['calendars'],
      tasks: fixture.withTask === true ? [structuredClone(TASK)] : [],
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
      taskGroupMembers: fixture.withTask === true ? [{ taskUid: TASK_UID, groupId: ROW.B }] : [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: (fixture.boxes ?? [{}]).map(boxRecord),
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
  send(input: PointerInput): void
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
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  let svg = ''
  const loop = frameLoop({ showSvg: (drawn: string) => void (svg = drawn) } as never, fixtureDocument(fixture), SCREEN, wiring)
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    lastSvg: () => svg,
  }
}

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ctrl: false, shift: false, alt: false, meta: false },
  clickCount: 1,
})

const valuesOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const drawnBox = (loop: FrameLoop, id: string = BOX_ID) => {
  const found = valuesOf(loop).geometry.highlightBoxes.find((one) => one.id === id)
  if (found === undefined) throw new Error(`the frame drew no highlight box ${id}`)
  return found
}

const rowBand = (loop: FrameLoop, letter: Letter): { readonly y: number; readonly height: number } => {
  const found = valuesOf(loop).layout.rows.find((one) => one.groupId === ROW[letter])
  if (found === undefined) throw new Error(`the frame drew no row ${letter}`)
  return found
}

const rowStep = (loop: FrameLoop): number => rowBand(loop, 'C').y - rowBand(loop, 'B').y

const hitAt = (loop: FrameLoop, at: Point): Hit | null => itemAtPointer(valuesOf(loop).geometry, at.x, at.y, grabSizesOf())

type PointName = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right' | 'top' | 'bottom'

interface GrabPoint {
  readonly name: PointName
  readonly hb: 'HB-8' | 'HB-9' | 'HB-10' | 'HB-11'
  readonly at: (box: ScreenRect) => Point
  readonly part: Hit['boxPart']
}

// see HB-8, HB-9, HB-10, HB-11
const GRAB_POINTS: readonly GrabPoint[] = [
  { name: 'top-left', hb: 'HB-8', at: (b) => ({ x: b.x, y: b.y }), part: { kind: 'corner', horizontal: 'left', vertical: 'top' } },
  { name: 'bottom-right', hb: 'HB-8', at: (b) => ({ x: b.x + b.width, y: b.y + b.height }), part: { kind: 'corner', horizontal: 'right', vertical: 'bottom' } },
  { name: 'top-right', hb: 'HB-9', at: (b) => ({ x: b.x + b.width, y: b.y }), part: { kind: 'corner', horizontal: 'right', vertical: 'top' } },
  { name: 'bottom-left', hb: 'HB-9', at: (b) => ({ x: b.x, y: b.y + b.height }), part: { kind: 'corner', horizontal: 'left', vertical: 'bottom' } },
  { name: 'left', hb: 'HB-10', at: (b) => ({ x: b.x, y: b.y + b.height / 2 }), part: { kind: 'edge', side: 'left' } },
  { name: 'right', hb: 'HB-10', at: (b) => ({ x: b.x + b.width, y: b.y + b.height / 2 }), part: { kind: 'edge', side: 'right' } },
  { name: 'top', hb: 'HB-11', at: (b) => ({ x: b.x + b.width / 2, y: b.y }), part: { kind: 'edge', side: 'top' } },
  { name: 'bottom', hb: 'HB-11', at: (b) => ({ x: b.x + b.width / 2, y: b.y + b.height }), part: { kind: 'edge', side: 'bottom' } },
]

const grabPoint = (name: PointName): GrabPoint => GRAB_POINTS.find((one) => one.name === name)!

// WHY: a quarter along the top line is on the frame and clear of every grab point of the default box.
const onTheFrame = (box: ScreenRect): Point => ({ x: box.x + box.width / 4, y: box.y })

const storedBox = (loop: FrameLoop, id: string = BOX_ID): Record<string, unknown> => {
  const found = (loop.document().schedule.highlightBoxes as unknown as readonly Record<string, unknown>[]).find(
    (one) => one['id'] === id,
  )
  if (found === undefined) throw new Error(`the document has no highlight box ${id}`)
  return structuredClone(found)
}

const rangeText = (loop: FrameLoop): string => {
  const stored = storedBox(loop)
  const dayOf = (value: unknown): number => Number(String(value).slice(8, 10))
  return `${dayOf(stored['startDate'])}..${dayOf(stored['endDate'])} ${LETTER_OF[String(stored['topGroupId'])]}..${LETTER_OF[String(stored['bottomGroupId'])]}`
}

function drag(built: Stage, from: Point, dx: number, dy: number): void {
  built.send(pointer('down', from))
  built.send(pointer('move', { x: from.x + dx / 2, y: from.y + dy / 2 }))
  built.send(pointer('move', { x: from.x + dx, y: from.y + dy }))
  built.send(pointer('up', { x: from.x + dx, y: from.y + dy }))
}

function click(built: Stage, at: Point): void {
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

interface Tag {
  readonly text: string
  readonly at: number
}

const tagsOf = (svg: string, figure: RegExp): readonly Tag[] =>
  [...svg.matchAll(/<rect\b[^>]*>/g)]
    .filter((one) => figure.test(/data-figure="([^"]*)"/.exec(one[0])?.[1] ?? ''))
    .map((one) => ({ text: one[0], at: one.index ?? 0 }))

const attributeOf = (tag: string, name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null

const numberAttribute = (tag: string, name: string): number => Number(attributeOf(tag, name) ?? Number.NaN)

// WHY: the layer an element sits in is the last data-zo opened before it in the drawn text.
const layerOf = (svg: string, at: number): string | null => {
  const opened = [...svg.slice(0, at).matchAll(/data-zo="([^"]+)"/g)]
  return opened.length === 0 ? null : (opened[opened.length - 1]![1] ?? null)
}

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const FILL_FIGURE = (id: string): RegExp => new RegExp(`^box-${escaped(id)}-fill$`)
const FRAME_FIGURE = (id: string): RegExp => new RegExp(`^box-${escaped(id)}$`)
const GRAB_FIGURE = (id: string): RegExp => new RegExp(`^box-${escaped(id)}-grab-\\d+$`)

describe('CR-558 premises: the clauses these cases read, and the fixture they stand on', () => {
  it('T-023d, FR-106, FR-019 and the reading rule of 05-07-design still say it, word for word', () => {
    for (const clause of [
      EIGHT_THEN_FRAME,
      NEAREST_WINS,
      TIE_ORDER,
      DRAWN_WHILE_SELECTED,
      POINTS_AT_ZO_10,
      UNDRAWN_STILL_ANSWER,
      FRAME_ON_A_SHAPE,
      POINTS_ON_A_SHAPE,
      INSIDE_PASSES_THROUGH,
      FR_106_HIGHLIGHT,
      NULL_DRAWS_THE_DEFAULT,
      NULL_FILL_IS_THE_THEME,
      PLACED_UNFILLED,
      OPACITY,
      TRANSPARENT_IS_NOT_FILLED,
      FILL_AT_ZO_14,
      CLAMPED_NOT_REWRITTEN,
      OUT_OF_RANGE_REFUSED,
      NO_TRANSPARENT_OUTLINE,
      NOT_BOTH_TRANSPARENT,
      FILL_MAY_BE_TRANSPARENT,
    ]) {
      expect(REQUIREMENTS, 'the requirements lost a clause').toContain(clause)
    }
    for (const clause of [MISSING_COLUMNS_READ_AS_NULL, WHATEVER_THE_VERSION, SILENTLY]) {
      expect(DESIGN, 'the design lost a clause').toContain(clause)
    }
  })

  it('T-206 and T-217 give every value these cases use one number, and S-370 names transparent', () => {
    for (const value of [S_230, S_293, S_372, S_373, S_174]) expect(value).toBeGreaterThan(0)
    expect(S_369.low).toBeLessThan(S_369.high)
    expect(S_371.low).toBeLessThan(S_371.high)
    expect(S_370_FALLBACK).toBe('transparent')
  })

  it('T-246 names a pointer row for each of HB-8 .. HB-12, and each is a row of T-269', () => {
    const rows = ['HB-8', 'HB-9', 'HB-10', 'HB-11', 'HB-12'].map(pointerOfHb)
    expect(new Set(rows).size, 'two HB rows share one pointer').toBe(5)
    for (const row of rows) expect(environmentShapeOf(row)).toMatch(/^[a-z-]+$/)
  })

  it('the default box is wider and taller than S-373 and every row is taller than two S-230', () => {
    const built = stage()
    const box = drawnBox(built.loop).box
    expect(box.width).toBeGreaterThanOrEqual(S_373)
    expect(box.height).toBeGreaterThanOrEqual(S_373)
    for (const letter of LETTERS) expect(rowBand(built.loop, letter).height).toBeGreaterThan(2 * S_230)
    expect(box.width / 4, 'the frame press is clear of both grab points').toBeGreaterThan(2 * S_230)
  })
})

describe(`T-246 HB-8 .. HB-11 and HB-7: each of the eight points moves exactly the sides it names -- ${UNDRAWN_STILL_ANSWER}`, () => {
  // WHY: B..D over days 6..16; each press is dead on its point, released three day columns right and
  // WHY: one drawn row down, so every release sits on a day boundary and a row boundary.
  const EXPECTED: Readonly<Record<PointName, string>> = {
    'top-left': '9..16 C..D',
    'top-right': '6..19 C..D',
    'bottom-left': '9..16 B..E',
    'bottom-right': '6..19 B..E',
    left: '9..16 B..D',
    right: '6..19 B..D',
    top: '6..16 C..D',
    bottom: '6..16 B..E',
  }

  for (const point of GRAB_POINTS) {
    it(`${point.hb} the ${point.name} point, pressed on an unselected box, gives ${EXPECTED[point.name]}`, () => {
      const built = stage()
      const at = point.at(drawnBox(built.loop).box)
      drag(built, at, 3 * valuesOf(built.loop).layout.pxPerDay, rowStep(built.loop))
      expect(rangeText(built.loop), `${point.hb} ${point.name}`).toBe(EXPECTED[point.name])
    })
  }

  it('HB-7 with HB-6: the top midpoint pulled four rows down, past the bottom edge, gives D..E', () => {
    const built = stage()
    drag(built, grabPoint('top').at(drawnBox(built.loop).box), 0, 4 * rowStep(built.loop))
    expect(rangeText(built.loop)).toBe('6..16 D..E')
  })

  it('HB-7 with HB-6: the left midpoint pulled twelve days right, past the right edge, gives 16..17', () => {
    const built = stage()
    drag(built, grabPoint('left').at(drawnBox(built.loop).box), 12 * valuesOf(built.loop).layout.pxPerDay, 0)
    expect(rangeText(built.loop)).toBe('16..17 B..D')
  })

  it('HB-12 the frame, pressed away from every grab point, moves the box without changing its size', () => {
    const built = stage()
    drag(built, onTheFrame(drawnBox(built.loop).box), 3 * valuesOf(built.loop).layout.pxPerDay, rowStep(built.loop))
    expect(rangeText(built.loop)).toBe('9..19 C..E')
  })
})

describe(`T-023d: which part of the box a press answers -- ${EIGHT_THEN_FRAME}`, () => {
  for (const point of GRAB_POINTS) {
    it(`the ${point.name} point answers as GR-14 ${point.hb}`, () => {
      const built = stage()
      const hit = hitAt(built.loop, point.at(drawnBox(built.loop).box))
      expect(hit?.grab).toBe('GR-14')
      expect(hit?.item).toEqual({ kind: 'highlightBox', id: BOX_ID })
      expect(hit?.boxPart, `${point.hb} ${point.name}`).toEqual(point.part)
    })
  }

  it(`the frame between two points answers as the body (HB-12), and ${INSIDE_PASSES_THROUGH}`, () => {
    const built = stage()
    const box = drawnBox(built.loop).box
    const frame = hitAt(built.loop, onTheFrame(box))
    expect(frame?.grab).toBe('GR-14')
    expect(frame?.boxPart ?? { kind: 'body' }).toEqual({ kind: 'body' })
    const inside = hitAt(built.loop, { x: box.x + box.width / 4, y: box.y + box.height / 4 })
    expect(inside?.grab, 'the inside of the box answered as the box').not.toBe('GR-14')
  })

  it('HB-10 / HB-11: a side shorter than S-373 has no midpoint, so the middle of that side is frame', () => {
    const built = stage({ boxes: [{ top: 'B', bottom: 'B', start: 6, end: 6 }] })
    const drawn = drawnBox(built.loop)
    expect(drawn.box.height, 'premise: one row is shorter than S-373').toBeLessThan(S_373)
    expect(drawn.box.width, 'premise: one day is shorter than S-373').toBeLessThan(S_373)
    expect(drawn.box.height / 2, 'premise: the middle of a side is clear of its corners').toBeGreaterThan(S_230)
    for (const name of ['left', 'right'] as const) {
      const hit = hitAt(built.loop, grabPoint(name).at(drawn.box))
      expect(hit?.grab, name).toBe('GR-14')
      expect(hit?.boxPart ?? { kind: 'body' }, `${name}: a short side holds no midpoint`).toEqual({ kind: 'body' })
    }
    expect(drawn.hasSideHandles).toEqual({ leftRight: false, topBottom: false })
  })

  it('HB-10 / HB-11: a side at least S-373 long keeps its midpoint while the other side has none', () => {
    const built = stage({ boxes: [{ top: 'B', bottom: 'B' }] })
    const drawn = drawnBox(built.loop)
    expect(drawn.box.height).toBeLessThan(S_373)
    expect(drawn.box.width).toBeGreaterThanOrEqual(S_373)
    expect(hitAt(built.loop, grabPoint('top').at(drawn.box))?.boxPart).toEqual({ kind: 'edge', side: 'top' })
    expect(hitAt(built.loop, grabPoint('left').at(drawn.box))?.boxPart ?? { kind: 'body' }).toEqual({ kind: 'body' })
    expect(drawn.hasSideHandles).toEqual({ leftRight: false, topBottom: true })
  })

  it('the frame reaches half the drawn stroke width plus S-293 from the line, and no further', () => {
    const width = S_369.high
    const built = stage({ boxes: [{ strokeWidthPx: width }] })
    const box = drawnBox(built.loop).box
    const x = box.x + box.width / 4
    expect(hitAt(built.loop, { x, y: box.y - (width / 2 + S_293 - 0.5) })?.grab, 'just inside the reach').toBe('GR-14')
    expect(hitAt(built.loop, { x, y: box.y - (width / 2 + S_293 + 0.5) })?.grab ?? null, 'just outside the reach').not.toBe('GR-14')
  })
})

describe(`T-023d: ${FRAME_ON_A_SHAPE}`, () => {
  const WIDTH = S_369.high
  const scene = () => {
    const built = stage({ withTask: true, boxes: [{ strokeWidthPx: WIDTH }] })
    const box = drawnBox(built.loop).box
    const drawnTask = valuesOf(built.loop).geometry.tasks.find((one) => one.taskUid === TASK_UID)
    if (drawnTask === undefined) throw new Error('the frame drew no task')
    const bar = boxOfBar(drawnTask.plan, 'the plan bar')
    return { built, box, bar, onShapeY: (bar.y0 + bar.y1) / 2, offShapeY: rowBand(built.loop, 'D').y + rowBand(built.loop, 'D').height / 2 }
  }

  it('premise: the left frame line crosses the plan bar, clear of every grab point', () => {
    const { box, bar, onShapeY, offShapeY } = scene()
    expect(bar.x0).toBeLessThan(box.x - WIDTH)
    expect(bar.x1).toBeGreaterThan(box.x + WIDTH / 2 + S_293 + 1)
    for (const y of [onShapeY, offShapeY]) {
      expect(Math.abs(y - box.y), 'clear of the top corners').toBeGreaterThan(S_230)
      expect(Math.abs(y - (box.y + box.height)), 'clear of the bottom corners').toBeGreaterThan(S_230)
      expect(Math.abs(y - (box.y + box.height / 2)), 'clear of the left midpoint').toBeGreaterThan(S_230)
    }
  })

  it('off the shape, a press beyond half the stroke width but within S-293 of its edge is the frame', () => {
    const { built, box, offShapeY } = scene()
    const hit = hitAt(built.loop, { x: box.x + WIDTH / 2 + S_293 / 2, y: offShapeY })
    expect(hit?.grab).toBe('GR-14')
  })

  it('on the shape, the same press is not the frame -- the task under it answers', () => {
    const { built, box, onShapeY } = scene()
    const hit = hitAt(built.loop, { x: box.x + WIDTH / 2 + S_293 / 2, y: onShapeY })
    expect(hit?.grab ?? null).not.toBe('GR-14')
    expect(hit?.item).toEqual({ kind: 'task', taskUid: TASK_UID })
  })

  it('on the shape, a press within half the stroke width is still the frame', () => {
    const { built, box, onShapeY } = scene()
    const hit = hitAt(built.loop, { x: box.x + WIDTH / 2 - 1, y: onShapeY })
    expect(hit?.grab).toBe('GR-14')
    expect(hit?.item).toEqual({ kind: 'highlightBox', id: BOX_ID })
  })

  it(`${POINTS_ON_A_SHAPE} -- the top-left corner over the bar still answers within S-230`, () => {
    const built = stage({ withTask: true, boxes: [{ start: 6, end: 16, top: 'B', bottom: 'D' }] })
    const box = drawnBox(built.loop).box
    const hit = hitAt(built.loop, { x: box.x + S_230 - 1, y: box.y + S_230 - 1 })
    expect(hit?.boxPart).toEqual({ kind: 'corner', horizontal: 'left', vertical: 'top' })
  })
})

describe(`T-023d: ${NEAREST_WINS} ${TIE_ORDER}`, () => {
  const tiny = () => {
    const built = stage({ boxes: [{ start: 6, end: 6, top: 'B', bottom: 'B' }], zoomFactor: 0.4 })
    return { built, box: drawnBox(built.loop).box }
  }

  it('premise: one day is narrower than two S-230, so the reaches of the two top corners overlap', () => {
    const { box } = tiny()
    expect(box.width).toBeLessThan(2 * S_230)
    expect(box.width).toBeGreaterThan(2)
  })

  it('a press nearer the top-left corner takes the top-left corner', () => {
    const { built, box } = tiny()
    expect(hitAt(built.loop, { x: box.x + box.width / 2 - 1, y: box.y })?.boxPart).toEqual(grabPoint('top-left').part)
  })

  it('a press nearer the top-right corner takes the top-right corner, though the top-left reaches it too', () => {
    const { built, box } = tiny()
    const at = { x: box.x + box.width / 2 + 1, y: box.y }
    expect(at.x - box.x, 'premise: the top-left reach holds the press').toBeLessThanOrEqual(S_230)
    expect(hitAt(built.loop, at)?.boxPart).toEqual(grabPoint('top-right').part)
  })

  it('a press equally far from both takes HB-8 (top-left), the upper row of table T-246', () => {
    const { built, box } = tiny()
    expect(hitAt(built.loop, { x: box.x + box.width / 2, y: box.y })?.boxPart).toEqual(grabPoint('top-left').part)
  })

  it('the same holds at the bottom: equally far from bottom-left (HB-9) and bottom-right (HB-8) takes bottom-right', () => {
    const { built, box } = tiny()
    expect(hitAt(built.loop, { x: box.x + box.width / 2, y: box.y + box.height })?.boxPart).toEqual(grabPoint('bottom-right').part)
  })
})

describe(`FR-106: ${FR_106_HIGHLIGHT}`, () => {
  for (const point of GRAB_POINTS) {
    it(`the ${point.name} point shows the ${point.hb} pointer, drawn as the environment shape table T-269 names`, () => {
      const built = stage()
      const hit = hitAt(built.loop, point.at(drawnBox(built.loop).box))
      const row = pointerRowOf(hit as never, false)
      expect(row, point.hb).toBe(pointerOfHb(point.hb))
      expect(pointerImageOf(row as never), row ?? '').toBe(environmentShapeOf(pointerOfHb(point.hb)))
    })
  }

  it('the frame shows the HB-12 pointer', () => {
    const built = stage()
    const row = pointerRowOf(hitAt(built.loop, onTheFrame(drawnBox(built.loop).box)) as never, false)
    expect(row).toBe(pointerOfHb('HB-12'))
    expect(pointerImageOf(row as never)).toBe(environmentShapeOf(pointerOfHb('HB-12')))
  })
})

describe(`T-023d: ${DRAWN_WHILE_SELECTED}`, () => {
  const TWO_BOXES: Fixture = { boxes: [{}, { id: OTHER_ID, start: 20, end: 30, top: 'F', bottom: 'F' }] }

  it('no grab point is drawn while no box is selected', () => {
    const built = stage(TWO_BOXES)
    expect(tagsOf(built.lastSvg(), GRAB_FIGURE(BOX_ID))).toEqual([])
    expect(tagsOf(built.lastSvg(), GRAB_FIGURE(OTHER_ID))).toEqual([])
  })

  it(`selecting one box draws its eight points and none of the other box's, ${POINTS_AT_ZO_10}`, () => {
    const built = stage(TWO_BOXES)
    click(built, onTheFrame(drawnBox(built.loop).box))
    const svg = built.lastSvg()
    const squares = tagsOf(svg, GRAB_FIGURE(BOX_ID))
    expect(squares).toHaveLength(8)
    expect(tagsOf(svg, GRAB_FIGURE(OTHER_ID))).toEqual([])
    for (const square of squares) expect(layerOf(svg, square.at), square.text).toBe('ZO-10')
  })

  it('each square is S-372 on a side, centred on its point, with the S-146 ground, the S-151 edge and the S-174 edge width', () => {
    const built = stage()
    const box = drawnBox(built.loop).box
    click(built, onTheFrame(box))
    const squares = tagsOf(built.lastSvg(), GRAB_FIGURE(BOX_ID))
    const centres = squares.map((one) => ({
      x: numberAttribute(one.text, 'x') + numberAttribute(one.text, 'width') / 2,
      y: numberAttribute(one.text, 'y') + numberAttribute(one.text, 'height') / 2,
    }))
    for (const point of GRAB_POINTS) {
      const wanted = point.at(box)
      expect(
        centres.some((one) => Math.abs(one.x - wanted.x) < 0.05 && Math.abs(one.y - wanted.y) < 0.05),
        `no square is centred on the ${point.name} point`,
      ).toBe(true)
    }
    for (const square of squares) {
      expect(numberAttribute(square.text, 'width')).toBe(S_372)
      expect(numberAttribute(square.text, 'height')).toBe(S_372)
      expect(attributeOf(square.text, 'fill') ?? '').toMatch(themeColourPattern('S-146'))
      expect(attributeOf(square.text, 'stroke') ?? '').toMatch(themeColourPattern('S-151'))
      expect(numberAttribute(square.text, 'stroke-width')).toBe(S_174)
    }
  })

  it('a selected box with short sides draws only the points it has (HB-10 / HB-11 withheld)', () => {
    const built = stage({ boxes: [{ start: 6, end: 6, top: 'B', bottom: 'B' }] })
    const box = drawnBox(built.loop).box
    click(built, { x: box.x + box.width / 2, y: box.y })
    expect(tagsOf(built.lastSvg(), GRAB_FIGURE(BOX_ID))).toHaveLength(4)
  })
})

describe('FR-019: the stroke width and the fill a box is drawn with', () => {
  const drawnSvg = (spec: BoxSpec): string => stage({ boxes: [spec] }).lastSvg()

  it(`${OPACITY} -- 30 draws fill-opacity 0.7, at ZO-14, with no stroke; ${FILL_AT_ZO_14}`, () => {
    const svg = drawnSvg({ fillColor: 'blue', fillTransparencyPercent: 30 })
    const fills = tagsOf(svg, FILL_FIGURE(BOX_ID))
    expect(fills).toHaveLength(1)
    const fill = fills[0]!
    expect(layerOf(svg, fill.at)).toBe('ZO-14')
    expect(numberAttribute(fill.text, 'fill-opacity')).toBeCloseTo(1 - 30 / 100, 6)
    expect(attributeOf(fill.text, 'stroke')).toBe('none')
    expect(paletteFills('blue')).toContain(attributeOf(fill.text, 'fill'))
  })

  it(`${OPACITY} -- 0 is opaque and 100 draws opacity 0`, () => {
    for (const [percent, opacity] of [[0, 1], [100, 0], [75, 0.25]] as const) {
      const fill = tagsOf(drawnSvg({ fillColor: 'red', fillTransparencyPercent: percent }), FILL_FIGURE(BOX_ID))[0]
      expect(fill, `transparency ${percent}`).toBeDefined()
      expect(numberAttribute(fill!.text, 'fill-opacity'), `transparency ${percent}`).toBeCloseTo(opacity, 6)
    }
  })

  it('a custom colour is drawn with the value it holds (CV-3 / CV-6)', () => {
    const fill = tagsOf(drawnSvg({ fillColor: '#123456/', fillTransparencyPercent: 0 }), FILL_FIGURE(BOX_ID))[0]
    expect(attributeOf(fill?.text ?? '', 'fill')?.toLowerCase()).toBe('#123456')
  })

  it(`${TRANSPARENT_IS_NOT_FILLED} -- transparent draws no fill`, () => {
    expect(tagsOf(drawnSvg({ fillColor: 'transparent', fillTransparencyPercent: 0 }), FILL_FIGURE(BOX_ID))).toEqual([])
  })

  it(`${NULL_FILL_IS_THE_THEME} -- a null fill is painted`, () => {
    expect(tagsOf(drawnSvg({ fillColor: null }), FILL_FIGURE(BOX_ID))).toHaveLength(1)
  })

  it(`${NULL_DRAWS_THE_DEFAULT} -- a null transparency draws S-371's default`, () => {
    const fill = tagsOf(drawnSvg({ fillColor: 'green', fillTransparencyPercent: null }), FILL_FIGURE(BOX_ID))[0]
    expect(numberAttribute(fill?.text ?? '', 'fill-opacity')).toBeCloseTo(1 - S_371.fallback / 100, 6)
  })

  it(`the frame is drawn with the stroke width the column holds, and a null column draws S-369's default`, () => {
    for (const [held, drawn] of [[3, 3], [S_369.high, S_369.high], [null, S_369.fallback]] as const) {
      const frame = tagsOf(drawnSvg({ strokeWidthPx: held }), FRAME_FIGURE(BOX_ID))
      expect(frame, `stroke width ${String(held)}`).toHaveLength(1)
      expect(numberAttribute(frame[0]!.text, 'stroke-width'), `stroke width ${String(held)}`).toBe(drawn)
    }
  })

  it(`${CLAMPED_NOT_REWRITTEN} -- out-of-range stored values are drawn at the nearer bound, and the document keeps them`, () => {
    const cases = [
      { spec: { strokeWidthPx: S_369.high + 12, fillColor: 'red', fillTransparencyPercent: S_371.high + 50 }, width: S_369.high, opacity: 1 - S_371.high / 100 },
      { spec: { strokeWidthPx: S_369.low - 1, fillColor: 'red', fillTransparencyPercent: S_371.low - 10 }, width: S_369.low, opacity: 1 - S_371.low / 100 },
    ]
    for (const one of cases) {
      const built = stage({ boxes: [one.spec] })
      const svg = built.lastSvg()
      expect(numberAttribute(tagsOf(svg, FRAME_FIGURE(BOX_ID))[0]?.text ?? '', 'stroke-width')).toBe(one.width)
      const fill = tagsOf(svg, FILL_FIGURE(BOX_ID))[0]
      if (one.opacity > 0) expect(numberAttribute(fill?.text ?? '', 'fill-opacity')).toBeCloseTo(one.opacity, 6)
      else expect(fill === undefined || numberAttribute(fill.text, 'fill-opacity') === 0, 'a fill drawn above opacity 0').toBe(true)
      const stored = storedBox(built.loop)
      expect(stored['strokeWidthPx'], 'the document was rewritten').toBe(one.spec.strokeWidthPx)
      expect(stored['fillTransparencyPercent'], 'the document was rewritten').toBe(one.spec.fillTransparencyPercent)
    }
  })
})

describe(`05-07-design: ${MISSING_COLUMNS_READ_AS_NULL}`, () => {
  const COLUMNS = ['strokeWidthPx', 'fillColor', 'fillTransparencyPercent'] as const

  const withoutColumns = (schemaVersion?: string): string => {
    const document = JSON.parse(JSON.stringify(fixtureDocument())) as Record<string, any>
    for (const box of document['schedule']['highlightBoxes'] as Record<string, unknown>[]) {
      for (const column of COLUMNS) delete box[column]
    }
    if (schemaVersion !== undefined) document['schemaVersion'] = schemaVersion
    return JSON.stringify(document)
  }

  for (const [label, version] of [['the version this build writes', undefined], ['an older version', '2026-08-20']] as const) {
    it(`${WHATEVER_THE_VERSION} -- ${label}: the box opens with the three columns null, and ${SILENTLY}`, () => {
      const read = documentFromJson(withoutColumns(version))
      if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
      const box = (read.document.schedule.highlightBoxes as unknown as readonly Record<string, unknown>[])[0]!
      for (const column of COLUMNS) {
        expect(Object.prototype.hasOwnProperty.call(box, column), `${column} was not added`).toBe(true)
        expect(box[column], column).toBeNull()
      }
      expect(read.unreadColumns, 'the added columns were told as unread').toEqual([])
      expect(read.clampedCount, 'the added columns were told as clamped').toBe(0)
    })
  }

  it(`${CLAMPED_NOT_REWRITTEN} -- an out-of-range stored value is read as it stands`, () => {
    const document = JSON.parse(JSON.stringify(fixtureDocument({ boxes: [{ strokeWidthPx: S_369.high + 12, fillTransparencyPercent: S_371.high + 50 }] })))
    const read = documentFromJson(JSON.stringify(document))
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
    const box = (read.document.schedule.highlightBoxes as unknown as readonly Record<string, unknown>[])[0]!
    expect(box['strokeWidthPx']).toBe(S_369.high + 12)
    expect(box['fillTransparencyPercent']).toBe(S_371.high + 50)
  })
})

describe(`T-108 CM-77 .. CM-79: ${OUT_OF_RANGE_REFUSED}`, () => {
  const document = (): Document => fixtureDocument()

  const refusalOf = (command: Parameters<typeof editAnnotation>[1]): { command?: string; rule: string } | null => {
    const result = editAnnotation(document(), command)
    if (result.ok) return null
    expect(result.refusals).toHaveLength(1)
    return result.refusals[0] as { command?: string; rule: string }
  }

  const acceptedBox = (command: Parameters<typeof editAnnotation>[1]): Record<string, unknown> => {
    const result = editAnnotation(document(), command)
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    const found = (result.document.schedule.highlightBoxes as unknown as readonly Record<string, unknown>[]).find((one) => one['id'] === BOX_ID)
    if (found === undefined) throw new Error('the box is gone')
    return found
  }

  it('CM-77 places a width inside S-369, and null, and refuses one outside it or not whole', () => {
    for (const width of [S_369.low, S_369.high, null]) {
      expect(acceptedBox({ kind: 'setHighlightBoxStrokeWidth', id: BOX_ID, strokeWidthPx: width })['strokeWidthPx']).toBe(width)
    }
    for (const width of [S_369.low - 1, S_369.high + 1, S_369.low + 0.5]) {
      expect(refusalOf({ kind: 'setHighlightBoxStrokeWidth', id: BOX_ID, strokeWidthPx: width }), `width ${width}`).toEqual(
        expect.objectContaining({ command: 'CM-77', rule: 'S-369' }),
      )
    }
  })

  it('CM-79 places a transparency inside S-371, and null, and refuses one outside it or not whole', () => {
    for (const percent of [S_371.low, S_371.high, null]) {
      expect(acceptedBox({ kind: 'setHighlightBoxFillTransparency', id: BOX_ID, fillTransparencyPercent: percent })['fillTransparencyPercent']).toBe(percent)
    }
    for (const percent of [S_371.low - 1, S_371.high + 1, 12.5]) {
      expect(refusalOf({ kind: 'setHighlightBoxFillTransparency', id: BOX_ID, fillTransparencyPercent: percent }), `percent ${percent}`).toEqual(
        expect.objectContaining({ command: 'CM-79', rule: 'S-371' }),
      )
    }
  })

  it(`CM-78 places a palette name, a custom colour, transparent and null (${FILL_MAY_BE_TRANSPARENT}), and refuses what is not a colour (CV-1)`, () => {
    for (const colour of ['red', '#123456/', 'transparent', null]) {
      expect(acceptedBox({ kind: 'setHighlightBoxFillColor', id: BOX_ID, fillColor: colour })['fillColor']).toBe(colour)
    }
    for (const colour of ['crimson', '#12345', '']) {
      expect(refusalOf({ kind: 'setHighlightBoxFillColor', id: BOX_ID, fillColor: colour }), `colour ${colour}`).toEqual(
        expect.objectContaining({ command: 'CM-78', rule: 'CV-1' }),
      )
    }
  })

  it('each of the three commands refuses a box that does not exist (AT-116)', () => {
    const missing = '3b000000-0000-4000-8000-0000000000ff'
    expect(refusalOf({ kind: 'setHighlightBoxStrokeWidth', id: missing, strokeWidthPx: 2 })).toEqual(expect.objectContaining({ command: 'CM-77', rule: 'AT-116' }))
    expect(refusalOf({ kind: 'setHighlightBoxFillColor', id: missing, fillColor: 'red' })).toEqual(expect.objectContaining({ command: 'CM-78', rule: 'AT-116' }))
    expect(refusalOf({ kind: 'setHighlightBoxFillTransparency', id: missing, fillTransparencyPercent: 2 })).toEqual(expect.objectContaining({ command: 'CM-79', rule: 'AT-116' }))
  })

  it(`${NO_TRANSPARENT_OUTLINE} -- CM-55 takes a transparent outline`, () => {
    expect(editAnnotation(document(), { kind: 'setHighlightBoxStrokeColor', id: BOX_ID, strokeColor: 'transparent' }).ok).toBe(true)
  })

  it('placing the value a column already holds leaves the box as it was', () => {
    const before = storedBox(stage().loop)
    for (const command of [
      { kind: 'setHighlightBoxStrokeWidth', id: BOX_ID, strokeWidthPx: null },
      { kind: 'setHighlightBoxFillColor', id: BOX_ID, fillColor: null },
      { kind: 'setHighlightBoxFillTransparency', id: BOX_ID, fillTransparencyPercent: null },
    ] as const) {
      expect(acceptedBox(command), command.kind).toEqual(before)
    }
  })

  it(`${PLACED_UNFILLED} -- createHighlightBox leaves width and transparency null and copies S-370 to the fill`, () => {
    const result = editAnnotation(document(), {
      kind: 'createHighlightBox',
      id: OTHER_ID,
      range: { startDate: day(20), endDate: day(22), topGroupId: ROW.E, bottomGroupId: ROW.F },
    })
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    const made = (result.document.schedule.highlightBoxes as unknown as readonly Record<string, unknown>[]).find((one) => one['id'] === OTHER_ID)
    expect(made?.['strokeWidthPx']).toBeNull()
    expect(made?.['fillColor']).toBe(S_370_FALLBACK)
    expect(made?.['fillTransparencyPercent']).toBeNull()
  })
})

describe('control -- the checks here can go red', () => {
  it('a range text reads a moved box differently from an unmoved one', () => {
    const built = stage()
    const before = rangeText(built.loop)
    drag(built, onTheFrame(drawnBox(built.loop).box), 2 * valuesOf(built.loop).layout.pxPerDay, 0)
    expect(rangeText(built.loop)).not.toBe(before)
  })

  it('one character off a quoted clause is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(OPACITY.replace('100', '10'))
  })
})
