// The drawn `Comment Boxes` (U-14): FR-097's sizing rule, S-182's wrap, the
// newline that is a line break, SL-8's dashed frame, UC-008 extension 2a, and
// NFR-007's 4.5 : 1 for the body -- which NFR-007 names the comment box in.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⚠️ This file carries Japanese: the quoted rows, and a handful of CJK bodies.
// 03-implementation.md section 5 admits both -- a row is quoted so the case
// names the sentence it rests on, and FR-093 counts 「全角 2・半角 1」, which
// cannot be exercised without a 全角 character.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification.md section 1).
// Nothing below takes an expected value out of `src/`. Every number the cases
// expect is either read out of `_assets/tbl-settings.md` at run time through
// `tests/contract/spec-table.ts`, or computed from those rows by the formula
// FR-093 states. ⛔ The one figure the manuscript does NOT state -- the size of
// a box with no body -- has no case, and is reported instead.
//
// THE ROWS THIS FILE RESTS ON
//
//   FR-097   「作成者がコメントボックスの本文を入力または変更したとき、`GRS`
//            は、それを保持してコメントボックスの中に描くこと。… **本文の箱の
//            大きさは本文に合わせること（MUST）。**幅は `FR-093` の概算で求め、
//            **文字の実寸を測ってはならない（MUST NOT）。**折り返す単位数と箱
//            の内側の余白は … 表 T-201 の `S-182` ／ `S-181` に従うこと
//            （MUST）。**本文が持つ改行は、そのまま行の切れ目とすること
//            （MUST）。**文字の大きさは `FR-039` の `fontScale`（表 T-215）に
//            従い、**1 行の高さは文字の大きさに等しいものとして数えること
//            （MUST）。」
//   FR-093   「`GRS` は、ラベルが占める幅を、**全角 2・半角 1 で数えた単位数
//            × フォントサイズ × `labelCoef`** で概算すること。**文字の実寸を
//            測ってはならない（MUST NOT）。測った結果を蓄えてはならない
//            （MUST NOT）。**」
//   FR-019   「作成者がコメントボックスまたはハイライトボックスを構えて置いた
//            とき、`GRS` は、それを作り、その位置を日付と**行の識別子**で持つ
//            こと。」
//   UC-008 2a  「指している行が畳まれた、または非表示になった。 → `GRS` は
//            コメントボックスも一緒に隠す。」
//   NFR-007  「`GRS` は、文字について 4.5 : 1 … のコントラスト比を満たすこと」
//            with 「**重ね描きの文字のうちコメントボックスは対象に含める
//            （MUST）。**」 and 「テーマの色相を変えても満たすこと。」
//   T-201 S-181  `commentBoxPad`, 「コメントボックスの本文の箱の内側の余白
//            （上下左右とも）」
//   T-201 S-182  `commentBoxWrapUnits`, 「コメントボックスの本文を折り返す単位
//            数。**全角 64 文字 ＝ 半角 128**… 数え方は `FR-093`（全角 2・
//            半角 1）」
//   T-201 S-30   `labelCoef`
//   T-215 S-121 / S-122 / S-123   `fontScaleSizes.S` / `.M` / `.L`
//   T-023c SL-1  「対象 | **タスク・依存線・ハイライトボックス・コメント
//            ボックス・基準日線。**」
//   T-023c SL-8  「**タスク・ハイライトボックス・コメントボックスは、外接矩形
//            に沿った破線の枠で囲むこと（MUST）** … **どちらも倍率に追随させて
//            はならない（MUST NOT）**。枠の太さと破線の刻みは … 表 T-206 の
//            `S-174` ／ `S-175`、色は … 表 T-236 の `S-151` が持つ」
//   T-206 S-174 / S-175   the frame's stroke and its dash
//   T-023d GR-14 「コメントボックス / ハイライトボックス | 本体・アンカー・
//            四隅 | 動かす / 大きさを変える」
//   T-015 HR-1a 「**畳んだ `TaskGroup` の配下の行と、その行に載っている `Task`
//            を描いてはならない（MUST NOT）**」
//   T-019 RT-4a 「**端点のいずれかが描かれていないときは、その依存線を描かない
//            （MUST NOT）** —— 畳んだ行・非表示の行・LOD で間引いた `Task` が
//            端点になる場合。注記が同じ状況で隠れるのと揃える（`UC-008` 拡張
//            2a）」 -- the row that settles what UC-008 2a's 「畳まれた」 means,
//            see the note over the extension-2a cases.
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * ⛔ THE SIZE OF A BOX WITH NO BODY -- still not stated, though its FLOOR now
//     is. FR-097 carries 「本文が空、または `null` のときも、幅と高さのどちらも
//     表 T-215 の文字の大きさを下回ってはならない（MUST NOT）」, which reaches both
//     the emptied body and the never-typed one (AT-112 being nullable) and is the
//     subject of the last three cases in this file. ⛔ IT IS A FLOOR AND NOT A
//     SIZE -- the clause says so itself -- so no case states what either box
//     actually measures, and no row bounds them from above.
//   * ⛔⛔ 「全角 1 文字ぶん」 IS NOT THE WORDING, AND MAY NOT BE. This file quoted
//     an earlier form of the clause until 2026-09-02 -- 「全角 1 文字ぶんの幅と
//     1 行ぶんの高さ」 -- which the manuscript no longer carries and which the row
//     now FORBIDS in as many words: ⛔「「全角 1 文字ぶん」とは書かない（MUST NOT）」.
//     ⚠️ The reason the row gives is that the two are not always one number:
//     `S-30`'s note reads 「全角 1 文字 = フォント × 2 × 係数」, so they coincide
//     only while `labelCoef` is 0.5, and `S-30` admits 0.3 to 1. ⭐ THE ASSERTIONS
//     WERE ALWAYS RIGHT -- they read the floor from table T-215, which is the value
//     the clause names outright; only this prose had gone stale. Nothing here
//     varies `labelCoef` to force the question.
//   * ⛔ THE PAINT ORDER. Table T-020 runs ZO-1, ZO-1a, ZO-2, ZO-3, ZO-4, ZO-5
//     -- plan bar, guide, actual bar, progress marker, dependency, name label
//     -- AND NOT ONE ROW NAMES AN ANNOTATION. A comment box floats over the
//     Row Area and so meets every one of those six, and which wins is
//     undecided. No case below states one.
//   * ⛔ WHERE THE BOX SITS. AT-115's `bodyOffsetPx` is 「留めた点から本文まで
//     のずれ」 and FR-019 keeps the anchor 「日付と行の識別子で」, but no row
//     says where the body goes when the offset is null. The cases below ask
//     only for its SIZE, never for its x or y.
//   * ⛔ THE LEADER. AT-111 gives two leader kinds and FR-019 makes choosing
//     between them a MUST, but no table draws either. Not asserted.
//   * ⛔ WHICH CHARACTERS ARE 全角. FR-093 counts 「全角 2・半角 1」 and never
//     draws the line. Every body below is either plain ASCII or plain CJK, the
//     two ends no reading disputes; nothing here classifies anything between.
//   * ⛔ GR-14's GRAB REGION -- 「本体・アンカー・四隅」. PI-6 publishes the
//     geometry and PI-19 the picture; neither carries a corner handle, and no
//     row of table T-206 gives one a size. Only the 本体's rectangle is asked
//     about below, and never as a hit area.
//   * ⛔ FR-093's 「測った結果を蓄えてはならない（MUST NOT）」 and 「文字の実寸
//     を測ってはならない（MUST NOT）」. What enforces those is that layoutEngine
//     compiles without the DOM library (Chapter 5, :66) -- a type check, not a
//     case, and there is no surface a case could ask.
//   * ⛔ THE WIDTH OF A MULTI-LINE BOX is asserted as the widest line's, which
//     is 「本文の箱の大きさは本文に合わせること」 read the only way that leaves
//     every line inside the box. No row states it in those words.

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Calendar,
  CommentBox,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// The rows, read out of the manuscript at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

