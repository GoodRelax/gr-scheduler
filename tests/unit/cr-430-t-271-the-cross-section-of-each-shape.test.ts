// FR-109 table T-271: which band each shape draws in, and how tall it is.

import { describe, expect, it } from 'vitest'

import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  ACTUAL_H,
  EPS,
  GAP_ACTUAL,
  GAP_TIER_1,
  H,
  MARKER_D,
  RATIO,
  S_25,
  S_46,
  S_180,
  S_233,
  S_247,
  SPAN_DOT,
  THIN_HEAD_HEIGHT,
  THIN_HEAD_LENGTH,
  THIN_STROKE,
  bandOf,
  bandOfRect,
  cellOf,
  day,
  rowOf,
  sceneOf,
  taskOf,
  tierOneFontOf,
  type Band,
  type Bar,
  type Pt,
  type Rect,
  type Scene,
} from './cr-430-cross-section-scene'

const WHERE = '縦の位置'
const HOW_TALL = '高さ'
const SHAPE = '形'
const BAND = '帯'

// WHY: a label quotes the whole cell as written; XS-6's height cell names DM-3 and DM-4 together,
// WHY: which bare() rightly refuses to reduce to one value.
const textOf = (row: string, heading: string): string => (rowOf('T-271', row).by[heading] ?? '').replace(/`/g, '')

const says = (row: string): string =>
  `T-271 ${row} [${textOf(row, SHAPE)} / ${textOf(row, BAND)}] ` +
  `${WHERE}: ${textOf(row, WHERE)} / ${HOW_TALL}: ${textOf(row, HOW_TALL)}`

const XS_4_TIER_1_IS_COUNTED_IN_THE_FONT =
  '1 段目の高さは字の大きさ f で数えること（MUST）'
const XS_NOT_THE_S_233_RATIO = '表 T-206 の `S-233` の比で数えてはならない（MUST NOT）'
const XS_7_THE_LANES_DO_NOT_MEET =
  '線だけの形の掴み代は、予定が中線より上だけ、実績が中線より下だけを取ること（MUST） —— 予実が重ならない。'
const XS_THREE_TIERS_FIT_IN_H =
  '3 段の縦幅は f ＋ `S-196` ＋ 線 ＋ `S-10` ＋ 線 ＋（端の印の縦幅 − 線）÷ 2 であり、既定の縦の倍率で h 以下である。'
const XS_TIER_3_IS_KEPT = '実績を隠しても、実績が無くても、3 段目を取っておくこと（MUST）。'
const XS_THE_SPAN_TAKES_THE_SAME_TIERS =
  '線だけの形の行（`XS-4` 〜 `XS-7` と `XS-12`）は、端点スパン（`SH-4`）にも当てること（MUST） —— 同じ 3 段であり、矢じりの代わりに両端へ点（径は `S-307`）を置く。'

const XS_UNDECIDED_SHRINKS_BY_S_25 =
  '⭐ 再開日が未定の再開アイコン（`XS-10` ／ `XS-12`）は、箱に `FR-044` の `S-25` を掛ける。'
const XS_DUMMY_IS_IN_THE_ACTUAL_BAND = '⚠️ ダミーは 1 日の実績と同じ形で描くので、描く帯も掴む帯も実績の帯である。'

const TALL_BASE_PLAN_HEIGHT = 120
const PLAN_FROM = 2
const PLAN_TO = 28

const rectangle = (over: Readonly<Record<string, unknown>> = {}, settings: Readonly<Record<string, unknown>> = {}) =>
  sceneOf({
    tasks: [taskOf({ name: 'ab', start: day(PLAN_FROM), finish: day(PLAN_TO), ...over })],
    shapeKind: 'rectangle',
    assignedTaskUids: [1],
    settings: { assigneeVisible: true, percentCompleteVisible: true, ...settings },
  })

const lineShape = (
  shapeKind: string,
  over: Readonly<Record<string, unknown>> = {},
  settings: Readonly<Record<string, unknown>> = {},
) =>
  sceneOf({
    tasks: [taskOf({ name: 'ab', start: day(PLAN_FROM), finish: day(PLAN_TO), ...over })],
    shapeKind,
    assignedTaskUids: [1],
    settings: { assigneeVisible: true, percentCompleteVisible: true, ...settings },
  })

const milestone = (over: Readonly<Record<string, unknown>> = {}, settings: Readonly<Record<string, unknown>> = {}) =>
  sceneOf({
    tasks: [taskOf({ name: 'ab', start: day(4), finish: day(4), milestone: true, ...over })],
    shapeKind: 'milestone',
    settings,
  })

const STARTED = { actualStart: day(PLAN_FROM), stop: day(10), resumeValid: true, percentComplete: 40 }
const RUNNING = { actualStart: day(PLAN_FROM), actualFinish: day(20), percentComplete: 60 }
const STOPPED_WITH_RESUME = { actualStart: day(PLAN_FROM), stop: day(10), resume: day(20), resumeValid: true, percentComplete: 30 }
const STOPPED_UNDECIDED = { actualStart: day(PLAN_FROM), stop: day(10), resume: null, resumeValid: false, percentComplete: 30 }

const mustBe = <T>(value: T | null | undefined, what: string): T => {
  expect(value, `premise: ${what}`).not.toBeNull()
  expect(value, `premise: ${what}`).not.toBeUndefined()
  return value as T
}

const headWidthOf = (bar: Bar): number => {
  const head = mustBe(bar.head, 'a line-only shape draws an arrow head')
  const xs = head.map((one: Pt) => one.x)
  return Math.max(...xs) - Math.min(...xs)
}

// see XS-5
const arrowLengthOf = (bar: Bar): number => {
  const head = mustBe(bar.head, 'a line-only shape draws an arrow head')
  const from = mustBe(bar.from, 'a line-only shape draws a shaft')
  return Math.max(...head.map((one: Pt) => one.x)) - from.x
}

const headHeightOf = (bar: Bar): number => {
  const head = mustBe(bar.head, 'a line-only shape draws an arrow head')
  const ys = head.map((one: Pt) => one.y)
  return Math.max(...ys) - Math.min(...ys)
}

describe(`T-271 XS-1 -- ${says('XS-1')}`, () => {
  it('draws the rectangle plan h tall, centred on the row band', () => {
    const scene = rectangle(STARTED)
    const plan = bandOf(mustBe(scene.taskOf(1).plan, 'a rectangle draws a plan'))
    const placed = scene.placedOf(1)
    expect(plan.height, says('XS-1')).toBeCloseTo(H, 6)
    expect(plan.centre, says('XS-1')).toBeCloseTo(placed.y + placed.height / 2, 6)
  })
})

describe(`T-271 XS-2 -- ${says('XS-2')}`, () => {
  it('gives the actual the plan centre and h x S-5', () => {
    const scene = rectangle(STARTED)
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.plan, 'a plan'))
    const actual = bandOf(mustBe(drawn.actual, 'an actual'))
    expect(actual.centre, says('XS-2')).toBeCloseTo(plan.centre, 6)
    expect(actual.height, says('XS-2')).toBeCloseTo(ACTUAL_H, 6)
  })

  it('gives the dummy the same band as the actual', () => {
    const scene = rectangle({})
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.plan, 'a plan'))
    const dummy = mustBe(drawn.dummies[0], 'a not-started task draws a dummy')
    const ink = bandOfRect(dummy.ink)
    expect(ink.centre, says('XS-2')).toBeCloseTo(plan.centre, 6)
    expect(ink.height, says('XS-2')).toBeCloseTo(ACTUAL_H, 6)
  })
})

describe(`T-271 XS-3 -- ${says('XS-3')}`, () => {
  it('puts the marker on the plan centre at the diameter of S-22', () => {
    const scene = rectangle(STARTED)
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.plan, 'a plan'))
    const marker = mustBe(drawn.marker, 'a marker')
    expect(marker.centre.y, says('XS-3')).toBeCloseTo(plan.centre, 6)
    expect(marker.radius * 2, says('XS-3')).toBeCloseTo(MARKER_D, 6)
  })

  it('puts the name and the assignee label on the plan centre at the font size', () => {
    const scene = rectangle(STARTED)
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.plan, 'a plan'))
    const label = bandOfRect(mustBe(drawn.label, 'a name'))
    const assignee = bandOfRect(mustBe(drawn.assigneeLabel, 'an assignee and percent label'))
    const font = scene.placedOf(1).labelFontSize
    expect(label.centre, says('XS-3')).toBeCloseTo(plan.centre, 6)
    expect(label.height, says('XS-3')).toBeCloseTo(font, 6)
    expect(assignee.centre, says('XS-3')).toBeCloseTo(plan.centre, 6)
    expect(assignee.height, says('XS-3')).toBeCloseTo(font, 6)
  })
})

const LINE_SHAPES = ['arrow', 'endpointSpan'] as const

describe(`T-271 XS-4 -- ${says('XS-4')}`, () => {
  for (const shapeKind of LINE_SHAPES) {
    it(`${shapeKind}: tier 1 stands at the top of the shape band and is f tall`, () => {
      const scene = lineShape(shapeKind, RUNNING)
      const drawn = scene.taskOf(1)
      const placed = scene.placedOf(1)
      const f = tierOneFontOf(H, shapeKind)
      const marker = mustBe(drawn.marker, 'a marker')
      expect(marker.radius * 2, says('XS-4')).toBeCloseTo(f, 6)
      // WHY: placed.y is the top of tiers 2 and 3; tier 1 stands in the lift above it, f tall
      // WHY: with S-196 under it, so the band of the three tiers opens f + S-196 higher.
      expect(marker.centre.y - marker.radius, says('XS-4')).toBeCloseTo(placed.y - f - GAP_TIER_1, 6)
      const label = bandOfRect(mustBe(drawn.label, 'a name'))
      expect(label.height, `${says('XS-4')} -- ${XS_4_TIER_1_IS_COUNTED_IN_THE_FONT}`).toBeCloseTo(f, 6)
      expect(label.height, XS_NOT_THE_S_233_RATIO).not.toBeCloseTo(f * S_233, 6)
    })
  }

  it('arrow: f takes the larger of the derived size and S-8, so a tall row leaves the floor behind', () => {
    const tallPlanHeight = TALL_BASE_PLAN_HEIGHT * RATIO
    const tall = lineShape('arrow', RUNNING, { basePlanHeight: TALL_BASE_PLAN_HEIGHT })
    const f = tierOneFontOf(tallPlanHeight, 'arrow')
    expect(f, `premise: ${says('XS-4')}`).toBeGreaterThan(tierOneFontOf(H, 'arrow'))
    const marker = mustBe(tall.taskOf(1).marker, 'a marker')
    expect(marker.radius * 2, says('XS-4')).toBeCloseTo(f, 6)
  })
})

describe(`T-271 XS-5 -- ${says('XS-5')}`, () => {
  it('puts the plan line S-196 below the bottom of tier 1, at the thin stroke and head', () => {
    const scene = lineShape('arrow', RUNNING)
    const drawn = scene.taskOf(1)
    const placed = scene.placedOf(1)
    const f = tierOneFontOf(H, 'arrow')
    const plan = mustBe(drawn.plan, 'a plan line')
    const band = bandOf(plan)
    const marker = mustBe(drawn.marker, 'a marker')
    expect(marker.radius * 2, `premise: ${says('XS-4')}`).toBeCloseTo(f, 6)
    expect(band.top, says('XS-5')).toBeCloseTo(marker.centre.y + marker.radius + GAP_TIER_1, 6)
    expect(band.top, says('XS-5')).toBeCloseTo(placed.y, 6)
    expect(band.height, says('XS-5')).toBeCloseTo(THIN_STROKE, 6)
    expect(headWidthOf(plan), says('XS-5')).toBeCloseTo(
      Math.min(THIN_HEAD_LENGTH, arrowLengthOf(plan) * S_46),
      6,
    )
    expect(headHeightOf(plan), says('XS-5')).toBeCloseTo(THIN_HEAD_HEIGHT, 6)
  })

  // WHY: the assertion above only checks the drawn line against placed.y itself, so a break in the
  // WHY: OTHER copy of the S-196 lift (schedule-layout.ts's own reservation, which SETS placed.y)
  // WHY: would still pass -- both sides of that assertion move together. This checks the plan line
  // WHY: against the row's own lane top (ScheduleLayout.rows[].stackTops), a path that does not run
  // WHY: through placed.y at all, so it catches either copy going out of step with the other.
  it(`${says('XS-5')} -- measured from the row's own lane top, not from placed.y`, () => {
    const scene = lineShape('arrow', RUNNING)
    const plan = mustBe(scene.taskOf(1).plan, 'a plan line')
    const band = bandOf(plan)
    const f = tierOneFontOf(H, 'arrow')
    const row = scene.layout.rows.find((one) => one.groupId === 'g1')
    if (row === undefined) throw new Error('seam: task group g1 was not laid out as a row')
    const laneTop = row.stackTops[0]
    if (laneTop === undefined) throw new Error('seam: row g1 has no lane 0')
    expect(band.top, says('XS-5')).toBeCloseTo(laneTop + f + GAP_TIER_1, 6)
  })

  it('keeps the tier where it is when the arrow is too short for a full head', () => {
    const short = lineShape('arrow', { ...RUNNING, finish: day(2), actualFinish: day(2) })
    const long = lineShape('arrow', RUNNING)
    const shortPlan = mustBe(short.taskOf(1).plan, 'a plan line')
    const shortBand = bandOf(shortPlan)
    expect(arrowLengthOf(shortPlan) * S_46, `premise: ${says('XS-5')}`).toBeLessThan(THIN_HEAD_LENGTH)
    expect(headWidthOf(shortPlan), says('XS-5')).toBeCloseTo(
      arrowLengthOf(shortPlan) * S_46,
      6,
    )
    expect(shortBand.top - short.placedOf(1).y, says('XS-5')).toBeCloseTo(
      bandOf(mustBe(long.taskOf(1).plan, 'a plan line')).top - long.placedOf(1).y,
      6,
    )
  })
})

