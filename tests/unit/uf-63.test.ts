// Unit tests for `rowTitlePanelFromSchedule` (unit UF-63 of table T-075,
// component CP-37 of table T-062, `row-title-panel.ts`).
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, and the two declarations a tester may read -- the "nine unit
// contracts" section of `screen-renderer.ts`, which fixes this signature, and
// the `RowTitlePanel` / `RowTitle` / `RowExpander` / `ScreenSession` types it is
// written against. No expected value here was taken from how the unit computes
// its answer.
//
// The rules these cases answer to:
//   FR-085   the row is named and selected in this panel; the name is cut to
//            the width the panel leaves, and the room kept for the controls
//            does not follow whether the controls are drawn (MUST NOT)
//   FR-093   a width is estimated -- full-width 2, half-width 1, times the font
//            size, times `labelCoef` (S-30). Measuring a glyph is forbidden
//            (MUST NOT), and so is keeping a measurement (MUST NOT)
//   FR-058   a row that was given no name of its own shows the name of the
//            `Task` it was derived from (MUST). IV-8 of Chapter 6.1 and AT-54
//            make `label` and `derivedFromTaskUid` never both null
//   FR-098   a pinned row is lifted out of the scrolling list and must not also
//            be drawn at its natural place (MUST NOT); pinned rows are not
//            ranked against each other (MUST NOT); reaching `pinnedRowMax`
//            refuses a NEW pin and must not let go of one already made
//            (MUST NOT)
//   FR-004   the hierarchy, its controls (table T-051) and its depth cap
//            (S-125); HR-1a and HR-6 of table T-015
//   SC-1     (table T-031) the panel follows the body vertically, so its rows
//            are the drawn rows
//   T-075    the unit is `pure`, so it may not write to what it was handed
//            (R7.1 of docs/development-rules/07-review-standards.md)
//
// NO CASE ASSERTS A NUMBER OF PIXELS FOR THE ROOM FR-085 KEEPS FOR THE ROW
// CONTROLS. Searched: `_assets/tbl-settings.md` tables T-201, T-203, T-206,
// T-211, T-212; table T-051 (HF-4 / HF-5 / HF-6 / HF-9); FR-098's paragraph on
// the `Row Pin`; table T-109, whose IC-58 .. IC-61 have no figure at all
// (RC-13 of table T-026). No row holds that size. So every width case below
// states a RELATION the specification does fix -- how far the cut MOVES when a
// settings value moves -- and each of those relations holds whatever that room
// turns out to be, because FR-085 forbids the room to follow the depth, the
// name, or whether a control is drawn.
//
// NO CASE ASSERTS THAT A ROW IS SELECTED EITHER. FR-085 (MUST) has rows
// selected in this panel and says the set is NOT table T-023c's, whose SL-1
// leaves rows out. Searched `Selection` (PI-32), `ScreenState` (S-99e / S-99f /
// S-99g), `ScreenSession`, table T-203 and table T-206: nothing holds that set,
// and the four arguments cannot carry it. What IS specified, and is asserted
// below, is that the drawing area's selection never reaches a row.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  RowTitle,
  RowTitlePanel,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Inputs. A whole DocumentSettings is 100+ keys, so a case pins the ones it
// means and everything else comes from SETTINGS_DEFAULTS, which is generated
// from the manuscript.
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * S-73's default hue, read out of table T-216 rather than written here.
 *
 * DR-5 of table T-052 keeps the hue on `Project`, so `SETTINGS_DEFAULTS` does
 * not carry it and there is no generated constant to spread it from.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

/**
 * The settings the width cases are driven from.
 *
 * Every number sits inside its own row's bounds in `_assets/tbl-settings.md`,
 * and they are chosen so the arithmetic FR-093 states lands on whole
 * characters: `rowTitleFont` x `labelCoef` is 10px per half-width character, so
 * one step of `rowTitleIndent` is exactly 2 characters and 40px of panel is
 * exactly 4.
 *
 * `rowTitleTopScale` is pinned to 1 -- its own lower bound -- so that a case
 * which means to move the indent moves the indent alone. The one case that
 * means to move S-38 moves it.
 */
const PANEL = settingsOf({
  rowTitlePanelWidth: 400, // S-79
  rowTitleIndent: 20, // S-37
  rowTitleFont: 20, // S-36
  rowTitleTopScale: 1, // S-38
  labelCoef: 0.5, // S-30
  maxGroupDepth: 5, // S-125
  truncateUnits: 24, // S-35
  pinnedGroupIds: [], // S-126
  pinnedRowMax: 5, // S-127
})

const panelWith = (part: Record<string, unknown>): DocumentSettings =>
  settingsOf({ ...PANEL, ...part })

/** One half-width character costs 10px under PANEL, so 400 of them never fit. */
const LONG = 'x'.repeat(400)

/**
 * The mark FR-085 (MUST) closes a cut name with, written as its code point.
 *
 * ⚠️ 「末尾を打ち切り、`…` を置くこと（MUST）」 spells the character itself, so it is
 * a value of the specification and not of `src/`. Written as `…` because a
 * typed one reads as three periods in a diff.
 */
const MARK = '…'

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The seven members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `themePreference` is S-72 and `isMilestoneListOpen` S-142
  // (both the manuscript's default -- the row titles carry no theme and no
  // glyph), `themeHue` is S-73 read from the manuscript, `selectedGroupIds` is
  // FR-085's set of rows and `selectedResourceUids` FR-099's set of resources
  // (both empty -- none chosen), and `propertiesSubject` is FR-072's remembered
  // subject (`null` -- no operation has chosen one yet).
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