/** Every number a cell writes, in the order it writes them. */
const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

/** The single number a cell writes, or a failure naming the cell. */
const oneNumberOf = (where: string, cell: string | undefined): number => {
  const [only, ...rest] = numbersOf(cell ?? '')
  if (only === undefined || rest.length !== 0) {
    throw new Error(`${where}: the value is not one number, it is ${cell}`)
  }
  return only
}

/** `S-181`, the padding FR-097 puts 「上下左右とも」 inside the body box. */
const PAD = oneNumberOf('table T-201 row S-181', rowOf('T-201', 'S-181')['既定値'])

/** `S-182`, the units FR-097 wraps the body at. */
const WRAP_UNITS = oneNumberOf('table T-201 row S-182', rowOf('T-201', 'S-182')['既定値'])

/** `S-30`, the one coefficient FR-093's estimate turns on. */
const LABEL_COEF = oneNumberOf('table T-201 row S-30', rowOf('T-201', 'S-30')['既定値'])

/** Table T-215: what each of FR-039's three steps is in px. */
const FONT_SIZE_OF: Readonly<Record<'S' | 'M' | 'L', number>> = {
  S: oneNumberOf('table T-215 row S-121', rowOf('T-215', 'S-121')['値']),
  M: oneNumberOf('table T-215 row S-122', rowOf('T-215', 'S-122')['値']),
  L: oneNumberOf('table T-215 row S-123', rowOf('T-215', 'S-123')['値']),
}

/** `S-174`, SL-8's frame thickness. */
const FRAME_STROKE = oneNumberOf('table T-206 row S-174', rowOf('T-206', 'S-174')['既定'])

/** `S-175`, SL-8's dash -- 「描く長さと空ける長さの組である」. */
const FRAME_DASH: readonly [number, number] = ((): readonly [number, number] => {
  const [on, off, ...rest] = numbersOf(rowOf('T-206', 'S-175')['既定'] ?? '')
  if (on === undefined || off === undefined || rest.length !== 0) {
    throw new Error(`table T-206 row S-175: the value is not a pair, it is ${rowOf('T-206', 'S-175')['既定']}`)
  }
  return [on, off]
})()

// ---------------------------------------------------------------------------
// FR-093's estimate, written once
// ---------------------------------------------------------------------------

/**
 * FR-093's unit count: 「全角 2・半角 1 で数えた単位数」.
 *
 * ⛔ Only the two ends no reading disputes are ever handed to this: plain
 * ASCII, which is 半角, and plain CJK, which is 全角. See the gap note at the
 * head of this file.
 */
const unitsOf = (text: string): number =>
  [...text].reduce((sum, ch) => sum + (/[　-鿿＀-｠]/.test(ch) ? 2 : 1), 0)

