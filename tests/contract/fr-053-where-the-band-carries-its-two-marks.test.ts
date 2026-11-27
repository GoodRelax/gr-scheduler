// Contract tests: the grab band carries IC-53 at its right end and IC-75 to its right.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  PaletteGroup,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  byRole,
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
// Why: the contract reader takes its copy from the .md at read time, so a
// row that moves in the specification moves here too.
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const THE_PLACEMENT_MUST =
  '`GRS` は、掴み帯の右端に、掴めることを示す 表 T-109 の `IC-53` を置くこと。'

const THE_BAND_STAYS = '`GRS` は、掴み帯そのものを取り去らないこと。'

const U_26 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.by['確定名（英）'] ?? '')
})()

const IC_GRAB_MARKER = 'IC-53'
const IC_MINIMIZE = 'IC-75'

// Why: the column heading is checked, so a renamed column fails here
// instead of handing the premise below an empty string.
const IC_75_CELL = ((): string => {
  const table = specTable('T-109')
  const COLUMN = '何の入口か'
  if (!table.headings.includes(COLUMN)) {
    throw new Error(`table T-109 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  const row = table.rows.find((one) => one.id === IC_MINIMIZE)
  if (row === undefined) throw new Error('table T-109 no longer has row IC-75')
  return row.by[COLUMN] ?? ''
})()

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: patch.icon,
  ...patch,
})

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

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

// Why: grabBandHeight is this file's own number and no case means it; the
// height is S-135a's, and this unit owes only where the marks sit.
const paletteWith = (patch: Partial<CommandPalette> = {}): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: 24,
    minimize: command({ icon: IC_MINIMIZE }),
    isMinimized: false,
    groups: [
      {
        name: 'PaletteGroupOne',
        commands: [command({ icon: 'IC-61', label: 'PaletteCommandOne' })],
      } as PaletteGroup,
    ],
    armedText: 'ArmedWordHere',
    ...patch,
  }) as CommandPalette

// Why: the App Header must measure to something, so BO-1's dimension is settled.
const HEADER_HEIGHT = { 'App Header': 37 }

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function drawn(palette: CommandPalette): { built: Stage; palette: FakeElement } {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ commandPalette: palette }))
  return { built, palette: oneByRole(built.root(), U_26) }
}

const marksIn = (root: FakeElement): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') !== null)

function markOf(root: FakeElement, icon: string): FakeElement {
  const found = marksIn(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) {
    throw new Error(`nothing under this part carries data-icon="${icon}": ${whatWasDrawn(root)}`)
  }
  if (found.length !== 1) throw new Error(`${found.length} nodes carry data-icon="${icon}"`)
  return first
}

// Why: found by what it holds, not by a name: no row names a node for the
// band, so the palette's child that contains the marks is the band.
function bandHolding(palette: FakeElement, mark: FakeElement): FakeElement {
  let at: FakeElement | null = mark
  while (at !== null && at.parentNode !== palette) at = at.parentNode
  if (at === null) {
    throw new Error(`this mark is not inside the palette at all: ${whatWasDrawn(palette)}`)
  }
  return at
}

const orderIn = (root: FakeElement): FakeElement[] => selfAndDescendants(root)

// Why: every spelling a browser honors is accepted because no row picks the
// property; a box that states nothing is the left end, so it does not count.
const ENDS_RIGHT = new Set(['right', 'end', 'flex-end', 'last baseline'])

function pushedToTheRightEnd(mark: FakeElement, band: FakeElement): boolean {
  let at: FakeElement | null = mark
  while (at !== null) {
    const declared = styleMap(at)
    const value = (name: string): string => (declared.get(name) ?? '').trim().toLowerCase()

    if (value('float') === 'right') return true
    if (value('margin-left') === 'auto' && value('margin-right') !== 'auto') return true
    if (value('margin') !== '' && /^auto\s+0/.test(value('margin'))) return true
    if (
      value('right') !== '' &&
      value('left') === '' &&
      ['absolute', 'fixed', 'relative', 'sticky'].includes(value('position'))
    ) {
      return true
    }
    for (const name of ['justify-content', 'text-align', 'place-content', 'justify-items']) {
      const stated = value(name)
      if (stated !== '' && ENDS_RIGHT.has(stated)) return true
      // Why: a box that states another placement has answered, and not with the
      // right end; walking on is only past silence.
      if (stated !== '' && at === band) return false
    }
    if (at === band) return false
    at = at.parentNode
  }
  return false
}

const howItWasLaidOut = (band: FakeElement): string =>
  selfAndDescendants(band)
    .map((one) => {
      const named = one.getAttribute('data-icon') ?? one.getAttribute('data-role') ?? one.tagName
      return `${named}{${[...styleMap(one)].map(([k, v]) => `${k}:${v}`).join(';')}}`
    })
    .join(' ; ')

describe('the manuscripts still say what these cases read', () => {
  it('⭐ FR-053 still places IC-53 at the band’s right end and IC-75 to its right', () => {
    expect(REQUIREMENTS).toContain(THE_PLACEMENT_MUST)
    expect(REQUIREMENTS).toContain(THE_BAND_STAYS)
  })

  it('⭐ table T-109 still says the same of IC-75, so the two do not disagree', () => {
    // Why: the row and the requirement are checked together so the cases are
    // not driven by one of two rules that drifted apart unnoticed.
    expect(IC_75_CELL).toContain('掴み帯の右端')
    expect(IC_75_CELL).toContain('IC-53')
  })

  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: a parse that picked up the wrong table would make the cases above
    // agree with anything.
    expect(U_26).toBe('Command Palette')
    expect(IC_75_CELL.length).toBeGreaterThan(0)
  })
})

// Spec: FR-053, GR-19
// Why: IC-75's own state is not asserted: EN-5 paints a toggle whose target is shown, and
// FR-053 makes minimized a kind of shown, not hidden, so EN-5 on it would mint a rule.
describe('FR-053 (MUST) -- the band carries IC-53 and IC-75, and nothing else', () => {
  it('⭐ both marks are drawn, on ONE band, which is a child of the palette', () => {
    // Why: nothing else asks where IC-75 is drawn, so a unit that described the
    // minimize entrance and drew it nowhere would pass every other bench.
    const { palette } = drawn(paletteWith())

    const grab = markOf(palette, IC_GRAB_MARKER)
    const minimize = markOf(palette, IC_MINIMIZE)

    expect(bandHolding(palette, grab), 'one band carries both marks').toBe(
      bandHolding(palette, minimize),
    )
  })

  it('⛔ IC-75 rides on the band and not among the palette’s entries (DFC-103)', () => {
    const { built, palette } = drawn(paletteWith())

    const minimize = markOf(palette, IC_MINIMIZE)
    for (const role of ['Palette Groups', 'Palette Commands']) {
      for (const box of byRole(built.root(), role)) {
        expect(
          selfAndDescendants(box).includes(minimize),
          `IC-75 is not inside a ${role} box`,
        ).toBe(false)
      }
    }
  })

  it('⛔ MUST: IC-53 sits at the band’s RIGHT END', () => {
    // Why: no layout engine here can say where a box landed, so the case asks
    // that the band or the mark states that its content ends at the right edge.
    const { palette } = drawn(paletteWith())

    const grab = markOf(palette, IC_GRAB_MARKER)
    const band = bandHolding(palette, grab)

    expect(
      pushedToTheRightEnd(grab, band),
      `IC-53 is not put at the band's right end: ${howItWasLaidOut(band)}`,
    ).toBe(true)
  })

  it('⛔ MUST: IC-75 comes after IC-53, which is what 「その右に」 means', () => {
    // Why: this seam sees node order only; a band that pulled IC-75 back with
    // `order` or `row-reverse` would pass, and no row settles that property.
    const { palette } = drawn(paletteWith())

    const band = bandHolding(palette, markOf(palette, IC_GRAB_MARKER))
    const order = orderIn(band)

    const grabAt = order.indexOf(markOf(band, IC_GRAB_MARKER))
    const minimizeAt = order.indexOf(markOf(band, IC_MINIMIZE))

    expect(grabAt).toBeGreaterThanOrEqual(0)
    expect(minimizeAt, `the band reads ${howItWasLaidOut(band)}`).toBeGreaterThan(grabAt)
  })

  it('⛔ nothing of table T-109 is drawn to the right of IC-75 on the band', () => {
    // Why: only rows of table T-109 are asked about: whether the band may carry
    // anything else is settled for the minimized state only.
    const { palette } = drawn(paletteWith())

    const band = bandHolding(palette, markOf(palette, IC_GRAB_MARKER))
    const drawnMarks = marksIn(band).map((one) => one.getAttribute('data-icon'))

    expect(drawnMarks, `the band reads ${howItWasLaidOut(band)}`).toEqual([
      IC_GRAB_MARKER,
      IC_MINIMIZE,
    ])
  })
})

