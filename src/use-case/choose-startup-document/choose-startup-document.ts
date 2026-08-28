// ChooseStartupDocument -- public entry of this folder.
//
// @unit      UF-23   (docs/spec/05-07-design.md, table T-075)
// @component ChooseStartupDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-14
//
// Step BO-2 of table T-077 -- "表 T-034 の順で最初に開く文書を決める" -- and
// nothing else. The order is table T-034 itself:
//
//     BT-1  the document embedded in the file        (FR-067)
//     BT-2  the document handed at startup           (path R-1 of table T-008)
//     BT-4  the template for the first screen        (FR-027)
//
// ⚠️ BT-3, the autosaved document, was the third rank until CR-280 retired the
// autosave on the user's ruling (2026-08-29). Its seat number stays burnt, so
// the rows below run BT-1, BT-2, BT-4 and the order is still the table's.
// FR-062 now states the order and nothing else: what becomes of a rank that
// lost belongs to that rank's own requirement.
//
// ⚠️ Nothing here reads a file, storage, the clock or the DOM. LY-5 leaves every
// outside value to the Framework, so all three candidates ARRIVE AS VALUES,
// already decoded and already through FR-023's validation (table T-008 marks
// R-1 untrusted, and BT-1 rides in on the file itself). A candidate that
// could not be read arrives as `unreadable` / `entryCountNotOne`, never as
// `read`.
//
// ⚠️ The figure source (docs/spec/_source/components.json) draws an edge
// ChooseStartupDocument -> ValidateImportedDocument, "checks each candidate".
// That call is NOT made here, although `validateImportedDocument` (PI-13,
// UF-22) is written now and its signature could be reached: the candidate
// shapes below already carry the outcome that check produces, so the caller
// that decodes a candidate is where the check belongs, and moving it inside
// later changes this file only. ⚠️ It is a decision of this file, not of the
// specification. ⛔ THE CALLER OWES IT TODAY: `single-html-shell.ts` hands
// `none` for the three untrusted ranks, and its own STOP note records what
// each of them needs -- this check and FR-088's IV-17 gate -- before it may
// hand over anything else.
//
// ⚠️ Failure is a value. This function never throws: AG-8 wants the caller told,
// and R7.10 wants it told by the return value. Everything FR-067 and FR-062
// require to be TOLD leaves in `notices`; who gathers those onto the one
// startup screen NT-4 demands is the ScreenRenderer's business (UF-67), not this
// unit's.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { Document } from '../../entity/document-model/document/document'

/** The three rows of table T-034, in the order the table lists them. */
export type StartupRow = 'BT-1' | 'BT-2' | 'BT-4'

/**
 * BT-1 -- the document embedded in the single `.html` (FR-067).
 *
 * FR-067 names two ways this row can fail and treats them alike: the embedded
 * document cannot be read, or the file does not hold exactly one embedding slot
 * ("入れ口が 1 つでない"). Both must be told and both descend to the next rank.
 */
export type EmbeddedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document }
  | { readonly kind: 'unreadable' }
  /** ⚠️ `entryCount` is 0 or 2 and above; exactly one is the `read` case. */
  | { readonly kind: 'entryCountNotOne'; readonly entryCount: number }

/**
 * BT-2 -- the document handed at startup. The path is R-1 of table T-008 and
 * what happens to it after it is opened is FR-087's.
 *
 * ⚠️ `unreadable` descends to BT-4 and raises a notice, the same way BT-1 does.
 * That is a reading, not a quotation: FR-067 spells the descent out for BT-1,
 * but BT-2 has no sentence of its own. Table T-034 is an ORDER, so a rank that
 * yields no document is passed
 * over, and NT-1 of table T-037 makes telling the person a MUST wherever input
 * is turned away. ⚠️ It is a decision of this file, not of the specification.
 */
export type HandedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document }
  | { readonly kind: 'unreadable' }

/**
 * The three candidates of table T-034, as SingleHtmlShell hands them over.
 *
 * ⚠️ `template` is not optional. The order has to end somewhere, and FR-067 says
 * in as many words that a lost BT-1 descends rather than starting empty ("空で
 * 起動するのではない"). FR-027 keeps exactly one template and FR-095 returns to
 * this same state, so BT-4 always yields a document.
 *
 * ⚠️ What is IN that template is FR-027's (newly written, and neutral as to
 * industry and product down to the identifier values) and not this unit's -- it
 * arrives as a value like the other three.
 */
export interface StartupCandidates {
  readonly embedded: EmbeddedCandidate
  readonly handed: HandedCandidate
  readonly template: Document
}

/** One thing the startup MUST tell the person about (FR-076, table T-037). */
export type StartupNoticeCode =
  | 'embeddedUnreadable'
  | 'embeddedEntryCountNotOne'
  | 'handedUnreadable'

export interface StartupNotice {
  /** The row of table T-034 the notice is about. */
  readonly row: StartupRow
  /** The requirement that makes telling a MUST. */
  readonly rule: string
  readonly code: StartupNoticeCode
}

export interface StartupChoice {
  /** The row of table T-034 that won. */
  readonly row: StartupRow
  /** The document BO-3 and BO-4 then work from. */
  readonly document: Document
  /** In the order of table T-034, so the one screen reads top down. */
  readonly notices: readonly StartupNotice[]
}

/**
 * Everything that must be told, in the order of table T-034.
 *
 * @purity pure
 */
function noticesOfCandidates(candidates: StartupCandidates): readonly StartupNotice[] {
  const notices: StartupNotice[] = []

  // FR-067: "埋め込まれた文書が読み取れないとき、または入れ口が 1 つでないときは、
  // 黙って捨てずに通知すること（MUST）."
  if (candidates.embedded.kind === 'unreadable') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedUnreadable' })
  }
  if (candidates.embedded.kind === 'entryCountNotOne') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedEntryCountNotOne' })
  }

  // NT-1 of table T-037: input that is turned away is named and explained.
  if (candidates.handed.kind === 'unreadable') {
    notices.push({ row: 'BT-2', rule: 'FR-076', code: 'handedUnreadable' })
  }

  return notices
}

/**
 * Step BO-2 of table T-077: the first document to open, in the order of table
 * T-034.
 *
 * @purity pure
 */
export function chooseStartupDocument(candidates: StartupCandidates): StartupChoice {
  // Table T-034 IS this array -- the three rows in the table's order, each paired
  // with the document it yields or `null` when it yields none. Written as the
  // table rather than as three nested branches, so the order can be read off it.
  const order: readonly (readonly [StartupRow, Document | null])[] = [
    ['BT-1', candidates.embedded.kind === 'read' ? candidates.embedded.document : null],
    ['BT-2', candidates.handed.kind === 'read' ? candidates.handed.document : null],
    ['BT-4', candidates.template],
  ]

  const won = order.find((entry) => entry[1] !== null)
  // BT-4 always yields one, so `won` is never undefined. The fallback repeats it
  // instead of asserting it, because an assertion here would be the one place a
  // startup could end with no document at all.
  const row = won === undefined ? 'BT-4' : won[0]
  const document = won === undefined || won[1] === null ? candidates.template : won[1]

  return { row, document, notices: noticesOfCandidates(candidates) }
}
