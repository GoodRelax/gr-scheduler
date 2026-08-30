// The picture a HELD press owes, and the value it may not write yet: FR-052's
// `Panel Divider` and table T-023d's `GR-1` / `GR-2` fade grab points.
//
// The unit these arrive on is UF-48 `single-html-shell` (CP-25 of table T-062),
// whose `frame-loop.ts` takes FT-1 of table T-078 -- 人の入力（ポインタとキー）
// -- on `receiveInput`, and answers what one frame computed on `current()` and
// what the document says on `document()`.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1: 読んでよいのは冒頭の宣言・公開する型・署名まで).
// What was read of `src/`: the exported declarations of `frame-loop.ts`
// (`FrameEnvironment`, `FrameValues`, `FrameLoop`, `ScreenWiring`) and the one
// signature `frameLoop(surface, first, env, screen?, files?, showPointerShape?)`;
// the exported types of `schedule-geometry.ts` (`BarGeometry`, `TaskGeometry`,
// `ScheduleGeometry`), of `screen-regions.ts` (`ScreenRegions`), of
// `screen-renderer.ts` (`ScreenView`, `PanelDivider`) and of `screen-surface.ts`
// (`ScreenPart`, `ScreenSurface`); the key names of `DocumentSettings`. NO
// FUNCTION BODY WAS READ, and not one expected value below comes out of `src/`:
// every one is either read out of the manuscript at run time (`specTable`), or
// stated as a RELATION between two things the specification puts side by side
// (the drawn handle against the drawn outline; the picture against the document;
// the document before a drag against the document after one undo).
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   FR-052    「境界を掴んでいるあいだ、その時点のポインタ位置が決める 2 つの
//             幅で画面を描いて示すこと（MUST）」 -- and, in the same statement,
//             「⛔ 掴んでいるあいだ、その幅を文書へ書いてはならない（MUST NOT）
//             —— `FR-031` は身振り 1 つを取り消しの 1 段と定めており、途中の幅を
//             書くと 1 回のドラッグが何段にもなる」, 「⚠️ 確定は 表 T-028 の
//             `IN-1` に従う（離した時点）」, 「判定は `Row Area` の幅が 0 より
//             大きいことをもって行うこと（MUST）……これが 0 以下になる組を
//             受け付けてはならない（MUST NOT）」 and 「行見出しパネルの幅を 0 に
//             できてはならない（MUST NOT）」.
//   T-023d    its closing rule for the fade: 「`GR-1` / `GR-2` を掴んでいる
//             あいだ、置くことになるフェードの形と掴み点を描いて示すこと
//             （MUST）。掴み点はポインタが決める日に置くこと（MUST）……⚠️ 確定は
//             表 T-028 の `IN-1` に従う（離した時点）。⛔ 掴んでいるあいだ日数を
//             文書へ書いてはならない（MUST NOT）（`FR-031`）」,
//             and the rule after it: 「`GR-1` / `GR-2` の日数は、ポインタの下の
//             日から求めること（MUST）。`GR-1` は `start` からの日数、`GR-2` は
//             `end` までの日数とし、いずれも 1 日単位に四捨五入する。得た日数は
//             表 T-012a の `FD-6` で切り詰めること（MUST）」.
//   T-023d GR-1  掴み領域「フェードイン」/ 場所「予定バーの左上の角（表 T-012a の
//             点 4）」/ 操作「`fadeInDays` を変える（矩形と矢羽根のみ）」
//   T-023d GR-2  掴み領域「フェードアウト」/ 場所「予定バーの右下の角（表 T-012a の
//             点 2）」/ 操作「`fadeOutDays` を変える（矩形と矢羽根のみ）」
//             ⭐ THE 場所 CELLS ARE READ OUT OF THE MANUSCRIPT BELOW, not copied:
//             which numbered point each row names is what `pointNamedBy` asks.
//   T-012a    「`start` / `end` は日、`上` / `下` はバーの上端 / 下端とする。
//             多角形は 4 点を次の順に結ぶ」 with 点 1 = (`start`, 下),
//             点 2 = (`end − fadeOut`, 下), 点 3 = (`end`, 上),
//             点 4 = (`start + fadeIn`, 上).
//   T-012a FD-4  「どちらも 0 または未設定 | 矩形。フェードがあるときだけ多角形に
//             切り替える」 -- WHICH IS WHY EVERY CASE BELOW DRIVES A Task WITH
//             TWO DIFFERENT, NON-ZERO FADES: on a rectangle 点 4 and 点 2
//             collapse onto the bar's own corners, so a fade-less Task could not
//             tell GR-1's place from the corner and would prove nothing.
//   T-012a FD-5  「適用する形状 | 矩形と矢羽根のみ」 -- the fixture's Task is
//             drawn as the default shape, and a premise below pins that the bar
//             really came out as an area with four points.
//   T-012a FD-6  「`fadeIn` を `[0, 期間]` に丸めた後、`fadeOut` を
//             `[0, 期間 − fadeIn]` に丸める（`fadeIn` が勝つ）。⛔ 本表の「期間」は
//             暦日で数えること（MUST）」
//   T-220 IV-12  「`fadeInDays` と `fadeOutDays` の和が、その `Task` の期間を
//             超えないこと」 with the same 暦日 count.
//   FR-075    「作成者がその日数を、表 T-023d の `GR-1` / `GR-2` の掴み点で編集
//             できるようにすること。掴み点は選択しているタスクにだけ出すこと
//             （MUST）」 -- so every fade case selects the Task first (SL-2).
//   T-023c SL-2  「1 つ選ぶ | 対象をクリックする。それまでの選択は置き換える」
//   T-028 IN-1   「ポインタ操作は押した時点で実行せず、離した時点で確定すること。
//             中断は `Esc` で行い……」
//   T-028 IN-1a  「ボタンを離す前に窓の外でポインタが失われたときは、ドラッグを
//             中断として終わらせること（MUST）」
//   T-028 IN-4   Esc consumes one level, 開いている面 → 進行中のドラッグ… -- with
//             no surface open, the first Esc takes the press in flight.
//   FR-031    「文書を変えるドラッグ 1 回を 1 段にまとめること（MUST）。押してから
//             離すまでの途中経過を段に刻むと、1 本のバーを動かしただけで履歴が
//             数十段埋まる」
//   T-027 UN-16  「対象外 | 見る場所の割り付けと出力の設定 —— パネル幅
//             （`FR-052`）…… ⚠️ 保存することと戻せることは別である …… いずれも読む
//             人の都合であって、日程の内容ではない」
//             ⛔ ONE CASE IS LEFT RED ON PURPOSE ON THIS ROW -- see the describe
//             that names it, which also says which half of it is disputed and
//             why the case is not judged on that half.
//   S-79      `rowTitlePanelWidth`, 下限 `rowTitleIndent` × `maxGroupDepth`,
//             上限 「`Row Area` の幅 > 0 に従う」.
//   S-80      `propertyPanelWidth`, 既定 `0`（＝閉じている）.
//   S-134     「`Panel Divider` の掴み帯（`FR-051`）| 境界に重なる 8px」 -- the
//             band is ON the boundary, which is why every divider case below
//             presses its CENTRE (see `boundaryOf`).
//   T-031 SC-3   行見出しパネルは拡大しても常に表示されている -- the reason
//             FR-052 forbids a width of 0.
//   U-50 / FR-052's own formula: `Row Area` の幅 = `Schedule Canvas` の幅 −
//             `canvasPadding` − 2 つの幅 − 縦のスクロールバーの太さ.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - WHICH `DocumentCommand` a release plans. Table T-108 is not this file's
//     subject and the release is read where it lands: on `document()`.
//   - The SHAPE of a refused pair of widths mid-drag. See the last describe --
//     the specification settles what may be WRITTEN and does not settle what is
//     DRAWN while the pointer names a pair it forbids.
//   - Anything about `GR-19`, the palette's band: FR-053 already has its own
//     following rule and its own owner.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
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

