// EP-12 of table T-076 (MUST NOT, by way of the 描くか column): the picture
// that is written out carries none of the marks the SELECTION puts on the
// screen.
//
// Unit under test: `svgFromSchedule` of `svg-renderer.ts`, which is TOLD which
// of table T-076's two pictures the frame is -- 'screen' or 'export'.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md, section 1). ⛔ NO FILE UNDER src/ WAS READ. The fixture,
// the SVG reading helpers and the call shape are copied from
// tests/unit/t-023c-selected-line-width.test.ts, which is a test.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   T-076 EP-12 「操作の状態 —— `Pointer`（`U-42`）／ `ArmedShape`（`U-38`）／
//            `Selection`（`U-39`）／ `Marquee`（`U-40`）／ `Grab Region` ・
//            `Grab Point`（`U-43`） | 描かない | 指している場所と構えを表すもの
//            であり、日程ではない」
//   T-023c SL-8 「タスク・ハイライトボックス・コメントボックスは、外接矩形に
//            沿った破線の枠で囲むこと（MUST）」 -- the mark EP-12 keeps out of
//            the export for the three framed kinds.
//   FR-016   「作成者がその日数を、表 T-023d の `GR-1` / `GR-2` の掴み点で編集
//            できるようにすること。**掴み点は選択しているタスクにだけ出すこと
//            （MUST）**」 -- so a selected task carrying fades is what puts a
//            `Grab Point` in the picture at all, and EP-12 is what keeps it out
//            of the export.
//   T-206 S-174 / S-175   the frame's stroke width and its dash.
//
// ---------------------------------------------------------------------------
// ⭐ WHY THE CENTRAL CASE IS AN EQUALITY BETWEEN TWO EXPORTS
// ---------------------------------------------------------------------------
//
// EP-12 does not say "draw the selection more quietly"; it says 描かない. A
// picture that does not draw the `Selection` cannot vary with it, so the export
// of a scene with something selected must be the export of the same scene with
// nothing selected -- character for character. That one case covers every shape
// the selection can add, INCLUDING ones no reader has thought to name: the
// dashed frame of SL-8, the fade grab points of FR-016, and whatever a later
// row adds. Ledger row D-52 records the cost of naming them one at a time --
// the two thicknesses were closed and four more shapes were still leaking.
//
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, and why:
//
//   - WHAT A GRAB POINT IS DRAWN AS. Table T-210 holds its dimensions and
//     FR-016 says it is 出す, but no row of docs/spec fixes the SVG element or
//     an attribute by which a reader could name one in the output. ⛔ Missing:
//     any statement of the mark's shape. The cases below therefore find the
//     grab points as 「what the screen draws that the export does not」 and
//     never as a tag.
//   - THE THICKNESSES. SL-8's width half is already asserted, in the file this
//     fixture is copied from; nothing here repeats it.
//   - THE FOUR OTHER kinds EP-12 names (`Pointer`, `ArmedShape`, `Marquee`,
//     `Grab Region`). ⛔ None of them is reachable through this unit's
//     arguments -- it is handed a `Selection` and a `DualCursorFollow` and
//     nothing else -- so no case below claims anything about them.

import { describe, expect, it } from 'vitest'

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
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  svgFromSchedule,
  type SchedulePicture,
} from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
  scrollDate: '2026-01-01', // S-77
  stackDirection: 'down', // S-58
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
  planActualGuidePattern: { on: 2, off: 2 }, // S-104
  fontScaleSizes: { S: 12, M: 14, L: 16 }, // S-121 .. S-123
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

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

/**
 * ⭐ A RECTANGLE CARRYING BOTH FADES. FD-5 of table T-012a gives the fade to
 * `SH-1` and `SH-2` only, and FR-016 shows the grab points 「選択しているタスク
 * にだけ」 -- so this one task is what makes both marks EP-12 names reachable at
 * once: the dashed frame of SL-8 and the two fade grab points.
 */
const THE_TASK = taskOf({
  uid: 1,
  name: 'alpha',
  start: '2026-01-05',
  finish: '2026-01-25',
  fadeInDays: 3,
  fadeOutDays: 3,
})

const SCENE: Schedule = scheduleOf({
  tasks: [THE_TASK],
  taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null, color: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
  taskVisuals: [{ taskUid: 1, shapeKind: 'rectangle' }],
})

const TASK_REF: ItemRef = { kind: 'task', uid: 1 }
const HOLDING_THE_TASK: Selection = selectionWith(emptySelection(), TASK_REF)

