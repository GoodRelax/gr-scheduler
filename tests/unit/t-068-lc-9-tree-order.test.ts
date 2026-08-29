// Table T-068's LC-9: the order the rows are laid out in.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification section 1).
//
// THE LINES THIS FILE RESTS ON
//
//   T-068 LC-9 (docs/spec/05-07-design.md:541)
//     「行を木の順に並べ、帯高と縦位置を決める | 段数・行の親子 |
//      表 T-014 の `ST-9` ／ `AT-55`」
//
//   the prose printed directly after table T-068 (docs/spec/05-07-design.md:550)
//     「**`LC-9` が行を並べる順は木の順とすること（MUST）** —— 親の行の直下に
//      その配下を置き、同じ親の下では `_assets/fig-erd-detail.md` の `AT-55`
//      の昇順に並べる。**深さの順に並べてはならない（MUST NOT）** —— 同じ深さ
//      の行が塊になり、**親とその配下が画面の離れた場所に出る。**」
//
//   AT-55 (docs/spec/_assets/fig-erd-detail.md:357)
//     「| AT-55 | `TaskGroup` | `order` | 整数 | 否 | — | GRS | — |
//      同じ親の下での並び |」
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * 「行の縞（`FR-042`）が数える「行の位置」も、この順での位置とすること
//     (MUST)」. The stripe is drawn, not laid out, and `ScheduleLayout`
//     publishes no stripe index -- so this file has no honest way to ask it.
//   * WHAT ORDER TWO SIBLINGS CARRYING THE SAME `order` COME OUT IN. AT-55 is
//     an ordinary integer column with no uniqueness rule anywhere in
//     docs/spec, and no line says what breaks a tie -- so no case below builds
//     one.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  groupDepthLimit,
  layoutFromSchedule,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  rulerHeight: 48, // S-2
  scrollDate: '2026-01-01', // S-77
  stackDirection: 'down', // S-58, so every y reads from the top of the band
  // ⚠️ `SETTINGS_DEFAULTS` publishes this one under dotted keys, so the nested
  // object has to be spelled here or the layout reads `undefined`. No case
  // below asserts a height, and every row of the fixture is empty -- LF-2
  // gives such a row one rectangle lane.
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

/** One row of the forest below: its id, its parent and its `order` (AT-55). */
interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
}

/**
 * A forest whose TREE order and whose DEPTH order are different sequences.
 *
 * ⭐ THAT DIFFERENCE IS THE WHOLE POINT. The prose after table T-068 states a
 * MUST and a MUST NOT about the same list, so a fixture whose two orders
 * coincided would leave the MUST NOT unmeasured -- the case would pass on a
 * layout that sorted by depth.
 *
 * ⚠️ EVERY `order` IS WRITTEN OUT OF STEP WITH THE DECLARATION ORDER, so that
 * a layout which simply kept the array order would not be mistaken for one
 * that read AT-55.
 */
const FOREST: readonly Row[] = [
  { id: 'a', parentId: null, order: 1 },
  { id: 'a2', parentId: 'a', order: 1 },
  { id: 'a1', parentId: 'a', order: 0 },
  { id: 'b', parentId: null, order: 0 },
  { id: 'b1', parentId: 'b', order: 0 },
]

/** 「親の行の直下にその配下を置き、同じ親の下では `AT-55` の昇順に並べる」. */
const TREE_ORDER = ['b', 'b1', 'a', 'a1', 'a2'] as const

/** The order the MUST NOT forbids: every depth 1 row, then every depth 2 row. */
const DEPTH_ORDER = ['b', 'a', 'b1', 'a1', 'a2'] as const

const scheduleOf = (rows: readonly Row[]): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      order: row.order,
      height: null,
    })),
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
  }) as unknown as Schedule

const laidOut = (rows: readonly Row[] = FOREST): readonly string[] =>
  layoutFromSchedule(scheduleOf(rows), SETTINGS, REGIONS).rows.map((row) => row.groupId)

// ---------------------------------------------------------------------------

