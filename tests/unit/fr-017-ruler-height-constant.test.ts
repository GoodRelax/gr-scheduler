// Unit tests for FR-017 -- the Time Ruler keeps ONE band height whatever tier
// it is showing, at every one of the three text sizes of table T-215.
//
// The unit under test is UF-5 (`ScheduleLayout`, table T-075) together with the
// band UF-32 draws (`svgFromSchedule`, published as PI-19 of table T-064). The
// tier itself is carried on `ScheduleLayout.tier`, which PI-5 publishes as part
// of the type; MN-6 forbids the drawing side from solving it again.
//
// ⛔ WRITTEN WITHOUT READING THE UNITS' BODIES. What was read: docs/spec for
// every rule below, and the exported types and signatures of the functions
// called. Every expected number is generated from the manuscript
// (`SETTINGS_DEFAULTS`, `SETTINGS_DERIVED`) or is a relation the specification
// states -- never typed in from the code.
//
// This file sits beside `uf-32-ruler-band.test.ts` and does not repeat it. That
// file pins the band at ONE ruler font (`S-8`); this one sweeps the four tiers
// of `L-1` ACROSS the three text sizes, which is the pair of axes FR-017 rules
// on -- one it forbids to move the height, one it expressly allows to move it.
//
// The rules these cases answer to:
//   FR-017  STATEMENT: the granularity switches between four tiers decided by
//           the width of one day, which MUST be `S-1` multiplied by `zoomX`;
//           the thresholds MUST be the rows `S-83`..`S-85` of table T-205.
//   FR-017  the judgement MUST divide px/day by (effective font size / `S-8`),
//           the effective font size being the `rulerFont` px the ruler is being
//           drawn at, and the comparison is "greater than or equal".
//   FR-017  RATIONALE: the tiers MUST be monotone -- zooming in never makes the
//           ruler coarser.
//   FR-017  the band height MUST NOT move when the tier changes; the outer
//           frame stays and only the arrangement inside it changes. The same
//           paragraph states that a height change driven by `fontScale` is NOT
//           caught by that prohibition, because `fontScale` is independent of
//           zoom and so closes no cycle.
//   表 T-201 `S-2` (band height = `rulerFont` x 3 + `rulerLabelPad` x 3, and its
//           remark: tier 4 holds three 段), `S-3` (`rulerFont`, which follows
//           `fontScale`), `S-136` (`rulerLabelPad`), `S-1` (`pxPerDayAt1x`).
//   表 T-201 closing paragraph: the label size is `rulerFont` whatever the tier;
//           what a tier changes is only how the band is divided inside.
//   表 T-205 `S-83` / `S-84` / `S-85`, the three thresholds, quoted as px/day at
//           a 12px ruler font.
//   表 T-215 `S-121` / `S-122` / `S-123` -- the px of `S` / `M` / `L`.
//   表 T-005a `L-1` -- the four tiers, in order: year; year + month;
//           year + month + week; year + month + day + weekday.
//   U-50    the Row Area is the canvas less the Time Ruler band, so a band that
//           moved with the tier would drag the rows with it -- the cycle
//           FR-017 names.
//
// ⛔ NOT ASSERTED -- HOW A TIER WITH FEWER THAN THREE 段 SPENDS THE HEIGHT.
// FR-017 says only that the arrangement inside changes; `S-2`'s remark gives
// three 段 for tier 4 alone. Nothing states whether tier 1 (year by itself)
// draws one tall 段, one short 段 with the rest left empty, or three. A case
// demanding any of those would be this file inventing the rule, so the last
// case below asserts only what both sources do state: never more than three,
// and never more 段 at a coarser tier than at a finer one.
//
// ⚠️ THE EXACT TIE IS NOT ASSERTED. FR-017's comparison is "greater than or
// equal", so a px/day landing exactly on a threshold belongs to the finer tier.
// A case cannot build a `zoomX` that lands there exactly in binary floating
// point, so the boundary cases below step off the threshold by one part in a
// billion on each side -- far inside any legal implementation's tolerance and
// far outside double rounding error.

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
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// The values, solved from the manuscript rather than typed in.
// ---------------------------------------------------------------------------

/** `S-8`（`fontMin`）-- the 12px FR-017 states its thresholds against. */
const FONT_MIN = SETTINGS_DEFAULTS['fontMin'] as number

