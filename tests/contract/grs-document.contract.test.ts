// Contract test: the shared document fixture.
//
// Everything that reads or writes a document goes through one schema, so this
// checks that the schema is usable before 71 units depend on it -- that it
// compiles, that it names the groups table T-052 fixes, and that it actually
// rejects rather than waving things through.

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
    expect(schema.required).toContain('documentStamp')
    expect(schema.required).toContain('changeLog')
  })

  it('keys changeLog by its position in the document, and by nothing borrowed (AT-130)', () => {
    // 表 T-058 の `AT-130`: 「`changeLog` / `ordinal` / 整数 / PK / 文書の中での
    // 出現順」 -- the same 作法 as `WeekDay`, `Exception` and `CarryElement`,
    // each of which keys on 「親の中での出現順」. The row is READ here rather
    // than copied, so a rename in the source lands in this case.
    const columns = specTable('T-058').rows.filter(
      (row) => bare(row.by['エンティティ'] ?? '') === 'changeLog',
    )
    expect(columns.map((row) => bare(row.by['列'] ?? ''))).toEqual([
      'ordinal',
      'editedBy',
      'explanation',
      'changedUtc',
    ])

    // ⛔ Exactly one primary key, and it is the position -- not a value
    // borrowed from the stamp, which is what made this the one entity of the
    // eighteen without a key of its own.
    const keyed = columns.filter((row) => row.by['鍵'] === 'PK')
    expect(keyed.map((row) => bare(row.by['列'] ?? ''))).toEqual(['ordinal'])
    expect(bare(keyed[0]!.by['型'] ?? '')).toBe('整数')

    // The schema generated from the same source admits an entry at a position
    // and refuses one that carries a key it does not define.
    const entry = { ordinal: 0, editedBy: 'user', explanation: 'why', changedUtc: '2026-08-17T00:00:00Z' }
    expect(validateEntity('changeLog', entry).valid).toBe(true)
    expect(validateEntity('changeLog', { ...entry, revision: 1 }).valid).toBe(false)
    const { ordinal: _dropped, ...keyless } = entry
    expect(validateEntity('changeLog', keyless).valid).toBe(false)
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

  it('states the default calendar in two weekday numberings that differ by one', () => {
    // ⛔ The trap CR-180 wrote into AT-73 and AT-17. The exchange format counts
    // weekdays twice over: WeekDay/DayType from 1 = Sunday, and
    // Project/WeekStartDay from 0 = Sunday. So Monday is 2 in one row of table
    // T-209 and 1 in the next, and a reader who assumes one numbering shifts
    // every day by one without anything failing.
    const sundayIndexOfDayType = (n: number): number => n - 1
    const sundayIndexOfWeekStart = (n: number): number => n

    // S-106 is 月〜金 and S-108 is 月曜. Changing either in the manuscript is
    // meant to fail here: they are 🔎 values, and this is the test that makes
    // reselecting one a visible act rather than a silent one.
    expect(DEFAULT_CALENDAR_VALUES['S-106'].map(sundayIndexOfDayType)).toEqual([1, 2, 3, 4, 5])
    expect(sundayIndexOfWeekStart(DEFAULT_CALENDAR_VALUES['S-108'])).toBe(1)
    expect(DEFAULT_CALENDAR_VALUES['S-107']).toEqual([])

    // And each row stays inside the range its own numbering allows, so a
    // dayType number cannot be pasted into the weekStartDay row unnoticed.
    for (const day of DEFAULT_CALENDAR_VALUES['S-106']) {
      expect(day, 'a dayType runs 1..7').toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(7)
    }
    expect(DEFAULT_CALENDAR_VALUES['S-108']).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_CALENDAR_VALUES['S-108']).toBeLessThanOrEqual(6)
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
