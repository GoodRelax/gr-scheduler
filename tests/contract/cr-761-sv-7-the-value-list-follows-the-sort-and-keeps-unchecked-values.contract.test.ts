// CR-761 spec-only contract: a column filter's value list follows the sort and is made from the rows the word keeps (SV-7).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  searchPanelAfterFilterChange,
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithFilterOpened,
  searchPanelWithTableViewsCleared,
  type SearchFilterChange,
} from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportAfterFilterChange,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import {
  OPENED_RESOURCE_LIST,
  resourceListAfterEntry,
  resourceListAfterFilterChange,
  resourceListFromWindow,
} from '../../src/adapter/screen-renderer/resource-list'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type TableView,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { FakeElement, selfAndDescendants } from '../fixtures/fake-browser'
import { CANVAS, NO_VIEW, found, sessionIn } from './cr-721-stage'
import { MIXED } from './cr-731-documents'
import { windowStage, type WindowStage } from './cr-731-window-stage'
import { specTable, unbroken } from './spec-table'

const SV_7_ORDER =
  '⭐ 値の一覧は、その列で並べ替えている（`SV-8`）ときはその向きに、ほかの列で並べ替えているときと並べ替えていないときは昇順に並べ、比べ方は表の行を並べ替えるときと同じ（`SV-8`）、「（空白）」は向きによらず末尾とすること（MUST）'
const SV_7_SOURCE = '⭐ 値の一覧は、語で残した行（`SV-4`）の値から作り、列のフィルタは当てないこと（MUST）'
const SV_7_KEPT = '値のチェックを外しても、その値は一覧に残り、いつでもチェックし直せる。ほかの列のフィルタで表から外れた行の値も一覧に残る'
const SV_7_BLANK_ITEM = '空のセルは「（空白）」の 1 項目。'
const SV_8_STATUS = '状態の列（`SQ-5`）の昇順は 信用できない・要修正 → ボトルネック → ボトルネック経路 → 遅れ → 未着手 → 進行中 → 完了 → 中断・再開予定あり → 中断・再開日未定、降順はその逆'
const SV_8_VISIBILITY = '表示の列（`SQ-10`）の昇順は 表示 → 非表示、降順はその逆。'
const T_347_STATUS = 'ステータスの欄の昇順は `DT-1` の順、降順はその逆。'
const T_374_SAME = '⭐ 並べ替え・列のフィルタ・列の幅の変え方・見出し行の縦の固定は 表 T-346 の `RW-9` ・ `RW-10` と同じ作りとする。'
const HIDDEN_VALUES_BLANK = '空のセルの項目（「（空白）」）は空の文字列。'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const SETTINGS_BOOK = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8'))

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(found(specTable(table).rows.find((one) => one.id === id), `${table} ${id}`).by[heading] ?? '')

// WHY: the dictionary is the spec's own file; a word is read from it, never retyped here.
type Words = Record<DisplayLanguage, string>
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as Record<
  string,
  readonly { readonly part?: string; readonly rowId?: string; readonly text?: Words }[]
>
const wordOf = (group: string, key: string, language: DisplayLanguage = 'ja'): string =>
  found((WORDS[group] ?? []).find((one) => one.part === key || one.rowId === key)?.text, `the word ${group}/${key}`)[language]

const BLANK = wordOf('searchPanel', 'blank')

describe('CR-761 -- the clauses this file is driven by', () => {
  it('T-330 SV-7 / SV-8, T-347, T-374 and the ColumnFilter row still read this way', () => {
    const sv7 = cellOf('T-330', 'SV-7', '定め')
    for (const clause of [SV_7_ORDER, SV_7_SOURCE, SV_7_KEPT, SV_7_BLANK_ITEM]) expect(sv7).toContain(clause)
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_STATUS)
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_VISIBILITY)
    expect(REQUIREMENTS).toContain(T_347_STATUS)
    expect(REQUIREMENTS).toContain(T_374_SAME)
    expect(SETTINGS_BOOK).toContain(HIDDEN_VALUES_BLANK)
  })

  it('the dictionary words the cases read', () => {
    expect(wordOf('searchPanel', 'blank', 'ja')).toBe('（空白）')
    expect(wordOf('searchPanel', 'blank', 'en')).toBe('(Blanks)')
  })
})

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose
const D = (day: string): string => `${day}T00:00:00`

type State = 'notStarted' | 'inProgress' | 'finished' | 'resumePlanned' | 'resumeUnknown'

const STATE_FIELDS: Readonly<Record<State, Loose>> = {
  notStarted: { actualStart: null, stop: null, actualFinish: null, resume: null, resumeValid: null },
  inProgress: { actualStart: D('2026-03-30'), stop: null, actualFinish: null, resume: null, resumeValid: null },
  finished: { actualStart: D('2026-03-30'), stop: null, actualFinish: D('2026-04-08'), resume: null, resumeValid: null },
  resumePlanned: { actualStart: D('2026-03-30'), stop: D('2026-04-02'), actualFinish: null, resume: D('2026-05-01'), resumeValid: true },
  resumeUnknown: { actualStart: D('2026-03-30'), stop: D('2026-04-02'), actualFinish: null, resume: null, resumeValid: false },
}

// see T-019a, SV-8
const STATUS_ASCENDING: readonly string[] = ['PS-1', 'PS-5', 'PS-2', 'PS-4', 'PS-3'].map((row) => wordOf('planActualStates', row))

const ANN = 101
const BOB = 102
const CY = 103

interface TaskSpec {
  readonly uid: number
  readonly name: string
  readonly state: State
  readonly percent: number | null
  readonly resources: readonly number[]
}

// WHY: three values and a blank per list show a reversal with the blank kept last;
// the progress values sort differently as text and as numbers.
const TASKS: readonly TaskSpec[] = [
  { uid: 1, name: 'Delta', state: 'notStarted', percent: 40, resources: [ANN] },
  { uid: 2, name: 'Alpha', state: 'inProgress', percent: 7, resources: [BOB, ANN] },
  { uid: 3, name: 'Charlie', state: 'finished', percent: 100, resources: [CY] },
  { uid: 4, name: '', state: 'resumePlanned', percent: null, resources: [] },
  { uid: 5, name: 'Bravo', state: 'resumeUnknown', percent: 25, resources: [BOB] },
]
const G_ONE = 'g-one'
const G_TWO = 'g-two'

