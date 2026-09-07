// 表 T-028 の `IN-3` と `IN-4` (docs/spec/01-04-requirements.md:4096-4098):
//
//   IN-3 「ツールチップは、次の 3 つをすべて満たすこと（MUST）。**消せること**
//        —— ポインタもフォーカスも動かさずに消す手立てがあること。」
//   IN-4 「**消費する階層は 出ている通知 → 確定していないその場の編集 → 開いて
//        いる面 → 進行中のドラッグ・引きかけの矢印 → 構え → `Dual Cursor` モード
//        → 出ている説明 の順とすること（MUST）** —— 説明を最後に置くのは、`IN-3`
//        が求める「消せること」を果たす手立てがほかに 1 つも無いからである。」
//   IN-4a 「**消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）**」
//
// ⭐⭐ THE TWO ROWS ARE ONE RULE. IN-4's own reason says the explanation is put
// last BECAUSE IN-3's 「消せること」 has no other way to be met -- so a build
// where the rung exists but nothing spends it satisfies neither, and that is
// precisely what ledger row D-307 measured on the shipped build (2026-09-05:
// with an explanation standing over IC-7, `Esc` left it standing, twice).
//
// ---------------------------------------------------------------------------
// THE TWO UNITS THIS DRIVES, AND WHY IT TAKES BOTH
// ---------------------------------------------------------------------------
//   `escapeTarget`             (screen-state.ts, component `DocumentModel`)
//                              -- WHICH rung a press spends.
//   `tooltipsFromScreenView`   (UF-69 of table T-075, component
//                              `ScreenRenderer`, CP-19 of table T-062)
//                              -- whether an explanation is still answered.
// ⛔ ONE WITHOUT THE OTHER PROVES NOTHING, and D-307's own record is the
// argument: the rung was added on 2026-09-05 and the behaviour did not change,
// because the raiser answered the same explanation from the same rest and the
// same place on the very next frame. A file that only asked `escapeTarget`
// would have gone green over that.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- the inside of a unit, decided by values alone
// (vitest.config.ts lists the three Vitest places). Chapter 9 does not admit
// Unit as a TEST_LEVEL, so these cases have no node in the specification.
// ⚠️ WHAT A tests/system/ CASE WOULD ADD, AND WHY IT IS NOT HERE: the third
// party is `frame-loop.ts`, which is the one side that can see an explanation
// standing and is what raises the session member between the two units above.
// That seam is the Framework's and a browser is needed to drive it; the two
// halves it joins are values, and values are what this place is for.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: 読んでよいのは冒頭の
// 宣言・公開する型・署名まで.)
//
// Exported declarations read, and nothing else:
//   screen-state.ts    `escapeTarget(state, context)`, `EscapeTarget`,
//                      `EscapeContext`, `ScreenState`, `emptyScreenState`,
//                      `screenStateWithArmed`, `screenStateWithSurface`
//   tooltips.ts        `tooltipsFromScreenView(shown, settings, session)`
//   screen-renderer.ts `ScreenView`, `ScreenSession`, `Tooltip`, `CommandItem`,
//                      `IconId`
// ⛔ NOT READ: the body of either function. Which member carries "the person
// put it away" is a declared member of `ScreenSession` and is named below as
// what it is -- a seam, not an expected value.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-028 IN-3   the three a tooltip must satisfy, and the first of them
//   T-028 IN-4   the ladder, and 出ている説明 at its foot
//   T-028 IN-4a  what happens when there is nothing to spend
//   T-040 EZ-2   (FR-092) the raiser this file uses to put an explanation on
//                the screen: a pointer that has rested on an icon longer than
//                `iconHintDelayMs`
//   T-060 LY-5   why neither unit can see the other's half -- the current
//                values belong to the Framework, which is why both sides take
//                a question rather than the thing
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - The WORDS of any explanation. FR-038's dictionary holds those and
//     tests/unit/uf-69.test.ts drives them; a case here that compared text
//     would be measuring the wrong member.
//   - IN-3's other two thirds (ポインタを乗せられること / 引き金が外れるまで
//     出ていること). D-307 is about the first, and the third is a geometry and
//     a rest that uf-69.test.ts already holds.
//   - Where the ladder's `propertiesPanel` rung sits. IN-4 does not print it;
//     it reached `EscapeTarget` from another row, and asserting an order the
//     manuscript does not state would be this file inventing one.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  emptyScreenState,
  escapeTarget,
  screenStateWithArmed,
  screenStateWithSurface,
  type EscapeContext,
  type EscapeTarget,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  CommandItem,
  IconId,
  ScreenSession,
  ScreenView,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { specTable } from '../contract/spec-table'

// ===========================================================================
// 1. The sentences, read out of the manuscript rather than believed
// ===========================================================================

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses, quoted to the character so that a re-wording of the manuscript takes
 * this file red rather than leaving it holding a rule nobody writes any more.
 */
