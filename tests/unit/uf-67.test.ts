// Unit tests for `noticesFromSession` (unit UF-67 of table T-075, component
// CP-37 of table T-062, which table T-064 publishes as PI-37).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: row TS-6
// -- tests/unit/, Vitest -- and forbids any other (MUST NOT).
//
// ⛔ WRITTEN AGAINST THE SPECIFICATION (docs/development-rules/
// 04-verification.md, 1.). `notices.ts` was not opened. What was read is the
// public entry `screen-renderer.ts`, which table T-064 makes the contract, for
// the declarations of `RaisedNotice`, `Notice` and `ScreenSession`. Every
// expected value below is argued from a requirement or a table row named
// beside it -- never from what the unit happens to produce.
//
// ⚠️ WHAT MOVED UNDER THESE CASES, AND IN WHICH DIRECTION.
// `ScreenSession.notices` used to hold the very `Notice` the screen shows, so a
// raiser handed over the sentence and the next steps and these cases could
// drive both. It now holds `RaisedNotice` -- the manner, a reason ROW, and
// NT-3's count -- and the words are read on this side, out of the one
// dictionary FR-038 (MUST) keeps them in.
// ⛔ THAT IS THE SEAM MOVING, NOT THESE EXPECTATIONS BEING BENT TO THE CODE.
// No MUST below was softened to match what the unit returns.
//
// ⚠️ THE ASKING SIDE HAS NOW MADE THE SAME MOVE, and the specification made it
// first. `RaisedConfirmation` used to carry the SENTENCE a question shows; it
// now carries a row of table T-234, and `Confirmation.text` is that row read out
// of the dictionary -- which is exactly the pair `RaisedNotice.reason` and
// `Notice.text` already were. FR-076 (MUST) makes what a question shows a row of
// that table and (MUST NOT) bars a question it does not hold. ⛔ So no case
// below writes a sentence for a question either: what it hands over is a row,
// and what it expects is what the dictionary holds under that row.
//
// ⭐ WHAT WAS RED HERE UNTIL 2026-08-23, AND WHY IT IS NOT ANY MORE. Four cases
// stood red because the raiser handed over a row and the dictionary held no
// section that row could be found under, so NT-1's words (MUST), NT-3a's next
// step (MUST) and FR-038's one store of translated strings could none of them be
// satisfied. ⛔ The debt was the MANUSCRIPT's and it has been PAID: FR-076 now
// makes table T-233 the whole of the reasons a telling may carry (MUST) and bars
// any other (MUST NOT), and the dictionary has grown the section that answers
// for them. ⚠️ The four were re-run, not rewritten -- and the tripwire that was
// meant to fire the day the section landed did NOT, which is why it now asserts
// the debt PAID rather than owed (see the case that walks the section).
//
// ⭐ WHERE THE SPECIFICATION DECIDES NOTHING, NOTHING IS ASSERTED:
//   * the ORDER several shown notices stand in -- no row of table T-037 ranks
//     one manner above another, and the note under table T-077 puts the
//     gathered surface outside the boot order. Membership and counts only.
//   * WHAT COUNT the gathered surface carries -- NT-3 asks a count of a
//     destructive result and NT-4 asks for none, so `affectedCount` on the
//     gathered surface is asserted nowhere.
//   * ⛔ HOW the gathered surface JOINS what it gathered. NT-4 (MUST) asks for
//     one surface carrying the whole of them and fixes no separator, no order
//     and no shape, so the cases below ask only that every text and every next
//     step of the gathered run is still carried -- never how they are strung
//     together.
//   * ⛔ WHAT STANDS IN FOR A ROW THAT IS PRESENT BUT WHOSE CELL IS EMPTY. The
//     specification settles the ABSENT row (FR-076 sends it to the fallback row)
//     and says nothing about a written row whose word was emptied. PD-160 is
//     what makes the two different cases at all. So the case below asks only
//     what NT-1 (MUST) and NT-3a (MUST) ask -- that words and a next step still
//     arrive -- and fixes no wording.
//
// The rules these cases answer to:
//   FR-076   every telling follows table T-037, and every reason it carries is
//            a row of table T-233 (MUST); no other may be carried (MUST NOT)
//   FR-028   a refusal is a value the caller receives, never an exception --
//            which is why the shell can hold one long enough to raise it
//   FR-038   one store of translated strings, and this component holds it
//   NT-1 / NT-3 / NT-3a / NT-4 / NT-5 / NT-6 / NT-7 of table T-037
//   FT-4 of table T-078 and CS-1 of table T-066 -- the clock is the shell's, so
//            a notice that goes away with time is not this unit's to drop
//   R7.1     `pure` in table T-075
//
// ⛔ WHAT IS DELIBERATELY NOT HERE. U-56 `Open Chooser` of table T-103 and the
// three entries table T-109 places on it (IC-71 / IC-72 / IC-73, the three
// answers OP-3 of table T-024a makes the person choose between) are NOT this
// unit's. Table T-075 gives UF-67 the tellings and the question of table T-037;
// a surface that is opened over the screen is UF-66's (`open-modals.ts`, the
// surfaces IN-4 of table T-028 defines), and the `data-role` such a surface
// carries -- its settled name from table T-103, which W-4 of table T-006a now
// says in as many words -- is drawn by UF-71. Their cases belong in the benches
// of those two units.
//
// ⭐ Chapter 1.9 asks a test of a requirement that points at a table to be
// driven by a fixed copy of the table, with one test walking every row. T_037,
// T_233 and T_234 below are those copies, and the last two are read from the
// specification at load time rather than typed here.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import type {
  CommandItem,
  Confirmation,
  ConfirmationItem,
  DisplayLanguage,
  Notice,
  RaisedConfirmation,
  RaisedNotice,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  confirmationFromSession,
  noticesFromSession,
} from '../../src/adapter/screen-renderer/notices'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The one dictionary FR-038 (MUST) keeps every printed word in, read as DATA.
// ⛔ No word is written in this file: FR-038 (MUST NOT) bars the words from a
// requirement and from a table, and the same reason bars a test from minting
// one. What is read here is the generated file Chapter 6.2 fixes as the one
// road into `src/`.
// ---------------------------------------------------------------------------

const SRC_SCREEN_RENDERER = join(process.cwd(), 'src', 'adapter', 'screen-renderer')

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(join(SRC_SCREEN_RENDERER, file), 'utf8')) as unknown

/** One entry's word per language -- the `{ ja, en }` pair Chapter 6.2 generates. */
type Words = Readonly<Record<DisplayLanguage, string>>

/**
 * The sections of that dictionary these cases read. ⚠️ Only the ones UF-67
 * answers for: the manner of each row of table T-037, the text and the next
 * step of each row of table T-233, the label of each row of table T-109, and
 * the mark FR-032 asks for.
 */
const DICTIONARY = readJson('display-words.json') as {
  readonly icons: readonly { readonly rowId: string; readonly label: Words }[]
  readonly notices: readonly { readonly rowId: string; readonly manner: Words }[]
  readonly reasons: readonly {
    readonly rowId: string
    readonly text: Words
    readonly nextStep: Words
  }[]
  readonly questions: readonly { readonly rowId: string; readonly text: Words }[]
  /** NT-8 (MUST): what the entrance that puts a telling away is CALLED. */
  readonly noticeDismiss: readonly { readonly answer: string; readonly text: Words }[]
  readonly confirmationMarks: readonly { readonly mark: string; readonly text: Words }[]
}

/** FR-038: 「対象は `ja` と `en` の 2 言語とする」. */
const LANGUAGES = ['ja', 'en'] as const satisfies readonly DisplayLanguage[]

// ---------------------------------------------------------------------------
// The fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * Table T-037, in the order the table prints its rows.
 *
 * `binds` says whose duty the row is. Every row but one can only be satisfied
 * where the notice is MADE -- which manner it is, why, how many things it
 * reaches -- and none of that can be decided from a notice that already exists.
 * NT-4 is the only row that speaks about SEVERAL notices at once, so it is the
 * only row with work to do where they are chosen.
 *
 * `owesWords` marks the row that requires the telling to be readable as words.
 * `owesNextStep` marks the rows that require a next step: NT-3a states it, and
 * NT-6 sends its own next step to NT-3a rather than restating it.
 * ⛔ No other row is marked. A row that only says something is shown fixes no
 * medium, and guessing one here would put a demand in the bench that no
 * sentence of docs/spec makes.
 */
const T_037 = [
  { row: 'NT-1', binds: 'raiser', owesWords: true, owesNextStep: false },
  { row: 'NT-2', binds: 'raiser', owesWords: false, owesNextStep: false },
  { row: 'NT-3', binds: 'raiser', owesWords: false, owesNextStep: false },
  { row: 'NT-3a', binds: 'raiser', owesWords: false, owesNextStep: true },
  { row: 'NT-4', binds: 'shown', owesWords: false, owesNextStep: false },
  { row: 'NT-6', binds: 'raiser', owesWords: false, owesNextStep: true },
  { row: 'NT-5', binds: 'raiser', owesWords: false, owesNextStep: false },
  { row: 'NT-7', binds: 'raiser', owesWords: false, owesNextStep: false },
] as const

/**
 * The row of table T-037 whose several notices become one surface.
 *
 * ⭐ Read out of the copy rather than written twice: a column no case reads is
 * a column that can go stale without anything saying so.
 */
const STARTUP_PENDING = (T_037.find((entry) => entry.binds === 'shown') as { row: string }).row

const OTHER_ROWS = T_037.filter((entry) => entry.binds === 'raiser')

/**
 * Table T-233, in the order that table prints its rows -- the whole of what
 * FR-076 (MUST) lets a telling carry as its reason, and (MUST NOT) the whole of
 * it. `manner` is the row of table T-037 the reason is written against, read
 * out of the table's own column rather than paired here.
 *
 * ⭐ Read from the specification at load time (Chapter 1.9), so a row added,
 * renumbered or re-mannered moves these cases with it.
 */
const T_233 = specTable('T-233').rows.map((row) => ({
  row: row.id,
  manner: bare(row.by['作法'] ?? ''),
}))

/**
 * The row FR-076 gives a reason that has no row of its own to fall to, so that
 * NT-1's words (MUST) and NT-3a's next step (MUST) are still met.
 *
 * ⭐ A row ID, which is the join and not a word -- the same move `ASKING` makes
 * for table T-037. The case below holds it against the fixed copy, so a
 * renumbering fails loudly instead of silently testing nothing.
 */
const FALLBACK_REASON = 'RS-15'

/**
 * Table T-234, in the order that table prints its rows -- the whole of what
 * FR-076 (MUST) lets a question show, and (MUST NOT) the whole of it.
 * `namesWhatGoes` is that table's own 名前を挙げるか column, so no case decides
 * for a row whether NT-7's names are owed on it.
 *
 * ⭐ Read from the specification at load time (Chapter 1.9), the same move
 * `T_233` makes -- FR-076 says in as many words that the way the words are held
 * and the way a row is added are the ones it has just stated for table T-233.
 * ⚠️ The 名前を挙げるか column is read raw rather than through `bare`: its cells
 * carry a code span (`Task`) that `bare` would hand back in place of the answer.
 */
const T_234 = specTable('T-234').rows.map((row) => ({
  row: row.id,
  namesWhatGoes: (row.by['名前を挙げるか'] ?? '').trim().startsWith('挙げる'),
  by: (row.by['正'] ?? '').trim(),
}))

