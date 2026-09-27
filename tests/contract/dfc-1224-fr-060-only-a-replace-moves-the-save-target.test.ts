// DFC-1224 spec-only tests: after an open, only a replace (IC-71) moves the file SK-11 writes over.

import { afterEach, describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import type {
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  fileSystemAccessFileStore,
  type DropEvent,
  type DroppedItem,
  type FileHandle,
  type FileSystemAccessEnvironment,
  type ReadableFile,
  type WritableFileStream,
} from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { pointerOf, REQUIREMENTS, rowDocument, SCREEN } from '../unit/cr-541-stage'
import { bare, specTable, unbroken } from './spec-table'

const T_036 = specTable('T-036')
const T_103 = specTable('T-103')
const T_109 = specTable('T-109')

const STATE_MACHINES = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'),
)

const KEEP_THE_TARGET_MUST =
  '合流と重ね（表 T-024a の `OP-3`）で開いた後も、上書きする先はそれまでのままとすること（MUST）'
const ONLY_A_REPLACE = '読んだファイルを上書きする先にするのは置き換えだけである'
const MERGE_MAKES_NO_FILE = '合流・重ねは、ファイルに無い文書を作る'
const REPLACE_IS_THE_FILE = '置き換えは、開いたファイルと同じ文書にする'
const MSPDI_HAS_NO_TARGET = 'MSPDI で開いた文書の最初の `SK-11` は上書きする先を持たない'
const CHECK_BEFORE_OP_3 = '`OP-3` を問う前に通すこと（MUST）'
const ONE_ENTRANCE = '1 つ目のファイルも 2 つ目以降も同じ経路で入る'
const FIRST_SAVE_CHOOSES = '起動した直後の最初の保存で、人がファイルを選び直すのが本仕様である（MUST）'

const cellOf = (
  table: { readonly id: string; readonly rows: readonly { id: string; cells: readonly string[] }[] },
  id: string,
  at: number,
): string => {
  const cell = table.rows.find((one) => one.id === id)?.cells[at]
  if (cell === undefined) throw new Error(`table ${table.id} has no cell ${at} in row ${id}`)
  return cell
}

const keyOfRow = (id: string): KeyInput => {
  const parts = (cellOf(T_036, id, 1).split('/')[0] ?? '')
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: {
      ctrl: named('Ctrl'),
      shift: named('Shift'),
      alt: named('Alt'),
      meta: named('Cmd'),
    } satisfies InputModifiers,
  }
}

const SK_10 = keyOfRow('SK-10')
const SK_11 = keyOfRow('SK-11')
const OPEN_CHOOSER = bare(cellOf(T_103, 'U-56', 0))
const CONFIRMATION = bare(cellOf(T_103, 'U-55', 0))
const PROCEED_ANSWER = 'proceed'

const HERE_ROW = 'aaaaaaaa-0000-4000-8000-00000000000a'
const THERE_ROW = 'bbbbbbbb-0000-4000-8000-00000000000b'
const THERE_UID = 11

const oneRowDocument = (title: string, rowId: string, uid: number): Document => {
  const draft = rowDocument([{ id: rowId, parentId: null }])
  draft.schedule.project.title = title
  draft.schedule.tasks[0].uid = uid
  draft.schedule.tasks[0].wbsOrder = uid
  draft.schedule.tasks[0].name = `Task ${uid}`
  draft.schedule.taskGroupMembers[0].taskUid = uid
  // WHY: with a row id held in scrollGroupId on either side, IC-72 landed no
  // task in this build; that is not the seam under test, so neither holds one.
  draft.documentSettings.scrollGroupId = null
  return draft as unknown as Document
}

const here = (): Document => oneRowDocument('Here', HERE_ROW, 1)

const there = (): Document => oneRowDocument('There', THERE_ROW, THERE_UID)

const titleOf = (document: Document): unknown =>
  (document as unknown as { schedule: { project: { title: unknown } } }).schedule.project.title

