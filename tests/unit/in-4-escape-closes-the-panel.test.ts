// IN-4 of table T-028 and the `Properties Panel` -- whether `Esc` takes the
// panel off the screen, and whether it spends exactly one level doing it.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). It is the only layer that may hold a current value (LY-5 of
// table T-060), so it is the side that answers both questions these cases ask:
// what `ScreenView` a frame carries, and what MK-10 says about one `Esc`.
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
// (`ScreenPart`, `ScreenSurface`, `ScreenView`, `DisplayLanguage`), of
// `input-command-translator.ts` (`HumanInput`, `KeyInput`, `PointerInput`,
// `InputModifiers`, `PointerButton`, `PointerPhase`) and of
// `document-settings.ts` (`SETTINGS_DEFAULTS`). ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. `host` / `screenPane` / `twoRowDocument`
// / `key` / `pointer` / `planCentre` are tests/unit/uf-48-input.test.ts's, which
// drives this same unit through the same seams.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   表 T-109 IC-52  its 面 column reads
//                 「`Help Modal` / `AI Export Modal` / `Resource Roster` /
//                   `Export Chooser` / `Open Chooser` / `Properties Panel`」,
//                   its 何の入口か column 「開いている面を閉じる」 and its 正
//                   column 「表 T-028 の `IN-4`」. ⭐ SO THE MANUSCRIPT ALREADY
//                   CALLS THE PANEL A 面, AND ALREADY SAYS WHICH RULE CLOSES IT.
//                   Read at run time below, never typed.
//   `S-99g`        表 T-206: 「開いている面 | 開いていない | …「面」とは、画面の上
//                   に重ねて開き、`Esc` の第 1 階層で閉じられるものをいう（表
//                   T-028 の `IN-4`）」. ⭐ THIS IS THE JOIN. A 面 is DEFINED as
//                   what the first level of `Esc` closes; IC-52 names the panel
//                   a 面; therefore `Esc` closes the panel.
//   表 T-028 IN-4  「`Esc` は閉じる対象または取り消す対象があるときだけ 1 階層ぶん
//                   消費し、無ければブラウザへ渡すこと。**消費する階層は 確定して
//                   いないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけ
//                   の矢印 → 構え → `Dual Cursor` モード → 出ている説明 の順とする
//                   こと（MUST）**」
//   表 T-028 IN-4a 「**消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと
//                   （MUST）**」 —— 全画面表示から `Esc` で戻る経路（`FR-071`）は
//                   ブラウザ側の挙動なので、渡さないと戻れなくなる。
//   表 T-023 MK-10 「本ツールが割り当てた…入力 | ブラウザの既定動作を…止めること
//                   （MUST）。割り当てていない組合せを止めてはならない（MUST
//                   NOT）」 -- which is what `isBrowserDefaultStopped` answers,
//                   and the member's own declaration names IN-4a as its reason.
//   表 T-036 SK-8  「取り消す / 閉じる | `Esc`（規則は表 T-028 の IN-4）」
//   表 T-036 SK-13 「ヘルプを開く | `F1`」 -- the one surface these cases can put
//                   up from outside the loop without drawing anything.
//   `FR-006`       「プロパティパネルが選択を出しているとき、`GRS` は、表 T-016
//                   の項目をプロパティパネルに出し…」 ⚠️ ITS SUBJECT IS THE PANEL
//                   ALREADY SHOWING, NOT AN ACT OF CHOOSING. ⛔ The reading that
//                   made choosing put the panel up was overturned on 2026-08-30
//                   (CR-304), and these cases were written under it.
//   `FR-072`       ⛔ 「表 T-023c の選択が動いたことだけを理由に、パネルを出し始めては
//                   ならない（MUST NOT）」、「出す入口は 表 T-023 の `MK-13` と `IC-17`
//                   の 2 つである」、「パネルを出すのをやめても、選択を解いてはならない
//                   （MUST NOT）」 -- so the route these cases put the panel up by
//                   is `MK-13`, and never a press that only selects.
//   表 T-023 MK-13 「タスク（名称ラベルと本体のどちらでも）＝プロパティパネルを
//                   出し、名称の欄（表 T-016 の `PR-1`）を編集できる状態にして焦点を置
//                   き…」 -- the one entrance a pointer can reach in this loop.
//   `S-80`         表 T-203 `propertyPanelWidth`: 「⭐ `0` であることが「閉じてい
//                   る」であり、既定がそれである」.
//   `S-171`        表 T-206: 「プロパティパネルが開いたときに取る幅」 -- 「`S-80`
//                   は文書が保つ幅であり、`0` であることが「閉じている」である ——
//                   本値はそこへ開くときに置く幅である」. ⭐ Used as the width the
//                   fixture's document is SAVED with, so no case invents one.
//   `FR-052`       「`Schedule Canvas` の幅から `canvasPadding`（`S-56`）と 2 つの
//                   幅と縦のスクロールバーの太さを引いた残りが `Row Area` の幅であ
//                   り（`U-50`）」 -- the arithmetic the last describe reads.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. WHICH of the two goes first when a modal AND the panel are both up. The
//      manuscript orders the LEVELS of IN-4 against each other and never orders
//      two 面 against each other -- S-99g holds exactly one open surface, so the
//      case of two standing at once is outside what IN-4 can be quoted for. The
//      case below asserts that exactly ONE of them went, and refuses to say
//      which.
//   2. THAT PRESSING IC-52 CLOSES IT. That is the entrance, and
//      tests/unit/fr-006-panel-close-entrance.test.ts already holds it. ⛔ Not
//      repeated here: FR-029 (MUST NOT) makes them one operation with two ways
//      in -- a keystroke and an entrance -- and one rule in two files rots.
//   3. WHETHER THE PANEL COMES BACK on the next selection. ⭐ NO LONGER A HOLE:
//      `PD-339` was settled on 2026-08-30 (CR-304) and the answer is that it
//      does not -- 「出す入口は 表 T-023 の `MK-13` と `IC-17` の 2 つである」.
//      ⛔ Still not asked HERE, because it is FR-072's rule and not IN-4's:
//      tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts holds it, along
//      with the MUST NOT that keeps the selection standing after the close.
//   4. WHAT A SAVED DOCUMENT READS BACK AS once the panel has been closed. The
//      same blocked ruling. These cases read the width THIS SESSION draws with,
//      which FR-052's arithmetic settles, and never a file.
//   5. WHETHER CLOSING THE PANEL LEAVES AN UNDO STEP. `UN-16` of table T-027
//      puts パネル幅 outside the history (対象外), so a closing that stacked a
//      step would break it -- but with no edit before it to undo, a `Ctrl+Z`
//      here would pass whether or not the step existed. ⛔ Reported rather than
//      written as a case that could not fail.

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
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
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

