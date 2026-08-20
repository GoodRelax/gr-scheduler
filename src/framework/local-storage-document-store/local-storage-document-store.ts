// LocalStorageDocumentStore -- public entry of this folder.
//
// @unit      UF-52   (docs/spec/05-07-design.md, table T-075)
// @component LocalStorageDocumentStore, layer Framework (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-29
//
// The implementation of DocumentStore (table T-065 IF-4). CP-29 gives it one
// job: be the place IO-5 of table T-024 names, so that FR-026's autosave has
// somewhere to go and BT-3 of table T-034 has somewhere to look.
//
// ⭐ WHY A COMPONENT OF ITS OWN, next to the gateway that does the autosaving.
// LR-5 (MUST) leaves the implementation of a declared interface to the outer
// layer, and LY-5 makes the Framework the only layer that holds a current
// value -- a stored snapshot is exactly such a value. ⛔ The dependency points
// inward and only inward: this file reads the seam AutosaveGateway declares,
// and AutosaveGateway never learns that Web Storage (path R-3 of table T-008)
// is where its snapshot went.
//
// ⭐ WHAT WAS HARD, in one place:
//
//   1. THE HOST ARRIVES, it is not reached for. R7.3 asks for the reading to be
//      injected and LY-5 already puts the holding of it in this layer.
//      ⚠️ It arrives as a FUNCTION rather than as the object, which LM-14 of
//      table T-004 forces: a browser that refuses the store throws on the
//      property access ITSELF, so a caller that had to evaluate the object
//      before calling could not hand the refusal over as a value (FR-028), and
//      `storeUnavailable` -- the code the seam defines for exactly LM-14 --
//      could never be produced here.
//   2. ONE ENTRY CARRIES BOTH the document key and the text. Two entries would
//      be two writes, and a page killed between them would leave one document's
//      key standing over another document's text -- which is the one thing
//      FR-061 makes a MUST NOT. One entry per write makes that untearable.
//   3. A DAMAGED ENTRY IS STILL A SNAPSHOT. FR-026 (MUST NOT) forbids dropping
//      a stored snapshot in silence, so an entry this file cannot read as its
//      own envelope comes back as a snapshot whose owner is unknown, carrying
//      the raw text, rather than as an empty store. What is wrong with the text
//      is then said by the side that decodes it (NT-1 of table T-037).
//   4. TABLE T-034 ENDS IN A SETTING-ASIDE that no member of IF-4 can perform,
//      and ⛔ the declaration may not be changed from out here. See
//      `quarantineSnapshot` for what that costs and why it is where it is.
//
// ⛔ NOT THIS UNIT'S BUSINESS, in the order somebody is most likely to ask:
//   - WHAT MAKES TWO DOCUMENTS THE SAME ONE. The key arrives as an argument and
//     leaves again unread; this file compares no keys and derives none. Both
//     AutosaveGateway (UF-44) and ChooseStartupDocument (UF-23) stopped at the
//     same line, and moving the stop here would not answer it.
//   - WHEN a snapshot is written. FT-4 of table T-078 counts the idle boundary
//     (S-112 of table T-211) in the shell, so no timer and no clock is declared
//     here.
//   - WHETHER the text is a document. IO-5 (MUST) calls what comes back out
//     untrusted, and FR-023 puts that judgement in one shared place; this file
//     moves text and never reads into it.
//   - THE FOUR ROWS table T-206 keeps in `localStorage` (S-99, S-99a, S-99b,
//     S-99c). They share the place and the prefix, not this seam.
//
// ⚠️ LM-6 stands and cannot be fixed here: every local page on the machine
// shares this store, so what is written is readable by them and stays in plain
// text. FR-061 makes telling the person that a MUST, and NT-5 of table T-037
// is where it is told -- on the screen, not by this file.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  DocumentStore,
  SnapshotReadOutcome,
  SnapshotWriteOutcome,
  StoredSnapshot,
  StoreFaultCode,
} from '../../adapter/autosave-gateway/autosave-gateway'