describe('FR-053 (MUST) -- minimizing moves neither mark', () => {
  const MINIMIZED = paletteWith({ isMinimized: true, groups: [], armedText: null })

  it('⭐ the band still carries both, in the same order', () => {
    // Why: another bench asks only that both are there, in either order; this
    // one asks the order.
    const { palette } = drawn(MINIMIZED)

    const band = bandHolding(palette, markOf(palette, IC_GRAB_MARKER))
    const drawnMarks = marksIn(band).map((one) => one.getAttribute('data-icon'))

    expect(drawnMarks, `the minimized band reads ${howItWasLaidOut(band)}`).toEqual([
      IC_GRAB_MARKER,
      IC_MINIMIZE,
    ])
  })

  it('⛔ MUST: IC-53 is still at the right end when the palette is minimized', () => {
    // Why: FR-053 states the placement once and carves out no exception, so a
    // second layout path for the minimized band would be drift.
    const { palette } = drawn(MINIMIZED)

    const grab = markOf(palette, IC_GRAB_MARKER)
    const band = bandHolding(palette, grab)

    expect(
      pushedToTheRightEnd(grab, band),
      `IC-53 is not put at the band's right end: ${howItWasLaidOut(band)}`,
    ).toBe(true)
  })
})

describe('FR-053 / FR-102 (DFC-785 MUST) -- a recording palette shows IC-76 pressed on its minimized band', () => {
  const RECORDING = paletteWith({
    isMinimized: true,
    groups: [],
    armedText: null,
    bandRecord: command({ icon: 'IC-76', isPressed: true }),
  })

  it('IC-76 stands once on the band, ahead of IC-75, and reads as pressed', () => {
    const { palette } = drawn(RECORDING)

    const band = bandHolding(palette, markOf(palette, IC_GRAB_MARKER))
    const order = orderIn(band)
    const record = markOf(band, 'IC-76')

    expect(order.indexOf(record), `the band reads ${howItWasLaidOut(band)}`).toBeLessThan(order.indexOf(markOf(band, IC_MINIMIZE)))
    expect(record.getAttribute('aria-pressed') ?? '', 'IC-76 is pressed while the record runs').toBe('true')
  })

  it('the same palette without a record to show carries no IC-76', () => {
    const { palette } = drawn(paletteWith({ isMinimized: true, groups: [], armedText: null }))
    expect(marksIn(palette).some((one) => one.getAttribute('data-icon') === 'IC-76')).toBe(false)
  })
})
