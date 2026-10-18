// see CR-801 SQ-10 DT-8 RQ-1 TV-2 TV-5 TV-6 UN-20 JDG-2826

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterFilterChange,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import type { DisplayLanguage, SearchFilterChange, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import { searchPanelAfterFilterChange, searchPanelFromSession } from '../../src/adapter/screen-renderer/search-panel'
import { OPENED_RESOURCE_LIST, resourceListAfterFilterChange, resourceListFromWindow, type ResourceListView } from '../../src/adapter/screen-renderer/resource-list'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import {
  NO_ROW_CHECKED,
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
  type TableView,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { tableViewOf } from '../../src/use-case/edit-document/edit-document-settings'

import { ALPHA, BRAVO, CHARLIE, DELTA, ECHO, IDLE, SATO, TANAKA, documentText } from './cr-723-fixture'
import { specTable, unbroken } from './spec-table'

type Loose = Record<string, unknown>
type TableName = 'searchPanel' | 'delayDiagnosticsReport' | 'resourceList'
type Visibility = TableView['visibility']
type Key = number | 'unassigned'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.by[heading] ?? '')
}

const found = <T>(value: T | undefined | null, what: string): T => {
  if (value === undefined || value === null) throw new Error(`missing: ${what}`)
  return value
}

const SQ_10_TWO_STATES = '見出しのセルは、入っている・空 の 2 つの状態のチェックボックスだけである'
const SQ_10_ANY_ROW = '表の行のどれか 1 つにでもチェックが入っていれば、その行が一覧に出ていても出ていなくても入っているとし、1 つも無ければ空とする'
const SQ_10_ADD = '空のときに押すと、一覧に出ている行をすべて入れ、一覧に出ていない行は変えない'
const SQ_10_CLEAR = '入っているときに押すと、表のすべての行（語や列のフィルタで一覧に出ていない行も）のチェックを外す'
const SQ_10_RETIRED_STATES = '一覧に出ている行がすべて入っている・一部・1 つも入っていない の 3 つの状態'

// WHY: the manuscript clauses the cases below are driven by; a case that is green while the clause is gone would pin nothing.
describe('CR-801 the manuscript these cases are driven by', () => {
  it('SQ-10 says the box has two states, reads every row of the table, and presses add to the listed rows then clear every row', () => {
    const cell = cellOf('T-331', 'SQ-10', '書き方')
    expect(cell).toContain(SQ_10_TWO_STATES)
    expect(cell).toContain(SQ_10_ANY_ROW)
    expect(cell).toContain(SQ_10_ADD)
    expect(cell).toContain(SQ_10_CLEAR)
    expect(cell).not.toContain(SQ_10_RETIRED_STATES)
  })

  it('DT-8 and RQ-1 point at SQ-10 and say nothing of their own', () => {
    expect(REQUIREMENTS).toContain('| DT-8 | 表示 |')
    expect(cellOf('T-347', 'DT-8', '書き方')).toContain('表 T-331 の `SQ-10` と同じ')
    expect(cellOf('T-371', 'RQ-1', '書き方')).toContain('`DT-8` と同じ')
  })
})

const TEMPLATE_VERSION = (startupTemplate as { schemaVersion: string }).schemaVersion
const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }
const LAYOUT = { canvas: CANVAS, textSizeStep: 1 }
const UNASSIGNED = 'unassigned'

function openedFrom(text: string): Document {
  const opened = documentFromJson(text, TEMPLATE_VERSION)
  if (!opened.ok) throw new Error(`refused: ${JSON.stringify(opened.faults)}`)
  return opened.document
}

// WHY: Alpha and Charlie are Sato's, Bravo and Delta Tanaka's, Echo is nobody's and Idle carries no task (cr-723-fixture).
const DOCUMENT = openedFrom(documentText({ tableViews: undefined }))
const SCHEDULE: Schedule = DOCUMENT.schedule

const startOf = (table: TableName): TableView => tableViewOf(DOCUMENT.documentSettings, table)
const viewWith = (view: TableView, part: Partial<Visibility>): TableView => ({ ...view, visibility: { ...view.visibility, ...part } })
const sortedKeys = (keys: readonly Key[]): readonly Key[] => [...keys].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))))

const step = (session: ScreenSession, type: string): ScreenSession => advanceScreenSession(session, { type } as unknown as SessionEvent).state

