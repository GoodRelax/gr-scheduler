// Unit test: UF-51 `file-system-access-file-store.ts` -- the one FileStore implementation (FR-060, FR-087, IF-3).

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import type {
  ChosenFileWrite,
  FileStore,
  FileStoreFaultReason,
  OpenRoute,
} from '../../src/adapter/file-gateway/file-gateway'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  fileSystemAccessFileStore,
  type DropData,
  type DropEvent,
  type DroppedHandle,
  type DroppedItem,
  type DropSurface,
  type FileHandle,
  type FilePermissionState,
  type FileSystemAccessEnvironment,
  type OpenFilePicker,
  type ReadableFile,
  type SaveFilePicker,
  type WritableFileStream,
} from '../../src/framework/file-system-access-file-store/file-system-access-file-store'

const encoder = new TextEncoder()

const GRS_JSON_BYTES = encoder.encode('{"schemaVersion":"2026-08-19"}')
const MSPDI_BYTES = encoder.encode('<Project><Name>a</Name></Project>')

const BYTE_ORDER_MARK = Uint8Array.from([0xef, 0xbb, 0xbf])

// WHY: CN-5 sends the character set for both rows, and the table's note
// forbids adding a BOM (MUST NOT); this unit obeys both by never touching the bytes.
const T_024_FORMS = [
  { row: 'IO-1', fileName: 'plan.xml', bytes: MSPDI_BYTES },
  { row: 'IO-2', fileName: 'plan.json', bytes: GRS_JSON_BYTES },
] as const

// WHY: nothing in this file turns on the order FR-096 (MUST) gives these
// five; the surface that does is driven in tests/unit/uf-47-48-choosers.test.ts.
const T_024_EXTENSIONS = ['.json', '.xml', '.html', '.svg', '.png'] as const

// WHY: a media type is known for some extensions, not others, giving two
// different options objects; checked against the roster so it stays a fake one.
const AN_EXTENSION_NO_ROW_CARRIES = '.zzz'

const acceptMapsOf = (options: Record<string, unknown>): readonly Record<string, unknown>[] =>
  (Array.isArray(options['types']) ? (options['types'] as unknown[]) : [])
    .filter((one): one is Record<string, unknown> => typeof one === 'object' && one !== null)
    .map((one) => (one['accept'] ?? {}) as Record<string, unknown>)

/** @purity pure */
const extensionsNamedTo = (options: Record<string, unknown>): readonly string[] =>
  acceptMapsOf(options).flatMap((accept) =>
    Object.values(accept).flatMap((value) => (Array.isArray(value) ? (value as string[]) : [])),
  )

/** @purity pure */
const mediaTypesNamedTo = (options: Record<string, unknown>): readonly string[] =>
  acceptMapsOf(options).flatMap((accept) => Object.keys(accept))

