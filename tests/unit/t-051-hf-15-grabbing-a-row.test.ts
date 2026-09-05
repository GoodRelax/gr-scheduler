// Unit tests for HF-15 of 表 T-051 -- 「行を掴んで動かせること（MUST）」 -- and
// for GR-20 of 表 T-023d, the strip that drag is taken on.
//
// The unit these arrive on is UF-48 `single-html-shell` (CP-25 of 表 T-062),
// whose `frame-loop.ts` takes FT-1 of 表 T-078 -- 人の入力（ポインタとキー）--
// on `receiveInput`, answers what one frame computed on `current()` and what the
// document says on `document()`. The description the surface is handed on
// `showScreenView` is the PICTURE, which is where the following is read.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. 表 T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
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
//                        `frameLoop(surface, first, env, screen?, files?, ...)`
//   screen-renderer.ts   `ScreenView`, `ScreenSurface`, `RowTitle`, `Notice`,
//                        `DisplayLanguage`
//   screen-surface.ts    `ScreenPart` -- its seven members and the optional
//                        `isRowGrabStrip`, which is the road GR-20's press
//                        takes in
//   schedule-layout.ts   `RowPlacement` (`groupId`, `depth`, `y`, `height`)
//   screen-regions.ts    `ScreenRect`
//   input-command-translator.ts  `HumanInput`, `InputModifiers`,
//                        `PointerButton`, `PointerInput`, `PointerPhase`
//
// ⛔ NOT ONE EXPECTED VALUE BELOW COMES OUT OF `src/`. Every number is read out
// of the manuscript at read time (`S-208`, `S-37`, `S-125` -- see `settingOf`),
// every landing is stated as the relation HF-15 states (「すぐ上の兄弟の末子」,
// 「親の次の兄弟」, 「次の群の長子の位置」), and every refusal is looked up in
// 表 T-233 and in FR-038's dictionary rather than typed here.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-051 HF-15 「**行を掴んで動かせること（MUST）** —— 掴み代は 表 T-023d の
//           `GR-20` である。⭐ **軸を 1 本に固定すること（MUST）。掴んでから最初
//           に閾値を超えた向きで軸が決まり、離すまで変わらないこと（MUST）**……
//           閾値は `_assets/tbl-settings.md` の 表 T-206 の `S-208` が持つ。
//           ⭐ **上下は位置を変え、段を変えてはならない（MUST NOT）** ——
//           **その段に置ける場所を描く順にたどること（MUST）。**⇒ **ある群の
//           末子の次は次の群の長子の位置であり、親をまたぐ。**⛔ **畳まれた群の
//           中の場所を選んではならない（MUST NOT）**……⭐ **左右は段を変える
//           こと（MUST）。右へ 1 歩はすぐ上の兄弟の末子になること、左へ 1 歩は
//           親の次の兄弟になること（MUST）**……⇒ **すぐ上に兄弟が無い行は右へ
//           動かせない。**⚠️ **左へ出たとき、後ろに居た兄弟は元の親に残すこと
//           （MUST）。**⛔ **深さの上限を超える右移動を受け付けてはならない
//           （MUST NOT）** —— 上限は `FR-085` が持つ。⭐ **どちらの向きでも、
//           その行の配下ごと動かすこと（MUST）。**⭐ **握っているあいだ、行を
//           ポインタに追従させること（MUST）。段送りの刻みは 表 T-201 の `S-37`
//           と同じとすること（MUST）** —— ⛔⛔ **刻みを別に持ってはならない
//           （MUST NOT）**……⛔ **動かせないときは、行を動かさずに理由を告げる
//           こと（MUST）** —— 作法は `FR-029` に従い、理由は 表 T-233 の行と
//           する」
//   T-023d GR-20 「行見出しパネルの行 | **行の左端に敷く掴み代**（幅は
//           `_assets/tbl-settings.md` の 表 T-206 の `S-138`）| 掴めば行を動かす
//           （表 T-051 の `HF-15`）。⛔ **ピン止めしている行は掴めないこと
//           （MUST NOT）**」
//   T-023d  its closing paragraph: 「⚠️ **`GR-20` は、表 T-051 の `HF-15` が
//           追従を同じ MUST で既に求めている。**⛔ **本表で繰り返してはならない
//           （MUST NOT）**」
//   T-023d  「⛔ **掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）**
//           （`FR-031`）—— **追従は絵であって編集ではない。**」
//   T-233 RS-36 / RS-37 / RS-38 / RS-39 -- the four reasons a refusal carries,
//           all of manner `NT-1`
//   T-206 S-208 「掴んだ行の軸が決まる距離」, and its own ⛔ 「刻みを本表に
//           持たせてはならない」
//   T-206 S-138 the width GR-20 lays the strip at
//   T-201 S-37 `rowTitleIndent` -- the 段送りの刻み HF-15 borrows
//   T-211 S-125 `maxGroupDepth`, 「根の行を深さ 1 と数える」
//   FR-085  「深さの上限は `FR-004` に従う（値は表 T-211 の `S-125`）」
//   FR-098  the pin, which lifts a row to the head of the panel
//   FR-029  what cannot be used gives its reason rather than going quiet
//   FR-031  UN-4: 「**階層の変更、および同じ親の中の並べ替え**（表 T-108 の
//           `CM-35` と `CM-73`）。⚠️ **並べ替えを別の行にしない** —— **掴んで
//           動かす 1 回のドラッグは、親をまたぐことも、またがないこともあり、
//           どちらも 1 段である**」
//   T-108 CM-73 `moveTaskGroup` 「行の親と並びを変える」
//   T-015a HM-3a 「**移動後の深さが `FR-004` の上限を超える移動を受け付けては
//           ならない（MUST NOT）。** 部分木は**移動後の最深部**で測る」
//   T-015a HM-5 「**行の器を作り直してはならない（MUST NOT）。** 更新するのは
//           親だけとする」
//   T-028 IN-1  ポインタ操作は離した時点で確定する
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   - HOW THE STRIP IS PAINTED. GR-20 gives it a width and a place and no ink;
//     表 T-026 makes a new figure the user's ruling (RC-13), so a case naming a
//     colour or a shape would be inventing one.
//   - WHETHER A GAP OR A DROP MARK IS OPENED FOR THE HELD ROW. No row of 表
//     T-103 gives a part for a place-to-land and no row of 表 T-109 an entrance,
//     so a case demanding either would be asserting a thing the manuscript
//     declines to decide. What IS asserted is where the row itself is drawn.
//   - HM-4 「自分の子孫を親にする移動を受け付けてはならない」. HF-15's two
//     steps are 「すぐ上の兄弟の末子」 and 「親の次の兄弟」, and neither can
//     name a descendant of the row being moved -- so this gesture cannot reach
//     the row HM-4 refuses, and a case would be driving an input the
//     specification gives no way to make.
//   - THE UNDO HISTORY ITSELF. UN-4 makes one drag 一段, but `FrameLoop`
//     publishes no history, so what is asserted here is the other half of the
//     same claim: the whole gesture writes ONCE, on the release, and what it
//     wrote is inside `schedule.taskGroups` and the one `Task` field 表 T-015a
//     of `HM-9` opened, and nowhere else.
//     ⭐ 表 T-015a の HM-9 (利用者の裁定 2026-09-05)「並べ替えた順序も WBS へ
//     伝わること（MUST）」 puts the reordered rank on `Task.wbsOrder`, and a
//     `Task` lives OUTSIDE `schedule.taskGroups` -- so the release reaching it
//     is a REQUIREMENT, not a leak. ⚠️ The heading MUST NOT is untouched by
//     that: nothing is written while the row is HELD, and the two cases above
//     this one still compare the whole document mid-drag.
//     ⛔ HM-3 still forbids the parent moving 「タスクバーを別の行へ移す操作
//     では WBS の親を変えてはならない（MUST NOT）」, so `wbsParentUid` is
//     read back unchanged below, and so is every other field of every task.
//   - WHICH SIDE REFUSES A PINNED ROW. GR-20's MUST NOT is a statement about
//     the grab AREA, and 表 T-065's IF-9 (MUST) leaves the side that DREW the
//     panel to say where one is -- so it is held in
//     tests/unit/uf-72-screen-part.test.ts and not here. See the note in the
//     GR-20 describe near the foot of this file.
//   - WHETHER A ROW WITH NO CHILDREN OFFERS A PLACE AT THE DEPTH BELOW IT.
//     HF-15 says 「その段に置ける場所」 and no row says whether a childless row
//     opens one. Every fixture below therefore gives each group a child, so no
//     case turns on that undecided question.

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
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

