// CR-796 slice 4b: the AI reads the Delay Diagnostics Report and the Resource List in pages (AM-28, AV-17..AV-20, AM-19, T-347, T-371).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { agentApiMembers, type AgentApiWiring } from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog, type DialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { specTable, unbroken } from './spec-table'

type Loose = Record<string, unknown>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Loose & { readonly schedule: Loose; readonly documentSettings: Loose }

const templateTasks = TEMPLATE.schedule['tasks'] as readonly Loose[]
const templateGroups = TEMPLATE.schedule['taskGroups'] as readonly Loose[]
const templateResources = TEMPLATE.schedule['resources'] as readonly Loose[]
const templateAssignments = TEMPLATE.schedule['assignments'] as readonly Loose[]
const templateVisuals = TEMPLATE.schedule['taskVisuals'] as readonly Loose[]

const STAMP = {
  scheduleUpdatedAt: '2026-10-18T10:00:00Z',
  fileSavedAt: '2026-10-18T10:00:00Z',
  lastEditedBy: 'a person at the keyboard',
  settingsUpdatedAt: '2026-10-18T10:00:00Z',
}

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

interface TableColumn {
  readonly id: string
  readonly ja: string
  readonly en: string
  readonly kind: string
}
interface TableCell {
  readonly column: string
  readonly text: string
}
interface TableRow {
  readonly key: number | string
  readonly cells: readonly TableCell[]
}
interface TablePage {
  readonly ok: true
  readonly table: string
  readonly columns: readonly TableColumn[]
  readonly rows: readonly TableRow[]
  readonly total: number
  readonly offset: number
  readonly nextOffset: number | null
}

// WHY: readTableRows is new in this slice; typed loosely so the file compiles whether or not it has landed.
interface Reader {
  readTableRows(table: string, word?: string, filters?: 'asShown' | 'none', offset?: number, limit?: number): TablePage
  readStamp(): unknown
}

interface State {
  document: Document
  history: EditHistory<ChangeStep>
  dialogue: DialogueLog
}

const CHANGE_WATCHERS = emptyChangeWatchers()

const stateOf = (document: Document): State => ({ document, history: { done: [], undone: [] }, dialogue: emptyDialogueLog() })

function wiringFor(state: State): AgentApiWiring {
  const readSnapshot = (): AgentSnapshot => ({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
    document: state.document,
    documentAsWritten: state.document,
    selection: emptySelection(),
    dialogue: state.dialogue,
    frame: null,
    exportScene: null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    isQuestionAsked: false,
    isDeliveringNotices: false,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: '2026-10-18T08:30:00Z',
    localReadAt: '2026-10-18T09:00:00',
  })
  return {
    changeWatchers: CHANGE_WATCHERS,
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: {
      deliver: (document, hasUpdatedSchedule) =>
        notifyChangeWatchers(CHANGE_WATCHERS, { document, hasUpdatedSchedule, dialogue: state.dialogue }),
    },
    dialogueHolder: {
      read: () => state.dialogue,
      replace: (next) => {
        state.dialogue = next
      },
    },
    dialogueAudience: {
      deliver: (log) => {
        state.dialogue = log
      },
    },
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    writerName: 'cr-796 s4b reader',
    schemaVersion: String(TEMPLATE['schemaVersion']),
  }
}

const withStamp = (document: Loose): Document =>
  ({ ...document, documentStamp: { ...STAMP }, changeLog: [] }) as unknown as Document

const readerOf = (state: State): Reader => agentApiMembers(wiringFor(state)) as unknown as Reader

const GROUP = 'task-group-main'
const D = (day: string): string => `${day}T00:00:00`

const task = (uid: number, name: string, over: Loose = {}): Loose => ({
  ...(templateTasks[0] as Loose),
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name,
  start: D('2026-04-01'),
  finish: D('2026-04-05'),
  milestone: false,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  dependencies: [],
  ...over,
})

