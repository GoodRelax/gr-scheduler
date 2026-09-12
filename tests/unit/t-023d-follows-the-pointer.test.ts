// The closing rule of 表 T-023d that makes a HELD grab follow the pointer --
// its ten rows, and the rows the paragraph after it exempts.
//
// ⭐ NINE OF THE TEN ARE DRIVEN HERE. The tenth, GR-21, is the `Scrollbars`
// thumb, and it is measured rather than driven -- see the block at the foot of
// this file, which presses it and states what was measured.
//
// The unit these arrive on is UF-48 `single-html-shell` (CP-25 of table T-062),
// whose `frame-loop.ts` takes FT-1 of table T-078 -- 人の入力（ポインタとキー）
// -- on `receiveInput`, answers what one frame computed on `current()` and what
// the document says on `document()`.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
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
//                        `frameLoop(surface, first, env, screen?, files?,
//                        showPointerShape?)`
//   schedule-geometry.ts `Point`, `BarGeometry`, `MarkerGeometry`,
//                        `ResumeGeometry`, `TaskGeometry`, `CommentGeometry`,
//                        `ScheduleGeometry`
//   schedule-layout.ts   `RowPlacement`, `ScheduleLayout` (`pxPerDay`, `rows`)
//   screen-regions.ts    `ScreenRect`
//   screen-renderer.ts   `ScreenView`, `ScreenFrame` and `Scrollbar` (`axis`,
//                        `track`, `thumb`) -- read for GR-21 alone, because the
//                        thumb is drawn in the view and not in `FrameValues`
//   item-hit-area.ts     `Item`, `GrabArea`, `Hit` and the head comment
//                        ⭐ `GrabArea` -- 「Which row of table T-023d claimed
//                        the point」 -- spells GR-1 .. GR-18 and no more, which
//                        is one half of why GR-21 is measured and not driven.
//   schedule.ts          the entity types this fixture writes out
//   edit-task.ts /       the `kind` spellings of table T-108, to learn WHICH
//   edit-document.ts     command could carry each release
//
// ⚠️ TWO LINES OF `frame-loop.ts` BODY WERE ALSO SEEN, and they are declared
// here rather than claimed away: a grep for `GR-8` landed on two `Record`
// literals near line 534 and line 585 in which the tree states, for itself,
// that `GR-8` and `GR-14` have no release write. ⭐ THAT SET NO EXPECTED VALUE
// BELOW. It told this file where the tree stands, which is what lets the two
// ⛔ describes say WHY they are red instead of merely that they are; the
// expected values themselves come from `FR-044`, from 表 T-023d's own 操作
// column and from 表 T-108, all quoted where they are used.
//
// Not one number below is copied out of `src/`: every expected value is either
// read out of the manuscript at run time (`specTable`, `closingRuleRows`), or
// stated as a RELATION between two things the specification puts side by side
// (the picture against the pointer, the picture against itself one move later,
// the document before a drag against the document during one).
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-023d  its third closing rule, the subject of this file:
//           「`GR-3` / `GR-4` / `GR-5` / `GR-6` / `GR-8` / `GR-12` / `GR-14` /
//           `GR-15` / `GR-16` / `GR-21` を掴んでいるあいだ、置くことになる姿を、ポインタに
//           追従させて描いて示すこと（MUST）……⚠️ `GR-12` は縦にも追従すること
//           （MUST）—— 行の載せ替え（表 T-015a の `HM-3`）は縦の移動そのもの
//           なので、縦を止めるとどの行へ載るのかが見えない。⚠️ 確定は 表 T-028 の
//           `IN-1` に従う（離した時点）」
//           ⭐ THE TEN ROW IDS ARE READ OUT OF THE MANUSCRIPT, NOT COPIED --
//           see `closingRuleRows()`.
//   T-023d  the write ban the closing now states ONCE for every following row,
//           instead of once per following rule (DFC-466, 利用者の裁定 2026-09-11):
//           「`GR-1` / `GR-2` / `GR-3` / `GR-4` / `GR-5` / `GR-6` / `GR-8` /
//           `GR-12` / `GR-14` / `GR-15` / `GR-16` / `GR-21` を掴んでいるあいだ値を
//           文書へ書いてはならない（MUST NOT）（`FR-031`）—— 追従は絵であって
//           編集ではない。⚠️ `GR-1` / `GR-2` の日数も値である」
//   T-023d  the paragraph after it: 「本表の 操作 の欄が「動かす」「変える」
//           「ずらす」と述べる行は、上の 3 つの規則のいずれかで必ず追従する。
//           ⛔ 追従しない行を残してはならない（MUST NOT）……⭐ 残る行が追従しない
//           のは、掴んで動かすものではないからである —— `GR-7`（押して状態を
//           巡らせる）、`GR-13`（選ぶ）、`GR-10` / `GR-11`（ダブルクリックだけを
//           持つ）、`GR-19`（パレット自身が `FR-053` で追従する）」
//   T-023d  「上の行ほど優先すること（MUST）」 -- which is why every press point
//           below is taken from the picture and checked to be clear of the rows
//           that outrank it (see the premises).
//   T-023d GR-3 / GR-4   予定の開始点 / 終了点、予定バーの左端 / 右端、
//           `start` を変える / `finish` を変える
//   T-023d GR-5 / GR-6   実績の開始点 / 終了点、実績バーの左端 / 右端、
//           `actualStart` を変える / `actualDuration` を変える
//   T-023d GR-7          進捗マーカー、状態を巡らせる（`FR-013`）-- EXEMPT
//   T-023d GR-8          再開アイコン、マーカーのさらに外側、`resume` を変える
//           （`FR-044`）
//   T-023d GR-12         予定バー本体、端点を除いた中間、予定の平行移動
//           （`FR-011`）と、縦に動かしたときの行の載せ替え（表 T-015a の `HM-3`）
//   T-023d GR-14         コメントボックス / ハイライトボックス、本体・アンカー・
//           四隅、動かす / 大きさを変える
//   T-023d GR-15         実績のマイルストーン、実績の図形の上、`actualStart` を
//           動かす。「マイルストーンは実績バーを持たないので `GR-5` / `GR-6` /
//           `GR-17` に当たらない」
//   T-023d GR-16         基準日線、線の上、左右に動かして `statusDate` を変える
//           （`FR-046`）
//   T-023d GR-21         `Scrollbars` のつまみ, standing at the END of the
//           priority order (2026-09-07). 場所:「帯の中の、いま見えている範囲を
//           表す区間」, 操作:「掴めば表示位置を変える（規則は `FR-051`）」.
//           ⭐ NAMED BY THE CLOSING RULE AND NOT DRIVEN HERE -- the block at the
//           foot of this file presses it and reports what was measured.
//   T-023d  ⛔「掴んだ端点を置いた日を、稼働日へ寄せてはならない（MUST NOT）」
//   T-028 IN-1   「ポインタ操作は押した時点で実行せず、離した時点で確定すること」
//   FR-031  「文書を変えるドラッグ 1 回を 1 段にまとめること（MUST）」
//   FR-011  「タスクの本体をドラッグしたとき、予定の日付だけをずらし、実績の
//           日付を変えてはならない（MUST NOT）。行をまたぐ移動では予定も実績も
//           新しい行へ移るが、どちらの日付も変わらない（MUST NOT）」
//   T-015a HM-3  「タスクバーを別の行へ移す操作では WBS を変えてはならない
//           （MUST NOT）—— 行の移動と階層の移動は別の操作である」
//   FR-044  「`Task` が中断しているあいだ、`GRS` は、作成者が再開予定日を画面上で
//           置き、置いた後に動かせるようにすること」
//   FR-046  基準日を動かす経路（`statusDate`）
//   T-108   CM-3 `setStatusDate`, CM-11 `setTaskPlanDates`,
//           CM-13 `setTaskPlanActualState`（予実の 5 列を置く、`resume` を含む）,
//           CM-19 `moveTaskToTaskGroup`, CM-50 `setCommentBoxAnchor`,
//           CM-51 `setCommentBoxBodyOffsetPx` -- so a command exists for every
//           one of the nine releases. See the two ⛔ describes.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - `GR-1` / `GR-2` (the fade) and `GR-9` / `GR-17` / `GR-18` (the dummies).
//     They are the OTHER two closing rules, and
//     tests/unit/fr-052-t-023d-picture-while-held.test.ts already drives the
//     fade pair. ⛔ Nothing here repeats a case of that file.
//   - `GR-19`, the palette's grab band: `FR-053` has its own following rule and
//     its own owner.
//   - `GR-21`'s FOLLOWING. ⛔ NOT A READING OF THE SPECIFICATION -- the closing
//     rule names GR-21 among the ten, so the duty is exactly as strong as the
//     other nine. What is missing is a road to drive it on, and it was measured
//     rather than assumed (2026-09-07, this fixture, `scrollbarThickness: 14`):
//       · the drawn thumb is the WHOLE lane -- vertical `track` and `thumb` both
//         came out `{x:1176, y:48, width:14, height:628}` -- so there is no grip
//         to carry, only a lane;
//       · a press on the middle of that thumb followed by a 120px move changed
//         nothing at all: `current()` was byte-identical before, during and
//         after the drag, and so was `document()`;
//       · `GrabArea` -- the type that answers 「Which row of table T-023d
//         claimed the point」 -- runs GR-1 .. GR-18, so no unit can even report
//         a press as GR-21's.
//     ⭐ The block at the foot of this file pins those measurements, so the day
//     the thumb starts to follow they fail and this exemption has to go.
//     ⚠️ THE FIRST OF THE THREE IS SPENT (DFC-298, 2026-09-08): GR-21's LENGTH
//     landed, so the thumb is no longer the whole lane -- on `wideFixtureDocument`
//     it now measures 216.7px of a 976px horizontal lane and 153.6px of a 628px
//     vertical one. ⛔ THE EXEMPTION STILL STANDS, because what it is about is
//     the FOLLOWING and not the length: the grip is still laid at its lane's
//     START, so a held drag moves nothing on the picture, and the two cases below
//     go on pinning that. ⭐ The grip's start is the STOP note `screen-frame.ts`
//     now carries; the day it travels, those two fail and this whole block goes.
//   - WHICH `DocumentCommand` a release plans. The release is read where it
//     lands -- on `document()` -- because table T-108 is not this file's
//     subject.
//   - The 大きさを変える half of `GR-14`, and its HighlightBox. The row reads
//     本体・アンカー・四隅, and no table gives the anchor or the corners a size
//     or a grab allowance, so a case pressing one would be judged on a
//     rectangle the specification does not fix. The BODY is what this file
//     grabs, and 動かす is what it asserts.
//   - Esc and the lost pointer (IN-1a / IN-4). The fade file already drives
//     both on this same loop, and this file's subject is the following itself.
//   - How far the DRAWN thing sits from the pointer in pixels. The rule says
//     追従させて描く and 置くことになる姿, and 「置くことになる」 is a whole day
//     (⛔ 稼働日へ寄せてはならない speaks of days, not pixels), so a case
//     demanding pixel identity would fail a picture the specification permits.
//     What is asserted instead is the relation: it moves the way the pointer
//     moved, by about the travel, and it comes back exactly when the pointer
//     comes back.

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
import { specTable, unbroken } from '../contract/spec-table'

