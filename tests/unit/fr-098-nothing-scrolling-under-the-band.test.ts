// D-170 -- FR-098's ban on drawing a scrolling row where the pinned band is,
// read of the PICTURE rather than of the layout.
//
// Unit under test: `svgFromSchedule` (PI-19 of table T-064). ⭐ IT IS THE
// PICTURE THE RULE IS ABOUT. FR-098 gained, on 2026-08-31:
//
//   「⛔ **この禁止は、その行のために描くものすべてに当たる（MUST）** ——
//     **行の地だけでなく、その行のバー・ラベル・進捗マーカー・依存線を含めて、
//     帯が占める場所へ 1 つも描いてはならない（MUST NOT）。**⚠️ **地だけを切ると、
//     切られていない図形が留めた行の上に載る**（実測 2026-08-31）——
//     **読む人には、留めた行の中へ別の行のバーが入り込んで見える。**
//     ⭐ **切る先は残りの領域の上端であり … `S-78` が既に指しているものと同じで
//     ある** —— ⛔ **新しい値を作らない。**」
//
// ⛔ THE SENTENCE IS ABOUT INK, NOT ABOUT THE LAYOUT'S NUMBERS. The sibling file
// tests/unit/fr-098-the-pinned-band.test.ts already asks `layoutFromSchedule`
// where the rows go, and it PASSES while the defect stands: the rows are placed
// correctly and the FIGURES are drawn anyway. So every case here reads the
// string PI-19 returns and asks what is painted inside the band.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⚠️ This file carries Japanese inside quoted rows and inside the strings that
// pin them to the manuscript. 03-implementation.md section 5 admits that: a row
// is quoted so the case names the sentence it rests on, and the pinning strings
// have to be the manuscript's own characters or they pin nothing. Every line of
// prose is English.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   `FR-098`  「帯は `Row Area` の中に置き、スクロールする行が並ぶのはその残りと
//             すること（MUST）。スクロールする行を帯の下へ潜らせてはならない
//             （MUST NOT）」 and the 2026-08-31 amendment quoted above.
//   `FR-098`  「⭐⭐ **留めた行そのものにも地を敷くこと（MUST）**」 -- the half that
//             stops "cut everything away" from passing as a fix.
//   `FR-098`  「`S-78` と `S-176` が指すのは、スクロールする残りの領域の上端と
//             すること（MUST）。帯の上端としてはならない（MUST NOT）—— 帯は
//             流れない」 -- which is why the band is the SAME picture at every
//             scroll position, and so what the control below subtracts away.
//   表 T-221  `LF-14` 「帯の高さは、帯に置く行の帯高（`LF-2`）を合計し、行と行の
//             あいだに `rowGap` をその数から 1 を引いた数だけ加えたものとする。…
//             スクロールする行が並ぶのは、`Row Area` の高さから帯の高さと
//             `rowGap` 1 つぶんを引いた残りとする」 -- the arithmetic that says
//             where the remainder's top edge is, and so where the cut falls.
//   `FR-098`  「⚠️ 依存線だけは 2 つの行のために描かれるので、「その行」がどちらを
//             指すかを別に定める（MUST）—— 両端ともピン止めした行にあるときに限り
//             帯の中に描いてよく、片方でもスクロールする行にあるときは残りの領域で
//             切ること（MUST）。⛔ 片端が帯に届くことを理由に線を丸ごと通しては
//             ならない（MUST NOT）—— 通すと、スクロールする側の端が帯の中を横切る」
//             (2026-09-01). Block (c) is this sentence and nothing else.
//   表 T-018a `RT-6` 「端点の一方がピン止めした行（`FR-098`）にあるときも、依存線を
//             描くこと（MUST）」 -- the row that stops "draw no line at all" from
//             answering the sentence above, and `RT-4a`, which it excepts.
//   表 T-203  `S-126` `pinnedGroupIds` ／ `S-127` `pinnedRowMax`（既定 `5`、so two
//             rows may be pinned at once）／ `S-78` `scrollGroupId` ／ `S-176`
//             `scrollGroupOffset`
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). ⭐ NOT ONE FILE UNDER `src/` WAS READ -- not a
// body, not a declaration. The imported names and the argument order of PI-19
// were copied from the neighbouring cases in tests/unit/fr-013-pointer-on-the-
// figure.test.ts and tests/unit/fr-097-comment-box-drawn.test.ts; the fixture
// builders are copied from tests/unit/fr-098-the-pinned-band.test.ts.
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY -- reported rather than guessed
// ---------------------------------------------------------------------------
//   1. ⭐ SETTLED 2026-09-01, AND NOW BLOCK (c) BELOW. This file first went out
//      reporting a hole: the amendment says 「その行のために描くものすべて」 and a
//      dependency line is drawn for TWO rows, so 「その行」 did not pick one. The
//      implementing body found the same hole on its own, and FR-098 gained the
//      sentence block (c) rests on. ⛔ NOTHING HERE WAS INVENTED WHILE THE HOLE
//      STOOD: the earlier cases used dependencies joining two scrolling rows
//      only, which was the reading no sentence disputed.
//   1a. A DEPENDENCY WITH ONE END ON A ROW SCROLLED CLEAR OFF THE TOP. `RT-4a`
//      of table T-018a drops a line 「端点のいずれかが描かれていないとき」 and
//      `RT-6` keeps it 「端点の一方がピン止めした行にあるとき」; a row cut away at
//      the top is neither pinned nor plainly 「描かれていない」, and no row says
//      which it is. ⛔ NO CASE BELOW USES ONE. Reported as a hole.
//   2. THE ROW HEADING SIDE. `svgFromSchedule` draws the schedule side only --
//      the picture it returns starts at `Row Area`'s x -- so the 「行見出しの側と
//      日程の側の両方を、同時に同じ高さへ上げること」 half has no surface here.
//   3. WHAT MECHANISM DOES THE CUTTING. The manuscript says 「切る」 and names no
//      means, so the reader below honours BOTH readings: a figure whose own
//      coordinates were shortened, and a figure left whole under an SVG
//      `clip-path`. ⛔ WHAT IT DOES NOT ACCEPT IS PAINTING OVER: the sentence is
//      「1 つも描いてはならない」, and the pinned row's own 地 carries a 濃さ
//      (`S-214`), so ink underneath a translucent ground would still be read.
//   4. WHETHER A ROW SCROLLED OFF THE TOP MAY BE DRAWN WHEN NOTHING IS PINNED.
//      With no pin the remainder is the whole `Row Area` and 「切る先」 reads as
//      its top edge, but that is a claim about the `Row Area` and not about the
//      band, and FR-098 governs only the band. The last block asks the opposite
//      question -- that nothing is cut that was not cut before -- and stops
//      there.

