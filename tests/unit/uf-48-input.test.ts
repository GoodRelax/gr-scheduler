// Unit tests for the TWO members UF-48 `frame-loop.ts` grew for FT-1 of table
// T-078 (docs/spec/05-07-design.md) -- `isBrowserDefaultStopped(input)` and
// `receiveInput(input)`. UF-48 is `SingleHtmlShell` (CP-25 of table T-062),
// and `DomInputSource` (CP-27) is what hands it a happening over IF-2 of
// table T-065.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// What was read of `frame-loop.ts`: its head comment, its four exported
// declarations (`FrameEnvironment`, `FrameValues`, `FrameLoop`, `ScreenWiring`)
// and the one signature
// `frameLoop(surface, first, env, screen?): FrameLoop`. No function body was
// read, and `single-html-shell.ts` was not opened at all. Everything expected
// below comes from a requirement, a table row, or a seam's own declaration --
// never from what the code happens to do.
//
// ⭐ WHERE THE VALUES COME FROM. 04-verification.md §2 asks that a test of a
// value the manuscript owns fail when the manuscript's value changes SHAPE, so
// nothing that the specification decides is typed here as a literal:
//   - the word ED-1 of table T-229 signs a screen write with is read out of
//     docs/spec at read time through `specTable('T-229')`
//   - every assignment of table T-036 these cases drive is checked against the
//     manuscript's own 割当 column by the last describe in this file
//   - the local calendar day FR-046 asks for is computed from the frozen clock
//     by the test's own timezone, not written down as text
// ⚠️ THE ONE THING THAT COULD NOT BE READ FROM A GENERATED CONSTANT is ED-1's
// word: `settings.json` is generated into `src/` but table T-229 is not, so the
// only machine-checked copy available to a test is the manuscript itself.
//
// ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
// node (vitest.config.ts) with no DOM and no `requestAnimationFrame`, and LY-5
// of table T-060 puts the browser in this layer while R7.3 asks for it to be
// handed in. So each case installs its own animation-frame queue and drives the
// loop by hand: a frame runs when this file says it runs and never otherwise.
// ⛔ The fake surface decides nothing about input. `readScreenPartAt` answers
// what the case has told it to answer -- which is the side that DREW the entry
// answering, exactly as Chapter 5.3 requires under table T-065 -- and no rule
// about presses, levels or writes lives in it.
//
// The rules these cases answer to:
//   表 T-078 FT-1   「人の入力（ポインタとキー）」 is a trigger of a frame, and
//                   `DomInputSource` (CP-27) hands it over on IF-2. The MUST NOT
//                   under the table -- 「本表に無い契機でフレームを起こしては
//                   ならない」 -- is what NFR-010 comes to concretely
//   NFR-010         「利用者が操作していない間、`GRS` は、画面を描き直さない
//                   こと」
//   NFR-011         「空白のまま残る画面も、内容が欠けたまま出る画面も出さない
//                   こと（MUST NOT）」, whose RATIONALE names the two events it
//                   answers, one of them 「寸法が確定する前の 1 フレームで 0×0
//                   の窓が出ること」
//   表 T-077 BO-1   「画面の寸法を確定させ ... 寸法が確定するまで 1 枚も描か
//                   ない」, with the MUST under the table: 「上から順に通すこと
//                   （MUST）。前の段が済む前に次の段へ進んではならない」
//   表 T-023 MK-10  「本ツールが割り当てた修飾キーの付いた入力 ... ブラウザの
//                   既定動作を画面全体で止めること（MUST）。割り当てていない
//                   組合せを止めてはならない（MUST NOT）」, which names
//                   `Ctrl+P` and `Ctrl+F` as two it must not take
//   表 T-036        the whole roster of shortcut assignments; the row says so
//                   itself: 「本表がショートカットキーの割当の全数である」
//   表 T-023d GR-19 「`Command Palette` の掴み帯 ... 掴めばパレットを動かす
//                   （`FR-053`）」 -- the FIRST row of that table, under the
//                   preamble 「上の行ほど優先すること（MUST）」
//   FR-053          「作成者がドラッグで動かせるようにすること」 (MUST), whose
//                   corner no row of 表 T-203 or 表 T-206 holds -- so LY-5 of
//                   表 T-060 leaves this loop as the only layer that may keep it
//   表 T-109 IC-53  「掴んで動かせることを示す。**ボタンではない**」 -- the row
//                   a press on the band arrives as, and never an entry
//   表 T-023 MK-7   「パンは等倍とすること（MUST）」 -- the shape the palette's
//                   travel takes too: what the pointer went, not scaled
//   表 T-028 IN-1   「ポインタ操作は押した時点で実行せず、離した時点で確定
//                   すること」
//   表 T-028 IN-1a  「ボタンを離す前に窓の外でポインタが失われたときは、
//                   ドラッグを中断として終わらせること（MUST）」, with the
//                   reason: otherwise 「ドラッグ中」 never lifts and AG-9
//                   refuses every later write
//   表 T-028 IN-4   「`Esc` は閉じる対象または取り消す対象があるときだけ
//                   1 階層ぶん消費し、無ければブラウザへ渡すこと。消費する階層
//                   は 開いている面 → 進行中のドラッグ・引きかけの矢印 → 構え
//                   → `Dual Cursor` モード の順とすること（MUST）」
//   表 T-028 IN-4a  「消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと
//                   （MUST）」
//   表 T-066 CS-1   the frozen copy and the screen's size are collected once, at
//                   the head of the frame
//   表 T-066 CS-2   「身振り 1 回（掴む）| 身振りを始めた時点の文書 | ポインタ
//                   を押した時点」 -- what a gesture is about is fixed at the
//                   press, not at the release
//   表 T-071 CA-2   the frame's three values are rebuilt at the head of a frame
//                   and 「そのフレームのあいだは作り直さない」
//   FR-046          「基準日線を出す操作は、その時点の本日を `statusDate` に
//                   書くこととすること（MUST）... ここでいう本日は、読む人の機
//                   のローカルの暦の日とすること（MUST）。UTC の暦の日を用いて
//                   はならない（MUST NOT）」
//   FR-048          「ポインタに追従する線が 1 本も無く、ほかに描く内容も
//                   変わらないとき、ポインタの移動で描き直してはならない
//                   （MUST NOT）」
//   FR-063          「刻はいずれも `ISO 8601`・UTC・秒までとすること（MUST）
//                   ... 見せ方の群だけを変える更新で、日程データの群の刻を
//                   動かしてはならない（MUST NOT）... どちらの群であれ動いた刻
//                   と、最後に書いた者は、見せ方の群だけを変えたときも更新する
//                   こと（MUST）」
//   表 T-229 ED-1   the word a write made from the screen signs itself with
//   表 T-035 AG-9   a person mid-gesture is the state that refuses a write, and
//                   `WriteMoment.gestureInFlight` is where it reaches WS-2
//   表 T-067 WS-5   what moves which instant, and WS-6 / WS-7 the order
//
// ⛔ THREE CASES ARE LEFT RED ON PURPOSE. 04-verification.md §1 forbids bending
// an expectation to the code, and each of the three quotes a MUST or a MUST NOT
// it is holding:
//   1. FR-048's MUST NOT -- a bare pointer move over the time ruler, with no
//      line following the pointer and nothing else changing, still wakes a
//      frame. NFR-010's RATIONALE is the cost: 「ポインタを動かしているだけで
//      毎秒 60 回描き続ける」.
//   2. IN-4's second level -- 「進行中のドラッグ・引きかけの矢印」 -- is never
//      consumed. `Esc` takes the open surface (level 1 passes) but leaves the
//      press in flight for ever.
//   3. and so IN-4a's MUST can never be reached once a button has gone down:
//      `Esc` never returns to the browser, and AG-9 of table T-035 goes on
//      refusing every write -- which is the very thing IN-1a exists to prevent.
// ⭐ Case 2 is UF-48's alone: `screenStateFromInput` records in its own body
// that it cannot consume that level, because a drag in flight is a current
// value only the Framework may hold (LY-5 of table T-060).
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because nothing in docs/spec decides it:
//   - HOW FAR a body drag moves a bar in days for a given pixel distance. FR-011
//     and GR-12 fix that the plan moves sideways by whole days; no row fixes the
//     rounding of a partial day, so the cases below assert the DIRECTION and the
//     Task, never the count.
//   - which of the two remaining Esc levels (構え, `Dual Cursor`) a press takes
//     when both stand. IN-4 fixes the order, and the two cases below drive the
//     two levels this loop can be put into from outside it.
//   - whether a `lost` happening is itself a frame trigger. FT-1 names 「人の
//     入力（ポインタとキー）」 without dividing the phases, and IN-1a states
//     only what must become of the drag.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
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
import { dayOf, type CalendarDay, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

// ---------------------------------------------------------------------------
// What the manuscript says, read at read time rather than copied
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/**
 * ED-1 of table T-229 -- 「画面を操作する人」の書く語.
 *
 * ⭐ Read out of docs/spec rather than typed, so that re-deciding that row
 * fails this file instead of leaving a stale literal behind. ⚠️ There is no
 * generated constant to read instead: `settings.json` reaches `src/` through
 * `npm run gen`, but table T-229 does not.
 */
const ED_1_WORD = bare(rowOf('T-229', 'ED-1').by['書く語'] ?? '')

/**
 * 表 T-103 U-26 -- the settled name IF-9 answers the floating palette by.
 *
 * ⭐ Read out of the table for the same reason ED-1's word is: W-4 of 表 T-006a
 * makes a settled name the join, and a spelling typed here would go stale in
 * silence if the row were re-worded.
 */
const U_26_PART = bare(rowOf('T-103', 'U-26').by['確定名（英）'] ?? '')

/**
 * 表 T-109's row for the palette's grab band -- what the surface answers for a
 * point on the band GR-19 of 表 T-023d lays along the palette's top edge.
 *
 * ⛔ A ROW ID AND NOT A BUTTON. 表 T-109 says of it 「掴んで動かせることを示す。
 * **ボタンではない**」, so a press on it does not run an entry: it begins the
 * drag FR-053 (MUST) requires. The last describe in this file holds the row to
 * the table.
 */
const T_109_GRAB_BAND = 'IC-53'

/** `Ctrl` ＋ `Shift` ＋ `D` and `Ctrl+Shift+D` are the same assignment. */
const sameSpelling = (cell: string): string =>
  cell.replace(/`/g, '').replace(/＋/g, '+').replace(/\s+/g, '')

// ---------------------------------------------------------------------------
// The document these cases drive
// ---------------------------------------------------------------------------

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of, and the one
// document whose values the specification has actually decided. The calendar,
// the project and the settings come from it; the rows and the Tasks are written
// out here so that what is drawn can be named row by row.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Two rows, one Task on each, and NO base date line.
 *
 * ⛔ `statusDate: null` is a premise, not decoration. SK-20 of table T-036 is
 * 「基準日線を出す / 消す」 and FR-046 splits the two halves on exactly that
 * value, so a document that already carried a status date would drive the
 * CLEARING half and never the writing of today the cases below are about. The
 * case at the head of this file pins it.
 *
 * Every column table T-058 gives a Task is named, so that a template whose
 * first Task changes shape cannot silently give these rows an actual bar --
 * `validateDocument` keeps the shape honest, and PS-1 of table T-019a (a Task
 * nobody has started) is what these cases mean by a Task.
 */
function twoRowDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string): Task => ({
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
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  })
  const row = (id: string, parentId: string | null, label: string) => ({
    id,
    parentId,
    label,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
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
      tasks: [
        task(1, '2026-04-01', '2026-04-10', 'One'),
        task(2, '2026-05-06', '2026-05-20', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, groupId: ALPHA, stackOrder: null },
        { taskUid: 2, groupId: BETA, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const projectOf = (document: Document): any => (document as any).schedule.project
const stampOf = (document: Document): any => (document as any).documentStamp
const taskOf = (document: Document, uid: number): any =>
  (document as any).schedule.tasks.find((one: any) => one.uid === uid)

// ---------------------------------------------------------------------------
// The host UF-48 is given
// ---------------------------------------------------------------------------

/**
 * BO-1 has already settled these by the time a frame loop exists. FR-051 keeps
 * the last two out of the settings because they differ from one machine to the
 * next.
 */
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * The window NFR-011's RATIONALE names: 「寸法が確定する前の 1 フレームで 0×0 の
 * 窓が出ること」. BO-1 has not been through when the host reports this.
 */
const UNSETTLED_SCREEN: FrameEnvironment = {
  width: 0,
  height: 0,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

interface Host {
  /** Every SVG the loop has put on the surface, oldest first. */
  readonly drawn: string[]
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks for no more. */
  runAnimationFrames(): void
  frames(): number
}

const realRaf = (globalThis as any).requestAnimationFrame
const realTz = process.env.TZ

function host(): Host {
  const drawn: string[] = []
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    drawn,
    surface: {
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
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
    frames: () => drawn.length,
  }
}

interface ScreenPane {
  readonly views: ScreenView[]
  readonly wiring: ScreenWiring
  /** What `readScreenPartAt` answers from now on. The case decides; the fake does not. */
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
  screens(): number
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readScreenPartAt: () => part,
  }
  return {
    views,
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    screens: () => views.length,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
  if (realTz === undefined) delete process.env.TZ
  else process.env.TZ = realTz
  vi.useRealTimers()
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
  options: {
    readonly button?: PointerButton
    readonly modifiers?: Partial<InputModifiers>
    readonly clickCount?: number
  } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS, ...(options.modifiers ?? {}) },
  clickCount: options.clickCount ?? 1,
})

/**
 * The rows of table T-036 these cases drive, each with the happening that
 * carries its assignment.
 *
 * ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
 * be driven by a fixed copy of that table, and the last describe in this file
 * checks every spelling below against the manuscript's own 割当 column.
 *
 * ⛔ NOT the whole of table T-036. SK-1 / SK-1a record a route that does not
 * exist and have no assignment at all; SK-8 (`Esc`) and SK-19 (`Enter`) are
 * assigned only while there is something to consume or something being typed,
 * and both of those conditions are driven by cases of their own below.
 */
const T_036_DRIVEN = [
  { row: 'SK-2', spelt: 'Ctrl+A', input: () => key('A', { ctrl: true }) },
  { row: 'SK-3', spelt: 'Delete', input: () => key('Delete') },
  { row: 'SK-4', spelt: 'Ctrl+C', input: () => key('C', { ctrl: true }) },
  { row: 'SK-5', spelt: 'Ctrl+V', input: () => key('V', { ctrl: true }) },
  { row: 'SK-6', spelt: 'Ctrl+Z', input: () => key('Z', { ctrl: true }) },
  { row: 'SK-7', spelt: 'Ctrl+Y', input: () => key('Y', { ctrl: true }) },
  { row: 'SK-9', spelt: 'F2', input: () => key('F2') },
  { row: 'SK-10', spelt: 'Ctrl+O', input: () => key('O', { ctrl: true }) },
  { row: 'SK-11', spelt: 'Ctrl+S', input: () => key('S', { ctrl: true }) },
  { row: 'SK-12', spelt: 'Ctrl+Shift+E', input: () => key('E', { ctrl: true, shift: true }) },
  { row: 'SK-13', spelt: 'F1', input: () => key('F1') },
  { row: 'SK-14', spelt: 'P', input: () => key('P') },
  { row: 'SK-15', spelt: 'F11', input: () => key('F11') },
  { row: 'SK-16', spelt: 'Shift++', input: () => key('+', { shift: true }) },
  { row: 'SK-16a', spelt: 'Alt++', input: () => key('+', { alt: true }) },
  { row: 'SK-17', spelt: 'Ctrl+0', input: () => key('0', { ctrl: true }) },
  { row: 'SK-18', spelt: 'F', input: () => key('F') },
  { row: 'SK-20', spelt: 'Ctrl+Shift+D', input: () => key('D', { ctrl: true, shift: true }) },
] as const

/**
 * Combinations MK-10's own sentence names as ones this tool must NOT take, plus
 * the button table T-023 gives no row at all.
 */
const NOT_ASSIGNED = [
  { why: 'MK-10 names it: `Ctrl+P`（印刷）', input: () => key('P', { ctrl: true }) },
  { why: 'MK-10 names it: `Ctrl+F`（検索）', input: () => key('F', { ctrl: true }) },
  {
    why: 'table T-023 gives the right button no row, so the context menu stays the browser’s',
    input: () => pointer('down', 500, 400, { button: 'right' }),
  },
] as const

/** The centre of a Task's plan bar, in the frame of reference a press speaks in. */
function planCentre(loop: ReturnType<typeof frameLoop>, uid: number): { x: number; y: number } {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${uid} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to grab`)
  }
  const xs = drawn.plan.points.map((p) => p.x)
  const ys = drawn.plan.points.map((p) => p.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/** How wide that bar is, so a drag can be stated in bar-widths and not in days. */
function planWidth(loop: ReturnType<typeof frameLoop>, uid: number): number {
  const values = loop.current()!
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)!
  if (drawn.plan === null || drawn.plan.form !== 'outline') throw new Error('no bar body')
  const xs = drawn.plan.points.map((p) => p.x)
  return Math.max(...xs) - Math.min(...xs)
}