// ---------------------------------------------------------------------------
// What the manuscript says, read at read time rather than copied
// ---------------------------------------------------------------------------

const SPEC = join(process.cwd(), 'docs', 'spec')

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/**
 * Which numbered point of table T-012a a row of table T-023d names in its 場所
 * column -- 「予定バーの左上の角（表 T-012a の 点 4）」 answers 4.
 *
 * ⭐ READ AND NOT COPIED. This round moved those two cells from 「左上の角」 to
 * a named point, so a case that hard-coded 4 and 2 would go on passing if the
 * cells moved again.
 */
function pointNamedBy(grabRow: string): number {
  const cell = rowOf('T-023d', grabRow).by['場所'] ?? ''
  const found = /点\s*(\d+)/.exec(cell)
  if (found === null) {
    throw new Error(`table T-023d row ${grabRow} names no numbered point of table T-012a: ${cell}`)
  }
  return Number(found[1])
}

/**
 * The four rows of table T-012a's FIRST table -- the polygon's points -- as
 * `{ 横, 縦 }` by point number.
 *
 * ⛔ `specTable` CANNOT READ THIS ONE. Its first column is 「点」 and not
 * 「行 ID」, so that helper throws by design (Chapter 1.9 :274). The table is
 * still read out of the manuscript rather than copied, for the same reason.
 */
function fadeOutlinePoints(): Map<number, { readonly x: string; readonly y: string }> {
  const text = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').split('\n')
  const at = text.findIndex((line) => line.startsWith('**表 T-012a —'))
  if (at < 0) throw new Error('the specification has no table T-012a')
  const points = new Map<number, { x: string; y: string }>()
  for (const line of text.slice(at + 1)) {
    if (line.startsWith('**表 ') || line.startsWith('#')) break
    if (!line.trim().startsWith('|')) continue
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((oneCell) => oneCell.trim())
    const first = cells[0] ?? ''
    if (!/^\d+$/.test(first)) continue
    points.set(Number(first), { x: cells[1] ?? '', y: cells[2] ?? '' })
  }
  if (points.size !== 4) {
    throw new Error(`table T-012a's polygon has ${points.size} points, not the four it states`)
  }
  return points
}

const OUTLINE = fadeOutlinePoints()

/** 「上」 for the bar's top edge, 「下」 for its bottom one (table T-012a). */
const TOP = '上'
const BOTTOM = '下'

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

const ROW_ID = '11111111-1111-4111-8111-111111111111'

/** The Task every fade case drives. */
const FADED_UID = 1
const FADE_START = '2026-04-06'
const FADE_FINISH = '2026-04-20'
/**
 * ⛔ TWO DIFFERENT NON-ZERO FADES, which is a premise and not a decoration.
 * FD-4 collapses 点 4 and 点 2 onto the bar's corners when both are 0, and equal
 * fades would leave the two offsets indistinguishable -- so neither could show
 * that GR-1 is drawn at 点 4 rather than at the corner.
 */
const FADE_IN_DAYS = 2
const FADE_OUT_DAYS = 5

/** 1 day is this many px at zoom 1 -- S-1's key, set wide so a day is legible. */
const PX_PER_DAY_AT_1X = 20

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (
    uid: number,
    start: string,
    finish: string,
    name: string,
    fadeInDays: number | null,
    fadeOutDays: number | null,
  ): Task => ({
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
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
    fadeInDays,
    fadeOutDays,
    dependencies: [],
    carry: {},
    carryElements: [],
  })
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [task(FADED_UID, FADE_START, FADE_FINISH, 'Faded', FADE_IN_DAYS, FADE_OUT_DAYS)],
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: ROW_ID,
          parentId: null,
          label: 'Alpha',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: false,
          isHidden: false,
          color: null,
          height: null,
        },
      ],
      taskGroupMembers: [{ taskUid: FADED_UID, groupId: ROW_ID, stackOrder: null }],
      taskVisuals: [],
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

