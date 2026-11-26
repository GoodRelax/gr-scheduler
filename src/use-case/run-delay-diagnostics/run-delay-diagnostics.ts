// File: RunDelayDiagnostics: computes the delay diagnosis of use case UC-015 on a document by its own calendar.
// @unit      UF-221  (docs/spec/05-07-design.md, table T-075)
// @component RunDelayDiagnostics, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-55

import type { Document } from '../../entity/document-model/document/document'
import {
  diagnoseDelay,
  workingCalendarOf,
  type DelayDiagnosticsReport,
} from '../../entity/document-model/schedule/schedule'

// Provisional: OPQ-25
// Spec: UC-015, FR-130
/** @purity pure */
export function delayDiagnosisOf(document: Document): DelayDiagnosticsReport {
  return diagnoseDelay(document, workingCalendarOf(document.schedule))
}
