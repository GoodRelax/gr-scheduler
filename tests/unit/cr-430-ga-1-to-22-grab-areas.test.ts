// CR-430: table T-266 gives each of the 22 targets a grab area of its own, out of 41 values.

import { describe, expect, it } from 'vitest'

import {
  actualOf,
  answerAt,
  boxOf,
  boxOfRect,
  changesUnder,
  COLUMN_ACROSS,
  COLUMN_DOWN,
  defaultOf,
  dummiesOf,
  fadeHandlesOf,
  grabAt,
  grabRow,
  grabRows,
  grabSettingIds,
  markerOf,
  ownerOf,
  planOf,
  probesOf,
  resumeOf,
  sceneOf,
  settingIdsIn,
  sizeIn,
  sizesWith,
  STARTED_UID,
  type GrabSizes,
  type Probe,
  type Scene,
  type ShapeKind,
} from './cr-430-scene'

const NO_BAND = '—'

const T_266_ONE_TARGET_A_ROW = '⭐ 1 行が 1 つの操作対象である。'
const T_266_NO_OTHER_ROW = '⛔ どの値も、ほかの行の掴み代を動かさないこと（MUST NOT）。'
const T_266_VALUES_LIVE_IN_T_206 =
  '値は `_assets/tbl-settings.md` の 表 T-206 が持ち、単位は画面の px である（マイルストーンの予定の幅だけが比である）。'
const FR_104_EVERY_TARGET =
  '`GRS` は、表示をどこまで縮小しても、描いているタスク・マイルストーン・進捗マーカー・依存線のそれぞれを、ポインタで指して操作できるようにすること（MUST）。'
const FR_104_OWN_MARGIN = 'そのために、各操作対象に、他の対象に取られない掴み代を持たせること（MUST）。'
const FR_104_INDEPENDENT =
  '⭐ 掴み代の値を対象ごとに独立させるのは、1 つの対象の掴みやすさを直したときに、ほかの対象の掴みやすさを変えないためである。'
const T_266_DUMMY_OWN_VALUES =
  '⭐ ダミーの掴み代は実績と別の値で持ち、既定は実績と同じ値とすること（MUST） —— 値を分けておかないと、ダミーの掴みやすさを直したときに実績の掴みやすさが動く。'
const T_266_DUMMY_HALVES =
  '⭐ 矩形では、印（幅は 表 T-240 の `DM-3`）を横幅の中央で左右に割り、左半分を開始側（`GA-5`）、右半分を終了側（`GA-6`）とすること（MUST）。'
const T_266_DUMMY_NOT_OUTSIDE = '⛔ 矩形のダミーの掴み代を印の外へ広げてはならない（MUST NOT）。'
const T_266_ARROW_DUMMY_SPLIT = '重なりは印の横幅の中央で割ること（MUST）。'
const T_266_ACTUAL_HALF_CAP = '内側は実績の幅の半分までとすること（MUST）。'
const T_266_PLAN_INNER_ZERO = '⭐ 予定の端の内側は既定を 0 とする —— 上げると短い予定では本体（`GA-9`）が消える。'
const T_266_FADE_ONLY_SELECTED = '⚠️ フェードの掴み点（`GA-7` / `GA-8`）は、選んでいるタスクにだけ出る（`FR-075`）。'
const T_266_NO_DISPLAY_RATIO =
  '⚠️ 掴み代に表示の倍率の描く比を掛けないこと（MUST NOT） —— 規則は 表 T-252 の `DS-7` が持つ。'

const EXPECTED_ROW_IDS = Array.from({ length: 22 }, (_one, at) => `GA-${at + 1}`)

const sceneKindOf = (shape: string): ShapeKind => {
  if (shape.includes('共通')) return 'rectangle'
  if (shape.includes('には無い')) return 'rectangle'
  if (shape.includes('◆')) return 'milestone'
  if (shape.includes('--->')) return 'arrow'
  return 'rectangle'
}

// see S-63
const RECTANGLE = sceneOf('rectangle', { progressMarkerVisible: true })
const ARROW = sceneOf('arrow', { progressMarkerVisible: true })
const MILESTONE = sceneOf('milestone', { progressMarkerVisible: true })

const sceneFor = (kind: ShapeKind): Scene =>
  kind === 'arrow' ? ARROW : kind === 'milestone' ? MILESTONE : RECTANGLE

