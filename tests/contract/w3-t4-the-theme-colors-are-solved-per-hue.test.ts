// W3 tester 4: FR-041 table T-366 CF-2 / CF-3 -- the drawn plan, outline, actual and accent colors are solved per hue, never stored.

// Why: every number is read from docs/spec (T-236 cells, T-206 S-520..S-525); the solve is re-derived here from the
// words of CF-2, CF-3 and CF-6 alone and compared with what the public colorOf (PI-19) draws.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { colorOf } from '../../src/adapter/svg-renderer/svg-renderer'
import { settingNumber, settingRow } from '../fixtures/setting-number'
import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readRepoFile(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const CF_2 =
  '`GRS` は、`_assets/tbl-settings.md` の 表 T-236 の `S-155`・`S-156`・`S-157`・`S-151` を、表 T-236 の値の明度に「向き × k × 行の比」を足した明度で描くこと。'
const CF_3 =
  '`GRS` は、k を 0 から 表 T-206 の `S-520` 刻みで `S-521` まで増やし、表 T-017a の `CT-3`・`CT-4`・`CT-5` をすべて満たす最小の k を選ぶこと。'
const FR_041_SOLVE =
  '`GRS` は、地の彩度・予定と実績と輪郭線の明度の寄せ幅・タスクグループの帯の色を、`themeHue` / `isThemeMonochrome` / `themePreference` から規則で解いて求めること。'
const FR_041_SOLVE_BY_T_366 =
  '`GRS` は、`IMPS-146` の色を 表 T-366 に従って解くこと（数は `_assets/tbl-settings.md` の 表 T-236 と、`_assets/tbl-settings.md` の 表 T-206 の `S-520` 〜 `S-526` が持つ）。'
const CF_3_GROUND = '`GRS` は、k を選ぶために比を測るとき、地を 表 T-236 の `S-146` の値を彩度 0 にした色で測ること。'
const CF_3_CAP = 'もし k が `S-521` でも k の条件を満たさない場合、`GRS` は、k を `S-521` とすること。'
const CF_2_DIRECTION = '`GRS` は、明度の寄せの比を`_assets/tbl-settings.md` の 表 T-206 の `S-522` 〜 `S-525` とし、向きを明るいテーマで −1（暗くする）、暗いテーマで ＋1（明るくする）とすること。'
const CF_2_ROUNDING = '`GRS` は、明度の寄せで足した明度を 0 〜 100 に収め、小数第 1 位に丸めること。'
const CF_6 = '`GRS` は、比を WCAG 2.1 のコントラスト比とし、HSL を 8 ビットの sRGB に丸めた値から求めること（`_assets/tbl-settings.md` の 表 T-294 の前文と同じ）。'
const CF_3_MEASURED = '明るいテーマで 360 の色相のうち 131 が k ＞ 0（最大 6）、暗いテーマで 15（最大 2）。'

// Spec: S-520, S-521
const STEP = settingNumber('S-520')
const CAP = settingNumber('S-521')

// Spec: CF-2, S-522, S-523, S-524, S-525
const RATIO_OF: Readonly<Record<string, number>> = {
  'S-155': settingNumber('S-522'),
  'S-156': settingNumber('S-523'),
  'S-157': settingNumber('S-524'),
  'S-151': settingNumber('S-525'),
}
const SHIFTED_ROWS = Object.keys(RATIO_OF)

type Side = 'light' | 'dark'
const SIDES: readonly Side[] = ['light', 'dark']

interface Hsl {
  readonly h: number
  readonly s: number
  readonly l: number
}

interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** @purity pure */
function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sat = s / 100
  const light = l / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const hp = (((h % 360) + 360) % 360) / 60
  const x = chroma * (1 - Math.abs((hp % 2) - 1))
  const [r1, g1, b1] =
    hp < 1 ? [chroma, x, 0] : hp < 2 ? [x, chroma, 0] : hp < 3 ? [0, chroma, x] : hp < 4 ? [0, x, chroma] : hp < 5 ? [x, 0, chroma] : [chroma, 0, x]
  const m = light - chroma / 2
  const to8 = (one: number): number => Math.round((one + m) * 255)
  return { r: to8(r1), g: to8(g1), b: to8(b1) }
}

/** @purity pure */
function parsedColor(text: string, hue: number): Rgb {
  const written = text.trim().replace(/\bH\b/g, String(hue))
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(written)
  if (hex !== null) return { r: parseInt(hex[1] ?? '', 16), g: parseInt(hex[2] ?? '', 16), b: parseInt(hex[3] ?? '', 16) }
  const hsl = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/i.exec(written)
  if (hsl !== null) return hslToRgb({ h: Number(hsl[1]), s: Number(hsl[2]), l: Number(hsl[3]) })
  throw new Error(`a color this file cannot read: ${JSON.stringify(text)}`)
}

