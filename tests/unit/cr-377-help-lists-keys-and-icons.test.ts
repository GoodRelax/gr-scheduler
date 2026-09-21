// Change-confirming cases for CR-377: the help lists keys and icons.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type {
  DisplayLanguage,
  OpenModal,
  ScreenViewReadings,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { openModalFromSession } from '../../src/adapter/screen-renderer/open-modals'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  iconEntry,
  oneByRole,
  selfAndDescendants,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, bareAll, specTable, type SpecTable } from '../contract/spec-table'

const H_ENTRANCE = String.fromCodePoint(0x5165, 0x53e3)
const H_KEYS = String.fromCodePoint(0x5272, 0x5f53)
const H_ARM = String.fromCodePoint(0x69cb, 0x3048)
const H_SURFACE = String.fromCodePoint(0x9762)
const H_DEFAULT = String.fromCodePoint(0x65e2, 0x5b9a)
const DASH = String.fromCodePoint(0x2014)

const T_109 = specTable('T-109')
const T_036 = specTable('T-036')
const T_023 = specTable('T-023')
const T_255 = specTable('T-255')
const T_012 = specTable('T-012')
const T_206 = specTable('T-206')
const HIDDEN_BY_TOUCH = ['T-023a', 'T-023b', 'T-023c', 'T-023d'].map((id) => specTable(id))

function rowOf(table: SpecTable, id: string): { readonly by: Readonly<Record<string, string>>; readonly cells: readonly string[] } {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} no longer has row ${id}`)
  return found
}

function entrancesInCell(cell: string): readonly string[] {
  const written = cell.replace(/`/g, '').trim()
  if (written === DASH) return []
  return written.split('/').map((one) => one.trim())
}

const LEGEND_ROW = 'IC-102'
const MILESTONE_LIST_ROW = 'IC-50'
const HELP_SURFACE = bare(rowOf(T_109, LEGEND_ROW).by[H_SURFACE] ?? '')

const surfaceNamesOf = (id: string): readonly string[] => bareAll(rowOf(T_109, id).by[H_SURFACE] ?? '')

const ARMED_MILESTONES = T_109.rows
  .filter((row) => (row.by[H_ARM] ?? '').replace(/`/g, '').trim() === 'AR-3')
  .map((row) => row.id)

const ALWAYS_SHOWN = Number.parseFloat(bare(rowOf(T_206, 'S-216').by[H_DEFAULT] ?? ''))

const BASIC_KEY_ROWS = T_036.rows
  .filter((row) => entrancesInCell(row.by[H_ENTRANCE] ?? '').length === 0)
  .filter((row) => (row.by[H_KEYS] ?? '').replace(/`/g, '').trim() !== DASH)
  .map((row) => row.id)

const BASIC_MOUSE_ROWS = ['MK-2', 'MK-5', 'MK-7'] as const

// see FR-036, T-036
const assignmentsIn = (cell: string): readonly (readonly string[])[] =>
  cell
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)

// see FR-036, T-036
const spelledOnScreen = (cell: string): string =>
  assignmentsIn(cell)
    .map((keys) => keys.join(' \uff0b '))
    .join(' \uff0f ')

const combosOf = (cell: string): readonly string[] => assignmentsIn(cell).map((keys) => keys.join('+'))

const T_036_COMBOS = new Set(T_036.rows.flatMap((row) => combosOf(row.by[H_KEYS] ?? '')))

// see FR-036, T-255
const LISTED_BROWSER_ROWS = T_255.rows
  .filter((row) => !combosOf(row.by[H_KEYS] ?? '').some((one) => T_036_COMBOS.has(one)))
  .map((row) => row.id)

const KEY_DRIVERS = T_036.rows
  .map((row) => ({ row: row.id, icons: entrancesInCell(row.by[H_ENTRANCE] ?? ''), cell: row.by[H_KEYS] ?? '' }))
  .filter((one) => one.icons.length > 0)

const MOUSE_DRIVERS = T_023.rows
  .map((row) => ({ row: row.id, icons: entrancesInCell(row.by[H_ENTRANCE] ?? '') }))
  .filter((one) => one.icons.length > 0)

