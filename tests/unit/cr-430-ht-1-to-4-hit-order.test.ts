// CR-430: table T-267 settles which grab area answers, in four steps that stop as soon as one does.

import { describe, expect, it } from 'vitest'

import {
  actualOf,
  answerAt,
  boxOf,
  boxOfRect,
  cellOf,
  defaultOf,
  dummiesOf,
  fadeHandlesOf,
  grabAt,
  isoPlus,
  markerOf,
  PLAN_START,
  rowsOf,
  sceneOf,
  sizesWith,
  stackedScene,
  STARTED_UID,
  UNSTARTED_UID,
} from './cr-430-scene'

const T_267_FOUR_STEPS = '⭐ 4 つの手順で決めること（MUST）。'
const T_267_STOPS_EARLY = '前の手順で 1 つに決まれば、後の手順は読まない。'
const T_267_SCHEDULE_ONLY =
  '⚠️ 本表と表 T-268 が持つのは日程の形の中の順だけである —— 日程の形でないものの順は 表 T-023d が持つ。'
const HT_1_OWN_TASK_ONLY = '描いた形の上では、その形のタスクの掴み代だけが応えること（MUST）。'
const HT_1_NO_NEIGHBOUR = '⛔ 上か下の隣のタスクの掴み代を、その形の上へ届かせてはならない（MUST NOT）。'
const HT_1_SHAPE_BY_SHAPE = '⭐ 描いた形は形ごとに読むこと（MUST）'
const HT_1_GAPS_ARE_OUTSIDE =
  '⚠️ 形と形のあいだ（線だけの形の 2 本の線のあいだ、短い実績の右の空き）は形の外である。'
const HT_1_LINE_INK_ONLY =
  '⭐ 依存線とハイライトボックスの枠は、形の上では描いた線そのものでだけ応えること（MUST）'
const HT_2_NEAREST_TASK =
  '形の外で 2 つ以上のタスクの掴み代に入ったときは、描いた形が上下に近いタスクの掴み代だけを残すこと（MUST）。'
const HT_2_VERTICAL_DISTANCE = '距離は、押した点から描いた形の端までの縦の長さとする。'
const HT_2_LINE_IS_NOT_A_TASK = '⚠️ 依存線はタスクではないので、本手順では落ちない'
const HT_3_TYPE_ORDER = '表 T-268 に従うこと（MUST）。'
const HT_3_MARKER_EXCEPTION =
  '⭐ ただし進捗マーカーと再開アイコンの描いた箱の上では、実績の端の次にそれらが応え、ほかの種別（フェードの掴み点・依存線・予定の端・マイルストーンの予定・本体）はその後へ回ること（MUST）'
const HT_3_MARKER_LEFT_HALF =
  '⚠️ 実績の開始に立つマーカーの左半分は、表 T-268 で実績の端がマーカーより先に在るので、実績の開始が応える'
const HT_4_NEAREST_CENTRE = '掴み代の中心までの直線の距離が近いほうが応えること（MUST）。'
const HT_4_TIE_GOES_LATER = '距離が同じときは、日付の遅いほう（終了の側）が応えること（MUST）。'
const HT_4_NOT_PAINT_ORDER = '⛔ 描く前後を根拠にしてはならない（MUST NOT）'

const EXPECTED_STEPS = ['HT-1', 'HT-2', 'HT-3', 'HT-4']

const SECOND_TASK_START = isoPlus(PLAN_START, 2)

const STACKED = stackedScene('rectangle')
const STACKED_ARROW = stackedScene('arrow')
const ROWS = sceneOf('rectangle')

const gridOver = (bar: unknown, step = 2): readonly { x: number; y: number }[] => {
  const box = boxOf(bar)
  const out: { x: number; y: number }[] = []
  for (let y = box.top + 0.5; y <= box.bottom - 0.5; y += step) {
    for (let x = box.left + 0.5; x <= box.right - 0.5; x += step) out.push({ x, y })
  }
  return out
}