const taskOf = (loop: FrameLoop, uid: number): Task => {
  const found = loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

const settingsOf = (loop: FrameLoop): any => (loop.document() as any).documentSettings

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

interface Host {
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks no more. */
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about presses, widths
 * or fades: it drains the queue and counts pictures.
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

interface ScreenPane {
  readonly wiring: ScreenWiring
  last(): ScreenView
}

/**
 * A stand-in for IF-9's surface that answers `readScreenPartAt` FROM WHAT IT WAS
 * TOLD TO DRAW.
 *
 * ⭐ WHY IT IS NOT A FIXED ANSWER. Chapter 5.3 (MUST) makes the side that DREW
 * an entry the side that answers where it is, and `ScreenPart.dividerPanel` is
 * the only road a press on a `Panel Divider` has in. So this fake reads the
 * bands out of the `ScreenFrame` it was handed rather than inventing a
 * rectangle -- ⛔ the band's PLACE is never decided here, only reported.
 */
function screenPane(language: DisplayLanguage = 'en'): ScreenPane {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    // IF-9 also returns what a properties-panel field settled at.
    // Nothing here drives one, so there is never a commit to take.
    readFieldCommit: () => null,
    // IF-9's fifth answer. This fake draws no field, so nothing is unsettled.
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (x, y): ScreenPart | null => {
      const view = views[views.length - 1]
      if (view === undefined) return null
      for (const divider of view.frame.dividers) {
        const band = divider.band
        const inside =
          x >= band.x && x < band.x + band.width && y >= band.y && y < band.y + band.height
        if (inside) {
          return {
            part: 'Panel Divider',
            entry: null,
            format: null,
            rowGroupId: null,
            resourceUid: null,
            dividerPanel: divider.panel,
            noticeDismissKey: null,
          }
        }
      }
      return null
    },
  }
  return {
    wiring: { surface, language },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ---------------------------------------------------------------------------
// Spelling one happening
// ---------------------------------------------------------------------------

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

/** SK-6 -- 元に戻す. */
const UNDO = (): HumanInput => key('Z', { ctrl: true })
/** SK-8, whose rule is IN-4: with no surface open the first Esc takes the drag. */
const ESCAPE = (): HumanInput => key('Esc')

// ---------------------------------------------------------------------------
// A loop, drawn and ready
// ---------------------------------------------------------------------------

interface Stage {
  readonly loop: FrameLoop
  readonly pane: ScreenPane
  /** Hand one happening over and let the frame it owes run. */
  send(input: HumanInput): void
}

function stage(): Stage {
  const pane = screenPane()
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, pane.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // FT-3 of table T-078 is not what starts this: the first frame is owed by the
  // loop being made, so drain it before any case reads `current()`.
  pen.runAnimationFrames()
  return { loop, pane, send }
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

/** The plan bar's four points -- FD-5's area form, which is what a fade needs. */
function outlineOf(bar: BarGeometry | null): readonly Point[] {
  if (bar === null) throw new Error('the Task has no plan bar')
  if (bar.form !== 'outline') {
    throw new Error(`the plan bar came out as a ${bar.form}, which table T-012a gives no fade`)
  }
  return bar.points
}

/**
 * The polygon's four points BY THE NUMBER TABLE T-012a GIVES THEM, identified by
 * what that table says each one is rather than by where it sits in the array.
 *
 * 点 1 = (`start`, 下) and 点 2 = (`end − fadeOut`, 下) are the two on the
 * bottom edge, and 点 2 is the right-hand one of them whenever the fade is
 * shorter than the bar; 点 3 = (`end`, 上) and 点 4 = (`start + fadeIn`, 上) are
 * the two on the top edge, and 点 4 is the left-hand one.
 *
 * ⭐ Reading the table's own 横 / 縦 columns rather than trusting the array's
 * order, so that a renderer which starts the polygon at another corner is not
 * failed for something table T-012a does not require of it.
 */
function numberedPoints(points: readonly Point[]): Map<number, Point> {
  expect(points.length, 'table T-012a: 多角形は 4 点を次の順に結ぶ').toBe(4)
  const ys = points.map((one) => one.y)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  const onTop = points.filter((one) => one.y === top).sort((a, b) => a.x - b.x)
  const onBottom = points.filter((one) => one.y === bottom).sort((a, b) => a.x - b.x)
  expect(onTop.length, 'table T-012a puts 点 3 and 点 4 on the bar\'s top edge').toBe(2)
  expect(onBottom.length, 'table T-012a puts 点 1 and 点 2 on the bar\'s bottom edge').toBe(2)
  const by = new Map<number, Point>()
  for (const [number, where] of OUTLINE) {
    if (where.y !== TOP && where.y !== BOTTOM) {
      throw new Error(`table T-012a 点 ${number} has a 縦 this file cannot read: ${where.y}`)
    }
    const edge = where.y === TOP ? onTop : onBottom
    // 点 1 is `start` and 点 4 is `start + fadeIn`; 点 3 is `end` and 点 2 is
    // `end − fadeOut`. So on each edge the one whose 横 mentions `start` alone
    // or `end` alone is the outer corner, and the one with the fade in it is
    // the inner point.
    const isInner = where.x.includes('fade')
    const left = edge[0] as Point
    const right = edge[1] as Point
    if (where.y === TOP) by.set(number, isInner ? left : right)
    else by.set(number, isInner ? right : left)
  }
  return by
}

/** How wide one calendar day is drawn, taken from the fade the document holds. */
function pxPerDay(loop: FrameLoop): number {
  const by = numberedPoints(outlineOf(drawnTask(loop, FADED_UID).plan))
  const one = by.get(1) as Point
  const four = by.get(4) as Point
  const task = taskOf(loop, FADED_UID)
  const days = task.fadeInDays ?? 0
  expect(days, 'the fixture Task must carry a fade for this scale to exist').toBeGreaterThan(0)
  return (four.x - one.x) / days
}

/** Where the two grab points are drawn -- GR-1 first, then GR-2 (table T-023d). */
function fadeHandlesOf(loop: FrameLoop): readonly Point[] {
  return drawnTask(loop, FADED_UID).fadeHandles
}

/** SL-2: click the bar to select it, so FR-075 draws the two grab points. */
function selectTheTask(built: Stage): void {
  const points = outlineOf(drawnTask(built.loop, FADED_UID).plan)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const at = {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('up', at.x, at.y))
}

/** A stage whose Task is selected and whose two fade grab points are drawn. */
function withFadeHandles(): Stage {
  const built = stage()
  selectTheTask(built)
  expect(
    fadeHandlesOf(built.loop).length,
    'FR-075 (MUST): 掴み点は選択しているタスクにだけ出すこと -- and this Task is selected',
  ).toBe(2)
  return built
}

// ---------------------------------------------------------------------------
// The `Panel Divider` the FR-052 cases grab
// ---------------------------------------------------------------------------

/** The band drawn for one boundary, as the surface was told to draw it. */
function bandOf(built: Stage, panel: 'rowTitlePanel' | 'propertiesPanel') {
  const found = built.pane.last().frame.dividers.find((one) => one.panel === panel)
  if (found === undefined) throw new Error(`no Panel Divider was drawn for the ${panel}`)
  return found.band
}

/**
 * The point a divider case presses: the CENTRE of S-134's band.
 *
 * ⭐ WHY THE CENTRE AND NOWHERE ELSE. S-134 is 「境界に重なる 8px」 -- the band
 * lies ON the boundary -- so at its centre the pointer stands exactly where the
 * boundary is. That makes FR-052's 「その時点のポインタ位置が決める 2 つの幅」
 * one number under either reading of it (the width the pointer stands at, or the
 * width the press began with plus the travel since), and a case pressing
 * anywhere else would be judged on a difference the specification does not fix.
 * A premise below pins that the centre really is the panel's edge.
 */
function boundaryOf(built: Stage, panel: 'rowTitlePanel' | 'propertiesPanel'): Point {
  const band = bandOf(built, panel)
  return { x: band.x + band.width / 2, y: band.y + band.height / 2 }
}

const drawnPanelWidth = (loop: FrameLoop): number => frameOf(loop).regions.rowTitlePanel.width
const storedPanelWidth = (loop: FrameLoop): number => settingsOf(loop).rowTitlePanelWidth

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the fixture draws what the fade rows are about', () => {
  it('draws the plan bar as an area of four points (FD-5, table T-012a)', () => {
    const built = stage()
    expect(outlineOf(drawnTask(built.loop, FADED_UID).plan)).toHaveLength(4)
  })

  it('gives the Task two DIFFERENT non-zero fades, so FD-4 does not collapse the points', () => {
    const built = stage()
    const task = taskOf(built.loop, FADED_UID)
    expect(task.fadeInDays).toBeGreaterThan(0)
    expect(task.fadeOutDays).toBeGreaterThan(0)
    expect(task.fadeInDays).not.toBe(task.fadeOutDays)
  })

  it('draws no grab point until the Task is selected (FR-075, MUST)', () => {
    const built = stage()
    expect(
      fadeHandlesOf(built.loop),
      'FR-075: 掴み点は選択しているタスクにだけ出すこと（MUST）',
    ).toHaveLength(0)
  })

  it('draws both grab points once the Task is clicked (SL-2 of table T-023c)', () => {
    const built = withFadeHandles()
    expect(fadeHandlesOf(built.loop)).toHaveLength(2)
  })

  it('reads the two 場所 cells of table T-023d as numbered points of table T-012a', () => {
    expect(pointNamedBy('GR-1'), 'table T-023d GR-1 場所').toBe(4)
    expect(pointNamedBy('GR-2'), 'table T-023d GR-2 場所').toBe(2)
  })
})

// ===========================================================================
// (e) Where the grab points sit while nothing is held
// ===========================================================================

describe('table T-023d: GR-1 sits on 点 4 and GR-2 on 点 2 of table T-012a', () => {
  it('puts GR-1 exactly on the point its 場所 cell names', () => {
    const built = withFadeHandles()
    const by = numberedPoints(outlineOf(drawnTask(built.loop, FADED_UID).plan))
    expect(
      fadeHandlesOf(built.loop)[0],
      'table T-023d GR-1 場所: 予定バーの左上の角（表 T-012a の 点 4）',
    ).toEqual(by.get(pointNamedBy('GR-1')))
  })

  it('puts GR-2 exactly on the point its 場所 cell names', () => {
    const built = withFadeHandles()
    const by = numberedPoints(outlineOf(drawnTask(built.loop, FADED_UID).plan))
    expect(
      fadeHandlesOf(built.loop)[1],
      'table T-023d GR-2 場所: 予定バーの右下の角（表 T-012a の 点 2）',
    ).toEqual(by.get(pointNamedBy('GR-2')))
  })

  it('does not put either of them on the bar\'s own corner (FD-4 is not this Task)', () => {
    const built = withFadeHandles()
    const points = outlineOf(drawnTask(built.loop, FADED_UID).plan)
    const xs = points.map((one) => one.x)
    const [gr1, gr2] = fadeHandlesOf(built.loop) as [Point, Point]
    // 点 4 is `start + fadeIn` and 点 2 is `end − fadeOut`, so with both fades
    // non-zero neither can stand at the bar's left or right extreme.
    expect(gr1.x, 'table T-012a 点 4 = start + fadeIn').toBeGreaterThan(Math.min(...xs))
    expect(gr2.x, 'table T-012a 点 2 = end − fadeOut').toBeLessThan(Math.max(...xs))
  })

  it('sets the two offsets in the ratio of the two fades (table T-012a)', () => {
    const built = withFadeHandles()
    const by = numberedPoints(outlineOf(drawnTask(built.loop, FADED_UID).plan))
    const at = (number: number): Point => by.get(number) as Point
    const task = taskOf(built.loop, FADED_UID)
    const inOffset = at(4).x - at(1).x
    const outOffset = at(3).x - at(2).x
    expect(inOffset / outOffset).toBeCloseTo(
      (task.fadeInDays as number) / (task.fadeOutDays as number),
      6,
    )
  })
})

// ---------------------------------------------------------------------------
// Where inside a day a fade case puts the pointer
// ---------------------------------------------------------------------------

/**
 * How far into the target day every fade case below aims.
 *
 * ⭐ THE MANUSCRIPT NAMES A DAY AND NEVER A PIXEL: 「`GR-1` / `GR-2` の日数は、
 * ポインタの下の日から求めること（MUST）……いずれも 1 日単位に四捨五入する」. So a
 * case states which day the pointer stands in, and the answer it may require is
 * that day.
 *
 * ⛔ A DAY'S OWN EDGE IS THE ONE PLACE A CASE MAY NOT AIM AT. It is the tie of
 * 「四捨五入」 and the border of 「ポインタの下の日」 at once, and `edge + n ×
 * pxPerDay` computed in floating point lands on either side of it by an ulp.
 * ⚠️ MEASURED, NOT ASSUMED: aimed at the edge, a one-day carry moved the picture
 * no day at all and a four-day carry moved three, while two and three days
 * landed right.
 *
 * ⭐ A QUARTER IN IS INSIDE THE TARGET DAY UNDER BOTH READINGS -- 「ポインタの下
 * の日」 puts it in that day outright, and 「1 日単位に四捨五入」 rounds 0.25 back
 * down to it. ⛔ NOT THE MIDDLE: 0.5 is exactly the tie of the second reading.
 */
const A_QUARTER_INTO_THE_DAY = 0.25

/** The x a case aims at to stand inside the day `days` days from `fromX`. */
const insideTheDay = (fromX: number, days: number, scale: number): number =>
  fromX + (days + A_QUARTER_INTO_THE_DAY) * scale

// ===========================================================================
// (a) GR-1 held: the picture follows the pointer, the document does not move
// ===========================================================================

describe('table T-023d: while GR-1 is held the fade is DRAWN and not WRITTEN', () => {
  /**
   * Grab a fade point and carry the pointer INTO the day `days` days along.
   *
   * `dayEdge` is where the day the pointer ends up standing in BEGINS, which is
   * where the grab point itself is owed -- 「掴み点はポインタが決める日に置くこと
   * （MUST）」 places it on a day and not under the pointer. Where inside the day
   * the pointer is put, and why not on its edge, is `A_QUARTER_INTO_THE_DAY`.
   */
  function dragGrabPoint(
    built: Stage,
    handle: 0 | 1,
    days: number,
  ): { readonly to: Point; readonly dayEdge: number } {
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[handle] as Point
    const to = { x: insideTheDay(from.x, days, scale), y: from.y }
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    return { to, dayEdge: from.x + days * scale }
  }

  it('moves the drawn grab point to the day the pointer names (MUST)', () => {
    const built = withFadeHandles()
    const before = fadeHandlesOf(built.loop)[0] as Point
    const { dayEdge } = dragGrabPoint(built, 0, 3)
    const now = fadeHandlesOf(built.loop)[0] as Point
    expect(
      now.x,
      'T-023d: 掴んでいるあいだ……掴み点はポインタが決める日に置くこと（MUST）',
    ).toBeCloseTo(dayEdge, 6)
    expect(now.x).toBeGreaterThan(before.x)
  })

  it('puts it on the DAY and not under the pointer (MUST)', () => {
    // ⭐ THE OTHER HALF OF THE SAME MUST, and the half no case held before: a
    // grab point that simply tracked the pointer would satisfy every case above
    // and still break 「掴み点はポインタが決める日に置くこと（MUST）」. The
    // pointer here stands a quarter of a day past a day's edge, so the two
    // answers are a quarter of a day apart and only one of them is the day.
    const built = withFadeHandles()
    const { to, dayEdge } = dragGrabPoint(built, 0, 3)
    const now = fadeHandlesOf(built.loop)[0] as Point
    expect(now.x, 'the picture followed the pointer rather than the day').not.toBeCloseTo(to.x, 6)
    expect(now.x).toBeCloseTo(dayEdge, 6)
  })

  it('redraws the whole fade shape, not the grab point alone (MUST)', () => {
    const built = withFadeHandles()
    const wasAt = numberedPoints(outlineOf(drawnTask(built.loop, FADED_UID).plan)).get(4) as Point
    const { dayEdge } = dragGrabPoint(built, 0, 3)
    const nowAt = numberedPoints(outlineOf(drawnTask(built.loop, FADED_UID).plan)).get(4) as Point
    expect(
      nowAt.x,
      'T-023d: 置くことになるフェードの形と掴み点を描いて示すこと（MUST）',
    ).toBeCloseTo(dayEdge, 6)
    expect(nowAt.x).toBeGreaterThan(wasAt.x)
  })

  it('leaves `fadeInDays` in the document untouched while the button is down (MUST NOT)', () => {
    const built = withFadeHandles()
    const before = taskOf(built.loop, FADED_UID).fadeInDays
    dragGrabPoint(built, 0, 3)
    expect(
      taskOf(built.loop, FADED_UID).fadeInDays,
      'T-023d: ⛔ 掴んでいるあいだ日数を文書へ書いてはならない（MUST NOT）（FR-031）',
    ).toBe(before)
  })

  it('writes nothing on any of a run of moves (MUST NOT)', () => {
    const built = withFadeHandles()
    const before = structuredClone(taskOf(built.loop, FADED_UID))
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    built.send(pointer('down', from.x, from.y))
    for (const days of [1, 2, 3, 4]) {
      built.send(pointer('move', from.x + days * scale, from.y))
      expect(taskOf(built.loop, FADED_UID)).toEqual(before)
    }
  })

  it('follows a move of ONE day, so no threshold stands in front of the drag', () => {
    // T-023d: ⛔ ドラッグの開始にしきい値を設けてはならない（MUST NOT）—— 掴み点は
    // 時間軸の上の「ある日」そのものであり、画素の感度というものが存在しない。
    // ⭐ One day is the smallest travel that names a different day, so it is the
    // smallest travel the picture can be required to answer.
    const built = withFadeHandles()
    const before = fadeHandlesOf(built.loop)[0] as Point
    const { dayEdge } = dragGrabPoint(built, 0, 1)
    expect(
      (fadeHandlesOf(built.loop)[0] as Point).x,
      'T-023d: ⛔ ドラッグの開始にしきい値を設けてはならない（MUST NOT）',
    ).toBeCloseTo(dayEdge, 6)
    expect((fadeHandlesOf(built.loop)[0] as Point).x).toBeGreaterThan(before.x)
  })

  it('carries GR-2 the same way (its own half of the closing rule)', () => {
    const built = withFadeHandles()
    const before = taskOf(built.loop, FADED_UID).fadeOutDays
    const wasAt = fadeHandlesOf(built.loop)[1] as Point
    // ⚠️ Leftwards, because 点 2 is `end − fadeOut`: a LONGER fade out carries
    // this grab point towards the start, not away from it.
    const { dayEdge } = dragGrabPoint(built, 1, -2)
    const now = fadeHandlesOf(built.loop)[1] as Point
    expect(now.x, 'T-023d GR-2: 掴み点はポインタが決める日に置くこと（MUST）').toBeCloseTo(
      dayEdge,
      6,
    )
    expect(now.x).toBeLessThan(wasAt.x)
    expect(taskOf(built.loop, FADED_UID).fadeOutDays).toBe(before)
  })
})

// ===========================================================================
// (c) The release settles it, and settles it once
// ===========================================================================

describe('table T-028 IN-1: the fade is settled on the release', () => {
  it('writes the day the pointer left the grab point on', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    const to = { x: insideTheDay(from.x, 3, scale), y: from.y }
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    built.send(pointer('up', to.x, to.y))
    expect(
      taskOf(built.loop, FADED_UID).fadeInDays,
      'T-023d: `GR-1` は `start` からの日数 …… 1 日単位に四捨五入する',
    ).toBe(FADE_IN_DAYS + 3)
  })

  it('draws the settled fade from the document once the button is up', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    const to = { x: insideTheDay(from.x, 3, scale), y: from.y }
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    built.send(pointer('up', to.x, to.y))
    const by = numberedPoints(outlineOf(drawnTask(built.loop, FADED_UID).plan))
    const one = by.get(1) as Point
    const four = by.get(4) as Point
    expect((four.x - one.x) / scale).toBeCloseTo(
      taskOf(built.loop, FADED_UID).fadeInDays as number,
      6,
    )
  })

  it('leaves the document alone on moves that come after the release', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    const to = { x: insideTheDay(from.x, 3, scale), y: from.y }
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    built.send(pointer('up', to.x, to.y))
    const settled = structuredClone(taskOf(built.loop, FADED_UID))
    built.send(pointer('move', to.x + 4 * scale, to.y))
    built.send(pointer('move', to.x + 8 * scale, to.y))
    expect(taskOf(built.loop, FADED_UID)).toEqual(settled)
  })

  // ⭐ THIS CASE WAS RED ON PURPOSE UNTIL THE RULING OF 2026-08-30 (CR-314).
  // Table T-023d's closing rule used to say both 「ポインタの下の日から求める
  // こと（MUST）」(a truncation) and 「いずれも 1 日単位に四捨五入する」(a
  // rounding), and the two disagreed on the sliver either side of a boundary.
  // ⛔ The case took the second sentence and did NOT loosen: a clause that
  // decides nothing is not how the rest of the manuscript is written. ⭐ The
  // user settled it the same way -- the arithmetic stood and the day became a
  // POSITION -- so nothing below moved and the case went green on the fix.
  // ⚠️ The assertions are untouched; only this note is.
  it('⛔ MUST: rounds to whole days -- both sides of one day boundary settle on the SAME day', () => {
    // 「`GR-1` は `start` からの日数、`GR-2` は `end` までの日数とし、いずれも
    //   1 日単位に四捨五入する。」
    //
    // ⭐ THE ONE SENTENCE NO CASE HELD. Every other case here carries the
    // pointer well inside a day, where 四捨五入 and a plain truncation answer
    // alike -- so the quantum itself was unwatched, and the boundary could move
    // half a day in either direction without a case noticing. ⚠️ This is the
    // family of 台帳 D-138 (a vertical pan that skips the gap between rows): a
    // quantum hides inside one long gesture and only shows at its edges.
    //
    // ⛔ WHAT MAKES THE TWO PRESSES DIFFER. A day's own edge is the tie of
    // 四捨五入 (`A_QUARTER_INTO_THE_DAY`), so neither press is put ON it: one
    // stands a sliver BEFORE it and one a sliver AFTER it. Under 四捨五入 both
    // are nearer that boundary's day than to any other, so both settle on it.
    // ⚠️ A side that TRUNCATED instead would settle the two a day apart, which
    // is exactly the difference this case exists to see.
    //
    // ⛔⛔ THE TWO SENTENCES OF THAT RULE DO NOT AGREE, AND THIS CASE TAKES THE
    // SECOND. 「ポインタの下の日から求めること（MUST）」 reads as the day the
    // pointer stands IN -- a truncation, under which the sliver short of the
    // boundary belongs to the day before it and 「1 日単位に四捨五入する」 has
    // nothing left to do. ⭐ A clause that decides nothing is not how the rest
    // of the manuscript is written, so this case asserts the sentence that
    // states an arithmetic rather than the one it would make vacuous.
    // ⚠️ WHICH OF THE TWO STANDS IS NOT THIS FILE'S TO SETTLE -- it is a ruling
    // for whoever owns the rule. This case is written so that the answer is
    // visible either way instead of being decided in silence by a float.
    const A_SLIVER_OF_A_DAY = 0.02
    const CARRIED = 3

    const settledFrom = (offsetInDays: number): number => {
      const built = withFadeHandles()
      const scale = pxPerDay(built.loop)
      const from = fadeHandlesOf(built.loop)[0] as Point
      const at = from.x + (CARRIED + offsetInDays) * scale
      built.send(pointer('down', from.x, from.y))
      built.send(pointer('move', at, from.y))
      built.send(pointer('up', at, from.y))
      return taskOf(built.loop, FADED_UID).fadeInDays as number
    }

    const justBefore = settledFrom(-A_SLIVER_OF_A_DAY)
    const justAfter = settledFrom(+A_SLIVER_OF_A_DAY)

    expect(
      justBefore,
      'T-023d: いずれも 1 日単位に四捨五入する -- a sliver short of the boundary still names its day',
    ).toBe(FADE_IN_DAYS + CARRIED)
    expect(
      justAfter,
      'T-023d: いずれも 1 日単位に四捨五入する -- a sliver past the boundary names the same day',
    ).toBe(FADE_IN_DAYS + CARRIED)
    expect(justBefore, 'one boundary, two answers').toBe(justAfter)
  })
})