// WHY: the whole of docs/spec is read rather than one table, because
// FR-096's MUST NOT is about the book and not about a table.
/** @purity non-pure */
const specificationHolds = (value: string): boolean =>
  readdirSync(join(process.cwd(), 'docs', 'spec'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .some((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8').includes(value))

// WHY: both routes are one member taking a value, so the walk below is
// the whole of OP-2's rule (one entry, two routes).
const T_024A_OP2_ROUTES: readonly OpenRoute[] = ['chooser', 'drop']

// WHY: IF-3 publishes three states; the middle one is when a file is
// remembered but may not be written -- the startup offer FR-060 exists for.
const IF_3_PERMISSION = [
  { permission: 'granted', state: 'writable' },
  { permission: 'denied', state: 'permissionLost' },
  { permission: 'prompt', state: 'permissionLost' },
] as const satisfies readonly {
  permission: FilePermissionState
  state: 'writable' | 'permissionLost'
}[]

// WHY: NT-3a is why these four are not flattened into one -- a failure
// notice must carry a next step, and only the reason can decide which step.
const IF_3_REASONS: readonly FileStoreFaultReason[] = [
  'cancelled',
  'permissionLost',
  'noOpenedFile',
  'unavailable',
]

// WHY: the ceiling is not this unit's -- FR-023 rules on the size the
// gateway reports; the case using this asserts the store does NOT refuse.
const ABOVE_ANY_CEILING = Number.MAX_SAFE_INTEGER

let log: string[] = []
let openCalls: unknown[] = []
let saveCalls: unknown[] = []

beforeEach(() => {
  log = []
  openCalls = []
  saveCalls = []
})

type Failure = { readonly rejectsWith: unknown } | { readonly throwsWith: unknown }

function isFailure(value: unknown): value is Failure {
  if (typeof value !== 'object' || value === null) return false
  return 'rejectsWith' in value || 'throwsWith' in value
}

function failing<T>(failure: Failure, what: string): Promise<T> {
  if ('throwsWith' in failure) {
    log.push(`${what} threw`)
    throw failure.throwsWith
  }
  log.push(`${what} rejected`)
  return Promise.reject(failure.rejectsWith)
}

function dismissal(): DOMException {
  return new DOMException('The user aborted a request.', 'AbortError')
}

function denial(): DOMException {
  return new DOMException('The request is not allowed by the user agent.', 'NotAllowedError')
}

function quotaExceeded(): DOMException {
  return new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

interface FileSpec {
  readonly name: string
  readonly bytes?: Uint8Array
  // WHY: kept apart from bytes so a file above S-113's ceiling costs nothing.
  readonly size?: number
  readonly arrayBufferFails?: Failure
}

function readableFile(spec: FileSpec): ReadableFile {
  const bytes = spec.bytes ?? GRS_JSON_BYTES
  return {
    name: spec.name,
    size: spec.size ?? bytes.byteLength,
    arrayBuffer(): Promise<ArrayBuffer> {
      log.push(`${spec.name}.arrayBuffer`)
      if (spec.arrayBufferFails !== undefined) {
        return failing(spec.arrayBufferFails, `${spec.name}.arrayBuffer`)
      }
      const copy = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(copy).set(bytes)
      return Promise.resolve(copy)
    },
  }
}

interface HandleSpec {
  readonly name: string
  readonly bytes?: Uint8Array
  readonly size?: number
  readonly queried?: FilePermissionState
  readonly requested?: FilePermissionState
  // WHY: PND-105 -- a browser that has handles but neither permission member.
  readonly withoutPermissionApi?: boolean
  readonly getFileFails?: Failure
  readonly queryFails?: Failure
  readonly requestFails?: Failure
  readonly createWritableFails?: Failure
  readonly writeFails?: Failure
  readonly closeFails?: Failure
}

interface HandleFake {
  readonly handle: FileHandle
  readonly written: Uint8Array[]
}

function fileHandle(spec: HandleSpec): HandleFake {
  const written: Uint8Array[] = []

  const stream: WritableFileStream = {
    write(data: BufferSource): Promise<void> {
      log.push(`${spec.name}.write`)
      if (spec.writeFails !== undefined) return failing(spec.writeFails, `${spec.name}.write`)
      written.push(
        ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
          : new Uint8Array(data.slice(0)),
      )
      return Promise.resolve()
    },
    close(): Promise<void> {
      log.push(`${spec.name}.close`)
      if (spec.closeFails !== undefined) return failing(spec.closeFails, `${spec.name}.close`)
      return Promise.resolve()
    },
    abort(): Promise<void> {
      log.push(`${spec.name}.abort`)
      return Promise.resolve()
    },
  }

  const base = {
    kind: 'file' as const,
    name: spec.name,
    getFile(): Promise<ReadableFile> {
      log.push(`${spec.name}.getFile`)
      if (spec.getFileFails !== undefined) return failing(spec.getFileFails, `${spec.name}.getFile`)
      const file: FileSpec =
        spec.size === undefined
          ? { name: spec.name, bytes: spec.bytes ?? GRS_JSON_BYTES }
          : { name: spec.name, bytes: spec.bytes ?? GRS_JSON_BYTES, size: spec.size }
      return Promise.resolve(readableFile(file))
    },
    createWritable(options?: { keepExistingData?: boolean }): Promise<WritableFileStream> {
      log.push(`${spec.name}.createWritable(${JSON.stringify(options ?? null)})`)
      if (spec.createWritableFails !== undefined) {
        return failing(spec.createWritableFails, `${spec.name}.createWritable`)
      }
      return Promise.resolve(stream)
    },
  }

  if (spec.withoutPermissionApi === true) return { handle: base, written }

  const handle: FileHandle = {
    ...base,
    queryPermission(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState> {
      log.push(`${spec.name}.queryPermission(${descriptor.mode})`)
      if (spec.queryFails !== undefined) return failing(spec.queryFails, `${spec.name}.queryPermission`)
      return Promise.resolve(spec.queried ?? 'granted')
    },
    requestPermission(descriptor: { mode: 'readwrite' }): Promise<FilePermissionState> {
      log.push(`${spec.name}.requestPermission(${descriptor.mode})`)
      if (spec.requestFails !== undefined) {
        return failing(spec.requestFails, `${spec.name}.requestPermission`)
      }
      return Promise.resolve(spec.requested ?? 'granted')
    },
  }
  return { handle, written }
}

interface ItemSpec {
  readonly kind?: string
  readonly file: ReadableFile | null
  readonly handle?: DroppedHandle | null
  // WHY: a browser with no handles at all -- the drop cannot be remembered.
  readonly withoutHandleApi?: boolean
  readonly handleFails?: Failure
}

function droppedItem(spec: ItemSpec): DroppedItem {
  const label = spec.file === null ? 'nothing' : spec.file.name
  const base = {
    kind: spec.kind ?? 'file',
    getAsFile(): ReadableFile | null {
      log.push(`item(${label}).getAsFile`)
      return spec.file
    },
  }
  if (spec.withoutHandleApi === true) return base
  return {
    ...base,
    getAsFileSystemHandle(): Promise<DroppedHandle | null> {
      log.push(`item(${label}).getAsFileSystemHandle`)
      if (spec.handleFails !== undefined) {
        return failing(spec.handleFails, `item(${label}).getAsFileSystemHandle`)
      }
      return Promise.resolve(spec.handle ?? null)
    },
  }
}

function dropData(items: readonly DroppedItem[], types: readonly string[] = ['Files']): DropData {
  return { types, items }
}

type OpenAnswer = { readonly handles: readonly FileHandle[] } | Failure | 'noApi'
type SaveAnswer = { readonly handle: FileHandle } | Failure | 'noApi'

interface BrowserFake {
  readonly environment: FileSystemAccessEnvironment
  readonly registered: readonly { readonly type: string; readonly capture: boolean }[]
  dragOver(data: DropData | null): boolean
  drop(data: DropData | null): boolean
}

type DropListener = (event: DropEvent) => void

function browser(spec: { readonly opens: OpenAnswer; readonly saves: SaveAnswer }): BrowserFake {
  const listeners = new Map<string, DropListener>()
  const registered: { readonly type: string; readonly capture: boolean }[] = []

  const dropSurface: DropSurface = {
    addEventListener(
      type: 'dragover' | 'drop',
      listener: DropListener,
      options: { capture: boolean },
    ): void {
      log.push(`addEventListener(${type})`)
      registered.push({ type, capture: options.capture })
      listeners.set(type, listener)
    },
  }

  const opens = spec.opens
  const openFilePicker: OpenFilePicker | undefined =
    opens === 'noApi'
      ? undefined
      : (options): Promise<readonly FileHandle[]> => {
          log.push('openFilePicker')
          openCalls.push(options)
          if (isFailure(opens)) return failing(opens, 'openFilePicker')
          return Promise.resolve(opens.handles)
        }

  const saves = spec.saves
  const saveFilePicker: SaveFilePicker | undefined =
    saves === 'noApi'
      ? undefined
      : (options): Promise<FileHandle> => {
          log.push('saveFilePicker')
          saveCalls.push(options)
          if (isFailure(saves)) return failing(saves, 'saveFilePicker')
          return Promise.resolve(saves.handle)
        }

  function fire(type: 'dragover' | 'drop', data: DropData | null): boolean {
    const listener = listeners.get(type)
    if (listener === undefined) throw new Error(`the store registered no ${type} listener`)
    let prevented = false
    const event: DropEvent = {
      preventDefault(): void {
        prevented = true
        log.push(`${type}.preventDefault`)
      },
      dataTransfer: data,
    }
    log.push(`fire ${type}`)
    listener(event)
    return prevented
  }

  return {
    environment: { openFilePicker, saveFilePicker, dropSurface },
    registered,
    dragOver: (data) => fire('dragover', data),
    drop: (data) => fire('drop', data),
  }
}

// WHY: a drop is taken DURING the event, but what it took
// (getAsFileSystemHandle, arrayBuffer) only settles afterwards.
function settled(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

async function opened(spec: HandleSpec): Promise<{ store: FileStore; fake: HandleFake }> {
  const fake = fileHandle(spec)
  const store = fileSystemAccessFileStore(
    browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
  )
  const reading = await store.readFileToOpen('chooser')
  expect(reading.ok, 'the ordinary open must succeed before a case builds on it').toBe(true)
  return { store, fake }
}

describe('LY-5 -- the browser arrives in a parameter', () => {
  it('runs in a process that has no window at all', async () => {
    expect(
      (globalThis as Record<string, unknown>)['window'],
      'these cases prove nothing if a DOM is lying around',
    ).toBeUndefined()

    const fake = fileHandle({ name: 'plan.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
    )
    await expect(store.readFileToOpen('chooser')).resolves.toEqual({
      ok: true,
      file: { bytes: GRS_JSON_BYTES, fileName: 'plan.json' },
    })
  })

  it('holds its own current value -- two stores do not share the opened file', async () => {
    const one = await opened({ name: 'one.json' })
    const other = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    await expect(one.store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'one.json',
    })
    await expect(other.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })
})

describe('construction -- the drop surface (OP-2, OP-4)', () => {
  it('registers for dragover and for drop, before anything is asked of it', () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    fileSystemAccessFileStore(fake.environment)
    expect(fake.registered.map((one) => one.type).sort()).toEqual(['dragover', 'drop'])
  })

  it('refuses the browser default for a drag carrying files (OP-4)', () => {
    // TRAP: without this the drop event never arrives and the browser leaves
    // the page to open the file, discarding the document without OP-4's confirmation.
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    fileSystemAccessFileStore(fake.environment)
    expect(fake.dragOver(dropData([droppedItem({ file: readableFile({ name: 'plan.json' }) })]))).toBe(
      true,
    )
  })

  it('leaves a drag that carries no file to the browser', () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    fileSystemAccessFileStore(fake.environment)
    expect(fake.dragOver(dropData([], ['text/plain']))).toBe(false)
  })

  it('refuses the default on the drop itself, so the page is not replaced (OP-4)', () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    fileSystemAccessFileStore(fake.environment)
    const dropped = fileHandle({ name: 'plan.json' })
    expect(
      fake.drop(
        dropData([
          droppedItem({ file: readableFile({ name: 'plan.json' }), handle: dropped.handle }),
        ]),
      ),
    ).toBe(true)
  })

  it('survives a drop that carries no dataTransfer at all (FR-028)', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    expect(() => fake.drop(null)).not.toThrow()
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toEqual({
      ok: false,
      fault: { reason: 'cancelled', what: expect.any(String) as unknown as string },
    })
  })
})

describe("readFileToOpen('chooser') -- the ordinary path", () => {
  it('asks for one file and applies no filter (OP-3; PND-104)', async () => {
    const fake = fileHandle({ name: 'plan.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
    )
    await store.readFileToOpen('chooser')
    expect(openCalls).toHaveLength(1)
    expect(Object.keys(openCalls[0] as object)).toEqual(['multiple'])
    expect(openCalls[0]).toEqual({ multiple: false })
  })

  it('hands back the bytes and the name, and nothing else', async () => {
    const fake = fileHandle({ name: 'plan.json', bytes: GRS_JSON_BYTES })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
    )
    const reading = await store.readFileToOpen('chooser')
    expect(reading).toEqual({
      ok: true,
      file: { bytes: GRS_JSON_BYTES, fileName: 'plan.json' },
    })
  })

  it('remembers the file, so FR-060 has somewhere to overwrite', async () => {
    const { store } = await opened({ name: 'plan.json' })
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })

  it('opens the chooser once per call, not once per store', async () => {
    const fake = fileHandle({ name: 'plan.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
    )
    await store.readFileToOpen('chooser')
    await store.readFileToOpen('chooser')
    expect(openCalls).toHaveLength(2)
  })

  it('keeps the remembered file when a later open fails (FR-060)', async () => {
    // TRAP: losing the overwrite target because a second open went wrong
    // would break the round trip FR-060 exists to close for an unrelated reason.
    const first = fileHandle({ name: 'plan.json' })
    let answers: readonly FileHandle[] | 'fail' = [first.handle]
    const picker: OpenFilePicker = (options) => {
      openCalls.push(options)
      if (answers === 'fail') return Promise.reject(new Error('the browser gave up'))
      return Promise.resolve(answers)
    }
    const store = fileSystemAccessFileStore({
      openFilePicker: picker,
      saveFilePicker: undefined,
      dropSurface: browser({ opens: 'noApi', saves: 'noApi' }).environment.dropSurface,
    })
    await store.readFileToOpen('chooser')
    answers = 'fail'
    await expect(store.readFileToOpen('chooser')).resolves.toMatchObject({ ok: false })
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })

  it('does not gate on size -- S-113 is the ceiling FR-023 owns, not this unit', async () => {
    expect(ABOVE_ANY_CEILING).toBeGreaterThan(Number(SETTINGS_DEFAULTS['importMaxBytes']))
    const fake = fileHandle({ name: 'huge.json', size: ABOVE_ANY_CEILING })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
    )
    const reading = await store.readFileToOpen('chooser')
    expect(reading.ok, 'refusing here would need a reason IF-3 does not have').toBe(true)
  })
})

describe('表 T-024 -- the bytes cross unchanged, in both directions', () => {
  for (const form of T_024_FORMS) {
    it(`${form.row}: reads ${form.fileName} byte for byte, adding no BOM`, async () => {
      const fake = fileHandle({ name: form.fileName, bytes: form.bytes })
      const store = fileSystemAccessFileStore(
        browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
      )
      const reading = await store.readFileToOpen('chooser')
      expect(reading.ok).toBe(true)
      if (!reading.ok) return
      expect(reading.file.bytes).toEqual(form.bytes)
      expect(reading.file.bytes[0], 'CN-5: UTF-8, BOM なし').not.toBe(BYTE_ORDER_MARK[0])
    })

    it(`${form.row}: neither adds nor strips a BOM the file already carried`, async () => {
      const carried = Uint8Array.from([...BYTE_ORDER_MARK, ...form.bytes])
      const fake = fileHandle({ name: form.fileName, bytes: carried })
      const store = fileSystemAccessFileStore(
        browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
      )
      const reading = await store.readFileToOpen('chooser')
      expect(reading.ok).toBe(true)
      if (!reading.ok) return
      expect(reading.file.bytes).toEqual(carried)
    })

    it(`${form.row}: writes ${form.fileName} back with nothing in front of it`, async () => {
      const { store, fake } = await opened({ name: form.fileName })
      const writing = await store.overwriteOpenedFile(form.bytes)
      expect(writing.ok).toBe(true)
      expect(fake.written, 'one chunk, and it is the bytes themselves').toHaveLength(1)
      expect(fake.written[0]).toEqual(form.bytes)
    })
  }
})

describe('readOpenedFileState -- what may be overwritten right now', () => {
  it('says none before anything has been opened', async () => {
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  for (const row of IF_3_PERMISSION) {
    it(`answers ${row.state} where the browser says ${row.permission}`, async () => {
      const { store } = await opened({ name: 'plan.json', queried: row.permission })
      await expect(store.readOpenedFileState()).resolves.toEqual({
        kind: row.state,
        fileName: 'plan.json',
      })
    })
  }

  it('asks the browser every time -- FR-060 has permission going missing', async () => {
    const { store } = await opened({ name: 'plan.json' })
    log.length = 0
    await store.readOpenedFileState()
    await store.readOpenedFileState()
    expect(log.filter((one) => one.includes('queryPermission'))).toHaveLength(2)
  })

  it('asks for readwrite, because that is what FR-060 needs the answer about', async () => {
    const { store } = await opened({ name: 'plan.json' })
    log.length = 0
    await store.readOpenedFileState()
    expect(log).toContain('plan.json.queryPermission(readwrite)')
  })

  it('answers writable where the browser has handles but no queryPermission (PND-105)', async () => {
    // WHY: PND-105 is undecided; the pessimistic answer would put FR-060's
    // restore offer on NT-4's startup panel every time nothing was wrong.
    const { store } = await opened({ name: 'plan.json', withoutPermissionApi: true })
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })

  it('is a value even when the permission query itself fails (FR-028)', async () => {
    const { store } = await opened({ name: 'plan.json', queryFails: { rejectsWith: denial() } })
    const state = await store.readOpenedFileState()
    expect(state.kind, 'a file is remembered, so it is not none').toBe('permissionLost')
  })
})

describe('restoreOpenedFilePermission -- FR-060 offers the way back', () => {
  it('answers none, and asks the browser nothing, when no file is remembered', async () => {
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    log.length = 0
    await expect(store.restoreOpenedFilePermission()).resolves.toEqual({ kind: 'none' })
    expect(log.filter((one) => one.includes('Permission'))).toEqual([])
  })

  it('asks for readwrite and reports that it was granted', async () => {
    const { store } = await opened({ name: 'plan.json', queried: 'prompt', requested: 'granted' })
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'permissionLost',
      fileName: 'plan.json',
    })
    log.length = 0
    await expect(store.restoreOpenedFilePermission()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
    expect(log).toContain('plan.json.requestPermission(readwrite)')
  })

  it('reports the refusal, still naming the file (NT-1)', async () => {
    const { store } = await opened({ name: 'plan.json', queried: 'prompt', requested: 'denied' })
    await expect(store.restoreOpenedFilePermission()).resolves.toEqual({
      kind: 'permissionLost',
      fileName: 'plan.json',
    })
  })

  it('is a value even when the request rejects (FR-028)', async () => {
    const { store } = await opened({
      name: 'plan.json',
      queried: 'prompt',
      requestFails: { rejectsWith: denial() },
    })
    await expect(store.restoreOpenedFilePermission()).resolves.toEqual({
      kind: 'permissionLost',
      fileName: 'plan.json',
    })
  })

  it('is a value even when the request throws synchronously (FR-028)', async () => {
    const { store } = await opened({
      name: 'plan.json',
      queried: 'prompt',
      requestFails: { throwsWith: denial() },
    })
    const state = await store.restoreOpenedFilePermission()
    expect(state.kind).toBe('permissionLost')
  })

  it('answers writable where the browser has no requestPermission either (PND-105)', async () => {
    // WHY: PND-105 again -- with no way to ask, the store can only find out
    // by trying to write, and a refused write still comes back as permissionLost.
    const { store } = await opened({ name: 'plan.json', withoutPermissionApi: true })
    await expect(store.restoreOpenedFilePermission()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })
})

describe('overwriteOpenedFile -- the round trip closes on one file (FR-060)', () => {
  it('refuses with noOpenedFile when nothing has been opened', async () => {
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('noOpenedFile')
    expect(writing.fault.what.length, 'NT-3a: a bare failure is forbidden').toBeGreaterThan(0)
  })

  it('opens no chooser of its own -- overwriting asks nobody anything', async () => {
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    await store.overwriteOpenedFile(GRS_JSON_BYTES)
    expect(openCalls).toEqual([])
    expect(saveCalls).toEqual([])
  })

  it('writes then closes, in that order, and keeps the file open', async () => {
    const { store, fake } = await opened({ name: 'plan.json' })
    log.length = 0
    const writing = await store.overwriteOpenedFile(MSPDI_BYTES)
    expect(writing).toEqual({ ok: true, openedFile: { kind: 'writable', fileName: 'plan.json' } })
    expect(fake.written[0]).toEqual(MSPDI_BYTES)
    const order = log.filter((one) => /createWritable|\.write|\.close/.test(one))
    expect(order).toEqual([
      'plan.json.createWritable({"keepExistingData":false})',
      'plan.json.write',
      'plan.json.close',
    ])
  })

  it('writes an empty document as an empty file, not as nothing', async () => {
    const { store, fake } = await opened({ name: 'plan.json' })
    const writing = await store.overwriteOpenedFile(new Uint8Array(0))
    expect(writing.ok).toBe(true)
    expect(fake.written).toHaveLength(1)
    expect(fake.written[0]?.byteLength).toBe(0)
  })

  it('reports permissionLost, naming the file, when the gesture is refused (NT-1)', async () => {
    const { store } = await opened({
      name: 'plan.json',
      createWritableFails: { rejectsWith: denial() },
    })
    const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('permissionLost')
    expect(writing.fault.what, 'NT-1: the notice must say WHICH item').toContain('plan.json')
  })

  it('reports unavailable when the disk refuses the bytes, and lets the stream go', async () => {
    const { store } = await opened({
      name: 'plan.json',
      writeFails: { rejectsWith: quotaExceeded() },
    })
    log.length = 0
    const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('unavailable')
    expect(writing.fault.what).toContain('plan.json')
    expect(log, 'a stream left open outlives the failure that broke it').toContain('plan.json.abort')
  })

  it('reports unavailable when the close fails', async () => {
    const { store } = await opened({
      name: 'plan.json',
      closeFails: { rejectsWith: quotaExceeded() },
    })
    const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('unavailable')
  })

  it('is a value even when the browser throws synchronously (FR-028)', async () => {
    const { store } = await opened({
      name: 'plan.json',
      createWritableFails: { throwsWith: new Error('the browser threw') },
    })
    const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
    expect(writing.ok).toBe(false)
  })

  it('still remembers the file after a write that failed', async () => {
    const { store } = await opened({
      name: 'plan.json',
      writeFails: { rejectsWith: quotaExceeded() },
    })
    await store.overwriteOpenedFile(GRS_JSON_BYTES)
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })
})

describe('writeChosenFile -- a file the person points at', () => {
  // WHY: the answer to askToWriteOver is the near side's -- the store does
  // not judge -- so the stand-in here simply says yes.
  const request = (
    over: Partial<{ suggestedFileName: string; extension: string; shouldBecomeOpenedFile: boolean }>,
  ): ChosenFileWrite => ({
    bytes: GRS_JSON_BYTES,
    suggestedFileName: over.suggestedFileName ?? 'plan.json',
    // WHY: the default is deliberately one no row carries, so cases not
    // about the chooser get no types entry they never look at.
    extension: over.extension ?? AN_EXTENSION_NO_ROW_CARRIES,
    shouldBecomeOpenedFile: over.shouldBecomeOpenedFile ?? true,
    askToWriteOver: () => Promise.resolve(true),
  })

  it('hands the chooser the suggested name alone, where no media type is known for the extension', async () => {
    // WHY: an extension with no known media type has nothing else to tell
    // the host, so the name alone is what FR-096 leaves to hand over here.
    expect(
      T_024_EXTENSIONS as readonly string[],
      'the extension this case leans on being unknown is now a row of table T-024',
    ).not.toContain(AN_EXTENSION_NO_ROW_CARRIES)

    const chosen = fileHandle({ name: 'plan.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    await store.writeChosenFile(
      request({
        suggestedFileName: `schedule${AN_EXTENSION_NO_ROW_CARRIES}`,
        extension: AN_EXTENSION_NO_ROW_CARRIES,
      }),
    )
    expect(saveCalls).toHaveLength(1)
    expect(Object.keys(saveCalls[0] as object)).toEqual(['suggestedName'])
    expect(saveCalls[0]).toEqual({ suggestedName: `schedule${AN_EXTENSION_NO_ROW_CARRIES}` })
  })

  it('FR-096 (MUST): the chooser is told the extension as a type, for every row of table T-024', async () => {
    // WHY: this is the fix for DFC-172 -- suggestedName alone was already
    // right, so only a case reading the accept lists too can tell the fix apart.
    // TRAP: reading the extension off suggestedName's tail instead of the
    // accept lists would leave this green even without the fix, since the two agree here.
    for (const extension of T_024_EXTENSIONS) {
      saveCalls.length = 0
      const chosen = fileHandle({ name: `plan${extension}` })
      const store = fileSystemAccessFileStore(
        browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
      )
      await store.writeChosenFile(request({ suggestedFileName: `plan${extension}`, extension }))

      expect(saveCalls, extension).toHaveLength(1)
      const options = saveCalls[0] as Record<string, unknown>
      expect(options['suggestedName'], extension).toBe(`plan${extension}`)
      expect(
        Object.keys(options),
        `FR-096 (MUST): the chooser was told ${extension} only as part of a name, which is the ` +
          'build DFC-172 was raised against',
      ).toContain('types')
      expect(
        extensionsNamedTo(options),
        `FR-096 (MUST): the host was not told that ${extension} is what this file is`,
      ).toContain(extension)
      // WHY: one type, not a list -- the person chose one row of table
      // T-024, so offering the host several offers a form nobody chose.
      expect(extensionsNamedTo(options), extension).toEqual([extension])
      for (const mediaType of mediaTypesNamedTo(options)) {
        expect(mediaType, extension).toMatch(/^[a-z]+\/[-+.a-z0-9]+$/)
        expect(
          specificationHolds(mediaType),
          `FR-096 (MUST NOT): ${mediaType} is written into docs/spec, and 「その伝え方が要する` +
            '媒体型を、本書のどの表にも持たせてはならない（MUST NOT）」',
        ).toBe(false)
      }
    }
  })

  it('writes then closes, and reports the file the person actually chose', async () => {
    // WHY: suggestedFileName is a suggestion the person may overrule, so
    // the name reported back is the handle's, not the one that was suggested.
    const chosen = fileHandle({ name: 'their-name.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    log.length = 0
    const writing = await store.writeChosenFile(request({ suggestedFileName: 'our-name.json' }))
    expect(writing).toEqual({
      ok: true,
      openedFile: { kind: 'writable', fileName: 'their-name.json' },
    })
    expect(chosen.written[0]).toEqual(GRS_JSON_BYTES)
    const order = log.filter((one) => /\.write|\.close/.test(one))
    expect(order).toEqual(['their-name.json.write', 'their-name.json.close'])
  })

  it('makes the written file the one FR-060 overwrites when told to', async () => {
    const chosen = fileHandle({ name: 'saved.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    await store.writeChosenFile(request({ shouldBecomeOpenedFile: true }))
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'saved.json',
    })
  })

  it('leaves the opened file alone when told not to take it', async () => {
    const alreadyOpen = fileHandle({ name: 'plan.json' })
    const picture = fileHandle({ name: 'picture.svg' })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [alreadyOpen.handle] }, saves: { handle: picture.handle } })
        .environment,
    )
    await store.readFileToOpen('chooser')
    const writing = await store.writeChosenFile(
      request({ suggestedFileName: 'picture.svg', shouldBecomeOpenedFile: false }),
    )
    expect(writing.ok).toBe(true)
    if (!writing.ok) return
    expect(writing.openedFile).toEqual({ kind: 'writable', fileName: 'plan.json' })
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })

  it('stays at none when told not to take it and nothing was open', async () => {
    const picture = fileHandle({ name: 'picture.svg' })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: picture.handle } }).environment,
    )
    const writing = await store.writeChosenFile(request({ shouldBecomeOpenedFile: false }))
    expect(writing).toEqual({ ok: true, openedFile: { kind: 'none' } })
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  it('calls a dismissed chooser cancelled, not a failure', async () => {
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { rejectsWith: dismissal() } }).environment,
    )
    const writing = await store.writeChosenFile(request({}))
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason, 'the person who stopped has not been failed').toBe('cancelled')
  })

  it('writes nothing when the chooser was dismissed', async () => {
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { rejectsWith: dismissal() } }).environment,
    )
    await store.writeChosenFile(request({}))
    expect(log.filter((one) => one.includes('.write'))).toEqual([])
  })

  it('reports unavailable when the disk refuses the bytes, and lets the stream go', async () => {
    const chosen = fileHandle({ name: 'saved.json', writeFails: { rejectsWith: quotaExceeded() } })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    log.length = 0
    const writing = await store.writeChosenFile(request({}))
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('unavailable')
    expect(log).toContain('saved.json.abort')
  })

  it('is a value even when the chooser throws synchronously (FR-028)', async () => {
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { throwsWith: new Error('the browser threw') } }).environment,
    )
    const writing = await store.writeChosenFile(request({}))
    expect(writing.ok).toBe(false)
  })

  it('calls a refused gesture unavailable while no file is remembered', async () => {
    // WHY: permissionLost means a file is remembered but may not be
    // written; with nothing remembered that cannot be true, leaving unavailable.
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { rejectsWith: denial() } }).environment,
    )
    const writing = await store.writeChosenFile(request({}))
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('unavailable')
    expect(writing.fault.what.length).toBeGreaterThan(0)
  })

  // WHY: the cases above hand the store a stand-in that always says yes, so
  // none of them can tell a store that ASKS from one that never asks at all.
  const asking = (
    answer: boolean,
  ): { readonly write: ChosenFileWrite; readonly asked: unknown[] } => {
    const asked: unknown[] = []
    return {
      asked,
      write: {
        bytes: GRS_JSON_BYTES,
        suggestedFileName: 'plan.json',
        extension: '.json',
        shouldBecomeOpenedFile: true,
        askToWriteOver: (destination) => {
          asked.push(destination)
          log.push('asked')
          return Promise.resolve(answer)
        },
      },
    }
  }

  it('reads the destination once and asks before a byte is written (DI-4)', async () => {
    // WHY: the destination is given bytes that are not the ones being
    // written, so the two cannot be confused for one another in the record below.
    const chosen = fileHandle({ name: 'their-name.json', bytes: MSPDI_BYTES })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    log.length = 0
    const question = asking(true)

    const writing = await store.writeChosenFile(question.write)

    expect(writing.ok, `the write failed (${log.join(', ')})`).toBe(true)
    const askedAt = log.indexOf('asked')
    expect(askedAt, `DI-4: the question was never put (${log.join(', ')})`).toBeGreaterThan(-1)
    // TRAP: a stream opened on the handle truncates the file in a real
    // browser, so the ask must precede createWritable, not merely write.
    const touched = log.findIndex((one) => /\.createWritable|\.write|\.close/.test(one))
    expect(touched, `DI-4: the destination was touched first (${log.join(', ')})`)
      .toBeGreaterThan(askedAt)
    expect(log.filter((one) => one === 'their-name.json.getFile')).toHaveLength(1)
    expect(log.indexOf('their-name.json.getFile')).toBeLessThan(askedAt)
  })

  it('hands the question what is standing at the destination (DI-1 / DI-3)', async () => {
    // WHY: the name is the handle's -- the person may have overruled the
    // suggestion -- and the bytes are the ones actually on the disk.
    const chosen = fileHandle({ name: 'their-name.json', bytes: MSPDI_BYTES })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    const question = asking(true)

    await store.writeChosenFile(question.write)

    expect(question.asked).toEqual([
      { kind: 'occupied', fileName: 'their-name.json', bytes: MSPDI_BYTES },
    ])
  })

  it('writes nothing and calls a refusal cancelled (DI-4 / NT-7)', async () => {
    // WHY: NT-7 makes calling off a CHOICE; a store that wrote anyway would
    // leave the person a question that decided nothing, so this is not a failure.
    const chosen = fileHandle({ name: 'their-name.json', bytes: MSPDI_BYTES })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    log.length = 0
    const question = asking(false)

    const writing = await store.writeChosenFile(question.write)

    expect(question.asked, `DI-4: the question was never put (${log.join(', ')})`).toHaveLength(1)
    expect(log.filter((one) => /\.createWritable|\.write|\.close/.test(one))).toEqual([])
    expect(chosen.written).toEqual([])
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('cancelled')
  })

  it('leaves the opened file untouched when the write was called off', async () => {
    // WHY: shouldBecomeOpenedFile is about a write that HAPPENED; a refusal
    // that still moved FR-060's target would misdirect the next overwrite.
    const alreadyOpen = fileHandle({ name: 'plan.json' })
    const chosen = fileHandle({ name: 'their-name.json', bytes: MSPDI_BYTES })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [alreadyOpen.handle] }, saves: { handle: chosen.handle } })
        .environment,
    )
    await store.readFileToOpen('chooser')

    await store.writeChosenFile(asking(false).write)

    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })
})

