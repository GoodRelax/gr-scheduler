// The drawn `Actual Operation Dummy` (U-52): FR-043's MUST that it be SHOWN,
// the width table T-206's S-180 gives it, and EP-14's rule that an export
// draws none of it.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification.md section 1).
// Nothing below takes an expected value out of `src/`: the one figure that is
// a number, S-180's 12px, is read out of `_assets/tbl-settings.md` at run time
// through `tests/contract/spec-table.ts`, and every other expectation is
// stated as a RELATION between two drawings the specification puts side by
// side (the dummy against the actual bar it stands for; the export against the
// screen it is a shrunk copy of).
//
// THE ROWS THIS FILE RESTS ON
//
//   FR-043    「`Task` が未着手であるあいだ、`GRS` は、実績の入力を始める掴み
//             シロを 2 つ（マイルストーンは例外とする）、実績の開始点と終了点
//             として薄くタスクの上に示し …（MUST）」
//   FR-013    「未着手のマーカーと、実績入力のダミー（`FR-043`）は薄く描き、
//             ポインタが乗っているあいだだけ濃くすること（MUST）…… 濃さの値
//             は `S-131`。色は実績バーの色を継ぎ、独立した色を保存しない
//             （`FR-041`）」
//   T-206 S-180  「実績のダミーを描く幅（表 T-023d の `GR-9` / `GR-17` /
//             `GR-18`）」 = 12px, whose note says 「⭐ 本行が定めるのは横だけ
//             である —— 縦の広がりは実績バーの帯に従う」
//   T-206 S-93   the READER'S hit box, 30 x 20px -- S-180's note: 「⛔ `S-93`
//             とは別の値である —— あちらは読む人の当たり判定であって、環境が
//             大きく取ってよい」. ⛔ NOTHING BELOW ASSERTS S-93 OF A DRAWING.
//   T-023d GR-9 / GR-17 / GR-18   where the three dummies sit
//   T-076 EP-14  「`Actual Operation Dummy`（`U-52`）| 描かない | 文書に無い
//             値を描く操作子である。⚠️ 場所は空けない —— タスクバーに重なる
//             ので、描かなくても他の UI パーツの位置が動かない」
//   T-076 EP-5   the `Row Area`'s contents, `Progress Marker`（`U-5`）among
//             them, ARE drawn in the export
//   T-041 WY-3   「画面上の外接矩形に `exportCanvas` の幅 ÷ 画面の幅 の比を
//             掛けた値と、…… 書き出した SVG / PNG の中の同じ UI パーツの外接
//             矩形とが、位置も寸法も …… 一致すること」
//   T-023d GR-7  「進捗マーカー | 実績バーの右端の外側。**未着手のときは終了点
//             の掴みシロの外側** …」 -- the reason a dummy may not simply be
//             deleted for the export: the not-started marker's x hangs off
//             GR-17.
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- five gaps, reported rather than guessed:
//
//   * WHERE the 12px sits. No row says whether S-180's width is centred on the
//     grab point or begins at it, so the cases below ask only that the drawn
//     figure SPAN the point and be that wide.
//   * GR-18's vertical. A milestone has no actual bar (table T-023d, GR-15),
//     so S-180's 「縦の広がりは実績バーの帯に従う」 reaches GR-9 and GR-17 and
//     stops. Nothing here claims a height for GR-18.
//   * ⛔ THE PAINT ORDER. Table T-020 has ZO-1, ZO-1a, ZO-2, ZO-3, ZO-4 and
//     ZO-5, and NOT ONE of them names `Actual Operation Dummy` (U-52). The
//     dummy overlaps the plan bar (EP-14: 「タスクバーに重なる」), so which of
//     the two wins where they meet is undecided. No case below states one.
//   * FR-013's hover half -- 「ポインタが乗っているあいだだけ濃くすること
//     （MUST）」. PI-19 of table T-064 publishes `svgFromSchedule` over six
//     arguments and none of them is a pointer, so there is nothing to hover.
//   * Table T-023d's 「`GR-9` / `GR-17` / `GR-18` を掴んでいるあいだ、置くこと
//     になる実績を描いて示すこと（MUST）」. The picture is handed no gesture
//     either, so the drag preview has no surface to be asked about.

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import type {
  Calendar,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { exportSvg } from '../../src/adapter/image-exporter/image-exporter'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'

// ---------------------------------------------------------------------------
// The rows, read out of the manuscript at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

const S_180 = rowOf('T-206', 'S-180')
const EP_14 = rowOf('T-076', 'EP-14')
const GR_7 = rowOf('T-023d', 'GR-7')
const NS_3 = rowOf('T-231', 'NS-3')

/** Every number a cell writes, in the order it writes them. */
const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

/**
 * The grid a picture's numbers are spelled on. NS-3 of table T-231: 「`NS-1`
 * の前に、座標と寸法を **0.01 px の格子**へ丸めた綴りにする。⛔ 書き出す側と
 * 写し取った側の両方に当てること（MUST）」.
 *
 * ⭐ So a coordinate read back out of a picture is never the geometry's own
 * number, and every comparison below is made ON THIS GRID rather than exactly
 * -- which is the rounding NS-3 requires be applied to both sides, not a
 * tolerance this file invented.
 */
const GRID = ((): number => {
  const [first] = numbersOf(NS_3['規則'] ?? '')
  if (first === undefined || first <= 0) {
    throw new Error(`table T-231 row NS-3 states no grid: ${NS_3['規則']}`)
  }
  return first
})()

const onGrid = (value: number): number => Math.round(value / GRID) * GRID
const sameOnGrid = (value: number, other: number): boolean =>
  Math.abs(onGrid(value) - onGrid(other)) < GRID / 2

/**
 * S-180's default, as the manuscript states it.
 *
 * ⛔ NOT TYPED IN. Rule 04 section 2 asks the acceptance of a value that
 * travels from a manuscript to be "change the one value and watch the case
 * fall", and a number written here would not fall. ⚠️ There is no generated
 * constant to read it from yet: `NOT_STORED_SIZES` carries S-90 to S-93 and
 * S-137, and this row is newer than that list.
 */
const DUMMY_DRAWN_WIDTH = ((): number => {
  const [only, ...rest] = numbersOf(S_180['既定'] ?? '')
  if (only === undefined || rest.length !== 0) {
    throw new Error(`table T-206 row S-180: the default is not one number, it is ${S_180['既定']}`)
  }
  return only
})()

// ---------------------------------------------------------------------------
// The document under test. Plain data; every builder returns a fresh object.
// ---------------------------------------------------------------------------

/** Expand SETTINGS_DEFAULTS' dotted keys into the nested shape the type has. */
const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

/**
 * A calendar on which every weekday is worked (FR-054 resolves the document's
 * one calendar through `Project.calendarUid`).
 *
 * ⭐ Every day worked is what makes GR-17 land on the very next day: FR-043
 * puts the end handle 「予定の開始日から `S-129` ぶん進んだ稼働日」, and a
 * calendar with holidays in it would move that day for reasons this file is
 * not about.
 */
const EVERY_DAY_WORKED = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    ordinal: n,
    dayType: n,
    dayWorking: true,
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
} as unknown as Calendar

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  }) as unknown as Task

