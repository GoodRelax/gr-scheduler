// The CLOSING RULE of table T-023 -- the paragraph after the `MK-` rows: while
// a surface stands over the schedule, the wheel is the browser's, and the keys
// are still this tool's.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). ⭐ THIS LEVEL AND NOT THE TRANSLATOR'S, for the reason the rule
// itself gives: it names TWO things that can stand -- 「`Confirmation`（`U-55`）
// または `ScreenState` が持つ面」 -- and only one of them is a value the
// translator holds. `Confirmation` is held beside `ScreenState` by the
// Framework (LY-5 of table T-060), so the loop is the only side that can be
// asked about both, and `FrameLoop.isBrowserDefaultStopped` is where the answer
// MK-10 owes is published.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1: 読んでよいのは冒頭の宣言・公開する型・署名まで).
// What was read under `src/`: the exported declarations of `frame-loop.ts`
// (`FrameEnvironment`, `FrameLoop`, `ScreenWiring`) and the signature
// `frameLoop(surface, first, env, screen?, …)`; the exported types of
// `screen-renderer.ts` (`DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
// `ScreenView`) and of `input-command-translator.ts` (`HumanInput`,
// `InputModifiers`, `KeyInput`, `WheelInput`). ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. `host` / `screenPane` / `stage` / `key`
// and the template-based document come from tests/unit/in-4-escape-closes-the-
// panel.test.ts and tests/unit/uf-48-input.test.ts, which drive this same unit;
// `wheelOf` is tests/unit/mk-wheel-scrolling.test.ts's, which drives the same
// five rows one seam lower.
//
// ---------------------------------------------------------------------------
// THE RULE THESE CASES ANSWER TO (read at run time, never copied into a value)
// ---------------------------------------------------------------------------
//
//   T-023, the paragraph after the `MK-` rows (docs/spec/01-04-requirements.md):
//     「**`Confirmation`（`U-55`）または `ScreenState` が持つ面が立っているあいだ、
//       ホイールの割当（`MK-1` 〜 `MK-5`。本表のホイールの行はこの 5 つで全部
//       である）を当てず、ブラウザの既定動作へ渡すこと（MUST）**（利用者の裁定
//       2026-08-29）—— ⛔ **当てると面の中が読めなくなる。**…⚠️ **素の `MK-1` に
//       `MK-10` は届かない** —— 同行の主語は…「**本ツールが割り当てた**修飾キー
//       の付いた入力」であり、修飾キーを伴わない入力については何も述べていない。
//       ⛔⛔ **`MK-2` 〜 `MK-5` には届く。本規則はその例外である（MUST）** —— …
//       **面が立っているあいだに限り本規則を優先する。**⚠️ **面が立っていないあいだの
//       `MK-10` は 1 文字も変わらない。**⭐ **5 つを分けない理由**: 同じ面の上で、
//       素のホイールは面の中を送り、修飾を足したホイールは日程を動かす、という絵は
//       読む人に説明できない。⛔ **キーの割当は本規則の対象ではない（MUST NOT）** ——
//       表 T-028 の `IN-4` が面の上で `Esc` を要求しており、キーまで渡すと面を閉じる
//       手立てが消える。…」
//
//   T-023  the wheel rows   ⭐ EXPANDED FROM THE RULE'S OWN RANGE against the
//                table's own row order, and then CHECKED AGAINST THE TABLE: the
//                rule claims 「本表のホイールの行はこの 5 つで全部である」, so the
//                premise below derives the wheel rows from the table's own 操作
//                column and requires the range to be exactly them. ⛔ NO COUNT AND
//                NO LIST OF IDS IS TYPED, so a sixth wheel row added outside the
//                range fails here instead of passing.
//                ⚠️ MK-9 (「ホイールを持たない環境」) IS NOT ONE OF THEM: its 操作
//                column names an environment rather than a turn, and its 動作 asks
//                for on-screen buttons. The derivation says so by its shape --
//                a wheel row ENDS by naming the wheel -- and not by naming MK-9.
//   T-023  MK-10  「本ツールが割り当てた修飾キーの付いた入力 | ブラウザの既定動作を
//                画面全体で止めること（MUST）」 -- which the closing rule now names
//                itself an exception to, in force ONLY while a surface stands.
//                ⭐ BOTH HALVES ARE CASES BELOW: a modified turn is stopped while
//                no surface stands, and handed over while one does.
//   T-028  IN-4   「`Esc` は閉じる対象または取り消す対象があるときだけ 1 階層ぶん消費
//                し、無ければブラウザへ渡すこと。**消費する階層は …… 開いている面
//                → …… の順とすること（MUST）**」 -- the rule's own stated reason for
//                keeping the keys.
//   T-028  IN-4a  「**消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）**」
//                -- which is what makes the `Esc` cases below able to fail.
//   T-036  SK-13  「ヘルプを開く | `F1`」 -- the one surface these cases can raise
//                without drawing anything, and `ScreenState` is what holds it.
//   T-036  SK-8 / SK-11   `Esc` / `Ctrl+S` -- the two keys pressed below.
//   FR-032        「行を削除するとき、および WBS の子孫を持つ `Task` を削除するとき
//                は確認を求めること」 -- how a real `Confirmation` (U-55) is raised
//                from outside, so that the OTHER half of the rule's subject is
//                driven and not merely named.
//   FR-051        「表示位置が変わったときは …… `S-77` と `S-78` が新しい表示位置を
//                指すようにすること（MUST）」 and FR-016's zoom -- which is why
//                「the assignment was applied」 can be read off the document at
//                all: all four rows write into `documentSettings`.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. ⭐ RESOLVED -- AND THE TRIPWIRE IS WHAT FOUND IT. This file first stood
//      while the rule's range stopped at MK-4, with MK-5 (`Ctrl` ＋ `Shift` ＋
//      ホイール, 横スクロール) a wheel assignment it did not name. Two readings
//      were arguable and neither was written, so no case stated what MK-5 did
//      and the premise asserted only that the range stopped where it stopped.
//      The manuscript now reads 「`MK-1` 〜 `MK-5`。本表のホイールの行はこの 5
//      つで全部である」 and settles the MK-10 conflict outright, so MK-5 is
//      walked below exactly like the other four, and the premise now measures
//      the range against the table's own wheel rows instead of against a number.
//      ⛔ NOTHING ABOUT THE WHEEL ROWS IS LEFT UNASSERTED.
//   2. HOW FAR a turn would have scrolled or zoomed. No row anywhere states it
//      (see the head of tests/unit/mk-wheel-scrolling.test.ts), so the free
//      control asks only THAT the document moved.
//   3. WHICH of the two surfaces `Esc` spends its level on when both stand at
//      once. IN-4 orders the LEVELS against each other and never orders two 面
//      against each other; no case below raises two.
//   4. WHAT `Ctrl+S` DOES while a surface stands -- only that the browser's own
//      behaviour is still stopped, which is MK-10's MUST and is untouched by
//      this rule. Whether the save should be refused while a surface stands is
//      not written anywhere and is not asserted.
//   5. THE POINTER. The rule is about the wheel and the keys; PD-1 〜 PD-5 of
//      table T-023a are not in its subject and nothing here presses a button.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  WheelInput,
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
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// What the manuscript says, read at run time rather than copied
// ===========================================================================

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').split('\n')

