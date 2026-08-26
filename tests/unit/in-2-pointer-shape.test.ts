// IN-2 of table T-028 -- what shape the pointer takes where it stands.
//
// The unit these arrive on is UF-48 `single-html-shell` (CP-25 of table T-062),
// whose `frame-loop.ts` takes FT-1 of table T-078 -- 人の入力（ポインタとキー）
// -- on `receiveInput`, and hands IN-2's answer out through the sixth argument
// of `frameLoop`.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1: 読んでよいのは冒頭の宣言・公開する型・署名まで).
// What was read of `src/`: the exported declarations of `frame-loop.ts`
// (`FrameEnvironment`, `FrameValues`, `FrameLoop`, `ScreenWiring`,
// `PointerShape`, `ShowPointerShape`) and the one signature
// `frameLoop(surface, first, env, screen?, files?, showPointerShape?)`; the
// exported types of `schedule-geometry.ts` (`BarGeometry`, `Point`,
// `TaskGeometry`), of `screen-regions.ts` (`ScreenRect`), of
// `screen-renderer.ts` / `screen-surface.ts` (`ScreenPart`, `ScreenSurface`,
// `IconId`, `DisplayLanguage`) and of `schedule.ts` (`Task`,
// `TaskVisual`). NO FUNCTION BODY WAS READ.
//
// ⛔ AND NOT ONE EXPECTED SHAPE IS SPELLED HERE. IN-2 closes with 「⚠️ 形の綴り
// そのものは閉覧環境が持つ —— 本行が定めるのはどの場所がどの意味を担うかだけで
// ある」, so a case that asserted a CSS keyword would be asserting something the
// row expressly refuses to fix. Every expectation below is therefore a RELATION
// between two readings the row itself puts side by side:
//   * five places, five DISTINCT answers -- five different meanings cannot share
//     one shape and still 「その場所で何ができるかを示す」;
//   * one place, the SAME answer every time it is asked;
//   * a place IN-2 names nothing for, NO answer at all.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-028 IN-2  「ポインタの形が、その場所で何ができるかを示すこと（**何にも
//             当たらない場所は範囲選択の合図、`Ctrl` 併用と中ボタンのパン中は
//             握った手、構えているときは作図の合図、予定バーと実績バーの端点の
//             上は横方向の伸縮の合図、タスクの本体とマイルストーンの図形の上は
//             掴めることの合図**（利用者の裁定 2026-08-27）—— ⛔ **掴めるものの
//             上で形が変わらないと、選べるのかどうかを押してみるまで確かめられ
//             ない**）。⚠️ **形の綴りそのものは閉覧環境が持つ** —— 本行が定める
//             のはどの場所がどの意味を担うかだけである」
//             ⭐ FIVE PLACES, read out of the manuscript at read time by
//             `placesNamedByIn2()` rather than counted here, so that a sixth
//             ruling makes the count fail instead of passing unnoticed.
//   T-023a    「上から評価し、最初に成立した行で確定すること（MUST）」 with
//             PD-1 パン, PD-2 `Dual Cursor`, PD-3 何かに当たった, PD-4 構えて
//             いるものを作る, PD-4a 構えが依存線, PD-5 範囲選択.
//             ⚠️ SIX ROWS AND NOT FIVE -- PD-4a sits between PD-4 and PD-5.
//   T-023a's note 「判定順序を適用するのは日程の描画領域だけとすること（MUST）」,
//             with its own table of the faces it does not reach -- among them
//             浮遊するコマンドパレット (`FR-053`) and タイムルーラー, whose cell
//             reads 「ポインタ操作を持たない（MUST NOT）」.
//   T-023a    「第 1 の分岐は「当たったか」であり、「構えているか」は当たらな
//             かったときにだけ効く（MUST）」
//   T-023d    「上の行ほど優先すること（MUST）」, with GR-3 予定の開始点 /
//             GR-4 予定の終了点 / GR-5 実績の開始点 / GR-6 実績の終了点 --
//             IN-2's 「予定バーと実績バーの端点」 -- and GR-12 予定バー本体
//             「端点を除いた中間」 and GR-15 実績のマイルストーン 「実績の図形の
//             上」 -- IN-2's 「タスクの本体とマイルストーンの図形」.
//   T-023d GR-9 / GR-17  the two dummies FR-043 draws 「未着手のタスクの上」,
//             both ranked above GR-12 -- which is why the bar Task below is
//             STARTED.
//   T-023d GR-18  「未着手のマイルストーンのダミー | 未着手のマイルストーンの
//             図形の上（当たり判定は `S-93`）| 掴めば `actualStart` を置く」,
//             ranked ABOVE GR-12. See the last describe, left red on purpose.
//   T-023d's closing rules for GR-10 / GR-11, and FR-075's 「掴み点は選択して
//             いるタスクにだけ出すこと（MUST）」 for GR-1 / GR-2 -- the fixture
//             below keeps all four out of the way, and premises measure that.
//   T-023b AR-1 .. AR-6, and 「構えは持続すること（MUST）」.
//   T-036 SK-1  「キーボードだけで図形を置く経路は持たない」 -- which is why the
//             armed cases arm through a palette entry and not through a key.
//   T-109's 構え column: 「⭐ `構え` の欄は、その入口が押されたときポインタが
//             入る 表 T-023b の行である」 -- read at read time to find an entry
//             that arms AR-2.
//   T-206 S-90  「予定の端点の掴み代 | バーの上下と、端点の左右に 6px」
//   T-206 S-91  「実績の端点の掴み代 | 実績バーの帯と、端点の左右に 12px 🔎」
//             ⭐ Both are read at read time, and the body probe is placed so
//             that it clears each of them; a premise measures the margin.
//   T-028 IN-1  「ポインタ操作は押した時点で実行せず、離した時点で確定すること」
//             -- so the pan is asked about while the button is still down, and
//             again after the release.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   * WHICH keyword any of the five answers is. IN-2 gives the spelling to the
//     viewing environment in as many words.
//   * WHICH of the five ought to be the closed hand and which the resting one.
//     IN-2 names 握った手 for the pan alone and gives the other four no hand at
//     all, so nothing here pairs a shape with a name.
//   * The shape over an armed DEPENDENCY line on empty canvas. IN-2 says
//     「構えているときは作図の合図」 without qualification, while PD-4a says an
//     armed dependency on empty canvas 「何もしない。引きかけの矢印があれば捨て
//     る。構えは解かない」. The row that fixes which place carries which meaning
//     and the row that fixes what a press does disagree about this one point.
//     ⛔ REPORTED AS A HOLE RATHER THAN GUESSED -- a case either way would be
//     this file writing a requirement. The armed cases below therefore arm AR-2,
//     which PD-4 settles without argument.
//   * The shape while `Dual Cursor` mode is on (PD-2). IN-2 names no place for
//     it, and this file does not invent one.
//   * WHERE or HOW a shape is written. The pointer is the host's to paint and no
//     requirement says how.

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
  IconId,
  ScreenPart,
  ScreenSurface,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type PointerShape,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// What the manuscript says, read at read time rather than copied
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything IN-2's 作法 column writes, as one string. */
const IN_2 = rowOf('T-028', 'IN-2').cells.join(' ')