describe(`T-271 XS-6 -- ${says('XS-6')}`, () => {
  it('puts the actual line S-10 below the bottom edge of the plan line', () => {
    const scene = lineShape('arrow', RUNNING)
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.plan, 'a plan line'))
    const actualBar = mustBe(drawn.actual, 'an actual line')
    const actual = bandOf(actualBar)
    expect(actual.top, says('XS-6')).toBeCloseTo(plan.bottom + GAP_ACTUAL, 6)
    expect(actual.height, says('XS-6')).toBeCloseTo(THIN_STROKE, 6)
    expect(headHeightOf(actualBar), says('XS-6')).toBeCloseTo(THIN_HEAD_HEIGHT, 6)
  })

  it(XS_TIER_3_IS_KEPT, () => {
    const shown = lineShape('arrow', RUNNING)
    const hidden = lineShape('arrow', RUNNING, { actualVisible: false })
    const notStarted = lineShape('arrow', {})
    const planTopOf = (scene: ReturnType<typeof lineShape>): number =>
      bandOf(mustBe(scene.taskOf(1).plan, 'a plan line')).top - scene.placedOf(1).y
    const heightOf = (scene: ReturnType<typeof lineShape>): number => scene.placedOf(1).height
    expect(planTopOf(hidden), XS_TIER_3_IS_KEPT).toBeCloseTo(planTopOf(shown), 6)
    expect(heightOf(hidden), XS_TIER_3_IS_KEPT).toBeCloseTo(heightOf(shown), 6)
    expect(heightOf(notStarted), XS_TIER_3_IS_KEPT).toBeCloseTo(heightOf(shown), 6)
  })

  it(`draws the not-started mark on tier 3, from the plan start, f x S-247 wide: ${XS_DUMMY_IS_IN_THE_ACTUAL_BAND}`, () => {
    expect(cellOf('T-271', 'XS-6', BAND), says('XS-6')).toContain('未着手の印 ＝ ダミーを含む')
    const scene = lineShape('arrow', {})
    const drawn = scene.taskOf(1)
    const placed = scene.placedOf(1)
    const f = tierOneFontOf(H, 'arrow')
    const dummy = mustBe(drawn.dummies[0], 'a not-started line-only task draws a dummy')
    const figure = mustBe(dummy.figure, 'the dummy is drawn as a figure')
    const band = bandOf(figure)
    const started = lineShape('arrow', RUNNING)
    const actual = bandOf(mustBe(started.taskOf(1).actual, 'an actual line'))
    expect(band.centre - placed.y, says('XS-6')).toBeCloseTo(actual.centre - started.placedOf(1).y, 6)
    expect(band.height, says('XS-6')).toBeCloseTo(THIN_STROKE, 6)
    expect(band.left, says('XS-6')).toBeCloseTo(placed.x, 6)
    expect(dummy.ink.width, says('XS-6')).toBeCloseTo(Math.min(f * S_247, S_180), 6)
  })
})