// ===========================================================================
// What the manuscript says, read at read time rather than copied
// ===========================================================================

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8')

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything one row of a table says, in one string. */
const saysOf = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

/**
 * The first number in a settings cell -- `16px 🔎`, `6px 🔎`, `12 🔎` and
 * `` `5` 🔎 `` all name one.
 *
 * ⭐ READ AND NOT COPIED, for the reason rule 03 gives: a literal written here
 * would go on passing after the value had been re-decided, which is exactly the
 * regression these cases exist to catch.
 */
function settingOf(table: string, id: string, column: string): number {
  const cell = bare(rowOf(table, id).by[column] ?? '')
  const found = /-?\d+(?:\.\d+)?/.exec(cell)
  if (found === null) throw new Error(`${id} of table ${table} states no number in ${column}`)
  return Number(found[0])
}

/**
 * 表 T-206 `S-208` -- 掴んだ行の軸が決まる距離.
 *
 * ⚠️ THE `既定` COLUMN AND NOT `値`. 表 T-206's first cell NAMES the thing and
 * the second gives the number; a reading of the first would come back with the
 * digits of the row id it points at.
 */
const S_208_AXIS_SETTLES_AT = settingOf('T-206', 'S-208', '既定')

/** 表 T-201 `S-37` `rowTitleIndent` -- 段送りの刻み, which HF-15 borrows. */
const S_37_INDENT = settingOf('T-201', 'S-37', '既定値')

/** 表 T-211 `S-125` `maxGroupDepth`. 「根の行を深さ 1 と数える」. */
const S_125_MAX_DEPTH = settingOf('T-211', 'S-125', '値')

/** 表 T-103 U-22 -- the settled name IF-9 answers a point in the panel by. */
const U_22_PART = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

/**
 * FR-038's dictionary, as the manuscript keeps it.
 *
 * ⭐ THE MANUSCRIPT'S COPY AND NOT THE BUILT ONE. `docs/spec/_source/` is where
 * the words are written and `src/` holds what is printed from it; rule 04
 * section 1 has these cases driven from docs/spec. ⭐ The shape is copied from
 * tests/unit/fr-029-the-reason-a-press-carries.test.ts.
 */
interface ReasonWords {
  readonly rowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
}

const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
    reasons: ReasonWords[]
  }
).reasons