/** `S-136`（`rulerLabelPad`）-- the pad `S-2` counts three of. */
const RULER_LABEL_PAD = SETTINGS_DEFAULTS['rulerLabelPad'] as number

/** `S-1`（`pxPerDayAt1x`）-- FR-017: one day is this multiplied by `zoomX`. */
const PX_PER_DAY_AT_1X = SETTINGS_DEFAULTS['pxPerDayAt1x'] as number

/** 表 T-215 -- the px of each `fontScale`, which `S-3` says `rulerFont` follows. */
const FONT_SCALES = [
  { name: 'S', font: SETTINGS_DEFAULTS['fontScaleSizes.S'] as number },
  { name: 'M', font: SETTINGS_DEFAULTS['fontScaleSizes.M'] as number },
  { name: 'L', font: SETTINGS_DEFAULTS['fontScaleSizes.L'] as number },
] as const

const FONT_SCALE_SIZES = {
  S: FONT_SCALES[0].font,
  M: FONT_SCALES[1].font,
  L: FONT_SCALES[2].font,
} as const

/**
 * 表 T-201 の `S-2`, solved for the two keys the manuscript spends it on.
 * ⛔ It throws rather than quietly computing a height the manuscript no longer
 * states, so a rewritten row stops the sweep instead of moving its expectations.
 */
const rulerHeightOf = (rulerFont: number): number => {
  const s2 = SETTINGS_DERIVED['rulerHeight']
  if (s2.from !== 'rulerFont' || s2.plusFrom !== 'rulerLabelPad') {
    throw new Error('S-2 no longer reads `rulerFont` x N + `rulerLabelPad` x M')
  }
  return rulerFont * s2.times + s2.plus + RULER_LABEL_PAD * s2.plusTimes
}

/**
 * 表 T-201 の `S-2`'s remark:「段階 4 は 3 段」, and `S-3`'s 上限
 * ((`rulerHeight` - `rulerLabelPad` x 3) / 3) says the same from the other end:
 * the band holds three 段 and no more.
 */
const MOST_SEGMENTS = 3

/** 表 T-205 -- the three thresholds, in px/day at a 12px ruler font. */
const THRESHOLD = {
  month: SETTINGS_DEFAULTS['rulerTierPxPerDayMonth'] as number,
  week: SETTINGS_DEFAULTS['rulerTierPxPerDayWeek'] as number,
  day: SETTINGS_DEFAULTS['rulerTierPxPerDayDay'] as number,
} as const

/**
 * One px/day inside each of the four bands of `L-1`, so that no sample sits on
 * a threshold. These are px/day AS TABLE T-205 QUOTES THEM -- at a 12px ruler
 * font. `zoomFor` puts the font correction back.
 */
const TIER_SAMPLE = [
  { tier: 1, name: 'year', pxPerDay: THRESHOLD.month / 2 },
  { tier: 2, name: 'year + month', pxPerDay: (THRESHOLD.month + THRESHOLD.week) / 2 },
  { tier: 3, name: 'year + month + week', pxPerDay: (THRESHOLD.week + THRESHOLD.day) / 2 },
  { tier: 4, name: 'year + month + day + weekday', pxPerDay: THRESHOLD.day * 2 },
] as const

/**
 * The `zoomX` that puts the ruler at the quoted px/day when it is drawn at
 * `rulerFont`. FR-017 judges on `pxPerDay / (effective font size / S-8)`, so a
 * ruler drawn larger than `S-8` needs proportionally more px/day to reach the
 * same tier. ⚠️ THIS IS THE FONT CORRECTION ITSELF, RESTATED AS AN INPUT: a
 * ruler that judged on raw px/day would answer these cases with the wrong tier
 * at `M` and `L`, and with the right one at `S`, where the divisor is 1.
 */
const zoomFor = (pxPerDayAt12px: number, rulerFont: number): number =>
  (pxPerDayAt12px * (rulerFont / FONT_MIN)) / PX_PER_DAY_AT_1X

/** One part in a billion, the step used to sit just off a threshold. */
const HAIR = 1e-9