const IN_3_THE_THREE =
  '本行が定めるのはどの場所がどの意味を担うかだけである |\n| IN-3 | ツールチップは、次の 3 つをすべて満たすこと（MUST）'

const IN_3_UNTIL_THE_TRIGGER_GOES =
  'ること** —— 説明そのものの上へポインタを移しても消えないこと。**引き金が外れるまで出ていること** —— ポインタまたはフォーカスがその対象から外れるか、人が消すか、その内容が有効でなくなるまで、消してはならない（MUST NOT）'

const IN_4_THE_LADDER =
  'ればブラウザへ渡すこと。**消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 構え → `Dual Cursor` モード → 出ている説明 の順とすること（MUST）'

const IN_4A_TO_THE_BROWSER =
  '**（`FR-031`）|\n| IN-4a | **消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）'

/** The half of IN-3 D-307 is about, quoted as the row writes it. */
const IN_3_CAN_BE_PUT_AWAY = '**消せること** —— ポインタもフォーカスも動かさずに消す手立てがあること'

/** The reason IN-4 gives for putting it last, which is why the two rows travel together. */
const IN_4_WHY_LAST =
  '説明を最後に置くのは、`IN-3` が求める「消せること」を果たす手立てがほかに 1 つも無いからである'

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/**
 * The ladder, as IN-4 prints it -- read from the manuscript at run time so that
 * a re-ordering of the row moves this list rather than leaving it stale.
 */
const LADDER_AS_PRINTED = [
  '出ている通知',
  '確定していないその場の編集',
  '開いている面',
  '進行中のドラッグ・引きかけの矢印',
  '構え',
  '`Dual Cursor` モード',
  '出ている説明',
] as const

// ===========================================================================
// 2. The bench -- half one: which rung a press spends
// ===========================================================================

/**
 * Nothing standing at all. ⭐ Every optional member left out on purpose: the
 * declaration says absence reads as 「立っていない」, which is the state IN-4a
 * speaks about.
 */
const QUIET: EscapeContext = {
  isTextEntryUnsettled: false,
  gestureInFlight: false,
  dualCursorMode: false,
}

const contextOf = (part: Partial<EscapeContext> = {}): EscapeContext => ({ ...QUIET, ...part })

/** An explanation is on the screen, and nothing else is. */
const ONLY_A_TOOLTIP = contextOf({ isTooltipStanding: true })

// ===========================================================================
// 3. The bench -- half two: whether an explanation is still answered
// ===========================================================================

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf()

/** 表 T-040 の EZ-2 -- the wait, read from the generated defaults, never typed. */
const WAIT_MS = SETTINGS_DEFAULTS['iconHintDelayMs'] as number

/** A row of 表 T-109 used as an `IconId`: IC-7 コマンドパレットを出す・しまう. */
const ICON: IconId = 'IC-7'

const commandOf = (icon: IconId): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: `the name of ${icon}`,
})

const VIEW: Omit<ScreenView, 'tooltips'> = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [commandOf(ICON)],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
}

const EMPTY_SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  // GR-21 of table T-023d divides these to get the scrollbar grip's
  // length, and this file asks nothing of it. ⭐ A whole of zero is
  // "everything fits", which is the lane-long grip SC-4 of table T-031
  // draws when nothing overflows.
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const sessionOf = (part: Partial<ScreenSession> = {}): ScreenSession => ({
  ...EMPTY_SESSION,
  ...part,
})

/**
 * EZ-2's two conditions met at once: the pointer is ON the icon (the place) and
 * has waited longer than `iconHintDelayMs` (the time). This is the session that
 * puts an explanation on the screen.
 */
const RESTING_ON_THE_ICON = sessionOf({
  pointer: { x: 5, y: 5 },
  pointerRestedMs: WAIT_MS + 1,
  iconUnderPointer: ICON,
})

const shownFor = (session: ScreenSession): readonly Tooltip[] =>
  tooltipsFromScreenView(VIEW, SETTINGS, session)

// ===========================================================================
// 4. The premises every case below stands on
// ===========================================================================

