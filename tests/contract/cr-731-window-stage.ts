// CR-731 spec-only window bench: the shell over the real DOM surface, the drawn picture kept, the focus seam recorded, a click aimed at an element

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach } from 'vitest'

import type { ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { HumanInput, KeyInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { fileSystemAccessFileStore } from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { FakeElement, byRole, descendants, stage, surfaceOf, wiringOf, type Stage } from '../fixtures/fake-browser'
import { pointerOf, SCREEN } from '../unit/cr-541-stage'
import { settle, standInBrowser, standInFile, type StandInBrowser, type StandInFile } from './cr-610-file-flow-stage'
import { bareAll, specTable } from './spec-table'

const EMPTY_DOCUMENT_TEXT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'empty-document.json'), 'utf8')

if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

const inputPrototype = FakeElement.prototype as unknown as { select?: () => void }
if (inputPrototype.select === undefined) inputPrototype.select = (): void => undefined

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const WINDOW_SURFACE = 'Delay Diagnostics Report'

function surfaceOf731(entry: string): string {
  const row = specTable('T-109').rows.find((one) => one.id === entry)
  if (row === undefined) throw new Error(`table T-109 has no row ${entry}`)
  const named = bareAll(row.cells[0] ?? '')
  return named.includes(WINDOW_SURFACE) ? WINDOW_SURFACE : (named[0] ?? '')
}

export interface WindowStage {
  readonly loop: FrameLoop
  readonly browser: StandInBrowser
  readonly written: string[]
  readonly asked: string[]
  readonly copied: ClipboardContent[]
  readonly built: Stage
  file(name: string, bytes: Uint8Array): StandInFile
  press(entry: string): Promise<void>
  clickOn(element: FakeElement): Promise<void>
  key(input: KeyInput): Promise<void>
  last(): ScreenView
  svg(): string
  window(): FakeElement | null
  inside(role: string): FakeElement | null
  need(role: string): FakeElement
  focusedRow(): string | null
}

export async function windowStage(document: Document): Promise<WindowStage> {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const frames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = stage({ 'App Header': SCREEN.appHeaderHeight })
  let held: ((row: string) => unknown) | null = null
  built.surface = domScreenSurface({
    ...wiringOf(built, { preference: 'light', hue: 214 }),
    holdFocusPropertyField: (focus) => {
      held = focus
    },
  })
  let aimed: FakeElement | null = null
  let fakePart: ScreenPart | null = null
  ;(built.host as unknown as { elementFromPoint: () => FakeElement | null }).elementFromPoint = () => aimed
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  const asked: string[] = []
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    readFieldEditNotices: () => (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: (x: number, y: number): ScreenPart | null => fakePart ?? drawn.readScreenPartAt(x, y),
  } as unknown as ScreenSurface
  let shown = ''
  const written: string[] = []
  const copied: ClipboardContent[] = []
  const browser = standInBrowser()
  const emptied = documentFromJson(EMPTY_DOCUMENT_TEXT)
  if (!emptied.ok) throw new Error('the bundled empty document is not GRS JSON')
  const loop = frameLoop(
    { showSvg: (svg: string) => void (shown = svg) } as never,
    document,
    SCREEN,
    {
      surface,
      language: 'ja',
      focusPropertyField: (row: string) => {
        asked.push(row)
        return held === null ? null : (held as (row: string) => unknown)(row)
      },
    },
    fileSystemAccessFileStore(browser.environment),
    undefined,
    {
      writeClipboardContent: async (content: ClipboardContent) => {
        copied.push(content)
        return { ok: true as const }
      },
    },
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
  await turn()
  const send = async (input: HumanInput): Promise<void> => {
    loop.receiveInput(input)
    frames()
  }
  return {
    loop,
    browser,
    written,
    asked,
    copied,
    built,
    file: (name, bytes) => standInFile(name, bytes, written),
    press: async (entry) => {
      aimed = null
      fakePart = {
        part: surfaceOf731(entry),
        entry,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart
      await send(pointerOf('down', 500, 300))
      await send(pointerOf('up', 500, 300))
      fakePart = null
      await turn()
    },
    clickOn: async (element) => {
      aimed = element
      await send(pointerOf('down', 500, 300))
      await send(pointerOf('up', 500, 300))
      aimed = null
      await turn()
    },
    key: async (input) => {
      await send(input as HumanInput)
      await turn()
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    svg: () => shown,
    window: () => byRole(built.root(), 'Delay Diagnostics Report')[0] ?? null,
    inside: (role) => {
      const window = byRole(built.root(), 'Delay Diagnostics Report')[0]
      return window === undefined ? null : (byRole(window, role)[0] ?? null)
    },
    need: (role) => {
      const window = byRole(built.root(), 'Delay Diagnostics Report')[0]
      const found = window === undefined ? undefined : byRole(window, role)[0]
      if (found === undefined) throw new Error(`the window draws nothing under data-role="${role}"`)
      return found
    },
    focusedRow: () => {
      for (let at: FakeElement | null = built.world.activeElement; at !== null; at = at.parentNode) {
        const row = at.getAttribute('data-field-row')
        if (row !== null) return row
      }
      return null
    },
  }
}

export function smallestWithText(root: FakeElement, text: string): FakeElement | null {
  const found = descendants(root).filter((one) => one.textContent.trim() === text)
  return found.reduce<FakeElement | null>((best, one) => (best === null || descendants(one).length <= descendants(best).length ? one : best), null)
}
