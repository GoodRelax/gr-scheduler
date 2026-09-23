// FR-029, row EN-2 of table T-237 (MUST): a Command Palette entrance whose own function is ON is drawn filled.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
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
import { bare, specTable } from '../contract/spec-table'

const T_202_KEY_COLUMN = 'キー'
const T_202_TYPE_COLUMN = '型'
// see FR-049
const BOOLEAN_TYPE = '真偽'

const T_109_SURFACE_COLUMN = '面'
const T_109_ENTRANCE_COLUMN = '何の入口か'
const T_109_AUTHORITY_COLUMN = '正'
// WHY: IC-47 is the head of the guide-cursor family (writes S-66 in full);
// WHY: whichever table T-109 row prints first is the head, not a fixed id.
const SAME_AS_THE_ROW_ABOVE = '同・'

const T_237_STATE_COLUMN = '何が効いているか'
const T_237_FILL_COLUMN = '塗りの色'
const T_237_OWNER_COLUMN = '定める要求'

const T_202 = specTable('T-202')
const T_109 = specTable('T-109')
const T_237 = specTable('T-237')

for (const [table, columns] of [
  [T_202, [T_202_KEY_COLUMN, T_202_TYPE_COLUMN]],
  [T_109, [T_109_SURFACE_COLUMN, T_109_ENTRANCE_COLUMN, T_109_AUTHORITY_COLUMN]],
  [T_237, [T_237_STATE_COLUMN, T_237_FILL_COLUMN, T_237_OWNER_COLUMN]],
] as const) {
  for (const column of columns) {
    if (!table.headings.includes(column)) {
      throw new Error(`table ${table.id} no longer has a ${column} column: ${table.headings.join(' | ')}`)
    }
  }
}