/** FR-093: 「単位数 × フォントサイズ × `labelCoef`」. */
const estimatedWidth = (text: string, fontSize: number): number =>
  unitsOf(text) * fontSize * LABEL_COEF

// ---------------------------------------------------------------------------
// The generated defaults are what the product is actually handed. If they and
// the manuscript ever part, every expectation above is measuring a table the
// code does not use -- so say so once, loudly, rather than in every case.
// ---------------------------------------------------------------------------

const defaultNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS has no number at ${key}`)
  return value
}

describe('the values these cases expect reach the product', () => {
  it('carries S-181, S-182, S-30 and table T-215 from the manuscript into the defaults', () => {
    expect(defaultNumber('commentBoxPad')).toBe(PAD)
    expect(defaultNumber('commentBoxWrapUnits')).toBe(WRAP_UNITS)
    expect(defaultNumber('labelCoef')).toBe(LABEL_COEF)
    expect(defaultNumber('fontScaleSizes.S')).toBe(FONT_SIZE_OF.S)
    expect(defaultNumber('fontScaleSizes.M')).toBe(FONT_SIZE_OF.M)
    expect(defaultNumber('fontScaleSizes.L')).toBe(FONT_SIZE_OF.L)
  })
})

// ---------------------------------------------------------------------------
// The document under test. Plain data; every builder returns a fresh object.
// ---------------------------------------------------------------------------

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

/** A calendar on which every weekday is worked, so no holiday moves an axis. */
const EVERY_DAY_WORKED = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((oneNode) => ({
    ordinal: oneNode,
    dayType: oneNode,
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

const taskGroup = (
  over: Partial<TaskGroup> & { readonly id: string; readonly order: number },
): TaskGroup =>
  ({
    parentId: null,
    label: over.id,
    derivedFromTaskUid: null,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
    ...over,
  }) as unknown as TaskGroup

const taskVisual = (taskUid: number): TaskVisual =>
  ({
    taskUid,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: 'rectangle',
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }) as unknown as TaskVisual

/** A day of March 2026, as a stored date column writes it. */
const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

const commentBox = (over: Partial<CommentBox> & { readonly id: string }): CommentBox =>
  ({
    leaderShapeKind: null,
    text: null,
    anchorDate: day(6),
    anchorGroupId: 'g1',
    bodyOffsetPx: null,
    ...over,
  }) as unknown as CommentBox

/** One Task per row, all alike, so nothing but the annotation differs. */
const scheduleOf = (
  groups: readonly TaskGroup[],
  boxes: readonly CommentBox[],
  themeHue = 214,
): Schedule => {
  const tasks = groups.map((_, i) => task({ uid: i + 1, start: day(5), finish: day(9) }))
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
      themeHue,
      uidHighWaterMark: 1000,
      importSeq: 0,
      carry: {},
      carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: tasks.map((one, i) => ({
      taskUid: one.uid,
      groupId: groups[i]?.id ?? 'g1',
      stackOrder: null,
    })) as unknown as readonly TaskGroupMember[],
    taskVisuals: tasks.map((one) => taskVisual(one.uid)),
    commentBoxes: boxes,
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

/** BO-1 of table T-077: what the environment settles, not the document. */
const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8 }

/** Two plain sibling rows. The annotation is anchored to the first. */
const TWO_ROWS: readonly TaskGroup[] = [
  taskGroup({ id: 'g1', order: 0 }),
  taskGroup({ id: 'g2', order: 1 }),
]

interface Drawn {
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly svg: string
}

/** One pass of table T-068's chain, then PI-19. */
const draw = (
  schedule: Schedule,
  over: Readonly<Record<string, unknown>> = {},
  selection = emptySelection(),
): Drawn => {
  // scrollDate (S-77) pins the left edge of the Row Area, so two documents a
  // case compares are always drawn on the same axis.
  const settings = settingsOf({ zoomX: 10, scrollDate: day(1), ...over })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  return {
    geometry,
    svg: svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen'),
  }
}

/** The one comment box of a picture, or a failure saying it was not drawn. */
const boxOf = (drawn: Drawn) => {
  const [only, ...rest] = drawn.geometry.commentBoxes
  if (only === undefined) throw new Error('no comment box was drawn')
  if (rest.length !== 0) throw new Error('more than one comment box was drawn')
  return only
}

/** A document holding exactly one comment box with this body. */
const drawBody = (
  text: string | null,
  over: Readonly<Record<string, unknown>> = {},
  selection = emptySelection(),
): Drawn => draw(scheduleOf(TWO_ROWS, [commentBox({ id: 'c1', text })]), over, selection)

// ---------------------------------------------------------------------------
// Reading a picture back
//
// ⭐ THE COMMENT BOX IS ISOLATED BY SUBTRACTION, not by naming a tag or an
// attribute the specification does not have: the same document is drawn twice,
// once with the annotation and once without, and what only the first draws is
// the annotation. Everything else -- the bands, the bars, the ruler -- is
// written identically in both and differences away.
// ---------------------------------------------------------------------------

const ELEMENT = /<(\/?)([A-Za-z][\w-]*)((?:[^<>"]|"[^"]*")*?)(\/?)>/g

const attrOf = (attrs: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1] ?? null

const numberAttr = (attrs: string, name: string, fallback = 0): number => {
  const raw = attrOf(attrs, name)
  return raw === null ? fallback : Number.parseFloat(raw)
}

interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

interface Figure {
  readonly tag: string
  /** The element exactly as the picture writes it -- what two pictures difference on. */
  readonly text: string
  readonly attrs: string
  /** Null for anything this file does not measure -- `text` above all (FR-093). */
  readonly box: Box | null
}

const boxOfElement = (tag: string, attrs: string): Box | null => {
  if (tag !== 'rect') return null
  const x = numberAttr(attrs, 'x')
  const y = numberAttr(attrs, 'y')
  return {
    x0: x,
    y0: y,
    x1: x + numberAttr(attrs, 'width'),
    y1: y + numberAttr(attrs, 'height'),
  }
}

/** Every leaf element a picture draws, in the order it draws them. */
const figuresOf = (svg: string): readonly Figure[] => {
  const out: Figure[] = []
  ELEMENT.lastIndex = 0
  for (let hit = ELEMENT.exec(svg); hit !== null; hit = ELEMENT.exec(svg)) {
    const [text, closing, tag = '', attrs = ''] = hit
    if (closing === '/' || tag === 'g' || tag === 'svg') continue
    if (tag === 'defs' || tag === 'clipPath' || tag === 'marker') continue
    out.push({ tag, text, attrs, box: boxOfElement(tag, attrs) })
  }
  return out
}

/** What the first picture draws and the second does not, element for element. */
const onlyIn = (one: string, other: string): readonly Figure[] => {
  const theirs = new Set(figuresOf(other).map((figure) => figure.text))
  return figuresOf(one).filter((figure) => !theirs.has(figure.text))
}

/** The figures the annotation adds to an otherwise identical picture. */
const annotationFiguresOf = (
  text: string | null,
  over: Readonly<Record<string, unknown>> = {},
  selection = emptySelection(),
): readonly Figure[] =>
  onlyIn(
    drawBody(text, over, selection).svg,
    draw(scheduleOf(TWO_ROWS, []), over, selection).svg,
  )

// ---------------------------------------------------------------------------
// WCAG 2.1's contrast ratio, which NFR-007 cites by number
// ---------------------------------------------------------------------------

/** `#rgb`, `#rrggbb` and `hsl(H S% L%)` -- the two spellings table T-236 uses. */
const rgbOf = (colour: string): readonly [number, number, number] => {
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(colour.trim())
  if (hex !== null) {
    const body = hex[1] ?? ''
    const wide = body.length === 3 ? [...body].map((oneCell) => oneCell + oneCell).join('') : body
    return [0, 2, 4].map((oneIndex) => Number.parseInt(wide.slice(oneIndex, oneIndex + 2), 16) / 255) as unknown as [
      number,
      number,
      number,
    ]
  }
  const hsl = /^hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/.exec(colour.trim())
  if (hsl === null) throw new Error(`this file cannot read the colour ${colour}`)
  const h = Number(hsl[1]) / 360
  const s = Number(hsl[2]) / 100
  const l = Number(hsl[3]) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = l - c / 2
  const sextant = Math.floor(h * 6) % 6
  const table: readonly (readonly [number, number, number])[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ]
  const [r, g, b] = table[sextant] ?? [0, 0, 0]
  return [r + m, g + m, b + m]
}