/**
 * The row FR-076 gives a question that has no row of its own to fall to, so
 * that NT-7's first MUST -- what is about to happen, shown -- is still met.
 *
 * ⭐ The same shape as `FALLBACK_REASON`, and for the same sentence of FR-076:
 * a row ID, which is the join and not a word. The case below holds it against
 * the fixed copy, so a renumbering fails loudly instead of silently testing
 * nothing.
 */
const FALLBACK_QUESTION = 'QN-8'

/**
 * A question as an asker hands it over: a row of table T-234, taken from the
 * fixed copy in the order that table prints them.
 *
 * ⛔ NEVER A KEY OF THIS FILE'S OWN, for the reason `reasonRow` is not: FR-076
 * (MUST NOT) bars a question table T-234 does not hold. ⭐ `at` wraps, so a case
 * may ask for as many distinct questions as it likes without counting the rows.
 */
const questionRow = (at: number): string =>
  (T_234[at % T_234.length] as { readonly row: string }).row

// ---------------------------------------------------------------------------
// Inputs. A case pins the notices it means; every other member of the session
// is inert here, because UF-67 fills one member of `ScreenView` and reads none
// of the others. ⛔ No member count is written down -- a copied number goes
// stale in silence, and the public entry is where the members are declared.
// ---------------------------------------------------------------------------

/**
 * A reason as a raiser hands it over: a row of table T-233, taken from the
 * fixed copy in the order that table prints them.
 *
 * ⛔ NEVER A KEY OF THIS FILE'S OWN. FR-076 (MUST NOT) bars a telling from
 * carrying a reason table T-233 does not hold, so a bench that invented one
 * would be handing the unit an input the product cannot produce. ⚠️ The one
 * case that DOES hand over an outsider is the fallback case, and it says so.
 * ⭐ `at` wraps, so a case may ask for as many distinct reasons as it likes
 * without counting the rows of the table.
 */
const reasonRow = (at: number): string =>
  (T_233[at % T_233.length] as { readonly row: string }).row

/**
 * The row of table T-233 whose manner is this row of table T-037, or the
 * fallback row where the table writes none against it.
 *
 * ⭐ WHY A PAIRING IS NEEDED AT ALL. Table T-233's 作法 column says which manner
 * each reason is written against, so a case that varies the manner and keeps one
 * reason would be handing over a pair the table does not print.
 */
const reasonWrittenAgainst = (manner: string): string =>
  T_233.find((entry) => entry.manner === manner)?.row ?? FALLBACK_REASON

const raisedOf = (
  manner: string,
  reason: string,
  affectedCount: number | null = null,
): RaisedNotice => ({ manner, reason, affectedCount })

/**
 * S-73's default hue, read out of table T-216 the way the tables above are
 * read. DR-5 of table T-052 keeps the hue on `Project` rather than in the
 * settings, so no generated constant carries it.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const sessionOf = (notices: readonly RaisedNotice[]): ScreenSession => ({
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The seven members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `themePreference` is S-72 and `isMilestoneListOpen` S-142
  // (both the manuscript's default -- a telling carries neither), `themeHue`
  // is S-73 read from the manuscript, `selectedGroupIds` is FR-085's set of
  // rows and `selectedResourceUids` FR-099's set of resources (both empty --
  // none chosen), and `propertiesSubject` is FR-072's remembered subject
  // (`null` -- no operation has chosen one yet).
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices,
  confirmation: null,
  rowBoxes: [],
})

// The four raisers NT-4 names by hand -- coming back from a lost permission,
// the recovery question, turning the `Agent API` on, and the watermark name of
// FR-086. Each is a raiser of its own so that the gathering can be watched
// across as many as the row admits.
//
// ⛔ TABLE T-233 WRITES NO ROW AGAINST NT-4. Its 作法 column reaches NT-1, NT-3a
// and NT-5 only, so none of the four things NT-4 gathers has a reason of its
// own and the rows below are this bench's own pairing -- taken from the table in
// its print order, and distinct so that the gathered surface can be watched
// carrying the whole of them. ⚠️ Reported rather than invented: a reason for
// each of the four is the manuscript's to add, not this file's.
const PENDING_RESTORE = raisedOf(STARTUP_PENDING, reasonRow(0))
const PENDING_RECOVERY = raisedOf(STARTUP_PENDING, reasonRow(1))
const PENDING_AGENT_API = raisedOf(STARTUP_PENDING, reasonRow(2))
const PENDING_WATERMARK = raisedOf(STARTUP_PENDING, reasonRow(3))

const REFUSAL = raisedOf('NT-1', reasonWrittenAgainst('NT-1'))
const WARNING = raisedOf('NT-5', reasonWrittenAgainst('NT-5'), 3)
const DESTRUCTIVE = raisedOf('NT-3', reasonWrittenAgainst('NT-3'), 12)
const FAILURE = raisedOf('NT-3a', reasonWrittenAgainst('NT-3a'))
const AT_LIMIT = raisedOf('NT-6', reasonWrittenAgainst('NT-6'))

/**
 * The three sites the shell holds a value nobody has told yet, and the manner
 * table T-037 settles for each.
 *
 * ⭐ WHY THE SHELL IS THE ONE THAT RAISES THESE. FR-028 (MUST NOT) makes a
 * refusal a value the caller receives rather than something thrown, so the side
 * that received it is the side still holding it -- and LY-5 of table T-060
 * leaves the Framework as the only layer that may hold a current value.
 * ⭐ WHY THE MANNER IS THE ONE NAMED. A write or an edit that was not taken is
 * the situation NT-1 names -- input that was not accepted. A file operation
 * that faulted is the one NT-3a names -- a failure. ⛔ Neither manner is
 * guessed from the code: those two are the only rows of table T-037 whose
 * situation column reaches these three.
 *
 * ⭐ WHY THE REASON IS THE ONE NAMED. Table T-233's 正 column says where each
 * row's situation is defined, and that is what pairs these three: a write the
 * document refused is `WS-1` of table T-067, an edit not yet committed is
 * `WS-2`, and a write that could not be carried out at all is `FR-060`'s lost
 * permission. ⛔ Not guessed from the code, and not invented: FR-076 (MUST NOT)
 * bars a telling from carrying a reason table T-233 does not hold.
 *
 * ⚠️ These are INPUTS. What the shell actually raises is the shell's own case
 * to answer (tests/system, and the STOP notes in `frame-loop.ts`); what this
 * file settles is what UF-67 owes once one of them arrives.
 */
const SHELL_HELD = [
  { site: 'a write the document refused', manner: 'NT-1', reason: 'RS-6' },
  { site: 'an edit the document refused', manner: 'NT-1', reason: 'RS-8' },
  { site: 'a file operation that faulted', manner: 'NT-3a', reason: 'RS-1' },
] as const

const SHELL_RAISED = SHELL_HELD.map((held) => raisedOf(held.manner, held.reason))

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const isStartupPending = (notice: Notice): boolean => notice.manner === STARTUP_PENDING

/** The one surface NT-4 asks for. Fails the case when there is not exactly one. */
const gatheredOf = (shown: readonly Notice[]): Notice => {
  const pending = shown.filter(isStartupPending)
  expect(pending.length, 'NT-4: the pending run is ONE surface').toBe(1)
  return pending[0] as Notice
}

const mannersOf = (shown: readonly Notice[]): readonly string[] =>
  shown.map((notice) => notice.manner).sort()

const withManner = (shown: readonly Notice[], manner: string): readonly Notice[] =>
  shown.filter((notice) => notice.manner === manner)

// ---------------------------------------------------------------------------

describe('UF-67 -- NT-4 (MUST): the pending items at startup arrive as ONE surface', () => {
  it('gathers the pending run into one surface and leaves the other rows standing apart', () => {
    // NT-4 speaks about its own run only. A telling of another row is not part
    // of it, and folding one in would put it under another row's manner.
    const shown = noticesFromSession(
      sessionOf([REFUSAL, PENDING_RESTORE, WARNING, PENDING_RECOVERY, PENDING_AGENT_API]),
    )

    expect(withManner(shown, STARTUP_PENDING).length).toBe(1)
    expect(mannersOf(shown), 'NT-1 and NT-5, plus the one gathered surface').toEqual([
      'NT-1',
      'NT-4',
      'NT-5',
    ])
  })

  it('never lets the pending items arrive as several surfaces, however many were raised', () => {
    // NT-4 (MUST NOT) forbids the four raisers it names arriving one surface
    // after another.
    const raisers = [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API, PENDING_WATERMARK]
    for (let count = 2; count <= raisers.length; count += 1) {
      const shown = noticesFromSession(sessionOf(raisers.slice(0, count)))
      expect(withManner(shown, STARTUP_PENDING).length, `raised ${count}`).toBe(1)
      expect(shown.length, `raised ${count}, and nothing else was`).toBe(1)
    }
  })

  it('has no cap on how many pending items reach the one surface', () => {
    // ⛔ No row of table T-037, no line of FR-076 and no key of
    // `_assets/tbl-settings.md` names a number of notices, so the whole of them
    // is the whole of them.
    const many = Array.from({ length: 12 }, (_, index) =>
      raisedOf(STARTUP_PENDING, reasonRow(index)),
    )
    const shown = noticesFromSession(sessionOf(many))

    expect(shown.length).toBe(1)
    expect(gatheredOf(shown).manner).toBe(STARTUP_PENDING)
  })

  it('leaves a lone pending item as the one surface it already is', () => {
    // NT-4 asks for one surface; with one raiser there is nothing to gather,
    // and dropping it would tell nobody about the pending item.
    const shown = noticesFromSession(sessionOf([PENDING_RECOVERY]))

    expect(shown.length).toBe(1)
    expect((shown[0] as Notice).manner).toBe(STARTUP_PENDING)
  })

  it('leaves the lone pending item alone while other rows stand beside it', () => {
    const shown = noticesFromSession(sessionOf([REFUSAL, PENDING_WATERMARK, AT_LIMIT]))

    expect(shown.length).toBe(3)
    expect(withManner(shown, STARTUP_PENDING).length).toBe(1)
    expect(mannersOf(shown)).toEqual(['NT-1', 'NT-4', 'NT-6'])
  })
})

