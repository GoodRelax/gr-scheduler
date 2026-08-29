// The fifteen marks SH-5 of 表 T-012 prints, as fifteen DRAWN figures -- and
// the one size any of them is allowed to have: the bar's.
//
// Units driven: UF-27 `schedule-layout.ts` (PI-5) and UF-28
// `schedule-geometry.ts` (PI-6) of 表 T-075, reached the way
// tests/unit/t-012-name-label-vertical.test.ts reaches them.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to, quoted from the manuscripts
// ---------------------------------------------------------------------------
//
//   表 T-012 SH-5  its 表記 column prints 「〇 六角形 五角形 ◇ □ ☆ △ ▽ ファイル
//                  ボックス フロッピー 円筒 会議の人 嬉しい顔 ビールジョッキ」 --
//                  ⛔ NOT COPIED HERE; every case reads the cell at run time.
//   the note under 表 T-012 (2026-08-27 for the first eight, 2026-08-29 for the
//                  other seven): ⛔ 「`SH-5` が並べる 15 の印と
//                  `TaskVisual.milestoneGlyph` の綴りの対応は次のとおりとすること
//                  （MUST）」, and ⭐ 「綴りそのものは `_source/erd.json` が正で
//                  ある」.
//   FR-078         「作成者がマイルストーンを置くとき、`GRS` は、表 T-012 の
//                  `SH-5` が挙げる図形から選べるようにすること」, RATIONALE:
//                  ⭐ 「種類を描き分けられないと、節目の意味の違いを形で伝えられ
//                  ない（`FR-030` が求める「色だけで伝えない」の実現手段でもあ
//                  る）」 -- which is what the first describe below measures: a
//                  glyph that reaches the screen as another glyph's picture
//                  cannot tell one 節目 from another.
//   LF-10 (表 T-221, quoted by FR-080 of 05-07-design.md)
//                  「マイルストーンの図形の大きさ | 予定は、その `Task` の予定の
//                  縦幅を一辺とする図形とし、`start` の位置を中心に置く。実績は
//                  それに `actualOfPlan` を掛けた大きさとし、実績の日付を中心に
//                  置く。上下の中心は予定と同じとする」
//   the user's ruling of 2026-08-29
//                  「パレットは他のアイコンとサイズを合わせろ。日程も他のマイル
//                  ストーンとサイズを合わせろ。つまり動的に変更可能としろ」 --
//                  so on the schedule NO mark may carry a size of its own, and
//                  the second describe below drives all fifteen at two bar
//                  heights to say so.
//   S-17           `shapeHeightOf.milestone`, the row this file moves to make
//                  the bar two different heights. ⛔ Neither figure is typed
//                  here: both are read out of the generated defaults and out of
//                  the bounds 表 T-201 states for the row.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above (01-04-requirements.md,
// 05-07-design.md, _assets/tbl-settings.md, _source/erd.json), and of `src/`
// nothing but the exported declarations these cases call or name --
// `layoutFromSchedule`, `taskPlacement`, `TaskPlacement`, `geometryFromLayout`,
// `TaskGeometry`, `BarGeometry`, `Point`, `regionsFromScreen`,
// `SETTINGS_DEFAULTS`, `emptySelection`, and the `Schedule` / `Task` types.
// ⛔ No function body of either unit was read.
//
// ⭐ NOT ONE EXPECTED FIGURE IS WRITTEN DOWN. The fifteen spellings come out of
// `_source/erd.json` at run time (the note under 表 T-012 sends them there), the
// fifteen marks out of the SH-5 cell, and every length is compared against
// `TaskPlacement.planHeight` -- what the layout itself says the bar is -- rather
// than against a number of this file's own.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - WHICH figure a spelling is. 図 F-019 is the authority for the shapes of
//     the palette's ICONS (FR-029), and the manuscript deliberately does not
//     write any shape out in words -- 「図形を語で書き取らないのは、絵だからで
//     ある」. So no case here says a `star` has five points; they say the fifteen
//     differ from one another and follow the bar.
//   - The EXACT side of the figure. LF-10 says the side is the plan height, but
//     nothing in docs/spec says how each of the fifteen is inscribed in that
//     square -- §8 of `_assets/tbl-glossary.md` states it for the eight
//     geometric ones only (「1 つの外接円に内接し」). A bounding box asserted
//     equal to the side would be inventing an inscription for the other seven.
//     ⭐ What IS asserted is proportionality, which is the ruling's whole claim.
//   - The ACTUAL figure's size (LF-10's second sentence, `actualOfPlan`) and its
//     placement. tests/unit/t-012-name-label-vertical.test.ts owns the vertical
//     centre the two share; no Task here carries an actual at all.
//   - The palette's side of the ruling (「パレットは他のアイコンとサイズを合わせ
//     ろ」). That is the box `S-138` names, drawn by another unit on another
//     surface; FR-029 states it and this file does not reach that unit.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  geometryFromLayout,
  type BarGeometry,
  type Point,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from '../contract/spec-table'

