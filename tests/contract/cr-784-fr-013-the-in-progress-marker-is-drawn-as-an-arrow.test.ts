// CR-784: table T-021 row PM-1 -- the in-progress progress marker is drawn `(->)`, not an empty disc.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { markerGlyphSvg, NOT_STORED_DELAY_MARK_SIZES } from '../../src/adapter/svg-renderer/svg-renderer'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_013_ARROW_SHAPE =
  '⭐ 進行中の記号 `(→)`（表 T-021 の `PM-1`）は、中断の記号 `( − )` と同じ長さと太さの横棒に、' +
  'その右端から左上と左下へ 1 本ずつ引く矢じりの線を足した形とすること（MUST）。'
const FR_013_ARROW_HEAD =
  '矢じりの各線は、横棒の右端から、左へも上（下）へも横棒の半分の長さに 表 T-206 の `S-601` を掛けた量だけ離れた点まで引き、' +
  '太さは横棒と同じとすること（MUST）'
const FR_013_BAR =
  '⭐ 中断の記号 `( − )`（表 T-021 の `PM-3`）は、円の中心を通る水平の横棒 1 本とし、半分の長さを円の半径に 表 T-206 の `S-341` を掛けた値、' +
  '太さを `S-24` に同表の `S-328` を掛けた値とすること（MUST）'

const TOLERANCE = 0.01
const near = (a: number, b: number): boolean => Math.abs(a - b) <= TOLERANCE

interface Pt {
  readonly x: number
  readonly y: number
}
interface Seg {
  readonly a: Pt
  readonly b: Pt
  readonly width: number
}
interface Glyph {
  readonly cx: number
  readonly cy: number
  readonly radius: number
  readonly discStroke: number
  readonly segments: readonly Seg[]
  readonly drawnBesidesDisc: number
}