const PROBES: Readonly<Record<string, readonly Probe[]>> = {
  rectangle: probesOf(RECTANGLE),
  arrow: probesOf(ARROW),
  milestone: probesOf(MILESTONE),
}

const answersIn = (scene: Scene, probes: readonly Probe[]): ReadonlySet<string> => {
  const out = new Set<string>()
  for (const at of probes) {
    const grab = grabAt(scene, at.x, at.y)
    if (grab !== null) out.add(grab)
  }
  return out
}

const cachedAnswers = new Map<string, ReadonlySet<string>>()

const answersOf = (kind: ShapeKind): ReadonlySet<string> => {
  const held = cachedAnswers.get(kind)
  if (held !== undefined) return held
  const made = answersIn(sceneFor(kind), PROBES[kind]!)
  cachedAnswers.set(kind, made)
  return made
}

describe('table T-266 -- the manuscript shape the 22 rows and the 41 values make', () => {
  it(`holds one row per target, GA-1 through GA-22: ${T_266_ONE_TARGET_A_ROW}`, () => {
    expect(grabRows().map((row) => row.id)).toEqual(EXPECTED_ROW_IDS)
  })

  it(`names 41 values across the 横 and 縦 columns: ${T_266_VALUES_LIVE_IN_T_206}`, () => {
    expect(grabSettingIds()).toHaveLength(41)
    expect(new Set(grabSettingIds()).size).toBe(41)
  })

  it(`gives every one of the 41 exactly one owning row: ${T_266_NO_OTHER_ROW}`, () => {
    for (const settingId of grabSettingIds()) {
      const owners = grabRows().filter((row) => row.settingIds.includes(settingId))
      expect(owners.map((one) => one.id), `${settingId}: ${T_266_NO_OTHER_ROW}`).toHaveLength(1)
    }
  })

  it(`puts every one of the 41 in table T-206: ${T_266_VALUES_LIVE_IN_T_206}`, () => {
    for (const settingId of grabSettingIds()) {
      expect(Number.isFinite(defaultOf(settingId)), `${settingId} is missing from table T-206`).toBe(true)
    }
  })

  it.each(EXPECTED_ROW_IDS)('%s names a value of its own unless its grab is the drawn shape itself', (id) => {
    const row = grabRow(id)
    const drawnShapeItself = row.across.includes('描いた形そのもの')
    expect(row.settingIds.length > 0, `${id} (${row.across}): ${T_266_ONE_TARGET_A_ROW}`).toBe(!drawnShapeItself)
  })
})

describe('grabSizesOf -- the 41 values reach the hit test unchanged', () => {
  it.each(grabSettingIds())(`carries %s at the default table T-206 prints: ${T_266_VALUES_LIVE_IN_T_206}`, (settingId) => {
    expect(sizeIn(RECTANGLE.sizes, settingId), `${settingId} is not a key of GrabSizes`).toBeDefined()
    expect(sizeIn(RECTANGLE.sizes, settingId), `${settingId}: ${T_266_VALUES_LIVE_IN_T_206}`).toBeCloseTo(
      defaultOf(settingId),
      6,
    )
  })

  it(`keeps the display ratio off every one of them: ${T_266_NO_DISPLAY_RATIO}`, () => {
    const scaled = sceneOf('rectangle', { displayScale: 200 })
    for (const settingId of grabSettingIds()) {
      expect(sizeIn(scaled.sizes, settingId), `${settingId}: ${T_266_NO_DISPLAY_RATIO}`).toBeCloseTo(
        defaultOf(settingId),
        6,
      )
    }
  })
})

describe(`table T-266 -- every row is reachable with a pointer: ${FR_104_EVERY_TARGET}`, () => {
  it.each(EXPECTED_ROW_IDS)('%s answers somewhere over the shape it belongs to', (id) => {
    const kind = sceneKindOf(grabRow(id).shape)
    expect([...answersOf(kind)].sort(), `${id} (${kind}): ${FR_104_OWN_MARGIN}`).toContain(id)
  })
})

