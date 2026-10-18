// CR-796 slice 4: the AI reads in small pieces (AG-2, AG-6, AM-3, AM-25, AV-3, AV-14, AV-16, AV-17).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  agentApiMembers,
  type AgentApiWiring,
  type AgentSearchPage,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog, type DialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { searchRowsOf } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { specTable, unbroken } from './spec-table'

type Loose = Record<string, unknown>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Loose & { readonly schedule: Loose; readonly documentSettings: Loose }

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

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

// WHY: the calls under test take optional trailing arguments in the spec; typed loosely so the file compiles either way.
interface Reader {
  readDocument(includeCarry?: boolean, taskUids?: readonly number[]): Document
  readSearchRows(word: string, filters?: 'asShown' | 'none', offset?: number, limit?: number): AgentSearchPage
}

interface State {
  document: Document
  history: EditHistory<ChangeStep>
  dialogue: DialogueLog
}

const CHANGE_WATCHERS = emptyChangeWatchers()

function stateOf(document: Document): State {
  return { document, history: { done: [], undone: [] }, dialogue: emptyDialogueLog() }
}

function wiringFor(state: State, writerName: string): AgentApiWiring {
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
    writerName,
    schemaVersion: String(TEMPLATE['schemaVersion']),
  }
}

const withStamp = (document: Loose): Document =>
  ({ ...document, documentStamp: { ...STAMP }, changeLog: [] }) as unknown as Document

// WHY: the whole template (1000 tasks, 4970 carry keys) is the document the spec measured 1,383,668 characters on.
const wholeTemplate = (): Document => withStamp(structuredClone(TEMPLATE))

const apiOf = (state: State, writerName = 'cr-796 s4 reader') => agentApiMembers(wiringFor(state, writerName))
const readerOf = (state: State): Reader => apiOf(state) as unknown as Reader

// WHY: the carry keys can sit at any depth, so the check walks the whole value.
function hasKeyDeep(value: unknown, keys: readonly string[]): boolean {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((one) => hasKeyDeep(one, keys))
  const object = value as Loose
  return Object.keys(object).some((key) => keys.includes(key) || hasKeyDeep(object[key], keys))
}

const CARRY_KEYS = ['carry', 'carryElements']

const task = (uid: number, name: string, start: string, finish: string, percentComplete: number | null): Loose => ({
  ...(templateTasks[0] as Loose),
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name,
  start,
  finish,
  milestone: false,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete,
  dependencies: [],
})

const GROUP = 'task-group-main'
const D = (day: string): string => `${day}T00:00:00`

function scheduleOf(tasks: readonly Loose[], extra: Loose = {}): Loose {
  const uids = tasks.map((one) => one['uid'] as number)
  return {
    ...TEMPLATE.schedule,
    tasks,
    taskGroups: [
      { ...(templateGroups[0] as Loose), id: GROUP, parentId: null, order: 0, name: 'Main', derivedFromTaskUid: null, treeState: 'auto' },
      { ...(templateGroups[0] as Loose), id: 'task-group-aside', parentId: null, order: 1, name: 'Aside', derivedFromTaskUid: null, treeState: 'auto' },
    ],
    taskGroupMembers: uids.map((taskUid) => ({ taskUid, taskGroupId: GROUP })),
    resources: [
      { ...(templateResources[0] as Loose), uid: 301, name: 'Ann' },
      { ...(templateResources[0] as Loose), uid: 302, name: 'Bob' },
    ],
    assignments: uids.map((taskUid, at) => ({
      ...(templateAssignments[0] as Loose),
      uid: 400 + at,
      taskUid,
      resourceUid: at % 2 === 0 ? 301 : 302,
    })),
    taskVisuals: uids.map((taskUid) => ({ ...(templateVisuals[0] as Loose), taskUid })),
    taskOrigins: uids.map((taskUid) => ({
      taskUid,
      sourceProjectId: null,
      sourceUid: taskUid,
      lastSeenImportSequence: 0,
      importSessionId: null,
    })),
    baselineTasks: uids.map((uid) => ({ uid, name: `base ${uid}`, start: D('2026-01-01'), finish: D('2026-01-02'), milestone: false })),
    commentBoxes: [
      {
        id: 'c-1',
        leaderShapeKind: null,
        text: 'a note',
        anchorDate: D('2026-05-02'),
        anchorTaskGroupId: GROUP,
        bodyOffsetPx: null,
        strokeColor: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
        textColor: null,
      },
    ],
    highlightBoxes: [],
    ...extra,
  }
}

