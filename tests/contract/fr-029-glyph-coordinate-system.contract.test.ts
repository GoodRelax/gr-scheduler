// Contract tests: every shape of F-019 is drawn in one coordinate system, packed to its ink.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { NOT_STORED_ICON_SIZES } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { specTable } from './spec-table'

const REQUIREMENTS = join(process.cwd(), 'docs', 'spec', '01-04-requirements.md')
const GLOSSARY = join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md')
const FIGURE = join(process.cwd(), 'docs', 'spec', '_assets', 'fig-icons.svg')
const CARRIED = join(process.cwd(), 'src', 'framework', 'dom-screen-surface', 'icon-glyphs.json')

interface GlyphElement {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

interface Glyph {
  readonly specTableRowId: string
  readonly elements: readonly GlyphElement[]
}

const CARRIED_FIGURE = JSON.parse(readFileSync(CARRIED, 'utf8')) as {
  readonly viewBox: string
  readonly glyphs: readonly Glyph[]
}

// Why: the frame is measured from the shapes here, not taken from the generator,
// which derives it from label positions and so would agree by construction.
interface Point {
  readonly x: number
  readonly y: number
}

interface Frame {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

// Why: at this many steps an arc misses its extreme by under 1e-4 for the figure's
// radii, two orders below PACKED_TO.
const CURVE_STEPS = 720

// Why: not a loosening of the MUST: one unit is about half a CSS pixel, so this
// tolerance is far below anything a reader can see.
const PACKED_TO = 0.01

const PATH_TOKEN = /[A-Za-z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g

const ATTRIBUTE_STYLE = 'style'

function attributeOf(element: GlyphElement, name: string): string | undefined {
  return element.attributes.find((one) => one.name === name)?.value
}

function numberAttribute(element: GlyphElement, name: string, where: string): number {
  const held = attributeOf(element, name)
  if (held === undefined) throw new Error(`${where}: a <${element.tag}> states no ${name}`)
  const value = Number(held)
  if (!Number.isFinite(value)) throw new Error(`${where}: ${name}="${held}" is not a number`)
  return value
}

// Why: half the stroke width bounds the ink only with round caps and joins, so
// they are asserted; another cap would demand a frame larger than the ink.
function inkReach(element: GlyphElement, where: string): number {
  const style = attributeOf(element, ATTRIBUTE_STYLE) ?? ''
  const stroke = /(?:^|;)\s*stroke\s*:\s*([^;]+)/.exec(style)
  if (stroke === null) return 0
  if ((stroke[1] ?? '').trim() === 'none') return 0
  const width = /(?:^|;)\s*stroke-width\s*:\s*([\d.]+)/.exec(style)
  if (width === null) {
    throw new Error(`${where}: a <${element.tag}> is stroked but states no stroke-width`)
  }
  if (!/stroke-linecap\s*:\s*round/.test(style) || !/stroke-linejoin\s*:\s*round/.test(style)) {
    throw new Error(
      `${where}: a <${element.tag}> is stroked with a cap or a join this measurement does not ` +
        'know how to bound -- teach it before trusting the answer',
    )
  }
  return Number(width[1]) / 2
}

function onEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  cos: number,
  sin: number,
  t: number,
): Point {
  return {
    x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
    y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos,
  }
}

// Why: arcs are not skipped: the rounded corners are where shapes reach furthest,
// and a chord would call a slack coordinate system packed.
function flattenArc(
  from: Point,
  rx: number,
  ry: number,
  degrees: number,
  largeArc: boolean,
  sweep: boolean,
  to: Point,
): readonly Point[] {
  if (rx === 0 || ry === 0) return [to]
  const phi = (degrees * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const halfX = (from.x - to.x) / 2
  const halfY = (from.y - to.y) / 2
  const x1 = cos * halfX + sin * halfY
  const y1 = -sin * halfX + cos * halfY
  let a = Math.abs(rx)
  let b = Math.abs(ry)
  const overshoot = (x1 * x1) / (a * a) + (y1 * y1) / (b * b)
  if (overshoot > 1) {
    const grow = Math.sqrt(overshoot)
    a *= grow
    b *= grow
  }
  const numerator = a * a * b * b - a * a * y1 * y1 - b * b * x1 * x1
  const denominator = a * a * y1 * y1 + b * b * x1 * x1
  const scale = Math.sqrt(Math.max(0, numerator / denominator)) * (largeArc === sweep ? -1 : 1)
  const cx1 = (scale * a * y1) / b
  const cy1 = (-scale * b * x1) / a
  const cx = cos * cx1 - sin * cy1 + (from.x + to.x) / 2
  const cy = sin * cx1 + cos * cy1 + (from.y + to.y) / 2
  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy
    const size = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy)
    const found = Math.acos(Math.min(1, Math.max(-1, dot / size)))
    return ux * vy - uy * vx < 0 ? -found : found
  }
  const startX = (x1 - cx1) / a
  const startY = (y1 - cy1) / b
  const start = angle(1, 0, startX, startY)
  let sweptBy = angle(startX, startY, (-x1 - cx1) / a, (-y1 - cy1) / b)
  if (!sweep && sweptBy > 0) sweptBy -= 2 * Math.PI
  if (sweep && sweptBy < 0) sweptBy += 2 * Math.PI
  const steps = Math.max(2, Math.ceil((CURVE_STEPS * Math.abs(sweptBy)) / (2 * Math.PI)))
  const points: Point[] = []
  for (let step = 1; step <= steps; step += 1) {
    points.push(onEllipse(cx, cy, a, b, cos, sin, start + (sweptBy * step) / steps))
  }
  return points
}

function flattenBezier(of: readonly Point[]): readonly Point[] {
  const points: Point[] = []
  const steps = Math.ceil(CURVE_STEPS / 4)
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps
    let held = of
    while (held.length > 1) {
      const next: Point[] = []
      for (let at = 0; at + 1 < held.length; at += 1) {
        const one = held[at]
        const two = held[at + 1]
        if (one === undefined || two === undefined) break
        next.push({ x: one.x + (two.x - one.x) * t, y: one.y + (two.y - one.y) * t })
      }
      held = next
    }
    const only = held[0]
    if (only !== undefined) points.push(only)
  }
  return points
}

