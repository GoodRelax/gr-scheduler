// FileSystemAccessFileStore -- public entry of this folder.
//
// @unit      UF-51   (docs/spec/05-07-design.md, table T-075)
// @component FileSystemAccessFileStore, layer Framework (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-28
//
// The implementation of FileStore (table T-065 IF-3). LR-5 of table T-061 has
// the Framework implement what the inner layer declared, so every member below
// is shaped by `adapter/file-gateway/file-store.ts` and nothing here widens it.
//
// ---- why this component exists ---------------------------------------------
//
// IF-3 carries one sentence of its own: the handle is held by the
// implementation (CP-28), under FR-060. `openedHandle` below is that sentence,
// and it is the whole reason a component exists here rather than a function
// somewhere inside the Adapter. It is a current value that outlives a call,
// which LY-5 of table T-060 makes this layer's alone to hold; the inner three
// layers take what they need as arguments and never learn what a handle is.
//
// ---- what the caller supplies, and why it is not reached for ---------------
//
// ⭐ Everything this file uses from the browser ARRIVES in
// `FileSystemAccessEnvironment`. LY-5 already says the Framework is where such
// things live, and R7.3 asks for the injection; the result is that this unit
// runs under Node with plain objects standing in for the browser, which is
// what lets somebody who did not write it test it against the specification.
// ⛔ Do not reach for `window` here. The moment one member does, the whole
// component needs a browser to say anything at all.
//
// ---- where the File System Access API is absent ----------------------------
//
// ⚠️ CN-2 of table T-003 makes Chromium the baseline, leaves Firefox at
// "checked only" and puts Safari out of scope, and LM-14 of table T-004
// already accepts that overwrite-save is one of the things that may simply not
// work. So a browser without the API is not a case to paper over:
//
//   * `openFilePicker` / `saveFilePicker` absent  -> `unavailable`, the reason
//     IF-3 documents as LM-14's landing place. The person still gets a next
//     step out of NT-3a of table T-037, because the failure arrives as a value.
//   * a drop that yields no handle -> the bytes still come back, and the file
//     is NOT remembered. There is nothing to overwrite, and `readOpenedFileState`
//     says `none` rather than naming a file that cannot be written.
//
// ⛔ No download fallback. FR-060's own RATIONALE is the argument against one:
// it says downloads cannot control where the file lands and breed numbered
// copies of the same name, which is the problem FR-060 exists to solve. Adding
// one here would answer the requirement with the thing it rejected.
//
// ---- what was hard ---------------------------------------------------------
//
// ⚠️ A drop cannot be read later. The items a drop carries are alive only
// while the event is being handled, so `readFileToOpen('drop')` cannot go and
// look for one -- by then there is nothing to look at. The store therefore
// watches the drop itself and keeps what it took, which is also the only way
// the handle survives at all, and IF-3 says in as many words that a dropped
// file that never passed the store leaves nothing to overwrite.
//
// ⚠️ Every write needs a user gesture, in every browser. ⛔ That is never
// hidden in a promise that does not settle: a refused gesture comes back as
// `permissionLost` when a file is remembered, and as `unavailable` otherwise,
// so the caller can act on it. See PD-102 for the reason vocabulary this
// stretches.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
  FileStoreFault,
  FileStoreFaultReason,
  FileWriting,
  OpenedFileState,
  OpenRoute,
} from '../../adapter/file-gateway/file-gateway'

// ------------------------------------------- what the caller must supply ----
//
// ⭐ These are declared here rather than taken from the DOM library because a
// test has to be able to build one. They are a subset of the real browser
// types, so `window`, a `FileSystemFileHandle` and a `DataTransfer` satisfy
// them without a cast.

/** The three values a permission query answers with. */
export type FilePermissionState = 'granted' | 'denied' | 'prompt'

