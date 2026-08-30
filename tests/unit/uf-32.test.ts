// Unit tests for `svgFromSchedule` (unit UF-32 of table T-075, component
// CP-19 of table T-062, published as PI-19 of table T-064).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, 1.). What was read: docs/spec/ in full for the rules
// below, and this file's own declarations -- the head comment, the exported
// type and the signature of `svgFromSchedule`. Every expected value here comes
// from a requirement or a table, never from the implementation. Where the
// specification does not decide a number (the saturation and lightness a hue
// is drawn at -- `_assets/tbl-settings.md` §5 states the rule in words and
// gives none), the case asserts the RELATION the specification does state and
// not the number the code happens to produce.
//
// The rules these cases answer to:
//   FR-080    the picture is the whole screen, at one ratio, with no margin
//             added; table T-076 says which UI parts it carries
//   FR-007    the author's 線色 / 塗り色, table T-017's palette, and table
//             T-017a's contrast conditions
//   FR-041    theme following, the one fixed colour dependency lines and
//             progress lines share, and monochrome
//   FR-019    the annotation's fixed colour, kept away from the theme hue
//   FR-030    never colour alone (SL-8 of table T-023c says it of selection)
//   表 T-020  the stacking order, back to front
//
// ⭐ Chapter 1.9 asks a test of a requirement that points at a table to be
// driven by a fixed copy of the table. T_020, T_017a and T_076_EP5 below are
// those copies; nothing here re-reads the prose at run time.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  svgFromSchedule,
  NOT_STORED_DUMMY_SIZES,
} from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/** 表 T-020 — 重ね順（背面から前面へ）. FR-011 owns it. */
const T_020 = [
  { row: 'ZO-1', order: 1, element: '予定バー' },
  { row: 'ZO-1a', order: 1.5, element: '予実の補助線' },
  { row: 'ZO-2', order: 2, element: '実績バー' },
  { row: 'ZO-3', order: 3, element: '進捗マーカー' },
  { row: 'ZO-4', order: 4, element: '依存線' },
  { row: 'ZO-5', order: 5, element: '名称ラベル' },
] as const

/**
 * 表 T-017a — テーマ色が満たす条件. FR-007: 「テーマ色の解き方は `themeHue`
 * からの算出とし、表 T-017a の条件をすべて満たすこと（MUST）」。
 * NFR-007 fixes what a ratio means: WCAG 2.1's 1.4.3 / 1.4.11.
 */
const T_017a = {
  'CT-1': { of: '文字 ÷ 予定バー', least: 4.5 },
  'CT-2': { of: '文字 ÷ 実績バー', least: 4.5 },
  'CT-3': { of: '実績 ÷ 予定', least: 3 },
  'CT-4': { of: '予定の輪郭線 ÷ 背景', least: 3 },
  'CT-5': { of: '予定の塗り ÷ 背景', least: 1.3 },
} as const

/**
 * 表 T-076 の EP-5 — the contents of the `Row Area`, all of which the row
 * says 描く. Only the ones `ScheduleGeometry` already carries are listed:
 * the rest have no vertex to draw from and are another unit's to place.
 */
const T_076_EP5 = ['Task Bars (U-2)', 'Progress Marker (U-5)', 'Name Label (U-7)',
  'Dependency Lines (U-16)', 'Annotations (U-15a)'] as const

// ---------------------------------------------------------------------------
// Inputs. A whole DocumentSettings is 100+ keys, so a case pins the ones it
// means and everything else comes from SETTINGS_DEFAULTS, which is generated
// from the manuscript.
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * ⚠️ `shapeHeightOf` has to be spelled out: SETTINGS_DEFAULTS carries the five
 * ratios under their dotted keys (S-13 〜 S-17), and the nested object is what
 * the layout reads.
 */
const SETTINGS = settingsOf({
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
  scrollDate: '2026-01-01', // S-77
  stackDirection: 'down', // S-58 -- pinned so every y reads from the top
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
  // ⚠ THE SAME SPELLING-OUT, for the same reason: `planActualGuidePattern`
  // (S-104) is carried under `planActualGuidePattern.on` / `.off`, and the
  // 補助線 reads the nested pair. S-104's own figure is `2,2`.
  planActualGuidePattern: { on: 2, off: 2 },
  // ⚠ AND ONCE MORE, for the third time and the same reason: `fontScaleSizes`
  // (S-121 〜 S-123) is carried under its dotted keys, and the comment box's
  // AutoFit (FR-097) reads the nested object.
  fontScaleSizes: { S: 12, M: 14, L: 16 },
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

// ⚠️ Every nullable column table T-019a reads has to be spelled `null`;
// leaving one `undefined` reads as "set".
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

/** A Task starting on `from` and running `days`. At zoomX 1 one day is 6px. */
const spanning = (
  uid: number,
  from: string,
  days: number,
  part: Record<string, unknown> = {},
): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

const visualOf = (uid: number, part: Record<string, unknown>): Record<string, unknown> => ({
  taskUid: uid,
  nameAnchor: null,
  nameAlign: null,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
  ...part,
})

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
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
    ...part,
  }) as unknown as Schedule

/** One root row holding the tasks given, each a member of it. */
const oneRow = (tasks: readonly Task[], rest: Record<string, unknown> = {}): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((drawnText) => ({ groupId: 'g1', taskUid: drawnText.uid })),
    ...rest,
  })

/**
 * ADR-001 has the shell compute the rectangles, the layout and the geometry
 * once a frame and hand them round, so a case builds them the same way rather
 * than inventing vertices the unit would then be measured against.
 */
// ⛔ ONE selection, handed to BOTH. PI-6 grew a fifth argument on 2026-08-26
// because FR-075 (MUST) draws the fade grab points on the selected Task alone,
// and a case that told the geometry 「nothing is selected」 while telling the
// renderer otherwise would describe a frame the shell never builds -- and would
// silently take every FR-075 case out of this file's reach.
const drawn = (
  schedule: Schedule,
  settings: DocumentSettings = SETTINGS,
  selection = emptySelection(),
  env: ScreenEnvironment = ENV,
): string => {
  const regions = regionsFromScreen(env, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  // 'screen' is EP-14's other arm: the export draws no dummy. These cases
  // are about what a reader sees, so they ask for the screen's picture.
  return svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen')
}

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

/** Every value any element gives to `fill` or `stroke`, minus `none`. */
const coloursOf = (svg: string): readonly string[] => {
  const out: string[] = []
  for (const element of elementsOf(svg)) {
    for (const name of ['fill', 'stroke']) {
      const value = attribute(element.text, name)
      if (value !== null && value !== 'none') out.push(value)
    }
  }
  return out
}

/** The elements that carry a colour, in the order they are painted. */
const paintedOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter((drawn) => drawn.tag !== 'svg')

/**
 * The elements the picture draws 薄く, by the offset `elementsOf` gives them --
 * a figure that either states a 濃さ itself or stands inside something that
 * states one.
 *
 * ⭐ WHY THE PICTURE HAS TO BE READ AS A TREE HERE, and not scanned flat. Since
 * 2026-08-26 the 実績入力のダミー is drawn, and FR-013 (MUST) puts it in the
 * 実績バー's own clothes: 「未着手のマーカーと、実績入力のダミー（`FR-043`）は
 * 薄く描き、ポインタが乗っているあいだだけ濃くすること（MUST）…濃さの値は
 * `S-131`。**色は実績バーの色を継ぎ、独立した色を保存しない**（`FR-041`）」。
 * ⛔ SO NEITHER COLOUR NOR SHAPE TELLS A ダミー FROM AN 実績バー -- the one thing
 * that does is the 濃さ that same MUST gives it, and the 濃さ may be stated on a
 * group that encloses the figure rather than on the figure itself.
 * ⚠️ The leading `\s` keeps `fill-opacity` and `stroke-opacity` out, which are a
 * different thing from the element's own 濃さ.
 */
const faintlyDrawn = (svg: string): ReadonlySet<number> => {
  const out = new Set<number>()
  const ancestors: boolean[] = []
  const scan = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*)>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    const body = hit[3] as string
    const statesOne = /\sopacity="/.test(hit[0])
    if (hit[1] === '/') ancestors.pop()
    else {
      if (statesOne || ancestors.includes(true)) out.add(hit.index)
      if (!body.trimEnd().endsWith('/')) ancestors.push(statesOne)
    }
    hit = scan.exec(svg)
  }
  return out
}

