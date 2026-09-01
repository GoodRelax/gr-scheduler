// FR-053 (MUST) as the user ruled it on 2026-09-01: 「コマンドパレットを最小化した
// 時は、コマンドパレットの掴みどころ `::` と `-` の部分 だけを表示しろ」 -- a
// minimised palette shows the grab band and nothing else, and the armed reading
// is not drawn there.
//
// ⛔ THIS OVERRODE AN EARLIER RULING OF THE SAME USER. On 2026-08-28 FR-053 said
// 「⛔ 最小化しているあいだも、掴み帯と、いま構えているものの表示は残すこと
// （MUST）」. The 2026-09-01 ruling took the second half away and left the band
// standing. Both dates are written into the requirement, and the case named
// 「the manuscript still says」 below is what stops the old sentence coming back
// without anyone noticing.
//
// Unit under test: UF-65 of table T-075 (`command-palette.ts`, component CP-31
// of table T-062). It is the side that decides WHAT the palette carries;
// tests/unit/uf-71.test.ts holds the drawing side to laying nothing out for a
// reading that is not there.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported
// declarations named in the imports below. ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE FIXTURES ARE COPIED, NOT INVENTED: `sessionOf`, `SHOWN` and
// `describedWith` come from tests/unit/uf-65.test.ts, which drives this same
// unit through the same seam.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-053   ⛔ 「最小化しているあいだに出すのは掴み帯だけとし、ほかは何も出さない
//            こと（MUST）」 —— 利用者の裁定 2026-09-01.
//            ⛔ 「いま構えているものの表示を、最小化しているあいだ出してはならない
//            （MUST NOT）。」
//            ⭐ 「いま構えているものが画面上で読めること（MUST）」 —— ⚠️ 「ただし
//            パレットを最小化しているあいだ（`S-200`）はこの限りでない」, which is
//            the one exception, so every other state still reads.
//            ⭐ 「掴み帯の右端に ... `IC-53` を置き、その右に最小化の入口
//            （`IC-75`）を置くこと（MUST）」 and ⛔ 「帯そのものを取り去っては
//            ならない（MUST NOT）」.
//            ⚠️ 「入口の並びは最小化のあいだ出さない」.
//   T-206    S-200 (最小化しているか、既定は最小化していない) and S-135a (掴み帯の
//            高さ).
//   T-023b   the arms, whose row ids (MUST NOT) may not reach the screen.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithPalette,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import type {
  CommandPalette,
  DisplayLanguage,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { specTable } from '../contract/spec-table'

const SETTINGS: DocumentSettings = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** The sentence the 2026-09-01 ruling put into FR-053. */
const BAND_ALONE = '最小化しているあいだに出すのは掴み帯だけとし、ほかは何も出さないこと（MUST）'

/** Its other half: the armed reading is barred while minimised. */
const NO_ARMED_READING_WHILE_MINIMISED =
  'いま構えているものの表示を、最小化しているあいだ出してはならない（MUST NOT）'

/** The MUST that still governs every other state, and its one exception. */
const ARMED_IS_READABLE = 'いま構えているものが画面上で読めること（MUST）'
const THE_ONE_EXCEPTION = 'ただしパレットを最小化しているあいだ'

/** The sentence the 2026-09-01 ruling replaced -- ⛔ it may not stand as a rule again. */
const THE_OVERRIDDEN_2026_08_28 =
  '⛔ **最小化しているあいだも、掴み帯と、いま構えているものの表示は残すこと（MUST）** ——'

/** Every arm table T-023b counts, so no case here mints one. */
const T_023b_ROWS: readonly string[] = specTable('T-023b').rows.map((row) => row.id)

// ---------------------------------------------------------------------------
// Inputs. Copied from tests/unit/uf-65.test.ts.
// ---------------------------------------------------------------------------

const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)

/**
 * ⭐ THE ARMS DRIVEN HERE, one per shape of `Armed` the entity publishes. ⚠️ Not
 * a copy of table T-023b: the table's rows are read above and the count is
 * asserted against this list, so a row added to the manuscript fails loudly
 * rather than going untested in silence.
 */
const EVERY_ARM: readonly { readonly what: string; readonly armed: Armed }[] = [
  { what: 'AR-1, nothing armed', armed: { kind: 'none' } },
  { what: 'AR-2, a task shape', armed: { kind: 'taskShape', shapeKind: 'SH-1' } },
  { what: 'AR-3, a milestone shape', armed: { kind: 'milestoneShape', glyph: 'SH-5' } },
  { what: 'AR-4, a dependency', armed: { kind: 'dependency' } },
  { what: 'AR-5, a comment box', armed: { kind: 'commentBox' } },
  { what: 'AR-6, a highlight box', armed: { kind: 'highlightBox' } },
]

/** Two of the arms above, named where a single case means one of them. */
const NOTHING_ARMED: Armed = { kind: 'none' }
const A_DEPENDENCY_ARMED: Armed = { kind: 'dependency' }

const sessionOf = (part: Partial<ScreenSession> = {}): ScreenSession =>
  ({
    language: 'ja' as DisplayLanguage,
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
    isMilestoneListOpen: true,
    isPaletteMinimised: false,
    dualCursorFollowing: null,
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesSubject: null,
    propertiesShowing: null,
    notices: [],
    confirmation: null,
    rowBoxes: [],
    ...part,
  }) as unknown as ScreenSession

