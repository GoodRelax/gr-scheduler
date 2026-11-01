// FileStore over the browser's File System Access API.
// @unit      UF-51   (docs/spec/05-07-design.md, table T-075)
// @component FileSystemAccessFileStore, layer Framework (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-28

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

export type FilePermissionState = 'granted' | 'denied' | 'prompt'

export interface ReadableFile {
  readonly name: string
  readonly size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface WritableFileStream {
  write(data: BufferSource): Promise<void>
  close(): Promise<void>
  abort(): Promise<void>
}

export interface FileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<ReadableFile>
  createWritable(options?: { keepExistingData?: boolean }): Promise<WritableFileStream>
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState>
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState>
}

export type DroppedHandle = FileHandle | { readonly kind: 'directory' }

export interface DroppedItem {
  readonly kind: string
  getAsFile(): ReadableFile | null
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

export interface DropSurface {
  addEventListener(
    type: 'dragover' | 'drop',
    listener: (event: DropEvent) => void,
    options: { capture: boolean },
  ): void
}

// see FR-060, S-452
interface ChooserPlace {
  readonly id: string
  readonly startIn?: FileHandle
}

export type OpenFilePicker = (options: ChooserPlace & {
  readonly multiple: false
}) => Promise<readonly FileHandle[]>

export interface SaveFileType {
  readonly accept: Readonly<Record<string, readonly string[]>>
}

export type SaveFilePicker = (options: ChooserPlace & {
  readonly suggestedName: string
  readonly types?: readonly SaveFileType[]
  readonly excludeAcceptAllOption?: boolean
}) => Promise<FileHandle>

// see FR-068, IO-10
// WHY: the page's own download, handed in; it takes no chooser and reports nothing back.
export type StartDownload = (fileName: string, bytes: Uint8Array, mediaType: string) => void

// WHY: every browser object arrives in here so the unit runs under Node; never reach for window.
export interface FileSystemAccessEnvironment {
  readonly openFilePicker: OpenFilePicker | undefined
  readonly saveFilePicker: SaveFilePicker | undefined
  readonly dropSurface: DropSurface
  readonly startDownload?: StartDownload
}

// see FR-096, T-024
// TRAP: excludeAcceptAllOption rides only with a known type; some hosts refuse it beside empty types.
// WHY: no description: the OS names the one extension in its own language; a word here would be one language.
/** @purity pure */
function saveFileTypesFor(extension: string): readonly SaveFileType[] | undefined {
  const mediaType = MEDIA_TYPE_OF_EXTENSION[extension]
  if (mediaType === undefined) return undefined
  return [{ accept: { [mediaType]: [extension] } }]
}

// see T-024, IO-10
/** @purity pure */
function mediaTypeOfFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const extension = dot < 0 ? '' : fileName.slice(dot)
  return MEDIA_TYPE_OF_EXTENSION[extension] ?? UNKNOWN_MEDIA_TYPE
}

const UNKNOWN_MEDIA_TYPE = 'application/octet-stream'

/** @purity pure */
function fault(reason: FileStoreFaultReason, what: string): FileStoreFault {
  return { reason, what }
}

/** @purity pure */
function isDismissal(thrown: unknown): boolean {
  return thrown instanceof Error && thrown.name === 'AbortError'
}

// WHY: SecurityError counts as a denial; some browsers raise it for a call outside a user gesture.
/** @purity pure */
function isDenial(thrown: unknown): boolean {
  return (
    thrown instanceof Error &&
    (thrown.name === 'NotAllowedError' || thrown.name === 'SecurityError')
  )
}

/** @purity pure */
function whyOf(thrown: unknown): string {
  return thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : String(thrown)
}

/** @purity pure */
function openedStateOf(fileName: string, permission: FilePermissionState): OpenedFileState {
  return permission === 'granted'
    ? { kind: 'writable', fileName }
    : { kind: 'permissionLost', fileName }
}

// see OP-11
/** @purity pure */
function countDroppedFiles(items: DroppedItems): number {
  let count = 0
  for (let index = 0; index < items.length; index += 1) {
    if (items[index]?.kind === 'file') count += 1
  }
  return count
}

// see OP-3, OP-11
/** @purity pure */
function firstDroppedFile(items: DroppedItems): DroppedItem | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (item !== undefined && item.kind === 'file') return item
  }
  return null
}