/**
 * The part of the browser's Web Storage this store touches.
 *
 * ⭐ Declared here rather than taken from the DOM library, and narrow on
 * purpose. Three members are all IO-5 needs, and a store that cannot enumerate
 * or clear the place cannot reach the four rows of table T-206 that share it.
 * ⚠️ `Storage` satisfies this shape, so the caller hands over the real thing
 * without a cast, and a test hands over an object with three members and needs
 * no browser (the tests run on node).
 */
export interface WebStorage {
  /** @purity semi-pure-b */
  getItem(key: string): string | null
  /** @purity non-pure */
  setItem(key: string, value: string): void
  /** @purity non-pure */
  removeItem(key: string): void
}

/**
 * The prefix on every key this store writes.
 *
 * ⭐ FR-026's RATIONALE requires the keys in `localStorage` to carry a prefix
 * of this tool's own -- the store is shared by every local page on the machine
 * (LM-6), so an unprefixed key is a collision waiting to happen. The rule is
 * the specification's; the spelling is not in it, and this one is the fragment
 * the previous project settled (previous-project-result/09-architecture/
 * architecture-entry-ja.md section 3, from 05-security-a11y/security-design.md
 * section 5).
 *
 * ⚠️ Published because it is the only way a test can hold this file to FR-026
 * without copying the string, and because the four rows table T-206 keeps in
 * `localStorage` need the SAME prefix: when they get an owner, this constant
 * moves to a place both can read rather than being typed a second time (R4).
 *
 * @provisional PD-110
 */
export const WEB_STORAGE_KEY_PREFIX = 'grsched.'

/**
 * The one key the autosave stands under.
 *
 * ⛔ ONE SLOT, not one per document key -- and this is a decision of this file,
 * not of the specification. `readSnapshot` is told no key (IF-4), so it has to
 * answer with one snapshot whichever way this goes; with a slot per key it
 * would have to CHOOSE among the ones stored, and the rule for choosing is
 * precisely what the declaring side searched for and did not find. One slot
 * needs no such rule. FR-061's MUST NOT survives it, because the key travels
 * inside the entry and comes back for the comparison table T-034 makes.
 * ⚠️ WHAT IT COSTS: table T-034's note leaves another document's autosave
 * alone at startup, and with one slot the next write replaces it anyway. That
 * is the one sentence a slot per document key would keep in full.
 *
 * @provisional PD-111
 */
const SNAPSHOT_KEY = `${WEB_STORAGE_KEY_PREFIX}autosave`

/**
 * Where a snapshot goes when it is set aside.
 *
 * ⭐ FR-062 and table T-034's closing note: a broken autosave is told and then
 * SET ASIDE. Set aside is not discarded -- FR-026 (MUST NOT) and FR-062 (MUST
 * NOT) both forbid the losing or unreadable snapshot being dropped in silence
 * -- and it is not left standing either, or the next start would offer the same
 * unreadable thing again. A second key is the whole of the difference.
 *
 * ⚠️ One slot here too, so a second setting-aside replaces the first. The one
 * being replaced has already been told to the person (the notice comes first,
 * by the note's own order), and letting a graveyard grow would spend the
 * ceiling LM-4 names on documents already known to be unrecoverable.
 *
 * @provisional PD-112
 */
const QUARANTINE_KEY = `${SNAPSHOT_KEY}.quarantine`

/**
 * What CP-29 publishes: the implementation of IF-4, and the one operation
 * FR-062 needs that IF-4 does not have a member for.
 *
 * ⛔ The seam is NOT widened to carry it. IF-4 is declared by the inner layer
 * (LR-5) and this file may not change it; the setting-aside is also nothing the
 * inner layer can ask for, since ChooseStartupDocument returns `quarantine` as
 * a disposition and the shell is what acts on it. So it lands on the concrete
 * store, inside the layer that already holds the place.
 */
