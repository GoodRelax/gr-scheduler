// W3 spec-only cases for FR-041 table T-366: CF-1 / CF-4 / CF-6 -- the theme colors are solved per hue, measured by WCAG 2.1 on 8-bit sRGB.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { colorOf } from '../../src/adapter/svg-renderer/svg-renderer'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const CF_1 = 'CF-2` 〜 `CF-4` を、この順に 1 回解くこと（MUST）。解いた値を保存してはならない（MUST NOT）'
const CF_4 = '| CF-4 | 地の彩度 | モノクロでなければ、`S-146` の彩度を次のとおり解くこと（MUST）'
const CF_6 = '| CF-6 | 測り方 | 比は WCAG 2.1 のコントラスト比とし、HSL を 8 ビットの sRGB に丸めた値から求めること（MUST）'
const CF_3_MEASURED = '明るいテーマで 360 の色相のうち 131 が k ＞ 0（最大 6）、暗いテーマで 15（最大 2）'

const TABLES = new Map<string, ReturnType<typeof specTable>>()

const rowOf = (table: string, id: string) => {
  const held = TABLES.get(table) ?? specTable(table)
  TABLES.set(table, held)
  const found = held.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-206
const numberOf = (id: string): number => {
  const value = Number(/-?\d+(?:\.\d+)?/.exec(bare(rowOf('T-206', id).cells[1] ?? ''))?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`table T-206 row ${id} states no number`)
  return value
}

const STEP = numberOf('S-520')
const CEILING = numberOf('S-521')
const RATIO_OF: Readonly<Record<string, number>> = {
  'S-155': numberOf('S-522'),
  'S-156': numberOf('S-523'),
  'S-157': numberOf('S-524'),
  'S-151': numberOf('S-525'),
}

interface Hsl {
  readonly h: number
  readonly s: number
  readonly l: number
}

const CELLS = new Map<string, string>()

// see T-236
const tableHsl = (id: string, dark: boolean, hue: number): Hsl => {
  const key = `${id}/${String(dark)}`
  const cell = CELLS.get(key) ?? bare(rowOf('T-236', id).by[dark ? '暗いテーマ' : '明るいテーマ'] ?? '').replace(/`/g, '')
  CELLS.set(key, cell)
  const named = /^hsl\(H ([\d.]+)% ([\d.]+)%\)$/.exec(cell)
  if (named !== null) return { h: hue, s: Number(named[1]), l: Number(named[2]) }
  if (cell === '#ffffff') return { h: hue, s: 0, l: 100 }
  throw new Error(`T-236 ${id} holds ${cell}, which this case cannot read`)
}

// see CF-6
const rgb8 = (one: Hsl): readonly number[] => {
  const s = one.s / 100
  const l = one.l / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (((one.h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const [r, g, b] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x]
  const m = l - c / 2
  return [r, g, b].map((v) => Math.round((v + m) * 255))
}

// see CF-6
const luminance = (rgb: readonly number[]): number => {
  const [r, g, b] = rgb.map((v) => {
    const unit = v / 255
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// see CF-6
const contrast = (a: readonly number[], b: readonly number[]): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// see CF-2
const shifted = (id: string, dark: boolean, hue: number, k: number): Hsl => {
  const base = tableHsl(id, dark, hue)
  const moved = base.l + (dark ? 1 : -1) * k * (RATIO_OF[id] ?? NaN)
  return { ...base, l: Math.round(Math.min(100, Math.max(0, moved)) * 10) / 10 }
}

// see CF-3, CT-3, CT-4, CT-5
const holds = (dark: boolean, hue: number, k: number): boolean => {
  const ground = rgb8({ ...tableHsl('S-146', dark, hue), s: 0 })
  const fill = rgb8(shifted('S-155', dark, hue, k))
  const edge = rgb8(shifted('S-156', dark, hue, k))
  const actual = rgb8(shifted('S-157', dark, hue, k))
  return contrast(actual, fill) >= 3 && contrast(edge, ground) >= 3 && contrast(fill, ground) >= 1.3
}

// see CF-3
const kOf = (dark: boolean, hue: number): number => {
  for (let k = 0; k < CEILING; k += STEP) if (holds(dark, hue, k)) return k
  return CEILING
}

// see PI-19
const drawnHsl = (id: string, hue: number, dark: boolean, monochrome = false): Hsl => {
  const said = colorOf(id, hue, dark, monochrome).trim()
  const hsl = /^hsl\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%[ ,]+([\d.]+)%\s*\)$/.exec(said)
  if (hsl !== null) return { h: Number(hsl[1]), s: Number(hsl[2]), l: Number(hsl[3]) }
  if (/^#ffffff$/i.test(said)) return { h: hue, s: 0, l: 100 }
  throw new Error(`colorOf(${id}) said ${said}, which is neither hsl() nor white`)
}

const HUES = Array.from({ length: 360 }, (_one, index) => index)

describe('W3-T1 -- the clauses these cases are driven by', () => {
  it('CF-1, CF-4, CF-6 and the CF-3 measurement still read this way', () => {
    for (const clause of [CF_1, CF_4, CF_6, CF_3_MEASURED]) expect(REQUIREMENTS, clause).toContain(clause)
  })

  it('premise: an independent CF-6 solver reproduces the CF-3 measurement (131 / max 6 light, 15 / max 2 dark)', () => {
    const light = HUES.map((hue) => kOf(false, hue))
    const dark = HUES.map((hue) => kOf(true, hue))
    expect([light.filter((k) => k > 0).length, Math.max(...light)]).toEqual([131, 6])
    expect([dark.filter((k) => k > 0).length, Math.max(...dark)]).toEqual([15, 2])
  })
})

describe(`CF-6 "${CF_6.slice(-60)}"`, () => {
  for (const dark of [false, true]) {
    it(`${dark ? 'dark' : 'light'}: every hue draws S-155 / S-156 / S-157 / S-151 at the k an 8-bit WCAG measure picks`, () => {
      const wrong: string[] = []
      for (const hue of HUES) {
        const k = kOf(dark, hue)
        for (const id of ['S-155', 'S-156', 'S-157', 'S-151']) {
          const want = shifted(id, dark, hue, k)
          const got = drawnHsl(id, hue, dark)
          if (Math.abs(got.l - want.l) > 1e-6 || Math.abs(got.s - want.s) > 1e-6) {
            wrong.push(`hue ${hue} ${id}: drawn L ${got.l}, want L ${want.l} (k ${k})`)
          }
        }
      }
      expect(wrong.slice(0, 8), `${wrong.length} colors off the solve`).toEqual([])
    })
  }
})

describe(`CF-1 "${CF_1.slice(-60)}"`, () => {
  it('CF-2 runs before CF-3 picks k: the drawn S-157 / S-155 ratio is the one measured AFTER the shift', () => {
    for (const dark of [false, true]) {
      for (const hue of HUES) {
        const ground = rgb8({ ...tableHsl('S-146', dark, hue), s: 0 })
        const fill = rgb8(drawnHsl('S-155', hue, dark))
        const edge = rgb8(drawnHsl('S-156', hue, dark))
        const actual = rgb8(drawnHsl('S-157', hue, dark))
        const k = kOf(dark, hue)
        if (k >= CEILING) continue
        expect(contrast(actual, fill), `hue ${hue} CT-3`).toBeGreaterThanOrEqual(3)
        expect(contrast(edge, ground), `hue ${hue} CT-4`).toBeGreaterThanOrEqual(3)
        expect(contrast(fill, ground), `hue ${hue} CT-5`).toBeGreaterThanOrEqual(1.3)
      }
    }
  })

  it('the solve is a function of the hue alone: asking twice gives the same color (nothing remembered between asks)', () => {
    const first = HUES.map((hue) => colorOf('S-155', hue, false, false))
    colorOf('S-155', 52, true, true)
    expect(HUES.map((hue) => colorOf('S-155', hue, false, false))).toEqual(first)
  })
})

describe(`CF-4 "${CF_4.slice(-60)}"`, () => {
  for (const dark of [false, true]) {
    it(`${dark ? 'dark' : 'light'}: the ground keeps the T-236 lightness and, at the current ceiling, the T-236 saturation`, () => {
      for (const hue of HUES) {
        const table = tableHsl('S-146', dark, hue)
        const drawn = drawnHsl('S-146', hue, dark)
        expect(drawn.l, `hue ${hue}: lightness does not move`).toBeCloseTo(table.l, 6)
        expect(drawn.s, `hue ${hue}: the ceiling satisfies CF-5, so it is the answer`).toBeCloseTo(table.s, 6)
      }
    })

    it(`${dark ? 'dark' : 'light'}: the solved ground keeps CF-5's ink pairs above their floors`, () => {
      for (const hue of HUES) {
        const ground = rgb8(drawnHsl('S-146', hue, dark))
        const accent = rgb8(drawnHsl('S-151', hue, dark))
        expect(contrast(accent, ground), `hue ${hue}: S-151 / ground`).toBeGreaterThanOrEqual(3)
      }
    })
  }

  it('monochrome: the ground saturation is 0', () => {
    for (const hue of [0, 52, 214, 300]) {
      for (const dark of [false, true]) expect(drawnHsl('S-146', hue, dark, true).s, `hue ${hue}`).toBe(0)
    }
  })
})
