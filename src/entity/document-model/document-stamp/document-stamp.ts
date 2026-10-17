// DocumentStamp: the stamp a write advances and a writer is matched against.
// @unit      UF-3   (docs/spec/05-07-design.md, table T-075)
// @component DocumentStamp, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-3

export {}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/erd.json
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/** ET-16 of table T-056. */
export interface DocumentStamp {
  /** AT-127 */
  readonly scheduleUpdatedAt: string
  /** AT-128 */
  readonly lastEditedBy: string
  /** AT-129 */
  readonly settingsUpdatedAt: string
  /** AT-140 */
  readonly fileSavedAt: string | null
}

/** ET-17 of table T-056. */
export interface ChangeLogEntry {
  /** AT-130 */
  readonly ordinal: number
  /** AT-131 */
  readonly editedBy: string
  /** AT-132 */
  readonly explanation: string
  /** AT-133 */
  readonly changedAt: string
}
// </generated>

/** @purity pure */
export function advancedStamp(
  stamp: DocumentStamp,
  editedBy: string,
  updatedAt: string,
  options: { readonly hasUpdatedSchedule: boolean },
): DocumentStamp {
  return {
    scheduleUpdatedAt: options.hasUpdatedSchedule ? updatedAt : stamp.scheduleUpdatedAt,
    lastEditedBy: editedBy,
    settingsUpdatedAt: updatedAt,
    fileSavedAt: stamp.fileSavedAt,
  }
}

/** @purity pure */
export function isStampMatched(read: DocumentStamp, current: DocumentStamp): boolean {
  return (
    read.scheduleUpdatedAt === current.scheduleUpdatedAt &&
    read.lastEditedBy === current.lastEditedBy &&
    read.settingsUpdatedAt === current.settingsUpdatedAt
  )
}
