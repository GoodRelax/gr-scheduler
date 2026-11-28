// CR-860: T-339 BL-2 and T-023d GR-27 -- the pre-change plan outline takes the current Task's shape and hint area.

import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, taskPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { readRepoFile } from '../spec-files'
import {
  SCREEN,
  THIN_HEAD_LENGTH,
  bandOf,
  day,
  rowOf,
  scheduleOf,
  stored,
  taskOf,
  type Band,
  type Bar,
  type Pt,
} from '../unit/cr-430-cross-section-scene'
import { bare, unbroken } from './spec-table'


// Spec: T-339, BL-2
const BL_2_X = '`GRS` は、輪郭の横を、`start` から `finish` までを、予定バーと同じ日付から位置への換算で置くこと。'
const BL_2_Y = '`GRS` は、輪郭の縦を、一致する `Task` の予定の形が占める縦の範囲とすること。'
const BL_2_SHAPE = '`GRS` は、輪郭の形を、一致する `Task` の予定の形（表 T-012 の形、マイルストーンなら `AT-101` の図形）とすること。'
const BL_2_POINT_OR_SPAN =
  '`GRS` は、`milestone`（`AT-138`）が真なら、輪郭を `start` の位置を中心とし縦の範囲の高さを一辺とする図形とし、偽なら `start` から `finish` までの形とすること。'
const BL_2_MISMATCH =
  'もし `milestone` と一致する `Task` の形とで、マイルストーンかどうかが食い違う場合、`GRS` は、輪郭の形を、`milestone` が真なら `AT-101` の既定の図形、偽なら矩形（`SH-1`）とすること。'
const BL_2_NO_FADE =
  '`GRS` は、輪郭にフェード（`FR-075`）を継がず、矢羽根の切り欠きと矢じりの横幅（`05-07-design.md` の 表 T-221 の `LF-6` / `LF-7`）を輪郭自身の横幅と縦幅から求めること。'
const BL_3_NO_FILL = '`GRS` は、輪郭を塗らず、輪郭の線だけを描くこと。'
// Spec: T-221, LF-6, LF-7, LF-10
const LF_6_PLAN = '予定側は、横幅に `chevronNotchOfWidth` を掛けた値と、縦幅に `chevronNotchOfHeight` を掛けた値の小さいほう。'
const LF_7_HEAD = '矢じりの横幅は、`thinArrowHeadLength` と、横幅に `arrowHeadOfSpan` を掛けた値の小さいほう。'
const LF_10_CENTER = '図形の中心は、その図形の外接枠の中心とする（上下も左右も）'
// Spec: T-058, AT-101, T-239, IMPS-1881
const AT_101_DEFAULT = "既定は `'diamond'`"
const STAR_SPELLING = '☆ ＝ `star`'
// Spec: T-023d, GR-27, T-267, HT-1
const GR_27_AREA =
  '`FR-015` の 表 T-339 の `BL-2` が置いた形の内側と、輪郭の線 —— 形は `HT-1` と同じに読む（線だけの形は、矢じりと点の縦幅を含む線の帯）。'
const HT_1_OUTSIDE = '形と形のあいだ（線だけの形の 2 本の線のあいだ、短い実績の右の空き）は形の外である。'