const describedWith = (
  session: ScreenSession = sessionOf(),
  state: ScreenState = SHOWN,
  selection: Selection = emptySelection(),
): CommandPalette => {
  const palette = commandPaletteFromScreenState(state, SETTINGS, selection, session)
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

/** The same palette, minimised. S-200 is the one member that moves. */
const minimisedWith = (armed: Armed): CommandPalette =>
  describedWith(sessionOf({ isPaletteMinimised: true }), screenStateWithArmed(SHOWN, armed))

const shownWith = (armed: Armed): CommandPalette =>
  describedWith(sessionOf(), screenStateWithArmed(SHOWN, armed))

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⛔ FR-053 says the band alone is what a minimised palette shows', () => {
    // ⭐ THE GROUND OF THIS WHOLE FILE, read rather than typed: if the ruling of
    // 2026-09-01 is ever reversed, this case says so in one line.
    // GOES RED IF: either sentence leaves the requirement.
    expect(REQUIREMENTS).toContain(BAND_ALONE)
    expect(REQUIREMENTS).toContain(NO_ARMED_READING_WHILE_MINIMISED)
  })

  it('⛔ the sentence the 2026-09-01 ruling replaced does not stand as a rule again', () => {
    // ⚠️ THE OVERRIDE ITSELF, GUARDED. FR-053 records the old wording INSIDE
    // quotation marks, as history -- what may not come back is the same
    // sentence standing on its own as the ⛔-marked MUST it used to be.
    // GOES RED IF: someone reads the recorded history as a live rule and
    // restores it.
    expect(REQUIREMENTS).not.toContain(THE_OVERRIDDEN_2026_08_28)
    expect(REQUIREMENTS, 'the override is recorded, with both dates').toContain('2026-08-28 の裁定')
  })

  it('⭐ the readable-armed MUST still stands, with the minimised state as its one exception', () => {
    // GOES RED IF: the exception is written so widely that the MUST stops
    // holding in the state it still governs, or the MUST is deleted outright
    // instead of excepted.
    expect(REQUIREMENTS).toContain(ARMED_IS_READABLE)
    expect(REQUIREMENTS).toContain(THE_ONE_EXCEPTION)
  })

  it('⭐ every arm of table T-023b is driven below', () => {
    // GOES RED IF: table T-023b grows a row and this file keeps testing six.
    expect(EVERY_ARM).toHaveLength(T_023b_ROWS.length)
  })
})

describe('FR-053 (MUST NOT): a minimised palette carries no armed reading', () => {
  it('⛔ says nothing about what is armed, whatever is armed', () => {
    // ⭐ THE USER'S RULING, MEASURED AT THE UNIT. Before it, a minimised palette
    // still carried 「マイルストーン形状」 / 「なし（既定）」 / 「依存線」 -- the
    // three words a live probe read off the shipped page on 2026-09-01, which is
    // the defect the ledger's D-178 names.
    // GOES RED IF: the reading comes back while minimised, in any arm.
    for (const { what, armed } of EVERY_ARM) {
      expect(minimisedWith(armed).armedText, `${what}: minimised, so nothing is read`).toBeNull()
    }
  })

  it('⛔ null and not an empty word, so nothing is laid out for it', () => {
    // ⚠️ THE DISTINCTION THE DRAWING SIDE DEPENDS ON: an empty string is a
    // reading that says nothing, and the drawing side would still make a box
    // for it. 「ほかは何も出さない」 is what the requirement says.
    // GOES RED IF: the minimised reading becomes `''`.
    expect(minimisedWith(NOTHING_ARMED).armedText).not.toBe('')
  })
})

describe('FR-053 (MUST): the grab band survives the minimise', () => {
  it('⭐ the band keeps its height and the minimise entrance rides on it', () => {
    // ⚠️ THE HALF OF THE 2026-08-28 RULING THAT SURVIVED. 「⛔ 帯そのものを取り
    // 去ってはならない（MUST NOT）」 -- a palette that cannot be grabbed can never
    // be moved again (GR-19 of table T-023d).
    // GOES RED IF: "show only the grab area" is implemented as "show nothing".
    const palette = minimisedWith(NOTHING_ARMED)
    expect(palette.isMinimised).toBe(true)
    expect(palette.grabBandHeight, 'S-135a still states the band').toBeGreaterThan(0)
    expect(palette.minimise.icon, 'IC-75 rides on the band in both states').toBe('IC-75')
  })

  it('⚠️ the entrances stay withdrawn, which is what minimised means', () => {
    // 「入口の並びは最小化のあいだ出さない —— 出すなら最小化ではない」.
    // GOES RED IF: the entries come back while S-200 is on.
    expect(minimisedWith(NOTHING_ARMED).groups).toHaveLength(0)
  })
})

describe('FR-053 (MUST): every other state still reads what is armed', () => {
  it('⭐ a palette that is not minimised says what it has armed', () => {
    // ⚠️ THE CONTROL CASE. Without it, a unit that had simply dropped
    // `armedText` altogether would pass every case above, and the MUST the
    // exception was carved out of would be broken everywhere.
    // GOES RED IF: the null branch is widened past the minimised state.
    for (const { what, armed } of EVERY_ARM) {
      const said = shownWith(armed).armedText
      expect(said, `${what}: shown, so the arm is readable`).not.toBeNull()
      expect((said ?? '').length, `${what}`).toBeGreaterThan(0)
    }
  })

  it('⭐ restoring the palette brings the reading back', () => {
    // ⚠️ THE MINIMISE IS A STATE AND NOT A LOSS: the word is derived from what
    // is armed on every frame, so the same arm reads the same again.
    // GOES RED IF: the reading is cleared rather than withheld -- which would
    // leave the palette silent after a minimise and a restore.
    const armed = A_DEPENDENCY_ARMED
    const before = shownWith(armed).armedText
    expect(minimisedWith(armed).armedText).toBeNull()
    expect(shownWith(armed).armedText).toBe(before)
  })
})