/** The columns of table T-109 these cases read. A rename has to fail loudly. */
const SURFACE_COLUMN = '面'
const ENTRY_COLUMN = '何の入口か'
const AUTHORITY_COLUMN = '正'

/** The surfaces one row of table T-109 places its entrance on. */
const surfacesOf = (cell: string): readonly string[] =>
  cell
    .split('/')
    .map((one) => one.replace(/[`*]/g, '').trim())
    .filter((one) => one.length > 0)

/** Every row of table T-109 whose 面 column places an entrance on the panel. */
const PANEL_ENTRANCES = specTable('T-109').rows.filter((row) =>
  surfacesOf(row.by[SURFACE_COLUMN] ?? '').includes(U_25),
)

/** Everything IN-4 and IN-4a write, as one string each. */
const IN_4 = rowOf('T-028', 'IN-4').cells.join(' ')
const IN_4A = rowOf('T-028', 'IN-4a').cells.join(' ')

/** S-99g's own cell -- the definition of a 面 these cases lean on. */
const S_99G = rowOf('T-206', 'S-99g').cells.join(' ')

/**
 * `S-171` -- 「プロパティパネルが開いたときに取る幅」.
 *
 * ⭐ TAKEN FROM THE GENERATED CONSTANT AND NOT TYPED. Rule 03 section 1 forbids
 * re-typing a value the manuscript holds, and `npm run gen:check` is what keeps
 * this constant equal to the cell -- so a width re-decided in table T-206 moves
 * this fixture with it.
 */
const S_171 = NOT_STORED_PROPERTIES_PANEL_SIZES['S-171']

/**
 * `S-80`'s own default -- the width that IS 「閉じている」.
 *
 * ⚠️ Read from the generated defaults for the same reason, and pinned against
 * the manuscript's own cell by a premise below.
 */
const CLOSED_WIDTH = Number(SETTINGS_DEFAULTS['propertyPanelWidth'])

// ---------------------------------------------------------------------------
// The document these cases drive. Copied from tests/unit/uf-48-input.test.ts.
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

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

/** The Task every case here selects, so that FR-006 puts the panel up. */
const THE_TASK = 1

/**
 * Two rows, one Task on each, and a document whose panel is ALREADY OPEN.
 *
 * ⭐ WHY THE WIDTH IS SET IN THE FIXTURE. S-80's default is 「閉じている」 and
 * nothing in the manuscript names the operation that writes a width -- that is
 * the hole tests/unit/fr-006-panel-close-entrance.test.ts reports. So these
 * cases start from a document that already carries one, which FR-052 makes
 * lawful (a person may drag the boundary to any width that leaves the `Row
 * Area` wider than 0), and ask only what `Esc` does to it.
 */
function openPanelDocument(edit: (draft: any) => void = () => {}): Document {
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
        task(THE_TASK, '2026-04-01', '2026-04-10', 'One'),
        task(2, '2026-05-06', '2026-05-20', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: THE_TASK, groupId: ALPHA, stackOrder: null },
        { taskUid: 2, groupId: BETA, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      propertyPanelWidth: S_171,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

// ---------------------------------------------------------------------------
// The host UF-48 is given. Copied from tests/unit/uf-48-input.test.ts.
// ---------------------------------------------------------------------------

/**
 * BO-1 of table T-077 has already settled these by the time a loop exists.
 *
 * ⚠️ WIDER THAN THE NEIGHBOUR'S, on purpose: the fixture's document opens with
 * the panel taking `S-171` from the `Schedule Canvas`, and these cases press on
 * a bar that has to be inside the `Row Area` for FR-006 to be reached at all.
 * ⭐ It decides nothing -- FR-051 keeps the window out of the settings, and a
 * premise below measures that the `Row Area` really is wider than zero.
 */
const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks for no more. */
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about `Esc`.
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
    // IF-9 also returns what a properties-panel field settled at. Nothing here
    // drives one, so there is never a commit to take.
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

/** SK-8 of table T-036, whose rule is IN-4. */
const ESCAPE = (): HumanInput => key('Esc')
/** SK-13 of table T-036 -- the one surface these cases raise from outside. */
const OPEN_HELP = (): HumanInput => key('F1')

// ---------------------------------------------------------------------------
// A loop with the panel up
// ---------------------------------------------------------------------------

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  /** Whether this frame put the `Properties Panel` on the screen at all. */
  panelIsUp(): boolean
  /** Whether a 面 other than the panel is standing. */
  modalIsUp(): boolean
  /** The width FR-052's arithmetic gave the panel in the last frame. */
  panelWidth(): number
  /** The width FR-052's arithmetic left the `Row Area` in the last frame. */
  rowAreaWidth(): number
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, openPanelDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // The first frame is owed by the loop being made, not by FT-1, so it is
  // drained before any case reads a description.
  pen.runAnimationFrames()
  const regions = () => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    return values.regions
  }
  return {
    loop,
    screen,
    send,
    panelIsUp: () => screen.last().propertiesPanel !== null,
    modalIsUp: () => screen.last().openModal !== null,
    panelWidth: () => regions().propertiesPanel.width,
    rowAreaWidth: () => regions().rowArea.width,
  }
}

/** The middle of the Task's plan bar -- the 本体 half of MK-13's Task entry. */
function middleOfTheBar(built: Stage): { readonly x: number; readonly y: number } {
  const values = built.loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === THE_TASK)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${THE_TASK} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${THE_TASK} is drawn as a ${drawn.plan.form}, which has no body to press`)
  }
  const xs = drawn.plan.points.map((one) => one.x)
  const ys = drawn.plan.points.map((one) => one.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/**
 * Choose the Task with ONE press, which is all a plain press does.
 *
 * ⛔ IT DOES NOT PUT THE PANEL UP, and that is FR-072 in as many words:
 * 「表 T-023c の選択が動いたことだけを理由に、パネルを出し始めてはならない
 * （MUST NOT）」. ⚠️ Pressed and RELEASED at the same point, because IN-1 settles a
 * pointer operation on release and a press left down would still be IN-4's
 * 「進行中のドラッグ」 level.
 */
function selectTheTask(built: Stage): void {
  const at = middleOfTheBar(built)
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('up', at.x, at.y))
}

/**
 * Put the panel up the way the manuscript now says it goes up: `MK-13`.
 *
 * ⭐ THE ROUTE CHANGED ON 2026-08-30 AND THE RULE `Esc` IS ASKED ABOUT DID NOT.
 * FR-072 (MUST NOT) forbids a moved selection to start the panel and names the
 * two entrances that do: 「出す入口は 表 T-023 の `MK-13` と `IC-17` の 2 つで
 * ある」. `MK-13` is the one of the two a pointer reaches on the schedule itself
 * -- 「タスク（名称ラベルと本体のどちらでも）＝プロパティパネルを出し」 --
 * so these cases double click the bar's body.
 *
 * ⚠️ BOTH HALVES OF THE GESTURE CARRY THE COUNT, the shape
 * tests/unit/t-023d-double-click-only-rows.test.ts drives MK-13 by: IN-1 settles
 * a pointer operation on the release, so the release is the half that has to
 * say it was the second click.
 */
function openThePanel(built: Stage): void {
  const at = middleOfTheBar(built)
  built.send(pointer('down', at.x, at.y, { clickCount: 2 }))
  built.send(pointer('up', at.x, at.y, { clickCount: 2 }))
}

/** A loop whose panel is up and which has nothing else for `Esc` to spend. */
function withThePanelUp(): Stage {
  const built = stage()
  openThePanel(built)
  return built
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST THE 面 COLUMN WOULD MAKE EVERY CASE
    // BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail.
    expect(U_25).toBe('Properties Panel')
    expect(IN_4, 'IN-4 still fixes the order of the levels').toContain('1 階層')
    expect(IN_4A, 'IN-4a still hands the rest to the browser').toContain('ブラウザへ渡すこと')
    expect(S_99G, 'S-99g still defines a 面 by what Esc closes').toContain('第 1 階層')
  })

  it('⛔ table T-109 still calls the `Properties Panel` a 面 that IN-4 closes', () => {
    // ⭐ THE WHOLE GROUND OF THIS FILE, read rather than typed. IC-52's 面 column
    // names the panel among the surfaces its entrance stands on, its 何の入口か
    // column reads 「開いている面を閉じる」, and its 正 column names IN-4 -- so
    // the manuscript itself calls the panel a 面 and points at the rule that
    // closes one.
    // ⚠️ HOW MANY entrances the table places there is FR-029's rule and
    // tests/unit/fr-006-panel-close-entrance.test.ts owns it; this case reads
    // only that one of them names the panel a 面 and points at IN-4.
    const entrance = PANEL_ENTRANCES.find((row) => bare(row.by[AUTHORITY_COLUMN] ?? '') === 'IN-4')
    expect(entrance, `a row of table T-109 stands on ${U_25} on IN-4's authority`).not.toBe(
      undefined,
    )
    expect(entrance?.by[ENTRY_COLUMN] ?? '').toContain('閉じる')
  })

  it('S-80 still spells 「閉じている」 as a width of zero, and S-171 is not that width', () => {
    // S-80: 「⭐ `0` であることが「閉じている」であり、既定がそれである」. S-171:
    // 「本値はそこへ開くときに置く幅である」.
    const s80 = specTable('T-203').rows.find(
      (one) => bare(one.by['キー'] ?? '') === 'propertyPanelWidth',
    )
    expect(s80, 'table T-203 still has a row for `propertyPanelWidth`').not.toBe(undefined)
    expect(Number(bare(s80?.by['既定'] ?? ''))).toBe(CLOSED_WIDTH)
    expect(CLOSED_WIDTH).toBe(0)
    expect(S_171, 'S-171 is the width the panel OPENS to').toBeGreaterThan(CLOSED_WIDTH)
  })

  it('the document these cases drive is a valid GRS JSON document, with its panel open', () => {
    const made = openPanelDocument()
    const report = validateDocument(made)
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
    expect((made as any).documentSettings.propertyPanelWidth).toBe(S_171)
  })

  it('FR-052: the width chosen leaves the `Row Area` wider than zero', () => {
    // 「判定は `Row Area` の幅が 0 より大きいことをもって行うこと（MUST）」 -- so
    // a fixture that failed this would be an unlawful document rather than a
    // case about `Esc`.
    expect(stage().rowAreaWidth()).toBeGreaterThan(0)
  })

  it('MK-13: a double click on a Task puts the panel on the screen', () => {
    // 表 T-023 `MK-13`: 「タスク（名称ラベルと本体のどちらでも）＝プロパティ
    // パネルを出し…」, and FR-072: 「出す入口は 表 T-023 の `MK-13` と `IC-17`
    // の 2 つである」 -- the premise every case below rests on, and a MUST in its
    // own right: a panel that never goes up has failed `MK-13` before `Esc` is
    // reached at all.
    const built = withThePanelUp()
    expect(built.panelIsUp(), `${U_25} is described once a Task has been double clicked`).toBe(true)
  })

  it('⛔ FR-072 (MUST NOT): one plain press selects and does NOT put the panel up', () => {
    // 「表 T-023c の選択が動いたことだけを理由に、パネルを出し始めてはならない
    // （MUST NOT）」. ⭐ THE OTHER HALF OF THE PREMISE: without it, a loop that put
    // the panel up on every press would pass every case in this file, and the
    // route above would prove nothing about `MK-13`.
    const built = stage()
    selectTheTask(built)
    expect(
      built.panelIsUp(),
      'FR-072 (MUST NOT): 選択が動いたことだけを理由にパネルを出し始めてはならない',
    ).toBe(false)
  })

  it('SK-13: `F1` puts a second 面 up, and it is not the panel', () => {
    const built = withThePanelUp()
    built.send(OPEN_HELP())
    expect(built.modalIsUp()).toBe(true)
    expect(built.panelIsUp(), 'opening the help does not take the panel away').toBe(true)
  })
})