// ===========================================================================
// What the manuscript says, read at read time rather than copied
// ===========================================================================

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8')).split('\n')

const rowIdsIn = (text: string): readonly string[] => text.match(/GR-\d+/g) ?? []

/**
 * The paragraph that holds a rule, found by words the rule itself uses.
 *
 * ⛔ A RULE IS A PARAGRAPH, NOT A LINE. The manuscript breaks it at every
 * sentence (two trailing spaces), so a reader that took one line would see the
 * first sentence only. The break stands where the text had no character, so
 * the pieces join with nothing between them.
 */
function paragraphHolding(words: string): string | undefined {
  const at = REQUIREMENTS.findIndex((line) => line.includes(words))
  if (at < 0) return undefined
  let from = at
  while (from > 0 && (REQUIREMENTS[from - 1] ?? '').trim() !== '') from -= 1
  const said: string[] = []
  for (const line of REQUIREMENTS.slice(from)) {
    if (line.trim() === '') break
    said.push(line.trim())
  }
  return said.join('')
}

/**
 * The paragraph of the manuscript that carries the closing rule this file is
 * about, found by the words the rule itself uses rather than by a line number.
 */
function closingRuleLine(): string {
  const found = paragraphHolding('を掴んでいるあいだ、置くことになる姿を、ポインタに追従させて描いて示すこと')
  if (found === undefined) {
    throw new Error('table T-023d no longer states the closing rule this file is about')
  }
  return found
}

/**
 * The closing sentence that forbids a write while ANY following row is held.
 *
 * ⭐ ITS OWN SEAT SINCE DFC-466 (利用者の裁定 2026-09-11). The ban used to be
 * restated at the tail of each following rule; the closing now states it once,
 * for every row the three rules name, so this file reads it from there.
 */
function writeBanLine(): string {
  const found = paragraphHolding('を掴んでいるあいだ値を文書へ書いてはならない')
  if (found === undefined) {
    throw new Error('table T-023d no longer forbids a write while a grab is held')
  }
  return found
}

/**
 * The rows the closing rule NAMES, in the order it names them -- read out of
 * the sentence rather than copied into this file.
 *
 * ⭐ READ AND NOT COPIED, for the reason rule 03 gives: a list written down
 * here would go on passing after the rule had gained or lost a row, which is
 * exactly the regression this file exists to catch.
 */
function closingRuleRows(): readonly string[] {
  const rule = closingRuleLine()
  // ⛔ The SENTENCE, not the paragraph: a row named by a neighbouring
  // sentence is not a row this rule names.
  const at = rule.indexOf('を掴んでいるあいだ')
  const head = rule.slice(rule.lastIndexOf('。', at) + 1, at)
  return rowIdsIn(head)
}

/** The line after the rule -- 「本表の 操作 の欄が……」 -- and its exempt list. */
function exemptLine(): string {
  const found = paragraphHolding('本表の 操作 の欄が')
  if (found === undefined) {
    throw new Error('table T-023d no longer states which rows follow and which do not')
  }
  return found
}

/** The segment of that line which lists the rows that legitimately do not follow. */
function exemptSegment(): string {
  const line = exemptLine()
  const from = line.indexOf('残る行が追従しないのは')
  const to = line.indexOf('⚠', from)
  if (from < 0 || to < 0) throw new Error('the exempt list is no longer where this file reads it')
  return line.slice(from, to)
}

const exemptRows = (): readonly string[] => rowIdsIn(exemptSegment())

/**
 * The rows the last sentence of that paragraph sends to the OTHER two closing
 * rules -- 「`GR-1` / `GR-2` と `GR-9` / `GR-17` / `GR-18` は、上の 2 つの規則が
 * 同じことを既に求めている」.
 */
function coveredElsewhereRows(): readonly string[] {
  const line = exemptLine()
  const from = line.indexOf('⚠', line.indexOf('残る行が追従しないのは'))
  if (from < 0) throw new Error('the paragraph no longer names the rows the other rules cover')
  return rowIdsIn(line.slice(from))
}

const FOLLOWING_ROWS = closingRuleRows()

// ===========================================================================
// The document these cases drive
// ===========================================================================

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it; the rows, the Tasks and the
// annotation are written out here so that what is drawn can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

/** One row of the schedule. The ids are UUIDs because AT-51 is one. */
const ROW_A = '2a000000-0000-4000-8000-000000000001'
const ROW_B = '2a000000-0000-4000-8000-000000000002'
const ROW_C = '2a000000-0000-4000-8000-000000000003'
const ROW_D = '2a000000-0000-4000-8000-000000000004'
const ROW_E = '2a000000-0000-4000-8000-000000000005'

/** The Task the plan and actual rows are grabbed on. */
const PLAIN_UID = 1
/** The milestone GR-15 is grabbed on. */
const MILESTONE_UID = 3
/** The suspended Task GR-7 and GR-8 are grabbed on. */
const SUSPENDED_UID = 4
/** The Task `wideFixtureDocument` adds, GR-21's horizontal drag reads it. */
const OVERFLOW_UID = 900

const BOX_ID = '2b000000-0000-4000-8000-000000000001'

/** A stored date column, written the way the startup template writes one. */
const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

/** The day part of a stored date, which sorts the way the calendar runs. */
const dayOf = (stored: string | null): string => {
  if (stored === null) throw new Error('the column this case reads holds nothing')
  return stored.slice(0, 10)
}

const PLAIN_START = day(6)
const PLAIN_FINISH = day(24)
const PLAIN_ACTUAL_START = day(9)
/** In WORKING days -- `actualDuration` is counted in them (`FR-011`). */
const PLAIN_ACTUAL_DURATION = 4

const MILESTONE_DAY = day(13)
const MILESTONE_ACTUAL_START = day(17)

const SUSPENDED_START = day(3)
const SUSPENDED_FINISH = day(27)
const SUSPENDED_ACTUAL_START = day(6)
const SUSPENDED_RESUME = day(20)

const STATUS_DATE = day(22)
const BOX_ANCHOR = day(6)

