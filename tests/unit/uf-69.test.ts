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
//             ⭐ CR-282 added a SECOND MUST to the same row: 「説明の後ろに、
//             その行の割当も出すこと（MUST）」, and 「割当が指すものも、語を
//             どこから取るかも `FR-036` と同じであること（MUST）」. So every
//             tooltip carries a THIRD member beside the anchor and the words
//   FR-036    what that assignment IS: 「キー（表 T-036 の `割当`）とマウス操作
//             （表 T-023 の `操作`）の両方を指すこと（MUST）」 and 「どちらも
//             持たない行は、その場所を空ける」-- so the member is present on
//             every tooltip and empty on the rows that have neither
//   S-124     `iconHintDelayMs`. ⛔ The number is never written here: it is read
//             from the generated `SETTINGS_DEFAULTS`, and one case drives the
//             unit with a DIFFERENT wait so that a hard-coded one would show
//   FR-029    「操作できないものがその理由を示すこと」(RATIONALE) and, in the
//             STATEMENT, 「同じ機能の入口を画面上の 2 か所に置いてはならない
//             （MUST NOT）」
//   FR-085    「行の名前が…収まらないときは、末尾を打ち切り、`…` を置くこと
//             （MUST）。その全文を説明として出してはならない（MUST NOT）」--
//             ⛔ A REQUIREMENT THIS UNIT MUST NOT ANSWER any more (CR-257). The
//             cut is UF-63's and the mark closes it; a reader who wants the
//             whole name widens the panel (`FR-052`). `IN-3` no longer names
//             FR-085 among the triggers it governs either
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
//   * WHICH icon the pointer rests on -- ⚠️ ANSWERED SINCE, and the cases below
//     were rewritten for it. `ScreenSession.iconUnderPointer` (PD-141) now
//     carries the row of 表 T-109 the pointer is resting on, which is EZ-2's
//     PLACE condition, so a case may and does assert that the icons the pointer
//     is NOT on are left unexplained.
//   * WHETHER resting for EXACTLY `iconHintDelayMs` is already "after" it.
//     ⚠️ S-124 gives the wait and EZ-2 gives no boundary in as many words, and
//     `iconHintDelayMs` is none of the three pairs rule 03 section 2 settles
//     (min/max, begin/end, first/last). The endpoint is nonetheless asserted to
//     be INSIDE the wait, on the plain reading of 「待ち時間」 ＝ 3000 ms: once
//     3000 ms have been waited, the wait asked for has been served. ⚠️ A case is
//     marked below so that a ruling the other way is a one-line change.
//   * WHETHER two entries carrying the SAME row of 表 T-109 answer once or
//     twice, now that the place condition is an `IconId` and not an entry.
//     Nothing decides it, so the case asks only that the row is explained.
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
  IconId,
  RowTitle,
  Scrollbar,
  ScreenSession,
  ScreenView,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { bare, specTable } from '../contract/spec-table'

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

/**
 * What the palettes below carry for the band GR-19 of 表 T-023d lays along the
 * palette's top edge.
 *
 * ⚠️ INERT, AND NAMED SO THAT IT READS AS INERT. This unit answers explanations
 * for entries (EZ-2 of 表 T-040), and 表 T-109 says of the band's row 「掴んで
 * 動かせることを示す。**ボタンではない**」 -- so it is not an entry and no case
 * here means the number. ⛔ The value 表 T-206 holds at `S-135a` is deliberately
 * NOT copied here: rule 03 section 1 keeps it in one place, and
 * `tests/unit/uf-65.test.ts` is the bench that holds a described band to the
 * manuscript.
 */
const BAND_HEIGHT_NO_CASE_MEANS = 7

// ---------------------------------------------------------------------------
// Inputs. ⛔ The wait is read from the generated defaults, never typed here:
// rule 03 section 1 forbids re-typing a value the manuscript holds.
// ---------------------------------------------------------------------------

const WAIT_MS = SETTINGS_DEFAULTS[T_040_EZ2.wait] as number

