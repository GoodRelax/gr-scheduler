// `PD-1` of 表 T-023a, as the user's ruling of 2026-08-29 left it: while the
// button is DOWN, the schedule follows the pointer in BOTH axes -- and the
// distance it travels is still the one 表 T-023d states, 等倍.
//
// The unit these arrive on is UF-48 `single-html-shell` (CP-25 of table T-062),
// whose `frame-loop.ts` takes FT-1 of table T-078 -- 人の入力（ポインタとキー）
// -- on `receiveInput`, and answers what one frame computed on `current()`.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE, AND WHY IT IS NOT A LIVE CASE
// ---------------------------------------------------------------------------
// Table T-218 of Chapter 7 offers a rule about what the screen shows exactly
// two homes: `TS-3` (System, `tests/system/`, Playwright) and `TS-6` (Unit,
// `tests/unit/`, Vitest). ⛔ `TS-3` is not available to this rule. Every case
// under it is a `SW_SPEC_TEST` of Chapter 9 and `TW-2` of table T-219 requires
// each one to take an `SWS-xxx` of Chapter 6.1 as its PARENT -- and Chapter 6.1
// holds eight `SW_SPEC` nodes, none of which reaches a pan:
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
// 「⚠️ 受け皿が無いことは、書かなくてよいという意味ではない」. So the case is
// written here, where it can be measured honestly: what `PD-1` requires is that
// the drawing move while the button is held, and `FrameLoop.current()` answers
// the drawing this loop just made.
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
//   input-source.ts      `HumanInput`, `InputModifiers`, `PointerButton`,
//                        `PointerInput`, `PointerPhase`
//   screen-renderer.ts   `DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
//                        `ScreenView`
//   schedule-geometry.ts `Point`, `BarGeometry`, `TaskGeometry`
//   schedule-layout.ts   `ScheduleLayout` (`pxPerDay`, `rows`)
//   schedule.ts          the entity types this fixture writes out
//
// ⛔ NOT ONE NUMBER BELOW IS COPIED OUT OF `src/`. Every expected value is
// either read out of the manuscript at run time (`specTable`, the two sentences
// found by their own words), or stated as a RELATION between two things the
// specification puts side by side: the picture against the pointer that carried
// it, and the picture against itself one move later.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-023a       「上から評価し、最初に成立した行で確定すること（MUST）」
//   T-023a PD-1  「中ボタンドラッグ、または **`Ctrl` だけを伴う**左ドラッグ |
//           **パン。** 構えと当たりによらず優先する。**握っているあいだ、縦横の
//           両方向でポインタに追従させること（MUST）**（利用者の裁定
//           2026-08-29）—— ⛔ **離すまで動かないと、掴めていないのと見分けが
//           つかない**（`FR-053` の掴み帯が同じ理由を持つ）。⚠️ **距離は
//           表 T-023d の「パンは等倍とすること（MUST）」のままである** ——
//           **追従は絵の話であって、距離の規則を変えるものではない**」
//   T-023a PD-3  「**何かに当たった**（判定の順と優先は MK-9a）| **そのものへの
//           操作。**」-- the row PD-1 outranks, which is what 構えと当たりに
//           よらず優先する means and what the last case below drives.
//   T-023d  「**パンは等倍とすること（MUST）** —— ポインタが動いた距離だけ
//           日程表が動く。倍率を掛けない。⛔ **錠の上にしか着地できない形に
//           してはならない（MUST NOT）** —— `_assets/tbl-settings.md` の
//           表 T-203 の `S-77` と `S-78` は日付と行の識別子しか持てないので、
//           それだけでは 1 日・1 行より短い移動が何も起こさず、等倍が成り立た
//           ない。**端数は同表の `S-176` と `S-177` が持つ（MUST）。**」
//   T-206 / T-203 S-176 / S-177   the two fractions that sentence leans on:
//           「表示の上端が、`scrollGroupId` が指す行のどこにあるか。**その行が
//           占める送り（その行の帯の高さと、その下の隙間を合わせた長さ。次の行の
//           上端までの距離であり、最後の行は自身の帯）に対する比であり、px では
//           ない**（`FR-080`）。⛔⛔ **帯の高さに対する比にしてはならない
//           （MUST NOT）** —— **帯と帯は接していない**ので、帯に対する比では隙間
//           に立つ上端を名指せず、表 T-023d の「**錠の上にしか着地できない形に
//           してはならない（MUST NOT）**」を破る」 and 「⭐ **横の軸の `S-176`
//           である**」
//   T-023 MK-7   「**`Ctrl` だけを伴う**ドラッグ / 中ボタンドラッグ | 表 T-023a
//           の `PD-1`」 -- the two gestures every case below is run through.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - WHAT THE DOCUMENT HOLDS DURING OR AFTER A PAN. `FR-031` says outright
//     「文書を変えないドラッグ（パン・範囲選択）は段を作らない」 and `UN-8` of
//     table T-027 puts the scroll position outside the history, so where the
//     four scroll columns stand mid-drag is not a thing `PD-1` settles. What is
//     asserted is the PICTURE, which is what the row speaks of.
//   - WHAT HAPPENS AT THE EDGES OF THE DOCUMENT. Nothing in the specification
//     states whether a pan is stopped at the first day or the first row, so the
//     fixture starts the view in the MIDDLE of its own content and every case
//     travels a few days and half a row -- distances no reading of an edge rule
//     could reach.
//   - THE PIXEL AT WHICH THE POINTER SHAPE CHANGES (`IN-2`), and whether the
//     browser's own default is stopped (`MK-10`). Both have owners of their
//     own and neither is what the 2026-08-29 ruling added.
//   - WHERE THE RELEASE LEAVES THE VIEW. `PD-1` says nothing about the release
//     and `IN-1` of table T-028 speaks of an operation SETTLING, which a pan
//     has nothing to settle; a case asserting one would be inventing it.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT THESE CASES FOUND (2026-08-29), AND HOW IT WAS CLOSED
// ---------------------------------------------------------------------------
// `follows every downward move` was RED when it was first written, and the
// reading below was taken AFTER it went red, to say what shape the failure had.
// ⛔ IT SET NO EXPECTED VALUE THEN AND SETS NONE NOW: every number this file
// judges against comes from the manuscript or from the pointer.
//
// Sweeping one held `Ctrl` drag downwards, 2px at a time, in a fixture whose
// bands are 28px tall and stand 36px apart, the picture answered:
//
//   2 〜 8   -> 0        10 〜 36  -> exact
//   38 〜 44 -> 36       46 〜 72  -> exact       74 〜 80 -> 72
//
// ⭐ The dead runs were exactly the 8px GAPS between one band and the next: the
// view could come to rest anywhere inside a band and nowhere between two --
// the shape 表 T-023d forbids in as many words, ⛔ 錠の上にしか着地できない形に
// してはならない（MUST NOT）.
//
// ⭐ THE MANUSCRIPT WAS WHERE IT CAME FROM, AND THE MANUSCRIPT IS WHERE IT WAS
// FIXED. `S-176` had read 「その行自身の高さに対する比」, a height smaller than
// the distance from one row to the next, so the gap had no spelling at all. It
// now reads 「その行が占める送り……に対する比」 and carries a MUST NOT against
// the band. ⚠️ THE SIDEWAYS AXIS WAS ALWAYS WHOLE: days abut, so it had no gap
// to lose. ⛔ Not one assertion below was weakened to close this.

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

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').split('\n')