import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  layoutFromSchedule,
  type RowPlacement,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than trusted to memory
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const FR_098_NOT_UNDER = 'スクロールする行を帯の下へ潜らせてはならない（MUST NOT）'
const FR_098_EVERY_FIGURE = 'この禁止は、その行のために描くものすべてに当たる（MUST）'
const FR_098_NAMES_THE_FIVE =
  '行の地だけでなく、その行のバー・ラベル・進捗マーカー・依存線を含めて、帯が占める場所へ 1 つも描いてはならない（MUST NOT）'
const FR_098_GROUND_ALONE = '地だけを切ると、切られていない図形が留めた行の上に載る'
const FR_098_CUT_AT =
  '切る先は残りの領域の上端であり、`_assets/tbl-settings.md` の 表 T-203 の `S-78` が既に指しているものと同じである'
const FR_098_PINNED_HAS_GROUND = '留めた行そのものにも地を敷くこと（MUST）'
const FR_098_BAND_DOES_NOT_FLOW = '帯は流れないので、そこを指すと表示位置が二度と動かない'

// The 2026-09-01 sentence block (c) rests on, and the row of table T-018a that
// says the line is drawn at all.
const FR_098_LINE_IS_APART =
  '依存線だけは 2 つの行のために描かれるので、「その行」がどちらを指すかを別に定める（MUST）'
const FR_098_LINE_RULE =
  '両端ともピン止めした行にあるときに限り帯の中に描いてよく、片方でもスクロールする行にあるときは残りの領域で切ること（MUST）'
const FR_098_LINE_NOT_WHOLE = '片端が帯に届くことを理由に線を丸ごと通してはならない（MUST NOT）'
const RT_6 = '端点の一方がピン止めした行（`FR-098`）にあるときも、依存線を描くこと（MUST）'

// ---------------------------------------------------------------------------
// Settings and screen. Copied from tests/unit/fr-098-the-pinned-band.test.ts.
// ---------------------------------------------------------------------------

const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: {
    arrow: FLAT['shapeHeightOf.arrow'],
    chevron: FLAT['shapeHeightOf.chevron'],
    endpointSpan: FLAT['shapeHeightOf.endpointSpan'],
    milestone: FLAT['shapeHeightOf.milestone'],
    rectangle: FLAT['shapeHeightOf.rectangle'],
  },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    ...NESTED,
    scrollDate: '2026-01-01', // S-77, so the time axis has an origin
    scrollGroupId: null, // S-78
    scrollGroupOffset: 0, // S-176
    stackDirection: 'down', // S-58, so every y reads from the top
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

// ---------------------------------------------------------------------------
// The fixture
//
// ⭐ EVERY ROW CARRIES A DIFFERENT DATE RANGE AND A DIFFERENT NAME. The control
// below is subtracted from the picture element for element, and two rows drawn
// with identical figures would cancel each other out -- which is exactly the
// pair the defect produces (a scrolling row landing ON the pinned one). Giving
// each row its own x and its own label makes every element's source text
// unique, so nothing that is really drawn twice can hide behind that.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

/** Every nullable column spelled `null`; leaving one `undefined` reads as "set". */
const taskOf = (part: Record<string, unknown>): Task =>
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
    ...part,
  }) as unknown as Task

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

/** g1 .. g5, one Task each, every Task a week further along than the one above. */
const IDS = ['g1', 'g2', 'g3', 'g4', 'g5'] as const

/** The pinned row. ⚠️ THE LAST ONE, so its natural place is nowhere near the top. */
const PINNED = 'g5'

/** The row `S-78` points at, so `g1` and `g2` are scrolled off the top. */
const ANCHOR = 'g3'

/**
 * ⭐ THE ONLY DEPENDENCIES JOIN TWO SCROLLING ROWS.
 * `g1` -> `g2` is the one the ban is asked about; `g3` -> `g4` is its control,
 * drawn in the remainder where nothing forbids it. ⛔ NOTHING DEPENDS ON THE
 * PINNED ROW: see hole 1 in the header.
 */
type Links = readonly { readonly predecessorUid: number; readonly linkType: number }[]

const DEPENDENCY_OF: Readonly<Record<string, Links>> = {
  g2: [{ predecessorUid: 1, linkType: 1 }],
  g4: [{ predecessorUid: 3, linkType: 1 }],
}

/**
 * A document of one row per id, top to bottom, one Task on each.
 *
 * ⭐ `dependencyOf` IS THE ONLY THING BLOCK (c) VARIES. Two documents built from
 * the same ids and different dependencies hold the same rows at the same
 * heights, so subtracting one picture from the other leaves the dependency line
 * and nothing else.
 */
const scheduleOf = (
  ids: readonly string[],
  dependencyOf: Readonly<Record<string, Links>> = {},
): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: ids.length + 1,
    },
    calendars: [],
    tasks: ids.map((id, index) =>
      taskOf({
        uid: index + 1,
        name: `task ${id}`,
        start: dayAfter('2026-01-05', index * 7),
        finish: dayAfter('2026-01-05', index * 7 + 20),
        // An actual bar and a percentage, so the row really carries a progress
        // marker -- one of the five figures the amendment names.
        actualStart: dayAfter('2026-01-05', index * 7),
        actualDuration: 5,
        percentComplete: 40,
        dependencies: dependencyOf[id] ?? [],
      }),
    ),
    resources: [],
    assignments: [],
    taskGroups: ids.map((id, index) => groupOf({ id, order: index })),
    taskGroupMembers: ids.map((id, index) => ({ groupId: id, taskUid: index + 1, stackOrder: null })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const SCHEDULE = scheduleOf(IDS, DEPENDENCY_OF)

interface Drawn {
  readonly settings: DocumentSettings
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly svg: string
}

/** One pass of the chain the picture comes off: PI-35 -> PI-5 -> PI-6 -> PI-19. */
const drawOf = (schedule: Schedule, part: Record<string, unknown> = {}): Drawn => {
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen')
  return { settings, regions, layout, svg }
}

const draw = (part: Record<string, unknown> = {}): Drawn => drawOf(SCHEDULE, part)

const rowById = (drawn: Drawn, groupId: string): RowPlacement => {
  const found = drawn.layout.rows.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`this frame drew no row ${groupId}`)
  return found
}

