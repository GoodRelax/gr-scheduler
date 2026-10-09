// DFC-1620: BD-2 reads a pj12 / pj15 document by the clock, so a 17:00 -> next-morning 08:00 FS chain carries a k-day delay as k days, not k - 1.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { unbroken } from '../contract/spec-table'
import { taskGroupDocument, taskOf } from './cr-541-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each clause is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const BD_2_CLOCK = '`VC-15` が時刻で比べる文書（MSPDI から取り込んだ文書）では、流しも時刻で読む'
const BD_2_K_DAYS = '17:00 に終わり翌朝 8:00 に始める FS の鎖では、計画どおりなら押し出しは 0、先行が k 日遅れれば後続へ k 日届く'
const BD_2_SAME_DAY = 'FS の後続の最早開始は、先行の見込み終了と **同じ日** ＋ `lag` であり、翌稼働日ではない'
const BD_4_TERMINAL = '終端ごとに、終端の遅れ（見込み終了 − `finish`、0 以上）を残りとし'

describe('DFC-1620 the manuscript these cases are driven by', () => {
  it.each([BD_2_CLOCK, BD_2_K_DAYS, BD_2_SAME_DAY, BD_4_TERMINAL])('01-04 still says it: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

type Loose = Record<string, unknown>

const S = (day: number): string => `2026-04-${String(day).padStart(2, '0')}T08:00:00`
const F = (day: number): string => `2026-04-${String(day).padStart(2, '0')}T17:00:00`
const after = (uid: number): Loose => ({ predecessorUid: uid, linkType: 1, lag: 0, lagFormat: 7, carry: {}, carryElements: [] })

const A = 201
const B = 202
const C = 203

// WHY: April 2026 runs Mon 6, Tue 7, Wed 8, Thu 9, Fri 10, Mon 13, Tue 14, Wed 15 (a Monday-to-Friday calendar).
// A is planned Mon 6 08:00 to Wed 8 17:00, B the next morning (Thu 9 to Fri 10), C the next working morning (Mon 13 to Tue 14).
function chain(sourceFormat: 'grs' | 'pj12' | 'pj15', finishOfA: number): Document {
  const raw = taskGroupDocument([
    { id: 'r1', parentId: null },
    { id: 'r2', parentId: null },
    { id: 'r3', parentId: null },
  ])
  // WHY: the status date is the day A really finished, so B and C are both still to be started on it.
  raw['schedule'].project.statusDate = F(finishOfA)
  raw['schedule'].project.uidHighWaterMark = 1000
  raw['schedule'].project.sourceFormat = sourceFormat
  raw['schedule'].tasks = [
    taskOf(A, { name: 'A', start: S(6), finish: F(8), actualStart: S(6), actualFinish: F(finishOfA), percentComplete: 100 }),
    taskOf(B, { name: 'B', start: S(9), finish: F(10), dependencies: [after(A)] }),
    taskOf(C, { name: 'C', start: S(13), finish: F(14), dependencies: [after(B)] }),
  ]
  raw['schedule'].taskGroupMembers = [
    { taskUid: A, groupId: 'r1' },
    { taskUid: B, groupId: 'r2' },
    { taskUid: C, groupId: 'r3' },
  ]
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the fixture does not decode: ${JSON.stringify(decoded.faults).slice(0, 400)}`)
  return decoded.document
}

type Diagnose = (document: Document, calendar: unknown) => unknown

function diagnose(document: Document): unknown {
  const seam = (scheduleEntry as unknown as { diagnoseDelay?: Diagnose }).diagnoseDelay
  if (typeof seam !== 'function') throw new Error('S-1: the Schedule entry publishes no diagnoseDelay')
  return seam(document, scheduleEntry.workingCalendarOf(document.schedule))
}

// see T-313, BD-4
// WHY: a terminal whose delay is zero may be left out of the report, which reads as 0.
function terminalDelayOf(report: unknown, uid: number): number {
  const seen = new Set<unknown>()
  const found: number[] = []
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      for (const one of node) visit(one)
      return
    }
    const record = node as Loose
    if (record['uid'] === uid && typeof record['terminalDelayDays'] === 'number') found.push(record['terminalDelayDays'])
    for (const value of Object.values(record)) visit(value)
  }
  visit(report)
  return found[0] ?? 0
}

describe('BD-2 (MUST): in a pj12 / pj15 document a FS chain from 17:00 to the next morning hands a k-day delay on as k days (DFC-1620)', () => {
  it.each(['pj12', 'pj15'] as const)('%s: on plan, nothing reaches the end of the chain', (format) => {
    expect(terminalDelayOf(diagnose(chain(format, 8)), C)).toBe(0)
  })

  // WHY: A finishes Mon 13 against a planned Wed 8, three working days late (Thu 9, Fri 10, Mon 13).
  it.each(['pj12', 'pj15'] as const)('%s: A three days late reaches the end of the chain as 3', (format) => {
    expect(terminalDelayOf(diagnose(chain(format, 13)), C)).toBe(3)
  })

  it.each(['pj12', 'pj15'] as const)('%s: A one day late reaches the end of the chain as 1', (format) => {
    expect(terminalDelayOf(diagnose(chain(format, 9)), C)).toBe(1)
  })
})

describe('BD-2 (MUST): a GRS document reads the day, so the successor may start on the day its predecessor ends', () => {
  it('grs: on plan, nothing reaches the end of the chain', () => {
    expect(terminalDelayOf(diagnose(chain('grs', 8)), C)).toBe(0)
  })

  // WHY: the day reading starts B on Mon 13 and C on Tue 14, so only 1 of A's 3 days reaches C.
  it('grs: A three days late reaches the end of the chain as 1', () => {
    expect(terminalDelayOf(diagnose(chain('grs', 13)), C)).toBe(1)
  })
})
