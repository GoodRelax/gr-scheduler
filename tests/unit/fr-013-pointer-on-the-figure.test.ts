// FR-013's second half: the faint dummy and the faint not-started marker are
// drawn 濃く while the pointer is on them.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification section 1).
//
// ⭐ WHY THIS FILE EXISTS. tests/unit/uf-32.test.ts asserts that the two
// 掴みシロ and the 未着手 marker are drawn at S-131; this file asserts the other
// half of the same MUST -- that the one under the pointer stops being faint.
//
// THE LINES THIS FILE RESTS ON
//
//   FR-013 (docs/spec/01-04-requirements.md, MUST)
//     「**未着手のマーカーと、実績入力のダミー（`FR-043`）は薄く描き、ポインタが
//      乗っているあいだだけ濃くすること（MUST）** —— 作法は表 T-051 の `HF-6` と
//      同じである。濃さの値は `S-131`。」
//
//   T-051 HF-6 (MUST)
//     「**操作子は、その行の名前にポインタが乗っているあいだだけ描くこと
//      (MUST)**」
//
//   ⭐ WHAT THOSE TWO TOGETHER SETTLE, and the whole point of this file:
//   HF-6's condition is a PLACE -- the pointer being on the figure -- and it
//   carries no notion of priority. FR-013 says its 作法 is 「表 T-051 の `HF-6`
//   と同じ」, so the condition FR-013 inherits is the same geometric one.
//   ⛔ Table T-023's MK-9a is 「掴む対象が重なったとき」の優先順位 -- a rule about
//   what a PRESS lands on -- and no row of docs/spec hands that answer to the
//   drawing. So the cases below hand the renderer a pointer and NO won grab row
//   at all, and still require the figure under the pointer to leave S-131.
//
//   ⭐⭐ WHERE THE POINTER IS PUT, AND WHY IT IS NOT READ OFF THE INK
//   (利用者の裁定 2026-09-02, carried into FR-043)
//
//     FR-043 (MUST) 「ダミーを描く幅は、1 日ぶんと … `S-180` の小さい方とする
//     こと。日の列の左端に揃えること」, ⛔ (MUST NOT)「当たり判定は本段の対象では
//     ない」. So the DRAWING now moves with the magnification while the HIT area
//     does not, and a pointer taken from the ink would be measuring the drawing
//     against itself.
//
//     ⭐ So every pointer below is computed from the specification instead:
//       T-206 S-93   the dummies' 当たり判定, 「30 × 20px」, which is what
//                    「乗っている」 has to be judged inside;
//       T-023d GR-3  「予定の開始点 | 予定バーの左端」 -- the pixel where the plan
//                    start day's column begins;
//       FR-043 / T-023d GR-9   GR-9 stands one working day right of it, and
//       T-023d GR-17           GR-17 `S-129` working days right of GR-9;
//       FR-017 (MUST) 「1 日あたりの表示幅は … `S-1` に `zoomX` を掛けた値」.
//     The point put under the pointer is inside GR-9's own day column AND
//     within half of S-93 of that column's left edge, so it is covered by the
//     hit box wherever on the day the environment centres those 30px -- and it
//     is inside the ink under FR-043's new width as well. ⭐ A case below
//     asserts that containment rather than assuming it.
//
//   T-206 S-90 -- 「予定の端点の掴み代 | バーの上下と、端点の左右に 6px」, which at
//   a low magnification covers both dummies; the second describe below is built
//   on that overlap.
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * HOW DARK 濃く IS. FR-013 fixes the FAINT value (S-131) and no row anywhere
//     fixes the other one, so every case below asks only that the figure under
//     the pointer has LEFT S-131 -- never what it arrived at.
//   * WHERE S-93's 30 × 20px IS CENTRED. T-206 gives the hit box a SIZE and
//     T-023d gives GR-9 a DAY; no row says which pixel of the day the box is
//     centred on. ⭐ So no case below asserts the edge of a hit box: they assert
//     only that the point they use is one every reading covers.
//   * ⛔⛔ THE 未着手 MARKER'S HALF OF THE SAME MUST. FR-013 names 「未着手の
//     マーカーと、実績入力のダミー」 together, but MEASURED, a pointer put on the
//     marker's own ring (表 T-021's PM-1a) leaves it at S-131 when no won grab
//     row is handed over -- only the dummy answers to the pointer alone. A case
//     asserting the marker's half is therefore NOT written here: it would be
//     red, and PD-360 -- 「`FR-013` の「ポインタが乗っている」が、描いた図形の上の
//     ことか、表 T-023d が点を与えた行のことか」 -- is 未裁定. ⭐ REPORTED, not
//     guessed at in either direction.
//   * WHETHER THE OTHER 掴みシロ OF THE SAME `Task` STAYS FAINT. Measured, it
//     rises with the one pointed at: the two are drawn inside one faint group.
//     No row of docs/spec divides a `Task`'s two 掴みシロ for this purpose.

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// The rows, read out of the manuscript at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

