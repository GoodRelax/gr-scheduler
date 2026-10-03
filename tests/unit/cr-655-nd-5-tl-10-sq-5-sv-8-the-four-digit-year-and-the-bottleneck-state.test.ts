// CR-655: the four-digit year across calendar years (ND-5, TL-10) and the search table's bottleneck state (SQ-5, SV-8).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { DisplayLanguage, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithFilterOpened,
} from '../../src/adapter/screen-renderer/search-panel'
import { columnValuesOf, filteredSearchRows } from '../../src/adapter/screen-renderer/search-table-filters'
import { deadlineHint } from '../../src/adapter/screen-renderer/tooltips'
import type { DrawnSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { dayOf } from '../../src/entity/document-model/schedule/calendar-day'
import { nameLabelOf, planDatesSpanYears } from '../../src/entity/layout-engine/schedule-layout/name-label'
import type { DayReader } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable, unbroken } from '../contract/spec-table'
import { rowDocument, taskOf } from './cr-541-stage'

type Loose = Record<string, unknown>

const cellOf = (table: string, id: string, heading: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(found.by[heading] ?? '')
}

const firstCellOf = (table: string, id: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(Object.values(found.by).join(' '))
}

const ND_5_FOUR_DIGITS = '年（西暦の 4 桁）、`/`、月、`/`、日 の順で書く'
const ND_5_NOT_TWO = '年を下 2 桁に縮めないのは'
const ND_5_NO_PADDING = '月と日は `ND-4` のとおり 0 で埋めない'
const TL_10_EXAMPLE = '暦年をまたぐ文書では `2026/6/3 (月)`'

const READER: DayReader = {
  day: (text) => dayOf(text),
  walk: () => {
    throw new Error('a name label never walks working days')
  },
}
const SETTINGS = { truncateUnits: 200 } as unknown as DrawnSettings

const at = (day: string): string => `${day}T08:00:00`
const until = (day: string): string => `${day}T17:00:00`

function scheduleOf(tasks: readonly Loose[]): scheduleEntry.Schedule {
  const raw = rowDocument([{ id: 'r0', parentId: null }])
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.tasks = tasks
  raw.schedule.taskGroupMembers = tasks.map((one) => ({ taskUid: one['uid'], groupId: 'r0' }))
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document.schedule
}

const labelOf = (schedule: scheduleEntry.Schedule, uid: number): string => {
  const task = schedule.tasks.find((one) => one.uid === uid)
  if (task === undefined) throw new Error(`no task ${uid}`)
  const named = nameLabelOf(task, READER, planDatesSpanYears(schedule, READER), SETTINGS)
  return `${named.name}${named.labelDates}`
}

describe('CR-655 ND-5 (table T-251) -- a document that crosses a calendar year writes the year in 4 digits', () => {
  it('ND-5 says: 年（西暦の 4 桁） / 下 2 桁に縮めない / 月と日は 0 で埋めない', () => {
    const nd5 = cellOf('T-251', 'ND-5', '定め') || firstCellOf('T-251', 'ND-5')
    expect(nd5).toContain(ND_5_FOUR_DIGITS)
    expect(nd5).toContain(ND_5_NOT_TWO)
    expect(nd5).toContain(ND_5_NO_PADDING)
    expect(nd5).not.toContain('下 2 桁、1 桁のときは 0 を詰めて')
  })

  it('ND-5: every date of a two-year document carries the 4-digit year, month and day unpadded', () => {
    const schedule = scheduleOf([
      taskOf(1, { name: 'Alpha', start: at('2025-12-29'), finish: until('2026-01-05') }),
      taskOf(2, { name: 'Beta', start: at('2026-04-06'), finish: until('2026-04-10') }),
      taskOf(3, { name: 'Gate', start: at('2026-06-03'), finish: at('2026-06-03'), milestone: true }),
    ])
    expect(labelOf(schedule, 1)).toBe('Alpha 2025/12/29 - 2026/1/5')
    expect(labelOf(schedule, 2), 'ND-5: a task inside one year still carries the year').toBe('Beta 2026/4/6 - 2026/4/10')
    expect(labelOf(schedule, 3)).toBe('Gate 2026/6/3')
  })

  it('ND-5: a one-year document still writes month/day only', () => {
    const schedule = scheduleOf([taskOf(1, { name: 'Alpha', start: at('2026-04-06'), finish: until('2026-04-10') })])
    expect(labelOf(schedule, 1)).toBe('Alpha 4/6 - 4/10')
  })
})