describe(`table T-266 -- one value moves one target and one direction: ${FR_104_INDEPENDENT}`, () => {
  const BUMP = 9

  const sweepOf = (settingId: string) => {
    const owner = ownerOf(settingId)
    const kind = sceneKindOf(owner.shape)
    const scene = sceneFor(kind)
    const moved = sizesWith(scene.sizes, settingId, defaultOf(settingId) + BUMP)
    return { owner, kind, scene, changes: changesUnder(scene, PROBES[kind]!, moved) }
  }

  it.each(grabSettingIds())(`%s moves no other row of table T-266: ${T_266_NO_OTHER_ROW}`, (settingId) => {
    const { owner, changes } = sweepOf(settingId)
    const strangers = changes.filter((one) => one.before !== owner.id && one.after !== owner.id)
    expect(
      strangers.slice(0, 6),
      `${settingId} belongs to ${owner.id}, so no probe may change without ${owner.id} on one side: ${T_266_NO_OTHER_ROW}`,
    ).toEqual([])
  })

  const MARKER_CAP = 'マーカーの中心で止めること'
  const INNER = '内側'

  // WHY: only the inner value the clause names, never the row's other two: GA-3's inner reach
  // WHY: stops at the marker's centre, which stands nearer than S-257 ever does, so raising it
  // WHY: cannot move an answer -- while S-256 and S-258 of the same row still can.
  const cappedByTheMarker = (settingId: string): boolean => {
    const across = ownerOf(settingId).across
    if (!across.includes(MARKER_CAP) || !across.includes(INNER)) return false
    const inner = across.slice(across.indexOf(INNER))
    return settingIdsIn(inner.split('。')[0] ?? '').includes(settingId)
  }

  const capped = (settingId: string): boolean =>
    ownerOf(settingId).across.includes('印の幅の半分までとすること') || cappedByTheMarker(settingId)

  it.each(grabSettingIds().filter((one) => !capped(one)))(
    `%s reaches the hit test: moving it moves at least one answer`,
    (settingId) => {
      const { owner, kind, changes } = sweepOf(settingId)
      expect(
        changes.length,
        `${settingId} (${owner.id}, ${kind}) changed nothing, so the value does not reach the hit test`,
      ).toBeGreaterThan(0)
    },
  )

  // WHY: one Task's answers, not the row's: every Task drawn carries the same row of table T-266,
  // WHY: so a bounding box over all three widens as soon as a neighbour's own grab starts answering.
  // WHY: one Task's answers, not the row's: every Task drawn carries the same row of table T-266,
  // WHY: so a bounding box over all three widens as soon as a neighbour's own grab starts answering.
  const answeringPoints = (scene: Scene, probes: readonly Probe[], sizes: GrabSizes, id: string) =>
    probes.filter((at) => {
      const answer = answerAt(scene, at.x, at.y, sizes)
      return answer.grab === id && (answer.taskUid === null || answer.taskUid === STARTED_UID)
    })

  const spreadOf = (scene: Scene, probes: readonly Probe[], sizes: GrabSizes, id: string) => {
    const mine = answeringPoints(scene, probes, sizes, id)
    const xs = mine.map((one) => one.x)
    const ys = mine.map((one) => one.y)
    return { across: [Math.min(...xs), Math.max(...xs)], down: [Math.min(...ys), Math.max(...ys)] }
  }

  const directionOf = (settingId: string): 'across' | 'down' | 'both' => {
    const owner = ownerOf(settingId)
    const inAcross = settingIdsIn(owner.across).includes(settingId)
    const inDown = settingIdsIn(owner.down).includes(settingId)
    if (inAcross && (inDown || owner.down.includes('同左'))) return 'both'
    return inAcross ? 'across' : 'down'
  }

  // WHY: a row whose down column is the dash has no band at all -- table T-266 gives GA-19 a margin
  // WHY: measured from the drawn stroke's edge, so on a horizontal run it necessarily reaches down too.
  const bandless = (settingId: string): boolean => ownerOf(settingId).down.trim() === NO_BAND

  const oneWay = grabSettingIds().filter(
    (one) => directionOf(one) !== 'both' && !capped(one) && !bandless(one),
  )

  // WHY: the lines the grab already owned, not the whole grid: a taller band exposes columns that a
  // WHY: neighbouring row shadowed at every earlier height, and that is reach gained, not reach moved.
  it.each(oneWay)(`%s moves its target in one direction only: ${T_266_ONE_TARGET_A_ROW}`, (settingId) => {
    const owner = ownerOf(settingId)
    const kind = sceneKindOf(owner.shape)
    const scene = sceneFor(kind)
    const probes = PROBES[kind]!
    const moved = sizesWith(scene.sizes, settingId, defaultOf(settingId) + BUMP)
    const held = answeringPoints(scene, probes, scene.sizes, owner.id)
    const still = directionOf(settingId) === 'across' ? 'down' : 'across'
    const along = still === 'down' ? new Set(held.map((one) => one.x)) : new Set(held.map((one) => one.y))
    const kept = probes.filter((one) => along.has(still === 'down' ? one.x : one.y))
    const before = spreadOf(scene, kept, scene.sizes, owner.id)
    const after = spreadOf(scene, kept, moved, owner.id)
    expect(after[still], `${settingId} (${owner.id}) also moved the ${still} reach of its grab`).toEqual(before[still])
  })

  it('names the values that govern both directions, so none is skipped in silence', () => {
    const both = grabSettingIds().filter((one) => directionOf(one) === 'both')
    for (const settingId of both) {
      expect(ownerOf(settingId).down, `${settingId} is read in both directions`).toMatch(/同左|S-\d+/)
    }
    expect(both.length + oneWay.length + grabSettingIds().filter(capped).length, T_266_NO_OTHER_ROW).toBeLessThanOrEqual(
      grabSettingIds().length,
    )
  })
})