// ---------------------------------------------------------------------------
// Reading the picture
//
// ⛔ NOTHING HERE KNOWS HOW THE RENDERER IS WRITTEN. The reader takes the string
// apart with no assumption beyond "it is SVG", it folds in an SVG `clip-path`
// wherever one applies, and it treats a figure as ink only where the clip lets
// it through. That is what makes a case below pass for a renderer that shortens
// a figure's own coordinates AND for one that leaves the figure whole under a
// clip -- the manuscript names neither means.
// ---------------------------------------------------------------------------

interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

interface Figure {
  readonly tag: string
  /** The element's own source. Its identity for the subtraction below. */
  readonly text: string
  readonly box: Box | null
  /** Every `clip-path` that applies, intersected. `null` where none does. */
  readonly clip: Box | null
  readonly opacity: number
}

/** Tags whose whole subtree defines something rather than drawing it. */
const SKIP = new Set(['defs', 'clipPath', 'marker', 'style', 'title', 'desc'])
const LEAF = new Set(['rect', 'line', 'circle', 'ellipse', 'polygon', 'polyline', 'path', 'text'])

const attrOf = (attrs: string, name: string): string | null => {
  const hit = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return hit === null ? null : (hit[1] ?? null)
}

const numberAttr = (attrs: string, name: string): number => {
  const raw = attrOf(attrs, name)
  return raw === null ? 0 : Number.parseFloat(raw)
}

const boxOfPoints = (points: readonly (readonly [number, number])[]): Box | null => {
  if (points.length === 0) return null
  return {
    x0: Math.min(...points.map((one) => one[0])),
    y0: Math.min(...points.map((one) => one[1])),
    x1: Math.max(...points.map((one) => one[0])),
    y1: Math.max(...points.map((one) => one[1])),
  }
}

const numbersOf = (raw: string): number[] =>
  (raw.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number)

const pairsOf = (raw: string): (readonly [number, number])[] => {
  const numbers = numbersOf(raw)
  const out: (readonly [number, number])[] = []
  for (let at = 0; at + 1 < numbers.length; at += 2) {
    out.push([numbers[at] as number, numbers[at + 1] as number])
  }
  return out
}

const rectBox = (attrs: string): Box => ({
  x0: numberAttr(attrs, 'x'),
  y0: numberAttr(attrs, 'y'),
  x1: numberAttr(attrs, 'x') + numberAttr(attrs, 'width'),
  y1: numberAttr(attrs, 'y') + numberAttr(attrs, 'height'),
})

/**
 * The box a leaf covers.
 *
 * ⚠️ A `text` IS MEASURED FROM ITS BASELINE UP BY ITS OWN `font-size`, and given
 * no width at all. FR-093 forbids the drawing side measuring a string, so this
 * file cannot know a label's width either; what it can say is that the glyphs
 * stand between the baseline and one font-size above it, which is all a case
 * below asks. ⭐ The x is left as a single point on purpose -- the band spans
 * the whole `Row Area`, so x is never the question.
 */
const boxOfElement = (tag: string, attrs: string): Box | null => {
  switch (tag) {
    case 'rect':
      return rectBox(attrs)
    case 'line':
      return boxOfPoints([
        [numberAttr(attrs, 'x1'), numberAttr(attrs, 'y1')],
        [numberAttr(attrs, 'x2'), numberAttr(attrs, 'y2')],
      ])
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
    case 'polygon':
    case 'polyline':
      return boxOfPoints(pairsOf(attrOf(attrs, 'points') ?? ''))
    case 'path':
      return boxOfPoints(pairsOf(attrOf(attrs, 'd') ?? ''))
    case 'text': {
      const x = numberAttr(attrs, 'x')
      const y = numberAttr(attrs, 'y')
      const size = attrOf(attrs, 'font-size') === null ? 0 : numberAttr(attrs, 'font-size')
      return { x0: x, y0: y - size, x1: x, y1: y }
    }
    default:
      return null
  }
}

const intersect = (one: Box | null, other: Box | null): Box | null => {
  if (one === null) return other
  if (other === null) return one
  return {
    x0: Math.max(one.x0, other.x0),
    y0: Math.max(one.y0, other.y0),
    x1: Math.min(one.x1, other.x1),
    y1: Math.min(one.y1, other.y1),
  }
}

/** Every `<clipPath id=...>` of a picture, as the rectangle it holds. */
const clipRectsOf = (svg: string): ReadonlyMap<string, Box> => {
  const out = new Map<string, Box>()
  const DEF = /<clipPath\b([^>]*)>([\s\S]*?)<\/clipPath>/g
  for (let hit = DEF.exec(svg); hit !== null; hit = DEF.exec(svg)) {
    const id = attrOf(hit[1] ?? '', 'id')
    const rect = /<rect\b([^>]*?)\/?>/.exec(hit[2] ?? '')
    if (id !== null && rect !== null) out.set(id, rectBox(rect[1] ?? ''))
  }
  return out
}

const clipOf = (attrs: string, rects: ReadonlyMap<string, Box>): Box | null => {
  const raw = attrOf(attrs, 'clip-path')
  if (raw === null) return null
  const id = /url\(#([^)]+)\)/.exec(raw)
  return id === null ? null : (rects.get(id[1] ?? '') ?? null)
}

const opacityOf = (attrs: string): number => {
  const raw = attrOf(attrs, 'opacity')
  return raw === null ? 1 : Number.parseFloat(raw)
}

const TAG = /<(\/?)([a-zA-Z][\w.-]*)((?:"[^"]*"|[^">])*?)(\/?)>/g