describe(`T-271 XS-7 -- ${says('XS-7')}`, () => {
  it(XS_7_THE_LANES_DO_NOT_MEET, () => {
    const scene = lineShape('arrow', RUNNING)
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.plan, 'a plan line'))
    const actual = bandOf(mustBe(drawn.actual, 'an actual line'))
    expect(Number.isFinite(plan.centre), `premise: ${says('XS-7')}`).toBe(true)
    expect(Number.isFinite(actual.centre), `premise: ${says('XS-7')}`).toBe(true)
    const middle = (plan.centre + actual.centre) / 2
    const body = (plan.left + plan.right) / 2
    const sizes = grabSizesOf()
    // WHY: table T-266 gives a line-only shape a body on the plan arrow (GA-14) and ends on the
    // WHY: actual line (GA-12 / GA-13); the actual carries no body, so the split is read on both.
    expect(itemAtPointer(scene.geometry as never, body, plan.centre, sizes)?.grab,
           `premise: ${says('XS-7')}`).toBe('GA-14')
    expect(itemAtPointer(scene.geometry as never, body, middle - EPS, sizes)?.grab,
           XS_7_THE_LANES_DO_NOT_MEET).toBe('GA-14')
    expect(itemAtPointer(scene.geometry as never, body, middle + EPS, sizes)?.grab ?? null,
           XS_7_THE_LANES_DO_NOT_MEET).not.toBe('GA-14')
    const end = actual.left
    expect(itemAtPointer(scene.geometry as never, end, middle + EPS, sizes)?.grab,
           `premise: ${says('XS-7')}`).toBe('GA-12')
    expect(itemAtPointer(scene.geometry as never, end, middle - EPS, sizes)?.grab ?? null,
           XS_7_THE_LANES_DO_NOT_MEET).not.toBe('GA-12')
  })
})

