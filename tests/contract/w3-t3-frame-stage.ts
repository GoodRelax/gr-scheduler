// W3 tester 3: one frame loop with the file, clipboard, raster and field roads stood in for, pressed from outside.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Clipboard, ClipboardContent, ClipboardWriting } from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { ChosenFileWrite, FileReading, FileStore } from '../../src/adapter/file-gateway/file-store'
import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  FieldCommit,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from './spec-table'

type Raf = (callback: (time: number) => void) => number
const globalRaf = globalThis as unknown as { requestAnimationFrame?: Raf }
const REAL_RAF = globalRaf.requestAnimationFrame

export function restoreAnimationFrames(): void {
  if (REAL_RAF === undefined) delete globalRaf.requestAnimationFrame
  else globalRaf.requestAnimationFrame = REAL_RAF
}

export const SMALL_SCREEN: FrameEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
export const LARGE_SCREEN: FrameEnvironment = { width: 1500, height: 950, appHeaderHeight: 56, scrollbarThickness: 8 }

// see T-109
export const surfaceOfEntry = (entry: string): string =>
  bare(specTable('T-109').rows.find((one) => one.id === entry)?.by['面'] ?? '')

// see T-103
export const EXPORT_CHOOSER = bare(specTable('T-103').rows.find((one) => one.id === 'U-54')?.by['確定名（英）'] ?? '')

const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

export function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

// WHY: CR-690 -- a span reaches the picture only while it is fixed (FX-1, S-532), so a span set here is fixed too.
export const withSpan = (document: Document, start: string | null, finish: string | null): Document => ({
  ...document,
  documentSettings: { ...document.documentSettings, fitSpanStart: start, fitSpanFinish: finish, fitSpanFixed: start !== null },
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number, clickCount = 1): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount,
})

const partOf = (part: string, entry: string | null, format: string | null, rowGroupId: string | null = null): ScreenPart =>
  ({
    part,
    entry,
    format,
    rowGroupId,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as unknown as ScreenPart

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

export interface ExportStage {
  readonly loop: FrameLoop
  readonly written: ChosenFileWrite[]
  readonly clipped: ClipboardContent[]
  press(input: HumanInput): Promise<void>
  take(entry: string): Promise<void>
  takeFormat(format: string): Promise<void>
  pressRow(surface: string, entry: string | null, groupId: string): Promise<void>
  click(x: number, y: number, clickCount?: number): Promise<void>
  pointAt(x: number, y: number): Promise<void>
  dragDivider(panel: string, fromX: number, toX: number, y: number): Promise<void>
  pointer(phase: PointerPhase, x: number, y: number): void
  beginEditing(row: string): void
  commitNext(commit: FieldCommit): void
  lastView(): ScreenView
  writtenSvg(): string
}

export function exportStage(
  document: Document,
  screen: FrameEnvironment = SMALL_SCREEN,
  language: DisplayLanguage = 'ja',
): ExportStage {
  const waiting: ((time: number) => void)[] = []
  globalRaf.requestAnimationFrame = (callback) => {
    waiting.push(callback)
    return waiting.length
  }
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let drawnPart: ScreenPart | null = null
  const editNotices: { readonly kind: 'began'; readonly row: string }[] = []
  let nextCommit: FieldCommit | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => {
      const held = nextCommit
      nextCommit = null
      return held
    },
    readFieldEditNotices: () => editNotices.splice(0, editNotices.length),
    readScreenPartAt: () => drawnPart,
  } as unknown as ScreenSurface
  const written: ChosenFileWrite[] = []
  const store = {
    readFileToOpen: () => new Promise<FileReading>(() => undefined),
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({ ok: false, fault: { reason: 'noOpenedFile', what: 'never in a file' } }),
    writeChosenFile: async (write: ChosenFileWrite) => {
      written.push(write)
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  } as unknown as FileStore
  const clipped: ClipboardContent[] = []
  const clipboard: Clipboard = {
    writeClipboardContent: (content: ClipboardContent): Promise<ClipboardWriting> => {
      clipped.push(content)
      return Promise.resolve({ ok: true })
    },
  }
  const rasterizer = {
    rasterizePng: () => Promise.resolve({ ok: true as const, pngBytes: new Uint8Array([137, 80, 78, 71]) }),
  }
  const loop = frameLoop(
    { showSvg: () => undefined },
    document,
    screen,
    { surface, language } as unknown as ScreenWiring,
    store,
    undefined,
    clipboard,
    undefined,
    rasterizer,
  )
  runFrames()
  const press = async (input: HumanInput): Promise<void> => {
    loop.receiveInput(input)
    runFrames()
    await settle()
    runFrames()
  }
  const pressAt = async (part: ScreenPart): Promise<void> => {
    drawnPart = part
    loop.receiveInput(pointer('down', 2, 2))
    loop.receiveInput(pointer('up', 2, 2))
    drawnPart = null
    runFrames()
    await settle()
    runFrames()
  }
  return {
    loop,
    written,
    clipped,
    press,
    take: (entry) => pressAt(partOf(surfaceOfEntry(entry), entry, null)),
    takeFormat: (format) => pressAt(partOf(EXPORT_CHOOSER, null, format)),
    pressRow: (surfaceName, entry, groupId) => pressAt(partOf(surfaceName, entry, null, groupId)),
    click: async (x, y, clickCount = 1) => {
      for (let count = 1; count <= clickCount; count += 1) {
        loop.receiveInput(pointer('down', x, y, count))
        runFrames()
        loop.receiveInput(pointer('up', x, y, count))
        runFrames()
      }
      runFrames()
      await settle()
      runFrames()
    },
    pointAt: (x, y) => press(pointer('move', x, y)),
    pointer: (phase, x, y) => {
      loop.receiveInput(pointer(phase, x, y))
      runFrames()
    },
    dragDivider: async (panel, fromX, toX, y) => {
      drawnPart = { ...partOf('Panel Divider', null, null), dividerPanel: panel } as unknown as ScreenPart
      loop.receiveInput(pointer('down', fromX, y))
      runFrames()
      drawnPart = null
      loop.receiveInput(pointer('move', (fromX + toX) / 2, y))
      runFrames()
      loop.receiveInput(pointer('move', toX, y))
      runFrames()
      loop.receiveInput(pointer('up', toX, y))
      runFrames()
      await settle()
      runFrames()
    },
    beginEditing: (row) => {
      editNotices.push({ kind: 'began', row })
    },
    commitNext: (commit) => {
      nextCommit = commit
    },
    lastView: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    writtenSvg: () => {
      const last = written[written.length - 1]
      if (last === undefined) throw new Error('no file was written, so no export finished')
      return new TextDecoder().decode(last.bytes)
    },
  }
}
