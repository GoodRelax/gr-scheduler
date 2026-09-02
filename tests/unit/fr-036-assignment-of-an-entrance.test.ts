// The `入口` column of 表 T-036 and 表 T-023, and the assignment the tooltip of
// an entrance carries because of it.
//
// Unit under test: UF-69 of table T-075 (`tooltips.ts`, component CP-37 of
// table T-062, published as PI-37 of table T-064) -- the unit that turns a
// `ScreenView` and a `ScreenSession` into the `Tooltip`s EZ-2 asks for.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   T-036 の結び  ⭐ 「`入口` の欄は、その割当が動かす 表 T-109 の行を名指すこと
//                 （MUST）。行 ID で書き、割当の綴りも入口の説明も写してはなら
//                 ない（MUST NOT）」 -- 「綴りの家は 1 つである（`R3.4`）」。
//                 ⚠️ 「1 つの割当が入口を 2 つ動かすことがある（`SK-16` は拡大と
//                 縮小）ので、`/` で並べてよい。動かす入口が無い行は `—` とする
//                 こと（MUST）」。
//   T-023 の結び  ⭐ 「`入口` の欄の規則は 表 T-036 の結びが持つ」 -- so one rule
//                 governs two tables, and both are walked here.
//   EZ-2 (T-040)  ⭐ 「説明の後ろに、その行の割当も出すこと（MUST）」、「割当が
//                 指すものも、語をどこから取るかも `FR-036` と同じであること
//                 （MUST）。同じ対を 2 通りに組み立ててはならない（MUST NOT）」。
//   FR-036        ⭐ 「ここでいう割当は、キー（表 T-036 の `割当`）とマウス操作
//                 （表 T-023 の `操作`）の両方を指すこと（MUST）」、「どちらも
//                 持たない行は、その場所を空ける」。
//                 ⚠️ 「キーの綴りは語ではない —— `Ctrl+S` はどの言語でも同じな
//                 ので、表 T-036 の `割当` の欄から運ぶ」。
//                 ⛔ 「マウス操作は語である（MUST） —— …辞書が 表 T-023 の行 ID
//                 で持つこと（MUST）。同表の `操作` の欄を画面へ運んではならない
//                 （MUST NOT）」。
//   FR-038        the one per-language dictionary every printed word comes from.
//   S-124         `iconHintDelayMs` -- EZ-2's wait. ⛔ Never typed here: it is
//                 read from the generated `SETTINGS_DEFAULTS`.
//   T-109         the roster of entrances. Every row ID an `入口` cell names has
//                 to be one of its rows, or the column names nothing.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for the rules above, `docs/spec/_source/
// display-words.json` for the words FR-038 puts on the screen, and of `src/`
// nothing at all -- not one file. The unit is reached through the declarations
// tests/unit/uf-69.test.ts already imports, and the fixtures (`EMPTY_VIEW`,
// `EMPTY_SESSION`, `commandOf`, `restingOn`) are copied from that file, which
// drives this same unit.
//
// ⭐ THE DICTIONARY IS READ FROM `docs/spec/_source/`, not from the copy
// Chapter 6.2 generates into `src/`. The manuscript is the SSOT; the two are
// held together cell for cell by tests/contract/display-words.contract.test.ts
// and by `npm run gen:check`.
//
// ⭐ WHERE THE SPECIFICATION DECIDES NOTHING, NOTHING IS ASSERTED:
//   * WHICH of the two an entrance shows when BOTH tables name it. IC-12 ..
//     IC-15 are named by 表 T-036 (`SK-16` / `SK-16a`) and by 表 T-023 (`MK-3` /
//     `MK-4`) at once, and no line anywhere says which wins. So the cases for
//     those four ask only that the place is not left empty, and that whatever
//     stands there is one of the two the specification allows.
//   * WHAT SEPARATES the explanation from the assignment on the screen. EZ-2
//     says 「説明の後ろに」 and stops; the `Tooltip` carries them as two members,
//     and no case here asks for a joining string.
//   * WHETHER a `—` cell could instead be blank. The MUST spells the mark, so
//     the mark is what is asserted.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  CommandItem,
  DisplayLanguage,
  IconId,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const T_036 = specTable('T-036')
const T_023 = specTable('T-023')
const T_109 = specTable('T-109')

/** The heading the MUST is written about. */
const ENTRANCE_COLUMN = '入口'

/** The mark the MUST requires of a row that drives no entrance. */
const NO_ENTRANCE = '—'