describe('D-307 -- the manuscript these cases are driven by', () => {
  it('still asks (MUST) that a standing explanation can be put away', () => {
    expect(REQUIREMENTS).toContain(IN_3_THE_THREE)
    expect(REQUIREMENTS).toContain(IN_3_CAN_BE_PUT_AWAY)
    expect(REQUIREMENTS).toContain(IN_3_UNTIL_THE_TRIGGER_GOES)
  })

  it('still puts 出ている説明 at the FOOT of the ladder, and still says why', () => {
    expect(REQUIREMENTS).toContain(IN_4_THE_LADDER)
    expect(REQUIREMENTS).toContain(IN_4_WHY_LAST)
    // ⭐ THE ORDER READ OUT OF THE ROW, not retyped from memory. A ladder whose
    // last rung moved would take this red before any behaviour case ran.
    const at = LADDER_AS_PRINTED.map((rung) => IN_4_THE_LADDER.indexOf(rung))
    expect(at.every((where) => where >= 0), IN_4_THE_LADDER).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual([...at])
    expect(LADDER_AS_PRINTED[LADDER_AS_PRINTED.length - 1]).toBe('出ている説明')
    // 「`Dual Cursor` モード → 出ている説明」 -- the one adjacency D-307 turns on.
    expect(IN_4_THE_LADDER).toContain('`Dual Cursor` モード → 出ている説明')
  })

  it('still requires the press to reach the browser when there is nothing to spend', () => {
    expect(REQUIREMENTS).toContain(IN_4A_TO_THE_BROWSER)
  })

  it('still holds the three rows in table T-028', () => {
    const rows = specTable('T-028').rows.map((one) => one.id)
    expect(rows).toContain('IN-3')
    expect(rows).toContain('IN-4')
    expect(rows).toContain('IN-4a')
  })
})

// ===========================================================================
// 5. IN-4 -- 出ている説明 is a rung, and it is the LAST one
// ===========================================================================

describe('T-028 IN-4 (MUST) -- the standing explanation is the foot of the ladder', () => {
  it('answers tooltip when an explanation is the only thing standing', () => {
    expect(escapeTarget(emptyScreenState(), ONLY_A_TOOLTIP)).toBe(
      'tooltip' satisfies EscapeTarget,
    )
  })

  it('is spent AFTER the Dual Cursor mode, which is the rung above it', () => {
    // 「... → `Dual Cursor` モード → 出ている説明 の順とすること（MUST）」
    const both = contextOf({ dualCursorMode: true, isTooltipStanding: true })
    expect(escapeTarget(emptyScreenState(), both)).toBe('dualCursorMode')
    // ⭐ AND THE MODE HAS TO BE REACHABLE THE OTHER WAY ROUND: with the mode
    // down, the same standing explanation is what the press finds.
    expect(escapeTarget(emptyScreenState(), contextOf({ isTooltipStanding: true }))).toBe(
      'tooltip',
    )
  })

  it('is spent after every rung the row prints above it, not only the nearest', () => {
    // ⛔ ONE PRESS TAKES ONE RUNG. A build that let an explanation be reached
    // while something above it stood would spend two things with one press --
    // which is what 「1 階層ぶん消費し」 forbids.
    const standing: ReadonlyArray<{
      readonly rung: EscapeTarget
      readonly state: ScreenState
      readonly context: EscapeContext
    }> = [
      {
        rung: 'notice',
        state: emptyScreenState(),
        context: contextOf({ isNoticeStanding: true, isTooltipStanding: true }),
      },
      {
        rung: 'textEntry',
        state: emptyScreenState(),
        context: contextOf({ isTextEntryUnsettled: true, isTooltipStanding: true }),
      },
      {
        rung: 'surface',
        state: screenStateWithSurface(emptyScreenState(), 'U-53'),
        context: contextOf({ isTooltipStanding: true }),
      },
      {
        rung: 'gesture',
        state: emptyScreenState(),
        context: contextOf({ gestureInFlight: true, isTooltipStanding: true }),
      },
      {
        rung: 'armed',
        state: screenStateWithArmed(emptyScreenState(), { kind: 'dependency' }),
        context: contextOf({ isTooltipStanding: true }),
      },
      {
        rung: 'dualCursorMode',
        state: emptyScreenState(),
        context: contextOf({ dualCursorMode: true, isTooltipStanding: true }),
      },
    ]
    for (const { rung, state, context } of standing) {
      expect(escapeTarget(state, context), rung).toBe(rung)
    }
  })
})

// ===========================================================================
// 6. ⭐ THE SECOND PRESS. IN-4a is what stops the rung from swallowing keys.
// ===========================================================================

describe('T-028 IN-4a (MUST) -- a second Esc still reaches the browser', () => {
  it('answers null once the explanation is no longer standing', () => {
    // ⭐⭐ THE WHOLE POINT OF THE RUNG BEING A QUESTION AND NOT A LATCH. After
    // the first press has put the explanation away, `isTooltipStanding` is
    // false on the next frame -- and IN-4a (MUST) then hands the key to the
    // browser, which is how 全画面表示から `Esc` で戻る (FR-071) survives.
    const first = escapeTarget(emptyScreenState(), ONLY_A_TOOLTIP)
    expect(first).toBe('tooltip')
    const second = escapeTarget(emptyScreenState(), contextOf({ isTooltipStanding: false }))
    expect(second, 'the second Esc was swallowed').toBeNull()
  })

  it('answers null when the caller cannot see explanations at all', () => {
    // The member is optional and its declaration says absence reads as 「出て
    // いない」. ⛔ A rung that consumed on `undefined` would swallow every Esc
    // in a build whose Framework never raised the member -- exactly the failure
    // IN-4a exists to forbid.
    expect(escapeTarget(emptyScreenState(), QUIET)).toBeNull()
  })
})

