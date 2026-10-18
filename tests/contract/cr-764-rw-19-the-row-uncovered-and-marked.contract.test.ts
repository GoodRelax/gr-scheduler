// CR-764 spec-only contract: what the report window does with the row of a pressed diagnosis marker (RW-19 steps 2 to 4).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  diagnosisRowAskedOf,
  type HumanInput,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportAfterFilterChange,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import { delayDiagnosticsReportShowingRow } from '../../src/adapter/screen-renderer/screen-renderer'
import { isWorkingFilter } from '../../src/adapter/screen-renderer/table-window'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenSession, TableView } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { CANVAS, NO_VIEW, found } from './cr-721-stage'
import { specTable, unbroken } from './spec-table'

const RW_19_STEPS_IN_ORDER =
  '遅延診断レポートの窓が開いているあいだ（最小化（`IC-129`）を含む —— `RW-1`）、日程表で `FR-133` の 表 T-315 の `DG-1` 〜 `DG-3` で描いた進捗マーカー（表 T-266 の `GA-18`）を押して離したとき、そのタスクの行に下の ④ のいまの行の印が付いていなければ、状態を巡らせず（表 T-270 の `PE-8`・`PE-10` の例外）、次をこの順に行うこと（MUST）'
const RW_19_SECOND = '② 診断結果の表（`RW-11` の `IC-154`）を出していなければ出す'
const RW_19_THIRD =
  '③ そのタスクの行が語（`RW-3`）か列のフィルタ（`FR-151` の 表 T-330 の `SV-7`）で隠れていれば、その行を隠している条件だけを外す —— 語が行に合わなければ語を空にし、行の値を外している列のフィルタではその値にチェックを入れ直し、行の日付を範囲の外に置く日付の列（`DT-5`・`DT-6`）のフィルタではその列の範囲を外す。'
const RW_19_OTHERS_KEPT = 'ほかの列のフィルタと並べ替えは変えない'
const RW_19_FOURTH = '④ 行を表の中に送り、`RW-14` と同じいまの行の印を付ける。'
const RW_19_ONE_MARK = '⚠️ いまの行の印は表に 1 つで、次に別のタスクのマーカーで ① 〜 ④ を行うまで残る —— 巡らせる押下は印を動かさない。'
const RW_19_FIXES_STILL = '⚠️ 修正案の表とそのいまの行（`RW-14`）は動かさない（利用者が定めた）。'
const T_347_ONE_ROW = '1 つの `Task` は 1 行で、上の順で先に当たるものを出す'

type Loose = Record<string, unknown>
interface PublishedEntry {
  readonly name: string
  readonly note?: { readonly ja?: readonly string[] }
}

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const PUBLISHED = JSON.parse(readFileSync(join(SPEC, '_source', 'published-entries.json'), 'utf8')) as unknown

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(found(specTable(table).rows.find((one) => one.id === id), `${table} ${id}`).by[heading] ?? '')

// WHY: the published-entries book is a tree of modules; the entry is found by its name wherever it sits.
function publishedNoteOf(name: string): string {
  const seen: PublishedEntry[] = []
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) for (const one of node) walk(one)
    else if (node !== null && typeof node === 'object') {
      const entry = node as PublishedEntry
      if (entry.name === name && entry.note !== undefined) seen.push(entry)
      for (const value of Object.values(node as Loose)) walk(value)
    }
  }
  walk(PUBLISHED)
  return found(seen[0], `the published entry ${name}`).note?.ja?.join('') ?? ''
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose

const ANN = 101
const BOB = 102

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

// WHY: one row per status of T-347's DT-1, with names, progress values and starting days that tell them apart.
const SCHEDULE = {
  tasks: [
    reportTask(1, 'Alpha', '2026-03-02'),
    reportTask(2, 'Bravo', '2026-01-05', { percentComplete: 40, actualStart: '2026-01-05T08:00:00' }),
    reportTask(3, 'Charlie', '2026-02-02', { percentComplete: 25 }),
    reportTask(4, 'Delta', '2026-01-01', { percentComplete: 7 }),
    reportTask(5, 'Echo', '2026-01-01', { actualStart: '2026-01-01T08:00:00', actualFinish: '2026-01-09T17:00:00', percentComplete: 100 }),
  ],
  project: { minutesPerDay: null },
  resources: [
    { ...firstOf('resources'), uid: ANN, name: 'Ann' },
    { ...firstOf('resources'), uid: BOB, name: 'Bob' },
  ],
  assignments: [
    { ...firstOf('assignments'), uid: 3001, taskUid: 3, resourceUid: ANN },
    { ...firstOf('assignments'), uid: 3002, taskUid: 2, resourceUid: BOB },
  ],
} as unknown as Schedule

