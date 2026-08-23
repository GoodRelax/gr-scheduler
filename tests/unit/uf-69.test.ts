// Unit tests for `tooltipsFromScreenView` (unit UF-69 of table T-075, component
// CP-37 of table T-062, which table T-064 publishes as PI-37).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN AGAINST THE SPECIFICATION (docs/development-rules/
// 04-verification.md, 1.). What was read: docs/spec for the rules below, the
// contract in `screen-renderer.ts`, and this unit's head comment and exported
// signature. ⛔ No function body of `tooltips.ts` was read, and every expected
// value below comes from a requirement or a table.
//
// The rules these cases answer to:
//   EZ-2      表 T-040 (FR-092): 「アイコンにポインタを合わせて一定時間が経った
//             ら、そのアイコンの説明を出すこと（MUST）」-- a PLACE condition and
//             a TIME condition, the wait held by `S-124`
//   S-124     `iconHintDelayMs`. ⛔ The number is never written here: it is read
//             from the generated `SETTINGS_DEFAULTS`, and one case drives the
//             unit with a DIFFERENT wait so that a hard-coded one would show
//   FR-029    「操作できないものがその理由を示すこと」(RATIONALE) and, in the
//             STATEMENT, 「同じ機能の入口を画面上の 2 か所に置いてはならない
//             （MUST NOT）」
//   FR-085    「行の名前が…収まらないときは、末尾を打ち切り、全文をツールチップ
//             で出すこと（MUST）」
//   FR-098    ピン止めした行は「スクロールする領域から抜いて画面の上端へ固定
//             すること（MUST）」なので、行見出しパネルの並びはピン止めが先である
//   FR-037    「スクロールバーへポインタを乗せたとき…その場に示し、ポインタが
//             離れたら消すこと。常時表示してはならない（MUST NOT）」
//   MK-1/MK-5 表 T-023: ホイール ＝ 縦スクロール、`Ctrl`＋`Shift`＋ホイール ＝
//             横スクロール -- the two assignments FR-037 has to tell apart
//   IN-3      表 T-028: ツールチップは消せる・乗せられる・勝手に消えない --
//             true of every one, so no tooltip carries a member for any of them
//   R3.4      境界は半開 `[start, end)` -- two lanes never both claim an edge
//   R7.1/R7.6 `pure` in table T-075: the arguments come back untouched and the
//             same frame answers the same way twice
//
// ⭐ WHERE THE SPECIFICATION DECIDES NOTHING, NOTHING IS ASSERTED. Four
// questions were searched for; three still have no answer in docs/spec, and no
// case here invents one. The third is kept with the answer it has since been
// given:
//   * WHICH icon the pointer rests on. EZ-2 asks for the explanation of THAT
//     icon, and no `CommandItem` carries a rectangle -- so a case here never
//     asserts that ONLY one icon answers, only that the icon it names does.
//   * WHETHER resting for EXACTLY `iconHintDelayMs` is already "after" it.
//     S-124 gives the wait and EZ-2 gives no boundary, and `iconHintDelayMs` is
//     none of the three pairs rule 03 section 2 settles (min/max, begin/end,
//     first/last). Every case below rests strictly under or strictly over it.
//   * THE WORDS FR-037 puts on the screen -- ⚠️ ANSWERED SINCE. FR-038's fifth
//     paragraph (MUST) now holds every printed word in one per-language
//     dictionary, and Chapter 6.2 (MUST) fixes the manuscript and the one
//     generated file it reaches `src/` by, keyed there by the row of 表 T-023.
//     ⚠️ The case that asks only that the two lanes say DIFFERENT things is
//     kept as it stands: it is the claim 表 T-023 makes by giving each axis its
//     own row, and it holds whatever the dictionary comes to say.
//   * WHEN FR-029's reason and FR-085's whole name appear. Neither states a
//     pointer condition and neither states a MUST NOT against standing there
//     always. So every case of those two puts the pointer where both readings
//     agree: inside the row's own box, and past EZ-2's wait.
//
// ⭐ Chapter 1.9 asks a test of a requirement that points at a table to be
// driven by a fixed copy of the table. T_023_FASTER and T_040_EZ2 below are
// those copies.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  CommandItem,
  DisplayLanguage,
  RowTitle,
  Scrollbar,
  ScreenSession,
  ScreenView,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * 表 T-023 — the two rows FR-037 exists to teach: for each axis, the faster way
 * of doing what the scrollbar does slowly. ⛔ The words a tooltip shows are not
 * here, because the specification has none; what it decides is that the two
 * axes are told apart by two different rows.
 */