describe(`T-271 XS-8 -- ${says('XS-8')}`, () => {
  it('draws the plan diamond h tall and h wide on the row band centre', () => {
    const scene = milestone()
    const figure = mustBe(scene.taskOf(1).milestoneFigure ?? scene.taskOf(1).plan, 'a plan diamond')
    const band = bandOf(figure)
    const placed = scene.placedOf(1)
    expect(band.height, says('XS-8')).toBeCloseTo(H, 6)
    expect(band.right - band.left, says('XS-8')).toBeCloseTo(H, 6)
    expect(band.centre, says('XS-8')).toBeCloseTo(placed.y + placed.height / 2, 6)
  })

  it('XS-8 / F-024: a milestone\'s assignee-and-percent card is centred on the plan diamond, like its name and marker', () => {
    const scene = sceneOf({
      tasks: [taskOf({ name: 'ab', start: day(4), finish: day(4), milestone: true, actualStart: day(4), percentComplete: 50 })],
      shapeKind: 'milestone',
      assignedTaskUids: [1],
      settings: { assigneeVisible: true, percentCompleteVisible: true },
    })
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.milestoneFigure ?? drawn.plan, 'a plan diamond'))
    const name = bandOfRect(mustBe(drawn.label, 'a name'))
    const card = bandOfRect(mustBe(drawn.assigneeLabel, 'an assignee and percent card'))
    const marker = mustBe(drawn.marker, 'a started milestone draws a marker')
    expect(name.centre, 'the name stands on the plan diamond centre').toBeCloseTo(plan.centre, 6)
    expect(marker.centre.y, 'the marker stands on the plan diamond centre').toBeCloseTo(plan.centre, 6)
    expect(card.centre, 'the card stands on the plan diamond centre (LP-7 / LP-8, F-024)').toBeCloseTo(plan.centre, 6)
    expect(card.centre, 'the card and the name share one band').toBeCloseTo(name.centre, 6)
  })
})

