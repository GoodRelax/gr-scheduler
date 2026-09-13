// FileGateway -- declares the interface FileStore (table T-065 IF-3).
//
// @unit      UF-42   (docs/spec/05-07-design.md, table T-075)
// @component FileGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      FileStore, implemented in another layer (LR-5)
//
// IF-3's note puts the HANDLE in the implementation (CP-28, FR-060), and that
// shapes every member: this side can say "the file already open" without ever
// holding, passing or comparing what names it. So:
//
//   * no member hands a handle out or takes one back, and there is no opaque
//     token -- a token is a handle by another type, and holding one would let
//     this side hold two and own which is current.
//   * "write to the file we opened" is its own member, not `write(handle, bytes)`.
//   * whether a file is open and still writable is ASKED of the store, never
//     cached: the answer lives on the far side and changes without this side
//     being told.
//
// LY-5 of table T-060 gives the same shape: a handle is a current value, which
// only the Framework holds.
//
// One interface despite R2.5 (ISP): there is exactly one implementation (CP-28).
//
// No member carries a browser type, so a test can stand in for the seam and
// only CP-28 needs to know `File` or `FileSystemFileHandle`.

/**
 * How a file is opened: OP-2 of table T-024a's chooser and drop, and OP-13's
 * re-read of the file already open.
 *
 * A parameter rather than a member each: OP-2 allows ONE entry (no separate one
 * for import), and a second entry would need a second member.
 *
 * ⚠️ BT-2 of table T-034 (a document handed over at start) is not another
 * route: table T-034 sends it to CHN-1 of table T-008 and to FR-087.
 */
export type OpenRoute = 'chooser' | 'drop' | 'reopen'

/**
 * Why the store could not do what was asked.
 *
 * Told apart by what the person can do next, which NT-3a of table T-037 has a
 * failure notice carry. The wording is `notices.ts` (UF-67)'s; only this side
 * knows which case happened.
 *
 * ⚠️ `cancelled` is listed so it can be left un-notified: a dismissed chooser
 * is not a failure.
 */
export type FileStoreFaultReason =
  /** The person dismissed the chooser, or dropped nothing. Not a failure. */
  | 'cancelled'
  /** FR-060's case: a file is remembered, but it may not be written now. */
  | 'permissionLost'
  /** Nothing has been opened, so there is no file to overwrite. */
  | 'noOpenedFile'
  /** The store tried and could not (LM-14 lands here). */
  | 'unavailable'

/**
 * One reason, and the detail behind it.
 *
 * ⚠️ A value, not an exception (FR-028, R7.10). A store that
 * throws breaks this contract.
 */
export interface FileStoreFault {
  readonly reason: FileStoreFaultReason
  /** Detail for the log and for the notice's body. Never the only thing said. */
  readonly what: string
}

/** One file exactly as it sat on disk. Nothing has been decoded. */
export interface OpenedFileContent {
  /**
   * Bytes, not text: the encoding rule (CN-5 of table T-003) lives on the near
   * side (`file-gateway.ts`), and S-113 is judged on `bytes.byteLength`.
   */
  readonly bytes: Uint8Array
  /** For the notice and the header. ⚠️ Not a path -- the store keeps that. */
  readonly fileName: string
}

/**
 * What the store says about the file FR-060 would overwrite.
 *
 * Three states rather than a name plus a boolean, so a `null` name with a
 * `true` flag cannot be written.
 */
export type OpenedFileState =
  | { readonly kind: 'none' }
  | { readonly kind: 'writable'; readonly fileName: string }
  | { readonly kind: 'permissionLost'; readonly fileName: string }

/** Yes-or-no about one read, failures included. */
export type FileReading =
  | {
      readonly ok: true
      readonly file: OpenedFileContent
      /**
       * OP-11 of table T-024a: how many files handed over in the same act were
       * not accepted; only the side that saw the whole hand-over can count.
       *
       * ⚠️ Absent means none. ⛔ A store that does drop files must state the
       * number, or OP-11's report becomes silence.
       */
      readonly ignoredFileCount?: number
    }
  | { readonly ok: false; readonly fault: FileStoreFault }

/**
 * Yes-or-no about one write.
 *
 * A success reports the resulting state: R7.4 forbids a new external read
 * part-way through, and the header would otherwise need one after every save.
 */