/** Every nullable column of ET-4 spelled out; leaving one `undefined` reads as "set". */
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

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (groups: readonly TaskGroup[], tasks: readonly Task[] = []): Schedule =>
  ({
    project: { title: null, themeHue: 214, uidHighWaterMark: 0 },
    calendars: [],
    tasks,
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

/** Distinct rectangles, so a case can tell one row's box from another's. */
const boxAt = (index: number): ScreenRect => ({ x: 0, y: index * 24, width: 400, height: 24 })

/** What the shell measured this frame, in the order it hands them over. */
const drawn = (...groupIds: readonly string[]): ScreenSession =>
  sessionWith({ rowBoxes: groupIds.map((groupId, index) => ({ groupId, box: boxAt(index) })) })

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const panelOf = (
  schedule: Schedule,
  session: ScreenSession,
  settings: DocumentSettings = PANEL,
  selection = emptySelection(),
): RowTitlePanel => rowTitlePanelFromSchedule(schedule, settings, selection, session)

const idsOf = (titles: readonly RowTitle[]): readonly string[] => titles.map((drawnText) => drawnText.groupId)

/** The one title for a row, from whichever of the two lists holds it. */
const titleOf = (panel: RowTitlePanel, groupId: string): RowTitle => {
  const found = [...panel.pinnedTitles, ...panel.titles].filter((drawnText) => drawnText.groupId === groupId)
  expect(found.length, `exactly one title for ${groupId}`).toBe(1)
  return found[0] as RowTitle
}

/**
 * A chain of `depth` rows, root first, each the child of the one before, all of
 * them drawn and all carrying the same name. The deepest is `g{depth}`.
 */
const chainPanel = (
  depth: number,
  label: string | null,
  settings: DocumentSettings = PANEL,
): RowTitlePanel => {
  const ids = Array.from({ length: depth }, (_, index) => `g${index + 1}`)
  const groups = ids.map((id, index) =>
    groupOf({ id, parentId: index === 0 ? null : `g${index}`, label, order: index }),
  )
  return panelOf(scheduleOf(groups), drawn(...ids), settings)
}

/** The title of the deepest row of such a chain. */
const deepestTitle = (
  depth: number,
  label: string | null,
  settings: DocumentSettings = PANEL,
): RowTitle => titleOf(chainPanel(depth, label, settings), `g${depth}`)

/** The same chain, built against a `Selection` the caller chose. */
const chainPanelWithSelection = (
  depth: number,
  selection: ReturnType<typeof emptySelection>,
): RowTitlePanel => {
  const ids = Array.from({ length: depth }, (_, index) => `g${index + 1}`)
  const groups = ids.map((id, index) =>
    groupOf({ id, parentId: index === 0 ? null : `g${index}`, label: id, order: index }),
  )
  return panelOf(scheduleOf(groups), drawn(...ids), PANEL, selection)
}

/**
 * The longest half-width name this depth shows WHOLE.
 *
 * This is the panel's own answer to "how much room is there for a name", read
 * back through the only thing the specification makes observable: where the cut
 * lands. Every width case compares two of these rather than naming a number,
 * because the room FR-085 keeps for the row controls has no row anywhere.
 *
 * ⛔ NOT the length of what is left of a name that WAS cut. FR-085 (MUST) closes
 * a cut name with `…`, so the shown string of a cut row is not made of the given
 * name alone and its length would answer a second question at the same time.
 * ⚠️ `isLabelTruncated` is the panel's own statement that the name it shows is
 * not the name it was given, which is what "fits whole" means here.
 */
const keptOf = (settings: DocumentSettings, depth: number): number => {
  expect(
    deepestTitle(depth, LONG, settings).isLabelTruncated,
    'a 400-character name cannot fit any panel used here',
  ).toBe(true)
  for (let length = 1; length <= LONG.length; length += 1) {
    if (deepestTitle(depth, 'x'.repeat(length), settings).isLabelTruncated) return length - 1
  }
  throw new Error('no half-width name of any length was cut by this panel')
}

// ---------------------------------------------------------------------------

describe('UF-63 -- SC-1 of table T-031: the drawn rows are the roster', () => {
  it('gives one title to each row the shell drew', () => {
    expect(idsOf(chainPanel(3, 'alpha').titles)).toEqual(['g1', 'g2', 'g3'])
  })

  it('takes each box straight from `rowBoxes`, measuring nothing of its own', () => {
    // SC-1 slaves the panel to the body vertically, so the panel and the Row
    // Area have to be the SAME numbers rather than two computations of them.
    const session = drawn('g1', 'g2', 'g3')
    const groups = ['g1', 'g2', 'g3'].map((id) => groupOf({ id, label: id }))
    const panel = panelOf(scheduleOf(groups), session)

    for (const measured of session.rowBoxes) {
      expect(titleOf(panel, measured.groupId).box).toEqual(measured.box)
    }
  })

  it('keeps the order `rowBoxes` arrived in although `TaskGroup.order` disagrees', () => {
    // AT-55 is a second ordering of the same rows; taking it would be a second
    // answer to the question SC-1 already answers.
    const groups = [
      groupOf({ id: 'g1', label: 'a', order: 9 }),
      groupOf({ id: 'g2', label: 'b', order: 0 }),
      groupOf({ id: 'g3', label: 'c', order: 4 }),
    ]

    expect(idsOf(panelOf(scheduleOf(groups), drawn('g2', 'g3', 'g1')).titles)).toEqual([
      'g2',
      'g3',
      'g1',
    ])
  })

  it('leaves out a `TaskGroup` the shell drew no box for', () => {
    // HR-1a (a collapsed row's descendants), HR-6 (a hidden row's descendants)
    // and FR-018 (what the display amount dropped) all reach the panel this
    // way, without this unit judging any of them.
    const groups = [
      groupOf({ id: 'g1', label: 'a' }),
      groupOf({ id: 'g2', parentId: 'g1', label: 'b' }),
    ]

    expect(idsOf(panelOf(scheduleOf(groups), drawn('g1')).titles)).toEqual(['g1'])
  })

  it('describes nothing when nothing was drawn', () => {
    const groups = [groupOf({ id: 'g1', label: 'a' })]

    expect(panelOf(scheduleOf(groups), drawn())).toEqual({ pinnedTitles: [], titles: [] })
  })

  it('describes nothing when the document holds no row at all', () => {
    expect(panelOf(scheduleOf([]), drawn())).toEqual({ pinnedTitles: [], titles: [] })
  })

  it('describes one row when one was drawn', () => {
    const panel = panelOf(scheduleOf([groupOf({ id: 'only', label: 'a' })]), drawn('only'))

    expect(idsOf(panel.titles)).toEqual(['only'])
    expect(panel.pinnedTitles).toEqual([])
  })
})

describe('UF-63 -- FR-098: the pinned rows are lifted out', () => {
  const threeRows = scheduleOf([
    groupOf({ id: 'g1', label: 'a' }),
    groupOf({ id: 'g2', label: 'b' }),
    groupOf({ id: 'g3', label: 'c' }),
  ])
  const allThree = drawn('g1', 'g2', 'g3')

  it('lifts a pinned row into `pinnedTitles`', () => {
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g2'] }))

    expect(idsOf(panel.pinnedTitles)).toEqual(['g2'])
  })

  it('MUST NOT draw the same row at its natural place as well', () => {
    // FR-098: drawn twice, one row is counted twice by the lane assignment
    // (FR-003) and by the fit (FR-055).
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g2'] }))

    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
  })

  it('MUST NOT rank pinned rows against each other: they come out in pin order', () => {
    // FR-098 lines them up from the top in the order they were fixed, which is
    // the order S-126 holds them in -- not the drawn order, not `TaskGroup.order`.
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g3', 'g1'] }))

    expect(idsOf(panel.pinnedTitles)).toEqual(['g3', 'g1'])
    expect(idsOf(panel.titles)).toEqual(['g2'])
  })

  it('draws a row once when S-126 happens to hold its id twice', () => {
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g2', 'g2'] }))

    expect(idsOf(panel.pinnedTitles)).toEqual(['g2'])
    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
  })

  it('MUST NOT let go of a pin already made, whatever `pinnedRowMax` says', () => {
    // FR-098 spends S-127 refusing a NEW pin and forbids letting one go
    // automatically. A view that trimmed the list to the bound would perform
    // exactly the silent unpinning the requirement was written against.
    const panel = panelOf(
      threeRows,
      allThree,
      panelWith({ pinnedGroupIds: ['g1', 'g2', 'g3'], pinnedRowMax: 1 }),
    )

    expect(idsOf(panel.pinnedTitles)).toEqual(['g1', 'g2', 'g3'])
    expect(panel.titles).toEqual([])
  })

  it('leaves out a pinned row the fold or the hide stopped drawing (HR-1a / HR-6)', () => {
    // ⛔ THE PREMISE THIS CASE USED TO REST ON WAS REVERSED. It read "the
    // display amount stopped drawing it", and FR-098 now says the opposite:
    // 「ピン止めした行を、表示量の増減（`FR-018`）で描かなくしてはならない（MUST
    // NOT）」（利用者の裁定 2026-08-30「拡大、縮小しても表示を続けるのが
    // ピン止めだ」）. ⭐ TWO REASONS ARE LEFT, AND ONLY TWO: 「ピン止めした行が
    // 描かれないのは、人が畳んだ行の配下にあるとき（表 T-015 の `HR-1a`）と、
    // 隠した行の配下にあるとき（同表の `HR-6`）に限ること（MUST）」.
    //
    // ⚠️ WHICH OF THE THREE IT WAS IS NOT VISIBLE FROM HERE. SC-1 hands this
    // unit the drawn roster and nothing else, so "the shell drew no box" is all
    // it can read. What this case does assert is the half that is this unit's:
    // a row the shell did not draw is named NOWHERE -- not in `pinnedTitles`
    // either, because the pinned list is still made of drawn rows and this unit
    // measures nothing of its own.
    //
    // ⭐ THE FIXTURE IS HR-1a's, not FR-018's: `g2` sits under `g1`, and `g1` is
    // folded, so HR-1a (MUST NOT) forbids drawing `g2` at all.
    const folded = scheduleOf([
      groupOf({ id: 'g1', label: 'a', isCollapsed: true }),
      groupOf({ id: 'g2', parentId: 'g1', label: 'b' }),
      groupOf({ id: 'g3', label: 'c', order: 1 }),
    ])
    const panel = panelOf(folded, drawn('g1', 'g3'), panelWith({ pinnedGroupIds: ['g2'] }))

    expect(panel.pinnedTitles).toEqual([])
    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
  })

  it('⭐ and lifts the same pinned row the moment the shell draws it', () => {
    // ⛔ THE PAIR WITHOUT WHICH THE CASE ABOVE PASSES ON A UNIT THAT NEVER PINS
    // ANYTHING. The only thing that moves between the two is whether the shell
    // measured a box for `g2` -- FR-098 (MUST NOT) has taken every other reason
    // away, so this is the one question left for this unit to answer.
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g2'] }))

    expect(idsOf(panel.pinnedTitles)).toEqual(['g2'])
  })

  it('marks the pinned rows and only those', () => {
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g2'] }))

    expect(titleOf(panel, 'g2').isPinned).toBe(true)
    expect(titleOf(panel, 'g1').isPinned).toBe(false)
    expect(titleOf(panel, 'g3').isPinned).toBe(false)
  })

  it('pins nothing while S-126 is empty', () => {
    const panel = panelOf(threeRows, allThree)

    expect(panel.pinnedTitles).toEqual([])
    expect(idsOf(panel.titles)).toEqual(['g1', 'g2', 'g3'])
  })

  it('describes a pinned row with the box the shell measured for it, IN THE BAND', () => {
    // ⛔ THE FIXTURE THIS CASE USED TO CARRY IS ONE FR-098 NO LONGER ADMITS. It
    // handed the pinned row the box of its NATURAL place and asked for that box
    // back, and the requirement now settles where a pinned row is drawn:
    // 「ピン止めした行は、スクロールする領域から抜いて画面の上端へ固定すること
    // （MUST）」, 「本要求でいう「画面の上端」とは、`U-50`（`Row Area`）の
    // 上端をいう（MUST）」, and 表 T-221 の `LF-14` 「帯へ上げた行は
    // `LF-3` の連なりから除き、抜けた場所は詰める」.
    //
    // ⭐ SO THE BAND IS THE BOX THE SHELL HANDS OVER, and this unit's rule is
    // the one that does not move: SC-1 of 表 T-031 gives it `rowBoxes` and it
    // measures nothing of its own. The fixture below is the picture FR-098
    // describes -- `g3` measured at the top of the Row Area although its natural
    // place is third -- and the case asks that the panel repeats THAT box.
    // ⛔ A unit that re-derived a natural place would answer `boxAt(2)`.
    const inTheBand = { x: 0, y: 0, width: 400, height: 24 }
    const session = sessionWith({
      rowBoxes: [
        { groupId: 'g3', box: inTheBand },
        { groupId: 'g1', box: boxAt(1) },
        { groupId: 'g2', box: boxAt(2) },
      ],
    })
    const panel = panelOf(threeRows, session, panelWith({ pinnedGroupIds: ['g3'] }))

    expect(titleOf(panel, 'g3').box).toEqual(inTheBand)
    expect(titleOf(panel, 'g3').box, 'FR-098: the pinned row is not drawn at its natural place')
      .not.toEqual(boxAt(2))
  })

  it('ignores a pinned id that names no drawn row at all', () => {
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['gone', 'g2'] }))

    expect(idsOf(panel.pinnedTitles)).toEqual(['g2'])
    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
  })
})