const ROW_TITLE_PANEL_ORDER = [
  'IC-92', 'IC-78', 'IC-74', 'IC-93',
  'IC-59', 'IC-90', 'IC-77', 'IC-58', 'IC-82', 'IC-91', 'IC-60',
] as const

const AFTER_OPEN = ['IC-71', 'IC-72', 'IC-73', 'IC-95', 'IC-96', 'IC-97'] as const

const BLOCK_OF_SURFACE: Readonly<Record<string, number>> = {
  'Row Title Panel': 1,
  'Resource Roster': 2,
  'App Header': 3,
  'Open Chooser': 3,
  'Difference Review': 3,
  'Command Palette': 4,
}

interface Words {
  readonly icons: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string>; readonly hint: Record<DisplayLanguage, string> }[]
  readonly paletteGroups: readonly { readonly firstRow: string; readonly name: Record<DisplayLanguage, string> }[]
  readonly shortcuts: readonly { readonly rowId: string; readonly text: Record<DisplayLanguage, string> }[]
  readonly assignments: readonly {
    readonly rowId: string
    readonly text: Record<DisplayLanguage, string>
    readonly press?: Record<DisplayLanguage, string>
  }[]
}

const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as Words

const iconWords = (row: string, language: DisplayLanguage): readonly string[] => {
  const held = WORDS.icons.find((one) => one.rowId === row)
  if (held === undefined) throw new Error(`the dictionary holds no entry for ${row}`)
  return [held.label[language], held.hint[language]].filter((one) => one !== '')
}

interface GlyphPart {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

const GLYPHS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'dom-screen-surface', 'icon-glyphs.json'), 'utf8'),
) as { readonly glyphs: readonly { readonly rowId: string; readonly elements: readonly GlyphPart[] }[] }

const THEME_HUE = Number(bare(rowOf(specTable('T-216'), 'S-73').by[H_DEFAULT] ?? ''))

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

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

function helpModal(language: DisplayLanguage): OpenModal {
  const root: ScreenSession = {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      language,
      openSurfaceState: { kind: 'open', surfaceName: HELP_SURFACE },
    },
  }
  const modal = openModalFromSession(root, EMPTY_DOCUMENT, READINGS)
  if (modal === null) throw new Error('the help is open but UF-66 describes nothing')
  return modal
}

type Item = Readonly<Record<string, unknown>>

function entriesOf(modal: OpenModal): readonly Item[] {
  const out: Item[] = []
  const visit = (value: unknown, key: string | null): void => {
    if (key === 'commands') return
    if (Array.isArray(value)) {
      for (const one of value) visit(one, null)
      return
    }
    if (value === null || typeof value !== 'object') return
    const record = value as Item
    const isItem = 'text' in record && ('icon' in record || 'icons' in record || 'keys' in record || 'press' in record)
    if (isItem) {
      out.push(record)
      return
    }
    for (const [name, inner] of Object.entries(record)) visit(inner, name)
  }
  visit(modal, null)
  return out
}

const stringsIn = (value: unknown): readonly string[] =>
  typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((one): one is string => typeof one === 'string') : []

function entrancesOf(item: Item): readonly string[] {
  const named = [...stringsIn(item['icon']), ...stringsIn(item['icons']), ...stringsIn(item['row'])]
  return [...new Set(named.filter((one) => /^IC-\d+$/.test(one)))]
}

const keysOf = (item: Item): string => stringsIn(item['keys']).join(' ')
const pressOf = (item: Item): string => stringsIn(item['press']).join(' ')
const rowIdOf = (item: Item): string => (typeof item['row'] === 'string' ? item['row'] : '')
const describeItem = (item: Item): string => JSON.stringify(item)

const LISTED_ROWS = new Set([...T_109.rows, ...T_036.rows, ...T_023.rows, ...T_255.rows].map((row) => row.id))

const isListedRow = (entry: Item): boolean => LISTED_ROWS.has(rowIdOf(entry)) || entrancesOf(entry).length > 0

const itemsOf = (modal: OpenModal): readonly Item[] => entriesOf(modal).filter(isListedRow)

function theItemOf(items: readonly Item[], icon: string): Item {
  const holding = items.filter((one) => entrancesOf(one).includes(icon))
  expect(holding.length, `${icon} stands on ${holding.length} help items`).toBe(1)
  return holding[0] as Item
}