/**
 * The two ends of the monotonicity sweep, SOLVED FROM 表 T-205 rather than
 * typed in. The sweep has to start inside the first band of `L-1` and finish
 * inside the fourth, so it borrows the two px/day this file has already solved
 * for those bands: `TIER_SAMPLE[0]` sits below `S-83`, `TIER_SAMPLE[3]` above
 * `S-85`. Both are quoted at a 12px ruler font, as 表 T-205 quotes them.
 *
 * ⛔ NO px/day IS WRITTEN AS A LITERAL HERE. Ends written as literals stop
 * covering the four tiers the moment a threshold moves past them, and that is
 * exactly what 表 T-205 の `S-85` did: its own remark records the row moving
 * TWICE, up when `LF-1` stopped thinning and back down when the weekday got a
 * 段 of its own and stopped binding the width beside the day's digits. ⚠️ Both
 * moves happened after this sweep was written, and neither reached it.
 */
const SWEEP_FROM = TIER_SAMPLE[0].pxPerDay
const SWEEP_TO = TIER_SAMPLE[3].pxPerDay

/** The four bands the sweep crosses, foot to top: the ends and the thresholds. */
const SWEEP_EDGES: readonly number[] = [
  SWEEP_FROM,
  THRESHOLD.month,
  THRESHOLD.week,
  THRESHOLD.day,
  SWEEP_TO,
]

/**
 * The narrowest of those bands, measured as a RATIO. ⭐ The sweep steps
 * multiplicatively because zoom is multiplicative -- 表 T-201 の `S-53`
 * (`zoomStep`) is a factor and not an addend, and 表 T-206 の `S-96` reads it
 * as how many times one notch moves the zoom -- and because the three
 * thresholds span more than one order of magnitude, so a step fine enough for
 * the narrowest band would be pointlessly fine for the widest.
 * ⛔ It throws rather than sweeping a band it cannot cross: 表 T-205 orders the
 * three thresholds by naming each row's neighbour as its own bound
 * (`S-83` <= `S-84` <= `S-85`), so a ratio at or below 1 means the table no
 * longer holds the order this sweep rests on.
 */
const narrowestBandOf = (edges: readonly number[]): number => {
  let narrowest = Number.POSITIVE_INFINITY
  for (let index = 1; index < edges.length; index += 1) {
    narrowest = Math.min(narrowest, (edges[index] as number) / (edges[index - 1] as number))
  }
  if (!(narrowest > 1)) {
    throw new Error('T-205 no longer orders the thresholds S-83 <= S-84 <= S-85')
  }
  return narrowest
}

/**
 * How many samples the sweep is made to take inside the NARROWEST band, which
 * is what fixes its step. ⚠️ This is the case's own resolution, not a value of
 * any settings table -- nothing is asserted about it. It only has to be more
 * than one, so that no band can be stepped clean over however the thresholds
 * move.
 */
const SWEEP_SAMPLES_PER_BAND = 20

/** The number of multiplicative steps that resolution asks for. */
const SWEEP_STEPS = Math.ceil(
  (SWEEP_SAMPLES_PER_BAND * Math.log(SWEEP_TO / SWEEP_FROM)) /
    Math.log(narrowestBandOf(SWEEP_EDGES)),
)

/** The factor one step multiplies px/day by, so that step `SWEEP_STEPS` lands on `SWEEP_TO`. */
const SWEEP_RATIO = (SWEEP_TO / SWEEP_FROM) ** (1 / SWEEP_STEPS)

// ---------------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------------

/**
 * ⚠️ The nested keys have to be spelled out: `SETTINGS_DEFAULTS` carries them
 * under their dotted names and the layout reads the nested objects.
 *
 * ⭐ `rulerFont` and `rulerHeight` are handed in together rather than left to
 * follow `fontScale` on their own. FR-039 is what rewrites the two stored
 * values when a reader changes the text size, and that rewrite is FR-039's
 * case to answer, not FR-017's. These cases state the pair the manuscript
 * pairs -- `S-3` at the text size, `S-2` solved from it -- and ask FR-017 only
 * whether the tier can move the result.
 */