function wordsFor(rowId: string): string {
  const found = REASON_WORDS.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${rowId}`)
  return found.text.ja
}

// ===========================================================================
// The documents these cases drive
// ===========================================================================

// BT-4 of 表 T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it; the rows are written out here so
// that what is drawn can be named.
const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

/** The ids are UUIDs because AT-51 is one. */
const id = (n: number): string => `5a000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const ALPHA = id(1)
const A1 = id(2)
const A1X = id(3)
const A2 = id(4)
const A2A = id(5)
const BETA = id(6)
const B1 = id(7)
const GAMMA = id(8)
const G1 = id(9)
const DELTA = id(10)
const D1 = id(11)

/**
 * The tree every case in the first four sections drives, drawn in this order:
 *
 *   ALPHA        depth 1
 *     A1         depth 2
 *       A1X      depth 3
 *     A2         depth 2   <- the row most cases grab
 *       A2A      depth 3
 *   BETA         depth 1
 *     B1         depth 2
 *   GAMMA        depth 1   (folded -- G1 is not drawn)
 *     G1         depth 2
 *   DELTA        depth 1
 *     D1         depth 2
 *
 * ⭐ WHY EVERY GROUP HAS A CHILD. HF-15 walks 「その段に置ける場所」 and the
 * manuscript nowhere says whether a CHILDLESS row opens a place one step deeper.
 * Giving each group a child keeps every case off that undecided question.
 * ⭐ WHY A1 HAS ONE. 「右へ 1 歩はすぐ上の兄弟の末子になること」 -- 末子 and
 * 長子 answer alike under a row with a single child, so A1 carries A1X and the
 * case can tell 末子 from 長子.
 * ⭐ WHY GAMMA IS FOLDED AND STANDS BETWEEN BETA AND DELTA. 「畳まれた群の中の
 * 場所を選んではならない（MUST NOT）」 -- a folded group at the END of the panel
 * would be skipped by a walk that simply ran out of rows, so it is put in the
 * MIDDLE, where a walk that counted its places would land inside it.
 */
const ROWS: readonly { readonly id: string; readonly parent: string | null; readonly order: number }[] =
  [
    { id: ALPHA, parent: null, order: 0 },
    { id: A1, parent: ALPHA, order: 0 },
    { id: A1X, parent: A1, order: 0 },
    { id: A2, parent: ALPHA, order: 1 },
    { id: A2A, parent: A2, order: 0 },
    { id: BETA, parent: null, order: 1 },
    { id: B1, parent: BETA, order: 0 },
    { id: GAMMA, parent: null, order: 2 },
    { id: G1, parent: GAMMA, order: 0 },
    { id: DELTA, parent: null, order: 3 },
    { id: D1, parent: DELTA, order: 0 },
  ]

const NAME_OF = new Map<string, string>([
  [ALPHA, 'Alpha'],
  [A1, 'A1'],
  [A1X, 'A1X'],
  [A2, 'A2'],
  [A2A, 'A2A'],
  [BETA, 'Beta'],
  [B1, 'B1'],
  [GAMMA, 'Gamma'],
  [G1, 'G1'],
  [DELTA, 'Delta'],
  [D1, 'D1'],
])

const nameOf = (groupId: string): string => NAME_OF.get(groupId) ?? groupId

interface Fixture {
  readonly rows?: readonly { readonly id: string; readonly parent: string | null; readonly order: number }[]
  /** Rows the person folded (AT-56). */
  readonly folded?: readonly string[]
  /** S-126 `pinnedGroupIds` -- the rows FR-098 lifts to the head of the panel. */
  readonly pinned?: readonly string[]
}

function documentWith(part: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const rows = part.rows ?? ROWS
  const folded = new Set(part.folded ?? [GAMMA])
  const task = (uid: number): Task =>
    ({
      uid,
      wbsParentUid: null,
      wbsOrder: uid,
      name: `T${uid}`,
      start: '2026-04-06T00:00:00',
      finish: '2026-04-10T00:00:00',
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
    }) as unknown as Task
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 500,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: rows.map((_row, at) => task(at + 1)),
      resources: [],
      assignments: [],
      taskGroups: rows.map((one) => ({
        id: one.id,
        parentId: one.parent,
        label: nameOf(one.id),
        derivedFromTaskUid: null,
        order: one.order,
        isCollapsed: folded.has(one.id),
        isHidden: false,
        color: null,
        height: null,
      })),
      taskGroupMembers: rows.map((one, at) => ({
        taskUid: at + 1,
        groupId: one.id,
        stackOrder: null,
      })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      ...(part.pinned === undefined ? {} : { pinnedGroupIds: [...part.pinned] }),
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// ===========================================================================
// The host UF-48 is given. Copied from tests/unit/uf-48-input.test.ts.
// ===========================================================================

/** BO-1 of 表 T-077 has already settled these by the time a loop exists. */
const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of 表 T-060 puts the browser in
 * this layer. ⛔ Nothing in this fake decides anything about presses, pictures
 * or documents: it drains the queue.
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
  /** What `readScreenPartAt` answers from now on. The case decides; the fake does not. */
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
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

// ===========================================================================
// Spelling one happening
// ===========================================================================

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

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

// ===========================================================================
// A loop, drawn and ready, with GR-20's strip under the pointer
// ===========================================================================

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  /** Aim the next press at GR-20's strip on one row. CS-2 freezes it at the press. */
  aimAtTheStrip(groupId: string): void
  /** Aim the next press at the row's NAME -- on a row, on no strip. */
  aimAtTheName(groupId: string): void
}

/**
 * The description IF-9 answers for a point on GR-20's strip.
 *
 * ⭐ `entry` IS NULL, and that is the manuscript's own arithmetic rather than a
 * choice of this file's: 表 T-109 holds no row for a grab strip, so there is no
 * `IconId` a point on it could carry.
 */
const onTheStrip = (groupId: string): ScreenPart => ({
  part: U_22_PART,
  entry: null,
  format: null,
  rowGroupId: groupId,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
  isRowGrabStrip: true,
})

const onTheName = (groupId: string): ScreenPart => ({
  part: U_22_PART,
  entry: null,
  format: null,
  rowGroupId: groupId,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
})

function stage(part: Fixture = {}): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface as any, documentWith(part), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  return {
    loop,
    screen,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    aimAtTheStrip: (groupId) => screen.drawAt(onTheStrip(groupId)),
    aimAtTheName: (groupId) => screen.drawAt(onTheName(groupId)),
  }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

/** Where one row's band stands, as the frame placed it. */
function bandOf(loop: FrameLoop, groupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as any).rows.find((one: any) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the frame drew no band for row ${nameOf(groupId)}`)
  return { y: found.y as number, height: found.height as number }
}

/** The point on GR-20's strip of one row: the left edge of the panel, mid band. */
function stripPoint(loop: FrameLoop, groupId: string): { readonly x: number; readonly y: number } {
  const panel = frameOf(loop).regions.rowTitlePanel
  const band = bandOf(loop, groupId)
  return { x: panel.x + 1, y: band.y + band.height / 2 }
}

interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
}

const rowsOf = (loop: FrameLoop): readonly Row[] =>
  (loop.document().schedule as any).taskGroups as readonly Row[]

function storedRow(loop: FrameLoop, groupId: string): Row {
  const found = rowsOf(loop).find((one) => one.id === groupId)
  if (found === undefined) throw new Error(`the document has no row ${nameOf(groupId)}`)
  return found
}

const parentOf = (loop: FrameLoop, groupId: string): string | null =>
  storedRow(loop, groupId).parentId

/** The children of one parent, in the order the document stores them. */
const childrenOf = (loop: FrameLoop, parentId: string | null): readonly string[] =>
  rowsOf(loop)
    .filter((one) => one.parentId === parentId)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((one) => nameOf(one.id))

/** How deep one row sits. 「根の行を深さ 1 と数える」 (S-125). */
function depthOf(loop: FrameLoop, groupId: string): number {
  let at: string | null = groupId
  let depth = 0
  for (let guard = 0; guard < 64 && at !== null; guard += 1) {
    depth += 1
    at = storedRow(loop, at).parentId
  }
  return depth
}

/** The RowTitle the panel drew for one row, or `null` when it drew none. */
function drawnTitle(built: Stage, groupId: string): any {
  const panel = built.screen.last().rowTitlePanel
  const all = [...panel.pinnedTitles, ...panel.titles] as any[]
  return all.find((one) => one.groupId === groupId) ?? null
}

function titleOf(built: Stage, groupId: string): any {
  const found = drawnTitle(built, groupId)
  if (found === null) throw new Error(`the panel drew no title for row ${nameOf(groupId)}`)
  return found
}

const noticesOf = (built: Stage): ScreenView['notices'] => built.screen.last().notices

/** The four reasons 表 T-233 gives HF-15 and FR-085 for a refused row move. */
const HF_15_REASONS = ['RS-36', 'RS-37', 'RS-38', 'RS-39'] as const

/**
 * The refusal was told, it was told the NT-1 way, and it was told with THIS
 * row's words and none of its three neighbours'.
 *
 * ⬛ WHY THE NEIGHBOURS ARE NAMED. All four reasons refuse the same gesture,
 * so a build that answered one of them for everything would satisfy a case that
 * only asked 「a reason was told」 -- and FR-029's whole point is that the person
 * is told WHICH.
 */
function toldOnly(built: Stage, rowId: (typeof HF_15_REASONS)[number]): void {
  const said = noticesOf(built)
  expect(
    said.map((one) => one.text),
    `the refusal went quiet instead of naming ${rowId}`,
  ).toContain(wordsFor(rowId))
  for (const other of HF_15_REASONS) {
    if (other === rowId) continue
    expect(
      said.map((one) => one.text),
      `the refusal carried ${other} as well as ${rowId}`,
    ).not.toContain(wordsFor(other))
  }
  // 表 T-233 gives all four the manner `NT-1`; FR-029 (MUST) has the reason told
  // rather than the press going quiet.
  expect(
    said.some((one) => one.text === wordsFor(rowId) && one.manner === 'NT-1'),
    `${rowId} was told in a manner 表 T-233 does not give it`,
  ).toBe(true)
}

/**
 * One whole gesture on GR-20's strip: press the row, travel, let go.
 *
 * ⚠️ The travel is handed over in STEPS rather than in one jump, because HF-15
 * settles the axis on 「最初に閾値を超えた」 travel -- a single `move` would
 * leave a case unable to say which travel was the first.
 */
function drag(
  built: Stage,
  groupId: string,
  steps: readonly { readonly dx: number; readonly dy: number }[],
): void {
  const from = stripPoint(built.loop, groupId)
  built.aimAtTheStrip(groupId)
  built.send(pointer('down', from.x, from.y))
  for (const step of steps) built.send(pointer('move', from.x + step.dx, from.y + step.dy))
  const last = steps[steps.length - 1] ?? { dx: 0, dy: 0 }
  built.send(pointer('up', from.x + last.dx, from.y + last.dy))
}

/** A travel far enough to settle the axis, in one named direction. */
const PAST = S_208_AXIS_SETTLES_AT + 1

// ===========================================================================
// The premises -- the manuscript still says what every case below rests on
// ===========================================================================

describe('the specification still says what these cases are driven by', () => {
  it('表 T-051 still holds HF-15, and every MUST these cases assert is still in it', () => {
    const hf15 = saysOf('T-051', 'HF-15')
    for (const clause of [
      '行を掴んで動かせること（MUST）',
      '軸を 1 本に固定すること（MUST）',
      '掴んでから最初に閾値を超えた向きで軸が決まり、離すまで変わらないこと（MUST）',
      '上下は位置を変え、段を変えてはならない（MUST NOT）',
      'その段に置ける場所を描く順にたどること（MUST）',
      'ある群の末子の次は次の群の長子の位置であり、親をまたぐ',
      '畳まれた群の中の場所を選んではならない（MUST NOT）',
      '左右は段を変えること（MUST）',
      '右へ 1 歩はすぐ上の兄弟の末子になること、左へ 1 歩は親の次の兄弟になること（MUST）',
      'すぐ上に兄弟が無い行は右へ動かせない',
      '左へ出たとき、後ろに居た兄弟は元の親に残すこと（MUST）',
      '深さの上限を超える右移動を受け付けてはならない（MUST NOT）',
      'その行の配下ごと動かすこと（MUST）',
      '握っているあいだ、行をポインタに追従させること（MUST）',
      '段送りの刻みは 表 T-201 の `S-37` と同じとすること（MUST）',
      '刻みを別に持ってはならない（MUST NOT）',
      '動かせないときは、行を動かさずに理由を告げること（MUST）',
    ]) {
      expect(hf15, `表 T-051 の HF-15 no longer says 「${clause}」`).toContain(clause)
    }
  })

  it('表 T-023d still holds GR-20, and it still refuses a pinned row and points the width at S-138', () => {
    const gr20 = saysOf('T-023d', 'GR-20')
    expect(gr20).toContain('行の左端に敷く掴み代')
    expect(gr20).toContain('`S-138`')
    expect(gr20).toContain('掴めば行を動かす')
    expect(gr20, '表 T-023d no longer keeps a pinned row out of the grab').toContain(
      'ピン止めしている行は掴めないこと（MUST NOT）',
    )
    // 「上の行ほど優先すること（MUST）」 -- GR-20 is a row of that table, so it
    // is bound by the priority order like every other.
    expect(specTable('T-023d').rows.map((one) => one.id)).toContain('GR-20')
  })

  it('表 T-023d sends the following of GR-20 to HF-15 and forbids restating it', () => {
    expect(REQUIREMENTS).toContain(
      '`GR-20` は、表 T-051 の `HF-15` が追従を同じ MUST で既に求めている',
    )
    expect(REQUIREMENTS).toContain(
      '掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）',
    )
    expect(REQUIREMENTS).toContain('追従は絵であって編集ではない')
  })

  it('表 T-233 still holds RS-36 .. RS-39, all told the NT-1 way, and FR-038 has words for each', () => {
    const owners: Readonly<Record<string, string>> = {
      'RS-36': '表 T-051 の `HF-15`',
      'RS-37': '表 T-051 の `HF-15`',
      'RS-38': '`FR-085`',
      'RS-39': '表 T-051 の `HF-15`',
    }
    for (const [id, owner] of Object.entries(owners)) {
      const row = rowOf('T-233', id)
      expect(row.cells.join(' '), `${id} is no longer told the NT-1 way`).toContain('NT-1')
      expect(row.cells.join(' '), `${id} no longer names ${owner}`).toContain(owner)
      expect(wordsFor(id).length, `FR-038's dictionary has no words for ${id}`).toBeGreaterThan(0)
    }
  })

  it('S-208 is the threshold, S-37 is the step, and NO settings row holds a step of its own', () => {
    const s208 = saysOf('T-206', 'S-208')
    expect(s208).toContain('掴んだ行の軸が決まる距離')
    expect(s208, 'S-208 no longer forbids a second home for the step').toContain(
      '刻みを本表に持たせてはならない',
    )
    expect(S_208_AXIS_SETTLES_AT, '⛔ 0 にしてはならない').toBeGreaterThan(0)

    // ⛔⛔ 「刻みを別に持ってはならない（MUST NOT）」. The only row of 表 T-206
    // that may speak of the step at all is S-208, and only to say it is not
    // there.
    const speakers = specTable('T-206')
      .rows.filter((one) => one.cells.join(' ').includes('段送りの刻み'))
      .map((one) => one.id)
    expect(speakers, '表 T-206 grew a second home for the 段送りの刻み').toEqual(['S-208'])

    expect(S_37_INDENT, '表 T-201 の S-37 no longer states a step').toBeGreaterThan(0)
  })

  it('表 T-108 still holds CM-73, and UN-4 still makes one drag ONE 段 (FR-031)', () => {
    const cm73 = rowOf('T-108', 'CM-73')
    expect(bare(cm73.cells[1] ?? ''), '表 T-108 renamed the command HF-15 writes').toBe(
      'moveTaskGroup',
    )
    expect(cm73.cells.join(' ')).toContain('行の親と並びを変える')
    expect(cm73.cells.join(' ')).toContain('`HF-15`')
    expect(saysOf('T-027', 'UN-4')).toContain(
      '掴んで動かす 1 回のドラッグは、親をまたぐことも、またがないこともあり、どちらも 1 段である',
    )
  })

  it('表 T-015a still sends the reordered order into the WBS (HM-9), and still keeps the parent still (HM-3)', () => {
    // ⭐ 利用者の裁定 2026-09-05. Until it, HM-3 read 「WBS を変えてはならない」
    // widely and the release below was asserted to touch the rows and nothing
    // else. The ruling narrowed the ban to the parent-child link and gave the
    // sibling rank to HM-9 -- which is why the release now reaches `Task`.
    const hm9 = saysOf('T-015a', 'HM-9')
    expect(hm9, '表 T-015a の HM-9 no longer sends the order to the WBS').toContain(
      '並べ替えた順序も WBS へ伝わること（MUST）',
    )
    expect(hm9, 'HM-9 no longer decides the rank by the row tree').toContain(
      '各 `Task` の、同じ WBS 親を持つ兄弟の中での順位は、その `Task` を描いている行の、行の木における位置で決めること（MUST）',
    )

    const hm3 = saysOf('T-015a', 'HM-3')
    expect(hm3, 'HM-3 no longer forbids the WBS parent moving').toContain(
      'WBS の親を変えてはならない（MUST NOT）',
    )
    expect(hm3, 'HM-3 no longer leaves the sibling order to HM-9').toContain(
      '同じ親の下での順序は `HM-9` に従い',
    )

    // ⛔ The heading of 表 T-023d is NOT weakened by any of that: what may be
    // written on the RELEASE says nothing about what may be written while the
    // row is held, and that is still nothing at all.
    expect(REQUIREMENTS).toContain('掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）')
  })

  it('FR-085 still owns the depth cap, and S-125 still counts a root row as depth 1', () => {
    expect(REQUIREMENTS).toContain('深さの上限は `FR-004` に従う（値は表 T-211 の `S-125`）')
    expect(saysOf('T-211', 'S-125')).toContain('根の行を深さ 1 と数える')
    expect(S_125_MAX_DEPTH).toBeGreaterThanOrEqual(3)
  })
})