// WHY: four tasks whose default order is the start-day order.
function searchedDocument(searchPanel: Loose = {}): Document {
  const tasks = [
    task(201, 'Alpha', D('2026-04-01'), D('2026-04-05'), 30),
    task(202, 'Bravo', D('2026-05-01'), D('2026-05-05'), 10),
    task(203, 'Charlie', D('2026-06-01'), D('2026-06-05'), 50),
    task(204, 'Delta', D('2026-07-01'), D('2026-07-05'), 20),
  ]
  const settings = TEMPLATE.documentSettings as Loose & { tableViews: Loose & { searchPanel: Loose } }
  return withStamp({
    ...TEMPLATE,
    schedule: scheduleOf(tasks),
    documentSettings: {
      ...settings,
      tableViews: { ...settings.tableViews, searchPanel: { ...settings.tableViews.searchPanel, ...searchPanel } },
    },
  })
}

const uidsOf = (page: AgentSearchPage): number[] => page.taskRows.map((one) => one.taskUid)
const filter = (column: string, hiddenValues: string[], fromDate: string | null = null, toDate: string | null = null): Loose => ({
  column,
  hiddenValues,
  fromDate,
  toDate,
})

// see AM-3, AG-2
describe('AM-3 readDocument(includeCarry, taskUids) -- the carry fields are left out unless asked for', () => {
  it('premise: the starting document holds carry / carryElements keys', () => {
    expect(hasKeyDeep(wholeTemplate(), CARRY_KEYS)).toBe(true)
  })

  it('readDocument() holds no carry / carryElements key at any depth', () => {
    const state = stateOf(wholeTemplate())
    const read = readerOf(state).readDocument()
    expect(hasKeyDeep(read, CARRY_KEYS)).toBe(false)
    expect((read.schedule.tasks as readonly unknown[]).length).toBe(templateTasks.length)
  })

  it('readDocument(false) holds none either, and leaves the held document itself whole', () => {
    const state = stateOf(wholeTemplate())
    expect(hasKeyDeep(readerOf(state).readDocument(false), CARRY_KEYS)).toBe(false)
    expect(hasKeyDeep(state.document, CARRY_KEYS)).toBe(true)
  })

  it('readDocument(true) keeps the carry fields', () => {
    const read = readerOf(stateOf(wholeTemplate())).readDocument(true)
    expect(hasKeyDeep(read, CARRY_KEYS)).toBe(true)
    expect(hasKeyDeep((read.schedule.tasks as readonly unknown[])[0], CARRY_KEYS)).toBe(true)
  })

  // WHY: AM-3 gives 84% for a document opened from MS Project XML; the GRS startup template holds few carry fields,
  // so no size ratio is asserted here -- only that no carry key remains and the text is strictly shorter.
  it('without the carry fields the text is shorter than with them and no carry key remains (AM-3)', () => {
    const reader = readerOf(stateOf(wholeTemplate()))
    const without = JSON.stringify(reader.readDocument(false))
    const withCarry = JSON.stringify(reader.readDocument(true))
    expect(hasKeyDeep(JSON.parse(without), CARRY_KEYS)).toBe(false)
    expect(without.length).toBeLessThan(withCarry.length)
  })
})