/** The one line that carries the closing rule, found by the words it opens with. */
function closingRuleLine(): string {
  const found = REQUIREMENTS.find((line) => line.startsWith('**`Confirmation`（`U-55`）または'))
  if (found === undefined) {
    throw new Error('table T-023 no longer states the closing rule this file is about')
  }
  return found
}

/** The half of the rule that names what is handed over -- everything before 「を当てず」. */
function handedOverSegment(): string {
  const rule = closingRuleLine()
  const at = rule.indexOf('を当てず')
  if (at < 0) throw new Error('the closing rule no longer says 「を当てず」')
  return rule.slice(0, at)
}

const T_023 = specTable('T-023')

/**
 * One cell of the table, whole.
 *
 * ⚠️ NOT `bare`, which answers the FIRST code span of a cell -- right for a cell
 * that is one value, wrong for an 操作 column that is a sentence. Here only the
 * emphasis marks come off.
 */
const plain = (cell: string): string => cell.replace(/[`*]/g, '').trim()

/**
 * The rows of table T-023 whose 操作 column names a TURN OF THE WHEEL.
 *
 * ⭐ THE SHAPE, NOT A LIST OF IDS. A wheel row ends by naming the wheel --
 * 「Ctrl ＋ ホイール」 -- and MK-1 says the same with a trailing note about the
 * modifiers it does not carry, 「ホイール（修飾なし）」. ⛔ MK-9 is therefore not
 * one: 「ホイールを持たない環境」 names an environment, and its 動作 column asks
 * for on-screen buttons rather than for a turn.
 * ⚠️ This is what the closing rule's own claim -- 「本表のホイールの行はこの 5 つで
 * 全部である」 -- is measured against, so that a sixth row added outside the range
 * fails the premise instead of slipping past it.
 */
function wheelRowsOfTable(): readonly string[] {
  return T_023.rows
    .filter((row) => plain(row.by['操作'] ?? '').replace(/（[^）]*）$/, '').endsWith('ホイール'))
    .map((row) => row.id)
}

/**
 * The rows the rule hands over, expanded from the range it prints against the
 * table's own order.
 *
 * ⭐ READ AND NOT TYPED, for the reason rule 03 gives: a list of four ids
 * written down here would go on passing after the rule had gained or lost a
 * row, which is exactly the regression this file exists to catch.
 */
function handedOverRows(): readonly string[] {
  const named = handedOverSegment().match(/MK-\d+[a-z]?/g) ?? []
  if (named.length !== 2) {
    throw new Error(
      `the closing rule no longer names a range of two rows: ${JSON.stringify(named)}`,
    )
  }
  const ids = T_023.rows.map((row) => row.id)
  const from = ids.indexOf(named[0] as string)
  const to = ids.indexOf(named[1] as string)
  if (from < 0 || to < 0 || to < from) {
    throw new Error(`table T-023 does not run from ${named[0]} to ${named[1]}`)
  }
  return ids.slice(from, to + 1)
}

/**
 * One handed-over row as a turn of the wheel: its id and the modifiers its own
 * 操作 column spells.
 *
 * ⚠️ The modifiers are READ OFF THE CELL rather than remembered here -- 「Ctrl ＋
 * ホイール」 carries `Ctrl` and nothing else -- and a premise below checks that
 * every row in the range really is a wheel row and that the four spellings are
 * different from one another.
 */
interface WheelRow {
  readonly row: string
  readonly operation: string
  readonly modifiers: InputModifiers
}

function wheelRows(): readonly WheelRow[] {
  return handedOverRows().map((id) => {
    const row = T_023.rows.find((one) => one.id === id)
    if (row === undefined) throw new Error(`table T-023 has no row ${id}`)
    const operation = plain(row.by['操作'] ?? '')
    return {
      row: id,
      operation,
      modifiers: {
        ctrl: operation.includes('Ctrl'),
        shift: operation.includes('Shift'),
        alt: operation.includes('Alt'),
        meta: false,
      },
    }
  })
}

const HANDED_OVER = wheelRows()

/** One row of table T-036, as the manuscript spells its assignment. */
const assignmentOf = (row: string): string => {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return bare(found.by['割当'] ?? '')
}

// ===========================================================================
// The document these cases drive
// ===========================================================================

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of.
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

/** The Task FR-032 asks a question about, because it has a WBS descendant. */
const PARENT = 1
const CHILD = 2

/**
 * Two rows and two Tasks, the second a WBS child of the first.
 *
 * ⭐ THE WBS EDGE IS THE WHOLE POINT OF THE FIXTURE: FR-032 makes deleting a
 * `Task` with WBS descendants ask for confirmation, and that question is the
 * only `Confirmation` (U-55) these cases can raise without drawing a panel.
 */
function twoRowDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (
    uid: number,
    wbsParentUid: number | null,
    start: string,
    finish: string,
    name: string,
  ): Task =>
    ({
      uid,
      wbsParentUid,
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
    }) as unknown as Task
  const row = (id: string, label: string, order: number) => ({
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
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task(PARENT, null, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(CHILD, PARENT, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, 'Alpha', 0), row(BETA, 'Beta', 1)],
      taskGroupMembers: [
        { taskUid: PARENT, groupId: ALPHA, stackOrder: null },
        { taskUid: CHILD, groupId: BETA, stackOrder: null },
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
  } as unknown as Document
}

// ===========================================================================
// The host UF-48 is given
// ===========================================================================

/** BO-1 of table T-077 has already settled these by the time a loop exists. */
const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`. ⛔ Nothing in this fake decides
 * anything about a wheel.
 */
function host() {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: (): void => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

function screenPane(language: DisplayLanguage = 'ja') {
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
    wiring: { surface, language } satisfies ScreenWiring,
    last: (): ScreenView => {
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

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

/** The rows of table T-036 these cases press. */
const ESCAPE = (): HumanInput => key('Esc')
const OPEN_HELP = (): HumanInput => key('F1')
const SELECT_ALL = (): HumanInput => key('A', { ctrl: true })
const DELETE = (): HumanInput => key('Delete')
const SAVE = (): HumanInput => key('S', { ctrl: true })

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  /** One turn of the wheel over the `Row Area`, spelt for one handed-over row. */
  wheel(modifiers: InputModifiers): WheelInput
  /** MK-10's answer for one happening, asked before the loop hears it. */
  stops(input: HumanInput): boolean
  /** Everything the document holds, as one string, so a case can ask 「did it move」. */
  snapshot(): string
  /** Whether a 面 `ScreenState` holds is on the screen. */
  modalIsUp(): boolean
  /** Whether a `Confirmation` (U-55) is standing. */
  confirmationIsUp(): boolean
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, twoRowDocument(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const regions = () => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    return values.regions
  }
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    /**
     * `scrollPx` is what the seam declares it to be -- how far the host would
     * have scrolled -- and `notches` carries the same sign. ⛔ The magnitude is
     * the caller's, never the specification's.
     */
    wheel: (modifiers) => ({
      kind: 'wheel',
      x: regions().rowArea.x + 40,
      y: regions().rowArea.y + 40,
      modifiers,
      notches: 1,
      scrollPx: { x: 0, y: 120 },
    }),
    stops: (input) => loop.isBrowserDefaultStopped(input),
    snapshot: () => JSON.stringify(loop.document()),
    modalIsUp: () => (screen.last() as any).openModal !== null,
    confirmationIsUp: () => (screen.last() as any).confirmation !== null,
  }
}

/** A loop with the one surface `ScreenState` holds that SK-13 can raise. */
function withTheHelpUp(): Stage {
  const built = stage()
  built.send(OPEN_HELP())
  return built
}

/**
 * A loop with a real `Confirmation` (U-55) standing.
 *
 * ⭐ RAISED THE WAY FR-032 RAISES ONE: the selection holds a `Task` with a WBS
 * descendant, and SK-3's `Delete` therefore has to ask before it goes on.
 */
function withAConfirmationUp(): Stage {
  const built = stage()
  built.send(SELECT_ALL())
  built.send(DELETE())
  return built
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ table T-023 still closes with the rule this file is about', () => {
    // ⛔ WITHOUT THIS, A RULE THAT HAD BEEN REWORDED OR WITHDRAWN WOULD LEAVE
    // every case below testing a habit instead of a requirement.
    const rule = closingRuleLine()
    expect(rule, 'it still names both things that can stand').toContain('`ScreenState` が持つ面')
    expect(rule, 'the MUST').toContain('ブラウザの既定動作へ渡すこと（MUST）')
    expect(rule, 'the MUST NOT about the keys').toContain(
      'キーの割当は本規則の対象ではない（MUST NOT）',
    )
    expect(rule, 'and IN-4 is still the reason it gives').toContain('表 T-028 の `IN-4`')
  })

  it('the range the rule prints is exactly the wheel rows table T-023 carries', () => {
    // 「ホイールの割当（`MK-1` 〜 `MK-5`。本表のホイールの行はこの 5 つで全部である）」
    // ⭐ BOTH SIDES ARE READ, NEITHER IS TYPED: the left is the range expanded
    // against the table's row order, the right is every row whose 操作 column
    // names a turn. ⛔ A wheel row added OUTSIDE the range -- the hole this file
    // was first written around -- fails here, and so does a range that reached
    // past the wheel rows into a row that is not one.
    const derived = wheelRowsOfTable()
    expect(derived.length, 'table T-023 still has wheel rows to walk').toBeGreaterThan(0)
    expect(HANDED_OVER.map((one) => one.row)).toEqual(derived)
    for (const one of HANDED_OVER) {
      expect(one.operation, `${one.row} is a wheel row`).toContain('ホイール')
    }
    // ⚠️ AND THE DERIVATION IS NOT A HOLLOW ONE. MK-9's 操作 column also carries
    // the word 「ホイール」 -- 「ホイールを持たない環境」 -- and it is not a turn;
    // a predicate that had merely searched for the word would sweep it in and
    // then disagree with the rule's own census.
    expect(derived, 'the row that names the ABSENCE of a wheel is not one').not.toContain('MK-9')
    expect(
      plain(T_023.rows.find((one) => one.id === 'MK-9')?.by['操作'] ?? ''),
      'and it is still the row that would have been swept in',
    ).toContain('ホイール')
  })

  it('the turns are told apart by the modifiers their own row spells', () => {
    // MK-1 「ホイール（修飾なし）」 carries none; every other row carries a
    // combination of its own -- otherwise the walk below would be pressing the
    // same turn several times over and counting it as several rows.
    const spellings = HANDED_OVER.map((one) => JSON.stringify(one.modifiers))
    expect(new Set(spellings).size, 'one turn per row').toBe(HANDED_OVER.length)
    const unmodified = HANDED_OVER.filter(
      (one) => !one.modifiers.ctrl && !one.modifiers.shift && !one.modifiers.alt,
    )
    expect(unmodified.map((one) => one.row), 'exactly one bare turn').toEqual(['MK-1'])
  })

  it('the keys these cases press are still the ones table T-036 assigns', () => {
    expect(assignmentOf('SK-13')).toBe('F1')
    expect(assignmentOf('SK-8')).toBe('Esc')
    expect(assignmentOf('SK-11')).toBe('Ctrl+S')
  })

  it('the fixture is a valid GRS JSON document with a WBS parent on it', () => {
    const made = twoRowDocument()
    const report = validateDocument(made)
    expect(report.errors).toEqual([])
    expect((made as any).schedule.tasks[1].wbsParentUid).toBe(PARENT)
  })
})

