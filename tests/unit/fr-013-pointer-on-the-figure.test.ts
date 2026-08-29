// FR-013's second half: the faint dummy and the faint not-started marker are
// drawn 濃く while the pointer is on them.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification section 1). The
// SVG readers (`elementsOf`, `attribute`, `faintlyDrawn`) and the fixture are
// COPIED FROM tests/unit/uf-32.test.ts, which drives the same renderer.
//
// ⭐ WHY THIS FILE EXISTS. tests/unit/uf-32.test.ts asserts that the two
// 掴みシロ and the 未着手 marker are drawn at S-131, and
// tests/unit/fr-043-dummy-drawn.test.ts records the other half as a gap in as
// many words: 「FR-013's hover half -- 「ポインタが乗っているあいだだけ濃くする
// こと（MUST）」. PI-19 … publishes `svgFromSchedule` over six arguments and none
// of them is a pointer, so there is nothing to hover」. ⛔ THAT IS NOW OUT OF
// DATE: the renderer takes a `pointer`. So the MUST can be measured, and this
// file measures it.
//
// THE LINES THIS FILE RESTS ON
//
//   FR-013 (docs/spec/01-04-requirements.md:2073, MUST)
//     「**未着手のマーカーと、実績入力のダミー（`FR-043`）は薄く描き、ポインタが
//      乗っているあいだだけ濃くすること（MUST）** —— 作法は表 T-051 の `HF-6` と
//      同じである。濃さの値は `S-131`。」
//
//   T-051 HF-6 (docs/spec/01-04-requirements.md:1321, MUST)
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
//   T-023d GR-9 / GR-17 (docs/spec/01-04-requirements.md) -- where the two
//   dummies of a not-started `Task` stand; T-206 S-180 -- 12px, the width they
//   are drawn at; T-206 S-90 -- 6px, the plan endpoints' grab slop, which at a
//   low zoom covers both of them.
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * HOW DARK 濃く IS. FR-013 fixes the FAINT value (S-131) and no row anywhere
//     fixes the other one, so every case below asks only that the figure under
//     the pointer has LEFT S-131 -- never what it arrived at.
//   * THE MARGIN AROUND A FIGURE. 「乗っている」 is a place and no row widens it,
//     so every pointer below is put at the CENTRE of the figure it means.
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
// The fixture
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

/** S-131 -- 「濃さの値」 FR-013 names, printed from the manuscript by `npm run gen`. */
const S_131 = FLAT['dummyOpacity'] as number

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

interface Box {
  readonly points: string
  readonly x: number
  readonly y: number
}

