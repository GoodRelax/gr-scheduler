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
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

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
    taskGroupMembers: tasks.map((t) => ({ groupId: 'g1', taskUid: t.uid })),
    ...rest,
  })

/**
 * ADR-001 has the shell compute the rectangles, the layout and the geometry
 * once a frame and hand them round, so a case builds them the same way rather
 * than inventing vertices the unit would then be measured against.
 */
const drawn = (
  schedule: Schedule,
  settings: DocumentSettings = SETTINGS,
  selection = emptySelection(),
  env: ScreenEnvironment = ENV,
): string => {
  const regions = regionsFromScreen(env, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions)
  return svgFromSchedule(schedule, settings, layout, geometry, regions, selection)
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
  elementsOf(svg).filter((e) => e.tag !== 'svg')

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
  const xs = points.map((p) => Number((p.split(',')[0] as string)))
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
 */
const themeBars = (svg: string): { plan: string; actual: string } => {
  const bars = paintedOf(svg).filter((e) => e.tag === 'polygon')
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
    const chosen = paintedOf(svg).find((e) => attribute(e.text, 'fill') === '#c62828')
    expect(chosen, 'the chosen 塗り色 reaches the picture').toBeDefined()
    expect(attribute((chosen as Element).text, 'stroke')).toBe('#1b5e20')
  })

  it('takes 線色 and 塗り色 one at a time, leaving the other on the theme', () => {
    // FR-007: 「個別に指定できるようにすること」。
    const svg = drawn(scene({ taskVisuals: [visualOf(2, { strokeColor: '#1b5e20' })] }))
    const chosen = paintedOf(svg).find((e) => attribute(e.text, 'stroke') === '#1b5e20')
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
      const polylines = paintedOf(svg).filter((e) => e.tag === 'polyline')
      expect(polylines.length, 'both the 依存線 and the イナズマ線 are drawn').toBe(2)
      return polylines.map((e) => attribute(e.text, 'stroke') as string)
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
      (e) => e.tag === 'rect' && attribute(e.text, 'stroke') !== null,
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
      (paintedOf(svg).find((e) => e.tag === 'polyline') as Element).text,
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
      (e) => !paintedOf(plain).some((p) => p.text === e.text),
    )
    expect(added.length, 'something is drawn for the selection').toBeGreaterThan(0)
    // 色以外の手掛かり: at least one of the added marks differs from the
    // unselected picture by something other than a colour value.
    const nonColour = added.some((e) => {
      const dash = attribute(e.text, 'stroke-dasharray')
      const width = attribute(e.text, 'stroke-width')
      return dash !== null || (width !== null && Number(width) > SETTINGS.planStroke)
    })
    expect(nonColour, '形状・線の太さ・記号のいずれかで区別されている').toBe(true)
  })

  it('takes the mark away again when nothing is selected', () => {
    const picked = drawn(scene(), SETTINGS, selectionWith(emptySelection(), { kind: 'task', uid: 2 }))
    expect(paintedOf(drawn(scene())).length).toBeLessThan(paintedOf(picked).length)
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
    const dependency = painted.findIndex((e) => e.tag === 'polyline')
    const bars = painted.filter((e) => e.tag === 'polygon')
    expect(dependency, 'the 依存線 is drawn').toBeGreaterThanOrEqual(0)
    expect(bars.length, 'both bars are drawn').toBeGreaterThanOrEqual(2)

    const order = (row: string): number => T_020.find((r) => r.row === row)?.order as number
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
    expect(paintedOf(svg).filter((e) => e.tag === 'polygon').length).toBeGreaterThanOrEqual(2)
    expect(paintedOf(svg).filter((e) => e.tag === 'polyline').length).toBeGreaterThanOrEqual(1)
    expect(paintedOf(svg).filter((e) => e.tag === 'rect').length).toBeGreaterThanOrEqual(1)
  })

  it('follows 表 T-202 for each of them: dependencyVisible off takes the line away', () => {
    // 表 T-076 の EP-5: 「個々を描くかどうかは表 T-202 の表示の切り替えに従う」
    const off = drawn(scene(), settingsOf({ ...SETTINGS, dependencyVisible: false }))
    expect(paintedOf(off).filter((e) => e.tag === 'polyline')).toHaveLength(0)
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

describe('UF-32 -- 表 T-075: the unit is `pure`', () => {
  it('answers the same string for the same values', () => {
    expect(drawn(scene())).toBe(drawn(scene()))
  })

  it('draws an empty schedule without inventing anything', () => {
    // FR-025 says the same thing of the export: 「行を足して埋めてはならない
    // （MUST NOT）」-- 画面に無いものが出る。
    // ⛔ A SCHEDULE WITH NO `TaskGroup` IS THE ONE THAT PAINTS NOTHING. This
    // case used `oneRow([])`, which declares one row and no `Task`, and read
    // its emptiness as the whole picture's. That row is not invented: it is in
    // the values handed in, and drawing it is required -- `S-166` of 表 T-236
    // gives 最上位の行の地の色 and FR-042 RATIONALE makes the group grid line a
    // MUST（「`TaskGroup` の境界にはグループ罫線を描くこと」）。
    expect(paintedOf(drawn(scheduleOf({})))).toHaveLength(0)
  })

  it('draws no Task element for a row that carries no Task', () => {
    // The other half of 「行を足して埋めてはならない」: the row is drawn because
    // it was handed in, but nothing is put ON it. 表 T-076 の EP-5 names what a
    // row would carry -- 予定バー・実績バー・進捗マーカー・名称ラベル -- and a
    // row with no `Task` has none of them to carry.
    const painted = paintedOf(drawn(oneRow([])))
    expect(painted.length, 'the row itself is drawn').toBeGreaterThan(0)
    expect(painted.filter((e) => e.tag === 'polygon'), 'no バー').toHaveLength(0)
    expect(painted.filter((e) => e.tag === 'text'), 'no 名称ラベル').toHaveLength(0)
    expect(painted.filter((e) => e.tag === 'polyline'), 'no 依存線').toHaveLength(0)
  })
})
