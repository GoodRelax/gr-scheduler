// Unit tests for commandPaletteFromScreenState (UF-65 of table T-075): the palette described from screen state.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithPalette,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionOfAll,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type {
  CommandItem,
  CommandPalette,
  DisplayLanguage,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
// WHY: the shared table reader takes its copy from the .md at read time,
// so a row added to the manuscript reaches this file automatically.
import { bare, specTable } from '../contract/spec-table'

// WHY: UF-65 reads table T-202's drawing settings for T-237's EN-2, so a
// full DocumentSettings is needed; these come generated, not hand-copied.
const SETTINGS: DocumentSettings = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

// see T-109
const T_109 = specTable('T-109')

const T_109_SURFACE = '面'
const T_109_GROUP = '群'
const T_109_ENTRANCE = '何の入口か'
const T_109_AUTHORITY = '正'

for (const column of [T_109_SURFACE, T_109_GROUP, T_109_ENTRANCE, T_109_AUTHORITY]) {
  if (!T_109.headings.includes(column)) {
    throw new Error(`表 T-109 no longer has a ${column} column: ${T_109.headings.join(' | ')}`)
  }
}

// see T-103
const COMMAND_PALETTE_SURFACE = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('表 T-103 no longer has row U-26')
  return bare(row.cells[0] ?? '')
})()

// WHY: whether a row is a button is prose inside T-109's own cell, not a
// column; a re-worded cell should report here rather than pass silently.
const NOT_A_BUTTON = 'ボタンではない'

const NO_GROUP_MARK = '—'

