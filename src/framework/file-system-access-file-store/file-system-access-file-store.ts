// FileSystemAccessFileStore -- public entry of this folder.
//
// @unit      UF-51   (docs/spec/05-07-design.md, table T-075)
// @component FileSystemAccessFileStore, layer Framework (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-28
//
// Implements FileStore (IF-3 of table T-065) as `adapter/file-gateway/file-store.ts`
// shapes it (LR-5), widening nothing.
//
// A component rather than an Adapter function because it holds the opened file
// handle (CP-28, FR-060) -- a current value that outlives a call, which LY-5 of
// table T-060 gives to this layer alone.
//
// Everything taken from the browser arrives in `FileSystemAccessEnvironment`
// (R7.3), so the unit runs under Node with plain objects. ⛔ Do not reach for
// `window`: the whole component would then need a browser to test.
//
// Where the File System Access API is absent (CN-2 of table T-003, LM-14 of
// table T-004): absent pickers answer `unavailable`, and a drop that yields no
// handle still returns the bytes but is not remembered.
// ⛔ No download fallback: FR-060's RATIONALE rejects downloads as the problem
// it solves.
//
// Every write needs a user gesture. ⛔ A refused gesture is never a promise that
// does not settle: it returns `permissionLost` when a file is remembered, else
// `unavailable`.

import type {
  ChosenFileWrite,
  ChosenWriteDestination,
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
// Declared here rather than taken from the DOM library so a test can build one.
// They are subsets of the browser types, which satisfy them without a cast.

export type FilePermissionState = 'granted' | 'denied' | 'prompt'

/** One file as the browser hands it over, before anything is read. */
export interface ReadableFile {
  readonly name: string
  /** Bytes, the unit S-113's ceiling is stated in. */
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
 * ⛔ Never crosses the seam: IF-3 is built so the inner layers cannot hold one.
 */
export interface FileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<ReadableFile>
  createWritable(options?: { keepExistingData?: boolean }): Promise<WritableFileStream>
  /** Optional: not every browser with handles has these two. Their absence is PND-105. */
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState>
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState>
}

/** A drop can hand over a directory; `kind` tells it apart. */
export type DroppedHandle = FileHandle | { readonly kind: 'directory' }

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
 * Where a drop lands; in the assembled app, the window. One surface for the
 * whole app because OP-2 of table T-024a treats a drop as one surface.
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

/**
 * One kind of file a save chooser may hold the person to.
 *
 * ⛔ No `description`: it is printed in the host's dialog, and a word written
 * here would be a second store of translated strings (FR-038, MUST NOT). The
 * host names the kind from the media type.
 */
export interface SaveFileType {
  readonly accept: Readonly<Record<string, readonly string[]>>
}

/**
 * `types` and `excludeAcceptAllOption` are optional because a form with no known
 * media type is offered without them -- some hosts refuse an empty `types`
 * beside `excludeAcceptAllOption`. See `saveFileTypesFor`.
 */
export type SaveFilePicker = (options: {
  readonly suggestedName: string
  readonly types?: readonly SaveFileType[]
  readonly excludeAcceptAllOption?: boolean
}) => Promise<FileHandle>

/**
 * What the store is given at construction.
 *
 * ⚠️ The pickers are required keys holding a possibly-missing value, so a shell
 * must say which browser it is on; a forgotten optional key would read as a
 * browser that has the API.
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
// R7.7's order: pure down to `firstDroppedFile`, then the readers, then the
// factory where the state lives.

/**
 * The media type for each extension table T-024 gives a file row.
 *
 * Held here because FR-096 (MUST NOT) keeps the media type out of every table
 * and sends it to the Framework layer. The spellings are IANA registrations,
 * not choices of this tool.
 *
 * Keyed on the extension, table T-024's join between row and file name, since
 * `SaveFileForm` does not reach this layer. ⛔ An unknown extension gets no type
 * rather than a guessed one, which would enforce an extension nothing chose.
 */
const MEDIA_TYPE_OF_EXTENSION: Readonly<Record<string, string>> = {
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.html': 'text/html',
}

/**
 * What the chooser is told the file is, or `undefined`.
 *
 * FR-096's extension is kept by this, not by the suggested name: a chooser given
 * no `types` treats the name's tail as decoration and saves without it.
 * ⛔ `excludeAcceptAllOption` rides with the type -- an "all files" entry would
 * reopen the path to an extension-less name -- and only where a type is known.
 *
 * @purity pure
 */
function saveFileTypesFor(extension: string): readonly SaveFileType[] | undefined {
  const mediaType = MEDIA_TYPE_OF_EXTENSION[extension]
  if (mediaType === undefined) return undefined
  return [{ accept: { [mediaType]: [extension] } }]
}

/** @purity pure */
function fault(reason: FileStoreFaultReason, what: string): FileStoreFault {
  return { reason, what }
}

/**
 * The person stopped the chooser -- kept apart so `cancelled` is not notified
 * (IF-3); a closed dialog owes no next step under NT-3a.
 *
 * @purity pure
 */
function isDismissal(thrown: unknown): boolean {
  return thrown instanceof Error && thrown.name === 'AbortError'
}

/**
 * The browser refused rather than failed. `SecurityError` is included because
 * some browsers raise it for a call outside a user gesture.
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
 * IF-3's states, given a file and its permission. One place, so a read and a
 * restore cannot drift apart. Anything but `granted` is `permissionLost`: "not
 * yet asked" and "refused" both mean the file cannot be saved over now.
 *
 * @purity pure
 */
function openedStateOf(fileName: string, permission: FilePermissionState): OpenedFileState {
  return permission === 'granted'
    ? { kind: 'writable', fileName }
    : { kind: 'permissionLost', fileName }
}

/**
 * How many dropped things were offered as files (OP-11 of table T-024a).
 * Counted during the event, like the file itself -- see `takeDroppedFile`.
 *
 * @purity pure
 */
function countDroppedFiles(items: DroppedItems): number {
  let count = 0
  for (let index = 0; index < items.length; index += 1) {
    if (items[index]?.kind === 'file') count += 1
  }
  return count
}

/**
 * The first dropped file, or none. A folder counts as one -- see `readDroppedFile`.
 *
 * The rest are not opened: OP-3 asks one question about one content and OP-8
 * forbids a second open; OP-11 settles that the first wins.
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
// Below this line answers come from outside and can differ a moment apart; IF-3
// has permission asked for, never remembered (FR-060).

/**
 * Whether the file behind this handle may be written right now.
 *
 * A host without `queryPermission` is answered `granted`: the pessimistic answer
 * would make FR-060's overwrite unreachable there for good, and a write that is
 * refused still returns `permissionLost`.
 *
 * @provisional PND-105
 *
 * @purity semi-pure-b
 */
async function readWritePermission(handle: FileHandle): Promise<FilePermissionState> {
  if (handle.queryPermission === undefined) return 'granted'
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    // FR-028: a failed query tells nothing, and 'prompt' asks before writing.
    return 'prompt'
  }
}

