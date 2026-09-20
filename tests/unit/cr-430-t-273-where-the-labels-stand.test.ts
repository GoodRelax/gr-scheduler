// FR-109 table T-273: where the marker stands and where the name starts.

import { describe, expect, it } from 'vitest'

import {
  ASSIGNEE_GAP,
  EPS,
  LABEL_GAP,
  LABEL_PAD,
  MARKER_D,
  MILESTONE_NAME_GAP,
  S_260,
  S_303,
  bandOf,
  bandOfRect,
  cellOf,
  day,
  sceneOf,
  taskOf,
  type Band,
  type Scene,
} from './cr-430-cross-section-scene'

const SHAPE = '形'
const MARKER = 'マーカー'
const FITS = '入る'
const MARKER_AT = 'マーカーの位置'
const NAME_FROM = '名前の書き出し'

const says = (row: string): string =>
  `T-273 ${row} [${cellOf('T-273', row, SHAPE)} / ${MARKER}: ${cellOf('T-273', row, MARKER)} / ` +
  `${FITS}: ${cellOf('T-273', row, FITS)}] ${MARKER_AT}: ${cellOf('T-273', row, MARKER_AT)} / ` +
  `${NAME_FROM}: ${cellOf('T-273', row, NAME_FROM)}`

const LP_WHAT_FITS_MEANS =
  '「入る」とは、（マーカーを出すなら マーカーの径 ＋ `S-32`、出さないなら `S-31`）＋ 名前の幅 ＋ 実績の終了の内側の幅（表 T-206 の `S-260`）が、基準の幅以下であることとすること（MUST）。'
const LP_ONLY_THE_FINISH_SIDE_IS_RESERVED =
  '終了側だけを取り置くのは、マーカーが実績の開始の掴み代の上に立つ設計だからである —— 開始側は取り置かない。'
const LP_NEVER_THE_NAME_LEFT_OF_THE_MARKER =
  '名称ラベルをマーカーの左に置いてはならない（MUST NOT） —— どの行でも左から マーカー → 名前 の順である。'
const LP_THE_ASSIGNEE_LABEL =
  '担当と進捗は 1 枚の札にまとめ、右寄せで、描いている予定と実績のうち早いほうの開始から `S-302` だけ左に置くこと（MUST）。'
const LP_THE_SEPARATOR = '担当と進捗の区切りは「 : 」（半角コロンの前後に空白 1 つ）とすること（MUST）。'
const LP_THE_RESUME_ICON_IS_OUT_OF_THE_ROW =
  '再開アイコンは本表の並びには入らない（MUST） —— 未定のアイコンも入らない。'
const LP_WHEN_IT_DOES_NOT_FIT_AND_THE_ICON_IS_REACHED =
  '矩形で「入らない」とき、札（マーカーと名前）は実績のすぐ右に置き、その並びが再開アイコンに届くときだけ、アイコンの掴む箱（表 T-266 の `GA-20`）の右端から並べること（MUST）。'

const SHORT = 'ab'
const LONG = 'a name that is far too long to stand inside a narrow bar'

const rectangle = (
  over: Readonly<Record<string, unknown>>,
  settings: Readonly<Record<string, unknown>> = {},
  name: string = SHORT,
): Scene =>
  sceneOf({
    tasks: [taskOf({ name, start: day(2), finish: day(28), ...over })],
    shapeKind: 'rectangle',
    settings,
  })

const lineShape = (
  shapeKind: string,
  over: Readonly<Record<string, unknown>>,
  settings: Readonly<Record<string, unknown>> = {},
  name: string = SHORT,
): Scene =>
  sceneOf({
    tasks: [taskOf({ name, start: day(2), finish: day(28), ...over })],
    shapeKind,
    settings,
  })

const milestone = (
  over: Readonly<Record<string, unknown>> = {},
  settings: Readonly<Record<string, unknown>> = {},
): Scene =>
  sceneOf({
    tasks: [taskOf({ name: SHORT, start: day(6), finish: day(6), milestone: true, ...over })],
    shapeKind: 'milestone',
    settings,
  })

