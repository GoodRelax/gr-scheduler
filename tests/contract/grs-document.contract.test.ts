// Contract test: the shared document fixture.
//
// Everything that reads or writes a document goes through one schema, so this
// checks that the schema is usable before 71 units depend on it -- that it
// compiles, that it names the groups table T-052 fixes, and that it actually
// rejects rather than waving things through.

import { describe, expect, it } from 'vitest'
import { bare, specTable } from './spec-table'
import { documentSchema, validateDocument, validateEntity } from '../fixtures/grs-document'
import { COLUMN_DEFAULTS } from '../../src/entity/document-model/schedule/schedule'

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

  it('carries every default table T-058 publishes, spelled the same way', () => {
    // FR-078 sends an unchosen milestone figure to AT-101's default rather
    // than naming a figure itself, so the value has exactly one home. This
    // walks the published table and holds the code against it: change the
    // default in the manuscript and this fails until the code is rebuilt,
    // which is the guard CR-174 found missing when S-49 moved and nothing
    // anywhere said so.
    const published = new Map<string, string>()
    for (const row of specTable('T-058').rows) {
      const note = row.by['意味'] ?? ''
      const found = /既定は `'?([A-Za-z0-9.-]+)'?`/.exec(note)
      if (found) {
        published.set(`${bare(row.by['エンティティ'] ?? '')}.${bare(row.by['列'] ?? '')}`,
                      found[1] as string)
      }
    }
    expect(published.size, 'table T-058 publishes no default at all').toBeGreaterThan(0)

    const generated = new Map<string, string>()
    for (const [entity, columns] of Object.entries(COLUMN_DEFAULTS)) {
      for (const [column, value] of Object.entries(columns)) {
        generated.set(`${entity}.${column}`, String(value))
      }
    }
    expect(generated, 'the code and the table disagree about the defaults')
      .toEqual(published)

    // ⚠️ And the schema says the same, as an annotation: the column stays
    // nullable, so null still means "not chosen" rather than "invalid".
    const visual = schema.$defs['TaskVisual'] as {
      properties: Record<string, { default?: unknown }>
    }
    expect(visual.properties['milestoneGlyph']?.default)
      .toBe(COLUMN_DEFAULTS.TaskVisual.milestoneGlyph)
  })
})