const S_93 = rowOf('T-206', 'S-93')
const S_180 = rowOf('T-206', 'S-180')
const S_90 = rowOf('T-206', 'S-90')

/** The first number of a cell, which is the one the row leads with. */
const leadingNumberOf = (cell: string | undefined, row: string): number => {
  const [first] = numbersOf(cell ?? '')
  if (first === undefined || first <= 0) throw new Error(`row ${row} states no size: ${cell}`)
  return first
}

/** `S-93` -- 「実績のダミーの当たり判定 … 30 × 20px」. The width is the first. */
const DUMMY_HIT_WIDTH = leadingNumberOf(S_93['既定'], 'S-93')
/** `S-180` -- ⛔ FR-043's UPPER BOUND on the drawn width, never the width itself. */
const DUMMY_WIDTH_UPPER_BOUND = leadingNumberOf(S_180['既定'], 'S-180')
/** `S-90` -- 「予定の端点の掴み代 | バーの上下と、端点の左右に 6px」. */
const PLAN_ENDPOINT_SLOP = leadingNumberOf(S_90['既定'], 'S-90')

const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

/** S-131 -- 「濃さの値」 FR-013 names, printed from the manuscript by `npm run gen`. */
const S_131 = FLAT['dummyOpacity'] as number
/** S-1 -- 1 日あたりの表示幅 at `zoomX` = 1 (FR-017). */
const PX_PER_DAY_AT_1X = FLAT['pxPerDayAt1x'] as number
/** S-129 -- how many worked days GR-17 stands right of GR-9 (T-023d). */
const ACTUAL_INITIAL_DURATION = FLAT['actualInitialDuration'] as number

/** FR-017 (MUST): 「1 日あたりの表示幅は … `S-1` に `zoomX` を掛けた値」. */
const dayWidthAt = (zoomX: number): number => PX_PER_DAY_AT_1X * zoomX

/** FR-043 (MUST): 「ダミーを描く幅は、1 日ぶんと … `S-180` の小さい方」. */
const drawnWidthAt = (zoomX: number): number =>
  Math.min(dayWidthAt(zoomX), DUMMY_WIDTH_UPPER_BOUND)

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const settingsAt = (zoomX: number): DocumentSettings =>
  settingsOf({
    rulerHeight: 48, // S-2
    rulerFont: 12, // S-3
    scrollDate: '2026-01-01', // S-77
    stackDirection: 'down', // S-58
    zoomX, // S-75
    shapeHeightOf: {
      rectangle: FLAT['shapeHeightOf.rectangle'],
      chevron: FLAT['shapeHeightOf.chevron'],
      arrow: FLAT['shapeHeightOf.arrow'],
      endpointSpan: FLAT['shapeHeightOf.endpointSpan'],
      milestone: FLAT['shapeHeightOf.milestone'],
    },
  })

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

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
    highlightBoxes: [],
    commentBoxes: [],
    ...part,
  }) as unknown as Schedule

/**
 * One row holding one `Task` that has not been started.
 *
 * ⚠️ NOT STARTED IS THE WHOLE CONDITION. FR-043 (MUST) shows the two 掴みシロ
 * 「`Task` が未着手であるあいだ」, and table T-021's PM-1a is the 未着手 marker --
 * so a task with an actual bar would leave this file with nothing faint to
 * point at.
 *
 * ⭐ 2026-02-02 IS A MONDAY, so GR-9 (「予定の開始日の翌稼働日」) and GR-17 (a
 * further `S-129` worked days on) fall on the Tuesday and the Wednesday: the
 * default calendar's weekend (表 T-209) never comes between them, and one
 * worked day is one column of the axis.
 */
