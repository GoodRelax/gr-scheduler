// Unit tests for the Time Ruler band of `svgFromSchedule` (unit UF-32 of table
// T-075, component CP-19 of table T-062, published as PI-19 of table T-064).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/. They sit apart from `uf-32.test.ts` because that file is the
// implementer's and this one is not (docs/development-rules/04-verification.md,
// 1.: the author of a unit may not write its tests).
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY. What was read: docs/spec/ for
// every rule below, and this unit's own head comment, exported types and
// signature. Every expected value is generated from the manuscript
// (`SETTINGS_DEFAULTS`, `SETTINGS_DERIVED`, `SCHEDULE_COLOURS`) or stated as a
// relation the specification states -- never typed in from the code.
//
// The rules these cases answer to:
//   FR-041   「地の色を自分で塗ること（MUST）。閲覧環境のシステム色に委ねては
//            ならない（MUST NOT）」and「画面の色は…表 T-236 に従うこと（MUST）」
//   FR-017   「目盛の帯の高さは、目盛の段階が変わっても動かさないこと（MUST）」
//   FR-039   「文書に保存された値が読む人の指定を強制してはならない（MUST NOT）」
//   表 T-236  `S-146`（地の色。色相追随 ○）
//   表 T-201  `S-2` / `S-3` / `S-136`, and the closing paragraph:「文字の大きさ
//            は段階によらず `rulerFont`」
//   表 T-205  `S-83` 〜 `S-85`, the three thresholds FR-017 judges the 段階 on
//   表 T-076  `EP-2`（`Time Ruler` は 描く ——「日付が読めないと日程表として
//            成り立たない」）
//   表 T-031  `SC-2`（タイムルーラー ——「横は本体と連動する。縦には流れない」）
//   `U-19` / `U-50` of `_assets/tbl-glossary.md`
//
// ⛔ STOP -- ⛔ NO ROW SETTLES A CLEARANCE UNDER THE 目盛ラベル, so the second
// half of what this file was asked to cover is not written. 表 T-201 holds
// `S-136`（`rulerLabelPad`）and calls it 「罫線と目盛ラベルの余白（縦）」, and
// `S-2` spends exactly three of them --「`rulerFont` × 3 + `rulerLabelPad` × 3」
// -- one per 段（表 T-006b の `A-1` の ⑤）. So a 段 is `rulerFont` +
// `rulerLabelPad` tall and that pad is already spent ABOVE the glyph; nothing
// in `docs/spec` gives the glyph any room BELOW it. A case asserting a gap
// would have to choose its size, and choosing it here would make this file the
// place a decision was taken. ⭐ What IS written instead: the invariants such a
// row must leave standing -- the band's height, the height of one 段, and the
// label's size at every 段階.
//
// ⭐ ONE PICTURE, NOT TWO. 表 T-076 の `EP-2` carries the `Time Ruler` into the
// exported picture as well as the screen's, and `PI-19` publishes exactly one
// function for both, so these cases are the export's too.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  SETTINGS_DERIVED,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SCHEDULE_COLOURS, svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// The values, solved from the manuscript rather than typed in.
// ---------------------------------------------------------------------------

/**
 * `S-8`（`fontMin`）. FR-017 judges the 段階 on
 * 「`pxPerDay` ÷ (実効フォントサイズ ÷ `S-8`) ≧ しきい値」, so drawing the ruler
 * at exactly `S-8` makes that divisor 1 and lets a case name a threshold of
 * 表 T-205 and get the 段階 that threshold names.
 */
const RULER_FONT = SETTINGS_DEFAULTS['fontMin'] as number

/** `S-136`（`rulerLabelPad`）——「罫線と目盛ラベルの余白（縦）」. */
const RULER_LABEL_PAD = SETTINGS_DEFAULTS['rulerLabelPad'] as number

/** `S-1`（`pxPerDayAt1x`）. FR-017: 1 日あたりの表示幅 = `S-1` × `zoomX`. */
const PX_PER_DAY_AT_1X = SETTINGS_DEFAULTS['pxPerDayAt1x'] as number

