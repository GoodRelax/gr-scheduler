// CR-772 spec-only cases: one drag picks a gap by the rows' midpoints and a depth by the sideways travel (HF-15, UF-97).

import { describe, expect, it } from 'vitest'

import {
  commandFromRowGrab,
  taskGroupGrabFollow,
  taskGroupGrabScrollSpeedAt,
} from '../../src/adapter/input-command-translator/task-group-grab'
import * as clause from './cr-772-clauses'
import {
  DESIGN,
  REQUIREMENTS,
  S_125,
  S_208,
  S_597,
  S_598,
  boxOf,
  contextOf,
  documentOf,
  landingAt,
  placedBy,
  placementIn,
  pointerAt,
  pressOn,
  releaseAt,
  under,
  writesOf,
} from './cr-772-stage'

const REQUIREMENT_CLAUSES: readonly string[] = [
  clause.HF_15_ONE_DRAG,
  clause.HF_15_NO_AXIS,
  clause.HF_15_CARRY_START,
  clause.HF_15_CHOOSE_ONLY,
  clause.HF_15_GAP,
  clause.HF_15_GAP_MIDPOINT,
  clause.HF_15_DEPTH,
  clause.HF_15_DEPTH_ROUNDED,
  clause.HF_15_RANGE,
  clause.HF_15_NOT_SHALLOWER,
  clause.HF_15_CAP,
  clause.HF_15_STOP_AT_END,
  clause.HF_15_NO_PLACE,
  clause.HF_15_PARENT,
  clause.HF_15_ORDER,
  clause.HF_15_FIRST_CHILD,
  clause.HF_15_FOLDED,
  clause.HF_15_FOLDED_LAST,
  clause.HF_15_UNDRAWN,
  clause.HF_15_BETWEEN,
  clause.HF_15_WITH_DESCENDANTS,
  clause.HF_15_ONLY_THE_GRABBED,
  clause.HF_15_NO_WRITE_IN_PLACE,
  clause.HF_15_ONE_WRITE,
  clause.HF_15_ESCAPE,
  clause.HF_15_EDGE_SCROLL,
  clause.HF_15_SPEED,
  clause.HF_15_WHEEL,
  clause.HF_15_RESELECT,
  clause.HM_3A_GRAB_NOTE,
  clause.UC_002_2A_GRAB,
]

describe('CR-772 -- the manuscript these cases are driven by', () => {
  it.each(REQUIREMENT_CLAUSES.map((one) => [one.slice(0, 40), one] as const))('still says it, word for word: %s', (_name, text) => {
    expect(REQUIREMENTS).toContain(text)
  })

  it('UF-97 turns the landing (gap and depth) into the parent-and-order write', () => {
    expect(DESIGN).toContain(clause.UF_97_ROW)
  })

  it('the numbers the cases read are the settings table values, not zero', () => {
    expect([S_208, S_597, S_598, S_125].every((one) => one > 0)).toBe(true)
  })
})

