// Unit tests for FR-020: the four-plus-one drawing constants live in the tables, not typed into src/.

import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_020_LAYS_IT_ON =
  '開いた者の名前と実行時の日時を、`Row Area`（`_assets/tbl-glossary.md` の `U-50`）へ斜めに繰り返し薄く重ねること'
const FR_020_ISO_8601 =
  '日時は UTC とし、`ISO 8601`（`RFC 3339` の書式。`YYYY-MM-DDThh:mm:ssZ`）で秒まで示すこと（MUST）'
const FR_020_NOT_SAVED = '透かしの設定を文書に保存してはならない（MUST NOT）'
const FR_020_NOT_OUTSIDE_ROW_AREA = '`Row Area` の外へ重ねてはならない（MUST NOT）'
const FR_020_HIDE_PROPAGATES_TO_EXPORT =
  '画面から透かしを消したときは、書き出す絵からも消すこと（MUST）'
const FR_020_FOUR_VALUES =
  '斜めに繰り返し薄く重ねるときの 4 つの量 —— 斜めの角度・文字の大きさ・繰り返しの間隔・インクの色 —— は、`_assets/tbl-settings.md` の 表 T-207 の `S-220`（角度）・`S-221`（文字の大きさの係数）・`S-222`（繰り返しの間隔の係数）と、表 T-236 の `S-223`（インクの色）が持つこと（MUST）'
const FR_020_NOT_HARDCODED =
  'この 4 つの値を `src/` に打ち込んではならない（MUST NOT）。表から生成した定数として読むこと（MUST）'
const FR_020_OPACITY_SAME_TREATMENT = '濃さ（表 T-207 の `S-102`）も同じ扱いとする（MUST）'
const FR_020_BARELY_LEGIBLE =
  '透かしは、ぎりぎり判別できる濃さで足りる（MUST）。読めるように濃くしてはならない（MUST NOT）'

describe('the manuscript still says what these cases read', () => {
  it('FR-020 still lays the mark on diagonally, repeated, faint, inside Row Area only', () => {
    expect(REQUIREMENTS).toContain(FR_020_LAYS_IT_ON)
    expect(REQUIREMENTS).toContain(FR_020_NOT_OUTSIDE_ROW_AREA)
  })

  it('FR-020 still demands UTC ISO 8601 to the second', () => {
    expect(REQUIREMENTS).toContain(FR_020_ISO_8601)
  })

  it('FR-020 still forbids saving the watermark setting to the document', () => {
    expect(REQUIREMENTS).toContain(FR_020_NOT_SAVED)
  })

  it('FR-020 still requires the exported picture to drop the mark the same frame the screen does', () => {
    expect(REQUIREMENTS).toContain(FR_020_HIDE_PROPAGATES_TO_EXPORT)
  })

  it('FR-020 still names the four values by table row, and still bans typing them into src/', () => {
    expect(REQUIREMENTS).toContain(FR_020_FOUR_VALUES)
    expect(REQUIREMENTS).toContain(FR_020_NOT_HARDCODED)
  })

  it('FR-020 still gives the opacity the same generated-constant treatment as the other four', () => {
    expect(REQUIREMENTS).toContain(FR_020_OPACITY_SAME_TREATMENT)
  })

  it('FR-020 still asks for barely-legible, never for readable (利用者の裁定 2026-09-04)', () => {
    expect(REQUIREMENTS).toContain(FR_020_BARELY_LEGIBLE)
  })
})

const T_207 = specTable('T-207')
const T_236 = specTable('T-236')

