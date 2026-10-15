// DFC-2458 (spec-only): FR-132 counts the push-out in working minutes and rounds it up to working days only to compare it with S-397.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { diagnoseDelay, workingCalendarOf, type DelayDiagnosticsReport } from '../../src/entity/document-model/schedule/schedule'
import { taskGroupDocument, taskOf } from '../unit/cr-541-stage'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

// see FR-132, S-397, T-314
const FR_132_COMPARED = '押し出し日数（`DQ-4`）を稼働日へ切り上げた数が `S-397` 以上で完了していない `Task` をボトルネックとすること'
const FR_132_IN_MINUTES =
  '量はすべて文書の暦の稼働時間の分で数え（表 T-314）、`S-397` と比べるときだけ、`Project.minutesPerDay` 分（空なら `S-128`）を 1 日として稼働日へ切り上げること（MUST、暦は `FR-054`） —— 1 分でも終端を押したものを 1 日として数え、表 T-375 の `TX-8` が見せる日数と揃える。'
const FR_132_SETTLED = '押し出し日数を同じく切り上げた数が `S-397` 以上の完了したタスクは、レポートの 表 T-317 の `DX-9` に確定した押し出しとして出すこと（MUST）'
const S_397_NOTE = '比べるのは `DQ-4`（稼働時間の分）を稼働日へ切り上げた数である（`FR-132`） —— 30 分の押し出しも 1 稼働日として数える'

describe('the clauses and the row these cases are built from still read as quoted', () => {
  it.each([FR_132_COMPARED, FR_132_IN_MINUTES, FR_132_SETTLED])('FR-132: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('S-397 is 1 and its note compares the push-out rounded up to working days', () => {
    const row = specTable('T-206').rows.find((one) => one.id === 'S-397')
    expect(row, 'table T-206 holds S-397').toBeDefined()
    expect(unbroken(row?.by['既定'] ?? '').trim()).toBe('1')
    expect(unbroken(row?.by['保存しない理由'] ?? '')).toContain(S_397_NOTE)
  })
})

// WHY: May 2027 has Monday the 3rd and Monday the 10th; the bundled calendar works Monday to Friday, 08:00-12:00 and 13:00-17:00.
const may = (date: number, hhmm: string): string => `2027-05-${String(date).padStart(2, '0')}T${hhmm}:00`
const UID = 300

function documentOf(statusDate: string, task: Record<string, unknown>): Document {
  const raw = taskGroupDocument([{ id: 'r0', parentId: null }])
  raw.schedule.project.statusDate = statusDate
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.tasks = [task]
  raw.schedule.taskGroupMembers = [{ taskUid: UID, taskGroupId: 'r0' }]
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`premise: the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

// WHY: planned Mon 08:00 to Fri 17:00 (2400 min), worked to Thu 17:00 (1920), so 480 remain and BD-1 ends 480
// working minutes after the status date: the push-out is the working minutes from Friday 08:00 to the status date.
const startedOpen = (statusDate: string): Document =>
  documentOf(statusDate, taskOf(UID, { start: may(3, '08:00'), finish: may(7, '17:00'), actualStart: may(3, '08:00'), stop: may(6, '17:00'), percentComplete: 80 }))

// WHY: finished at actualFinish; the push-out is the working minutes from the planned finish to it.
const finishedAt = (actualFinish: string): Document =>
  documentOf(may(10, '17:00'), taskOf(UID, { start: may(3, '08:00'), finish: may(7, '17:00'), actualStart: may(3, '08:00'), actualFinish, percentComplete: 100 }))

const diagnose = (document: Document, threshold?: number): DelayDiagnosticsReport =>
  threshold === undefined
    ? diagnoseDelay(document, workingCalendarOf(document.schedule))
    : diagnoseDelay(document, workingCalendarOf(document.schedule), threshold)

const pushOutOf = (report: DelayDiagnosticsReport): number | undefined =>
  [...report.bottlenecks, ...report.settledPushOuts].find((one) => one.uid === UID)?.pushOutMinutes
const isBottleneck = (report: DelayDiagnosticsReport): boolean => report.bottlenecks.some((one) => one.uid === UID)
const isSettled = (report: DelayDiagnosticsReport): boolean => report.settledPushOuts.some((one) => one.uid === UID)

describe('DFC-2458 FR-132: an open task that pushes its end by 30 working minutes', () => {
  const report = diagnose(startedOpen(may(7, '08:30')))

  it('premise: the report is diagnosed and the push-out is counted in minutes, 30', () => {
    expect(report.outcome).toBe('diagnosed')
    expect(pushOutOf(report)).toBe(30)
  })

  it('is a bottleneck at S-397 = 1: 30 minutes round up to 1 working day', () => {
    expect(isBottleneck(report)).toBe(true)
  })

  it('is not a bottleneck at a lower limit of 2 working days: 30 minutes round up to 1, not more', () => {
    expect(isBottleneck(diagnose(startedOpen(may(7, '08:30')), 2))).toBe(false)
  })
})

describe('DFC-2458 FR-132: the rounding is by Project.minutesPerDay (S-128, 480, while empty)', () => {
  it('480 minutes are 1 working day: not a bottleneck at a lower limit of 2', () => {
    const report = diagnose(startedOpen(may(10, '08:00')), 2)
    expect(pushOutOf(diagnose(startedOpen(may(10, '08:00'))))).toBe(480)
    expect(isBottleneck(report)).toBe(false)
  })

  it('481 minutes round up to 2 working days: a bottleneck at a lower limit of 2', () => {
    const report = diagnose(startedOpen(may(10, '08:01')), 2)
    expect(pushOutOf(report)).toBe(481)
    expect(isBottleneck(report)).toBe(true)
  })
})

describe('DFC-2458 FR-132 DX-9: a finished task that pushed its end by 30 working minutes', () => {
  const report = diagnose(finishedAt(may(10, '08:30')))

  it('premise: the push-out is 30 minutes', () => {
    expect(pushOutOf(report)).toBe(30)
  })

  it('is no bottleneck, being finished', () => {
    expect(isBottleneck(report)).toBe(false)
  })

  it('is a settled push-out at S-397 = 1: 30 minutes round up to 1 working day', () => {
    expect(isSettled(report)).toBe(true)
  })

  it('is no settled push-out at a lower limit of 2 working days', () => {
    expect(isSettled(diagnose(finishedAt(may(10, '08:30')), 2))).toBe(false)
  })

  it('a task finished on its planned finish pushes nothing and is no settled push-out', () => {
    expect(isSettled(diagnose(finishedAt(may(7, '17:00'))))).toBe(false)
  })
})