const comment = (id: string, text: string, day: string, group: string): Loose => ({
  id,
  leaderShapeKind: null,
  text,
  anchorDate: D(day),
  anchorGroupId: group,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
})

const SEARCH_SCHEDULE = {
  ...TEMPLATE.schedule,
  // WHY: the template's status date makes these April tasks late (T-021b); without one SQ-5 lists the five T-019a states.
  project: { ...(TEMPLATE.schedule.project as object), statusDate: null },
  tasks: TASKS.map((spec) => ({
    ...firstOf('tasks'),
    uid: spec.uid,
    parentTaskUid: null,
    wbsOrder: spec.uid,
    name: spec.name,
    start: D(`2026-04-0${spec.uid}`),
    finish: D(`2026-04-1${spec.uid}`),
    milestone: false,
    percentComplete: spec.percent,
    dependencies: [],
    notes: null,
    ...STATE_FIELDS[spec.state],
  })),
  taskGroups: [
    { ...firstOf('taskGroups'), id: G_ONE, parentId: null, order: 0, label: 'Row', derivedFromTaskUid: null, treeState: 'expanded' },
    { ...firstOf('taskGroups'), id: G_TWO, parentId: null, order: 1, label: 'Area', derivedFromTaskUid: null, treeState: 'expanded' },
  ],
  taskGroupMembers: TASKS.map((one) => ({ taskUid: one.uid, groupId: G_ONE })),
  resources: [
    { ...firstOf('resources'), uid: ANN, name: 'Ann' },
    { ...firstOf('resources'), uid: BOB, name: 'Bob' },
    { ...firstOf('resources'), uid: CY, name: 'Cy' },
  ],
  assignments: TASKS.flatMap((task) => task.resources.map((resourceUid) => ({ taskUid: task.uid, resourceUid }))).map((one, at) => ({
    ...firstOf('assignments'),
    uid: 3000 + at,
    ...one,
  })),
  commentBoxes: [
    comment('c-1', 'Note B', '2026-04-02', G_ONE),
    comment('c-2', 'Note A', '2026-04-03', G_TWO),
    comment('c-3', 'Note C', '2026-04-04', G_ONE),
    comment('c-4', '', '2026-04-05', G_TWO),
  ],
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

interface Pane {
  readonly panel: SearchPanelSession
  readonly view: TableView
}

const TASK_PANEL: Pane = { panel: { ...emptySearchPanelSession, table: 'tasks' }, view: NO_VIEW }
const COMMENT_PANEL: Pane = { panel: { ...emptySearchPanelSession, table: 'commentBoxes' }, view: NO_VIEW }

const viewOf = (pane: Pane, language: DisplayLanguage = 'ja'): SearchPanelView =>
  found(searchPanelFromSession(sessionIn(language), pane.panel, pane.view, SEARCH_SCHEDULE, CANVAS), 'a view of a shown panel')

// WHY: IC-122 of an open column closes it (SV-7), so a column is opened from a pane with no filter open.
const opened = (column: string, pane: Pane = TASK_PANEL): Pane => {
  const shut: Pane = { ...pane, panel: { ...pane.panel, filters: { ...pane.panel.filters, open: null } } }
  return {
    panel: found(searchPanelWithFilterOpened(sessionIn('ja'), shut.panel, shut.view, column), `the panel after IC-122 on ${column}`),
    view: shut.view,
  }
}

const pressed = (pane: Pane, entry: string): Pane => ({
  panel: pane.panel,
  view: found(searchPanelAfterFilterEntry(sessionIn('ja'), pane.panel, pane.view, entry as never, SEARCH_SCHEDULE), `the view after ${entry}`),
})

const changed = (pane: Pane, change: SearchFilterChange): Pane => ({
  panel: pane.panel,
  view: found(searchPanelAfterFilterChange(sessionIn('ja'), pane.panel, pane.view, change), `the view after ${JSON.stringify(change)}`),
})

type MenuItem = { readonly value: string; readonly label: string; readonly isShown: boolean }

function itemsOf(menu: unknown, column: string): readonly MenuItem[] {
  const open = found(menu as { kind: string; column: string; values?: readonly MenuItem[] } | null, `an open filter on ${column}`)
  if (open.kind !== 'values' || open.values === undefined) throw new Error(`the open filter of ${open.column} is ${open.kind}`)
  expect(open.column).toBe(column)
  return open.values
}

const panelItems = (column: string, pane: Pane): readonly MenuItem[] => itemsOf(viewOf(opened(column, pane)).filterMenu, column)
const labels = (items: readonly MenuItem[]): readonly string[] => items.map((one) => one.label)
const unchecked = (items: readonly MenuItem[]): readonly string[] => items.filter((one) => !one.isShown).map((one) => one.label)

const sortedBy = (column: string, direction: 'IC-123' | 'IC-124', pane: Pane = TASK_PANEL): Pane => pressed(opened(column, pane), direction)

const taskUidsOf = (view: SearchPanelView): readonly number[] =>
  view.rows.map((row) => (row.target.kind === 'task' ? row.target.taskUid : -1))

// WHY: the rows of the sorted column in their drawn order, one entry per distinct cell.
function distinctCells(view: { columns: readonly { column: string }[]; rows: readonly { cells: readonly string[] }[] }, column: string): readonly string[] {
  const at = view.columns.findIndex((one) => one.column === column)
  const made: string[] = []
  for (const row of view.rows) {
    const cell = row.cells[at] ?? ''
    if (!made.includes(cell)) made.push(cell)
  }
  return made
}

describe(`SV-7 「${SV_7_ORDER.slice(2, 60)}…」 -- Search Panel, tasks table`, () => {
  it('with no sort every list is ascending by the SV-8 comparison, the blank last', () => {
    expect(labels(panelItems('SQ-1', TASK_PANEL))).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', BLANK])
    expect(labels(panelItems('SQ-11', TASK_PANEL))).toEqual(['7%', '25%', '40%', '100%', BLANK])
    expect(labels(panelItems('SQ-2', TASK_PANEL))).toEqual(['Ann', 'Bob', 'Cy', BLANK])
    expect(labels(panelItems('SQ-5', TASK_PANEL))).toEqual(STATUS_ASCENDING)
  })

  it.each([
    ['SQ-1', ['Delta', 'Charlie', 'Bravo', 'Alpha', BLANK]],
    ['SQ-11', ['100%', '40%', '25%', '7%', BLANK]],
    ['SQ-2', ['Cy', 'Bob', 'Ann', BLANK]],
  ] as const)('IC-124 on %s reverses its list and keeps the blank last', (column, expected) => {
    const sorted = sortedBy(column, 'IC-124')
    expect(sorted.view.sort, 'premise: IC-124 sets a descending sort on the column').toEqual({ column, direction: 'descending' })
    expect(labels(itemsOf(viewOf(sorted).filterMenu, column))).toEqual(expected)
    expect(labels(panelItems(column, sorted))).toEqual(expected)
  })

  it('IC-123 on a column keeps its list ascending', () => {
    expect(labels(panelItems('SQ-1', sortedBy('SQ-1', 'IC-123')))).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', BLANK])
  })

  it('the status column follows the SV-8 order both ways', () => {
    expect(labels(panelItems('SQ-5', sortedBy('SQ-5', 'IC-123')))).toEqual(STATUS_ASCENDING)
    expect(labels(panelItems('SQ-5', sortedBy('SQ-5', 'IC-124')))).toEqual([...STATUS_ASCENDING].reverse())
  })

  it('the Visibility column follows the SV-8 order both ways (Show -> Hide)', () => {
    const someHidden: Pane = { ...TASK_PANEL, view: { ...NO_VIEW, visibility: { ...NO_VIEW.visibility, hiddenKeys: [3] } } }
    const ascending = [wordOf('searchPanel', 'showValue'), wordOf('searchPanel', 'hideValue')]
    expect(labels(panelItems('SQ-10', someHidden))).toEqual(ascending)
    expect(labels(panelItems('SQ-10', sortedBy('SQ-10', 'IC-124', someHidden)))).toEqual([...ascending].reverse())
  })

  it('the list of the sorted column reads in the order of the sorted rows', () => {
    for (const column of ['SQ-1', 'SQ-11', 'SQ-5']) {
      for (const direction of ['IC-123', 'IC-124'] as const) {
        const sorted = sortedBy(column, direction)
        const rows = distinctCells(viewOf(sorted), column).filter((one) => one !== '' && one !== wordOf('searchPanel', 'noName'))
        const list = labels(panelItems(column, sorted)).filter((one) => one !== BLANK)
        expect(list, `${column} ${direction}`).toEqual(rows)
      }
    }
  })

  it('while another column is sorted descending, this column lists ascending', () => {
    const byName = sortedBy('SQ-1', 'IC-124')
    expect(labels(panelItems('SQ-11', byName))).toEqual(['7%', '25%', '40%', '100%', BLANK])
    expect(labels(panelItems('SQ-2', byName))).toEqual(['Ann', 'Bob', 'Cy', BLANK])
    expect(labels(panelItems('SQ-5', byName))).toEqual(STATUS_ASCENDING)
  })

  it('a column sorted descending lists ascending again once the sort moves to another column', () => {
    const byProgress = sortedBy('SQ-11', 'IC-124')
    expect(labels(panelItems('SQ-11', byProgress)), 'premise: reversed while sorted').toEqual(['100%', '40%', '25%', '7%', BLANK])
    const moved = sortedBy('SQ-1', 'IC-124', byProgress)
    expect(moved.view.sort?.column, 'premise: one sorted column (SV-8)').toBe('SQ-1')
    expect(labels(panelItems('SQ-11', moved))).toEqual(['7%', '25%', '40%', '100%', BLANK])
  })

  it('after IC-153 the list is ascending again', () => {
    const cleared = searchPanelWithTableViewsCleared(sortedBy('SQ-1', 'IC-124').panel, sortedBy('SQ-1', 'IC-124').view)
    expect(cleared.view.sort, 'premise: IC-153 drops the sort').toBeNull()
    expect(labels(panelItems('SQ-1', cleared))).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', BLANK])
  })
})

describe(`SV-7 「${SV_7_ORDER.slice(2, 60)}…」 -- Search Panel, comment box table`, () => {
  it('IC-124 on the body reverses its list with the blank last; another sort and IC-153 bring it back ascending', () => {
    const ascending = ['Note A', 'Note B', 'Note C', BLANK]
    expect(labels(panelItems('SQ-7', COMMENT_PANEL))).toEqual(ascending)
    const sorted = sortedBy('SQ-7', 'IC-124', COMMENT_PANEL)
    expect(labels(panelItems('SQ-7', sorted))).toEqual(['Note C', 'Note B', 'Note A', BLANK])
    expect(labels(panelItems('SQ-7', sortedBy('SQ-8', 'IC-124', sorted)))).toEqual(ascending)
    const cleared = searchPanelWithTableViewsCleared(sorted.panel, sorted.view)
    expect(labels(panelItems('SQ-7', cleared))).toEqual(ascending)
  })

  it('IC-124 on the task group name reverses its list', () => {
    expect(labels(panelItems('SQ-8', COMMENT_PANEL))).toEqual(['Area', 'Row'])
    expect(labels(panelItems('SQ-8', sortedBy('SQ-8', 'IC-124', COMMENT_PANEL)))).toEqual(['Row', 'Area'])
  })
})

const VALUE_COLUMNS_OF_TASKS = ['SQ-5', 'SQ-11', 'SQ-1', 'SQ-2', 'SQ-6'] as const

const valueOff = (column: string, label: string, pane: Pane): Pane => {
  const there = opened(column, pane)
  const item = found(itemsOf(viewOf(there).filterMenu, column).find((one) => one.label === label), `${label} in ${column}`)
  return changed(there, { kind: 'value', column: column as never, value: item.value, isShown: false })
}
const valueOn = (column: string, label: string, pane: Pane): Pane => {
  const there = opened(column, pane)
  const item = found(itemsOf(viewOf(there).filterMenu, column).find((one) => one.label === label), `${label} in ${column}`)
  return changed(there, { kind: 'value', column: column as never, value: item.value, isShown: true })
}

describe(`SV-7 「${SV_7_SOURCE.slice(2)}」 -- Search Panel`, () => {
  it.each(VALUE_COLUMNS_OF_TASKS)('%s: the first value unchecked drops its rows, stays listed unchecked, and checks back', (column) => {
    const before = panelItems(column, TASK_PANEL)
    const first = found(before[0], `the first value of ${column}`).label
    const off = valueOff(column, first, TASK_PANEL)
    const all = taskUidsOf(viewOf(TASK_PANEL))
    expect(taskUidsOf(viewOf(off)).length, 'the table drops the rows of the value').toBeLessThan(all.length)
    const after = panelItems(column, off)
    expect(labels(after)).toEqual(labels(before))
    expect(unchecked(after)).toEqual([first])
    const back = valueOn(column, first, off)
    expect(taskUidsOf(viewOf(back))).toEqual(all)
    expect(unchecked(panelItems(column, back))).toEqual([])
  })

  it('another column keeps the values whose rows the first filter removed (answer A)', () => {
    const off = valueOff('SQ-1', 'Alpha', TASK_PANEL)
    expect(taskUidsOf(viewOf(off)), 'premise: Alpha (the only 7%) is out of the table').not.toContain(2)
    expect(labels(panelItems('SQ-11', off))).toEqual(['7%', '25%', '40%', '100%', BLANK])
    expect(unchecked(panelItems('SQ-11', off))).toEqual([])
    const both = valueOff('SQ-11', '40%', off)
    expect(labels(panelItems('SQ-1', both))).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', BLANK])
    expect(unchecked(panelItems('SQ-1', both))).toEqual(['Alpha'])
  })

  it('the list is made from the rows the word keeps (SV-4), not from every row', () => {
    const worded: Pane = { ...TASK_PANEL, panel: { ...TASK_PANEL.panel, word: 'Alpha' } }
    expect(taskUidsOf(viewOf(worded)), 'premise: the word keeps Alpha only').toEqual([2])
    expect(labels(panelItems('SQ-11', worded))).toEqual(['7%'])
    expect(labels(panelItems('SQ-1', worded))).toEqual(['Alpha'])
  })

  it('after IC-126 every item is still listed, and each can be checked again one by one', () => {
    const before = panelItems('SQ-1', TASK_PANEL)
    let pane = pressed(opened('SQ-1', TASK_PANEL), 'IC-126')
    expect(taskUidsOf(viewOf(pane))).toEqual([])
    expect(labels(panelItems('SQ-1', pane))).toEqual(labels(before))
    expect(unchecked(panelItems('SQ-1', pane))).toEqual(labels(before))
    let shownRows = 0
    for (const item of before) {
      pane = valueOn('SQ-1', item.label, pane)
      const now = panelItems('SQ-1', pane)
      expect(labels(now), item.label).toEqual(labels(before))
      expect(now.find((one) => one.label === item.label)?.isShown, item.label).toBe(true)
      const rows = taskUidsOf(viewOf(pane)).length
      expect(rows, `rows grow when ${item.label} is checked`).toBeGreaterThan(shownRows)
      shownRows = rows
    }
    expect(taskUidsOf(viewOf(pane))).toEqual(taskUidsOf(viewOf(TASK_PANEL)))
  })

  it(`ColumnFilter.hiddenValues: 「${HIDDEN_VALUES_BLANK}」 -- the blank item unchecked is held as the empty string`, () => {
    const off = valueOff('SQ-2', BLANK, TASK_PANEL)
    expect(off.view.columnFilters.find((one) => one.column === 'SQ-2')?.hiddenValues).toEqual([''])
    expect(taskUidsOf(viewOf(off))).not.toContain(4)
    expect(unchecked(panelItems('SQ-2', off))).toEqual([BLANK])
  })

  it('comment box table: the first body unchecked stays listed; the group list keeps its values', () => {
    const off = valueOff('SQ-7', 'Note A', COMMENT_PANEL)
    expect(viewOf(off).rows.length).toBe(viewOf(COMMENT_PANEL).rows.length - 1)
    expect(labels(panelItems('SQ-7', off))).toEqual(['Note A', 'Note B', 'Note C', BLANK])
    expect(unchecked(panelItems('SQ-7', off))).toEqual(['Note A'])
    const group = valueOff('SQ-8', 'Area', COMMENT_PANEL)
    expect(labels(panelItems('SQ-7', group)), 'Note A and the blank body sit only under Area').toEqual(['Note A', 'Note B', 'Note C', BLANK])
    const pane = pressed(opened('SQ-7', COMMENT_PANEL), 'IC-126')
    expect(viewOf(pane).rows.length).toBe(0)
    expect(unchecked(panelItems('SQ-7', pane))).toEqual(['Note A', 'Note B', 'Note C', BLANK])
  })
})

const reportTask = (uid: number, name: string, start: string, extra: Loose = {}): Loose => ({
  uid,
  name,
  start: `${start}T08:00:00`,
  finish: `${start}T17:00:00`,
  milestone: false,
  actualStart: null,
  actualFinish: null,
  percentComplete: 0,
  ...extra,
})

// WHY: one row per DT-1 status; only Delta and Bravo carry an assignee, and task 6 has no name.
const REPORT_SCHEDULE = {
  tasks: [
    reportTask(1, 'Alpha', '2026-03-02'),
    reportTask(2, 'Bravo', '2026-01-05', { percentComplete: 40, actualStart: '2026-01-05T08:00:00' }),
    reportTask(3, 'Charlie', '2026-02-02', { percentComplete: 25 }),
    reportTask(4, 'Delta', '2026-01-01', { percentComplete: 7 }),
    reportTask(5, 'Echo', '2026-01-01', { actualStart: '2026-01-01T08:00:00', actualFinish: '2026-01-09T17:00:00', percentComplete: 100 }),
    reportTask(6, '', '2026-04-01'),
  ],
  project: { minutesPerDay: null },
  resources: [
    { ...firstOf('resources'), uid: ANN, name: 'Ann' },
    { ...firstOf('resources'), uid: BOB, name: 'Bob' },
  ],
  assignments: [
    { ...firstOf('assignments'), uid: 3001, taskUid: 4, resourceUid: ANN },
    { ...firstOf('assignments'), uid: 3002, taskUid: 2, resourceUid: BOB },
  ],
} as unknown as Schedule

const QUANTITIES = { inheritedDelayMinutes: 480, selfDelayMinutes: 960, pushOutMinutes: 2400, terminalsReached: 2 }

const REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [
    { row: 'VC-3', kind: 'contradiction', layer: 1, uid: 1, name: 'Alpha', values: { start: '2026-03-02' }, proposedActualFinish: null },
    { row: 'VS-1', kind: 'suspicion', layer: 1, uid: 6, name: '', values: { percentComplete: 0 }, proposedActualFinish: null },
  ],
  bottlenecks: [{ uid: 2, name: 'Bravo', ...QUANTITIES, path: [3, 2] }],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 1,
  markerStates: [
    { uid: 1, row: 'DG-1' },
    { uid: 2, row: 'DG-2' },
    { uid: 3, row: 'DG-3' },
    { uid: 4, row: 'DG-4' },
  ],
  settledPushOuts: [{ uid: 5, name: 'Echo', ...QUANTITIES }],
  derivedParentTasks: [],
  lateDays: [],
} as unknown as DelayDiagnosticsReport