/**
 * S-73's default hue. ⛔ Read from table T-216 rather than typed, for the same
 * reason the wait above is read: DR-5 of table T-052 keeps the hue on
 * `Project` rather than in the settings, so `SETTINGS_DEFAULTS` cannot answer
 * for it and this is the only machine-readable place it stands.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

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
  // FR-053: the entrance is not armed. ⛔ A separate member from `isPressed`,
  // because IC-54 says the palette entry is not a button and FR-053 (MUST NOT)
  // bars the pressed form -- so an arm may not travel on the toggle.
  isArmed: false,
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
  readonly assignments: readonly {
    readonly rowId: string
    readonly text: Readonly<Record<DisplayLanguage, string>>
  }[]
}

/** The explanation EZ-2 shows for one row of 表 T-109, in one display language. */
const hintWordOf = (row: string, language: DisplayLanguage): string => {
  const held = DICTIONARY.icons.find((one) => one.rowId === row)
  expect(held, `FR-038: the dictionary holds no explanation for ${row}`).toBeDefined()
  return (held as { readonly hint: Readonly<Record<DisplayLanguage, string>> }).hint[language]
}

/** The words FR-037 shows for one row of 表 T-023, in one display language. */
const assignmentWordOf = (row: string, language: DisplayLanguage): string => {
  const held = DICTIONARY.assignments.find((one) => one.rowId === row)
  expect(held, `FR-038: the dictionary holds no assignment for ${row}`).toBeDefined()
  return (held as { readonly text: Readonly<Record<DisplayLanguage, string>> }).text[language]
}

const SHOWN_ROW_NAME = 'a row name long enough to be cut'

