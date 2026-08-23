// FileGateway -- declares the interface FileStore (table T-065 IF-3).
//
// @unit      UF-42   (docs/spec/05-07-design.md, table T-075)
// @component FileGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      FileStore, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ---- the one thing the specification DOES fix about these members ----------
//
// IF-3 carries a note of its own: the HANDLE is held by the implementation
// (CP-28), under FR-060. Every member below is shaped by that single sentence.
// This side must be able to say "the file that is already open" while never
// holding, passing, comparing or outliving the thing that names it, so:
//
//   * no member hands a handle out and none takes one back. There is no opaque
//     token either -- a token would be a handle wearing a different type, and
//     the moment this side could hold one it could also hold two, and would
//     then own the question of which is current.
//   * "write to the file we opened" is therefore its OWN member rather than
//     `write(handle, bytes)`.
//   * whether a file is open at all, and whether it can still be written, is a
//     QUESTION asked of the store rather than a field read off it. The answer
//     lives on the far side and changes without anyone here being told: FR-060
//     says permission to the previously opened file can be gone by the next
//     run, and puts a MUST on offering to win it back at startup. A cached
//     answer here would be stale exactly when that MUST fires.
//
// LY-3 of table T-060 backs the same shape from the other direction: holding a
// current value is the Framework's job alone, and the inner three layers take
// what they need as arguments. A handle is a current value.
//
// ⚠️ Five members on one interface, and R2.5 (ISP) is answered the way Chapter
// 5.1 answers it for the Agent API: there is exactly one implementation
// (CP-28), so nobody is made to implement a member it has no use for.
//
// ⛔ No member takes or returns a browser type. LR-6 bars those from Entity and
// UseCase rather than from here, but a seam whose values are plain data is one
// a test can stand in for, and CP-28 is the only place that should need to know
// what a `File` or a `FileSystemFileHandle` is.

/**
 * The two routes OP-2 of table T-024a admits, and no third.
 *
 * ⭐ A parameter rather than a member each, because OP-2's rule is that there
 * is ONE entry (MUST NOT: no separate one for import) and the two routes differ
 * only in how the person points at the file. Making the route a value keeps
 * that "one entry" visible in the type: a second entry would have to be a
 * second member, and there is nowhere to put one.
 *
 * ⚠️ `BT-2` of table T-034 -- a document handed to the app as it starts -- is
 * not a third route. Table T-034 sends it to R-1 of table T-008, the same file
 * route these two use, and hands what happens next to FR-087.
 */
export type OpenRoute = 'chooser' | 'drop'

/**
 * Why the store could not do what was asked.
 *
 * ⛔ The four are told apart by what the person can do NEXT, because that is
 * what NT-3a of table T-037 makes mandatory in a failure notice: a notice that
 * only says something failed is forbidden (MUST NOT). The wording of the
 * notice is not built here -- `notices.ts` (UF-67) is `pure` and owns FR-076's
 * manners -- but only this side can know WHICH of the four happened.
 *
 * ⚠️ `cancelled` is in the list precisely so that it can be told apart from the
 * other three and left un-notified. The person stopping a file chooser has not
 * been failed and has no next step owed to them.
 */
export type FileStoreFaultReason =
  /** The person dismissed the chooser, or dropped nothing. Not a failure. */
  | 'cancelled'
  /** FR-060's case: a file is remembered, but it may not be written now. */
  | 'permissionLost'
  /** Nothing has been opened, so there is no file to overwrite. */
  | 'noOpenedFile'
  /**
   * The store tried and could not. ⚠️ `LM-14` lands here -- opened straight off
   * the disk, overwrite-saving is one of the things that may simply not work.
   */
  | 'unavailable'

/**
 * One reason, and the detail behind it.
 *
 * ⚠️ Shaped like `JsonFault` and `Refusal` rather than like an exception:
 * FR-028 forbids throwing (MUST NOT) and AG-8 of table T-035 has failures come
 * back as values. Nothing in this component throws, and nothing in it catches
 * a throw from the store either -- a store that throws has broken the contract
 * this file states.
 */
