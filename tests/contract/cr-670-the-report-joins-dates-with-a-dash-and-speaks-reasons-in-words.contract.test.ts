// CR-670 spec-only cases: DT-5 / DT-6 date joins, DT-7 words (aspects, walls over DX-6), DX-10 late days, RW-4 glyph slots.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportFromWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import { searchPanelBoxOf, searchPanelElement } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  EVERY_ROW_SHOWN,
  type ScreenSession,
  type TableView,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { descendants, stage, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { taskGroupDocument, taskOf } from '../unit/cr-541-stage'
import { bare, specTable, unbroken } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const DT_5_JOIN = 'yyyy/mm/dd - yyyy/mm/dd —— 2 つの日を、半角空白 1 つ、`-`、半角空白 1 つでつなぐ'
const DT_5_MILESTONE = 'マイルストーンは 1 つの日'
const DT_6_OPEN = '進行中は「yyyy/mm/dd -」（終わりの日を空けたつなぎ）、未着手は空'
const DT_7_ASPECT = '`DX-3` の観点の語（辞書の、表 T-310 ・ 表 T-311 の行ごとに 1 つの語 —— `VS-6` は 表 T-311 の自分の告げる語で告げる）'
const DT_7_WALL = '表 T-316 の壁の語（辞書の、行ごとに 1 つの語）と原因の `Task` の名前 —— 壁の止まった範囲（`DX-6`）のどのタスクにも出す'
const DT_7_LATE = '`DG-4` は遅れの日数（`DX-10`）'
const DX_6_UIDS = '止まった範囲の件数と、範囲の `Task` の `uid` の列（原因を含む）'
const DX_10_DAYS = '表 T-021 の `PM-4` が成立する `Task` 1 件ごとに: `uid` と、表 T-021b の行と日数（稼働日）'
const RW_4_BLANK = '疑義・記載漏れと確定は絵の幅だけ空ける'

describe('CR-670 -- the cells these cases are driven by', () => {
  it('DT-5, DT-6, DT-7, DX-6, DX-10 and RW-4 still read this way', () => {
    expect(cellOf('T-347', 'DT-5', '書き方')).toContain(DT_5_JOIN)
    expect(cellOf('T-347', 'DT-5', '書き方')).toContain(DT_5_MILESTONE)
    expect(cellOf('T-347', 'DT-6', '書き方')).toContain(DT_6_OPEN)
    expect(cellOf('T-347', 'DT-7', '値')).toContain(DT_7_ASPECT)
    expect(cellOf('T-347', 'DT-7', '値')).toContain(DT_7_WALL)
    expect(cellOf('T-347', 'DT-7', '値')).toContain(DT_7_LATE)
    expect(cellOf('T-317', 'DX-6', '中身')).toContain(DX_6_UIDS)
    expect(cellOf('T-317', 'DX-10', '中身')).toContain(DX_10_DAYS)
    expect(unbroken(rowOf('T-346', 'RW-4').cells.join(' '))).toContain(RW_4_BLANK)
  })
})

type Word = { readonly ja: string; readonly en: string }
type Entry = Readonly<Record<string, unknown>> & { readonly text?: Word }
type Language = 'ja' | 'en'
const LANGUAGES: readonly Language[] = ['ja', 'en']

const DICTIONARY = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf-8'),
) as Record<string, readonly Entry[]>

const wordIn = (section: string, keyField: string, key: string): Word => {
  const found = DICTIONARY[section]?.find((entry) => entry[keyField] === key)
  if (found?.text === undefined) throw new Error(`the dictionary has no ${section}/${key}`)
  return found.text
}

// see T-310, T-311
const ASPECT_ROWS = [...specTable('T-310').rows, ...specTable('T-311').rows].map((one) => one.id).filter((id) => id !== 'VS-6')
// see T-316
const WALL_ROWS = specTable('T-316').rows.map((one) => one.id)

const ROW_ID = /\b(?:VC|VS|VO|DW|DG|DL|DX|DT)-\d+\b/

const NO_VIEW: TableView = { visibility: EVERY_ROW_SHOWN, columnFilters: [], sort: null }

const sessionIn = (language: Language) => ({ screen: { screenLanguage: language } }) as unknown as ScreenSession

