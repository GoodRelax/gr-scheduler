// FR-085's arithmetic: how much room a row's name is given.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification section 1). The
// imports, `settingsOf`, `groupOf`, `scheduleOf`, `SESSION` and `drawn` are
// COPIED FROM tests/unit/uf-63.test.ts, which drives the same unit
// (`rowTitlePanelFromSchedule`, UF-63 of table T-075).
//
// ⭐ WHY THIS FILE EXISTS BESIDE uf-63.test.ts. That file's header says, in as
// many words, 「NO CASE ASSERTS A NUMBER OF PIXELS FOR THE ROOM FR-085 KEEPS
// FOR THE ROW CONTROLS … No row holds that size」, and every width case there
// is written as a RELATION for that reason -- how far the cut MOVES when a
// settings value moves. ⛔ THAT READING IS NOW OUT OF DATE: S-140 of table
// T-206 holds exactly that size, and revision 1.21 of the appendix set it to
// 0 (利用者の裁定 2026-08-27). So the SUM itself can be asserted, which is what
// this file adds: the three terms FR-085 names, and no fourth one.
//
// THE LINES THIS FILE RESTS ON
//
//   FR-085 (docs/spec/01-04-requirements.md:1281, MUST)
//     「使える幅は、`rowTitlePanelWidth`（`_assets/tbl-settings.md` の表 T-203
//      の `S-79`）から、その行の深さぶんのインデント（`rowTitleIndent`。同書の
//      表 T-201 の `S-37`）と、行の操作子（`Row Expander` / `Row Pin`。置き方は
//      表 T-051 の `HF-4` 〜 `HF-6`）に確保した場所を引いた残りとすること
//      (MUST)。**確保する場所を、操作子を描くかどうかで変えてはならない
//      (MUST NOT)。量は `_assets/tbl-settings.md` の 表 T-206 の `S-140` が
//      持つ。** …… **幅の判定は `FR-093` の概算で行うこと（MUST）。**」
//
//   T-206 S-140 (docs/spec/_assets/tbl-settings.md:267)
//     「| S-140 | 行の操作子に確保する場所（`FR-085`） | 0px 🔎 | …
//      ⭐ **0 でもこの MUST NOT は真である** —— 常に 0 なら、描くかどうかで
//      変わっていない。…… ⛔ **本行を消してはならない** —— 消すと `FR-085` の
//      算式が項を 1 つ失う」
//
//   FR-093 (docs/spec/01-04-requirements.md:1184, MUST NOT twice)
//     「`GRS` は、ラベルが占める幅を、**全角 2・半角 1 で数えた単位数 ×
//      フォントサイズ × `labelCoef`** で概算すること」
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * THE ROUNDING. FR-085 gives a width in pixels and FR-093 an estimate in
//     pixels; no row says what happens to a name whose estimate lands between
//     two characters. Every settings value below is chosen so one half-width
//     character costs a whole number of pixels and the panel divides by it
//     exactly, so no case here depends on an answer nobody has written.
//   * WHAT S-38 `rowTitleTopScale` does to the SUM. K-38 of table T-104 makes
//     it the scale of a depth 1 row's name, which is FR-093's font and not
//     FR-085's width; uf-63.test.ts owns it. It is pinned to 1 below so that
//     the depth 1 row is measured with the same font as the others.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  RowTitle,
  RowTitlePanel,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The values of the specification, read out of the manuscript at run time
// ---------------------------------------------------------------------------

/** One row of a numbered table, by its row ID. */
const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

/** The one number a settings row prints in its default column. */
const numberIn = (cell: string): number => {
  const hit = /-?\d+(?:\.\d+)?/.exec(bare(cell))
  if (hit === null) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return Number(hit[0])
}

/**
 * S-140 -- 「行の操作子に確保する場所（`FR-085`）」.
 *
 * ⛔ READ FROM THE MANUSCRIPT, NEVER TYPED HERE. The whole point of the row is
 * that FR-085's sum keeps a term for it; a copy of the figure in this file
 * would go stale the moment the ruling that set it to 0 was revisited, and the
 * sum below would then be asserted against a number nobody had agreed to.
 */
const S_140 = numberIn(rowOf('T-206', 'S-140')['既定'] ?? '')

/** S-73's default hue, read out of table T-216 -- `Project` carries it, not the settings. */
const THEME_HUE = numberIn(rowOf('T-216', 'S-73')['既定'] ?? '')

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * The panel these cases are driven from.
 *
 * Every number sits inside its own row's bounds in `_assets/tbl-settings.md`,
 * and they are chosen so that FR-093's estimate lands on whole characters:
 * `rowTitleFont` x `labelCoef` is 10px per half-width character, so the panel
 * and every indent divide by it exactly.
 */
const PANEL = settingsOf({
  rowTitlePanelWidth: 400, // S-79
  rowTitleIndent: 20, // S-37
  rowTitleFont: 20, // S-36
  rowTitleTopScale: 1, // S-38 -- see the header
  labelCoef: 0.5, // S-30
  maxGroupDepth: 5, // S-125
  truncateUnits: 120, // S-35, held clear: FR-085 forbids cutting by it
  pinnedGroupIds: [], // S-126
  pinnedRowMax: 5, // S-127
})

const panelWith = (part: Record<string, unknown>): DocumentSettings =>
  settingsOf({ ...(PANEL as unknown as Record<string, unknown>), ...part })

/** FR-093's cost of ONE half-width character in this panel, at a given depth. */
const perCharacter = (settings: DocumentSettings): number => {
  const flat = settings as unknown as Record<string, number>
  return (flat['rowTitleFont'] as number) * (flat['labelCoef'] as number)
}