function scheduleOf(tasks: readonly Loose[], extra: Loose = {}): Loose {
  const uids = tasks.map((one) => one['uid'] as number)
  return {
    ...TEMPLATE.schedule,
    tasks,
    taskGroups: [
      { ...(templateGroups[0] as Loose), id: GROUP, parentId: null, order: 0, name: 'Main', derivedFromTaskUid: null, treeState: 'auto' },
    ],
    taskGroupMembers: uids.map((taskUid) => ({ taskUid, taskGroupId: GROUP })),
    resources: [],
    assignments: [],
    taskVisuals: uids.map((taskUid) => ({ ...(templateVisuals[0] as Loose), taskUid })),
    taskOrigins: uids.map((taskUid) => ({
      taskUid,
      sourceProjectId: null,
      sourceUid: taskUid,
      lastSeenImportSequence: 0,
      importSessionId: null,
    })),
    baselineTasks: [],
    commentBoxes: [],
    highlightBoxes: [],
    ...extra,
  }
}

const resource = (uid: number, name: string): Loose => ({ ...(templateResources[0] as Loose), uid, name })
const assignment = (uid: number, taskUid: number, resourceUid: number): Loose => ({
  ...(templateAssignments[0] as Loose),
  uid,
  taskUid,
  resourceUid,
})

type TableName = 'resourceList' | 'delayDiagnosticsReport'

// WHY: the saved view of one table (S-564..S-572) is written straight into documentSettings.tableViews, in the T-372 shape.
function withView(document: Document, table: TableName, view: Loose): Document {
  const settings = document.documentSettings as unknown as Loose & { tableViews: Loose }
  const views = settings.tableViews as Loose
  return {
    ...document,
    documentSettings: { ...settings, tableViews: { ...views, [table]: { ...(views[table] as Loose), ...view } } },
  } as unknown as Document
}

const columnFilter = (column: string, hiddenValues: string[]): Loose => ({ column, hiddenValues, fromDate: null, toDate: null })

// WHY: Ann has three tasks, Bob one, Cy none, and task 605 has no assignee.
function resourceDocument(): Document {
  const tasks = [601, 602, 603, 604, 605].map((uid, at) => task(uid, `Work ${uid}`, { start: D(`2026-04-0${at + 1}`) }))
  return withStamp({
    ...TEMPLATE,
    schedule: scheduleOf(tasks, {
      resources: [resource(301, 'Ann'), resource(302, 'Bob'), resource(303, 'Cy')],
      assignments: [assignment(801, 601, 301), assignment(802, 602, 301), assignment(803, 603, 301), assignment(804, 604, 302)],
    }),
  })
}

function manyResourcesDocument(count: number): Document {
  return withStamp({
    ...TEMPLATE,
    schedule: scheduleOf([task(601, 'Work 601')], {
      resources: Array.from({ length: count }, (_, at) => resource(2000 + at, `Resource ${String(at).padStart(3, '0')}`)),
    }),
  })
}

const STATUS_DATE = '2026-10-18T17:00:00'

// WHY: 701 and 702 are started and past their planned finish with no actual finish (DL-1); 703 is finished.
function delayedDocument(): Document {
  const tasks = [
    task(701, 'Late one', { start: D('2026-03-02'), finish: D('2026-03-06'), actualStart: D('2026-03-02'), percentComplete: 40 }),
    task(702, 'Late two', { start: D('2026-02-02'), finish: D('2026-02-06'), actualStart: D('2026-02-02'), percentComplete: 20 }),
    task(703, 'Done', {
      start: D('2026-03-02'),
      finish: D('2026-03-06'),
      actualStart: D('2026-03-02'),
      actualFinish: D('2026-03-06'),
      percentComplete: 100,
    }),
  ]
  return withStamp({
    ...TEMPLATE,
    schedule: scheduleOf(tasks, { project: { ...(TEMPLATE.schedule['project'] as Loose), statusDate: STATUS_DATE } }),
  })
}

const keysOf = (page: TablePage): Array<number | string> => page.rows.map((row) => row.key)
const cellOf = (row: TableRow, column: string): TableCell | undefined => row.cells.find((one) => one.column === column)

// WHY: a filter cell that says "same as above" repeats the row above it in the table.
function kindsOfTable(tableId: string): Map<string, string> {
  const rows = specTable(tableId).rows
  const filterCellOf = (at: number): string => {
    const cell = rows[at]!.by['フィルタ'] ?? ''
    return cell.trim().startsWith('同上') && at > 0 ? filterCellOf(at - 1) : cell
  }
  const kinds = new Map<string, string>()
  rows.forEach((row, at) => kinds.set(row.id, filterCellOf(at).includes('いつから') ? 'date' : 'text'))
  return kinds
}

