// Contract cases for CR-618 T8 and T9: the six MSPDI samples diagnose as managed projects.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { documentFromMspdi } from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { specTable, unbroken } from './spec-table'

const SAMPLE_DIR = join(process.cwd(), 'sample-schedule')

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function currentDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error('the bundled template is not a GRS JSON document')
  return read.document
}

function sampleDocument(file: string): Document {
  const read = documentFromMspdi(readFileSync(join(SAMPLE_DIR, file), 'utf8'), currentDocument())
  if (!read.ok) throw new Error(`${file} was refused: ${JSON.stringify(read.faults)}`)
  return read.document
}

type Report = unknown
type Diagnose = (document: Document, calendar: unknown) => Report

function diagnose(document: Document): Report {
  const seam = (scheduleEntry as unknown as { diagnoseDelay?: Diagnose }).diagnoseDelay
  if (typeof seam !== 'function') {
    throw new Error('SEAM-1: the Schedule entry (schedule.ts) publishes no diagnoseDelay')
  }
  return seam(document, scheduleEntry.workingCalendarOf(document.schedule))
}

type Loose = Record<string, unknown>
const isPlain = (value: unknown): value is Loose =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Map) && !(value instanceof Set)

function nodesOf(root: unknown): readonly unknown[] {
  const out: unknown[] = []
  const seen = new Set<unknown>()
  const visit = (node: unknown): void => {
    out.push(node)
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (node instanceof Map) {
      for (const [key, value] of node) {
        visit(key)
        visit(value)
      }
    } else if (node instanceof Set) {
      for (const value of node) visit(value)
    } else {
      for (const value of Object.values(node as Loose)) visit(value)
    }
  }
  visit(root)
  return out
}

const MARK_ROW = /^DG-[1-4]$/
const FINDING_ROW = /^V[COS]-\d+$/

// see T-317, DX-8
function marksOf(report: Report): ReadonlyMap<number, string> {
  const marks = new Map<number, string>()
  for (const node of nodesOf(report)) {
    if (node instanceof Map) {
      for (const [key, value] of node) {
        if (typeof key === 'number' && typeof value === 'string' && MARK_ROW.test(value)) marks.set(key, value)
      }
    } else if (isPlain(node)) {
      const symbol = Object.values(node).find((value) => typeof value === 'string' && MARK_ROW.test(value))
      const numbers = Object.values(node).filter((value): value is number => typeof value === 'number')
      if (typeof symbol === 'string' && numbers.length === 1) marks.set(numbers[0] as number, symbol)
      for (const [key, value] of Object.entries(node)) {
        if (/^\d+$/.test(key) && typeof value === 'string' && MARK_ROW.test(value)) marks.set(Number(key), value)
      }
    }
  }
  return marks
}

// see T-317, DX-3
function findingRows(report: Report): readonly string[] {
  return nodesOf(report)
    .filter(isPlain)
    .flatMap((record) => {
      const row = Object.values(record).find((value): value is string => typeof value === 'string' && FINDING_ROW.test(value))
      return row === undefined ? [] : [row]
    })
}

interface Counts {
  readonly 'DG-1': number
  readonly 'DG-2': number
  readonly 'DG-3': number
  readonly 'DG-4': number
  readonly findings: readonly string[]
}

const COUNTED = new Map<string, Counts>()

function countsOf(file: string): Counts {
  const known = COUNTED.get(file)
  if (known !== undefined) return known
  const counts = freshCountsOf(file)
  COUNTED.set(file, counts)
  return counts
}

function freshCountsOf(file: string): Counts {
  const document = sampleDocument(file)
  const report = diagnose(document)
  const marks = [...marksOf(report).values()]
  const of = (row: string): number => marks.filter((one) => one === row).length
  return {
    'DG-1': of('DG-1'),
    'DG-2': of('DG-2'),
    'DG-3': of('DG-3'),
    'DG-4': of('DG-4'),
    findings: findingRows(report),
  }
}

function statusDayOf(file: string): string {
  return String(sampleDocument(file).schedule.project.statusDate).slice(0, 10)
}

interface TableSRow {
  readonly sample: string
  readonly tasks: number
  readonly statusDate: string
  readonly bottleneck: number
  readonly pathNumber: number
  readonly pathCeiling: number
  readonly unreliable: number
  readonly delay: number
}