/** The row IDs one `入口` cell names, in the order the cell writes them. */
function entrancesOf(cell: string): readonly string[] {
  const written = cell.replace(/`/g, '').trim()
  if (written === NO_ENTRANCE) return []
  return written.split('/').map((one) => one.trim())
}

/** Every row of one table that names at least one entrance. */
function driversOf(table: ReturnType<typeof specTable>): readonly {
  readonly row: string
  readonly icons: readonly string[]
}[] {
  return table.rows
    .map((row) => ({ row: row.id, icons: entrancesOf(row.by[ENTRANCE_COLUMN] ?? '') }))
    .filter((one) => one.icons.length > 0)
}

/**
 * 表 T-036 / 表 T-023 — the rows that name an entrance, as a fixed copy made
 * from the tables (Chapter 1.9 :275). ⛔ The spellings are NOT copied: the
 * MUST NOT keeps them in the `割当` / `操作` columns, and the cases below read
 * them from there.
 */
const KEY_DRIVERS = [
  { row: 'SK-6', icons: ['IC-5'] },
  { row: 'SK-7', icons: ['IC-6'] },
  { row: 'SK-8', icons: ['IC-52'] },
  { row: 'SK-10', icons: ['IC-1'] },
  { row: 'SK-12', icons: ['IC-2'] },
  { row: 'SK-13', icons: ['IC-22'] },
  { row: 'SK-14', icons: ['IC-7'] },
  { row: 'SK-15', icons: ['IC-11'] },
  { row: 'SK-16', icons: ['IC-13', 'IC-12'] },
  { row: 'SK-16a', icons: ['IC-15', 'IC-14'] },
  { row: 'SK-18', icons: ['IC-10'] },
  { row: 'SK-20', icons: ['IC-44'] },
] as const

const MOUSE_DRIVERS = [
  { row: 'MK-3', icons: ['IC-12', 'IC-13'] },
  { row: 'MK-4', icons: ['IC-14', 'IC-15'] },
] as const

/** The four entrances both tables name at once -- see the head comment. */
const NAMED_BY_BOTH = ['IC-12', 'IC-13', 'IC-14', 'IC-15'] as const

/**
 * Entrances that no row of either table drives. ⭐ Copied from 表 T-109 by
 * taking rows the two tables never name; a case below re-derives the set from
 * the tables so this copy cannot quietly go stale.
 */
const DRIVEN_BY_NOTHING = ['IC-3', 'IC-4', 'IC-8'] as const

/**
 * The one dictionary FR-038's fifth paragraph (MUST) holds the printed words
 * in, read from the manuscript rather than from the file Chapter 6.2 generates.
 */
const DICTIONARY = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as {
  readonly assignments: readonly {
    readonly rowId: string
    readonly press: Readonly<Record<DisplayLanguage, string>>
  }[]
}

/** The words FR-036 (MUST) requires a mouse operation to be shown by. */
function pressWordOf(row: string, language: DisplayLanguage): string {
  const held = DICTIONARY.assignments.find((one) => one.rowId === row)
  expect(held, `FR-038: the dictionary holds no assignment for ${row}`).toBeDefined()
  const word = (held as { readonly press?: Readonly<Record<DisplayLanguage, string>> }).press
  expect(word, `FR-036 (MUST): the dictionary holds no mouse wording for ${row}`).toBeDefined()
  return (word as Readonly<Record<DisplayLanguage, string>>)[language]
}

/** One cell of a table, with the code-span marks taken off. */
function cellOf(table: ReturnType<typeof specTable>, row: string, heading: string): string {
  const found = table.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table ${table.id} no longer has row ${row}`)
  return found.by[heading] ?? ''
}

/** Every `code span` of a cell -- the spellings 表 T-036 writes in its 割当 column. */
function spellingsIn(cell: string): readonly string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((one) => one[1] as string)
}

// ---------------------------------------------------------------------------
// Inputs. Copied from tests/unit/uf-69.test.ts, which drives the same unit.
// ---------------------------------------------------------------------------

const WAIT_MS = SETTINGS_DEFAULTS['iconHintDelayMs'] as number

const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const SETTINGS = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

const commandOf = (icon: IconId): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: `the name of ${icon}`,
})

const EMPTY_VIEW: Omit<ScreenView, 'tooltips'> = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
}

const EMPTY_SESSION: ScreenSession = {
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
}

/**
 * The assignment the tooltip of one entrance carries, with the pointer resting
 * on it past EZ-2's wait, in one display language.
 */