describe('the two ways a surface can stand, and the state with none', () => {
  it('SK-13: `F1` puts up a 面 that `ScreenState` holds', () => {
    const built = withTheHelpUp()
    expect(built.modalIsUp()).toBe(true)
  })

  it('FR-032: deleting a `Task` with WBS descendants raises a `Confirmation`', () => {
    const built = withAConfirmationUp()
    expect(built.confirmationIsUp()).toBe(true)
    // ⭐ AND THE DELETION HAS NOT LANDED, which is what makes the question a
    // question -- so a wheel refused below is refused by the rule and not by a
    // schedule that has nothing left to scroll.
    expect((built.loop.document() as any).schedule.tasks).toHaveLength(2)
  })

  it('⭐ with nothing standing, every handed-over turn DOES move the document', () => {
    // ⛔ THE CONTROL SECTION 2 OF 04-verification ASKS FOR. A build that refused
    // every wheel always would pass the cases below without meaning anything.
    // MK-1 is 「縦スクロール」 and MK-5 「横スクロール」, and FR-051 (MUST) has a
    // changed position land in `S-77` / `S-78`; MK-2 〜 MK-4 are zooms and land in
    // the zoom keys -- either way the document is where the assignment shows.
    for (const one of HANDED_OVER) {
      const built = stage()
      const before = built.snapshot()
      built.send(built.wheel(one.modifiers))
      expect(built.snapshot(), `${one.row} moved the document`).not.toBe(before)
    }
  })
})

