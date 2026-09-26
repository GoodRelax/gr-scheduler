// CR-583: T-221 LF-10 / LF-18, figure F-044 -- milestone figures centred on their box, drawn in layers.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, taskPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { xFromDay } from '../../src/entity/layout-engine/schedule-layout/time-axis'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { H, S_17, S_5, SCREEN, day, rowOf, scheduleOf, taskOf, type Pt } from '../unit/cr-430-cross-section-scene'
import { unbroken } from './spec-table'


const SPEC = join(process.cwd(), 'docs', 'spec')
const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const plain = (text: string): string => unbroken(text).replace(/\*\*/g, '')

const DESIGN = plain(readText(join(SPEC, '05-07-design.md')))
const REQUIREMENTS = plain(readText(join(SPEC, '01-04-requirements.md')))
const ERD_DETAIL = plain(readText(join(SPEC, '_assets', 'fig-erd-detail.md')))
const RULINGS = plain(readText(join(process.cwd(), 'docs', 'development-records', 'rulings.md')))
const FIGURE_F_044 = readText(join(SPEC, '_assets', 'fig-milestone-shapes.svg'))

const cellText = (table: string, id: string): string => plain(Object.values(rowOf(table, id).by).join(' '))


const LF_10_PLAN = '予定は、その `Task` の予定の縦幅を一辺とする図形とし、`start` の位置を中心に置く。'
const LF_10_ACTUAL = '実績はそれに `actualOfPlan` を掛けた大きさとし、実績の日付を中心に置く。'
const LF_10_SAME_MIDDLE = '上下の中心は予定と同じとする'
const LF_10_BOX_CENTRE = '⭐ 図形の中心は、その図形の外接枠の中心とする（上下も左右も）。'
const LF_10_NOT_THE_CIRCLE = '⛔ 頂点を置いた円の中心を中心としてはならない —— △ ▽ 五角形 ☆ が上下にずれ、横に並べたとき揃って見えない'

const LF_18_BODY = '外形は塗り、縁の線で囲む。'
const LF_18_INNER =
  '絵の中の線（箱の稜線・円筒と杯の上面の手前の弧・書類の折り返し・フロッピーの窓・顔の口）は、塗りに穴を開けずに、塗りの上に線で描く。'
const LF_18_DOT = '顔の目は点で塗る。'
const LF_18_COLOUR = '⭐ 中の線と点の色は、予定では予定の縁の色、実績とダミーでは予定の塗りの色とする'
const LF_18_CUSTOM = 'カスタムカラーのタスクでは、そのタスクの予定の塗りの色である。'
const LF_18_ORDER = '⭐ 重なる部分は、奥から順に描く —— 人は胴の上に頭、杯は取っ手の上に胴。'
const LF_18_CURVES = '⭐ 円・顔の輪郭・円筒・杯の丸みは曲線で描き、多角形で近似しない'
const LF_18_F_044 = '⭐ 形そのもの（単位の正方形の中の座標）は 図 F-044 が持つ。'

const F_044_AUTHORITY = '⭐ 本図はチャートのマイルストーンの形の正であり、`01-04-requirements.md` の 表 T-012 の `SH-5` の順に 15 形を並べる。'
const F_044_UNIT = '各形は一辺 2 の単位の正方形の中に在り（y は下向き）、外接枠の中心を原点に置く（表 T-221 の `LF-10`）。'
const F_044_MAPPED = '予定と実績は、単位の正方形の一辺を `LF-10` の大きさへ写して描く。'
const F_044_ROLES =
  '要素の class は描き方の役である —— `body` は塗りと縁、`inner` は塗りの上の線、`dot` は塗った点、`shade` は薄く塗った面である（`LF-18`）。'

const SH_5_PAIRS = '⛔ `SH-5` が並べる 15 の印と `TaskVisual.milestoneGlyph` の綴りの対応は次のとおりとすること（MUST）'
const AT_101_FIFTEEN = '列挙（15 値）'
const DM_4 = '⭐ 印は、長さ 1 稼働日の実績と同じ形で描くこと（MUST）。'
const DM_8 = 'ダミーの図形は、そのマイルストーンの実績の図形と同じとすること（MUST）。'
const DM_9 = 'マイルストーンのダミーを描く箱は、そのマイルストーンの実績の図形と同じ正方形とすること（MUST）。'
const DM_12 = '⭐ マイルストーンのダミーは予定の図形と同じ日に立ち、同じ日の実績のマイルストーンと同じ姿で描く'
const HT_1_ONLY = '描いた形の上では、その形のタスクの掴み代だけが応えること（MUST）。'
const HT_1_MILESTONE = 'マイルストーンは描いた図形'
const GA_15_BAND = '菱形の帯 ＋ `S-279`'
const S_280_THE_SQUARE = '⭐ 掴み代は描いた図形の外接正方形そのものである'
const JDG_742 = '⭐ フロッピーの窓は線で描く（くり抜かない）。外形は変えない'


// WHY: the SVG writes coordinates to two decimals and curves are sampled, so a drawn value is
// WHY: compared to a few hundredths of a px -- the smallest move CR-583 makes is 0.095 of a half side.
const EPS = 0.02
const ARC_STEPS = 256

