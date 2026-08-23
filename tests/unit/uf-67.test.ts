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
// drive both. It now holds `RaisedNotice` -- the manner, a reason KEY, and
// NT-3's count -- and the words are read on this side, out of the one
// dictionary FR-038 (MUST) keeps them in.
// ⛔ THAT IS THE SEAM MOVING, NOT THESE EXPECTATIONS BEING BENT TO THE CODE.
// No MUST below was softened to match what the unit now returns. FOUR cases are
// RED, and are meant to stay red until the debt named under them is paid.
//
// ⛔ WHAT IS RED, AND WHY IT MAY NOT BE REWRITTEN.
//   1. NT-1 of table T-037 (MUST) has a refusal say WHICH item and WHY in
//      words, and forbids colour or a border alone (MUST NOT).
//   2. NT-3a (MUST) has a failure carry what can be done next, and forbids a
//      telling that says only that something failed (MUST NOT). NT-6 sends its
//      own next step to that same row.
//   3. FR-038 (MUST) holds every word the screen prints in the per-language
//      dictionary -- so no surface may print the raiser's key instead.
//   4. FR-038 again, from the other side: a different dictionary has to be a
//      different telling, or the words came from somewhere that is not a
//      dictionary.
// ⭐ ALL FOUR HAVE ONE CAUSE. A raiser now hands over a KEY and no words, and
// the generated dictionary holds no entry that a key can be found under -- it
// has no section keyed by one at all (the tripwire case below asserts exactly
// that). What the person is shown today is the key itself.
// ⛔ The debt is the MANUSCRIPT's (`docs/spec/_source/display-words.json`), not
// this unit's: FR-038 (MUST NOT) bars a second store of translated strings, so
// UF-67 may not mint a sentence and a test may not accept one it minted. The
// day the manuscript grows the entries, the tripwire goes red and these four go
// green -- ⛔ run them again rather than rewriting either side.
//
// ⭐ WHERE THE SPECIFICATION DECIDES NOTHING, NOTHING IS ASSERTED:
//   * ⛔ THE REASON VOCABULARY. No table of docs/spec settles the keys a raiser
//     may put in `RaisedNotice.reason`; AG-9a of table T-035 requires a kind of
//     reason on the machine-facing refusal and names no member of the set. The
//     keys below are this file's own inputs and stand for nothing published.
//   * ⛔ NT-4's WHOLE-OF-THEM IS NO LONGER OBSERVABLE HERE. The old bench could
//     watch every gathered item reach the one surface because the raiser gave
//     words; with the words owed by the dictionary, a case written that way
//     would be asserting whatever stands in for them, and would go on passing
//     once real words replaced it. What is asserted instead is the half that
//     needs no words: how many surfaces the run becomes. ⛔ Do not add a
//     text-based one until the dictionary can answer for a reason.
//   * the ORDER several shown notices stand in -- no row of table T-037 ranks
//     one manner above another, and the note under table T-077 puts the
//     gathered surface outside the boot order. Membership and counts only.
//   * WHAT COUNT the gathered surface carries -- NT-3 asks a count of a
//     destructive result and NT-4 asks for none, so `affectedCount` on the
//     gathered surface is asserted nowhere.
//   * WHAT BECOMES OF A REASON THE DICTIONARY DOES NOT HOLD. Nothing in
//     docs/spec settles a fallback, so no case fixes one; the shape case only
//     holds the unit to the type its own public entry declares.
//
// The rules these cases answer to:
//   FR-076   every telling follows table T-037
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
// driven by a fixed copy of the table, with one test walking every row. T_037
// below is that copy.

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
// The fixed copy of the table these cases are driven by.
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

// ---------------------------------------------------------------------------
// Inputs. A case pins the notices it means; every other member of the session
// is inert here, because UF-67 fills one member of `ScreenView` and reads none
// of the others. ⛔ No member count is written down -- a copied number goes
// stale in silence, and the public entry is where the members are declared.
// ---------------------------------------------------------------------------

