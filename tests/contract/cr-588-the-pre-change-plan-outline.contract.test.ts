// CR-588: FR-015 table T-339 -- the outline of the pre-change plan (the baseline overlay).

import { readFileSync } from 'node:fs'
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
import { DISPLAY_SCALE_STEPS, DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'
import {
  SCREEN,
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
import { bare, specTable, unbroken } from './spec-table'


const RULE = '規則'

const BL_1_ONLY = '次の 3 つがそろうものだけを描くこと（MUST）'
const BL_1_TASK_GROUP = '① `UID` が一致する `Task` が、そのフレームで描かれている行（`TaskGroup`）に載っている'
const BL_1_FOLDED =
  '人が畳んだ行・隠した行（表 T-015 の `HR-1a` / `HR-6`）と、グループ LOD（表 T-005a の `L-3`）が描かない行の `Task` には描かない'
const BL_1_DATES = '② `start`（`AT-136`）と `finish`（`AT-137`）の両方を持つ。'
const BL_1_S69 = '③ `_assets/tbl-settings.md` の 表 T-202 の `S-69` が真である（`FR-049`）。'
const BL_1_NOT_S227 = '⚠️ 予定の表示（同表の `S-227`）では止めない'
const BL_2_X = '横は、`start` から `finish` までを、予定バーと同じ日付から位置への換算で置くこと（MUST）。'
const BL_2_Y = '縦は、一致する `Task` の予定の形が占める縦の範囲とすること（MUST）'
const BL_2_NOT_S227 =
  '予定を表示しない（`_assets/tbl-settings.md` の 表 T-202 の `S-227` が偽）ときも、縦は、描いたなら予定の形が占める縦の範囲とすること（MUST）'
const BL_2_SHAPE =
  '形は、`milestone`（`AT-138`）が偽なら矩形、真なら `start` の位置を中心とし、縦と横の対角線をどちらもその縦の範囲の高さとする菱形とすること（MUST）'
const BL_2_PLACE = '置く区画（ピン止めの帯か、その下の残り、`FR-098`）は、一致する `Task` の予定の形と同じとする'
const BL_3_NO_FILL = '塗らず、輪郭の線だけを描くこと（MUST）。'
const BL_3_VALUES =
  '色は `_assets/tbl-settings.md` の 表 T-236 の `S-443`、太さは同書の 表 T-201 の `S-39`（枠線の太さを指定していない予定の輪郭と同じ太さ —— 今の予定の `AT-104` は継がない）、破線の刻みは同書の 表 T-206 の `S-444` とする。'
const BL_3_NOT_SAME_DASH =
  '⛔ 刻みを 表 T-208 の `S-104`（予実の補助線）や 表 T-206 の `S-175`（選択の枠）と同じ組にしてはならない（MUST NOT）'
const BL_4 = '表 T-038 の占有に数えないこと（MUST）'
const BL_4_WHY = '数えると `S-69` を切り替えるたびに現在の日程の形の置き場が動く'
const FR_015_ONE_SIDE = '片側にしか存在しない `Task` は描いてはならない（MUST NOT）。'
// WHY: CR-684 moved FR-108's list into table T-355; the outline is row NG-10, decided by FR-015.
const FR_108_THE_OVERLAY = '変更前の予定の輪郭'
const NG_10_ALWAYS = 'いつも —— 輪郭は表示だけであり、編集対象ではない'
const NG_10_OWNER = '`FR-015`'
const FR_108_NO_GRAB = 'を、掴めないようにし、ほかの操作で動かさないこと（MUST）'
const VG_5_SCALED = '枠線（その形の枠線の太さの列 `AT-104` の値、`null` のときは `S-39` に、描く比を掛けた太さ）'
const S_444_NOT_SCALED = '表示の倍率を掛けない —— `S-104` と `S-175` と同じく、表 T-252 に行を持たない'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const blText = (id: string): string => unbroken(rowOf('T-339', id).by[RULE] ?? '')
const anyRowText = (table: string, id: string): string => unbroken(Object.values(rowOf(table, id).by).join(' '))


const KEY = 'キー'
const keyOf = (id: string): string => {
  for (const table of ['T-202', 'T-203']) {
    const found = specTable(table).rows.find((one) => one.id === id)
    if (found !== undefined) return bare(found.by[KEY] ?? '').replace(/`/g, '')
  }
  throw new Error(`no settings table holds ${id}`)
}

const BASELINE_VISIBLE = keyOf('S-69')
const PLAN_VISIBLE = keyOf('S-227')
const PINNED_GROUP_IDS = keyOf('S-126')
const DISPLAY_SCALE = keyOf('S-234')

const S_39 = stored('S-39')

const numbersIn = (text: string): readonly number[] =>
  (text.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

// see T-206
const dashPairOf = (table: string, id: string, column: string): readonly number[] => {
  const pair = numbersIn(rowOf(table, id).by[column] ?? '').slice(0, 2)
  if (pair.length !== 2) throw new Error(`table ${table} ${id} states no dash pair`)
  return pair
}
const S_444 = dashPairOf('T-206', 'S-444', '既定')
const S_175 = dashPairOf('T-206', 'S-175', '既定')
const S_104 = dashPairOf('T-208', 'S-104', '値')

const THEME_HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))
const normalColour = (text: string): string => text.replace(/\s+/g, '').toLowerCase()
// see T-236
const t236 = (id: string, preference: 'light' | 'dark'): string => {
  const cell = bare(rowOf('T-236', id).by[preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (/^S-\d+$/.test(cell)) return t236(cell, preference)
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) throw new Error(`table T-236 ${id} states no colour: ${cell}`)
  return normalColour(cell.replace('H', String(THEME_HUE)))
}

// WHY: the SVG writes coordinates to two decimals, so a drawn value is compared to 0.006.
const SVG_EPS = 0.006
const near = (a: number, b: number): boolean => Math.abs(a - b) <= SVG_EPS


interface Outline {
  readonly taskUid: number
  readonly kind: string
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  readonly isPinned: boolean
}

interface DrawnTask {
  readonly taskUid: number
  readonly plan: Bar | null
}

interface BaselineWish {
  readonly uid: number
  readonly start: string | null
  readonly finish: string | null
  readonly milestone?: boolean | null
}

type Rows = 'one' | 'hiddenSecond' | 'collapsedParent' | 'secondPinned'

interface StageWish {
  readonly tasks: readonly Task[]
  readonly baselines: readonly BaselineWish[]
  readonly rows?: Rows
  readonly settings?: Readonly<Record<string, unknown>>
  // WHY: AT-104 on every drawn Task's visual; absent leaves it null.
  readonly strokeWidthPx?: number
}

interface Stage {
  readonly geometry: unknown
  readonly layout: unknown
  readonly outlines: () => readonly Outline[]
  readonly drawn: (uid: number) => DrawnTask | undefined
  readonly placed: (uid: number) => unknown
  readonly svg: (preference?: 'light' | 'dark') => string
}

const baselineOf = (wish: BaselineWish): unknown => ({
  uid: wish.uid,
  name: null,
  start: wish.start,
  finish: wish.finish,
  milestone: wish.milestone ?? false,
})

const rowsOf = (base: Record<string, unknown>, rows: Rows): Record<string, unknown> => {
  if (rows === 'one') return base
  const g1 = (base['taskGroups'] as Record<string, unknown>[])[0] as Record<string, unknown>
  const g2 = { ...g1, id: 'g2', label: 'g2', order: 1 }
  const groups =
    rows === 'hiddenSecond'
      ? [g1, { ...g2, treeState: 'hidden' }]
      : rows === 'collapsedParent'
        ? [{ ...g1, treeState: 'collapsed' }, { ...g2, parentId: 'g1', order: 0 }]
        : [g1, g2]
  const members = (base['taskGroupMembers'] as { taskUid: number }[]).map((one) => ({
    taskUid: one.taskUid,
    groupId: one.taskUid === 1 ? 'g1' : 'g2',
  }))
  return { ...base, taskGroups: groups, taskGroupMembers: members }
}

const stageOf = (wish: StageWish): Stage => {
  const rows = wish.rows ?? 'one'
  const base = scheduleOf({ tasks: wish.tasks, shapeKind: 'rectangle' }) as unknown as Record<string, unknown>
  const visuals = (base['taskVisuals'] ?? []) as readonly Record<string, unknown>[]
  const schedule = {
    ...rowsOf(base, rows),
    ...(wish.strokeWidthPx === undefined
      ? {}
      : { taskVisuals: visuals.map((one) => ({ ...one, strokeWidthPx: wish.strokeWidthPx })) }),
    baselineTasks: wish.baselines.map(baselineOf),
  } as unknown as Schedule
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    [BASELINE_VISIBLE]: true,
    ...(rows === 'secondPinned' ? { [PINNED_GROUP_IDS]: ['g2'] } : {}),
    ...(wish.settings ?? {}),
  } as unknown as DocumentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const tasks = (geometry as unknown as { tasks: readonly DrawnTask[] }).tasks
  return {
    geometry,
    layout,
    outlines: () => {
      const found = (geometry as unknown as { baselineOutlines?: readonly Outline[] }).baselineOutlines
      if (found === undefined) throw new Error('S-1: ScheduleGeometry has no baselineOutlines')
      return found
    },
    drawn: (uid) => tasks.find((one) => one.taskUid === uid),
    placed: (uid) => taskPlacement(layout, uid),
    svg: (preference = 'light') =>
      svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen', {
        themePreference: preference,
        guideCursorMode: 'none',
      } as never),
  }
}

const planBandOf = (stage: Stage, uid: number): Band => {
  const plan = stage.drawn(uid)?.plan ?? null
  if (plan === null) throw new Error(`premise: task ${uid} has no drawn plan`)
  return bandOf(plan)
}

const onlyOutline = (stage: Stage): Outline => {
  const all = stage.outlines()
  if (all.length !== 1) throw new Error(`BL-1: expected one outline, got ${all.length}`)
  return all[0] as Outline
}


interface SvgElement {
  readonly tag: string
  readonly attrs: string
  readonly zo: readonly string[]
  readonly clips: readonly string[]
  readonly groupAttrs: readonly string[]
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  if (found !== null) return found[1] as string
  const style = /(?:^|\s)style="([^"]*)"/.exec(attrs)?.[1] ?? ''
  const prop = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style)
  return prop === null ? null : (prop[1] as string).trim()
}

const elementsOf = (svg: string): readonly SvgElement[] => {
  const out: SvgElement[] = []
  const groups: { zo: string | null; clip: string | null; attrs: string }[] = []
  const clipOf = (text: string): string | null => /url\(#([^)]+)\)/.exec(attrOf(text, 'clip-path') ?? '')?.[1] ?? null
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:[^<>"]|"[^"]*")*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push({ zo: attrOf(attrs as string, 'data-zo'), clip: clipOf(attrs as string), attrs: attrs as string })
      continue
    }
    if (closing === '/') continue
    const own = clipOf(attrs as string)
    out.push({
      tag: tag as string,
      attrs: attrs as string,
      zo: groups.map((one) => one.zo).filter((one): one is string => one !== null),
      clips: [...groups.map((one) => one.clip), own].filter((one): one is string => one !== null),
      groupAttrs: groups.map((one) => one.attrs),
    })
  }
  return out
}

const SHAPE_TAGS = new Set(['rect', 'polygon', 'polyline', 'path', 'line', 'ellipse', 'circle'])

// see T-020
const outlineShapesOf = (svg: string): readonly SvgElement[] =>
  elementsOf(svg).filter((one) => one.zo.includes('ZO-15') && SHAPE_TAGS.has(one.tag))

// WHY: a style may sit on the ZO-15 group rather than on each shape, so the nearest group answers.
const painted = (element: SvgElement, name: string): string | null => {
  const own = attrOf(element.attrs, name)
  if (own !== null) return own
  for (let index = element.groupAttrs.length - 1; index >= 0; index -= 1) {
    const inherited = attrOf(element.groupAttrs[index] as string, name)
    if (inherited !== null) return inherited
  }
  return null
}

const verticesOf = (element: SvgElement): readonly Pt[] => {
  if (element.tag === 'rect') {
    const x = Number(attrOf(element.attrs, 'x') ?? 0)
    const y = Number(attrOf(element.attrs, 'y') ?? 0)
    const w = Number(attrOf(element.attrs, 'width'))
    const h = Number(attrOf(element.attrs, 'height'))
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
  }
  if (element.tag === 'line') {
    return [
      { x: Number(attrOf(element.attrs, 'x1')), y: Number(attrOf(element.attrs, 'y1')) },
      { x: Number(attrOf(element.attrs, 'x2')), y: Number(attrOf(element.attrs, 'y2')) },
    ]
  }
  const numbers = numbersIn(attrOf(element.attrs, element.tag === 'path' ? 'd' : 'points') ?? '')
  const out: Pt[] = []
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    out.push({ x: numbers[index] as number, y: numbers[index + 1] as number })
  }
  return out
}

const hasVertex = (vertices: readonly Pt[], at: Pt): boolean => vertices.some((one) => near(one.x, at.x) && near(one.y, at.y))

const planElementOf = (svg: string, uid: number): SvgElement => {
  const found = elementsOf(svg).find((one) => one.zo.includes('ZO-1') && one.attrs.includes(`data-figure="task-${uid}-plan"`))
  if (found === undefined) throw new Error(`premise: the picture draws no ZO-1 plan for task ${uid}`)
  return found
}


const PLAIN = taskOf({ uid: 1, start: day(4), finish: day(10) })
const SHIFTED: BaselineWish = { uid: 1, start: day(6), finish: day(14) }

describe('CR-588 -- the clauses these cases quote still stand', () => {
  it('FR-015 T-339 BL-1 .. BL-4, FR-108 T-355 NG-10, T-259 VG-5, T-206 S-444', () => {
    expect(blText('BL-1')).toContain(BL_1_ONLY)
    expect(blText('BL-1')).toContain(BL_1_TASK_GROUP)
    expect(blText('BL-1')).toContain(BL_1_FOLDED)
    expect(blText('BL-1')).toContain(BL_1_DATES)
    expect(blText('BL-1')).toContain(BL_1_S69)
    expect(blText('BL-1')).toContain(BL_1_NOT_S227)
    expect(blText('BL-2')).toContain(BL_2_X)
    expect(blText('BL-2')).toContain(BL_2_Y)
    expect(blText('BL-2')).toContain(BL_2_NOT_S227)
    expect(blText('BL-2')).toContain(BL_2_SHAPE)
    expect(blText('BL-2')).toContain(BL_2_PLACE)
    expect(blText('BL-3')).toContain(BL_3_NO_FILL)
    expect(blText('BL-3')).toContain(BL_3_VALUES)
    expect(blText('BL-3')).toContain(BL_3_NOT_SAME_DASH)
    expect(blText('BL-4')).toContain(BL_4)
    expect(blText('BL-4')).toContain(BL_4_WHY)
    expect(REQUIREMENTS).toContain(FR_015_ONE_SIDE)
    expect(anyRowText('T-355', 'NG-10')).toContain(FR_108_THE_OVERLAY)
    expect(anyRowText('T-355', 'NG-10')).toContain(NG_10_ALWAYS)
    expect(anyRowText('T-355', 'NG-10')).toContain(NG_10_OWNER)
    expect(REQUIREMENTS).toContain(FR_108_NO_GRAB)
    expect(anyRowText('T-259', 'VG-5')).toContain(VG_5_SCALED)
    expect(anyRowText('T-206', 'S-444')).toContain(S_444_NOT_SCALED)
  })

  it('the read values are what the cases need: S-39 a width, three dash pairs, two display scales', () => {
    expect(Number.isFinite(S_39)).toBe(true)
    expect(S_444).toHaveLength(2)
    expect(DISPLAY_SCALE_STEPS.length).toBeGreaterThan(1)
    expect(BASELINE_VISIBLE.length).toBeGreaterThan(0)
    expect(PLAN_VISIBLE.length).toBeGreaterThan(0)
  })
})

describe('BL-1 -- which BaselineTask is drawn', () => {
  it(`BL-1 「${BL_1_ONLY}」: all three met -- one outline, for that Task, and the ZO-15 layer draws it (control for every case below)`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [SHIFTED] })
    expect(stage.outlines().map((one) => one.taskUid), BL_1_ONLY).toEqual([1])
    expect(outlineShapesOf(stage.svg()).length, BL_1_ONLY).toBeGreaterThan(0)
  })

  it(`BL-1 「${BL_1_TASK_GROUP}」, FR-015 「${FR_015_ONE_SIDE}」: no Task has the UID -- nothing drawn`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [{ ...SHIFTED, uid: 99 }] })
    expect(stage.outlines(), BL_1_TASK_GROUP).toEqual([])
    expect(outlineShapesOf(stage.svg()), BL_1_TASK_GROUP).toEqual([])
  })

  it(`BL-1 「${BL_1_TASK_GROUP}」: of two, only the one whose UID matches a Task is drawn`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [SHIFTED, { ...SHIFTED, uid: 99 }] })
    expect(stage.outlines().map((one) => one.taskUid), BL_1_TASK_GROUP).toEqual([1])
  })

  for (const [rows, name] of [
    ['hiddenSecond', 'a hidden row (HR-6)'],
    ['collapsedParent', 'a row under a folded row (HR-1a)'],
  ] as const) {
    it(`BL-1 「${BL_1_FOLDED}」: the Task sits on ${name} -- not drawn; the Task on the drawn row still is`, () => {
      const stage = stageOf({
        tasks: [PLAIN, taskOf({ uid: 2, start: day(4), finish: day(10) })],
        baselines: [SHIFTED, { ...SHIFTED, uid: 2 }],
        rows,
      })
      expect(stage.drawn(1), 'premise: task 1 is drawn').toBeDefined()
      expect(stage.drawn(2), 'premise: task 2 is not drawn').toBeUndefined()
      expect(stage.outlines().map((one) => one.taskUid), BL_1_FOLDED).toEqual([1])
    })
  }

  for (const [name, baseline] of [
    ['start is null', { ...SHIFTED, start: null }],
    ['finish is null', { ...SHIFTED, finish: null }],
  ] as const) {
    it(`BL-1 「${BL_1_DATES}」: ${name} -- nothing drawn`, () => {
      const stage = stageOf({ tasks: [PLAIN], baselines: [baseline] })
      expect(stage.outlines(), BL_1_DATES).toEqual([])
      expect(outlineShapesOf(stage.svg()), BL_1_DATES).toEqual([])
    })
  }

  it(`BL-1 「${BL_1_S69}」: S-69 ${BASELINE_VISIBLE} false -- nothing drawn`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [SHIFTED], settings: { [BASELINE_VISIBLE]: false } })
    expect(stage.outlines(), BL_1_S69).toEqual([])
    expect(outlineShapesOf(stage.svg()), BL_1_S69).toEqual([])
  })

  it(`BL-1 「${BL_1_NOT_S227}」: S-227 ${PLAN_VISIBLE} false -- still drawn`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [SHIFTED], settings: { [PLAN_VISIBLE]: false } })
    expect(stage.outlines().map((one) => one.taskUid), BL_1_NOT_S227).toEqual([1])
    expect(outlineShapesOf(stage.svg()).length, BL_1_NOT_S227).toBeGreaterThan(0)
  })
})

describe('BL-2 -- where the outline stands and its shape', () => {
  it(`BL-2 「${BL_2_X}」: the box spans what a plan bar with the baseline's dates spans`, () => {
    const outline = onlyOutline(stageOf({ tasks: [PLAIN], baselines: [SHIFTED] }))
    const reference = planBandOf(
      stageOf({ tasks: [taskOf({ uid: 1, start: SHIFTED.start, finish: SHIFTED.finish })], baselines: [] }),
      1,
    )
    expect(outline.kind, BL_2_SHAPE).toBe('rectangle')
    expect(outline.box.x, BL_2_X).toBeCloseTo(reference.left, 6)
    expect(outline.box.x + outline.box.width, BL_2_X).toBeCloseTo(reference.right, 6)
  })

  it(`BL-2 control: the box is not the current Task's own span (the dates differ)`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [SHIFTED] })
    const own = planBandOf(stage, 1)
    expect(Math.abs(onlyOutline(stage).box.x - own.left), BL_2_X).toBeGreaterThan(1)
  })

  it(`BL-2 「${BL_2_Y}」: of two stacked Tasks, the box takes the matching one's plan band`, () => {
    const stage = stageOf({
      tasks: [PLAIN, taskOf({ uid: 2, start: day(6), finish: day(12) })],
      baselines: [{ uid: 2, start: day(2), finish: day(5) }],
    })
    const mine = planBandOf(stage, 2)
    const other = planBandOf(stage, 1)
    expect(Math.abs(mine.top - other.top), 'premise: the two Tasks stand in different tiers').toBeGreaterThan(1)
    const outline = onlyOutline(stage)
    expect(outline.box.y, BL_2_Y).toBeCloseTo(mine.top, 6)
    expect(outline.box.height, BL_2_Y).toBeCloseTo(mine.height, 6)
  })

  it(`BL-2 「${BL_2_NOT_S227}」: S-227 false gives the same box as S-227 true, for a bar and for a milestone`, () => {
    for (const baseline of [SHIFTED, { uid: 1, start: day(8), finish: day(8), milestone: true }] as const) {
      const withPlan = onlyOutline(stageOf({ tasks: [PLAIN], baselines: [baseline] }))
      const withoutPlan = onlyOutline(
        stageOf({ tasks: [PLAIN], baselines: [baseline], settings: { [PLAN_VISIBLE]: false } }),
      )
      expect(withoutPlan.box, BL_2_NOT_S227).toEqual(withPlan.box)
    }
  })

  it(`BL-2 「${BL_2_SHAPE}」: a milestone -- a diamond centred on x(start), both diagonals the band's height`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [{ uid: 1, start: day(8), finish: day(8), milestone: true }] })
    const band = planBandOf(stage, 1)
    const xStart = planBandOf(stageOf({ tasks: [taskOf({ uid: 1, start: day(8), finish: day(12) })], baselines: [] }), 1).left
    const outline = onlyOutline(stage)
    expect(outline.kind, BL_2_SHAPE).toBe('diamond')
    expect(outline.box.height, BL_2_SHAPE).toBeCloseTo(band.height, 6)
    expect(outline.box.y, BL_2_Y).toBeCloseTo(band.top, 6)
    expect(outline.box.width, BL_2_SHAPE).toBeCloseTo(outline.box.height, 6)
    expect(outline.box.x + outline.box.width / 2, BL_2_SHAPE).toBeCloseTo(xStart, 6)
  })

  it(`BL-2 「${BL_2_SHAPE}」: the drawn rectangle has the box's four corners`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [SHIFTED] })
    const { x, y, width, height } = onlyOutline(stage).box
    const vertices = outlineShapesOf(stage.svg()).flatMap(verticesOf)
    for (const corner of [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ]) {
      expect(hasVertex(vertices, corner), `${BL_2_SHAPE} (${corner.x},${corner.y})`).toBe(true)
    }
  })

  it(`BL-2 「${BL_2_SHAPE}」: the drawn diamond has its four points, and no rectangle corner`, () => {
    const stage = stageOf({ tasks: [PLAIN], baselines: [{ uid: 1, start: day(8), finish: day(8), milestone: true }] })
    const { x, y, width, height } = onlyOutline(stage).box
    const cx = x + width / 2
    const cy = y + height / 2
    const vertices = outlineShapesOf(stage.svg()).flatMap(verticesOf)
    for (const tip of [
      { x: cx, y },
      { x: x + width, y: cy },
      { x: cx, y: y + height },
      { x, y: cy },
    ]) {
      expect(hasVertex(vertices, tip), `${BL_2_SHAPE} (${tip.x},${tip.y})`).toBe(true)
    }
    expect(hasVertex(vertices, { x, y }), `${BL_2_SHAPE}: not a rectangle`).toBe(false)
  })

  it(`BL-2 「${BL_2_PLACE}」: a pinned Task's outline is pinned and cut as its plan is; a scrolling one's likewise`, () => {
    const stage = stageOf({
      tasks: [PLAIN, taskOf({ uid: 2, start: day(4), finish: day(10) })],
      baselines: [SHIFTED, { ...SHIFTED, uid: 2 }],
      rows: 'secondPinned',
    })
    const byUid = new Map(stage.outlines().map((one) => [one.taskUid, one]))
    expect(byUid.get(1)?.isPinned, BL_2_PLACE).toBe(false)
    expect(byUid.get(2)?.isPinned, BL_2_PLACE).toBe(true)
    const svg = stage.svg()
    const planClips = [1, 2].map((uid) => planElementOf(svg, uid).clips)
    expect(planClips[0], 'premise: the pinned and the scrolling plans are cut differently').not.toEqual(planClips[1])
    const shapes = outlineShapesOf(svg)
    for (const uid of [1, 2]) {
      const band = planBandOf(stage, uid)
      const mine = shapes.filter((one) => verticesOf(one).every((at) => at.y >= band.top - 1 && at.y <= band.bottom + 1))
      expect(mine.length, `${BL_2_PLACE}: task ${uid} has an outline in the picture`).toBeGreaterThan(0)
      for (const one of mine) expect(one.clips, `${BL_2_PLACE}: task ${uid}`).toEqual(planClips[uid - 1])
    }
  })
})