const rowTitleOf = (part: Partial<RowTitle> = {}): RowTitle => {
  const label = part.label === undefined ? SHOWN_ROW_NAME : part.label
  const isLabelTruncated = part.isLabelTruncated ?? false
  return {
    groupId: 'g1',
    depth: 1,
    // S-37 x depth 1, the product FR-085 subtracts before the cut.
    indentPx: 12,
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
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
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
  openedFileName: null,
  fileSavedAt: null,
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
  // No case here reads the theme or the milestone glyph list: a tooltip is
  // words and a place, and neither S-72 nor S-142 reaches either. Both take
  // the manuscript's default; S-73 is read above.
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
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

/**
 * A pointer that is in the window and has waited longer than EZ-2 asks, resting
 * on NO icon. ⚠️ EZ-2's place condition is therefore unmet: this is the session
 * FR-085 and FR-037 are asked with, and the one that shows an icon is never
 * explained by the wait alone.
 */
const RESTED = sessionOf({ pointer: { x: 5, y: 5 }, pointerRestedMs: WAIT_MS + 1 })

/**
 * A pointer resting ON one row of 表 T-109 -- EZ-2's PLACE condition, which
 * `ScreenSession.iconUnderPointer` (PD-141) carries -- for a rest of `restedMs`,
 * which is its TIME condition.
 */
const restingOn = (icon: IconId, restedMs: number = WAIT_MS + 1): ScreenSession =>
  sessionOf({ pointer: { x: 5, y: 5 }, pointerRestedMs: restedMs, iconUnderPointer: icon })

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
        // ⛔ NO HEADING: FR-072 (MUST NOT) leaves the panel no heading row
        // (CR-272). ⚠️ The cast keeps either answer to "does the published
        // description still declare one" out of the compiler, so that the
        // disagreement falls as a test (tests/unit/uf-64.test.ts) rather than
        // taking this file down before any case runs.
        propertiesPanel: {
          showing: 'selection',
          isSubjectGone: false,
          fields: [{ row: 'PR-1', name: 'name', text: 'a task', isEditable: true, controls: [] }],
          // ⚠️ EMPTY ON PURPOSE: this bench is about another subject, and the
          // entrance table T-109 places on the panel (IC-52) is asserted in
          // tests/unit/fr-006-panel-close-entrance.test.ts.
          commands: [],
        } as ScreenView['propertiesPanel'],
        notices: [
          {
            manner: 'NT-1',
            mannerText: '',
            text: 'finish stands before start',
            nextSteps: [],
            affectedCount: null,
            dismissText: 'OK',
            dismissKey: 'NT-1',
          },
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
  it('shows it once the pointer has rested ON an icon longer than the wait', () => {
    const shown = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf({ icon: ICON_PALETTE })]) }),
      SETTINGS,
      restingOn(ICON_PALETTE),
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
        sessionOf({
          pointer: { x: 5, y: 5 },
          pointerRestedMs: WAIT_MS + 1,
          iconUnderPointer: ICON_PALETTE,
          language,
        }),
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
      restingOn(ICON_OPEN, WAIT_MS - 1),
    )
    expect(shown).toEqual([])
  })

  it('shows it once the rest reaches the wait exactly', () => {
    // ⚠️ THE ONE BOUNDARY EZ-2 DOES NOT SPELL OUT. S-124 is 「アイコンの説明を
    // 出すまでの待ち時間」, and a wait of that many milliseconds has been served
    // once that many have passed -- so the endpoint is inside. ⛔ Should the
    // manuscript ever say otherwise, this case is the one line to move, and the
    // two beside it (`WAIT_MS - 1`, `WAIT_MS + 1`) stand either way.
    const shown = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf()]) }),
      SETTINGS,
      restingOn(ICON_OPEN, WAIT_MS),
    )
    expect(iconsOf(shown)).toEqual([ICON_OPEN])
  })

  it('shows nothing while the pointer is outside the window, however long the rest', () => {
    // EZ-2 reads 「アイコンにポインタを合わせて」-- with no pointer, nothing is
    // being pointed at. `ScreenSession.pointer` is `null` for exactly that.
    const shown = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf()]) }),
      SETTINGS,
      sessionOf({ pointer: null, pointerRestedMs: WAIT_MS * 10, iconUnderPointer: ICON_OPEN }),
    )
    expect(shown).toEqual([])
  })

  it('takes the wait from the settings and not from a number of its own', () => {
    // ⭐ 04-verification.md 2.: a value only reaches the code if changing it
    // changes the answer. One rest, under the manuscript's wait and over a
    // shorter one. ⛔ `WAIT_MS` itself is read from the generated defaults, so a
    // manuscript that moved S-124 moves both halves of this case together.
    const view = viewOf({ appHeaderItems: headerWith([commandOf()]) })
    const resting = restingOn(ICON_OPEN, WAIT_MS - 1)

    expect(tooltipsFromScreenView(view, SETTINGS, resting)).toEqual([])
    expect(
      tooltipsFromScreenView(view, settingsOf({ [T_040_EZ2.wait]: WAIT_MS - 2 }), resting),
    ).toHaveLength(1)
  })

  it('reaches an icon on any part of the frame that holds entries a person can press', () => {
    // 表 T-109 places its rows on several surfaces at once: the `App Header`,
    // the `Command Palette`, and the surface a person opened (IC-52 closes it).
    // EZ-2 names no surface, so resting on any of the three is explained.
    const view = viewOf({
      appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN })]),
      commandPalette: {
        // ⭐ A CORNER, NOT A RECTANGLE (FR-053, MUST / MUST NOT).
        at: { x: 300, y: 300 },
        // ⚠️ INERT HERE -- see the note by the other palette in this file.
        grabBandHeight: BAND_HEIGHT_NO_CASE_MEANS,
        minimise: {
          icon: 'IC-75',
          label: 'IC-75',
          isEnabled: true,
          isPressed: false,
          isArmed: false,
        },
        isMinimised: false,
        groups: [{ name: '表示', commands: [commandOf({ icon: ICON_PALETTE })] }],
        armedText: 'なし',
      },
      openModal: {
        surface: 'Help Modal',
        heading: 'ヘルプ',
        commands: [commandOf({ icon: ICON_CLOSE })],
      },
    })

    for (const icon of [ICON_OPEN, ICON_PALETTE, ICON_CLOSE]) {
      const shown = tooltipsFromScreenView(view, SETTINGS, restingOn(icon))
      expect(iconsOf(shown), icon).toEqual([icon])
      expect(shown[0]?.text, icon).toBe(hintWordOf(icon, EMPTY_SESSION.language))
    }
  })

  it('answers for a palette that holds no group and a surface that holds no entry', () => {
    const shown = tooltipsFromScreenView(
      viewOf({
        commandPalette: {
          // ⭐ A CORNER, NOT A RECTANGLE (FR-053, MUST / MUST NOT).
          at: { x: 300, y: 300 },
          // ⚠️ INERT HERE -- see the note by the other palette in this file.
          grabBandHeight: BAND_HEIGHT_NO_CASE_MEANS,
          minimise: {
            icon: 'IC-75',
            label: 'IC-75',
            isEnabled: true,
            isPressed: false,
            isArmed: false,
          },
          isMinimised: false,
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

describe('EZ-2 (表 T-040, FR-092) — THAT icon, and no other', () => {
  /** Three entries a person can press, one on each surface EZ-2 can reach. */
  const THREE_ICONS = viewOf({
    appHeaderItems: headerWith([
      commandOf({ icon: ICON_OPEN }),
      commandOf({ icon: ICON_PALETTE }),
      commandOf({ icon: ICON_CLOSE }),
    ]),
  })

  it('explains only the icon the pointer is on, however many are drawn', () => {
    // 「そのアイコンの説明を出すこと」-- THAT icon's. The other two are on the
    // screen and the wait has passed for all of them alike, so an answer wider
    // than one row is EZ-2's place condition going unread.
    const shown = tooltipsFromScreenView(THREE_ICONS, SETTINGS, restingOn(ICON_PALETTE))

    expect(iconsOf(shown)).toEqual([ICON_PALETTE])
    expect(shown[0]?.text).toBe(hintWordOf(ICON_PALETTE, EMPTY_SESSION.language))
  })

  it('explains none of them while the pointer rests on no icon, however long', () => {
    // 「アイコンにポインタを合わせて」-- a pointer that is on no icon has been
    // put on none of these, and time does not supply the place.
    const shown = tooltipsFromScreenView(
      THREE_ICONS,
      SETTINGS,
      sessionOf({ pointer: { x: 5, y: 5 }, pointerRestedMs: WAIT_MS * 10 }),
    )
    expect(shown).toEqual([])
  })

  it('moves the explanation with the pointer, one icon at a time', () => {
    for (const icon of [ICON_OPEN, ICON_PALETTE, ICON_CLOSE]) {
      expect(iconsOf(tooltipsFromScreenView(THREE_ICONS, SETTINGS, restingOn(icon))), icon).toEqual([
        icon,
      ])
    }
  })
})

describe('FR-029 — an entry that cannot be used, and the same entry twice', () => {
  const DISABLED_ONLY = viewOf({
    appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN, isEnabled: false })]),
  })

  it('explains an entry that cannot be used', () => {
    // FR-029's RATIONALE: 「無反応だと故障に見える…操作できないものがその理由を
    // 示すこと」. ⛔ The REASON itself is not asserted: no member of
    // `CommandItem` carries one, so the seam cannot express what FR-029 asks
    // for -- only that the entry is not left silent.
    const shown = tooltipsFromScreenView(DISABLED_ONLY, SETTINGS, restingOn(ICON_OPEN))

    expect(iconsOf(shown)).toContain(ICON_OPEN)
    expect(shown[0]?.text.length).toBeGreaterThan(0)
  })

  it('does not let an entry that cannot be used escape EZ-2 place condition', () => {
    // ⭐ FR-029 adds a REASON to show; it does not add a second way of raising
    // one. EZ-2 is still 「そのアイコンの」, so an entry the pointer is not on is
    // not explained just because it cannot be pressed.
    const shown = tooltipsFromScreenView(
      viewOf({
        appHeaderItems: headerWith([
          commandOf({ icon: ICON_OPEN, isEnabled: false }),
          commandOf({ icon: ICON_PALETTE, isEnabled: true }),
        ]),
      }),
      SETTINGS,
      restingOn(ICON_PALETTE),
    )
    expect(iconsOf(shown)).toEqual([ICON_PALETTE])
  })

  it('does not let an entry that cannot be used escape EZ-2 wait either', () => {
    const shown = tooltipsFromScreenView(
      DISABLED_ONLY,
      SETTINGS,
      restingOn(ICON_OPEN, WAIT_MS - 1),
    )
    expect(shown).toEqual([])
  })

  it('explains what can be used and what cannot with the same words per row', () => {
    // 表 T-109 keys the explanation by the ROW, and neither FR-029 nor FR-038
    // gives an entry that cannot be used a second word -- so what is shown does
    // not turn on `isEnabled`.
    const disabled = tooltipsFromScreenView(DISABLED_ONLY, SETTINGS, restingOn(ICON_OPEN))
    const enabled = tooltipsFromScreenView(
      viewOf({ appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN, isEnabled: true })]) }),
      SETTINGS,
      restingOn(ICON_OPEN),
    )

    expect(iconsOf(disabled)).toEqual([ICON_OPEN])
    expect(iconsOf(enabled)).toEqual([ICON_OPEN])
    expect(disabled[0]?.text).toBe(hintWordOf(ICON_OPEN, EMPTY_SESSION.language))
    expect(enabled[0]?.text).toBe(hintWordOf(ICON_OPEN, EMPTY_SESSION.language))
  })

  it('still explains the row when the same icon stands in two places', () => {
    // 「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）」-- the
    // repeat is a fault where the entry is HELD, not here. ⛔ HOW MANY times the
    // row answers is NOT asserted: EZ-2's place condition is a row of 表 T-109
    // and not an entry, so nothing decides between one answer and two.
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
      restingOn(ICON_PALETTE),
    )
    expect(iconsOf(shown)).toContain(ICON_PALETTE)
    expect(new Set(iconsOf(shown))).toEqual(new Set([ICON_PALETTE]))
  })
})