const mustBe = <T>(value: T | null | undefined, what: string): T => {
  expect(value, `premise: ${what}`).not.toBeNull()
  expect(value, `premise: ${what}`).not.toBeUndefined()
  return value as T
}

const basisOf = (one: Scene): Band => {
  const drawn = one.taskOf(1)
  if (drawn.actual !== null) return bandOf(drawn.actual)
  if (drawn.dummies.length > 0) return bandOfRect(mustBe(drawn.dummies[0], 'a dummy').ink)
  return bandOf(mustBe(drawn.plan ?? drawn.milestoneFigure, 'a plan to hang the labels on'))
}

const markerOf = (one: Scene) => mustBe(one.taskOf(1).marker, 'a marker is drawn')
const nameStartOf = (one: Scene): number => mustBe(one.taskOf(1).label, 'a name is drawn').x

const WIDE_ACTUAL = { actualStart: day(2), actualFinish: day(26), percentComplete: 60 }
const NARROW_ACTUAL = { actualStart: day(4), actualFinish: day(5), percentComplete: 20 }
const NO_MARKER = { progressMarkerVisible: false }

describe(`T-273 LP-1 -- ${says('LP-1')}`, () => {
  it('stands the marker on the start of the basis and the name S-32 right of it', () => {
    const scene = rectangle(WIDE_ACTUAL)
    const basis = basisOf(scene)
    const marker = markerOf(scene)
    expect(marker.centre.x - marker.radius, says('LP-1')).toBeCloseTo(basis.left, 6)
    expect(nameStartOf(scene), says('LP-1')).toBeCloseTo(marker.centre.x + marker.radius + LABEL_GAP, 6)
  })

  it(`${LP_WHAT_FITS_MEANS} ${LP_ONLY_THE_FINISH_SIDE_IS_RESERVED}`, () => {
    const scene = rectangle(WIDE_ACTUAL)
    const basis = basisOf(scene)
    expect(basis.right - basis.left, LP_WHAT_FITS_MEANS).toBeGreaterThanOrEqual(
      MARKER_D + LABEL_GAP + S_260 - EPS,
    )
  })
})

describe(`T-273 LP-2 -- ${says('LP-2')}`, () => {
  it('stands the marker just right of the end of the basis and the name S-32 right of it', () => {
    const scene = rectangle(NARROW_ACTUAL, {}, LONG)
    const basis = basisOf(scene)
    const marker = markerOf(scene)
    expect(marker.centre.x - marker.radius, says('LP-2')).toBeCloseTo(basis.right, 6)
    expect(nameStartOf(scene), says('LP-2')).toBeCloseTo(marker.centre.x + marker.radius + LABEL_GAP, 6)
  })

  it('switches from LP-1 to LP-2 once and never back as the basis narrows', () => {
    const frames = Array.from({ length: 24 }, (_, index) => 25 - index).map((lastDay) => {
      const scene = rectangle({ actualStart: day(2), actualFinish: day(lastDay), percentComplete: 50 }, {}, LONG)
      const basis = basisOf(scene)
      const marker = markerOf(scene)
      return { lastDay, inside: Math.abs(marker.centre.x - marker.radius - basis.left) <= EPS }
    })
    expect(frames.some((one) => one.inside), `premise: ${says('LP-1')}`).toBe(true)
    expect(frames.some((one) => !one.inside), `premise: ${says('LP-2')}`).toBe(true)
    const firstOutside = frames.findIndex((one) => !one.inside)
    expect(
      frames.slice(firstOutside).every((one) => !one.inside),
      `${says('LP-1')} / ${says('LP-2')}`,
    ).toBe(true)
  })
})

describe(`T-273 LP-3 -- ${says('LP-3')}`, () => {
  it('starts the name S-31 right of the start of the basis when no marker is drawn', () => {
    const scene = rectangle(WIDE_ACTUAL, NO_MARKER)
    expect(scene.taskOf(1).marker, `premise: ${says('LP-3')}`).toBeNull()
    expect(nameStartOf(scene), says('LP-3')).toBeCloseTo(basisOf(scene).left + LABEL_PAD, 6)
  })
})

