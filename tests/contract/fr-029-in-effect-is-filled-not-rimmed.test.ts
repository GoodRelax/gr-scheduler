// Contract tests: an entrance in effect is filled and knocked out, never rimmed.

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
  iconEntry,
  paintedColor,
  paintedGround,
  resolved,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
// Why: borrowed from the contract kind because it reads the .md at run time, so a moved row
// moves here too instead of going stale.
import { bare, specTable, unbroken } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// Why: the whole chapter and not one requirement: a premise asks that a sentence is still in it,
// not which UID holds it.
const CHAPTER_1_4 = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const STATE_COLUMN = '何が効いているか'
const FILL_COLUMN = '塗りの色'
const OWNER_COLUMN = '定める要求'

interface PaintRow {
  readonly id: string
  readonly by: Readonly<Record<string, string>>
}

// Why: the column names are checked because specTable does not check them, and a renamed column
// would hand every case an empty string.
const T_237_ROWS: readonly PaintRow[] = ((): readonly PaintRow[] => {
  const table = specTable('T-237')
  for (const column of [STATE_COLUMN, FILL_COLUMN, OWNER_COLUMN]) {
    if (!table.headings.includes(column)) {
      throw new Error(`表 T-237 no longer has a ${column} column: ${table.headings.join(' | ')}`)
    }
  }
  return table.rows
    .filter((row) => /^EN-\d+$/.test(row.id))
    .map((row) => ({ id: row.id, by: row.by }))
})()

function t237(enRow: string): PaintRow {
  const found = T_237_ROWS.find((one) => one.id === enRow)
  if (found === undefined) throw new Error(`表 T-237 has no row ${enRow}`)
  return found
}

const fillRowOf = (enRow: string): string => bare(t237(enRow).by[FILL_COLUMN] ?? '')

const THEMES: readonly ScreenTheme['preference'][] = ['light', 'dark']

const THEME_HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))

const themeOf = (preference: ScreenTheme['preference']): ScreenTheme => ({
  preference,
  hue: THEME_HUE,
})

// Summary: the helper returns one T-236 row as a rendering paints it, with the hue letter H filled in from S-73.
function t236(specTableRowId: string, preference: ScreenTheme['preference']): string {
  const row = rowOf('T-236', specTableRowId)
  const cell = bare(row.by[preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) {
    throw new Error(`表 T-236 ${specTableRowId} states no color for this rendering: ${cell}`)
  }
  return cell.replace('H', String(THEME_HUE)).replace(/\s+/g, '').toLowerCase()
}

const IC_ARMS_A_DEPENDENCY = 'IC-61'
const IC_LIGHTNING_LINE = 'IC-39'
const IC_PROPERTIES_PANEL = 'IC-17'

// Why: compared against a value `resolved` has lowercased and stripped of spaces,
// so rgb(255,255,255) is written without them.
const WHITE = new Set(['#fff', '#ffffff', 'white', 'rgb(255,255,255)', 'hsl(0,0%,100%)'])

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

const paletteWith = (commands: readonly CommandItem[]): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: 12,
    minimize: command({ icon: 'IC-75' }),
    isMinimized: false,
    groups: [{ name: 'PaletteGroupWordHere', commands } as PaletteGroup],
    armedText: 'ArmedWordHere',
  }) as CommandPalette

const paletteShowing = (entry: CommandItem): ScreenView =>
  viewWith({ commandPalette: paletteWith([entry]) })

const headerShowing = (entry: CommandItem): ScreenView =>
  viewWith({ appHeaderItems: { ...EMPTY_HEADER, commands: [entry] } })

// Why: the App Header must measure to something, or the dimension of BO-1 stays unsettled.
const HEADER_HEIGHT = { 'App Header': 37 }