/**
 * 表 T-201 の `S-2`, solved for the two keys the manuscript writes it in terms
 * of. ⛔ The arithmetic is `S-2`'s only while the generated row still spends it
 * on those two keys, so this throws rather than quietly computing a height the
 * manuscript no longer states.
 */
const RULER_HEIGHT = ((): number => {
  const s2 = SETTINGS_DERIVED['rulerHeight']
  if (s2.from !== 'rulerFont' || s2.plusFrom !== 'rulerLabelPad') {
    throw new Error('S-2 no longer reads `rulerFont` x N + `rulerLabelPad` x M')
  }
  return RULER_FONT * s2.times + s2.plus + RULER_LABEL_PAD * s2.plusTimes
})()

/**
 * 表 T-201 の `S-2` の備考:「段階 4 は 3 段（年 / 月 / 日 ＋ 曜日）」, and FR-017
 * lets the 段階 change「中の組み方だけ」. So one 段 of the band is the band
 * divided by three.
 */
const SEGMENTS_IN_THE_BAND = 3
const SEGMENT_HEIGHT = RULER_HEIGHT / SEGMENTS_IN_THE_BAND

/** 表 T-205 —— the three thresholds, in px/day at `rulerFont` = `S-8`. */
const TIER_THRESHOLD = {
  month: SETTINGS_DEFAULTS['rulerTierPxPerDayMonth'] as number,
  week: SETTINGS_DEFAULTS['rulerTierPxPerDayWeek'] as number,
  day: SETTINGS_DEFAULTS['rulerTierPxPerDayDay'] as number,
} as const

/** The `zoomX` that puts `S-1` × `zoomX` at the px/day asked for. */
const zoomFor = (pxPerDay: number): number => pxPerDay / PX_PER_DAY_AT_1X

/**
 * One `zoomX` per 段階 of `L-1`（表 T-005a）——「年 → 年 ＋ 月 → 年 ＋ 月 ＋ 週 →
 * 年 ＋ 月 ＋ 日 ＋ 曜日」-- each set inside its own band of 表 T-205 so that no
 * case sits on a threshold. `segments` is how many 段 that 段階 holds.
 */
const TIERS = [
  { name: '年', zoomX: zoomFor(TIER_THRESHOLD.month / 2), segments: 1 },
  {
    name: '年 ＋ 月',
    zoomX: zoomFor((TIER_THRESHOLD.month + TIER_THRESHOLD.week) / 2),
    segments: 2,
  },
  {
    name: '年 ＋ 月 ＋ 週',
    zoomX: zoomFor((TIER_THRESHOLD.week + TIER_THRESHOLD.day) / 2),
    segments: 3,
  },
  {
    name: '年 ＋ 月 ＋ 日 ＋ 曜日',
    zoomX: zoomFor(TIER_THRESHOLD.day * 2),
    segments: 3,
  },
] as const

// ---------------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * ⚠️ The nested keys have to be spelled out: `SETTINGS_DEFAULTS` carries them
 * under their dotted names（`S-13` 〜 `S-17`, `S-104`）and the layout reads the
 * nested object.
 */
