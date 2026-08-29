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
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
} from '../../src/adapter/screen-renderer/screen-renderer'
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
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'
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

// ===========================================================================
// THE TWELVE ENTRANCES OF TABLE T-109 THAT SET A DISPLAY VALUE
// ===========================================================================
//
// A SECOND SUBJECT, AND IT IS HERE BECAUSE THE CURRENCY IS THE SAME: take an
// entry, then read `loop.document()`. Nothing else about the shell is publicly
// readable, and every one of these twelve writes a settings row.
//
// ⛔ WRITTEN WITHOUT READING THE BODY OF THE TRANSLATOR OR OF THE LOOP
// (docs/development-rules/04-verification.md section 1). What was read of
// `input-command-translator.ts`: its exported declarations alone -- `PressRow`,
// `PointerPress`, `InputContext`, `InPlaceTarget`, `InputAction`,
// `TranslatedInput` and the four signatures. What was read of
// `screen-surface.ts`: the members of `ScreenPart` and `ScreenSurface`. No
// function body was read, and no expected value below was taken from one.
//
// THE ROWS THESE CASES ANSWER TO.
//
//   FR-049 (MUST)     every row of table T-202 that carries a show/hide can be
//                     switched, and the plan/actual row (S-59) can be chosen
//                     from three values.
//   FR-049 (MUST NOT) not every row of table T-202 is a toggle -- only the rows
//                     whose type is boolean are. The multi-valued rows (S-59,
//                     S-66) and the rows holding a value of their own (S-58
//                     stackDirection, S-70 fontScale, S-65 dualCursor) are
//                     outside it.
//   FR-049 (MUST NOT) the plan and the actual may not BOTH be hidden -- a screen
//                     with not one bar on it looks broken.
//   FR-048            the guide cursor is one of S-66's four values, exclusive,
//                     and IC-46 .. IC-49 are the four entrances to it. Table
//                     T-109 spells WHICH value each of the four sets.
//   FR-039 (MUST NOT) a value saved in the document may not force the reader's
//                     choice, so IC-16 has to be able to leave a document saved
//                     as `dark` as well as one saved as `light`.
//   T-109 IC-4        S-69, on the `App Header`.
//   T-109 IC-8/IC-9   S-59, on the `App Header` -- show and hide the plan, and
//                     the actual. Table T-109 writes IC-9's setting as a
//                     reference back to IC-8 rather than repeating the row id.
//   T-109 IC-16       S-72, on the `App Header`.
//   T-109 IC-39/IC-40 S-64 / S-63, on the `Command Palette`.
//   T-109 IC-42/IC-43 S-67 / S-68, on the `Command Palette`.
//   T-109 IC-46 .. 49 S-66, on the `Command Palette`, one entrance per value.
//   T-103 U-31 / U-26 the settled names of the two surfaces they stand on.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because docs/spec does not decide it:
//   - what IC-8 does when the plan is the only thing showing (and IC-9 when the
//     actual is). FR-049 forbids the RESULT and names no substitute, so those
//     cases hold the MUST NOT and nothing more.
//   - whether these presses leave an undo step. UN-7 and UN-13 of table T-027
//     divide the rows between them, and no member of `FrameLoop` publishes the
//     history to read it from.

// ---------------------------------------------------------------------------
// Tables T-202, T-203, T-109 and T-103, read at read time rather than copied
// ---------------------------------------------------------------------------

/** Both settings tables print the key first, then the type, then the default. */
const SETTING_KEY = 0
const SETTING_TYPE = 1
const SETTING_DEFAULT = 2
/** Table T-109 prints the surface first, then the group, then what it is for. */
const T_109_SURFACE = 0
const T_109_ENTRANCE = 2
/** Table T-103 prints the settled English name first. */
const T_103_NAME = 0

