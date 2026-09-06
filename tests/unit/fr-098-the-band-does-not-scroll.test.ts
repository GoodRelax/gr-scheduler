// FR-098 after the ruling of 2026-09-06 (CR-363): a pinned band that does not
// fit is CUT, not sent. The rows that do not fit are simply not drawn, and the
// person who put the pins there takes one out to get them back.
//
// Unit under test: `layoutFromSchedule` (PI-5 of table T-064, unit UF-19 of
// table T-075). ⭐ IT IS THE UNIT THE RULE NAMES, and the same one the sibling
// file tests/unit/fr-098-the-pinned-band.test.ts asks about `LF-14`: the new
// clauses are about WHERE THE BAND ENDS and WHICH ROWS SURVIVE IT, and both of
// those are the row chain this unit computes. ⛔ Not the renderer -- nothing
// here reads a picture; a row that is not drawn is a row this unit does not
// return.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/. ⭐ THAT IS ALSO WHY THIS IS NOT tests/system/: the rule is
// arithmetic over one function's answer, and a Playwright sweep of the shipped
// DOM would measure the same arithmetic through three more layers.
//
// ⚠️ This file carries Japanese inside the strings that pin its cases to the
// manuscript. 03-implementation.md section 5 admits that: a pinning string has
// to be the manuscript's own characters or it pins nothing. Every line of prose
// is English.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHAT CHANGED ON 2026-09-06, AND WHAT MUST NOT BE ASSERTED
// ---------------------------------------------------------------------------
//
// The user's ruling, verbatim: 「特別な対応は要らない。ピンが多すぎてスクロール
// できなくなったら、ユーザーが自分でピンを抜く」.
//
// FR-098 USED TO SAY 「ピン止めした行が画面に収まらないときは、ピン止めした行の
// 並びを縦にスクロールできるようにすること（MUST）」. ⛔ THAT MUST IS GONE. No case
// in this file asks the band to scroll, and the premise block below FAILS if the
// sentence ever comes back -- a test that held a withdrawn clause would be worse
// than no test, because it would argue for the behaviour the ruling refused.
//
// TWO MUSTs ARRIVED IN ITS PLACE, both in FR-098's STATEMENT:
//
//   「⭐⭐ **ピン止めした行が画面に収まらないときは、入りきらない行を描かないこと
//     （MUST）。帯を縦にスクロールできるようにしてはならない（MUST NOT）**
//     （利用者の裁定 2026-09-06 …）—— **ピンは人が置いたものであり、置きすぎた
//     ことは人が知っている。道具が送り機構を生やすより、抜けば直るほうが読み解き
//     やすい。**⚠️ **実測（2026-09-06、1920×1080、実績を重ねた高い行を `S-127` の
//     既定の 5 本）: 帯 986px に対し `Row Area` は 958px。**⛔ **上限どおりの本数で
//     溢れるので、これは例外的な使い方ではない。**⭐ **通知は出さない（同裁定）**」
//
// ⭐ THE MEASURED NOTE IS WHY THE FIXTURE BELOW IS NOT AN EXTREME. The manuscript
// says the overflow happens at `S-127`'s OWN DEFAULT of 5 pins, so every frame
// here pins exactly `pinnedRowMax` rows and no more.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON -- INCLUDING THE ONES THAT DID NOT MOVE
// ---------------------------------------------------------------------------
//
//   `FR-098`  「ピン止めした行が画面に収まらないときは、入りきらない行を描かない
//             こと（MUST）」 -- block (b).
//   `FR-098`  「帯を縦にスクロールできるようにしてはならない（MUST NOT）」 -- block
//             (a) reads it as the band's bottom edge: a band that may not be sent
//             cannot reach past the region that holds it, so what does not fit is
//             cut instead.
//   `FR-098`  「帯は `Row Area` の中に置き、スクロールする行が並ぶのはその残りと
//             すること（MUST）」 -- UNTOUCHED, and the wall block (a) measures
//             against.
//   `FR-098`  「ピン止めした行どうしに優劣を設けてはならない（MUST NOT）—— 固定した
//             順に上から並べる」 -- UNTOUCHED, and what makes the surviving rows a
//             PREFIX of the pin order rather than any subset of the same size.
//   `FR-098`  「⛔ 帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなく
//             なってはならない（MUST NOT）」 -- UNTOUCHED. ⭐ THE FIXTURE IS BUILT
//             SO IT IS NOT BREACHED: the pinned rows are tall and the rest are
//             natural height, so the cut band always leaves room for a scrolling
//             row, and a premise case below measures that it does. ⛔ A case that
//             asserted "nothing scrolls when five tall rows are pinned" would
//             contradict this MUST NOT, so none does.
//   `FR-098`  「行見出しの側と日程の側の両方を、同時に同じ高さへ上げること（MUST）」
//             -- UNTOUCHED, and out of this unit's reach for the reason the
//             sibling file already gives (SC-1 makes the heading side follow the
//             drawn rows, so a case here would compare a copy with its original).
//   表 T-221  `LF-14` 「帯の高さは、帯に置く行の帯高（`LF-2`）を合計し、行と行のあいだ
//             に `rowGap` をその数から 1 を引いた数だけ加えたものとする … スクロール
//             する行が並ぶのは、`Row Area` の高さから帯の高さと `rowGap` 1 つぶんを
//             引いた残りとする」 -- the arithmetic block (c) reads the remainder's
//             top edge from.
//   `FR-042`  「指定した高さは下限として扱うこと（MUST）」 with 表 T-221 `LF-3`
//             「`TaskGroup.height` の指定があるときは `FR-042` が優先する」 -- how the
//             fixture makes a row TALL without inventing a setting.
//   表 T-203  `S-126` `pinnedGroupIds` ／ `S-127` `pinnedRowMax`（既定 `5`）／
//             `S-12` `rowGap`（既定 `8`）／ `S-76` `zoomY`（既定 `1`, so a height
//             given in the document is the height on screen).
//   `U-50`    「`Schedule Canvas` から `Time Ruler` の帯と余白を除いた、`Rows` が
//             並ぶ領域」 -- the region every bound below is measured against.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported
// declarations `layoutFromSchedule`, `ScheduleLayout`, `RowPlacement`,
// `regionsFromScreen`, `ScreenRegions`, `ScreenEnvironment`, `SETTINGS_DEFAULTS`
// and the entity types the fixtures are built from -- names and argument order
// only. ⛔ NO FUNCTION BODY WAS READ, and no frame was run to decide what a case
// should say: every number below is derived from `LF-14`, `LF-3` and `FR-042`
// before the suite was ever started. ⭐ The fixture builders are copied from
// tests/unit/fr-098-the-pinned-band.test.ts.
//
// ---------------------------------------------------------------------------
// ⚠️ EXPECTED TO BE RED WHEN WRITTEN (2026-09-06)
// ---------------------------------------------------------------------------
// CR-363 records the defect these cases are for as still standing -- 「いま帯は
// 領域の外まで伸びている（実測: 下端 1090 ＞ 1062）」 -- and the repair is being
// written by another body at the same time as this file. ⛔ NOT ONE ASSERTION
// WAS WEAKENED TO GET A GREEN: a case that fails here is reporting the defect the
// ruling named, which is the whole reason the ruling exists.
//
// MEASURED WHEN THIS FILE WAS WRITTEN (2026-09-06, 12 green, 5 red):
//
//   RED  (a) the band stays inside the `Row Area`      band bottom 1106 > 683
//   RED  (b) a pinned row the band cannot hold is not drawn   5 pins, 5 drawn
//   RED  (c) while pinned into an overflowing band, that row is drawn nowhere
//   RED  (c) unpin it and it comes back INSIDE the region       912 > 682
//   RED  (c) the remainder is inside the region at all         1162 > 683
//
// ⭐ EVERY CONTROL AND EVERY PREMISE WAS GREEN. That is the shape an honest red
// has: the one-pin frame and the natural-height frame behave exactly as the
// manuscript says, and only the frame that overflows misbehaves -- so the five
// reds are the defect the ruling named and nothing else.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY -- reported rather than guessed
// ---------------------------------------------------------------------------
//   1. THAT NO NOTICE IS RAISED. 「⭐ 通知は出さない（同裁定）—— 表 T-233 に行を
//      足さない」 is a rule about a TABLE, and `layoutFromSchedule` raises no
//      notices at all, so a case here could only assert that a function without
//      that responsibility did not take it on. ⭐ The premise block below does
//      hold the sentence verbatim, which is as far as a unit over
//      `layoutFromSchedule` can honestly go; whether table T-233 stayed the same
//      length belongs to a case over that table.
//   2. WHICH ROW OF THE OVERFLOWING BAND IS THE FIRST TO GO, BEYOND "a prefix
//      survives". 「固定した順に上から並べる」 fixes the ORDER, and the new MUST
//      fixes that what does not fit is not drawn; together they make the drawn
//      set a prefix of the pin order. ⛔ No case asks for an exact count, because
//      the count is a function of `LF-2` heights the manuscript computes rather
//      than states.
//   3. WHETHER A SCROLLING ROW THAT RUNS PAST THE BOTTOM OF THE `Row Area` IS
//      DROPPED OR CLIPPED. The new MUST is about the BAND. Block (c) therefore
//      asks only that the unpinned row is BACK IN THE CHAIN at the remainder's
//      top -- not that it fits there. ⚠️ It cannot fit: with rows of one height,
//      a band cut at capacity always leaves less than one row of remainder, so
//      "the row comes back whole" is arithmetically impossible and would be a
//      dishonest assertion. Reported rather than asserted.