function sessionIn(language: DisplayLanguage = 'ja'): ScreenSession {
  const shown = step(emptyScreenSession, 'searchEntryPressed')
  return { ...shown, screen: { ...shown.screen, screenLanguage: language, helpLanguage: language } } as unknown as ScreenSession
}

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

const REPORT_SCHEDULE = {
  tasks: [
    reportTask(ALPHA, 'Alpha', '2026-03-02'),
    reportTask(BRAVO, 'Bravo', '2026-01-05', { percentComplete: 40, actualStart: '2026-01-05T08:00:00' }),
    reportTask(CHARLIE, 'Charlie', '2026-02-02'),
  ],
  project: { minutesPerDay: null },
  resources: [],
  assignments: [],
} as unknown as Schedule

const REPORT = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [{ row: 'VC-3', kind: 'contradiction', layer: 1, uid: ALPHA, name: 'Alpha', values: { start: '2026-03-02' }, proposedActualFinish: null }],
  bottlenecks: [
    { uid: BRAVO, name: 'Bravo', inheritedDelayMinutes: 480, selfDelayMinutes: 960, pushOutMinutes: 2400, terminalsReached: 2, path: [CHARLIE, BRAVO] },
  ],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [
    { uid: ALPHA, row: 'DG-1' },
    { uid: BRAVO, row: 'DG-2' },
  ],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
} as unknown as DelayDiagnosticsReport

type ShownChange = Extract<SearchFilterChange, { readonly kind: 'shown' }>

// WHY: the three tables answer the same questions from their own views, so one adapter per table lets one case table walk all three.
interface Probe {
  readonly name: TableName
  readonly column: string
  // WHY: every row key of the table, the rows no word lists included.
  readonly everyKey: readonly Key[]
  // WHY: a word that keeps at least one row out of view and lists at least one.
  readonly narrowWord: string
  // WHY: a word that lists no row.
  readonly emptyWord: string
  readonly checkedOf: (visibility: Visibility) => readonly Key[]
  readonly visibilityOf: (keys: readonly Key[]) => Partial<Visibility>
  readonly listed: (visibility: Visibility, word: string) => readonly Key[]
  readonly heading: (visibility: Visibility, word: string) => string | undefined
  readonly press: (part: Partial<Visibility>, word: string, change: Omit<ShownChange, 'column'>) => TableView
  readonly base: TableView
}

const searchPanelOf = (word: string): SearchPanelSession => ({ ...emptySearchPanelSession, table: 'tasks', word })
const searchViewOf = (visibility: Visibility, word: string): SearchPanelView =>
  found(searchPanelFromSession(sessionIn(), searchPanelOf(word), { ...startOf('searchPanel'), visibility }, SCHEDULE, CANVAS), 'a view of the shown Search Panel')

const reportWindowOf = (word: string): DelayDiagnosticsReportWindow => ({ ...OPENED_DELAY_DIAGNOSTICS_REPORT, panel: { ...OPENED_DELAY_DIAGNOSTICS_REPORT.panel, word } })
const reportViewOf = (visibility: Visibility, word: string): DelayDiagnosticsReportView =>
  found(
    delayDiagnosticsReportFromWindow({ screen: { screenLanguage: 'ja' } } as unknown as ScreenSession, reportWindowOf(word), { ...startOf('delayDiagnosticsReport'), visibility }, REPORT, REPORT_SCHEDULE, LAYOUT),
    'a view of the report window',
  )

const listWindowOf = (word: string): typeof OPENED_RESOURCE_LIST => ({ ...OPENED_RESOURCE_LIST, panel: { ...OPENED_RESOURCE_LIST.panel, word } })
const listViewOf = (visibility: Visibility, word: string): ResourceListView =>
  found(resourceListFromWindow(sessionIn(), listWindowOf(word), { ...startOf('resourceList'), visibility }, SCHEDULE, [], LAYOUT), 'a view of the Resource List')

const taskKeyOf = (row: { readonly target: { readonly kind: string; readonly taskUid?: number } }): Key => (row.target.kind === 'task' ? (row.target.taskUid as number) : -1)
const unique = (keys: readonly Key[]): readonly Key[] => [...new Set(keys)]