/** One file as the browser hands it over, before anything is read. */
export interface ReadableFile {
  readonly name: string
  /** ⚠️ Bytes, and the number S-113's ceiling is stated in. See PD-103. */
  readonly size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

/** One open write. ⚠️ Live until `close` or `abort` -- see `writeBytesToFile`. */
export interface WritableFileStream {
  write(data: BufferSource): Promise<void>
  close(): Promise<void>
  abort(): Promise<void>
}

/**
 * A handle to one file.
 *
 * ⛔ This type never crosses the seam. IF-3 is built so that the inner layers
 * cannot hold one, and the only value of this type outside this file is the
 * one the caller passes in through the two pickers.
 */
export interface FileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<ReadableFile>
  createWritable(options?: { keepExistingData?: boolean }): Promise<WritableFileStream>
  /**
   * ⚠️ Optional because not every browser that has handles has these two, and
   * because a test has no use for them. What their absence means is PD-105.
   */
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState>
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState>
}

/** ⚠️ A drop can hand over a directory, which `kind` is how one is told apart. */
export type DroppedHandle = FileHandle | { readonly kind: 'directory' }

/** One thing the person let go of. */
export interface DroppedItem {
  readonly kind: string
  getAsFile(): ReadableFile | null
  /** Absent where the browser has no handles; then the drop cannot be remembered. */
  getAsFileSystemHandle?(): Promise<DroppedHandle | null>
}

export interface DroppedItems {
  readonly length: number
  readonly [index: number]: DroppedItem
}

export interface DropData {
  readonly types: readonly string[]
  readonly items: DroppedItems
}

export interface DropEvent {
  preventDefault(): void
  readonly dataTransfer: DropData | null
}

/**
 * Where a drop lands. In the assembled app this is the window.
 *
 * ⭐ OP-2 of table T-024a treats a drop as one surface that does not apply the
 * schedule area's hit-test order, so one surface for the whole app is what the
 * rule asks for rather than a convenience.
 */
export interface DropSurface {
  addEventListener(
    type: 'dragover' | 'drop',
    listener: (event: DropEvent) => void,
    options: { capture: boolean },
  ): void
}

/** ⛔ One file per call -- see `readFileToOpen`. */
export type OpenFilePicker = (options: {
  readonly multiple: false
}) => Promise<readonly FileHandle[]>

export type SaveFilePicker = (options: {
  readonly suggestedName: string
}) => Promise<FileHandle>

/**
 * What the store is given at construction.
 *
 * ⚠️ The two pickers are required KEYS holding a possibly-missing value, not
 * optional keys. The caller has to say which browser it is on; a shell that
 * forgot would otherwise read as a browser that has the API.
 */
export interface FileSystemAccessEnvironment {
  /** `window.showOpenFilePicker`, bound, or `undefined` where there is none. */
  readonly openFilePicker: OpenFilePicker | undefined
  /** `window.showSaveFilePicker`, bound, or `undefined` where there is none. */
  readonly saveFilePicker: SaveFilePicker | undefined
  readonly dropSurface: DropSurface
}

// ------------------------------------------------------------------ pure ----
//
// R7.7's order: everything down to `firstDroppedFile` is `pure`, the two
// permission readers after it are not, and the factory at the bottom is where
// the state lives.

/** @purity pure */
function fault(reason: FileStoreFaultReason, what: string): FileStoreFault {
  return { reason, what }
}

/**
 * The person stopped the chooser.
 *
 * ⚠️ Told apart from every other throw on purpose: IF-3 keeps `cancelled` in
 * the list so that it can be left un-notified, and somebody who closed a
 * dialog has not been failed and is owed no next step under NT-3a.
 *
 * @purity pure
 */
function isDismissal(thrown: unknown): boolean {
  return thrown instanceof Error && thrown.name === 'AbortError'
}

/**
 * The browser refused rather than failed.
 *
 * ⚠️ `SecurityError` is here with `NotAllowedError` because that is what a
 * call made outside a user gesture raises in part of the family, and the two
 * mean the same thing to the person: nothing was written, and the way back is
 * to ask again from a click.
 *
 * @purity pure
 */