/** 1 day is this many px at zoom 1 -- S-1's key, set wide so a day is legible. */
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
        // GR-16 needs a `Status Line` to grab, and CU-1 draws one only while
        // `Project.statusDate` holds something.
        statusDate: STATUS_DATE,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        // Row A -- the plan bar and the actual bar GR-3 / GR-4 / GR-5 / GR-6 /
        // GR-12 are grabbed on. ⚠️ `actualStart` is deliberately LATER than
        // `start`, and the actual end well inside the plan end: the table
        // prefers GR-3 and GR-4 to GR-5 and GR-6, so two ends standing on the
        // same day would leave the actual pair unreachable and the cases would
        // be measuring the plan twice.
        task({
          uid: PLAIN_UID,
          name: 'Alpha',
          start: PLAIN_START,
          finish: PLAIN_FINISH,
          actualStart: PLAIN_ACTUAL_START,
          actualDuration: PLAIN_ACTUAL_DURATION,
          percentComplete: 25,
        }),
        // Row C -- GR-15. 「マイルストーンは実績バーを持たないので `GR-5` /
        // `GR-6` / `GR-17` に当たらない」, and its actual stands on another day
        // so that the plan figure and the actual figure do not overlap.
        task({
          uid: MILESTONE_UID,
          name: 'Gamma',
          start: MILESTONE_DAY,
          finish: MILESTONE_DAY,
          milestone: true,
          actualStart: MILESTONE_ACTUAL_START,
          actualDuration: 0,
        }),
        // Row D -- 中断中・再開日あり, which is the only state that draws the
        // resume icon GR-8 stands on (`FR-044`, MUST).
        task({
          uid: SUSPENDED_UID,
          name: 'Delta',
          start: SUSPENDED_START,
          finish: SUSPENDED_FINISH,
          actualStart: SUSPENDED_ACTUAL_START,
          actualDuration: 3,
          actualFinish: null,
          resume: SUSPENDED_RESUME,
          resumeValid: true,
          percentComplete: 15,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        group(ROW_A, 0, 'A'),
        // ⭐ EMPTY ON PURPOSE: GR-12's vertical half needs a row to be carried
        // ONTO, and an empty one keeps the case's release readable -- the
        // membership that changes is the only membership in it.
        group(ROW_B, 1, 'B'),
        group(ROW_C, 2, 'C'),
        group(ROW_D, 3, 'D'),
        // ⭐ ALSO EMPTY: the comment box GR-14 grabs and the point GR-16's line
        // is pressed at both live here, so that no Task's bar can outrank
        // either of them (「上の行ほど優先すること（MUST）」).
        group(ROW_E, 4, 'E'),
      ],
      taskGroupMembers: [
        { taskUid: PLAIN_UID, groupId: ROW_A, stackOrder: null },
        { taskUid: MILESTONE_UID, groupId: ROW_C, stackOrder: null },
        { taskUid: SUSPENDED_UID, groupId: ROW_D, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [
        {
          id: BOX_ID,
          leaderShapeKind: 'polyline',
          text: 'Note',
          anchorDate: BOX_ANCHOR,
          anchorGroupId: ROW_E,
          bodyOffsetPx: null,
        },
      ],
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

const memberGroupOf = (loop: FrameLoop, uid: number): string => {
  const found = (loop.document().schedule as any).taskGroupMembers.find(
    (one: any) => one.taskUid === uid,
  )
  if (found === undefined) throw new Error(`Task ${uid} is on no row`)
  return found.groupId as string
}

const storedBoxOf = (loop: FrameLoop): any => {
  const found = (loop.document().schedule as any).commentBoxes.find((one: any) => one.id === BOX_ID)
  if (found === undefined) throw new Error('the document has no comment box')
  return found
}

const statusDateOf = (loop: FrameLoop): string | null =>
  (loop.document().schedule as any).project.statusDate

// ===========================================================================
// The host UF-48 is given
// ===========================================================================

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
 * in this layer. ⛔ Nothing in this fake decides anything about presses,
 * pictures or documents: it drains the queue.
 *
 * ⭐ Copied, deliberately unchanged, from
 * tests/unit/fr-052-t-023d-picture-while-held.test.ts, which drives the same
 * unit through the same seam.
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
 * A stand-in for IF-9's surface that has drawn no UI part over the schedule.
 *
 * ⭐ WHY IT ANSWERS `null` EVERYWHERE. `PointerPress.on` is what admits table
 * T-023a: a press the surface answered for is a press on an entry and none of
 * the six gestures. Every press below lands on the schedule's own drawing area,
 * which is where table T-023d rules, so the honest answer for all of them is
 * that the surface drew nothing there.
 */
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    // IF-9's fifth answer. This fake draws no field, so nothing is unsettled.
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
  // FT-3 of table T-078 is not what starts this: the first frame is owed by the
  // loop being made, so drain it before any case reads `current()`.
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
 * came out as -- an area to fill (SH-1 / SH-2 / SH-5) or a line with ends
 * (SH-3 / SH-4).
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

const midY = (box: Box): number => (box.y0 + box.y1) / 2
const midX = (box: Box): number => (box.x0 + box.x1) / 2

const planBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).plan, `Task ${uid}'s plan bar`)
const actualBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).actual, `Task ${uid}'s actual figure`)

/** The mean of a run of points -- used to press the middle of a drawn icon. */
function centroid(points: readonly Point[], what: string): Point {
  if (points.length === 0) throw new Error(`${what} was drawn with no points`)
  const x = points.reduce((sum, one) => sum + one.x, 0) / points.length
  const y = points.reduce((sum, one) => sum + one.y, 0) / points.length
  return { x, y }
}

function markerOf(loop: FrameLoop, uid: number) {
  const found = drawnTask(loop, uid).marker
  if (found === null) throw new Error(`Task ${uid} has no progress marker drawn`)
  return found
}

function resumeOf(loop: FrameLoop, uid: number) {
  const found = drawnTask(loop, uid).resume
  if (found === null) throw new Error(`Task ${uid} has no resume icon drawn`)
  return found
}

/**
 * GR-8's press point: the middle of the arrow HEAD, which is the icon's outer
 * end. ⚠️ The head and not the whole icon, because table T-023d puts GR-7 (the
 * marker) above GR-8 and the icon starts just outside the marker's circle -- a
 * point averaged over the whole icon could fall back inside it.
 */
const resumePoint = (loop: FrameLoop, uid: number): Point =>
  centroid(resumeOf(loop, uid).head, `Task ${uid}'s resume icon head`)

function commentOf(loop: FrameLoop) {
  const found = frameOf(loop).geometry.commentBoxes.find((one) => one.id === BOX_ID)
  if (found === undefined) throw new Error('the frame drew no comment box')
  return found
}

function statusLineOf(loop: FrameLoop) {
  const found = frameOf(loop).geometry.statusLine
  if (found === null) throw new Error('the frame drew no status line')
  return found
}

// ===========================================================================
// The nine rows of the ten that are driven, each with the point it is grabbed
// at and the coordinate the closing rule makes follow the pointer.
// (The tenth, GR-21, is measured at the foot of this file.)
// ===========================================================================

interface Follower {
  /** The row of table T-023d. */
  readonly row: string
  /** Its 掴み領域 and 場所 cells, so a failure names the line. */
  readonly area: string
  /** Where the press lands, taken from the picture. */
  readonly press: (loop: FrameLoop) => Point
  /** The coordinate of the drawn thing that must follow the pointer. */
  readonly reads: (loop: FrameLoop) => number
}

/**
 * ⚠️ EVERY PRESS POINT IS TAKEN FROM THE PICTURE, never from a number.
 * 表 T-023d sends 掴み代 and 当たり判定 to 表 T-206 and this file states none of
 * them: it presses the drawn edge, the drawn centre or the drawn icon, which is
 * inside any allowance those rows can hold.
 */
