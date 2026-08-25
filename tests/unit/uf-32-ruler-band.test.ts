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
// ⭐ THE CLEARANCE UNDER THE 目盛ラベル IS SETTLED NOW. 表 T-201 の `S-179`
// (`rulerLabelBottomPad`; its name is `K-114` of 表 T-104) states it --
// 「目盛ラベルの下側の余白（縦）」-- with ⛔「帯の高さ（`S-2`）はこれを含まない
// —— 段の高さは `rulerFont` と `rulerLabelPad` のままで、この余白は文字の箱の
// 中から取る」。Read beside `S-136`, which is the pad ABOVE the label, that pins
// the baseline's offset inside its 段（表 T-006b の `A-1` の ⑤）to
// `rulerLabelPad` + `rulerFont` - `rulerLabelBottomPad`. The third describe
// below asserts exactly that, and nothing more.
//
// ⚠️ AN EARLIER REVISION OF THIS FILE CARRIED A STOP SAYING NO ROW SETTLED IT.
// The row exists, so the STOP was struck rather than left standing:
// docs/development-rules/03-implementation.md, 3., forbids a comment that lies.
//
// ⛔ STILL NOT ASSERTED -- THE GLYPH'S INK. No row gives a 目盛ラベル a height,
// so a case demanding that the drawn ink clear the 罫線 would be this file
// choosing a value. Every case below measures baselines only.
//
// ⭐ ONE PICTURE, NOT TWO. 表 T-076 の `EP-2` carries the `Time Ruler` into the
// exported picture as well as the screen's, and `PI-19` publishes exactly one
// function for both, so these cases are the export's too.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_BOUNDS,
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

/** `S-179`（`rulerLabelBottomPad`）——「目盛ラベルの下側の余白（縦）」. */
const RULER_LABEL_BOTTOM_PAD = SETTINGS_DEFAULTS['rulerLabelBottomPad'] as number

/**
 * 表 T-215 —— the px each 段（表 T-006b の `A-1` の ⑦）of `fontScale` names.
 * `S-3` の 既定値 is `fontScaleSizes[fontScale]`, so a case that wants the ruler
 * drawn at a 段 reads the size from here rather than typing 12 / 14 / 16 in.
 */
const FONT_SCALE_SIZES = {
  S: SETTINGS_DEFAULTS['fontScaleSizes.S'] as number,
  M: SETTINGS_DEFAULTS['fontScaleSizes.M'] as number,
  L: SETTINGS_DEFAULTS['fontScaleSizes.L'] as number,
} as const

/**
 * 表 T-201 の `S-179` の 下限 and 上限, read off the manuscript rather than typed
 * in. ⛔ The 上限 is stated as ANOTHER KEY（「上限が `rulerFont` なのは、超えると
 * ベースラインが段の上の罫線より上へ出るためである」）, so this keeps the key's
 * name and resolves it against whatever settings a case is drawing with. It
 * throws rather than guessing, so a manuscript that restates the bound in some
 * other shape stops the sweep instead of silently narrowing it.
 */
const BOTTOM_PAD_BOUND = ((): { readonly min: number; readonly maxKey: string } => {
  const bound = SETTINGS_BOUNDS['rulerLabelBottomPad']
  if (bound === undefined) throw new Error('表 T-201 no longer holds S-179')
  if (bound.min === undefined) throw new Error('S-179 no longer states a closed 下限')
  const ceiling = bound.maxExpression
  const first = ceiling?.[0]
  if (ceiling === undefined || ceiling.length !== 1 || first === undefined || !('key' in first)) {
    throw new Error('S-179 no longer states its 上限 as one other key')
  }
  return { min: bound.min, maxKey: first.key }
})()

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
 * The same, for a ruler drawn at some font other than `S-8`. FR-017 judges the
 * 段階 on「`pxPerDay` ÷ (実効フォントサイズ ÷ `S-8`) ≧ しきい値」, so a case that
 * changes `fontScale` has to put that divisor back to reach the same 段階.
 */
const zoomForAtFont = (pxPerDay: number, rulerFont: number): number =>
  zoomFor(pxPerDay * (rulerFont / (SETTINGS_DEFAULTS['fontMin'] as number)))

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
  rulerLabelBottomPad: RULER_LABEL_BOTTOM_PAD, // S-179
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
// The 段 the labels sit in. ⭐ These are the invariants `S-179` must leave
// standing; the clearance `S-179` itself buys is the describe after this one.
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