const IDLE = scheduleOf({
  tasks: [taskOf({ uid: 1, start: '2026-02-02', finish: '2026-02-22', name: 'idle' })],
  taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
})

/** One point, or none -- what the shell knows about the pointer this frame. */
type Point = { readonly x: number; readonly y: number } | null

/**
 * The picture, drawn for the screen.
 *
 * ⛔ `hovered` IS LEFT OUT OF EVERY CALL ON PURPOSE. That argument is where a
 * won grab row would arrive, and the claim under test is that the drawing does
 * not need one: HF-6's condition, which FR-013 adopts, is that the pointer is
 * ON the figure.
 */
const drawn = (settings: DocumentSettings, pointer: Point): string => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(IDLE, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(IDLE, settings, layout, regions, selection)
  return svgFromSchedule(
    IDLE,
    settings,
    layout,
    geometry,
    regions,
    selection,
    'screen',
    null,
    undefined,
    pointer,
  )
}

/**
 * Where the plan bar's left edge is -- T-023d GR-3, 「予定の開始点 | 予定バーの
 * 左端」, which is where the plan start day's column begins.
 *
 * ⭐ Taken from the layout rather than from the ink: a stroke straddles an edge,
 * and this file counts DAYS from that pixel.
 */
const planStartOf = (settings: DocumentSettings): number => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(IDLE, settings, regions)
  const placed = layout.placements[0]
  if (placed === undefined) throw new Error('FR-018 dropped the task: there is nothing to point at')
  return placed.x
}

interface Probe {
  readonly grab: string
  /** Where the day column of that dummy begins (FR-043's 「日の列の左端」). */
  readonly dayLeft: number
  /** The point handed to the renderer as the pointer's x. */
  readonly x: number
}

/**
 * The two places FR-043 and table T-023d put a not-started `Task`'s dummies,
 * and the point inside each that this file points at.
 *
 * ⛔ NOT READ OFF THE PICTURE. Every number here comes from the specification:
 * the plan bar's left edge (GR-3), one day (FR-017's `S-1` × `zoomX`), `S-129`
 * (T-023d GR-17), and FR-043's drawn width.
 */
const probesAt = (zoomX: number): readonly Probe[] => {
  const left = planStartOf(settingsAt(zoomX))
  const dayWidth = dayWidthAt(zoomX)
  const inside = drawnWidthAt(zoomX) / 2
  const gr9 = left + dayWidth
  const gr17 = gr9 + ACTUAL_INITIAL_DURATION * dayWidth
  return [
    { grab: 'GR-9', dayLeft: gr9, x: gr9 + inside },
    { grab: 'GR-17', dayLeft: gr17, x: gr17 + inside },
  ]
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

/**
 * The elements the picture draws AT S-131 -- one that states that 濃さ itself,
 * or one standing inside something that states it.
 *
 * ⚠️ The leading `\s` keeps `fill-opacity` and `stroke-opacity` out, which are
 * a different thing from the element's own 濃さ.
 * ⛔ THE VALUE IS COMPARED, NOT MERELY THE PRESENCE OF THE ATTRIBUTE. FR-013
 * names S-131 as the FAINT 濃さ and fixes no other, so a picture that darkens a
 * figure by restating its 濃さ would otherwise still read as faint -- and every
 * case below would be green whatever the unit did.
 */
const faintlyDrawn = (svg: string): ReadonlySet<number> => {
  const out = new Set<number>()
  const ancestors: boolean[] = []
  const scan = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*)>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    const body = hit[3] as string
    const stated = /\sopacity="([^"]*)"/.exec(hit[0])
    const statesOne = stated !== null && Number(stated[1]) === S_131
    if (hit[1] === '/') ancestors.pop()
    else {
      if (statesOne || ancestors.includes(true)) out.add(hit.index)
      if (!body.trimEnd().endsWith('/')) ancestors.push(statesOne)
    }
    hit = scan.exec(svg)
  }
  return out
}