const UTF8 = new TextEncoder()
const jsonBytes = (document: Document): Uint8Array => UTF8.encode(JSON.stringify(document))

const bufferOf = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

interface StandInFile {
  readonly name: string
  readonly handle: FileHandle
  bytes(): Uint8Array
}

type WriteLog = string[]

const standInFile = (name: string, initial: Uint8Array, log: WriteLog): StandInFile => {
  let content = initial
  const readable = (): ReadableFile => {
    const at = content
    return { name, size: at.byteLength, arrayBuffer: () => Promise.resolve(bufferOf(at)) }
  }
  const handle: FileHandle = {
    kind: 'file',
    name,
    getFile: () => Promise.resolve(readable()),
    createWritable: (): Promise<WritableFileStream> => {
      const chunks: Uint8Array[] = []
      return Promise.resolve({
        write: (data: BufferSource) => {
          chunks.push(
            data instanceof ArrayBuffer
              ? new Uint8Array(data)
              : new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
          )
          return Promise.resolve()
        },
        close: () => {
          const all = new Uint8Array(chunks.reduce((sum, one) => sum + one.byteLength, 0))
          let at = 0
          for (const one of chunks) {
            all.set(one, at)
            at += one.byteLength
          }
          content = all
          log.push(name)
          return Promise.resolve()
        },
        abort: () => Promise.resolve(),
      })
    },
    queryPermission: () => Promise.resolve('granted' as const),
    requestPermission: () => Promise.resolve('granted' as const),
  }
  return { name, handle, bytes: () => content }
}

interface StandInBrowser {
  readonly environment: FileSystemAccessEnvironment
  readonly toOpen: StandInFile[]
  readonly toSave: StandInFile[]
  saveQuestions(): number
  drop(file: StandInFile): void
}

const standInBrowser = (): StandInBrowser => {
  const toOpen: StandInFile[] = []
  const toSave: StandInFile[] = []
  const listeners: ((event: DropEvent) => void)[] = []
  let saveQuestions = 0
  const environment: FileSystemAccessEnvironment = {
    openFilePicker: () => {
      const next = toOpen.shift()
      if (next === undefined) return Promise.reject(new DOMException('aborted', 'AbortError'))
      return Promise.resolve([next.handle])
    },
    saveFilePicker: () => {
      saveQuestions += 1
      const next = toSave.shift()
      if (next === undefined) return Promise.reject(new DOMException('aborted', 'AbortError'))
      return Promise.resolve(next.handle)
    },
    dropSurface: {
      addEventListener: (type, listener) => {
        if (type === 'drop') listeners.push(listener)
      },
    },
  }
  return {
    environment,
    toOpen,
    toSave,
    saveQuestions: () => saveQuestions,
    drop: (file) => {
      const item: DroppedItem = {
        kind: 'file',
        getAsFile: () => ({
          name: file.name,
          size: file.bytes().byteLength,
          arrayBuffer: () => Promise.resolve(bufferOf(file.bytes())),
        }),
        getAsFileSystemHandle: () => Promise.resolve(file.handle),
      }
      const event: DropEvent = {
        preventDefault: () => undefined,
        dataTransfer: { types: ['Files'], items: [item] },
      }
      for (const listener of listeners) listener(event)
    },
  }
}

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame

afterEach(() => {
  const scope = globalThis as { requestAnimationFrame?: unknown }
  if (realRaf === undefined) delete scope.requestAnimationFrame
  else scope.requestAnimationFrame = realRaf
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Stage {
  readonly loop: FrameLoop
  readonly browser: StandInBrowser
  readonly written: WriteLog
  file(name: string, bytes: Uint8Array): StandInFile
  open(file: StandInFile): Promise<void>
  drop(file: StandInFile): Promise<void>
  take(surface: string, entry: string): Promise<void>
  replace(): Promise<void>
  save(): Promise<void>
  last(): ScreenView
}

async function stage(): Promise<Stage> {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (
    callback: (time: number) => void,
  ): number => {
    waiting.push(callback)
    return waiting.length
  }
  const frames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  } as ScreenSurface
  const written: WriteLog = []
  const browser = standInBrowser()
  const store = fileSystemAccessFileStore(browser.environment)
  const loop = frameLoop({ showSvg: () => undefined }, here(), SCREEN, { surface, language: 'ja' }, store)
  const turn = async (): Promise<void> => {
    frames()
    await settle()
    frames()
    await settle()
    frames()
  }
  const last = (): ScreenView => {
    const view = views[views.length - 1]
    if (view === undefined) throw new Error('the surface was given no description')
    return view
  }
  const press = async (surfaceName: string, entry: string | null, answer?: string): Promise<void> => {
    part = {
      part: surfaceName,
      entry,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      ...(answer === undefined ? {} : { confirmationAnswer: answer }),
    } as unknown as ScreenPart
    loop.receiveInput(pointerOf('down', 500, 300))
    frames()
    loop.receiveInput(pointerOf('up', 500, 300))
    frames()
    part = null
    await turn()
  }
  await turn()
  return {
    loop,
    browser,
    written,
    file: (name, bytes) => standInFile(name, bytes, written),
    open: async (file) => {
      browser.toOpen.push(file)
      loop.receiveInput(SK_10)
      await turn()
    },
    drop: async (file) => {
      browser.drop(file)
      loop.fileDropped()
      await turn()
    },
    take: (surfaceName, entry) => press(surfaceName, entry),
    replace: async () => {
      await press(OPEN_CHOOSER, 'IC-71')
      const question = last().confirmation
      if (question === null) return
      expect(question.question, 'T-290: a replace raises QN-5 and nothing else').toBe('QN-5')
      await press(CONFIRMATION, null, PROCEED_ANSWER)
      expect(last().confirmation, 'the QN-5 answer did not take the question down').toBeNull()
    },
    save: async () => {
      loop.receiveInput(SK_11)
      await turn()
    },
    last,
  }
}

async function stageWithTarget(): Promise<{ built: Stage; mine: StandInFile }> {
  const built = await stage()
  const mine = built.file('mine.json', new Uint8Array(0))
  built.browser.toSave.push(mine)
  await built.save()
  expect(built.written, 'precondition: the first SK-11 did not write the chosen file').toEqual([
    'mine.json',
  ])
  expect(built.browser.saveQuestions(), 'precondition: the first SK-11 did not ask').toBe(1)
  await built.save()
  expect(built.written, 'precondition: SK-11 did not write over the chosen file').toEqual([
    'mine.json',
    'mine.json',
  ])
  expect(built.browser.saveQuestions()).toBe(1)
  built.written.length = 0
  return { built, mine }
}

async function openIntoChooser(built: Stage, file: StandInFile): Promise<void> {
  await built.open(file)
  expect(built.last().openModal, 'U-56 was not raised by SK-10 (OP-3 asks first)').not.toBeNull()
}

describe('FR-060 / T-290 / FR-096 / OP-5 -- the manuscript still says it', () => {
  it.each([
    ['FR-060, the MUST CR-594 added', KEEP_THE_TARGET_MUST],
    ['FR-060, only a replace makes the read file the target', ONLY_A_REPLACE],
    ['FR-060, the first save chooses a file', FIRST_SAVE_CHOOSES],
    ['FR-096, an MSPDI open has no target', MSPDI_HAS_NO_TARGET],
    ['OP-5, the check stands before OP-3', CHECK_BEFORE_OP_3],
    ['OP-2, one entrance for the chooser and the drop', ONE_ENTRANCE],
  ])('01-04 still says it: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-290 still says a merge or overlay makes a document no file holds', () => {
    expect(STATE_MACHINES).toContain(MERGE_MAKES_NO_FILE)
    expect(STATE_MACHINES).toContain(REPLACE_IS_THE_FILE)
  })

  it('table T-109 still gives U-56 its three answers and IC-52 still closes it', () => {
    for (const id of ['IC-71', 'IC-72', 'IC-73', 'IC-52']) {
      expect(cellOf(T_109, id, 0), `table T-109 ${id} is no longer on ${OPEN_CHOOSER}`).toContain(
        OPEN_CHOOSER,
      )
    }
  })
})

describe('FR-060 -- a replace (IC-71) makes the read file the target', () => {
  it('⭐ after IC-71, SK-11 writes over the chosen file and asks nothing', async () => {
    const { built } = await stageWithTarget()
    const theirs = built.file('theirs.json', jsonBytes(there()))
    await openIntoChooser(built, theirs)
    await built.replace()
    expect(built.last().openModal, 'IC-71 did not close U-56').toBeNull()
    expect(titleOf(built.loop.document()), 'IC-71 did not replace the document').toBe('There')

    await built.save()
    expect(built.written, `FR-060: ${REPLACE_IS_THE_FILE} (T-290), ${ONLY_A_REPLACE}`).toEqual([
      'theirs.json',
    ])
    expect(built.browser.saveQuestions(), 'FR-060 / DI-5: the overwrite asked').toBe(1)
  })
})

describe(`FR-060 (MUST) -- ${KEEP_THE_TARGET_MUST}`, () => {
  it('⛔ after a merge (IC-72), SK-11 writes the previous target, never the file read', async () => {
    const { built } = await stageWithTarget()
    const theirs = built.file('theirs.json', jsonBytes(there()))
    await openIntoChooser(built, theirs)
    await built.take(OPEN_CHOOSER, 'IC-72')
    expect(built.last().openModal, 'IC-72 did not land (a surface still stands)').toBeNull()
    expect(built.loop.hasUnsavedEdits(), `T-290: ${MERGE_MAKES_NO_FILE}`).toBe(true)

    await built.save()
    expect(built.written, `FR-060: ${KEEP_THE_TARGET_MUST}`).toEqual(['mine.json'])
    expect(built.browser.saveQuestions()).toBe(1)
  })

  it('⛔ after an overlay (IC-73), SK-11 writes the previous target, never the file read', async () => {
    const { built } = await stageWithTarget()
    const theirs = built.file('theirs.json', jsonBytes(here()))
    await openIntoChooser(built, theirs)
    await built.take(OPEN_CHOOSER, 'IC-73')
    expect(built.last().openModal, 'IC-73 did not land (a surface still stands)').toBeNull()
    expect(built.loop.hasUnsavedEdits(), `T-290: ${MERGE_MAKES_NO_FILE}`).toBe(true)

    await built.save()
    expect(built.written, `FR-060: ${KEEP_THE_TARGET_MUST}`).toEqual(['mine.json'])
    expect(built.browser.saveQuestions()).toBe(1)
  })

  it('⛔ after U-56 is closed (IC-52), SK-11 writes the previous target', async () => {
    const { built } = await stageWithTarget()
    const theirs = built.file('theirs.json', jsonBytes(there()))
    await openIntoChooser(built, theirs)
    await built.take(OPEN_CHOOSER, 'IC-52')
    expect(built.last().openModal, 'IC-52 did not close U-56').toBeNull()

    await built.save()
    expect(built.written, `FR-060: ${ONLY_A_REPLACE} -- closing is not a replace`).toEqual([
      'mine.json',
    ])
    expect(built.browser.saveQuestions()).toBe(1)
  })

  it('⛔ after a DROP that merges, SK-11 writes the previous target', async () => {
    const { built } = await stageWithTarget()
    const theirs = built.file('theirs.json', jsonBytes(there()))
    await built.drop(theirs)
    expect(built.last().openModal, `OP-2: ${ONE_ENTRANCE} -- the drop raised no U-56`).not.toBeNull()
    await built.take(OPEN_CHOOSER, 'IC-72')
    expect(built.last().openModal).toBeNull()
    expect(built.loop.hasUnsavedEdits(), `T-290: ${MERGE_MAKES_NO_FILE}`).toBe(true)

    await built.save()
    expect(built.written, `FR-060: ${KEEP_THE_TARGET_MUST} (the drop route, OP-2)`).toEqual([
      'mine.json',
    ])
    expect(built.browser.saveQuestions()).toBe(1)
  })

  it('⛔ after a file refused before U-56 (OP-5), SK-11 writes the previous target', async () => {
    const { built } = await stageWithTarget()
    const broken = built.file('broken.json', UTF8.encode('{ "this is": "not a GRS document" }'))
    await built.open(broken)
    expect(built.last().openModal, `OP-5: ${CHECK_BEFORE_OP_3} -- U-56 stood for a refused file`).toBeNull()

    await built.save()
    expect(built.written, `FR-060: ${ONLY_A_REPLACE} -- a refused read is no replace`).toEqual([
      'mine.json',
    ])
    expect(built.browser.saveQuestions()).toBe(1)
    expect(new TextDecoder().decode(broken.bytes())).toContain('not a GRS document')
  })

  it('⛔ after a merge with NO previous target, SK-11 asks for a file and leaves the read one alone', async () => {
    const built = await stage()
    const theirs = built.file('theirs.json', jsonBytes(there()))
    const fresh = built.file('fresh.json', new Uint8Array(0))
    await openIntoChooser(built, theirs)
    await built.take(OPEN_CHOOSER, 'IC-72')
    expect(built.last().openModal).toBeNull()
    expect(built.loop.hasUnsavedEdits(), `T-290: ${MERGE_MAKES_NO_FILE}`).toBe(true)

    built.browser.toSave.push(fresh)
    await built.save()
    expect(built.browser.saveQuestions(), `FR-060: ${FIRST_SAVE_CHOOSES}`).toBe(1)
    expect(built.written, `FR-060: ${KEEP_THE_TARGET_MUST} -- "none" stays none`).toEqual([
      'fresh.json',
    ])
  })
})

describe(`FR-096 -- ${MSPDI_HAS_NO_TARGET}`, () => {
  it('⛔ after IC-71 on an MSPDI file, SK-11 asks for a file and never writes the .xml', async () => {
    const { built } = await stageWithTarget()
    const xml = mspdiFromDocument(there()).text
    const theirs = built.file('theirs.xml', UTF8.encode(xml))
    const fresh = built.file('fresh.json', new Uint8Array(0))
    await openIntoChooser(built, theirs)
    await built.replace()
    expect(built.last().openModal, 'IC-71 did not close U-56').toBeNull()
    expect(titleOf(built.loop.document()), 'IC-71 did not replace the document').toBe('There')

    built.browser.toSave.push(fresh)
    await built.save()
    expect(built.written, `FR-096: ${MSPDI_HAS_NO_TARGET}`).not.toContain('theirs.xml')
    expect(built.browser.saveQuestions(), `FR-096: ${MSPDI_HAS_NO_TARGET} -- so it asks`).toBe(2)
    expect(built.written).toEqual(['fresh.json'])
  })

  it('⛔ after a merge of an MSPDI file, SK-11 writes the previous target', async () => {
    const { built } = await stageWithTarget()
    const theirs = built.file('theirs.xml', UTF8.encode(mspdiFromDocument(there()).text))
    await openIntoChooser(built, theirs)
    await built.take(OPEN_CHOOSER, 'IC-72')
    expect(built.last().openModal).toBeNull()
    expect(built.loop.hasUnsavedEdits(), `T-290: ${MERGE_MAKES_NO_FILE}`).toBe(true)

    await built.save()
    expect(built.written, `FR-060: ${KEEP_THE_TARGET_MUST}`).toEqual(['mine.json'])
    expect(built.browser.saveQuestions()).toBe(1)
  })
})