/** The `結果` cell of one row of 表 T-023a. */
function resultOf(rowId: string): string {
  const found = specTable('T-023a').rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table T-023a has no row ${rowId}`)
  const cell = found.by['結果']
  if (cell === undefined || cell.length === 0) {
    throw new Error(`table T-023a row ${rowId} states no 結果`)
  }
  return cell
}

/** The `条件` cell of one row of 表 T-023a. */
function conditionOf(rowId: string): string {
  const found = specTable('T-023a').rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table T-023a has no row ${rowId}`)
  return found.by['条件'] ?? ''
}

/**
 * The one line of the manuscript that carries 表 T-023d's 等倍 rule, found by
 * the words the rule itself uses rather than by a line number.
 *
 * ⭐ READ AND NOT COPIED, for the reason rule 03 gives: a sentence written down
 * here would go on passing after the manuscript had changed it, which is the
 * regression a specification-driven case exists to catch.
 */
function equalTravelLine(): string {
  // ⚠️ The sentence has to be found where it is STATED, not where `PD-1` quotes
  // it -- `PD-1`'s own cell carries the same words inside 「」 to say that the
  // travel is unchanged, and a search that took the first hit would be reading
  // the quotation back to itself.
  const found = REQUIREMENTS.find((line) => line.startsWith('**パンは等倍とすること（MUST）**'))
  if (found === undefined) {
    throw new Error('table T-023d no longer states that a pan travels 等倍')
  }
  return found
}

