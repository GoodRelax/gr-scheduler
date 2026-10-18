// CR-772 spec-only shell stage: one frame loop over a long list of task groups, a pointer that grabs the strip, and the scroll the carry holds.

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from './spec-table'
import { taskGroupDocument } from '../unit/cr-541-stage'

export const SCREEN: FrameEnvironment = { width: 1200, height: 800, appHeaderHeight: 0, scrollbarThickness: 0 }
export const COUNT = 40

export const idOf = (index: number): string => `g${String(index).padStart(2, '0')}`

export const longDocument = (): Document =>
  taskGroupDocument(Array.from({ length: COUNT }, (_one, at) => ({ id: idOf(at), parentId: null }))) as unknown as Document

const U_22_PART = bare(specTable('T-103').rows.find((one) => one.id === 'U-22')?.by['確定名（英）'] ?? '')
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const stripOf = (taskGroupId: string): ScreenPart =>
  ({
    part: U_22_PART,
    entry: null,
    format: null,
    taskGroupId,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    isTaskGroupGrabStrip: true,
  }) as unknown as ScreenPart

export interface Shell {
  readonly loop: FrameLoop
  views(): readonly ScreenView[]
  lastView(): ScreenView
  stripPoint(taskGroupId: string): { readonly x: number; readonly y: number }
  area(): { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  press(taskGroupId: string): { readonly x: number; readonly y: number }
  move(x: number, y: number): void
  release(x: number, y: number): void
  send(input: HumanInput): void
}

export function shell(document: Document = longDocument(), language: 'ja' | 'en' = 'ja'): Shell {
  const waiting: ((time: number) => void)[] = []
  globalThis.requestAnimationFrame = (callback) => waiting.push(callback)
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let drawn: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => void views.push(view),
    readFieldCommit: () => null,
    readScreenPartAt: () => drawn,
  } as unknown as ScreenSurface
  const loop = frameLoop(
    { showSvg: () => undefined, showMarqueeOverlaySvg: () => undefined } as never,
    document,
    SCREEN,
    { surface, language } as unknown as ScreenWiring,
  )
  runFrames()
  const frame = () => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    return values
  }
  const stripPoint = (taskGroupId: string): { x: number; y: number } => {
    const band = (frame().layout as unknown as { taskGroups: { taskGroupId: string; y: number; height: number }[] }).taskGroups.find(
      (one) => one.taskGroupId === taskGroupId,
    )
    if (band === undefined) throw new Error(`the frame drew no band for ${taskGroupId}`)
    return { x: frame().regions.taskGroupPanel.x + 1, y: band.y + band.height / 2 }
  }
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    runFrames()
  }
  return {
    loop,
    views: () => views,
    lastView: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    stripPoint,
    area: () => frame().regions.taskGroupArea,
    press: (taskGroupId) => {
      const at = stripPoint(taskGroupId)
      drawn = stripOf(taskGroupId)
      send(pointer('down', at.x, at.y))
      drawn = null
      return at
    },
    move: (x, y) => send(pointer('move', x, y)),
    release: (x, y) => send(pointer('up', x, y)),
    send,
  }
}

export const key = (name: string, modifiers: Partial<InputModifiers> = {}): HumanInput => ({
  kind: 'key',
  key: name,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

export const wheel = (x: number, y: number, scrollY: number): HumanInput => ({
  kind: 'wheel',
  x,
  y,
  modifiers: NO_MODIFIERS,
  notches: Math.sign(scrollY),
  scrollPx: { x: 0, y: scrollY },
})