interface Outline {
  readonly runs: readonly (readonly Pt[])[]
  readonly anchors: readonly Pt[]
  readonly curved: boolean
}

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi
const numbersOf = (text: string): number[] => (text.match(NUMBER) ?? []).map(Number)

const angleBetween = (ux: number, uy: number, vx: number, vy: number): number =>
  Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)

// WHY: an arc is sampled from its centre form (SVG 1.1 appendix F.6.5) so its extent is measured,
// WHY: not guessed from its end points.
const arcRun = (from: Pt, rxIn: number, ryIn: number, tilt: number, large: number, sweep: number, to: Pt): Pt[] => {
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  if (rx === 0 || ry === 0) return [to]
  const phi = (tilt * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (from.x - to.x) / 2
  const dy = (from.y - to.y) / 2
  const x1 = cos * dx + sin * dy
  const y1 = -sin * dx + cos * dy
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const coef = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / den))
  const cxp = (coef * rx * y1) / ry
  const cyp = (-coef * ry * x1) / rx
  const cx = cos * cxp - sin * cyp + (from.x + to.x) / 2
  const cy = sin * cxp + cos * cyp + (from.y + to.y) / 2
  const start = angleBetween(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry)
  let turn = angleBetween((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry)
  if (sweep === 0 && turn > 0) turn -= 2 * Math.PI
  if (sweep === 1 && turn < 0) turn += 2 * Math.PI
  const out: Pt[] = []
  for (let step = 1; step <= ARC_STEPS; step += 1) {
    const t = start + (turn * step) / ARC_STEPS
    out.push({
      x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
      y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos,
    })
  }
  out[out.length - 1] = to
  return out
}

const bezierRun = (controls: readonly Pt[]): Pt[] => {
  const out: Pt[] = []
  for (let step = 1; step <= ARC_STEPS; step += 1) {
    const t = step / ARC_STEPS
    let level = [...controls]
    while (level.length > 1) {
      const next: Pt[] = []
      for (let index = 0; index + 1 < level.length; index += 1) {
        const a = level[index] as Pt
        const b = level[index + 1] as Pt
        next.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      }
      level = next
    }
    out.push(level[0] as Pt)
  }
  return out
}

const pathOutline = (d: string): Outline => {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []
  const runs: Pt[][] = []
  const anchors: Pt[] = []
  let curved = false
  let at = 0
  let command = ''
  let here: Pt = { x: 0, y: 0 }
  let begin: Pt = { x: 0, y: 0 }
  let run: Pt[] = []
  const take = (): number => Number(tokens[at++])
  const moveTo = (to: Pt): void => {
    if (run.length > 0) runs.push(run)
    run = [to]
    anchors.push(to)
    here = to
    begin = to
  }
  const lineTo = (to: Pt): void => {
    run.push(to)
    anchors.push(to)
    here = to
  }
  while (at < tokens.length) {
    const token = tokens[at] as string
    if (/[a-zA-Z]/.test(token)) {
      command = token
      at += 1
      if (command === 'Z' || command === 'z') {
        run.push(begin)
        here = begin
      }
      continue
    }
    const relative = command === command.toLowerCase()
    const ox = relative ? here.x : 0
    const oy = relative ? here.y : 0
    switch (command.toUpperCase()) {
      case 'M': {
        moveTo({ x: ox + take(), y: oy + take() })
        command = relative ? 'l' : 'L'
        break
      }
      case 'L':
        lineTo({ x: ox + take(), y: oy + take() })
        break
      case 'H':
        lineTo({ x: ox + take(), y: here.y })
        break
      case 'V':
        lineTo({ x: here.x, y: oy + take() })
        break
      case 'A': {
        const rx = take()
        const ry = take()
        const tilt = take()
        const large = take()
        const sweep = take()
        const to = { x: ox + take(), y: oy + take() }
        run.push(...arcRun(here, rx, ry, tilt, large, sweep, to))
        anchors.push(to)
        here = to
        curved = true
        break
      }
      case 'Q': {
        const control = { x: ox + take(), y: oy + take() }
        const to = { x: ox + take(), y: oy + take() }
        run.push(...bezierRun([here, control, to]))
        anchors.push(to)
        here = to
        curved = true
        break
      }
      case 'C': {
        const one = { x: ox + take(), y: oy + take() }
        const two = { x: ox + take(), y: oy + take() }
        const to = { x: ox + take(), y: oy + take() }
        run.push(...bezierRun([here, one, two, to]))
        anchors.push(to)
        here = to
        curved = true
        break
      }
      default:
        throw new Error(`this reader does not follow the path command ${command} in ${d}`)
    }
  }
  if (run.length > 0) runs.push(run)
  return { runs, anchors, curved }
}

const ellipseOutline = (cx: number, cy: number, rx: number, ry: number): Outline => {
  const run: Pt[] = []
  for (let step = 0; step <= ARC_STEPS; step += 1) {
    const t = (2 * Math.PI * step) / ARC_STEPS
    run.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) })
  }
  const anchors = [
    { x: cx + rx, y: cy },
    { x: cx, y: cy + ry },
    { x: cx - rx, y: cy },
    { x: cx, y: cy - ry },
  ]
  return { runs: [run], anchors, curved: true }
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  if (found !== null) return found[1] as string
  const style = /(?:^|\s)style="([^"]*)"/.exec(attrs)?.[1] ?? ''
  const prop = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style)
  return prop === null ? null : (prop[1] as string).trim()
}

