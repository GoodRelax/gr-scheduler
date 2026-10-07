// CR-585 spec-only tests: monochrome greys the rows of table T-236 on chrome, ground and export alike.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { colourOf } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  pageGroundStyle,
  themeStyle,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const SETTINGS_MD = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-settings.md'), 'utf8'))

const CLAUSE_FOLLOW_T236 = '画面の色は `_assets/tbl-settings.md` の 表 T-236 に従うこと（MUST）'
const CLAUSE_GROUND = '地の色を自分で塗ること（MUST）。'
const CLAUSE_MONOCHROME =
  '⭐ モノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、同書の 表 T-236 のすべての行を（色相の欄が ○ の行も — の行も）、日程の図の中にも画面の枠（罫 `S-149`・パネルの地 `S-150`・強調 `S-151`・掴み代の印 `S-231`・文字 `S-147`・押下の緑 `S-183` ほか）にも、無彩色にして描くこと（MUST）'
const CLAUSE_SAME_VALUE = '⭐ 画面と書き出した絵とで、同じ行を同じ値で塗ること（MUST）'
const CLAUSE_ANY_HUE_COLUMN =
  '⚠️ 本段落は、色相の欄を問わず 表 T-236 のすべての行を灰にする —— 色相の欄が決めるのはテーマ色に追随するかだけである。'
// WHY: no MUST states how the grey is chosen; table T-294's preamble is the one sentence that
// names the method the specification measures monochrome by, so case (7) rests on it.
const CLAUSE_KEEP_LIGHTNESS = 'モノクロは、その値を HSL の明度を保ったまま彩度 0 にして測った'

const CLAUSES_IN_REQUIREMENTS = [
  CLAUSE_FOLLOW_T236,
  CLAUSE_GROUND,
  CLAUSE_MONOCHROME,
  CLAUSE_SAME_VALUE,
  CLAUSE_ANY_HUE_COLUMN,
]

const PREFERENCES = ['light', 'dark'] as const
type Preference = (typeof PREFERENCES)[number]
const CHANNEL_TOLERANCE = 1
const CHANNEL_MAX = 255
const PERCENT = 100
const HUE_TURN = 360
const SEXTANT = 30
const WHEEL = 12
const HUE_FOLLOWS = '○'
const S_146 = 'S-146'

// see T-216
const S_73_DEFAULT = Number(bare(specTable('T-216').rows.find((one) => one.id === 'S-73')?.by['既定'] ?? ''))

// WHY: several hues, so a greying that only works at the default hue (or only strips one H) is caught.
const HUES = [S_73_DEFAULT, 0, 60, 140, 285]

// WHY: the DOM surface keeps its name->row pairing (PAINT_ROW) private; only the pairing is
// copied to tie a --gr-<name> custom property to its T-236 row, never a colour.
const NAME_TO_ROW: Readonly<Record<string, string>> = {
  ground: 'S-146',
  ink: 'S-147',
  quiet: 'S-148',
  rule: 'S-149',
  panel: 'S-150',
  grabStrip: 'S-231',
  shadow: 'S-170',
  armed: 'S-183',
  pressed: 'S-183',
  pinned: 'S-151',
  hoveredEntrance: 'S-147',
  pinnedRow: 'S-151',
  grabAxisPosition: 'S-151',
  grabAxisDepth: 'S-152',
  heldRow: 'S-151',
  caution: 'S-153',
}

// see T-236

interface T236Row {
  readonly id: string
  readonly light: string
  readonly dark: string
  readonly followsHue: boolean
}

const T236 = specTable('T-236')