// ===========================================================================
// The document these cases drive
// ===========================================================================

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it; the rows and the Tasks are written
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
  '3a000000-0000-4000-8000-000000000001',
  '3a000000-0000-4000-8000-000000000002',
  '3a000000-0000-4000-8000-000000000003',
  '3a000000-0000-4000-8000-000000000004',
  '3a000000-0000-4000-8000-000000000005',
  '3a000000-0000-4000-8000-000000000006',
] as const

/** The row the empty-space presses land on -- it carries no Task at all. */
const EMPTY_ROW = ROWS[4] as string

/** The two Tasks whose bars are watched. They sit on rows far apart. */
const NEAR_UID = 1
const FAR_UID = 2

/** A stored date column, written the way the startup template writes one. */
const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

/** 1 day is this many px at zoom 1 -- `S-1`'s key, set wide so a day is legible. */
const PX_PER_DAY_AT_1X = 20

/**
 * Where the left edge of the view starts.
 *
 * ⭐ IN THE MIDDLE OF THE CONTENT ON PURPOSE. The two Tasks run from the 2nd to
 * the 28th, so there are days to reveal on both sides and no case below has to
 * know whether a pan stops at an edge -- which the specification does not say.
 */
const SCROLL_DATE = '2026-04-14'

/** Likewise for the vertical axis: the fourth of six rows. */
const SCROLL_ROW = ROWS[3] as string

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
        // ⛔ NO 基準日. `CU-1` would draw a line the height of the `Row Area`,
        // and this file's subject is the whole picture moving -- one more
        // element in it buys nothing and can only confuse a failure.
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({ uid: NEAR_UID, name: 'Alpha', start: day(2), finish: day(12) }),
        task({ uid: FAR_UID, name: 'Beta', start: day(18), finish: day(28) }),
      ],
      resources: [],
      assignments: [],
      taskGroups: ROWS.map((id, i) => group(id, i, `R${i + 1}`)),
      taskGroupMembers: [
        { taskUid: NEAR_UID, groupId: ROWS[1], stackOrder: null },
        { taskUid: FAR_UID, groupId: ROWS[2], stackOrder: null },
      ],
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
      scrollDate: SCROLL_DATE,
      scrollDayOffset: 0,
      scrollGroupId: SCROLL_ROW,
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
  /** Run whatever the loop asked an animation frame for, until it asks no more. */
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and `LY-5` of table T-060 puts the
 * browser in this layer. ⛔ Nothing in this fake decides anything about presses
 * or pictures: it drains the queue.
 *
 * ⭐ Copied, deliberately unchanged, from
 * tests/unit/t-023d-follows-the-pointer.test.ts, which drives the same unit
 * through the same seam.
 */
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
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

/**
 * The two gestures `MK-7` sends to `PD-1`, each spelled as the pointer that
 * carries it.
 *
 * ⚠️ The modifier travels on EVERY happening of the gesture, not only the
 * press: `InputModifiers` is documented as the keys as they stood when the
 * happening occurred, and a person holding `Ctrl` through a drag reports it on
 * each move.
 */
const GESTURES: readonly {
  readonly name: string
  readonly how: { readonly button?: PointerButton; readonly ctrl?: boolean }
}[] = [
  { name: '`Ctrl` だけを伴う左ドラッグ', how: { button: 'left', ctrl: true } },
  { name: '中ボタンドラッグ', how: { button: 'middle' } },
]

// ===========================================================================
// A loop, drawn and ready
// ===========================================================================

interface Stage {
  readonly loop: FrameLoop
  /** Hand one happening over and let the frame it owes run. */
  send(input: HumanInput): void
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, screenPane())
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // `FT-3` of table T-078 is not what starts this: the first frame is owed by
  // the loop being made, so drain it before any case reads `current()`.
  pen.runAnimationFrames()
  return { loop, send }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