const T_023_FASTER = [
  { axis: 'vertical', row: 'MK-1', assignment: 'ホイール（修飾なし）' },
  { axis: 'horizontal', row: 'MK-5', assignment: 'Ctrl ＋ Shift ＋ ホイール' },
] as const

/** 表 T-040 の EZ-2 — the wait, and the row that holds it. */
const T_040_EZ2 = { wait: 'iconHintDelayMs', heldBy: 'S-124' } as const

/**
 * Rows of 表 T-109, used as `IconId`s. ⛔ That table has no English column on
 * purpose, so an icon travels as its row id: IC-1 文書を開く、IC-7 コマンド
 * パレットを出す・しまう、IC-52 開いている面を閉じる.
 */
const ICON_OPEN = 'IC-1'
const ICON_PALETTE = 'IC-7'
const ICON_CLOSE = 'IC-52'

// ---------------------------------------------------------------------------
// Inputs. ⛔ The wait is read from the generated defaults, never typed here:
// rule 03 section 1 forbids re-typing a value the manuscript holds.
// ---------------------------------------------------------------------------

const WAIT_MS = SETTINGS_DEFAULTS[T_040_EZ2.wait] as number

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({})

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

/**
 * ⚠️ `label` is a stand-in this file never reads back. The published contract
 * declares it the entry's own accessible name and says in as many words that
 * EZ-2's explanation is a SECOND word of the dictionary, which this unit raises
 * for itself -- so a case that compared the explanation with this string would
 * be asserting the wrong member.
 */
const commandOf = (part: Partial<CommandItem> = {}): CommandItem => ({
  icon: ICON_OPEN,
  isEnabled: true,
  isPressed: false,
  label: `the name of ${part.icon ?? ICON_OPEN}`,
  ...part,
})

/**
 * The one dictionary FR-038's fifth paragraph (MUST) holds the printed words
 * in, as Chapter 6.2 (MUST) generates it into `src/`.
 *
 * ⛔ Read, never re-typed: the same MUST NOT that keeps the words out of a
 * requirement and a table keeps a bench from spelling one. ⚠️ It is also the
 * file the unit reads, so agreement here is not agreement with the manuscript
 * -- `tests/contract/display-words.contract.test.ts` holds the two together
 * cell for cell, and `npm run gen:check` falls on drift.
 */
const DICTIONARY = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
    'utf8',
  ),
) as {
  readonly icons: readonly {
    readonly rowId: string
    readonly hint: Readonly<Record<DisplayLanguage, string>>
  }[]
}

/** The explanation EZ-2 shows for one row of 表 T-109, in one display language. */
const hintWordOf = (row: string, language: DisplayLanguage): string => {
  const held = DICTIONARY.icons.find((one) => one.rowId === row)
  expect(held, `FR-038: the dictionary holds no explanation for ${row}`).toBeDefined()
  return (held as { readonly hint: Readonly<Record<DisplayLanguage, string>> }).hint[language]
}

const SHOWN_ROW_NAME = 'a row name long enough to be cut'

const rowTitleOf = (part: Partial<RowTitle> = {}): RowTitle => {
  const label = part.label === undefined ? SHOWN_ROW_NAME : part.label
  const isLabelTruncated = part.isLabelTruncated ?? false
  return {
    groupId: 'g1',
    depth: 1,
    box: rect(0, 0, 200, 24),
    label,
    // The `RowTitle` contract makes `isLabelTruncated` exactly
    // `wholeLabel !== null && wholeLabel !== label`, so the whole name follows
    // from the flag the case asked for rather than being stated twice.
    wholeLabel: label === null ? null : isLabelTruncated ? `${label}, and the rest of it` : label,
    isLabelTruncated,
    expander: null,
    isPinned: false,
    isSelected: false,
    ...part,
  }
}

