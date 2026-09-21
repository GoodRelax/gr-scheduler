// Unit tests for rowTitlePanelFromSchedule (UF-63, table T-075, row-title-panel.ts).

// WHY: no case asserts a pixel size for FR-085's control room or that a row
// is selected -- neither is specified, so each width case states a relation instead.

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
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from '../contract/spec-table'

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

// WHY: DR-5 keeps the hue on Project, not settings, so SETTINGS_DEFAULTS
// carries no such key -- read table T-216 rather than typing a number.
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

// WHY: every number lands the FR-093 arithmetic on whole characters;
// rowTitleTopScale is pinned at its lower bound so a case moving the indent moves it alone.
const PANEL = settingsOf({
  rowTitlePanelWidth: 400,
  rowTitleIndent: 20,
  rowTitleFont: 20,
  rowTitleTopScale: 1,
  labelCoef: 0.5,
  maxGroupDepth: 5,
  truncateUnits: 24,
  pinnedGroupIds: [],
  pinnedRowMax: 5,
})

const panelWith = (part: Record<string, unknown>): DocumentSettings =>
  settingsOf({ ...PANEL, ...part })

const LONG = 'x'.repeat(400)

// WHY: the mark FR-085 closes a cut name with is a specification value, not
// src/'s -- written as an actual ellipsis so a diff cannot show three periods instead.
const MARK = '…'

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

const readingsWith = (part: Partial<ScreenViewReadings>): ScreenViewReadings => ({
  ...READINGS,
  ...part,
})

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, language: 'ja' },
}

const LEVEL_ZERO_FOLDED: ScreenSession = {
  ...ROOT,
  screen: { ...ROOT.screen, levelZeroFoldState: { kind: 'folded' } },
}

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

const boxAt = (index: number): ScreenRect => ({ x: 0, y: index * 24, width: 400, height: 24 })

const drawn = (...groupIds: readonly string[]): ScreenViewReadings =>
  readingsWith({ rowBoxes: groupIds.map((groupId, index) => ({ groupId, box: boxAt(index) })) })

const panelOf = (
  schedule: Schedule,
  readings: ScreenViewReadings,
  settings: DocumentSettings = PANEL,
  selection = emptySelection(),
  root: ScreenSession = ROOT,
): RowTitlePanel => rowTitlePanelFromSchedule(schedule, settings, selection, root, readings)

const idsOf = (titles: readonly RowTitle[]): readonly string[] => titles.map((drawnText) => drawnText.groupId)

const titleOf = (panel: RowTitlePanel, groupId: string): RowTitle => {
  const found = [...panel.pinnedTitles, ...panel.titles].filter((drawnText) => drawnText.groupId === groupId)
  expect(found.length, `exactly one title for ${groupId}`).toBe(1)
  return found[0] as RowTitle
}

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

const deepestTitle = (
  depth: number,
  label: string | null,
  settings: DocumentSettings = PANEL,
): RowTitle => titleOf(chainPanel(depth, label, settings), `g${depth}`)

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

// WHY: width cases compare two of these rather than naming a number, since
// FR-085's control room has no row anywhere.
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

