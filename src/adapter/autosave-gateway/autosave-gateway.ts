// AutosaveGateway -- public entry of this folder.
//
// @unit      UF-43   (docs/spec/05-07-design.md, table T-075)
// @component AutosaveGateway, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-23
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHY THIS COMPONENT EXISTS (CP-23). Two rules meet over one place. FR-026
// says the accumulated edits go there once at the idle boundary and come back
// at the next start; IO-5 of table T-024 says what comes back is untrusted
// input. Both need the document turned into text and back, and neither may
// touch the host. So this file holds the turning and the judging, and IF-4
// holds the place -- which is why the component declares a seam at all.
//
// ⭐ THE HARD DECISIONS, in one place:
//
//   1. WHEN a snapshot is written is NOT here. FT-4 of table T-078 gives the
//      clock to the shell and counts the idle boundary (S-112 of table T-211)
//      among the three things it watches. `_source/components.json` draws the
//      matching edge SingleHtmlShell -> AutosaveGateway, "saves at the idle
//      boundary". ⛔ So no timer, no idle counter and no clock is declared in
//      this folder; `savedAt` arrives as an argument (R7.3).
//   2. WHAT is written is a `GRS JSON` text. FR-026 says the autosave writes
//      every item and points at FR-024 for what that means, and
//      `_source/components.json` draws the edge AutosaveGateway ->
//      DocumentCodec, "gets the string to store". ⭐ So this file mints no
//      format of its own: PI-20 already owns that one.
//   3. WHAT IS NOT WRITTEN: the undo history. LM-9 of table T-004 settles it --
//      recovering from an autosave does not bring the history back -- and gives
//      the reason, so a snapshot that carried an `EditHistory` would be
//      contradicting a limitation the product has already published.
//   4. THE THREE STATES OF FR-061 are split between two components; see the
//      note on `SnapshotSaveOutcome`.
//
// ⛔ WHAT THIS COMPONENT DOES NOT JUDGE. Whether a restored document is sound
// is FR-023's, and FR-023 puts that in ValidateImportedDocument (CP-13) so that
// the intake paths cannot differ in strictness -- IO-5's "treat it as untrusted
// too" points at that same shared check. This file answers the narrower
// question `documentFromJson` answers: is the text a document at all.
// ⚠️ `validateImportedDocument` (PI-13) is written now and its signature could
// be reached, and the call is still not made here: the outcome below already
// carries the shape a later caller needs, the same way ChooseStartupDocument
// (UF-23) left it. ⚠️ That is a decision of this file, not of the
// specification. ⛔ THE CALLER OWES IT, AND FR-088's GATE WITH IT: a restored
// snapshot is BT-3 of table T-034, which `single-html-shell.ts` hands over as
// `none` today -- its STOP note is where both are recorded.
//
// ⛔ WHAT THIS COMPONENT DOES NOT DECIDE EITHER: which edits are worth a
// snapshot. FR-026 draws that line (a gesture is not an edit, but it does
// restart the wait), and it is drawn where the wait is counted -- see 1. above.
// ⚠️ In particular nothing here compares stamps to skip a write: FR-063 moves
// the schedule instant only for the schedule-data group, and AG-11 of table
// T-035 keeps a settled utterance out of it entirely, so a gateway that saved
// only when that instant moved would silently drop every presentation-group
// edit that FR-024 and WY-1 require a document to come back with.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

import type { Document } from '../../entity/document-model/document/document'
import {
  documentFromJson,
  jsonFromDocument,
  type JsonFault,
} from '../document-codec/document-codec'
import type { DocumentStore, StoreFaultCode } from './document-store'

export type {
  DocumentStore,
  SnapshotReadOutcome,
  SnapshotWriteOutcome,
  StoredSnapshot,
  StoreFaultCode,
} from './document-store'

/**
 * ⚠️ `JsonFault` travels on `SnapshotRestoreOutcome`, so it leaves through this
 * entry as well. It is DocumentCodec's name and stays DocumentCodec's -- this
 * is a re-export, not a second declaration (R4, DRY).
 */
export type { JsonFault } from '../document-codec/document-codec'

/**
 * One document put up for autosaving.
 *
 * ⚠️ Not the same sense of the word as `SnapshotSource` (IF-7): that seam
 * supplies the frozen current value AG-4 of table T-035 asks for, inside one
 * frame. This one is a document written to a place that outlives the page.
 */
export interface DocumentSnapshot {
  /**
   * Whose autosave this is.
   *
   * ⛔ STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what makes two documents the
   * same one. FR-061 makes never confusing two of them a MUST NOT and this key
   * is how that is kept, but nothing names a derivation. `Project.id` is not it
   * (AT-1 is nullable and is marked as not being a primary key), and S-99b of
   * `_assets/tbl-settings.md` names a document identifier for the `Agent API`'s
   * records without defining one. ⭐ ChooseStartupDocument (UF-23) stopped at
   * exactly the same line and only compares two keys; this component only
   * carries one, and never derives it.
   */
  readonly documentKey: string
  /** What FR-024 is asked to write out in full. */
  readonly document: Document
  /**
   * The time the `saved` state shows (FR-061).
   *
   * ⭐ An argument, not a reading. FT-4 of table T-078 gives the clock to the
   * shell, and R7.3 wants such a reading collected at the top and injected --
   * which also leaves the outcome below deterministic for a given call.
   *
   * ⚠️ The spelling is the one AT-129 uses for the stamp: ISO 8601, UTC, to the
   * second. ⛔ It is NOT stored beside the snapshot -- what a stored snapshot
   * holds is table T-034's business through `documentStamp`, and a second time
   * kept next to it would be a second answer to "which document is this".
   */
  readonly savedAt: string
}

