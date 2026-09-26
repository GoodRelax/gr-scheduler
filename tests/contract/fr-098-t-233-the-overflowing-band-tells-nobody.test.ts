// FR-098 after CR-363: the fact about table T-233 and its list of reasons, latched against removal.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const RULING_2026_09_06 =
  'ピンが多すぎてスクロールできなくなったら、人が自分でピンを抜けばよく、その状態が起きうることは前提である'

describe('FR-098 after CR-363 -- an overflowing band tells nobody', () => {
  it('FR-098 says in as many words that no notice is raised and no row is added to table T-233', () => {
    expect(REQUIREMENTS).toContain(RULING_2026_09_06)
    expect(REQUIREMENTS).toContain('通知は出さない')
    expect(REQUIREMENTS).toContain('表 T-233 に行を足さない')
  })

  it('table T-233 carries no reason that answers to FR-098 (通知は出さない)', () => {
    // WHY: the table is the unit under test -- "no notice for this" means
    // no row of table T-233 names FR-098 in its own row.
    const named = specTable('T-233').rows.filter((row) => (row.by['正'] ?? '').includes('FR-098'))
    expect(
      named.map((row) => row.id),
      'table T-233 gained a reason for FR-098, which the ruling of 2026-09-06 forbade',
    ).toEqual([])
  })

  it('FR-098 names exactly three reasons a pinned row is not drawn, the third being the overflow', () => {
    // WHY: latched whole, not paraphrased, so a rewrite that keeps the
    // count but swaps a reason cannot slip past separate substring checks.
    expect(REQUIREMENTS).toContain(
      'ピン止めした行が描かれないのは、人が畳んだ行の配下にあるとき（表 T-015 の `HR-1a`）と、' +
        '隠した行の配下にあるとき（同表の `HR-6`）と、帯が `Row Area` に収まらず入りきらないとき' +
        'の 3 つに限ること（MUST）。それ以外の理由で描くのをやめてはならない（MUST NOT）。',
    )
  })

  it('⛔ the MUST NOT against filling the Row Area is gone, and its replacement stands', () => {
    expect(
      REQUIREMENTS.includes(
        '帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなってはならない',
      ),
      'the withdrawn MUST NOT is back in FR-098; CR-363 removed it on 2026-09-06',
    ).toBe(false)
    expect(REQUIREMENTS).toContain(
      '帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなることは在りうる',
    )
    expect(REQUIREMENTS).toContain('道具はそれを防がない')
  })

  it('⛔ and FR-098 no longer asks the band to scroll', () => {
    // WHY: latched here too -- this file's third case depends on the band
    // being cut, which only holds if the scroll MUST stays withdrawn.
    expect(
      REQUIREMENTS.includes('ピン止めした行の並びを縦にスクロールできるようにすること'),
      'the withdrawn scroll MUST is back in FR-098',
    ).toBe(false)
  })
})