const QUANTITIES = { inheritedDelayMinutes: 480, selfDelayMinutes: 960, pushOutMinutes: 2400, terminalsReached: 2 }

const REPORT = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [{ row: 'VC-3', kind: 'contradiction', layer: 1, uid: 1, name: 'Alpha', values: { start: '2026-03-02' }, proposedActualFinish: null }],
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

const ROWS = { report: REPORT, schedule: SCHEDULE, language: 'ja' as const }

interface Pane {
  readonly window: DelayDiagnosticsReportWindow
  readonly view: TableView
}

const OPENED: Pane = { window: OPENED_DELAY_DIAGNOSTICS_REPORT, view: NO_VIEW }

const viewOf = (pane: Pane): DelayDiagnosticsReportView =>
  found(
    delayDiagnosticsReportFromWindow({ screen: { screenLanguage: 'ja' } } as unknown as ScreenSession, pane.window, pane.view, REPORT, SCHEDULE, {
      canvas: CANVAS,
      textSizeStep: 1,
    }),
    'a view of the report window',
  )

function after(pane: Pane, entry: string, column: string | null = null): Pane {
  const next = found(delayDiagnosticsReportAfterEntry(pane.window, pane.view, entry as never, column, ROWS), `the report after ${entry}`)
  return { window: found(next.window, `the report window after ${entry}`), view: next.view }
}

const shut = (pane: Pane): Pane => ({
  ...pane,
  window: { ...pane.window, panel: { ...pane.window.panel, filters: { ...pane.window.panel.filters, open: null } } },
})

type MenuItem = { readonly value: string; readonly label: string; readonly isShown: boolean }

function itemsOf(pane: Pane, column: string): readonly MenuItem[] {
  const menu = viewOf(after(shut(pane), 'IC-122', column)).filterMenu as { kind: string; values?: readonly MenuItem[] } | null
  const open = found(menu, `an open filter on ${column}`)
  if (open.kind !== 'values' || open.values === undefined) throw new Error(`the open filter of ${column} is ${open.kind}`)
  return open.values
}

function valuesOff(pane: Pane, column: string, labels: readonly string[]): Pane {
  return labels.reduce<Pane>((made, label) => {
    const there = after(shut(made), 'IC-122', column)
    const item = found(itemsOf(made, column).find((one) => one.label === label), `${label} in ${column}`)
    const view = delayDiagnosticsReportAfterFilterChange(there.window, there.view, { kind: 'value', column, value: item.value, isShown: false } as never)
    return { window: shut(there).window, view: view as TableView }
  }, pane)
}

function since(pane: Pane, column: string, day: string): Pane {
  const there = after(shut(pane), 'IC-122', column)
  const view = delayDiagnosticsReportAfterFilterChange(there.window, there.view, { kind: 'bound', column, bound: 'since', day } as never)
  return { window: shut(there).window, view: view as TableView }
}

const withWord = (pane: Pane, word: string): Pane => ({ ...pane, window: { ...pane.window, panel: { ...pane.window.panel, word } } })

function shown(pane: Pane, taskUid: number): Pane {
  const next = found(delayDiagnosticsReportShowingRow(pane.window, pane.view, taskUid, ROWS), `the window showing Task ${String(taskUid)}`)
  return { window: next.window, view: next.view }
}

const uidsOf = (pane: Pane): readonly number[] =>
  viewOf(pane).rows.map((row) => ('target' in row && row.target.kind === 'task' ? row.target.taskUid : -1))
const currentOf = (pane: Pane): readonly number[] =>
  viewOf(pane).rows.flatMap((row) => ('isCurrent' in row && row.isCurrent === true && row.target.kind === 'task' ? [row.target.taskUid] : []))