/** A lane with its grip in one corner, so that "in the lane, off the grip" is reachable. */
const scrollbarOf = (axis: Scrollbar['axis'], track: ScreenRect): Scrollbar => ({
  axis,
  track,
  thumb: rect(track.x, track.y, Math.min(track.width, 10), Math.min(track.height, 10)),
})

const VERTICAL_TRACK = rect(100, 0, 10, 600)
const HORIZONTAL_TRACK = rect(0, 610, 100, 10)
const BOTH_LANES: readonly Scrollbar[] = [
  scrollbarOf('vertical', VERTICAL_TRACK),
  scrollbarOf('horizontal', HORIZONTAL_TRACK),
]

const EMPTY_VIEW: Omit<ScreenView, 'tooltips'> = {
  // S-99. UF-69 reads the language out of `ScreenSession`, never out of the
  // view it is handed, so this member is inert for every case below.
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    autosaveStatus: { kind: 'saving' },
    commands: [],
    // FR-038: the header's half of the language reading, the same value the
    // view above carries.
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

const viewOf = (part: Partial<Omit<ScreenView, 'tooltips'>>): Omit<ScreenView, 'tooltips'> => ({
  ...EMPTY_VIEW,
  ...part,
})

const headerWith = (commands: readonly CommandItem[]): ScreenView['appHeaderItems'] => ({
  ...EMPTY_VIEW.appHeaderItems,
  commands,
})

const EMPTY_SESSION: ScreenSession = {
  language: 'ja',
  autosave: { kind: 'saved', at: '2026-08-19T09:00:00Z' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The four members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `selectedGroupIds` is FR-085's set of rows and
  // `selectedResourceUids` FR-099's set of resources (both empty -- none
  // chosen), and `propertiesSubject` is FR-072's remembered subject (`null` --
  // no operation has chosen one yet).
  iconUnderPointer: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const sessionOf = (part: Partial<ScreenSession>): ScreenSession => ({
  ...EMPTY_SESSION,
  ...part,
})

/** A pointer that is in the window and has waited longer than EZ-2 asks. */
const RESTED = sessionOf({ pointer: { x: 5, y: 5 }, pointerRestedMs: WAIT_MS + 1 })

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const iconsOf = (shown: readonly Tooltip[]): readonly string[] =>
  shown
    .filter((one) => one.anchor.kind === 'icon')
    .map((one) => (one.anchor as { icon: string }).icon)

const rowsOf = (shown: readonly Tooltip[]): readonly string[] =>
  shown
    .filter((one) => one.anchor.kind === 'rowTitle')
    .map((one) => (one.anchor as { groupId: string }).groupId)

const axesOf = (shown: readonly Tooltip[]): readonly string[] =>
  shown
    .filter((one) => one.anchor.kind === 'scrollbar')
    .map((one) => (one.anchor as { axis: string }).axis)

const textAt = (shown: readonly Tooltip[], axis: string): string =>
  shown.find((one) => one.anchor.kind === 'scrollbar' && one.anchor.axis === axis)?.text ?? ''

// ---------------------------------------------------------------------------

describe('UF-69 — nothing to explain', () => {
  it('answers with nothing when the frame holds no part any rule speaks about', () => {
    expect(tooltipsFromScreenView(EMPTY_VIEW, SETTINGS, RESTED)).toEqual([])
  })

  it('answers with nothing when only the parts that carry no icon are there', () => {
    // ⭐ EZ-2 puts the explanation on an ICON. `PropertyField` (表 T-016),
    // `Notice` (表 T-037) and `DialogueMessage` (AG-11) carry none, so a frame
    // full of them explains nothing.
    const shown = tooltipsFromScreenView(
      viewOf({
        propertiesPanel: {
          showing: 'selection',
          heading: 'Selection',
          isSubjectGone: false,
          fields: [{ row: 'PR-1', name: 'name', text: 'a task', isEditable: true }],
        },
        notices: [
          { manner: 'NT-1', mannerText: '', text: 'finish stands before start', nextSteps: [], affectedCount: null },
        ],
        dialogueField: {
          messages: [
            { sequence: 1, author: 'someone', text: 'a word', settledAt: '2026-08-19T09:00:00Z' },
          ],
        },
      }),
      SETTINGS,
      RESTED,
    )
    expect(shown).toEqual([])
  })
})

describe('EZ-2 (表 T-040, FR-092) — the explanation of an icon', () => {
  it('shows it once the pointer is in the window and has rested longer than the wait', () => {
    const shown = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf({ icon: ICON_PALETTE })]) }),
      SETTINGS,
      RESTED,
    )

    expect(shown).toHaveLength(1)
    expect(shown[0]?.anchor).toEqual({ kind: 'icon', icon: ICON_PALETTE })
    // ⚠️ WAS HELD AGAINST `CommandItem.label`, on a reading of that member that
    // the published contract has since denied: it declares `label` the entry's
    // own accessible name and EZ-2's explanation a SECOND word this unit raises.
    // EZ-2 (MUST) shows the explanation OF THAT ICON, and FR-038's fifth
    // paragraph (MUST) is where that word is held -- keyed by the row of 表
    // T-109, in the language `ScreenSession.language` carries.
    expect(shown[0]?.text).toBe(hintWordOf(ICON_PALETTE, EMPTY_SESSION.language))
  })

  it('shows the explanation in the language the reader chose (FR-038 MUST)', () => {
    // FR-038 (MUST) shows the menus and the panels in the chosen language, and
    // its fifth paragraph (MUST) holds one word per language. ⚠️ Asked only of
    // an icon whose two words really differ: a row whose two agree is the
    // dictionary's own answer, not a fault of the unit.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      const shown = tooltipsFromScreenView(
        viewOf({ appHeaderItems: headerWith([commandOf({ icon: ICON_PALETTE })]) }),
        SETTINGS,
        sessionOf({ pointer: { x: 5, y: 5 }, pointerRestedMs: WAIT_MS + 1, language }),
      )
      expect(shown[0]?.text, language).toBe(hintWordOf(ICON_PALETTE, language))
    }
    expect(
      hintWordOf(ICON_PALETTE, 'ja'),
      'FR-038: the dictionary holds one word for both languages, so the case above proves nothing',
    ).not.toBe(hintWordOf(ICON_PALETTE, 'en'))
  })

  it('shows nothing while the pointer has rested less than the wait', () => {
    const shown = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf()]) }),
      SETTINGS,
      sessionOf({ pointer: { x: 5, y: 5 }, pointerRestedMs: WAIT_MS - 1 }),
    )
    expect(shown).toEqual([])
  })

  it('shows nothing while the pointer is outside the window, however long the rest', () => {
    // EZ-2 reads 「アイコンにポインタを合わせて」-- with no pointer, nothing is
    // being pointed at. `ScreenSession.pointer` is `null` for exactly that.
    const shown = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf()]) }),
      SETTINGS,
      sessionOf({ pointer: null, pointerRestedMs: WAIT_MS * 10 }),
    )
    expect(shown).toEqual([])
  })

  it('takes the wait from the settings and not from a number of its own', () => {
    // ⭐ 04-verification.md 2.: a value only reaches the code if changing it
    // changes the answer. One rest, under the manuscript's wait and over a
    // shorter one.
    const view = viewOf({ appHeaderItems: headerWith([commandOf()]) })
    const resting = sessionOf({ pointer: { x: 5, y: 5 }, pointerRestedMs: WAIT_MS - 1 })

    expect(tooltipsFromScreenView(view, SETTINGS, resting)).toEqual([])
    expect(
      tooltipsFromScreenView(view, settingsOf({ [T_040_EZ2.wait]: WAIT_MS - 2 }), resting),
    ).toHaveLength(1)
  })

  it('reaches every part of the frame that holds entries a person can press', () => {
    // 表 T-109 places its rows on several surfaces at once: the `App Header`,
    // the `Command Palette`, and the surface a person opened (IC-52 closes it).
    const shown = tooltipsFromScreenView(
      viewOf({
        appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN })]),
        commandPalette: {
          // ⭐ A CORNER, NOT A RECTANGLE (FR-053, MUST / MUST NOT).
          at: { x: 300, y: 300 },
          groups: [{ name: '表示', commands: [commandOf({ icon: ICON_PALETTE })] }],
          armedText: 'なし',
        },
        openModal: {
          surface: 'Help Modal',
          heading: 'ヘルプ',
          commands: [commandOf({ icon: ICON_CLOSE })],
        },
      }),
      SETTINGS,
      RESTED,
    )

    expect(iconsOf(shown)).toEqual(expect.arrayContaining([ICON_OPEN, ICON_PALETTE, ICON_CLOSE]))
    expect(shown).toHaveLength(3)
  })

  it('answers for a palette that holds no group and a surface that holds no entry', () => {
    const shown = tooltipsFromScreenView(
      viewOf({
        commandPalette: {
          // ⭐ A CORNER, NOT A RECTANGLE (FR-053, MUST / MUST NOT).
          at: { x: 300, y: 300 },
          groups: [],
          armedText: 'なし',
        },
        openModal: { surface: 'Resource Roster', heading: '担当者', commands: [] },
      }),
      SETTINGS,
      RESTED,
    )
    expect(shown).toEqual([])
  })
})

