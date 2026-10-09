// CR-610 / CR-611 / CR-612 / CR-619: the shared bench the spec-only file-flow cases drive the shell through.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, expect } from 'vitest'

import type { Clipboard } from '../../src/adapter/clipboard-gateway/clipboard'
import { documentFromJson, jsonFromDocument, type AppShellSource } from '../../src/adapter/document-codec/document-codec'
import {
  EMBEDDED_DOCUMENT_ELEMENT_ID,
  STARTUP_TEMPLATE_ELEMENT_ID,
} from '../../src/framework/single-html-shell/document-file-flow'
import type { Rasterizer } from '../../src/adapter/image-exporter/rasterizer'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
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
import { surfaceOf, wire, type FakeElement, type Stage as DomStage } from '../fixtures/fake-browser'
import { pointerOf, taskGroupDocument, SCREEN } from '../unit/cr-541-stage'
import { bare, specTable, unbroken, type SpecTable } from './spec-table'

export const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)
export const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))
export const STATE_MACHINES_SOURCE = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as { readonly regions: readonly Record<string, any>[] }
export { SETTINGS_SOURCE, settingNumber, settingRow } from '../fixtures/setting-number'
export const SPEC_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as Record<string, any>
export const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)
// WHY: the shell hands the frame loop the bundled empty document for FR-095; the bench hands the same file.
const EMPTY_DOCUMENT_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'empty-document.json'),
  'utf8',
)

export function cellOf(table: SpecTable, id: string, at: number): string {
  const cell = table.rows.find((one) => one.id === id)?.cells[at]
  if (cell === undefined) throw new Error(`table ${table.id} has no cell ${at} in row ${id}`)
  return cell
}

