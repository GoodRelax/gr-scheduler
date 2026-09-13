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

export type OpenFilePicker = (options: {
  readonly multiple: false
}) => Promise<readonly FileHandle[]>

export interface SaveFileType {
  readonly accept: Readonly<Record<string, readonly string[]>>
}

export type SaveFilePicker = (options: {
  readonly suggestedName: string
  readonly types?: readonly SaveFileType[]
  readonly excludeAcceptAllOption?: boolean
}) => Promise<FileHandle>

// WHY: every browser object arrives in here so the unit runs under Node; never reach for window.
export interface FileSystemAccessEnvironment {
  readonly openFilePicker: OpenFilePicker | undefined
  readonly saveFilePicker: SaveFilePicker | undefined
  readonly dropSurface: DropSurface
}

// see FR-096, T-024
const MEDIA_TYPE_OF_EXTENSION: Readonly<Record<string, string>> = {
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.html': 'text/html',
}

// see FR-096
// TRAP: excludeAcceptAllOption rides only with a known type; some hosts refuse it beside empty types.
/** @purity pure */
function saveFileTypesFor(extension: string): readonly SaveFileType[] | undefined {
  const mediaType = MEDIA_TYPE_OF_EXTENSION[extension]
  if (mediaType === undefined) return undefined
  return [{ accept: { [mediaType]: [extension] } }]
}

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

// STOP: spec does not decide what a host without queryPermission answers. Looked in IF-3, FR-060
// @provisional PND-105
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

// see PI-28, IF-3, FR-060
/** @purity non-pure */
export function fileSystemAccessFileStore(
  environment: FileSystemAccessEnvironment,
): FileStore {
  let openedHandle: FileHandle | null = null

  let droppedFile: {
    readonly file: ReadableFile | null
    readonly handle: Promise<DroppedHandle | null> | null
    readonly ignoredFileCount: number
  } | null = null

  // TRAP: two concurrent reads would both set openedHandle, and the loser could land last.
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
      // STOP: spec does not decide a type filter for the open chooser. Looked in OP-1, T-024, CN-5
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
      // TRAP: adopt the handle only after the bytes are read, so an unreadable choice keeps the old file.
      openedHandle = handle
      return { ok: true, file: { bytes, fileName: file.name } }
    } catch (thrown) {
      return { ok: false, fault: fault('unavailable', `${handle.name}: ${whyOf(thrown)}`) }
    }
  }

  // see OP-13
  /** @purity non-pure */
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

  /** @purity non-pure */
  async function readDroppedFile(): Promise<FileReading> {
    const drop = droppedFile
    droppedFile = null
    if (drop === null) {
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
      // TRAP: replace the handle even when the drop brought none, or one file's document saves over another.
      openedHandle = handle
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
      try {
        if (route === 'chooser') return await readChosenFile()
        if (route === 'reopen') return await readOpenedFileAgain()
        return await readDroppedFile()
      } finally {
        isBusy = false
      }
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
      // TRAP: check isBusy before the handle; a running read is about to decide the opened file.
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