const viewOf = (report: DelayDiagnosticsReport, schedule: Schedule, language: Language) => {
  const view = delayDiagnosticsReportFromWindow(sessionIn(language), OPENED_DELAY_DIAGNOSTICS_REPORT, NO_VIEW, report, schedule, {
    canvas: { x: 0, y: 40, width: 1000, height: 600 },
    textSizeStep: 0,
  })
  if (view === null) throw new Error('the report window is not drawn')
  return view
}

const columnAt = (id: string): number => specTable('T-347').rows.map((one) => one.id).indexOf(id)

const cellFor = (view: ReturnType<typeof viewOf>, uid: number, column: string): string => {
  const found = view.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === uid)
  if (found === undefined) throw new Error(`the report has no row for Task ${uid}`)
  return found.cells[columnAt(column)] ?? ''
}

const EMPTY_REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2027-06-04T00:00:00',
  findings: [],
  bottlenecks: [],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
}

const plainTask = (uid: number, name: string, extra: Record<string, unknown> = {}) => ({
  uid,
  name,
  start: '2027-05-03T08:00:00',
  finish: '2027-05-07T17:00:00',
  milestone: false,
  actualStart: null,
  actualFinish: null,
  percentComplete: 0,
  ...extra,
})

const scheduleOf = (tasks: readonly Record<string, unknown>[]): Schedule =>
  ({ tasks, resources: [], assignments: [] }) as unknown as Schedule

// see DT-5, DT-6
const slash = (iso: string): string => iso.slice(0, 10).replace(/-/g, '/')

describe(`CR-670 DT-5 / DT-6 "${DT_5_JOIN}"`, () => {
  const tasks = [
    plainTask(1, 'Range'),
    plainTask(2, 'Stone', { milestone: true, start: '2027-05-10T08:00:00', finish: '2027-05-10T08:00:00' }),
    plainTask(3, 'Going', { actualStart: '2027-05-03T08:00:00', percentComplete: 40 }),
    plainTask(4, 'Done', { actualStart: '2027-05-03T08:00:00', actualFinish: '2027-05-06T17:00:00', percentComplete: 100 }),
  ]
  const report: DelayDiagnosticsReport = {
    ...EMPTY_REPORT,
    markerStates: tasks.map((one) => ({ uid: one.uid, row: 'DG-4' as const })),
  }
  const pattern = DT_5_JOIN.split(' —— ')[0] ?? ''
  const range = (from: string, to: string): string => pattern.replace('yyyy/mm/dd', slash(from)).replace('yyyy/mm/dd', slash(to))
  const open = (/「(yyyy\/mm\/dd -)」/.exec(DT_6_OPEN)?.[1] ?? '').replace('yyyy/mm/dd', '')

  for (const language of LANGUAGES) {
    it(`${language}: a planned range is "from - to", a milestone one date`, () => {
      const view = viewOf(report, scheduleOf(tasks), language)
      expect(cellFor(view, 1, 'DT-5')).toBe(range('2027-05-03', '2027-05-07'))
      expect(cellFor(view, 2, 'DT-5')).toBe(slash('2027-05-10'))
    })

    it(`${language}: an in-progress actual is "yyyy/mm/dd -", a finished one "from - to", an unstarted one blank`, () => {
      const view = viewOf(report, scheduleOf(tasks), language)
      expect(open, 'premise: DT-6 spells the open join').toBe(' -')
      expect(cellFor(view, 3, 'DT-6')).toBe(`${slash('2027-05-03')}${open}`)
      expect(cellFor(view, 4, 'DT-6')).toBe(range('2027-05-03', '2027-05-06'))
      expect(cellFor(view, 1, 'DT-6')).toBe('')
    })
  }
})

