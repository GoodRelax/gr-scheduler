// `SL-3` of 表 T-023c and `ZO-6` of 表 T-020, as the user's ruling of
// 2026-08-29 left them: while a range selection is HELD, the rectangle being
// taken is drawn -- and the moment the button is let go, the rectangle goes and
// the selection stays.
//
// The unit these arrive on is UF-48 `single-html-shell` (CP-25 of table T-062),
// whose `frame-loop.ts` takes FT-1 of table T-078 -- 人の入力（ポインタとキー）
// -- on `receiveInput`, and hands the finished picture to `IF-1`'s surface
// (`SvgSurface.showSvg`). ⭐ THE PICTURE IS WHERE THIS RULE LIVES: `SL-3` says
// 描くこと, and 表 T-020 orders what is drawn, so the string that crosses that
// seam is the only place either row can be judged.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE, AND WHY IT IS NOT A LIVE CASE
// ---------------------------------------------------------------------------
// Table T-218 of Chapter 7 offers a rule about what the screen shows exactly
// two homes: `TS-3` (System, `tests/system/`, Playwright) and `TS-6` (Unit,
// `tests/unit/`, Vitest). ⛔ `TS-3` is not available to this rule. Every case
// under it is a `SW_SPEC_TEST` of Chapter 9, and `TW-2` of table T-219 requires
// each one to take an `SWS-xxx` of Chapter 6.1 as its PARENT -- and Chapter 6.1
// holds eight `SW_SPEC` nodes, none of which reaches a range selection:
//
//   SWS-1 目盛の刻みの間隔      SWS-5 イナズマ線の頂点
//   SWS-2 行の帯高と縦位置      SWS-6 MSPDI の正規化
//   SWS-3 依存線の経路          SWS-7 書き出した SVG の正規化
//   SWS-4 描くものの頂点        SWS-8 単一 HTML の内容セキュリティ方針
//
// ⛔ A node was NOT invented for it. `TS-6` has no receptacle in the
// specification either (「文法が `TEST_LEVEL` を `SW_SPEC_TEST` にしか置いて
// おらず、そこでも `Unit` は選べない」), and Chapter 7 says in as many words
// that having no receptacle does not mean the case need not be written --
// 「⚠️ 受け皿が無いことは、書かなくてよいという意味ではない」.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: 読んでよいのは冒頭の
// 宣言・公開する型・署名まで.)
//
// Exported declarations and head comments read, and nothing else:
//   frame-loop.ts        `FrameEnvironment`, `FrameValues`, `FrameLoop`,
//                        `ScreenWiring`, and the one signature
//                        `frameLoop(surface, first, env, screen?, files?,
//                        showPointerShape?)`
//   svg-surface.ts       `SvgSurface` and its one member `showSvg(svg)`
//   input-source.ts      `HumanInput`, `InputModifiers`, `PointerButton`,
//                        `PointerInput`, `PointerPhase`
//   screen-renderer.ts   `DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
//                        `ScreenView`
//   schedule-geometry.ts `Point`, `BarGeometry`, `TaskGeometry`
//   schedule-layout.ts   `ScheduleLayout` (`pxPerDay`, `rows`)
//   schedule.ts          the entity types this fixture writes out
//
// ⛔ NOT ONE NUMBER BELOW IS COPIED OUT OF `src/`. `S-174` and `S-175` are read
// out of 表 T-206 at run time; the colour is not written down at all but taken
// as a RELATION -- 「どれも `SL-8` の選択の枠が既に読んでいる行である」 -- so
// the case compares the rectangle against the frame the same run draws.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-023c SL-3  「範囲で選ぶ | 何にも当たらない場所からドラッグし、**矩形に
//           完全に囲まれた対象だけを取ること（MUST）。** 触れただけのものを
//           取ってはならない（MUST NOT）…**握っているあいだ、取ろうとしている
//           矩形を描くこと（MUST）**（利用者の裁定 2026-08-29）—— ⛔ **描かない
//           と、「完全に囲まれた」かどうかを人が離す前に確かめられない。**枠の
//           太さは `_assets/tbl-settings.md` の 表 T-206 の `S-174`、破線の刻み
//           は同表の `S-175`、色は同書の 表 T-236 の `S-151`、重ね順は
//           表 T-020 の `ZO-6` が持つ。⛔ **新しい値を起こさない** ——
//           **どれも `SL-8` の選択の枠が既に読んでいる行である**」
//   T-020 ZO-6   「6（最前面） | **範囲選択の矩形**（表 T-023c の `SL-3`）。
//           ⛔ **握っているあいだだけ描き、離したら消すこと（MUST）** ——
//           **離した時点で残るのは選択そのものであり、矩形ではない**」
//   T-023c SL-1  「対象 | **タスク・依存線・ハイライトボックス・コメント
//           ボックス・基準日線。**行（`TaskGroup`）は対象に含めない」-- which is
//           why a press inside an empty row band hits nothing.
//   T-023c SL-8  「タスク・ハイライトボックス・コメントボックスは、外接矩形に
//           沿った破線の枠で囲むこと（MUST）…枠の太さと破線の刻みは
//           `_assets/tbl-settings.md` の 表 T-206 の `S-174` ／ `S-175`、色は
//           同書の 表 T-236 の `S-151` が持つ」-- the row `SL-3` says it is
//           reading, and therefore the row a colour can be compared against.
//   T-023a PD-5  「何にも当たらない かつ 構えていない（AR-1）| **範囲選択**」
//   T-023a PD-1  「中ボタンドラッグ、または **`Ctrl` だけを伴う**左ドラッグ |
//           **パン。** 構えと当たりによらず優先する」-- the row evaluated first,
//           which is why the last case below expects NO rectangle for it.
//   T-206 S-174 「選択の枠の太さ（表 T-023c の `SL-8`）| 2px 🔎」
//   T-206 S-175 「選択の枠の破線の刻み（表 T-023c の `SL-8`）| 2 × 2px 🔎 …
//           ⭐ 描く長さと空ける長さの組である」
//   T-236 S-151 「強調の色 …選択と現在位置」
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - HOW THE RECTANGLE IS SPELLED IN THE SVG -- which element, in which group,
//     with which attributes beyond the three `SL-3` names. Nothing in the
//     specification settles the markup, so a case demanding one would be
//     inventing it. What is asked is that ONE element appear that was not there
//     before, that it be a rectangle, and that it wear the three values.
//   - THE COLOUR AS A LITERAL. 表 T-236 writes `S-151` with an `H` that stands
//     for `themeHue`, and resolving it here would put a second copy of that
//     substitution in the tree. `SL-3` says the row is one 「`SL-8` の選択の枠が
//     既に読んでいる」, so the case compares the two strokes instead.
//   - WHICH ITEMS A RELEASE TAKES. 「矩形に完全に囲まれた対象だけを取ること」 is
//     the OTHER half of `SL-3` and is older than this ruling; the one case below
//     that lets go does so to watch the RECTANGLE go, and reads the selection
//     only far enough to say that something was left behind.
//   - `SL-4`'s `Shift`. The row says a range selection with `Shift` adds to the
//     existing selection; it does not restate the drawing rule, and reading one
//     into it would be inventing it.
//   - WHERE THE RECTANGLE IS CLIPPED. No row says whether it stops at the edge
//     of the `Row Area`, so every drag below stays well inside it.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'