describe('UF-63 -- SC-1 of table T-031: the drawn rows are the roster', () => {
  it('gives one title to each row the shell drew', () => {
    expect(idsOf(chainPanel(3, 'alpha').titles)).toEqual(['g1', 'g2', 'g3'])
  })

  it('takes each box straight from `rowBoxes`, measuring nothing of its own', () => {
    // WHY: SC-1 slaves the panel to the body vertically, so the panel and
    // the Row Area must be the same numbers, not two separate computations.
    const session = drawn('g1', 'g2', 'g3')
    const groups = ['g1', 'g2', 'g3'].map((id) => groupOf({ id, label: id }))
    const panel = panelOf(scheduleOf(groups), session)

    for (const measured of session.rowBoxes) {
      expect(titleOf(panel, measured.groupId).box).toEqual(measured.box)
    }
  })

  it('keeps the order `rowBoxes` arrived in although `TaskGroup.order` disagrees', () => {
    // WHY: AT-55 is a second ordering of the same rows; taking it would be
    // a second answer to the question SC-1 already answers.
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
    // WHY: HR-1a, HR-6 and FR-018 all reach the panel this way, without
    // this unit judging any of them.
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
    // WHY: drawn twice, one row would be counted twice by the lane
    // assignment (FR-003) and by the fit (FR-055).
    const panel = panelOf(threeRows, allThree, panelWith({ pinnedGroupIds: ['g2'] }))

    expect(idsOf(panel.titles)).toEqual(['g1', 'g3'])
  })

  it('MUST NOT rank pinned rows against each other: they come out in pin order', () => {
    // WHY: FR-098 lines them up in the order S-126 holds them in -- not
    // the drawn order, not TaskGroup.order.
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
    // WHY: FR-098 spends S-127 refusing a NEW pin, never letting one go
    // automatically -- trimming to the bound would be the silent unpinning it forbids.
    const panel = panelOf(
      threeRows,
      allThree,
      panelWith({ pinnedGroupIds: ['g1', 'g2', 'g3'], pinnedRowMax: 1 }),
    )

    expect(idsOf(panel.pinnedTitles)).toEqual(['g1', 'g2', 'g3'])
    expect(panel.titles).toEqual([])
  })

  it('leaves out a pinned row the fold or the hide stopped drawing (HR-1a / HR-6)', () => {
    // WHY: only FR-018 is ruled out as a reason a pinned row goes undrawn;
    // this fixture is HR-1a's -- g2 sits under folded g1.
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
    // WHY: the control for the case above -- the only thing that moves is
    // whether the shell measured a box for g2.
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
    // WHY: SC-1 hands this unit rowBoxes and it measures nothing of its
    // own, so the fixture gives g3 the band's box although its order is third.
    const inTheBand = { x: 0, y: 0, width: 400, height: 24 }
    const session = readingsWith({
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
    // see FR-004
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
    // see FR-098
    const panel = chainPanel(3, 'a', panelWith({ pinnedGroupIds: ['g3'] }))

    expect(titleOf(panel, 'g3').depth).toBe(3)
  })
})

// WHY: table T-051's closing rule counts only DRAWN rows (rowBoxes, per
// SC-1) that a press would actually move on or off screen.
const T_051_CLOSING = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

describe('UF-63 -- table T-051: the three controls of the expander', () => {
  const kid = (id: string, part: Record<string, unknown> = {}): TaskGroup =>
    groupOf({ id, parentId: 'p', label: id, ...part })

  // WHY: a row deeper than a child, so a one-level check cannot mistake it
  // for a direct child.
  const under = (parentId: string, id: string, part: Record<string, unknown> = {}): TaskGroup =>
    groupOf({ id, parentId, label: id, ...part })

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
    // WHY: pins the manuscript text itself, so a table that reverted to
    // counting the whole roster would not leave every case below silently wrong.
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
    // WHY: HF-1 places all three controls on every row with no childless
    // exception, and FR-029 only dims a control that would change nothing.
    expect(parentTitle([], ['p']).expander).toEqual({
      canOpen: false,
      // WHY: HF-3 now hides the row (table T-015's HR-6) rather than folding
      // it, and this row is drawn -- hiding it moves one row off the screen.
      canClose: true,
      canCloseBelow: false,
    })
  })

  it('spends only the opening control while nothing under the row is folded', () => {
    // WHY: HR-4 (MUST) folds the pressed row itself, so `p`'s own two drawn
    // children leaving the picture is what the closing rule under T-051 counts.
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
    // WHY: HR-4 (MUST) folds `p` itself, so its direct child `c1` -- and `g1`
    // under it, per HR-1a -- is what leaves the picture and arms the control.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: false }), under('c1', 'g1')],
        ['p', 'c1', 'g1'],
      ).expander,
    ).toEqual({ canOpen: false, canClose: true, canCloseBelow: true })
  })

  it('arms the opener when the zoom leaves an unmarked row\'s children undrawn (HF-2, seam S-2)', () => {
    // WHY: HF-2 arms the opener when the pressed row carries no mark and a direct child is not
    // drawn at the FR-018 scale; nothing is folded, so HF-11 still has nothing to fold below.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: false }), kid('c2', { isCollapsed: false })],
        ['p'],
      ).expander,
    ).toEqual({ canOpen: true, canClose: true, canCloseBelow: false })
  })

  it('offers all three at once -- HF-1 is a lattice, not one control in three states', () => {
    // WHY: HF-2/HF-3/HF-11 are three separate writes (HR-3/HR-6/HR-4) on one
    // row, each spendable independently -- here all three have work to do.
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
    // WHY: HR-3 (MUST) opens every row under this one however deep, retiring
    // the one-level-only reading -- a grandchild's fold still arms the opener.
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
      // WHY: HF-11 folds `c1`, which is showing `g1` -- taking a row off screen.
      canCloseBelow: true,
    })
  })

  it('ARMS the opener on a row that is folded ITSELF, spends the fold, and keeps the hide (HF-2, HF-11, HF-3)', () => {
    // WHY: HR-3 (MUST) now also clears the row's own fold, not only its
    // subtree; HF-3 (HR-6) still hides `p` since a self-folded row is on screen.
    expect(
      parentTitle([kid('c1', { isCollapsed: false })], ['p'], { isCollapsed: true }).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      canCloseBelow: false,
    })
  })

  it('⭐⭐ ARMS the opening control for a hidden child (HR-6 through HF-2, 裁定 2026-08-31)', () => {
    // WHY: HR-6 (MUST) now says the deep-open control (HF-2) can also bring a
    // hidden descendant back, not only the one-level opener -- so it is armed.
    expect(
      parentTitle(
        [kid('c1', { isHidden: true, isCollapsed: true }), under('c1', 'g1')],
        ['p'],
        { isCollapsed: false },
      ).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      // WHY: still spent -- `p` draws no row below itself, so HF-11 folds nothing.
      canCloseBelow: false,
    })
  })

  it('arms it for the same child once the shell draws it', () => {
    // WHY: HR-6 (MUST NOT) forbids drawing a hidden row, so the drawn set
    // must move with `isHidden` or the fixture asks about an impossible screen.
    expect(
      parentTitle(
        [kid('c1', { isHidden: false, isCollapsed: true }), under('c1', 'g1')],
        ['p', 'c1'],
        { isCollapsed: false },
      ).expander,
    ).toEqual({
      canOpen: true,
      canClose: true,
      // WHY: `c1` is now drawn as `p`'s direct child, so HR-4 on `p` takes it away.
      canCloseBelow: true,
    })
  })

  it('arms all three where a hidden sibling is the only row left out', () => {
    // WHY: HR-3 (MUST) brings a hidden descendant back through HF-2, and HR-4
    // (MUST) now folds `p` itself, taking its drawn child `c1` off screen.
    expect(
      parentTitle(
        [kid('c1', { isCollapsed: false }), kid('c2', { isHidden: true, isCollapsed: false })],
        ['p', 'c1'],
      ).expander,
    ).toEqual({ canOpen: true, canClose: true, canCloseBelow: true })
  })

  it('⛔ the manuscript still sends a hidden row back through HF-2 as well as HF-13', () => {
    // WHY: pins the manuscript text, so a table that reverted to the earlier
    // reading would not leave the two cases above silently wrong.
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
    // WHY: FR-085 cuts the tail and closes it with the mark itself, so what
    // stands before the mark is the front of the name -- the tail is what went.
    const title = deepestTitle(1, LONG)
    const shown = title.label ?? ''

    expect(shown.endsWith(MARK)).toBe(true)
    expect(LONG.startsWith(shown.slice(0, -MARK.length))).toBe(true)
    expect(shown).not.toBe(LONG)
    expect(title.isLabelTruncated).toBe(true)
  })

  it('⛔ shows no whole name anywhere on the row (FR-085, MUST NOT)', () => {
    // WHY: FR-085 (MUST NOT) forbids showing the whole name anywhere on the
    // row -- `wholeLabel` lets the panel tell whether it cut, but `label` cannot.
    const title = deepestTitle(1, LONG)

    expect(title.wholeLabel).toBe(LONG)
    expect(title.label).not.toBe(LONG)
    expect(title.label ?? '').not.toContain(LONG)
    // WHY: FR-052 says widening the panel is the only way to see the whole
    // name back, so the same name against a wide enough panel is shown unmarked.
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
    // WHY: the cut name must not be wider than the name that only just fits --
    // FR-085 fixes the panel's width, and the mark is shown inside it.
    expect((over.label ?? '').length).toBeLessThanOrEqual(fits.length)
  })

  it('marks the cut exactly when the name it shows is not the name it was given', () => {
    // WHY: FR-085 (MUST) shows what was cut, whole, in a tooltip that UF-69
    // raises off this flag, so the flag has to mean precisely this.
    const kept = keptOf(PANEL, 1)

    for (const label of ['a', 'x'.repeat(kept), 'x'.repeat(kept + 1), LONG]) {
      const title = deepestTitle(1, label)
      expect(title.isLabelTruncated, `for a name of ${label.length}`).toBe(title.label !== label)
    }
  })

  it('widens the room for the name when S-79 widens (`rowTitlePanelWidth`)', () => {
    // WHY: 40px more panel is exactly 4 more half-width characters under
    // PANEL, and FR-085 forbids that room to follow anything this case varies.
    expect(keptOf(panelWith({ rowTitlePanelWidth: 440 }), 1) - keptOf(PANEL, 1)).toBe(4)
  })

  it('takes one step of S-37 (`rowTitleIndent`) off for each step of depth', () => {
    // WHY: FR-085 sets the width as the panel less the indent for its depth;
    // one step is 20px, exactly 2 half-width characters under PANEL.
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
    // WHY: K-38 of table T-104 settles that key as the scale of a depth 1
    // row's name, so doubling it moves the depth 1 cut and leaves depth 2 alone.
    const plain = panelWith({ rowTitleTopScale: 1 })
    const scaled = panelWith({ rowTitleTopScale: 2 })

    expect(keptOf(scaled, 2)).toBe(keptOf(plain, 2))
    expect(keptOf(scaled, 1)).toBeLessThan(keptOf(plain, 1))
    expect(keptOf(settingsOf({ ...scaled, rowTitlePanelWidth: 440 }), 1) - keptOf(scaled, 1)).toBe(2)
  })

  it('counts a full-width character as 2 and a half-width one as 1 (FR-093)', () => {
    // WHY: FR-093 states the rule in full-width/half-width terms, so this
    // case needs one of each -- rule 03's exception, code that handles Japanese.
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
    // WHY: FR-093 forbids measuring a glyph's real size -- a narrow and a
    // wide letter are both 1 unit, so a panel that measured would keep more.
    const narrow = deepestTitle(1, 'i'.repeat(400))
    const wide = deepestTitle(1, 'W'.repeat(400))

    expect((narrow.label ?? '').length).toBe((wide.label ?? '').length)
  })

  it('MUST NOT cut by `truncateUnits` (S-35)', () => {
    // WHY: S-35 is FR-002's preprocessing for a name that will not fit a
    // TASK, but FR-085's cut is decided by the panel's width alone.
    const atFloor = panelWith({ truncateUnits: 4 })
    const atCeiling = panelWith({ truncateUnits: 120 })

    expect(keptOf(atFloor, 1)).toBe(keptOf(atCeiling, 1))

    const name = 'x'.repeat(8)
    const title = deepestTitle(1, name, atFloor)

    expect(title.label).toBe(name)
    expect(title.isLabelTruncated).toBe(false)
  })

  it('MUST NOT change the room kept for the controls with whether they are drawn (FR-085)', () => {
    // WHY: FR-085 reserves the same room whether or not a control is drawn
    // (the export draws none, EP-4) -- so the room must not move with them.
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

    // WHY: HF-1 puts an expander on every row now, so what still varies is
    // whether a control is armed or spent (FR-029) and whether it is pinned.
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

    // WHY: the room must not move -- one and the same name is cut at one and
    // the same place on all three.
    expect(leaf.label).toBe(withKid.label)
    expect(pinnedLeaf.label).toBe(withKid.label)
  })

  it('does not follow `fontScale` (S-70), which FR-039 carries to S-3 and S-2', () => {
    // WHY: FR-039 names the ruler's font and height as what a reader's font
    // size reaches; S-36 is its own key and not among them.
    const small = deepestTitle(1, LONG, panelWith({ fontScale: 'S' }))
    const large = deepestTitle(1, LONG, panelWith({ fontScale: 'L' }))

    expect(large.label).toBe(small.label)
  })
})

