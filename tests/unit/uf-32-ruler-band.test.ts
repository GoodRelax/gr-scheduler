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
//   FR-017   「各段が刷るものを 表 T-238 のとおりとすること（MUST）。同表に無い
//            行を刷ってはならない（MUST NOT）」（利用者の裁定 2026-09-03）, with
//            ⛔「月を語で書いてはならない（MUST NOT）」and ⛔「週の段に曜日を
//            書いてはならない（MUST NOT）」
//   表 T-238  the four 段 and what each of their three 行 prints -- `TM-1` 年 /
//            `TM-2` 月 / `TM-3` 週 / `TM-4` 日. ⛔⛔ THE 2026-08-27 RULING THIS
//            FILE USED TO QUOTE («年と月は 1 段に `YYYY-MM`», for EVERY 段階
//            showing both) WAS WITHDRAWN FOR ONE 段 on 2026-09-03: `TM-2` now
//            splits them, 「`yyyy` と `m` を 2 段に分ける」. ⭐ THE FOLD STILL
//            BINDS `TM-3` AND `TM-4`, and its reason is unchanged --「帯の高さ
//            は段階で動かせない…ので、4 つの情報を出す `TM-4` では段が 3 つしか
//            無く、そこでは年と月を畳むほかない」⇒「畳みが要るのは `TM-3` と
//            `TM-4` だけであり、以前の文はその理由より広く書かれていた」
//   FR-017   ⭐⭐「`TM-4` の 3 行目（曜）は、同じ段の他の行より小さく刷ってよい
//            （MAY）。比は … 表 T-206 の `S-219` が持つこと（MUST）」(2026-09-03)
//            -- a MAY on the size, a MUST on the ratio, and ⛔「フォントの
//            family を差し替えてはならない（MUST NOT）」
//   FR-038    RATIONALE:「日程表の出力のうち言語に依るのは、目盛の第 4 段の曜日
//            だけである」, and ⛔「要求にも表にも語そのものを書いてはならない
//            （MUST NOT）」-- which is why the seven words a case hands in are
//            the case's own and no roster of docs/spec is read for them
//   FR-039   「文書に保存された値が読む人の指定を強制してはならない（MUST NOT）」
//   表 T-236  `S-146`（地の色。色相追随 ○）
//   表 T-201  `S-2` / `S-3` / `S-136`, and the closing paragraph:「文字の大きさ
//            は段階によらず `rulerFont`」-- ⚠️ read together with the `S-219`
//            MAY above, which is the one exception FR-017 carves in it
//   表 T-206  `S-219`（目盛の曜日の段の文字の大きさの係数）-- the ratio itself,
//            READ OUT OF THE MANUSCRIPT AT READ TIME and never typed in
//   表 T-205  `S-83` 〜 `S-85`, the three thresholds FR-017 judges the 段階 on
//   表 T-221  `LF-1`「目盛の刻みの間隔」-- ⭐⭐「刻むのは段ではなく行であり、その
//            行が刷る単位に 1 つ刻むこと（MUST）」, which hands the roster of 行
//            to 表 T-238, with ⛔「これ以外の間隔を採ってはならない（MUST NOT）」
//            (ledger row D-91). ⛔⛔ THE PER-段 ENUMERATION THIS FILE USED TO
//            QUOTE（「年の段は 1 年、年と月の段は 1 か月、…」）WAS WITHDRAWN ON
//            2026-09-04: 表 T-238 split the 月の段 into two 行 that tick at
//            different units（実測: 年の行 1 回 / 月の行 12 回）, so no sentence
//            over 段 could cover the upper 行. ⭐ WHAT SURVIVES UNCHANGED is the
//            reason the block near the bottom of this file is named for --
//            「日の段と曜日の段が同じ間隔なのは、同じ軸を 2 段に割ったものだから
//            である」（`FR-017`。利用者の裁定 2026-08-27）
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
import { bare, specTable } from '../contract/spec-table'

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
 * 表 T-201 の `S-2` の備考:「段階 4 は 3 段（年 ＋ 月 / 日 / 曜日）」, and FR-017
 * lets the 段階 change「中の組み方だけ」. So one 段 of the band is the band
 * divided by three.
 *
 * ⚠️ THE REMARK WAS REWRITTEN ON 2026-08-27 and the count did not move: the
 * band held three 段 when the day and the weekday shared the last one, and it
 * holds three now that 年 ＋ 月 share the first. ⛔ Which 段階 spends all three
 * DID move, and that is `TIERS` below.
 */
const SEGMENTS_IN_THE_BAND = 3