const taskGroup = (id: string, order: number): TaskGroup =>
  ({
    id,
    parentId: null,
    label: id,
    derivedFromTaskUid: null,
    order,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
  }) as unknown as TaskGroup

const taskVisual = (taskUid: number, shapeKind: string): TaskVisual =>
  ({
    taskUid,
    nameAnchor: null,
    nameAlign: null,
    shapeKind,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
    ...(shapeKind === 'milestone' ? { milestoneGlyph: 'diamond' } : {}),
  }) as unknown as TaskVisual

/** `groupIds[i]` says which row `tasks[i]` is drawn on. Rows come out sorted. */
const scheduleOf = (
  tasks: readonly Task[],
  groupIds: readonly string[],
  visuals: readonly TaskVisual[],
): Schedule => {
  const ids = [...new Set(groupIds)].sort()
  return {
    project: {
      id: null,
      name: null,
      title: null,
      subject: null,
      category: null,
      company: null,
      manager: null,
      author: null,
      created: null,
      revision: null,
      lastSaved: null,
      startDate: '2026-03-01T00:00:00',
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: EVERY_DAY_WORKED.uid,
      themeHue: 214,
      uidHighWaterMark: 1000,
      importSeq: 0,
      carry: {},
      carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: ids.map((id, i) => taskGroup(id, i)),
    taskGroupMembers: tasks.map((one, i) => ({
      taskUid: one.uid,
      groupId: groupIds[i] ?? ids[0] ?? 'g1',
      stackOrder: null,
    })) as unknown as readonly TaskGroupMember[],
    taskVisuals: visuals,
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

/** BO-1 of table T-077: what the environment settles, not the document. */
const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8 }

/** A day of March 2026, as a stored date column writes it. */
const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

/** The Task these cases watch, and one row above it so it is not at the edge. */
const UNDER_TEST = 1

/**
 * `S-129` worked days, read from the generated defaults rather than typed.
 *
 * FR-043 (MUST): 「掴んで置く値は、実績開始日 ＝ 予定の開始日、実績期間
 * （`actualDuration`）＝ `_assets/tbl-settings.md` の `S-129`」. So the twin
 * document below is exactly what grabbing GR-9 would produce, which is what
 * makes it the actual bar the dummy stands for.
 */
const ACTUAL_INITIAL_DURATION = ((): number => {
  const value = SETTINGS_DEFAULTS['actualInitialDuration']
  if (typeof value !== 'number') throw new Error('S-129 is not a number')
  return value
})()

/** `S-131`, the degree FR-013 names for the faint dummy and the faint marker. */
const DUMMY_OPACITY = ((): number => {
  const value = SETTINGS_DEFAULTS['dummyOpacity']
  if (typeof value !== 'number') throw new Error('S-131 is not a number')
  return value
})()

interface Drawn {
  readonly regions: ReturnType<typeof regionsFromScreen>
  readonly layout: ReturnType<typeof layoutFromSchedule>
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly svg: string
}

/** One pass of table T-068's chain, then PI-19. */
const draw = (schedule: Schedule): Drawn => {
  // scrollDate (S-77) pins the left edge of the Row Area, so the axis is fixed
  // and the two documents a case compares are drawn on the same one.
  const settings = settingsOf({ zoomX: 10, scrollDate: day(1), stackDirection: 'down' })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  return {
    regions,
    layout,
    geometry,
    // EP-14's other arm. Every picture this helper builds is the SCREEN's;
    // the export cases go through `exportScene` / `exportSvg` instead.
    svg: svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen'),
  }
}

const geometryOf = (drawn: Drawn, uid: number) => {
  const found = drawn.geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`no geometry for Task ${uid}`)
  return found
}

/** A rectangle Task that has not been started, with one earlier row above it. */
const notStartedSchedule = (): Schedule =>
  scheduleOf(
    [
      task({ uid: UNDER_TEST, start: day(5), finish: day(15) }),
      task({ uid: 2, start: day(2), finish: day(3) }),
    ],
    ['g2', 'g1'],
    [taskVisual(UNDER_TEST, 'rectangle'), taskVisual(2, 'rectangle')],
  )

/**
 * The same document after FR-043's MUST has been carried out on GR-9 -- the
 * actual the dummy stands for, and nothing else about the Task changed.
 */
const startedSchedule = (): Schedule =>
  scheduleOf(
    [
      task({
        uid: UNDER_TEST,
        start: day(5),
        finish: day(15),
        actualStart: day(5),
        actualDuration: ACTUAL_INITIAL_DURATION,
        resumeValid: true,
      }),
      task({ uid: 2, start: day(2), finish: day(3) }),
    ],
    ['g2', 'g1'],
    [taskVisual(UNDER_TEST, 'rectangle'), taskVisual(2, 'rectangle')],
  )

/** A milestone that has not been started. Table T-023d, GR-18. */
const milestoneSchedule = (): Schedule =>
  scheduleOf(
    [
      task({ uid: UNDER_TEST, start: day(5), finish: day(5), milestone: true }),
      task({ uid: 2, start: day(2), finish: day(3) }),
    ],
    ['g2', 'g1'],
    [taskVisual(UNDER_TEST, 'milestone'), taskVisual(2, 'rectangle')],
  )

// ---------------------------------------------------------------------------
// Reading a picture back as the figures it draws
//
// ⭐ A BOUNDING RECTANGLE AND NOT AN ATTRIBUTE NAME. WY-3 of table T-041 judges
// what is drawn by 外接矩形, and S-180 states a WIDTH -- neither says which SVG
// element carries it. So the cases below ask the picture what it draws and how
// wide, and no case names a tag or an attribute the specification does not.
// ---------------------------------------------------------------------------

interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

interface Figure {
  readonly tag: string
  /** The element exactly as the picture writes it -- the key two pictures are differenced on. */
  readonly text: string
  /** Null for `text`: FR-093 forbids measuring glyphs, so this file never claims a text box. */
  readonly box: Box | null
  /** Every enclosing `<g opacity>` multiplied into the element's own. */
  readonly opacity: number
  /** `fill` and `stroke` as written, so FR-041's 「独立した色を保存しない」 can be checked. */
  readonly colours: readonly string[]
}

const ELEMENT = /<(\/?)([A-Za-z][\w-]*)((?:[^<>"]|"[^"]*")*?)(\/?)>/g

const attrOf = (attrs: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1] ?? null

const numberAttr = (attrs: string, name: string, fallback = 0): number => {
  const raw = attrOf(attrs, name)
  return raw === null ? fallback : Number.parseFloat(raw)
}

const boxOfPoints = (points: readonly (readonly [number, number])[]): Box | null => {
  if (points.length === 0) return null
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

const pointsOf = (raw: string): (readonly [number, number])[] =>
  raw
    .trim()
    .split(/\s+/)
    .filter((pair) => pair !== '')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return [x ?? Number.NaN, y ?? Number.NaN] as const
    })

/**
 * A `path`, read only where reading it is safe.
 *
 * ⛔ Throws on any command that bends -- an arc or a curve has a hull wider
 * than its control points, so measuring one from its numbers would answer a
 * width the picture does not draw. A case that hits this fails saying so
 * rather than passing on a wrong measurement.
 */
const boxOfPath = (d: string): Box | null => {
  const commands = d.match(/[A-Za-z]/g) ?? []
  const bending = commands.filter((one) => !'MmLlHhVvZz'.includes(one))
  if (bending.length > 0) {
    throw new Error(`this file cannot measure a path drawn with ${bending.join('')}`)
  }
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const points: (readonly [number, number])[] = []
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push([numbers[i] ?? Number.NaN, numbers[i + 1] ?? Number.NaN] as const)
  }
  return boxOfPoints(points)
}

const boxOfElement = (tag: string, attrs: string): Box | null => {
  switch (tag) {
    case 'rect': {
      const x = numberAttr(attrs, 'x')
      const y = numberAttr(attrs, 'y')
      return { x0: x, y0: y, x1: x + numberAttr(attrs, 'width'), y1: y + numberAttr(attrs, 'height') }
    }
    case 'circle': {
      const r = numberAttr(attrs, 'r')
      const cx = numberAttr(attrs, 'cx')
      const cy = numberAttr(attrs, 'cy')
      return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }
    }
    case 'ellipse': {
      const rx = numberAttr(attrs, 'rx')
      const ry = numberAttr(attrs, 'ry')
      const cx = numberAttr(attrs, 'cx')
      const cy = numberAttr(attrs, 'cy')
      return { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry }
    }
    case 'line':
      return boxOfPoints([
        [numberAttr(attrs, 'x1'), numberAttr(attrs, 'y1')],
        [numberAttr(attrs, 'x2'), numberAttr(attrs, 'y2')],
      ])
    case 'polygon':
    case 'polyline':
      return boxOfPoints(pointsOf(attrOf(attrs, 'points') ?? ''))
    case 'path':
      return boxOfPath(attrOf(attrs, 'd') ?? '')
    default:
      return null
  }
}