describe('where the API is absent -- CN-2 / LM-14', () => {
  it('answers unavailable rather than inventing a way to open a file', async () => {
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    const reading = await store.readFileToOpen('chooser')
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.fault.reason).toBe('unavailable')
    expect(reading.fault.what.length, 'NT-3a: something to act on').toBeGreaterThan(0)
  })

  it('answers unavailable rather than falling back to a download (FR-060 RATIONALE)', async () => {
    // WHY: downloads cannot control where a file lands and breed numbered
    // copies of one name, which is the problem FR-060 exists to solve.
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    log.length = 0
    const writing = await store.writeChosenFile({
      bytes: GRS_JSON_BYTES,
      suggestedFileName: 'plan.json',
      extension: '.json',
      shouldBecomeOpenedFile: true,
      askToWriteOver: () => Promise.resolve(true),
    })
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('unavailable')
    expect(log, 'nothing at all was reached for instead').toEqual([])
  })

  it('leaves the opened file at none, because nothing could be opened', async () => {
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    await store.readFileToOpen('chooser')
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  it('still takes a drop, because a drop needs neither picker', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const dropped = fileHandle({ name: 'plan.json' })
    fake.drop(
      dropData([droppedItem({ file: readableFile({ name: 'plan.json' }), handle: dropped.handle })]),
    )
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toEqual({
      ok: true,
      file: { bytes: GRS_JSON_BYTES, fileName: 'plan.json' },
    })
  })
})

