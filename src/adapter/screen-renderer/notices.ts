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
// ⭐ TWO MEMBERS, ONE TABLE. The UF-67 row of table T-075 reads 「通知と確認
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
// ⭐ WHICH ROW APPLIES IS THE RAISER'S; WHAT IT SAYS IS THIS UNIT'S. The count
// NT-3 asks for, the look NT-5 asks to keep apart from NT-1's refusal (MUST) and
// which row of table T-037 is being followed at all cannot be decided from a
// Notice that already exists, so all three arrive already chosen. What NT-1 asks
// to be said in words (MUST; colour or a border alone is forbidden, MUST NOT),
// the next step NT-3a asks for (MUST) and the "what can be done now" NT-6 sends
// to that same row are READ here instead, out of the row of table T-233 the
// raiser hands over as its reason. ⛔ Nothing is invented either way: a row is
// the join on both halves. NT-4 is the only row that speaks about SEVERAL
// notices at once, which is why it is the only row that re-orders anything here.
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
// it: what each row of table T-037 is CALLED keyed by that row, the text and the
// next step of each row of table T-233 keyed by that row, the sentence of each
// row of table T-234 keyed by that row, and NT-7's two answers, FR-032's mark
// and NT-8's entrance by the manuscript's own key (FR-038 (MUST NOT) keeps the
// words out of every requirement and every table, so none of the three has a
// row to be keyed by).
// ⚠️ NT-7's TWO WERE KEYED BY A ROW OF TABLE T-109 UNTIL 2026-09-02. CR-327 made
// them word buttons and took IC-69 / IC-70 out of that table, so they are now
// read out of the `confirmation` section like NT-8's `OK` beside them.
//
// ⭐ EVERYTHING A RAISER HANDS OVER IS A ROW, AND EVERY ROW IS READ. The
// manner is a row of table T-037; FR-076 (MUST) makes the reason a row of table
// T-233 and (MUST NOT) bars a reason from outside it, and the same requirement
// makes what a question shows a row of table T-234 under the same two rules.
// The dictionary holds a section keyed on each -- so NT-1's words (MUST),
// NT-3a's next step (MUST) and NT-7's 「何が起きるかを示す」 (MUST) have
// somewhere to be read out of. ⛔ THE ROW ITSELF NEVER REACHES THE
// SCREEN: FR-038 (MUST) keeps every printed word in the dictionary, and a row id
// is not a word.
// ⚠️ WHAT WOULD GO IS STILL CARRIED WRITTEN, and it is not a word of the
// screen: `RaisedConfirmation.items` holds NAMES, which are values of the
// document, and table T-234 says in as many words that they are not in the
// dictionary.
//
// ⭐ BOTH MEMBERS ARE COMPOSED. NT-7 (MUST) makes the two answers on U-55
// `Confirmation` word buttons whose words the `confirmation` section of FR-038's
// dictionary holds, so which two stand there is that section's answer and not
// the asker's; and FR-038 puts the words on this side of the seam rather than
// the raiser's. So each of the two exported functions WIDENS what it is given.
//
// ⭐ WHAT THE SHELL HANDS OVER, per notice: the row of table T-037 it is
// following and the row of table T-233 that is its reason. Nothing else is
// receivable -- FR-028 (MUST) makes a
// refusal a value the caller gets back rather than an exception, so the side
// that received the value is the side that knows which reason happened, and
// `file-store.ts` states the same boundary from the other end.
//
// ⚠️ NOTHING IS DROPPED FOR HAVING RUN OUT OF TIME. NT-2 governs a notice that
// goes away with time, but FT-4 of table T-078 leaves the reading of the clock
// to the shell, and CS-1 of table T-066 keeps it away from a `pure` unit. A
// notice whose time is up is one that is no longer raised.
//
// ⛔ Four STOP notes below. Three say what table T-037 leaves open, and the
// fourth says that one of the three sites that must ask still does not.

import type {
  Confirmation,
  ConfirmationAnswer,
  DisplayLanguage,
  Notice,
  RaisedNotice,
  ScreenSession,
} from './screen-renderer'
import displayWords from './display-words.json'

