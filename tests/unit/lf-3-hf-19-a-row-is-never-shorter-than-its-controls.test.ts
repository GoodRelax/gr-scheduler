// 表 T-221 の `LF-3` and 表 T-051 の `HF-19` (MUST, 利用者の裁定 2026-09-03,
// CR-339, ledger row D-225): a row's band is never shorter than the lattice of
// controls that stands on it.
//
// ⭐ THE TWO ROWS THIS FILE IS WRITTEN FROM, verbatim.
//
// 表 T-221 の `LF-3` (docs/spec/05-07-design.md), 行の縦位置:
//   「前の行の縦位置に、前の行の帯高と `rowGap` を加える。**帯高は矩形が縦に取る
//    高さを下回らず、かつ、その行の操作子（表 T-051 の `HF-1` の格子）が縦に取る
//    高さも下回らない**（利用者の裁定 2026-09-03）—— ⛔ **下回ると、格子の下段が
//    次の行の帯へ落ち、押しがその行の操作子に取られる。**」
//
// 表 T-051 の `HF-19` (docs/spec/01-04-requirements.md):
//   「**`HF-1` の格子が縦に取る高さは、行の帯高の下限であること（MUST）。行の帯が
//    それを下回ってはならない（MUST NOT）**（利用者の裁定 2026-09-03）—— ⛔⛔ **下回る
//    と、格子の下段の 2 つが次の行の帯の上に立ち、`HF-6` が「行の名前の上へ重ねて
//    描く」と定めた重なりが、自分の行ではなく隣の行に対して起きる。**⚠️ **実測
//    （2026-09-03、出荷ビルド）: `Task` を 1 つも持たない行は 22〜28px、格子は
//    48px。その行の `IC-90` と `IC-58` の中心は次の行のものであり、押しはそちら
//    へ届いた。**⛔ **格子の側を縮めて合わせてはならない（MUST NOT）**」
//
// ---------------------------------------------------------------------------
// ⭐⭐ WHERE THE NUMBER COMES FROM, AND WHY THIS FILE MAY STATE ONE AT ALL
// ---------------------------------------------------------------------------
//
// Both rows say 「数は本行に書かない」 and point at the reader's text size
// (`FR-039`). ⛔ BUT THE ENTRANCE'S OWN SIZE DOES NOT FOLLOW THAT TEXT SIZE, and
// 表 T-206 の `S-138` says so itself:
//
//   「⛔ **閲覧者の文字サイズに追随させない** —— 大きくしたい人はブラウザの表示倍率
//    で変える。…… ⭐ **`S-141` を 6 から 4 へ同時に下げるので、入口の外形は
//    26 × 24px のまま動かない**（利用者の「アイコンサイズ自体は変えるな」）」
//
// ⇒ one entrance is `S-138 + S-141 × 2` tall -- the identity
// tests/unit/fr-029-glyph-box-grew-and-the-entrance-did-not.test.ts already
// holds against 表 T-206 -- and `HF-1`'s lattice is 「2 × 2 の格子」, so it is at
// least TWO of those, stacked. ⭐ AT LEAST, never exactly: 表 T-051 の `HF-6`
// records that the gap between two controls has no row at all -- 「⛔ **操作子
// どうしの間隔をここに書いてはならない（MUST NOT）** —— **その量を持つ行はどこにも
// 無く、まだ裁定を受けていない。**」 -- so the true floor can only be larger.
// ⇒ every case below asserts `>=` against two entrance heights and never `===`.
//
// ⚠️ CORRECTED 2026-09-03. This note used to read that 「`LF-3` and `HF-19` both
// say the floor moves with the reader's text size」 and called that a divergence
// from `S-138`. ⛔ THEY SAY THE OPPOSITE, in as many words: `LF-3` 「⚠️ **この床は
// 閲覧者の文字サイズに追随しない** —— `S-138` がそう定めている」 and `HF-19` 「⛔⛔ **この
// 床を閲覧者の文字サイズに追随させてはならない（MUST NOT）**」. All three rows agree,
// and nothing was ever divergent. ⭐ WHAT REMAINS UNRULED is narrower and is
// what the `>=` below is for: 表 T-051 の `HF-6` records that the gap BETWEEN
// two controls has no row anywhere -- 「⛔ **操作子どうしの間隔をここに書いては
// ならない（MUST NOT）** —— **その量を持つ行はどこにも無く、まだ裁定を受けていない。**」
// ⇒ 「格子はその 2 段ぶんである」 is the tallest thing the specification pins, so
// every case here asks for at least that and never for exactly it.
//
// ---------------------------------------------------------------------------
// Unit under test: `layoutFromSchedule` -- PI-5 of 表 T-064, the unit
// `05-07-design.md` names for 表 T-221's `LF-2` and `LF-3`: 「段を割り当てたあと、
// `GRS` は、行の帯高と縦位置を 表 T-221 の `LF-2` と `LF-3` に従って決めること」.
//
// ⚠️ Chapter 9 admits no Unit as a TEST_LEVEL, so these cases have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). ⛔ NO FUNCTION BODY UNDER src/ WAS OPENED; the
// fixture shape (`settingsOf` / `scheduleOf` / `oneRow`) is copied from
// tests/unit/layout-engine.test.ts, which drives this same unit.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'