/** The element's own translucency, however it is spelled. */
const ownOpacityOf = (attrs: string): number => {
  for (const name of ['opacity', 'fill-opacity', 'stroke-opacity']) {
    const raw = attrOf(attrs, name)
    if (raw !== null) return Number.parseFloat(raw)
  }
  return 1
}

/** Every leaf figure a picture draws, with the groups above it folded in. */
const figuresOf = (svg: string): readonly Figure[] => {
  const out: Figure[] = []
  const opacities: number[] = []
  const effective = (): number => opacities.reduce((a, b) => a * b, 1)
  ELEMENT.lastIndex = 0
  for (let hit = ELEMENT.exec(svg); hit !== null; hit = ELEMENT.exec(svg)) {
    const [text, closing, tag = '', attrs = '', selfClosing] = hit
    if (closing === '/') {
      if (tag === 'g' || tag === 'svg') opacities.pop()
      continue
    }
    if (tag === 'g' || tag === 'svg') {
      if (selfClosing !== '/') opacities.push(ownOpacityOf(attrs))
      continue
    }
    if (tag === 'defs' || tag === 'clipPath' || tag === 'marker') continue
    out.push({
      tag,
      text,
      box: boxOfElement(tag, attrs),
      opacity: effective() * ownOpacityOf(attrs),
      colours: ['fill', 'stroke']
        .map((name) => attrOf(attrs, name))
        .filter((one): one is string => one !== null),
    })
  }
  return out
}

