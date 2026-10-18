// CR-723 spec-only contract: the three tables' views survive save and open (S-560 to S-572, OP-18), fall back to the default, drop what points nowhere, and stay out of MSPDI.

import { describe, expect, it } from 'vitest'

import { documentFromJson, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import { documentAsOpened } from '../../src/framework/single-html-shell/document-file-flow'
import { validateDocument } from '../fixtures/grs-document'
import {
  NONE_CHECKED,
  ALPHA,
  BRAVO,
  BUILT_VERSION,
  DEFAULT_VIEW,
  KEYS_OF,
  RESOURCE_VIEW,
  SATO,
  SEARCH_VIEW,
  TABLES,
  TANAKA,
  VIEWS_SAVED,
  documentText,
  openedFrom,
  savedObjectOf,
  savedTextOf,
  tableViewOf,
  tableViewsIn,
  tableViewsText,
  view,
  viewsOf,
  type ColumnFilter,
  type Loose,
} from './cr-723-stage'

const A_MOMENT = '2026-10-11T09:00:00'
const NOT_STORED_KEYS = ['word', 'at', 'size', 'textSizeStep', 'columnWidths', 'open', 'selection', 'isMinimized', 'isMaximized', 'filters', 'visibility', 'hiddenKeys']

/** @purity pure */
function keysAnywhere(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const one of value) keysAnywhere(one, found)
    return found
  }
  if (value === null || typeof value !== 'object') return found
  for (const [key, inner] of Object.entries(value)) {
    found.push(key)
    keysAnywhere(inner, found)
  }
  return found
}

describe('S-560 to S-572 / FR-024 -- every one of the 13 keys is written, at its default when nothing was set', () => {
  it('a saved default document holds tableViews with the three tables and exactly their keys', () => {
    const saved = tableViewsIn(savedObjectOf(openedFrom(documentText())))
    expect(Object.keys(saved).sort()).toEqual([...TABLES].sort())
    for (const table of TABLES) expect(Object.keys(saved[table] ?? {}).sort(), table).toEqual([...KEYS_OF[table]])
  })

  it('every key reads its default: no eye, no checked row, no filter, no sort', () => {
    const saved = tableViewsIn(savedObjectOf(openedFrom(documentText())))
    for (const table of TABLES) {
      const keys = saved[table] ?? {}
      expect(keys['isScheduleFilterApplied'], table).toBe(false)
      expect(keys['columnFilters'], table).toEqual([])
      expect(keys['sort'], table).toBeNull()
    }
    expect(saved['searchPanel']?.['shownTaskUids']).toEqual([])
    expect(saved['delayDiagnosticsReport']?.['shownTaskUids']).toEqual([])
    expect(saved['resourceList']?.['shownResourceUids']).toEqual([])
    expect(saved['resourceList']?.['isUnassignedShown']).toBe(false)
  })

  it('tableViewOf reads the default view of each table from a default document', () => {
    const document = openedFrom(documentText())
    for (const table of TABLES) expect(tableViewOf(document.documentSettings, table), table).toEqual(DEFAULT_VIEW)
  })

  it('a document without the tableViews key opens at the default (OP-6 fills it), not refused', () => {
    const text = JSON.parse(documentText()) as Loose
    delete (text['documentSettings'] as Loose)['tableViews']
    const opened = documentFromJson(JSON.stringify(text), BUILT_VERSION)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    for (const table of TABLES) expect(tableViewOf(opened.document.documentSettings, table), table).toEqual(DEFAULT_VIEW)
  })
})

