// FileGateway -- public entry of this folder.
//
// @unit      UF-41   (docs/spec/05-07-design.md, table T-075)
// @component FileGateway, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-22
//
// The four jobs between the shell's `FileStore` and the codecs (CP-22):
//   1. One entry for reading (OP-2 of table T-024a); the routes are a parameter,
//      so a second entry has nowhere to appear.
//   2. The encoding rule (CN-5 of table T-003) in one place: bytes cross the
//      seam, characters do not.
//   3. Which file FR-060 overwrites next -- see `isRoundTripForm`.
//   4. Whether a write over an existing file is asked about (table T-227) --
//      `isSameDocument` and `askToWriteOver`.
//
// It does not know what a schedule is: it hands bytes to the codec the caller
// chose (UT-5 of table T-063), so it holds no format authority of its own. It
// does not judge content (CP-13) and decides nothing about the document read
// (OP-3, OP-4, OP-6, OP-8, OP-9); it finishes the moment there is text.
//
// Everything comes back as a value (R7.10). A fault names its reason so that
// `notices.ts` (UF-67) can add the next step NT-3a of table T-037 requires.
//
// The seam declared in this folder is re-exported here because the layer that
// implements it may not reach past this file.

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
 * Why a file could not be turned into text a codec can be handed. The store's
 * reasons are widened rather than restated, so the caller stays on one `switch`.
 */
export type DocumentFileFaultReason =
  | FileStoreFaultReason
  /**
   * The bytes are not UTF-8 (CN-5). Refused rather than decoded with
   * replacement characters, which would turn a mis-encoded MSPDI into a
   * document of plausible-looking wrong names.
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
  /** The text as the bytes encode it. No format has been guessed. */
  readonly text: string
  /**
   * How many bytes the file occupied: S-113's ceiling counts bytes, and the
   * decoded text's length would pass files the ceiling is meant to stop.
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
       * left behind; `0` for every ordinary open. A count on the success arm,
       * because the act is not a refusal; the words are the raiser's (NT-5).
       */
      readonly ignoredFileCount: number
    }
  | { readonly ok: false; readonly fault: DocumentFileFault }

// ------------------------------------------------------------- writing ------

/**
 * The rows of table T-024 whose output is a file. IO-5 and IO-6 are absent:
 * `localStorage` is the shell's and the clipboard is ClipboardGateway's (IF-5),
 * so listing them would give two components a route to one destination.
 */
export type SaveFileForm = 'grsJson' | 'mspdi' | 'svg' | 'png' | 'singleHtml'

/**
 * What is being written. Text and bytes are told apart here rather than at the
 * seam, so the UTF-8 rule is applied once, by this file.
 */
export type SaveFileContent =
  | { readonly text: string }
  | { readonly bytes: Uint8Array }

// -------------------------------------------------- table T-227: identity ----

/**
 * The two values DI-1 of table T-227 reads out of a document itself, spelled
 * after the columns it names. Both nullable, as AT-1 and AT-2 are.
 */
export interface ProjectIdentity {
  readonly projectName: string | null
  readonly projectId: string | null
}

/**
 * The three values DI-1 compares, for one document.
 */
export interface DocumentIdentity extends ProjectIdentity {
  /**
   * The name of the file this document stands in, or `null` where it has never
   * been in one. `null` matches no destination, so DI-4's question is asked: an
   * extra question costs one gesture, a silent overwrite cannot be got back.
   */
  readonly fileName: string | null
}

/**
 * FR-060's overwrite and FR-096's export, told apart by where they land, so a
 * suggested name exists only where one is asked for. The form is a field, not
 * a function (FR-096).
 */
export type DocumentFileSaveRequest =
  | {
      /** DI-5 of table T-227: nothing on this route is asked. */
      readonly destination: 'openedFile'
      readonly content: SaveFileContent
      readonly form: SaveFileForm
    }
  | ChosenFileSaveRequest

/** FR-096's export, to a file the person picks out; table T-227 hangs off this arm. */
export interface ChosenFileSaveRequest {
  readonly destination: 'chosenFile'
  readonly content: SaveFileContent
  readonly form: SaveFileForm
  readonly suggestedFileName: string
  /**
   * The extension table T-024 gives `form`, dot and all, carried apart from the
   * suggested name so the host is told the file's kind (FR-096). Not derived
   * from `form` here: the pairing reaches `src/` through
   * `tools/generate_exchange_formats.py`, which this component does not read.
   * Nothing compares it with the suggested name, which the person may overrule.
   */
  readonly extension: string
  /**
   * DI-1: the identity of the document being written, given by the caller
   * because this component does not read documents.
   */
  readonly identity: DocumentIdentity
  /**
   * DI-3: the project values of whatever is already at the destination, or
   * `null` where that is not `GRS JSON`. A supplied function, because the
   * destination is unknown until the chooser closes and parsing is the codec's.
   */
  projectIdentityFromText(text: string): ProjectIdentity | null
  /**
   * DI-4: put the overwrite question to the person and bring the answer back;
   * `true` goes ahead, `false` writes nothing. Asked only where DI-1 .. DI-3
   * could not call the destination this same document.
   */
  confirmOverwrite(): Promise<boolean>
}