/** What the first picture draws and the second does not, element for element. */
const onlyIn = (one: string, other: string): readonly Figure[] => {
  const theirs = new Set(figuresOf(other).map((figure) => figure.text))
  return figuresOf(one).filter((figure) => !theirs.has(figure.text))
}

const spansX = (box: Box | null, x: number): boolean =>
  box !== null && onGrid(box.x0) - GRID / 2 <= onGrid(x) && onGrid(x) <= onGrid(box.x1) + GRID / 2

/** The union of a set of boxes -- what "the drawn figure" measures as. */
const unionOf = (figures: readonly Figure[]): Box => {
  const boxes = figures.map((one) => one.box).filter((one): one is Box => one !== null)
  if (boxes.length === 0) throw new Error('nothing is drawn here')
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  }
}

/**
 * The figures one picture draws at a grab point that the other draws nowhere.
 *
 * ⭐ THE SUBTRACTION IS WHAT ISOLATES THE DUMMY. The plan bar spans the grab
 * point too, and so does the row's band; both are written identically in the
 * two pictures, so differencing them away leaves what only the Task-not-started
 * picture has. ⚠️ The not-started marker survives the subtraction as well --
 * PM-1a and PM-1 are different figures -- which is why the point matters: GR-7
 * puts the marker OUTSIDE GR-17, so no box of the marker's spans a dummy's x.
 */
const drawnAt = (withDummy: string, withoutDummy: string, x: number): readonly Figure[] =>
  onlyIn(withDummy, withoutDummy).filter((figure) => spansX(figure.box, x))

