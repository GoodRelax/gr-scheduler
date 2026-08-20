// FileGateway -- public entry of this folder.
//
// @unit      UF-41   (docs/spec/05-07-design.md, table T-075)
// @component FileGateway, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-22
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ---- why this component exists ---------------------------------------------
//
// CP-22 answers to FR-060 and to table T-024. Between the shell that has a
// `FileStore` and the codecs that speak formats, exactly three jobs are left
// over, and they are the whole of this file:
//
//   1. ONE ENTRY for reading. OP-2 of table T-024a forbids a second way in
//      (MUST NOT) -- the first file and every later one arrive the same way,
//      merge included. `openDocumentFile` is that way in, and the two routes
//      OP-2 names are a parameter rather than two functions, so that a second
//      entry has nowhere to appear.
//   2. THE ENCODING RULE, in one place. CN-5 of table T-003 fixes UTF-8, and
//      table T-024's note forbids ever adding a BOM (MUST NOT) -- it says an
//      implementation that adds one "for spreadsheet compatibility" breaks
//      MSPDI. Bytes cross the seam; characters do not. Put the rule anywhere
//      else and it has to be got right once per format.
//   3. WHICH FILE FR-060 OVERWRITES NEXT. Table T-024's direction column is
//      what decides it; see `isRoundTripForm` below.
//
// ---- ⛔ what this component does NOT do ------------------------------------
//
// It does not know what a schedule is. It hands bytes to whichever codec the
// caller chose and takes bytes back from it. That is deliberate, not lazy:
// UT-5 of table T-063 splits the three formats apart because each answers to a
// different authority (GRS JSON to FR-024, MSPDI to the exchange partner's
// schema, the single .html to FR-067), and two of the three are still stubs. A
// gateway that sniffed the format would hold a fourth authority nobody wrote
// down, and would have to be revisited as each stub is filled in.
//
// It does not judge the content either. FR-023's ceilings, dates and counts
// belong to ValidateImportedDocument (CP-13), which OP-5 puts in front of all
// three intake routes so that no one of them can be laxer than another -- the
// same division `json-codec.ts` states for its own half. What this file does
// contribute to that check is `byteLength`: S-113's ceiling counts bytes, and
// bytes are a thing only the side that touched the file can report.
//
// It decides nothing about the document that was read: OP-3 (replace / merge /
// baseline), OP-4 (the confirmation before discarding), OP-6 (restoring
// settings), OP-9 (the baseline frame) and OP-8 (refusing while another open
// runs) are all ImportDocument's, and OP-10 is the startup order's. This file
// finishes the moment there is text.
//
// ---- failures ---------------------------------------------------------------
//
// ⚠️ Everything comes back as a value. FR-028 forbids throwing (MUST NOT) and
// AG-8 of table T-035 requires the caller to be able to receive a failure as
// one, which is the shape `EditResult` and `JsonDecoding` already take here.
// A fault names its reason so that NT-3a of table T-037 can be obeyed -- a
// notice that reports a failure without a next step is forbidden -- and
// `notices.ts` (UF-67) turns the reason into that next step.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

import type {
  ChosenFileWrite,
  FileStore,
  FileStoreFault,
  FileStoreFaultReason,
  FileWriting,
  OpenedFileContent,
  OpenedFileState,
  OpenRoute,
} from './file-store'

export type {
  ChosenFileWrite,
  FileReading,
  FileStore,
  FileStoreFault,
  FileStoreFaultReason,
  FileWriting,
  OpenedFileContent,
  OpenedFileState,
  OpenRoute,
} from './file-store'

// ------------------------------------------------------------- reading ------

/**
 * Why a file could not be turned into text a codec can be handed.
 *
 * ⭐ The store's four reasons plus one this side can raise. Widening rather
 * than restating keeps the caller on a single `switch`.
 */
export type DocumentFileFaultReason =
  | FileStoreFaultReason
  /**
   * The bytes are not UTF-8. CN-5 of table T-003 fixes the encoding for both
   * formats, so a file that is not in it is not one of ours.
   *
   * ⛔ Refused rather than repaired. Decoding with replacement characters turns
   * a wrongly-encoded MSPDI into a document full of plausible-looking wrong
   * names, and FR-023's whole posture is that an input is never taken on
   * quietly.
   */
  | 'notUtf8'
  /**
   * Asked to overwrite the opened file with a form that only ever goes out.
   * See `isRoundTripForm`.
   */
  | 'notAnOverwriteTarget'

export interface DocumentFileFault {
  readonly reason: DocumentFileFaultReason
  readonly what: string
}

