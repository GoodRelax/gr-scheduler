// Unit tests for HF-15 of 表 T-051 -- 「タスクグループを掴んで動かせること（MUST）」 -- and
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
//   screen-renderer.ts   `ScreenView`, `ScreenSurface`, `TaskGroupTitle`, `Notice`,
//                        `DisplayLanguage`
//   screen-surface.ts    `ScreenPart` -- its seven members and the optional
//                        `isTaskGroupGrabStrip`, which is the road GR-20's press
//                        takes in
//   schedule-layout.ts   `TaskGroupPlacement` (`taskGroupId`, `depth`, `y`, `height`)
//   screen-regions.ts    `ScreenRect`
//   input-command-translator.ts  `HumanInput`, `InputModifiers`,
//                        `PointerButton`, `PointerInput`, `PointerPhase`
//
// ⛔ NOT ONE EXPECTED VALUE BELOW COMES OUT OF `src/`. Every number is read out
// of the manuscript at read time (`S-208`, `S-37`, `S-125` -- see `settingOf`),
// and every landing is stated as a relation of the tree rather than typed here.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-051 HF-15 -- read at read time below; CR-772 rewrote it (one drag sets
//           the gap and the depth). ⚠️ The cases of the retired axis lock, its
//           bands, its refusals and its resisted follow were removed with it;
//           the spec-only tester of CR-772 writes the cases of the new rule.
//   T-023d GR-20 「タスクグループパネルのタスクグループ | **タスクグループの左端に敷く掴み代**（幅は
//           `_assets/tbl-settings.md` の 表 T-206 の `S-138`）| 掴めばタスクグループを動かす
//           （表 T-051 の `HF-15`）。⛔ **ピン止めしているタスクグループは掴めないこと
//           （MUST NOT）**」
//   T-023d  its closing paragraph: 「⚠️ **`GR-20` は、表 T-051 の `HF-15` が
//           追従を同じ MUST で既に求めている。**⛔ **本表で繰り返してはならない
//           （MUST NOT）**」
//   T-023d  「⛔ **掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）**
//           （`FR-031`）—— **追従は絵であって編集ではない。**」
//   T-206 S-208 the distance past which a grabbed task group is carried
//   T-206 S-138 the width GR-20 lays the strip at
//   T-201 S-37 `taskGroupTitleIndent` -- the 段送りの刻み HF-15 borrows
//   T-211 S-125 `maxGroupDepth`, 「根のタスクグループを深さ 1 と数える」
//   FR-085  「深さの上限は `FR-004` に従う（値は表 T-211 の `S-125`）」
//   FR-098  the pin, which lifts a task group to the head of the panel
//   FR-029  what cannot be used gives its reason rather than going quiet
//   FR-031  UN-4: 「**階層の変更、および同じ親の中の並べ替え**（表 T-108 の
//           `CM-35` と `CM-73`）。⚠️ **並べ替えを別の行にしない** —— **掴んで
//           動かす 1 回のドラッグは、親をまたぐことも、またがないこともあり、
//           どちらも 1 段である**」
//   T-108 CM-73 `moveTaskGroup` 「タスクグループの親と並びを変える」
//   T-015a HM-3a 「**移動後の深さが `FR-004` の上限を超える移動を受け付けては
//           ならない（MUST NOT）。** 部分木は**移動後の最深部**で測る」
//   T-015a HM-5 「**タスクグループの器を作り直してはならない（MUST NOT）。** 更新するのは
//           親だけとする」
//   T-028 IN-1  ポインタ操作は離した時点で確定する
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   - HOW THE STRIP IS PAINTED. GR-20 gives it a width and a place and no ink;
//     表 T-026 makes a new figure the user's ruling (RC-13), so a case naming a
//     color or a shape would be inventing one.
//   - THE UNDO HISTORY ITSELF. UN-4 makes one drag 一段, but `FrameLoop`
//     publishes no history, so what is asserted here is the other half of the
//     same claim: the whole gesture writes ONCE, on the release, and what it
//     wrote is inside `schedule.taskGroups` and the one `Task` field 表 T-015a
//     of `HM-9` opened, and nowhere else.
//     ⭐ 表 T-015a の HM-9 (利用者の裁定 2026-09-05)「並べ替えた順序も WBS へ
//     伝わること（MUST）」 puts the reordered rank on `Task.wbsOrder`, and a
//     `Task` lives OUTSIDE `schedule.taskGroups` -- so the release reaching it
//     is a REQUIREMENT, not a leak. ⚠️ The heading MUST NOT is untouched by
//     that: nothing is written while the task group is HELD, and the two cases above
//     this one still compare the whole document mid-drag.
//     ⛔ HM-3 still forbids the parent moving 「タスクバーを別のタスクグループへ移す操作
//     では親タスクを変えてはならない（MUST NOT）」, so `parentTaskUid` is
//     read back unchanged below, and so is every other field of every task.
//   - WHICH SIDE REFUSES A PINNED TASK GROUP. GR-20's MUST NOT is a statement about
//     the grab AREA, and 表 T-065's IF-9 (MUST) leaves the side that DREW the
//     panel to say where one is -- so it is held in
//     tests/unit/uf-72-screen-part.test.ts and not here. See the note in the
//     GR-20 describe near the foot of this file.

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
import { bare, specTable, unbroken } from '../contract/spec-table'