// see DT-1
const REPORT_STATUS_ASCENDING: readonly string[] = ['DG-1', 'DX-3', 'DG-2', 'DG-3', 'DG-4', 'DX-9'].map((row) => wordOf('delayReportStatuses', row))

interface ReportPane {
  readonly window: DelayDiagnosticsReportWindow
  readonly view: TableView
}

const OPENED_REPORT: ReportPane = { window: OPENED_DELAY_DIAGNOSTICS_REPORT, view: NO_VIEW }

const reportViewOf = (pane: ReportPane, language: DisplayLanguage = 'ja'): DelayDiagnosticsReportView =>
  found(
    delayDiagnosticsReportFromWindow({ screen: { screenLanguage: language } } as unknown as ScreenSession, pane.window, pane.view, REPORT, REPORT_SCHEDULE, {
      canvas: CANVAS,
      textSizeStep: 1,
    }),
    'a view of the report window',
  )

function reportAfter(pane: ReportPane, entry: string, column: string | null, language: DisplayLanguage = 'ja'): ReportPane {
  const after = found(
    delayDiagnosticsReportAfterEntry(pane.window, pane.view, entry as never, column, { report: REPORT, schedule: REPORT_SCHEDULE, language }),
    `the report after ${entry}`,
  )
  return { window: found(after.window, `the report window after ${entry}`), view: after.view }
}