const REPORT_IDS = specTable('T-347').rows.map((row) => row.id)
const LIST_IDS = specTable('T-371').rows.map((row) => row.id)

// see AM-28, AV-17, AV-18, AV-19, AV-20, T-371
describe('AM-28 readTableRows(resourceList) -- the Resource List table by the columns of table T-371', () => {
  const page = (): TablePage => readerOf(stateOf(resourceDocument())).readTableRows('resourceList', '')
  const rowOf = (uid: number): TableRow => page().rows.find((row) => row.key === uid)!

  it('premise: table T-371 has RQ-1 .. RQ-5', () => {
    expect(LIST_IDS).toEqual(['RQ-1', 'RQ-2', 'RQ-3', 'RQ-4', 'RQ-5'])
  })

  it('AV-18: the answer holds table, columns, rows, total, offset and nextOffset', () => {
    const read = page()
    expect(Object.keys(read).sort()).toEqual(['columns', 'nextOffset', 'offset', 'ok', 'rows', 'table', 'total'])
    expect(read.ok).toBe(true)
    expect(read.table).toBe('resourceList')
  })

  it('AV-17: each column has id, ja, en and kind, and the ids are the rows of table T-371 in order', () => {
    const { columns } = page()
    expect(columns.map((column) => column.id)).toEqual(LIST_IDS)
    for (const column of columns) {
      expect(Object.keys(column).sort()).toEqual(['en', 'id', 'ja', 'kind'])
      expect(column.ja.length, column.id).toBeGreaterThan(0)
      expect(column.en.length, column.id).toBeGreaterThan(0)
    }
  })

  it('AV-17: kind is "date" where the filter of the table row picks a span of days, "text" otherwise', () => {
    const kinds = kindsOfTable('T-371')
    for (const column of page().columns) expect(column.kind, column.id).toBe(kinds.get(column.id))
  })

  it('AV-19: every resource has a row keyed by its uid; the no-assignee row, if shown, is keyed "unassigned"', () => {
    const keys = keysOf(page())
    expect(keys).toEqual(expect.arrayContaining([301, 302, 303]))
    for (const key of keys) expect([301, 302, 303, 'unassigned']).toContain(key)
  })

  it('AV-20: every cell names a column of table T-371 and a resource row has a cell for each', () => {
    for (const row of page().rows) {
      for (const cell of row.cells) {
        expect(Object.keys(cell).sort()).toEqual(['column', 'text'])
        expect(LIST_IDS, String(row.key)).toContain(cell.column)
      }
    }
    for (const uid of [301, 302, 303]) {
      const row = rowOf(uid)
      // WHY: a resource with no tasks has an empty RQ-5 cell
      for (const id of LIST_IDS) expect(cellOf(row, id), `${uid} ${id}`).toBeDefined()
      for (const id of LIST_IDS.filter((one) => one !== 'RQ-5')) expect(cellOf(row, id)?.text.length, `${uid} ${id}`).toBeGreaterThan(0)
    }
  })

  it('RQ-2 is the resource name and RQ-4 is the number of its tasks', () => {
    expect(cellOf(rowOf(301), 'RQ-2')?.text).toBe('Ann')
    expect(cellOf(rowOf(302), 'RQ-2')?.text).toBe('Bob')
    expect(cellOf(rowOf(301), 'RQ-4')?.text).toBe('3')
    expect(cellOf(rowOf(302), 'RQ-4')?.text).toBe('1')
    expect(cellOf(rowOf(303), 'RQ-4')?.text).toBe('0')
  })

  it('RQ-5 holds the names of the resource tasks', () => {
    const text = cellOf(rowOf(301), 'RQ-5')?.text ?? ''
    for (const uid of [601, 602, 603]) expect(text).toContain(`Work ${uid}`)
  })

  it('the no-assignee row, if shown, counts the tasks nobody holds (RQ-4) and has no selection (RQ-3)', () => {
    const row = page().rows.find((one) => one.key === 'unassigned')
    if (row === undefined) return
    expect(cellOf(row, 'RQ-4')?.text).toBe('1')
    expect(cellOf(row, 'RQ-3')?.text ?? '').toBe('')
  })

  it('a short list: total is the row count, offset 0, nextOffset null', () => {
    const read = page()
    expect(read.total).toBe(read.rows.length)
    expect(read.offset).toBe(0)
    expect(read.nextOffset).toBeNull()
  })

  it('the word picks rows the way the table input does', () => {
    const read = readerOf(stateOf(resourceDocument())).readTableRows('resourceList', 'Bob')
    expect(keysOf(read)).toContain(302)
    expect(keysOf(read)).not.toContain(301)
    expect(read.total).toBe(read.rows.length)
  })

  it('writes nothing: the document, the stamp and the undo history stay as they were', () => {
    const state = stateOf(resourceDocument())
    const reader = readerOf(state)
    const document = state.document
    const stamp = JSON.stringify(reader.readStamp())
    reader.readTableRows('resourceList', '')
    expect(state.document).toBe(document)
    expect(JSON.stringify(reader.readStamp())).toBe(stamp)
    expect(state.history.done).toHaveLength(0)
  })
})

