// Fills the notices and the confirmation of the screen description.
// @unit      UF-67   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

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

const CONFIRMATION_BY_ANSWER = new Map(
  displayWords.confirmation.map((entry) => [entry.answer, entry]),
)

const MANNERS_BY_ROW = new Map(displayWords.notices.map((entry) => [entry.rowId, entry]))

const REASONS_BY_ROW = new Map(displayWords.reasons.map((entry) => [entry.rowId, entry]))

const QUESTIONS_BY_ROW = new Map(displayWords.questions.map((entry) => [entry.rowId, entry]))

type ReasonCell = 'text' | 'nextStep'

const UNLISTED_REASON_ROW = 'RS-15'

const UNLISTED_QUESTION_ROW = 'QN-8'

const SHOWN_ON_ANOTHER_ROW = 'shownOnAnotherRow'

const MARKS_BY_KEY = new Map(displayWords.confirmationMarks.map((entry) => [entry.mark, entry]))

const NOTICE_DISMISS_ANSWER = 'dismiss'

const DISMISS_BY_ANSWER = new Map(displayWords.noticeDismiss.map((entry) => [entry.answer, entry]))

const DISMISS_KEY_ROW_SEPARATOR = '/'

const DISMISS_KEY_NOTICE_SEPARATOR = '+'

const NO_WORDS = ''

/** @purity pure */
function answerText(answer: string, language: DisplayLanguage): string {
  const word = CONFIRMATION_BY_ANSWER.get(answer)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/** @purity pure */
function mannerText(manner: string, language: DisplayLanguage): string {
  const word = MANNERS_BY_ROW.get(manner)?.manner[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/** @purity pure */
function reasonCell(row: string, cell: ReasonCell, language: DisplayLanguage): string | undefined {
  const word = REASONS_BY_ROW.get(row)?.[cell][language]
  if (word === undefined) return undefined
  return word === '' ? undefined : word
}

/** @purity pure */
function reasonWord(reason: string, cell: ReasonCell, language: DisplayLanguage): string {
  const word = reasonCell(reason, cell, language)
  if (word !== undefined) return word
  const unlisted = reasonCell(UNLISTED_REASON_ROW, cell, language)
  if (unlisted !== undefined) return unlisted
  return NO_WORDS
}

/** @purity pure */
function questionCell(row: string, language: DisplayLanguage): string | undefined {
  const word = QUESTIONS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return undefined
  return word === '' ? undefined : word
}

/** @purity pure */
function questionText(question: string, language: DisplayLanguage): string {
  const word = questionCell(question, language)
  if (word !== undefined) return word
  const unlisted = questionCell(UNLISTED_QUESTION_ROW, language)
  if (unlisted !== undefined) return unlisted
  return NO_WORDS
}

/** @purity pure */
function shownOnAnotherRowMark(language: DisplayLanguage): string {
  const word = MARKS_BY_KEY.get(SHOWN_ON_ANOTHER_ROW)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/** @purity pure */
function dismissText(language: DisplayLanguage): string {
  const word = DISMISS_BY_ANSWER.get(NOTICE_DISMISS_ANSWER)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

// see NT-8
/** @purity pure */
export function dismissKeyOf(raised: RaisedNotice): string {
  return raised.manner + DISMISS_KEY_ROW_SEPARATOR + raised.reason
}

// see NT-7
/** @purity pure */
export function confirmationAnswers(language: DisplayLanguage): readonly ConfirmationAnswer[] {
  return [...CONFIRMATION_BY_ANSWER.keys()].map((answer) => ({
    answer,
    text: answerText(answer, language),
  }))
}

// see FR-023
/** @purity pure */
export function reasonSurfaceWords(
  reason: string,
  language: DisplayLanguage,
): { readonly text: string; readonly nextStep: string; readonly dismissText: string } {
  return {
    text: reasonWord(reason, 'text', language),
    nextStep: reasonWord(reason, 'nextStep', language),
    dismissText: dismissText(language),
  }
}

// WHY: joined by a line break, which adds no word and drops no text.
const GATHERED_TEXT_SEPARATOR = '\n'

const NO_NEXT_STEPS: readonly string[] = []

/** @purity pure */
function isStartupPending(notice: Notice): boolean {
  return notice.manner === STARTUP_PENDING_MANNER
}

/** @purity pure */
function toldNotice(raised: RaisedNotice, language: DisplayLanguage): Notice {
  const nextStep = reasonWord(raised.reason, 'nextStep', language)
  return {
    manner: raised.manner,
    mannerText: mannerText(raised.manner, language),
    text: reasonWord(raised.reason, 'text', language),
    nextSteps: nextStep === NO_WORDS ? NO_NEXT_STEPS : [nextStep],
    affectedCount: raised.affectedCount,
    dismissText: dismissText(language),
    dismissKey: dismissKeyOf(raised),
  }
}

// WHY: the gathered count is null; a sum of unlike subjects is a number no row defines.
/** @purity pure */
function gatheredStartupNotice(pending: readonly Notice[], language: DisplayLanguage): Notice {
  return {
    manner: STARTUP_PENDING_MANNER,
    mannerText: mannerText(STARTUP_PENDING_MANNER, language),
    text: pending.map((notice) => notice.text).join(GATHERED_TEXT_SEPARATOR),
    nextSteps: pending.flatMap((notice) => notice.nextSteps),
    affectedCount: null,
    dismissText: dismissText(language),
    dismissKey: pending.map((notice) => notice.dismissKey).join(DISMISS_KEY_NOTICE_SEPARATOR),
  }
}

// see FR-076, NT-4
/** @purity pure */
export function noticesFromSession(session: ScreenSession): readonly Notice[] {
  const told = session.notices.map((raised) => toldNotice(raised, session.language))
  const startupPending = told.filter(isStartupPending)

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
    shown.push(gathered)
    isGatheredShown = true
  }

  return shown
}

// see NT-7
/** @purity pure */
export function confirmationFromSession(session: ScreenSession): Confirmation | null {
  const raised = session.confirmation
  if (raised === null) return null
  return {
    ...raised,
    mannerText: mannerText(raised.manner, session.language),
    text: questionText(raised.question, session.language),
    answers: confirmationAnswers(session.language),
    shownOnAnotherRowMark: shownOnAnotherRowMark(session.language),
  }
}