const codeSpans = (cell: string): readonly string[] =>
  [...cell.matchAll(/`([^`]+)`/gu)].map((found) => found[1] as string)

// see T-109
interface IconRow {
  readonly row: string
  readonly surfaces: readonly string[]
  readonly group: string
  readonly authority: string
  readonly isButton: boolean
}

const T_109_ROWS: readonly IconRow[] = T_109.rows.map((row) => {
  const group = row.by[T_109_GROUP] ?? ''
  return {
    row: row.id,
    surfaces: codeSpans(row.by[T_109_SURFACE] ?? ''),
    group: group === NO_GROUP_MARK ? '' : group,
    authority: bare(row.by[T_109_AUTHORITY] ?? ''),
    isButton: !(row.by[T_109_ENTRANCE] ?? '').includes(NOT_A_BUTTON),
  }
})

const T_109_PALETTE: readonly IconRow[] = T_109_ROWS.filter((entry) =>
  entry.surfaces.includes(COMMAND_PALETTE_SURFACE),
)

// WHY: every row on another surface, not a chosen few -- the whole
// table is to hand, so nothing here picks and chooses which rows matter.
const T_109_ELSEWHERE: readonly string[] = T_109_ROWS.filter(
  (entry) => !entry.surfaces.includes(COMMAND_PALETTE_SURFACE),
).map((entry) => entry.row)

// WHY: the spellings a shape/glyph carry are not settled (Armed says so
// of AR-3), so each row uses a spelling no case reads back.
const T_023b: readonly { readonly row: string; readonly armed: Armed }[] = [
  { row: 'AR-1', armed: { kind: 'none' } },
  { row: 'AR-2', armed: { kind: 'taskShape', shapeKind: 'SH-1' } },
  { row: 'AR-3', armed: { kind: 'milestoneShape', glyph: 'SH-5' } },
  { row: 'AR-4', armed: { kind: 'dependency' } },
  { row: 'AR-5', armed: { kind: 'commentBox' } },
  { row: 'AR-6', armed: { kind: 'highlightBox' } },
]

// see T-109
const ALIGN_REQUIREMENT = 'FR-034'

// WHY: a third condition beyond surface+button -- IC-75 is a button with
// no group (FR-053 puts it on the grab band), so it needs a group to print in.
const PALETTE_ENTRY_ROWS = T_109_PALETTE.filter((entry) => entry.isButton && entry.group !== '')

// WHY: FR-029's rationale groups the palette by decision time, and the
// table's own order is the only order it states.
const PALETTE_GROUP_NAMES: readonly string[] = PALETTE_ENTRY_ROWS.reduce<string[]>(
  (names, entry) => (names.includes(entry.group) ? names : [...names, entry.group]),
  [],
)

const rowsOfGroup = (group: string): readonly string[] =>
  PALETTE_ENTRY_ROWS.filter((entry) => entry.group === group).map((entry) => entry.row)

// WHY: grouped by first-met order, not the table's print order end to
// end -- the table returns to an earlier group three times near its end.
const PALETTE_ENTRY_ROWS_GROUPED: readonly string[] = PALETTE_GROUP_NAMES.flatMap((group) =>
  rowsOfGroup(group),
)

// WHY: read off the authority column, not named by row id, so a row
// reassigned to FR-034 is picked up automatically.
const ALIGN_ROWS: readonly string[] = PALETTE_ENTRY_ROWS.filter(
  (entry) => entry.authority === ALIGN_REQUIREMENT,
).map((entry) => entry.row)

// WHY: CR-194 keys a group's word by the row it is first met at, not by
// the group cell, so that key is what survives a change of display language.
const FIRST_ROW_OF_GROUP: readonly string[] = PALETTE_GROUP_NAMES.map(
  (group) => rowsOfGroup(group)[0] as string,
)

// WHY: read, never re-typed -- FR-038 (MUST NOT) bars the words from a
// requirement or table, and a copy here would be a second store.
const DICTIONARY = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
    'utf8',
  ),
) as {
  readonly icons: readonly {
    readonly rowId: string
    readonly label: Readonly<Record<DisplayLanguage, string>>
  }[]
  readonly paletteGroups: readonly {
    readonly firstRow: string
    readonly name: Readonly<Record<DisplayLanguage, string>>
  }[]
}

const labelWordOf = (row: string, language: DisplayLanguage): string => {
  const held = DICTIONARY.icons.find((one) => one.rowId === row)
  expect(held, `FR-038: the dictionary holds no entry for ${row}`).toBeDefined()
  return (held as { readonly label: Readonly<Record<DisplayLanguage, string>> }).label[language]
}

const groupWordOf = (firstRow: string, language: DisplayLanguage): string => {
  const held = DICTIONARY.paletteGroups.find((one) => one.firstRow === firstRow)
  expect(held, `FR-038: the dictionary holds no group opened at ${firstRow}`).toBeDefined()
  return (held as { readonly name: Readonly<Record<DisplayLanguage, string>> }).name[language]
}

const groupWordsIn = (language: DisplayLanguage): readonly string[] =>
  FIRST_ROW_OF_GROUP.map((row) => groupWordOf(row, language))

// WHY: the manuscript, not the generated constant -- reading the
// generated file the unit also reads could not tell drift from agreement.
const SETTINGS_MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8'),
) as {
  readonly blocks: readonly {
    readonly id?: string
    readonly rows?: readonly {
      readonly id?: string
      readonly default?: { readonly num?: string; readonly suffix?: string }
    }[]
  }[]
}

function settingDefaultNumber(table: string, row: string): number {
  const block = SETTINGS_MANUSCRIPT.blocks.find((one) => one.id === table)
  if (block === undefined) throw new Error(`the settings manuscript has no table ${table}`)
  const held = block.rows?.find((one) => one.id === row)
  if (held === undefined) throw new Error(`table ${table} of the manuscript has no row ${row}`)
  const num = held.default?.num
  if (num === undefined) throw new Error(`row ${row} of table ${table} prints no default number`)
  const value = Number(num)
  if (!Number.isFinite(value)) throw new Error(`row ${row} of table ${table} prints no number`)
  return value
}

// WHY: the height, not a size -- the row's own note says the palette's
// extent is decided by its contents (FR-053), not by this value.
const GRAB_BAND_HEIGHT = settingDefaultNumber('T-206', 'S-135a')

// WHY: read, not written -- DR-5 of table T-052 keeps the hue on
// Project rather than settings, so no generated constant holds it.
const THEME_HUE = settingDefaultNumber('T-216', 'S-73')

const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)
const HIDDEN: ScreenState = screenStateWithPalette(emptyScreenState(), false)

const sessionOf = (part: Partial<ScreenSession> = {}): ScreenSession => ({
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // WHY: these seven members stay fixed here because no case below varies
  // them (theme, selection sets, and the remembered properties subject).
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  // WHY: open, not S-142's default -- PALETTE_ENTRY_ROWS holds the
  // milestone entrances FR-053 keeps hidden until the list opens.
  isMilestoneListOpen: true,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  // WHY: GR-21 (table T-023d) divides these for the scrollbar grip's
  // length; zero means everything fits, so this file leaves it inert.
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  ...part,
})

const TASK_A: ItemRef = { kind: 'task', uid: 11 }
const TASK_B: ItemRef = { kind: 'task', uid: 12 }
const COMMENT_BOX: ItemRef = { kind: 'commentBox', id: 'cb-1' }

// WHY: picked one at a time, so SL-7b's order exists.
const pickedInTurn = (...items: readonly ItemRef[]): Selection =>
  items.reduce((selection, item) => selectionWith(selection, item), emptySelection())

// WHY: a marquee (SL-3) or select-all (SL-5) takes everything at once, so no order exists.
const pickedAtOnce = (...items: readonly ItemRef[]): Selection => selectionOfAll(items)

const SELECTIONS: readonly { readonly what: string; readonly selection: Selection }[] = [
  { what: 'nothing selected', selection: emptySelection() },
  { what: 'one task, picked', selection: pickedInTurn(TASK_A) },
  { what: 'two tasks, picked in turn', selection: pickedInTurn(TASK_A, TASK_B) },
  { what: 'two tasks, taken at once', selection: pickedAtOnce(TASK_A, TASK_B) },
  { what: 'one comment box, picked', selection: pickedInTurn(COMMENT_BOX) },
]

const describedWith = (
  selection: Selection = emptySelection(),
  session: ScreenSession = sessionOf(),
  state: ScreenState = SHOWN,
): CommandPalette => {
  const palette = commandPaletteFromScreenState(state, SETTINGS, selection, session)
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

const entriesOf = (palette: CommandPalette): readonly CommandItem[] =>
  palette.groups.flatMap((group) => group.commands)

const iconsOf = (palette: CommandPalette): readonly string[] =>
  entriesOf(palette).map((entry) => entry.icon)

const entryFor = (palette: CommandPalette, icon: string): CommandItem | undefined =>
  entriesOf(palette).find((entry) => entry.icon === icon)

// WHY: a word carries a letter or digit; a separator or empty string does not.
const hasWord = (text: string): boolean => /[\p{L}\p{N}]/u.test(text)

const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value
  for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  return Object.freeze(value)
}

describe('UF-65 -- S-99e: described only while the palette is showing', () => {
  it('describes nothing while S-99e says it is hidden', () => {
    expect(commandPaletteFromScreenState(HIDDEN, SETTINGS, emptySelection(), sessionOf())).toBeNull()
  })

  it('describes one by default, because S-99e defaults to showing', () => {
    // WHY: emptyScreenState is where that default lives; this does not repeat it.
    expect(commandPaletteFromScreenState(emptyScreenState(), SETTINGS, emptySelection(), sessionOf())).not.toBeNull()
  })

  it('spells hidden one way only, which EP-11 of table T-076 also exports', () => {
    // WHY: EP-11 treats the palette as closed on export; a description
    // with no entries would be a second spelling of hidden.
    for (const { what, selection } of SELECTIONS) {
      expect(commandPaletteFromScreenState(HIDDEN, SETTINGS, selection, sessionOf()), what).toBeNull()
      expect(entriesOf(describedWith(selection)).length, what).toBeGreaterThan(0)
    }
  })

  it('answers hidden whatever else is going on', () => {
    // WHY: S-99e is the whole condition -- no arm, pointer, or selection turns it back on.
    for (const { row, armed } of T_023b) {
      const state = screenStateWithArmed(HIDDEN, armed)
      const session = sessionOf({ pointer: { x: 5, y: 5 }, commandPaletteAt: { x: 0, y: 0 } })
      expect(commandPaletteFromScreenState(state, SETTINGS, pickedInTurn(TASK_A), session), row).toBeNull()
    }
  })
})

describe('UF-65 -- FR-053: it floats where the person dragged it', () => {
  it('puts the corner it floats at where `ScreenSession.commandPaletteAt` says', () => {
    // WHY: FR-053 has the person drag the palette, so its place is not
    // one of ScreenRegions' rectangles; the corner is the whole geometry here.
    for (const at of [
      { x: 0, y: 0 },
      { x: 12, y: 340 },
      { x: -40, y: -1 },
      { x: 1919.5, y: 1079.5 },
    ]) {
      const corner = describedWith(emptySelection(), sessionOf({ commandPaletteAt: at })).at
      expect(corner, JSON.stringify(at)).toEqual(at)
    }
  })

  it('carries a place and no extent, because FR-053 forbids one being held', () => {
    // WHY: FR-053 (MUST NOT) bars a width, height, box or rectangle here
    // -- no unit on this side of IF-9 measures anything (LR-6).
    const palette = describedWith(emptySelection(), sessionOf({ commandPaletteAt: { x: 12, y: 34 } }))
    expect(Object.keys(palette.at).sort()).toEqual(['x', 'y'])
    // WHY: grabBandHeight is a height, not an extent; minimise and
    // isMinimised are the toggle and its state, not a size either.
    expect(Object.keys(palette).sort()).toEqual([
      'armedText',
      'at',
      'grabBandHeight',
      'groups',
      'isMinimised',
      'minimise',
    ])
    expect(typeof palette.grabBandHeight, 'a pair here would be an extent again').toBe('number')
  })

  it('moves only the place when the person drags it', () => {
    // WHY: SC-6 (table T-031) keeps the palette still against the
    // screen, so a drag is the only thing that can move it.
    const here = describedWith(emptySelection(), sessionOf({ commandPaletteAt: { x: 0, y: 0 } }))
    const there = describedWith(emptySelection(), sessionOf({ commandPaletteAt: { x: 300, y: 90 } }))
    expect({ ...there, at: here.at }).toEqual(here)
  })
})

describe('UF-65 -- GR-19 of table T-023d: the band FR-053 is dragged by', () => {
  it('lays a band whenever it describes a palette, however the palette is asked for', () => {
    // WHY: GR-19 is a MUST with top priority, so no state of arm,
    // selection, corner or language may leave this member unanswered.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      for (const { what, selection } of SELECTIONS) {
        for (const { row, armed } of T_023b) {
          const palette = describedWith(
            selection,
            sessionOf({ language, commandPaletteAt: { x: -12, y: 900 } }),
            screenStateWithArmed(SHOWN, armed),
          )
          expect(palette.grabBandHeight, `${language} / ${what} / ${row}`).toBe(GRAB_BAND_HEIGHT)
        }
      }
    }
  })

  it('takes the height from the manuscript S-135a rather than from a number of its own', () => {
    // WHY: read from the manuscript at read time, so re-deciding S-135a
    // fails this case instead of leaving a stale literal behind.
    expect(describedWith().grabBandHeight).toBe(GRAB_BAND_HEIGHT)
  })

  it('never answers a band nobody could grab', () => {
    // WHY: a zero-height band is ungrabbable, the same accident as a
    // corner nobody can reach; this only claims S-135a is not that.
    expect(describedWith().grabBandHeight).toBeGreaterThan(0)
  })

  it('reaches the screen as the band and never as an entry (IC-53 of table T-109)', () => {
    // WHY: pressing IC-53 begins a drag, not a command, so it must reach
    // the screen as the band's height and never as an entry.
    const palette = describedWith()
    const notAButton = T_109_PALETTE.find((entry) => entry.authority === 'FR-053')
    expect(notAButton, 'table T-109 no longer places a row of FR-053 on the palette').toBeDefined()
    expect(notAButton?.isButton, 'table T-109 calls that row no button').toBe(false)
    expect(iconsOf(palette)).not.toContain((notAButton as { readonly row: string }).row)
    expect(palette.grabBandHeight).toBe(GRAB_BAND_HEIGHT)
  })
})

describe('UF-65 -- FR-053 (MUST): what is armed is readable on the screen', () => {
  it('says something for every arm of table T-023b', () => {
    // WHY: an empty armedText answers nothing, and FR-053 makes reading
    // what is armed a MUST.
    for (const { row, armed } of T_023b) {
      const palette = describedWith(emptySelection(), sessionOf(), screenStateWithArmed(SHOWN, armed))
      // WHY: null is the minimised reading and nothing else; sessionOf()
      // is not minimised, so null here is the MUST broken.
      expect(palette.armedText, `FR-053 (MUST): ${row} reads null while shown`).not.toBeNull()
      expect(palette.armedText?.length ?? 0, `FR-053 (MUST): ${row}`).toBeGreaterThan(0)
    }
  })

  it('tells the six arms of table T-023b apart', () => {
    // WHY: table T-023b holds the whole of what can be armed; two arms
    // sharing one text could not be told apart.
    const texts = T_023b.map(
      ({ armed }) =>
        describedWith(emptySelection(), sessionOf(), screenStateWithArmed(SHOWN, armed)).armedText,
    )
    expect(new Set(texts).size).toBe(T_023b.length)
  })

  it('reads the arm off `ScreenState` and nothing else', () => {
    // WHY: U-38 forbids calling an arm a selection; neither the
    // selection nor the pointer may move it.
    for (const { row, armed } of T_023b) {
      const state = screenStateWithArmed(SHOWN, armed)
      const texts = SELECTIONS.map(
        ({ selection }) =>
          describedWith(selection, sessionOf({ pointer: { x: 3, y: 4 } }), state).armedText,
      )
      expect(new Set(texts).size, row).toBe(1)
    }
  })
})

describe('the copy of 表 T-109 this file is driven by', () => {
  it('⭐ really came from the manuscript, and not from a hollow read of it', () => {
    // WHY: without this, a parse matching nothing would make every case
    // below agree with anything.
    expect(COMMAND_PALETTE_SURFACE.length, 'U-26 of 表 T-103').toBeGreaterThan(0)
    expect(T_109_ROWS.length, '表 T-109 has rows').toBeGreaterThan(1)
    expect(T_109_PALETTE.length, 'rows on the palette').toBeGreaterThan(1)
    expect(T_109_ELSEWHERE.length, 'rows on another surface').toBeGreaterThan(1)
    expect(PALETTE_GROUP_NAMES.length, 'the 群 column names groups').toBeGreaterThan(1)
    expect(ALIGN_ROWS.length, 'the 正 column names FR-034').toBeGreaterThan(0)
  })

  it('⚠️ the one Japanese needle still matches the rows it is about', () => {
    // WHY: this prose lives inside a cell, not a column; a re-worded
    // cell would silently make every row a button, so the match is measured here.
    expect(T_109_PALETTE.filter((entry) => !entry.isButton).length).toBeGreaterThan(0)
    expect(
      T_109_PALETTE.filter((entry) => !entry.isButton && entry.group !== '').length,
    ).toBeGreaterThan(0)
    expect(T_109_PALETTE.filter((entry) => entry.isButton && entry.group === '').length)
      .toBeGreaterThan(0)
  })
})

describe('UF-65 -- FR-029 (MUST): the roster and the placement follow table T-109', () => {
  it('carries every palette row of the table that is a button, and no other', () => {
    // WHY: the surface column IS the placement (FR-029, MUST).
    expect(iconsOf(describedWith())).toEqual(PALETTE_ENTRY_ROWS_GROUPED)
  })

  it('leaves out the two rows the table marks as not being buttons', () => {
    // WHY: both reach the screen some other way -- the drag corner and the armed text.
    const icons = iconsOf(describedWith())
    for (const entry of T_109_PALETTE.filter((row) => !row.isButton)) {
      expect(icons, `table T-109: ${entry.row} is not a button`).not.toContain(entry.row)
    }
  })

  it('lets no row placed on another surface reach the palette', () => {
    // WHY: FR-029 binds placement to the surface column; a row placed
    // elsewhere has no business here.
    const icons = iconsOf(describedWith())
    for (const row of T_109_ELSEWHERE) {
      expect(icons, `FR-029 (MUST): ${row} is placed elsewhere`).not.toContain(row)
    }
  })

  it('keeps the show/hide entrance outside the palette (FR-053, MUST)', () => {
    // WHY: the entrance that hides the palette must sit outside it, or
    // it disappears the moment it is used.
    expect(iconsOf(describedWith())).not.toContain('IC-7')
  })

  it('never carries the same entry twice (MUST NOT)', () => {
    // WHY: FR-029's one exception (the display language) is placed on two OTHER surfaces.
    for (const { what, selection } of SELECTIONS) {
      const icons = iconsOf(describedWith(selection))
      expect(new Set(icons).size, `FR-029 (MUST NOT): a repeat with ${what}`).toBe(icons.length)
    }
  })

  it('invents no entry the table does not place here', () => {
    const placed = new Set<string>(T_109_PALETTE.map((entry) => entry.row))
    for (const icon of iconsOf(describedWith())) {
      expect(placed.has(icon), `FR-029 (MUST): ${icon} is not a row of the palette`).toBe(true)
    }
  })
})

describe('UF-65 -- FR-029: U-34 `Palette Groups` follow the 群 column', () => {
  it('opens the groups in the order the table first meets them', () => {
    // WHY: re-sorting by anything else would move entries out of their
    // group -- the table returns to an earlier group three times near its end.
    expect(describedWith().groups.map((group) => group.name)).toEqual(groupWordsIn('ja'))
  })

  it('keeps the table print order inside each group', () => {
    // WHY: walked by position, not name -- the case above already pins the order.
    const groups = describedWith().groups
    groups.forEach((group, at) => {
      expect(group.commands.map((entry) => entry.icon), group.name).toEqual(
        rowsOfGroup(PALETTE_GROUP_NAMES[at] as string),
      )
    })
    expect(groups.length).toBe(PALETTE_GROUP_NAMES.length)
  })

  it('opens no group for a row that is not an entry', () => {
    // WHY: a group standing empty would be a heading with nothing under
    // it, and the dictionary does hold a word for it.
    const notAnEntry = T_109_PALETTE.find((entry) => !entry.isButton && entry.group !== '')
    expect(notAnEntry, 'table T-109 no longer puts a 群 on a row that is not an entry').toBeDefined()
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      const palette = describedWith(emptySelection(), sessionOf({ language }))
      expect(palette.groups.map((group) => group.name), language).not.toContain(
        groupWordOf((notAnEntry as { readonly row: string }).row, language),
      )
      for (const group of palette.groups) expect(group.commands.length).toBeGreaterThan(0)
    }
  })

  it('takes each group name from the dictionary, in the display language', () => {
    // WHY: FR-038's fifth paragraph now settles one store; the word
    // printed is the dictionary's word for the row the group opens at.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      const palette = describedWith(emptySelection(), sessionOf({ language }))
      expect(palette.groups.map((group) => group.name), language).toEqual(groupWordsIn(language))
    }
  })

  it('answers a different name per language, because the words are per language', () => {
    // WHY: only asked of groups the dictionary really holds two
    // different words for; agreement there is the dictionary's answer, not a fault.
    const inJapanese = describedWith(emptySelection(), sessionOf({ language: 'ja' })).groups
    const inEnglish = describedWith(emptySelection(), sessionOf({ language: 'en' })).groups

    FIRST_ROW_OF_GROUP.forEach((row, at) => {
      if (groupWordOf(row, 'ja') === groupWordOf(row, 'en')) return
      expect(inEnglish[at]?.name, `FR-038 (MUST): the group opened at ${row}`).not.toBe(
        inJapanese[at]?.name,
      )
    })
  })
})

describe('UF-65 -- FR-029 (MUST) with SL-7b (MUST NOT): what cannot be used is faint', () => {
  it('offers the alignment entries while an ordered selection holds tasks', () => {
    // WHY: FR-034 lines tasks up by the LAST-picked task's date, which an order makes reachable.
    const palette = describedWith(pickedInTurn(TASK_A, TASK_B))
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `FR-034: ${row}`).toBe(true)
    }
  })

  it('refuses them on a selection that carries no order (SL-7b, MUST NOT)', () => {
    // WHY: a marquee or select-all makes no order, and FR-029 shows
    // that as faint rather than a press that does nothing.
    const palette = describedWith(pickedAtOnce(TASK_A, TASK_B))
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `SL-7b (MUST NOT): ${row}`).toBe(false)
    }
  })

  it('refuses them while nothing is selected', () => {
    // WHY: FR-034 has no task to move and no last-picked task to move it to.
    const palette = describedWith(emptySelection())
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `FR-034: ${row} with nothing selected`).toBe(false)
    }
  })

  it('refuses them when the ordered selection holds no task', () => {
    // WHY: FR-034 speaks of selected tasks; SL-1 admits four other kinds with no date.
    const palette = describedWith(pickedInTurn(COMMENT_BOX))
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `FR-034: ${row} with no task selected`).toBe(false)
    }
  })

  it('leaves every other entry usable, whatever is selected', () => {
    // WHY: FR-083 gives a shape entry a defined meaning with or without
    // a selection, and FR-029 draws faint only what cannot be used.
    for (const { what, selection } of SELECTIONS) {
      for (const entry of entriesOf(describedWith(selection))) {
        if (ALIGN_ROWS.includes(entry.icon)) continue
        expect(entry.isEnabled, `FR-029: ${entry.icon} with ${what}`).toBe(true)
      }
    }
  })
})

describe('UF-65 -- FR-038: the display language', () => {
  it('takes each entry word from the dictionary, in the display language', () => {
    // WHY: FR-038's fifth paragraph settled the one store; the expected
    // value is read out of the dictionary, not off what the unit answers.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      for (const entry of entriesOf(describedWith(emptySelection(), sessionOf({ language })))) {
        expect(entry.label, `${language}: ${entry.icon}`).toBe(labelWordOf(entry.icon, language))
      }
    }
  })

  it('leaves no entry without a word to read (FR-029 MUST)', () => {
    // WHY: an entry printed with nothing on it cannot be named; an
    // empty dictionary would still pass the previous case.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      for (const entry of entriesOf(describedWith(emptySelection(), sessionOf({ language })))) {
        expect(hasWord(entry.label), `${language}: ${entry.icon} carries no word`).toBe(true)
      }
    }
  })

  it('describes the same entries in either language', () => {
    // WHY: FR-038 keeps one language state for the whole screen and
    // translates no roster; which entries appear is table T-109's answer.
    const inJapanese = describedWith(emptySelection(), sessionOf({ language: 'ja' }))
    const inEnglish = describedWith(emptySelection(), sessionOf({ language: 'en' }))
    expect(iconsOf(inEnglish)).toEqual(iconsOf(inJapanese))
  })
})

describe('UF-65 -- table T-075 makes the unit `pure` (R7.1)', () => {
  it('rewrites none of its three arguments', () => {
    // WHY: a pure unit that rewrites an argument is a defect a
    // specification-driven run has caught before.
    const state = deepFreeze(screenStateWithArmed(SHOWN, { kind: 'dependency' }))
    const selection = deepFreeze(pickedInTurn(TASK_A, TASK_B))
    const session = deepFreeze(sessionOf({ pointer: { x: 4, y: 4 } }))
    const before = JSON.stringify([state, selection, session])

    commandPaletteFromScreenState(state, SETTINGS, selection, session)

    expect(JSON.stringify([state, selection, session])).toBe(before)
  })

  it('answers the same for the same inputs', () => {
    for (const { what, selection } of SELECTIONS) {
      const session = sessionOf({ commandPaletteAt: { x: 7, y: 8 }, pointer: { x: 7, y: 8 } })
      const first = commandPaletteFromScreenState(SHOWN, SETTINGS, selection, session)
      const second = commandPaletteFromScreenState(SHOWN, SETTINGS, selection, session)
      expect(second, what).toEqual(first)
    }
  })
})

describe('UF-65 -- boundaries the specification admits', () => {
  it('describes the palette with nothing selected at all', () => {
    // WHY: emptySelection is SL-6's state; FR-083's SP-1 is defined there.
    const palette = describedWith(emptySelection())
    expect(iconsOf(palette).length).toBe(PALETTE_ENTRY_ROWS.length)
  })

  it('describes the palette with a single selected item', () => {
    // WHY: SP-2 of FR-083 is the one-selected case; SL-7b's order exists from the first pick.
    expect(iconsOf(describedWith(pickedInTurn(TASK_A)))).toEqual(PALETTE_ENTRY_ROWS_GROUPED)
  })

  it('describes the palette while the pointer is outside the window', () => {
    // WHY: a pointer nowhere at all takes nothing off the description
    // now that the faintness question moved across IF-9.
    const palette = describedWith(emptySelection(), sessionOf({ pointer: null }))
    expect(iconsOf(palette).length).toBe(PALETTE_ENTRY_ROWS.length)
  })

  it('takes a corner outside the screen without changing what it holds', () => {
    // WHY: table T-206 holds no row for the palette's place, so there is no bound to apply.
    const at = { x: -500, y: -500 }
    const offScreen = describedWith(emptySelection(), sessionOf({ commandPaletteAt: at }))
    expect(iconsOf(offScreen)).toEqual(PALETTE_ENTRY_ROWS_GROUPED)
    expect(offScreen.at).toEqual(at)
  })
})