/**
 * The manner NT-4 gathers. ⚠️ A row id appears here as a VALUE, not as a copy of
 * a rule: `Notice.manner` carries row ids as its data, so this is the join to
 * table T-037, and none of that row's prose or numbers is repeated in this file.
 */
const STARTUP_PENDING_MANNER = 'NT-4'

/**
 * NT-7's two answers, in the print order the `confirmation` section of
 * `display-words.json` holds them in, keyed by the key that section spells.
 *
 * ⭐ ONE PASS OVER THE GENERATED DICTIONARY rather than a list written here, so
 * the order the manuscript prints the two in is the order they are shown in,
 * without this file knowing what that order is (rule 03 section 1). ⛔ Read
 * once, at load, because a description is built every frame and rule 05 of
 * docs/development-rules forbids a scan on that path (NFR-013).
 *
 * ⛔ THE ROSTER IS NOT READ FOR THEM ANY MORE, AND MAY NOT BE. NT-7 (MUST NOT)
 * refuses these two a row of table T-109 -- 「同表と 図 F-019 が持つのは図形の
 * 入口であり、語のボタンは図形を持たない」 -- and CR-327 took IC-69 and IC-70 out
 * of that table, so a filter on its 面 column now answers with nothing at all.
 * ⚠️ This is the same shape `DISMISS_BY_ANSWER` below already had: NT-8's
 * entrance is a word too, and it has been keyed on the manuscript's own key
 * since CR-259.
 *
 * ⚠️ Reading `displayWords` does not make this unit `semi-pure-a`: it is a
 * module constant compiled into the program, not external state read while
 * running. Table T-075 fixes UF-67 as `pure`.
 */
const CONFIRMATION_BY_ANSWER = new Map(
  displayWords.confirmation.map((entry) => [entry.answer, entry]),
)

/**
 * The words of table T-037's rows, keyed by the row id.
 *
 * ⭐ THE ROW ID IS THE JOIN, which is what makes this section readable at all:
 * `Notice.manner` and `RaisedConfirmation.manner` already carry a row of table
 * T-037, so nothing has to be minted or matched by hand to ask on it. ⚠️ The
 * `confirmation` section above has no row to be keyed by and is keyed on the
 * manuscript's own key instead, which is why the two are built differently.
 *
 * ⭐ A `Map` rather than a scan, for the reason `CONFIRMATION_BY_ANSWER` is one: a
 * description is built every frame and rule 05 of docs/development-rules forbids
 * a linear search on that path (NFR-013).
 */
const MANNERS_BY_ROW = new Map(displayWords.notices.map((entry) => [entry.rowId, entry]))

/**
 * The words of table T-233's rows, keyed by the row id.
 *
 * ⭐ THE ROW ID IS THE JOIN HERE TOO. FR-076 (MUST) makes `RaisedNotice.reason` a
 * row of that table and (MUST NOT) bars any reason outside it, so the reason is
 * asked on a row exactly as the manner is -- and neither the situation the row
 * names nor the words it holds are repeated in this file.
 *
 * ⭐ A `Map` rather than a scan, for the reason `CONFIRMATION_BY_ANSWER` is one: a
 * description is built every frame and rule 05 of docs/development-rules forbids
 * a linear search on that path (NFR-013).
 */
const REASONS_BY_ROW = new Map(displayWords.reasons.map((entry) => [entry.rowId, entry]))

/**
 * The words of table T-234's rows, keyed by the row id.
 *
 * ⭐ THE ROW ID IS THE JOIN HERE TOO, and for the same reason `REASONS_BY_ROW`
 * is keyed that way: FR-076 (MUST) makes `RaisedConfirmation.question` a row of
 * that table and (MUST NOT) bars any question outside it, so the sentence NT-7
 * asks for is asked on a row exactly as a reason is -- and neither the
 * situation the row names nor the words it holds are repeated in this file.
 *
 * ⚠️ ONE CELL PER ROW, not two. Table T-233 gives a reason both a text and a
 * next step because NT-3a asks for the second; table T-234 gives a question one
 * sentence, and the names of what would go ride on `items` instead.
 *
 * ⭐ A `Map` rather than a scan, for the reason `CONFIRMATION_BY_ANSWER` is one: a
 * description is built every frame and rule 05 of docs/development-rules
 * forbids a linear search on that path (NFR-013).
 */