// ===========================================================================
// (a) IN-4's first level reaches the panel
// ===========================================================================

describe('IN-4 of table T-028 -- `Esc` closes the `Properties Panel`', () => {
  it('⛔ MUST: one press of `Esc` takes the panel off the screen', () => {
    // S-99g: 「「面」とは、画面の上に重ねて開き、`Esc` の第 1 階層で閉じられるもの
    // をいう」, and IC-52 of table T-109 names `Properties Panel` among its 面.
    // ⛔ Two rows of the manuscript, and between them there is nothing left to
    // decide: the panel is a 面, and `Esc` closes a 面.
    const built = withThePanelUp()

    built.send(ESCAPE())

    expect(built.panelIsUp(), 'IN-4: 消費する階層は … 開いている面 …の順とすること').toBe(false)
  })

  it('⛔ MUST: with the panel up, `Esc` is consumed and does NOT reach the browser', () => {
    // IN-4a: 「消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）」 --
    // the contrapositive is what this case reads. A panel that is a 面 is
    // something to consume, so the key is assigned and MK-10 (MUST) stops the
    // browser's own handling of it.
    // ⭐ ASKED WITHOUT SENDING, which is what the member is for: it is answered
    // BEFORE the watcher hears the happening, so it reports the screen as it
    // stands.
    const built = withThePanelUp()

    expect(
      built.loop.isBrowserDefaultStopped(ESCAPE()),
      'the open panel is IN-4のいう「開いている面」, so the press has something to spend',
    ).toBe(true)
  })

  it('⛔ IN-4a (MUST): the press AFTER the panel has gone reaches the browser', () => {
    // The other half of the pair, so that a failure says WHICH side broke: the
    // panel is exactly one level, no more and no less.
    const built = withThePanelUp()

    built.send(ESCAPE())

    expect(
      built.loop.isBrowserDefaultStopped(ESCAPE()),
      'IN-4a: 全画面表示から `Esc` で戻る経路（`FR-071`）はブラウザ側の挙動である',
    ).toBe(false)
  })

})