/**
 * The places IN-2 names, one entry per clause of its bold list.
 *
 * ⭐ READ AND NOT COUNTED HERE. The row carried three places until 2026-08-25,
 * four until 2026-08-27 and five after it; a file that hard-coded five would go
 * on passing through the sixth ruling while asserting nothing about it.
 * ⚠️ The clauses sit in ONE bold run separated by 、, each naming a place to the
 * left of は and a meaning to the right.
 */
function placesNamedByIn2(): readonly string[] {
  const bold = /\*\*([^*]*合図[^*]*)\*\*/.exec(IN_2)
  if (bold === null) throw new Error(`IN-2 no longer writes its places in one bold run: ${IN_2}`)
  return (bold[1] ?? '')
    .split('、')
    .map((one) => one.trim())
    .filter((one) => one.length > 0)
}

/** The px a grab allowance cell writes -- S-90's 6 and S-91's 12. */
const allowanceOf = (settingRow: string): number => {
  const cell = rowOf('T-206', settingRow).cells.join(' ')
  const found = /(\d+(?:\.\d+)?)px/.exec(cell)
  if (found === null) throw new Error(`table T-206 row ${settingRow} writes no px: ${cell}`)
  return Number(found[1])
}

/** S-90 -- 予定の端点の掴み代, 端点の左右に this many px. */
const PLAN_END_ALLOWANCE = allowanceOf('S-90')
/** S-91 -- 実績の端点の掴み代, 端点の左右に this many px. */
const ACTUAL_END_ALLOWANCE = allowanceOf('S-91')

/**
 * An entry of table T-109 whose 構え column is AR-2 -- 「その入口が押されたとき
 * ポインタが入る 表 T-023b の行」.
 *
 * ⭐ THE ONE ENTRANCE SK-1 LEAVES: 「キーボードだけで図形を置く経路は持たない」,
 * so arming is reached by pressing a palette entry and by nothing else.
 */
const ARMING_ENTRY: IconId = ((): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes('AR-2'))
  if (found === undefined) throw new Error('table T-109 has no entry whose 構え is AR-2')
  return found.id
})()

// ---------------------------------------------------------------------------
// The document these cases drive
// ---------------------------------------------------------------------------

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

