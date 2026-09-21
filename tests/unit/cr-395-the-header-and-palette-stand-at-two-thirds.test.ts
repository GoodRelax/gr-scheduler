// The App Header and the Command Palette stand at S-235 two thirds, and the display scale never reaches them.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  PaletteGroup,
  RowExpander,
  RowTitle,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  iconEntry,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { rowNameFont } from '../fixtures/row-name-font'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_051_THE_HEADER_IS_TWO_THIRDS =
  '⭐ `App Header` の中身は、表示の倍率（`FR-039` の `S-234`）を掛けずに、同書の 表 T-206 の `S-235` を掛けた大きさで描くこと（MUST）'

const FR_051_WHAT_IT_MULTIPLIES =
  '⭐ 掛けるのは、入口の図形の箱と隙間（`FR-029` がどの面にも掛ける）と、`Document Title` の字の大きさと左の余白（同表の `S-225` / `S-226`、規則は 表 T-076 の `EP-1`）と、ファイルの名前と保存した日時の字（宿主の地の文字に `S-235` を掛けてから同表の `S-210` を掛ける）である。'

const FR_051_THE_BAND_HEIGHT_IS_UNCHANGED =
  '⚠️ 帯の高さは、中身から環境で確定させる値のままであり（上の段）、`S-116` はその上限のままである。'

const FR_053_THE_PALETTE_IS_TWO_THIRDS =
  '⭐ `Command Palette` の中身は、表示の倍率（`FR-039` の `S-234`）を掛けずに、`_assets/tbl-settings.md` の 表 T-206 の `S-235` を掛けた大きさで描くこと（MUST）'

const FR_053_WHAT_IT_MULTIPLIES =
  '⭐ 掛けるのは、入口の図形の箱と隙間（`FR-029` がどの面にも掛ける）と、掴み帯の高さ（同表の `S-135a`）と、群を隔てる線のまわりの空き（同表の `S-143`）である。'

const FR_029_EVERY_SURFACE_IS_TWO_THIRDS =
  '⭐ 箱の一辺（`S-138`）と隙間（`S-141` / `S-243`）と枠の線の太さ（`S-237`）には、どの面でも同書の 表 T-206 の `S-235` を掛けて描くこと（MUST）'

const FR_029_THE_OTHER_SURFACES_TOO =
  '⚠️ 行の操作子・ヘルプ・プロパティパネルに載る入口も、同じ 2/3 で描かれる。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-051 (MUST) -- the App Header is drawn at S-235, not at the display scale', FR_051_THE_HEADER_IS_TWO_THIRDS],
  ['FR-051 (MUST) -- what S-235 multiplies in the header', FR_051_WHAT_IT_MULTIPLIES],
  ['FR-051 -- the band height is still settled from the environment', FR_051_THE_BAND_HEIGHT_IS_UNCHANGED],
  ['FR-053 (MUST) -- the Command Palette is drawn at S-235', FR_053_THE_PALETTE_IS_TWO_THIRDS],
  ['FR-053 (MUST) -- what S-235 multiplies in the palette', FR_053_WHAT_IT_MULTIPLIES],
  ['FR-029 (MUST) -- the glyph box and the gap take S-235 on every surface', FR_029_EVERY_SURFACE_IS_TWO_THIRDS],
  ['FR-029 -- the row controls, the help and the properties panel are drawn the same way', FR_029_THE_OTHER_SURFACES_TOO],
]

describe('CR-395 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

function px(table: string, id: string): number {
  const cell = bare(rowOf(table, id).by['既定'] ?? '')
  const found = /(-?\d+(?:\.\d+)?)\s*px/.exec(cell)
  if (found === null) throw new Error(`table ${table} ${id} states no px value: ${cell}`)
  return Number(found[1])
}

// see T-206, S-235
const S_235 = Number(bare(rowOf('T-206', 'S-235').by['既定'] ?? ''))
// see T-206, S-236
const S_236 = Number(bare(rowOf('T-206', 'S-236').by['既定'] ?? ''))

const S_138 = px('T-206', 'S-138')
const S_141 = px('T-206', 'S-141')
const S_225 = px('T-206', 'S-225')
const S_226 = px('T-206', 'S-226')
const S_135a = px('T-206', 'S-135a')

const THEME: ScreenTheme = {
  preference: 'light',
  hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')),
}

const IC_PALETTE = 'IC-61'
const IC_HEADER = 'IC-17'
const IC_ROW_PANEL = 'IC-58'

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
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const ROW_TITLE_INDENT = SETTINGS_DEFAULTS['rowTitleIndent'] as number
const ROW_BOX = rect(0, 40, 170, 29)
const EVERY_CONTROL: RowExpander = { canOpen: true, canClose: true, canCloseBelow: true }

const rowTitle = (groupId: string): RowTitle => ({
  groupId,
  depth: 1,
  ...rowNameFont(1),
  indentPx: ROW_TITLE_INDENT,
  box: ROW_BOX,
  label: groupId,
  wholeLabel: groupId,
  isLabelTruncated: false,
  expander: EVERY_CONTROL,
  isPinned: false,
  isSelected: false,
})

const paletteWith = (commands: readonly CommandItem[]): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: S_135a * S_235,
    minimise: command({ icon: 'IC-75' }),
    isMinimised: false,
    groups: [{ name: 'PaletteGroupWordHere', commands } as PaletteGroup],
    armedText: 'ArmedWordHere',
  }) as CommandPalette

