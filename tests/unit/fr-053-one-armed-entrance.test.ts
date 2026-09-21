// Unit test for UF-65: which entrance is drawn as armed (FR-053), read against the manuscript at run time.
const SETTINGS: DocumentSettings = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type {
  CommandItem,
  CommandPalette,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { commandPaletteFromSession } from '../../src/adapter/screen-renderer/command-palette'
import {
  emptyScreenSession,
  type ScreenSession,
  type ScreenValues,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
// WHY: the contract reader takes its copy from the .md at read time, so a
// row that moves in the specification moves here too instead of going stale.
import { bare, bareAll, specTable } from '../contract/spec-table'

const T_109 = specTable('T-109')
const T_023b = specTable('T-023b')
const T_012 = specTable('T-012')

// see T-103
const COMMAND_PALETTE = 'Command Palette'

const SURFACE_COLUMN = '面'
const ARM_COLUMN = '構え'
const ENTRANCE_COLUMN = '何の入口か'
const SHAPE_SPELLING_COLUMN = '値'

for (const column of [SURFACE_COLUMN, ARM_COLUMN, ENTRANCE_COLUMN]) {
  if (!T_109.headings.includes(column)) {
    throw new Error(`table T-109 no longer has a ${column} column: ${T_109.headings.join(' | ')}`)
  }
}
if (!T_012.headings.includes(SHAPE_SPELLING_COLUMN)) {
  throw new Error(`table T-012 no longer has a ${SHAPE_SPELLING_COLUMN} column`)
}

// see T-109
interface ArmingEntrance {
  readonly row: string
  readonly arm: string
  readonly entrance: string
}

// WHY: rows whose arm column is an em dash are excluded here but not
// ignored -- the em-dash case below asserts none of them is ever marked armed.
const ARMING_ENTRANCES: readonly ArmingEntrance[] = T_109.rows
  .filter((row) => bareAll(row.by[SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE))
  .map((row) => ({
    row: row.id,
    arm: bare(row.by[ARM_COLUMN] ?? ''),
    entrance: row.by[ENTRANCE_COLUMN] ?? '',
  }))
  .filter((entrance) => /^AR-\d+$/.test(entrance.arm))

const entrancesArmedBy = (arm: string): readonly string[] =>
  ARMING_ENTRANCES.filter((entrance) => entrance.arm === arm).map((entrance) => entrance.row)

function shapeSpellingOf(shapeRow: string): string {
  const row = T_012.rows.find((one) => one.id === shapeRow)
  if (row === undefined) throw new Error(`table T-012 no longer has row ${shapeRow}`)
  return bare(row.by[SHAPE_SPELLING_COLUMN] ?? '').replace(/'/g, '')
}

// WHY: table T-109 names the row of table T-012 each entrance arms, and
// table T-012 spells that row -- the finer join FR-053 needs, read at run time.
const ENTRANCE_BY_TASK_SHAPE = new Map<string, string>(
  ARMING_ENTRANCES.filter((entrance) => entrance.arm === 'AR-2').map(
    (entrance): [string, string] => {
      const named = /`(SH-\d+)`/.exec(entrance.entrance)
      if (named === null) {
        throw new Error(`table T-109's ${entrance.row} no longer names a row of table T-012`)
      }
      return [shapeSpellingOf(named[1] as string), entrance.row]
    },
  ),
)

// WHY: read out of erd.json -- table T-109's own section 8 preamble says
// the glyph spellings live there, not copied into the table.
const MILESTONE_GLYPHS: readonly string[] = ((): readonly string[] => {
  const erd = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
  ) as {
    readonly entities: readonly {
      readonly columns: readonly {
        readonly name: string
        readonly json?: { readonly kind?: string; readonly values?: readonly string[] }
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

// TRAP: this row -> Armed-member mapping is not settled by the
// specification; re-read it if table T-023b grows a row.
function armsOfRow(arm: string): readonly Armed[] {
  switch (arm) {
    case 'AR-1':
      return [{ kind: 'notArmed' }]
    case 'AR-2':
      return [...ENTRANCE_BY_TASK_SHAPE.keys()].map(
        (shapeKind): Armed => ({ kind: 'taskShapeArmed', shapeKind }),
      )
    case 'AR-3':
      return MILESTONE_GLYPHS.map((glyph): Armed => ({ kind: 'milestoneShapeArmed', glyph }))
    case 'AR-4':
      return [{ kind: 'dependencyArmed' }]
    case 'AR-5':
      return [{ kind: 'commentBoxArmed' }]
    case 'AR-6':
      return [{ kind: 'highlightBoxArmed' }]
    default:
      throw new Error(`table T-023b has a row this file does not build an arm for: ${arm}`)
  }
}

const EVERY_ARM: readonly { readonly arm: string; readonly armed: Armed }[] = T_023b.rows.flatMap(
  (row) => armsOfRow(row.id).map((armed) => ({ arm: row.id, armed })),
)

// see T-023b
const NOTHING_ARMED: Armed = { kind: 'notArmed' }

// see T-216
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
})()

// WHY: the milestone list is open in every case here -- a folded glyph
// entrance is not drawn, so it could never be the one told apart.
const SHOWN: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    dialogueFieldDisplayState: { kind: 'shown' },
    milestoneListDisplayState: { kind: 'open' },
    paletteDisplayState: { kind: 'shown', child: { kind: 'expanded' } },
    dualCursorModeState: { kind: 'off' },
    propertiesPanelContentState: { kind: 'hidden' },
  },
}

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
  // WHY: GR-21 (table T-023d) divides these for the scrollbar grip's
  // length; zero means everything fits, so this file leaves it inert.
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const withArmed = (root: ScreenSession, armed: Armed): ScreenSession => ({
  ...root,
  screen: { ...root.screen, armModeState: armed },
})

function describedWith(armed: Armed): CommandPalette {
  const palette = commandPaletteFromSession(
    withArmed(SHOWN, armed),
    SETTINGS,
    emptySelection(),
    READINGS,
  )
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

const entriesOf = (palette: CommandPalette): readonly CommandItem[] =>
  palette.groups.flatMap((group) => group.commands)

const armedEntrancesOf = (armed: Armed): readonly string[] =>
  entriesOf(describedWith(armed))
    .filter((entry) => entry.isArmed)
    .map((entry) => entry.icon)

const spell = (armed: Armed): string => JSON.stringify(armed)

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    expect(ARMING_ENTRANCES.length).toBeGreaterThan(0)
    expect(T_023b.rows.map((row) => row.id)).toContain('AR-1')
    expect(ENTRANCE_BY_TASK_SHAPE.size).toBe(entrancesArmedBy('AR-2').length)
    expect([...ENTRANCE_BY_TASK_SHAPE.keys()].every((one) => /^[a-z][A-Za-z]+$/.test(one))).toBe(true)
    expect(MILESTONE_GLYPHS.length).toBe(entrancesArmedBy('AR-3').length)
  })

  it('⭐ the 構え column really stands more than one entrance under one arm', () => {
    const crowded = T_023b.rows
      .map((row) => ({ arm: row.id, entrances: entrancesArmedBy(row.id) }))
      .filter((one) => one.entrances.length > 1)

    expect(
      crowded.length,
      'table T-109 no longer stands several entrances under one row of table T-023b',
    ).toBeGreaterThan(0)
  })

  it('⭐ every arm the 構え column names is a row of table T-023b', () => {
    const arms = new Set(T_023b.rows.map((row) => row.id))
    for (const entrance of ARMING_ENTRANCES) {
      expect(arms.has(entrance.arm), `table T-109's ${entrance.row} names ${entrance.arm}`).toBe(true)
    }
  })
})

describe('FR-053 (MUST) -- the armed entrance is told apart from the ones that are not', () => {
  it('marks no entrance at all while nothing is armed (AR-1)', () => {
    // WHY: with nothing armed, marking any entrance would say a shape is
    // waiting to be placed when none is.
    expect(armedEntrancesOf(NOTHING_ARMED)).toEqual([])
  })

  it('marks exactly ONE entrance, whichever arm the person took', () => {
    // WHY: marking more than one entrance would make an entrance that is
    // NOT armed indistinguishable from the one that is.
    for (const { arm, armed } of EVERY_ARM) {
      if (arm === 'AR-1') continue
      const marked = armedEntrancesOf(armed)
      expect(marked.length, `table T-023b ${arm}, ${spell(armed)}: marked ${marked.join(', ')}`).toBe(1)
    }
  })

  it('marks the entrance table T-109 gives that very shape (AR-2)', () => {
    // WHY: which entrance is not chosen here -- it follows from table
    // T-109 naming the very row of table T-012 each entrance arms.
    for (const [shapeKind, row] of ENTRANCE_BY_TASK_SHAPE) {
      expect(armedEntrancesOf({ kind: 'taskShapeArmed', shapeKind }), shapeKind).toEqual([row])
    }
  })

  it('marks a different entrance for every milestone glyph (AR-3)', () => {
    // WHY: follows from the same MUST without needing glyph-to-row order --
    // this only asserts the eight answers differ, not which is which.
    const marked = MILESTONE_GLYPHS.map((glyph) =>
      armedEntrancesOf({ kind: 'milestoneShapeArmed', glyph }).join('+'),
    )

    expect(new Set(marked).size, marked.join(' | ')).toBe(MILESTONE_GLYPHS.length)
  })

  it('marks no entrance whose 構え column is an em dash', () => {
    // WHY: an entrance with no arm at all can never be the one told apart
    // as armed.
    const armless = new Set(
      T_109.rows
        .filter((row) => bareAll(row.by[SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE))
        .map((row) => row.id)
        .filter((row) => !ARMING_ENTRANCES.some((entrance) => entrance.row === row)),
    )

    for (const { arm, armed } of EVERY_ARM) {
      for (const row of armedEntrancesOf(armed)) {
        expect(armless.has(row), `${arm}: ${row} has no 構え`).toBe(false)
      }
    }
  })
})

describe('FR-053 (MUST NOT) -- the armed entrance is not drawn as a pressed button', () => {
  it('taking an arm turns no entry into a pressed one', () => {
    // WHY: asked as a difference from "nothing armed," not as "nothing is
    // ever pressed" -- what MUST NOT forbids is an arm reaching isPressed.
    const whenNothingArmed = entriesOf(describedWith(NOTHING_ARMED)).map((entry) => entry.isPressed)

    for (const { arm, armed } of EVERY_ARM) {
      expect(
        entriesOf(describedWith(armed)).map((entry) => entry.isPressed),
        `table T-023b ${arm}, ${spell(armed)}`,
      ).toEqual(whenNothingArmed)
    }
  })
})