// ===========================================================================
// The manuscripts, read at run time rather than copied (Chapter 1.9 :275)
// ===========================================================================

const T_012 = specTable('T-012')
const T_201 = specTable('T-201')

/** The 表記 column of 表 T-012 -- where SH-5 prints its marks. */
const MARK_COLUMN = '表記'

if (!T_012.headings.includes(MARK_COLUMN)) {
  throw new Error(`表 T-012 no longer has a ${MARK_COLUMN} column: ${T_012.headings.join(' | ')}`)
}

/** The marks SH-5 prints, in the order it prints them. */
const MARKS: readonly string[] = ((): readonly string[] => {
  const row = T_012.rows.find((one) => one.id === 'SH-5')
  if (row === undefined) throw new Error('表 T-012 no longer has row SH-5')
  return (row.by[MARK_COLUMN] ?? '').split(/\s+/u).filter((one) => one.length > 0)
})()

/**
 * `TaskVisual.milestoneGlyph`, as `_source/erd.json` settles it -- its values
 * and the member count its 型 cell states.
 *
 * ⭐ READ FROM THE MANUSCRIPT, NOT FROM THE COPY IN `src/`. The note under 表
 * T-012 says in as many words 「綴りそのものは `_source/erd.json` が正である」.
 */
const GLYPH_COLUMN = ((): {
  readonly values: readonly string[]
  readonly statedCount: number
} => {
  const erd = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
  ) as {
    readonly entities: readonly {
      readonly name: string
      readonly columns: readonly {
        readonly name: string
        readonly type?: string
        readonly json?: { readonly values?: readonly string[] }
      }[]
    }[]
  }
  for (const entity of erd.entities) {
    if (entity.name !== 'TaskVisual') continue
    for (const column of entity.columns) {
      if (column.name !== 'milestoneGlyph') continue
      const values = column.json?.values
      if (values === undefined) break
      // 「列挙（15 値）」 -- the count the column states about itself.
      const stated = /(\d+)/u.exec(column.type ?? '')
      if (stated === null) break
      return { values, statedCount: Number(stated[1]) }
    }
  }
  throw new Error('_source/erd.json no longer settles `TaskVisual.milestoneGlyph`')
})()

const GLYPHS = GLYPH_COLUMN.values