// see AM-3
describe('AM-3 readDocument(false, taskUids) -- the six groups that belong to a task keep only the tasks asked for', () => {
  const build = () =>
    stateOf(
      withStamp({
        ...TEMPLATE,
        schedule: scheduleOf([
          task(101, 'One', D('2026-04-01'), D('2026-04-02'), 0),
          task(102, 'Two', D('2026-04-03'), D('2026-04-04'), 0),
          task(103, 'Three', D('2026-04-05'), D('2026-04-06'), 0),
        ]),
      }),
    )

  const uidsIn = (rows: unknown, key: string): number[] => (rows as readonly Loose[]).map((one) => one[key] as number)

  it('keeps only task 102 in tasks, assignments, taskVisuals, taskGroupMembers, taskOrigins and baselineTasks', () => {
    const read = readerOf(build()).readDocument(false, [102])
    const schedule = read.schedule as unknown as Loose
    expect(uidsIn(schedule['tasks'], 'uid')).toEqual([102])
    expect(uidsIn(schedule['assignments'], 'taskUid')).toEqual([102])
    expect(uidsIn(schedule['taskVisuals'], 'taskUid')).toEqual([102])
    expect(uidsIn(schedule['taskGroupMembers'], 'taskUid')).toEqual([102])
    expect(uidsIn(schedule['taskOrigins'], 'taskUid')).toEqual([102])
    expect(uidsIn(schedule['baselineTasks'], 'uid')).toEqual([102])
  })

  it('keeps resources and taskGroups whole', () => {
    const state = build()
    const read = readerOf(state).readDocument(false, [102])
    expect(read.schedule.resources).toHaveLength((state.document.schedule.resources as readonly unknown[]).length)
    expect(read.schedule.taskGroups).toHaveLength((state.document.schedule.taskGroups as readonly unknown[]).length)
  })

  it('keeps two tasks when two are asked for, in the document order', () => {
    const read = readerOf(build()).readDocument(false, [103, 101])
    expect(uidsIn(read.schedule.tasks, 'uid')).toEqual([101, 103])
    expect(uidsIn((read.schedule as unknown as Loose)['assignments'], 'taskUid')).toEqual([101, 103])
  })

  it('an empty list keeps every task (and every group of rows)', () => {
    const state = build()
    const read = readerOf(state).readDocument(false, [])
    const schedule = read.schedule as unknown as Loose
    for (const key of ['tasks', 'assignments', 'taskVisuals', 'taskGroupMembers', 'taskOrigins', 'baselineTasks']) {
      expect(schedule[key], key).toHaveLength((state.document.schedule as unknown as Loose)[key] === undefined ? -1 : ((state.document.schedule as unknown as Loose)[key] as unknown[]).length)
    }
    expect(uidsIn(schedule['tasks'], 'uid')).toEqual([101, 102, 103])
  })

  it('a list with includeCarry true keeps the carry fields of the task asked for', () => {
    const read = readerOf(build()).readDocument(true, [102])
    expect(uidsIn(read.schedule.tasks, 'uid')).toEqual([102])
    expect(hasKeyDeep((read.schedule.tasks as readonly unknown[])[0], CARRY_KEYS)).toBe(true)
  })

  it('a list with includeCarry false leaves the carry fields out of the task asked for', () => {
    const read = readerOf(build()).readDocument(false, [102])
    expect(hasKeyDeep(read, CARRY_KEYS)).toBe(false)
  })
})