const THEME: ScreenTheme = { preference: 'light', hue: THEME_HUE }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null, openedFileName: null, fileSavedAt: null,
    fileNeverSavedText: '', commands: [], language: 'ja',
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

const HEADING_TOKEN = 'HelpHeadingTokenForCr377'

function drawnHelp(language: DisplayLanguage): FakeElement {
  const built = wire(THEME, { 'App Header': 37 })
  const modal = { ...helpModal(language), heading: HEADING_TOKEN } as OpenModal
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, language, openModal: modal })
  return oneByRole(built.root(), HELP_SURFACE)
}

function innermostShowing(root: FakeElement, text: string): readonly FakeElement[] {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  return showing.filter((one) => !one.children.some((child) => child.textContent.includes(text)))
}

function theNodeShowing(root: FakeElement, candidates: readonly string[]): FakeElement {
  for (const text of candidates) {
    const found = innermostShowing(root, text)
    if (found.length === 1) return found[0] as FakeElement
  }
  throw new Error(`no single node shows any of ${JSON.stringify(candidates)}: ${whatWasDrawn(root)}`)
}

const GEOMETRY_IGNORED = new Set(['style', 'class'])

function isGlyphOf(svg: FakeElement, rowId: string): boolean {
  const glyph = GLYPHS.glyphs.find((one) => one.rowId === rowId)
  if (glyph === undefined) throw new Error(`the generated glyph file draws nothing for ${rowId}`)
  const parts = selfAndDescendants(svg).slice(1)
  if (parts.length !== glyph.elements.length) return false
  return glyph.elements.every((element, at) => {
    const part = parts[at] as FakeElement
    if (part.tagName !== element.tag.toUpperCase()) return false
    return element.attributes
      .filter((one) => !GEOMETRY_IGNORED.has(one.name))
      .every((one) => part.getAttribute(one.name) === one.value)
  })
}

const svgsIn = (root: FakeElement): readonly FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.tagName === 'SVG')

function nearestHolding(from: FakeElement, holds: (node: FakeElement) => boolean): FakeElement {
  let at: FakeElement | null = from
  while (at !== null) {
    if (holds(at)) return at
    at = at.parentNode
  }
  throw new Error('no ancestor holds what was asked')
}

function commonAncestor(one: FakeElement, other: FakeElement): FakeElement {
  const chain = new Set<FakeElement>()
  for (let at: FakeElement | null = other; at !== null; at = at.parentNode) chain.add(at)
  for (let at: FakeElement | null = one; at !== null; at = at.parentNode) if (chain.has(at)) return at
  throw new Error('the two nodes share no ancestor')
}

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

describe('CR-377 premises read from the manuscript', () => {
  it('the legend row stands on the help, and the armed-milestone rows exist', () => {
    expect(HELP_SURFACE).toBe('Help Modal')
    expect(ARMED_MILESTONES.length).toBeGreaterThan(ALWAYS_SHOWN)
    expect(Number.isInteger(ALWAYS_SHOWN) && ALWAYS_SHOWN > 1).toBe(true)
  })

  it('the armed-milestone rows of T-109 follow the SH-5 shape order', () => {
    const shapes = (rowOf(T_012, 'SH-5').cells[0] ?? '').trim().split(/\s+/)
    const first = rowOf(T_109, ARMED_MILESTONES[0] as string).by
    const last = rowOf(T_109, ARMED_MILESTONES[ALWAYS_SHOWN - 1] as string).by
    const describedBy = (by: Readonly<Record<string, string>>): string => Object.values(by).join(' ')
    expect(describedBy(first)).toContain(shapes[0] as string)
    expect(describedBy(last)).toContain(shapes[ALWAYS_SHOWN - 1] as string)
  })

  it('each zoom key row names exactly one entrance, and no key row names two', () => {
    const zoom = ['SK-16', 'SK-16b', 'SK-16a', 'SK-16c'].map((id) => entrancesInCell(rowOf(T_036, id).by[H_ENTRANCE] ?? ''))
    for (const named of zoom) expect(named.length).toBe(1)
    expect(new Set(zoom.flat()).size).toBe(4)
    for (const one of KEY_DRIVERS) expect(one.icons.length, one.row).toBe(1)
  })

  it('the fixed copies still match T-109', () => {
    const panel = T_109.rows.filter((row) => surfaceNamesOf(row.id).includes('Row Title Panel')).map((row) => row.id)
    expect([...panel].sort()).toEqual([...ROW_TITLE_PANEL_ORDER].sort())
    for (const icon of AFTER_OPEN) {
      expect(['Open Chooser', 'Difference Review']).toContain(surfaceNamesOf(icon)[0])
    }
    for (const row of BASIC_MOUSE_ROWS) expect(entrancesInCell(rowOf(T_023, row).by[H_ENTRANCE] ?? '')).toEqual([])
  })
})