/** FR-085's sum, written out: 「`S-79` から `深さ x S-37` と `S-140` を引いた残り」. */
const roomInPixels = (settings: DocumentSettings, depth: number): number => {
  const flat = settings as unknown as Record<string, number>
  return (flat['rowTitlePanelWidth'] as number) - depth * (flat['rowTitleIndent'] as number) - S_140
}

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
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (groups: readonly TaskGroup[]): Schedule =>
  ({
    project: { title: null, themeHue: THEME_HUE, uidHighWaterMark: 0 },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const boxAt = (index: number): ScreenRect => ({ x: 0, y: index * 24, width: 400, height: 24 })

const drawn = (...groupIds: readonly string[]): ScreenSession =>
  sessionWith({ rowBoxes: groupIds.map((groupId, index) => ({ groupId, box: boxAt(index) })) })

/** The title of the deepest row of a chain of `depth` rows, all named alike. */
const deepestTitle = (depth: number, label: string, settings: DocumentSettings): RowTitle => {
  const ids = Array.from({ length: depth }, (_unused, index) => `g${index + 1}`)
  const groups = ids.map((id, index) =>
    groupOf({ id, parentId: index === 0 ? null : `g${index}`, label, order: index }),
  )
  const panel: RowTitlePanel = rowTitlePanelFromSchedule(
    scheduleOf(groups),
    settings,
    emptySelection(),
    drawn(...ids),
  )
  const found = [...panel.pinnedTitles, ...panel.titles].filter(
    (one) => one.groupId === `g${depth}`,
  )
  expect(found.length, `exactly one title for g${depth}`).toBe(1)
  return found[0] as RowTitle
}

/**
 * The longest half-width name this depth shows WHOLE.
 *
 * The panel's own answer to 「使える幅」, read back through the one thing the
 * specification makes observable: where the cut lands.
 */
const keptOf = (settings: DocumentSettings, depth: number): number => {
  for (let length = 1; length <= 400; length += 1) {
    if (deepestTitle(depth, 'x'.repeat(length), settings).isLabelTruncated) return length - 1
  }
  throw new Error('no half-width name of any length was cut by this panel')
}

// ---------------------------------------------------------------------------

describe('FR-085 (MUST) -- the room for a name is the panel less the indent less S-140', () => {
  const DEPTHS = [1, 2, 3] as const

  it.each(DEPTHS)(
    '⭐ gives a depth %i row exactly `S-79` − depth x `S-37` − `S-140`, read through FR-093',
    (depth) => {
      expect(keptOf(PANEL, depth)).toBe(roomInPixels(PANEL, depth) / perCharacter(PANEL))
    },
  )

  it('⭐ keeps NO room for the row controls, because S-140 is 0', () => {
    // ⭐ THE TERM THAT USED TO BE 56px. Appendix revision 1.21: 「`S-140` を 0 に
    // し、操作子を名前の上へ重ねる」 (利用者の裁定 2026-08-27) -- so the whole of
    // what the indent leaves belongs to the name, and the row controls take
    // none of it. ⛔ The claim is asserted through S-140 rather than through the
    // figure 0, so a manuscript that raised the row again moves this case with
    // it instead of leaving it green against a stale number.
    expect(S_140, 'table T-206 still prints S-140 as 0px').toBe(0)

    const flat = PANEL as unknown as Record<string, number>
    const wholePanelLessIndent =
      ((flat['rowTitlePanelWidth'] as number) - 1 * (flat['rowTitleIndent'] as number)) /
      perCharacter(PANEL)

    expect(keptOf(PANEL, 1)).toBe(wholePanelLessIndent)
  })

  it('⛔ the sum really is being measured -- moving S-79 by one character moves the cut by one', () => {
    // ⚠️ 04-verification section 2. Each of the three terms is moved on its own,
    // so a panel that answered a constant would fail every one of them.
    const one = perCharacter(PANEL)

    expect(keptOf(panelWith({ rowTitlePanelWidth: 400 + one }), 1) - keptOf(PANEL, 1)).toBe(1)
    expect(keptOf(panelWith({ rowTitleIndent: 20 + one }), 1) - keptOf(PANEL, 1)).toBe(-1)
  })

  it('takes the indent once PER STEP OF DEPTH, not once for the whole chain', () => {
    // 「その行の深さぶんのインデント」. Two steps of S-37 is two steps of the cut.
    const step = (PANEL as unknown as Record<string, number>)['rowTitleIndent'] as number
    const perStep = step / perCharacter(PANEL)

    expect(keptOf(PANEL, 1) - keptOf(PANEL, 2)).toBe(perStep)
    expect(keptOf(PANEL, 2) - keptOf(PANEL, 3)).toBe(perStep)
    expect(keptOf(PANEL, 1) - keptOf(PANEL, 3)).toBe(2 * perStep)
  })

  it('has no fourth term: a wider panel buys the name every pixel it added', () => {
    // ⛔ FR-085 names three terms and the row for the third says 「本行を消しては
    // ならない —— 消すと `FR-085` の算式が項を 1 つ失う」, which cuts both ways: a
    // FOURTH term nobody wrote would show up here as room that went missing.
    for (const width of [300, 400, 500, 640]) {
      const wider = panelWith({ rowTitlePanelWidth: width })
      expect(keptOf(wider, 2), `at a panel of ${width}px`).toBe(
        roomInPixels(wider, 2) / perCharacter(wider),
      )
    }
  })
})

describe('the specification still says what these cases copy', () => {
  it('table T-206 still holds S-140, and FR-085 still names it as the third term', () => {
    // Chapter 1.9 (:275): the case is driven by the table it verifies.
    expect(specTable('T-206').rows.map((row) => row.id)).toContain('S-140')
    expect(rowOf('T-206', 'S-140')['値'] ?? '').toContain('`FR-085`')
  })
})