describe('BL-3 -- the line', () => {
  const stage = (over: Readonly<Record<string, unknown>> = {}): Stage =>
    stageOf({ tasks: [PLAIN], baselines: [SHIFTED], settings: over })

  it(`BL-3 「${BL_3_NO_FILL}」: every drawn part of the outline is unfilled and stroked`, () => {
    const shapes = outlineShapesOf(stage().svg())
    expect(shapes.length, 'premise: the outline is drawn').toBeGreaterThan(0)
    for (const one of shapes) {
      expect(['none', 'transparent'], BL_3_NO_FILL).toContain(painted(one, 'fill'))
      expect(painted(one, 'stroke'), BL_3_NO_FILL).not.toBeNull()
      expect(painted(one, 'stroke'), BL_3_NO_FILL).not.toBe('none')
    }
  })

  it(`BL-3 「${BL_3_VALUES}」: the colour is S-443, in the light and in the dark theme`, () => {
    expect(t236('S-443', 'light'), 'premise: the two themes differ').not.toBe(t236('S-443', 'dark'))
    for (const preference of ['light', 'dark'] as const) {
      const shapes = outlineShapesOf(stage().svg(preference))
      expect(shapes.length, 'premise: the outline is drawn').toBeGreaterThan(0)
      for (const one of shapes) {
        expect(normalColour(painted(one, 'stroke') ?? ''), `${BL_3_VALUES} (${preference})`).toBe(t236('S-443', preference))
      }
    }
  })

  const SCALES = [DISPLAY_SCALE_STEPS[0] as number, DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1] as number]

  it(`BL-3 「${BL_3_VALUES}」, VG-5 「${VG_5_SCALED}」: the width is S-39 at the drawn ratio, as the plan outline's, at two display scales`, () => {
    expect(displayRatioAt(SCALES[0] as number), 'premise: the two scales draw differently').not.toBeCloseTo(
      displayRatioAt(SCALES[1] as number),
      6,
    )
    for (const scale of SCALES) {
      const svg = stage({ [DISPLAY_SCALE]: scale }).svg()
      const shapes = outlineShapesOf(svg)
      expect(shapes.length, 'premise: the outline is drawn').toBeGreaterThan(0)
      const planWidth = Number(painted(planElementOf(svg, 1), 'stroke-width'))
      for (const one of shapes) {
        const width = Number(painted(one, 'stroke-width'))
        expect(near(width, S_39 * displayRatioAt(scale)), `${VG_5_SCALED} at ${scale}: ${width}`).toBe(true)
        expect(width, `${BL_3_VALUES} (the width of a plan outline that names none) at ${scale}`).toBe(planWidth)
      }
    }
  })

  it(`BL-3 「${BL_3_VALUES}」: a plan that names its own outline width (AT-104) does not pass it to the outline`, () => {
    // see BL-3, VG-5, AT-104
    const named = 5
    for (const scale of SCALES) {
      const svg = stageOf({ tasks: [PLAIN], baselines: [SHIFTED], settings: { [DISPLAY_SCALE]: scale }, strokeWidthPx: named }).svg()
      const planWidth = Number(painted(planElementOf(svg, 1), 'stroke-width'))
      expect(near(planWidth, named * displayRatioAt(scale)), `premise: ${VG_5_SCALED} -- the plan takes AT-104 at ${scale}`).toBe(true)
      const shapes = outlineShapesOf(svg)
      expect(shapes.length, 'premise: the outline is drawn').toBeGreaterThan(0)
      for (const one of shapes) {
        const width = Number(painted(one, 'stroke-width'))
        expect(near(width, S_39 * displayRatioAt(scale)), `${BL_3_VALUES} at ${scale}: ${width}`).toBe(true)
      }
    }
  })

  it(`BL-3 「${BL_3_VALUES}」, S-444 「${S_444_NOT_SCALED}」: the dash is S-444 at every display scale`, () => {
    for (const scale of [...SCALES, DEFAULT_DISPLAY_SCALE]) {
      const shapes = outlineShapesOf(stage({ [DISPLAY_SCALE]: scale }).svg())
      expect(shapes.length, 'premise: the outline is drawn').toBeGreaterThan(0)
      for (const one of shapes) {
        expect(numbersIn(painted(one, 'stroke-dasharray') ?? ''), `${S_444_NOT_SCALED} at ${scale}`).toEqual(S_444)
      }
    }
  })

  it(`BL-3 「${BL_3_NOT_SAME_DASH}」: the drawn dash is neither S-104's pair nor S-175's`, () => {
    const shapes = outlineShapesOf(stage().svg())
    expect(shapes.length, 'premise: the outline is drawn').toBeGreaterThan(0)
    for (const one of shapes) {
      const dash = numbersIn(painted(one, 'stroke-dasharray') ?? '')
      expect(dash.length, BL_3_NOT_SAME_DASH).toBeGreaterThan(0)
      expect(dash, `${BL_3_NOT_SAME_DASH} (S-104)`).not.toEqual(S_104)
      expect(dash, `${BL_3_NOT_SAME_DASH} (S-175)`).not.toEqual(S_175)
    }
  })
})