function assignmentShownFor(icon: string, language: DisplayLanguage): string | null {
  const view: Omit<ScreenView, 'tooltips'> = {
    ...EMPTY_VIEW,
    language,
    appHeaderItems: {
      ...EMPTY_VIEW.appHeaderItems,
      language,
      commands: [commandOf(icon as IconId)],
    },
  }
  const session: ScreenSession = {
    ...EMPTY_SESSION,
    language,
    pointer: { x: 5, y: 5 },
    pointerRestedMs: WAIT_MS + 1,
    iconUnderPointer: icon as IconId,
  }
  const shown = tooltipsFromScreenView(view, SETTINGS, session)
  const found = shown.find((one) => one.anchor.kind === 'icon' && one.anchor.icon === icon)
  expect(found, `EZ-2 (MUST): resting on ${icon} past the wait explains nothing`).toBeDefined()
  return (found as { readonly assignment: string | null }).assignment
}

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

// ---------------------------------------------------------------------------
// 表 T-036 の結び — the column itself
// ---------------------------------------------------------------------------

describe('表 T-036 の結び (MUST) — the 入口 column names rows of 表 T-109', () => {
  it('both tables carry the column the rule is written about', () => {
    // 「`入口` の欄は…（MUST）」, and 表 T-023's own closing note sends the rule
    // for its column here: 「`入口` の欄の規則は 表 T-036 の結びが持つ」.
    expect(T_036.headings, `表 T-036: ${T_036.headings.join(' | ')}`).toContain(ENTRANCE_COLUMN)
    expect(T_023.headings, `表 T-023: ${T_023.headings.join(' | ')}`).toContain(ENTRANCE_COLUMN)
  })

  it('every cell is either the mark or row IDs, and never a spelling', () => {
    // 「行 ID で書き、割当の綴りも入口の説明も写してはならない（MUST NOT）」.
    const rowId = /^[A-Za-z]{1,4}-\d+[a-z]?$/
    for (const table of [T_036, T_023]) {
      for (const row of table.rows) {
        const written = (row.by[ENTRANCE_COLUMN] ?? '').replace(/`/g, '').trim()
        if (written === NO_ENTRANCE) continue
        for (const named of written.split('/')) {
          expect(named.trim(), `${table.id} の ${row.id}: 「${written}」`).toMatch(rowId)
        }
      }
    }
  })

  it('names only rows 表 T-109 has', () => {
    const roster = new Set(T_109.rows.map((row) => row.id))
    for (const table of [T_036, T_023]) {
      for (const one of driversOf(table)) {
        for (const icon of one.icons) {
          expect(roster.has(icon), `${table.id} の ${one.row} names ${icon}, 表 T-109 does not`).toBe(
            true,
          )
        }
      }
    }
  })

  it('leaves the mark, not a blank, on a row that drives nothing', () => {
    // 「動かす入口が無い行は `—` とすること（MUST）」 -- 「読むたびに立つ事実の
    // 記録である」.
    for (const table of [T_036, T_023]) {
      for (const row of table.rows) {
        const written = (row.by[ENTRANCE_COLUMN] ?? '').replace(/`/g, '').trim()
        expect(written, `${table.id} の ${row.id} leaves the 入口 cell empty`).not.toBe('')
      }
    }
  })

  it('drives the entrances the fixed copy of the two tables names', () => {
    // Chapter 1.9 :275 -- the copy above against the tables themselves.
    expect(driversOf(T_036)).toEqual(KEY_DRIVERS.map((one) => ({ ...one, icons: [...one.icons] })))
    expect(driversOf(T_023)).toEqual(MOUSE_DRIVERS.map((one) => ({ ...one, icons: [...one.icons] })))
  })

  it('names four entrances from both tables at once, and no other', () => {
    // ⭐ The reading the cases below rest on, taken from the tables rather than
    // asserted from the head comment.
    const keyed = new Set(driversOf(T_036).flatMap((one) => one.icons))
    const moused = new Set(driversOf(T_023).flatMap((one) => one.icons))
    const both = [...moused].filter((icon) => keyed.has(icon)).sort()
    expect(both).toEqual([...NAMED_BY_BOTH].sort())
  })

  it('leaves the three entrances the cases below use as the empty case undriven', () => {
    const driven = new Set(
      [...driversOf(T_036), ...driversOf(T_023)].flatMap((one) => one.icons),
    )
    for (const icon of DRIVEN_BY_NOTHING) {
      expect(driven.has(icon), `${icon} is driven after all`).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// EZ-2 + FR-036 — the assignment the tooltip carries
// ---------------------------------------------------------------------------

describe('EZ-2 (MUST) — a key row puts its spelling behind the explanation', () => {
  /** The rows of 表 T-036 whose entrances 表 T-023 does not also name. */
  const KEY_ONLY = KEY_DRIVERS.flatMap((one) =>
    one.icons
      .filter((icon) => !(NAMED_BY_BOTH as readonly string[]).includes(icon))
      .map((icon) => ({ row: one.row, icon })),
  )

  for (const { row, icon } of KEY_ONLY) {
    it(`${icon} carries every spelling 表 T-036 の ${row} writes`, () => {
      // FR-036: 「キーの綴りは語ではない…表 T-036 の `割当` の欄から運ぶ」.
      const spellings = spellingsIn(cellOf(T_036, row, '割当'))
      expect(spellings.length, `表 T-036 の ${row} writes no spelling`).toBeGreaterThan(0)
      for (const language of LANGUAGES) {
        const shown = assignmentShownFor(icon, language)
        expect(shown, `EZ-2 (MUST): ${icon} shows no assignment in ${language}`).not.toBeNull()
        for (const spelling of spellings) {
          expect(shown ?? '', `${icon} (${language}) drops ${row}'s 「${spelling}」`).toContain(
            spelling,
          )
        }
      }
    })
  }

  it('spells a key the same way in both languages', () => {
    // FR-036: 「キーの綴りは語ではない —— `Ctrl+S` はどの言語でも同じなので」.
    for (const { icon } of KEY_ONLY) {
      expect(assignmentShownFor(icon, 'en'), `${icon} spells its key twice`).toBe(
        assignmentShownFor(icon, 'ja'),
      )
    }
  })
})

describe('EZ-2 (MUST) — a mouse row puts the dictionary word behind the explanation', () => {
  for (const { row, icons } of MOUSE_DRIVERS) {
    for (const icon of icons) {
      it(`${icon} shows exactly what the dictionary holds for 表 T-023 の ${row}`, () => {
        // FR-036: 「マウス操作は語である（MUST）…辞書が 表 T-023 の行 ID で持つ
        // こと（MUST）」.
        for (const language of LANGUAGES) {
          expect(assignmentShownFor(icon, language), `${icon} in ${language}`).toBe(
            pressWordOf(row, language),
          )
        }
      })
    }
  }

  it('does not carry the 操作 column of 表 T-023 to the screen', () => {
    // ⛔ 「同表の `操作` の欄を画面へ運んではならない（MUST NOT）」 -- 「その欄は
    // 原稿の言い回しであり、1 つの言語しか持たない」. ⭐ The `ja` word happens to
    // read the same as the manuscript's, so the MUST NOT can only be measured
    // on the other language: an implementation that shipped the column would
    // answer the manuscript's wording in `en` too.
    for (const { row, icons } of MOUSE_DRIVERS) {
      const written = cellOf(T_023, row, '操作').replace(/`/g, '').trim()
      for (const icon of icons) {
        expect(assignmentShownFor(icon, 'en'), `${icon} carries 表 T-023 の ${row} の 操作`).not.toBe(
          written,
        )
      }
    }
  })
})

describe('FR-036 — an entrance the tables name from both sides, and one they name at all', () => {
  for (const icon of NAMED_BY_BOTH) {
    it(`${icon} leaves no empty place, and shows one of the two the tables allow`, () => {
      // ⛔ NOTHING DECIDES WHICH of the two wins, so nothing here asks for one.
      const keyRow = KEY_DRIVERS.find((one) => (one.icons as readonly string[]).includes(icon))
      const mouseRow = MOUSE_DRIVERS.find((one) => (one.icons as readonly string[]).includes(icon))
      expect(keyRow, `表 T-036 no longer names ${icon}`).toBeDefined()
      expect(mouseRow, `表 T-023 no longer names ${icon}`).toBeDefined()
      for (const language of LANGUAGES) {
        const shown = assignmentShownFor(icon, language)
        expect(shown, `EZ-2 (MUST): ${icon} shows no assignment in ${language}`).not.toBeNull()
        const asMouse = pressWordOf((mouseRow as { row: string }).row, language)
        const asKey = spellingsIn(cellOf(T_036, (keyRow as { row: string }).row, '割当'))
        const isMouse = shown === asMouse
        const isKey = asKey.every((spelling) => (shown ?? '').includes(spelling))
        expect(isMouse || isKey, `${icon} (${language}) shows 「${shown ?? ''}」`).toBe(true)
      }
    })
  }
})

describe('FR-036 — an entrance no row drives leaves the place empty', () => {
  for (const icon of DRIVEN_BY_NOTHING) {
    it(`${icon} is explained, and nothing stands where an assignment would`, () => {
      // 「どちらも持たない行は、その場所を空ける」. ⛔ WHICH of `null` and the
      // empty string means "empty" is not decided anywhere, so both pass.
      for (const language of LANGUAGES) {
        const shown = assignmentShownFor(icon, language)
        expect(shown ?? '', `${icon} (${language}) shows 「${shown ?? ''}」`).toBe('')
      }
    })
  }
})
