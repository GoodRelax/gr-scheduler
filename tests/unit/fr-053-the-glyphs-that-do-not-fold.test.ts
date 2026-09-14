// FR-053 (MUST) as the user ruled it on 2026-09-01: the milestone glyph

import { describe, expect, it } from 'vitest'

import {
  commandPaletteFromScreenState,
  NOT_STORED_COMMAND_PALETTE_SIZES,
} from '../../src/adapter/screen-renderer/command-palette'
import type {
  CommandPalette,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  emptyScreenState,
  screenStateWithPalette,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { bare, bareAll, specTable } from '../contract/spec-table'


const T_012 = specTable('T-012')
const T_109 = specTable('T-109')
const T_206 = specTable('T-206')

const ENTRANCE_COLUMN = '何の入口か'
const SURFACE_COLUMN = '面'
const ARM_COLUMN = '構え'
const MARK_COLUMN = '表記'
const DEFAULT_COLUMN = '既定'
const REASON_COLUMN = '保存しない理由'

function rowOf(table: ReturnType<typeof specTable>, id: string) {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} no longer has row ${id}`)
  return found
}

const MARKS: readonly string[] = bare(rowOf(T_012, 'SH-5').by[MARK_COLUMN] ?? '')
  .split(/\s+/)
  .filter((mark) => mark !== '')

const S_216 = Number(bare(rowOf(T_206, 'S-216').by[DEFAULT_COLUMN] ?? ''))

const S_216_REASON = rowOf(T_206, 'S-216').by[REASON_COLUMN] ?? ''

const COMMAND_PALETTE = 'Command Palette'

const MILESTONE_ARM = 'AR-3'

const MILESTONE_LIST_SETTING = 'S-142'

const paletteRows = T_109.rows.filter((row) =>
  bareAll(row.by[SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE),
)

const GLYPH_ROWS: readonly string[] = paletteRows
  .filter((row) => bare(row.by[ARM_COLUMN] ?? '') === MILESTONE_ARM)
  .map((row) => row.id)

const LIST_ROWS: readonly string[] = paletteRows
  .filter((row) => (row.by[ENTRANCE_COLUMN] ?? '').includes(MILESTONE_LIST_SETTING))
  .map((row) => row.id)


const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by[DEFAULT_COLUMN] ?? ''))
})()

const SETTINGS = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

const SESSION: ScreenSession = {
  language: 'ja',
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
}

const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)

function paletteWith(isMilestoneListOpen: boolean): CommandPalette {
  const drawn = commandPaletteFromScreenState(
    SHOWN,
    SETTINGS,
    emptySelection(),
    { ...SESSION, isMilestoneListOpen },
  )
  if (drawn === null) throw new Error('S-99e says the palette is shown, so one must be described')
  return drawn
}

const entrancesOf = (palette: CommandPalette): readonly string[] =>
  palette.groups.flatMap((group) => group.commands.map((command) => command.icon))


describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    expect(MARKS.length, 'SH-5 of table T-012 still prints its marks').toBeGreaterThan(1)
    expect(GLYPH_ROWS.length, 'table T-109 still gives entrances the AR-3 arm').toBe(MARKS.length)
    expect(Number.isInteger(S_216) && S_216 > 0, `S-216 of table T-206 reads ${S_216}`).toBe(true)
    expect(LIST_ROWS.length, 'exactly one entrance works the list (FR-053, MUST NOT)').toBe(1)
  })

  it('⭐ the count and the ruling it stands for still agree', () => {
    expect(S_216_REASON, 'S-216 still names the first mark it spares').toContain(MARKS[0] as string)
    expect(S_216_REASON, 'S-216 still names the last mark it spares').toContain(
      MARKS[S_216 - 1] as string,
    )
    expect(S_216_REASON, 'S-216 does not name the first mark it folds').not.toContain(
      MARKS[S_216] as string,
    )
  })

  it('⭐ the number the unit was generated with is the number the table states', () => {
    expect(NOT_STORED_COMMAND_PALETTE_SIZES['S-216']).toBe(S_216)
  })

  it('⭐ table T-109 prints its glyph entrances in SH-5’s order', () => {
    for (const [at, row] of GLYPH_ROWS.entries()) {
      const cell = rowOf(T_109, row).by[ENTRANCE_COLUMN] ?? ''
      expect(cell, `${row} is the entrance for the mark SH-5 prints ${at + 1}st`).toContain(
        MARKS[at] as string,
      )
    }
  })
})


describe('FR-053 (MUST): the first S-216 glyph entrances do not fold away', () => {
  it('⭐ stands the first S-216 of them while the list is closed', () => {
    const shown = entrancesOf(paletteWith(false)).filter((icon) => GLYPH_ROWS.includes(icon))
    expect(shown).toEqual(GLYPH_ROWS.slice(0, S_216))
  })

  it('⛔ folds the rest away until the list is opened', () => {
    const folded = GLYPH_ROWS.slice(S_216)
    expect(folded.length, 'there is something left to fold').toBeGreaterThan(0)
    const shown = entrancesOf(paletteWith(false))
    for (const row of folded) expect(shown).not.toContain(row)
  })

  it('⭐ puts every one of them out once the list is open', () => {
    const shown = entrancesOf(paletteWith(true)).filter((icon) => GLYPH_ROWS.includes(icon))
    expect(shown).toEqual(GLYPH_ROWS)
  })

  it('⭐ keeps the entrance that works the list out in both states', () => {
    for (const open of [false, true]) {
      expect(entrancesOf(paletteWith(open))).toContain(LIST_ROWS[0] as string)
    }
  })

  it('⛔ the fold moves no group and renames none', () => {
    const closed = paletteWith(false).groups.map((group) => group.name)
    const open = paletteWith(true).groups.map((group) => group.name)
    expect(closed).toEqual(open)
  })
})
