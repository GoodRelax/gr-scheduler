// CR-588 contract: the 'baseline' route opens the OP-2 chooser (OP-15) and never moves the save target FR-060 overwrites (OP-9).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import type { FileStore, OpenRoute } from '../../src/adapter/file-gateway/file-store'
import {
  fileSystemAccessFileStore,
  type DropEvent,
  type DroppedItem,
  type DropSurface,
  type FileHandle,
  type OpenFilePicker,
  type ReadableFile,
  type WritableFileStream,
} from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))
const MACHINES = readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')

const OP_15_OPENS_THE_CHOOSER = '**`OP-2` のファイル選択と同じ画面を開き、選んだファイルを重ねる用途で開くこと（MUST）**'
const OP_15_CLOSED_WITHOUT_A_FILE = '⚠️ 選ばずに閉じたときは何も変えない'
const OP_2_ROUTES = '| OP-2 | 経路 | ファイル選択、およびドラッグ＆ドロップ（表 T-008 の CHN-1）。'
const OP_9_NEITHER_REPLACES_NOR_MERGES = '**現在の文書を置き換えも合流もしないこと（MUST NOT）。'
const FR_060_OVERWRITES_THE_OPENED_FILE =
  '**STATEMENT**: 作成者が開いたファイルを保存するとき、`GRS` は、**同じファイルへ上書きできるようにすること。**'
const IC_4_ASKS = '⭐ **重ねる予定が無いときは切り替えず、変更前の予定にするファイルを選ばせる**（表 T-024a の `OP-15`）'
const FILE_FLOW_BASELINE_ROUTE = '`baseline`（重ねる予定が無いときの変更前の予定の入口。`OP-3` を問わずに重ねる）'

const BASELINE: OpenRoute = 'baseline'

const encoder = new TextEncoder()
const OPENED_BYTES = encoder.encode('{"schemaVersion":"opened"}')
const OVERLAY_BYTES = encoder.encode('{"schemaVersion":"overlay"}')
const DROPPED_BYTES = encoder.encode('{"schemaVersion":"dropped"}')
const SAVED_BYTES = encoder.encode('{"schemaVersion":"saved"}')

let pickerCalls: unknown[] = []

beforeEach(() => {
  pickerCalls = []
})

interface Fake {
  readonly handle: FileHandle
  readonly readable: ReadableFile
  readonly writes: Uint8Array[]
}

function fakeFile(name: string, bytes: Uint8Array): Fake {
  const writes: Uint8Array[] = []
  const readable: ReadableFile = {
    name,
    size: bytes.byteLength,
    arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
  }
  const stream: WritableFileStream = {
    write: (data: BufferSource) => {
      writes.push(
        ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
          : new Uint8Array(data.slice(0)),
      )
      return Promise.resolve()
    },
    close: () => Promise.resolve(),
    abort: () => Promise.resolve(),
  }
  const handle: FileHandle = {
    kind: 'file',
    name,
    getFile: () => Promise.resolve(readable),
    createWritable: () => Promise.resolve(stream),
    queryPermission: () => Promise.resolve('granted'),
    requestPermission: () => Promise.resolve('granted'),
  }
  return { handle, readable, writes }
}

type PickerAnswer = Fake | 'closed'

interface Stand {
  readonly store: FileStore
  answerNext(answer: PickerAnswer): void
  drop(file: Fake): void
}

function stand(): Stand {
  let next: PickerAnswer = 'closed'
  const listeners = new Map<string, (event: DropEvent) => void>()
  const picker: OpenFilePicker = (options) => {
    pickerCalls.push(options)
    if (next === 'closed') {
      return Promise.reject(new DOMException('The user aborted a request.', 'AbortError'))
    }
    return Promise.resolve([next.handle])
  }
  const dropSurface: DropSurface = {
    addEventListener: (type, listener) => {
      listeners.set(type, listener)
    },
  }
  const store = fileSystemAccessFileStore({ openFilePicker: picker, saveFilePicker: undefined, dropSurface })
  return {
    store,
    answerNext: (answer) => {
      next = answer
    },
    drop: (file) => {
      const item: DroppedItem = {
        kind: 'file',
        getAsFile: () => file.readable,
        getAsFileSystemHandle: () => Promise.resolve(file.handle),
      }
      listeners.get('drop')?.({
        preventDefault: () => undefined,
        dataTransfer: { types: ['Files'], items: { length: 1, 0: item } },
      })
    },
  }
}

