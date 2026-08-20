// AutosaveGateway -- declares the interface DocumentStore (table T-065 IF-4).
//
// @unit      UF-44   (docs/spec/05-07-design.md, table T-075)
// @component AutosaveGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      DocumentStore, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHY THE SEAM EXISTS. IO-5 of table T-024 is the one row that names a place
// an autosave goes, and reaching that place needs the host. LR-5 leaves the
// implementation to the Framework (CP-29) and LR-6 keeps the browser out of the
// inner layers, so what crosses here is text and nothing else.
//
// ⭐ TWO MEMBERS, ONE WRITE AND ONE READ. FR-026 asks the place for exactly two
// things -- take the accumulated edits once, and give them back at the next
// start -- and nothing else in the specification asks this seam for a third.
// ⚠️ Table T-075 lets both purities sit on one entry (the note under UF-71), so
// a writing member and a reading member on one interface is the shape the
// specification expects here, not a violation of R7.9.
//
// ⛔ NOT THIS SEAM'S BUSINESS, although they share the store IO-5 names: the
// four rows table T-206 marks as kept in `localStorage` (S-99, S-99a, S-99b,
// S-99c). IF-4 supplies the place the autosave goes and nothing else, and
// hanging those four here would give one interface four unrelated reasons to
// change (R2.5).
//
// ⛔ NO CLOCK AND NO TIMER CROSS THIS SEAM. FT-4 of table T-078 gives reading
// the clock to the shell and counts the idle boundary (S-112 of table T-211)
// among the three things it watches for, so WHEN a snapshot is written is
// settled on the far side of this file. A timer declared here would be a second
// answer to a question table T-078 has already answered.
//
// ⛔ NO KEY IS DERIVED HERE. FR-061 makes it a MUST NOT that two documents'
// autosaves be taken for one another, and `documentKey` is how that is kept
// straight -- but no requirement says what makes two documents the same one.
// ChooseStartupDocument (UF-23) carries the same STOP note and only ever
// compares two keys; this file only carries one.

/**
 * Why the store could not take a snapshot, or could not give one back.
 *
 * ⭐ Two codes, because the specification names two ways this place fails and no
 * others: LM-4 of table T-004 has a ceiling that can be reached (and NT-6 of
 * table T-037 makes telling the person about it a MUST), and LM-14 has a
 * browser that refuses the store outright when the file is opened directly.
 *
 * ⚠️ An implementation that cannot tell which of the two it hit reports
 * `storeUnavailable`. That is a decision of this file, not of the
 * specification: of the next steps NT-3a requires, the one that fits an
 * unavailable store fits a full one too, and the one that fits a full store
 * (discarding an older autosave) does nothing when the store cannot be reached.
 */
export type StoreFaultCode =
  /** LM-4 / NT-6: the place is full. */
  | 'capacityExceeded'
  /** LM-14: the place cannot be reached at all. */
  | 'storeUnavailable'

/** The store took it. */
export type SnapshotWriteOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: StoreFaultCode }

/**
 * One snapshot as the store held it.
 *
 * ⚠️ TEXT, NOT A DOCUMENT. Decoding is AutosaveGateway's, because IO-5 (MUST)
 * treats what comes back out as untrusted input: a seam that handed back a
 * `Document` would have decided the text was one before anybody checked.
 */
export interface StoredSnapshot {
  /**
   * Whose autosave this is, as it was handed to `writeSnapshot`.
   *
   * ⚠️ `null` when the store still holds a snapshot but can no longer tell whose
   * it is. It cannot stand as BT-3's candidate then -- there is nothing to
   * compare, and FR-061's MUST NOT is exactly about not guessing -- but FR-026
   * forbids dropping it in silence, so it has to come back rather than be
   * reported as an empty store.
   */
  readonly documentKey: string | null
  /** What `writeSnapshot` was given. */
  readonly text: string
}

/** ⚠️ `snapshot` is `null` for an empty store, which is not a failure. */
export type SnapshotReadOutcome =
  | { readonly ok: true; readonly snapshot: StoredSnapshot | null }
  | { readonly ok: false; readonly code: StoreFaultCode }

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface DocumentStore {
  /**
   * Put one snapshot in the place, replacing whatever stood under the same key.
   *
   * ⭐ The text is a whole `GRS JSON` document, because FR-026 says the autosave
   * writes out every item and points at FR-024 for what that means. ⚠️ So the
   * cost of one call rises with the document, which is the reason FR-026 forbids
   * writing on every edit -- and the reason the ceiling LM-4 names is reachable
   * from here at all.
   *
   * ⛔ The two arguments are separate rather than one record so that the key can
   * never arrive absent: a store cannot keep two documents apart (FR-061, MUST
   * NOT) if it is allowed to take a snapshot that names no document.
   *
   * ⚠️ Failure is a value, never an exception. The screen has a state for it
   * (FR-061) and a notice to raise (NT-3a of table T-037), and neither can be
   * built from a thrown object -- FR-028 states the same rule for the other
   * entrance to this product.
   *
   * @purity non-pure
   */
  writeSnapshot(documentKey: string, text: string): SnapshotWriteOutcome

  /**
   * The snapshot the place is holding, or `null` when it holds none.
   *
   * ⭐ Takes no key. Table T-034's closing note has to be able to say "a
   * different document, leave it alone", which is a sentence about an autosave
   * found BEFORE its owner is known; a read that had to be told the key could
   * never reach that case.
   *
   * ⛔ STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: whether the place holds more
   * than one snapshot at a time, and if it does, which one BT-3 offers. Looked
   * in FR-026 (it fixes when a write happens and that a broken snapshot is told,
   * not how many slots there are), in FR-061 and LM-6 (they fix that two
   * documents are never confused, which one slot carrying its key satisfies as
   * well as many slots do), in table T-034 (an order over one candidate), in
   * table T-024's IO-5, and in `_assets/tbl-settings.md` (table T-211 has a
   * ceiling for an import and none for a store). ⭐ This seam is neutral on it:
   * it asks for the one snapshot BT-3 offers, so the answer lands wholly inside
   * CP-29 and this side never needs reopening.
   *
   * ⚠️ Not deterministic: another page on the same machine shares this place
   * (LM-6), so two calls can answer differently.
   *
   * @purity semi-pure-b
   */
  readSnapshot(): SnapshotReadOutcome
}