import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import {
  layoutFromSchedule,
  type RowPlacement,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than trusted to memory
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const DESIGN = readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8')

/**
 * ⭐ THE TWO CLAUSES OF 2026-09-06, quoted long enough that they cannot drift
 * out from under these cases one word at a time. Both run back through the
 * sentence that precedes them, which is the UNTOUCHED no-precedence MUST NOT --
 * so a rewrite of either neighbour is caught here rather than in an assertion.
 */
const FR_098_NOT_FITTING_NOT_DRAWN =
  '**ピン止めした行どうしに優劣を設けてはならない（MUST NOT）** —— 固定した順に上から並べる。⭐⭐ **ピン止めした行が画面に収まらないときは、入りきらない行を描かないこと（MUST）'
const FR_098_BAND_DOES_NOT_SCROLL =
  '固定した順に上から並べる。⭐⭐ **ピン止めした行が画面に収まらないときは、入りきらない行を描かないこと（MUST）。帯を縦にスクロールできるようにしてはならない（MUST NOT）'

/** The ruling itself, so the pair above cannot be read as an editor's flourish. */
const RULING_2026_09_06 =
  '特別な対応は要らない。ピンが多すぎてスクロールできなくなったら、ユーザーが自分でピンを抜く'

/** ⛔ The measurement that says the overflow happens at `S-127`'s own default. */
const FR_098_MEASURED =
  '実測（2026-09-06、1920×1080、実績を重ねた高い行を `S-127` の既定の 5 本）: 帯 986px に対し `Row Area` は 958px'

/** ⛔ The MUST CR-363 withdrew. Nothing here may hold it. */
const FR_098_WITHDRAWN_SCROLLABLE_BAND = 'ピン止めした行の並びを縦にスクロールできるようにすること'

/** ⭐ 通知は出さない -- the half of the ruling table T-233 answers for. */
const FR_098_NO_NOTICE = '通知は出さない（同裁定）'

// The neighbours that did NOT move, and that every case below must stay inside.
const FR_098_BAND_INSIDE =
  '帯は `Row Area` の中に置き、スクロールする行が並ぶのはその残りとすること（MUST）'
// ⛔⛔ WITHDRAWN ON 2026-09-06, AFTER THIS FILE WAS WRITTEN. The same ruling
// that removed the band-scroll MUST also reaches this one: 「ピンが多すぎて
// スクロールできなくなったら、ユーザーが自分でピンを抜く」 describes exactly the
// state it forbade, so preventing it would be the 「特別な対応」 the user refused.
// ⭐ The latch holds the sentence that replaced it, so the file still goes red
// if the manuscript drifts back to forbidding it.
const FR_098_NOT_FILLED =
  '帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなることは在りうる'
const FR_098_TOP_IS_ROW_AREA =
  '本要求でいう「画面の上端」とは、`_assets/tbl-glossary.md` の `U-50`（`Row Area`）の上端をいう（MUST）'
const FR_042_HEIGHT_IS_A_FLOOR = '指定した高さは下限として扱うこと（MUST）'
const LF_14_REMAINDER = '`Row Area` の高さから帯の高さと `rowGap` 1 つぶんを引いた残りとする'

// ---------------------------------------------------------------------------
// Settings and screen. Copied from tests/unit/fr-098-the-pinned-band.test.ts.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    ...NESTED,
    scrollDate: '2026-01-01', // S-77, so the time axis has an origin
    scrollGroupId: null, // S-78
    scrollGroupOffset: 0, // S-176
    stackDirection: 'down', // S-58, so every y reads from the top
    zoomY: 1, // S-76, so a height carried in the document is the height drawn
    ...part,
  }) as unknown as DocumentSettings

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/** `S-127` -- how many rows may be pinned at once. The cap every frame uses. */
const PIN_CAP = settingNumber('pinnedRowMax')