const dayText = (value: string | null): CalendarDay | null => dayOf(value)

// ===========================================================================

describe('the document these cases drive', () => {
  it('is a valid GRS JSON document', () => {
    const report = validateDocument(twoRowDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('carries no base date line, so SK-20 drives the writing half of FR-046', () => {
    // ⛔ A premise. FR-046 makes 「基準日線を出す操作」 the one that writes
    // today, and SK-20 chooses between showing and hiding by whether
    // `statusDate` holds anything. CU-1 of table T-029: 「`statusDate` が
    // `null` のときは描かない」.
    expect(projectOf(twoRowDocument()).statusDate).toBeNull()
  })
})

describe('BO-1 of table T-077 -- nothing goes up until the size is settled', () => {
  it('BO-1: a 0x0 window draws no first frame at all', () => {
    // BO-1: 「画面の寸法を確定させ、`ScreenRegions`（`CP-35`）を求める。寸法が
    // 確定するまで 1 枚も描かない」. NFR-011's RATIONALE names this very window:
    // 「寸法が確定する前の 1 フレームで 0×0 の窓が出ること」.
    const pane = host()

    frameLoop(pane.surface, twoRowDocument(), UNSETTLED_SCREEN)
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(0)
  })

  it('BO-1 (MUST NOT): a happening that arrives before BO-1 is through draws nothing either', () => {
    // 「上から順に通すこと（MUST）。前の段が済む前に次の段へ進んではならない
    // （MUST NOT）」. FT-1 owes a frame, but BO-5 has not run, and NFR-011
    // forbids the picture that would go up: 「内容が欠けたまま出る画面も出さない
    // こと（MUST NOT）」.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), UNSETTLED_SCREEN)

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(0)
  })

  it('NFR-011: once the size is settled the first frame goes up, and it goes up whole', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), UNSETTLED_SCREEN)

    loop.receiveInput(key('P'))
    loop.resize(SCREEN)
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(1)
    expect(pane.drawn[0]).toContain(`width="${SCREEN.width}"`)
    expect(loop.current()!.regions.scheduleCanvas.width).toBe(SCREEN.width)
  })
})

