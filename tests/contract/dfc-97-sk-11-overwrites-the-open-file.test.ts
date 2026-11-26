// Contract tests: SK-11 on a document already in a file writes over that file, opens nothing and asks nothing.

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

/* eslint-disable @typescript-eslint/no-explicit-any -- the bench patches the global requestAnimationFrame and casts the loop's results */

const T_036: SpecTable = specTable('T-036')
const T_024: SpecTable = specTable('T-024')
const T_227: SpecTable = specTable('T-227')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const THE_FAST_ROAD_MUST = '`GRS` は、問わずに上書きする速い道を 表 T-036 の `SK-11` とすること'

const THE_FORM_MUST =
  '作成者が 表 T-036 の `SK-11`（保存する）で書いたとき、`GRS` は、どの形式から開いた文書も `GRS JSON` で書くこと。'

// Spec: FR-036, T-036
const assignmentsIn = (cell: string): readonly (readonly string[])[] =>
  cell
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)

// Summary: keyOf() builds the first keystroke a T-036 row assigns, its last code span being the key.
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

const SK_11 = keyOf('SK-11')

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

// Spec: BT-4
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

const OPEN_FILE_NAME = 'plan-of-record.grs.json'

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// Summary: settle() drains the microtask queue and one macrotask turn, so a CS-4 file operation ends.
async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Bench {
  readonly loop: FrameLoop
  readonly overwritten: Uint8Array[]
  readonly chosen: ChosenFileWrite[]
  runFrames(): void
  views(): readonly ScreenView[]
  last(): ScreenView
}

// Why: writeChosenFile still records, so a road that took the chooser would land
// a file and be seen rather than stubbed into silence.
/** @purity non-pure */
function bench(document: Document): Bench {
  const overwritten: Uint8Array[] = []
  const chosen: ChosenFileWrite[] = []
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

  const opened = { kind: 'writable', fileName: OPEN_FILE_NAME } as const

  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>(() => {}),
    adoptFileReadToOpen: () => undefined,
    forgetOpenedFile: () => undefined,
    readOpenedFileState: async () => opened,
    restoreOpenedFilePermission: async () => opened,
    overwriteOpenedFile: async (bytes: Uint8Array) => {
      overwritten.push(bytes)
      return { ok: true, openedFile: opened } as never
    },
    writeChosenFile: async (write) => {
      chosen.push(write)
      return {
        ok: true,
        openedFile: { kind: 'writable', fileName: write.suggestedFileName },
      } as never
    },
  }

  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop({ showSvg: () => {} } as any, document, SCREEN, wiring, store)

  return {
    loop,
    overwritten,
    chosen,
    runFrames: () => {
      // Why: bounded, so a loop that asks for a frame inside a frame, which NFR-010
      // forbids, ends the case instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
    views: () => views,
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

async function pressSave(one: Bench): Promise<void> {
  one.loop.receiveInput(SK_11)
  one.runFrames()
  await settle()
  one.runFrames()
}

// Spec: SK-11, FR-060, FR-096, IO-2, DI-5
describe('the manuscript still says what these cases read', () => {
  it('⭐ 表 T-036 still assigns `Ctrl` ＋ `S` to SK-11, and points it at FR-060', () => {
    expect(SK_11.key).toBe('S')
    expect(SK_11.modifiers.ctrl, 'table T-036 no longer spells SK-11 with Ctrl').toBe(true)
    expect(SK_11.modifiers.shift).toBe(false)
    expect(SK_11.modifiers.alt).toBe(false)
    // Why: the raw cell, not bare(): bare() answers the first code span of a cell,
    // and this phrase sits further along.
    const action = rowOf(T_036, 'SK-11').by['操作'] ?? ''
    expect(action, '表 T-036 の `SK-11`: 上書き先は `FR-060`').toContain('`SK-11` で保存したとき、`GRS` は、上書き先を `FR-060` に従わせること。')
  })

  it('⭐ FR-060 still calls SK-11 the fast road, and FR-096 still fixes the form', () => {
    expect(REQUIREMENTS).toContain(THE_FAST_ROAD_MUST)
    expect(REQUIREMENTS).toContain(THE_FORM_MUST)
    expect(bare(rowOf(T_024, 'IO-2').by['形式'] ?? '')).toBe('GRS JSON')
  })

  it('⭐ DI-5 still forbids a question on this road', () => {
    const di5 = rowOf(T_227, 'DI-5').by['規則'] ?? ''
    expect(di5, '表 T-227 の `DI-5`').toContain('`FR-060` の経路では問わないこと（MUST）')
  })
})

// Why: FR-024 owns the spelling of the bytes and FR-101 the header afterwards,
// so the cases assert neither.
// Spec: FR-060, SK-11, DI-5, FR-096
describe('FR-060 -- `Ctrl` ＋ `S` on a document that is already in a file', () => {
  it('⛔ writes over that very file, through the member that names it', async () => {
    const one = bench(templateDocument())
    await pressSave(one)

    expect(one.overwritten, 'FR-060 (MUST): the opened file was not written to').toHaveLength(1)
  })

  it('⛔ opens no chooser to do it -- that road is `IC-2`, not the key', async () => {
    // Why: the store would record a chosen write, so the empty roster is the claim
    // and not a stub.
    const one = bench(templateDocument())
    await pressSave(one)

    expect(one.chosen.map((write) => write.suggestedFileName)).toEqual([])
    expect(one.last().openModal, 'FR-060: the fast road opened a surface').toBeNull()
  })

  it('⛔ DI-5 (MUST): asks nothing, on any frame of the press', async () => {
    // Why: every description is read, not only the last, so a DI-4 question that
    // went up and came down inside the wait still counts as asked.
    const one = bench(templateDocument())
    await pressSave(one)

    expect(one.views().length, 'the surface was given no description at all').toBeGreaterThan(0)
    for (const [at, view] of one.views().entries()) {
      expect(view.confirmation, `表 T-227 の \`DI-5\`: frame ${at} put a question up`).toBeNull()
    }
  })

  it('⛔ FR-096 (MUST): what lands on that file is GRS JSON, the whole document', async () => {
    // Why: read back through the codec rather than matched against a string, so
    // "wrote something" cannot pass for "wrote the document".
    const one = bench(templateDocument())
    await pressSave(one)

    const bytes = one.overwritten[0]
    expect(bytes, 'FR-060 (MUST): nothing was written to read back').toBeDefined()
    const back = documentFromJson(new TextDecoder().decode(bytes as Uint8Array))
    expect(back.ok, 'FR-096 (MUST): the bytes on the opened file are not GRS JSON').toBe(true)
  })

  it('⛔ DFC-66 lives on the other side of this: a second press writes again', async () => {
    // Why: a road that overwrites once and then falls back to the chooser, or to
    // nothing, does not close the round trip on the same file.
    const one = bench(templateDocument())
    await pressSave(one)
    await pressSave(one)

    expect(one.overwritten, 'FR-060: the round trip did not close on the same file').toHaveLength(2)
    expect(one.chosen).toEqual([])
  })
})