// Why: an unknown command stops the case, since skipping it would quietly shrink
// the measured frame.
function flattenPath(d: string, where: string): readonly Point[] {
  const tokens = d.match(PATH_TOKEN) ?? []
  const points: Point[] = []
  let at = 0
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let command = ''

  const number = (): number => {
    const token = tokens[at]
    if (token === undefined || /^[A-Za-z]$/.test(token)) {
      throw new Error(`${where}: the path ends in the middle of a "${command}"`)
    }
    at += 1
    return Number(token)
  }
  // Why: SVG allows flags without separators, which a number tokenizer cannot tell
  // apart; F-019 spaces every flag today, so this stops rather than guesses.
  const flag = (): boolean => {
    const token = tokens[at]
    if (token !== '0' && token !== '1') {
      throw new Error(
        `${where}: an arc flag reads "${String(token)}" -- 図 F-019 now writes its arc flags ` +
          'without separators, which this measurement cannot read',
      )
    }
    at += 1
    return token === '1'
  }
  const relative = (): boolean => command === command.toLowerCase()
  const move = (toX: number, toY: number): void => {
    x = relative() ? x + toX : toX
    y = relative() ? y + toY : toY
    points.push({ x, y })
  }

  while (at < tokens.length) {
    const token = tokens[at]
    if (token === undefined) break
    if (/^[A-Za-z]$/.test(token)) {
      command = token
      at += 1
      if (command === 'Z' || command === 'z') {
        x = startX
        y = startY
        points.push({ x, y })
        continue
      }
    }
    switch (command) {
      case 'M':
      case 'm': {
        move(number(), number())
        startX = x
        startY = y
        // Why: SVG reads the pairs after a moveto as linetos.
        command = command === 'M' ? 'L' : 'l'
        break
      }
      case 'L':
      case 'l': {
        move(number(), number())
        break
      }
      case 'H':
      case 'h': {
        const toX = number()
        x = relative() ? x + toX : toX
        points.push({ x, y })
        break
      }
      case 'V':
      case 'v': {
        const toY = number()
        y = relative() ? y + toY : toY
        points.push({ x, y })
        break
      }
      case 'Q':
      case 'q':
      case 'C':
      case 'c': {
        const from: Point = { x, y }
        const controls: Point[] = [from]
        const count = command === 'Q' || command === 'q' ? 2 : 3
        for (let one = 0; one < count; one += 1) {
          const toX = number()
          const toY = number()
          controls.push(relative() ? { x: x + toX, y: y + toY } : { x: toX, y: toY })
        }
        points.push(...flattenBezier(controls))
        const last = controls[controls.length - 1]
        if (last === undefined) throw new Error(`${where}: a curve with no end`)
        x = last.x
        y = last.y
        break
      }
      case 'A':
      case 'a': {
        const from: Point = { x, y }
        const rx = number()
        const ry = number()
        const degrees = number()
        const largeArc = flag()
        const sweep = flag()
        const toX = number()
        const toY = number()
        const to: Point = relative() ? { x: x + toX, y: y + toY } : { x: toX, y: toY }
        points.push(...flattenArc(from, rx, ry, degrees, largeArc, sweep, to))
        x = to.x
        y = to.y
        break
      }
      default:
        throw new Error(
          `${where}: 図 F-019 now draws with "${command}", which this measurement does not ` +
            'flatten -- teach it before trusting the answer',
        )
    }
  }
  return points
}

