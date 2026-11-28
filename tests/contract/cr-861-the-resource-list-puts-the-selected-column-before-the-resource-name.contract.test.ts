// CR-861 spec-only contract: the Resource List (U-49) puts the selected column (RQ-3) before the resource name (RQ-2), fixes the left three columns, and the Agent API reads the columns in the same order (T-370 RO-5 / RO-7, T-371, IMPS-284).

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { agentApiMembers, type AgentApiWiring } from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { resourceListFromWindow } from '../../src/adapter/screen-renderer/resource-list'
import { DEFAULT_TASK_GROUP_NAME, type DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { IDLE, SATO, SCHEDULE, TANAKA, wordOf } from './cr-722-stage'
import { CANVAS, NO_VIEW, OPENED_DELAY_DIAGNOSTICS_REPORT, iconWordOf, sessionIn } from './cr-721-stage'
import { specTable } from './spec-table'

const SPEC_FILE = readRepoFile(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const IMPS_284_ORDER = '`GRS` は、担当リストの表の列を、表 T-371 の行の順に左から並べること —— 表示・選択状態・担当名・担当タスク数・担当タスク。'
const RO_7_FIXED = '`GRS` は、見出し行と、`RQ-1`・`RQ-3`・`RQ-2`（表示・選択状態・担当名 —— 表 T-371 の並びで左の 3 列）を固定すること（`SV-6` の形）。'
const RO_5_EMPTY = '`GRS` は、`RO-5` の行の選択状態の列（`RQ-3`）を空にすること。'
const RQ_3_WRITES = '`GRS` は、担当を選択していれば `IC-67` を、選択していなければ `IC-68` を書くこと。'

const T_371_IDS: readonly string[] = specTable('T-371').rows.map((one) => one.id)

describe('CR-861 the manuscript these cases are driven by', () => {
  it('IMPS-284, RO-7, RO-5 and RQ-3 still say it, byte for byte in the requirements', () => {
    expect(SPEC_FILE).toContain(`| IMPS-284 | 列の並び | ${IMPS_284_ORDER} |`)
    expect(SPEC_FILE).toContain(`| RO-7 | 固定 | ${RO_7_FIXED} |`)
    expect(SPEC_FILE).toContain(RO_5_EMPTY)
    expect(SPEC_FILE).toContain(RQ_3_WRITES)
  })

  it('table T-371 lists RQ-1, RQ-3, RQ-2, RQ-4, RQ-5 in that order', () => {
    expect(T_371_IDS).toEqual(['RQ-1', 'RQ-3', 'RQ-2', 'RQ-4', 'RQ-5'])
  })
})

interface ColumnLike {
  readonly column: string
  readonly heading: string
  readonly isFixed: boolean
}
interface RowLike {
  readonly key: number | string
  readonly cells: readonly string[]
  readonly chosenEntry: { readonly label: string } | null
}
interface ViewLike {
  readonly columns: readonly ColumnLike[]
  readonly rows: readonly RowLike[]
  readonly chosenAt: number
}

function viewIn(language: DisplayLanguage, chosen: readonly number[] = []): ViewLike {
  const view = resourceListFromWindow(sessionIn(language), OPENED_DELAY_DIAGNOSTICS_REPORT as never, NO_VIEW, SCHEDULE, chosen, {
    canvas: CANVAS,
    textSizeStep: 1,
  } as never)
  if (view === null || view === undefined) throw new Error('the opened Resource List has no view')
  return view as unknown as ViewLike
}

const at = (view: ViewLike, column: string): number => {
  const index = view.columns.findIndex((one) => one.column === column)
  if (index < 0) throw new Error(`the view has no column ${column}`)
  return index
}
const rowOf = (view: ViewLike, key: number | string): RowLike => {
  const row = view.rows.find((one) => one.key === key)
  if (row === undefined) throw new Error(`the view has no row ${String(key)}`)
  return row
}

describe(`IMPS-284: ${IMPS_284_ORDER.slice(0, 30)} -- the opened Resource List`, () => {
  it('the columns are in the order of the T-371 rows', () => {
    expect(viewIn('ja').columns.map((one) => one.column)).toEqual(T_371_IDS)
  })

  it.each(['ja', 'en'] as const)('the headings are the dictionary words in that order (%s)', (language) => {
    expect(viewIn(language).columns.map((one) => one.heading)).toEqual(T_371_IDS.map((id) => wordOf('resourceListColumns', id, language)))
  })
})

describe(`RO-7: ${RO_7_FIXED.slice(0, 30)} -- the left three columns`, () => {
  it('isFixed is true for RQ-1, RQ-3 and RQ-2 and false for RQ-4 and RQ-5', () => {
    const columns = viewIn('ja').columns
    expect(columns.filter((one) => one.isFixed).map((one) => one.column)).toEqual(['RQ-1', 'RQ-3', 'RQ-2'])
    expect(columns.slice(0, 3).every((one) => one.isFixed)).toBe(true)
    expect(columns.slice(3).some((one) => one.isFixed)).toBe(false)
  })
})

describe('T-371 the cells sit under their own columns', () => {
  it('RQ-2 is the resource name and RQ-4 the count of its tasks, found by the column index', () => {
    const view = viewIn('ja')
    const name = at(view, 'RQ-2')
    const count = at(view, 'RQ-4')
    expect(rowOf(view, SATO).cells[name]).toBe('Sato Hanako')
    expect(rowOf(view, TANAKA).cells[name]).toBe('Tanaka Jiro')
    expect(rowOf(view, IDLE).cells[name]).toBe('Idle Ken')
    expect(rowOf(view, SATO).cells[count]).toBe('2')
    expect(rowOf(view, TANAKA).cells[count]).toBe('2')
    expect(rowOf(view, IDLE).cells[count]).toBe('0')
    expect(rowOf(view, 'unassigned').cells[name]).toBe(wordOf('resourceList', 'unassigned', 'ja'))
    expect(rowOf(view, 'unassigned').cells[count]).toBe('2')
  })

  it('chosenAt is the index of RQ-3, which is 1', () => {
    const view = viewIn('ja')
    expect(view.chosenAt).toBe(at(view, 'RQ-3'))
    expect(view.chosenAt).toBe(1)
  })

  it.each(['ja', 'en'] as const)(`RQ-3: ${RQ_3_WRITES.slice(0, 20)} -- IC-67 when chosen, IC-68 when not (%s)`, (language) => {
    const view = viewIn(language, [SATO])
    expect(rowOf(view, SATO).chosenEntry?.label).toBe(iconWordOf('IC-67', language))
    expect(rowOf(view, TANAKA).chosenEntry?.label).toBe(iconWordOf('IC-68', language))
    expect(rowOf(view, IDLE).chosenEntry?.label).toBe(iconWordOf('IC-68', language))
  })

  it(`RO-5: ${RO_5_EMPTY.slice(0, 20)} -- the (Unassigned) row has no entry and an empty RQ-3 cell`, () => {
    const view = viewIn('ja', [SATO, TANAKA, IDLE])
    const row = rowOf(view, 'unassigned')
    expect(row.chosenEntry).toBeNull()
    expect(row.cells[view.chosenAt] ?? '').toBe('')
  })
})

type Loose = Record<string, unknown>

const TEMPLATE = JSON.parse(
  readRepoFile(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Loose & { readonly schedule: Loose }

interface TableColumn {
  readonly id: string
  readonly ja: string
  readonly en: string
}
interface TablePage {
  readonly columns: readonly TableColumn[]
  readonly rows: readonly { readonly key: number | string; readonly cells: readonly { readonly column: string; readonly text: string }[] }[]
}
interface Reader {
  readTableRows(table: string, word?: string): TablePage
}

const CHANGE_WATCHERS = emptyChangeWatchers()
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const STAMP = {
  scheduleUpdatedAt: '2026-11-27T10:00:00Z',
  fileSavedAt: '2026-11-27T10:00:00Z',
  lastEditedBy: 'a person at the keyboard',
  settingsUpdatedAt: '2026-11-27T10:00:00Z',
}

// Why: the wiring is the cr-796 reader's, holding the CR-722 stage schedule as its document.
function readerOf(): Reader {
  const state: { document: Document; history: EditHistory<ChangeStep> } = {
    document: { ...TEMPLATE, schedule: SCHEDULE, documentStamp: { ...STAMP }, changeLog: [] } as unknown as Document,
    history: { done: [], undone: [] },
  }
  const readSnapshot = (): AgentSnapshot => ({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
    document: state.document,
    documentAsWritten: state.document,
    selection: emptySelection(),
    frame: null,
    exportScene: null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    isQuestionAsked: false,
    isDeliveringNotices: false,
    historyLimits: { maxSteps: NOT_STORED_LIMITS['S-94'], maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024 },
    settingsLimits: SETTINGS_LIMITS,
    readAt: '2026-11-27T08:30:00Z',
    localReadAt: '2026-11-27T09:00:00',
  })
  const wiring: AgentApiWiring = {
    changeWatchers: CHANGE_WATCHERS,
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: { deliver: (document, hasUpdatedSchedule) => notifyChangeWatchers(CHANGE_WATCHERS, { document, hasUpdatedSchedule }) },
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    writerName: 'cr-861 reader',
    schemaVersion: String(TEMPLATE['schemaVersion']),
  }
  return agentApiMembers(wiring) as unknown as Reader
}

describe(`IMPS-284 through the Agent API -- readTableRows('resourceList')`, () => {
  const page = (): TablePage => readerOf().readTableRows('resourceList', '')

  it('the columns are RQ-1, RQ-3, RQ-2, RQ-4, RQ-5, the T-371 row order', () => {
    expect(page().columns.map((one) => one.id)).toEqual(T_371_IDS)
  })

  it('the column words are the dictionary words in that order', () => {
    const { columns } = page()
    expect(columns.map((one) => one.ja)).toEqual(T_371_IDS.map((id) => wordOf('resourceListColumns', id, 'ja')))
    expect(columns.map((one) => one.en)).toEqual(T_371_IDS.map((id) => wordOf('resourceListColumns', id, 'en')))
  })

  it('each row lists its cells in the same column order', () => {
    const { rows } = page()
    expect(rows.length).toBe(4)
    for (const row of rows) expect(row.cells.map((one) => one.column), String(row.key)).toEqual(T_371_IDS)
  })
})