/** Every leaf figure a picture draws, with the groups above it folded in. */
const figuresOf = (svg: string): readonly Figure[] => {
  const rects = clipRectsOf(svg)
  const out: Figure[] = []
  const stack: { tag: string; clip: Box | null; opacity: number }[] = []
  let skipping = 0
  TAG.lastIndex = 0
  for (let hit = TAG.exec(svg); hit !== null; hit = TAG.exec(svg)) {
    const [whole, closing = '', tag = '', attrs = '', selfClosing = ''] = hit
    if (skipping > 0) {
      if (closing === '/' && SKIP.has(tag)) skipping -= 1
      else if (closing !== '/' && SKIP.has(tag) && selfClosing !== '/') skipping += 1
      continue
    }
    if (closing === '/') {
      if (stack.length > 0 && (stack[stack.length - 1] as { tag: string }).tag === tag) stack.pop()
      continue
    }
    if (SKIP.has(tag)) {
      if (selfClosing !== '/') skipping = 1
      continue
    }
    const own = clipOf(attrs, rects)
    if (!LEAF.has(tag)) {
      if (selfClosing !== '/') stack.push({ tag, clip: own, opacity: opacityOf(attrs) })
      continue
    }
    let text = whole
    if (tag === 'text' && selfClosing !== '/') {
      const close = svg.indexOf('</text>', hit.index)
      if (close >= 0) {
        text = svg.slice(hit.index, close + '</text>'.length)
        TAG.lastIndex = close + '</text>'.length
      }
    }
    out.push({
      tag,
      text,
      box: boxOfElement(tag, attrs),
      clip: stack.reduce<Box | null>((so, one) => intersect(so, one.clip), own),
      opacity: stack.reduce((so, one) => so * one.opacity, 1) * opacityOf(attrs),
    })
  }
  return out
}

/** Two places is what a drawn coordinate is rounded to, so this is its slack. */
const SLACK = 0.25

/**
 * Whether a figure puts ink inside a region.
 *
 * ⭐ THE VERTICAL IS THE STRICT ONE: a figure has to reach INTO the region, so a
 * line lying exactly on the region's edge -- which is where FR-098's own
 * 「境目を `Group Grid Lines` で示すこと（MUST）」 puts one -- is not counted.
 * ⚠️ THE HORIZONTAL IS THE LOOSE ONE, because a `text` is given no width above
 * and a zero-width box has to be able to fall inside.
 */
const inks = (figure: Figure, region: Box): boolean => {
  if (!(figure.opacity > 0)) return false
  const seen = intersect(figure.box, figure.clip)
  if (seen === null) return false
  if (seen.x1 < seen.x0 - SLACK || seen.y1 < seen.y0 - SLACK) return false
  return (
    seen.x0 <= region.x1 + SLACK &&
    seen.x1 >= region.x0 - SLACK &&
    seen.y0 < region.y1 - SLACK &&
    seen.y1 > region.y0 + SLACK
  )
}

/**
 * What the first picture draws MORE OFTEN than the second, element for element.
 *
 * ⛔ A MULTISET AND NOT A SET. The defect this file is about produces a second
 * copy of a figure in the very place the first one stands; a set difference
 * would let the second copy hide behind the first. Counting says "twice here,
 * once there" and hands back the extra one.
 */
const extraFigures = (picture: string, control: string): readonly Figure[] => {
  const left = new Map<string, number>()
  for (const figure of figuresOf(control)) {
    left.set(figure.text, (left.get(figure.text) ?? 0) + 1)
  }
  const out: Figure[] = []
  for (const figure of figuresOf(picture)) {
    const count = left.get(figure.text) ?? 0
    if (count > 0) left.set(figure.text, count - 1)
    else out.push(figure)
  }
  return out
}

// ---------------------------------------------------------------------------
// The band, computed from the manuscript's own arithmetic
// ---------------------------------------------------------------------------

/**
 * `LF-14`: 「帯に置く行の帯高（`LF-2`）を合計し、行と行のあいだに `rowGap` を
 * その数から 1 を引いた数だけ加えたもの」.
 */
const bandHeightOf = (drawn: Drawn, pinned: readonly string[]): number => {
  const heights = pinned.map((groupId) => rowById(drawn, groupId).height)
  const sum = heights.reduce((total, one) => total + one, 0)
  return sum + drawn.settings.rowGap * (heights.length - 1)
}

/** The rectangle the band occupies: the `Row Area`'s width, the band's height. */
const bandOf = (drawn: Drawn, pinned: readonly string[]): Box => {
  const area = drawn.regions.rowArea
  return {
    x0: area.x,
    y0: area.y,
    x1: area.x + area.width,
    y1: area.y + bandHeightOf(drawn, pinned),
  }
}

/**
 * `LF-14`: 「スクロールする行が並ぶのは、`Row Area` の高さから帯の高さと `rowGap`
 * 1 つぶんを引いた残りとする」, and the band sits at the top -- so this is the
 * remainder's top edge, which FR-098 names as 「切る先」.
 */
const remainderTopOf = (drawn: Drawn, pinned: readonly string[]): number =>
  drawn.regions.rowArea.y + bandHeightOf(drawn, pinned) + drawn.settings.rowGap

/** Everything above the cut, across the `Row Area`'s width. */
const aboveCutOf = (drawn: Drawn, pinned: readonly string[]): Box => {
  const area = drawn.regions.rowArea
  return {
    x0: area.x,
    y0: Number.NEGATIVE_INFINITY,
    x1: area.x + area.width,
    y1: remainderTopOf(drawn, pinned),
  }
}

const named = (figures: readonly Figure[]): readonly string[] => figures.map((one) => one.text)

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the manuscript still carries the 2026-08-31 amendment', () => {
  it('⛔ FR-098 still bans EVERY figure of a scrolling row from the band', () => {
    // ⛔ THE SENTENCE THIS WHOLE FILE EXISTS FOR. A manuscript that dropped it
    // fails here rather than leaving the cases below asserting something no row
    // asks for any more.
    expect(REQUIREMENTS).toContain(FR_098_NOT_UNDER)
    expect(REQUIREMENTS).toContain(FR_098_EVERY_FIGURE)
    expect(REQUIREMENTS).toContain(FR_098_NAMES_THE_FIVE)
    expect(REQUIREMENTS).toContain(FR_098_GROUND_ALONE)
  })

  it('⛔ FR-098 still cuts at the remainder’s top and still leaves the pinned row its ground', () => {
    expect(REQUIREMENTS).toContain(FR_098_CUT_AT)
    // Without this second half, cutting the band empty would answer the first.
    expect(REQUIREMENTS).toContain(FR_098_PINNED_HAS_GROUND)
    // The premise the control below stands on: the band does not scroll.
    expect(REQUIREMENTS).toContain(FR_098_BAND_DOES_NOT_FLOW)
  })

  it('⛔ FR-098 still settles the dependency line apart, and RT-6 still draws it', () => {
    // ⛔ THE 2026-09-01 SENTENCE. Until it landed this file reported the absence
    // of it as a hole and asserted nothing; block (c) exists only while these
    // hold, and a manuscript that took the sentence back out fails here rather
    // than leaving block (c) asserting a reading nobody decided.
    expect(REQUIREMENTS).toContain(FR_098_LINE_IS_APART)
    expect(REQUIREMENTS).toContain(FR_098_LINE_RULE)
    expect(REQUIREMENTS).toContain(FR_098_LINE_NOT_WHOLE)
    // Without RT-6, "draw no line at all" would answer the sentence above, and
    // both cases of block (c) would be asking for something no row requires.
    expect(REQUIREMENTS).toContain(RT_6)
  })
})