/** The band the actual bar of the started twin occupies -- S-180's vertical. */
const actualBandOf = (started: Drawn): Box => {
  const actual = geometryOf(started, UNDER_TEST).actual
  if (actual === null || actual.form !== 'outline') throw new Error('the twin drew no actual bar')
  const box = boxOfPoints(actual.points.map((one) => [one.x, one.y] as const))
  if (box === null) throw new Error('the actual bar has no points')
  return box
}

/** Whether two boxes are the same rectangle, to the picture's own precision. */
const sameBoxAs = (box: Box | null, other: Box | null): boolean =>
  box !== null &&
  other !== null &&
  sameOnGrid(box.x0, other.x0) &&
  sameOnGrid(box.x1, other.x1) &&
  sameOnGrid(box.y0, other.y0) &&
  sameOnGrid(box.y1, other.y1)

// ---------------------------------------------------------------------------
// The instrument, checked against a picture that DOES obey the rows
//
// ⭐ Rule 04 section 2: 「検査・契約・免除は、わざと壊して落ちることを確かめる
// まで、確かめたことにならない」. Every case below the next divider is red while
// D-04 is open, and a red case proves nothing about the machinery that read the
// picture. So the same readers are run once over a picture assembled HERE to
// the letter of FR-043, FR-013 and S-180 -- if this case ever falls, the cases
// after it are failing for a reason that is this file's and not the product's.
//
// ⛔ THIS IS NOT A CLAIM ABOUT `src/`. Nothing in it renders anything: the
// figures are spliced into a real picture as a plain string.
// ---------------------------------------------------------------------------

/** A faint band S-180 wide at `x`, standing in the actual bar's own band. */
const spliced = (svg: string, xs: readonly number[], band: Box, fill: string): string => {
  const figures = xs
    .map(
      (x) =>
        `<g opacity="${DUMMY_OPACITY}">` +
        `<rect x="${x - DUMMY_DRAWN_WIDTH / 2}" y="${band.y0}"` +
        ` width="${DUMMY_DRAWN_WIDTH}" height="${band.y1 - band.y0}" fill="${fill}"/></g>`,
    )
    .join('')
  return svg.replace('</svg>', `${figures}</svg>`)
}

describe('the reader this file measures pictures with', () => {
  it('finds a dummy that obeys FR-043, FR-013 and S-180, and nothing where none is drawn', () => {
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    const band = actualBandOf(started)
    const bar = figuresOf(started.svg).filter((one) => sameBoxAs(one.box, band))
    const fill = bar.flatMap((one) => one.colours)[0]
    expect(fill).toBeDefined()
    const xs = geometryOf(fresh, UNDER_TEST).dummies.map((one) => one.at.x)
    expect(xs).toHaveLength(2)
    const obedient = spliced(fresh.svg, xs, band, fill!)

    for (const x of xs) {
      const drawnFigures = drawnAt(obedient, started.svg, x)
      expect(drawnFigures).toHaveLength(1)
      const box = unionOf(drawnFigures)
      expect(onGrid(box.x1 - box.x0)).toBeCloseTo(DUMMY_DRAWN_WIDTH, 2)
      expect(onGrid(box.y0)).toBeCloseTo(onGrid(band.y0), 2)
      expect(onGrid(box.y1)).toBeCloseTo(onGrid(band.y1), 2)
      expect(drawnFigures[0]!.opacity).toBeCloseTo(DUMMY_OPACITY, 6)
      expect(drawnFigures[0]!.colours).toContain(fill)
      // EP-14's shape: the same reading over a picture that drew none finds
      // exactly these figures missing, and nothing else.
      expect(drawnAt(obedient, fresh.svg, x)).toHaveLength(1)
      // ⛔ AND THE OTHER WAY. Take them away again and the reader says so --
      // which is what the red cases below are saying today.
      expect(drawnAt(fresh.svg, started.svg, x)).toHaveLength(0)
    }
  })
})

// ---------------------------------------------------------------------------
// FR-043 (MUST) and S-180: the dummy is drawn, and how wide
// ---------------------------------------------------------------------------