describe('UF-63 -- FR-004 / S-125: how deep a row sits', () => {
  it('calls a root row depth 1', () => {
    expect(deepestTitle(1, 'a').depth).toBe(1)
  })

  it('counts the `parentId` chain', () => {
    const panel = chainPanel(3, 'a')

    expect([1, 2, 3].map((oneDivider) => titleOf(panel, `g${oneDivider}`).depth)).toEqual([1, 2, 3])
  })

  it('stops at `maxGroupDepth`, which S-125 holds', () => {
    // FR-004 caps the hierarchy at S-125, and the published type says the same:
    // "Depth 1 is a root row. FR-004 caps it at `maxGroupDepth` (S-125)".
    const panel = chainPanel(5, 'a', panelWith({ maxGroupDepth: 3 }))

    expect([1, 2, 3, 4, 5].map((oneDivider) => titleOf(panel, `g${oneDivider}`).depth)).toEqual([1, 2, 3, 3, 3])
  })

  it('follows the cap when it moves, rather than holding a number of its own', () => {
    const atFive = chainPanel(5, 'a', panelWith({ maxGroupDepth: 5 }))
    const atThree = chainPanel(5, 'a', panelWith({ maxGroupDepth: 3 }))

    expect(titleOf(atFive, 'g5').depth).toBe(5)
    expect(titleOf(atThree, 'g5').depth).toBe(3)
  })

  it('keeps a pinned row at the depth its hierarchy gives it', () => {
    // FR-098 moves where a pinned row is DRAWN. It does not reparent it, and
    // AT-52 is the only thing depth is made of.
    const panel = chainPanel(3, 'a', panelWith({ pinnedGroupIds: ['g3'] }))

    expect(titleOf(panel, 'g3').depth).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// ⛔ THE CASES BELOW WERE REWRITTEN TWICE, AND THE SECOND TIME REVERSED THE
// FIRST. CR-307 and CR-309 (2026-08-30) closed table T-051 with two sentences,
// and both of them move an expected value here:
//
//   ⛔ 「`HF-2` / `HF-3` / `HF-10` / `HF-11` / `HF-12` が対象とするのは、いま
//      描かれている行である（MUST）。描かれていない行の畳みを数えてはならない
//      （MUST NOT）」—— 「`HR-1a` は畳んだ行の配下を描かないので、そこに残る状態を
//      数えると、押しても絵の動かない操作子が構えることになる」
//   ⛔⛔ 「その操作で、描かれる行が 1 行も増減しないときは、対象が 1 つも無いものと
//      して扱うこと（MUST）」——「畳む相手が描かれていても、その相手が配下を持たな
//      ければ、畳んで隠れる行は 1 つも無い。」⭐ 「数えるのは配下の行の数ではなく、
//      その操作の前後で描かれる行の差である。」
//
// ⭐ THE SECOND SENTENCE IS THE ONE THAT IS EASY TO MISS, and it is why so many
// expected values below are `false`: a control may have a row to act on and
// still be spent, because acting on it would not move one row on or off the
// screen. A subtree of drawn leaves is the plainest case -- folding every one of
// them hides nothing.
//
// What each control is FOR is unchanged, and is what decides which rows the
// difference is measured over:
//
//   HF-2 (MUST) 「開く操作子は、その行の配下をすべて開くこと」 -- HR-3 of table
//        T-015. The picture grows by the rows a fold below this one is hiding,
//        so the control is armed exactly where a DRAWN row under this one is
//        folded over something.
//   HF-3 (MUST) 「閉じる操作子は、その行自身を畳むこと」 -- HR-5. The picture
//        shrinks by this row's own drawn descendants, so the control is armed
//        exactly where this row has one.
//   HF-11 (MUST) 「配下をすべて閉じる操作子は、その行の配下をすべて畳むこと」 --
//        HR-4, and ⛔ 「その行自身を畳んではならない（MUST NOT）」. The picture
//        shrinks by what the rows UNDER this one are showing, so a subtree with
//        no grandchild drawn arms nothing.
//   HF-7 (MUST NOT) 「人が畳んだ状態は、表示量の増減（`FR-018`）より優先する。
//        人の指定を倍率が上書きしてはならない」. The zoom never writes AT-56, so a
//        row the group level of detail stopped drawing is still an OPEN row --
//        and, because the closing rule counts the DRAWN rows, a fold there moves
//        nothing and the control is spent while the zoom hides it.
//
// ⚠️ HR-1a is not broken by reading AT-56 here. It governs what is DRAWN under a
// folded row -- 「配下の行と、その行に載っている `Task` を描いてはならない」 -- and
// this unit draws neither; the controls themselves are drawn only while the
// pointer is on the row's name (HF-6), so they are not the resting picture the
// MUST holds level.
//
// ⚠️ tests/unit/uf-30-31.test.ts already holds the other half of this seam and
// was not touched: IC-58 asks for a write only where a DESCENDANT carries the
// fold, and its case quotes HF-3 「畳んだ行は、1 つ上の行の開く操作子が開く」 and
// HF-10 for why the pressed row is never itself opened.
//
// ⚠️ WHICH ROWS ARE DRAWN IS `rowBoxes`, AND NOTHING ELSE HERE. SC-1 of table
// T-031 gives this unit the drawn roster and no way to measure one of its own,
// so 「いま描かれている行」 is exactly the set `drawn(...)` names below.
// ---------------------------------------------------------------------------

/** The closing rule of table T-051, read out of the manuscript rather than typed. */
const T_051_CLOSING = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

describe('UF-63 -- table T-051: the three controls of the expander', () => {
  const kid = (id: string, part: Record<string, unknown> = {}): TaskGroup =>
    groupOf({ id, parentId: 'p', label: id, ...part })

  /** A row deeper than a child, so "one level" and 配下 cannot answer alike. */
  const under = (parentId: string, id: string, part: Record<string, unknown> = {}): TaskGroup =>
    groupOf({ id, parentId, label: id, ...part })

  /** A parent with `children` under it; `drawnIds` is what the shell drew. */
  const parentTitle = (
    children: readonly TaskGroup[],
    drawnIds: readonly string[],
    part: Record<string, unknown> = {},
  ): RowTitle =>
    titleOf(
      panelOf(
        scheduleOf([groupOf({ id: 'p', label: 'parent', ...part }), ...children]),
        drawn(...drawnIds),
      ),
      'p',
    )

  it('⛔ the manuscript still closes table T-051 with the two sentences these cases read', () => {
    // ⛔ WITHOUT THIS, A TABLE THAT WENT BACK TO COUNTING THE WHOLE ROSTER WOULD
    // LEAVE EVERY EXPECTED VALUE BELOW ASSERTING THE OPPOSITE OF THE
    // SPECIFICATION, and nothing would say so.
    expect(T_051_CLOSING).toContain(
      '描かれていない行の畳みを数えてはならない（MUST NOT）',
    )
    expect(T_051_CLOSING).toContain(
      'その操作で、描かれる行が 1 行も増減しないときは、対象が 1 つも無いものとして扱うこと（MUST）',
    )
    expect(T_051_CLOSING).toContain(
      '数えるのは配下の行の数ではなく、その操作の前後で描かれる行の差である',
    )
  })

  it('⭐ gives a row nothing sits under the same three controls, with none of them armed (HF-1 「各行に」, FR-029 薄く描く)', () => {
    // ⛔⛔ THIS CASE USED TO READ 「gives no expander to a row nothing sits
    // under」 AND ASSERT `null`. That was a reading of the seam and not of the
    // manuscript, and 表 T-051 decides against it three times over:
    //
    //   `HF-1`: 「行見出しパネルの**各行**に、開く操作子と、その行自身を
    //     閉じる操作子と、配下をすべて閉じる操作子を 1 つずつ置く。」
    //     —— 各行, with no exception carved for a childless one.
    //   `FR-029`: 「**その入口を押しても、いま文書にも画面にも何も変えられない
    //     ときは、その入口を薄く描くこと（MUST）。**」 and 「⚠️ **本規則は
    //     …表 T-109 の全行に当たる** —— 行の操作子もパレットもヘッダーも
    //     同じである。**載る面によって薄くしない入口があってはならない（MUST NOT）。**」
    //   The closing paragraph under 表 T-051: 「⛔ **その操作で、描かれる行が
    //     1 行も増減しないときは、対象が 1 つも無いものとして扱うこと（MUST）**」
    //     —— 対象が 1 つも無い is a STATE OF THE THREE, which FR-029 then
    //     draws faint. It is not an absence of them.
    //
    // ⭐ AND 表 T-233 IS WHAT MAKES THE DIFFERENCE VISIBLE: `RS-28`「配下に、開ける
    // 行が 1 つも無い」(正: `HF-2`) and `RS-29`「配下に、畳める行が 1 つも無い」
    // (`HF-11`) are the reasons a press on each spent control tells. ⛔ A row
    // that carried no control at all could never raise one of them, which is the
    // 「引き金が消える」 FR-029 names.
    // ⚠️ `RS-30` IS NOT ONE OF THEM ANY MORE. Its 正 moved to `HF-13` on
    // 2026-08-31 and it now reads 「その行は畳まれておらず、隠れている子も無い」 --
    // the one-level opener, which `RowTitle.canOpenOneLevel` carries and this
    // member does not.
    expect(parentTitle([], ['p']).expander).toEqual({
      canOpen: false,
      // ⭐⭐ ARMED, AND THIS IS THE HALF THE RULING OF 2026-08-30 MOVED. `HF-3`
      // no longer folds the row -- 「**隠す操作子は、その行を隠すこと（MUST）**
      // —— 表 T-015 の `HR-6` である」 -- and this row IS drawn, so hiding it
      // takes one row off the screen. The closing paragraph's test is 「その操作
      // で、描かれる行が 1 行も増減しないとき」, and here it does: by one, itself.
      // ⛔ THE OLD READING WAS `false` BECAUSE `HF-3` WAS `HR-5` (fold myself),
      // which a childless row could not do anything visible with.
      canClose: true,
      canCloseBelow: false,
    })
  })

  it('spends only the opening control while nothing under the row is folded', () => {
    // ⛔⛔ THE CLOSING-BELOW HALF OF THIS CASE READ `false` AND THE REWRITE OF
    // 2026-08-31 REVERSED IT (利用者の指示「サンプルと同じ動作にしろ」). What it
    // was written against was `HR-4` as 「配下をすべて閉じる」, under which folding
    // `c1` and `c2` -- two drawn leaves -- moved no row. `HR-4` now folds the
    // PRESSED row: 「**選択した `TaskGroup` を畳むこと（MUST）**」 —— ⇒ 「**その
    // 直下の子から下が描かれなくなる**」, and the row records the defect the old
    // reading was: 「⚠️ **実測で、押しても直下の子が描かれたまま残り、見本では
    // 消えた**」.
    // ⭐ SO THE QUESTION IS THIS ROW'S OWN DRAWN CHILDREN, and `p` has two.
    // Pressing HF-11 on `p` takes `c1` and `c2` off the picture, which is the
    // 「その操作の前後で描かれる行の差」 the closing rule under 表 T-051 counts.
    //
    // ⭐ HF-2 IS STILL SPENT: `HR-3` clears fold and hiding from `p` and its
    // 配下, and `p` is open, neither child is folded, and none is hidden -- so
    // 「その行が抱えている畳み込みが 0 のとき」 (HF-2) holds.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: false }), kid('c2', { isCollapsed: false })],
        ['p', 'c1', 'c2'],
      ).expander,
    ).toEqual({
      canOpen: false,
      canClose: true,
      canCloseBelow: true,
    })
  })

  it('arms the closing-below control only where a fold would take a row off the screen', () => {
    // ⭐ `HR-4` (MUST) folds `p` ITSELF, so the row that leaves the picture is
    // `p`'s direct child `c1`, and `g1` under it goes with it (`HR-1a`).
    // ⛔ WITHOUT A PAIR THAT ANSWERS `false`, A UNIT THAT ALWAYS SAID `true`
    // WOULD PASS. The three that give it are the childless row at the head of
    // this describe, the row the display amount emptied (HF-7), and the row that
    // is folded already -- each of them draws no child of its own.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: false }), under('c1', 'g1')],
        ['p', 'c1', 'g1'],
      ).expander,
    ).toEqual({ canOpen: false, canClose: true, canCloseBelow: true })
  })

  it('does not arm any control against the display amount (HF-7)', () => {
    // The children are absent because the group level of detail stopped drawing
    // them (FR-018), not because anyone folded them: AT-56 says `false` on both.
    // HF-7 gives the person's fold priority over the display amount and forbids
    // the zoom to overwrite what the person said, so the zoom never wrote AT-56
    // -- and HR-3, which is all HF-2 does, would open nothing here.
    //
    // ⛔ THE CLOSING-BELOW SIDE IS SPENT IN THE SAME BREATH, WHICH IS WHAT
    // CR-309 REVERSED. Folding what is under this row would hide nothing,
    // because the zoom is already drawing nothing there: 「その操作で、描かれる行
    // が 1 行も増減しないときは、対象が 1 つも無いものとして扱うこと（MUST）」.
    // ⚠️ HF-7 is untouched by that -- the fold this control would write still
    // outranks the zoom the moment the zoom draws those rows again; the control
    // simply has no picture to move while they are hidden.
    // ⭐ THE HIDE IS ARMED WHATEVER THE ZOOM IS DOING, because `HF-3` is now
    // 表 T-015 の `HR-6` (「行を隠す」) and this row is on the screen. ⛔ Reading
    // it as spent here would be reading the zoom's picture for a rule that is
    // about THIS row, which is drawn.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: false }), kid('c2', { isCollapsed: false })],
        ['p'],
      ).expander,
    ).toEqual({ canOpen: false, canClose: true, canCloseBelow: false })
  })

  it('offers all three at once -- HF-1 is a lattice, not one control in three states', () => {
    // HF-2 is `HR-3` (fold and hiding off `p` and its 配下), HF-3 is `HR-6` (hide
    // `p`) and HF-11 is `HR-4` (fold `p`): three different writes on one row, so
    // any of them can be spent while the others are not.
    // ⭐ HERE ALL THREE HAVE WORK -- `c1` is drawn and carries a fold over `g1`
    // for the opener, `p` is drawn for the hide, and `c1` is `p`'s drawn child
    // for the fold.
    //
    // ⛔⛔ `canCloseBelow` READ `false` UNTIL THE REWRITE OF 2026-08-31, on the
    // retired reading that HF-11 folded the rows BELOW `p` and so had only the
    // already-folded `c1` to write. `HR-4` (MUST) is now 「**選択した `TaskGroup`
    // を畳むこと**」 —— ⇒ 「**その直下の子から下が描かれなくなる**」, and `c1` is
    // exactly that direct child.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: true }), under('c1', 'g1')],
        ['p', 'c1'],
        { isCollapsed: false },
      ).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      canCloseBelow: true,
    })
  })

  it('arms the opening control for a fold TWO levels down (HF-2 is HR-3)', () => {
    // 「その行の配下をすべて開くこと（MUST）」 is every row under this one, however
    // deep. ⚠️ 「1 段だけ開く」 was the rule until 2026-08-25, and HF-2 itself
    // records that it was retired because nothing then re-opened what HF-3 had
    // folded. A row whose own children are all drawn is therefore still openable
    // while a GRANDCHILD carries the fold.
    expect(
      parentTitle(
        [
          kid('c1', { isCollapsed: false }),
          under('c1', 'g1', { isCollapsed: true }),
          under('g1', 'g1a'),
        ],
        ['p', 'c1', 'g1'],
        { isCollapsed: false },
      ).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      // ⭐ ARMED HERE, AND SPENT TWO CASES ABOVE. HF-11 folds `c1`, which is
      // showing `g1` -- so this fold does take a row off the screen.
      canCloseBelow: true,
    })
  })

  it('ARMS the opener on a row that is folded ITSELF, spends the fold, and keeps the hide (HF-2, HF-11, HF-3)', () => {
    // ⛔⛔ `canOpen` READ `false` HERE UNTIL THE REWRITE OF 2026-08-31 (利用者の
    // 指示「サンプルと同じ動作にしろ」), on the reading that a row's own opener
    // reached 配下 and never the row. `HR-3` (MUST) now says the opposite in as
    // many words: 「**選択した `TaskGroup` と、その配下のすべてから、畳みと隠しを
    // 取り除くこと（MUST）**」／「⭐⭐ **その行自身の畳みも解くこと（MUST）** ——
    // **`HR-4` が畳むのはその行自身なので、解く側が同じ行を解かなければ対になら
    // ない**」. ⇒ pressing HF-2 on `p` takes `p`'s own fold off and `c1` comes
    // back, so the 「その操作の前後で描かれる行の差」 is one and not none.
    // ⚠️ HF-10 still exists for the reason it always did -- a row's opener
    // reaches its own subtree and never 段 0 above it (`HF-10`).
    //
    // ⛔ THE FOLD IS SPENT: `HR-4` folds `p`, which is folded already, and
    // `HR-1a` is drawing no child of `p` for the press to take away --
    // 「⛔ **描かれていない行の畳みを数えてはならない（MUST NOT）** —— そこに残る
    // 状態を数えると、押しても絵の動かない操作子が構えることになる」.
    //
    // ⭐⭐ THE HIDE IS STILL ARMED, AND THAT IS THE 2026-08-30 RULING. `HF-3` is
    // 表 T-015 の `HR-6` -- 「**隠す操作子の職務は 表 T-015 の `HR-6` である
    // （MUST）**」 -- and a row that folded itself is still ON the screen, so
    // hiding it takes it off.
    expect(
      parentTitle([kid('c1', { isCollapsed: false })], ['p'], { isCollapsed: true }).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      canCloseBelow: false,
    })
  })

  it('⭐⭐ ARMS the opening control for a hidden child (HR-6 through HF-2, 裁定 2026-08-31)', () => {
    // ⛔⛔ THIS CASE ASSERTED `canOpen: false` UNTIL THE RULING OF 2026-08-31 AND
    // THE RULING REVERSED IT. What it was written against was HR-6 as it stood on
    // 2026-08-30, whose only way back was 表 T-051 の `HF-13` -- one level, and a
    // row `RowExpander` does not carry. HR-6 now names the second door as well:
    //
    //   ⭐⭐ 「**「配下をすべて開く」操作子でも戻せること（MUST）**（利用者の裁定
    //   2026-08-31）—— 同表の `HF-2` であり、**違いは範囲だけである** —— **1 本は
    //   直下の子だけ、2 本は配下のすべて。**」
    //
    // and HR-3, which HF-2 is:
    //
    //   ⭐⭐ 「**`HR-6` が隠した行も、配下のどこにあろうともすべて戻すこと（MUST）**
    //   …⛔ **畳みだけを解いて隠しを残してはならない（MUST NOT）**」
    //
    // ⭐ SO THE PRESS NOW MOVES THE PICTURE, AND THAT IS WHAT ARMS IT. The closing
    // rule under 表 T-051 settles which of its two sentences governs here: 「⭐
    // **数えるのは配下の行の数ではなく、その操作の前後で描かれる行の差である。**」
    // Pressing HF-2 on `p` brings `c1` back and `g1` with it, so the difference is
    // two rows and not none.
    // ⛔ 「描かれていない行の畳みを数えてはならない（MUST NOT）」 IS NOT THIS. That
    // sentence forbids counting the FOLD that remains on a row HR-1a is already not
    // drawing -- a state whose undoing moves nothing -- and its reason says so:
    // 「そこに残る状態を数えると、押しても絵の動かない操作子が構えることになる」.
    // A hidden row is the opposite case: undoing it is exactly what puts a row on
    // the screen.
    // ⛔ AND A SPENT CONTROL COULD NOT SATISFY THE MUST AT ALL. FR-029 (MUST) has a
    // faint entrance answer a press with a REASON rather than the action -- 「押さ
    // れたときに限り、行えない理由を通知すること（MUST）」 -- so a dimmed HF-2 is a
    // HF-2 that never brings the row back, and HR-6 requires that it does.
    // ⭐ `canClose` is the row `p`'s OWN hide, and `p` is drawn.
    expect(
      parentTitle(
        [kid('c1', { isHidden: true, isCollapsed: true }), under('c1', 'g1')],
        ['p'],
        { isCollapsed: false },
      ).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      // ⛔ STILL SPENT, and the hide is not what spends it: `p` draws no row below
      // itself at all, so HF-11 folds nothing and the picture does not move.
      canCloseBelow: false,
    })
  })

  it('arms it for the same child once the shell draws it', () => {
    // ⭐ THE PAIR THAT MAKES THE CASE ABOVE A TEST, AND THE ONE `isHidden` MOVES.
    // ⚠️ THE DRAWN SET MOVES WITH IT, and it has to: HR-6 (MUST NOT) forbids
    // drawing a hidden row at all, so a fixture that hid `c1` AND drew it would
    // be asking this unit about a screen the specification does not admit.
    expect(
      parentTitle(
        [kid('c1', { isHidden: false, isCollapsed: true }), under('c1', 'g1')],
        ['p', 'c1'],
        { isCollapsed: false },
      ).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      // ⭐ AND THE FOLD MOVED WITH THE DRAWN SET, which is what makes this the
      // pair of the case above rather than a copy of it: `c1` is `p`'s direct
      // child and it is now IN the picture, so `HR-4` on `p` takes it away
      // (「**その直下の子から下が描かれなくなる**」). ⛔ It read `false` while
      // HF-11 meant 「配下をすべて畳む」 and `c1` was folded already.
      canCloseBelow: true,
    })
  })

  it('arms all three where a hidden sibling is the only row left out', () => {
    // ⛔⛔ THE OPENING HALF OF THIS CASE READ `false` UNTIL 2026-08-31. HR-3
    // (MUST): 「`HR-6` が隠した行も、配下のどこにあろうともすべて戻すこと」, so
    // `c2` -- hidden, and a row of `p`'s 配下 -- is work for `p`'s HF-2, and the
    // press moves one row into the picture.
    //
    // ⛔⛔ AND THE CLOSING-BELOW HALF READ `false` ON THE RETIRED READING TOO,
    // which asked whether the rows UNDER `p` had anything to fold: `c1` is a
    // drawn leaf, so folding it moved nothing. `HR-4` (MUST) folds `p` itself
    // since 2026-08-31, and `c1` is `p`'s drawn direct child -- so the press
    // does take a row off the screen after all.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: false }), kid('c2', { isHidden: true, isCollapsed: false })],
        ['p', 'c1'],
      ).expander,
      // ⭐ HF-3 hides `p`, which is drawn, so that one is armed on its own
      // account -- 「描かれている行はいつでも隠せるので、本操作子を薄く描く場面は
      // 無い」 (`HF-3`).
    ).toEqual({ canOpen: true, canClose: true, canCloseBelow: true })
  })

  it('⛔ the manuscript still sends a hidden row back through HF-2 as well as HF-13', () => {
    // ⛔⛔ THE PREMISE THE TWO CASES ABOVE WERE REWRITTEN ON. Without it, a table
    // that went back to the 2026-08-30 reading would leave both of them asserting
    // the opposite of the specification and nothing would say so -- which is
    // exactly what happened to them between 2026-08-30 and 2026-08-31.
    const hr6 = (specTable('T-015').rows.find((one) => one.id === 'HR-6')?.cells ?? []).join(' ')
    const hr3 = (specTable('T-015').rows.find((one) => one.id === 'HR-3')?.cells ?? []).join(' ')

    expect(hr6).toContain('「配下をすべて開く」操作子でも戻せること（MUST）')
    expect(hr6).toContain('違いは範囲だけである')
    expect(hr3).toContain('`HR-6` が隠した行も、配下のどこにあろうともすべて戻すこと（MUST）')
    expect(hr3).toContain('畳みだけを解いて隠しを残してはならない（MUST NOT）')
  })
})

