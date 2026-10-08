// CR-712 wave 1: tables T-233 and T-234 are printed from _source/notice-reasons.json, and so is the roster src/ reads.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { unbroken } from './spec-table'
import { NOTICE_MANNER_OF_REASON } from '../../src/use-case/advance-screen-session/advance-screen-session'

const SPEC = join(process.cwd(), 'docs', 'spec')

const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

const REQUIREMENTS = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8')

const PRINTED = readFileSync(join(SPEC, '_assets', 'tbl-notice-reasons.md'), 'utf8').replace(/\r\n/g, '\n')

interface ReasonEntry {
  readonly id: string
  readonly scene: { readonly ja: string }
  readonly manner: string
  readonly source: { readonly ja: string }
}

interface QuestionEntry {
  readonly id: string
  readonly scene: { readonly ja: string }
  readonly names: { readonly ja: string }
  readonly source: { readonly ja: string }
}

interface NoticeRoster {
  readonly reasons: readonly ReasonEntry[]
  readonly questions: readonly QuestionEntry[]
  readonly invariantRefusals: { readonly manner: string }
}

const ROSTER = JSON.parse(
  readFileSync(join(SPEC, '_source', 'notice-reasons.json'), 'utf8'),
) as NoticeRoster

const SECTION_6_2_ROSTER_IS_A_MANUSCRIPT =
  '⭐ 知らせの名簿の原稿は `_source/notice-reasons.json` とし、`_assets/tbl-notice-reasons.md` の 表 T-233・表 T-234 はそこから起こす生成物とする（MUST）。同文書を手で直してはならない（MUST NOT）'

const SECTION_6_2_NO_WORDS = '⭐ 同原稿は、理由と問いの行 ID・場面・作法・出典・表示の仕方を持ち、語を持たない'

const FR_076_POINTS_AT_THE_PRINT = '表 T-233 の全行は `_assets/tbl-notice-reasons.md` が持つ'

// see T-233, T-234
function printedRows(caption: string): readonly string[] {
  const lines = PRINTED.split('\n')
  const at = lines.findIndex((line) => line.startsWith(caption))
  if (at < 0) throw new Error(`the generated document has no caption ${caption}`)
  const rows: string[] = []
  for (const line of lines.slice(at + 2)) {
    if (!line.startsWith('|')) break
    rows.push(line)
  }
  return rows.slice(2)
}

const STANDING_IN_ROW = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`

const INVARIANT_ROW = /^\| (IV-\d+) \|/

function invariantRows(): readonly string[] {
  const lines = readFileSync(join(SPEC, '05-07-design.md'), 'utf8').replace(/\r\n/g, '\n').split('\n')
  const at = lines.findIndex((line) => line.startsWith('**表 T-220 —'))
  const out: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (line.startsWith('**表 ')) break
    const hit = INVARIANT_ROW.exec(line)
    if (hit !== null) out.push(hit[1] as string)
  }
  return out
}

describe('Chapter 6.2: the notice roster is a manuscript and the two tables are printed from it', () => {
  it('Chapter 6.2 still reads as quoted', () => {
    expect(DESIGN).toContain(SECTION_6_2_ROSTER_IS_A_MANUSCRIPT)
    expect(DESIGN).toContain(SECTION_6_2_NO_WORDS)
  })

  it('FR-076 no longer holds the two tables and points at the generated document', () => {
    expect(REQUIREMENTS).not.toContain('**表 T-233 —')
    expect(REQUIREMENTS).not.toContain('**表 T-234 —')
    expect(REQUIREMENTS).toContain(FR_076_POINTS_AT_THE_PRINT)
  })

  it('the generated document says it is generated and names its manuscript', () => {
    expect(PRINTED).toContain('本書は生成物である')
    expect(PRINTED).toContain('`_source/notice-reasons.json`')
  })

  it('table T-233 prints every reason of the manuscript, cell for cell, in its order', () => {
    const wanted = ROSTER.reasons.map((one) =>
      STANDING_IN_ROW([one.id, one.scene.ja, `\`${one.manner}\``, one.source.ja]),
    )
    expect(printedRows('**表 T-233 —')).toEqual(wanted)
  })

  it('table T-234 prints every question of the manuscript, cell for cell, in its order', () => {
    const wanted = ROSTER.questions.map((one) =>
      STANDING_IN_ROW([one.id, one.scene.ja, one.names.ja, one.source.ja]),
    )
    expect(printedRows('**表 T-234 —')).toEqual(wanted)
  })
})

describe('the roster src/ reads is the manuscript, not a hand copy', () => {
  it('every reason and every row of table T-220 has the manner the manuscript gives it', () => {
    const wanted: Record<string, string> = {}
    for (const one of ROSTER.reasons) wanted[one.id] = one.manner
    for (const row of invariantRows()) wanted[row] = ROSTER.invariantRefusals.manner
    expect({ ...NOTICE_MANNER_OF_REASON }).toEqual(wanted)
  })
})