// WHY: CR-618 section 9.2 table S (rewritten by JDG-1040, 2026-10-01), copied as it stands;
// tasks and delay are kept for the reader only -- see the tolerance bullet below.
const TABLE_S: readonly TableSRow[] = [
  {
    sample: 'sample-small-website-renewal',
    tasks: 45,
    statusDate: '2026-10-09',
    bottleneck: 2,
    pathNumber: 1,
    pathCeiling: 2,
    unreliable: 2,
    delay: 1,
  },
  {
    sample: 'sample-medium-sfa-webapp',
    tasks: 134,
    statusDate: '2026-09-09',
    bottleneck: 2,
    pathNumber: 3,
    pathCeiling: 8,
    unreliable: 7,
    delay: 2,
  },
  {
    sample: 'sample-large-erp-program',
    tasks: 256,
    statusDate: '2026-12-09',
    bottleneck: 11,
    pathNumber: 14,
    pathCeiling: 19,
    unreliable: 13,
    delay: 9,
  },
]
const BOTTLENECK_AND_UNRELIABLE_SLACK = 1
const VS_6 = 'VS-6'
// see VS-6, S-487
// TRAP: that table's count cell says 9 for the large sample but its parent column lists 10 uids
// (208, 200, 182, 181 and 125 .. 145); 10 is the count by leaf descendants (decision 1), 9 the count without 181.
const VS_6_COUNT_OF_SAMPLE: ReadonlyMap<string, number> = new Map([
  ['sample-small-website-renewal', 1],
  ['sample-medium-sfa-webapp', 0],
  ['sample-large-erp-program', 10],
])
const PATH_SLACK_BELOW_TABLE_NUMBER = 2
const DELAY_AT_LEAST = 1
const LANGUAGES = ['en', 'ja'] as const

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

describe('CR-618 -- the rows T8 counts by', () => {
  it('T-315 still holds DG-1 .. DG-4 and T-311 still holds VS-5 as the sample counts read them', () => {
    expect(specTable('T-315').rows.map((row) => row.id)).toEqual(['DG-1', 'DG-2', 'DG-3', 'DG-4'])
    expect(cellOf('T-315', 'DG-3', '条件')).toContain('`DG-2` の `Task` の WBS の祖先')
    expect(cellOf('T-311', 'VS-5', '観点')).toBe('実績の日付が `Project.statusDate` より後')
  })
})

describe('CR-618 T8 -- each MSPDI sample diagnoses to table S of CR-618 section 9.2', () => {
  const cases = TABLE_S.flatMap((row) => LANGUAGES.map((language) => [`${row.sample}.${language}.xml`, row] as const))

  it.each(cases)('%s carries the status date of table S (day of Project.statusDate)', (file, row) => {
    expect(statusDayOf(file)).toBe(row.statusDate)
  })

  it.each(cases)('%s: DG-2 bottlenecks within +-1 of table S', (file, row) => {
    const counts = countsOf(file)
    expect(Math.abs(counts['DG-2'] - row.bottleneck), JSON.stringify(counts)).toBeLessThanOrEqual(
      BOTTLENECK_AND_UNRELIABLE_SLACK,
    )
  })

  it.each(cases)('%s: DG-3 from table S - 2 up to the tree ceiling in parens', (file, row) => {
    const counts = countsOf(file)
    expect(counts['DG-3'], JSON.stringify(counts)).toBeLessThanOrEqual(row.pathCeiling)
    expect(counts['DG-3'], JSON.stringify(counts)).toBeGreaterThanOrEqual(row.pathNumber - PATH_SLACK_BELOW_TABLE_NUMBER)
  })

  it.each(cases)('%s: DG-1 unreliable within +-1 of table S', (file, row) => {
    const counts = countsOf(file)
    expect(Math.abs(counts['DG-1'] - row.unreliable), JSON.stringify(counts)).toBeLessThanOrEqual(
      BOTTLENECK_AND_UNRELIABLE_SLACK,
    )
  })

  it.each(cases)('%s: DG-4 delay at least 1', (file) => {
    const counts = countsOf(file)
    expect(counts['DG-4'], JSON.stringify(counts)).toBeGreaterThanOrEqual(DELAY_AT_LEAST)
  })

  // WHY: CR-651 added VS-6 after table S was written; its count per sample is CR-651 section 0.3 at S-487 = 1.
  it.each(cases)('%s: exactly one VC-5 finding, the VS-6 count of CR-651, and zero of every other row', (file, row) => {
    const findings = countsOf(file).findings
    expect(findings.filter((one) => one !== VS_6)).toEqual(['VC-5'])
    expect(findings.filter((one) => one === VS_6)).toHaveLength(VS_6_COUNT_OF_SAMPLE.get(row.sample) ?? -1)
  })

  it.each(TABLE_S.map((row) => [row.sample] as const))('%s: en and ja give identical counts', (sample) => {
    expect(countsOf(`${sample}.ja.xml`)).toEqual(countsOf(`${sample}.en.xml`))
  })
})

describe('CR-618 T9 -- sample-schedule/ keeps no ProjectLibre file and no No Name copy', () => {
  it.each(['ProjectLibre.xml', 'No Name.json'])('sample-schedule/%s does not exist', (file) => {
    expect(existsSync(join(SAMPLE_DIR, file))).toBe(false)
  })
})