// WHY: the Task no dependency touches -- a line leaves the predecessor's plan end at that very
// WHY: height, and off the drawn shape table T-268 puts the line (TY-2) ahead of a plan end (TY-6).
describe('GA-1 / GA-2 -- the plan ends of a rectangle', () => {
  const plan = boxOf(planOf(RECTANGLE.unstarted))
  const outerStart = defaultOf('S-250')
  const outerFinish = defaultOf('S-253')

  it('GA-1 answers outside the drawn left edge and stops at S-250', () => {
    expect(grabAt(RECTANGLE, plan.left - outerStart / 2, plan.middleY)).toBe('GA-1')
    expect(grabAt(RECTANGLE, plan.left - outerStart - 2, plan.middleY)).not.toBe('GA-1')
  })

  it('GA-2 answers outside the drawn right edge and stops at S-253', () => {
    expect(grabAt(RECTANGLE, plan.right + outerFinish / 2, plan.middleY)).toBe('GA-2')
    expect(grabAt(RECTANGLE, plan.right + outerFinish + 2, plan.middleY)).not.toBe('GA-2')
  })

  it(`keeps the plan ends from eating the body, S-251 and S-254 being 0: ${T_266_PLAN_INNER_ZERO}`, () => {
    expect(defaultOf('S-251'), T_266_PLAN_INNER_ZERO).toBe(0)
    expect(defaultOf('S-254'), T_266_PLAN_INNER_ZERO).toBe(0)
    expect(grabAt(RECTANGLE, plan.left + 1, plan.middleY), T_266_PLAN_INNER_ZERO).not.toBe('GA-1')
  })

  it('a dependency line takes the same point on the Task it leaves, as table T-268 orders', () => {
    const linked = boxOf(planOf(RECTANGLE.started))
    expect(grabAt(RECTANGLE, linked.right + outerFinish / 2, linked.middleY)).toBe('GA-19')
  })
})

describe('GA-3 / GA-4 -- the actual ends of a rectangle', () => {
  const actual = boxOf(actualOf(RECTANGLE.started))
  const innerStart = Math.min(defaultOf('S-257'), actual.width / 2)
  const innerFinish = Math.min(defaultOf('S-260'), actual.width / 2)

  it('GA-3 answers inside the drawn left edge of the actual', () => {
    expect(grabAt(RECTANGLE, actual.left + innerStart / 2, actual.middleY)).toBe('GA-3')
  })

  it('GA-4 answers inside the drawn right edge of the actual', () => {
    expect(grabAt(RECTANGLE, actual.right - innerFinish / 2, actual.middleY)).toBe('GA-4')
  })

  it(`never lets the two ends swap on a short actual: ${T_266_ACTUAL_HALF_CAP}`, () => {
    const short = sceneOf('rectangle', { zoomX: 0.5 })
    const bar = boxOf(actualOf(short.started))
    expect(bar.width, 'premise: the actual is narrower than twice the inner margin').toBeLessThan(
      2 * Math.min(defaultOf('S-257'), defaultOf('S-260')),
    )
    expect(grabAt(short, bar.left + bar.width * 0.25, bar.middleY), T_266_ACTUAL_HALF_CAP).not.toBe('GA-4')
    expect(grabAt(short, bar.right - bar.width * 0.25, bar.middleY), T_266_ACTUAL_HALF_CAP).not.toBe('GA-3')
  })
})