describe('FR-029 — an entry that cannot be used, and the same entry twice', () => {
  it('explains an entry that cannot be used', () => {
    // FR-029's RATIONALE: 「無反応だと故障に見える…操作できないものがその理由を
    // 示すこと」. ⛔ The REASON itself is not asserted: no member of
    // `CommandItem` carries one, so the seam cannot express what FR-029 asks
    // for -- only that the entry is not left silent.
    const shown = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN, isEnabled: false })]) }),
      SETTINGS,
      RESTED,
    )

    expect(iconsOf(shown)).toContain(ICON_OPEN)
    expect(shown[0]?.text.length).toBeGreaterThan(0)
  })

  it('explains what can be used and what cannot, side by side', () => {
    const shown = tooltipsFromScreenView(
      viewOf({
        appHeaderItems: headerWith([
          commandOf({ icon: ICON_OPEN, isEnabled: false }),
          commandOf({ icon: ICON_PALETTE, isEnabled: true }),
        ]),
      }),
      SETTINGS,
      RESTED,
    )
    expect(iconsOf(shown)).toEqual(expect.arrayContaining([ICON_OPEN, ICON_PALETTE]))
  })

  it('does not fold two entries that carry the same icon into one', () => {
    // 「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）」-- the
    // repeat is a fault where the entry is HELD. Folding it away here would
    // hide the very thing FR-029 forbids, and no rule asks this unit to.
    const shown = tooltipsFromScreenView(
      viewOf({
        appHeaderItems: headerWith([commandOf({ icon: ICON_PALETTE })]),
        openModal: {
          surface: 'Help Modal',
          heading: 'ヘルプ',
          commands: [commandOf({ icon: ICON_PALETTE })],
        },
      }),
      SETTINGS,
      RESTED,
    )
    expect(iconsOf(shown)).toEqual([ICON_PALETTE, ICON_PALETTE])
  })
})

