// Unit tests for the ONE step of UF-48 `frame-loop.ts` that decides whether a
// write may happen at all: WS-2 of table T-067 (docs/spec/05-07-design.md),
// 「書ける時機かを見る」, whose 正 column names AG-9 of table T-035
// (docs/spec/01-04-requirements.md).
//
// UF-48 is `SingleHtmlShell` (CP-25 of table T-062). FT-1 of table T-078 is the
// trigger these cases arrive on -- 人の入力（ポインタとキー） -- and
// `receiveInput` is the member that takes it.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md section 1: 読んでよいのは冒頭の宣言・公開する型・署名まで).
// What was read of `frame-loop.ts`: its head comment, its four exported
// declarations (`FrameEnvironment`, `FrameValues`, `HeldDocumentCall`,
// `FrameLoop`, `ScreenWiring`) and the one signature
// `frameLoop(surface, first, env, screen?): FrameLoop`. No function body was
// read. Every expected value below comes from a table row or a requirement.
//
// ---------------------------------------------------------------------------
// THE GAP THIS FILE EXISTS TO CLOSE
// ---------------------------------------------------------------------------
// Before this file, 3232 cases stood and NOT ONE of them held WS-2 down: the
// shell's answer to 「身振りの最中」 could be reverted to a frozen false -- so
// that a write landed in the middle of a pointer press -- and the whole suite
// stayed green.
//
// ---------------------------------------------------------------------------
// THE RULES THESE CASES ANSWER TO
// ---------------------------------------------------------------------------
//   表 T-035 AG-9   「人が画面で文書を変えるドラッグをしている間は、書き込みを
//                   拒否すること（MUST）」 -- in English: WHILE A PERSON IS
//                   DRAGGING THE DOCUMENT ON SCREEN, A WRITE MUST BE REFUSED.
//                   Its reason: 途中の状態へ書き込むと、
//                   離した瞬間に人の操作が上書きする -- a write into a half-made
//                   gesture is overwritten the instant the person lets go.
//                   And its exemption: PAN AND RANGE SELECTION DO NOT CHANGE THE
//                   DOCUMENT, SO THEY ARE NOT REFUSED; the gestures that are
//                   refused are 表 T-027's undo-target rows. Its reason again:
//                   if the Agent API stopped for as long as a reader scrolls,
//                   FR-028's 「人間向け UI と同格」 would not hold.
//   表 T-067 WS-2   step 2 of 文書を変える手順 -- 書ける時機かを見る。身振りの
//                   最中・編集入力の確定前・通知の配布中は拒否する. This is the
//                   step that performs AG-9's refusal, and it stands BEFORE
//                   WS-3 (build the new document), WS-4 (push an undo step),
//                   WS-5 (advance the stamp) and WS-6 (swap the current value).
//   表 T-067 WS-1   step 1, the stamp check -- named here only to fix that WS-2
//                   is not it: these cases declare no stamp at all, and the
//                   sentence under table T-230 forbids refusing for that alone
//                   (申告が無いことだけを理由に拒否してはならない).
//   表 T-067 WS-6   「現在値を差し替える」 is the ONLY step that replaces the
//                   held value, and 差し替えは 1 つの参照の置き換えとすること
//                   (MUST). So a refusal at WS-2 leaves the very reference the
//                   loop held -- which is what these cases assert.
//   表 T-230        まるごと差し替える道も、本表の 7 つの順を踏む -- undo (RD-1)
//                   and redo (RD-2) walk the SAME seven steps, so WS-2 gates
//                   them exactly as it gates a keyboard write.
//   表 T-027 UN-8   ズーム・スクロール・パン are outside the undo record, and
//   表 T-027 UN-9   選択 is outside it -- the two AG-9 exempts, because neither
//                   changes the document.
//   表 T-023a PD-1  中ボタンドラッグ、または Ctrl だけを伴う左ドラッグ = パン。
//                   構えと当たりによらず優先する -- a pan press, whatever it
//                   landed on.
//   表 T-023a PD-5  何にも当たらない かつ 構えていない = 範囲選択 -- a range
//                   selection press.
//   表 T-028 IN-1   ポインタ操作は押した時点で実行せず、離した時点で確定する
//                   こと。中断は `Esc` で行い -- a press ends EITHER by the
//                   release or by the Esc that interrupts it.
//   表 T-028 IN-1a  ボタンを離す前に窓の外でポインタが失われたときは、ドラッグを
//                   中断として終わらせること（MUST）, whose stated reason is
//                   this file's subject: 終わらせないと「ドラッグ中」が解けず、
//                   `Agent API` の書き込みが以後ずっと拒否される（表 T-035 の
//                   AG-9）.
//   表 T-028 IN-4   Esc consumes ONE level, in the order 開いている面 → 進行中の
//                   ドラッグ・引きかけの矢印 → 構え → `Dual Cursor` モード. With
//                   no surface open, the first Esc takes the press in flight.
//   表 T-028 IN-4a  消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと
//                   （MUST） -- used below only to READ whether a press is still
//                   in flight, through `isBrowserDefaultStopped`.
//   表 T-036 SK-20  `Ctrl` + `Shift` + `D` -- 基準日線を出す / 消す. THE WRITE
//                   THESE CASES DRIVE, chosen because it needs no selection: it
//                   writes `Project.statusDate` from the keyboard alone.
//   表 T-036 SK-6   `Ctrl+Z` -- 元に戻す, and SK-7 `Ctrl+Y` -- やり直す.
//   FR-046          出す writes today into `statusDate`; 消す puts `null` back.
//   表 T-027 UN-13  文書全体の設定の変更 ... 基準日（`FR-046`。出す / 動かす /
//                   消すのいずれも）-- so SK-20 leaves an undo step to undo.
//
// ⛔ ONE CASE IS LEFT RED ON PURPOSE -- see the last describe. 04-verification
// section 1 forbids bending an expectation to the code, and the case quotes the
// sentence of AG-9 it holds.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because nothing in docs/spec decides it
// for this seam:
//   - the SHAPE of the refusal. AG-9a fixes what a refusal value carries, but
//     `receiveInput` returns void (its signature), so a happening arriving over
//     IF-2 has nobody to hand a `Refusal` to. What is observable from outside
//     the loop is the document, and the document is what these cases read.
//   - whether a refused happening still owes a frame. Table T-078 names 人の
//     入力 as a trigger without dividing it by what the input turned out to be.

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
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