describe('CR-377 roster: what the help lists', () => {
  const items = itemsOf(helpModal('ja'))

  it('every T-109 row but the legend and the folded milestones is the entrance of exactly one item', () => {
    const folded = new Set(ARMED_MILESTONES)
    for (const row of T_109.rows) {
      if (row.id === LEGEND_ROW || folded.has(row.id)) continue
      const holding = items.filter((one) => entrancesOf(one).includes(row.id))
      expect(holding.length, `${row.id} stands on ${holding.length} items`).toBe(1)
    }
  })

  it('the legend row is not an entrance of any item', () => {
    for (const item of items) expect(entrancesOf(item), describeItem(item)).not.toContain(LEGEND_ROW)
  })

  it('the armed milestones and the list toggle are one item', () => {
    const item = theItemOf(items, MILESTONE_LIST_ROW)
    const allowed = new Set([...ARMED_MILESTONES, MILESTONE_LIST_ROW])
    for (const icon of entrancesOf(item)) expect(allowed.has(icon), icon).toBe(true)
    for (const other of items) {
      if (other === item) continue
      for (const icon of ARMED_MILESTONES) expect(entrancesOf(other), describeItem(other)).not.toContain(icon)
    }
  })

  it('the two entries that are no table row are the headings of the leading block and the browser block', () => {
    const entries = entriesOf(helpModal('ja'))
    const others = entries.filter((one) => !isListedRow(one))
    expect(others.length, others.map(describeItem).join('\n')).toBe(2)
    for (const heading of others) {
      expect(entrancesOf(heading), describeItem(heading)).toEqual([])
      expect(keysOf(heading), describeItem(heading)).toBe('')
      expect(pressOf(heading), describeItem(heading)).toBe('')
    }
    expect(entries.indexOf(others[0] as Item)).toBe(0)
    const firstBrowser = entries.findIndex((one) => rowIdOf(one) === LISTED_BROWSER_ROWS[0])
    expect(firstBrowser, 'a row of T-255 is listed').toBeGreaterThan(0)
    expect(entries.indexOf(others[1] as Item)).toBe(firstBrowser - 1)
  })

  it('carries exactly the item count the named tables add up to', () => {
    const expected =
      T_109.rows.length - 1 - ARMED_MILESTONES.length + BASIC_KEY_ROWS.length + BASIC_MOUSE_ROWS.length +
      LISTED_BROWSER_ROWS.length
    expect(items.length).toBe(expected)
  })

  it('lists nothing from T-023a, T-023b, T-023c or T-023d, nor the unnamed T-023 rows', () => {
    const refused = new Set(HIDDEN_BY_TOUCH.flatMap((table) => table.rows.map((row) => row.id)))
    const named = new Set<string>([...BASIC_MOUSE_ROWS])
    for (const row of T_023.rows) if (!named.has(row.id)) refused.add(row.id)
    const refusedTables = new Set(HIDDEN_BY_TOUCH.map((table) => table.id))
    for (const item of items) {
      expect(refused.has(rowIdOf(item)), describeItem(item)).toBe(false)
      expect(refusedTables.has(String(item['table'] ?? '')), describeItem(item)).toBe(false)
    }
  })

  it('an assignment that names an entrance has no item of its own', () => {
    const driving = new Set([...KEY_DRIVERS, ...MOUSE_DRIVERS].map((one) => one.row))
    for (const item of items) expect(driving.has(rowIdOf(item)), describeItem(item)).toBe(false)
  })

  it('a key that names an entrance is carried on that entrance item', () => {
    for (const driver of KEY_DRIVERS) {
      const item = theItemOf(items, driver.icons[0] as string)
      const spans = [...driver.cell.matchAll(/`([^`]+)`/g)].map((one) => one[1] as string)
      expect(spans.length, driver.row).toBeGreaterThan(0)
      for (const span of spans) expect(keysOf(item), `${driver.row} on ${describeItem(item)}`).toContain(span)
    }
  })

  it('a mouse operation that names an entrance is carried on that entrance item', () => {
    for (const driver of MOUSE_DRIVERS) {
      for (const icon of driver.icons) {
        expect(pressOf(theItemOf(items, icon)).trim(), `${driver.row} on ${icon}`).not.toBe('')
      }
    }
  })

  it('each zoom entrance carries only its own direction and modifier', () => {
    const cases = [
      { icon: 'IC-13', minus: false, modifier: 'Shift', other: 'Alt' },
      { icon: 'IC-12', minus: true, modifier: 'Shift', other: 'Alt' },
      { icon: 'IC-15', minus: false, modifier: 'Alt', other: 'Shift' },
      { icon: 'IC-14', minus: true, modifier: 'Alt', other: 'Shift' },
    ]
    for (const one of cases) {
      const keys = keysOf(theItemOf(items, one.icon))
      expect(keys.includes('-'), `${one.icon}: ${keys}`).toBe(one.minus)
      expect(keys, one.icon).toContain(one.modifier)
      expect(keys, one.icon).not.toContain(one.other)
    }
  })

  it('assignments without an entrance are the leading block, one item each and no glyph', () => {
    const basic = [...BASIC_KEY_ROWS, ...BASIC_MOUSE_ROWS]
    const lead = items.slice(0, basic.length)
    expect(lead.map(rowIdOf).sort()).toEqual([...basic].sort())
    for (const item of lead) expect(entrancesOf(item), describeItem(item)).toEqual([])
    for (const row of basic) expect(items.filter((one) => rowIdOf(one) === row).length, row).toBe(1)
  })

  it('the entrance blocks follow panel, roster, header, palette', () => {
    const sequence: number[] = []
    for (const item of items) {
      const icons = entrancesOf(item)
      if (icons.length === 0 || icons.includes('IC-52')) continue
      const blocks = new Set(icons.map((icon) => BLOCK_OF_SURFACE[surfaceNamesOf(icon)[0] ?? ''] ?? -1))
      expect(blocks.size, describeItem(item)).toBe(1)
      sequence.push([...blocks][0] as number)
    }
    expect(sequence).not.toContain(-1)
    expect(sequence).toEqual([...sequence].sort((a, b) => a - b))
  })

  it('the row title panel entrances stand in head order, then the row grid order', () => {
    const panel = new Set<string>(ROW_TITLE_PANEL_ORDER)
    const seen = items.flatMap((item) => entrancesOf(item).filter((icon) => panel.has(icon)))
    expect(seen).toEqual([...ROW_TITLE_PANEL_ORDER])
  })

  it('the six entrances of the faces after opening follow the open item directly', () => {
    const at = items.indexOf(theItemOf(items, 'IC-1'))
    const next = items.slice(at + 1, at + 1 + AFTER_OPEN.length).flatMap(entrancesOf)
    expect([...next].sort()).toEqual([...AFTER_OPEN].sort())
  })
})

describe('CR-377 page: how the help is drawn', () => {
  it('an item with a key reads glyph, explanation, key, and holds one glyph', () => {
    const help = drawnHelp('ja')
    const spelling = spelledOnScreen(rowOf(T_036, 'SK-10').by[H_KEYS] ?? '')
    expect(spelling, 'the SK-10 cell is Ctrl then O, one assignment').toBe('Ctrl \uff0b O')
    const keysNode = theNodeShowing(help, [spelling])
    const item = nearestHolding(keysNode, (node) => svgsIn(node).length > 0)
    const glyphs = svgsIn(item)
    expect(glyphs.length, whatWasDrawn(item)).toBe(1)
    expect(isGlyphOf(glyphs[0] as FakeElement, 'IC-1'), whatWasDrawn(item)).toBe(true)
    const explanation = theNodeShowing(item, iconWords('IC-1', 'ja'))
    const order = selfAndDescendants(item)
    expect(order.indexOf(explanation)).toBeGreaterThan(order.indexOf(glyphs[0] as FakeElement))
    expect(order.indexOf(keysNode)).toBeGreaterThan(order.indexOf(explanation))
  })

  it('the milestone item draws the first and last always-shown shapes and the list toggle', () => {
    const help = drawnHelp('ja')
    const wanted = [ARMED_MILESTONES[0] as string, ARMED_MILESTONES[ALWAYS_SHOWN - 1] as string, MILESTONE_LIST_ROW]
    const toggle = svgsIn(help).find((svg) => isGlyphOf(svg, MILESTONE_LIST_ROW))
    expect(toggle, whatWasDrawn(help)).toBeDefined()
    const words = iconWords(MILESTONE_LIST_ROW, 'ja')
    const item = nearestHolding(
      toggle as FakeElement,
      (node) => wanted.every((row) => svgsIn(node).some((svg) => isGlyphOf(svg, row))) && words.some((word) => node.textContent.includes(word)),
    )
    const glyphs = svgsIn(item)
    expect(glyphs.length, whatWasDrawn(item)).toBe(wanted.length)
    for (const row of wanted) expect(glyphs.some((svg) => isGlyphOf(svg, row)), row).toBe(true)
    const explanation = theNodeShowing(item, words)
    const order = selfAndDescendants(item)
    for (const svg of glyphs) expect(order.indexOf(explanation)).toBeGreaterThan(order.indexOf(svg))
  })

  it('a wheel assignment shows the legend glyph after the explanation and never the wheel word', () => {
    const help = drawnHelp('ja')
    const wheelWord = WORDS.icons.find((one) => one.rowId === LEGEND_ROW)?.label.ja ?? ''
    expect(wheelWord).not.toBe('')
    for (const icon of ['IC-12', 'IC-13', 'IC-14', 'IC-15']) {
      const own = iconWords(icon, 'ja')
      expect(own.join(' ')).not.toContain(wheelWord)
      const explanation = theNodeShowing(help, own)
      const item = nearestHolding(explanation, (node) => svgsIn(node).length > 0)
      const glyphs = svgsIn(item)
      const order = selfAndDescendants(item)
      const entrance = glyphs.find((svg) => isGlyphOf(svg, icon))
      const wheel = glyphs.find((svg) => isGlyphOf(svg, LEGEND_ROW))
      expect(entrance, `${icon}: ${whatWasDrawn(item)}`).toBeDefined()
      expect(wheel, `${icon}: ${whatWasDrawn(item)}`).toBeDefined()
      expect(order.indexOf(explanation)).toBeGreaterThan(order.indexOf(entrance as FakeElement))
      expect(order.indexOf(wheel as FakeElement)).toBeGreaterThan(order.indexOf(explanation))
      expect(item.textContent, icon).not.toContain(wheelWord)
    }
  })

  it('FR-036: IC-6 carries both assignments of SK-7 -- 1 つの項目に割当が 2 つ以上あるときは、割当と割当のあいだに `／`（全角の斜線）を、前後に半角の空白を 1 つずつ置いて並べること（MUST）', () => {
    const help = drawnHelp('ja')
    const driver = KEY_DRIVERS.find((one) => one.icons.includes('IC-6'))
    expect(driver?.row, 'T-036 no longer drives IC-6 from SK-7').toBe('SK-7')
    const wanted = spelledOnScreen(driver?.cell ?? '')
    expect(assignmentsIn(driver?.cell ?? ''), 'SK-7 holds two assignments').toHaveLength(2)
    const explanation = theNodeShowing(help, iconWords('IC-6', 'ja'))
    const item = nearestHolding(explanation, (node) => svgsIn(node).length > 0)
    expect(item.textContent, JSON.stringify(item.textContent)).toContain(wanted)
  })

  it('FR-036: a zoom entrance reads its key, then " \uff0f ", then its wheel word -- never a bare space between them', () => {
    const help = drawnHelp('ja')
    for (const icon of ['IC-12', 'IC-13', 'IC-14', 'IC-15']) {
      const keyRow = KEY_DRIVERS.find((one) => one.icons.includes(icon))
      const mouseRow = MOUSE_DRIVERS.find((one) => one.icons.includes(icon))
      expect(keyRow, `${icon} has no key row`).toBeDefined()
      expect(mouseRow, `${icon} has no mouse row`).toBeDefined()
      const keys = spelledOnScreen(keyRow?.cell ?? '')
      const press = WORDS.assignments.find((one) => one.rowId === mouseRow?.row)?.press?.ja ?? ''
      const pressHead = (press.split(`{${LEGEND_ROW}}`)[0] ?? '').trimEnd()
      expect(pressHead, `${icon}: the dictionary holds no wheel word`).not.toBe('')
      const explanation = theNodeShowing(help, iconWords(icon, 'ja'))
      const item = nearestHolding(explanation, (node) => svgsIn(node).length > 0)
      expect(item.textContent, `${icon}: ${JSON.stringify(item.textContent)}`).toContain(`${keys} \uff0f ${pressHead}`)
    }
  })

  it('the legend sits beside the title, apart from the list, with its glyph and word', () => {
    for (const language of LANGUAGES) {
      const help = drawnHelp(language)
      const word = WORDS.icons.find((one) => one.rowId === LEGEND_ROW)?.label[language] ?? ''
      expect(word, language).not.toBe('')
      const title = theNodeShowing(help, [HEADING_TOKEN])
      const legendWord = selfAndDescendants(help).find(
        (one) => one.textContent.trim() === word && !one.children.some((child) => child.textContent.trim() === word),
      )
      expect(legendWord, `${language}: ${whatWasDrawn(help)}`).toBeDefined()
      const row = commonAncestor(title, legendWord as FakeElement)
      expect(row, language).not.toBe(help)
      expect(svgsIn(row).some((svg) => isGlyphOf(svg, LEGEND_ROW)), `${language}: ${whatWasDrawn(row)}`).toBe(true)
      const listed = iconWords('IC-1', language)[0] ?? ''
      expect(row.textContent, language).not.toContain(listed)
    }
  })

  it('prints no palette group name', () => {
    for (const language of LANGUAGES) {
      const help = drawnHelp(language)
      const taken = new Set([
        ...WORDS.icons.flatMap((one) => [one.label[language], one.hint[language]]),
        ...WORDS.shortcuts.map((one) => one.text[language]),
        ...WORDS.assignments.map((one) => one.text[language]),
      ])
      for (const group of WORDS.paletteGroups) {
        const name = group.name[language]
        if (name === '' || taken.has(name)) continue
        const printed = selfAndDescendants(help).filter((one) => one.textContent.trim() === name)
        expect(printed.length, `${language} ${group.firstRow} "${name}"`).toBe(0)
      }
    }
  })
})

const DISPLAY_LANGUAGE_ICON = 'IC-21'

describe('JDG-81 -- help title row: legend, then language toggle, then close', () => {
  it('FR-036 (MUST): 閉じる入口（`IC-52`）の順に並べ、閉じる入口を右端に置くこと（MUST）', () => {
    for (const language of LANGUAGES) {
      const help = drawnHelp(language)
      const legendWordText = WORDS.icons.find((one) => one.rowId === LEGEND_ROW)?.label[language] ?? ''
      expect(legendWordText, language).not.toBe('')

      const title = theNodeShowing(help, [HEADING_TOKEN])
      const legendWord = selfAndDescendants(help).find(
        (one) =>
          one.textContent.trim() === legendWordText &&
          !one.children.some((child) => child.textContent.trim() === legendWordText),
      )
      expect(legendWord, `${language}: ${whatWasDrawn(help)}`).toBeDefined()

      const toggle = iconEntry(help, DISPLAY_LANGUAGE_ICON)
      const close = iconEntry(help, 'IC-52')

      const row = commonAncestor(commonAncestor(title, legendWord as FakeElement), commonAncestor(toggle, close))
      expect(row, `${language}: title row`).not.toBe(help)

      const order = selfAndDescendants(row)
      const legendAt = order.indexOf(legendWord as FakeElement)
      const toggleAt = order.indexOf(toggle)
      const closeAt = order.indexOf(close)

      expect(legendAt, `${language}: ${whatWasDrawn(row)}`).toBeLessThan(toggleAt)
      expect(toggleAt, `${language}: ${whatWasDrawn(row)}`).toBeLessThan(closeAt)
    }
  })
})