/** `S-12` -- the gap `LF-14` spends between two rows of the band. */
const ROW_GAP = settingNumber('rowGap')

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

// ---------------------------------------------------------------------------
// Fixtures. Copied from tests/unit/fr-098-the-pinned-band.test.ts.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

const TASK_FROM = '2026-01-05'
const TASK_DAYS = 60

/** Every nullable column spelled `null`; leaving one `undefined` reads as "set". */
const taskOf = (uid: number): Task =>
  ({
    uid,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: TASK_FROM,
    finish: dayAfter(TASK_FROM, TASK_DAYS),
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

const scheduleOf = (groups: readonly TaskGroup[]): Schedule => {
  const tasks = groups.map((_group, index) => taskOf(index + 1))
  return {
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: tasks.length + 1,
    },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: groups.map((group, index) => ({
      groupId: (group as unknown as { id: string }).id,
      taskUid: index + 1,
      stackOrder: null,
    })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

/** Ten root rows, one task each, so every band is one lane tall (`LF-2`). */
const ALL_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'] as const

/** The first `S-127` of them, which is what every frame below pins. */
const PINS = ALL_IDS.slice(0, PIN_CAP)

const documentOf = (tallHeight: number | null): Schedule =>
  scheduleOf(
    ALL_IDS.map((id, index) =>
      groupOf({
        id,
        order: index,
        // ⭐ ONLY THE ROWS THAT GET PINNED ARE MADE TALL. `FR-042` (MUST) reads a
        // given height as a FLOOR, so this is the manuscript's own way of asking
        // for a tall row without inventing a setting. Leaving the rest at their
        // natural height is what keeps the fixture clear of FR-098's untouched
        // 「帯が `Row Area` を埋め尽くし … てはならない（MUST NOT）」.
        height: tallHeight !== null && index < PIN_CAP ? tallHeight : null,
      }),
    ),
  )

interface Drawn {
  readonly settings: DocumentSettings
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
}

const draw = (schedule: Schedule, part: Record<string, unknown> = {}): Drawn => {
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENV, settings)
  return { settings, regions, layout: layoutFromSchedule(schedule, settings, regions) }
}

const rowsOf = (drawn: Drawn): readonly RowPlacement[] => drawn.layout.rows
const idsOf = (rows: readonly RowPlacement[]): readonly string[] => rows.map((one) => one.groupId)

const rowById = (drawn: Drawn, groupId: string): RowPlacement => {
  const found = rowsOf(drawn).find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`this frame drew no row ${groupId}`)
  return found
}

/**
 * The ids THIS FRAME PINNED that it actually drew, in the order the answer
 * carries.
 * ⚠️ The pin list is a parameter and not the constant `PINS`: a row that is
 * merely present in `PINS` is an ordinary scrolling row in a frame that did not
 * pin it, and counting it as band would make every control below vacuous.
 */
const drawnPinsOf = (drawn: Drawn, pins: readonly string[]): readonly string[] =>
  idsOf(rowsOf(drawn)).filter((one) => pins.includes(one))

/** The lowest edge any drawn pinned row reaches -- the band's bottom. */
const bandBottomOf = (drawn: Drawn, pins: readonly string[]): number => {
  const drawnPins = drawnPinsOf(drawn, pins).map((id) => rowById(drawn, id))
  if (drawnPins.length === 0) throw new Error('this frame drew no pinned row at all')
  return Math.max(...drawnPins.map((one) => one.y + one.height))
}

const rowAreaBottomOf = (drawn: Drawn): number => drawn.regions.rowArea.y + drawn.regions.rowArea.height

/**
 * ⭐ THE FRAME EVERY NUMBER BELOW IS SIZED FROM. Nothing is pinned, so this is
 * the `Row Area` at its full height and a row at its natural `LF-2` height.
 */
const PROBE = draw(documentOf(null))
const AREA_HEIGHT = PROBE.regions.rowArea.height
const NATURAL_HEIGHT = rowById(PROBE, 'g1').height

/**
 * ⭐⭐ THE CONTROL THAT HAS TO MOVE, EXPRESSED AS A NUMBER. A third of the
 * `Row Area` plus a pixel: TWO such rows fit inside it with room left over, and
 * `S-127`'s five cannot -- 5 × TALL is more than one and a half `Row Area`s.
 * ⛔ NOT A CONSTANT LIFTED FROM A SCREENSHOT: it is computed from the region the
 * frame itself reports, so the same case presses whatever `regionsFromScreen`
 * hands back.
 */
const TALL = Math.ceil(AREA_HEIGHT / 3) + 1

/** `LF-14`'s band height for `count` rows of `TALL`, spelled as the row spells it. */
const bandHeightOf = (count: number): number => count * TALL + ROW_GAP * (count - 1)

/** A drawn coordinate is a float; one pixel is all the slack an edge needs. */
const PIXEL_SLACK = 1

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⛔ FR-098 carries the two clauses of 2026-09-06, and the ruling behind them', () => {
    // ⭐ THE WHOLE POINT OF THE FILE. If either clause is reworded, these cases
    // stop meaning what they claim to mean, and this is where that is said.
    expect(REQUIREMENTS).toContain(FR_098_NOT_FITTING_NOT_DRAWN)
    expect(REQUIREMENTS).toContain(FR_098_BAND_DOES_NOT_SCROLL)
    expect(REQUIREMENTS).toContain(RULING_2026_09_06)
    expect(REQUIREMENTS).toContain(FR_098_MEASURED)
    expect(REQUIREMENTS).toContain(FR_098_NO_NOTICE)
  })

  it('⛔ and no longer asks the band to scroll -- that MUST was withdrawn', () => {
    // ⛔⛔ THE ONE ASSERTION THIS FILE EXISTS TO KEEP. CR-363 removed
    // 「ピン止めした行の並びを縦にスクロールできるようにすること（MUST）」. A
    // manuscript that carried it again would be asking for the very scrolling
    // mechanism the ruling refused, and every case below would be arguing the
    // opposite side of a settled question.
    expect(REQUIREMENTS).not.toContain(FR_098_WITHDRAWN_SCROLLABLE_BAND)
  })

  it('⛔ the neighbours these cases must not contradict are still there', () => {
    expect(REQUIREMENTS).toContain(FR_098_BAND_INSIDE)
    expect(REQUIREMENTS).toContain(FR_098_NOT_FILLED)
    expect(REQUIREMENTS).toContain(FR_098_TOP_IS_ROW_AREA)
    expect(REQUIREMENTS).toContain(FR_042_HEIGHT_IS_A_FLOOR)
    expect(DESIGN).toContain(LF_14_REMAINDER)
  })

  it('⭐ the cap these frames pin is `S-127` itself, and the fixture pins exactly it', () => {
    // 「同時にピン止めできる数の上限は表 T-203 の `S-127` が持つ」 with the measured
    // note's 「`S-127` の既定の 5 本」. ⛔ If the default ever moves, the fixture
    // moves with it rather than going on pinning five.
    expect(PIN_CAP, 'S-127 pinnedRowMax').toBe(5)
    expect(PINS).toHaveLength(PIN_CAP)
  })

  it('⭐⭐ THE CONTROL: one tall row leaves room, and `S-127`’s five cannot fit', () => {
    // ⛔ WITHOUT THIS THE CASES BELOW PROVE NOTHING. A `Row Area` that happened to
    // be tall enough for five tall rows would pass block (a) while the band
    // overflowed on every real screen.
    expect(AREA_HEIGHT, 'the Row Area has a height at all').toBeGreaterThan(0)
    expect(NATURAL_HEIGHT, 'a row at its natural LF-2 height').toBeGreaterThan(0)

    expect(
      bandHeightOf(1) + ROW_GAP + NATURAL_HEIGHT,
      'one pinned tall row leaves room for the scrolling rows -- plenty of it',
    ).toBeLessThan(AREA_HEIGHT)

    expect(
      bandHeightOf(PIN_CAP),
      'LF-14: the band for S-127 tall rows is more than the Row Area holds',
    ).toBeGreaterThan(AREA_HEIGHT)

    // ⭐ AND THE FIXTURE STAYS CLEAR OF THE UNTOUCHED MUST NOT: even cut down to
    // the two tall rows that do fit, the remainder still holds a natural row, so
    // 「帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなっては
    // ならない」 is never the thing these cases are asking to be broken.
    expect(
      bandHeightOf(2) + ROW_GAP + NATURAL_HEIGHT,
      'FR-098 (MUST NOT): the band must never leave the scrolling rows nowhere',
    ).toBeLessThan(AREA_HEIGHT)
  })

  it('the frame these cases are read from really drew ten rows, the first at the top', () => {
    expect(idsOf(rowsOf(PROBE))).toEqual([...ALL_IDS])
    expect(rowById(PROBE, 'g1').y).toBeCloseTo(PROBE.regions.rowArea.y, 6)
  })
})