/** WCAG 2.1's relative luminance. */
const luminanceOf = (colour: string): number => {
  const [r, g, b] = rgbOf(colour).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as unknown as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1's contrast ratio, (L1 + 0.05) / (L2 + 0.05). */
const contrastOf = (one: string, other: string): number => {
  const a = luminanceOf(one)
  const b = luminanceOf(other)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/**
 * The colour actually behind a point: the last filled figure drawn before the
 * element at `beforeIndex` whose rectangle covers it.
 *
 * ⭐ Read off the picture rather than assumed, so a box that stops painting its
 * own ground is measured against whatever then shows through, and a box that
 * paints one is measured against that.
 */
const groundUnder = (
  figures: readonly Figure[],
  beforeIndex: number,
  at: { readonly x: number; readonly y: number },
): string => {
  for (let i = beforeIndex - 1; i >= 0; i -= 1) {
    const figure = figures[i]
    if (figure === undefined || figure.box === null) continue
    const fill = attrOf(figure.attrs, 'fill')
    if (fill === null || fill === 'none') continue
    const { x0, y0, x1, y1 } = figure.box
    if (at.x >= x0 && at.x <= x1 && at.y >= y0 && at.y <= y1) return fill
  }
  throw new Error('nothing is painted under this point')
}

// ---------------------------------------------------------------------------
// The instrument, checked before it is believed (04-verification.md section 2)
// ---------------------------------------------------------------------------

describe('the readers this file measures with', () => {
  it('computes the contrast ratio WCAG 2.1 defines', () => {
    expect(contrastOf('#000000', '#ffffff')).toBeCloseTo(21, 6)
    expect(contrastOf('#ffffff', '#ffffff')).toBeCloseTo(1, 6)
    // hsl and hex spellings of one colour must land on one number.
    expect(contrastOf('hsl(0 0% 100%)', '#000000')).toBeCloseTo(21, 6)
    // ⛔ And it must be able to FAIL: a mid grey on white is under 4.5 : 1.
    expect(contrastOf('#8a8a8a', '#ffffff')).toBeLessThan(4.5)
  })

  it('counts FR-093 units as 全角 2 and 半角 1', () => {
    expect(unitsOf('abcd')).toBe(4)
    expect(unitsOf('あいう')).toBe(6)
  })

  it('sees the annotation as figures the same picture without it does not draw', () => {
    expect(annotationFiguresOf('hello').length).toBeGreaterThan(0)
    expect(onlyIn(draw(scheduleOf(TWO_ROWS, [])).svg, draw(scheduleOf(TWO_ROWS, [])).svg)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// FR-097 -- the body's box is sized to its text
// ---------------------------------------------------------------------------

describe('FR-097 -- 本文の箱の大きさは本文に合わせること（MUST）', () => {
  const SCALES = ['S', 'M', 'L'] as const
  const BODIES = ['a', 'ab', 'hello world', 'a-b-c-d-e-f']

  it.each(SCALES)(
    'at fontScale %s a halfwidth body is FR-093 wide with S-181 on both sides',
    (fontScale) => {
      const fontSize = FONT_SIZE_OF[fontScale]
      for (const text of BODIES) {
        const box = boxOf(drawBody(text, { fontScale }))
        expect({ text, width: box.body.width }).toEqual({
          text,
          width: estimatedWidth(text, fontSize) + PAD * 2,
        })
      }
    },
  )

  it('counts a fullwidth character as two units (FR-093, and S-182 note)', () => {
    const fontSize = FONT_SIZE_OF.M
    for (const text of ['あ', '注記', 'コメントボックス']) {
      const box = boxOf(drawBody(text))
      expect({ text, width: box.body.width }).toEqual({
        text,
        width: estimatedWidth(text, fontSize) + PAD * 2,
      })
    }
  })

  it.each(SCALES)('at fontScale %s one line is as tall as the type, plus S-181 twice', (fontScale) => {
    const fontSize = FONT_SIZE_OF[fontScale]
    const box = boxOf(drawBody('hello', { fontScale }))
    expect(box.body.height).toBe(fontSize + PAD * 2)
  })

  it.each(SCALES)('at fontScale %s the type is table T-215\'s size (FR-039)', (fontScale) => {
    expect(boxOf(drawBody('hello', { fontScale })).fontSize).toBe(FONT_SIZE_OF[fontScale])
  })

  it('draws the body inside the box (「コメントボックスの中に描く」)', () => {
    const figures = annotationFiguresOf('hello world')
    const drawnText = figures
      .filter((one) => one.tag === 'text')
      .map((one) => one.text)
    expect(drawnText.length).toBe(1)
    expect(drawBody('hello world').svg).toContain('hello world')
  })
})

// ---------------------------------------------------------------------------
// FR-097 -- 本文が持つ改行は、そのまま行の切れ目とすること（MUST）
// ---------------------------------------------------------------------------

describe('FR-097 -- a newline in the body is a line break', () => {
  it('breaks the body where it carries a newline', () => {
    expect(boxOf(drawBody('x\ny')).lines).toEqual(['x', 'y'])
    expect(boxOf(drawBody('one\ntwo\nthree')).lines).toEqual(['one', 'two', 'three'])
  })

  it('keeps a break that leaves an empty line, because the body carries it', () => {
    expect(boxOf(drawBody('a\n\nb')).lines).toEqual(['a', '', 'b'])
  })

  it('makes the box one type-height taller per line (「1 行の高さは文字の大きさに等しい」)', () => {
    const fontSize = FONT_SIZE_OF.M
    for (const [text, lines] of [
      ['x', 1],
      ['x\ny', 2],
      ['a\n\nb', 3],
      ['a\nb\nc\nd', 4],
    ] as const) {
      const box = boxOf(drawBody(text))
      expect({ text, lines: box.lines.length, height: box.body.height }).toEqual({
        text,
        lines,
        height: lines * fontSize + PAD * 2,
      })
    }
  })

  it('is as wide as its widest line', () => {
    const box = boxOf(drawBody('a\nabcd'))
    expect(box.body.width).toBe(estimatedWidth('abcd', FONT_SIZE_OF.M) + PAD * 2)
  })

  it('draws one run of text per line', () => {
    expect(annotationFiguresOf('one\ntwo\nthree').filter((one) => one.tag === 'text').length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// S-182 -- 折り返す単位数
// ---------------------------------------------------------------------------

describe('S-182 -- the body wraps at commentBoxWrapUnits and not before', () => {
  /** Exactly `WRAP_UNITS` units of 半角, and one unit more. */
  const AT_LIMIT = 'a'.repeat(WRAP_UNITS)
  const OVER_LIMIT = 'a'.repeat(WRAP_UNITS + 1)
  /** 「全角 64 文字 ＝ 半角 128」 -- the same limit counted the other way. */
  const AT_LIMIT_WIDE = 'あ'.repeat(WRAP_UNITS / 2)
  const OVER_LIMIT_WIDE = 'あ'.repeat(WRAP_UNITS / 2 + 1)

  it('leaves a body of exactly S-182 units on one line', () => {
    expect(boxOf(drawBody(AT_LIMIT)).lines).toEqual([AT_LIMIT])
    expect(boxOf(drawBody(AT_LIMIT_WIDE)).lines).toEqual([AT_LIMIT_WIDE])
  })

  it('breaks a body one unit longer', () => {
    const halfwidth = boxOf(drawBody(OVER_LIMIT)).lines
    expect(halfwidth.length).toBe(2)
    expect(halfwidth.join('')).toBe(OVER_LIMIT)
    const fullwidth = boxOf(drawBody(OVER_LIMIT_WIDE)).lines
    expect(fullwidth.length).toBe(2)
    expect(fullwidth.join('')).toBe(OVER_LIMIT_WIDE)
  })

  it('never draws a line wider than S-182 units', () => {
    for (const text of [OVER_LIMIT, OVER_LIMIT_WIDE, 'a'.repeat(WRAP_UNITS * 3 + 7)]) {
      for (const line of boxOf(drawBody(text)).lines) {
        expect(unitsOf(line)).toBeLessThanOrEqual(WRAP_UNITS)
      }
    }
  })

  it('keeps the box no wider than S-182 units plus S-181 twice', () => {
    const widest = WRAP_UNITS * FONT_SIZE_OF.M * LABEL_COEF + PAD * 2
    expect(boxOf(drawBody(OVER_LIMIT)).body.width).toBe(widest)
    expect(boxOf(drawBody(AT_LIMIT)).body.width).toBe(widest)
  })
})

// ---------------------------------------------------------------------------
// ⭐ The two rows FR-097 points at are SETTINGS, not constants
//
// 04-verification.md section 2 asks the acceptance of a value that travels from
// a manuscript to be 「原稿の値を 1 つ変えると試験が落ちるか」. ⛔ This file may
// not edit docs/, so it does the same thing from the other end: a document that
// carries S-181 and S-182 away from their defaults must be drawn with the values
// it carries. A drawing that had either number written into it would not move.
// ---------------------------------------------------------------------------

describe('S-181 and S-182 are read from the document, not written into the drawing', () => {
  it('pads by whatever commentBoxPad the document holds', () => {
    const pad = PAD + 7
    const box = boxOf(drawBody('hello', { commentBoxPad: pad }))
    expect(box.body.width).toBe(estimatedWidth('hello', FONT_SIZE_OF.M) + pad * 2)
    expect(box.body.height).toBe(FONT_SIZE_OF.M + pad * 2)
  })

  it('wraps at whatever commentBoxWrapUnits the document holds', () => {
    const units = 10
    const box = boxOf(drawBody('a'.repeat(units + 1), { commentBoxWrapUnits: units }))
    expect(box.lines.map((line) => unitsOf(line))).toEqual([units, 1])
  })
})

// ---------------------------------------------------------------------------
// NFR-007 -- 4.5 : 1, 「コメントボックスは対象に含める（MUST）」
// ---------------------------------------------------------------------------

describe('NFR-007 -- the comment box body holds 4.5 : 1', () => {
  // 「テーマの色相を変えても満たすこと」 -- four hues around the circle.
  const HUES = [0, 90, 214, 300]
  const THEMES = [
    { themePreference: 'light' },
    { themePreference: 'dark' },
    { themePreference: 'light', themeMonochrome: true },
    { themePreference: 'dark', themeMonochrome: true },
  ] as const

  it.each(THEMES)('holds 4.5 : 1 in %o at every hue', (theme) => {
    for (const themeHue of HUES) {
      const schedule = scheduleOf(TWO_ROWS, [commentBox({ id: 'c1', text: 'hello' })], themeHue)
      const drawn = draw(schedule, theme)
      const bare = draw(scheduleOf(TWO_ROWS, [], themeHue), theme)
      const mine = new Set(onlyIn(drawn.svg, bare.svg).map((one) => one.text))

      const figures = figuresOf(drawn.svg)
      const body = boxOf(drawn).body
      const runs = figures
        .map((figure, index) => ({ figure, index }))
        .filter((one) => one.figure.tag === 'text' && mine.has(one.figure.text))
      expect(runs.length).toBeGreaterThan(0)

      for (const { figure, index } of runs) {
        const ink = attrOf(figure.attrs, 'fill')
        expect(ink).not.toBeNull()
        const ground = groundUnder(figures, index, {
          x: body.x + body.width / 2,
          y: body.y + body.height / 2,
        })
        expect({ themeHue, ink, ground, ratio: contrastOf(ink ?? '', ground) >= 4.5 }).toEqual({
          themeHue,
          ink,
          ground,
          ratio: true,
        })
      }
    }
  })

  // 「図形と操作できる要素について 3 : 1 のコントラスト比を満たすこと」. The box's
  // own outline is a 図形 the annotation draws, and GR-14 makes the 本体 a thing
  // the author grabs, so it is on both halves of that sentence.
  it.each(THEMES)('holds 3 : 1 between the box outline and its ground in %o', (theme) => {
    for (const themeHue of HUES) {
      const withBox = draw(
        scheduleOf(TWO_ROWS, [commentBox({ id: 'c1', text: 'hello world' })], themeHue),
        theme,
      )
      const bare = draw(scheduleOf(TWO_ROWS, [], themeHue), theme)
      const outlined = onlyIn(withBox.svg, bare.svg).filter(
        (one) =>
          attrOf(one.attrs, 'stroke') !== null &&
          (attrOf(one.attrs, 'fill') ?? 'none') !== 'none',
      )
      expect(outlined.length).toBeGreaterThan(0)
      for (const figure of outlined) {
        const edge = attrOf(figure.attrs, 'stroke') ?? ''
        const ground = attrOf(figure.attrs, 'fill') ?? ''
        expect({ themeHue, edge, ground, ratio: contrastOf(edge, ground) >= 3 }).toEqual({
          themeHue,
          edge,
          ground,
          ratio: true,
        })
      }
    }
  })
})

// ---------------------------------------------------------------------------
// SL-8 -- 外接矩形に沿った破線の枠
// ---------------------------------------------------------------------------

const SELECTED = selectionWith(emptySelection(), { kind: 'commentBox', id: 'c1' })

/** Every figure of the annotation that is drawn with a dash. */
const dashedOf = (
  over: Readonly<Record<string, unknown>> = {},
  selection = emptySelection(),
): readonly Figure[] =>
  annotationFiguresOf('hello world', over, selection).filter(
    (one) => attrOf(one.attrs, 'stroke-dasharray') !== null,
  )

describe('SL-8 -- a selected comment box wears a dashed frame', () => {
  it('draws no dashed frame while nothing is selected', () => {
    expect(dashedOf()).toEqual([])
  })

  it('draws one, on the body\'s bounding rectangle', () => {
    const [only, ...rest] = dashedOf({}, SELECTED)
    expect(rest).toEqual([])
    expect(only).toBeDefined()
    const body = boxOf(drawBody('hello world', {}, SELECTED)).body
    expect(only?.box).toEqual({
      x0: body.x,
      y0: body.y,
      x1: body.x + body.width,
      y1: body.y + body.height,
    })
  })

  it('gives it S-174\'s thickness and S-175\'s dash', () => {
    const [only] = dashedOf({}, SELECTED)
    expect(numberAttr(only?.attrs ?? '', 'stroke-width')).toBe(FRAME_STROKE)
    expect((attrOf(only?.attrs ?? '', 'stroke-dasharray') ?? '').split(/[\s,]+/).map(Number)).toEqual([
      ...FRAME_DASH,
    ])
  })

  it('does not follow the zoom (「倍率に追随させてはならない（MUST NOT）」)', () => {
    const near = dashedOf({ zoomX: 4 }, SELECTED)[0]
    const far = dashedOf({ zoomX: 40 }, SELECTED)[0]
    expect(numberAttr(near?.attrs ?? '', 'stroke-width')).toBe(FRAME_STROKE)
    expect(numberAttr(far?.attrs ?? '', 'stroke-width')).toBe(FRAME_STROKE)
    expect(attrOf(far?.attrs ?? '', 'stroke-dasharray')).toBe(
      attrOf(near?.attrs ?? '', 'stroke-dasharray'),
    )
  })

  it('leaves another comment box alone (SL-1 selects one thing, not the kind)', () => {
    const two = [
      commentBox({ id: 'c1', text: 'hello world' }),
      commentBox({ id: 'c2', text: 'hello world', anchorGroupId: 'g2' }),
    ]
    const withSelection = draw(scheduleOf(TWO_ROWS, two), {}, SELECTED)
    const without = draw(scheduleOf(TWO_ROWS, two))
    const added = onlyIn(withSelection.svg, without.svg).filter(
      (one) => attrOf(one.attrs, 'stroke-dasharray') !== null,
    )
    expect(added.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// UC-008 extension 2a -- 指している行が畳まれた、または非表示になった
//
// ⭐ WHAT 「畳まれた」 REACHES. The specification settles it elsewhere: HR-1a of
// table T-015 collapses a row's DESCENDANTS (「畳んだ `TaskGroup` の配下の行と、
// その行に載っている `Task` を描いてはならない（MUST NOT）」), so a row that is
// itself collapsed is still drawn, and RT-4a -- which says in so many words that
// it is aligned with this extension (「注記が同じ状況で隠れるのと揃える
// （`UC-008` 拡張 2a）」) -- lists 「畳んだ行・非表示の行」 as endpoints that are
// NOT DRAWN. So the extension reaches a row that has been folded away, and the
// two cases below are that row and the hidden row.
//
// ⛔ NO CASE CLAIMS THE OTHER READING -- that a box on a row which is itself
// collapsed, and therefore still on screen, must vanish. Nothing would then draw
// it, and no row asks for that.
// ---------------------------------------------------------------------------

describe('UC-008 extension 2a -- a box on a row that is not drawn is not drawn', () => {
  it('hides the box when the row it points at is hidden', () => {
    const rows = [taskGroup({ id: 'g1', order: 0, isHidden: true }), taskGroup({ id: 'g2', order: 1 })]
    const drawn = draw(scheduleOf(rows, [commentBox({ id: 'c1', text: 'hello world' })]))
    expect(drawn.geometry.commentBoxes).toEqual([])
    expect(onlyIn(drawn.svg, draw(scheduleOf(rows, [])).svg)).toEqual([])
  })

  it('hides the box when the row it points at is folded away under a collapsed row', () => {
    const rows = [
      taskGroup({ id: 'g1', order: 0, isCollapsed: true }),
      taskGroup({ id: 'g2', order: 1, parentId: 'g1' }),
    ]
    const drawn = draw(
      scheduleOf(rows, [commentBox({ id: 'c1', text: 'hello world', anchorGroupId: 'g2' })]),
    )
    expect(drawn.geometry.commentBoxes).toEqual([])
    expect(onlyIn(drawn.svg, draw(scheduleOf(rows, [])).svg)).toEqual([])
  })

  it('still draws a box whose row is drawn', () => {
    expect(boxOf(drawBody('hello world')).lines).toEqual(['hello world'])
  })
})

// ---------------------------------------------------------------------------
// ⛔ THE BOX WITH NO BODY -- FR-097's floor
//
// The clause FR-097's STATEMENT carries after the newline sentence:
//
//   ⛔ **本文が空、または `null` のときも、幅と高さのどちらも
//   表 T-215 の文字の大きさを下回ってはならない（MUST NOT）** —— `FR-093` の概算は単位数が 0 なら 0 を
//   返すので、**余白だけの箱になり、置いた本人にも掴めず消せもしない。**
//   ⚠️ **`null` を含めるのは、`CM-46` が作る箱がすべてその状態だからである**
//   —— 含めないと、最も普通の場合に大きさを述べた行が 1 つも無いことになる。
//   ⛔ **下限であって大きさではない** —— 本文を持つ箱は概算のままとし、下限を
//   全部の箱に掛けてはならない（MUST NOT）。⚠️ **新しい値は要らない** ——
//   表 T-215 の文字の大きさをそのまま使う。
//   ⛔ **「全角 1 文字ぶん」とは書かない（MUST NOT）。**
//
// ⭐ THREE THINGS THE SENTENCE SETTLES. The three cases below are those three.
//
//   1. 「本文が空、**または `null`** のときも」 -- BOTH states are named, so the
//      never-typed box is now reached and the case `PD-236` asks for (「`text`
//      が `null` の箱が描かれ、掴める試験」) belongs here. ⚠️ It did not belong
//      before: what changed is the sentence, not the reasoning that kept it out.
//   2. 「下回ってはならない（MUST NOT）」 -- a FLOOR. ⛔ SO EVERY CASE BELOW
//      ASSERTS `>=`, NEVER `===`. The clause says outright 「下限であって大きさ
//      ではない」, so pinning an exact width here would be inventing the size the
//      specification declined to state -- the same fault as reading one out of
//      `src/`.
//   3. 「下限を全部の箱に掛けてはならない（MUST NOT）」 -- the third case proves
//      it was not, by finding a body-bearing box legitimately BELOW the floor
//      that is still exactly FR-093's estimate.
//
// ⭐ WHAT THE FLOOR IS. The clause names it outright: 表 T-215 の文字の大きさ.
// ⛔ So the floor below is read from table T-215 and is NOT recomputed through
// FR-093. ⛔⛔ AND IT IS NOT CALLED 「全角 1 文字ぶん」 -- the row forbids that
// wording (MUST NOT), because the two are one number only while `labelCoef` is at
// its default. See the gap note at the head of this file.
//
// ⛔ WHAT THE SENTENCE STILL DOES NOT SETTLE, and why no case states it: whether
// the floor is measured on the TEXT, with S-181 then added outside
// it, or on the BOX ITSELF. The two readings differ by `PAD * 2` and both satisfy
// 「下回ってはならない」, so the cases below pass under either and name neither.
// ⚠️ Nor does any row bound these two states from ABOVE, so no case can.
//
// ⛔ AND THE OTHER HALF OF `PD-236`'S TEST -- 「掴める」 -- IS STILL NOT REACHABLE.
// GR-14's grab region is on no surface `PI-6` or `PI-19` publishes (see the head
// of this file). What stands in for it is the floor itself, which is the clause's
// own reason for existing: 「置いた本人にも掴めず消せもしない」.
// ---------------------------------------------------------------------------

describe('FR-097 -- a box with no body does not fall below its floor', () => {
  const SCALES = ['S', 'M', 'L'] as const

  /** 「表 T-215 の文字の大きさを下回ってはならない（MUST NOT）」. */
  const floorOf = (fontScale: (typeof SCALES)[number]): number => FONT_SIZE_OF[fontScale]

  it.each(SCALES)('at fontScale %s an emptied body keeps one 全角 and one line', (fontScale) => {
    const box = boxOf(drawBody('', { fontScale }))
    expect(box.body.width).toBeGreaterThanOrEqual(floorOf(fontScale))
    expect(box.body.height).toBeGreaterThanOrEqual(floorOf(fontScale))
  })

  it.each(SCALES)('at fontScale %s a never-typed body is drawn and keeps the same floor', (fontScale) => {
    // AT-112 is nullable and CM-46 makes every box in this state.
    const box = boxOf(drawBody(null, { fontScale }))
    expect(box.body.width).toBeGreaterThanOrEqual(floorOf(fontScale))
    expect(box.body.height).toBeGreaterThanOrEqual(floorOf(fontScale))
    // 「描かれ」 -- the picture carries it, not merely the geometry.
    expect(annotationFiguresOf(null, { fontScale }).length).toBeGreaterThan(0)
  })

  it('does not lay the floor on a box that has a body (MUST NOT)', () => {
    // 'a' is one 半角 unit, so FR-093's estimate is half a 全角 -- legitimately
    // under the floor. Had the floor been laid on every box, this would have
    // been lifted to it. ⭐ Compared against the SMALLER of the two readings of
    // where the floor is measured (on the text, or on the box), so the case
    // holds under both.
    const box = boxOf(drawBody('a'))
    expect(box.body.width).toBe(estimatedWidth('a', FONT_SIZE_OF.M) + PAD * 2)
    expect(box.body.width).toBeLessThan(FONT_SIZE_OF.M)
  })
})