const BAR_ROW = '11111111-1111-4111-8111-111111111111'
const STONE_ROW = '22222222-2222-4222-8222-222222222222'
const NEW_STONE_ROW = '33333333-3333-4333-8333-333333333333'

/**
 * The Task drawn as a bar, which carries BOTH a plan and an actual -- so that
 * IN-2's 「予定バーと実績バーの端点」 has four ends to be asked about and its
 * 「タスクの本体」 has a middle.
 *
 * ⛔ IT IS STARTED ON PURPOSE. FR-043 puts GR-9 and GR-17 on a Task that is
 * 未着手, table T-023d ranks both above GR-12, and their hit box is S-93 -- so a
 * not-started bar would answer about a dummy where this file means to ask about
 * the body. A premise counts the dummies rather than trusting this.
 * ⚠️ AND ITS NAME IS NULL ON PURPOSE. GR-10 is drawn inside the shape (NL-1 of
 * table T-013) and table T-023d settles its plain press in its own closing rule;
 * that ruling has its own file, and this one is not to be judged on it.
 */
const BAR_UID = 1
const BAR_START = '2026-04-06'
const BAR_FINISH = '2026-04-24'
const BAR_ACTUAL_START = '2026-04-08'
/** A fixture choice, not a settings value: any short actual leaves a long body. */
const BAR_ACTUAL_DURATION = 3

/** A milestone that IS started, so 実績の図形 (GR-15) stands on it. */
const STONE_UID = 2
const STONE_DAY = '2026-04-15'

/** A milestone that is NOT started. See the last describe. */
const NEW_STONE_UID = 3
const NEW_STONE_DAY = '2026-04-17'

/** 1 day is this many px at zoom 1 -- S-1's key, set wide so a day is legible. */
const PX_PER_DAY_AT_1X = 20

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
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
  }) as unknown as Task

/** SH-5 of table T-012 -- a milestone, drawn with the default glyph. */
const milestoneVisual = (taskUid: number): TaskVisual =>
  ({
    taskUid,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: 'milestone',
    milestoneGlyph: 'diamond',
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }) as unknown as TaskVisual