// Why: an unknown tag stops the case; all seven kinds the generator carries are
// handled though F-019 draws four of them today.
function pointsOf(element: GlyphElement, where: string): readonly Point[] {
  // Why: a transform would make every number below wrong in silence, so it stops
  // the measurement instead.
  if (attributeOf(element, 'transform') !== undefined) {
    throw new Error(
      `${where}: a <${element.tag}> carries a transform, which this measurement does not apply`,
    )
  }
  const number = (name: string): number => numberAttribute(element, name, where)
  switch (element.tag) {
    case 'path': {
      const d = attributeOf(element, 'd')
      if (d === undefined) throw new Error(`${where}: a <path> states no d`)
      return flattenPath(d, where)
    }
    case 'rect': {
      const x = number('x')
      const y = number('y')
      // Why: rx rounds the corners inwards, so it cannot move a side and is not read.
      return [
        { x, y },
        { x: x + number('width'), y: y + number('height') },
      ]
    }
    case 'circle': {
      const cx = number('cx')
      const cy = number('cy')
      const r = number('r')
      return [
        { x: cx - r, y: cy - r },
        { x: cx + r, y: cy + r },
      ]
    }
    case 'ellipse': {
      const cx = number('cx')
      const cy = number('cy')
      const rx = number('rx')
      const ry = number('ry')
      return [
        { x: cx - rx, y: cy - ry },
        { x: cx + rx, y: cy + ry },
      ]
    }
    case 'line':
      return [
        { x: number('x1'), y: number('y1') },
        { x: number('x2'), y: number('y2') },
      ]
    case 'polyline':
    case 'polygon': {
      const numbers = (attributeOf(element, 'points') ?? '').match(/-?\d*\.?\d+/g) ?? []
      const points: Point[] = []
      for (let at = 0; at + 1 < numbers.length; at += 2) {
        points.push({ x: Number(numbers[at]), y: Number(numbers[at + 1]) })
      }
      if (points.length === 0) throw new Error(`${where}: a <${element.tag}> states no points`)
      return points
    }
    default:
      throw new Error(
        `${where}: 図 F-019 now draws with <${element.tag}>, which this measurement does not ` +
          'know how to bound -- teach it before trusting the answer',
      )
  }
}

function inkFrameOf(glyph: Glyph): Frame {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const element of glyph.elements) {
    const where = glyph.specTableRowId
    const reach = inkReach(element, where)
    for (const point of pointsOf(element, where)) {
      minX = Math.min(minX, point.x - reach)
      minY = Math.min(minY, point.y - reach)
      maxX = Math.max(maxX, point.x + reach)
      maxY = Math.max(maxY, point.y + reach)
    }
  }
  if (!Number.isFinite(minX)) throw new Error(`${glyph.specTableRowId}: no shape to measure`)
  return { minX, minY, maxX, maxY }
}

const INK_BY_ROW = new Map(
  CARRIED_FIGURE.glyphs.map((one): [string, Frame] => [one.specTableRowId, inkFrameOf(one)]),
)

const INK: Frame = [...INK_BY_ROW.values()].reduce((held, one) => ({
  minX: Math.min(held.minX, one.minX),
  minY: Math.min(held.minY, one.minY),
  maxX: Math.max(held.maxX, one.maxX),
  maxY: Math.max(held.maxY, one.maxY),
}))

function rowsAt(edge: keyof Frame): readonly string[] {
  const best = INK[edge]
  return [...INK_BY_ROW.entries()]
    .filter(([, frame]) => Math.abs(frame[edge] - best) <= PACKED_TO)
    .map(([row]) => row)
}