describe(`T-271 XS-9 -- ${says('XS-9')}`, () => {
  it('draws the actual diamond h x S-5 square on the plan centre', () => {
    const scene = milestone({ actualStart: day(4), actualFinish: day(4), percentComplete: 100 })
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.milestoneFigure ?? drawn.plan, 'a plan diamond'))
    const actual = bandOf(mustBe(drawn.actual, 'an actual diamond'))
    expect(actual.centre, says('XS-9')).toBeCloseTo(plan.centre, 6)
    expect(actual.height, says('XS-9')).toBeCloseTo(ACTUAL_H, 6)
    expect(actual.right - actual.left, says('XS-9')).toBeCloseTo(ACTUAL_H, 6)
  })

  it('draws the dummy diamond at the same size', () => {
    const scene = milestone()
    const drawn = scene.taskOf(1)
    const plan = bandOf(mustBe(drawn.milestoneFigure ?? drawn.plan, 'a plan diamond'))
    const dummy = mustBe(drawn.dummies[0], 'a not-started milestone draws a dummy')
    const ink = bandOfRect(dummy.ink)
    expect(ink.centre, says('XS-9')).toBeCloseTo(plan.centre, 6)
    expect(ink.height, says('XS-9')).toBeCloseTo(ACTUAL_H, 6)
    expect(ink.right - ink.left, says('XS-9')).toBeCloseTo(ACTUAL_H, 6)
  })
})

