// Contract test: the shared document fixture.
//
// Everything that reads or writes a document goes through one schema, so this
// checks that the schema is usable before 71 units depend on it -- that it
// compiles, that it names the groups table T-052 fixes, and that it actually
// rejects rather than waving things through.

import { describe, expect, it } from 'vitest'
import { bare, specTable } from './spec-table'
import { documentSchema, validateDocument, validateEntity } from '../fixtures/grs-document'

const schema = documentSchema as {
  required: string[]
  properties: Record<string, unknown>
  $defs: Record<string, unknown>
}

describe('the GRS JSON schema, as a shared fixture', () => {
  it('compiles and rejects a value that is not a document', () => {
    expect(validateDocument({}).valid).toBe(false)
    expect(validateDocument(null).valid).toBe(false)
  })

  it('holds a definition for every entity of table T-056', () => {
    // Table T-056 is generated from erd.json, and so is the schema, so this
    // stays true by construction -- which is exactly why it is cheap to assert
    // and loud when the two stop being generated from the same source.
    const entities = specTable('T-056').rows.map((row) => bare(row.by['名前'] ?? ''))
    expect(entities.length).toBeGreaterThan(0)
    for (const entity of entities) {
      expect(Object.keys(schema.$defs), `no definition for ${entity}`).toContain(entity)
    }
  })

  it('puts the three root groups where table T-052 puts them', () => {
    // DR-2 schedule, DR-3 documentSettings, DR-4 the stamp beside them.
    expect(schema.required).toContain('schedule')
    expect(schema.required).toContain('documentSettings')
    expect(schema.required).toContain('schemaVersion')
    expect(schema.required).toContain('revisionStamp')
    expect(schema.required).toContain('changeLog')
  })

  it('rejects a key the schedule group does not define', () => {
    // FR-024 writes every key out, so an unknown one means a writer invented
    // a column. additionalProperties must not let it through.
    const weekDay = { ordinal: 0, dayType: 1, dayWorking: false, carry: {}, carryElements: [] }
    expect(validateEntity('WeekDay', weekDay).valid).toBe(true)
    expect(validateEntity('WeekDay', { ...weekDay, calendarUid: 1 }).valid).toBe(false)
  })

  it('rejects a value outside the range the source states', () => {
    const weekDay = { ordinal: 0, dayType: 9, dayWorking: false, carry: {}, carryElements: [] }
    const result = validateEntity('WeekDay', weekDay)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/dayType/)
  })
})