// ===========================================================================
// The premise every behavioural case rests on: the fixture is drawn the way
// the tree above says, and the strip is reachable.
// ===========================================================================

describe('the fixture these cases drive', () => {
  it('draws the tree in the order the cases walk, and hides the folded group', () => {
    const built = stage()
    const drawn = (frameOf(built.loop).layout as any).rows.map((one: any) => nameOf(one.groupId))
    expect(drawn, 'the panel no longer draws the tree these cases were written against').toEqual([
      'Alpha',
      'A1',
      'A1X',
      'A2',
      'A2A',
      'Beta',
      'B1',
      'Gamma',
      'Delta',
      'D1',
    ])
    expect(depthOf(built.loop, A2)).toBe(2)
    expect(depthOf(built.loop, A2A)).toBe(3)
  })

  it('the press point these cases use is inside the Row Title Panel and on the row it names', () => {
    const built = stage()
    const panel = frameOf(built.loop).regions.rowTitlePanel
    const at = stripPoint(built.loop, A2)
    const band = bandOf(built.loop, A2)
    expect(at.x).toBeGreaterThanOrEqual(panel.x)
    expect(at.x).toBeLessThan(panel.x + panel.width)
    expect(at.y).toBeGreaterThanOrEqual(band.y)
    expect(at.y).toBeLessThan(band.y + band.height)
  })
})

// ===========================================================================
// 軸を 1 本に固定すること（MUST）
// ===========================================================================

describe('HF-15 (MUST) -- 軸を 1 本に固定すること。掴んでから最初に閾値を超えた向きで軸が決まり、離すまで変わらない', () => {
  it('a travel that never passes S-208 settles no axis, so the document is not touched', () => {
    // ⛔ 「0 にしてはならない —— 1 画素の震えで軸が決まってしまう」 (S-208). A
    // hand that shook by less than the threshold has said nothing.
    const built = stage()
    const before = structuredClone(built.loop.document())

    const short = S_208_AXIS_SETTLES_AT - 1
    drag(built, A2, [
      { dx: short, dy: 0 },
      { dx: 0, dy: short },
    ])

    expect(built.loop.document(), 'a travel inside the threshold moved a row').toEqual(before)
  })

  it('the FIRST travel past S-208 going sideways settles the depth axis, and a large travel down after it does not take it back', () => {
    // 「軸を固定しないと、1 画素ごとに『動かすのか、親を変えるのか』を道具が
    // 推し量ることになり、境目で答えが反転する」.
    const built = stage()
    const downToDelta = bandOf(built.loop, D1).y - bandOf(built.loop, A2).y

    drag(built, A2, [
      { dx: PAST, dy: 0 },
      { dx: S_37_INDENT, dy: 0 },
      { dx: S_37_INDENT, dy: downToDelta },
    ])

    // 右へ 1 歩はすぐ上の兄弟の末子になること -- A2's sibling immediately above
    // is A1, and the vertical travel that followed changed nothing about that.
    expect(parentOf(built.loop, A2), 'the vertical travel took the axis back').toBe(A1)
  })

  it('the FIRST travel past S-208 going down settles the position axis, and a large travel sideways after it does not change the depth', () => {
    const built = stage()
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y
    const wasDepth = depthOf(built.loop, A2)

    drag(built, A2, [
      { dx: 0, dy: PAST },
      { dx: 0, dy: downToB1 },
      { dx: S_37_INDENT * 3, dy: downToB1 },
    ])

    expect(
      depthOf(built.loop, A2),
      'the sideways travel changed the depth after the position axis had settled',
    ).toBe(wasDepth)
  })
})