/**
 * One cell of one row, by the position the table prints it in.
 *
 * ⭐ BY POSITION AND NOT BY HEADING: every heading in these four tables is
 * Japanese prose, which rule 03 section 5 keeps out of the tree. A guard case
 * below pins each table's column count, so a column inserted upstream reaches
 * this file rather than quietly shifting what is read.
 *
 * @purity pure
 */
const cellAt = (table: string, id: string, at: number): string => {
  const cell = rowOf(table, id).cells[at]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no cell ${at}`)
  return cell
}

/** Every `'value'` a cell spells inside a code span, in the order it spells them. */
const enumeratedValues = (cell: string): string[] =>
  [...cell.matchAll(/`'([^']+)'`/g)].map((found) => found[1] as string)

/** Table T-202's keys, in the order the manuscript prints them. */
const T_202_KEYS: readonly string[] = specTable('T-202').rows.map((row) =>
  bare(row.cells[SETTING_KEY] ?? ''),
)

/**
 * The type cell table T-202 gives a boolean row.
 *
 * ⭐ Taken from S-62 rather than typed out, so that the boolean rows are found
 * by comparing the manuscript with itself. Chapter 1.9 (:275) asks a test of a
 * requirement that points at a table to be driven by that table's own data, and
 * FR-049's MUST turns on exactly this column.
 */
const BOOLEAN_TYPE = cellAt('T-202', 'S-62', SETTING_TYPE)

/** The keys of table T-202 whose type is that one. */
const BOOLEAN_KEYS: readonly string[] = specTable('T-202')
  .rows.filter((row) => row.cells[SETTING_TYPE] === BOOLEAN_TYPE)
  .map((row) => bare(row.cells[SETTING_KEY] ?? ''))

/** What table T-202 prints in the default column, by key. */
const DEFAULT_OF = new Map(
  specTable('T-202').rows.map((row) => [
    bare(row.cells[SETTING_KEY] ?? ''),
    bare(row.cells[SETTING_DEFAULT] ?? ''),
  ]),
)

/**
 * The nine keys table T-202 gives a boolean type, spelled out.
 *
 * ⚠️ `watermarkVisible` is `S-144`, the row table T-202 gained on 2026-08-25.
 * Its entrance is `IC-41` of table T-109, and it is a boolean like the other
 * eight, so `FR-049`'s MUST reaches it: this list is the copy that says so.
 */
const EXPECTED_BOOLEAN_KEYS = [
  'assigneeVisible',
  'percentCompleteVisible',
  'dependencyVisible',
  'progressMarkerVisible',
  'progressLineVisible',
  'dateGridLinesVisible',
  'groupGridLinesVisible',
  'baselineVisible',
  'watermarkVisible',
]

/** S-59's three values, read out of its type cell. */
const PLAN_ACTUAL_VALUES = enumeratedValues(cellAt('T-202', 'S-59', SETTING_TYPE))
/** S-66's four, read out of its type cell -- FR-048 makes them exclusive. */
const GUIDE_VALUES = enumeratedValues(cellAt('T-202', 'S-66', SETTING_TYPE))
/** S-72's two, read out of its type cell in table T-203. */
const THEME_VALUES = enumeratedValues(cellAt('T-203', 'S-72', SETTING_TYPE))

/** The two surfaces of table T-103 these twelve stand on. */
const APP_HEADER = bare(cellAt('T-103', 'U-31', T_103_NAME))
const COMMAND_PALETTE = bare(cellAt('T-103', 'U-26', T_103_NAME))

/**
 * Whether S-59's value leaves the plan drawn, and whether it leaves the actual
 * drawn.
 *
 * ⭐ READ OFF THE VALUE NAMES THEMSELVES, which is where table T-202 puts the
 * meaning: `plan-only` is the plan alone, `actual-only` the actual alone. A
 * guard case below pins that those are still the two names.
 *
 * @purity pure
 */
const planIsShown = (value: string): boolean => value !== 'actual-only'
/** @purity pure */
const actualIsShown = (value: string): boolean => value !== 'plan-only'