// see XS-10, XS-12
const drawnResumeHeightOf = (scene: Scene): number => {
  const resume = mustBe(scene.taskOf(1).resume, 'a stopped task draws a resume icon')
  const ys = [...(resume.arm ?? []), ...(resume.head ?? [])].map((one) => one.y)
  return Math.max(...ys) - Math.min(...ys)
}

const resumeBoxOf = (scene: Scene): Rect => {
  const resume = mustBe(scene.taskOf(1).resume, 'a stopped task draws a resume icon')
  return mustBe(resume.box, 'the resume icon carries a box')
}

describe(`T-271 XS-10 -- ${says('XS-10')}`, () => {
  it('sizes the box at the marker diameter, on the actual centre line, its bottom on the marker bottom (LF-13)', () => {
    const scene = rectangle(STOPPED_WITH_RESUME)
    const drawn = scene.taskOf(1)
    const actual = bandOf(mustBe(drawn.actual, 'an actual'))
    const marker = mustBe(drawn.marker, 'a marker')
    const box = bandOfRect(resumeBoxOf(scene))
    expect(mustBe(drawn.resume?.undecided, 'the icon says whether the day is undecided'), says('XS-10')).toBe(false)
    expect(box.height, says('XS-10')).toBeCloseTo(MARKER_D, 6)
    expect(box.right - box.left, says('XS-10')).toBeCloseTo(MARKER_D, 6)
    expect(box.centre, says('XS-10')).toBeCloseTo(actual.centre, 6)
    expect(box.bottom, says('XS-10')).toBeCloseTo(marker.centre.y + marker.radius, 6)
  })

  it(`the undecided icon stands right of the stop day: ${XS_UNDECIDED_SHRINKS_BY_S_25}`, () => {
    const scene = rectangle(STOPPED_UNDECIDED)
    const drawn = scene.taskOf(1)
    const actual = bandOf(mustBe(drawn.actual, 'an actual'))
    const decided = bandOfRect(resumeBoxOf(rectangle(STOPPED_WITH_RESUME)))
    const box = bandOfRect(resumeBoxOf(scene))
    expect(mustBe(drawn.resume?.undecided, 'the icon says whether the day is undecided'), says('XS-10')).toBe(true)
    // WHY: the DRAWN icon is what S-25 shrinks; GA-20 keeps the grab box at the marker's diameter.
    expect(drawnResumeHeightOf(scene), XS_UNDECIDED_SHRINKS_BY_S_25).toBeCloseTo(
      drawnResumeHeightOf(rectangle(STOPPED_WITH_RESUME)) * S_25,
      6,
    )
    expect(box.height, says('XS-10')).toBeCloseTo(MARKER_D, 6)
    expect(box.centre, says('XS-10')).toBeCloseTo(decided.centre, 6)
    expect(box.left, says('XS-10')).toBeCloseTo(actual.right, 6)
  })
})

