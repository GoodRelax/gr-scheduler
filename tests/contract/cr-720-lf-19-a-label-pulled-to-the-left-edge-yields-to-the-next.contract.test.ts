// CR-720: the three MUST / MUST NOT sentences that decide where a ruler label stands.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { specTable, unbroken } from './spec-table'

const LF_19_CELL = specTable('T-221').rows.find((row) => row.id === 'LF-19')?.cells.join('|') ?? ''

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

describe('CR-720 -- the sentences of LF-19 and of FR-017 that place a ruler label', () => {
  it('FR-017 sends the place of a label to LF-19', () => {
    expect(REQUIREMENTS).toContain(
      '目盛ラベルの横の置き場は、`05-07-design.md` の 表 T-221 の `LF-19` に従うこと（MUST）',
    )
  })

  it('LF-19 keeps a pulled label out while its right end passes the next label minus S-135', () => {
    expect(unbroken(LF_19_CELL)).toContain(
      '寄せたラベルの右端（帯の左端にそのラベルの幅を足した位置）が、同じ行の次のラベルの書き出しから `S-135` を引いた位置を越えるあいだは、寄せたラベルを描いてはならない（MUST NOT）',
    )
  })

  it('LF-19 forbids sliding a pulled label left and cutting it at the band edge', () => {
    expect(unbroken(LF_19_CELL)).toContain(
      '寄せたラベルを次のラベルの手前まで左へずらし、帯の左端で切ってはならない（MUST NOT）',
    )
  })
})