export type DocumentFileSaving =
  | { readonly ok: true; readonly openedFile: OpenedFileState }
  | { readonly ok: false; readonly fault: DocumentFileFault }

// ------------------------------------------------ the rules, pure side ------

/**
 * The forms FR-060 may overwrite: the two table T-024 lets come in as well as go
 * out (IO-1, IO-2). A picture over the opened file would leave nothing GRS can
 * read back.
 */
const ROUND_TRIP_FORMS: readonly SaveFileForm[] = ['grsJson', 'mspdi']

/** @purity pure */
function isRoundTripForm(form: SaveFileForm): boolean {
  return ROUND_TRIP_FORMS.includes(form)
}

/**
 * The bytes to write. `TextEncoder` is UTF-8 with no BOM, as CN-5 requires; do
 * not prepend anything.
 *
 * @purity pure
 */
function bytesOfContent(content: SaveFileContent): Uint8Array {
  return 'text' in content ? new TextEncoder().encode(content.text) : content.bytes
}

/**
 * The characters those bytes encode, or why they encode none. `fatal` rather
 * than replacement characters -- see `notUtf8` above.
 *
 * `ignoreBOM` leaves a leading U+FEFF in the text: the codecs accept and drop it
 * (FR-023, `withoutLeadingByteOrderMark`), so the rule lives in one place.
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
 * A store fault, widened, with its reason carried through unchanged.
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
 * DI-1 and DI-2 of table T-227, in the order printed: a pair with a missing
 * project value on either side is struck out before three agreements are looked
 * for, so two missing values never pass as agreement (a substitute name would
 * make two substitutes agree). A missing file name is struck out too.
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
 * DI-6 of table T-227: whether the destination counts as already there.
 *
 * Judged by the byte count rather than by which arm the store answered in, since
 * a file a chooser just created cannot be told from one standing empty. Read
 * before anything is decoded: DI-6 outranks DI-3, and an empty destination is
 * one DI-3 would send on to DI-4's question.
 *
 * @purity pure
 */
function isDestinationAlreadyThere(destination: ChosenWriteDestination): boolean {
  return destination.kind === 'occupied' && destination.bytes.byteLength > 0
}

/**
 * DI-3 of table T-227: who the destination belongs to, or `null` where that
 * cannot be read.
 *
 * The file name comes from the destination, never from its content, which would
 * name wherever those bytes were written before. An empty destination never
 * reaches here (DI-6, read first in `askToWriteOver`).
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
// R7.7's order: `pure` above, `semi-pure-b` here, `non-pure` below.

/**
 * Read the file the person pointed at, and hand back its text -- OP-2's single
 * entry, merge included. It stops at text; the codec, CP-13 and OP-3 are the
 * caller's.
 *
 * A store that reports no ignored count left nothing, so the absence becomes `0`.
 *
 * `semi-pure-b` (PI-22) although a chooser appears: the answer depends on the
 * file and the person, not on anything this component remembers (R2).
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
 * standing there? The rows in the order they decide: DI-6, then DI-1 .. DI-3,
 * and only what is left reaches DI-4. It asks the caller, whose words the
 * question is in (NT-7).
 *
 * @purity non-pure
 */
async function askToWriteOver(
  request: ChosenFileSaveRequest,
  destination: ChosenWriteDestination,
): Promise<boolean> {
  if (!isDestinationAlreadyThere(destination)) return true

  const there = destinationIdentity(destination, request.projectIdentityFromText)
  if (there !== null && isSameDocument(request.identity, there)) return true

  return await request.confirmOverwrite()
}

/**
 * Write one of table T-024's file forms, over the file that was opened or to
 * one the person points at. The caller states which, because only it knows
 * save from export (IC-2, IC-3 of table T-109).
 *
 * No fallback from `openedFile` to `chosenFile`: when nothing is open the store
 * answers `noOpenedFile`, and offering the chooser is the shell's next step
 * (NT-3a). Choosing it silently would make one control do the other's job.
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
      // FR-096: carried straight through; no media type is read out of it here.
      extension: request.extension,
      // Not in docs/spec: whether the file just written becomes the one later
      // overwrite-saves land on. Yes on FR-060's reasoning (the round trip
      // closes on one file), for the round-trip forms only so an exported
      // picture does not take the position.
      // @provisional PND-20
      shouldBecomeOpenedFile: isRoundTripForm(request.form),
      // DI-4: the store holds the question until the destination is known and
      // the bytes are unwritten. Not answered from this file: only the side that
      // opened the destination can read it, and a second read here would break
      // R7.4's one consistency unit.
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