// see AM-28, AM-19, AV-17, AV-19, AV-20, T-347
describe('AM-28 readTableRows(delayDiagnosticsReport) -- the Delay Diagnostics Report table by the columns of table T-347', () => {
  const page = (): TablePage => readerOf(stateOf(delayedDocument())).readTableRows('delayDiagnosticsReport', '')
  const rowOf = (uid: number): TableRow => page().rows.find((row) => row.key === uid)!

  it('premise: table T-347 has DT-1 .. DT-9', () => {
    expect([...REPORT_IDS].sort()).toEqual(['DT-1', 'DT-2', 'DT-3', 'DT-4', 'DT-5', 'DT-6', 'DT-7', 'DT-8', 'DT-9'])
  })

  it('AV-18: the answer is named delayDiagnosticsReport and holds the seven keys', () => {
    const read = page()
    expect(Object.keys(read).sort()).toEqual(['columns', 'nextOffset', 'offset', 'ok', 'rows', 'table', 'total'])
    expect(read.ok).toBe(true)
    expect(read.table).toBe('delayDiagnosticsReport')
  })

  it('AV-17: the columns are the rows of table T-347 in order, each with id, ja, en and kind', () => {
    const { columns } = page()
    expect(columns.map((column) => column.id)).toEqual(REPORT_IDS)
    const kinds = kindsOfTable('T-347')
    for (const column of columns) {
      expect(Object.keys(column).sort()).toEqual(['en', 'id', 'ja', 'kind'])
      expect(column.ja.length, column.id).toBeGreaterThan(0)
      expect(column.en.length, column.id).toBeGreaterThan(0)
      expect(column.kind, column.id).toBe(kinds.get(column.id))
    }
  })

  it('AV-19: a delayed task is a row keyed by its task uid', () => {
    expect(keysOf(page())).toEqual(expect.arrayContaining([701, 702]))
  })

  it('AV-20: every cell names a column of table T-347', () => {
    for (const row of page().rows) {
      for (const cell of row.cells) {
        expect(Object.keys(cell).sort()).toEqual(['column', 'text'])
        expect(REPORT_IDS, String(row.key)).toContain(cell.column)
      }
    }
  })

  it('a delayed task row has non-empty status (DT-1), task (DT-4) and planned days (DT-5)', () => {
    const row = rowOf(701)
    for (const id of ['DT-1', 'DT-4', 'DT-5']) expect(cellOf(row, id)?.text.length, id).toBeGreaterThan(0)
    expect(cellOf(row, 'DT-4')?.text).toContain('Late one')
    expect(cellOf(row, 'DT-3')?.text).toContain('40')
  })

  it('total counts the rows after the filter; a short report has offset 0 and nextOffset null', () => {
    const read = page()
    expect(read.total).toBe(read.rows.length)
    expect(read.offset).toBe(0)
    expect(read.nextOffset).toBeNull()
  })

  it('AM-28: the diagnosis is made at the time of the call and writes nothing (stamp, document, history)', () => {
    const state = stateOf(delayedDocument())
    const reader = readerOf(state)
    const document = state.document
    const stamp = JSON.stringify(reader.readStamp())
    reader.readTableRows('delayDiagnosticsReport', '')
    reader.readTableRows('delayDiagnosticsReport', '', 'none')
    expect(state.document).toBe(document)
    expect(JSON.stringify(reader.readStamp())).toBe(stamp)
    expect(state.history.done).toHaveLength(0)
  })
})