function drawn(view: ScreenView, preference: ScreenTheme['preference']): Stage {
  const built = wire(themeOf(preference), HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

// Why: the whole entrance and not one node: no row says whether the filled box is the entrance,
// a node inside it or the svg's backing shape.
const groundsIn = (built: Stage, entry: FakeElement): Set<string> =>
  new Set(
    selfAndDescendants(entry)
      .map((one) => paintedGround(built, one))
      .filter((one) => one !== ''),
  )

// Why: the shapes take currentColor, so the entrance's own color is one ink and a shape's own
// fill or stroke is another; both are read.
function glyphInks(built: Stage, entry: FakeElement): Set<string> {
  const found = new Set<string>()
  for (const one of selfAndDescendants(entry)) {
    for (const property of ['color', 'fill', 'stroke']) {
      const written = styleMap(one).get(property)
      if (written !== undefined && written.trim() !== '') found.add(resolved(built, written))
    }
    for (const attribute of ['fill', 'stroke']) {
      const written = one.getAttribute(attribute)
      if (written !== null && written.trim() !== '') found.add(resolved(built, written))
    }
  }
  found.delete('')
  return found
}

// Why: the MUST NOT made measurable: the rim of an entrance in effect is compared with the rim of
// the same entrance not in effect, in border-color, border-width or the border shorthand.
const rimOf = (built: Stage, entry: FakeElement): string =>
  selfAndDescendants(entry)
    .map((one) => {
      const style = styleMap(one)
      const rim = [...style]
        .filter(([property]) => /^border/.test(property))
        .map(([property, value]) => `${property}:${resolved(built, value)}`)
        .sort()
        .join(';')
      return `${one.tagName}[${rim}]`
    })
    .join(' | ')

function entranceIn(built: Stage, icon: string): FakeElement {
  return iconEntry(built.root(), icon)
}

// Spec: FR-029, EN-1, EN-2, EN-3, EN-4, EN-5, S-146, S-183, S-185
describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // Why: without this, a parse that picked up the wrong column makes every case below agree with anything.
    expect(T_237_ROWS.map((row) => row.id)).toEqual(['EN-8', 'EN-1', 'EN-2', 'EN-3', 'EN-4', 'EN-5', 'EN-6', 'EN-7'])
    for (const preference of THEMES) {
      expect(t236('S-146', preference).length).toBeGreaterThan(0)
      expect(t236('S-183', preference).length).toBeGreaterThan(0)
      expect(t236('S-151', preference).length).toBeGreaterThan(0)
      // Why: a fill and a knockout that painted alike would make every case below pass on either color.
      expect(t236('S-183', preference), '表 T-236: the fill and the ground differ').not.toBe(
        t236('S-146', preference),
      )
      expect(t236('S-149', preference), '表 T-236: the rule color and the fill differ').not.toBe(
        t236('S-183', preference),
      )
    }
  })

  it('⭐ 表 T-237 still gives each state the color these cases drive with', () => {
    expect(fillRowOf('EN-1')).toBe('S-183')
    expect(fillRowOf('EN-2')).toBe('S-183')
    expect(fillRowOf('EN-3')).toBe('S-151')
    expect(fillRowOf('EN-4')).toBe('S-183')
    expect(fillRowOf('EN-5')).toBe('S-183')
    expect(fillRowOf('EN-6')).toBe('S-183')
  })

  it('⭐ 表 T-237 still hands each row to the requirement these cases drive it through', () => {
    expect(t237('EN-1').by[OWNER_COLUMN]).toContain('FR-053')
    expect(t237('EN-3').by[OWNER_COLUMN]).toContain('HF-6')
    expect(t237('EN-4').by[OWNER_COLUMN]).toContain('FR-072')
  })

  it('⛔ FR-029 still states the fill, the knockout and the two MUST NOTs', () => {
    expect(CHAPTER_1_4).toContain('入口がいま効いていることを示すとき、`GRS` は入口の枠の内側を塗りつぶすこと')
    expect(CHAPTER_1_4).toContain('`GRS` は、入口がいま効いていることを、縁の色や太さで示さないこと')
    expect(CHAPTER_1_4).toContain('`GRS` は、抜き色を白と直に書かないこと')
    expect(CHAPTER_1_4).toContain('入口がいま効いていることを示すとき、`GRS` は図形そのものを `_assets/tbl-settings.md` の 表 T-236 の `S-146`（地の色）で抜くこと')
    expect(CHAPTER_1_4).toContain('1 つの入口に 表 T-237 の行が 2 つ同時に当たるとき、`GRS` は 表 T-237 で上に並ぶ行を勝たせること')
  })

  it('⛔ 表 T-236 no longer carries `S-185`, the thickness CR-311 retired', () => {
    // Why: the retired row number stays empty, and a row that came back would mean the rim came back too.
    expect(specTable('T-236').rows.map((row) => row.id)).not.toContain('S-185')
  })

  it('⛔ the dark rendering of `S-146` is not white, which is why the MUST NOT bites', () => {
    // Why: in the light rendering S-146 is white, so the sentence only has force in the dark one.
    expect(WHITE.has(t236('S-146', 'dark'))).toBe(false)
  })
})