const QUESTIONS_BY_ROW = new Map(displayWords.questions.map((entry) => [entry.rowId, entry]))

/**
 * Which of the two words table T-233 gives a row is wanted.
 *
 * ⚠️ Spelled the way the dictionary spells the two members, so that the pick IS
 * the lookup and no table of names stands between them (rule 03 section 1).
 */
type ReasonCell = 'text' | 'nextStep'

/**
 * The row of table T-233 a reason with no row of its own falls to.
 *
 * ⭐ A ROW ID AS A VALUE, the way `STARTUP_PENDING_MANNER` is one: FR-076 names
 * this row as where such a reason goes, so the id is the join and none of that
 * row's prose is repeated here (rule 03 section 1).
 * ⛔ NOT AN EMPTY STRING. A telling with no text breaks NT-1 (MUST) and one with
 * no next step breaks NT-3a (MUST), which is why the specification gives the
 * unlisted reason a row instead of leaving it to say nothing.
 */
const UNLISTED_REASON_ROW = 'RS-15'

/**
 * The row of table T-234 a question with no row of its own falls to.
 *
 * ⭐ THE SAME MOVE `UNLISTED_REASON_ROW` MAKES, and FR-076 states it as the
 * same rule: the way the words are held, the way a row is added and the reason
 * a fall-back row exists at all are 「表 T-233 について述べたものと同じ」.
 * ⛔ NOT AN EMPTY STRING. A question that shows no sentence fails NT-7's
 * 「何が起きるかを示すこと（MUST）」, which is why the specification gives the
 * unlisted question a row instead of leaving it to say nothing.
 */
const UNLISTED_QUESTION_ROW = 'QN-8'

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
 * ⭐ A `Map` rather than a scan, for the reason `CONFIRMATION_BY_ANSWER` is one: a
 * description is built every frame and rule 05 of docs/development-rules
 * forbids a linear search on that path (NFR-013).
 */
const MARKS_BY_KEY = new Map(displayWords.confirmationMarks.map((entry) => [entry.mark, entry]))

/**
 * The key the `noticeDismiss` section holds NT-8's word under.
 *
 * ⭐ A KEY OF THE DICTIONARY AND NOT A ROW OF ANY TABLE, exactly as
 * `SHOWN_ON_ANOTHER_ROW` is one. CR-259 settled that NT-8's entrance gets no row
 * of table T-109 -- it is a word, the way NT-7's two answers are answered in
 * words -- so there is no row to key it by, and the manuscript's own key is the
 * join, spelled here as the manuscript spells it (rule 03 section 1).
 * ⚠️ Unlike the `confirmation` section named above, this one is READ: that
 * section's two keys have rows of table T-109 standing beside them and no join
 * between the two, and this one has no rows at all to be in doubt about.
 */
const NOTICE_DISMISS_ANSWER = 'dismiss'

/**
 * The words of the `noticeDismiss` section, keyed by the answer.
 *
 * ⭐ A `Map` rather than a scan, for the reason `CONFIRMATION_BY_ANSWER` is one: a
 * description is built every frame and rule 05 of docs/development-rules
 * forbids a linear search on that path (NFR-013).
 */
const DISMISS_BY_ANSWER = new Map(displayWords.noticeDismiss.map((entry) => [entry.answer, entry]))

/**
 * What stands between the two rows one telling is keyed by.
 *
 * ⛔ NEITHER SEPARATOR MAY APPEAR IN A ROW ID, which is the whole of what makes
 * the key splittable again on the far side: the rows of table T-037 and table
 * T-233 are spelled with letters, digits and a hyphen (`NT-3a`, `RS-15`), so
 * these two characters cannot occur inside one.
 * ⛔ NOT A WORD OF THE SCREEN. `Notice.dismissKey` is read by the side that
 * spends a press and never printed, so FR-038 does not reach it -- the word this
 * telling's entrance shows is `dismissText`.
 */