const rowOfSchedule = (id: string, order: number) => ({
  id,
  parentId: null,
  label: `row ${order}`,
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
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({
          uid: BAR_UID,
          start: BAR_START,
          finish: BAR_FINISH,
          actualStart: BAR_ACTUAL_START,
          actualDuration: BAR_ACTUAL_DURATION,
          percentComplete: 40,
        }),
        task({
          uid: STONE_UID,
          start: STONE_DAY,
          finish: STONE_DAY,
          milestone: true,
          actualStart: STONE_DAY,
          actualDuration: 0,
        }),
        task({
          uid: NEW_STONE_UID,
          start: NEW_STONE_DAY,
          finish: NEW_STONE_DAY,
          milestone: true,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        rowOfSchedule(BAR_ROW, 0),
        rowOfSchedule(STONE_ROW, 1),
        rowOfSchedule(NEW_STONE_ROW, 2),
      ],
      taskGroupMembers: [
        { taskUid: BAR_UID, groupId: BAR_ROW, stackOrder: null },
        { taskUid: STONE_UID, groupId: STONE_ROW, stackOrder: null },
        { taskUid: NEW_STONE_UID, groupId: NEW_STONE_ROW, stackOrder: null },
      ],
      taskVisuals: [milestoneVisual(STONE_UID), milestoneVisual(NEW_STONE_UID)],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

// ---------------------------------------------------------------------------
// The host UF-48 is given
// ---------------------------------------------------------------------------

/** BO-1 of table T-077 has already settled these by the time a loop exists. */
const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

/**
 * Where the fake surface reports the `Command Palette`.
 *
 * ⭐ A RECTANGLE THIS FILE CHOOSES, AND IT DECIDES NOTHING. FR-053 floats the
 * palette over the schedule and `ScreenRegions` holds no rectangle for it, so
 * the side that DREW it is the only side that may answer where it is (Chapter
 * 5.3, MUST). ⛔ It is put in a corner none of the probes touch, and a premise
 * measures that rather than assuming it.
 */
const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }

const inside = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks no more. */
  runAnimationFrames(): void
}

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about places or
 * shapes: it drains the queue.
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
 * A stand-in for IF-9's surface. It answers `Command Palette` for a point in
 * `PALETTE_BOX` and nothing anywhere else, which is what the press that arms
 * AR-2 needs to arrive on.
 */
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const surface: ScreenSurface = {
    // ⛔ NOTHING IS KEPT. No case here reads a `ScreenView`: IN-2's answer does
    // not travel on IF-9, because the pointer is painted by the host.
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    // IF-9 also returns what a properties-panel field settled at. Nothing here
    // drives one, so there is never a commit to take.
    readFieldCommit: () => null,
    readScreenPartAt: (x, y): ScreenPart | null => {
      if (!inside(PALETTE_BOX, { x, y })) return null
      return {
        part: 'Command Palette',
        entry: ARMING_ENTRY,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      }
    },
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ---------------------------------------------------------------------------
// Spelling one happening
// ---------------------------------------------------------------------------

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

interface HowPressed {
  readonly button?: PointerButton
  readonly modifiers?: Partial<InputModifiers>
}

const pointer = (phase: PointerPhase, at: Point, how: HowPressed = {}): PointerInput => ({
  kind: 'pointer',
  phase,
  button: how.button ?? 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...(how.modifiers ?? {}) },
  clickCount: 1,
})

/** PD-1's first spelling: 「`Ctrl` だけを伴う左ドラッグ」. */
const CTRL_DRAG: HowPressed = { modifiers: { ctrl: true } }
/** PD-1's second spelling: 「中ボタンドラッグ」. */
const MIDDLE_DRAG: HowPressed = { button: 'middle' }

// ---------------------------------------------------------------------------
// A loop, drawn and ready, with IN-2's answer collected
// ---------------------------------------------------------------------------

interface Stage {
  readonly loop: FrameLoop
  /** Hand one happening over and let the frame it owes run. */
  send(input: HumanInput): void
  /** Everything the loop has answered about the pointer's shape, oldest first. */
  readonly shown: readonly (PointerShape | null)[]
  /** The last of them, or a throw when the loop has answered nothing at all. */
  latest(): PointerShape | null
}

function stage(): Stage {
  const pen = host()
  const shown: (PointerShape | null)[] = []
  const loop = frameLoop(
    pen.surface as any,
    fixtureDocument(),
    SCREEN,
    screenPane(),
    undefined,
    (shape) => {
      shown.push(shape)
    },
  )
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // FT-3 of table T-078 is not what starts this: the first frame is owed by the
  // loop being made, so drain it before any case reads `current()`.
  pen.runAnimationFrames()
  return {
    loop,
    send,
    shown,
    latest: () => {
      if (shown.length === 0) {
        throw new Error('the loop was never asked what shape the pointer takes')
      }
      return shown[shown.length - 1] as PointerShape | null
    },
  }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

/**
 * The box one drawn bar occupies, whichever of table T-012's two forms it took
 * (SH-1 / SH-2 / SH-5 have an area to fill, SH-3 / SH-4 are a line with ends).
 *
 * ⭐ NO FORM IS REQUIRED OF ANY BAR HERE. IN-2 says nothing about how a shape is
 * built, and a case that demanded one form would be failing a renderer for
 * something the row does not ask of it.
 */
function boxOf(bar: BarGeometry | null, what: string): ScreenRect {
  if (bar === null) throw new Error(`${what} was not drawn`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  if (points.length === 0) throw new Error(`${what} was drawn with no points`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

const midY = (box: ScreenRect): number => box.y + box.height / 2
const centre = (box: ScreenRect): Point => ({ x: box.x + box.width / 2, y: midY(box) })

// ---------------------------------------------------------------------------
// The places IN-2 names, as points on this fixture's screen
// ---------------------------------------------------------------------------

/** 何にも当たらない場所: the far corner of the `Row Area`, past every bar. */
function emptyCanvas(loop: FrameLoop): Point {
  const area = frameOf(loop).regions.rowArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

/** 予定バーの端点 -- GR-3 (左端) then GR-4 (右端) of table T-023d. */
function planEnds(loop: FrameLoop): readonly Point[] {
  const box = boxOf(drawnTask(loop, BAR_UID).plan, "the bar Task's plan bar")
  return [
    { x: box.x, y: midY(box) },
    { x: box.x + box.width, y: midY(box) },
  ]
}

/** 実績バーの端点 -- GR-5 (左端) then GR-6 (右端) of table T-023d. */
function actualEnds(loop: FrameLoop): readonly Point[] {
  const box = boxOf(drawnTask(loop, BAR_UID).actual, "the bar Task's actual bar")
  return [
    { x: box.x, y: midY(box) },
    { x: box.x + box.width, y: midY(box) },
  ]
}

/**
 * タスクの本体 -- GR-12, 「端点を除いた中間」.
 *
 * ⭐ HALFWAY BETWEEN THE ACTUAL'S RIGHT END AND THE PLAN'S RIGHT END, rather
 * than simply the plan bar's centre: that is the widest stretch of the plan bar
 * with no end of either bar inside it, so the probe clears S-90's allowance and
 * S-91's by the largest margin this fixture can give. A premise measures both.
 */
function barBody(loop: FrameLoop): Point {
  const plan = boxOf(drawnTask(loop, BAR_UID).plan, "the bar Task's plan bar")
  const actual = boxOf(drawnTask(loop, BAR_UID).actual, "the bar Task's actual bar")
  return { x: (actual.x + actual.width + plan.x + plan.width) / 2, y: midY(plan) }
}

/** マイルストーンの図形 -- the started one, whose 実績の図形 is GR-15. */
const startedMilestone = (loop: FrameLoop): Point =>
  centre(boxOf(drawnTask(loop, STONE_UID).plan, "the started milestone's figure"))

/** マイルストーンの図形 -- the one nobody has started. See the last describe. */
const newMilestone = (loop: FrameLoop): Point =>
  centre(boxOf(drawnTask(loop, NEW_STONE_UID).plan, "the not-started milestone's figure"))

/** The タイムルーラー, which table T-023a's own note keeps out of that order. */
function timeRuler(loop: FrameLoop): Point {
  return centre(frameOf(loop).regions.timeRuler)
}

// ---------------------------------------------------------------------------
// Asking IN-2 its question
// ---------------------------------------------------------------------------

/** Stand the pointer at one point and read the shape the loop answered. */
function shapeAt(built: Stage, at: Point): PointerShape | null {
  built.send(pointer('move', at))
  return built.latest()
}

/**
 * The shape while a pan is in flight -- IN-2's 「`Ctrl` 併用と中ボタンのパン中」.
 *
 * ⭐ ASKED WHILE THE BUTTON IS STILL DOWN, because that is what 「パン中」 means
 * and because IN-1 settles a pointer operation on RELEASE. The gesture is then
 * released at the point it began, so nothing has actually panned and the caller
 * may go on reading resting shapes from the same screen.
 */
function shapeWhilePanning(built: Stage, at: Point, how: HowPressed): PointerShape | null {
  built.send(pointer('move', at))
  built.send(pointer('down', at, how))
  const held = built.latest()
  built.send(pointer('up', at, how))
  return held
}

/** Press the palette entry whose 構え column is AR-2, and let IN-1 settle it. */
function arm(built: Stage): void {
  const at = centre(PALETTE_BOX)
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the fixture draws what IN-2 names', () => {
  it('reads five places out of IN-2, one per meaning it gives (利用者の裁定 2026-08-27)', () => {
    expect(
      placesNamedByIn2(),
      'T-028 IN-2: 何にも当たらない場所 / パン中 / 構えているとき / 端点の上 / 本体と図形の上',
    ).toHaveLength(5)
  })

  it('draws the bar Task with both a plan bar and an actual bar', () => {
    const built = stage()
    expect(drawnTask(built.loop, BAR_UID).plan, 'IN-2: 予定バー').not.toBeNull()
    expect(drawnTask(built.loop, BAR_UID).actual, 'IN-2: 実績バー').not.toBeNull()
  })

  it('draws both milestones as milestones with a figure (SH-5 of table T-012)', () => {
    const built = stage()
    expect(drawnTask(built.loop, STONE_UID).shapeKind).toBe('milestone')
    expect(drawnTask(built.loop, NEW_STONE_UID).shapeKind).toBe('milestone')
    expect(drawnTask(built.loop, STONE_UID).plan).not.toBeNull()
    expect(drawnTask(built.loop, NEW_STONE_UID).plan).not.toBeNull()
  })

  it('draws no dummy on the started bar Task, so GR-9 / GR-17 cannot claim its body', () => {
    const built = stage()
    expect(
      drawnTask(built.loop, BAR_UID).dummies,
      'FR-043 puts the two dummies on a Task that is 未着手, and this one is not',
    ).toHaveLength(0)
  })

  it('draws no name label on the bar Task, so GR-10 is not in the way', () => {
    const built = stage()
    expect(drawnTask(built.loop, BAR_UID).label).toBeNull()
  })

  it('draws no fade grab point, so GR-1 / GR-2 do not outrank the ends', () => {
    const built = stage()
    expect(
      drawnTask(built.loop, BAR_UID).fadeHandles,
      'FR-075 (MUST): 掴み点は選択しているタスクにだけ出すこと',
    ).toHaveLength(0)
  })

  it('puts the body probe clear of every endpoint allowance (S-90 and S-91)', () => {
    const built = stage()
    const at = barBody(built.loop)
    for (const end of planEnds(built.loop)) {
      expect(
        Math.abs(at.x - end.x),
        'T-206 S-90: 予定の端点の掴み代 ... 端点の左右に 6px',
      ).toBeGreaterThan(PLAN_END_ALLOWANCE)
    }
    for (const end of actualEnds(built.loop)) {
      expect(
        Math.abs(at.x - end.x),
        'T-206 S-91: 実績の端点の掴み代 ... 端点の左右に 12px',
      ).toBeGreaterThan(ACTUAL_END_ALLOWANCE)
    }
  })

  it('keeps every probe out of the rectangle the fake calls the palette', () => {
    const built = stage()
    const probes = [
      emptyCanvas(built.loop),
      barBody(built.loop),
      startedMilestone(built.loop),
      newMilestone(built.loop),
      timeRuler(built.loop),
      ...planEnds(built.loop),
      ...actualEnds(built.loop),
    ]
    for (const at of probes) expect(inside(PALETTE_BOX, at)).toBe(false)
  })

  it('arms through the one entrance SK-1 leaves, and the arm reaches the shape', () => {
    const built = stage()
    const before = shapeAt(built, emptyCanvas(built.loop))
    arm(built)
    expect(
      shapeAt(built, emptyCanvas(built.loop)),
      'T-036 SK-1: キーボードだけで図形を置く経路は持たない -- so the palette press is the arm',
    ).not.toBe(before)
  })
})

// ===========================================================================
// (a) Five places, five distinct answers
// ===========================================================================

/** The five, read off one loop in an order that leaves the arm until last. */
function fiveAnswers(): Readonly<Record<string, PointerShape | null>> {
  const built = stage()
  const nothingHit = shapeAt(built, emptyCanvas(built.loop))
  const endpoint = shapeAt(built, planEnds(built.loop)[0] as Point)
  const grabbable = shapeAt(built, barBody(built.loop))
  const panning = shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)
  arm(built)
  const arming = shapeAt(built, emptyCanvas(built.loop))
  return { nothingHit, panning, arming, endpoint, grabbable }
}

describe('T-028 IN-2: the five places carry five different meanings', () => {
  it('answers a shape at every one of the five (「その場所で何ができるかを示すこと」)', () => {
    for (const [place, shape] of Object.entries(fiveAnswers())) {
      expect(shape, `T-028 IN-2 names ${place}, so a shape must stand there`).not.toBeNull()
    }
  })

  it('answers a DISTINCT shape at each of them', () => {
    // ⭐ WHY DISTINCTNESS IS THE ASSERTION AND A KEYWORD IS NOT. IN-2 closes
    // 「⚠️ 形の綴りそのものは閉覧環境が持つ —— 本行が定めるのはどの場所がどの
    // 意味を担うかだけである」. Five places with five different meanings that
    // shared one shape would not 示す what can be done there, which is the MUST.
    const answers = Object.values(fiveAnswers())
    expect(
      new Set(answers).size,
      `two of IN-2's five places answered alike: ${answers.join(', ')}`,
    ).toBe(answers.length)
  })

  it('answers as many distinct shapes as IN-2 names places', () => {
    expect(new Set(Object.values(fiveAnswers())).size).toBe(placesNamedByIn2().length)
  })
})

// ===========================================================================
// (b) 何にも当たらない場所は範囲選択の合図 -- PD-5 of table T-023a
// ===========================================================================

describe('T-028 IN-2: 何にも当たらない場所は範囲選択の合図', () => {
  it('answers a shape where nothing is hit and nothing is armed (PD-5)', () => {
    const built = stage()
    expect(shapeAt(built, emptyCanvas(built.loop))).not.toBeNull()
  })

  it('answers the same one every time the pointer comes back to it', () => {
    const built = stage()
    const first = shapeAt(built, emptyCanvas(built.loop))
    shapeAt(built, barBody(built.loop))
    expect(
      shapeAt(built, emptyCanvas(built.loop)),
      'T-028 IN-2 fixes which place carries which meaning, so one place keeps one shape',
    ).toBe(first)
  })

  it('does not answer it on a bar body: PD-3 is reached before PD-5', () => {
    const built = stage()
    expect(shapeAt(built, barBody(built.loop))).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })
})

// ===========================================================================
// (c) 予定バーと実績バーの端点の上は横方向の伸縮の合図
//     -- GR-3 / GR-4 / GR-5 / GR-6 of table T-023d
// ===========================================================================

describe('T-028 IN-2: 予定バーと実績バーの端点の上は横方向の伸縮の合図', () => {
  it('answers one and the same shape at all four ends', () => {
    const built = stage()
    const ends = [...planEnds(built.loop), ...actualEnds(built.loop)]
    const answers = ends.map((at) => shapeAt(built, at))
    expect(answers[0], 'T-023d GR-3: 予定の開始点 | 予定バーの左端').not.toBeNull()
    expect(
      new Set(answers).size,
      `T-028 IN-2 gives 予定バーと実績バーの端点 ONE meaning: ${answers.join(', ')}`,
    ).toBe(1)
  })

  it('answers it on the plan bar left end -- GR-3, 予定バーの左端', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    expect(shapeAt(built, left as Point)).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })

  it('answers it on the actual bar right end -- GR-6, 実績バーの右端', () => {
    const built = stage()
    const ends = actualEnds(built.loop)
    const right = ends[ends.length - 1] as Point
    expect(shapeAt(built, right)).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })

  it('answers the same one every time the pointer comes back to an end', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    const first = shapeAt(built, left as Point)
    shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, left as Point)).toBe(first)
  })
})