/**
 * IF-3's states for the held handle, read whole so a `null` name never meets a
 * writable state.
 *
 * @purity semi-pure-b
 */
async function readOpenedState(handle: FileHandle | null): Promise<OpenedFileState> {
  if (handle === null) return { kind: 'none' }
  return openedStateOf(handle.name, await readWritePermission(handle))
}

/**
 * What stands where a chosen write is about to land, read once (CS-4 of table
 * T-066) -- see `writeChosenFile`.
 *
 * The name comes off the file read, not the suggestion: the person may have
 * overruled it, and DI-1 of table T-227 compares the real name.
 * A destination with no bytes reports `empty`; DI-6 of table T-227 treats a
 * created file and one standing empty alike.
 *
 * @purity semi-pure-b
 */
async function readWriteDestination(handle: FileHandle): Promise<ChosenWriteDestination> {
  const file = await handle.getFile()
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.byteLength === 0) return { kind: 'empty' }
  return { kind: 'occupied', fileName: file.name, bytes }
}

// -------------------------------------------------------------- non-pure ----
//
// From here down the disk changes, permission prompts appear, and the held
// handle is replaced.

/**
 * Ask for write permission, inside the caller's gesture. The overwrite and
 * `restoreOpenedFilePermission` both ask through here, so the question is asked
 * one way.
 *
 * @purity non-pure
 */
async function requestWritePermission(handle: FileHandle): Promise<FilePermissionState> {
  if (handle.requestPermission === undefined) return await readWritePermission(handle)
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    // The no-gesture case as well as the refusal: both are answered by asking
    // again from a click.
    return 'denied'
  }
}

/**
 * Put the bytes into the file, or say why they are not there.
 *
 * ⛔ Nothing may be put in front of `bytes` (no BOM: CN-5 of table T-003, table
 * T-024's note).
 *
 * ⛔ `keepExistingData: false` is stated: it truncates, and without it a shorter
 * document would leave the previous tail behind.
 *
 * ⚠️ A stream that failed part-way is aborted: an open writable locks the file,
 * and the next save would fail too.
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
    // ⚠️ Copied, not cast: a stream chunk refuses a view onto a possibly shared
    // buffer, and an owned copy also holds the content still during the write.
    // Same bytes, same order.
    await writable.write(new Uint8Array(bytes))
    await writable.close()
    return null
  } catch (thrown) {
    await writable.abort().catch(() => undefined)
    return fault('unavailable', `${handle.name}: ${whyOf(thrown)}`)
  }
}

/**
 * The one implementation of FileStore (PI-28). A closure: its state is two
 * private values, and R7.5 puts mutable state here.
 *
 * @purity non-pure
 */