describe('GA-5 / GA-6 -- the dummy of a rectangle that has not started', () => {
  const dummies = dummiesOf(RECTANGLE.unstarted)
  const ink = dummies.length > 0 ? boxOfRect(dummies[0]!.ink) : null

  it('premise: table T-240 draws a mark for the Task that has not started', () => {
    expect(dummies.length, 'the fixture drew no dummy, so this file cannot ask its question').toBeGreaterThan(0)
  })

  it(`takes the left half as GA-5 and the right half as GA-6: ${T_266_DUMMY_HALVES}`, () => {
    expect(ink, 'no dummy ink').not.toBeNull()
    expect(grabAt(RECTANGLE, ink!.left + ink!.width * 0.25, ink!.middleY), T_266_DUMMY_HALVES).toBe('GA-5')
    expect(grabAt(RECTANGLE, ink!.left + ink!.width * 0.75, ink!.middleY), T_266_DUMMY_HALVES).toBe('GA-6')
  })

  it(`holds the dummy on its drawn mark and nothing wider: ${T_266_DUMMY_NOT_OUTSIDE}`, () => {
    expect(ink, 'no dummy ink').not.toBeNull()
    for (const x of [ink!.left - 2, ink!.right + 2]) {
      expect([grabAt(RECTANGLE, x, ink!.middleY)], `${T_266_DUMMY_NOT_OUTSIDE} (x = ${x})`).not.toContain('GA-5')
      expect([grabAt(RECTANGLE, x, ink!.middleY)], `${T_266_DUMMY_NOT_OUTSIDE} (x = ${x})`).not.toContain('GA-6')
    }
  })

  it(`keeps the dummy values apart from the actual values, equal by default: ${T_266_DUMMY_OWN_VALUES}`, () => {
    expect(grabRow('GA-5').settingIds, T_266_DUMMY_OWN_VALUES).toEqual(['S-262', 'S-263', 'S-264'])
    expect(grabRow('GA-3').settingIds, T_266_DUMMY_OWN_VALUES).toEqual(['S-256', 'S-257', 'S-258'])
    expect(defaultOf('S-262'), T_266_DUMMY_OWN_VALUES).toBe(defaultOf('S-256'))
    expect(defaultOf('S-263'), T_266_DUMMY_OWN_VALUES).toBe(defaultOf('S-257'))
    expect(defaultOf('S-264'), T_266_DUMMY_OWN_VALUES).toBe(defaultOf('S-258'))
  })
})

describe('GA-7 / GA-8 -- the fade grab points of the selected Task', () => {
  const points = [...fadeHandlesOf(RECTANGLE.started)].sort((a, b) => a.y - b.y)

  it(`premise: FR-075 gives the selected Task two points: ${T_266_FADE_ONLY_SELECTED}`, () => {
    expect(points, T_266_FADE_ONLY_SELECTED).toHaveLength(2)
  })

  it('GA-7 answers at the point on the plan top edge and GA-8 at the point on the bottom edge', () => {
    expect(grabAt(RECTANGLE, points[0]!.x, points[0]!.y)).toBe('GA-7')
    expect(grabAt(RECTANGLE, points[1]!.x, points[1]!.y)).toBe('GA-8')
  })

  it('reaches half of S-268 and S-269 from the point and no further', () => {
    const halves = [defaultOf('S-268') / 2, defaultOf('S-269') / 2]
    points.forEach((point, at) => {
      const half = halves[at]!
      expect(grabAt(RECTANGLE, point.x + half - 0.2, point.y)).toBe(`GA-${7 + at}`)
      expect(grabAt(RECTANGLE, point.x + half + 0.2, point.y)).not.toBe(`GA-${7 + at}`)
    })
  })
})

