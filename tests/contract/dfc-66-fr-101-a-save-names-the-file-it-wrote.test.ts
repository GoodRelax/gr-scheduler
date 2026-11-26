// Contract tests: after a save, the header names the file written and the moment it was written.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
} from '../../src/adapter/file-gateway/file-gateway'
import type {
  InputModifiers,
  KeyInput,
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
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from './spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the cases read loop and view fields no public type names */

const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const THE_SHOW_MUST =
  '**いま開いているファイルの名前**と、**そのファイルへ最後に書いた時刻**を画面上に示すこと'

const THE_NEVER_SAVED_MUST = 'まだ 1 度もファイルへ書いていないとき、`GRS` は、時刻の代わりに、まだ書いていない旨を示すこと'

// Spec: FR-036, T-036
const assignmentsIn = (cell: string): readonly (readonly string[])[] =>
  cell
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)

function keyOf(id: string): KeyInput {
  const parts = assignmentsIn(rowOf(T_036, id).by['割当'] ?? '')[0] ?? []
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

// Spec: SK-11, FR-096, FR-060
const SK_11 = keyOf('SK-11')

function settledName(id: string): string {
  const COLUMN = '確定名（英）'
  if (!T_103.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column`)
  }
  const named = bare(rowOf(T_103, id).by[COLUMN] ?? '')
  if (named === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return named
}

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

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

// Why: both queues are drained, because the loop's awaits resolve on the microtask queue
// and anything the host defers lands on the macrotask one.
async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Bench {
  readonly loop: FrameLoop
  readonly written: ChosenFileWrite[]
  runFrames(): void
  last(): ScreenView
  screens(): number
}

// Why: readOpenedFileState answers none, so by FR-096 the first save has nothing to
// overwrite and takes the chosen-write road, whose write succeeds and names the file.
function bench(document: Document): Bench {
  const written: ChosenFileWrite[] = []
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }

  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null as never,
    readScreenPartAt: () => null as ScreenPart | null,
  }

  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>(() => {}),
    adoptFileReadToOpen: () => undefined,
    forgetOpenedFile: () => undefined,
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({
      ok: false,
      fault: { reason: 'noOpenedFile', what: 'this document has never been in a file' },
    }),
    writeChosenFile: async (write) => {
      written.push(write)
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  }

  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop(
    { showSvg: () => {} } as any,
    document,
    SCREEN,
    wiring,
    store,
  )

  return {
    loop,
    written,
    runFrames: () => {
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it)
      // ends the case instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    screens: () => views.length,
  }
}

// Why: CS-4 of table T-066 puts the file operation across frames, so the case stands
// inside the wait and lets it end.
async function pressSave(one: Bench): Promise<void> {
  one.loop.receiveInput(SK_11)
  one.runFrames()
  await settle()
  one.runFrames()
}

// Why: a press and not a save, because no row says a wait ending without a question owes
// a frame; the press writes no file, and each case asserts the write count afterwards.
function nextFrame(one: Bench): void {
  one.loop.receiveInput(pointer('down', 501, 301))
  one.loop.receiveInput(pointer('up', 501, 301))
  one.runFrames()
}

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-101 still puts both the name and the moment on the screen', () => {
    expect(REQUIREMENTS).toContain(THE_SHOW_MUST)
  })

  it('⭐ FR-101 still has words standing where the time would be until a save', () => {
    expect(REQUIREMENTS).toContain(THE_NEVER_SAVED_MUST)
  })

  it('⭐ table T-103 still names the two parts, and table T-036 still assigns SK-11', () => {
    expect(settledName('U-58')).toBe('Opened File Name')
    expect(settledName('U-59')).toBe('File Saved At')
    expect(SK_11.key).not.toBe('')
    expect(SK_11.modifiers.ctrl).toBe(true)
  })
})

// Spec: FR-101
describe('FR-101 (MUST) -- a document that has never been in a file', () => {
  it('⭐ names no file and states no moment, and says so in words instead', () => {
    // Why: the premise of every case below: what the save has to change starts unchanged.
    const one = bench(templateDocument())
    one.runFrames()

    const header = one.last().appHeaderItems
    expect(header.openedFileName).toBeNull()
    expect(header.fileSavedAt).toBeNull()
    expect(header.fileNeverSavedText.length).toBeGreaterThan(0)
  })
})

describe('FR-101 (MUST) -- once one save has succeeded', () => {
  it('⛔ the header names the very file that was written', async () => {
    // Why: the store answers the save with the file it wrote, and an implementation that
    // returns once the write succeeded throws that answer away.
    const one = bench(templateDocument())
    one.runFrames()
    await pressSave(one)
    nextFrame(one)

    // Why: exactly one write, so the name below can only have come from it.
    expect(one.written).toHaveLength(1)
    const wrote = one.written[0]?.suggestedFileName ?? ''
    expect(wrote.length).toBeGreaterThan(0)

    expect(one.last().appHeaderItems.openedFileName).toBe(wrote)
  })

  it('⛔ the header states the moment it was written, in place of the words', async () => {
    const one = bench(templateDocument())
    one.runFrames()
    await pressSave(one)
    nextFrame(one)

    expect(one.written).toHaveLength(1)
    expect(one.last().appHeaderItems.fileSavedAt).not.toBeNull()
  })

  it('⛔ that moment is kept in UTC, to the second (FR-101 MUST / FR-063)', async () => {
    // Why: the spelling on the screen is not asserted, since FR-101 leaves it open; the value
    // the header carries is read instead.
    const one = bench(templateDocument())
    one.runFrames()
    await pressSave(one)
    nextFrame(one)

    const at = one.last().appHeaderItems.fileSavedAt ?? ''
    expect(at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it('⛔ MUST NOT: the name it shows is the file’s, not the `Document Title`', async () => {
    const one = bench(templateDocument())
    one.runFrames()
    const title = one.last().appHeaderItems.documentTitle

    await pressSave(one)
    nextFrame(one)

    const header = one.last().appHeaderItems
    expect(header.documentTitle).toBe(title)
    expect(header.openedFileName).not.toBe(title)
  })
})
