// The defaults the shipped tool starts from, against the defaults the
// manuscript states.
//
// Unit under test: `SETTINGS_DEFAULTS` of UF-1 (`document-settings.ts`,
// component CP-3 of table T-062) -- the generated set of starting values every
// other unit falls back on when a document does not carry one.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// Why this bench exists
// ---------------------------------------------------------------------------
//
// Many benches read a number out of `SETTINGS_DEFAULTS` and drive a unit with
// it, so that no value is re-typed (rule 03 section 1). ⛔ THAT LEAVES THE
// VALUE ITSELF UNMEASURED: every one of those cases would still pass if the
// shipped default were something the manuscript never said. This file is the
// one place that asks whether the number the tool starts from is the number
// `_assets/tbl-settings.md` prints.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   tbl-settings.md 冒頭  ⛔ 「設定値の唯一の正は `_source/settings.json` である」
//                        and 「本書はそれを…印字したものである」 -- so the table
//                        and the shipped defaults are two printings of one
//                        source, and they are required to agree.
//   S-35 (表 T-201)      `truncateUnits`, 既定値 48 -- 「全角 24 文字 = 半角 48。
//                        ⭐ 利用者の指示である（2026-08-29「タスク名は半角 48
//                        文字まで表示してあとは ... で省略しろ」）」。
//                        ⚠️ 「省略記号を含めた長さがこの値に収まる」, and the
//                        cutting itself is measured by tests/unit/
//                        layout-engine.test.ts (LC-4); what is measured here is
//                        the number that bench reads out of the defaults.
//   S-124 (表 T-212)     `iconHintDelayMs`, 値 2000 ms -- 「説明を出すまでの待ち
//                        時間（`FR-092` の `EZ-2`（アイコン）と `EZ-6`（タスク））」。
//                        ⚠️ 「2026-08-29 に 3000 → 2000 へ下げた（利用者の裁定
//                        「Tips はマウスカーソルを当てて 2 秒で表示しろ」）」。
//                        ⚠️ 「値は 1 つである —— 場所ごとに違う待ち時間を持たな
//                        い（`EZ-6` の MUST NOT）」.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: `docs/spec/_assets/tbl-settings.md` and nothing of `src/` --
// not one file. `SETTINGS_DEFAULTS` is reached through the declaration a dozen
// other benches already import. ⛔ NO NUMBER IS TYPED IN A CASE: every expected
// value is read out of the table at run time, and the two rows the ledger turns
// on are named by their row ID, never by their value.
//
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED:
//   1. ROWS WHOSE CELL IS NOT A PLAIN NUMBER. `S-2` states a formula, `S-3` a
//      lookup into 表 T-215, `S-73` a value the document keeps on `Project`
//      (DR-5 of table T-052) rather than in the settings. A case that parsed
//      those would be asserting its own arithmetic, so the sweep passes over
//      them and reports what it passed over.
//   2. THE BOUNDS. 下限 / 上限 are the range, not the starting value, and the
//      benches that mean them (tests/unit/fr-016-zoom-bounds.test.ts) already
//      exist.
//   3. WHICH KEYS THE DOCUMENT STORES. That division is 表 T-206's, and
//      tests/contract/grs-document.contract.test.ts is the bench for it.

import { describe, expect, it } from 'vitest'

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

/**
 * Every numbered table of `_assets/tbl-settings.md` that names a key and states
 * a starting value, with the two headings it uses for each.
 *
 * ⚠️ The headings differ between them: the tables the document stores write
 * 「キー」/「既定値」or「既定」, and the tables it does not store write 「名前」/
 * 「値」. Both are the same claim -- the value the tool starts from.
 */
const TABLES = [
  { id: 'T-201', key: 'キー', value: '既定値' },
  { id: 'T-202', key: 'キー', value: '既定' },
  { id: 'T-203', key: 'キー', value: '既定' },
  { id: 'T-204', key: 'キー', value: '既定' },
  { id: 'T-205', key: 'キー', value: '既定' },
  { id: 'T-217', key: 'キー', value: '既定' },
  { id: 'T-208', key: '名前', value: '値' },
  { id: 'T-210', key: '名前', value: '値' },
  { id: 'T-211', key: '名前', value: '値' },
  { id: 'T-212', key: '名前', value: '値' },
  { id: 'T-213', key: '名前', value: '値' },
  { id: 'T-214', key: '名前', value: '値' },
  { id: 'T-215', key: '名前', value: '値' },
] as const

/** The starting values the tool ships, by the key the manuscript names. */
const SHIPPED = SETTINGS_DEFAULTS as unknown as Readonly<Record<string, unknown>>

/**
 * The number a cell states, or `null` when the cell states something else --
 * a formula, a lookup, a word, a date.
 *
 * ⚠️ A 🔎 stands beside a value whose origin was never recorded (section 2 of
 * the same document), and a unit follows some of them (`px`, `ms`, `日`), so
 * both are taken off before the cell is required to BE a number. ⛔ A cell that
 * merely CONTAINS a number is not read as stating one: 「`rulerFont` × 3 +
 * `rulerLabelPad` × 3（S = 42 / M = 48 / L = 54）」 states three of them.
 */