describe('FR-043 / table T-206 S-180 -- the Actual Operation Dummy is drawn', () => {
  it('S-180 is still the row that gives GR-9 / GR-17 / GR-18 a drawn width', () => {
    // ⚠️ A GUARD, NOT THE CLAIM. It says this file is still pointed at the row
    // it was written for; if the row moved, the cases after it would be the
    // wrong ones to be writing rather than a failure of the code.
    expect(S_180['値']).toContain('GR-9')
    expect(S_180['値']).toContain('GR-17')
    expect(S_180['値']).toContain('GR-18')
    expect(S_180['値']).toContain('描く幅')
    // 「⛔ `S-93` とは別の値である」 -- so this file never measures S-93.
    expect(S_180['保存しない理由']).toContain('S-93')
    expect(DUMMY_DRAWN_WIDTH).toBeGreaterThan(0)
  })

  it('the two documents differ only in the actual, so the difference of the pictures is the dummy', () => {
    // A precondition of every case below: FR-011 keeps the plan where it is
    // when an actual is placed, so the plan bar is written identically in both
    // pictures and is differenced away rather than mistaken for a dummy.
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    expect(geometryOf(started, UNDER_TEST).plan).toEqual(geometryOf(fresh, UNDER_TEST).plan)
    expect(geometryOf(fresh, UNDER_TEST).dummies.map((one) => one.grab)).toEqual(['GR-9', 'GR-17'])
    expect(geometryOf(started, UNDER_TEST).dummies).toHaveLength(0)
  })

  it('FR-043 (MUST) shows the start handle: the picture draws a figure at GR-9', () => {
    // FR-043: 「実績の入力を始める掴みシロを 2 つ …… 実績の開始点と終了点として
    // 薄くタスクの上に示し」. ⛔ A live hit target with nothing under the
    // pointer is not 「示し」 -- that is the defect this case exists for.
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    const gr9 = geometryOf(fresh, UNDER_TEST).dummies.find((one) => one.grab === 'GR-9')
    expect(gr9).toBeDefined()
    expect(drawnAt(fresh.svg, started.svg, gr9!.at.x).length).toBeGreaterThan(0)
  })

  it('FR-043 (MUST) shows the end handle: the picture draws a figure at GR-17', () => {
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    const gr17 = geometryOf(fresh, UNDER_TEST).dummies.find((one) => one.grab === 'GR-17')
    expect(gr17).toBeDefined()
    expect(drawnAt(fresh.svg, started.svg, gr17!.at.x).length).toBeGreaterThan(0)
  })

  it('S-180 makes each of GR-9 and GR-17 that many px wide', () => {
    // S-180: 「実績のダミーを描く幅（表 T-023d の `GR-9` / `GR-17` / `GR-18`）」.
    // The row names the three grab areas one by one, so the width is each
    // dummy's and not the span of the pair.
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    for (const dummy of geometryOf(fresh, UNDER_TEST).dummies) {
      const drawnFigures = drawnAt(fresh.svg, started.svg, dummy.at.x)
      expect(drawnFigures.length, `nothing is drawn at ${dummy.grab}`).toBeGreaterThan(0)
      const box = unionOf(drawnFigures)
      expect(onGrid(box.x1 - box.x0), dummy.grab).toBeCloseTo(DUMMY_DRAWN_WIDTH, 2)
    }
  })

  it('S-180 governs the horizontal only: the dummy stands in the actual bar band', () => {
    // S-180's note: 「⭐ 本行が定めるのは横だけである —— 縦の広がりは実績バーの
    // 帯に従う（`S-91` が予実の端点について置いた分け方と同じである）」.
    // ⭐ The band is not computed here: it is READ OFF the actual bar of the
    // twin document, which is the very actual FR-043 places when GR-9 is
    // grabbed. So nothing in this case knows S-5 or any other figure.
    expect(S_180['保存しない理由']).toContain('縦の広がりは実績バーの帯に従う')
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    const band = actualBandOf(started)
    for (const dummy of geometryOf(fresh, UNDER_TEST).dummies) {
      const drawnFigures = drawnAt(fresh.svg, started.svg, dummy.at.x)
      expect(drawnFigures.length, `nothing is drawn at ${dummy.grab}`).toBeGreaterThan(0)
      const box = unionOf(drawnFigures)
      expect(onGrid(box.y0), `${dummy.grab} top`).toBeCloseTo(onGrid(band.y0), 2)
      expect(onGrid(box.y1), `${dummy.grab} bottom`).toBeCloseTo(onGrid(band.y1), 2)
    }
  })

  it('FR-013 (MUST) draws it faint, at S-131', () => {
    // FR-013: 「未着手のマーカーと、実績入力のダミー（`FR-043`）は薄く描き …
    // 濃さの値は `S-131`」.
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    for (const dummy of geometryOf(fresh, UNDER_TEST).dummies) {
      const drawnFigures = drawnAt(fresh.svg, started.svg, dummy.at.x)
      expect(drawnFigures.length, `nothing is drawn at ${dummy.grab}`).toBeGreaterThan(0)
      for (const figure of drawnFigures) {
        expect(figure.opacity, `${dummy.grab} is not faint`).toBeCloseTo(DUMMY_OPACITY, 6)
      }
    }
  })

  it('FR-041 keeps the dummy on the actual bar colours and gives it none of its own', () => {
    // FR-013: 「色は実績バーの色を継ぎ、独立した色を保存しない（`FR-041`）」.
    const fresh = draw(notStartedSchedule())
    const started = draw(startedSchedule())
    // The actual bar is the figure of the started picture whose box is the
    // band -- found by its rectangle rather than by any tag or attribute name.
    const band = actualBandOf(started)
    const bar = figuresOf(started.svg).filter((one) => sameBoxAs(one.box, band))
    expect(bar.length, 'the twin drew no actual bar').toBeGreaterThan(0)
    const inherited = new Set(bar.flatMap((one) => one.colours))
    for (const dummy of geometryOf(fresh, UNDER_TEST).dummies) {
      const drawnFigures = drawnAt(fresh.svg, started.svg, dummy.at.x)
      expect(drawnFigures.length, `nothing is drawn at ${dummy.grab}`).toBeGreaterThan(0)
      for (const figure of drawnFigures) {
        for (const colour of figure.colours) {
          if (colour === 'none') continue
          expect(inherited, `${dummy.grab} paints itself ${colour}`).toContain(colour)
        }
      }
    }
  })

  it('GR-18 (MUST): a milestone not started draws one dummy, S-180 wide', () => {
    // FR-043: 「⚠️ マイルストーンは例外である —— 実績バーを持たないので（表
    // T-023d の `GR-15`）、ダミーは点として 1 つだけ出し、実績期間は `S-130` と
    // すること（MUST）」. ⛔ NO VERTICAL IS ASSERTED: a milestone has no actual
    // bar, so S-180's 「縦の広がりは実績バーの帯に従う」 reaches nothing here.
    const fresh = draw(milestoneSchedule())
    const started = draw(
      scheduleOf(
        [
          task({
            uid: UNDER_TEST,
            start: day(5),
            finish: day(5),
            milestone: true,
            actualStart: day(5),
            actualDuration: 0,
            resumeValid: true,
          }),
          task({ uid: 2, start: day(2), finish: day(3) }),
        ],
        ['g2', 'g1'],
        [taskVisual(UNDER_TEST, 'milestone'), taskVisual(2, 'rectangle')],
      ),
    )
    const dummies = geometryOf(fresh, UNDER_TEST).dummies
    expect(dummies.map((one) => one.grab)).toEqual(['GR-18'])
    const drawnFigures = drawnAt(fresh.svg, started.svg, dummies[0]!.at.x)
    expect(drawnFigures.length, 'nothing is drawn at GR-18').toBeGreaterThan(0)
    const box = unionOf(drawnFigures)
    expect(onGrid(box.x1 - box.x0)).toBeCloseTo(DUMMY_DRAWN_WIDTH, 2)
  })
})