describe('table T-068 LC-9 -- the rows come out in TREE order', () => {
  it('draws both levels of the fixture, or every case below would be asking about one', () => {
    // ⚠️ LC-2 runs before LC-9 and drops rows the group LOD does not admit
    // (FR-018), so a depth the ladder shuts out would never reach LC-9 at all.
    expect(groupDepthLimit(SETTINGS)).toBeGreaterThanOrEqual(2)
    expect([...laidOut()].sort()).toEqual([...FOREST.map((row) => row.id)].sort())
  })

  it('⭐ puts each row directly above its own descendants (MUST)', () => {
    expect(laidOut()).toEqual([...TREE_ORDER])
  })

  it('⛔ does NOT put the rows in depth order (MUST NOT)', () => {
    // 「深さの順に並べてはならない（MUST NOT）」. Stated against the sequence the
    // prohibition names, so the case fails on a layout that sorts by depth even
    // though such a layout still answers every row exactly once.
    expect(laidOut()).not.toEqual([...DEPTH_ORDER])
  })

  it('sorts the children of one parent by AT-55 ascending, and not by declaration order', () => {
    // AT-55 is 「同じ親の下での並び」. `a1` is declared after `a2` and carries the
    // lower `order`, so a layout that kept the array order would answer a2, a1.
    const under = (parentId: string): readonly string[] =>
      laidOut().filter((id) => FOREST.find((row) => row.id === id)?.parentId === parentId)

    expect(under('a')).toEqual(['a1', 'a2'])
  })

  it('sorts the roots by AT-55 ascending as well', () => {
    // 「同じ親の下では」 covers the roots too: their common parent is `null`
    // (AT-25's reading of a root), and `b` carries the lower `order`.
    const roots = laidOut().filter(
      (id) => FOREST.find((row) => row.id === id)?.parentId === null,
    )

    expect(roots).toEqual(['b', 'a'])
  })

  it('follows AT-55 rather than the identifier, so renaming the rows does not move them', () => {
    // ⛔ `b` before `a` is alphabetical as well as ascending in `order`, which
    // would leave the case above green on a layout that sorted by id. Swapping
    // the two `order` values must swap the two roots.
    const swapped = FOREST.map((row) =>
      row.parentId === null ? { ...row, order: row.order === 0 ? 1 : 0 } : row,
    )

    expect(laidOut(swapped)).toEqual(['a', 'a1', 'a2', 'b', 'b1'])
  })

  it('vertical position follows the same order: each row sits below the one before it', () => {
    // LC-9 decides 「帯高と縦位置」 in the same step, so the order asserted above
    // is the order a person sees down the screen -- not merely the order of an
    // array that something else could re-sort.
    const laid = layoutFromSchedule(scheduleOf(FOREST), SETTINGS, REGIONS).rows

    for (let index = 1; index < laid.length; index += 1) {
      const above = laid[index - 1]
      const below = laid[index]
      expect(below?.y, `${below?.groupId} sits below ${above?.groupId}`).toBeGreaterThan(
        above?.y as number,
      )
    }
  })

  it('⚠️ a row LC-1 dropped leaves the order of the rest alone', () => {
    // 「⚠️ `LC-1` と `LC-2` が落とした行は、この順から抜けるだけである —— 残った
    // 行どうしの前後は変わらない」. HF-7 has LC-1 drop what a person hid.
    const hidden = FOREST.map((row) => ({ ...row }))
    const schedule = scheduleOf(hidden) as unknown as {
      taskGroups: { id: string; isHidden?: boolean | null }[]
    }
    for (const group of schedule.taskGroups) {
      if (group.id === 'b1') group.isHidden = true
    }

    const order = layoutFromSchedule(
      schedule as unknown as Schedule,
      SETTINGS,
      REGIONS,
    ).rows.map((row) => row.groupId)

    expect(order).toEqual(TREE_ORDER.filter((id) => id !== 'b1'))
  })
})

describe('the specification still says what these cases copy', () => {
  it('table T-068 still has LC-9, and still names AT-55 as its source', () => {
    // Chapter 1.9 (:275): a test that verifies a requirement pointing at a
    // table is driven by that table.
    const design = readSpec('05-07-design.md')
    expect(design).toContain('| LC-9 |')
    expect(design).toContain('`LC-9` が行を並べる順は木の順とすること（MUST）')
    expect(design).toContain('深さの順に並べてはならない（MUST NOT）')
    expect(design).toContain('`AT-55` の昇順に並べる')
  })
})

// ⚠️ Read at run time rather than copied, so the quotations above cannot fall
// behind the manuscript the way a hand-written copy does.
function readSpec(name: string): string {
  return readFileSync(join(process.cwd(), 'docs', 'spec', name), 'utf8')
}
