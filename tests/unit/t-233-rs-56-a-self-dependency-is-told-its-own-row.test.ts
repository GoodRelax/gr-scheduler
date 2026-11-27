// Unit tests: a dependency drawn from a task to itself is told RS-56, FR-009's own row.

/* eslint-disable @typescript-eslint/no-explicit-any -- the dictionary and the drawn bars are read as loose shapes */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  HumanInput,
  InputModifiers,
} from '../../src/adapter/input-command-translator/input-command-translator'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
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
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'

const T_233: SpecTable = specTable('T-233')
const T_109: SpecTable = specTable('T-109')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const mannerOf = (specTableRowId: string): string => bare(rowOf(T_233, specTableRowId).cells[1] ?? '')

const authorityOf = (specTableRowId: string): string => rowOf(T_233, specTableRowId).by['正'] ?? ''

// Why: compared against FR-038's one dictionary, never against a spelling.
const wordsOf = (specTableRowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${specTableRowId}`)
  return found.text
}

const RS_10 = 'RS-10'
const RS_56 = 'RS-56'

const DEPENDENCY_ARM = 'AR-4'

const DEPENDENCY_ENTRANCE = ((): { row: string; surface: string } => {
  const found = T_109.rows.filter((row) => bare(row.by['構え'] ?? '') === DEPENDENCY_ARM)
  if (found.length !== 1) {
    throw new Error(`table T-109 arms ${DEPENDENCY_ARM} from ${found.length} entrances`)
  }
  const row = found[0] as SpecRow
  return { row: row.id, surface: bare(row.by['面'] ?? '') }
})()

const ENTRANCE_PART = {
  part: DEPENDENCY_ENTRANCE.surface,
  entry: DEPENDENCY_ENTRANCE.row,
  format: null,
  taskGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
} as unknown as ScreenPart

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
  width: 1400,
  height: 900,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: string, x: number, y: number): HumanInput =>
  ({
    kind: 'pointer',
    phase,
    button: 'left',
    x,
    y,
    modifiers: { ...NO_MODIFIERS },
    clickCount: 1,
  }) as unknown as HumanInput

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

// Why: the box is read off the outline's points, since BarGeometry carries the silhouette
// and the box is what dependencyEndAtPointer halves.
function boxOfOutline(bar: any): Box | null {
  if (bar === null || bar === undefined || bar.form !== 'outline') return null
  const xs = bar.points.map((one: any) => one.x)
  const ys = bar.points.map((one: any) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

interface Stage {
  armDependencyLine(): void
  bars(): readonly { readonly uid: number; readonly box: Box }[]
  drag(from: { x: number; y: number }, to: { x: number; y: number }): void
  notices(): readonly { readonly text: string; readonly manner: string }[]
  dependencyCount(): number
}

// Summary: When asked for the part under the pointer, the surface shall answer the palette entry while the arm is pressed and nothing otherwise.
function stage(): Stage {
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop({ showSvg: () => undefined } as any, templateDocument(), SCREEN, wiring)
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
  }
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    runFrames()
  }
  runFrames()
  return {
    armDependencyLine: () => {
      part = ENTRANCE_PART
      send(pointer('down', 40, 200))
      send(pointer('up', 40, 200))
      part = null
    },
    bars: () => {
      const frame = loop.current()
      if (frame === null) throw new Error('no frame has run')
      const found: { uid: number; box: Box }[] = []
      for (const task of frame.geometry.tasks) {
        const box = boxOfOutline((task as any).plan) ?? boxOfOutline((task as any).actual)
        if (box !== null && box.width > 8) found.push({ uid: task.taskUid, box })
      }
      if (found.length === 0) {
        throw new Error('the bundled template drew no bar wide enough to press twice')
      }
      return found
    },
    drag: (from, to) => {
      send(pointer('down', from.x, from.y))
      send(pointer('up', to.x, to.y))
    },
    notices: () => (views[views.length - 1]?.notices ?? []) as any,
    dependencyCount: () =>
      loop.document().schedule.tasks.reduce((sum, one) => sum + one.dependencies.length, 0),
  }
}

describe('the rows this case is driven by are still in the manuscript', () => {
  it('⭐ table T-233 still holds RS-56 against NT-1, with FR-009 as its 正', () => {
    expect(mannerOf(RS_56)).toBe('NT-1')
    expect(authorityOf(RS_56)).toContain('FR-009')
  })

  it('⛔ the dictionary gives RS-56 and RS-10 different words', () => {
    // Why: without this the case below is vacuous, as telling RS-56 and RS-10 would look alike.
    expect(wordsOf(RS_56).ja).not.toBe(wordsOf(RS_10).ja)
    expect(wordsOf(RS_56).ja.length).toBeGreaterThan(0)
  })

  it('⭐ table T-109 still arms AR-4 from exactly one entrance', () => {
    expect(DEPENDENCY_ENTRANCE.row.length).toBeGreaterThan(0)
  })
})

// Spec: T-037, T-233, RS-56, FR-009, DN-1, DN-2, PTD-3, AR-4, IC-61
describe('table T-037 / T-233: a dependency drawn onto its own task is told RS-56', () => {
  it('⭐⭐ RS-56: both ends on one bar is told FR-009s own row and not RS-10', () => {
    const one = stage()
    one.armDependencyLine()
    const bar = one.bars()[0] as { uid: number; box: Box }
    const before = one.dependencyCount()

    // Why: under PTD-3 each end is named by the half of the bar it lands on, and both halves
    // here are the same bar, FR-009's self-reference.
    one.drag(
      { x: bar.box.x + bar.box.width * 0.25, y: bar.box.y + bar.box.height / 2 },
      { x: bar.box.x + bar.box.width * 0.75, y: bar.box.y + bar.box.height / 2 },
    )

    expect(one.dependencyCount(), 'FR-009 (MUST NOT): nothing was written').toBe(before)
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_56).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_10).ja)
    expect(told[0]?.manner).toBe(mannerOf(RS_56))
  })

  it('⛔ THE CONTROL: a dependency between TWO tasks is told nothing at all', () => {
    // Why: without this, a build that refused every dependency drag would pass.
    const one = stage()
    one.armDependencyLine()
    const drawn = one.bars()
    const first = drawn[0] as { uid: number; box: Box }
    // Why: a bar not overlapping the first, since the release names the bar its point falls in
    // and a shared point would leave the answer to the order of the walk.
    const second = drawn.find((bar) => bar.uid !== first.uid && !overlaps(bar.box, first.box))
    if (second === undefined) throw new Error('the bundled template drew only one usable bar')

    const before = one.dependencyCount()
    one.drag(
      { x: first.box.x + first.box.width * 0.75, y: first.box.y + first.box.height / 2 },
      { x: second.box.x + second.box.width * 0.25, y: second.box.y + second.box.height / 2 },
    )

    expect(one.dependencyCount(), 'the write landed').toBe(before + 1)
    expect(one.notices().length).toBe(0)
  })

  it('⭐⭐ THE WIDE HALF: FR-009s OTHER refusals keep RS-10 and do not borrow RS-56', () => {
    // Why: every FR-009 refusal is spelled CM-36 against FR-009, so only reasonCategory keeps
    // RS-56 off a second line between two different tasks.
    // Why: table T-233 gives FR-009's other prohibitions no row and RS-10 is true of them, so
    // they keep RS-10.
    const one = stage()
    one.armDependencyLine()
    const drawn = one.bars()
    const first = drawn[0] as { uid: number; box: Box }
    const second = drawn.find((bar) => bar.uid !== first.uid && !overlaps(bar.box, first.box))
    if (second === undefined) throw new Error('the bundled template drew only one usable bar')

    const from = { x: first.box.x + first.box.width * 0.75, y: first.box.y + first.box.height / 2 }
    const into = {
      x: second.box.x + second.box.width * 0.25,
      y: second.box.y + second.box.height / 2,
    }
    one.drag(from, into)
    const written = one.dependencyCount()
    expect(one.notices().length, 'the first line landed').toBe(0)

    // Step: the same line again is FR-009's second prohibition, which T-233 gives no row.
    one.drag(from, into)

    expect(one.dependencyCount(), 'FR-009 (MUST NOT): nothing was written twice').toBe(written)
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_10).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_56).ja)
  })
})

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  )
}
