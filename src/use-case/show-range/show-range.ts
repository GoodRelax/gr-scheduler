// File: ShowRange: decides whether a stored view place of use case UC-007 still names a place in the document.
// @unit      UF-214  (docs/spec/05-07-design.md, table T-075)
// @component ShowRange, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-48

import type { Schedule } from '../../entity/document-model/schedule/schedule'

// Provisional: OPQ-26
// Spec: UC-007, OP-10
/** @purity pure */
export function isPlaceNamed(
  schedule: Schedule,
  scrollDate: string | null,
  scrollTaskGroupId: string | null,
): boolean {
  if (scrollDate === null) return false
  return schedule.taskGroups.some((one) => one.id === scrollTaskGroupId)
}