const reportShut = (pane: ReportPane): ReportPane => ({
  ...pane,
  window: { ...pane.window, panel: { ...pane.window.panel, filters: { ...pane.window.panel.filters, open: null } } },
})
const reportOpened = (column: string, pane: ReportPane = OPENED_REPORT, language: DisplayLanguage = 'ja'): ReportPane =>
  reportAfter(reportShut(pane), 'IC-122', column, language)
const reportItems = (column: string, pane: ReportPane = OPENED_REPORT, language: DisplayLanguage = 'ja'): readonly MenuItem[] =>
  itemsOf(reportViewOf(reportOpened(column, pane, language), language).filterMenu, column)
const reportSorted = (column: string, direction: 'IC-123' | 'IC-124', pane: ReportPane = OPENED_REPORT): ReportPane =>
  reportAfter(reportOpened(column, pane), direction, column)

function reportValue(column: string, label: string, isShown: boolean, pane: ReportPane): ReportPane {
  const there = reportOpened(column, pane)
  const item = found(itemsOf(reportViewOf(there).filterMenu, column).find((one) => one.label === label), `${label} in ${column}`)
  return { window: there.window, view: delayDiagnosticsReportAfterFilterChange(there.window, there.view, { kind: 'value', column, value: item.value, isShown } as never) as TableView }
}