/** The centre of a polygon, from the `points` it was drawn with. */
const centreOf = (points: string): Box => {
  const pairs = points.trim().split(/\s+/).map((one) => one.split(','))
  const xs = pairs.map((pair) => Number(pair[0]))
  const ys = pairs.map((pair) => Number(pair[1]))
  return {
    points,
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/** The two 掴みシロ of the scene: the polygons the resting picture draws 薄く. */
const dummiesOf = (svg: string): readonly Box[] => {
  const faint = faintlyDrawn(svg)
  return elementsOf(svg)
    .filter((one) => one.tag === 'polygon' && faint.has(one.at))
    .map((one) => centreOf(attribute(one.text, 'points') as string))
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
const isStillFaint = (svg: string, box: Box): boolean => {
  const faint = faintlyDrawn(svg)
  const found = elementsOf(svg).filter(
    (one) => one.tag === 'polygon' && attribute(one.text, 'points') === box.points,
  )
  expect(found.length, 'the same polygon is still drawn, and drawn once').toBe(1)
  return faint.has((found[0] as Element).at)
}

// ---------------------------------------------------------------------------

describe('FR-013 (MUST) -- a dummy under the pointer stops being faint', () => {
  const SETTINGS = settingsAt(1)

  it('draws a scene the cases below can be read from', () => {
    // ⚠️ 04-verification section 2. FR-043 (MUST) owes 掴みシロ を 2 つ, and
    // FR-013 draws them at S-131 -- if either half were missing, every case
    // below would be asking about a picture that was not there.
    const resting = drawn(SETTINGS, null)

    expect(dummiesOf(resting)).toHaveLength(2)
    expect(new Set(faintnessOf(resting))).toEqual(new Set([S_131]))
  })

  it('⭐ leaves S-131 for the dummy the pointer is on (MUST)', () => {
    const resting = drawn(SETTINGS, null)
    const dummy = dummiesOf(resting)[0] as Box

    expect(isStillFaint(resting, dummy), 'faint while nothing points at it').toBe(true)
    expect(
      isStillFaint(drawn(SETTINGS, { x: dummy.x, y: dummy.y }), dummy),
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
    // the two are drawn inside one faint group and rise together. FR-013 says
    // 「ポインタが乗っているあいだだけ」 of a pair it names as one thing, and no
    // row of docs/spec divides a `Task`'s two 掴みシロ for this purpose, so the
    // case is reported rather than asserted either way.
    const resting = drawn(SETTINGS, null)
    const dummy = dummiesOf(resting)[0] as Box

    const restingMarker = markerFiguresOf(resting)
    expect(restingMarker.length, '表 T-021 PM-1a is drawn 薄く while nothing points').toBeGreaterThan(
      0,
    )

    const pointed = drawn(SETTINGS, { x: dummy.x, y: dummy.y })

    expect(markerFiguresOf(pointed), 'the marker is still drawn at S-131').toEqual(restingMarker)
  })

  it('⛔ a pointer somewhere else on the screen changes nothing', () => {
    const resting = drawn(SETTINGS, null)
    const dummy = dummiesOf(resting)[0] as Box

    // A point well clear of the task, still inside the drawing.
    const away = drawn(SETTINGS, { x: dummy.x, y: dummy.y + 200 })

    expect(isStillFaint(away, dummy)).toBe(true)
    expect(new Set(faintnessOf(away))).toEqual(new Set([S_131]))
  })

  it('⭐ each of the two answers to its own place, one case walking both', () => {
    const resting = drawn(SETTINGS, null)
    const both = dummiesOf(resting)

    for (const dummy of both) {
      expect(
        isStillFaint(drawn(SETTINGS, { x: dummy.x, y: dummy.y }), dummy),
        `the dummy at ${dummy.x},${dummy.y}`,
      ).toBe(false)
    }
  })
})

describe('FR-013 (MUST) -- the place decides, not the grab priority', () => {
  // ⭐ THE ZOOM THAT USED TO BREAK IT. S-90 gives the plan endpoints a 6px grab
  // slop and S-180 draws a dummy 12px wide, so once one day is narrow enough the
  // two dummies of a task stand INSIDE the slop of GR-3 / GR-4. A drawing that
  // asked which grab row had won would find the plan endpoint there and leave
  // the dummy faint -- at exactly the magnifications a whole document is read
  // at. ⚠️ FR-018's S-86 still has to admit the task, so the zoom is chosen to
  // keep the shape wide enough to be drawn at all.
  const LOW = settingsAt(0.25)

  it('draws the task at this zoom, or the case below would be asking about nothing', () => {
    const resting = drawn(LOW, null)
    expect(dummiesOf(resting)).toHaveLength(2)
  })

  it('⭐ still leaves S-131 for the dummy under the pointer, with no won grab row handed over', () => {
    const resting = drawn(LOW, null)

    for (const dummy of dummiesOf(resting)) {
      expect(
        isStillFaint(drawn(LOW, { x: dummy.x, y: dummy.y }), dummy),
        `the dummy at ${dummy.x},${dummy.y} at a low zoom`,
      ).toBe(false)
    }
  })

  it('⛔ and the dummies really do stand inside the plan endpoints\' slop at this zoom', () => {
    // ⚠️ Without this the case above would be green at any zoom at all, and the
    // condition it means to reproduce would never have been built.
    const layout = layoutFromSchedule(IDLE, LOW, regionsFromScreen(ENV, LOW))
    const placed = layout.placements[0]
    expect(placed, 'the task is drawn').toBeDefined()

    const slop = 6 // S-90 -- 「予定の端点の掴み代 … 端点の左右に 6px」
    for (const dummy of dummiesOf(drawn(LOW, null))) {
      const toStart = Math.abs(dummy.x - (placed?.x as number))
      const toFinish = Math.abs(dummy.x - ((placed?.x as number) + (placed?.width as number)))
      expect(
        Math.min(toStart, toFinish),
        'the dummy stands within S-90 of a plan endpoint',
      ).toBeLessThanOrEqual(slop)
    }
  })
})