const FOLLOWERS: readonly Follower[] = [
  {
    row: 'GR-3',
    area: '予定の開始点 -- 予定バーの左端',
    press: (loop) => ({ x: planBox(loop, PLAIN_UID).x0, y: midY(planBox(loop, PLAIN_UID)) }),
    reads: (loop) => planBox(loop, PLAIN_UID).x0,
  },
  {
    row: 'GR-4',
    area: '予定の終了点 -- 予定バーの右端',
    press: (loop) => ({ x: planBox(loop, PLAIN_UID).x1, y: midY(planBox(loop, PLAIN_UID)) }),
    reads: (loop) => planBox(loop, PLAIN_UID).x1,
  },
  {
    row: 'GR-5',
    area: '実績の開始点 -- 実績バーの左端',
    press: (loop) => ({ x: actualBox(loop, PLAIN_UID).x0, y: midY(actualBox(loop, PLAIN_UID)) }),
    reads: (loop) => actualBox(loop, PLAIN_UID).x0,
  },
  {
    row: 'GR-6',
    area: '実績の終了点 -- 実績バーの右端',
    press: (loop) => ({ x: actualBox(loop, PLAIN_UID).x1, y: midY(actualBox(loop, PLAIN_UID)) }),
    reads: (loop) => actualBox(loop, PLAIN_UID).x1,
  },
  {
    row: 'GR-8',
    area: '再開アイコン -- マーカーのさらに外側',
    press: (loop) => resumePoint(loop, SUSPENDED_UID),
    reads: (loop) => centroid(resumeOf(loop, SUSPENDED_UID).head, 'the resume icon head').x,
  },
  {
    row: 'GR-12',
    area: '予定バー本体 -- 端点を除いた中間',
    // ⭐ FOUR DAYS IN FROM THE RIGHT END, which is a distance and not a
    // rectangle: it is clear of GR-4 (the plan end, four days to the right) and
    // clear of GR-6 (the actual end, further left still), so the press cannot
    // be claimed by a row the table prefers to this one.
    press: (loop) => ({
      x: planBox(loop, PLAIN_UID).x1 - 4 * pxPerDay(loop),
      y: midY(planBox(loop, PLAIN_UID)),
    }),
    reads: (loop) => planBox(loop, PLAIN_UID).x0,
  },
  {
    row: 'GR-14',
    area: 'コメントボックス -- 本体',
    press: (loop) => {
      const body = commentOf(loop).body
      return { x: body.x + body.width / 2, y: body.y + body.height / 2 }
    },
    reads: (loop) => commentOf(loop).body.x,
  },
  {
    row: 'GR-15',
    area: '実績のマイルストーン -- 実績の図形の上',
    press: (loop) => ({
      x: midX(actualBox(loop, MILESTONE_UID)),
      y: midY(actualBox(loop, MILESTONE_UID)),
    }),
    reads: (loop) => midX(actualBox(loop, MILESTONE_UID)),
  },
  {
    row: 'GR-16',
    area: '基準日線 -- 線の上',
    // ⭐ PRESSED ON THE EMPTY ROW. The line runs the height of the `Row Area`
    // and this row is the last of the table, so a point where it crosses a bar
    // belongs to GR-12; row E holds no Task, and the comment box stands far to
    // the left of the status date.
    press: (loop) => {
      const band = bandOf(loop, ROW_E)
      return { x: statusLineOf(loop).x, y: band.y + band.height / 2 }
    },
    reads: (loop) => statusLineOf(loop).x,
  },
]

/**
 * The one row of the closing rule this file MEASURES instead of driving.
 *
 * ⛔ NOT AN EXEMPTION FROM THE RULE. The closing rule names GR-21 among the ten
 * and the paragraph after the table exempts it nowhere, so the duty is as
 * strong as the other nine's; what is missing is a road to drive it on. The
 * block at the foot of this file states what was measured, and fails the day
 * the road appears.
 */
const MEASURED_NOT_DRIVEN = 'GR-21'

/** How far every following case carries the pointer. */
const TRAVEL_DAYS = 4

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still states the rule this file is about', () => {
  it('names ten rows: the nine these cases drive, and GR-21', () => {
    // ⭐ GR-21 JOINED THE RULE ON 2026-09-07 and the count moved with it. ⛔ The
    // number is asserted as well as the membership, so a row silently dropped
    // out of the sentence fails here rather than quietly shrinking what the
    // `describe.each` below walks.
    expect(
      FOLLOWING_ROWS.length,
      'table T-023d: the closing rule that makes a held grab follow the pointer',
    ).toBe(10)
    // ⛔ NOT A SUBSET CHECK. The nine driven rows are the sentence's own list
    // with exactly one row taken out, in the sentence's own order -- so a row
    // ADDED to the rule lands here as a failure instead of passing unnoticed.
    expect(FOLLOWERS.map((one) => one.row)).toEqual(
      FOLLOWING_ROWS.filter((row) => row !== MEASURED_NOT_DRIVEN),
    )
    expect(
      FOLLOWING_ROWS.filter((row) => !FOLLOWERS.some((one) => one.row === row)),
      'the one row of the closing rule this file measures instead of driving',
    ).toEqual([MEASURED_NOT_DRIVEN])
  })

  it('is a MUST, and forbids a write while the button is down (MUST NOT)', () => {
    const line = closingRuleLine()
    expect(line, 'table T-023d: ……描いて示すこと（MUST）').toContain('（MUST）')
    // ⭐ READ FROM THE CLOSING'S OWN SEAT, not from the rule above: DFC-466 folded
    // the ban out of the two rules that restated it and gave it one sentence
    // that names every following row. ⛔ The expectation itself is unchanged.
    expect(
      writeBanLine(),
      'table T-023d: 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）',
    ).toContain('掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）')
    expect(writeBanLine(), 'table T-023d: the ban cites `FR-031`').toContain('`FR-031`')
    // ⛔ AND IT MUST STILL BIND EVERY ROW THIS RULE NAMES -- a fold that dropped
    // a row would leave that row free to write while it is held.
    for (const row of closingRuleRows()) {
      expect(writeBanLine(), `table T-023d: the write ban no longer names ${row}`).toContain(
        `\`${row}\``,
      )
    }
    expect(line, 'table T-023d: 確定は 表 T-028 の `IN-1` に従う（離した時点）').toContain(
      '表 T-028 の `IN-1`',
    )
  })

  it('makes GR-12 follow vertically as well (MUST), for the row re-seating of HM-3', () => {
    const line = closingRuleLine()
    expect(line, 'table T-023d: `GR-12` は縦にも追従すること（MUST）').toContain(
      '`GR-12` は縦にも追従すること（MUST）',
    )
    expect(
      line,
      'the reason it gives: 行の載せ替え（表 T-015a の `HM-3`）は縦の移動そのもの',
    ).toContain('表 T-015a の `HM-3`')
  })

  it('leaves no row of table T-023d unaccounted for (MUST NOT)', () => {
    // 「⛔ 追従しない行を残してはならない（MUST NOT）」. The paragraph splits the
    // table three ways: the ten this rule names, the five it exempts with a
    // reason each, and the five the other two closing rules already cover.
    //
    // ⭐⭐ THE HOLE THIS CASE PINNED IS CLOSED (2026-09-07). GR-21 joined the
    // table before it joined any of the three sentences, and for one day this
    // case carried a `KNOWN_GAP = ['GR-21']` exception and a second case beside
    // it that proved the gap was real. The closing rule now names GR-21, so both
    // are gone and the empty expectation is back -- which is exactly what the
    // exception's own ⛔ said to do the day the manuscript accounted for it.
    // ⛔ Do not weaken this to `not.toContain` or to a subset check.
    const every = specTable('T-023d').rows.map((one) => one.id)
    const accounted = new Set([...FOLLOWING_ROWS, ...exemptRows(), ...coveredElsewhereRows()])
    const missing = every.filter((id) => !accounted.has(id))
    expect(missing, 'table T-023d: 追従しない行を残してはならない（MUST NOT）').toEqual([])
    expect(accounted.size, 'and nothing is accounted for twice').toBe(every.length)
  })

  it('gives every exempted row a reason of its own', () => {
    // 「⭐ 残る行が追従しないのは、掴んで動かすものではないからである —— `GR-7`
    // （押して状態を巡らせる）、`GR-13`（選ぶ）、`GR-10` / `GR-11`（ダブルクリック
    // だけを持つ）、`GR-19`（パレット自身が `FR-053` で追従する）」
    const segment = exemptSegment()
    expect(exemptRows()).toEqual(['GR-7', 'GR-13', 'GR-10', 'GR-11', 'GR-19'])
    const clauses = segment.split('、').filter((part) => rowIdsIn(part).length > 0)
    for (const clause of clauses) {
      expect(
        clause,
        `table T-023d exempts ${rowIdsIn(clause).join(' / ')} with no reason`,
      ).toContain('（')
    }
  })
})