const SETTINGS = settingsOf({
  rulerHeight: RULER_HEIGHT, // S-2
  rulerFont: RULER_FONT, // S-3
  rulerLabelPad: RULER_LABEL_PAD, // S-136
  // `S-77`. Chosen so that the window crosses a year boundary -- and therefore
  // a month boundary and a week boundary too -- at every one of the four
  // 段階 below, which is what makes each 段 carry a label to read.
  scrollDate: '2025-12-01',
  stackDirection: 'down', // S-58 -- pinned so every y reads from the top
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
  planActualGuidePattern: { on: 2, off: 2 },
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

/**
 * ⭐ A schedule holding no `TaskGroup` at all. FR-025 の「行を足して埋めては
 * ならない（MUST NOT）」 means such a picture carries nothing a row would carry,
 * so everything left in it belongs to the `Time Ruler` -- which 表 T-076 の
 * `EP-2` draws all the same. That is what lets these cases read the band
 * without sifting バー and 行の帯 out of the way first.
 */
const EMPTY = {
  project: { calendarUid: null, statusDate: null, themeHue: 214, title: null },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const scheduleAtHue = (hue: number): Schedule =>
  ({
    ...EMPTY,
    project: { calendarUid: null, statusDate: null, themeHue: hue, title: null },
  }) as unknown as Schedule

/**
 * ADR-001 has the shell compute the rectangles, the layout and the geometry
 * once a frame and hand them round, so a case builds them the same way rather
 * than inventing coordinates the unit would then be measured against.
 */
const drawn = (schedule: Schedule = EMPTY, settings: DocumentSettings = SETTINGS): string => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  return svgFromSchedule(schedule, settings, layout, geometry, regions, selection)
}

/** `regions.timeRuler` —— `U-19`'s band, for whatever settings are handed in. */
const bandOf = (settings: DocumentSettings = SETTINGS): ScreenRect =>
  regionsFromScreen(ENV, settings).timeRuler

// ---------------------------------------------------------------------------
// Reading the answer. The unit returns a string, so these pull it apart with
// no assumption beyond "it is SVG".
// ---------------------------------------------------------------------------

interface Element {
  readonly tag: string
  readonly at: number
  readonly text: string
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const scan = /<([a-zA-Z][\w-]*)\b[^>]*>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    out.push({ tag: hit[1] as string, at: hit.index, text: hit[0] })
    hit = scan.exec(svg)
  }
  return out
}

const attribute = (element: string, name: string): string | null => {
  const hit = new RegExp(`\\b${name}="([^"]*)"`).exec(element)
  return hit === null ? null : (hit[1] as string)
}

const numberAt = (element: string, name: string): number | null => {
  const raw = attribute(element, name)
  return raw === null || raw.trim() === '' ? null : Number(raw)
}

const isSamePlace = (one: number | null, other: number): boolean =>
  one !== null && Math.abs(one - other) < 0.02

/** Every `rect` whose four numbers are the band's own. */
const groundRectsOf = (svg: string, band: ScreenRect): readonly Element[] =>
  elementsOf(svg).filter(
    (one) =>
      one.tag === 'rect' &&
      isSamePlace(numberAt(one.text, 'x'), band.x) &&
      isSamePlace(numberAt(one.text, 'y'), band.y) &&
      isSamePlace(numberAt(one.text, 'width'), band.width) &&
      isSamePlace(numberAt(one.text, 'height'), band.height),
  )

/** The one ground rect, or a failure that names the row asking for it. */
const groundOf = (svg: string, band: ScreenRect): Element => {
  const found = groundRectsOf(svg, band)
  expect(
    found.length,
    'FR-041（MUST）:「地の色を自分で塗ること」-- one `rect` over `regions.timeRuler`',
  ).toBe(1)
  return found[0] as Element
}

/** The `text` elements whose baseline falls inside the band -- the 目盛ラベル. */
const rulerTextsOf = (svg: string, band: ScreenRect): readonly Element[] =>
  elementsOf(svg).filter((one) => {
    if (one.tag !== 'text') return false
    const y = numberAt(one.text, 'y')
    return y !== null && y >= band.y && y <= band.y + band.height
  })

/** The distinct baselines the 目盛ラベル sit on, top to bottom. */
const baselinesOf = (svg: string, band: ScreenRect): readonly number[] => {
  const seen = new Set<number>()
  for (const one of rulerTextsOf(svg, band)) {
    seen.add(Math.round((numberAt(one.text, 'y') as number) * 100) / 100)
  }
  return [...seen].sort((a, b) => a - b)
}

// --- colour arithmetic, so a case can state a row of 表 T-236 ---------------

interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** `#rgb`, `#rrggbb`, `hsl(H S% L%)` and `hsl(H, S%, L%)`. */
const rgbOf = (colour: string): Rgb => {
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(colour.trim())
  if (hex !== null) {
    const body = hex[1] as string
    const wide = body.length === 3 ? body.replace(/./g, (c) => c + c) : body
    return {
      r: parseInt(wide.slice(0, 2), 16) / 255,
      g: parseInt(wide.slice(2, 4), 16) / 255,
      b: parseInt(wide.slice(4, 6), 16) / 255,
    }
  }
  const hsl = /^hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/.exec(colour.trim())
  if (hsl === null) throw new Error(`the case cannot read the colour ${colour}`)
  const h = Number(hsl[1])
  const s = Number(hsl[2]) / 100
  const l = Number(hsl[3]) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const wheel: readonly (readonly [number, number, number])[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ]
  const [r, g, b] = wheel[Math.floor(h / 60) % 6] as readonly [number, number, number]
  return { r: r + m, g: g + m, b: b + m }
}

/** The hue of a colour, 0〜359, so a case can say 「色相に追随する」. */
const hueOf = (colour: string): number => {
  const { r, g, b } = rgbOf(colour)
  const high = Math.max(r, g, b)
  const low = Math.min(r, g, b)
  if (high === low) return 0
  const span = high - low
  const raw =
    high === r ? ((g - b) / span) % 6 : high === g ? (b - r) / span + 2 : (r - g) / span + 4
  return (((raw * 60) % 360) + 360) % 360
}

/** 無彩色: no channel differs from another. */
const isAchromatic = (colour: string): boolean => {
  const { r, g, b } = rgbOf(colour)
  return Math.abs(r - g) < 0.004 && Math.abs(g - b) < 0.004
}

const isSameColour = (one: string, other: string): boolean => {
  const a = rgbOf(one)
  const b = rgbOf(other)
  return Math.abs(a.r - b.r) < 0.004 && Math.abs(a.g - b.g) < 0.004 && Math.abs(a.b - b.b) < 0.004
}

/**
 * One row of 表 T-236, solved for the theme it is drawn in. ⛔ `H` IN A HUE IS
 * NOT A TYPO -- the manuscript writes the letter where the row follows
 * `themeHue`（`S-73`）so the hue is stated once instead of copied into every
 * row, and the reader puts it in before use.
 */
const rowOfT236 = (rowId: string, hue: number, dark: boolean): string => {
  const row = SCHEDULE_COLOURS[rowId]
  if (row === undefined) throw new Error(`表 T-236 has no row ${rowId}`)
  const written = dark ? row.dark : row.light
  return row.followsHue ? written.replace('H', String(hue)) : written
}

/** The fill the band's ground was painted in, for the settings handed in. */
const groundFillOf = (settings: DocumentSettings, schedule: Schedule = EMPTY): string => {
  const ground = groundOf(drawn(schedule, settings), bandOf(settings))
  const fill = attribute(ground.text, 'fill')
  expect(fill, 'the ground rect is filled, not `none`').not.toBe(null)
  return fill as string
}

// ---------------------------------------------------------------------------
// The band's ground.
// ---------------------------------------------------------------------------

describe('UF-32 -- FR-041: the Time Ruler band paints its own ground', () => {
  it('fills `regions.timeRuler` with `S-146` in the light theme', () => {
    // FR-041:「地の色を自分で塗ること（MUST）。閲覧環境のシステム色に委ねては
    // ならない（MUST NOT）…委ねると、暗いテーマを選んでも地が明るいままになる」
    // and「画面の色は `_assets/tbl-settings.md` の 表 T-236 に従うこと（MUST）」.
    // 表 T-236 の `S-146` is 地の色, and its own 備考 is ⛔「塗らないと OS の
    // 既定が出る」.
    const settings = settingsOf({ ...SETTINGS, themePreference: 'light' })
    const fill = groundFillOf(settings)
    expect(
      isSameColour(fill, rowOfT236('S-146', 214, false)),
      `表 T-236 の S-146（明るいテーマ）: ${fill}`,
    ).toBe(true)
  })

  it('fills it with the dark value of `S-146` when `themePreference` is `dark`', () => {
    // 表 T-203 の `S-72` is `themePreference`, and FR-039 (MUST NOT) forbids a
    // saved value forcing the reader's choice -- so the band follows the choice.
    const settings = settingsOf({ ...SETTINGS, themePreference: 'dark' })
    const fill = groundFillOf(settings)
    expect(
      isSameColour(fill, rowOfT236('S-146', 214, true)),
      `表 T-236 の S-146（暗いテーマ）: ${fill}`,
    ).toBe(true)
  })

  it('moves the ground with `themeHue`, because `S-146` carries ○ in 色相追随', () => {
    // FR-041:「同表の色相の欄が、その行がテーマの色相に追随するかどうかを持つ」。
    // ⛔ READ IN THE DARK THEME. `S-146`'s light value is `#ffffff`, which is
    // 無彩色 and so cannot show a hue however faithfully it follows one.
    const settings = settingsOf({ ...SETTINGS, themePreference: 'dark' })
    expect(hueOf(groundFillOf(settings, scheduleAtHue(214))), '`themeHue` = 214').toBeCloseTo(214, 0)
    expect(hueOf(groundFillOf(settings, scheduleAtHue(30))), '`themeHue` = 30').toBeCloseTo(30, 0)
  })

  it('draws the ground 無彩色 while `themeMonochrome` holds', () => {
    // FR-041 RATIONALE:「モノクロは描画の段で効くので、人が指定した色も無彩色で
    // 描かれる。保存値は変わらないので、戻せば色も戻る」。表 T-203 の `S-74` is
    // the key, and the dark theme is the one whose `S-146` carries a hue at all.
    const settings = settingsOf({ ...SETTINGS, themePreference: 'dark', themeMonochrome: true })
    const fill = groundFillOf(settings)
    expect(isAchromatic(fill), `モノクロの地の色 (${fill})`).toBe(true)
  })

  it('paints the ground BEFORE the 目盛ラベル, so the dates stay readable', () => {
    // 表 T-076 の `EP-2` carries the `Time Ruler` into the picture with 描く and
    // the reason「日付が読めないと日程表として成り立たない」. A ground painted
    // after the labels would take the dates away, so 地 goes under them.
    const band = bandOf()
    const svg = drawn()
    const ground = groundOf(svg, band)
    const labels = rulerTextsOf(svg, band)
    expect(labels.length, 'the band carries 目盛ラベル at all').toBeGreaterThan(0)
    for (const one of labels) {
      expect(ground.at, `地 is painted before ${one.text}`).toBeLessThan(one.at)
    }
  })

  it('covers the band and nothing wider, at every 段階 of `L-1`', () => {
    // `U-19` is the `Time Ruler`; `U-50` makes the `Row Area`「`Schedule Canvas`
    // から `Time Ruler` の帯と余白を除いた、`Rows` が並ぶ領域。左右は
    // `Row Title Panel` と `Properties Panel` の内側」, so the band and the rows
    // share their x and their width, and the band does not reach into the
    // 行見出しパネル's corner. 表 T-031 の `SC-2` says the same of its movement:
    // 「横は本体と連動する」.
    // ⚠️ THE WEAKEST CASE IN THIS FILE. No row states the band AS A RECTANGLE;
    // `regions.timeRuler` is the nearest thing the specification names.
    for (const tier of TIERS) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      const regions = regionsFromScreen(ENV, settings)
      expect(regions.timeRuler.x, `${tier.name}: U-50 -- 帯と行は左端を共有する`).toBeCloseTo(
        regions.rowArea.x,
        2,
      )
      expect(regions.timeRuler.width, `${tier.name}: U-50 -- 帯と行は幅を共有する`).toBeCloseTo(
        regions.rowArea.width,
        2,
      )
      // `groundOf` asserts there is exactly one such rect at this 段階.
      groundOf(drawn(EMPTY, settings), regions.timeRuler)
    }
  })

  it('keeps the ground the same height at every 段階 (FR-017, MUST)', () => {
    // FR-017:「目盛の帯の高さは、目盛の段階が変わっても動かさないこと（MUST）。
    // 段階が変わっても外枠の高さは同じで、中の組み方だけが変わる」.
    for (const tier of TIERS) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      const ground = groundOf(drawn(EMPTY, settings), bandOf(settings))
      expect(
        numberAt(ground.text, 'height') as number,
        `${tier.name}: 地の高さは S-2 のまま`,
      ).toBeCloseTo(RULER_HEIGHT, 2)
    }
  })
})