describe('FR-031: one whole drag is ONE undo step', () => {
  it('takes the fade back to where the drag began, in a single undo', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    built.send(pointer('down', from.x, from.y))
    for (const days of [1, 2, 3, 4]) {
      built.send(pointer('move', insideTheDay(from.x, days, scale), from.y))
    }
    built.send(pointer('up', insideTheDay(from.x, 4, scale), from.y))
    expect(taskOf(built.loop, FADED_UID).fadeInDays).toBe(FADE_IN_DAYS + 4)

    built.send(UNDO())
    expect(
      taskOf(built.loop, FADED_UID).fadeInDays,
      'FR-031: 文書を変えるドラッグ 1 回を 1 段にまとめること（MUST）',
    ).toBe(FADE_IN_DAYS)
  })

  it('has nothing of that drag left to undo a second time', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    built.send(pointer('down', from.x, from.y))
    for (const days of [1, 2, 3, 4]) {
      built.send(pointer('move', insideTheDay(from.x, days, scale), from.y))
    }
    built.send(pointer('up', insideTheDay(from.x, 4, scale), from.y))
    built.send(UNDO())
    built.send(UNDO())
    expect(
      taskOf(built.loop, FADED_UID).fadeInDays,
      'FR-031: 押してから離すまでの途中経過を段に刻むと、1 本のバーを動かしただけで履歴が数十段埋まる',
    ).toBe(FADE_IN_DAYS)
  })
})

