// Contract cases for CR-618 T8 and T9 (large sample per CR-790): the six MSPDI samples diagnose as managed projects.

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
  // WHY: CR-790 table S' gives DG-1 with no tolerance; when set, DG-1 must equal this and the
  // "table S + VS-6 count +-1" form is not used.
  readonly unreliableExact?: number
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
  // WHY: the large row is CR-790 table S' (2026-10-17), not CR-618 table S: DG-2 11, DG-3 14 (ceiling 19),
  // DG-1 exactly 3, DG-4 9; tasks and delay are kept for the reader only.
  {
    sample: 'sample-large-erp-program',
    tasks: 256,
    statusDate: '2026-12-09',
    bottleneck: 11,
    pathNumber: 14,
    pathCeiling: 19,
    unreliable: 3,
    delay: 9,
    unreliableExact: 3,
  },
]
const BOTTLENECK_AND_UNRELIABLE_SLACK = 1
const VS_6 = 'VS-6'
// see VS-6, S-487
// TRAP: the large sample used to carry 10 VS-6 findings (S-487); since CR-790 it carries exactly 1
// (Task uid 200), because the tool aligns the other nine summaries' stop with their leftmost leaf.
const VS_6_COUNT_OF_SAMPLE: ReadonlyMap<string, number> = new Map([
  ['sample-small-website-renewal', 1],
  ['sample-medium-sfa-webapp', 0],
  ['sample-large-erp-program', 1],
])
// WHY: findings per sample, sorted. Small and medium: CR-618 table S (one VC-5) plus the VS-6 count of CR-651;
// large: CR-790 table S' (VC-12 twice, VS-6 once, no other row).
const FINDINGS_OF_SAMPLE: ReadonlyMap<string, readonly string[]> = new Map([
  ['sample-small-website-renewal', ['VC-5', 'VS-6']],
  ['sample-medium-sfa-webapp', ['VC-5']],
  ['sample-large-erp-program', ['VC-12', 'VC-12', 'VS-6']],
])
const PATH_SLACK_BELOW_TABLE_NUMBER = 2
const DELAY_AT_LEAST = 1
const LANGUAGES = ['en', 'ja'] as const

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

describe('CR-618 -- the rows T8 counts by', () => {
  it('T-315 still holds DG-1 .. DG-4 and T-311 still holds VS-5 as the sample counts read them', () => {
    expect(specTable('T-315').rows.map((row) => row.id)).toEqual(['DG-1', 'DG-2', 'DG-3', 'DG-4'])
    expect(cellOf('T-315', 'DG-3', '条件')).toContain('`DG-2` の `Task` の祖先タスク')
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

  // WHY: table S predates CR-716 (JDG-1772), which makes every VS-6 parent DG-1; a VS-6 parent that
  // table S counted as DG-3 now counts as DG-1, so the DG-3 floor drops and the DG-1 target rises by the VS-6 count.
  it.each(cases)('%s: DG-3 from table S - 2 - the VS-6 count up to the tree ceiling in parens', (file, row) => {
    const counts = countsOf(file)
    const vs6 = VS_6_COUNT_OF_SAMPLE.get(row.sample) ?? 0
    expect(counts['DG-3'], JSON.stringify(counts)).toBeLessThanOrEqual(row.pathCeiling)
    expect(counts['DG-3'], JSON.stringify(counts)).toBeGreaterThanOrEqual(
      row.pathNumber - PATH_SLACK_BELOW_TABLE_NUMBER - vs6,
    )
  })

  // WHY: CR-790 table S' says DG-1 is exactly 3 for the large sample (no tolerance, nothing spreads downstream).
  it.each(cases)('%s: DG-1 unreliable within +-1 of table S + the VS-6 count (exactly 3 for the large sample, CR-790)', (file, row) => {
    const counts = countsOf(file)
    if (row.unreliableExact !== undefined) {
      expect(counts['DG-1'], JSON.stringify(counts)).toBe(row.unreliableExact)
      return
    }
    const vs6 = VS_6_COUNT_OF_SAMPLE.get(row.sample) ?? 0
    expect(Math.abs(counts['DG-1'] - row.unreliable - vs6), JSON.stringify(counts)).toBeLessThanOrEqual(
      BOTTLENECK_AND_UNRELIABLE_SLACK,
    )
  })

  it.each(cases)('%s: DG-4 delay at least 1', (file) => {
    const counts = countsOf(file)
    expect(counts['DG-4'], JSON.stringify(counts)).toBeGreaterThanOrEqual(DELAY_AT_LEAST)
  })

  // WHY: CR-651 added VS-6 after table S was written (small 1, medium 0); the large sample is CR-790 table S':
  // VC-12 twice and VS-6 once, and no other finding row.
  it.each(cases)('%s: exactly the findings of its table (small and medium: one VC-5 and the VS-6 count; large: CR-790)', (file, row) => {
    const findings = countsOf(file).findings
    expect([...findings].sort()).toEqual([...(FINDINGS_OF_SAMPLE.get(row.sample) ?? ['<no table row>'])].sort())
    expect(findings.filter((one) => one === VS_6)).toHaveLength(VS_6_COUNT_OF_SAMPLE.get(row.sample) ?? -1)
  })

  it.each(TABLE_S.map((row) => [row.sample] as const))('%s: en and ja give identical counts', (sample) => {
    expect(countsOf(`${sample}.ja.xml`)).toEqual(countsOf(`${sample}.en.xml`))
  })
})

type Propose = (document: Document, report: Report, checks: readonly unknown[]) => readonly Loose[]

function fixRowsOf(file: string): readonly Loose[] {
  const seam = (scheduleEntry as unknown as { proposeDelayFixes?: Propose }).proposeDelayFixes
  if (typeof seam !== 'function') {
    throw new Error('SEAM-2: the Schedule entry (schedule.ts) publishes no proposeDelayFixes')
  }
  const document = sampleDocument(file)
  return seam(document, diagnose(document), [])
}

// WHY: CR-790 table S' and its three-finding table: two FA-12 machine fixes (VC-12 on Task uid 48 and 153,
// initially checked) and one FA-21 by-hand fix (VS-6 on Task uid 200).
const LARGE_FIX_ROWS = [
  { fixRow: 'FA-12', findingRow: 'VC-12', taskUid: 48, fixKind: 'automatic', checked: true },
  { fixRow: 'FA-12', findingRow: 'VC-12', taskUid: 153, fixKind: 'automatic', checked: true },
  { fixRow: 'FA-21', findingRow: 'VS-6', taskUid: 200, fixKind: 'byHand' },
] as const

describe('CR-790 -- the large sample proposes two machine fixes and one by-hand fix (table T-373)', () => {
  it.each(LANGUAGES.map((language) => [`sample-large-erp-program.${language}.xml`] as const))(
    '%s: exactly the three fix proposals of CR-790 table S prime',
    (file) => {
      const rows = [...fixRowsOf(file)].sort((a, b) => Number(a['taskUid']) - Number(b['taskUid']))
      expect(rows, JSON.stringify(rows.map((one) => [one['fixRow'], one['taskUid']]))).toHaveLength(LARGE_FIX_ROWS.length)
      LARGE_FIX_ROWS.forEach((want, at) => {
        expect(rows[at], `row ${at}`).toMatchObject(want)
      })
    },
  )
})

describe('CR-618 T9 -- sample-schedule/ keeps no ProjectLibre file and no No Name copy', () => {
  it.each(['ProjectLibre.xml', 'No Name.json'])('sample-schedule/%s does not exist', (file) => {
    expect(existsSync(join(SAMPLE_DIR, file))).toBe(false)
  })
})