// ===========================================================================
// 上下は位置を変え、段を変えてはならない（MUST NOT）
// ===========================================================================

describe('HF-15 -- 上下は位置を変え、段を変えてはならない（MUST NOT）', () => {
  it('⛔ MUST NOT: a drag down changes where the row stands and never how deep it is', () => {
    const built = stage()
    const wasDepth = depthOf(built.loop, A2)
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y

    drag(built, A2, [
      { dx: 0, dy: PAST },
      { dx: 0, dy: downToB1 },
    ])

    expect(depthOf(built.loop, A2), 'a vertical drag changed the row’s depth').toBe(wasDepth)
  })

  it('⭐ MUST: 「ある群の末子の次は次の群の長子の位置であり、親をまたぐ」 -- A2 is Alpha’s last child, and one place down is Beta’s first', () => {
    // ⭐ THE SENTENCE THIS FILE EXISTS FOR. The place drawn where B1 stands is
    // BETA's first-child position, and the hand standing there lands the row
    // there -- under a DIFFERENT parent, at the SAME depth.
    const built = stage()
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y

    drag(built, A2, [
      { dx: 0, dy: PAST },
      { dx: 0, dy: downToB1 },
    ])

    expect(parentOf(built.loop, A2), 'the walk did not cross the parent').toBe(BETA)
    expect(childrenOf(built.loop, BETA), 'A2 did not land as Beta’s 長子').toEqual(['A2', 'B1'])
    expect(depthOf(built.loop, A2)).toBe(2)
  })

  it('⭐ UN-4 「同じ親の中の並べ替え」 -- dragged UP one place, A2 stays under Alpha and stands before A1', () => {
    // ⚠️ THE OTHER HALF OF THE WALK. UN-4 names both outcomes of one drag --
    // 「親をまたぐことも、またがないこともあり」 -- so a build that always crossed the
    // parent would pass the case above and fail this one.
    const built = stage()
    const upToA1 = bandOf(built.loop, A1).y - bandOf(built.loop, A2).y

    drag(built, A2, [
      { dx: 0, dy: -PAST },
      { dx: 0, dy: upToA1 },
    ])

    expect(parentOf(built.loop, A2), 'the row left its parent on a move that stays inside it').toBe(
      ALPHA,
    )
    expect(childrenOf(built.loop, ALPHA), 'the two siblings did not change places').toEqual([
      'A2',
      'A1',
    ])
    expect(depthOf(built.loop, A2)).toBe(2)
  })

  it('⛔ MUST NOT: 「畳まれた群の中の場所を選んではならない」 -- a drag that walks PAST the folded Gamma lands under Delta and never inside Gamma', () => {
    // 「動かした行が消えることになり、効かない操作子と見分けがつかない」.
    const built = stage()
    const downToD1 = bandOf(built.loop, D1).y - bandOf(built.loop, A2).y

    drag(built, A2, [
      { dx: 0, dy: PAST },
      { dx: 0, dy: downToD1 },
    ])

    expect(parentOf(built.loop, A2), 'the row was put inside a folded group').not.toBe(GAMMA)
    expect(parentOf(built.loop, A2)).toBe(DELTA)
  })

  it('⛔ MUST: 「その向きに置ける場所が無いので、これ以上動かせない」 -- the first row dragged UP is refused with RS-39 and does not move', () => {
    const built = stage()
    const before = structuredClone(built.loop.document())

    drag(built, ALPHA, [
      { dx: 0, dy: -PAST },
      { dx: 0, dy: -bandOf(built.loop, ALPHA).height * 3 },
    ])

    expect(built.loop.document(), 'the row moved although there was nowhere to go').toEqual(before)
    toldOnly(built, 'RS-39')
  })
})

// ===========================================================================
// 左右は段を変えること（MUST）
// ===========================================================================

describe('HF-15 -- 左右は段を変えること（MUST）', () => {
  it('⭐ MUST: 右へ 1 歩はすぐ上の兄弟の末子になること -- A2 goes under A1, AFTER A1X', () => {
    const built = stage()

    drag(built, A2, [
      { dx: PAST, dy: 0 },
      { dx: S_37_INDENT, dy: 0 },
    ])

    expect(parentOf(built.loop, A2), 'the row did not become a child of the sibling above it').toBe(
      A1,
    )
    expect(childrenOf(built.loop, A1), 'the row landed as 長子 instead of 末子').toEqual([
      'A1X',
      'A2',
    ])
    expect(depthOf(built.loop, A2)).toBe(3)
  })

  it('⭐ MUST: 左へ 1 歩は親の次の兄弟になること -- A1 leaves Alpha and stands right after it', () => {
    const built = stage()

    drag(built, A1, [
      { dx: -PAST, dy: 0 },
      { dx: -S_37_INDENT, dy: 0 },
    ])

    expect(parentOf(built.loop, A1), 'the row did not come out to its parent’s level').toBe(
      null,
    )
    expect(
      childrenOf(built.loop, null),
      'the row did not land as the NEXT sibling of its old parent',
    ).toEqual(['Alpha', 'A1', 'Beta', 'Gamma', 'Delta'])
    expect(depthOf(built.loop, A1)).toBe(1)
  })

  it('⚠️ MUST: 左へ出たとき、後ろに居た兄弟は元の親に残すこと -- A2 stays under Alpha when A1 comes out', () => {
    const built = stage()

    drag(built, A1, [
      { dx: -PAST, dy: 0 },
      { dx: -S_37_INDENT, dy: 0 },
    ])

    expect(parentOf(built.loop, A2), 'the sibling behind it was dragged out too').toBe(ALPHA)
    expect(childrenOf(built.loop, ALPHA)).toEqual(['A2'])
  })

  it('⇒ すぐ上に兄弟が無い行は右へ動かせない -- A1 is Alpha’s first child, so RS-36 is told and the row does not move', () => {
    const built = stage()
    const before = structuredClone(built.loop.document())

    drag(built, A1, [
      { dx: PAST, dy: 0 },
      { dx: S_37_INDENT, dy: 0 },
    ])

    expect(built.loop.document(), 'a row with no sibling above it was moved right').toEqual(before)
    toldOnly(built, 'RS-36')
  })

  it('⛔ MUST: いちばん浅い段に居る行は左へ動かせない -- Alpha is at depth 1, so RS-37 is told and the row does not move', () => {
    const built = stage()
    const before = structuredClone(built.loop.document())

    drag(built, ALPHA, [
      { dx: -PAST, dy: 0 },
      { dx: -S_37_INDENT, dy: 0 },
    ])

    expect(built.loop.document(), 'a root row was moved further out').toEqual(before)
    toldOnly(built, 'RS-37')
  })
})

// ===========================================================================
// 深さの上限を超える右移動を受け付けてはならない（MUST NOT）
// ===========================================================================

