// Unit tests: the shell converts the undo memory bound from megabytes to bytes.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type {
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { SvgSurface } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

interface ManuscriptFigure {
  readonly num?: string
  readonly suffix?: string
}

interface ManuscriptRow {
  readonly id?: string
  readonly default?: ManuscriptFigure
  readonly value?: ManuscriptFigure
  readonly note?: { readonly ja?: string }
}

const SETTINGS_MANUSCRIPT = join(process.cwd(), 'docs', 'spec', '_source', 'settings.json')

const manuscriptRow = (id: string): ManuscriptRow => {
  const manuscript = JSON.parse(readFileSync(SETTINGS_MANUSCRIPT, 'utf8')) as {
    blocks?: { rows?: ManuscriptRow[] }[]
  }
  for (const block of manuscript.blocks ?? []) {
    for (const row of block.rows ?? []) {
      if (row.id === id) return row
    }
  }
  throw new Error(`docs/spec/_source/settings.json has no row ${id}`)
}

const figureOf = (row: ManuscriptRow): ManuscriptFigure => {
  const figure = row.default ?? row.value
  if (figure === undefined || figure.num === undefined) {
    throw new Error(`row ${row.id ?? '?'} of the settings manuscript states no default`)
  }
  return figure
}

const S_94_ROW = manuscriptRow('S-94')
const S_95_ROW = manuscriptRow('S-95')

// Spec: T-206, S-94
const S_94 = Number.parseInt(figureOf(S_94_ROW).num ?? '', 10)

// Spec: T-206, S-95
const S_95_NUMBER = Number.parseInt(figureOf(S_95_ROW).num ?? '', 10)
const S_95_UNIT = (figureOf(S_95_ROW).suffix ?? '').trim()

interface StatedUnit {
  readonly word: string
  readonly bytes: number
}

// Why: the unit word is parsed beside the factor, so a case can ask that S-95
// is still stated in the unit its remark converts, typing neither.
const megabyteStatedIn = (sentence: string): StatedUnit => {
  const said = /1\s*([A-Za-z]+)\s*=\s*(\d+)\s*×\s*(\d+)\s*バイト/.exec(sentence)
  if (said === null) {
    throw new Error(`this sentence no longer states what one MB is: ${sentence}`)
  }
  return {
    word: said[1] ?? '',
    bytes: Number.parseInt(said[2] ?? '', 10) * Number.parseInt(said[3] ?? '', 10),
  }
}

const S_95_MEGABYTE = megabyteStatedIn(S_95_ROW.note?.ja ?? '')
const MB_FACTOR = S_95_MEGABYTE.bytes

// Why: S-95 is converted here, not read from NOT_STORED_LIMITS, which holds the
// MB value the shell itself must convert.
const S_95_BYTES = S_95_NUMBER * MB_FACTOR

// Why: the SI megabyte is never an expectation; it is the foil for the reading
// S-95's remark rules out, and block D stands where the two part.
const SI_FACTOR = 1000 * 1000
const S_95_SI_BYTES = S_95_NUMBER * SI_FACTOR