describe('HF-15 -- the gap is counted by the rows midpoints, and the held subtree is not counted', () => {
  it('the gap is the one just above the first row whose midpoint is below the pointer, and the line is drawn there', () => {
    const justAbove = boxOf('A2').y + boxOf('A2').height / 2 - 1
    const justBelow = justAbove + 2
    expect(landingAt('B', 0, justAbove)?.gapY).toBe(under('A1x'))
    expect(landingAt('B', 0, justBelow)?.gapY).toBe(under('A2'))
  })

  it('rows of different heights (FR-042) are cut at their own midpoints', () => {
    const scene = { heights: { A2: 60 } }
    const mid = boxOf('A2', scene).y + 30
    expect(landingAt('B', 0, mid - 1, scene)?.gapY).toBe(under('A1x', scene))
    expect(landingAt('B', 0, mid + 1, scene)?.gapY).toBe(under('A2', scene))
  })

  it('above the top row and below the bottom row are gaps too', () => {
    const top = landingAt('B', 0, 0)
    expect(top?.gapY).toBe(boxOf('A').y)
    expect(placedBy('B', releaseAt('B', 0, 0))).toMatchObject({ parentId: null, previous: null, next: 'A', depth: 1 })
    const bottom = landingAt('B', 0, 10000)
    expect(bottom?.gapY).toBe(under('E3'))
    expect(placedBy('B', releaseAt('B', 0, 10000))).toMatchObject({ parentId: null, previous: 'E', depth: 1 })
  })

  it('the held task group and its descendants are not counted, so a gap inside them is the gap before them', () => {
    const before = landingAt('A2', 0, under('A1x'))
    expect(landingAt('A2', 0, boxOf('A2a').y + 1)).toEqual(before)
    expect(landingAt('A2', 0, under('A2a'))).toEqual(before)
  })

  it('a task group can not be dropped under its own descendant: the deepest parent offered is the last row not held', () => {
    expect(placedBy('A2', releaseAt('A2', 9, under('A2a'))).parentId).toBe('A1x')
  })
})

describe('HF-15 -- the depth is the sideways travel over the drawn indent, rounded, kept inside the range of the gap', () => {
  const GAP_AFTER_A2A = under('A2a')

  it.each([
    [1, 'A', 'A2', 2],
    [2, 'A2', 'A2a', 3],
    [3, 'A2a', null, 4],
  ])('B pulled %i indents sideways after A2a is put under %s, behind %s, at depth %i', (steps, parentId, previous, depth) => {
    expect(placedBy('B', releaseAt('B', steps, GAP_AFTER_A2A))).toMatchObject({ parentId, previous, depth })
  })

  it.each([4, 9])('pulling %i indents stops silently at the deepest depth of the gap and says nothing', (steps) => {
    const result = releaseAt('B', steps, GAP_AFTER_A2A)
    expect(result.action?.kind).toBe('changeDocument')
    expect(placedBy('B', result)).toMatchObject({ parentId: 'A2a', depth: 4 })
    expect(landingAt('B', steps, GAP_AFTER_A2A)?.depth).toBe(4)
  })

  it.each([0, -1, -4])('pulling %i indents (none, or the other way) stops at depth 1, behind A, which is where B already stands', (steps) => {
    expect(landingAt('B', steps, GAP_AFTER_A2A)).toMatchObject({ parentId: null, depth: 1 })
    expect(releaseAt('B', steps, GAP_AFTER_A2A).action).toBeNull()
  })

  it('a gap under a task group with children below it takes only the depth of what is below: never shallower, the first child', () => {
    const gap = under('A')
    for (const steps of [-3, 0, 5]) {
      expect(placedBy('B', releaseAt('B', steps, gap))).toMatchObject({ parentId: 'A', previous: null, next: 'A1', depth: 2 })
    }
  })

  it('the steps count from the depth the held task group has now', () => {
    const bottom = 10000
    expect(placedBy('A2a', releaseAt('A2a', 0, bottom))).toMatchObject({ parentId: 'E1', previous: 'E2', depth: 3 })
    expect(placedBy('A2a', releaseAt('A2a', 2, bottom))).toMatchObject({ parentId: 'E3', previous: null, depth: 5 })
    expect(placedBy('A2a', releaseAt('A2a', 9, bottom)).depth).toBe(5)
    expect(placedBy('A2a', releaseAt('A2a', -2, bottom))).toMatchObject({ parentId: null, previous: 'E', depth: 1 })
  })

  it('the travel is rounded to the nearest indent, not cut down', () => {
    const bottom = 10000
    expect(landingAt('A2a', 0.4, bottom)?.depth).toBe(3)
    expect(landingAt('A2a', 0.6, bottom)?.depth).toBe(4)
    expect(landingAt('A2a', -0.4, bottom)?.depth).toBe(3)
    expect(landingAt('A2a', -0.6, bottom)?.depth).toBe(2)
  })

  it('the line starts at the indent of the chosen depth', () => {
    const one = landingAt('A2a', 0, 10000)
    const two = landingAt('A2a', 1, 10000)
    expect(one).not.toBeNull()
    expect((two?.lineIndentPx ?? 0) - (one?.lineIndentPx ?? 0)).toBeGreaterThan(0)
    expect(landingAt('A2a', -2, 10000)?.lineIndentPx).toBeLessThan(one?.lineIndentPx ?? 0)
  })
})