describe("FT-1 of table T-078 -- a person's input is what owes a frame", () => {
  it('FT-1: an input table T-036 assigns runs exactly one more frame', () => {
    // FT-1: 「人の入力（ポインタとキー）| `DomInputSource`（`CP-27`）が 表 T-065
    // の `IF-2` で渡す」. CA-2 of table T-071 makes it ONE frame: the three
    // values are rebuilt at the head of a frame and not again inside it.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
  })

  it('NFR-010: asking MK-10 is not a trigger -- isBrowserDefaultStopped draws nothing', () => {
    // 「本表に無い契機でフレームを起こしてはならない（MUST NOT）」 -- and the
    // MK-10 question is not a row of table T-078. UF-48's own declaration says
    // the same of it: asked BEFORE the watcher hears the happening, so it must
    // change nothing.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    for (let turn = 0; turn < 5; turn += 1) {
      loop.isBrowserDefaultStopped(key('P'))
      loop.isBrowserDefaultStopped(pointer('down', 500, 400))
      pane.runAnimationFrames()
    }

    expect(pane.frames()).toBe(before)
  })

  it('FR-048 (MUST NOT): a bare pointer move with no line following it draws nothing', () => {
    // FR-048: 「ポインタに追従する線が 1 本も無く、ほかに描く内容も変わらない
    // とき、ポインタの移動で描き直してはならない（MUST NOT）」. The document
    // this file drives has `guideCursorMode: "none"` and `dualCursor: null`, so
    // nothing follows the pointer, and no button is down.
    //
    // ⭐ THE MOVE IS OVER THE TIME RULER, deliberately, so that not one of the
    // four things FR-048 exempts can be in play. Its note admits 「ポインタが
    // 乗ったことで濃さが変わる UI パーツと、待ち時間で出る説明」 -- HF-6's row
    // controls, FR-053's palette, FR-043's grab slop and FR-013's marker, and
    // EZ-2's icon hint. None of them is drawn on the ruler, which the note under
    // table T-023a leaves without pointer operations at all: 「タイムルーラー |
    // ポインタ操作を持たない（MUST NOT）」. ⚠️ No `ScreenWiring` is given here,
    // so no UI part outside the schedule is drawn either.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const ruler = loop.current()!.regions.timeRuler
    const before = pane.frames()

    loop.receiveInput(pointer('move', ruler.x + 10, ruler.y + 2))
    loop.receiveInput(pointer('move', ruler.x + 40, ruler.y + 4))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before)
  })
})