describe('FR-085 — the whole of a row name that was cut', () => {
  /** The pointer inside the row's own box: both readings of FR-085 agree there. */
  const overRow = (box: ScreenRect): ScreenSession =>
    sessionOf({ pointer: { x: box.x + 1, y: box.y + 1 }, pointerRestedMs: 0 })

  it('explains a row whose name was cut', () => {
    const title = rowTitleOf({ groupId: 'g7', isLabelTruncated: true })
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [], titles: [title] } }),
      SETTINGS,
      overRow(title.box),
    )

    expect(shown).toHaveLength(1)
    expect(shown[0]?.anchor).toEqual({ kind: 'rowTitle', groupId: 'g7' })
    expect(shown[0]?.text.length).toBeGreaterThan(0)
  })

  it('explains nothing for a row whose name was not cut', () => {
    // 「収まらないときは」-- a name that fits is not cut, and no whole name is
    // being kept from the reader.
    const title = rowTitleOf({ groupId: 'g7', isLabelTruncated: false })
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [], titles: [title] } }),
      SETTINGS,
      overRow(title.box),
    )
    expect(shown).toEqual([])
  })

  it('explains nothing for a row that carries no name at all', () => {
    // FR-085 shows 全文 -- the WHOLE name. A row whose `label` is `null` has
    // none, so there is nothing whole to show.
    const title = rowTitleOf({ groupId: 'g7', label: null, isLabelTruncated: true })
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [], titles: [title] } }),
      SETTINGS,
      overRow(title.box),
    )
    expect(shown).toEqual([])
  })

  it('explains every cut row, pinned ones first', () => {
    // FR-098 (MUST) lifts a pinned row out of the scrolling list and holds it
    // at the top, so the panel prints the pinned rows before the rest.
    const pinned = rowTitleOf({ groupId: 'g-pin', isPinned: true, isLabelTruncated: true })
    const first = rowTitleOf({ groupId: 'g1', isLabelTruncated: true })
    const second = rowTitleOf({ groupId: 'g2', isLabelTruncated: true })
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [pinned], titles: [first, second] } }),
      SETTINGS,
      overRow(first.box),
    )

    expect(rowsOf(shown)).toEqual(['g-pin', 'g1', 'g2'])
  })

  it('explains nothing when the panel holds no row', () => {
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [], titles: [] } }),
      SETTINGS,
      sessionOf({ pointer: { x: 1, y: 1 } }),
    )
    expect(shown).toEqual([])
  })
})

