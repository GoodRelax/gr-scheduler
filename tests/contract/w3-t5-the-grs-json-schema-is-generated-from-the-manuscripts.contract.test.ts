// W3 spec-only tester 5: 05-07 section 6 -- the GRS JSON schema is a product generated from erd.json and settings.json.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { unbroken } from './spec-table'

const SOURCE = join(process.cwd(), 'docs', 'spec', '_source')
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const SCHEMA_IS_GENERATED = '**`GRS JSON` のスキーマは、原稿から起こす生成物とする（MUST）'
const TWO_MANUSCRIPTS = '**起こす原稿は 2 つとする（MUST）** —— 日程データの群は `_source/erd.json`、見せ方の群は `_source/settings.json` である。'

interface ErdEntity {
  readonly name: string
  readonly columns: readonly { readonly name: string }[]
}

interface PublishedSchema {
  readonly $defs: Readonly<Record<string, { readonly properties?: Readonly<Record<string, unknown>> }>>
}

const ERD = JSON.parse(readFileSync(join(SOURCE, 'erd.json'), 'utf8')) as { readonly entities: readonly ErdEntity[] }
const SCHEMA = JSON.parse(readFileSync(join(SOURCE, 'grs-document.schema.json'), 'utf8')) as PublishedSchema

describe('W3-T5 -- the manuscript these cases are driven by', () => {
  it.each([SCHEMA_IS_GENERATED, TWO_MANUSCRIPTS])('05-07 still says: %s', (clause) => {
    expect(DESIGN).toContain(clause)
  })
})

describe(`05-07 "${SCHEMA_IS_GENERATED}"`, () => {
  it('the published schema is byte for byte what its generator raises from the manuscripts', () => {
    const run = spawnSync('python', [join(SOURCE, 'erd_json_to_schema.py'), '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    expect(run.error, 'python could not be started').toBeUndefined()
    expect({ status: run.status, out: `${run.stdout}${run.stderr}`.trim() }, SCHEMA_IS_GENERATED).toMatchObject({ status: 0 })
  })

  it.each(ERD.entities.map((entity) => [entity.name, entity] as const))(
    'the schema holds %s with exactly the columns erd.json gives it, and no column of its own',
    (name, entity) => {
      const properties = SCHEMA.$defs[name]?.properties
      expect(properties, `the schema has no definition for ${name}`).toBeDefined()
      expect(new Set(Object.keys(properties ?? {})), TWO_MANUSCRIPTS).toEqual(new Set(entity.columns.map((one) => one.name)))
    },
  )
})