export interface FileStoreFault {
  readonly reason: FileStoreFaultReason
  /** Detail for the log and for the notice's body. Never the only thing said. */
  readonly what: string
}

/** One file exactly as it sat on disk. Nothing has been decoded. */
export interface OpenedFileContent {
  /**
   * ⭐ Bytes, not text. The encoding rule (CN-5 of table T-003) belongs to one
   * place, and that place is on the near side of this seam -- see
   * `file-gateway.ts`. It also keeps S-113's ceiling measurable: the size
   * `ValidateImportedDocument` is told is `bytes.byteLength`, the count the
   * file actually occupied, not the length of a string decoded from it.
   */
  readonly bytes: Uint8Array
  /** For the notice and the header. ⚠️ Not a path -- the store keeps that. */
  readonly fileName: string
}

/**
 * What the store says about the file FR-060 would overwrite.
 *
 * ⭐ Three states rather than a name plus a boolean: the startup offer FR-060
 * requires exists only for the middle case, and a `null` name with a `true`
 * flag is a state that cannot happen but that every reader has to rule out.
 * `NT-4` of table T-037 gathers that offer onto one startup panel with the
 * other pending business, so the shell asks this question once and shows or
 * omits the offer.
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
       * OP-11 of table T-024a: how many of the files handed over in the same
       * act were NOT accepted. The row keeps the first one and puts a MUST on
       * saying that the rest were left, and only the side that saw the whole
       * hand-over can count them.
       *
       * ⚠️ Absent means none were left. It is optional rather than always
       * stated because a route that can only ever carry one file has nothing
       * to count, and a store that says nothing is asserting exactly that.
       * ⛔ A store that DOES drop files must state the number: leaving it out
       * there turns OP-11's MUST into silence, which its MUST NOT forbids.
       */
      readonly ignoredFileCount?: number
    }
  | { readonly ok: false; readonly fault: FileStoreFault }

/**
 * Yes-or-no about one write.
 *
 * ⭐ A success reports the resulting state instead of leaving the caller to ask
 * for it. R7.4 forbids a new external read part-way through handling a result,
 * and the header that shows the file name would otherwise need one right after
 * every save.
 */
export type FileWriting =
  | { readonly ok: true; readonly openedFile: OpenedFileState }
  | { readonly ok: false; readonly fault: FileStoreFault }

/**
 * What already sits where a chosen write would land.
 *
 * ⭐ Two states rather than a nullable byte string, because table T-227 turns
 * on what is standing at the destination and DI-1 has a file name to compare
 * only where something is. A boolean beside the bytes would leave "nothing is
 * there" and "something is there holding nothing" spelled the same way.
 *
 * ⭐ DI-6 OF TABLE T-227 (MUST) DECIDES IT, and it is the row a note here once
 * waited for: a destination holding no bytes is not one that was already
 * there, and nothing is asked about it. The row states its own precedence over
 * DI-3 and gives FR-031 (MUST NOT) as the ground -- the class FR-031 admits a
 * question in is losing something undo cannot give back, and a destination with
 * nothing in it has nothing to lose.
 *
 * ⚠️ SO NO STORE IS ASKED TO TELL THE TWO APART. A save chooser creates the
 * file it names, and DI-6's own note is that such a file and one that was
 * standing empty cannot be told apart; the row answers both the same way, so
 * which arm a store reports for a destination with no bytes changes nothing.
 * `file-gateway.ts` measures what came back and reads DI-6 before any other
 * row of the table -- that side owns the table, not this seam.
 */
export type ChosenWriteDestination =
  /**
   * Nothing for table T-227 to ask about. ⭐ By DI-6, a destination that IS
   * there but holds no bytes belongs here too -- see the note above.
   */
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'occupied'
      /** The name the person actually chose, which DI-1 compares. */
      readonly fileName: string
      /**
       * ⭐ Bytes, for the same reason `OpenedFileContent` carries bytes.
       * ⚠️ A store that reports this arm carrying none of them is not wrong:
       * DI-6 is judged on the near side by measuring, exactly so that no store
       * is made to answer a row of a table it does not judge.
       */
      readonly bytes: Uint8Array
    }