// ---------------------------------------------------------------------------
// The twelve, as fixed data
// ---------------------------------------------------------------------------

interface Entrance {
  /** The row of table T-109. */
  readonly entry: string
  /** The surface it stands on, in table T-103's settled spelling. */
  readonly part: string
  /** The table that holds the row it moves. */
  readonly table: string
  /** The row of that table. */
  readonly row: string
  /** That row's key. */
  readonly key: string
}

const ENTRANCES: readonly Entrance[] = [
  { entry: 'IC-4', part: APP_HEADER, table: 'T-202', row: 'S-69', key: 'baselineVisible' },
  { entry: 'IC-8', part: APP_HEADER, table: 'T-202', row: 'S-59', key: 'planActualDisplay' },
  { entry: 'IC-9', part: APP_HEADER, table: 'T-202', row: 'S-59', key: 'planActualDisplay' },
  { entry: 'IC-16', part: APP_HEADER, table: 'T-203', row: 'S-72', key: 'themePreference' },
  {
    entry: 'IC-39',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-64',
    key: 'progressLineVisible',
  },
  {
    entry: 'IC-40',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-63',
    key: 'progressMarkerVisible',
  },
  {
    entry: 'IC-42',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-67',
    key: 'dateGridLinesVisible',
  },
  {
    entry: 'IC-43',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-68',
    key: 'groupGridLinesVisible',
  },
  { entry: 'IC-46', part: COMMAND_PALETTE, table: 'T-202', row: 'S-66', key: 'guideCursorMode' },
  { entry: 'IC-47', part: COMMAND_PALETTE, table: 'T-202', row: 'S-66', key: 'guideCursorMode' },
  { entry: 'IC-48', part: COMMAND_PALETTE, table: 'T-202', row: 'S-66', key: 'guideCursorMode' },
  { entry: 'IC-49', part: COMMAND_PALETTE, table: 'T-202', row: 'S-66', key: 'guideCursorMode' },
]

/**
 * The eight of the twelve whose own cell in table T-109 names the settings row.
 *
 * ⚠️ The other four do not name one: IC-9 refers back to IC-8, and IC-47 ..
 * IC-49 refer back to IC-46. A guard case pins that, so that a manuscript which
 * starts spelling them out reaches this file rather than being inferred past.
 */
const NAMES_ITS_OWN_ROW = new Set([
  'IC-4',
  'IC-8',
  'IC-16',
  'IC-39',
  'IC-40',
  'IC-42',
  'IC-43',
  'IC-46',
])

/** The five entrances whose row is one of table T-202's boolean ones. */
const BOOLEAN_ENTRANCES = ENTRANCES.filter((one) => BOOLEAN_KEYS.includes(one.key))

/**
 * The four guide-cursor entrances, each with the value table T-109 spells for
 * it -- the first `'value'` in its own cell.
 */
const GUIDE_ENTRANCES = ENTRANCES.filter((one) => one.row === 'S-66').map((one) => ({
  ...one,
  value: enumeratedValues(cellAt('T-109', one.entry, T_109_ENTRANCE))[0] ?? '',
}))

// ---------------------------------------------------------------------------
// The document these cases drive, and the screen they are taken on
// ---------------------------------------------------------------------------

/**
 * The two-row document with some of its settings put somewhere else.
 *
 * @purity pure
 */
function documentWithSettings(overrides: Record<string, unknown>): Document {
  const draft = twoRowDocument() as any
  return {
    ...draft,
    documentSettings: { ...draft.documentSettings, ...overrides },
  } as unknown as Document
}