/** How wide one calendar day is drawn -- the frame's own measurement of itself. */
const pxPerDay = (loop: FrameLoop): number => (frameOf(loop).layout as any).pxPerDay as number

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

const planBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).plan, `Task ${uid}'s plan bar`)

const midY = (box: Box): number => (box.y0 + box.y1) / 2

/** Where the whole picture stands right now, in the two axes `PD-1` names. */
interface Where {
  readonly x: number
  readonly y: number
}

const whereIs = (loop: FrameLoop, uid: number): Where => {
  const box = planBox(loop, uid)
  return { x: box.x0, y: midY(box) }
}

/** A point inside the `Row Area` that no Task is drawn on. */
const emptySpot = (loop: FrameLoop): Point => {
  const band = bandOf(loop, EMPTY_ROW)
  const near = planBox(loop, NEAR_UID)
  return { x: (near.x0 + near.x1) / 2, y: band.y + band.height / 2 }
}

/**
 * How far every case below carries the pointer.
 *
 * ⭐ DELIBERATELY NOT A WHOLE DAY AND NOT A WHOLE ROW. 表 T-023d forbids a pan
 * that can only land on the lock (⛔ 錠の上にしか着地できない形にしてはならない
 * （MUST NOT）) and says why: `S-77` and `S-78` hold a date and a row id, so a
 * pan built out of those alone moves by nothing at all for anything shorter
 * than one day or one row -- 「それだけでは 1 日・1 行より短い移動が何も起こさ
 * ず、等倍が成り立たない」. Halves are what make that visible.
 */
const TRAVEL_DAYS = 2.5
const TRAVEL_ROWS = 0.5

const travelOf = (loop: FrameLoop): Where => ({
  x: TRAVEL_DAYS * pxPerDay(loop),
  y: TRAVEL_ROWS * bandOf(loop, EMPTY_ROW).height,
})

/**
 * How far off 等倍 a case is allowed to land.
 *
 * ⚠️ HALF A PIXEL, and the number is this file's own -- the specification
 * states none. It is chosen to be far below the smallest travel the 等倍 rule
 * explicitly refuses to lose, which is one day and one row; anything the
 * fractions `S-176` / `S-177` can carry lands well inside it.
 */
const ONE_TO_ONE_PX = 0.5

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still states the rule this file is about', () => {
  it('makes PD-1 the first row of table T-023a, evaluated from the top', () => {
    const rows = specTable('T-023a').rows.map((one) => one.id)
    expect(rows[0], 'table T-023a: 上から評価し、最初に成立した行で確定すること（MUST）').toBe(
      'PD-1',
    )
  })

  it('names the two gestures MK-7 sends to it', () => {
    const condition = conditionOf('PD-1')
    expect(condition, 'table T-023a PD-1: 中ボタンドラッグ').toContain('中ボタンドラッグ')
    expect(condition, 'table T-023a PD-1: `Ctrl` だけを伴う左ドラッグ').toContain('左ドラッグ')
    expect(condition).toContain('Ctrl')
  })

  it('has the schedule follow the pointer in BOTH axes while it is held (MUST)', () => {
    const result = resultOf('PD-1')
    expect(
      result,
      'table T-023a PD-1: 握っているあいだ、縦横の両方向でポインタに追従させること（MUST）',
    ).toContain('握っているあいだ、縦横の両方向でポインタに追従させること（MUST）')
    expect(result, 'and the reason it gives').toContain(
      '離すまで動かないと、掴めていないのと見分けがつかない',
    )
  })

  it('outranks 構え and 当たり, and leaves the travel where table T-023d had it', () => {
    const result = resultOf('PD-1')
    expect(result, 'table T-023a PD-1: 構えと当たりによらず優先する').toContain(
      '構えと当たりによらず優先する',
    )
    expect(result, 'table T-023a PD-1: 距離は 表 T-023d の「パンは等倍とすること（MUST）」のまま').toContain(
      'パンは等倍とすること（MUST）',
    )
    expect(result, 'and it says why: 追従は絵の話であって、距離の規則を変えるものではない').toContain(
      '追従は絵の話であって、距離の規則を変えるものではない',
    )
    // The row it outranks has to exist for that clause to mean anything.
    expect(resultOf('PD-3'), 'table T-023a PD-3: そのものへの操作').toContain('そのものへの操作')
  })

  it('still states 等倍 where PD-1 points, and forbids landing only on the lock', () => {
    const line = equalTravelLine()
    expect(line, 'table T-023d: ポインタが動いた距離だけ日程表が動く。倍率を掛けない').toContain(
      'ポインタが動いた距離だけ日程表が動く',
    )
    expect(line, 'table T-023d: 錠の上にしか着地できない形にしてはならない（MUST NOT）').toContain(
      '錠の上にしか着地できない形にしてはならない（MUST NOT）',
    )
    expect(line, 'table T-023d: 端数は同表の `S-176` と `S-177` が持つ（MUST）').toContain('S-176')
    expect(line).toContain('S-177')
  })
})

