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
// CP-22 answers to FR-060, to table T-024 and to table T-227. Between the shell
// that has a `FileStore` and the codecs that speak formats, exactly four jobs
// are left over, and they are the whole of this file:
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
//   4. WHETHER TWO DOCUMENTS ARE ONE AND THE SAME, and therefore whether a
//      write over an existing file has to be asked about. Table T-227 is the
//      whole rule (DI-1 .. DI-5); `isSameDocument` and `askToWriteOver` below
//      are the whole of its implementation. ⛔ FR-061 forbids the autosave key
//      being built out of DI-1 (MUST NOT), so `DocumentIdentity` never leaves
//      this act -- see the type's own note.
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
// ⚠️ OP-11 IS THE ONE ROW OF TABLE T-024a THIS FILE CARRIES, and it carries
// only the number: several files handed over at once leave one opened and the
// rest ignored, and saying so is a MUST. ⛔ It is not a judgement about the
// document -- the file that was accepted is read exactly as any other -- and
// the words belong to whoever raises NT-5's telling.
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
  ChosenWriteDestination,
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
  ChosenWriteDestination,
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
  | {
      readonly ok: true
      readonly file: OpenedDocumentFile
      /**
       * OP-11 of table T-024a: how many files handed over in the same act were
       * left behind. `0` where none were, which is every ordinary open.
       *
       * ⭐ CARRIED, NOT PHRASED. OP-11 puts a MUST on saying that the rest were
       * ignored and sends the manner to NT-5 of table T-037; the words are the
       * raiser's, because FR-038 places no store of translated strings in this
       * component. ⛔ And it is not a refusal: OP-11 forbids letting the act
       * read as if nothing was accepted (MUST NOT), so this rides on the
       * SUCCESS arm beside the file that WAS opened.
       *
       * ⚠️ Not a list of the names that were left. NT-5 asks for the fact and
       * the caution; the names-not-a-count rule is NT-7's and FR-032's, and
       * neither reaches here.
       */
      readonly ignoredFileCount: number
    }
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

// -------------------------------------------------- table T-227: identity ----

/**
 * The two values DI-1 of table T-227 reads out of a document itself.
 *
 * ⛔ Spelled after the columns DI-1 names -- `Project.name` and `Project.id` --
 * and not after any new identifier. DI-1's own note says why: the three values
 * it compares are ones a document ALREADY carries, and a minted identifier is
 * one that every document written before it lacks.
 *
 * ⚠️ Both sides are `null`-able because AT-1 and AT-2 keep them so: the exchange
 * partner's schema lets either be left out, and requiring them here would refuse
 * files that really exist.
 */
export interface ProjectIdentity {
  readonly projectName: string | null
  readonly projectId: string | null
}

/**
 * The three values DI-1 compares, for one document.
 *
 * ⛔ NOT AN AUTOSAVE KEY. FR-061 forbids building the key that keeps two
 * documents apart in autosave out of DI-1 (MUST NOT), and states the reason: a
 * document that has never been in a file has no file name, and autosave runs on
 * it all the same. ⚠️ FR-061's key is still undecided; nothing in this folder
 * may be handed to AutosaveGateway as one.
 */
export interface DocumentIdentity extends ProjectIdentity {
  /**
   * The name of the file this document stands in, or `null` where it has never
   * been in one.
   *
   * ⚠️ `null` cannot equal the name of any destination, so a document that has
   * never been saved matches nothing and the question of DI-4 gets asked. That
   * is the direction CR-197 chose everywhere in this table: an extra question
   * costs one gesture, and a file overwritten in silence cannot be got back.
   */
  readonly fileName: string | null
}

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
      /**
       * ⭐ DI-5 of table T-227 (MUST): nothing on this route is ever asked. The
       * file that was opened is, by definition, this document's own file, and a
       * question here would fire every time the project was renamed -- which is
       * the growth FR-031 forbids.
       */
      readonly destination: 'openedFile'
      readonly content: SaveFileContent
      readonly form: SaveFileForm
    }
  | ChosenFileSaveRequest

/**
 * FR-096's export, to a file the person picks out.
 *
 * ⭐ Named on its own because table T-227 hangs entirely off this arm, and
 * three of its five rows are fields here.
 */
export interface ChosenFileSaveRequest {
  readonly destination: 'chosenFile'
  readonly content: SaveFileContent
  readonly form: SaveFileForm
  readonly suggestedFileName: string
  /**
   * DI-1: the identity of the document being written, as it stands now.
   *
   * ⛔ Given rather than worked out here. This component does not know what a
   * schedule is -- it hands bytes to whichever codec the caller chose -- so the
   * two project values are read where the document is, not out of the bytes on
   * their way past.
   */
  readonly identity: DocumentIdentity
  /**
   * DI-3: the two project values of whatever is ALREADY at the destination, or
   * `null` where those characters are not `GRS JSON`.
   *
   * ⛔ A function rather than a parsed value, and supplied rather than written:
   * the destination is not known until the chooser closes, and UT-5 of table
   * T-063 keeps the three formats in codecs of their own. A gateway that parsed
   * `GRS JSON` would hold an authority `FR-024` already owns.
   *
   * ⚠️ `null` is the whole of DI-3's rule: a destination this cannot read is a
   * destination whose owner is unknown, and DI-3 forbids calling it the same
   * document (MUST NOT).
   */
  projectIdentityFromText(text: string): ProjectIdentity | null
  /**
   * DI-4 (MUST): put the overwrite question to the person and bring the answer
   * back. `true` goes ahead, `false` writes nothing.
   *
   * ⭐ Asked ONLY where DI-1 .. DI-3 could not call the destination this same
   * document. NT-7 of table T-037 is the manner, and FR-031 (MUST NOT) is why
   * it is not asked more widely than that.
   *
   * ⚠️ WHERE THE ANSWER COMES FROM IS SETTLED AND NOBODY ASKS YET. Table T-109
   * places IC-69 and IC-70 on U-55 `Confirmation`, so a press on either arrives
   * as `ScreenPart.entry` (IF-9); what is missing is the RAISER -- nothing puts
   * a question into `ScreenSession.confirmation`, which the STOP note in
   * `adapter/screen-renderer/notices.ts` records. This field states only that an
   * answer is owed, which NT-7 does fix (MUST): what happens is shown, and going
   * on or calling off is chosen.
   */
  confirmOverwrite(): Promise<boolean>
}

