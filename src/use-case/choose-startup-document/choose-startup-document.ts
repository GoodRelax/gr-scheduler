// ChooseStartupDocument -- public entry of this folder.
//
// @unit      UF-23   (docs/spec/05-07-design.md, table T-075)
// @component ChooseStartupDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-14
//
// Step BO-2 of table T-077: the first document to open, in the order of table
// T-034, whose row IDs keep the seat of a retired row, so the rows run BT-1,
// BT-2, BT-4.
//
// Every candidate arrives as a value, already decoded, because LY-5 leaves every
// outside value to the Framework.
//
// The figure source (docs/spec/_source/components.json) draws an edge
// ChooseStartupDocument -> ValidateImportedDocument, but that call is not made
// here: the candidate shapes already carry the check's outcome, so the check
// belongs to the caller that decodes a candidate, and moving it inside later
// changes this file only. This is a decision of this file, not of the
// specification. The caller owes it: see the STOP note on BT-1 in
// `single-html-shell.ts`, which holds FR-088's gate but not FR-023's validation.
//
// Failure is a value (R7.10): this function never throws, and everything to be
// told leaves in `notices`; gathering them onto one screen (NT-4) is UF-67's.

import type { Document } from '../../entity/document-model/document/document'

/** The three rows of table T-034, in the order the table lists them. */
export type StartupRow = 'BT-1' | 'BT-2' | 'BT-4'

/** BT-1 -- the document embedded in the single `.html` (FR-067). */
export type EmbeddedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document }
  | { readonly kind: 'unreadable' }
  /** `entryCount` is 0 or 2 and above; exactly one is the `read` case. */
  | { readonly kind: 'entryCountNotOne'; readonly entryCount: number }

/** BT-2 -- the document handed at startup; `unreadable` is OP-14 of table T-024a. */
export type HandedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document }
  | { readonly kind: 'unreadable' }

/**
 * The three candidates of table T-034, as SingleHtmlShell hands them over.
 *
 * `template` is not optional so that the order always ends in a document
 * (FR-067, OP-14 of table T-024a).
 */
export interface StartupCandidates {
  readonly embedded: EmbeddedCandidate
  readonly handed: HandedCandidate
  readonly template: Document
}

/** FR-076, table T-037. */
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

  // FR-067
  if (candidates.embedded.kind === 'unreadable') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedUnreadable' })
  }
  if (candidates.embedded.kind === 'entryCountNotOne') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedEntryCountNotOne' })
  }

  // OP-14 of table T-024a
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
  // Written as the table rather than as nested branches, so the order of table
  // T-034 reads off it; `null` is a row that yields no document.
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