// ===========================================================================
// The instrument, checked against a picture whose extra ink is KNOWN EXACTLY
//
// ⭐ Rule 04 section 2: 「検査・契約・免除は、わざと壊して落ちることを確かめる
// まで、確かめたことにならない」. Every case below reports what the reader found
// inside the band; a reader that found nothing anywhere would report a clean
// band whatever the renderer did. So the reader is first run over pictures this
// file built itself, whose contents it therefore knows without asking anyone.
// ===========================================================================

describe('the reader finds ink in the band, and stops finding it once it is clipped', () => {
  const CONTROL = draw({ pinnedGroupIds: [PINNED], scrollGroupId: PINNED }).svg
  const BAND: Box = { x0: 100, y0: 200, x1: 900, y1: 240 }
  const spliced = (markup: string): string => CONTROL.replace('</svg>', `${markup}</svg>`)

  it('a bar spliced into the band is found', () => {
    const extra = extraFigures(spliced('<polygon points="300,205 400,205 400,235 300,235"/>'), CONTROL)
    expect(extra).toHaveLength(1)
    expect(extra.filter((one) => inks(one, BAND))).toHaveLength(1)
  })

  it('a label spliced into the band is found -- by its baseline and its font-size', () => {
    const extra = extraFigures(spliced('<text x="300" y="230" font-size="14">bar</text>'), CONTROL)
    expect(extra).toHaveLength(1)
    expect(extra.filter((one) => inks(one, BAND))).toHaveLength(1)
  })

  it('a hairline lying ON the band’s lower edge is NOT counted as being in the band', () => {
    // FR-098 (MUST) puts a `Group Grid Line` on that very edge, so a reader that
    // counted it would report a violation on a correct picture.
    const extra = extraFigures(spliced('<line x1="100" y1="240" x2="900" y2="240"/>'), CONTROL)
    expect(extra).toHaveLength(1)
    expect(extra.filter((one) => inks(one, BAND))).toHaveLength(0)
  })

  it('the same bar under a `clip-path` that starts below the band is NOT counted', () => {
    // ⭐ THIS IS WHAT KEEPS THE CASES BELOW HONEST ABOUT THE MEANS. The
    // manuscript says 「切る」 and names no mechanism; a renderer that leaves the
    // figure whole and hangs a clip over it has drawn nothing in the band.
    const extra = extraFigures(
      spliced(
        '<defs><clipPath id="probe"><rect x="0" y="240" width="2000" height="2000"/></clipPath></defs>' +
          '<g clip-path="url(#probe)"><polygon points="300,205 400,205 400,235 300,235"/></g>',
      ),
      CONTROL,
    )
    expect(extra, 'the spliced bar is still an extra figure').toHaveLength(1)
    expect(extra.filter((one) => inks(one, BAND)), 'but no ink of it lands in the band').toHaveLength(
      0,
    )
  })

  it('⛔ all five figures the amendment names are caught, spliced into one band', () => {
    // 「行の地だけでなく、その行のバー・ラベル・進捗マーカー・依存線を含めて、帯が
    //   占める場所へ 1 つも描いてはならない（MUST NOT）」 -- so a reader that saw
    //   only rectangles, or only bars, would report a clean band on the very
    //   picture the 2026-08-31 measurement describes. This is that picture,
    //   assembled here so its contents are known without asking the renderer:
    //   a row's ground, its plan bar, its progress marker, its label and a
    //   dependency line, every one of them standing in the band.
    const trespass =
      '<rect x="100" y="205" width="800" height="30" fill="hsl(214 40% 97%)"/>' +
      '<polygon points="300,208 500,208 500,232 300,232" fill="hsl(214 46% 80%)"/>' +
      '<circle cx="520" cy="220" r="8" fill="#ffffff"/>' +
      '<text x="320" y="228" font-size="14">task elsewhere</text>' +
      '<polyline points="540,220 560,220 560,260 600,260" fill="none" stroke="hsl(26 88% 44%)"/>'
    const extra = extraFigures(spliced(trespass), CONTROL)

    expect(extra, 'the five figures are all extra').toHaveLength(5)
    expect(
      extra.filter((one) => inks(one, BAND)).map((one) => one.tag).sort(),
      'and every one of the five is reported as ink in the band',
    ).toEqual(['circle', 'polygon', 'polyline', 'rect', 'text'])
  })

  it('two copies of one figure are not mistaken for one -- the subtraction counts', () => {
    // ⛔ THE DEFECT'S OWN SHAPE: a scrolling row drawn exactly where the pinned
    // one stands writes a SECOND identical element. A set difference would lose
    // it; this reader must hand it back.
    const already = figuresOf(CONTROL)[0]
    if (already === undefined) throw new Error('the control picture drew nothing')
    expect(extraFigures(spliced(already.text), CONTROL)).toHaveLength(1)
  })
})

// ===========================================================================
// (a) The frame these cases are read from
// ===========================================================================