const SEARCH: Probe = {
  name: 'searchPanel',
  column: 'SQ-10',
  everyKey: [ALPHA, BRAVO, CHARLIE, DELTA, ECHO],
  narrowWord: 'alpha',
  emptyWord: 'zzz-no-such-row',
  checkedOf: (v) => sortedKeys(v.shownTaskUids),
  visibilityOf: (keys) => ({ shownTaskUids: keys.filter((one): one is number => typeof one === 'number') }),
  listed: (v, word) => unique(searchViewOf(v, word).rows.map(taskKeyOf)),
  heading: (v, word) => searchViewOf(v, word).showHeading,
  press: (part, word, change) =>
    found(
      searchPanelAfterFilterChange(sessionIn(), searchPanelOf(word), viewWith(startOf('searchPanel'), part), { ...change, column: 'SQ-10' } as SearchFilterChange),
      'the view after the heading press',
    ),
  base: startOf('searchPanel'),
}

const REPORT_KEYS = unique(reportViewOf(NO_ROW_CHECKED, '').rows.map(taskKeyOf))
const REPORT_PROBE: Probe = {
  name: 'delayDiagnosticsReport',
  column: 'DT-8',
  everyKey: REPORT_KEYS,
  narrowWord: 'alpha',
  emptyWord: 'zzz-no-such-row',
  checkedOf: (v) => sortedKeys(v.shownTaskUids),
  visibilityOf: (keys) => ({ shownTaskUids: keys.filter((one): one is number => typeof one === 'number') }),
  listed: (v, word) => unique(reportViewOf(v, word).rows.map(taskKeyOf)),
  heading: (v, word) => reportViewOf(v, word).showHeading,
  press: (part, word, change) =>
    delayDiagnosticsReportAfterFilterChange(reportWindowOf(word), viewWith(startOf('delayDiagnosticsReport'), part), { ...change, column: 'DT-8' } as SearchFilterChange),
  base: startOf('delayDiagnosticsReport'),
}

const LIST_PROBE: Probe = {
  name: 'resourceList',
  column: 'RQ-1',
  everyKey: [SATO, TANAKA, IDLE, UNASSIGNED],
  narrowWord: 'Sato',
  emptyWord: 'zzz-no-such-row',
  checkedOf: (v) => sortedKeys([...v.shownResourceUids, ...(v.isUnassignedShown ? [UNASSIGNED as Key] : [])]),
  visibilityOf: (keys) => ({ shownResourceUids: keys.filter((one): one is number => typeof one === 'number'), isUnassignedShown: keys.includes(UNASSIGNED) }),
  listed: (v, word) => listViewOf(v, word).rows.map((one) => one.key as Key),
  heading: (v, word) => listViewOf(v, word).showHeading,
  press: (part, word, change) =>
    resourceListAfterFilterChange(listWindowOf(word), viewWith(startOf('resourceList'), part), { ...change, column: 'RQ-1' } as SearchFilterChange),
  base: startOf('resourceList'),
}

const PROBES: readonly Probe[] = [SEARCH, REPORT_PROBE, LIST_PROBE]

// WHY: the box raises isHeading with the listed rows as its keys; isShown is the box's new state.
const headingPress = (probe: Probe, part: Partial<Visibility>, word: string, isShown: boolean): TableView => {
  const keys = probe.listed({ ...probe.base.visibility, ...part }, word)
  return probe.press(part, word, { kind: 'shown', keys, isShown, isHeading: true })
}

// WHY: a person presses what the view shows: an empty box raises isShown true, a checked box raises isShown false.
const pressWhatIsShown = (probe: Probe, part: Partial<Visibility>, word: string): TableView => {
  const state = probe.heading({ ...probe.base.visibility, ...part }, word)
  return headingPress(probe, part, word, state === 'empty')
}

const outOfViewOf = (probe: Probe, word: string): readonly Key[] => {
  const listed = probe.listed(NO_ROW_CHECKED, word)
  return probe.everyKey.filter((one) => !listed.includes(one))
}

describe.each(PROBES)('premises of $name', (probe) => {
  it('the table lists more than one row, a word keeps some out, and another word keeps all out', () => {
    expect(probe.everyKey.length).toBeGreaterThan(1)
    expect(probe.listed(NO_ROW_CHECKED, '')).toEqual(probe.everyKey)
    const narrowed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    expect(narrowed.length).toBeGreaterThan(0)
    expect(narrowed.length).toBeLessThan(probe.everyKey.length)
    expect(probe.listed(NO_ROW_CHECKED, probe.emptyWord)).toEqual([])
  })
})