// ---------------------------------------------------------------------------
// What the manuscript says, read at read time rather than copied
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/**
 * The heading of table T-036's third column -- 「割当」.
 *
 * ⭐ Read by heading rather than by position, so that a column moving in the
 * manuscript cannot silently make this file compare the wrong cell.
 */
const ASSIGNMENT_COLUMN = '割当'

/** The full-width plus table T-036 spells some assignments with. */
const FULLWIDTH_PLUS = '＋'

/** `Ctrl` ＋ `Shift` ＋ `D` and `Ctrl+Shift+D` are the same assignment. */
const sameSpelling = (cell: string): string =>
  cell.replace(/[`*]/g, '').split(FULLWIDTH_PLUS).join('+').replace(/\s+/g, '')

/** The alternatives of one assignment cell: SK-7 offers two. */
const spellingsOf = (row: string): string[] =>
  sameSpelling(rowOf('T-036', row).by[ASSIGNMENT_COLUMN] ?? '').split('/')

// ---------------------------------------------------------------------------
// The document these cases drive
// ---------------------------------------------------------------------------

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The
// calendar, the project and the settings come from it; the rows and the Tasks
// are written out here so that what is drawn can be named row by row.
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
 * Two rows, one Task on each, and NO base date line.
 *
 * ⛔ `statusDate: null` is a premise, not decoration. SK-20 of table T-036 is
 * 出す / 消す and FR-046 splits the two halves on exactly that value, so a
 * document that already carried a status date would drive the CLEARING half and
 * never the writing these cases read. The first describe below pins it.
 */
function twoRowDocument(): Document {
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
  return draft as unknown as Document
}

const projectOf = (document: Document): any => (document as any).schedule.project
const statusDateOf = (loop: FrameLoop): string | null => projectOf(loop.document()).statusDate

// ---------------------------------------------------------------------------
// The host UF-48 is given
// ---------------------------------------------------------------------------

/** BO-1 of table T-077 has already settled these by the time a loop exists. */
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks no more. */
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the
 * browser in this layer. ⛔ Nothing in this fake decides anything about presses
 * or writes: it only counts pictures and drains the queue.
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

/** SK-20 of table T-036 -- the write these cases drive. */
const BASE_DATE_LINE = (): HumanInput => key('D', { ctrl: true, shift: true })
/** SK-6. */
const UNDO = (): HumanInput => key('Z', { ctrl: true })
/** SK-7. */
const REDO = (): HumanInput => key('Y', { ctrl: true })
/** SK-8, whose rule is IN-4. */
const ESCAPE = (): HumanInput => key('Esc')

// ---------------------------------------------------------------------------
// Reading the frame
// ---------------------------------------------------------------------------

/** The centre of a Task's plan bar, in the frame of reference a press speaks in. */
function planCentre(loop: FrameLoop, uid: number): { x: number; y: number } {
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

/** Every point one bar was drawn through, whichever of table T-012's two forms it took. */
const pointsOfBar = (bar: BarGeometry | null): Point[] => {
  if (bar === null) return []
  if (bar.form === 'outline') return [...bar.points]
  return [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((dot) => dot.at)]
}

/**
 * A point inside the Row Area (U-50) that no drawn Task occupies, so that a
 * press there is PD-5 of table T-023a: 何にも当たらない かつ 構えていない,
 * which is a range selection. The premise -- that it really does miss
 * everything drawn -- is asserted by a case of its own below.
 */
function emptySpot(loop: FrameLoop): { x: number; y: number } {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  const area = values.regions.rowArea
  return { x: area.x + area.width / 2, y: area.y + area.height - 2 }
}

/**
 * How far the nearest thing the loop drew is from a point, in y.
 *
 * ⚠️ Distance and not a plain hit test: table T-023d gives every grab a reach
 * around what is drawn, so a point that merely misses the ink can still be a
 * hit. A premise below demands real clearance instead.
 */
function clearanceFrom(loop: FrameLoop, spot: { x: number; y: number }): number {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  let nearest = Number.POSITIVE_INFINITY
  for (const drawn of values.geometry.tasks) {
    const points = [
      ...pointsOfBar(drawn.plan),
      ...pointsOfBar(drawn.actual),
      ...drawn.dummies.map((one) => one.at),
      ...drawn.fadeHandles,
      ...(drawn.marker === null ? [] : [drawn.marker.centre]),
    ]
    for (const point of points) nearest = Math.min(nearest, Math.abs(point.y - spot.y))
    const label = drawn.label
    if (label !== null) {
      const above = label.y - spot.y
      const below = spot.y - (label.y + label.height)
      nearest = Math.min(nearest, Math.max(above, below, 0))
    }
  }
  return nearest
}

/**
 * Whether a press is still in flight, read through IN-4 / IN-4a.
 *
 * ⭐ With no surface open, level 1 of IN-4 is empty, so `Esc` is assigned when
 * -- and only when -- level 2 (進行中のドラッグ・引きかけの矢印) or a level
 * below it stands. IN-4a makes the other answer a MUST: 消費する対象が 1 つも
 * 無いときは、必ずブラウザへ渡すこと. ⛔ Asked with
 * `isBrowserDefaultStopped`, which the interface declares must change nothing,
 * so reading it cannot end the gesture it is reading.
 */
const pressIsInFlight = (loop: FrameLoop): boolean => loop.isBrowserDefaultStopped(ESCAPE())

/**
 * What "the write was refused" is observable as from outside the loop.
 *
 * WS-6 of table T-067 is the ONLY step that replaces the current value, and it
 * stands four steps after the refusal at WS-2, so nothing of the held document
 * may have moved -- down to the reference itself, which WS-6 requires the swap
 * to be (差し替えは 1 つの参照の置き換えとすること（MUST）).
 */
function expectDocumentUntouched(loop: FrameLoop, before: Document, why: string): void {
  expect(statusDateOf(loop), why).toBeNull()
  expect(loop.document(), `${why} -- WS-6 is the only step that replaces the held value`).toBe(
    before,
  )
}

// ===========================================================================

describe('the premises these cases rest on', () => {
  it('the document is a valid GRS JSON document', () => {
    const report = validateDocument(twoRowDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('it carries no base date line, so SK-20 drives the WRITING half of FR-046', () => {
    // ⛔ A premise. FR-046 makes 基準日線を出す操作 the one that writes today,
    // and SK-20 chooses between showing and hiding by whether `statusDate`
    // holds anything.
    expect(projectOf(twoRowDocument()).statusDate).toBeNull()
  })

  it('a plain press is in flight until it ends, which is what IN-4 / IN-4a report', () => {
    // ⛔ A premise of every case below: the reading of 「press in flight」 is
    // itself sound. Before any press, IN-4a hands `Esc` to the browser (MUST);
    // after a press, IN-4's level 2 stands and the key is taken.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    expect(pressIsInFlight(loop), 'IN-4a: nothing to consume, so Esc goes to the browser').toBe(
      false,
    )
    loop.receiveInput(pointer('down', centre.x, centre.y))
    expect(pressIsInFlight(loop), 'IN-4 level 2: a drag in flight is something to consume').toBe(
      true,
    )
    pane.runAnimationFrames()
  })

  it('the spot the range-selection case presses on is clear of everything drawn', () => {
    // ⛔ A premise of the PD-5 case: 何にも当たらない has to be true of the
    // point, or the case would be driving PD-3 (そのものへの操作) instead.
    // Table T-023d gives every grab a reach, so mere clearance of the ink is
    // not enough. The widest of those reaches is S-93's 30 × 20px box (実績の
    // ダミーの当たり判定), which is 10px above or below what was drawn; S-92 is
    // 15 × 15px, and S-90 / S-91 / S-137 are 6px. This asks for more than three
    // times the widest of them.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    expect(clearanceFrom(loop, emptySpot(loop))).toBeGreaterThan(32)
    pane.runAnimationFrames()
  })

  it('the assignments this file drives are the manuscript table T-036 own', () => {
    // Chapter 1.9 (:275) asks a test of a requirement that points at a table to
    // be driven by a fixed copy of that table. The copy is made at read time,
    // so re-deciding a row fails here instead of leaving a stale literal.
    expect(spellingsOf('SK-20')).toContain('Ctrl+Shift+D')
    expect(spellingsOf('SK-6')).toContain('Ctrl+Z')
    expect(spellingsOf('SK-7')).toContain('Ctrl+Y')
    expect(spellingsOf('SK-8')[0]?.startsWith('Esc')).toBe(true)
  })
})

describe('AG-9 of table T-035 / WS-2 of table T-067 -- a write while a gesture is in flight', () => {
  it('a press on a plan bar is in flight -> SK-20 arrives from the keyboard -> the document is unchanged', () => {
    // AG-9 (MUST): while a person is dragging the document on screen, a write
    // is refused -- 途中の状態へ書き込むと、離した瞬間に人の操作が上書きする.
    // WS-2 of table T-067 is the step that refuses, and it stands before WS-3,
    // WS-4, WS-5 and WS-6, so nothing of the document may move.
    //
    // ⭐ SK-20 is the write chosen because it needs no selection at all: it
    // writes `Project.statusDate` from the keyboard alone, so the refusal
    // cannot be confused with 「nothing was selected to write to」.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    expect(pressIsInFlight(loop)).toBe(true)
    const before = loop.document()

    loop.receiveInput(BASE_DATE_LINE())

    expectDocumentUntouched(loop, before, 'AG-9 (MUST): a write mid-gesture is refused')
    pane.runAnimationFrames()
  })

  it('the press has been released -> the same key arrives -> the write lands', () => {
    // ⭐ THE CONTROL. Without it the case above would pass on a loop that never
    // writes at all. IN-1 settles a pointer operation on the release, so once
    // the button is up there is no gesture for AG-9 to refuse, and FR-046 makes
    // SK-20 write today into `statusDate`.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(pointer('up', centre.x, centre.y))
    expect(pressIsInFlight(loop), 'the release ended the gesture (IN-1)').toBe(false)

    loop.receiveInput(BASE_DATE_LINE())

    expect(statusDateOf(loop), 'with no gesture in flight AG-9 refuses nothing').not.toBeNull()
    pane.runAnimationFrames()
  })

  it('the press was interrupted by Esc -> the same key arrives -> the write lands', () => {
    // IN-1 of table T-028 names TWO ends for a pointer operation, and the
    // release is only one of them: 離した時点で確定すること。中断は `Esc` で
    // 行い. IN-4 puts 進行中のドラッグ at level 2, and with no surface open
    // that is the level the first Esc takes -- after which AG-9 has no gesture
    // left to refuse for.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(ESCAPE())
    expect(pressIsInFlight(loop), 'IN-4 level 2: the Esc consumed the drag in flight').toBe(false)

    loop.receiveInput(BASE_DATE_LINE())

    expect(statusDateOf(loop), 'the interrupted gesture is over, so WS-2 lets the write by').not
      .toBeNull()
    pane.runAnimationFrames()
  })

  it('the pointer was lost outside the window -> the same key arrives -> the write lands', () => {
    // IN-1a (MUST): ボタンを離す前に窓の外でポインタが失われたときは、ドラッグ
    // を中断として終わらせること -- and the row states this file's subject as
    // its reason: 終わらせないと「ドラッグ中」が解けず、`Agent API` の書き込み
    // が以後ずっと拒否される（表 T-035 の AG-9）.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(pointer('lost', centre.x, centre.y))
    expect(pressIsInFlight(loop), 'IN-1a ended the drag as an interruption').toBe(false)

    loop.receiveInput(BASE_DATE_LINE())

    expect(statusDateOf(loop), 'IN-1a exists so that AG-9 stops refusing').not.toBeNull()
    pane.runAnimationFrames()
  })
})

describe('table T-230 -- undo and redo walk the same seven steps, so WS-2 gates them too', () => {
  // 文書をまるごと差し替える道も、本表の 7 つの順を踏む: RD-1 (取り消し) and
  // RD-2 (やり直し) reach WS-6 through the same road a keyboard write does, and
  // the only three things that differ for a caller are 履歴・刻印・取り消しの
  // 1 段. WS-2 is not among the three, so it stands for them unchanged.

  it('a base date line has been written and a press is in flight -> Ctrl+Z arrives -> the document is unchanged', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    // UN-13 of table T-027 puts 基準日（出す / 動かす / 消すのいずれも） among
    // the undo targets, so this write left a step to undo.
    loop.receiveInput(BASE_DATE_LINE())
    const written = statusDateOf(loop)
    expect(written, 'the premise: there is now something to undo').not.toBeNull()

    loop.receiveInput(pointer('down', centre.x, centre.y))
    expect(pressIsInFlight(loop)).toBe(true)
    const before = loop.document()

    loop.receiveInput(UNDO())

    expect(statusDateOf(loop), 'AG-9 (MUST): the undo road is refused mid-gesture too').toBe(written)
    expect(loop.document(), 'WS-6 is the only step that replaces the held value').toBe(before)
    pane.runAnimationFrames()
  })

  it('the press has been interrupted -> Ctrl+Z arrives -> the undo lands', () => {
    // ⭐ THE CONTROL for the case above. The press is ended by Esc rather than
    // by a release, so that nothing the release would settle (IN-1) can add a
    // second undo step and change what Ctrl+Z is undoing.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(BASE_DATE_LINE())
    expect(statusDateOf(loop)).not.toBeNull()

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(ESCAPE())
    expect(pressIsInFlight(loop)).toBe(false)

    loop.receiveInput(UNDO())

    expect(statusDateOf(loop), 'RD-1: the undo put the previous document back').toBeNull()
    pane.runAnimationFrames()
  })

  it('an undo has been made and a press is in flight -> Ctrl+Y arrives -> the document is unchanged', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(BASE_DATE_LINE())
    loop.receiveInput(UNDO())
    expect(statusDateOf(loop), 'the premise: there is now something to redo').toBeNull()

    loop.receiveInput(pointer('down', centre.x, centre.y))
    expect(pressIsInFlight(loop)).toBe(true)
    const before = loop.document()

    loop.receiveInput(REDO())

    expectDocumentUntouched(loop, before, 'AG-9 (MUST): the redo road is refused mid-gesture too')
    pane.runAnimationFrames()
  })

  it('the press has been interrupted -> Ctrl+Y arrives -> the redo lands', () => {
    // ⭐ THE CONTROL for the case above.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(BASE_DATE_LINE())
    const written = statusDateOf(loop)
    loop.receiveInput(UNDO())
    expect(statusDateOf(loop)).toBeNull()

    loop.receiveInput(pointer('down', centre.x, centre.y))
    loop.receiveInput(ESCAPE())
    expect(pressIsInFlight(loop)).toBe(false)

    loop.receiveInput(REDO())

    expect(statusDateOf(loop), 'RD-2: the redo put the undone document back').toBe(written)
    pane.runAnimationFrames()
  })
})

describe('AG-9 exempts the two gestures table T-027 leaves outside the undo record', () => {
  // ⛔ THESE TWO CASES ARE LEFT RED ON PURPOSE IF THEY FAIL.
  // 04-verification.md section 1 (MUST NOT): 期待値をコードに合わせて書き換えて
  // はならない。仕様が明確ならコードを直す（その文を引用する）.
  //
  // AG-9 of table T-035, quoted in full for the sentence these two hold:
  //   「人が画面で文書を変えるドラッグをしている間は、書き込みを拒否すること
  //    （MUST）。途中の状態へ書き込むと、離した瞬間に人の操作が上書きする。
  //    ⭐ パンと範囲選択は文書を変えないので拒否しない —— 対象は表 T-027 の
  //    取り消し対象行と一致させる。閲覧者が画面を送っている間ずっと `Agent API`
  //    が止まると、`FR-028` の「人間向け UI と同格」が成り立たない。」
  //
  // In English: PAN AND RANGE SELECTION DO NOT CHANGE THE DOCUMENT,
  // SO THEY ARE NOT REFUSED; what IS refused is to match table T-027's
  // undo-target rows. Pan is UN-8 (ズーム・スクロール・パン) and range
  // selection is UN-9 (選択) -- both 対象外, both therefore outside the set
  // AG-9 says to match. The stated cost of getting it wrong is FR-028's
  // 「人間向け UI と同格」: an Agent API that stops for as long as a reader
  // drags the view around is not the equal of the human UI.
  //
  // ⚠️ THE UNIT ALREADY KNOWS. `frame-loop.ts` carries a STOP where WS-2's
  // answer is built, and it names the missing PIECE rather than a missing will:
  // which row of table T-023a a press began is that table's decision order,
  // whose note keeps the order with `commandFromInput`, and PI-18 publishes no
  // way to ask it -- so a pan and a marquee are refused with the rest. ⛔ These
  // two cases stay red until that question has an owner, and they are NOT
  // softened to green: an implementation wider than the specification is a
  // finding, not a chore.

  it('a pan press (PD-1) is in flight -> SK-20 arrives -> the write lands', () => {
    // PD-1 of table T-023a: 中ボタンドラッグ、または `Ctrl` だけを伴う左ドラッグ
    // = パン。構えと当たりによらず優先する. So this press is a pan even though
    // it landed on a Task's plan bar -- and a pan is UN-8, 対象外, which AG-9
    // names as not refused.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const centre = planCentre(loop, 1)

    loop.receiveInput(pointer('down', centre.x, centre.y, { modifiers: { ctrl: true } }))

    loop.receiveInput(BASE_DATE_LINE())

    expect(
      statusDateOf(loop),
      'AG-9: a pan does not change the document, so the write must not be refused',
    ).not.toBeNull()
    pane.runAnimationFrames()
  })

  it('a range-selection press (PD-5) is in flight -> SK-20 arrives -> the write lands', () => {
    // PD-5 of table T-023a: 何にも当たらない かつ 構えていない = 範囲選択. A
    // selection is UN-9, 対象外, which AG-9 names as not refused.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const spot = emptySpot(loop)

    loop.receiveInput(pointer('down', spot.x, spot.y))

    loop.receiveInput(BASE_DATE_LINE())

    expect(
      statusDateOf(loop),
      'AG-9: a range selection does not change the document, so the write must not be refused',
    ).not.toBeNull()
    pane.runAnimationFrames()
  })
})