export interface LocalStorageDocumentStore extends DocumentStore {
  /**
   * Move the stored snapshot out of the way, keeping it.
   *
   * ⭐ Answers `{ kind: 'quarantine' }` of ChooseStartupDocument (PI-14), which
   * is table T-034's third sentence about the losing autosave.
   *
   * ⚠️ Reports the same two codes as a write, because it is one: the outcome
   * type is reused rather than restated (R4), and NT-3a's next step for a
   * failed setting-aside is the same next step as for a failed autosave.
   * ⚠️ Answers `ok` when the place holds nothing -- there is nothing to set
   * aside, which is not a failure.
   *
   * @purity non-pure
   */
  quarantineSnapshot(): SnapshotWriteOutcome
}

/** What one read of the place came to. */
type StoredEntry =
  | { readonly ok: true; readonly stored: string | null }
  | { readonly ok: false; readonly code: StoreFaultCode }

/**
 * Which of the two codes a refusal from the host is.
 *
 * ⭐ The names and the numbers are the HOST's own, not the specification's: a
 * full store answers with a quota error, whose spelling and legacy number both
 * differ between browsers. ⚠️ Everything else is `storeUnavailable`, which is
 * the rule the seam states for an implementation that cannot tell the two
 * apart -- of the next steps NT-3a wants, the one that fits an unreachable
 * store fits a full one too.
 *
 * @purity pure
 */
function faultOfRefusal(refusal: unknown): StoreFaultCode {
  const named = (refusal ?? {}) as { readonly name?: unknown; readonly code?: unknown }
  const isPlaceFull =
    named.name === 'QuotaExceededError' ||
    named.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    named.code === 22 ||
    named.code === 1014
  // LM-4 of table T-004 is the ceiling being hit, and NT-6 of table T-037 makes
  // telling the person about it a MUST -- which is why the two codes are told
  // apart here at all rather than answered as one failure.
  return isPlaceFull ? 'capacityExceeded' : 'storeUnavailable'
}

/**
 * One entry as this file wrote it, packed into the one string the host holds.
 *
 * @purity pure
 */
function storedTextOf(documentKey: string, text: string): string {
  return JSON.stringify({ documentKey, text })
}

/**
 * The same, read back.
 *
 * ⚠️ Anything that is not this file's envelope comes back as a snapshot with no
 * owner and the raw text: FR-026 (MUST NOT) forbids a stored snapshot being
 * dropped in silence, and `StoredSnapshot.documentKey` has a `null` for exactly
 * "still holding one, can no longer say whose". ⛔ Reporting an empty store
 * instead would be that silent drop, and reporting a fault would say the place
 * could not be reached, which is a different piece of news (LM-14).
 *
 * @purity pure
 */
function snapshotOfStoredText(stored: string): StoredSnapshot {
  // One answer for every way the entry can fail to be this file's envelope,
  // named once so the three ways read as the one case they are.
  const ownerUnknown: StoredSnapshot = { documentKey: null, text: stored }

  let envelope: unknown
  try {
    envelope = JSON.parse(stored)
  } catch {
    return ownerUnknown
  }
  if (typeof envelope !== 'object' || envelope === null) return ownerUnknown

  const { documentKey, text } = envelope as {
    readonly documentKey?: unknown
    readonly text?: unknown
  }
  if (typeof documentKey !== 'string' || typeof text !== 'string') return ownerUnknown
  return { documentKey, text }
}

/**
 * Read one key, with the host's refusal turned into a value.
 *
 * ⭐ The consistency unit is this one call (R7.4): another local page shares the
 * place (LM-6), so nothing read here may be assumed to still stand afterwards,
 * and no member below reads twice.
 *
 * @purity semi-pure-b
 */
