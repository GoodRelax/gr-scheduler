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

const SESSION: ScreenSession = {
  language: 'ja',
  autosave: { kind: 'saving' },
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

const idsOf = (titles: readonly RowTitle[]): readonly string[] => titles.map((t) => t.groupId)

/** The one title for a row, from whichever of the two lists holds it. */
const titleOf = (panel: RowTitlePanel, groupId: string): RowTitle => {
  const found = [...panel.pinnedTitles, ...panel.titles].filter((t) => t.groupId === groupId)
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
 * How many half-width characters of a name survive at this depth.
 *
 * This is the panel's own answer to "how much room is there for a name", read
 * back through the only thing the specification makes observable: where the cut
 * lands. Every width case compares two of these rather than naming a number,
 * because the room FR-085 keeps for the row controls has no row anywhere.
 */
const keptOf = (settings: DocumentSettings, depth: number): number => {
  const title = deepestTitle(depth, LONG, settings)
  expect(title.isLabelTruncated, 'a 400-character name cannot fit any panel used here').toBe(true)
  return (title.label ?? '').length
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

  it('leaves out a pinned row the display amount stopped drawing', () => {
    // FR-098 admits that FR-018 may stop drawing a pinned row, and CD-2 of
    // table T-050 takes the pin away with the row it points at. Neither may put
    // a row on the screen the shell measured no box for.
    const panel = panelOf(threeRows, drawn('g1', 'g3'), panelWith({ pinnedGroupIds: ['g2'] }))

    expect(panel.pinnedTitles).toEqual([])
    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
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

  it('describes a pinned row with the box the shell measured for it', () => {
    // FR-098 fixes the pinned row to the top of the SCREEN, which is a place;
    // the box is still the one measurement SC-1 admits.
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g3'] }))

    expect(titleOf(panel, 'g3').box).toEqual(boxAt(2))
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

    expect([1, 2, 3].map((d) => titleOf(panel, `g${d}`).depth)).toEqual([1, 2, 3])
  })

  it('stops at `maxGroupDepth`, which S-125 holds', () => {
    // FR-004 caps the hierarchy at S-125, and the published type says the same:
    // "Depth 1 is a root row. FR-004 caps it at `maxGroupDepth` (S-125)".
    const panel = chainPanel(5, 'a', panelWith({ maxGroupDepth: 3 }))

    expect([1, 2, 3, 4, 5].map((d) => titleOf(panel, `g${d}`).depth)).toEqual([1, 2, 3, 3, 3])
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

describe('UF-63 -- table T-051: the two controls of the expander', () => {
  const kid = (id: string, part: Record<string, unknown> = {}): TaskGroup =>
    groupOf({ id, parentId: 'p', label: id, ...part })

  /** A parent with `children` under it; `drawnIds` is what the shell drew. */
  const parentTitle = (children: readonly TaskGroup[], drawnIds: readonly string[]): RowTitle =>
    titleOf(
      panelOf(scheduleOf([groupOf({ id: 'p', label: 'parent' }), ...children]), drawn(...drawnIds)),
      'p',
    )

  it('gives no expander to a row nothing sits under', () => {
    expect(parentTitle([], ['p']).expander).toBeNull()
  })

  it('offers only the closing control while everything below is open', () => {
    // HF-3 closes ALL of what is below, so it is spent exactly when something
    // below is drawn. HF-2 opens ONE level, so it has nothing to do here.
    expect(parentTitle([kid('c1'), kid('c2')], ['p', 'c1', 'c2']).expander).toEqual({
      canOpen: false,
      canClose: true,
    })
  })

  it('offers only the opening control while nothing below is open', () => {
    expect(parentTitle([kid('c1'), kid('c2')], ['p']).expander).toEqual({
      canOpen: true,
      canClose: false,
    })
  })

  it('offers both at once -- HF-1 is a pair, not one control in two states', () => {
    // HF-2 opens one level and HF-3 closes all of them, so one of the pair can
    // be spent while the other is not.
    expect(parentTitle([kid('c1'), kid('c2')], ['p', 'c1']).expander).toEqual({
      canOpen: true,
      canClose: true,
    })
  })

  it('reads what was drawn and not `isCollapsed` (HR-1a, MUST)', () => {
    // HR-1a requires the picture of a hand-collapsed row and of a row the group
    // level of detail collapsed to be the same one. The level of detail does
    // not write AT-56, so reading AT-56 would tell those two apart on screen.
    const open = ['p', 'c1']
    const said = parentTitle([kid('c1', { isCollapsed: true })], open).expander
    const silent = parentTitle([kid('c1', { isCollapsed: null })], open).expander
    const denied = parentTitle([kid('c1', { isCollapsed: false })], open).expander

    expect(said).toEqual(silent)
    expect(said).toEqual(denied)
  })

  it('does not arm the opening control for a hidden child (HR-6)', () => {
    // HR-6 brings a hidden row back through the parent's hidden group tab, not
    // through the expander. Counting it would arm a control that does nothing.
    expect(parentTitle([kid('c1', { isHidden: true })], ['p']).expander).toEqual({
      canOpen: false,
      canClose: false,
    })
    expect(parentTitle([kid('c1', { isHidden: false })], ['p']).expander).toEqual({
      canOpen: true,
      canClose: false,
    })
  })

  it('still offers the closing control when a hidden sibling is the only one left out', () => {
    expect(
      parentTitle([kid('c1'), kid('c2', { isHidden: true })], ['p', 'c1']).expander,
    ).toEqual({ canOpen: false, canClose: true })
  })
})

describe('UF-63 -- FR-085: the name is cut to the width the panel leaves', () => {
  it('carries a name that fits, whole and unmarked', () => {
    const title = deepestTitle(1, 'alpha')

    expect(title.label).toBe('alpha')
    expect(title.isLabelTruncated).toBe(false)
  })

  it('cuts the TAIL, so what is left is the front of the name', () => {
    const title = deepestTitle(1, LONG)

    expect(LONG.startsWith(title.label ?? '')).toBe(true)
    expect(title.label).not.toBe(LONG)
  })

  it('keeps the longest name that fits and cuts the next one', () => {
    const kept = keptOf(PANEL, 1)
    const fits = 'x'.repeat(kept)
    const overflows = 'x'.repeat(kept + 1)

    const atFit = deepestTitle(1, fits)
    const over = deepestTitle(1, overflows)

    expect(atFit.label).toBe(fits)
    expect(atFit.isLabelTruncated).toBe(false)
    expect(over.label).toBe(fits)
    expect(over.isLabelTruncated).toBe(true)
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
    const wide = deepestTitle(1, '字'.repeat(400))

    expect((wide.label ?? '').length).toBe(Math.floor(inHalf / 2))
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

  it('MUST NOT change the room kept for the controls with whether they are drawn', () => {
    // FR-085: the export draws no row control (EP-4 of table T-076), so a room
    // that followed the controls would cut one and the same name in two places.
    // A row with an expander, a leaf row and a pinned leaf all sit at depth 1
    // here, so the expander's presence and the pin's state both move.
    const groups = [
      groupOf({ id: 'withKid', label: LONG }),
      groupOf({ id: 'kid', parentId: 'withKid', label: 'k' }),
      groupOf({ id: 'leaf', label: LONG }),
      groupOf({ id: 'pinnedLeaf', label: LONG }),
    ]
    const panel = panelOf(
      scheduleOf(groups),
      drawn('withKid', 'kid', 'leaf', 'pinnedLeaf'),
      panelWith({ pinnedGroupIds: ['pinnedLeaf'] }),
    )

    expect(titleOf(panel, 'withKid').expander).not.toBeNull()
    expect(titleOf(panel, 'leaf').expander).toBeNull()
    expect(titleOf(panel, 'leaf').label).toBe(titleOf(panel, 'withKid').label)
    expect(titleOf(panel, 'pinnedLeaf').label).toBe(titleOf(panel, 'withKid').label)
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

    expect(panel.titles.map((t) => t.isSelected)).toEqual([false, false, false])
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
      autosave: { kind: 'failed' },
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

describe('UF-63 -- HF-5 of table T-051: the controls are set DOWN from the name', () => {
  // FIXED DATA, copied from the tables (specification section 1.9):
  //   S-139 (table T-206)  the set-down is `0.25` times the row's name size --
  //                        a RATIO, never an absolute number of pixels
  //   S-36  (table T-201)  `rowTitleFont`, the row name's size
  //   S-38  (table T-201)  `rowTitleTopScale`, which multiplies it at depth 1
  //
  // So the name size is S-36 x S-38 on a root row and S-36 anywhere below it,
  // and HF-5's set-down is 0.25 of THAT row's own number. HF-5 spells out why
  // it is a ratio: the name's size changes with depth (S-36 and S-38), so an
  // absolute set-down would look different at every depth.
  const S_139 = 0.25

  /** Name 30px at depth 1 (20 x 1.5) and 20px below it -- two sizes, one panel. */
  const HF5 = panelWith({ rowTitleFont: 20, rowTitleTopScale: 1.5 })
  /** The same shape with S-36 doubled: 60px at depth 1, 40px below. */
  const HF5_DOUBLE_FONT = panelWith({ rowTitleFont: 40, rowTitleTopScale: 1.5 })

  /** A root row and its child, both drawn, for the pinned cases. */
  const twoDeep = scheduleOf([
    groupOf({ id: 'g1', parentId: null, label: 'a', order: 0 }),
    groupOf({ id: 'g2', parentId: 'g1', label: 'b', order: 1 }),
  ])

  it('sets a root row down by S-139 of its own name size (S-36 x S-38)', () => {
    expect(deepestTitle(1, 'a', HF5).controlTopOffsetPx).toBe(20 * 1.5 * S_139)
  })

  it('sets a row below the root down by S-139 of S-36, which S-38 does not touch', () => {
    expect(deepestTitle(3, 'a', HF5).controlTopOffsetPx).toBe(20 * S_139)
  })

  it('MUST give a root row and a deep row different numbers while S-38 is not 1', () => {
    // The whole point of HF-5's ratio: the two rows carry different name sizes,
    // so one set-down cannot serve both.
    const root = deepestTitle(1, 'a', HF5).controlTopOffsetPx
    const deep = deepestTitle(4, 'a', HF5).controlTopOffsetPx

    expect(root).toBe(7.5)
    expect(deep).toBe(5)
    expect(root).not.toBe(deep)
  })

  it('gives every row below the root the same number, since S-38 reaches none of them', () => {
    const below = chainPanel(5, 'a', HF5)
      .titles.filter((t) => t.depth > 1)
      .map((t) => t.controlTopOffsetPx)

    expect(below).toEqual([5, 5, 5, 5])
  })

  it('is PROPORTIONAL to the name size: doubling S-36 doubles it at both depths', () => {
    expect(deepestTitle(1, 'a', HF5_DOUBLE_FONT).controlTopOffsetPx).toBe(40 * 1.5 * S_139)
    expect(deepestTitle(3, 'a', HF5_DOUBLE_FONT).controlTopOffsetPx).toBe(40 * S_139)
  })

  it('moves with S-38 at depth 1 and nowhere else', () => {
    const doubledScale = panelWith({ rowTitleFont: 20, rowTitleTopScale: 2 })

    expect(deepestTitle(1, 'a', doubledScale).controlTopOffsetPx).toBe(20 * 2 * S_139)
    expect(deepestTitle(3, 'a', doubledScale).controlTopOffsetPx).toBe(20 * S_139)
  })

  it('leaves both depths level when S-38 is 1, its own lower bound', () => {
    const flat = panelWith({ rowTitleFont: 20, rowTitleTopScale: 1 })

    expect(deepestTitle(1, 'a', flat).controlTopOffsetPx).toBe(5)
    expect(deepestTitle(3, 'a', flat).controlTopOffsetPx).toBe(5)
  })

  it('MUST NOT centre: the ratio to the name size is the same at every depth', () => {
    // Centring would put the controls at (nameSize - controlSize) / 2, which is
    // affine in the name size rather than proportional to it -- so the two
    // ratios below would differ for any control size but zero. HF-5 forbids
    // centring (MUST NOT) because it moves the controls whenever the name's
    // size moves, which is what HF-4 forbids on the horizontal axis.
    expect(deepestTitle(1, 'a', HF5).controlTopOffsetPx / 30).toBe(S_139)
    expect(deepestTitle(3, 'a', HF5).controlTopOffsetPx / 20).toBe(S_139)
  })

  it('sets them DOWN, so the number is above zero on every row', () => {
    // HF-5 (MUST): not level with the name's top edge -- below it.
    const offsets = chainPanel(5, 'a', HF5).titles.map((t) => t.controlTopOffsetPx)

    expect(offsets.length).toBe(5)
    for (const offset of offsets) expect(offset).toBeGreaterThan(0)
  })

  it('carries the set-down on a PINNED row too (FR-098 sends it to HF-5)', () => {
    // FR-098: the `Row Pin` is placed, sized and shaded as the folding control
    // is -- HF-4 .. HF-6 and HF-9 of table T-051. A pinned row is lifted out of
    // the scrolling list, not out of HF-5.
    const pinned = panelOf(
      twoDeep,
      drawn('g1', 'g2'),
      settingsOf({ ...HF5, pinnedGroupIds: ['g1', 'g2'] }),
    )

    expect(idsOf(pinned.pinnedTitles)).toEqual(['g1', 'g2'])
    expect(titleOf(pinned, 'g1').controlTopOffsetPx).toBe(7.5)
    expect(titleOf(pinned, 'g2').controlTopOffsetPx).toBe(5)
  })

  it('gives a pinned row the same number it had at its natural place', () => {
    // Pinning changes which list holds the row, never the row's name size.
    const loose = panelOf(twoDeep, drawn('g1', 'g2'), HF5)
    const pinned = panelOf(
      twoDeep,
      drawn('g1', 'g2'),
      settingsOf({ ...HF5, pinnedGroupIds: ['g2'] }),
    )

    expect(titleOf(pinned, 'g2').controlTopOffsetPx).toBe(titleOf(loose, 'g2').controlTopOffsetPx)
  })

  it('does not follow the row name it was given: a long name and a short one agree', () => {
    // HF-5 ties the set-down to the name's SIZE, not to its length. HF-4 has
    // already forbidden the row's name to move the controls on the other axis.
    expect(deepestTitle(2, LONG, HF5).controlTopOffsetPx).toBe(
      deepestTitle(2, 'a', HF5).controlTopOffsetPx,
    )
  })

  it('does not follow whether an expander is drawn at all', () => {
    // FR-085 forbids the room kept for the controls to change with whether they
    // are drawn (MUST NOT); the set-down is of the same kind -- a leaf row
    // carries no `RowExpander` and still carries the number.
    const leaf = deepestTitle(2, 'a', HF5)

    expect(leaf.expander).toBe(null)
    expect(leaf.controlTopOffsetPx).toBe(5)
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

    expect(panel.titles.map((t) => t.isSelected)).toEqual([true, false, true])
  })

  it('chooses every drawn row when every one of them was named', () => {
    const panel = panelOf(schedule, chose(session, 'g1', 'g2', 'g3'))

    expect(panel.titles.map((t) => t.isSelected)).toEqual([true, true, true])
  })

  it('clears the set: an empty `selectedGroupIds` chooses no row (FR-085)', () => {
    const panel = panelOf(schedule, chose(session))

    expect(panel.titles.map((t) => t.isSelected)).toEqual([false, false, false])
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
    expect(panel.titles.map((t) => t.isSelected)).toEqual([false, true, false])
  })

  it('describes a row once when the set happens to hold its id twice', () => {
    // The shape S-126 is already tested for above: a set that names one row
    // twice still names one row.
    const panel = panelOf(schedule, chose(session, 'g2', 'g2'))

    expect(idsOf(panel.titles)).toEqual(['g1', 'g2', 'g3'])
    expect(panel.titles.map((t) => t.isSelected)).toEqual([false, true, false])
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

    expect(panel.pinnedTitles.map((t) => t.isSelected)).toEqual([true])
    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
    expect(panel.titles.map((t) => t.isSelected)).toEqual([false, true])
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