// see AM-25, AV-16
describe('AM-25 readSearchRows -- the answer is AgentSearchPage and the task rows come in pages of at most 100', () => {
  const manyTasks = (count: number): State =>
    stateOf(
      withStamp({
        ...TEMPLATE,
        schedule: scheduleOf(
          Array.from({ length: count }, (_, at) => {
            const start = new Date(Date.UTC(2026, 4, 1 + at)).toISOString().slice(0, 10)
            const finish = new Date(Date.UTC(2026, 4, 2 + at)).toISOString().slice(0, 10)
            return task(1000 + at, `Task ${at}`, D(start), D(finish), null)
          }),
        ),
      }),
    )

  it('AV-16: the answer holds taskRows, commentBoxRows, columns, taskTotal, offset and nextOffset', () => {
    const page = readerOf(searchState()).readSearchRows('')
    expect(Object.keys(page).sort()).toEqual(['columns', 'commentBoxRows', 'nextOffset', 'offset', 'taskRows', 'taskTotal'])
  })

  it('a short list: every row, offset 0, nextOffset null, taskTotal the row count', () => {
    const page = readerOf(searchState()).readSearchRows('')
    expect(uidsOf(page)).toEqual([201, 202, 203, 204])
    expect(page.taskTotal).toBe(4)
    expect(page.offset).toBe(0)
    expect(page.nextOffset).toBeNull()
  })

  it('the rows are the rows of the two tables searchRowsOf gives, and the comment box rows are not paged', () => {
    const state = searchState()
    const page = readerOf(state).readSearchRows('', 'none')
    const expected = searchRowsOf(state.document.schedule, '')
    expect(page.taskRows).toEqual(expected.taskRows)
    expect(page.commentBoxRows).toEqual(expected.commentBoxRows)
    expect(page.commentBoxRows).toHaveLength(1)
  })

  it('more than 100 matching tasks: 100 come back, nextOffset 100, taskTotal is the whole count', () => {
    const page = readerOf(manyTasks(130)).readSearchRows('')
    expect(page.taskRows).toHaveLength(100)
    expect(page.taskTotal).toBe(130)
    expect(page.offset).toBe(0)
    expect(page.nextOffset).toBe(100)
    expect(uidsOf(page)).toEqual(Array.from({ length: 100 }, (_, at) => 1000 + at))
  })

  it("readSearchRows('', 'asShown', 100, 100) returns the rest and nextOffset null", () => {
    const page = readerOf(manyTasks(130)).readSearchRows('', 'asShown', 100, 100)
    expect(page.taskRows).toHaveLength(30)
    expect(page.offset).toBe(100)
    expect(page.nextOffset).toBeNull()
    expect(page.taskTotal).toBe(130)
    expect(uidsOf(page)).toEqual(Array.from({ length: 30 }, (_, at) => 1100 + at))
  })

  it('the two pages together are every task once', () => {
    const reader = readerOf(manyTasks(130))
    const all = [...uidsOf(reader.readSearchRows('')), ...uidsOf(reader.readSearchRows('', 'asShown', 100, 100))]
    expect(all).toEqual(Array.from({ length: 130 }, (_, at) => 1000 + at))
  })

  it('a limit above 100 is clamped to 100', () => {
    const page = readerOf(manyTasks(130)).readSearchRows('', 'asShown', 0, 500)
    expect(page.taskRows).toHaveLength(100)
    expect(page.nextOffset).toBe(100)
  })

  it('a smaller limit is kept: 10 rows, nextOffset 10', () => {
    const page = readerOf(manyTasks(130)).readSearchRows('', 'asShown', 0, 10)
    expect(page.taskRows).toHaveLength(10)
    expect(page.nextOffset).toBe(10)
  })

  it('exactly 100 tasks fit one page: nextOffset null', () => {
    const page = readerOf(manyTasks(100)).readSearchRows('')
    expect(page.taskRows).toHaveLength(100)
    expect(page.nextOffset).toBeNull()
  })

  it('writes nothing: the document and the undo history stay as they were', () => {
    const state = manyTasks(5)
    const before = state.document
    readerOf(state).readSearchRows('task')
    expect(state.document).toBe(before)
    expect(state.history.done).toHaveLength(0)
  })
})

const searchState = (searchPanel: Loose = {}): State => stateOf(searchedDocument(searchPanel))