function numberStatedBy(cell: string): number | null {
  const written = bare(cell)
    .replace(/🔎/g, '')
    .replace(/(px|ms|pt|%|日|文字|回|個)$/u, '')
    .trim()
  return /^-?\d+(\.\d+)?$/.test(written) ? Number.parseFloat(written) : null
}

interface Stated {
  readonly table: string
  readonly row: string
  readonly key: string
  readonly stated: number
}

/** Every row of those tables that states a plain number for a key the tool ships. */
const CHECKED: readonly Stated[] = TABLES.flatMap(({ id, key, value }) => {
  const table = specTable(id)
  if (!table.headings.includes(key) || !table.headings.includes(value)) {
    throw new Error(`table ${id} no longer has ${key} / ${value}: ${table.headings.join(' | ')}`)
  }
  return table.rows.flatMap((row) => {
    const name = bare(row.by[key] ?? '')
    const stated = numberStatedBy(row.by[value] ?? '')
    if (stated === null) return []
    if (typeof SHIPPED[name] !== 'number') return []
    return [{ table: id, row: row.id, key: name, stated }]
  })
})

/** One row of the manuscript, found by its row ID. */
function statedBy(row: string): Stated {
  const found = CHECKED.find((one) => one.row === row)
  if (found === undefined) {
    throw new Error(
      `no table of _assets/tbl-settings.md states a plain number for ${row}; ` +
        `the sweep reached ${CHECKED.map((one) => one.row).join(', ')}`,
    )
  }
  return found
}

// ---------------------------------------------------------------------------

describe('_assets/tbl-settings.md — the shipped defaults are the printed defaults', () => {
  it('reaches enough rows for the sweep to mean anything', () => {
    // ⛔ A sweep that matched nothing would pass in silence. The floor is the
    // count this bench was written against; a table that stops being read
    // falls here rather than going quiet.
    expect(CHECKED.length, CHECKED.map((one) => `${one.row}=${one.key}`).join(' ')).toBeGreaterThan(
      40,
    )
  })

  it('starts every one of them from the number the manuscript prints', () => {
    // 「本書は…`_source/settings.json` を印字したものである」 -- one source, two
    // printings, and they are required to agree.
    for (const one of CHECKED) {
      expect(SHIPPED[one.key], `表 ${one.table} の ${one.row}（\`${one.key}\`）`).toBe(one.stated)
    }
  })
})

describe('S-35 (表 T-201) — a name is cut at 48 half-width units, not 24', () => {
  it('ships `truncateUnits` at the number the row states', () => {
    // 「全角 24 文字 = 半角 48」（利用者の指示 2026-08-29）。⛔ The number is read
    // from the row, never typed: what this case fixes is WHICH row answers.
    const s35 = statedBy('S-35')
    expect(s35.key).toBe('truncateUnits')
    expect(SHIPPED['truncateUnits'], '表 T-201 の S-35').toBe(s35.stated)
  })

  it('leaves room for the mark 表 T-013 の前書き requires', () => {
    // 「記号を含めた長さがこの値に収まる」 -- a limit smaller than the mark
    // itself could not hold a cut name at all. ⭐ The mark is `…` (U+2026), one
    // character of two units; the cut itself is measured by LC-4 in
    // tests/unit/layout-engine.test.ts.
    expect(SHIPPED['truncateUnits'] as number).toBeGreaterThan(2)
  })
})

describe('S-124 (表 T-212) — the explanation waits two seconds', () => {
  it('ships `iconHintDelayMs` at the number the row states', () => {
    // 「2026-08-29 に 3000 → 2000 へ下げた」（利用者の裁定「Tips はマウスカーソル
    // を当てて 2 秒で表示しろ」）。
    const s124 = statedBy('S-124')
    expect(s124.key).toBe('iconHintDelayMs')
    expect(SHIPPED['iconHintDelayMs'], '表 T-212 の S-124').toBe(s124.stated)
  })

  it('holds that wait once, and not per place', () => {
    // ⚠️ 「値は 1 つである —— 場所ごとに違う待ち時間を持たない（`EZ-6` の MUST
    // NOT）」. EZ-2 (icons) and EZ-6 (tasks) both name S-124, so a second wait
    // under another key would be the defect this case is for.
    const waits = Object.keys(SHIPPED).filter((key) => /HintDelayMs$|RestMs$|TooltipDelay/i.test(key))
    expect(waits, waits.join(' ')).toEqual(['iconHintDelayMs'])
  })

  it('keeps the wait inside the bounds the row states', () => {
    // 下限 500 / 上限 10000 -- read, not typed.
    const row = specTable('T-212').rows.find((one) => one.id === 'S-124')
    if (row === undefined) throw new Error('table T-212 no longer has row S-124')
    const floor = Number.parseFloat(bare(row.by['下限'] ?? ''))
    const ceiling = Number.parseFloat(bare(row.by['上限'] ?? ''))
    const shipped = SHIPPED['iconHintDelayMs'] as number
    expect(shipped).toBeGreaterThanOrEqual(floor)
    expect(shipped).toBeLessThanOrEqual(ceiling)
  })
})