/**
 * What one autosave attempt came to.
 *
 * ⭐ TWO OF FR-061'S THREE STATES, AND DELIBERATELY NOT THE THIRD. FR-061 makes
 * telling three apart a MUST -- saved with its time, saving, failed -- but only
 * two of them are outcomes of an attempt. `saving` is true of the stretch
 * BETWEEN asking and being answered, so it belongs to whoever holds the call,
 * not to what the call returns; a value for it here could only ever be a value
 * nobody could observe.
 *
 * ⚠️ HOW THIS RELATES TO THE SCREEN'S HALF. ScreenRenderer (CP-37) publishes its
 * own type for the same three states, because that is what its description of
 * the `App Header` needs (U-28). ⛔ Neither imports the other: Chapter 5.3
 * forbids reaching past a component's public entry, and the two are not the same
 * type anyway -- this one is the answer to one attempt, that one is the state
 * standing on the screen, which also covers "nothing has been attempted yet".
 * ⭐ The caller that holds both is the shell, and mapping one onto the other is
 * its work: `saved` and `failed` land on the like-named states, and `saving` is
 * the state it sets before it calls.
 */
export type SnapshotSaveOutcome =
  /** FR-061 shows the time with this one. */
  | { readonly kind: 'saved'; readonly savedAt: string }
  /**
   * ⚠️ FR-061 wants a notice raised as well as the state shown, and NT-3a of
   * table T-037 makes the next step part of that notice (MUST). ⛔ The words are
   * not written here: FR-038 requires the chosen display language and names no
   * store of translated strings, so what leaves is the code that picks the next
   * step, exactly as ChooseStartupDocument's notices leave as codes.
   */
  | { readonly kind: 'failed'; readonly code: StoreFaultCode }

/**
 * What was found in the place at startup.
 *
 * ⭐ The first three answer BT-3 of table T-034, and are named for the three
 * cases the candidate ChooseStartupDocument (PI-14) takes, so that the shell's
 * mapping is a rename and not a judgement. ⛔ They are not imported from there:
 * that would be an edge `_source/components.json` does not draw, and Chapter 5.2
 * owns which components may lean on which.
 */
export type SnapshotRestoreOutcome =
  /** The place is reachable and holds nothing. */
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly documentKey: string; readonly document: Document }
  /**
   * FR-026 (MUST NOT): a stored snapshot that cannot be recovered is never
   * dropped in silence. ⚠️ `documentKey` is `null` when the place could not say
   * whose it was -- table T-034 then has nothing to compare, and its note leaves
   * such an autosave alone rather than guessing.
   */
  | {
      readonly kind: 'broken'
      readonly documentKey: string | null
      /** NT-1 of table T-037 (MUST): a refusal names which item and why. */
      readonly faults: readonly JsonFault[]
    }
  /**
   * ⚠️ NOT `none`. LM-14 says the store can be refused outright when the file is
   * opened directly, and that is not the same news as an empty store: an empty
   * store means there is nothing to recover, this means it is not known whether
   * there is. ⭐ FR-026 forbids losing a stored document in silence, so the two
   * cannot share one answer.
   */
  | { readonly kind: 'unavailable'; readonly code: StoreFaultCode }

/**
 * Write one snapshot to the place IO-5 of table T-024 names.
 *
 * ⚠️ Writes every time it is asked, and compares nothing against what is already
 * there. Who decides that there is something worth saving is FR-026's idle
 * boundary, counted in the shell (FT-4 of table T-078); a second opinion here
 * would be a second answer to the same question, and the stamp is not usable as
 * one (see the note at the top of this file).
 *
 * ⚠️ Failure comes back as a value. FR-028 states that rule for the other
 * entrance to this product and AG-8 of table T-035 for the other export that can
 * fail; FR-061 needs a state and NT-3a a next step, and neither is buildable
 * from a thrown object.
 *
 * @purity non-pure
 */
export function saveDocumentSnapshot(
  store: DocumentStore,
  snapshot: DocumentSnapshot,
): SnapshotSaveOutcome {
  const written = store.writeSnapshot(snapshot.documentKey, jsonFromDocument(snapshot.document))
  if (!written.ok) return { kind: 'failed', code: written.code }
  return { kind: 'saved', savedAt: snapshot.savedAt }
}

/**
 * Read back what the place is holding, for BT-3 of table T-034.
 *
 * ⚠️ Reads and decodes; it installs nothing. Putting a document in front of the
 * person is one write like any other, and MS-1 of table T-042 keeps every write
 * on the single path through `applyDocumentChange` (PI-8) -- which is the edge
 * `_source/components.json` draws from this component, "asks for a restore".
 * ⭐ That the reading stops short of the writing is what lets this function be
 * `semi-pure-b` while PI-23's other member is not.
 *
 * @purity semi-pure-b
 */
export function restoreDocumentSnapshot(store: DocumentStore): SnapshotRestoreOutcome {
  const found = store.readSnapshot()
  if (!found.ok) return { kind: 'unavailable', code: found.code }
  if (found.snapshot === null) return { kind: 'none' }

  const { documentKey, text } = found.snapshot
  const decoded = documentFromJson(text)
  if (!decoded.ok) return { kind: 'broken', documentKey, faults: decoded.faults }
  // A snapshot the place cannot name is still a snapshot that was read, but it
  // cannot be offered as a candidate: FR-061 (MUST NOT) is precisely about not
  // taking one document's autosave for another's, and there is nothing here to
  // compare. FR-026 keeps it from being dropped in silence, so it leaves as
  // `broken` -- with no faults, because nothing about the text was wrong.
  if (documentKey === null) return { kind: 'broken', documentKey: null, faults: [] }
  return { kind: 'read', documentKey, document: decoded.document }
}