// ===========================================================================
// (a) FR-098 (MUST NOT) -- the band may not be sent, so it may not overrun
// ===========================================================================

describe('FR-098 (MUST NOT) -- 帯を縦にスクロールできるようにしてはならない', () => {
  it('⛔ MUST NOT: with `S-127`’s worth of tall rows pinned, the band stays inside the `Row Area`', () => {
    // 「帯を縦にスクロールできるようにしてはならない（MUST NOT）」 together with the
    // untouched 「帯は `Row Area` の中に置き … （MUST）」. ⭐ A band that may not be
    // sent has exactly one way to answer more rows than it can hold: end at the
    // region's bottom edge. CR-363 measured the defect as 「帯の下端 1090 ＞
    // 領域の下端 1062」 -- this case is that inequality, turned around.
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...PINS] })

    expect(
      bandBottomOf(drawn, PINS),
      'FR-098 (MUST): 帯は `Row Area` の中に置き … その残りとすること',
    ).toBeLessThanOrEqual(rowAreaBottomOf(drawn) + PIXEL_SLACK)
  })

  it('⭐ THE CONTROL: one tall row pinned, and the band ends far short of the bottom', () => {
    // ⛔ WITHOUT THIS, A LAYOUT THAT DREW NO PINNED ROW AT ALL WOULD PASS THE CASE
    // ABOVE. One pin is the same document, the same height, the same region -- the
    // only thing that moves is how many rows the band is asked to hold.
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: ['g1'] })

    expect(drawnPinsOf(drawn, ['g1']), 'the one pinned row is drawn').toEqual(['g1'])
    expect(rowById(drawn, 'g1').y, 'FR-098 (MUST): it stands at the top of the Row Area').toBeCloseTo(
      drawn.regions.rowArea.y,
      6,
    )
    expect(
      bandBottomOf(drawn, ['g1']) + ROW_GAP + NATURAL_HEIGHT,
      'one pin leaves a whole natural row of room below the band',
    ).toBeLessThanOrEqual(rowAreaBottomOf(drawn) + PIXEL_SLACK)
  })

  it('⛔ MUST NOT: and no pinned row is pushed above the `Row Area` to make it fit', () => {
    // ⭐ THE OTHER WAY TO CHEAT THE CASE ABOVE. 「`Time Ruler` の帯より上へ出しては
    // ならない（MUST NOT）」 -- a band that satisfied the bottom edge by starting
    // above the region would be reading the schedule over the ruler.
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...PINS] })

    for (const id of drawnPinsOf(drawn, PINS)) {
      expect(
        rowById(drawn, id).y,
        `FR-098 (MUST NOT): ${id} was lifted above the Row Area`,
      ).toBeGreaterThanOrEqual(drawn.regions.rowArea.y - PIXEL_SLACK)
    }
  })
})