describe('GA-9 -- the body of a rectangle is the drawn shape itself', () => {
  const plan = boxOf(planOf(RECTANGLE.started))

  it('answers inside the drawn plan, clear of both ends', () => {
    expect(grabAt(RECTANGLE, plan.left + plan.width * 0.75, plan.middleY)).toBe('GA-9')
  })

  it('does not reach outside the drawn plan', () => {
    const beyond = Math.max(defaultOf('S-250'), defaultOf('S-253')) + 4
    expect(grabAt(RECTANGLE, plan.left - beyond, plan.middleY)).not.toBe('GA-9')
    expect(grabAt(RECTANGLE, plan.right + beyond, plan.middleY)).not.toBe('GA-9')
  })
})

describe('GA-10 through GA-14 -- the line-only shape keeps plan above the mid-line and actual below', () => {
  const plan = boxOf(planOf(ARROW.started))
  const actual = boxOf(actualOf(ARROW.started))

  const spanTakes = (id: string, from: number, to: number, y: number): boolean => {
    for (let x = from; x <= to; x += 0.5) if (grabAt(ARROW, x, y) === id) return true
    return false
  }

  it('premise: the plan line is drawn above the actual line', () => {
    expect(plan.middleY, 'XS-5 puts the plan on the second row and XS-6 the actual on the third').toBeLessThan(
      actual.middleY,
    )
  })

  it.each([
    ['GA-10', 'S-270'],
    ['GA-11', 'S-272'],
  ] as const)('%s answers within its centred width and not beyond it', (id, settingId) => {
    const half = defaultOf(settingId) / 2
    const at = id === 'GA-10' ? plan.left : plan.right
    expect(spanTakes(id, at - half, at + half, plan.middleY)).toBe(true)
    expect(grabAt(ARROW, id === 'GA-10' ? at - half - 3 : at + half + 3, plan.middleY)).not.toBe(id)
  })

  it.each([
    ['GA-12', 'S-274'],
    ['GA-13', 'S-276'],
  ] as const)('%s answers within its centred width on the actual line', (id, settingId) => {
    const half = defaultOf(settingId) / 2
    const at = id === 'GA-12' ? actual.left : actual.right
    expect(spanTakes(id, at - half, at + half, actual.middleY)).toBe(true)
  })

  it('GA-14 answers on the drawn plan arrow between its ends', () => {
    expect(grabAt(ARROW, plan.left + plan.width * 0.6, plan.middleY)).toBe('GA-14')
  })
})

describe('GA-15 / GA-16 / GA-17 -- the three diamonds of a milestone', () => {
  const plan = boxOf(planOf(MILESTONE.started))
  const actual = boxOf(actualOf(MILESTONE.started))
  const dummies = dummiesOf(MILESTONE.unstarted)

  it('GA-16 answers on the actual diamond of a milestone that has started', () => {
    expect(grabAt(MILESTONE, actual.middleX, actual.middleY)).toBe('GA-16')
  })

  it('GA-15 answers in the ring the S-278 square leaves outside the actual', () => {
    const ratio = defaultOf('S-278')
    const outer = (plan.width * ratio) / 2
    const inner = actual.width / 2 + defaultOf('S-280')
    expect(outer, 'premise: the S-278 square is wider than the actual square').toBeGreaterThan(inner)
    // WHY: the left of the diamond -- LP-7 stands the marker at the base diamond's right edge, and
    // WHY: a marker outside the actual answers before the milestone plan (table T-268, TY-2 over TY-8).
    expect(grabAt(MILESTONE, plan.middleX - (inner + outer) / 2, plan.middleY)).toBe('GA-15')
    expect(grabAt(MILESTONE, plan.middleX - outer - 3, plan.middleY)).not.toBe('GA-15')
    expect(grabAt(MILESTONE, plan.middleX + (inner + outer) / 2, plan.middleY)).toBe('GA-18')
  })

  it('GA-17 answers on the dummy diamond of a milestone that has not started', () => {
    expect(dummies.length, 'the fixture drew no milestone dummy').toBeGreaterThan(0)
    const ink = boxOfRect(dummies[0]!.ink)
    expect(grabAt(MILESTONE, ink.middleX, ink.middleY)).toBe('GA-17')
  })
})

