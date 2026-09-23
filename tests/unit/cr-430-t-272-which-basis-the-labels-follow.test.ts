// FR-109 table T-272: which of actual, dummy and plan the labels are hung on.

import { describe, expect, it } from 'vitest'

import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  EPS,
  MARKER_D,
  S_180,
  S_247,
  bandOf,
  bandOfRect,
  cellOf,
  day,
  rowOf,
  sceneOf,
  taskOf,
  type Scene,
} from './cr-430-cross-section-scene'

const SHOWN = '実績を表示'
const BASIS = '札の基準'

// WHY: the whole cell as written; bare() would reduce RF-1's basis to the one id it names (DM-3).
const textOf = (row: string, heading: string): string => rowOf('T-272', row).by[heading] ?? ''

const says = (row: string): string =>
  `T-272 ${row} [${SHOWN}: ${cellOf('T-272', row, SHOWN)}] ` +
  `${BASIS}: ${textOf(row, BASIS)}`

const RF_3_HIDING_BOTH =
  '予定も実績も隠したときは、形を描かず、札は予定の位置に置く（`RF-3`） —— 予定を隠しても札の基準は予定である。'
const FR_108_NOTHING_UNDRAWN_IS_GRABBED =
  '`GRS` は、そのフレームで描いていない編集対象 —— 表示を切り替えて隠した予定・実績・依存線・進捗マーカー・再開アイコン'
const DM_1_THE_DUMMY_STANDS_ON_THE_PLAN_START =
  'ダミーを描く位置は、予定の開始日とすること（MUST）。'

const NAME = 'ab'

// see S-63
const scene = (over: Readonly<Record<string, unknown>>, settings: Readonly<Record<string, unknown>> = {}): Scene =>
  sceneOf({
    tasks: [taskOf({ name: NAME, start: day(2), finish: day(28), ...over })],
    shapeKind: 'rectangle',
    settings: { progressMarkerVisible: true, ...settings },
  })

const milestoneScene = (
  over: Readonly<Record<string, unknown>>,
  settings: Readonly<Record<string, unknown>> = {},
): Scene =>
  sceneOf({
    tasks: [taskOf({ name: NAME, start: day(6), finish: day(6), milestone: true, ...over })],
    shapeKind: 'milestone',
    settings: { progressMarkerVisible: true, ...settings },
  })

const mustBe = <T>(value: T | null | undefined, what: string): T => {
  expect(value, `premise: ${what}`).not.toBeNull()
  expect(value, `premise: ${what}`).not.toBeUndefined()
  return value as T
}

const labelSpotOf = (one: Scene): { readonly marker: number; readonly name: number } => {
  const drawn = one.taskOf(1)
  return {
    marker: mustBe(drawn.marker, 'a marker is drawn').centre.x,
    name: mustBe(drawn.label, 'a name is drawn').x,
  }
}

const RUNNING = { actualStart: day(4), stop: day(12), resumeValid: true, percentComplete: 40 }
const RUNNING_LATER = { actualStart: day(8), stop: day(16), resumeValid: true, percentComplete: 40 }

describe(`T-272 RF-1 -- ${says('RF-1')}`, () => {
  it('moves the labels with the actual', () => {
    const here = labelSpotOf(scene(RUNNING))
    const later = labelSpotOf(scene(RUNNING_LATER))
    expect(later.marker, says('RF-1')).not.toBeCloseTo(here.marker, 6)
    expect(later.name, says('RF-1')).not.toBeCloseTo(here.name, 6)
    const drawnHere = scene(RUNNING).taskOf(1)
    const drawnLater = scene(RUNNING_LATER).taskOf(1)
    const actualHere = bandOf(mustBe(drawnHere.actual, 'an actual'))
    const actualLater = bandOf(mustBe(drawnLater.actual, 'an actual'))
    expect(later.marker - here.marker, says('RF-1')).toBeCloseTo(actualLater.left - actualHere.left, 6)
  })

  it('leaves the labels where they are when only the plan moves', () => {
    const here = labelSpotOf(scene(RUNNING))
    const widerPlan = labelSpotOf(scene({ ...RUNNING, start: day(3), finish: day(27) }))
    expect(widerPlan.marker, says('RF-1')).toBeCloseTo(here.marker, 6)
    expect(widerPlan.name, says('RF-1')).toBeCloseTo(here.name, 6)
  })

  it('holds the dummy in the same row: a not-started actual is the dummy', () => {
    expect(textOf('RF-1', BASIS), says('RF-1')).toContain('実績（ダミーを含む')
  })

  it('hangs the labels on the dummy, which stands on the plan start', () => {
    const here = scene({})
    const dummy = mustBe(here.taskOf(1).dummies[0], 'a not-started task draws a dummy')
    const spot = labelSpotOf(here)
    const plan = bandOf(mustBe(here.taskOf(1).plan, 'a plan'))
    expect(dummy.ink.x, `${says('RF-1')} -- ${DM_1_THE_DUMMY_STANDS_ON_THE_PLAN_START}`).toBeCloseTo(plan.left, 6)
    expect(spot.marker - dummy.ink.x, says('RF-1')).toBeGreaterThanOrEqual(0)
    const later = scene({ start: day(6) })
    const laterDummy = mustBe(later.taskOf(1).dummies[0], 'a dummy')
    const laterSpot = labelSpotOf(later)
    expect(laterSpot.marker - spot.marker, says('RF-1')).toBeCloseTo(laterDummy.ink.x - dummy.ink.x, 6)
  })

  it('gives the dummy the width table T-240 DM-3 sets', () => {
    const here = scene({})
    const dummy = mustBe(here.taskOf(1).dummies[0], 'a dummy')
    expect(dummy.ink.width, says('RF-1')).toBeCloseTo(Math.min(MARKER_D * S_247, S_180), 6)
  })

  it('gives a milestone a dummy diamond to hang its labels on', () => {
    const here = milestoneScene({})
    const dummy = mustBe(here.taskOf(1).dummies[0], 'a not-started milestone draws a dummy')
    const ink = bandOfRect(dummy.ink)
    expect(ink.height, says('RF-1')).toBeCloseTo(ink.right - ink.left, 6)
    const marker = mustBe(here.taskOf(1).marker, 'a marker')
    expect(marker.centre.x - marker.radius, says('RF-1')).toBeCloseTo(ink.right, 6)
  })
})