describe('UF-63 -- FR-085: the name is cut to the width the panel leaves', () => {
  it('carries a name that fits, whole and unmarked', () => {
    const title = deepestTitle(1, 'alpha')

    expect(title.label).toBe('alpha')
    expect(title.isLabelTruncated).toBe(false)
  })

  it('cuts the TAIL and closes it with `…` (FR-085, MUST)', () => {
    // 「末尾を打ち切り、`…` を置くこと（MUST）」. The mark is the requirement's
    // own character, so it is written here rather than named from `src/`. What
    // stands before it is the FRONT of the name -- the tail is what went.
    const title = deepestTitle(1, LONG)
    const shown = title.label ?? ''

    expect(shown.endsWith(MARK)).toBe(true)
    expect(LONG.startsWith(shown.slice(0, -MARK.length))).toBe(true)
    expect(shown).not.toBe(LONG)
    expect(title.isLabelTruncated).toBe(true)
  })

  it('⛔ shows no whole name anywhere on the row (FR-085, MUST NOT)', () => {
    // 「その全文を説明として出してはならない（MUST NOT）」. The whole name is on
    // the title as `wholeLabel` -- it has to be, or the panel could not tell
    // whether it cut -- but nothing the row shows may carry it. The one thing a
    // row shows is `label`, and after a cut that is not the whole name.
    const title = deepestTitle(1, LONG)

    expect(title.wholeLabel).toBe(LONG)
    expect(title.label).not.toBe(LONG)
    expect(title.label ?? '').not.toContain(LONG)
    // 全文を見たい者はパネルを広げる（`FR-052`）-- and widening it is the ONLY
    // thing that brings the whole name back, so the same name against a panel
    // wide enough is shown whole and unmarked.
    const widened = deepestTitle(1, LONG, panelWith({ rowTitlePanelWidth: 100000 }))
    expect(widened.label).toBe(LONG)
    expect(widened.isLabelTruncated).toBe(false)
  })

  it('keeps the longest name that fits and cuts the next one', () => {
    const kept = keptOf(PANEL, 1)
    const fits = 'x'.repeat(kept)
    const overflows = 'x'.repeat(kept + 1)

    const atFit = deepestTitle(1, fits)
    const over = deepestTitle(1, overflows)

    expect(atFit.label).toBe(fits)
    expect(atFit.isLabelTruncated).toBe(false)
    expect(over.isLabelTruncated).toBe(true)
    expect(over.label ?? '').toMatch(/^x*…$/)
    // ⛔ The cut name may not be WIDER than the name that only just fits: the
    // width FR-085 fixes is the panel's, and the mark is shown inside it.
    expect((over.label ?? '').length).toBeLessThanOrEqual(fits.length)
  })

  it('marks the cut exactly when the name it shows is not the name it was given', () => {
    // FR-085 (MUST): what was cut is shown whole in a tooltip. UF-69 raises
    // that tooltip off this flag, so the flag has to mean precisely this.
    const kept = keptOf(PANEL, 1)

    for (const label of ['a', 'x'.repeat(kept), 'x'.repeat(kept + 1), LONG]) {
      const title = deepestTitle(1, label)
      expect(title.isLabelTruncated, `for a name of ${label.length}`).toBe(title.label !== label)
    }
  })

  it('widens the room for the name when S-79 widens (`rowTitlePanelWidth`)', () => {
    // 40px more panel is exactly 4 more half-width characters under PANEL, and
    // that difference holds whatever room the controls take -- FR-085 forbids
    // that room to follow anything this case varies.
    expect(keptOf(panelWith({ rowTitlePanelWidth: 440 }), 1) - keptOf(PANEL, 1)).toBe(4)
  })

  it('takes one step of S-37 (`rowTitleIndent`) off for each step of depth', () => {
    // FR-085: the width is the panel less the indent FOR ITS DEPTH. One step is
    // 20px, which is exactly 2 half-width characters under PANEL.
    expect(keptOf(PANEL, 1) - keptOf(PANEL, 2)).toBe(2)
    expect(keptOf(PANEL, 2) - keptOf(PANEL, 3)).toBe(2)
    expect(keptOf(PANEL, 1) - keptOf(PANEL, 3)).toBe(4)
  })

  it('estimates with S-30 (`labelCoef`), so doubling it halves what 40px buys', () => {
    const half = panelWith({ labelCoef: 0.5 })
    const whole = panelWith({ labelCoef: 1 })

    expect(keptOf(settingsOf({ ...half, rowTitlePanelWidth: 440 }), 2) - keptOf(half, 2)).toBe(4)
    expect(keptOf(settingsOf({ ...whole, rowTitlePanelWidth: 440 }), 2) - keptOf(whole, 2)).toBe(2)
  })

  it('estimates with S-36 (`rowTitleFont`), so doubling it halves what 40px buys', () => {
    const small = panelWith({ rowTitleFont: 20 })
    const large = panelWith({ rowTitleFont: 40 })

    expect(keptOf(settingsOf({ ...small, rowTitlePanelWidth: 440 }), 2) - keptOf(small, 2)).toBe(4)
    expect(keptOf(settingsOf({ ...large, rowTitlePanelWidth: 440 }), 2) - keptOf(large, 2)).toBe(2)
  })

  it('applies S-38 (`rowTitleTopScale`) at depth 1 and nowhere else', () => {
    // K-38 of table T-104 settles that key as the scale of a DEPTH 1 row's
    // name. So doubling it must move the depth 1 cut and leave depth 2 alone.
    const plain = panelWith({ rowTitleTopScale: 1 })
    const scaled = panelWith({ rowTitleTopScale: 2 })

    expect(keptOf(scaled, 2)).toBe(keptOf(plain, 2))
    expect(keptOf(scaled, 1)).toBeLessThan(keptOf(plain, 1))
    expect(keptOf(settingsOf({ ...scaled, rowTitlePanelWidth: 440 }), 1) - keptOf(scaled, 1)).toBe(2)
  })

  it('counts a full-width character as 2 and a half-width one as 1 (FR-093)', () => {
    // The one non-ASCII literal in this file. FR-093 states the rule in terms
    // of full-width and half-width characters, so the case cannot be written
    // without one of each -- this is rule 03's stated exception, code that
    // handles Japanese itself.
    const inHalf = keptOf(PANEL, 1)
    const inFull = (() => {
      for (let length = 1; length <= 400; length += 1) {
        if (deepestTitle(1, '字'.repeat(length)).isLabelTruncated) return length - 1
      }
      throw new Error('no full-width name of any length was cut by this panel')
    })()

    expect(inFull).toBe(Math.floor(inHalf / 2))
  })

  it('MUST NOT measure a glyph: two half-width names of one length cut alike', () => {
    // FR-093 forbids measuring the real size of a character and forbids keeping
    // a measurement. A narrow letter and a wide one are the same 1 unit, so a
    // panel that measured would keep more of the narrow one.
    const narrow = deepestTitle(1, 'i'.repeat(400))
    const wide = deepestTitle(1, 'W'.repeat(400))

    expect((narrow.label ?? '').length).toBe((wide.label ?? '').length)
  })

  it('MUST NOT cut by `truncateUnits` (S-35)', () => {
    // FR-085 says so in as many words: S-35 is the preprocessing FR-002 does
    // when a name label will not fit a TASK, and this rule is decided by the
    // PANEL's width. Moving S-35 across its whole range must move nothing.
    const atFloor = panelWith({ truncateUnits: 4 })
    const atCeiling = panelWith({ truncateUnits: 120 })

    expect(keptOf(atFloor, 1)).toBe(keptOf(atCeiling, 1))

    // A name longer than S-35's floor but well inside the panel stays whole.
    const name = 'x'.repeat(8)
    const title = deepestTitle(1, name, atFloor)

    expect(title.label).toBe(name)
    expect(title.isLabelTruncated).toBe(false)
  })

  it('MUST NOT change the room kept for the controls with whether they are drawn (FR-085)', () => {
    // FR-085: the export draws no row control (EP-4 of table T-076), so a room
    // that followed the controls would cut one and the same name in two places.
    // A row with an expander, a leaf row and a pinned leaf all sit at depth 1
    // here, so the expander's presence and the pin's state both move.
    // ⚠️ THE VARYING CONDITION HAD TO BE DEEPENED ON 2026-08-30. It used to be
    // 「a row with a child」 against 「a row with none」, and that stopped varying
    // the day `HF-3` became 表 T-015 の `HR-6` (「行を隠す」): every DRAWN row can
    // be hidden, so `canClose` is now true on both and a childless row's
    // expander reads exactly like a parent-of-a-leaf's. ⭐ A GRANDCHILD is what
    // still varies one of the three -- `HF-11` folds `kid`, which is showing
    // `grandKid`, so that fold really does take a row off the screen.
    const groups = [
      groupOf({ id: 'withKid', label: LONG }),
      groupOf({ id: 'kid', parentId: 'withKid', label: 'k' }),
      groupOf({ id: 'grandKid', parentId: 'kid', label: 'g' }),
      groupOf({ id: 'leaf', label: LONG }),
      groupOf({ id: 'pinnedLeaf', label: LONG }),
    ]
    const panel = panelOf(
      scheduleOf(groups),
      drawn('withKid', 'kid', 'grandKid', 'leaf', 'pinnedLeaf'),
      panelWith({ pinnedGroupIds: ['pinnedLeaf'] }),
    )

    // ⭐⭐ WHAT MAKES THE DRAWING DIFFER, NOW THAT EVERY ROW CARRIES THE SAME
    // SEVEN. This case used to vary 「a row that HAS an expander」 against 「a row
    // that has NONE」, and that second row is a state 表 T-051 の `HF-1` does not
    // admit (「各行に… 1 つずつ置く」). ⛔ The rule under test is unchanged and
    // is FR-085's: 「**確保する場所を、操作子を描くかどうかで変えてはならない
    // （MUST NOT）」, whose reason is that the export draws none of them (表 T-076
    // の `EP-4`) and 「変えると画面と書き出しで打ち切りの位置が食い違う」.
    // ⭐ SO THE VARYING CONDITION IS NOW THE TWO THE MANUSCRIPT ITSELF NAMES AS
    // CHANGING WHAT IS DRAWN: whether a control is armed or spent -- FR-029
    // (MUST) draws a spent one 薄く, which is a different drawing of the same
    // control -- and whether the row is pinned, since HF-6 (MUST) draws a pinned
    // row's `IC-60` 「ポインタが乗っていなくても」 when the others are not drawn at all.
    // ⛔ IF THE THREE ROWS EVER STOP DIFFERING, this case has lost its variable and
    // proves nothing -- so the difference is asserted before the sameness is.
    const withKid = titleOf(panel, 'withKid')
    const leaf = titleOf(panel, 'leaf')
    const pinnedLeaf = titleOf(panel, 'pinnedLeaf')

    expect(
      withKid.expander,
      'the two rows are drawn alike, so this case no longer varies what is drawn',
    ).not.toEqual(leaf.expander)
    expect(pinnedLeaf.isPinned, 'the pinned row is not pinned, so HF-6 draws it like the rest').toBe(
      true,
    )
    expect(leaf.isPinned).toBe(false)

    // ⭐ AND THE ROOM DID NOT MOVE: one and the same name is cut at one and the
    // same place on all three.
    expect(leaf.label).toBe(withKid.label)
    expect(pinnedLeaf.label).toBe(withKid.label)
  })

  it('does not follow `fontScale` (S-70), which FR-039 carries to S-3 and S-2', () => {
    // FR-039 names the ruler's font and the ruler's height as what a reader's
    // font size reaches, and requires them to be independent keys. S-36 is a
    // key of its own and is not among them.
    const small = deepestTitle(1, LONG, panelWith({ fontScale: 'S' }))
    const large = deepestTitle(1, LONG, panelWith({ fontScale: 'L' }))

    expect(large.label).toBe(small.label)
  })
})