// ---------------------------------------------------------------------------
// EP-14 of table T-076: the export draws no dummy -- and drops nothing else
// ---------------------------------------------------------------------------

/** The screen picture and the exported one, taken from one running shell. */
interface TwoPictures {
  readonly screen: string
  /** The picture the export is assembled from, and the assembled export itself. */
  readonly exportInner: string
  readonly exportWhole: string
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly ratio: number
}

const shellPictures = (schedule: Schedule): TwoPictures => {
  const base = structuredClone(startupTemplate) as unknown as Document
  const settings = settingsOf({ stackDirection: 'down' })
  const document = {
    ...base,
    schedule,
    documentSettings: settings,
  } as unknown as Document
  // ⭐ S-80's default is 0, and 0 IS what closed means -- so FR-080's export
  // environment (「プロパティパネルとコマンドパレットを閉じた状態」) is the very
  // environment the screen is already in, and the two pictures are comparable
  // figure for figure. A document with the panel open would be a different
  // run of table T-068 and this file could say nothing about the difference.
  expect(document.documentSettings.propertyPanelWidth).toBe(0)

  const painted: string[] = []
  const loop = frameLoop({ showSvg: (one: string) => painted.push(one) }, document, SCREEN)
  const screen = painted[painted.length - 1]
  const scene = loop.exportScene()
  const frame = loop.current()
  if (screen === undefined || scene === null || frame === null) {
    throw new Error('BO-1 has settled no size, so there is no picture to compare')
  }
  return {
    screen,
    exportInner: scene.svg,
    exportWhole: exportSvg(scene).svg,
    geometry: frame.geometry,
    ratio: scene.settings.exportCanvas.width / SCREEN.width,
  }
}

const taskGeometryOf = (pictures: TwoPictures, uid: number) => {
  const found = pictures.geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`no geometry for Task ${uid}`)
  return found
}