describe(`T-272 RF-3 -- ${says('RF-3')}`, () => {
  it('hangs the labels on the plan once the actual is hidden', () => {
    const hidden = scene(RUNNING, { actualVisible: false })
    const drawn = hidden.taskOf(1)
    expect(drawn.actual, `premise: ${says('RF-3')}`).toBeNull()
    const plan = bandOf(mustBe(drawn.plan, 'a plan'))
    const spot = labelSpotOf(hidden)
    const wider = scene({ ...RUNNING, start: day(3) }, { actualVisible: false })
    const widerPlan = bandOf(mustBe(wider.taskOf(1).plan, 'a plan'))
    const widerSpot = labelSpotOf(wider)
    expect(widerSpot.marker - spot.marker, says('RF-3')).toBeCloseTo(widerPlan.left - plan.left, 6)
  })

  it('does not move the labels when only the actual moves while it is hidden', () => {
    const here = labelSpotOf(scene(RUNNING, { actualVisible: false }))
    const later = labelSpotOf(scene(RUNNING_LATER, { actualVisible: false }))
    expect(later.marker, says('RF-3')).toBeCloseTo(here.marker, 6)
    expect(later.name, says('RF-3')).toBeCloseTo(here.name, 6)
  })

  it(RF_3_HIDING_BOTH, () => {
    const both = scene(RUNNING, { actualVisible: false, planVisible: false })
    const drawn = both.taskOf(1)
    expect(drawn.plan, RF_3_HIDING_BOTH).toBeNull()
    expect(drawn.actual, RF_3_HIDING_BOTH).toBeNull()
    expect(drawn.dummies.length, RF_3_HIDING_BOTH).toBe(0)
    const planOnly = scene(RUNNING, { actualVisible: false })
    expect(labelSpotOf(both).name, RF_3_HIDING_BOTH).toBeCloseTo(labelSpotOf(planOnly).name, 6)
    expect(labelSpotOf(both).marker, RF_3_HIDING_BOTH).toBeCloseTo(labelSpotOf(planOnly).marker, 6)
  })
})

describe(`T-272 and FR-108 -- what is not drawn is not grabbed`, () => {
  it(FR_108_NOTHING_UNDRAWN_IS_GRABBED, () => {
    const shown = scene(RUNNING)
    const hidden = scene(RUNNING, { actualVisible: false })
    const actual = bandOf(mustBe(shown.taskOf(1).actual, 'an actual'))
    // WHY: the actual's finish end, not its middle -- table T-266 gives the actual no body of its
    // WHY: own, so its middle falls to the plan body whether the actual is drawn or not.
    const x = actual.right - 1
    const sizes = grabSizesOf()
    const onTheActual = itemAtPointer(shown.geometry as never, x, actual.centre, sizes)
    const sameSpot = itemAtPointer(hidden.geometry as never, x, actual.centre, sizes)
    expect(onTheActual?.grab, `premise: ${FR_108_NOTHING_UNDRAWN_IS_GRABBED}`).toBeDefined()
    expect(sameSpot?.grab ?? null, FR_108_NOTHING_UNDRAWN_IS_GRABBED).not.toBe(onTheActual?.grab)
  })

  it('a dummy that is not drawn is not grabbed either', () => {
    const shown = scene({})
    const hidden = scene({}, { actualVisible: false })
    const dummy = mustBe(shown.taskOf(1).dummies[0], 'a dummy')
    const ink = bandOfRect(dummy.ink)
    const x = ink.left + (ink.right - ink.left) / 4
    const sizes = grabSizesOf()
    const onTheDummy = itemAtPointer(shown.geometry as never, x, ink.centre, sizes)
    expect(hidden.taskOf(1).dummies.length, `premise: ${FR_108_NOTHING_UNDRAWN_IS_GRABBED}`).toBe(0)
    const sameSpot = itemAtPointer(hidden.geometry as never, x, ink.centre, sizes)
    expect(onTheDummy?.grab, `premise: ${FR_108_NOTHING_UNDRAWN_IS_GRABBED}`).toBeDefined()
    expect(sameSpot?.grab ?? null, FR_108_NOTHING_UNDRAWN_IS_GRABBED).not.toBe(onTheDummy?.grab)
  })
})

interface Spot {
  readonly basisLeft: number
  readonly markerLeft: number
}

const followsItsBasis = (before: Spot, after: Spot): boolean =>
  Math.abs(after.markerLeft - before.markerLeft - (after.basisLeft - before.basisLeft)) <= EPS

describe('T-272 control -- the basis check refuses labels that stayed behind', () => {
  const before: Spot = { basisLeft: 100, markerLeft: 140 }

  it('accepts labels that moved with their basis', () => {
    expect(followsItsBasis(before, { basisLeft: 130, markerLeft: 170 })).toBe(true)
  })

  it('refuses labels that did not move when the basis did', () => {
    expect(followsItsBasis(before, { basisLeft: 130, markerLeft: 140 })).toBe(false)
  })

  it('refuses labels that moved further than the basis', () => {
    expect(followsItsBasis(before, { basisLeft: 130, markerLeft: 171 })).toBe(false)
  })
})