const reportUids = (pane: ReportPane): readonly number[] => reportViewOf(pane).rows.map((row) => (row.target.kind === 'task' ? row.target.taskUid : -1))

const REPORT_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', BLANK]
const REPORT_PROGRESS = ['0%', '7%', '25%', '40%', '100%']

describe('SV-7 order -- Delay Diagnostics Report, the diagnosis table (T-346 preface, T-347)', () => {
  it('with no sort the lists are ascending, the blank last, the status in the DT-1 order', () => {
    expect(labels(reportItems('DT-4'))).toEqual(REPORT_NAMES)
    expect(labels(reportItems('DT-3'))).toEqual(REPORT_PROGRESS)
    expect(labels(reportItems('DT-2'))).toEqual(['Ann', 'Bob', BLANK])
    expect(labels(reportItems('DT-1'))).toEqual(REPORT_STATUS_ASCENDING)
  })

  it('IC-124 reverses the list of the sorted column and keeps the blank last', () => {
    expect(labels(reportItems('DT-4', reportSorted('DT-4', 'IC-124')))).toEqual(['Echo', 'Delta', 'Charlie', 'Bravo', 'Alpha', BLANK])
    expect(labels(reportItems('DT-3', reportSorted('DT-3', 'IC-124')))).toEqual([...REPORT_PROGRESS].reverse())
    expect(labels(reportItems('DT-2', reportSorted('DT-2', 'IC-124')))).toEqual(['Bob', 'Ann', BLANK])
  })

  it(`「${T_347_STATUS}」 -- the status list follows the DT-1 order both ways`, () => {
    expect(labels(reportItems('DT-1', reportSorted('DT-1', 'IC-123')))).toEqual(REPORT_STATUS_ASCENDING)
    expect(labels(reportItems('DT-1', reportSorted('DT-1', 'IC-124')))).toEqual([...REPORT_STATUS_ASCENDING].reverse())
  })

  it('the list of the sorted column reads in the order of the sorted rows', () => {
    for (const column of ['DT-4', 'DT-3', 'DT-1']) {
      for (const direction of ['IC-123', 'IC-124'] as const) {
        const sorted = reportSorted(column, direction)
        const view = reportViewOf(sorted) as unknown as Parameters<typeof distinctCells>[0]
        const rows = distinctCells(view, column).filter((one) => one !== '' && one !== wordOf('searchPanel', 'noName'))
        expect(labels(reportItems(column, sorted)).filter((one) => one !== BLANK), `${column} ${direction}`).toEqual(rows)
      }
    }
  })

  it('another column sorted, or IC-153 pressed, leaves the list ascending', () => {
    const byName = reportSorted('DT-4', 'IC-124')
    expect(labels(reportItems('DT-3', byName))).toEqual(REPORT_PROGRESS)
    const moved = reportSorted('DT-3', 'IC-123', byName)
    expect(labels(reportItems('DT-4', moved))).toEqual(REPORT_NAMES)
    const cleared = reportAfter(byName, 'IC-153', null)
    expect(cleared.view.sort, 'premise: IC-153 drops the sort').toBeNull()
    expect(labels(reportItems('DT-4', cleared))).toEqual(REPORT_NAMES)
  })
})