const numberAttr = (attrs: string, name: string, fallback = 0): number => {
  const value = attrOf(attrs, name)
  return value === null ? fallback : Number(value)
}

const outlineOf = (tag: string, attrs: string): Outline => {
  if (tag === 'path') return pathOutline(attrOf(attrs, 'd') ?? '')
  if (tag === 'circle') {
    const r = numberAttr(attrs, 'r')
    return ellipseOutline(numberAttr(attrs, 'cx'), numberAttr(attrs, 'cy'), r, r)
  }
  if (tag === 'ellipse') {
    return ellipseOutline(numberAttr(attrs, 'cx'), numberAttr(attrs, 'cy'), numberAttr(attrs, 'rx'), numberAttr(attrs, 'ry'))
  }
  if (tag === 'rect') {
    const x = numberAttr(attrs, 'x')
    const y = numberAttr(attrs, 'y')
    const w = numberAttr(attrs, 'width')
    const h = numberAttr(attrs, 'height')
    const corners = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
    return { runs: [[...corners, corners[0] as Pt]], anchors: corners, curved: false }
  }
  if (tag === 'line') {
    const ends = [
      { x: numberAttr(attrs, 'x1'), y: numberAttr(attrs, 'y1') },
      { x: numberAttr(attrs, 'x2'), y: numberAttr(attrs, 'y2') },
    ]
    return { runs: [ends], anchors: ends, curved: false }
  }
  if (tag === 'polygon' || tag === 'polyline') {
    const numbers = numbersOf(attrOf(attrs, 'points') ?? '')
    const points: Pt[] = []
    for (let index = 0; index + 1 < numbers.length; index += 2) {
      points.push({ x: numbers[index] as number, y: numbers[index + 1] as number })
    }
    const run = tag === 'polygon' && points.length > 0 ? [...points, points[0] as Pt] : points
    return { runs: [run], anchors: points, curved: false }
  }
  throw new Error(`no outline for <${tag}>`)
}

const distanceToSegment = (p: Pt, a: Pt, b: Pt): number => {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const length = vx * vx + vy * vy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / length))
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t))
}

const distanceTo = (outline: Outline, p: Pt): number => {
  let best = Number.POSITIVE_INFINITY
  for (const run of outline.runs) {
    if (run.length === 1) best = Math.min(best, Math.hypot(p.x - (run[0] as Pt).x, p.y - (run[0] as Pt).y))
    for (let index = 0; index + 1 < run.length; index += 1) {
      best = Math.min(best, distanceToSegment(p, run[index] as Pt, run[index + 1] as Pt))
    }
  }
  return best
}

interface Extent {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

const extentOf = (outlines: readonly Outline[]): Extent => {
  const points = outlines.flatMap((one) => one.runs.flat())
  if (points.length === 0) throw new Error('an extent of nothing')
  return {
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)),
    bottom: Math.max(...points.map((p) => p.y)),
  }
}

const middleOf = (extent: Extent): Pt => ({ x: (extent.left + extent.right) / 2, y: (extent.top + extent.bottom) / 2 })


type Role = 'body' | 'inner' | 'dot' | 'shade'

interface Layer {
  readonly role: Role
  readonly outline: Outline
}

interface Shape {
  readonly glyph: string
  readonly layers: readonly Layer[]
}