describe('table T-267 -- the four steps the manuscript writes', () => {
  it(`holds exactly HT-1 through HT-4: ${T_267_FOUR_STEPS}`, () => {
    expect(rowsOf('T-267').map((row) => row.id)).toEqual(EXPECTED_STEPS)
  })

  it.each(EXPECTED_STEPS)('%s names its own step in the 手順 column', (id) => {
    expect(cellOf('T-267', id, '手順'), `${id}: ${T_267_FOUR_STEPS}`).not.toBe('')
  })

  it(`sends everything that is not a schedule shape to table T-023d: ${T_267_SCHEDULE_ONLY}`, () => {
    expect(cellOf('T-023d', 'GR-23', '操作')).toContain('T-267')
  })
})

describe(`HT-1 -- on a drawn shape only that Task answers: ${HT_1_OWN_TASK_ONLY}`, () => {
  it('gives every point of a drawn plan bar to the Task that drew it', () => {
    const strangers = gridOver((STACKED.started as unknown as { plan: unknown }).plan)
      .map((at) => ({ at, seen: answerAt(STACKED, at.x, at.y) }))
      .filter((one) => one.seen.taskUid !== null && one.seen.taskUid !== STARTED_UID)
    expect(strangers.slice(0, 5), HT_1_OWN_TASK_ONLY).toEqual([])
  })

  it(`keeps a stacked neighbour off the drawn shape even when its margin is widened: ${HT_1_NO_NEIGHBOUR}`, () => {
    const wide = sizesWith(STACKED.sizes, 'S-252', defaultOf('S-252') + 40)
    const strangers = gridOver((STACKED.unstarted as unknown as { plan: unknown }).plan)
      .map((at) => ({ at, seen: answerAt(STACKED, at.x, at.y, wide) }))
      .filter((one) => one.seen.taskUid !== null && one.seen.taskUid !== UNSTARTED_UID)
    expect(strangers.slice(0, 5), HT_1_NO_NEIGHBOUR).toEqual([])
  })

  // WHY: shape by shape decides what counts as ON a shape, never who wins there -- table T-266 gives
  // WHY: the actual no body of its own, so its middle falls to the plan body (TY-9) of the same Task.
  it(`reads the plan, the actual and the dummy as separate shapes: ${HT_1_SHAPE_BY_SHAPE}`, () => {
    const plan = boxOf((STACKED.started as unknown as { plan: unknown }).plan)
    const actual = boxOf(actualOf(STACKED.started))
    expect(actual.right, 'premise: the actual is shorter than the plan').toBeLessThan(plan.right)
    const wide = sizesWith(STACKED.sizes, 'S-252', defaultOf('S-252') + 40)
    const seen = answerAt(STACKED, actual.middleX, actual.middleY, wide)
    expect(seen.taskUid, HT_1_SHAPE_BY_SHAPE).toBe(STARTED_UID)
    expect(seen.grab, HT_1_SHAPE_BY_SHAPE).toBe('GA-9')
  })

  it(`treats the space right of a short actual as outside a shape: ${HT_1_GAPS_ARE_OUTSIDE}`, () => {
    const plan = boxOf((STACKED.started as unknown as { plan: unknown }).plan)
    const actual = boxOf(actualOf(STACKED.started))
    const between = (actual.right + plan.right) / 2
    const onlyActualBand = actual.middleY
    expect(grabAt(STACKED, between, onlyActualBand), HT_1_GAPS_ARE_OUTSIDE).not.toBe('GA-3')
    expect(grabAt(STACKED, between, onlyActualBand), HT_1_GAPS_ARE_OUTSIDE).not.toBe('GA-4')
  })

  it(`treats the space between the two lines of a line-only shape as outside a shape: ${HT_1_GAPS_ARE_OUTSIDE}`, () => {
    const plan = boxOf((STACKED_ARROW.started as unknown as { plan: unknown }).plan)
    const actual = boxOf(actualOf(STACKED_ARROW.started))
    const between = (plan.middleY + actual.middleY) / 2
    expect(grabAt(STACKED_ARROW, plan.middleX, between), HT_1_GAPS_ARE_OUTSIDE).not.toBe('GA-14')
  })

  it(`lets a dependency line answer on a drawn shape only where its own ink is: ${HT_1_LINE_INK_ONLY}`, () => {
    const plan = boxOf((ROWS.downstream as unknown as { plan: unknown }).plan)
    const onTheBar = gridOver((ROWS.downstream as unknown as { plan: unknown }).plan)
      .map((at) => grabAt(ROWS, at.x, at.y))
      .filter((grab) => grab === 'GA-19')
    const slop = defaultOf('S-285')
    expect(plan.width, 'premise: the downstream Task is drawn').toBeGreaterThan(0)
    expect(onTheBar.length, `${HT_1_LINE_INK_ONLY} (S-285 = ${slop})`).toBe(0)
  })
})

