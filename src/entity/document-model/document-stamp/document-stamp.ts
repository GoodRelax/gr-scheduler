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
// FR-063 holds the rule: an integer that rises by one, plus who wrote last and
// when, carried in the document and written into the JSON.
//
// AG-2 of table T-035 is why `isStampMatched` compares all three and not just
// the revision: a change to the presentation group alone does not raise the
// revision (FR-063), so a revision-only check would let one writer wipe out
// what another had just done to it.
//
// The three fields themselves are generated from erd.json below.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

export {}

// <generated from docs/spec/_assets/source/erd.json -- do not edit by hand>
/** ET-16 of table T-056. */
export interface DocumentStamp {
  /** AT-127 */
  readonly revision: number
  /** AT-128 */
  readonly lastEditedBy: string
  /** AT-129 */
  readonly updatedAt: string
}

/** ET-17 of table T-056. */
export interface ChangeLogEntry {
  /** AT-130 */
  readonly revision: number
  /** AT-131 */
  readonly editedBy: string
  /** AT-132 */
  readonly explanation: string
  /** AT-133 */
  readonly changedAt: string
}
// </generated>

/**
 * The stamp after one write. FR-063: the revision rises by one, and who wrote
 * last and when are replaced every time -- including a write that touched the
 * presentation group only, which does NOT raise the revision.
 *
 * @purity pure
 */
export function advancedStamp(
  stamp: DocumentStamp,
  editedBy: string,
  updatedAt: string,
  options: { readonly raisesRevision: boolean },
): DocumentStamp {
  return {
    revision: options.raisesRevision ? stamp.revision + 1 : stamp.revision,
    lastEditedBy: editedBy,
    updatedAt,
  }
}

/**
 * Whether a writer read the document it is now writing over (AG-2). All three
 * fields, because the revision alone cannot see a presentation-group write.
 *
 * @purity pure
 */
export function isStampMatched(read: DocumentStamp, current: DocumentStamp): boolean {
  return (
    read.revision === current.revision &&
    read.lastEditedBy === current.lastEditedBy &&
    read.updatedAt === current.updatedAt
  )
}

/**
 * Whether `candidate` is a later state of the same document than `held`. A
 * higher revision wins; at the same revision the later `updatedAt` wins, which
 * is what FR-063 leaves for a change that did not raise the revision.
 *
 * @purity pure
 */
export function isNewerStamp(candidate: DocumentStamp, held: DocumentStamp): boolean {
  if (candidate.revision !== held.revision) return candidate.revision > held.revision
  return candidate.updatedAt > held.updatedAt
}