function isDenial(thrown: unknown): boolean {
  return (
    thrown instanceof Error &&
    (thrown.name === 'NotAllowedError' || thrown.name === 'SecurityError')
  )
}

/** Detail for the log and for the notice's body. @purity pure */
function whyOf(thrown: unknown): string {
  return thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : String(thrown)
}

/**
 * IF-3's three states, given a file and what may be done to it.
 *
 * ⭐ One place turns a permission into a state, so that the answer the startup
 * panel gets and the answer a restore gets cannot drift apart. ⚠️ Anything but
 * `granted` is `permissionLost`: FR-060's offer is owed to a file that cannot
 * be written just now, and the browser's "not yet asked" and "refused" are the
 * same thing to the person looking at that panel.
 *
 * @purity pure
 */
function openedStateOf(fileName: string, permission: FilePermissionState): OpenedFileState {
  return permission === 'granted'
    ? { kind: 'writable', fileName }
    : { kind: 'permissionLost', fileName }
}

/**
 * The first file among the things dropped, or none. ⚠️ A folder is one of
 * these as far as the browser is concerned -- see `readDroppedFile`.
 *
 * ⛔ The rest are ignored rather than opened. OP-3 of table T-024a asks the
 * person one question about one read content and OP-8 forbids a second open
 * while one is running, so five files dropped at once are not five opens, and
 * there is no row that says which of them would win.
 *
 * @purity pure
 */
function firstDroppedFile(items: DroppedItems): DroppedItem | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (item !== undefined && item.kind === 'file') return item
  }
  return null
}

// ---------------------------------------------------------- semi-pure-b ----
//
// ⚠️ Below this line the answers come from outside and can differ between two
// calls a moment apart. FR-060 is explicit that permission goes missing, which
// is why IF-3 has the state ASKED for and never remembered.

/**
 * Whether the file behind this handle may be written right now.
 *
 * ⚠️ A browser with handles but no `queryPermission` is answered `granted`,
 * which is the optimistic side on purpose: the pessimistic side would put
 * FR-060's restore offer onto the startup panel (NT-4 of table T-037) every
 * time nothing was wrong, and a write that turns out to be refused comes back
 * as `permissionLost` anyway.
 * Searched: FR-060, LM-14 of table T-004, CN-2 of table T-003, IF-3 of table
 * T-065.
 *
 * @provisional PD-105
 *
 * @purity semi-pure-b
 */
async function readWritePermission(handle: FileHandle): Promise<FilePermissionState> {
  if (handle.queryPermission === undefined) return 'granted'
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    // ⛔ FR-028 (MUST NOT): a failure is a value. A query that itself failed
    // tells us nothing, and 'prompt' is the state that asks before writing.
    return 'prompt'
  }
}

/**
 * IF-3's three states, for the handle we are holding.
 *
 * ⭐ Read rather than remembered, and read whole: this is the one place that
 * turns "we have a handle" plus "we may write it" into the single value the
 * caller switches on, which is why a `null` name can never meet a `true` flag.
 *
 * @purity semi-pure-b
 */
async function readOpenedState(handle: FileHandle | null): Promise<OpenedFileState> {
  if (handle === null) return { kind: 'none' }
  return openedStateOf(handle.name, await readWritePermission(handle))
}

// -------------------------------------------------------------- non-pure ----
//
// ⚠️ From here down the disk changes, permission prompts appear, and the
// handle this component holds is replaced.

/**
 * Ask for write permission, from inside whatever gesture the caller is in.
 *
 * ⭐ Both FR-060's overwrite and its startup restore end here. They are not
 * two rules: the requirement is that the round trip closes on one file, and
 * asking twice in two different ways would be two answers to one question.
 *
 * @purity non-pure
 */
