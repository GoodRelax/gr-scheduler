// Unit tests: SK-19's Enter keeps standing the telling its own settling just raised (NT-8).

/* eslint-disable @typescript-eslint/no-explicit-any -- the dictionary and the told notices are read as loose shapes */

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

const T_036: SpecTable = specTable('T-036')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const keyNameOf = (specTableRowId: string): string => {
  const spelled = bare(rowOf(T_036, specTableRowId).by['割当'] ?? '')
    .replace(/＋/g, '+')
    .split('/')[0]
  const parts = (spelled ?? '').split('+').map((one) => one.trim()).filter((one) => one.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error('table T-036 states no assignment for SK-19')
  if (parts.length !== 1) throw new Error(`SK-19 is no longer one bare key: ${spelled ?? ''}`)
  return last
}

// Why: compared against FR-038's one dictionary, never against a spelling.
const wordsOf = (specTableRowId: string): string => {
  const found = (displayWords as any).reasons.find((one: any) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${specTableRowId}`)
  return found.text.ja as string
}

const RS_55 = 'RS-55'
const RS_58 = 'RS-58'

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

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const SETTLE_KEY_NAME = keyNameOf('SK-19')

const SETTLE_KEY: HumanInput = {
  kind: 'key',
  key: SETTLE_KEY_NAME,
  modifiers: { ...NO_MODIFIERS },
} as unknown as HumanInput

// Why: the shell reads IF-9's answer at the head of every happening, so a pointer move
// carries the same write as the key while standing on neither NT-8 ladder.
const POINTER_MOVE: HumanInput = {
  kind: 'pointer',
  phase: 'move',
  button: 'left',
  x: 500,
  y: 400,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
} as unknown as HumanInput

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Loop {
  settle(commit: { row: string; key: unknown; text: string }, spend: HumanInput): void
  send(input: HumanInput): void
  told(): readonly string[]
}

// Summary: When the loop reads a settled value, the surface shall answer the one value handed in and then nothing.
function loopWith(document: Document): Loop {
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  let held: unknown = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => {
      const one = held
      held = null
      return one as never
    },
    readScreenPartAt: () => null as ScreenPart | null,
  }
  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop({ showSvg: () => undefined } as any, document, SCREEN, wiring)
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
  }
  runFrames()
  return {
    settle: (commit, spend) => {
      held = commit
      loop.receiveInput(spend)
      runFrames()
    },
    send: (input) => {
      loop.receiveInput(input)
      runFrames()
    },
    told: () =>
      ((views[views.length - 1]?.notices ?? []) as any[]).map((one) => one.text as string),
  }
}

function firstTask(document: Document): {
  uid: number
  start: string | null
  finish: string | null
} {
  const task = document.schedule.tasks[0]
  if (task === undefined) throw new Error('the bundled template holds no Task')
  return { uid: task.uid, start: task.start, finish: task.finish }
}

function aYearBefore(day: string): string {
  const year = Number(day.slice(0, 4))
  return `${String(year - 1)}${day.slice(4)}`
}

const finishBeforeStart = (uid: number, start: string) => ({
  row: 'PR-3',
  key: { holder: 'task', uid, column: 'finish' },
  text: aYearBefore(start),
})

describe('the rows these cases read are still in the manuscript', () => {
  it('⭐ SK-19 is still one bare key, and the dictionary still parts RS-55 from RS-58', () => {
    expect(SETTLE_KEY_NAME.length).toBeGreaterThan(0)
    expect(wordsOf(RS_55)).not.toBe(wordsOf(RS_58))
  })

  it('⭐ SK-19 still puts the dismissal ahead of settling the in-place edit', () => {
    // Why: the ordering these cases hold is the row's own, so a reworded row must turn this red.
    const said = rowOf(T_036, 'SK-19').cells.join(' ')
    expect(said).toContain('出ている通知がある間')
    expect(said).toContain('出ている通知が無い間')
  })
})

// Spec: NT-8, SK-19, FR-076, NT-1, RS-55, RS-58
// Why: whether a standing telling should hold the write back is not asserted: the panel
// settles the value before the shell hears the key, a seam these cases cannot reach.
describe('NT-8 / SK-19: the dismissal is reckoned at the moment the key arrived', () => {
  it('⭐⭐ THE DEFECT: settling a refused value with SK-19 leaves the telling standing', () => {
    // Why: the settling raises its refusal at the head of the happening, so SK-19's first stage
    // must be reckoned on what stood when the key arrived, or it puts this answer away.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle(finishBeforeStart(task.uid, task.start as string), SETTLE_KEY)

    expect(one.told(), 'FR-076 with NT-1 (MUST): the refusal is told').toEqual([wordsOf(RS_58)])
  })

  it('⛔ THE CONTRAST: the same value spent on a pointer move told the same thing', () => {
    // Why: without this the case above could be read as the write refusing; the same value on
    // a pointer move shows the refusal does not hang on the key.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle(finishBeforeStart(task.uid, task.start as string), POINTER_MOVE)

    expect(one.told()).toEqual([wordsOf(RS_58)])
  })

  it('⭐⭐ A telling that WAS standing is the one put away, not the one just raised', () => {
    // Why: NT-8's newest is the answer already shown; the telling this press raised has not
    // been shown, so the one standing before is the one put away.
    const document = templateDocument()
    const task = firstTask(document)
    expect(task.start, 'the bundled template gives its first Task a start').not.toBeNull()
    const one = loopWith(document)

    one.settle(finishBeforeStart(task.uid, task.start as string), POINTER_MOVE)
    expect(one.told()).toEqual([wordsOf(RS_58)])

    one.settle(finishBeforeStart(task.uid, task.start as string), SETTLE_KEY)

    expect(one.told()).toEqual([wordsOf(RS_58)])
  })

  it('⛔ THE CONTROL: with nothing being settled, SK-19 still puts a telling away', () => {
    // Why: without this, a build that never put a telling away on the key would pass every
    // case above.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle(finishBeforeStart(task.uid, task.start as string), POINTER_MOVE)
    expect(one.told()).toEqual([wordsOf(RS_58)])

    one.send(SETTLE_KEY)

    expect(one.told()).toEqual([])
  })
})