// --- colour arithmetic, so a case can state a condition of table T-017a -----

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

/** The hue of a colour, 0〜359, so a case can say "the same 色相". */
const hueOf = (colour: string): number => {
  const { r, g, b } = rgbOf(colour)
  const high = Math.max(r, g, b)
  const low = Math.min(r, g, b)
  if (high === low) return 0
  const span = high - low
  const raw =
    high === r ? ((g - b) / span) % 6 : high === g ? (b - r) / span + 2 : (r - g) / span + 4
  return ((raw * 60) % 360 + 360) % 360
}

/** WCAG 2.1's relative luminance, which NFR-007 makes the measure. */
const luminanceOf = (colour: string): number => {
  const { r, g, b } = rgbOf(colour)
  const lit = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lit(r) + 0.7152 * lit(g) + 0.0722 * lit(b)
}

/** WCAG 2.1's contrast ratio. */
const contrastOf = (one: string, other: string): number => {
  const a = luminanceOf(one)
  const b = luminanceOf(other)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** 無彩色: no channel differs from another. */
const isAchromatic = (colour: string): boolean => {
  const { r, g, b } = rgbOf(colour)
  return Math.abs(r - g) < 0.004 && Math.abs(g - b) < 0.004
}

// ---------------------------------------------------------------------------
// The scenes.
// ---------------------------------------------------------------------------

/** UID 1 is under way and late; UID 2 follows it and carries a chosen colour. */
const LATE = spanning(1, '2026-01-01', 10, {
  name: 'alpha',
  percentComplete: 40,
  actualStart: '2026-01-01',
  actualDuration: 5,
})
const AFTER = spanning(2, '2026-01-20', 10, {
  name: 'beta',
  dependencies: [{ predecessorUid: 1, type: 1, lag: 0 }],
})

const scene = (part: Record<string, unknown> = {}): Schedule =>
  oneRow([LATE, AFTER], {
    project: { calendarUid: null, statusDate: '2026-01-15', themeHue: 214, title: null },
    ...part,
  })

/** The horizontal span a bar covers, read from the vertices it is drawn with. */
const spanOf = (bar: Element): { readonly from: number; readonly to: number } => {
  const points = (attribute(bar.text, 'points') as string).trim().split(/\s+/)
  const xs = points.map((onePoint) => Number((onePoint.split(',')[0] as string)))
  return { from: Math.min(...xs), to: Math.max(...xs) }
}

/**
 * The 予定バー and the 実績バー of the Task that has no chosen colour, told
 * apart by what they are and not by where they sit in the paint order.
 *
 * ⚠️ 表 T-020 orders KINDS of element, once for the whole picture, and says
 * nothing per `Task`. The two sentences under it settle that, because both
 * speak of elements of DIFFERENT tasks meeting: 「実績バーが名称ラベルを覆って
 * はならない（MUST NOT）」 —— a Task cannot cover its own label, since ZO-2 is
 * behind ZO-5 by the table itself; the prohibition only says something when the
 * label belongs to another `Task`（this tool puts several on one row）. And
 * 「依存線を背面に置くと交差部分が消えて線が途切れて見えるので、バーより前面
 * に置く」 —— a 依存線 crosses the bars of the tasks it runs between, so the
 * reason given holds only if EVERY 依存線 is in front of EVERY バー. Both read
 * as one global order: all 予定バー, then all 実績バー, then all 進捗マーカー,
 * and so on. Taking `filled[1]` for the 実績バー was therefore wrong of this
 * file: with two Tasks in the scene it is the 予定バー of the second one.
 *
 * What tells the two apart instead is the days each bar is fixed to. FR-011:
 * 「実績バーの左端を `actualStart`、右端を `actualStart` に `actualDuration`
 * を稼働日で加えた日とし」。`LATE` is the only Task of the scene carrying
 * 実績, and its 5 稼働日 fall inside its own 10 日の予定, while the other Task's
 * 予定（2026-01-20〜）shares no day with it. So exactly one bar has its span
 * inside another bar's span: that inner one is the 実績バー, and the bar around
 * it is the 予定バー of the same `Task`.
 *
 * ⛔ NESTING ALONE STOPPED BEING ENOUGH ON 2026-08-26, and what replaces it is
 * a row, not a looser reading. `AFTER` is 未着手, so FR-043 (MUST) now owes it
 * 「実績の入力を始める掴みシロを**2 つ**…**薄く**タスクの上に示し」, and `GR-17` of
 * 表 T-023d puts the second of them 「未着手のタスクの上、`S-129` ぶん進んだ
 * 稼働日」 -- which is inside `AFTER`'s own 予定バー. A second figure therefore
 * nests, and FR-013 (MUST) has already said that neither its colour nor its band
 * can be told from the 実績バー's: 「色は実績バーの色を継ぎ、独立した色を保存
 * しない」（`FR-041`）.
 * ⭐ THE ROW THAT TELLS THEM APART IS THE ONE THAT MADE THEM ALIKE. The same MUST
 * draws the ダミー 薄く -- 「濃さの値は `S-131`」 -- and no requirement draws an
 * 実績バー 薄く, so a figure the picture states a 濃さ for is a ダミー and not a
 * bar. ⚠️ NOT S-180's width: that row settles how wide a ダミー is DRAWN, and a
 * short enough 実績バー could be drawn exactly as wide.
 */
const themeBars = (svg: string): { plan: string; actual: string } => {
  const faint = faintlyDrawn(svg)
  const bars = paintedOf(svg).filter((drawn) => drawn.tag === 'polygon' && !faint.has(drawn.at))
  const spans = bars.map(spanOf)
  const nested: { readonly plan: Element; readonly actual: Element }[] = []
  for (let outer = 0; outer < bars.length; outer += 1) {
    for (let inner = 0; inner < bars.length; inner += 1) {
      if (outer === inner) continue
      const around = spans[outer] as { from: number; to: number }
      const within = spans[inner] as { from: number; to: number }
      const covers = around.from <= within.from && around.to >= within.to
      const shorter = around.from < within.from || around.to > within.to
      if (covers && shorter) {
        nested.push({ plan: bars[outer] as Element, actual: bars[inner] as Element })
      }
    }
  }
  expect(nested.length, '実績を持つ `Task` は 1 つなので、内側のバーは 1 本').toBe(1)
  const pair = nested[0] as { plan: Element; actual: Element }
  return {
    plan: attribute(pair.plan.text, 'fill') as string,
    actual: attribute(pair.actual.text, 'fill') as string,
  }
}

// ---------------------------------------------------------------------------

describe('UF-32 -- FR-080: 画面の全体を、同じ比で縮めて書き出す', () => {
  it('gives the picture the whole screen, not a narrower rectangle', () => {
    // FR-080: 「切り出す範囲は `GRS` が占める画面の全体とすること（MUST）。
    // 画面より狭い矩形を切り出してはならない（MUST NOT）」
    const svg = drawn(scene())
    const root = elementsOf(svg)[0] as Element
    expect(root.tag).toBe('svg')
    expect(attribute(root.text, 'width')).toBe(String(ENV.width))
    expect(attribute(root.text, 'height')).toBe(String(ENV.height))
  })

  it('keeps the same whole screen when the screen is a different size', () => {
    const other: ScreenEnvironment = {
      width: 1280,
      height: 800,
      appHeaderHeight: 40,
      scrollbarThickness: 17,
    }
    const root = elementsOf(drawn(scene(), SETTINGS, emptySelection(), other))[0] as Element
    expect(attribute(root.text, 'width')).toBe('1280')
    expect(attribute(root.text, 'height')).toBe('800')
  })

  it('adds no margin at the edge, so the ratio stays the screen width', () => {
    // FR-080: 「出力の縁に余白を足してはならない（MUST NOT）」。
    // A viewBox that did not start at 0 0, or that was wider than the screen,
    // would be exactly that margin.
    const root = elementsOf(drawn(scene()))[0] as Element
    expect(attribute(root.text, 'viewBox')).toBe(`0 0 ${ENV.width} ${ENV.height}`)
  })

  it('scales the two axes together, so the viewBox matches the frame', () => {
    // FR-080: 「縦にも横にも同じ比を掛けること（MUST）。縦と横に別の比を
    // 掛けてはならない（MUST NOT）」-- one ratio means the viewBox and the
    // frame share an aspect.
    const root = elementsOf(drawn(scene()))[0] as Element
    const box = (attribute(root.text, 'viewBox') as string).split(/\s+/).map(Number)
    const frame = [Number(attribute(root.text, 'width')), Number(attribute(root.text, 'height'))]
    expect((box[2] as number) / (box[3] as number)).toBeCloseTo(
      (frame[0] as number) / (frame[1] as number),
      10,
    )
  })
})

describe('UF-32 -- FR-007: 作成者が指定した線色・塗り色', () => {
  it('paints the bar with the 線色 and 塗り色 the author chose', () => {
    // FR-007: 「線色と塗り色を個別に指定できるようにすること」。
    // 表 T-016 の PR-12 keeps them on `TaskVisual` as strokeColor / fillColor.
    const svg = drawn(
      scene({ taskVisuals: [visualOf(2, { fillColor: '#c62828', strokeColor: '#1b5e20' })] }),
    )
    const chosen = paintedOf(svg).find((drawn) => attribute(drawn.text, 'fill') === '#c62828')
    expect(chosen, 'the chosen 塗り色 reaches the picture').toBeDefined()
    expect(attribute((chosen as Element).text, 'stroke')).toBe('#1b5e20')
  })

  it('takes 線色 and 塗り色 one at a time, leaving the other on the theme', () => {
    // FR-007: 「個別に指定できるようにすること」。
    const svg = drawn(scene({ taskVisuals: [visualOf(2, { strokeColor: '#1b5e20' })] }))
    const chosen = paintedOf(svg).find((drawn) => attribute(drawn.text, 'stroke') === '#1b5e20')
    expect(chosen, 'a 線色 on its own reaches the picture').toBeDefined()
    const fill = attribute((chosen as Element).text, 'fill') as string
    expect(fill).not.toBe('#1b5e20')
    expect(hueOf(fill)).toBeCloseTo(214, 0)
  })

  it('leaves a chosen colour where it is when themeHue moves', () => {
    // FR-007: 「パレットから選べば上書きになり、`themeHue` や明暗を変えても
    // 動かなくなる」
    const visuals = [visualOf(2, { fillColor: '#c62828', strokeColor: '#1b5e20' })]
    const at214 = drawn(scene({ taskVisuals: visuals }))
    const at30 = drawn(
      scene({
        project: { calendarUid: null, statusDate: '2026-01-15', themeHue: 30, title: null },
        taskVisuals: visuals,
      }),
    )
    for (const svg of [at214, at30]) {
      expect(coloursOf(svg)).toContain('#c62828')
      expect(coloursOf(svg)).toContain('#1b5e20')
    }
  })
})

describe('UF-32 -- FR-041: テーマ追随', () => {
  it('follows themeHue for a Task that names no colour', () => {
    // FR-041: 「色を指定していない `Task` と `TaskGroup`・行の帯・地の色…を
    // それに追随させて描くこと」
    const at214 = themeBars(drawn(scene()))
    const at30 = themeBars(
      drawn(
        scene({
          project: { calendarUid: null, statusDate: '2026-01-15', themeHue: 30, title: null },
        }),
      ),
    )
    expect(at214.plan).not.toBe(at30.plan)
    expect(hueOf(at214.plan)).toBeCloseTo(214, 0)
    expect(hueOf(at30.plan)).toBeCloseTo(30, 0)
  })

  it('draws 予定 and 実績 from the one hue, the 実績 darker', () => {
    // FR-007: 「実績の色は予定と同じ色相から導き、実績を濃く描くこと（MUST）。
    // 予定と実績で別の色相を選べてはならない（MUST NOT）」
    for (const hue of [0, 30, 120, 214, 300]) {
      const { plan, actual } = themeBars(
        drawn(
          scene({
            project: { calendarUid: null, statusDate: '2026-01-15', themeHue: hue, title: null },
          }),
        ),
      )
      expect(hueOf(actual), `hue ${hue}: 同じ色相`).toBeCloseTo(hueOf(plan), 0)
      expect(luminanceOf(actual), `hue ${hue}: 実績を濃く`).toBeLessThan(luminanceOf(plan))
    }
  })

  it('meets CT-3 of 表 T-017a, which FR-007 makes a MUST', () => {
    // FR-007: 「テーマ色の解き方は `themeHue` からの算出とし、表 T-017a の
    // 条件をすべて満たすこと（MUST）」。NFR-007 fixes the measure: WCAG 2.1.
    // `_assets/tbl-settings.md` §5 records the measurement the requirement was
    // written from -- 「実績 ÷ 予定 = ライト 4.81 : 1」 at hue 214.
    for (const hue of [30, 214]) {
      const { plan, actual } = themeBars(
        drawn(
          scene({
            project: { calendarUid: null, statusDate: '2026-01-15', themeHue: hue, title: null },
          }),
        ),
      )
      expect(contrastOf(actual, plan), `CT-3 at hue ${hue} (${actual} / ${plan})`)
        .toBeGreaterThanOrEqual(T_017a['CT-3'].least)
    }
  })

  it('follows 明暗 as well as 色相 for a Task that names no colour', () => {
    // FR-041 STATEMENT: 「作成者がテーマの色相・明暗・モノクロを選んだとき、
    // `GRS` は、色を指定していない `Task` と `TaskGroup`…をそれに追随させて
    // 描くこと」。明暗 is `themePreference`（表 T-203 の S-72）, and FR-041
    // names what it moves: 「地の彩度・予定と実績と輪郭線の明度の寄せ幅…を、
    // そこから規則で解いて求めること（MUST）」。
    // `_assets/tbl-settings.md` §5 records the two measurements apart --
    // 「実績 ÷ 予定 = ライト 4.81 : 1 / ダーク 3.74 : 1」 -- so the 寄せ幅 the
    // rule solves for is not the same one in both.
    const light = themeBars(drawn(scene(), settingsOf({ ...SETTINGS, themePreference: 'light' })))
    const dark = themeBars(drawn(scene(), settingsOf({ ...SETTINGS, themePreference: 'dark' })))
    expect(dark.plan, '明暗 moves the 予定バー').not.toBe(light.plan)
  })

  it('draws even a chosen colour 無彩色 while themeMonochrome holds', () => {
    // FR-041 RATIONALE: 「モノクロは描画の段で効くので、人が指定した色も
    // 無彩色で描かれる。保存値は変わらないので、戻せば色も戻る」
    const visuals = [visualOf(2, { fillColor: '#c62828', strokeColor: '#1b5e20' })]
    const mono = drawn(
      scene({ taskVisuals: visuals }),
      settingsOf({ ...SETTINGS, themeMonochrome: true }),
    )
    expect(coloursOf(mono)).not.toContain('#c62828')
    expect(coloursOf(mono)).not.toContain('#1b5e20')
    const { plan, actual } = themeBars(mono)
    expect(isAchromatic(plan), `the plan bar is 無彩色 (${plan})`).toBe(true)
    expect(isAchromatic(actual), `the actual bar is 無彩色 (${actual})`).toBe(true)
  })

  it('returns to the chosen colour when themeMonochrome is dropped again', () => {
    // FR-041: 「保存値は変わらないので、戻せば色も戻る」-- the same values in,
    // monochrome off, and the author's colour is back.
    const visuals = [visualOf(2, { fillColor: '#c62828', strokeColor: '#1b5e20' })]
    const back = drawn(
      scene({ taskVisuals: visuals }),
      settingsOf({ ...SETTINGS, themeMonochrome: false }),
    )
    expect(coloursOf(back)).toContain('#c62828')
  })

  it('keeps 依存線 and イナズマ線 on TWO different fixed colours that themeHue does not move', () => {
    // FR-041: 「依存線とイナズマ線も追随させないこと（MUST NOT）。両者は別の
    // 固定色とし、どちらも文書に保存しないこと（MUST NOT）」。
    // ⚠️ 「同じ固定色」 was the rule until 2026-08-25. FR-041 itself records why
    // it went: the one sentence also listed both among what DOES follow the
    // theme, so it contradicted itself. `_assets/tbl-settings.md` の 表 T-236
    // now gives them a row each -- `S-159` for the 依存線, `S-160` for the
    // イナズマ線 -- and both carry 「—」 in the 色相追随 column.
    // FR-014 owns the イナズマ線; S-64 の progressLineVisible puts it on screen.
    const showing = settingsOf({ ...SETTINGS, progressLineVisible: true })

    // ⛔ READ AS A SET, NOT BY PAINT ORDER. 表 T-020 ranks the 依存線 (`ZO-4`)
    // and prints no row at all for the イナズマ線, so which of the two is drawn
    // first is nothing the specification fixes -- and a case that took
    // `strokes[0]` for one of them would be asserting an order no row states.
    const strokesAt = (hue: number): readonly string[] => {
      const svg = drawn(
        scene({
          project: { calendarUid: null, statusDate: '2026-01-15', themeHue: hue, title: null },
        }),
        showing,
      )
      const polylines = paintedOf(svg).filter((drawn) => drawn.tag === 'polyline')
      expect(polylines.length, 'both the 依存線 and the イナズマ線 are drawn').toBe(2)
      return polylines.map((drawn) => attribute(drawn.text, 'stroke') as string)
    }
    const at214 = strokesAt(214)
    const at30 = strokesAt(30)

    // 「両者は別の固定色とし」-- two colours, so the pair holds two values.
    expect(new Set(at214).size, '別の固定色').toBe(2)
    // 「追随させないこと（MUST NOT）」-- moving the hue by 184 degrees moves
    // neither of them, so the same two values come back.
    expect([...at30].sort(), 'themeHue moves neither').toEqual([...at214].sort())
    // 固定色 means neither is the hue's own colour either.
    const plan = themeBars(drawn(scene(), showing)).plan
    for (const stroke of at214) expect(stroke, 'not the theme colour').not.toBe(plan)
  })

  it('writes no derived colour back into the values it was handed', () => {
    // FR-041: 「派生する色を保存してはならない（MUST NOT）。保存するのは
    // `themeHue` / `themeMonochrome` / `themePreference` の 3 つだけとし…」。
    // Table T-075 makes the unit `pure`, so the only place it could store one
    // is its own arguments.
    const schedule = scene({ taskVisuals: [visualOf(2, { fillColor: '#c62828' })] })
    const before = JSON.stringify(schedule)
    const beforeSettings = JSON.stringify(SETTINGS)
    drawn(schedule)
    expect(JSON.stringify(schedule)).toBe(before)
    expect(JSON.stringify(SETTINGS)).toBe(beforeSettings)
  })
})

describe('UF-32 -- 表 T-020a の GD-6: 依存線と補助線の見分け', () => {
  /**
   * A scene whose one `Task` has its 実績 nowhere near its 予定, so GD-1's
   * condition holds -- 「予定と実績が時間軸上で重ならないとき」 -- and a second
   * `Task` depending on it, so the picture carries a 依存線 as well.
   */
  const APART = spanning(1, '2026-02-01', 10, {
    name: 'alpha',
    percentComplete: 40,
    actualStart: '2026-01-01',
    actualDuration: 5,
  })
  const FOLLOWER = spanning(2, '2026-03-01', 10, {
    name: 'beta',
    dependencies: [{ predecessorUid: 1, type: 1, lag: 0 }],
  })
  const APART_SCENE = oneRow([APART, FOLLOWER], {
    project: { calendarUid: null, statusDate: '2026-02-15', themeHue: 214, title: null },
  })

  // S-64 keeps the イナズマ線 off, so every `polyline` in these pictures is
  // either a 依存線 or a 補助線.
  const SHOWN = settingsOf({ ...SETTINGS, progressLineVisible: false })
  const WITHOUT_LINKS = settingsOf({ ...SHOWN, dependencyVisible: false })

  const polylinesOf = (svg: string): readonly Element[] =>
    paintedOf(svg).filter((drawn) => drawn.tag === 'polyline')

  /**
   * ⛔ THE TWO ARE TOLD APART BY 表 T-202, NOT BY GD-6. GD-6 is what is being
   * checked, so using its own words (実線 / 点線) to find each line would make
   * the case agree with any picture at all. `dependencyVisible` (S-62) is the
   * independent handle: EP-5 of 表 T-076 says 「個々を描くかどうかは表 T-202 の
   * 表示の切り替えに従う」, so the lines that appear only when it is on
   * are the 依存線, and the ones drawn either way are the 補助線.
   */
  const withLinks = (): { links: readonly Element[]; guides: readonly Element[] } => {
    const guides = polylinesOf(drawn(APART_SCENE, WITHOUT_LINKS))
    const all = polylinesOf(drawn(APART_SCENE, SHOWN))
    const links = all.filter((drawn) => !guides.some((oneGroup) => oneGroup.text === drawn.text))
    return { links, guides }
  }

  it('draws both kinds at once, so the pair can be compared', () => {
    // GD-1 (引く条件) and FR-009's 依存線 both hold in this scene.
    const { links, guides } = withLinks()
    expect(guides.length, 'GD-1: the 予定 and the 実績 do not overlap').toBeGreaterThan(0)
    expect(links.length, 'FR-009: the second Task depends on the first').toBeGreaterThan(0)
  })

  it('GD-6 (MUST): the 依存線 carries an arrowhead', () => {
    // 「依存線は実線で矢じりを持ち」.
    const { links } = withLinks()
    for (const link of links) {
      expect(attribute(link.text, 'marker-end'), '矢じりを持つ').not.toBeNull()
      expect(attribute(link.text, 'stroke-dasharray'), '実線').toBeNull()
    }
    // The head it points at is really in the picture and not a dangling name.
    const svg = drawn(APART_SCENE, SHOWN)
    const id = /url\(#([^)]+)\)/.exec((links[0] as Element).text)?.[1] as string
    expect(svg, 'the arrowhead is defined').toContain(`id="${id}"`)
    expect(elementsOf(svg).some((drawn) => drawn.tag === 'marker')).toBe(true)
  })

  it('GD-6 (MUST): the 補助線 carries none', () => {
    // 「補助線は点線で矢じりを持たない」.
    const { guides } = withLinks()
    for (const guide of guides) {
      expect(attribute(guide.text, 'marker-end'), '矢じりを持たない').toBeNull()
      expect(attribute(guide.text, 'stroke-dasharray'), '点線').not.toBeNull()
    }
  })

  it('GD-6 (MUST NOT): neither the thickness nor the dash follows the zoom', () => {
    // 「太さと刻みをズームに追随させてはならない（MUST NOT）」.
    const readAt = (zoomX: number): readonly string[] => {
      const at = settingsOf({ ...SHOWN, zoomX })
      return polylinesOf(drawn(APART_SCENE, at))
        .filter((drawn) => attribute(drawn.text, 'stroke-dasharray') !== null)
        .map(
          (drawn) =>
            `${attribute(drawn.text, 'stroke-width') ?? ''}|${attribute(drawn.text, 'stroke-dasharray') ?? ''}`,
        )
    }
    const near = readAt(1)
    expect(near.length).toBeGreaterThan(0)
    expect(readAt(4), '拡大しても同じ').toEqual(near)
  })
})

describe('UF-32 -- FR-019: 注記の固定色', () => {
  const withBox = (hue: number, strokeColor: string | null): string =>
    drawn(
      scene({
        project: { calendarUid: null, statusDate: '2026-01-15', themeHue: hue, title: null },
        highlightBoxes: [
          {
            id: 'h1',
            startDate: '2026-01-02',
            endDate: '2026-01-08',
            topGroupId: 'g1',
            bottomGroupId: 'g1',
            strokeColor,
            cornerRadiusPx: null,
          },
        ],
      }),
    )

  /**
   * ⛔ NOT THE FIRST `rect`. A row band is a `rect` too -- `S-166` of 表 T-236
   * gives 最上位の行の地の色 -- and it is painted behind the annotation, so the
   * first `rect` of the picture is the band and not the box. This helper took
   * it, and every value it returned was the band's missing `stroke`.
   *
   * What tells them apart is what each row of the table asks for: the band is a
   * 地の色 (a fill, `S-166`), while FR-019 gives the HighlightBox a 線色 -- so
   * the box is the `rect` that carries a `stroke`. The case asserts there is
   * exactly one, so a second stroked `rect` cannot silently take its place.
   */
  const boxStroke = (svg: string): string => {
    const stroked = paintedOf(svg).filter(
      (drawn) => drawn.tag === 'rect' && attribute(drawn.text, 'stroke') !== null,
    )
    expect(stroked.length, 'exactly one stroked rect -- the HighlightBox').toBe(1)
    return attribute((stroked[0] as Element).text, 'stroke') as string
  }

  it('draws a box with no 線色 in a fixed colour kept away from the hue and the 依存線', () => {
    // FR-019: 「指定が無ければ注記用の固定色で描くこと（MUST）。その固定色は、
    // テーマの色相・依存線・イナズマ線のいずれからも離した色とする」。
    // FR-041 repeats it from the other side: 「注記の固定色は追随させない
    // （MUST NOT）」
    const at214 = boxStroke(withBox(214, null))
    const at30 = boxStroke(withBox(30, null))
    expect(at30, 'テーマの色相に追随しない').toBe(at214)
    const svg = withBox(214, null)
    const link = attribute(
      (paintedOf(svg).find((drawn) => drawn.tag === 'polyline') as Element).text,
      'stroke',
    ) as string
    expect(at214, '依存線から離した色').not.toBe(link)
    expect(at214, 'テーマの色相から離した色').not.toBe(themeBars(svg).plan)
  })

  it('uses the 線色 the author chose for the box', () => {
    // FR-019: 「ハイライトボックスの線色を指定でき」
    expect(boxStroke(withBox(214, '#4527a0'))).toBe('#4527a0')
  })
})

describe('UF-32 -- FR-030 / SL-8: 色だけで伝えない', () => {
  it('marks a selected Task with a handle that is not a colour', () => {
    // 表 T-023c の SL-8: 「選択されていることを、色以外の手掛かりでも示すこと
    // （MUST）」（`FR-030`）。FR-030 names the means: 形状・線の太さ・記号。
    const plain = drawn(scene())
    const picked = drawn(scene(), SETTINGS, selectionWith(emptySelection(), { kind: 'task', uid: 2 }))
    expect(picked, 'selecting changes the picture').not.toBe(plain)

    const added = paintedOf(picked).filter(
      (drawn) => !paintedOf(plain).some((onePoint) => onePoint.text === drawn.text),
    )
    expect(added.length, 'something is drawn for the selection').toBeGreaterThan(0)
    // 色以外の手掛かり: at least one of the added marks differs from the
    // unselected picture by something other than a colour value.
    const nonColour = added.some((drawn) => {
      const dash = attribute(drawn.text, 'stroke-dasharray')
      const width = attribute(drawn.text, 'stroke-width')
      return dash !== null || (width !== null && Number(width) > SETTINGS.planStroke)
    })
    expect(nonColour, '形状・線の太さ・記号のいずれかで区別されている').toBe(true)
  })

  it('takes the mark away again when nothing is selected', () => {
    const picked = drawn(scene(), SETTINGS, selectionWith(emptySelection(), { kind: 'task', uid: 2 }))
    expect(paintedOf(drawn(scene())).length).toBeLessThan(paintedOf(picked).length)
  })
})

describe('UF-32 -- SL-8 of 表 T-023c: the sign splits by the kind of the target', () => {
  // 表 T-023c の `SL-8`: 「手掛かりは対象の種類で 2 つに分けること（MUST）。
  // タスク・ハイライトボックス・コメントボックスは、外接矩形に沿った破線の枠で
  // 囲むこと（MUST）…⛔ 対象自身の輪郭をなぞってはならない（MUST NOT）。
  // 依存線と基準日線は、その線自身の太さに 表 T-206 の `S-178` を掛けて太く描く
  // こと（MUST）。この 2 種を枠で囲んではならない（MUST NOT）…どちらも倍率に
  // 追随させてはならない（MUST NOT）」
  //
  // ⭐ Chapter 1.9 asks a case driven by a table to be driven by a FIXED COPY of
  // it. `T_206_SELECTION` below is that copy of the three rows 表 T-206 holds
  // for the sign; ⛔ no value here is read out of `src/`.

  /** 表 T-206 — the sizes of the selection sign. Not stored in the document. */
  const T_206_SELECTION = {
    /** S-174 -- 選択の枠の太さ, px */
    'S-174': 2,
    /** S-175 -- 選択の枠の破線の刻み: 描く長さと空ける長さ, px */
    'S-175': [2, 2],
    /** S-178 -- 選択された線の太さの倍率, × */
    'S-178': 2,
  } as const

  const HIGHLIGHT = {
    id: 'h1',
    startDate: '2026-01-02',
    endDate: '2026-01-08',
    topGroupId: 'g1',
    bottomGroupId: 'g1',
    strokeColor: '#4527a0',
    cornerRadiusPx: null,
  }

  const COMMENT = {
    id: 'c1',
    leaderShapeKind: 'calloutBox',
    text: 'a remark',
    anchorDate: '2026-01-05',
    anchorGroupId: 'g1',
    bodyOffsetPx: { dx: 20, dy: -20 },
  }

  /** The scene every case here selects out of: two Tasks, a link, both boxes, a 基準日. */
  const ALL_KINDS = (): Schedule => scene({ highlightBoxes: [HIGHLIGHT], commentBoxes: [COMMENT] })

  type Ref = Parameters<typeof selectionWith>[1]

  const pictureOf = (ref: Ref | null, settings: DocumentSettings = SETTINGS): string =>
    drawn(ALL_KINDS(), settings, ref === null ? emptySelection() : selectionWith(emptySelection(), ref))

  /**
   * One element, with anything a SECOND drawing of the same picture may spell
   * differently taken out.
   *
   * ⚠️ The `marker` GD-6 (MUST) puts on the arrow end of a 依存線 has to carry an
   * `id`, and an SVG that is put on a page beside another one cannot share it --
   * so the id differs between two drawings of the SAME picture, and two pictures
   * cannot be told apart by their text until it is taken out. ⛔ It is the only
   * thing normalised: everything else that differs is a difference of the sign.
   */
  const settledText = (element: Element): string =>
    element.text.replace(/(id="|url\(#)[^"')]*/g, '$1')

  /** The elements a selection ADDS to the picture. */
  const addedBy = (ref: Ref, settings: DocumentSettings = SETTINGS): readonly Element[] => {
    const plain = paintedOf(pictureOf(null, settings)).map(settledText)
    return paintedOf(pictureOf(ref, settings)).filter((drawn) => !plain.includes(settledText(drawn)))
  }

  /** A frame is a `rect` carrying the dash 表 T-206 gives the sign. */
  const framesIn = (elements: readonly Element[]): readonly Element[] =>
    elements.filter((drawn) => drawn.tag === 'rect' && attribute(drawn.text, 'stroke-dasharray') !== null)

  const strokeWidthOf = (element: Element): number => Number(attribute(element.text, 'stroke-width'))

  // -- the half that IS framed ---------------------------------------------

  // ⛔ コメントボックス IS THE THIRD KIND SL-8 FRAMES and it is not here. This
  // unit draws no comment box at all -- the scene above carries one, and no
  // element of the picture answers to it -- so there is nothing for a frame to
  // go round and the case would be measuring 表 T-076 の `EP-5`（`Annotations`
  // を描く）rather than `SL-8`. ⚠️ REPORTED rather than asserted here: the gap
  // is older than `SL-8`'s split and belongs to whoever draws the annotation.
  const FRAMED: readonly { readonly what: string; readonly ref: Ref }[] = [
    { what: 'タスク', ref: { kind: 'task', uid: 2 } },
    { what: 'ハイライトボックス', ref: { kind: 'highlightBox', id: HIGHLIGHT.id } },
  ]

  for (const one of FRAMED) {
    it(`frames ${one.what} with a dashed rectangle at S-174 / S-175 (SL-8, MUST)`, () => {
      const frames = framesIn(addedBy(one.ref))

      expect(frames.length, '外接矩形に沿った破線の枠が 1 つ').toBe(1)
      const frame = frames[0] as Element
      expect(strokeWidthOf(frame), 'S-174 -- 枠の太さ').toBe(T_206_SELECTION['S-174'])
      expect(attribute(frame.text, 'stroke-dasharray'), 'S-175 -- 破線の刻み').toBe(
        `${T_206_SELECTION['S-175'][0]} ${T_206_SELECTION['S-175'][1]}`,
      )
      // 外接矩形に沿った枠なので面は塗らない -- a filled one would hide what it marks.
      expect(attribute(frame.text, 'fill')).toBe('none')
      expect(attribute(frame.text, 'stroke')).not.toBe('none')
    })

    it(`⛔ leaves ${one.what}'s own outline exactly as it was (SL-8, MUST NOT)`, () => {
      // 「対象自身の輪郭をなぞってはならない（MUST NOT）」-- the sign is a
      // SEPARATE rectangle, so nothing already in the picture is redrawn.
      const plain = paintedOf(pictureOf(null)).map(settledText)
      const picked = paintedOf(pictureOf(one.ref)).map(settledText)

      expect(picked.filter((text) => !plain.includes(text)).length).toBeGreaterThan(0)
      expect(
        plain.filter((text) => !picked.includes(text)),
        '元からある要素は 1 つも描き替えられない',
      ).toEqual([])
    })
  }

  it('gives all three framed kinds the ONE colour SL-8 names (S-151 of 表 T-236)', () => {
    // 「色は同書の 表 T-236 の `S-151` が持つ」-- one row, so one colour; and
    // 表 T-236 writes it `hsl(H …)`, so its 色相 is `themeHue`. ⛔ Neither the
    // saturation nor the lightness is asserted: this file's head note records
    // that the specification states those in words and gives no number.
    const colours = FRAMED.map(
      (one) => attribute((framesIn(addedBy(one.ref))[0] as Element).text, 'stroke') as string,
    )

    expect(new Set(colours).size, '枠を持つ種はどれも 1 色').toBe(1)
    expect(Math.round(hueOf(colours[0] as string)), 'S-151 は `hsl(H …)`、H は themeHue').toBe(214)
  })

  // -- the half that is THICKENED ------------------------------------------

  const LINES: readonly {
    readonly what: string
    readonly ref: Ref
    readonly find: (svg: string) => Element
  }[] = [
    {
      what: '依存線',
      ref: { kind: 'dependency', successorUid: 2, ordinal: 0 },
      find: (svg) => paintedOf(svg).find((drawn) => drawn.tag === 'polyline') as Element,
    },
    {
      what: '基準日線',
      ref: { kind: 'statusLine' },
      // `CU-1` of 表 T-029 draws ONE vertical line at `Project.statusDate`, and
      // `SL-8` itself says how far it runs: 「`Row Area` の高さいっぱい」. So among
      // the picture's straight lines it is the tallest, and no ruler tick or row
      // separator reaches as far.
      find: (svg) => {
        const heightOf = (e: Element): number =>
          Math.abs(Number(attribute(e.text, 'y2')) - Number(attribute(e.text, 'y1')))
        const lines = paintedOf(svg).filter((drawn) => drawn.tag === 'line')
        return lines.reduce((tallest, e) => (heightOf(e) > heightOf(tallest) ? e : tallest))
      },
    },
  ]

  for (const one of LINES) {
    it(`draws ${one.what} at S-178 times its own width and puts no frame on it (SL-8)`, () => {
      const before = one.find(pictureOf(null))
      const after = one.find(pictureOf(one.ref))

      expect(before, `${one.what} は選択していないときも描かれる`).toBeDefined()
      expect(strokeWidthOf(before), 'その線は自分の太さを持つ').toBeGreaterThan(0)
      expect(strokeWidthOf(after), 'その線自身の太さに S-178 を掛けた太さ').toBeCloseTo(
        strokeWidthOf(before) * T_206_SELECTION['S-178'],
        6,
      )
      // ⛔ 「この 2 種を枠で囲んではならない（MUST NOT）」
      expect(framesIn(addedBy(one.ref)), '枠で囲まない').toEqual([])
    })
  }

  // -- neither half follows the zoom ---------------------------------------

  it('⛔ follows the zoom with neither half (SL-8, MUST NOT)', () => {
    // 「どちらも倍率に追随させてはならない（MUST NOT）」-- the sign is for the
    // reader's eye, and the eye does not zoom with the schedule.
    const zoomed = settingsOf({ ...SETTINGS, zoomX: 4, zoomY: 4 })
    const task: Ref = { kind: 'task', uid: 2 }

    const frameAt1 = framesIn(addedBy(task))[0] as Element
    const frameAt4 = framesIn(addedBy(task, zoomed))[0] as Element
    expect(strokeWidthOf(frameAt4)).toBe(strokeWidthOf(frameAt1))
    expect(attribute(frameAt4.text, 'stroke-dasharray')).toBe(
      attribute(frameAt1.text, 'stroke-dasharray'),
    )

    const line = LINES[0] as (typeof LINES)[number]
    const ratioAt = (settings: DocumentSettings): number =>
      strokeWidthOf(line.find(pictureOf(line.ref, settings))) /
      strokeWidthOf(line.find(pictureOf(null, settings)))
    expect(ratioAt(zoomed)).toBeCloseTo(ratioAt(SETTINGS), 6)
    expect(ratioAt(zoomed)).toBeCloseTo(T_206_SELECTION['S-178'], 6)
  })
})

describe('UF-32 -- 表 T-020: 重ね順（背面から前面へ）', () => {
  it('paints 予定バー, then 実績バー, then 依存線', () => {
    // 表 T-020 puts 依存線 at ZO-4 and the two bars at ZO-1 and ZO-2, and
    // FR-011 says why: 「依存線を背面に置くと交差部分が消えて線が途切れて
    // 見えるので、バーより前面に置く」。The order elements are written in an
    // SVG IS the stacking order, so ZO-4 must come after ZO-1 and ZO-2.
    const svg = drawn(scene())
    const painted = paintedOf(svg)
    const dependency = painted.findIndex((drawn) => drawn.tag === 'polyline')
    const bars = painted.filter((drawn) => drawn.tag === 'polygon')
    expect(dependency, 'the 依存線 is drawn').toBeGreaterThanOrEqual(0)
    expect(bars.length, 'both bars are drawn').toBeGreaterThanOrEqual(2)

    const order = (row: string): number => T_020.find((oneRect) => oneRect.row === row)?.order as number
    expect(order('ZO-4')).toBeGreaterThan(order('ZO-1'))
    expect(order('ZO-4')).toBeGreaterThan(order('ZO-2'))
    for (const bar of bars.slice(0, 2)) {
      expect(
        painted.indexOf(bar),
        `${bar.text} は ZO-1 / ZO-2 なので ZO-4 の依存線より先に描かれる`,
      ).toBeLessThan(dependency)
    }
  })
})

describe('UF-32 -- 表 T-076 の EP-5: `Row Area` の中身を描く', () => {
  it('draws the Task Bars, the Dependency Lines and the Annotations', () => {
    const svg = drawn(
      scene({
        highlightBoxes: [
          {
            id: 'h1',
            startDate: '2026-01-02',
            endDate: '2026-01-08',
            topGroupId: 'g1',
            bottomGroupId: 'g1',
            strokeColor: null,
            cornerRadiusPx: null,
          },
        ],
      }),
    )
    expect(T_076_EP5).toContain('Task Bars (U-2)')
    expect(paintedOf(svg).filter((drawn) => drawn.tag === 'polygon').length).toBeGreaterThanOrEqual(2)
    expect(paintedOf(svg).filter((drawn) => drawn.tag === 'polyline').length).toBeGreaterThanOrEqual(1)
    expect(paintedOf(svg).filter((drawn) => drawn.tag === 'rect').length).toBeGreaterThanOrEqual(1)
  })

  it('follows 表 T-202 for each of them: dependencyVisible off takes the line away', () => {
    // 表 T-076 の EP-5: 「個々を描くかどうかは表 T-202 の表示の切り替えに従う」
    const off = drawn(scene(), settingsOf({ ...SETTINGS, dependencyVisible: false }))
    expect(paintedOf(off).filter((drawn) => drawn.tag === 'polyline')).toHaveLength(0)
  })

  it('draws the Progress Marker, and follows 表 T-202 for it', () => {
    // 表 T-076 の EP-5 lists `Progress Marker`（`U-5`）among what the picture
    // carries, and FR-080 makes the table a MUST: 「どの UI パーツを描き、どの
    // UI パーツを描かないかは、表 T-076 に従うこと（MUST）」。表 T-020 の ZO-3
    // gives it a place in the stack, and FR-030 RATIONALE calls the five
    // symbols of 表 T-021 「この原則の具体」.
    // UID 1 is under way and past the status date, so 表 T-021 の PM-4 holds.
    expect(T_076_EP5).toContain('Progress Marker (U-5)')
    const on = drawn(scene(), settingsOf({ ...SETTINGS, progressMarkerVisible: true }))
    const off = drawn(scene(), settingsOf({ ...SETTINGS, progressMarkerVisible: false }))
    expect(on, 'the marker is drawn when 表 T-202 says to draw it').not.toBe(off)
  })

  it('draws the Name Label', () => {
    // 表 T-076 の EP-5 lists `Name Label`（`U-7`）; 表 T-020 の ZO-5 puts it
    // at the front and adds 「実績バーが名称ラベルを覆ってはならない
    // （MUST NOT）」, which only means anything if the label is drawn.
    expect(T_076_EP5).toContain('Name Label (U-7)')
    const svg = drawn(scene())
    expect(svg, "the Task's name reaches the picture").toContain('alpha')
  })
})

// ---------------------------------------------------------------------------
// ⭐ WRITTEN FROM docs/spec BY SOMEONE WHO DID NOT WRITE THE UNIT
// (docs/development-rules/04-verification.md, 1.). What was read of the unit:
// the signature of `svgFromSchedule` and nothing below it. The two blocks that
// follow are the rules that landed on 2026-08-26 -- FR-013's faintness and the
// two label rows of 表 T-236.
// ---------------------------------------------------------------------------

describe('UF-32 -- FR-013: 未着手のマーカーは薄く描く', () => {
  /**
   * Every 濃さ the picture states, in the order it states them.
   *
   * ⚠️ The leading `\s` is not decoration: it keeps `fill-opacity` and
   * `stroke-opacity` out, which are a different thing from the element's own.
   */
  const faintnessOf = (svg: string): readonly number[] =>
    [...svg.matchAll(/\sopacity="([^"]*)"/g)].map((hit) => Number(hit[1]))

  /** S-131. 濃さの値 FR-013 names, printed from the manuscript by `npm run gen`. */
  const S_131 = SETTINGS_DEFAULTS['dummyOpacity'] as number

  /** S-180 -- 「実績のダミーを描く幅（表 T-023d の `GR-9` / `GR-17` / `GR-18`）」. */
  const S_180 = NOT_STORED_DUMMY_SIZES['S-180']

  /** The figures the picture draws 薄く, whatever kind of element they are. */
  const faintFiguresOf = (svg: string): readonly Element[] => {
    const faint = faintlyDrawn(svg)
    return paintedOf(svg).filter((drawn) => faint.has(drawn.at))
  }

  it('draws the not-started marker AND both 掴みシロ at S-131, and nothing else faint', () => {
    // FR-013 (MUST): 「未着手のマーカーと、実績入力のダミー（`FR-043`）は薄く
    // 描き、ポインタが乗っているあいだだけ濃くすること（MUST）…濃さの値は
    // `S-131`」。表 T-021 の `PM-1a` is the 未着手 symbol.
    //
    // ⛔ THAT SENTENCE NAMES TWO THINGS, AND THIS CASE USED TO ASK FOR ONE. It
    // read 「薄さで進行中と区別してはならない（MUST NOT）」 as a licence to
    // demand a single 濃さ in the whole picture; that MUST NOT is about the
    // MARKER's five symbols -- 「形が意味を担う」（`FR-030`）, 表 T-021 -- and
    // says nothing about how many figures may be drawn 薄く. ⚠️ The old reading
    // was green only for as long as nothing drew the ダミー.
    const svg = drawn(oneRow([spanning(1, '2026-01-05', 5, { name: 'idle' })]))
    expect(
      new Set(faintnessOf(svg)),
      'every 濃さ the picture states is `S-131`, and it states no other',
    ).toEqual(new Set([S_131]))

    // FR-043 (MUST): 「`Task` が未着手であるあいだ、`GRS` は、実績の入力を始める
    // 掴みシロを**2 つ**（マイルストーンは例外とする）、実績の開始点と終了点と
    // して**薄く**タスクの上に示し」 -- two of them, and drawn 薄く.
    const faint = faintFiguresOf(svg)
    const dummies = faint.filter((drawn) => drawn.tag === 'polygon')
    expect(dummies, 'FR-043 (MUST): 未着手 owes 掴みシロ を 2 つ').toHaveLength(2)
    for (const one of dummies) {
      const span = spanOf(one)
      // S-180: 「実績のダミーを描く幅…12px」。⛔ 「**`S-93` とは別の値である**
      // —— あちらは読む人の当たり判定であって、環境が大きく取ってよい」.
      expect(span.to - span.from, 'the ダミー is drawn at the width `S-180` states').toBeCloseTo(
        S_180,
        6,
      )
    }

    // 表 T-021 の `PM-1a` (`( · )`) is the 未着手 marker, and FR-013 draws it
    // 薄く beside the 掴みシロ. ⚠️ HOW MANY FIGURES THE SYMBOL TAKES IS NOT
    // ASSERTED -- 表 T-021 prints `( · )` and no row of docs/spec says whether a
    // ring and a point are one element or two.
    expect(
      faint.filter((drawn) => drawn.tag !== 'polygon' && drawn.tag !== 'g').length,
      'FR-013 (MUST): the 未着手 marker is drawn 薄く too',
    ).toBeGreaterThan(0)

    // ⛔ AND THE 予定バー IS NOT AMONG THEM. FR-013 names the marker and the
    // ダミー and nothing else, so the one bar of this scene is at full 濃さ.
    const bars = paintedOf(svg).filter(
      (drawn) => drawn.tag === 'polygon' && !dummies.some((one) => one.at === drawn.at),
    )
    expect(bars, 'the 予定バー is drawn at full 濃さ').toHaveLength(1)
  })

  it('does not thin a Task that is under way', () => {
    // FR-013 names 未着手 and no other state; 表 T-021 の `PM-1` is 進行中.
    const running = oneRow([
      spanning(1, '2026-01-05', 5, { name: 'running', actualStart: '2026-01-05', actualDuration: 2 }),
    ])
    expect(faintnessOf(drawn(running))).toEqual([])
  })

  it('does not thin the late mark, which wins over 未着手 -- but still thins the 掴みシロ', () => {
    // FR-013: 「⚠️ **遅れの `(!)` は薄くしない** —— `PM-4` が勝つ状態であり、
    // `UC-006` が最も見つけたい対象だからである」, and 「⚠️ **未着手のタスクでも
    // `PM-4` は進捗マーカーの場所に出る**（表 T-023d の `GR-7`）—— **未着手で
    // あることは実績バーの有無が担う**（`FR-043`）」.
    //
    // ⛔ THIS CASE USED TO ASK FOR NO 濃さ AT ALL, AND THAT READING TAKES THE
    // 掴みシロ AWAY WITH THE MARKER. FR-043 (MUST) shows them 「`Task` が未着手
    // であるあいだ」 -- being late is not being started, and the requirement
    // exempts nothing for it -- so the two 掴みシロ are still owed and FR-013
    // still draws them 薄く. What the 遅れ takes away is the marker's own
    // faintness, not the picture's.
    const late = oneRow([spanning(1, '2026-01-05', 5, { name: 'late' })], {
      project: { calendarUid: null, statusDate: '2026-02-01', themeHue: 214, title: null },
    })
    const svg = drawn(late)
    expect(new Set(faintnessOf(svg)), 'the only 濃さ stated is `S-131`').toEqual(new Set([S_131]))
    expect(
      faintFiguresOf(svg).filter((drawn) => drawn.tag === 'polygon'),
      'FR-043 (MUST): a late Task that has not started still shows its two 掴みシロ',
    ).toHaveLength(2)

    // 表 T-021 の `PM-4` is `(!)`, drawn where `GR-7` puts the marker. ⛔ None of
    // its figures is 薄く -- and no `line` of the picture is, which is the same
    // claim made against every figure that is not a bar or a 掴みシロ.
    expect(
      faintFiguresOf(svg).filter((drawn) => drawn.tag !== 'polygon' && drawn.tag !== 'g'),
      'FR-013: 遅れの `(!)` は薄くしない',
    ).toEqual([])
  })
})

describe('UF-32 -- FR-075 / S-111: 掴み点は選択しているタスクにだけ', () => {
  /** S-109 -- 「掴み点の半辺。正方形 9 × 9px を点の中心に置く」. */
  const S_109 = SETTINGS_DEFAULTS['fadeHandleHalfPx'] as number

  /** The squares S-109 gives the two grab points, told apart by their side. */
  const grabPointsOf = (svg: string): readonly Element[] =>
    paintedOf(svg).filter(
      (one) =>
        one.tag === 'rect' &&
        Number(attribute(one.text, 'width')) === S_109 * 2 &&
        Number(attribute(one.text, 'height')) === S_109 * 2,
    )

  it('draws the two points on the selected Task and on no other', () => {
    // FR-075 (MUST): 「掴み点は選択しているタスクにだけ出すこと（MUST）—— 常時
    // 出すと、フェードを使っていないタスクにも点が並ぶ」。S-111 of 表 T-210
    // records the condition; 表 T-023d gives them the two corners of the plan.
    // ⚠️ Neither Task of the scene holds a fade day. That is deliberate:
    // PD-191 ruled the points are how a fade is CREATED, so gating them on a
    // fade already being there leaves nothing to drag.
    expect(grabPointsOf(drawn(scene())), 'nothing selected, no point').toHaveLength(0)
    const picked = drawn(scene(), SETTINGS, selectionWith(emptySelection(), { kind: 'task', uid: 2 }))
    expect(grabPointsOf(picked), 'GR-1 and GR-2, for the one Task').toHaveLength(2)
  })

  it('gives each point the stroke S-110 states', () => {
    const picked = drawn(scene(), SETTINGS, selectionWith(emptySelection(), { kind: 'task', uid: 2 }))
    for (const point of grabPointsOf(picked)) {
      expect(Number(attribute(point.text, 'stroke-width'))).toBeCloseTo(
        SETTINGS_DEFAULTS['fadeHandleStrokePx'] as number,
        6,
      )
    }
  })
})

describe('UF-32 -- 表 T-236 の S-168 / S-169: ラベルの文字色と縁取り', () => {
  /**
   * 表 T-236's two label rows, copied from the manuscript.
   *
   * ⚠️ S-169 states its value as 「`S-146` に同じ」, so the ground's own cells
   * are what stand here. `H` is the letter the manuscript writes for
   * `themeHue`, which is why the scene's hue goes in before the comparison.
   */
  const T_236_LABEL = {
    'S-168': { light: '#000000', dark: '#ffffff' },
    'S-169': { light: '#ffffff', dark: 'hsl(H 12% 9%)' },
  } as const

  /** The `<text>` the name label is drawn as, found by the name it carries. */
  const nameLabelOf = (svg: string, name: string): string => {
    for (const hit of svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) {
      if (hit[1] === name) return hit[0] as string
    }
    throw new Error(`no name label carrying ${name}`)
  }

  const sameColour = (drawnColour: string | null, stated: string, why: string): void => {
    const one = rgbOf(drawnColour as string)
    const other = rgbOf(stated)
    expect(one.r, why).toBeCloseTo(other.r, 4)
    expect(one.g, why).toBeCloseTo(other.g, 4)
    expect(one.b, why).toBeCloseTo(other.b, 4)
  }

  const HUE = 214

  it('takes the ink from S-168 and the halo from S-169, in both themes', () => {
    // FR-041 (MUST): 「画面の色は `_assets/tbl-settings.md` の 表 T-236 に従う
    // こと（MUST）」, and the table gives the 文字色 on a bar to S-168 and its
    // 縁取りの色 to S-169. ⚠️ Both columns are read, because a picture that
    // typed in the LIGHT pair drew black text on the dark ground.
    for (const preference of ['light', 'dark'] as const) {
      const settings = settingsOf({ ...SETTINGS, themePreference: preference })
      const label = nameLabelOf(drawn(scene(), settings), 'alpha')
      sameColour(
        attribute(label, 'fill'),
        T_236_LABEL['S-168'][preference],
        `S-168 in the ${preference} theme`,
      )
      sameColour(
        attribute(label, 'stroke'),
        T_236_LABEL['S-169'][preference].replace(/\bH\b/, String(HUE)),
        `S-169 in the ${preference} theme`,
      )
    }
  })

  it('gives the halo S-34 of the font, and paints it BEHIND the glyph', () => {
    // S-169: 「太さは 表 T-201 の `S-34`」 -- `labelHaloOfFont`, a ratio of the
    // font. ⛔ And the halo has to sit UNDER the ink: 「縁取りはバーの色から
    // 文字を切り離すためのもの」, which an outline painted OVER the glyph does
    // not do -- SVG's own default paints the stroke last, so the picture has to
    // say otherwise.
    const label = nameLabelOf(drawn(scene()), 'alpha')
    const fontSize = Number(attribute(label, 'font-size'))
    expect(fontSize).toBeGreaterThan(0)
    expect(Number(attribute(label, 'stroke-width'))).toBeCloseTo(
      fontSize * (SETTINGS_DEFAULTS['labelHaloOfFont'] as number),
      1,
    )
    expect(attribute(label, 'paint-order')).toBe('stroke')
  })
})

describe('UF-32 -- 表 T-075: the unit is `pure`', () => {
  it('answers the same string for the same values', () => {
    expect(drawn(scene())).toBe(drawn(scene()))
  })

  it('draws an empty schedule without inventing anything', () => {
    // FR-025 says the same thing of the export: 「行を足して埋めてはならない
    // （MUST NOT）」-- 画面に無いものが出る。
    // ⛔ A SCHEDULE WITH NO `TaskGroup` IS THE ONE THAT INVENTS NO ROW. This
    // case used `oneRow([])`, which declares one row and no `Task`, and read
    // its emptiness as the whole picture's. That row is not invented: it is in
    // the values handed in, and drawing it is required -- `S-166` of 表 T-236
    // gives 最上位の行の地の色 and FR-042 RATIONALE makes the group grid line a
    // MUST（「`TaskGroup` の境界にはグループ罫線を描くこと」）。
    // ⚠ 「INVENTS NOTHING」 IS NOT 「PAINTS NOTHING」. FR-017 makes the
    // タイムルーラー a picture of the TIME AXIS -- 「目盛の粒度を 1 日あたりの表示幅
    // から決まる 4 段階へ切り替えること」 says nothing about how many rows the
    // schedule holds -- and 表 T-076 の EP-2 carries `Time Ruler`（`U-19`）into
    // the picture with 「描く」 and the reason 「日付が読めないと日程表として
    // 成り立たない」. What must be absent is everything a ROW carries.
    // ⚠ THE `Time Ruler`'s OWN GROUND IS NOT A 行の帯, so it is taken out
    // before the count. FR-041 (MUST) is 「地の色を自分で塗ること」 and 表 T-236
    // の `S-146` is that colour; a `rect` lying exactly over `regions.timeRuler`
    // belongs to `U-19`. Its own cases live in `uf-32-ruler-band.test.ts`.
    const band = regionsFromScreen(ENV, SETTINGS).timeRuler
    const onTheBand = (e: Element, name: string, is: number): boolean => {
      const value = attribute(e.text, name)
      return value !== null && Math.abs(Number(value) - is) < 0.02
    }
    const painted = paintedOf(drawn(scheduleOf({})))
    const rowBands = painted.filter(
      (drawn) => drawn.tag === 'rect' && !(onTheBand(drawn, 'y', band.y) && onTheBand(drawn, 'height', band.height)),
    )
    expect(rowBands, 'no 行の帯').toHaveLength(0)
    expect(painted.filter((drawn) => drawn.tag === 'polygon'), 'no バー').toHaveLength(0)
    expect(painted.filter((drawn) => drawn.tag === 'polyline'), 'no 依存線').toHaveLength(0)
    expect(painted.length, '表 T-076 EP-2: the Time Ruler is drawn all the same').toBeGreaterThan(0)
  })

  it('draws no Task element for a row that carries no Task', () => {
    // The other half of 「行を足して埋めてはならない」: the row is drawn because
    // it was handed in, but nothing is put ON it. 表 T-076 の EP-5 names what a
    // row would carry -- 予定バー・実績バー・進捗マーカー・名称ラベル -- and a
    // row with no `Task` has none of them to carry.
    // ⚠ READ AS A DIFFERENCE against a schedule holding no row at all, so the
    // タイムルーラー -- drawn either way (FR-017, 表 T-076 の EP-2) and
    // carrying date text of its own -- is not mistaken for a 名称ラベル.
    const bare = paintedOf(drawn(scheduleOf({})))
    const painted = paintedOf(drawn(oneRow([]))).filter(
      (drawn) => !bare.some((oneBar) => oneBar.text === drawn.text),
    )
    expect(painted.length, 'the row itself is drawn').toBeGreaterThan(0)
    expect(painted.filter((drawn) => drawn.tag === 'polygon'), 'no バー').toHaveLength(0)
    expect(painted.filter((drawn) => drawn.tag === 'text'), 'no 名称ラベル').toHaveLength(0)
    expect(painted.filter((drawn) => drawn.tag === 'polyline'), 'no 依存線').toHaveLength(0)
  })
})