export type DocumentFileSaving =
  | { readonly ok: true; readonly openedFile: OpenedFileState }
  | { readonly ok: false; readonly fault: DocumentFileFault }

// ------------------------------------------------ the rules, pure side ------

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

// ------------------------------------------- table T-227: is it the same? ----

/**
 * DI-1 and DI-2 of table T-227: whether two documents are one and the same.
 *
 * ⭐ Read the two rows in the order they are printed. DI-2 (MUST NOT) strikes
 * out any pair where a project value is missing on EITHER side before DI-1
 * (MUST) is allowed to find three agreements -- so a missing value can never be
 * matched against another missing value and pass as agreement. Standing in
 * for it with a substitute name was considered and rejected in CR-197: two
 * substitutes agree with each other, which is precisely the false "same" this
 * order exists to stop.
 *
 * ⚠️ The file name is struck out for being absent as well. DI-1 asks for three
 * agreements and a document that has never been in a file has nothing to put in
 * the first of them.
 *
 * @purity pure
 */
function isSameDocument(here: DocumentIdentity, there: DocumentIdentity): boolean {
  const isEitherProjectUnnamed =
    here.projectName === null ||
    here.projectId === null ||
    there.projectName === null ||
    there.projectId === null
  if (isEitherProjectUnnamed) return false
  if (here.fileName === null || there.fileName === null) return false

  return (
    here.fileName === there.fileName &&
    here.projectName === there.projectName &&
    here.projectId === there.projectId
  )
}

/**
 * DI-3 of table T-227: who the destination belongs to, or `null` where that
 * cannot be read.
 *
 * ⛔ Three separate ways of not knowing, all answered the same: the destination
 * held nothing readable in this encoding (CN-5 of table T-003), or the caller's
 * codec would not take those characters as `GRS JSON`. DI-3 (MUST NOT) puts all
 * of them on the same side -- a destination whose owner cannot be read is not
 * to be called the same document.
 *
 * ⭐ The file name comes from the DESTINATION, never from inside its content.
 * DI-1 compares the name of the file being written over, and a name carried in
 * the bytes would be the name of wherever those bytes were written before.
 *
 * @purity pure
 */
function destinationIdentity(
  destination: ChosenWriteDestination,
  projectIdentityFromText: (text: string) => ProjectIdentity | null,
): DocumentIdentity | null {
  if (destination.kind === 'empty') return null

  const decoded = textOfBytes(destination.bytes)
  if (!decoded.ok) return null

  const project = projectIdentityFromText(decoded.text)
  if (project === null) return null

  return {
    fileName: destination.fileName,
    projectName: project.projectName,
    projectId: project.projectId,
  }
}

// -------------------------------------------- what is published: reading ----
//
// R7.7's order: everything above is `pure`, this one is `semi-pure-b`, and the
// section below it holds the only two `non-pure` things in the folder.

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
 * ⭐ OP-11's count rides out beside the file. The store keeps the first of
 * several and reports how many it left; this carries that number so the caller
 * can raise NT-5's telling. ⛔ A store that says nothing left nothing -- see
 * `FileReading` -- so the absence becomes `0` here rather than staying a value
 * every caller has to rule out.
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

  return {
    ok: true,
    file: openedOf(reading.file, decoded.text),
    ignoredFileCount: reading.ignoredFileCount ?? 0,
  }
}

// -------------------------------------------- what is published: writing ----
//
// ⚠️ `non-pure` from here down: the disk changes.

/**
 * Table T-227's answer for one destination: may this write go over what is
 * standing there?
 *
 * ⭐ THE ROWS, IN THE ORDER THEY DECIDE. FR-096 sends only an EXISTING file to
 * this table, so an empty destination is past before any row is read. Then
 * DI-1 .. DI-3 settle whether the destination IS this document -- if it is,
 * writing over it is what saving means and there is nothing to ask. Only what
 * is left over reaches DI-4 (MUST), and that is exactly what FR-031 (MUST NOT)
 * permits: the class it admits is losing something that cannot be got back by
 * undoing, and somebody else's file is not even undo's to give back.
 *
 * ⚠️ It asks the caller, not the person. The words of the question and the two
 * choices are NT-7's and are put together by whoever raises it -- FR-038 places
 * no store of translated strings in this component.
 *
 * @purity non-pure
 */
async function askToWriteOver(
  request: ChosenFileSaveRequest,
  destination: ChosenWriteDestination,
): Promise<boolean> {
  if (destination.kind === 'empty') return true

  const there = destinationIdentity(destination, request.projectIdentityFromText)
  if (there !== null && isSameDocument(request.identity, there)) return true

  return await request.confirmOverwrite()
}

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
 * ⭐ DI-5 of table T-227 (MUST) is why only one of the two arms carries a
 * question: the `openedFile` arm goes to the file this document already stands
 * in, and there is no other document to be mistaken for.
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
      // DI-4 of table T-227 (MUST). The store holds the question until the
      // destination is known and the bytes are still unwritten; the answer is
      // this side's, and `askToWriteOver` is the whole of the table.
      askToWriteOver: (destination) => askToWriteOver(request, destination),
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
