// Table T-068's LC-9: rows come out in tree order, not depth order, siblings sorted by AT-55.

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

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  rulerHeight: 48, // see S-2
  scrollDate: '2026-01-01', // see S-77
  stackDirection: 'down', // see S-58
  // WHY: SETTINGS_DEFAULTS publishes this under dotted keys, so the nested
  // object must be spelled out here or the layout reads undefined.
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

// see AT-55
interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
}

// WHY: tree order and depth order differ on purpose, and every order is
// out of step with declaration order, so neither could pass by accident.
const FOREST: readonly Row[] = [
  { id: 'a', parentId: null, order: 1 },
  { id: 'a2', parentId: 'a', order: 1 },
  { id: 'a1', parentId: 'a', order: 0 },
  { id: 'b', parentId: null, order: 0 },
  { id: 'b1', parentId: 'b', order: 0 },
]

// see T-068
const TREE_ORDER = ['b', 'b1', 'a', 'a1', 'a2'] as const

// see T-068
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

describe('table T-068 LC-9 -- the rows come out in TREE order', () => {
  it('draws both levels of the fixture, or every case below would be asking about one', () => {
    // WHY: LC-2 runs before LC-9 and drops rows the group LOD does not
    // admit, so a depth the ladder shuts out would never reach LC-9.
    expect(groupDepthLimit(SETTINGS)).toBeGreaterThanOrEqual(2)
    expect([...laidOut()].sort()).toEqual([...FOREST.map((row) => row.id)].sort())
  })

  it('⭐ puts each row directly above its own descendants (MUST)', () => {
    expect(laidOut()).toEqual([...TREE_ORDER])
  })

  it('⛔ does NOT put the rows in depth order (MUST NOT)', () => {
    // WHY: stated against the exact sequence the prohibition names, so
    // this fails even on a layout that still answers every row once.
    expect(laidOut()).not.toEqual([...DEPTH_ORDER])
  })

  it('sorts the children of one parent by AT-55 ascending, and not by declaration order', () => {
    // WHY: a1 is declared after a2 but carries the lower order, so array
    // order alone would answer a2, a1 instead.
    const under = (parentId: string): readonly string[] =>
      laidOut().filter((id) => FOREST.find((row) => row.id === id)?.parentId === parentId)

    expect(under('a')).toEqual(['a1', 'a2'])
  })

  it('sorts the roots by AT-55 ascending as well', () => {
    // WHY: the roots share a null parent too, and b carries the lower
    // order.
    const roots = laidOut().filter(
      (id) => FOREST.find((row) => row.id === id)?.parentId === null,
    )

    expect(roots).toEqual(['b', 'a'])
  })

  it('follows AT-55 rather than the identifier, so renaming the rows does not move them', () => {
    // WHY: b before a is alphabetical too, so a layout sorting by id
    // would also pass; swapping the order values must swap the roots.
    const swapped = FOREST.map((row) =>
      row.parentId === null ? { ...row, order: row.order === 0 ? 1 : 0 } : row,
    )

    expect(laidOut(swapped)).toEqual(['a', 'a1', 'a2', 'b', 'b1'])
  })

  it('vertical position follows the same order: each row sits below the one before it', () => {
    // WHY: LC-9 decides height and position in the same step, so this is
    // the order a person actually sees down the screen.
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
    // WHY: a dropped row only drops out of this order; the rest keep
    // their relative order unchanged.
    const hidden = FOREST.map((row) => ({ ...row }))
    const schedule = scheduleOf(hidden) as unknown as {
      taskGroups: { id: string; treeState?: string | null }[]
    }
    for (const group of schedule.taskGroups) {
      if (group.id === 'b1') group.treeState = 'hidden'
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
    const design = readSpec('05-07-design.md')
    expect(design).toContain('| LC-9 |')
    expect(design).toContain('`LC-9` が行を並べる順は木の順とすること（MUST）')
    expect(design).toContain('深さの順に並べてはならない（MUST NOT）')
    expect(design).toContain('`AT-55` の昇順に並べる')
  })
})

// WHY: read at run time rather than copied, so quotations above cannot
// fall behind the manuscript the way a hand-written copy would.
function readSpec(name: string): string {
  return readFileSync(join(process.cwd(), 'docs', 'spec', name), 'utf8')
}
