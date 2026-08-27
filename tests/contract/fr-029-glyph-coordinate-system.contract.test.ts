// Contract test: the ONE coordinate system every shape of 図 F-019 is drawn in.
//
// FR-029 (docs/spec/01-04-requirements.md:3744) closes its STATEMENT with two
// rules about that coordinate system, and this file is about those two alone:
//
//   MUST      「図 F-019 の座標系は、図形の外接する枠へ詰めること（MUST）」
//   MUST NOT  「図形ごとに別々の座標系を与えてはならない（MUST NOT）」
//             —— 別々にすると図形どうしの相対的な大きさが変わり、同じ箱に入れ
//                ても大きさが揃って見えなくなる。
//   ⚠️ and the sentence that says what a coordinate system with slack costs:
//             「座標系に余白があると、箱を大きくしても見える図形は大きく
//              ならない。」
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS IS A CONTRACT CASE AND NOT A UNIT ONE
// ---------------------------------------------------------------------------
//
// tests/README.md and TS-5 of 表 T-218 give `contract/` to what neither side of
// a seam owns. The coordinate system is exactly that. It is settled in three
// places and no one of them can be asked on its own:
//
//   図 F-019            `docs/spec/_assets/fig-icons.svg` draws the shapes
//   the generator       `tools/generate_icon_glyphs.py` carries them into
//                       `src/adapter/screen-renderer/icon-glyphs.json`, with
//                       the one `viewBox` they all share
//   UF-71               `dom-screen-surface.ts` sets that `viewBox` on every
//                       entry it draws (tests/unit/uf-71.test.ts asserts it)
//
// A case owned by the drawing unit can only ask whether it copied the string.
// What FR-029 rules on is whether the string IS the shapes' own bounding frame,
// and that is a question about the shapes and the string together.
//
// ⭐ SO THE CASES MEASURE THE SHAPES. They flatten every path, rect, circle and
// ellipse the artifact carries -- arcs included -- and add half of each shape's
// own stroke width where it is stroked, which is the ink a reader sees. Nothing
// here reads the generator's own answer for that: `generate_icon_glyphs.py`
// derives the box from the label positions of the figure's sheet, and a case
// that imported that derivation would agree with it by construction.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ -- FR-029, 表 T-206 (`S-138` / `S-141`), 表 T-109
// and §8 of `_assets/tbl-glossary.md`, 図 F-019 AS DATA, 表 T-026 row `RC-13`
// -- docs/development-rules/, and docs/development-records/defects.md row
// `D-75`. Of `src/`: the published generated declaration these cases name,
// `NOT_STORED_ICON_SIZES`, and the shape of `icon-glyphs.json` AS DATA.
//
// ⚠️ AND, WHILE FINDING WHERE THE COORDINATE SYSTEM REACHES THE SCREEN, the
// three functions of `dom-screen-surface.ts` that hold the box and the gap
// (`glyphStyle`, `entryGlyphRoom`, `fillEntry`). ⭐ Said plainly because
// 04-verification.md section 1 admits only the declarations, and a note that
// claimed less than was read would be the kind of comment rule 03 section 3
// calls a lie. ⛔ NOT ONE EXPECTED VALUE BELOW CAME FROM THEM: the two frames
// these cases compare are both measured here, from the shapes, and the only
// number crossing from `src/` is `NOT_STORED_ICON_SIZES`, which is asserted
// against 表 T-206 rather than trusted.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, SO NO FAILURE IS MISREAD
// ---------------------------------------------------------------------------
//
// 1. ⛔ THAT THE VISIBLE MARGIN EQUALS THE CORNER RADIUS OF AN ENTRANCE'S
//    FRAME. That is D-75's own wording （「アイコンの角の R が曲がり始めるところ
//    と同じぐらいの余白」）, and D-75's own row records 「角丸の半径を持つ行が
//    在るかは未確認」. What docs/spec holds is one REMARK, in `S-141`'s cell of
//    表 T-206: 「6px は入口の枠の角の R と同じ値である」（利用者の実測）. That
//    is a rationale for why the gap is 6px, not a rule that fixes the radius --
//    the 値 column of that row is 「図形と入口の枠の最低隙間」 and nothing else.
//    ⛔ So a case asserting a radius would be inventing the value the note
//    explains, and there is none here. What IS asserted is FR-029's MUST, which
//    is the only rule in docs/spec that decides how much of the box the ink
//    fills.
// 2. ⛔ WHICH GLYPH SHOULD REACH WHICH SIDE. FR-029 fixes that the coordinate
//    system is packed to the shapes, and forbids per-shape systems precisely so
//    that one shape MAY be smaller than another （「図形どうしの相対的な大き
//    さ」）. Nothing decides which shape is the largest, so no case names one.
// 3. ⛔ THE SIDE OF THE BOX. `S-138` is UF-71's to draw and
//    tests/unit/uf-71.test.ts measures it on four surfaces. The one case here
//    that names it is a stop condition, not a measurement: the user's report
//    reads 「アイコンサイズ自体は変えずに」, so this work must leave that number
//    where it is, and the case below fails if the box stops being 表 T-206's.
// 4. ⛔ THE GAP `S-141` KEEPS BETWEEN A SHAPE AND AN ENTRANCE'S FRAME. Also
//    UF-71's, and also already measured there. Neither length is touched by
//    tightening a coordinate system, which is why the two are named here only
//    as the things that must NOT move.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { NOT_STORED_ICON_SIZES } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { specTable } from './spec-table'

