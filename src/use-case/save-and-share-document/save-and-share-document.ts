// File: SaveAndShareDocument: stamps the document that use case UC-011 saves with the time it is written.
// @unit      UF-218  (docs/spec/05-07-design.md, table T-075)
// @component SaveAndShareDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-52

import type { Document } from '../../entity/document-model/document/document'

// Provisional: OPQ-26
// Spec: UC-011, AT-140, HS-11, IMPS-994
// Why: only the bytes carry the stamp; the held document keeps the one it was opened with (HS-11).
/** @purity pure */
export function documentStampedAt(document: Document, savedAt: string | null): Document {
  return { ...document, documentStamp: { ...document.documentStamp, fileSavedAt: savedAt } }
}
