// CR-602 spec-only cases: an emphasized dependency line keeps S-159 and adds S-447, and its end Tasks' plans are traced.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { InputModifiers, PointerInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionWith, type Selection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from './spec-table'

const rowCells = (table: string, id: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell
}

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const numberIn = (cell: string): number => {
  const found = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`no number in ${cell}`)
  return Number(found[0])
}

const numbersOf = (text: string): readonly number[] => [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((one) => Number(one[0]))

// see T-201, T-206, T-236
const T201 = (id: string): number => numberIn(cellOf('T-201', id, '既定値'))
const T206 = (id: string): number => numberIn(cellOf('T-206', id, '既定'))
const colorOf = (id: string, column: string): string => cellOf('T-236', id, column).replace(/`/g, '').trim().toLowerCase()
const LIGHT = (id: string): string => colorOf(id, '明るいテーマ')
const DARK = (id: string): string => colorOf(id, '暗いテーマ')
const keyOf = (table: string, id: string): string => bare(cellOf(table, id, 'キー'))

const SL_8 = rowCells('T-023c', 'SL-8')
const DC_8 = rowCells('T-029a', 'DC-8')
const VG_4 = rowCells('T-259', 'VG-4')
const HT_1 = rowCells('T-267', 'HT-1')
const DS_7 = rowCells('T-252', 'DS-7')
const UF_145 = rowCells('T-075', 'UF-145')
const S_159 = rowCells('T-236', 'S-159')
const S_178 = rowCells('T-206', 'S-178')
const S_447 = rowCells('T-206', 'S-447')

const SL_8_WIDTH =
  '依存線は、その線自身の太さに 表 T-206 の `S-447` を足した太さで描き、色は変えないこと（MUST） —— 色は依存線の色（同書の 表 T-236 の `S-159`）のままとし、矢じりと、`FR-009` の 表 T-303 の `EL-9` の続きの印の点も同じとする。'
const SL_8_WHY_COLOR =
  '⭐ 色を変えないのは、選んだ線に別の色を当てると、その色が同表のほかの線の色（カーソルの `S-195`、基準日線の `S-163`）と紛れるからである。'
const SL_8_ENDS =
  '選んだ依存線の両端の `Task`（マイルストーンを含む）は、描いた予定の図形を、その輪郭と同じ所・同じ形の線で囲むこと（MUST） —— どのタスクがどのタスクに依存するかを、線のまわりで読ませる。'
const SL_8_OUTLINE_INK =
  '囲む線は、色を `S-159`、太さをその輪郭の太さ（表 T-201 の `S-39` に `FR-039` の描く比を掛けた太さ）に `S-447` を足した太さとし、図形の前（`FR-110` の 表 T-020 の `ZO-10`）に描くこと（MUST） —— 輪郭を太くせずに前へ重ねるので、図形を描く手順は変わらない。'
const SL_8_NOT_ACTUAL = '⛔ 実績を囲んではならない（MUST NOT） —— 囲むのは予定だけであり、予定と実績を合わせた外接矩形でも囲まない。'
const SL_8_LINE_SHAPES =
  '⚠️ 輪郭を持たない線だけの形（`FR-001` の 表 T-012 の `SH-3` ／ `SH-4`）は、描いた予定の線そのものを同じ所・同じ形でなぞる —— 線はその太さに `S-447` を足した太さで、矢じりと点はその縁を `S-447` の太さで描く。'
const SL_8_PLAN_OFF =
  '⚠️ 予定を描いていない端（予定の表示、`_assets/tbl-settings.md` の 表 T-202 の `S-227` を切っている）は囲まない。'
const SL_8_NOT_THE_FRAME_RULE = '⚠️ 上の「対象自身の輪郭をなぞってはならない」は選択の破線の枠の規則であり、この囲みには当てない。'
const DC_8_WIDTH =
  '追従している側を、その線自身の太さ（`_assets/tbl-settings.md` の 表 T-206 の `S-194`）に同表の `S-178` を掛けた太さで描いて示すこと（MUST） —— 表 T-023c の `SL-8` と同じく、色以外の手掛かりで示す（同行の理由がそのまま当てはまる）。'
const DC_8_NO_S447 = '⚠️ 同行が依存線の太さに足す `S-447` は、この線に当てない —— カーソルの線は倍率の `S-178` で太くする。'
const DC_8_NO_OUTLINE =
  '⚠️ 色は変えず、両端の囲みも持たない —— 同行が選んだ依存線に定める両端の囲みは、依存線だけのものである。'
const VG_4_NOT_COUNTED =
  '⛔ 選ばれた線と、続きの印で送った先の線（`FR-009` の 表 T-303 の `EL-16`）を、表 T-206 の `S-447` を足した太さで数えてはならない（MUST NOT） —— 選ぶたび、送るたびに段とタスクグループの位置が動く。'
const HT_1_TAKEN = '選んだ線は 表 T-206 の `S-447` を足した太さ（表 T-023c の `SL-8`）で取り'
const DS_7_NOT_SCALED = '足す `S-447` は画面の px であり、縮まない。'
const UF_145_WIDER = '選んだ線を太くし（`SL-8`・`S-447`）'
const S_159_ALSO = '選んだ依存線と、続きの印で送った先の線（表 T-023c の `SL-8`、`FR-009` の 表 T-303 の `EL-16`）も本行で描く'
const S_178_NOT_LINES = '依存線には掛けない'
const S_447_AT_100 = '表示の倍率 100（描く比 0.625、`S-236`）では、依存線は 1.5px → 3.5px、予定の輪郭は 0.625px → 2.625px になる。'
const S_447_PX = '画面の px である —— 表示の倍率（`FR-039`）にもズームにも追随させない'
const FR_009_PLAN_OFF =
  '⭐ 予定が無いタスクと、予定を表示していないとき（`S-227` が偽）は、その依存線を描かないこと（MUST） —— 実績へ落とさない（`RT-4a`）。'
const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

describe('CR-602 -- the manuscript these cases are driven by', () => {
  it.each([
    ['T-023c SL-8 (width)', SL_8, SL_8_WIDTH],
    ['T-023c SL-8 (why the color stays)', SL_8, SL_8_WHY_COLOR],
    ['T-023c SL-8 (ends)', SL_8, SL_8_ENDS],
    ['T-023c SL-8 (outline ink)', SL_8, SL_8_OUTLINE_INK],
    ['T-023c SL-8 (not the actual)', SL_8, SL_8_NOT_ACTUAL],
    ['T-023c SL-8 (line shapes)', SL_8, SL_8_LINE_SHAPES],
    ['T-023c SL-8 (plan off)', SL_8, SL_8_PLAN_OFF],
    ['T-023c SL-8 (not the frame rule)', SL_8, SL_8_NOT_THE_FRAME_RULE],
    ['T-029a DC-8 (width)', DC_8, DC_8_WIDTH],
    ['T-029a DC-8 (no S-447)', DC_8, DC_8_NO_S447],
    ['T-029a DC-8 (no outline)', DC_8, DC_8_NO_OUTLINE],
    ['T-259 VG-4', VG_4, VG_4_NOT_COUNTED],
    ['T-267 HT-1', HT_1, HT_1_TAKEN],
    ['T-252 DS-7', DS_7, DS_7_NOT_SCALED],
    ['T-075 UF-145', UF_145, UF_145_WIDER],
    ['T-236 S-159', S_159, S_159_ALSO],
    ['T-206 S-178', S_178, S_178_NOT_LINES],
    ['T-206 S-447 (at 100)', S_447, S_447_AT_100],
    ['T-206 S-447 (px)', S_447, S_447_PX],
  ] as const)('%s still says it', (_name, cell, clause) => {
    expect(flat(cell), clause).toContain(flat(clause))
  })

  it('FR-009 still says a line is not drawn while the plan is hidden', () => {
    expect(REQUIREMENTS, FR_009_PLAN_OFF).toContain(FR_009_PLAN_OFF)
  })
})

const DRAW_RATIO_AT_100 = T206('S-236')
// see FR-039, T-252
const ratioAt = (displayScale: number): number => (DRAW_RATIO_AT_100 * displayScale) / 100
const LINE_WIDTH = (displayScale = 100): number => T201('S-18') * ratioAt(displayScale)
// see SL-8, EL-16, S-447
const EMPHASIZED_WIDTH = (displayScale = 100): number => LINE_WIDTH(displayScale) + T206('S-447')
// see SL-8, S-39
const PLAN_OUTLINE_WIDTH = (displayScale = 100): number => T201('S-39') * ratioAt(displayScale)
// see SL-8, S-447
const OUTLINE_WIDTH = (displayScale = 100): number => PLAN_OUTLINE_WIDTH(displayScale) + T206('S-447')

const PLAN_VISIBLE = keyOf('T-202', 'S-227')
const DISPLAY_SCALE = keyOf('T-202', 'S-234')

describe(`S-447 -- ${S_447_AT_100}`, () => {
  it('the widths the cases below expect are the ones the note works out', () => {
    const [scale, ratio, lineBefore, lineAfter, outlineBefore, outlineAfter] = numbersOf(S_447_AT_100.replace(/`S-\d+`/g, ''))
    expect(ratioAt(scale!), 'S-236').toBeCloseTo(ratio!, 9)
    expect(LINE_WIDTH(scale!), S_447_AT_100).toBeCloseTo(lineBefore!, 9)
    expect(EMPHASIZED_WIDTH(scale!), S_447_AT_100).toBeCloseTo(lineAfter!, 9)
    expect(PLAN_OUTLINE_WIDTH(scale!), S_447_AT_100).toBeCloseTo(outlineBefore!, 9)
    expect(OUTLINE_WIDTH(scale!), S_447_AT_100).toBeCloseTo(outlineAfter!, 9)
  })
})

type Loose = Record<string, unknown>
type Settings = Parameters<typeof layoutFromSchedule>[1]
type Schedule = Parameters<typeof layoutFromSchedule>[0]
type Environment = Parameters<typeof regionsFromScreen>[0]
type ViewerArgument = Parameters<typeof svgFromSchedule>[7]
type ShapeKind = 'rectangle' | 'chevron' | 'milestone' | 'arrow' | 'endpointSpan'
type Theme = 'light' | 'dark'

interface Pt {
  readonly x: number
  readonly y: number
}

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)

interface TaskWish {
  readonly uid: number
  readonly start: number
  readonly days: number
  readonly links?: readonly number[]
  readonly actual?: readonly [number, number]
}

const taskOf = (wish: TaskWish): Loose => ({
  uid: wish.uid,
  parentTaskUid: null,
  wbsOrder: null,
  name: `t${wish.uid}`,
  start: iso(wish.start),
  finish: iso(wish.start + wish.days),
  milestone: wish.days === 0 ? true : null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: wish.actual === undefined ? null : iso(wish.actual[0]),
  stop: null,
  actualFinish: wish.actual === undefined ? null : iso(wish.actual[1]),
  resume: null,
  resumeValid: null,
  percentComplete: wish.actual === undefined ? null : 100,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: (wish.links ?? []).map((predecessorUid) => ({
    predecessorUid,
    linkType: 1,
    lag: null,
    lagFormat: null,
    carry: {},
    carryElements: [],
  })),
  carry: {},
})

interface SceneWish {
  readonly shape?: ShapeKind
  readonly tasks?: readonly TaskWish[]
  readonly selection?: Selection
  readonly landing?: boolean
  readonly settings?: Loose
}

const PAIR: readonly TaskWish[] = [
  { uid: 1, start: 0, days: 5 },
  { uid: 2, start: 10, days: 5, links: [1] },
]
const MILESTONES: readonly TaskWish[] = [
  { uid: 1, start: 0, days: 0 },
  { uid: 2, start: 10, days: 0, links: [1] },
]
const WITH_ACTUALS: readonly TaskWish[] = [
  { uid: 1, start: 2, days: 5, actual: [0, 9] },
  { uid: 2, start: 14, days: 5, links: [1], actual: [12, 21] },
]

const LINE_1_2 = selectionWith(emptySelection(), { kind: 'dependency', successorUid: 2, ordinal: 0 })

const svgOf = (wish: SceneWish, picture: 'screen' | 'export' = 'screen', theme: Theme = 'light'): string => {
  const tasks = (wish.tasks ?? PAIR).map(taskOf)
  const schedule = {
    project: { ...structuredClone(TEMPLATE.schedule.project), calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks,
    taskGroups: ['a', 'b'].map((id, order) => ({
      id,
      parentId: null,
      order,
      minHeight: null,
      label: id,
      derivedFromTaskUid: null,
      treeState: 'auto',
      editGroup: null,
      color: null,
    })),
    taskGroupMembers: tasks.map((task, at) => ({ groupId: at === 0 ? 'a' : 'b', taskUid: task['uid'] })),
    taskVisuals: tasks.map((task) => ({ taskUid: task['uid'], shapeKind: wish.shape ?? 'rectangle' })),
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
  const settings = { ...SETTINGS_DEFAULTS, scrollDate: iso(-7), zoomX: 1, ...wish.settings } as unknown as Settings
  const selection = wish.selection ?? emptySelection()
  const regions = regionsFromScreen(ENVIRONMENT as unknown as Environment, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const landing =
    wish.landing === true
      ? { kind: 'shown', landedBy: 'continuationMark', landedLink: { predecessorUid: 1, successorUid: 2 }, landedTarget: { kind: 'task', taskUid: 2 } }
      : { kind: 'hidden' }
  return svgFromSchedule(schedule, settings, layout as never, geometry as never, regions as never, selection, picture, {
    themePreference: theme,
    guideCursorMode: 'none',
    landingMarkDisplayState: landing,
  } as unknown as ViewerArgument)
}

// WHY: the SVG prints two decimals.
const SVG_EPS = 0.006

interface Element {
  readonly tag: string
  readonly attrs: string
  readonly zo: string | null
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return found === null ? null : found[1]!
}

const parsed = new Map<string, readonly Element[]>()

// see T-020
const elementsOf = (svg: string): readonly Element[] => {
  const held = parsed.get(svg)
  if (held !== undefined) return held
  const out: Element[] = []
  const groups: (string | null)[] = []
  const drawn = svg.replace(/<marker\b[\s\S]*?<\/marker>/g, '')
  for (const match of drawn.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrOf(attrs!, 'data-zo'))
      continue
    }
    if (closing === '/') continue
    const zo = [...groups].reverse().find((one) => one !== null) ?? null
    out.push({ tag: tag!, attrs: attrs!, zo })
  }
  parsed.set(svg, out)
  return out
}

const pointsAttr = (attrs: string): readonly Pt[] =>
  (attrOf(attrs, 'points') ?? '')
    .trim()
    .split(/\s+/)
    .filter((one) => one !== '')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x: x!, y: y! }
    })

const near = (a: Pt, b: Pt, eps = SVG_EPS): boolean => Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
const strokeOf = (one: Element): string => (attrOf(one.attrs, 'stroke') ?? '').toLowerCase()
const fillOf = (one: Element): string => (attrOf(one.attrs, 'fill') ?? '').toLowerCase()
const widthOf = (one: Element): number => Number(attrOf(one.attrs, 'stroke-width'))
const themed = (id: string, theme: Theme): string => (theme === 'light' ? LIGHT(id) : DARK(id))

const verticesOf = (one: Element): readonly Pt[] => {
  const at = (x: string, y: string): Pt => ({ x: Number(attrOf(one.attrs, x)), y: Number(attrOf(one.attrs, y)) })
  if (one.tag === 'line') return [at('x1', 'y1'), at('x2', 'y2')]
  if (one.tag === 'circle') return [at('cx', 'cy')]
  if (one.tag === 'rect') {
    const x = Number(attrOf(one.attrs, 'x'))
    const y = Number(attrOf(one.attrs, 'y'))
    const w = Number(attrOf(one.attrs, 'width'))
    const h = Number(attrOf(one.attrs, 'height'))
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
  }
  if (one.tag === 'path') {
    const values = numbersOf(attrOf(one.attrs, 'd') ?? '')
    const out: Pt[] = []
    for (let index = 0; index + 1 < values.length; index += 2) out.push({ x: values[index]!, y: values[index + 1]! })
    return out
  }
  return pointsAttr(one.attrs)
}

const sameVertices = (a: readonly Pt[], b: readonly Pt[]): boolean =>
  a.length > 0 && a.every((one) => b.some((other) => near(one, other))) && b.every((one) => a.some((other) => near(one, other)))

// WHY: a circle is the same figure only with the same center and the same radius.
const sameFigure = (a: Element, b: Element): boolean =>
  sameVertices(verticesOf(a), verticesOf(b)) &&
  (a.tag !== 'circle' || Math.abs(Number(attrOf(a.attrs, 'r')) - Number(attrOf(b.attrs, 'r'))) <= SVG_EPS)

// see T-020, ZO-1
const figuresOf = (svg: string, uid: number, part: 'plan' | 'actual'): readonly Element[] =>
  elementsOf(svg).filter((one) => attrOf(one.attrs, 'data-figure') === `task-${uid}-${part}`)

const inkedLines = (svg: string, theme: Theme = 'light'): readonly Element[] =>
  elementsOf(svg).filter((one) => one.tag === 'polyline' && strokeOf(one) === themed('S-159', theme))

const emphasizedLines = (svg: string, displayScale = 100, theme: Theme = 'light'): readonly Element[] =>
  inkedLines(svg, theme).filter((one) => Math.abs(widthOf(one) - EMPHASIZED_WIDTH(displayScale)) <= SVG_EPS)

// see SL-8, ZO-10
const outlinesOf = (svg: string, theme: Theme = 'light'): readonly Element[] =>
  elementsOf(svg).filter(
    (one) => one.zo === 'ZO-10' && strokeOf(one) === themed('S-159', theme) && attrOf(one.attrs, 'stroke-dasharray') === null,
  )

const traceOf = (svg: string, figure: Element, theme: Theme = 'light'): Element | undefined =>
  outlinesOf(svg, theme).find((one) => one.tag === figure.tag && sameFigure(one, figure))

const EMPHASES = [
  ['a selected line', { selection: LINE_1_2 }],
  ['a landing line', { landing: true }],
] as const

describe(`SL-8 -- ${SL_8_WIDTH}`, () => {
  const colors = (svg: string): ReadonlySet<string> => {
    const out = new Set<string>()
    for (const one of elementsOf(svg)) {
      for (const paint of [strokeOf(one), fillOf(one)]) if (paint !== '' && paint !== 'none') out.add(paint)
    }
    for (const found of svg.matchAll(/<marker\b[\s\S]*?<\/marker>/g)) {
      for (const paint of found[0].matchAll(/(?:fill|stroke)="([^"]*)"/g)) if (paint[1] !== 'none') out.add(paint[1]!.toLowerCase())
    }
    return out
  }

  for (const [name, wish] of EMPHASES) {
    for (const theme of ['light', 'dark'] as const) {
      it(`${name} (${theme}) brings in no color the plain picture does not hold -- ${SL_8_WHY_COLOR}`, () => {
        const plain = colors(svgOf({}, 'screen', theme))
        const emphasized = svgOf(wish, 'screen', theme)
        expect(emphasizedLines(emphasized, 100, theme).length, 'premise: the line is emphasized').toBe(1)
        expect([...colors(emphasized)].filter((one) => !plain.has(one)), SL_8_WIDTH).toEqual([])
      })
    }
  }
})

describe(`SL-8 -- ${SL_8_ENDS}`, () => {
  for (const [shape, tasks] of [
    ['rectangle', PAIR],
    ['chevron', PAIR],
    ['milestone', MILESTONES],
  ] as const) {
    for (const [name, wish] of EMPHASES) {
      it(`${shape}, ${name}: each end is traced by one element on its plan's own points -- ${SL_8_OUTLINE_INK}`, () => {
        const svg = svgOf({ ...wish, shape, tasks })
        const outlines = outlinesOf(svg)
        const bodies = [1, 2].map((uid) => {
          const plan = figuresOf(svg, uid, 'plan')
          expect(plan.length, `premise: Task ${uid}'s plan is drawn`).toBeGreaterThan(0)
          const body = plan.filter((one) => (attrOf(one.attrs, 'data-layer') ?? 'body') === 'body')
          expect(body.length, `premise: Task ${uid}'s plan has one outlined body`).toBe(1)
          return body[0]!
        })
        expect(outlines.length, SL_8_ENDS).toBe(2)
        const all = elementsOf(svg)
        for (const body of bodies) {
          const trace = traceOf(svg, body)
          expect(trace, SL_8_ENDS).toBeDefined()
          expect(['none', 'transparent'], `${SL_8_ENDS} (a line, not a fill)`).toContain(fillOf(trace!))
          expect(Math.abs(widthOf(trace!) - OUTLINE_WIDTH()), SL_8_OUTLINE_INK).toBeLessThanOrEqual(SVG_EPS)
          expect(all.indexOf(trace!), `${SL_8_OUTLINE_INK} (図形の前)`).toBeGreaterThan(all.indexOf(body))
        }
      })
    }
  }

  it(`milestone: only the body layer is traced, never an inner mark (${SL_8_ENDS})`, () => {
    const svg = svgOf({ selection: LINE_1_2, shape: 'milestone', tasks: MILESTONES })
    for (const uid of [1, 2]) {
      for (const inner of figuresOf(svg, uid, 'plan').filter((one) => (attrOf(one.attrs, 'data-layer') ?? 'body') !== 'body')) {
        expect(traceOf(svg, inner), SL_8_ENDS).toBeUndefined()
      }
    }
  })
})