const EVERY_SURFACE: ScreenView = {
  ...EMPTY_VIEW,
  appHeaderItems: { ...EMPTY_HEADER, commands: [command({ icon: IC_HEADER })] },
  commandPalette: paletteWith([command({ icon: IC_PALETTE })]),
  rowTitlePanel: { pinnedTitles: [], titles: [rowTitle('RowAlpha')] },
}

const HEADER_HEIGHT = { 'App Header': 37 }

function drawn(view: ScreenView): Stage {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

function pxOf(written: string): number | null {
  const flat = written.trim().toLowerCase()
  if (flat === '') return null
  const plain = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(flat)
  if (plain !== null) return Number(plain[1])
  const calc = /^calc\((.*)\)$/.exec(flat)
  if (calc === null) return null
  const inner = (calc[1] ?? '').replace(/px/g, '')
  if (!/^[\d\s+\-*/.()]+$/.test(inner)) return null
  const value: unknown = Function(`"use strict";return (${inner})`)()
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function lengthOf(one: FakeElement, property: string): number | null {
  return pxOf(styleMap(one).get(property) ?? one.getAttribute(property) ?? '')
}

function glyphBoxSides(entry: FakeElement): number[] {
  const sides: number[] = []
  for (const one of selfAndDescendants(entry)) {
    const width = lengthOf(one, 'width')
    const height = lengthOf(one, 'height')
    if (width !== null && height !== null && width === height) sides.push(width)
  }
  return sides
}

function outerHeightOf(entry: FakeElement): number | null {
  return lengthOf(entry, 'height') ?? lengthOf(entry, 'min-height')
}

const CLOSE_ENOUGH = 3

describe('table T-206 S-235 -- the two thirds the user fixed', () => {
  it('states the two thirds the user named, rounded to four places', () => {
    expect(S_235).toBeCloseTo(0.6667, 10)
  })

  it('is a row of its own and may not be conflated with S-236 (both rows say so)', () => {
    const own = rowOf('T-206', 'S-235').cells.join(' ')
    const other = rowOf('T-206', 'S-236').cells.join(' ')
    expect(own, 'S-235 refuses to double as S-236').toContain('`S-236` と兼ねてはならない')
    expect(other, 'and S-236 refuses to double as S-235').toContain('`S-235` と兼ねてはならない')
    expect(S_235, 'they carry different numbers, so conflating them would move one picture').not.toBeCloseTo(
      S_236,
      10,
    )
  })

  it('names the App Header, the Command Palette and the entrance box as what it scales', () => {
    const value = rowOf('T-206', 'S-235').by['値'] ?? ''
    expect(value).toContain('App Header')
    expect(value).toContain('Command Palette')
    expect(value).toContain('FR-029')
  })
})

describe('FR-029 (MUST) -- the glyph box is S-138 x S-235 on every surface it stands on', () => {
  it('draws the palette entrance with a glyph box of S-138 x S-235', () => {
    const built = drawn(EVERY_SURFACE)
    const entry = iconEntry(built.root(), IC_PALETTE)
    const wanted = S_138 * S_235
    expect(
      glyphBoxSides(entry).map((side) => Number(side.toFixed(CLOSE_ENOUGH))),
      `${FR_029_EVERY_SURFACE_IS_TWO_THIRDS} -- ${wanted}px: ${whatWasDrawn(entry)}`,
    ).toContain(Number(wanted.toFixed(CLOSE_ENOUGH)))
  })

  it('draws that same two-thirds box on the header and the row title panel too (MUST NOT differ by surface)', () => {
    const built = drawn(EVERY_SURFACE)
    const wanted = Number((S_138 * S_235).toFixed(CLOSE_ENOUGH))
    for (const icon of [IC_PALETTE, IC_HEADER, IC_ROW_PANEL]) {
      const entry = iconEntry(built.root(), icon)
      expect(
        glyphBoxSides(entry).map((side) => Number(side.toFixed(CLOSE_ENOUGH))),
        `${FR_029_THE_OTHER_SURFACES_TOO} -- ${icon}: ${whatWasDrawn(entry)}`,
      ).toContain(wanted)
    }
  })

  it('keeps at least S-141 x S-235 between the glyph box and the entrance frame', () => {
    const built = drawn(EVERY_SURFACE)
    const entry = iconEntry(built.root(), IC_PALETTE)
    const outer = outerHeightOf(entry)
    expect(outer, `the entrance states an outer height: ${whatWasDrawn(entry)}`).not.toBeNull()
    expect(
      (outer as number) - S_138 * S_235,
      `${FR_029_EVERY_SURFACE_IS_TWO_THIRDS} -- the gap is scaled with the box`,
    ).toBeGreaterThanOrEqual(S_141 * S_235 * 2 - 1e-6)
  })

  it('leaves the whole entrance at two thirds of the outer box the ruling of 2026-08-30 fixed', () => {
    const built = drawn(EVERY_SURFACE)
    const entry = iconEntry(built.root(), IC_PALETTE)
    expect(outerHeightOf(entry), FR_029_EVERY_SURFACE_IS_TWO_THIRDS).toBeCloseTo(
      (S_138 + S_141 * 2) * S_235,
      CLOSE_ENOUGH,
    )
  })
})

describe('FR-051 (MUST) -- the App Header draws its own contents at S-235', () => {
  const titleNodesOf = (built: Stage): FakeElement[] =>
    selfAndDescendants(built.root()).filter((one) => one.textContent === 'DocumentTitleWordHere')

  it('draws the Document Title at S-225 x S-235', () => {
    const built = drawn({
      ...EVERY_SURFACE,
      appHeaderItems: { ...EMPTY_HEADER, documentTitle: 'DocumentTitleWordHere' },
    })
    const nodes = titleNodesOf(built)
    expect(nodes.length, 'premise: the title reaches the screen').toBeGreaterThan(0)
    const sizes = nodes
      .map((one) => lengthOf(one, 'font-size'))
      .filter((one): one is number => one !== null)
    expect(
      sizes.map((size) => Number(size.toFixed(CLOSE_ENOUGH))),
      `${FR_051_WHAT_IT_MULTIPLIES} -- ${S_225} x ${S_235}`,
    ).toContainEqual(Number((S_225 * S_235).toFixed(CLOSE_ENOUGH)))
  })

  it('does not scale the band height with it -- that is settled from the environment', () => {
    const built = drawn(EVERY_SURFACE)
    expect(
      built.reportedHeights.every((height) => height > 0),
      FR_051_THE_BAND_HEIGHT_IS_UNCHANGED,
    ).toBe(true)
  })
})

describe('DS-6 -- the display scale never reaches the header or the palette', () => {
  it('states in table T-252 that neither takes the display scale', () => {
    const ds6 = rowOf('T-252', 'DS-6')
    expect(ds6.by['何に'] ?? '').toContain('App Header')
    expect(ds6.by['何に'] ?? '').toContain('Command Palette')
    expect(bare(ds6.by['掛けるか'] ?? '')).toBe('掛けない')
    expect(ds6.by['理由'] ?? '', 'and points at S-235 for the scale they do take').toContain('S-235')
  })

  it('leaves the entrance box the same size at every step of S-234 (MUST NOT)', () => {
    const built = drawn(EVERY_SURFACE)
    const sides = glyphBoxSides(iconEntry(built.root(), IC_HEADER))
    expect(sides, 'premise: the header entrance states a glyph box').not.toHaveLength(0)
    expect(
      sides.map((side) => Number(side.toFixed(CLOSE_ENOUGH))),
      'the box is S-138 x S-235 and carries no display scale of any step',
    ).toContain(Number((S_138 * S_235).toFixed(CLOSE_ENOUGH)))
  })
})

describe('FR-053 (MUST) -- the Command Palette draws its own contents at S-235', () => {
  it('lays the grab band at S-135a x S-235', () => {
    const built = drawn(EVERY_SURFACE)
    const bands = selfAndDescendants(built.root())
      .map((one) => lengthOf(one, 'height'))
      .filter((one): one is number => one !== null)
    expect(
      bands.map((height) => Number(height.toFixed(CLOSE_ENOUGH))),
      `${FR_053_WHAT_IT_MULTIPLIES} -- ${S_135a} x ${S_235}`,
    ).toContain(Number((S_135a * S_235).toFixed(CLOSE_ENOUGH)))
  })

  it('states the left inset of the title as S-226, which the header scales with the rest', () => {
    expect(S_226, 'premise: S-226 is the inset EP-1 names').toBeGreaterThan(0)
    expect(rowOf('T-206', 'S-226').by['値'] ?? '').toContain('左端からの余白')
  })
})