describe('SV-7 source -- Delay Diagnostics Report, the diagnosis table', () => {
  it.each(['DT-1', 'DT-3', 'DT-4', 'DT-2'])('%s: the first value unchecked drops its rows, stays listed unchecked, and checks back', (column) => {
    const before = reportItems(column)
    const first = found(before[0], `the first value of ${column}`).label
    const off = reportValue(column, first, false, OPENED_REPORT)
    const all = reportUids(OPENED_REPORT)
    expect(reportUids(off).length).toBeLessThan(all.length)
    expect(labels(reportItems(column, off))).toEqual(labels(before))
    expect(unchecked(reportItems(column, off))).toEqual([first])
    const back = reportValue(column, first, true, off)
    expect(reportUids(back)).toEqual(all)
  })

  it('another column keeps the values whose rows the first filter removed (answer A)', () => {
    const off = reportValue('DT-4', 'Delta', false, OPENED_REPORT)
    expect(reportUids(off), 'premise: Delta (the only 7% and the only Ann) is out of the table').not.toContain(4)
    expect(labels(reportItems('DT-3', off))).toEqual(REPORT_PROGRESS)
    expect(labels(reportItems('DT-2', off))).toEqual(['Ann', 'Bob', BLANK])
  })

  it('the list is made from the rows the word keeps (RW-3)', () => {
    const worded: ReportPane = { ...OPENED_REPORT, window: { ...OPENED_REPORT.window, panel: { ...OPENED_REPORT.window.panel, word: 'Bravo' } } }
    expect(reportUids(worded), 'premise: the word keeps Bravo only').toEqual([2])
    expect(labels(reportItems('DT-3', worded))).toEqual(['40%'])
  })

  it('after IC-126 every item is still listed, and each can be checked again one by one', () => {
    const before = reportItems('DT-4')
    let pane = reportAfter(reportOpened('DT-4'), 'IC-126', 'DT-4')
    expect(reportUids(pane)).toEqual([])
    expect(unchecked(reportItems('DT-4', pane))).toEqual(labels(before))
    for (const item of before) {
      const rows = reportUids(pane).length
      pane = reportValue('DT-4', item.label, true, pane)
      expect(labels(reportItems('DT-4', pane)), item.label).toEqual(labels(before))
      expect(reportUids(pane).length, `rows grow when ${item.label} is checked`).toBeGreaterThan(rows)
    }
    expect(reportUids(pane)).toEqual(reportUids(OPENED_REPORT))
  })
})

describe('SV-7 「空のセルは「（空白）」の 1 項目」 -- the report labels its empty values (CR-761 part C)', () => {
  it.each(['ja', 'en'] as const)('DT-2: the row with no assignee is listed under the blank word (%s)', (language) => {
    const items = reportItems('DT-2', OPENED_REPORT, language)
    expect(labels(items)).toContain(wordOf('searchPanel', 'blank', language))
    expect(labels(items)[labels(items).length - 1]).toBe(wordOf('searchPanel', 'blank', language))
    expect(labels(items)).not.toContain('')
  })

  it.each(['ja', 'en'] as const)('DT-4: the task with no name is listed under the blank word (%s)', (language) => {
    const items = reportItems('DT-4', OPENED_REPORT, language)
    expect(labels(items)[labels(items).length - 1]).toBe(wordOf('searchPanel', 'blank', language))
    expect(labels(items)).not.toContain('')
    expect(labels(items)).not.toContain(wordOf('searchPanel', 'noName', language))
  })
})

const DEE = 104
const UNNAMED = 105
const RESOURCE_TASKS = [1, 2, 3, 4, 5, 6, 7, 8]
// WHY: the scene of the CR's question Q1, plus one nameless resource for a blank name item.
const PAIRS: readonly (readonly [number, number])[] = [
  [1, ANN], [2, ANN], [3, ANN],
  [1, BOB], [2, BOB], [3, BOB], [4, BOB], [5, BOB],
  [3, DEE], [4, DEE], [8, DEE],
  [8, UNNAMED],
]
const RESOURCE_SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: RESOURCE_TASKS.map((uid) => ({
    ...firstOf('tasks'),
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name: `Task ${String(uid)}`,
    start: D(`2026-04-0${String(uid)}`),
    finish: D(`2026-04-0${String(uid)}`),
    milestone: false,
    percentComplete: 0,
    dependencies: [],
    notes: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
  })),
  resources: [
    { ...firstOf('resources'), uid: ANN, name: 'Ann' },
    { ...firstOf('resources'), uid: BOB, name: 'Bob' },
    { ...firstOf('resources'), uid: DEE, name: 'Dee' },
    { ...firstOf('resources'), uid: UNNAMED, name: '' },
  ],
  assignments: PAIRS.map(([taskUid, resourceUid], at) => ({ ...firstOf('assignments'), uid: 3000 + at, taskUid, resourceUid })),
  taskGroups: [{ ...firstOf('taskGroups'), id: G_ONE, parentId: null, order: 0, label: 'Row', derivedFromTaskUid: null, treeState: 'expanded' }],
  taskGroupMembers: RESOURCE_TASKS.map((uid) => ({ taskUid: uid, groupId: G_ONE })),
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const UNASSIGNED = wordOf('resourceList', 'unassigned')

type ResourceWindow = typeof OPENED_RESOURCE_LIST
interface ListPane {
  readonly window: ResourceWindow
  readonly view: TableView
}
interface ListView {
  readonly columns: readonly { readonly column: string }[]
  readonly rows: readonly { readonly cells: readonly string[] }[]
  readonly filterMenu: unknown
}

const OPENED_LIST: ListPane = { window: OPENED_RESOURCE_LIST, view: NO_VIEW }

const listViewOf = (pane: ListPane): ListView =>
  found(
    resourceListFromWindow(sessionIn('ja'), pane.window, pane.view, RESOURCE_SCHEDULE, [], { canvas: CANVAS, textSizeStep: 1 } as never),
    'a view of the Resource List',
  ) as unknown as ListView

function listAfter(pane: ListPane, entry: string, column: string | null): ListPane {
  const after = found(
    resourceListAfterEntry(pane.window, pane.view, entry as never, column, { schedule: RESOURCE_SCHEDULE, chosenResourceUids: [], language: 'ja' } as never),
    `the Resource List after ${entry}`,
  ) as unknown as { window: ResourceWindow | null; view: TableView }
  return { window: found(after.window, `the Resource List window after ${entry}`), view: after.view }
}