describe(`SL-8 -- ${SL_8_LINE_SHAPES}`, () => {
  for (const shape of ['arrow', 'endpointSpan'] as const) {
    for (const [name, wish] of EMPHASES) {
      it(`${shape}, ${name}: every drawn part of each plan is traced on the same place`, () => {
        const svg = svgOf({ ...wish, shape })
        let parts = 0
        for (const uid of [1, 2]) {
          const plan = figuresOf(svg, uid, 'plan')
          expect(plan.some((one) => one.tag === 'line'), `premise: Task ${uid}'s plan is a line`).toBe(true)
          for (const part of plan) {
            parts += 1
            const trace = traceOf(svg, part)
            expect(trace, `${SL_8_LINE_SHAPES} (${part.tag})`).toBeDefined()
            if (part.tag === 'line') {
              expect(Math.abs(widthOf(trace!) - (widthOf(part) + T206('S-447'))), SL_8_LINE_SHAPES).toBeLessThanOrEqual(
                2 * SVG_EPS,
              )
            } else {
              expect(['none', 'transparent'], `${SL_8_LINE_SHAPES} (縁)`).toContain(fillOf(trace!))
              expect(widthOf(trace!), `${SL_8_LINE_SHAPES} (縁を S-447 の太さで)`).toBeCloseTo(T206('S-447'), 2)
            }
          }
        }
        expect(outlinesOf(svg).length, SL_8_LINE_SHAPES).toBe(parts)
      })
    }
  }
})

