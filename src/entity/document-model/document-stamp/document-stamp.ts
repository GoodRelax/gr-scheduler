// DocumentStamp -- public entry of this folder.
//
// @unit      UF-3   (docs/spec/05-07-design.md, table T-075)
// @component DocumentStamp, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-3
//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// FR-063 holds the rule: two UTC instants -- the one the schedule-data group
// last moved at, and the one either group last moved at -- plus who wrote last.
//
// ⛔ THE STAMP IS NOT AN ORDER. FR-063 forbids reading it as one (MUST NOT) and
// makes every judgement on it an equality (MUST), so nothing here compares two
// instants with `<` or `>`. It answers which document this is, never which of
// two is newer -- an undo restores an earlier document stamp and all (FR-031),
// and a wall clock runs backwards over an NTP correction, so an order read off
// the stamp calls a document that IS current "not newer".
//
// The three fields themselves are generated from erd.json below.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

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
 * The stamp after one write, which is step WS-5 of table T-067.
 *
 * FR-063: who wrote last, and the instant EITHER group last moved at, are
 * replaced by every write -- including one that touched the presentation group
 * only. The schedule-data group's own instant moves only when that group moved
 * (MUST), and MUST NOT move for a presentation-only write.
 *
 * ⚠️ `hasMovedSchedule` is a judgement this function is TOLD, never one it
 * makes: what moved is known where the new document was built (WS-3), and a
 * second derivation here would be a second place for AG-6 to disagree with
 * itself.
 *
 * ⚠️ Two writes inside the same second leave the schedule instant unchanged.
 * That is not a defect to paper over with a discriminator: AG-2 settles such a
 * collision as last-writer-wins, and the watchers are woken from
 * `hasMovedSchedule` rather than from the instant (AG-6).
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
  }
}

/**
 * Whether a writer read the document it is now writing over (AG-2), and whether
 * two stamps are the same one at all -- which is the only question FR-063 lets
 * a stamp be asked.
 *
 * All three fields (MUST), because the schedule instant alone cannot see a
 * write that touched the presentation group only. One difference is enough to
 * answer no (MUST).
 *
 * ⭐ Table T-034 asks the same question of a losing autosave, so the startup
 * comparison is this function and not a second one: "same document" and "same
 * stamp" are one judgement now that the ordering is gone.
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