// ===========================================================================
// What the manuscript says, read at read time rather than copied
// ===========================================================================

/** One row of a numbered table, by its headings. */
function rowOf(tableId: string, rowId: string): Readonly<Record<string, string>> {
  const found = specTable(tableId).rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

/** The last cell of a row, which is where 表 T-023c and 表 T-020 state a rule. */
function ruleOf(tableId: string, rowId: string): string {
  const found = specTable(tableId).rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  const cell = found.cells[found.cells.length - 1]
  if (cell === undefined || cell.length === 0) {
    throw new Error(`table ${tableId} row ${rowId} states nothing`)
  }
  return cell
}

/** Every number a cell writes, in the order it writes them. */
const numbersIn = (cell: string): readonly number[] =>
  (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

const oneNumberOf = (where: string, cell: string): number => {
  const found = numbersIn(cell)
  const [only, ...rest] = found
  if (only === undefined || rest.length !== 0) {
    throw new Error(`${where}: the value is not one number, it is ${cell}`)
  }
  return only
}

/** `S-174` 「選択の枠の太さ」, in px. */
const FRAME_STROKE = oneNumberOf('table T-206 row S-174', rowOf('T-206', 'S-174')['既定'] ?? '')

/** `S-175` 「選択の枠の破線の刻み」 -- 描く長さと空ける長さの組. */
const FRAME_DASH: readonly number[] = (() => {
  const cell = rowOf('T-206', 'S-175')['既定'] ?? ''
  const found = numbersIn(cell)
  if (found.length !== 2) {
    throw new Error(`table T-206 row S-175: the dash is not a pair of numbers, it is ${cell}`)
  }
  return found
})()

// ===========================================================================
// The document these cases drive
// ===========================================================================

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it; the rows and the Task are written
// out here so that what is drawn can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

/** Six rows. The ids are UUIDs because `AT-51` is one. */
const ROWS = [
  '4a000000-0000-4000-8000-000000000001',
  '4a000000-0000-4000-8000-000000000002',
  '4a000000-0000-4000-8000-000000000003',
  '4a000000-0000-4000-8000-000000000004',
  '4a000000-0000-4000-8000-000000000005',
  '4a000000-0000-4000-8000-000000000006',
] as const

/** The one Task in the picture. It sits in the middle, with empty rows around it. */
const ALPHA_UID = 1
/** Its name, which is also how `ZO-5`'s label is found in the picture. */
const ALPHA_NAME = 'Alpha'
const ALPHA_ROW = ROWS[2] as string

/** Empty bands, one above the Task and one below it. Both are pressed in. */
const BAND_ABOVE = ROWS[0] as string
const BAND_BELOW = ROWS[4] as string

/** A stored date column, written the way the startup template writes one. */
const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

/** 1 day is this many px at zoom 1 -- `S-1`'s key, set wide so a day is legible. */
const PX_PER_DAY_AT_1X = 20

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  label,
  derivedFromTaskUid: null,
  order,
  isCollapsed: false,
  isHidden: false,
  color: null,
  height: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        // ⛔ NO 基準日. `CU-1`'s line runs the height of the `Row Area` and
        // would cross every drag below; this file's subject is the ONE element
        // a held drag adds, so the picture is kept as plain as the rows allow.
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      // ⭐ A NAME, so that ZO-5 (名称ラベル) really is in the picture: `ZO-6`
      // says the rectangle stands in front of everything, and the label is the
      // frontmost thing there is without it.
      tasks: [task({ uid: ALPHA_UID, name: ALPHA_NAME, start: day(8), finish: day(16) })],
      resources: [],
      assignments: [],
      taskGroups: ROWS.map((id, i) => group(id, i, `R${i + 1}`)),
      taskGroupMembers: [{ taskUid: ALPHA_UID, groupId: ALPHA_ROW, stackOrder: null }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
      // ⚠️ Pinned so every y below reads from the top of a band.
      stackDirection: 'down',
      scrollDate: '2026-04-01',
      scrollDayOffset: 0,
      scrollGroupId: ROWS[0],
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

// ===========================================================================
// The host UF-48 is given
// ===========================================================================

/** `BO-1` of table T-077 has already settled these by the time a loop exists. */
const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  /** Every picture handed over `IF-1` so far, in the order it was handed over. */
  readonly pictures: readonly string[]
  /** Run whatever the loop asked an animation frame for, until it asks no more. */
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and `LY-5` of table T-060 puts the
 * browser in this layer. ⛔ Nothing in this fake decides anything: it drains the
 * queue and keeps what it was handed.
 *
 * ⭐ The draining half is copied, deliberately unchanged, from
 * tests/unit/t-023d-follows-the-pointer.test.ts, which drives the same unit
 * through the same seam. What is added is that the pictures are KEPT -- this
 * file's subject is what one of them contains.
 */
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  const pictures: string[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: {
      showSvg: (svg: string) => {
        pictures.push(svg)
      },
    },
    pictures,
    runAnimationFrames: () => {
      // Bounded, so a loop that asks for a frame from inside a frame -- which
      // NFR-010 forbids -- ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

/**
 * A stand-in for `IF-9`'s surface that has drawn no UI part over the schedule.
 *
 * ⭐ WHY IT ANSWERS `null` EVERYWHERE. `PointerPress.on` is what admits table
 * T-023a: a press the surface answered for is a press on an entry and none of
 * the six gestures. Every press below lands on the schedule's own drawing area,
 * which is the one place table T-023a rules.
 */
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
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
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ===========================================================================
// Spelling one happening
// ===========================================================================

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton; readonly ctrl?: boolean } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS, ctrl: options.ctrl ?? false },
  clickCount: 1,
})

// ===========================================================================
// A loop, drawn and ready
// ===========================================================================

interface Stage {
  readonly loop: FrameLoop
  /** Hand one happening over and let the frame it owes run. */
  send(input: HumanInput): void
  /** The picture on the screen right now -- the last one handed over `IF-1`. */
  picture(): string
  /** How many pictures have been handed over so far. */
  drawn(): number
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, screenPane())
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // `FT-3` of table T-078 is not what starts this: the first frame is owed by
  // the loop being made, so drain it before any case reads the picture.
  pen.runAnimationFrames()
  const picture = (): string => {
    const last = pen.pictures[pen.pictures.length - 1]
    if (last === undefined) throw new Error('the loop has drawn nothing at all')
    return last
  }
  return { loop, send, picture, drawn: () => pen.pictures.length }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

/** Where one row's band stands, as the frame placed it. */
function bandOf(loop: FrameLoop, groupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as any).rows.find((one: any) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the frame drew no band for row ${groupId}`)
  return { y: found.y as number, height: found.height as number }
}

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

/**
 * The bounding box of one drawn bar, whichever of table T-012's two forms it
 * came out as -- an area to fill (`SH-1` / `SH-2` / `SH-5`) or a line with ends
 * (`SH-3` / `SH-4`).
 */
function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  if (points.length === 0) throw new Error(`${what} came out with no points`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const planBox = (loop: FrameLoop): Box => boxOfBar(drawnTask(loop, ALPHA_UID).plan, "Alpha's bar")

/** The point every drag starts from: an empty band, to the left of the Task. */
const pressPoint = (loop: FrameLoop): Point => {
  const band = bandOf(loop, BAND_ABOVE)
  return { x: planBox(loop).x0 - 40, y: band.y + band.height / 2 }
}

/** The point a drag that ENCLOSES the Task ends at: past its far corner. */
const enclosingPoint = (loop: FrameLoop): Point => {
  const band = bandOf(loop, BAND_BELOW)
  return { x: planBox(loop).x1 + 40, y: band.y + band.height / 2 }
}

/** A point straight below the press that encloses nothing at all. */
const emptyDragPoint = (loop: FrameLoop): Point => {
  const band = bandOf(loop, ROWS[1] as string)
  return { x: planBox(loop).x0 - 15, y: band.y + band.height / 2 }
}

// ===========================================================================
// Reading the answer. The seam hands over a string, so these pull it apart
// with no assumption beyond "it is SVG".
//
// ⭐ The four helpers below are copied in shape from
// tests/unit/t-023c-selected-line-width.test.ts, which reads the OTHER half of
// the same pair of settings out of the same kind of string.
// ===========================================================================

interface Element {
  readonly tag: string
  /** Where the element opens in the string -- its place in the paint order. */
  readonly at: number
  readonly text: string
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const scan = /<([a-zA-Z][\w-]*)\b[^>]*>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    out.push({ tag: hit[1] as string, at: hit.index, text: hit[0] })
    hit = scan.exec(svg)
  }
  return out
}

const attribute = (element: string, name: string): string | null => {
  const hit = new RegExp(`\\b${name}="([^"]*)"`).exec(element)
  return hit === null ? null : (hit[1] as string)
}

