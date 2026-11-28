// CR-722 spec-only contract: the Resource List (U-49) is a table window with the columns of table T-371 in their order, three fixed columns, the resources in document order and the (Unassigned) row last (T-370, T-371, FR-099).

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { resourceListAfterEntry, resourceListFromWindow } from '../../src/adapter/screen-renderer/resource-list'
import { REQUIREMENTS, SCHEDULE, wordOf } from './cr-722-stage'
import { CANVAS, NO_VIEW, OPENED_DELAY_DIAGNOSTICS_REPORT, sessionIn } from './cr-721-stage'
import { specTable, unbroken } from './spec-table'

const FR_099_WINDOW =
  '`GRS` は、担当リスト（`_assets/tbl-glossary.md` の `U-49`）をウィンドウ（`FR-036` の 表 T-335）にすること。'
const FR_099_COLUMNS = '`GRS` は、担当リストの表の列を 表 T-371 に従わせること。'
const T_371_ORDER = '`GRS` は、担当リストの表の列を、表 T-371 の行の順に左から並べること —— 表示・選択・担当名・担当タスク数・担当タスク。'
const RO_4_ORDER = '`GRS` は、担当リストの表の既定の並びを、文書の `Resource` の並びにすること。`GRS` は、既定の並びで、（担当なし）の行を末尾に置くこと。'
const RO_5_ALWAYS = '`GRS` は、担当のいないタスクを持つ 1 行を、担当のいないタスクが文書に無くても置くこと。'
const RO_7_FIXED = '`GRS` は、見出し行と、`RQ-1`・`RQ-3`・`RQ-2`（表示・選択・担当名 —— 表 T-371 の並びで左の 3 列）を固定すること（`SV-6` の形）。'

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

describe('CR-722 the manuscript these cases are driven by', () => {
  it('FR-099, T-370 and T-371 still say it, word for word', () => {
    expect(REQUIREMENTS).toContain(FR_099_WINDOW)
    expect(REQUIREMENTS).toContain(FR_099_COLUMNS)
    expect(REQUIREMENTS).toContain(T_371_ORDER)
    expect(cellOf('T-370', 'RO-4', '定め')).toContain(RO_4_ORDER)
    expect(cellOf('T-370', 'RO-5', '定め')).toContain(RO_5_ALWAYS)
    expect(cellOf('T-370', 'RO-7', '定め')).toContain(RO_7_FIXED)
  })
})

const T_371_IDS: readonly string[] = specTable('T-371').rows.map((one) => one.id)

// Why: section 5.1 shapes the Resource List functions after the report's, so the opened window is the report's opened shape.
const OPENED = OPENED_DELAY_DIAGNOSTICS_REPORT

interface ColumnLike {
  readonly column: string
  readonly heading: string
  readonly isFixed: boolean
}
interface ViewLike {
  readonly columns: readonly ColumnLike[]
  readonly rows: readonly unknown[]
}

function viewIn(language: DisplayLanguage, window: unknown = OPENED): ViewLike {
  const view = resourceListFromWindow(sessionIn(language), window as never, NO_VIEW, SCHEDULE, [], { canvas: CANVAS, textSizeStep: 1 } as never)
  if (view === null || view === undefined) throw new Error('the opened Resource List has no view')
  return view as unknown as ViewLike
}

const said = (value: unknown): string => JSON.stringify(value)
const inJson = (text: string): string => JSON.stringify(text).slice(1, -1)

describe(`FR-099 (MUST): ${FR_099_COLUMNS}`, () => {
  // Spec: IMPS-281
  it(`${T_371_ORDER.slice(0, 30)} -- RQ-1, RQ-3, RQ-2, RQ-4, RQ-5 in the table's order`, () => {
    expect(T_371_IDS).toEqual(['RQ-1', 'RQ-3', 'RQ-2', 'RQ-4', 'RQ-5'])
    expect(viewIn('ja').columns.map((one) => one.column)).toEqual(T_371_IDS)
  })

  it.each(['ja', 'en'] as const)('each heading is the dictionary word (%s)', (language) => {
    expect(viewIn(language).columns.map((one) => one.heading)).toEqual(T_371_IDS.map((id) => wordOf('resourceListColumns', id, language)))
  })

  it(`RO-7: ${RO_7_FIXED.slice(0, 30)} -- RQ-1, RQ-3 and RQ-2 are fixed, the rest are not`, () => {
    expect(viewIn('ja').columns.map((one) => one.isFixed)).toEqual([true, true, true, false, false])
  })
})

describe(`FR-099 T-370 RO-4 / RO-5 -- ${RO_4_ORDER}`, () => {
  it('one row per resource in document order, then the (Unassigned) row', () => {
    const rows = viewIn('ja').rows.map(said)
    expect(rows.length).toBe(4)
    expect(rows[0]).toContain('Sato Hanako')
    expect(rows[1]).toContain('Tanaka Jiro')
    expect(rows[2]).toContain('Idle Ken')
    expect(rows[3]).toContain(inJson(wordOf('resourceList', 'unassigned', 'ja')))
  })

  it('RQ-5 joins the tasks of a resource with the dictionary separator, in the tree order', () => {
    const rows = viewIn('ja').rows.map(said)
    const separator = wordOf('resourceList', 'taskSeparator', 'ja')
    expect(rows[0]).toContain(inJson(['Alpha', 'Charlie'].join(separator)))
    expect(rows[1]).toContain(inJson(['Bravo', 'Charlie'].join(separator)))
    expect(rows[3]).toContain(inJson(['Delta', 'Echo'].join(separator)))
  })

  it(`${RO_5_ALWAYS.slice(0, 30)} -- the (Unassigned) row stands with no unassigned task`, () => {
    const none = { ...SCHEDULE, tasks: SCHEDULE.tasks.filter((one) => one.uid !== 4 && one.uid !== 5) }
    const view = resourceListFromWindow(sessionIn('en'), OPENED as never, NO_VIEW, none as never, [], { canvas: CANVAS, textSizeStep: 1 } as never) as unknown as ViewLike
    const rows = view.rows.map(said)
    expect(rows.length).toBe(4)
    expect(rows[3]).toContain(inJson(wordOf('resourceList', 'unassigned', 'en')))
  })
})

describe(`FR-099 (MUST): ${FR_099_WINDOW.slice(-40)} -- the window entrances of SV-12 / SV-14`, () => {
  // Spec: IMPS-278
  it('IC-129 minimizes the window', () => {
    const after = resourceListAfterEntry(OPENED as never, NO_VIEW, 'IC-129' as never, null, { schedule: SCHEDULE, chosenResourceUids: [], language: 'ja' } as never) as unknown as {
      readonly window: { readonly shown: string } | null
    } | null
    expect(after?.window?.shown).toBe('minimized')
  })

  it('IC-52 closes the window', () => {
    const after = resourceListAfterEntry(OPENED as never, NO_VIEW, 'IC-52' as never, null, { schedule: SCHEDULE, chosenResourceUids: [], language: 'ja' } as never) as unknown as {
      readonly window: unknown
    } | null
    expect(after).not.toBeNull()
    expect(after?.window).toBeNull()
  })
})
