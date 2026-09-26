// CR-429: a leaf that arrives twice under one parent is read once, the first, and the rest are counted for RS-60.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bare, specTable } from './spec-table'
import { accepted, pj12Fixture, taskNode, withTask, writtenText } from '../unit/cr-429-mspdi-fixtures'
import {
  changedAt,
  childrenNamed,
  insertedAfter,
  leaf,
  mspdiText,
  nodeAt,
  parseXml,
  schemaFaults,
  type Spec,
} from '../unit/cr-429-mspdi-schema'

const MR_3_FIRST_AND_TELL =
  '値だけを持つ子（葉）が同じ親の下に同じ名前で 2 つ以上あるときは、最初のものを採り、表 T-233 の `RS-60` で告げること（MUST）。'

const MR_3_NOT_SILENT = '⛔ 黙って採ってはならない（MUST NOT）'

const RS_60_SCENE = '1 つしか置けない要素が 2 つ以上あったので、最初のものを採った'

const RS_60_COUNT = '件数を添えること —— 採らなかった要素の数である'

const WORDS = ['docs/spec/_source/display-words.json', 'src/adapter/screen-renderer/display-words.json'] as const

interface ReasonEntry {
  readonly rowId: string
  readonly text: { readonly ja: string; readonly en: string }
}

function reasonIn(path: string, rowId: string): ReasonEntry | undefined {
  const raw = JSON.parse(readFileSync(join(process.cwd(), ...path.split('/')), 'utf8')) as { reasons: ReasonEntry[] }
  return raw.reasons.find((each) => each.rowId === rowId)
}

function rs60(): { readonly scene: string; readonly manner: string; readonly source: string } {
  const row = specTable('T-233').rows.find((each) => each.id === 'RS-60')
  if (row === undefined) throw new Error('table T-233 has no row RS-60')
  return { scene: row.by['場面'] ?? '', manner: bare(row.by['作法'] ?? ''), source: row.by['正'] ?? '' }
}

function withTaskLeafTwice(root: Spec, uid: number, afterName: string, repeated: Spec): Spec {
  return withTask(root, uid, (children) => insertedAfter(children, afterName, repeated))
}

const NAME_TWICE = withTaskLeafTwice(pj12Fixture(), 2, 'Name', leaf('Name', 'Piers again'))

describe('the rows these cases answer to', () => {
  it('MR-3: the clause is still where the cases found it', () => {
    const row = specTable('T-265').rows.find((each) => each.id === 'MR-3')
    expect(row?.cells.join(' | ')).toContain(MR_3_FIRST_AND_TELL)
    expect(row?.cells.join(' | ')).toContain(MR_3_NOT_SILENT)
  })

  it('RS-60: table T-233 holds the row, told under NT-5, its source MR-3, with the count it carries', () => {
    const { scene, manner, source } = rs60()
    expect(scene).toContain(RS_60_SCENE)
    expect(scene).toContain(RS_60_COUNT)
    expect(manner).toBe('NT-5')
    expect(source).toContain('`MR-3`')
  })

  it('RS-60: the dictionary holds words in both languages, and the generated copy holds the same', () => {
    const [manuscript, generated] = WORDS.map((path) => reasonIn(path, 'RS-60'))
    expect(manuscript?.text.ja.trim()).toBeTruthy()
    expect(manuscript?.text.en.trim()).toBeTruthy()
    expect(generated).toEqual(manuscript)
  })
})

describe('MR-3 -- the first of a repeated leaf is taken, and the rest are counted', () => {
  it('MR-3: a file with no repeated leaf counts none -- repeated Tasks, links and timephased rows are not leaves', () => {
    expect(accepted(mspdiText(pj12Fixture({ outlineCodes: true }))).duplicateLeaves).toBe(0)
  })

  it('MR-3: a Task name given twice is read as the first, and one leaf is counted', () => {
    const read = accepted(mspdiText(NAME_TWICE))
    expect(read.document.schedule.tasks.find((each) => each.uid === 2)?.name).toBe('Piers')
    expect(read.duplicateLeaves).toBe(1)
  })

  it('MR-3: the second name need not follow the first -- the first in the file is still the one taken', () => {
    const far = withTask(pj12Fixture(), 2, (children) => [...children, leaf('Name', 'Piers at the end')])
    const read = accepted(mspdiText(far))
    expect(read.document.schedule.tasks.find((each) => each.uid === 2)?.name).toBe('Piers')
    expect(read.duplicateLeaves).toBe(1)
  })

  it('MR-3: three copies of one leaf count the two that were not taken', () => {
    const thrice = withTaskLeafTwice(NAME_TWICE, 2, 'Name', leaf('Name', 'Piers once more'))
    expect(accepted(mspdiText(thrice)).duplicateLeaves).toBe(2)
  })

  it('MR-3, FR-021: a carried leaf given twice goes back once, as the first', () => {
    const twice = withTask(pj12Fixture(), 2, (children) =>
      insertedAfter(insertedAfter(children, 'Name', leaf('Priority', 500)), 'Priority', leaf('Priority', 900)),
    )
    const read = accepted(mspdiText(twice))
    const priorities = childrenNamed(taskNode(parseXml(writtenText(read.document)), 2), 'Priority')
    expect(priorities.map((each) => each.text.trim())).toEqual(['500'])
    expect(read.duplicateLeaves).toBe(1)
  })

  it('MR-3: a leaf repeated inside a carried element is read once, as the first', () => {
    const twice = changedAt(pj12Fixture(), 'Project/ExtendedAttributes/ExtendedAttribute', (children) =>
      insertedAfter(children, 'FieldName', leaf('FieldName', 'Text9')),
    )
    const read = accepted(mspdiText(twice))
    const definitions = childrenNamed(nodeAt(parseXml(writtenText(read.document)), 'ExtendedAttributes') ?? parseXml('<x/>'), 'ExtendedAttribute')
    expect(definitions.map((each) => childrenNamed(each, 'FieldName').map((one) => one.text.trim()))).toEqual([['Text1'], ['Text2']])
    expect(read.duplicateLeaves).toBe(2)
  })

  it('MR-3: a Project leaf given twice is read as the first', () => {
    const twice = changedAt(pj12Fixture(), 'Project', (children) =>
      insertedAfter(children, 'Title', leaf('Title', 'Another plan')),
    )
    const read = accepted(mspdiText(twice))
    expect(read.document.schedule.project.title).toBe('Bridge programme plan')
    expect(read.duplicateLeaves).toBe(1)
  })

  it('MR-3: repeats in different places add up', () => {
    const many = changedAt(NAME_TWICE, 'Project', (children) =>
      insertedAfter(children, 'Title', leaf('Title', 'Another plan')),
    )
    expect(accepted(mspdiText(many)).duplicateLeaves).toBe(2)
  })

  it('EX-1: the file a repeated leaf arrived in is written valid against pj12', () => {
    const back = writtenText(accepted(mspdiText(NAME_TWICE)).document)
    expect(childrenNamed(taskNode(parseXml(back), 2), 'Name').map((each) => each.text.trim())).toEqual(['Piers'])
    expect(schemaFaults(back, 'pj12')).toEqual([])
  })
})