describe('GA-18 -- the progress marker is grabbed on the marker itself', () => {
  const marker = markerOf(RECTANGLE.started)

  it('premise: the fixture drew a marker', () => {
    expect(marker, 'no marker was drawn, so this file cannot ask its question').not.toBeNull()
  })

  it('answers right of the centre of the drawn marker', () => {
    expect(grabAt(RECTANGLE, marker!.centre.x + 1, marker!.centre.y)).toBe('GA-18')
  })

  it('leaves the centre itself to the actual start, whose inner reach table T-266 stops there', () => {
    expect(grabAt(RECTANGLE, marker!.centre.x, marker!.centre.y)).toBe('GA-3')
  })

  it('stops S-284 outside the drawn marker', () => {
    const reach = marker!.radius + defaultOf('S-284')
    expect(grabAt(RECTANGLE, marker!.centre.x + reach + 3, marker!.centre.y)).not.toBe('GA-18')
  })
})

describe('GA-19 -- the dependency line is grabbed from the edge of the drawn line', () => {
  it('answers somewhere along the drawn line', () => {
    expect([...answersOf('rectangle')]).toContain('GA-19')
  })

  it('reads S-285 from the drawn edge, so it is the only value the row names', () => {
    expect(grabRow('GA-19').settingIds).toEqual(['S-285'])
    expect(grabRow('GA-19').down.replace(/\s/g, ''), 'the dependency line has no band of its own').toBe('—')
  })
})

describe('GA-20 -- the resume icon is grabbed on a box that does not shrink', () => {
  const resume = resumeOf(RECTANGLE.started)

  it('premise: the fixture drew a resume icon with a box', () => {
    expect(resume, 'no resume icon was drawn').not.toBeNull()
    expect(resume!.box, 'ResumeGeometry carries no box').toBeDefined()
  })

  it('answers at the centre of that box', () => {
    const box = boxOfRect(resume!.box)
    expect(grabAt(RECTANGLE, box.middleX, box.middleY)).toBe('GA-20')
  })

  it('keeps the box when the resume date is undecided, although the icon is drawn smaller', () => {
    const undecided = sceneOf('rectangle', { progressMarkerVisible: true })
    const shown = resumeOf(undecided.started)
    expect(shown, 'no resume icon was drawn').not.toBeNull()
    const box = boxOfRect(shown!.box)
    const marker = markerOf(undecided.started)
    expect(marker, 'no marker was drawn').not.toBeNull()
    expect(box.width, '箱はそのタスクの進捗マーカーの径であり').toBeCloseTo(marker!.radius * 2, 3)
  })
})

describe('GA-21 / GA-22 -- the dummy of a line-only shape splits at the centre of its mark', () => {
  const dummies = dummiesOf(ARROW.unstarted)

  it('premise: the line-only shape draws a mark for the Task that has not started', () => {
    expect(dummies.length, 'the fixture drew no dummy on the line-only shape').toBeGreaterThan(0)
  })

  it(`takes the left half as GA-21 and the right half as GA-22: ${T_266_ARROW_DUMMY_SPLIT}`, () => {
    const ink = boxOfRect(dummies[0]!.ink)
    expect(grabAt(ARROW, ink.left + ink.width * 0.25, ink.middleY), T_266_ARROW_DUMMY_SPLIT).toBe('GA-21')
    expect(grabAt(ARROW, ink.left + ink.width * 0.75, ink.middleY), T_266_ARROW_DUMMY_SPLIT).toBe('GA-22')
  })

  it('reaches outside the mark, unlike the rectangle dummy, because the mark is narrower than the value', () => {
    const ink = boxOfRect(dummies[0]!.ink)
    const half = defaultOf('S-287') / 2
    expect(half, 'premise: half of S-287 is wider than half the mark').toBeGreaterThan(ink.width / 2)
    expect(grabAt(ARROW, ink.left - 1, ink.middleY)).toBe('GA-21')
  })
})

describe('the columns table T-266 writes stay the columns the tests read', () => {
  it('keeps the 横 and 縦 columns, which is where the 41 values are named', () => {
    for (const id of EXPECTED_ROW_IDS) {
      expect(grabRow(id).across, `${id} has no ${COLUMN_ACROSS} cell`).not.toBe('')
      expect(typeof grabRow(id).down, `${id} has no ${COLUMN_DOWN} cell`).toBe('string')
    }
  })
})