describe('MK-10 of table T-023 -- the browser is stopped for what this tool assigned', () => {
  it('MK-10 (MUST): every assignment of table T-036 this file drives answers true', () => {
    // 「本ツールが割り当てた修飾キーの付いた入力 | ブラウザの既定動作を画面
    // 全体で止めること（MUST）」. ⚠️ True says ASSIGNED, not "something
    // happened": SK-2's whole effect is a selection and it is still assigned.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    for (const row of T_036_DRIVEN) {
      expect(
        loop.isBrowserDefaultStopped(row.input()),
        `${row.row} (${row.spelt}) of table T-036 is an assignment, so MK-10 requires the browser default to be stopped`,
      ).toBe(true)
    }
  })

  it("MK-10 (MUST NOT): a combination this tool assigns nothing keeps the browser's own", () => {
    // 「割り当てていない組合せを止めてはならない（MUST NOT）」 —— 「`Ctrl+P`
    // （印刷）や `Ctrl+F`（検索）まで奪うと、ブラウザの機能が使えなくなる」.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    for (const one of NOT_ASSIGNED) {
      expect(loop.isBrowserDefaultStopped(one.input()), one.why).toBe(false)
    }
  })

  it('IN-4a (MUST): `Esc` with nothing to consume reaches the browser', () => {
    // IN-4a: 「消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）」
    // —— 全画面表示から `Esc` で戻る経路（`FR-071`）はブラウザ側の挙動なので、
    // 渡さないと戻れなくなる. Nothing is open, nothing is armed, no drag.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(false)
  })

  it('⛔ asking MK-10 changes nothing: the same question twice gets the same answer', () => {
    // UF-48's own declaration of the member: asked BEFORE the watcher hears the
    // happening, so it must change nothing -- 「IN-4a would read a screen that
    // had already moved on」. If the first ask consumed IN-4's first level, the
    // second would answer false.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    loop.receiveInput(key('F1'))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
  })
})