// ===========================================================================
// (b) One press, one level
// ===========================================================================

describe('IN-4 of table T-028 -- one press spends exactly ONE level', () => {
  it('⛔ MUST: with a modal AND the panel up, the first `Esc` takes exactly one of them', () => {
    // 「`Esc` は … 1 階層ぶん消費し」. ⚠️ WHICH OF THE TWO GOES FIRST IS NOT
    // ASSERTED: S-99g holds exactly ONE open surface, so the manuscript never
    // contemplates two standing at once and orders no two 面 against each other.
    // ⛔ What it does settle is that one press does not take both.
    const built = withThePanelUp()
    built.send(OPEN_HELP())
    expect(built.modalIsUp() && built.panelIsUp(), 'both 面 are up before the press').toBe(true)

    built.send(ESCAPE())

    const stillUp = [built.modalIsUp(), built.panelIsUp()].filter((one) => one)
    expect(stillUp, 'IN-4 (MUST): 1 階層ぶん消費し -- one press, one level').toHaveLength(1)
  })

  it('⛔ MUST: the second press takes the other one', () => {
    // The ladder is spent one level per press, so two presses spend two levels.
    const built = withThePanelUp()
    built.send(OPEN_HELP())

    built.send(ESCAPE())
    built.send(ESCAPE())

    expect(built.modalIsUp()).toBe(false)
    expect(built.panelIsUp()).toBe(false)
  })

  it('⛔ IN-4a (MUST): with both 面 spent, the next press reaches the browser', () => {
    const built = withThePanelUp()
    built.send(OPEN_HELP())

    built.send(ESCAPE())
    built.send(ESCAPE())

    expect(built.loop.isBrowserDefaultStopped(ESCAPE())).toBe(false)
  })
})