// ===========================================================================
// (d) IN-1a: a pointer lost before the release is an abort
// ===========================================================================

describe('table T-028 IN-1a: a lost pointer abandons the fade drag', () => {
  it('writes nothing at all', () => {
    const built = withFadeHandles()
    const before = structuredClone(taskOf(built.loop, FADED_UID))
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', insideTheDay(from.x, 3, scale), from.y))
    built.send(pointer('lost', insideTheDay(from.x, 3, scale), from.y))
    expect(
      taskOf(built.loop, FADED_UID),
      'IN-1a: ボタンを離す前に窓の外でポインタが失われたときは、ドラッグを中断として終わらせること（MUST）',
    ).toEqual(before)
  })

  it('puts the picture back where the document says it is', () => {
    const built = withFadeHandles()
    const before = fadeHandlesOf(built.loop)[0] as Point
    const scale = pxPerDay(built.loop)
    built.send(pointer('down', before.x, before.y))
    built.send(pointer('move', insideTheDay(before.x, 3, scale), before.y))
    built.send(pointer('lost', insideTheDay(before.x, 3, scale), before.y))
    expect(
      fadeHandlesOf(built.loop)[0],
      'the gesture is over and nothing was written, so table T-012a draws the fade the Task holds',
    ).toEqual(before)
  })

  it('lets a later drag settle normally, so the gesture really ended', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', insideTheDay(from.x, 3, scale), from.y))
    built.send(pointer('lost', insideTheDay(from.x, 3, scale), from.y))
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', insideTheDay(from.x, 2, scale), from.y))
    built.send(pointer('up', insideTheDay(from.x, 2, scale), from.y))
    expect(taskOf(built.loop, FADED_UID).fadeInDays).toBe(FADE_IN_DAYS + 2)
  })
})

