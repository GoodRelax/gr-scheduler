// CR-405, CR-622, CR-635: the help lays its framed blocks out in the columns of T-256, lists T-255, and scrolls down.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { HumanInput, KeyInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import type {
  DisplayLanguage,
  HelpModal,
  OpenModal,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { helpModalFromSession } from '../../src/adapter/screen-renderer/open-modals'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import {
  oneByRole,
  resolved,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, bareAll, specTable, unbroken, type SpecTable } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-036 (MUST) -- the help also shows the rows of T-255', '下の 表 T-255 の行を示すこと（MUST）'],
  ['FR-036 (MUST) -- every block carries a heading (CR-635)', 'どの塊にも見出しを刷ること（MUST）'],
  ['T-255 (MUST NOT) -- a row whose combination T-036 holds is not listed', '表 T-036 のいずれかの行が同じ組を `割当` に持つ本表の行を、ヘルプに載せてはならない（MUST NOT）'],
  ['T-255 (MUST NOT) -- no row of T-255 is placed in T-036', '本表の行を 表 T-036 に置いてはならない（MUST NOT）'],
  ['FR-036 (MUST) -- blocks go to the columns T-256 names', '塊をどの段に、どの順で置くかは 表 T-256 に従うこと（MUST）'],
  ['T-256 (MUST) -- columns stand left to right in row order', '⭐ 段は本表の行の順に左から並べること（MUST）'],
  ['FR-036 (MUST) -- as many columns as S-202 and T-256 rows', 'その数と 表 T-256 の行の数を一致させること（MUST）'],
  ['FR-036 (MUST) -- no flowing into columns', '段へは流し込まずに、表 T-256 が名指す段へ塊を置くこと（MUST）'],
  ['FR-036 (MUST) -- the body region scrolls down', '⭐ 段が本文の領域に入り切らないときは、本文の領域を縦にスクロールさせること（MUST）'],
  ['FR-036 (MUST) -- opened at its default size, the body does not scroll sideways', '⭐ 開いたとき（表 T-335 の `WB-1` の既定の大きさ）は、段の並びを本文の領域の幅に収め、横にスクロールさせないこと（MUST）。'],
  ['FR-036 (MUST NOT) -- a column is not bound to the body region height', '⛔ 段の高さを本文の領域の高さで縛ってはならない（MUST NOT）'],
  ['FR-036 (MUST) -- every block in a frame of its own (CR-622)', '⭐ 塊を 1 つずつ枠で囲むこと（MUST）'],
  ['FR-036 (MUST) -- the frame line and every space around it (CR-622)', 'どれも `_assets/tbl-settings.md` の 表 T-206 の `S-457` とし、枠の線は 表 T-236 の `S-149` の色、表 T-206 の `S-437` の太さとすること（MUST）。'],
  ['FR-036 (MUST) -- group lines stay inside the Command Palette block (CR-622)', '`Command Palette` の塊の中の群の境目は、線で示すこと（MUST）。'],
  ['FR-036 (MUST NOT) -- the rows the help leaves off (CR-635)', '・`Holiday Settings`・`Dialogue Field` の面だけ（`Help Modal` を併せて持つものを含む）である行と、`IC-52`・`IC-53`・`IC-75` を、段に載せてはならない（MUST NOT）'],
  ['FR-036 (MUST) -- an assignment whose entrance is left off sits with the ones that have none (CR-637)', '⭐ 入口の項目が段に載らない割当は、上の「入口の項目の割当の場所に置く」に代えて、入口を持たない割当と同じ塊に置くこと（MUST）'],
]