export function fileSystemAccessFileStore(
  environment: FileSystemAccessEnvironment,
): FileStore {
  /** The file FR-060 overwrites. ⛔ Never handed out: IF-3 lets no one else hold one. */
  let openedHandle: FileHandle | null = null

  /**
   * What the last drop left, waiting to be asked for.
   *
   * ⚠️ Taken while the drop event is handled, the only moment it exists. The
   * handle is a promise because `getAsFileSystemHandle` must be CALLED during
   * the event but may be awaited later.
   */
  let droppedFile: {
    readonly file: ReadableFile | null
    readonly handle: Promise<DroppedHandle | null> | null
    /** OP-11 of table T-024a: how many arrived together and were not taken. */
    readonly ignoredFileCount: number
  } | null = null

  /**
   * Whether a member that shows a chooser or writes is running.
   *
   * ⚠️ The store's own guard, not OP-8: two concurrent reads would both set
   * `openedHandle` and the loser could land last. The browser also refuses a
   * second picker; a refusal shaped like the others beats a throw.
   */
  let isBusy = false

  /**
   * Declare this surface a drop target.
   *
   * ⛔ Without `preventDefault` here the drop event never arrives, and the browser
   * navigates to the file, discarding unsaved edits without OP-4's confirmation.
   * Only drags carrying files are intercepted.
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
   * ⚠️ `getAsFileSystemHandle` and `getAsFile` are called here, not a tick later:
   * drop items are alive only during the event.
   * ⚠️ `.catch` is attached at once: the promise may never be awaited, and an
   * unattended rejection would warn on a path that is not a failure.
   * A later drop replaces an unopened one; a queue would open the older file.
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
    droppedFile = {
      file: item.getAsFile(),
      handle,
      // OP-11 of table T-024a: the first is kept, so every other file was left.
      ignoredFileCount: countDroppedFiles(transfer.items) - 1,
    }
  }

  // Capture phase, so the file is taken before any bubbling handler in the app
  // asks for it. ⚠️ No matching removal: the store lives as long as the page, and
  // a store that stopped listening would let the next drop navigate away.
  environment.dropSurface.addEventListener('dragover', allowFileDrag, { capture: true })
  environment.dropSurface.addEventListener('drop', takeDroppedFile, { capture: true })

  /**
   * Read the chosen file whole, and remember it.
   *
   * The handle is adopted only after the bytes are in hand, so an unreadable
   * choice leaves the previously opened file standing.
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
      // One file: OP-2 of table T-024a has one entry and OP-3 one question.
      //
      // ⛔ No type filter although OP-1 admits two formats: no table gives them an
      // extension or media type, and FR-023's validation is where a file is refused.
      // Searched: OP-1 of table T-024a, table T-024, CN-5 of table T-003,
      // `_assets/tbl-glossary.md`.
      // @provisional PND-104
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
   * OP-13 of table T-024a: the open file read again, with no chooser.
   *
   * With no file open this does nothing, which `cancelled` expresses (IF-3 does
   * not notify it). The handle is not re-assigned: nothing happened to the save
   * target.
   *
   * @purity non-pure
   */
  async function readOpenedFileAgain(): Promise<FileReading> {
    const handle = openedHandle
    if (handle === null) {
      return { ok: false, fault: fault('cancelled', 'no file is open to read again') }
    }
    try {
      const file = await handle.getFile()
      const bytes = new Uint8Array(await file.arrayBuffer())
      return { ok: true, file: { bytes, fileName: file.name } }
    } catch (thrown) {
      return { ok: false, fault: fault('unavailable', `${handle.name}: ${whyOf(thrown)}`) }
    }
  }

  /**
   * Read what the last drop left.
   *
   * Consumed once, so a later open from another control never opens a file nobody
   * just pointed at.
   * ⛔ The handle is replaced even when the drop brought none: keeping the old one
   * would show one file's document while saving over another.
   * A dropped folder is read like anything else and refused by FR-023's
   * validation downstream.
   *
   * @purity non-pure
   */
  async function readDroppedFile(): Promise<FileReading> {
    const drop = droppedFile
    droppedFile = null
    if (drop === null) {
      // IF-3 puts "dropped nothing" under `cancelled`: not a failure.
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
      const opened = { bytes, fileName: file.name }
      // OP-11 of table T-024a: the count rides beside a success. Omitted rather
      // than zero, which is what its absence means in `FileReading`.
      if (drop.ignoredFileCount === 0) return { ok: true, file: opened }
      return { ok: true, file: opened, ignoredFileCount: drop.ignoredFileCount }
    } catch (thrown) {
      return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
    }
  }

  /**
   * Write, and say what may be overwritten afterwards.
   *
   * A file just written is writable, so the state is stated rather than asked
   * again (R7.4).
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

  /** The store's own guard, not OP-8's. See `isBusy`. @purity pure */
  function busyFault(): FileStoreFault {
    return fault('unavailable', 'the store is already reading or writing a file')
  }

  return {
    /**
     * IF-3 annotates this `semi-pure-b` for the caller; the implementation also
     * remembers the handle, which R7.1 calls non-pure, so the stricter tag is
     * used (table T-075 gives UF-51 both).
     *
     * ⛔ S-113's ceiling is not checked here: ValidateImportedDocument (CP-13)
     * rules on it under FR-023.
     * ⛔ The route that succeeds becomes the file FR-060 overwrites, even if the
     * codecs later refuse it: IF-3 has no "accepted" member.
     *
     * @purity non-pure
     */
    async readFileToOpen(route: OpenRoute): Promise<FileReading> {
      if (isBusy) return { ok: false, fault: busyFault() }
      isBusy = true
      try {
        if (route === 'chooser') return await readChosenFile()
        if (route === 'reopen') return await readOpenedFileAgain()
        return await readDroppedFile()
      } finally {
        isBusy = false
      }
    },

    /**
     * Changes nothing, so it keeps IF-3's `semi-pure-b`; permission is asked
     * each time because it can go missing (FR-060).
     *
     * @purity semi-pure-b
     */
    async readOpenedFileState(): Promise<OpenedFileState> {
      return await readOpenedState(openedHandle)
    },

    /**
     * Ask back write permission for the file THIS RUN opened. After a restart
     * this answers `none`, as FR-060 requires.
     *
     * ⛔ Do not persist the handle to survive a reload (FR-060, MUST NOT).
     *
     * @purity non-pure
     */
    async restoreOpenedFilePermission(): Promise<OpenedFileState> {
      const handle = openedHandle
      if (handle === null) return { kind: 'none' }
      return openedStateOf(handle.name, await requestWritePermission(handle))
    },

    /**
     * Permission is requested here because the save click IS the gesture;
     * only reporting `permissionLost` would fail every session's first save.
     *
     * The fault names the file (NT-1 of table T-037); `notices.ts` (UF-67) adds
     * the next step (NT-3a).
     *
     * @purity non-pure
     */
    async overwriteOpenedFile(bytes: Uint8Array): Promise<FileWriting> {
      // ⚠️ Checked before the handle: a running read is about to decide the opened
      // file, so `noOpenedFile` reported now could stop being true a moment later.
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
     * ⛔ Whether the written file becomes the overwrite target is the caller's
     * ruling (`shouldBecomeOpenedFile`, from table T-024's direction column in
     * `file-gateway.ts`); do not second-guess it.
     *
     * ⛔ Nor is the destination judged here: table T-227 belongs to the near side.
     * This member reads it once (CS-4 of table T-066) while both the destination
     * and the unwritten bytes exist (R7.4).
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
        let handle: FileHandle
        try {
          // FR-096: the name is a suggestion, the kind is not -- see `saveFileTypesFor`.
          // The two members are omitted, not `undefined`, where no media type is
          // known, so the chooser sees the plain shape.
          const types = saveFileTypesFor(write.extension)
          handle = await picker(
            types === undefined
              ? { suggestedName: write.suggestedFileName }
              : {
                  suggestedName: write.suggestedFileName,
                  types,
                  excludeAcceptAllOption: true,
                },
          )
        } catch (thrown) {
          if (isDismissal(thrown)) {
            return { ok: false, fault: fault('cancelled', whyOf(thrown)) }
          }
          // A refused gesture lands here with nothing remembered to call
          // `permissionLost` about.
          return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
        }

        // ⛔ The order is IF-3's: point, read the destination, ask, and write only
        // on `true`. Skipping to the write leaves DI-4 unkept.
        let mayWriteOver: boolean
        try {
          const destination = await readWriteDestination(handle)
          mayWriteOver = await write.askToWriteOver(destination)
        } catch (thrown) {
          // ⚠️ A destination nobody could read is not written over: overwriting is
          // unrecoverable, one more failure is not (DI-2). NT-1 wants the name.
          return {
            ok: false,
            fault: fault('unavailable', `${handle.name}: ${whyOf(thrown)}`),
          }
        }
        if (!mayWriteOver) {
          // `cancelled`, not a failure: the person called the write off.
          return {
            ok: false,
            fault: fault('cancelled', `${handle.name}: the overwrite was not agreed to`),
          }
        }

        return await saveToFile(handle, write.bytes, write.shouldBecomeOpenedFile)
      } finally {
        isBusy = false
      }
    },
  }
}
