// CR-660: searchTableElement draws the table of a table window from its columns and rows (FR-151, table T-330 SV-6 / SV-17 / SV-18).

import { describe, expect, it } from 'vitest'

import type { CommandItem } from '../../src/adapter/screen-renderer/screen-renderer'
import { searchTableElement, type DrawnTable } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import { selfAndDescendants, stage, type FakeElement } from '../fixtures/fake-browser'

const FONT_PX = 16

const FILTER_ENTRY = {
  icon: 'IC-122',
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: 'Filter',
} as unknown as CommandItem

const column = (id: string, heading: string, isFixed: boolean, width: number) => ({ column: id, heading, isFixed, filterEntry: FILTER_ENTRY, width })

const COLUMNS = [column('SQ-1', 'Status', true, 80), column('SQ-3', 'Task', false, 120)]

const ROWS = [
  { cells: ['a', 'Alpha'], glyph: null, target: { kind: 'task', taskUid: 7 } },
  { cells: ['b', 'Beta'], glyph: null, target: { kind: 'commentBox', commentBoxId: 'box-1' } },
]

function drawn(view: Partial<DrawnTable>): { readonly box: FakeElement; readonly all: readonly FakeElement[] } {
  const built = stage()
  const table = { columns: COLUMNS, rows: ROWS, ...view } as unknown as DrawnTable
  const box = searchTableElement(built.host, table, FONT_PX) as unknown as FakeElement
  return { box, all: selfAndDescendants(box) }
}

const named = (all: readonly FakeElement[], tagName: string): FakeElement[] => all.filter((one) => one.tagName === tagName)

describe('searchTableElement', () => {
  it('draws one heading cell per column and one body line per row', () => {
    const { all } = drawn({})
    expect(named(all, 'TH')).toHaveLength(COLUMNS.length)
    expect(named(all, 'TBODY')).toHaveLength(1)
    expect(named(all, 'TD')).toHaveLength(ROWS.length * COLUMNS.length)
  })

  it('gives each column its width and the table the sum of them', () => {
    const { all } = drawn({})
    expect(named(all, 'COL')).toHaveLength(COLUMNS.length)
    expect(named(all, 'TABLE')[0]?.getAttribute('style') ?? '').toContain('width:200px')
  })

  it('marks the fixed column on its heading and on its body cells only', () => {
    const { all } = drawn({})
    const marked = named(all, 'TH').filter((cell) => cell.getAttribute('data-fixed-column') === 'true')
    expect(marked).toHaveLength(1)
    expect(named(all, 'TD').filter((cell) => cell.getAttribute('data-fixed-column') === 'true')).toHaveLength(ROWS.length)
  })

  it('makes the first column the jump cell of a row unless the view says otherwise', () => {
    const { all } = drawn({})
    const jumps = named(all, 'TD').filter((cell) => cell.getAttribute('data-search-task') !== null || cell.getAttribute('data-search-comment-box') !== null)
    expect(jumps.map((cell) => cell.getAttribute('data-search-task') ?? cell.getAttribute('data-search-comment-box'))).toEqual(['7', 'box-1'])
  })

  it('moves the jump to the column the view names', () => {
    const { all } = drawn({ jumpAt: 1 })
    const jumps = named(all, 'TD').filter((cell) => cell.getAttribute('data-search-task') !== null)
    expect(jumps).toHaveLength(1)
    expect(jumps[0]?.textContent).toBe('Alpha')
  })
})
