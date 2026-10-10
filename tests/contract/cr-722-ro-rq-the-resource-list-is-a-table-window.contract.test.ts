// CR-722 spec-only contract: the Resource List (U-49) is a table window with the columns of table T-371 in their order, two fixed columns, the resources in document order and the (Unassigned) row last (T-370, T-371, FR-099).

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { resourceListAfterEntry, resourceListFromWindow } from '../../src/adapter/screen-renderer/resource-list'
import { REQUIREMENTS, SCHEDULE, wordOf } from './cr-722-stage'
import { CANVAS, OPENED_DELAY_DIAGNOSTICS_REPORT, sessionIn } from './cr-721-stage'
import { specTable, unbroken } from './spec-table'

const FR_099_WINDOW =
  '担当リスト（`_assets/tbl-glossary.md` の `U-49`）はウィンドウ（`FR-036` の 表 T-335）とし、表 T-370 が違いを定めるほかは、検索パネルと同じ見せ方と振舞い（`FR-151` の 表 T-330）とすること（MUST）'
const FR_099_COLUMNS = 'ウィンドウには表を 1 つ置き、表の列は 表 T-371 に従うこと（MUST）'
const T_371_ORDER = '列は本表の行の順に左から並べる —— 表示・担当名・選択・担当タスク数・担当タスク（利用者が定めた）。'
const RO_4_ORDER = '文書の `Resource` の並び。（担当なし）の行は末尾。'
const RO_5_ALWAYS = '担当のいないタスクを持つ 1 行を、担当のいないタスクが文書に無くても置く。'
const RO_7_FIXED = '見出し行と、`RQ-1`・`RQ-2`（表示・担当名）の 2 列を固定する'

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

// WHY: section 5.1 shapes the Resource List functions after the report's, so the opened window is the report's opened shape.
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
  const view = resourceListFromWindow(sessionIn(language), window as never, SCHEDULE, [], { canvas: CANVAS, textSizeStep: 1 } as never)
  if (view === null || view === undefined) throw new Error('the opened Resource List has no view')
  return view as unknown as ViewLike
}

const said = (value: unknown): string => JSON.stringify(value)
const inJson = (text: string): string => JSON.stringify(text).slice(1, -1)

describe(`FR-099 (MUST): ${FR_099_COLUMNS}`, () => {
  it(`${T_371_ORDER.slice(0, 30)} -- RQ-1 to RQ-5 in the table's order`, () => {
    expect(T_371_IDS).toEqual(['RQ-1', 'RQ-2', 'RQ-3', 'RQ-4', 'RQ-5'])
    expect(viewIn('ja').columns.map((one) => one.column)).toEqual(T_371_IDS)
  })

  it.each(['ja', 'en'] as const)('each heading is the dictionary word (%s)', (language) => {
    expect(viewIn(language).columns.map((one) => one.heading)).toEqual(T_371_IDS.map((id) => wordOf('resourceListColumns', id, language)))
  })

  it(`RO-7: ${RO_7_FIXED.slice(0, 30)} -- RQ-1 and RQ-2 are fixed, the rest are not`, () => {
    expect(viewIn('ja').columns.map((one) => one.isFixed)).toEqual([true, true, false, false, false])
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
    const view = resourceListFromWindow(sessionIn('en'), OPENED as never, none as never, [], { canvas: CANVAS, textSizeStep: 1 } as never) as unknown as ViewLike
    const rows = view.rows.map(said)
    expect(rows.length).toBe(4)
    expect(rows[3]).toContain(inJson(wordOf('resourceList', 'unassigned', 'en')))
  })
})

describe(`FR-099 (MUST): ${FR_099_WINDOW.slice(-40)} -- the window entrances of SV-12 / SV-14`, () => {
  it('IC-129 minimizes the window', () => {
    const after = resourceListAfterEntry(OPENED as never, 'IC-129' as never, null, { schedule: SCHEDULE, chosenResourceUids: [], language: 'ja' } as never) as unknown as {
      readonly window: { readonly shown: string } | null
    } | null
    expect(after?.window?.shown).toBe('minimized')
  })

  it('IC-52 closes the window', () => {
    const after = resourceListAfterEntry(OPENED as never, 'IC-52' as never, null, { schedule: SCHEDULE, chosenResourceUids: [], language: 'ja' } as never) as unknown as {
      readonly window: unknown
    } | null
    expect(after).not.toBeNull()
    expect(after?.window).toBeNull()
  })
})
