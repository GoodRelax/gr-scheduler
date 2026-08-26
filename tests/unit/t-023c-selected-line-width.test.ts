// SL-8 of table T-023c, read as a SPLIT: three kinds wear an outline and
// three kinds are drawn THICKER. The thickened half is what this file is
// about -- the dependency line, the status-date line, and (through DC-8 of
// table T-029a) the following side of the `Dual Cursor`.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md, section 1). What was read under `src/`: the head
// comment of `svg-renderer.ts`, the signature of `svgFromSchedule`, the
// exported types `SchedulePicture` / `DualCursorFollow` / `ScheduleGeometry`,
// and the `ItemRef` union -- the shape of the arguments, never the body that
// answers them. Every expected number below is read out of the manuscript at
// run time through `tests/contract/spec-table.ts`.
//
// ⚠️ This file carries Japanese in the quoted rows only. 03-implementation.md
// section 5 admits that: a row is quoted so a failing case names the sentence
// it rests on, and a translation would make a second copy that can rot.
//
// THE ROWS THIS FILE RESTS ON
//
//   T-023c SL-1  「対象 | **タスク・依存線・ハイライトボックス・コメント
//            ボックス・基準日線。**行（`TaskGroup`）は対象に含めない。」
//   T-023c SL-8  「**手掛かりは対象の種類で 2 つに分けること（MUST）。**
//            **タスク・ハイライトボックス・コメントボックスは、外接矩形に
//            沿った破線の枠で囲むこと（MUST）** …⛔ **対象自身の輪郭をなぞって
//            はならない（MUST NOT）** …**依存線と基準日線は、その線自身の太さ
//            に 表 T-206 の `S-178` を掛けて太く描くこと（MUST）。この 2 種を
//            枠で囲んではならない（MUST NOT）** —— **依存線は形状が複雑なので、
//            外接矩形は経路と似ても似つかず、どの線を選んだのか読めなくなる。**
//            ⚠️ **基準日線の外接矩形は `Row Area` の高さいっぱいの細長い枠に
//            なり、背後のタスクやマイルストーンを縦に貫いて隠す（利用者の裁定、
//            2026-08-25）。****どちらも倍率に追随させてはならない（MUST NOT）**」
//   T-029a DC-8  「**追従している側を、表 T-023c の `SL-8` が線に定める規則と
//            同じやり方で示すこと（MUST）** —— 同行の理由もそのまま当てはまる。
//            ⚠️ **`DC-2` は押すたびに追従する側が入れ替わると定めるので、この印
//            もそのたび入れ替わる**。⚠️ **この印を書き出しに出してはならない
//            （MUST NOT）** …⭐ **`EP-6` が描くのは 2 本の線そのものである**」
//   T-029a DC-2  「**追従している側をクリックするとその位置で固定し、もう一方が
//            追従に切り替わること（MUST）。**」
//   T-029  CU-1 / CU-2   the status-date line, and the two measuring lines
//   T-076  EP-6  「`Status Line` と `Dual Cursor` を描く」
//   T-076  EP-12 「操作の状態 —— `Pointer` ／ `ArmedShape` ／ `Selection` ／
//            `Marquee` ／ `Grab Region`・`Grab Point` | 描かない」
//   T-206  S-174 / S-175   the outline half: the frame's stroke and its dash
//   T-206  S-178 「選択された線の太さの倍率」、⭐「絶対値ではなく、その線自身
//            の太さに掛ける倍率である」
//   T-206  S-194 「2 連カーソルの線の太さ（表 T-029 の `CU-2`）」、⭐「`S-178`
//            を掛ける前の、その線自身の太さである」
//   T-201  S-18  `dependencyWidth`, the dependency line's own width -- named as
//            such by S-178's own note:「依存線は `S-18` を持つ」
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * ⛔ THE STATUS-DATE LINE HAS NO WIDTH ROW. S-178's note says so outright:
//     「基準日線と 2 連カーソルは太さの行そのものを持たない」, and S-194 has
//     since filled the `Dual Cursor` half of that sentence and NOT the status
//     line's. So no case below states what CU-1's line measures unselected;
//     they state only the RELATION SL-8 gives, which is 「その線自身の太さに
//     `S-178` を掛けて」 whatever that own width turns out to be.
//   * ⛔ WHERE THE `Dual Cursor` IS PAINTED IN THE STACKING ORDER. Table T-020
//     holds no row for either cursor, so nothing here asserts a paint order.
//   * ⛔ THE COLOUR OF THE THICKENED LINES. SL-8 gives a colour to the FRAME
//     only (S-151); the two thickened kinds are told to change width and
//     nothing else, and S-195's note confirms it in as many words 「どちらが
//     追従中かは色で示さない」. No case below asserts a colour.

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  svgFromSchedule,
  type DualCursorFollow,
  type SchedulePicture,
} from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// The rows, read out of the manuscript at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