describe('HF-15 -- the deepest depth keeps the whole subtree inside FR-004 and is not announced (HM-3a)', () => {
  it('B and B1 are put at the deepest gap: B1 ends at the limit, never past it', () => {
    const placed = placedBy('B', releaseAt('B', 9, 10000))
    expect(placed).toMatchObject({ parentId: 'E2', previous: 'E3', depth: 4 })
    expect(placementIn(placed.after, 'B1').depth).toBe(S_125)
  })

  it('a task group with a deep subtree is held shallower than the row above allows', () => {
    const placed = placedBy('E', releaseAt('E', 9, under('A2a')))
    expect(placed).toMatchObject({ parentId: 'A', previous: 'A2', depth: S_125 - 4 + 1 })
    expect(placementIn(placed.after, 'E3').depth).toBe(S_125)
  })

  it('a gap with no depth left writes nothing, and the follow has no line to draw', () => {
    const gap = under('E2')
    expect(landingAt('A', 9, gap)).toBeNull()
    expect(landingAt('A', 0, gap)).toBeNull()
    expect(writesOf(releaseAt('A', 9, gap))).toEqual([])
    expect(releaseAt('A', 9, gap).action).toBeNull()
  })
})

describe('HF-15 -- the parent is the first row met going up, and the order follows the branch of the row above', () => {
  it('a gap behind a hidden sibling lands right after the row above, before the hidden row', () => {
    const gap = under('A1x')
    expect(placedBy('B', releaseAt('B', 0, gap))).toMatchObject({ parentId: 'A', previous: 'A1', next: 'Ah', depth: 2 })
    expect(placedBy('B', releaseAt('B', 2, gap))).toMatchObject({ parentId: 'A1', previous: 'A1x', depth: 3 })
    expect(placedBy('B', releaseAt('B', 3, gap))).toMatchObject({ parentId: 'A1x', previous: null, depth: 4 })
  })

  it('under a folded task group the next depth is its last child, and it stays folded', () => {
    const gap = under('C')
    expect(placedBy('B', releaseAt('B', 0, gap))).toMatchObject({ parentId: null, previous: 'C', next: 'D', depth: 1 })
    const inside = placedBy('B', releaseAt('B', 1, gap))
    expect(inside).toMatchObject({ parentId: 'C', previous: 'C1', next: null, depth: 2 })
    expect(placementIn(inside.after, 'C').treeState).toBe('collapsed')
  })

  it('task groups lifted to the panel head are not counted as gaps', () => {
    const scene = { pinned: ['A1x'] }
    const pointerOverPinned = boxOf('A1x', scene).y + boxOf('A1x', scene).height / 2 + 6
    expect(landingAt('B', 9, pointerOverPinned, scene)).toMatchObject({ depth: 1, gapY: boxOf('A', scene).y })
    expect(placedBy('B', releaseAt('B', 9, pointerOverPinned, scene), scene)).toMatchObject({ parentId: null, previous: null, next: 'A' })
  })
})

