// FR-072 and the two entrances the `Properties Panel` now has -- `MK-13` and
// `IC-17` -- and `SK-19`, the key that takes it away again.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). It is the only layer that may hold a current value (LY-5 of
// table T-060), so it is the side that answers what a press did and what
// `ScreenView` the frame that followed carries.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1: 読んでよいのは冒頭の宣言・公開する型・署名まで).
// What was read of `src/`: the exported declarations of `frame-loop.ts`
// (`FrameEnvironment`, `FrameLoop`, `ScreenWiring`, `NOT_STORED_PROPERTIES_PANEL_SIZES`)
// and the one signature `frameLoop(surface, first, env, screen?, files?,
// showPointerShape?)`; the exported types of `screen-renderer.ts`
// (`PropertiesPanel`, `PropertyFieldKey`, `ScreenPart`, `ScreenSurface`,
// `ScreenView`, `DisplayLanguage`), of `input-command-translator.ts`
// (`HumanInput`, `KeyInput`, `PointerInput`, `InputModifiers`, `PointerButton`,
// `PointerPhase`) and of `document-settings.ts` (`SETTINGS_DEFAULTS`).
// ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. `host` / `screenPane` / `key` /
// `pointer` and the fixture document are
// tests/unit/in-4-escape-closes-the-panel.test.ts's, which drives this same unit
// through the same seams.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLES IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// Every rule below was measured to be watched by NO case at all: broken on
// purpose, nothing went red.
//
//   1. that ONE press does not put the panel up (FR-072, MUST NOT)
//   2. that `SK-19` takes the panel away when nothing is left to settle (MUST)
//   3. that the closing rule of 表 T-036 keeps that second stage OFF while a
//      面 stands (MUST NOT)
//   4. that a closed panel does not take the selection with it (FR-072,
//      MUST NOT)
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   `FR-072`       ⛔ 「表 T-023c の選択が動いたことだけを理由に、パネルを出し始め
//                  てはならない（MUST NOT）」／「出す入口は 表 T-023 の `MK-13` と
//                  `IC-17` の 2 つである。」／⚠️ 「出しているあいだは、選択が動けば
//                  中身がそれに移る」／⛔ 「パネルを出すのをやめても、選択を解いて
//                  はならない（MUST NOT）」／「いま何を出しているかを、入口の押下
//                  状態で示すこと（MUST）。」
//   `FR-006`       「プロパティパネルが選択を出しているとき、`GRS` は、表 T-016 の
//                  項目をプロパティパネルに出し…」 ⭐ ITS SUBJECT IS THE PANEL
//                  ALREADY SHOWING -- it is not a second entrance.
//   表 T-023 MK-13 「ダブルクリック | 対象ごとに定めること（MUST）—— …タスク（名称
//                  ラベルと本体のどちらでも）＝ プロパティパネルを出し、名称の欄
//                  （表 T-016 の `PR-1`）を編集できる状態にして焦点を置き、既にある
//                  文字をすべて選んだ状態にすること（MUST）…」
//   表 T-109 IC-17 「`App Header` | 表示 | 文書の描画設定をプロパティパネルに出す |
//                  `FR-072`」 -- read at run time below, never typed.
//   表 T-036 SK-19 「その場の編集を確定する（名称・担当者名・行名・文書名・プロパ
//                  ティの入力）。確定していないその場の編集が 1 つも無いときは、プロ
//                  パティパネルを出しているならば出すのをやめること（MUST）」／
//                  ⚠️ 「焦点が名称の欄の外にあるときも同じである」 | `Enter`
//   表 T-036 の結び ⛔ 「`Confirmation`（`U-55`）または `ScreenState` が持つ面
//                  （`S-99g`）が立っているあいだ、`SK-19` の 2 段目を当ててはならな
//                  い（MUST NOT）」／⚠️ 「1 段目（その場の編集の確定）は当てたまま
//                  である —— 面の中にも入力欄が在る。」
//   表 T-036 SK-3  「選択しているものを削除する（対象の全数は表 T-023c の SL-1）」
//                  | `Delete` / `Backspace` -- ⭐ THE ONLY ROAD BY WHICH THIS
//                  SEAM CAN BE ASKED WHETHER A SELECTION IS STILL STANDING.
//                  `FrameLoop` publishes no selection; SK-3 acts on one, so a
//                  `Delete` that still removes the Task is the selection saying
//                  it is there. ⚠️ A control case below deletes with nothing
//                  chosen, so "Delete always deletes" cannot pass for it.
//   表 T-036 SK-13 「ヘルプを開く | `F1`」 -- the one 面 these cases can raise
//                  without drawing anything.
//   `S-99g`        表 T-206: 「「面」とは、画面の上に重ねて開き、`Esc` の第 1 階層で
//                  閉じられるものをいう（表 T-028 の `IN-4`）。」
//   A-appendix 1.58 ⭐ 「押しただけで開いていたプロパティパネルを、ダブルクリックで
//                  開いて `Enter` 2 度で閉じるものにした」 -- the count of presses
//                  is what says the first `Enter` settles and the second closes.
//   `S-171`        表 T-206: 「プロパティパネルが開いたときに取る幅」.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. `MK-13`'s 「既にある文字をすべて選んだ状態にすること（MUST）」 AND THE
//      FOCUS THAT GOES WITH IT. ⛔ Nothing on this seam can be asked. `ScreenView`
//      carries no member for which field holds the focus or how much of its text
//      is chosen, `ScreenSurface`'s five members carry none either, and
//      `PropertyField` / `PropertyControl` state a value and a form and nothing
//      about a caret. So the rule is REPORTED as unwatched rather than replaced
//      by something adjacent that would look like it.
//   2. THAT THE FIRST `Enter` SETTLES. `readFieldCommit` is the seam a settled
//      value would arrive on, and no row of the specification says WHEN this
//      unit reads it -- so a case that saw a value arrive could not tell a
//      settling caused by `SK-19` from a poll that happens every frame. What is
//      asserted instead is the half `SK-19` states in its own words: with an
//      unsettled edit standing, the press does NOT reach the second stage.
//   3. WHICH of two 面 `Esc` takes first, and everything else about `Esc` --
//      tests/unit/in-4-escape-closes-the-panel.test.ts owns that rule.

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
  PropertiesPanel,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  NOT_STORED_PROPERTIES_PANEL_SIZES,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than copied
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** U-25 of table T-103 -- the settled spelling of the panel, letter for letter. */
const U_25 = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')