describe(`CR-670 DT-7 "${DT_7_ASPECT}"`, () => {
  it('the dictionary holds one aspect word per T-310 / T-311 row but VS-6, and one wall word per T-316 row', () => {
    expect(ASPECT_ROWS.length, 'premise: the tables have rows').toBeGreaterThan(0)
    for (const row of ASPECT_ROWS) {
      const word = wordIn('delayReportAspects', 'rowId', row)
      expect(word.ja.trim(), `${row} ja`).not.toBe('')
      expect(word.en.trim(), `${row} en`).not.toBe('')
    }
    expect(DICTIONARY['delayReportAspects']?.some((one) => one['rowId'] === 'VS-6'), 'VS-6 speaks its own told words').toBe(false)
    for (const row of WALL_ROWS) expect(wordIn('delayReportWalls', 'rowId', row).ja.trim(), row).not.toBe('')
  })

  const tasks = ASPECT_ROWS.map((row, index) => plainTask(100 + index, `Task ${row}`))
  const findings: DelayDiagnosticsReport['findings'] = ASPECT_ROWS.map((row, index) => ({
    row,
    kind: row.startsWith('VC') ? 'contradiction' : 'suspicion',
    layer: 1,
    uid: 100 + index,
    name: `Task ${row}`,
    values: {},
    proposedActualFinish: null,
  })) as unknown as DelayDiagnosticsReport['findings']
  const report: DelayDiagnosticsReport = {
    ...EMPTY_REPORT,
    findings,
    markerStates: findings.filter((one) => one.row.startsWith('VC')).map((one) => ({ uid: one.uid, row: 'DG-1' as const })),
  }

  for (const language of LANGUAGES) {
    it(`${language}: every T-310 / T-311 finding but VS-6 prints its aspect word and never a row id`, () => {
      const view = viewOf(report, scheduleOf(tasks), language)
      ASPECT_ROWS.forEach((row, index) => {
        const cell = cellFor(view, 100 + index, 'DT-7')
        expect(cell, `${row}`).toContain(wordIn('delayReportAspects', 'rowId', row)[language])
        expect(cell, `${row} prints no row id`).not.toMatch(ROW_ID)
      })
    })
  }
})

const day = (month: number, date: number, hour: number): string =>
  `2027-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`
const S = (month: number, date: number): string => day(month, date, 8)
const F = (month: number, date: number): string => day(month, date, 17)

// see AT-46
const FS = 1

const after = (uid: number): Record<string, unknown> => ({
  predecessorUid: uid,
  linkType: FS,
  lag: 0,
  lagFormat: 7,
  carry: {},
  carryElements: [],
})