describe('UF-63 -- FR-058: a row that was given no name of its own', () => {
  it('shows the name of the `Task` it was derived from (MUST)', () => {
    // docs/spec/01-04-requirements.md:2965 (FR-058, MUST). IV-8 of Chapter 6.1
    // (docs/spec/05-07-design.md:697) and AT-54 make `label` and
    // `derivedFromTaskUid` never both null, so a row whose label is null always
    // has a Task to take its name from -- and the Row Title Panel is the one
    // place a row's name is shown (U-22 / U-23; EP-3 puts it in the export too).
    const groups = [groupOf({ id: 'g1', label: null, derivedFromTaskUid: 7 })]
    const tasks = [taskOf({ uid: 7, name: 'alpha' })]

    const title = titleOf(panelOf(scheduleOf(groups, tasks), drawn('g1')), 'g1')

    expect(title.label).toBe('alpha')
    expect(title.isLabelTruncated).toBe(false)
  })

  it('prefers the name the row carries when it has one', () => {
    const groups = [groupOf({ id: 'g1', label: 'chosen', derivedFromTaskUid: 7 })]
    const tasks = [taskOf({ uid: 7, name: 'derived' })]

    expect(titleOf(panelOf(scheduleOf(groups, tasks), drawn('g1')), 'g1').label).toBe('chosen')
  })

  it('answers null where neither the row nor its `Task` carries a name', () => {
    // AT-27 admits a Task with no name, so this is the one state that leaves
    // the panel with nothing to write.
    const groups = [groupOf({ id: 'g1', label: null, derivedFromTaskUid: 7 })]
    const tasks = [taskOf({ uid: 7, name: null })]

    const title = titleOf(panelOf(scheduleOf(groups, tasks), drawn('g1')), 'g1')

    expect(title.label).toBeNull()
    expect(title.isLabelTruncated).toBe(false)
  })
})

describe('UF-63 -- FR-085 (a): the drawing area does not select a row', () => {
  it('leaves every row unselected although things are selected', () => {
    // SL-1 of table T-023c leaves rows out of the drawing area's selection on
    // purpose, and FR-085 states in as many words that the panel's set is
    // another one. So `Selection` may not put a row into it.
    const picked = selectionWith(selectionWith(emptySelection(), { kind: 'task', uid: 1 }), {
      kind: 'statusLine',
    })

    const panel = chainPanelWithSelection(3, picked)

    expect(panel.titles.map((drawnText) => drawnText.isSelected)).toEqual([false, false, false])
  })

  it('answers the same panel whatever the drawing area holds selected', () => {
    const picked = selectionWith(emptySelection(), { kind: 'commentBox', id: 'cb1' })

    expect(chainPanelWithSelection(2, picked)).toEqual(
      chainPanelWithSelection(2, emptySelection()),
    )
  })
})

