// `FR-098` after CR-363 (2026-09-06) -- the half of that ruling that is a fact
// about 表 T-233 and about the requirement's own list of reasons.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by someone who read only docs/spec.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHY THIS FILE IS SHORT, AND WHAT IT DELIBERATELY DOES NOT REPEAT
// ---------------------------------------------------------------------------
//
// tests/unit/fr-098-the-band-does-not-scroll.test.ts already asks the three
// things CR-363 section 3 named -- the band stays inside the `Row Area`, a
// pinned row the band cannot hold is not drawn, and taking one pin out brings a
// row back -- and it was written from docs/spec after the ruling. ⛔ Repeating
// them here would be the duplication R2.7 refuses.
//
// ⭐ THAT FILE NAMES ITS OWN GAP, in as many words: 「1. THAT NO NOTICE IS
// RAISED … whether table T-233 stayed the same length belongs to a case over
// that table.」 ⇒ This file is that case, and nothing else.
//
// ---------------------------------------------------------------------------
// THE CLAUSES, VERBATIM (docs/spec/01-04-requirements.md, `FR-098`)
// ---------------------------------------------------------------------------
//
//   STATEMENT (:2676): 「⭐⭐ **ピン止めした行が画面に収まらないときは、入りきらない
//     行を描かないこと（MUST）。帯を縦にスクロールできるようにしてはならない
//     （MUST NOT）**（利用者の裁定 2026-09-06「特別な対応は要らない。ピンが多すぎて
//     スクロールできなくなったら、ユーザーが自分でピンを抜く」）… ⭐ **通知は出さない
//     （同裁定）** —— **表 T-233 に行を足さない。**」
//
//   (:2692): 「**ピン止めした行が描かれないのは、人が畳んだ行の配下にあるとき（表
//     T-015 の `HR-1a`）と、隠した行の配下にあるとき（同表の `HR-6`）と、**帯が
//     `Row Area` に収まらず入りきらないとき**の 3 つに限ること（MUST）。それ以外の
//     理由で描くのをやめてはならない（MUST NOT）。**」
//
//   (:2684): 「⚠️⚠️ **帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描け
//     なくなることは在りうる。⛔ 道具はそれを防がない（MUST NOT を 2026-09-06 に
//     外した）**」
//
// ⛔⛔ THE BRIEF THAT ASKED FOR THIS FILE ASKED FOR THE OPPOSITE. It said to
// test 「帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなっては
// ならない、という MUST NOT が果たされていること」. ⭐ THAT MUST NOT WAS
// WITHDRAWN by the very CR the brief pointed at (CR-363 section 2a, hole 2:
// 「裁定はもう 1 つの MUST NOT も覆していた … ⭐ 外した」). A test holding it would
// argue for the behaviour the user refused, so the case below latches the
// REPLACEMENT sentence instead and fails if the prohibition ever comes back.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** The ruling itself, so the sentences below cannot read as an editor's flourish. */
const RULING_2026_09_06 =
  '特別な対応は要らない。ピンが多すぎてスクロールできなくなったら、ユーザーが自分でピンを抜く'

describe('FR-098 after CR-363 -- an overflowing band tells nobody', () => {
  it('FR-098 says in as many words that no notice is raised and no row is added to table T-233', () => {
    expect(REQUIREMENTS).toContain(RULING_2026_09_06)
    expect(REQUIREMENTS).toContain('通知は出さない（同裁定）')
    expect(REQUIREMENTS).toContain('表 T-233 に行を足さない')
  })

  it('table T-233 carries no reason that answers to FR-098 (通知は出さない)', () => {
    // ⭐ THE TABLE IS THE UNIT UNDER TEST. 表 T-233 は「通知が運ぶ理由」の全数で
    // あり、その 正 の欄が場面の持ち主を名指す。So "no notice for this" is exactly
    // "no row of this table names `FR-098`" -- and that is a fact only the table
    // can answer for, which is why it is asked here and not of the layout.
    const named = specTable('T-233').rows.filter((row) => (row.by['正'] ?? '').includes('FR-098'))
    expect(
      named.map((row) => row.id),
      'table T-233 gained a reason for FR-098, which the ruling of 2026-09-06 forbade',
    ).toEqual([])
  })

  it('FR-098 names exactly three reasons a pinned row is not drawn, the third being the overflow', () => {
    // 「3 つに限ること（MUST）。それ以外の理由で描くのをやめてはならない（MUST NOT）」.
    // ⭐ The sentence is latched whole rather than paraphrased: the count and
    // the three reasons are one clause, and a rewrite that keeps the number but
    // swaps a reason would slip past three separate substring checks.
    expect(REQUIREMENTS).toContain(
      'ピン止めした行が描かれないのは、人が畳んだ行の配下にあるとき（表 T-015 の `HR-1a`）と、' +
        '隠した行の配下にあるとき（同表の `HR-6`）と、帯が `Row Area` に収まらず入りきらないとき' +
        'の 3 つに限ること（MUST）。それ以外の理由で描くのをやめてはならない（MUST NOT）。',
    )
  })

  it('⛔ the MUST NOT against filling the Row Area is gone, and its replacement stands', () => {
    // ⛔ The withdrawn prohibition, in the shape it had. It must NOT be found.
    expect(
      REQUIREMENTS.includes(
        '帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなってはならない',
      ),
      'the withdrawn MUST NOT is back in FR-098; CR-363 removed it on 2026-09-06',
    ).toBe(false)
    // ⭐ And what replaced it: the state is admitted, and the tool does not stop it.
    expect(REQUIREMENTS).toContain(
      '帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなることは在りうる',
    )
    expect(REQUIREMENTS).toContain('道具はそれを防がない')
  })

  it('⛔ and FR-098 no longer asks the band to scroll', () => {
    // The MUST CR-363 section 1 struck out. ⚠️ Latched here as well as in the
    // sibling file, because THIS file's third case depends on it: the third
    // reason a pinned row is not drawn only exists because the band is cut.
    expect(
      REQUIREMENTS.includes('ピン止めした行の並びを縦にスクロールできるようにすること'),
      'the withdrawn scroll MUST is back in FR-098',
    ).toBe(false)
  })
})