describe('table T-028 IN-1 / IN-4: Esc interrupts the fade drag', () => {
  it('writes nothing and puts the picture back', () => {
    const built = withFadeHandles()
    const before = structuredClone(taskOf(built.loop, FADED_UID))
    const wasAt = fadeHandlesOf(built.loop)[0] as Point
    const scale = pxPerDay(built.loop)
    built.send(pointer('down', wasAt.x, wasAt.y))
    built.send(pointer('move', insideTheDay(wasAt.x, 3, scale), wasAt.y))
    built.send(ESCAPE())
    expect(taskOf(built.loop, FADED_UID), 'IN-1: 中断は `Esc` で行い').toEqual(before)
    expect(fadeHandlesOf(built.loop)[0]).toEqual(wasAt)
  })
})

// ===========================================================================
// (b) (c) (d) The same three rules, for FR-052's panel divider
// ===========================================================================

describe('FR-052: while the boundary is held the widths are DRAWN and not WRITTEN', () => {
  it('draws a grab band on the row title panel\'s boundary (S-134)', () => {
    const built = stage()
    const band = bandOf(built, 'rowTitlePanel')
    const boundary = boundaryOf(built, 'rowTitlePanel')
    const panel = frameOf(built.loop).regions.rowTitlePanel
    expect(band.width, 'S-134: 境界に重なる 8px').toBeGreaterThan(0)
    // The premise every divider case rests on: the band's centre IS the
    // boundary, so the width the pointer stands at and the width the press began
    // with plus its travel are the same number.
    expect(boundary.x, 'S-134: the band lies ON the boundary').toBeCloseTo(panel.x + panel.width, 6)
  })

  it('moves the drawn width with the pointer (MUST)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const was = drawnPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + 40, at.y))
    expect(
      drawnPanelWidth(built.loop),
      'FR-052: 境界を掴んでいるあいだ、その時点のポインタ位置が決める 2 つの幅で画面を描いて示すこと（MUST）',
    ).toBeCloseTo(was + 40, 6)
  })

  it('follows every move, not only the last one (MUST)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const was = drawnPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    for (const travel of [10, 25, 60, 35]) {
      built.send(pointer('move', at.x + travel, at.y))
      expect(drawnPanelWidth(built.loop)).toBeCloseTo(was + travel, 6)
    }
  })

  it('leaves the stored width untouched while the button is down (MUST NOT)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const stored = storedPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    for (const travel of [10, 25, 60]) {
      built.send(pointer('move', at.x + travel, at.y))
      expect(
        storedPanelWidth(built.loop),
        'FR-052: ⛔ 掴んでいるあいだ、その幅を文書へ書いてはならない（MUST NOT）',
      ).toBe(stored)
    }
  })

  it('measures the frame with the picture\'s widths, not the stored ones', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + 40, at.y))
    expect(
      (frameOf(built.loop).settingsMeasuredWith as any).rowTitlePanelWidth,
      'the settings this frame was measured with are the ones it DREW',
    ).toBeCloseTo(storedPanelWidth(built.loop) + 40, 6)
  })

  it('settles the width on the release (IN-1)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const stored = storedPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + 40, at.y))
    built.send(pointer('up', at.x + 40, at.y))
    expect(storedPanelWidth(built.loop), 'FR-052: 確定は 表 T-028 の IN-1 に従う').toBeCloseTo(
      stored + 40,
      6,
    )
    expect(drawnPanelWidth(built.loop)).toBeCloseTo(stored + 40, 6)
  })

  it('settles it once: later moves with no button change nothing', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const stored = storedPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + 40, at.y))
    built.send(pointer('up', at.x + 40, at.y))
    built.send(pointer('move', at.x + 90, at.y))
    built.send(pointer('move', at.x + 140, at.y))
    expect(storedPanelWidth(built.loop)).toBeCloseTo(stored + 40, 6)
  })

  it('changes the OTHER panel from its own boundary (S-80 wins after a drag)', () => {
    // FR-052 (STATEMENT): 行見出しパネルとプロパティパネルの幅を変えること -- both
    // panels, and S-80's note says which value wins afterwards: 「⚠️ 人が境界を
    // ドラッグした後は `S-80` が勝つ（`FR-052`）」. The panel starts at 0, which
    // S-80 spells as 「閉じている」, and its band is drawn all the same.
    const built = stage()
    const at = boundaryOf(built, 'propertiesPanel')
    const stored = settingsOf(built.loop).propertyPanelWidth
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x - 120, at.y))
    expect(
      frameOf(built.loop).regions.propertiesPanel.width,
      'FR-052: その時点のポインタ位置が決める 2 つの幅で画面を描いて示すこと（MUST）',
    ).toBeCloseTo(stored + 120, 6)
    expect(
      settingsOf(built.loop).propertyPanelWidth,
      'FR-052: ⛔ 掴んでいるあいだ、その幅を文書へ書いてはならない（MUST NOT）',
    ).toBe(stored)
    built.send(pointer('up', at.x - 120, at.y))
    expect(settingsOf(built.loop).propertyPanelWidth, 'FR-052: 確定は IN-1 に従う').toBeCloseTo(
      stored + 120,
      6,
    )
  })

  it('abandons the drag when the pointer is lost (IN-1a)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const stored = storedPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + 40, at.y))
    built.send(pointer('lost', at.x + 40, at.y))
    expect(
      storedPanelWidth(built.loop),
      'IN-1a: ドラッグを中断として終わらせること（MUST）',
    ).toBe(stored)
    expect(
      drawnPanelWidth(built.loop),
      'nothing is held any more, so the picture is the stored width again',
    ).toBeCloseTo(stored, 6)
  })

  it('abandons the drag on Esc (IN-1 / IN-4)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const stored = storedPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + 40, at.y))
    built.send(ESCAPE())
    expect(storedPanelWidth(built.loop), 'IN-1: 中断は `Esc` で行い').toBe(stored)
    expect(drawnPanelWidth(built.loop)).toBeCloseTo(stored, 6)
  })
})