const SHAPE_TAGS = /<(path|circle|ellipse|rect|polygon|polyline|line)\b((?:[^<>"]|"[^"]*")*?)\/?>/g

const shapesOfF044 = (): readonly Shape[] => {
  const out: Shape[] = []
  const groups =
    /<g transform="translate\([^)]*\) scale\([^)]*\)">([\s\S]*?)<\/g>\s*<text class="lbl"[^>]*>([^<]+)<\/text>/g
  for (const group of FIGURE_F_044.matchAll(groups)) {
    const layers: Layer[] = []
    for (const shape of (group[1] as string).matchAll(SHAPE_TAGS)) {
      const role = attrOf(shape[2] as string, 'class') as Role
      layers.push({ role, outline: outlineOf(shape[1] as string, shape[2] as string) })
    }
    out.push({ glyph: (group[2] as string).trim(), layers })
  }
  return out
}

const F_044 = shapesOfF044()
const shapeOf = (glyph: string): Shape => {
  const found = F_044.find((one) => one.glyph === glyph)
  if (found === undefined) throw new Error(`figure F-044 draws no ${glyph}`)
  return found
}
const unitExtentOf = (glyph: string): Extent => extentOf(shapeOf(glyph).layers.map((one) => one.outline))
const layersOf = (glyph: string, role: Role): readonly Layer[] => shapeOf(glyph).layers.filter((one) => one.role === role)

// see SH-5, T-012
const sh5Spellings = (): readonly string[] => {
  const at = REQUIREMENTS.indexOf(SH_5_PAIRS)
  if (at < 0) throw new Error('the note under table T-012 no longer pairs SH-5 to milestoneGlyph')
  const paragraph = REQUIREMENTS.slice(at, REQUIREMENTS.indexOf('\n', at))
  return [...paragraph.matchAll(/＝ `([a-zA-Z]+)`/g)].map((one) => one[1] as string)
}
const GLYPHS = sh5Spellings()

const CURVED_GLYPHS = ['circle', 'smile', 'cylinder', 'person', 'beerMug'] as const
const MOVED_GLYPHS = ['triangleUp', 'triangleDown', 'pentagon', 'star'] as const
const INNER_GLYPHS = GLYPHS.filter((glyph) => layersOf(glyph, 'inner').length > 0)
const DOT_GLYPHS = GLYPHS.filter((glyph) => layersOf(glyph, 'dot').length > 0)


const PLAN_DAY = 10
const ACTUAL_DAY = 20
const UNSTARTED_DAY = 30
const STARTED_UID = 1
const UNSTARTED_UID = 2

const calendarDay = (n: number): { year: number; month: number; day: number } => ({ year: 2026, month: 3, day: n })

interface Element {
  readonly index: number
  readonly tag: string
  readonly attrs: string
  readonly groupAttrs: readonly string[]
  readonly outline: Outline
}

const paintOf = (element: Element, name: string): string | null => {
  const own = attrOf(element.attrs, name)
  if (own !== null) return own
  for (let index = element.groupAttrs.length - 1; index >= 0; index -= 1) {
    const inherited = attrOf(element.groupAttrs[index] as string, name)
    if (inherited !== null) return inherited
  }
  return null
}

const colour = (text: string | null): string => (text ?? '').replace(/\s+/g, '').toLowerCase()
// WHY: an absent fill paints black in SVG, so only an explicit none leaves a shape unfilled.
const isFilled = (element: Element): boolean => colour(paintOf(element, 'fill')) !== 'none'
const isStroked = (element: Element): boolean => {
  const stroke = colour(paintOf(element, 'stroke'))
  return stroke !== '' && stroke !== 'none'
}
const isLine = (element: Element): boolean => !isFilled(element) && isStroked(element)

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const groups: string[] = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:[^<>"]|"[^"]*")*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrs as string)
      continue
    }
    if (closing === '/') continue
    if (!/^(path|circle|ellipse|rect|polygon|polyline|line)$/.test(tag as string)) continue
    out.push({
      index: out.length,
      tag: tag as string,
      attrs: attrs as string,
      groupAttrs: [...groups],
      outline: outlineOf(tag as string, attrs as string),
    })
  }
  return out
}

type Part = 'plan' | 'actual' | 'dummies'

// WHY: no spec row names the element that carries a figure or a layer, so the renderer's data-figure
// WHY: mark (task-<uid>-<part>, on the shape or a group round it) is the only handle, as for CR-588.
const figureOf = (elements: readonly Element[], uid: number, part: Part): readonly Element[] => {
  const mark = new RegExp(`data-figure="task-${uid}-${part}(?:-[^"]*)?"`)
  const found = elements.filter((one) => mark.test(one.attrs) || one.groupAttrs.some((group) => mark.test(group)))
  if (found.length === 0) throw new Error(`premise: the picture draws no ${part} for task ${uid}`)
  return found
}

interface Stage {
  readonly glyph: string
  readonly elements: readonly Element[]
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly startX: (n: number) => number
  readonly planMiddleY: (uid: number) => number
  readonly planSide: (uid: number) => number
}

const stageOf = (glyph: string, fillColor: string | null = null): Stage => {
  const tasks = [
    taskOf({
      uid: STARTED_UID,
      start: day(PLAN_DAY),
      finish: day(PLAN_DAY),
      milestone: true,
      actualStart: day(ACTUAL_DAY),
      stop: day(ACTUAL_DAY),
    }),
    taskOf({ uid: UNSTARTED_UID, start: day(UNSTARTED_DAY), finish: day(UNSTARTED_DAY), milestone: true }),
  ]
  const base = scheduleOf({ tasks, shapeKind: 'milestone' }) as unknown as Record<string, unknown>
  const schedule = {
    ...base,
    taskVisuals: (base['taskVisuals'] as Record<string, unknown>[]).map((one) => ({
      ...one,
      milestoneGlyph: glyph,
      fillColor,
    })),
  } as unknown as Schedule
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
  } as unknown as DocumentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen', {
    themePreference: 'light',
    guideCursorMode: 'none',
  } as never)
  const placed = (uid: number): { y: number; planHeight: number } => {
    const found = taskPlacement(layout, uid) as unknown as { y: number; planHeight: number } | null
    if (found === null) throw new Error(`premise: task ${uid} was not placed`)
    return found
  }
  return {
    glyph,
    elements: elementsOf(svg),
    geometry,
    startX: (n) => xFromDay(layout, calendarDay(n) as never),
    planMiddleY: (uid) => placed(uid).y + placed(uid).planHeight / 2,
    planSide: (uid) => placed(uid).planHeight,
  }
}

const stages = new Map<string, Stage>()
const stageFor = (glyph: string): Stage => {
  const held = stages.get(glyph)
  if (held !== undefined) return held
  const made = stageOf(glyph)
  stages.set(glyph, made)
  return made
}

interface Place {
  readonly centre: Pt
  readonly half: number
}

// see F-044, LF-10
const mapped = (p: Pt, place: Place): Pt => ({ x: place.centre.x + p.x * place.half, y: place.centre.y + p.y * place.half })

