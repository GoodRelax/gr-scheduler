// DFC-582: every IV- row of table T-220 has an entry in the dictionary section invariants.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'

const ROOT = process.cwd()
const MANUSCRIPT_PATH = join(ROOT, 'docs', 'spec', '_source', 'display-words.json')
const GENERATED_PATH = join(ROOT, 'src', 'adapter', 'screen-renderer', 'display-words.json')

interface Entry {
  readonly rowId?: unknown
  readonly text?: { readonly ja?: unknown; readonly en?: unknown }
  readonly nextStep?: { readonly ja?: unknown; readonly en?: unknown }
}

const invariantsOf = (path: string): readonly Entry[] => {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  const section = raw['invariants']
  return Array.isArray(section) ? (section as Entry[]) : []
}

const IV_ROWS: readonly string[] = specTable('T-220')
  .rows.map((one) => one.id)
  .filter((id) => id.startsWith('IV-'))

describe('DFC-582 premise -- table T-220 is read', () => {
  it('table T-220 has IV- rows, including IV-21', () => {
    expect(IV_ROWS.length).toBeGreaterThan(0)
    expect(IV_ROWS).toContain('IV-21')
    expect(new Set(IV_ROWS).size).toBe(IV_ROWS.length)
  })
})

describe.each([
  { which: 'the manuscript', path: MANUSCRIPT_PATH },
  { which: 'the generated copy the screen reads', path: GENERATED_PATH },
])('DFC-582 / T-233 closing -- $which holds one invariants entry per T-220 row', ({ path }) => {
  it('has exactly the IV- rows of table T-220, each once', () => {
    const ids = invariantsOf(path).map((one) => one.rowId)
    expect([...ids].sort()).toEqual([...IV_ROWS].sort())
  })

  it('gives every entry words and a next step in ja and en, possibly empty', () => {
    const entries = invariantsOf(path)
    expect(entries.length).toBe(IV_ROWS.length)
    for (const one of entries) {
      for (const part of [one.text, one.nextStep]) {
        expect(typeof part?.ja, JSON.stringify(one)).toBe('string')
        expect(typeof part?.en, JSON.stringify(one)).toBe('string')
      }
    }
  })
})