const settingsAt = (rulerFont: number, zoomX: number, fontScale: string): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    fontScale,
    fontScaleSizes: FONT_SCALE_SIZES,
    rulerFont, // S-3
    rulerHeight: rulerHeightOf(rulerFont), // S-2
    rulerLabelPad: RULER_LABEL_PAD, // S-136
    zoomX, // S-75
    // `S-77`. Chosen so the window crosses a year boundary -- and therefore a
    // month, a week and a day boundary -- at every one of the four tiers, which
    // is what gives every 段 of the band a label to read.
    scrollDate: '2025-12-01',
    stackDirection: 'down', // S-58 -- pinned so every y reads from the top
    shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
    planActualGuidePattern: { on: 2, off: 2 },
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

/**
 * ⭐ A schedule holding no `TaskGroup` at all. FR-025 forbids padding a picture
 * with rows that carry nothing, so everything left in the picture belongs to
 * the `Time Ruler` -- which table T-076 の `EP-2` draws all the same. That is
 * what lets these cases read the band without sifting bars out of the way.
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

/**
 * ADR-001 has the shell compute the rectangles, the layout and the geometry
 * once a frame and hand them round, so a case builds them the same way rather
 * than inventing coordinates the units would then be measured against.
 */
const drawn = (settings: DocumentSettings): string => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(EMPTY, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(EMPTY, settings, layout, regions, selection)
  // 'screen' is EP-14's other arm: the export draws no dummy. These cases are
  // about what a reader sees, so they ask for the screen's picture.
  return svgFromSchedule(EMPTY, settings, layout, geometry, regions, selection, 'screen')
}

/** `regions.timeRuler` -- the band, for whatever settings are handed in. */
const bandOf = (settings: DocumentSettings): ScreenRect =>
  regionsFromScreen(ENV, settings).timeRuler

/** `ScheduleLayout.tier` -- the tier FR-017 decided on, for those settings. */
const tierOf = (settings: DocumentSettings): string =>
  layoutFromSchedule(EMPTY, settings, regionsFromScreen(ENV, settings)).tier

/** The tier at a px/day quoted at 12px, drawn at `rulerFont`. */
const tierAt = (pxPerDayAt12px: number, rulerFont: number, fontScale: string): string =>
  tierOf(settingsAt(rulerFont, zoomFor(pxPerDayAt12px, rulerFont), fontScale))

// ---------------------------------------------------------------------------
// Reading the answer. The renderer returns a string, so these pull it apart
// with no assumption beyond "it is SVG".
// ---------------------------------------------------------------------------