describe(`T-271 XS-12 -- ${says('XS-12')}`, () => {
  it('puts the arrow resume icon on tier 3 at the size of the name font', () => {
    const scene = lineShape('arrow', STOPPED_WITH_RESUME)
    const drawn = scene.taskOf(1)
    const f = tierOneFontOf(H, 'arrow')
    const actual = bandOf(mustBe(drawn.actual, 'an actual line'))
    const box = bandOfRect(resumeBoxOf(scene))
    expect(box.height, says('XS-12')).toBeCloseTo(f, 6)
    expect(box.centre, says('XS-12')).toBeCloseTo(actual.centre, 6)
  })

  it(`the undecided arrow icon stands at the right end of the actual line: ${XS_UNDECIDED_SHRINKS_BY_S_25}`, () => {
    const scene = lineShape('arrow', STOPPED_UNDECIDED)
    const drawn = scene.taskOf(1)
    const f = tierOneFontOf(H, 'arrow')
    const actual = bandOf(mustBe(drawn.actual, 'an actual line'))
    const box = bandOfRect(resumeBoxOf(scene))
    expect(mustBe(drawn.resume?.undecided, 'the icon says whether the day is undecided'), says('XS-12')).toBe(true)
    // WHY: the DRAWN icon is what S-25 shrinks; GA-20 keeps the grab box at the tier's font size.
    expect(drawnResumeHeightOf(scene), XS_UNDECIDED_SHRINKS_BY_S_25).toBeCloseTo(
      drawnResumeHeightOf(lineShape('arrow', STOPPED_WITH_RESUME)) * S_25,
      6,
    )
    expect(box.height, says('XS-12')).toBeCloseTo(f, 6)
    // WHY: the day boundary the actual line ends on, not the drawn extent -- an arrow draws its
    // WHY: head beyond that boundary, and XS-12 stands the stem on the boundary itself.
    const placed = scene.placedOf(1)
    expect((placed.actualX ?? 0) + placed.actualWidth, `premise: ${says('XS-12')}`).toBeGreaterThan(
      actual.right,
    )
    expect(box.left, says('XS-12')).toBeCloseTo((placed.actualX ?? 0) + placed.actualWidth, 6)
  })
})