/** One file, read and decoded, with nothing yet made of it. */
export interface OpenedDocumentFile {
  /** ⚠️ The text as the bytes encode it. No format has been guessed. */
  readonly text: string
  /**
   * How many bytes the file occupied. ⭐ This is the number
   * `ValidateImportedDocument` is told: S-113 states its ceiling in bytes, and
   * the decoded text's length is a different quantity that would pass files
   * the ceiling is meant to stop.
   */
  readonly byteLength: number
  readonly fileName: string
}

export type DocumentFileOpening =
  | { readonly ok: true; readonly file: OpenedDocumentFile }
  | { readonly ok: false; readonly fault: DocumentFileFault }

// ------------------------------------------------------------- writing ------

/**
 * The rows of table T-024 whose output is a file.
 *
 * ⛔ IO-5 and IO-6 are absent on purpose: Web Storage is AutosaveGateway's
 * (IF-4) and the clipboard is ClipboardGateway's (IF-5). Neither reaches a
 * file, and putting them here would give two components a route to the same
 * destination.
 *
 * ⚠️ Named for what they are rather than by row ID, matching `ImportFormat`.
 */
export type SaveFileForm = 'grsJson' | 'mspdi' | 'svg' | 'png' | 'singleHtml'

/**
 * What is being written. ⭐ Text and bytes are told apart here rather than at
 * the seam so that the UTF-8 rule is applied once, by this file, to everything
 * that arrives as characters.
 */
export type SaveFileContent =
  | { readonly text: string }
  | { readonly bytes: Uint8Array }

/**
 * FR-060's overwrite and FR-096's export, told apart by where they land.
 *
 * ⭐ A union on the destination, so that a suggested name exists only where one
 * is asked for. Overwriting FR-060's file does not name anything: the name is
 * the file's already, and a second one here would be a name that is silently
 * ignored.
 *
 * ⚠️ Both are one entry, which is what FR-096 requires of the export side
 * (MUST: one entry; MUST NOT: one per format). The form is a field, not a
 * function.
 */
export type DocumentFileSaveRequest =
  | {
      readonly destination: 'openedFile'
      readonly content: SaveFileContent
      readonly form: SaveFileForm
    }
  | {
      readonly destination: 'chosenFile'
      readonly content: SaveFileContent
      readonly form: SaveFileForm
      readonly suggestedFileName: string
    }

export type DocumentFileSaving =
  | { readonly ok: true; readonly openedFile: OpenedFileState }
  | { readonly ok: false; readonly fault: DocumentFileFault }

// ---------------------------------------------------------- the two rules ----

/**
 * Whether a form can be the file FR-060 overwrites.
 *
 * ⭐ Table T-024's direction column decides this and nothing else does: IO-1
 * and IO-2 are the two forms that come in as well as go out, and the other
 * three only ever go out. FR-060 is about a round trip closing on one file, and
 * a form that never comes in cannot close one.
 *
 * ⚠️ Which is also why overwriting with a picture is refused rather than
 * allowed: it would replace the file the person opened with something GRS
 * cannot read back, and the next overwrite-save would have nowhere to go.
 */
const ROUND_TRIP_FORMS: readonly SaveFileForm[] = ['grsJson', 'mspdi']

/** @purity pure */
function isRoundTripForm(form: SaveFileForm): boolean {
  return ROUND_TRIP_FORMS.includes(form)
}

/**
 * The bytes to write.
 *
 * ⛔ `TextEncoder` is UTF-8 and emits no BOM, which is exactly what CN-5 and
 * table T-024's note require -- the note points out that doing nothing is
 * already correct here, and that the damage comes from adding one on purpose.
 * ⚠️ Do not prepend anything to this.
 *
 * @purity pure
 */
function bytesOfContent(content: SaveFileContent): Uint8Array {
  return 'text' in content ? new TextEncoder().encode(content.text) : content.bytes
}

/**
 * The characters those bytes encode, or why they encode none.
 *
 * ⛔ `fatal` rather than replacement characters -- see `notUtf8` above.
 *
 * ⛔ `ignoreBOM` is on, which means a leading U+FEFF is left in the text
 * instead of being swallowed. That is not a preference: whether a file that
 * arrives WITH a BOM is accepted is a line docs/spec does not draw, and CN-5
 * only rules on what GRS itself writes. Leaving the character in place adds no
 * rule of this file's own -- the codec sees exactly what the file held and
 * refuses it -- which is the recoverable direction to be wrong in, because a
 * document accepted by a rule that was too loose cannot be called back.
 * ⚠️ Do not "fix" this without a ruling; it is the accept/refuse boundary
 * itself, not an implementation detail.
 *
 * @purity pure
 */