function settled(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

// WHY: plan.json is opened through the ordinary chooser first, so FR-060 has a target the overlay could steal.
async function withOpenedFile(): Promise<{ built: Stand; opened: Fake; overlay: Fake }> {
  const built = stand()
  const opened = fakeFile('plan.json', OPENED_BYTES)
  const overlay = fakeFile('before.json', OVERLAY_BYTES)
  built.answerNext(opened)
  const first = await built.store.readFileToOpen('chooser')
  expect(first.ok, 'premise: the chooser read the file to open').toBe(true)
  await expect(built.store.readOpenedFileState()).resolves.toEqual({ kind: 'writable', fileName: 'plan.json' })
  pickerCalls = []
  return { built, opened, overlay }
}

describe('CR-588 premises -- the clauses these cases quote still stand', () => {
  it('T-024a OP-15, OP-2 and OP-9 still hold the sentences quoted below', () => {
    for (const clause of [OP_15_OPENS_THE_CHOOSER, OP_15_CLOSED_WITHOUT_A_FILE, OP_2_ROUTES, OP_9_NEITHER_REPLACES_NOR_MERGES]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })

  it('FR-060 still overwrites the file the author opened', () => {
    expect(REQUIREMENTS).toContain(FR_060_OVERWRITES_THE_OPENED_FILE)
  })

  it('T-109 IC-4 still asks for the file, and the fileFlow openRoute still carries baseline', () => {
    expect(GLOSSARY).toContain(IC_4_ASKS)
    expect(MACHINES).toContain(FILE_FLOW_BASELINE_ROUTE)
  })
})

describe("OP-15 (a) -- readFileToOpen('baseline') opens the OP-2 chooser, not the drop path", () => {
  it('OP-15 「OP-2 のファイル選択と同じ画面を開き」: the baseline route opens the chooser once, as the chooser route does', async () => {
    const built = stand()
    built.answerNext(fakeFile('before.json', OVERLAY_BYTES))
    await built.store.readFileToOpen(BASELINE)
    const baselineCalls = pickerCalls
    pickerCalls = []
    const control = stand()
    control.answerNext(fakeFile('before.json', OVERLAY_BYTES))
    await control.store.readFileToOpen('chooser')
    expect(baselineCalls).toHaveLength(1)
    expect(baselineCalls, 'the same screen OP-2 opens').toEqual(pickerCalls)
  })

  it('OP-15 「選んだファイルを重ねる用途で開くこと（MUST）」: the baseline route hands back the chosen file', async () => {
    const built = stand()
    built.answerNext(fakeFile('before.json', OVERLAY_BYTES))
    await expect(built.store.readFileToOpen(BASELINE)).resolves.toEqual({
      ok: true,
      file: { bytes: OVERLAY_BYTES, fileName: 'before.json' },
    })
  })

  it('OP-15 「OP-2 のファイル選択と同じ画面を開き」: a waiting drop is not what the baseline route reads', async () => {
    const built = stand()
    built.drop(fakeFile('dropped.json', DROPPED_BYTES))
    await settled()
    built.answerNext(fakeFile('before.json', OVERLAY_BYTES))
    const reading = await built.store.readFileToOpen(BASELINE)
    expect(pickerCalls, 'the chooser was opened').toHaveLength(1)
    expect(reading).toEqual({ ok: true, file: { bytes: OVERLAY_BYTES, fileName: 'before.json' } })
  })
})

describe('OP-9 / FR-060 (b) -- the file chosen for the overlay never becomes the save target', () => {
  it('OP-9 「現在の文書を置き換えも合流もしないこと（MUST NOT）」: after a baseline read the opened file is still plan.json', async () => {
    const { built, overlay } = await withOpenedFile()
    built.answerNext(overlay)
    const reading = await built.store.readFileToOpen(BASELINE)
    expect(reading.ok, 'premise: the overlay file was read').toBe(true)
    await expect(built.store.readOpenedFileState()).resolves.toEqual({ kind: 'writable', fileName: 'plan.json' })
  })

  it('FR-060 「同じファイルへ上書きできるようにすること」: the next save overwrites plan.json, and before.json is not written', async () => {
    const { built, opened, overlay } = await withOpenedFile()
    built.answerNext(overlay)
    await built.store.readFileToOpen(BASELINE)
    const writing = await built.store.overwriteOpenedFile(SAVED_BYTES)
    expect(writing.ok).toBe(true)
    expect(opened.writes, 'the file the author opened').toEqual([SAVED_BYTES])
    expect(overlay.writes, 'the file chosen for the overlay').toEqual([])
  })

  it('OP-9 「置き換えも合流もしないこと（MUST NOT）」: with nothing opened, a baseline read leaves nothing to overwrite', async () => {
    const built = stand()
    const overlay = fakeFile('before.json', OVERLAY_BYTES)
    built.answerNext(overlay)
    await built.store.readFileToOpen(BASELINE)
    await expect(built.store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
    const writing = await built.store.overwriteOpenedFile(SAVED_BYTES)
    expect(writing.ok).toBe(false)
    expect(overlay.writes).toEqual([])
  })

  it('control -- OP-2 via FR-060: a chooser read DOES adopt the chosen file as the save target', async () => {
    const { built, opened } = await withOpenedFile()
    const other = fakeFile('other.json', OVERLAY_BYTES)
    built.answerNext(other)
    await built.store.readFileToOpen('chooser')
    await expect(built.store.readOpenedFileState()).resolves.toEqual({ kind: 'writable', fileName: 'other.json' })
    await built.store.overwriteOpenedFile(SAVED_BYTES)
    expect(other.writes).toEqual([SAVED_BYTES])
    expect(opened.writes).toEqual([])
  })
})

describe('OP-15 (c) -- closing the chooser on the baseline route changes nothing', () => {
  it('OP-15 「選ばずに閉じたときは何も変えない」: the read fails and the opened file stays plan.json', async () => {
    const { built, opened } = await withOpenedFile()
    built.answerNext('closed')
    const reading = await built.store.readFileToOpen(BASELINE)
    expect(pickerCalls, 'premise: the chooser was opened and closed').toHaveLength(1)
    expect(reading.ok).toBe(false)
    await expect(built.store.readOpenedFileState()).resolves.toEqual({ kind: 'writable', fileName: 'plan.json' })
    await built.store.overwriteOpenedFile(SAVED_BYTES)
    expect(opened.writes).toEqual([SAVED_BYTES])
  })

  it('OP-15 「選ばずに閉じたときは何も変えない」: with nothing opened, closing leaves nothing opened', async () => {
    const built = stand()
    built.answerNext('closed')
    await expect(built.store.readFileToOpen(BASELINE)).resolves.toMatchObject({ ok: false })
    await expect(built.store.readOpenedFileState()).resolves.toEqual({ kind: 'none' })
  })
})
