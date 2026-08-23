// Unit tests for UF-51 `file-system-access-file-store.ts` -- table T-075 of
// docs/spec/05-07-design.md, component `FileSystemAccessFileStore` (CP-28 of
// table T-062), published as PI-28 of table T-064. It is the one
// implementation of `FileStore`, the seam IF-3 of table T-065 declares.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, §1). What was read: docs/spec/ for every rule below; the
// seam declaration `src/adapter/file-gateway/file-store.ts`, which is the
// specification's own shape for these five members; and of the unit itself
// only its head comment, its exported types and the one exported signature
// `fileSystemAccessFileStore(environment: FileSystemAccessEnvironment):
// FileStore`. Every expected value here comes from a requirement, a table or
// the seam declaration -- never from the implementation.
//
// The rules these cases answer to:
//   FR-060     (:3205) overwrite the file that was opened, so a round trip
//              closes on one file; and, when the permission to it is gone,
//              OFFER to win it back at startup (MUST). Its RATIONALE bars a
//              download fallback: downloads cannot control where a file lands
//              and breed numbered copies of one name
//   FR-087     (:3161) one entry for opening, ruled by table T-024a
//   表 T-024a  OP-1 the two accepted formats -- and no extension, no media
//              type anywhere in the specification (PD-104); OP-2 the two
//              routes, chooser and drop, and NO second entry (MUST NOT);
//              OP-3 the person is asked one question about one read content;
//              OP-4 unsaved edits are confirmed before being discarded (MUST),
//              never dropped silently (MUST NOT); OP-11 several files handed
//              over in one act -- the first is kept and the rest are reported
//              as left behind (MUST), and the act may not be made to read as
//              refused (MUST NOT), because one file IS open
//   表 T-024   (:2828) IO-1 MSPDI XML and IO-2 `GRS JSON` go both ways, and
//              (:2836) an implementation that adds a BOM is forbidden
//              (MUST NOT)
//   表 T-003   CN-2 (:152) Chromium is the baseline, Firefox is checked only,
//              Safari is out of scope; CN-5 (:157) UTF-8, no BOM
//   表 T-004   LM-14 (:187) overwrite-save may simply not work in the `file://`
//              form; FR-060 offers the permission back instead
//   FR-028     nothing throws across this boundary (AG-8 of table T-035): a
//              failure comes back as a VALUE
//   表 T-037   NT-1 (:3674) a notice says WHICH item and why, in words (MUST);
//              NT-3a (:3677) a failure notice carries a next step (MUST) and
//              may not report the failure alone (MUST NOT); NT-4 (:3678) the
//              startup business is gathered onto one panel
//   表 T-060   LY-5 (05-07-design.md:78) the Framework is the layer that holds
//              a current value and the layer that uses the File System Access
//              API -- which is why the browser ARRIVES in a parameter here
//   表 T-065   IF-3 (05-07-design.md:380) "the handle is held by the
//              implementation (FR-060)". No member takes or returns one
//   表 T-211   S-113 `importMaxBytes` -- the ceiling belongs to FR-023 on the
//              far side, NOT to this unit
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table, one test walking every row.
// T_024_FORMS, T_024A_OP2_ROUTES, IF_3_PERMISSION and IF_3_REASONS below are
// those copies.
//
// ⛔ R6.3 warns that over-mocking leaves the real behaviour unverified. Every
// fake below RECORDS what it was asked to do, and the cases assert on that
// record -- which calls, in which order, with which arguments -- rather than
// merely on what came back.

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

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

const encoder = new TextEncoder()

/** ⚠️ Not a document -- only bytes, which is all this unit ever sees. */
const GRS_JSON_BYTES = encoder.encode('{"schemaVersion":"2026-08-19"}')
const MSPDI_BYTES = encoder.encode('<Project><Name>a</Name></Project>')

/** The three bytes 表 T-024's note forbids an implementation from adding. */
const BYTE_ORDER_MARK = Uint8Array.from([0xef, 0xbb, 0xbf])

/**
 * 表 T-024 の IO-1 / IO-2 -- the two forms that come in as well as go out.
 * ⛔ The remark column of both sends the character set to CN-5 of 表 T-003
 * (UTF-8, BOM なし), and the note under the table forbids adding a BOM
 * (MUST NOT). This unit obeys both by never touching the bytes.
 */
const T_024_FORMS = [
  { row: 'IO-1', fileName: 'plan.xml', bytes: MSPDI_BYTES },
  { row: 'IO-2', fileName: 'plan.json', bytes: GRS_JSON_BYTES },
] as const

