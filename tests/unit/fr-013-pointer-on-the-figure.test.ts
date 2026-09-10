// FR-013's second half: the faint dummy and the faint not-started marker are
// drawn 濃く while the pointer is on them.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification section 1).
//
// ⭐ WHY THIS FILE EXISTS. tests/unit/uf-32.test.ts asserts that the ONE
// ダミーの印 and the 未着手 marker are drawn at S-131; this file asserts the other
// half of the same MUST -- that the mark under the pointer stops being faint.
//
// THE LINES THIS FILE RESTS ON
//
//   FR-013 (docs/spec/01-04-requirements.md, MUST)
//     「**未着手のマーカーと、実績入力のダミー（`FR-043`）は薄く描き、ポインタが
//      乗っているあいだだけ濃くすること（MUST）** —— 作法は表 T-051 の `HF-6` と
//      同じである。濃さの値は `S-131`。」
//
//   FR-043 (MUST / MUST NOT, 利用者の裁定 2026-09-08, 逐語「タスクのダミーは1日
//   とする。 だから = は1日」「1つだけにしろ」)
//     「⭐⭐ **ダミーの印は 1 つだけ描くこと（MUST）。開始の側と終了の側に別々の
//      印を描いてはならない（MUST NOT）**」
//     ⭐ 「**掴む先が 2 つであることは変わらない** —— 表 T-023d の `GR-9` と
//      `GR-17` はどちらも残り …… ⇒ **人から見れば掴みシロは 1 つであり、掴めば
//      実績が立つ。**」
//   ⇒ ⛔ TWO GRAB TARGETS ON ONE DRAWN MARK, AND SINCE 2026-09-10 THEY SHARE ITS
//   PIXELS. `halvesAt` below walks the two halves table T-023d cuts that one
//   mark into -- GR-9 on the left half, GR-17 on the right -- and every one of
//   those points is on the ink. ⛔ Nothing is drawn, and since that ruling
//   nothing is held, at the day column GR-17 used to stand on: a case below
//   asserts both halves of that, and the closing rule is quoted further down.
//
//   T-051 HF-6 (MUST)
//     「**操作子は、その行の名前にポインタが乗っているあいだだけ描くこと
//      （MUST）**」
//
//   ⭐ WHAT THOSE TWO TOGETHER SETTLE, and the whole point of this file:
//   HF-6's condition is a PLACE -- the pointer being on the figure -- and it
//   carries no notion of priority. FR-013 says its 作法 is 「表 T-051 の `HF-6`
//   と同じ」, so the condition FR-013 inherits is the same geometric one.
//   ⛔ Table T-023's MK-9a is 「掴む対象が重なった」ときの優先順位 -- a rule about
//   what a PRESS lands on -- and no row of docs/spec hands that answer to the
//   drawing. So the cases below hand the renderer a pointer and NO won grab row
//   at all, and still require the figure under the pointer to leave S-131.
//
//   ⭐⭐ WHERE THE POINTER IS PUT, AND WHY IT IS NOW THE INK ITSELF
//   (利用者の裁定 2026-09-10, held by the closing rules of table T-023d)
//
//     表 T-023d 結び (MUST / MUST NOT)
//       「**`GR-9` / `GR-17` / `GR-18` の当たり判定は、`FR-043` が描いた印その
//        ものとすること（MUST）。印の外へ広げてはならない（MUST NOT）**」
//       ⭐ 「**`GR-9` と `GR-17` は、その印を中央で左右に割った半分をそれぞれ
//        受け持ち、`GR-18` は印の全体を受け持つ**」
//       ⚠️ 「**`GR-9` はタスク全体ではなく、`FR-043` が描いた印の左半分に限る
//        こと（MUST）**」
//     FR-043 (MUST) 「**ダミーを描く幅は、1 日ぶんと … `S-180` の小さい方とする
//     こと（MUST）。日の列の左端に揃えること（MUST）**」, and the same requirement
//     reads the halves back off that mark: 「**人が印を押したときに掴むのは、印の
//     左半分なら開始側（表 T-023d の `GR-9`）、右半分なら終了側（同表の `GR-17`）
//     とすること（MUST）**」.
//     T-206 S-180 「**本行が描く幅であり、掴みシロでもある**」.
//   ⇒ ⛔ ONE RECTANGLE ANSWERS BOTH QUESTIONS, so the pointer can be -- and here
//   is -- computed from FR-043's own arithmetic:
//       T-023d GR-3  「予定の開始点 | 予定バーの左端」 -- the pixel where the plan
//                    start day's column begins;
//       FR-043 / T-023d GR-9   the mark stands one working day right of it;
//       FR-017 (MUST) 「1 日あたりの表示幅は … `S-1` に `zoomX` を掛けた値」;
//       FR-043's width, halved for the two rows.
//   ⭐ That is not the drawing measuring itself: every number comes from the
//   manuscript, and a case below asserts that the picture's own ink begins and
//   ends where that arithmetic says.
//
//   ⛔⛔ UNTIL 2026-09-10 THIS FILE HELD THE OPPOSITE READING -- 「当たり判定は
//   本段の対象ではない（MUST NOT）」 (FR-043, still standing) sent the hold away
//   from the drawing rule, and the row it was sent to gave the dummies a hit box
//   of their own, one whole day apart for the two rows. So the pointer was
//   computed from that row and deliberately never from the ink, and the two
//   points stood on two different day columns. ⭐ The ruling of 2026-09-10 struck
//   that row -- 「**その `S-93` は 2026-09-10 に廃した**」 (表 T-206 の `S-180`) --
//   and made the drawn mark the hold, so nothing below reads it and the two
//   points now stand on the two halves of one mark.
//
//   T-206 S-90 -- 「予定の端点の掴み代 | バーの上下と、端点の外側に 12px」, which at
//   a low magnification covers the whole mark; the second describe below is
//   built on that overlap. ⚠️ The row reached to EITHER side of the end, and
//   half as far, until 2026-09-09: the ruling of that day took it to the end's
//   outside alone and doubled the number.
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * HOW DARK 濃く IS. FR-013 fixes the FAINT value (S-131) and no row anywhere
//     fixes the other one, so every case below asks only that the figure under
//     the pointer has LEFT S-131 -- never what it arrived at.
//   * ⛔⛔ WHERE THE HIT BOX WAS CENTRED was left unasserted until 2026-09-10:
//     the row then in force gave the dummies a SIZE while table T-023d gave
//     GR-9 a DAY, and no row said which pixel of the day that box was
//     centred on. ⭐ That gap is closed, not carried: the closing rule of table
//     T-023d makes the hold 「`FR-043` が描いた印そのもの」 and FR-043 aligns the
//     ink 「日の列の左端に揃えること（MUST）」, so the edges are now stated and the
//     cases below assert them.
//   * ⛔⛔ THE 未着手 MARKER'S HALF OF THE SAME MUST. FR-013 names 「未着手の
//     マーカーと、実績入力のダミー」 together, but MEASURED, a pointer put on the
//     marker's own ring (表 T-021's PM-1a) leaves it at S-131 when no won grab
//     row is handed over -- only the dummy answers to the pointer alone. A case
//     asserting the marker's half is therefore NOT written here: it would be
//     red, and PD-360 -- 「`FR-013` の「ポインタが乗っている」が、描いた図形の上の
//     ことか、表 T-023d が点を与えた行のことか」 -- is 未裁定. ⭐ REPORTED, not
//     guessed at in either direction.
//   * ⛔⛔ WHETHER A POINTER ON GR-17'S OLD DAY COLUMN DARKENS THE ONE MARK was
//     left unasserted in both directions until 2026-09-10, because 「ポインタが
//     乗っている」 had two readings there: on the DRAWN figure (nothing was), or
//     on the ROW's own place (the hand was, since the row's hit box stood a day
//     right of the ink). ⭐ THE SPLIT IS GONE. The closing rule of table T-023d
//     puts GR-17 on the right half of the one mark and forbids reaching past it
//     -- 「印の外へ広げてはならない（MUST NOT）」 -- so that column now carries
//     neither ink nor hold under either reading, and a case below asserts that
//     the mark stays at S-131 while the pointer is there.
//   * ⛔ WHICH OF THE TWO ROWS A POINT ON THE MARK IS GRABBING is still not read
//     off the drawing. FR-043 cuts the mark in half for GR-9 and GR-17, and the
//     cases below put a point in each half, ⭐ but they assert only what FR-013
//     owes -- the mark leaves S-131 -- because the picture darkens one mark and
//     the specification gives no second 濃さ per half. PD-351 is 未裁定.

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