describe(`T-271 the closing rules of the table`, () => {
  it(XS_THE_SPAN_TAKES_THE_SAME_TIERS, () => {
    const scene = lineShape('endpointSpan', RUNNING)
    const drawn = scene.taskOf(1)
    const f = tierOneFontOf(H, 'endpointSpan')
    const plan = mustBe(drawn.plan, 'a plan line')
    const planBand = bandOf(plan)
    const actual = bandOf(mustBe(drawn.actual, 'an actual line'))
    const marker = mustBe(drawn.marker, 'a marker')
    expect(marker.radius * 2, XS_THE_SPAN_TAKES_THE_SAME_TIERS).toBeCloseTo(f, 6)
    expect(planBand.top, XS_THE_SPAN_TAKES_THE_SAME_TIERS).toBeCloseTo(
      marker.centre.y + marker.radius + GAP_TIER_1,
      6,
    )
    expect(actual.top, XS_THE_SPAN_TAKES_THE_SAME_TIERS).toBeCloseTo(planBand.bottom + GAP_ACTUAL, 6)
    expect(plan.head ?? null, XS_THE_SPAN_TAKES_THE_SAME_TIERS).toBeNull()
    const dots = mustBe(plan.dots, 'an endpoint span puts a dot at each end')
    expect(dots.length, XS_THE_SPAN_TAKES_THE_SAME_TIERS).toBe(2)
    for (const dot of dots) {
      expect(dot.radius * 2, XS_THE_SPAN_TAKES_THE_SAME_TIERS).toBeCloseTo(SPAN_DOT, 6)
    }
  })

  for (const shapeKind of LINE_SHAPES) {
    it(`${shapeKind}: ${XS_THREE_TIERS_FIT_IN_H}`, () => {
      const scene = lineShape(shapeKind, RUNNING)
      const drawn = scene.taskOf(1)
      const placed = scene.placedOf(1)
      const f = tierOneFontOf(H, shapeKind)
      const endMark = shapeKind === 'endpointSpan' ? SPAN_DOT : THIN_HEAD_HEIGHT
      const sum = f + GAP_TIER_1 + THIN_STROKE + GAP_ACTUAL + THIN_STROKE + (endMark - THIN_STROKE) / 2
      expect(sum, XS_THREE_TIERS_FIT_IN_H).toBeLessThanOrEqual(H + EPS)
      const plan = bandOf(mustBe(drawn.plan, 'a plan line'))
      const actual = bandOf(mustBe(drawn.actual, 'an actual line'))
      // WHY: the three tiers open f + S-196 above placed.y, which is tier 2's own top.
      const bandTop = placed.y - f - GAP_TIER_1
      expect(actual.bottom - bandTop, XS_THREE_TIERS_FIT_IN_H).toBeLessThanOrEqual(H + EPS)
      expect(plan.top, XS_THREE_TIERS_FIT_IN_H).toBeGreaterThan(bandTop)
    })
  }
})

interface CrossSection {
  readonly plan: Band
  readonly actual: Band
  readonly markerCentre: number
}

const obeysXs2AndXs3 = (section: CrossSection): boolean =>
  Math.abs(section.actual.centre - section.plan.centre) <= EPS &&
  Math.abs(section.markerCentre - section.plan.centre) <= EPS &&
  Math.abs(section.actual.height - section.plan.height * (ACTUAL_H / H)) <= EPS

describe('T-271 control -- the cross-section check refuses a band that moved', () => {
  const sound: CrossSection = {
    plan: { top: 0, bottom: H, centre: H / 2, height: H, left: 0, right: 100 },
    actual: {
      top: H / 2 - ACTUAL_H / 2,
      bottom: H / 2 + ACTUAL_H / 2,
      centre: H / 2,
      height: ACTUAL_H,
      left: 0,
      right: 100,
    },
    markerCentre: H / 2,
  }

  it('accepts a cross section built to the table', () => {
    expect(obeysXs2AndXs3(sound)).toBe(true)
  })

  it('refuses the same cross section with the actual band nudged one pixel down', () => {
    const nudged: CrossSection = {
      ...sound,
      actual: { ...sound.actual, centre: sound.actual.centre + 1 },
    }
    expect(obeysXs2AndXs3(nudged)).toBe(false)
  })

  it('refuses the same cross section with the actual band one pixel taller', () => {
    const taller: CrossSection = {
      ...sound,
      actual: { ...sound.actual, height: sound.actual.height + 1 },
    }
    expect(obeysXs2AndXs3(taller)).toBe(false)
  })

  it('refuses the same cross section with the marker off the plan centre', () => {
    expect(obeysXs2AndXs3({ ...sound, markerCentre: sound.markerCentre + 1 })).toBe(false)
  })
})