// see AM-28, S-566, S-567, S-571, S-572, T-372
describe('AM-28 readTableRows(table, word, filters) -- asShown applies the saved column filters and sort of the table; none does not', () => {
  const listKeys = (document: Document, filters?: 'asShown' | 'none'): Array<number | string> =>
    keysOf(readerOf(stateOf(document)).readTableRows('resourceList', '', filters))
  const reportKeys = (document: Document, filters?: 'asShown' | 'none'): Array<number | string> =>
    keysOf(readerOf(stateOf(document)).readTableRows('delayDiagnosticsReport', '', filters))
  const before = (keys: ReadonlyArray<number | string>, first: number, second: number): boolean =>
    keys.indexOf(first) < keys.indexOf(second)

  it('S-571: a column filter on RQ-2 hiding "Bob" drops that row under asShown only', () => {
    const document = withView(resourceDocument(), 'resourceList', { columnFilters: [columnFilter('RQ-2', ['Bob'])] })
    expect(listKeys(document, 'asShown')).not.toContain(302)
    expect(listKeys(document, 'asShown')).toEqual(expect.arrayContaining([301, 303]))
    expect(listKeys(document, 'none')).toContain(302)
  })

  it('filters default to asShown', () => {
    const document = withView(resourceDocument(), 'resourceList', { columnFilters: [columnFilter('RQ-2', ['Bob'])] })
    expect(listKeys(document)).not.toContain(302)
  })

  it('AV-18: total counts the rows after the filter under asShown and before it under none', () => {
    const document = withView(resourceDocument(), 'resourceList', { columnFilters: [columnFilter('RQ-2', ['Bob'])] })
    const reader = readerOf(stateOf(document))
    expect(reader.readTableRows('resourceList', '', 'none').total).toBe(reader.readTableRows('resourceList', '', 'asShown').total + 1)
  })

  it('S-572: a sort on RQ-4 puts Ann (3 tasks) before Bob (1 task) descending and after him ascending, under asShown only', () => {
    const descending = withView(resourceDocument(), 'resourceList', { sort: { column: 'RQ-4', direction: 'descending' } })
    const ascending = withView(resourceDocument(), 'resourceList', { sort: { column: 'RQ-4', direction: 'ascending' } })
    expect(before(listKeys(descending, 'asShown'), 301, 302)).toBe(true)
    expect(before(listKeys(ascending, 'asShown'), 301, 302)).toBe(false)
    expect(listKeys(descending, 'none')).toEqual(listKeys(ascending, 'none'))
  })

  it('S-567: a sort on DT-5 (planned days) orders the report by the start day, under asShown only', () => {
    const ascending = withView(delayedDocument(), 'delayDiagnosticsReport', { sort: { column: 'DT-5', direction: 'ascending' } })
    const descending = withView(delayedDocument(), 'delayDiagnosticsReport', { sort: { column: 'DT-5', direction: 'descending' } })
    // WHY: task 702 starts on 2026-02-02 and task 701 on 2026-03-02.
    expect(before(reportKeys(ascending, 'asShown'), 702, 701)).toBe(true)
    expect(before(reportKeys(descending, 'asShown'), 702, 701)).toBe(false)
    expect(reportKeys(ascending, 'none')).toEqual(reportKeys(descending, 'none'))
  })

  it('S-566: a column filter on DT-4 hiding "Late two" drops that task from the report under asShown only', () => {
    const document = withView(delayedDocument(), 'delayDiagnosticsReport', { columnFilters: [columnFilter('DT-4', ['Late two'])] })
    expect(reportKeys(document, 'asShown')).not.toContain(702)
    expect(reportKeys(document, 'asShown')).toContain(701)
    expect(reportKeys(document, 'none')).toContain(702)
  })

  it('reading does not change the saved view of the table', () => {
    const document = withView(resourceDocument(), 'resourceList', {
      columnFilters: [columnFilter('RQ-2', ['Bob'])],
      sort: { column: 'RQ-4', direction: 'descending' },
    })
    const state = stateOf(document)
    const saved = JSON.stringify(state.document.documentSettings)
    const reader = readerOf(state)
    reader.readTableRows('resourceList', '', 'asShown')
    reader.readTableRows('resourceList', '', 'none')
    expect(JSON.stringify(state.document.documentSettings)).toBe(saved)
    expect(state.history.done).toHaveLength(0)
  })
})

