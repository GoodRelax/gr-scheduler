// Unit test: FR-029/FR-053 -- one Command Palette toggle entrance, on the App Header only.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import { commandPaletteFromSession } from '../../src/adapter/screen-renderer/command-palette'
import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
  type ScreenValues,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
// WHY: the one reader that takes its copy from the .md at read time, so a
// moved spec row moves here too instead of going stale.
import { bare, specTable } from '../contract/spec-table'

const T_109 = specTable('T-109')
const T_103 = specTable('T-103')
const T_023b = specTable('T-023b')
const T_012 = specTable('T-012')

const SURFACE_COLUMN = '面'
const ENTRANCE_COLUMN = '何の入口か'
const SETTLED_NAME_COLUMN = '確定名（英）'
const SHAPE_SPELLING_COLUMN = '値'

for (const column of [SURFACE_COLUMN, ENTRANCE_COLUMN]) {
  if (!T_109.headings.includes(column)) {
    throw new Error(`table T-109 no longer has a ${column} column: ${T_109.headings.join(' | ')}`)
  }
}

function settledName(row: string): string {
  const found = T_103.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-103 no longer has row ${row}`)
  return bare(found.by[SETTLED_NAME_COLUMN] ?? '')
}

const APP_HEADER = settledName('U-31')

const COMMAND_PALETTE = settledName('U-26')

// WHY: FR-053 names no row of T-109 directly; the settings row it moves
// (S-99e) is the one thing both sides spell, so it is what "exactly one" joins on.
const PALETTE_SHOWN_SETTING = 'S-99e'

const SHOW_HIDE_ROWS: readonly { readonly row: string; readonly surface: string }[] = T_109.rows
  .filter((row) => (row.by[ENTRANCE_COLUMN] ?? '').includes(PALETTE_SHOWN_SETTING))
  .map((row) => ({ row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }))

// WHY: read through a function, not at load time, so a table holding two
// rows fails inside the case about that instead of before it can run.
function theOneEntrance(): string {
  const first = SHOW_HIDE_ROWS[0]
  if (SHOW_HIDE_ROWS.length !== 1 || first === undefined) {
    throw new Error(
      `table T-109 names ${PALETTE_SHOWN_SETTING} in ${SHOW_HIDE_ROWS.length} rows: ` +
        SHOW_HIDE_ROWS.map((one) => `${one.row} on ${one.surface}`).join(', '),
    )
  }
  return first.row
}

function shapeSpellingOf(shapeRow: string): string {
  const row = T_012.rows.find((one) => one.id === shapeRow)
  if (row === undefined) throw new Error(`table T-012 no longer has row ${shapeRow}`)
  return bare(row.by[SHAPE_SPELLING_COLUMN] ?? '').replace(/'/g, '')
}

// WHY: read from _source/erd.json because tbl-glossary.md section 8 says
// table T-109 does not carry these spellings and that file does.
const MILESTONE_GLYPHS: readonly string[] = ((): readonly string[] => {
  const erd = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
  ) as {
    readonly entities: readonly {
      readonly columns: readonly {
        readonly name: string
        readonly json?: { readonly values?: readonly string[] }
      }[]
    }[]
  }
  for (const entity of erd.entities) {
    for (const column of entity.columns) {
      const values = column.json?.values
      if (column.name === 'milestoneGlyph' && values !== undefined) return values
    }
  }
  throw new Error('erd.json no longer holds the spellings of `milestoneGlyph`')
})()

type Armed = ScreenValues['armModeState']

// WHY: the row -> state names are table T-280's armModeStateMachine; re-check this if T-023b grows a row.
function armOfRow(row: string): Armed {
  switch (row) {
    case 'AR-1':
      return { kind: 'notArmed' }
    case 'AR-2':
      return { kind: 'taskShapeArmed', shapeKind: shapeSpellingOf('SH-1') }
    case 'AR-3':
      return { kind: 'milestoneShapeArmed', glyph: MILESTONE_GLYPHS[0] as string }
    case 'AR-4':
      return { kind: 'dependencyArmed' }
    case 'AR-5':
      return { kind: 'commentBoxArmed' }
    case 'AR-6':
      return { kind: 'highlightBoxArmed' }
    default:
      throw new Error(`table T-023b has a row this file does not build an arm for: ${row}`)
  }
}

const EVERY_ARM: readonly { readonly row: string; readonly armed: Armed }[] = T_023b.rows.map(
  (row) => ({ row: row.id, armed: armOfRow(row.id) }),
)

const S_99_LANGUAGES: readonly ('ja' | 'en')[] = ['ja', 'en']

// WHY: read from the manuscript rather than typed (rule 03 section 1).
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
})()

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({})

const SCHEDULE = {
  project: { title: null },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

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

const SHOWN: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    // WHY: FR-053 keeps the eight glyph entrances out of the palette until
    // this is open, and a case below walks every entry wanting them present.
    milestoneListDisplayState: { kind: 'open' },
  },
}
const HIDDEN: ScreenSession = { ...SHOWN, screen: { ...SHOWN.screen, paletteDisplayState: { kind: 'hidden' } } }

const withLanguage = (root: ScreenSession, language: 'ja' | 'en'): ScreenSession => ({
  ...root,
  screen: { ...root.screen, language },
})
const withArm = (root: ScreenSession, armed: Armed): ScreenSession => ({
  ...root,
  screen: { ...root.screen, armModeState: armed },
})

const headerOf = (root: ScreenSession = SHOWN): AppHeaderItems =>
  appHeaderItemsFromDocument(SCHEDULE, SETTINGS, root, READINGS)

const paletteOf = (root: ScreenSession = SHOWN): CommandPalette => {
  const described = commandPaletteFromSession(root, SETTINGS, emptySelection(), READINGS)
  if (described === null) throw new Error('S-99e says it is showing, so one is described')
  return described
}

const headerIcons = (items: AppHeaderItems): readonly string[] =>
  items.commands.map((one) => one.icon)

const paletteIcons = (palette: CommandPalette): readonly string[] =>
  palette.groups.flatMap((group) => group.commands).map((one) => one.icon)

const headerEntry = (items: AppHeaderItems, icon: string): CommandItem => {
  const found = items.commands.filter((one) => one.icon === icon)
  if (found.length !== 1) throw new Error(`the header carries ${found.length} of ${icon}`)
  return found[0] as CommandItem
}

const timesIn = (icons: readonly string[], icon: string): number =>
  icons.filter((one) => one === icon).length

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // TRAP: a parse that picked up the wrong column would make every case
    // below agree with anything (rule 04.2).
    expect(APP_HEADER).toBe('App Header')
    expect(COMMAND_PALETTE).toBe('Command Palette')
    expect(T_109.rows.length).toBeGreaterThan(0)
    expect(T_023b.rows.map((row) => row.id)).toContain('AR-1')
    expect(
      T_109.rows.some((row) => bare(row.by[SURFACE_COLUMN] ?? '') === COMMAND_PALETTE),
      'the 面 column still places rows on the palette',
    ).toBe(true)
    expect(MILESTONE_GLYPHS.length).toBeGreaterThan(0)
    expect(shapeSpellingOf('SH-1')).toMatch(/^[a-z][A-Za-z]+$/)
  })

  it('⭐ S-99e is still the row FR-053 keys the palette\'s showing on', () => {
    // WHY: every case below rests on this join; if S-99e stopped being the
    // row FR-053 keys on, the lookup would find nothing to test.
    const row = specTable('T-206').rows.find((one) => one.id === PALETTE_SHOWN_SETTING)
    if (row === undefined) throw new Error(`table T-206 no longer has row ${PALETTE_SHOWN_SETTING}`)
    expect(row.cells.join(' '), 'S-99e still names FR-053').toContain('FR-053')
  })
})

describe('FR-029 (MUST NOT) -- one function, one entrance', () => {
  it('⛔ table T-109 gives the palette\'s showing and hiding exactly ONE row', () => {
    // WHY: the roster is where the MUST NOT is kept or broken -- two rows here
    // mean two entrances on screen, however faithfully either unit follows it.
    expect(
      SHOW_HIDE_ROWS.map((one) => `${one.row} on ${one.surface}`),
      'FR-029 (MUST NOT): a second entrance onto the same function',
    ).toHaveLength(1)
  })

  it('stands that row on the `App Header` and on no other surface (FR-053, MUST)', () => {
    expect(SHOW_HIDE_ROWS.map((one) => one.surface)).toEqual([APP_HEADER])
  })
})

describe('UF-62 -- FR-053 (MUST): the entrance is on the `App Header`', () => {
  it('carries it, and carries it once', () => {
    // WHY: this is what refutes DFC-36 from the specification alone -- the
    // row exists, its surface is the header, and this unit carries it.
    const icons = headerIcons(headerOf())
    expect(timesIn(icons, theOneEntrance()), `the header carried ${icons.join(', ')}`).toBe(1)
  })

  it('leaves it usable while the palette is hidden', () => {
    // TRAP: an entrance outside the palette that went faint once the palette
    // was hidden would strand the person the same way FR-053 forbids.
    expect(headerEntry(headerOf(HIDDEN), theOneEntrance()).isEnabled).toBe(true)
  })

  it('carries it once in either display language (FR-038 changes the words, not the roster)', () => {
    for (const language of S_99_LANGUAGES) {
      const icons = headerIcons(headerOf(withLanguage(SHOWN, language)))
      expect(timesIn(icons, theOneEntrance()), language).toBe(1)
    }
  })
})

describe('UF-65 -- FR-053 (MUST): the entrance is NOT on the palette', () => {
  it('never carries it among the palette\'s entries', () => {
    expect(paletteIcons(paletteOf())).not.toContain(theOneEntrance())
  })

  it('never carries it whatever is armed, and whatever language is chosen', () => {
    // WHY: asked across every state either unit reads, so "outside" is a
    // property of the palette, not of one description.
    for (const language of S_99_LANGUAGES) {
      for (const { row, armed } of EVERY_ARM) {
        const palette = paletteOf(withLanguage(withArm(SHOWN, armed), language))
        expect(paletteIcons(palette), `${language} / ${row}`).not.toContain(theOneEntrance())
      }
    }
  })
})

describe('UF-62 with UF-65 -- FR-029 (MUST NOT): once on the screen, not twice', () => {
  it('⛔ the two units together put the entrance on the screen once', () => {
    // TRAP: counting the header and palette separately can never catch a
    // function that landed on both; FR-029 (MUST NOT) is about the screen as one.
    const both = [...headerIcons(headerOf()), ...paletteIcons(paletteOf())]
    expect(timesIn(both, theOneEntrance()), `the screen carried ${both.join(', ')}`).toBe(1)
  })
})

describe("UF-65 -- table T-023b (MUST NOT): the arm's row id is not what is read", () => {
  it('says something for every arm, and never says the row id', () => {
    // WHY: asked together on purpose -- an empty answer satisfies the MUST NOT
    // but breaks the MUST, and a row id satisfies the MUST but breaks the MUST NOT.
    const armRows = T_023b.rows.map((row) => row.id)
    const spellsARow = new RegExp(`(^|[^A-Za-z0-9-])(${armRows.join('|')})([^A-Za-z0-9-]|$)`)

    for (const language of S_99_LANGUAGES) {
      for (const { row, armed } of EVERY_ARM) {
        const palette = paletteOf(withLanguage(withArm(SHOWN, armed), language))
        // WHY: null is the minimised reading (FR-053); this palette is not
        // minimised, so ?? '' cannot hide a real word -- only the already-failing empty one.
        const said = palette.armedText ?? ''

        expect(said.length, `FR-053 (MUST): ${language} / ${row} reads nothing`).toBeGreaterThan(0)
        expect(
          spellsARow.test(said),
          `table T-023b (MUST NOT): ${language} / ${row} is printed as "${said}"`,
        ).toBe(false)
      }
    }
  })

  it('⛔ prints no row id anywhere else in the description either', () => {
    // WHY: also asked of the groups' names, even though FR-053 keeps those
    // off screen -- a name spelling a row id is one mistake from reaching it.
    const armRows = T_023b.rows.map((row) => row.id)
    const spellsARow = new RegExp(`(^|[^A-Za-z0-9-])(${armRows.join('|')})([^A-Za-z0-9-]|$)`)

    for (const language of S_99_LANGUAGES) {
      const palette = paletteOf(withLanguage(SHOWN, language))
      const printable = [
        palette.armedText ?? '',
        ...palette.groups.map((group) => group.name),
        ...palette.groups.flatMap((group) => group.commands).map((entry) => entry.label),
      ]
      for (const word of printable) {
        expect(spellsARow.test(word), `${language}: "${word}"`).toBe(false)
      }
    }
  })
})