const planPlace = (stage: Stage): Place => ({
  centre: { x: stage.startX(PLAN_DAY), y: stage.planMiddleY(STARTED_UID) },
  half: stage.planSide(STARTED_UID) / 2,
})
const actualPlace = (stage: Stage): Place => ({
  centre: { x: stage.startX(ACTUAL_DAY), y: stage.planMiddleY(STARTED_UID) },
  half: (stage.planSide(STARTED_UID) / 2) * S_5,
})
// see DM-12
const dummyPlace = (stage: Stage): Place => ({
  centre: { x: stage.startX(UNSTARTED_DAY), y: stage.planMiddleY(UNSTARTED_UID) },
  half: (stage.planSide(UNSTARTED_UID) / 2) * S_5,
})

interface Seen {
  readonly part: Part
  readonly uid: number
  readonly place: (stage: Stage) => Place
}

const SEEN: readonly Seen[] = [
  { part: 'plan', uid: STARTED_UID, place: planPlace },
  { part: 'actual', uid: STARTED_UID, place: actualPlace },
  { part: 'dummies', uid: UNSTARTED_UID, place: dummyPlace },
]

const carriers = (figure: readonly Element[], p: Pt): readonly Element[] =>
  figure.filter((one) => distanceTo(one.outline, p) <= EPS)

const isOnABody = (glyph: string, p: Pt): boolean =>
  layersOf(glyph, 'body').some((one) => distanceTo(one.outline, p) <= 1e-6)

// WHY: an arc's end points sit on the body it spans, so the middle of each run is probed as well.
const probesOf = (layer: Layer): readonly Pt[] => [
  ...layer.outline.anchors,
  ...layer.outline.runs.map((run) => run[Math.floor(run.length / 2)] as Pt),
]

// WHY: a figure's fill and edge are read off the filled element that carries F-044's first body point.
const bodyOf = (figure: readonly Element[], glyph: string, place: Place): Element => {
  const first = (layersOf(glyph, 'body')[0] as Layer).outline.anchors[0] as Pt
  const found = carriers(figure, mapped(first, place)).find(isFilled)
  if (found === undefined) throw new Error(`premise: no filled element carries the ${glyph} body`)
  return found
}

// see LF-18
const expectedInk = (stage: Stage, part: Part): string => {
  const planBody = bodyOf(figureOf(stage.elements, STARTED_UID, 'plan'), stage.glyph, planPlace(stage))
  return part === 'plan' ? colour(paintOf(planBody, 'stroke')) : colour(paintOf(planBody, 'fill'))
}

const expectFigureAt = (figure: readonly Element[], glyph: string, place: Place, what: string): void => {
  const unit = unitExtentOf(glyph)
  const drawn = extentOf(figure.map((one) => one.outline))
  const middle = middleOf(drawn)
  expect(Math.abs(middle.y - place.centre.y), `${glyph} ${what}: the bounding box's vertical centre`).toBeLessThanOrEqual(EPS)
  expect(Math.abs(middle.x - place.centre.x), `${glyph} ${what}: the bounding box's horizontal centre`).toBeLessThanOrEqual(EPS)
  expect(Math.abs(drawn.right - drawn.left - (unit.right - unit.left) * place.half), `${glyph} ${what}: width`).toBeLessThanOrEqual(EPS)
  expect(Math.abs(drawn.bottom - drawn.top - (unit.bottom - unit.top) * place.half), `${glyph} ${what}: height`).toBeLessThanOrEqual(EPS)
}

const expectF044Points = (figure: readonly Element[], glyph: string, place: Place, what: string): void => {
  for (const layer of shapeOf(glyph).layers) {
    for (const anchor of layer.outline.anchors) {
      const at = mapped(anchor, place)
      const nearest = Math.min(...figure.map((one) => distanceTo(one.outline, at)))
      expect(nearest, `${glyph} ${what}: F-044 ${layer.role} point (${anchor.x}, ${anchor.y}) is off the drawing`).toBeLessThanOrEqual(EPS)
    }
  }
}


describe('CR-583 -- the clauses these cases quote still stand', () => {
  it('T-221 LF-10 and LF-18', () => {
    const lf10 = cellText('T-221', 'LF-10')
    for (const clause of [LF_10_PLAN, LF_10_ACTUAL, LF_10_SAME_MIDDLE, LF_10_BOX_CENTRE, LF_10_NOT_THE_CIRCLE]) {
      expect(lf10).toContain(clause)
    }
    const lf18 = cellText('T-221', 'LF-18')
    for (const clause of [LF_18_BODY, LF_18_INNER, LF_18_DOT, LF_18_COLOUR, LF_18_CUSTOM, LF_18_ORDER, LF_18_CURVES, LF_18_F_044]) {
      expect(lf18).toContain(clause)
    }
  })

  it('figure F-044 and its notes', () => {
    for (const clause of [F_044_AUTHORITY, F_044_UNIT, F_044_MAPPED, F_044_ROLES]) expect(DESIGN).toContain(clause)
  })

  it('SH-5, AT-101, DM-4 / DM-8 / DM-9 / DM-12, HT-1, GA-15, S-280, JDG-742', () => {
    expect(REQUIREMENTS).toContain(SH_5_PAIRS)
    expect(ERD_DETAIL).toContain(AT_101_FIFTEEN)
    expect(cellText('T-240', 'DM-4')).toContain(DM_4)
    expect(cellText('T-240', 'DM-8')).toContain(DM_8)
    expect(cellText('T-240', 'DM-9')).toContain(DM_9)
    expect(cellText('T-240', 'DM-12')).toContain(DM_12)
    expect(cellText('T-267', 'HT-1')).toContain(HT_1_ONLY)
    expect(cellText('T-267', 'HT-1')).toContain(HT_1_MILESTONE)
    expect(cellText('T-266', 'GA-15')).toContain(GA_15_BAND)
    expect(cellText('T-206', 'S-280')).toContain(S_280_THE_SQUARE)
    expect(RULINGS).toContain(JDG_742)
  })
})