// ===========================================================================
// The first half of the rule -- the wheel goes to the browser
// ===========================================================================

const STANDING = [
  { what: '`ScreenState` が持つ面 (SK-13の Help Modal)', raise: withTheHelpUp },
  { what: '`Confirmation`（`U-55`） (FR-032の確認)', raise: withAConfirmationUp },
] as const

describe('表 T-023 の結び -- while a surface stands, every wheel row belongs to the browser', () => {
  for (const surface of STANDING) {
    for (const one of HANDED_OVER) {
      it(`${one.row} is not applied while ${surface.what} stands`, () => {
        // 「ホイールの割当（`MK-1` 〜 `MK-4`）を当てず」 -- so nothing the four rows
        // write may reach the document.
        const built = surface.raise()
        const before = built.snapshot()
        built.send(built.wheel(one.modifiers))
        expect(built.snapshot(), `${one.row} must not move anything`).toBe(before)
      })

      it(`${one.row} is handed to the browser while ${surface.what} stands`, () => {
        // 「ブラウザの既定動作へ渡すこと（MUST）」 -- which is `preventDefault` NOT
        // being called, and `isBrowserDefaultStopped` is the answer that decides
        // it. ⚠️ This is asserted for the BARE turn too: MK-10 says nothing about
        // a wheel with no modifier, but this rule names all four rows.
        const built = surface.raise()
        expect(built.stops(built.wheel(one.modifiers)), one.row).toBe(false)
      })
    }
  }

  it('MK-10 (MUST): while NO surface stands, a modified turn is still this tool`s', () => {
    // ⭐ THE OTHER HALF OF THE EXCEPTION THE RULE NOW STATES. It says of itself
    // 「⛔⛔ **`MK-2` 〜 `MK-5` には届く。本規則はその例外である（MUST）**」 and then
    // 「⚠️ **面が立っていないあいだの `MK-10` は 1 文字も変わらない。**」 -- so with
    // nothing standing, a wheel with a modifier is taken from the browser exactly
    // as MK-10 requires. ⛔ WITHOUT THIS, the sixteen cases above would be met by
    // a build that never stopped a wheel at all.
    // ⚠️ THE BARE TURN IS LEFT OUT ON PURPOSE: 「**素の `MK-1` に `MK-10` は届か
    // ない** —— 同行の主語は……修飾キーの付いた入力であり、修飾キーを伴わない入力に
    // ついては何も述べていない」. Nothing here states what a bare turn answers when
    // no surface stands, because no rule does.
    const modified = HANDED_OVER.filter(
      (one) => one.modifiers.ctrl || one.modifiers.shift || one.modifiers.alt,
    )
    expect(modified.length, 'MK-10 still has rows of this table to reach').toBeGreaterThan(0)
    for (const one of modified) {
      const built = stage()
      expect(built.stops(built.wheel(one.modifiers)), one.row).toBe(true)
    }
  })
})