function t236(id: string): T236Row {
  const row = T236.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-236 has no ${id}`)
  const resolve = (cell: string, side: '明るいテーマ' | '暗いテーマ'): string => {
    const value = bare(cell)
    if (/^S-\d+$/.test(value)) return resolve(T236.rows.find((one) => one.id === value)?.by[side] ?? '', side)
    return value
  }
  return {
    id,
    light: resolve(row.by['明るいテーマ'] ?? '', '明るいテーマ'),
    dark: resolve(row.by['暗いテーマ'] ?? '', '暗いテーマ'),
    followsHue: (row.by['色相追随'] ?? '').trim() === HUE_FOLLOWS,
  }
}

// WHY: a row whose two cells both name another row (S-162, S-169, S-311) carries that row's value, grey or not.
function inheritedRowOf(id: string): string | null {
  const row = T236.rows.find((one) => one.id === id)
  const light = bare(row?.by['明るいテーマ'] ?? '')
  const dark = bare(row?.by['暗いテーマ'] ?? '')
  return /^S-\d+$/.test(light) && light === dark ? light : null
}

const HUE_ROWS = T236.rows.filter((row) => (row.by['色相追随'] ?? '').trim() === HUE_FOLLOWS).map((row) => row.id)

const writtenOf = (row: T236Row, preference: Preference, hue: number): string =>
  (preference === 'dark' ? row.dark : row.light).replace(/\bH\b/g, String(hue))

// WHY: T-236 spells colours as #rrggbb, hsl(), rgb() and rgba(), so all four are read.

type Rgb = readonly [number, number, number]

interface Paint {
  readonly rgb: Rgb
  readonly alpha: number
}

function rgbOfHsl(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
  const s = saturationPercent / PERCENT
  const l = lightnessPercent / PERCENT
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + hue / SEXTANT) % WHEEL
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * CHANNEL_MAX
  }
  return [channel(0), channel(8), channel(4)]
}

function paintOf(text: string): Paint | null {
  const value = text.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value)
  if (hex !== null) {
    const digits = hex[1] ?? ''
    const wide = digits.length === 3 ? digits.replace(/./g, (one) => one + one) : digits
    const n = Number.parseInt(wide, 16)
    return { rgb: [(n >> 16) & CHANNEL_MAX, (n >> 8) & CHANNEL_MAX, n & CHANNEL_MAX], alpha: 1 }
  }
  const hsl = /^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*([\d.]+)\s*)?\)$/.exec(value)
  if (hsl !== null) {
    const hue = ((Number(hsl[1]) % HUE_TURN) + HUE_TURN) % HUE_TURN
    return { rgb: rgbOfHsl(hue, Number(hsl[2]), Number(hsl[3])), alpha: hsl[4] === undefined ? 1 : Number(hsl[4]) }
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/.exec(value)
  if (rgb !== null) {
    return {
      rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])],
      alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
    }
  }
  return null
}

function mustPaint(text: string, what: string): Paint {
  const paint = paintOf(text)
  if (paint === null) throw new Error(`${what} is not a colour this test can read: ${JSON.stringify(text)}`)
  return paint
}

const samePaint = (left: Paint, right: Paint): boolean =>
  left.rgb.every((value, index) => Math.abs(value - (right.rgb[index] ?? Number.NaN)) <= CHANNEL_TOLERANCE) &&
  Math.abs(left.alpha - right.alpha) < 1e-6

// see CF-2
// WHY: since CR-683 table T-366 moves these rows' lightness per hue, toward the theme's side, and nothing else.
const T366_SHIFTED_ROWS: readonly string[] = ['S-151', 'S-155', 'S-156', 'S-157']
const HSL_TEXT = /^hsl\((\S+) ([\d.]+)% ([\d.]+)%\)$/

const isShiftOf = (drawn: string, written: string, preference: Preference): boolean => {
  const d = HSL_TEXT.exec(drawn)
  const w = HSL_TEXT.exec(written)
  if (d === null || w === null) return false
  const moved = Number(d[3]) - Number(w[3])
  return d[1] === w[1] && d[2] === w[2] && (preference === 'dark' ? moved >= 0 : moved <= 0)
}

const isGrey = (paint: Paint): boolean =>
  Math.abs(paint.rgb[0] - paint.rgb[1]) <= CHANNEL_TOLERANCE &&
  Math.abs(paint.rgb[1] - paint.rgb[2]) <= CHANNEL_TOLERANCE

const lightnessOf = (paint: Paint): number =>
  ((Math.max(...paint.rgb) + Math.min(...paint.rgb)) / 2 / CHANNEL_MAX) * PERCENT

// see T-294
function greyOf(coloured: Paint): Paint {
  return { rgb: rgbOfHsl(0, 0, lightnessOf(coloured)), alpha: coloured.alpha }
}

// see FR-041

const squash = (name: string): string => name.replace(/-/g, '').toLowerCase()

function customProperties(style: string): ReadonlyMap<string, string> {
  const found = new Map<string, string>()
  for (const match of style.matchAll(/--gr-([A-Za-z0-9-]+)\s*:\s*([^;]+);/g)) {
    found.set(squash(match[1] ?? ''), (match[2] ?? '').trim())
  }
  return found
}

function propertyOf(theme: ScreenTheme, name: string): string {
  const value = customProperties(themeStyle(theme)).get(squash(name))
  if (value === undefined) throw new Error(`themeStyle writes no --gr-<${name}> for ${JSON.stringify(theme)}`)
  return value
}

function groundOf(theme: ScreenTheme): string {
  const found = /background(?:-color)?\s*:\s*([^;]+);/.exec(pageGroundStyle(theme))
  if (found === null) throw new Error(`pageGroundStyle writes no background: ${pageGroundStyle(theme)}`)
  return (found[1] ?? '').trim()
}

// WHY: a row the export does not draw (the grab strip S-231 is chrome only) has no export colour.
function exportColourOf(rowId: string, hue: number, preference: Preference, monochrome: boolean): string | null {
  try {
    return colourOf(rowId, hue, preference === 'dark', monochrome)
  } catch {
    return null
  }
}

const HUE_NAMES = Object.keys(NAME_TO_ROW).filter((name) => HUE_ROWS.includes(NAME_TO_ROW[name] ?? ''))
const FIXED_NAMES = Object.keys(NAME_TO_ROW).filter((name) => !HUE_ROWS.includes(NAME_TO_ROW[name] ?? ''))

const theme = (preference: Preference, hue: number, monochrome: boolean): ScreenTheme => ({
  preference,
  hue,
  monochrome,
})

describe('CR-585 premises', () => {
  it('every quoted clause is in the specification as written', () => {
    for (const clause of CLAUSES_IN_REQUIREMENTS) expect(REQUIREMENTS, clause).toContain(clause)
    expect(SETTINGS_MD).toContain(CLAUSE_KEEP_LIGHTNESS)
  })

  it('table T-236: the hue column marks the rows the seam names, and the chrome rows are among them', () => {
    expect(HUE_ROWS).toEqual(
      expect.arrayContaining([S_146, 'S-149', 'S-150', 'S-231', 'S-151', 'S-155', 'S-156', 'S-157', 'S-158']),
    )
    expect(HUE_ROWS).toEqual(expect.arrayContaining(['S-164', 'S-165', 'S-166', 'S-167']))
    expect(HUE_NAMES.length, 'premise: the DOM paints hue-following rows').toBeGreaterThan(0)
    expect(FIXED_NAMES.length, 'premise: the DOM paints fixed rows too').toBeGreaterThan(0)
  })

  it('every name of the pairing is written by themeStyle', () => {
    for (const preference of PREFERENCES) {
      for (const monochrome of [false, true]) {
        for (const name of Object.keys(NAME_TO_ROW)) {
          expect(() => propertyOf(theme(preference, S_73_DEFAULT, monochrome), name), name).not.toThrow()
        }
      }
    }
  })
})

describe(`CR-585 (1)(7) FR-041 "${CLAUSE_MONOCHROME}" / T-294 "${CLAUSE_KEEP_LIGHTNESS}" -- the screen chrome`, () => {
  for (const preference of PREFERENCES) {
    for (const hue of HUES) {
      it(`${preference}, hue ${hue}: every "o" row's --gr-<name> is achromatic and keeps the HSL lightness`, () => {
        for (const name of HUE_NAMES) {
          const rowId = NAME_TO_ROW[name] ?? ''
          const written = propertyOf(theme(preference, hue, true), name)
          const drawn = mustPaint(written, `--gr-${name} (${rowId})`)
          const coloured = mustPaint(writtenOf(t236(rowId), preference, hue), `T-236 ${rowId}`)
          expect(isGrey(drawn), `${name} (${rowId}) is not grey: ${written}`).toBe(true)
          expect(samePaint(drawn, greyOf(coloured)), `${name} (${rowId}): ${written} keeps L of ${writtenOf(t236(rowId), preference, hue)}`).toBe(true)
        }
      })
    }
  }
})