async function requestWritePermission(handle: FileHandle): Promise<FilePermissionState> {
  if (handle.requestPermission === undefined) return await readWritePermission(handle)
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    // ⚠️ This is the no-gesture case as well as the refusal case. Both leave
    // the file unwritten, and both are answered by asking again from a click.
    return 'denied'
  }
}

/**
 * Put the bytes into the file, or say why they are not there.
 *
 * ⛔ The bytes are written exactly as they arrived. CN-5 of table T-003 fixes
 * UTF-8 with no BOM and table T-024's note forbids adding one (MUST NOT) --
 * it points out that doing nothing is already correct, and the damage comes
 * from prepending one on purpose. ⚠️ Nothing may be put in front of `bytes`.
 *
 * ⛔ `keepExistingData: false` is stated rather than left to the default: it
 * is what truncates the file, and without it a document that got shorter would
 * leave the tail of the previous one behind and produce a file that is neither
 * of the two formats table T-024 admits.
 *
 * ⚠️ A stream that failed part-way is aborted rather than dropped. An open
 * writable holds a lock on the file, so leaving one behind makes the NEXT save
 * fail too, on a file the person can see nothing wrong with.
 *
 * @purity non-pure
 */
async function writeBytesToFile(
  handle: FileHandle,
  bytes: Uint8Array,
): Promise<FileStoreFault | null> {
  let writable: WritableFileStream
  try {
    writable = await handle.createWritable({ keepExistingData: false })
  } catch (thrown) {
    return isDenial(thrown)
      ? fault('permissionLost', `${handle.name}: ${whyOf(thrown)}`)
      : fault('unavailable', `${handle.name}: ${whyOf(thrown)}`)
  }

  try {
    // ⚠️ Copied, not cast. A stream's chunk refuses a view onto a buffer that
    // might be shared with another thread, and the seam's `Uint8Array` does not
    // say it is not one; a buffer this function owns is the honest narrowing,
    // and it also holds the content still for the length of an asynchronous
    // write. ⛔ Not a reshaping of the content: same bytes, same order, and
    // nothing added -- see the BOM note above.
    await writable.write(new Uint8Array(bytes))
    await writable.close()
    return null
  } catch (thrown) {
    await writable.abort().catch(() => undefined)
    return fault('unavailable', `${handle.name}: ${whyOf(thrown)}`)
  }
}

/**
 * The one implementation of FileStore (PI-28).
 *
 * ⭐ A closure rather than a class: the state is two values and neither is
 * anyone else's business, and R7.5 keeps mutable state out of the pure side by
 * putting it exactly here.
 *
 * @purity non-pure
 */