// Why: the keys are read from T-036 rather than typed, because the table's
// spelling is what KeyInput.key is documented to use.
function keyOf(row: string): KeyInput {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  const assignment = (found.by['割当'] ?? '').split('/')[0] ?? ''
  const parts = assignment
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${row} states no assignment`)
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

// Spec: T-036, SK-20, SK-6, FR-070, T-027, UN-13, FR-046
const SK_20 = keyOf('SK-20')
const SK_6 = keyOf('SK-6')

// Why: built from the saved form, so it is the GRS JSON of the document and not
// some other JSON of the object in memory.
const compactGrsJson = (document: Document): string =>
  JSON.stringify(JSON.parse(jsonFromDocument(document)))

// Spec: FR-031
const stepBytes = (document: Document): number =>
  Buffer.byteLength(compactGrsJson(document), 'utf8')

// Why: never an expectation; only what a shell that measured characters would
// keep, so a case can say the answer is not that one.
const stepChars = (document: Document): number => compactGrsJson(document).length

const stepsThatFit = (sizeOfOneStep: number, bound: number): number =>
  Math.min(S_94, Math.floor(bound / sizeOfOneStep))

// Why: a search, not a number: it walks down from just under S-94 to the deepest
// count where the whole gap between the two readings of S-95 is room to stand.
const FOIL_KEPT = (() => {
  let kept = S_94 - 1
  while (kept > 2 && S_95_SI_BYTES / kept < S_95_BYTES / (kept + 1)) kept -= 1
  return kept
})()

// Why: the geometric middle of the two readings, so a few bytes between this
// file's measure and the shell's cannot move either answer.
const FOIL_STEP_TARGET = Math.sqrt(S_95_BYTES * S_95_SI_BYTES) / FOIL_KEPT

// Spec: T-034, BT-4, FR-027
// Why: the bundled document is used because a small fixture keeps the same
// number of steps under 64 bytes and under 64 MB.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')

function documentOf(text: string): Document {
  const read = documentFromJson(text)
  if (!read.ok) throw new Error(`not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const START = documentOf(TEMPLATE_TEXT)
const START_STEP_BYTES = stepBytes(START)

const CJK = '漢'
const CJK_BYTES = Buffer.byteLength(CJK, 'utf8')

// Why: notes (AT-32) carries no length rule, so filling it changes only the size;
// the size is approximate, and each block's first case measures what it got.
const paddedTo = (target: number): Document => {
  const filler = Math.ceil((target - START_STEP_BYTES) / CJK_BYTES)
  if (filler <= 0) throw new Error(`the startup document is already larger than ${target} bytes`)
  const draft = JSON.parse(TEMPLATE_TEXT) as {
    schedule: { tasks: { notes: string | null }[] }
  }
  const first = draft.schedule.tasks[0]
  if (first === undefined) throw new Error('the bundled template has no Task to write notes on')
  first.notes = CJK.repeat(filler)
  return documentOf(JSON.stringify(draft))
}

// Why: a step of about S-95 / 10.5 sits halfway between two whole step counts,
// so a few tenths of a percent between the two measures move nothing.
const PADDED = paddedTo(S_95_BYTES / 10.5)

const UNIT_FOIL = paddedTo(FOIL_STEP_TARGET)

// Spec: T-077, BO-1, FR-051
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Waiting {
  (time: number): void
}

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame

// Why: node has no requestAnimationFrame; the fake one collects and never runs,
// because FT-1 reaches the document before any frame does.
function host(): SvgSurface {
  const waiting: Waiting[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (
    callback: Waiting,
  ): number => waiting.push(callback)
  return { showMarqueeOverlaySvg: () => undefined, showSvg: () => {} }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

const baseDateOf = (document: Document): string | null => document.schedule.project.statusDate

interface Driven {
  readonly loop: FrameLoop
  readonly seen: (string | null)[]
}

// Why: only the document is handed in, so the history is held to the shell's
// own bounds, which is what the file asks about.
function drive(first: Document, writes: number): Driven {
  const loop = frameLoop(host(), first, SCREEN)
  const seen: (string | null)[] = [baseDateOf(loop.document())]
  for (let i = 1; i <= writes; i += 1) {
    loop.receiveInput(SK_20)
    const now = baseDateOf(loop.document())
    if (now === seen[seen.length - 1]) {
      throw new Error(`write ${i} of ${writes} moved nothing, so it left no 段 to undo`)
    }
    seen.push(now)
  }
  return { loop, seen }
}

// Why: the shell publishes no history, so depth is counted by pressing SK-6 until
// the document stops; the loop is bounded above S-94 so it cannot run for ever.
function undoWhileItMoves(loop: FrameLoop): number {
  let moved = 0
  let before = baseDateOf(loop.document())
  for (let i = 0; i < S_94 * 2 + 8; i += 1) {
    loop.receiveInput(SK_6)
    const after = baseDateOf(loop.document())
    if (after === before) return moved
    moved += 1
    before = after
  }
  throw new Error(`the shell undid more than ${S_94 * 2 + 8} times, so the history has no bound`)
}

// Spec: T-206, S-94, S-95, FR-031
describe('表 T-206 -- the two rows FR-031 says the bounds are', () => {
  it('GIVEN the settings manuscript WHEN S-94 and S-95 are read THEN the printed table T-206 states the same two figures and the same conversion', () => {
    // Why: the printed table may be quoted only if it agrees with the settings
    // manuscript it is generated from; this case says it does.
    const row = (id: string): { readonly by: Readonly<Record<string, string>> } => {
      const found = specTable('T-206').rows.find((one) => one.id === id)
      if (found === undefined) throw new Error(`table T-206 has no row ${id}`)
      return found
    }
    const printed = (id: string): string => row(id).by['既定'] ?? ''
    expect(Number.parseInt(bare(printed('S-94')), 10)).toBe(S_94)
    expect(printed('S-95')).toContain(`\`${S_95_NUMBER}\``)
    expect(printed('S-95')).toContain(S_95_UNIT)

    // Why: the two remarks are compared with each other, never with a typed factor.
    const printedRemark = megabyteStatedIn(row('S-95').by['保存しない理由'] ?? '')
    expect(printedRemark.bytes).toBe(MB_FACTOR)
    expect(printedRemark.word).toBe(S_95_MEGABYTE.word)
  })

  it('GIVEN the bundled startup document WHEN one 段 is measured THEN it alone exceeds S-95 read as a bare number, and S-94 of them still fit inside S-95 converted', () => {
    expect(START_STEP_BYTES).toBeGreaterThan(S_95_NUMBER)
    expect(S_94 * START_STEP_BYTES).toBeLessThanOrEqual(S_95_BYTES)
    expect(stepsThatFit(START_STEP_BYTES, S_95_BYTES)).toBe(S_94)
  })
})

// Why: DFC-1024 -- the default timeout reds these cases on a loaded machine though
// they pass alone; an explicit ceiling, not a retry.
const LOADED_MACHINE_TIMEOUT_MS = 60_000

describe('FR-031 / S-94 / S-95 -- the bound the REAL shell holds the REAL startup document to', { timeout: LOADED_MACHINE_TIMEOUT_MS }, () => {
  it('GIVEN the real shell holding the startup document WHEN S-94 changes are written THEN S-94 undos each walk one 段 back', () => {
    // Why: the case the missing conversion fails: with S-95 as the bare number, one
    // step is past the bound and the second undo moves nothing.
    const { loop, seen } = drive(START, S_94)

    for (let undone = 1; undone <= S_94; undone += 1) {
      loop.receiveInput(SK_6)
      expect(baseDateOf(loop.document()), `undo ${undone} of ${S_94}`).toBe(seen[S_94 - undone])
    }
  })

  it('GIVEN S-94 changes written through the real shell WHEN every 段 is undone THEN the document is byte-identical to the one the writes started from', () => {
    // Why: RD-1 sets the stamp back as it came in, so the document may be compared
    // byte for byte.
    const { loop } = drive(START, S_94)
    for (let undone = 1; undone <= S_94; undone += 1) loop.receiveInput(SK_6)

    // Spec: UN-8, FR-046
    // Why: showing the status line also slides the view, and zoom and scroll are no undo target,
    // so the six view rows (S-75 to S-78, S-176, S-177) are laid back from START before the compare.
    const VIEW_KEYS = ['zoomX', 'zoomY', 'scrollDate', 'scrollTaskGroupId', 'scrollTaskGroupFraction', 'scrollDateFraction']
    const startSettings = START.documentSettings as unknown as Record<string, unknown>
    const viewOfStart = Object.fromEntries(VIEW_KEYS.map((key) => [key, startSettings[key]]))
    const undone = loop.document()
    const withStartView = {
      ...undone,
      documentSettings: { ...undone.documentSettings, ...viewOfStart },
    } as unknown as Document
    expect(compactGrsJson(withStartView)).toBe(compactGrsJson(START))
  })

  it('GIVEN the real shell WHEN more changes are written than S-94 THEN exactly S-94 段 are left to undo', () => {
    // Why: fails both when the conversion is dropped (64 bytes keeps 1) and when no
    // bound holds at all (S-94 + 3 kept).
    const { loop } = drive(START, S_94 + 3)
    expect(undoWhileItMoves(loop)).toBe(S_94)
  })
})

describe('FR-031 -- 1 段 is measured in bytes, and never in 文字数', () => {
  it('GIVEN a document whose text is CJK WHEN its compact GRS JSON is measured both ways THEN the byte length and the character length admit a different number of 段', () => {
    expect(CJK_BYTES).toBe(3)
    expect(stepBytes(PADDED)).toBeGreaterThan(stepChars(PADDED))
    expect(stepsThatFit(stepBytes(PADDED), S_95_BYTES)).toBeLessThan(
      stepsThatFit(stepChars(PADDED), S_95_BYTES),
    )
    // Why: both readings must bite before S-94 does, or the case measures S-94 and
    // not the memory bound.
    expect(stepsThatFit(stepChars(PADDED), S_95_BYTES)).toBeLessThan(S_94)
  })

  it('GIVEN the real shell holding a document of CJK text WHEN more changes are written than either measure admits THEN the 段 that survive are the byte count, not the character count', () => {
    const byBytes = stepsThatFit(stepBytes(PADDED), S_95_BYTES)
    const byCharacters = stepsThatFit(stepChars(PADDED), S_95_BYTES)

    const { loop } = drive(PADDED, byCharacters + 3)
    const kept = undoWhileItMoves(loop)

    expect(kept).toBe(byBytes)
    expect(kept).not.toBe(byCharacters)
  }, 300_000)
})

// Spec: T-206, S-95
// Why: blocks A-C pass under a factor of 1000 x 1000 too, because their documents
// keep one step count under either reading; block D stands where they part.
describe('表 T-206 S-95 -- which reading of 「MB」 the shell actually applied', () => {
  it('GIVEN the document padded to the size the two readings disagree about WHEN one 段 is measured THEN S-95 read as its remark says admits more 段 than S-95 read as SI megabytes, and both stop short of S-94', () => {
    // Why: if this premise fails the next case proves nothing; and the row must still
    // be stated in the unit its own remark converts.
    expect(S_95_UNIT).toBe(S_95_MEGABYTE.word)

    const size = stepBytes(UNIT_FOIL)
    const byMebibyte = stepsThatFit(size, S_95_BYTES)
    const bySiMegabyte = stepsThatFit(size, S_95_SI_BYTES)

    expect(byMebibyte).toBeGreaterThan(bySiMegabyte)
    // Why: S-95 must be the bound that decides here, or the case measures S-94 again.
    expect(byMebibyte).toBeLessThan(S_94)
    // Why: the shallower reading still keeps a real history, so this is not the case
    // FR-031 leaves open, one step alone larger than the bound.
    expect(bySiMegabyte).toBeGreaterThan(1)

    // Why: the shell and this file measure steps a stamp's few bytes apart, so the
    // size must sit between the two edges with room to spare.
    const toSiEdge = size - S_95_SI_BYTES / byMebibyte
    const toMebibyteEdge = S_95_BYTES / byMebibyte - size
    expect(Math.min(toSiEdge, toMebibyteEdge) / size).toBeGreaterThan(0.01)
  })

  it('GIVEN the real shell holding that document WHEN more changes are written than either reading admits THEN the 段 that survive are S-95 converted the way its own remark converts it, and not the SI reading', () => {
    // Why: the case a wrong multiplication fails: a shell using 1000 x 1000 keeps
    // one step fewer, and nothing else in the file tells the two apart.
    const size = stepBytes(UNIT_FOIL)
    const byMebibyte = stepsThatFit(size, S_95_BYTES)
    const bySiMegabyte = stepsThatFit(size, S_95_SI_BYTES)

    const { loop } = drive(UNIT_FOIL, byMebibyte + 3)
    const kept = undoWhileItMoves(loop)

    expect(kept).toBe(byMebibyte)
    expect(kept).not.toBe(bySiMegabyte)
  }, 300_000)
})