const blText = (id: string): string => unbroken(rowOf('T-339', id).by['規則'] ?? '')
const rowText = (table: string, id: string): string => unbroken(Object.values(rowOf(table, id).by).join(' '))
const ERD_DETAIL = readRepoFile(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8')

// Spec: T-012
const shapeKindOf = (id: string): string => bare(rowOf('T-012', id).by['値'] ?? '').replace(/[`']/g, '')
const RECTANGLE = shapeKindOf('SH-1')
const CHEVRON = shapeKindOf('SH-2')
const ARROW = shapeKindOf('SH-3')
const MILESTONE = shapeKindOf('SH-5')

// Spec: T-201, S-43, S-44, S-46
const S_43 = stored('S-43')
const S_44 = stored('S-44')
const S_46 = stored('S-46')

const EPS = 1e-6
const SVG_EPS = 0.006


interface Outline {
  readonly taskUid: number
  readonly bar: Bar
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
}

interface DrawnTask {
  readonly taskUid: number
  readonly shapeKind: string
  readonly plan: Bar | null
}

interface BaselineWish {
  readonly start: string
  readonly finish: string
  readonly milestone?: boolean
}

interface TaskWish {
  readonly task: Task
  readonly shapeKind: string
  readonly milestoneGlyph?: string | null
}

interface Stage {
  readonly geometry: unknown
  readonly outline: () => Outline
  readonly drawn: () => DrawnTask
  readonly width: () => number
  readonly planRange: () => { readonly top: number; readonly height: number }
  readonly svg: () => string
}

const stageOf = (wish: TaskWish, baseline: BaselineWish | null, over: Readonly<Record<string, unknown>> = {}): Stage => {
  const base = scheduleOf({ tasks: [wish.task], shapeKind: wish.shapeKind }) as unknown as Record<string, unknown>
  const visuals = (base['taskVisuals'] ?? []) as readonly Record<string, unknown>[]
  const schedule = {
    ...base,
    taskVisuals: visuals.map((one) => ({ ...one, milestoneGlyph: wish.milestoneGlyph ?? null })),
    baselineTasks:
      baseline === null
        ? []
        : [{ uid: 1, name: null, start: baseline.start, finish: baseline.finish, milestone: baseline.milestone ?? false }],
  } as unknown as Schedule
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    isBaselineVisible: true,
    ...over,
  } as unknown as DocumentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const result = geometry as unknown as { tasks: readonly DrawnTask[]; baselineOutlines: readonly Outline[] }
  return {
    geometry,
    outline: () => {
      if (result.baselineOutlines.length !== 1) throw new Error(`BL-1: expected one outline, got ${result.baselineOutlines.length}`)
      return result.baselineOutlines[0] as Outline
    },
    drawn: () => {
      const found = result.tasks.find((one) => one.taskUid === 1)
      if (found === undefined) throw new Error('premise: the Task is not drawn')
      return found
    },
    width: () => {
      const found = taskPlacement(layout, 1) as unknown as { width: number } | null
      if (found === null) throw new Error('premise: the Task is not placed')
      return found.width
    },
    planRange: () => {
      const found = taskPlacement(layout, 1) as unknown as { y: number; planHeight: number } | null
      if (found === null) throw new Error('premise: the Task is not placed')
      return { top: found.y, height: found.planHeight }
    },
    svg: () =>
      svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen', {
        themePreference: 'light',
        guideCursorMode: 'none',
      } as never),
  }
}

// Why: the baseline keeps its raw text, so a reference Task takes the same raw finish (taskOf would close a T00:00:00 finish).
const referenceTask = (texts: BaselineWish): Task =>
  ({ ...taskOf({ uid: 1, start: texts.start }), finish: texts.finish }) as Task

const planBandOf = (stage: Stage): Band => {
  const plan = stage.drawn().plan
  if (plan === null) throw new Error('premise: the Task has no drawn plan')
  return bandOf(plan)
}

const pointsOf = (bar: Bar): readonly Pt[] => {
  expect(bar.form, 'premise: the bar is an outline').toBe('outline')
  return bar.points ?? []
}

interface Ends {
  readonly start: number
  readonly end: number
}

// Why: measured at the middle crossing, so the depth reads the same however the points are written.
const endsOf = (points: readonly Pt[]): Ends => {
  const ys = points.map((one) => one.y)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  const mid = (top + bottom) / 2
  const onEdge = points.filter((one) => Math.abs(one.y - top) < EPS || Math.abs(one.y - bottom) < EPS)
  const left = Math.min(...onEdge.map((one) => one.x))
  const right = Math.max(...onEdge.map((one) => one.x))
  const crossings: number[] = []
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length] as Pt
    if (Math.abs(a.y - mid) < EPS) crossings.push(a.x)
    if ((a.y - mid) * (b.y - mid) < 0) crossings.push(a.x + ((mid - a.y) * (b.x - a.x)) / (b.y - a.y))
  })
  return { start: Math.min(...crossings) - left, end: Math.max(...crossings) - right }
}

const sameSet = (actual: readonly Pt[], expected: readonly Pt[], eps: number): boolean =>
  actual.length === expected.length &&
  expected.every((want) => actual.some((one) => Math.abs(one.x - want.x) <= eps && Math.abs(one.y - want.y) <= eps)) &&
  actual.every((one) => expected.some((want) => Math.abs(one.x - want.x) <= eps && Math.abs(one.y - want.y) <= eps))

const diamondTipsOf = (centerX: number, centerY: number, side: number): readonly Pt[] => [
  { x: centerX, y: centerY - side / 2 },
  { x: centerX + side / 2, y: centerY },
  { x: centerX, y: centerY + side / 2 },
  { x: centerX - side / 2, y: centerY },
]

const cornersOf = (left: number, right: number, top: number, bottom: number): readonly Pt[] => [
  { x: left, y: top },
  { x: right, y: top },
  { x: right, y: bottom },
  { x: left, y: bottom },
]


interface SvgElement {
  readonly tag: string
  readonly attrs: string
}

const attrOf = (attrs: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1] ?? null

const outlineElementsOf = (svg: string, uid: number): readonly SvgElement[] =>
  [...svg.matchAll(/<([a-zA-Z]+)((?:[^<>"]|"[^"]*")*?)\/?>/g)]
    .map((match) => ({ tag: match[1] as string, attrs: match[2] as string }))
    .filter((one) => attrOf(one.attrs, 'data-figure') === `task-${uid}-baseline`)

const verticesOf = (element: SvgElement): readonly Pt[] => {
  if (element.tag === 'line') {
    return [
      { x: Number(attrOf(element.attrs, 'x1')), y: Number(attrOf(element.attrs, 'y1')) },
      { x: Number(attrOf(element.attrs, 'x2')), y: Number(attrOf(element.attrs, 'y2')) },
    ]
  }
  const numbers = ((attrOf(element.attrs, element.tag === 'path' ? 'd' : 'points') ?? '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const out: Pt[] = []
  for (let index = 0; index + 1 < numbers.length; index += 2) out.push({ x: numbers[index] as number, y: numbers[index + 1] as number })
  return out
}

const expectUnfilledAndStroked = (svg: string, why: string): readonly SvgElement[] => {
  const elements = outlineElementsOf(svg, 1)
  expect(elements.length, `premise: the picture draws the outline of task 1`).toBeGreaterThan(0)
  for (const one of elements) {
    expect(['none', 'transparent'], `${why} (${one.tag})`).toContain(attrOf(one.attrs, 'fill'))
    expect(attrOf(one.attrs, 'stroke'), `${why} (${one.tag})`).not.toBeNull()
    expect(attrOf(one.attrs, 'stroke'), `${why} (${one.tag})`).not.toBe('none')
  }
  return elements
}


// Why: the current Task stands well right of the baseline, so the outline and the bar never overlap.
const LONG = { start: day(20), finish: day(26) }
const BASELINE_SPAN: BaselineWish = { start: day(4), finish: day(10) }
const BASELINE_POINT: BaselineWish = { start: day(6), finish: day(6), milestone: true }
// Why: at zoomX 0.5 a 4-day span is narrow enough that LF-6 / LF-7 take the width side (premises check it).
const NARROW_ZOOM = { zoomX: 0.5 }
const NARROW_SPAN: BaselineWish = { start: day(4), finish: day(8) }
const LONG_AT_NARROW = { start: day(20), finish: '2026-04-20T00:00:00' }

const barTask = (shapeKind: string, over: Readonly<Record<string, unknown>> = {}, dates = LONG): TaskWish => ({
  task: taskOf({ uid: 1, start: dates.start, finish: dates.finish, ...over }),
  shapeKind,
})
const milestoneTask = (glyph: string | null): TaskWish => ({
  task: taskOf({ uid: 1, start: day(22), finish: day(22), milestone: true }),
  shapeKind: MILESTONE,
  milestoneGlyph: glyph,
})

// Spec: BL-2
const referenceBandOf = (shapeKind: string, texts: BaselineWish, over: Readonly<Record<string, unknown>> = {}): { band: Band; width: number; bar: Bar } => {
  const stage = stageOf({ task: referenceTask(texts), shapeKind }, null, over)
  const bar = stage.drawn().plan
  if (bar === null) throw new Error('premise: the reference Task has no drawn plan')
  return { band: bandOf(bar), width: stage.width(), bar }
}
const xOfStart = (texts: BaselineWish): number =>
  referenceBandOf(RECTANGLE, { start: texts.start, finish: day(Number(texts.start.slice(8, 10)) + 4) }).band.left


describe('CR-860 -- the clauses these cases quote still stand', () => {
  it('T-339 BL-2 sentences 1, 2, 4 .. 7, BL-3, T-221 LF-6 / LF-7 / LF-10, T-058 AT-101, T-023d GR-27, T-267 HT-1', () => {
    for (const clause of [BL_2_X, BL_2_Y, BL_2_SHAPE, BL_2_POINT_OR_SPAN, BL_2_MISMATCH, BL_2_NO_FADE]) {
      expect(blText('BL-2'), 'BL-2 no longer says this').toContain(clause)
    }
    expect(blText('BL-3')).toContain(BL_3_NO_FILL)
    expect(rowText('T-221', 'LF-6')).toContain(LF_6_PLAN)
    expect(rowText('T-221', 'LF-7')).toContain(LF_7_HEAD)
    expect(rowText('T-221', 'LF-10')).toContain(LF_10_CENTER)
    const at101 = ERD_DETAIL.split(/\r?\n/).find((line) => line.startsWith('| AT-101 |')) ?? ''
    expect(at101, 'AT-101 is milestoneGlyph').toContain('`milestoneGlyph`')
    expect(at101).toContain(AT_101_DEFAULT)
    expect(rowText('T-023d', 'GR-27')).toContain(GR_27_AREA)
    expect(rowText('T-267', 'HT-1')).toContain(HT_1_OUTSIDE)
  })

  it('the read values are what the cases need: the T-012 spellings, S-43 / S-44 / S-46, the star spelling', () => {
    expect([RECTANGLE, CHEVRON, ARROW, MILESTONE]).toEqual(['rectangle', 'chevron', 'arrow', 'milestone'])
    for (const value of [S_43, S_44, S_46]) expect(Number.isFinite(value) && value > 0).toBe(true)
    expect(rowText('T-239', 'IMPS-1881')).toContain(STAR_SPELLING)
  })
})

describe(`BL-2 「${BL_2_SHAPE}」 -- a chevron Task's outline is a chevron`, () => {
  it(`BL-2 「${BL_2_X}」「${BL_2_Y}」: the outline spans the baseline's dates as a chevron plan bar places them, in the Task's plan band`, () => {
    const stage = stageOf(barTask(CHEVRON), BASELINE_SPAN)
    const outline = stage.outline()
    const reference = referenceBandOf(CHEVRON, BASELINE_SPAN).band
    const band = bandOf(outline.bar)
    const own = planBandOf(stage)
    expect(band.left, BL_2_X).toBeCloseTo(reference.left, 6)
    expect(band.right, BL_2_X).toBeCloseTo(reference.right, 6)
    expect(band.top, BL_2_Y).toBeCloseTo(own.top, 6)
    expect(band.height, BL_2_Y).toBeCloseTo(own.height, 6)
  })

  it(`BL-2 「${BL_2_SHAPE}」, LF-6 「${LF_6_PLAN}」: both ends are cut as a chevron, as deep as the outline's own width and height say`, () => {
    const stage = stageOf(barTask(CHEVRON), BASELINE_SPAN)
    const outline = stage.outline()
    const width = referenceBandOf(CHEVRON, BASELINE_SPAN).width
    const depth = Math.min(width * S_44, outline.box.height * S_43)
    expect(depth, 'premise: a chevron end has a depth').toBeGreaterThan(1)
    const ends = endsOf(pointsOf(outline.bar))
    expect(ends.start, `${BL_2_SHAPE} / ${BL_2_NO_FADE} (start notch)`).toBeCloseTo(depth, 2)
    expect(ends.end, `${BL_2_SHAPE} / ${BL_2_NO_FADE} (end tip)`).toBeCloseTo(depth, 2)
  })

  it(`BL-2 「${BL_2_NO_FADE}」: a narrow outline takes its depth from its own width, not from the long Task's`, () => {
    const stage = stageOf(barTask(CHEVRON, {}, LONG_AT_NARROW), NARROW_SPAN, NARROW_ZOOM)
    const outline = stage.outline()
    const width = referenceBandOf(CHEVRON, NARROW_SPAN, NARROW_ZOOM).width
    const height = outline.box.height
    expect(width * S_44, 'premise: the outline is narrow enough that LF-6 takes its width').toBeLessThan(height * S_43 - 0.1)
    expect(stage.width() * S_44, 'premise: the Task is wide enough that LF-6 takes its height').toBeGreaterThan(height * S_43 + 0.1)
    const ends = endsOf(pointsOf(outline.bar))
    expect(ends.start, BL_2_NO_FADE).toBeCloseTo(width * S_44, 2)
    expect(ends.end, BL_2_NO_FADE).toBeCloseTo(width * S_44, 2)
  })

  it(`BL-2 「${BL_2_NO_FADE}」: a Task with fades -- the outline keeps the depth of no fade, and is the same as without the fades`, () => {
    const faded = stageOf(barTask(CHEVRON, { fadeInDays: 3, fadeOutDays: 2 }), BASELINE_SPAN)
    const plain = stageOf(barTask(CHEVRON), BASELINE_SPAN)
    const plainTaskEnds = endsOf(pointsOf(plain.drawn().plan as Bar))
    const fadedTaskEnds = endsOf(pointsOf(faded.drawn().plan as Bar))
    expect(fadedTaskEnds.start, 'premise: the fade-in moves the Task\'s own notch (FR-075)').not.toBeCloseTo(plainTaskEnds.start, 1)
    expect(fadedTaskEnds.end, 'premise: the fade-out moves the Task\'s own tip (FR-075)').not.toBeCloseTo(plainTaskEnds.end, 1)
    const outline = faded.outline()
    const width = referenceBandOf(CHEVRON, BASELINE_SPAN).width
    const depth = Math.min(width * S_44, outline.box.height * S_43)
    const ends = endsOf(pointsOf(outline.bar))
    expect(ends.start, `${BL_2_NO_FADE} (start notch)`).toBeCloseTo(depth, 2)
    expect(ends.end, `${BL_2_NO_FADE} (end tip)`).toBeCloseTo(depth, 2)
    expect(outline.bar, BL_2_NO_FADE).toEqual(plain.outline().bar)
  })

  it(`BL-3 「${BL_3_NO_FILL}」: the picture draws the chevron outline unfilled, with the outline's own points`, () => {
    const stage = stageOf(barTask(CHEVRON), BASELINE_SPAN)
    const elements = expectUnfilledAndStroked(stage.svg(), BL_3_NO_FILL)
    const drawn = elements.flatMap(verticesOf)
    for (const at of pointsOf(stage.outline().bar)) {
      expect(drawn.some((one) => Math.abs(one.x - at.x) <= SVG_EPS && Math.abs(one.y - at.y) <= SVG_EPS), `${BL_2_SHAPE} (${at.x},${at.y})`).toBe(true)
    }
  })
})

describe(`BL-2 「${BL_2_SHAPE}」 -- an arrow Task's outline is a line and an unfilled head`, () => {
  it(`BL-2 「${BL_2_SHAPE}」「${BL_2_X}」: a line with a head, from x(start) to x(finish) as an arrow plan bar places them`, () => {
    const stage = stageOf(barTask(ARROW), BASELINE_SPAN)
    const bar = stage.outline().bar
    expect(bar.form, BL_2_SHAPE).toBe('line')
    expect(bar.head ?? null, `${BL_2_SHAPE}: an arrow has a head`).not.toBeNull()
    const reference = referenceBandOf(ARROW, BASELINE_SPAN).bar
    expect(bar.from?.x, BL_2_X).toBeCloseTo(reference.from?.x as number, 6)
    expect(bar.to?.x, BL_2_X).toBeCloseTo(reference.to?.x as number, 6)
    const tipOf = (one: Bar): number => Math.max(...(one.head ?? []).map((at) => at.x))
    expect(tipOf(bar), BL_2_X).toBeCloseTo(tipOf(reference), 6)
    const own = stage.drawn().plan as Bar
    expect(bar.from?.y, BL_2_Y).toBeCloseTo(own.from?.y as number, 6)
  })

  it(`BL-2 「${BL_2_NO_FADE}」, LF-7 「${LF_7_HEAD}」: the head is as long as LF-7 says from the outline's own width`, () => {
    for (const [name, task, baseline, over] of [
      ['a wide outline', barTask(ARROW), BASELINE_SPAN, {}],
      ['a narrow outline beside a long Task', barTask(ARROW, {}, LONG_AT_NARROW), NARROW_SPAN, NARROW_ZOOM],
    ] as const) {
      const stage = stageOf(task, baseline, over)
      const width = referenceBandOf(ARROW, baseline, over).width
      const head = stage.outline().bar.head ?? []
      const length = Math.max(...head.map((at) => at.x)) - Math.min(...head.map((at) => at.x))
      expect(length, `${LF_7_HEAD} (${name})`).toBeCloseTo(Math.min(THIN_HEAD_LENGTH, width * S_46), 2)
      if (name === 'a narrow outline beside a long Task') {
        expect(width * S_46, 'premise: LF-7 takes the outline\'s width').toBeLessThan(THIN_HEAD_LENGTH - 0.1)
        const own = stage.drawn().plan?.head ?? []
        const ownLength = Math.max(...own.map((at) => at.x)) - Math.min(...own.map((at) => at.x))
        expect(ownLength, 'premise: the long Task\'s own head is longer').toBeGreaterThan(length + 0.1)
      }
    }
  })

  it(`BL-3 「${BL_3_NO_FILL}」: the picture draws the line and the head, every part unfilled; the head with its points`, () => {
    const stage = stageOf(barTask(ARROW), BASELINE_SPAN)
    const elements = expectUnfilledAndStroked(stage.svg(), BL_3_NO_FILL)
    const head = stage.outline().bar.head ?? []
    expect(
      elements.some((one) => one.tag !== 'line' && sameSet(verticesOf(one), head, SVG_EPS)),
      `${BL_3_NO_FILL}: the head is drawn as an unfilled outline`,
    ).toBe(true)
  })
})

describe(`BL-2 「${BL_2_POINT_OR_SPAN}」 -- a star milestone's outline is a star`, () => {
  it(`BL-2 「${BL_2_SHAPE}」「${BL_2_POINT_OR_SPAN}」, LF-10 「${LF_10_CENTER}」: the star of the Task, centred on x(start), its side the band height`, () => {
    const stage = stageOf(milestoneTask('star'), BASELINE_POINT)
    const outline = stage.outline()
    const own = stage.drawn().plan
    if (own === null) throw new Error('premise: the milestone has a drawn figure')
    const ownBand = bandOf(own)
    const xStart = xOfStart(BASELINE_POINT)
    const band = bandOf(outline.bar)
    expect(outline.box.x + outline.box.width / 2, `${BL_2_POINT_OR_SPAN} / ${LF_10_CENTER}`).toBeCloseTo(xStart, 6)
    expect((band.left + band.right) / 2, `${BL_2_POINT_OR_SPAN} / ${LF_10_CENTER}`).toBeCloseTo(xStart, 6)
    const range = stage.planRange()
    expect(outline.box.height, `${BL_2_POINT_OR_SPAN} / ${BL_2_Y}`).toBeCloseTo(range.height, 6)
    expect(outline.box.width, BL_2_POINT_OR_SPAN).toBeCloseTo(range.height, 6)
    expect(outline.box.y + outline.box.height / 2, `${BL_2_Y} / ${LF_10_CENTER}`).toBeCloseTo(range.top + range.height / 2, 6)
    const shift = xStart - (ownBand.left + ownBand.right) / 2
    const moved = pointsOf(own).map((at) => ({ x: at.x + shift, y: at.y }))
    expect(sameSet(pointsOf(outline.bar), moved, 1e-6), `${BL_2_SHAPE}: the star of AT-101, moved to x(start)`).toBe(true)
  })

  it(`BL-2 「${BL_2_SHAPE}」 control: the same baseline over a diamond milestone is a diamond, so the star is the Task's glyph`, () => {
    const star = pointsOf(stageOf(milestoneTask('star'), BASELINE_POINT).outline().bar)
    const diamond = stageOf(milestoneTask('diamond'), BASELINE_POINT).outline()
    const { x, y, width, height } = diamond.box
    expect(sameSet(pointsOf(diamond.bar), diamondTipsOf(x + width / 2, y + height / 2, height), 1e-6), BL_2_SHAPE).toBe(true)
    expect(star.length, 'premise: a star is not a diamond').not.toBe(4)
  })

  it(`BL-3 「${BL_3_NO_FILL}」: the picture draws the star unfilled`, () => {
    expectUnfilledAndStroked(stageOf(milestoneTask('star'), BASELINE_POINT).svg(), BL_3_NO_FILL)
  })
})

describe(`BL-2 「${BL_2_MISMATCH}」 -- the point-or-span kind is the baseline's`, () => {
  it(`BL-2 「${BL_2_MISMATCH}」: a milestone baseline over a chevron Task is the AT-101 default, a diamond, centred on x(start)`, () => {
    const stage = stageOf(barTask(CHEVRON), BASELINE_POINT)
    const outline = stage.outline()
    const own = planBandOf(stage)
    const xStart = xOfStart(BASELINE_POINT)
    expect(outline.box.height, `${BL_2_Y} / ${BL_2_POINT_OR_SPAN}`).toBeCloseTo(own.height, 6)
    expect(
      sameSet(pointsOf(outline.bar), diamondTipsOf(xStart, own.center, own.height), 1e-6),
      `${BL_2_MISMATCH} (${AT_101_DEFAULT})`,
    ).toBe(true)
  })

  it(`BL-2 「${BL_2_MISMATCH}」: a span baseline over a star milestone Task is a rectangle (SH-1) from x(start) to x(finish)`, () => {
    const stage = stageOf(milestoneTask('star'), BASELINE_SPAN)
    const outline = stage.outline()
    // Spec: LF-10
    const { top, height } = stage.planRange()
    const reference = referenceBandOf(RECTANGLE, BASELINE_SPAN).band
    expect(
      sameSet(pointsOf(outline.bar), cornersOf(reference.left, reference.right, top, top + height), 1e-6),
      `${BL_2_MISMATCH} / ${BL_2_X} / ${BL_2_Y}`,
    ).toBe(true)
  })
})

describe(`GR-27 「${GR_27_AREA}」 -- the hint area is the drawn outline`, () => {
  const sizes = grabSizesOf()
  const hintAt = (stage: Stage, at: Pt): unknown => itemAtPointer(stage.geometry as never, at.x, at.y, sizes, 'hint')

  // Spec: IMPS-1494
  it(`GR-27: a point inside the chevron outline names the baseline (control)`, () => {
    const stage = stageOf(barTask(CHEVRON), BASELINE_SPAN)
    const { x, y, width, height } = stage.outline().box
    expect(hintAt(stage, { x: x + width / 2, y: y + height / 2 }), GR_27_AREA).toEqual({ kind: 'baseline', taskUid: 1 })
  })

  it(`GR-27 「${GR_27_AREA}」, HT-1: a point in the chevron's start notch, inside the box but outside the shape, is no baseline hint`, () => {
    const stage = stageOf(barTask(CHEVRON), BASELINE_SPAN)
    const outline = stage.outline()
    const { x, y, width, height } = outline.box
    const depth = Math.min(referenceBandOf(CHEVRON, BASELINE_SPAN).width * S_44, height * S_43)
    const inNotch = { x: x + depth / 2, y: y + height / 2 }
    expect(inNotch.x > x && inNotch.x < x + width, 'premise: the point is inside the box').toBe(true)
    expect(hintAt(stage, inNotch), `${GR_27_AREA} (start notch)`).not.toEqual({ kind: 'baseline', taskUid: 1 })
    const besideTip = { x: x + width - depth / 2, y: y + height / 8 }
    expect(hintAt(stage, besideTip), `${GR_27_AREA} (beside the end tip)`).not.toEqual({ kind: 'baseline', taskUid: 1 })
  })
})
