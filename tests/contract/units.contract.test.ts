// Contract test: the unit inventory of table T-075.
//
// Check 18 of the specification harness already compares the SET of files under
// src/ with this table. What it cannot see is whether a file still says which
// row it came from -- and that tag is the chain the whole traceability rests on
// (`R7.6` makes the purity tag a MUST, and the unit row is what leads from a
// file back to its component, its layer and the requirement it serves).
//
// Driven by the table, once. A failure names the row.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bare, bareAll, specTable } from './spec-table'

const T075 = specTable('T-075')
const T062 = specTable('T-062')

const LAYER_FOLDER: Record<string, string> = {
  documentModel: join('entity', 'document-model'),
  layoutEngine: join('entity', 'layout-engine'),
  UseCase: 'use-case',
  Adapter: 'adapter',
  Framework: 'framework',
}

const kebab = (name: string): string =>
  name.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase()

const layerOf = (component: string): string => {
  const row = T062.rows.find((r) => bare(r.by['コンポーネント'] ?? '') === component)
  if (row === undefined) throw new Error(`table T-062 has no component ${component}`)
  return bare(row.by['層'] ?? '')
}

/**
 * Every purity value one row of table T-075 states.
 *
 * ⛔⛔ THE COLUMN ENUMERATES, AND THE MANUSCRIPT SAYS SO IN AS MANY WORDS
 * (05-07-design.md, under table T-075): 「純粋性は関数ごとの分類である（`R7.1`）。
 * 本欄はそのユニットが持つ関数の純粋性を重複なく並べたものであり、メンバごとの値は
 * 表 T-064 が持つ」. `UF-41` and `UF-51` are 「`semi-pure-b` ／ `non-pure`」, and
 * the same section settles that this is no violation: 「`semi-pure-b` と
 * `non-pure` が同じユニットに載ることは `R7.9` に反しない」. Reading the first
 * span alone asked for half of what those two rows state (`D-351`).
 */
const puritiesOf = (row: (typeof T075.rows)[number]): readonly string[] => {
  const stated = bareAll(row.by['純粋性'] ?? '')
  // The table writes an em dash for a unit that only declares an interface;
  // the tree keeps to ASCII and says n/a.
  return stated.map((one) => (one === '—' || one === '-' ? 'n/a' : one))
}

const units = T075.rows.map((row) => {
  const component = bare(row.by['コンポーネント'] ?? '')
  const file = bare(row.by['ユニット'] ?? '')
  const purities = puritiesOf(row)
  return {
    id: row.id,
    component,
    file,
    purities,
    path: join('src', LAYER_FOLDER[layerOf(component)] ?? '?', kebab(component), file),
  }
})

/** Every `@purity` tag a file carries, header and functions alike. */
const purityTagsIn = (text: string): readonly string[] =>
  [...text.matchAll(/@purity\s+([a-z/-]+)/g)].map((hit) => hit[1] ?? '')

describe('table T-075 -- the unit inventory', () => {
  // ⚠️ CR-280 retired the autosave whole, and with it CP-23 `AutosaveGateway`,
  // CP-29 `LocalStorageDocumentStore` and every unit they owned: table T-075
  // fell from 71 rows to 68 and table T-062 from 38 components to 36. The
  // numbers below are the tables' own, counted at read time.
  // ⭐ THE PROSE HAS SINCE FOLLOWED (CR-288, recounted 2026-09-03): SU-1 of
  // table T-074 now reads 「**36。** 全数は 表 T-062」 and SU-3 「**68。** 全数は
  // 表 T-075」, so the two sides agree and the cases below are no longer the
  // only place either number is stated correctly.
  it('counts the 68 units table T-075 states', () => {
    expect(units).toHaveLength(68)
  })

  it('names one public entry per component, and 36 of them', () => {
    const entries = units.filter((u) => u.file === `${kebab(u.component)}.ts`)
    expect(entries).toHaveLength(new Set(units.map((u) => u.component)).size)
    expect(entries).toHaveLength(36)
  })

  it.each(units)('$id $path exists', ({ path }) => {
    expect(existsSync(path), `${path} does not exist`).toBe(true)
  })

  it.each(units)('$id $path says which row it came from', ({ path, id }) => {
    expect(readFileSync(path, 'utf8')).toContain(`@unit      ${id} `)
  })

  it.each(units)('$id $path carries the purity of its row', ({ path, purities }) => {
    const text = readFileSync(path, 'utf8')
    const tags = purityTagsIn(text)
    // ⭐ The file-level summary line names ONE of the values the row states --
    // for the 66 rows that state one, that is the value, and this is the check
    // as it always stood.
    const summary = /@purity {4}([a-z/-]+)/.exec(text)?.[1] ?? ''
    expect(purities, `${path}'s header says ${summary}`).toContain(summary)
    // ⛔ AND EVERY value the row states is carried by some function of the
    // unit. For UF-41 and UF-51 that is the half the header cannot say.
    for (const stated of purities) {
      expect(tags, `${path} carries no @purity ${stated}`).toContain(stated)
    }
  })
})