describe('HF-15 / FR-085 / HM-3a -- 深さの上限を超える右移動を受け付けてはならない（MUST NOT）', () => {
  const P = (n: number): string => id(100 + n)

  /**
   * A chain `S-125` deep, with two leaves at the bottom so that a right step
   * would make one of them a child of the other.
   *
   *   P1 .. P(cap-1)   the chain, each the only child of the one above
   *     Q              depth = cap
   *     R              depth = cap   <- grabbed
   */
  function atTheCap(): Fixture {
    const cap = S_125_MAX_DEPTH
    const rows: { id: string; parent: string | null; order: number }[] = []
    for (let level = 1; level <= cap - 1; level += 1) {
      rows.push({ id: P(level), parent: level === 1 ? null : P(level - 1), order: 0 })
    }
    rows.push({ id: P(90), parent: P(cap - 1), order: 0 }) // Q
    rows.push({ id: P(91), parent: P(cap - 1), order: 1 }) // R
    return { rows, folded: [] }
  }

  it('⛔ MUST NOT: a row already at S-125 is refused a step right, RS-38 is told, and it does not move', () => {
    const built = stage(atTheCap())
    const R = P(91)
    expect(depthOf(built.loop, R), 'the fixture is not at the cap').toBe(S_125_MAX_DEPTH)
    const before = structuredClone(built.loop.document())

    drag(built, R, [
      { dx: PAST, dy: 0 },
      { dx: S_37_INDENT, dy: 0 },
    ])

    expect(built.loop.document(), 'a row was pushed past the depth cap').toEqual(before)
    toldOnly(built, 'RS-38')
  })

  it('⛔ HM-3a: 部分木は移動後の最深部で測る -- a row one step INSIDE the cap is still refused when its child would break it', () => {
    // 「移動後の深さが `FR-004` の上限を超える移動を受け付けてはならない
    // （MUST NOT）。部分木は**移動後の最深部**で測る」.
    const cap = S_125_MAX_DEPTH
    const rows: { id: string; parent: string | null; order: number }[] = []
    for (let level = 1; level <= cap - 2; level += 1) {
      rows.push({ id: P(level), parent: level === 1 ? null : P(level - 1), order: 0 })
    }
    // Two siblings one step inside the cap, and the second carries a child that
    // already stands ON the cap.
    rows.push({ id: P(90), parent: P(cap - 2), order: 0 })
    rows.push({ id: P(91), parent: P(cap - 2), order: 1 })
    rows.push({ id: P(92), parent: P(91), order: 0 })

    const built = stage({ rows, folded: [] })
    expect(depthOf(built.loop, P(92))).toBe(S_125_MAX_DEPTH)
    const before = structuredClone(built.loop.document())

    drag(built, P(91), [
      { dx: PAST, dy: 0 },
      { dx: S_37_INDENT, dy: 0 },
    ])

    expect(
      built.loop.document(),
      'the move was measured at the row and not at its deepest descendant',
    ).toEqual(before)
    toldOnly(built, 'RS-38')
  })
})

// ===========================================================================
// どちらの向きでも、その行の配下ごと動かすこと（MUST）
// ===========================================================================

describe('HF-15 (MUST) -- どちらの向きでも、その行の配下ごと動かすこと', () => {
  it('the DEPTH axis carries the subtree: A2A is still A2’s child, one step deeper', () => {
    const built = stage()

    drag(built, A2, [
      { dx: PAST, dy: 0 },
      { dx: S_37_INDENT, dy: 0 },
    ])

    expect(parentOf(built.loop, A2A), 'the child was left behind').toBe(A2)
    expect(depthOf(built.loop, A2A)).toBe(depthOf(built.loop, A2) + 1)
  })

  it('the POSITION axis carries the subtree: A2A follows A2 across the parent', () => {
    const built = stage()
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y

    drag(built, A2, [
      { dx: 0, dy: PAST },
      { dx: 0, dy: downToB1 },
    ])

    expect(parentOf(built.loop, A2A), 'the child was left behind').toBe(A2)
    // ⚠️ HM-5 (MUST NOT): 「行の器を作り直してはならない。更新するのは親だけ」 --
    // so the child that came along is the SAME row, keeping its own name.
    expect(rowsOf(built.loop).map((one) => one.id).sort()).toEqual(
      ROWS.map((one) => one.id).sort(),
    )
  })
})

// ===========================================================================
// 握っているあいだ、行をポインタに追従させること（MUST）
// ===========================================================================

describe('HF-15 (MUST) -- 握っているあいだ、行をポインタに追従させること。段送りの刻みは S-37 と同じ', () => {
  it('⭐ the depth axis moves the drawn row by EXACTLY one S-37 per S-37 of travel', () => {
    // ⛔⛔ 「刻みを別に持ってはならない（MUST NOT）」 —— 実測で、刻み 26px・
    // 段送り 16px のときポインタ 64px に対し行は 22px しか動かず、1 段ごとに
    // 離れていった。⭐ 揃えるとずれは 0px である。
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const restingIndent = titleOf(built, A2).indentPx as number

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))

    built.send(pointer('move', at.x + S_37_INDENT, at.y))
    const oneStep = titleOf(built, A2).indentPx as number
    built.send(pointer('move', at.x + S_37_INDENT * 2, at.y))
    const twoSteps = titleOf(built, A2).indentPx as number

    built.send(pointer('up', at.x + S_37_INDENT * 2, at.y))

    expect(
      oneStep - restingIndent,
      'one S-37 of travel did not move the held row by one S-37',
    ).toBe(S_37_INDENT)
    expect(
      twoSteps - restingIndent,
      'the picture drifted away from the pointer by the second step',
    ).toBe(S_37_INDENT * 2)
  })

  it('⭐ the position axis draws the held row at the place the hand stands on, and back where it was when the hand comes back', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const resting = titleOf(built, A2).box.y as number
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    built.send(pointer('move', at.x, at.y + downToB1))
    const carried = titleOf(built, A2).box.y as number

    built.send(pointer('move', at.x, at.y))
    const home = titleOf(built, A2).box.y as number
    built.send(pointer('up', at.x, at.y))

    expect(carried, 'the held row stayed where the layout had put it').not.toBe(resting)
    expect(carried, 'the held row did not follow the pointer downward').toBeGreaterThan(resting)
    expect(home, 'the picture did not come back when the pointer came back').toBe(resting)
  })
})

// ===========================================================================
// 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）, and one write on release
// ===========================================================================