describe('the fixture draws every figure the nine rows are grabbed on', () => {
  it('draws a plan bar and an actual bar whose ends do not stand on one another', () => {
    const built = stage()
    const plan = planBox(built.loop, PLAIN_UID)
    const actual = actualBox(built.loop, PLAIN_UID)
    // ⛔ A PREMISE, NOT A DECORATION. 「上の行ほど優先すること（MUST）」 puts GR-3
    // and GR-4 above GR-5 and GR-6, so ends that coincided would leave the
    // actual pair unreachable and every GR-5 / GR-6 case below would silently
    // be measuring the plan.
    const oneDay = pxPerDay(built.loop)
    expect(
      actual.x0 - plan.x0,
      'the actual start stands days away from the plan start',
    ).toBeGreaterThan(2 * oneDay)
    expect(plan.x1 - actual.x1, 'the actual end stands days away from the plan end').toBeGreaterThan(
      2 * oneDay,
    )
  })

  it('draws a progress marker and a resume icon on the suspended Task (FR-044, MUST)', () => {
    const built = stage()
    // FR-044: 「中断のあいだは再開アイコンを描くこと（MUST）」.
    const marker = markerOf(built.loop, SUSPENDED_UID)
    const icon = resumeOf(built.loop, SUSPENDED_UID)
    expect(icon.arm.length, 'FR-044: 中断のあいだは再開アイコンを描くこと（MUST）').toBeGreaterThan(
      0,
    )
    expect(icon.head.length).toBeGreaterThan(0)
    // ⛔ THE PRESS POINT MUST BE OUTSIDE THE MARKER, because table T-023d puts
    // GR-7 above GR-8: a press inside the marker's circle is GR-7's.
    const at = resumePoint(built.loop, SUSPENDED_UID)
    const away = Math.hypot(at.x - marker.centre.x, at.y - marker.centre.y)
    expect(away, 'table T-023d GR-8: 再開アイコンはマーカーのさらに外側').toBeGreaterThan(
      marker.radius,
    )
  })

  it('draws the milestone an actual figure of its own (GR-15)', () => {
    const built = stage()
    const plan = boxOfBar(drawnTask(built.loop, MILESTONE_UID).plan, "the milestone's plan figure")
    const actual = actualBox(built.loop, MILESTONE_UID)
    expect(midX(actual), 'the two figures stand on different days').not.toBeCloseTo(midX(plan), 3)
  })

  it('draws the comment box and the status line, clear of one another', () => {
    const built = stage()
    const body = commentOf(built.loop).body
    const line = statusLineOf(built.loop)
    // ⛔ A PREMISE: GR-14 outranks GR-16, so the point GR-16 is pressed at must
    // not be inside the box's body.
    expect(line.x, 'the status line stands clear of the comment box').toBeGreaterThan(
      body.x + body.width,
    )
  })

  it('puts the empty row GR-16 is pressed on inside the line it presses', () => {
    const built = stage()
    const band = bandOf(built.loop, ROW_E)
    const line = statusLineOf(built.loop)
    const at = band.y + band.height / 2
    expect(at).toBeGreaterThanOrEqual(line.top)
    expect(at).toBeLessThanOrEqual(line.bottom)
  })
})

// ===========================================================================
// (a) The picture follows the pointer while the button is down
// ===========================================================================

describe.each(FOLLOWERS.map((one) => [one.row, one] as [string, Follower]))(
  'table T-023d %s: the picture follows the pointer while it is held',
  (row, follower) => {
    it(`carries the drawn ${row} with the pointer (MUST)`, () => {
      const built = stage()
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      // ⭐ READ AFTER THE PRESS, NOT BEFORE IT. IN-1 settles nothing on the
      // press, so this is the same picture -- and it is the picture the pointer
      // must be measured against once it starts to move.
      const held = follower.reads(built.loop)
      const travel = TRAVEL_DAYS * pxPerDay(built.loop)
      built.send(pointer('move', at.x + travel, at.y))
      const now = follower.reads(built.loop)
      expect(
        now,
        `table T-023d (${follower.area}): 掴んでいるあいだ、置くことになる姿を、ポインタに追従させて描いて示すこと（MUST）`,
      ).toBeGreaterThan(held)
      // ⚠️ WITHIN ONE DAY, and not to the pixel. 「置くことになる姿」 is the
      // figure that WOULD be placed, and what would be placed is a day -- the
      // rule just above forbids nudging a placed day onto a working one, which
      // is a statement about days. A picture quantised to the day is therefore
      // one the specification permits, and a case demanding pixel identity
      // would fail it.
      expect(
        Math.abs(now - held - travel),
        `${row} did not follow the pointer: it moved ${now - held} where the pointer moved ${travel}`,
      ).toBeLessThanOrEqual(pxPerDay(built.loop))
    })

    it(`follows every move, not only the last one (${row})`, () => {
      const built = stage()
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      const held = follower.reads(built.loop)
      const oneDay = pxPerDay(built.loop)
      let last = held
      for (const days of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x + days * oneDay, at.y))
        const now = follower.reads(built.loop)
        expect(
          now,
          `table T-023d (${follower.area}): the picture stopped following at day ${days}`,
        ).toBeGreaterThan(last - oneDay / 2)
        last = now
      }
      expect(last, `${row} never moved at all`).toBeGreaterThan(held)
    })

    it(`carries the drawn ${row} BACK when the pointer comes back`, () => {
      // ⭐ THE HALF A ONE-WAY FOLLOWING PASSES. 「ポインタに追従させて描いて示す」
      // is a picture OF THE POINTER, not a picture that has been nudged: a
      // preview that only ever grows answers the case above and still shows a
      // day the person is no longer pointing at.
      const built = stage()
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      const held = follower.reads(built.loop)
      const travel = TRAVEL_DAYS * pxPerDay(built.loop)
      built.send(pointer('move', at.x + travel, at.y))
      expect(follower.reads(built.loop)).toBeGreaterThan(held)
      built.send(pointer('move', at.x, at.y))
      expect(
        follower.reads(built.loop),
        `table T-023d (${follower.area}): 追従 means the picture is the POINTER's, so it comes back with it`,
      ).toBeCloseTo(held, 6)
    })

    it(`writes nothing to the document while ${row} is held (MUST NOT)`, () => {
      // 「⛔ 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）（`FR-031`）
      // —— 追従は絵であって編集ではない」, and FR-031's own reason: 押してから
      // 離すまでの途中経過を段に刻むと、1 本のバーを動かしただけで履歴が数十段
      // 埋まる.
      const built = stage()
      const before = structuredClone(built.loop.document())
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      expect(
        built.loop.document(),
        `table T-023d (${follower.area}): the press alone wrote to the document`,
      ).toEqual(before)
      const oneDay = pxPerDay(built.loop)
      for (const days of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x + days * oneDay, at.y))
        expect(
          built.loop.document(),
          'table T-023d: 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）（`FR-031`）',
        ).toEqual(before)
      }
    })
  },
)

// ===========================================================================
// (b) GR-12 follows VERTICALLY as well
// ===========================================================================

describe('table T-023d GR-12: the plan bar follows the pointer downwards too', () => {
  /** The point GR-12 is grabbed at -- the same one the following cases use. */
  const grabPoint = (loop: FrameLoop): Point => ({
    x: planBox(loop, PLAIN_UID).x1 - 4 * pxPerDay(loop),
    y: midY(planBox(loop, PLAIN_UID)),
  })

  /** How far down row B stands from row A, as the frame placed the two bands. */
  const downToRowB = (loop: FrameLoop): number => bandOf(loop, ROW_B).y - bandOf(loop, ROW_A).y

  it('carries the drawn bar down with the pointer (MUST)', () => {
    const built = stage()
    const at = grabPoint(built.loop)
    built.send(pointer('down', at.x, at.y))
    const held = midY(planBox(built.loop, PLAIN_UID))
    const down = downToRowB(built.loop)
    expect(down, 'row B stands below row A').toBeGreaterThan(0)
    built.send(pointer('move', at.x, at.y + down))
    expect(
      midY(planBox(built.loop, PLAIN_UID)),
      'table T-023d: `GR-12` は縦にも追従すること（MUST）—— 縦を止めるとどの行へ載るのかが見えない',
    ).toBeGreaterThan(held)
  })

  it('carries it back up when the pointer comes back up', () => {
    const built = stage()
    const at = grabPoint(built.loop)
    built.send(pointer('down', at.x, at.y))
    const held = midY(planBox(built.loop, PLAIN_UID))
    const down = downToRowB(built.loop)
    built.send(pointer('move', at.x, at.y + down))
    expect(midY(planBox(built.loop, PLAIN_UID))).toBeGreaterThan(held)
    built.send(pointer('move', at.x, at.y))
    expect(
      midY(planBox(built.loop, PLAIN_UID)),
      "the vertical picture is the pointer's too, so it comes back with it",
    ).toBeCloseTo(held, 6)
  })

  it('leaves the row membership in the document alone while the button is down (MUST NOT)', () => {
    const built = stage()
    const at = grabPoint(built.loop)
    const before = memberGroupOf(built.loop, PLAIN_UID)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + downToRowB(built.loop)))
    expect(
      memberGroupOf(built.loop, PLAIN_UID),
      'table T-023d: 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）',
    ).toBe(before)
  })
})

// ===========================================================================
// (c) The release settles it -- 表 T-028 の IN-1
// ===========================================================================