// see AM-25, S-562, S-563, T-372
describe('AM-25 readSearchRows(word, filters) -- asShown applies the column filters and the sort of the search panel; none does not', () => {
  it('no filter and no sort: asShown and none give the same rows in the default order (the start day)', () => {
    const reader = readerOf(searchState())
    expect(uidsOf(reader.readSearchRows('', 'asShown'))).toEqual([201, 202, 203, 204])
    expect(uidsOf(reader.readSearchRows('', 'none'))).toEqual([201, 202, 203, 204])
  })

  it('filters default to asShown', () => {
    const reader = readerOf(searchState({ columnFilters: [filter('SQ-1', ['Bravo'])] }))
    expect(uidsOf(reader.readSearchRows(''))).toEqual([201, 203, 204])
  })

  it('S-562: a text column filter (SQ-1 hiding "Bravo") drops that row under asShown only', () => {
    const reader = readerOf(searchState({ columnFilters: [filter('SQ-1', ['Bravo'])] }))
    expect(uidsOf(reader.readSearchRows('', 'asShown'))).toEqual([201, 203, 204])
    expect(uidsOf(reader.readSearchRows('', 'none'))).toEqual([201, 202, 203, 204])
  })

  it('AV-16: taskTotal counts the rows after the filter under asShown and before it under none', () => {
    const reader = readerOf(searchState({ columnFilters: [filter('SQ-1', ['Bravo'])] }))
    expect(reader.readSearchRows('', 'asShown').taskTotal).toBe(3)
    expect(reader.readSearchRows('', 'none').taskTotal).toBe(4)
  })

  it('T-372: a date column filter (SQ-3 from / to) keeps the rows between the days under asShown only', () => {
    const reader = readerOf(
      searchState({ columnFilters: [filter('SQ-3', [], D('2026-05-15'), D('2026-06-15'))] }),
    )
    expect(uidsOf(reader.readSearchRows('', 'asShown'))).toEqual([203])
    expect(uidsOf(reader.readSearchRows('', 'none'))).toEqual([201, 202, 203, 204])
  })

  it('T-372: a date column filter with only fromDate keeps the rows from that day on', () => {
    const reader = readerOf(searchState({ columnFilters: [filter('SQ-3', [], D('2026-05-15'), null)] }))
    expect(uidsOf(reader.readSearchRows('', 'asShown'))).toEqual([203, 204])
  })

  it('S-563: a sort (SQ-11 descending) reorders the rows under asShown only', () => {
    const reader = readerOf(searchState({ sort: { column: 'SQ-11', direction: 'descending' } }))
    expect(uidsOf(reader.readSearchRows('', 'asShown'))).toEqual([203, 201, 204, 202])
    expect(uidsOf(reader.readSearchRows('', 'none'))).toEqual([201, 202, 203, 204])
  })

  it('S-563: a sort (SQ-11 ascending) is the reverse of the descending one', () => {
    const reader = readerOf(searchState({ sort: { column: 'SQ-11', direction: 'ascending' } }))
    expect(uidsOf(reader.readSearchRows('', 'asShown'))).toEqual([202, 204, 201, 203])
  })

  it('a word and a filter and a sort together: the word picks, the filter drops, the sort orders', () => {
    const reader = readerOf(
      searchState({
        columnFilters: [filter('SQ-1', ['Delta'])],
        sort: { column: 'SQ-11', direction: 'descending' },
      }),
    )
    // WHY: the word "l" is found in Alpha, Charlie and Delta, not in Bravo.
    expect(uidsOf(reader.readSearchRows('l', 'asShown'))).toEqual([203, 201])
    expect(uidsOf(reader.readSearchRows('l', 'none'))).toEqual([201, 203, 204])
  })

  it('the panel is not changed by reading: the saved column filters and sort are as they were', () => {
    const state = searchState({ columnFilters: [filter('SQ-1', ['Bravo'])], sort: { column: 'SQ-11', direction: 'descending' } })
    const before = JSON.stringify(state.document.documentSettings)
    const reader = readerOf(state)
    reader.readSearchRows('', 'asShown')
    reader.readSearchRows('', 'none')
    expect(JSON.stringify(state.document.documentSettings)).toBe(before)
    expect(state.history.done).toHaveLength(0)
  })
})

// see AV-17, T-331
describe('AV-17 columns -- the task table columns, by the row ids of table T-331', () => {
  const taskColumns = specTable('T-331').rows.filter((row) => row.cells[0] === 'タスク')
  const page = (): AgentSearchPage => readerOf(searchState()).readSearchRows('')
  // WHY: a filter cell that says 'same as above' repeats the row above it in table T-331 (SQ-4 repeats SQ-3)
  const allRows = specTable('T-331').rows
  const filterCellOf = (row: (typeof allRows)[number]): string => {
    const cell = row.cells[row.cells.length - 1] ?? ''
    const at = allRows.findIndex((one) => one.id === row.id)
    return cell.trim() === '同上' && at > 0 ? filterCellOf(allRows[at - 1]!) : cell
  }

  it('premise: table T-331 has task table rows SQ-1, SQ-3 and SQ-11', () => {
    const ids = taskColumns.map((row) => row.id)
    expect(ids).toEqual(expect.arrayContaining(['SQ-1', 'SQ-3', 'SQ-11']))
  })

  it('each column has id, ja, en and kind', () => {
    for (const column of page().columns) {
      expect(Object.keys(column).sort()).toEqual(['en', 'id', 'ja', 'kind'])
      expect(typeof column.ja).toBe('string')
      expect(column.ja.length).toBeGreaterThan(0)
      expect(typeof column.en).toBe('string')
      expect(column.en.length).toBeGreaterThan(0)
    }
  })

  it('the ids are the task table rows of table T-331, in the order of the table', () => {
    expect(page().columns.map((column) => column.id)).toEqual(taskColumns.map((row) => row.id))
  })

  it('kind is "date" or "text"; "date" for the columns whose filter picks a span of days, "text" for the rest', () => {
    for (const column of page().columns) {
      const row = taskColumns.find((one) => one.id === column.id)
      const isDate = (row === undefined ? '' : filterCellOf(row)).includes('いつから')
      expect(column.kind, column.id).toBe(isDate ? 'date' : 'text')
    }
    expect(page().columns.find((column) => column.id === 'SQ-3')?.kind).toBe('date')
    expect(page().columns.find((column) => column.id === 'SQ-1')?.kind).toBe('text')
  })

  it('the columns do not depend on the word, the filters or the page', () => {
    const reader = readerOf(searchState())
    expect(reader.readSearchRows('zzz', 'none', 50, 10).columns).toEqual(page().columns)
  })
})