describe('F-044 / SH-5 / AT-101 -- premises: the figure holds the fifteen shapes of SH-5, each centred', () => {
  it('SH-5 pairs fifteen spellings (AT-101 "列挙（15 値）") and figure F-044 draws exactly those, in that order', () => {
    expect(GLYPHS).toHaveLength(15)
    expect(F_044.map((one) => one.glyph)).toEqual(GLYPHS)
  })

  it.each(GLYPHS)('F-044 %s: "外接枠の中心を原点に置く", inside the unit square', (glyph) => {
    const unit = unitExtentOf(glyph)
    const middle = middleOf(unit)
    expect(Math.abs(middle.x)).toBeLessThanOrEqual(1e-3)
    expect(Math.abs(middle.y)).toBeLessThanOrEqual(1e-3)
    expect(Math.max(-unit.left, unit.right, -unit.top, unit.bottom)).toBeLessThanOrEqual(1 + 1e-3)
  })
})

describe('LF-10 -- the plan figure: side = the plan height, bounding-box centre on start and the plan middle', () => {
  it('premise: the plan height of a milestone is the rectangle height times S-17', () => {
    expect(stageFor('diamond').planSide(STARTED_UID)).toBeCloseTo(H * S_17, 6)
  })

  it.each(GLYPHS)("LF-10 %s plan: F-044's bounding box at the plan side, centred on (start, the plan middle)", (glyph) => {
    const stage = stageFor(glyph)
    expectFigureAt(figureOf(stage.elements, STARTED_UID, 'plan'), glyph, planPlace(stage), 'plan')
  })

  it.each(GLYPHS)('LF-18 "形そのもの…は 図 F-044 が持つ" %s plan: every F-044 point lies on the drawing', (glyph) => {
    const stage = stageFor(glyph)
    expectF044Points(figureOf(stage.elements, STARTED_UID, 'plan'), glyph, planPlace(stage), 'plan')
  })

  it.each(MOVED_GLYPHS)("LF-10 ⛔ %s: its bounding box and the diamond's share one vertical centre", (glyph) => {
    const centreOf = (stage: Stage): number =>
      middleOf(extentOf(figureOf(stage.elements, STARTED_UID, 'plan').map((one) => one.outline))).y
    expect(Math.abs(centreOf(stageFor(glyph)) - centreOf(stageFor('diamond')))).toBeLessThanOrEqual(EPS)
  })
})

describe('LF-10 -- the actual figure: S-5 times the plan, on its own day, the same middle', () => {
  it.each(GLYPHS)('LF-10 %s actual: F-044 at S-5 times the plan side, centred on (actual day, the plan middle)', (glyph) => {
    const stage = stageFor(glyph)
    const figure = figureOf(stage.elements, STARTED_UID, 'actual')
    expectFigureAt(figure, glyph, actualPlace(stage), 'actual')
    expectF044Points(figure, glyph, actualPlace(stage), 'actual')
  })
})

describe("DM-4 / DM-8 / DM-9 / DM-12 -- the dummy has the actual's figure, on the plan's day", () => {
  it.each(GLYPHS)("DM-4 %s dummy: the actual's figure (F-044 at S-5), centred where the plan stands", (glyph) => {
    const stage = stageFor(glyph)
    const figure = figureOf(stage.elements, UNSTARTED_UID, 'dummies')
    expectFigureAt(figure, glyph, dummyPlace(stage), 'dummy')
    expectF044Points(figure, glyph, dummyPlace(stage), 'dummy')
  })
})

describe('LF-18 -- the inner lines are lines over the fill, not holes in it', () => {
  it('premise: F-044 gives box, floppyDisk, cylinder, smile and beerMug inner lines', () => {
    expect(INNER_GLYPHS).toEqual(['box', 'floppyDisk', 'cylinder', 'smile', 'beerMug'])
  })

  for (const seen of SEEN) {
    it.each(INNER_GLYPHS)(`LF-18 %s ${seen.part}: each F-044 inner line is an unfilled stroke on the figure`, (glyph) => {
      const stage = stageFor(glyph)
      const figure = figureOf(stage.elements, seen.uid, seen.part)
      const place = seen.place(stage)
      for (const layer of layersOf(glyph, 'inner')) {
        for (const anchor of probesOf(layer)) {
          const lines = carriers(figure, mapped(anchor, place)).filter(isLine)
          expect(lines.length, `${glyph} ${seen.part}: no unfilled stroke passes F-044 inner point (${anchor.x}, ${anchor.y})`).toBeGreaterThan(0)
        }
      }
    })

    it.each(INNER_GLYPHS)(`LF-18 "塗りに穴を開けずに" %s ${seen.part}: no filled outline runs through an inner line's inside point`, (glyph) => {
      const stage = stageFor(glyph)
      const figure = figureOf(stage.elements, seen.uid, seen.part)
      const place = seen.place(stage)
      const inside = layersOf(glyph, 'inner').flatMap(probesOf).filter((p) => !isOnABody(glyph, p))
      expect(inside.length, 'premise: the inner lines have a point inside the body').toBeGreaterThan(0)
      for (const p of inside) {
        const filled = carriers(figure, mapped(p, place)).filter(isFilled)
        expect(filled.length, `${glyph} ${seen.part}: a filled outline passes (${p.x}, ${p.y}) -- a hole`).toBe(0)
      }
    })
  }
})