/** Every 濃さ the picture states anywhere. */
const faintnessOf = (svg: string): readonly number[] =>
  [...svg.matchAll(/\sopacity="([^"]*)"/g)].map((hit) => Number(hit[1]))

interface Ink {
  readonly points: string
  readonly x0: number
  readonly x1: number
  readonly y: number
}

const inkOfPoints = (points: string): Ink => {
  const pairs = points.trim().split(/\s+/).map((one) => one.split(','))
  const xs = pairs.map((pair) => Number(pair[0]))
  const ys = pairs.map((pair) => Number(pair[1]))
  return {
    points,
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/** The 掴みシロ of the scene: the polygons the resting picture draws 薄く. */
const dummiesOf = (svg: string): readonly Ink[] => {
  const faint = faintlyDrawn(svg)
  return elementsOf(svg)
    .filter((one) => one.tag === 'polygon' && faint.has(one.at))
    .map((one) => inkOfPoints(attribute(one.text, 'points') as string))
    .sort((one, other) => one.x0 - other.x0)
}

/** The one faintly drawn polygon the point falls in, named by the row it serves. */
const dummyUnder = (svg: string, probe: Probe): Ink => {
  const found = dummiesOf(svg).filter((one) => one.x0 <= probe.x && probe.x <= one.x1)
  expect(found.length, `exactly one 掴みシロ is drawn under ${probe.grab}'s point`).toBe(1)
  return found[0] as Ink
}

/**
 * The figures the picture draws at S-131 that are NOT 掴みシロ -- which, in this
 * scene, is 表 T-021's PM-1a, the 未着手 marker FR-013 names beside the dummy.
 *
 * ⚠️ HOW MANY FIGURES THE SYMBOL TAKES IS NOT CLAIMED: 表 T-021 prints `( · )`
 * and no row of docs/spec says whether a ring and a point are one element or
 * two, so the answer is compared with itself rather than counted.
 */
const markerFiguresOf = (svg: string): readonly string[] => {
  const faint = faintlyDrawn(svg)
  return elementsOf(svg)
    .filter((one) => faint.has(one.at) && one.tag !== 'polygon' && one.tag !== 'g')
    .map((one) => one.text)
}

/** Whether the picture still draws THAT polygon -- matched by its own points -- 薄く. */
const isStillFaint = (svg: string, ink: Ink): boolean => {
  const faint = faintlyDrawn(svg)
  const found = elementsOf(svg).filter(
    (one) => one.tag === 'polygon' && attribute(one.text, 'points') === ink.points,
  )
  expect(found.length, 'the same polygon is still drawn, and drawn once').toBe(1)
  return faint.has((found[0] as Element).at)
}

// ---------------------------------------------------------------------------

describe('FR-013 (MUST) -- a dummy under the pointer stops being faint', () => {
  // ⭐ A MAGNIFICATION AT WHICH `S-180` IS THE SMALLER OF FR-043'S TWO NUMBERS
  // (`S-1` × 2.5 = 15px a day, against S-180's 12). The second describe runs at
  // one where the DAY is the smaller, so between them the file exercises both
  // sides of 「1 日ぶんと `S-180` の小さい方」 -- and the point put under the
  // pointer is a different distance from the day's left edge in each.
  const ZOOM = 2.5
  const SETTINGS = settingsAt(ZOOM)

  it('S-93 is still the row that says how big the dummies are to point at', () => {
    // ⚠️ A GUARD, NOT THE CLAIM. FR-043 (MUST NOT) 「当たり判定は本段の対象では
    // ない」 sent the hit area back to table T-023d and T-206, and this file
    // takes it from there rather than from the ink it is judging.
    expect(S_93['値']).toContain('GR-9')
    expect(S_93['値']).toContain('GR-17')
    expect(S_93['値']).toContain('当たり判定')
    expect(DUMMY_HIT_WIDTH).toBeGreaterThan(0)
  })

  it('draws a scene the cases below can be read from', () => {
    // ⚠️ 04-verification section 2. FR-043 (MUST) owes 掴みシロ を 2 つ, and
    // FR-013 draws them at S-131 -- if either half were missing, every case
    // below would be asking about a picture that was not there.
    const resting = drawn(SETTINGS, null)

    expect(dummiesOf(resting)).toHaveLength(2)
    expect(new Set(faintnessOf(resting))).toEqual(new Set([S_131]))
  })

  it('⭐ every point this file uses is one S-93 covers, and is on the ink', () => {
    // ⛔ THE CASE THAT MAKES THE OTHERS MEAN SOMETHING. FR-043 aligns the ink to
    // 「日の列の左端」 and bounds its width by 「1 日ぶんと `S-180` の小さい方」,
    // while ⛔ 「当たり判定は本段の対象ではない」 leaves the 30px of S-93 where
    // they were. A point that had drifted out of the hit box would make every
    // case below a claim about something else.
    const resting = drawn(SETTINGS, null)
    for (const probe of probesAt(ZOOM)) {
      // Inside the day the row gives it (T-023d), so the hit box covers it
      // wherever on that day the environment centres its 30px.
      expect(probe.x, `${probe.grab} is right of its day`).toBeGreaterThanOrEqual(probe.dayLeft)
      expect(probe.x, `${probe.grab} is inside its day`).toBeLessThanOrEqual(
        probe.dayLeft + dayWidthAt(ZOOM),
      )
      expect(
        Math.abs(probe.x - probe.dayLeft),
        `${probe.grab} is within S-93 of its day`,
      ).toBeLessThanOrEqual(DUMMY_HIT_WIDTH / 2)
      // And on the ink FR-043 now draws, which begins at that same pixel.
      const ink = dummyUnder(resting, probe)
      expect(ink.x0, `${probe.grab}'s ink begins at its day column's left edge`).toBeCloseTo(
        probe.dayLeft,
        2,
      )
      expect(ink.x1 - ink.x0, `${probe.grab}'s ink is min(1 day, S-180) wide`).toBeCloseTo(
        drawnWidthAt(ZOOM),
        2,
      )
      // ⭐ AND THIS IS THE `S-180` SIDE OF 「小さい方」 -- the day is wider here.
      expect(drawnWidthAt(ZOOM)).toBeCloseTo(DUMMY_WIDTH_UPPER_BOUND, 6)
    }
  })

  it('⭐ leaves S-131 for the dummy the pointer is on (MUST)', () => {
    const resting = drawn(SETTINGS, null)
    const probe = probesAt(ZOOM)[0] as Probe
    const ink = dummyUnder(resting, probe)

    expect(isStillFaint(resting, ink), 'faint while nothing points at it').toBe(true)
    expect(
      isStillFaint(drawn(SETTINGS, { x: probe.x, y: ink.y }), ink),
      'FR-013 (MUST): ポインタが乗っているあいだだけ濃くする',
    ).toBe(false)
  })

  it('⛔ does not darken the whole picture: the 未着手 marker keeps S-131', () => {
    // FR-013 names TWO things -- 「未着手のマーカーと、実績入力のダミー」 -- and
    // gives each the same condition. So a pointer on a 掴みシロ may not carry the
    // marker with it: the marker is elsewhere, and 「乗っている」 is a place.
    //
    // ⚠️ WHAT IS *NOT* CLAIMED HERE, because no row settles it: whether the
    // OTHER 掴みシロ of the same `Task` stays faint. Measured, it does not --
    // the two are drawn inside one faint group and rise together.
    const resting = drawn(SETTINGS, null)
    const probe = probesAt(ZOOM)[0] as Probe
    const ink = dummyUnder(resting, probe)

    const restingMarker = markerFiguresOf(resting)
    expect(restingMarker.length, '表 T-021 PM-1a is drawn 薄く while nothing points').toBeGreaterThan(
      0,
    )

    const pointed = drawn(SETTINGS, { x: probe.x, y: ink.y })

    expect(markerFiguresOf(pointed), 'the marker is still drawn at S-131').toEqual(restingMarker)
  })

  it('⛔ a pointer somewhere else on the screen changes nothing', () => {
    const resting = drawn(SETTINGS, null)
    const probe = probesAt(ZOOM)[0] as Probe
    const ink = dummyUnder(resting, probe)

    // A point well clear of the task, still inside the drawing.
    const away = drawn(SETTINGS, { x: probe.x, y: ink.y + 200 })

    expect(isStillFaint(away, ink)).toBe(true)
    expect(new Set(faintnessOf(away))).toEqual(new Set([S_131]))
  })

  it('⭐ each of the two answers to its own place, one case walking both', () => {
    const resting = drawn(SETTINGS, null)

    for (const probe of probesAt(ZOOM)) {
      const ink = dummyUnder(resting, probe)
      expect(
        isStillFaint(drawn(SETTINGS, { x: probe.x, y: ink.y }), ink),
        `${probe.grab} at ${probe.x},${ink.y}`,
      ).toBe(false)
    }
  })
})

describe('FR-013 (MUST) -- the place decides, not the grab priority', () => {
  // ⭐ THE ZOOM THAT USED TO BREAK IT. S-90 gives the plan endpoints a 6px grab
  // slop, so once one day is narrow enough the two dummies of a task stand
  // INSIDE the slop of GR-3 / GR-4. A drawing that asked which grab row had won
  // would find the plan endpoint there and leave the dummy faint -- at exactly
  // the magnifications a whole document is read at. ⚠️ FR-018's S-86 still has
  // to admit the task, so the zoom is chosen to keep the shape wide enough to
  // be drawn at all.
  const ZOOM = 0.25
  const LOW = settingsAt(ZOOM)

  it('draws the task at this zoom, or the case below would be asking about nothing', () => {
    const resting = drawn(LOW, null)
    expect(dummiesOf(resting)).toHaveLength(2)
  })

  it('⭐ still leaves S-131 for the dummy under the pointer, with no won grab row handed over', () => {
    const resting = drawn(LOW, null)

    for (const probe of probesAt(ZOOM)) {
      const ink = dummyUnder(resting, probe)
      expect(
        isStillFaint(drawn(LOW, { x: probe.x, y: ink.y }), ink),
        `${probe.grab} at ${probe.x},${ink.y} at a low zoom`,
      ).toBe(false)
    }
  })

  it('⛔ and the dummies really do stand inside the plan endpoints\' slop at this zoom', () => {
    // ⚠️ Without this the case above would be green at any zoom at all, and the
    // condition it means to reproduce would never have been built. ⭐ S-90 is
    // read from the manuscript, not typed: 「端点の左右に 6px」.
    const left = planStartOf(LOW)
    const right = left + ((): number => {
      const placed = layoutFromSchedule(IDLE, LOW, regionsFromScreen(ENV, LOW)).placements[0]
      if (placed === undefined) throw new Error('the task is not drawn')
      return placed.width
    })()
    for (const probe of probesAt(ZOOM)) {
      const toStart = Math.abs(probe.dayLeft - left)
      const toFinish = Math.abs(probe.dayLeft - right)
      expect(
        Math.min(toStart, toFinish),
        `${probe.grab} stands within S-90 of a plan endpoint`,
      ).toBeLessThanOrEqual(PLAN_ENDPOINT_SLOP)
    }
  })

  it('⭐ and one day really is the smaller of FR-043 s two numbers here', () => {
    // ⛔ THE OTHER SIDE OF THE WIDTH RULE. At this magnification a day is
    // narrower than `S-180`, so the ink is a day wide; the describe above runs
    // at a magnification where it is not. A file that only ever ran one of the
    // two would prove half of 「小さい方」.
    expect(dayWidthAt(ZOOM)).toBeLessThan(DUMMY_WIDTH_UPPER_BOUND)
    const resting = drawn(LOW, null)
    for (const probe of probesAt(ZOOM)) {
      const ink = dummyUnder(resting, probe)
      expect(ink.x1 - ink.x0, `${probe.grab}'s ink`).toBeCloseTo(dayWidthAt(ZOOM), 2)
      expect(ink.x0, `${probe.grab}'s ink begins at its day column's left edge`).toBeCloseTo(
        probe.dayLeft,
        2,
      )
    }
  })
})