/**
 * A reason as a raiser hands it over.
 *
 * ⛔ ASCII, and this file's own. The specification settles no vocabulary for
 * `RaisedNotice.reason` (see the STOP note at the head of the file), so these
 * keys stand for nothing published and no case reads one back out.
 * ⚠️ ASCII rather than anything else because a control character in a string
 * key has stopped the whole build before now (04-verification.md, 3.).
 */
const reasonKey = (site: string): string => `uf-67-bench/${site}`

const raisedOf = (
  manner: string,
  reason: string,
  affectedCount: number | null = null,
): RaisedNotice => ({ manner, reason, affectedCount })

const sessionOf = (notices: readonly RaisedNotice[]): ScreenSession => ({
  language: 'ja',
  autosave: { kind: 'saved', at: '2026-08-19T09:00:00Z' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The four members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `selectedGroupIds` is FR-085's set of rows and
  // `selectedResourceUids` FR-099's set of resources (both empty -- none
  // chosen), and `propertiesSubject` is FR-072's remembered subject (`null` --
  // no operation has chosen one yet).
  iconUnderPointer: null,
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
const PENDING_RESTORE = raisedOf(STARTUP_PENDING, reasonKey('pending/restore'))
const PENDING_RECOVERY = raisedOf(STARTUP_PENDING, reasonKey('pending/recovery'))
const PENDING_AGENT_API = raisedOf(STARTUP_PENDING, reasonKey('pending/agent-api'))
const PENDING_WATERMARK = raisedOf(STARTUP_PENDING, reasonKey('pending/watermark-name'))

const REFUSAL = raisedOf('NT-1', reasonKey('refusal/finish-before-start'))
const WARNING = raisedOf('NT-5', reasonKey('warning/assignee-spread'), 3)
const DESTRUCTIVE = raisedOf('NT-3', reasonKey('destructive/cascade-delete'), 12)
const FAILURE = raisedOf('NT-3a', reasonKey('failure/autosave-did-not-finish'))
const AT_LIMIT = raisedOf('NT-6', reasonKey('limit/no-more-pinned-rows'))

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
 * ⚠️ These are INPUTS. What the shell actually raises is the shell's own case
 * to answer (tests/system, and the STOP notes in `frame-loop.ts`); what this
 * file settles is what UF-67 owes once one of them arrives.
 */
const SHELL_HELD = [
  { site: 'a write the document refused', manner: 'NT-1' },
  { site: 'an edit the document refused', manner: 'NT-1' },
  { site: 'a file operation that faulted', manner: 'NT-3a' },
] as const

const SHELL_RAISED = SHELL_HELD.map((held) =>
  raisedOf(held.manner, reasonKey(`shell/${held.site.replace(/ /g, '-')}`)),
)

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
      raisedOf(STARTUP_PENDING, reasonKey(`pending/number-${index}`)),
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
      const one = raisedOf(entry.row, reasonKey(`row/${entry.row}`), 4)
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
    // ⭐ The two are told apart by NT-3's count, which is the only member of the
    // raised half that this bench can vary while the words are owed.
    for (const entry of OTHER_ROWS) {
      const first = raisedOf(entry.row, reasonKey(`row/${entry.row}/first`), 1)
      const second = raisedOf(entry.row, reasonKey(`row/${entry.row}/second`), 2)
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
    const none = raisedOf('NT-3', reasonKey('destructive/reaches-nothing'), 0)
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
    const fading = raisedOf('NT-2', reasonKey('fading/export-finished'))
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
    // ⛔ RED ON PURPOSE. NT-1 (MUST) has the telling say WHICH item and WHY in
    // words, and (MUST NOT) forbids colour or a border alone -- so an empty
    // sentence keeps neither half.
    // ⛔ AND THE KEY IS NOT THOSE WORDS. FR-038 (MUST) holds every word the
    // screen prints in the per-language dictionary, and the case below proves
    // that dictionary has nothing a reason can be looked up under -- so a text
    // that is the caller's own key came from somewhere else. It is also the
    // same string in both display languages, which is the one thing FR-038
    // exists to prevent.
    // ⛔ Do not soften either half to match what the unit returns: the words
    // are owed by `docs/spec/_source/display-words.json`, and paying that debt
    // is what turns this case green.
    // ⭐ Driven by the copy of the table AND by the two sites the shell holds:
    // the rows that owe words are the table's answer, and a refused write and a
    // refused edit are two of them arriving for real.
    const mustBeToldInWords = [
      ...T_037.filter((row) => row.owesWords).map((row) =>
        raisedOf(row.row, reasonKey(`owes-words/${row.row}`)),
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
    // ⛔ RED ON PURPOSE. NT-3a (MUST) has a failure carry what can be done next
    // and (MUST NOT) forbids a telling that says only that something failed;
    // NT-6 sends its own next step to that same row. Both are owed by the
    // dictionary. ⛔ Do not soften this either.
    for (const entry of T_037.filter((row) => row.owesNextStep)) {
      const raised = raisedOf(entry.row, reasonKey(`owes-next-step/${entry.row}`))
      const shown = noticesFromSession(sessionOf([raised]))

      expect((shown[0] as Notice).nextSteps.length, `${entry.row} (MUST)`).toBeGreaterThan(0)
    }
  })

  it('prints no reason key on any surface, gathered or not (FR-038 MUST)', () => {
    // ⛔ RED ON PURPOSE. FR-038 (MUST) keeps every word the screen prints in the
    // per-language dictionary, and the case below proves that dictionary holds
    // no entry a reason can be found under -- so a text still carrying the key
    // is a word from nowhere. ⚠️ NT-4's one surface is where several of them
    // land at once, which is why the gathered surface is walked here too.
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

  it('still owes those words: the dictionary holds no entry a reason can be found under', () => {
    // ⭐ THE TRIPWIRE FOR THE THREE RED CASES ABOVE. FR-038 (MUST) puts every word
    // the screen prints in one dictionary and (MUST NOT) forbids a second, so
    // UF-67 may not mint what is missing and this bench may not accept a minted
    // word. This case names the debt so that the reds cannot be read as a fault
    // of the unit -- and so that they cannot be forgotten: the day the
    // manuscript grows an entry keyed by a reason, this case goes red and the
    // two above are to be run again rather than rewritten.
    const dictionary = JSON.parse(
      readFileSync(
        join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
        'utf8',
      ),
    ) as Record<string, unknown>
    const sections = Object.entries(dictionary).filter(([, value]) => Array.isArray(value))
    const keyedByReason = sections.filter(([, value]) =>
      (value as readonly unknown[]).some(
        (entry) => typeof entry === 'object' && entry !== null && 'reason' in entry,
      ),
    )

    expect(keyedByReason.map(([name]) => name), 'FR-038: no section is keyed by a reason').toEqual(
      [],
    )
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
//             dictionary is empty today (PD-160), so a case that read it and
//             compared could not fail -- see the block above the cases: they
//             hand the unit a dictionary this file BUILDS, whose words differ by
//             row and by language, and ask which one came out
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
 * The three places a requirement says 確認を求める, as of table T-227.
 *
 * ⛔ A roster of INPUTS, never of what may be shown: FR-031 forbids enumerating
 * the places that may ask (MUST NOT), so these cases prove that each of the
 * three comes back UNCHANGED -- which is what a unit that does not know the
 * roster does. `items` is copied from what each requirement asks for by name:
 * FR-032 the row and its WBS descendants, FR-099 the tasks an unassignment
 * reaches, and DI-4 nothing at all.
 */
const NT_7_ASKING_SITES = [
  {
    by: 'FR-032',
    text: 'this row and its WBS descendants would go',
    items: [
      { name: 'foundation work', isShownOnAnotherRow: false },
      { name: 'steel delivery', isShownOnAnotherRow: true },
    ],
  },
  {
    by: 'FR-099',
    text: 'the assignments on these tasks would be released',
    items: [{ name: 'painting', isShownOnAnotherRow: false }],
  },
  {
    by: 'DI-4',
    text: 'the file at that place is not this document and would be written over',
    items: [],
  },
] as const satisfies readonly {
  readonly by: string
  readonly text: string
  readonly items: readonly ConfirmationItem[]
}[]

/** The row of table T-037 a question follows. */
const ASKING = 'NT-7'

/** U-55 of 表 T-103 -- the settled name of the surface a question stands on. */
const U_55_CONFIRMATION = 'Confirmation'

const SRC_SCREEN_RENDERER = join(process.cwd(), 'src', 'adapter', 'screen-renderer')

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(join(SRC_SCREEN_RENDERER, file), 'utf8')) as unknown

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
 * The one dictionary FR-038 (MUST) puts every printed word in, keyed by the row
 * of 表 T-109 -- `_source/display-words.json` as Chapter 6.2 generates it into
 * `src/`. ⛔ No word is written here: 「要求にも表にも語そのものを書いてはならない
 * （MUST NOT）」, and the same reason bars a test from minting one.
 */
const DICTIONARY = readJson('display-words.json') as {
  readonly icons: readonly {
    readonly rowId: string
    readonly label: Readonly<Record<DisplayLanguage, string>>
  }[]
  readonly confirmationMarks: readonly {
    readonly mark: string
    readonly text: Readonly<Record<DisplayLanguage, string>>
  }[]
}

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
  return (word as { readonly text: Readonly<Record<DisplayLanguage, string>> }).text[language]
}

const labelOf = (rowId: string, language: DisplayLanguage): string => {
  const word = DISPLAY_WORDS.find((one) => one.rowId === rowId)
  expect(word, `FR-038: the dictionary has no row for ${rowId}`).toBeDefined()
  return (word as { readonly label: Readonly<Record<DisplayLanguage, string>> }).label[language]
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
    label: labelOf(rowId, language),
  }))

/**
 * The raised half -- what an asker can know. ⛔ It carries no entries: the two
 * answers are 表 T-109's, so an asker naming them would be writing the roster's
 * answer.
 */
const confirmationOf = (
  text: string,
  items: readonly ConfirmationItem[],
  manner: string = ASKING,
): RaisedConfirmation => ({ manner, text, items })

/**
 * What the screen owes for a question that was raised: what was raised, plus
 * the entries 表 T-109 places on the surface it stands on, in that order.
 */
const shownFor = (
  raised: RaisedConfirmation,
  language: DisplayLanguage = 'ja',
): Confirmation => ({
  ...raised,
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
const OP_11_TELLING = raisedOf('NT-5', reasonKey('op-11/rest-of-hand-over-ignored'), 2)

// ---------------------------------------------------------------------------
// A dictionary this file BUILDS, and the way it is put in front of the unit.
// ---------------------------------------------------------------------------

/** FR-038: 「対象は `ja` と `en` の 2 言語とする」. */
const LANGUAGES = ['ja', 'en'] as const satisfies readonly DisplayLanguage[]

/**
 * ⛔ WHY A DICTIONARY IS BUILT AT ALL. Every word in the one FR-038 names is the
 * empty string today (PD-160: the manuscript is unwritten and an agent may not
 * invent a word), so a case that READ that dictionary and held the answer
 * against it would be holding '' against '' -- which is equally true of a unit
 * that keys by the wrong row, of one that never looks at the display language,
 * and of one that writes a constant. Such a case cannot fail, whatever its title
 * says. So these cases hand the unit a dictionary whose every word is DISTINCT
 * by row and by language, and then ask WHICH word came out.
 *
 * ⛔ NO WORD OF EITHER LANGUAGE IS MINTED HERE. FR-038's MUST NOT bars writing
 * the word itself into a requirement or a table, and a test may not settle one
 * either. What is below is not a word: it is the row id and the language spelled
 * back, made to be told apart. Which entry of the dictionary an entry of the
 * screen was read from is the whole of what FR-038 fixes while every word is
 * empty, and it is exactly what a mark can measure.
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

/** The module the unit reads its words from -- Chapter 6.2's generated file. */
const DISPLAY_WORDS_MODULE = '../../src/adapter/screen-renderer/display-words.json'

interface DictionaryShape {
  readonly icons: readonly { readonly rowId: string }[]
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
async function shownWithMarkedDictionary(language: DisplayLanguage): Promise<Confirmation> {
  vi.resetModules()
  vi.doMock(DISPLAY_WORDS_MODULE, () => ({ default: dictionaryOfMarks() }))
  try {
    const fresh = await import('../../src/adapter/screen-renderer/notices')
    const asked = confirmationOf('two tasks would go', [])
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

describe('UF-67 -- NT-7 (MUST): 続けてよいかを問う', () => {
  it('GIVEN no question was raised WHEN the view is filled THEN there is none to answer (the empty case)', () => {
    expect(confirmationFromSession(sessionAsking(null))).toBeNull()
  })

  it('GIVEN a question was raised WHEN the view is filled THEN it comes back exactly as it was raised', () => {
    // NT-7 asks for 何が起きるか in words and for the names of what would go,
    // and neither can be known anywhere but where the question is raised.
    const asked = confirmationOf('twelve rows would go', [
      { name: 'foundation work', isShownOnAnotherRow: false },
    ])

    expect(confirmationFromSession(sessionAsking(asked))).toEqual(shownFor(asked))
  })

  it('GIVEN each place a requirement asks WHEN the view is filled THEN each comes back untouched (one case walks the roster; FR-031 MUST NOT)', () => {
    // FR-031 no longer counts the places that may ask, so filtering by WHICH
    // requirement raised the question is exactly what its MUST NOT bars.
    for (const site of NT_7_ASKING_SITES) {
      const asked = confirmationOf(site.text, site.items)

      expect(confirmationFromSession(sessionAsking(asked)), site.by).toEqual(shownFor(asked))
    }
  })

  it('GIVEN DI-4 question, which takes nothing with it WHEN the view is filled THEN it is still asked (empty items is an answer, not a missing one)', () => {
    // 表 T-227 DI-4:「消えるものの名前を挙げる義務はここには無い」。Dropping a
    // question for having no names would silence the one MUST of that table.
    const asked = confirmationOf('that file is not this document', [])

    const shown = confirmationFromSession(sessionAsking(asked))

    expect(shown).not.toBeNull()
    expect((shown as Confirmation).items).toEqual([])
    expect((shown as Confirmation).text).toBe('that file is not this document')
  })

  it('GIVEN a thing that carries no name WHEN the question is shown THEN the null name survives rather than the item being dropped', () => {
    // `Task.name` is optional in the document, so a nameless task has to stay
    // describable. A count may not stand in for the names (FR-032, FR-099).
    const asked = confirmationOf('two tasks would go', [
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
    const asked = confirmationOf('twelve tasks would go', many)

    expect((confirmationFromSession(sessionAsking(asked)) as Confirmation).items).toEqual(many)
  })

  it('GIVEN a question raised WHEN it is shown THEN the row of table T-037 it follows travels with it', () => {
    // `Confirmation.manner` is the join to the table, carried rather than
    // assumed -- the same move `Notice.manner` makes for NT-5 against NT-1.
    const asked = confirmationOf('that file would be written over', [])

    expect((confirmationFromSession(sessionAsking(asked)) as Confirmation).manner).toBe(ASKING)
  })

  it('GIVEN notices raised beside the question WHEN both members are filled THEN neither becomes the other (a question is not a notice)', () => {
    // NT-7 stops until it is answered and NT-1 .. NT-6 do not, so a question
    // wearing a notice's shape would let a caller show one nobody can answer.
    const asked = confirmationOf('that file would be written over', [])
    const session = sessionAsking(asked, [REFUSAL, PENDING_RESTORE, WARNING])

    const shown = noticesFromSession(session)

    expect(shown.map((notice) => notice.manner).sort()).toEqual(['NT-1', 'NT-4', 'NT-5'])
    expect(shown.some((notice) => notice.text === asked.text)).toBe(false)
    expect(confirmationFromSession(session)).toEqual(shownFor(asked))
  })

  it('GIVEN pending startup items being gathered WHEN a question stands beside them THEN NT-4 gathering does not reach it', () => {
    // NT-4 (MUST) is the only row that speaks about several at once, and it is
    // about notices. Nothing here gathers or orders questions.
    const asked = confirmationOf('a newer autosave would be discarded', [
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
    const asked = confirmationOf('that file would be written over', [])

    const shown = confirmationFromSession(sessionAsking(asked)) as Confirmation

    expect(shown.entries.map((entry) => entry.icon)).toEqual(T_109_ON_CONFIRMATION)
  })

  it('GIVEN the entries of that surface WHEN they are shown THEN each can be pressed and none is a toggle that is on', () => {
    // NT-7 (MUST): 「続けるか取りやめるかを選ばせること」-- an answer that could
    // not be given would leave the question unanswerable, and FR-029 (MUST)
    // keeps the faint drawing for what cannot be used. 表 T-109 marks a toggle
    // with 「出す・しまう」; these two are answers, given once, with no off.
    const shown = confirmationFromSession(
      sessionAsking(confirmationOf('twelve rows would go', [])),
    ) as Confirmation

    for (const entry of shown.entries) {
      expect(entry.isEnabled, `FR-029: ${entry.icon}`).toBe(true)
      expect(entry.isPressed, `${entry.icon} is not a toggle`).toBe(false)
    }
  })

  it('GIVEN the dictionary on disk WHEN the entries are shown THEN each carries the word it holds for that row and language, whatever it is', () => {
    // FR-038 (MUST): 「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと」.
    // ⚠️ WHAT THIS CASE CAN AND CANNOT CATCH. It reads the generated dictionary
    // and every word in it is '' (PD-160), so while the manuscript is unwritten
    // the two languages have the same answer and a unit that wrote a constant
    // '' would pass. It is kept because it is the only case that watches the
    // REAL file -- the moment a word is written into the manuscript it starts
    // telling. The two cases that follow are the ones with teeth: they hand the
    // unit a dictionary this file built, so they can fail today.
    for (const language of LANGUAGES) {
      const session: ScreenSession = {
        ...sessionAsking(confirmationOf('two tasks would go', [])),
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
    const asked = confirmationOf('a newer autosave would be discarded', [])
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
    const none = raisedOf('NT-5', reasonKey('op-11/nothing-left-behind'), 0)
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
    const asked = confirmationOf('two tasks would go', [
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
    const session = sessionAsking(confirmationOf('that file would be written over', []), [REFUSAL])

    expect(confirmationFromSession(session)).toEqual(confirmationFromSession(session))
  })
})


describe('UF-67 -- FR-038: the words are READ from the dictionary, never minted', () => {
  it('answers differently when the dictionary is different, because that is where the words are', async () => {
    // ⛔ RED ON PURPOSE, and the only case here that can tell a word READ
    // from a word MINTED. FR-038 (MUST) holds every word the screen prints in
    // the per-language dictionary and (MUST NOT) forbids a second store of
    // them; so if one and the same session is answered identically with the
    // generated dictionary and with one whose every word has been replaced,
    // then no word of that answer came from a dictionary at all.
    // ⚠️ It is red for the same one debt as the three above: the
    // dictionary has no entry a reason can be found under, so replacing its
    // words changes nothing. ⛔ Do not weaken it into a case that a unit
    // writing its own sentence would pass -- that unit is exactly what FR-038
    // forbids, and this is the case that names it.
    const asGenerated = noticesFromSession(sessionOf(SHELL_RAISED)).map((one) => one.text)
    const asMarked = (await noticesWithMarkedDictionary(SHELL_RAISED)).map((one) => one.text)

    expect(asMarked, 'FR-038 (MUST): the words follow the dictionary').not.toEqual(asGenerated)
  })
})