describe('UF-63 -- FR-058: a row that was given no name of its own', () => {
  it('shows the name of the `Task` it was derived from (MUST)', () => {
    // WHY: AT-54 makes `label` and `derivedFromTaskUid` never both null, so a
    // row with a null label always has a Task to take its name from (FR-058).
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
    // WHY: AT-27 admits a Task with no name, so this is the one state that
    // leaves the panel with nothing to write.
    const groups = [groupOf({ id: 'g1', label: null, derivedFromTaskUid: 7 })]
    const tasks = [taskOf({ uid: 7, name: null })]

    const title = titleOf(panelOf(scheduleOf(groups, tasks), drawn('g1')), 'g1')

    expect(title.label).toBeNull()
    expect(title.isLabelTruncated).toBe(false)
  })
})

describe('UF-63 -- FR-085 (a): the drawing area does not select a row', () => {
  it('leaves every row unselected although things are selected', () => {
    // WHY: SL-1 of table T-023c leaves rows out of the drawing area's
    // selection on purpose -- FR-085's panel selection is a different set.
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
    // WHY: cutting the data would break the lossless round trip FR-021 requires.
    const schedule = scheduleOf([groupOf({ id: 'g1', label: LONG })])

    panelOf(schedule, drawn('g1'))

    expect(schedule.taskGroups[0]?.label).toBe(LONG)
  })

  it('answers the same value for the same values', () => {
    expect(chainPanel(3, LONG)).toEqual(chainPanel(3, LONG))
  })

  it('reads no member of the session but the one SC-1 gives it', () => {
    // WHY: UF-63's row of T-075 gives it one member of `ScreenView` to read;
    // moving everything else the session carries must not move this answer.
    const groups = [groupOf({ id: 'g1', label: 'a' }), groupOf({ id: 'g2', label: 'b' })]
    const schedule = scheduleOf(groups)
    const plain = drawn('g1', 'g2')
    const other: ScreenViewReadings = {
      ...plain,
      openedFileName: null,
      fileSavedAt: null,
      isAgentApiEnabled: true,
      pointer: { x: 12, y: 34 },
      pointerRestedMs: 4000,
      commandPaletteAt: { x: 80, y: 90 },
      notices: [{ manner: 'NT-1', reason: 'refused', affectedCount: 2 }],
    }
    const otherRoot: ScreenSession = {
      ...ROOT,
      screen: {
        ...ROOT.screen,
        language: 'en',
        dialogueFieldDisplayState: { kind: 'shown' },
        propertiesPanelContentState: { kind: 'documentSettingsDisplayed', returnSubject: null },
      },
    }

    expect(panelOf(schedule, other, PANEL, emptySelection(), otherRoot)).toEqual(
      panelOf(schedule, plain),
    )
  })
})

