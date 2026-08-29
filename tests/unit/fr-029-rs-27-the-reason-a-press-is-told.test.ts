// FR-029 (MUST): an entrance that has nothing to do says WHY -- but only when
// it is pressed. Table T-233's `RS-27` is the reason it carries.
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
// ⛔ WHY THIS FILE EXISTS -- THE HOLE IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// `RS-27` arrived on 2026-08-30 (CR-306) and nothing has asked for it since.
// Broken on purpose, no case went red -- neither the telling itself, nor the
// MUST NOT beside it that keeps the telling off a pointer that merely rested
// there.
//
// ⭐ AND THE MUST NOT IS THE EASIER THING TO GET WRONG. `FR-092`'s `EZ-2`
// already raises an explanation when a pointer rests on an entrance, so a
// reason hung on the same trigger would look like it was working.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   `FR-029`   「押されたときに限り、行えない理由を通知すること（MUST）。作法は
//              `FR-076` の 表 T-037 の `NT-1` に従い、運ぶ理由は同要求の 表 T-233 の
//              行とすること（MUST）。」／⛔ 「ポインタが乗っただけで理由を出しては
//              ならない（MUST NOT）」（利用者の裁定 2026-08-30「薄く描け。押下した
//              場合のみ理由を説明するポップアップを出せ」）—— 「乗せて出るのは
//              `FR-092` の `EZ-2` の説明であり、あちらはその入口が何をするものかを
//              述べるものであって、いま行えない理由ではない。」
//   表 T-233 RS-27 「押した入口が、いま行えることを持たない | `NT-1` | `FR-029`」
//              -- read at run time below, never typed.
//   表 T-037 NT-1 「入力を受け付けないとき | どの項目が、なぜ誤りかを文字で示すこと
//              （MUST）。訂正の手がかりを添えること。色や枠だけで示してはならない
//              （MUST NOT）」
//   表 T-233 の結び 「⭐ 通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に
//              無い理由を運んではならない（MUST NOT）—— 理由の語は `FR-038` の辞書
//              が持ち、辞書は行 ID で引く。」
//   表 T-051 HF-2 IC-58 「行の配下をすべて開く」 -- ⭐ THE SITUATION CR-306 WAS
//              RAISED FROM, in the user's own screen: 「起動直後の画面である ——
//              何も畳まっていないので、画面上の「開く」は 1 つ残らず死んでいる」.
//   表 T-109 IC-58 / IC-82  the two entrances of the `Row Title Panel` these
//              cases press: one with nothing to do, one with work.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported
// declarations of `frame-loop.ts` (`FrameEnvironment`, `FrameLoop`,
// `ScreenWiring`) and the one signature `frameLoop(surface, first, env, screen?,
// files?, showPointerShape?)`; the exported types of `screen-renderer.ts`
// (`ScreenPart`, `ScreenSurface`, `ScreenView`, `DisplayLanguage`) and of
// `input-command-translator.ts` (`HumanInput`, `InputModifiers`, `KeyInput`,
// `PointerButton`, `PointerInput`, `PointerPhase`). ⛔ NO FUNCTION BODY WAS READ.
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
//   1. WHICH ENTRANCES HAVE NOTHING TO DO. That is each entrance's own rule --
//      HF-2's opening control is used here because table T-051 states its
//      condition outright and the document these cases drive meets it. ⛔ A walk
//      over every row of 表 T-109 would be this file deciding, for entrances
//      whose条件 lives elsewhere, when they are spent.
//   2. WHAT THE WORDS SAY. FR-038's dictionary holds them; these cases ask that
//      the words which arrived are the ones that dictionary holds for `RS-27`,
//      which is the join, and never that a particular sentence is good.

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

/** The row of 表 T-233 FR-029 sends, and the manner 表 T-037 gives it. */
const RS_27 = 'RS-27'
const MANNER_OF_RS_27 = bare(rowOf('T-233', RS_27).by['作法'] ?? '')

/** U-22 of 表 T-103 -- the surface a row's controls are answered as. */
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

/** HF-2's control, and one that has work on the same row. */
const IC_OPEN_BELOW = 'IC-58'
const IC_DELETE_ROW = 'IC-82'

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
const FR_029_NOT_ON_HOVER = 'ポインタが乗っただけで理由を出してはならない（MUST NOT）'

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

