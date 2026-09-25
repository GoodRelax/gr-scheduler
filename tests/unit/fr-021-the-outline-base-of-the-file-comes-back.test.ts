// FR-021: an imported file's outline base comes back unchanged on a plain round trip.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromMspdi,
  mspdiFromDocument,
  MSPDI_NAMESPACE,
} from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { specTable, unbroken } from '../contract/spec-table'


const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_021 = ((): string => {
  const at = REQUIREMENTS.indexOf('**UID**: FR-021')
  if (at < 0) throw new Error('FR-021 is not in 01-04-requirements.md')
  const end = REQUIREMENTS.indexOf('**ORIGIN**', at)
  return REQUIREMENTS.slice(at, end < 0 ? at + 4000 : end)
})()

const THE_CLAUSE = '⛔ **段の起点は、取り込んだファイルのものを保つこと（MUST）**'

const WHERE_THE_BASE_LIVES = '起点は 表 T-058 の `Project.outlineBase` が持ち、既定は 1 とする'

const T_058 = specTable('T-058')
const T_059 = specTable('T-059')

const columnRow = (entity: string, name: string) => {
  const found = T_058.rows.find(
    (row) => row.cells[0] === `\`${entity}\`` && row.cells[1] === `\`${name}\``,
  )
  if (found === undefined) throw new Error(`table T-058 has no row for ${entity}.${name}`)
  return found
}

