// ChooseStartupDocument: the first document to open at startup.
// @unit      UF-23   (docs/spec/05-07-design.md, table T-075)
// @component ChooseStartupDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-14

import type { Document } from '../../entity/document-model/document/document'

export type StartupRow = 'BT-1' | 'BT-2' | 'BT-4'

export type EmbeddedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'entryCountNotOne'; readonly entryCount: number }

export type HandedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document }
  | { readonly kind: 'unreadable' }

export interface StartupCandidates {
  readonly embedded: EmbeddedCandidate
  readonly handed: HandedCandidate
  readonly template: Document
}

export type StartupNoticeCode =
  | 'embeddedUnreadable'
  | 'embeddedEntryCountNotOne'
  | 'handedUnreadable'

export interface StartupNotice {
  readonly row: StartupRow
  readonly rule: string
  readonly code: StartupNoticeCode
}

export interface StartupChoice {
  readonly row: StartupRow
  readonly document: Document
  readonly notices: readonly StartupNotice[]
}

/** @purity pure */
function noticesOfCandidates(candidates: StartupCandidates): readonly StartupNotice[] {
  const notices: StartupNotice[] = []

  if (candidates.embedded.kind === 'unreadable') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedUnreadable' })
  }
  if (candidates.embedded.kind === 'entryCountNotOne') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedEntryCountNotOne' })
  }

  if (candidates.handed.kind === 'unreadable') {
    notices.push({ row: 'BT-2', rule: 'FR-076', code: 'handedUnreadable' })
  }

  return notices
}

// see BO-2, T-034
// WHY: ValidateImportedDocument is not called here despite the component edge: candidates
// arrive decoded, so any FR-023 check belongs to the caller that decodes them.
/** @purity pure */
export function chooseStartupDocument(candidates: StartupCandidates): StartupChoice {
  const order: readonly (readonly [StartupRow, Document | null])[] = [
    ['BT-1', candidates.embedded.kind === 'read' ? candidates.embedded.document : null],
    ['BT-2', candidates.handed.kind === 'read' ? candidates.handed.document : null],
    ['BT-4', candidates.template],
  ]

  const won = order.find((entry) => entry[1] !== null)
  const row = won === undefined ? 'BT-4' : won[0]
  const document = won === undefined || won[1] === null ? candidates.template : won[1]

  return { row, document, notices: noticesOfCandidates(candidates) }
}