describe('table T-027 UN-16: undoing an edit must not take the panel width back', () => {
  // ⛔ LEFT RED ON PURPOSE (04-verification.md section 1). UN-16 puts
  // 「パネル幅（`FR-052`）」 in the 対象外 column and spells out why the width being
  // SAVED does not make it undoable: 「⚠️ 保存することと戻せることは別である」.
  // The width is a key of `documentSettings` (S-79), so a step that carries the
  // whole document carries the width with it -- and an undo of an edit that IS a
  // target (UN-3, the fade) then rolls the width back to what it was before the
  // person ever touched the divider. That is the 戻せる UN-16 refuses.
  //
  // ⚠️ FR-052's own rationale reasons the other way -- 「`FR-031` は身振り 1 つを
  // 取り消しの 1 段と定めており、途中の幅を書くと 1 回のドラッグが何段にもなる」 --
  // as though a settled width were a step. ⭐ This case is NOT judged on that
  // disputed half: it asserts only what UN-16 alone settles, that an undo of the
  // FADE leaves the width where the divider left it.
  it('leaves the divider\'s width alone when the fade edit is undone', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', from.x + 3 * scale, from.y))
    built.send(pointer('up', from.x + 3 * scale, from.y))
    expect(taskOf(built.loop, FADED_UID).fadeInDays).toBe(FADE_IN_DAYS + 3)

    const at = boundaryOf(built, 'rowTitlePanel')
    const stored = storedPanelWidth(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + 40, at.y))
    built.send(pointer('up', at.x + 40, at.y))
    expect(storedPanelWidth(built.loop)).toBeCloseTo(stored + 40, 6)

    built.send(UNDO())
    // ⚠️ SOFT, so that a failure reports BOTH halves: whether the width came
    // back AND what the one undo did to the edit that is a target.
    expect.soft(
      storedPanelWidth(built.loop),
      'T-027 UN-16: 対象外 …… パネル幅（`FR-052`）…… ⚠️ 保存することと戻せることは別である',
    ).toBeCloseTo(stored + 40, 6)
    expect.soft(
      taskOf(built.loop, FADED_UID).fadeInDays,
      'UN-3 IS a target, so this is the half of the undo that must happen',
    ).toBe(FADE_IN_DAYS)
  })
})