describe(`SL-8 -- ${SL_8_NOT_ACTUAL}`, () => {
  for (const [name, wish] of EMPHASES) {
    it(`${name}: the plans are traced, the actuals are not, and nothing encloses both`, () => {
      const svg = svgOf({ ...wish, tasks: WITH_ACTUALS })
      const outlines = outlinesOf(svg)
      expect(outlines.length, SL_8_NOT_ACTUAL).toBe(2)
      for (const uid of [1, 2]) {
        const plan = figuresOf(svg, uid, 'plan')[0]!
        const actual = figuresOf(svg, uid, 'actual')
        expect(actual.length, `premise: Task ${uid}'s actual is drawn`).toBeGreaterThan(0)
        expect(sameFigure(plan, actual[0]!), 'premise: the actual lies elsewhere than the plan').toBe(false)
        expect(traceOf(svg, plan), SL_8_ENDS).toBeDefined()
        for (const one of actual) expect(traceOf(svg, one), SL_8_NOT_ACTUAL).toBeUndefined()
      }
      const plans = [1, 2].map((uid) => figuresOf(svg, uid, 'plan')[0]!)
      for (const one of outlines) {
        expect(plans.some((plan) => sameFigure(one, plan)), `${SL_8_NOT_ACTUAL} (no box of plan and actual)`).toBe(true)
      }
    })
  }
})

