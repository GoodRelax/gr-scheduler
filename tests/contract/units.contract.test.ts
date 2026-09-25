// Contract test: the unit inventory of table T-075.

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

const puritiesOf = (row: (typeof T075.rows)[number]): readonly string[] => {
  const stated = bareAll(row.by['純粋性'] ?? '')
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

const purityTagsIn = (text: string): readonly string[] =>
  [...text.matchAll(/@purity\s+([a-z/-]+)/g)].map((hit) => hit[1] ?? '')

describe('table T-075 -- the unit inventory', () => {
  it('counts the 147 units table T-075 states', () => {
    expect(units).toHaveLength(147)
  })

  it('names one public entry per component, and 37 of them', () => {
    const entries = units.filter((u) => u.file === `${kebab(u.component)}.ts`)
    expect(entries).toHaveLength(new Set(units.map((u) => u.component)).size)
    expect(entries).toHaveLength(37)
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
    const summary = /@purity {4}([a-z/-]+)/.exec(text)?.[1] ?? ''
    expect(purities, `${path}'s header says ${summary}`).toContain(summary)
    for (const stated of purities) {
      expect(tags, `${path} carries no @purity ${stated}`).toContain(stated)
    }
  })
})
