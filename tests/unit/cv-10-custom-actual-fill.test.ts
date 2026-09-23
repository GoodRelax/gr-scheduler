// CR-564: a custom colour's actual fill keeps its hue and CT-3 (T-017b CV-6, CV-7, CV-10; T-017a).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_CUSTOM_ACTUAL_LIGHTNESS,
  actualOfCustom,
  svgFromSchedule,
} from '../../src/adapter/svg-renderer/svg-renderer'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const CV_6_ACTUAL = 'カスタムカラーの実績バーの塗りは、その値から `CV-10` で導くこと（MUST）'
const CV_6_NOT_CORRECTION = '⭐ 導くのは実績という別の形であり、`CV-8` の補正ではない —— 選んだ値（予定の塗り）は動かさない'
const CV_7_MEASURED_GREY =
  '⭐ カスタムカラーの実績の塗りは、無彩色にした値どうしで `CV-10` の比を測って導く —— 色で測って決めた値を無彩色にすると、2 つの明度の差が変わって `CT-3` を割ることがある'
const CV_10_HUE = '選んだ値（`CV-3` で決まった値）を HSL で読み、色相はそのままに、次の順で実績の塗りを導くこと（MUST）'
const CV_10_RATIO =
  '比は、実績の塗りと選んだ値（予定の塗り）のコントラスト比であり、`_assets/tbl-settings.md` の 表 T-294 の前文と同じく `#rrggbb` に丸めた値で測る'
const CV_10_MONO = 'モノクロ（`FR-041`）のときは、両方を `CV-7` の無彩色にしてから測る'
const CV_10_STEP_1 =
  '① 彩度は、選んだ値の彩度に、同書の 表 T-236 の実績の塗り `S-157` と予定の塗り `S-155` の、いま描いている明暗の彩度の差を足し、0 〜 100 に収める'
const CV_10_GREY = '⭐ 彩度 0 の値（`#rrggbb` の 3 成分が等しい灰）には足さない —— 灰の色相は 0（赤）と読まれ、足すと赤みが付く'
const CV_10_STEP_2 =
  '② 明度は、選んだ値の明度に `S-157` と `S-155` の明度の差を足し、同書の 表 T-206 の `S-415` 以上 `S-416` 以下に収めた値とする'
const CV_10_STEP_2_DONE = 'その比が 表 T-017a の `CT-3` を満たせば、これで決まる'
const CV_10_STEP_3 = '③ 満たさなければ、選んだ値の明度から同じ差を引き（逆の向きに同じ量）、同じく収めた値とする'
const CV_10_STEP_4 = '④ どちらも満たさなければ、`S-415` と `S-416` のうち比の大きいほうとする'
const CV_10_CENSUS =
  '⚠️ ④ に落ちる値が残る —— 2026-09-24 に `previous-project-result/17-custom-actual-fill/` の見本の「全体の数」（測り方は数の横に書いてある）で測ると、明るいテーマで 3 色、暗いテーマで 2 色が `CT-3` に届かず、最悪は 2.92 : 1 であった（モノクロでは 0 色）'
const T_017A_REVERSE =
  '⚠️ カスタムカラーの実績は、テーマの予定から実績への向き（`_assets/tbl-settings.md` の 表 T-236 の `S-155` → `S-157`）へずらしては `CT-3` に届かない値に限り、逆の向きへずらす（表 T-017b の `CV-10` の ③） —— 同じ色相と `CT-3` の見分けを、向きより先に守る'
const T_017A_ONE_HUE = '予定と実績で別の色相を選べてはならない（MUST NOT）'

const CLAUSES = [
  CV_6_ACTUAL,
  CV_6_NOT_CORRECTION,
  CV_7_MEASURED_GREY,
  CV_10_HUE,
  CV_10_RATIO,
  CV_10_MONO,
  CV_10_STEP_1,
  CV_10_GREY,
  CV_10_STEP_2,
  CV_10_STEP_2_DONE,
  CV_10_STEP_3,
  CV_10_STEP_4,
  CV_10_CENSUS,
  T_017A_REVERSE,
  T_017A_ONE_HUE,
]