function statedFrame(viewBox: string): Frame {
  const numbers = viewBox.trim().split(/[\s,]+/).map(Number)
  if (numbers.length !== 4 || numbers.some((one) => !Number.isFinite(one))) {
    throw new Error(`the coordinate system is not four numbers: ${JSON.stringify(viewBox)}`)
  }
  const [minX = 0, minY = 0, width = 0, height = 0] = numbers
  return { minX, minY, maxX: minX + width, maxY: minY + height }
}

const STATED = statedFrame(CARRIED_FIGURE.viewBox)

const SLACK = {
  left: INK.minX - STATED.minX,
  top: INK.minY - STATED.minY,
  right: STATED.maxX - INK.maxX,
  bottom: STATED.maxY - INK.maxY,
} as const

const rounded = (one: number): string => one.toFixed(2)

const MEASURED =
  `viewBox "${CARRIED_FIGURE.viewBox}" vs the ink of ${CARRIED_FIGURE.glyphs.length} shape(s), ` +
  `x ${rounded(INK.minX)}..${rounded(INK.maxX)} y ${rounded(INK.minY)}..${rounded(INK.maxY)}`

const FR_029_PACKED = '図 F-019 は、座標系を図形の外接する枠へ詰めること。'
// Spec: IMPS-1107
const FR_029_ONE_SYSTEM = '図 F-019 は、図形ごとに別々の座標系を与えないこと。'
const FR_029_SLACK_COSTS = '座標系に余白があると、箱を大きくしても見える図形は大きくならない'
const FR_029_THE_BOX = '`GRS` は、図形を描く箱の一辺を `_assets/tbl-settings.md` の 表 T-206 の `S-138` に従わせること。'

const GLOSSARY_EVERY_TASK_GROUP_HAS_ONE = '図形を持たない行は無い'

// Spec: FR-029, F-019, T-109
describe('FR-029 (MUST NOT): every shape is drawn in ONE coordinate system', () => {
  it('図 F-019 reaches src/ as one coordinate system, stated once', () => {
    expect(typeof CARRIED_FIGURE.viewBox, 'the shapes carry no coordinate system').toBe('string')
    expect(() => statedFrame(CARRIED_FIGURE.viewBox)).not.toThrow()
    expect(STATED.maxX - STATED.minX, 'the coordinate system has no width').toBeGreaterThan(0)
    expect(STATED.maxY - STATED.minY, 'the coordinate system has no height').toBeGreaterThan(0)
  })

  it('no glyph, and no element of a glyph, carries a coordinate system of its own', () => {
    // Why: a transform counts as well as a viewBox, since it too gives a shape a
    // system of its own, and pointsOf refuses to apply one.
    const ownSystems: string[] = []
    for (const glyph of CARRIED_FIGURE.glyphs) {
      for (const element of glyph.elements) {
        for (const attribute of element.attributes) {
          if (attribute.name === 'viewBox' || attribute.name === 'transform') {
            ownSystems.push(`${glyph.specTableRowId} <${element.tag} ${attribute.name}>`)
          }
        }
      }
      const held = glyph as unknown as Record<string, unknown>
      if (held['viewBox'] !== undefined) ownSystems.push(`${glyph.specTableRowId} viewBox`)
    }
    expect(ownSystems, `${ownSystems.length} shape(s) carry a coordinate system of their own`)
      .toEqual([])
  })

  it('図 F-019 itself declares one coordinate system and no glyph group holds another', () => {
    const figure = readFileSync(FIGURE, 'utf8')
    expect((figure.match(/\bviewBox\s*=/g) ?? []).length, '図 F-019 states more than one viewBox')
      .toBe(1)
    const groups = figure.match(/<g\b[^>]*>/g) ?? []
    expect(groups.length, '図 F-019 draws no glyph group').toBeGreaterThan(0)
    expect(groups.filter((one) => /viewBox/.test(one)), 'a glyph group carries its own viewBox')
      .toEqual([])
  })

  it('表 T-109 and 図 F-019 hold the same 74 rows, so the one system covers them all', () => {
    const roster = specTable('T-109').rows.map((one) => one.id)
    const drawn = CARRIED_FIGURE.glyphs.map((one) => one.specTableRowId)
    expect(roster.length, '表 T-109 lost its rows').toBeGreaterThan(0)
    expect(
      roster.filter((one) => !drawn.includes(one)),
      '表 T-109 holds a row 図 F-019 draws no shape for',
    ).toEqual([])
    expect(
      drawn.filter((one) => !roster.includes(one)),
      '図 F-019 draws a shape for a row 表 T-109 does not hold',
    ).toEqual([])
    expect(drawn.length).toBe(roster.length)
  })
})