describe('UF-67 -- table T-037: only the NT-4 run is gathered', () => {
  it('carries a notice of every other row through as one notice (one case, every row)', () => {
    // Chapter 1.9: one test walks every row of the table it is driven by.
    // Each of these rows states a duty that only survives while the telling
    // does -- NT-1's words, NT-5's being tellable from NT-1, NT-3's count,
    // NT-6's what-can-be-done-now. Merging any of them into another surface
    // discharges none of them.
    for (const entry of OTHER_ROWS) {
      const one = raisedOf(entry.row, reasonWrittenAgainst(entry.row), 4)
      const shown = noticesFromSession(
        sessionOf([PENDING_RESTORE, one, PENDING_RECOVERY, PENDING_AGENT_API]),
      )
      const carried = withManner(shown, entry.row)

      expect(carried.length, `${entry.row} stays one`).toBe(1)
      expect((carried[0] as Notice).affectedCount, `${entry.row} keeps its count`).toBe(4)
      expect(shown.length, `${entry.row}, plus the one gathered surface`).toBe(2)
    }
  })

  it('never merges two notices that follow one and the same other row', () => {
    // ⭐ The two are told apart by NT-3's count, which is the member of the
    // raised half that carries no word -- so a unit that merged two tellings of
    // one row is named without any reading of the dictionary.
    for (const entry of OTHER_ROWS) {
      const first = raisedOf(entry.row, reasonWrittenAgainst(entry.row), 1)
      const second = raisedOf(entry.row, reasonWrittenAgainst(entry.row), 2)
      const shown = noticesFromSession(sessionOf([first, PENDING_RESTORE, second, PENDING_RECOVERY]))
      const both = withManner(shown, entry.row)

      expect(both.length, `two of ${entry.row} stay two`).toBe(2)
      expect(both.map((notice) => notice.affectedCount).sort()).toEqual([1, 2])
    }
  })

  it('keeps an NT-5 telling apart from an NT-1 refusal (NT-5 MUST)', () => {
    // NT-5 (MUST) requires the accepted-with-a-warning telling to be tellable
    // from NT-1's refusal. The manner is what carries that difference, so
    // neither may come back wearing the other's.
    const shown = noticesFromSession(sessionOf([REFUSAL, WARNING, PENDING_RESTORE]))

    expect(mannersOf(shown)).toEqual(['NT-1', 'NT-4', 'NT-5'])
  })

  it('carries the count NT-3 added, and the absence of one, untouched', () => {
    // NT-3 asks a destructive telling for the count of what it reaches.
    // `affectedCount` is `null` where the row asks for none, so both values
    // have to survive as they are -- and zero is a count, not an absence.
    const none = raisedOf('NT-3', reasonWrittenAgainst('NT-3'), 0)
    const shown = noticesFromSession(sessionOf([DESTRUCTIVE, none, REFUSAL, PENDING_RESTORE]))

    expect(withManner(shown, 'NT-3').map((notice) => notice.affectedCount).sort()).toEqual([0, 12])
    expect((withManner(shown, 'NT-1')[0] as Notice).affectedCount).toBeNull()
  })

  it('withholds nothing that was raised', () => {
    // Every row of table T-037 states its duty as something GRS shows the
    // person; a raised notice that is never shown discharges none of them. The
    // one change NT-4 asks for is that its own run arrives as one surface.
    const raised = [REFUSAL, FAILURE, PENDING_RESTORE, AT_LIMIT, PENDING_RECOVERY, DESTRUCTIVE]
    const shown = noticesFromSession(sessionOf(raised))

    expect(mannersOf(shown)).toEqual(['NT-1', 'NT-3', 'NT-3a', 'NT-4', 'NT-6'])
    expect(shown.length, 'the gathered surface, and the four that are not gathered').toBe(5)
  })

  it('drops nothing for having run out of time -- the clock belongs to the shell', () => {
    // FT-4 of table T-078 leaves the reading of the clock to `SingleHtmlShell`,
    // and CS-1 of table T-066 keeps it out of a `pure` unit. A notice that
    // follows NT-2 is therefore shown like any other while it is raised: one
    // whose time is up is one that is no longer raised.
    const fading = raisedOf('NT-2', reasonWrittenAgainst('NT-2'))
    const shown = noticesFromSession(sessionOf([fading]))

    expect(shown.length).toBe(1)
    expect((shown[0] as Notice).manner).toBe('NT-2')
  })

  it('tells nothing when nothing was raised', () => {
    expect(noticesFromSession(sessionOf([]))).toEqual([])
  })
})

describe('UF-67 -- FR-028: the three the shell holds reach the person', () => {
  it('shows all three, so none of them ends as a value nobody sees', () => {
    // FR-028 (MUST NOT) makes a refusal a value rather than an exception, which
    // is what lets the shell still be holding one; FR-076 then binds it to
    // table T-037. A value that is received and never told satisfies neither.
    const shown = noticesFromSession(sessionOf(SHELL_RAISED))

    expect(shown.length).toBe(SHELL_RAISED.length)
    expect(mannersOf(shown)).toEqual(['NT-1', 'NT-1', 'NT-3a'])
  })

  it('answers with the shape its own public entry declares for every row', () => {
    // `Notice` declares `text: string` and `nextSteps: readonly string[]` on
    // the file table T-064 makes the contract. ⚠️ A member that comes back
    // `undefined` is not a milder version of an empty one: every reader of a
    // `Notice` is entitled to the declared type, and `tsc` cannot see a value
    // that only exists at run time.
    const shown = noticesFromSession(
      sessionOf([...SHELL_RAISED, PENDING_RESTORE, WARNING, DESTRUCTIVE, AT_LIMIT]),
    )

    for (const notice of shown) {
      expect(typeof notice.text, `${notice.manner}: text`).toBe('string')
      expect(Array.isArray(notice.nextSteps), `${notice.manner}: nextSteps`).toBe(true)
      for (const step of notice.nextSteps) expect(typeof step, notice.manner).toBe('string')
    }
  })

  it('gives a refusal words to be read (NT-1 MUST; colour alone is forbidden)', () => {
    // NT-1 (MUST) has the telling say WHICH item and WHY in words, and (MUST
    // NOT) forbids colour or a border alone -- so an empty sentence keeps
    // neither half.
    // ⛔ AND THE ROW IS NOT THOSE WORDS. FR-038 (MUST) holds every word the
    // screen prints in the per-language dictionary, so a text that is the
    // raiser's own row of table T-233 came from somewhere that is not one.
    // ⚠️ This case stood red while the dictionary held no section a reason could
    // be looked up under; it was re-run, not rewritten.
    // ⭐ Driven by the copy of the table AND by the two sites the shell holds:
    // the rows that owe words are the table's answer, and a refused write and a
    // refused edit are two of them arriving for real.
    const mustBeToldInWords = [
      ...T_037.filter((row) => row.owesWords).map((row) =>
        raisedOf(row.row, reasonWrittenAgainst(row.row)),
      ),
      ...SHELL_RAISED.filter((raised) => raised.manner === 'NT-1'),
    ]

    for (const raised of mustBeToldInWords) {
      const told = noticesFromSession(sessionOf([raised]))[0] as Notice

      expect(told.text.length, `${raised.manner} (MUST): told in words`).toBeGreaterThan(0)
      expect(
        told.text,
        `${raised.manner}: FR-038 (MUST) puts the printed words in the dictionary, not in a key`,
      ).not.toBe(raised.reason)
    }
  })

  it('gives every row that owes a next step one (NT-3a MUST; NT-6 follows it)', () => {
    // NT-3a (MUST) has a failure carry what can be done next and (MUST NOT)
    // forbids a telling that says only that something failed; NT-6 sends its own
    // next step to that same row. Both are read out of the row of table T-233
    // the raiser hands over. ⛔ Do not soften this to match what the unit
    // returns -- an empty list of steps breaks the MUST NOT outright.
    for (const entry of T_037.filter((row) => row.owesNextStep)) {
      const raised = raisedOf(entry.row, reasonWrittenAgainst(entry.row))
      const shown = noticesFromSession(sessionOf([raised]))

      expect((shown[0] as Notice).nextSteps.length, `${entry.row} (MUST)`).toBeGreaterThan(0)
    }
  })

  it('prints no reason key on any surface, gathered or not (FR-038 MUST)', () => {
    // FR-038 (MUST) keeps every word the screen prints in the per-language
    // dictionary, and a row ID is not a word -- so a text still carrying the row
    // the raiser handed over is a word from nowhere. ⚠️ NT-4's one surface is
    // where several of them land at once, which is why the gathered surface is
    // walked here too.
    const raised = [...SHELL_RAISED, DESTRUCTIVE, AT_LIMIT, PENDING_RESTORE, PENDING_RECOVERY]
    const keysHandedIn = raised.map((one) => one.reason)
    const shown = noticesFromSession(sessionOf(raised))

    for (const notice of shown) {
      for (const key of keysHandedIn) {
        expect(notice.text, `${notice.manner} carries the key ${key}`).not.toContain(key)
        for (const step of notice.nextSteps) {
          expect(step, `${notice.manner} carries the key ${key} as a next step`).not.toContain(key)
        }
      }
    }
  })

  it('owes those words no longer: one section is keyed on the rows of table T-233 and holds both of their words', () => {
    // ⭐ THE SAME TRIPWIRE, TURNED THE OTHER WAY UP. It was written to go red the
    // day the manuscript grew a section a reason could be looked up under, so
    // that the reds above could not be forgotten. ⛔ IT DID NOT FIRE: it looked
    // for an entry with a member literally named `reason`, and the section that
    // landed is keyed `rowId` -- the row of table T-233, the same move
    // `Notice.manner` makes with table T-037 -- so it stayed green against a debt
    // that had been PAID. It now asserts the debt paid, and goes red if the
    // section is taken away, re-keyed, loses a row, or loses either of the two
    // words a row owes.
    // ⛔ Driven by the file and by the fixed copy of the table, never by a list
    // written here: which rows exist is table T-233's answer (FR-076 MUST /
    // MUST NOT), and which section answers for them is the dictionary's.
    const dictionary = readJson('display-words.json') as Record<string, unknown>
    const sections = Object.entries(dictionary).filter(([, value]) => Array.isArray(value))

    const isWordPair = (value: unknown): boolean =>
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value as Record<string, unknown>).every((word) => typeof word === 'string')

    const entriesOf = (value: unknown): readonly Record<string, unknown>[] =>
      (value as readonly unknown[]).filter(
        (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
      )

    const answersForAReason = (value: unknown): boolean => {
      const entries = entriesOf(value)
      return (
        entries.length > 0 &&
        entries.every(
          (entry) =>
            typeof entry['rowId'] === 'string' &&
            isWordPair(entry['text']) &&
            isWordPair(entry['nextStep']),
        )
      )
    }

    const answering = sections.filter(([, value]) => answersForAReason(value))

    expect(
      answering.map(([name]) => name),
      'FR-076 / FR-038: exactly one section holds NT-1 s words and NT-3a s next step per reason',
    ).toHaveLength(1)
    expect(
      entriesOf((answering[0] as readonly [string, unknown])[1]).map((entry) => entry['rowId']),
      'FR-076 (MUST): every row of 表 T-233, and (MUST NOT) nothing that is not one',
    ).toEqual(T_233.map((entry) => entry.row))
    expect(
      T_233.map((entry) => entry.row),
      'FR-076: the row a reason with no row of its own falls to has to be one of them',
    ).toContain(FALLBACK_REASON)
  })
})

