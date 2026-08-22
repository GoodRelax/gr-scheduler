// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-67   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// UF-67 fills two members of ScreenView -- `notices` and `confirmation` -- and
// reads none of the others. FR-076 (MUST) makes table T-037 the manner of every
// telling, and the signatures published here are the ones the "nine unit
// contracts" section of screen-renderer.ts fixes.
//
// ⭐ TWO MEMBERS, ONE TABLE. The UF-67 row of table T-075 reads 「知らせと確認
// （FR-076。作法は 表 T-037）」: NT-1 .. NT-6 are manners of TELLING and NT-7 is
// the manner of ASKING, and both are rows of the one table this unit answers to.
// ⛔ A confirmation is not a notice -- it stops until it is answered -- so it is
// its own member rather than a notice wearing another manner.
//
// ⭐ WHAT IS RAISED IS NOT WHAT IS SHOWN. `ScreenSession.notices` is what has
// been raised; the return value is what is showing and in what order. `Notice`
// stands on both sides, so for the notices all this unit can do is choose, order
// and gather -- never compose.
//
// ⭐ ONE ROW OF TABLE T-037 IS THE WHOLE UNIT: NT-4. Every other row binds
// whoever RAISES the notice -- the words NT-1 asks for (MUST; colour or a border
// alone is forbidden, MUST NOT), the next step NT-3a asks for (MUST), the count
// NT-3 asks for, the look NT-5 asks to keep apart from NT-1's refusal (MUST),
// the "what can be done now" NT-6 asks for. Not one of them can be decided from
// a Notice that already exists, and this unit may not invent what a raiser left
// out. NT-4 is the only row that speaks about SEVERAL notices at once, which is
// why it is the only row with work to do here.
//
// ⭐ HOW A PENDING-AT-STARTUP NOTICE IS RECOGNISED. `Notice` carries no mark of
// when it was raised, and none is needed: `manner` is the row of table T-037 the
// notice follows, and NT-4 IS the row for what is pending at startup. So the
// manner is the join, and a raiser that means FR-060's offer, FR-026's recovery,
// FR-065's enabling or FR-086's watermark name says NT-4.
//
// ⛔ NO WORDS ARE WRITTEN HERE. `Notice.text` and `RaisedConfirmation.text`
// arrive in the display language already, because both name the thing at hand
// and only their raiser knows it. The gathering NT-4 asks for may join texts and
// must keep them all; it may not write so much as a heading over them. ⚠️ The
// two answers of NT-7 are the one exception and are still not written here: they
// are READ, out of the dictionary FR-038 (MUST) makes the one store of
// translated strings, keyed by their row of table T-109.
//
// ⭐ ONE MEMBER IS COMPOSED AND THE OTHER IS NOT. The preamble above table T-109
// fixes its 面 column as table T-103's settled names, so which entries stand on
// U-55 `Confirmation` is that table's answer and not the asker's -- which is why
// `confirmationFromSession` widens what it is given while `noticesFromSession`
// only chooses, orders and gathers.
//
// ⚠️ NOTHING IS DROPPED FOR HAVING RUN OUT OF TIME. NT-2 governs a notice that
// goes away with time, but FT-4 of table T-078 leaves the reading of the clock
// to the shell, and CS-1 of table T-066 keeps it away from a `pure` unit. A
// notice whose time is up is one that is no longer raised.
//
// ⛔ Five STOP notes below. Four say what table T-037 leaves open; the fifth
// says that nothing in this build raises a question at all.

import type {
  CommandItem,
  Confirmation,
  DisplayLanguage,
  IconId,
  Notice,
  ScreenSession,
} from './screen-renderer'
import iconRoster from './icon-roster.json'
import displayWords from './display-words.json'

/**
 * The manner NT-4 gathers. ⚠️ A row id appears here as a VALUE, not as a copy of
 * a rule: `Notice.manner` carries row ids as its data, so this is the join to
 * table T-037, and none of that row's prose or numbers is repeated in this file.
 */
const STARTUP_PENDING_MANNER = 'NT-4'

/**
 * U-55 of table T-103, the surface NT-7 puts a question on.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), and the same
 * spelling `icon-roster.json` carries in its 面 column -- which is what makes it
 * the join, not a label. ⛔ Nothing here mints a name for a surface.
 */
const CONFIRMATION_SURFACE = 'Confirmation'

/**
 * The entries table T-109 places on U-55, in that table's own print order.
 *
 * ⭐ ONE PASS OVER THE GENERATED ROSTER rather than a list written here, so the
 * print order of table T-109 is the order of the two without this file knowing
 * what that order is, and a row moved in the specification moves here (rule 03
 * section 1). FR-029 makes both the roster and the placement follow that table
 * (MUST). ⛔ Read once, at load, because a description is built every frame and
 * rule 05 of docs/development-rules forbids a scan on that path (NFR-013).
 *
 * ⚠️ Reading `iconRoster` does not make this unit `semi-pure-a`: it is a module
 * constant compiled into the program, not external state read while running.
 * Table T-075 fixes UF-67 as `pure`.
 */
