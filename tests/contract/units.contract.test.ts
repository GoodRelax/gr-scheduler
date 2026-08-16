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
import { bare, specTable } from './spec-table'

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

const units = T075.rows.map((row) => {
  const component = bare(row.by['コンポーネント'] ?? '')
  const file = bare(row.by['ユニット'] ?? '')
  const purity = bare(row.by['純粋性'] ?? '')
  return {
    id: row.id,
    component,
    file,
    // The table writes an em dash for a unit that only declares an interface;
    // the tree keeps to ASCII and says n/a.
    purity: purity === '—' || purity === '-' ? 'n/a' : purity,
    path: join('src', LAYER_FOLDER[layerOf(component)] ?? '?', kebab(component), file),
  }
})

describe('table T-075 -- the unit inventory', () => {
  it('counts the 71 units the design chapter states', () => {
    expect(units).toHaveLength(71)
  })

  it('names one public entry per component, and 38 of them', () => {
    const entries = units.filter((u) => u.file === `${kebab(u.component)}.ts`)
    expect(entries).toHaveLength(new Set(units.map((u) => u.component)).size)
    expect(entries).toHaveLength(38)
  })

  it.each(units)('$id $path exists', ({ path }) => {
    expect(existsSync(path), `${path} does not exist`).toBe(true)
  })

  it.each(units)('$id $path says which row it came from', ({ path, id }) => {
    expect(readFileSync(path, 'utf8')).toContain(`@unit      ${id} `)
  })

  it.each(units)('$id $path carries the purity of its row', ({ path, purity }) => {
    expect(readFileSync(path, 'utf8')).toContain(`@purity    ${purity}`)
  })
})