// see RW-11
const chosenTabOf = (pane: Pane): string | null => (viewOf(pane).tabEntries ?? []).find((one) => one.isChosen)?.icon ?? null
const workingColumns = (view: TableView): readonly string[] => view.columnFilters.filter(isWorkingFilter).map((one) => one.column)
const filterOn = (view: TableView, column: string): TableView['columnFilters'][number] | undefined =>
  view.columnFilters.find((one) => one.column === column && isWorkingFilter(one))

describe('CR-764 -- the clauses this file is driven by', () => {
  it('T-346 RW-19, T-347 and the published entries still read this way', () => {
    const rw19 = cellOf('T-346', 'RW-19', '定め')
    for (const clause of [RW_19_STEPS_IN_ORDER, RW_19_SECOND, RW_19_THIRD, RW_19_OTHERS_KEPT, RW_19_FOURTH, RW_19_ONE_MARK, RW_19_FIXES_STILL]) {
      expect(rw19, clause).toContain(clause)
    }
    expect(REQUIREMENTS).toContain(T_347_ONE_ROW)
    expect(publishedNoteOf('delayDiagnosticsReportShowingRow')).toContain('表に行が無ければ `null`。')
    expect(publishedNoteOf('diagnosisRowAskedOf')).toContain('ほかの入力は `null`。')
  })
})