describe('LF-18 -- the colour of the inner lines and dots', () => {
  it('premise: the plan fill, the plan edge and the actual fill are three different colours', () => {
    const stage = stageFor('box')
    const planBody = bodyOf(figureOf(stage.elements, STARTED_UID, 'plan'), 'box', planPlace(stage))
    const actualBody = bodyOf(figureOf(stage.elements, STARTED_UID, 'actual'), 'box', actualPlace(stage))
    const inks = new Set([
      colour(paintOf(planBody, 'fill')),
      colour(paintOf(planBody, 'stroke')),
      colour(paintOf(actualBody, 'fill')),
    ])
    expect(inks.size).toBe(3)
  })

  for (const seen of SEEN) {
    const ink = seen.part === 'plan' ? 'the plan edge colour' : 'the plan fill colour'

    it.each(INNER_GLYPHS)(`LF-18 %s ${seen.part}: the inner lines are ${ink}`, (glyph) => {
      const stage = stageFor(glyph)
      const figure = figureOf(stage.elements, seen.uid, seen.part)
      const place = seen.place(stage)
      const want = expectedInk(stage, seen.part)
      for (const layer of layersOf(glyph, 'inner')) {
        for (const anchor of probesOf(layer)) {
          const lines = carriers(figure, mapped(anchor, place)).filter(isLine)
          expect(lines.map((one) => colour(paintOf(one, 'stroke'))), `${glyph} ${seen.part} at (${anchor.x}, ${anchor.y})`).toContain(want)
        }
      }
    })

    it.each(DOT_GLYPHS)(`LF-18 "顔の目は点で塗る" %s ${seen.part}: each eye is a filled dot in ${ink}`, (glyph) => {
      const stage = stageFor(glyph)
      const figure = figureOf(stage.elements, seen.uid, seen.part)
      const place = seen.place(stage)
      const want = expectedInk(stage, seen.part)
      for (const layer of layersOf(glyph, 'dot')) {
        const unit = extentOf([layer.outline])
        const wanted: Extent = {
          left: place.centre.x + unit.left * place.half,
          right: place.centre.x + unit.right * place.half,
          top: place.centre.y + unit.top * place.half,
          bottom: place.centre.y + unit.bottom * place.half,
        }
        // WHY: LF-18 does not say one element per dot, so a dot is any sub-path of a filled element.
        const dots = figure.filter((one) =>
          isFilled(one) &&
          one.outline.runs.some((run) => {
            const drawn = extentOf([{ runs: [run], anchors: [], curved: false }])
            return (
              Math.abs(drawn.left - wanted.left) <= EPS &&
              Math.abs(drawn.right - wanted.right) <= EPS &&
              Math.abs(drawn.top - wanted.top) <= EPS &&
              Math.abs(drawn.bottom - wanted.bottom) <= EPS
            )
          }),
        )
        expect(dots.length, `${glyph} ${seen.part}: no filled dot where F-044 puts one`).toBeGreaterThan(0)
        expect(dots.map((one) => colour(paintOf(one, 'fill')))).toContain(want)
      }
    })
  }

  it("LF-18 \"カスタムカラーのタスクでは、そのタスクの予定の塗りの色\" -- a custom fill: the actual's and dummy's box edges take it", () => {
    const custom = stageOf('box', '#c0504d/')
    const want = colour(paintOf(bodyOf(figureOf(custom.elements, STARTED_UID, 'plan'), 'box', planPlace(custom)), 'fill'))
    const themed = stageFor('box')
    const themedFill = colour(paintOf(bodyOf(figureOf(themed.elements, STARTED_UID, 'plan'), 'box', planPlace(themed)), 'fill'))
    expect(want, 'premise: the custom fill changes the plan fill').not.toBe(themedFill)
    for (const seen of SEEN.filter((one) => one.part !== 'plan')) {
      const figure = figureOf(custom.elements, seen.uid, seen.part)
      const place = seen.place(custom)
      for (const anchor of probesOf(layersOf('box', 'inner')[0] as Layer)) {
        const lines = carriers(figure, mapped(anchor, place)).filter(isLine)
        expect(lines.map((one) => colour(paintOf(one, 'stroke'))), `${seen.part} at (${anchor.x}, ${anchor.y})`).toContain(want)
      }
    }
  })
})

