// FR-029 (MUST): an entrance that has nothing to do says WHY -- but only when
// it is pressed, and the reason it carries is the row of 表 T-233 that matches
// THAT entrance's situation.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). It is the only layer that may hold a current value (LY-5 of
// table T-060), so it is the side that turns a press into a raised telling and
// hands the frame that carries it to the surface.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ THIS FILE REPLACES tests/unit/fr-029-rs-27-the-reason-a-press-is-told.ts,
// AND THE RULE IT ASSERTED WAS REVERSED
// ---------------------------------------------------------------------------
//
// What stood here asked that EVERY faint entrance answer a press with `RS-27`.
// CR-307 (2026-08-30) turned that into the thing FR-029 now forbids:
//
//   ⛔ 「当たる行があるのに落ち先を運んではならない（MUST NOT）」（利用者の裁定
//      2026-08-30「通知は『行えることがありません』じゃ意味がないだろ。できない
//      理由を表示しろよ」）
//
// 表 T-233 gained eight rows on the same day -- `RS-28` .. `RS-35` -- one per
// situation a row control, a header toggle or a palette entry can be spent in.
// ⭐ `RS-27` survives ONLY as the landing place FR-029 gives to an entrance no
// row of that table covers: 「⚠️ どの入口にも当たる行が無いときの落ち先が `RS-27`
// である。」
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   `FR-029`   「その入口を押しても、いま文書にも画面にも何も変えられないときは、
//              その入口を薄く描くこと（MUST）」／「押されたときに限り、行えない理由を
//              通知すること（MUST）。作法は `FR-076` の 表 T-037 の `NT-1` に従い、
//              運ぶ理由は、押された入口の場面に当たる同要求の 表 T-233 の行とすること
//              （MUST）」／⛔ 「当たる行があるのに落ち先を運んではならない（MUST
//              NOT）」／⛔ 「ポインタが乗っただけで理由を出してはならない（MUST
//              NOT）」（利用者の裁定 2026-08-30「薄く描け。押下した場合のみ理由を
//              説明するポップアップを出せ」）
//   表 T-233   RS-28 「配下に、開ける行が 1 つも無い」（正: 表 T-051 の `HF-2`）
//              RS-29 「配下に、畳める行が 1 つも無い」（`HF-11`）
//              RS-30 「その行は畳まれておらず、隠れている子も無い」（`HF-13`）
//                    ⛔⛔ THE ROW MOVED ON 2026-08-31（利用者の指示「サンプルと
//                    同じ動作にしろ」）: its 正 was `HF-3` and its 場面 was 「その
//                    行は既に畳まれている」, which stopped being reachable when
//                    `HF-3` became `HR-6`. ⭐ It is now `HF-13`'s spent 場面 --
//                    the negation of `HR-7`'s two ways of having work -- and the
//                    roster below carries it again, on `IC-90`.
//              RS-31 「畳まれた行が 1 つも無い」（`HF-10`）
//              RS-32 「開いている行が 1 つも無い」（`HF-12`）
//              RS-33 「予定と実績のうち、いま出ているのが一方だけである」（`FR-049`）
//              RS-34 「揃える相手の `Task` が選ばれていない」（`FR-034`）
//              RS-35 「`Agent API` が入っていないので、対話欄を出せない」（`FR-066`）
//              RS-27 「押した入口が、いま行えることを持たない」（`FR-029`）
//              -- every one read at run time below, never typed.
//   表 T-233 の結び 「⭐ 通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に
//              無い理由を運んではならない（MUST NOT）—— 理由の語は `FR-038` の辞書
//              が持ち、辞書は行 ID で引く。」
//   表 T-037 NT-1 「入力を受け付けないとき | どの項目が、なぜ誤りかを文字で示すこと
//              （MUST）。訂正の手がかりを添えること。色や枠だけで示してはならない
//              （MUST NOT）」
//   表 T-051 の結び ⛔ 「`HF-2` / `HF-3` / `HF-10` / `HF-11` / `HF-12` / `HF-13` /
//              `HF-16` が対象とするのは、いま描かれている行である（MUST）。描かれて
//              いない行の畳みを数えてはならない（MUST NOT）」／⛔ 「その操作で、描か
//              れる行が 1 行も増減しないときは、対象が 1 つも無いものとして扱うこと
//              （MUST）」
//              -- ⭐ THAT CLOSING RULE IS WHAT MAKES EACH FIXTURE BELOW SPENT.
//   表 T-015   HR-3（`HF-2`）／HR-4（`HF-11`）／HR-6（`HF-3`）／HR-7（`HF-13`）,
//              rewritten on 2026-08-31（利用者の指示「サンプルと同じ動作にしろ」）
//              so that each of the four writes the row it was pressed on. ⛔ IT
//              IS WHAT MOVED TWO FIXTURES BELOW: `HR-4` folds the PRESSED row,
//              so `IC-77` is spent only where that row draws no child of its
//              own, and `HR-7` clears the PRESSED row's fold, so `IC-90` is
//              spent only where that row is open and hides no direct child.
//   表 T-109   IC-58 / IC-77 / IC-90 / IC-74 / IC-78 / IC-8 / IC-9 / IC-37 /
//              IC-38 / IC-18 -- the entrances pressed, and the 面 each is on.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported
// declarations of `frame-loop.ts` (`FrameEnvironment`, `FrameLoop`,
// `ScreenWiring`) and the one signature `frameLoop(surface, first, env, screen?,
// files?, showPointerShape?)`; the exported types of `screen-renderer.ts`
// (`ScreenPart`, `ScreenSurface`, `ScreenView`, `DisplayLanguage`) and of
// `input-command-translator.ts` (`HumanInput`, `InputModifiers`, `KeyInput`,
// `PointerButton`, `PointerInput`, `PointerPhase`); and `startup-template.json`,
// which is a generated document and not a body. ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The host, the fake surface and the
// fixture are tests/unit/in-4-escape-closes-the-panel.test.ts's; the way a
// notice is pinned to a row of 表 T-233 through FR-038's dictionary is
// tests/unit/uf-47-48-choosers.test.ts's, which says at length why that is the
// only end this join can be taken from.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. WHICH ROW OF 表 T-233 BELONGS TO AN ENTRANCE THE TABLE DOES NOT NAME.
//      表 T-233 has a 場面 column and no 入口 column, so the pairing is prose.
//      The pairs below are the ones whose 場面 the table states outright, and
//      each one is held to the manuscript by `sameRule` -- the 正 of the entrance's row of
//      表 T-109 and the 正 of the reason's row of 表 T-233 must name the SAME
//      rule. ⛔ A pair the manuscript stops agreeing about fails there rather
//      than passing quietly.
//   2. WHAT THE WORDS SAY. FR-038's dictionary holds them; these cases ask that
//      the words which arrived are the ones that dictionary holds for the row,
//      which is the join, and never that a particular sentence is good.
//   3. WHICH ENTRANCES ARE DRAWN FAINT. That is each entrance's own rule. The
//      walk at the foot reads the faintness the screen itself decided and asks
//      only that a press on it is answered.

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
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than copied
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** The manner 表 T-037 gives one row of 表 T-233. */
const mannerOf = (reason: string): string => bare(rowOf('T-233', reason).by['作法'] ?? '')