// ===========================================================================
// (d) タスクの本体とマイルストーンの図形の上は掴めることの合図
//     (利用者の裁定 2026-08-27) -- GR-12 and GR-15 of table T-023d
// ===========================================================================

describe('T-028 IN-2: タスクの本体とマイルストーンの図形の上は掴めることの合図', () => {
  it('answers a shape on the bar body -- GR-12, 端点を除いた中間', () => {
    const built = stage()
    expect(
      shapeAt(built, barBody(built.loop)),
      'T-028 IN-2 (⛔): 掴めるものの上で形が変わらないと、選べるのかどうかを押してみるまで確かめられない',
    ).not.toBeNull()
  })

  it('answers a shape on a milestone figure -- GR-15, 実績の図形の上', () => {
    const built = stage()
    expect(shapeAt(built, startedMilestone(built.loop))).not.toBeNull()
  })

  it('answers ONE AND THE SAME shape on the bar body and on the milestone figure', () => {
    const built = stage()
    expect(
      shapeAt(built, startedMilestone(built.loop)),
      'T-028 IN-2 gives 「タスクの本体とマイルストーンの図形」 one meaning, not two',
    ).toBe(shapeAt(built, barBody(built.loop)))
  })

  it('⭐ answers something OTHER than the bars ends do', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    // IN-2's two clauses side by side: 「端点の上は横方向の伸縮の合図」 against
    // 「本体と図形の上は掴めることの合図」. Two meanings, so two shapes --
    // otherwise one bar would promise the same thing end to end.
    expect(shapeAt(built, barBody(built.loop))).not.toBe(shapeAt(built, left as Point))
  })

  it('⭐ answers something OTHER than the bars ends do on a milestone too', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    expect(shapeAt(built, startedMilestone(built.loop))).not.toBe(shapeAt(built, left as Point))
  })

  it('answers the same one every time the pointer comes back to the body', () => {
    const built = stage()
    const first = shapeAt(built, barBody(built.loop))
    shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, barBody(built.loop))).toBe(first)
  })
})