/** The single number a cell writes, or a failure naming the cell. */
const oneNumberOf = (where: string, cell: string | undefined): number => {
  const found = (cell ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  const [only, ...rest] = found.map(Number)
  if (only === undefined || rest.length !== 0) {
    throw new Error(`${where}: the value is not one number, it is ${cell}`)
  }
  return only
}

/** `S-178`, 「選択された線の太さの倍率」. */
const LINE_MULTIPLIER = oneNumberOf('table T-206 row S-178', rowOf('T-206', 'S-178')['既定'])

/** `S-194`, the `Dual Cursor` line's own width, before `S-178` is applied. */
const CURSOR_WIDTH = oneNumberOf('table T-206 row S-194', rowOf('T-206', 'S-194')['既定'])

/** `S-174`, the OUTLINE half's thickness -- used here only to find a frame. */
const FRAME_STROKE = oneNumberOf('table T-206 row S-174', rowOf('T-206', 'S-174')['既定'])

/** `S-18` `dependencyWidth`, the dependency line's own width. */
const DEPENDENCY_WIDTH = oneNumberOf('table T-201 row S-18', rowOf('T-201', 'S-18')['既定値'])

/**
 * 表 T-023c の `SL-8` — the split, copied fixed (Chapter 1.9, :275). ⭐ The
 * `Dual Cursor`'s following side is not a row of table T-023c: `DC-8` of table
 * T-029a puts it in the thickened half by reference, and it is listed here so
 * the two halves can be counted in one place.
 */
const T_023c_SL8 = [
  { kind: 'タスク', sign: 'frame' },
  { kind: 'ハイライトボックス', sign: 'frame' },
  { kind: 'コメントボックス', sign: 'frame' },
  { kind: '依存線', sign: 'width' },
  { kind: '基準日線', sign: 'width' },
  { kind: '2 連カーソルの追従している側', sign: 'width' },
] as const

// ---------------------------------------------------------------------------
// Inputs. A whole DocumentSettings is 100+ keys, so a case pins the ones it
// means and everything else comes from SETTINGS_DEFAULTS, which is generated
// from the manuscript.
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * ⚠️ The nested keys have to be spelled out: SETTINGS_DEFAULTS carries the five
 * shape ratios (S-13 〜 S-17) and the font steps (S-121 〜 S-123) under their
 * dotted keys, and the layout reads the nested object.
 */
const SETTINGS = settingsOf({
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
  scrollDate: '2026-01-01', // S-77
  stackDirection: 'down', // S-58 -- pinned so every y reads from the top
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
  planActualGuidePattern: { on: 2, off: 2 }, // S-104
  fontScaleSizes: { S: 12, M: 14, L: 16 }, // S-121 〜 S-123
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

/** A Task starting on `from` and running `days`. */
const spanning = (
  uid: number,
  from: string,
  days: number,
  part: Record<string, unknown> = {},
): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

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

/**
 * ⛔ NO ACTUALS AND NO STATUS DATE unless a case asks for one. FR-014's
 * イナズマ線 is a polyline too, and the dependency cases below find the
 * dependency by its tag -- a scene that carried both would be finding whichever
 * came first in the paint order rather than the line SL-8 speaks of.
 */
const ALPHA = spanning(1, '2026-01-01', 10, { name: 'alpha' })
const BETA = spanning(2, '2026-01-20', 10, {
  name: 'beta',
  dependencies: [{ predecessorUid: 1, type: 1, lag: 0 }],
})

/** One root row holding both Tasks, both annotations, and no 基準日. */
const sceneOf = (part: Record<string, unknown> = {}): Schedule =>
  scheduleOf({
    tasks: [ALPHA, BETA],
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null, color: null }],
    taskGroupMembers: [
      { groupId: 'g1', taskUid: 1 },
      { groupId: 'g1', taskUid: 2 },
    ],
    highlightBoxes: [HIGHLIGHT],
    commentBoxes: [COMMENT],
    ...part,
  })

/** The same scene with CU-1's line standing in it. */
const withStatusDate = (): Schedule =>
  sceneOf({ project: { calendarUid: null, statusDate: '2026-01-15', themeHue: 214, title: null } })

interface Drawn {
  readonly svg: string
  readonly geometry: ScheduleGeometry
}

// ⚠️ Every field is spelled `| undefined` as well as optional: the project
// compiles with `exactOptionalPropertyTypes`, so passing a value that may be
// `undefined` through into another `How` is a type error without it.
interface How {
  readonly settings?: DocumentSettings | undefined
  readonly selection?: Selection | undefined
  readonly picture?: SchedulePicture | undefined
  readonly follow?: DualCursorFollow | null | undefined
}

/**
 * ADR-001 has the shell compute the rectangles, the layout and the geometry
 * once a frame and hand them round, so a case builds them the same way rather
 * than inventing vertices the unit would then be measured against.
 *
 * ⛔ ONE selection, handed to BOTH the geometry and the renderer -- a case that
 * told the two different things would describe a frame the shell never builds.
 */
const drawn = (schedule: Schedule, how: How = {}): Drawn => {
  const settings = how.settings ?? SETTINGS
  const selection = how.selection ?? emptySelection()
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  const svg = svgFromSchedule(
    schedule,
    settings,
    layout,
    geometry,
    regions,
    selection,
    how.picture ?? 'screen',
    how.follow ?? null,
  )
  return { svg, geometry }
}

const pick = (ref: ItemRef): Selection => selectionWith(emptySelection(), ref)

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

/** The elements that carry paint, in the order they are painted. */
const paintedOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter((e) => e.tag !== 'svg')

/**
 * One element, with anything a SECOND drawing of the same picture may spell
 * differently taken out.
 *
 * ⚠️ The marker on the arrow end of a 依存線 has to carry an `id`, and an SVG
 * put on a page beside another one cannot share it -- so the id differs between
 * two drawings of the SAME picture. ⛔ It is the only thing normalised.
 */
const settledText = (element: Element): string =>
  element.text.replace(/(id="|url\(#)[^"')]*/g, '$1')

const strokeWidthOf = (element: Element): number => {
  const stated = attribute(element.text, 'stroke-width')
  if (stated === null) throw new Error(`this element states no stroke-width: ${element.text}`)
  return Number(stated)
}

/** A frame is a `rect` carrying the dash 表 T-206 gives the outline half. */
const framesIn = (elements: readonly Element[]): readonly Element[] =>
  elements.filter((e) => e.tag === 'rect' && attribute(e.text, 'stroke-dasharray') !== null)

/** The elements one picture has that the other does not. */
const onlyIn = (picture: string, other: string): readonly Element[] => {
  const there = paintedOf(other).map(settledText)
  return paintedOf(picture).filter((e) => !there.includes(settledText(e)))
}

/** The one polyline a scene with no 基準日 draws: the 依存線. */
const dependencyIn = (svg: string): Element => {
  const found = paintedOf(svg).filter((e) => e.tag === 'polyline')
  if (found.length !== 1) {
    throw new Error(`the scene should draw exactly one polyline, it drew ${found.length}`)
  }
  return found[0] as Element
}

/**
 * CU-1's line, found where the geometry places it.
 *
 * ⚠️ THE x ALONE IS NOT ENOUGH. A tick of the time ruler is a vertical `line`
 * too and stands on a day boundary, which is exactly where the 基準日線 stands;
 * the run 「`Row Area` の高さいっぱい」 is what separates them, so all four
 * coordinates are matched.
 */
const statusLineIn = (picture: Drawn): Element => {
  const placed = picture.geometry.statusLine
  if (placed === null) throw new Error('this scene places no status line')
  const near = (element: Element, name: string, value: number): boolean =>
    Math.abs(Number(attribute(element.text, name)) - value) < 0.01
  const at = paintedOf(picture.svg).filter(
    (e) =>
      e.tag === 'line' &&
      near(e, 'x1', placed.x) &&
      near(e, 'x2', placed.x) &&
      near(e, 'y1', placed.top) &&
      near(e, 'y2', placed.bottom),
  )
  if (at.length !== 1) {
    throw new Error(`expected one line at x=${placed.x} running the Row Area, found ${at.length}`)
  }
  return at[0] as Element
}

// ---------------------------------------------------------------------------
// SL-8 -- the split itself
// ---------------------------------------------------------------------------

describe('T-023c SL-8 -- 手掛かりは対象の種類で 2 つに分ける', () => {
  it('names three kinds for the outline and three for the width', () => {
    // The fixed copy is asserted against itself so that a hand edit of the
    // split above shows up as a failure here rather than silently changing
    // what every case below is driven by.
    const framed = T_023c_SL8.filter((one) => one.sign === 'frame')
    const widened = T_023c_SL8.filter((one) => one.sign === 'width')
    expect(framed.map((one) => one.kind)).toEqual([
      'タスク',
      'ハイライトボックス',
      'コメントボックス',
    ])
    expect(widened.map((one) => one.kind)).toEqual([
      '依存線',
      '基準日線',
      '2 連カーソルの追従している側',
    ])
  })

  // -- the half that keeps an OUTLINE ---------------------------------------

  const FRAMED: readonly { readonly kind: string; readonly ref: ItemRef }[] = [
    { kind: 'タスク', ref: { kind: 'task', uid: 2 } },
    { kind: 'ハイライトボックス', ref: { kind: 'highlightBox', id: HIGHLIGHT.id } },
    { kind: 'コメントボックス', ref: { kind: 'commentBox', id: COMMENT.id } },
  ]

  for (const one of FRAMED) {
    it(`⛔ changes no drawn width when ${one.kind} is selected (SL-8)`, () => {
      // 「タスク・ハイライトボックス・コメントボックスは、外接矩形に沿った破線
      // の枠で囲むこと（MUST）」and ⛔「対象自身の輪郭をなぞってはならない
      // （MUST NOT）」-- the sign is a SEPARATE rectangle, so every element the
      // picture already held is still spelled exactly as it was, stroke-width
      // and all. `S-178` reaches none of these three.
      const plain = drawn(sceneOf()).svg
      const picked = drawn(sceneOf(), { selection: pick(one.ref) }).svg

      expect(onlyIn(plain, picked), '元からある要素は 1 つも描き替えられない').toEqual([])
    })

    it(`gives ${one.kind} a dashed frame at S-174 instead (SL-8, MUST)`, () => {
      const plain = drawn(sceneOf()).svg
      const picked = drawn(sceneOf(), { selection: pick(one.ref) }).svg
      const frames = framesIn(onlyIn(picked, plain))

      expect(frames.length, '外接矩形に沿った破線の枠が 1 つ').toBe(1)
      expect(strokeWidthOf(frames[0] as Element), 'S-174 -- 枠の太さ').toBe(FRAME_STROKE)
    })
  }
})

// ---------------------------------------------------------------------------
// SL-8 -- 依存線: its own width times S-178
// ---------------------------------------------------------------------------

describe('T-023c SL-8 -- 依存線は太さで示す', () => {
  it('draws it at its own width, S-18, while nothing is selected', () => {
    // S-178's note names the row: ⭐「依存線は `S-18` を持つ」. So the width the
    // multiplier is applied TO is `dependencyWidth`, and unselected the line is
    // that width and no other.
    const line = dependencyIn(drawn(sceneOf()).svg)
    expect(strokeWidthOf(line)).toBeCloseTo(DEPENDENCY_WIDTH, 6)
  })

  it('multiplies THAT width by S-178 when it is selected (SL-8, MUST)', () => {
    // 「依存線と基準日線は、その線自身の太さに 表 T-206 の `S-178` を掛けて太く
    // 描くこと（MUST）」
    const picked = drawn(sceneOf(), {
      selection: pick({ kind: 'dependency', successorUid: 2, ordinal: 0 }),
    }).svg
    expect(strokeWidthOf(dependencyIn(picked))).toBeCloseTo(
      DEPENDENCY_WIDTH * LINE_MULTIPLIER,
      6,
    )
  })

  it('carries S-18 through from the document, not from a copy of the default', () => {
    // 04-verification.md section 2: a value that reaches the code is proved by
    // changing it. ⭐ `S-178` is 「絶対値ではなく、その線自身の太さに掛ける倍率」,
    // so moving the line's own width has to move both readings together.
    const thick = settingsOf({ ...SETTINGS, dependencyWidth: DEPENDENCY_WIDTH * 2 })
    const plain = dependencyIn(drawn(sceneOf(), { settings: thick }).svg)
    const picked = dependencyIn(
      drawn(sceneOf(), {
        settings: thick,
        selection: pick({ kind: 'dependency', successorUid: 2, ordinal: 0 }),
      }).svg,
    )

    expect(strokeWidthOf(plain)).toBeCloseTo(DEPENDENCY_WIDTH * 2, 6)
    expect(strokeWidthOf(picked)).toBeCloseTo(DEPENDENCY_WIDTH * 2 * LINE_MULTIPLIER, 6)
  })

  it('⛔ puts no frame round it (SL-8, MUST NOT)', () => {
    // 「この 2 種を枠で囲んではならない（MUST NOT）」
    const plain = drawn(sceneOf()).svg
    const picked = drawn(sceneOf(), {
      selection: pick({ kind: 'dependency', successorUid: 2, ordinal: 0 }),
    }).svg
    expect(framesIn(onlyIn(picked, plain))).toEqual([])
  })

  it('⛔ does not follow the zoom (SL-8, MUST NOT)', () => {
    // 「どちらも倍率に追随させてはならない（MUST NOT）」-- the sign is for the
    // reader's eye, and the eye does not zoom with the schedule.
    const zoomed = settingsOf({ ...SETTINGS, zoomX: 4, zoomY: 4 })
    const ref: ItemRef = { kind: 'dependency', successorUid: 2, ordinal: 0 }
    const ratio = (settings: DocumentSettings): number =>
      strokeWidthOf(dependencyIn(drawn(sceneOf(), { settings, selection: pick(ref) }).svg)) /
      strokeWidthOf(dependencyIn(drawn(sceneOf(), { settings }).svg))

    expect(ratio(zoomed)).toBeCloseTo(LINE_MULTIPLIER, 6)
    expect(ratio(zoomed)).toBeCloseTo(ratio(SETTINGS), 6)
  })
})

// ---------------------------------------------------------------------------
// SL-8 -- 基準日線: the same rule, over a width no row states
// ---------------------------------------------------------------------------

describe('T-023c SL-8 -- 基準日線は太さで示す', () => {
  it('multiplies its own width by S-178 when it is selected (SL-8, MUST)', () => {
    // ⛔ THE ABSOLUTE WIDTH IS NOT ASSERTED. S-178's note says 「基準日線と 2 連
    // カーソルは太さの行そのものを持たない」 and `S-194` has since filled only
    // the cursor's half, so the manuscript states no own width for CU-1's line.
    // What SL-8 does state is the RELATION, and that is what is asked for here.
    const plain = drawn(withStatusDate())
    const picked = drawn(withStatusDate(), { selection: pick({ kind: 'statusLine' }) })

    const own = strokeWidthOf(statusLineIn(plain))
    expect(own, 'その線は自分の太さを持つ').toBeGreaterThan(0)
    expect(strokeWidthOf(statusLineIn(picked))).toBeCloseTo(own * LINE_MULTIPLIER, 6)
  })

  it('⛔ puts no frame round it (SL-8, MUST NOT)', () => {
    // 「基準日線の外接矩形は `Row Area` の高さいっぱいの細長い枠になり、背後の
    // タスクやマイルストーンを縦に貫いて隠す（利用者の裁定、2026-08-25）」
    const plain = drawn(withStatusDate()).svg
    const picked = drawn(withStatusDate(), { selection: pick({ kind: 'statusLine' }) }).svg
    expect(framesIn(onlyIn(picked, plain))).toEqual([])
  })

  it('⛔ does not follow the zoom (SL-8, MUST NOT)', () => {
    const zoomed = settingsOf({ ...SETTINGS, zoomX: 4, zoomY: 4 })
    const ratio = (settings: DocumentSettings): number =>
      strokeWidthOf(
        statusLineIn(
          drawn(withStatusDate(), { settings, selection: pick({ kind: 'statusLine' }) }),
        ),
      ) / strokeWidthOf(statusLineIn(drawn(withStatusDate(), { settings })))

    expect(ratio(zoomed)).toBeCloseTo(LINE_MULTIPLIER, 6)
    expect(ratio(zoomed)).toBeCloseTo(ratio(SETTINGS), 6)
  })
})

// ---------------------------------------------------------------------------
// T-029a DC-8 -- the following side of the `Dual Cursor`
// ---------------------------------------------------------------------------

describe('T-029a DC-8 -- 追従している側を SL-8 と同じやり方で示す', () => {
  /** S-65 `dualCursor`, 「2 本の日付を持つ」(CU-2). Both stand in view. */
  const CURSOR_DATES = { date1: '2026-01-05', date2: '2026-02-05' }
  const WITH_CURSOR = settingsOf({ ...SETTINGS, dualCursor: CURSOR_DATES })
  const WITHOUT_CURSOR = settingsOf({ ...SETTINGS, dualCursor: null })

  /**
   * The two lines S-65 adds to the picture. ⭐ Found as the DIFFERENCE against
   * the same scene with `dualCursor` at `null`, so no case here has to know how
   * the unit spells them.
   */
  const cursorLinesOf = (how: How = {}): readonly Element[] => {
    const withOne = drawn(sceneOf(), { ...how, settings: how.settings ?? WITH_CURSOR }).svg
    const without = drawn(sceneOf(), { settings: WITHOUT_CURSOR, picture: how.picture }).svg
    const added = onlyIn(withOne, without).filter((e) => e.tag === 'line')
    if (added.length !== 2) {
      throw new Error(`EP-6 draws two cursor lines; this picture added ${added.length}`)
    }
    return added
  }

  /** Which of the two stored days a drawn line stands nearest to. */
  const sideOf = (element: Element, at: { date1X: number; date2X: number }): 'date1' | 'date2' => {
    const x = Number(attribute(element.text, 'x1'))
    return Math.abs(x - at.date1X) <= Math.abs(x - at.date2X) ? 'date1' : 'date2'
  }

  const placedAt = (): { date1X: number; date2X: number } => {
    const placed = drawn(sceneOf(), { settings: WITH_CURSOR }).geometry.dualCursor
    if (placed === null) throw new Error('S-65 holds two dates, so CU-2 should be placed')
    return { date1X: placed.date1X, date2X: placed.date2X }
  }

  it('draws both lines at S-194 while neither side is following', () => {
    // ⭐ S-194: 「`S-178` を掛ける前の、その線自身の太さである」. With no side
    // following there is no mark, so both lines stand at their own width.
    const widths = cursorLinesOf().map(strokeWidthOf)
    expect(widths).toEqual([CURSOR_WIDTH, CURSOR_WIDTH])
  })

  for (const side of ['date1', 'date2'] as const) {
    it(`marks ${side} with S-194 x S-178 while it follows (DC-8, MUST)`, () => {
      // 「追従している側を、表 T-023c の `SL-8` が線に定める規則と同じやり方で
      // 示すこと（MUST）」and DC-2 swaps which side that is on every press, so
      // both sides are asked the same question.
      const at = placedAt()
      const follow: DualCursorFollow = { side, x: side === 'date1' ? at.date1X : at.date2X }
      const lines = cursorLinesOf({ follow })

      const following = lines.filter((e) => sideOf(e, at) === side)
      const standing = lines.filter((e) => sideOf(e, at) !== side)
      expect(following.length, '追従している側は 1 本').toBe(1)
      expect(standing.length, 'もう一方も 1 本').toBe(1)
      expect(strokeWidthOf(following[0] as Element), 'S-194 x S-178').toBeCloseTo(
        CURSOR_WIDTH * LINE_MULTIPLIER,
        6,
      )
      expect(strokeWidthOf(standing[0] as Element), 'S-194 のまま').toBeCloseTo(CURSOR_WIDTH, 6)
    })
  }

  it('shows the mark even with the pointer outside the window (DC-8, MUST)', () => {
    // ⛔ DC-8's MUST is not conditional on a pointer position, and DC-7 (MUST
    // NOT) keeps a placed pair standing while the mode is left -- so a hand
    // leaving the window may not take the mark with it.
    const widths = cursorLinesOf({ follow: { side: 'date1', x: null } })
      .map(strokeWidthOf)
      .sort((a, b) => a - b)
    expect(widths).toEqual([CURSOR_WIDTH, CURSOR_WIDTH * LINE_MULTIPLIER])
  })

  it('⛔ puts no frame round either line (SL-8, MUST NOT)', () => {
    // DC-8 borrows the rule SL-8 gives A LINE, and that rule forbids the frame
    // in the same breath as it asks for the width.
    const at = placedAt()
    const withMark = drawn(sceneOf(), {
      settings: WITH_CURSOR,
      follow: { side: 'date1', x: at.date1X },
    }).svg
    const without = drawn(sceneOf(), { settings: WITH_CURSOR }).svg
    expect(framesIn(onlyIn(withMark, without))).toEqual([])
  })

  it('⛔ keeps the mark out of the exported picture (DC-8, MUST NOT)', () => {
    // 「この印を書き出しに出してはならない（MUST NOT）—— 表 T-076 の `EP-12` が
    // 操作の状態を描かないと定めており、どちらが追従中かは操作の状態である。
    // ⭐ `EP-6` が描くのは 2 本の線そのものである」-- so the export draws the
    // two lines and NEITHER is thickened, whatever the session is doing.
    const at = placedAt()
    const widths = cursorLinesOf({
      picture: 'export',
      follow: { side: 'date1', x: at.date1X },
    }).map(strokeWidthOf)
    expect(widths).toEqual([CURSOR_WIDTH, CURSOR_WIDTH])
  })
})

// ---------------------------------------------------------------------------
// T-076 EP-12 -- the exported picture carries no `Selection`
// ---------------------------------------------------------------------------

describe('T-076 EP-12 -- 書き出しに選択の印を出さない', () => {
  it('⛔ leaves a selected 依存線 at its own width in the export', () => {
    // EP-12: 「操作の状態 —— … `Selection`（`U-39`）… | 描かない」. The unit is
    // TOLD which of table T-076's two pictures this frame is, so a picture that
    // says it is the export may not carry the thicker line SL-8 asks of the
    // screen.
    const picked = drawn(sceneOf(), {
      picture: 'export',
      selection: pick({ kind: 'dependency', successorUid: 2, ordinal: 0 }),
    }).svg
    expect(strokeWidthOf(dependencyIn(picked))).toBeCloseTo(DEPENDENCY_WIDTH, 6)
  })
})
