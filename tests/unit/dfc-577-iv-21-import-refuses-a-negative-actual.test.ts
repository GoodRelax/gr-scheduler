// DFC-577: import refuses a Task whose actual length, counted from actualStart to its last day, is negative (IV-21, OP-5, FR-023).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Project, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  validateImportedDocument,
  type ImportBounds,
  type ImportCandidate,
  type ImportVerdict,
} from '../../src/use-case/validate-imported-document/validate-imported-document'
import { specTable, unbroken } from '../contract/spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const cellOf = (tableId: string, rowId: string, heading: string): string => {
  const row = specTable(tableId).rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  const cell = row.by[heading]
  if (cell === undefined) {
    throw new Error(
      `table ${tableId} has no ${heading} column; it has ${Object.keys(row.by).join(', ')}`,
    )
  }
  return cell
}

const IV_21_NOT_BELOW_ZERO =
  '`actualStart` と実績の最後の日（完了なら `actualFinish`、それ以外は `stop`）がともに非 `null` の `Task` で、`FR-011` が日付から数えた実績の長さが 0 を下回らないこと。'

const IV_21_FLOOR_IS_NOT_ITS_CONCERN = '⚠️ **0 以上で床を下回る値は本行の対象ではない**'

const FR_011_NEGATIVE_LENGTH =
  '最後の日が `actualStart` より前のときの長さは、最後の日から `actualStart` の前日までの稼働日の数に負の符号を付けたものとする。'

const OP_5_REGARDLESS_OF_PATH = '経路によらず `FR-023` の検証を通すこと（MUST）。'

const FR_023_STATEMENT =
  '外部からファイルを読み込むとき、`GRS` は、それを信頼できない入力として厳格に検証すること。'

describe('DFC-577 premise -- the clauses this test is built from', () => {
  it('T-220 IV-21, FR-011, T-024a OP-5 and FR-023 still read as quoted here', () => {
    expect(cellOf('T-220', 'IV-21', '不変条件')).toContain(IV_21_NOT_BELOW_ZERO)
    expect(cellOf('T-220', 'IV-21', '不変条件')).toContain(IV_21_FLOOR_IS_NOT_ITS_CONCERN)
    expect(REQUIREMENTS).toContain(FR_011_NEGATIVE_LENGTH)
    expect(cellOf('T-024a', 'OP-5', '規則')).toContain(OP_5_REGARDLESS_OF_PATH)
    expect(REQUIREMENTS).toContain(FR_023_STATEMENT)
  })
})

const BOUNDS: ImportBounds = {
  importMaxBytes: 32,
  importMaxItems: 20000,
  importMaxDepth: 64,
  importMinDate: '1970-01-01',
  importMaxDate: '2200-12-31',
}

const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
  wbsParentUid: null,
  wbsOrder: null,
  name: null,
  start: null,
  finish: null,
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
  ...part,
})

const projectOf = (part: Partial<Project> = {}): Project => ({
  id: null,
  name: null,
  title: 'A',
  subject: null,
  category: null,
  company: null,
  manager: null,
  author: null,
  created: null,
  revision: null,
  lastSaved: null,
  startDate: null,
  statusDate: null,
  minutesPerDay: null,
  minutesPerWeek: null,
  daysPerMonth: null,
  weekStartDay: null,
  calendarUid: null,
  themeHue: 214,
  uidHighWaterMark: 0,
  importSeq: 0,
  outlineBase: 1,
  carry: {},
  carryElements: [],
  ...part,
})

const documentOf = (tasks: readonly Task[]): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: projectOf(),
      calendars: [],
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      importMaxBytes: BOUNDS.importMaxBytes,
      importMaxItems: BOUNDS.importMaxItems,
      importMaxDepth: BOUNDS.importMaxDepth,
      importMinDate: BOUNDS.importMinDate,
      importMaxDate: BOUNDS.importMaxDate,
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const SMALL = 1024

const candidateOf = (document: Document): ImportCandidate => ({
  document,
  byteLength: SMALL,
  emptyRowTaskUids: [],
})

const verdictOf = (document: Document): ImportVerdict =>
  validateImportedDocument(candidateOf(document), BOUNDS)

const refusalsOf = (verdict: ImportVerdict) => (verdict.ok ? [] : verdict.refusals)

const IN_RANGE = { start: '2026-01-05', finish: '2026-01-09' } as const

const runningUntil = (stop: string): Task =>
  taskOf({ uid: 1, name: 't1', ...IN_RANGE, actualStart: '2026-01-05', stop, resumeValid: true })

const finishedOn = (actualFinish: string): Task =>
  taskOf({ uid: 1, name: 't1', ...IN_RANGE, actualStart: '2026-01-05', actualFinish, resumeValid: false })

describe('ValidateImportedDocument (UF-22) -- DFC-577, IV-21 on the import path', () => {
  it('IV-21 refuses a running Task whose stop falls on the worked Friday before its Monday actualStart', () => {
    const verdict = verdictOf(documentOf([runningUntil('2026-01-02')]))
    expect(verdict.ok).toBe(false)
    const breach = refusalsOf(verdict).find((one) => one.rule === 'IV-21')
    expect(breach, JSON.stringify(refusalsOf(verdict))).toBeDefined()
    expect(breach?.notice).toBe('NT-1')
    expect(typeof breach?.what).toBe('string')
    expect(breach?.what.length).toBeGreaterThan(0)
  })

  it('IV-21 refuses a finished Task whose actualFinish falls before its actualStart with a worked day between', () => {
    const verdict = verdictOf(documentOf([finishedOn('2026-01-02')]))
    expect(verdict.ok).toBe(false)
    expect(refusalsOf(verdict).some((one) => one.rule === 'IV-21'), JSON.stringify(refusalsOf(verdict))).toBe(true)
  })

  it('a control document, identical except stop is after actualStart, is accepted', () => {
    const verdict = verdictOf(documentOf([runningUntil('2026-01-07')]))
    expect(verdict).toEqual({ ok: true })
  })

  it('a stop on the Sunday before actualStart counts zero, which IV-21 leaves to the FR-011 floor', () => {
    const verdict = verdictOf(documentOf([runningUntil('2026-01-04')]))
    expect(refusalsOf(verdict).some((one) => one.rule === 'IV-21'), JSON.stringify(refusalsOf(verdict))).toBe(false)
  })
})