describe(`T-273 LP-4 -- ${says('LP-4')}`, () => {
  it('starts the name S-31 right of the end of the basis, outside the shape', () => {
    const scene = rectangle(NARROW_ACTUAL, NO_MARKER, LONG)
    const basis = basisOf(scene)
    expect(scene.taskOf(1).marker, `premise: ${says('LP-4')}`).toBeNull()
    expect(nameStartOf(scene), says('LP-4')).toBeCloseTo(basis.right + LABEL_PAD, 6)
    expect(nameStartOf(scene), says('LP-4')).toBeGreaterThan(basis.right)
  })
})

const LINE_SHAPES = ['arrow', 'endpointSpan'] as const

describe(`T-273 LP-5 -- ${says('LP-5')}`, () => {
  for (const shapeKind of LINE_SHAPES) {
    it(`${shapeKind}: marker on the basis start and the name S-32 right of it, whatever the width`, () => {
      const wide = lineShape(shapeKind, WIDE_ACTUAL)
      const narrow = lineShape(shapeKind, NARROW_ACTUAL, {}, LONG)
      for (const scene of [wide, narrow]) {
        const basis = basisOf(scene)
        const marker = markerOf(scene)
        expect(marker.centre.x - marker.radius, says('LP-5')).toBeCloseTo(basis.left, 6)
        expect(nameStartOf(scene), says('LP-5')).toBeCloseTo(marker.centre.x + marker.radius + LABEL_GAP, 6)
      }
    })
  }
})

describe(`T-273 LP-6 -- ${says('LP-6')}`, () => {
  for (const shapeKind of LINE_SHAPES) {
    it(`${shapeKind}: the name starts S-31 right of the basis start with no marker`, () => {
      const wide = lineShape(shapeKind, WIDE_ACTUAL, NO_MARKER)
      const narrow = lineShape(shapeKind, NARROW_ACTUAL, NO_MARKER, LONG)
      for (const scene of [wide, narrow]) {
        expect(scene.taskOf(1).marker, `premise: ${says('LP-6')}`).toBeNull()
        expect(nameStartOf(scene), says('LP-6')).toBeCloseTo(basisOf(scene).left + LABEL_PAD, 6)
      }
    })
  }
})

describe(`T-273 LP-7 -- ${says('LP-7')}`, () => {
  it('stands the marker at the right edge of the basis diamond and the name S-301 right of it', () => {
    const scene = milestone({ actualStart: day(6), actualFinish: day(6), percentComplete: 100 })
    const basis = basisOf(scene)
    const marker = markerOf(scene)
    expect(marker.centre.x - marker.radius, says('LP-7')).toBeCloseTo(basis.right, 6)
    expect(nameStartOf(scene), says('LP-7')).toBeCloseTo(
      marker.centre.x + marker.radius + MILESTONE_NAME_GAP,
      6,
    )
  })
})

describe(`T-273 LP-8 -- ${says('LP-8')}`, () => {
  it('starts the name S-303 of the way across the basis diamond', () => {
    const scene = milestone({ actualStart: day(6), actualFinish: day(6), percentComplete: 100 }, NO_MARKER)
    const basis = basisOf(scene)
    expect(scene.taskOf(1).marker, `premise: ${says('LP-8')}`).toBeNull()
    expect(nameStartOf(scene), says('LP-8')).toBeCloseTo(basis.left + (basis.right - basis.left) * S_303, 6)
  })
})