const derivedRow = (id: string) => {
  const found = T_059.rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table T-059 has no row ${id}`)
  return found
}


function tasksOf(text: string): ReadonlyMap<string, Readonly<Record<string, string>>> {
  const tasks = new Map<string, Record<string, string>>()
  const blocks = text.match(/<Task>[\s\S]*?<\/Task>/g) ?? []
  for (const block of blocks) {
    const fields: Record<string, string> = {}
    for (const found of block.matchAll(/<([A-Za-z]+)>([^<]*)<\/\1>/g)) {
      const name = found[1]
      const value = found[2]
      if (name === undefined || value === undefined) continue
      if (!(name in fields)) fields[name] = value
    }
    const uid = fields['UID']
    if (uid !== undefined) tasks.set(uid, fields)
  }
  return tasks
}

const FOUR_COLUMNS = ['ID', 'OutlineLevel', 'OutlineNumber', 'Summary'] as const

const fourOf = (fields: Readonly<Record<string, string>>): Record<string, string | undefined> =>
  Object.fromEntries(FOUR_COLUMNS.map((name) => [name, fields[name]]))


const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7]
  .map(
    (dayType) =>
      `<WeekDay><DayType>${dayType}</DayType><DayWorking>${
        dayType === 1 || dayType === 7 ? 0 : 1
      }</DayWorking></WeekDay>`,
  )
  .join('')

const CALENDAR_XML = `  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Standard</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <BaseCalendarUID>-1</BaseCalendarUID>
      <WeekDays>${WEEK_DAYS}</WeekDays>
    </Calendar>
  </Calendars>`

interface Row {
  readonly uid: number
  readonly id: number
  readonly name: string
  readonly level: number
  readonly outlineNumber: string
  readonly summary: 0 | 1
  readonly start: string
  readonly finish: string
}

const taskXml = (row: Row): string =>
  `    <Task>
      <UID>${row.uid}</UID>
      <ID>${row.id}</ID>
      <Name>${row.name}</Name>
      <OutlineNumber>${row.outlineNumber}</OutlineNumber>
      <OutlineLevel>${row.level}</OutlineLevel>
      <Start>${row.start}</Start>
      <Finish>${row.finish}</Finish>
      <Milestone>0</Milestone>
      <Summary>${row.summary}</Summary>
    </Task>`

const fileOf = (rows: readonly Row[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="${MSPDI_NAMESPACE}">
  <Name>Base fixture</Name>
  <CalendarUID>1</CalendarUID>
${CALENDAR_XML}
  <Tasks>
${rows.map(taskXml).join('\n')}
  </Tasks>
</Project>
`

const BASE_ONE_ROWS: readonly Row[] = [
  {
    uid: 1,
    id: 1,
    name: 'Alpha',
    level: 1,
    outlineNumber: '1',
    summary: 1,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-24T17:00:00',
  },
  {
    uid: 2,
    id: 2,
    name: 'Beta',
    level: 2,
    outlineNumber: '1.1',
    summary: 0,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-10T17:00:00',
  },
  {
    uid: 3,
    id: 3,
    name: 'Gamma',
    level: 2,
    outlineNumber: '1.2',
    summary: 0,
    start: '2026-04-13T08:00:00',
    finish: '2026-04-24T17:00:00',
  },
]

const MS_PROJECT_ROWS: readonly Row[] = [
  {
    uid: 0,
    id: 0,
    name: 'Base fixture',
    level: 0,
    outlineNumber: '0',
    summary: 1,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-24T17:00:00',
  },
  ...BASE_ONE_ROWS,
]

const BASE_ZERO_ROWS: readonly Row[] = [
  {
    uid: 4,
    id: 0,
    name: 'Delta',
    level: 0,
    outlineNumber: '0',
    summary: 1,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-24T17:00:00',
  },
  ...BASE_ONE_ROWS,
]


const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

const current = (): Document => structuredClone(TEMPLATE)

function imported(text: string): Document {
  const reading = documentFromMspdi(text, current())
  if (!reading.ok) {
    throw new Error(
      `the fixture is not a readable MSPDI: ${reading.faults
        .map((fault) => `${fault.at} ${fault.what}`)
        .join('; ')}`,
    )
  }
  return reading.document
}

const roundTripped = (text: string): string => mspdiFromDocument(imported(text)).text

const baseOf = (document: Document): unknown =>
  (document as any).schedule.project.outlineBase as unknown


describe('FR-021 -- the manuscript this file is driven by', () => {
  it('still carries the MUST that keeps the imported outline base', () => {
    expect(FR_021).toContain(THE_CLAUSE)
  })

  it('still puts the base in one place, with 1 for its default', () => {
    expect(FR_021).toContain(WHERE_THE_BASE_LIVES)
    const row = columnRow('Project', 'outlineBase')
    expect(row.id).toBe('AT-139')
    expect(row.cells.join(' ')).toContain('Consume')
    expect(row.cells.join(' ')).toContain('`1`')
  })

  it('still names the four columns that shift when the base is rounded', () => {
    expect(FR_021).toContain(
      '`Task/ID`・`Task/OutlineLevel`・`Task/OutlineNumber`・`Task/Summary` の 4 列が全タスクでずれる',
    )
    expect(derivedRow('DV-4').cells.join(' ')).toContain('`Task/ID`')
    expect(derivedRow('DV-5').cells.join(' ')).toContain('`Task/OutlineLevel`')
    expect(derivedRow('DV-6').cells.join(' ')).toContain('`Task/OutlineNumber`')
    expect(derivedRow('DV-7').cells.join(' ')).toContain('`Task/Summary`')
  })

  it('drives two fixtures that really are the two shapes FR-021 describes', () => {
    const zeros = (rows: readonly Row[]) => rows.filter((row) => row.level === 0).length
    expect(zeros(BASE_ONE_ROWS), 'ProjectLibre writes none').toBe(0)
    expect(zeros(MS_PROJECT_ROWS), 'MS Project writes exactly one').toBe(1)
    expect(Math.min(...BASE_ONE_ROWS.map((row) => row.uid))).toBe(1)
    expect(MS_PROJECT_ROWS[0]?.uid).toBe(0)
    expect(MS_PROJECT_ROWS[0]?.id).toBe(0)
    expect(MS_PROJECT_ROWS[0]?.outlineNumber).toBe('0')
    expect(MS_PROJECT_ROWS.slice(1)).toEqual(BASE_ONE_ROWS)
  })

  it('still reads the project summary task out of the count, so the MS Project shape starts at 1', () => {
    expect(FR_021).toContain(
      '⭐ **プロジェクトの要約タスクは `Task` にせず、原形のまま持ち回る** —— 読み方は 表 T-265 の `MR-4`、書き戻し方は 表 T-033 の `EX-5` が持つ。',
    )
    expect(FR_021).toContain('⇒ 要約タスクを起点に数えないので、見本の 7 つはどれも起点が 1 になる。')
    expect(columnRow('Project', 'outlineBase').cells.join(' ')).toContain(
      'プロジェクトの要約タスクは数えない —— 表 T-265 の `MR-4`',
    )
  })

  it('drives a base-0 fixture whose OutlineLevel 0 row is a Task, not the project summary task', () => {
    const zeros = BASE_ZERO_ROWS.filter((row) => row.level === 0)
    expect(zeros).toHaveLength(1)
    expect(zeros[0]?.uid, 'UID 0 with OutlineLevel 0 would be the project summary task (MR-4)').not.toBe(0)
    expect(BASE_ZERO_ROWS.slice(1)).toEqual(BASE_ONE_ROWS)
  })
})


describe('FR-021 (MUST) -- the outline base of the file that came in is kept', () => {
  it('remembers 1 for a file whose shallowest row is at 1', () => {
    expect(baseOf(imported(fileOf(BASE_ONE_ROWS)))).toBe(1)
  })

  it('remembers 1 for an MS Project file: its OutlineLevel 0 row is the project summary task, not counted (AT-139)', () => {
    expect(baseOf(imported(fileOf(MS_PROJECT_ROWS)))).toBe(1)
  })

  it('remembers 0 for a file whose OutlineLevel 0 row is a Task', () => {
    expect(baseOf(imported(fileOf(BASE_ZERO_ROWS)))).toBe(0)
  })

  it('brings a base-1 file back unchanged in the four columns -- the regression target', () => {
    const before = tasksOf(fileOf(BASE_ONE_ROWS))
    const after = tasksOf(roundTripped(fileOf(BASE_ONE_ROWS)))
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
    for (const [uid, fields] of before) {
      expect(fourOf(after.get(uid) ?? {}), `Task UID ${uid}`).toEqual(fourOf(fields))
    }
  })

  it('brings a base-0 file back unchanged in the four columns', () => {
    const before = tasksOf(fileOf(BASE_ZERO_ROWS))
    const after = tasksOf(roundTripped(fileOf(BASE_ZERO_ROWS)))
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
    for (const [uid, fields] of before) {
      expect(fourOf(after.get(uid) ?? {}), `Task UID ${uid}`).toEqual(fourOf(fields))
    }
  })

  it('brings an MS Project file back unchanged in the four columns, its summary task included', () => {
    const before = tasksOf(fileOf(MS_PROJECT_ROWS))
    const after = tasksOf(roundTripped(fileOf(MS_PROJECT_ROWS)))
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
    for (const [uid, fields] of before) {
      expect(fourOf(after.get(uid) ?? {}), `Task UID ${uid}`).toEqual(fourOf(fields))
    }
  })

  it('is not a vacuous case: rounding the base to 1 does shift the four columns', () => {
    const honest = imported(fileOf(BASE_ZERO_ROWS))
    const rounded = structuredClone(honest) as any
    rounded.schedule.project.outlineBase = 1

    const before = tasksOf(fileOf(BASE_ZERO_ROWS))
    const damaged = tasksOf(mspdiFromDocument(rounded as Document).text)
    const differing = [...before.keys()].filter(
      (uid) =>
        JSON.stringify(fourOf(damaged.get(uid) ?? {})) !==
        JSON.stringify(fourOf(before.get(uid) ?? {})),
    )
    expect(
      differing.length,
      'rounding the base changed nothing, so the two cases above prove nothing',
    ).toBeGreaterThan(0)
  })

  it('keeps the base itself across the round trip, not only the first read', () => {
    for (const rows of [BASE_ONE_ROWS, BASE_ZERO_ROWS, MS_PROJECT_ROWS]) {
      const once = imported(fileOf(rows))
      const twice = imported(mspdiFromDocument(once).text)
      expect(baseOf(twice), 'the base changed on the second pass').toBe(baseOf(once))
    }
  })

  it('writes from 1 for a document GRS made itself, which is the default', () => {
    expect(baseOf(TEMPLATE)).toBe(1)
    const levels = [...tasksOf(mspdiFromDocument(current()).text).values()]
      .map((fields) => Number(fields['OutlineLevel']))
      .filter((level) => Number.isFinite(level))
    expect(levels.length, 'the shipped template writes at least one Task').toBeGreaterThan(0)
    expect(Math.min(...levels)).toBe(1)
  })
})