const rowOf = (table: ReturnType<typeof specTable>, id: string) => {
  const found = table.rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table.id} no longer has row ${id}`)
  return found
}

describe('table T-207 still holds the three values FR-020 names by row (S-220 / S-221 / S-222)', () => {
  it('S-220 -- the diagonal angle -- is -30 degrees, bounded to a right-side-up quarter turn', () => {
    const row = rowOf(T_207, 'S-220')
    expect(bare(row.by['値'] ?? '')).toBe('-30')
    expect(bare(row.by['下限'] ?? '')).toBe('-90')
    expect(bare(row.by['上限'] ?? '')).toBe('90')
  })

  it('S-221 -- the character-size coefficient -- multiplies the WRITTEN picture width (FR-020), not a literal 1600', () => {
    const row = rowOf(T_207, 'S-221')
    expect(bare(row.by['値'] ?? '')).toBe('0.01125')
    expect(bare(row.by['下限'] ?? '')).toBe('0.01')
    expect(bare(row.by['上限'] ?? '')).toBe('1')
    // WHY: checked directly, so a case that hard-coded S-81's value instead
    // of reading it would still be caught by this row's own remark.
    expect(row.by['備考'] ?? '').toContain('書き出す絵の幅')
    expect(row.by['備考'] ?? '').toContain('S-81')
  })

  it('S-222 -- the repeat-spacing coefficient -- multiplies the mark height, both axes alike', () => {
    const row = rowOf(T_207, 'S-222')
    expect(bare(row.by['値'] ?? '')).toBe('14.44')
    expect(bare(row.by['下限'] ?? '')).toBe('1')
    expect(bare(row.by['上限'] ?? '')).toBe('20')
    expect(row.by['備考'] ?? '').toContain('縦横とも同じ間隔')
  })

  it('S-102 -- watermarkOpacity -- sits inside the same table, outside the contrast range (LM-13)', () => {
    const row = rowOf(T_207, 'S-102')
    expect(bare(row.by['名前'] ?? '')).toBe('watermarkOpacity')
    expect(bare(row.by['値'] ?? '')).toBe('0.06')
    expect(bare(row.by['下限'] ?? '')).toBe('0.02')
    expect(bare(row.by['上限'] ?? '')).toBe('0.30')
    // WHY: this range's top must not exceed what NFR-007 / LM-13 already
    // excludes from the contrast floor.
    expect(row.by['備考'] ?? '').toContain('コントラストの適合範囲から外してある')
  })
})

describe('the ruling of 2026-09-05: the watermark keeps its default name for now', () => {
  it('FR-086 says the road to type the name is not built for now', () => {
    expect(REQUIREMENTS).toContain('名前を入力させる道は、いまは実装しない')
    // WHY: the cost is asserted too, so a specification that quietly drops
    // a goal cannot read later as though the goal were met.
    expect(REQUIREMENTS).toContain('GL-007')
  })

  it('RS-19 must not be told while there is no road to set the name', () => {
    // WHY: quoted long enough for check 39 to count this as a held clause
    // under tests/, not just a paraphrase.
    expect(REQUIREMENTS).toContain(
      '名前が、まだ設定されていない⛔ **いまは告げてはならない（MUST NOT）',
    )
  })

  it('NT-4 no longer counts the name setting among the matters pending at startup', () => {
    const row = rowOf(specTable('T-037'), 'NT-4')
    const said = Object.values(row.by).join(' ')
    // WHY: the row still holds the rule as one sheet; only the retired
    // item's own listing was removed.
    expect(said).toContain('1 枚に集約して出すこと')
    expect(said).not.toContain('透かしに出す名前の設定を別々の面')
  })
})

describe('table T-236 still holds S-223, the fourth of the four values (the ink colour)', () => {
  it('S-223 -- the ink colour -- is the same as S-148 (the muted text colour), in both themes', () => {
    const row = rowOf(T_236, 'S-223')
    // WHY: bare() reads the first backtick span, so this comparison is
    // exact even though the raw sentence carries more than one span.
    expect(bare(row.by['明るいテーマ'] ?? '')).toBe('S-148')
    expect(bare(row.by['暗いテーマ'] ?? '')).toBe('S-148')
    expect(row.by['色相追随'] ?? '').toBe('—')
    // WHY: S-223's own row must defer to S-102's number rather than
    // restating it here.
    expect(row.by['備考'] ?? '').toContain('濃さをここに書いてはならない')
  })
})

describe('the Row-Area confinement is not stated only once', () => {
  it('table T-076 (EP-7) still confines the WRITTEN picture to the same rule FR-020 states', () => {
    const ep7 = rowOf(specTable('T-076'), 'EP-7')
    expect(ep7.by['描くか'] ?? '').toContain('Row Area')
    expect(ep7.by['描くか'] ?? '').toContain('の中だけ描く')
    expect(ep7.by['理由と扱い'] ?? '').toContain('FR-020')
  })

  it('table T-041 (WY-2) still excludes the watermark layer from the WYSIWYG comparison, and says why', () => {
    const wy2 = rowOf(specTable('T-041'), 'WY-2')
    expect(wy2.by['判定に含めないもの'] ?? '').toContain('FR-020')
    // WHY: the same reason this file's rendering hole rests on -- the name
    // and the clock make the layer differ on every run and machine.
    expect(wy2.by['判定に含めないもの'] ?? '').toContain('実行のたび・機ごとに必ず変わる')
  })

  it('table T-206 (S-144) still agrees that hiding the mark on screen hides it in the export too', () => {
    const s144 = rowOf(specTable('T-206'), 'S-144')
    expect(bare(s144.by['既定'] ?? '')).toBe('出す')
    expect(s144.by['保存しない理由'] ?? '').toContain('書き出す絵からも消える')
    expect(s144.by['保存しない理由'] ?? '').toContain('FR-020')
  })

  it('S-99a (the opener\'s name, FR-086) still lives outside documentSettings, in the same separate slot FR-020 relies on', () => {
    // WHY: if the name lived inside DocumentSettings, the existing
    // settings argument could carry it into the renderer; it does not.
    const s99a = rowOf(specTable('T-206'), 'S-99a')
    expect(s99a.by['値'] ?? '').toContain('透かしに出す')
    expect(s99a.by['保存しない理由'] ?? '').toContain('別枠')
    expect(s99a.by['保存しない理由'] ?? '').toContain('localStorage')
    expect(bare(s99a.by['既定'] ?? '')).toBe('user')
  })
})