describe('UF-63 -- table T-075: the unit is `pure`', () => {
  it('writes to nothing it was handed (R7.1)', () => {
    const groups = [
      groupOf({ id: 'g1', label: LONG }),
      groupOf({ id: 'g2', parentId: 'g1', label: 'b' }),
      groupOf({ id: 'g3', label: 'c' }),
    ]
    const schedule = scheduleOf(groups)
    const settings = panelWith({ pinnedGroupIds: ['g3', 'g1'] })
    const session = drawn('g1', 'g2', 'g3')
    const before = JSON.stringify({ schedule, settings, session })

    panelOf(schedule, session, settings)

    expect(JSON.stringify({ schedule, settings, session })).toBe(before)
  })

  it('cuts the display only and never the data (FR-085)', () => {
    // Cutting the column would break the lossless round trip FR-021 requires.
    const schedule = scheduleOf([groupOf({ id: 'g1', label: LONG })])

    panelOf(schedule, drawn('g1'))

    expect(schedule.taskGroups[0]?.label).toBe(LONG)
  })

  it('answers the same value for the same values', () => {
    expect(chainPanel(3, LONG)).toEqual(chainPanel(3, LONG))
  })

  it('reads no member of the session but the one SC-1 gives it', () => {
    // UF-63's row of table T-075 gives it one member of `ScreenView` to fill.
    // Everything else the session carries belongs to the other eight units, so
    // moving all of it must not move this answer.
    const groups = [groupOf({ id: 'g1', label: 'a' }), groupOf({ id: 'g2', label: 'b' })]
    const schedule = scheduleOf(groups)
    const plain = drawn('g1', 'g2')
    const other: ScreenSession = {
      ...plain,
      language: 'en',
      openedFileName: null,
      fileSavedAt: null,
      isAgentApiEnabled: true,
      pointer: { x: 12, y: 34 },
      pointerRestedMs: 4000,
      commandPaletteAt: { x: 80, y: 90 },
      propertiesShowing: 'documentSettings',
      notices: [{ manner: 'NT-1', reason: 'refused', affectedCount: 2 }],
    }

    expect(panelOf(schedule, other)).toEqual(panelOf(schedule, plain))
  })
})