describe('IN-4 of table T-028 -- Esc consumes one level per press', () => {
  it('the loop KEEPS what screenStateFromInput returned: F1 leaves a surface open', () => {
    // SK-13 opens the help surface, and S-99g holds which one is open. UF-30 is
    // `pure` (table T-075), so it can remember nothing between two happenings;
    // LY-5 of table T-060 leaves this loop as the only layer that may hold the
    // value it answered with.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    loop.receiveInput(key('F1'))
    pane.runAnimationFrames()

    expect(screen.last().openModal).not.toBeNull()
  })

  it('IN-4 (MUST): the first Esc takes the open surface and leaves the drag in flight', () => {
    // 「消費する階層は 開いている面 → 進行中のドラッグ・引きかけの矢印 → 構え
    // → `Dual Cursor` モード の順とすること（MUST）」 -- one level per press.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const centre = planCentre(loop, 1)

    loop.receiveInput(key('F1'))
    loop.receiveInput(pointer('down', centre.x, centre.y))
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)

    loop.receiveInput(key('Esc'))
    pane.runAnimationFrames()

    // Level 1 is gone ...
    expect(screen.last().openModal).toBeNull()
    // ... and level 2 has NOT been taken with it, so the key is still assigned.
    expect(
      loop.isBrowserDefaultStopped(key('Esc')),
      'IN-4 consumes one level per press, so the drag begun before the first Esc must still be in flight',
    ).toBe(true)
  })

  it('IN-4a (MUST): the surface alone is one level -- the Esc after it goes to the browser', () => {
    // The first level of IN-4 on its own, so that a failure of the ladder below
    // says WHICH level was not consumed rather than only that one was not.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    loop.receiveInput(key('F1'))
    loop.receiveInput(key('Esc'))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(false)
  })

  it('IN-4 (MUST): the drag alone is one level -- the Esc after it goes to the browser', () => {
    // The second level of IN-4 -- 「進行中のドラッグ・引きかけの矢印」 -- on its
    // own. ⛔ `screenStateFromInput` cannot consume this one: the level is a
    // current value only the Framework holds (LY-5), which is why
    // `EscapeContext` exists at all. So the dropping of the press is UF-48's.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)

    loop.receiveInput(key('Esc'))

    expect(
      loop.isBrowserDefaultStopped(key('Esc')),
      'IN-4 gives the drag in flight its own level, so the Esc that took it leaves nothing behind',
    ).toBe(false)
  })

  it('IN-4a (MUST): with the surface and the drag both consumed the next Esc goes to the browser', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const centre = planCentre(loop, 1)

    loop.receiveInput(key('F1'))
    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(key('Esc'))
    loop.receiveInput(key('Esc'))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(false)
  })

  it('SK-14: `P` hides the palette and a second `P` brings it back', () => {
    // S-99e is held by this loop and by nothing else (LY-5), so a second press
    // can only undo the first if what the first answered was kept. `ScreenView`
    // carries the palette as `null` while S-99e says it is hidden.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    expect(screen.last().commandPalette).not.toBeNull()

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()
    expect(screen.last().commandPalette).toBeNull()

    loop.receiveInput(key('P'))
    pane.runAnimationFrames()
    expect(screen.last().commandPalette).not.toBeNull()
  })
})

describe('CS-2 of table T-066 -- the gesture is about the press, not about the release', () => {
  it('CS-2: the release is decided from what the surface had drawn AT THE PRESS', () => {
    // CS-2: 「身振り 1 回（掴む）| 身振りを始めた時点の文書 | ポインタを押した
    // 時点」, and IN-1 settles the operation on the release. So the press is
    // read once, kept, and read again at the release -- 「途中の状態へ他者が
    // 書き込み、離した瞬間に人の操作がそれを上書きする」 is what the row says
    // breaking it costs. FR-053 has the person drag the palette away, so what
    // the surface answers a frame later is not what the gesture is about.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    // IC-7 -- the entry FR-053 gives S-99e, which SK-14 shares.
    screen.drawAt({ part: 'App Header', entry: 'IC-7', format: null, rowGroupId: null, resourceUid: null })
    loop.receiveInput(pointer('down', 500, 20))
    // The surface is redrawn and no longer has that entry under the pointer.
    screen.drawAt(null)
    loop.receiveInput(pointer('move', 520, 24))
    loop.receiveInput(pointer('up', 520, 24))
    pane.runAnimationFrames()

    expect(
      screen.last().commandPalette,
      'the press landed on IC-7, so CS-2 makes the release that entry’s however the surface has been redrawn since',
    ).toBeNull()
  })

  it('CS-2: a press the surface answered nothing for stays that way, though it draws one later', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    screen.drawAt(null)
    loop.receiveInput(pointer('down', 500, 20))
    screen.drawAt({ part: 'App Header', entry: 'IC-7', format: null, rowGroupId: null, resourceUid: null })
    loop.receiveInput(pointer('move', 520, 24))
    loop.receiveInput(pointer('up', 520, 24))
    pane.runAnimationFrames()

    expect(
      screen.last().commandPalette,
      'the press landed on nothing, so an entry drawn there afterwards cannot claim the release',
    ).not.toBeNull()
  })

  it('CS-2: a body drag writes the Task that was under the PRESS', () => {
    // GR-12 of table T-023d: 「予定バー本体 | 端点を除いた中間 | 予定の平行移動
    // （`FR-011`）」. The release lands where no bar of Task 1 is any longer, so
    // a loop that resolved the hit at the release would have nothing to move.
    // ⚠️ Only the direction is asserted: no row fixes how a partial day rounds.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)
    const width = planWidth(loop, 1)
    const before = loop.document()

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(pointer('move', centre.x + width, centre.y))
    loop.receiveInput(pointer('up', centre.x + width, centre.y))
    pane.runAnimationFrames()

    const after = loop.document()
    expect(dayText(taskOf(after, 1).start)!.day).not.toBe(dayText(taskOf(before, 1).start)!.day)
    expect(taskOf(after, 1).start > taskOf(before, 1).start).toBe(true)
    expect(
      taskOf(after, 2).start,
      'the press was on Task 1, so no other Task may have been carried by it',
    ).toBe(taskOf(before, 2).start)
  })
})