export function fileSystemAccessFileStore(
  environment: FileSystemAccessEnvironment,
): FileStore {
  /**
   * The file FR-060 overwrites. ⛔ Never handed out and never compared: IF-3
   * is built so that no one else can hold one, and one holder cannot be asked
   * which of two is current.
   */
  let openedHandle: FileHandle | null = null

  /**
   * What the last drop left, waiting to be asked for.
   *
   * ⚠️ Both parts are taken while the drop event is being handled, because
   * that is the only moment they exist. The handle is a promise on purpose:
   * `getAsFileSystemHandle` must be CALLED during the event but may be awaited
   * afterwards.
   */
  let droppedFile: {
    readonly file: ReadableFile | null
    readonly handle: Promise<DroppedHandle | null> | null
  } | null = null

  /**
   * Whether one of the three members that shows a chooser or writes is running.
   *
   * ⚠️ Not OP-8. OP-8 is ImportDocument's rule about an import in flight, and
   * this is the store's own: two reads at once would both set `openedHandle`
   * and the loser could land last, making "the file that is open" depend on
   * which chooser the person answered first. The browser refuses a second file
   * picker as well, and a refusal shaped like the others beats a thrown one.
   */
  let isBusy = false

  /**
   * Declare this surface a place a file may be let go of.
   *
   * ⛔ Without the refusal of the default here, the drop event never arrives at
   * all: a surface that does not refuse it during the drag is not a drop
   * target, and the browser goes on to leave the page and open the file
   * itself, discarding the document and every unsaved edit in it without the
   * confirmation OP-4 of table T-024a makes mandatory.
   *
   * ⚠️ Only a drag carrying files is intercepted, so dragging text within the
   * app still behaves as the browser intends.
   *
   * @purity non-pure
   */
  function allowFileDrag(event: DropEvent): void {
    const transfer = event.dataTransfer
    if (transfer === null || !transfer.types.includes('Files')) return
    event.preventDefault()
  }

  /**
   * Take what was dropped, before the browser takes it back.
   *
   * ⚠️ Both `getAsFileSystemHandle` and `getAsFile` are CALLED here and not a
   * tick later. What a drop carries is alive only while the event is being
   * handled, so a store that waited to be asked would find nothing left.
   *
   * ⚠️ `.catch` is attached to the handle promise the moment it is made rather
   * than where it is awaited: nothing may await it at all (the person can drop
   * a file and never open it), and an unattended rejection is a warning nobody
   * asked for on a path that is not a failure.
   *
   * ⭐ A drop nobody opened is simply replaced by the next one. Keeping a queue
   * would mean the person's second drop opened their first file.
   *
   * @purity non-pure
   */
  function takeDroppedFile(event: DropEvent): void {
    const transfer = event.dataTransfer
    if (transfer === null || !transfer.types.includes('Files')) return
    event.preventDefault()

    const item = firstDroppedFile(transfer.items)
    if (item === null) return
    const handle = item.getAsFileSystemHandle?.().catch(() => null) ?? null
    droppedFile = { file: item.getAsFile(), handle }
  }

  // ⭐ The capture phase, so that the file is already taken by the time
  // anything else in the app reacts to the same drop and asks for it. ⛔ Not a
  // rule about who registers first: the caller's own drop handler is free to
  // sit anywhere, because the capture phase reaches this surface before any of
  // the bubbling ones. ⚠️ There is no matching removal -- the store lives as
  // long as the page does, and a store that stopped listening would leave the
  // page navigating away on the next drop.
  environment.dropSurface.addEventListener('dragover', allowFileDrag, { capture: true })
  environment.dropSurface.addEventListener('drop', takeDroppedFile, { capture: true })

  /**
   * Read the chosen file whole, and remember where it came from.
   *
   * ⭐ The handle is adopted only after the bytes are in hand, so a chooser
   * that was answered with a file that then could not be read leaves the
   * previously opened file standing rather than replacing it with nothing.
   *
   * @purity non-pure
   */
  async function readChosenFile(): Promise<FileReading> {
    const picker = environment.openFilePicker
    if (picker === undefined) {
      return {
        ok: false,
        fault: fault('unavailable', 'this browser has no file chooser (CN-2 / LM-14)'),
      }
    }

    let chosen: readonly FileHandle[]
    try {
      // ⛔ One file. OP-2 of table T-024a has one entry and OP-3 asks one
      // question about one read content.
      //
      // ⛔ No type filter, although OP-1 admits exactly two formats: no table
      // gives either of them a file extension or a media type, and inventing a
      // pair here would hide a file whose name does not match from the person
      // who knows what it is. FR-023's validation stays the place a file is
      // refused.
      // Searched: OP-1 of table T-024a, table T-024, CN-5 of table T-003,
      // `_assets/tbl-glossary.md`.
      // @provisional PD-104
      chosen = await picker({ multiple: false })
    } catch (thrown) {
      if (isDismissal(thrown)) return { ok: false, fault: fault('cancelled', whyOf(thrown)) }
      return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
    }

    const handle = chosen[0]
    if (handle === undefined) {
      return { ok: false, fault: fault('cancelled', 'the chooser named no file') }
    }

    try {
      const file = await handle.getFile()
      const bytes = new Uint8Array(await file.arrayBuffer())
      openedHandle = handle
      return { ok: true, file: { bytes, fileName: file.name } }
    } catch (thrown) {
      return { ok: false, fault: fault('unavailable', `${handle.name}: ${whyOf(thrown)}`) }
    }
  }

  /**
   * Read what the last drop left.
   *
   * ⭐ Consumed once. A file the person dropped and never opened must not be
   * handed to the open that comes minutes later from a different control --
   * that would open a file nobody pointed at just then.
   *
   * ⛔ The handle is replaced even when the drop brought none. A dropped file
   * that cannot be remembered has to CLEAR the previous one: leaving it would
   * put the document from one file on the screen while the save icon wrote
   * over another.
   *
   * ⚠️ A dropped FOLDER arrives here as well -- what the browser calls a
   * dropped file covers both, and only the handle tells them apart. It is read
   * like anything else and refused by FR-023's validation downstream, because
   * nothing in this component judges what a file contains.
   *
   * @purity non-pure
   */
  async function readDroppedFile(): Promise<FileReading> {
    const drop = droppedFile
    droppedFile = null
    if (drop === null) {
      // ⚠️ IF-3 puts "dropped nothing" under `cancelled` with the dismissed
      // chooser: neither is a failure, and neither owes the person a step.
      return { ok: false, fault: fault('cancelled', 'nothing was dropped') }
    }

    const dropped = drop.handle === null ? null : await drop.handle
    const handle = dropped !== null && dropped.kind === 'file' ? dropped : null

    try {
      const file = drop.file ?? (handle === null ? null : await handle.getFile())
      if (file === null) {
        return { ok: false, fault: fault('unavailable', 'the drop carried no readable file') }
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      openedHandle = handle
      return { ok: true, file: { bytes, fileName: file.name } }
    } catch (thrown) {
      return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
    }
  }

  /**
   * Write, and say what may be overwritten afterwards.
   *
   * ⭐ A file just written is writable by the fact that it was written, so the
   * state is stated rather than asked for again -- R7.4 keeps a new external
   * read out of the middle of handling a result.
   *
   * @purity non-pure
   */
  async function saveToFile(
    handle: FileHandle,
    bytes: Uint8Array,
    becomesOpenedFile: boolean,
  ): Promise<FileWriting> {
    const failed = await writeBytesToFile(handle, bytes)
    if (failed !== null) return { ok: false, fault: failed }
    if (becomesOpenedFile) openedHandle = handle
    return {
      ok: true,
      openedFile:
        openedHandle === handle
          ? { kind: 'writable', fileName: handle.name }
          : await readOpenedState(openedHandle),
    }
  }

  /** ⚠️ The store's own guard, not OP-8's. See `isBusy`. @purity pure */
  function busyFault(): FileStoreFault {
    return fault('unavailable', 'the store is already reading or writing a file')
  }

  return {
    /**
     * ⚠️ IF-3 annotates this `semi-pure-b`, which is what the CALLER may rely
     * on: the answer is decided by the file and by the person, never by
     * anything remembered here. The implementation ALSO remembers the handle,
     * and R7.1 calls internal mutable state non-pure, so the tag below is the
     * stricter of the two. Table T-075 gives UF-51 both values for this reason.
     *
     * ⛔ The whole file is read into memory, and nothing here checks S-113's
     * ceiling first. FileGateway states the division -- it reports
     * `byteLength` and ValidateImportedDocument (CP-13) rules on it under
     * FR-023 -- and refusing here would need a reason IF-3 does not have. See
     * PD-103.
     *
     * ⛔ Whichever route succeeds becomes the file FR-060 overwrites, and a
     * file the codecs later refuse stays that file: IF-3 has no member for
     * "the document was accepted". See PD-101.
     *
     * @purity non-pure
     */
    async readFileToOpen(route: OpenRoute): Promise<FileReading> {
      if (isBusy) return { ok: false, fault: busyFault() }
      isBusy = true
      try {
        return route === 'chooser' ? await readChosenFile() : await readDroppedFile()
      } finally {
        isBusy = false
      }
    },

    /**
     * ⭐ The only member that changes nothing, which is why it keeps IF-3's
     * `semi-pure-b` where `readFileToOpen` above could not: it asks the
     * browser and answers, and the same question a second later may well get a
     * different answer. That is the point -- FR-060 has permission going
     * missing, so this is asked rather than remembered.
     *
     * @purity semi-pure-b
     */
    async readOpenedFileState(): Promise<OpenedFileState> {
      return await readOpenedState(openedHandle)
    },

    /**
     * FR-060's second MUST, minus the part this unit cannot keep.
     *
     * ⛔ Only a file opened during THIS run can be restored. A handle does not
     * survive a reload on its own, and the specification names no place to
     * keep one -- LY-5 lists the browser things this layer uses and IO-5 of
     * table T-024 gives localStorage to autosave, neither of which can hold a
     * handle. So after a restart this answers `none`, and FR-060's startup
     * offer has nothing to offer. See PD-100; ⛔ do not invent a second store
     * to close it.
     *
     * @purity non-pure
     */
    async restoreOpenedFilePermission(): Promise<OpenedFileState> {
      const handle = openedHandle
      if (handle === null) return { kind: 'none' }
      return openedStateOf(handle.name, await requestWritePermission(handle))
    },

    /**
     * ⭐ Permission is asked for here rather than left to the caller: the save
     * the person just clicked IS the gesture a browser wants, and a store that
     * only ever reported `permissionLost` would make the first save of every
     * session fail on a file that is perfectly writable.
     *
     * ⚠️ The fault names the file (NT-1 of table T-037 requires the notice to
     * say WHICH item), and `notices.ts` (UF-67) turns the reason into the next
     * step NT-3a requires.
     *
     * @purity non-pure
     */
    async overwriteOpenedFile(bytes: Uint8Array): Promise<FileWriting> {
      // ⚠️ Asked before the handle is looked at: a read that is running is
      // about to decide what the opened file is, and `noOpenedFile` reported
      // in the middle of one is an answer that stops being true a moment later.
      if (isBusy) return { ok: false, fault: busyFault() }
      const handle = openedHandle
      if (handle === null) {
        return {
          ok: false,
          fault: fault('noOpenedFile', 'no file has been opened, so there is none to overwrite'),
        }
      }
      isBusy = true
      try {
        const permission = await requestWritePermission(handle)
        if (permission !== 'granted') {
          return {
            ok: false,
            fault: fault('permissionLost', `${handle.name}: write permission is ${permission}`),
          }
        }
        return await saveToFile(handle, bytes, true)
      } finally {
        isBusy = false
      }
    },

    /**
     * ⛔ Whether the file just written becomes the one later overwrite-saves
     * land on is the caller's ruling, carried in `shouldBecomeOpenedFile`.
     * `file-gateway.ts` decides it from table T-024's direction column, and
     * this side must not second-guess it.
     *
     * @purity non-pure
     */
    async writeChosenFile(write: ChosenFileWrite): Promise<FileWriting> {
      const picker = environment.saveFilePicker
      if (picker === undefined) {
        return {
          ok: false,
          fault: fault('unavailable', 'this browser has no save chooser (CN-2 / LM-14)'),
        }
      }
      if (isBusy) return { ok: false, fault: busyFault() }
      isBusy = true
      try {
        const handle = await picker({ suggestedName: write.suggestedFileName })
        return await saveToFile(handle, write.bytes, write.shouldBecomeOpenedFile)
      } catch (thrown) {
        if (isDismissal(thrown)) return { ok: false, fault: fault('cancelled', whyOf(thrown)) }
        // ⚠️ A refused gesture lands here with nothing remembered to call
        // `permissionLost` about. See PD-102.
        return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
      } finally {
        isBusy = false
      }
    },
  }
}