describe('the premises every case below stands on', () => {
  const CONTROL = draw({ pinnedGroupIds: [PINNED], scrollGroupId: 'g1' })
  const SCROLLED = draw({ pinnedGroupIds: [PINNED], scrollGroupId: ANCHOR })

  it('unscrolled, the pinned row is the band and every other row is below it', () => {
    // ⭐ WITHOUT THIS THE SUBTRACTION WOULD SUBTRACT THE WRONG PICTURE.
    const band = bandOf(CONTROL, [PINNED])
    expect(rowById(CONTROL, PINNED).y).toBeCloseTo(CONTROL.regions.rowArea.y, 6)
    expect(band.y1).toBeGreaterThan(band.y0)
    for (const id of IDS.filter((one) => one !== PINNED)) {
      expect(rowById(CONTROL, id).y, `${id} unscrolled`).toBeGreaterThanOrEqual(
        remainderTopOf(CONTROL, [PINNED]) - SLACK,
      )
    }
  })

  it('scrolled, the anchor row stands at the remainder’s top and the band has not moved', () => {
    // 「`S-78` … が指すのは、スクロールする残りの領域の上端とすること（MUST）。
    //   帯の上端としてはならない（MUST NOT）—— 帯は流れないので…」
    // ⭐ THE SECOND HALF IS WHAT LETS THE CONTROL BE SUBTRACTED: the band is the
    // same picture at either scroll position, so whatever survives the
    // subtraction inside the band came from a row that scrolls.
    expect(rowById(SCROLLED, ANCHOR).y).toBeCloseTo(remainderTopOf(SCROLLED, [PINNED]), 6)
    expect(rowById(SCROLLED, PINNED).y).toBeCloseTo(rowById(CONTROL, PINNED).y, 6)
    expect(rowById(SCROLLED, PINNED).height).toBeCloseTo(rowById(CONTROL, PINNED).height, 6)
  })

  it('⛔ the subtraction does not cancel the whole picture away', () => {
    // ⭐ THE NON-VACUITY GUARD FOR BLOCK (b). Those cases say "the extras that
    // land in the band are none"; if the subtraction left NOTHING at all they
    // would say that of any renderer whatever. The two pictures are scrolled to
    // different rows, so the rows that scroll are drawn at different heights in
    // each, and the subtraction has to hand those back.
    expect(extraFigures(SCROLLED.svg, CONTROL.svg).length).toBeGreaterThan(0)
  })

  it('the scroll really does carry rows off the top -- there are two above the anchor', () => {
    // ⛔ WITHOUT THIS, A PICTURE WITH NOTHING ABOVE THE CUT WOULD PASS EVERY CASE
    // BELOW WHILE ASKING NOTHING. ⚠️ It is asked of the UNSCROLLED picture on
    // purpose: a fix that stops drawing those rows once they are off the top is
    // a fix, and this premise must not demand the defect in order to hold.
    const anchorAt = IDS.indexOf(ANCHOR)
    expect(anchorAt).toBeGreaterThan(0)
    for (const id of IDS.slice(0, anchorAt)) {
      expect(rowById(CONTROL, id).y, `${id} is drawn when nothing is scrolled past`).toBeGreaterThan(
        0,
      )
    }
  })
})

// ===========================================================================
// (b) D-170 -- nothing drawn for a scrolling row reaches the band
// ===========================================================================

describe('FR-098 (MUST NOT) -- no figure of a scrolling row is drawn where the band is', () => {
  const CONTROL = draw({ pinnedGroupIds: [PINNED], scrollGroupId: 'g1' })

  it('⛔ MUST NOT: with the view scrolled, the band holds no ink but the band’s own', () => {
    // 「スクロールする行を帯の下へ潜らせてはならない（MUST NOT）」 with
    // 「⛔ この禁止は、その行のために描くものすべてに当たる（MUST）—— 行の地だけ
    //   でなく、その行のバー・ラベル・進捗マーカー・依存線を含めて、帯が占める
    //   場所へ 1 つも描いてはならない（MUST NOT）」.
    //
    // ⭐ HOW IT COULD FAIL, AND WHAT WOULD HAVE TO CHANGE FOR IT TO PASS: the
    // band is written identically in both pictures (premise (a)), so every
    // figure that survives the subtraction belongs to a row that scrolls. For
    // this list to be empty, every such figure has to be either moved out of the
    // band, shortened, or covered by a clip that starts at the cut. A renderer
    // that cuts the row's 地 alone -- the 2026-08-31 measurement -- leaves its
    // bar, its actual bar, its marker and its label here, and this fails naming
    // them.
    const scrolled = draw({ pinnedGroupIds: [PINNED], scrollGroupId: ANCHOR })
    const band = bandOf(scrolled, [PINNED])
    const trespassing = extraFigures(scrolled.svg, CONTROL.svg).filter((one) => inks(one, band))

    expect(
      named(trespassing),
      'FR-098 (MUST NOT): 帯が占める場所へ 1 つも描いてはならない',
    ).toEqual([])
  })

  it('⛔ MUST: the cut falls at the remainder’s top, so nothing scrolling is above it either', () => {
    // 「⭐ 切る先は残りの領域の上端であり、… `S-78` が既に指しているものと同じで
    //   ある —— ⛔ 新しい値を作らない」.
    // ⚠️ A STRICTLY WIDER CLAIM THAN THE ONE ABOVE, and it is the one that
    // catches a row scrolled clear off the top: `g1` stands two rows before the
    // anchor, so its figures land above the `Row Area` itself, over the ruler.
    // ⭐ The line is not a new number: it is the remainder's top edge, which
    // `LF-14` already fixes and which premise (a) measured the anchor row at.
    const scrolled = draw({ pinnedGroupIds: [PINNED], scrollGroupId: ANCHOR })
    const trespassing = extraFigures(scrolled.svg, CONTROL.svg).filter((one) =>
      inks(one, aboveCutOf(scrolled, [PINNED])),
    )

    expect(named(trespassing), 'FR-098 (MUST): 切る先は残りの領域の上端').toEqual([])
  })

  it('⛔ MUST: a row STRADDLING the cut is cut, not left whole and not dropped whole', () => {
    // `S-176`'s half-送り puts the anchor row's own top edge above the cut while
    // its foot stays in the remainder, so 「帯が占める場所へ 1 つも描いてはならない」
    // and 「1 行も描けなくなってはならない」 are asked at once: the row's ink has
    // to stop at the cut and go on below it.
    //
    // ⭐ HOW IT COULD FAIL: a renderer that only drops whole rows leaves this
    // one whole, and its upper half lands in the band -- the first expectation
    // fails. A renderer that drops it entirely passes the first and fails the
    // second.
    const straddling = draw({
      pinnedGroupIds: [PINNED],
      scrollGroupId: ANCHOR,
      scrollGroupOffset: 0.5,
    })
    const band = bandOf(straddling, [PINNED])
    const cut = remainderTopOf(straddling, [PINNED])
    const area = straddling.regions.rowArea
    const extras = extraFigures(straddling.svg, CONTROL.svg)

    expect(
      named(extras.filter((one) => inks(one, band))),
      'FR-098 (MUST NOT): 帯が占める場所へ 1 つも描いてはならない',
    ).toEqual([])
    expect(
      extras.filter((one) =>
        inks(one, { x0: area.x, y0: cut, x1: area.x + area.width, y1: area.y + area.height }),
      ).length,
      'FR-098 (MUST NOT): スクロールする行が 1 行も描けなくなってはならない',
    ).toBeGreaterThan(0)
  })
})