// ===========================================================================
// What the manuscript says, read at read time rather than copied
// ===========================================================================

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

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
 * 表 T-206 `S-208` -- the distance past which a grabbed task group is carried.
 *
 * ⚠️ THE `既定` COLUMN AND NOT `値`. 表 T-206's first cell NAMES the thing and
 * the second gives the number; a reading of the first would come back with the
 * digits of the row id it points at.
 */
const S_208_CARRIES_PAST = settingOf('T-206', 'S-208', '既定')

/** 表 T-201 `S-37` `taskGroupTitleIndent` -- 段送りの刻み, which HF-15 borrows. */
const S_37_INDENT = settingOf('T-201', 'S-37', '既定値')

/** 表 T-211 `S-125` `maxGroupDepth`. 「根のタスクグループを深さ 1 と数える」. */
const S_125_MAX_DEPTH = settingOf('T-211', 'S-125', '値')

/** 表 T-103 U-22 -- the settled name IF-9 answers a point in the panel by. */
const U_22_PART = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

// ===========================================================================
// The documents these cases drive
// ===========================================================================

// BT-4 of 表 T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it; the task groups are written out here so
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
 *     A2         depth 2   <- the task group most cases grab
 *       A2A      depth 3
 *   BETA         depth 1
 *     B1         depth 2
 *   GAMMA        depth 1   (folded -- G1 is not drawn)
 *     G1         depth 2
 *   DELTA        depth 1
 *     D1         depth 2
 *
 * ⭐ WHY EVERY GROUP HAS A CHILD. HF-15 walks 「その段に置ける場所」 and the
 * manuscript nowhere says whether a CHILDLESS task group opens a place one step deeper.
 * Giving each group a child keeps every case off that undecided question.
 * ⭐ WHY A1 HAS ONE. 「右へ 1 歩はすぐ上の兄弟の末子になること」 -- 末子 and
 * 長子 answer alike under a task group with a single child, so A1 carries A1X and the
 * case can tell 末子 from 長子.
 * ⭐ WHY GAMMA IS FOLDED AND STANDS BETWEEN BETA AND DELTA. 「折りたたまれた群の中の
 * 場所を選んではならない（MUST NOT）」 -- a folded group at the END of the panel
 * would be skipped by a walk that simply ran out of task groups, so it is put in the
 * MIDDLE, where a walk that counted its places would land inside it.
 */
const TASK_GROUPS: readonly { readonly id: string; readonly parent: string | null; readonly order: number }[] =
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

