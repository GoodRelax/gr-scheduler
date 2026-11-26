// Contract tests: the name of the open file stands above the moment it was last written.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const THE_ORDER_MUST = '`GRS` は、ファイルの名前を時刻の上に置くこと。'

// Summary: settledName() returns the T-103 settled name of a row, which the unit writes as data-role.
function settledName(specTableRowId: string): string {
  const table = specTable('T-103')
  const COLUMN = '確定名（英）'
  if (!table.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  const row = table.rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-103 no longer has row ${specTableRowId}`)
  return bare(row.by[COLUMN] ?? '')
}

const U_58 = settledName('U-58')

const U_59 = settledName('U-59')

const U_31 = settledName('U-31')

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

// Why: the title, the file name and the never-saved text are three different words,
// so no case can pass by confusing the file name with the Document Title.
const HEADER_WITH_A_SAVED_FILE: AppHeaderItems = {
  ...EMPTY_HEADER,
  documentTitle: 'DocumentTitleHere',
  openedFileName: 'OpenedFileNameHere.grs.json',
  fileSavedAt: '2026-08-29T01:02:03Z',
  fileSavedByteLength: 48213,
  fileNeverSavedText: 'FileNeverSavedHere',
}

const HEADER_NEVER_SAVED: AppHeaderItems = {
  ...HEADER_WITH_A_SAVED_FILE,
  fileSavedAt: null,
  fileSavedByteLength: null,
}

// Why: the fake measures the App Header to a height, so BO-1's dimension is settled.
const HEADER_HEIGHT = { 'App Header': 37 }

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function drawn(header: AppHeaderItems): FakeElement {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, appHeaderItems: header })
  return built.root()
}

function commonAncestor(one: FakeElement, other: FakeElement): FakeElement {
  const upwards = (from: FakeElement): FakeElement[] => {
    const chain: FakeElement[] = []
    let at: FakeElement | null = from
    while (at !== null) {
      chain.push(at)
      at = at.parentNode
    }
    return chain
  }
  const theirs = new Set(upwards(other))
  for (const at of upwards(one)) if (theirs.has(at)) return at
  throw new Error('the two parts of FR-101 share no ancestor at all')
}

// Summary: stacksDownThePage() shall accept a box that states no layout, as normal flow stacks blocks down the page, and refuse a stated layout that is no downward stack.
function stacksDownThePage(box: FakeElement): { readonly stacked: boolean; readonly why: string } {
  const declared = styleMap(box)
  const value = (name: string): string => (declared.get(name) ?? '').trim().toLowerCase()

  const display = value('display')
  if (display === 'flex' || display === 'inline-flex') {
    const direction = value('flex-direction')
    if (direction === '') return { stacked: false, why: 'a flex box with no direction lays out in a ROW' }
    if (direction === 'column') return { stacked: true, why: 'flex-direction: column' }
    return { stacked: false, why: `flex-direction: ${direction}` }
  }
  if (display === 'grid' || display === 'inline-grid') {
    if (value('grid-auto-flow').startsWith('column')) {
      return { stacked: false, why: 'grid-auto-flow: column' }
    }
    const columns = value('grid-template-columns')
    if (columns !== '' && columns.split(/\s+/).length > 1) {
      return { stacked: false, why: `grid-template-columns: ${columns}` }
    }
    return { stacked: true, why: 'a grid that flows in rows' }
  }
  return { stacked: true, why: display === '' ? 'normal flow' : `display: ${display}` }
}

const orderStatedOn = (element: FakeElement): string =>
  (styleMap(element).get('order') ?? '').trim()

// Spec: FR-101, T-075, T-103
describe('the manuscripts still say what these cases read', () => {
  it('⭐ FR-101 still puts the name above the time', () => {
    expect(REQUIREMENTS).toContain(THE_ORDER_MUST)
  })

  it('⭐ the design still hands that MUST to UF-71, which is the unit driven here', () => {
    const at = DESIGN.indexOf('| UF-71 |')
    expect(at, '表 T-075 still has a row for UF-71').toBeGreaterThanOrEqual(0)
    const row = DESIGN.slice(at, DESIGN.indexOf('\n', at))
    expect(row).toContain('FR-101')
  })

  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: a parse that read the wrong column would make every case below look for
    // a part that is not there.
    expect(U_58).toBe('Opened File Name')
    expect(U_59).toBe('File Saved At')
    expect(U_31).toBe('App Header')
  })
})

// Why: no row states the distance, the spelling of the moment or their relative
// size, so the cases assert the order alone.
// Spec: FR-101, U-58, U-59, EP-1
describe('FR-101 (MUST) -- the name stands above the time', () => {
  it('⭐ both parts are drawn, each exactly once', () => {
    // Why: the control case; a header that drew neither part would pass every
    // ordering case below by vacuity.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)

    expect(oneByRole(root, U_58).textContent).toContain('OpenedFileNameHere.grs.json')
    expect(oneByRole(root, U_59).textContent.length).toBeGreaterThan(0)
  })

  it('⛔ MUST: the name comes before the time in the document', () => {
    // Why: the fake has no layout engine, so this case checks document order and
    // the next one checks that the box holding the two stacks down the page.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)
    const order = selfAndDescendants(root)

    const name = order.indexOf(oneByRole(root, U_58))
    const time = order.indexOf(oneByRole(root, U_59))

    expect(name).toBeGreaterThanOrEqual(0)
    expect(time, `the header reads ${whatWasDrawn(oneByRole(root, U_31))}`).toBeGreaterThan(name)
  })

  it('⛔ MUST: the box holding the two stacks them down the page', () => {
    // Why: a box that lays its children out in a row puts the name beside the
    // moment, and the document-order case above still passes.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)
    const box = commonAncestor(oneByRole(root, U_58), oneByRole(root, U_59))

    const { stacked, why } = stacksDownThePage(box)
    expect(stacked, `the box holding the name and the time: ${why}`).toBe(true)
  })

  it('⛔ MUST NOT: neither part is pulled out of that order by `order`', () => {
    // Why: `order` moves a flex or grid child away from document order, so a stated
    // order could draw the time first while both cases above pass.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)

    const nameOrder = orderStatedOn(oneByRole(root, U_58))
    const timeOrder = orderStatedOn(oneByRole(root, U_59))

    expect(nameOrder, 'the two are left where the document put them').toBe(timeOrder)
  })

  it('⭐ the same order holds when the file has never been written to', () => {
    const root = drawn(HEADER_NEVER_SAVED)
    const order = selfAndDescendants(root)

    const name = order.indexOf(oneByRole(root, U_58))
    const time = order.indexOf(oneByRole(root, U_59))

    expect(time, `the header reads ${whatWasDrawn(oneByRole(root, U_31))}`).toBeGreaterThan(name)
    expect(oneByRole(root, U_59).textContent).toContain('FileNeverSavedHere')
  })
})