function textOfBytes(
  bytes: Uint8Array,
): { readonly ok: true; readonly text: string } | { readonly ok: false; readonly what: string } {
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  try {
    return { ok: true, text: decoder.decode(bytes) }
  } catch (why) {
    return { ok: false, what: why instanceof Error ? why.message : String(why) }
  }
}

/** @purity pure */
function fault(reason: DocumentFileFaultReason, what: string): DocumentFileFault {
  return { reason, what }
}

/**
 * A store fault, widened. ⭐ The reasons are carried through unchanged so that
 * the caller sees what actually happened rather than one flattened failure.
 *
 * @purity pure
 */
function faultOfStore(storeFault: FileStoreFault): DocumentFileFault {
  return fault(storeFault.reason, storeFault.what)
}

/** @purity pure */
function savingOfWriting(writing: FileWriting): DocumentFileSaving {
  return writing.ok
    ? { ok: true, openedFile: writing.openedFile }
    : { ok: false, fault: faultOfStore(writing.fault) }
}

/** @purity pure */
function openedOf(file: OpenedFileContent, text: string): OpenedDocumentFile {
  return { text, byteLength: file.bytes.byteLength, fileName: file.fileName }
}

// -------------------------------------------- what is published: reading ----
//
// R7.7's order: everything above is `pure`, this one is `semi-pure-b`, and the
// section below it is the only `non-pure` thing in the folder.

/**
 * Read the file the person pointed at, and hand back its text.
 *
 * ⭐ This is OP-2's single entry. The first file and every later one come
 * through here, and so does the one a merge is about -- OP-2 forbids import
 * having a door of its own (MUST NOT).
 *
 * ⚠️ It stops at text. The caller picks the codec, asks CP-13 for FR-023's
 * verdict, and only then asks OP-3's question. Nothing above is this file's.
 *
 * ⚠️ `semi-pure-b` is PI-22's classification and is kept even though a chooser
 * appears on the screen: what the caller gets back is decided by the file and
 * by the person, never by anything this component remembers, and the tag exists
 * to warn that the answer is neither cheap nor repeatable (R2's note on why
 * such an operation stays a verb).
 *
 * @purity semi-pure-b
 */
export async function openDocumentFile(
  store: FileStore,
  route: OpenRoute,
): Promise<DocumentFileOpening> {
  const reading = await store.readFileToOpen(route)
  if (!reading.ok) return { ok: false, fault: faultOfStore(reading.fault) }

  const decoded = textOfBytes(reading.file.bytes)
  if (!decoded.ok) return { ok: false, fault: fault('notUtf8', decoded.what) }

  return { ok: true, file: openedOf(reading.file, decoded.text) }
}

// -------------------------------------------- what is published: writing ----
//
// ⚠️ `non-pure` from here down: the disk changes.

/**
 * Write one of table T-024's file forms, over the file that was opened or to
 * one the person points at.
 *
 * ⭐ One function for both because FR-060 and FR-096 are two ends of the same
 * act and FR-096 requires a single entry for the export side (MUST). The
 * caller states which, because only the caller knows whether the person asked
 * to save or to export -- IC-2 and IC-3 of table T-109 are separate controls.
 *
 * ⚠️ There is no fallback from `openedFile` to `chosenFile` here. When nothing
 * is open the store answers `noOpenedFile`, and offering the chooser instead is
 * a next step under NT-3a, which is the shell's to offer and the person's to
 * take. Choosing it silently would make one control do the other's job.
 *
 * @purity non-pure
 */
export async function saveDocumentFile(
  store: FileStore,
  request: DocumentFileSaveRequest,
): Promise<DocumentFileSaving> {
  const bytes = bytesOfContent(request.content)

  if (request.destination === 'chosenFile') {
    const write: ChosenFileWrite = {
      bytes,
      suggestedFileName: request.suggestedFileName,
      // ⛔ Not in docs/spec: whether the file just written becomes the one
      // later overwrite-saves land on. FR-060's reasoning is the ground for
      // saying yes -- it wants the round trip to close on one file, and gives
      // as the cost of not doing so a pile of files with numbers on the end,
      // which is what asking again on every save would produce. Restricting it
      // to the round-trip forms keeps an exported picture from stealing the
      // position. Overturning this costs this one line and nothing in any saved
      // document, which is why it is being run with rather than waited on.
      // @provisional PD-20
      shouldBecomeOpenedFile: isRoundTripForm(request.form),
    }
    return savingOfWriting(await store.writeChosenFile(write))
  }

  if (!isRoundTripForm(request.form)) {
    return {
      ok: false,
      fault: fault(
        'notAnOverwriteTarget',
        'table T-024 gives this form no import direction, so it cannot stand as the file FR-060 writes over',
      ),
    }
  }
  return savingOfWriting(await store.overwriteOpenedFile(bytes))
}
