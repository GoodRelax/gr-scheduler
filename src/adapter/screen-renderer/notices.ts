// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-67   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// Fills `notices` and `confirmation` of ScreenView (FR-076, table T-037); the
// signatures follow the "nine unit contracts" section of screen-renderer.ts.
//
// A confirmation is its own member rather than a notice in another manner,
// because it stops until it is answered (NT-7).
//
// A raiser hands over rows only -- the manner (table T-037), the reason (table
// T-233), the question (table T-234) -- and every printed word is read here out
// of the generated dictionary keyed by those rows (FR-038). The count, and which
// row applies, cannot be derived from an existing Notice, so they arrive chosen.
//
// A pending-at-startup notice is recognised by its manner alone: NT-4 IS the
// row for it, so `Notice` needs no mark of when it was raised.
//
// Nothing is dropped for having run out of time: the clock is the shell's (NT-2,
// FT-4 of table T-078, CS-1 of table T-066), so an expired notice is simply no
// longer raised.

import type {
  Confirmation,
  ConfirmationAnswer,
  DisplayLanguage,
  Notice,
  RaisedNotice,
  ScreenSession,
} from './screen-renderer'
import displayWords from './display-words.json'

const STARTUP_PENDING_MANNER = 'NT-4'

/**
 * NT-7's two answers, keyed by the `confirmation` section's own key, in that
 * section's print order -- so this file never states the order (rule 03 section 1).
 *
 * Keyed on the dictionary and not on table T-109, because NT-7 (MUST NOT) gives
 * these word buttons no row there. Built once at load: a description is built
 * every frame and rule 05 forbids a scan on that path (NFR-013).
 *
 * Reading `displayWords` keeps the unit `pure`: it is a module constant compiled
 * in, not external state read while running.
 */
const CONFIRMATION_BY_ANSWER = new Map(
  displayWords.confirmation.map((entry) => [entry.answer, entry]),
)

/** Table T-037's words by row id. A `Map` for the reason above (NFR-013). */
const MANNERS_BY_ROW = new Map(displayWords.notices.map((entry) => [entry.rowId, entry]))

/** Table T-233's words by row id (FR-076). */
const REASONS_BY_ROW = new Map(displayWords.reasons.map((entry) => [entry.rowId, entry]))

/** Table T-234's words by row id (FR-076). */
const QUESTIONS_BY_ROW = new Map(displayWords.questions.map((entry) => [entry.rowId, entry]))

/**
 * Spelled as the dictionary spells the two members, so the pick IS the lookup
 * (rule 03 section 1).
 */
type ReasonCell = 'text' | 'nextStep'

/**
 * The row of table T-233 FR-076 sends an unlisted reason to. Not an empty
 * string: a telling with no text breaks NT-1, one with no next step NT-3a.
 */
const UNLISTED_REASON_ROW = 'RS-15'

/** The row of table T-234 FR-076 sends an unlisted question to, for the same reason. */
const UNLISTED_QUESTION_ROW = 'QN-8'

/**
 * FR-032's mark, keyed by the manuscript's own key: FR-038 (MUST NOT) keeps the
 * words out of every table, so there is no row to key it by. No `is` prefix,
 * because the key names a word, not a boolean (R2.1).
 */
const SHOWN_ON_ANOTHER_ROW = 'shownOnAnotherRow'

const MARKS_BY_KEY = new Map(displayWords.confirmationMarks.map((entry) => [entry.mark, entry]))

/** NT-8's word, keyed by the manuscript's own key for the same reason as `SHOWN_ON_ANOTHER_ROW`. */
const NOTICE_DISMISS_ANSWER = 'dismiss'

const DISMISS_BY_ANSWER = new Map(displayWords.noticeDismiss.map((entry) => [entry.answer, entry]))

/**
 * What stands between the two rows one telling is keyed by.
 *
 * ⛔ Neither separator may appear in a row id (`NT-3a`, `RS-15`), or the key
 * cannot be split again on the far side. The key is never printed, so FR-038
 * does not reach it.
 */
const DISMISS_KEY_ROW_SEPARATOR = '/'

/** What stands between two tellings NT-4 gathered into one. See above. */
const DISMISS_KEY_NOTICE_SEPARATOR = '+'

/** An empty cell of `display-words.json` means no word is settled yet, not "say nothing". */
const NO_WORDS = ''

/**
 * The word on one of NT-7's two answers (FR-038). The language is still asked
 * for, although NT-7 spells both cells the same, because that spelling is the
 * manuscript's.
 *
 * ⛔ The fallback is `=== ''`, never `||` or `??`: those would merge "no word
 * yet" with "the word is the empty string".
 *
 * @purity pure
 */