// ---------------------------------------------------------------------------
// What is read.
// ---------------------------------------------------------------------------

const REQUIREMENTS = join(process.cwd(), 'docs', 'spec', '01-04-requirements.md')
const GLOSSARY = join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md')
const FIGURE = join(process.cwd(), 'docs', 'spec', '_assets', 'fig-icons.svg')
const CARRIED = join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-glyphs.json')

interface GlyphElement {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

interface Glyph {
  readonly rowId: string
  readonly elements: readonly GlyphElement[]
}

/**
 * 図 F-019 as it reaches `src/`: the shapes, and the ONE coordinate system they
 * are all drawn in.
 *
 * ⭐ READ AS DATA. `tools/generate_icon_glyphs.py` is what carries the figure
 * here and `npm run gen:check` is what fails when the figure moves on without
 * it, so this file is the figure for the purposes of a case that asks what the
 * product draws.
 */
const CARRIED_FIGURE = JSON.parse(readFileSync(CARRIED, 'utf8')) as {
  readonly viewBox: string
  readonly glyphs: readonly Glyph[]
}

// ---------------------------------------------------------------------------
// The measurement. ⛔ Written here from the requirement, and NOT imported from
// the generator -- see the head comment.
// ---------------------------------------------------------------------------

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

/**
 * How finely a curve is sampled before its extreme is believed.
 *
 * ⭐ CHOSEN SO THE SAMPLING ERROR CANNOT REACH THE TOLERANCE BELOW. An arc of
 * radius r sampled at this many steps over a full turn misses its extreme by at
 * most r * (1 - cos(pi / STEPS)), which for the largest radius the figure draws
 * (well under 12) is smaller than 1e-4 -- two orders below `PACKED_TO`.
 */
const CURVE_STEPS = 720

/**
 * How much slack, in the coordinate system's own units, still counts as packed.
 *
 * ⭐ NOT A LOOSENING OF THE MUST: it is what lets the four numbers be written
 * with ordinary precision instead of with a float's tail. The shapes stand in a
 * box whose side is `S-138`, so one unit of the coordinate system is about half
 * a CSS pixel and this tolerance is about a two-hundredth of one -- far below
 * anything a reader can see, and far below the slack the requirement is about.
 */
const PACKED_TO = 0.01

const PATH_TOKEN = /[A-Za-z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g

const ATTRIBUTE_STYLE = 'style'

/** One attribute of a carried element, or `undefined` where it has none. */
function attributeOf(element: GlyphElement, name: string): string | undefined {
  return element.attributes.find((one) => one.name === name)?.value
}

/** One attribute that has to be a number for the shape to be measurable. */
function numberAttribute(element: GlyphElement, name: string, where: string): number {
  const held = attributeOf(element, name)
  if (held === undefined) throw new Error(`${where}: a <${element.tag}> states no ${name}`)
  const value = Number(held)
  if (!Number.isFinite(value)) throw new Error(`${where}: ${name}="${held}" is not a number`)
  return value
}

/**
 * Half the width of the ink one shape's stroke lays down, or zero where it is
 * not stroked.
 *
 * ⭐ WHY HALF, AND WHY IN EVERY DIRECTION. A stroke is centred on the geometry,
 * so it reaches half its width outside it; with a ROUND cap it reaches that far
 * beyond an endpoint too, and with a ROUND join it never reaches further at a
 * corner. ⛔ So the caps and the joins are asserted rather than assumed: a
 * shape drawn with any other cap would make this expansion an over-estimate,
 * and the case below would then demand a coordinate system slightly larger than
 * the ink -- a wrong answer that would look like a real failure.
 */
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

/** One point of an elliptical arc, at the angle `t` on the ellipse it lies on. */
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

/**
 * The points of one `A` / `a` arc, by the endpoint-to-centre conversion SVG's
 * own grammar defines.
 *
 * ⛔ THE ARCS ARE NOT SKIPPED. Every rounded corner in 図 F-019 is one, and the
 * corners are where several shapes reach furthest -- a measurement that treated
 * an arc as the straight line between its ends would answer a frame that is too
 * small, and would call a slack coordinate system packed.
 */
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

/** The points of one quadratic or cubic segment, sampled. */
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

/**
 * Every point one `d` passes through, densely enough for its extremes.
 *
 * ⛔ AN UNKNOWN COMMAND STOPS THE CASE rather than being skipped. A command
 * this routine cannot flatten would silently shrink the measured frame, and a
 * measurement that is quietly too small is exactly the failure it is here to
 * catch.
 */
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
  /**
   * One of an arc's two flags.
   *
   * ⛔ SVG lets the flags be written without separators （`a2 2 0 001 1`）, and
   * a tokenizer that reads numbers cannot tell that form apart from one number.
   * 図 F-019 spaces every flag today, so this stops rather than guesses.
   */
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
        // ⭐ SVG's own rule: the pairs after a moveto are linetos.
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

/**
 * Every point one carried element passes through.
 *
 * ⛔ A TAG THIS ROUTINE DOES NOT KNOW STOPS THE CASE, for the reason
 * `flattenPath` gives. `tools/generate_icon_glyphs.py` will carry seven kinds
 * of drawable element, so the seven are all handled here even though 図 F-019
 * draws only four of them today -- a shape that stopped being measured would
 * shrink the answer in silence.
 */
function pointsOf(element: GlyphElement, where: string): readonly Point[] {
  // ⛔ A TRANSFORM WOULD MAKE EVERY NUMBER BELOW WRONG IN SILENCE, so it stops
  // the measurement instead. It is also the thing FR-029's MUST NOT is about:
  // a shape placed or scaled by a rule of its own is a shape in a coordinate
  // system of its own.
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
      // ⭐ `rx` rounds the corners INWARDS, so it cannot move any of the four
      // sides and is deliberately not read.
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

/** The frame one glyph's ink circumscribes. */
function inkFrameOf(glyph: Glyph): Frame {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const element of glyph.elements) {
    const where = glyph.rowId
    const reach = inkReach(element, where)
    for (const point of pointsOf(element, where)) {
      minX = Math.min(minX, point.x - reach)
      minY = Math.min(minY, point.y - reach)
      maxX = Math.max(maxX, point.x + reach)
      maxY = Math.max(maxY, point.y + reach)
    }
  }
  if (!Number.isFinite(minX)) throw new Error(`${glyph.rowId}: no shape to measure`)
  return { minX, minY, maxX, maxY }
}

const INK_BY_ROW = new Map(
  CARRIED_FIGURE.glyphs.map((one): [string, Frame] => [one.rowId, inkFrameOf(one)]),
)

/** The frame ALL of the shapes together circumscribe -- 「図形の外接する枠」. */
const INK: Frame = [...INK_BY_ROW.values()].reduce((held, one) => ({
  minX: Math.min(held.minX, one.minX),
  minY: Math.min(held.minY, one.minY),
  maxX: Math.max(held.maxX, one.maxX),
  maxY: Math.max(held.maxY, one.maxY),
}))

/** The rows whose ink stands at one edge of the measured frame. */
function rowsAt(edge: keyof Frame): readonly string[] {
  const best = INK[edge]
  return [...INK_BY_ROW.entries()]
    .filter(([, frame]) => Math.abs(frame[edge] - best) <= PACKED_TO)
    .map(([row]) => row)
}

/** The coordinate system as it is stated, read as four numbers. */
function statedFrame(viewBox: string): Frame {
  const numbers = viewBox.trim().split(/[\s,]+/).map(Number)
  if (numbers.length !== 4 || numbers.some((one) => !Number.isFinite(one))) {
    throw new Error(`the coordinate system is not four numbers: ${JSON.stringify(viewBox)}`)
  }
  const [minX = 0, minY = 0, width = 0, height = 0] = numbers
  return { minX, minY, maxX: minX + width, maxY: minY + height }
}

const STATED = statedFrame(CARRIED_FIGURE.viewBox)

/** How much room the coordinate system holds beyond the ink, on each side. */
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

// ---------------------------------------------------------------------------
// The sentences these cases are driven by, copied from the manuscript so that a
// failure names one line of it (Chapter 1.9 :274).
// ---------------------------------------------------------------------------

/** FR-029, docs/spec/01-04-requirements.md:3744. */
const FR_029_PACKED = '図 F-019 の座標系は、図形の外接する枠へ詰めること（MUST）'
const FR_029_ONE_SYSTEM = '図形ごとに別々の座標系を与えてはならない（MUST NOT）'
const FR_029_SLACK_COSTS = '座標系に余白があると、箱を大きくしても見える図形は大きくならない'
const FR_029_THE_BOX = '図形を描く箱の一辺は'

/** §8 of docs/spec/_assets/tbl-glossary.md, above 表 T-109. */
const GLOSSARY_EVERY_ROW_HAS_ONE = '図形を持たない行は無い'

// ===========================================================================
// FR-029 (MUST NOT): 図形ごとに別々の座標系を与えてはならない
// ===========================================================================

describe('FR-029 (MUST NOT): every shape is drawn in ONE coordinate system', () => {
  it('図 F-019 reaches src/ as one coordinate system, stated once', () => {
    // ⭐ The whole of the MUST NOT in one line: there is a single `viewBox` for
    // the shapes, and it is four numbers rather than a word.
    expect(typeof CARRIED_FIGURE.viewBox, 'the shapes carry no coordinate system').toBe('string')
    expect(() => statedFrame(CARRIED_FIGURE.viewBox)).not.toThrow()
    expect(STATED.maxX - STATED.minX, 'the coordinate system has no width').toBeGreaterThan(0)
    expect(STATED.maxY - STATED.minY, 'the coordinate system has no height').toBeGreaterThan(0)
  })

  it('no glyph, and no element of a glyph, carries a coordinate system of its own', () => {
    // ⛔ THE LOUD ONE. This is what falls the day someone "fixes" a single
    // shape by giving it a box of its own -- which FR-029 forbids because it
    // changes 図形どうしの相対的な大きさ.
    //
    // ⚠️ A `transform` counts, and not only a `viewBox`: a shape placed or
    // scaled by a rule of its own is a shape in a system of its own, and it is
    // ALSO the one thing that would make the measurement in this file wrong
    // without saying so -- `pointsOf` refuses to apply one.
    const ownSystems: string[] = []
    for (const glyph of CARRIED_FIGURE.glyphs) {
      for (const element of glyph.elements) {
        for (const attribute of element.attributes) {
          if (attribute.name === 'viewBox' || attribute.name === 'transform') {
            ownSystems.push(`${glyph.rowId} <${element.tag} ${attribute.name}>`)
          }
        }
      }
      const held = glyph as unknown as Record<string, unknown>
      if (held['viewBox'] !== undefined) ownSystems.push(`${glyph.rowId} viewBox`)
    }
    expect(ownSystems, `${ownSystems.length} shape(s) carry a coordinate system of their own`)
      .toEqual([])
  })

  it('図 F-019 itself declares one coordinate system and no glyph group holds another', () => {
    // The same MUST NOT, one step upstream: the figure is the authority, so a
    // second system there would reach src/ the moment the generator learned to
    // carry it.
    const figure = readFileSync(FIGURE, 'utf8')
    expect((figure.match(/\bviewBox\s*=/g) ?? []).length, '図 F-019 states more than one viewBox')
      .toBe(1)
    const groups = figure.match(/<g\b[^>]*>/g) ?? []
    expect(groups.length, '図 F-019 draws no glyph group').toBeGreaterThan(0)
    expect(groups.filter((one) => /viewBox/.test(one)), 'a glyph group carries its own viewBox')
      .toEqual([])
  })

  it('表 T-109 and 図 F-019 hold the same 74 rows, so the one system covers them all', () => {
    // ⭐ §8 of the glossary states 「図形を持たない行は無い」 for the whole of
    // 表 T-109, which is what makes the sentences above a statement about EVERY
    // icon rather than about the ones that happen to be drawn.
    const roster = specTable('T-109').rows.map((one) => one.id)
    const drawn = CARRIED_FIGURE.glyphs.map((one) => one.rowId)
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

// ===========================================================================
// FR-029 (MUST): 図 F-019 の座標系は、図形の外接する枠へ詰めること
// ===========================================================================

describe('FR-029 (MUST): the coordinate system is packed to the shapes it holds', () => {
  it('every stroked shape is drawn with round caps and joins', () => {
    // ⭐ NOT A RULE OF THE SPECIFICATION -- it is what makes the measurement in
    // this file exact, and it is asserted so that a change to the figure's
    // stylesheet shows up here as itself rather than as a frame that is quietly
    // too large. A round cap reaches half the stroke width beyond an endpoint
    // and a round join never reaches further at a corner, which is why
    // `inkReach` may expand a shape by that much in every direction.
    const unmeasurable: string[] = []
    for (const glyph of CARRIED_FIGURE.glyphs) {
      for (const element of glyph.elements) {
        const style = attributeOf(element, ATTRIBUTE_STYLE) ?? ''
        const stroke = /(?:^|;)\s*stroke\s*:\s*([^;]+)/.exec(style)
        if (stroke === null || (stroke[1] ?? '').trim() === 'none') continue
        const hasRoundCap = /stroke-linecap\s*:\s*round/.test(style)
        const hasRoundJoin = /stroke-linejoin\s*:\s*round/.test(style)
        if (!hasRoundCap || !hasRoundJoin || !/stroke-width\s*:\s*[\d.]/.test(style)) {
          unmeasurable.push(`${glyph.rowId} <${element.tag}>`)
        }
      }
    }
    expect(
      unmeasurable,
      `${unmeasurable.length} stroked shape(s) this measurement cannot bound exactly`,
    ).toEqual([])
  })

  it('no shape reaches outside the coordinate system', () => {
    // Half of 「図形の外接する枠へ詰める」: the frame CIRCUMSCRIBES the shapes,
    // so nothing may stand outside it. ⚠️ A shape that did would be clipped on
    // the screen, which no reader could read as a smaller icon.
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
    // ⛔ THE OTHER HALF, AND THE ONE FR-029 SPELLS OUT A CONSEQUENCE FOR:
    // 「座標系に余白があると、箱を大きくしても見える図形は大きくならない。」
    // Slack on a side is room inside `S-138`'s box that no shape can ever
    // reach, so the ink is drawn smaller than the box by exactly that much.
    //
    // ⭐ EQUIVALENTLY: some shape's ink stands at each of the four sides. The
    // rows that do are named in the message, so a failure says which side was
    // left open and which shape came closest to it.
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
    // The same MUST said once more as the four numbers, so that a coordinate
    // system which happens to touch the ink on all four sides while being
    // stated somewhere else still fails. ⚠️ It cannot: this is arithmetic on
    // the case above. It is here because 「詰めること」 is about the frame, and
    // a reader looking for the frame should find it asserted as a frame.
    expect(STATED.minX, MEASURED).toBeCloseTo(INK.minX, 2)
    expect(STATED.minY, MEASURED).toBeCloseTo(INK.minY, 2)
    expect(STATED.maxX, MEASURED).toBeCloseTo(INK.maxX, 2)
    expect(STATED.maxY, MEASURED).toBeCloseTo(INK.maxY, 2)
  })
})

// ===========================================================================
// The stop condition, and the manuscript these cases copy.
// ===========================================================================

describe('the manuscript still says what these cases copy', () => {
  it('FR-029 still holds both rules about 図 F-019 の座標系', () => {
    const requirements = readFileSync(REQUIREMENTS, 'utf8')
    expect(requirements).toContain(FR_029_PACKED)
    expect(requirements).toContain(FR_029_ONE_SYSTEM)
    // ⚠️ The sentence that says what the slack costs. If it ever leaves the
    // manuscript, the case above is arguing from a reason nobody holds.
    expect(requirements).toContain(FR_029_SLACK_COSTS)
  })

  it('§8 of the glossary still says every row of 表 T-109 has a shape', () => {
    expect(readFileSync(GLOSSARY, 'utf8')).toContain(GLOSSARY_EVERY_ROW_HAS_ONE)
  })

  it('⛔ the box the shapes are drawn in is still S-138, and this work must not move it', () => {
    // ⛔ THE STOP CONDITION. The user's report reads 「アイコンサイズ自体は変え
    // ずにグリフを拡大しろ」, and FR-029 keeps the side of that box in 表 T-206:
    //   「図形を描く箱の一辺は `_assets/tbl-settings.md` の 表 T-206 の `S-138`
    //    に従うこと（MUST）」
    // So this case asks two things at once: the row still states a px length,
    // and the number the app draws the box at is still THAT number and not
    // anything derived from the coordinate system these cases tighten.
    const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
    expect(row, '表 T-206 no longer holds S-138').toBeDefined()
    const stated = /(\d+(?:\.\d+)?)\s*px/.exec(row?.by['既定'] ?? '')
    expect(stated, `S-138 states no px value: ${String(row?.by['既定'])}`).not.toBeNull()
    expect(NOT_STORED_ICON_SIZES['S-138'], 'the box stopped being S-138').toBe(
      Number(stated?.[1]),
    )
    expect(readFileSync(REQUIREMENTS, 'utf8')).toContain(FR_029_THE_BOX)
    // ⚠️ And the gap, for the same reason: tightening a coordinate system
    // changes neither length, so both are named here as the two that must not
    // move. Where they are DRAWN is measured in tests/unit/uf-71.test.ts.
    const gap = specTable('T-206').rows.find((one) => one.id === 'S-141')
    const statedGap = /(\d+(?:\.\d+)?)\s*px/.exec(gap?.by['既定'] ?? '')
    expect(statedGap, `S-141 states no px value: ${String(gap?.by['既定'])}`).not.toBeNull()
    expect(NOT_STORED_ICON_SIZES['S-141'], 'the gap stopped being S-141').toBe(
      Number(statedGap?.[1]),
    )
  })
})