describe('BL-4 -- the outline takes no place in the occupation', () => {
  const EARLY = taskOf({ uid: 1, start: day(2), finish: day(8) })
  const LATE = taskOf({ uid: 2, start: day(12), finish: day(18) })
  const OVER_LATE: BaselineWish = { uid: 1, start: day(2), finish: day(16) }

  it('premise: without a baseline, the two Tasks share one tier', () => {
    const stage = stageOf({ tasks: [EARLY, LATE], baselines: [] })
    expect((stage.placed(1) as { y: number }).y).toBeCloseTo((stage.placed(2) as { y: number }).y, 6)
  })

  it('BL-4 control: a CURRENT Task over the same days does push the second Task to another tier', () => {
    const plain = stageOf({ tasks: [EARLY, LATE], baselines: [] })
    const long = stageOf({ tasks: [taskOf({ uid: 1, start: OVER_LATE.start, finish: OVER_LATE.finish }), LATE], baselines: [] })
    expect((long.placed(2) as { y: number }).y).not.toBeCloseTo((plain.placed(2) as { y: number }).y, 6)
  })

  it(`BL-4 「${BL_4}」: a baseline running over the second Task leaves every placement as without it`, () => {
    const without = stageOf({ tasks: [EARLY, LATE], baselines: [] })
    const withIt = stageOf({ tasks: [EARLY, LATE], baselines: [OVER_LATE] })
    expect(withIt.outlines().map((one) => one.taskUid), 'premise: the outline is drawn').toEqual([1])
    for (const uid of [1, 2]) expect(withIt.placed(uid), `${BL_4} (task ${uid})`).toEqual(without.placed(uid))
  })

  it(`BL-4 「${BL_4_WHY}」: turning S-69 on and off moves no placement`, () => {
    const on = stageOf({ tasks: [EARLY, LATE], baselines: [OVER_LATE] })
    const off = stageOf({ tasks: [EARLY, LATE], baselines: [OVER_LATE], settings: { [BASELINE_VISIBLE]: false } })
    expect(on.outlines().length, 'premise: the outline is drawn').toBe(1)
    for (const uid of [1, 2]) expect(on.placed(uid), `${BL_4_WHY} (task ${uid})`).toEqual(off.placed(uid))
  })
})