function answerText(answer: string, language: DisplayLanguage): string {
  const word = CONFIRMATION_BY_ANSWER.get(answer)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * What one row of table T-037 is called (FR-038). Fallback as in `answerText`.
 *
 * @purity pure
 */
function mannerText(manner: string, language: DisplayLanguage): string {
  const word = MANNERS_BY_ROW.get(manner)?.manner[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * One cell of one row of table T-233, or `undefined` where no word is held.
 *
 * Both branches are unreachable while `npm run gen:check` passes; they guard a
 * hand-edited generated file.
 *
 * @purity pure
 */
function reasonCell(row: string, cell: ReasonCell, language: DisplayLanguage): string | undefined {
  const word = REASONS_BY_ROW.get(row)?.[cell][language]
  if (word === undefined) return undefined
  return word === '' ? undefined : word
}

/**
 * What one reason says (FR-038): NT-1's text or NT-3a's next step.
 *
 * ⛔ An unanswerable reason falls to `UNLISTED_REASON_ROW`, never to the row id:
 * printing the id would put a string on screen that FR-038's dictionary does not
 * hold. `NO_WORDS` only when that row is itself missing.
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
 * The sentence one row of table T-234 holds, or `undefined`. As `reasonCell`.
 *
 * @purity pure
 */
function questionCell(row: string, language: DisplayLanguage): string | undefined {
  const word = QUESTIONS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return undefined
  return word === '' ? undefined : word
}

/**
 * What one question says (NT-7, FR-038). Falls back as `reasonWord` does.
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
 * FR-032's mark for a task drawn on another row (HM-10 of table T-015a), as a
 * word (PND-175). No shape: table T-109 is the whole of the icons and RC-13 of
 * table T-026 makes a new one the user's decision. Fallback as in `answerText`.
 *
 * @purity pure
 */
function shownOnAnotherRowMark(language: DisplayLanguage): string {
  const word = MARKS_BY_KEY.get(SHOWN_ON_ANOTHER_ROW)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * The word on NT-8's entrance (FR-038). No shape, for the reason
 * `shownOnAnotherRowMark` gives. Fallback as in `answerText`.
 *
 * @purity pure
 */
function dismissText(language: DisplayLanguage): string {
  const word = DISMISS_BY_ANSWER.get(NOTICE_DISMISS_ANSWER)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * What names one raised telling to the side that spends a press on it (NT-8).
 *
 * Built from the two rows, not an index into `ScreenSession.notices`: the list is
 * rebuilt every frame and NT-4 collapses part of it, so an index would name a
 * different telling once one is put away. A `pure` unit has no counter (CS-1).
 *
 * @purity pure
 */
export function dismissKeyOf(raised: RaisedNotice): string {
  return raised.manner + DISMISS_KEY_ROW_SEPARATOR + raised.reason
}

/**
 * NT-7's two answers as word buttons, in the dictionary's print order.
 *
 * Not `CommandItem`s: neither is ever disabled or a toggle, and that type is keyed
 * by a row of table T-109, which NT-7 (MUST NOT) refuses them. The bold first
 * letter is the drawing side's; the word is read whole.
 *
 * Exported because UF-66 shows the same two for U-60 (FR-020): one reading of the
 * section keeps the print order from diverging (R2.7).
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
 * What U-62 `Import Report` prints: one reason's sentence and next step, and the
 * word on its way out (FR-023).
 *
 * Here and not in `open-modals.ts` because both dictionary sections are read only
 * in this file (R2.7). The names U-62 lists are document values and are not
 * translated (FR-023); the caller lays the three strings out.
 *
 * @purity pure
 */
export function reasonSurfaceWords(
  reason: string,
  language: DisplayLanguage,
): { readonly text: string; readonly nextStep: string; readonly dismissText: string } {
  return {
    text: reasonWord(reason, 'text', language),
    // Left as `NO_WORDS` rather than dropped: a surface is not a list of
    // notices, and only the caller knows whether it has a place to draw one.
    nextStep: reasonWord(reason, 'nextStep', language),
    dismissText: dismissText(language),
  }
}

/**
 * What stands between two gathered texts.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how several texts are written on
 * NT-4's one surface. Looked in table T-037 (NT-4 fixes that they are gathered,
 * nothing about the writing), in FR-076, in `_assets/tbl-settings.md` (no row for
 * a notice in table T-203 or table T-206), and in table T-077. Chose a line
 * break: it adds no word (FR-038) and drops no text.
 */
const GATHERED_TEXT_SEPARATOR = '\n'

/** No next step settled at all -- neither for the reason nor for the fall-back row. */
const NO_NEXT_STEPS: readonly string[] = []

/**
 * Reads `manner` only: see the header on why that is the join.
 *
 * @purity pure
 */
function isStartupPending(notice: Notice): boolean {
  return notice.manner === STARTUP_PENDING_MANNER
}

/**
 * One raised notice as the screen tells it.
 *
 * `Notice.nextSteps` is a list because NT-4 gathers several notices, not because
 * one row of table T-233 has several steps.
 *
 * @purity pure
 */
function toldNotice(raised: RaisedNotice, language: DisplayLanguage): Notice {
  const nextStep = reasonWord(raised.reason, 'nextStep', language)
  return {
    manner: raised.manner,
    mannerText: mannerText(raised.manner, language),
    text: reasonWord(raised.reason, 'text', language),
    // ⛔ An entry holding '' would draw an empty place for a step, which says no
    // more than the bare failure NT-3a (MUST NOT) refuses.
    nextSteps: nextStep === NO_WORDS ? NO_NEXT_STEPS : [nextStep],
    affectedCount: raised.affectedCount,
    // NT-8: filled for every told notice, and for no confirmation.
    dismissText: dismissText(language),
    dismissKey: dismissKeyOf(raised),
  }
}

/**
 * NT-4's pending items as its one surface, in raised order; every text and next
 * step goes in (NT-3a).
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what count the gathered surface
 * carries when several items carry one. Looked in table T-037 (NT-3 asks a
 * destructive result for a count and is not gathered; NT-4 asks for none) and in
 * FR-076. Chose `null`: summing unlike subjects would show a number no row
 * defines. A lone pending item is therefore passed through untouched.
 *
 * @purity pure
 */
function gatheredStartupNotice(pending: readonly Notice[], language: DisplayLanguage): Notice {
  return {
    manner: STARTUP_PENDING_MANNER,
    // Read from the declared row, not taken off the first item, so it stays right
    // if the filter ever admits a second manner.
    mannerText: mannerText(STARTUP_PENDING_MANNER, language),
    text: pending.map((notice) => notice.text).join(GATHERED_TEXT_SEPARATOR),
    nextSteps: pending.flatMap((notice) => notice.nextSteps),
    affectedCount: null,
    dismissText: dismissText(language),
    // ⛔ All keys, joined: this one entrance puts away every gathered notice, and a
    // key naming only the first would leave the rest with nothing to press.
    dismissKey: pending.map((notice) => notice.dismissKey).join(DISMISS_KEY_NOTICE_SEPARATOR),
  }
}

/**
 * Which raised notices are shown, in what order, and in what words.
 *
 * All are shown; the only change is NT-4's gathering. ⛔ No other manner is
 * gathered: a joined text stops saying which item is wrong (NT-1), and NT-5 would
 * no longer be distinguishable from NT-1's refusal.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: the order several shown notices
 * stand in. Looked in table T-037 (no row ranks manners; NT-4 only forbids
 * separate surfaces for the startup ones), in FR-076, and in table T-077. Chose
 * raised order, collapsing NT-4's run in place. Not table T-037's printed order,
 * because nothing generates its row roster into `src/`, so a typed copy would
 * go stale silently.
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
 * The question waiting to be answered on U-55, or `null` while none is (NT-7).
 *
 * The item names are carried, not composed: they are document values (FR-032,
 * FR-099) that the dictionary does not hold (table T-234). Sentence, answers and
 * mark are read here from the dictionary.
 *
 * ⛔ No dismiss entrance (NT-8, MUST NOT): a third way out would be an answer
 * that is neither of the two.
 *
 * At most one question; NT-4's gathering is about notices only.
 *
 * ⚠️ Not dropped when `items` is empty: DI-4 of table T-227 asks with nothing
 * named. ⛔ Never filtered by which requirement raised it -- FR-031 (MUST NOT)
 * forbids enumerating the admitted sites.
 *
 * @purity pure
 */
export function confirmationFromSession(session: ScreenSession): Confirmation | null {
  const raised = session.confirmation
  if (raised === null) return null
  return {
    ...raised,
    // The `surfaces` section holds no heading for U-55, so the name is the
    // manner's. Read off `raised.manner`, never the literal NT-7: the raiser
    // declares the row, and a second place deciding it would be a second answer.
    mannerText: mannerText(raised.manner, session.language),
    text: questionText(raised.question, session.language),
    answers: confirmationAnswers(session.language),
    // Carried whether or not any item wears it, so the dictionary is not looked
    // up once per item (NFR-013).
    shownOnAnotherRowMark: shownOnAnotherRowMark(session.language),
  }
}
