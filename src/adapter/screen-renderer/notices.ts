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
// ⭐ WHAT IS RAISED IS NOT WHAT IS SHOWN. `ScreenSession.notices` holds
// `RaisedNotice` -- the manner and the reason, and no words at all; the return
// value is what is showing, in what order and in what words. So this unit
// chooses, orders, gathers AND reads the words, and mints none of them.
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
// ⛔ NO WORDS ARE WRITTEN HERE, and none are asked of a raiser either. FR-038
// (MUST) makes one generated dictionary the whole store of translated strings,
// and this component is where it lives -- so everything printed is READ out of
// it: what each row of table T-037 is CALLED keyed by that row, the two answers
// of NT-7 keyed by their row of table T-109, FR-032's mark by the manuscript's
// own key (FR-038 (MUST NOT) keeps the words out of every requirement and every
// table, so the mark has no row to be keyed by).
//
// ⛔ ONE OF THE TWO THINGS A RAISER HANDS OVER CAN BE LOOKED UP AND THE OTHER
// CANNOT, and that is the whole shape of what is still missing here. The manner
// is a row of table T-037 and the dictionary has a section keyed on those rows,
// so it is read. The REASON is a key of the raiser's own, and the dictionary has
// no section keyed on one -- so NT-1's words (MUST) and NT-3a's next step (MUST)
// have nothing to be read out of. The two STOP notes on `toldNotice` say what is
// owed and what stands in meanwhile. ⛔ Writing either sentence here would be the
// second store of translated strings FR-038 forbids (MUST NOT).
// ⚠️ `RaisedConfirmation.text` is the one text that still arrives written,
// because NT-7 (MUST) has it name what is about to happen and the names of what
// would go -- neither of which any dictionary can hold.
//
// ⭐ BOTH MEMBERS ARE COMPOSED. The preamble above table T-109 fixes its 面
// column as table T-103's settled names, so which entries stand on U-55
// `Confirmation` is that table's answer and not the asker's; and FR-038 puts
// the words on this side of the seam rather than the raiser's. So each of the
// two exported functions WIDENS what it is given.
//
// ⭐ WHAT THE SHELL HANDS OVER, per notice: the row of table T-037 it is
// following and the reason. Nothing else is receivable -- FR-028 (MUST) makes a
// refusal a value the caller gets back rather than an exception, so the side
// that received the value is the side that knows which reason happened, and
// `file-store.ts` states the same boundary from the other end.
//
// ⚠️ NOTHING IS DROPPED FOR HAVING RUN OUT OF TIME. NT-2 governs a notice that
// goes away with time, but FT-4 of table T-078 leaves the reading of the clock
// to the shell, and CS-1 of table T-066 keeps it away from a `pure` unit. A
// notice whose time is up is one that is no longer raised.
//
// ⛔ Six STOP notes below. Three say what table T-037 leaves open, two say what
// FR-038's dictionary does not hold yet, and the sixth says that nothing in this
// build raises a question at all.