/**
 * The rule a row of 表 T-233 or of 表 T-109 says it comes from.
 *
 * ⛔ READ AND NOT TYPED. It is the one thing the two tables have in common, so
 * it is what holds a pair below to the manuscript: `RS-28` and `IC-58` both name
 * 表 T-051 の `HF-2`, and a table that moved either of them apart fails the
 * premise rather than the case.
 */
const ruleOf = (table: string, id: string): string => {
  const cell = bare(rowOf(table, id).by['正'] ?? '')
  const found = [...cell.matchAll(/`([^`]+)`/g)]
  const last = found[found.length - 1]?.[1]
  return last ?? cell
}

/** U-22 of 表 T-103 -- the surface a row's controls are answered as. */
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

/**
 * The 面 表 T-109 puts one entrance on, as that table spells it.
 *
 * ⛔ READ AND NOT TYPED: the 面 column is the join between an entrance and the
 * surface a press on it is answered as, and a file that typed the pairs would be
 * a second copy of that column.
 */
function surfaceOf(icon: string): string {
  const cell = bare(rowOf('T-109', icon).by['面'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error(`表 T-109 ${icon} names no 面`)
  return first
}

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const FR_029_ONLY_WHEN_PRESSED = '押されたときに限り、行えない理由を通知すること（MUST）'
const FR_029_THE_MATCHING_ROW =
  '運ぶ理由は、押された入口の場面に当たる同要求の 表 T-233 の行とすること（MUST）'
const FR_029_NOT_THE_FALLBACK = '当たる行があるのに落ち先を運んではならない（MUST NOT）'
const FR_029_RS_27_IS_THE_FALLBACK = 'どの入口にも当たる行が無いときの落ち先が `RS-27` である'
const FR_029_NOT_ON_HOVER = 'ポインタが乗っただけで理由を出してはならない（MUST NOT）'
const T_051_ONLY_DRAWN_ROWS =
  '描かれていない行の畳みを数えてはならない（MUST NOT）'
const T_051_NO_CHANGE_MEANS_SPENT =
  'その操作で、描かれる行が 1 行も増減しないときは、対象が 1 つも無いものとして扱うこと（MUST）'

/**
 * FR-038's dictionary, as the manuscript keeps it.
 *
 * ⭐ THE MANUSCRIPT'S COPY AND NOT THE BUILT ONE. `docs/spec/_source/` is where
 * the words are written and `src/` holds what is printed from it; rule 04
 * section 1 has these cases driven from docs/spec, and `npm run words:check` is
 * what holds the two together.
 *
 * ⚠️ IT IS WHAT LETS A NOTICE BE PINNED TO ONE ROW OF 表 T-233. `Notice` carries
 * the manner and the WORDS; only `RaisedNotice` carries the reason, and the loop
 * publishes neither its session nor its raised half -- so a case reads the row's
 * words out of here and asks whether those are the words that reached the
 * screen. ⭐ Copied from tests/unit/uf-47-48-choosers.test.ts.
 */
interface ReasonWords {
  readonly rowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

function wordsFor(rowId: string): ReasonWords {
  const found = REASON_WORDS.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${rowId}`)
  return found
}