// ===========================================================================
// (c) FR-052 -- the closed panel gives its width back to the `Row Area`
// ===========================================================================

describe('FR-052 and S-80 -- a closed panel leaves no gap at the right edge', () => {
  it("⛔ MUST: the panel keeps S-80's closed width once `Esc` has taken it", () => {
    // S-80: 「⭐ `0` であることが「閉じている」であり」. There is no third reading
    // of it -- a panel that is off the screen while the document still carries a
    // width is the state version 1.08 of the specification records being
    // measured in the running app: a strip at the window's right edge with
    // nothing drawn into it.
    const built = withThePanelUp()
    expect(built.panelWidth(), 'the panel has a width before the press').toBe(S_171)

    built.send(ESCAPE())

    expect(built.panelWidth()).toBe(CLOSED_WIDTH)
  })

  it('the `Row Area` grows by exactly what the panel had', () => {
    // FR-052: 「`Schedule Canvas` の幅から `canvasPadding`（`S-56`）と 2 つの幅と
    // 縦のスクロールバーの太さを引いた残りが `Row Area` の幅であり（`U-50`）」.
    // ⭐ So the two widths move together by arithmetic, and this case is what
    // says the closing really reached the width rather than only the drawing.
    const built = withThePanelUp()
    const before = built.rowAreaWidth()

    built.send(ESCAPE())

    expect(built.rowAreaWidth() - before, 'FR-052: the残り is what the Row Area gets').toBe(S_171)
  })
})