// Spec: FR-029, F-019, S-138
describe('FR-029 (MUST): the coordinate system is packed to the shapes it holds', () => {
  it('every stroked shape is drawn with round caps and joins', () => {
    // Why: not a spec rule: asserted so a change to the figure's stylesheet shows up
    // as itself rather than as a frame that is quietly too large.
    const unmeasurable: string[] = []
    for (const glyph of CARRIED_FIGURE.glyphs) {
      for (const element of glyph.elements) {
        const style = attributeOf(element, ATTRIBUTE_STYLE) ?? ''
        const stroke = /(?:^|;)\s*stroke\s*:\s*([^;]+)/.exec(style)
        if (stroke === null || (stroke[1] ?? '').trim() === 'none') continue
        const hasRoundCap = /stroke-linecap\s*:\s*round/.test(style)
        const hasRoundJoin = /stroke-linejoin\s*:\s*round/.test(style)
        if (!hasRoundCap || !hasRoundJoin || !/stroke-width\s*:\s*[\d.]/.test(style)) {
          unmeasurable.push(`${glyph.specTableRowId} <${element.tag}>`)
        }
      }
    }
    expect(
      unmeasurable,
      `${unmeasurable.length} stroked shape(s) this measurement cannot bound exactly`,
    ).toEqual([])
  })

  it('no shape reaches outside the coordinate system', () => {
    const outside = [...INK_BY_ROW.entries()]
      .filter(
        ([, frame]) =>
          frame.minX < STATED.minX - PACKED_TO ||
          frame.minY < STATED.minY - PACKED_TO ||
          frame.maxX > STATED.maxX + PACKED_TO ||
          frame.maxY > STATED.maxY + PACKED_TO,
      )
      .map(([row]) => row)
    expect(outside, `${outside.length} shape(s) stand outside the coordinate system: ${MEASURED}`)
      .toEqual([])
  })

  it('⛔ the coordinate system carries no slack on any of its four sides', () => {
    // Why: the rows at each side are named in the message, so a failure says which
    // side was left open and which shape came closest.
    const report = (
      [
        ['left', SLACK.left, rowsAt('minX')],
        ['top', SLACK.top, rowsAt('minY')],
        ['right', SLACK.right, rowsAt('maxX')],
        ['bottom', SLACK.bottom, rowsAt('maxY')],
      ] as const
    )
      .map(([side, gap, rows]) => `${side} ${rounded(gap)} (nearest ${rows.join(', ')})`)
      .join('; ')
    const message = `the coordinate system is not packed to the shapes -- ${MEASURED}; ${report}`
    expect(SLACK.left, message).toBeLessThanOrEqual(PACKED_TO)
    expect(SLACK.top, message).toBeLessThanOrEqual(PACKED_TO)
    expect(SLACK.right, message).toBeLessThanOrEqual(PACKED_TO)
    expect(SLACK.bottom, message).toBeLessThanOrEqual(PACKED_TO)
  })

  it('⛔ the coordinate system IS the bounding frame of the shapes, to the number', () => {
    // Why: arithmetic on the case above, asserted again so the frame reads as a frame.
    expect(STATED.minX, MEASURED).toBeCloseTo(INK.minX, 2)
    expect(STATED.minY, MEASURED).toBeCloseTo(INK.minY, 2)
    expect(STATED.maxX, MEASURED).toBeCloseTo(INK.maxX, 2)
    expect(STATED.maxY, MEASURED).toBeCloseTo(INK.maxY, 2)
  })
})