/** @purity pure */
function cellHsl(id: string, side: Side, hue: number): Hsl {
  const cell = String(settingRow(id)[side]?.['color'] ?? '').replace(/\bH\b/g, String(hue))
  const found = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/.exec(cell)
  if (found !== null) return { h: Number(found[1]), s: Number(found[2]), l: Number(found[3]) }
  const rgb = parsedColor(cell, hue)
  if (rgb.r === rgb.g && rgb.g === rgb.b) return { h: hue, s: 0, l: (rgb.r / 255) * 100 }
  throw new Error(`table T-236 ${id} (${side}) is neither an hsl cell nor a gray: ${cell}`)
}

/** @purity pure */
function luminance({ r, g, b }: Rgb): number {
  const lin = (one: number): number => {
    const c = one / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// Spec: CF-6
/** @purity pure */
function contrast(one: Rgb, other: Rgb): number {
  const [hi, lo] = [luminance(one), luminance(other)].sort((a, b) => b - a) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// Spec: CF-2
/** @purity pure */
function shiftedHsl(id: string, side: Side, hue: number, k: number): Hsl {
  const base = cellHsl(id, side, hue)
  const direction = side === 'light' ? -1 : 1
  const moved = base.l + direction * k * (RATIO_OF[id] ?? NaN)
  return { ...base, l: Math.round(Math.min(100, Math.max(0, moved)) * 10) / 10 }
}

// Spec: CF-3, CT-3, CT-4, CT-5
/** @purity pure */
function meets(side: Side, hue: number, k: number): boolean {
  const ground = hslToRgb({ ...cellHsl('S-146', side, hue), s: 0 })
  const plan = hslToRgb(shiftedHsl('S-155', side, hue, k))
  const outline = hslToRgb(shiftedHsl('S-156', side, hue, k))
  const actual = hslToRgb(shiftedHsl('S-157', side, hue, k))
  return contrast(actual, plan) >= 3 && contrast(outline, ground) >= 3 && contrast(plan, ground) >= 1.3
}

// Spec: CF-3
/** @purity pure */
function solvedK(side: Side, hue: number): number {
  for (let k = 0; k <= CAP; k += STEP) if (meets(side, hue, k)) return k
  return CAP
}

const HUES = Array.from({ length: 360 }, (_one, index) => index)

const sameRgb = (one: Rgb, other: Rgb): boolean =>
  Math.abs(one.r - other.r) <= 1 && Math.abs(one.g - other.g) <= 1 && Math.abs(one.b - other.b) <= 1

describe('FR-041 / T-366 -- the manuscript these cases are driven by', () => {
  it.each([CF_2, CF_3, FR_041_SOLVE, FR_041_SOLVE_BY_T_366, CF_3_GROUND, CF_3_CAP, CF_2_DIRECTION, CF_2_ROUNDING, CF_6, CF_3_MEASURED])(
    '01-04 still says: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
})

describe(`T-366 CF-3 -- ${CF_3}`, () => {
  it('the solve read from the words reproduces the measured line of CF-3 (a check on this file, not on the build)', () => {
    const lightK = HUES.map((hue) => solvedK('light', hue))
    const darkK = HUES.map((hue) => solvedK('dark', hue))
    expect(
      [lightK.filter((k) => k > 0).length, Math.max(...lightK), darkK.filter((k) => k > 0).length, Math.max(...darkK)],
      CF_3_MEASURED,
    ).toEqual([131, 6, 15, 2])
  })
})

describe(`T-366 CF-2 -- ${CF_2}`, () => {
  // Spec: IMPS-147
  it.each(SIDES)('every hue, %s theme: S-155 / S-156 / S-157 / S-151 are drawn at the solved k', (side) => {
    const wrong: string[] = []
    for (const hue of HUES) {
      const k = solvedK(side, hue)
      for (const id of SHIFTED_ROWS) {
        const wanted = hslToRgb(shiftedHsl(id, side, hue, k))
        const drawnText = colorOf(id, hue, side === 'dark', false)
        const drawn = parsedColor(drawnText, hue)
        if (!sameRgb(drawn, wanted)) wrong.push(`hue ${hue} k ${k} ${id}: drew ${drawnText}`)
      }
    }
    expect(wrong.slice(0, 12), `${FR_041_SOLVE} (${wrong.length} cells differ)`).toEqual([])
  })

  it('at a hue whose solve is k > 0 the drawn colors move away from the T-236 cell, at a k = 0 hue they do not', () => {
    const moved = HUES.find((hue) => solvedK('light', hue) > 0)
    const still = HUES.find((hue) => solvedK('light', hue) === 0)
    if (moved === undefined || still === undefined) throw new Error('the solve has no hue of each kind')
    const cell = (hue: number): Rgb => hslToRgb(cellHsl('S-157', 'light', hue))
    expect(sameRgb(parsedColor(colorOf('S-157', moved, false, false), moved), cell(moved)), `${CF_2}: hue ${moved}`).toBe(false)
    expect(sameRgb(parsedColor(colorOf('S-157', still, false, false), still), cell(still)), 'T-366 CF-3: k 0 is the T-236 value').toBe(
      true,
    )
  })
})