/** One row of 表 T-201, by heading. */
const settingCell = (row: string, heading: string): string => {
  const found = T_201.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`表 T-201 has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) {
    throw new Error(`表 T-201 has no ${heading} column: ${T_201.headings.join(' | ')}`)
  }
  return cell
}

/**
 * The two bar heights the scaling cases drive, as multiples of the row's base:
 * the default `shapeHeightOf.milestone` stands for one, and the value 表 T-201
 * allows at the TOP of its range for the other.
 *
 * ⛔ NEITHER IS TYPED. S-17's default comes out of the generated constant and
 * its ceiling out of the 上限 column of 表 T-201, so a re-ruled row moves these
 * cases rather than leaving them green against a stale pair.
 */
const MILESTONE_HEIGHTS = ((): { readonly small: number; readonly large: number } => {
  const small = SETTINGS_DEFAULTS['shapeHeightOf.milestone']
  if (typeof small !== 'number') throw new Error('S-17 has no generated default')
  const ceilingCell = settingCell('S-17', T_201.headings.find((one) => one.includes('上限')) ?? '')
  const ceiling = Number(bare(ceilingCell))
  if (!Number.isFinite(ceiling)) throw new Error(`S-17 states no numeric ceiling: ${ceilingCell}`)
  return { small, large: ceiling }
})()

// ===========================================================================
// The screen and the document these cases are taken on
// ===========================================================================

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

/** The generated defaults, read by their printed dotted keys. */
const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

// ⚠️ NESTED BY HAND BECAUSE THE GENERATED CONSTANT IS FLAT -- the same handling
// tests/unit/layout-engine.test.ts and tests/unit/t-012-name-label-vertical.
// test.ts give it. ⛔ NO VALUE IS TYPED: each is read back out of the constant.
const settingsAt = (milestoneHeight: number): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    rulerFont: 12, // S-3, fontScale S
    rulerHeight: 42, // S-2, fontScale S
    stackDirection: 'down', // S-58, so every y reads from the top of the band
    scrollDate: '2026-01-01', // S-77; OP-10 would otherwise pick the origin
    shapeHeightOf: {
      rectangle: FLAT['shapeHeightOf.rectangle'],
      chevron: FLAT['shapeHeightOf.chevron'],
      arrow: FLAT['shapeHeightOf.arrow'],
      endpointSpan: FLAT['shapeHeightOf.endpointSpan'],
      milestone: milestoneHeight,
    },
  }) as unknown as DocumentSettings

/** ⚠️ Every nullable column 表 T-019a reads has to be spelled `null` here. */
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
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

/**
 * One row holding one milestone, drawn with the glyph named.
 *
 * ⚠️ The Task carries NO name and NO actual. A label would put a box beside the
 * figure and an actual would put a second figure beside it, and neither is what
 * these cases compare.
 */
const oneMilestone = (glyph: string): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [
      taskOf({ uid: 1, start: '2026-01-11', finish: '2026-01-11', milestone: true }),
    ],
    resources: [],
    assignments: [],
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
    taskVisuals: [{ taskUid: 1, shapeKind: 'milestone', milestoneGlyph: glyph }],
    highlightBoxes: [],
    commentBoxes: [],
  }) as unknown as Schedule

interface Drawn {
  readonly placed: TaskPlacement
  readonly drawn: TaskGeometry
  readonly plan: Extract<BarGeometry, { readonly form: 'outline' }>
}

/** The one milestone of a one-milestone schedule, placed and drawn. */
const drawnWith = (glyph: string, milestoneHeight: number): Drawn => {
  const settings = settingsAt(milestoneHeight)
  const regions = regionsFromScreen(ENV, settings)
  const schedule = oneMilestone(glyph)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const placed = taskPlacement(layout, 1)
  if (placed === null) throw new Error(`the milestone ${glyph} was not drawn at this zoom`)
  const drawn = geometryFromLayout(schedule, settings, layout, regions, emptySelection()).tasks.find(
    (one) => one.taskUid === 1,
  )
  if (drawn === undefined) throw new Error(`the milestone ${glyph} has no picture`)
  const plan = drawn.plan
  if (plan === null) throw new Error(`the milestone ${glyph} has no plan figure`)
  if (plan.form !== 'outline') {
    // 表 T-012 gives SH-5 an area to fill, which is the `outline` form.
    throw new Error(`the milestone ${glyph} was drawn as a ${plan.form}`)
  }
  return { placed, drawn, plan }
}

// ===========================================================================
// Measuring one figure
// ===========================================================================

/**
 * Everything the drawing side puts on the screen for one milestone: the closed
 * silhouette AND the closed outlines cut out of it.
 *
 * ⛔ THE CUT-OUTS ARE PART OF THE FIGURE AND NOT DECORATION. Without them, two
 * of SH-5's fifteen marks collide with a mark already in the list -- a mark made
 * of a silhouette that another mark also draws. A comparison that read `points`
 * alone would call those two "the same figure" and let one of them reach the
 * screen as the other.
 */
const pathsOf = (bar: Extract<BarGeometry, { readonly form: 'outline' }>): readonly (readonly Point[])[] => [
  bar.points,
  ...(bar.marks ?? []),
]

/** How a case names one figure, so that two figures can be told apart. */
const spell = (paths: readonly (readonly Point[])[]): string =>
  JSON.stringify(paths.map((path) => path.map((at) => [round(at.x), round(at.y)])))

const round = (value: number): number => Math.round(value * 1e6) / 1e6

interface Box {
  readonly width: number
  readonly height: number
  readonly cx: number
  readonly cy: number
}

/** The frame one figure circumscribes. */
const boxOf = (paths: readonly (readonly Point[])[]): Box => {
  const xs = paths.flatMap((path) => path.map((at) => at.x))
  const ys = paths.flatMap((path) => path.map((at) => at.y))
  if (xs.length === 0) throw new Error('this figure has no points')
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  return { width: x1 - x0, height: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}

/**
 * One figure with its own centre taken off and the bar's height divided out --
 * what the figure would be if the bar were exactly 1px tall.
 *
 * ⭐ THIS IS THE RULING, WRITTEN AS ARITHMETIC. 「日程も他のマイルストーンとサイズ
 * を合わせろ。つまり動的に変更可能としろ」: if every length in the figure comes
 * from the bar and nothing else, this answer does not move when the bar does.
 * A part drawn at a length of its own leaves a different answer at each height.
 */
const normalised = (paths: readonly (readonly Point[])[], planHeight: number): string => {
  const box = boxOf(paths)
  return spell(
    paths.map((path) =>
      path.map((at) => ({ x: (at.x - box.cx) / planHeight, y: (at.y - box.cy) / planHeight })),
    ),
  )
}

// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG CELL WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING (rule 04 section 2).
    expect(MARKS.length).toBeGreaterThan(1)
    expect(GLYPHS.length).toBeGreaterThan(1)
  })

  it('SH-5 prints as many marks as `_source/erd.json` settles spellings, and as many as it says', () => {
    // The note under 表 T-012 (MUST) pairs the two lists one for one, so a list
    // that has grown on one side alone cannot be paired at all. ⭐ The count is
    // read out of the 型 cell 「列挙（15 値）」 rather than typed, so the number
    // this file agrees with is the manuscript's.
    expect(GLYPHS.length).toBe(GLYPH_COLUMN.statedCount)
    expect(MARKS.length).toBe(GLYPH_COLUMN.statedCount)
  })

  it('every mark SH-5 prints is printed once, and every spelling is settled once', () => {
    expect(new Set(MARKS).size).toBe(MARKS.length)
    expect(new Set(GLYPHS).size).toBe(GLYPHS.length)
  })
})

// ---------------------------------------------------------------------------
// 1. Fifteen marks, fifteen figures.
// ---------------------------------------------------------------------------

describe('表 T-012 SH-5 -- each of the marks reaches the screen as a figure of its own', () => {
  it('draws every one of the spellings `_source/erd.json` settles', () => {
    // FR-078: 「表 T-012 の `SH-5` が挙げる図形から選べるようにすること」. A
    // spelling the drawing side cannot draw is one a person cannot choose.
    for (const glyph of GLYPHS) {
      const { plan } = drawnWith(glyph, MILESTONE_HEIGHTS.small)
      expect(pathsOf(plan).flat().length, glyph).toBeGreaterThan(0)
    }
  })

  it('⛔ no two of the fifteen are DRAWN as the same figure', () => {
    // FR-078's RATIONALE (MUST's ground): 「種類を描き分けられないと、節目の意味の
    // 違いを形で伝えられない」, and FR-030 forbids leaning on colour to carry it.
    // ⛔ COMPARED PAIRWISE AND NOT COUNTED. Fifteen spellings that all reached
    // the same picture would still be fifteen spellings; what has to differ is
    // what is drawn. Two of the marks share a silhouette with a mark already in
    // the list, so the comparison takes the cut-outs in as well (`pathsOf`).
    const drawnAs = new Map<string, string>()
    const collisions: string[] = []
    for (const glyph of GLYPHS) {
      const figure = spell(pathsOf(drawnWith(glyph, MILESTONE_HEIGHTS.small).plan))
      const already = drawnAs.get(figure)
      if (already !== undefined) collisions.push(`${already} and ${glyph} are drawn alike`)
      else drawnAs.set(figure, glyph)
    }
    expect(collisions, collisions.join('; ')).toEqual([])
    expect(drawnAs.size).toBe(GLYPHS.length)
  })

  it('⚠️ the silhouettes alone are NOT all fifteen, which is why the cut-outs are compared', () => {
    // ⭐ This case states the trap rather than guarding against it: it MEASURES
    // that at least two of the fifteen share a silhouette, so that a later hand
    // which drops `marks` from the comparison above finds out here why it was
    // there. ⛔ It asserts a relation and not a number: how MANY collide is not
    // a fact of the specification, only that comparing silhouettes alone is not
    // enough to tell the fifteen apart.
    const silhouettes = new Set(
      GLYPHS.map((glyph) => spell([drawnWith(glyph, MILESTONE_HEIGHTS.small).plan.points])),
    )
    expect(silhouettes.size).toBeLessThan(GLYPHS.length)
  })

  it('every one of the fifteen is drawn as SH-5 asks -- a shape with an area to fill', () => {
    // 表 T-012 splits its five rows on the 上下の幅 column, and SH-5 reads 「なし」
    // for the SPAN of dates while LF-10 gives the figure a side; the picture is
    // a closed outline, which is what `drawnWith` refuses anything else for.
    for (const glyph of GLYPHS) {
      const { placed, plan } = drawnWith(glyph, MILESTONE_HEIGHTS.small)
      expect(placed.shapeKind, glyph).toBe('milestone')
      expect(placed.milestoneGlyph, glyph).toBe(glyph)
      expect(plan.form, glyph).toBe('outline')
    }
  })
})

// ---------------------------------------------------------------------------
// 2. The size follows the bar, and nothing else.
// ---------------------------------------------------------------------------

describe('LF-10 and the ruling of 2026-08-29 -- a mark has no size of its own', () => {
  it('the two bar heights this file drives really are two different heights', () => {
    // ⛔ WITHOUT THIS EVERY CASE BELOW IS VACUOUS. If S-17's default and its
    // ceiling produced the same `planHeight` -- a floor swallowing both, say --
    // "the figure did not change" and "the figure scaled" would be the same
    // answer. FR-094's floor is what could do it, so the guard measures the
    // layout's own answer rather than the setting.
    const small = drawnWith(GLYPHS[0] as string, MILESTONE_HEIGHTS.small).placed.planHeight
    const large = drawnWith(GLYPHS[0] as string, MILESTONE_HEIGHTS.large).placed.planHeight
    expect(MILESTONE_HEIGHTS.large).toBeGreaterThan(MILESTONE_HEIGHTS.small)
    expect(large).toBeGreaterThan(small)
  })

  it('⛔ every one of the fifteen scales with the bar, part for part', () => {
    // LF-10: 「予定は、その `Task` の予定の縦幅を一辺とする図形とし」, and the
    // user's ruling of 2026-08-29: 「日程も他のマイルストーンとサイズを合わせろ。
    // つまり動的に変更可能としろ」. ⭐ Divided by the bar's own height, the
    // figure must come out the same at both heights -- every point of the
    // silhouette AND every point of the cut-outs. A part carrying a length of
    // its own leaves a different answer at each height, which is the very thing
    // the ruling forbids.
    for (const glyph of GLYPHS) {
      const small = drawnWith(glyph, MILESTONE_HEIGHTS.small)
      const large = drawnWith(glyph, MILESTONE_HEIGHTS.large)
      expect(normalised(pathsOf(large.plan), large.placed.planHeight), glyph).toBe(
        normalised(pathsOf(small.plan), small.placed.planHeight),
      )
    }
  })

  it('⛔ no mark keeps a measurement while the bar changes its own', () => {
    // The other half of the same ruling, asserted as the ABSENCE the words ask
    // for: 「つまり動的に変更可能としろ」. ⭐ Stated separately from the case
    // above because the two fail differently -- a figure drawn at a fixed size
    // fails HERE by not moving at all, while a figure with one fixed part and
    // one that follows fails ABOVE. Both readings of "a size of its own" are
    // measured.
    for (const glyph of GLYPHS) {
      const small = drawnWith(glyph, MILESTONE_HEIGHTS.small)
      const large = drawnWith(glyph, MILESTONE_HEIGHTS.large)
      const ratio = large.placed.planHeight / small.placed.planHeight
      const before = boxOf(pathsOf(small.plan))
      const after = boxOf(pathsOf(large.plan))
      expect(after.width, glyph).not.toBeCloseTo(before.width, 6)
      expect(after.height, glyph).not.toBeCloseTo(before.height, 6)
      expect(after.width, glyph).toBeCloseTo(before.width * ratio, 6)
      expect(after.height, glyph).toBeCloseTo(before.height * ratio, 6)
    }
  })

  it('the cut-outs follow the bar as much as the silhouette does', () => {
    // ⭐ THE SEVEN MARKS THAT HAVE THEM ARE THE SEVEN THE RULING WAS MADE ABOUT.
    // A silhouette that scaled while its cut-outs stood still would pass the
    // case above for the eight marks that have none and fail the ruling for the
    // rest, so the marks are measured on their own here as well.
    let withCutOuts = 0
    for (const glyph of GLYPHS) {
      const small = drawnWith(glyph, MILESTONE_HEIGHTS.small)
      const large = drawnWith(glyph, MILESTONE_HEIGHTS.large)
      const before = small.plan.marks ?? []
      const after = large.plan.marks ?? []
      expect(after.length, glyph).toBe(before.length)
      if (before.length === 0) continue
      withCutOuts += 1
      const ratio = large.placed.planHeight / small.placed.planHeight
      expect(boxOf(after).width, glyph).toBeCloseTo(boxOf(before).width * ratio, 6)
      expect(boxOf(after).height, glyph).toBeCloseTo(boxOf(before).height * ratio, 6)
    }
    // ⚠️ A relation, not a number: how many of the fifteen need cut-outs is a
    // fact of 図 F-019 and not of any row, but a run where NONE had them would
    // mean this case measured nothing.
    expect(withCutOuts).toBeGreaterThan(0)
  })

  it('the figure stays centred on its day while it grows (LF-10)', () => {
    // LF-10: 「`start` の位置を中心に置く」. ⭐ A figure that grew from one edge
    // would scale exactly as the cases above ask and still sit off its day, so
    // the centre is measured against `TaskPlacement`'s own answer for where the
    // drawn shape is.
    for (const glyph of GLYPHS) {
      for (const height of [MILESTONE_HEIGHTS.small, MILESTONE_HEIGHTS.large]) {
        const { placed, plan } = drawnWith(glyph, height)
        expect(boxOf([plan.points]).cx, `${glyph} at ${height}`).toBeCloseTo(
          placed.x + placed.width / 2,
          6,
        )
      }
    }
  })
})