describe('EP-14 of table T-076 -- an export draws no dummy, and moves nothing', () => {
  it('EP-14 is still the row that keeps U-52 out and leaves its room alone', () => {
    // ⚠️ A GUARD. 「`Actual Operation Dummy`（`U-52`）| 描かない | …
    // ⚠️ 場所は空けない」.
    expect(EP_14['UI パーツ']).toContain('U-52')
    expect(EP_14['描くか']).toContain('描かない')
    expect(EP_14['理由と扱い']).toContain('場所は空けない')
    // GR-7's own clause is why a dummy may not simply be deleted for an export.
    expect(GR_7['場所']).toContain('未着手のときは終了点の掴みシロの外側')
  })

  it('EP-14 (MUST NOT): what the screen draws at GR-9 and GR-17 is not in the export', () => {
    const pictures = shellPictures(notStartedSchedule())
    const dummies = taskGeometryOf(pictures, UNDER_TEST).dummies
    expect(dummies.map((one) => one.grab)).toEqual(['GR-9', 'GR-17'])
    // ⛔ THE PRECONDITION IS PART OF THE CLAIM. Without it this case passes
    // while nothing is drawn anywhere, which is exactly the state EP-14 must
    // not be confused with: a picture that draws no dummy because the dummy is
    // drawn nowhere obeys no requirement.
    for (const dummy of dummies) {
      const dropped = drawnAt(pictures.screen, pictures.exportInner, dummy.at.x)
      expect(
        dropped.length,
        `the screen draws nothing at ${dummy.grab} that the export leaves out`,
      ).toBeGreaterThan(0)
    }
    // Nothing else went missing on the way: the two pictures differ by the
    // dummies and by nothing that is not at a dummy's x.
    const dummyXs = dummies.map((one) => one.at.x)
    for (const figure of onlyIn(pictures.screen, pictures.exportInner)) {
      expect(
        dummyXs.some((x) => spansX(figure.box, x)),
        `the export also dropped ${figure.text}`,
      ).toBe(true)
    }
  })

  it('EP-5 keeps the not-started Progress Marker in the export, at the screen x', () => {
    // ⛔ THE CASE THIS FILE EXISTS FOR MOST. Emptying `dummies` for the export
    // would satisfy EP-14 and take the marker with it: GR-7 puts the
    // not-started marker 「終了点の掴みシロの外側」, so its x hangs off GR-17.
    // EP-5 draws `Progress Marker`（`U-5`）in the export, so it must survive.
    const pictures = shellPictures(notStartedSchedule())
    const marker = taskGeometryOf(pictures, UNDER_TEST).marker
    expect(marker?.symbol).toBe('PM-1a')
    const atTheMarker = (svg: string): readonly string[] =>
      figuresOf(svg)
        .filter(
          (one) =>
            one.box !== null &&
            sameOnGrid((one.box.x0 + one.box.x1) / 2, marker!.centre.x) &&
            sameOnGrid((one.box.y0 + one.box.y1) / 2, marker!.centre.y),
        )
        .map((one) => one.text)
        .sort()
    expect(atTheMarker(pictures.exportInner).length, 'the export drew no not-started marker')
      .toBeGreaterThan(0)
    // And the very same figures as on the screen -- 「場所は空けない」.
    expect(atTheMarker(pictures.exportInner)).toEqual(atTheMarker(pictures.screen))
  })

  it('EP-14 leaves the room: the plan bar is written identically in both pictures', () => {
    // 「⚠️ 場所は空けない —— タスクバーに重なるので、描かなくても他の UI パーツ
    // の位置が動かない」.
    const pictures = shellPictures(notStartedSchedule())
    const plan = taskGeometryOf(pictures, UNDER_TEST).plan
    if (plan === null || plan.form !== 'outline') throw new Error('the Task drew no plan bar')
    const planBox = boxOfPoints(plan.points.map((one) => [one.x, one.y] as const))
    const sameBox = (svg: string): readonly string[] =>
      figuresOf(svg)
        .filter((one) => sameBoxAs(one.box, planBox))
        .map((one) => one.text)
        .sort()
    expect(sameBox(pictures.exportInner)).toEqual(sameBox(pictures.screen))
    expect(sameBox(pictures.screen).length).toBeGreaterThan(0)
  })

  it('WY-3 of table T-041: one ratio carries the screen picture into the export', () => {
    // WY-3: 「画面上の外接矩形に `exportCanvas` の幅 ÷ 画面の幅 の比を掛けた値
    // と …… 書き出した SVG …… の中の同じ UI パーツの外接矩形とが、位置も寸法も
    // …… 一致すること」. FR-080 (MUST): 「縦にも横にも同じ比を掛けること」,
    // (MUST NOT) 「縦と横に別の比を掛けてはならない」 -- so ONE number.
    const pictures = shellPictures(notStartedSchedule())
    const scales = [...pictures.exportWhole.matchAll(/scale\(([^)]*)\)/g)].map((hit) => hit[1] ?? '')
    expect(scales.length).toBe(1)
    expect(numbersOf(scales[0] ?? '')).toHaveLength(1)
    expect(Number.parseFloat(scales[0] ?? 'NaN')).toBeCloseTo(pictures.ratio, 2)
    // The received picture goes inside that group untouched (FR-080's 「切り出す
    // 範囲は `GRS` が占める画面の全体」), so a part kept by table T-076 is at
    // its screen coordinate times the ratio and nothing else.
    expect(pictures.exportWhole).toContain(pictures.exportInner)
  })
})