describe("readFileToOpen('drop') -- the drop route (OP-2)", () => {
  it('takes the file DURING the event, because that is when it exists', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const dropped = fileHandle({ name: 'plan.json' })
    fake.drop(
      dropData([droppedItem({ file: readableFile({ name: 'plan.json' }), handle: dropped.handle })]),
    )
    expect(
      log.filter((one) => one.includes('getAsFile')),
      'nothing may be left for readFileToOpen to go and look for',
    ).not.toEqual([])
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toMatchObject({ ok: true })
  })

  it('remembers the dropped file, so the save behaves as after the chooser', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const dropped = fileHandle({ name: 'plan.json' })
    fake.drop(
      dropData([droppedItem({ file: readableFile({ name: 'plan.json' }), handle: dropped.handle })]),
    )
    await settled()
    await store.readFileToOpen('drop')
    await expect(store.readOpenedFileState()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })

  it('takes only the first of a multi-file drop, and says how many were left (OP-11)', async () => {
    // WHY: OP-11 rules this case, not OP-3 -- several files in one act, kept
    // first and the rest reported left behind, never read as a refusal.
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const first = fileHandle({ name: 'first.json' })
    const second = fileHandle({ name: 'second.json' })
    fake.drop(
      dropData([
        droppedItem({
          file: readableFile({ name: 'first.json', bytes: GRS_JSON_BYTES }),
          handle: first.handle,
        }),
        droppedItem({
          file: readableFile({ name: 'second.json', bytes: MSPDI_BYTES }),
          handle: second.handle,
        }),
      ]),
    )
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toEqual({
      ok: true,
      file: { bytes: GRS_JSON_BYTES, fileName: 'first.json' },
      ignoredFileCount: 1,
    })
  })

  it('hands back the bytes but remembers nothing where the browser has no handles', async () => {
    // WHY: there is nothing to overwrite, so saying writable would name a
    // file that cannot be written -- one of the three states IF-3 avoids.
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    fake.drop(
      dropData([
        droppedItem({ file: readableFile({ name: 'plan.json' }), withoutHandleApi: true }),
      ]),
    )
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toEqual({
      ok: true,
      file: { bytes: GRS_JSON_BYTES, fileName: 'plan.json' },
    })
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  it('calls a drop that carried no file cancelled', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    fake.drop(dropData([droppedItem({ kind: 'string', file: null })]))
    await settled()
    const reading = await store.readFileToOpen('drop')
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.fault.reason).toBe('cancelled')
  })

  it('calls an empty drop cancelled', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    fake.drop(dropData([]))
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toMatchObject({
      ok: false,
      fault: { reason: 'cancelled' },
    })
  })

  it('calls "nothing was dropped at all" cancelled', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    await expect(store.readFileToOpen('drop')).resolves.toMatchObject({
      ok: false,
      fault: { reason: 'cancelled' },
    })
  })

  it('consumes the drop once -- a second ask finds an empty slot', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const dropped = fileHandle({ name: 'plan.json' })
    fake.drop(
      dropData([droppedItem({ file: readableFile({ name: 'plan.json' }), handle: dropped.handle })]),
    )
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toMatchObject({ ok: true })
    await expect(store.readFileToOpen('drop')).resolves.toMatchObject({
      ok: false,
      fault: { reason: 'cancelled' },
    })
  })

  it('replaces a drop nobody opened with the next one', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const first = fileHandle({ name: 'first.json' })
    const second = fileHandle({ name: 'second.json' })
    fake.drop(
      dropData([
        droppedItem({ file: readableFile({ name: 'first.json' }), handle: first.handle }),
      ]),
    )
    await settled()
    fake.drop(
      dropData([
        droppedItem({
          file: readableFile({ name: 'second.json', bytes: MSPDI_BYTES }),
          handle: second.handle,
        }),
      ]),
    )
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toEqual({
      ok: true,
      file: { bytes: MSPDI_BYTES, fileName: 'second.json' },
    })
  })

  it('is a value when the dropped file cannot be read (FR-028)', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const dropped = fileHandle({ name: 'plan.json' })
    fake.drop(
      dropData([
        droppedItem({
          file: readableFile({
            name: 'plan.json',
            arrayBufferFails: { rejectsWith: new Error('the disk went away') },
          }),
          handle: dropped.handle,
        }),
      ]),
    )
    await settled()
    const reading = await store.readFileToOpen('drop')
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.fault.reason).toBe('unavailable')
  })

  it('hands back the bytes but remembers nothing when the handle lookup fails', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    fake.drop(
      dropData([
        droppedItem({
          file: readableFile({ name: 'plan.json' }),
          handleFails: { rejectsWith: new Error('no handle for you') },
        }),
      ]),
    )
    await settled()
    await expect(store.readFileToOpen('drop')).resolves.toEqual({
      ok: true,
      file: { bytes: GRS_JSON_BYTES, fileName: 'plan.json' },
    })
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  it('does not remember a dropped directory as the file to overwrite', async () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    fake.drop(
      dropData([
        droppedItem({ file: readableFile({ name: 'plans' }), handle: { kind: 'directory' } }),
      ]),
    )
    await settled()
    await store.readFileToOpen('drop')
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  it('opens no chooser on the drop route -- the two routes are not the same door', async () => {
    const fake = browser({ opens: { handles: [] }, saves: 'noApi' })
    const store = fileSystemAccessFileStore(fake.environment)
    const dropped = fileHandle({ name: 'plan.json' })
    fake.drop(
      dropData([droppedItem({ file: readableFile({ name: 'plan.json' }), handle: dropped.handle })]),
    )
    await settled()
    await store.readFileToOpen('drop')
    expect(openCalls).toEqual([])
  })
})