const codeSpans = (cell: string): readonly string[] =>
  [...cell.matchAll(/`([^`]+)`/gu)].map((found) => found[1] as string)

// see T-103, U-26
const COMMAND_PALETTE_SURFACE = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.cells[0] ?? '')
})()

// see T-216, S-73
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
})()

interface SettingRow {
  readonly id: string
  readonly key: string
  readonly type: string
  readonly isBoolean: boolean
}

const T_202_ROWS: readonly SettingRow[] = T_202.rows.map((row) => ({
  id: row.id,
  key: bare(row.by[T_202_KEY_COLUMN] ?? ''),
  type: row.by[T_202_TYPE_COLUMN] ?? '',
  isBoolean: (row.by[T_202_TYPE_COLUMN] ?? '').includes(BOOLEAN_TYPE),
}))

const settingRow = (id: string): SettingRow | undefined => T_202_ROWS.find((one) => one.id === id)

const T_109_PALETTE = T_109.rows.filter((row) =>
  codeSpans(row.by[T_109_SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE_SURFACE),
)

const settingsNamedBy = (row: (typeof T_109.rows)[number]): readonly SettingRow[] =>
  codeSpans(row.by[T_109_ENTRANCE_COLUMN] ?? '')
    .map((name) => settingRow(name))
    .filter((found): found is SettingRow => found !== undefined)

interface Entrance {
  readonly row: string
  readonly setting: SettingRow
  readonly authority: string
}

// WHY: walked in the table's own print order so a "same as above" cell can
// WHY: inherit what the row above it named.
const PALETTE_ENTRANCES_ON_T_202: readonly Entrance[] = ((): readonly Entrance[] => {
  const found: Entrance[] = []
  let carried: readonly SettingRow[] = []
  for (const row of T_109_PALETTE) {
    const cell = row.by[T_109_ENTRANCE_COLUMN] ?? ''
    const named = settingsNamedBy(row)
    const settings = named.length > 0 ? named : cell.startsWith(SAME_AS_THE_ROW_ABOVE) ? carried : []
    carried = named.length > 0 || cell.startsWith(SAME_AS_THE_ROW_ABOVE) ? settings : []
    for (const setting of settings) {
      found.push({ row: row.id, setting, authority: row.by[T_109_AUTHORITY_COLUMN] ?? '' })
    }
  }
  return found
})()

// see EN-2
// WHY: excludes IC-41 (names no settings row), IC-50/IC-76 (S-142/S-206 live
// WHY: in T-206, not T-202), and every App Header row (a different unit, UF-62).
const PALETTE_TOGGLES: readonly Entrance[] = PALETTE_ENTRANCES_ON_T_202.filter(
  (entrance) => entrance.setting.isBoolean,
)

const PALETTE_NON_TOGGLES: readonly Entrance[] = PALETTE_ENTRANCES_ON_T_202.filter(
  (entrance) => !entrance.setting.isBoolean,
)

// see T-029a, DC-7
const STAND_IN_VALUES: Readonly<Record<string, readonly unknown[]>> = {
  dualCursor: [null, { date1: '2026-01-05', date2: '2026-01-09' }],
}

const valuesOf = (setting: SettingRow): readonly unknown[] => {
  const enumerated = codeSpans(setting.type)
    .filter((span) => /^'[^']*'$/.test(span))
    .map((span) => span.slice(1, -1))
  if (enumerated.length >= 2) return enumerated
  return STAND_IN_VALUES[setting.key] ?? []
}

// see T-109, IC-76, FR-102, T-206, S-206
const RECORDING_ENTRANCE = 'IC-76'

const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    const last = path[path.length - 1] as string
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[last] = flat[key]
  }
  return out
}

// WHY: only the keys a case means are pinned; rule 03 section 1 forbids
// WHY: re-typing a value the specification already holds.
const settingsWith = (part: Readonly<Record<string, unknown>> = {}): DocumentSettings =>
  nested({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const everyToggleAt = (value: boolean): Record<string, unknown> =>
  Object.fromEntries(PALETTE_TOGGLES.map((entrance) => [entrance.setting.key, value]))

const ALL_OFF = settingsWith(everyToggleAt(false))
const ALL_ON = settingsWith(everyToggleAt(true))

type Armed = ScreenValues['armModeState']

// see S-99e
// WHY: the milestone list is left OPEN -- FR-053 keeps its entrances out of
// WHY: the palette while shut, which would narrow the roster this file walks.
const SHOWN: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    // see FR-065, FR-066
    dialogueFieldDisplayState: { kind: 'hidden' },
    milestoneListDisplayState: { kind: 'open' },
  },
}

const T_023b: readonly { readonly row: string; readonly armed: Armed }[] = [
  { row: 'AR-1', armed: { kind: 'notArmed' } },
  { row: 'AR-2', armed: { kind: 'taskShapeArmed', shapeKind: 'SH-1' } },
  { row: 'AR-3', armed: { kind: 'milestoneShapeArmed', glyph: 'SH-5' } },
  { row: 'AR-4', armed: { kind: 'dependencyArmed' } },
  { row: 'AR-5', armed: { kind: 'commentBoxArmed' } },
  { row: 'AR-6', armed: { kind: 'highlightBoxArmed' } },
]

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

const describedWith = (
  settings: DocumentSettings,
  root: ScreenSession = SHOWN,
  readings: ScreenViewReadings = READINGS,
): CommandPalette => {
  const palette = commandPaletteFromSession(root, settings, emptySelection(), readings)
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

const entriesOf = (palette: CommandPalette): readonly CommandItem[] =>
  palette.groups.flatMap((group) => group.commands)

const entryFor = (palette: CommandPalette, icon: string): CommandItem => {
  const found = entriesOf(palette).filter((entry) => entry.icon === icon)
  expect(found, `table T-109 places ${icon} on the palette`).toHaveLength(1)
  return found[0] as CommandItem
}

const pressed = (icon: string, settings: DocumentSettings): boolean =>
  entryFor(describedWith(settings), icon).isPressed

const pressedVectorOf = (palette: CommandPalette): readonly boolean[] =>
  entriesOf(palette).map((entry) => entry.isPressed)

describe('the manuscripts still say what these cases read', () => {
  it('was really driven by the manuscripts, and not by a hollow read of them', () => {
    expect(COMMAND_PALETTE_SURFACE.length, 'U-26 of table T-103').toBeGreaterThan(0)
    expect(T_202_ROWS.filter((row) => row.isBoolean).length, 'T-202 has boolean rows')
      .toBeGreaterThan(1)
    expect(T_202_ROWS.filter((row) => !row.isBoolean).length, 'T-202 has other rows')
      .toBeGreaterThan(1)
    expect(PALETTE_TOGGLES.length, 'the palette holds toggles').toBeGreaterThan(1)
    expect(PALETTE_NON_TOGGLES.length, 'the palette holds entrances on other rows')
      .toBeGreaterThan(0)
    const toggles = new Set(PALETTE_TOGGLES.map((entrance) => entrance.row))
    for (const entrance of PALETTE_NON_TOGGLES) {
      expect(toggles.has(entrance.row), `${entrance.row} is on both sides`).toBe(false)
    }
  })

  it('still reads the "same as above" cells, so no entrance of a family is dropped', () => {
    const sameAsAbove = T_109_PALETTE.filter((row) =>
      (row.by[T_109_ENTRANCE_COLUMN] ?? '').startsWith(SAME_AS_THE_ROW_ABOVE),
    )
    expect(sameAsAbove.length, 'table T-109 no longer writes a "same as above" cell')
      .toBeGreaterThan(0)
    const perSetting = new Map<string, number>()
    for (const entrance of PALETTE_ENTRANCES_ON_T_202) {
      perSetting.set(entrance.setting.id, (perSetting.get(entrance.setting.id) ?? 0) + 1)
    }
    expect(
      [...perSetting.values()].some((count) => count > 1),
      'no settings row of table T-202 is shared by a family of entrances',
    ).toBe(true)
  })

  it('joins every derived toggle to a key the document really carries', () => {
    for (const entrance of PALETTE_TOGGLES) {
      expect(entrance.setting.key.length, `${entrance.row}: ${entrance.setting.id}`)
        .toBeGreaterThan(0)
      expect(
        Object.prototype.hasOwnProperty.call(SETTINGS_DEFAULTS, entrance.setting.key),
        `${entrance.setting.id} is stored under ${entrance.setting.key}`,
      ).toBe(true)
    }
  })

  it('finds every derived toggle handed to FR-049, which is what EN-2 says', () => {
    for (const entrance of PALETTE_TOGGLES) {
      expect(entrance.authority, `table T-109 ${entrance.row}`).toContain('FR-049')
    }
  })

  it('leaves every non-toggle entrance with two values to be walked over', () => {
    for (const entrance of PALETTE_NON_TOGGLES) {
      expect(
        valuesOf(entrance.setting).length,
        `${entrance.row}: table T-202 ${entrance.setting.id} states no two values, and this ` +
          'bench holds no stand-in for it',
      ).toBeGreaterThan(1)
    }
  })

  it('still finds row EN-2 in table T-237, saying what these cases drive with', () => {
    const en2 = T_237.rows.find((row) => row.id === 'EN-2')
    expect(en2, 'table T-237 no longer has row EN-2').toBeDefined()
    expect(en2?.by[T_237_STATE_COLUMN]).toContain('FR-049')
    expect(en2?.by[T_237_STATE_COLUMN]).toContain('T-202')
    expect(bare(en2?.by[T_237_FILL_COLUMN] ?? ''), 'EN-2 is filled in S-183').toBe('S-183')
  })

  it('finds row EN-6 of table T-237 for an entrance that is the current exclusive choice', () => {
    // see EN-7
    expect(T_237.rows.map((row) => row.id)).toEqual(['EN-1', 'EN-2', 'EN-3', 'EN-4', 'EN-5', 'EN-6', 'EN-7'])
    const en6 = T_237.rows.find((row) => row.id === 'EN-6')
    expect(en6?.by[T_237_OWNER_COLUMN]).toContain('FR-048')
    expect(bare(en6?.by[T_237_FILL_COLUMN] ?? ''), 'EN-6 is filled in S-183').toBe('S-183')
    const en7 = T_237.rows.find((row) => row.id === 'EN-7')
    expect(en7?.by[T_237_OWNER_COLUMN]).toContain('FR-046')
    expect(bare(en7?.by[T_237_FILL_COLUMN] ?? ''), 'EN-7 is filled in S-183').toBe('S-183')
  })
})

describe('FR-029 EN-2 (MUST) -- the document settings reach UF-65', () => {
  it('describes a different palette when every toggle is on than when every one is off', () => {
    expect(
      pressedVectorOf(describedWith(ALL_ON)),
      'EN-2: turning every toggle on changes nothing the palette describes',
    ).not.toEqual(pressedVectorOf(describedWith(ALL_OFF)))
  })
})

describe('FR-029 EN-2 (MUST) -- a palette toggle is pressed exactly while its row is true', () => {
  it('presses every derived toggle while its own boolean is true', () => {
    for (const entrance of PALETTE_TOGGLES) {
      expect(
        pressed(entrance.row, settingsWith({ ...everyToggleAt(false), [entrance.setting.key]: true })),
        `EN-2: ${entrance.row} while ${entrance.setting.key} (${entrance.setting.id}) is true`,
      ).toBe(true)
    }
  })

  it('leaves every derived toggle unpressed while its own boolean is false', () => {
    for (const entrance of PALETTE_TOGGLES) {
      expect(
        pressed(entrance.row, settingsWith({ ...everyToggleAt(true), [entrance.setting.key]: false })),
        `EN-2: ${entrance.row} while ${entrance.setting.key} (${entrance.setting.id}) is false`,
      ).toBe(false)
    }
  })

  it('reads its own row and no other', () => {
    for (const entrance of PALETTE_TOGGLES) {
      const settings = settingsWith({ ...everyToggleAt(false), [entrance.setting.key]: true })
      const palette = describedWith(settings)
      const pressedRows = PALETTE_TOGGLES.filter((other) => entryFor(palette, other.row).isPressed)
      expect(
        pressedRows.map((one) => one.row),
        `EN-2: only ${entrance.row} answers to ${entrance.setting.key}`,
      ).toEqual([entrance.row])
    }
  })
})

describe('FR-049 (MUST NOT) -- a row that is not boolean makes no pressed entrance', () => {
  it('moves no entrance when a non-boolean row of table T-202 changes value', () => {
    for (const entrance of PALETTE_NON_TOGGLES) {
      const answers = valuesOf(entrance.setting).map((value) =>
        pressed(entrance.row, settingsWith({ [entrance.setting.key]: value })),
      )
      expect(
        new Set(answers).size,
        `FR-049 (MUST NOT): ${entrance.row} follows ${entrance.setting.key} ` +
          `(${entrance.setting.id}), whose values are ${JSON.stringify(valuesOf(entrance.setting))}`,
      ).toBe(1)
    }
  })
})

describe('FR-053 (MUST NOT) -- arming an entrance does not press it', () => {
  it('takes an arm without moving any pressed state, whatever the toggles say', () => {
    for (const settings of [ALL_OFF, ALL_ON]) {
      const unarmed = pressedVectorOf(describedWith(settings))
      for (const { row, armed } of T_023b) {
        expect(
          pressedVectorOf(
            describedWith(settings, { ...SHOWN, screen: { ...SHOWN.screen, armModeState: armed } }),
          ),
          `FR-053 (MUST NOT): table T-023b ${row} reached a pressed state`,
        ).toEqual(unarmed)
      }
    }
  })
})

describe('FR-102 (MUST NOT) -- IC-76 does not answer to the document', () => {
  it('keeps IC-76 where it is however the document settings are turned', () => {
    expect(
      pressed(RECORDING_ENTRANCE, ALL_ON),
      'FR-102 (MUST NOT): IC-76 moved when the document settings did',
    ).toBe(pressed(RECORDING_ENTRANCE, ALL_OFF))

    for (const entrance of PALETTE_TOGGLES) {
      expect(
        pressed(RECORDING_ENTRANCE, settingsWith({ [entrance.setting.key]: true })),
        `FR-102 (MUST NOT): IC-76 moved with ${entrance.setting.key}`,
      ).toBe(pressed(RECORDING_ENTRANCE, settingsWith({ [entrance.setting.key]: false })))
    }
  })

  it('is not one of the entrances EN-2 is about', () => {
    expect(PALETTE_TOGGLES.map((entrance) => entrance.row)).not.toContain(RECORDING_ENTRANCE)
    expect(PALETTE_NON_TOGGLES.map((entrance) => entrance.row)).not.toContain(RECORDING_ENTRANCE)
  })
})