describe('表 T-023d (MUST NOT) -- 掴んでいるあいだ値を文書へ書いてはならない。追従は絵であって編集ではない', () => {
  it('⛔ MUST NOT: nothing is written while the depth grab is held', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const before = structuredClone(built.loop.document())

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))
    built.send(pointer('move', at.x + S_37_INDENT, at.y))
    built.send(pointer('move', at.x + S_37_INDENT * 2, at.y))

    expect(built.loop.document(), 'the document was written while the row was held').toEqual(before)
  })

  it('⛔ MUST NOT: nothing is written while the position grab is held', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y
    const before = structuredClone(built.loop.document())

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    built.send(pointer('move', at.x, at.y + downToB1))

    expect(built.loop.document(), 'the document was written while the row was held').toEqual(before)
  })

  it('⭐ IN-1 / FR-031: the whole gesture writes ONCE, on the release, and only inside `schedule.taskGroups` and `Task.wbsOrder`', () => {
    // UN-4: 「掴んで動かす 1 回のドラッグは、親をまたぐことも、またがないことも
    // あり、どちらも 1 段である」 -- one drag, one CM-73 (表 T-108), one 段.
    // ⚠️ `FrameLoop` publishes no history, so what is read here is the other
    // half of the claim: everything the move is not allowed to reach is
    // untouched, which is what a single `moveTaskGroup` leaves behind.
    //
    // ⭐ 表 T-015a の HM-9 (利用者の裁定 2026-09-05) widened WHERE that one
    // write may land: 「各 `Task` の、同じ WBS 親を持つ兄弟の中での順位は、
    // その `Task` を描いている行の、行の木における位置で決めること（MUST）」.
    // A `Task` is not in `schedule.taskGroups`, so the release MUST reach
    // `Task.wbsOrder` (`AT-26`). ⛔ It may reach nothing else: HM-3 keeps
    // `wbsParentUid` still, and every other task field is compared whole.
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y
    const before = structuredClone(built.loop.document()) as any

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    built.send(pointer('move', at.x, at.y + downToB1))
    built.send(pointer('up', at.x, at.y + downToB1))

    const after = built.loop.document() as any
    expect(after.schedule.taskGroups, 'the release settled nothing').not.toEqual(
      before.schedule.taskGroups,
    )

    // Everything the row move does NOT touch, compared whole. `tasks` is
    // lifted out here ONLY so the single field HM-9 opened can be read on its
    // own -- every other field of every task is put back two blocks below.
    const { taskGroups: _movedBefore, tasks: _tasksBefore, ...restBefore } = before.schedule
    const { taskGroups: _movedAfter, tasks: _tasksAfter, ...restAfter } = after.schedule
    expect(
      restAfter,
      'the release wrote outside `schedule.taskGroups` and `Task.wbsOrder`',
    ).toEqual(restBefore)
    expect(after.documentSettings).toEqual(before.documentSettings)
    expect(after.schemaVersion).toEqual(before.schemaVersion)

    // ⭐ HM-9 (MUST): the reordered order reached the WBS at all.
    const ranks = (doc: any) =>
      (doc.schedule.tasks as any[]).map((one) => [one.uid, one.wbsOrder])
    expect(ranks(after), 'the release did not carry the new order into `Task.wbsOrder`').not.toEqual(
      ranks(before),
    )

    // ⛔ HM-9 opened ONE field and no more. The same tasks come back, in the
    // same order, carrying every other value they had.
    const exceptTheRank = (doc: any) =>
      (doc.schedule.tasks as any[]).map(({ wbsOrder: _rank, ...rest }) => rest)
    expect(exceptTheRank(after), 'the release wrote a task field other than `wbsOrder`').toEqual(
      exceptTheRank(before),
    )

    // ⛔ HM-3 (MUST NOT): 「タスクバーを別の行へ移す操作では WBS の親を
    // 変えてはならない」 -- 禁止の対象は親子関係であり、同じ親の下の順序
    // ではない。Stated on its own so a later widening of the field list cannot
    // let the parent slip through with it.
    const parents = (doc: any) =>
      (doc.schedule.tasks as any[]).map((one) => [one.uid, one.wbsParentUid])
    expect(parents(after), 'the release moved a WBS parent (HM-3)').toEqual(parents(before))

    // HM-5 (MUST NOT): 行の器を作り直してはならない -- the same rows come back,
    // carrying the same names, colours and heights.
    const shape = (doc: any) =>
      [...doc.schedule.taskGroups]
        .map((one: any) => ({
          id: one.id,
          label: one.label,
          color: one.color,
          height: one.height,
          isCollapsed: one.isCollapsed,
          isHidden: one.isHidden,
          derivedFromTaskUid: one.derivedFromTaskUid,
        }))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
    expect(shape(after), 'the move rebuilt a row instead of updating its parent').toEqual(
      shape(before),
    )
  })
})

// ===========================================================================
// GR-20 (MUST NOT) -- ピン止めしている行は掴めない
// ===========================================================================

describe('GR-20 of 表 T-023d (MUST NOT) -- ピン止めしている行は掴めないこと', () => {
  // 「`FR-098` が留めた行をパネルの先頭へ上げるので、上げられた位置で掴むと、
  // 木の順ではなく描く順を触ることになる。⚠️ 実測で、留めた行を引くと画面は
  // 1px も動かないまま親を 2 つまたいだ」.
  //
  // ⭐ THE MUST NOT ITSELF IS ANSWERED AT THE SIDE THE MANUSCRIPT PUTS IT ON,
  // AND NOT HERE. GR-20 is a row of the 掴み領域 table: what it forbids is a
  // pinned row HAVING a grab area, and 表 T-065's IF-9 (MUST) makes the side
  // that DREW the panel the side that answers where one is. The cases that hold
  // it are therefore in tests/unit/uf-72-screen-part.test.ts, under
  // 「GR-20 of 表 T-023d -- 行の左端に敷く掴み代（幅は S-138）」, where a pinned
  // row is read and found to carry no strip at all.
  //
  // ⛔ WHAT IS DELIBERATELY NOT ASSERTED HERE, AND WHY. A case could hand THIS
  // loop a description claiming a point on a pinned row IS on a strip -- a thing
  // the drawing side never says -- and demand the reading side refuse it too.
  // ⚠️ THE MANUSCRIPT DOES NOT DECIDE THAT. It says a pinned row is not
  // grabbable; it nowhere says the reading side must re-check an answer the
  // surface owes it. Such a case would be inventing an owner, so it is not
  // written. ⚠️ IT WAS RUN ONCE, AND IT WAS RED: this loop moves the row when
  // handed that description. That is recorded here rather than asserted.

  it('the premise the uf-72 cases rest on: FR-098 really does lift a pinned row into the band', () => {
    // ⭐ Kept in THIS file because the lifting is what GR-20's reason turns on
    // -- 「上げられた位置で掴むと、木の順ではなく描く順を触ることになる」 -- and
    // the panel's own description is where it can be read.
    const built = stage({ pinned: [A2] })
    const panel = built.screen.last().rowTitlePanel
    expect(
      panel.pinnedTitles.map((one) => one.groupId),
      'FR-098 no longer lifts a pinned row, so GR-20 has nothing to refuse',
    ).toEqual([A2])
    expect(panel.titles.map((one) => one.groupId)).not.toContain(A2)
  })
})

// ===========================================================================
// A press that is NOT on the strip is not a grab
// ===========================================================================

describe('GR-20 -- the strip is what the drag is taken on, and nothing else on the row is', () => {
  it('a press on the row that is NOT on the strip does not move the row, however far it travels', () => {
    // GR-20 gives the grab a place: 「行の左端に敷く掴み代」. A press elsewhere
    // on the row is FR-085's choosing of that row, not a grab.
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const before = structuredClone(built.loop.document())

    built.aimAtTheName(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))
    built.send(pointer('move', at.x + S_37_INDENT * 2, at.y))
    built.send(pointer('up', at.x + S_37_INDENT * 2, at.y))

    expect(built.loop.document(), 'a press off the strip moved the row').toEqual(before)
  })
})

// ===========================================================================
// ⭐⭐ THE TWO MUSTS 利用者の裁定 2026-08-30 ADDED TO `HF-15`, AND NEITHER HAD A
// CASE UNTIL NOW.
//
//   THE AXIS MARK 「⭐⭐ **いまどちらの軸が生きているかを、掴んでいる行に描くこと
//     （MUST）** —— **上下の軸が生きているときは行の左右の辺に、左右の軸が生きて
//     いるときは行の上下の辺に、帯を 1 本ずつ描くこと（MUST）。**⭐ **色は 表 T-236
//     の `S-151`（上下）と `S-152`（左右）とする。**⛔ **描かないと、動かせない向き
//     へ引いたときに壊れた操作子と見分けがつかない** —— **押しても何も起きない入口
//     と同じ見え方になる**」
//   THE RESISTED FOLLOW 「⭐⭐ **拒まれた向きへの追従は途中で止めること（MUST）**
//     —— **止める割合は … `S-212` が持つ。**⛔ **拒んだうえに行をポインタへ付いて
//     行かせてはならない（MUST NOT）** —— **手応えが返らないと、木から離れて滑って
//     いくだけに見える**」, with `S-212` 「⭐ **掛ける相手は、その軸の 1 歩ぶんで
//     ある** —— **左右なら 表 T-201 の `S-37`、上下ならその行が占める送りである**」
//
// ⛔ WHAT IS READ HERE AND WHAT IS NOT. This file drives the frame loop and reads
// the DESCRIPTION it hands the surface, so what these cases can see is
// `RowTitle.heldOnAxis` -- which axis the held row is to be drawn marked with --
// and the BOX the held row is described in. ⚠️ The bands themselves, their two
// colours and the ground under the held row are DRAWN, and are held in
// tests/unit/uf-72-screen-part.test.ts; ⛔ nothing here asserts a pixel of paint.
// ===========================================================================

/** 表 T-206 `S-212` -- 拒まれた向きへ掴んだ行が追従する割合. */
const S_212_RESISTED_RATIO = settingOf('T-206', 'S-212', '既定')