describe('⛔ FR-085 (MUST NOT) — a cut row name is explained by nothing', () => {
  // 「その全文を説明として出してはならない（MUST NOT）」. UF-63 cuts the tail and
  // closes it with `…`, and 全文を見たい者はパネルを広げる（`FR-052`）-- so this
  // unit raises nothing at all for a row, whatever the pointer is doing.
  // ⚠️ `IN-3` of 表 T-028 says the same from the other side: 「`FR-085` は引き金
  // ではなくなった」, and the triggers it governs are `EZ-2` and `FR-037` alone.

  /** The pointer inside the row's own box -- the closest thing to a trigger there is. */
  const overRow = (box: ScreenRect): ScreenSession =>
    sessionOf({ pointer: { x: box.x + 1, y: box.y + 1 }, pointerRestedMs: 0 })

  it('⛔ explains nothing while the pointer rests on the name of a row that WAS cut', () => {
    const title = rowTitleOf({ groupId: 'g7', isLabelTruncated: true })
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [], titles: [title] } }),
      SETTINGS,
      overRow(title.box),
    )

    expect(shown).toEqual([])
  })

  it('⛔ explains nothing however long the pointer has rested there', () => {
    // The wait belongs to `EZ-2` and to `EZ-2` alone (`S-124`). A row that
    // answered after it would be raising FR-085's explanation on EZ-2's clock.
    const title = rowTitleOf({ groupId: 'g7', box: rect(0, 0, 200, 24), isLabelTruncated: true })
    const view = viewOf({ rowTitlePanel: { pinnedTitles: [], titles: [title] } })

    for (const restedMs of [0, WAIT_MS, WAIT_MS * 10]) {
      const shown = tooltipsFromScreenView(
        view,
        SETTINGS,
        sessionOf({ pointer: { x: 1, y: 1 }, pointerRestedMs: restedMs }),
      )
      expect(shown, `after resting ${restedMs} ms`).toEqual([])
    }
  })

  it('⛔ explains nothing for a whole panel of cut rows, pinned ones included', () => {
    // FR-098 (MUST) lifts a pinned row out of the scrolling list, so the panel
    // holds two rosters. Neither of them raises anything.
    const pinned = rowTitleOf({ groupId: 'g-pin', isPinned: true, isLabelTruncated: true })
    const first = rowTitleOf({ groupId: 'g1', isLabelTruncated: true })
    const second = rowTitleOf({ groupId: 'g2', isLabelTruncated: true })
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [pinned], titles: [first, second] } }),
      SETTINGS,
      overRow(first.box),
    )

    expect(rowsOf(shown)).toEqual([])
    expect(shown).toEqual([])
  })

  it('⛔ explains nothing for a row whose name was not cut either', () => {
    const title = rowTitleOf({ groupId: 'g7', isLabelTruncated: false })
    const shown = tooltipsFromScreenView(
      viewOf({ rowTitlePanel: { pinnedTitles: [], titles: [title] } }),
      SETTINGS,
      overRow(title.box),
    )
    expect(shown).toEqual([])
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

  it('shows the words FR-038 holds for the row of 表 T-023 each axis is faster by', () => {
    // ⚠️ ANSWERED SINCE the note at the head of this file was written. FR-038's
    // fifth paragraph (MUST) now holds every printed word in one per-language
    // dictionary, keyed by the row -- so which row each lane teaches can be
    // asserted, and T_023_FASTER above is the fixed copy it is asserted from.
    const view = viewOf({ frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES } })
    const onVertical = tooltipsFromScreenView(view, SETTINGS, at(VERTICAL_TRACK.x + 5, 300))
    const onHorizontal = tooltipsFromScreenView(view, SETTINGS, at(50, HORIZONTAL_TRACK.y + 5))

    expect(textAt(onVertical, T_023_FASTER[0].axis)).toBe(
      assignmentWordOf(T_023_FASTER[0].row, EMPTY_SESSION.language),
    )
    expect(textAt(onHorizontal, T_023_FASTER[1].axis)).toBe(
      assignmentWordOf(T_023_FASTER[1].row, EMPTY_SESSION.language),
    )
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

describe('IN-3 (表 T-028) — the two raisers each keep their own conditions', () => {
  // ⛔ TWO AND NOT THREE (CR-257). IN-3's last line reads 「出す引き金は `FR-092`
  // の `EZ-2` と `FR-037` が持つ」 and adds 「`FR-085` は引き金ではなくなった」, so a
  // panel of cut names is carried through every case below to show that it
  // raises nothing whatever the other two are doing.
  const CUT_ROW = rowTitleOf({
    groupId: 'g7',
    box: rect(0, 288, 200, 24),
    isLabelTruncated: true,
  })

  /** A frame that holds both of IN-3's raisers at once, and a cut name besides. */
  const BOTH = viewOf({
    frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES },
    appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN })]),
    rowTitlePanel: { pinnedTitles: [], titles: [CUT_ROW] },
  })

  /** On the vertical lane, and resting on the header's icon for `restedMs`. */
  const onLaneAndIcon = (restedMs: number): ScreenSession =>
    sessionOf({
      pointer: { x: VERTICAL_TRACK.x + 5, y: 300 },
      pointerRestedMs: restedMs,
      iconUnderPointer: ICON_OPEN,
    })

  it('raises both when each of their own conditions is met, and no third', () => {
    // Two triggers, not one, so a frame may carry both at once -- and ⛔ not
    // three: the cut row in this very frame raises nothing (FR-085, MUST NOT).
    const shown = tooltipsFromScreenView(BOTH, SETTINGS, onLaneAndIcon(WAIT_MS + 1))

    expect(iconsOf(shown)).toEqual([ICON_OPEN])
    expect(axesOf(shown)).toEqual(['vertical'])
    expect(rowsOf(shown)).toEqual([])
  })

  it('leaves the other standing while EZ-2 wait has not passed', () => {
    // ⭐ S-124 is EZ-2's wait and EZ-2's alone. FR-037 turns on a pointer that
    // is on the lane and names no wait, so holding it back for
    // `iconHintDelayMs` would be a condition invented here.
    const shown = tooltipsFromScreenView(BOTH, SETTINGS, onLaneAndIcon(0))

    expect(iconsOf(shown)).toEqual([])
    expect(axesOf(shown)).toEqual(['vertical'])
    expect(rowsOf(shown)).toEqual([])
  })

  it('leaves the other standing while the pointer rests on no icon', () => {
    const shown = tooltipsFromScreenView(
      BOTH,
      SETTINGS,
      sessionOf({ pointer: { x: VERTICAL_TRACK.x + 5, y: 300 }, pointerRestedMs: WAIT_MS * 10 }),
    )

    expect(iconsOf(shown)).toEqual([])
    expect(axesOf(shown)).toEqual(['vertical'])
    expect(rowsOf(shown)).toEqual([])
  })

  it('raises EZ-2 alone when only its two conditions are met', () => {
    // The pointer is off both lanes, so the icon answers by itself -- the other
    // is not carried along by it.
    const shown = tooltipsFromScreenView(
      viewOf({
        frame: { ...EMPTY_VIEW.frame, scrollbars: BOTH_LANES },
        appHeaderItems: headerWith([commandOf({ icon: ICON_OPEN })]),
        rowTitlePanel: { pinnedTitles: [], titles: [CUT_ROW] },
      }),
      SETTINGS,
      restingOn(ICON_OPEN),
    )

    expect(iconsOf(shown)).toEqual([ICON_OPEN])
    expect(rowsOf(shown)).toEqual([])
    expect(axesOf(shown)).toEqual([])
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
    iconUnderPointer: ICON_OPEN,
  })

  it('carries what it explains, the words, and the assignment of that row -- nothing else', () => {
    // IN-3 grants 消せること・乗せられること・勝手に消えないこと to EVERY
    // tooltip. A member for any of them would let a caller describe one IN-3
    // forbids, so none of the three is a member here.
    // ⭐ THE THIRD MEMBER IS EZ-2's OWN: 「説明の後ろに、その行の割当も出す
    // こと（MUST）」. FR-036 fixes what it points at and where its words come
    // from, and says 「どちらも持たない行は、その場所を空ける」-- so the member
    // is on every tooltip and empty, not absent, on a row with no assignment.
    const shown = tooltipsFromScreenView(CROWDED, SETTINGS, CROWDED_SESSION)

    expect(shown.length).toBeGreaterThan(0)
    for (const one of shown) {
      expect(Object.keys(one).sort()).toEqual(['anchor', 'assignment', 'text'])
      expect(typeof one.text).toBe('string')
      expect(one.assignment === null || typeof one.assignment === 'string').toBe(true)
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