describe('CR-564 -- the clauses still stand in the manuscript', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

type Side = 'light' | 'dark'
const SIDES: readonly Side[] = ['light', 'dark']
const SIDE_COLUMN: Record<Side, string> = { light: '明るいテーマ', dark: '暗いテーマ' }

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell
}

const themeSL = (id: string, side: Side): { s: number; l: number } => {
  const hit = /hsl\(H\s+([\d.]+)%\s+([\d.]+)%\)/.exec(cellOf('T-236', id, SIDE_COLUMN[side]))
  if (hit === null) throw new Error(`${id} ${side} is not hsl(H s% l%)`)
  return { s: Number(hit[1]), l: Number(hit[2]) }
}

// see CV-10, S-155, S-157
const DELTA: Record<Side, { s: number; l: number }> = {
  light: {
    s: themeSL('S-157', 'light').s - themeSL('S-155', 'light').s,
    l: themeSL('S-157', 'light').l - themeSL('S-155', 'light').l,
  },
  dark: {
    s: themeSL('S-157', 'dark').s - themeSL('S-155', 'dark').s,
    l: themeSL('S-157', 'dark').l - themeSL('S-155', 'dark').l,
  },
}

const percentOf = (cell: string): number => {
  const hit = /([\d.]+)\s*%/.exec(cell)
  if (hit === null) throw new Error(`not a percentage: ${cell}`)
  return Number(hit[1])
}

const LOW = percentOf(cellOf('T-206', 'S-415', '既定'))
const HIGH = percentOf(cellOf('T-206', 'S-416', '既定'))

const CT_3 = (() => {
  const hit = /≧\s*([\d.]+)\s*:\s*1/.exec(cellOf('T-017a', 'CT-3', '条件'))
  if (hit === null) throw new Error('CT-3 carries no ratio')
  return Number(hit[1])
})()

type Rgb = readonly [number, number, number]

const hslToRgb = (h: number, s: number, l: number): Rgb => {
  const hue = ((h % 360) + 360) % 360
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

const rgbOfHex = (hex: string): Rgb => {
  const hit = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (hit === null) throw new Error(`not #rrggbb: ${hex}`)
  return [parseInt(hit[1]!, 16), parseInt(hit[2]!, 16), parseInt(hit[3]!, 16)]
}

const hexOf = (rgb: Rgb): string => `#${rgb.map((one) => one.toString(16).padStart(2, '0')).join('')}`

const hslOfRgb = ([red, green, blue]: Rgb): { h: number; s: number; l: number } => {
  const [r, g, b] = [red / 255, green / 255, blue / 255]
  const high = Math.max(r, g, b)
  const low = Math.min(r, g, b)
  const l = (high + low) / 2
  const c = high - low
  const s = c === 0 ? 0 : c / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (c !== 0) {
    if (high === r) h = 60 * (((g - b) / c) % 6)
    else if (high === g) h = 60 * ((b - r) / c + 2)
    else h = 60 * ((r - g) / c + 4)
  }
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 }
}

