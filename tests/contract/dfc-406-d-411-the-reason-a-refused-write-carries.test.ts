// Contract tests: on UF-48, a refused write is told its own row of table T-233, not RS-10.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake surface and the dictionary are read as loose shapes */

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
import { bare, bareAll, specTable, unbroken, type SpecRow, type SpecTable } from './spec-table'

const T_016: SpecTable = specTable('T-016')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// Why: bareAll and not bare, because one panel item can edit two columns, and
// taking the first would drop the second in silence.
const columnsOf = (id: string): readonly string[] => bareAll(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

const mannerOf = (specTableRowId: string): string => bare(rowOf(T_233, specTableRowId).cells[1] ?? '')

const authorityOf = (specTableRowId: string): string => rowOf(T_233, specTableRowId).by['正'] ?? ''

const wordsOf = (specTableRowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${specTableRowId}`)
  return found.text
}

const RS_10 = 'RS-10'
const RS_55 = 'RS-55'
const RS_56 = 'RS-56'
const RS_57 = 'RS-57'
const RS_58 = 'RS-58'
const RS_82 = 'RS-82'

// Spec: IMPS-1130
const FR_076_A_T_220_REFUSAL_CARRIES_ITS_ROW =
  '画面からの書き込みが Chapter 6.1 の 表 T-220 の行で拒まれたとき、`GRS` は 表 T-233 のうち出典の欄が拒んだ行を名指す行を運ぶこと。'

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

// Why: a pointer move spends the value and decides nothing else; the SK-19 key
// would raise the telling and dismiss it again (NT-8), leaving none.
const SPENDING_HAPPENING: HumanInput = {
  kind: 'pointer',
  phase: 'move',
  button: 'left',
  x: 500,
  y: 400,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
} as HumanInput

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Loop {
  settle(commit: { row: string; key: unknown; text: string }): void
  notices(): readonly { readonly text: string; readonly manner: string }[]
}

// Summary: The helper shall drive UF-48 with a surface that answers one settled value and then nothing.
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
    settle: (commit) => {
      held = commit
      loop.receiveInput(SPENDING_HAPPENING)
      runFrames()
    },
    notices: () => (views[views.length - 1]?.notices ?? []) as any,
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

describe('the rows these cases are driven by are still in the manuscript', () => {
  it('⭐ table T-233 still holds the four rows of 2026-09-09, each against NT-1', () => {
    // Why: NT-3a would say something untrue of all four: that manner is an
    // operation of ours that failed, and here an input was simply not accepted.
    for (const row of [RS_55, RS_56, RS_57, RS_58]) {
      expect(mannerOf(row), `table T-233 writes ${row} against`).toBe('NT-1')
      expect(wordsOf(row).ja.length, `the dictionary spells ${row} in ja`).toBeGreaterThan(0)
      expect(wordsOf(row).en.length, `the dictionary spells ${row} in en`).toBeGreaterThan(0)
    }
  })

  it('⭐ the 正 of each row is the rule the routing is keyed on', () => {
    // Why: the shell picks a row by the rule that refused, so a moved authority
    // cell has to move the routing rather than leave RS-10 behind.
    expect(authorityOf(RS_55)).toContain('HM-4')
    expect(authorityOf(RS_56)).toContain('FR-009')
    expect(authorityOf(RS_57)).toContain('IV-1')
    expect(authorityOf(RS_58)).toContain('IV-10')
  })

  it('⛔ the dictionary gives no two of these rows the same words', () => {
    // Why: without this every case below is vacuous: telling RS-55 and telling
    // RS-10 would be indistinguishable.
    const spelled = [RS_10, RS_55, RS_56, RS_57, RS_58].map((row) => wordsOf(row).ja)
    expect(new Set(spelled).size).toBe(spelled.length)
  })

  it('⭐ table T-016 still edits the two items these cases settle a value in', () => {
    expect(columnsOf('PR-47')).toEqual(['finish'])
    expect(columnsOf('PR-15')).toEqual(['parentTaskUid'])
  })
})

// Why: RS-56 is not asserted: FR-009's three prohibitions share one rule, so
// the pair cannot be told apart without row IDs or AG-9a's finer class.
describe('DFC-411 / table T-037: a write refusal is told its own row and not RS-10', () => {
  it('⭐⭐ RS-55: a parent task that is the task itself carries HM-4s own row, which table T-233 does not show (CR-712), and never RS-10', () => {
    // Why: a person who typed one uid into one field has nothing to take out, so
    // RS-10's next step is wrong for them.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle({
      row: 'PR-15',
      key: { holder: 'task', uid: task.uid, column: 'parentTaskUid' },
      text: String(task.uid),
    })

    const told = one.notices().map((notice) => notice.text)
    expect(told, 'DFC-411: the refusal fell back to RS-10').not.toContain(wordsOf(RS_10).ja)
    expect(told, 'RS-55 is hidden (表 T-233 の表示の仕方)').toEqual([])
    expect(mannerOf(RS_55)).toBe('NT-1')
  })

  it('⭐⭐ RS-58: a finish before the start is told IV-10s own row', () => {
    const document = templateDocument()
    const task = firstTask(document)
    expect(task.start, 'the bundled template gives its first Task a start').not.toBeNull()
    const one = loopWith(document)

    one.settle({
      row: 'PR-47',
      key: { holder: 'task', uid: task.uid, column: 'finish' },
      text: aYearBefore(task.start as string),
    })

    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_58).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_10).ja)
    expect(told[0]?.manner).toBe(mannerOf(RS_58))
  })

  it('⛔ THE CONTROL: a value the write accepts is told nothing at all', () => {
    // Why: without this, a build that told RS-58 on every settled date would pass.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle({
      row: 'PR-47',
      key: { holder: 'task', uid: task.uid, column: 'finish' },
      text: task.finish as string,
    })

    expect(one.notices().length).toBe(0)
  })
})

describe('DFC-406 / table T-233: a write IV-2 refuses is told the row whose 正 names IV-2', () => {
  it('⭐⭐ a parent task naming a uid the document does not hold is told RS-82, not RS-10', () => {
    // Why: the same command as the RS-55 case, refused on IV-2 instead, so the two
    // cases differ by the rule alone, which is what the routing reads.
    expect(unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')))
      .toContain(FR_076_A_T_220_REFUSAL_CARRIES_ITS_ROW)
    expect(authorityOf(RS_82)).toContain('IV-2')
    const document = templateDocument()
    const task = firstTask(document)
    const absent = Math.max(...document.schedule.tasks.map((one) => one.uid)) + 1000
    const one = loopWith(document)

    one.settle({
      row: 'PR-15',
      key: { holder: 'task', uid: task.uid, column: 'parentTaskUid' },
      text: String(absent),
    })

    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_82).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_10).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_55).ja)
    expect(told[0]?.manner).toBe(mannerOf(RS_82))
  })
})