// ===========================================================================
// (e) `Ctrl` 併用と中ボタンのパン中は握った手 -- PD-1 of table T-023a
// ===========================================================================

describe('T-028 IN-2: `Ctrl` 併用と中ボタンのパン中は握った手', () => {
  it('answers a shape while a `Ctrl` drag is in flight', () => {
    const built = stage()
    expect(shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)).not.toBeNull()
  })

  it('answers the SAME shape for the middle button as for `Ctrl` (one place, one meaning)', () => {
    const built = stage()
    const byCtrl = shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)
    expect(
      shapeWhilePanning(built, emptyCanvas(built.loop), MIDDLE_DRAG),
      'T-028 IN-2 writes 「`Ctrl` 併用と中ボタンのパン中」 as ONE place',
    ).toBe(byCtrl)
  })

  it('answers something OTHER than the resting shape of the place under it', () => {
    const built = stage()
    const resting = shapeAt(built, emptyCanvas(built.loop))
    expect(shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)).not.toBe(resting)
  })

  it('answers it over a bar body too -- PD-1 「構えと当たりによらず優先する」', () => {
    const built = stage()
    const overEmpty = shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)
    expect(shapeWhilePanning(built, barBody(built.loop), CTRL_DRAG)).toBe(overEmpty)
  })

  it('stops answering it once the button is released (IN-1: 離した時点で確定する)', () => {
    const built = stage()
    const at = emptyCanvas(built.loop)
    const resting = shapeAt(built, at)
    expect(shapeWhilePanning(built, at, CTRL_DRAG)).not.toBe(resting)
    expect(
      built.latest(),
      'T-028 IN-2 asks for the hand 「パン中」, and the release has ended the pan',
    ).toBe(resting)
  })
})