/** @purity semi-pure-b */
async function readWritePermission(handle: FileHandle): Promise<FilePermissionState> {
  if (handle.queryPermission === undefined) return 'granted'
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'prompt'
  }
}

/** @purity semi-pure-b */
async function readOpenedState(handle: FileHandle | null): Promise<OpenedFileState> {
  if (handle === null) return { kind: 'none' }
  return openedStateOf(handle.name, await readWritePermission(handle))
}

// see CS-4, T-227
/** @purity semi-pure-b */
async function readWriteDestination(handle: FileHandle): Promise<ChosenWriteDestination> {
  const file = await handle.getFile()
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.byteLength === 0) return { kind: 'empty' }
  return { kind: 'occupied', fileName: file.name, bytes }
}

/** @purity non-pure */
async function requestWritePermission(handle: FileHandle): Promise<FilePermissionState> {
  if (handle.requestPermission === undefined) return await readWritePermission(handle)
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

/** @purity non-pure */
async function writeBytesToFile(
  handle: FileHandle,
  bytes: Uint8Array,
): Promise<FileStoreFault | null> {
  let writable: WritableFileStream
  try {
    // TRAP: keepExistingData false truncates; without it a shorter document leaves the old tail.
    writable = await handle.createWritable({ keepExistingData: false })
  } catch (thrown) {
    return isDenial(thrown)
      ? fault('permissionLost', `${handle.name}: ${whyOf(thrown)}`)
      : fault('unavailable', `${handle.name}: ${whyOf(thrown)}`)
  }

  try {
    // TRAP: copy, do not cast; a stream chunk refuses a view onto a possibly shared buffer.
    await writable.write(new Uint8Array(bytes))
    await writable.close()
    return null
  } catch (thrown) {
    // TRAP: abort a failed stream; an open writable locks the file and the next save fails too.
    await writable.abort().catch(() => undefined)
    return fault('unavailable', `${handle.name}: ${whyOf(thrown)}`)
  }
}

// see FR-060, S-452
// WHY: no known folder is ever passed as startIn; before the first read or write the browser's own default stands.
/** @purity pure */
function chooserPlaceOf(lastHandle: FileHandle | null): ChooserPlace {
  const id = NOT_STORED_FILE_CHOOSER_ID['S-452']
  return lastHandle === null ? { id } : { id, startIn: lastHandle }
}

// see FR-096, FR-060
/** @purity pure */
function saveChooserOptionsOf(write: ChosenFileWrite, place: ChooserPlace): Parameters<SaveFilePicker>[0] {
  const types = saveFileTypesFor(write.extension)
  return types === undefined
    ? { ...place, suggestedName: write.suggestedFileName }
    : { ...place, suggestedName: write.suggestedFileName, types, excludeAcceptAllOption: true }
}

/** @purity non-pure */
async function readChosenFile(
  picker: OpenFilePicker | undefined,
  place: ChooserPlace,
  proposeHandle: (handle: FileHandle) => void,
): Promise<FileReading> {
  if (picker === undefined) {
    return {
      ok: false,
      fault: fault('unavailable', 'this browser has no file chooser (CN-2 / LM-14)'),
    }
  }

  let chosen: readonly FileHandle[]
  try {
    chosen = await picker({ ...place, multiple: false })
  } catch (thrown) {
    if (isDismissal(thrown)) return { ok: false, fault: fault('canceled', whyOf(thrown)) }
    return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
  }

  const handle = chosen[0]
  if (handle === undefined) {
    return { ok: false, fault: fault('canceled', 'the chooser named no file') }
  }

  try {
    const file = await handle.getFile()
    const bytes = new Uint8Array(await file.arrayBuffer())
    // TRAP: propose the handle only after the bytes are read, so an unreadable choice proposes nothing.
    proposeHandle(handle)
    return { ok: true, file: { bytes, fileName: file.name } }
  } catch (thrown) {
    return { ok: false, fault: fault('unavailable', `${handle.name}: ${whyOf(thrown)}`) }
  }
}

// see OP-13
/** @purity non-pure */
async function readFileOfHandle(handle: FileHandle): Promise<FileReading> {
  try {
    const file = await handle.getFile()
    return { ok: true, file: { bytes: new Uint8Array(await file.arrayBuffer()), fileName: file.name } }
  } catch (thrown) {
    return { ok: false, fault: fault('unavailable', `${handle.name}: ${whyOf(thrown)}`) }
  }
}

// see PI-28, IF-3, FR-060
// WHY: a downloaded file keeps no handle; it is neither the save target nor the chooser's folder.
/** @purity non-pure */
export function fileSystemAccessFileStore(
  environment: FileSystemAccessEnvironment,
): FileStore {
  let openedHandle: FileHandle | null = null
  // see FR-060, IF-3
  // WHY: apart from openedHandle: an overlay read moves the folder but never the save target.
  let lastHandle: FileHandle | null = null
  // TRAP: a read only proposes its handle; adopting it on read let a merge save over the file it read (DFC-1224).
  let handleReadToOpen: { readonly handle: FileHandle | null } | null = null

  let droppedFile: {
    readonly file: ReadableFile | null
    readonly handle: Promise<DroppedHandle | null> | null
    readonly ignoredFileCount: number
  } | null = null

  // TRAP: two concurrent reads would both set handleReadToOpen, and the loser could land last.
  let isBusy = false

  // TRAP: without preventDefault the drop never arrives and the browser navigates away, losing edits.
  /** @purity non-pure */
  function allowFileDrag(event: DropEvent): void {
    const transfer = event.dataTransfer
    if (transfer === null || !transfer.types.includes('Files')) return
    event.preventDefault()
  }

  /** @purity non-pure */
  function takeDroppedFile(event: DropEvent): void {
    const transfer = event.dataTransfer
    if (transfer === null || !transfer.types.includes('Files')) return
    event.preventDefault()

    const item = firstDroppedFile(transfer.items)
    if (item === null) return
    // TRAP: call these during the event (drop items die after it), and attach .catch at once
    // because the promise may never be awaited.
    const handle = item.getAsFileSystemHandle?.().catch(() => null) ?? null
    droppedFile = {
      file: item.getAsFile(),
      handle,
      ignoredFileCount: countDroppedFiles(transfer.items) - 1,
    }
  }

  // TRAP: never remove these listeners; a store that stopped listening lets the next drop navigate away.
  environment.dropSurface.addEventListener('dragover', allowFileDrag, { capture: true })
  environment.dropSurface.addEventListener('drop', takeDroppedFile, { capture: true })

  /** @purity non-pure */
  function proposeHandle(handle: FileHandle | null): void {
    handleReadToOpen = { handle }
    noteHandleUsed(handle)
  }

  // see FR-060
  /** @purity non-pure */
  function noteHandleUsed(handle: FileHandle | null): void {
    if (handle !== null) lastHandle = handle
  }

  // see OP-13
  /** @purity non-pure */
  async function readOpenedFileAgain(): Promise<FileReading> {
    const handle = openedHandle
    if (handle === null) {
      return { ok: false, fault: fault('canceled', 'no file is open to read again') }
    }
    const reading = await readFileOfHandle(handle)
    if (reading.ok) noteHandleUsed(handle)
    return reading
  }

  /** @purity non-pure */
  async function readDroppedFile(): Promise<FileReading> {
    const drop = droppedFile
    droppedFile = null
    if (drop === null) {
      return { ok: false, fault: fault('canceled', 'nothing was dropped') }
    }

    const dropped = drop.handle === null ? null : await drop.handle
    const handle = dropped !== null && dropped.kind === 'file' ? dropped : null

    try {
      const file = drop.file ?? (handle === null ? null : await handle.getFile())
      if (file === null) {
        return { ok: false, fault: fault('unavailable', 'the drop carried no readable file') }
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      // TRAP: propose the handle even when the drop brought none, or one file's document saves over another.
      proposeHandle(handle)
      const opened = { bytes, fileName: file.name }
      if (drop.ignoredFileCount === 0) return { ok: true, file: opened }
      return { ok: true, file: opened, ignoredFileCount: drop.ignoredFileCount }
    } catch (thrown) {
      return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
    }
  }

  /** @purity non-pure */
  async function saveToFile(
    handle: FileHandle,
    bytes: Uint8Array,
    becomesOpenedFile: boolean,
  ): Promise<FileWriting> {
    const failed = await writeBytesToFile(handle, bytes)
    if (failed !== null) return { ok: false, fault: failed }
    noteHandleUsed(handle)
    if (becomesOpenedFile) openedHandle = handle
    return {
      ok: true,
      openedFile:
        openedHandle === handle
          ? { kind: 'writable', fileName: handle.name }
          : await readOpenedState(openedHandle),
    }
  }

  /** @purity pure */
  function busyFault(): FileStoreFault {
    return fault('unavailable', 'the store is already reading or writing a file')
  }

  return {
    // WHY: non-pure, stricter than IF-3's semi-pure-b, because this also remembers the handle.
    /** @purity non-pure */
    async readFileToOpen(route: OpenRoute): Promise<FileReading> {
      if (isBusy) return { ok: false, fault: busyFault() }
      isBusy = true
      handleReadToOpen = null
      try {
        const place = chooserPlaceOf(lastHandle)
        if (route === 'chooser') return await readChosenFile(environment.openFilePicker, place, proposeHandle)
        // WHY: OP-9 / OP-15 read a second file for the overlay; it is never a candidate to adopt, so the opened file stays the FR-060 save target.
        if (route === 'baseline') return await readChosenFile(environment.openFilePicker, place, noteHandleUsed)
        if (route === 'reopen') return await readOpenedFileAgain()
        return await readDroppedFile()
      } finally {
        isBusy = false
      }
    },

    /** @purity non-pure */
    adoptFileReadToOpen(): void {
      if (handleReadToOpen !== null) openedHandle = handleReadToOpen.handle
    },

    // see FR-095
    /** @purity non-pure */
    forgetOpenedFile(): void {
      openedHandle = null
      handleReadToOpen = null
    },

    /** @purity semi-pure-b */
    async readOpenedFileState(): Promise<OpenedFileState> {
      return await readOpenedState(openedHandle)
    },

    /** @purity non-pure */
    async restoreOpenedFilePermission(): Promise<OpenedFileState> {
      const handle = openedHandle
      if (handle === null) return { kind: 'none' }
      return openedStateOf(handle.name, await requestWritePermission(handle))
    },

    // WHY: permission is requested here because the save click is the gesture.
    /** @purity non-pure */
    async overwriteOpenedFile(bytes: Uint8Array): Promise<FileWriting> {
      // TRAP: check isBusy before the handle; a running write is about to decide the opened file.
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

    // see IF-3, FR-068, IO-10
    /** @purity non-pure */
    downloadFile: (fileName, bytes) => environment.startDownload?.(fileName, bytes, mediaTypeOfFileName(fileName)),

    /** @purity non-pure */
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
          handle = await picker(saveChooserOptionsOf(write, chooserPlaceOf(lastHandle)))
        } catch (thrown) {
          if (isDismissal(thrown)) {
            return { ok: false, fault: fault('canceled', whyOf(thrown)) }
          }
          return { ok: false, fault: fault('unavailable', whyOf(thrown)) }
        }

        // TRAP: keep IF-3's order (point, read the destination, ask, write on true), or DI-4 goes unkept.
        let mayWriteOver: boolean
        try {
          const destination = await readWriteDestination(handle)
          mayWriteOver = await write.askToWriteOver(destination)
        } catch (thrown) {
          // TRAP: a destination nobody could read is not written over; overwriting is unrecoverable (DI-2).
          return {
            ok: false,
            fault: fault('unavailable', `${handle.name}: ${whyOf(thrown)}`),
          }
        }
        if (!mayWriteOver) {
          return {
            ok: false,
            fault: fault('canceled', `${handle.name}: the overwrite was not agreed to`),
          }
        }

        return await saveToFile(handle, write.bytes, write.shouldBecomeOpenedFile)
      } finally {
        isBusy = false
      }
    },
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
//   docs/spec/01-04-requirements.md (table T-024)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_FILE_CHOOSER_ID: {
  readonly 'S-452': string
} = {
  'S-452': 'grs-files',
}

// see T-024, FR-096, RW-7
// TRAP: .svg, .html and .md carry x- types: a well-known type makes Chromium list every
// extension it maps to that type (text/html brings .htm and .shtml; DFC-1722, JDG-1165).
const MEDIA_TYPE_OF_EXTENSION: Readonly<Record<string, string>> = {
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/x-grs-html',
  '.svg': 'image/x-grs-svg',
  '.png': 'image/png',
  '.md': 'text/x-grs-markdown',
  '.tsv': 'text/tab-separated-values',
}
// </generated>