describe.each(PROBES)('FR-151 T-331 SQ-10 / T-347 DT-8 / T-371 RQ-1 ($name) -- 表のどれか 1 行にでもチェックが入っていれば入っている、1 つも無ければ空', (probe) => {
  it('SQ-10 first: no row checked, the box is empty', () => {
    expect(probe.checkedOf(probe.base.visibility)).toEqual([])
    expect(probe.heading(NO_ROW_CHECKED, '')).toBe('empty')
  })

  it('SQ-10: one row checked, the box is checked', () => {
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(probe.everyKey.slice(0, 1)) }, '')).toBe('checked')
  })

  it('SQ-10: the last row only checked, the box is checked', () => {
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(probe.everyKey.slice(-1)) }, '')).toBe('checked')
  })

  it('SQ-10: every row checked, the box is checked (no all state of its own)', () => {
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(probe.everyKey) }, '')).toBe('checked')
  })

  it('SQ-10: only rows the word keeps out of view are checked, the box is checked', () => {
    const outOfView = outOfViewOf(probe, probe.narrowWord)
    expect(outOfView.length).toBeGreaterThan(0)
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(outOfView) }, probe.narrowWord)).toBe('checked')
  })

  it('SQ-10: one row kept out of view is checked, none of the listed rows is, the box is checked', () => {
    const outOfView = outOfViewOf(probe, probe.narrowWord)
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(outOfView.slice(0, 1)) }, probe.narrowWord)).toBe('checked')
  })

  it('SQ-10: some listed rows checked and some not, the box is checked (no half state)', () => {
    expect(probe.listed(NO_ROW_CHECKED, '').length).toBeGreaterThan(1)
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(probe.everyKey.slice(0, 1)) }, '')).toBe('checked')
  })

  it('SQ-10: every listed row checked and nothing out of view checked, the box is checked', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(listed) }, probe.narrowWord)).toBe('checked')
  })

  it('SQ-10: no row listed, a row checked, the box is checked', () => {
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(probe.everyKey) }, probe.emptyWord)).toBe('checked')
  })

  it('SQ-10: no row listed, no row checked, the box is empty', () => {
    expect(probe.heading(NO_ROW_CHECKED, probe.emptyWord)).toBe('empty')
  })

  it('SQ-10: a word with no row checked leaves the box empty', () => {
    expect(probe.heading(NO_ROW_CHECKED, probe.narrowWord)).toBe('empty')
  })

  it('SQ-10: the box reads only checked or empty, whatever rows are checked and whatever the word lists', () => {
    const picks: readonly (readonly Key[])[] = [[], probe.everyKey.slice(0, 1), probe.everyKey.slice(0, 2), probe.everyKey.slice(-1), probe.everyKey]
    const states = new Set<string | undefined>()
    for (const keys of picks) {
      for (const word of ['', probe.narrowWord, probe.emptyWord]) states.add(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(keys) }, word))
    }
    expect([...states].sort()).toEqual(['checked', 'empty'])
  })

  it('SQ-10: the last checked row unchecked, the box is empty again', () => {
    const one = probe.everyKey.slice(0, 1)
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(one) }, '')).toBe('checked')
    const after = probe.press(probe.visibilityOf(one), '', { kind: 'shown', keys: one, isShown: false })
    expect(probe.checkedOf(after.visibility)).toEqual([])
    expect(probe.heading(after.visibility, '')).toBe('empty')
  })
})