/**
 * 表 T-238（`FR-017`）——「目盛の段が刷るもの」, READ OUT OF THE MANUSCRIPT AT
 * READ TIME. One entry per 段, in the table's own order, holding the tokens of
 * the 行 that 段 actually prints.
 *
 * ⭐「刷らない」は「空で刷る」ではない（MUST）, so a cell saying it is dropped
 * rather than kept as an empty 行 -- which is what makes `.length` the number of
 * 段 that 段 stands in.
 * ⛔ THE COUNTS ARE NOT TYPED IN. They came out of the table as 1 / 2 / 2 / 3;
 * before 2026-09-03 the same reading gave 1 / 1 / 2 / 3, and a hand-written copy
 * is exactly what let that stale count sit here after the ruling landed.
 */
const NOT_PRINTED = '刷らない'
/** The one token of 表 T-238 that is a word rather than a date pattern. */
const WEEKDAY_TOKEN = '曜'
const LINE_HEADINGS = ['1 行目', '2 行目', '3 行目'] as const
const TIER_ROW_IDS = ['TM-1', 'TM-2', 'TM-3', 'TM-4'] as const

const TIER_LINES: readonly (readonly string[])[] = ((): readonly (readonly string[])[] => {
  const table = specTable('T-238')
  return TIER_ROW_IDS.map((id) => {
    const row = table.rows.find((one) => one.id === id)
    if (row === undefined) throw new Error(`表 T-238 no longer holds ${id}`)
    return LINE_HEADINGS.map((heading) => {
      const cell = row.by[heading]
      if (cell === undefined) throw new Error(`表 T-238 の ${id} has no ${heading}`)
      return bare(cell)
    }).filter((token) => token !== NOT_PRINTED)
  })
})()

if (TIER_LINES.length !== TIER_ROW_IDS.length) throw new Error('表 T-238 no longer names four 段')

/** The 行 表 T-238 says the 段 at this place prints, or a failure that names it. */
const linesAt = (at: number): readonly string[] => {
  const lines = TIER_LINES[at]
  if (lines === undefined) throw new Error(`表 T-238 has no 段 at place ${at}`)
  return lines
}

if (linesAt(3).length !== SEGMENTS_IN_THE_BAND) {
  throw new Error('表 T-238 の `TM-4` no longer prints the three 行 `S-2` is spent on')
}

/**
 * 表 T-206 の `S-219`——「目盛の曜日の段の文字の大きさの係数（`FR-017`）」, read
 * off the manuscript's 既定 cell. ⛔ THE NUMBER IS NEVER TYPED IN: FR-017 states
 * the size as a RATIO against `rulerFont`, so the value belongs to the row and
 * the cases below hold the relation, not the product.
 */
const WEEKDAY_FONT_COEF = ((): number => {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-219')
  if (row === undefined) throw new Error('表 T-206 no longer holds S-219')
  const cell = row.by['既定']
  const hit = cell === undefined ? null : /^-?\d+(?:\.\d+)?/.exec(cell.trim())
  if (hit === null) throw new Error('S-219 の 既定 is no longer a bare number')
  return Number(hit[0])
})()

if (!(WEEKDAY_FONT_COEF > 0) || WEEKDAY_FONT_COEF >= 1) {
  // ⛔ A coefficient of 1 (or above) would make「小さく刷ってよい」unreadable as
  // an exception, and every case below would pass without measuring anything.
  throw new Error('S-219 no longer states a ratio that makes the 曜 smaller')
}
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
 *
 * ⭐ `segments` IS COUNTED OFF 表 T-238, not typed in and not read off what a
 * 段階 is called: it is however many of that 段's three 行 the table says are
 * printed (「刷らない」 rows are not 段). That gives 1 / 2 / 2 / 3.
 *
 * ⛔⛔ IT USED TO SAY 1 / 1 / 2 / 3, copied by hand out of the 2026-08-27
 * ruling 「年と月は 1 段に `YYYY-MM` で並べ…畳むのは年と月が両方出るすべての段階
 * である」. 表 T-238 (利用者の裁定 2026-09-03) withdrew that for `TM-2` alone,
 * which now stands in two 段（`yyyy` / `m`）, and the hand-written copy is what
 * kept the withdrawn count alive here. ⭐ Reading the table is why the next
 * such ruling reaches this constant on its own.
 *
 * ⭐ The last entry is checkable against a second sentence: 表 T-201 の `S-2`
 * の備考「段階 4 は 3 段」, which `SEGMENTS_IN_THE_BAND` above asserts against
 * `TIER_LINES[3]`.
 */
