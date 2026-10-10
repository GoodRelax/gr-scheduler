// Contract cases for CR-716: the VS-6 parents of the large MSPDI sample are DG-1 (T-315 DG-1, T-311 VS-6, DX-7, DX-8, DT-1).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { documentFromMspdi } from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { delayDiagnosticsReportRows, type DelayDiagnosticsReport } from '../../src/entity/document-model/schedule/schedule'
import { specTable, unbroken } from './spec-table'

const SAMPLE_DIR = join(process.cwd(), 'sample-schedule')

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error('the bundled template is not a GRS JSON document')
  return read.document
}

function sampleDocument(file: string): Document {
  const read = documentFromMspdi(readFileSync(join(SAMPLE_DIR, file), 'utf8'), templateDocument())
  if (!read.ok) throw new Error(`${file} was refused: ${JSON.stringify(read.faults)}`)
  return read.document
}

const diagnose = (document: Document): DelayDiagnosticsReport =>
  scheduleEntry.diagnoseDelay(document, scheduleEntry.workingCalendarOf(document.schedule))

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

// WHY: the parents the large sample's VS-6 finds at S-487 = 1 (CR-651): four named ones and six inside uids 125 .. 145.
const NAMED_PARENTS = [208, 200, 182, 181] as const
const RANGE_FIRST = 125
const RANGE_LAST = 145
const RANGE_PARENTS = 6
const VS_6_PARENTS = NAMED_PARENTS.length + RANGE_PARENTS

const LANGUAGES = ['ja', 'en'] as const

const markOf = (report: DelayDiagnosticsReport, uid: number): string | undefined =>
  report.markerStates.find((one) => one.uid === uid)?.row
const vs6Uids = (report: DelayDiagnosticsReport): readonly number[] =>
  report.findings.filter((one) => one.row === 'VS-6').map((one) => one.uid)

describe('CR-716 -- the rows the large sample is judged by', () => {
  it('T-315 DG-1 still takes a VS-6 finding, and T-311 still gives the parent DG-1', () => {
    expect(cellOf('T-315', 'DG-1', '条件')).toContain('表 T-311 の `VS-6` の指摘を持つ')
    expect(cellOf('T-311', 'VS-6', '観点')).toContain('本行の親は 表 T-315 の `DG-1`（`?`）とする')
  })
})

describe.each(LANGUAGES)('CR-716 DX-8 -- the large sample (%s)', (language) => {
  const report = diagnose(sampleDocument(`sample-large-erp-program.${language}.xml`))
  const parents = vs6Uids(report)

  it('VS-6 finds the four named parents and six more inside uids 125 .. 145', () => {
    expect(parents).toHaveLength(VS_6_PARENTS)
    for (const uid of NAMED_PARENTS) expect(parents, `uid ${uid}`).toContain(uid)
    const others = parents.filter((uid) => !NAMED_PARENTS.some((named) => named === uid))
    expect(others).toHaveLength(RANGE_PARENTS)
    for (const uid of others) {
      expect(uid, `uid ${uid}`).toBeGreaterThanOrEqual(RANGE_FIRST)
      expect(uid, `uid ${uid}`).toBeLessThanOrEqual(RANGE_LAST)
    }
  })

  it.each([...NAMED_PARENTS])('uid %i is DG-1', (uid) => {
    expect(markOf(report, uid)).toBe('DG-1')
  })

  it('every VS-6 parent is DG-1, whatever it would otherwise be', () => {
    for (const uid of parents) expect(markOf(report, uid), `uid ${uid}`).toBe('DG-1')
  })

  it('DX-7: the count not analyzed equals the number of DG-1 tasks and is at least the VS-6 parents', () => {
    const dg1 = report.markerStates.filter((one) => one.row === 'DG-1').length
    expect(report.unreliableCount).toBe(dg1)
    expect(dg1).toBeGreaterThanOrEqual(VS_6_PARENTS)
  })

  it('DT-1: every VS-6 parent is listed as DG-1 and not as doubtful; its reason carries VS-6', () => {
    const document = sampleDocument(`sample-large-erp-program.${language}.xml`)
    const rows = delayDiagnosticsReportRows(report, document.schedule)
    for (const uid of parents) {
      const row = rows.find((one) => one.taskUid === uid)
      expect(row?.status, `uid ${uid}`).toBe('DG-1')
      const findings = row?.reason.kind === 'unreliable' ? row.reason.findings : []
      expect(findings.map((one) => one.row), `uid ${uid}`).toContain('VS-6')
    }
  })
})