// ===========================================================================
// The second half -- the keys are not what the rule hands over
// ===========================================================================

describe('表 T-023 の結び -- the keys are NOT what this rule hands over', () => {
  for (const surface of STANDING) {
    it(`\`Esc\` is still this tool's while ${surface.what} stands`, () => {
      // 「⛔ **キーの割当は本規則の対象ではない（MUST NOT）** —— 表 T-028 の `IN-4`
      // が面の上で `Esc` を要求しており、キーまで渡すと面を閉じる手立てが消える」.
      // IN-4 gives an open 面 a level of `Esc`, so there IS something to consume
      // and the browser's own behaviour is stopped.
      const built = surface.raise()
      expect(built.stops(ESCAPE())).toBe(true)
    })

    it(`\`Ctrl+S\` is still taken from the browser while ${surface.what} stands`, () => {
      // The same MUST NOT, on a key MK-10 owns rather than one IN-4 owns: SK-11
      // assigns `Ctrl+S`, MK-10 (MUST) takes an assigned combination from the
      // browser, and this rule hands over the WHEEL only.
      // ⛔ What the save then does is not asserted -- see hole 4 at the head.
      const built = surface.raise()
      expect(built.stops(SAVE())).toBe(true)
    })
  }

  it('IN-4: the `Esc` that was kept really closes the 面', () => {
    // ⭐ The half that shows the keeping is worth something: a build that
    // answered `true` and did nothing would leave the surface standing for ever.
    const built = withTheHelpUp()
    expect(built.modalIsUp()).toBe(true)
    built.send(ESCAPE())
    expect(built.modalIsUp()).toBe(false)
  })

  it('IN-4a: with nothing standing, that same `Esc` goes to the browser', () => {
    // ⛔ THE CONTROL FOR THE FOUR CASES ABOVE. 「消費する対象が 1 つも無いときは、
    // 必ずブラウザへ渡すこと（MUST）」 -- so `isBrowserDefaultStopped` is not a
    // constant `true` for `Esc`, and the cases above say something.
    expect(stage().stops(ESCAPE())).toBe(false)
  })
})
