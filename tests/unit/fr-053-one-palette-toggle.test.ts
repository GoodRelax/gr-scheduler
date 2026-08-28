// FR-029 (MUST NOT) with FR-053 (MUST): there is ONE entrance that shows and
// hides the `Command Palette`, it stands on the `App Header`, and it never
// stands on the palette -- and table T-023b's closing rule (MUST NOT): the row
// id of an arm is never what the palette says is armed.
//
// Units under test: UF-62 of table T-075 (`app-header-items.ts`) and UF-65
// (`command-palette.ts`). Both belong to CP-37 of table T-062 (`ScreenRenderer`)
// and reach the outside through PI-37 of table T-064.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS BESIDE tests/unit/uf-62.test.ts AND tests/unit/uf-65
// .test.ts, WHICH ALREADY DRIVE THE SAME TWO UNITS
// ---------------------------------------------------------------------------
//
// Both of those files name the entrance by typing `IC-7`. That is enough to ask
// "is it there", which is what they ask. ⛔ IT IS NOT ENOUGH TO ASK "IS THERE
// ONLY ONE", which is the other half of FR-029 and the half a remedy can break
// without touching either file: a SECOND row added to table T-109 for the same
// function would leave every case in both files green.
//
// ⭐ So the entrance here is not typed. It is LOOKED UP in table T-109 by the
// settings row FR-053 keys the state on (`S-99e`), and the case that matters is
// that the lookup finds exactly one row.
//
// ⚠️ This is a live risk and not an imagined one: `docs/development-records/
// defects.md` row D-36 prescribes 「表 T-109 に `App Header` の入口を 1 行足す」
// -- adding a row for a function table T-109 already carries at IC-7.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-029   ⛔ 「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）。」
//            「どちらを押しても同じことが起きる面が 2 つあると、利用者は違いを探し
//            て迷う。**例外は表示言語の切替だけである**」 —— that single exception
//            is IC-21, and it is not this function.
//            ⭐ 「アイコンの名簿と置き場は `_assets/tbl-glossary.md` の 表 T-109
//            に ... 従うこと（MUST）」 —— so the 面 column IS the placement.
//   FR-053   ⭐ 「表示と非表示を切り替える入口を、パレットの外に持つこと（MUST）。」
//            ⚠️ its reason is stated in the same requirement, about the faint
//            drawing: 「パレット自身の中に置くと、非表示にした瞬間に押す面が消えて
//            戻せなくなる。」
//            ⭐ 「いま構えているものが画面上で読めること（MUST）。」
//   T-109    IC-7 | `App Header` | 表示 | 「コマンドパレットを出す・しまう
//            （`S-99e`）」 | `FR-053` | —
//   T-103    U-26 `Command Palette`, U-31 `App Header` -- the settled names the
//            面 column of table T-109 spells.
//   S-99e    表 T-206、「コマンドパレットの表示状態」 —— the state the entrance
//            moves, and the only join between the requirement and one row of
//            table T-109 that does not have to be typed here.
//   T-023b   構え。⭐ its closing rule: 「構えの語は 表 T-233 の結びが理由の語に
//            ついて定めるのと同じ扱いとすること（MUST）—— 辞書が持ち、行 ID で引
//            き、行を足すなら原稿にも項を足す。⛔ 行 ID そのものを画面に刷っては
//            ならない（MUST NOT）。」
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, docs/development-rules/, and
// of `src/` nothing but the exported declarations these cases must call or
// name -- the signatures of `appHeaderItemsFromDocument` and
// `commandPaletteFromScreenState`, the `AppHeaderItems` / `CommandItem` /
// `CommandPalette` / `ScreenSession` types, the `ScreenState` constructors and
// `SETTINGS_DEFAULTS`. ⛔ NO FUNCTION BODY OF EITHER UNIT WAS READ. Every
// expected value below is read out of a manuscript at run time.
//
// ⭐ The fixtures (`SESSION`, `settingsOf`, `scheduleOf`) are copied from
// tests/unit/uf-62.test.ts and tests/unit/uf-65.test.ts, which drive these same
// two units.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
// ---------------------------------------------------------------------------
//
//   1. WHERE THE ENTRANCE STANDS AMONG THE OTHERS. ⛔ No row of the
//      specification states a left-to-right order for the `App Header`. The
//      preamble of section 8 of `_assets/tbl-glossary.md` says only that the
//      群 column 「入口を並べる順を決めるためだけに在る」, and it does not say in
//      which order the groups themselves come; the table's own print order is
//      the only order there is, and tests/unit/uf-62.test.ts already holds the
//      unit to it. ⛔ SO NO CASE HERE ASKS FOR THE ENTRANCE TO BE FIRST, LAST OR
//      ANYWHERE. A tester who asserted a position would be inventing the
//      sentence the table is missing.
//   2. THE WORD THE ENTRANCE CARRIES. FR-038 puts it in the dictionary and
//      tests/contract/display-words.contract.test.ts is the bench that holds it.
//   3. WHAT `armedText` SAYS. That it is the dictionary's word for the armed row
//      is also that contract file's, in both display languages. What is asked
//      here is only the half of table T-023b's closing rule that file does not
//      ask: that the row id itself is not the answer.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithPalette,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a row that moves in the specification
// moves here too instead of going stale.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

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