// ===========================================================================
// The manuscript, read at run time rather than copied (Chapter 1.9)
// ===========================================================================

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything one row of a table says, as one string. */
const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

/** The px figure one settings row states in its 既定 column. */
const px = (table: string, id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(rowOf(table, id).by['既定'] ?? '')
  if (found === null) throw new Error(`${id} states no number in its 既定 column`)
  return Number(found[0])
}

/** `S-138` -- 入口の図形を描く箱の一辺. */
const S_138 = px('T-206', 'S-138')
/** `S-141` -- 図形と入口の枠の最低隙間. */
const S_141 = px('T-206', 'S-141')

/** One entrance's outer height, the way `FR-029` composes it out of those two. */
const ONE_ENTRANCE_TALL = S_138 + S_141 * 2

/**
 * The floor `HF-19` puts under a row's band, as far as docs/spec pins it down.
 *
 * ⭐ `HF-1` (MUST): 「並びは 2 × 2 の格子とすること」 ⇒ two entrances, stacked.
 * ⛔ A LOWER BOUND AND NOT THE FIGURE: the gap between them has no row (see the
 * head of this file), so the real lattice can only be taller than this.
 */
const LATTICE_FLOOR = ONE_ENTRANCE_TALL * 2

// ===========================================================================
// The fixture. Copied from tests/unit/layout-engine.test.ts.
// ===========================================================================

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const LAYOUT_SETTINGS = settingsOf({
  rulerHeight: 48,
  scrollDate: '2026-01-01', // S-77
  rulerFont: 12, // S-3
  stackDirection: 'down', // S-58
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
})

const REGIONS = regionsFromScreen(ENV, LAYOUT_SETTINGS)

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

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
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

/** One root row holding the tasks given, each a member of it. */
const oneRow = (tasks: readonly Task[], group: Record<string, unknown> = {}): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null, ...group }],
    taskGroupMembers: tasks.map((one) => ({ groupId: 'g1', taskUid: one.uid })),
  })

/** A task starting on `from` and running `days`. */
const spanning = (uid: number, from: string, days: number): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10) })
}

const heightsOf = (schedule: Schedule, settings = LAYOUT_SETTINGS): readonly number[] =>
  layoutFromSchedule(schedule, settings, REGIONS).rows.map((one) => one.height)

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ LF-3 still puts the controls under the band as a second floor', () => {
    expect(says('T-221', 'LF-3')).toContain(
      '帯高は矩形が縦に取る高さを下回らず、かつ、その行の操作子（表 T-051 の `HF-1` の格子）が縦に取る高さも下回らない',
    )
  })

  it('⭐ HF-19 still states the same floor from the controls side, and forbids shrinking them', () => {
    expect(says('T-051', 'HF-19')).toContain(
      '`HF-1` の格子が縦に取る高さは、行の帯高の下限であること（MUST）。行の帯がそれを下回ってはならない（MUST NOT）',
    )
    // ⛔ THE HALF THAT DECIDES WHICH SIDE GIVES WAY. Without it, a build could
    // meet LF-3 by drawing smaller controls, which HF-5 already forbids.
    expect(says('T-051', 'HF-19')).toContain('格子の側を縮めて合わせてはならない（MUST NOT）')
    expect(says('T-051', 'HF-1')).toContain('並びは 2 × 2 の格子とすること（MUST）')
  })

  it('⭐ the floor this file measures against is composed of two rows of the manuscript', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST THE 既定 COLUMN WOULD MAKE EVERY CASE
    // BELOW AGREE WITH ANYTHING -- rule 04 section 2.
    expect(ONE_ENTRANCE_TALL, `S-138=${S_138}, S-141=${S_141}`).toBe(24)
    expect(LATTICE_FLOOR).toBe(48)
    // The sentence that makes 24 the entrance's height and not just a sum.
    expect(says('T-206', 'S-138')).toContain('26 × 24px')
  })
})

// ===========================================================================
// The rule
// ===========================================================================