// ===========================================================================
// The bounds: what a release may NOT write
// ===========================================================================

describe('FD-6 and IV-12: the fade a release writes is cut to the Task', () => {
  /** 期間 in calendar days, counted the way FD-6 (MUST) requires. */
  const CALENDAR_DAYS = Math.round(
    (Date.parse(`${FADE_FINISH}T00:00:00Z`) - Date.parse(`${FADE_START}T00:00:00Z`)) / 86_400_000,
  )

  it('cuts `fadeInDays` to the Task\'s own span, however far the pointer went', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    const far = from.x + (CALENDAR_DAYS + 20) * scale
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', far, from.y))
    built.send(pointer('up', far, from.y))
    expect(
      taskOf(built.loop, FADED_UID).fadeInDays as number,
      'FD-6: `fadeIn` を `[0, 期間]` に丸めた後……本表の「期間」は暦日で数えること（MUST）',
      // ⚠️ The weaker of the two readings of 期間 on purpose: FD-6 does not say
      // whether the span counts the finishing day, so a case judged on the
      // tighter one would fail an implementation the specification permits.
    ).toBeLessThanOrEqual(CALENDAR_DAYS + 1)
  })

  it('never lets the two fades add up to more than the span (IV-12)', () => {
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    const far = from.x + (CALENDAR_DAYS + 20) * scale
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', far, from.y))
    built.send(pointer('up', far, from.y))
    const task = taskOf(built.loop, FADED_UID)
    expect(
      (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0),
      'IV-12: `fadeInDays` と `fadeOutDays` の和が、その `Task` の期間を超えないこと',
    ).toBeLessThanOrEqual(CALENDAR_DAYS + 1)
  })

  it('never draws the grab point outside the bar it belongs to', () => {
    // ⭐ THE JUDGEMENT THIS CASE RESTS ON. T-023d asks for 「置くことになる
    // フェード」 to be drawn -- the fade that WOULD be placed -- and the very next
    // rule cuts what would be placed with FD-6. Where the two sentences pull
    // apart (掴み点はポインタが決める日に置くこと, against a day FD-6 refuses),
    // 置くことになる wins, because the reason given for drawing at all is
    // 「どの日に置くことになるのかを見ないまま手を離すことになる」 -- a picture of
    // a day that will not be placed answers that reason with a falsehood.
    const built = withFadeHandles()
    const scale = pxPerDay(built.loop)
    const from = fadeHandlesOf(built.loop)[0] as Point
    const points = outlineOf(drawnTask(built.loop, FADED_UID).plan)
    const right = Math.max(...points.map((one) => one.x))
    const far = from.x + (CALENDAR_DAYS + 20) * scale
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', far, from.y))
    expect(
      (fadeHandlesOf(built.loop)[0] as Point).x,
      'T-023d: 置くことになるフェードの形と掴み点を描いて示すこと（MUST）+ FD-6',
    ).toBeLessThanOrEqual(right + 1)
  })
})

describe('FR-052: the pair a release writes keeps the `Row Area` above zero', () => {
  it('refuses a pair that would leave no `Row Area` (MUST NOT)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const canvas = frameOf(built.loop).regions.scheduleCanvas
    const far = canvas.x + canvas.width + 400
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', far, at.y))
    built.send(pointer('up', far, at.y))
    expect(
      frameOf(built.loop).regions.rowArea.width,
      'FR-052: 判定は `Row Area` の幅が 0 より大きいことをもって行うこと（MUST）……これが 0 以下になる組を受け付けてはならない（MUST NOT）',
    ).toBeGreaterThan(0)
  })

  it('never writes a row title panel width of 0 (MUST NOT)', () => {
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', -600, at.y))
    built.send(pointer('up', -600, at.y))
    expect(
      storedPanelWidth(built.loop),
      'FR-052: 行見出しパネルの幅を 0 にできてはならない（MUST NOT）—— 表 T-031 の SC-3',
    ).toBeGreaterThan(0)
  })

  it('keeps the `Row Area` above zero in the PICTURE too, while the pointer is out there', () => {
    // ⚠️ THE HALF THE SPECIFICATION DOES NOT SETTLE IS NOT THIS. What is not
    // settled is which width to DRAW when the pointer names a refused pair; what
    // IS settled is that a `Row Area` of 0 or less is a thing this tool does not
    // accept, and a frame whose own `Row Area` has collapsed has drawn one.
    const built = stage()
    const at = boundaryOf(built, 'rowTitlePanel')
    const canvas = frameOf(built.loop).regions.scheduleCanvas
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', canvas.x + canvas.width + 400, at.y))
    expect(frameOf(built.loop).regions.rowArea.width).toBeGreaterThan(0)
  })
})