/** U-21 of table T-103 -- the surface IC-17 stands on, as table T-109 spells it. */
const APP_HEADER = bare(rowOf('T-109', 'IC-17').by['面'] ?? '')

/** Everything MK-13, SK-19 and the two FR-072 sentences write, as one string each. */
const MK_13 = rowOf('T-023', 'MK-13').cells.join(' ')
const SK_19 = rowOf('T-036', 'SK-19').cells.join(' ')
const SK_3 = rowOf('T-036', 'SK-3').cells.join(' ')

/** `FR-072`'s STATEMENT and the closing rule of table T-036, as the file holds them. */
const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** The two sentences of FR-072 these cases stand on, quoted from the manuscript. */
const FR_072_NOT_FROM_A_SELECTION =
  '表 T-023c の選択が動いたことだけを理由に、パネルを出し始めてはならない（MUST NOT）'
const FR_072_THE_TWO_ENTRANCES = '出す入口は 表 T-023 の `MK-13` と `IC-17` の 2 つである。'
const FR_072_KEEPS_THE_SELECTION =
  'パネルを出すのをやめても、選択を解いてはならない（MUST NOT）'
const T_036_NOT_WHILE_A_SURFACE_STANDS = '`SK-19` の 2 段目を当ててはならない（MUST NOT）'

/** `S-171` -- the width the panel opens to. ⭐ Taken from the generated constant. */
const S_171 = NOT_STORED_PROPERTIES_PANEL_SIZES['S-171']

// ---------------------------------------------------------------------------
// The document these cases drive. Copied from
// tests/unit/in-4-escape-closes-the-panel.test.ts.
// ---------------------------------------------------------------------------

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

/** The Task `MK-13` is aimed at. */
const THE_TASK = 1
/** A second Task, so that a MOVED selection can be told from a standing one. */
const THE_OTHER_TASK = 2

function twoTaskDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string): Task =>
    ({
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
    }) as unknown as Task
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
        task(THE_TASK, '2026-04-01', '2026-04-10', 'One'),
        task(THE_OTHER_TASK, '2026-05-06', '2026-05-20', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: THE_TASK, groupId: ALPHA, stackOrder: null },
        { taskUid: THE_OTHER_TASK, groupId: BETA, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    // ⭐ THE PANEL'S WIDTH IS ALREADY S-171, so that a panel put up by an
    // entrance has a width to be drawn at and no case has to invent one. What
    // width an OPENING writes is FR-052's road and not this file's.
    documentSettings: {
      ...structuredClone(template.documentSettings),
      propertyPanelWidth: S_171,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// ---------------------------------------------------------------------------
// The host UF-48 is given. Copied from tests/unit/uf-48-input.test.ts.
// ---------------------------------------------------------------------------

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about the panel.
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
  /** What IF-9's fifth answer says from now on -- SK-19's own condition. */
  leaveAnEditUnsettled(unsettled: boolean): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  let unsettled = false
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    // Nothing here drives a field, so no value is ever committed.
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => unsettled,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    leaveAnEditUnsettled: (next) => {
      unsettled = next
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

/** SK-19 of table T-036. */
const ENTER = (): HumanInput => key('Enter')
/** SK-8 of table T-036, whose rule is IN-4 of table T-028. */
const ESCAPE = (): HumanInput => key('Esc')
/** SK-13 of table T-036 -- the one 面 these cases raise from outside. */
const OPEN_HELP = (): HumanInput => key('F1')
/** SK-3 of table T-036, read out of the row rather than spelt here. */
const DELETE_SELECTION = (): HumanInput => key(deleteSpelling())

/**
 * The first spelling SK-3's 割当 column offers, taken from the manuscript.
 *
 * ⭐ NOT TYPED: 「割当の綴りも入口の説明も写してはならない（MUST NOT）—— 綴りの家
 * は 1 つである（`R3.4`）」 is stated of table T-036's 入口 column, and a case that
 * typed `Delete` here would be a second home for the same spelling.
 */
function deleteSpelling(): string {
  const cell = bare(rowOf('T-036', 'SK-3').by['割当'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error('table T-036 SK-3 states no assignment')
  return first
}

// ---------------------------------------------------------------------------
// A loop, and the questions a case may ask it
// ---------------------------------------------------------------------------

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  /** The panel this frame described, or `null` while it is not up. */
  panel(): PropertiesPanel | null
  panelIsUp(): boolean
  modalIsUp(): boolean
  /** Which `Task` uids the document still holds. */
  taskUids(): readonly number[]
  /** Aim the next press at one entry of table T-109. CS-2 freezes it at the press. */
  aimAt(part: string, entry: string): void
  aimAtNothing(): void
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, twoTaskDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    screen,
    send,
    panel: () => screen.last().propertiesPanel,
    panelIsUp: () => screen.last().propertiesPanel !== null,
    modalIsUp: () => screen.last().openModal !== null,
    taskUids: () => (loop.document() as any).schedule.tasks.map((one: Task) => one.uid),
    aimAt: (part, entry) => {
      screen.drawAt({
        part,
        entry: entry as any,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    },
    aimAtNothing: () => {
      screen.drawAt(null)
    },
  }
}

/** The middle of one Task's plan bar -- the 本体 half of MK-13's Task entry. */
function middleOfTheBar(built: Stage, uid: number): { readonly x: number; readonly y: number } {
  const values = built.loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${uid} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to press`)
  }
  const xs = drawn.plan.points.map((one) => one.x)
  const ys = drawn.plan.points.map((one) => one.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/**
 * One plain press on a Task -- table T-023c's selection moving, and nothing more.
 *
 * ⚠️ Pressed and RELEASED at the same point, because IN-1 settles a pointer
 * operation on the release and a press left down would be a drag.
 */
function pressTask(built: Stage, uid: number): void {
  const at = middleOfTheBar(built, uid)
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('up', at.x, at.y))
}

/** MK-13 on a Task: the double click that IS an entrance to the panel. */
function doubleClickTask(built: Stage, uid: number): void {
  const at = middleOfTheBar(built, uid)
  built.send(pointer('down', at.x, at.y, { clickCount: 2 }))
  built.send(pointer('up', at.x, at.y, { clickCount: 2 }))
}

/** IC-17 pressed on the `App Header` -- the other of FR-072's two entrances. */
function pressIc17(built: Stage): void {
  built.aimAt(APP_HEADER, 'IC-17')
  built.send(pointer('down', 700, 20))
  built.send(pointer('up', 700, 20))
  built.aimAtNothing()
}

/** Which Task the panel is showing, read off the keys its controls carry. */
function subjectUidsOf(panel: PropertiesPanel): readonly number[] {
  const uids = new Set<number>()
  for (const field of panel.fields) {
    for (const control of field.controls) {
      const holder = control.key as { readonly holder: string; readonly uid?: number }
      if ((holder.holder === 'task' || holder.holder === 'taskVisual') && holder.uid !== undefined) {
        uids.add(holder.uid)
      }
    }
  }
  return [...uids]
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not verified
    // until it has been broken on purpose and seen to fail.
    expect(U_25).toBe('Properties Panel')
    expect(APP_HEADER).toBe('App Header')
    expect(MK_13, 'MK-13 still opens the panel for a Task').toContain('プロパティパネルを出し')
    expect(SK_19, 'SK-19 still carries its second stage').toContain(
      'プロパティパネルを出しているならば出すのをやめること（MUST）',
    )
    expect(SK_3, 'SK-3 still deletes what is selected').toContain('選択しているものを削除する')
  })

  it('⛔ FR-072 still names the two entrances, and still forbids the third', () => {
    // ⭐ THE GROUND OF THIS WHOLE FILE, read rather than typed: if the ruling of
    // 2026-08-30 is ever reversed, this case says so in one line instead of
    // leaving six cases asserting a rule the manuscript no longer holds.
    expect(REQUIREMENTS).toContain(FR_072_NOT_FROM_A_SELECTION)
    expect(REQUIREMENTS).toContain(FR_072_THE_TWO_ENTRANCES)
    expect(REQUIREMENTS).toContain(FR_072_KEEPS_THE_SELECTION)
  })

  it('⛔ table T-036 still keeps SK-19’s second stage off while a 面 stands', () => {
    expect(REQUIREMENTS).toContain(T_036_NOT_WHILE_A_SURFACE_STANDS)
    // ⚠️ And the sentence that keeps the FIRST stage on, which is what makes
    // the rule a limit on ONE stage rather than on the key.
    expect(REQUIREMENTS).toContain('1 段目（その場の編集の確定）は当てたままである')
  })

  it('table T-109 still puts IC-17 on the App Header, on FR-072’s authority', () => {
    const ic17 = rowOf('T-109', 'IC-17')
    expect(bare(ic17.by['正'] ?? '')).toBe('FR-072')
    expect(ic17.by['何の入口か'] ?? '').toContain('プロパティパネル')
  })

  it('the document these cases drive is a valid GRS JSON document', () => {
    const report = validateDocument(twoTaskDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('the panel is not up before anything has been pressed', () => {
    // ⭐ The premise without which "the entrance put it up" says nothing.
    expect(stage().panelIsUp()).toBe(false)
  })

  it('both Tasks are drawn with a body to press', () => {
    const built = stage()
    expect(middleOfTheBar(built, THE_TASK).x).toBeGreaterThan(0)
    expect(middleOfTheBar(built, THE_OTHER_TASK).x).toBeGreaterThan(0)
  })
})

// ===========================================================================
// (a) FR-072 (MUST NOT) -- a moved selection is not an entrance
// ===========================================================================

describe('FR-072 (MUST NOT) -- one press chooses, and does not put the panel up', () => {
  it('⛔ MUST NOT: a plain press on a Task leaves the panel off the screen', () => {
    // 「表 T-023c の選択が動いたことだけを理由に、パネルを出し始めてはならない
    //   （MUST NOT）」 -- the user's own words behind it (CR-304): 「ちょっと位置を
    //   ずらしたいだけなのに、プロパティーパネルが開くのは鬱陶しい」.
    const built = stage()

    pressTask(built, THE_TASK)

    expect(
      built.panelIsUp(),
      'FR-072 (MUST NOT): 選択が動いたことだけを理由にパネルを出し始めてはならない',
    ).toBe(false)
  })

  it('⭐ and the press really did choose it -- SK-3 still has something to delete', () => {
    // ⛔ WITHOUT THIS THE CASE ABOVE IS VACUOUS. A loop that ignored the press
    // entirely would pass it, and would be breaking SL-2 of table T-023c
    // instead. SK-3 acts on 「選択しているもの」, so a Task that goes is a
    // selection that stood.
    const built = stage()

    pressTask(built, THE_TASK)
    built.send(DELETE_SELECTION())

    expect(built.taskUids(), 'SL-2 of table T-023c: the press chose the Task').toEqual([
      THE_OTHER_TASK,
    ])
  })

  it('⭐ and a `Delete` with nothing chosen removes nothing', () => {
    // The control the case above needs: 「選択しているものを削除する」 is not
    // 「何か削除する」, so a loop that deleted on every `Delete` would make the
    // selection cases agree with anything.
    const built = stage()

    built.send(DELETE_SELECTION())

    expect(built.taskUids().length, 'SK-3 acts on a selection, and there is none').toBe(2)
  })

  it('⛔ MUST NOT: a press that moves the selection to ANOTHER Task does not open it either', () => {
    // ⚠️ THE SECOND PRESS IS THE ONE THE RULE IS ABOUT. 「選択が動いた」 is a
    // MOVE, and a loop that only refused the FIRST press would satisfy the case
    // above while still opening on every move after it.
    const built = stage()

    pressTask(built, THE_TASK)
    pressTask(built, THE_OTHER_TASK)

    expect(built.panelIsUp()).toBe(false)
  })
})

// ===========================================================================
// (b) MK-13 and IC-17 -- the two entrances that do put it up
// ===========================================================================

describe('table T-023 MK-13 and table T-109 IC-17 -- the two entrances', () => {
  it('⛔ MUST: a double click on a Task puts the panel up, showing that Task', () => {
    // MK-13: 「タスク（名称ラベルと本体のどちらでも）＝ プロパティパネルを出し…」
    const built = stage()

    doubleClickTask(built, THE_TASK)

    const panel = built.panel()
    expect(panel, `MK-13 (MUST): ${U_25} is described once a Task is double clicked`).not.toBeNull()
    // FR-072: 「いま何を出しているかを、入口の押下状態で示すこと（MUST）」 -- the
    // two contents are told apart by the description, so the description says
    // which of the two this is.
    expect(panel?.showing).toBe('selection')
    expect(subjectUidsOf(panel as PropertiesPanel)).toEqual([THE_TASK])
  })

  it('⛔ MUST: IC-17 puts it up showing the document’s own drawing settings', () => {
    // 表 T-109 IC-17: 「文書の描画設定をプロパティパネルに出す | `FR-072`」.
    const built = stage()

    pressIc17(built)

    expect(built.panel(), 'IC-17 is the second of FR-072’s two entrances').not.toBeNull()
    expect(built.panel()?.showing).toBe('documentSettings')
  })

  it('⚠️ while it is up, a moved selection moves what it shows', () => {
    // 「出しているあいだは、選択が動けば中身がそれに移る —— 上の「最後に行われた
    //   操作」がそのまま当たる」. ⭐ THE OTHER SIDE OF THE SAME RULE as (a): a
    // selection may not START the panel, and it does move a panel already up.
    const built = stage()

    doubleClickTask(built, THE_TASK)
    pressTask(built, THE_OTHER_TASK)

    expect(built.panelIsUp(), 'the panel was up, and a press does not take it away').toBe(true)
    expect(subjectUidsOf(built.panel() as PropertiesPanel)).toEqual([THE_OTHER_TASK])
  })
})

// ===========================================================================
// (c) SK-19 -- `Enter` is what takes it away
// ===========================================================================

describe('table T-036 SK-19 -- `Enter` closes a panel with nothing left to settle', () => {
  it('⛔ MUST: one `Enter` with no unsettled edit takes the panel off the screen', () => {
    // 「確定していないその場の編集が 1 つも無いときは、プロパティパネルを出している
    //   ならば出すのをやめること（MUST）」.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(false)

    built.send(ENTER())

    expect(
      built.panelIsUp(),
      'SK-19 (MUST): 確定していないその場の編集が 1 つも無いときは…出すのをやめること',
    ).toBe(false)
  })

  it('⚠️ the same when the focus is nowhere near the name field -- IC-17’s panel closes too', () => {
    // 「⚠️ 焦点が名称の欄の外にあるときも同じである」. ⭐ A panel opened by IC-17
    // is showing the document's settings, which has no 名称の欄 (`PR-1`) in it at
    // all -- so the focus cannot be in one, and the rule still asks for the
    // panel to go.
    const built = stage()
    pressIc17(built)
    expect(built.panel()?.showing, 'the premise: this panel is not showing a Task').toBe(
      'documentSettings',
    )

    built.send(ENTER())

    expect(built.panelIsUp(), 'SK-19: 焦点が名称の欄の外にあるときも同じである').toBe(false)
  })

  it('⛔ an `Enter` with an edit still unsettled does NOT reach the second stage', () => {
    // ⭐ THE COUNT OF PRESSES IS THE RULE. Version 1.58 of the specification
    // records the ruling as 「ダブルクリックで開いて `Enter` 2 度で閉じる」, and
    // SK-19's own condition is 「確定していないその場の編集が 1 つも無いとき」 --
    // so while one stands, the press spends itself on the first stage.
    // ⛔ A loop that closed on the first press would leave a person's half-typed
    // name settled by nothing and the panel gone from under it.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(true)

    built.send(ENTER())

    expect(
      built.panelIsUp(),
      'SK-19: the second stage is for when NO in-place edit is left unsettled',
    ).toBe(true)
  })

  it('⭐ and the press after the edit is settled does take it away -- two presses in all', () => {
    // The pair that makes the case above a limit rather than a refusal: the
    // same panel, the same key, one press later.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(true)
    built.send(ENTER())

    built.screen.leaveAnEditUnsettled(false)
    built.send(ENTER())

    expect(built.panelIsUp(), 'A-appendix 1.58: `Enter` 2 度で閉じる').toBe(false)
  })
})

// ===========================================================================
// (d) The closing rule of table T-036 -- not while a 面 stands
// ===========================================================================

describe('table T-036’s closing rule -- the second stage is off while a 面 stands', () => {
  it('⛔ MUST NOT: with the help up, `Enter` does not take the panel away', () => {
    // 「`Confirmation`（`U-55`）または `ScreenState` が持つ面（`S-99g`）が立っている
    //   あいだ、`SK-19` の 2 段目を当ててはならない（MUST NOT）—— 表 T-028 の
    //   `IN-4` が `Esc` の第 1 階層を「開いている面」へ既に与えており、面が立って
    //   いるあいだ、閉じる手が向かう先は面であって、面の後ろのパネルではない。」
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(OPEN_HELP())
    built.screen.leaveAnEditUnsettled(false)
    expect(built.modalIsUp() && built.panelIsUp(), 'both are up before the press').toBe(true)

    built.send(ENTER())

    expect(
      built.panelIsUp(),
      'T-036 (MUST NOT): 面が立っているあいだ、`SK-19` の 2 段目を当ててはならない',
    ).toBe(true)
  })

  it('⭐ and once the 面 is gone, the same press does take it away', () => {
    // ⛔ WITHOUT THIS PAIR THE CASE ABOVE WOULD PASS ON A LOOP WHERE `Enter`
    // never closes anything at all, which is a different defect wearing the
    // same green.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(OPEN_HELP())
    built.screen.leaveAnEditUnsettled(false)

    built.send(ENTER())
    // IN-4's first level takes the 面 (in-4-escape-closes-the-panel.test.ts owns
    // that rule); this case only needs the 面 gone.
    built.send(ESCAPE())
    expect(built.modalIsUp(), 'the 面 has been taken off the screen').toBe(false)
    built.send(ENTER())

    expect(built.panelIsUp()).toBe(false)
  })

  it('⚠️ and the 面 itself is not what `Enter` took', () => {
    // 「1 段目（その場の編集の確定）は当てたままである」 -- the rule turns ONE
    // stage off, and turns no stage on: `Enter` is not a way to close a 面.
    // `IN-4` of table T-028 is the one road to that, and it is `Esc`'s.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(OPEN_HELP())
    built.screen.leaveAnEditUnsettled(false)

    built.send(ENTER())

    expect(built.modalIsUp(), '`Enter` is not the key that closes a 面').toBe(true)
  })
})

// ===========================================================================
// (e) FR-072 (MUST NOT) -- closing the panel does not close the selection
// ===========================================================================

describe('FR-072 (MUST NOT) -- a closed panel leaves the selection where it was', () => {
  it('⛔ MUST NOT: after `Esc` has taken the panel, SK-3 still has the Task to delete', () => {
    // 「パネルを出すのをやめても、選択を解いてはならない（MUST NOT）」（利用者の裁定
    //   2026-08-30）. ⭐ WHY DELETING IS THE QUESTION: `FrameLoop` publishes no
    // selection, and SK-3 acts on one -- so the Task going is the selection
    // saying it stood, and the Task staying is it saying it did not.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(ESCAPE())
    expect(built.panelIsUp(), 'the panel is off the screen before the question is asked').toBe(false)

    built.send(DELETE_SELECTION())

    expect(
      built.taskUids(),
      'FR-072 (MUST NOT): パネルを出すのをやめても、選択を解いてはならない',
    ).toEqual([THE_OTHER_TASK])
  })

  it('⛔ MUST NOT: the same after `SK-19` has taken it', () => {
    // ⭐ BOTH ROADS OUT, because the rule is about the panel going and not about
    // which key sent it: a loop that cleared the selection on one of the two
    // would break the same MUST NOT while passing the other case.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(false)
    built.send(ENTER())
    expect(built.panelIsUp()).toBe(false)

    built.send(DELETE_SELECTION())

    expect(built.taskUids()).toEqual([THE_OTHER_TASK])
  })
})