/**
 * 表 T-024a の OP-2 -- 「ファイル選択、およびドラッグ＆ドロップ」, and 「入口は
 * 本要求の『開く』1 つとし、取込（合流）に別の入口を設けてはならない
 * （MUST NOT）」. Both routes are one member taking a value, so the walk below
 * is the whole of that rule.
 */
const T_024A_OP2_ROUTES: readonly OpenRoute[] = ['chooser', 'drop']

/**
 * IF-3 of 表 T-065 publishes three states and no fourth, and FR-060 is why the
 * middle one exists: the startup offer is made exactly when the file is
 * remembered but may not be written. A browser answers a permission query with
 * one of three values, and only one of them means "can be written right now".
 */
const IF_3_PERMISSION = [
  { permission: 'granted', state: 'writable' },
  { permission: 'denied', state: 'permissionLost' },
  { permission: 'prompt', state: 'permissionLost' },
] as const satisfies readonly {
  permission: FilePermissionState
  state: 'writable' | 'permissionLost'
}[]

/**
 * The four reasons of `FileStoreFaultReason` (file-store.ts, the seam IF-3
 * declares), each with the situation the seam's own words attach to it.
 *
 * ⛔ NT-3a of 表 T-037 is why they may not be flattened into one: a failure
 * notice must carry a next step, and only the reason can decide which step.
 */
const IF_3_REASONS: readonly FileStoreFaultReason[] = [
  'cancelled',
  'permissionLost',
  'noOpenedFile',
  'unavailable',
]

/**
 * S-113 of 表 T-211 counts megabytes; this is above the ceiling however it is
 * counted. ⛔ The ceiling is not this unit's -- FR-023 rules on the size the
 * gateway reports. The case that uses this asserts the store does NOT refuse.
 */
const ABOVE_ANY_CEILING = Number.MAX_SAFE_INTEGER

// ---------------------------------------------------------------------------
// The browser, faked. LY-5 of 表 T-060 makes this layer the one that holds a
// current value and the one that touches the File System Access API, and the
// unit takes that API as a parameter -- so a Node process with no DOM can
// drive it with plain objects and then read back what it did.
// ---------------------------------------------------------------------------

/** Everything the unit did to the browser, in order. */
let log: string[] = []
/** The options object handed to `showOpenFilePicker`, once per call. */
let openCalls: unknown[] = []
/** The options object handed to `showSaveFilePicker`, once per call. */
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

/** Fails the way the failure says: synchronously, or by rejecting. */
function failing<T>(failure: Failure, what: string): Promise<T> {
  if ('throwsWith' in failure) {
    log.push(`${what} threw`)
    throw failure.throwsWith
  }
  log.push(`${what} rejected`)
  return Promise.reject(failure.rejectsWith)
}

/** What a File System Access chooser rejects with when the person dismisses it. */
function dismissal(): DOMException {
  return new DOMException('The user aborted a request.', 'AbortError')
}

/** What the browser raises when the gesture behind a write is refused. */
function denial(): DOMException {
  return new DOMException('The request is not allowed by the user agent.', 'NotAllowedError')
}

