// Unit tests: one entrance, IC-41, turns the watermark both ways.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
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
import { bare, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fakes cast host and screen parts loosely */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const SURFACE_COLUMN = '面'
const VALUE_COLUMN = '値'

const WATERMARK_ENTRY = ((): { readonly row: string; readonly surface: string } => {
  const row = rowOf('T-109', 'IC-41')
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

const U_60 = bare(rowOf('T-103', 'U-60').cells[0] ?? '')

const DEFAULT_PASSWORD = bare(rowOf('T-207', 'S-100').by[VALUE_COLUMN] ?? '')

const PROCEED = 'proceed'

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))
const FR_020_ONE_ENTRANCE_BOTH_WAYS =
  '同じ入口（表 T-109 の `IC-41`）が両方向を担うこと（MUST）'
const FR_020_THE_WAY_BACK_IS_NOT_ASKED = '透かしを出し直す側は問わないこと（MUST）'
const FR_020_NOT_IN_THE_DOCUMENT =
  '`watermarkVisible` を文書に保存してはならない（MUST NOT）'

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

function emptyDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Why: node has no requestAnimationFrame, so the host is faked; nothing in
// the fake decides anything about the watermark.
function host(): {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
  frameAsked(): Promise<void>
} {
  const waiting: ((time: number) => void)[] = []
  const askedListeners: (() => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    for (const heard of askedListeners.splice(0, askedListeners.length)) heard()
    return ++handle
  }
  return {
    frameAsked: () =>
      waiting.length > 0 ? Promise.resolve() : new Promise<void>((done) => void askedListeners.push(done)),
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  view(): ScreenView
  surface(): string | null
  pressEntry(surface: string, entry: string): void
  // Why: awaited, unlike the entry presses, because the SHA-256 match answers
  // asynchronously and the outcome lands in a later frame.
  answer(which: string): Promise<void>
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  const wiring: ScreenWiring = {
    surface,
    language,
    readWatermarkUnlockAnswer: () => DEFAULT_PASSWORD,
  }
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const drawn = (at: ScreenPart | null): void => {
    part = at
  }
  pen.runAnimationFrames()
  const last = (): ScreenView => {
    const view = views[views.length - 1]
    if (view === undefined) throw new Error('the surface was given no description')
    return view
  }
  return {
    loop,
    view: last,
    surface: () => last().openModal?.surface ?? null,
    pressEntry: (on, entry) => {
      drawn({
        part: on,
        entry: entry as any,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      drawn(null)
    },
    answer: async (which) => {
      drawn({
        part: U_60,
        entry: null,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        confirmationAnswer: which,
      } as any)
      send(pointer('down', 700, 400))
      send(pointer('up', 700, 400))
      drawn(null)
      // Why: the match ends by asking for a frame (UF-166); a fixed count of turns loses to a loaded digest worker (DFC-2417).
      await pen.frameAsked()
      pen.runAnimationFrames()
    },
  }
}

// Spec: FR-020, IC-41, U-60, S-100
describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-020 still gives one entrance both directions, ungated on the way back', () => {
    expect(REQUIREMENTS).toContain(FR_020_ONE_ENTRANCE_BOTH_WAYS)
    expect(REQUIREMENTS).toContain(FR_020_THE_WAY_BACK_IS_NOT_ASKED)
  })

  it('⛔ FR-020 still keeps `watermarkVisible` out of the document', () => {
    expect(REQUIREMENTS).toContain(FR_020_NOT_IN_THE_DOCUMENT)
  })

  it('⭐ IC-41 is on the palette, and U-60 and S-100 are still what they were', () => {
    expect(WATERMARK_ENTRY.surface).toBe('Command Palette')
    expect(U_60).toBe('Watermark Unlock')
    expect(DEFAULT_PASSWORD.length).toBeGreaterThan(0)
  })
})

// Spec: FR-020, FR-029, UF-48, IC-41, NT-7, U-60, S-144
describe('FR-020 (MUST): one entrance, and it turns the watermark both ways', () => {
  it('⭐ showing: the press raises U-60 and asks', async () => {
    // Why: the control; without it a unit that never raised the surface would
    // pass every case below.
    const built = stage()
    expect(built.surface()).toBeNull()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(built.surface()).toBe(U_60)
  })

  it('⛔ hidden: the press puts it back and does NOT ask', async () => {
    const built = stage()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    await built.answer(PROCEED)
    expect(built.surface(), 'the answered surface is gone').toBeNull()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(built.surface(), 'the way back is never asked').toBeNull()
  })

  it('⛔ and it is not a symmetric toggle: the NEXT press asks again', async () => {
    const built = stage()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    await built.answer(PROCEED)
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(built.surface()).toBe(U_60)
  })

  // Spec: WM-11
  it('⛔⛔ neither direction touches the document (MUST NOT)', async () => {
    // Why: hasUnsavedEdits is a second reading, not a repeat: a write that was
    // undone leaves the document equal but the flag raised.
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    await built.answer(PROCEED)
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})