describe.each(PROBES)('FR-151 T-331 SQ-10 ($name) -- 空のときに押すと、一覧に出ている行をすべて入れ、一覧に出ていない行は変えない', (probe) => {
  it('SQ-10: empty, no word, the press checks every row and the box then reads checked', () => {
    const after = pressWhatIsShown(probe, {}, '')
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey))
    expect(probe.heading(after.visibility, '')).toBe('checked')
  })

  it('SQ-10: empty, a word, the press checks the listed rows only and the rows out of view stay unchecked', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const after = headingPress(probe, {}, probe.narrowWord, true)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(listed))
    expect(probe.heading(after.visibility, probe.narrowWord)).toBe('checked')
  })

  it('SQ-10: empty, a word, the pressed view lists the same rows as before (the press changes the check list only)', () => {
    const after = headingPress(probe, {}, probe.narrowWord, true)
    expect(probe.listed(after.visibility, probe.narrowWord)).toEqual(probe.listed(NO_ROW_CHECKED, probe.narrowWord))
  })

  it('SQ-10: empty, no row listed, the press adds nothing and the box stays empty', () => {
    const after = headingPress(probe, {}, probe.emptyWord, true)
    expect(probe.checkedOf(after.visibility)).toEqual([])
    expect(probe.heading(after.visibility, probe.emptyWord)).toBe('empty')
  })

  it('SQ-10: the adding press leaves the Schedule Filter, the column filters and the sort as they were', () => {
    const after = headingPress(probe, { isScheduleFilterApplied: true }, '', true)
    expect(after.visibility.isScheduleFilterApplied).toBe(true)
    expect(after.columnFilters).toEqual(probe.base.columnFilters)
    expect(after.sort).toEqual(probe.base.sort)
  })
})