describe('FR-037 — the faster assignment, while the pointer is on a scrollbar', () => {
  const at = (x: number, y: number): ScreenSession => sessionOf({ pointer: { x, y } })

  it('shows it while the pointer is on the lane, off the grip', () => {
    // 「スクロールバーへポインタを乗せたとき」names the scrollbar, not its grip:
    // `Scrollbar.track` is the lane FR-051 takes out of the `Row Area`.
    const shown = tooltipsFromScreenView(
      viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES } }),
      SETTINGS,
      at(VERTICAL_TRACK.x + 5, VERTICAL_TRACK.y + VERTICAL_TRACK.height - 5),
    )

    expect(shown).toHaveLength(1)
    expect(shown[0]?.anchor).toEqual({ kind: 'scrollbar', axis: 'vertical' })
  })

  it('tells the two axes apart', () => {
    // 表 T-023 gives each axis its own row -- MK-1 for the vertical scroll and
    // MK-5 for the horizontal one -- so the two lanes cannot say the same
    // thing. ⛔ WHAT either one says is not asserted: FR-038 names no store of
    // translated strings and no table holds the words.
    const view = viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES } })
    const onVertical = tooltipsFromScreenView(view, SETTINGS, at(VERTICAL_TRACK.x + 5, 300))
    const onHorizontal = tooltipsFromScreenView(view, SETTINGS, at(50, HORIZONTAL_TRACK.y + 5))

    expect(axesOf(onVertical)).toEqual([T_023_FASTER[0].axis])
    expect(axesOf(onHorizontal)).toEqual([T_023_FASTER[1].axis])
    expect(textAt(onVertical, 'vertical').length).toBeGreaterThan(0)
    expect(textAt(onHorizontal, 'horizontal').length).toBeGreaterThan(0)
    expect(textAt(onVertical, 'vertical')).not.toBe(textAt(onHorizontal, 'horizontal'))
  })

  it('takes it away when the pointer leaves', () => {
    const shown = tooltipsFromScreenView(
      viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES } }),
      SETTINGS,
      at(500, 300),
    )
    expect(shown).toEqual([])
  })

  it('never stands there while the pointer is outside the window', () => {
    // 「常時表示してはならない（MUST NOT）」. With no pointer there is no
    // 「乗せたとき」, so a lane that answered here would be showing it always.
    const shown = tooltipsFromScreenView(
      viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES } }),
      SETTINGS,
      sessionOf({ pointer: null, pointerRestedMs: WAIT_MS * 10 }),
    )
    expect(shown).toEqual([])
  })

  it('holds the lane half-open, so no point belongs to two lanes', () => {
    // R3.4 (MUST): 区間は半開 `[start, end)`. The top-left corner is in the
    // lane; the far edges belong to whatever comes next.
    const view = viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES } })
    const corner = at(VERTICAL_TRACK.x, VERTICAL_TRACK.y)
    const pastRight = at(VERTICAL_TRACK.x + VERTICAL_TRACK.width, VERTICAL_TRACK.y)
    const pastBottom = at(VERTICAL_TRACK.x, VERTICAL_TRACK.y + VERTICAL_TRACK.height)

    expect(axesOf(tooltipsFromScreenView(view, SETTINGS, corner))).toEqual(['vertical'])
    expect(tooltipsFromScreenView(view, SETTINGS, pastRight)).toEqual([])
    expect(tooltipsFromScreenView(view, SETTINGS, pastBottom)).toEqual([])
  })

  it('lets every lane the pointer is on answer', () => {
    // MK-9a asks a priority of overlapping GRAB targets, and 表 T-023a limits
    // that scheme to 日程の描画領域, listing the scrollbar as a surface FR-037
    // governs instead. So no priority is invented for a point two lanes hold.
    const overlapping: readonly Scrollbar[] = [
      scrollbarOf('vertical', rect(0, 0, 50, 50)),
      scrollbarOf('horizontal', rect(0, 0, 50, 50)),
    ]
    const shown = tooltipsFromScreenView(
      viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: overlapping } }),
      SETTINGS,
      at(25, 25),
    )
    expect(axesOf(shown)).toEqual(['vertical', 'horizontal'])
  })

  it('explains nothing when the frame carries no lane', () => {
    const shown = tooltipsFromScreenView(
      viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: [] } }),
      SETTINGS,
      at(VERTICAL_TRACK.x + 5, 300),
    )
    expect(shown).toEqual([])
  })
})