// ---------------------------------------------------------------------------
// `S-179` -- the room the 目盛ラベル is given under itself.
//
// 表 T-201 の `S-179`:「目盛ラベルの下側の余白（縦）。⛔ 帯の高さ（`S-2`）は
// これを含まない —— 段の高さは `rulerFont` と `rulerLabelPad` のままで、この
// 余白は文字の箱の中から取る。上限が `rulerFont` なのは、超えるとベースライン
// が段の上の罫線より上へ出るためである」。
//
// `S-136` is the pad ABOVE the label（「罫線と目盛ラベルの余白（縦）」）and `S-2`
// spends three of it, one per 段. The two together leave the baseline at
// `rulerLabelPad` + `rulerFont` - `rulerLabelBottomPad` inside its 段, and
// therefore `rulerLabelBottomPad` clear of the 罫線 that closes it.
// ---------------------------------------------------------------------------

/** `S-2` solved for a `rulerFont` other than the default -- FR-039's 追随. */
const bandHeightAt = (rulerFont: number): number => {
  const s2 = SETTINGS_DERIVED['rulerHeight']
  return rulerFont * s2.times + s2.plus + RULER_LABEL_PAD * s2.plusTimes
}

/** The 段階 of `L-1` that fills the band with three 段, at the font handed in. */
const threeSegmentZoom = (rulerFont: number): number =>
  zoomForAtFont(TIER_THRESHOLD.day * 2, rulerFont)

interface MeasuredBand {
  readonly rulerFont: number
  readonly band: ScreenRect
  readonly baselines: readonly number[]
}

/**
 * One picture drawn at a 段 of `fontScale`（表 T-006b の `A-1` の ⑦）, with `S-3`
 * and `S-2` following it. FR-039 (MUST):「文字サイズの変更は目盛にも及ぶこと ——
 * 目盛の文字と目盛の帯の高さがこれに追随し、その保存値が書き換わる（値は `S-3`
 * / `S-2`）」, so a case that changes 文字サイズ writes all three keys, not one.
 */
const bandAtFontScale = (scale: 'S' | 'M' | 'L'): MeasuredBand => {
  const rulerFont = FONT_SCALE_SIZES[scale]
  const settings = settingsOf({
    ...SETTINGS,
    fontScale: scale,
    rulerFont,
    rulerHeight: bandHeightAt(rulerFont),
    zoomX: threeSegmentZoom(rulerFont),
  })
  const band = bandOf(settings)
  return { rulerFont, band, baselines: baselinesOf(drawn(EMPTY, settings), band) }
}

/** `S-179` の 上限, resolved through the key the manuscript states it with. */
const bottomPadCeiling = (rulerFont: number): number => {
  const source = { ...SETTINGS, rulerFont } as unknown as Record<string, number>
  const ceiling = source[BOTTOM_PAD_BOUND.maxKey]
  if (typeof ceiling !== 'number') {
    throw new Error(`S-179's 上限 names ${BOTTOM_PAD_BOUND.maxKey}, which carries no number`)
  }
  return ceiling
}

/** 下限 to 上限 in even steps, both endpoints included. */
const legalBottomPads = (rulerFont: number): readonly number[] => {
  const low = BOTTOM_PAD_BOUND.min
  const high = bottomPadCeiling(rulerFont)
  const steps = 8
  return Array.from({ length: steps + 1 }, (_, at) => low + ((high - low) * at) / steps)
}

/** The band and its 目盛ラベル at 段階 4, for the settings handed in. */
const threeSegmentBand = (part: Record<string, unknown>): MeasuredBand => {
  const settings = settingsOf({ ...SETTINGS, ...part })
  const band = bandOf(settings)
  return {
    rulerFont: RULER_FONT,
    band,
    baselines: baselinesOf(drawn(EMPTY, settings), band),
  }
}