// ===========================================================================
// (f) 構えているときは作図の合図 -- PD-4 of table T-023a
// ===========================================================================

describe('T-028 IN-2: 構えているときは作図の合図', () => {
  it('answers a shape once a figure is armed (AR-2 of table T-023b)', () => {
    const built = stage()
    arm(built)
    expect(shapeAt(built, emptyCanvas(built.loop))).not.toBeNull()
  })

  it('answers something OTHER than the un-armed place answers', () => {
    const built = stage()
    const before = shapeAt(built, emptyCanvas(built.loop))
    arm(built)
    expect(
      shapeAt(built, emptyCanvas(built.loop)),
      'T-028 IN-2: 何にも当たらない場所は範囲選択の合図 / 構えているときは作図の合図',
    ).not.toBe(before)
  })

  it('goes on answering it while the arm lasts (表 T-023b: 構えは持続すること)', () => {
    const built = stage()
    arm(built)
    const first = shapeAt(built, emptyCanvas(built.loop))
    shapeAt(built, timeRuler(built.loop))
    expect(shapeAt(built, emptyCanvas(built.loop))).toBe(first)
  })

  it('does not answer it on a bar body: 当たったか is decided before 構えているか', () => {
    const built = stage()
    arm(built)
    // T-023a: 「第 1 の分岐は「当たったか」であり、「構えているか」は当たらな
    // かったときにだけ効く（MUST）」, and AR-2's 当たったとき column reads
    // 「そのものへの既定操作（既存が勝つ）」.
    expect(shapeAt(built, barBody(built.loop))).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })
})