const TIERS = [
  { name: '年（TM-1）', zoomX: zoomFor(TIER_THRESHOLD.month / 2), segments: linesAt(0).length },
  {
    name: '月（TM-2）',
    zoomX: zoomFor((TIER_THRESHOLD.month + TIER_THRESHOLD.week) / 2),
    segments: linesAt(1).length,
  },
  {
    name: '週（TM-3）',
    zoomX: zoomFor((TIER_THRESHOLD.week + TIER_THRESHOLD.day) / 2),
    segments: linesAt(2).length,
  },
  {
    name: '日（TM-4）',
    zoomX: zoomFor(TIER_THRESHOLD.day * 2),
    segments: linesAt(3).length,
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
 *
 * ⭐ `weekdayWords` IS THE LAST ARGUMENT `PI-19` TAKES and it defaults to none,
 * so every case that does not name it draws a picture with no display language
 * in it at all. FR-038 is what puts words there, and only the cases about
 * FR-038 hand any in.
 */
const drawn = (
  schedule: Schedule = EMPTY,
  settings: DocumentSettings = SETTINGS,
  weekdayWords: readonly string[] = [],
): string => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  // 'screen' is EP-14's other arm: the export draws no dummy. These cases
  // are about what a reader sees, so they ask for the screen's picture.
  return svgFromSchedule(
    schedule,
    settings,
    layout,
    geometry,
    regions,
    selection,
    'screen',
    null,
    weekdayWords,
  )
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

/** One 目盛ラベル read whole: the 段 it sits on, what it prints, and its size. */
interface SizedLabel {
  readonly baseline: number
  readonly text: string
  readonly size: number
}

/**
 * Every 目盛ラベル of the band with its `font-size`. ⚠️ Read off the element
 * rather than assumed from the settings, because the size is exactly what the
 * `S-219` MAY lets differ between one 行 and the rest.
 */
const sizedLabelsOf = (svg: string, band: ScreenRect): readonly SizedLabel[] => {
  const out: SizedLabel[] = []
  const scan = /<text\b([^>]*)>([\s\S]*?)<\/text>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    const open = `<text${hit[1] as string}>`
    const y = numberAt(open, 'y')
    const size = numberAt(open, 'font-size')
    if (y !== null && size !== null && y >= band.y && y <= band.y + band.height) {
      out.push({ baseline: Math.round(y * 100) / 100, text: (hit[2] as string).trim(), size })
    }
    hit = scan.exec(svg)
  }
  return out
}

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
    const wide = body.length === 3 ? body.replace(/./g, (oneCell) => oneCell + oneCell) : body
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
  it('draws every 目盛ラベル at `rulerFont`, and only the 曜 at `rulerFont` × `S-219`', () => {
    // 表 T-201 の closing paragraph:「文字の大きさは段階によらず `rulerFont` と
    // し、段階が変えるのは帯の中の段の組み方だけである —— 段階で文字が変わると、
    // 段階 → 実効フォントサイズ → 判定 → 段階 の循環になる」.
    // ⭐ FR-017 (利用者の裁定 2026-09-03) carves ONE exception in it:「⭐⭐ **`TM-4`
    // の 3 行目（曜）は、同じ段の他の行より小さく刷ってよい（MAY）。比は …
    // 表 T-206 の `S-219` が持つこと（MUST）**」——「英語の曜日（`Mon` など）が
    // 日の段の幅を決めてしまうからである」.
    // ⭐ A MAY IS NOT ASSERTED AS AN EFFECT. What is held down is the pair of
    // sizes a label may have -- `rulerFont`, or `rulerFont` × `S-219` and only
    // where FR-017 admits it -- so an implementation that takes the MAY and one
    // that declines it both pass, and one that shrinks anything else does not.
    // ⛔ THE RATIO IS THE MANUSCRIPT'S. `WEEKDAY_FONT_COEF` is read out of
    // 表 T-206 の `S-219`; no product of it is written here. ⚠️ This file draws
    // at ONE `rulerFont`（`S-8`）, so it cannot tell the relation from a literal
    // by itself -- `fr-017-ruler-height-constant.test.ts` sweeps 表 T-215's
    // three sizes and that is where the RELATION bites.
    // ⛔ NOT ASSERTED -- THE FAMILY. FR-017:「フォントの family を差し替えては
    // ならない（MUST NOT）」. No row gives the ruler a family to name, so a case
    // demanding one would be this file choosing it.
    const words = new Set(ONE_LANGUAGE)
    for (const [at, tier] of TIERS.entries()) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      const labels = sizedLabelsOf(drawn(EMPTY, settings, ONE_LANGUAGE), bandOf(settings))
      expect(labels.length, `${tier.name}: 目盛ラベルがある`).toBeGreaterThan(0)

      const smaller = labels.filter((one) => Math.abs(one.size - RULER_FONT) >= 0.005)

      // 表 T-238: only `TM-4` prints a 曜 at all, so no coarser 段 may shrink.
      if (!linesAt(at).includes(WEEKDAY_TOKEN)) {
        expect(
          smaller.map((one) => one.text),
          `${tier.name}: 表 T-238 が曜を刷らない段に小さい文字は無い`,
        ).toEqual([])
      }

      // 「`TM-4` の 3 行目（曜）」-- the exception reaches the weekday and nothing
      // else, so every shrunk label is one of the words handed in.
      expect(
        smaller.map((one) => one.text).filter((text) => !words.has(text)),
        `${tier.name}: FR-017 の MAY が及ぶのは曜だけである`,
      ).toEqual([])

      // ⭐ THE RELATION `S-219` STATES, asserted where the MAY was taken.
      for (const one of smaller) {
        expect(one.size, `${tier.name}: ${one.text} = rulerFont × S-219`).toBeCloseTo(
          RULER_FONT * WEEKDAY_FONT_COEF,
          6,
        )
      }

      // 表 T-201: everything the exception does not reach stays at `rulerFont`.
      for (const one of labels.filter((label) => !smaller.includes(label))) {
        expect(one.size, `${tier.name}: ${one.text}`).toBeCloseTo(RULER_FONT, 2)
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
    // は 3 段（年 ＋ 月 / 日 / 曜日）」, and `S-136`:「帯の高さ（`S-2`）はこれを
    // 目盛の帯の中の段（表 T-006b の `A-1` の ⑤）3 つぶん含む」。
    // ⚠️ ONE 段階 SPENDS ALL THREE, and only one: FR-017 folds 年 ＋ 月 into a
    // single 段 wherever both are out, so 段階 3 stands in two. The filter is
    // `TIERS`'s own `segments`, solved there from that sentence.
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

  it('folds 年 ＋ 月 at `TM-3` / `TM-4` and splits them at `TM-2` (表 T-238, MUST)', () => {
    // FR-017 (MUST, 利用者の裁定 2026-09-03):「**各段が刷るものを 表 T-238 の
    // とおりとすること（MUST）。同表に無い行を刷ってはならない（MUST NOT）**」.
    //
    // ⛔⛔ THIS CASE USED TO HOLD A RULE THAT NO LONGER BINDS EVERYWHERE. Until
    // 2026-09-03 FR-017 read「年と月は 1 段に `YYYY-MM`」for EVERY 段階 showing
    // both, and this case counted 段 against that. 表 T-238 withdrew it for
    // `TM-2` alone —— ⚠️「**`TM-2`（月の段）はそれを覆し、`yyyy` と `m` を 2 段に
    // 分ける**」—— while ⭐「**元の規則の理由はそのまま生きている** …⇒ **畳みが
    // 要るのは `TM-3` と `TM-4` だけであり、以前の文はその理由より広く書かれて
    // いた**」。
    // ⭐ SO BOTH SIDES ARE HELD HERE, and the count alone cannot do it: `TM-2`
    // and `TM-3` both stand in TWO 段, one because the year and month were
    // split and one because they were folded and the week joined them. What
    // tells them apart is what the first 行 PRINTS -- `yyyy` against `yyyy-mm`
    // -- so this case reads the text of every 段, not only how many there are.
    //
    // ⛔ NOT ASSERTED -- ZERO PADDING. 表 T-238 writes `m` and `d` where it
    // writes `mm` inside `yyyy-mm`, but no row of docs/spec states a token
    // grammar, so choosing between `1` and `01` would be this file's opinion
    // and not the table's. The shapes below admit either.
    const words = new Set(ONE_LANGUAGE)

    // ⭐ THE GUARD ON THE READING. The shapes below are only the table's while
    // the table still writes these tokens; if a later ruling moves them, this
    // stops the case instead of letting it check a pattern nothing states.
    expect(TIER_ROW_IDS.map((_, at) => linesAt(at)), '表 T-238 が刷ると定めた行').toEqual([
      ['yyyy'],
      ['yyyy', 'm'],
      ['yyyy-mm', 'd'],
      ['yyyy-mm', 'd', WEEKDAY_TOKEN],
    ])

    const shapeOf = (token: string): ((text: string) => boolean) => {
      if (token === WEEKDAY_TOKEN) return (text) => words.has(text)
      if (token === 'yyyy') return (text) => /^[0-9]{4}$/.test(text)
      if (token === 'yyyy-mm') return (text) => /^[0-9]{4}-[0-9]{1,2}$/.test(text)
      if (token === 'm' || token === 'd') return (text) => /^[0-9]{1,2}$/.test(text)
      throw new Error(`表 T-238 now writes a token this case cannot read: ${token}`)
    }

    for (const [at, tier] of TIERS.entries()) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      const band = bandOf(settings)
      const labels = labelsOf(drawn(EMPTY, settings, ONE_LANGUAGE), band)
      const baselines = [...new Set(labels.map((one) => one.baseline))].sort((a, b) => a - b)
      const wanted = linesAt(at)

      // 「同表に無い行を刷ってはならない（MUST NOT）」and「『刷らない』は『空で
      // 刷る』ではない」-- exactly as many 段 as the table prints, no spare.
      expect(baselines.length, `${tier.name}: 表 T-238 が刷ると定めた行の数`).toBe(wanted.length)

      wanted.forEach((token, line) => {
        const row = labels.filter((one) => one.baseline === baselines[line])
        expect(row.length, `${tier.name}: ${line + 1} 行目に目盛ラベルがある`).toBeGreaterThan(0)
        const fits = shapeOf(token)
        expect(
          row.map((one) => one.text).filter((text) => !fits(text)),
          `${tier.name}: ${line + 1} 行目は 表 T-238 の \`${token}\` である`,
        ).toEqual([])
      })
    }
  })
})

// ---------------------------------------------------------------------------
// FR-038 -- the weekday, which is the ONE thing in the picture that the
// display language decides.
//
// FR-038 の RATIONALE:「⚠️ **日程表の出力のうち言語に依るのは、目盛の第 4 段の
// 曜日だけである**（`FR-017`）—— **どの語で刷ったかは文書に残らない。**」
// FR-017 (MUST) says where it stands -- 「曜日の段は曜日」をそれぞれ 1 段に持つ,
// with the day's 段 holding「日の数字」and ⛔「**週の段に曜日を書いてはならない
// （MUST NOT）**」-- and hands the words themselves to FR-038:「⭐ **曜日の語が
// どこに住むかは `FR-038` が持つ。**」
//
// ⭐ THE SEVEN WORDS ARE THIS FILE'S OWN, and they have to be. FR-038 (MUST
// NOT):「要求にも表にも語そのものを書いてはならない」, so no row of docs/spec
// carries a weekday to read; what a case may assert is that the words HANDED IN
// are the ones printed, and that nothing else in the picture moves with them.
// ⚠️ They are deliberately unlike a number so that a 段 printing digits cannot
// be mistaken for one printing a weekday.
//
// ⛔ NOT ASSERTED -- ANY SPELLING, ORDER OR SEPARATOR. AT-17's numbering (0 is
// Sunday) is held where the roster lives, in the dictionary's own contract
// test; a second copy here would be this file having an opinion about which
// word belongs to which day, which the band's own rows do not state.
// ---------------------------------------------------------------------------

/** One 目盛ラベル: the baseline it sits on and the text it prints. */
interface Label {
  readonly baseline: number
  readonly text: string
}

const labelsOf = (svg: string, band: ScreenRect): readonly Label[] => {
  const out: Label[] = []
  const scan = /<text\b([^>]*)>([\s\S]*?)<\/text>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    const y = numberAt(`<text${hit[1] as string}>`, 'y')
    if (y !== null && y >= band.y && y <= band.y + band.height) {
      out.push({ baseline: Math.round(y * 100) / 100, text: (hit[2] as string).trim() })
    }
    hit = scan.exec(svg)
  }
  return out
}