const attrOf = (tag: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
const numOf = (tag: string, name: string): number => {
  const raw = attrOf(tag, name)
  if (raw === undefined) throw new Error(`attribute ${name} missing in ${tag}`)
  return Number(raw)
}

const pathSegments = (d: string): readonly [Pt, Pt][] => {
  const tokens = d.match(/[MLHV]|-?\d+(?:\.\d+)?/g) ?? []
  const out: [Pt, Pt][] = []
  let cursor: Pt = { x: 0, y: 0 }
  let cmd = 'M'
  for (let i = 0; i < tokens.length; ) {
    const token = tokens[i]!
    if (/[MLHV]/.test(token)) {
      cmd = token
      i += 1
      continue
    }
    let next: Pt
    if (cmd === 'H') {
      next = { x: Number(token), y: cursor.y }
      i += 1
    } else if (cmd === 'V') {
      next = { x: cursor.x, y: Number(token) }
      i += 1
    } else {
      next = { x: Number(token), y: Number(tokens[i + 1]) }
      i += 2
    }
    if (cmd !== 'M') out.push([cursor, next])
    cursor = next
    if (cmd === 'M') cmd = 'L'
  }
  return out
}

const pointsOf = (list: string): Pt[] => {
  const nums = (list.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const out: Pt[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) out.push({ x: nums[i]!, y: nums[i + 1]! })
  return out
}

const glyphOf = (symbol: 'PM-1' | 'PM-3'): Glyph => {
  const markup = markerGlyphSvg(symbol, (rowId) => `var(--${rowId})`)
  const tags = markup.match(/<(?:circle|line|path|polyline)\b[^>]*>/g) ?? []
  const disc = tags.find((tag) => tag.startsWith('<circle') && attrOf(tag, 'stroke-width') !== undefined)
  if (disc === undefined) throw new Error(`no disc circle in ${markup}`)
  const segments: Seg[] = []
  let drawnBesidesDisc = 0
  for (const tag of tags) {
    if (tag === disc) continue
    drawnBesidesDisc += 1
    const width = numOf(tag, 'stroke-width')
    if (tag.startsWith('<line')) {
      segments.push({ a: { x: numOf(tag, 'x1'), y: numOf(tag, 'y1') }, b: { x: numOf(tag, 'x2'), y: numOf(tag, 'y2') }, width })
    } else if (tag.startsWith('<path')) {
      for (const [a, b] of pathSegments(attrOf(tag, 'd') ?? '')) segments.push({ a, b, width })
    } else if (tag.startsWith('<polyline')) {
      const pts = pointsOf(attrOf(tag, 'points') ?? '')
      for (let i = 0; i + 1 < pts.length; i += 1) segments.push({ a: pts[i]!, b: pts[i + 1]!, width })
    }
  }
  return {
    cx: numOf(disc, 'cx'),
    cy: numOf(disc, 'cy'),
    radius: numOf(disc, 'r'),
    discStroke: numOf(disc, 'stroke-width'),
    segments,
    drawnBesidesDisc,
  }
}

const S_328 = NOT_STORED_DELAY_MARK_SIZES['S-328']
const S_341 = NOT_STORED_DELAY_MARK_SIZES['S-341']
const S_601 = NOT_STORED_DELAY_MARK_SIZES['S-601']

const hasEnds = (seg: Seg, p: Pt, q: Pt): boolean => {
  const same = (u: Pt, v: Pt): boolean => near(u.x, v.x) && near(u.y, v.y)
  return (same(seg.a, p) && same(seg.b, q)) || (same(seg.a, q) && same(seg.b, p))
}

const expectedBar = (g: Glyph): { half: number; left: Pt; right: Pt; width: number } => {
  const half = g.radius * S_341
  return {
    half,
    left: { x: g.cx - half, y: g.cy },
    right: { x: g.cx + half, y: g.cy },
    width: g.discStroke * S_328,
  }
}

const barOf = (g: Glyph): Seg | undefined => {
  const bar = expectedBar(g)
  return g.segments.find((seg) => hasEnds(seg, bar.left, bar.right))
}

describe('CR-784: the manuscript says the in-progress marker is an arrow', () => {
  it('table T-021 row PM-1 shows the symbol (->) and says the arrow stands for progress', () => {
    const row = specTable('T-021').rows.find((one) => one.id === 'PM-1')
    expect(row).toBeDefined()
    expect(row!.by['記号']).toContain('(→)')
    expect(row!.by['対応する状態']).toContain('矢は「進んでいる」ことを表す')
    expect(specTable('T-021').rows.find((one) => one.id === 'PM-3')!.by['記号']).toContain('( − )')
  })

  it('FR-013 holds the bar clause of PM-3 and the two arrow clauses of PM-1', () => {
    expect(REQUIREMENTS).toContain(FR_013_BAR)
    expect(REQUIREMENTS).toContain(FR_013_ARROW_SHAPE)
    expect(REQUIREMENTS).toContain(FR_013_ARROW_HEAD)
  })
})

describe('CR-784: the PM-1 glyph is a bar with two arrowhead strokes (FR-013, S-24, S-328, S-341, S-601)', () => {
  const g = glyphOf('PM-1')
  const bar = expectedBar(g)
  const tip = bar.right
  const reach = bar.half * S_601

  it('draws something besides the disc (no longer an empty circle)', () => {
    expect(g.drawnBesidesDisc).toBeGreaterThan(0)
    expect(g.segments.length).toBeGreaterThanOrEqual(3)
  })

  it('has a horizontal bar through the centre, half length = radius x S-341', () => {
    const found = barOf(g)
    expect(found, 'no horizontal bar from cx-half to cx+half at cy').toBeDefined()
    expect(near(found!.a.y, g.cy) && near(found!.b.y, g.cy)).toBe(true)
  })

  it('has an upper head stroke from the right end to (tip - h, cy - h), h = half x S-601', () => {
    expect(g.segments.some((seg) => hasEnds(seg, tip, { x: tip.x - reach, y: g.cy - reach }))).toBe(true)
  })

  it('has a lower head stroke from the right end to (tip - h, cy + h), h = half x S-601', () => {
    expect(g.segments.some((seg) => hasEnds(seg, tip, { x: tip.x - reach, y: g.cy + reach }))).toBe(true)
  })

  it('draws bar and head strokes with the disc stroke x S-328', () => {
    expect(g.segments.length).toBeGreaterThan(0)
    for (const seg of g.segments) expect(near(seg.width, bar.width)).toBe(true)
  })

  it('draws no segment besides the bar and the two heads', () => {
    expect(g.segments.length).toBe(3)
  })
})

describe('CR-784: the PM-3 glyph is the same bar without the heads', () => {
  const arrow = glyphOf('PM-1')
  const pause = glyphOf('PM-3')

  it('draws exactly the bar, with the same length and thickness as the arrow bar', () => {
    expect(pause.segments.length).toBe(1)
    const bar = expectedBar(pause)
    expect(barOf(pause)).toBeDefined()
    expect(near(pause.segments[0]!.width, bar.width)).toBe(true)
  })

  it('differs from the arrow only by the head strokes', () => {
    const base = barOf(arrow)!
    const other = barOf(pause)!
    expect(near(base.a.x, other.a.x) && near(base.b.x, other.b.x) && near(base.a.y, other.a.y)).toBe(true)
    expect(near(base.width, other.width)).toBe(true)
    expect(arrow.segments.length - pause.segments.length).toBe(2)
  })
})

describe('CR-784: the generated S-601 is the settings.json default', () => {
  it('holds 0.5, the default the manuscript row gives', () => {
    const find = (node: unknown): { default?: { num?: string } } | undefined => {
      if (Array.isArray(node)) {
        for (const one of node) {
          const hit = find(one)
          if (hit !== undefined) return hit
        }
      } else if (node !== null && typeof node === 'object') {
        const rec = node as Record<string, unknown>
        if (rec['id'] === 'S-601') return rec as { default?: { num?: string } }
        for (const value of Object.values(rec)) {
          const hit = find(value)
          if (hit !== undefined) return hit
        }
      }
      return undefined
    }
    const json: unknown = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8'))
    const row = find(json)
    expect(row).toBeDefined()
    expect(Number(row!.default!.num)).toBe(0.5)
    expect(S_601).toBe(0.5)
  })
})
