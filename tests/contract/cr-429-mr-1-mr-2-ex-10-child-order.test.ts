// CR-429: children read in any order across names, same-name order kept, written in the order pj15 declares.

import { describe, expect, it } from 'vitest'

import { specTable } from './spec-table'
import { accepted, pj12Fixture, pj15Fixture, withTask, writtenText } from '../unit/cr-429-mspdi-fixtures'
import {
  changedAt,
  everyDeclaredLeaf,
  insertedAfter,
  isDeclaredAnywhere,
  leaf,
  mspdiText,
  node,
  nodeAt,
  normalizedMspdi,
  orderedMspdi,
  parseXml,
  reversedByName,
  reversedWithinName,
  schemaFaults,
  type Spec,
  type XmlNode,
} from '../unit/cr-429-mspdi-schema'

const MR_1_ANY_ORDER = '同じ親の下で、名前の違う子の順を問わずに読むこと（MUST）。'

const MR_1_NOT_REFUSED = '⛔ 順が公式スキーマと違うことを理由に拒んではならない（MUST NOT）'

const MR_2_SAME_NAME = '同じ名前の子が繰り返すときは、その順を保って読むこと（MUST）'

const EX_10_SEQUENCE =
  '書き出す要素の子を、pj15 の `xsd:sequence` の順に並べること（MUST）—— `GRS` が値を書く要素も、持ち回る要素の中も同じである。'

const EX_10_ALL = '`xsd:all` の親では順は問われないので、取り込んだ順を保つこと（MUST）。'

const EX_10_UNKNOWN = 'どちらのスキーマにも無い要素は、取り込んだときに直前にあった要素の直後に置くこと（MUST）。'

const EX_10_ROW_CHILD =
  '⚠️ 例外 —— `GRS` が自分の列として持つ要素（表 T-058 の `carry` を持つ `Project`・`Task` など）の直下では、' +
  'どちらのスキーマにも無い子を、どちらかのスキーマにある持ち回る兄弟のうち、取り込んだときに前にあった最後のものの直後に置くこと（MUST）' +
  '—— 順を見るのは同じ種類の兄弟であり、葉は葉と、子を持つ要素は子を持つ要素と見る。'

const EX_10_ROW_CHILD_ENDS =
  '前に無ければ後にあった最初のものの直前に、前にも後にも無ければ親の末尾に置き、同じ所に置く子どうしは取り込んだ順を保つこと（MUST）。'

const PROBE = 'GrsProbeMark'

const SECOND_PROBE = 'GrsProbeSecond'

// WHY: every leaf of such a Task is a column GRS reads (table T-058) or a value it makes on write (table T-059),
// so its carry holds no leaf at all.
const READ_OR_MADE: readonly string[] = ['UID', 'ID', 'Name', 'OutlineNumber', 'OutlineLevel', 'Start', 'Finish', 'Milestone', 'Summary']

const DEFINITION = 'Project/ExtendedAttributes/ExtendedAttribute'

const OUTLINE_VALUE = 'Project/OutlineCodes/OutlineCode/Values/Value'

const LIST_VALUE = `${DEFINITION}/ValueList/Value`

const SAME_NAME_PARENTS = [
  'Project/ExtendedAttributes',
  'Project/Calendars/Calendar/WeekDays',
  'Project/Calendars/Calendar/WeekDays/WeekDay/WorkingTimes',
  'Project/OutlineCodes/OutlineCode/Values',
  'Project/Tasks/Task',
] as const