describe('CR-405 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const H_KEYS = String.fromCodePoint(0x5272, 0x5f53)
const H_ENTRANCE = String.fromCodePoint(0x5165, 0x53e3)
const H_SURFACE = String.fromCodePoint(0x9762)
const H_DEFAULT = String.fromCodePoint(0x65e2, 0x5b9a)
const H_BLOCKS = String.fromCodePoint(0x7f6e, 0x304f, 0x584a)
const DASH = String.fromCodePoint(0x2014)
const ARROW = String.fromCodePoint(0x2192)
const NO_ENTRANCE_BLOCK = String.fromCodePoint(0x5165, 0x53e3, 0x3092, 0x6301, 0x305f, 0x306a, 0x3044, 0x5272, 0x5f53)

const T_036 = specTable('T-036')
const T_109 = specTable('T-109')
const T_255 = specTable('T-255')
const T_256 = specTable('T-256')
const T_206 = specTable('T-206')

const rowOf = (table: SpecTable, id: string) => {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// see FR-036, T-036, T-255
const assignmentsIn = (cell: string): readonly (readonly string[])[] =>
  cell
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)

const combosOf = (cell: string): readonly string[] => assignmentsIn(cell).map((keys) => keys.join('+'))

// see FR-036, T-255
const spelledOnScreen = (cell: string): string =>
  assignmentsIn(cell)
    .map((keys) => keys.join(' \uff0b '))
    .join(' \uff0f ')

const T_036_COMBOS = new Set(T_036.rows.flatMap((row) => combosOf(row.by[H_KEYS] ?? '')))

const isHeldByT036 = (row: string): boolean =>
  combosOf(rowOf(T_255, row).by[H_KEYS] ?? '').some((one) => T_036_COMBOS.has(one))

const LISTED_BROWSER_ROWS = T_255.rows.map((row) => row.id).filter((row) => !isHeldByT036(row))
const REFUSED_BROWSER_ROWS = T_255.rows.map((row) => row.id).filter((row) => isHeldByT036(row))

const plain = (cell: string): string => cell.replace(/[`*]/g, '').trim()

const S_202 = Number(bare(rowOf(T_206, 'S-202').by[H_DEFAULT] ?? ''))
const S_458 = Number.parseFloat(bare(rowOf(T_206, 'S-458').by[H_DEFAULT] ?? ''))

const LEFT_OFF_CLAUSE = CLAUSES.find(([name]) => name.includes('leaves off'))?.[1] ?? ''
const LEFT_OFF_AT = REQUIREMENTS.indexOf(LEFT_OFF_CLAUSE)
const LEFT_OFF_SENTENCE = REQUIREMENTS.slice(REQUIREMENTS.lastIndexOf('⛔ 表 T-109 のうち', LEFT_OFF_AT), LEFT_OFF_AT + LEFT_OFF_CLAUSE.length)
const LEFT_OFF_NAMES = [...LEFT_OFF_SENTENCE.matchAll(/`([^`]+)`/g)].map((found) => found[1] ?? '')
const LEFT_OFF_ICONS = LEFT_OFF_NAMES.filter((name) => /^IC-\d+$/.test(name))
const LEFT_OFF_SURFACES = LEFT_OFF_NAMES.filter((name) => !/^IC-\d+$/.test(name) && name !== H_SURFACE)

// see FR-036
function isLeftOff(row: string): boolean {
  if (LEFT_OFF_ICONS.includes(row)) return true
  return bareAll(rowOf(T_109, row).by[H_SURFACE] ?? '').every((surface) => LEFT_OFF_SURFACES.includes(surface))
}

const isOffTheHelpEntrance = (cell: string): boolean => /^IC-\d+$/.test(plain(cell)) && isLeftOff(plain(cell))

const BASIC_ROWS = new Set([
  ...T_036.rows
    .filter((row) => plain(row.by[H_KEYS] ?? DASH) !== DASH)
    .filter((row) => plain(row.by[H_ENTRANCE] ?? '') === DASH || isOffTheHelpEntrance(row.by[H_ENTRANCE] ?? ''))
    .map((row) => row.id),
  'MK-2',
  'MK-5',
  'MK-7',
  'MK-15',
  'MK-16',
])

const AFTER_OPENING: Readonly<Record<string, string>> = {
  'Open Chooser': 'App Header',
  'Difference Review': 'App Header',
}

const BROWSER = 'browser'
const BASICS = 'basics'

// see T-256
function blockOfRow(row: string): string | null {
  if (T_255.rows.some((one) => one.id === row)) return BROWSER
  if (BASIC_ROWS.has(row)) return BASICS
  if (!/^IC-\d+$/.test(row) || isLeftOff(row)) return null
  const first = bareAll(rowOf(T_109, row).by[H_SURFACE] ?? '')[0] ?? ''
  return AFTER_OPENING[first] ?? first
}

// see T-256
function blocksOfColumn(cell: string): readonly string[] {
  return cell.split(ARROW).map((part) => {
    if (part.includes(NO_ENTRANCE_BLOCK)) return BASICS
    if (part.includes('T-255')) return BROWSER
    return bare(part)
  })
}

const BLOCKS_HEADING = T_256.headings.find((one) => one.startsWith(H_BLOCKS)) ?? H_BLOCKS

const COLUMNS: readonly (readonly string[])[] = T_256.rows.map((row) => blocksOfColumn(row.by[BLOCKS_HEADING] ?? ''))
const BLOCK_ORDER: readonly string[] = COLUMNS.flat()

describe('CR-405 -- the premises read from the manuscript', () => {
  it('T-256 holds HC-1, HC-2, HC-4 and HC-3 in that order, as many as S-202 says', () => {
    expect(T_256.rows.map((row) => row.id)).toEqual(['HC-1', 'HC-2', 'HC-4', 'HC-3'])
    expect(S_202).toBe(T_256.rows.length)
  })

  it('T-256 names basics and browser, then App Header, then Row Title Panel, then Command Palette', () => {
    expect(COLUMNS).toEqual([[BASICS, BROWSER], ['App Header'], ['Row Title Panel'], ['Command Palette']])
  })

  it('FR-036 leaves off IC-52, IC-53, IC-75 and the rows of the surfaces it names, and puts SK-8 with the basics', () => {
    expect(LEFT_OFF_ICONS).toEqual(['IC-52', 'IC-53', 'IC-75'])
    expect(LEFT_OFF_SURFACES).toContain('Search Panel')
    expect(LEFT_OFF_SURFACES).not.toContain('Row Title Panel')
    expect(BASIC_ROWS.has('SK-8')).toBe(true)
  })

  it('T-255 holds BF-1 and BF-2, and T-036 holds none of their ids', () => {
    expect(T_255.rows.map((row) => row.id)).toEqual(['BF-1', 'BF-2'])
    for (const row of T_255.rows) expect(T_036.rows.map((one) => one.id)).not.toContain(row.id)
  })

  it('with the reset key retired (JDG-301), no row of T-255 is refused and BF-1 and BF-2 are listed', () => {
    expect(T_036_COMBOS.has('Ctrl+0'), 'no row of T-036 holds Ctrl + 0').toBe(false)
    expect(REFUSED_BROWSER_ROWS).toEqual([])
    expect(LISTED_BROWSER_ROWS).toEqual(['BF-1', 'BF-2'])
    expect(combosOf(rowOf(T_255, 'BF-1').by[H_KEYS] ?? '')).toEqual(['Ctrl++', 'Ctrl+-'])
  })

  it('no row of T-036 holds a combination of BF-1, so MK-10 has nothing of it to stop', () => {
    for (const combo of combosOf(rowOf(T_255, 'BF-1').by[H_KEYS] ?? '')) expect(T_036_COMBOS.has(combo)).toBe(false)
  })

  it('FR-036: 表 T-036 と 表 T-255 の `割当` の欄は、キーを 1 つずつコードの印で囲み、＋ で繋ぐ形（例: `Ctrl` ＋ `Shift` ＋ `0`）にそろえること（MUST）', () => {
    const misspelt: string[] = []
    for (const row of [...T_036.rows, ...T_255.rows]) {
      const cell = row.by[H_KEYS] ?? ''
      const spans = [...cell.matchAll(/`([^`]+)`/g)]
      for (const span of spans) if (/.\+./.test(span[1] ?? '')) misspelt.push(`${row.id}: ${span[0]}`)
      spans.slice(1).forEach((span, at) => {
        const before = spans[at]
        const between = cell.slice((before?.index ?? 0) + (before?.[0].length ?? 0), span.index).trim()
        if (between !== '\uff0b' && between !== '\uff0f') misspelt.push(`${row.id}: "${between}" between two keys`)
      })
    }
    expect(
      misspelt,
      '表 T-036 と 表 T-255 の `割当` の欄が 1 つの欄に 2 つ以上の割当を持つときも、同じ区切りで並べること（MUST）',
    ).toEqual([])
    expect(assignmentsIn(rowOf(T_255, 'BF-1').by[H_KEYS] ?? '')).toEqual([
      ['Ctrl', '+'],
      ['Ctrl', '-'],
    ])
  })
})

const THEME_HUE = Number(bare(rowOf(specTable('T-216'), 'S-73').by[H_DEFAULT] ?? ''))

const rootOf = (language: DisplayLanguage): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language },
})

const HELP_SURFACE = 'Help Modal'

function helpModal(language: DisplayLanguage): HelpModal {
  const root = rootOf(language)
  const opened = {
    ...root,
    screen: { ...root.screen, helpDisplayState: { kind: 'shown', child: { kind: 'normal' } } },
  } as unknown as ScreenSession
  const modal = helpModalFromSession(opened, { belowAppHeader: { x: 0, y: 37, width: 1280, height: 763 }, browserWindow: { x: 0, y: 0, width: 1280, height: 800 } })
  if (modal === null) throw new Error('the help is open but nothing describes it')
  return modal
}

type Entry = Readonly<Record<string, unknown>>

const entriesOf = (modal: OpenModal): readonly Entry[] => ((modal as unknown as { entries?: readonly Entry[] }).entries ?? []) as readonly Entry[]

const rowIdOf = (entry: Entry): string => (typeof entry['row'] === 'string' ? entry['row'] : '')

const blockOfEntry = (entry: Entry): string | null => {
  if (entry['kind'] === 'heading') return null
  const icons = Array.isArray(entry['glyphs']) ? (entry['glyphs'] as string[]) : []
  return blockOfRow(icons.length > 0 ? (icons[icons.length - 1] as string) : rowIdOf(entry))
}

const THEME: ScreenTheme = { preference: 'light', hue: THEME_HUE }

const EMPTY_VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null, openedFileName: null, fileSavedAt: null, fileSavedByteLength: null,
    fileNeverSavedText: '', commands: [], language: 'en',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

function helpStage(language: DisplayLanguage = 'en'): { readonly built: ReturnType<typeof wire>; readonly help: FakeElement } {
  const built = wire(THEME, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, language, helpModal: helpModal(language) })
  return { built, help: oneByRole(built.root(), HELP_SURFACE) }
}

const drawnHelp = (language: DisplayLanguage = 'en'): FakeElement => helpStage(language).help

const itemNodesOf = (help: FakeElement): readonly FakeElement[] =>
  selfAndDescendants(help).filter((one) => one.getAttribute('data-row') !== null && one.getAttribute('data-table') !== null)

function commonAncestor(nodes: readonly FakeElement[]): FakeElement {
  const chainOf = (from: FakeElement): FakeElement[] => {
    const chain: FakeElement[] = []
    for (let at: FakeElement | null = from; at !== null; at = at.parentNode) chain.push(at)
    return chain
  }
  const [first, ...rest] = nodes
  if (first === undefined) throw new Error('no nodes to join')
  return chainOf(first).find((candidate) => rest.every((one) => candidate.contains(one))) as FakeElement
}

interface Columns {
  readonly container: FakeElement
  readonly columns: readonly FakeElement[]
  readonly blocksByColumn: readonly (readonly string[])[]
}

// see FR-036, T-256
function columnsOf(help: FakeElement): Columns {
  const items = itemNodesOf(help).filter((one) => blockOfRow(one.getAttribute('data-row') ?? '') !== null)
  if (items.length === 0) throw new Error(`the help draws no item carrying data-row: ${whatWasDrawn(help)}`)
  const container = commonAncestor(items)
  const columns = container.children.filter((child) => items.some((one) => child.contains(one)))
  const blocksByColumn = columns.map((column) => {
    const seen: string[] = []
    for (const one of items) {
      if (!column.contains(one)) continue
      const block = blockOfRow(one.getAttribute('data-row') ?? '') as string
      if (seen[seen.length - 1] !== block) seen.push(block)
    }
    return seen
  })
  return { container, columns, blocksByColumn }
}

describe('FR-036 + T-256 (MUST) -- the roster the help is described from', () => {
  let entries: readonly Entry[] = []
  beforeAll(() => {
    entries = entriesOf(helpModal('en'))
  })

  it('lists the blocks in the order T-256 names them, column by column', () => {
    const sequence: string[] = []
    for (const entry of entries) {
      const block = blockOfEntry(entry)
      if (block === null) continue
      if (sequence[sequence.length - 1] !== block) sequence.push(block)
    }
    expect(sequence).toEqual([...BLOCK_ORDER])
  })

  it('names on every entry the row of T-256 whose column holds its block', () => {
    const wrong: string[] = []
    entries.forEach((entry, index) => {
      const block =
        entry['kind'] === 'heading'
          ? entries.slice(index + 1).map(blockOfEntry).find((one) => one !== null) ?? null
          : blockOfEntry(entry)
      if (block === null) return
      const wanted = T_256.rows[COLUMNS.findIndex((column) => column.includes(block))]?.id
      if (entry['column'] !== wanted) wrong.push(`${rowIdOf(entry)} in ${block}: ${String(entry['column'])} (wanted ${wanted})`)
    })
    expect(wrong).toEqual([])
  })

  it('lists every row of T-255 that T-036 does not hold, once, and none that it does', () => {
    for (const row of LISTED_BROWSER_ROWS) {
      expect(entries.filter((one) => rowIdOf(one) === row), row).toHaveLength(1)
    }
    for (const row of REFUSED_BROWSER_ROWS) {
      expect(entries.filter((one) => rowIdOf(one) === row), `${row} shares a combination with T-036`).toHaveLength(0)
    }
  })

  it('carries BF-1 with the spelling of its T-255 cell, its two assignments joined by " \uff0f ", and no glyph', () => {
    const entry = entries.find((one) => rowIdOf(one) === 'BF-1')
    expect(entry, 'BF-1 is not in the help').toBeDefined()
    const keys = typeof entry?.['keys'] === 'string' ? (entry['keys'] as string) : ''
    expect(keys).toBe(spelledOnScreen(rowOf(T_255, 'BF-1').by[H_KEYS] ?? ''))
    expect(entry?.['glyphs'] ?? []).toEqual([])
    expect(entry?.['icon'] ?? null).toBeNull()
  })

  it('carries one heading ahead of every block, in the order T-256 names the blocks, and no other', () => {
    const headings = entries.filter((one) => one['kind'] === 'heading')
    expect(headings.map(rowIdOf)).toEqual([...BLOCK_ORDER])
    expect(entries.indexOf(headings[0] as Entry)).toBe(0)
    for (const heading of headings) {
      const next = entries.slice(entries.indexOf(heading) + 1).map(blockOfEntry).find((one) => one !== null)
      expect(next, `the heading ${rowIdOf(heading)}`).toBe(rowIdOf(heading))
      expect(heading['text'], `the heading ${rowIdOf(heading)} has no word`).not.toBe('')
    }
  })

  it('lists no row FR-036 leaves off, and lists SK-8 in the basics block', () => {
    const listed = entries.filter((one) => one['kind'] !== 'heading').map(rowIdOf)
    expect(listed.filter((row) => /^IC-\d+$/.test(row) && isLeftOff(row))).toEqual([])
    expect(entries.find((one) => rowIdOf(one) === 'SK-8')?.['block']).toBe(BASICS)
  })

  it('FR-038 holds a heading word for every block, and words for BF-1, in both languages', () => {
    const words = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
    ) as Record<string, unknown>
    const texts: { rowId?: string; block?: string; text?: Record<string, string> }[] = Object.values(words)
      .filter((one): one is unknown[] => Array.isArray(one))
      .flat() as { rowId?: string; block?: string; text?: Record<string, string> }[]
    const bf1 = texts.filter((one) => one.rowId === 'BF-1')
    expect(bf1, 'no dictionary entry for BF-1').toHaveLength(1)
    expect(bf1[0]?.text?.['ja'] ?? '').not.toBe('')
    expect(bf1[0]?.text?.['en'] ?? '').not.toBe('')
    const headings = (words['helpHeadings'] ?? []) as { block: string; text: Record<string, string> }[]
    expect(headings.map((one) => one.block), 'helpHeadings holds one heading per block').toEqual([...BLOCK_ORDER])
    for (const heading of headings) {
      expect(heading.text['ja'] ?? '').not.toBe('')
      expect(heading.text['en'] ?? '').not.toBe('')
    }
  })

  it.skip('T-255 (MUST NOT): with a row of T-036 put on Ctrl + 0 in a copy of the manuscript, BF-2 is refused -- open: needs the roster generator run against a modified manuscript, which a unit case cannot do', () => {})
})

describe('FR-036 + T-256 (MUST) -- the page: the columns placed by T-256, not flowed', () => {
  it('draws every item with the data-row the system sweep reads, BF-1 included', () => {
    const rows = itemNodesOf(drawnHelp()).map((one) => one.getAttribute('data-row'))
    for (const row of LISTED_BROWSER_ROWS) expect(rows, row).toContain(row)
    for (const row of REFUSED_BROWSER_ROWS) expect(rows, row).not.toContain(row)
  })

  it('puts the items into exactly S-202 column boxes, one per row of T-256', () => {
    const { columns } = columnsOf(drawnHelp())
    expect(columns.length).toBe(S_202)
  })

  it('fills the columns left to right with the blocks T-256 names, top to bottom', () => {
    expect(columnsOf(drawnHelp()).blocksByColumn).toEqual(COLUMNS)
  })

  it('does not flow the blocks with CSS multi-column layout', () => {
    const help = drawnHelp()
    const { container, columns } = columnsOf(help)
    const flowing = [...selfAndDescendants(help)].filter((one) => {
      const style = styleMap(one)
      return ['column-count', 'columns', 'column-fill', 'column-width'].some((name) => (style.get(name) ?? '') !== '')
    })
    expect(flowing.map((one) => whatWasDrawn(one).slice(0, 200))).toEqual([])
    expect(columns.every((one) => one.parentNode === container)).toBe(true)
  })
})

const numberIn = (cell: string): number => Number(/\d+(?:\.\d+)?/.exec(bare(cell))?.[0] ?? Number.NaN)

const S_437_PX = numberIn(rowOf(T_206, 'S-437').by[H_DEFAULT] ?? '')
const S_457_EM = numberIn(rowOf(T_206, 'S-457').by[H_DEFAULT] ?? '')
const S_149_LIGHT = bare(rowOf(specTable('T-236'), 'S-149').by[String.fromCodePoint(0x660e, 0x308b, 0x3044, 0x30c6, 0x30fc, 0x30de)] ?? '')
  .replace('H', String(THEME_HUE))
  .replace(/\s+/g, '')
  .toLowerCase()

const isRuleLine = (one: FakeElement): boolean =>
  one.children.length === 0 && (one.textContent ?? '') === '' && styleMap(one).has('height') && styleMap(one).has('background')

// see FR-036, S-437, S-457
function frameOf(help: FakeElement, block: string): FakeElement | null {
  const { container } = columnsOf(help)
  const items = itemNodesOf(help).filter((one) => blockOfRow(one.getAttribute('data-row') ?? '') === block)
  const others = itemNodesOf(help).filter((one) => !items.includes(one))
  for (let at: FakeElement | null = commonAncestor(items); at !== null && at.parentNode !== container; at = at.parentNode) {
    if (others.some((one) => at?.contains(one))) return null
    if ((styleMap(at).get('border') ?? '') !== '') return at
  }
  return null
}

describe('FR-036 (MUST) -- every block stands in a frame of its own (CR-622)', () => {
  it('rules every block with S-437 px of S-149 and pads it S-457 em, inside one column', () => {
    const { built, help } = helpStage()
    for (const block of BLOCK_ORDER) {
      const frame = frameOf(help, block)
      if (frame === null) throw new Error(`the ${block} block has no frame of its own: ${whatWasDrawn(help).slice(0, 400)}`)
      const [width, kind, ...colour] = (styleMap(frame).get('border') ?? '').trim().split(/\s+/)
      expect(width, block).toBe(`${S_437_PX}px`)
      expect(kind, block).toBe('solid')
      expect(resolved(built, colour.join(' ')), block).toBe(S_149_LIGHT)
      expect(styleMap(frame).get('padding'), block).toBe(`${S_457_EM}em`)
    }
  })

  it('draws the group lines inside the Command Palette frame only, and no line between two frames', () => {
    const help = drawnHelp()
    for (const block of BLOCK_ORDER) {
      const frame = frameOf(help, block) as FakeElement
      const lines = selfAndDescendants(frame).filter(isRuleLine)
      if (block === 'Command Palette') expect(lines.length, block).toBeGreaterThan(0)
      else expect(lines.length, block).toBe(0)
    }
    const { columns } = columnsOf(help)
    expect(columns.flatMap((column) => column.children.filter(isRuleLine))).toEqual([])
  })
})

const scrollsOn = (element: FakeElement, axis: 'x' | 'y'): boolean => {
  const style = styleMap(element)
  const shorthand = (style.get('overflow') ?? '').trim().split(/\s+/)
  const fromShorthand = axis === 'x' ? shorthand[0] : (shorthand[1] ?? shorthand[0])
  const value = (style.get(`overflow-${axis}`) ?? fromShorthand ?? '').trim()
  return value === 'auto' || value === 'scroll'
}

const chainFrom = (from: FakeElement, to: FakeElement): readonly FakeElement[] => {
  const chain: FakeElement[] = []
  for (let at: FakeElement | null = from; at !== null; at = at.parentNode) {
    chain.push(at)
    if (at === to) break
  }
  return chain
}

const BOUNDING = ['height', 'max-height']

describe('FR-036 (MUST / MUST NOT) -- the help box scrolls down, and not sideways at its default size', () => {
  it('a box between the columns and the help surface scrolls vertically', () => {
    const help = drawnHelp()
    const { container } = columnsOf(help)
    const chain = chainFrom(container, help)
    expect(chain.some((one) => scrollsOn(one, 'y')), chain.map(whatWasDrawn).join('\n').slice(0, 800)).toBe(true)
  })

  // WHY: CR-621 E-14 lets the body scroll sideways once narrowed; the floor keeps the opened help from doing so.
  it('the body scrolls on both axes, and each column floors at min(S-458 em, the opened column width)', () => {
    const help = drawnHelp()
    const { container } = columnsOf(help)
    const chain = chainFrom(container, help)
    expect(chain.some((one) => scrollsOn(one, 'x') && scrollsOn(one, 'y')), chain.map(whatWasDrawn).join('\n').slice(0, 800)).toBe(true)
    const template = styleMap(container).get('grid-template-columns') ?? ''
    expect(template).toContain(`repeat(${S_202},minmax(min(${S_458}em,`)
  })

  it('neither the column boxes nor the box holding them is bound to a height', () => {
    const help = drawnHelp()
    const { container, columns } = columnsOf(help)
    const bound = [container, ...columns].filter(
      (one) =>
        BOUNDING.some((name) => (styleMap(one).get(name) ?? '') !== '') ||
        ['0', '0px'].includes((styleMap(one).get('min-height') ?? '').trim()),
    )
    expect(bound.map((one) => [...styleMap(one)].map(([k, v]) => `${k}:${v}`).join(';'))).toEqual([])
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Document

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

function idleLoop() {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null,
  }
  const loop = frameLoop({ showSvg: () => undefined } as unknown as Parameters<typeof frameLoop>[0], structuredClone(TEMPLATE), SCREEN, { surface, language: 'en' })
  for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  return loop
}

const ctrlKey = (key: string): HumanInput =>
  ({ kind: 'key', key, modifiers: { ctrl: true, shift: false, alt: false, meta: false } }) satisfies KeyInput

describe('T-255 + T-023 MK-10 (MUST NOT) -- the browser zoom keys stay the browser`s', () => {
  it.each(['+', '-'])('Ctrl + %s is not stopped', (key) => {
    expect(idleLoop().isBrowserDefaultStopped(ctrlKey(key))).toBe(false)
  })
})