// Spec: FR-029, EN-1, FR-053, AR-4, S-183, S-146
// Why: no row says which ScreenView member carries which T-237 row, so EN-1 goes through isArmed
// (FR-053's word) and EN-2, EN-4 through isPressed (FR-072's); T-237 gives all three one color.
describe('FR-029 (MUST) -- an entrance that is in effect is FILLED, in both renderings', () => {
  for (const preference of THEMES) {
    it(`fills the glyph's box with 表 T-237 EN-1's color (${preference})`, () => {
      const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...groundsIn(built, entry)],
        `表 T-237 EN-1 asks for ${fillRowOf('EN-1')}: ${whatWasDrawn(entry)}`,
      ).toContain(t236(fillRowOf('EN-1'), preference))
    })

    it(`knocks the glyph out in S-146, the ground color (${preference})`, () => {
      const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...glyphInks(built, entry)],
        `the glyph is knocked out in S-146: ${whatWasDrawn(entry)}`,
      ).toContain(t236('S-146', preference))
    })

    it(`⛔ does NOT draw the glyph itself in the fill color (${preference})`, () => {
      // Why: the other half of the same MUST: a green glyph on an unpainted box is the reading the ruling rejected.
      const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        paintedColor(built, entry),
        `the entrance's own color is the knockout, not the fill: ${whatWasDrawn(entry)}`,
      ).not.toBe(t236(fillRowOf('EN-1'), preference))
    })
  }

  it('⛔ the knockout is not white in the dark rendering (MUST NOT)', () => {
    const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), 'dark')
    const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

    for (const ink of glyphInks(built, entry)) {
      expect(WHITE.has(ink), `${ink} is white: ${whatWasDrawn(entry)}`).toBe(false)
    }
  })
})

// Spec: FR-029, EN-1, EN-2, EN-4
describe('FR-029 (MUST NOT) -- the state is not said with a rim', () => {
  for (const preference of THEMES) {
    it(`arming an entrance changes no border color and no border width (${preference})`, () => {
      // Why: asked as a difference, not as never a border: an entrance keeps the frame it always had;
      // the MUST NOT forbids the state reaching the screen through that frame.
      const off = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY })), preference)
      const on = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)

      expect(
        rimOf(on, entranceIn(on, IC_ARMS_A_DEPENDENCY)),
        'FR-029 (MUST NOT): the rim may not differ between armed and not armed',
      ).toBe(rimOf(off, entranceIn(off, IC_ARMS_A_DEPENDENCY)))
    })

    it(`pressing an entrance changes no border color and no border width (${preference})`, () => {
      const off = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE })), preference)
      const on = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE, isPressed: true })), preference)

      expect(
        rimOf(on, entranceIn(on, IC_LIGHTNING_LINE)),
        'FR-029 (MUST NOT): the rim may not differ between pressed and not pressed',
      ).toBe(rimOf(off, entranceIn(off, IC_LIGHTNING_LINE)))
    })
  }
})

