// WP-P1 bench: the real shell with the file store stood in and the watermark answer given, pressed from outside.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { KeyInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { CommandItem, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { fileSystemAccessFileStore } from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { pointerOf, SCREEN } from '../unit/cr-541-stage'
import {
  here,
  jsonBytes,
  keyOfRow,
  partName,
  settle,
  standInBrowser,
  standInFile,
  surfaceOfEntrance,
  there,
  type StandInBrowser,
  type StandInFile,
} from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

export { jsonBytes, keyOfRow, partName, surfaceOfEntrance, there }

const EMPTY_DOCUMENT_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'empty-document.json'),
  'utf8',
)

// see S-100, T-207
const unlockPassword = (): string => {
  const row = specTable('T-207').rows.find((one) => one.id === 'S-100')
  return (row?.by['値'] ?? '').replace(/[`*]/g, '').trim()
}

export interface PaletteStage {
  readonly loop: FrameLoop
  readonly browser: StandInBrowser
  file(name: string, bytes: Uint8Array): StandInFile
  open(file: StandInFile): Promise<void>
  press(surface: string, entry: string | null, extra?: Record<string, unknown>): Promise<void>
  key(input: KeyInput): Promise<void>
  hideWatermark(): Promise<void>
  last(): ScreenView
  item(icon: string): CommandItem
  surfaceName(): string | null
}

export interface PaletteStageOptions {
  readonly document?: Document
}

export async function paletteStage(options: PaletteStageOptions = {}): Promise<PaletteStage> {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (callback: (time: number) => void): number => {
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
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  const written: string[] = []
  const browser = standInBrowser()
  const emptied = documentFromJson(EMPTY_DOCUMENT_TEXT)
  if (!emptied.ok) throw new Error('the bundled empty document is not GRS JSON')
  const loop = frameLoop(
    { showSvg: () => undefined } as never,
    options.document ?? here(),
    SCREEN,
    { surface, language: 'ja', readWatermarkUnlockAnswer: unlockPassword },
    fileSystemAccessFileStore(browser.environment),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    emptied.document,
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
      rowGroupId: null,
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
  return {
    loop,
    browser,
    file: (name, bytes) => standInFile(name, bytes, written),
    open: async (file) => {
      browser.toOpen.push(file)
      loop.receiveInput(keyOfRow('SK-10'))
      await turn()
    },
    press,
    key: async (input) => {
      loop.receiveInput(input)
      await turn()
    },
    hideWatermark: async () => {
      await press(surfaceOfEntrance('IC-41'), 'IC-41')
      await press(partName('U-60'), null, { confirmationAnswer: 'proceed' })
    },
    last,
    item: (icon) => {
      const found = (last().commandPalette?.groups ?? []).flatMap((group) => group.commands).filter((one) => one.icon === icon)
      if (found.length !== 1) throw new Error(`the palette carries ${found.length} items for ${icon}`)
      return found[0] as CommandItem
    },
    surfaceName: () => (last().openModal as { surface?: string } | null)?.surface ?? null,
  }
}
