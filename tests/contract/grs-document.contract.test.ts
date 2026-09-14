// Contract test: the shared document fixture's JSON schema.

import { describe, expect, it } from 'vitest'
import { bare, specTable } from './spec-table'
import { documentSchema, validateDocument, validateEntity } from '../fixtures/grs-document'
import {
  COLUMN_DEFAULTS,
  DEFAULT_CALENDAR_VALUES,
} from '../../src/entity/document-model/schedule/schedule'

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
    const entities = specTable('T-056').rows.map((row) => bare(row.by['名前'] ?? ''))
    expect(entities.length).toBeGreaterThan(0)
    for (const entity of entities) {
      expect(Object.keys(schema.$defs), `no definition for ${entity}`).toContain(entity)
    }
  })

  it('puts the three root groups where table T-052 puts them', () => {
    expect(schema.required).toContain('schedule')
    expect(schema.required).toContain('documentSettings')
    expect(schema.required).toContain('schemaVersion')
    expect(schema.required).toContain('documentStamp')
    expect(schema.required).toContain('changeLog')
  })

  it('keys changeLog by its position in the document, and by nothing borrowed (AT-130)', () => {
    const columns = specTable('T-058').rows.filter(
      (row) => bare(row.by['エンティティ'] ?? '') === 'changeLog',
    )
    expect(columns.map((row) => bare(row.by['列'] ?? ''))).toEqual([
      'ordinal',
      'editedBy',
      'explanation',
      'changedUtc',
    ])

    const keyed = columns.filter((row) => row.by['鍵'] === 'PK')
    expect(keyed.map((row) => bare(row.by['列'] ?? ''))).toEqual(['ordinal'])
    expect(bare(keyed[0]!.by['型'] ?? '')).toBe('整数')

    const entry = { ordinal: 0, editedBy: 'user', explanation: 'why', changedUtc: '2026-08-17T00:00:00Z' }
    expect(validateEntity('changeLog', entry).valid).toBe(true)
    expect(validateEntity('changeLog', { ...entry, revision: 1 }).valid).toBe(false)
    const { ordinal: _dropped, ...keyless } = entry
    expect(validateEntity('changeLog', keyless).valid).toBe(false)
  })

  it('rejects a key the schedule group does not define', () => {
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

  it('states the default calendar in two weekday numberings that differ by one', () => {
    // TRAP: WeekDay/DayType numbers weekdays from 1 = Sunday; Project/WeekStartDay
    // numbers them from 0 = Sunday (CR-180). One numbering shifted by a day fails nothing.
    const sundayIndexOfDayType = (n: number): number => n - 1
    const sundayIndexOfWeekStart = (n: number): number => n

    expect(DEFAULT_CALENDAR_VALUES['S-106'].map(sundayIndexOfDayType)).toEqual([1, 2, 3, 4, 5])
    expect(sundayIndexOfWeekStart(DEFAULT_CALENDAR_VALUES['S-108'])).toBe(1)
    expect(DEFAULT_CALENDAR_VALUES['S-107']).toEqual([])

    for (const day of DEFAULT_CALENDAR_VALUES['S-106']) {
      expect(day, 'a dayType runs 1..7').toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(7)
    }
    expect(DEFAULT_CALENDAR_VALUES['S-108']).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_CALENDAR_VALUES['S-108']).toBeLessThanOrEqual(6)
  })

  it('carries every default table T-058 publishes, spelled the same way', () => {
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

    const visual = schema.$defs['TaskVisual'] as {
      properties: Record<string, { default?: unknown }>
    }
    expect(visual.properties['milestoneGlyph']?.default)
      .toBe(COLUMN_DEFAULTS.TaskVisual.milestoneGlyph)
  })
})