const DISMISS_KEY_ROW_SEPARATOR = '/'

/** What stands between two tellings NT-4 gathered into one. See above. */
const DISMISS_KEY_NOTICE_SEPARATOR = '+'

/**
 * What an entry says while the dictionary holds no word for it.
 *
 * ⛔ NOT "SAY NOTHING". An empty cell of `display-words.json` says that no word
 * has been SETTLED yet, which is what PD-160 records.
 */
const NO_WORDS = ''

/**
 * The word on one of NT-7's two answers, in the display language (FR-038).
 *
 * ⭐ NT-7 (MUST) has it spelled `Yes` / `No` in EVERY display language and
 * (MUST NOT) forbids translating it, so both cells of the row hold the same
 * word -- and the language is still asked for rather than assumed, because the
 * requirement that fixes the spelling is the manuscript's and not this file's.
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`, for the
 * reason `open-modals.ts` gives at the same line: those read "the dictionary
 * holds no word yet" and "the word is the empty string" as one thing, and
 * PD-160 is precisely the difference.
 *
 * @purity pure
 */
function answerText(answer: string, language: DisplayLanguage): string {
  const word = CONFIRMATION_BY_ANSWER.get(answer)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * What one row of table T-037 is called, in the display language (FR-038).
 *
 * ⭐ WHAT A RAISED THING IS LOOKED UP BY. `RaisedNotice` and
 * `RaisedConfirmation` each carry the row and no words, and this section is
 * keyed on that row -- so the row it declares is the whole of the question asked
 * here. ⚠️ The raiser's OTHER value, the reason, is read the same way out of the
 * section keyed on table T-233's rows.
 *
 * ⛔ THE FALLBACK IS `NO_WORDS`, WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`,
 * for the reason `answerText` gives above. ⚠️ A row the dictionary does not hold
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
 * One cell of one row of table T-233 as the dictionary holds it, or `undefined`
 * where it holds no word there.
 *
 * ⛔ TWO CONDITIONS AND NOT ONE, WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`,
 * for the reason `answerText` gives above: a row the dictionary does not hold
 * at all and a cell it holds empty are different things, and PD-160 is precisely
 * that difference. ⚠️ Neither can happen while `npm run gen:check` passes -- the
 * generator builds its roster from table T-233 every run and every cell of it is
 * written -- so what both branches guard is a generated file edited by hand.
 *
 * @purity pure
 */
function reasonCell(row: string, cell: ReasonCell, language: DisplayLanguage): string | undefined {
  const word = REASONS_BY_ROW.get(row)?.[cell][language]
  if (word === undefined) return undefined
  return word === '' ? undefined : word
}

/**
 * What one reason says, in the display language (FR-038) -- the text NT-1 (MUST)
 * asks for, or the next step NT-3a (MUST) asks for.
 *
 * ⛔ A REASON THE DICTIONARY CANNOT ANSWER FOR FALLS TO A ROW, never to nothing.
 * FR-076 names the row an unlisted reason goes to, because a telling with no
 * text keeps neither half of NT-1 -- which asks for the words (MUST) and forbids
 * colour or a border to stand in for them (MUST NOT) -- and one with no next
 * step is the bare failure NT-3a refuses (MUST NOT).
 * ⛔ AND NEVER TO THE KEY ITSELF. Printing the row id would put on the screen a
 * string FR-038 (MUST) does not hold, the same in both display languages, which
 * is the one thing that requirement exists to prevent.
 * ⚠️ `NO_WORDS` is reached only when that fall-back row is itself missing from a
 * hand-edited dictionary, because there is then nothing further to fall to.
 *
 * @purity pure
 */
function reasonWord(reason: string, cell: ReasonCell, language: DisplayLanguage): string {
  const word = reasonCell(reason, cell, language)
  if (word !== undefined) return word
  const unlisted = reasonCell(UNLISTED_REASON_ROW, cell, language)
  if (unlisted !== undefined) return unlisted
  return NO_WORDS
}

/**
 * The sentence one row of table T-234 holds, or `undefined` where the
 * dictionary holds no word there.
 *
 * ⛔ TWO CONDITIONS AND NOT ONE, WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`,
 * for the reason `reasonCell` gives just above: a row the dictionary does not
 * hold at all and a cell it holds empty are different things, and PD-160 is
 * precisely that difference. ⚠️ Neither can happen while `npm run gen:check`
 * passes -- the generator builds its roster from table T-234 every run -- so
 * what both branches guard is a generated file edited by hand.
 *
 * @purity pure
 */
function questionCell(row: string, language: DisplayLanguage): string | undefined {
  const word = QUESTIONS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return undefined
  return word === '' ? undefined : word
}

/**
 * What one question says, in the display language (FR-038) -- what NT-7 (MUST)
 * has shown before continuing or calling it off is chosen.
 *
 * ⛔ A QUESTION THE DICTIONARY CANNOT ANSWER FOR FALLS TO A ROW, never to
 * nothing, the way `reasonWord` falls to one. FR-076 names the row an unlisted
 * question goes to, because a question that shows no sentence is one NT-7's
 * 「何が起きるかを示すこと（MUST）」 cannot be kept for.
 * ⛔ AND NEVER TO THE KEY ITSELF. Printing the row id would put on the screen a
 * string FR-038 (MUST) does not hold, the same in both display languages, which
 * is the one thing that requirement exists to prevent.
 * ⚠️ `NO_WORDS` is reached only when that fall-back row is itself missing from a
 * hand-edited dictionary, because there is then nothing further to fall to.
 *
 * @purity pure
 */
function questionText(question: string, language: DisplayLanguage): string {
  const word = questionCell(question, language)
  if (word !== undefined) return word
  const unlisted = questionCell(UNLISTED_QUESTION_ROW, language)
  if (unlisted !== undefined) return unlisted
  return NO_WORDS
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
 * for the reason `answerText` gives just above: those read "the dictionary
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
 * The word on the entrance NT-8 (MUST) requires, in the display language
 * (FR-038).
 *
 * ⭐ WHY THERE IS A WORD TO READ AT ALL. NT-8 requires a told notice to be one
 * the person can put away where it stands, and states in as many words that the
 * word of that entrance is the dictionary's -- so nothing here writes one. ⛔ No
 * shape is raised for it either: table T-109 is the whole of the icons (FR-029,
 * MUST) and CR-259 added no row to it, which is the same bargain
 * `shownOnAnotherRowMark` keeps just above.
 *
 * ⚠️ READ ONCE FOR THE WHOLE FRAME'S WORTH OF NOTICES, not once per notice: it
 * takes no argument but the language, so every telling shows the one word NT-8
 * settled and the lookup is not repeated down the list (NFR-013).
 *
 * ⛔ THE FALLBACK IS `NO_WORDS`, WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`,
 * for the reason `answerText` gives above. ⚠️ Neither branch can be reached
 * while `npm run gen:check` passes: the generator writes this section from the
 * manuscript, and NT-8 (MUST) fills both language cells with the same spelling.
 *
 * @purity pure
 */
function dismissText(language: DisplayLanguage): string {
  const word = DISMISS_BY_ANSWER.get(NOTICE_DISMISS_ANSWER)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * What names ONE raised telling to the side that spends a press on its
 * entrance (NT-8).
 *
 * ⭐ BUILT FROM THE TWO ROWS THE RAISER ALREADY HANDED OVER, and from nothing
 * minted here: a `pure` unit has neither a counter nor a clock to number a
 * telling with (CS-1 of table T-066), and both rows are already the joins this
 * file reads everything else by. ⛔ Which is also why the key is not an index
 * into `ScreenSession.notices`: the description is rebuilt every frame, NT-4
 * collapses a run of it, and a number that means 「the third」 names a different
 * telling the moment the second is put away.
 *
 * @purity pure
 */
export function dismissKeyOf(raised: RaisedNotice): string {
  return raised.manner + DISMISS_KEY_ROW_SEPARATOR + raised.reason
}

/**
 * NT-7's two answers as the surface shows them -- word buttons (MUST), in the
 * order the dictionary prints them in.
 *
 * ⭐ NEITHER CAN BE SPENT AND NEITHER IS A TOGGLE. NT-7 (MUST) makes choosing
 * between going on and calling it off the whole of this surface, so there is no
 * state in which one of the two may not be pressed -- FR-029's faint-and-
 * explained state never applies -- and neither stays down: a toggle is one
 * entrance with two states, and this is two answers with one choice. ⛔ THAT IS
 * WHY NEITHER IS A `CommandItem` any more: that type exists to say which of
 * those states an entrance is in, and it is keyed by a row of table T-109 --
 * a row NT-7 (MUST NOT) refuses these two.
 *
 * ⛔ THE FIRST LETTER IS NOT SEPARATED HERE. NT-7 (MUST) has it drawn bold, and
 * which part of a word is drawn how is the drawing side's -- this unit reads
 * the word whole, the way it reads every other word on the screen.
 *
 * ⭐⭐ EXPORTED SINCE 2026-09-02, AND READ BY ONE OTHER UNIT OF THIS COMPONENT.
 * FR-020 (MUST) gives U-60 `Watermark Unlock` two answers and sends their
 * manner to 「表 T-037 の `NT-7` が語のボタンについて定めるもの」 -- so they are
 * these two, read out of this same section. ⛔ UF-66 does not build its own:
 * two readings of one section would be one decision in two places (R2.7), and
 * the first thing to part company would be the print ORDER, which this file
 * takes off the dictionary rather than choosing.
 *
 * @purity pure
 */
export function confirmationAnswers(language: DisplayLanguage): readonly ConfirmationAnswer[] {
  return [...CONFIRMATION_BY_ANSWER.keys()].map((answer) => ({
    answer,
    text: answerText(answer, language),
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
 * at all -- neither for its own reason nor for the row FR-076 sends an unlisted
 * reason to.
 *
 * ⛔ NOT "NOTHING CAN BE DONE". It says that no next step has been SETTLED yet,
 * which is the same thing an empty cell of `display-words.json` says (PD-160).
 * ⚠️ Out of reach while `npm run gen:check` passes: every row of table T-233 is
 * written, and a reason outside that table falls to one of them.
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
 * ⭐ TWO ROWS IN, THREE READINGS OUT. The manner is a row of table T-037 and the
 * reason a row of table T-233, and the dictionary is keyed on both -- so what
 * NT-1 (MUST) has the telling say in words, and what NT-3a (MUST) has it add as
 * the next step, are read here rather than asked of the raiser or written in
 * this file (FR-038, MUST NOT).
 *
 * ⚠️ ONE STEP PER ROW. Table T-233 gives a row a single next step, and
 * `Notice.nextSteps` is a list because NT-4 gathers several notices onto one
 * surface -- not because one reason has several steps.
 *
 * @purity pure
 */
function toldNotice(raised: RaisedNotice, language: DisplayLanguage): Notice {
  const nextStep = reasonWord(raised.reason, 'nextStep', language)
  return {
    manner: raised.manner,
    mannerText: mannerText(raised.manner, language),
    text: reasonWord(raised.reason, 'text', language),
    // ⛔ A step that is no word is not listed at all: an entry holding the empty
    // string would draw a place for a step with nothing in it, which tells a
    // reader no more than the bare failure NT-3a (MUST NOT) refuses. ⚠️ Told
    // apart from a step that IS a word, never merged with it (PD-160).
    nextSteps: nextStep === NO_WORDS ? NO_NEXT_STEPS : [nextStep],
    affectedCount: raised.affectedCount,
    // NT-8 (MUST): every told notice can be put away where it stands, so the
    // word and the key are filled for all of them and for none of the
    // confirmations -- `confirmationFromSession` below builds no such member,
    // and NT-8 (MUST NOT) is why.
    dismissText: dismissText(language),
    dismissKey: dismissKeyOf(raised),
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
    // ⚠️ One word for the one surface, read the way `mannerText` above is read
    // rather than taken off the first of them: NT-4 gathered these into a single
    // telling, and a single telling carries a single entrance.
    dismissText: dismissText(language),
    // ⛔ THE KEYS OF ALL OF THEM, JOINED THE WAY THE TEXTS ARE JOINED, because
    // this ONE entrance puts away every raised notice NT-4 gathered here. A key
    // naming only the first would leave the rest standing with nothing on the
    // screen to press -- NT-4 (MUST) has already taken their separate surfaces
    // away.
    dismissKey: pending.map((notice) => notice.dismissKey).join(DISMISS_KEY_NOTICE_SEPARATOR),
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
 * ⭐ THE WORDS ARE READ BEFORE THE GATHERING, not after: NT-4 joins the TEXTS and
 * the next steps of what is pending, so each one has to be a told notice before
 * there is anything to join.
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
 * ⭐ THE NAMES ARE CARRIED AND NEVER COMPOSED, for the same reason a notice's
 * count is: FR-032 asks for the names of the tasks a row takes with it and
 * FR-099 for the names of the tasks an unassignment reaches, and neither is
 * derivable from a `RaisedConfirmation` that already exists. ⚠️ They are values
 * of the DOCUMENT, which is why FR-038's dictionary does not hold them and
 * table T-234 says so itself.
 *
 * ⭐ THE SENTENCE IS COMPOSED, and it stopped being carried when table T-234
 * was written: FR-076 (MUST) makes what a question shows a row of that table,
 * so NT-7's 「何が起きるかを示す」 is now READ here out of the one dictionary
 * FR-038 names -- the move `mannerText`, `answers` and `shownOnAnotherRowMark`
 * were already making.
 *
 * ⭐ THE TWO ANSWERS ARE COMPOSED, AND SO IS FR-032's MARK. NT-7 (MUST) makes
 * the two word buttons and names the `confirmation` section of FR-038's
 * dictionary as where their words come from, so which two stand on U-55 is that
 * section's answer -- read out of the generated dictionary, never asked of the
 * raiser and never written out here. The mark joins them for the same reason:
 * WHICH items wear it is the raiser's to know
 * (`ConfirmationItem.isShownOnAnotherRow`), and what it is CALLED is the
 * dictionary's (PD-175). ⛔ Neither is a word this file writes.
 *
 * ⛔ AND NO ENTRANCE TO PUT IT AWAY, which NT-8 states as a MUST NOT. A telling
 * is read past and this one waits for an answer, so a third way out would be an
 * answer that is neither of `answers` -- 「どちらでもない」 in that row's own
 * words. ⚠️ That is why `Confirmation` carries neither of the two members
 * `toldNotice` fills for NT-8: the type has them absent, and this is the one
 * place that could have added them.
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
 * `ScreenSession.confirmation` and spends the two word buttons, so the
 * surface below is described and seen. FR-099's unassignment is the one left:
 * table T-109 does place IC-66 on U-49, so there IS an entrance to press, and
 * what is missing is the same thing `frame-loop.ts` supplies for the other two
 * -- a raiser that puts the question up and spends the answer. Until then that
 * deletion runs unasked, which is what breaks that MUST. ⚠️ Table T-234 has the
 * row that question would show -- `QN-3`, whose 正 is FR-099 -- so what is
 * missing is the road and not the words. Searched: table T-037,
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
    // ⭐ NT-7's OWN SENTENCE, READ AND NEVER ASKED OF THE RAISER. FR-076 (MUST)
    // makes what a question shows a row of table T-234, and the `questions`
    // section is keyed on exactly that -- so this is the same move `mannerText`
    // above makes and the same one `Notice.text` makes for a reason.
    text: questionText(raised.question, session.language),
    answers: confirmationAnswers(session.language),
    // Carried whether or not any item wears it: the surface is drawn from this
    // one value, and reading the dictionary per item would be the same lookup
    // repeated (NFR-013).
    shownOnAnotherRowMark: shownOnAnotherRowMark(session.language),
  }
}