/**
 * ADR-001 has the shell build the rectangles, the layout and the geometry once
 * a frame and hand them round.
 *
 * ⛔ ONE selection, handed to BOTH the geometry and the renderer -- a case that
 * told the two different things would describe a frame the shell never builds.
 */
const drawn = (picture: SchedulePicture, selection: Selection): string => {
  const regions = regionsFromScreen(ENV, SETTINGS)
  const layout = layoutFromSchedule(SCENE, SETTINGS, regions)
  const geometry = geometryFromLayout(SCENE, SETTINGS, layout, regions, selection)
  return svgFromSchedule(SCENE, SETTINGS, layout, geometry, regions, selection, picture, null)
}

// ---------------------------------------------------------------------------
// Reading the answer. Copied from tests/unit/t-023c-selected-line-width.test.ts
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

/** The elements that carry paint, in the order they are painted. */
const paintedOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter((drawn) => drawn.tag !== 'svg')

/**
 * One element, with anything a SECOND drawing of the same picture may spell
 * differently taken out -- the marker `id` on the arrow end of a 依存線 is the
 * only such thing, and it is normalised rather than compared.
 */
const settledText = (element: Element): string =>
  element.text.replace(/(id="|url\(#)[^"')]*/g, '$1')

/** The elements one picture has that the other does not. */
const onlyIn = (picture: string, other: string): readonly Element[] => {
  const there = paintedOf(other).map(settledText)
  return paintedOf(picture).filter((drawn) => !there.includes(settledText(drawn)))
}

/** A frame is a `rect` carrying the dash 表 T-206 gives the outline half. */
const framesIn = (svg: string): readonly Element[] =>
  paintedOf(svg).filter(
    (drawn) => drawn.tag === 'rect' && attribute(drawn.text, 'stroke-dasharray') !== null,
  )

// ---------------------------------------------------------------------------

describe('T-076 EP-12 -- the exported picture carries no Selection', () => {
  it('⛔ draws the export exactly as it would with nothing selected (描かない)', () => {
    // EP-12: 「操作の状態 —— … `Selection`（`U-39`）… | 描かない」. A picture
    // that does not draw the selection cannot vary with it. ⭐ THIS IS THE CASE
    // THAT COVERS THE SHAPES NOBODY LISTED: the frame, the two fade grab
    // points, and anything a later row hangs on the selection.
    expect(drawn('export', HOLDING_THE_TASK)).toBe(drawn('export', emptySelection()))
  })

  it('⛔ is not comparing a constant: the SCREEN picture does change (SL-8, FR-016)', () => {
    // ⚠️ 04-verification section 2. If the selection changed nothing anywhere,
    // the case above would be green over a unit that had never heard of a
    // selection. SL-8 asks for the frame and FR-016 for the grab points, so the
    // screen picture MUST differ -- and what it adds is what EP-12 keeps out.
    const marks = onlyIn(drawn('screen', HOLDING_THE_TASK), drawn('screen', emptySelection()))
    expect(marks.length, 'the screen draws marks for the held task').toBeGreaterThan(0)
  })

  it('⛔ puts no dashed frame round the held task in the export (SL-8 / EP-12)', () => {
    // SL-8: 「タスク … は、外接矩形に沿った破線の枠で囲むこと（MUST）」, and
    // EP-12 keeps that mark off the written-out picture. Named on its own so a
    // failure says WHICH mark leaked.
    expect(framesIn(drawn('screen', HOLDING_THE_TASK)).length, 'the screen frames it').toBe(1)
    expect(framesIn(drawn('export', HOLDING_THE_TASK)).map((one) => one.text)).toEqual([])
  })

  it('⛔ carries none of the fade grab points into the export (FR-016 / EP-12)', () => {
    // FR-016: 「掴み点は選択しているタスクにだけ出すこと（MUST）」 -- so the
    // marks the screen adds for a SELECTED task carrying fades include them,
    // and EP-12 lists `Grab Point` among what the export 描かない. ⛔ docs/spec
    // fixes no tag for the mark, so it is found as the difference rather than
    // named.
    const screenMarks = onlyIn(drawn('screen', HOLDING_THE_TASK), drawn('screen', emptySelection()))
    const exportMarks = onlyIn(drawn('export', HOLDING_THE_TASK), drawn('export', emptySelection()))
    expect(screenMarks.length, 'the fade grab points and the frame stand on screen').toBeGreaterThan(
      framesIn(drawn('screen', HOLDING_THE_TASK)).length,
    )
    expect(exportMarks.map((one) => one.text)).toEqual([])
  })
})