describe('table T-028 IN-1: the release settles what the picture was showing', () => {
  /** Grab a point, carry it `TRAVEL_DAYS` to the right, and let go. */
  function dragRight(built: Stage, at: Point): void {
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
  }

  it('GR-3 settles `start` on the release', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, PLAIN_UID).start)
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x0,
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, PLAIN_UID).start) > before,
      'table T-023d GR-3: 予定の開始点 …… `start` を変える。確定は 表 T-028 の `IN-1`',
    ).toBe(true)
  })

  it('GR-4 settles `finish` on the release', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, PLAIN_UID).finish)
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x1,
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, PLAIN_UID).finish) > before,
      'table T-023d GR-4: 予定の終了点 …… `finish` を変える',
    ).toBe(true)
  })

  it('GR-5 settles `actualStart` on the release', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, PLAIN_UID).actualStart)
    dragRight(built, {
      x: actualBox(built.loop, PLAIN_UID).x0,
      y: midY(actualBox(built.loop, PLAIN_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, PLAIN_UID).actualStart) > before,
      'table T-023d GR-5: 実績の開始点 …… `actualStart` を変える',
    ).toBe(true)
  })

  it('GR-6 settles `actualDuration` on the release', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID).actualDuration as number
    dragRight(built, {
      x: actualBox(built.loop, PLAIN_UID).x1,
      y: midY(actualBox(built.loop, PLAIN_UID)),
    })
    expect(
      taskOf(built.loop, PLAIN_UID).actualDuration as number,
      'table T-023d GR-6: 実績の終了点 …… `actualDuration` を変える（置いた日付から稼働日数を算出する）',
    ).toBeGreaterThan(before)
  })

  it("GR-15 settles the milestone's `actualStart` on the release", () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, MILESTONE_UID).actualStart)
    dragRight(built, {
      x: midX(actualBox(built.loop, MILESTONE_UID)),
      y: midY(actualBox(built.loop, MILESTONE_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, MILESTONE_UID).actualStart) > before,
      'table T-023d GR-15: 実績のマイルストーン …… `actualStart` を動かす',
    ).toBe(true)
  })

  it('GR-16 settles `Project.statusDate` on the release', () => {
    const built = stage()
    const before = dayOf(statusDateOf(built.loop))
    const band = bandOf(built.loop, ROW_E)
    dragRight(built, { x: statusLineOf(built.loop).x, y: band.y + band.height / 2 })
    expect(
      dayOf(statusDateOf(built.loop)) > before,
      'table T-023d GR-16: 基準日線 …… 左右に動かして `statusDate` を変える（`FR-046`）',
    ).toBe(true)
  })

  it('GR-12 settles the plan dates on the release, and leaves the actual ones alone (MUST NOT)', () => {
    // FR-011: 「タスクの本体をドラッグしたとき、予定の日付だけをずらし、実績の
    // 日付を変えてはならない（MUST NOT）—— 一度入力された実績は、担当者が置いた
    // 事実である」.
    const built = stage()
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x1 - 4 * pxPerDay(built.loop),
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayOf(after.start) > dayOf(before.start), 'FR-011: 予定の日付だけをずらし').toBe(true)
    expect(dayOf(after.finish) > dayOf(before.finish), 'the whole bar moved, not one end').toBe(true)
    expect(after.actualStart, 'FR-011: 実績の日付を変えてはならない（MUST NOT）').toBe(
      before.actualStart,
    )
    expect(after.actualFinish, 'FR-011: 実績の日付を変えてはならない（MUST NOT）').toBe(
      before.actualFinish,
    )
  })

  it('GR-12 settles the row on a downward release, and moves no date and no WBS parent', () => {
    // FR-011: 「行をまたぐ移動では予定も実績も新しい行へ移るが、どちらの日付も
    // 変わらない（MUST NOT）」, and HM-3 of table T-015a: 「タスクバーを別の行へ
    // 移す操作では WBS を変えてはならない（MUST NOT）—— 行の移動と階層の移動は
    // 別の操作である」.
    const built = stage()
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))
    const at = {
      x: planBox(built.loop, PLAIN_UID).x1 - 4 * pxPerDay(built.loop),
      y: midY(planBox(built.loop, PLAIN_UID)),
    }
    const down = bandOf(built.loop, ROW_B).y - bandOf(built.loop, ROW_A).y
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + down))
    built.send(pointer('up', at.x, at.y + down))
    expect(
      memberGroupOf(built.loop, PLAIN_UID),
      'table T-023d GR-12: 縦に動かしたときの行の載せ替え（表 T-015a の `HM-3`）',
    ).toBe(ROW_B)
    const after = taskOf(built.loop, PLAIN_UID)
    expect(after.start, 'FR-011: どちらの日付も変わらない（MUST NOT）').toBe(before.start)
    expect(after.finish, 'FR-011: どちらの日付も変わらない（MUST NOT）').toBe(before.finish)
    expect(after.actualStart, 'FR-011: どちらの日付も変わらない（MUST NOT）').toBe(
      before.actualStart,
    )
    expect(
      after.wbsParentUid,
      'T-015a HM-3: タスクバーを別の行へ移す操作では WBS を変えてはならない（MUST NOT）',
    ).toBe(before.wbsParentUid)
  })

  it('settles once: moves that come after the release change nothing', () => {
    const built = stage()
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x0,
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    const settled = structuredClone(taskOf(built.loop, PLAIN_UID))
    const oneDay = pxPerDay(built.loop)
    const bar = planBox(built.loop, PLAIN_UID)
    built.send(pointer('move', bar.x0 + 4 * oneDay, midY(bar)))
    built.send(pointer('move', bar.x0 + 8 * oneDay, midY(bar)))
    expect(
      taskOf(built.loop, PLAIN_UID),
      'IN-1: the gesture ended at the release, so a pointer with no button settles nothing',
    ).toEqual(settled)
  })
})

// ===========================================================================
// (c2) The two releases the specification asks for and the tree does not make.
//      ⛔ LEFT RED ON PURPOSE (04-verification.md section 1).
// ===========================================================================

describe('table T-028 IN-1: GR-8 settles the resume date on the release', () => {
  // ⛔ EXPECTED RED, AND NOT TO BE SOFTENED.
  //
  // What the specification says. FR-044 (STATEMENT): 「`Task` が中断している
  // あいだ、`GRS` は、作成者が再開予定日を画面上で置き、置いた後に動かせるように
  // すること」 -- 画面上で, and 動かせる, which is the word table T-023d GR-8
  // uses in its 操作 column too: 「`resume` を変える（`FR-044`）」. The closing
  // rule adds only WHEN it settles: 表 T-028 の `IN-1`, the release.
  //
  // What could carry it. CM-13 of table T-108, `setTaskPlanActualState`
  // -- 「予実の 5 列を置く」 -- and `resume` is one of those five (P-6 of the
  // glossary). So the command vocabulary has a road for this release; nothing
  // in the specification exempts GR-8 from taking it.
  //
  // What the tree does instead: it exempts GR-8 from the release altogether
  // (see the declaration at the head of this file). ⭐ THAT IS AN
  // IMPLEMENTATION GAP, NOT A READING OF THE SPECIFICATION -- the paragraph
  // after the table exempts rows BY NAME, and GR-8 is named in the rule that
  // requires the following, not in the list of the five that do not follow.
  it('moves `resume` to the day the pointer left the icon on', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, SUSPENDED_UID).resume)
    const at = resumePoint(built.loop, SUSPENDED_UID)
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
    expect(
      dayOf(taskOf(built.loop, SUSPENDED_UID).resume) > before,
      'FR-044: 作成者が再開予定日を画面上で置き、置いた後に動かせるようにすること / table T-023d GR-8: `resume` を変える',
    ).toBe(true)
  })

  it('leaves `resumeValid` true, so the suspension does not silently come undone', () => {
    // FR-044 (MUST): 「再開予定日を置いたとき、`resumeValid` を `true` にする
    // こと」, and its reason -- 置かないと表 T-019a の `PS-3` が先に当たり、
    // 日付を置いても状態が変わらない.
    const built = stage()
    const at = resumePoint(built.loop, SUSPENDED_UID)
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
    expect(
      taskOf(built.loop, SUSPENDED_UID).resumeValid,
      'FR-044: 再開予定日を置いたとき、`resumeValid` を `true` にすること（MUST）',
    ).toBe(true)
  })
})