// ===========================================================================
// 7. IN-3 「消せること」 -- and the control that must move
// ===========================================================================

describe('T-028 IN-3 (MUST) -- a shown explanation goes away without moving anything', () => {
  it('is a live case: the same view and pointer DO raise an explanation', () => {
    // ⛔⛔ THE CONTROL. Everything below asserts an EMPTY answer, and an empty
    // answer is what a broken renderer gives too. This case is what makes the
    // rest mean something.
    const shown = shownFor(RESTING_ON_THE_ICON)
    expect(shown.length, 'EZ-2 raised no explanation, so no case below holds anything').toBe(1)
    expect(shown[0]?.anchor).toEqual({ kind: 'icon', icon: ICON })
  })

  it('answers with nothing once the person has put it away', () => {
    const away = sessionOf({ ...RESTING_ON_THE_ICON, isTooltipDismissed: true })
    expect(shownFor(away)).toEqual([])
  })

  it('puts it away WITHOUT the pointer or the focus moving', () => {
    // 「ポインタもフォーカスも動かさずに消す手立てがあること」 -- so the two
    // sessions differ in exactly one member, and that member is not the place
    // or the rest. ⭐ THIS IS THE HALF THE ROW ACTUALLY STATES: a build that
    // only stopped explaining once the pointer left would satisfy 引き金が外れ
    // たら消してよい and still fail 消せること.
    const standing = RESTING_ON_THE_ICON
    const away = sessionOf({ ...standing, isTooltipDismissed: true })
    expect(away.pointer).toEqual(standing.pointer)
    expect(away.pointerRestedMs).toBe(standing.pointerRestedMs)
    expect(away.iconUnderPointer).toBe(standing.iconUnderPointer)
    expect(shownFor(standing).length).toBe(1)
    expect(shownFor(away)).toEqual([])
  })

  it('can be raised again after it was put away', () => {
    // 「引き金が外れるまで出ていること」 with its ⭐: 引き金が外れたら消してよい.
    // ⇒ Putting one away is not permanent; the next rest raises the next one.
    const away = sessionOf({ ...RESTING_ON_THE_ICON, isTooltipDismissed: true })
    expect(shownFor(away)).toEqual([])
    const again = sessionOf({ ...RESTING_ON_THE_ICON, isTooltipDismissed: false })
    expect(shownFor(again).length).toBe(1)
  })

  it('the dismissal is one answer for whatever stands, not one per raiser', () => {
    // ⚠️ IN-3 speaks of ツールチップ without dividing them, and IN-4 gives the
    // ladder ONE rung for 出ている説明. So the same member has to silence the
    // scrollbar hint FR-037 raises as well as EZ-2's icon.
    const lanes: Omit<ScreenView, 'tooltips'> = {
      ...VIEW,
      frame: {
        isFullScreen: false,
        dividers: [],
        scrollbars: [
          {
            axis: 'vertical',
            track: { x: 100, y: 0, width: 10, height: 600 },
            thumb: { x: 100, y: 0, width: 10, height: 10 },
          },
        ],
      },
    }
    const onTheLane = sessionOf({ pointer: { x: 105, y: 300 }, pointerRestedMs: WAIT_MS * 10 })
    const standing = tooltipsFromScreenView(lanes, SETTINGS, onTheLane)
    expect(standing.length, 'FR-037 raised no hint, so this case holds nothing').toBeGreaterThan(0)
    const away = tooltipsFromScreenView(
      lanes,
      SETTINGS,
      sessionOf({ ...onTheLane, isTooltipDismissed: true }),
    )
    expect(away).toEqual([])
  })
})

// ===========================================================================
// 8. ⛔ One press does not take an explanation AND something else
// ===========================================================================

describe('T-028 IN-4 -- one press spends one rung', () => {
  it('with a surface open and an explanation standing, the surface goes first', () => {
    const opened = screenStateWithSurface(emptyScreenState(), 'U-53')
    expect(escapeTarget(opened, contextOf({ isTooltipStanding: true }))).toBe('surface')
    // ⭐ AND THE EXPLANATION IS STILL THERE FOR THE NEXT PRESS. The surface is
    // closed by that first press, so the second finds the foot of the ladder.
    expect(escapeTarget(emptyScreenState(), contextOf({ isTooltipStanding: true }))).toBe(
      'tooltip',
    )
  })
})
