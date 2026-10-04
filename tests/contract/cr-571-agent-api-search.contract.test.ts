// Contract test: table T-107 AM-25 readSearchRows and AM-16 focusTask against FR-151 table T-332 SJ-9, through installAgentApi (PI-17).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentSnapshot,
  type FrameSnapshot,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { DEFAULT_ROW_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog, type DialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { searchRowsOf, type SearchRows } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import {
  emptyChangeWatchers,
  notifyChangeWatchers,
  unwatchChanges,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { specTable, unbroken, type SpecRow } from './spec-table'

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const AM_25_RETURNS = '語を 1 つ受け、検索パネルの 2 つの表と同じ行を返す。'
const AM_25_NO_FILTER = '列の絞り込みと並べ替えは当てない。'
const AM_25_NO_PANEL = 'パネルを読みも変えもしない'
const AM_16_DOES = '指定したタスクが載る行と祖先を開き、見える位置へ表示を寄せる'
const SJ_9_WHICH_STEPS = '`_assets/tbl-glossary.md` の 表 T-107 の `AM-16` は `SJ-0`・`SJ-2`・`SJ-5` 〜 `SJ-8` を行う。'
const SJ_9_ANSWER = 'ただし `SJ-4` を行わず、パネルに触れず、`SJ-8` では告げずに、寄せなかったことを答えの値で返す'
const SJ_2_ONE_STEP = '値が変われば未保存の編集（`FR-100`）であり、取り消しの 1 段である。'
const SJ_2_NO_STEP = '1 つも変わらなければ段を積まない'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown> & { readonly schedule: Record<string, unknown> }
type Loose = Record<string, unknown>
const templateTasks = TEMPLATE.schedule['tasks'] as readonly Loose[]
const templateGroups = TEMPLATE.schedule['taskGroups'] as readonly Loose[]
const templateResources = TEMPLATE.schedule['resources'] as readonly Loose[]
const templateAssignments = TEMPLATE.schedule['assignments'] as readonly Loose[]

const PARENT = 'row-parent'
const CHILD = 'row-child'
const OTHER = 'row-other'
const DEEP_UID = 101
const OTHER_UID = 102

const task = (uid: number, name: string, start: string): Loose => ({
  ...(templateTasks[0] as Loose),
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name,
  start,
  finish: start.replace('-01T', '-09T'),
  milestone: false,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  dependencies: [],
})

const rowsWith = (parentState: string, childState: string): readonly Loose[] => [
  { ...(templateGroups[0] as Loose), id: PARENT, parentId: null, order: 0, label: 'Parent', derivedFromTaskUid: null, treeState: parentState },
  { ...(templateGroups[0] as Loose), id: CHILD, parentId: PARENT, order: 0, label: 'Child', derivedFromTaskUid: null, treeState: childState },
  { ...(templateGroups[0] as Loose), id: OTHER, parentId: null, order: 1, label: 'Other', derivedFromTaskUid: null, treeState: 'auto' },
]

const scheduleWith = (parentState: string, childState: string): Loose => ({
  ...TEMPLATE.schedule,
  tasks: [task(DEEP_UID, 'PM review', '2026-05-01T00:00:00'), task(OTHER_UID, 'Budget', '2026-04-01T00:00:00')],
  taskGroups: rowsWith(parentState, childState),
  taskGroupMembers: [
    { taskUid: DEEP_UID, groupId: CHILD },
    { taskUid: OTHER_UID, groupId: OTHER },
  ],
  resources: [{ ...(templateResources[0] as Loose), uid: 301, name: 'Pm Lead' }],
  assignments: [{ ...(templateAssignments[0] as Loose), uid: 401, taskUid: OTHER_UID, resourceUid: 301 }],
  commentBoxes: [
    {
      id: 'c-1',
      leaderShapeKind: null,
      text: 'pm note',
      anchorDate: '2026-05-02T00:00:00',
      anchorGroupId: CHILD,
      bodyOffsetPx: null,
      strokeColor: null,
      strokeWidthPx: null,
      fillColor: null,
      fillTransparencyPercent: null,
      textColor: null,
    },
  ],
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
})

const STARTING_STAMP = {
  scheduleUpdatedUtc: '2026-08-19T10:00:00Z',
  lastEditedBy: 'a person at the keyboard',
  settingsUpdatedUtc: '2026-08-19T10:00:00Z',
  fileSavedUtc: null,
} as const

const HISTORY_LIMITS = { maxSteps: NOT_STORED_LIMITS['S-94'], maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024 }
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const SCREEN: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const READ_AT = '2026-08-20T08:30:00Z'

function frameOf(document: Document): FrameSnapshot {
  const settings = document.documentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const geometry = geometryFromLayout(document.schedule, settings, layout, regions, emptySelection(), null)
  return { layout, geometry, regions }
}

// WHY: one registry for every bench, as a single shell holds one (SF-10).
const CHANGE_WATCHERS = emptyChangeWatchers()
const WRITERS: string[] = []

interface Bench {
  readonly api: AgentApi
  readonly state: {
    document: Document
    history: EditHistory<ChangeStep>
    dialogue: DialogueLog
    selection: Selection
  }
}

let benchCount = 0

function bench(parentState: string, childState: string): Bench {
  benchCount += 1
  const writerName = `cr-571 agent ${benchCount}`
  WRITERS.push(writerName)
  const state = {
    document: {
      ...TEMPLATE,
      schedule: scheduleWith(parentState, childState),
      documentStamp: { ...STARTING_STAMP },
      changeLog: [],
    } as unknown as Document,
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
    dialogue: emptyDialogueLog(),
    selection: emptySelection(),
    isDeliveringNotices: false,
  }
  const snapshotOf = (): AgentSnapshot => ({
    defaultRowName: DEFAULT_ROW_NAME,
    document: state.document,
    selection: state.selection,
    dialogue: state.dialogue,
    frame: frameOf(state.document),
    exportScene: null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    isDeliveringNotices: state.isDeliveringNotices,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: READ_AT,
    localReadAt: '2026-10-03T09:00:00',
  })
  const wiring: AgentApiWiring = {
    source: { readSnapshot: snapshotOf },
    changeWatchers: CHANGE_WATCHERS,
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: {
      deliver: (document, hasMovedSchedule) => {
        state.isDeliveringNotices = true
        try {
          notifyChangeWatchers(CHANGE_WATCHERS, { document, hasMovedSchedule, dialogue: state.dialogue })
        } finally {
          state.isDeliveringNotices = false
        }
      },
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
    schemaVersion: TEMPLATE['schemaVersion'] as string,
  }
  return { api: installAgentApi(wiring), state }
}

afterEach(() => {
  for (const one of WRITERS) unwatchChanges(CHANGE_WATCHERS, one)
  WRITERS.length = 0
})

const treeStateOf = (document: Document, id: string): string =>
  String((document.schedule.taskGroups as unknown as readonly Loose[]).find((row) => row['id'] === id)?.['treeState'])

/** @purity semi-pure-b */
function readSearchRowsOf(api: AgentApi, word: string): SearchRows {
  const member = (api as unknown as { readSearchRows?: (word: string) => SearchRows }).readSearchRows
  if (typeof member !== 'function') throw new Error('AM-25: the Agent API has no member readSearchRows')
  return member.call(api, word)
}

describe('table T-107 AM-25 / AM-16 and table T-332 SJ-9 -- the clauses these cases are driven by', () => {
  it('AM-25 is readSearchRows, and still says what it returns and what it leaves alone', () => {
    expect(cellOf('T-107', 'AM-25', '確定名')).toBe('`readSearchRows`')
    const does = cellOf('T-107', 'AM-25', '何を担うか')
    for (const clause of [AM_25_RETURNS, AM_25_NO_FILTER, AM_25_NO_PANEL]) expect(does).toContain(clause)
  })

  it('AM-16 is focusTask, owned by SJ-9', () => {
    expect(cellOf('T-107', 'AM-16', '確定名')).toBe('`focusTask`')
    expect(cellOf('T-107', 'AM-16', '何を担うか')).toContain(AM_16_DOES)
    expect(cellOf('T-107', 'AM-16', '正')).toContain('`SJ-9`')
    const sj9 = cellOf('T-332', 'SJ-9', '定め')
    expect(sj9).toContain(SJ_9_WHICH_STEPS)
    expect(sj9).toContain(SJ_9_ANSWER)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_ONE_STEP)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_NO_STEP)
  })
})

describe(`AM-25 readSearchRows -- ${AM_25_RETURNS}`, () => {
  it.each(['', 'ｐｍ', 'budget', 'nothing hits this'])('answers the rows searchRowsOf gives for %j', (word) => {
    const one = bench('auto', 'auto')
    expect(readSearchRowsOf(one.api, word)).toEqual(searchRowsOf(one.state.document.schedule, word))
  })

  it('writes nothing: the document and the undo history stay as they were', () => {
    const one = bench('collapsed', 'hidden')
    const before = one.state.document
    readSearchRowsOf(one.api, 'pm')
    expect(one.state.document).toBe(before)
    expect(one.state.history.done).toHaveLength(0)
  })
})

describe(`AM-16 focusTask -- ${SJ_9_WHICH_STEPS}`, () => {
  it(`opens the task's row and its ancestor (SJ-2), as one undo step -- ${SJ_2_ONE_STEP}`, () => {
    const one = bench('collapsed', 'hidden')
    const outcome = one.api.focusTask(DEEP_UID)
    expect(outcome.accepted).toBe(true)
    expect(treeStateOf(one.state.document, PARENT)).toBe('expanded')
    expect(treeStateOf(one.state.document, CHILD)).toBe('expanded')
    expect(treeStateOf(one.state.document, OTHER)).toBe('auto')
    expect(one.state.history.done).toHaveLength(1)
  })

  it(`leaves no undo step when every row is already open -- ${SJ_2_NO_STEP}`, () => {
    const one = bench('expanded', 'expanded')
    expect(one.api.focusTask(DEEP_UID).accepted).toBe(true)
    expect(one.state.history.done).toHaveLength(0)
  })

  it('puts the task\'s row at the top of the view (SJ-5) and answers isScrolled: true', () => {
    const one = bench('auto', 'auto')
    const outcome = one.api.focusTask(DEEP_UID) as unknown as { accepted: boolean; isScrolled?: unknown }
    expect(outcome.accepted).toBe(true)
    expect(one.state.document.documentSettings.scrollGroupId).toBe(CHILD)
    expect(one.state.document.documentSettings.scrollGroupOffset).toBe(0)
    expect(outcome.isScrolled).toBe(true)
  })

  it(`does not select (${SJ_9_ANSWER})`, () => {
    const one = bench('auto', 'auto')
    const before = one.state.selection
    one.api.focusTask(DEEP_UID)
    expect(one.state.selection).toBe(before)
  })
})
