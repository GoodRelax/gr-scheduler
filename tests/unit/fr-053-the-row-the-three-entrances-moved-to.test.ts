
import { describe, expect, it } from 'vitest'

import { commandPaletteFromSession } from '../../src/adapter/screen-renderer/command-palette'
import type {
  CommandPalette,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, bareAll, specTable } from '../contract/spec-table'


const T_109 = specTable('T-109')

const SURFACE_COLUMN = '面'
const GROUP_COLUMN = '群'
const ENTRANCE_COLUMN = '何の入口か'
const AUTHORITY_COLUMN = '正'
const ARM_COLUMN = '構え'

const COMMAND_PALETTE = 'Command Palette'

const NO_GROUP = '—'

const NOT_A_BUTTON = 'ボタンではない'

const ALIGN_REQUIREMENT = '`FR-034`'

interface Row {
  readonly id: string
  readonly group: string
  readonly entrance: string
  readonly arm: string
}

const PALETTE_ENTRANCES: readonly Row[] = T_109.rows
  .filter((row) =>
    bareAll(row.by[SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE),
  )
  .filter((row) => !(row.by[ENTRANCE_COLUMN] ?? '').includes(NOT_A_BUTTON))
  .filter((row) => bare(row.by[GROUP_COLUMN] ?? '') !== NO_GROUP)
  .map((row) => ({
    id: row.id,
    group: bare(row.by[GROUP_COLUMN] ?? ''),
    entrance: row.by[ENTRANCE_COLUMN] ?? '',
    arm: bare(row.by[ARM_COLUMN] ?? ''),
  }))

function theEntranceArming(arm: string): string {
  const found = PALETTE_ENTRANCES.filter((row) => row.arm === arm)
  if (found.length !== 1) {
    throw new Error(`table T-109 gives ${arm} to ${found.length} entrances of the palette`)
  }
  return (found[0] as Row).id
}

const ALIGNMENT_ENTRANCES: readonly string[] = PALETTE_ENTRANCES.filter((row) =>
  (T_109.rows.find((one) => one.id === row.id)?.by[AUTHORITY_COLUMN] ?? '').includes(
    ALIGN_REQUIREMENT,
  ),
).map((row) => row.id)

const THE_FIVE: readonly string[] = [
  theEntranceArming('AR-4'),
  theEntranceArming('AR-5'),
  theEntranceArming('AR-6'),
  ...ALIGNMENT_ENTRANCES,
]

const TASK_SHAPE_ENTRANCES: readonly string[] = PALETTE_ENTRANCES.filter(
  (row) => row.arm === 'AR-2',
).map((row) => row.id)


const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
})()

const SETTINGS = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

const SESSION: ScreenViewReadings = {
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
    milestoneListDisplayState: { kind: 'open' },
  },
}

function palette(): CommandPalette {
  const drawn = commandPaletteFromSession(SHOWN, SETTINGS, emptySelection(), SESSION)
  if (drawn === null) throw new Error('S-99e says the palette is shown, so one must be described')
  return drawn
}

const rowsOfThePalette = (): readonly (readonly string[])[] =>
  palette().groups.map((group) => group.commands.map((command) => command.icon))


describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    expect(PALETTE_ENTRANCES.length, 'the palette still has entrances').toBeGreaterThan(10)
    expect(ALIGNMENT_ENTRANCES.length, 'FR-034 still owns two entrances').toBe(2)
    expect(new Set(THE_FIVE).size, 'the ruling names five different entrances').toBe(5)
    expect(TASK_SHAPE_ENTRANCES.length, 'AR-2 still stands against the task shapes').toBe(4)
  })

  it('⭐ table T-109 still records the ruling these cases carry out', () => {
    const opener = T_109.rows.find((one) => one.id === (THE_FIVE[0] as string))
    expect(opener?.by[ENTRANCE_COLUMN] ?? '').toContain('本行から `IC-38` までが 1 つの群である')
  })
})


describe('the 群 column of table T-109 is what lays the palette out in rows', () => {
  it('⭐ every entrance of one row shares one 群, and the rows follow the table', () => {
    const expected: string[][] = []
    const openedAt = new Map<string, string[]>()
    for (const row of PALETTE_ENTRANCES) {
      const opened = openedAt.get(row.group)
      if (opened === undefined) {
        const fresh = [row.id]
        openedAt.set(row.group, fresh)
        expected.push(fresh)
      } else opened.push(row.id)
    }
    expect(rowsOfThePalette()).toEqual(expected)
  })

  it('⭐ the five the user named stand on ONE row, in the order they were named', () => {
    const rows = rowsOfThePalette()
    const holding = rows.filter((row) => row.includes(THE_FIVE[0] as string))
    expect(holding.length, 'exactly one row holds the dependency entrance').toBe(1)
    expect(holding[0]).toEqual(THE_FIVE)
  })

  it('⛔ the three no longer stand on the row the task shapes are placed from', () => {
    const rows = rowsOfThePalette()
    const shapeRow = rows.find((row) => row.includes(TASK_SHAPE_ENTRANCES[0] as string))
    expect(shapeRow, 'the task shapes are drawn somewhere').toBeDefined()
    for (const moved of THE_FIVE.slice(0, 3)) expect(shapeRow).not.toContain(moved)
  })

  it('⭐ the row the five stand on comes after the row the shapes stand on', () => {
    const rows = rowsOfThePalette()
    const shapeRow = rows.findIndex((row) => row.includes(TASK_SHAPE_ENTRANCES[0] as string))
    const theirRow = rows.findIndex((row) => row.includes(THE_FIVE[0] as string))
    expect(theirRow).toBe(shapeRow + 1)
  })
})