/** LM-4's case as the browser raises it: the disk would not take the bytes. */
function quotaExceeded(): DOMException {
  return new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

interface FileSpec {
  readonly name: string
  readonly bytes?: Uint8Array
  /** ⚠️ Kept apart from `bytes` so a file above S-113's ceiling costs nothing. */
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
  /** What `queryPermission` answers. */
  readonly queried?: FilePermissionState
  /** What `requestPermission` answers. */
  readonly requested?: FilePermissionState
  /** ⚠️ PD-105: a browser that has handles but neither permission member. */
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
  /** Every chunk handed to `write`, in the order it arrived. */
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
  /** The `kind` a `DataTransferItem` reports. A file drop reports `'file'`. */
  readonly kind?: string
  readonly file: ReadableFile | null
  readonly handle?: DroppedHandle | null
  /** ⚠️ A browser with no handles at all -- the drop cannot be remembered. */
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
  /** Fires the `dragover` the store registered; answers whether it refused the default. */
  dragOver(data: DropData | null): boolean
  /** Fires the `drop` the store registered; answers whether it refused the default. */
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

/**
 * Lets every microtask the browser handed out finish. ⚠️ A drop is taken
 * DURING the event, but what it took (`getAsFileSystemHandle`, `arrayBuffer`)
 * only settles afterwards, so a case that drops and then asks must wait here.
 */
function settled(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

// ---------------------------------------------------------------------------
// Convenience: a store with one file already opened through the chooser.
// ---------------------------------------------------------------------------

async function opened(spec: HandleSpec): Promise<{ store: FileStore; fake: HandleFake }> {
  const fake = fileHandle(spec)
  const store = fileSystemAccessFileStore(
    browser({ opens: { handles: [fake.handle] }, saves: 'noApi' }).environment,
  )
  const reading = await store.readFileToOpen('chooser')
  expect(reading.ok, 'the ordinary open must succeed before a case builds on it').toBe(true)
  return { store, fake }
}

// ---------------------------------------------------------------------------
// LY-5 of 表 T-060 / R7.3 -- the browser arrives, it is never reached for.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 表 T-024a OP-2 / OP-4 -- construction, and the drop surface.
// ---------------------------------------------------------------------------

describe('construction -- the drop surface (OP-2, OP-4)', () => {
  it('registers for dragover and for drop, before anything is asked of it', () => {
    const fake = browser({ opens: 'noApi', saves: 'noApi' })
    fileSystemAccessFileStore(fake.environment)
    expect(fake.registered.map((one) => one.type).sort()).toEqual(['dragover', 'drop'])
  })

  it('refuses the browser default for a drag carrying files (OP-4)', () => {
    // ⛔ Without this the drop event never arrives and the browser leaves the
    // page to open the file -- the current document is discarded without the
    // confirmation OP-4 makes mandatory (:3164).
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

// ---------------------------------------------------------------------------
// readFileToOpen('chooser') -- 表 T-024a OP-1 / OP-2 / OP-3.
// ---------------------------------------------------------------------------

describe("readFileToOpen('chooser') -- the ordinary path", () => {
  it('asks for one file and applies no filter (OP-3; PD-104)', async () => {
    // OP-1 names `GRS JSON` and MSPDI XML but no extension and no media type
    // exists anywhere in docs/spec, so there is nothing to filter by. OP-3
    // asks the person ONE question about ONE read content -> multiple: false.
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
    // ⛔ Losing the overwrite target because a second open went wrong would
    // break the round trip FR-060 exists to close, for a reason that has
    // nothing to do with the file that is already open.
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

// ---------------------------------------------------------------------------
// 表 T-024 IO-1 / IO-2 and the BOM note -- one test over every row.
// ---------------------------------------------------------------------------

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
      // ⛔ The note under 表 T-024 (:2836) forbids adding one (MUST NOT); CN-5
      // (:157) owns the encoding rule and lives on the near side of the seam.
      // This unit moves bytes, so what came in is what goes out.
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

// ---------------------------------------------------------------------------
// readOpenedFileState -- IF-3's three states.
// ---------------------------------------------------------------------------

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

  it('answers writable where the browser has handles but no queryPermission (PD-105)', async () => {
    // ⚠️ This is PD-105's failing test -- the case that flips if the ruling
    // goes the other way. The mark itself belongs at the implementation site
    // (rule 06, §3), not here. The specification does not say what such a
    // browser should be told: the pessimistic answer would put FR-060's
    // restore offer onto NT-4's startup panel every time nothing was wrong,
    // and a refused write still comes back as permissionLost.
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

// ---------------------------------------------------------------------------
// restoreOpenedFilePermission -- FR-060's second MUST.
// ---------------------------------------------------------------------------

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

  it('answers writable where the browser has no requestPermission either (PD-105)', async () => {
    // ⚠️ PD-105 again, from the other member: with no way to ask, the store
    // can only find out by trying to write, and a refused write still comes
    // back as `permissionLost`.
    const { store } = await opened({ name: 'plan.json', withoutPermissionApi: true })
    await expect(store.restoreOpenedFilePermission()).resolves.toEqual({
      kind: 'writable',
      fileName: 'plan.json',
    })
  })
})

// ---------------------------------------------------------------------------
// overwriteOpenedFile -- FR-060's whole point.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// writeChosenFile -- the file the person points at.
// ---------------------------------------------------------------------------

describe('writeChosenFile -- a file the person points at', () => {
  // `askToWriteOver` is DI-4 of table T-227: the store puts the question once the
  // destination is known and the bytes are still unwritten, and writes only on a
  // `true`. ⛔ The answer is the NEAR side's -- the store does not judge -- so
  // the stand-in here simply says yes, and the cases below assert what the store
  // did rather than what it was told.
  const request = (
    over: Partial<{ suggestedFileName: string; shouldBecomeOpenedFile: boolean }>,
  ): ChosenFileWrite => ({
    bytes: GRS_JSON_BYTES,
    suggestedFileName: over.suggestedFileName ?? 'plan.json',
    shouldBecomeOpenedFile: over.shouldBecomeOpenedFile ?? true,
    askToWriteOver: () => Promise.resolve(true),
  })

  it('hands the chooser the suggested name, and nothing else', async () => {
    const chosen = fileHandle({ name: 'plan.json' })
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { handle: chosen.handle } }).environment,
    )
    await store.writeChosenFile(request({ suggestedFileName: 'schedule.json' }))
    expect(saveCalls).toHaveLength(1)
    expect(Object.keys(saveCalls[0] as object)).toEqual(['suggestedName'])
    expect(saveCalls[0]).toEqual({ suggestedName: 'schedule.json' })
  })

  it('writes then closes, and reports the file the person actually chose', async () => {
    // ⚠️ `suggestedFileName` is a suggestion the person may overrule, so the
    // name reported back is the handle's, not the one that was suggested.
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
    // ⛔ Which of 表 T-024's forms may stand in that position is the near
    // side's ruling (`file-gateway.ts` decides it); the store obeys the flag.
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
    // IF-3 defines `permissionLost` as "a file is remembered, but it may not be
    // written now". With nothing remembered that reason cannot be true, so the
    // remaining one is `unavailable` -- the store tried and could not.
    const store = fileSystemAccessFileStore(
      browser({ opens: 'noApi', saves: { rejectsWith: denial() } }).environment,
    )
    const writing = await store.writeChosenFile(request({}))
    expect(writing.ok).toBe(false)
    if (writing.ok) return
    expect(writing.fault.reason).toBe('unavailable')
    expect(writing.fault.what.length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------------------
  // DI-4 of 表 T-227 -- the question, and the order it has to be put in.
  //
  // ⭐ The cases above hand the store a stand-in that always says yes, so none
  // of them can tell a store that ASKS from a store that never asks at all.
  // These three close that gap on this side of IF-3. What each holds the unit
  // to comes from DI-4 (the question is put before the write, MUST), from NT-7
  // of 表 T-037 (going on or calling off is CHOSEN, so a "call off" that still
  // wrote would make the choice mean nothing), and from the seam declaration
  // `src/adapter/file-gateway/file-store.ts`, which fixes the order of the four
  // steps and names a `false` answer `cancelled` rather than a failure.
  //
  // ⛔ NOT DECIDED BY THE SPECIFICATION, and therefore not held here: which of
  // the two `ChosenWriteDestination` states a store must report when it cannot
  // tell a file the chooser has just created from one that was standing empty.
  // Both hold zero bytes. The seam declaration records the same silence in a
  // STOP note of its own and makes a choice there; no case below turns on it,
  // so the cases stay true whichever way the silence is later settled.
  // -------------------------------------------------------------------------

  /** One request that records the question, and answers it the given way. */
  const asking = (
    answer: boolean,
  ): { readonly write: ChosenFileWrite; readonly asked: unknown[] } => {
    const asked: unknown[] = []
    return {
      asked,
      write: {
        bytes: GRS_JSON_BYTES,
        suggestedFileName: 'plan.json',
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
    // ⭐ The destination is given bytes that are not the ones being written, so
    // that "what was standing there" and "what is going down" cannot be
    // confused for one another in the record below.
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
    // ⛔ Nothing that could destroy the destination may come first: a stream
    // opened on the handle truncates the file in a real browser, so the ask has
    // to precede `createWritable`, not merely `write`.
    const touched = log.findIndex((one) => /\.createWritable|\.write|\.close/.test(one))
    expect(touched, `DI-4: the destination was touched first (${log.join(', ')})`)
      .toBeGreaterThan(askedAt)
    // R7.4 / CS-4 of 表 T-066: one reading, and the answer is about that one.
    expect(log.filter((one) => one === 'their-name.json.getFile')).toHaveLength(1)
    expect(log.indexOf('their-name.json.getFile')).toBeLessThan(askedAt)
  })

  it('hands the question what is standing at the destination (DI-1 / DI-3)', async () => {
    // DI-1 compares the file NAME and DI-3 turns on whether the characters
    // standing there read as this document's format, so the near side cannot
    // answer either without both. ⚠️ The name is the handle's -- the person may
    // have overruled the suggestion -- and the bytes are the ones on the disk.
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
    // NT-7 of 表 T-037 makes calling off a CHOICE, so a store that wrote anyway
    // would leave the person a question that decided nothing. IF-3 keeps
    // `cancelled` apart from the three failures for exactly this: the person
    // who called the write off has not been failed and is owed no next step
    // (NT-3a of the same table applies to the other three).
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
    // ⭐ `shouldBecomeOpenedFile` is about a write that HAPPENED. A refusal that
    // still moved FR-060's target would point the next overwrite at a file this
    // document was never written to.
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

// ---------------------------------------------------------------------------
// The File System Access API is absent -- CN-2 of 表 T-003, LM-14 of 表 T-004.
// ---------------------------------------------------------------------------

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
    // ⛔ FR-060's own RATIONALE is the argument against a fallback: downloads
    // cannot control where a file lands and breed numbered copies of one name,
    // which is the problem FR-060 exists to solve.
    const store = fileSystemAccessFileStore(browser({ opens: 'noApi', saves: 'noApi' }).environment)
    log.length = 0
    const writing = await store.writeChosenFile({
      bytes: GRS_JSON_BYTES,
      suggestedFileName: 'plan.json',
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

// ---------------------------------------------------------------------------
// readFileToOpen('drop') -- OP-2's second route.
// ---------------------------------------------------------------------------

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
    // ⭐ OP-11 of 表 T-024a is the row that rules this case, not OP-3: OP-3 is
    // about the question put to the person over ONE read content, while OP-11
    // is the case of several files arriving in the same act. It keeps the first
    // and puts a MUST on saying that the rest were left behind, and a MUST NOT
    // on letting the act read as refused -- so the number rides beside the file
    // on the SUCCESS. `FileReading.ignoredFileCount` of the seam declaration
    // (`src/adapter/file-gateway/file-store.ts`) is where it rides, and an
    // absent one there asserts that none were left. A reading that dropped a
    // file and stated nothing would therefore be exactly the silence OP-11's
    // MUST NOT forbids, which is why this is asserted with the whole reading
    // rather than on the member alone.
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
      // ⭐ Two were handed over and one was kept, so one was left. The number
      // comes from this case's own hand-over, not from the specification.
      ignoredFileCount: 1,
    })
  })

  it('hands back the bytes but remembers nothing where the browser has no handles', async () => {
    // ⚠️ There is nothing to overwrite, so saying `writable` would name a file
    // that cannot be written -- one of the three states IF-3 exists to avoid.
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

// ---------------------------------------------------------------------------
// 表 T-024a OP-2 -- one entry, two routes. One test over every row.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// FR-028 and NT-3a -- every failure is a value, and the four are told apart.
// One test over every row of IF-3's reason list.
// ---------------------------------------------------------------------------

describe('FR-028 / NT-3a -- the four reasons, each reachable and told apart', () => {
  const situations: Record<FileStoreFaultReason, () => Promise<{ reason: string; what: string }>> = {
    /** IF-3: "The person dismissed the chooser, or dropped nothing." */
    cancelled: async () => {
      const store = fileSystemAccessFileStore(
        browser({ opens: { rejectsWith: dismissal() }, saves: 'noApi' }).environment,
      )
      const reading = await store.readFileToOpen('chooser')
      return reading.ok ? { reason: 'ok', what: '' } : reading.fault
    },
    /** IF-3: "a file is remembered, but it may not be written now." */
    permissionLost: async () => {
      const { store } = await opened({
        name: 'plan.json',
        createWritableFails: { rejectsWith: denial() },
      })
      const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
      return writing.ok ? { reason: 'ok', what: '' } : writing.fault
    },
    /** IF-3: "Nothing has been opened, so there is no file to overwrite." */
    noOpenedFile: async () => {
      const store = fileSystemAccessFileStore(
        browser({ opens: 'noApi', saves: 'noApi' }).environment,
      )
      const writing = await store.overwriteOpenedFile(GRS_JSON_BYTES)
      return writing.ok ? { reason: 'ok', what: '' } : writing.fault
    },
    /** IF-3: "The store tried and could not" -- LM-14 lands here. */
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

// ---------------------------------------------------------------------------
// Boundaries: nothing chosen, one element, two reads at once.
// ---------------------------------------------------------------------------

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
    // ⚠️ This is the store's OWN guard, not OP-8 of 表 T-024a: OP-8 forbids a
    // second open while an import runs and belongs to `ImportDocument`. Two
    // reads at once here would both set the handle, and which one won would
    // depend on which chooser the person closed first.
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