/** The elements that carry paint, in the order they are painted. */
const paintedOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter((e) => e.tag !== 'svg')

/**
 * One element, with anything a SECOND drawing of the same picture may spell
 * differently taken out -- the `id` an arrow marker has to carry, and the
 * reference to it.
 */
const settledText = (element: Element): string =>
  element.text.replace(/(id="|url\(#)[^"')]*/g, '$1')

/** The elements this picture has that the other does not. */
const onlyIn = (picture: string, other: string): readonly Element[] => {
  const there = paintedOf(other).map(settledText)
  return paintedOf(picture).filter((e) => !there.includes(settledText(e)))
}

/** A dashed rectangle -- the shape both `SL-3` and `SL-8` draw. */
const dashedRectsIn = (elements: readonly Element[]): readonly Element[] =>
  elements.filter((e) => e.tag === 'rect' && attribute(e.text, 'stroke-dasharray') !== null)

const numberAttribute = (element: Element, name: string): number => {
  const stated = attribute(element.text, name)
  if (stated === null) throw new Error(`this element states no ${name}: ${element.text}`)
  return Number(stated)
}

/**
 * The one rectangle a held drag added to the picture.
 *
 * ⭐ FOUND BY WHAT IT IS NOT: everything else in the held picture was already
 * in the picture before the press, so the rectangle is the difference. This is
 * what lets the case name no markup of its own.
 */
function marqueeOf(held: string, before: string): Element {
  const added = onlyIn(held, before)
  const rects = dashedRectsIn(added)
  if (rects.length !== 1) {
    throw new Error(
      'table T-023c SL-3: 握っているあいだ、取ろうとしている矩形を描くこと（MUST） -- ' +
        `the held picture added ${added.length} element(s), ${rects.length} of them a dashed rect`,
    )
  }
  return rects[0] as Element
}

/**
 * Where the name label opens in the picture -- `ZO-5`, the row directly below
 * `ZO-6`.
 *
 * ⭐ FOUND BY THE NAME ITSELF. `NL-1` of table T-013 draws the label inside the
 * shape, and this fixture holds one Task with one name, so the text is the only
 * handle the specification actually gives.
 */
function labelStartsAt(svg: string): number {
  const written = svg.indexOf(ALPHA_NAME)
  if (written < 0) {
    throw new Error(`the picture draws no label for ${ALPHA_NAME}, so ZO-5 is not in it`)
  }
  const opens = svg.lastIndexOf('<', written)
  if (opens < 0) throw new Error('the label is not inside an element')
  return opens
}

/** The bounding box of one drawn element, from whichever coordinates it states. */
function boxOfElement(element: Element): Box | null {
  const number = (name: string): number => Number(attribute(element.text, name))
  if (element.tag === 'rect') {
    const x = number('x')
    const y = number('y')
    const w = number('width')
    const h = number('height')
    if ([x, y, w, h].some((one) => !Number.isFinite(one))) return null
    return { x0: x, x1: x + w, y0: y, y1: y + h }
  }
  if (element.tag === 'polygon' || element.tag === 'polyline') {
    const stated = attribute(element.text, 'points')
    if (stated === null) return null
    const found = (stated.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    if (found.length < 4) return null
    const xs = found.filter((_, i) => i % 2 === 0)
    const ys = found.filter((_, i) => i % 2 === 1)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }
  return null
}

/**
 * Where the plan bar opens in the picture -- `ZO-1`, the back of table T-020.
 *
 * ⭐ FOUND BY ITS OWN GEOMETRY: the frame says where it placed the bar, so the
 * element that stands on exactly that box is the bar, whichever of table
 * T-012's forms it came out as.
 */
function planBarStartsAt(loop: FrameLoop, svg: string): number {
  const wanted = planBox(loop)
  const near = (a: number, b: number): boolean => Math.abs(a - b) <= CORNER_PX
  const found = paintedOf(svg).filter((element) => {
    const box = boxOfElement(element)
    return (
      box !== null &&
      near(box.x0, wanted.x0) &&
      near(box.x1, wanted.x1) &&
      near(box.y0, wanted.y0) &&
      near(box.y1, wanted.y1)
    )
  })
  const first = found[0]
  if (first === undefined) {
    throw new Error('no element of the picture stands on the box the frame gave the plan bar')
  }
  return first.at
}

/** The rectangle a drag is asking for: the press corner and the pointer corner. */
const askedFor = (from: Point, to: Point): Box => ({
  x0: Math.min(from.x, to.x),
  x1: Math.max(from.x, to.x),
  y0: Math.min(from.y, to.y),
  y1: Math.max(from.y, to.y),
})

/**
 * How far off the two corners a drawn rectangle may land.
 *
 * ⚠️ ONE PIXEL, and the number is this file's own -- the specification states
 * none. `SL-3` says ⛔ 新しい値を起こさない, so there is no inset or half-pixel
 * nicety it could be given; a pixel is the allowance for one being taken anyway.
 */
const CORNER_PX = 1

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still states the two rules this file is about', () => {
  it('has SL-3 draw the rectangle being taken while the drag is held (MUST)', () => {
    const rule = ruleOf('T-023c', 'SL-3')
    expect(
      rule,
      'table T-023c SL-3: 握っているあいだ、取ろうとしている矩形を描くこと（MUST）',
    ).toContain('握っているあいだ、取ろうとしている矩形を描くこと（MUST）')
    expect(rule, 'and the reason it gives').toContain(
      '描かないと、「完全に囲まれた」かどうかを人が離す前に確かめられない',
    )
  })

  it('sends the four values SL-3 names to rows that already exist', () => {
    const rule = ruleOf('T-023c', 'SL-3')
    for (const named of ['S-174', 'S-175', 'S-151', 'ZO-6']) {
      expect(rule, `table T-023c SL-3 names ${named}`).toContain(named)
    }
    expect(rule, 'table T-023c SL-3: ⛔ 新しい値を起こさない').toContain('新しい値を起こさない')
    expect(rule, 'table T-023c SL-3: どれも `SL-8` の選択の枠が既に読んでいる行である').toContain(
      '`SL-8` の選択の枠が既に読んでいる行である',
    )
    // The three settings rows have to be readable, or the cases below have no
    // expected value to stand on.
    expect(FRAME_STROKE, 'table T-206 S-174 -- 選択の枠の太さ').toBeGreaterThan(0)
    expect(FRAME_DASH.length, 'table T-206 S-175 -- 描く長さと空ける長さの組').toBe(2)
    expect(rowOf('T-236', 'S-151')['色'], 'table T-236 S-151 -- 強調の色').toContain('強調')
  })

  it('puts ZO-6 at the front of the stacking order, and only while it is held', () => {
    const table = specTable('T-020')
    const last = table.rows[table.rows.length - 1]
    expect(last?.id, 'table T-020 is ordered 背面から前面へ, so the front row is the last').toBe(
      'ZO-6',
    )
    const rule = ruleOf('T-020', 'ZO-6')
    expect(rule, 'table T-020 ZO-6: 範囲選択の矩形（表 T-023c の `SL-3`）').toContain('SL-3')
    expect(rule, 'table T-020 ZO-6: 握っているあいだだけ描き、離したら消すこと（MUST）').toContain(
      '握っているあいだだけ描き、離したら消すこと（MUST）',
    )
    expect(rule, 'and the reason it gives').toContain(
      '離した時点で残るのは選択そのものであり、矩形ではない',
    )
    // 「6（最前面）」 -- read from the 順 column rather than assumed.
    expect(rowOf('T-020', 'ZO-6')['順'], 'table T-020 ZO-6: 6（最前面）').toContain('最前面')
  })

  it('leaves the range selection to a plain drag on empty ground (PD-5)', () => {
    const rows = specTable('T-023a').rows.map((one) => one.id)
    expect(rows[0], 'table T-023a: 上から評価し、最初に成立した行で確定すること（MUST）').toBe(
      'PD-1',
    )
    const found = specTable('T-023a').rows.find((one) => one.id === 'PD-5')
    expect(found?.by['結果'], 'table T-023a PD-5: 範囲選択').toContain('範囲選択')
  })
})

describe('the fixture gives a drag empty ground to start on and a Task to enclose', () => {
  it('draws the Task, with the press point clear of it', () => {
    const built = stage()
    const box = planBox(built.loop)
    expect(box.x1, 'Alpha is drawn').toBeGreaterThan(box.x0)
    const at = pressPoint(built.loop)
    const inside = at.x >= box.x0 && at.x <= box.x1 && at.y >= box.y0 && at.y <= box.y1
    // ⛔ A PREMISE, NOT A DECORATION: a press that landed on the Task would be
    // PD-3's, and every case below would be measuring a grab.
    expect(inside, 'the press point stands on the Task').toBe(false)
  })

  it('lets one drag enclose the Task completely, and another enclose nothing', () => {
    const built = stage()
    const box = planBox(built.loop)
    const around = askedFor(pressPoint(built.loop), enclosingPoint(built.loop))
    // 「矩形に完全に囲まれた対象だけを取ること（MUST）」 -- so the enclosing drag
    // has to contain the whole bar, not touch it.
    expect(around.x0).toBeLessThan(box.x0)
    expect(around.x1).toBeGreaterThan(box.x1)
    expect(around.y0).toBeLessThan(box.y0)
    expect(around.y1).toBeGreaterThan(box.y1)
    const empty = askedFor(pressPoint(built.loop), emptyDragPoint(built.loop))
    expect(empty.x1, 'the empty drag stops short of the Task').toBeLessThan(box.x0)
  })
})

// ===========================================================================
// (a) SL-3 -- the rectangle is drawn while the button is down
// ===========================================================================

describe('table T-023c SL-3: the rectangle being taken is drawn while it is held', () => {
  it('adds one rectangle to the picture that was not there before (MUST)', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    // `marqueeOf` fails with the row quoted when there is no such rectangle.
    const rect = marqueeOf(built.picture(), before)
    expect(rect.tag).toBe('rect')
  })

  it('draws it on the two corners of the drag -- the press and the pointer', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const rect = marqueeOf(built.picture(), before)
    const asked = askedFor(from, to)
    expect(
      Math.abs(numberAttribute(rect, 'x') - asked.x0),
      'table T-023c SL-3: 取ろうとしている矩形 -- its left edge is the drag',
    ).toBeLessThanOrEqual(CORNER_PX)
    expect(Math.abs(numberAttribute(rect, 'y') - asked.y0), 'its top edge').toBeLessThanOrEqual(
      CORNER_PX,
    )
    expect(
      Math.abs(numberAttribute(rect, 'width') - (asked.x1 - asked.x0)),
      'its width',
    ).toBeLessThanOrEqual(CORNER_PX)
    expect(
      Math.abs(numberAttribute(rect, 'height') - (asked.y1 - asked.y0)),
      'its height',
    ).toBeLessThanOrEqual(CORNER_PX)
  })

  it('redraws it as the pointer moves, so a person can see what is enclosed', () => {
    // ⛔ 描かないと、「完全に囲まれた」かどうかを人が離す前に確かめられない --
    // a rectangle frozen at the first move answers none of that.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', (from.x + to.x) / 2, (from.y + to.y) / 2))
    const half = marqueeOf(built.picture(), before)
    built.send(pointer('move', to.x, to.y))
    const whole = marqueeOf(built.picture(), before)
    expect(
      numberAttribute(whole, 'width'),
      'table T-023c SL-3: the rectangle stopped following the pointer sideways',
    ).toBeGreaterThan(numberAttribute(half, 'width'))
    expect(
      numberAttribute(whole, 'height'),
      'table T-023c SL-3: the rectangle stopped following the pointer downwards',
    ).toBeGreaterThan(numberAttribute(half, 'height'))
  })

  it('draws it at the thickness S-174 states and the dash S-175 states', () => {
    // 「枠の太さは……`S-174`、破線の刻みは同表の `S-175`」, both read out of
    // 表 T-206 at run time.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const rect = marqueeOf(built.picture(), before)
    expect(numberAttribute(rect, 'stroke-width'), 'table T-206 S-174 -- 選択の枠の太さ').toBe(
      FRAME_STROKE,
    )
    const dash = numbersIn(attribute(rect.text, 'stroke-dasharray') ?? '')
    expect(dash, 'table T-206 S-175 -- 描く長さと空ける長さの組').toEqual([...FRAME_DASH])
  })

  it('draws it in the colour the selection frame already wears (S-151)', () => {
    // 「色は同書の 表 T-236 の `S-151`」 and ⛔「新しい値を起こさない —— どれも
    // `SL-8` の選択の枠が既に読んでいる行である」. ⭐ So the expected value is
    // not written here at all: it is whatever THIS run paints the `SL-8` frame
    // with, and the two have to agree.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const marquee = marqueeOf(built.picture(), before)
    built.send(pointer('up', to.x, to.y))
    const left = dashedRectsIn(onlyIn(built.picture(), before))
    expect(
      left.length,
      'table T-023c SL-8: the release left no dashed frame, so there is nothing to compare against',
    ).toBe(1)
    const frame = left[0] as Element
    expect(
      attribute(marquee.text, 'stroke'),
      'table T-023c SL-3: 色は 表 T-236 の `S-151` -- the row `SL-8` already reads',
    ).toBe(attribute(frame.text, 'stroke'))
  })
})

