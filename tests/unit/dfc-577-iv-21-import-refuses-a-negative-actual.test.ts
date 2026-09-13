// DFC-577: import refuses a Task whose actualStart and actualDuration are both set and actualDuration is negative (IV-21, OP-5, FR-023).

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
  '`actualStart` と `actualDuration` がともに非 `null` の `Task` で、`actualDuration` が 0 を下回らないこと。'

const OP_5_REGARDLESS_OF_PATH = '経路によらず `FR-023` の検証を通すこと（MUST）。'

const FR_023_STATEMENT =
  '外部からファイルを読み込むとき、`GRS` は、それを信頼できない入力として厳格に検証すること。'

describe('DFC-577 premise -- the clauses this test is built from', () => {
  it('T-220 IV-21, T-024a OP-5 and FR-023 still read as quoted here', () => {
    expect(cellOf('T-220', 'IV-21', '不変条件')).toContain(IV_21_NOT_BELOW_ZERO)
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
  actualDuration: null,
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

const taskWithActual = (actualDuration: number): Task =>
  taskOf({ uid: 1, name: 't1', ...IN_RANGE, actualStart: '2026-01-05', actualDuration })

describe('ValidateImportedDocument (UF-22) -- DFC-577, IV-21 on the import path', () => {
  it('IV-21 refuses a Task whose actualStart and actualDuration are both set and actualDuration is negative', () => {
    const verdict = verdictOf(documentOf([taskWithActual(-1)]))
    expect(verdict.ok).toBe(false)
    const breach = refusalsOf(verdict).find((one) => one.rule === 'IV-21')
    expect(breach, JSON.stringify(refusalsOf(verdict))).toBeDefined()
    expect(breach?.notice).toBe('NT-1')
    expect(typeof breach?.what).toBe('string')
    expect(breach?.what.length).toBeGreaterThan(0)
  })

  it('a control document, identical except actualDuration is not negative, is accepted', () => {
    const verdict = verdictOf(documentOf([taskWithActual(3)]))
    expect(verdict).toEqual({ ok: true })
  })
})