describe(`CR-585 (2) FR-041 "${CLAUSE_ANY_HUE_COLUMN}" / T-294 "${CLAUSE_KEEP_LIGHTNESS}"`, () => {
  for (const preference of PREFERENCES) {
    for (const hue of HUES) {
      it(`${preference}, hue ${hue}: every "-" row's --gr-<name> is achromatic and keeps the HSL lightness`, () => {
        for (const name of FIXED_NAMES) {
          const rowId = NAME_TO_ROW[name] ?? ''
          const written = propertyOf(theme(preference, hue, true), name)
          const drawn = mustPaint(written, `--gr-${name} (${rowId})`)
          const coloured = mustPaint(writtenOf(t236(rowId), preference, hue), `T-236 ${rowId}`)
          expect(isGrey(drawn), `${name} (${rowId}) is not grey: ${written}`).toBe(true)
          expect(samePaint(drawn, greyOf(coloured)), `${name} (${rowId}): ${written} keeps L of ${writtenOf(t236(rowId), preference, hue)}`).toBe(true)
        }
      })
    }
  }
})

describe(`CR-585 (3) FR-041 "${CLAUSE_FOLLOW_T236}" -- monochrome off`, () => {
  for (const preference of PREFERENCES) {
    for (const hue of HUES) {
      it(`${preference}, hue ${hue}: every --gr-<name> is its T-236 value with H substituted`, () => {
        for (const name of Object.keys(NAME_TO_ROW)) {
          const rowId = NAME_TO_ROW[name] ?? ''
          const written = propertyOf(theme(preference, hue, false), name)
          const wanted = writtenOf(t236(rowId), preference, hue)
          // WHY: since CR-693 the frame reads the picture's T-366 value (CF-1), so a shifted row moves like the export's.
          const keeps = T366_SHIFTED_ROWS.includes(rowId)
            ? isShiftOf(written, wanted, preference)
            : samePaint(mustPaint(written, name), mustPaint(wanted, rowId))
          expect(keeps, `${name} (${rowId}): ${written} vs ${wanted}`).toBe(true)
        }
      })
    }
  }

  it('an absent monochrome is read as off (the theme before CR-585 still paints in colour)', () => {
    for (const preference of PREFERENCES) {
      expect(themeStyle({ preference, hue: S_73_DEFAULT })).toBe(themeStyle(theme(preference, S_73_DEFAULT, false)))
      expect(pageGroundStyle({ preference, hue: S_73_DEFAULT })).toBe(pageGroundStyle(theme(preference, S_73_DEFAULT, false)))
    }
  })
})