describe('UF-63 -- HF-5 of table T-051: the controls are LEVEL with the top of the name', () => {
  // WHY: HF-5 (MUST) forbids centring or offsetting the controls from the
  // name's top edge, so this unit must hand down no set-down amount at all.
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

// WHY: FR-085 (MUST) puts the chosen set on `ScreenSession.selectedGroupIds`,
// a different set from table T-023c's (still forbidden to a row by SL-1).

// see FR-085
const chose = (
  readings: ScreenViewReadings,
  ...groupIds: readonly string[]
): ScreenViewReadings => ({
  ...readings,
  selectedGroupIds: groupIds,
})

// WHY: a case for "choosing disturbs nothing else" must compare every other
// member by name, or it would go green over a member added later.
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
    // WHY: `g1` and `g10` are two rows -- FR-085 chooses rows by AT-51's
    // `TaskGroup.id`, not a prefix match.
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
    // see S-126
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
  // WHY: FR-098 lifts a pinned row to another PLACE, not a second kind of
  // row, so FR-085's choosing rule has to reach it there too.
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
  // WHY: one scene with every answer in it -- three depths, a name too long
  // to fit, a leaf, a pin, and a hidden row.
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

// WHY: HR-2 also folds the shallowest row, which no row's own column can
// carry (S-211 is unsaved screen state, not schedule content).

// see HF-12, HF-18
const T_051_HF12_THE_HEAD_COUNT = '頭にいま何行を畳み込んでいるかを示すこと（MUST）'
const T_051_HF18_THE_ROW_COUNT =
  '配下に畳み込んでいる行があるとき、その行数を行に示すこと（MUST）'
const T_015_HR2_MAY_EMPTY_THE_PANEL = '押すと行が 1 つも描かれない状態になりうる'
const T_015_HR6_BACK_THROUGH_THE_PARENT =
  '隠した行は、親の行の「配下を 1 階層開く」操作子で戻せること（MUST）'
const T_015_HR6_BACK_THROUGH_LEVEL_ZERO =
  '親を持たない最上位の行は、段 0 の同じ操作子で戻せること（MUST）'

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
    // see HF-12
    expect(says).toContain('`HF-12` が段 0 について定めるものを、行について定めたもの')
  })

  it('⭐ MUST: a folded row shows every row it is holding away, however deep (配下)', () => {
    // WHY: HR-1a (MUST) folds the whole subtree, not just direct children,
    // so folding `p` takes `c1`, `c2` and `g1` off screen -- three held away.
    const panel = panelOf(scheduleOf(FAMILY({ isCollapsed: true })), drawn('p'))

    expect(titleOf(panel, 'p').foldedRowCount).toBe(3)
  })

  it('⛔ a row holding nothing folded shows no count (HF-18 shows one 「配下に畳み込んでいる行があるとき」)', () => {
    const panel = panelOf(scheduleOf(FAMILY()), drawn('p', 'c1', 'c2', 'g1'))

    // WHY: HF-18 asks for a count only when there is something to count, so
    // a row holding nothing must show no count, not a zero.
    for (const row of ['p', 'c1', 'c2', 'g1']) {
      expect(titleOf(panel, row).foldedRowCount ?? 0, `${row} claims to hold rows folded`).toBe(0)
    }
  })

  it('⭐ the count is the FOLD’s and not the roster’s: a drawn subtree holds nothing', () => {
    // WHY: distinguishes the fold's count from a plain descendant count --
    // `c1` folds exactly one row; `q`'s drawn child means `q` holds none.
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

// WHY: HF-18 (MUST NOT) counts only a person's own fold, never rows the
// display amount (FR-018) dropped -- AT-56 is the only column that is one.

const T_051_HF18_ONLY_THE_PERSONS_FOLD = '数えるのは人が畳んだ分だけとすること（MUST）'
const T_051_HF18_NOT_THE_DISPLAY_AMOUNT =
  '表示量（`FR-018`）が落とした行を数えてはならない（MUST NOT）'

describe('UF-63 -- 表 T-051 HF-18 (MUST NOT): the display amount’s rows are not folded rows', () => {
  it('⛔ the manuscript still counts only what a person folded', () => {
    const hf18 = (specTable('T-051').rows.find((one) => one.id === 'HF-18')?.cells ?? []).join(' ')

    expect(hf18).toContain(T_051_HF18_ONLY_THE_PERSONS_FOLD)
    expect(hf18).toContain(T_051_HF18_NOT_THE_DISPLAY_AMOUNT)
    // see HF-7
    const hf7 = (specTable('T-051').rows.find((one) => one.id === 'HF-7')?.cells ?? []).join(' ')
    expect(hf7).toContain('人が畳んだ状態は、表示量の増減（`FR-018`）より優先する')
  })

  it('⛔⛔ MUST NOT: a row nobody folded shows no count, however few of its rows the frame drew', () => {
    // WHY: `p`, `c1`, `c2`, `g1` are all OPEN, but the frame drew `p` alone
    // (FR-018) -- a unit counting undrawn rows as folded would answer 3.
    const panel = panelOf(scheduleOf(FAMILY()), drawn('p'))

    expect(
      titleOf(panel, 'p').foldedRowCount ?? 0,
      'HF-18 (MUST NOT): the display amount’s rows were counted as folded',
    ).toBe(0)
  })

  it('⭐ the pair that makes it a test: the same three rows, folded by the person, ARE counted', () => {
    // WHY: without this pair, a unit that counts nothing would also pass --
    // only `AT-56` on `p` moved from the fixture above.
    const panel = panelOf(scheduleOf(FAMILY({ isCollapsed: true })), drawn('p'))

    expect(titleOf(panel, 'p').foldedRowCount).toBe(3)
  })

  it('⛔⛔ MUST NOT: the HEAD does not count what the display amount dropped either', () => {
    // WHY: HF-18 says HF-12's rule for level 0 is the same rule stated for a
    // row, so the MUST NOT reaches the head too.
    const panel = panelOf(scheduleOf(FAMILY()), readingsWith({ rowBoxes: [] }))

    expect(
      panel.foldedRowCount ?? 0,
      'HF-12 / HF-18 (MUST NOT): the head counted rows the display amount dropped',
    ).toBe(0)
  })

  it('⛔ MUST: a row separates the two in one picture -- its own fold counted, the dropped rows not', () => {
    // WHY: `c1` is folded by the person over `g1`; `c2` is open but the frame
    // did not draw it -- one picture, two reasons a row is missing.
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
    // WHY: `p` is read as a range since HF-18 does not settle this, but `c2`
    // was dropped by the display amount and must not be in the answer either way.
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
    // see S-211
    expect(hr2).toContain('`S-211`')
    const s211 = (specTable('T-206').rows.find((one) => one.id === 'S-211')?.cells ?? []).join(' ')
    expect(s211).toContain('段 0（行見出しパネルの頭）が畳まれているか')
    expect(s211).toContain('保存しない')
  })

  it('⭐⭐ MUST: with 段 0 folded the panel describes NO row at all (HR-2: 押すと行が 1 つも描かれない状態になりうる)', () => {
    const panel = panelOf(
      scheduleOf(FAMILY()),
      readingsWith({ rowBoxes: [] }),
      PANEL,
      emptySelection(),
      LEVEL_ZERO_FOLDED,
    )

    expect(panel.titles, 'a row was described although 段 0 is folded').toEqual([])
    expect(panel.pinnedTitles, 'a pinned row was described although 段 0 is folded').toEqual([])
  })

  it('⭐⭐ MUST: and the head says how many rows it is holding (HF-12: 示さないと、行が消えたのか畳まれたのかが読めない)', () => {
    const panel = panelOf(
      scheduleOf(FAMILY()),
      readingsWith({ rowBoxes: [] }),
      PANEL,
      emptySelection(),
      LEVEL_ZERO_FOLDED,
    )

    // WHY: HR-1a holds everything under the shallowest row away with it, so
    // the whole document (four rows) is what the folded head is holding.
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
      readingsWith({ rowBoxes: [] }),
      PANEL,
      emptySelection(),
      LEVEL_ZERO_FOLDED,
    )
    const open = panelOf(scheduleOf(FAMILY()), drawn('p', 'c1', 'c2', 'g1'))

    expect(folded.canCloseEveryRow, 'a folded 段 0 can be folded again').toBe(false)
    // WHY: with the head open there is always level 0 itself left to fold.
    expect(open.canCloseEveryRow, 'an open panel has nothing to fold').toBe(true)
  })
})

describe('UF-63 -- 表 T-015 HR-6 (MUST): the way back from a hide is an opening control', () => {
  it('⛔ the manuscript still sends a hidden row back through HF-13, and a top-level one through HF-16', () => {
    const hr6 = (specTable('T-015').rows.find((one) => one.id === 'HR-6')?.cells ?? []).join(' ')

    expect(hr6).toContain(T_015_HR6_BACK_THROUGH_THE_PARENT)
    expect(hr6).toContain(T_015_HR6_BACK_THROUGH_LEVEL_ZERO)
    // WHY: this also forbids the old reading's destination -- a hidden-group
    // tab that never existed in the implementation (retired 2026-08-30).
    expect(hr6).toContain('戻すための専用の面や札を設けてはならない（MUST NOT）')
    expect(hr6).toContain('表 T-051 の `HF-13` である')
    expect(hr6).toContain('同表の `HF-16` である')
  })

  it('⭐ MUST: a row whose child is HIDDEN arms its own 「配下を 1 階層開く」 (HR-6 through HF-13)', () => {
    // WHY: HF-13 (MUST) is a separate entrance from HF-2's deep opener, so
    // `RowTitle.canOpenOneLevel` -- not a flag on `RowExpander` -- says whether it has work.
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
    // WHY: HF-16 (MUST) sends a parentless top-level row back through the
    // head's own control, since it has no parent's control to come back through.
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
      readingsWith({ rowBoxes: [] }),
      PANEL,
      emptySelection(),
      LEVEL_ZERO_FOLDED,
    )
    const open = panelOf(scheduleOf(FAMILY()), drawn('p', 'c1', 'c2', 'g1'))

    expect(folded.canOpenLevelZero, 'the folded head has no way back').toBe(true)
    // WHY: with the head open and nothing hidden at the shallowest level,
    // the head's one-level open has nothing to do.
    expect(open.canOpenLevelZero ?? false, 'the head control is armed with nothing to open').toBe(
      false,
    )
  })
})