describe('the fixture puts the view where a pan has room in every direction', () => {
  it('draws both bars, on rows the empty press point is clear of', () => {
    const built = stage()
    const near = planBox(built.loop, NEAR_UID)
    const far = planBox(built.loop, FAR_UID)
    expect(near.x1, 'Alpha is drawn').toBeGreaterThan(near.x0)
    expect(far.x1, 'Beta is drawn').toBeGreaterThan(far.x0)
    // ⛔ A PREMISE, NOT A DECORATION: if the press point stood on a bar, a case
    // that failed would not say whether PD-1 was ignored or whether PD-3 had
    // simply been reached first.
    const at = emptySpot(built.loop)
    for (const uid of [NEAR_UID, FAR_UID]) {
      const box = planBox(built.loop, uid)
      const inside = at.x >= box.x0 && at.x <= box.x1 && at.y >= box.y0 && at.y <= box.y1
      expect(inside, `the empty press point stands on Task ${uid}`).toBe(false)
    }
  })

  it('starts with days and rows on both sides of the view', () => {
    const built = stage()
    // The view's left edge is SCROLL_DATE, which stands between the two Tasks;
    // its top edge is the fourth of six rows. Both are read back from the
    // picture rather than assumed: the near bar starts to the LEFT of the far
    // bar, and the row the view starts on has bands above and below it.
    expect(planBox(built.loop, NEAR_UID).x0).toBeLessThan(planBox(built.loop, FAR_UID).x0)
    const first = bandOf(built.loop, ROWS[0] as string)
    const last = bandOf(built.loop, ROWS[5] as string)
    expect(last.y, 'the six rows are drawn one below another').toBeGreaterThan(first.y)
  })
})

// ===========================================================================
// (a) The schedule follows the pointer while the button is down
// ===========================================================================