describe('LF-18 "外形は塗り、縁の線で囲む" -- the body is filled and edged', () => {
  for (const seen of SEEN) {
    it.each(GLYPHS)(`LF-18 %s ${seen.part}: the element carrying F-044's first body point is filled and stroked`, (glyph) => {
      const stage = stageFor(glyph)
      const body = bodyOf(figureOf(stage.elements, seen.uid, seen.part), glyph, seen.place(stage))
      expect(isStroked(body)).toBe(true)
    })
  }
})

describe('LF-18 -- the circle, the face, the cylinder, the person and the mug are curves', () => {
  for (const seen of SEEN) {
    it.each(CURVED_GLYPHS)(`LF-18 "多角形で近似しない" %s ${seen.part}: each curved F-044 body is drawn with a curve`, (glyph) => {
      const stage = stageFor(glyph)
      const figure = figureOf(stage.elements, seen.uid, seen.part)
      const place = seen.place(stage)
      const curvedBodies = layersOf(glyph, 'body').filter((one) => one.outline.curved)
      expect(curvedBodies.length, 'premise: F-044 draws this glyph with a curved body').toBeGreaterThan(0)
      for (const layer of curvedBodies) {
        const on = figure.filter((one) => layer.outline.anchors.every((p) => distanceTo(one.outline, mapped(p, place)) <= EPS))
        expect(on.length, `${glyph} ${seen.part}: no single element carries the curved body`).toBeGreaterThan(0)
        expect(on.some((one) => one.outline.curved), `${glyph} ${seen.part}: the curved body is a polygon`).toBe(true)
      }
    })
  }
})

describe('LF-18 "奥から順に描く" -- the head over the torso, the mug over its handle', () => {
  // WHY: F-044 lists the back body first -- the torso before the head, the handle before the mug.
  const TWO_BODIES = ['person', 'beerMug'] as const

  it('premise: F-044 gives person and beerMug two bodies each', () => {
    for (const glyph of TWO_BODIES) expect(layersOf(glyph, 'body')).toHaveLength(2)
  })

  for (const seen of SEEN) {
    it.each(TWO_BODIES)(`LF-18 %s ${seen.part}: the front body is drawn after the back one`, (glyph) => {
      const stage = stageFor(glyph)
      const figure = figureOf(stage.elements, seen.uid, seen.part)
      const place = seen.place(stage)
      const carrierOf = (layer: Layer): Element => {
        const found = figure.find(
          (one) => isFilled(one) && layer.outline.anchors.every((p) => distanceTo(one.outline, mapped(p, place)) <= EPS),
        )
        if (found === undefined) throw new Error(`${glyph} ${seen.part}: no filled element carries a whole body layer`)
        return found
      }
      const [back, front] = layersOf(glyph, 'body') as [Layer, Layer]
      expect(carrierOf(front).index).toBeGreaterThan(carrierOf(back).index)
    })
  }
})

describe("JDG-742 -- the floppy disk's windows are lines, and the outline is unchanged", () => {
  it.each(SEEN.map((one) => one.part))('JDG-742 floppyDisk %s: each window corner is on an unfilled stroke, no filled outline cuts it', (part) => {
    const seen = SEEN.find((one) => one.part === part) as Seen
    const stage = stageFor('floppyDisk')
    const figure = figureOf(stage.elements, seen.uid, seen.part)
    const place = seen.place(stage)
    const windows = layersOf('floppyDisk', 'inner')
    expect(windows.length, 'premise: F-044 gives the floppy two windows').toBe(2)
    for (const corner of windows.flatMap((one) => one.outline.anchors)) {
      const at = mapped(corner, place)
      expect(carriers(figure, at).some(isLine), `window corner (${corner.x}, ${corner.y})`).toBe(true)
      if (!isOnABody('floppyDisk', corner)) {
        expect(carriers(figure, at).filter(isFilled), `a filled outline cuts the window at (${corner.x}, ${corner.y})`).toHaveLength(0)
      }
    }
    expectFigureAt(figure, 'floppyDisk', place, part)
  })
})

describe('HT-1 / GA-15 -- the hit test reads the drawn outline of a moved triangle', () => {
  const hitOf = (glyph: string, dy: number): ReturnType<typeof itemAtPointer> => {
    const stage = stageFor(glyph)
    const place = planPlace(stage)
    return itemAtPointer(stage.geometry, place.centre.x, place.centre.y + dy * place.half, grabSizesOf())
  }

  // WHY: 0.65 of a half side is inside the redrawn triangle and past the old one's base (0.5).
  it.each([
    ['triangleUp', 0.65],
    ['triangleDown', -0.65],
  ] as const)('HT-1 %s: a point on the drawn figure beyond its old place answers the milestone plan (GA-15)', (glyph, dy) => {
    const hit = hitOf(glyph, dy)
    expect(hit?.item).toEqual({ kind: 'task', taskUid: STARTED_UID })
    expect(hit?.grab).toBe('GA-15')
  })

  // WHY: 0.9 of a half side is where the old apex stood and outside the redrawn figure's band (0.75).
  it.each([
    ['triangleUp', -0.9],
    ['triangleDown', 0.9],
  ] as const)('GA-15 "菱形の帯" %s: a point just outside the drawn figure, where the old apex stood, is not the milestone', (glyph, dy) => {
    const hit = hitOf(glyph, dy)
    const isTheMilestone = hit !== null && hit.item.kind === 'task' && hit.item.taskUid === STARTED_UID
    expect(isTheMilestone).toBe(false)
  })
})