// see AG-2, AV-3
describe('AG-2 / AV-3: a write whose expectedStamp is stale is refused with the current stamp and no document', () => {
  const staleWrite = () => {
    const state = stateOf(wholeTemplate())
    const api = apiOf(state)
    const stale = { ...api.readStamp(), scheduleUpdatedAt: '2020-01-01T00:00:00Z' }
    const outcome = api.applyCommands({
      expectedStamp: stale,
      commands: [{ kind: 'setProjectTitle', title: 'a new title' }] as never,
    })
    return { state, api, outcome: outcome as unknown as Loose }
  }

  it('the outcome is a refusal with reason staleStamp', () => {
    const { outcome } = staleWrite()
    expect(outcome['ok']).toBe(false)
    expect((outcome['refusal'] as Loose)['reason']).toBe('staleStamp')
  })

  it('refusal.stamp is the current stamp', () => {
    const { outcome, api } = staleWrite()
    expect((outcome['refusal'] as Loose)['stamp']).toEqual(api.readStamp())
  })

  it('the refusal has no document (AV-3 no longer carries one)', () => {
    const { outcome } = staleWrite()
    const refusal = outcome['refusal'] as Loose
    expect(refusal['document']).toBeUndefined()
    expect(hasKeyDeep(outcome, ['document'])).toBe(false)
  })

  it('the whole refusal is small although the document is about 1.38 million characters', () => {
    const { outcome } = staleWrite()
    expect(JSON.stringify(outcome).length).toBeLessThan(20000)
  })

  it('nothing was written: the title is as it was', () => {
    const { state } = staleWrite()
    expect(state.document.schedule.project.title).toBe((TEMPLATE.schedule['project'] as Loose)['title'])
    expect(state.history.done).toHaveLength(0)
  })
})

// see AG-6, AV-14
describe('AG-6 / AV-14: a ChangeNotice carries the current stamp and no document', () => {
  it('a write by another writer reaches the watcher as a notice with stamp and without document', () => {
    const state = stateOf(wholeTemplate())
    const watcher = apiOf(state, 'cr-796 s4 watcher')
    const writer = apiOf(state, 'cr-796 s4 other writer')
    const notices: Loose[] = []
    const watch = watcher.watchChanges((notice) => notices.push(notice as unknown as Loose))
    try {
      const outcome = writer.applyCommands({
        expectedStamp: writer.readStamp(),
        commands: [{ kind: 'setProjectTitle', title: 'changed by the other writer' }] as never,
      })
      expect(outcome.ok, 'premise: the write was accepted').toBe(true)
      expect(notices).toHaveLength(1)
      const notice = notices[0] as Loose
      expect(notice['stamp']).toEqual(watcher.readStamp())
      expect(notice['document']).toBeUndefined()
      expect(hasKeyDeep(notice, ['document'])).toBe(false)
      expect(JSON.stringify(notice).length).toBeLessThan(20000)
    } finally {
      watch.stopWatching()
    }
  })
})

// see AG-2, AG-6
describe('AG-2 / AG-6 -- the clauses slice 4 added, held verbatim', () => {
  const clauses = [
    '⛔ 拒否の値に現在の文書を丸ごと載せてはならない（MUST NOT）',
    'を申告でき、食い違えば書き込みを拒否して現在の刻印を返すこと（MUST）',
  ]
  it.each(clauses)('the specification says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})