const listShut = (pane: ListPane): ListPane => ({
  ...pane,
  window: { ...pane.window, panel: { ...pane.window.panel, filters: { ...pane.window.panel.filters, open: null } } },
})
const listOpened = (column: string, pane: ListPane = OPENED_LIST): ListPane => listAfter(listShut(pane), 'IC-122', column)
const listItems = (column: string, pane: ListPane = OPENED_LIST): readonly MenuItem[] => itemsOf(listViewOf(listOpened(column, pane)).filterMenu, column)
const listSorted = (column: string, direction: 'IC-123' | 'IC-124', pane: ListPane = OPENED_LIST): ListPane =>
  listAfter(listOpened(column, pane), direction, column)

function listValue(column: string, label: string, isShown: boolean, pane: ListPane): ListPane {
  const there = listOpened(column, pane)
  const item = found(itemsOf(listViewOf(there).filterMenu, column).find((one) => one.label === label), `${label} in ${column}`)
  return { window: there.window, view: resourceListAfterFilterChange(there.window, there.view, { kind: 'value', column, value: item.value, isShown } as never) as unknown as TableView }
}

const listNames = (pane: ListPane): readonly string[] => {
  const view = listViewOf(pane)
  const at = view.columns.findIndex((one) => one.column === 'RQ-2')
  return view.rows.map((row) => row.cells[at] ?? '')
}

const LIST_NAMES_ASCENDING = ['Ann', 'Bob', 'Dee', UNASSIGNED, BLANK]

describe('SV-7 order -- Resource List (FR-099: the Search Panel behaviour, T-370 / T-371)', () => {
  it('with no sort the lists are ascending, the counts by number (RQ-4), the blank last', () => {
    const names = labels(listItems('RQ-2'))
    expect(names[names.length - 1]).toBe(BLANK)
    expect([...names].sort()).toEqual([...LIST_NAMES_ASCENDING].sort())
    expect(labels(listItems('RQ-4'))).toEqual(['1', '2', '3', '5'])
  })

  it('IC-124 reverses the list of the sorted column and keeps the blank last', () => {
    expect(labels(listItems('RQ-4', listSorted('RQ-4', 'IC-124')))).toEqual(['5', '3', '2', '1'])
    const ascending = labels(listItems('RQ-2')).filter((one) => one !== BLANK)
    expect(labels(listItems('RQ-2', listSorted('RQ-2', 'IC-124')))).toEqual([...[...ascending].reverse(), BLANK])
  })

  it('the list of the sorted column reads in the order of the sorted rows', () => {
    for (const column of ['RQ-2', 'RQ-4']) {
      for (const direction of ['IC-123', 'IC-124'] as const) {
        const sorted = listSorted(column, direction)
        const rows = distinctCells(listViewOf(sorted), column).filter((one) => one !== '' && one !== wordOf('searchPanel', 'noName'))
        expect(labels(listItems(column, sorted)).filter((one) => one !== BLANK), `${column} ${direction}`).toEqual(rows)
      }
    }
  })

  it('another column sorted, or IC-153 pressed, leaves the list ascending', () => {
    const byCount = listSorted('RQ-4', 'IC-124')
    const ascending = labels(listItems('RQ-2'))
    expect(labels(listItems('RQ-2', byCount))).toEqual(ascending)
    const moved = listSorted('RQ-2', 'IC-124', byCount)
    expect(labels(listItems('RQ-4', moved))).toEqual(['1', '2', '3', '5'])
    const cleared = listAfter(byCount, 'IC-153', null)
    expect(cleared.view.sort, 'premise: IC-153 drops the sort').toBeNull()
    expect(labels(listItems('RQ-4', cleared))).toEqual(['1', '2', '3', '5'])
  })
})

describe('SV-7 source -- Resource List, the scene of CR-761 Q1 (answer A)', () => {
  it('(1) Bob unchecked: the table drops Bob, the name list keeps Bob unchecked, and Bob checks back', () => {
    const off = listValue('RQ-2', 'Bob', false, OPENED_LIST)
    expect(listNames(off)).not.toContain('Bob')
    expect(listNames(off).length).toBe(listNames(OPENED_LIST).length - 1)
    expect(labels(listItems('RQ-2', off))).toEqual(labels(listItems('RQ-2')))
    expect(unchecked(listItems('RQ-2', off))).toEqual(['Bob'])
    expect(listNames(listValue('RQ-2', 'Bob', true, off))).toEqual(listNames(OPENED_LIST))
  })

  it('(2) with Bob unchecked the count list still holds 5, the count only Bob has', () => {
    const off = listValue('RQ-2', 'Bob', false, OPENED_LIST)
    expect(labels(listItems('RQ-4', off))).toEqual(['1', '2', '3', '5'])
  })

  it('(3) the word "Ann" leaves Ann alone in the name list', () => {
    const worded: ListPane = { ...OPENED_LIST, window: { ...OPENED_LIST.window, panel: { ...OPENED_LIST.window.panel, word: 'Ann' } } }
    expect(listNames(worded), 'premise: the word keeps Ann only').toEqual(['Ann'])
    expect(labels(listItems('RQ-2', worded))).toEqual(['Ann'])
  })

  // WHY: RQ-5 lists one task per item, and a row keeps while any of its tasks stays checked, so no row need drop there.
  it.each([
    ['RQ-2', true],
    ['RQ-3', true],
    ['RQ-4', true],
    ['RQ-5', false],
  ] as const)('%s: the first value unchecked stays listed unchecked, and the rows come back', (column, drops) => {
    const before = listItems(column)
    const first = found(before[0], `the first value of ${column}`).label
    const off = listValue(column, first, false, OPENED_LIST)
    if (drops) expect(listNames(off).length).toBeLessThan(listNames(OPENED_LIST).length)
    expect(labels(listItems(column, off))).toEqual(labels(before))
    expect(unchecked(listItems(column, off))).toEqual([first])
    expect(listNames(listValue(column, first, true, off))).toEqual(listNames(OPENED_LIST))
  })

  it('after IC-126 every item is still listed, and each can be checked again one by one', () => {
    const before = listItems('RQ-4')
    let pane = listAfter(listOpened('RQ-4'), 'IC-126', 'RQ-4')
    expect(listNames(pane)).toEqual([])
    expect(unchecked(listItems('RQ-4', pane))).toEqual(labels(before))
    for (const item of before) {
      const rows = listNames(pane).length
      pane = listValue('RQ-4', item.label, true, pane)
      expect(labels(listItems('RQ-4', pane)), item.label).toEqual(labels(before))
      expect(listNames(pane).length, `rows grow when ${item.label} is checked`).toBeGreaterThan(rows)
    }
    expect(listNames(pane)).toEqual(listNames(OPENED_LIST))
  })
})