// ===========================================================================
// (c) The dependency line, which is drawn for TWO rows
//
// 「⚠️ 依存線だけは 2 つの行のために描かれるので、「その行」がどちらを指すかを別に
//   定める（MUST）—— 両端ともピン止めした行にあるときに限り帯の中に描いてよく、
//   片方でもスクロールする行にあるときは残りの領域で切ること（MUST）。⛔ 片端が帯に
//   届くことを理由に線を丸ごと通してはならない（MUST NOT）—— 通すと、スクロール
//   する側の端が帯の中を横切る」 (FR-098, 2026-09-01)
//
// ⭐ SIX ROWS AND TWO PINS. Two pinned rows are what makes 「両端ともピン止めした
// 行」 possible at all -- `S-127`'s default of 5 admits them -- and the band is
// then two rows tall, so a line joining the two pinned rows has nowhere to be
// BUT the band. `d4` sits in the remainder, so a line from a pinned row to it
// has to cross the cut: that is the straddle 「丸ごと通してはならない」 is about.
// ===========================================================================

describe('FR-098 (MUST) -- a dependency line is cut by which rows its two ends are on', () => {
  const DEP_IDS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'] as const
  /** Two pins, so the band is two rows tall and can hold both ends of a line. */
  const DEP_PINS = ['d5', 'd6']
  /** `d1` and `d2` are carried off the top; `d3` and `d4` stay in the remainder. */
  const DEP_ANCHOR = 'd3'
  const WHERE = { pinnedGroupIds: DEP_PINS, scrollGroupId: DEP_ANCHOR }

  /** uid 5 is the Task on `d5`, uid 6 the one on `d6`, uid 4 the one on `d4`. */
  const BARE = scheduleOf(DEP_IDS)
  const BOTH_PINNED = scheduleOf(DEP_IDS, { d6: [{ predecessorUid: 5, linkType: 1 }] })
  const ONE_PINNED = scheduleOf(DEP_IDS, { d4: [{ predecessorUid: 6, linkType: 1 }] })

  const drawn = (schedule: Schedule): Drawn => drawOf(schedule, WHERE)
  const BAND = bandOf(drawn(BARE), DEP_PINS)
  const CUT = remainderTopOf(drawn(BARE), DEP_PINS)
  const AREA = drawn(BARE).regions.rowArea
  const REMAINDER: Box = { x0: AREA.x, y0: CUT, x1: AREA.x + AREA.width, y1: AREA.y + AREA.height }

  /**
   * What adding ONE dependency adds to the picture, and nothing else.
   *
   * ⛔ THE TWO DOCUMENTS DIFFER IN THE `dependencies` COLUMN ALONE, so every row,
   * bar, marker and label is written identically in both and subtracts away.
   * ⭐ Nothing here has to know what tag a dependency line is drawn with.
   */
  const lineOf = (schedule: Schedule): readonly Figure[] =>
    extraFigures(drawn(schedule).svg, drawn(BARE).svg)

  it('the premise: both pinned rows are wholly inside the band, and `d4` wholly below the cut', () => {
    // ⛔ WITHOUT THIS THE TWO CASES BELOW WOULD BE ABOUT NOTHING. It is what
    // makes 「両端ともピン止めした行」 a line that can only be in the band, and
    // 「片方でもスクロールする行」 a line that has to cross the cut -- so a picture
    // that passed the second one whole would necessarily ink the band.
    const frame = drawn(BARE)
    for (const id of DEP_PINS) {
      const row = rowById(frame, id)
      expect(row.y, `${id} starts inside the band`).toBeGreaterThanOrEqual(BAND.y0 - SLACK)
      expect(row.y + row.height, `${id} ends inside the band`).toBeLessThanOrEqual(BAND.y1 + SLACK)
    }
    const scrolling = rowById(frame, 'd4')
    expect(scrolling.y, 'd4 stands below the cut').toBeGreaterThanOrEqual(CUT - SLACK)
  })

  it('the premise: adding a dependency moves no row, so the subtraction leaves the line alone', () => {
    // ⭐ THE CLAIM `lineOf` RESTS ON. If a dependency shifted the rows, the
    // extras would be the whole picture and both cases below would be reading
    // bars as though they were the line.
    expect(drawn(BOTH_PINNED).layout.rows).toEqual(drawn(BARE).layout.rows)
    expect(drawn(ONE_PINNED).layout.rows).toEqual(drawn(BARE).layout.rows)
  })

  it('⛔ MUST: with BOTH ends on pinned rows the line is drawn, and it is drawn in the band', () => {
    // 「両端ともピン止めした行にあるときに限り帯の中に描いてよく」 with `RT-6`
    //   (MUST): 「端点の一方がピン止めした行（`FR-098`）にあるときも、依存線を描く
    //   こと（MUST）」 -- so the line exists, and by the premise above its two
    //   endpoints are both inside the band, which leaves it nowhere else to be.
    //
    // ⭐ HOW IT COULD FAIL, AND WHAT WOULD HAVE TO CHANGE: a renderer that
    // answers block (b) by hanging ONE clip over every dependency line -- the
    // cheapest reading of 「依存線を … 残りの領域で切る」 -- cuts this line away
    // too, and the second expectation drops to zero. ⛔ THAT IS THE OVER-CUT
    // 「に限り」 permits and this case forbids.
    const line = lineOf(BOTH_PINNED)

    expect(line.length, 'RT-6 (MUST): 依存線を描くこと').toBeGreaterThan(0)
    expect(
      line.filter((one) => inks(one, BAND)).length,
      'FR-098 (MUST): 両端ともピン止めした行にあるときに限り帯の中に描いてよく',
    ).toBeGreaterThan(0)
  })

  it('⛔ MUST NOT: with ONE end on a scrolling row the line is cut at the remainder, not passed whole', () => {
    // 「片方でもスクロールする行にあるときは残りの領域で切ること（MUST）。⛔ 片端が
    //   帯に届くことを理由に線を丸ごと通してはならない（MUST NOT）—— 通すと、
    //   スクロールする側の端が帯の中を横切る」, with `RT-6` (MUST) keeping the line
    //   drawn at all.
    //
    // ⭐ HOW IT COULD FAIL, AND WHAT WOULD HAVE TO CHANGE: the line's
    // predecessor is on `d6`, wholly inside the band, and its successor on `d4`,
    // wholly below the cut (premise above) -- so a route joining them crosses the
    // cut by construction. Passing it whole, which is what 「片端が帯に届くこと
    // を理由に」 describes, leaves ink in the band and the second expectation
    // names it. ⛔ AND DROPPING THE LINE INSTEAD IS NOT THE FIX: `RT-6` requires
    // it drawn, so the first and third expectations fail on a picture that
    // simply left it out.
    const line = lineOf(ONE_PINNED)

    expect(line.length, 'RT-6 (MUST): 端点の一方がピン止めした行にあるときも、依存線を描くこと')
      .toBeGreaterThan(0)
    expect(
      named(line.filter((one) => inks(one, BAND))),
      'FR-098 (MUST NOT): 片端が帯に届くことを理由に線を丸ごと通してはならない',
    ).toEqual([])
    expect(
      line.filter((one) => inks(one, REMAINDER)).length,
      'FR-098 (MUST): 残りの領域で切ること -- 切るのであって、消すのではない',
    ).toBeGreaterThan(0)
  })
})