// ⛔⛔ `S-93` WAS READ HERE UNTIL 2026-09-10, for the dummies' own hit box. The
// ruling of that day struck the row -- 「**その `S-93` は 2026-09-10 に廃した**」
// (表 T-206 の `S-180`) -- and `rowOf` now throws for it, which is the check
// this file wants: the hold is the drawn mark, and `S-180` states it.
const S_180 = rowOf('T-206', 'S-180')
const S_90 = rowOf('T-206', 'S-90')

/** The first number of a cell, which is the one the row leads with. */
const leadingNumberOf = (cell: string | undefined, row: string): number => {
  const [first] = numbersOf(cell ?? '')
  if (first === undefined || first <= 0) throw new Error(`row ${row} states no size: ${cell}`)
  return first
}

/**
 * `S-180` -- ⛔ FR-043's UPPER BOUND on the drawn width, never the width itself.
 * ⭐ AND THE HOLD AS WELL SINCE 2026-09-10: 「**本行が描く幅であり、掴みシロでも
 * ある**」, because table T-023d's closing rule made the hit area the mark.
 */
const DUMMY_WIDTH_UPPER_BOUND = leadingNumberOf(S_180['既定'], 'S-180')
/** `S-90` -- 「予定の端点の掴み代 | バーの上下と、端点の外側に 12px」. */
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
 * ⭐ 2026-01-05 IS A MONDAY, so GR-9 (「予定の開始日の翌稼働日」) and GR-17 (a
 * further `S-129` worked days on) fall on the Tuesday and the Wednesday: the
 * default calendar's weekend (表 T-209) never comes between them, and one
 * worked day is one column of the axis.
 *
 * ⛔⛔ IT WAS 2026-02-02, FIVE WEEKS PAST `scrollDate`, UNTIL 2026-09-09. That
 * standoff cost 32 day columns before the bar began, and the wide describe
 * below had to move to 48px a day when `S-180` rose to 30 -- at which point
 * the whole figure stood off the right of the `Row Area` and nothing was
 * drawn to point at. ⭐ 2026-01-05 is the first Monday on or after `scrollDate`,
 * so it keeps the property this fixture is chosen for and stands in view at
 * every magnification the file uses.
 */