function rowText(table: string, id: string): string {
  const row = specTable(table).rows.find((each) => each.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

function roundTrip(text: string): string {
  return writtenText(accepted(text).document)
}

function names(parent: XmlNode | null): readonly string[] {
  return parent === null ? [] : parent.children.map((each) => each.name)
}

function nextAfter(parent: XmlNode | null, name: string): string | undefined {
  const all = names(parent)
  return all[all.indexOf(name) + 1]
}

function withSameNameReversed(root: Spec): Spec {
  return SAME_NAME_PARENTS.reduce((spec, path) => changedAt(spec, path, reversedWithinName), root)
}

function withListValue(root: Spec): Spec {
  const value = node('Value', ...[...everyDeclaredLeaf(LIST_VALUE)].reverse())
  return changedAt(root, DEFINITION, (children) => [...children, node('ValueList', value)])
}

function withProbe(root: Spec, parentPath: string, afterName: string): Spec {
  return changedAt(root, parentPath, (children) => insertedAfter(children, afterName, leaf(PROBE, 'kept')))
}

function probeElement(): Spec {
  return node(PROBE, leaf('Inner', 'kept'))
}

function writtenTask2(root: Spec): XmlNode | null {
  const back = parseXml(roundTrip(mspdiText(root)))
  return nodeAt(back, 'Tasks')?.children.find((each) => nodeAt(each, 'UID')?.text === '2') ?? null
}

describe('the rows these cases answer to', () => {
  it('MR-1, MR-2, EX-10: the clauses are still where the cases found them', () => {
    expect(rowText('T-265', 'MR-1')).toContain(MR_1_ANY_ORDER)
    expect(rowText('T-265', 'MR-1')).toContain(MR_1_NOT_REFUSED)
    expect(rowText('T-265', 'MR-2')).toContain(MR_2_SAME_NAME)
    expect(rowText('T-033', 'EX-10')).toContain(EX_10_SEQUENCE)
    expect(rowText('T-033', 'EX-10')).toContain(EX_10_ALL)
    expect(rowText('T-033', 'EX-10')).toContain(EX_10_UNKNOWN)
  })

  it('EX-10: the probe element the cases carry is declared by neither schema', () => {
    expect(isDeclaredAnywhere(PROBE)).toBe(false)
  })
})

describe('MR-1 and EX-10 -- a file whose children are out of the declared order', () => {
  for (const [label, fixture, version] of [
    ['pj12', (): Spec => pj12Fixture({ outlineCodes: true }), 'pj12'],
    ['pj15', pj15Fixture, 'pj15'],
  ] as const) {
    it(`MR-1: the ${label} file with every name group reversed is out of order, inside carried elements too`, () => {
      const faults = schemaFaults(mspdiText(reversedByName(fixture())), version)
      expect(faults).toContain(`${DEFINITION}: children out of order (Alias, FieldName, FieldID)`)
      expect(faults.some((each) => each.startsWith('Project/Tasks/Task/TimephasedData: children out of order'))).toBe(true)
      expect(faults.some((each) => each.startsWith('Project: children out of order'))).toBe(true)
    })

    it(`MR-1: the reversed ${label} file is read, not refused`, () => {
      expect(accepted(mspdiText(reversedByName(fixture()))).ok).toBe(true)
    })

    it(`MR-1, EX-10: the reversed ${label} file is written exactly as the ordered one is`, () => {
      const fromOrdered = roundTrip(mspdiText(fixture()))
      const fromReversed = roundTrip(mspdiText(reversedByName(fixture())))
      expect(orderedMspdi(fromReversed)).toEqual(orderedMspdi(fromOrdered))
    })

    it(`EX-1, EX-10: what the reversed ${label} file is written as is valid against ${version}`, () => {
      expect(schemaFaults(roundTrip(mspdiText(reversedByName(fixture()))), version)).toEqual([])
    })
  }
})

describe('MR-2 -- children of one name keep the order they arrived in', () => {
  it('MR-2: definitions, weekdays, working times, outline values, links and timephased rows come back in their order', () => {
    const text = mspdiText(withSameNameReversed(pj12Fixture({ outlineCodes: true })))
    expect(text).toContain('<DayType>7</DayType>')
    expect(normalizedMspdi(roundTrip(text))).toEqual(normalizedMspdi(text))
  })

  it('MR-2: the order is the arrived one and not a sorted one -- the links of task 4 read 3 then 2', () => {
    const back = parseXml(roundTrip(mspdiText(pj12Fixture())))
    const task = nodeAt(back, 'Tasks')?.children.find((each) => nodeAt(each, 'UID')?.text === '4') ?? null
    const links = task === null ? [] : task.children.filter((each) => each.name === 'PredecessorLink')
    expect(links.map((each) => nodeAt(each, 'PredecessorUID')?.text)).toEqual(['3', '2'])
  })
})

describe('EX-10 -- an xsd:all parent keeps the order its children arrived in', () => {
  it('EX-10: an outline code value whose children arrive reversed is written reversed', () => {
    const reversed = changedAt(pj12Fixture({ outlineCodes: true }), OUTLINE_VALUE, (children) => [...children].reverse())
    const text = mspdiText(reversed)
    const arrived = names(nodeAt(parseXml(text), 'OutlineCodes/OutlineCode/Values/Value'))
    const back = names(nodeAt(parseXml(roundTrip(text)), 'OutlineCodes/OutlineCode/Values/Value'))
    expect(arrived[0]).toBe('Description')
    expect(back).toEqual(arrived)
  })

  it('EX-10: a value-list value of a custom field definition keeps its arrived order too', () => {
    const text = mspdiText(withListValue(pj12Fixture()))
    expect(schemaFaults(text, 'pj12')).toEqual([])
    const arrived = names(nodeAt(parseXml(text), 'ExtendedAttributes/ExtendedAttribute/ValueList/Value'))
    const back = names(nodeAt(parseXml(roundTrip(text)), 'ExtendedAttributes/ExtendedAttribute/ValueList/Value'))
    expect(back).toEqual(arrived)
  })
})

describe('EX-10 -- an element neither schema declares stays after the element it followed', () => {
  it('EX-10: inside a custom field definition', () => {
    const text = mspdiText(withProbe(pj12Fixture(), DEFINITION, 'FieldName'))
    const back = roundTrip(text)
    expect(nextAfter(nodeAt(parseXml(back), 'ExtendedAttributes/ExtendedAttribute'), 'FieldName')).toBe(PROBE)
    expect(schemaFaults(back, 'pj12', [PROBE])).toEqual([])
  })

  it('EX-10: inside a timephased row a task carries', () => {
    const text = mspdiText(withProbe(pj12Fixture(), 'Project/Tasks/Task/TimephasedData', 'UID'))
    const back = parseXml(roundTrip(text))
    const task = nodeAt(back, 'Tasks')?.children.find((each) => nodeAt(each, 'UID')?.text === '2') ?? null
    expect(nextAfter(task === null ? null : nodeAt(task, 'TimephasedData'), 'UID')).toBe(PROBE)
  })

  it('EX-10: inside an outline code', () => {
    const text = mspdiText(withProbe(pj12Fixture({ outlineCodes: true }), 'Project/OutlineCodes/OutlineCode', 'Alias'))
    const back = roundTrip(text)
    expect(nextAfter(nodeAt(parseXml(back), 'OutlineCodes/OutlineCode'), 'Alias')).toBe(PROBE)
    expect(schemaFaults(back, 'pj12', [PROBE])).toEqual([])
  })
})

describe('EX-10 -- under a row GRS holds, an undeclared child rides with the carried siblings of its own kind', () => {
  it('EX-10: the exception is still where the cases found it', () => {
    expect(rowText('T-033', 'EX-10')).toContain(EX_10_ROW_CHILD)
    expect(rowText('T-033', 'EX-10')).toContain(EX_10_ROW_CHILD_ENDS)
  })

  it('EX-10: under a Task, after its Name -- no carried leaf came before it, so just before the first after it', () => {
    const task = writtenTask2(withProbe(pj12Fixture(), 'Project/Tasks/Task', 'Name'))
    expect(nextAfter(task, PROBE)).toBe('Duration')
  })

  it('EX-10: under the Project, after its Title -- just after SaveVersion, the last carried leaf before it', () => {
    const text = mspdiText(withProbe(pj12Fixture(), 'Project', 'Title'))
    expect(nextAfter(parseXml(roundTrip(text)), 'SaveVersion')).toBe(PROBE)
  })

  it('EX-10: under a Task, after its carried elements -- just after the last carried leaf, not the element', () => {
    const task = writtenTask2(changedAt(pj12Fixture(), 'Project/Tasks/Task', (children) => [...children, leaf(PROBE, 'kept')]))
    expect(nextAfter(task, 'ConstraintType')).toBe(PROBE)
  })

  it('EX-10: under a Task whose custom field value came first -- still just after the carried leaf before it', () => {
    const early = withTask(pj12Fixture(), 2, (children) => [
      ...children.filter((each) => each.name === 'UID' || each.name === 'ExtendedAttribute'),
      ...children.filter((each) => each.name !== 'UID' && each.name !== 'ExtendedAttribute'),
    ])
    expect(nextAfter(writtenTask2(withProbe(early, 'Project/Tasks/Task', 'Duration')), 'Duration')).toBe(PROBE)
  })

  it('EX-10: under a Task that carries no leaf at all -- at the end of the Task', () => {
    const bare = withTask(pj12Fixture(), 2, (children) => children.filter((each) => READ_OR_MADE.includes(each.name)))
    const task = writtenTask2(withTask(bare, 2, (children) => insertedAfter(children, 'Name', leaf(PROBE, 'kept'))))
    expect(task?.children.at(-1)?.name).toBe(PROBE)
  })

  it('EX-10: two such leaves at one place keep the order they arrived in', () => {
    const one = withProbe(pj12Fixture(), 'Project/Tasks/Task', 'Name')
    const two = changedAt(one, 'Project/Tasks/Task', (children) => insertedAfter(children, PROBE, leaf(SECOND_PROBE, 'kept')))
    const task = writtenTask2(two)
    expect([nextAfter(task, PROBE), nextAfter(task, SECOND_PROBE)]).toEqual([SECOND_PROBE, 'Duration'])
  })

  it('EX-10: an element with children, after a Name -- no carried element came before it, so before the first after', () => {
    const arrived = changedAt(pj12Fixture(), 'Project/Tasks/Task', (children) => insertedAfter(children, 'Name', probeElement()))
    expect(nextAfter(writtenTask2(arrived), PROBE)).toBe('ExtendedAttribute')
  })

  it('EX-10: an element with children, after the carried element it followed -- just after that one', () => {
    const arrived = withTask(pj12Fixture(), 2, (children) => insertedAfter(children, 'ExtendedAttribute', probeElement()))
    expect(nextAfter(writtenTask2(arrived), 'ExtendedAttribute')).toBe(PROBE)
  })

  it('EX-10: an element with children under a Task that carries nothing else -- at the end of the Task', () => {
    const bare = withTask(pj12Fixture(), 2, (children) => [
      ...children.filter((each) => READ_OR_MADE.includes(each.name)),
      probeElement(),
    ])
    expect(writtenTask2(bare)?.children.at(-1)?.name).toBe(PROBE)
  })
})