const luminance = (rgb: Rgb): number => {
  const [r, g, b] = rgb.map((one) => {
    const v = one / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as unknown as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a: Rgb, b: Rgb): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (high + 0.05) / (low + 0.05)
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

const readHsl = (css: string): { h: number; s: number; l: number } => {
  const hit = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(css.trim())
  if (hit === null) throw new Error(`actualOfCustom did not return hsl(H S% L%): ${css}`)
  return { h: Number(hit[1]), s: Number(hit[2]), l: Number(hit[3]) }
}

// see CV-7, T-294
const drawnRgb = (hsl: { h: number; s: number; l: number }, monochrome: boolean): Rgb =>
  monochrome ? hslToRgb(0, 0, hsl.l) : hslToRgb(hsl.h, hsl.s, hsl.l)

const pickRgb = (hex: string, monochrome: boolean): Rgb =>
  monochrome ? hslToRgb(0, 0, hslOfRgb(rgbOfHex(hex)).l) : rgbOfHex(hex)

interface Expected {
  readonly step: 2 | 3 | 4
  readonly h: number
  readonly s: number
  readonly l: number
  readonly ratioOf: (l: number) => number
  readonly candidates: readonly number[]
}

// see CV-10
const expectedOf = (hex: string, side: Side, monochrome: boolean): Expected => {
  const pick = hslOfRgb(rgbOfHex(hex))
  const delta = DELTA[side]
  const s = pick.s === 0 ? 0 : clamp(pick.s + delta.s, 0, 100)
  const plan = pickRgb(hex, monochrome)
  const ratioOf = (l: number): number => ratio(drawnRgb({ h: pick.h, s, l }, monochrome), plan)
  const two = clamp(pick.l + delta.l, LOW, HIGH)
  const three = clamp(pick.l - delta.l, LOW, HIGH)
  const candidates = [two, three]
  if (ratioOf(two) >= CT_3) return { step: 2, h: pick.h, s, l: two, ratioOf, candidates }
  if (ratioOf(three) >= CT_3) return { step: 3, h: pick.h, s, l: three, ratioOf, candidates }
  const four = ratioOf(LOW) >= ratioOf(HIGH) ? LOW : HIGH
  return { step: 4, h: pick.h, s, l: four, ratioOf, candidates }
}

// WHY: the seam may round H / S / L before it writes the CSS, so half a unit is allowed.
const ROUNDING = 0.5
// WHY: a candidate this close to CT-3 may cross it under that rounding, so it does not pin the step.
const NEAR_CT_3 = 0.03

const isNearCt3 = (expected: Expected): boolean =>
  expected.candidates.some((l) => Math.abs(expected.ratioOf(l) - CT_3) < NEAR_CT_3)

const hueGap = (a: number, b: number): number => {
  const gap = Math.abs((((a - b) % 360) + 360) % 360)
  return Math.min(gap, 360 - gap)
}

const actual = (hex: string, side: Side, monochrome: boolean) => readHsl(actualOfCustom(hex, side === 'dark', monochrome))

const measured = (hex: string, side: Side, monochrome: boolean): number =>
  ratio(drawnRgb(actual(hex, side, monochrome), monochrome), pickRgb(hex, monochrome))

const SWEEP: readonly string[] = (() => {
  const steps = [0, 51, 102, 153, 204, 255]
  const out: string[] = []
  for (const r of steps) for (const g of steps) for (const b of steps) out.push(hexOf([r, g, b]))
  return out
})()

const CENSUS: readonly string[] = (() => {
  const out: string[] = []
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) out.push(hexOf([r, g, b]))
  return out
})()

describe('CV-10 -- the numbers the rule reads', () => {
  it('premise: table T-236 gives the PoC deltas and table T-206 the bounds', () => {
    expect(DELTA.light).toEqual({ s: 16, l: -46 })
    expect(DELTA.dark).toEqual({ s: 30, l: 38 })
    expect([LOW, HIGH]).toEqual([15, 85])
    expect(CT_3).toBe(3)
  })

  it('the generated group NOT_STORED_CUSTOM_ACTUAL_LIGHTNESS holds S-415 and S-416 as table T-206 writes them', () => {
    const group = NOT_STORED_CUSTOM_ACTUAL_LIGHTNESS as unknown as Record<string, unknown> | undefined
    expect(group, 'the group is exported').toBeDefined()
    expect(parseFloat(String(group!['S-415']))).toBe(LOW)
    expect(parseFloat(String(group!['S-416']))).toBe(HIGH)
  })
})

describe('CV-10 -- hue and saturation', () => {
  it(CV_10_HUE, () => {
    for (const hex of ['#2a9d8f', '#1d3557', '#f4a261', '#c0504d', '#999900', '#a8c8e8']) {
      const pick = hslOfRgb(rgbOfHex(hex))
      for (const side of SIDES) {
        const drawn = actual(hex, side, false)
        expect(hueGap(drawn.h, pick.h), `${hex} ${side}: the hue is kept`).toBeLessThanOrEqual(ROUNDING)
      }
    }
  })

  it(CV_10_STEP_1, () => {
    for (const hex of ['#2a9d8f', '#1d3557', '#f4a261', '#a8c8e8']) {
      for (const side of SIDES) {
        const expected = expectedOf(hex, side, false)
        expect(Math.abs(actual(hex, side, false).s - expected.s), `${hex} ${side}`).toBeLessThanOrEqual(ROUNDING)
      }
    }
    expect(actual('#f4a261', 'dark', false).s).toBeLessThanOrEqual(100)
  })

  it(CV_10_GREY, () => {
    for (const side of SIDES) {
      const drawn = actual('#808080', side, false)
      expect(drawn.s, `${side}: no saturation is added to a grey`).toBe(0)
      const [r, g, b] = drawnRgb(drawn, false)
      expect(r === g && g === b, `${side}: the drawn grey has no tint (${hexOf([r, g, b])})`).toBe(true)
    }
  })
})

describe('CV-10 -- the lightness steps', () => {
  const pinned = (hex: string, side: Side, monochrome: boolean, step: 2 | 3 | 4, l: number) => {
    const expected = expectedOf(hex, side, monochrome)
    expect(expected.step, `premise: ${hex} ${side} mono=${monochrome} falls to step ${step}`).toBe(step)
    expect(expected.l, `premise: ${hex} ${side} mono=${monochrome}`).toBeCloseTo(l, 1)
    expect(isNearCt3(expected), 'premise: no candidate sits on the CT-3 edge').toBe(false)
    expect(Math.abs(actual(hex, side, monochrome).l - expected.l), `${hex} ${side} mono=${monochrome}`).toBeLessThanOrEqual(
      ROUNDING,
    )
  }

  it(`${CV_10_STEP_2} / ${CV_10_STEP_2_DONE}`, () => {
    pinned('#a8c8e8', 'light', false, 2, 32.43)
    pinned('#1d3557', 'dark', false, 2, 60.75)
    pinned('#f4a261', 'light', false, 2, 20.86)
    pinned('#2a9d8f', 'light', false, 2, 15)
    pinned('#c0504d', 'light', false, 2, 15)
  })

  it(CV_10_STEP_3, () => {
    pinned('#1d3557', 'light', false, 3, 68.75)
    pinned('#f4a261', 'dark', false, 3, 28.86)
    pinned('#808080', 'dark', false, 3, 15)
  })

  it(CV_10_STEP_4, () => {
    pinned('#999900', 'light', false, 4, 85)
    pinned('#999911', 'dark', false, 4, 85)
    for (const [hex, side] of [
      ['#999900', 'light'],
      ['#999911', 'dark'],
    ] as const) {
      const expected = expectedOf(hex, side, false)
      expect(expected.ratioOf(HIGH), `premise: ${hex} S-416 beats S-415`).toBeGreaterThan(expected.ratioOf(LOW))
    }
  })

  it(T_017A_REVERSE, () => {
    const light = expectedOf('#1d3557', 'light', false)
    expect(light.ratioOf(light.candidates[0]!), 'premise: the theme direction fails CT-3').toBeLessThan(CT_3)
    expect(actual('#1d3557', 'light', false).l, 'light theme: lighter than the pick').toBeGreaterThan(
      hslOfRgb(rgbOfHex('#1d3557')).l,
    )
    expect(actual('#a8c8e8', 'light', false).l, 'light theme, theme direction reaches CT-3: darker').toBeLessThan(
      hslOfRgb(rgbOfHex('#a8c8e8')).l,
    )
  })
})

describe('CV-10 -- bounds and the ratio over a sweep of picks', () => {
  it(`never outside [S-415, S-416]: ${CV_10_STEP_2}`, () => {
    for (const hex of SWEEP) {
      for (const side of SIDES) {
        for (const monochrome of [false, true]) {
          const l = actual(hex, side, monochrome).l
          expect(l, `${hex} ${side} mono=${monochrome}`).toBeGreaterThanOrEqual(LOW)
          expect(l, `${hex} ${side} mono=${monochrome}`).toBeLessThanOrEqual(HIGH)
        }
      }
    }
  })

  it(`each channel 0..255 step 51 follows steps 1-4: ${CV_10_HUE}`, () => {
    let pinnedCount = 0
    for (const hex of SWEEP) {
      const pick = hslOfRgb(rgbOfHex(hex))
      for (const side of SIDES) {
        for (const monochrome of [false, true]) {
          const expected = expectedOf(hex, side, monochrome)
          const drawn = actual(hex, side, monochrome)
          const label = `${hex} ${side} mono=${monochrome} step ${expected.step}`
          if (!monochrome) {
            if (pick.s > 0) expect(hueGap(drawn.h, pick.h), `${label}: hue`).toBeLessThanOrEqual(ROUNDING)
            expect(Math.abs(drawn.s - expected.s), `${label}: saturation`).toBeLessThanOrEqual(ROUNDING)
          }
          if (isNearCt3(expected)) continue
          pinnedCount += 1
          expect(Math.abs(drawn.l - expected.l), `${label}: lightness`).toBeLessThanOrEqual(ROUNDING)
        }
      }
    }
    expect(pinnedCount, 'premise: most of the sweep is pinned').toBeGreaterThan(SWEEP.length * 4 - 20)
  })

  it(`${CV_10_RATIO}: the actual reaches CT-3 whenever step 2 or step 3 applies`, () => {
    for (const hex of SWEEP) {
      for (const side of SIDES) {
        const expected = expectedOf(hex, side, false)
        if (expected.step === 4 || isNearCt3(expected)) continue
        expect(measured(hex, side, false), `${hex} ${side}`).toBeGreaterThanOrEqual(CT_3)
      }
    }
  })

  it(`${CV_10_MONO} / ${CV_7_MEASURED_GREY}`, () => {
    for (const hex of SWEEP) {
      for (const side of SIDES) {
        const expected = expectedOf(hex, side, true)
        if (expected.step === 4 || isNearCt3(expected)) continue
        expect(measured(hex, side, true), `${hex} ${side}: measured on the greys`).toBeGreaterThanOrEqual(CT_3)
      }
    }
    expect(expectedOf('#2a9d8f', 'light', false).step, 'premise').toBe(2)
    expect(expectedOf('#2a9d8f', 'light', true).step, 'premise').toBe(3)
    expect(Math.abs(actual('#2a9d8f', 'light', true).l - HIGH)).toBeLessThanOrEqual(ROUNDING)
    expect(measured('#2a9d8f', 'light', true)).toBeGreaterThanOrEqual(CT_3)
  })

  it(CV_10_CENSUS, () => {
    const shortOf = (of: (hex: string) => number) => CENSUS.filter((hex) => of(hex) < CT_3)
    for (const side of SIDES) {
      for (const monochrome of [false, true]) {
        const bySpec = shortOf((hex) => {
          const expected = expectedOf(hex, side, monochrome)
          return expected.ratioOf(expected.l)
        })
        const drawn = shortOf((hex) => measured(hex, side, monochrome))
        expect(drawn, `${side} mono=${monochrome}: the same picks fall short`).toEqual(bySpec)
      }
    }
    const count = (side: Side, monochrome: boolean) =>
      CENSUS.filter((hex) => {
        const expected = expectedOf(hex, side, monochrome)
        return expected.ratioOf(expected.l) < CT_3
      })
    expect(count('light', false).length).toBe(3)
    expect(count('dark', false).length).toBe(2)
    expect(count('light', true).length + count('dark', true).length).toBe(0)
    const worst = Math.min(
      ...SIDES.flatMap((side) => count(side, false).map((hex) => measured(hex, side, false))),
    )
    expect(worst.toFixed(2)).toBe('2.92')
  })
})

const HUE = 214
const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const THE_TASK = 1

const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = flat[key]
  }
  return out
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  nested({ ...SETTINGS_DEFAULTS, scrollDate: '2026-01-01', scrollGroupId: 'g1', ...part }) as unknown as DocumentSettings