const CONFIRMATION_ANSWER_ROWS: readonly IconId[] = iconRoster.icons
  .filter((row) => row.surfaces.includes(CONFIRMATION_SURFACE))
  .map((row) => row.rowId)

/**
 * The words of table T-109's rows, keyed by the row id -- the same map
 * `open-modals.ts` and `app-header-items.ts` build, from the same dictionary.
 *
 * ⚠️ THE `confirmation` SECTION OF THAT DICTIONARY IS NOT READ. It keys the two
 * answers on `proceed` and `cancel`, and nothing in the specification joins
 * those two keys to IC-69 and IC-70 -- table T-109's 何の入口か column is prose,
 * and the row id is the only join it admits. ⛔ Writing that mapping out here
 * would be the copy rule 03 section 1 forbids, so the entries are labelled the
 * way every other entry on the screen is.
 */
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

/**
 * What an entry says while the dictionary holds no word for it.
 *
 * ⛔ NOT "SAY NOTHING". An empty cell of `display-words.json` says that no word
 * has been SETTLED yet, which is what PD-160 records.
 *
 * @provisional PD-160
 */
const NO_WORDS = ''

/**
 * The accessible name of one answer, in the display language (FR-038).
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`, for the
 * reason `open-modals.ts` gives at the same line: those read "the dictionary
 * holds no word yet" and "the word is the empty string" as one thing, and
 * PD-160 is precisely the difference.
 *
 * @provisional PD-160
 * @purity pure
 */
function answerLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * IC-69 and IC-70 as the surface shows them.
 *
 * ⭐ NEITHER CAN BE SPENT AND NEITHER IS A TOGGLE. NT-7 (MUST) makes choosing
 * between going on and calling it off the whole of this surface, so there is no
 * state in which one of the two may not be pressed -- FR-029's faint-and-
 * explained state never applies -- and neither stays down: a toggle is one entry
 * with two states, and this is two entries with one choice.
 *
 * @purity pure
 */
function confirmationAnswers(language: DisplayLanguage): readonly CommandItem[] {
  return CONFIRMATION_ANSWER_ROWS.map((icon) => ({
    icon,
    isEnabled: true,
    isPressed: false,
    label: answerLabel(icon, language),
  }))
}

/**
 * What stands between two gathered texts.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how several texts are written on
 * the one surface NT-4 requires. Looked in table T-037 (NT-4 fixes that they are
 * gathered and that all of them go, and fixes nothing about the writing), in
 * FR-076, in `_assets/tbl-settings.md` (no row for a notice anywhere -- table
 * T-203 and table T-206 both), and in table T-077, which only says the gathered
 * surface stands outside the boot order. Chose the smallest joiner that cannot
 * be wrong: it adds no word in either display language (FR-038), it drops none
 * of the texts, and what a line break looks like stays the surface's to decide.
 */
const GATHERED_TEXT_SEPARATOR = '\n'

/**
 * ⚠️ Reads `manner` and nothing else: see the header on why that is the join.
 *
 * @purity pure
 */
function isStartupPending(notice: Notice): boolean {
  return notice.manner === STARTUP_PENDING_MANNER
}

/**
 * The several pending items of NT-4 as the one surface it requires, in the order
 * they were raised.
 *
 * ⛔ Every text and every next step goes in: NT-4 says the gathering is of all of
 * them, and NT-3a (MUST NOT) would be broken if a failure's next step were lost
 * on the way in.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what count the gathered surface
 * carries when more than one of the pending items carries one. Looked in table
 * T-037 (NT-3 asks a DESTRUCTIVE result for the number of things it reaches, and
 * a notice that follows NT-3 is not gathered at all; NT-4 asks for no count) and
 * in FR-076. Chose none: adding up the counts of unlike subjects would put a
 * number on the screen that no row defines, and `Notice.affectedCount` is
 * documented as `null` exactly where the row asks for no count. ⚠️ This is why
 * a lone pending item is passed through untouched rather than rebuilt here --
 * with nothing to gather, its own count has no reason to go.
 *
 * @purity pure
 */
function gatheredStartupNotice(pending: readonly Notice[]): Notice {
  return {
    manner: STARTUP_PENDING_MANNER,
    text: pending.map((notice) => notice.text).join(GATHERED_TEXT_SEPARATOR),
    nextSteps: pending.flatMap((notice) => notice.nextSteps),
    affectedCount: null,
  }
}