describe('IN-1a of table T-028 -- a lost pointer ends the gesture as an abort', () => {
  it('IN-1a (MUST): the abort writes nothing', () => {
    // 「ボタンを離す前に窓の外でポインタが失われたときは、ドラッグを中断として
    // 終わらせること（MUST）」. IN-1 already settles a pointer operation on the
    // release, and 中断 is not a release -- so the same drag that writes above
    // writes nothing here. WS-6 replaces one reference, so an untouched
    // document is the same value.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)
    const width = planWidth(loop, 1)
    const before = loop.document()

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(pointer('move', centre.x + width, centre.y))
    loop.receiveInput(pointer('lost', centre.x + width, centre.y))
    pane.runAnimationFrames()

    expect(loop.document()).toBe(before)
    expect(stampOf(loop.document())).toEqual(stampOf(before))
  })

  it('IN-1a (MUST): the press is dropped, so AG-9 stops refusing every later write', () => {
    // The row states the consequence itself: 「終わらせないと『ドラッグ中』が
    // 解けず、`Agent API` の書き込みが以後ずっと拒否される（表 T-035 の AG-9）」.
    // IN-4's second level is 「進行中のドラッグ」, so an Esc that still finds
    // one to consume is a drag that never ended.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)

    loop.receiveInput(pointer('lost', centre.x, centre.y))

    expect(
      loop.isBrowserDefaultStopped(key('Esc')),
      'after IN-1a there is no drag left for IN-4 to consume, so IN-4a hands the key to the browser',
    ).toBe(false)
  })

  it('IN-1 (MUST NOT): leaving the drawing area is NOT a lost pointer', () => {
    // 「ポインタが描画領域の外へ出たことを中断としてはならない（MUST NOT）」 ——
    // 画面の端まで囲む範囲選択も、表示範囲の外まで伸ばす作成ドラッグも正常な
    // 操作である. A `move` far outside the window keeps the gesture, which is
    // IN-4's second level answering.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(pointer('move', -400, -400))

    expect(loop.isBrowserDefaultStopped(key('Esc'))).toBe(true)
  })
})

describe('GR-19 of table T-023d -- a drag on the band moves the `Command Palette`', () => {
  // ⭐ FR-053 (MUST): 「作成者がドラッグで動かせるようにすること」, and GR-19 is
  // where that drag is grabbed. ⛔ THE PLACE IS THIS LOOP'S AND NOBODY ELSE'S:
  // no row of 表 T-203 or 表 T-206 holds the palette's corner, so LY-5 of 表
  // T-060 leaves the Framework as the only layer that may keep it -- which is
  // why these cases read the corner back off the description the surface was
  // given rather than off any document.
  //
  // ⚠️ A DISTANCE AND NOT A PLACE. A press may begin anywhere on the band, so a
  // corner that jumped to where the finger let go would move the palette by an
  // amount nobody asked for. MK-7 states the shape of it for the pan: 「パンは
  // 等倍とすること（MUST）」.

  /** Where the palette floats now, as the surface was last told. */
  function paletteCorner(screen: ScreenPane): { readonly x: number; readonly y: number } {
    const palette = screen.last().commandPalette
    if (palette === null) throw new Error('S-99e says it is showing, so one is described')
    return palette.at
  }

  /** Aim the next press at GR-19's band. CS-2 freezes it at the press. */
  const aimAtTheBand = (screen: ScreenPane): void => {
    screen.drawAt({ part: U_26_PART, entry: T_109_GRAB_BAND, format: null, rowGroupId: null, resourceUid: null })
  }

  it('FR-053 (MUST): the palette ends up the distance the pointer travelled away', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(pointer('up', 560, 360))
    pane.runAnimationFrames()

    // ⛔ THE PLACE AND NOT THE ACTION. That an action was answered proves the
    // press was read; only the corner proves the palette moved.
    expect(paletteCorner(screen)).toEqual({ x: before.x + 60, y: before.y + 40 })
  })

  it('FR-053: a second drag moves it again, by ITS travel and not to its pointer', () => {
    // ⛔ The case that tells a distance from a place. The second press begins
    // far from where the first ended, so a loop that put the corner where the
    // finger let go would answer the pointer's own coordinates here.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(pointer('up', 560, 360))
    pane.runAnimationFrames()

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 200, 120))
    loop.receiveInput(pointer('move', 175, 135))
    loop.receiveInput(pointer('up', 175, 135))
    pane.runAnimationFrames()

    expect(paletteCorner(screen)).toEqual({ x: before.x + 60 - 25, y: before.y + 40 + 15 })
  })

  it('IN-1a (MUST): a pointer lost outside the window leaves the palette where it was', () => {
    // 「ボタンを離す前に窓の外でポインタが失われたときは、ドラッグを中断として
    // 終わらせること（MUST）」. 中断 is not a release, and IN-1 settles a pointer
    // operation only on the release -- so the palette stays put.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(pointer('lost', 560, 360))
    pane.runAnimationFrames()

    expect(paletteCorner(screen)).toEqual(before)
  })

  it('IN-4 (MUST): `Esc` takes the drag in flight, so the palette does not move', () => {
    // IN-4's second level is 「進行中のドラッグ・引きかけの矢印」, consumed one
    // level per press. ⚠️ The release that follows must not settle it either:
    // the gesture the release would have belonged to is already gone.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    aimAtTheBand(screen)
    loop.receiveInput(pointer('down', 500, 320))
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(key('Esc'))
    pane.runAnimationFrames()
    expect(paletteCorner(screen), 'Esc consumed the drag, so nothing moved').toEqual(before)

    loop.receiveInput(pointer('up', 560, 360))
    pane.runAnimationFrames()
    expect(paletteCorner(screen), 'the release of an aborted drag settles nothing').toEqual(before)
  })

  it('CS-2: a press that landed on nothing does not move the palette, however it is redrawn', () => {
    // ⛔ The other half of the claim: the corner moves BECAUSE the press was on
    // GR-19's band, not because a drag happened over the palette. CS-2 of 表
    // T-066 fixes what the gesture is about at the press, and the surface is
    // told about the band only after the button is already down.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = paletteCorner(screen)

    screen.drawAt(null)
    loop.receiveInput(pointer('down', 500, 320))
    aimAtTheBand(screen)
    loop.receiveInput(pointer('move', 560, 360))
    loop.receiveInput(pointer('up', 560, 360))
    pane.runAnimationFrames()

    expect(paletteCorner(screen)).toEqual(before)
  })
})