// WHY: the fake browser raises no change event on a host check box, so one value is not unchecked here;
// the drawn IC-126 / IC-125 buttons stand in, and the system test unchecks one value.
const fixView = (stage: WindowStage): { columns: readonly { column: string }[]; rows: readonly { cells: readonly string[] }[]; filterMenu: unknown } =>
  found(stage.last().delayDiagnosticsReport, 'the report window view') as never

// WHY: the drawn window swaps a table in place with the DOM's replaceWith, which the fake browser does not carry.
const fakePrototype = FakeElement.prototype as unknown as { replaceWith?: (this: FakeElement, ...nodes: FakeElement[]) => void }
if (fakePrototype.replaceWith === undefined) {
  fakePrototype.replaceWith = function replaceWith(this: FakeElement, ...nodes: FakeElement[]): void {
    const parent = this.parentNode
    if (parent === null) return
    for (const node of nodes) parent.insertBefore(node, this)
    this.remove()
  }
}

const drawn = (stage: WindowStage): FakeElement[] => selfAndDescendants(stage.built.root())

async function clickEntry(stage: WindowStage, icon: string): Promise<void> {
  await stage.clickOn(found(drawn(stage).find((one) => one.getAttribute('data-icon') === icon), `the drawn entrance ${icon}`))
}

async function openFixFilter(stage: WindowStage, column: string): Promise<readonly MenuItem[]> {
  if ((fixView(stage).filterMenu as { column?: string } | null)?.column === column) return itemsOf(fixView(stage).filterMenu, column)
  await stage.clickOn(found(drawn(stage).find((one) => one.getAttribute('data-search-filter-column') === column && one.tagName === 'BUTTON'), `the IC-122 of ${column}`))
  return itemsOf(fixView(stage).filterMenu, column)
}

async function proposalsStage(): Promise<WindowStage> {
  const stage = await windowStage(MIXED())
  await stage.press('IC-107')
  await stage.press('IC-155')
  return stage
}

const fixRowsOf = (stage: WindowStage, column: string): readonly string[] => {
  const view = fixView(stage)
  const at = view.columns.findIndex((one) => one.column === column)
  return view.rows.map((row) => row.cells[at] ?? '')
}

describe('T-374 「⭐ 並べ替え・列のフィルタ…は RW-9・RW-10 と同じ作り」 -- the fix proposals table', () => {
  it('premise: the proposals of the document hold three tasks and a blank before-value', async () => {
    const stage = await proposalsStage()
    expect(fixView(stage).columns.map((one) => one.column)).toContain('FM-5')
    expect(labels(await openFixFilter(stage, 'FM-5'))).toEqual(['Task 1', 'Task 5', 'Task 6'])
    expect(labels(await openFixFilter(stage, 'FM-7'))).toContain(BLANK)
  })

  it('A: IC-124 reverses the list of the sorted column', async () => {
    const stage = await proposalsStage()
    await openFixFilter(stage, 'FM-5')
    await clickEntry(stage, 'IC-124')
    expect(labels(itemsOf(fixView(stage).filterMenu, 'FM-5'))).toEqual(['Task 6', 'Task 5', 'Task 1'])
  })

  it(`A: FM-7 sorted by IC-124 keeps its blank item last (FM-7 writes an empty value as ${BLANK})`, async () => {
    const stage = await proposalsStage()
    const before = labels(await openFixFilter(stage, 'FM-7'))
    expect(before[before.length - 1], 'premise: ascending, the blank is last').toBe(BLANK)
    await clickEntry(stage, 'IC-124')
    const after = labels(itemsOf(fixView(stage).filterMenu, 'FM-7'))
    expect(after[after.length - 1]).toBe(BLANK)
    expect(after.filter((one) => one !== BLANK)).toEqual([...before.filter((one) => one !== BLANK)].reverse())
  })

  it('A: the list of the sorted column reads in the order of the sorted rows', async () => {
    for (const column of ['FM-3', 'FM-5']) {
      for (const direction of ['IC-123', 'IC-124']) {
        const stage = await proposalsStage()
        await openFixFilter(stage, column)
        await clickEntry(stage, direction)
        const rows: string[] = []
        for (const cell of fixRowsOf(stage, column)) if (cell !== '' && !rows.includes(cell)) rows.push(cell)
        expect(labels(itemsOf(fixView(stage).filterMenu, column)).filter((one) => one !== BLANK), `${column} ${direction}`).toEqual(rows)
      }
    }
  })

  it('A: another column sorted, or IC-153 pressed, leaves the list ascending', async () => {
    const stage = await proposalsStage()
    await openFixFilter(stage, 'FM-5')
    await clickEntry(stage, 'IC-124')
    await openFixFilter(stage, 'FM-3')
    await clickEntry(stage, 'IC-123')
    expect(labels(await openFixFilter(stage, 'FM-5'))).toEqual(['Task 1', 'Task 5', 'Task 6'])
    await clickEntry(stage, 'IC-124')
    expect(labels(itemsOf(fixView(stage).filterMenu, 'FM-5')), 'premise: reversed again').toEqual(['Task 6', 'Task 5', 'Task 1'])
    await clickEntry(stage, 'IC-153')
    expect(labels(await openFixFilter(stage, 'FM-5'))).toEqual(['Task 1', 'Task 5', 'Task 6'])
  })

  it('B: after IC-126 every item is still listed unchecked, another column keeps its values, and IC-125 brings the rows back', async () => {
    const stage = await proposalsStage()
    const rows = fixView(stage).rows.length
    const methods = labels(await openFixFilter(stage, 'FM-3'))
    await openFixFilter(stage, 'FM-5')
    await clickEntry(stage, 'IC-126')
    expect(fixView(stage).rows).toHaveLength(0)
    const after = itemsOf(fixView(stage).filterMenu, 'FM-5')
    expect(labels(after)).toEqual(['Task 1', 'Task 5', 'Task 6'])
    expect(unchecked(after)).toEqual(['Task 1', 'Task 5', 'Task 6'])
    expect(labels(await openFixFilter(stage, 'FM-3')), 'the rows FM-5 removed still give their values').toEqual(methods)
    await openFixFilter(stage, 'FM-5')
    await clickEntry(stage, 'IC-125')
    expect(fixView(stage).rows).toHaveLength(rows)
    expect(unchecked(itemsOf(fixView(stage).filterMenu, 'FM-5'))).toEqual([])
  })
})