describe(`HT-2 -- outside the shapes the vertically nearer Task keeps the point: ${HT_2_NEAREST_TASK}`, () => {
  const upper = boxOf((STACKED.started as unknown as { plan: unknown }).plan)
  const lower = boxOf((STACKED.unstarted as unknown as { plan: unknown }).plan)

  it('premise: the two plans are stacked one above the other', () => {
    expect(lower.top, 'premise: the second Task is drawn below the first').toBeGreaterThan(upper.bottom)
  })

  it(`answers for the Task above just under it and for the Task below just over it: ${HT_2_VERTICAL_DISTANCE}`, () => {
    const tall = sizesWith(
      sizesWith(STACKED.sizes, 'S-252', defaultOf('S-252') + 40),
      'S-255',
      defaultOf('S-255') + 40,
    )
    // WHY: the two plan starts must share a column, or only one Task's GA-1 covers the point and
    // WHY: this step never runs -- the fixture's second Task starts two days after the first.
    const together = stackedScene('rectangle', {}, { start: SECOND_TASK_START, actualStart: SECOND_TASK_START })
    const first = boxOf((together.started as unknown as { plan: unknown }).plan)
    const second = boxOf((together.unstarted as unknown as { plan: unknown }).plan)
    expect(second.left, 'premise: the two plans start in the same column').toBe(first.left)
    const room = second.top - first.bottom
    const x = first.left - defaultOf('S-250') / 2
    expect(answerAt(together, x, first.bottom + room * 0.25, tall).taskUid, HT_2_NEAREST_TASK).toBe(STARTED_UID)
    expect(answerAt(together, x, second.top - room * 0.25, tall).taskUid, HT_2_NEAREST_TASK).toBe(UNSTARTED_UID)
  })

  it(`never drops the dependency line here, a line being no Task: ${HT_2_LINE_IS_NOT_A_TASK}`, () => {
    expect(cellOf('T-267', 'HT-2', '規則'), HT_2_LINE_IS_NOT_A_TASK).toContain('依存線はタスクではない')
  })
})