describe('FR-046 and SK-20 -- the day written into statusDate is the LOCAL calendar day', () => {
  // ⭐ Each case freezes the clock at an instant where the reader's calendar day
  // and UTC's differ, in both directions, so a loop that read the UTC day
  // answers with the neighbouring day and fails.
  const AHEAD = {
    zone: 'Pacific/Kiritimati', // UTC+14
    instant: '2026-08-21T13:00:00Z',
    localDay: { year: 2026, month: 8, day: 22 },
    utcDay: { year: 2026, month: 8, day: 21 },
  }
  const BEHIND = {
    zone: 'Pacific/Niue', // UTC-11
    instant: '2026-08-22T05:00:00Z',
    localDay: { year: 2026, month: 8, day: 21 },
    utcDay: { year: 2026, month: 8, day: 22 },
  }

  for (const machine of [AHEAD, BEHIND]) {
    it(`FR-046 (MUST NOT): on a machine in ${machine.zone} the line is dated the reader's day, not UTC's`, () => {
      // 「ここでいう本日は、読む人の機のローカルの暦の日とすること（MUST）。
      // UTC の暦の日を用いてはならない（MUST NOT）」 —— ゾーンを持たない暦の日
      // を入れる列に UTC を採ると、時差のぶんだけ前日または翌日に線が立つ.
      process.env.TZ = machine.zone
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(machine.instant))
      // The premise this whole case rests on: the two calendars really do
      // disagree at this instant on this machine.
      expect(new Date().getDate()).toBe(machine.localDay.day)
      expect(new Date().getUTCDate()).toBe(machine.utcDay.day)

      const pane = host()
      const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

      loop.receiveInput(key('D', { ctrl: true, shift: true }))
      pane.runAnimationFrames()

      expect(dayText(projectOf(loop.document()).statusDate)).toEqual(machine.localDay)
    })
  }

  it('SK-20: pressing it again clears the line, and FR-046 forbids a second flag for it', () => {
    // 「基準日線を消す操作は `statusDate` を `null` にすることとすること
    // （MUST）」 and 「表示状態を別に持ってはならない（MUST NOT）」.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(key('D', { ctrl: true, shift: true }))
    expect(projectOf(loop.document()).statusDate).not.toBeNull()

    loop.receiveInput(key('D', { ctrl: true, shift: true }))
    pane.runAnimationFrames()

    expect(projectOf(loop.document()).statusDate).toBeNull()
  })
})

describe('FR-063 and ED-1 of table T-229 -- who wrote it, and when', () => {
  const INSTANT = '2026-08-21T13:00:00Z'

  /** A host whose clock stands still, so the instant a write stamps is stateable. */
  const frozen = (): Host => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(INSTANT))
    return host()
  }

  it('ED-1 (MUST): a write made from the screen signs itself with table T-229’s word', () => {
    // 「最後に書いた者として書く語は 表 T-229 に従うこと（MUST）」, and ED-1 is
    // 「画面を操作する人」. ⭐ The word is read out of the manuscript, so
    // re-deciding that row fails here instead of leaving a stale literal.
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(key('D', { ctrl: true, shift: true }))

    expect(stampOf(loop.document()).lastEditedBy).toBe(ED_1_WORD)
  })

  it('FR-063 (MUST): the instant is ISO 8601, UTC, to the second -- no milliseconds', () => {
    // 「刻はいずれも `ISO 8601`・UTC・秒までとすること（MUST）」. AT-129 repeats
    // it: 「**秒までとする**（透かしと精度を揃える）」.
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(key('D', { ctrl: true, shift: true }))

    const stamp = stampOf(loop.document())
    const toTheSecond = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
    expect(stamp.scheduleUpdatedUtc).toMatch(toTheSecond)
    expect(stamp.settingsUpdatedUtc).toMatch(toTheSecond)
    // ⭐ And it is the UTC instant, which FR-046 says is a different thing from
    // the calendar day the same keystroke wrote: 「刻印の 2 つの刻は UTC の瞬間
    // であって、これとは別物である」.
    expect(stamp.settingsUpdatedUtc).toBe(INSTANT)
  })

  it('WS-5 / FR-063: a schedule-data write moves the schedule instant', () => {
    // WS-5: 「日程データの群の刻を動かすのは、その群を変えたときだけ」.
    // `Project.statusDate` is in the schedule-data group (DR-2 of table T-052).
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = stampOf(loop.document()).scheduleUpdatedUtc

    loop.receiveInput(key('D', { ctrl: true, shift: true }))

    expect(stampOf(loop.document()).scheduleUpdatedUtc).not.toBe(before)
    expect(stampOf(loop.document()).scheduleUpdatedUtc).toBe(INSTANT)
  })

  it('FR-063 (MUST NOT): a presentation-only write leaves the schedule instant where it was', () => {
    // 「見せ方の群だけを変える更新で、日程データの群の刻を動かしてはならない
    // （MUST NOT）」. SK-16 zooms the time axis, which UN-8 of table T-027 puts
    // outside the undo record and table T-052 puts in the presentation group.
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = stampOf(loop.document())

    loop.receiveInput(key('+', { shift: true }))

    const after = stampOf(loop.document())
    expect(after.scheduleUpdatedUtc).toBe(before.scheduleUpdatedUtc)
  })

  it('FR-063 (MUST): ... and still moves the other instant and the writer', () => {
    // 「どちらの群であれ動いた刻と、最後に書いた者は、見せ方の群だけを変えた
    // ときも更新すること（MUST）」 —— 日程データの群の刻だけでは見せ方の群の
    // 衝突を検出できず、AG-2 の楽観ロックが人の直前の操作を黙って消す.
    const pane = frozen()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = stampOf(loop.document())

    loop.receiveInput(key('+', { shift: true }))

    const after = stampOf(loop.document())
    expect(after.settingsUpdatedUtc).not.toBe(before.settingsUpdatedUtc)
    expect(after.settingsUpdatedUtc).toBe(INSTANT)
    expect(after.lastEditedBy).toBe(ED_1_WORD)
  })
})