// ---------------------------------------------------------------------------
// The 段 the labels sit in. ⛔ The clearance under a label is NOT asserted --
// see the STOP at the head of this file. These are the invariants the row that
// settles it must leave standing.
// ---------------------------------------------------------------------------

describe('UF-32 -- 表 T-201: the 段 of the band', () => {
  it('draws every 目盛ラベル at `rulerFont`, whatever the 段階', () => {
    // 表 T-201 の closing paragraph:「文字の大きさは段階によらず `rulerFont` と
    // し、段階が変えるのは帯の中の段の組み方だけである —— 段階で文字が変わると、
    // 段階 → 実効フォントサイズ → 判定 → 段階 の循環になる」.
    for (const tier of TIERS) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      const labels = rulerTextsOf(drawn(EMPTY, settings), bandOf(settings))
      expect(labels.length, `${tier.name}: 目盛ラベルがある`).toBeGreaterThan(0)
      for (const one of labels) {
        expect(
          numberAt(one.text, 'font-size') as number,
          `${tier.name}: ${one.text}`,
        ).toBeCloseTo(RULER_FONT, 2)
      }
    }
  })

  it('keeps the band at `S-2` and every baseline inside it, at every 段階', () => {
    // FR-017 again, read off the labels rather than off the ground rect, so it
    // still says something where no ground has been painted. 表 T-031 の `SC-2`
    // (「縦には流れない」) and `U-50` put everything below the band on the rows,
    // so a baseline outside the band is a label drawn over the `Row Area`.
    for (const tier of TIERS) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      const band = bandOf(settings)
      expect(band.height, `${tier.name}: 帯の高さは S-2`).toBeCloseTo(RULER_HEIGHT, 2)
      const baselines = baselinesOf(drawn(EMPTY, settings), band)
      expect(baselines.length, `${tier.name}: 目盛ラベルがある`).toBeGreaterThan(0)
      for (const baseline of baselines) {
        expect(baseline, `${tier.name}: 帯の上端より下`).toBeGreaterThan(band.y)
        expect(baseline, `${tier.name}: 帯の下端より上`).toBeLessThanOrEqual(band.y + band.height)
      }
    }
  })

  it('spends the band on 3 段 of `rulerFont` + `rulerLabelPad` where 段階 holds 3', () => {
    // 表 T-201 の `S-2`:「`rulerFont` × 3 + `rulerLabelPad` × 3」, 備考:「段階 4
    // は 3 段（年 / 月 / 日 ＋ 曜日）」, and `S-136`:「帯の高さ（`S-2`）はこれを
    // 目盛の帯の中の段（表 T-006b の `A-1` の ⑤）3 つぶん含む」。段階 3 is
    // 年 ＋ 月 ＋ 週 by `L-1`（表 T-005a）, which is three 段 as well.
    // ⛔ THIS IS THE GUARD ON `S-2`'S FORMULA. Spending six pads instead of
    // three would put `S-2`'s own 下限 above its 上限, and it shows here first:
    // the 段 would stop being `rulerFont` + `rulerLabelPad` tall.
    expect(SEGMENT_HEIGHT, 'S-2 ÷ 3 = rulerFont + rulerLabelPad').toBeCloseTo(
      RULER_FONT + RULER_LABEL_PAD,
      6,
    )
    for (const tier of TIERS.filter((one) => one.segments === SEGMENTS_IN_THE_BAND)) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      const baselines = baselinesOf(drawn(EMPTY, settings), bandOf(settings))
      expect(baselines.length, `${tier.name}: 3 段`).toBe(SEGMENTS_IN_THE_BAND)
      for (let at = 1; at < baselines.length; at += 1) {
        expect(
          (baselines[at] as number) - (baselines[at - 1] as number),
          `${tier.name}: 段の高さ`,
        ).toBeCloseTo(SEGMENT_HEIGHT, 2)
      }
    }
  })
})