describe(`RW-19 -- ${RW_19_STEPS_IN_ORDER}`, () => {
  it(`premise: every task of the fixture has its row, and the plain window marks none`, () => {
    expect([...uidsOf(OPENED)].sort()).toEqual([1, 2, 3, 4, 5])
    expect(currentOf(OPENED)).toEqual([])
    expect(viewOf(OPENED).rowRevealed ?? null).toBeNull()
  })

  it(`④ ${RW_19_FOURTH} -- the row of the task carries the mark, and no other row does`, () => {
    for (const uid of [1, 2, 3]) {
      const marked = shown(OPENED, uid)
      expect(currentOf(marked), `Task ${String(uid)}`).toEqual([uid])
      const view = viewOf(marked)
      const at = view.rows.findIndex((row) => 'isCurrent' in row && row.isCurrent === true)
      expect(view.rowRevealed, 'the table is told which row to move into view').toEqual({ at, count: 1 })
    }
  })

  it(`${RW_19_ONE_MARK} -- a second press moves the one mark, and each press is told again`, () => {
    const first = shown(OPENED, 1)
    const second = shown(first, 3)
    expect(currentOf(second)).toEqual([3])
    const again = shown(second, 3)
    expect(currentOf(again)).toEqual([3])
    expect(viewOf(again).rowRevealed?.count, 'the same row pressed again is moved into view again').toBeGreaterThan(viewOf(second).rowRevealed?.count ?? 0)
  })

  it(`② ${RW_19_SECOND} -- from the fix table the window comes back to the diagnosis table`, () => {
    const onFixes = after(OPENED, 'IC-155')
    expect(viewOf(onFixes).rowRevealed ?? null, 'no row is revealed while the fix table is shown').toBeNull()
    const marked = shown(onFixes, 2)
    expect(chosenTabOf(onFixes), 'premise: the fix table is shown').toBe('IC-155')
    expect(chosenTabOf(marked)).toBe('IC-154')
    expect(currentOf(marked)).toEqual([2])
  })

  it(`${RW_19_ONE_MARK} -- the mark stays through a turn to the fix table and back, and is not revealed while the fix table is shown`, () => {
    const marked = shown(OPENED, 3)
    const onFixes = after(marked, 'IC-155')
    expect(viewOf(onFixes).rowRevealed ?? null).toBeNull()
    const back = after(onFixes, 'IC-154')
    expect(currentOf(back)).toEqual([3])
  })

  it(`③ the word: a word the row does not hold is emptied (${RW_19_THIRD.slice(0, 40)}...)`, () => {
    const hidden = withWord(OPENED, 'Alpha')
    expect(uidsOf(hidden)).not.toContain(3)
    const marked = shown(hidden, 3)
    expect(marked.window.panel.word).toBe('')
    expect(uidsOf(marked)).toContain(3)
    expect(currentOf(marked)).toEqual([3])
  })

  it('③ the word: a word the row holds is kept', () => {
    const kept = shown(withWord(OPENED, 'Char'), 3)
    expect(kept.window.panel.word).toBe('Char')
    expect(uidsOf(kept)).toEqual([3])
  })

  it(`③ a value list: only the row's own value is checked again, the other unchecked values stay off -- ${RW_19_OTHERS_KEPT}`, () => {
    const hidden = valuesOff(OPENED, 'DT-4', ['Charlie', 'Bravo'])
    expect(uidsOf(hidden)).not.toContain(3)
    const marked = shown(hidden, 3)
    expect(uidsOf(marked)).toContain(3)
    expect(uidsOf(marked), 'Bravo is still off').not.toContain(2)
    const unchecked = itemsOf(marked, 'DT-4').filter((one) => !one.isShown).map((one) => one.label)
    expect(unchecked).toEqual(['Bravo'])
  })

  it(`③ ${RW_19_OTHERS_KEPT} -- a filter on another column that leaves the row in, and the sort, are untouched`, () => {
    const sorted = after(after(shut(OPENED), 'IC-122', 'DT-4'), 'IC-124', 'DT-4')
    const hidden = valuesOff(valuesOff(sorted, 'DT-3', ['40%']), 'DT-4', ['Charlie'])
    expect(uidsOf(hidden)).not.toContain(3)
    const marked = shown(hidden, 3)
    expect(marked.view.sort).toEqual(hidden.view.sort)
    expect(filterOn(marked.view, 'DT-3')).toEqual(filterOn(hidden.view, 'DT-3'))
    expect(filterOn(marked.view, 'DT-4'), 'the only value it took off is back, so nothing is left to filter').toBeUndefined()
    expect(uidsOf(marked)).toContain(3)
    expect(uidsOf(marked), 'Bravo stays hidden by the progress filter').not.toContain(2)
  })

  // WHY: CR-798 -- the Visibility column (DT-8) holds no value list and no column filter, so an unchecked row never hides a row from the list
  // and the jump neither checks nor unchecks it (the checks are the Schedule Filter's, SJ-0).
  it('③ the Visibility column (DT-8) hides no row: an unchecked row stays in the list and the jump leaves the checks as they were', () => {
    const checkedOne: Pane = { ...OPENED, view: { ...OPENED.view, visibility: { ...OPENED.view.visibility, shownTaskUids: [1] } } }
    expect(uidsOf(checkedOne), 'Task 3 is unchecked and still listed').toContain(3)
    const marked = shown(checkedOne, 3)
    expect(uidsOf(marked)).toContain(3)
    expect(filterOn(marked.view, 'DT-8')).toBeUndefined()
    expect(marked.view.visibility.shownTaskUids).toEqual([1])
  })

  it('③ a multi-person column: a row still shown through another of its values keeps the filter as it is', () => {
    const hidden = valuesOff(OPENED, 'DT-2', ['Bob'])
    const marked = shown(hidden, 3)
    expect(filterOn(marked.view, 'DT-2')).toEqual(filterOn(hidden.view, 'DT-2'))
  })

  it('③ a date column whose range leaves the row out loses its range (DT-5)', () => {
    const hidden = since(OPENED, 'DT-5', '2026-02-15')
    expect(uidsOf(hidden)).not.toContain(3)
    const marked = shown(hidden, 3)
    expect(filterOn(marked.view, 'DT-5')).toBeUndefined()
    expect(uidsOf(marked)).toContain(3)
  })

  it('③ a date range that leaves the row in is kept (DT-5)', () => {
    const narrowed = since(OPENED, 'DT-5', '2026-02-15')
    expect(uidsOf(narrowed)).toContain(1)
    const marked = shown(narrowed, 1)
    expect(filterOn(marked.view, 'DT-5')).toEqual(filterOn(narrowed.view, 'DT-5'))
  })

  it('③ a date range on DT-6 that leaves the row out loses its range', () => {
    const hidden = since(OPENED, 'DT-6', '2026-01-06')
    expect(uidsOf(hidden)).not.toContain(2)
    const marked = shown(hidden, 2)
    expect(filterOn(marked.view, 'DT-6')).toBeUndefined()
    expect(uidsOf(marked)).toContain(2)
  })

  it('③ everything at once: word, a value list and a date range all hiding the row; each comes off and the row is shown', () => {
    const hidden = withWord(since(valuesOff(valuesOff(OPENED, 'DT-3', ['25%', '7%']), 'DT-2', ['Ann']), 'DT-5', '2026-03-01'), 'Delta')
    expect(uidsOf(hidden)).not.toContain(3)
    const marked = shown(hidden, 3)
    expect(uidsOf(marked)).toContain(3)
    expect(currentOf(marked)).toEqual([3])
    expect(itemsOf(marked, 'DT-3').filter((one) => !one.isShown).map((one) => one.label)).toEqual(['7%'])
    expect(workingColumns(marked.view)).not.toContain('DT-5')
  })

  it(`the published note: ${'表に行が無ければ `null`。'}`, () => {
    expect(delayDiagnosticsReportShowingRow(OPENED.window, OPENED.view, 999, ROWS)).toBeNull()
  })
})