const nameOf = (taskGroupId: string): string => NAME_OF.get(taskGroupId) ?? taskGroupId

interface Fixture {
  readonly rows?: readonly { readonly id: string; readonly parent: string | null; readonly order: number }[]
  /** Task groups the person folded (AT-153 `collapsed`). */
  readonly folded?: readonly string[]
  /** S-126 `pinnedTaskGroupIds` -- the task groups FR-098 lifts to the head of the panel. */
  readonly pinned?: readonly string[]
}

function documentWith(part: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const rows = part.rows ?? TASK_GROUPS
  const folded = new Set(part.folded ?? [GAMMA])
  const task = (uid: number): Task =>
    ({
      uid,
      parentTaskUid: null,
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
    '$schema': template['$schema'],
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
        name: nameOf(one.id),
        derivedFromTaskUid: null,
        order: one.order,
        treeState: folded.has(one.id) ? 'collapsed' : 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: rows.map((one, at) => ({
        taskUid: at + 1,
        taskGroupId: one.id,
      })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      ...(part.pinned === undefined ? {} : { pinnedTaskGroupIds: [...part.pinned] }),
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
    readFieldCommit: () => null,
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
  /** Aim the next press at GR-20's strip on one task group. CS-2 freezes it at the press. */
  aimAtTheStrip(taskGroupId: string): void
  /** Aim the next press at the task group's NAME -- on a task group, on no strip. */
  aimAtTheName(taskGroupId: string): void
}

/**
 * The description IF-9 answers for a point on GR-20's strip.
 *
 * ⭐ `entry` IS NULL, and that is the manuscript's own arithmetic rather than a
 * choice of this file's: 表 T-109 holds no row for a grab strip, so there is no
 * `IconId` a point on it could carry.
 */
const onTheStrip = (taskGroupId: string): ScreenPart => ({
  part: U_22_PART,
  entry: null,
  format: null,
  taskGroupId: taskGroupId,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
  isTaskGroupGrabStrip: true,
})

const onTheName = (taskGroupId: string): ScreenPart => ({
  part: U_22_PART,
  entry: null,
  format: null,
  taskGroupId: taskGroupId,
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
    aimAtTheStrip: (taskGroupId) => screen.drawAt(onTheStrip(taskGroupId)),
    aimAtTheName: (taskGroupId) => screen.drawAt(onTheName(taskGroupId)),
  }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

/** Where one task group's band stands, as the frame placed it. */
function bandOf(loop: FrameLoop, taskGroupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as any).taskGroups.find((one: any) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no band for task group ${nameOf(taskGroupId)}`)
  return { y: found.y as number, height: found.height as number }
}

/** The point on GR-20's strip of one task group: the left edge of the panel, mid band. */
function stripPoint(loop: FrameLoop, taskGroupId: string): { readonly x: number; readonly y: number } {
  const panel = frameOf(loop).regions.taskGroupPanel
  const band = bandOf(loop, taskGroupId)
  return { x: panel.x + 1, y: band.y + band.height / 2 }
}

interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
}

const rowsOf = (loop: FrameLoop): readonly Row[] =>
  (loop.document().schedule as any).taskGroups as readonly Row[]

function storedTaskGroup(loop: FrameLoop, taskGroupId: string): Row {
  const found = rowsOf(loop).find((one) => one.id === taskGroupId)
  if (found === undefined) throw new Error(`the document has no task group ${nameOf(taskGroupId)}`)
  return found
}

/** How deep one task group sits. 「根のタスクグループを深さ 1 と数える」 (S-125). */
function depthOf(loop: FrameLoop, taskGroupId: string): number {
  let at: string | null = taskGroupId
  let depth = 0
  for (let guard = 0; guard < 64 && at !== null; guard += 1) {
    depth += 1
    at = storedTaskGroup(loop, at).parentId
  }
  return depth
}

/** A travel far enough to carry the task group. */
const PAST = S_208_CARRIES_PAST + 1

// ===========================================================================
// The premises -- the manuscript still says what every case below rests on
// ===========================================================================

describe('the specification still says what these cases are driven by', () => {
  it('表 T-051 still holds HF-15, and every MUST these cases assert is still in it', () => {
    const hf15 = saysOf('T-051', 'HF-15')
    for (const clause of [
      'タスクグループを掴んで動かせること（MUST）',
      'そのタスクグループの配下ごと動かすこと（MUST）',
      '上限は、掴んでいるタスクグループ自身が `FR-004` の深さの上限を超えないところまで下げること（MUST）',
      '配下が深さの上限を超える段も選べること（MUST）',
      '書き込む前に 表 T-234 の `QN-16` で問うこと（MUST）',
      '黙って止めてはならない（MUST NOT）',
    ]) {
      expect(hf15, `表 T-051 の HF-15 no longer says 「${clause}」`).toContain(clause)
    }
  })

  it('表 T-051 HF-15 no longer counts the subtree into the cap, and no longer hides a gap without a place (CR-774)', () => {
    const hf15 = saysOf('T-051', 'HF-15')
    expect(hf15).not.toContain('配下を含めて `FR-004` の深さの上限')
    expect(hf15).not.toContain('置ける段が 1 つも無い隙間では差し込み線を引かず')
  })

  it('表 T-023d still holds GR-20, and it still refuses a pinned task group and points the width at S-138', () => {
    const gr20 = saysOf('T-023d', 'GR-20')
    expect(gr20).toContain('タスクグループの左端に敷く掴み代')
    expect(gr20).toContain('`S-138`')
    expect(gr20).toContain('掴めばタスクグループを動かす')
    expect(gr20, '表 T-023d no longer keeps a pinned task group out of the grab').toContain(
      'ピン止めしているタスクグループは掴めないこと（MUST NOT）',
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

  it('表 T-108 still holds CM-73, and UN-4 still makes one drag ONE 段 (FR-031)', () => {
    const cm73 = rowOf('T-108', 'CM-73')
    expect(bare(cm73.cells[1] ?? ''), '表 T-108 renamed the command HF-15 writes').toBe(
      'moveTaskGroup',
    )
    expect(cm73.cells.join(' ')).toContain('タスクグループの親と並びを変える')
    expect(cm73.cells.join(' ')).toContain('`HF-15`')
    expect(saysOf('T-027', 'UN-4')).toContain(
      '掴んで動かす 1 回のドラッグは、親をまたぐことも、またがないこともあり、どちらも 1 段である',
    )
  })

  it('表 T-015a still sends the reordered order into the WBS (HM-9), and still keeps the parent still (HM-3)', () => {
    // ⭐ 利用者の裁定 2026-09-05. Until it, HM-3 read 「WBS を変えてはならない」
    // widely and the release below was asserted to touch the task groups and nothing
    // else. The ruling narrowed the ban to the parent-child link and gave the
    // sibling rank to HM-9 -- which is why the release now reaches `Task`.
    const hm9 = saysOf('T-015a', 'HM-9')
    expect(hm9, '表 T-015a の HM-9 no longer sends the order to the WBS').toContain(
      '並べ替えた順序も WBS へ伝わること（MUST）',
    )
    expect(hm9, 'HM-9 no longer decides the rank by the task group tree').toContain(
      '各 `Task` の、同じ親タスクを持つ兄弟の中での順位は、その `Task` を描いているタスクグループの、タスクグループの木における位置で決めること（MUST）',
    )

    const hm3 = saysOf('T-015a', 'HM-3')
    expect(hm3, 'HM-3 no longer forbids the parent task moving').toContain(
      '親タスクを変えてはならない（MUST NOT）',
    )
    expect(hm3, 'HM-3 no longer leaves the sibling order to HM-9').toContain(
      '同じ親の下での順序は `HM-9` に従い',
    )

    // ⛔ The heading of 表 T-023d is NOT weakened by any of that: what may be
    // written on the RELEASE says nothing about what may be written while the
    // task group is held, and that is still nothing at all.
    expect(REQUIREMENTS).toContain('掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）')
  })

  it('FR-085 still owns the depth cap, and S-125 still counts a root task group as depth 1', () => {
    expect(REQUIREMENTS).toContain('深さの上限は `FR-004` に従う（値は表 T-211 の `S-125`）')
    expect(saysOf('T-211', 'S-125')).toContain('根のタスクグループを深さ 1 と数える')
    expect(S_125_MAX_DEPTH).toBeGreaterThanOrEqual(3)
  })
})

// ===========================================================================
// The premise every behavioral case rests on: the fixture is drawn the way
// the tree above says, and the strip is reachable.
// ===========================================================================

describe('the fixture these cases drive', () => {
  it('draws the tree in the order the cases walk, and hides the folded group', () => {
    const built = stage()
    const drawn = (frameOf(built.loop).layout as any).taskGroups.map((one: any) => nameOf(one.taskGroupId))
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

  it('the press point these cases use is inside the Task Group Panel and on the task group it names', () => {
    const built = stage()
    const panel = frameOf(built.loop).regions.taskGroupPanel
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

// ===========================================================================
// 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）, and one write on release
// ===========================================================================

describe('表 T-023d (MUST NOT) -- 掴んでいるあいだ値を文書へ書いてはならない。追従は絵であって編集ではない', () => {
  it('⛔ MUST NOT: nothing is written while a sideways carry is held', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const before = structuredClone(built.loop.document())

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))
    built.send(pointer('move', at.x + S_37_INDENT, at.y))
    built.send(pointer('move', at.x + S_37_INDENT * 2, at.y))

    expect(built.loop.document(), 'the document was written while the task group was held').toEqual(before)
  })

  it('⛔ MUST NOT: nothing is written while a downward carry is held', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y
    const before = structuredClone(built.loop.document())

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    built.send(pointer('move', at.x, at.y + downToB1))

    expect(built.loop.document(), 'the document was written while the task group was held').toEqual(before)
  })

  it('⭐ IN-1 / FR-031: the whole gesture writes ONCE, on the release, and only inside `schedule.taskGroups` and `Task.wbsOrder`', () => {
    // UN-4: 「掴んで動かす 1 回のドラッグは、親をまたぐことも、またがないことも
    // あり、どちらも 1 段である」 -- one drag, one CM-73 (表 T-108), one 段.
    // ⚠️ `FrameLoop` publishes no history, so what is read here is the other
    // half of the claim: everything the move is not allowed to reach is
    // untouched, which is what a single `moveTaskGroup` leaves behind.
    //
    // ⭐ 表 T-015a の HM-9 (利用者の裁定 2026-09-05) widened WHERE that one
    // write may land: 「各 `Task` の、同じ親タスクを持つ兄弟の中での順位は、
    // その `Task` を描いているタスクグループの、タスクグループの木における位置で決めること（MUST）」.
    // A `Task` is not in `schedule.taskGroups`, so the release MUST reach
    // `Task.wbsOrder` (`AT-26`). ⛔ It may reach nothing else: HM-3 keeps
    // `parentTaskUid` still, and every other task field is compared whole.
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

    // Everything the task group move does NOT touch, compared whole. `tasks` is
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

    // ⛔ HM-3 (MUST NOT): 「タスクバーを別のタスクグループへ移す操作では親タスクを
    // 変えてはならない」 -- 禁止の対象は親タスクと子タスクの関係であり、同じ親の下の順序
    // ではない。Stated on its own so a later widening of the field list cannot
    // let the parent slip through with it.
    const parents = (doc: any) =>
      (doc.schedule.tasks as any[]).map((one) => [one.uid, one.parentTaskUid])
    expect(parents(after), 'the release moved a parent task (HM-3)').toEqual(parents(before))

    // HM-5 (MUST NOT): タスクグループの器を作り直してはならない -- the same task groups come back,
    // carrying the same names, colors and heights.
    const shape = (doc: any) =>
      [...doc.schedule.taskGroups]
        .map((one: any) => ({
          id: one.id,
          name: one.label,
          color: one.color,
          minHeightPx: one.minHeight,
          treeState: one.treeState,
          derivedFromTaskUid: one.derivedFromTaskUid,
        }))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
    expect(shape(after), 'the move rebuilt a task group instead of updating its parent').toEqual(
      shape(before),
    )
  })
})

// ===========================================================================
// GR-20 (MUST NOT) -- ピン止めしているタスクグループは掴めない
// ===========================================================================

describe('GR-20 of 表 T-023d (MUST NOT) -- ピン止めしているタスクグループは掴めないこと', () => {
  // 「`FR-098` が留めたタスクグループをパネルの先頭へ上げるので、上げられた位置で掴むと、
  // 木の順ではなく描く順を触ることになる。⚠️ 実測で、留めたタスクグループを引くと画面は
  // 1px も動かないまま親を 2 つまたいだ」.
  //
  // ⭐ THE MUST NOT ITSELF IS ANSWERED AT THE SIDE THE MANUSCRIPT PUTS IT ON,
  // AND NOT HERE. GR-20 is a row of the 掴み領域 table: what it forbids is a
  // pinned task group HAVING a grab area, and 表 T-065's IF-9 (MUST) makes the side
  // that DREW the panel the side that answers where one is. The cases that hold
  // it are therefore in tests/unit/uf-72-screen-part.test.ts, under
  // 「GR-20 of 表 T-023d -- タスクグループの左端に敷く掴み代（幅は S-138）」, where a pinned
  // task group is read and found to carry no strip at all.
  //
  // ⛔ WHAT IS DELIBERATELY NOT ASSERTED HERE, AND WHY. A case could hand THIS
  // loop a description claiming a point on a pinned task group IS on a strip -- a thing
  // the drawing side never says -- and demand the reading side refuse it too.
  // ⚠️ THE MANUSCRIPT DOES NOT DECIDE THAT. It says a pinned task group is not
  // grabbable; it nowhere says the reading side must re-check an answer the
  // surface owes it. Such a case would be inventing an owner, so it is not
  // written. ⚠️ IT WAS RUN ONCE, AND IT WAS RED: this loop moves the task group when
  // handed that description. That is recorded here rather than asserted.

  it('the premise the uf-72 cases rest on: FR-098 really does lift a pinned task group into the band', () => {
    // ⭐ Kept in THIS file because the lifting is what GR-20's reason turns on
    // -- 「上げられた位置で掴むと、木の順ではなく描く順を触ることになる」 -- and
    // the panel's own description is where it can be read.
    const built = stage({ pinned: [A2] })
    const panel = built.screen.last().taskGroupPanel
    expect(
      panel.pinnedTitles.map((one) => one.taskGroupId),
      'FR-098 no longer lifts a pinned task group, so GR-20 has nothing to refuse',
    ).toEqual([A2])
    expect(panel.titles.map((one) => one.taskGroupId)).not.toContain(A2)
  })
})

// ===========================================================================
// A press that is NOT on the strip is not a grab
// ===========================================================================

describe('GR-20 -- the strip is what the drag is taken on, and nothing else on the task group is', () => {
  it('a press on the task group that is NOT on the strip does not move the task group, however far it travels', () => {
    // GR-20 gives the grab a place: 「タスクグループの左端に敷く掴み代」. A press elsewhere
    // on the task group is FR-085's choosing of that task group, not a grab.
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const before = structuredClone(built.loop.document())

    built.aimAtTheName(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))
    built.send(pointer('move', at.x + S_37_INDENT * 2, at.y))
    built.send(pointer('up', at.x + S_37_INDENT * 2, at.y))

    expect(built.loop.document(), 'a press off the strip moved the task group').toEqual(before)
  })
})