/** ⭐ Seven words of this file's own, in the seven places AT-17 counts. */
const ONE_LANGUAGE: readonly string[] = [
  'WeekdayZero',
  'WeekdayOne',
  'WeekdayTwo',
  'WeekdayThree',
  'WeekdayFour',
  'WeekdayFive',
  'WeekdaySix',
]

/** The same seven places, spelled unlike -- FR-038's other language. */
const OTHER_LANGUAGE: readonly string[] = ONE_LANGUAGE.map((word) => word.replace('Weekday', 'Yobi'))

const FOURTH_TIER = TIERS[3]

describe('UF-32 -- FR-038: the display language reaches the 曜日 and nothing else', () => {
  it('gives the 曜日 a 段 of its own at 段階 4, holding the words handed in (FR-017, MUST)', () => {
    // 表 T-238 の `TM-4`（`FR-017`, MUST）: `yyyy-mm` / `d` / 曜, one token per
    // 行. So exactly one 段 of the band prints weekdays, its labels are
    // weekdays ALONE, and no other 段 carries one -- a 段 that printed「日の数字
    // と曜日」together would answer all three of those wrongly at once, and that
    // is the arrangement the ruling of 2026-08-27 withdrew.
    // ⚠️ THE QUOTE THIS COMMENT USED TO CARRY IS GONE. It read「年と月は 1 段に
    // `YYYY-MM` で並べ…」as a rule over EVERY 段階; 表 T-238 (2026-09-03) keeps
    // it for `TM-3` and `TM-4` only. This case measures `TM-4`, where it binds.
    const settings = settingsOf({ ...SETTINGS, zoomX: FOURTH_TIER.zoomX })
    const band = bandOf(settings)
    const labels = labelsOf(drawn(EMPTY, settings, ONE_LANGUAGE), band)
    expect(labels.length, `${FOURTH_TIER.name}: 目盛ラベルがある`).toBeGreaterThan(0)

    const words = new Set(ONE_LANGUAGE)
    const carrying = labels.filter((one) => [...words].some((word) => one.text.includes(word)))
    expect(
      carrying.length,
      `${FOURTH_TIER.name}: 曜日の段が 1 つも刷られていない`,
    ).toBeGreaterThan(0)

    // 「曜日の段は曜日」-- the word is the whole label, not part of one.
    expect(
      carrying.filter((one) => !words.has(one.text)).map((one) => one.text),
      'FR-017 (MUST): 曜日の段が刷るのは曜日だけである',
    ).toEqual([])

    // ⭐ ONE 段, not several: the weekday owns a 段 and shares none.
    expect(
      new Set(carrying.map((one) => one.baseline)).size,
      'FR-017 (MUST): 曜日は 1 段を持つ',
    ).toBe(1)

    // 表 T-238 の `TM-4`: its other two 行 are `yyyy-mm` and `d` -- digits, and
    // digits with a hyphen -- so no second 段 of this 段 can be the weekday's.
    const weekdayBaseline = carrying[0]?.baseline
    expect(
      labels
        .filter((label) => label.baseline !== weekdayBaseline)
        .map((label) => label.text)
        .filter((text) => !/^[0-9]+(-[0-9]+)?$/.test(text)),
      '表 T-238 の `TM-4`: 曜の行の外が刷るのは `yyyy-mm` と `d` である',
    ).toEqual([])
  })

  it('moves ONLY that 段 when the language changes (FR-038)', () => {
    // FR-038:「日程表の出力のうち言語に依るのは、目盛の第 4 段の曜日だけである」.
    // ⭐ Two rosters, one picture each: every label that differs has to sit on
    // the same single baseline, or something other than the weekday followed
    // the language.
    const settings = settingsOf({ ...SETTINGS, zoomX: FOURTH_TIER.zoomX })
    const band = bandOf(settings)
    const first = labelsOf(drawn(EMPTY, settings, ONE_LANGUAGE), band)
    const second = labelsOf(drawn(EMPTY, settings, OTHER_LANGUAGE), band)

    expect(second.length, '同じ設定なので目盛ラベルの数は同じである').toBe(first.length)
    const moved = first.filter((label, at) => label.text !== (second[at] as Label).text)
    expect(moved.length, 'FR-038: 曜日は言語に依る').toBeGreaterThan(0)
    expect(
      new Set(moved.map((label) => label.baseline)).size,
      'FR-038 (MUST NOT): 言語で動くのは曜日の段だけである',
    ).toBe(1)
  })

  it('leaves every coarser 段階 untouched by the language (FR-017, MUST NOT)', () => {
    // FR-017 (MUST NOT):「⛔ **週の段に曜日を書いてはならない（MUST NOT）** ——
    // 週の始まりは `Project.weekStartDay` が 1 つに決めているので（`FR-054`）、
    // **どの刻みにも同じ曜日が並ぶ。**」 ⭐ Held together with FR-038's「第 4 段
    // の曜日だけ」: at 段階 1 to 3 the whole picture must be the same string
    // however the words are spelled, which says at once that the week 段 prints
    // no weekday and that nothing else on those 段階 reads the dictionary.
    for (const tier of TIERS.filter((one) => one.segments < SEGMENTS_IN_THE_BAND)) {
      const settings = settingsOf({ ...SETTINGS, zoomX: tier.zoomX })
      expect(
        drawn(EMPTY, settings, OTHER_LANGUAGE),
        `${tier.name}: 言語に依る出力は無い`,
      ).toBe(drawn(EMPTY, settings, ONE_LANGUAGE))
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-221 の `LF-1` -- the 刻み of the 曜日の段 (ledger row D-91)
//
// ⛔ THE HOLE THIS CLOSES. CR-268 gave the 曜日 a 段 of its own and ruled that
// `LF-1` would not move -- 「刻みの間隔は段の組み方と別である」 -- which left the
// one row that names EVERY interval without an entry for the new 段, while its
// own closing rule reads 「⛔ **これ以外の間隔を採ってはならない（MUST NOT）**」.
// The row was mended on 2026-08-27.
//
// ⛔⛔ IT WAS MENDED A SECOND TIME ON 2026-09-04, AND THE FIRST CASE BELOW USED
// TO HOLD THE WORDING THAT WENT AWAY. Until then `LF-1` gave ONE interval per
// 段（「年の段は 1 年、年と月の段は 1 か月、週の段は 7 日、日の段と曜日の段は
// 1 日」）. 表 T-238 (2026-09-03) split the 月の段 into two 行 -- `yyyy` over `m`
// -- so one 段 came to tick two ways（`LF-1` の実測: 年の行 1 回 / 月の行 12 回）
// and nothing covered the upper 行. `LF-1` now rules PER 行 instead:
// ⭐⭐「**刻むのは段ではなく行であり、その行が刷る単位に 1 つ刻むこと（MUST）**
// —— **どの行が何を刷るかは `FR-017` の 表 T-238 が持つ**」.
//
// ⭐ THE REASON THIS BLOCK IS NAMED FOR OUTLIVED BOTH MENDINGS, and `LF-1`
// still carries it word for word:「⭐ **日の段と曜日の段が同じ間隔なのは、同じ軸
// を 2 段に割ったものだからである**（`FR-017`。利用者の裁定 2026-08-27）——
// **別の間隔にすると、その日のものでない曜日が日の下に並ぶ。**」
//
// ⭐ WHY THE TWO 段 ARE MEASURED AGAINST EACH OTHER AND NOT ONLY AGAINST A
// NUMBER. The reason the row gives is a relation, not a figure: the 曜日 under a
// 日 has to be THAT day's. A weekday row drawn every second day would keep a
// plausible-looking picture and break exactly that, so the cases below assert
// both halves -- one day between neighbours, and the same count as the 日の段.
//
// ⚠️ ONLY 段階 4 HAS A 曜日の段 (FR-017), so that is the one 段階 these read; the
// coarser three are already held to carrying no weekday at all by the FR-038
// block above.
// ---------------------------------------------------------------------------

/** One 目盛ラベル with the place it was drawn at, not only its baseline. */
interface PlacedLabel {
  readonly x: number
  readonly baseline: number
  readonly text: string
}

const placedLabelsOf = (svg: string, band: ScreenRect): readonly PlacedLabel[] => {
  const out: PlacedLabel[] = []
  const scan = /<text\b([^>]*)>([\s\S]*?)<\/text>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    const open = `<text${hit[1] as string}>`
    const x = numberAt(open, 'x')
    const y = numberAt(open, 'y')
    if (x !== null && y !== null && y >= band.y && y <= band.y + band.height) {
      out.push({ x, baseline: Math.round(y * 100) / 100, text: (hit[2] as string).trim() })
    }
    hit = scan.exec(svg)
  }
  return out
}

/** The labels of one 段, left to right. */
const rowAt = (labels: readonly PlacedLabel[], baseline: number): readonly PlacedLabel[] =>
  labels.filter((label) => label.baseline === baseline).sort((one, other) => one.x - other.x)

/** The distances between neighbouring 目盛, in the order they are drawn. */
const gapsOf = (row: readonly PlacedLabel[]): readonly number[] =>
  row.slice(1).map((label, at) => label.x - (row[at] as PlacedLabel).x)

/** The band at 段階 4, drawn with this file's own seven weekday words. */
const fourthTier = (): {
  readonly pxPerDay: number
  readonly day: readonly PlacedLabel[]
  readonly weekday: readonly PlacedLabel[]
} => {
  const settings = settingsOf({ ...SETTINGS, zoomX: FOURTH_TIER.zoomX })
  const band = bandOf(settings)
  const labels = placedLabelsOf(drawn(EMPTY, settings, ONE_LANGUAGE), band)
  const words = new Set(ONE_LANGUAGE)

  const weekdayBaselines = new Set(
    labels.filter((label) => words.has(label.text)).map((label) => label.baseline),
  )
  expect(weekdayBaselines.size, 'FR-017 (MUST): 曜日は 1 段を持つ').toBe(1)
  const weekdayBaseline = [...weekdayBaselines][0] as number

  // 表 T-238 の `TM-4` の 2 行目 is `d` -- a bare number, which its 1 行目
  // (`yyyy-mm`) is not.
  const dayBaselines = new Set(
    labels
      .filter((label) => label.baseline !== weekdayBaseline && /^[0-9]+$/.test(label.text))
      .map((label) => label.baseline),
  )
  expect(dayBaselines.size, 'FR-017 (MUST): 日の段は 1 段である').toBe(1)

  return {
    // FR-017 (MUST): 「1 日あたりの表示幅は、表 T-201 の `S-1` に `zoomX` を掛け
    // た値とすること」. Solved, never typed in.
    pxPerDay: PX_PER_DAY_AT_1X * FOURTH_TIER.zoomX,
    day: rowAt(labels, [...dayBaselines][0] as number),
    weekday: rowAt(labels, weekdayBaseline),
  }
}

describe('UF-32 -- 表 T-221 の `LF-1`: the 曜日の段 keeps the 日の段の刻み', () => {
  it('⭐ decides every 刻み by the 行, and hands the 曜 the 日 の刻み in one clause', () => {
    // ⛔ NOT A COPY OF THE ROW'S SENTENCE. Holding one sentence is what put this
    // case red on 2026-09-04: the sentence it quoted was withdrawn while every
    // rule inside it stayed true. What is held here is the SHAPE the row must
    // keep -- (1) the ruling is stated over the 行, not over the 段, and defers
    // to 表 T-238 for what each 行 prints; (2) wherever the row hands the 曜 an
    // interval, that same clause hands it to the 日 as well, which is the one
    // consequence D-91 exists for. Both survive a rewording; neither survives
    // the 曜 being given an interval of its own.
    const lf1 = specTable('T-221').rows.find((row) => row.id === 'LF-1')
    if (lf1 === undefined) throw new Error('表 T-221 no longer has row LF-1')
    const formula = lf1.by['算式'] ?? ''

    // (1) THE GENERAL RULE, which now decides every interval:
    // ⭐⭐「**刻むのは段ではなく行であり、その行が刷る単位に 1 つ刻むこと
    // （MUST）**」. GOES RED IF the row returns to ruling per 段 -- one 段 has
    // already been split into two 行 that tick at different units, so a MUST
    // written over a named 段（「年と月の段は…」）cannot reach the upper 行.
    const sentences = formula
      .split('。')
      .map((one) => one.trim())
      .filter((one) => one.length > 0)
    const ruling = sentences.filter((one) => one.includes('（MUST）'))
    expect(ruling.length, '表 T-221 の `LF-1`: 刻みを定める MUST は 1 つである').toBe(1)
    const must = ruling[0] as string
    expect(must, '`LF-1` の MUST: 刻むのは行である').toMatch(/行/)
    expect(must, '`LF-1` の MUST: その行が刷る単位に 1 つ刻む').toMatch(/刷る/)
    expect(must, '`LF-1` の MUST: 段ごとに間隔を与えていない').not.toMatch(/[年月週日]の段/)
    // ⭐ WHERE THE UNITS THEMSELVES LIVE. The MUST names one table and no
    // 段: 「どの行が何を刷るかは `FR-017` の 表 T-238 が持つ」.
    expect(must, '`LF-1`: どの行が何を刷るかは 表 T-238 が持つ').toContain('T-238')

    // (2) THE CONSEQUENCE THIS BLOCK IS NAMED FOR. Every clause that gives the
    // 曜 an interval must give it 1 日, AND must be the clause that gives the
    // 日 its interval too -- the two are one axis split across two 行, so a row
    // that hands them out separately is one edit away from parting them.
    const clauses = formula
      .split(/[、。]/)
      .map((one) => one.trim())
      .filter((one) => one.length > 0)
    const anInterval = /[0-9]+\s*(年|か月|日)/
    const weekdayIntervals = clauses.filter((one) => one.includes('曜') && anInterval.test(one))
    expect(
      weekdayIntervals.length,
      '表 T-221 の `LF-1`: 曜を刷る行にも刻みが与えられている（D-91）',
    ).toBeGreaterThan(0)
    for (const clause of weekdayIntervals) {
      expect(clause, `表 T-221 の \`LF-1\`: 曜の刻みは 1 日である —— ${clause}`).toMatch(/1\s*日/)
      // The unit words removed, what is left must still name the 日 -- the 行
      // whose 刻み this clause is sharing.
      const rows = clause.replace(anInterval, '').replace(/曜日?/g, '')
      expect(
        rows,
        `表 T-221 の \`LF-1\`: 曜の刻みは日と同じ 1 つの文で与えられている —— ${clause}`,
      ).toMatch(/日/)
    }

    // ⭐ The reason, which outlived both rewritings of the row (`FR-017`。
    // 利用者の裁定 2026-08-27) and is why (2) is a relation and not a figure.
    expect(formula, '表 T-221 の `LF-1`: 日と曜日は同じ軸を 2 段に割ったものである').toMatch(
      /同じ軸/,
    )
    expect(formula, '表 T-221 の `LF-1` の閉じの MUST NOT').toContain('これ以外の間隔を採っては')
  })

  it('⛔ puts one day between neighbouring 曜日, and no other interval', () => {
    // 表 T-238 の `TM-4` prints 曜 on its 3 行目, so `LF-1` の MUST（刻むのは行で
    // あり、その行が刷る単位に 1 つ）reads 「日と曜日を刷る行は 1 日に 1 つである」
    // there, closing with 「⛔ **これ以外の間隔を採ってはならない（MUST NOT）**」.
    // GOES RED IF the weekday row is thinned: every gap
    // then reads 2 × pxPerDay or more.
    const { pxPerDay, weekday } = fourthTier()
    expect(weekday.length, '曜日の段に目盛が 2 つ以上ある').toBeGreaterThan(1)
    for (const [at, gap] of gapsOf(weekday).entries()) {
      expect(gap, `表 T-221 の \`LF-1\`: 曜日の段の刻み ${at + 1}`).toBeCloseTo(pxPerDay, 6)
    }
  })

  it('⛔ gives the 日の段 that same one day, so the two 段 stay in step', () => {
    // 「⭐ **日の段と曜日の段が同じ間隔なのは、同じ軸を 2 段に割ったものだからで
    // ある** —— **別の間隔にすると、その日のものでない曜日が日の下に並ぶ。**」
    // ⭐ The relation, not a second figure: as many 曜日 as 日, gap for gap.
    const { pxPerDay, day, weekday } = fourthTier()
    for (const [at, gap] of gapsOf(day).entries()) {
      expect(gap, `表 T-221 の \`LF-1\`: 日の段の刻み ${at + 1}`).toBeCloseTo(pxPerDay, 6)
    }
    expect(
      weekday.length,
      '表 T-221 の `LF-1`: 日の段と曜日の段は同じ間隔なので、目盛の数も同じである',
    ).toBe(day.length)
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