const FALLBACK = 'RS-27'

// ---------------------------------------------------------------------------
// The documents these cases drive. Copied from
// tests/unit/in-4-escape-closes-the-panel.test.ts and given three rows, one
// under the next, so that "配下" and "this row" cannot answer alike.
// ---------------------------------------------------------------------------

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
const GAMMA = '33333333-3333-4333-8333-333333333333'

interface Fixture {
  /** Rows the person folded (AT-56). */
  readonly folded?: readonly string[]
  /** S-59, `planActualDisplay` -- FR-049's three values. */
  readonly planActual?: 'both' | 'plan-only' | 'actual-only'
}

/**
 * ALPHA > BETA > GAMMA, all three drawn unless a fold hides one.
 *
 * ⭐ THREE DEEP AND NOT TWO, because 表 T-051's closing rule counts 「その操作の
 * 前後で描かれる行の差」: a leaf carries no descendant to hide, so folding it
 * changes no picture at all, and that is what makes `IC-77` on BETA spent while
 * the same control on ALPHA still has work.
 */
function documentWith(part: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const folded = new Set(part.folded ?? [])
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
  const row = (id: string, parentId: string | null, label: string, order: number) => ({
    id,
    parentId,
    label,
    derivedFromTaskUid: null,
    order,
    isCollapsed: folded.has(id),
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
        task(1, '2026-04-01', '2026-04-10', 'One'),
        task(2, '2026-05-06', '2026-05-20', 'Two'),
        task(3, '2026-06-01', '2026-06-12', 'Three'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        row(ALPHA, null, 'Alpha', 0),
        row(BETA, ALPHA, 'Beta', 0),
        row(GAMMA, BETA, 'Gamma', 0),
      ],
      taskGroupMembers: [
        { taskUid: 1, groupId: ALPHA, stackOrder: null },
        { taskUid: 2, groupId: BETA, stackOrder: null },
        { taskUid: 3, groupId: GAMMA, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      ...(part.planActual === undefined ? {} : { planActualDisplay: part.planActual }),
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

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

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

// ---------------------------------------------------------------------------
// Spelling one happening
// ---------------------------------------------------------------------------

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

/** Somewhere inside the surface the fake answers for. */
const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  /** Aim whatever comes next at one entrance of one row. CS-2 freezes it at the press. */
  aimAt(entry: string, groupId: string): void
  /** Aim it at one entrance of a surface that is not a row -- the header, the palette. */
  aimAtEntry(part: string, entry: string): void
  aimAtNothing(): void
  notices(): ScreenView['notices']
}

function stage(part: Fixture = {}, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, documentWith(part), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const at = (surface: string, entry: string, rowGroupId: string | null) => {
    screen.drawAt({
      part: surface,
      entry: entry as any,
      format: null,
      rowGroupId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  }
  return {
    loop,
    screen,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    aimAtEntry: (surface, entry) => at(surface, entry, null),
    aimAt: (entry, groupId) => at(ROW_TITLE_PANEL, entry, groupId),
    aimAtNothing: () => screen.drawAt(null),
    notices: () => screen.last().notices,
  }
}

/** One press and its release on whatever the surface is answering with. */
function press(built: Stage): void {
  built.send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
  built.send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
}

// ---------------------------------------------------------------------------
// The situations 表 T-233 states outright and a press can reach.
// ⭐ TEN AGAIN SINCE 2026-08-31: `RS-30` lost its 場面 when `HF-3` stopped
// folding on 2026-08-30, and the rewrite of the folding family gave it back to
// `HF-13` -- see the pair below, at the place its old one used to stand.
// ---------------------------------------------------------------------------

interface Spent {
  /** The row of 表 T-109 pressed. */
  readonly icon: string
  /** The row of 表 T-233 FR-029 (MUST) makes that press carry. */
  readonly reason: string
  /** The document the press happens in. */
  readonly fixture: Fixture
  /** The row the control belongs to, or `null` for a control the surface owns. */
  readonly onRow: string | null
  /** The 場面 of that row of 表 T-233, in this fixture's own terms. */
  readonly because: string
  /**
   * Presses that put the SCREEN into the state this row's 場面 describes, run
   * before the one that is measured.
   *
   * ⭐⭐ WHY A PRESS AND NOT A FIXTURE. Some of these 場面 are screen states and
   * not document ones, and the manuscript says so: `S-211` of 表 T-206 (段 0 が
   * 畳まれているか) carries 「⛔ **保存しない** —— `S-99g` と同じ立場であり、画面
   * の状態であって日程の内容ではない」. ⇒ there is no column of the document to
   * set, and the only way in is the entrance that writes it.
   */
  readonly primedBy?: readonly { readonly entry: string; readonly onRow: string | null }[]
}

const SPENT: readonly Spent[] = [
  {
    icon: 'IC-58',
    reason: 'RS-28',
    fixture: {},
    onRow: ALPHA,
    because: 'nothing under ALPHA is folded, so HF-2 has no row to open',
  },
  {
    icon: 'IC-77',
    reason: 'RS-29',
    fixture: {},
    // ⛔⛔ THIS PRESS MOVED FROM BETA TO GAMMA ON 2026-08-31（利用者の指示「サンプル
    // と同じ動作にしろ」）. `HF-11` was 「その行の配下をすべて畳む」, under which
    // BETA -- whose only descendant is the leaf GAMMA -- had nothing to fold; it
    // is now 表 T-015 の `HR-4`, 「**選択した `TaskGroup` を畳むこと（MUST）**」 ⇒
    // 「**その直下の子から下が描かれなくなる**」, so a press on BETA takes GAMMA
    // off the screen and ACTS. ⭐ The leaf is what is left spent.
    onRow: GAMMA,
    because: 'GAMMA is a drawn leaf, so folding it takes no drawn row away',
  },
  {
    // ⛔⛔ `IC-59` / `RS-30` STOOD HERE AND `IC-90` HAS TAKEN ITS PLACE.
    // 表 T-233's `RS-30` read 「その行は既に畳まれている」 with 正 表 T-051 の
    // `HF-3`; on 2026-08-30 利用者の裁定 gave that entrance 表 T-015 の `HR-6`
    // (hide), so 「既に畳まれている」 stopped being its situation and the row it
    // stands on is by definition DRAWN -- hiding it always takes one row off the
    // screen, and `HF-3` says so: 「⭐ **描かれている行はいつでも隠せるので、本操作
    // 子を薄く描く場面は無い**」.
    // ⭐⭐ ON 2026-08-31 THE ROW MOVED TO `HF-13` AND WAS REWORDED 「その行は畳まれ
    // ておらず、隠れている子も無い」 -- the negation of `HR-7`'s two ways of having
    // work: 「**選択した `TaskGroup` の畳みだけを解くこと（MUST）**」 and 「⭐ **直下
    // の子が `HR-6` で隠されているときは、その隠しも解くこと（MUST）**」. `HF-13`
    // states the spent side itself: 「⛔ **開ける直下の子が 1 つも無いときは、
    // `FR-029` に従って薄く描くこと（MUST）**」.
    // ⇒ an untouched document, where ALPHA is open and hides no child, is that
    // 場面 exactly.
    icon: 'IC-90',
    reason: 'RS-30',
    fixture: {},
    onRow: ALPHA,
    because: 'ALPHA is not folded and hides no direct child, so HR-7 has nothing to open',
  },
  {
    icon: 'IC-74',
    reason: 'RS-31',
    fixture: {},
    onRow: null,
    because: 'no row anywhere is folded, so HF-10 has nothing to open',
  },
  {
    icon: 'IC-78',
    reason: 'RS-32',
    fixture: {},
    onRow: null,
    // ⛔⛔ ONE FOLD OF EVERY ROW IS NO LONGER ENOUGH TO SPEND THIS ONE, AND
    // 表 T-015's `HR-2` IS WHY: 「⛔⛔ **最も浅い段の行も畳むこと（MUST）** ——
    // ⭐ **パネルの頭は最も浅い段のさらに上、すなわち段 0 として扱う**」, and
    // `HF-12` repeats it. ⇒ while ALPHA alone is folded there is still 段 0 to
    // fold, and the press acts. ⭐ The 場面 「開いている行が 1 つも無い」 is
    // reached only once 段 0 itself is down, which is the state a first press
    // on this same entrance leaves behind.
    primedBy: [{ entry: 'IC-78', onRow: null }],
    because: 'a first press folded 段 0 itself, so no drawn row and no level is left open',
  },
  {
    icon: 'IC-8',
    reason: 'RS-33',
    fixture: { planActual: 'plan-only' },
    onRow: null,
    because: 'the plan is the only one of the two showing, and S-59 has no fourth value',
  },
  {
    icon: 'IC-9',
    reason: 'RS-33',
    fixture: { planActual: 'actual-only' },
    onRow: null,
    because: 'the actual is the only one of the two showing, and S-59 has no fourth value',
  },
  {
    icon: 'IC-37',
    reason: 'RS-34',
    fixture: {},
    onRow: null,
    because: 'no Task is chosen, so FR-034 has nothing to align',
  },
  {
    icon: 'IC-38',
    reason: 'RS-34',
    fixture: {},
    onRow: null,
    because: 'no Task is chosen, so FR-034 has nothing to align',
  },
  {
    icon: 'IC-18',
    reason: 'RS-35',
    fixture: {},
    onRow: null,
    because: 'the Agent API is not in, so FR-066 cannot show the dialogue field',
  },
]

/** Aim one entrance of one row -- or of a surface, where the row is null. */
function aim(built: Stage, entry: string, onRow: string | null): void {
  if (onRow === null) built.aimAtEntry(surfaceOf(entry), entry)
  else built.aimAt(entry, onRow)
}

/** Aim one of those situations and press it. */
function pressed(one: Spent, language: DisplayLanguage = 'ja'): Stage {
  const built = stage(one.fixture, language)
  for (const first of one.primedBy ?? []) {
    aim(built, first.entry, first.onRow)
    press(built)
  }
  aim(built, one.icon, one.onRow)
  press(built)
  return built
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING -- rule 04 section 2.
    expect(ROW_TITLE_PANEL).toBe('Row Title Panel')
    expect(mannerOf(FALLBACK), '表 T-233 still gives RS-27 its manner').toBe('NT-1')
    expect(ruleOf('T-233', FALLBACK)).toBe('FR-029')
  })

  it('⛔ FR-029 ties the telling to a PRESS, to the MATCHING row, and off a hover', () => {
    expect(REQUIREMENTS).toContain(FR_029_ONLY_WHEN_PRESSED)
    expect(REQUIREMENTS).toContain(FR_029_THE_MATCHING_ROW)
    // ⛔ THE SENTENCE THAT REVERSED THIS FILE, pinned so that a manuscript which
    // went back to one reason for every entrance fails here first.
    expect(REQUIREMENTS).toContain(FR_029_NOT_THE_FALLBACK)
    expect(REQUIREMENTS).toContain(FR_029_RS_27_IS_THE_FALLBACK)
    expect(REQUIREMENTS).toContain(FR_029_NOT_ON_HOVER)
  })

  it('⛔ 表 T-051 still counts the DRAWN rows, and calls a still picture spent', () => {
    // ⭐ THE RULE EVERY FIXTURE ABOVE RESTS ON. Without it, `IC-77` on a row
    // whose only child is a leaf would still be armed and the RS-29 case would
    // be asserting the opposite of the manuscript.
    expect(REQUIREMENTS).toContain(T_051_ONLY_DRAWN_ROWS)
    expect(REQUIREMENTS).toContain(T_051_NO_CHANGE_MEANS_SPENT)
  })

  it('⛔ each pair below is the manuscript’s own: the entrance and the reason name one rule', () => {
    // ⛔ THE ONE MACHINE-CHECKABLE HALF OF A PAIRING THAT IS OTHERWISE PROSE.
    // 表 T-233 has a 場面 column and no 入口 column, so nothing joins a row to an
    // entrance except the rule both of them cite.
    for (const one of SPENT) {
      expect(
        ruleOf('T-109', one.icon),
        `表 T-109 ${one.icon} and 表 T-233 ${one.reason} no longer name one rule`,
      ).toBe(ruleOf('T-233', one.reason))
    }
  })

  it('every reason these cases expect follows NT-1, and has words in two languages', () => {
    for (const reason of [...new Set(SPENT.map((one) => one.reason)), FALLBACK]) {
      expect(mannerOf(reason), `表 T-233 ${reason}`).toBe('NT-1')
      const words = wordsFor(reason)
      expect(words.text.ja.length, reason).toBeGreaterThan(0)
      expect(words.text.en.length, reason).toBeGreaterThan(0)
      // ⭐ The pair that makes the language case below a test: one word for two
      // languages would pass it whatever the loop did.
      expect(words.text.ja, reason).not.toBe(words.text.en)
    }
  })

  it('⭐ the eight rows CR-307 raised say eight different things', () => {
    // ⛔ WITHOUT THIS, A DICTIONARY THAT ANSWERED ALIKE FOR EVERY ROW WOULD MAKE
    // "carries RS-29 and not RS-27" pass on a loop that carries neither.
    const said = SPENT.map((one) => wordsFor(one.reason).text.ja)
    expect(new Set([...said, wordsFor(FALLBACK).text.ja]).size).toBe(
      new Set(SPENT.map((one) => one.reason)).size + 1,
    )
  })

  it('the documents these cases drive are valid GRS JSON documents', () => {
    for (const one of SPENT) {
      const made = documentWith(one.fixture)
      const report = validateDocument(made)
      expect(report.errors, one.icon).toEqual([])
      expect(report.valid, one.icon).toBe(true)
    }
  })

  it('nothing is being told before anything is pressed', () => {
    // ⭐ The premise without which every count below counts nothing.
    expect(stage().notices()).toEqual([])
  })
})

// ===========================================================================
// (a) FR-029 (MUST) -- the press is answered, and with THAT entrance's row
// ===========================================================================

describe('FR-029 (MUST) -- a press on a spent entrance carries the row that matches it', () => {
  it('⛔ MUST: every one of them raises exactly one telling', () => {
    // 「押されたときに限り、行えない理由を通知すること（MUST）」
    const silent: string[] = []
    for (const one of SPENT) {
      if (pressed(one).notices().length !== 1) silent.push(`${one.icon} (${one.because})`)
    }
    expect(
      silent,
      'FR-029 (MUST): 押されたときに限り、行えない理由を通知すること -- these said nothing',
    ).toEqual([])
  })

  it('⛔ MUST: it follows NT-1 and carries the words FR-038 holds for THAT row', () => {
    // 「作法は `FR-076` の 表 T-037 の `NT-1` に従い、運ぶ理由は、押された入口の場面に
    //   当たる同要求の 表 T-233 の行とすること（MUST）」
    const wrong: string[] = []
    for (const one of SPENT) {
      const told = pressed(one).notices()[0]
      const want = wordsFor(one.reason)
      if (told?.manner !== mannerOf(one.reason) || told?.text !== want.text.ja) {
        wrong.push(`${one.icon}: wanted ${one.reason} (${one.because}), got ${told?.text ?? 'nothing'}`)
      }
    }
    expect(wrong, 'FR-029 (MUST): 運ぶ理由は、押された入口の場面に当たる行とすること').toEqual([])
  })

  it('⛔ MUST NOT: not one of them falls back to RS-27', () => {
    // 「当たる行があるのに落ち先を運んではならない（MUST NOT）」（利用者の裁定
    //   2026-08-30「通知は『行えることがありません』じゃ意味がないだろ。できない理由を
    //   表示しろよ」）。⭐ THIS IS THE WHOLE OF CR-307: the file that stood here
    //   asked for exactly what this case now forbids.
    const fell: string[] = []
    for (const one of SPENT) {
      const told = pressed(one).notices()[0]
      if (told?.text === wordsFor(FALLBACK).text.ja) fell.push(`${one.icon} -> ${one.reason}`)
    }
    expect(fell, 'FR-029 (MUST NOT): 当たる行があるのに落ち先を運んではならない').toEqual([])
  })

  it('⭐ the words come from the dictionary and not from this loop', () => {
    // FR-038 (MUST NOT) forbids a second store of translated strings, so the
    // same reason in the other language is the same row read out of the same
    // dictionary. ⛔ A loop with a sentence of its own would answer alike in
    // both.
    const wrong: string[] = []
    for (const one of SPENT) {
      const told = pressed(one, 'en').notices()[0]
      if (told?.text !== wordsFor(one.reason).text.en) wrong.push(one.icon)
    }
    expect(wrong).toEqual([])
  })

  it('⭐ NT-3a’s next step is carried too, so no telling is a dead end', () => {
    // ⚠️ `Notice.nextSteps` is filled from the same row of the dictionary; this
    // case asks that the step which arrived is that row's, and never what it
    // says.
    const wrong: string[] = []
    for (const one of SPENT) {
      const told = pressed(one).notices()[0]
      if (!(told?.nextSteps ?? []).includes(wordsFor(one.reason).nextStep.ja)) wrong.push(one.icon)
    }
    expect(wrong).toEqual([])
  })

  it('⭐ 表 T-233 is the whole roster: no telling carries words the table has no row for', () => {
    // 表 T-233 の結び: 「通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い
    //   理由を運んではならない（MUST NOT）」
    const known = new Set(REASON_WORDS.map((one) => one.text.ja))
    const strange: string[] = []
    for (const one of SPENT) {
      for (const told of pressed(one).notices()) {
        if (!known.has(told.text)) strange.push(`${one.icon}: ${told.text}`)
      }
    }
    expect(strange, '表 T-233 (MUST NOT): 同表に無い理由を運んではならない').toEqual([])
  })
})

// ===========================================================================
// (b) FR-029 (MUST NOT) -- a pointer that only rested there is told nothing
// ===========================================================================

describe('FR-029 (MUST NOT) -- resting a pointer on it is not a press', () => {
  it('⛔ MUST NOT: moving onto the entrance tells no reason', () => {
    // 「ポインタが乗っただけで理由を出してはならない（MUST NOT）—— 乗せて出るのは
    //   `FR-092` の `EZ-2` の説明であり、あちらはその入口が何をするものかを述べる
    //   ものであって、いま行えない理由ではない」（利用者の裁定 2026-08-30）.
    const built = stage()
    built.aimAt('IC-58', ALPHA)

    built.send(pointer('move', ON_THE_SURFACE.x, ON_THE_SURFACE.y))

    expect(
      built.notices(),
      'FR-029 (MUST NOT): ポインタが乗っただけで理由を出してはならない',
    ).toEqual([])
  })

  it('⛔ MUST NOT: nor does resting there over several frames', () => {
    // ⭐ SEVERAL MOVES AND SEVERAL FRAMES, because EZ-2's explanation is raised
    // after a REST -- a reason hung on the same clock would appear only once the
    // pointer had been still for a while, and a single move would not see it.
    const built = stage()
    built.aimAt('IC-58', ALPHA)

    for (let turn = 0; turn < 5; turn += 1) {
      built.send(pointer('move', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    }

    expect(built.notices()).toEqual([])
  })

  it('⭐ and the very same entrance, pressed, does tell -- so the pair is about the press', () => {
    // ⛔ WITHOUT THIS, THE TWO CASES ABOVE WOULD PASS ON A LOOP THAT NEVER TELLS
    // ANYTHING AT ALL. One stage, one entrance: rested at first and pressed
    // after.
    const built = stage()
    built.aimAt('IC-58', ALPHA)
    built.send(pointer('move', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    expect(built.notices()).toEqual([])

    press(built)

    expect(built.notices().length).toBe(1)
  })
})

// ===========================================================================
// (c) An entrance that DOES have work is told nothing
// ===========================================================================

describe('FR-029 -- the telling belongs to an entrance that is spent, and to no other', () => {
  /** Every situation above, turned into the one where the same control has work. */
  const ARMED: readonly { readonly icon: string; readonly fixture: Fixture; readonly onRow: string | null; readonly because: string }[] =
    [
      {
        icon: 'IC-58',
        fixture: { folded: [BETA] },
        onRow: ALPHA,
        because: 'BETA is folded under ALPHA, so opening 配下 draws GAMMA again',
      },
      {
        icon: 'IC-77',
        fixture: {},
        onRow: ALPHA,
        because: 'folding 配下 of ALPHA folds BETA, which takes GAMMA off the picture',
      },
      {
        icon: 'IC-59',
        fixture: {},
        onRow: ALPHA,
        because: 'ALPHA is open and folding it takes BETA and GAMMA off the picture',
      },
      {
        icon: 'IC-74',
        fixture: { folded: [BETA] },
        onRow: null,
        because: 'BETA is folded, so opening every row draws GAMMA again',
      },
      {
        icon: 'IC-78',
        fixture: {},
        onRow: null,
        because: 'ALPHA and BETA are open, so folding every row takes rows off the picture',
      },
      {
        icon: 'IC-8',
        fixture: { planActual: 'both' },
        onRow: null,
        because: 'both are showing, so hiding the plan leaves the actual',
      },
      {
        icon: 'IC-9',
        fixture: { planActual: 'both' },
        onRow: null,
        because: 'both are showing, so hiding the actual leaves the plan',
      },
    ]

  it('⛔ an entrance that has work raises no reason at all', () => {
    // 「その入口を押しても、いま文書にも画面にも何も変えられないとき」 is the
    // condition of the whole rule, so an entrance that changes something is
    // outside it. ⚠️ These cases read only that no reason was told, never what
    // the press did -- each control's own requirement owns that.
    //
    // ⛔ WITHOUT THIS BLOCK, EVERY CASE IN (a) WOULD PASS ON A LOOP THAT TOLD
    // THE REASON FOR EVERY PRESS.
    const told: string[] = []
    const reasons = new Set(REASON_WORDS.map((one) => one.text.ja))
    for (const one of ARMED) {
      const built = stage(one.fixture)
      if (one.onRow === null) built.aimAtEntry(surfaceOf(one.icon), one.icon)
      else built.aimAt(one.icon, one.onRow)
      press(built)
      for (const notice of built.notices()) {
        if (reasons.has(notice.text)) told.push(`${one.icon}: ${one.because} -- ${notice.text}`)
      }
    }
    expect(told, 'FR-029: an entrance with work to do is not told it has none').toEqual([])
  })

  it('⭐ and pressing nothing at all raises no reason either', () => {
    // The surface answers no part, so no entrance was pressed. ⛔ A loop that
    // told a reason for every press would pass every case in (a).
    const built = stage()
    built.aimAtNothing()

    press(built)

    expect(built.notices().filter((one) => one.manner === 'NT-1').length).toBe(0)
  })
})

// ===========================================================================
// (d) The two halves of FR-029 are one rule -- faint means "press me and I will
//     say why"
// ===========================================================================
//
// ⭐ THE WALK, AND WHY IT IS ONE CASE AND NOT MANY. FR-029 states the drawing
// and the telling of ONE condition -- 「その入口を押しても、いま文書にも画面にも
// 何も変えられないときは、その入口を薄く描くこと（MUST）…押されたときに限り、
// 行えない理由を通知すること（MUST）」 -- so the set of entrances drawn faint and
// the set that answer a press with a reason are the SAME set. ⛔ A case per
// entrance would need this file to decide, for each row of 表 T-109, when it is
// spent; the screen already decided that, and the faintness is where it said so.

describe('FR-029 -- every entrance the screen drew faint answers a press with a reason', () => {
  it('⛔ MUST: not one of them is silent, and each carries a row of 表 T-233', () => {
    const known = new Set(REASON_WORDS.map((one) => one.text.ja))
    const drawn = stage()
    const view = drawn.screen.last()

    // The entrances this frame drew faint, each with the 面 表 T-109 puts it on.
    const faint: { readonly icon: string; readonly surface: string }[] = []
    for (const entry of view.appHeaderItems.commands) {
      if (!entry.isEnabled) faint.push({ icon: entry.icon, surface: surfaceOf(entry.icon) })
    }
    for (const group of view.commandPalette?.groups ?? []) {
      for (const entry of group.commands) {
        if (!entry.isEnabled) faint.push({ icon: entry.icon, surface: surfaceOf(entry.icon) })
      }
    }
    // ⛔ A frame that drew none would make this case pass while asserting
    // nothing -- and FR-029's own RATIONALE says such a screen is unlikely: the
    // document opens with nothing selected and nothing folded.
    expect(faint.length, 'no entrance was drawn faint, so this case asked nothing').toBeGreaterThan(
      0,
    )

    const silent: string[] = []
    for (const entrance of faint) {
      const built = stage()
      built.aimAtEntry(entrance.surface, entrance.icon)
      press(built)
      const told = built.notices().some((one) => one.manner === 'NT-1' && known.has(one.text))
      if (!told) silent.push(entrance.icon)
    }

    expect(
      silent,
      'FR-029 (MUST): 押されたときに限り、行えない理由を通知すること -- these were drawn faint and said nothing',
    ).toEqual([])
  })

  it('⛔ MUST NOT: a faint entrance 表 T-233 has a row for does not fall back to RS-27', () => {
    // 「当たる行があるのに落ち先を運んではならない（MUST NOT）」, walked over the
    //   entrances the screen itself drew faint rather than over a list this file
    //   chose. ⚠️ An entrance no row covers is left alone -- `RS-27` is its
    //   landing place, which is all FR-029 keeps that row for.
    const fallback = wordsFor(FALLBACK).text.ja
    const wanted = new Map(SPENT.filter((one) => one.onRow === null).map((one) => [one.icon, one]))
    const drawn = stage()
    const view = drawn.screen.last()

    const faint: string[] = []
    for (const entry of view.appHeaderItems.commands) if (!entry.isEnabled) faint.push(entry.icon)
    for (const group of view.commandPalette?.groups ?? []) {
      for (const entry of group.commands) if (!entry.isEnabled) faint.push(entry.icon)
    }

    const looked = faint.filter((icon) => wanted.has(icon))
    // ⛔ A frame in which none of the eight was faint would ask nothing. IC-18
    // (`Agent API` not in) and IC-37 / IC-38 (nothing chosen) are both true of a
    // document that has only just opened.
    expect(
      looked.length,
      'not one entrance 表 T-233 covers was drawn faint, so this case asked nothing',
    ).toBeGreaterThan(0)

    const fell: string[] = []
    for (const icon of looked) {
      const one = wanted.get(icon)
      if (one === undefined) continue
      const built = stage(one.fixture)
      built.aimAtEntry(surfaceOf(icon), icon)
      press(built)
      for (const notice of built.notices()) {
        if (notice.text === fallback) fell.push(`${icon} -- wanted ${one.reason}`)
      }
    }
    expect(fell, 'FR-029 (MUST NOT): 当たる行があるのに落ち先を運んではならない').toEqual([])
  })
})
