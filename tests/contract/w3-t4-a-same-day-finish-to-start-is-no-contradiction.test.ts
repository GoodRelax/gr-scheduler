// W3 tester 4: FR-131 table T-310 VC-15 -- the finish day counted inclusive (ND-3) is not a one-day gap a Finish-to-Start link must leave.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { taskGroupDocument, taskOf } from '../unit/cr-541-stage'
import { REQUIREMENTS } from './cr-610-file-flow-stage'

const VC_15_NOT_ND_3 =
  ' `lag` は、稼働日の数だけ日を進め、時刻を保つ（量は稼働日のまま）。⛔ `ND-3` の「終了日はその日を含む」を、FS の 1 日の差に数えてはならない（MUST NOT）'
const VC_15_SAME_DAY = '⭐ 日は日として比べ、4 つとも **同じ日は反しない**'
const VC_15_FS = 'FS: 後続の `start` ≥ 先行の `finish` ＋ `lag`'

// see AT-46
const FS = 1

type Diagnose = (document: Document, calendar: unknown) => unknown

// see PI-1, AM-19
/** @purity pure */
function findingRowsOf(document: Document): readonly string[] {
  const seam = (scheduleEntry as unknown as { diagnoseDelay?: Diagnose }).diagnoseDelay
  if (typeof seam !== 'function') throw new Error('the Schedule entry publishes no diagnoseDelay')
  const report = seam(document, scheduleEntry.workingCalendarOf(document.schedule))
  const rows: string[] = []
  const seen = new Set<unknown>()
  const visit = (node: unknown): void => {
    if (typeof node === 'string' && /^V[COS]-\d+$/.test(node)) rows.push(node)
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    const inside = node instanceof Map ? [...node.keys(), ...node.values()] : node instanceof Set ? [...node] : Object.values(node)
    for (const one of inside) visit(one)
  }
  visit(report)
  return rows
}

const PREDECESSOR = 1
const SUCCESSOR = 2

// see VC-15
// WHY: the predecessor runs 6 to 8 April and the successor is linked to it Finish-to-Start with lag 0.
/** @purity pure */
function linkedDocument(successorStart: string, successorFinish: string): Document {
  const draft = taskGroupDocument([
    { id: 'g1', parentId: null },
    { id: 'g2', parentId: null },
  ])
  draft['schedule'].project.statusDate = '2026-04-01T08:00:00'
  draft['schedule'].tasks[0] = taskOf(PREDECESSOR, { start: '2026-04-06T08:00:00', finish: '2026-04-08T17:00:00' })
  draft['schedule'].tasks[1] = taskOf(SUCCESSOR, {
    start: successorStart,
    finish: successorFinish,
    dependencies: [{ predecessorUid: PREDECESSOR, linkType: FS, lag: 0, lagFormat: 7, carry: {}, carryElements: [] }],
  })
  const read = documentFromJson(JSON.stringify(draft))
  if (!read.ok) throw new Error(`the bench document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

describe('VC-15 -- the manuscript these cases are driven by', () => {
  it.each([VC_15_NOT_ND_3, VC_15_SAME_DAY, VC_15_FS])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`VC-15 -- ${VC_15_NOT_ND_3}`, () => {
  it('a successor that starts on the day its predecessor finishes is not a contradiction', () => {
    const rows = findingRowsOf(linkedDocument('2026-04-08T08:00:00', '2026-04-10T17:00:00'))
    expect(rows, `${VC_15_NOT_ND_3} -- ${VC_15_SAME_DAY}`).not.toContain('VC-15')
  })

  it('the control: a successor that starts the day before its predecessor finishes is VC-15', () => {
    const rows = findingRowsOf(linkedDocument('2026-04-07T08:00:00', '2026-04-10T17:00:00'))
    expect(rows, VC_15_FS).toContain('VC-15')
  })
})