describe('IN-3 (表 T-028) and R7.1 — what every tooltip is', () => {
  /** One frame that earns all three kinds at once. */
  const CROWDED = viewOf({
    frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES },
    appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN })]),
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [rowTitleOf({ groupId: 'g1', box: rect(0, 0, 200, 24), isLabelTruncated: true })],
    },
  })
  const CROWDED_SESSION = sessionOf({
    pointer: { x: VERTICAL_TRACK.x + 5, y: 300 },
    pointerRestedMs: WAIT_MS + 1,
  })

  it('carries what it explains and the words, and nothing else', () => {
    // IN-3 grants 消せること・乗せられること・勝手に消えないこと to EVERY
    // tooltip. A member for any of them would let a caller describe one IN-3
    // forbids, so the type stays two members wide.
    const shown = tooltipsFromScreenView(CROWDED, SETTINGS, CROWDED_SESSION)

    expect(shown.length).toBeGreaterThan(0)
    for (const one of shown) {
      expect(Object.keys(one).sort()).toEqual(['anchor', 'text'])
      expect(typeof one.text).toBe('string')
      expect(['icon', 'rowTitle', 'scrollbar']).toContain(one.anchor.kind)
    }
  })

  it('answers the same frame the same way twice and writes nothing it was handed', () => {
    // `pure` in table T-075 (R7.1). ⚠️ 04-verification.md 1. records a unit
    // that named itself `pure` while rewriting an argument.
    const before = JSON.stringify([CROWDED, SETTINGS, CROWDED_SESSION])
    const once = tooltipsFromScreenView(CROWDED, SETTINGS, CROWDED_SESSION)
    const twice = tooltipsFromScreenView(CROWDED, SETTINGS, CROWDED_SESSION)

    expect(twice).toEqual(once)
    expect(JSON.stringify([CROWDED, SETTINGS, CROWDED_SESSION])).toBe(before)
  })
})