// ===========================================================================
// (g) A place IN-2 names nothing for answers nothing
// ===========================================================================

describe('T-028 IN-2 names five places and no more', () => {
  it('answers nothing on the タイムルーラー', () => {
    const built = stage()
    // 表 T-023a's note: 「判定順序を適用するのは日程の描画領域だけとすること
    // （MUST）」, and its タイムルーラー row: 「ポインタ操作を持たない（MUST
    // NOT）」. None of IN-2's five places can arise there, and 何にも当たらない
    // 場所は範囲選択の合図 would promise the marquee that row forbids the ruler.
    expect(
      shapeAt(built, timeRuler(built.loop)),
      'T-023a: 判定順序を適用するのは日程の描画領域だけとすること（MUST）',
    ).toBeNull()
  })

  it('answers nothing on the `Command Palette`, which floats over the drawing area', () => {
    const built = stage()
    // The same note lists 浮遊するコマンドパレット among the faces the decision
    // order does not reach; `FR-053` holds that one instead. IN-2 names no place
    // on it, so nothing may be invented for it.
    expect(shapeAt(built, centre(PALETTE_BOX))).toBeNull()
  })

  it('answers the ruler the same way every time the pointer comes back to it', () => {
    const built = stage()
    const first = shapeAt(built, timeRuler(built.loop))
    shapeAt(built, barBody(built.loop))
    expect(shapeAt(built, timeRuler(built.loop))).toBe(first)
  })
})

// ===========================================================================
// (h) ⛔ LEFT RED ON PURPOSE -- 未着手のマイルストーンの図形
// ===========================================================================
//
// ⛔ TWO ROWS DISAGREE HERE, AND THE CASE IS JUDGED ON IN-2 BECAUSE IN-2 IS
// WHAT THIS FILE IS ABOUT.
//
//   T-028 IN-2 (利用者の裁定 2026-08-27): 「タスクの本体とマイルストーンの図形の
//   上は掴めることの合図」 -- with no exception for a milestone nobody has
//   started -- and its reason: 「⛔ 掴めるものの上で形が変わらないと、選べるのか
//   どうかを押してみるまで確かめられない」.
//
//   T-023d GR-18: 「未着手のマイルストーンのダミー | 未着手のマイルストーンの図形
//   の上（当たり判定は `S-93`）| 掴めば `actualStart` を置く」 -- and that table
//   orders 「上の行ほど優先すること（MUST）」 with GR-18 ABOVE GR-12. So on a
//   milestone nobody has started, the row that claims the point is GR-18, and
//   IN-2 gives GR-18 no shape of its own.
//
// ⚠️ GR-18 IS STILL A GRAB: its 操作 column begins 掴めば. So IN-2's reason
// applies to it in full -- the figure IS grabbable there, and a pointer that
// does not change cannot say so. ⛔ NOT TUNED TO WHATEVER THE BUILD ANSWERS: to
// close this the other way, IN-2 needs a clause excepting the not-started
// milestone, and that is 利用者の裁定 and not this file's to write.

describe('T-028 IN-2 on a milestone that has not been started', () => {
  it('answers a shape on its figure at all', () => {
    const built = stage()
    expect(
      shapeAt(built, newMilestone(built.loop)),
      'T-028 IN-2: マイルストーンの図形の上は掴めることの合図 -- 未着手 is not excepted',
    ).not.toBeNull()
  })

  it('answers the same shape as a started milestone and as a bar body', () => {
    const built = stage()
    expect(
      shapeAt(built, newMilestone(built.loop)),
      'T-028 IN-2 gives 「タスクの本体とマイルストーンの図形」 one meaning, and 表 T-023d GR-18 is still 掴めば',
    ).toBe(shapeAt(built, barBody(built.loop)))
  })
})