export type FileWriting =
  | { readonly ok: true; readonly openedFile: OpenedFileState }
  | { readonly ok: false; readonly fault: FileStoreFault }

/**
 * What already sits where a chosen write would land.
 *
 * Two states rather than nullable bytes: table T-227 turns on whether
 * something stands there, and DI-1 compares a file name only then.
 *
 * ⚠️ No store is asked to tell "nothing there" apart from an empty file: DI-6 of
 * table T-227 answers both the same way, and `file-gateway.ts` measures the
 * bytes and reads DI-6 first.
 */
export type ChosenWriteDestination =
  /** Nothing for table T-227 to ask about (by DI-6, an empty file too). */
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'occupied'
      /** The name the person actually chose, which DI-1 compares. */
      readonly fileName: string
      /**
       * Bytes, as in `OpenedFileContent`. ⚠️ This arm carrying none is not
       * wrong: DI-6 is judged on the near side.
       */
      readonly bytes: Uint8Array
    }

/** One write to a file the person is about to point at. */
export interface ChosenFileWrite {
  readonly bytes: Uint8Array
  /** What to put in the chooser. The person may overrule it. */
  readonly suggestedFileName: string
  /**
   * The extension table T-024 gives the row being written, dot and all.
   *
   * Carried beside the name, not cut out of it: FR-096 also has the host told
   * the file's kind, which is no question about a name, and a name such as
   * 「v1.2 計画」 has a dot of its own.
   *
   * Made on neither side of this seam: table T-024 is its one place (FR-096),
   * and `frame-loop.ts` reads it from the generated roster.
   * ⚠️ An empty string means the roster lost the row; the store then opens a
   * chooser with no kind rather than inventing one. The media type stays in
   * the Framework (FR-096) and never crosses this seam.
   */
  readonly extension: string
  /**
   * Whether the file just written becomes FR-060's overwrite target; which
   * forms can is decided in `file-gateway.ts`, not by the store.
   */
  readonly shouldBecomeOpenedFile: boolean
  /**
   * DI-4 of table T-227: asked once, after the person has pointed at a file
   * and BEFORE anything is written. `false` means write nothing.
   * `non-pure`, implemented on the near side (`file-gateway.ts`), which also
   * judges DI-1 .. DI-3; the store only gives it the moment to answer.
   *
   * A call rather than a value: the file written over is known only once the
   * chooser closes, and asking afterwards would ask about a destroyed file.
   *
   * ⚠️ `false` is `cancelled`, not a failure: nobody is owed a notice.
   */
  askToWriteOver(destination: ChosenWriteDestination): Promise<boolean>
}

export interface FileStore {
  /**
   * The file the person designated, read whole. `semi-pure-b`.
   *
   * The store remembers where it came from so FR-060's overwrite has a target;
   * that is why `drop` goes through the store too -- otherwise save would work
   * after one route and not the other.
   *
   * One file per call: OP-3 of table T-024a asks about one content, and OP-8
   * forbids a second open meanwhile. When several arrive (OP-11), the first is
   * kept and the rest are reported through `ignoredFileCount`.
   */
  readFileToOpen(route: OpenRoute): Promise<FileReading>

  /**
   * What may be overwritten right now. `semi-pure-b`.
   *
   * ⚠️ Asked, never remembered: permission can change without this side being
   * told.
   */
  readOpenedFileState(): Promise<OpenedFileState>

  /**
   * Ask for the lost permission back, and answer with what came of it.
   * `non-pure`.
   *
   * Only for a file opened during this run: FR-060 forbids remembering the
   * previous run's file, so there is nothing to offer at startup.
   * ⛔ Never called at startup. Having no startup caller is correct -- do not
   * "fix" it into a startup offer.
   */
  restoreOpenedFilePermission(): Promise<OpenedFileState>

  /** Write over the file that was opened, keeping it open. `non-pure`. */
  overwriteOpenedFile(bytes: Uint8Array): Promise<FileWriting>

  /**
   * Write to a file the person points at. `non-pure`.
   *
   * ⛔ The order is fixed, as table T-227 means nothing in another: point at
   * the destination, read what is there, ask `ChosenFileWrite.askToWriteOver`,
   * and write only on `true`.
   *
   * ⚠️ The consistency unit is this one call (R7.4): the destination is read
   * once, inside it, and no caller sees a half-finished write.
   */
  writeChosenFile(write: ChosenFileWrite): Promise<FileWriting>
}