const taskOf = (underWay: boolean): Task =>
  ({
    uid: THE_TASK,
    wbsParentUid: null,
    wbsOrder: null,
    name: 'alpha',
    start: '2026-01-03T08:00:00',
    finish: '2026-01-10T17:00:00',
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: underWay ? '2026-01-03T08:00:00' : null,
    actualDuration: null,
    actualFinish: null,
    stop: underWay ? '2026-01-06' : null,
    resume: null,
    resumeValid: null,
    percentComplete: underWay ? 40 : null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }) as unknown as Task

const scheduleOf = (fillColor: string, underWay: boolean): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: HUE,
      uidHighWaterMark: 100,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [taskOf(underWay)],
    resources: [],
    assignments: [],
    taskGroups: [
      {
        id: 'g1',
        parentId: null,
        label: 'row',
        derivedFromTaskUid: null,
        order: 0,
        isCollapsed: null,
        isHidden: null,
        color: null,
        height: null,
      } as unknown as TaskGroup,
    ],
    taskGroupMembers: [{ taskUid: THE_TASK, groupId: 'g1', stackOrder: null }],
    taskVisuals: [
      { taskUid: THE_TASK, shapeKind: null, milestoneGlyph: null, fillColor, strokeColor: null, lineWeight: null },
    ],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const svgOf = (schedule: Schedule, settings: DocumentSettings): string => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  return svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen')
}