// see T-036
export function keyOfRow(id: string): KeyInput {
  const parts = (cellOf(specTable('T-036'), id, 1).split('/')[0] ?? '')
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

// see T-103, W-4
export function partName(id: string): string {
  const row = specTable('T-103').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-103 has no row ${id}`)
  return bare(row.cells[0] ?? '')
}

// see T-109
export function surfaceOfEntrance(id: string): string {
  return bare(cellOf(specTable('T-109'), id, 0))
}

// see T-233, FR-038
export function reasonWords(rowId: string): { text: { ja: string; en: string } } {
  const found = (SPEC_WORDS['reasons'] as any[]).find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`display-words.json has no reason ${rowId}`)
  return found
}

export function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

// see FR-095, T-342
function shippedEmptyDocument(): Document {
  const read = documentFromJson(EMPTY_DOCUMENT_TEXT)
  if (!read.ok) throw new Error(`the bundled empty document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

// see IF-8, IO-7, FR-067
// WHY: stands in for the shell's own AppShellSource, so it names the containers the shell names.
export function shellAppSource(html: string): AppShellSource {
  return {
    readAppShell: async () => ({
      ok: true,
      appShell: {
        html,
        embeddedDocumentElementId: EMBEDDED_DOCUMENT_ELEMENT_ID,
        omittedElementIds: [STARTUP_TEMPLATE_ELEMENT_ID],
      },
    }),
  }
}

export function oneTaskGroupDocument(title: string, rowId: string, uid: number): Document {
  const draft = taskGroupDocument([{ id: rowId, parentId: null }])
  draft.schedule.project.title = title
  draft.schedule.tasks[0].uid = uid
  draft.schedule.tasks[0].wbsOrder = uid
  draft.schedule.tasks[0].name = `Task ${uid}`
  draft.schedule.taskGroupMembers[0].taskUid = uid
  draft.schedule.taskVisuals[0].taskUid = uid
  draft.documentSettings.scrollGroupId = null
  const read = documentFromJson(jsonFromDocument((draft) as never))
  if (!read.ok) throw new Error(`the bench document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

export const HERE_TASK_GROUP = 'aaaaaaaa-0000-4000-8000-00000000000a'
export const THERE_TASK_GROUP = 'bbbbbbbb-0000-4000-8000-00000000000b'
export const here = (): Document => oneTaskGroupDocument('Here', HERE_TASK_GROUP, 1)
export const there = (): Document => oneTaskGroupDocument('There', THERE_TASK_GROUP, 11)

export const UTF8 = new TextEncoder()
export const jsonBytes = (document: unknown): Uint8Array => UTF8.encode(jsonFromDocument(document as never))

const bufferOf = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

export interface StandInFile {
  readonly name: string
  readonly handle: FileHandle
  bytes(): Uint8Array
}

export type WriteLog = string[]

export function standInFile(name: string, initial: Uint8Array, log: WriteLog): StandInFile {
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

export interface StandInBrowser {
  readonly environment: FileSystemAccessEnvironment
  readonly toOpen: (StandInFile | 'closed')[]
  readonly toSave: (StandInFile | 'closed')[]
  readonly openOptions: Record<string, unknown>[]
  readonly saveOptions: Record<string, unknown>[]
  saveQuestions(): number
  drop(file: StandInFile, withHandle?: boolean): void
}

export function standInBrowser(): StandInBrowser {
  const toOpen: (StandInFile | 'closed')[] = []
  const toSave: (StandInFile | 'closed')[] = []
  const openOptions: Record<string, unknown>[] = []
  const saveOptions: Record<string, unknown>[] = []
  const listeners: ((event: DropEvent) => void)[] = []
  const aborted = (): Promise<never> => Promise.reject(new DOMException('aborted', 'AbortError'))
  const environment: FileSystemAccessEnvironment = {
    openFilePicker: (options) => {
      openOptions.push({ ...(options as unknown as Record<string, unknown>) })
      const next = toOpen.shift()
      if (next === undefined || next === 'closed') return aborted()
      return Promise.resolve([next.handle])
    },
    saveFilePicker: (options) => {
      saveOptions.push({ ...(options as unknown as Record<string, unknown>) })
      const next = toSave.shift()
      if (next === undefined || next === 'closed') return aborted()
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
    openOptions,
    saveOptions,
    saveQuestions: () => saveOptions.length,
    drop: (file, withHandle = true) => {
      const item: DroppedItem = {
        kind: 'file',
        getAsFile: () => ({
          name: file.name,
          size: file.bytes().byteLength,
          arrayBuffer: () => Promise.resolve(bufferOf(file.bytes())),
        }),
        getAsFileSystemHandle: () => Promise.resolve(withHandle ? file.handle : null),
      } as DroppedItem
      const event: DropEvent = {
        preventDefault: () => undefined,
        dataTransfer: { types: ['Files'], items: { length: 1, 0: item } },
      } as unknown as DropEvent
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

export async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

export const OPEN_CHOOSER = (): string => partName('U-56')
export const EXPORT_CHOOSER = (): string => partName('U-54')
export const CONFIRMATION = (): string => partName('U-55')

export interface ShellStage {
  readonly loop: FrameLoop
  readonly browser: StandInBrowser
  readonly written: WriteLog
  readonly dom: DomStage | null
  file(name: string, bytes: Uint8Array): StandInFile
  open(file: StandInFile | 'closed'): Promise<void>
  drop(file: StandInFile): Promise<void>
  press(surface: string, entry: string | null, extra?: Record<string, unknown>): Promise<void>
  exportAs(format: string, destination: StandInFile | 'closed'): Promise<void>
  answer(answer: 'proceed' | 'cancel'): Promise<void>
  key(input: KeyInput): Promise<void>
  save(): Promise<void>
  repaint(): Promise<void>
  last(): ScreenView
  domRoot(): FakeElement
}

export interface StageOptions {
  readonly document?: Document
  readonly dom?: boolean
  readonly appShell?: AppShellSource
  readonly clipboard?: Clipboard
  readonly rasterizer?: Rasterizer
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

export async function shellStage(options: StageOptions = {}): Promise<ShellStage> {
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
  const dom = options.dom === true ? wire(THEME, { 'App Header': 37 }) : null
  const drawn = dom === null ? null : surfaceOf(dom)
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
      drawn?.showScreenView(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  } as ScreenSurface
  const written: WriteLog = []
  const browser = standInBrowser()
  const store = fileSystemAccessFileStore(browser.environment)
  const loop = frameLoop(
    { showSvg: () => undefined } as any,
    options.document ?? here(),
    SCREEN,
    { surface, language: 'ja' },
    store,
    undefined,
    options.clipboard,
    undefined,
    options.rasterizer,
    options.appShell,
    shippedEmptyDocument(),
  )
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
  const press = async (surfaceName: string, entry: string | null, extra: Record<string, unknown> = {}): Promise<void> => {
    part = {
      part: surfaceName,
      entry,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      ...extra,
    } as unknown as ScreenPart
    loop.receiveInput(pointerOf('down', 500, 300))
    frames()
    loop.receiveInput(pointerOf('up', 500, 300))
    frames()
    part = null
    await turn()
  }
  await turn()
  const stage: ShellStage = {
    loop,
    browser,
    written,
    dom,
    file: (name, bytes) => standInFile(name, bytes, written),
    open: async (file) => {
      browser.toOpen.push(file)
      loop.receiveInput(keyOfRow('SK-10'))
      await turn()
    },
    drop: async (file) => {
      browser.drop(file)
      loop.fileDropped()
      await turn()
    },
    press,
    exportAs: async (format, destination) => {
      browser.toSave.push(destination)
      await press(surfaceOfEntrance('IC-2'), 'IC-2')
      expect(last().openModal, 'precondition: IC-2 did not raise U-54').not.toBeNull()
      await press(EXPORT_CHOOSER(), null, { format })
      await turn()
    },
    answer: async (answer) => {
      await press(CONFIRMATION(), null, { confirmationAnswer: answer })
    },
    key: async (input) => {
      loop.receiveInput(input as HumanInput)
      await turn()
    },
    save: async () => {
      loop.receiveInput(keyOfRow('SK-11'))
      await turn()
    },
    repaint: async () => {
      loop.receiveInput(pointerOf('move', 3, 3))
      await turn()
    },
    last,
    domRoot: () => {
      if (dom === null) throw new Error('this stage was built without the DOM surface')
      return dom.root()
    },
  }
  return stage
}

// see FR-060
export async function stageWithTarget(options: StageOptions = {}): Promise<{ built: ShellStage; mine: StandInFile }> {
  const built = await shellStage(options)
  const mine = built.file('mine.json', new Uint8Array(0))
  built.browser.toSave.push(mine)
  await built.save()
  expect(built.written, 'precondition: the first SK-11 did not write the chosen file').toEqual(['mine.json'])
  await built.save()
  expect(built.written, 'precondition: SK-11 did not write over the chosen file').toEqual([
    'mine.json',
    'mine.json',
  ])
  expect(built.browser.saveQuestions(), 'precondition: the overwrite asked').toBe(1)
  built.written.length = 0
  return { built, mine }
}

export async function closeImportReport(built: ShellStage): Promise<void> {
  if (built.last().openModal?.surface !== partName('U-62')) return
  await built.press(partName('U-62'), null, { isImportReportDismiss: true })
}

// see IC-72, T-290
export async function mergeSomething(built: ShellStage): Promise<void> {
  const theirs = built.file('theirs.json', jsonBytes(there()))
  await built.open(theirs)
  expect(built.last().openModal, 'precondition: SK-10 raised no U-56').not.toBeNull()
  await built.press(OPEN_CHOOSER(), 'IC-72')
  await closeImportReport(built)
  expect(built.last().openModal, 'precondition: IC-72 did not land').toBeNull()
  expect(built.loop.hasUnsavedEdits(), 'precondition: a merge left nothing unsaved').toBe(true)
  built.written.length = 0
}

// see IC-71, QN-5
export async function replaceWith(built: ShellStage, file: StandInFile): Promise<void> {
  await built.open(file)
  expect(built.last().openModal, `precondition: SK-10 raised no U-56 for ${file.name}`).not.toBeNull()
  await built.press(OPEN_CHOOSER(), 'IC-71')
  if (built.last().confirmation !== null) await built.answer('proceed')
  expect(built.last().openModal, 'precondition: IC-71 did not close U-56').toBeNull()
}

// see HS-3
export function sizeSpelling(bytes: number): string {
  return `${(Math.floor((bytes + 50) / 100) / 10).toFixed(1)}[kB]`
}

// see HS-2
export function stampSpelling(iso: string): string {
  const at = new Date(iso)
  const two = (one: number): string => String(one).padStart(2, '0')
  return (
    `${at.getFullYear()}/${two(at.getMonth() + 1)}/${two(at.getDate())} ` +
    `${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`
  )
}