describe('OP-18 / S-560 to S-572 -- what is saved comes back as it was', () => {
  const saved = (): Loose => savedObjectOf(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) })))

  it('the saved file holds the checked rows, the eyes, the column filters (with fromDate and toDate) and the sorts as given', () => {
    const views = tableViewsIn(saved())
    expect(views['searchPanel']).toEqual({
      isScheduleFilterApplied: true,
      shownTaskUids: [ALPHA, BRAVO],
      columnFilters: SEARCH_VIEW.columnFilters,
      sort: SEARCH_VIEW.sort,
    })
    expect(views['resourceList']).toEqual({
      isScheduleFilterApplied: true,
      shownResourceUids: [TANAKA],
      isUnassignedShown: true,
      columnFilters: RESOURCE_VIEW.columnFilters,
      sort: RESOURCE_VIEW.sort,
    })
    expect(views['delayDiagnosticsReport']?.['isScheduleFilterApplied']).toBe(false)
  })

  it('a second open of the saved text gives tableViewOf the same three views', () => {
    const again = openedFrom(JSON.stringify(saved()))
    expect(viewsOf(again)).toEqual(VIEWS_SAVED)
  })

  it('open, save, open, save is a fixed point for the views', () => {
    const first = savedTextOf(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) })))
    const second = savedTextOf(openedFrom(first))
    expect(tableViewsIn(JSON.parse(second) as Loose)).toEqual(tableViewsIn(JSON.parse(first) as Loose))
  })

  it('the date fields of a column filter are fromDate and toDate; a filter holds no from or to', () => {
    const filters = (tableViewsIn(saved())['searchPanel']?.['columnFilters'] ?? []) as Loose[]
    expect(filters.length).toBeGreaterThan(0)
    for (const one of filters) {
      expect(Object.keys(one).sort()).toEqual(['column', 'fromDate', 'hiddenValues', 'toDate'])
    }
  })

  it('an empty-string value (the blank item of a value list) and a Japanese value are kept verbatim', () => {
    const odd = view({ columnFilters: [{ column: 'SQ-2', hiddenValues: ['', '佐藤'], fromDate: null, toDate: null }] })
    const document = openedFrom(documentText({ tableViews: tableViewsText({ ...VIEWS_SAVED, searchPanel: odd }) }))
    expect(tableViewOf(openedFrom(savedTextOf(document)).documentSettings, 'searchPanel').columnFilters).toEqual(odd.columnFilters)
  })
})

describe('OP-18 -- a uid that points at nothing and a column that is in no table are dropped, never refused', () => {
  const GONE_TASK = 987654
  const GONE_RESOURCE = 876543
  const NOWHERE = 'no-such-column'
  // WHY: S-562 / S-563 -- the Visibility column (SQ-10) takes no column filter and no sort, so a held one is dropped on read.
  const VISIBILITY_COLUMN = 'SQ-10'

  const strange = (): ReturnType<typeof documentFromJson> =>
    documentFromJson(
      documentText({
        tableViews: tableViewsText({
          ...VIEWS_SAVED,
          searchPanel: view({
            visibility: { shownTaskUids: [ALPHA, GONE_TASK], shownResourceUids: [], isUnassignedShown: false, isScheduleFilterApplied: true },
            columnFilters: [
              { column: 'SQ-5', hiddenValues: ['Done'], fromDate: null, toDate: null },
              { column: VISIBILITY_COLUMN, hiddenValues: ['Hide'], fromDate: null, toDate: null },
              { column: NOWHERE, hiddenValues: ['x'], fromDate: null, toDate: null },
            ],
            sort: { column: NOWHERE, direction: 'ascending' },
          }),
          resourceList: view({ visibility: { shownTaskUids: [], shownResourceUids: [SATO, GONE_RESOURCE], isUnassignedShown: false, isScheduleFilterApplied: false } }),
        }),
      }),
      BUILT_VERSION,
    )

  it('the document opens', () => {
    expect(strange().ok).toBe(true)
  })

  const savedViews = (): Record<string, Loose> => {
    const opened = strange()
    if (!opened.ok) throw new Error('refused')
    return tableViewsIn(savedObjectOf(opened.document))
  }

  // WHY: CR-732 -- a uid is dropped as the file is read, a column row ID as the replaced document opens (OP-18),
  // since only the side that draws the tables knows their columns (JF-1).
  const openedAsReplaced = (): ReturnType<typeof documentAsOpened> => {
    const opened = strange()
    if (!opened.ok) throw new Error('refused')
    return documentAsOpened(opened.document)
  }

  it('the checked task that is not in the document is dropped and the one that is stays', () => {
    expect(savedViews()['searchPanel']?.['shownTaskUids']).toEqual([ALPHA])
  })

  it('the checked resource that is not in the document is dropped and the one that is stays', () => {
    expect(savedViews()['resourceList']?.['shownResourceUids']).toEqual([SATO])
  })

  it('a column filter on a column that is in no table, or on the Visibility column, is dropped and the real one stays; a sort on such a column reads as no sort', () => {
    const search = tableViewsIn(savedObjectOf(openedAsReplaced()))['searchPanel'] ?? {}
    expect(((search['columnFilters'] ?? []) as Loose[]).map((one) => one['column'])).toEqual(['SQ-5'])
    expect(search['sort']).toBeNull()
  })

  it('a sort on the Visibility column (SQ-10) reads as no sort (S-563)', () => {
    const opened = documentFromJson(
      documentText({ tableViews: tableViewsText({ ...VIEWS_SAVED, searchPanel: view({ sort: { column: VISIBILITY_COLUMN, direction: 'ascending' } }) }) }),
      BUILT_VERSION,
    )
    if (!opened.ok) throw new Error('refused')
    const search = tableViewsIn(savedObjectOf(documentAsOpened(opened.document)))['searchPanel'] ?? {}
    expect(search['sort']).toBeNull()
  })

  it('tableViewOf reads the same kept values', () => {
    const opened = { document: openedAsReplaced() }
    const read = tableViewOf(opened.document.documentSettings, 'searchPanel')
    expect(read.visibility.shownTaskUids).toEqual([ALPHA])
    expect(read.columnFilters.map((one: ColumnFilter) => one.column)).toEqual(['SQ-5'])
    expect(read.sort).toBeNull()
    expect(tableViewOf(opened.document.documentSettings, 'resourceList').visibility.shownResourceUids).toEqual([SATO])
  })

  it('the dropped values do not come back in the saved file', () => {
    const text = savedTextOf(openedAsReplaced())
    expect(text).not.toContain(String(GONE_TASK))
    expect(text).not.toContain(String(GONE_RESOURCE))
    expect(text).not.toContain(NOWHERE)
  })
})