/** One settled name of table T-103, as table T-109's 面 column spells it. */
function settledName(row: string): string {
  const found = T_103.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-103 no longer has row ${row}`)
  return bare(found.by[SETTLED_NAME_COLUMN] ?? '')
}

/** U-31 -- the surface FR-053 (MUST) keeps the entrance on. */
const APP_HEADER = settledName('U-31')

/** U-26 -- the surface FR-053 (MUST) keeps the entrance OFF. */
const COMMAND_PALETTE = settledName('U-26')

/**
 * S-99e of table T-206 -- 「コマンドパレットの表示状態」.
 *
 * ⭐ THE JOIN, AND WHY IT IS THIS ONE. FR-053 states the rule about "the
 * entrance that shows and hides the palette" in prose and names no row of table
 * T-109; the table names the function by naming the settings row it moves. So
 * the row id of the state is the one thing both sides spell, and looking the
 * entrance up by it is what makes "exactly one" a question with an answer.
 */
const PALETTE_SHOWN_SETTING = 'S-99e'

/** Every row of table T-109 whose 何の入口か cell names S-99e, on any surface. */
const SHOW_HIDE_ROWS: readonly { readonly row: string; readonly surface: string }[] = T_109.rows
  .filter((row) => (row.by[ENTRANCE_COLUMN] ?? '').includes(PALETTE_SHOWN_SETTING))
  .map((row) => ({ row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }))

/**
 * The one entrance FR-053 (MUST) asks for, if the table still holds exactly one.
 *
 * ⚠️ Read through a function rather than at load time: a table that held two
 * would otherwise throw before the case that is about that could report it.
 */
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

/**
 * The spelling table T-012 gives one of its rows, with the quotes its 値 column
 * prints stripped off (`'rectangle'` -> `rectangle`).
 */
function shapeSpellingOf(shapeRow: string): string {
  const row = T_012.rows.find((one) => one.id === shapeRow)
  if (row === undefined) throw new Error(`table T-012 no longer has row ${shapeRow}`)
  return bare(row.by[SHAPE_SPELLING_COLUMN] ?? '').replace(/'/g, '')
}

/**
 * The eight milestone glyphs. ⭐ Read out of `_source/erd.json` because the
 * preamble of section 8 of `_assets/tbl-glossary.md` says in as many words that
 * table T-109 does not carry them and that file does. Copied from
 * tests/unit/fr-053-one-armed-entrance.test.ts.
 */
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

/**
 * One value of `Armed` for each row of table T-023b, built with a REAL spelling
 * so that no case can pass by falling into a default branch.
 *
 * ⚠️ THE ROW -> UNION MEMBER MAPPING IS THIS FILE'S. The specification has not
 * settled the union's member names (`Armed` says so of AR-3 itself), so the row
 * id stands beside each one, and this is the thing to re-read if table T-023b
 * grows a row.
 */
function armOfRow(row: string): Armed {
  switch (row) {
    case 'AR-1':
      return { kind: 'none' }
    case 'AR-2':
      return { kind: 'taskShape', shapeKind: shapeSpellingOf('SH-1') }
    case 'AR-3':
      return { kind: 'milestoneShape', glyph: MILESTONE_GLYPHS[0] as string }
    case 'AR-4':
      return { kind: 'dependency' }
    case 'AR-5':
      return { kind: 'commentBox' }
    case 'AR-6':
      return { kind: 'highlightBox' }
    default:
      throw new Error(`table T-023b has a row this file does not build an arm for: ${row}`)
  }
}

/** Every arm a person can take, with the row of table T-023b it belongs to. */
const EVERY_ARM: readonly { readonly row: string; readonly armed: Armed }[] = T_023b.rows.map(
  (row) => ({ row: row.id, armed: armOfRow(row.id) }),
)

/** S-99 of table T-206. FR-038 admits exactly these two display languages. */
const S_99_LANGUAGES: readonly ScreenSession['language'][] = ['ja', 'en']

// ---------------------------------------------------------------------------
// Inputs. Copied from tests/unit/uf-62.test.ts, which drives UF-62 against the
// same four arguments.
// ---------------------------------------------------------------------------

/** S-73's default hue, read rather than typed (rule 03 section 1). */
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
})()

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({})

/** An empty document: no requirement points either unit at its contents here. */
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

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  // S-142 -- the milestone list is OPEN here, because FR-053 (MUST) keeps the
  // eight glyph entrances out of the palette until it is, and a case that walks
  // every entry of the palette wants them all present.
  isMilestoneListOpen: true,
  isPaletteMinimised: false,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

/** S-99e defaults to showing, so a palette is described. */
const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)
const HIDDEN: ScreenState = screenStateWithPalette(emptyScreenState(), false)

// ---------------------------------------------------------------------------
// Reading the two answers.
// ---------------------------------------------------------------------------

const headerOf = (state: ScreenState = SHOWN, session: ScreenSession = SESSION): AppHeaderItems =>
  appHeaderItemsFromDocument(SCHEDULE, SETTINGS, state, session)

const paletteOf = (state: ScreenState = SHOWN, session: ScreenSession = SESSION): CommandPalette => {
  const described = commandPaletteFromScreenState(state, emptySelection(), session)
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

/** How many times one row id is carried, whichever list it is looked for in. */
const timesIn = (icons: readonly string[], icon: string): number =>
  icons.filter((one) => one === icon).length

// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail.
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
    // The join every case below rests on. If S-99e stopped being that row, the
    // lookup would find nothing and the cases would be about nothing.
    const row = specTable('T-206').rows.find((one) => one.id === PALETTE_SHOWN_SETTING)
    if (row === undefined) throw new Error(`table T-206 no longer has row ${PALETTE_SHOWN_SETTING}`)
    expect(row.cells.join(' '), 'S-99e still names FR-053').toContain('FR-053')
  })
})

describe('FR-029 (MUST NOT) -- one function, one entrance', () => {
  it('⛔ table T-109 gives the palette\'s showing and hiding exactly ONE row', () => {
    // ⛔ 「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）。... 例外は
    // 表示言語の切替だけである」 —— that exception is IC-21, whose own cell says so
    // (⚠️ 「入口を 2 か所に置く唯一の例外である」), and this function is not it.
    // ⭐ THE ROSTER IS WHERE THE MUST NOT IS EITHER KEPT OR BROKEN: two rows here
    // would put two entrances on the screen however faithfully either unit then
    // followed the table.
    expect(
      SHOW_HIDE_ROWS.map((one) => `${one.row} on ${one.surface}`),
      'FR-029 (MUST NOT): a second entrance onto the same function',
    ).toHaveLength(1)
  })

  it('stands that row on the `App Header` and on no other surface (FR-053, MUST)', () => {
    // ⭐ 「表示と非表示を切り替える入口を、パレットの外に持つこと（MUST）。」 Table
    // T-109 authorises the join: the 面 column IS the placement (FR-029, MUST),
    // and U-31 of table T-103 is the surface it names.
    expect(SHOW_HIDE_ROWS.map((one) => one.surface)).toEqual([APP_HEADER])
  })
})

describe('UF-62 -- FR-053 (MUST): the entrance is on the `App Header`', () => {
  it('carries it, and carries it once', () => {
    // ⭐ THIS IS WHAT REFUTES D-36 FROM THE SPECIFICATION ALONE: the row exists,
    // its 面 is the header, and the unit that builds the header carries it.
    const icons = headerIcons(headerOf())
    expect(timesIn(icons, theOneEntrance()), `the header carried ${icons.join(', ')}`).toBe(1)
  })

  it('leaves it usable while the palette is hidden', () => {
    // ⚠️ THE HALF THAT MAKES THE MUST WORTH ANYTHING. FR-053 gives the reason in
    // its own words, about the faint drawing: 「パレット自身の中に置くと、非表示に
    // した瞬間に押す面が消えて戻せなくなる。」 An entrance outside the palette that
    // went faint once the palette was hidden would strand the person the same way.
    expect(headerEntry(headerOf(HIDDEN), theOneEntrance()).isEnabled).toBe(true)
  })

  it('carries it once in either display language (FR-038 changes the words, not the roster)', () => {
    for (const language of S_99_LANGUAGES) {
      const icons = headerIcons(headerOf(SHOWN, sessionWith({ language })))
      expect(timesIn(icons, theOneEntrance()), language).toBe(1)
    }
  })
})

describe('UF-65 -- FR-053 (MUST): the entrance is NOT on the palette', () => {
  it('never carries it among the palette\'s entries', () => {
    // ⛔ 「表示と非表示を切り替える入口を、パレットの外に持つこと（MUST）。」
    expect(paletteIcons(paletteOf())).not.toContain(theOneEntrance())
  })

  it('never carries it whatever is armed, and whatever language is chosen', () => {
    // ⭐ Asked across every state either unit reads, so that "outside" is not a
    // property of one description but of the palette.
    for (const language of S_99_LANGUAGES) {
      for (const { row, armed } of EVERY_ARM) {
        const palette = paletteOf(screenStateWithArmed(SHOWN, armed), sessionWith({ language }))
        expect(paletteIcons(palette), `${language} / ${row}`).not.toContain(theOneEntrance())
      }
    }
  })
})

describe('UF-62 with UF-65 -- FR-029 (MUST NOT): once on the screen, not twice', () => {
  it('⛔ the two units together put the entrance on the screen once', () => {
    // ⛔ FR-029 (MUST NOT) is about the SCREEN, and the screen is both of these
    // answers at once: PI-37 of table T-064 hands out one `ScreenView` carrying
    // an `AppHeaderItems` and a `CommandPalette`. Counting them separately can
    // never see a function that arrived on both.
    const both = [...headerIcons(headerOf()), ...paletteIcons(paletteOf())]
    expect(timesIn(both, theOneEntrance()), `the screen carried ${both.join(', ')}`).toBe(1)
  })
})

describe("UF-65 -- table T-023b (MUST NOT): the arm's row id is not what is read", () => {
  it('says something for every arm, and never says the row id', () => {
    // ⛔ 「行 ID そのものを画面に刷ってはならない（MUST NOT）」, with FR-053 (MUST)
    // 「いま構えているものが画面上で読めること」. ⭐ THE TWO ARE ASKED IN ONE CASE ON
    // PURPOSE: an empty answer would satisfy the MUST NOT and break the MUST, and
    // a row id would satisfy the MUST and break the MUST NOT.
    //
    // ⚠️ SCOPED TO THE ARMS' ROW IDS AND NOT TO EVERY ROW ID. The closing rule
    // this case answers to is table T-023b's, about 構え. Table T-109's own
    // preamble says the opposite of its rows -- 「繋ぎ目は行 ID `IC-nn` だけであ
    // る」 -- and `CommandItem.icon` carries one by design, so a case that barred
    // every row id would fail the specification rather than the code.
    const armRows = T_023b.rows.map((row) => row.id)
    const spellsARow = new RegExp(`(^|[^A-Za-z0-9-])(${armRows.join('|')})([^A-Za-z0-9-]|$)`)

    for (const language of S_99_LANGUAGES) {
      for (const { row, armed } of EVERY_ARM) {
        const palette = paletteOf(screenStateWithArmed(SHOWN, armed), sessionWith({ language }))
        const said = palette.armedText

        expect(said.length, `FR-053 (MUST): ${language} / ${row} reads nothing`).toBeGreaterThan(0)
        expect(
          spellsARow.test(said),
          `table T-023b (MUST NOT): ${language} / ${row} is printed as "${said}"`,
        ).toBe(false)
      }
    }
  })

  it('⛔ prints no row id anywhere else in the description either', () => {
    // ⭐ THE SAME MUST NOT, ASKED OF EVERYTHING THE PALETTE HANDS THE DRAWING
    // SIDE TO PRINT: the entries' words and the groups' names. ⚠️ The groups'
    // names are read here even though FR-053 (MUST NOT) keeps them off the
    // screen -- a name that spelled a row id would be a row id that had reached
    // the description, and the screen is one mistake away from it.
    const armRows = T_023b.rows.map((row) => row.id)
    const spellsARow = new RegExp(`(^|[^A-Za-z0-9-])(${armRows.join('|')})([^A-Za-z0-9-]|$)`)

    for (const language of S_99_LANGUAGES) {
      const palette = paletteOf(SHOWN, sessionWith({ language }))
      const printable = [
        palette.armedText,
        ...palette.groups.map((group) => group.name),
        ...palette.groups.flatMap((group) => group.commands).map((entry) => entry.label),
      ]
      for (const word of printable) {
        expect(spellsARow.test(word), `${language}: "${word}"`).toBe(false)
      }
    }
  })
})