/**
 * Which of the raised notices are shown, and in what order.
 *
 * ⭐ All of them are shown. Nothing in table T-037 or FR-076 withholds a notice
 * that has been raised, and a `pure` unit has no clock with which to retire one
 * (NT-2 is the shell's, by FT-4 of table T-078). The one change this unit makes
 * is NT-4's (MUST): what is pending at startup is gathered into ONE surface
 * instead of being shown one after another.
 *
 * ⛔ ONLY NT-4's OWN NOTICES ARE GATHERED. Merging any other row would break two
 * MUSTs at once: NT-1 has to say WHICH item is wrong, which a joined text stops
 * doing, and NT-5 has to stay distinguishable from NT-1's refusal, which it
 * cannot be once it is wearing another row's manner.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: the order several shown notices
 * stand in. Looked in table T-037 (no row ranks one manner above another; NT-4
 * is the only row that mentions several notices, and what it forbids is showing
 * the startup ones "one after another on separate surfaces"), in FR-076, and in
 * table T-077, whose note puts the gathered surface outside the boot order.
 * ⚠️ Ordering by table T-037's own printed order was rejected for a second
 * reason: that would need the roster of its row ids typed into this file, and
 * nothing generates that table into `src/` the way `settings.json` is generated,
 * so the copy would go stale in silence. Chose the order they were raised in,
 * which is defensible from NT-4 because collapsing its run in place is the only
 * re-ordering any row of the table asks for.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what becomes of a failure raised
 * with no next step. NT-3a (MUST NOT) forbids issuing one, and looking through
 * table T-037 and FR-076 finds no rule for the one that arrives here anyway.
 * Chose to carry it: this unit cannot make a next step without minting words
 * FR-038 places nowhere, and dropping the notice would leave the failure untold,
 * which is further from what NT-3a asks for than telling it bare. ⚠️ The row it
 * belongs to is the raiser's to get right.
 *
 * @purity pure
 */
export function noticesFromSession(session: ScreenSession): readonly Notice[] {
  const startupPending = session.notices.filter(isStartupPending)

  // One pending item is already the one surface NT-4 asks for, and none needs
  // nothing done at all.
  if (startupPending.length < 2) return session.notices

  const gathered = gatheredStartupNotice(startupPending)
  const shown: Notice[] = []
  let isGatheredShown = false

  for (const notice of session.notices) {
    if (!isStartupPending(notice)) {
      shown.push(notice)
      continue
    }
    if (isGatheredShown) continue
    // Where the first of them was raised: see the STOP note on the order.
    shown.push(gathered)
    isGatheredShown = true
  }

  return shown
}

/**
 * The question waiting to be answered, on the surface it stands on, or `null`
 * while none is (NT-7, U-55 of table T-103).
 *
 * ⭐ THE RAISED HALF IS CARRIED AND NEVER COMPOSED, for the same reason a notice
 * is: everything NT-7 (MUST) asks for in words -- what is about to happen, and
 * the names of what would go -- can only be known where the question is raised.
 * FR-032 asks for the names of the tasks a row takes with it and FR-099 for the
 * names of the tasks an unassignment reaches; neither is derivable from a
 * `RaisedConfirmation` that already exists.
 *
 * ⭐ THE TWO ANSWERS ARE COMPOSED, AND ONLY THEY. The preamble above table T-109
 * fixes its 面 column as table T-103's settled names, so which entries stand on
 * U-55 is that table's answer -- read out of the generated roster, never asked
 * of the raiser and never written out here.
 *
 * ⛔ AT MOST ONE. NT-4 (MUST) is the only row of table T-037 that speaks about
 * several at once and it is about notices, so nothing here gathers or orders
 * questions -- and a second question raised over the first would be one nothing
 * in the table says how to show.
 *
 * ⚠️ NOT DROPPED FOR BEING EMPTY. `Confirmation.items` may be empty, and an
 * empty list is an answer rather than a missing one. NT-7 asks for names only
 * where something goes, and DI-4 of table T-227 -- the question asked before
 * writing over a file that is not this document -- takes nothing with it: the
 * file that would go is the other side's, and DI-4 says in as many words that
 * the naming clause does not reach it. ⛔ Dropping a question for having no
 * items would silence the one row of table T-227 that is a MUST.
 *
 * ⚠️ FR-031 no longer counts the places that may ask; it states the class they
 * belong to (losing what undoing cannot give back) and forbids enumerating them
 * (MUST NOT). ⭐ So nothing here may be filtered by WHICH requirement raised the
 * question: a roster of the admitted sites is exactly what that MUST NOT bars,
 * and NT-7's own limit binds the raiser, not this unit.
 *
 * STOP -- ⛔ NOTHING RAISES ONE. `ScreenSession.confirmation` is `null` in every
 * frame this build runs: `frame-loop.ts` says so in as many words, and no member
 * of table T-064 puts a question there. So the surface below is described and
 * never seen, and the three places a requirement asks -- FR-032's row with WBS
 * descendants, FR-099's unassignment, DI-4 of table T-227 -- each still run their
 * operation unasked, which is what breaks those MUSTs. ⚠️ WHAT IS MISSING IS THE
 * RAISER, NOT THE ROUTE: table T-109 now places IC-69 and IC-70 on U-55, so a
 * press on either comes back as `ScreenPart.entry` (IF-9) the way a press on any
 * other entry does. Searched: table T-037, table T-064 (PI-8, PI-9, PI-18,
 * PI-37), table T-109, table T-227, FR-031, FR-032, FR-099, `frame-loop.ts`.
 *
 * @purity pure
 */
export function confirmationFromSession(session: ScreenSession): Confirmation | null {
  const raised = session.confirmation
  if (raised === null) return null
  return { ...raised, entries: confirmationAnswers(session.language) }
}