/**
 * Every display row put somewhere OTHER than where the manuscript defaults it.
 *
 * ⛔ THE STARTING VALUES ARE THE POINT OF IT. FR-049's toggles are read off the
 * DOCUMENT, so a shell that kept a switch of its own -- starting at the default
 * and flipping from there -- would answer every case correctly on a document
 * that begins at the default and wrongly on one that does not. FR-039 states the
 * same thing for the sibling row S-72 in as many words: the saved value is the
 * STARTING value.
 *
 * ⚠️ S-59 is left where the template put it. The cases that drive it set it
 * themselves, one value at a time.
 */
const CONTRARY: Record<string, unknown> = {
  ...Object.fromEntries(BOOLEAN_KEYS.map((key) => [key, DEFAULT_OF.get(key) !== 'true'])),
  stackDirection: 'down',
  guideCursorMode: GUIDE_VALUES[1] ?? '',
  fontScale: 'L',
  themePreference: THEME_VALUES[1] ?? '',
}

interface Pane {
  readonly wiring: ScreenWiring
  /** What `readScreenPartAt` answers from now on. The case decides; the fake does not. */
  drawAt(part: ScreenPart | null): void
}

/**
 * IF-9's far side, stood in for.
 *
 * ⚠️ THE FAKE IS NOT THE TEST (R6.3). Chapter 5.3 states under table T-065 that
 * the side which DREW an entry is the side that says where it is, and no one
 * else may compute the same rectangle -- so a case that wants a press to land on
 * an entry says so here rather than aiming at a pixel.
 *
 * @purity non-pure
 */
function screenPane(language: DisplayLanguage = 'ja'): Pane {
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    // IF-9 also returns what a properties-panel field settled at.
    // Nothing here drives one, so there is never a commit to take.
    readFieldCommit: () => null,
    // IF-9's fifth answer. This fake draws no field, so nothing is unsettled.
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
  }
}

/**
 * Take one entry of table T-109.
 *
 * ⚠️ CS-2 of table T-066 settles a gesture on what was drawn AT THE PRESS, so
 * the surface is told what it has drawn before the button goes down, and IN-1 of
 * table T-028 makes the release the moment the operation is settled.
 *
 * @purity non-pure
 */
