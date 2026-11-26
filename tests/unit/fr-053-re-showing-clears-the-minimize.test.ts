// Unit tests: showing the command palette again clears its minimize (UF-48).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  CommandPalette,
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

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake host patches browser globals and untyped JSON */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const ENTRANCE_COLUMN = '何の入口か'
const SURFACE_COLUMN = '面'

const PALETTE_SHOWN_SETTING = 'S-99e'
const PALETTE_MINIMIZED_SETTING = 'S-200'

const SHOW_HIDE = ((): { readonly row: string; readonly surface: string } => {
  const found = specTable('T-109').rows.filter((row) =>
    (row.by[ENTRANCE_COLUMN] ?? '').includes(PALETTE_SHOWN_SETTING),
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 names ${PALETTE_SHOWN_SETTING} in ${found.length} rows`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

const MINIMIZE = ((): { readonly row: string; readonly surface: string } => {
  const found = specTable('T-109').rows.filter((row) =>
    (row.by[ENTRANCE_COLUMN] ?? '').includes(PALETTE_MINIMIZED_SETTING),
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 names ${PALETTE_MINIMIZED_SETTING} in ${found.length} rows`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

// Spec: T-036, SK-14
const PALETTE_KEY = ((): string => {
  const cell = bare(rowOf('T-036', 'SK-14').by['割当'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error('table T-036 SK-14 states no assignment')
  return first
})()

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))
// Spec: IMPS-1843
const FR_053_RE_SHOWING_CLEARS_IT =
  '`S-99e` が非表示から表示へ変わったとき、`GRS` は `S-200` を最小化していない側へ戻すこと。'

const TEMPLATE = JSON.parse(
  readFileSync(
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

// Summary: the host runs the queued animation frames when asked and decides nothing about the palette.
function host(): { readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS },
})

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
  send(input: HumanInput): void
  // Summary: palette() returns the palette of the last frame, or null while S-99e hides it.
  palette(): CommandPalette | null
  // Spec: T-109, CS-2
  press(surface: string, entry: string): void
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    send,
    palette: () => screen.last().commandPalette,
    press: (surface, entry) => {
      screen.drawAt({
        part: surface,
        entry: entry as any,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      screen.drawAt(null)
    },
  }
}

function isMinimized(built: Stage): boolean {
  const drawn = built.palette()
  if (drawn === null) throw new Error('the palette is hidden, so it says nothing about S-200')
  return drawn.isMinimized
}

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    expect(SHOW_HIDE.surface).toBe('App Header')
    expect(MINIMIZE.surface).toBe('Command Palette')
    expect(SHOW_HIDE.row).not.toBe(MINIMIZE.row)
    expect(PALETTE_KEY.length).toBeGreaterThan(0)
  })

  it('⛔ FR-053 still says that re-showing clears the minimize', () => {
    // Spec: FR-053
    expect(REQUIREMENTS).toContain(FR_053_RE_SHOWING_CLEARS_IT)
  })
})

describe('FR-053 (MUST): S-99e going from hidden to shown clears S-200', () => {
  it('⭐ the palette starts shown and not minimized, as table T-206 states', () => {
    // Spec: T-206
    const built = stage()
    expect(built.palette()).not.toBeNull()
    expect(isMinimized(built)).toBe(false)
  })

  it('⭐ the minimize entrance still minimizes, and nothing else undoes it', () => {
    // Spec: IC-75
    // Why: the control case; without it a unit that never minimized would pass the cases below.
    const built = stage()
    built.press(MINIMIZE.surface, MINIMIZE.row)
    expect(isMinimized(built)).toBe(true)
    built.send(pointer('down', 700, 400))
    built.send(pointer('up', 700, 400))
    expect(isMinimized(built), 'S-200 stands until something moves it').toBe(true)
  })

  it('⭐ showing it again from the header brings it back at its standard size', () => {
    // Spec: FR-053, IC-7
    const built = stage()
    built.press(MINIMIZE.surface, MINIMIZE.row)
    expect(isMinimized(built)).toBe(true)
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    expect(built.palette(), 'the palette is hidden now').toBeNull()
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    expect(built.palette(), 'and shown again').not.toBeNull()
    expect(isMinimized(built)).toBe(false)
  })

  it('⭐ the key SK-14 assigns brings it back the same way', () => {
    // Spec: FR-053, SK-14
    // Why: FR-053 is written about S-99e and not about one entrance, so a clearing hung on the
    // header press rather than on the change of state fails here.
    const built = stage()
    built.press(MINIMIZE.surface, MINIMIZE.row)
    built.send(key(PALETTE_KEY))
    expect(built.palette(), 'the palette is hidden now').toBeNull()
    built.send(key(PALETTE_KEY))
    expect(isMinimized(built)).toBe(false)
  })

  it('⛔ the entries come back with it, so the palette is whole again', () => {
    // Why: the standard size is what the person sees, so the case checks that the entries return,
    // not only that S-200 was cleared.
    const built = stage()
    const whole = built.palette()?.groups.length ?? 0
    expect(whole, 'the palette offers entrances at all').toBeGreaterThan(0)
    built.press(MINIMIZE.surface, MINIMIZE.row)
    expect(built.palette()?.groups.length, 'minimized withdraws them').toBe(0)
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    expect(built.palette()?.groups.length).toBe(whole)
  })
})
