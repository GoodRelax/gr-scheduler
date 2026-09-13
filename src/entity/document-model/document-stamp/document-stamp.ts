// DocumentStamp -- public entry of this folder.
//
// @unit      UF-3   (docs/spec/05-07-design.md, table T-075)
// @component DocumentStamp, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-3
//
// FR-063. Never compare two instants with `<` or `>`: an undo restores an
// earlier stamp (FR-031) and a wall clock can run backwards.

export {}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/erd.json
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/** ET-16 of table T-056. */
export interface DocumentStamp {
  /** AT-127 */
  readonly scheduleUpdatedUtc: string
  /** AT-128 */
  readonly lastEditedBy: string
  /** AT-129 */
  readonly settingsUpdatedUtc: string
  /** AT-140 */
  readonly fileSavedUtc: string | null
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
  readonly changedUtc: string
}
// </generated>

/**
 * Step WS-5 of table T-067 (FR-063).
 *
 * `hasMovedSchedule` is told, never derived: what moved is known where the new
 * document was built (WS-3), and a second derivation could disagree with it.
 *
 * Two writes in the same second leave the schedule instant unchanged, and need
 * no discriminator: AG-2 settles that as last-writer-wins, and watchers wake
 * from `hasMovedSchedule`, not the instant (AG-6).
 *
 * @purity pure
 */
export function advancedStamp(
  stamp: DocumentStamp,
  editedBy: string,
  updatedUtc: string,
  options: { readonly hasMovedSchedule: boolean },
): DocumentStamp {
  return {
    scheduleUpdatedUtc: options.hasMovedSchedule ? updatedUtc : stamp.scheduleUpdatedUtc,
    lastEditedBy: editedBy,
    settingsUpdatedUtc: updatedUtc,
    // AT-140 moves only on a file write (FR-101).
    fileSavedUtc: stamp.fileSavedUtc,
  }
}

/**
 * Whether a writer read the document it is now writing over (AG-2, FR-063).
 *
 * Table T-034 asks the same question of a losing autosave, so the startup
 * comparison is this function, not a second one.
 *
 * @purity pure
 */
export function isStampMatched(read: DocumentStamp, current: DocumentStamp): boolean {
  return (
    read.scheduleUpdatedUtc === current.scheduleUpdatedUtc &&
    read.lastEditedBy === current.lastEditedBy &&
    read.settingsUpdatedUtc === current.settingsUpdatedUtc
  )
}