// ===========================================================================
// (b) FR-098 (MUST) -- what does not fit is not drawn
// ===========================================================================

describe('FR-098 (MUST) -- 入りきらない行を描かないこと', () => {
  it('⛔ MUST: a pinned row the band cannot hold is not drawn', () => {
    // 「ピン止めした行が画面に収まらないときは、入りきらない行を描かないこと（MUST）」
    //（利用者の裁定 2026-09-06「特別な対応は要らない。ピンが多すぎてスクロールできなく
    //  なったら、ユーザーが自分でピンを抜く」）
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...PINS] })

    expect(
      drawnPinsOf(drawn, PINS).length,
      'FR-098 (MUST): 入りきらない行を描かないこと -- five tall rows cannot all be drawn',
    ).toBeLessThan(PIN_CAP)
    expect(
      drawnPinsOf(drawn, PINS).length,
      'and the ones that do fit are still drawn',
    ).toBeGreaterThan(0)
  })

  it('⭐ THE CONTROL: the same five rows, pinned, at their natural height -- all five drawn', () => {
    // ⛔ WITHOUT THIS, THE CASE ABOVE WOULD PASS ON A LAYOUT THAT DROPPED PINNED
    // ROWS FOR ANY REASON AT ALL. Same ids, same pin list, same region: the only
    // thing that moves is the height, which is the only thing the clause is about.
    const drawn = draw(documentOf(null), { pinnedGroupIds: [...PINS] })

    expect(
      drawnPinsOf(drawn, PINS),
      'FR-098 (MUST): a pinned row that FITS is drawn -- 「それ以外の理由で描くのをやめてはならない」',
    ).toEqual([...PINS])
  })

  it('⛔ MUST NOT: the rows that survive are a prefix of the pin order, not a chosen subset', () => {
    // 「ピン止めした行どうしに優劣を設けてはならない（MUST NOT）—— 固定した順に上から
    //   並べる」. ⭐ Read together with the new MUST: if the band lays the pins out
    //   in order and drops what will not fit, the survivors can only be the first
    //   n of them. ⛔ Keeping a later row while dropping an earlier one of the same
    //   height would be giving the later one precedence.
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...PINS] })
    const survivors = drawnPinsOf(drawn, PINS)

    expect(
      survivors,
      'FR-098 (MUST NOT): ピン止めした行どうしに優劣を設けてはならない',
    ).toEqual(PINS.slice(0, survivors.length))
  })

  it('⭐ and the band that is drawn is still LF-14’s own arithmetic for those rows', () => {
    // 表 T-221 `LF-14` 「帯の高さは、帯に置く行の帯高（`LF-2`）を合計し、行と行のあいだに
    //   `rowGap` をその数から 1 を引いた数だけ加えたものとする」. ⭐ Cutting the band is
    //   not licence to re-space the rows that remain.
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...PINS] })
    const survivors = drawnPinsOf(drawn, PINS)

    expect(
      bandBottomOf(drawn, PINS) - drawn.regions.rowArea.y,
      'LF-14: the drawn band is the surviving rows and one rowGap between each',
    ).toBeCloseTo(bandHeightOf(survivors.length), 6)
  })
})