describe('CR-655 TL-10 (table T-348) -- the tooltip day follows ND-5', () => {
  it('TL-10 says: 暦年をまたぐ文書では `2026/6/3 (月)`', () => {
    expect(cellOf('T-348', 'TL-10', '定め') || firstCellOf('T-348', 'TL-10')).toContain(TL_10_EXAMPLE)
  })

  it('TL-10: a deadline day of a two-year document is written yyyy/m/d with the weekday', () => {
    const schedule = scheduleOf([
      taskOf(1, { name: 'Alpha', start: at('2025-12-29'), finish: until('2026-01-05'), deadline: until('2026-06-03') }),
    ])
    const task = schedule.tasks[0]
    if (task === undefined) throw new Error('premise: one task')
    const hint = deadlineHint(task, schedule, 'en')
    expect(hint).toContain('2026/6/3 (Wed)')
    expect(hint, 'TL-10: never the 2-digit year').not.toMatch(/(^|[^0-9])26\/6\/3/)
  })
})

const SV_8_ORDER =
  '状態の列（`SQ-5`）の昇順は ボトルネック → 未着手 → 進行中 → 完了 → 中断・再開予定あり → 中断・再開日未定、降順はその逆'
const SQ_5_WHILE_SHOWN = '遅延診断を出しているあいだ（表 T-206 の `S-445`）、表 T-315 の `DG-2` の条件を満たすタスクは、それに代えて「ボトルネック」と出す'
const SQ_5_NOT_SHOWN = '診断を出していないあいだは判じた結果が無いので出さず'

const FF = 0
const day2027 = (month: number, date: number, hour: number): string =>
  `2027-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`
const S = (month: number, date: number): string => day2027(month, date, 8)
const F = (month: number, date: number): string => day2027(month, date, 17)
const after = (uid: number, linkType: number): Loose => ({
  predecessorUid: uid,
  linkType,
  lag: 0,
  lagFormat: 7,
  carry: {},
  carryElements: [],
})

const LEAD = 300
const TRAIL = 301
const LATER = 302
const DONE = 303

function diagnosedDocument(): Document {
  const raw = rowDocument([{ id: 'r0', parentId: null }])
  raw.schedule.project.statusDate = F(5, 12)
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.tasks = [
    taskOf(LEAD, { name: 'Lead', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), percentComplete: 20 }),
    taskOf(TRAIL, {
      name: 'Trail', start: S(5, 3), finish: F(5, 7), dependencies: [after(LEAD, FF)], actualStart: S(5, 3), percentComplete: 20,
    }),
    taskOf(LATER, { name: 'Later', start: S(6, 7), finish: F(6, 11) }),
    taskOf(DONE, { name: 'Done', start: S(4, 5), finish: F(4, 9), actualStart: S(4, 5), actualFinish: F(4, 9), percentComplete: 100 }),
  ]
  raw.schedule.taskGroupMembers = (raw.schedule.tasks as readonly Loose[]).map((one) => ({ taskUid: one['uid'], groupId: 'r0' }))
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

const DOCUMENT = diagnosedDocument()
const SCHEDULE = DOCUMENT.schedule
const REPORT = scheduleEntry.diagnoseDelay(DOCUMENT, scheduleEntry.workingCalendarOf(SCHEDULE))
// see SQ-5, DG-2
const BOTTLENECKS: ReadonlySet<number> = new Set(REPORT.bottlenecks.map((one) => one.uid))

const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { readonly delayReportStatuses: readonly { readonly rowId: string; readonly text: Record<DisplayLanguage, string> }[] }
const DG_2_WORD = WORDS.delayReportStatuses.find((one) => one.rowId === 'DG-2')?.text

const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }
const step = (session: ScreenSession, type: string): ScreenSession =>
  advanceScreenSession(session, { type } as unknown as SessionEvent).state