import type {
  CommandItem,
  Confirmation,
  DisplayLanguage,
  IconId,
  Notice,
  RaisedNotice,
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
 * The words of table T-037's rows, keyed by the row id.
 *
 * ⭐ THE ROW ID IS THE JOIN, which is what makes this section readable at all:
 * `Notice.manner` and `RaisedConfirmation.manner` already carry a row of table
 * T-037, so nothing has to be minted or matched by hand to ask on it. ⚠️ That is
 * exactly what the `confirmation` section above lacks.
 *
 * ⭐ A `Map` rather than a scan, for the reason `WORDS_BY_ROW` is one: a
 * description is built every frame and rule 05 of docs/development-rules forbids
 * a linear search on that path (NFR-013).
 */
const MANNERS_BY_ROW = new Map(displayWords.notices.map((entry) => [entry.rowId, entry]))

/**
 * The key the `confirmationMarks` section holds FR-032's mark under.
 *
 * ⭐ A KEY OF THE DICTIONARY AND NOT A ROW OF ANY TABLE. FR-038 (MUST NOT)
 * forbids the words themselves to be written into a requirement or a table, so
 * this mark has no row to be joined by -- the manuscript's own key is the join,
 * and it is spelled here exactly as the manuscript spells it (rule 03 section
 * 1). ⚠️ Without the `is` that `ConfirmationItem.isShownOnAnotherRow` carries:
 * the key names a word, and R2.1 keeps that prefix for booleans.
 */
const SHOWN_ON_ANOTHER_ROW = 'shownOnAnotherRow'

/**
 * The words of the `confirmationMarks` section, keyed by the mark.
 *
 * ⭐ A `Map` rather than a scan, for the reason `WORDS_BY_ROW` is one: a
 * description is built every frame and rule 05 of docs/development-rules
 * forbids a linear search on that path (NFR-013).
 */
const MARKS_BY_KEY = new Map(displayWords.confirmationMarks.map((entry) => [entry.mark, entry]))

/**
 * What an entry says while the dictionary holds no word for it.
 *
 * ⛔ NOT "SAY NOTHING". An empty cell of `display-words.json` says that no word
 * has been SETTLED yet, which is what PD-160 records.
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
 * @purity pure
 */
function answerLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * What one row of table T-037 is called, in the display language (FR-038).
 *
 * ⭐ THE ONE THING THIS UNIT COULD START READING. `RaisedNotice` and
 * `RaisedConfirmation` each carry the row and no words, and this section is the
 * only one of the dictionary's eight that is keyed on that row -- so it is the
 * only one a raised thing can be looked up in. ⚠️ The two STOP notes on
 * `toldNotice` say what the raiser's OTHER value, the reason, still cannot be
 * looked up in.
 *
 * ⛔ THE FALLBACK IS `NO_WORDS`, WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`,
 * for the reason `answerLabel` gives above. ⚠️ A row the dictionary does not hold
 * at all is a second condition, answered separately although with the same
 * stand-in: it cannot happen while `npm run gen:check` passes, because the
 * generator builds its roster from table T-037 every run, so what is guarded is
 * a generated file edited by hand.
 *
 * @purity pure
 */
function mannerText(manner: string, language: DisplayLanguage): string {
  const word = MANNERS_BY_ROW.get(manner)?.manner[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * The mark FR-032 (MUST) asks for, in the display language (FR-038).
 *
 * ⭐ WHY THERE IS A WORD TO READ AT ALL. FR-032 requires a `Task` that goes with
 * the row being deleted but is DRAWN on another row -- HM-10 of table T-015a is
 * what puts it there -- to be shown as such on the question NT-7 raises, and
 * PD-175 settled that the showing is a WORD. ⛔ Nothing here may raise a shape
 * instead: table T-109 is the whole of the icons and RC-13 of table T-026 makes
 * a new one the user's decision.
 *
 * ⛔ THE FALLBACK IS `NO_WORDS`, WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`,
 * for the reason `answerLabel` gives just above: those read "the dictionary
 * holds no word yet" and "the word is the empty string" as one thing, and
 * PD-160 is precisely the difference. ⚠️ No substitute is invented for the empty
 * case -- U-55 is a surface of words and there is nothing else here to say.
 *
 * @purity pure
 */
function shownOnAnotherRowMark(language: DisplayLanguage): string {
  const word = MARKS_BY_KEY.get(SHOWN_ON_ANOTHER_ROW)?.text[language]
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
 * What a failure says can be done next while the dictionary holds no next step
 * for its reason.
 *
 * ⛔ NOT "NOTHING CAN BE DONE". It says that no next step has been SETTLED yet,
 * which is the same thing an empty cell of `display-words.json` says (PD-160).
 */
const NO_NEXT_STEPS: readonly string[] = []

/**
 * ⚠️ Reads `manner` and nothing else: see the header on why that is the join.
 *
 * @purity pure
 */
function isStartupPending(notice: Notice): boolean {
  return notice.manner === STARTUP_PENDING_MANNER
}

/**
 * One raised notice as the screen tells it -- the half of UF-67's work that is
 * reading rather than choosing.
 *
 * STOP -- ⛔ THE DICTIONARY HOLDS NO WORD FOR A REASON. `display-words.json`
 * has eight sections -- one per row of table T-109, the palette groups, the
 * surfaces table T-103 has named, the manner of every row of table T-037, the
 * two answers of NT-7, FR-032's mark, FR-072's panel headings and one per row of
 * table T-023 -- and none keyed on why a write was turned away or why a file
 * operation faulted, which is what NT-1 (MUST) asks to be said. ⭐ The manner
 * beside it IS read now, because that section is keyed on the row this notice
 * already carries; the reason is the half with nowhere to be looked up. ⛔ A
 * sentence written here would be the second store of translated strings FR-038
 * forbids (MUST NOT), so the key itself is carried through to the screen: it is
 * characters, which is the whole of what NT-1 (MUST NOT) refuses to let colour
 * or a border stand in for, and it names exactly one thing on the raiser's
 * side. ⚠️ The same stand-in the help makes for a table row it has no word for.
 * ⛔ It is NOT in the display language, and cannot be until the dictionary holds
 * the rows -- see the report for which ones it owes.
 *
 * STOP -- ⛔ THE DICTIONARY HOLDS NO NEXT STEP EITHER, so every failure is told
 * without the one NT-3a makes mandatory (MUST). ⚠️ This is the note that used to
 * ask what becomes of a failure RAISED with no next step: the raiser no longer
 * carries one, so the question is settled and the hole has moved to the
 * dictionary. Chose to tell it bare rather than to withhold it, for the reason
 * that note gave -- a failure nobody is told about is further from what NT-3a
 * asks for than one told without its next step -- and `file-store.ts` names the
 * side that can decide the step: the reasons are told apart by what can be done
 * next, so one dictionary row per reason is what is owed.
 * ⚠️ `cancelled` is owed nothing and is not a failure at all (IF-3 keeps it
 * apart precisely so that it is not reported), so it is the raiser's not to
 * raise; nothing here can tell it from the reasons that are owed a step.
 * ⭐ WHICH KEYS, EXACTLY. `DocumentFileFaultReason` in `file-gateway.ts` is the
 * whole vocabulary a raiser can hand over today -- the four of
 * `FileStoreFaultReason` plus two of its own -- so the rows owed are
 * `permissionLost`, `noOpenedFile`, `unavailable`, `notUtf8` and
 * `notAnOverwriteTarget`, each needing BOTH the words NT-1 asks for and the next
 * step NT-3a asks for, and `cancelled` needing neither. ⛔ Nothing here may add
 * them: `_source/display-words.json` is the manuscript and this file is not it.
 * ⚠️ The roster grows with that type and not with this one, so a reason added
 * there arrives here with no word and no next step and nothing says so.
 *
 * @purity pure
 */
function toldNotice(raised: RaisedNotice, language: DisplayLanguage): Notice {
  return {
    manner: raised.manner,
    // ⭐ The half of the reading that IS possible: the row the raiser carries is
    // a key of the dictionary, unlike the reason beside it.
    mannerText: mannerText(raised.manner, language),
    text: raised.reason,
    nextSteps: NO_NEXT_STEPS,
    affectedCount: raised.affectedCount,
  }
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
function gatheredStartupNotice(pending: readonly Notice[], language: DisplayLanguage): Notice {
  return {
    manner: STARTUP_PENDING_MANNER,
    // ⚠️ Read again rather than taken off the first of them: every notice
    // gathered here follows NT-4 already, so the two are the same word today,
    // and reading the row this notice declares keeps them the same word if the
    // filter above ever admits a second manner.
    mannerText: mannerText(STARTUP_PENDING_MANNER, language),
    text: pending.map((notice) => notice.text).join(GATHERED_TEXT_SEPARATOR),
    nextSteps: pending.flatMap((notice) => notice.nextSteps),
    affectedCount: null,
  }
}

/**
 * Which of the raised notices are shown, in what order, and in what words.
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
 * ⭐ THE WORDS ARE READ BEFORE THE GATHERING, not after: NT-4 joins the TEXTS of
 * what is pending, so each one has to be a told notice before there is anything
 * to join. `toldNotice` carries the two STOP notes that says what the dictionary
 * still owes each of them.
 *
 * @purity pure
 */
export function noticesFromSession(session: ScreenSession): readonly Notice[] {
  const told = session.notices.map((raised) => toldNotice(raised, session.language))
  const startupPending = told.filter(isStartupPending)

  // One pending item is already the one surface NT-4 asks for, and none needs
  // nothing done at all.
  if (startupPending.length < 2) return told

  const gathered = gatheredStartupNotice(startupPending, session.language)
  const shown: Notice[] = []
  let isGatheredShown = false

  for (const notice of told) {
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
 * ⭐ THE TWO ANSWERS ARE COMPOSED, AND SO IS FR-032's MARK. The preamble above
 * table T-109 fixes its 面 column as table T-103's settled names, so which
 * entries stand on U-55 is that table's answer -- read out of the generated
 * roster, never asked of the raiser and never written out here. The mark joins
 * them for the same reason: WHICH items wear it is the raiser's to know
 * (`ConfirmationItem.isShownOnAnotherRow`), and what it is CALLED is the
 * dictionary's (PD-175). ⛔ Neither is a word this file writes.
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
 * STOP -- ⛔ ONE OF THE THREE ASKING SITES STILL DOES NOT ASK. Two of them do
 * now: `frame-loop.ts` puts FR-032's row deletion and DI-4 of table T-227 into
 * `ScreenSession.confirmation` and spends the answer on IC-69 / IC-70, so the
 * surface below is described and seen. FR-099's unassignment is the one left:
 * table T-109 does place IC-66 on U-49, so there IS an entrance to press, and
 * what is missing is the same thing `frame-loop.ts` supplies for the other two
 * -- a raiser that puts the question up and spends the answer. Until then that
 * deletion runs unasked, which is what breaks that MUST. Searched: table T-037,
 * table T-064 (PI-8, PI-9,
 * PI-18, PI-37), table T-109, table T-227, FR-031, FR-032, FR-099,
 * `frame-loop.ts`.
 *
 * @purity pure
 */
export function confirmationFromSession(session: ScreenSession): Confirmation | null {
  const raised = session.confirmation
  if (raised === null) return null
  return {
    ...raised,
    // ⭐ WHERE THIS SURFACE'S NAME COMES FROM. Table T-103 names U-55, but the
    // `surfaces` section of the dictionary holds no heading for it; the row the
    // raiser carries is NT-7 and the `notices` section is keyed on exactly that.
    // ⚠️ Read off `raised.manner` and never off the literal NT-7: the raiser
    // declares which row it is following, and a second place deciding it would
    // be a second answer.
    mannerText: mannerText(raised.manner, session.language),
    entries: confirmationAnswers(session.language),
    // Carried whether or not any item wears it: the surface is drawn from this
    // one value, and reading the dictionary per item would be the same lookup
    // repeated (NFR-013).
    shownOnAnotherRowMark: shownOnAnotherRowMark(session.language),
  }
}