const fillsOf = (svg: string): ReadonlySet<string> =>
  new Set([...svg.matchAll(/\bfill="([^"]*)"/g)].map((hit) => (hit[1] as string).toLowerCase()).filter((one) => one !== 'none'))

const rgbOfPaint = (paint: string): Rgb | null => {
  if (/^#[0-9a-f]{6}$/i.test(paint)) return rgbOfHex(paint)
  if (paint === 'black') return [0, 0, 0]
  try {
    return drawnRgb(readHsl(paint), false)
  } catch {
    return null
  }
}

const PICK = '#2a9d8f'

const drawnFills = (settings: DocumentSettings): readonly string[] => [
  ...fillsOf(svgOf(scheduleOf(`${PICK}/`, true), settings)),
]

const isClose = (one: Rgb, want: Rgb): boolean => one.every((channel, at) => Math.abs(channel - want[at]!) <= 2)

describe('CV-6 -- the renderer draws the derived actual fill', () => {
  it(`${CV_6_ACTUAL}: ${PICK}/ in the light theme is not drawn black`, () => {
    const pickHue = hslOfRgb(rgbOfHex(PICK)).h
    const expected = expectedOf(PICK, 'light', false)
    const want = hslToRgb(expected.h, expected.s, expected.l)
    const fills = drawnFills(settingsOf({ themePreference: 'light' }))
    const sameHue = fills.flatMap((one) => {
      try {
        const hsl = readHsl(one)
        return hueGap(hsl.h, pickHue) <= ROUNDING ? [hsl] : []
      } catch {
        return []
      }
    })
    for (const one of sameHue) {
      expect(one.l, `${JSON.stringify(one)}: never below S-415 (black)`).toBeGreaterThanOrEqual(LOW)
    }
    const close = fills.some((one) => {
      const rgb = rgbOfPaint(one)
      return rgb !== null && isClose(rgb, want)
    })
    expect(close, `the actual bar is drawn near ${hexOf(want)} (got ${fills.join(', ')})`).toBe(true)
    expect(ratio(want, rgbOfHex(PICK)), 'premise: that value reaches CT-3').toBeGreaterThanOrEqual(CT_3)
  })

  it(`${CV_7_MEASURED_GREY}: monochrome draws the grey step 3 chose`, () => {
    const expected = expectedOf(PICK, 'light', true)
    expect(expected.step, 'premise: the greys take step 3').toBe(3)
    const want = hslToRgb(0, 0, expected.l)
    const fills = drawnFills(settingsOf({ themePreference: 'light', themeMonochrome: true }))
    const close = fills.some((one) => {
      const rgb = rgbOfPaint(one)
      return rgb !== null && isClose(rgb, want)
    })
    expect(close, `the actual bar is the grey ${hexOf(want)} (got ${fills.join(', ')})`).toBe(true)
  })
})