// ===========================================================================
// (c) FR-098 -- the person takes a pin out, and the row comes back
// ===========================================================================

describe('FR-098 -- ユーザーが自分でピンを抜く, and the scrolling rows return', () => {
  /** The last of the pinned rows: the one an overflowing band has no room for. */
  const LAST_PIN = PINS[PIN_CAP - 1] as string

  it('⛔ MUST: while it is pinned into an overflowing band, that row is drawn nowhere', () => {
    // 「入りきらない行を描かないこと（MUST）」 -- and it is not in the scrolling chain
    //   either, because it is pinned. ⭐ THIS IS THE STATE THE RULING ACCEPTS.
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...PINS] })

    expect(
      idsOf(rowsOf(drawn)),
      `FR-098 (MUST): ${LAST_PIN} does not fit in the band, so it is not drawn`,
    ).not.toContain(LAST_PIN)
  })

  it('⭐⭐ take that one pin out, and the row is drawn again -- at the top of the remainder', () => {
    // ⭐ THE RULING'S WHOLE REMEDY: 「ピンが多すぎてスクロールできなくなったら、
    //   ユーザーが自分でピンを抜く」. Unpinned, the row is an ordinary row again, and
    //   it is the FIRST of the ones that scroll (every row above it in the tree is
    //   still pinned), so `LF-14` puts it at 「`Row Area` の高さから帯の高さと
    //   `rowGap` 1 つぶんを引いた残り」's top edge.
    // ⚠️ NOT that it fits there -- see "what is deliberately not asserted", 3.
    const fewer = PINS.slice(0, PIN_CAP - 1)
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...fewer] })

    expect(
      idsOf(rowsOf(drawn)),
      `FR-098: ${LAST_PIN} is unpinned, so nothing keeps it off the screen`,
    ).toContain(LAST_PIN)
    expect(
      rowById(drawn, LAST_PIN).y,
      'LF-14: the remainder begins one rowGap below the band',
    ).toBeCloseTo(bandBottomOf(drawn, fewer) + ROW_GAP, 6)

    // ⭐⭐ AND IT IS BACK ON THE SCREEN, not merely back in the answer. This is
    // the assertion that carries the ruling: taking a pin out has to GIVE the
    // person something, and what it gives is a remainder that begins inside the
    // `Row Area` instead of below it.
    expect(
      rowById(drawn, LAST_PIN).y,
      `FR-098: ${LAST_PIN} came back inside the Row Area, not below its bottom edge`,
    ).toBeLessThan(rowAreaBottomOf(drawn))
  })

  it('⭐ THE CONTROL: at their natural height the same five stay pinned AND drawn', () => {
    // ⛔ WITHOUT THIS, THE PAIR ABOVE WOULD PASS ON A LAYOUT THAT SIMPLY NEVER DREW
    // THE LAST PINNED ROW. Pinning is not what hides it; not fitting is.
    const pinned = draw(documentOf(null), { pinnedGroupIds: [...PINS] })

    expect(idsOf(rowsOf(pinned)), 'the last pin is drawn when it fits').toContain(LAST_PIN)
    expect(
      rowById(pinned, LAST_PIN).y,
      'LF-14: it is the fifth row OF THE BAND, not the first of the remainder',
    ).toBeCloseTo(
      pinned.regions.rowArea.y + (PIN_CAP - 1) * (NATURAL_HEIGHT + ROW_GAP),
      6,
    )
  })

  it('⭐ and the scrolling rows below keep their room throughout -- the band never fills the area', () => {
    // 「⛔ 帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなっては
    //   ならない（MUST NOT）」 -- UNTOUCHED by the ruling. ⭐ This case is here so the
    //   block above cannot be read as licence to let a cut band swallow the region.
    const drawn = draw(documentOf(TALL), { pinnedGroupIds: [...PINS] })
    const scrolling = idsOf(rowsOf(drawn)).filter(
      (one) => !(PINS as readonly string[]).includes(one),
    )

    // ⛔ NO LONGER ASSERTED: that a scrolling row survives. The clause that
    // required it was withdrawn on 2026-09-06, and this fixture makes only the
    // pinned rows tall precisely so the question does not arise -- but with
    // rows of one height a full band leaves no remainder, and the ruling says
    // the person unpins. ⭐ What is still true, and still asserted below, is
    // LF-14's arithmetic for the remainder that DOES exist.
    expect(
      scrolling.length,
      'the fixture leaves the other rows natural, so a remainder exists to measure',
    ).toBeGreaterThan(0)
    expect(
      rowById(drawn, scrolling[0] as string).y,
      'LF-14: the first scrolling row begins one rowGap below the band',
    ).toBeCloseTo(bandBottomOf(drawn, PINS) + ROW_GAP, 6)

    // ⭐ AND THAT ROOM IS ON THE SCREEN. A remainder that begins below the
    // `Row Area`'s own bottom edge is not room; it is the defect CR-363 measured
    // as 「残りの置き場 1098（領域の外）⇒ 送る行 63 本すべてが高さ 0」.
    expect(
      rowById(drawn, scrolling[0] as string).y + NATURAL_HEIGHT,
      'FR-098 (MUST NOT): the remainder has to be inside the Row Area to be room at all',
    ).toBeLessThanOrEqual(rowAreaBottomOf(drawn) + PIXEL_SLACK)
  })
})
