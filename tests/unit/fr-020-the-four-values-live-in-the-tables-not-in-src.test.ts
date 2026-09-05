// Unit tests for FR-020 (透かしを重ねる) -- written the day after the layer was
// first drawn (2026-09-05) and before a single test named it.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their
// place: TS-6, tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, 1.). What was read: docs/spec/ in full for the rows
// below, and -- for import style and the `specTable` / `bare` convention
// only, never for a claim -- tests/unit/fr-020-both-ways-ic-41.test.ts and
// tests/unit/fr-020-the-surface-that-asks-for-the-watermark-password.test.ts
// (the two FR-020 files that already exist; see the header note on scope,
// below, for what those two already cover and why this file does not repeat
// it).
//
// ---------------------------------------------------------------------------
// SCOPE -- what this file does and does not add
// ---------------------------------------------------------------------------
//
// Two FR-020 files already exist and were read (not copied from) before this
// one was written:
//   tests/unit/fr-020-both-ways-ic-41.test.ts
//     -- IC-41 turning `watermarkVisible` (S-144) both ways through
//        `frameLoop`, the ungated showing side, the gated hiding side, and
//        the MUST NOT against saving it to the document.
//   tests/unit/fr-020-the-surface-that-asks-for-the-watermark-password.test.ts
//     -- U-60 `Watermark Unlock` itself: QN-9, the two word-button answers,
//        the masked field, RS-41, and `WATERMARK_UNLOCK_DIGEST` (S-101)
//        matching table T-207.
//
// Neither file touches the one thing FR-020's STATEMENT actually draws: the
// diagonal, repeated, faint text laid over the `Row Area`, or the four-plus-
// one values (`S-220` / `S-221` / `S-222` / `S-223` / `S-102`) that
// 利用者の裁定 2026-09-03 requires the drawing side to read as generated
// constants rather than typed literals. This file is about THAT half.
//
// ⭐⭐ WHAT COULD NOT BE WRITTEN, AND WHY -- reported rather than guessed, per
// this body's own rule. Every rendering test already in this tree that
// touches the schedule's own picture (tests/unit/uf-32.test.ts, tests/unit/
// fr-098-nothing-scrolling-under-the-band.test.ts, and the sibling file this
// round's tests/unit/gd-6-the-arrowhead-does-not-depend-on-pinning.test.ts
// was built from) calls `svgFromSchedule` with exactly seven arguments --
// `schedule`, `settings`, `layout`, `geometry`, `regions`, `selection`,
// `mode` -- and none of the seven is a place the opener's name or the
// runtime clock could enter, because neither value is part of `Schedule` or
// of `DocumentSettings`: table T-206 places `S-99a` (the name) in a
// SEPARATE `localStorage` compartment, outside `documentSettings`
// altogether, and the clock is by definition not data the document holds.
// FR-020's own RATIONALE says a fresh function feeds both the screen and the
// exported picture (「見えているものが成果物になる」), which means the
// content has to reach the renderer through SOME channel -- but no test
// file this round demonstrates what that channel is, so this file does not
// guess a parameter, a settings key, or an import that no existing test
// shows. The promises that channel would let a case check -- the diagonal
// repeat confined to `Row Area`, the `ISO 8601` stamp actually printed, the
// picture using `S-220` / `S-221` / `S-222` / `S-223` / `S-102` rather than
// a literal, and the layer vanishing from the exported picture the same
// frame it vanishes from the screen -- are named here and left undone.

import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than trusted to memory
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

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
    // GOES RED IF: the STATEMENT stops naming the name+datetime pair, the
    // diagonal/repeated/faint description, or drops the Row Area confinement.
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
    // ⭐⭐ THE RULING THIS FILE IS MOST ABOUT (利用者の裁定 2026-09-03: 「値は
    // コードに定数でもて。マジックナンバーをコードに埋め込むなよ。」).
    // GOES RED IF: the MUST is reworded to point at different rows, or the
    // MUST NOT against hand-typed literals is softened or dropped.
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