function entryAt(reachWebStorage: () => WebStorage | null, key: string): StoredEntry {
  try {
    const storage = reachWebStorage()
    if (storage === null) return { ok: false, code: 'storeUnavailable' }
    return { ok: true, stored: storage.getItem(key) }
  } catch (refusal) {
    return { ok: false, code: faultOfRefusal(refusal) }
  }
}

// ⚠️ Below this line the members write. R7.7 orders a unit pure, then
// semi-pure, then non-pure, which is why they do not stand in the order IF-4
// declares them in.

/**
 * Put one string under one key, replacing whatever stood there.
 *
 * @purity non-pure
 */
function putEntry(
  reachWebStorage: () => WebStorage | null,
  key: string,
  value: string,
): SnapshotWriteOutcome {
  try {
    const storage = reachWebStorage()
    if (storage === null) return { ok: false, code: 'storeUnavailable' }
    storage.setItem(key, value)
    return { ok: true }
  } catch (refusal) {
    return { ok: false, code: faultOfRefusal(refusal) }
  }
}

/**
 * Move whatever stands under one key to another key.
 *
 * ⭐ Copies first and drops second, deliberately. A page that dies between the
 * two leaves the snapshot standing under both keys, which the next start reads
 * as an autosave it can tell the person about; the other order would leave it
 * under neither, which is the silent loss FR-026 forbids.
 *
 * @purity non-pure
 */
function moveEntry(
  reachWebStorage: () => WebStorage | null,
  fromKey: string,
  toKey: string,
): SnapshotWriteOutcome {
  try {
    const storage = reachWebStorage()
    if (storage === null) return { ok: false, code: 'storeUnavailable' }
    const stored = storage.getItem(fromKey)
    if (stored === null) return { ok: true }
    storage.setItem(toKey, stored)
    storage.removeItem(fromKey)
    return { ok: true }
  } catch (refusal) {
    return { ok: false, code: faultOfRefusal(refusal) }
  }
}

/**
 * The store IF-4 asks for, standing on the browser's Web Storage.
 *
 * ⭐ What the caller must supply: a function that yields the store, or `null`
 * when the host has none. ⚠️ It is called on every operation rather than once,
 * and it is allowed to throw -- LM-14 lets a browser refuse the store outright
 * when the file was opened directly, and that refusal is this unit's to turn
 * into a value (FR-028), not the caller's. In a browser it is
 * `() => window.localStorage`.
 *
 * ⛔ Nothing of the document is understood in here, and nothing of this file's
 * own is added beside the text: FR-026 (MUST NOT) keeps secrets out of this
 * place, and the only way to be sure of that is to write exactly what was
 * handed over.
 *
 * @purity pure
 */
export function localStorageDocumentStore(
  reachWebStorage: () => WebStorage | null,
): LocalStorageDocumentStore {
  return {
    /**
     * BT-3 of table T-034 looks here.
     *
     * @purity semi-pure-b
     */
    readSnapshot(): SnapshotReadOutcome {
      const entry = entryAt(reachWebStorage, SNAPSHOT_KEY)
      if (!entry.ok) return { ok: false, code: entry.code }
      if (entry.stored === null) return { ok: true, snapshot: null }
      return { ok: true, snapshot: snapshotOfStoredText(entry.stored) }
    },

    /**
     * FR-026's autosave lands here, whole, every time it is asked for.
     *
     * ⚠️ The key is stored beside the text and never looked at: what makes two
     * documents the same one is not decided anywhere, and a store that started
     * reading into the key would be deciding it.
     *
     * @purity non-pure
     */
    writeSnapshot(documentKey: string, text: string): SnapshotWriteOutcome {
      return putEntry(reachWebStorage, SNAPSHOT_KEY, storedTextOf(documentKey, text))
    },

    /**
     * Table T-034's "told, then set aside", for the broken autosave.
     *
     * @purity non-pure
     */
    quarantineSnapshot(): SnapshotWriteOutcome {
      return moveEntry(reachWebStorage, SNAPSHOT_KEY, QUARANTINE_KEY)
    },
  }
}