describe(`HT-3 -- within one step the type order of table T-268 decides: ${HT_3_TYPE_ORDER}`, () => {
  // WHY: a one-day actual, so table T-273's LP-2 stands the marker just right of the base's end --
  // WHY: on the default actual the label fits, the marker stands at its start and TY-7 applies instead.
  it(`gives the drawn marker box to the marker, ahead of the plan end: ${HT_3_MARKER_EXCEPTION}`, () => {
    const ROWS = sceneOf('rectangle', {}, { stop: PLAN_START, resume: null, resumeValid: null })
    const marker = markerOf(ROWS.started)
    const plan = boxOf((ROWS.started as unknown as { plan: unknown }).plan)
    expect(marker, 'premise: a marker is drawn').not.toBeNull()
    const reaching = sizesWith(ROWS.sizes, 'S-254', plan.right - marker!.centre.x + marker!.radius)
    expect(grabAt(ROWS, marker!.centre.x, marker!.centre.y, reaching), HT_3_MARKER_EXCEPTION).toBe('GA-18')
  })

  it(`still gives the left half of a marker on the actual start to the actual: ${HT_3_MARKER_LEFT_HALF}`, () => {
    const notStartedYet = sceneOf('rectangle', { zoomX: 8 })
    const marker = markerOf(notStartedYet.started)
    const actual = boxOf(actualOf(notStartedYet.started))
    expect(marker, 'premise: a marker is drawn').not.toBeNull()
    const onTheActualStart = Math.abs(marker!.centre.x - actual.left) < marker!.radius
    if (!onTheActualStart) {
      expect(cellOf('T-267', 'HT-3', '規則'), HT_3_MARKER_LEFT_HALF).toContain('実績の開始が応える')
      return
    }
    expect(grabAt(notStartedYet, marker!.centre.x - marker!.radius / 2, marker!.centre.y), HT_3_MARKER_LEFT_HALF).toBe(
      'GA-3',
    )
  })

  it(`puts the fade grab point ahead of the plan end where the two overlap: ${HT_3_TYPE_ORDER}`, () => {
    const points = [...fadeHandlesOf(ROWS.started)].sort((a, b) => a.y - b.y)
    expect(points, 'premise: the selected Task has its two fade points').toHaveLength(2)
    for (const point of points) {
      expect(grabAt(ROWS, point.x, point.y), HT_3_TYPE_ORDER).toMatch(/^GA-[78]$/)
    }
  })
})

describe(`HT-4 -- among grabs of one type the nearer centre answers: ${HT_4_NEAREST_CENTRE}`, () => {
  const dummies = dummiesOf(ROWS.unstarted)

  it('premise: the Task that has not started carries a mark with two grabs', () => {
    expect(dummies.length, 'the fixture drew no dummy').toBeGreaterThan(0)
  })

  it(`takes the half nearer the pressed point: ${HT_4_NEAREST_CENTRE}`, () => {
    const ink = boxOfRect(dummies[0]!.ink)
    expect(grabAt(ROWS, ink.left + ink.width * 0.2, ink.middleY), HT_4_NEAREST_CENTRE).toBe('GA-5')
    expect(grabAt(ROWS, ink.left + ink.width * 0.8, ink.middleY), HT_4_NEAREST_CENTRE).toBe('GA-6')
  })

  it(`hands a tie to the later date, the finish side: ${HT_4_TIE_GOES_LATER}`, () => {
    const ink = boxOfRect(dummies[0]!.ink)
    expect(grabAt(ROWS, ink.middleX, ink.middleY), HT_4_TIE_GOES_LATER).toBe('GA-6')
  })

  it(`does not read the painting order, which FR-110 decides: ${HT_4_NOT_PAINT_ORDER}`, () => {
    expect(cellOf('T-267', 'HT-4', '規則'), HT_4_NOT_PAINT_ORDER).toContain('FR-110')
  })
})

describe(`the steps stop as soon as one decides: ${T_267_STOPS_EARLY}`, () => {
  it('HT-1 settles a point on a drawn shape although HT-2 would prefer the nearer neighbour', () => {
    const tall = sizesWith(STACKED.sizes, 'S-255', defaultOf('S-255') + 60)
    const own = boxOf((STACKED.unstarted as unknown as { plan: unknown }).plan)
    const near = { x: own.left + own.width * 0.5, y: own.top + 1 }
    expect(answerAt(STACKED, near.x, near.y, tall).taskUid, T_267_STOPS_EARLY).toBe(UNSTARTED_UID)
  })

  it('HT-2 settles a point outside every shape although HT-3 would prefer the other type', () => {
    const tall = sizesWith(
      sizesWith(STACKED.sizes, 'S-252', defaultOf('S-252') + 40),
      'S-255',
      defaultOf('S-255') + 40,
    )
    const upper = boxOf((STACKED.started as unknown as { plan: unknown }).plan)
    const lower = boxOf((STACKED.unstarted as unknown as { plan: unknown }).plan)
    const gap = lower.top - upper.bottom
    const x = upper.right + defaultOf('S-253') / 2
    expect(answerAt(STACKED, x, upper.bottom + gap * 0.2, tall).taskUid, T_267_STOPS_EARLY).toBe(STARTED_UID)
  })
})