function takeEntry(loop: FrameLoop, pane: Pane, part: string, entry: string): void {
  pane.drawAt({ part, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  pane.drawAt(null)
}

interface Standing {
  readonly frames: Host
  readonly screen: Pane
  readonly loop: FrameLoop
}

/** @purity non-pure */
function standing(overrides: Record<string, unknown>): Standing {
  const frames = host()
  const screen = screenPane()
  const loop = frameLoop(frames.surface, documentWithSettings(overrides), SCREEN, screen.wiring)
  frames.runAnimationFrames()
  return { frames, screen, loop }
}

const settingsOf = (loop: FrameLoop): any => (loop.document() as any).documentSettings

/** Every row of table T-202 except one, as the document holds them now. */
const displayRowsExcept = (loop: FrameLoop, key: string): Record<string, unknown> => {
  const settings = settingsOf(loop)
  return Object.fromEntries(
    T_202_KEYS.filter((one) => one !== key).map((one) => [one, settings[one]]),
  )
}

/** Every key of the presentation group except one. */
const settingsExcept = (loop: FrameLoop, key: string): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(settingsOf(loop) as Record<string, unknown>).filter(([one]) => one !== key),
  )

// ===========================================================================

describe('FR-018 -- holding a zoom entrance down', () => {
  /** The ms figure a row of 表 T-206 states in its 既定 column. */
  const msOf = (id: string): number => {
    const cell = rowOf('T-206', id).by['既定'] ?? ''
    const found = /(\d+(?:\.\d+)?)\s*ms/.exec(cell)
    if (found === null) throw new Error(`表 T-206 row ${id} states no ms value: ${cell}`)
    return Number(found[1])
  }

  it('表 T-206 holds the wait and the tick, and the wait is the longer of the two', () => {
    // FR-018 (MUST): 「待ち時間は刻みより長いこと（MUST）」 —— 「逆にすると
    // 最初の 1 回が連続の一部に見える」. ⛔ This is the one half of the rule
    // that can be settled without pressing anything, and it is settled here.
    expect(msOf('S-172')).toBeGreaterThan(msOf('S-173'))
  })

  it('⛔ the pair is kept OUT of the document, in 表 T-206 and not 表 T-212', () => {
    // 表 T-206 is 「保存しないもの」. A saved wait would let one author's
    // document decide how the press feels in the hands of whoever was handed it.
    expect(specTable('T-206').caption).toContain('保存しないもの')
    expect(specTable('T-212').rows.map((row) => row.id)).not.toContain('S-172')
    expect(specTable('T-212').rows.map((row) => row.id)).not.toContain('S-173')
  })

  it('the requirement names the four entrances that repeat, and no others', () => {
    // FR-018 (MUST): 「繰り返す入口は … 表 T-109 の `IC-12` 〜 `IC-15` に限ること
    // （MUST）」 —— 「`IC-10`（全体表示）と `IC-11`（全画面）は繰り返しても
    // 同じ結果にしかならない」.
    const requirements = readFileSync(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    )
    expect(requirements).toContain('繰り返す入口は')
    expect(requirements).toContain('S-172')
    expect(requirements).toContain('S-173')
    for (const row of ['IC-12', 'IC-13', 'IC-14', 'IC-15']) {
      expect(specTable('T-109').rows.map((one) => one.id)).toContain(row)
    }
  })

  // ⛔ NOT IMPLEMENTED, AND SKIPPED RATHER THAN LEFT RED. FR-018 (MUST) asks
  // that holding one of IC-12 .. IC-15 keep stepping the zoom after S-172 at
  // S-173, and (MUST NOT) forbids the shape that steps once. Nothing in `src/`
  // repeats a press: `receiveInput` sees a down and an up and nothing between
  // them, and no clock in this layer counts a hold. ⚠ This case is here so the
  // gap is named where the entrances are driven, not so it can pass today --
  // unskip it when the repeat lands.
  it.skip('FR-018 (MUST): holding IC-13 keeps stepping the zoom after S-172, at S-173', () => {
    expect.unreachable('FR-018 -- the press that repeats is not implemented')
  })
})

describe('the tables these twelve entrances are driven by', () => {
  it('the four tables print the columns this file reads by position', () => {
    expect(specTable('T-202').headings.length).toBe(5)
    expect(bare(cellAt('T-202', 'S-62', SETTING_KEY))).toBe('dependencyVisible')
    expect(specTable('T-203').headings.length).toBe(7)
    expect(bare(cellAt('T-203', 'S-72', SETTING_KEY))).toBe('themePreference')
    // ⚠️ SIX, NOT FIVE, SINCE 構え WAS APPENDED AFTER 正. Table T-109's preamble
    // states the new column and why it stands in the table at all:
    // 「⭐ **`構え` の欄は、その入口が押されたときポインタが入る 表 T-023b の行
    // である。**」 ⛔ The count alone would sleep through a column inserted in
    // the middle while another is dropped -- which is the one shift `cellAt`
    // read by position cannot survive -- so both positions this file reads are
    // pinned by what stands in them, the way T-202 and T-203 are above.
    expect(specTable('T-109').headings.length).toBe(6)
    expect(bare(cellAt('T-109', 'IC-16', T_109_SURFACE))).toBe(APP_HEADER)
    expect(cellAt('T-109', 'IC-16', T_109_ENTRANCE)).toContain('`S-72`')
    expect(specTable('T-103').headings.length).toBe(3)
  })

  it('table T-202 gives exactly nine of its fourteen rows a boolean type', () => {
    // FR-049 (MUST): the set the requirement names is this one, so a row added
    // or retyped upstream has to reach this file. `S-144` (`watermarkVisible`)
    // is the row that arrived on 2026-08-25, taking the booleans 8 -> 9 and the
    // table 13 -> 14; the five that are not booleans are S-58, S-59, S-65,
    // S-66 and S-70.
    expect([...BOOLEAN_KEYS].sort()).toEqual([...EXPECTED_BOOLEAN_KEYS].sort())
    expect(T_202_KEYS.length).toBe(14)
  })

  it('the multi-valued rows spell the values these cases drive', () => {
    expect(PLAN_ACTUAL_VALUES).toEqual(['both', 'plan-only', 'actual-only'])
    expect(GUIDE_VALUES).toEqual(['none', 'crosshair', 'single-vertical', 'double-vertical'])
    expect(THEME_VALUES).toEqual(['light', 'dark'])
  })

  it('each of the twelve stands on the surface table T-109 puts it on', () => {
    expect(APP_HEADER).toBe('App Header')
    expect(COMMAND_PALETTE).toBe('Command Palette')
    for (const one of ENTRANCES) {
      expect(bare(cellAt('T-109', one.entry, T_109_SURFACE)), one.entry).toBe(one.part)
    }
  })

  it('each of the twelve is joined to the settings row this file pairs it with', () => {
    for (const one of ENTRANCES) {
      const cell = cellAt('T-109', one.entry, T_109_ENTRANCE)
      if (NAMES_ITS_OWN_ROW.has(one.entry)) {
        expect(cell, `${one.entry} no longer names ${one.row}`).toContain('`' + one.row + '`')
      } else {
        expect(
          /`S-\d+`/.test(cell),
          `${one.entry} now names a settings row of its own, so this file may not infer it`,
        ).toBe(false)
      }
      expect(bare(cellAt(one.table, one.row, SETTING_KEY)), one.row).toBe(one.key)
    }
  })

  it('the four guide-cursor entrances spell the four values of S-66, one each', () => {
    // FR-048 makes S-66 exclusive and table T-109 gives it one entrance per
    // value, so the four entrances and the four values are the same set.
    expect(GUIDE_ENTRANCES.map((one) => one.value)).toEqual(GUIDE_VALUES)
  })

  it('the contrary document is a valid GRS JSON document', () => {
    const report = validateDocument(documentWithSettings(CONTRARY))
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('the contrary document really does begin away from every default', () => {
    // ⛔ A premise of every case below. If a starting value happened to equal
    // the manuscript's default, the case resting on it would stop telling a
    // value read from the document from a value the shell held itself.
    const run = standing(CONTRARY)
    const settings = settingsOf(run.loop)
    for (const key of BOOLEAN_KEYS) {
      expect(String(settings[key]), key).not.toBe(DEFAULT_OF.get(key))
    }
    expect(settings.guideCursorMode).not.toBe(GUIDE_VALUES[0])
    expect(settings.themePreference).not.toBe(THEME_VALUES[0])
    run.frames.runAnimationFrames()
  })
})

describe('IC-46 .. IC-49 -- each guide-cursor entrance sets the value table T-109 spells', () => {
  // FR-048 makes S-66 one of four, exclusive. Table T-109 gives each value an
  // entrance of its own, so an entrance SETS a value: it does not cycle, and
  // where the row stood before does not change where it lands.
  for (const entrance of GUIDE_ENTRANCES) {
    for (const from of GUIDE_VALUES) {
      it(`${entrance.entry} puts guideCursorMode at ${entrance.value}, starting from ${from}`, () => {
        const run = standing({ ...CONTRARY, guideCursorMode: from })
        expect(settingsOf(run.loop).guideCursorMode, 'the premise').toBe(from)

        takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

        expect(
          settingsOf(run.loop).guideCursorMode,
          `table T-109 ${entrance.entry}: this entrance sets ${entrance.value}`,
        ).toBe(entrance.value)
        run.frames.runAnimationFrames()
      })
    }
  }
})

describe('IC-4 / IC-39 / IC-40 / IC-42 / IC-43 -- the boolean entrances flip the DOCUMENT value', () => {
  // FR-049 (MUST): the rows of table T-202 whose type is boolean can be
  // switched, and table T-109 says of each of these five that it shows and
  // hides. FR-039 states the principle these cases turn on for the sibling row
  // S-72: the saved value is the STARTING value -- so what a press flips is what
  // the DOCUMENT holds, never a value the shell began at.
  for (const entrance of BOOLEAN_ENTRANCES) {
    for (const from of [false, true]) {
      it(`${entrance.entry} turns ${entrance.key} to ${!from} when the document holds ${from}`, () => {
        const run = standing({ ...CONTRARY, [entrance.key]: from })
        expect(settingsOf(run.loop)[entrance.key], 'the premise').toBe(from)

        takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

        expect(
          settingsOf(run.loop)[entrance.key],
          `table T-109 ${entrance.entry} shows and hides ${entrance.row}, read from the document`,
        ).toBe(!from)
        run.frames.runAnimationFrames()
      })
    }

    it(`${entrance.entry} taken twice leaves ${entrance.key} where it began`, () => {
      const run = standing(CONTRARY)
      const began = settingsOf(run.loop)[entrance.key]

      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)
      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

      expect(settingsOf(run.loop)[entrance.key], 'a switch is its own inverse').toBe(began)
      run.frames.runAnimationFrames()
    })
  }
})

describe('IC-16 -- the theme entrance leaves a document saved either way (FR-039)', () => {
  // FR-039 (MUST NOT): a value saved in the document may not force the reader's
  // choice. S-72 has two values, table T-109 gives it ONE entrance, and no
  // surface of table T-103 offers a choice between them -- so a document saved
  // as `dark` whose one entrance could not reach `light` would be exactly the
  // saved value forcing the reader's that the MUST NOT forbids.
  for (const [index, from] of THEME_VALUES.entries()) {
    const to = THEME_VALUES[1 - index] as string
    it(`takes a document saved as ${from} to ${to}`, () => {
      const run = standing({ ...CONTRARY, themePreference: from })
      expect(settingsOf(run.loop).themePreference, 'the premise').toBe(from)

      takeEntry(run.loop, run.screen, APP_HEADER, 'IC-16')

      expect(
        settingsOf(run.loop).themePreference,
        'FR-039 (MUST NOT): the saved value is the starting value, not a cage',
      ).toBe(to)
      run.frames.runAnimationFrames()
    })
  }
})

describe('IC-8 / IC-9 -- the four transitions of S-59 that table T-109 spells', () => {
  // FR-049 (MUST): S-59 can be chosen from three values. Table T-109 divides the
  // choosing between two entrances -- IC-8 shows and hides the PLAN, IC-9 the
  // ACTUAL -- so from the value that shows both, each of them hides its own
  // half, and from the value that has its own half hidden, each shows it again.
  const [BOTH, PLAN_ONLY, ACTUAL_ONLY] = PLAN_ACTUAL_VALUES as [string, string, string]

  const spelled: readonly (readonly [string, string, string])[] = [
    [BOTH, 'IC-8', ACTUAL_ONLY],
    [BOTH, 'IC-9', PLAN_ONLY],
    [ACTUAL_ONLY, 'IC-8', BOTH],
    [PLAN_ONLY, 'IC-9', BOTH],
  ]

  for (const [from, entry, to] of spelled) {
    it(`${entry} takes ${from} to ${to}`, () => {
      const run = standing({ ...CONTRARY, planActualDisplay: from })
      expect(settingsOf(run.loop).planActualDisplay, 'the premise').toBe(from)

      takeEntry(run.loop, run.screen, APP_HEADER, entry)

      expect(
        settingsOf(run.loop).planActualDisplay,
        `table T-109 ${entry} shows and hides its own half of S-59`,
      ).toBe(to)
      run.frames.runAnimationFrames()
    })
  }
})

describe('FR-049 (MUST NOT) -- the plan and the actual are never both hidden', () => {
  // ⛔ EVERY ONE OF S-59's THREE VALUES THROUGH BOTH ENTRANCES. Two of the six
  // are the transition the MUST NOT is about: IC-8 hiding the plan while the
  // plan is the only thing showing, and IC-9 hiding the actual while the actual
  // is. What GRS does INSTEAD is not decided anywhere in docs/spec, so these
  // cases hold the forbidden result and nothing else -- including that the
  // document is still one the schema admits, which is what catches a value
  // outside the three being written to mean "neither".
  for (const from of PLAN_ACTUAL_VALUES) {
    for (const entry of ['IC-8', 'IC-9']) {
      it(`${entry} taken while S-59 holds ${from} leaves at least one of the two drawn`, () => {
        const run = standing({ ...CONTRARY, planActualDisplay: from })
        expect(settingsOf(run.loop).planActualDisplay, 'the premise').toBe(from)

        takeEntry(run.loop, run.screen, APP_HEADER, entry)

        const after = settingsOf(run.loop).planActualDisplay
        expect(
          PLAN_ACTUAL_VALUES,
          `FR-049: S-59 is an enumeration of three, and ${entry} wrote ${String(after)}`,
        ).toContain(after)
        expect(
          planIsShown(after) || actualIsShown(after),
          'FR-049 (MUST NOT): a screen with not one bar on it looks broken',
        ).toBe(true)
        expect(
          validateDocument(run.loop.document()).valid,
          'the document the press left is still one the schema admits',
        ).toBe(true)
        run.frames.runAnimationFrames()
      })
    }
  }
})

describe('FR-049 (MUST) -- only a boolean row is a toggle, so nothing else in T-202 moves', () => {
  // FR-049 (MUST NOT): not every row of table T-202 may be treated as a toggle;
  // (MUST): the rows whose type is boolean are the whole of the target. The
  // multi-valued rows and the rows that hold a value of their own are outside
  // it.
  //
  // ⭐ THE ROW EACH ENTRANCE NAMES IS LEFT OUT of the comparison and every other
  // row of table T-202 is in it -- so S-58 (stackDirection), S-65 (dualCursor)
  // and S-70 (fontScale) are compared for all twelve, and IC-16 is compared on
  // ALL THIRTEEN rows because S-72 is not a row of table T-202 at all.
  for (const entrance of ENTRANCES) {
    const spared = entrance.table === 'T-202' ? entrance.key : ''
    it(`${entrance.entry} moves no row of table T-202 other than ${entrance.row}`, () => {
      const run = standing(CONTRARY)
      const before = displayRowsExcept(run.loop, spared)

      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

      expect(
        displayRowsExcept(run.loop, spared),
        `FR-049 (MUST): ${entrance.entry} is an entrance to ${entrance.row} alone`,
      ).toEqual(before)
      run.frames.runAnimationFrames()
    })
  }
})

describe('an entrance moves its own key and no other key of the presentation group', () => {
  // ⭐ THE SAME MUST, ASKED OF THE WHOLE GROUP rather than of table T-202's
  // thirteen rows. FR-049 makes the boolean rows the whole of what a toggle may
  // reach, and FR-041 (MUST NOT) forbids a solved colour from being saved at
  // all -- 派生する色を保存してはならない -- so IC-16 in particular may move
  // S-72 and nothing beside it. DR-3 of table T-052 is the group being compared.
  for (const entrance of ENTRANCES) {
    it(`${entrance.entry} leaves every settings key but ${entrance.key} where it stood`, () => {
      const run = standing(CONTRARY)
      const before = settingsExcept(run.loop, entrance.key)

      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

      expect(
        settingsExcept(run.loop, entrance.key),
        `${entrance.entry} wrote a key that is not ${entrance.key}`,
      ).toEqual(before)
      run.frames.runAnimationFrames()
    })
  }
})