describe('the specification still says what these cases copy', () => {
  it('table T-036 still spells the assignments this file drives', () => {
    for (const row of T_036_DRIVEN) {
      const cell = rowOf('T-036', row.row).by['割当'] ?? ''
      expect(
        sameSpelling(cell),
        `table T-036 row ${row.row} no longer spells ${row.spelt}`,
      ).toContain(sameSpelling(row.spelt))
    }
  })

  it('table T-036 still calls itself the whole roster of shortcut assignments', () => {
    expect(REQUIREMENTS).toContain('本表がショートカットキーの割当の全数である')
  })

  it('MK-10 still names Ctrl+P and Ctrl+F as ones this tool must not take', () => {
    const mk10 = rowOf('T-023', 'MK-10').cells.join(' ')
    expect(mk10).toContain('割り当てていない組合せを止めてはならない（MUST NOT）')
    expect(mk10).toContain('`Ctrl+P`')
    expect(mk10).toContain('`Ctrl+F`')
  })

  it('table T-229 ED-1 still gives the screen the word these cases sign with', () => {
    const ed1 = rowOf('T-229', 'ED-1')
    expect(ed1.by['書き込みの入口']).toContain('画面を操作する人')
    expect(ED_1_WORD).not.toBe('')
    // ⚠️ The word itself is deliberately NOT written down here -- it is read
    // from the row above. What is pinned is that it is one reserved word and
    // not the one the Agent API's callers may name themselves with (ED-2).
    expect(ED_1_WORD).not.toBe(bare(rowOf('T-229', 'ED-3').by['書く語'] ?? ''))
  })

  it('FR-046 still requires the reader’s local calendar day and forbids UTC', () => {
    expect(REQUIREMENTS).toContain('ここでいう本日は、読む人の機のローカルの暦の日とすること（MUST）')
    expect(REQUIREMENTS).toContain('UTC の暦の日を用いてはならない（MUST NOT）')
  })

  it('FR-063 still spells both instants ISO 8601, UTC, to the second', () => {
    expect(REQUIREMENTS).toContain('刻はいずれも `ISO 8601`・UTC・秒までとすること（MUST）')
    expect(REQUIREMENTS).toContain(
      '見せ方の群だけを変える更新で、日程データの群の刻を動かしてはならない（MUST NOT）',
    )
  })

  it('IN-4 still fixes the order of the levels, and IN-4a still hands the rest to the browser', () => {
    const in4 = rowOf('T-028', 'IN-4').cells.join(' ')
    expect(in4).toContain('1 階層ぶん消費し')
    expect(in4).toContain('開いている面 → 進行中のドラッグ・引きかけの矢印 → 構え')
    expect(rowOf('T-028', 'IN-4a').cells.join(' ')).toContain(
      '消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）',
    )
  })

  it('IN-1a still requires a lost pointer to end the drag as an abort', () => {
    expect(rowOf('T-028', 'IN-1a').cells.join(' ')).toContain(
      'ドラッグを中断として終わらせること（MUST）',
    )
    expect(rowOf('T-028', 'IN-1').cells.join(' ')).toContain(
      'ポインタが描画領域の外へ出たことを中断としてはならない（MUST NOT）',
    )
  })

  it('GR-19 still stands FIRST in table T-023d, and still moves the palette', () => {
    // ⛔ Read out of the table, never assumed: the preamble makes the upper row
    // win, so the claim the drag cases rest on is that this row is the upper
    // one. A re-ordering of that table lands here.
    const t023d = specTable('T-023d')
    expect(t023d.rows[0]?.id, 'table T-023d no longer opens with the palette band').toBe('GR-19')
    expect(REQUIREMENTS).toContain('上の行ほど優先すること（MUST）')

    const gr19 = t023d.rows[0]?.cells.join(' ') ?? ''
    expect(gr19).toContain(U_26_PART)
    expect(gr19).toContain('掴めばパレットを動かす')
    expect(gr19).toContain('FR-053')
  })

  it('FR-053 still makes the palette something the person drags', () => {
    expect(REQUIREMENTS).toContain('作成者がドラッグで動かせるようにすること')
  })

  it('table T-109 still answers the band by a row that is NOT a button', () => {
    // The row is what a press on the band arrives as; the sentence is why no
    // `CommandItem` may stand for it.
    const ic53 = rowOf('T-109', T_109_GRAB_BAND)
    expect(bare(ic53.by['面'] ?? '')).toBe(U_26_PART)
    expect(ic53.by['何の入口か']).toContain('ボタンではない')
    expect(ic53.by['正']).toContain('FR-053')
  })

  it('CS-2 of table T-066 still freezes the gesture at the press', () => {
    const cs2 = rowOf('T-066', 'CS-2').cells.join(' ')
    expect(cs2).toContain('身振りを始めた時点の文書')
    expect(cs2).toContain('ポインタを押した時点')
  })

  it('table T-078 still makes a person’s input FT-1, and BO-1 still holds the first frame back', () => {
    expect(rowOf('T-078', 'FT-1').cells.join(' ')).toContain('人の入力（ポインタとキー）')
    expect(rowOf('T-077', 'BO-1').cells.join(' ')).toContain('寸法が確定するまで 1 枚も描かない')
  })
})
