// CR-718 spec-only cases: the import validation refuses under the table T-220 row that holds (IV-10, IV-14), not under a setting or a requirement (FR-076, FR-023).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { blankTaskVisual, type Project, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  validateImportedDocument,
  type ImportCandidate,
  type ImportVerdict,
} from '../../src/use-case/validate-imported-document/validate-imported-document'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW =
  '⭐ ⇒ 取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST） —— 語と次の一手は `FR-038` の辞書が同表の行 ID で持つ。'
const NO_FALL_TO_A_T_233_ROW =
  '⛔ その通知を本表の行（`RS-15` を含む）へ振り替えてはならない（MUST NOT） —— 振り替えると、どの不変条件が破れたのかを人が読めず、`NT-1` の「なぜ誤りか」を果せない。'
const A_REFUSAL_VALUE_CARRIES_THE_ROW_ID =
  '⭐ 取り込みの検証（`FR-023`）が拒んだときの理由の区分は、拒んだ `05-07-design.md` の 表 T-220 の行の行 ID とすること（MUST）'
const IV_10 = '`start` と `finish` がともに非 `null` の `Task` で、`finish` が `start` より前でないこと'
const IV_14 = '日付の列が、日として読め、受け入れる日付の範囲に収まること。'

const t220Row = (rowId: string) => {
  const found = specTable('T-220').rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table T-220 has no row ${rowId}`)
  return found
}

describe('FR-076 / AG-9a / T-220 -- the clauses this file is driven by still stand', () => {
  it.each([AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW, NO_FALL_TO_A_T_233_ROW, A_REFUSAL_VALUE_CARRIES_THE_ROW_ID])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-220 rows IV-10 and IV-14 say what they refuse', () => {
    expect(t220Row('IV-10').cells.join(' ')).toContain(IV_10)
    expect(t220Row('IV-14').cells.join(' ')).toContain(IV_14)
  })
})

// see S-119, T-214
// WHY: the first day the import accepts is read off the table, never typed here.
const IMPORT_MIN_DATE = ((): string => {
  const found = /\d{4}-\d{2}-\d{2}/.exec(specTable('T-214').rows.find((one) => one.id === 'S-119')?.cells.join(' ') ?? '')
  if (found === null) throw new Error('table T-214 S-119 states no date')
  return found[0]
})()

const BEFORE_MIN_DATE = `${Number(IMPORT_MIN_DATE.slice(0, 4)) - 1}-12-31`

const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
  parentTaskUid: null,
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
  startDate: null,
  statusDate: null,
  minutesPerDay: null,
  minutesPerWeek: null,
  daysPerMonth: null,
  weekStartDay: null,
  calendarUid: null,
  defaultStartTime: null,
  defaultFinishTime: null,
  themeHue: 214,
  parentProgressToleranceDays: 1,
  uidHighWaterMark: 0,
  importSeq: 0,
  outlineBase: 1,
  sourceFormat: 'grs',
  carry: {},
  carryElements: [],
  ...part,
})

const documentOf = (tasks: readonly Task[], project: Project = projectOf()): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project,
      calendars: [],
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: tasks.map((one) => blankTaskVisual(one.uid)),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {},
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const SMALL = 1024

const verdictOf = (document: Document): ImportVerdict =>
  validateImportedDocument({ document, byteLength: SMALL, emptyRowTaskUids: [] } as ImportCandidate)

const rulesOf = (verdict: ImportVerdict): readonly string[] => (verdict.ok ? [] : verdict.refusals.map((one) => one.rule))

const IN_RANGE = { start: '2026-01-05', finish: '2026-01-09' } as const

describe('IV-10 -- a Task that finishes before it starts is refused under IV-10', () => {
  it(`${AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW} -- finish before start`, () => {
    const verdict = verdictOf(documentOf([taskOf({ uid: 1, name: 't1', start: '2026-01-09', finish: '2026-01-05' })]))
    expect(verdict.ok).toBe(false)
    const rules = rulesOf(verdict)
    expect(rules, JSON.stringify(rules)).toContain('IV-10')
    expect(rules, 'FR-012 is a requirement, not a row of T-220').not.toContain('FR-012')
    expect(rules, 'a refusal never falls to a row of T-233').not.toContain('RS-15')
    expect(!verdict.ok && verdict.refusals.find((one) => one.rule === 'IV-10')?.notice).toBe('NT-1')
  })

  it('a control: finish on the start day is accepted', () => {
    expect(verdictOf(documentOf([taskOf({ uid: 1, name: 't1', start: '2026-01-05', finish: '2026-01-05' })]))).toEqual({ ok: true })
  })
})

describe(`IV-14 -- a date before importMinDate (${IMPORT_MIN_DATE}) is refused under IV-14, not under the setting`, () => {
  it.each(['created', 'startDate', 'statusDate'] as const)(`${NO_FALL_TO_A_T_233_ROW} -- Project.%s`, (column) => {
    const verdict = verdictOf(documentOf([taskOf({ uid: 1, name: 't1', ...IN_RANGE })], projectOf({ [column]: `${BEFORE_MIN_DATE}T00:00:00` })))
    expect(verdict.ok).toBe(false)
    const rules = rulesOf(verdict)
    expect(rules, JSON.stringify(rules)).toContain('IV-14')
    expect(rules, 'S-119 is a setting, not a row of T-220').not.toContain('S-119')
    expect(rules, 'S-120 is a setting, not a row of T-220').not.toContain('S-120')
    expect(rules, 'a refusal never falls to a row of T-233').not.toContain('RS-15')
  })

  it('a Task date before importMinDate is refused under IV-14 as well', () => {
    const verdict = verdictOf(documentOf([taskOf({ uid: 1, name: 't1', start: BEFORE_MIN_DATE, finish: '2026-01-09' })]))
    expect(rulesOf(verdict)).toContain('IV-14')
    expect(rulesOf(verdict)).not.toContain('S-119')
  })

  it('a control: a Project date on importMinDate is accepted', () => {
    expect(verdictOf(documentOf([taskOf({ uid: 1, name: 't1', ...IN_RANGE })], projectOf({ created: `${IMPORT_MIN_DATE}T00:00:00` })))).toEqual({ ok: true })
  })
})

const AN_UNOWNED_IMPORT_REFUSAL_CARRIES_ITS_T_233_ROW =
  '本表のうち出典の欄がその上限か `FR-012` を名指す行を運ぶこと（MUST）'

describe('FR-076 (CR-719) -- a Task with no start is refused under the T-233 row whose 正 names FR-012', () => {
  it(AN_UNOWNED_IMPORT_REFUSAL_CARRIES_ITS_T_233_ROW, () => {
    expect(REQUIREMENTS).toContain(AN_UNOWNED_IMPORT_REFUSAL_CARRIES_ITS_T_233_ROW)
    const owner = specTable('T-233').rows.find((one) => (one.by['正'] ?? '').trim() === '`FR-012`')
    expect(owner, 'table T-233 has a row whose 正 is FR-012').toBeDefined()
    const rules = rulesOf(verdictOf(documentOf([taskOf({ uid: 1, name: 't1', finish: '2026-01-09' })])))
    expect(rules, JSON.stringify(rules)).toContain(owner?.id)
    expect(rules).not.toContain('FR-012')
    expect(rules).not.toContain('RS-15')
  })
})