interface Element {
  readonly tag: string
  readonly text: string
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const scan = /<([a-zA-Z][\w-]*)\b[^>]*>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    out.push({ tag: hit[1] as string, text: hit[0] })
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

/** The one `rect` laid over the band, or a failure that says so. */
const groundOf = (svg: string, band: ScreenRect, where: string): Element => {
  const found = elementsOf(svg).filter(
    (one) =>
      one.tag === 'rect' &&
      isSamePlace(numberAt(one.text, 'x'), band.x) &&
      isSamePlace(numberAt(one.text, 'y'), band.y) &&
      isSamePlace(numberAt(one.text, 'width'), band.width) &&
      isSamePlace(numberAt(one.text, 'height'), band.height),
  )
  expect(found.length, `${where}: FR-041 -- one \`rect\` over \`regions.timeRuler\``).toBe(1)
  return found[0] as Element
}

/** The `text` elements whose baseline falls inside the band -- the ruler labels. */
const rulerTextsOf = (svg: string, band: ScreenRect): readonly Element[] =>
  elementsOf(svg).filter((one) => {
    if (one.tag !== 'text') return false
    const y = numberAt(one.text, 'y')
    return y !== null && y >= band.y && y <= band.y + band.height
  })

/** The distinct baselines the ruler labels sit on, top to bottom. */
const baselinesOf = (svg: string, band: ScreenRect): readonly number[] => {
  const seen = new Set<number>()
  for (const one of rulerTextsOf(svg, band)) {
    seen.add(Math.round((numberAt(one.text, 'y') as number) * 100) / 100)
  }
  return [...seen].sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// First, that the four tiers are really reached -- otherwise every case below
// this one would be measuring one tier four times over and passing for free.
// ---------------------------------------------------------------------------

describe('FR-017 -- the four tiers of `L-1`, judged on the corrected px/day', () => {
  it('gives one day the width `S-1` x `zoomX` (FR-017, MUST)', () => {
    // FR-017 STATEMENT:「1 日あたりの表示幅は、表 T-201 の `S-1` に `zoomX` を
    // 掛けた値とすること（MUST）」. Everything else in this file rests on it, so
    // it is asserted before the tiers that are decided from it.
    for (const scale of FONT_SCALES) {
      for (const sample of TIER_SAMPLE) {
        const zoomX = zoomFor(sample.pxPerDay, scale.font)
        const settings = settingsAt(scale.font, zoomX, scale.name)
        const layout = layoutFromSchedule(EMPTY, settings, regionsFromScreen(ENV, settings))
        expect(layout.pxPerDay, `${scale.name} / ${sample.name}: S-1 x zoomX`).toBeCloseTo(
          PX_PER_DAY_AT_1X * zoomX,
          9,
        )
      }
    }
  })

  it('reaches four DISTINCT tiers at every text size (FR-017 STATEMENT)', () => {
    // FR-017:「タイムルーラーの粒度を 1 日あたりの表示幅から決まる 4 段階へ
    // 切り替える」, and `L-1`（表 T-005a）names those four. Each sample sits
    // inside its own band of 表 T-205, so four samples must give four answers.
    // ⚠️ At `M` and `L` this can only hold if the judgement divides px/day by
    // (`rulerFont` / `S-8`) as FR-017 requires -- a ruler judging raw px/day
    // answers the third sample with the fourth sample's tier.
    for (const scale of FONT_SCALES) {
      const tiers = TIER_SAMPLE.map((sample) => tierAt(sample.pxPerDay, scale.font, scale.name))
      expect(new Set(tiers).size, `${scale.name}: four tiers, got ${tiers.join(' / ')}`).toBe(
        TIER_SAMPLE.length,
      )
    }
  })

  it('switches at `S-83` / `S-84` / `S-85`, and not between them', () => {
    // FR-017:「しきい値は表 T-205 のしきい値の行（`S-83` 〜 `S-85`）に従うこと」
    // and「判定式は `pxPerDay ÷ (実効フォントサイズ ÷ S-8) ≧ しきい値` とする」.
    // A hair below a threshold and a hair above it must answer differently, and
    // each side must answer with the tier of the band it is in.
    const bands = [
      { below: TIER_SAMPLE[0], at: THRESHOLD.month, above: TIER_SAMPLE[1] },
      { below: TIER_SAMPLE[1], at: THRESHOLD.week, above: TIER_SAMPLE[2] },
      { below: TIER_SAMPLE[2], at: THRESHOLD.day, above: TIER_SAMPLE[3] },
    ] as const
    for (const scale of FONT_SCALES) {
      for (const band of bands) {
        const under = tierAt(band.at * (1 - HAIR), scale.font, scale.name)
        const over = tierAt(band.at * (1 + HAIR), scale.font, scale.name)
        expect(under, `${scale.name}: ${band.at} px/day is a boundary`).not.toBe(over)
        expect(under, `${scale.name}: below ${band.at} is ${band.below.name}`).toBe(
          tierAt(band.below.pxPerDay, scale.font, scale.name),
        )
        expect(over, `${scale.name}: above ${band.at} is ${band.above.name}`).toBe(
          tierAt(band.above.pxPerDay, scale.font, scale.name),
        )
      }
    }
  })

  it('never coarsens as px/day grows (FR-017 RATIONALE, MUST)', () => {
    // FR-017 RATIONALE:「単調であること（MUST）—— 拡大すると細かくなる一方で、
    // 粗くなる逆転を起こさない」. Stated without naming which value is coarser:
    // a monotone sweep leaves each tier once and never returns to it.
    // ⭐ THE SWEEP'S ENDS AND ITS STEP ARE SOLVED FROM 表 T-205, never written
    // as literals: it runs from inside the first band of `L-1` to inside the
    // fourth (`SWEEP_FROM` / `SWEEP_TO`), taking `SWEEP_SAMPLES_PER_BAND`
    // samples inside even the narrowest band. Wherever `S-83` / `S-84` / `S-85`
    // are moved to, the sweep still spans all four tiers and still lands inside
    // each of them, so the closing assertion cannot pass by the sweep having
    // shrunk. ⚠️ The closing assertion is the one that catches that: `left`
    // holds every tier the sweep left behind, so `left.size + 1` counts every
    // DISTINCT tier the sweep saw, and `L-1`（表 T-005a）names four.
    for (const scale of FONT_SCALES) {
      const left = new Set<string>()
      let held: string | null = null
      for (let step = 0; step <= SWEEP_STEPS; step += 1) {
        const pxPerDay = SWEEP_FROM * SWEEP_RATIO ** step
        const tier = tierAt(pxPerDay, scale.font, scale.name)
        if (tier === held) continue
        expect(left.has(tier), `${scale.name}: ${pxPerDay} px/day returns to ${tier}`).toBe(false)
        if (held !== null) left.add(held)
        held = tier
      }
      expect(left.size + 1, `${scale.name}: the sweep crosses all three thresholds`).toBe(
        TIER_SAMPLE.length,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// The height itself.
// ---------------------------------------------------------------------------

describe('FR-017 -- the band height does not move with the tier', () => {
  it('keeps `regions.timeRuler` at `S-2` at every tier and every text size', () => {
    // FR-017:「目盛の帯の高さは、目盛の段階が変わっても動かさないこと（MUST）」.
    // U-50 makes the Row Area the canvas less this band, so its top and height
    // are asserted alongside: that is the very chain FR-017 refuses to close
    // (「帯の高さ → `Row Area` の高さ → `zoomY`」).
    for (const scale of FONT_SCALES) {
      const expected = rulerHeightOf(scale.font)
      const first = bandOf(
        settingsAt(scale.font, zoomFor(TIER_SAMPLE[0].pxPerDay, scale.font), scale.name),
      )
      for (const sample of TIER_SAMPLE) {
        const settings = settingsAt(scale.font, zoomFor(sample.pxPerDay, scale.font), scale.name)
        const regions = regionsFromScreen(ENV, settings)
        const where = `${scale.name} / ${sample.name}`
        expect(regions.timeRuler.height, `${where}: the band is S-2`).toBeCloseTo(expected, 6)
        expect(regions.timeRuler.y, `${where}: the band's top edge does not move`).toBeCloseTo(
          first.y,
          6,
        )
        expect(regions.rowArea.y, `${where}: U-50 -- the rows start below the band`).toBeCloseTo(
          regions.timeRuler.y + expected,
          6,
        )
      }
    }
  })

  it('draws the band the same height at every tier, at every text size', () => {
    // The same MUST, read off the picture rather than off the rectangle -- the
    // renderer is the one place that has been handed the tier, so it is the one
    // place a tier-driven height could appear.
    for (const scale of FONT_SCALES) {
      const expected = rulerHeightOf(scale.font)
      for (const sample of TIER_SAMPLE) {
        const settings = settingsAt(scale.font, zoomFor(sample.pxPerDay, scale.font), scale.name)
        const where = `${scale.name} / ${sample.name}`
        const ground = groundOf(drawn(settings), bandOf(settings), where)
        expect(numberAt(ground.text, 'height') as number, `${where}: S-2 unchanged`).toBeCloseTo(
          expected,
          2,
        )
      }
    }
  })

  it('lets the height follow the text size, which FR-017 exempts', () => {
    // FR-017:「⚠️ `fontScale` で帯の高さが変わることはこの禁止に当たらない ——
    // 禁じているのは目盛の段階による変化であり、`fontScale` はズームと独立なので
    // 循環を作らない」, with `S-2` giving the height as `rulerFont` x 3 +
    // `rulerLabelPad` x 3 and 表 T-215 ordering `S` < `M` < `L`.
    // ⭐ The point of the case is that the two axes are told apart: the height
    // is one number per text size, and that number is NOT one number overall.
    const heightAt = (scale: { readonly name: string; readonly font: number }): number =>
      bandOf(settingsAt(scale.font, zoomFor(TIER_SAMPLE[3].pxPerDay, scale.font), scale.name))
        .height
    for (const scale of FONT_SCALES) {
      expect(heightAt(scale), `${scale.name}: S-2 solved at this text size`).toBeCloseTo(
        rulerHeightOf(scale.font),
        6,
      )
    }
    expect(heightAt(FONT_SCALES[0]), 'S is shorter than M').toBeLessThan(heightAt(FONT_SCALES[1]))
    expect(heightAt(FONT_SCALES[1]), 'M is shorter than L').toBeLessThan(heightAt(FONT_SCALES[2]))
  })
})

// ---------------------------------------------------------------------------
// What the tier IS allowed to change: the arrangement inside the fixed band.
// ---------------------------------------------------------------------------

describe('FR-017 -- only the arrangement inside the band changes', () => {
  it('draws every label at `rulerFont` whatever the tier, at every text size', () => {
    // 表 T-201, closing paragraph:「文字の大きさは段階によらず `rulerFont` とし、
    // 段階が変えるのは帯の中の段の組み方だけである —— 段階で文字が変わると、
    // 段階 → 実効フォントサイズ → 判定 → 段階 の循環になる」. FR-017 makes the
    // effective font size an input to the judgement, so a tier that moved the
    // label size would feed its own decision.
    for (const scale of FONT_SCALES) {
      for (const sample of TIER_SAMPLE) {
        const settings = settingsAt(scale.font, zoomFor(sample.pxPerDay, scale.font), scale.name)
        const where = `${scale.name} / ${sample.name}`
        const labels = rulerTextsOf(drawn(settings), bandOf(settings))
        expect(labels.length, `${where}: the band carries labels`).toBeGreaterThan(0)
        for (const one of labels) {
          expect(numberAt(one.text, 'font-size') as number, `${where}: ${one.text}`).toBeCloseTo(
            scale.font,
            2,
          )
        }
      }
    }
  })

  it('keeps every label inside the band at every tier and text size', () => {
    // FR-017:「段階が変わっても外枠の高さは同じで、中の組み方だけが変わる」.
    // Read from the labels rather than the ground: U-50 puts everything below
    // the band on the rows, so a baseline outside the band is a ruler label
    // drawn over the `Row Area`, whatever height the ground rect claims.
    for (const scale of FONT_SCALES) {
      for (const sample of TIER_SAMPLE) {
        const settings = settingsAt(scale.font, zoomFor(sample.pxPerDay, scale.font), scale.name)
        const band = bandOf(settings)
        const where = `${scale.name} / ${sample.name}`
        const baselines = baselinesOf(drawn(settings), band)
        expect(baselines.length, `${where}: the band carries labels`).toBeGreaterThan(0)
        for (const baseline of baselines) {
          expect(baseline, `${where}: below the band's top edge`).toBeGreaterThan(band.y)
          expect(baseline, `${where}: above the band's foot`).toBeLessThanOrEqual(
            band.y + band.height,
          )
        }
      }
    }
  })

  it('never spends more than three 段, and never fewer as the tier coarsens', () => {
    // 表 T-201 の `S-2` 備考:「段階 4 は 3 段（年 ＋ 月 / 日 / 曜日）」and `S-3`'s
    // 上限 ((`rulerHeight` - `rulerLabelPad` x 3) / 3) cap the band at three.
    // `L-1`（表 T-005a）nests the four tiers -- year; year + month; + week;
    // + day + weekday -- so each tier's labels contain the previous tier's, and
    // FR-017's monotonicity MUST forbids a coarser tier showing more rows than
    // a finer one.
    // ⚠️ THE COUNT PER TIER IS NO LONGER MISSING, and this comment used to say
    // it was. FR-017 (MUST, 利用者の裁定 2026-08-27) now states what each 段
    // prints and folds 年 ＋ 月 into one of them wherever both are shown, which
    // fixes a count for every tier and not only for the fourth.
    // ⛔ IT IS STILL NOT ASSERTED HERE. This file's axis is the text size, and
    // the count does not move with it; the counts belong to the band's own file
    // (`uf-32-ruler-band.test.ts`), which asserts them at one text size. What
    // this case keeps is the relation between tiers, which is FR-017's
    // monotonicity and is nobody else's.
    for (const scale of FONT_SCALES) {
      let previous = 0
      for (const sample of TIER_SAMPLE) {
        const settings = settingsAt(scale.font, zoomFor(sample.pxPerDay, scale.font), scale.name)
        const where = `${scale.name} / ${sample.name}`
        const segments = baselinesOf(drawn(settings), bandOf(settings)).length
        expect(segments, `${where}: at most three 段`).toBeLessThanOrEqual(MOST_SEGMENTS)
        expect(segments, `${where}: no fewer 段 than the coarser tier`).toBeGreaterThanOrEqual(
          previous,
        )
        previous = segments
      }
    }
  })
})