describe('UF-67 -- FR-076 and 表 T-233: the words a reason carries are READ, row by row', () => {
  it('tells every row of 表 T-233 in that row s own words, in the display language (one case, every row)', () => {
    // Chapter 1.9: one test walks every row of the table it is driven by.
    // NT-1 (MUST) and NT-3a (MUST) are the two things a row of table T-233 has
    // to answer for, and FR-038 (MUST) puts the words in the dictionary, keyed
    // by the row.
    // ⭐ The manner comes from the table's own 作法 column, so no pair is
    // invented here.
    // ⛔ EXPECTED VALUES ARE READ, NEVER WRITTEN: FR-038 (MUST NOT) bars the
    // words from a requirement and from a table, and the same reason bars a
    // bench from minting one.
    for (const language of LANGUAGES) {
      for (const entry of T_233) {
        const words = reasonWordsFor(entry.row, language)
        const shown = noticesFromSession({
          ...sessionOf([raisedOf(entry.manner, entry.row)]),
          language,
        })
        const told = shown[0] as Notice

        expect(told.text, `${entry.row} in ${language}`).toBe(words.text)
        expect(told.nextSteps, `${entry.row} in ${language}: ONE step per row`).toEqual([
          words.nextStep,
        ])
      }
    }
  })

  it('tells a row of 表 T-037 by the word the dictionary holds for it, in the display language', () => {
    // ⭐ THE OTHER HALF OF THE SAME JOIN. `Notice.manner` is the row and
    // `Notice.mannerText` is what that row is CALLED -- FR-038 (MUST) puts the
    // second in the dictionary, and NT-5 (MUST) needs the accepted-with-a-caution
    // telling to read unlike NT-1's refusal.
    for (const language of LANGUAGES) {
      for (const entry of OTHER_ROWS) {
        const raised = raisedOf(entry.row, reasonWrittenAgainst(entry.row))
        const shown = noticesFromSession({ ...sessionOf([raised]), language })

        expect((shown[0] as Notice).mannerText, `${entry.row} in ${language}`).toBe(
          mannerTextFor(entry.row, language),
        )
      }
    }
  })

  it('falls to the row FR-076 names when the reason has no row of its own', () => {
    // FR-076 gives a reason with no row of its own somewhere to fall to, and
    // says why: without it, a telling reaches the person that meets neither
    // NT-1's MUST nor NT-3a's.
    // ⛔ THE ONE INPUT THIS FILE MAKES THAT A RAISER MAY NOT. FR-076 (MUST NOT)
    // bars a telling from carrying a reason table T-233 does not hold, so this
    // reason cannot arrive from the product -- and the fallback row exists for
    // exactly the case where one does anyway.
    // ⚠️ ASCII, because a control character in a string key has stopped the whole
    // build before now (04-verification.md, 3.).
    const outsider = 'RS-no-row-of-its-own'

    for (const language of LANGUAGES) {
      const fallback = reasonWordsFor(FALLBACK_REASON, language)
      const shown = noticesFromSession({
        ...sessionOf([raisedOf('NT-1', outsider)]),
        language,
      })
      const told = shown[0] as Notice

      expect(told.text, `the fallback text in ${language}`).toBe(fallback.text)
      expect(told.nextSteps, `the fallback next step in ${language}`).toEqual([fallback.nextStep])
      expect(told.text, 'FR-038 (MUST): a row ID is not a word').not.toContain(outsider)
      for (const step of told.nextSteps) {
        expect(step, 'FR-038 (MUST): a row ID is not a word').not.toContain(outsider)
      }
    }
  })

  it('carries every text and every next step of what NT-4 gathered', () => {
    // NT-4 (MUST) has the pending run arrive as ONE surface carrying the whole
    // of it, so nothing of what was gathered may be left behind. NT-3a (MUST
    // NOT) forbids a telling that says only that something failed, so a next
    // step dropped on the way into the gathering would break that row on
    // arrival.
    // ⛔ HOW they are joined is NOT asserted: the specification fixes no
    // separator, no order and no shape for the gathered surface.
    const gathered = [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API, PENDING_WATERMARK]

    for (const language of LANGUAGES) {
      const shown = noticesFromSession({ ...sessionOf(gathered), language })
      const surface = gatheredOf(shown)

      for (const raised of gathered) {
        const words = reasonWordsFor(raised.reason, language)

        expect(surface.text, `${raised.reason} in ${language}`).toContain(words.text)
        expect(surface.nextSteps, `${raised.reason} in ${language}`).toContain(words.nextStep)
      }
    }
  })

  it('still tells words and a next step when the dictionary holds the row but its cell is empty', async () => {
    // ⛔ NT-1 (MUST) and NT-3a (MUST) do not stop being MUSTs because a cell of
    // the generated file was emptied: an empty sentence shows nothing and an
    // empty next step is no step at all.
    // ⚠️ NO CELL IS EMPTY TODAY, so this stands guard over a generated file
    // someone has edited by hand -- which Chapter 6.2 forbids (MUST NOT) and
    // cannot prevent. It is also what tells an ABSENT row apart from a PRESENT
    // but empty one, which is the difference PD-160 records.
    // ⛔ WHAT the stand-in says is not asserted: FR-076 settles where an ABSENT
    // row falls and says nothing about a present row whose word was emptied, so
    // only what NT-1 and NT-3a demand is asked for here.
    const emptied = (T_233[0] as { readonly row: string; readonly manner: string })

    for (const language of LANGUAGES) {
      const shown = await noticesWithDictionary(
        dictionaryWithReasonEmptied(emptied.row),
        [raisedOf(emptied.manner, emptied.row)],
        language,
      )
      const told = shown[0] as Notice

      expect(told.text.length, `NT-1 (MUST) in ${language}`).toBeGreaterThan(0)
      expect(told.nextSteps.length, `NT-3a (MUST) in ${language}`).toBeGreaterThan(0)
      for (const step of told.nextSteps) {
        expect(step.length, `NT-3a (MUST) in ${language}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('UF-67 -- @purity pure (table T-075, R7.1)', () => {
  it('rewrites none of what it was given', () => {
    // R7.1 counts rewriting an argument among the non-pure effects, and table
    // T-075 makes UF-67 `pure`.
    const raised: RaisedNotice[] = [REFUSAL, PENDING_RESTORE, WARNING, PENDING_RECOVERY]
    const before = structuredClone(raised)
    const session = sessionOf(raised)

    noticesFromSession(session)

    expect(raised).toEqual(before)
    expect(session.notices).toEqual(before)
  })

  it('answers the same session the same way twice', () => {
    const session = sessionOf([REFUSAL, PENDING_RESTORE, DESTRUCTIVE, PENDING_AGENT_API])

    expect(noticesFromSession(session)).toEqual(noticesFromSession(session))
  })
})

// ===========================================================================
// Added for `confirmationFromSession` -- NT-7 of table T-037, the row that asks
// rather than tells -- and for NT-5, the manner OP-11 of table T-024a sends its
// telling to. Written against docs/spec only; the unit's body was not read.
//
// ⭐ WHAT MOVED, AND IN WHICH DIRECTION. These cases were written when a
// question reached the screen exactly as it had been raised, and they asserted
// deep equality against the raised value itself. Version 0.88 of the
// specification (CR-211, A-appendix.md:116) settled the two answers:
// 「確認の 2 択に入口を与えた —— 表 T-103 に `U-55`（`Confirmation`）、表 T-109
// に `IC-69` / `IC-70`、図 F-019 に図形 2 つ」, and table T-109 now prints
//
//     | IC-69 | `Confirmation` | — | 問いに「続ける」と答える | 表 T-037 の `NT-7` |
//     | IC-70 | `Confirmation` | — | 問いに「取りやめる」と答える | 表 T-037 の `NT-7` |
//
// The preamble of section 8 of `_assets/tbl-glossary.md` makes that second
// column the placement -- 「`面` の欄は 表 T-103 の確定名である。新しい面の名を
// 作らない」-- so WHICH entries stand on the `Confirmation` surface is the
// roster's answer and not the asker's. What reaches the screen is therefore
// wider than what was raised.
//
// ⛔ THAT IS THE MANUSCRIPT MOVING, NOT THESE EXPECTATIONS BEING BENT TO THE
// CODE. Nothing below was relaxed: every case still demands that the raised
// half comes back WHOLE and UNTOUCHED. What changed is that the expected value
// is now "what was raised, PLUS the entries table T-109 places on that surface,
// in that table's print order" -- and the entries are read out of the roster,
// never typed here, so an entry added to or taken off U-55 in the manuscript
// moves these cases with it instead of leaving them agreeing with stale code.
//
// ⚠️ HONEST NOTE ON WHAT WAS SEEN. `notices.ts` was not opened at all. What was
// read is `screen-renderer.ts` -- the file table T-064 makes the contract -- for
// the declarations of `RaisedConfirmation`, `Confirmation` and `CommandItem`,
// which is where the two halves and the four members of an entry are declared.
// ⭐ The VALUES below are not taken from those doc comments: each one is argued
// from a sentence of docs/spec named beside it, and the row ids and the words
// are read out of the generated roster and dictionary rather than typed.
//
// The rules these cases answer to:
//   表 T-109  its preamble makes the 面 column table T-103's settled names, and
//             IC-69 / IC-70 are the two rows it places on `Confirmation`
//   FR-029   「アイコンの名簿と置き場は…表 T-109 に…従うこと（MUST）」, and
//             (MUST) what cannot be used is drawn faint with its reason
//   U-55     表 T-103: 「続けてよいかを問う面。…2 択の入口は表 T-109 の `IC-69`
//             / `IC-70` が持つ」
//   FR-038   「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと（MUST）」--
//             so an entry's word is the dictionary's, keyed by its row id, and
//             「対象は `ja` と `en` の 2 言語とする」. ⚠️ Every word in that
//             dictionary WAS empty when these cases were written (PD-160), so a
//             case that read it and compared could not fail. The words have
//             since been written, and the built dictionary is kept because it
//             is still the only thing that tells a word READ from a word MINTED
//             -- see the block above the cases: they hand the unit a dictionary
//             this file BUILDS, whose words differ by row and by language, and
//             ask which one came out
//   NT-7   「何が起きるかを示したうえで、続けるか取りやめるかを選ばせること
//          （MUST）」／「消えるもの・解かれるものがあるときは、その名前を挙げる
//          こと（MUST）」／「問うてよいのは、要求が確認を求めると定めた場面だけ
//          とすること（MUST）」
//   DI-4   表 T-227:「同じとみなせない相手へ書き出そうとするときは、上書きして
//          よいかを問うこと（MUST）—— 作法は 表 T-037 の `NT-7`。消えるものの
//          名前を挙げる義務はここには無い」-- so an EMPTY list of names is a
//          real answer and a question carrying one may not be dropped
//   FR-031 「場面を列挙してはならない（MUST NOT）」-- so nothing here may sort
//          the questions by which requirement raised them
//   NT-5   「操作を止めないこと（MUST）」／「`NT-1`（受け付けないとき）と見分け
//          がつく形にすること（MUST）」-- OP-11 of table T-024a sends its
//          telling here: 先頭の 1 つだけを受け入れ、残りを無視したことを告げる
//   NT-3   「対象の件数を添えること」-- the count OP-11 has to carry
//   R7.1   `pure` in table T-075
// ===========================================================================

/**
 * Every place a requirement asks for a confirmation -- which is table T-234, walked
 * row by row (Chapter 1.9: one test walks every row of the table it is driven
 * by).
 *
 * ⛔ A roster of INPUTS, never of what may be shown: FR-031 forbids enumerating
 * the places that may ask (MUST NOT), so these cases prove that each row comes
 * back UNCHANGED -- which is what a unit that does not know the roster does.
 * ⭐ WHICH ROWS EXIST IS THE TABLE'S ANSWER, and so is whether NT-7's names are
 * owed on one: `items` follows the 名前を挙げるか column instead of a pairing
 * this file would otherwise have to invent. The names themselves are the
 * document's values (FR-076 says the dictionary does not hold them), so they
 * are this file's own ASCII stand-ins.
 */
const NT_7_ASKING_SITES: readonly {
  readonly by: string
  readonly question: string
  readonly items: readonly ConfirmationItem[]
}[] = T_234.map((entry) => ({
  by: `${entry.row} (${entry.by})`,
  question: entry.row,
  items: entry.namesWhatGoes
    ? [
        { name: 'foundation work', isShownOnAnotherRow: false },
        { name: 'steel delivery', isShownOnAnotherRow: true },
      ]
    : [],
}))

/** The row of table T-037 a question follows. */
const ASKING = 'NT-7'

/** U-55 of 表 T-103 -- the settled name of the surface a question stands on. */
const U_55_CONFIRMATION = 'Confirmation'

/**
 * 表 T-109 as it reaches `src/`, read at load time rather than copied by hand.
 *
 * ⭐ Chapter 1.9 asks a test of a requirement pointing at a table to be driven
 * by that table. `icon-roster.json` is generated from the manuscript's own rows
 * (its `$comment` names the source and the generator, and `npm run gen:check`
 * fails on drift), so reading it re-types nothing -- rule 03 of
 * docs/development-rules forbids re-typing a value the specification holds.
 * ⚠️ It is also the file the unit reads, so agreement with it alone would not
 * prove agreement with the manuscript. That is what the first case below is
 * for: it holds this roster against `_assets/tbl-glossary.md` itself.
 */
const ROSTER = (readJson('icon-roster.json') as {
  readonly icons: readonly { readonly rowId: string; readonly surfaces: readonly string[] }[]
}).icons

/**
 * 表 T-109's rows whose 面 column places them on U-55, in the table's own print
 * order -- which the roster preserves, being generated row by row.
 */
const T_109_ON_CONFIRMATION = ROSTER.filter((icon) =>
  icon.surfaces.includes(U_55_CONFIRMATION),
).map((icon) => icon.rowId)

/** The same question asked of the manuscript, so the two can be held together. */
const T_109_ON_CONFIRMATION_IN_MANUSCRIPT = specTable('T-109')
  .rows.filter((row) =>
    (row.by['面'] ?? '')
      .split('/')
      .map((one) => bare(one.trim()))
      .includes(U_55_CONFIRMATION),
  )
  .map((row) => row.id)

/**
 * The `icons` section of that same dictionary, keyed by the row of 表 T-109 --
 * where FR-038 (MUST) puts the word an entry of a surface prints.
 */
const DISPLAY_WORDS = DICTIONARY.icons

/**
 * FR-032 (MUST) marks the `Task`s that go with the row but are DRAWN on another
 * one -- HM-10 of table T-015a is what puts them there. The user ruled the
 * medium is a WORD (RC-13 keeps shapes to the user), so it lives in the same
 * dictionary and is read from it here rather than written down.
 */
const markFor = (mark: string, language: DisplayLanguage): string => {
  const word = DICTIONARY.confirmationMarks.find((one) => one.mark === mark)
  expect(word, `FR-032: the dictionary has no mark for ${mark}`).toBeDefined()
  return (word as { readonly text: Words }).text[language]
}

const labelOf = (rowId: string, language: DisplayLanguage): string => {
  const word = DISPLAY_WORDS.find((one) => one.rowId === rowId)
  expect(word, `FR-038: the dictionary has no row for ${rowId}`).toBeDefined()
  return (word as { readonly label: Words }).label[language]
}

/**
 * What a row of 表 T-037 is CALLED, in the display language.
 *
 * ⭐ READ, NEVER WRITTEN, the move `markFor` above already makes: FR-038 (MUST)
 * keeps every printed word in the one dictionary and the join is the row ID.
 * ⚠️ `shownFor` below WROTE the empty string in place of this while the
 * dictionary held no word for NT-7, and went on writing it after the word was
 * written -- four cases went red on that, and on nothing the unit did.
 */
const mannerTextFor = (manner: string, language: DisplayLanguage): string => {
  const word = DICTIONARY.notices.find((one) => one.rowId === manner)
  expect(word, `FR-038: the dictionary has no row of 表 T-037 for ${manner}`).toBeDefined()
  return (word as { readonly manner: Words }).manner[language]
}

/**
 * The text NT-1 (MUST) asks for and the next step NT-3a (MUST) asks for, for one
 * row of 表 T-233, in the display language.
 *
 * ⭐ ONE STEP PER ROW: the dictionary holds `nextStep`, singular, because a row
 * of that table names one situation. `Notice.nextSteps` is a list for NT-4's
 * sake, not because a row has several.
 */
const reasonWordsFor = (
  reason: string,
  language: DisplayLanguage,
): { readonly text: string; readonly nextStep: string } => {
  const word = DICTIONARY.reasons.find((one) => one.rowId === reason)
  expect(word, `FR-076: the dictionary has no row of 表 T-233 for ${reason}`).toBeDefined()
  const held = word as { readonly text: Words; readonly nextStep: Words }
  return { text: held.text[language], nextStep: held.nextStep[language] }
}

/**
 * The sentence NT-7 (MUST) asks for -- what is about to happen, in words -- for one row of
 * 表 T-234, in the display language.
 *
 * ⭐ THE OTHER HALF OF THE PAIR `reasonWordsFor` reads. FR-076 makes a question
 * carry a row of that table and (MUST NOT) bars one it does not hold, and
 * FR-038 (MUST) keeps the sentence in the one dictionary, keyed by the row.
 * ⛔ READ, NEVER WRITTEN: a bench that minted the sentence would be the second
 * store of translated strings FR-038 forbids, exactly as a raiser that supplied
 * one would be.
 */
const questionTextFor = (question: string, language: DisplayLanguage): string => {
  const word = DICTIONARY.questions.find((one) => one.rowId === question)
  expect(word, `FR-076: the dictionary has no row of 表 T-234 for ${question}`).toBeDefined()
  return (word as { readonly text: Words }).text[language]
}

/**
 * The word NT-8 (MUST) gives the entrance that puts a told notice away.
 *
 * ⭐ READ, NEVER WRITTEN, the move `mannerTextFor` and `questionTextFor` already
 * make: 「その入口の語は `FR-038` の辞書が持ち」, so the bench looks it up rather
 * than spelling it. ⚠️ The section holds ONE entry: NT-8 names one entrance, and
 * the case below asserts the section is exactly that.
 */
const dismissTextFor = (language: DisplayLanguage): string => {
  const held = DICTIONARY.noticeDismiss
  expect(held, 'FR-038: the dictionary has no section for NT-8 s entrance').toBeDefined()
  expect(held.length, 'NT-8 names ONE entrance, so the section holds one entry').toBe(1)
  return (held[0] as { readonly text: Words }).text[language]
}

/**
 * The entries 表 T-109 places on U-55, as `CommandItem`s, in that table's order.
 *
 * ⭐ `isEnabled` is true on both. NT-7 (MUST) 「続けるか取りやめるかを選ばせる
 * こと」-- choosing between the two IS this surface, so neither can be spent;
 * FR-029 (MUST) reserves the faint drawing for what cannot be used, and nothing
 * makes either of these unusable.
 * ⭐ `isPressed` is false on both. It says a TOGGLE IS ON, which 表 T-109 marks
 * with 「出す・しまう」 in its 何の入口か column (IC-4, IC-7, IC-8 ...). These two
 * read 「問いに「続ける」と答える」/「問いに「取りやめる」と答える」-- an answer
 * given once, with no off.
 * ⭐ `label` is the dictionary's word for that row in the display language,
 * which is where FR-038 (MUST) puts every word the screen prints.
 */
const entriesOnConfirmation = (language: DisplayLanguage): readonly CommandItem[] =>
  T_109_ON_CONFIRMATION.map((rowId) => ({
    icon: rowId,
    isEnabled: true,
    isPressed: false,
    // FR-053: the entrance is not armed. ⛔ A separate member from `isPressed`,
    // because IC-54 says the palette entry is not a button and FR-053 (MUST NOT)
    // bars the pressed form -- so an arm may not travel on the toggle.
    isArmed: false,
    label: labelOf(rowId, language),
  }))

/**
 * The raised half -- what an asker can know: WHICH question this is, as a row of
 * 表 T-234, and what would go.
 *
 * ⛔ It carries no entries: the two answers are 表 T-109's, so an asker naming
 * them would be writing the roster's answer. ⛔ AND IT CARRIES NO SENTENCE: the
 * row is the join, FR-038 (MUST) keeps the words on the far side of this seam,
 * and an asker that supplied one would be the second store of translated strings
 * the same requirement forbids (MUST NOT) -- the very move
 * `RaisedNotice.reason` already makes against 表 T-233.
 */
const confirmationOf = (
  question: string,
  items: readonly ConfirmationItem[],
  manner: string = ASKING,
): RaisedConfirmation => ({ manner, question, items })

/**
 * What the screen owes for a question that was raised: what was raised, plus
 * the entries 表 T-109 places on the surface it stands on, in that order.
 */
const shownFor = (
  raised: RaisedConfirmation,
  language: DisplayLanguage = 'ja',
): Confirmation => ({
  ...raised,
  // ⛔ READ from the dictionary and never written here, exactly as
  // `shownOnAnotherRowMark` below already is: FR-038 (MUST) keeps the one store
  // of translated strings, and the join is the row of 表 T-037 the question
  // follows. ⚠️ This line held `''` while the dictionary had no word for NT-7,
  // and four cases went red the day the word was written -- the bench's own
  // fault, not the unit's.
  mannerText: mannerTextFor(raised.manner, language),
  // ⛔ READ from the dictionary too, and keyed by the row of 表 T-234 the asker
  // carried: NT-7 (MUST) has what is about to happen shown, and FR-038 (MUST) puts
  // that sentence in the one store of translated strings.
  text: questionTextFor(raised.question, language),
  entries: entriesOnConfirmation(language),
  shownOnAnotherRowMark: markFor('shownOnAnotherRow', language),
})

const sessionAsking = (
  confirmation: RaisedConfirmation | null,
  notices: readonly RaisedNotice[] = [],
): ScreenSession => ({ ...sessionOf(notices), confirmation })

/**
 * OP-11 of table T-024a as it reaches this unit -- accepted, with a warning
 * (NT-5), carrying NT-3's count for what was left out of the hand-over.
 */
const OP_11_TELLING = raisedOf('NT-5', reasonWrittenAgainst('NT-5'), 2)

// ---------------------------------------------------------------------------
// A dictionary this file BUILDS, and the way it is put in front of the unit.
// ---------------------------------------------------------------------------

/**
 * ⛔ WHY A DICTIONARY IS BUILT AT ALL. Every word in the one FR-038 names WAS the
 * empty string when these cases were written (PD-160: the manuscript was
 * unwritten and an agent may not invent a word), so a case that READ that
 * dictionary and held the answer against it would have been holding '' against
 * '' -- which is equally true of a unit that keys by the wrong row, of one that
 * never looks at the display language, and of one that writes a constant. So
 * these cases hand the unit a dictionary whose every word is DISTINCT by row and
 * by language, and then ask WHICH word came out.
 * ⭐ THE WORDS HAVE SINCE BEEN WRITTEN and the built dictionary is kept: which
 * entry an answer was READ from is still the one thing a dictionary of the real
 * words cannot show, because both sides of such a case read the same file.
 *
 * ⛔ NO WORD OF EITHER LANGUAGE IS MINTED HERE. FR-038's MUST NOT bars writing
 * the word itself into a requirement or a table, and a test may not settle one
 * either. What is below is not a word: it is the row id and the language spelled
 * back, made to be told apart.
 */
const markForRow = (rowId: string, language: DisplayLanguage): string =>
  `<${language}/${rowId}/label>`

/**
 * A mark keyed the way the `confirmation` section of that same dictionary is
 * keyed -- by the ANSWER (`proceed` / `cancel`), not by a row of 表 T-109.
 *
 * ⚠️ A DECOY, and why laying one is fair: the preamble above 表 T-109 says
 * 「繋ぎ目は行 ID `IC-nn` だけである」, and nothing in docs/spec joins the words
 * `proceed` / `cancel` to a row of that table. An entry that came back wearing
 * one of these was joined by something the specification has not settled, and
 * the case below says so rather than passing.
 */
const markForAnswer = (answer: string, language: DisplayLanguage): string =>
  `<${language}/${answer}/text>`

/**
 * A mark for one row of 表 T-234 -- the sentence NT-7 (MUST) shows, keyed by the
 * row FR-076 makes the join.
 *
 * ⛔ NO WORD IS MINTED HERE either: what is below is the row id and the language
 * spelled back, made to be told apart from the sentence on disk.
 */
const markForQuestion = (rowId: string, language: DisplayLanguage): string =>
  `<${language}/${rowId}/question>`

/** The module the unit reads its words from -- Chapter 6.2's generated file. */
const DISPLAY_WORDS_MODULE = '../../src/adapter/screen-renderer/display-words.json'

interface DictionaryShape {
  readonly icons: readonly { readonly rowId: string }[]
  readonly questions: readonly { readonly rowId: string }[]
  readonly confirmation: readonly { readonly answer: string }[]
}

/**
 * The generated dictionary with every word replaced by a mark of this file's.
 *
 * ⭐ The SHAPE is the real file's, read off the disk rather than typed here, so
 * the unit is handed the very keys it always gets and only the words move. ⛔ No
 * row id is written down: which rows exist is still 表 T-109's answer.
 */
function dictionaryOfMarks(): unknown {
  const onDisk = readJson('display-words.json') as DictionaryShape & Record<string, unknown>
  const inBothLanguages = (
    word: (language: DisplayLanguage) => string,
  ): Record<DisplayLanguage, string> => ({ ja: word('ja'), en: word('en') })

  return {
    ...onDisk,
    icons: onDisk.icons.map((entry) => ({
      ...entry,
      label: inBothLanguages((language) => markForRow(entry.rowId, language)),
      hint: inBothLanguages((language) => `<${language}/${entry.rowId}/hint>`),
    })),
    questions: onDisk.questions.map((entry) => ({
      ...entry,
      text: inBothLanguages((language) => markForQuestion(entry.rowId, language)),
    })),
    confirmation: onDisk.confirmation.map((entry) => ({
      ...entry,
      text: inBothLanguages((language) => markForAnswer(entry.answer, language)),
    })),
  }
}

/**
 * The question as the screen receives it, with the built dictionary standing
 * where the generated one stands.
 *
 * ⚠️ The unit reads the dictionary as a MODULE, so the module is what is
 * replaced, and only for the length of one case. The cases that hold the answer
 * against the REAL dictionary (`shownFor`) go on reading the file on disk and
 * are untouched by this.
 */
async function shownWithMarkedDictionary(
  language: DisplayLanguage,
  question: string = questionRow(0),
): Promise<Confirmation> {
  vi.resetModules()
  vi.doMock(DISPLAY_WORDS_MODULE, () => ({ default: dictionaryOfMarks() }))
  try {
    const fresh = await import('../../src/adapter/screen-renderer/notices')
    const asked = confirmationOf(question, [])
    const shown = fresh.confirmationFromSession({ ...sessionAsking(asked), language })
    expect(shown, 'a raised question came back as none').not.toBeNull()
    return shown as Confirmation
  } finally {
    vi.doUnmock(DISPLAY_WORDS_MODULE)
    vi.resetModules()
  }
}

/**
 * The generated dictionary with every WORD replaced by a distinct mark, and
 * every key left exactly as it stands.
 *
 * ⭐ A word is the `{ ja, en }` pair, which is the shape Chapter 6.2 generates
 * for one; a `rowId`, an `answer` or a surface `name` is a key and is not
 * touched, so the unit is handed the very joins it always gets.
 * ⛔ NO WORD IS MINTED HERE, and no key is invented: what goes in is the row's
 * own path spelled back, made to be told apart from the words on disk.
 */
function dictionaryOfMarksEverywhere(): unknown {
  const isWordPair = (node: object): boolean => {
    const keys = Object.keys(node)
    return keys.length === 2 && keys.includes('ja') && keys.includes('en')
  }
  const walk = (node: unknown, path: string): unknown => {
    if (Array.isArray(node)) return node.map((item, index) => walk(item, `${path}/${index}`))
    if (typeof node !== 'object' || node === null) return node
    if (isWordPair(node)) return { ja: `<ja${path}>`, en: `<en${path}>` }
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, walk(value, `${path}/${key}`)]),
    )
  }
  return walk(readJson('display-words.json'), '')
}

/**
 * What UF-67 tells when the dictionary in front of it is the one given here.
 *
 * ⚠️ The unit reads the dictionary as a MODULE, so the module is what is stood
 * in, and only for the length of one case.
 */
async function noticesWithDictionary(
  dictionary: unknown,
  raised: readonly RaisedNotice[],
  language: DisplayLanguage = 'ja',
): Promise<readonly Notice[]> {
  vi.resetModules()
  vi.doMock(DISPLAY_WORDS_MODULE, () => ({ default: dictionary }))
  try {
    const fresh = await import('../../src/adapter/screen-renderer/notices')
    return fresh.noticesFromSession({ ...sessionOf(raised), language })
  } finally {
    vi.doUnmock(DISPLAY_WORDS_MODULE)
    vi.resetModules()
  }
}

/**
 * The generated dictionary with ONE row of 表 T-233 emptied and nothing else
 * moved -- the row is still there, and both of its words are gone.
 *
 * ⛔ The shape is the real file's, read off the disk rather than typed, so the
 * unit is handed the very keys it always gets.
 */
function dictionaryWithReasonEmptied(reason: string): unknown {
  const onDisk = readJson('display-words.json') as Record<string, unknown>
  const blank: Words = { ja: '', en: '' }
  const emptied = (onDisk['reasons'] as readonly Record<string, unknown>[]).map((entry) =>
    entry['rowId'] === reason ? { ...entry, text: blank, nextStep: blank } : entry,
  )
  return { ...onDisk, reasons: emptied }
}

/** What UF-67 tells when the dictionary in front of it is that marked one. */
async function noticesWithMarkedDictionary(
  raised: readonly RaisedNotice[],
): Promise<readonly Notice[]> {
  vi.resetModules()
  vi.doMock(DISPLAY_WORDS_MODULE, () => ({ default: dictionaryOfMarksEverywhere() }))
  try {
    const fresh = await import('../../src/adapter/screen-renderer/notices')
    return fresh.noticesFromSession(sessionOf(raised))
  } finally {
    vi.doUnmock(DISPLAY_WORDS_MODULE)
    vi.resetModules()
  }
}

// ---------------------------------------------------------------------------

describe('UF-67 -- NT-8 (MUST): 告げた通知は人がその場で消せる', () => {
  // 表 T-037 の `NT-8`: 「人がその場で消せること（MUST）—— 消す道が無ければ、
  // 告げたものは日程の上に永久に残る。その入口の語は `FR-038` の辞書が持ち、
  // どの表示言語でも `OK` と綴ること（MUST）…⛔ `NT-7` の確認に置いてはならない
  // （MUST NOT）—— あちらは答えを求めるものであり、消す入口を置くと「どちらでも
  // ない」が生まれる」

  /** Every telling this file can raise for real, one per row of 表 T-037 that tells. */
  const EVERY_TELLING: readonly RaisedNotice[] = [
    REFUSAL,
    WARNING,
    DESTRUCTIVE,
    FAILURE,
    AT_LIMIT,
    PENDING_RESTORE,
  ]

  it('GIVEN a telling of any manner WHEN it is shown THEN it carries the way out (MUST)', () => {
    // 「人がその場で消せること（MUST）」-- a telling with no entrance is one that
    // stays on the schedule for ever, which is the reason the row gives itself.
    for (const raised of EVERY_TELLING) {
      const told = noticesFromSession(sessionOf([raised]))[0] as Notice

      expect(told.dismissText.length, `${raised.manner}: 消す入口の語`).toBeGreaterThan(0)
      expect(told.dismissKey.length, `${raised.manner}: どの通知を消すのか`).toBeGreaterThan(0)
    }
  })

  it('GIVEN either display language WHEN a telling is shown THEN the word is the dictionary s, and it is `OK` in both (MUST)', () => {
    // 「その入口の語は `FR-038` の辞書が持ち、どの表示言語でも `OK` と綴ること
    // （MUST）」. ⭐ Both halves: the word is READ from the dictionary, and the
    // dictionary's own two cells hold the one spelling the user ruled on.
    for (const language of LANGUAGES) {
      const told = noticesFromSession({ ...sessionOf([REFUSAL]), language })[0] as Notice

      expect(told.dismissText, language).toBe(dismissTextFor(language))
      expect(told.dismissText, `NT-8 (MUST): ${language} でも OK と綴る`).toBe('OK')
    }
  })

  it('GIVEN a dictionary of marks WHEN a telling is shown THEN the word came from it and is no literal of the unit s', async () => {
    // ⛔ THE HALF A DICTIONARY OF THE REAL WORDS CANNOT SHOW. `OK` is short
    // enough for a unit to spell for itself and pass the case above, so the
    // dictionary is stood in with one whose every word names its own cell: a
    // unit that wrote its own `OK` hands back `OK` here and goes red.
    const told = (await noticesWithMarkedDictionary([REFUSAL]))[0] as Notice

    expect(told.dismissText).not.toBe('OK')
    expect(told.dismissText).toMatch(/^<ja\//)
    expect(told.dismissText).toContain('noticeDismiss')
  })

  it('⛔ GIVEN a question WHEN it is shown THEN it carries no way out at all (MUST NOT)', () => {
    // 「`NT-7` の確認に置いてはならない（MUST NOT）—— …消す入口を置くと
    // 「どちらでもない」が生まれる」. The whole of the choice is the two answers
    // `NT-7` (MUST) asks for, so a third road off the surface is exactly what
    // the row bars.
    const shown = confirmationFromSession(sessionAsking(confirmationOf(questionRow(0), []))) as Confirmation
    const carried = shown as unknown as Record<string, unknown>

    expect(Object.keys(carried)).not.toContain('dismissText')
    expect(Object.keys(carried)).not.toContain('dismissKey')
    // ⚠️ And the word itself reaches no member of the surface either -- a
    // question that printed it somewhere would be offering the same third road.
    expect(JSON.stringify(shown)).not.toContain(dismissTextFor('ja'))
  })

  it('GIVEN two tellings that differ WHEN both stand THEN a press puts away one of them and not the other', () => {
    // 「WHICH telling a press on that entrance put away」-- `manner` cannot say
    // it, because 表 T-037 lets any number of tellings wear one row. So two
    // tellings that are not the same telling may not answer to one key.
    const shown = noticesFromSession(sessionOf([REFUSAL, FAILURE]))

    expect(shown.length).toBe(2)
    expect((shown[0] as Notice).dismissKey).not.toBe((shown[1] as Notice).dismissKey)
  })

  it('GIVEN two tellings raised alike WHEN both stand THEN they answer to one key (nothing on the screen tells them apart)', () => {
    // The other side of the same rule: two tellings carrying one manner and one
    // reason carry one set of words, so leaving one standing after a press would
    // look to the person like the press did nothing.
    const shown = noticesFromSession(sessionOf([REFUSAL, REFUSAL]))

    expect(shown.length).toBeGreaterThan(0)
    const keys = new Set(shown.map((one) => one.dismissKey))
    expect(keys.size).toBe(1)
  })

  it('GIVEN the run NT-4 gathers WHEN the one surface stands THEN it too carries a way out', () => {
    // NT-4 (MUST) makes one surface out of several raised notices, and NT-8 is
    // written of 「告げた通知」 without exception -- so the gathered one is a
    // telling like any other and may not be the one thing that cannot be put away.
    const gathered = noticesFromSession(
      sessionOf([PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API, PENDING_WATERMARK]),
    )

    expect(gathered.length).toBe(1)
    expect((gathered[0] as Notice).dismissText).toBe(dismissTextFor('ja'))
    expect((gathered[0] as Notice).dismissKey.length).toBeGreaterThan(0)
  })
})

describe('UF-67 -- NT-7 (MUST): 続けてよいかを問う', () => {
  it('GIVEN no question was raised WHEN the view is filled THEN there is none to answer (the empty case)', () => {
    expect(confirmationFromSession(sessionAsking(null))).toBeNull()
  })

  it('GIVEN a question was raised WHEN the view is filled THEN it comes back exactly as it was raised', () => {
    // NT-7 asks for 何が起きるか in words and for the names of what would go,
    // and neither can be known anywhere but where the question is raised.
    const asked = confirmationOf(questionRow(0), [
      { name: 'foundation work', isShownOnAnotherRow: false },
    ])

    expect(confirmationFromSession(sessionAsking(asked))).toEqual(shownFor(asked))
  })

  it('GIVEN each place a requirement asks WHEN the view is filled THEN each comes back untouched (one case walks the roster; FR-031 MUST NOT)', () => {
    // FR-031 no longer counts the places that may ask, so filtering by WHICH
    // requirement raised the question is exactly what its MUST NOT bars.
    for (const site of NT_7_ASKING_SITES) {
      const asked = confirmationOf(site.question, site.items)

      expect(confirmationFromSession(sessionAsking(asked)), site.by).toEqual(shownFor(asked))
    }
  })

  it('GIVEN a question that takes nothing with it WHEN the view is filled THEN it is still asked (empty items is an answer, not a missing one)', () => {
    // 表 T-227 DI-4:「消えるものの名前を挙げる義務はここには無い」。Dropping a
    // question for having no names would silence the one MUST of that table.
    // ⭐ WHICH ROWS THOSE ARE IS 表 T-234's ANSWER, read from its 名前を挙げるか
    // column -- DI-4 is one of them and this file no longer says which.
    const takingNothing = T_234.filter((entry) => !entry.namesWhatGoes)
    expect(takingNothing.length, '表 T-234: at least one row names nothing').toBeGreaterThan(0)

    for (const entry of takingNothing) {
      const asked = confirmationOf(entry.row, [])

      const shown = confirmationFromSession(sessionAsking(asked))

      expect(shown, entry.by).not.toBeNull()
      expect((shown as Confirmation).items, entry.by).toEqual([])
      expect((shown as Confirmation).text, entry.by).toBe(questionTextFor(entry.row, 'ja'))
    }
  })

  it('GIVEN a thing that carries no name WHEN the question is shown THEN the null name survives rather than the item being dropped', () => {
    // `Task.name` is optional in the document, so a nameless task has to stay
    // describable. A count may not stand in for the names (FR-032, FR-099).
    const asked = confirmationOf(questionRow(2), [
      { name: null, isShownOnAnotherRow: false },
      { name: 'painting', isShownOnAnotherRow: true },
    ])

    const shown = confirmationFromSession(sessionAsking(asked)) as Confirmation

    expect(shown.items).toHaveLength(2)
    expect(shown.items.map((item) => item.name)).toEqual([null, 'painting'])
    expect(shown.items.map((item) => item.isShownOnAnotherRow)).toEqual([false, true])
  })

  it('GIVEN many things would go WHEN the question is shown THEN every name reaches it (no cap; the count may not stand in)', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      name: `task number ${index}`,
      isShownOnAnotherRow: index % 2 === 0,
    }))
    const asked = confirmationOf(questionRow(3), many)

    expect((confirmationFromSession(sessionAsking(asked)) as Confirmation).items).toEqual(many)
  })

  it('GIVEN a question raised WHEN it is shown THEN the row of table T-037 it follows travels with it', () => {
    // `Confirmation.manner` is the join to the table, carried rather than
    // assumed -- the same move `Notice.manner` makes for NT-5 against NT-1.
    const asked = confirmationOf(questionRow(4), [])

    expect((confirmationFromSession(sessionAsking(asked)) as Confirmation).manner).toBe(ASKING)
  })

  it('GIVEN notices raised beside the question WHEN both members are filled THEN neither becomes the other (a question is not a notice)', () => {
    // NT-7 stops until it is answered and NT-1 .. NT-6 do not, so a question
    // wearing a notice's shape would let a caller show one nobody can answer.
    const asked = confirmationOf(questionRow(4), [])
    const session = sessionAsking(asked, [REFUSAL, PENDING_RESTORE, WARNING])

    const shown = noticesFromSession(session)

    expect(shown.map((notice) => notice.manner).sort()).toEqual(['NT-1', 'NT-4', 'NT-5'])
    // ⭐ The question's own sentence -- the one 表 T-234 holds for the row that
    // was raised -- may not turn up on a telling: a notice asks for no answer.
    expect(
      shown.some((notice) => notice.text === questionTextFor(asked.question, 'ja')),
    ).toBe(false)
    expect(confirmationFromSession(session)).toEqual(shownFor(asked))
  })

  it('GIVEN pending startup items being gathered WHEN a question stands beside them THEN NT-4 gathering does not reach it', () => {
    // NT-4 (MUST) is the only row that speaks about several at once, and it is
    // about notices. Nothing here gathers or orders questions.
    const asked = confirmationOf(questionRow(5), [
      { name: 'the autosave of 09:00', isShownOnAnotherRow: false },
    ])
    const session = sessionAsking(asked, [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API])

    expect(noticesFromSession(session)).toHaveLength(1)
    expect(confirmationFromSession(session)).toEqual(shownFor(asked))
  })

  it('GIVEN nothing was raised at all WHEN both members are filled THEN there is nothing to tell and nothing to answer', () => {
    const session = sessionAsking(null, [])

    expect(noticesFromSession(session)).toEqual([])
    expect(confirmationFromSession(session)).toBeNull()
  })
})

describe('UF-67 -- FR-076 and 表 T-234: the sentence a question shows is READ, row by row', () => {
  it('shows every row of 表 T-234 in that row s own sentence, in the display language (one case, every row)', () => {
    // ⭐ THE TWIN OF THE 表 T-233 CASE ABOVE. NT-7 (MUST) has what is about to
    // happen shown before the choice is offered, and FR-076 (MUST) makes what
    // a question shows a row of 表 T-234 while (MUST NOT) barring any other --
    // so the sentence is the dictionary's, keyed by the row the asker carried.
    // ⛔ EXPECTED VALUES ARE READ, NEVER WRITTEN: FR-038 (MUST NOT) bars the
    // words from a requirement and from a table, and the same reason bars a
    // bench from minting one.
    for (const language of LANGUAGES) {
      for (const entry of T_234) {
        const asked = confirmationOf(entry.row, [])
        const shown = confirmationFromSession({ ...sessionAsking(asked), language })

        expect(shown, `${entry.row} in ${language}`).not.toBeNull()
        expect((shown as Confirmation).text, `${entry.row} in ${language}`).toBe(
          questionTextFor(entry.row, language),
        )
      }
    }
  })

  it('prints no question key on the surface (FR-038 MUST: a row ID is not a word)', () => {
    // The row of 表 T-234 is the JOIN and the sentence is the word; a surface
    // still carrying the row the asker handed over is a word from nowhere.
    for (const entry of T_234) {
      const shown = confirmationFromSession(
        sessionAsking(confirmationOf(entry.row, [])),
      ) as Confirmation

      expect(shown.text, `${entry.row} is a key, not a sentence`).not.toContain(entry.row)
    }
  })

  it('falls to the row FR-076 names when the question has no row of its own', () => {
    // FR-076 gives a question with no row of its own somewhere to fall to, and
    // says why: without it, a question reaches the person that cannot meet
    // NT-7's first MUST -- what is about to happen, shown.
    // ⛔ THE ONE INPUT THIS FILE MAKES THAT AN ASKER MAY NOT: FR-076 (MUST NOT)
    // bars a question 表 T-234 does not hold, so this row cannot arrive from the
    // product -- and the fallback row exists for exactly the case where one does.
    // ⚠️ ASCII, because a control character in a string key has stopped the whole
    // build before now (04-verification.md, 3.).
    expect(
      T_234.map((entry) => entry.row),
      'FR-076: the row a question with no row of its own falls to has to be one of them',
    ).toContain(FALLBACK_QUESTION)

    const outsider = 'QN-no-row-of-its-own'

    for (const language of LANGUAGES) {
      const shown = confirmationFromSession({
        ...sessionAsking(confirmationOf(outsider, [])),
        language,
      }) as Confirmation

      expect(shown.text, `the fallback sentence in ${language}`).toBe(
        questionTextFor(FALLBACK_QUESTION, language),
      )
      expect(shown.text, 'FR-038 (MUST): a row ID is not a word').not.toContain(outsider)
    }
  })

  it('one section of the dictionary is keyed on the rows of 表 T-234 and holds the sentence each of them owes', () => {
    // ⭐ THE SAME TRIPWIRE THE 表 T-233 SECTION HAS, turned the same way up: it
    // goes red if the section is taken away, re-keyed, loses a row, or gains one
    // the table does not print.
    // ⛔ Driven by the file and by the fixed copy of the table, never by a list
    // written here: which rows exist is 表 T-234's answer (FR-076 MUST / MUST
    // NOT), and which section answers for them is the dictionary's.
    const dictionary = readJson('display-words.json') as Record<string, unknown>
    const sections = Object.entries(dictionary).filter(([, value]) => Array.isArray(value))

    const isWordPair = (value: unknown): boolean =>
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value as Record<string, unknown>).every((word) => typeof word === 'string')

    const entriesOf = (value: unknown): readonly Record<string, unknown>[] =>
      (value as readonly unknown[]).filter(
        (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
      )

    const keysOfSection = (value: unknown): readonly string[] =>
      entriesOf(value)
        .filter((entry) => typeof entry['rowId'] === 'string' && isWordPair(entry['text']))
        .map((entry) => entry['rowId'] as string)

    const answering = sections.filter(
      ([, value]) =>
        keysOfSection(value).length > 0 &&
        keysOfSection(value).join(' ') === T_234.map((entry) => entry.row).join(' '),
    )

    expect(
      answering.map(([name]) => name),
      'FR-076 / FR-038: exactly one section is keyed on the rows of 表 T-234 and holds a sentence for each',
    ).toHaveLength(1)
  })
})

describe('UF-67 -- 表 T-109: the answers the roster places on the `Confirmation` surface', () => {
  it('GIVEN the manuscript of table T-109 WHEN the generated roster is read THEN both place the same entries on U-55, in the same order', () => {
    // ⛔ WHY THIS CASE EXISTS. The roster the cases below are driven by is the
    // file the unit reads, so agreement with it alone could not tell drift from
    // agreement. This one holds it against `_assets/tbl-glossary.md` itself,
    // whose section 8 preamble says 「`面` の欄は 表 T-103 の確定名である」-- the
    // column that decides the placement.
    expect(T_109_ON_CONFIRMATION).toEqual(T_109_ON_CONFIRMATION_IN_MANUSCRIPT)
    expect(
      T_109_ON_CONFIRMATION.length,
      'U-55 of 表 T-103: 「2 択の入口は表 T-109 の `IC-69` / `IC-70` が持つ」',
    ).toBeGreaterThan(0)
  })

  it('GIVEN a question raised with no entries of its own WHEN it is shown THEN it carries the entries table T-109 places on U-55, in that table order', () => {
    // The asker cannot know them: 表 T-109 decides which entries stand on a
    // surface, so composing them onto the raised half is the unit's work.
    const asked = confirmationOf(questionRow(4), [])

    const shown = confirmationFromSession(sessionAsking(asked)) as Confirmation

    expect(shown.entries.map((entry) => entry.icon)).toEqual(T_109_ON_CONFIRMATION)
  })

  it('GIVEN the entries of that surface WHEN they are shown THEN each can be pressed and none is a toggle that is on', () => {
    // NT-7 (MUST): 「続けるか取りやめるかを選ばせること」-- an answer that could
    // not be given would leave the question unanswerable, and FR-029 (MUST)
    // keeps the faint drawing for what cannot be used. 表 T-109 marks a toggle
    // with 「出す・しまう」; these two are answers, given once, with no off.
    const shown = confirmationFromSession(
      sessionAsking(confirmationOf(questionRow(0), [])),
    ) as Confirmation

    for (const entry of shown.entries) {
      expect(entry.isEnabled, `FR-029: ${entry.icon}`).toBe(true)
      expect(entry.isPressed, `${entry.icon} is not a toggle`).toBe(false)
    }
  })

  it('GIVEN the dictionary on disk WHEN the entries are shown THEN each carries the word it holds for that row and language, whatever it is', () => {
    // FR-038 (MUST): 「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと」.
    // ⚠️ WHAT THIS CASE CAN AND CANNOT CATCH. It reads the generated dictionary,
    // which is also where the unit reads -- so it can tell a word that went
    // astray on the way, but it cannot tell a word READ from a word MINTED, and
    // it went vacuous whenever a cell was empty (PD-160). It is kept because it
    // is the only case that watches the REAL file. The two cases that follow are
    // the ones that tell reading from minting: they hand the unit a dictionary
    // this file built.
    for (const language of LANGUAGES) {
      const session: ScreenSession = {
        ...sessionAsking(confirmationOf(questionRow(2), [])),
        language,
      }

      const shown = confirmationFromSession(session) as Confirmation

      expect(shown.entries, language).toEqual(entriesOnConfirmation(language))
    }
  })

  it('GIVEN a dictionary that holds a distinct word for every row and language WHEN the entries are shown THEN each word is the one that dictionary holds, keyed by its row (FR-038)', async () => {
    // FR-038 (MUST): 「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと」--
    // so the word an entry carries is READ, from that one place, and the join is
    // 表 T-109's row id (its preamble: 「繋ぎ目は行 ID `IC-nn` だけである」).
    // ⭐ Every word below differs by row AND by language, so a unit that keyed by
    // the wrong row, never looked at `ScreenSession.language`, read the
    // `confirmation` section's `proceed` / `cancel` instead, or wrote a word of
    // its own, answers with something this case can name.
    const byLanguage = new Map<DisplayLanguage, readonly string[]>()

    for (const language of LANGUAGES) {
      const shown = await shownWithMarkedDictionary(language)

      expect(
        shown.entries.map((entry) => entry.label),
        language,
      ).toEqual(T_109_ON_CONFIRMATION.map((rowId) => markForRow(rowId, language)))
      byLanguage.set(
        language,
        shown.entries.map((entry) => entry.label),
      )
    }

    // FR-038: 「利用者が表示言語を選んだとき…その言語で示すこと」-- the two
    // display languages may not come back as one and the same word.
    expect(byLanguage.get('ja')).not.toEqual(byLanguage.get('en'))
  })

  it('GIVEN the entries 表 T-109 places on this surface WHEN their words are read THEN each carries the word that dictionary holds for ITS OWN row, and no two of them share one (FR-038)', async () => {
    // ⭐ THIS IS WHERE THE TWO ANSWERS THEMSELVES ARE COVERED. The case above
    // walks the roster in order, so a unit that handed both entries the FIRST
    // row's word would still have to be caught by something; here each entry is
    // looked up by the row IT carries, so a swap or a shared word is named.
    // ⛔ The row ids are not written here either -- `entry.icon` is the row the
    // entry says it is, and the dictionary is asked for that row.
    const shown = await shownWithMarkedDictionary('ja')

    expect(shown.entries.length, 'U-55: 「2 択の入口は表 T-109 の 2 行が持つ」').toBeGreaterThan(1)
    for (const entry of shown.entries) {
      expect(entry.label, entry.icon).toBe(markForRow(entry.icon, 'ja'))
    }
    expect(
      new Set(shown.entries.map((entry) => entry.label)).size,
      '2 つの答えが同じ語を着て出てはならない',
    ).toBe(shown.entries.length)
  })

  it('GIVEN a question is shown WHEN the raised half is looked at again THEN the entries were added on the way, not to what the asker holds', () => {
    // ⛔ `ScreenSession.confirmation` is the RAISED half. Widening it in place
    // would let a caller settle a placement 表 T-109 settles.
    const asked = confirmationOf(questionRow(5), [])
    const session = sessionAsking(asked)

    expect((confirmationFromSession(session) as Confirmation).entries.length).toBeGreaterThan(0)
    expect(session.confirmation).not.toHaveProperty('entries')
    expect(asked).not.toHaveProperty('entries')
  })

  it('GIVEN no question was raised WHEN the member is filled THEN there is no surface, and so no entries to place on one', () => {
    // 表 T-109 places the two entries on U-55; U-55 is the surface a question
    // stands on, and NT-7 admits none where nothing was asked.
    expect(confirmationFromSession(sessionAsking(null))).toBeNull()
  })
})

describe('UF-67 -- NT-5: OP-11 of table T-024a is told, not refused', () => {
  it('GIVEN files were left out of a hand-over WHEN the telling is shown THEN it stands apart from NT-1 refusal (NT-5 MUST)', () => {
    // OP-11 of table T-024a (MUST) takes the first file and tells that the rest
    // were ignored, in NT-5's manner, and (MUST NOT) forbids showing that as
    // not having been accepted -- one of them WAS opened.
    const shown = noticesFromSession(sessionOf([REFUSAL, OP_11_TELLING]))

    expect(shown).toHaveLength(2)
    expect(shown.map((notice) => notice.manner).sort()).toEqual(['NT-1', 'NT-5'])
    const told = shown.find((notice) => notice.manner === 'NT-5') as Notice
    expect(told.affectedCount, 'NT-3: the count OP-11 carries').toBe(OP_11_TELLING.affectedCount)
  })

  it('GIVEN the count of what was ignored WHEN the telling is shown THEN the count survives (NT-3)', () => {
    const shown = noticesFromSession(sessionOf([OP_11_TELLING]))

    expect((shown[0] as Notice).affectedCount).toBe(2)
  })

  it('GIVEN nothing was left behind WHEN a count of zero is told THEN zero survives as zero, not as absent', () => {
    const none = raisedOf('NT-5', reasonWrittenAgainst('NT-5'), 0)
    const shown = noticesFromSession(sessionOf([none]))

    expect((shown[0] as Notice).affectedCount).toBe(0)
  })

  it('GIVEN the OP-11 telling raised at startup beside pending items WHEN the surfaces are chosen THEN it is not swept into NT-4 gathering', () => {
    // Merging it would put it under another row's manner, and NT-5 (MUST) has
    // to stay tellable apart from NT-1's refusal.
    const shown = noticesFromSession(sessionOf([PENDING_RESTORE, OP_11_TELLING, PENDING_RECOVERY]))
    const told = shown.filter((notice) => notice.manner === 'NT-5')

    expect(shown).toHaveLength(2)
    expect(told).toHaveLength(1)
    expect((told[0] as Notice).affectedCount).toBe(OP_11_TELLING.affectedCount)
  })
})

describe('UF-67 -- confirmationFromSession is @purity pure (table T-075, R7.1)', () => {
  it('GIVEN a question and its items WHEN the view is filled THEN nothing it was given is rewritten', () => {
    const asked = confirmationOf(questionRow(2), [
      { name: 'foundation work', isShownOnAnotherRow: false },
      { name: null, isShownOnAnotherRow: true },
    ])
    const before = structuredClone(asked)
    const session = sessionAsking(asked, [REFUSAL, PENDING_RESTORE])

    confirmationFromSession(session)

    expect(asked).toEqual(before)
    expect(session.confirmation).toEqual(before)
  })

  it('GIVEN the same session WHEN it is asked twice THEN it answers the same way both times', () => {
    const session = sessionAsking(confirmationOf(questionRow(4), []), [REFUSAL])

    expect(confirmationFromSession(session)).toEqual(confirmationFromSession(session))
  })
})


describe('UF-67 -- FR-038: the words are READ from the dictionary, never minted', () => {
  it('answers differently when the dictionary is different, because that is where the words are', async () => {
    // ⭐ THE ONE CASE HERE THAT CAN TELL A WORD READ FROM A WORD MINTED. FR-038
    // (MUST) holds every word the screen prints in the per-language dictionary
    // and (MUST NOT) forbids a second store of them; so if one and the same
    // session is answered identically with the generated dictionary and with one
    // whose every word has been replaced, then no word of that answer came from
    // a dictionary at all.
    // ⚠️ It stood red while the dictionary held no section a reason could be
    // looked up under -- replacing its words changed nothing. ⛔ Do not weaken
    // it into a case that a unit writing its own sentence would pass -- that
    // unit is exactly what FR-038 forbids, and this is the case that names it.
    const asGenerated = noticesFromSession(sessionOf(SHELL_RAISED)).map((one) => one.text)
    const asMarked = (await noticesWithMarkedDictionary(SHELL_RAISED)).map((one) => one.text)

    expect(asMarked, 'FR-038 (MUST): the words follow the dictionary').not.toEqual(asGenerated)
  })

  it('reads a question s sentence from the dictionary too, keyed by its row of 表 T-234 and by the language', async () => {
    // ⭐ THE SAME CLAIM FOR THE ASKING SIDE. The dictionary handed over below
    // holds a sentence that differs by ROW and by LANGUAGE, so a unit that keyed
    // by the wrong row, never looked at `ScreenSession.language`, or wrote a
    // sentence of its own answers with something this case can name.
    const byLanguage = new Map<DisplayLanguage, readonly string[]>()

    for (const language of LANGUAGES) {
      const shownPerRow: string[] = []
      for (const entry of T_234) {
        const shown = await shownWithMarkedDictionary(language, entry.row)

        expect(shown.text, `${entry.row} in ${language}`).toBe(
          markForQuestion(entry.row, language),
        )
        shownPerRow.push(shown.text)
      }
      byLanguage.set(language, shownPerRow)
    }

    // FR-038 (MUST): the words are shown in the language the reader chose.
    expect(byLanguage.get('ja')).not.toEqual(byLanguage.get('en'))
  })
})