// Spec: EN-2, S-183
describe('表 T-237 EN-2 (MUST) -- an entrance whose function is ON is filled', () => {
  for (const preference of THEMES) {
    it(`fills the lightning-line entrance while it is ON (${preference})`, () => {
      // Why: the ruling's own example: IC-39 is the lightning-line entrance (FR-049, S-64).
      const built = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE, isPressed: true })), preference)
      const entry = entranceIn(built, IC_LIGHTNING_LINE)

      expect(
        [...groundsIn(built, entry)],
        `表 T-237 EN-2 asks for ${fillRowOf('EN-2')}: ${whatWasDrawn(entry)}`,
      ).toContain(t236(fillRowOf('EN-2'), preference))
    })

    it(`leaves the same entrance unfilled while it is OFF (${preference})`, () => {
      // Why: the converse, without which the case above would pass on an entrance that is always green.
      const built = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE })), preference)
      const entry = entranceIn(built, IC_LIGHTNING_LINE)

      expect(
        [...groundsIn(built, entry)],
        `an entrance that is OFF carries no fill: ${whatWasDrawn(entry)}`,
      ).not.toContain(t236(fillRowOf('EN-2'), preference))
    })
  }
})

// Spec: EN-4, FR-072
describe('表 T-237 EN-4 (MUST) -- the entrance the properties panel is showing from is filled', () => {
  for (const preference of THEMES) {
    // Spec: IMPS-88
    it(`fills the App Header entrance while the panel shows its subject (${preference})`, () => {
      // Why: IC-17 stands on the App Header and is FR-072's own entrance, so a surface other than
      // the palette is asked: one rule, every surface.
      const built = drawn(headerShowing(command({ icon: IC_PROPERTIES_PANEL, isPressed: true })), preference)
      const entry = entranceIn(built, IC_PROPERTIES_PANEL)

      expect(
        [...groundsIn(built, entry)],
        `表 T-237 EN-4 asks for ${fillRowOf('EN-4')}: ${whatWasDrawn(entry)}`,
      ).toContain(t236(fillRowOf('EN-4'), preference))
    })
  }
})

// Spec: FR-029, EN-1, EN-2
describe('FR-029 (MUST) -- when two rows of 表 T-237 fall on one entrance, the higher row wins', () => {
  for (const preference of THEMES) {
    it(`an entrance that is both armed and pressed carries ONE fill, EN-1's (${preference})`, () => {
      // Why: written against the row ids and not the colors: while EN-1 and EN-2 share S-183 it only
      // catches two grounds at once, and it sharpens by itself the day the rows differ.
      const built = drawn(
        paletteShowing(command({ icon: IC_LIGHTNING_LINE, isArmed: true, isPressed: true })),
        preference,
      )
      const entry = entranceIn(built, IC_LIGHTNING_LINE)
      const fills = [...groundsIn(built, entry)].filter((one) =>
        [t236(fillRowOf('EN-1'), preference), t236(fillRowOf('EN-2'), preference)].includes(one),
      )

      expect(fills, `one fill, and it is EN-1's: ${whatWasDrawn(entry)}`).toEqual([
        t236(fillRowOf('EN-1'), preference),
      ])
    })
  }
})

// Spec: FR-029, IMPS-1118, IMPS-1108, S-149
describe('FR-029 (MUST NOT) -- the fill is not applied to an entrance drawn faint', () => {
  for (const preference of THEMES) {
    it(`an entrance that can change nothing is not filled, even while armed (${preference})`, () => {
      const built = drawn(
        paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isEnabled: false, isArmed: true })),
        preference,
      )
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...groundsIn(built, entry)],
        `a faint entrance carries no fill: ${whatWasDrawn(entry)}`,
      ).not.toContain(t236(fillRowOf('EN-1'), preference))
    })

    it(`a faint entrance is still drawn in S-149, the color FR-029 gives it (${preference})`, () => {
      // Why: without this, the case above would pass on an entrance that had stopped being drawn faint too.
      const built = drawn(
        paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isEnabled: false, isArmed: true })),
        preference,
      )
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...glyphInks(built, entry)],
        `a faint entrance is drawn in S-149: ${whatWasDrawn(entry)}`,
      ).toContain(t236('S-149', preference))
    })
  }
})