function sessionIn(language: DisplayLanguage): ScreenSession {
  const shown = step(emptyScreenSession, 'searchEntryPressed')
  return { ...shown, screen: { ...shown.screen, screenLanguage: language, helpLanguage: language } } as unknown as ScreenSession
}
const TASK_PANEL: SearchPanelSession = { ...emptySearchPanelSession, table: 'tasks' }

function viewOf(language: DisplayLanguage, bottleneckUids?: ReadonlySet<number>): SearchPanelView {
  const view = searchPanelFromSession(sessionIn(language), TASK_PANEL, SCHEDULE, CANVAS, bottleneckUids)
  if (view === null) throw new Error('premise: a shown panel has a view')
  return view
}

const stateCellOf = (view: SearchPanelView, uid: number): string | undefined =>
  view.rows.find((row) => row.target.kind === 'task' && row.target.taskUid === uid)?.cells[4]

const uidsOf = (rows: readonly scheduleEntry.TaskSearchRow[]): readonly number[] => rows.map((row) => row.taskUid)

describe('CR-655 SQ-5 / SV-8 (tables T-331, T-330) -- the bottleneck in the search table', () => {
  it('SV-8 and SQ-5 say: ボトルネック → 未着手 → … / 診断を出しているあいだ DG-2 を満たすタスクは「ボトルネック」', () => {
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_ORDER)
    const sq5 = firstCellOf('T-331', 'SQ-5')
    expect(sq5).toContain(SQ_5_WHILE_SHOWN)
    expect(sq5).toContain(SQ_5_NOT_SHOWN)
    expect(sq5).toContain('表 T-315 の `DG-2` の語')
  })

  it('premise: the diagnosis names Lead, and only Lead, a bottleneck (T-315 DG-2)', () => {
    expect([...BOTTLENECKS]).toEqual([LEAD])
  })

  it('SQ-5: with the diagnosis shown, the DG-2 task reads the T-315 DG-2 word in both languages', () => {
    expect(DG_2_WORD?.ja).toBe('ボトルネック')
    expect(stateCellOf(viewOf('ja', BOTTLENECKS), LEAD)).toBe(DG_2_WORD?.ja)
    expect(stateCellOf(viewOf('en', BOTTLENECKS), LEAD)).toBe(DG_2_WORD?.en)
    expect(stateCellOf(viewOf('ja', BOTTLENECKS), TRAIL), 'SQ-5: a task outside DG-2 keeps its T-019a state').toBe('進行中')
  })

  it('SQ-5: with the diagnosis not shown, nothing reads ボトルネック and Lead keeps its T-019a state', () => {
    expect(stateCellOf(viewOf('ja'), LEAD)).toBe('進行中')
    expect(viewOf('ja').rows.map((row) => row.cells[4])).not.toContain(DG_2_WORD?.ja)
  })

  it('SV-8: ascending puts the bottleneck first, descending puts it last', () => {
    const rows = scheduleEntry.searchRowsOf(SCHEDULE, '', BOTTLENECKS)
    const up = filteredSearchRows(rows, TASK_PANEL.filters, { column: 'SQ-5', direction: 'ascending' })
    expect(uidsOf(up.taskRows)).toEqual([LEAD, LATER, TRAIL, DONE])
    const down = filteredSearchRows(rows, TASK_PANEL.filters, { column: 'SQ-5', direction: 'descending' })
    expect(uidsOf(down.taskRows)).toEqual([DONE, TRAIL, LATER, LEAD])
  })

  it('SV-7 / SV-8: the state filter lists the bottleneck first, and IC-126 hides it with the rest', () => {
    const rows = scheduleEntry.searchRowsOf(SCHEDULE, '', BOTTLENECKS)
    expect(columnValuesOf(rows, 'SQ-5')[0]).toBe('bottleneck')
    const opened = searchPanelWithFilterOpened(sessionIn('ja'), TASK_PANEL, 'SQ-5')
    if (opened === null) throw new Error('premise: the SQ-5 filter opens')
    const hidden = searchPanelAfterFilterEntry(sessionIn('ja'), opened, 'IC-126', SCHEDULE, BOTTLENECKS)
    if (hidden === null) throw new Error('premise: IC-126 answers on an open values filter')
    const view = searchPanelFromSession(sessionIn('ja'), hidden, SCHEDULE, CANVAS, BOTTLENECKS)
    expect(view?.rows ?? null).toEqual([])
  })
})