// ===========================================================================
// (d) The other half -- cutting everything away is not a fix
// ===========================================================================

describe('FR-098 (MUST) -- the pinned row’s own figures are still drawn in the band', () => {
  const SCROLLED = draw({ pinnedGroupIds: [PINNED], scrollGroupId: ANCHOR })
  const BAND = bandOf(SCROLLED, [PINNED])
  const inBand = (): readonly Figure[] => figuresOf(SCROLLED.svg).filter((one) => inks(one, BAND))

  // ⭐ ATTRIBUTION COMES FROM THE BLOCK ABOVE: the only row allowed to put ink
  // in the band is the pinned one, so a figure found in the band is either the
  // pinned row's or a violation the previous block has already reported. These
  // cases therefore ask only that the band is NOT EMPTY of each kind.

  it('⛔ MUST: the pinned row’s ground is laid, spanning the `Row Area`', () => {
    // 「⭐⭐ 留めた行そのものにも地を敷くこと（MUST）」.
    // ⭐ HOW IT COULD FAIL: a fix that clipped the whole band away, or one that
    // never drew the pinned row's ground, leaves no full-width rectangle here.
    const grounds = inBand().filter(
      (one) =>
        one.tag === 'rect' &&
        one.box !== null &&
        Math.abs(one.box.x1 - one.box.x0 - SCROLLED.regions.rowArea.width) <= 1,
    )

    expect(grounds.length, 'FR-098 (MUST): 留めた行そのものにも地を敷くこと').toBeGreaterThan(0)
  })

  it('⛔ MUST: the pinned row’s bar and its progress marker are still drawn in the band', () => {
    // 「ピン止めした行を … 画面に表示し続けること」 -- a band with the row's ground
    // and nothing else is not the row.
    const found = inBand()
    expect(found.filter((one) => one.tag === 'polygon').length, 'the pinned row’s bar').toBeGreaterThan(
      0,
    )
    expect(
      found.filter((one) => one.tag === 'circle').length,
      'the pinned row’s progress marker',
    ).toBeGreaterThan(0)
  })

  it('⛔ MUST: the pinned row’s own label is still drawn in the band', () => {
    // ⭐ THE ONE FIGURE THIS FILE CAN NAME OUTRIGHT: the fixture gave every row a
    // different name, so the label reading `task g5` can only be the pinned
    // row's.
    const labels = inBand().filter((one) => one.tag === 'text' && one.text.includes(`task ${PINNED}`))

    expect(labels.length, 'FR-098 (MUST): ピン止めした行を … 表示し続けること').toBe(1)
  })
})

// ===========================================================================
// (e) With nothing pinned, nothing is cut
// ===========================================================================

describe('FR-098 -- with nothing pinned there is no band, and so no cut', () => {
  it('⛔ the top row is drawn at the `Row Area`’s top, whole', () => {
    // ⭐ HOW IT COULD FAIL: a renderer that computed the cut as
    // 「`Row Area` の上端 ＋ 帯の高さ ＋ `rowGap`」 without first asking whether
    // anything is pinned would push the line one `rowGap` down and shave the top
    // row. Nothing is pinned here, so `LF-14`'s band is empty and the remainder
    // is the whole `Row Area`.
    const plain = draw({ pinnedGroupIds: [] })
    const area = plain.regions.rowArea
    expect(rowById(plain, 'g1').y).toBeCloseTo(area.y, 6)

    const cut = { x0: area.x, y0: area.y, x1: area.x + area.width, y1: area.y + rowById(plain, 'g1').height }
    expect(
      figuresOf(plain.svg).filter((one) => inks(one, cut)).length,
      'the top row is drawn',
    ).toBeGreaterThan(0)
  })

  it('⛔ no figure of the picture is clipped away when nothing is pinned', () => {
    // The document is five rows tall and the screen holds them all, so every
    // figure the renderer emits belongs on the screen. ⭐ HOW IT COULD FAIL: a
    // clip hung over the drawing unconditionally -- the cheapest way to answer
    // block (b) -- shortens at least one of these.
    const plain = draw({ pinnedGroupIds: [] })
    const cut = figuresOf(plain.svg).filter((one) => {
      const seen = intersect(one.box, one.clip)
      return (
        one.box !== null &&
        (seen === null ||
          seen.x0 > one.box.x0 + SLACK ||
          seen.y0 > one.box.y0 + SLACK ||
          seen.x1 < one.box.x1 - SLACK ||
          seen.y1 < one.box.y1 - SLACK)
      )
    })

    expect(named(cut), 'nothing is clipped when nothing is pinned').toEqual([])
  })

  it('⛔ every row of the document puts its bar and its label on the screen', () => {
    // ⭐ THE SHAPE THE BLOCK CLAIMS IS UNCHANGED, counted: five rows, five bars,
    // five labels, each row's ground. A stray cut takes one of them away.
    const plain = draw({ pinnedGroupIds: [] })
    const figures = figuresOf(plain.svg)
    const area = plain.regions.rowArea
    const rows: Box = { x0: area.x, y0: area.y, x1: area.x + area.width, y1: area.y + area.height }

    for (const id of IDS) {
      expect(
        figures.filter((one) => one.tag === 'text' && one.text.includes(`task ${id}`) && inks(one, rows))
          .length,
        `the label of ${id}`,
      ).toBe(1)
    }
    expect(
      figures.filter((one) => one.tag === 'polygon' && inks(one, rows)).length,
      'a plan bar and an actual bar for each of the five rows',
    ).toBeGreaterThanOrEqual(IDS.length)
  })
})