describe('表 T-024a OP-2 -- one entry, and both routes end in the same place', () => {
  for (const route of T_024A_OP2_ROUTES) {
    it(`${route}: hands back the bytes and leaves the same file overwritable`, async () => {
      const handle = fileHandle({ name: 'plan.json' })
      const fake = browser({ opens: { handles: [handle.handle] }, saves: 'noApi' })
      const store = fileSystemAccessFileStore(fake.environment)
      if (route === 'drop') {
        fake.drop(
          dropData([
            droppedItem({ file: readableFile({ name: 'plan.json' }), handle: handle.handle }),
          ]),
        )
        await settled()
      }
      await expect(store.readFileToOpen(route)).resolves.toEqual({
        ok: true,
        file: { bytes: GRS_JSON_BYTES, fileName: 'plan.json' },
      })
      await expect(store.readOpenedFileState()).resolves.toEqual({
        kind: 'writable',
        fileName: 'plan.json',
      })
      const writing = await store.overwriteOpenedFile(MSPDI_BYTES)
      expect(writing.ok, 'the save icon must behave the same after either route').toBe(true)
      expect(handle.written.at(-1)).toEqual(MSPDI_BYTES)
    })
  }
})

describe('FR-028 / NT-3a -- the four reasons, each reachable and told apart', () => {
  const situations: Record<FileStoreFaultReason, () => Promise<{ reason: string; what: string }>> = {
    cancelled: async () => {
      const store = fileSystemAccessFileStore(
        browser({ opens: { rejectsWith: dismissal() }, saves: 'noApi' }).environment,
      )
      const reading = await store.readFileToOpen('chooser')
      return reading.ok ? { reason: 'ok', what: '' } : reading.fault
    },
    permissionLost: async () => {
      const { store } = await opened({
        name: 'plan.json',
        createWritableFails: { rejectsWith: denial() },
      })
      const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
      return writing.ok ? { reason: 'ok', what: '' } : writing.fault
    },
    noOpenedFile: async () => {
      const store = fileSystemAccessFileStore(
        browser({ opens: 'noApi', saves: 'noApi' }).environment,
      )
      const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
      return writing.ok ? { reason: 'ok', what: '' } : writing.fault
    },
    unavailable: async () => {
      const store = fileSystemAccessFileStore(
        browser({ opens: 'noApi', saves: 'noApi' }).environment,
      )
      const reading = await store.readFileToOpen('chooser')
      return reading.ok ? { reason: 'ok', what: '' } : reading.fault
    },
  }

  for (const reason of IF_3_REASONS) {
    it(`${reason}: comes back as a value, with something to act on (NT-3a)`, async () => {
      const fault = await situations[reason]()
      expect(fault.reason).toBe(reason)
      expect(fault.what.length, 'a notice may not report the failure alone').toBeGreaterThan(0)
    })
  }

  it('never throws, whatever the browser does', async () => {
    const hostile = { throwsWith: new Error('the browser threw') }
    const handle = fileHandle({
      name: 'plan.json',
      queryFails: hostile,
      requestFails: hostile,
      createWritableFails: hostile,
    })
    const store = fileSystemAccessFileStore(
      browser({
        opens: { handles: [handle.handle] },
        saves: { throwsWith: new Error('the browser threw') },
      }).environment,
    )
    await expect(store.readFileToOpen('chooser')).resolves.toBeDefined()
    await expect(store.readFileToOpen('drop')).resolves.toBeDefined()
    await expect(store.readOpenedFileState()).resolves.toBeDefined()
    await expect(store.restoreOpenedFilePermission()).resolves.toBeDefined()
    await expect(store.overwriteOpenedFile(GRS_JSON_BYTES)).resolves.toBeDefined()
    await expect(
      store.writeChosenFile({
        bytes: GRS_JSON_BYTES,
        suggestedFileName: 'plan.json',
        extension: '.json',
        shouldBecomeOpenedFile: true,
        askToWriteOver: () => Promise.resolve(true),
      }),
    ).resolves.toBeDefined()
  })

  it('tells a dismissed chooser apart from a failure, so it can be left unsaid', async () => {
    const store = fileSystemAccessFileStore(
      browser({ opens: { rejectsWith: dismissal() }, saves: 'noApi' }).environment,
    )
    const reading = await store.readFileToOpen('chooser')
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.fault.reason).toBe('cancelled')
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  it('calls a browser failure to open unavailable, not cancelled', async () => {
    const store = fileSystemAccessFileStore(
      browser({ opens: { rejectsWith: new Error('the browser gave up') }, saves: 'noApi' })
        .environment,
    )
    const reading = await store.readFileToOpen('chooser')
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.fault.reason).toBe('unavailable')
  })

  it('is a value when the chosen file cannot be read (FR-028)', async () => {
    const handle = fileHandle({
      name: 'plan.json',
      getFileFails: { rejectsWith: new Error('the disk went away') },
    })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [handle.handle] }, saves: 'noApi' }).environment,
    )
    const reading = await store.readFileToOpen('chooser')
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.fault.reason).toBe('unavailable')
    expect(reading.fault.what.length).toBeGreaterThan(0)
  })
})