describe('PI-18 diagnosisRowAskedOf -- the published note: only a released press on a diagnosis marker answers', () => {
  const PRESS_AT = { kind: 'pointer', phase: 'down', button: 'left', x: 200, y: 120, modifiers: { ctrl: false, shift: false, alt: false, meta: false }, clickCount: 1 }
  const release = (dx = 0): HumanInput => ({ ...PRESS_AT, phase: 'up', x: PRESS_AT.x + dx }) as unknown as HumanInput
  const OPEN_REPORT = { shown: 'normal', isInFront: true, markedRowTaskUid: null }
  const contextOf = (taskUid: number, marked: readonly number[], grab = 'GA-18', report: unknown = undefined): InputContext =>
    ({
      pressed: { at: PRESS_AT, hit: { grab, item: { kind: 'task', taskUid } }, on: null, pressRow: 'PTD-3' },
      dualCursorFollowing: null,
      selection: { items: [] },
      screen: { armModeState: null },
      diagnosisMarkedTaskUids: new Set(marked),
      delayDiagnosticsReport: report,
    }) as unknown as InputContext

  it('a release on the marker of a task drawn as DG-1 to DG-3 answers that task while the report is open and the row is not marked', () => {
    expect(diagnosisRowAskedOf(release(), contextOf(21, [21, 40], 'GA-18', OPEN_REPORT))).toBe(21)
    expect(diagnosisRowAskedOf(release(), contextOf(21, [21, 40], 'GA-18', { ...OPEN_REPORT, shown: 'minimized' }))).toBe(21)
    expect(diagnosisRowAskedOf(release(), contextOf(21, [21, 40], 'GA-18', { ...OPEN_REPORT, markedRowTaskUid: 40 }))).toBe(21)
  })

  it('the same release answers null with the report closed, or with the row of that task marked', () => {
    expect(diagnosisRowAskedOf(release(), contextOf(21, [21, 40]))).toBeNull()
    expect(diagnosisRowAskedOf(release(), contextOf(21, [21, 40], 'GA-18', null))).toBeNull()
    expect(diagnosisRowAskedOf(release(), contextOf(21, [21, 40], 'GA-18', { ...OPEN_REPORT, markedRowTaskUid: 21 }))).toBeNull()
  })

  it('a release on a marker not drawn as DG-1 to DG-3 answers null (DG-4 and plain markers cycle)', () => {
    expect(diagnosisRowAskedOf(release(), contextOf(31, [21, 40], 'GA-18', OPEN_REPORT))).toBeNull()
    expect(diagnosisRowAskedOf(release(), contextOf(31, [], 'GA-18', OPEN_REPORT))).toBeNull()
  })

  it('a pull (a release past the drag threshold) answers null -- the pull is unchanged', () => {
    expect(diagnosisRowAskedOf(release(80), contextOf(21, [21], 'GA-18', OPEN_REPORT))).toBeNull()
  })

  it('a release on another grab of the task answers null', () => {
    expect(diagnosisRowAskedOf(release(), contextOf(21, [21], 'GA-1', OPEN_REPORT))).toBeNull()
  })

  it('the press itself, a key, and a release with no press answer null', () => {
    expect(diagnosisRowAskedOf(PRESS_AT as unknown as HumanInput, contextOf(21, [21], 'GA-18', OPEN_REPORT))).toBeNull()
    expect(diagnosisRowAskedOf({ kind: 'key', phase: 'down', key: 'a', code: 'KeyA', modifiers: PRESS_AT.modifiers } as unknown as HumanInput, contextOf(21, [21], 'GA-18', OPEN_REPORT))).toBeNull()
    expect(diagnosisRowAskedOf(release(), { ...contextOf(21, [21], 'GA-18', OPEN_REPORT), pressed: null })).toBeNull()
  })
})