describe.each(PROBES)('FR-151 T-331 SQ-10 ($name) -- 入っているときに押すと、表のすべての行（一覧に出ていない行も）のチェックを外す', (probe) => {
  it('SQ-10: checked, one row checked, the press clears every row and the box then reads empty', () => {
    const part = probe.visibilityOf(probe.everyKey.slice(0, 1))
    const after = pressWhatIsShown(probe, part, '')
    expect(probe.checkedOf(after.visibility)).toEqual([])
    expect(probe.heading(after.visibility, '')).toBe('empty')
  })

  it('SQ-10: checked, every row checked, the press clears every row', () => {
    const after = headingPress(probe, probe.visibilityOf(probe.everyKey), '', false)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('SQ-10: checked, every row checked, a word, the press clears the rows out of view as well', () => {
    const after = headingPress(probe, probe.visibilityOf(probe.everyKey), probe.narrowWord, false)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('SQ-10: checked only by rows out of view, a word, the box reads checked and the press clears those rows', () => {
    const part = probe.visibilityOf(outOfViewOf(probe, probe.narrowWord))
    expect(probe.heading({ ...NO_ROW_CHECKED, ...part }, probe.narrowWord)).toBe('checked')
    const after = pressWhatIsShown(probe, part, probe.narrowWord)
    expect(probe.checkedOf(after.visibility)).toEqual([])
    expect(probe.heading(after.visibility, probe.narrowWord)).toBe('empty')
  })

  it('SQ-10: checked, no row listed, the press still clears every row of the table', () => {
    const after = headingPress(probe, probe.visibilityOf(probe.everyKey), probe.emptyWord, false)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('SQ-10: checked by the listed rows alone, a word, the press clears them', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const after = pressWhatIsShown(probe, probe.visibilityOf(listed), probe.narrowWord)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('SQ-10: the clearing press leaves the Schedule Filter, the column filters and the sort as they were', () => {
    const after = headingPress(probe, { ...probe.visibilityOf(probe.everyKey), isScheduleFilterApplied: true }, '', false)
    expect(after.visibility.isScheduleFilterApplied).toBe(true)
    expect(after.columnFilters).toEqual(probe.base.columnFilters)
    expect(after.sort).toEqual(probe.base.sort)
  })

  it('SQ-10: press then press on what the view shows goes empty, checked, empty', () => {
    expect(probe.heading(NO_ROW_CHECKED, probe.narrowWord)).toBe('empty')
    const added = pressWhatIsShown(probe, {}, probe.narrowWord)
    expect(probe.heading(added.visibility, probe.narrowWord)).toBe('checked')
    const cleared = pressWhatIsShown(probe, { ...added.visibility }, probe.narrowWord)
    expect(probe.checkedOf(cleared.visibility)).toEqual([])
    expect(probe.heading(cleared.visibility, probe.narrowWord)).toBe('empty')
  })

  it('SQ-10: a row box of its own (not the heading) clears only its own row', () => {
    const first = probe.everyKey[0] as Key
    const after = probe.press(probe.visibilityOf(probe.everyKey), '', { kind: 'shown', keys: [first], isShown: false })
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey.slice(1)))
    expect(probe.heading(after.visibility, '')).toBe('checked')
  })

  it('SQ-10: a row box of its own checks only its own row', () => {
    const first = probe.everyKey[0] as Key
    const after = probe.press({}, '', { kind: 'shown', keys: [first], isShown: true })
    expect(probe.checkedOf(after.visibility)).toEqual([first])
  })
})

describe('FR-099 T-371 RQ-1 -- the (Unassigned) row counts as a row of the table', () => {
  it('RQ-1: the (Unassigned) row alone checked, the box is checked', () => {
    expect(LIST_PROBE.heading({ ...NO_ROW_CHECKED, isUnassignedShown: true }, '')).toBe('checked')
  })

  it('RQ-1: the (Unassigned) row alone checked and a word that does not list it, the box is checked', () => {
    expect(LIST_PROBE.listed(NO_ROW_CHECKED, LIST_PROBE.narrowWord)).not.toContain(UNASSIGNED)
    expect(LIST_PROBE.heading({ ...NO_ROW_CHECKED, isUnassignedShown: true }, LIST_PROBE.narrowWord)).toBe('checked')
  })

  it('RQ-1: the adding press checks the (Unassigned) row with the resources', () => {
    const after = headingPress(LIST_PROBE, {}, '', true)
    expect(after.visibility.isUnassignedShown).toBe(true)
    expect([...after.visibility.shownResourceUids].sort((a, b) => a - b)).toEqual([SATO, TANAKA, IDLE])
  })

  it('RQ-1: the adding press with a word that does not list the (Unassigned) row leaves it as it was', () => {
    expect(LIST_PROBE.listed(NO_ROW_CHECKED, LIST_PROBE.narrowWord)).not.toContain(UNASSIGNED)
    expect(headingPress(LIST_PROBE, { isUnassignedShown: true }, LIST_PROBE.narrowWord, true).visibility.isUnassignedShown).toBe(true)
    expect(headingPress(LIST_PROBE, {}, LIST_PROBE.narrowWord, true).visibility.isUnassignedShown).toBe(false)
  })

  it('RQ-1: the clearing press on the (Unassigned) row alone clears it, though the word does not list it', () => {
    const after = pressWhatIsShown(LIST_PROBE, { isUnassignedShown: true }, LIST_PROBE.narrowWord)
    expect(after.visibility.isUnassignedShown).toBe(false)
    expect(LIST_PROBE.heading(after.visibility, LIST_PROBE.narrowWord)).toBe('empty')
  })

  it('RQ-1: the clearing press clears the (Unassigned) row and every resource', () => {
    const listed = LIST_PROBE.listed(NO_ROW_CHECKED, LIST_PROBE.narrowWord)
    const after = headingPress(LIST_PROBE, { ...LIST_PROBE.visibilityOf(listed), isUnassignedShown: true }, LIST_PROBE.narrowWord, false)
    expect(after.visibility.isUnassignedShown).toBe(false)
    expect(after.visibility.shownResourceUids).toEqual([])
  })
})

describe('FR-151 T-353 TV-2 / T-347 DT-8 -- the report: a checked task the report does not carry is not a row of the table', () => {
  const NOT_CARRIED = [DELTA, ECHO]

  it('premise: the report carries neither Delta nor Echo, and carries at least one row', () => {
    expect(REPORT_KEYS.length).toBeGreaterThan(0)
    for (const uid of NOT_CARRIED) expect(REPORT_KEYS).not.toContain(uid)
  })

  it('DT-8: only tasks the report does not carry are checked, the box is empty', () => {
    expect(REPORT_PROBE.heading({ ...NO_ROW_CHECKED, shownTaskUids: NOT_CARRIED }, '')).toBe('empty')
  })

  it('DT-8: only tasks the report does not carry are checked, with a word, the box is empty', () => {
    expect(REPORT_PROBE.heading({ ...NO_ROW_CHECKED, shownTaskUids: NOT_CARRIED }, REPORT_PROBE.narrowWord)).toBe('empty')
  })

  it('DT-8: a task the report does not carry and a task it carries are checked, the box is checked', () => {
    const carried = REPORT_KEYS[0] as number
    expect(REPORT_PROBE.heading({ ...NO_ROW_CHECKED, shownTaskUids: [...NOT_CARRIED, carried] }, '')).toBe('checked')
  })

  it('DT-8: the same checked tasks in the Search Panel, which lists every task, make its box checked', () => {
    expect(SEARCH.heading({ ...NO_ROW_CHECKED, shownTaskUids: NOT_CARRIED }, '')).toBe('checked')
  })
})