describe('HF-15 -- the release writes once, or not at all', () => {
  it('a release where the task group already stands writes nothing', () => {
    expect(releaseAt('B', 0, under('A2a')).action).toBeNull()
  })

  it('a release elsewhere writes exactly one move of the grabbed task group, and its descendants go with it', () => {
    const result = releaseAt('B', 0, under('C'))
    const writes = writesOf(result)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ kind: 'moveTaskGroup', taskGroupId: 'B' })
    const placed = placedBy('B', result)
    expect(placementIn(placed.after, 'B1')).toMatchObject({ parentId: 'B', depth: placed.depth + 1 })
  })

  it('a grab pulled deeper keeps the descendants one level below it', () => {
    const placed = placedBy('B', releaseAt('B', 2, under('A2a')))
    expect(placed.depth).toBe(3)
    expect(placementIn(placed.after, 'B1').depth).toBe(4)
  })

  it('a release within S-208 of the press only chooses the task group', () => {
    const press = pressOn('B', false)
    const near = { ...pointerAt(0, 0, 'up'), x: press.at.x + 2, y: press.at.y + 2 }
    const result = commandFromRowGrab(near, press, contextOf({}, press), 'B')
    expect(result.action).toMatchObject({ kind: 'chooseTaskGroup', taskGroupId: 'B' })
  })

  it('a release beyond S-208 writes the move instead of choosing', () => {
    const press = pressOn('B', false)
    const far = { ...pointerAt(0, under('C'), 'up'), y: under('C') }
    const result = commandFromRowGrab(far, press, contextOf({}, press), 'B')
    expect(writesOf(result)).toHaveLength(1)
  })

  it('the follow starts only beyond S-208, and then carries the landing and the scroll speed', () => {
    const press = pressOn('B', false)
    const context = contextOf({}, press)
    const near = { ...pointerAt(0, 0), x: press.at.x + 2, y: press.at.y + 2 }
    expect(taskGroupGrabFollow(near, context).action).toBeNull()
    const moved = pointerAt(1, under('A2a'))
    const action = taskGroupGrabFollow(moved, context).action as unknown as { kind: string; taskGroupId: string; landing: unknown; scrollSpeed: number }
    expect(action.kind).toBe('followTaskGroupGrab')
    expect(action.taskGroupId).toBe('B')
    expect(action.landing).toEqual(landingAt('B', 1, under('A2a')))
    expect(typeof action.scrollSpeed).toBe('number')
  })
})

describe('HF-15 -- the panel is sent up and down from the edges, faster the nearer the edge', () => {
  const TOP = 100
  const BOTTOM = 500

  it('is 0 at the inner end of the band, and in the middle of the panel', () => {
    expect(taskGroupGrabScrollSpeedAt(TOP + S_597, TOP, BOTTOM)).toBe(0)
    expect(taskGroupGrabScrollSpeedAt(BOTTOM - S_597, TOP, BOTTOM)).toBe(0)
    expect(taskGroupGrabScrollSpeedAt(300, TOP, BOTTOM)).toBe(0)
  })

  it('is the fastest speed at the edge and beyond it, upward at the top and downward at the bottom', () => {
    for (const y of [TOP, TOP - 50]) expect(taskGroupGrabScrollSpeedAt(y, TOP, BOTTOM)).toBeCloseTo(-S_598)
    for (const y of [BOTTOM, BOTTOM + 80]) expect(taskGroupGrabScrollSpeedAt(y, TOP, BOTTOM)).toBeCloseTo(S_598)
  })

  it('rises in proportion to the nearness between the two ends', () => {
    expect(taskGroupGrabScrollSpeedAt(TOP + S_597 / 2, TOP, BOTTOM)).toBeCloseTo(-S_598 / 2)
    expect(taskGroupGrabScrollSpeedAt(TOP + S_597 / 4, TOP, BOTTOM)).toBeCloseTo((-S_598 * 3) / 4)
    expect(taskGroupGrabScrollSpeedAt(BOTTOM - S_597 / 2, TOP, BOTTOM)).toBeCloseTo(S_598 / 2)
    expect(taskGroupGrabScrollSpeedAt(BOTTOM - S_597 / 4, TOP, BOTTOM)).toBeCloseTo((S_598 * 3) / 4)
  })

  it('the document the cases drive is the one the tree was built for', () => {
    expect(documentOf().schedule.taskGroups).toHaveLength(15)
  })
})