describe('table T-028 IN-1: GR-14 settles the comment box on the release', () => {
  // ⛔ EXPECTED RED, AND NOT TO BE SOFTENED.
  //
  // What the specification says. Table T-023d GR-14's 操作 column reads
  // 「動かす / 大きさを変える」, and the paragraph after the table (MUST NOT)
  // states that every row whose 操作 column says 動かす follows under one of the
  // three closing rules -- naming, as the rows that legitimately do not, only
  // GR-7, GR-13, GR-10, GR-11 and GR-19. GR-14 is in the rule, not the list.
  //
  // What could carry it. CM-50 `setCommentBoxAnchor`（留め先を変える）and CM-51
  // `setCommentBoxBodyOffsetPx`（本文のずれを変える）of table T-108, whose 正
  // column is FR-016 -- the requirement that owns table T-023d itself. FR-019
  // adds 「吹き出しのずれだけは画面上の距離で持ち」, which is what CM-51 holds.
  // So the vocabulary has a road for this release too.
  //
  // ⚠️ ONLY 動かす IS JUDGED HERE. 大きさを変える names 本体・アンカー・四隅 and
  // no table gives the anchor or the corners a size, so a case pressing one
  // would be judged on a rectangle the specification does not fix.
  it('moves the box in the document when the pointer carried its picture', () => {
    const built = stage()
    const before = structuredClone(storedBoxOf(built.loop))
    const body = commentOf(built.loop).body
    const at = { x: body.x + body.width / 2, y: body.y + body.height / 2 }
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
    const after = storedBoxOf(built.loop)
    // Either column may carry it -- the anchor (CM-50) or the offset (CM-51) --
    // so the case asserts the box MOVED and does not choose between the two.
    const moved =
      after.anchorDate !== before.anchorDate ||
      JSON.stringify(after.bodyOffsetPx) !== JSON.stringify(before.bodyOffsetPx)
    expect(
      moved,
      'table T-023d GR-14: コメントボックス …… 動かす。確定は 表 T-028 の `IN-1`（離した時点）',
    ).toBe(true)
  })
})

// ===========================================================================
// (d) A row the closing rule does NOT name draws no such preview
// ===========================================================================

describe('table T-023d GR-7: the progress marker is pressed, not carried', () => {
  // 「⭐ 残る行が追従しないのは、掴んで動かすものではないからである —— `GR-7`
  // （押して状態を巡らせる）」. GR-7 is one of the five the paragraph exempts by
  // name, so nothing about the marker or its Task may follow the pointer.
  it('draws no following picture while the marker is held', () => {
    const built = stage()
    const marker = markerOf(built.loop, SUSPENDED_UID)
    built.send(pointer('down', marker.centre.x, marker.centre.y))
    const held = structuredClone(drawnTask(built.loop, SUSPENDED_UID))
    const oneDay = pxPerDay(built.loop)
    for (const days of [1, 2, 3, 4]) {
      built.send(pointer('move', marker.centre.x + days * oneDay, marker.centre.y))
      expect(
        structuredClone(drawnTask(built.loop, SUSPENDED_UID)),
        'table T-023d: `GR-7`（押して状態を巡らせる）is named among the rows that do not follow',
      ).toEqual(held)
    }
  })

  it('writes nothing to the document while the marker is held either', () => {
    // IN-1 governs GR-7 as it governs the nine: 押した時点で実行せず、離した
    // 時点で確定する. What separates GR-7 is that it draws no preview, not that
    // it settles early.
    const built = stage()
    const before = structuredClone(built.loop.document())
    const marker = markerOf(built.loop, SUSPENDED_UID)
    built.send(pointer('down', marker.centre.x, marker.centre.y))
    built.send(pointer('move', marker.centre.x + 4 * pxPerDay(built.loop), marker.centre.y))
    expect(
      built.loop.document(),
      'table T-028 IN-1: ポインタ操作は押した時点で実行せず、離した時点で確定すること',
    ).toEqual(before)
  })
})

// ===========================================================================
// (e) GR-21 -- the tenth row of the closing rule, DRIVEN through its own surface
// ===========================================================================

/**
 * A lane thick enough to press. ⚠️ `SCREEN` gives the scrollbars no thickness
 * at all, which is why the nine `FOLLOWERS` above never meet one: their figures
 * are all drawn inside the `Row Area`, and GR-21's is drawn inside the lane.
 * ⭐ The number is this fixture's own environment and nothing the manuscript
 * fixes -- `FR-051` settles the thickness from the host, and `S-205` gives only
 * its floor -- so it is stated where it is used and nothing is asserted of it.
 */
const LANE_THICKNESS = 14