describe(`CR-585 (4) FR-041 "${CLAUSE_GROUND}" -- the page ground greys the same way`, () => {
  for (const preference of PREFERENCES) {
    for (const hue of HUES) {
      it(`${preference}, hue ${hue}: S-146 is grey with its lightness under monochrome, its T-236 value otherwise`, () => {
        const coloured = mustPaint(writtenOf(t236(S_146), preference, hue), `T-236 ${S_146}`)
        const on = mustPaint(groundOf(theme(preference, hue, true)), 'page ground (monochrome)')
        const off = mustPaint(groundOf(theme(preference, hue, false)), 'page ground')
        expect(isGrey(on), `page ground is not grey: ${groundOf(theme(preference, hue, true))}`).toBe(true)
        expect(samePaint(on, greyOf(coloured))).toBe(true)
        expect(samePaint(off, coloured)).toBe(true)
        expect(groundOf(theme(preference, hue, true))).toBe(propertyOf(theme(preference, hue, true), 'ground'))
      })
    }
  }
})

describe(`CR-585 (5) FR-041 "${CLAUSE_SAME_VALUE}"`, () => {
  const both = HUE_NAMES.filter((name) => exportColourOf(NAME_TO_ROW[name] ?? '', S_73_DEFAULT, 'light', false) !== null)

  it('premise: the export draws the ground and at least one other chrome row', () => {
    expect(both).toContain('ground')
    expect(both.length).toBeGreaterThan(1)
  })

  for (const preference of PREFERENCES) {
    for (const hue of HUES) {
      for (const monochrome of [true, false]) {
        it(`${preference}, hue ${hue}, monochrome ${monochrome}: --gr-<name> equals the export's colour for the same row`, () => {
          for (const name of both) {
            const rowId = NAME_TO_ROW[name] ?? ''
            expect(propertyOf(theme(preference, hue, monochrome), name), `${name} (${rowId})`).toBe(
              exportColourOf(rowId, hue, preference, monochrome),
            )
          }
          expect(groundOf(theme(preference, hue, monochrome)), 'page ground vs export S-146').toBe(
            exportColourOf(S_146, hue, preference, monochrome),
          )
        })
      }
    }
  }
})

describe(`CR-585 (1)(7) FR-041 "${CLAUSE_MONOCHROME}" / T-294 "${CLAUSE_KEEP_LIGHTNESS}" -- the schedule picture (export colours)`, () => {
  for (const preference of PREFERENCES) {
    for (const hue of HUES) {
      it(`${preference}, hue ${hue}: every row the picture draws ("o" and "-") is grey with its lightness`, () => {
        let drawnRows = 0
        for (const row of T236.rows) {
          const on = exportColourOf(row.id, hue, preference, true)
          const off = exportColourOf(row.id, hue, preference, false)
          if (on === null || off === null) continue
          drawnRows += 1
          const spec = t236(row.id)
          const coloured = mustPaint(writtenOf(spec, preference, hue), `T-236 ${row.id}`)
          const inherited = inheritedRowOf(row.id)
          if (inherited !== null) {
            expect(on, `${row.id} inherits ${inherited}`).toBe(exportColourOf(inherited, hue, preference, true))
            expect(off, `${row.id} inherits ${inherited}`).toBe(exportColourOf(inherited, hue, preference, false))
          } else {
            const drawn = mustPaint(on, `export ${row.id}`)
            expect(isGrey(drawn), `${row.id} is not grey: ${on}`).toBe(true)
            expect(samePaint(drawn, greyOf(coloured)), `${row.id}: ${on}`).toBe(true)
            const keeps = T366_SHIFTED_ROWS.includes(row.id)
              ? isShiftOf(off, writtenOf(spec, preference, hue), preference)
              : samePaint(mustPaint(off, row.id), coloured)
            expect(keeps, `${row.id} off: ${off}`).toBe(true)
          }
        }
        expect(drawnRows, 'premise: the export draws T-236 rows').toBeGreaterThan(0)
      })
    }
  }
})
