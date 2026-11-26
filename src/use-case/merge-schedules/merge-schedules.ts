// File: MergeSchedules: names the tasks that use case UC-014 finds missing since the last import of the same master.
// @unit      UF-219  (docs/spec/05-07-design.md, table T-075)
// @component MergeSchedules, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-53

import type { Document } from '../../entity/document-model/document/document'
import type { ImportReport } from '../import-document/import-document'

// Provisional: OPQ-25
// Spec: UC-014, MG-11, MG-14, RS-73
/** @purity pure */
export function missingTaskNamesOf(current: Document, report: ImportReport | null): readonly (string | null)[] {
  if (report === null) return []
  const missing = new Set(report.taskUidsMissingSinceLastImport)
  return current.schedule.tasks.filter((task) => missing.has(task.uid)).map((task) => task.name)
}