describe('UF-32 -- 表 T-201 の `S-179`: the 目盛ラベル clears the rule below it', () => {
  it('leaves `rulerLabelBottomPad` between a baseline and the rule closing its 段', () => {
    // `S-179`:「目盛ラベルの下側の余白（縦）」. A 段 of the band is `rulerFont` +
    // `rulerLabelPad` tall (`S-2` with `S-136`), the pad ABOVE the glyph is
    // `rulerLabelPad`, and `S-179` takes its room「文字の箱の中から」-- so what
    // is left under the baseline is `S-179` itself.
    // ⛔ WITHOUT THE LIFT THIS IS ZERO: `rulerLabelPad` + `rulerFont` is the
    // whole 段, and the baseline lands ON the 罫線 that opens the next one.
    for (const tier of TIERS.filter((one) => one.segments === SEGMENTS_IN_THE_BAND)) {
      const { band, baselines } = threeSegmentBand({ zoomX: tier.zoomX })
      expect(baselines.length, `${tier.name}: 3 段`).toBe(SEGMENTS_IN_THE_BAND)
      for (let at = 0; at < baselines.length; at += 1) {
        expect(
          band.y + (at + 1) * SEGMENT_HEIGHT - (baselines[at] as number),
          `${tier.name}: 段 ${at + 1} -- 下の罫線まで S-179 のぶん空く`,
        ).toBeCloseTo(RULER_LABEL_BOTTOM_PAD, 2)
      }
    }
  })

  it('clears the band foot rule by the same amount as any other 段', () => {
    // `S-2` spends the band on three 段 and FR-017 (MUST) holds the band's
    // height still across 段階（「目盛の帯の高さは、目盛の段階が変わっても動かさ
    // ないこと」）, so the third 段's closing 罫線 IS the band's foot. No row
    // states the foot separately, and none needs to.
    for (const tier of TIERS.filter((one) => one.segments === SEGMENTS_IN_THE_BAND)) {
      const { band, baselines } = threeSegmentBand({ zoomX: tier.zoomX })
      expect(
        band.y + SEGMENTS_IN_THE_BAND * SEGMENT_HEIGHT,
        `${tier.name}: 3 段目の罫線は帯の下端そのものである`,
      ).toBeCloseTo(band.y + band.height, 6)
      const last = baselines[baselines.length - 1] as number
      expect(
        band.y + band.height - last,
        `${tier.name}: 帯の下端の罫線も S-179 のぶん空く`,
      ).toBeCloseTo(RULER_LABEL_BOTTOM_PAD, 2)
    }
  })

  it('sets the baseline `rulerLabelPad` + `rulerFont` - `rulerLabelBottomPad` into its 段', () => {
    // The offset `S-136` and `S-179` pin between them, read from the 罫線 that
    // OPENS the 段 rather than the one that closes it. ⭐ Put this way the case
    // never names what the three values are, so it survives an edit to any.
    const expected = RULER_LABEL_PAD + RULER_FONT - RULER_LABEL_BOTTOM_PAD
    for (const tier of TIERS.filter((one) => one.segments === SEGMENTS_IN_THE_BAND)) {
      const { band, baselines } = threeSegmentBand({ zoomX: tier.zoomX })
      for (let at = 0; at < baselines.length; at += 1) {
        expect(
          (baselines[at] as number) - (band.y + at * SEGMENT_HEIGHT),
          `${tier.name}: 段 ${at + 1} の中でのベースラインの位置`,
        ).toBeCloseTo(expected, 2)
      }
    }
  })

  it('sets the FIRST baseline that far below the band top edge, at every 段階', () => {
    // ⭐ THE ONE FORM THAT HOLDS AT ALL FOUR 段階. 段 1 opens on the band's own
    // top edge whatever `L-1`（表 T-005a）is showing, so its offset can be read
    // without knowing how many 段 the band was divided into. ⚠️ THE CLEARANCE
    // UNDER A BASELINE CANNOT: it equals `S-179` only where a 段 is `rulerFont`
    // + `rulerLabelPad` tall, which is 段階 3 and 段階 4. At 段階 1 and 2 the
    // band is spent on fewer 段, each of them taller, and the room below is
    // larger -- so the cases above are restricted to the 3 段 段階 on purpose.
    // ⚠️ WHAT THIS ONE ASSUMES: that the pad ABOVE a label is `S-136` whatever
    // the 段 is tall. `S-136` is「罫線と目盛ラベルの余白（縦）」 and names no
    // dependence on the 段's height, so a lone 段 does not centre its label in
    // the band. ⛔ If the drawing ever does centre it, the disagreement is with
    // `S-136`, not with this case.
    const expected = RULER_LABEL_PAD + RULER_FONT - RULER_LABEL_BOTTOM_PAD
    for (const tier of TIERS) {
      const { band, baselines } = threeSegmentBand({ zoomX: tier.zoomX })
      expect(baselines.length, `${tier.name}: 目盛ラベルがある`).toBeGreaterThan(0)
      expect(
        (baselines[0] as number) - band.y,
        `${tier.name}: 段 1 のベースラインは帯の上端からこの位置`,
      ).toBeCloseTo(expected, 2)
    }
  })

  it('leaves the SAME clearance at every 文字サイズ, because `S-179` is stated in px', () => {
    // FR-039 (MUST) carries 文字サイズ into the ruler and 表 T-215 gives the
    // three 段 their px. ⭐ `S-179` の 既定値 is a plain px value rather than an
    // expression over `rulerFont`, so the room under the label does NOT scale
    // with the glyph -- it is the same number at S, M and L.
    for (const scale of ['S', 'M', 'L'] as const) {
      const at = bandAtFontScale(scale)
      expect(at.band.height, `${scale}: 帯の高さは S-2 が S-3 に追随した値`).toBeCloseTo(
        bandHeightAt(at.rulerFont),
        2,
      )
      expect(at.baselines.length, `${scale}: 3 段`).toBe(SEGMENTS_IN_THE_BAND)
      const last = at.baselines[at.baselines.length - 1] as number
      expect(at.band.y + at.band.height - last, `${scale}: 罫線までの空き`).toBeCloseTo(
        RULER_LABEL_BOTTOM_PAD,
        2,
      )
    }
  })

  it('never lifts a baseline above the rule that OPENS its 段, at any legal value', () => {
    // `S-179` の 上限 の理由:「超えるとベースラインが段の上の罫線より上へ出る
    // ためである」. At the 上限 the offset left is `rulerLabelPad`, which `S-136`
    // の 下限 keeps at 0 or above -- so no legal value puts a baseline over the
    // 罫線 above it. ⚠️ 段 1's opening 罫線 is the band's own top edge, which is
    // where the ground of 表 T-236 の `S-146` starts, so this is also what keeps
    // the first label off the ground rect's edge.
    for (const bottomPad of legalBottomPads(RULER_FONT)) {
      const { band, baselines } = threeSegmentBand({
        zoomX: threeSegmentZoom(RULER_FONT),
        rulerLabelBottomPad: bottomPad,
      })
      expect(baselines.length, `rulerLabelBottomPad = ${bottomPad}: 3 段`).toBe(
        SEGMENTS_IN_THE_BAND,
      )
      for (let at = 0; at < baselines.length; at += 1) {
        expect(
          (baselines[at] as number) - (band.y + at * SEGMENT_HEIGHT),
          `rulerLabelBottomPad = ${bottomPad}: 段 ${at + 1} は上の罫線を越えない`,
        ).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('spends no band height on `S-179`, at any legal value', () => {
    // ⛔ THE GUARD AGAINST 'FIXING' THIS BY GROWING THE BAND. `S-179` の 備考:
    // ⛔「帯の高さ（`S-2`）はこれを含まない —— 段の高さは `rulerFont` と
    // `rulerLabelPad` のままで、この余白は文字の箱の中から取る」, and `S-2` の
    // 既定値 spends three of `S-136` and none of `S-179`. Spending six pads
    // instead would put `S-2`'s own 下限 above its own 上限.
    expect(
      SETTINGS_DERIVED['rulerHeight'].plusTimes,
      'S-2 spends `rulerLabelPad` three times, not six',
    ).toBe(SEGMENTS_IN_THE_BAND)
    for (const bottomPad of legalBottomPads(RULER_FONT)) {
      const { band, baselines } = threeSegmentBand({
        zoomX: threeSegmentZoom(RULER_FONT),
        rulerLabelBottomPad: bottomPad,
      })
      expect(band.height, `rulerLabelBottomPad = ${bottomPad}: 帯の高さは S-2 のまま`).toBeCloseTo(
        RULER_HEIGHT,
        2,
      )
      for (let at = 1; at < baselines.length; at += 1) {
        expect(
          (baselines[at] as number) - (baselines[at - 1] as number),
          `rulerLabelBottomPad = ${bottomPad}: 段の高さは rulerFont + rulerLabelPad`,
        ).toBeCloseTo(RULER_FONT + RULER_LABEL_PAD, 2)
      }
    }
  })
})