// ---------------------------------------------------------------------------
// Table T-207 -- 透かし（成果物に埋め込む定数。文書には保存しない）
// ---------------------------------------------------------------------------

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
    // ⭐⭐ MOVED BY THE RULING OF 2026-09-05 -- 「字の大きさも、
    // コントラストも小さくしろ」. CR-351 carries the arithmetic; this guard
    // only holds the manuscript to what was decided.
    expect(bare(row.by['値'] ?? '')).toBe('0.01125')
    expect(bare(row.by['下限'] ?? '')).toBe('0.01')
    expect(bare(row.by['上限'] ?? '')).toBe('1')
    // ⭐ 「掛ける相手は書き出す絵の幅（S-81）である」 -- a case that hard-coded the
    // export width instead of reading S-81 would still pass a same-fixed-
    // canvas test, so this row's own remark is checked directly.
    expect(row.by['備考'] ?? '').toContain('書き出す絵の幅')
    expect(row.by['備考'] ?? '').toContain('S-81')
  })

  it('S-222 -- the repeat-spacing coefficient -- multiplies the mark height, both axes alike', () => {
    const row = rowOf(T_207, 'S-222')
    // ⭐⭐ MOVED BY THE RULING OF 2026-09-05 -- 「字の大きさも、
    // コントラストも小さくしろ」. CR-351 carries the arithmetic; this guard
    // only holds the manuscript to what was decided.
    expect(bare(row.by['値'] ?? '')).toBe('14.44')
    expect(bare(row.by['下限'] ?? '')).toBe('1')
    expect(bare(row.by['上限'] ?? '')).toBe('20')
    expect(row.by['備考'] ?? '').toContain('縦横とも同じ間隔')
  })

  it('S-102 -- watermarkOpacity -- sits inside the same table, outside the contrast range (LM-13)', () => {
    const row = rowOf(T_207, 'S-102')
    expect(bare(row.by['名前'] ?? '')).toBe('watermarkOpacity')
    // ⭐⭐ MOVED BY THE RULING OF 2026-09-05 -- 「字の大きさも、
    // コントラストも小さくしろ」. CR-351 carries the arithmetic; this guard
    // only holds the manuscript to what was decided.
    expect(bare(row.by['値'] ?? '')).toBe('0.06')
    expect(bare(row.by['下限'] ?? '')).toBe('0.02')
    expect(bare(row.by['上限'] ?? '')).toBe('0.30')
    // ⭐ 「薄いほうがよい、が狙いである」 -- the range's own top must not exceed
    // what NFR-007 / LM-13 already excluded from the contrast floor.
    expect(row.by['備考'] ?? '').toContain('コントラストの適合範囲から外してある')
  })
})

describe('table T-236 still holds S-223, the fourth of the four values (the ink colour)', () => {
  it('S-223 -- the ink colour -- is the same as S-148 (the muted text colour), in both themes', () => {
    const row = rowOf(T_236, 'S-223')
    // ⚠️ `bare()` reads the FIRST backtick span of a cell. These two cells are
    // each spelled "`S-148` に同じ", so `bare()` correctly returns "S-148" and
    // not the trailing words -- unlike the raw-sentence cells read below,
    // which carry more than one backtick span and are read whole instead.
    // ⭐⭐ MOVED BY THE RULING OF 2026-09-05 -- 「字の大きさも、
    // コントラストも小さくしろ」. CR-351 carries the arithmetic; this guard
    // only holds the manuscript to what was decided.
    expect(bare(row.by['明るいテーマ'] ?? '')).toBe('S-148')
    expect(bare(row.by['暗いテーマ'] ?? '')).toBe('S-148')
    expect(row.by['色相追随'] ?? '').toBe('—')
    // ⛔ FR-020 (MUST NOT): 「濃さをここに書いてはならない」 -- S-223's own row
    // must defer S-102's number rather than restating it.
    expect(row.by['備考'] ?? '').toContain('濃さをここに書いてはならない')
  })
})

// ---------------------------------------------------------------------------
// Cross-consistency -- the same rule stated in more than one place must not
// have drifted. (This project's own ledger records finding exactly that kind
// of drift before -- CR-348's handoff notes cite two cases in one round.)
// ---------------------------------------------------------------------------

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
    // ⭐ THE REASON GIVEN IS THE ONE THIS FILE'S HOLE ALSO RESTS ON: the name
    // and the clock make the layer different on every run and every machine.
    expect(wy2.by['判定に含めないもの'] ?? '').toContain('実行のたび・機ごとに必ず変わる')
  })

  it('table T-206 (S-144) still agrees that hiding the mark on screen hides it in the export too', () => {
    const s144 = rowOf(specTable('T-206'), 'S-144')
    expect(bare(s144.by['既定'] ?? '')).toBe('出す')
    expect(s144.by['保存しない理由'] ?? '').toContain('書き出す絵からも消える')
    expect(s144.by['保存しない理由'] ?? '').toContain('FR-020')
  })

  it('S-99a (the opener\'s name, FR-086) still lives outside documentSettings, in the same separate slot FR-020 relies on', () => {
    // ⭐ THIS IS WHY THE RENDERING HOLE ABOVE EXISTS: if the name lived inside
    // `DocumentSettings`, `svgFromSchedule`'s existing `settings` argument
    // could be the channel. It does not.
    const s99a = rowOf(specTable('T-206'), 'S-99a')
    expect(s99a.by['値'] ?? '').toContain('透かしに出す')
    expect(s99a.by['保存しない理由'] ?? '').toContain('別枠')
    expect(s99a.by['保存しない理由'] ?? '').toContain('localStorage')
    // FR-086 (MUST): 「名前は表 T-206 の S-99a の既定値から始めること」.
    expect(bare(s99a.by['既定'] ?? '')).toBe('user')
  })
})