/** One more group id, past the five the nine `FOLLOWERS` share. */
const overflowGroupId = (n: number): string => `2a000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/**
 * A document wide and tall enough that GR-21's grip is SHORTER than its lane.
 *
 * ⛔ `fixtureDocument()` DOES NOT OVERFLOW EITHER AXIS, and that is measured
 * rather than assumed: its widest span is `SUSPENDED_UID`'s 24 days, and its
 * five rows fall far short of `SCREEN.height`. That is exactly the shape this
 * block used to measure (`track` and `thumb` identical, `{width:14,
 * height:628}` both) -- and a press on THAT fixture could never tell a
 * working grab from a dead one, because nothing would move either way.
 *
 * ⚠️ A WIDE SPAN ALONE DOES NOT OVERFLOW EITHER, and that is measured too:
 * `viewSettings` (`frame-loop.ts`) opens any document whose `scrollDate` is
 * unplaced by running FR-055's fit (`fitZoom`, PI-5), which picks a `zoomX`
 * that makes the content's width MATCH the `Row Area` almost exactly -- a
 * two-year span came back `pxPerDay=1.34, contentWidth=976.4` against a
 * `Row Area` 976px wide. ⭐ THE FLOOR IS WHAT MAKES A GRIP POSSIBLE: `S-97`
 * (`NOT_STORED_ZOOM_BOUNDS`, `edit-document.ts`) stops that fit at
 * `zoomX = 0.02`, so a span wide enough to ask for less than that -- more than
 * `rowArea.width / (pxPerDayAt1x * 0.02)` days, comfortably past by using
 * thirty years -- is fit at the FLOOR instead and spills over the lane for
 * real. ⛔ The forty extra rows need no such floor: they are flat, so nothing
 * about the fit can collapse them away, and `contentHeight` simply outgrows
 * `SCREEN.height` on its own.
 */
function wideFixtureDocument(): Document {
  const draft = fixtureDocument() as unknown as {
    schedule: {
      tasks: Task[]
      taskGroups: unknown[]
      taskGroupMembers: { taskUid: number; groupId: string; stackOrder: null }[]
    }
  }
  const overflowGroup = overflowGroupId(900)
  draft.schedule.taskGroups.push(group(overflowGroup, 900, 'Overflow'))
  draft.schedule.taskGroupMembers.push({
    taskUid: OVERFLOW_UID,
    groupId: overflowGroup,
    stackOrder: null,
  })
  draft.schedule.tasks.push(
    task({
      uid: OVERFLOW_UID,
      name: 'Overflow',
      start: '2026-04-01T00:00:00',
      finish: '2056-04-01T00:00:00',
    }),
  )
  for (let extra = 0; extra < 40; extra += 1) {
    draft.schedule.taskGroups.push(group(overflowGroupId(901 + extra), 901 + extra, `Filler ${extra}`))
  }
  return draft as unknown as Document
}

interface LaneStage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  /** The last `ScreenView` the loop handed the surface. */
  view(): ScreenView
}

/**
 * The same loop the nine cases drive, wired to a surface that answers where
 * the two lanes are -- because `Scrollbars` is UF-61's `ScreenFrame` and not
 * `FrameValues`, so `current()` cannot answer where the thumb is drawn, and
 * because the surface is the side that DREW them (SC-4 of table T-031), the
 * same bargain `dividerPanel` and `isRowGrabStrip` keep for the two bands this
 * file does not press.
 */
function laneStage(): LaneStage {
  const pen = host()
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (one) => {
      views.push(one)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    // ⭐⭐ A REAL ANSWER, WHERE THE FIXTURE THIS BLOCK USED TO USE ANSWERED
    // `null` EVERYWHERE. `ScreenPart.scrollbarAxis` (`screen-surface.ts`) is
    // GR-21's road in, and the only true answer for a point on one of the two
    // lanes this surface just showed is the axis that lane stands for -- the
    // grip and the band around it alike, because table T-023d itself leaves
    // the band's OWN behaviour undecided and answers only where the point is.
    readScreenPartAt: (x, y): ScreenPart | null => {
      const last = views[views.length - 1]
      if (last === undefined) return null
      const on = last.frame.scrollbars.find(
        (bar) =>
          x >= bar.track.x &&
          x <= bar.track.x + bar.track.width &&
          y >= bar.track.y &&
          y <= bar.track.y + bar.track.height,
      )
      if (on === undefined) return null
      return {
        part: 'Schedule Canvas',
        entry: null,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        scrollbarAxis: on.axis,
      }
    },
  }
  const loop = frameLoop(
    pen.surface as any,
    wideFixtureDocument(),
    { ...SCREEN, scrollbarThickness: LANE_THICKNESS },
    { surface, language: 'en' },
  )
  pen.runAnimationFrames()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    view: () => {
      const last = views[views.length - 1]
      if (last === undefined) throw new Error('the loop showed no screen view')
      return last
    },
  }
}

/** The lane and thumb of one axis, as UF-61 described them this frame. */
function laneOf(built: LaneStage, axis: 'horizontal' | 'vertical') {
  const found = built.view().frame.scrollbars.find((one) => one.axis === axis)
  if (found === undefined) throw new Error(`UF-61 described no ${axis} scrollbar`)
  return found
}

const thumbCentre = (built: LaneStage, axis: 'horizontal' | 'vertical'): Point => {
  const bar = laneOf(built, axis)
  return { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
}

describe('table T-023d GR-21: the schedule follows the pointer while its grip is held', () => {
  // ⭐⭐ THIS BLOCK USED TO PIN A GAP (until 2026-09-07): `laneStage`'s surface
  // answered `null` at every point, so `press.on` was never set, the grab was
  // unreachable in that fixture, and the cases below measured a stub rather
  // than the application -- green there proved nothing about GR-21. ⭐ What
  // closes the gap is read here rather than assumed: `ScreenPart.scrollbarAxis`
  // (`screen-surface.ts`) gives a press on a lane a road in, and
  // `input-command-translator.ts`'s `scrollbarFollow` / `commandFromScrollbar`
  // turn a drag on it into FR-051's change of the display position -- but ONLY
  // where `wideFixtureDocument` makes the content actually overflow the `Row
  // Area`, because `scrollGearing` answers ZERO otherwise (a document that
  // fits has nothing to scroll to). ⛔ NOT AN EXEMPTION FROM THE RULE. The
  // closing rule names GR-21 among the ten and the paragraph after the table
  // exempts it nowhere, so the duty is exactly the one the nine `FOLLOWERS`
  // above are judged on.
  //
  // ⛔⛔ NOT THE DRAWN THUMB'S OWN SHAPE OR POSITION -- those are UF-61's, and
  // `tests/unit/d-298-d-420-gr-21-the-grip-starts-and-follows.test.ts` holds
  // them. ⚠️ WHAT STOOD HERE IS OUT OF DATE AND IS CORRECTED RATHER THAN LEFT
  // (2026-09-08): it said `scrollbarIn` (`screen-frame.ts`) draws
  // `thumb: track`, which stopped being true when DFC-298's length landed on
  // 2026-09-08 and stopped being true of the START on the same day. The press
  // point is still taken from the thumb's own rectangle (`thumbCentre`),
  // which is now a point on the GRIP rather than anywhere on the lane -- and
  // that is the stronger reading, since GR-21 is the grip.
  //
  // ⚠️ AND THE SECOND GAP THIS BLOCK NAMED IS CLOSED (DFC-420, 2026-09-08). What
  // it recorded was true when it was written: `isDocumentChangingPress`
  // (`frame-loop.ts`) answered `true` for a press the surface had claimed with
  // no entry, so AG-9 of table T-035 refused the write `scrollbarFollow` asks
  // for on every move, and only the RELEASE carried one through. ⭐ AG-9's own
  // sentence is what closed it -- 「パンと範囲選択は文書を変えないので拒否しない
  // —— 対象は表 T-027 の取り消し対象行と一致させる」, and UN-8 of that table reads
  // 「ズーム・スクロール・パン」 -- so a lane's drag is among the spared, and the
  // two cases below now measure the live half of the closing rule instead of
  // pinning its absence.

  it('is one of the ten the closing rule names, and no sentence exempts it', () => {
    // ⭐ THE PREMISE OF THE WHOLE BLOCK, read from the manuscript.
    expect(FOLLOWING_ROWS, 'table T-023d: the closing rule names GR-21').toContain(
      MEASURED_NOT_DRIVEN,
    )
    expect(exemptRows(), 'GR-21 is not among the rows the paragraph exempts').not.toContain(
      MEASURED_NOT_DRIVEN,
    )
    expect(
      coveredElsewhereRows(),
      'and not among the rows the other two closing rules cover',
    ).not.toContain(MEASURED_NOT_DRIVEN)
  })

  it('is drawn on both axes, over a document that genuinely overflows the Row Area', () => {
    // 「`U-21` `Scrollbars`」 of table T-031, SC-4 (MUST): both of them, always.
    // ⛔ A PREMISE, NOT A DECORATION. `scrollGearing` answers zero wherever the
    // `Row Area` is not shorter than the content it shows (`input-command-
    // translator.ts`), so without a document that overflows BOTH axes the two
    // cases below would press a grip with nowhere to carry the picture to and
    // could not tell a working grab from a dead one -- which is exactly the
    // shape `fixtureDocument` has (measured 2026-09-07: content and `Row Area`
    // the same size on both axes).
    const built = laneStage()
    expect(built.view().frame.scrollbars.map((one) => one.axis)).toEqual([
      'horizontal',
      'vertical',
    ])
    for (const axis of ['horizontal', 'vertical'] as const) {
      const bar = laneOf(built, axis)
      const length = axis === 'horizontal' ? 'width' : 'height'
      expect(bar.thumb[length], `${axis}: the thumb has no length to press`).toBeGreaterThan(0)
    }
    const frame = frameOf(built.loop)
    const area = (built.loop.current() as any).regions.rowArea as { width: number; height: number }
    expect(
      (frame.layout as any).contentWidth,
      'wideFixtureDocument: the horizontal content must overflow the Row Area',
    ).toBeGreaterThan(area.width)
    expect(
      (frame.layout as any).contentHeight,
      'wideFixtureDocument: the vertical content must overflow the Row Area',
    ).toBeGreaterThan(area.height)
  })

  for (const axis of ['vertical', 'horizontal'] as const) {
    it(`follows the pointer through the ${axis} drag, while it is held`, () => {
      // ⭐⭐ THIS CASE WAS THE PIN, AND THE PIN WENT OFF (DFC-420, 2026-09-08). It
      // asserted the reading did NOT move and carried its own instruction for
      // the day it stopped holding -- 「this pin is out of date」 -- so it is
      // FLIPPED here rather than deleted: the same fixture, the same reading,
      // the opposite expectation, which is the closing rule of table T-023d
      // measured instead of pinned.
      // ⚠️ Reads `frameOf(loop)`, the same picture the nine `FOLLOWERS` read
      // theirs off, never `document()` -- this is asking about the PICTURE.
      const built = laneStage()
      const at = thumbCentre(built, axis)
      // ⚠️ `OVERFLOW_UID`, NOT `PLAIN_UID`. At the floor zoom this fixture's
      // 30-year span forces, `PLAIN_UID`'s 18-day plan bar is too thin a
      // fraction of the picture for the layout to place at all -- measured:
      // its entry is simply absent from `geometry.tasks` at this scale, where
      // `OVERFLOW_UID`'s bar (spanning the whole thirty years) always is.
      const heldReading = (): number =>
        axis === 'vertical' ? bandOf(built.loop, ROW_A).y : planBox(built.loop, OVERFLOW_UID).x0
      built.send(pointer('down', at.x, at.y))
      const held = heldReading()
      built.send(pointer('move', at.x + (axis === 'vertical' ? 0 : 120), at.y + (axis === 'vertical' ? 120 : 0)))
      expect(
        heldReading(),
        `table T-023d GR-21: the ${axis} drag drew nothing new while it was held`,
      ).not.toBe(held)
    })
  }

  for (const axis of ['horizontal', 'vertical'] as const) {
    it(`settles the ${axis} display position on the release (table T-028 IN-1)`, () => {
      // 「確定は 表 T-028 の `IN-1` に従う（離した時点）」, and the value a
      // settled GR-21 moves is the display position the document keeps (`S-77`
      // / `S-78` of table T-203, `setScrollPosition` CM-66 of table T-108).
      const built = laneStage()
      const before = built.loop.document().documentSettings
      const at = thumbCentre(built, axis)
      const to = axis === 'vertical' ? { x: at.x, y: at.y + 120 } : { x: at.x + 120, y: at.y }
      built.send(pointer('down', at.x, at.y))
      built.send(pointer('move', to.x, to.y))
      built.send(pointer('up', to.x, to.y))
      const after = built.loop.document().documentSettings
      expect(
        axis === 'vertical' ? after.scrollGroupId : after.scrollDate,
        `table T-023d GR-21: 掴めば表示位置を変える（規則は FR-051） -- the ${axis} release settled nothing`,
      ).not.toBe(axis === 'vertical' ? before.scrollGroupId : before.scrollDate)
    })
  }
})