describe.each(GESTURES.map((one) => [one.name, one.how] as const))(
  'table T-023a PD-1 (%s): the schedule follows the pointer while it is held',
  (_name, how) => {
    it('carries the drawing sideways with the pointer (MUST)', () => {
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      // ⭐ READ AFTER THE PRESS. `PD-1` speaks of 握っているあいだ, so the press
      // is where the holding starts and the picture it left is what the pointer
      // is measured against.
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(
        now.x,
        'table T-023a PD-1: 握っているあいだ、縦横の両方向でポインタに追従させること（MUST）',
      ).toBeGreaterThan(held.x)
      expect(
        Math.abs(now.x - held.x - travel.x),
        `table T-023d: パンは等倍とすること（MUST） -- the picture moved ${
          now.x - held.x
        } where the pointer moved ${travel.x}`,
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('carries the drawing downwards with the pointer (MUST)', () => {
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x, at.y + travel.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(
        now.y,
        'table T-023a PD-1: 縦横の両方向で -- 縦を止めると、掴めていないのと見分けがつかない',
      ).toBeGreaterThan(held.y)
      expect(
        Math.abs(now.y - held.y - travel.y),
        `table T-023d: パンは等倍とすること（MUST） -- the picture moved ${
          now.y - held.y
        } where the pointer moved ${travel.y}`,
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('carries it in both axes at once, by the travel in each (MUST)', () => {
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(Math.abs(now.x - held.x - travel.x), 'the sideways half').toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
      expect(Math.abs(now.y - held.y - travel.y), 'the downward half').toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
    })

    it('follows the other way too -- back and up', () => {
      // 「縦横の両方向で」 is an axis and not a direction; a picture that only
      // ever moved right and down would answer every case above and still
      // refuse half of what a person does with a pan.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x - travel.x, at.y - travel.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(Math.abs(now.x - held.x + travel.x), 'leftwards, 等倍').toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
      expect(Math.abs(now.y - held.y + travel.y), 'upwards, 等倍').toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('follows every sideways move, not only the last one', () => {
      // ⛔ 離すまで動かないと、掴めていないのと見分けがつかない -- a picture that
      // caught up only at the end of the gesture is the very thing the 2026-08-29
      // ruling was made against. ⭐ And every one of the four has to be 等倍:
      // 表 T-023d states the distance rule of the whole gesture, not of its
      // first move.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      for (const step of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x + step * travel.x, at.y, how))
        const now = whereIs(built.loop, NEAR_UID)
        expect(
          Math.abs(now.x - held.x - step * travel.x),
          `table T-023d: パンは等倍とすること（MUST） -- at move ${step} the pointer stood ${
            step * travel.x
          } from the press and the picture stood ${now.x - held.x}`,
        ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      }
    })

    it('follows every downward move, not only the last one', () => {
      // The same case on the other axis. ⚠️ The four steps are HALVES of a row
      // band on purpose -- 表 T-023d forbids a pan that can only land on the
      // lock, and a picture that walks whole rows passes a case made of whole
      // rows.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      for (const step of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x, at.y + step * travel.y, how))
        const now = whereIs(built.loop, NEAR_UID)
        expect(
          Math.abs(now.y - held.y - step * travel.y),
          `table T-023d: パンは等倍とすること（MUST） -- at move ${step} the pointer stood ${
            step * travel.y
          } from the press and the picture stood ${now.y - held.y}`,
        ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      }
    })

    it('comes back exactly when the pointer comes back', () => {
      // 追従 is a picture OF THE POINTER, not a picture that has been nudged:
      // one that only ever ran away would answer the cases above and still show
      // a place the person is no longer pointing at.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      expect(whereIs(built.loop, NEAR_UID).x).toBeGreaterThan(held.x)
      built.send(pointer('move', at.x, at.y, how))
      const back = whereIs(built.loop, NEAR_UID)
      expect(
        back.x,
        'table T-023a PD-1: 追従 means the picture belongs to the POINTER, so it comes back with it',
      ).toBeCloseTo(held.x, 6)
      expect(back.y).toBeCloseTo(held.y, 6)
    })

    it('moves the WHOLE schedule, not one figure of it', () => {
      // 「ポインタが動いた距離だけ日程表が動く」 -- 日程表, not a bar. The two
      // Tasks stand on different rows and different days, so a picture that
      // moved only what was under the pointer fails here.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const near = whereIs(built.loop, NEAR_UID)
      const far = whereIs(built.loop, FAR_UID)
      const band = bandOf(built.loop, ROWS[0] as string)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      expect(Math.abs(whereIs(built.loop, NEAR_UID).x - near.x - travel.x)).toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
      expect(
        Math.abs(whereIs(built.loop, FAR_UID).x - far.x - travel.x),
        'the far Task moved by a different amount from the near one',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      expect(
        Math.abs(bandOf(built.loop, ROWS[0] as string).y - band.y - travel.y),
        'the row bands did not travel with the bars',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('pans even when the press lands on a Task (構えと当たりによらず優先する)', () => {
      // `PD-1` is evaluated before `PD-3`, so a press on a bar with the pan
      // gesture is a pan. ⭐ The proof is that the OTHER Task moves too: a grab
      // (`GR-12`) would carry the pressed bar alone.
      const built = stage()
      const box = planBox(built.loop, NEAR_UID)
      const at: Point = { x: (box.x0 + box.x1) / 2, y: midY(box) }
      built.send(pointer('down', at.x, at.y, how))
      const far = whereIs(built.loop, FAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      expect(
        Math.abs(whereIs(built.loop, FAR_UID).x - far.x - travel.x),
        'table T-023a PD-1: パン。構えと当たりによらず優先する',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      expect(
        Math.abs(whereIs(built.loop, FAR_UID).y - far.y - travel.y),
        'table T-023a PD-1: 縦横の両方向で',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })
  },
)