// see AM-28, AV-18
describe('AM-28 readTableRows(table, word, filters, offset, limit) -- the rows come in pages of at most 100', () => {
  const reader = (): Reader => readerOf(stateOf(manyResourcesDocument(130)))

  it('more than 100 rows: 100 come back, offset 0, nextOffset 100, total is the whole count', () => {
    const read = reader().readTableRows('resourceList', '')
    expect(read.rows).toHaveLength(100)
    expect(read.offset).toBe(0)
    expect(read.nextOffset).toBe(100)
    expect(read.total).toBeGreaterThanOrEqual(130)
  })

  it('the last page returns the rest and nextOffset null', () => {
    const { total } = reader().readTableRows('resourceList', '')
    const read = reader().readTableRows('resourceList', '', 'asShown', 100, 100)
    expect(read.rows).toHaveLength(total - 100)
    expect(read.offset).toBe(100)
    expect(read.nextOffset).toBeNull()
    expect(read.total).toBe(total)
  })

  it('the two pages together are every row once', () => {
    const first = reader().readTableRows('resourceList', '')
    const second = reader().readTableRows('resourceList', '', 'asShown', 100, 100)
    const keys = [...keysOf(first), ...keysOf(second)]
    expect(keys).toHaveLength(first.total)
    expect(new Set(keys).size).toBe(first.total)
  })

  it('a limit above 100 is clamped to 100', () => {
    const read = reader().readTableRows('resourceList', '', 'asShown', 0, 500)
    expect(read.rows).toHaveLength(100)
    expect(read.nextOffset).toBe(100)
  })

  it('a smaller limit is kept: 10 rows, nextOffset 10', () => {
    const read = reader().readTableRows('resourceList', '', 'asShown', 0, 10)
    expect(read.rows).toHaveLength(10)
    expect(read.nextOffset).toBe(10)
  })

  it('a page that ends on the last row has nextOffset null', () => {
    const { total } = reader().readTableRows('resourceList', '')
    const read = reader().readTableRows('resourceList', '', 'asShown', total - 5, 5)
    expect(read.rows).toHaveLength(5)
    expect(read.nextOffset).toBeNull()
  })

  it('a short table fits one page: nextOffset null', () => {
    expect(readerOf(stateOf(manyResourcesDocument(3))).readTableRows('resourceList', '').nextOffset).toBeNull()
  })
})

// see AM-28, AV-4
describe('AM-28 readTableRows -- a table the call does not name is refused as malformedRequest', () => {
  const read = (table: string): unknown => (readerOf(stateOf(resourceDocument())) as unknown as { readTableRows(table: string): unknown }).readTableRows(table)

  it.each(['noSuchTable', '', 'resourcelist'])('table %j is returned as ok false with reason malformedRequest', (table) => {
    expect(read(table)).toMatchObject({ ok: false, refusal: { reason: 'malformedRequest' } })
  })

  it("'searchPanel' is not a table of this call -- one table, one road (AM-25)", () => {
    expect(read('searchPanel')).toMatchObject({ ok: false, refusal: { reason: 'malformedRequest' } })
  })
})

// see AM-28, AM-25
describe('AM-28 / AM-25 -- the Search Panel is read by readSearchRows, one table one road', () => {
  const text = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8'))
  const rowLine = text.split('\n').find((line) => line.startsWith('| AM-28 |')) ?? ''

  it('the printed AM-28 row says the Search Panel table is read by readSearchRows (AM-25)', () => {
    expect(rowLine.length).toBeGreaterThan(0)
    expect(rowLine).toContain('検索パネルの表は `readSearchRows`（`AM-25`）が読む')
  })

  it('readSearchRows still reads the Search Panel: tasks as rows with a taskUid', () => {
    const reader = readerOf(stateOf(resourceDocument())) as unknown as {
      readSearchRows(word: string): { taskRows: readonly { taskUid: number }[] }
    }
    expect(reader.readSearchRows('').taskRows.map((row) => row.taskUid)).toEqual(expect.arrayContaining([601, 605]))
  })
})