// Spec: FR-029, S-138, S-141
describe('the manuscript still says what these cases copy', () => {
  it('FR-029 still holds both rules about 図 F-019 の座標系', () => {
    const requirements = readFileSync(REQUIREMENTS, 'utf8')
    expect(requirements).toContain(FR_029_PACKED)
    expect(requirements).toContain(FR_029_ONE_SYSTEM)
    expect(requirements).toContain(FR_029_SLACK_COSTS)
  })

  it('§8 of the glossary still says every row of 表 T-109 has a shape', () => {
    expect(readFileSync(GLOSSARY, 'utf8')).toContain(GLOSSARY_EVERY_TASK_GROUP_HAS_ONE)
  })

  it('⛔ the box the shapes are drawn in is still S-138, and this work must not move it', () => {
    // Why: the stop condition: tightening the coordinate system must not move the box,
    // so the drawn side must still be S-138's own number.
    const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
    expect(row, '表 T-206 no longer holds S-138').toBeDefined()
    const stated = /(\d+(?:\.\d+)?)\s*px/.exec(row?.by['既定'] ?? '')
    expect(stated, `S-138 states no px value: ${String(row?.by['既定'])}`).not.toBeNull()
    expect(NOT_STORED_ICON_SIZES['S-138'], 'the box stopped being S-138').toBe(
      Number(stated?.[1]),
    )
    expect(readFileSync(REQUIREMENTS, 'utf8')).toContain(FR_029_THE_BOX)
    // Why: the gap S-141 must not move either; tightening a coordinate system changes
    // neither length.
    // Why: no case asserts that the gap equals a frame's corner radius: S-141's note gives
    // that as the reason for its value, and no row fixes a radius.
    const gap = specTable('T-206').rows.find((one) => one.id === 'S-141')
    const statedGap = /(\d+(?:\.\d+)?)\s*px/.exec(gap?.by['既定'] ?? '')
    expect(statedGap, `S-141 states no px value: ${String(gap?.by['既定'])}`).not.toBeNull()
    expect(NOT_STORED_ICON_SIZES['S-141'], 'the gap stopped being S-141').toBe(
      Number(statedGap?.[1]),
    )
  })
})

// Spec: FR-036, IC-102, F-019, IMPS-1180
const FR_036_WHEEL_NOT_A_CHARACTER =
  '`GRS` は、`IC-102` の図形を、数字や英字と読み違える形にしないこと。'

// Spec: F-019
function figureGlyphOf(specTableRowId: string): Glyph {
  const figure = readFileSync(FIGURE, 'utf8')
  const label = figure.indexOf(`>${specTableRowId}</text>`)
  if (label < 0) throw new Error(`figure F-019 labels no ${specTableRowId}`)
  const open = figure.lastIndexOf('<g ', label)
  const body = figure.slice(figure.indexOf('>', open) + 1, figure.indexOf('</g>', open))
  const elements = [...body.matchAll(/<(\w+)\s([^>]*?)\/?>/g)].map((one) => ({
    tag: one[1] ?? '',
    attributes: [...(one[2] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)].map((pair) => ({
      name: pair[1] ?? '',
      value: pair[2] ?? '',
    })),
  }))
  return { specTableRowId, elements }
}

// Spec: F-019
const geometryOf = (glyph: Glyph): readonly string[] =>
  glyph.elements.map(
    (element) =>
      `${element.tag} ${element.attributes
        .filter((one) => one.name !== 'class' && one.name !== ATTRIBUTE_STYLE)
        .map((one) => `${one.name}=${one.value}`)
        .sort()
        .join(' ')}`,
  )

describe('FR-036 (MUST NOT): the wheel glyph IC-102 is not read as a character', () => {
  it('the manuscript still holds the rule, and F-019 draws IC-102 with a filled wheel beside its outline', () => {
    expect(readFileSync(REQUIREMENTS, 'utf8')).toContain(FR_036_WHEEL_NOT_A_CHARACTER)
    const drawn = figureGlyphOf('IC-102')
    expect(drawn.elements.length, geometryOf(drawn).join('; ')).toBeGreaterThan(2)
    expect(drawn.elements.some((one) => attributeOf(one, 'class') === 'f'), 'no filled part').toBe(true)
  })

  it(`${FR_036_WHEEL_NOT_A_CHARACTER} -- the carried IC-102 is F-019's own shape, element for element`, () => {
    const carried = CARRIED_FIGURE.glyphs.find((one) => one.specTableRowId === 'IC-102')
    expect(carried, 'icon-glyphs.json carries no IC-102').toBeDefined()
    expect(geometryOf(carried as Glyph)).toEqual(geometryOf(figureGlyphOf('IC-102')))
  })

  it(`${FR_036_WHEEL_NOT_A_CHARACTER} -- the carried IC-102 is not a tall outline: its ink is about as wide as tall or wider`, () => {
    const ink = INK_BY_ROW.get('IC-102')
    expect(ink, 'icon-glyphs.json carries no IC-102').toBeDefined()
    const frame = ink as Frame
    // Why: 0.9 reads a near-square frame; a lone tall outline measures 0.7.
    expect((frame.maxX - frame.minX) / (frame.maxY - frame.minY), MEASURED).toBeGreaterThanOrEqual(0.9)
  })
})