describe(`S-447 -- ${S_447_PX}; ${DS_7_NOT_SCALED}`, () => {
  const AT = 200

  for (const [name, wish] of EMPHASES) {
    it(`${name} at display scale ${AT}: the line is S-18 x ratio + S-447 and the outline S-39 x ratio + S-447`, () => {
      const svg = svgOf({ ...wish, settings: { [DISPLAY_SCALE]: AT } })
      expect(emphasizedLines(svg, AT).length, SL_8_WIDTH).toBe(1)
      const outlines = outlinesOf(svg)
      expect(outlines.length, 'premise: two outlines').toBe(2)
      for (const one of outlines) expect(Math.abs(widthOf(one) - OUTLINE_WIDTH(AT)), S_447_PX).toBeLessThanOrEqual(SVG_EPS)
    })
  }

  it(`the addend is the same at display scale 100 and ${AT}; the plain line scales`, () => {
    const widthsAt = (scale: number): readonly number[] =>
      inkedLines(svgOf({ selection: LINE_1_2, settings: { [DISPLAY_SCALE]: scale } })).map(widthOf)
    for (const scale of [100, AT]) {
      const widths = widthsAt(scale)
      expect(widths.length, 'premise: one line is drawn').toBe(1)
      expect(widths[0]! - LINE_WIDTH(scale), `${DS_7_NOT_SCALED} (at ${scale})`).toBeCloseTo(T206('S-447'), 2)
    }
  })
})