describe('LF-3 / HF-19 (MUST): a row is never shorter than its own controls', () => {
  it('⛔⛔ a row holding no Task at all is still at least as tall as the lattice', () => {
    // ⭐ THE ROW HF-19's 実測 IS ABOUT: 「`Task` を 1 つも持たない行は 22〜28px、
    // 格子は 48px。その行の `IC-90` と `IC-58` の中心は次の行のものであり、押しは
    // そちらへ届いた。」 ⇒ every control on such a row was unreachable.
    // ⚠️ `LF-2`'s 「`Task` を 1 つも持たない段は、矩形が縦に取る高さとする」 is what
    // gives it its old height; LF-3's new clause is a SECOND floor over that, not
    // a replacement for it.
    const [height] = heightsOf(oneRow([]))
    expect(
      height,
      `LF-3 (MUST): a row with no Task is ${height}px and HF-1's lattice needs at least ${LATTICE_FLOOR}px`,
    ).toBeGreaterThanOrEqual(LATTICE_FLOOR)
  })

  it('⛔ so is every row of a board built only of rows that hold no Task', () => {
    // ⭐ CR-339's OTHER MEASUREMENT: 「parity の板（`Task` を 1 つも持たない行だけで
    // 組んだ木）では 11 行すべてが 22px で、`IC-58` と `IC-90` は 1 行も押せない」.
    // ⛔ ONE ROW IS NOT ENOUGH TO PROVE THIS: a floor applied to the first row
    // only would pass the case above.
    // ⚠️ THE ROWS ARE SIBLINGS AND NOT A CHAIN, deliberately: FR-018's group
    // level-of-detail drops rows past a depth this zoom can draw, and a chain
    // of five came back as three -- which would make the sweep quietly shorter
    // than it reads. Depth is not what this rule is about.
    const many = 5
    const schedule = scheduleOf({
      taskGroups: Array.from({ length: many }, (_unused, index) => ({
        id: `g${index + 1}`,
        parentId: null,
        order: index,
        height: null,
      })),
    })
    const heights = heightsOf(schedule)
    expect(heights, 'the board did not draw every row, so this sweep asked less than it says').toHaveLength(many)
    for (const [index, height] of heights.entries()) {
      expect(height, `row ${index + 1} of ${many} is ${height}px`).toBeGreaterThanOrEqual(
        LATTICE_FLOOR,
      )
    }
  })

  it('⛔ a row whose stated height (FR-042) is below the lattice is still raised to it', () => {
    // `FR-042` (MUST): 「指定した高さは下限として扱うこと」, so a stated height can
    // only ever ask for MORE room. ⇒ a small stated height cannot be a way round
    // HF-19's 「行の帯がそれを下回ってはならない（MUST NOT）」.
    const [height] = heightsOf(oneRow([], { height: 1 }))
    expect(height, `a row that asked for 1px came back ${height}px`).toBeGreaterThanOrEqual(
      LATTICE_FLOOR,
    )
  })

  it('⭐ the control: a row tall enough on its own is NOT pushed up to the floor', () => {
    // ⚠️ WITHOUT THIS, A UNIT THAT GAVE EVERY ROW A FIXED HEIGHT WOULD PASS
    // EVERY CASE ABOVE -- and `ST-9` forbids exactly that: 「行の帯高は段数で
    // 決まる。行高固定を前提にしてはならない（MUST NOT）」.
    const tall = LATTICE_FLOOR * 3
    const [height] = heightsOf(oneRow([], { height: tall }))
    expect(height, 'FR-042 (MUST): a stated height above the floor is kept').toBe(tall)
  })

  it('⭐ and a packed row keeps the height its lanes need, which is more than the floor', () => {
    // `LF-2` still decides the band for a row that has Tasks in it; HF-19 only
    // ever raises a band, never lowers one.
    const packedWith = (many: number): number => {
      const tasks = Array.from({ length: many }, (_unused, index) =>
        spanning(index + 1, `2026-01-0${index + 1}`, 20),
      )
      const [height] = heightsOf(oneRow(tasks))
      return height ?? 0
    }
    const three = packedWith(3)
    const four = packedWith(4)
    expect(three).toBeGreaterThan(LATTICE_FLOOR)
    expect(four).toBeGreaterThan(three)

    // ⛔⛔ ONE LANE IS MEASURED AS A DIFFERENCE, NEVER AS A ROW OF ITS OWN.
    // ⚠️ This case first read `heightsOf(oneRow([oneTask]))` as "one lane" --
    // but a row holding a single lane is exactly the row THIS FILE'S RULE
    // raises to `LATTICE_FLOOR`, so that reading handed back the floor and then
    // asked a three-lane band to be three floors and two gaps.
    // ⭐ Both rows below stand clear of the floor, so `LF-2` alone decides them:
    // 「段ごとに、その段に載る `Task` が縦に取る高さの最大を採り、それらを合計して、
    // 段と段のあいだに `stackGap` を段数から 1 を引いた数だけ加える」. One more
    // lane therefore adds exactly one lane and one `stackGap`, and that
    // difference is a lane's own height with no floor in it.
    const stackGap = SETTINGS_DEFAULTS['stackGap'] as number
    const lane = four - three - stackGap
    expect(lane, 'a lane with no height makes the sum below say nothing').toBeGreaterThan(0)
    expect(lane, 'a lane on its own stands under the floor, which is why it is measured this way')
      .toBeLessThan(LATTICE_FLOOR)
    expect(three, 'LF-2 (MUST): three lanes and two gaps').toBe(lane * 3 + stackGap * 2)
    expect(four, 'LF-2 (MUST): four lanes and three gaps').toBe(lane * 4 + stackGap * 3)
  })
})
