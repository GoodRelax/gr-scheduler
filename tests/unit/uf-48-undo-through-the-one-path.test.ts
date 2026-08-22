// Unit tests for the ONE ROAD UF-48 `frame-loop.ts` takes when a person walks
// the undo history (docs/spec/05-07-design.md). UF-48 is `SingleHtmlShell`
// (CP-25 of table T-062), and 表 T-230 is the table that says what a
// whole-document replacement owes its caller's row.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// What was read of `frame-loop.ts`: its head comment, its six exported
// declarations (`FrameEnvironment`, `FrameValues`, `HeldDocumentCall`,
// `FrameLoop`, `ScreenWiring`, `frameLoop`) and the one signature
// `frameLoop(surface, first, env, screen?): FrameLoop`. No function body was
// read; `single-html-shell.ts` was not opened. The seams these cases stand on
// were read from their OWN declarations -- `watchChanges` / `ChangeWatcher`
// (PI-15), `ReplacementCall` (PI-8) -- and every expectation below comes from a
// requirement or a table row, never from what the code happens to do.
//
// ⭐ WHY THIS FILE EXISTS AT ALL. 表 T-042's MS-1 fixes the shape of M1:
// 「`UseCase` 層を 1 つに保ち、人向けの画面と `Agent API` の双方がそれを呼ぶ形
// を、ここで作る（`FR-028`）—— 後から作り直せない唯一の分岐である」, and 表
// T-070's MN-4 states the cost of the alternative: 「入口が 2 つに分かれると、
// 片方にしか掛からない検証や履歴が生まれる」. An undo that steps the history
// back purely and then assigns the held pair itself IS that second entrance: it
// names no row of 表 T-230, and it walks past WS-1, WS-2, WS-4, WS-5 and WS-7
// of 表 T-067. None of the cases below can tell you WHICH road was taken --
// they are written from the CONSEQUENCES the one road owes, so that the second
// entrance fails them by not producing those consequences.
//
// The rules these cases answer to, quoted where they bind:
//
//   表 T-230        「文書をまるごと差し替える道も、本表の 7 つの順を踏む ——
//                   表 T-064 の `PI-8` が公開する `replaceDocument` がそれで
//                   ある。呼び手ごとに違うのは履歴・刻印・取り消しの 1 段の
//                   3 つだけ」, and 「呼び手は、自分がどの行かを名乗ること
//                   （MUST）。名乗らない差し替えを受け付けてはならない
//                   （MUST NOT）」
//   表 T-230 RD-1   取り消し | `UndoEdit`（`PI-11`）| 履歴: 問う先が答えたもの
//                   を据える | 刻印: 入ってきたまま | 取り消しの 1 段: 積まない
//   表 T-230 RD-2   やり直し | `RedoEdit`（`PI-12`）| the same three columns
//   表 T-230 (MUST) 「`WS-5` は、本表の刻印の欄が『進める』の行でだけ刻印を
//                   進めること（MUST）。『入ってきたまま』の行で進めては
//                   ならない（MUST NOT）」
//   表 T-230 (MUST) 「`WS-4` は、本表の欄が『積まない』の行で取り消しの 1 段を
//                   積んではならない（MUST NOT）—— 表 T-027 が分類している
//                   のは人が文書に対して行う操作であり、履歴を歩くこと自体は
//                   その対象ではない」
//   表 T-230 (MUST) 「`WS-7` へ渡す『日程データの群が動いたか』は、出て行く
//                   文書と入ってくる文書の `scheduleUpdatedUtc` の等値で導く
//                   こと（MUST）」
//   表 T-067 WS-2   「書ける時機かを見る。身振りの最中・編集入力の確定前・
//                   通知の配布中は拒否する」
//   表 T-067 WS-7   「差し替えの後に通知を配る」, with the MUST under the
//                   table: 「通知は差し替えの後とすること（MUST）。前に配って
//                   はならない（MUST NOT）」
//   表 T-078 FT-2   「現在値の差し替え（表 T-067 の `WS-6`）」 is a trigger of
//                   a frame, and `SingleHtmlShell`（`CP-25`）is what notices it
//   表 T-035 AG-6   「監視は『自分がまだ受け取っていない、自分以外の書き手が
//                   確定した変更と発話だけ』を通知すること ... まるごと差し
//                   替える道では `WS-5` が判定を下さない行があるので、表 T-230
//                   の定めに従う」
//   表 T-035 AG-9   「人が画面で文書を変えるドラッグをしている間は、書き込みを
//                   拒否すること（MUST）」
//   表 T-035 AG-10  「表 T-027 の対象外に当たる呼び出しは、拒否せずに実行するが
//                   履歴に残さないこと（MUST）」
//   表 T-027        取り消しの対象と対象外。`UN-13` puts 基準日 (FR-046) among
//                   the targets, which is what the one edit these cases make is
//   FR-031          「作成者が取り消しを求めたとき、`GRS` は、直前の編集を
//                   取り消し、取り消した編集をやり直せるようにすること」
//   FR-063          「取り消しは以前の文書を刻印ごと復元する（`FR-031`）ので、
//                   順序で読むと『戻った文書』を『新しくない』と読み、`AG-6`
//                   が通知を落とす」, and 「文書をまるごと差し替える道には、
//                   本要求の『更新』に当たらない呼び手がある（表 T-230）——
//                   別の文書がそのまま現在値になるので、刻印はその文書が
//                   書かれたときのものが残る」
//   表 T-036 SK-6   元に戻す | `Ctrl+Z`
//   表 T-036 SK-7   やり直す | `Ctrl+Y` / `Ctrl+Shift+Z`
//   表 T-028 IN-1a  「ボタンを離す前に窓の外でポインタが失われたときは、
//                   ドラッグを中断として終わらせること（MUST）」 -- the case
//                   below uses it to LIFT the state AG-9 refuses on
//
// ⛔ TWO CASES ARE LEFT RED ON PURPOSE (04-verification.md §1 forbids bending an
// expectation to the code). Both are the same defect seen twice, and it is the
// one 版 0.82 of the change history (docs/spec/A-appendix.md) recorded when it
// took ordering out of the stamp:
//
//   「取り消しは以前の文書を刻印ごと復元するので、戻った版数は現在より小さく、
//    `t2` を受け取り済みの監視者に通知が出ない。`AG-6` の『まだ受け取って
//    いない変更だけを通知する』の違反である」
//
// The stamp is fixed; the notice still does not come. A write made from the
// SCREEN reaches no subscriber of PI-15 at all -- undo, redo or ordinary edit --
// because the shell is the caller that satisfies `ChangeAudience` for the
// screen's writes and hands `ApplyDocumentChange` one that tells nobody. 図
// F-014's own edge 「`ApplyDocumentChange` → `NotifyChangeWatchers`（what was
// confirmed）」 is therefore travelled only when the `Agent API` is the writer.
// ⚠️ The two cases are NOT weakened to match: WS-7 is one of the five steps the
// second entrance skips, and a suite that asserts the other four while excusing
// this one would leave AG-6 guarded by nothing.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because nothing in docs/spec decides it:
//   - WHICH `ReplacementCall` row reaches `replaceDocument`, or that
//     `replaceDocument` is called at all. 表 T-230 is a rule about the road's
//     OUTCOME per row; a test that reached in and watched the call would be
//     testing this implementation rather than the table.
//   - what a redo does when the branch was cut. 表 T-027 and FR-031 settle what
//     is undoable and that it is redoable, and no row settles a cut branch.
//   - WS-1's refusal on the walk. 表 T-230 fixes what WS-1 matches (the stamp
//     the CALLER declares, never the incoming document's), and a person at a
//     keyboard declares nothing a test could make stale from outside.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
} from '../../src/framework/single-html-shell/frame-loop'
import {
  unwatchChanges,
  watchChanges,
  type ChangeNotice,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// What the manuscript says, read at read time rather than copied
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** `Ctrl` ＋ `Z`, `Ctrl+Z` and `` `Ctrl+Z` `` are the same assignment. */
const sameSpelling = (cell: string): string =>
  cell.replace(/`/g, '').replace(/＋/g, '+').replace(/\s+/g, '')

/** ED-1 of table T-229 -- the word a write made from the screen signs with. */
const ED_1_WORD = bare(rowOf('T-229', 'ED-1').by['書く語'] ?? '')

// ---------------------------------------------------------------------------
// The document these cases drive
// ---------------------------------------------------------------------------

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The calendar,
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

/**
 * The stamp the document these cases open ALREADY CARRIES, and the one every
 * assertion about RD-1 is written against.
 *
 * ⭐ FAR from the instant the edit below is made, and written by a name that is
 * neither the screen's nor any watcher's. RD-1's 刻印 column is 「入ってきた
 * まま」, so an undo that restored the document but re-signed the stamp would
 * leave the three values here and be caught -- which is exactly what FR-063
 * means by 「取り消しは以前の文書を刻印ごと復元する」.
 * ⚠️ `template` is ED-3 of table T-229 -- 「誰もまだ書いていない文書」 -- and it
 * is deliberately NOT the watcher's name below: AG-6 forbids waking a watcher
 * with its own write (MUST NOT), so a stamp signed by the watcher would make
 * the silence in the AG-6 cases correct instead of a defect.
 */
const OPENED_STAMP = {
  scheduleUpdatedUtc: '2026-03-04T05:06:07Z',
  settingsUpdatedUtc: '2026-03-04T05:06:07Z',
  lastEditedBy: 'template',
} as const

/**
 * Two rows, one Task on each, NO base date line, and a stamp of its own.
 *
 * ⛔ `statusDate: null` is a premise, not decoration. SK-20 of table T-036 is
 * 「基準日線を出す / 消す」 and FR-046 splits the two halves on exactly that
 * value, so a document that already carried a status date would drive the
 * CLEARING half. UN-13 of table T-027 names 基準日 among the undo targets
 * (「基準日（`FR-046`。出す / 動かす / 消すのいずれも）」), which is what makes
 * one keystroke enough to put a step in the history these cases then walk.
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
    documentStamp: { ...OPENED_STAMP },
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const projectOf = (document: Document): any => (document as any).schedule.project
const stampOf = (document: Document): any => (document as any).documentStamp

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

interface Host {
  /** Every SVG the loop has put on the surface, oldest first. */
  readonly drawn: string[]
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks no more. */
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node (vitest.config.ts) with no DOM and no `requestAnimationFrame`, and LY-5
 * of table T-060 puts the browser in this layer while R7.3 asks for it to be
 * handed in. A frame runs when this file says it runs and never otherwise.
 */
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
  }
}

/** The instant the one edit these cases make is stamped with. */
const INSTANT = '2026-08-21T13:00:00Z'

/** A host whose clock stands still, so the instant a write stamps is stateable. */
function frozenHost(): Host {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(INSTANT))
  return host()
}

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
  options: { readonly button?: PointerButton; readonly clickCount?: number } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: options.clickCount ?? 1,
})

/** SK-20 of table T-036 -- 「基準日線を出す / 消す」, an UN-13 target. */
const THE_ONE_EDIT: HumanInput = key('D', { ctrl: true, shift: true })
/** SK-6 of table T-036 -- 元に戻す. */
const UNDO: HumanInput = key('Z', { ctrl: true })
/** SK-7 of table T-036 -- やり直す. */
const REDO: HumanInput = key('Y', { ctrl: true })

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

// ---------------------------------------------------------------------------
// The subscriber of PI-15, which is what AG-6 calls 監視
// ---------------------------------------------------------------------------

/** AG-6's 「自分」. Neither ED-1's word nor the word `OPENED_STAMP` carries. */
const WATCHER = 'agent-under-test'

const REGISTERED: string[] = []

/**
 * Subscribes from where the document stands right now, which is what AG-6 calls
 * 「まだ受け取っていない」 for a subscription that starts here: 「購読し直した
 * ときは、最後に手渡した日程データの群の刻との等値で選ぶこと（MUST）」.
 */
function watching(loop: ReturnType<typeof frameLoop>): ChangeNotice[] {
  const taken: ChangeNotice[] = []
  watchChanges({
    watcher: WATCHER,
    since: {
      seenScheduleUpdatedUtc: stampOf(loop.document()).scheduleUpdatedUtc,
      seenSequence: 0,
    },
    deliver: (notice) => void taken.push(notice),
  })
  REGISTERED.push(WATCHER)
  return taken
}

afterEach(() => {
  while (REGISTERED.length > 0) unwatchChanges(REGISTERED.pop()!)
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
  vi.useRealTimers()
})

// ===========================================================================

describe('the document these cases drive', () => {
  it('is a valid GRS JSON document', () => {
    const report = validateDocument(twoRowDocument())
    expect(report.errors, report.errors.join('\n')).toEqual([])
  })

  it('carries no base date line and a stamp of its own, so one keystroke makes one step', () => {
    // UN-13 of table T-027 puts 基準日 among the undo targets, and the stamp
    // below is the value RD-1's 刻印 column is asserted against.
    const document = twoRowDocument()
    expect(projectOf(document).statusDate).toBeNull()
    expect(stampOf(document)).toEqual({ ...OPENED_STAMP })
    expect(stampOf(document).lastEditedBy).not.toBe(ED_1_WORD)
    expect(stampOf(document).lastEditedBy).not.toBe(WATCHER)
  })
})

describe('表 T-230 RD-1 / RD-2 -- 刻印: 入ってきたまま', () => {
  it('a document stamped by someone else, one screen edit on top -> Ctrl+Z -> the restored document carries the stamp it was opened with', () => {
    // RD-1's 刻印 column is 「入ってきたまま」, and the MUST under the table
    // spells the prohibition: 「`WS-5` は ... 『入ってきたまま』の行で進めては
    // ならない（MUST NOT）」. FR-063 says why in one sentence: 「取り消しは
    // 以前の文書を刻印ごと復元する（`FR-031`）」 —— 刻印ごと, so all three
    // values, not the instants alone.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    expect(
      stampOf(loop.document()),
      'the edit itself must move the stamp, or there is nothing for the undo to restore',
    ).not.toEqual({ ...OPENED_STAMP })

    loop.receiveInput(UNDO)

    expect(stampOf(loop.document())).toEqual({ ...OPENED_STAMP })
    expect(projectOf(loop.document()).statusDate).toBeNull()
  })

  it('an undone edit -> Ctrl+Y -> the redone document carries the stamp that document was written with', () => {
    // RD-2's 刻印 column is 「入ってきたまま」 too. The document coming back is
    // the one the edit produced, so the stamp coming back is the one the edit
    // wrote -- ED-1's word at the instant of the write -- and NOT a fresh one
    // signed at the moment of the redo.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const written = structuredClone(stampOf(loop.document()))
    loop.receiveInput(UNDO)
    loop.receiveInput(REDO)

    expect(stampOf(loop.document())).toEqual(written)
    expect(stampOf(loop.document()).lastEditedBy).toBe(ED_1_WORD)
    expect(projectOf(loop.document()).statusDate).not.toBeNull()
  })
})

describe('表 T-230 RD-1 / RD-2 -- 取り消しの 1 段: 積まない', () => {
  it('one edit and one undo -> a second Ctrl+Z with nothing earlier to reach -> the document does not move', () => {
    // 「`WS-4` は、本表の欄が『積まない』の行で取り消しの 1 段を積んでは
    // ならない（MUST NOT）—— 表 T-027 が分類しているのは人が文書に対して行う
    // 操作であり、履歴を歩くこと自体はその対象ではない」.
    //
    // ⭐ WHY A SECOND Ctrl+Z SHOWS IT. After one edit the history holds one
    // step. The first undo spends it. If walking had pushed a step of its own,
    // the history would hold one again -- the document the walk left -- and
    // this second Ctrl+Z would hand the edited document back. WS-6 replaces
    // ONE reference (MUST), so a document that did not move is the same value.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    loop.receiveInput(UNDO)
    const restored = loop.document()

    loop.receiveInput(UNDO)

    expect(loop.document()).toBe(restored)
    expect(projectOf(loop.document()).statusDate).toBeNull()
    expect(stampOf(loop.document())).toEqual({ ...OPENED_STAMP })
  })

  it('one edit and one undo -> Ctrl+Y -> the edit comes back, so the walk left the history where it found it', () => {
    // FR-031: 「直前の編集を取り消し、取り消した編集をやり直せるようにする
    // こと」. A step pushed by the walk itself would be a NEW edit standing on
    // top of the history, and there would be nothing left to redo.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const edited = loop.document()
    loop.receiveInput(UNDO)
    loop.receiveInput(REDO)

    expect(projectOf(loop.document()).statusDate).toEqual(projectOf(edited).statusDate)
    expect(stampOf(loop.document())).toEqual(structuredClone(stampOf(edited)))
  })
})

describe('表 T-067 WS-2 -- the moment refuses the walk as it refuses any other write', () => {
  it('an edit in the history and a press in flight on a bar -> Ctrl+Z -> the document does not move', () => {
    // WS-2 of table T-067: 「書ける時機かを見る。身振りの最中・編集入力の確定前
    // ・通知の配布中は拒否する」, whose 正 is AG-9: 「人が画面で文書を変える
    // ドラッグをしている間は、書き込みを拒否すること（MUST）—— 途中の状態へ
    // 書き込むと、離した瞬間に人の操作が上書きする」.
    //
    // ⭐ CS-2 of table T-066 fixes when the gesture begins: 「身振り 1 回
    // （掴む）| 身振りを始めた時点の文書 | ポインタを押した時点」 —— at the
    // press, not at the first move.
    // ⭐ 表 T-230 changes THREE columns for the whole-document road and WS-2 is
    // not one of them: 「呼び手ごとに違うのは履歴・刻印・取り消しの 1 段の
    // 3 つだけ」.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    pane.runAnimationFrames()

    loop.receiveInput(THE_ONE_EDIT)
    pane.runAnimationFrames()
    const edited = loop.document()

    const centre = planCentre(loop, 1)
    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(UNDO)

    expect(loop.document()).toBe(edited)
    expect(projectOf(loop.document()).statusDate).not.toBeNull()
  })

  it('... and once IN-1a has ended that gesture -> the same Ctrl+Z moves it', () => {
    // The pair is what makes the case above about the MOMENT and not about an
    // empty history. IN-1a of table T-028: 「ボタンを離す前に窓の外でポインタが
    // 失われたときは、ドラッグを中断として終わらせること（MUST）—— 終わらせ
    // ないと『ドラッグ中』が解けず、`Agent API` の書き込みが以後ずっと拒否
    // される（表 T-035 の AG-9）」. An abort writes nothing, so the step the
    // refused undo could not spend is still there to spend.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    pane.runAnimationFrames()

    loop.receiveInput(THE_ONE_EDIT)
    pane.runAnimationFrames()
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(UNDO)
    loop.receiveInput(pointer('lost', centre.x, centre.y))
    loop.receiveInput(UNDO)

    expect(projectOf(loop.document()).statusDate).toBeNull()
    expect(stampOf(loop.document())).toEqual({ ...OPENED_STAMP })
  })
})

describe('表 T-067 WS-7 and AG-6 -- the watchers are told', () => {
  it('a subscriber of its own name, one edit -> Ctrl+Z -> it is handed the restored document', () => {
    // AG-6: 「監視は『自分がまだ受け取っていない、自分以外の書き手が確定した
    // 変更と発話だけ』を通知すること ... まるごと差し替える道では `WS-5` が
    // 判定を下さない行があるので、表 T-230 の定めに従う」, and 表 T-230 settles
    // the flag WS-7 is handed: 「出て行く文書と入ってくる文書の
    // `scheduleUpdatedUtc` の等値で導くこと（MUST）」.
    //
    // The edit moved the schedule instant, so the undo moves it back to a
    // different value: the equality says the schedule moved, and the restored
    // stamp is signed `template` -- not this watcher -- so AG-6 selects it.
    //
    // ⛔ LEFT RED. 版 0.82 of the change history recorded this very silence as
    // the defect: 「取り消しは以前の文書を刻印ごと復元するので、戻った版数は
    // 現在より小さく、`t2` を受け取り済みの監視者に通知が出ない。`AG-6` の
    // 『まだ受け取っていない変更だけを通知する』の違反である」.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const taken = watching(loop)

    loop.receiveInput(UNDO)

    expect(taken).toHaveLength(1)
    expect(taken[0]?.document).not.toBeNull()
    expect(stampOf(taken[0]!.document!)).toEqual({ ...OPENED_STAMP })
    expect(projectOf(taken[0]!.document!).statusDate).toBeNull()
  })

  it('the same subscriber, an undone edit -> Ctrl+Y -> it is handed the redone document', () => {
    // The same sentence of AG-6, walking the other way. RD-2 carries the same
    // 刻印 column, so the instant that comes back is the one the edit wrote and
    // the equality with the instant the watcher last held says it moved.
    //
    // ⛔ LEFT RED, for the reason above.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const written = structuredClone(stampOf(loop.document()))
    loop.receiveInput(UNDO)
    const taken = watching(loop)

    loop.receiveInput(REDO)

    expect(taken).toHaveLength(1)
    expect(taken[0]?.document).not.toBeNull()
    expect(stampOf(taken[0]!.document!)).toEqual(written)
    expect(projectOf(taken[0]!.document!).statusDate).not.toBeNull()
  })
})

describe('表 T-078 FT-2 -- the landing owes a frame', () => {
  it('an edit already drawn -> Ctrl+Z -> a further frame runs, and it is drawn from the restored document', () => {
    // FT-2 of table T-078: 「現在値の差し替え（表 T-067 の `WS-6`）」, noticed
    // by `SingleHtmlShell`（`CP-25`）. The MUST NOT under the table -- 「本表に
    // 無い契機でフレームを起こしてはならない」 -- is the other side of the same
    // rule, and NFR-011 forbids a screen that stays showing what is no longer
    // the current value.
    //
    // ⭐ The restored document IS the document that was opened, so the picture
    // the landing owes is the picture the first frame drew: the frame's three
    // values are computed from the current value at the head of the frame
    // (ADR-001, CA-2 of table T-071), and nothing else about this session moved.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    pane.runAnimationFrames()
    const opened = pane.drawn[pane.drawn.length - 1]

    loop.receiveInput(THE_ONE_EDIT)
    pane.runAnimationFrames()
    const afterEdit = pane.drawn.length
    const editPicture = pane.drawn[pane.drawn.length - 1]
    expect(editPicture, 'the edit must reach the picture, or the undo has nothing to undraw').not.toBe(
      opened,
    )

    loop.receiveInput(UNDO)
    pane.runAnimationFrames()

    expect(pane.drawn.length).toBeGreaterThan(afterEdit)
    expect(pane.drawn[pane.drawn.length - 1]).not.toBe(editPicture)
    expect(pane.drawn[pane.drawn.length - 1]).toBe(opened)
  })
})

describe('the specification still says what these cases copy', () => {
  it('表 T-230 still gives RD-1 and RD-2 the three columns these cases assert', () => {
    for (const row of ['RD-1', 'RD-2'] as const) {
      const cells = rowOf('T-230', row).by
      expect(cells['刻印'], `${row} 刻印`).toBe('入ってきたまま')
      expect(cells['取り消しの 1 段'], `${row} 取り消しの 1 段`).toBe('積まない')
      expect(cells['履歴'], `${row} 履歴`).toBe('問う先が答えたものを据える')
    }
    expect(rowOf('T-230', 'RD-1').by['呼び手']).toBe('取り消し')
    expect(rowOf('T-230', 'RD-2').by['呼び手']).toBe('やり直し')
    expect(rowOf('T-230', 'RD-1').by['`WS-3` の位置に立つもの']).toContain('UndoEdit')
    expect(rowOf('T-230', 'RD-2').by['`WS-3` の位置に立つもの']).toContain('RedoEdit')
  })

  it('表 T-036 still spells the two keys these cases press', () => {
    expect(sameSpelling(rowOf('T-036', 'SK-6').by['割当'] ?? '')).toContain('Ctrl+Z')
    expect(sameSpelling(rowOf('T-036', 'SK-7').by['割当'] ?? '')).toContain('Ctrl+Y')
    expect(sameSpelling(rowOf('T-036', 'SK-20').by['割当'] ?? '')).toContain('Ctrl+Shift+D')
  })

  it('表 T-067 still puts the refusal at WS-2 and the notice after the swap at WS-7', () => {
    expect(rowOf('T-067', 'WS-2').by['すること']).toContain('身振りの最中')
    expect(rowOf('T-067', 'WS-6').by['すること']).toContain('現在値を差し替える')
    expect(rowOf('T-067', 'WS-7').by['すること']).toContain('差し替えの後に通知を配る')
    expect(bare(rowOf('T-067', 'WS-7').by['正'] ?? '')).toBe('AG-6')
  })

  it('表 T-078 still makes the replacement of the current value a trigger', () => {
    expect(rowOf('T-078', 'FT-2').by['契機']).toContain('現在値の差し替え')
    expect(rowOf('T-078', 'FT-2').by['気づくもの']).toContain('SingleHtmlShell')
  })

  it('表 T-027 still puts the base date line among the undo targets', () => {
    // UN-13 is what makes SK-20 a step in the history at all.
    expect(rowOf('T-027', 'UN-13').by['区分']).toBe('対象')
    expect(rowOf('T-027', 'UN-13').by['操作']).toContain('基準日')
  })
})