describe('FR-151 -- what is not a view is not saved', () => {
  it('no word, place, size, text-size step, column width, open filter or selection is anywhere in a saved file', () => {
    const found = keysAnywhere(savedObjectOf(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) }))))
    for (const key of NOT_STORED_KEYS) expect(found, key).not.toContain(key)
  })

  // WHY: CR-792 (JDG-2723) gave the command value the stored key's own name isScheduleFilterApplied, so it is not listed.
  it('the old shapes (hiddenKeys, visibility, and the retired hidden lists of CR-798) are not the file\'s keys', () => {
    const found = keysAnywhere(tableViewsIn(savedObjectOf(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) })))))
    for (const key of ['hiddenKeys', 'visibility', 'from', 'to', 'hiddenTaskUids', 'hiddenResourceUids', 'isUnassignedHidden']) expect(found, key).not.toContain(key)
  })
})

describe('FR-024 / S-560 to S-572 -- the saved file conforms to the published schema, with $defs ColumnFilter and ColumnSort', () => {
  it('a file holding all three views, with filters and sorts, validates', () => {
    const checked = validateDocument(savedObjectOf(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) }))))
    expect(checked.errors).toEqual([])
  })

  it('the schema names $defs ColumnFilter and ColumnSort and the tableViews key', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const schema = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8')) as {
      $defs: Record<string, { required?: string[]; properties?: Record<string, unknown> }>
      properties: { documentSettings: { required: string[]; properties: Record<string, unknown> } }
    }
    expect(Object.keys(schema.$defs)).toEqual(expect.arrayContaining(['ColumnFilter', 'ColumnSort']))
    expect([...(schema.$defs['ColumnFilter']?.required ?? [])].sort()).toEqual(['column', 'fromDate', 'hiddenValues', 'toDate'])
    expect(Object.keys(schema.$defs['ColumnSort']?.properties ?? {}).sort()).toEqual(['column', 'direction'])
    expect(schema.properties.documentSettings.required).toContain('tableViews')
  })

  it('a filter that still uses the screen-value date names (from, to) is not a ColumnFilter', () => {
    const bad = savedObjectOf(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) })))
    const search = tableViewsIn(bad)['searchPanel'] as Loose
    search['columnFilters'] = [{ column: 'SQ-5', hiddenValues: [], from: null, to: null }]
    expect(validateDocument(bad).valid).toBe(false)
  })

  it('a sort with a direction other than ascending or descending is refused by the schema', () => {
    const bad = savedObjectOf(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) })))
    const search = tableViewsIn(bad)['searchPanel'] as Loose
    search['sort'] = { column: 'SQ-5', direction: 'up' }
    expect(validateDocument(bad).valid).toBe(false)
  })
})

describe('TV-9 -- MSPDI does not carry the views; a document without views is the default', () => {
  it('writing MSPDI from a document with the eyes on gives every task and the same text as the default document', () => {
    const withViews = mspdiFromDocument(openedFrom(documentText({ tableViews: tableViewsText(VIEWS_SAVED) })), A_MOMENT).text
    const plain = mspdiFromDocument(openedFrom(documentText()), A_MOMENT).text
    expect(withViews).toBe(plain)
    expect(withViews).not.toMatch(/tableViews|isScheduleFilterApplied|shownTaskUids|columnFilters/)
    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']) expect(withViews, name).toContain(name)
  })

  it('a document that carries no view reads every table at the none-checked default (TV-9)', () => {
    const document = openedFrom(documentText())
    for (const table of TABLES) expect(tableViewOf(document.documentSettings, table).visibility).toEqual(NONE_CHECKED)
  })
})