describe('T-273 the closing rules of the table', () => {
  it(LP_NEVER_THE_NAME_LEFT_OF_THE_MARKER, () => {
    const frames = Array.from({ length: 24 }, (_, index) => 25 - index).map((lastDay) =>
      rectangle({ actualStart: day(2), actualFinish: day(lastDay), percentComplete: 50 }, {}, LONG),
    )
    for (const scene of frames) {
      const marker = markerOf(scene)
      expect(marker.centre.x + marker.radius, LP_NEVER_THE_NAME_LEFT_OF_THE_MARKER).toBeLessThanOrEqual(
        nameStartOf(scene) + EPS,
      )
    }
  })

  it(LP_THE_ASSIGNEE_LABEL, () => {
    const scene = sceneOf({
      tasks: [taskOf({ name: SHORT, start: day(6), finish: day(28), ...WIDE_ACTUAL })],
      shapeKind: 'rectangle',
      assignedTaskUids: [1],
      settings: { assigneeVisible: true, percentCompleteVisible: true },
    })
    const drawn = scene.taskOf(1)
    const label = bandOfRect(mustBe(drawn.assigneeLabel, 'an assignee and percent label'))
    const plan = bandOf(mustBe(drawn.plan, 'a plan'))
    const actual = bandOf(mustBe(drawn.actual, 'an actual'))
    const earliest = Math.min(plan.left, actual.left)
    expect(label.right, LP_THE_ASSIGNEE_LABEL).toBeCloseTo(earliest - ASSIGNEE_GAP, 6)
  })

  it(LP_THE_SEPARATOR, () => {
    const scene = sceneOf({
      tasks: [taskOf({ name: SHORT, start: day(2), finish: day(28), ...WIDE_ACTUAL })],
      shapeKind: 'rectangle',
      assignedTaskUids: [1],
      settings: { assigneeVisible: true, percentCompleteVisible: true },
    })
    expect(scene.placedOf(1).outsideLabel, LP_THE_SEPARATOR).toContain(' : ')
  })

  it(`${LP_THE_RESUME_ICON_IS_OUT_OF_THE_ROW} ${LP_WHEN_IT_DOES_NOT_FIT_AND_THE_ICON_IS_REACHED}`, () => {
    const undecided = rectangle(
      { actualStart: day(2), stop: day(4), resume: null, resumeValid: false, percentComplete: 20 },
      {},
      LONG,
    )
    const drawn = undecided.taskOf(1)
    const basis = basisOf(undecided)
    const resume = mustBe(drawn.resume, 'a stopped task draws a resume icon')
    const box = bandOfRect(mustBe(resume.box, 'the resume icon carries a box'))
    const marker = markerOf(undecided)
    expect(box.left, LP_WHEN_IT_DOES_NOT_FIT_AND_THE_ICON_IS_REACHED).toBeCloseTo(basis.right, 6)
    expect(marker.centre.x - marker.radius, LP_WHEN_IT_DOES_NOT_FIT_AND_THE_ICON_IS_REACHED).toBeCloseTo(
      box.right,
      6,
    )
  })
})

interface Placement {
  readonly basisLeft: number
  readonly basisRight: number
  readonly markerLeft: number
  readonly markerRight: number
  readonly nameLeft: number
}

const obeysLp1 = (one: Placement): boolean =>
  Math.abs(one.markerLeft - one.basisLeft) <= EPS &&
  Math.abs(one.nameLeft - (one.markerRight + LABEL_GAP)) <= EPS &&
  one.markerRight <= one.nameLeft + EPS

describe('T-273 control -- the placement check refuses a label that drifted', () => {
  const sound: Placement = {
    basisLeft: 100,
    basisRight: 900,
    markerLeft: 100,
    markerRight: 100 + MARKER_D,
    nameLeft: 100 + MARKER_D + LABEL_GAP,
  }

  it('accepts a placement built to LP-1', () => {
    expect(obeysLp1(sound)).toBe(true)
  })

  it('refuses a marker that left the start of the basis', () => {
    expect(obeysLp1({ ...sound, markerLeft: sound.markerLeft + 1 })).toBe(false)
  })

  it('refuses a name that does not sit S-32 right of the marker', () => {
    expect(obeysLp1({ ...sound, nameLeft: sound.nameLeft + 1 })).toBe(false)
  })

  it('refuses a name placed left of the marker', () => {
    expect(obeysLp1({ ...sound, nameLeft: sound.markerLeft - 1 })).toBe(false)
  })
})