describe('S-3, FR-108 -- the outline takes no press', () => {
  const sizes = grabSizesOf()
  const CURRENT = taskOf({ uid: 1, start: day(2), finish: day(6) })

  for (const [name, baseline] of [
    ['clear of the current bar', { uid: 1, start: day(10), finish: day(18) }],
    ['over the current bar', { uid: 1, start: day(3), finish: day(9) }],
    ['a diamond clear of the current bar', { uid: 1, start: day(14), finish: day(14), milestone: true }],
  ] as const) {
    it(`FR-108 「${FR_108_THE_OVERLAY}${FR_108_NO_GRAB}」: every point on and in the outline (${name}) answers as without it`, () => {
      const withIt = stageOf({ tasks: [CURRENT], baselines: [baseline] })
      const without = stageOf({ tasks: [CURRENT], baselines: [] })
      const { x, y, width, height } = onlyOutline(withIt).box
      const probes: Pt[] = []
      for (let px = x - 1; px <= x + width + 1; px += 1) {
        for (let py = y - 1; py <= y + height + 1; py += 1) probes.push({ x: px, y: py })
      }
      probes.push({ x, y }, { x: x + width, y: y + height }, { x: x + width / 2, y: y + height / 2 })
      for (const at of probes) {
        for (const resolving of ['press', 'doubleClick'] as const) {
          const a = itemAtPointer(withIt.geometry as never, at.x, at.y, sizes, resolving)
          const b = itemAtPointer(without.geometry as never, at.x, at.y, sizes, resolving)
          expect(a, `${FR_108_NO_GRAB} (${resolving} at ${at.x},${at.y})`).toEqual(b)
        }
      }
    })
  }

  it('FR-108 control: the same probe on the current bar does find the Task', () => {
    const stage = stageOf({ tasks: [CURRENT], baselines: [] })
    const band = planBandOf(stage, 1)
    expect(itemAtPointer(stage.geometry as never, (band.left + band.right) / 2, band.centre, sizes)).not.toBeNull()
  })
})
