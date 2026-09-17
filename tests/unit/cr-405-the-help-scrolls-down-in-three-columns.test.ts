// CR-405: the help lays its blocks out in the three columns of T-256, lists T-255, and scrolls down only.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput, KeyInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  emptyScreenState,
  screenStateWithSurface,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  DisplayLanguage,
  OpenModal,
  ScreenSession,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { openModalFromScreenState } from '../../src/adapter/screen-renderer/open-modals'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import {
  oneByRole,
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
  ['FR-036 (MUST) -- two blocks, and only those two, carry a heading', 'この 2 つの塊にだけ見出しを刷ること（MUST）'],
  ['T-255 (MUST NOT) -- a row whose combination T-036 holds is not listed', '表 T-036 のいずれかの行が同じ組を `割当` に持つ本表の行を、ヘルプに載せてはならない（MUST NOT）'],
  ['T-255 (MUST NOT) -- no row of T-255 is placed in T-036', '本表の行を 表 T-036 に置いてはならない（MUST NOT）'],
  ['FR-036 (MUST) -- blocks go to the columns T-256 names', '塊をどの段に、どの順で置くかは 表 T-256 に従うこと（MUST）'],
  ['T-256 (MUST) -- columns stand left to right in row order', '⭐ 段は本表の行の順に左から並べること（MUST）'],
  ['FR-036 (MUST) -- as many columns as S-202 and T-256 rows', 'その数と 表 T-256 の行の数を一致させること（MUST）'],
  ['FR-036 (MUST) -- no flowing into columns', '段へは流し込まずに、表 T-256 が名指す段へ塊を置くこと（MUST）'],
  ['FR-036 (MUST) -- the box scrolls down', '⭐ 段が箱に入り切らないときは、ヘルプの箱を縦にスクロールさせること（MUST）'],
  ['FR-036 (MUST NOT) -- the box never scrolls sideways', '⛔ 横にスクロールさせてはならない（MUST NOT）'],
  ['FR-036 (MUST NOT) -- a column is not bound to the box height', '⛔ 段の高さを箱の高さで縛ってはならない（MUST NOT）'],
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

const combosOf = (cell: string): readonly string[] =>
  cell
    .split(' / ')
    .map((one) => one.replace(/`/g, '').replace(/\uff0b/g, '+').replace(/\s+/g, ''))
    .filter((one) => one !== '')

const T_036_COMBOS = new Set(T_036.rows.flatMap((row) => combosOf(row.by[H_KEYS] ?? '')))

const isHeldByT036 = (row: string): boolean =>
  combosOf(rowOf(T_255, row).by[H_KEYS] ?? '').some((one) => T_036_COMBOS.has(one))

const LISTED_BROWSER_ROWS = T_255.rows.map((row) => row.id).filter((row) => !isHeldByT036(row))
const REFUSED_BROWSER_ROWS = T_255.rows.map((row) => row.id).filter((row) => isHeldByT036(row))

const plain = (cell: string): string => cell.replace(/[`*]/g, '').trim()

const S_202 = Number(bare(rowOf(T_206, 'S-202').by[H_DEFAULT] ?? ''))

const BASIC_ROWS = new Set([
  ...T_036.rows
    .filter((row) => plain(row.by[H_ENTRANCE] ?? '') === DASH && plain(row.by[H_KEYS] ?? DASH) !== DASH)
    .map((row) => row.id),
  'MK-2',
  'MK-5',
  'MK-7',
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
  if (!/^IC-\d+$/.test(row) || row === 'IC-52') return null
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
  it('T-256 holds HC-1 to HC-3, as many as S-202 says', () => {
    expect(T_256.rows.map((row) => row.id)).toEqual(['HC-1', 'HC-2', 'HC-3'])
    expect(S_202).toBe(T_256.rows.length)
  })

  it('T-256 names basics, browser, Row Title Panel, Resource Roster, then App Header, then Command Palette', () => {
    expect(COLUMNS).toEqual([
      [BASICS, BROWSER, 'Row Title Panel', 'Resource Roster'],
      ['App Header'],
      ['Command Palette'],
    ])
  })

  it('T-255 holds BF-1 and BF-2, and T-036 holds none of their ids', () => {
    expect(T_255.rows.map((row) => row.id)).toEqual(['BF-1', 'BF-2'])
    for (const row of T_255.rows) expect(T_036.rows.map((one) => one.id)).not.toContain(row.id)
  })

  it('with SK-17 moved to Ctrl + Shift + 0, no row of T-255 is refused and BF-1 and BF-2 are listed', () => {
    expect(T_036_COMBOS.has('Ctrl+0'), 'SK-17 no longer holds Ctrl + 0').toBe(false)
    expect(REFUSED_BROWSER_ROWS).toEqual([])
    expect(LISTED_BROWSER_ROWS).toEqual(['BF-1', 'BF-2'])
    expect(combosOf(rowOf(T_255, 'BF-1').by[H_KEYS] ?? '')).toEqual(['Ctrl++', 'Ctrl+-'])
  })

  it('no row of T-036 holds a combination of BF-1, so MK-10 has nothing of it to stop', () => {
    for (const combo of combosOf(rowOf(T_255, 'BF-1').by[H_KEYS] ?? '')) expect(T_036_COMBOS.has(combo)).toBe(false)
  })
})

const THEME_HUE = Number(bare(rowOf(specTable('T-216'), 'S-73').by[H_DEFAULT] ?? ''))

const sessionOf = (language: DisplayLanguage): ScreenSession => ({
  language,
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
})

const EMPTY_DOCUMENT = {
  project: {
    id: null, name: null, title: null, subject: null, category: null, company: null,
    manager: null, author: null, created: null, revision: null, lastSaved: null,
    startDate: null, statusDate: null, minutesPerDay: null, minutesPerWeek: null,
    daysPerMonth: null, weekStartDay: null, calendarUid: null, themeHue: THEME_HUE,
    uidHighWaterMark: 0, importSeq: 0, carry: {}, carryElements: [],
  },
  calendars: [], tasks: [], resources: [], assignments: [], taskGroups: [],
  taskGroupMembers: [], taskVisuals: [], commentBoxes: [], highlightBoxes: [],
  taskOrigins: [], baselineTasks: [],
} as unknown as Schedule

const HELP_SURFACE = 'Help Modal'

function helpModal(language: DisplayLanguage): OpenModal {
  const state = screenStateWithSurface(emptyScreenState(), HELP_SURFACE)
  const modal = openModalFromScreenState(state, EMPTY_DOCUMENT, sessionOf(language))
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
    documentTitle: null, openedFileName: null, fileSavedAt: null,
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

function drawnHelp(language: DisplayLanguage = 'en'): FakeElement {
  const built = wire(THEME, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, language, openModal: helpModal(language) })
  return oneByRole(built.root(), HELP_SURFACE)
}

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
  const entries = entriesOf(helpModal('en'))

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

  it('carries BF-1 with the spelling of its T-255 cell and no glyph', () => {
    const entry = entries.find((one) => rowIdOf(one) === 'BF-1')
    expect(entry, 'BF-1 is not in the help').toBeDefined()
    const keys = typeof entry?.['keys'] === 'string' ? (entry['keys'] as string) : ''
    expect(combosOf(keys)).toEqual(combosOf(rowOf(T_255, 'BF-1').by[H_KEYS] ?? ''))
    expect(entry?.['glyphs'] ?? []).toEqual([])
    expect(entry?.['icon'] ?? null).toBeNull()
  })

  it('carries exactly two headings: one ahead of the basics block and one ahead of the browser block', () => {
    const headings = entries.filter((one) => one['kind'] === 'heading')
    expect(headings, JSON.stringify(headings)).toHaveLength(2)
    expect(entries.indexOf(headings[0] as Entry)).toBe(0)
    const firstBrowser = entries.findIndex((one) => blockOfEntry(one) === BROWSER)
    expect(firstBrowser).toBeGreaterThan(0)
    expect(entries.indexOf(headings[1] as Entry)).toBe(firstBrowser - 1)
  })

  it('FR-038 holds a heading word for the browser block, and words for BF-1, in both languages', () => {
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
    expect(headings, 'helpHeadings holds the basics heading and one more').toHaveLength(2)
    for (const heading of headings) {
      expect(heading.text['ja'] ?? '').not.toBe('')
      expect(heading.text['en'] ?? '').not.toBe('')
    }
  })

  it.skip('T-255 (MUST NOT): with SK-17 moved off Ctrl + 0 in a copy of the manuscript, BF-2 is listed -- open: needs the roster generator run against a modified manuscript, which a unit case cannot do', () => {})
})

describe('FR-036 + T-256 (MUST) -- the page: three columns placed by T-256, not flowed', () => {
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

describe('FR-036 (MUST / MUST NOT) -- the help box scrolls down and never sideways', () => {
  it('a box between the columns and the help surface scrolls vertically', () => {
    const help = drawnHelp()
    const { container } = columnsOf(help)
    const chain = chainFrom(container, help)
    expect(chain.some((one) => scrollsOn(one, 'y')), chain.map(whatWasDrawn).join('\n').slice(0, 800)).toBe(true)
  })

  it('no box from the help surface down to the columns scrolls horizontally', () => {
    const help = drawnHelp()
    const { container, columns } = columnsOf(help)
    const chain = [...chainFrom(container, help), ...columns]
    const sideways = chain.filter((one) => scrollsOn(one, 'x'))
    expect(sideways.map((one) => [...styleMap(one)].map(([k, v]) => `${k}:${v}`).join(';'))).toEqual([])
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