describe('UF-63 -- HF-5 of table T-051: the controls are LEVEL with the top of the name', () => {
  // HF-5 (MUST): 「名前が操作子より大きいときは、名前の上端に揃えること」. It
  // forbids centring them (MUST NOT) and ⛔ forbids setting them down from that
  // edge (MUST NOT), so there is no amount left for a row to state -- S-139 of
  // table T-206, which held one, is retired (利用者の裁定, 2026-08-25).
  //
  // ⚠️ WHERE the controls are drawn is the surface's answer and not this
  // unit's; what this unit must not do is hand a set-down down to it. So the
  // one case here is that no row carries one, whatever the name's size --
  // S-36 and S-38 of table T-201 are set apart below precisely so that a
  // set-down proportional to the name size would show up if one were made.
  it('hands no set-down down: no row carries one, pinned or not', () => {
    const hf5 = panelWith({ rowTitleFont: 20, rowTitleTopScale: 1.5, pinnedGroupIds: ['g2'] })
    const panel = chainPanel(5, 'a', hf5)

    expect(panel.titles.length + panel.pinnedTitles.length).toBe(5)
    for (const title of [...panel.titles, ...panel.pinnedTitles]) {
      expect(title).not.toHaveProperty('controlTopOffsetPx')
    }
  })

  it('S-139 of table T-206, which held the set-down, is retired', () => {
    expect(specTable('T-206').rows.find((row) => row.id === 'S-139')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Round 2. `ScreenSession.selectedGroupIds` now holds the set FR-085 (MUST)
// gives the panel, so the "nothing holds that set" note at the head of this
// file no longer describes the session. The cases in the block above --
// "FR-085 (a): the drawing area does not select a row" -- still stand: they say
// `Selection` may not reach a row, which SL-1 of table T-023c still forbids.
//
// The rules these cases answer to:
//   FR-085  the panel selects rows (MUST); SEVERAL at once, and the set can be
//           cleared. The set is NOT table T-023c's.
//   FR-098  a pinned row is the SAME row at another place -- the pin lifts it
//           out of the scrolling list, it does not make a second kind of row --
//           so whatever FR-085 says about a row holds for a pinned one.
//   FR-042  what a chosen row is chosen FOR: its colour and height go to the
//           properties panel. Read here only for the reason the set exists;
//           that panel itself is UF-64's answer.
//   FR-072  the same, on the other side of that seam.
// ---------------------------------------------------------------------------

/** The session of `drawn(...)`, with the rows FR-085 says a person chose. */
const chose = (session: ScreenSession, ...groupIds: readonly string[]): ScreenSession => ({
  ...session,
  selectedGroupIds: groupIds,
})

/**
 * Everything about a title except whether it was chosen.
 *
 * A case that means "choosing a row disturbs nothing else" has to compare all
 * of the rest, not the members it names: naming them is how such a case goes
 * green over a member added later.
 */
const exceptSelected = (title: RowTitle): Record<string, unknown> => {
  const rest: Record<string, unknown> = { ...(title as unknown as Record<string, unknown>) }
  delete rest.isSelected
  return rest
}

const restOf = (panel: RowTitlePanel): Record<string, unknown> => ({
  pinnedTitles: panel.pinnedTitles.map(exceptSelected),
  titles: panel.titles.map(exceptSelected),
})

describe('UF-63 -- FR-085 (b): the rows a person chose', () => {
  const schedule = scheduleOf([
    groupOf({ id: 'g1', label: 'first', order: 0 }),
    groupOf({ id: 'g2', label: 'second', order: 1 }),
    groupOf({ id: 'g3', label: 'third', order: 2 }),
  ])
  const session = drawn('g1', 'g2', 'g3')

  it('describes a row named in `selectedGroupIds` as chosen', () => {
    const panel = panelOf(schedule, chose(session, 'g2'))

    expect(titleOf(panel, 'g2').isSelected).toBe(true)
  })

  it('leaves a row that was not named unchosen', () => {
    const panel = panelOf(schedule, chose(session, 'g2'))

    expect(titleOf(panel, 'g1').isSelected).toBe(false)
    expect(titleOf(panel, 'g3').isSelected).toBe(false)
  })

  it('chooses SEVERAL rows at once (FR-085, MUST)', () => {
    const panel = panelOf(schedule, chose(session, 'g1', 'g3'))

    expect(panel.titles.map((drawnText) => drawnText.isSelected)).toEqual([true, false, true])
  })

  it('chooses every drawn row when every one of them was named', () => {
    const panel = panelOf(schedule, chose(session, 'g1', 'g2', 'g3'))

    expect(panel.titles.map((drawnText) => drawnText.isSelected)).toEqual([true, true, true])
  })

  it('clears the set: an empty `selectedGroupIds` chooses no row (FR-085)', () => {
    const panel = panelOf(schedule, chose(session))

    expect(panel.titles.map((drawnText) => drawnText.isSelected)).toEqual([false, false, false])
  })

  it('does not follow the order the ids arrived in', () => {
    const forwards = panelOf(schedule, chose(session, 'g1', 'g3'))
    const backwards = panelOf(schedule, chose(session, 'g3', 'g1'))

    expect(backwards).toEqual(forwards)
  })

  it('matches a row by its whole id and not by a leading part of it', () => {
    // `g1` and `g10` are two rows. Choosing the first must not choose the
    // second: FR-085 chooses ROWS, and AT-51 makes `TaskGroup.id` the name of
    // one of them.
    const two = scheduleOf([
      groupOf({ id: 'g1', label: 'first', order: 0 }),
      groupOf({ id: 'g10', label: 'tenth', order: 1 }),
    ])
    const panel = panelOf(two, chose(drawn('g1', 'g10'), 'g1'))

    expect(titleOf(panel, 'g1').isSelected).toBe(true)
    expect(titleOf(panel, 'g10').isSelected).toBe(false)
  })

  it('ignores an id that names no drawn row', () => {
    const panel = panelOf(schedule, chose(session, 'g9', 'g2'))

    expect(idsOf(panel.titles)).toEqual(['g1', 'g2', 'g3'])
    expect(panel.titles.map((drawnText) => drawnText.isSelected)).toEqual([false, true, false])
  })

  it('describes a row once when the set happens to hold its id twice', () => {
    // The shape S-126 is already tested for above: a set that names one row
    // twice still names one row.
    const panel = panelOf(schedule, chose(session, 'g2', 'g2'))

    expect(idsOf(panel.titles)).toEqual(['g1', 'g2', 'g3'])
    expect(panel.titles.map((drawnText) => drawnText.isSelected)).toEqual([false, true, false])
  })

  it('says chosen with a boolean, not with something merely truthy', () => {
    const panel = panelOf(schedule, chose(session, 'g2'))

    expect(typeof titleOf(panel, 'g2').isSelected).toBe('boolean')
    expect(typeof titleOf(panel, 'g1').isSelected).toBe('boolean')
  })
})

describe('UF-63 -- FR-098 with FR-085: a pinned row is chosen the same way', () => {
  // FR-098 lifts a pinned row out of the scrolling list and holds it at the
  // top. It is one row's other PLACE, not a second kind of row, so FR-085's
  // rule about choosing has to reach it there.
  const schedule = scheduleOf([
    groupOf({ id: 'g1', label: 'first', order: 0 }),
    groupOf({ id: 'g2', label: 'second', order: 1 }),
    groupOf({ id: 'g3', label: 'third', order: 2 }),
  ])
  const session = drawn('g1', 'g2', 'g3')
  const pinned = panelWith({ pinnedGroupIds: ['g2'] })

  it('describes a pinned row named in `selectedGroupIds` as chosen', () => {
    const panel = panelOf(schedule, chose(session, 'g2'), pinned)

    expect(idsOf(panel.pinnedTitles)).toEqual(['g2'])
    expect(titleOf(panel, 'g2').isSelected).toBe(true)
  })

  it('leaves a pinned row that was not named unchosen', () => {
    const panel = panelOf(schedule, chose(session, 'g1'), pinned)

    expect(titleOf(panel, 'g2').isSelected).toBe(false)
    expect(titleOf(panel, 'g1').isSelected).toBe(true)
  })

  it('chooses a pinned row and an unpinned one together', () => {
    const panel = panelOf(schedule, chose(session, 'g2', 'g3'), pinned)

    expect(panel.pinnedTitles.map((drawnText) => drawnText.isSelected)).toEqual([true])
    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
    expect(panel.titles.map((drawnText) => drawnText.isSelected)).toEqual([false, true])
  })

  it('still draws the chosen pinned row once (FR-098, MUST NOT draw it twice)', () => {
    const panel = panelOf(schedule, chose(session, 'g2'), pinned)

    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
  })

  it('answers the same for a chosen row whether or not it is pinned', () => {
    const asPinned = titleOf(panelOf(schedule, chose(session, 'g2'), pinned), 'g2')
    const asPlain = titleOf(panelOf(schedule, chose(session, 'g2'), PANEL), 'g2')

    expect(asPinned.isSelected).toBe(asPlain.isSelected)
  })
})

describe('UF-63 -- FR-085 (c): choosing rows disturbs nothing else', () => {
  // A scene with something of every answer in it: three depths, a name too
  // long to fit, a leaf, a pin, and a hidden row.
  const scene = scheduleOf([
    groupOf({ id: 'g1', label: LONG, order: 0 }),
    groupOf({ id: 'g2', parentId: 'g1', label: 'second', order: 1 }),
    groupOf({ id: 'g3', parentId: 'g2', label: 'third', order: 2 }),
    groupOf({ id: 'g4', label: 'fourth', order: 3 }),
    groupOf({ id: 'g5', parentId: 'g4', label: 'hidden', order: 4, isHidden: true }),
  ])
  const session = drawn('g1', 'g2', 'g3', 'g4')
  const settings = panelWith({ pinnedGroupIds: ['g3'] })

  it('leaves every other member of every title alone', () => {
    const none = panelOf(scene, chose(session), settings)
    const some = panelOf(scene, chose(session, 'g1', 'g3'), settings)

    expect(restOf(some)).toEqual(restOf(none))
  })

  it('leaves which rows are drawn, and where, alone', () => {
    const none = panelOf(scene, chose(session), settings)
    const some = panelOf(scene, chose(session, 'g2'), settings)

    expect(idsOf(some.titles)).toEqual(idsOf(none.titles))
    expect(idsOf(some.pinnedTitles)).toEqual(idsOf(none.pinnedTitles))
  })

  it('leaves the cut of a name that did not fit where it was', () => {
    const none = titleOf(panelOf(scene, chose(session), settings), 'g1')
    const some = titleOf(panelOf(scene, chose(session, 'g1'), settings), 'g1')

    expect(some.isLabelTruncated).toBe(true)
    expect(some.label).toBe(none.label)
    expect(some.wholeLabel).toBe(none.wholeLabel)
  })

  it('does not make a chosen row pinned, nor a pinned row chosen', () => {
    const panel = panelOf(scene, chose(session, 'g1'), settings)

    expect(titleOf(panel, 'g1').isPinned).toBe(false)
    expect(titleOf(panel, 'g3').isSelected).toBe(false)
  })

  it('writes to nothing it was handed while rows are chosen (R7.1)', () => {
    const chosen = chose(session, 'g1', 'g3')
    const before = JSON.stringify({ scene, settings, chosen })

    panelOf(scene, chosen, settings)

    expect(JSON.stringify({ scene, settings, chosen })).toBe(before)
  })

  it('answers the same value for the same chosen set', () => {
    expect(panelOf(scene, chose(session, 'g2', 'g4'), settings)).toEqual(
      panelOf(scene, chose(session, 'g2', 'g4'), settings),
    )
  })
})

// ===========================================================================
// THE TWO COUNTS, AND 段 0 -- 表 T-051 の `HF-12` / `HF-16` / `HF-18`, ruled on
// 2026-08-30.
//
// ⭐⭐ WHY THE PANEL NEEDED A LEVEL OF ITS OWN. `HR-2` of 表 T-015 (MUST) folds
// 「最も浅い段の行」 as well, and says why no row's own column can carry that:
// 「**行の畳みが隠すのはその配下であり、最も浅い段の行は親を持たないので誰にも
// 隠されない**」 ⇒ 「**段 0 そのものが畳まれてはじめて、行が 1 つも描かれない状態に
// なりうる**」. `S-211` of 表 T-206 holds it, and 「⛔ **保存しない** —— `S-99g` と
// 同じ立場であり、画面の状態であって日程の内容ではない」 -- so it arrives on the
// session and never on a `TaskGroup`.
//
// ⭐ AND THAT IS WHAT MAKES BOTH COUNTS MUSTS:
//   `HF-12` 「⭐ **そのときは、頭にいま何行を畳み込んでいるかを示すこと（MUST）**
//           —— ⛔ **示さないと、行が消えたのか畳まれたのかが読めない**」
//   `HF-18` 「**配下に畳み込んでいる行があるとき、その行数を行に示すこと（MUST）**
//           …⭐ **`HF-12` が段 0 について定めるものを、行について定めたもの**」
//
// ⛔ WHAT IS NOT ASSERTED HERE: how either count is DRAWN. `RowTitle` and
// `RowTitlePanel` carry numbers; the mark, its colour (表 T-236 の `S-153`) and
// its exemption from `HF-6` are the drawing side's and are held in
// tests/unit/uf-72-screen-part.test.ts.
// ===========================================================================

/** The sentences of 表 T-051 and 表 T-015 these cases are driven by. */
const T_051_HF12_THE_HEAD_COUNT = '頭にいま何行を畳み込んでいるかを示すこと（MUST）'
const T_051_HF18_THE_ROW_COUNT =
  '配下に畳み込んでいる行があるとき、その行数を行に示すこと（MUST）'
const T_015_HR2_MAY_EMPTY_THE_PANEL = '押すと行が 1 つも描かれない状態になりうる'
const T_015_HR6_BACK_THROUGH_THE_PARENT =
  '隠した行は、親の行の「配下を 1 階層開く」操作子で戻せること（MUST）'
const T_015_HR6_BACK_THROUGH_LEVEL_ZERO =
  '親を持たない最上位の行は、段 0 の同じ操作子で戻せること（MUST）'

/** A row, its two children and one grandchild -- three rows under `p`. */
const FAMILY = (part: Record<string, unknown> = {}): readonly TaskGroup[] => [
  groupOf({ id: 'p', label: 'parent', ...part }),
  groupOf({ id: 'c1', parentId: 'p', label: 'c1', order: 1 }),
  groupOf({ id: 'c2', parentId: 'p', label: 'c2', order: 2 }),
  groupOf({ id: 'g1', parentId: 'c1', label: 'g1', order: 3 }),
]

describe('UF-63 -- 表 T-051 HF-18 (MUST): how many rows a row is holding folded', () => {
  it('⛔ the manuscript still asks a row to show what it holds folded', () => {
    const hf18 = specTable('T-051').rows.find((one) => one.id === 'HF-18')
    expect(hf18, '表 T-051 no longer holds HF-18').toBeDefined()
    const says = (hf18?.cells ?? []).join(' ')
    expect(says).toContain(T_051_HF18_THE_ROW_COUNT)
    // ⭐ AND THAT IT IS THE SAME NUMBER HF-12 ASKS FOR ONE LEVEL UP, which is
    // what lets the two cases below be read side by side.
    expect(says).toContain('`HF-12` が段 0 について定めるものを、行について定めたもの')
  })

  it('⭐ MUST: a folded row shows every row it is holding away, however deep (配下)', () => {
    // ⛔ 配下 IS THE WHOLE SUBTREE AND NOT THE DIRECT CHILDREN. `HR-1a` (MUST)
    // 「畳んだ行の配下は、それ自身も畳まれた状態とすること」 and (MUST NOT)
    // 「畳んだ `TaskGroup` の配下の行 … を描いてはならない」 ⇒ folding `p` takes
    // `c1`, `c2` AND `g1` off the screen, and 「その行数」 is the number of rows
    // it is holding away.
    const panel = panelOf(scheduleOf(FAMILY({ isCollapsed: true })), drawn('p'))

    expect(titleOf(panel, 'p').foldedRowCount).toBe(3)
  })

  it('⛔ a row holding nothing folded shows no count (HF-18 shows one 「配下に畳み込んでいる行があるとき」)', () => {
    const panel = panelOf(scheduleOf(FAMILY()), drawn('p', 'c1', 'c2', 'g1'))

    // ⚠️ ZERO AND ABSENT ARE ONE ANSWER HERE. HF-18 asks for a count only when
    // there is something to count, and the member is optional -- so what this
    // case forbids is a POSITIVE count on a row that is holding nothing.
    for (const row of ['p', 'c1', 'c2', 'g1']) {
      expect(titleOf(panel, row).foldedRowCount ?? 0, `${row} claims to hold rows folded`).toBe(0)
    }
  })

  it('⭐ the count is the FOLD’s and not the roster’s: a drawn subtree holds nothing', () => {
    // ⛔ WITHOUT THIS, A UNIT THAT ANSWERED 「how many descendants have I」 WOULD
    // PASS THE CASE ABOVE. `c1` is folded over exactly one row; `q`, whose child
    // is drawn, is holding none although it has one.
    //
    // ⚠️ ONE THING HF-18 DOES NOT DECIDE, AND SO IS NOT ASSERTED: whether an
    // ANCESTOR of a folded row counts what that row is holding. 「**配下に畳み
    // 込んでいる行があるとき、その行数を行に示すこと（MUST）**」 reads both ways --
    // the rows THIS row's own fold is holding away, or every row folded away
    // anywhere below it -- and the row's reason (「どの行が抱えているかを目で追う」)
    // settles neither. ⛔ So `p` is left out of this case rather than pinned to
    // one reading; the fixture is built so both readings answer alike for the
    // two rows that ARE read. See the report.
    const panel = panelOf(
      scheduleOf([
        groupOf({ id: 'p', label: 'parent' }),
        groupOf({ id: 'c1', parentId: 'p', label: 'c1', order: 1, isCollapsed: true }),
        groupOf({ id: 'g1', parentId: 'c1', label: 'g1', order: 2 }),
        groupOf({ id: 'q', label: 'q', order: 3 }),
        groupOf({ id: 'q1', parentId: 'q', label: 'q1', order: 4 }),
      ]),
      drawn('p', 'c1', 'q', 'q1'),
    )

    expect(titleOf(panel, 'c1').foldedRowCount).toBe(1)
    expect(titleOf(panel, 'q').foldedRowCount ?? 0, 'a drawn child was counted as folded').toBe(0)
  })
})

// ===========================================================================
// 表 T-051 の HF-18 (MUST / MUST NOT) -- WHAT IS COUNTED IS THE PERSON'S FOLD
//
//   ⛔⛔ 「**数えるのは人が畳んだ分だけとすること（MUST）。表示量（`FR-018`）が
//   落とした行を数えてはならない（MUST NOT）**」 —— 「**畳んでいない行に数が出る
//   と、人は自分が畳んだ覚えの無いものを探すことになる。**」
//
// ⛔⛔ WHY THESE CASES EXIST. The sentence above was written on 2026-08-30 after
// the user read the shipping build: with nothing folded by anybody, the head
// said it was holding 92 of the document's 100 rows away. ⚠️ Not one of the
// 5346 cases then standing was red for it -- the cases above ask what a FOLDED
// row counts and what an unfolded one counts, and every one of them draws every
// row it does not fold, so a unit answering 「行が描かれていない」 rather than
// 「人が畳んだ」 passes all of them.
//
// ⭐ WHY THE TWO ARE NOT THE SAME QUESTION, in the specification's own words:
// `FR-018` drops rows for its own reasons (表 T-005a の `L-3`, the group level of
// detail the vertical zoom drives), and `HF-7` (MUST NOT) keeps the person's fold
// ABOVE that -- 「人が畳んだ状態は、表示量の増減（`FR-018`）より優先する。人の指定
// を倍率が上書きしてはならない」. So a row the zoom stopped drawing is an OPEN row
// whose picture is smaller, and 畳み込んでいる is false of it.
// ⚠️ `AT-56` (`TaskGroup.isCollapsed`) IS THE PERSON'S FOLD AND THE ONLY THING
// THAT IS. The display amount writes no column -- HF-7 is what forbids it -- so
// nothing else in the document can carry the answer.
//
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED BELOW: whether the HEAD counts a fold a
// ROW made. `HF-12` asks for the count 「そのとき」, in a paragraph about 段 0's own
// fold, and `HF-18` says the two rules are one thing at two ranges without saying
// which rows the wider one reaches. ⛔ So the head cases below move only the thing
// both readings agree on -- rows nobody folded -- and the mixed fixture reads the
// ROW. See the report.
// ===========================================================================

const T_051_HF18_ONLY_THE_PERSONS_FOLD = '数えるのは人が畳んだ分だけとすること（MUST）'
const T_051_HF18_NOT_THE_DISPLAY_AMOUNT =
  '表示量（`FR-018`）が落とした行を数えてはならない（MUST NOT）'

describe('UF-63 -- 表 T-051 HF-18 (MUST NOT): the display amount’s rows are not folded rows', () => {
  it('⛔ the manuscript still counts only what a person folded', () => {
    const hf18 = (specTable('T-051').rows.find((one) => one.id === 'HF-18')?.cells ?? []).join(' ')

    expect(hf18).toContain(T_051_HF18_ONLY_THE_PERSONS_FOLD)
    expect(hf18).toContain(T_051_HF18_NOT_THE_DISPLAY_AMOUNT)
    // ⭐ AND HF-7 IS WHY THE TWO CAN BE TOLD APART AT ALL.
    const hf7 = (specTable('T-051').rows.find((one) => one.id === 'HF-7')?.cells ?? []).join(' ')
    expect(hf7).toContain('人が畳んだ状態は、表示量の増減（`FR-018`）より優先する')
  })

  it('⛔⛔ MUST NOT: a row nobody folded shows no count, however few of its rows the frame drew', () => {
    // ⭐ THE MEASURED DEFECT, IN ONE FIXTURE. `p` holds `c1`, `c2` and `g1`, all
    // of them OPEN (`FAMILY()` sets no fold anywhere), and the frame drew `p`
    // alone -- which is what `FR-018`'s group level of detail does at a small
    // vertical zoom. ⛔ A unit that asks 「did the frame draw this row」 answers
    // three here, and three is the number the user was shown for a document
    // nobody had touched.
    const panel = panelOf(scheduleOf(FAMILY()), drawn('p'))

    expect(
      titleOf(panel, 'p').foldedRowCount ?? 0,
      'HF-18 (MUST NOT): the display amount’s rows were counted as folded',
    ).toBe(0)
  })

  it('⭐ the pair that makes it a test: the same three rows, folded by the person, ARE counted', () => {
    // ⛔ WITHOUT THIS PAIR THE CASE ABOVE WOULD PASS ON A UNIT THAT COUNTS
    // NOTHING AT ALL. The roster and the drawn set are the same as above; the
    // only thing that moved is `AT-56` on `p`.
    const panel = panelOf(scheduleOf(FAMILY({ isCollapsed: true })), drawn('p'))

    expect(titleOf(panel, 'p').foldedRowCount).toBe(3)
  })

  it('⛔⛔ MUST NOT: the HEAD does not count what the display amount dropped either', () => {
    // ⭐ 「**`HF-12` が段 0 について定めるものを、行について定めたものであり**」 --
    // one rule at two ranges, so the MUST NOT reaches the head as well. ⛔ THE
    // MEASUREMENT THE RULING CAME FROM WAS THE HEAD'S: 92 of 100 rows reported
    // folded away with 段 0 open and nobody having folded anything.
    // ⚠️ 段 0 IS OPEN HERE, which is what makes the fixture unambiguous: neither
    // reading of HF-12's range can find a fold in this document.
    const panel = panelOf(scheduleOf(FAMILY()), sessionWith({ rowBoxes: [] }))

    expect(
      panel.foldedRowCount ?? 0,
      'HF-12 / HF-18 (MUST NOT): the head counted rows the display amount dropped',
    ).toBe(0)
  })

  it('⛔ MUST: a row separates the two in one picture -- its own fold counted, the dropped rows not', () => {
    // `c1` is folded by the person over `g1`; `c2` is open and the frame simply
    // did not draw it. ⭐ ONE PICTURE, TWO REASONS A ROW IS MISSING, and only one
    // of them is 畳み込んでいる.
    const panel = panelOf(
      scheduleOf([
        groupOf({ id: 'p', label: 'parent' }),
        groupOf({ id: 'c1', parentId: 'p', label: 'c1', order: 1, isCollapsed: true }),
        groupOf({ id: 'c2', parentId: 'p', label: 'c2', order: 2 }),
        groupOf({ id: 'g1', parentId: 'c1', label: 'g1', order: 3 }),
      ]),
      drawn('p', 'c1'),
    )

    expect(titleOf(panel, 'c1').foldedRowCount, 'the row’s own fold holds `g1`').toBe(1)
    // ⚠️ `p` IS READ AS A RANGE AND NOT AS A NUMBER, because HF-18 does not settle
    // whether an ancestor counts what a row below it folded (the case above says
    // so at length). ⛔ BOTH READINGS AGREE ON THE ONE THING THIS CASE IS FOR:
    // `c2` was dropped by the display amount and may not be in the answer, so 2
    // is wrong under either.
    expect(
      [0, 1],
      'HF-18 (MUST NOT): `c2` was dropped by the display amount and was counted',
    ).toContain(titleOf(panel, 'p').foldedRowCount ?? 0)
  })
})

describe('UF-63 -- 表 T-051 HF-12 / HR-2 (MUST): 段 0 folds, the panel can empty, and the head says how many', () => {
  it('⛔ the manuscript still folds 段 0, still admits an empty panel, and still asks the head for a count', () => {
    const hf12 = (specTable('T-051').rows.find((one) => one.id === 'HF-12')?.cells ?? []).join(' ')
    const hr2 = (specTable('T-015').rows.find((one) => one.id === 'HR-2')?.cells ?? []).join(' ')

    expect(hf12).toContain(T_051_HF12_THE_HEAD_COUNT)
    expect(hf12).toContain('最も浅い段の行も畳むこと（MUST）')
    expect(hr2).toContain('最も浅い段の行も畳むこと（MUST）')
    expect(hr2).toContain(T_015_HR2_MAY_EMPTY_THE_PANEL)
    // ⭐ AND S-211 IS WHERE THE STATE LIVES, which is why these cases put it on
    // the session and never on a row.
    expect(hr2).toContain('`S-211`')
    const s211 = (specTable('T-206').rows.find((one) => one.id === 'S-211')?.cells ?? []).join(' ')
    expect(s211).toContain('段 0（行見出しパネルの頭）が畳まれているか')
    expect(s211).toContain('保存しない')
  })

  it('⭐⭐ MUST: with 段 0 folded the panel describes NO row at all (HR-2: 押すと行が 1 つも描かれない状態になりうる)', () => {
    const panel = panelOf(
      scheduleOf(FAMILY()),
      sessionWith({ isLevelZeroFolded: true, rowBoxes: [] }),
    )

    expect(panel.titles, 'a row was described although 段 0 is folded').toEqual([])
    expect(panel.pinnedTitles, 'a pinned row was described although 段 0 is folded').toEqual([])
  })

  it('⭐⭐ MUST: and the head says how many rows it is holding (HF-12: 示さないと、行が消えたのか畳まれたのかが読めない)', () => {
    const panel = panelOf(
      scheduleOf(FAMILY()),
      sessionWith({ isLevelZeroFolded: true, rowBoxes: [] }),
    )

    // ⛔ FOUR, NOT ONE. 段 0's fold holds the shallowest row away and `HR-1a`
    // holds everything under it away with it, so the whole document is what the
    // head is holding -- and 「行が消えたのか畳まれたのか」 is exactly the question
    // a reader of an empty panel asks.
    expect(panel.foldedRowCount).toBe(4)
  })

  it('⛔ the pair that makes the count a test: with 段 0 open and nothing folded the head holds nothing', () => {
    const panel = panelOf(scheduleOf(FAMILY()), drawn('p', 'c1', 'c2', 'g1'))

    expect(panel.foldedRowCount ?? 0, 'the head claims to hold rows folded').toBe(0)
    expect(idsOf(panel.titles)).toEqual(['p', 'c1', 'c2', 'g1'])
  })

  it('⭐ MUST: with 段 0 folded, the head’s 「すべて畳む」 has nothing left to do (HF-12 reads S-211)', () => {
    const folded = panelOf(
      scheduleOf(FAMILY()),
      sessionWith({ isLevelZeroFolded: true, rowBoxes: [] }),
    )
    const open = panelOf(scheduleOf(FAMILY()), drawn('p', 'c1', 'c2', 'g1'))

    expect(folded.canCloseEveryRow, 'a folded 段 0 can be folded again').toBe(false)
    // ⭐ The pair: with the head open there is always 段 0 itself left to fold.
    expect(open.canCloseEveryRow, 'an open panel has nothing to fold').toBe(true)
  })
})

describe('UF-63 -- 表 T-015 HR-6 (MUST): the way back from a hide is an opening control', () => {
  it('⛔ the manuscript still sends a hidden row back through HF-13, and a top-level one through HF-16', () => {
    const hr6 = (specTable('T-015').rows.find((one) => one.id === 'HR-6')?.cells ?? []).join(' ')

    expect(hr6).toContain(T_015_HR6_BACK_THROUGH_THE_PARENT)
    expect(hr6).toContain(T_015_HR6_BACK_THROUGH_LEVEL_ZERO)
    // ⛔⛔ AND IT FORBIDS THE PLACE THE OLD READING SENT IT TO: 「**戻すための専用
    // の面や札を設けてはならない（MUST NOT）**」 —— ⚠️ 「**2026-08-30 まで、戻す先は
    // 非表示グループタブであった** —— **そのタブは実装に 1 つも無く、入口の無い
    // 戻り道であった**」.
    expect(hr6).toContain('戻すための専用の面や札を設けてはならない（MUST NOT）')
    expect(hr6).toContain('表 T-051 の `HF-13` である')
    expect(hr6).toContain('同表の `HF-16` である')
  })

  it('⭐ MUST: a row whose child is HIDDEN arms its own 「配下を 1 階層開く」 (HR-6 through HF-13)', () => {
    // ⛔ `RowExpander` CARRIES NO FLAG FOR THIS ONE. `HF-13`'s entrance is a row
    // of its own (「`HF-2`（配下をすべて開く）とは別の入口とすること（MUST）」), and
    // `RowTitle.canOpenOneLevel` is what says whether it has work.
    const panel = panelOf(
      scheduleOf([
        groupOf({ id: 'p', label: 'parent' }),
        groupOf({ id: 'c1', parentId: 'p', label: 'c1', order: 1, isHidden: true }),
      ]),
      drawn('p'),
    )

    expect(titleOf(panel, 'p').canOpenOneLevel, 'the hidden child has no way back').toBe(true)
  })

  it('⛔ the pair: with nothing hidden and nothing folded under it, the same control is spent', () => {
    const panel = panelOf(
      scheduleOf([
        groupOf({ id: 'p', label: 'parent' }),
        groupOf({ id: 'c1', parentId: 'p', label: 'c1', order: 1 }),
      ]),
      drawn('p', 'c1'),
    )

    expect(titleOf(panel, 'p').canOpenOneLevel ?? false).toBe(false)
  })

  it('⭐⭐ MUST: a hidden TOP-LEVEL row arms the head’s own 「1 階層開く」 (HR-6 through HF-16)', () => {
    // 「**親を持たない最上位の行は、段 0 の同じ操作子で戻せること（MUST）** ——
    // 同表の `HF-16` である。`FR-085` が最上位の行を許しているためである」. ⛔ A row
    // with no parent has no parent's control to come back through, so without
    // this the hide would be a one-way door.
    const panel = panelOf(
      scheduleOf([
        groupOf({ id: 'r1', label: 'r1', isHidden: true }),
        groupOf({ id: 'r2', label: 'r2', order: 1 }),
      ]),
      drawn('r2'),
    )

    expect(panel.canOpenLevelZero, 'the hidden top-level row has no way back').toBe(true)
  })

  it('⭐ MUST: a folded 段 0 arms the same head control (HR-2: HR-7 を頭で押せば最も浅い段が戻る)', () => {
    const folded = panelOf(
      scheduleOf(FAMILY()),
      sessionWith({ isLevelZeroFolded: true, rowBoxes: [] }),
    )
    const open = panelOf(scheduleOf(FAMILY()), drawn('p', 'c1', 'c2', 'g1'))

    expect(folded.canOpenLevelZero, 'the folded head has no way back').toBe(true)
    // ⛔ The pair: with the head open and nothing hidden at the shallowest
    // level, the head's one-level open has nothing to do.
    expect(open.canOpenLevelZero ?? false, 'the head control is armed with nothing to open').toBe(
      false,
    )
  })
})