// ===========================================================================
// (b) ZO-6 -- in front of everything, and only while it is held
// ===========================================================================

describe('table T-020 ZO-6: the rectangle stands in front, and goes when the button does', () => {
  it('paints it in front of the name label, the row directly below it (ZO-5)', () => {
    // ⭐ MEASURED AGAINST `ZO-5` AND NOT AGAINST "the last element of the
    // string". 表 T-020 orders SIX things and the time ruler is none of them --
    // it stands in its own region (`TimeRuler`, table T-055) above the
    // `Row Area`, and nothing in the specification says where a region is
    // painted with respect to another. What `ZO-6` claims is that the rectangle
    // is in front of `ZO-1` 〜 `ZO-5`, and `ZO-5` (名称ラベル) is the frontmost
    // of those -- so the label is the element the claim reduces to.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const held = built.picture()
    const rect = marqueeOf(held, before)
    expect(
      rect.at,
      'table T-020 ZO-6: 6（最前面）—— the rectangle is painted behind the name label (ZO-5)',
    ).toBeGreaterThan(labelStartsAt(held))
    expect(
      rect.at,
      'table T-020 ZO-6: 6（最前面）—— the rectangle is painted behind the plan bar (ZO-1)',
    ).toBeGreaterThan(planBarStartsAt(built.loop, held))
  })

  it('takes it away again when the button is let go (MUST)', () => {
    // 「握っているあいだだけ描き、離したら消すこと（MUST）」, on a drag that
    // encloses nothing: what is left afterwards can only be the rectangle or
    // nothing at all, so the case cannot be confused by a selection frame.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = emptyDragPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    marqueeOf(built.picture(), before)
    const drawnWhileHeld = built.drawn()
    built.send(pointer('up', to.x, to.y))
    expect(
      built.drawn(),
      'the release drew no new picture at all, so the rectangle is still on the screen',
    ).toBeGreaterThan(drawnWhileHeld)
    expect(
      dashedRectsIn(onlyIn(built.picture(), before)),
      'table T-020 ZO-6: 握っているあいだだけ描き、離したら消すこと（MUST）',
    ).toEqual([])
  })

  it('leaves the selection behind and not the rectangle', () => {
    // 「離した時点で残るのは選択そのものであり、矩形ではない」. The drag encloses
    // the Task, so something IS left -- and what is left stands on the Task's
    // own box (`SL-8`: 外接矩形に沿った破線の枠), not on the drag's.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    built.send(pointer('up', to.x, to.y))
    const left = dashedRectsIn(onlyIn(built.picture(), before))
    expect(
      left.length,
      'table T-020 ZO-6: 離した時点で残るのは選択そのもの -- nothing was left at all',
    ).toBe(1)
    const asked = askedFor(from, to)
    const frame = left[0] as Element
    expect(
      numberAttribute(frame, 'width'),
      'table T-020 ZO-6: 残るのは……矩形ではない -- the drag rectangle stayed on the screen',
    ).toBeLessThan(asked.x1 - asked.x0 - CORNER_PX)
  })
})