// ---------------------------------------------------------------------------
// The document these cases drive. Copied from
// tests/unit/in-4-escape-closes-the-panel.test.ts.
// ---------------------------------------------------------------------------

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

/**
 * Two rows, one under the other, and NOTHING FOLDED.
 *
 * ⭐ THAT IS THE WHOLE FIXTURE: HF-2's control opens what is folded, so with
 * nothing folded anywhere it is the entrance FR-029 calls 「いま文書にも画面にも
 * 何も変えられない」. ⚠️ It is also the screen the user was looking at when the
 * ruling was made -- CR-306: 「起動直後の画面である」.
 */
function nothingFoldedDocument(): Document {
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
      tasks: [task(1, '2026-04-01', '2026-04-10', 'One'), task(2, '2026-05-06', '2026-05-20', 'Two')],
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

/** Somewhere inside the `Row Title Panel`, which the fake answers for. */
const ON_THE_ROW = { x: 80, y: 120 }

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
  groupIds(): readonly string[]
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, nothingFoldedDocument(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  return {
    loop,
    screen,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    aimAtEntry: (part, entry) => {
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
    aimAt: (entry, groupId) => {
      screen.drawAt({
        part: ROW_TITLE_PANEL,
        entry: entry as any,
        format: null,
        rowGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    },
    aimAtNothing: () => {
      screen.drawAt(null)
    },
    notices: () => screen.last().notices,
    groupIds: () =>
      (loop.document() as any).schedule.taskGroups.map((one: { id: string }) => one.id),
  }
}

/** One press and its release on whatever the surface is answering with. */
function press(built: Stage): void {
  built.send(pointer('down', ON_THE_ROW.x, ON_THE_ROW.y))
  built.send(pointer('up', ON_THE_ROW.x, ON_THE_ROW.y))
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING -- rule 04 section 2.
    expect(ROW_TITLE_PANEL).toBe('Row Title Panel')
    expect(MANNER_OF_RS_27, '表 T-233 still gives RS-27 its manner').toBe('NT-1')
    expect(rowOf('T-233', RS_27).by['正'] ?? '').toContain('FR-029')
  })

  it('⛔ FR-029 still ties the telling to a PRESS, and keeps it off a hover', () => {
    expect(REQUIREMENTS).toContain(FR_029_ONLY_WHEN_PRESSED)
    expect(REQUIREMENTS).toContain(FR_029_NOT_ON_HOVER)
  })

  it("FR-038's dictionary holds words for RS-27, and two languages' worth", () => {
    const words = wordsFor(RS_27)
    expect(words.text.ja.length).toBeGreaterThan(0)
    expect(words.text.en.length).toBeGreaterThan(0)
    // ⭐ The pair that makes the language case below a test: one word for two
    // languages would pass it whatever the loop did.
    expect(words.text.ja).not.toBe(words.text.en)
  })

  it('the document these cases drive is a valid GRS JSON document, with nothing folded', () => {
    const made = nothingFoldedDocument()
    const report = validateDocument(made)
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
    for (const group of (made as any).schedule.taskGroups) expect(group.isCollapsed).toBe(false)
  })

  it('nothing is being told before anything is pressed', () => {
    // ⭐ The premise without which every count below counts nothing.
    expect(stage().notices()).toEqual([])
  })
})

// ===========================================================================
// (a) FR-029 -- a press on a spent entrance is told why
// ===========================================================================

describe('FR-029 (MUST) -- a press on an entrance with nothing to do carries RS-27', () => {
  it('⛔ MUST: the press raises exactly one telling', () => {
    // 「押されたときに限り、行えない理由を通知すること（MUST）」 -- with nothing
    // folded anywhere, HF-2's control has nothing to open.
    const built = stage()
    built.aimAt(IC_OPEN_BELOW, ALPHA)

    press(built)

    expect(
      built.notices().length,
      'FR-029 (MUST): 押されたときに限り、行えない理由を通知すること',
    ).toBe(1)
  })

  it('⛔ MUST: it follows NT-1, and carries the words FR-038 holds for RS-27', () => {
    // 「作法は `FR-076` の 表 T-037 の `NT-1` に従い、運ぶ理由は同要求の 表 T-233 の
    //   行とすること（MUST）」, and 表 T-233's closing rule: 「同表に無い理由を運んで
    //   はならない（MUST NOT）」.
    const words = wordsFor(RS_27)
    const built = stage()
    built.aimAt(IC_OPEN_BELOW, ALPHA)

    press(built)

    const told = built.notices()[0]
    expect(told?.manner, `表 T-233 gives ${RS_27} the manner ${MANNER_OF_RS_27}`).toBe(
      MANNER_OF_RS_27,
    )
    expect(told?.text, `NT-1 (MUST): the words FR-038 holds for ${RS_27}`).toBe(words.text.ja)
  })

  it('⭐ the words come from the dictionary and not from this loop', () => {
    // FR-038 (MUST NOT) forbids a second store of translated strings, so the
    // same reason in the other language is the same row read out of the same
    // dictionary. ⛔ A loop with a sentence of its own would answer alike in
    // both.
    const words = wordsFor(RS_27)
    const built = stage('en')
    built.aimAt(IC_OPEN_BELOW, ALPHA)

    press(built)

    expect(built.notices()[0]?.text).toBe(words.text.en)
  })

  it('⭐ NT-3a’s next step is carried too, so the telling is not a dead end', () => {
    // ⚠️ `Notice.nextSteps` is filled from the same row of the dictionary; this
    // case asks that the step which arrived is that row's, and never what it
    // says.
    const words = wordsFor(RS_27)
    const built = stage()
    built.aimAt(IC_OPEN_BELOW, ALPHA)

    press(built)

    expect(built.notices()[0]?.nextSteps).toContain(words.nextStep.ja)
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
    built.aimAt(IC_OPEN_BELOW, ALPHA)

    built.send(pointer('move', ON_THE_ROW.x, ON_THE_ROW.y))

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
    built.aimAt(IC_OPEN_BELOW, ALPHA)

    for (let turn = 0; turn < 5; turn += 1) {
      built.send(pointer('move', ON_THE_ROW.x, ON_THE_ROW.y))
    }

    expect(built.notices()).toEqual([])
  })

  it('⭐ and the very same entrance, pressed, does tell -- so the pair is about the press', () => {
    // ⛔ WITHOUT THIS, THE TWO CASES ABOVE WOULD PASS ON A LOOP THAT NEVER TELLS
    // ANYTHING AT ALL. One stage, one entrance: rested at first and pressed
    // after.
    const built = stage()
    built.aimAt(IC_OPEN_BELOW, ALPHA)
    built.send(pointer('move', ON_THE_ROW.x, ON_THE_ROW.y))
    expect(built.notices()).toEqual([])

    press(built)

    expect(built.notices().length).toBe(1)
  })
})

// ===========================================================================
// (c) An entrance that DOES have work is told nothing
// ===========================================================================

describe('FR-029 -- the telling belongs to an entrance that is spent, and to no other', () => {
  it('⛔ a press on an entrance that has work raises no reason', () => {
    // 「その入口を押しても、いま文書にも画面にも何も変えられないとき」 is the
    // condition of the whole rule, so an entrance that changes something is
    // outside it. ⚠️ IC-82 deletes the row, which is a change to the document --
    // and this case reads only that no reason was told, never what the press did
    // (FR-032 owns that).
    const built = stage()
    built.aimAt(IC_DELETE_ROW, BETA)

    press(built)

    expect(
      built.notices().filter((one) => one.manner === MANNER_OF_RS_27).length,
      'FR-029: an entrance with work to do is not told it has none',
    ).toBe(0)
  })

  it('⭐ and pressing nothing at all raises no reason either', () => {
    // The surface answers no part, so no entrance was pressed. ⛔ A loop that
    // told this reason for every press would pass every case in (a).
    const built = stage()
    built.aimAtNothing()

    press(built)

    expect(built.notices().filter((one) => one.manner === MANNER_OF_RS_27).length).toBe(0)
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
  it('⛔ MUST: not one of them is silent', () => {
    const words = wordsFor(RS_27)
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
      const told = built
        .notices()
        .some((one) => one.manner === MANNER_OF_RS_27 && one.text === words.text.ja)
      if (!told) silent.push(entrance.icon)
    }

    expect(
      silent,
      'FR-029 (MUST): 押されたときに限り、行えない理由を通知すること -- these were drawn faint and said nothing',
    ).toEqual([])
  })
})