/** Which axis the panel says each drawn row is held on, keyed by row. */
function heldAxes(built: Stage): Map<string, unknown> {
  const panel = built.screen.last().rowTitlePanel
  const found = new Map<string, unknown>()
  for (const title of [...panel.pinnedTitles, ...panel.titles] as any[]) {
    if (title.heldOnAxis != null) found.set(title.groupId as string, title.heldOnAxis)
  }
  return found
}

describe('HF-15 (MUST) -- いまどちらの軸が生きているかを、掴んでいる行に描くこと', () => {
  it('表 T-051 still asks for the mark, the bands, the ground and the always-drawn strip, and 表 T-236 still holds the two colours', () => {
    const hf15 = saysOf('T-051', 'HF-15')
    for (const clause of [
      'いまどちらの軸が生きているかを、掴んでいる行に描くこと（MUST）',
      '上下の軸が生きているときは行の左右の辺に、左右の軸が生きているときは行の上下の辺に、帯を 1 本ずつ描くこと（MUST）',
      '色は 表 T-236 の `S-151`（上下）と `S-152`（左右）とする',
      '掴んでいる行には地を敷くこと（MUST）',
      '拒まれた向きへの追従は途中で止めること（MUST）',
      '拒んだうえに行をポインタへ付いて行かせてはならない（MUST NOT）',
      '掴み代は常に描くこと（MUST）',
      '`HF-6`（操作子はポインタが乗っているあいだだけ）の対象ではない',
    ]) {
      expect(hf15, `表 T-051 の HF-15 no longer says 「${clause}」`).toContain(clause)
    }
    for (const row of ['S-151', 'S-152']) {
      expect(rowOf('T-236', row).id, `表 T-236 no longer holds ${row}`).toBe(row)
    }
    // ⭐ AND THE RATIO IS A REAL FRACTION, which S-212 states as two MUST NOTs:
    // 「⛔ **0 にしてはならない** …⛔ **1 にしてはならない**」.
    expect(S_212_RESISTED_RATIO).toBeGreaterThan(0)
    expect(S_212_RESISTED_RATIO).toBeLessThan(1)
  })

  it('⭐ MUST: while the DEPTH axis is live, the held row is marked with that axis and no other row is marked at all', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    expect(heldAxes(built).size, 'a row was marked before the axis had settled').toBe(0)

    built.send(pointer('move', at.x + PAST, at.y))
    const marked = heldAxes(built)

    expect([...marked.keys()], 'the mark is not on the row that is held').toEqual([A2])
    expect(marked.get(A2), 'a sideways grab was not marked as the depth axis').toBe('depth')

    built.send(pointer('up', at.x + PAST, at.y))
    expect(heldAxes(built).size, 'the mark outlived the hand').toBe(0)
  })

  it('⭐ MUST: while the POSITION axis is live, the held row carries the OTHER axis', () => {
    // ⛔ THE TWO ARE TOLD APART OR THE MARK SAYS NOTHING: 「描かないと、動かせない
    // 向きへ引いたときに壊れた操作子と見分けがつかない」.
    const built = stage()
    const at = stripPoint(built.loop, A2)

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    const marked = heldAxes(built)

    expect([...marked.keys()]).toEqual([A2])
    expect(marked.get(A2), 'a downward grab was not marked as the position axis').toBe('position')

    built.send(pointer('up', at.x, at.y + PAST))
    expect(heldAxes(built).size, 'the mark outlived the hand').toBe(0)
  })

  it('⛔ a press that never settles an axis marks nothing, so the mark is the AXIS and not the press', () => {
    // 「掴んでから最初に閾値を超えた向きで軸が決まり」 -- below `S-208` there is no
    // live axis, and a mark drawn then would name one that does not exist.
    const built = stage()
    const at = stripPoint(built.loop, A2)

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + S_208_AXIS_SETTLES_AT - 1, at.y))

    expect(heldAxes(built).size).toBe(0)
    built.send(pointer('up', at.x + S_208_AXIS_SETTLES_AT - 1, at.y))
  })

  it('⛔ a press on the row’s NAME marks nothing, however far it travels (GR-20: the strip is what the drag is taken on)', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)

    built.aimAtTheName(A2)
    built.send(pointer('down', at.x + 60, at.y))
    built.send(pointer('move', at.x + 60, at.y + PAST * 4))

    expect(heldAxes(built).size).toBe(0)
    built.send(pointer('up', at.x + 60, at.y + PAST * 4))
  })
})

describe('HF-15 (MUST) -- 拒まれた向きへの追従は途中で止めること（S-212）', () => {
  it('⭐⭐ MUST: with the POSITION axis live, a sideways pull moves the row S-212 of ONE S-37 and no further', () => {
    // ⭐ 「掛ける相手は、その軸の 1 歩ぶんである —— 左右なら 表 T-201 の `S-37`」.
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const resting = titleOf(built, A2).box.x as number

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))

    built.send(pointer('move', at.x + S_37_INDENT * 4, at.y + PAST))
    const pulled = (titleOf(built, A2).box.x as number) - resting
    built.send(pointer('move', at.x + S_37_INDENT * 8, at.y + PAST))
    const pulledFurther = (titleOf(built, A2).box.x as number) - resting

    built.send(pointer('up', at.x + S_37_INDENT * 8, at.y + PAST))

    // ⛔ MUST NOT: 「拒んだうえに行をポインタへ付いて行かせてはならない」.
    expect(pulled, 'the row followed the whole way into the refused direction').toBeLessThan(
      S_37_INDENT * 4,
    )
    // ⭐ MUST: 「途中で止めること」 -- and 「0 にしてはならない」, or the hand gets
    // no answer at all and 「掴めていないのか拒まれているのか」 cannot be read.
    expect(pulled, 'the row did not move at all, so the hand got no answer').toBeGreaterThan(0)
    // ⭐ AND THE AMOUNT IS THE ONE S-212 STATES, on one step of THIS axis.
    expect(
      Math.abs(pulled - S_212_RESISTED_RATIO * S_37_INDENT),
      `the resisted follow is ${pulled}px, not S-212 (${S_212_RESISTED_RATIO}) of one S-37 (${S_37_INDENT}px)`,
    ).toBeLessThanOrEqual(1)
    // ⛔ AND IT STOPS: twice the pull is not twice the follow.
    expect(pulledFurther, 'the row went on sliding with the hand').toBe(pulled)
  })

  it('⭐ MUST: with the DEPTH axis live, a downward pull moves the row part of one row’s advance and stops', () => {
    // ⭐ 「上下ならその行が占める送りである」 -- the row's own band is that advance,
    // and the loop is what placed it.
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const advance = bandOf(built.loop, A2).height
    const resting = titleOf(built, A2).box.y as number

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))

    built.send(pointer('move', at.x + PAST, at.y + advance * 4))
    const pulled = (titleOf(built, A2).box.y as number) - resting
    built.send(pointer('move', at.x + PAST, at.y + advance * 8))
    const pulledFurther = (titleOf(built, A2).box.y as number) - resting

    built.send(pointer('up', at.x + PAST, at.y + advance * 8))

    expect(pulled, 'the row followed the whole way into the refused direction').toBeLessThan(
      advance * 4,
    )
    expect(pulled, 'the row did not move at all, so the hand got no answer').toBeGreaterThan(0)
    expect(
      Math.abs(pulled - S_212_RESISTED_RATIO * advance),
      `the resisted follow is ${pulled}px, not S-212 (${S_212_RESISTED_RATIO}) of one advance (${advance}px)`,
    ).toBeLessThanOrEqual(1)
    expect(pulledFurther, 'the row went on sliding with the hand').toBe(pulled)
  })

  it('⛔ MUST NOT: the resisted follow is a PICTURE and writes nothing (表 T-023d: 掴んでいるあいだ値を文書へ書いてはならない)', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const before = structuredClone(built.loop.document())

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    built.send(pointer('move', at.x + S_37_INDENT * 4, at.y + PAST))

    expect(built.loop.document()).toEqual(before)
    built.send(pointer('up', at.x + S_37_INDENT * 4, at.y + PAST))
  })
})