// ===========================================================================
// (c) The gesture table T-023a takes FIRST draws no rectangle
// ===========================================================================

describe('table T-023a: a pan is not a range selection, so it draws no rectangle', () => {
  it('draws nothing of SL-3 for the `Ctrl` drag PD-1 takes first', () => {
    // `PD-1` is the first row and 構えと当たりによらず優先する, so this gesture
    // never reaches `PD-5`; a rectangle drawn for it would be one the
    // specification never asked for.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = emptyDragPoint(built.loop)
    built.send(pointer('down', from.x, from.y, { ctrl: true }))
    built.send(pointer('move', to.x, to.y, { ctrl: true }))
    expect(
      dashedRectsIn(onlyIn(built.picture(), before)),
      'table T-023a PD-1: パン。構えと当たりによらず優先する -- a pan drew a range-selection rectangle',
    ).toEqual([])
  })

  it('draws nothing of SL-3 for a middle-button drag either', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = emptyDragPoint(built.loop)
    built.send(pointer('down', from.x, from.y, { button: 'middle' }))
    built.send(pointer('move', to.x, to.y, { button: 'middle' }))
    expect(
      dashedRectsIn(onlyIn(built.picture(), before)),
      'table T-023a PD-1: 中ボタンドラッグ -- a pan drew a range-selection rectangle',
    ).toEqual([])
  })
})