function flatDocument(statusDate: string, tasks: readonly Record<string, unknown>[]): Document {
  const raw = taskGroupDocument([{ id: 'r0', parentId: null }])
  raw.schedule.project.statusDate = statusDate
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.tasks = tasks
  raw.schedule.taskGroupMembers = tasks.map((task) => ({ taskUid: task['uid'], groupId: 'r0' }))
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

const diagnose = (document: Document): DelayDiagnosticsReport =>
  scheduleEntry.diagnoseDelay(document, scheduleEntry.workingCalendarOf(document.schedule))

const STATUS = F(5, 21)
const CAUSE = 401
const NEXT = 402
const LAST = 403
const CAUSE_NAME = 'Cause with a finish and no start'

// WHY: CAUSE carries a T-310 contradiction (an actual finish with no actual start); NEXT and LAST hang below it by FS.
const WALLED = flatDocument(STATUS, [
  taskOf(CAUSE, { name: CAUSE_NAME, start: S(5, 3), finish: F(5, 7), actualFinish: F(5, 7), percentComplete: 100 }),
  taskOf(NEXT, { name: 'Next', start: S(5, 10), finish: F(5, 14), dependencies: [after(CAUSE)] }),
  taskOf(LAST, { name: 'Last', start: S(5, 17), finish: F(5, 20), dependencies: [after(NEXT)] }),
])

describe(`CR-670 DX-6 / DT-7 "${DT_7_WALL}"`, () => {
  const report = diagnose(WALLED)

  it('DX-6: the wall carries the uids it stopped, the cause among them', () => {
    const wall = report.walls.find((one) => one.causeUid === CAUSE)
    expect(wall?.row, 'premise: a contradiction makes a DW-1 wall').toBe('DW-1')
    expect([...(wall?.stoppedUids ?? [])].sort((a, b) => a - b)).toEqual([CAUSE, NEXT, LAST])
    expect(wall?.stoppedCount).toBe(3)
  })

  for (const language of LANGUAGES) {
    it(`${language}: every row the wall stopped prints the wall word and the cause's name`, () => {
      const view = viewOf(report, WALLED.schedule, language)
      const wallWord = wordIn('delayReportWalls', 'rowId', 'DW-1')[language]
      for (const uid of [CAUSE, NEXT, LAST]) {
        const cell = cellFor(view, uid, 'DT-7')
        expect(cell, `Task ${uid}`).toContain(wallWord)
        expect(cell, `Task ${uid}`).toContain(CAUSE_NAME)
        expect(cell, `Task ${uid} prints no row id`).not.toMatch(ROW_ID)
      }
    })
  }
})

const EARLY = 501
const LATER = 502
const DAYS_BETWEEN = 5

// WHY: two unstarted Tasks past their start (DL-2), one working week apart, nothing linking them.
const LATE = flatDocument(STATUS, [
  taskOf(EARLY, { name: 'Early', start: S(5, 3), finish: F(5, 28) }),
  taskOf(LATER, { name: 'Later', start: S(5, 10), finish: F(5, 28) }),
])

describe(`CR-670 DX-10 "${DX_10_DAYS}"`, () => {
  const report = diagnose(LATE)

  it('each PM-4 Task has one lateDays entry with its T-021b row and a count of working days', () => {
    const early = report.lateDays.find((one) => one.uid === EARLY)
    const later = report.lateDays.find((one) => one.uid === LATER)
    expect(early?.row).toBe('DL-2')
    expect(later?.row).toBe('DL-2')
    expect(Number.isInteger(early?.days)).toBe(true)
    expect(later?.days ?? 0).toBeGreaterThan(0)
    expect((early?.days ?? 0) - (later?.days ?? 0), 'one working week apart').toBe(DAYS_BETWEEN)
  })

  for (const language of LANGUAGES) {
    it(`${language}: a DG-4 row tells its days through the dictionary's late pattern`, () => {
      const handed: DelayDiagnosticsReport = {
        ...EMPTY_REPORT,
        markerStates: [{ uid: EARLY, row: 'DG-4' }],
        lateDays: [{ uid: EARLY, row: 'DL-2', days: 7 }],
      }
      const view = viewOf(handed, LATE.schedule, language)
      const pattern = (DICTIONARY['delayReportReasons']?.find((one) => one['part'] === 'late')?.text as Word)[language]
      expect(cellFor(view, EARLY, 'DT-7')).toBe(pattern.replace('{days}', '7'))
    })
  }
})

describe(`CR-670 RW-4 "${RW_4_BLANK}"`, () => {
  const tasks = [plainTask(1, 'One')]
  const report: DelayDiagnosticsReport = { ...EMPTY_REPORT, markerStates: [{ uid: 1, row: 'DG-4' }] }

  it('the status items carry a picture slot (blank for the doubtful and the settled); the base date and not-analyzed items carry none', () => {
    const summary = viewOf(report, scheduleOf(tasks), 'ja').summary
    const first = summary[0]
    const last = summary[summary.length - 1]
    expect(first?.status ?? null).toBeNull()
    expect(last?.status ?? null).toBeNull()
    expect(first !== undefined && 'glyph' in first && first.glyph !== undefined, 'base date: no picture slot').toBe(false)
    expect(last !== undefined && 'glyph' in last && last.glyph !== undefined, 'not analyzed: no picture slot').toBe(false)
    const statuses = summary.slice(1, -1)
    expect(statuses.length).toBe(6)
    for (const one of statuses) {
      if (one.status === 'doubtful' || one.status === 'settled') expect(one.glyph, `${one.status}`).toBeNull()
      else expect(one.glyph ?? null, `${String(one.status)}`).not.toBeNull()
    }
  })

  it('drawn: every status item leads with a 1em box (empty for the doubtful and the settled); the two other items are text only', () => {
    const view = viewOf(report, scheduleOf(tasks), 'ja')
    const built = stage()
    const box = searchPanelBoxOf(view as never, { width: 0.5, height: 0.5 })
    const panel = searchPanelElement(built.host, view as never, { box, fontPx: 16 }, new Map<string, HTMLElement>()) as unknown as FakeElement
    const all = descendants(panel)
    for (const item of view.summary) {
      const drawn = all.find((one) => one.tagName === 'SPAN' && one.textContent === item.text && one.children.length <= 1)
      expect(drawn, `the summary item "${item.text}" is drawn`).toBeDefined()
      const lead = drawn?.children[0]
      if (item.status === null) {
        expect(lead, `"${item.text}" has no picture slot`).toBeUndefined()
        continue
      }
      expect(lead, `"${item.text}" leads with a picture slot`).toBeDefined()
      expect(styleMap(lead as FakeElement).get('width')).toBe('1em')
      if (item.status === 'doubtful' || item.status === 'settled') {
        expect(lead?.children.length ?? 0, `${item.status}: the slot is empty`).toBe(0)
        expect(bare(lead?.textContent ?? ''), `${item.status}: the slot is empty`).toBe('')
      }
    }
  })
})