describe('boundaries', () => {
  it('treats a chooser that came back with no file as cancelled', async () => {
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [] }, saves: 'noApi' }).environment,
    )
    const reading = await store.readFileToOpen('chooser')
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.fault.reason).toBe('cancelled')
    await expect(store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })

  it('takes the one file a one-element answer carries', async () => {
    const handle = fileHandle({ name: 'plan.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: { handles: [handle.handle] }, saves: 'noApi' }).environment,
    )
    await expect(store.readFileToOpen('chooser')).resolves.toMatchObject({ ok: true })
  })

  it('refuses a second read while one is still running', async () => {
    // WHY: this is the store's OWN guard, not OP-8 (which belongs to
    // ImportDocument) -- two reads at once would both set the handle, racing.
    let release: (handles: readonly FileHandle[]) => void = () => undefined
    const pending = new Promise<readonly FileHandle[]>((resolve) => {
      release = resolve
    })
    const handle = fileHandle({ name: 'plan.json' })
    const slow: OpenFilePicker = (options) => {
      openCalls.push(options)
      return pending
    }
    const store = fileSystemAccessFileStore({
      openFilePicker: slow,
      saveFilePicker: undefined,
      dropSurface: browser({ opens: 'noApi', saves: 'noApi' }).environment.dropSurface,
    })
    const first = store.readFileToOpen('chooser')
    const second = await store.readFileToOpen('chooser')
    expect(second.ok, 'the second read may not run beside the first').toBe(false)
    expect(openCalls, 'and it may not open a second chooser either').toHaveLength(1)
    release([handle.handle])
    await expect(first).resolves.toMatchObject({ ok: true })
  })
})