/** One write to a file the person is about to point at. */
export interface ChosenFileWrite {
  readonly bytes: Uint8Array
  /** What to put in the chooser. The person may overrule it. */
  readonly suggestedFileName: string
  /**
   * Whether the file just written becomes the one FR-060 overwrites from now
   * on. ⛔ The store does not work this out: which of table T-024's forms can
   * stand in that position is the near side's business, and `file-gateway.ts`
   * decides it there.
   */
  readonly shouldBecomeOpenedFile: boolean
  /**
   * DI-4 of table T-227 (MUST): asked once, after the person has pointed at a
   * file and BEFORE anything is written. `false` means write nothing.
   * ⚠️ `non-pure` where it is implemented, which is the near side of this seam.
   *
   * ⛔ THE STORE DOES NOT JUDGE. Whether the destination holds this same
   * document is DI-1 .. DI-3, and those are the near side's -- `file-gateway.ts`
   * answers this. All the store owes is the chance to answer, at the one moment
   * when both the destination and the unwritten bytes exist.
   *
   * ⭐ Why a call rather than a value on the request: the file being written
   * over is not known until the chooser closes, and asking afterwards would
   * mean asking about a file that has already been destroyed. Handing the
   * question DOWN keeps FR-096's one entry to one round trip -- see
   * `writeChosenFile` for the consistency unit R7.4 asks to be stated.
   *
   * ⚠️ A `false` answer is `cancelled`, not a failure: the person called the
   * write off, exactly as they may call the chooser off, and IF-3 keeps
   * `cancelled` apart so that nothing is told to somebody who is owed nothing.
   */
  askToWriteOver(destination: ChosenWriteDestination): Promise<boolean>
}

export interface FileStore {
  /**
   * The file the person designated, read whole. `semi-pure-b`.
   *
   * ⭐ The store remembers where it came from, so that FR-060's overwrite has
   * somewhere to go. ⚠️ That is why the `drop` route goes through the store at
   * all instead of the shell simply handing over the bytes it already has: a
   * dropped file that never passed the store leaves nothing to overwrite, and
   * the person would find the same save icon working after one route and not
   * after the other.
   *
   * ⛔ One file per call. OP-3 of table T-024a asks the person one question
   * about one read content, and OP-8 forbids a second open while one is
   * running, so there is no case here that wants a list.
   *
   * ⚠️ OP-11 is the case where several arrive together, and it does NOT want a
   * list either: the row keeps the FIRST one and has the rest merely reported
   * as left behind (MUST), because one file is open and the act must not read
   * as refused (MUST NOT). That report is `ignoredFileCount` on the answer.
   */
  readFileToOpen(route: OpenRoute): Promise<FileReading>

  /**
   * What may be overwritten right now. `semi-pure-b`.
   *
   * ⚠️ Asked, never remembered. FR-060 has permission going missing between
   * runs, so an answer kept from a moment ago is worth nothing.
   */
  readOpenedFileState(): Promise<OpenedFileState>

  /**
   * Ask for the lost permission back, and answer with what came of it.
   * `non-pure`.
   *
   * ⭐ This is FR-060's second MUST -- without it there is no way back to the
   * file that was open, which is the whole point of holding onto it.
   */
  restoreOpenedFilePermission(): Promise<OpenedFileState>

  /** Write over the file that was opened, keeping it open. `non-pure`. */
  overwriteOpenedFile(bytes: Uint8Array): Promise<FileWriting>

  /**
   * Write to a file the person points at. `non-pure`.
   *
   * ⭐ THE ORDER IS FIXED, because table T-227 has no meaning in any other:
   * point at the destination, read what is already there, ask
   * `ChosenFileWrite.askToWriteOver`, and write only on a `true`.
   *
   * ⚠️ R7.4's consistency unit is this ONE call. The destination is read once,
   * inside it, and the answer to the question is about that reading -- the near
   * side performs no external read of its own part-way through, and a caller
   * never sees a half-finished write.
   */
  writeChosenFile(write: ChosenFileWrite): Promise<FileWriting>
}