const IDLE = scheduleOf({
  tasks: [taskOf({ uid: 1, start: '2026-01-05', finish: '2026-01-25', name: 'idle' })],
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
  /** Where the day column of the ONE mark begins (FR-043's 「日の列の左端」). */
  readonly dayLeft: number
  /** The point handed to the renderer as the pointer's x. */
  readonly x: number
}

/**
 * The two halves table T-023d cuts the ONE drawn mark into, and the middle of
 * each -- which is the point this file puts under the pointer.
 *
 * ⭐ BOTH ROWS STAND ON ONE RECTANGLE SINCE 2026-09-10 (表 T-023d の結び, MUST):
 * 「**`GR-9` / `GR-17` / `GR-18` の当たり判定は、`FR-043` が描いた印そのものとする
 * こと（MUST）。印の外へ広げてはならない（MUST NOT）**」, and 「**`GR-9` と `GR-17`
 * は、その印を中央で左右に割った半分をそれぞれ受け持ち、`GR-18` は印の全体を受け
 * 持つ**」. So the grab side is still two -- FR-043 kept 「⭐ **掴む先が 2 つで
 * あることは変わらない**」 -- but the two now stand half a width apart on one
 * mark instead of a day apart on two columns.
 *
 * ⛔ NOT READ OFF THE PICTURE. Every number here comes from the specification:
 * the plan bar's left edge (GR-3), one day (FR-017's `S-1` × `zoomX`), and
 * FR-043's drawn width, cut where the closing rule cuts it.
 */
const halvesAt = (zoomX: number): readonly Probe[] => {
  const dayLeft = planStartOf(settingsAt(zoomX)) + dayWidthAt(zoomX)
  const width = drawnWidthAt(zoomX)
  return [
    { grab: 'GR-9', dayLeft, x: dayLeft + width / 4 },
    { grab: 'GR-17', dayLeft, x: dayLeft + (width * 3) / 4 },
  ]
}

/**
 * The ONE column FR-043 draws the mark on, and a point on that ink.
 *
 * ⭐ FR-043 (MUST): 「**ダミーを描く位置は、予定の開始日の翌稼働日とすること**」 and
 * 「**ダミーの印は 1 つだけ描くこと（MUST）。開始の側と終了の側に別々の印を描いては
 * ならない（MUST NOT）**」（利用者の裁定 2026-09-08）. 「予定の開始日の翌稼働日」 is
 * GR-9's own place (T-023d), so the mark stands one worked day right of the
 * plan bar's left edge, and the point taken here is the middle of its left half.
 * ⛔ This is not a choice made here: FR-043's alignment MUST 「日の列の左端に
 * 揃えること」 names one column, and the drawing-position MUST names which.
 */
const inkProbeAt = (zoomX: number): Probe => halvesAt(zoomX)[0] as Probe

/**
 * The day column GR-17 STOOD ON UNTIL 2026-09-10 -- `S-129` worked days right of
 * the mark -- which FR-043's MUST NOT keeps ink off and which the closing rule
 * of table T-023d now keeps the hold off as well: 「**印の外へ広げてはならない
 * （MUST NOT）**」.
 *
 * ⭐ SO A POINTER PUT HERE OWES ONE ANSWER UNDER EITHER READING of 「乗って
 * いる」: there is no figure to be on and no row's place to be in. ⛔⛔ It owed
 * two until that day, and this file asserted neither -- the row then in force
 * put GR-17's hit box on this column, a whole day away from the ink.
 */
const pastTheMarkAt = (zoomX: number): Probe => {
  const gone = inkProbeAt(zoomX).dayLeft + ACTUAL_INITIAL_DURATION * dayWidthAt(zoomX)
  return { grab: 'GR-17 の旧い日の列', dayLeft: gone, x: gone + drawnWidthAt(zoomX) / 2 }
}

/** Points spread across the one mark's own ink, all of them FR-043's arithmetic. */
const acrossTheInkAt = (zoomX: number): readonly number[] => {
  const { dayLeft } = inkProbeAt(zoomX)
  const width = drawnWidthAt(zoomX)
  return [dayLeft, dayLeft + width / 2, dayLeft + width]
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

/** The one faintly drawn polygon an x falls in. */
const dummyAtX = (svg: string, x: number, where: string): Ink => {
  const found = dummiesOf(svg).filter((one) => one.x0 <= x && x <= one.x1)
  expect(found.length, `exactly one ダミーの印 is drawn at ${where}`).toBe(1)
  return found[0] as Ink
}

/** The one faintly drawn polygon the point falls in, named by the row it serves. */
const dummyUnder = (svg: string, probe: Probe): Ink =>
  dummyAtX(svg, probe.x, `${probe.grab}'s point`)

/**
 * FR-043 (MUST NOT): 「**開始の側と終了の側に別々の印を描いてはならない**」.
 * ⛔ Nothing faint may stand at the second column at all.
 */
const noDummyAtX = (svg: string, x: number, where: string): void => {
  const found = dummiesOf(svg).filter((one) => one.x0 <= x && x <= one.x1)
  expect(
    found.length,
    `FR-043 (MUST NOT): a second ダミーの印 is drawn at ${where}`,
  ).toBe(0)
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
  // (`S-1` × 8 = 48px a day, against S-180's 30). The second describe runs at
  // one where the DAY is the smaller, so between them the file exercises both
  // sides of 「1 日ぶんと … `S-180` の小さい方」 -- and the point put under the
  // pointer is a different distance from the day's left edge in each.
  //
  // ⛔⛔ IT WAS 2.5 UNTIL 2026-09-09, when `S-180`'s default rose from 12 to 30
  // -- 「**既定を `S-93` と同じ大きさに揃えた**」（利用者の
  // 裁定, 表 T-206 の `S-180`）. 15px a day fell to the NARROW side of the new
  // bound, and this describe would have proved the same half of the rule as the
  // one below.
  const ZOOM = 8
  const SETTINGS = settingsAt(ZOOM)

  it('S-180 is the row that says how wide the one mark is, and how wide it is held by', () => {
    // ⚠️ A GUARD, NOT THE CLAIM. Since 2026-09-10 one row answers both: the
    // closing rule of table T-023d makes the hold 「`FR-043` が描いた印そのもの」,
    // and `S-180`'s own note says 「**本行が描く幅であり、掴みシロでもある**」.
    // ⛔⛔ IT READ `S-93` HERE UNTIL THAT DAY, when the two were different
    // things; the row was struck the same day and `rowOf` no longer finds it.
    expect(S_180['値']).toContain('GR-9')
    expect(S_180['値']).toContain('GR-17')
    expect(S_180['値']).toContain('GR-18')
    expect(S_180['値']).toContain('実績のダミーを描く幅')
    expect(DUMMY_WIDTH_UPPER_BOUND).toBeGreaterThan(0)
  })

  it('draws a scene the cases below can be read from', () => {
    // ⚠️ 04-verification section 2. FR-043 (MUST) owes 「ダミーの印は 1 つだけ」,
    // and FR-013 draws it at S-131 -- if either half were missing, every case
    // below would be asking about a picture that was not there.
    const resting = drawn(SETTINGS, null)

    expect(dummiesOf(resting), 'FR-043 (MUST): ダミーの印は 1 つだけ').toHaveLength(1)
    // ⛔ AND IT IS THE FIRST COLUMN, NOT THE SECOND. Without this the case
    // above would be equally green over a picture that drew its one mark at
    // GR-17's place, which FR-043's drawing-position MUST forbids.
    expect(dummyAtX(resting, inkProbeAt(ZOOM).x, 'GR-9 の日の列').x0).toBeCloseTo(
      inkProbeAt(ZOOM).dayLeft,
      2,
    )
    noDummyAtX(resting, pastTheMarkAt(ZOOM).x, 'GR-17 の旧い日の列')
    expect(new Set(faintnessOf(resting))).toEqual(new Set([S_131]))
  })

  it('⭐ every point this file uses is on the one mark, in the half its row owns', () => {
    // ⛔ THE CASE THAT MAKES THE OTHERS MEAN SOMETHING. FR-043 aligns the ink to
    // 「日の列の左端」 and bounds its width by 「1 日ぶんと … `S-180` の小さい方」,
    // and since 2026-09-10 that rectangle IS the hold. A point that had drifted
    // off it would make every case below a claim about something else.
    const resting = drawn(SETTINGS, null)
    // ⭐ THE GRAB SIDE FIRST, AND IT IS STILL TWO -- 表 T-023d keeps GR-9 and
    // GR-17, and its closing rule gives each of them one half of the one mark.
    // ⛔ The numbers are the specification's; the ink is compared below.
    const width = drawnWidthAt(ZOOM)
    const [left, right] = halvesAt(ZOOM) as [Probe, Probe]
    expect(left.grab, 'the left half is GR-9').toBe('GR-9')
    expect(right.grab, 'the right half is GR-17').toBe('GR-17')
    expect(left.x, 'GR-9 is left of the middle').toBeLessThan(left.dayLeft + width / 2)
    expect(right.x, 'GR-17 is right of the middle').toBeGreaterThan(right.dayLeft + width / 2)
    for (const probe of halvesAt(ZOOM)) {
      expect(probe.x, `${probe.grab} is right of the mark`).toBeGreaterThanOrEqual(probe.dayLeft)
      expect(probe.x, `${probe.grab} is inside the mark`).toBeLessThanOrEqual(
        probe.dayLeft + width,
      )
    }
    // ⭐ AND THE DRAWING SIDE, WHICH IS ONE. FR-043 (MUST): 「ダミーの印は 1 つ
    // だけ描くこと」, at 「予定の開始日の翌稼働日」, 「日の列の左端に揃え」て
    // 「ダミーを描く幅は、1 日ぶんと … `S-180` の小さい方」 wide.
    const onTheInk = inkProbeAt(ZOOM)
    const ink = dummyUnder(resting, onTheInk)
    expect(ink.x0, `${onTheInk.grab}'s ink begins at its day column's left edge`).toBeCloseTo(
      onTheInk.dayLeft,
      2,
    )
    expect(ink.x1 - ink.x0, `${onTheInk.grab}'s ink is min(1 day, S-180) wide`).toBeCloseTo(
      drawnWidthAt(ZOOM),
      2,
    )
    // ⭐ AND THIS IS THE `S-180` SIDE OF 「小さい方」 -- the day is wider here.
    expect(drawnWidthAt(ZOOM)).toBeCloseTo(DUMMY_WIDTH_UPPER_BOUND, 6)
    // ⛔ FR-043 (MUST NOT): 「開始の側と終了の側に別々の印を描いてはならない」.
    // Nothing stands on the column GR-17 used to be given -- neither ink, nor,
    // since 2026-09-10, a hold.
    noDummyAtX(resting, pastTheMarkAt(ZOOM).x, 'GR-17 の旧い日の列')
  })

  it('⭐ leaves S-131 for the dummy the pointer is on, in either half (MUST)', () => {
    // ⭐ THE CLAIM OF THE FILE, and it is unchanged by the 2026-09-10 ruling:
    // 「**未着手のマーカーと、実績入力のダミー（`FR-043`）は薄く描き、ポインタが
    // 乗っているあいだだけ濃くすること（MUST）**」. ⛔ WHAT MOVED IS WHERE 「乗って
    // いる」 IS, and both points below are now on the one mark: the half table
    // T-023d gives GR-9 and the half it gives GR-17.
    const resting = drawn(SETTINGS, null)
    const ink = dummyUnder(resting, inkProbeAt(ZOOM))

    expect(isStillFaint(resting, ink), 'faint while nothing points at it').toBe(true)
    for (const probe of halvesAt(ZOOM)) {
      expect(
        isStillFaint(drawn(SETTINGS, { x: probe.x, y: ink.y }), ink),
        `FR-013 (MUST): ポインタが乗っているあいだだけ濃くする (${probe.grab})`,
      ).toBe(false)
    }
  })

  it('⛔ and keeps S-131 while the pointer is past the mark, where no row reaches', () => {
    // ⛔⛔ THIS CASE COULD NOT BE WRITTEN UNTIL 2026-09-10. GR-17's hit box stood
    // a whole day right of the ink until then, so a pointer here was on a grab
    // row and off every figure, and the file asserted neither direction. ⭐ The
    // closing rule of table T-023d ended the split: 「**印の外へ広げてはならない
    // （MUST NOT）**」, so nothing is held here and the mark stays faint.
    const resting = drawn(SETTINGS, null)
    const ink = dummyUnder(resting, inkProbeAt(ZOOM))
    const past = pastTheMarkAt(ZOOM)

    expect(past.x, 'the point really is past the mark').toBeGreaterThan(ink.x1)
    expect(
      isStillFaint(drawn(SETTINGS, { x: past.x, y: ink.y }), ink),
      `the one mark keeps S-131 at ${past.grab}`,
    ).toBe(true)
  })

  it('⛔ does not darken the whole picture: the 未着手 marker keeps S-131', () => {
    // FR-013 names TWO things -- 「未着手のマーカーと、実績入力のダミー」 -- and
    // gives each the same condition. So a pointer on a 掴みシロ may not carry the
    // marker with it: the marker is elsewhere, and 「乗っている」 is a place.
    //
    // ⚠️ WHAT IS *NOT* CLAIMED HERE, because no row settles it: how dark 濃く
    // is, and which of the two halves a point on the mark is grabbing. The
    // marker's own half of FR-013's MUST is left out for the reason the header
    // gives -- measured, it does not answer to the pointer alone.
    const resting = drawn(SETTINGS, null)
    const probe = inkProbeAt(ZOOM)
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
    const probe = inkProbeAt(ZOOM)
    const ink = dummyUnder(resting, probe)

    // A point well clear of the task, still inside the drawing.
    const away = drawn(SETTINGS, { x: probe.x, y: ink.y + 200 })

    expect(isStillFaint(away, ink)).toBe(true)
    expect(new Set(faintnessOf(away))).toEqual(new Set([S_131]))
  })

  it('⭐ the one mark answers from anywhere on its own ink, one case walking it', () => {
    // ⛔ THIS CASE USED TO WALK TWO MARKS. FR-043 (MUST NOT, 利用者の裁定
    // 2026-09-08) 「開始の側と終了の側に別々の印を描いてはならない」 left one, so
    // what it walks now is the ONE mark's own extent -- both edges of the ink
    // and its middle. ⭐ THE WALK IS STILL WORTH WALKING: FR-013's condition is
    // 「ポインタが乗っている」 and 表 T-051 の `HF-6` makes that a PLACE, so a
    // drawing that darkened only at the figure's centre would meet it nowhere
    // else on the mark it is drawn as.
    // ⚠️ THE THREE POINTS ARE FR-043'S OWN ARITHMETIC, not read off the ink:
    // the day column's left edge and 「ダミーを描く幅は、1 日ぶんと … `S-180` の
    // 小さい方」.
    const resting = drawn(SETTINGS, null)
    const ink = dummyUnder(resting, inkProbeAt(ZOOM))

    for (const x of acrossTheInkAt(ZOOM)) {
      expect(dummyAtX(resting, x, `${x} on the ink`).points, 'the same one mark').toBe(ink.points)
      expect(
        isStillFaint(drawn(SETTINGS, { x, y: ink.y }), ink),
        `the one mark at ${x},${ink.y}`,
      ).toBe(false)
    }
  })
})

describe('FR-013 (MUST) -- the place decides, not the grab priority', () => {
  // ⭐ THE ZOOM THAT USED TO BREAK IT. S-90 gives the plan endpoints a grab slop
  // (read from the row, never typed here), so once one day is narrow enough the
  // whole mark stands INSIDE the slop of GR-3 / GR-4. A drawing that asked which
  // grab row had won would find the plan endpoint there and leave the dummy
  // faint -- at exactly the magnifications a whole document is read at.
  // ⚠️ FR-018's S-86 still has to admit the task, so the zoom is chosen to keep
  // the shape wide enough to be drawn at all.
  const ZOOM = 0.25
  const LOW = settingsAt(ZOOM)

  it('draws the task at this zoom, or the case below would be asking about nothing', () => {
    const resting = drawn(LOW, null)
    // FR-043 (MUST): 「ダミーの印は 1 つだけ描くこと」, ⛔ (MUST NOT): 「開始の側と
    // 終了の側に別々の印を描いてはならない」（利用者の裁定 2026-09-08）. ⚠️ THE
    // COUNT MATTERS MOST AT THIS ZOOM: a day is 1.5px here, so two marks a day
    // apart would stand edge to edge and read as one wider mark.
    expect(dummiesOf(resting), 'FR-043 (MUST): ダミーの印は 1 つだけ').toHaveLength(1)
    noDummyAtX(resting, pastTheMarkAt(ZOOM).x, 'GR-17 の旧い日の列')
  })

  it('⭐ still leaves S-131 for the dummy under the pointer, with no won grab row handed over', () => {
    const resting = drawn(LOW, null)

    // ⭐ WALKED ACROSS THE ONE MARK, for the reason the same walk is written at
    // the higher zoom: HF-6's condition is a PLACE, so every point of the ink
    // owes the same answer -- and here every one of them is also inside S-90's
    // slop, which the case below measures.
    const ink = dummyUnder(resting, inkProbeAt(ZOOM))
    for (const x of acrossTheInkAt(ZOOM)) {
      expect(
        isStillFaint(drawn(LOW, { x, y: ink.y }), ink),
        `the one mark at ${x},${ink.y} at a low zoom`,
      ).toBe(false)
    }
  })

  it('⛔ and the one mark really does stand inside the plan endpoints\' slop at this zoom', () => {
    // ⚠️ Without this the case above would be green at any zoom at all, and the
    // condition it means to reproduce would never have been built. ⭐ S-90 is
    // read from the manuscript, not typed: 「端点の外側に 12px」.
    // ⛔ IT WALKED TWO DAY COLUMNS UNTIL 2026-09-10, because the two rows had a
    // hit box each; now both halves lie on one mark, so what is measured is the
    // distance from a plan endpoint to each of those two points.
    const left = planStartOf(LOW)
    const right = left + ((): number => {
      const placed = layoutFromSchedule(IDLE, LOW, regionsFromScreen(ENV, LOW)).placements[0]
      if (placed === undefined) throw new Error('the task is not drawn')
      return placed.width
    })()
    for (const probe of halvesAt(ZOOM)) {
      const toStart = Math.abs(probe.x - left)
      const toFinish = Math.abs(probe.x - right)
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
    const probe = inkProbeAt(ZOOM)
    const ink = dummyUnder(resting, probe)
    expect(ink.x1 - ink.x0, `${probe.grab}'s ink`).toBeCloseTo(dayWidthAt(ZOOM), 2)
    expect(ink.x0, `${probe.grab}'s ink begins at its day column's left edge`).toBeCloseTo(
      probe.dayLeft,
      2,
    )
  })
})
