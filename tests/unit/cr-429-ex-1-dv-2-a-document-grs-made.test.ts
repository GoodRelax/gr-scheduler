// CR-429: a document GRS made without reading MSPDI goes out valid against pj12, naming SaveVersion 12.

import { describe, expect, it } from 'vitest'

import { specTable } from '../contract/spec-table'
import { currentDocument, day, edited, writtenText } from './cr-429-mspdi-fixtures'
import { holdsPj15OnlyElement, parseXml, schemaFaults, textAt } from './cr-429-mspdi-schema'

const EX_1_GRS_MADE = 'MSPDI を取り込まずに作った文書は pj12 に妥当であること（MUST）。'

const EX_1_ONLY_EXCEPTION = '⚠️ 例外は、どちらのスキーマにも無い要素を持ち回るときだけである（`EX-10`）'

const DV_2_TWELVE = '取り込んだ値をそのまま返す。取り込まずに作った文書は `12`（`EX-1`）'

function rowText(table: string, id: string): string {
  const row = specTable(table).rows.find((each) => each.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

describe('EX-1 and DV-2 -- a document GRS made', () => {
  it('EX-1, DV-2: the clauses are still where the cases found them', () => {
    expect(rowText('T-033', 'EX-1')).toContain(EX_1_GRS_MADE)
    expect(rowText('T-033', 'EX-1')).toContain(EX_1_ONLY_EXCEPTION)
    expect(rowText('T-059', 'DV-2')).toContain(DV_2_TWELVE)
  })

  it('the document the cases start from was made by GRS, not read from MSPDI', () => {
    expect(currentDocument().schedule.project.sourceFormat).toBe('grs')
    expect(currentDocument().schedule.project.carry['SaveVersion']).toBeUndefined()
  })

  it('EX-1: goes out valid against pj12, with no pj15-only element', () => {
    const text = writtenText(currentDocument())
    expect(holdsPj15OnlyElement(parseXml(text))).toBe(false)
    expect(schemaFaults(text, 'pj12')).toEqual([])
  })

  it('DV-2: goes out naming SaveVersion 12', () => {
    expect(textAt(parseXml(writtenText(currentDocument())), 'SaveVersion')).toBe('12')
  })

  it('EX-1: still valid against pj12 after a task is drawn and another is moved', () => {
    const start = currentDocument()
    const group = start.schedule.taskGroups[0]
    const first = start.schedule.tasks[0]
    if (group === undefined || first === undefined) throw new Error('the template has no row or no task')
    const drawn = edited(start, { kind: 'createTask', shapeKind: 'rectangle', start: day(13), finish: day(17), groupId: group.id })
    const moved = edited(drawn, { kind: 'setTaskPlanDates', uid: first.uid, start: day(7), finish: day(14) })
    expect(schemaFaults(writtenText(moved), 'pj12')).toEqual([])
  })
})