describe(`SL-8 -- ${SL_8_PLAN_OFF}`, () => {
  for (const [name, wish] of EMPHASES) {
    it(`${name} with ${PLAN_VISIBLE} off: nothing is traced; the line itself is not drawn (${FR_009_PLAN_OFF})`, () => {
      const svg = svgOf({ ...wish, settings: { [PLAN_VISIBLE]: false } })
      expect(figuresOf(svg, 1, 'plan'), 'premise: no plan is drawn').toEqual([])
      expect(outlinesOf(svg), SL_8_PLAN_OFF).toEqual([])
      expect(inkedLines(svg), FR_009_PLAN_OFF).toEqual([])
    })
  }

  it(`control: with ${PLAN_VISIBLE} on, the same selection traces both ends`, () => {
    expect(outlinesOf(svgOf({ selection: LINE_1_2 })).length).toBe(2)
  })
})

describe('EP-12 -- an exported picture draws neither the emphasis nor the outlines', () => {
  for (const shape of ['rectangle', 'milestone', 'arrow'] as const) {
    it(`${shape}: a selected line and a landing in an export -- no wider line, no trace`, () => {
      const svg = svgOf({ selection: LINE_1_2, landing: true, shape, tasks: shape === 'milestone' ? MILESTONES : PAIR }, 'export')
      expect(emphasizedLines(svg), 'EP-12').toEqual([])
      expect(outlinesOf(svg), 'EP-12').toEqual([])
      expect(inkedLines(svg).length, 'premise: the line itself is exported').toBe(1)
    })
  }
})

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 0, scrollbarThickness: 0 }
const REAL_RAF = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (REAL_RAF === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = REAL_RAF
})

const MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const pointerAt = (phase: PointerInput['phase'], x: number, y: number): PointerInput =>
  ({ kind: 'pointer', phase, button: 'left', x, y, modifiers: MODS, clickCount: 1 }) as unknown as PointerInput

const shellDocument = (): Document =>
  ({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 1000, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: 'cccccccc-0000-4000-8000-000000000001',
          parentId: null,
          label: 'Row1',
          derivedFromTaskUid: null,
          order: 0,
          treeState: 'auto',
          editGroup: null,
          color: null,
          minHeight: null,
        },
      ],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      pinnedGroupIds: [],
      scrollDate: '2026-03-30',
      scrollDayOffset: 0,
      scrollGroupId: 'cccccccc-0000-4000-8000-000000000001',
      scrollGroupOffset: 0,
      zoomX: 4,
      zoomY: 1,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }) as unknown as Document

// see FR-082
const IC_DUAL = 'IC-45'

describe(`DC-8 -- ${DC_8_WIDTH}`, () => {
  it(`the following cursor line is S-194 x S-178 in S-195 -- ${DC_8_NO_S447}`, () => {
    const waiting: ((time: number) => void)[] = []
    ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
      waiting.push(callback)
    const drain = (): void => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
    }
    let aimed: ScreenPart | null = null
    let shown = ''
    const surface: ScreenSurface = {
      showScreenView: () => undefined,
      readDialogueInput: () => null,
      readFieldCommit: () => null,
      readScreenPartAt: (): ScreenPart | null => aimed,
    }
    const loop = frameLoop({ showSvg: (svg: string) => void (shown = svg) } as never, shellDocument(), SCREEN, {
      surface,
      language: 'en',
    })
    drain()
    const send = (input: PointerInput): void => {
      loop.receiveInput(input)
      drain()
    }
    aimed = {
      part: 'Command Palette',
      entry: IC_DUAL,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    } as unknown as ScreenPart
    send(pointerAt('down', 80, 120))
    send(pointerAt('up', 80, 120))
    aimed = null
    const area = loop.current()!.regions.taskGroupArea as unknown as { readonly x: number; readonly y: number }
    send(pointerAt('move', area.x + 200, area.y + 40))
    send(pointerAt('down', area.x + 200, area.y + 40))
    send(pointerAt('up', area.x + 200, area.y + 40))
    send(pointerAt('move', area.x + 400, area.y + 40))
    const cursors = elementsOf(shown).filter((one) => one.tag === 'line' && strokeOf(one) === LIGHT('S-195'))
    expect(cursors.length, 'premise: both cursor lines are drawn in S-195').toBeGreaterThanOrEqual(2)
    const following = T206('S-194') * T206('S-178')
    const added = T206('S-194') + T206('S-447')
    expect(Math.abs(following - added), 'premise: the two rules give different widths').toBeGreaterThan(SVG_EPS)
    const widths = cursors.map(widthOf)
    expect(Math.max(...widths), DC_8_WIDTH).toBeCloseTo(following, 2)
    expect(widths.some((one) => Math.abs(one - added) <= SVG_EPS), DC_8_NO_S447).toBe(false)
    expect(outlinesOf(shown), DC_8_NO_OUTLINE).toEqual([])
  })
})
