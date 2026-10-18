// CR-800 spec-only contract: the heading cell of the check column holds a box and no funnel (SQ-10, SV-7); the box reads the listed rows (all / some / none, none at first); pressing it while some or none of the listed rows are checked checks the listed rows and leaves the rows kept out of view as they were, and pressing it while every listed row is checked clears every row of the table, the unlisted ones and the (Unassigned) row included (SQ-10, DT-8, RQ-1); the eye is off only while no row is checked (TV-5, IC-143, JDG-2820, JDG-2825); one press is one view change (TV-6, UN-20).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportAfterFilterChange,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import type { DisplayLanguage, SearchFilterChange, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import { searchPanelAfterFilterChange, searchPanelFromSession, searchPanelWithFilterOpened } from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_RESOURCE_LIST,
  resourceListAfterEntry,
  resourceListAfterFilterChange,
  resourceListFromWindow,
  type ResourceListView,
} from '../../src/adapter/screen-renderer/resource-list'
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
type Heading = 'all' | 'some' | 'none'

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8'))
const REQUIREMENTS = read('01-04-requirements.md')
const GLOSSARY = read('_assets', 'tbl-glossary.md')
const DISPLAY_WORDS = readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.by[heading] ?? '')
}

const glossaryRow = (id: string): string => GLOSSARY.split('\n').find((line) => line.startsWith(`| ${id} |`)) ?? ''

const found = <T>(value: T | undefined | null, what: string): T => {
  if (value === undefined || value === null) throw new Error(`missing: ${what}`)
  return value
}

const SQ_10_STATES = '見出しのセルは、一覧に出ている行がすべて入っている・一部・1 つも入っていない の 3 つの状態のチェックボックスだけである'
const SQ_10_FIRST = '初めは 1 つも入っていない'
const SQ_10_ADD = '一覧に出ている行のうち入っていない行があれば、一覧に出ている行をすべて入れ、一覧に出ていない行は変えない'
const SQ_10_CLEAR = '一覧に出ている行がすべて入っていれば、表のすべての行（語や列のフィルタで一覧に出ていない行も）のチェックを外す'
const SQ_10_NO_FUNNEL = '持たない —— 見出しに `IC-122` を置かない'
const SQ_10_RETIRED = '一覧に出ている行だけをすべて入れる（すべて入っていればすべて外す）'
const SV_7_EXCEPT = '[表示] の列（表 T-331 の `SQ-10`）を除く、どの列の見出しにも `IC-122` を置き'
const SV_7_BOX_ONLY = '[表示] の列の見出しには `IC-122` を置かず、見出しのチェックボックスだけを置く'
const SV_7_RETIRED_DROPDOWN = '`IC-122` は、本段の操作の段と値の一覧の代わりに、`IC-125` と `IC-126` の 2 つの行だけを持つドロップダウンを開く'
const SV_7_RETIRED_EVERY_ROW = 'そこでの `IC-125`・`IC-126` は'
const TV_5_NONE = '掛けていないあいだ、その表にチェックの入った行が 1 つも無いときは、`IC-143` を効かなくし、その理由を説明に出す'
const TV_5_STAYS_ON = '掛けているあいだは、行をすべて「表示」にしても、すべての行のチェックを外しても掛けたままとし'
const TV_5_RETIRED = '掛けても描くものが'
const TV_6_ONE_STEP = '1 回の入れ（見出しのチェックボックスの 1 回を含む）を、表示の列の値の変更（`UN-20`）と合わせて 1 段とする'
const UN_20_ONE_STEP = '行の「表示」／「非表示」の 1 回（見出しのチェックボックスの 1 回を含む'

describe('CR-800 the manuscript these cases are driven by', () => {
  it('SQ-10 says the box reads the listed rows, adds to them, and clears every row on the second press', () => {
    const cell = cellOf('T-331', 'SQ-10', '書き方')
    expect(cell).toContain(SQ_10_STATES)
    expect(cell).toContain(SQ_10_FIRST)
    expect(cell).toContain(SQ_10_ADD)
    expect(cell).toContain(SQ_10_CLEAR)
    expect(cell).not.toContain(SQ_10_RETIRED)
    const lastCell = specTable('T-331').rows.find((one) => one.id === 'SQ-10')?.cells.at(-1) ?? ''
    expect(unbroken(lastCell)).toContain(SQ_10_NO_FUNNEL)
  })

  it('DT-8 and RQ-1 point at SQ-10 and say nothing of their own', () => {
    expect(REQUIREMENTS).toContain('| DT-8 | 表示 |')
    expect(cellOf('T-347', 'DT-8', '書き方')).toContain('表 T-331 の `SQ-10` と同じ')
    expect(cellOf('T-371', 'RQ-1', '書き方')).toContain('`DT-8` と同じ')
  })

  it('SV-7 leaves the check column out of the funnel; the retired two-entry dropdown is gone', () => {
    const cell = cellOf('T-330', 'SV-7', '定め')
    expect(cell).toContain(SV_7_EXCEPT)
    expect(cell).toContain(SV_7_BOX_ONLY)
    expect(cell).not.toContain(SV_7_RETIRED_DROPDOWN)
  })

  // WHY: a funnel that is gone cannot still carry IC-125 / IC-126 for the check column; SV-7 keeps a sentence that says it does.
  it('SV-7 no longer says IC-125 / IC-126 act on every row of the check column (CR-800 section 3: the funnel retires)', () => {
    expect(cellOf('T-330', 'SV-7', '定め')).not.toContain(SV_7_RETIRED_EVERY_ROW)
  })

  it('TV-5 disables the eye for an empty check list only; the "draws nothing new" half is retired', () => {
    const cell = cellOf('T-353', 'TV-5', '定め')
    expect(cell).toContain(TV_5_NONE)
    expect(cell).toContain(TV_5_STAYS_ON)
    expect(cell).not.toContain(TV_5_RETIRED)
  })

  it('TV-6 and UN-20 count one heading press as one step', () => {
    expect(cellOf('T-353', 'TV-6', '定め')).toContain(TV_6_ONE_STEP)
    expect(REQUIREMENTS).toContain(UN_20_ONE_STEP)
  })

  it('IC-122, IC-143 and the words: no funnel in the check column, eye off for an empty list only, nothingHidden gone', () => {
    expect(glossaryRow('IC-122')).toContain('[表示] の列には置かない')
    expect(glossaryRow('IC-143')).toContain('チェックの入った行が 1 つも無いときは効かない')
    expect(glossaryRow('IC-143')).not.toContain('描くものが')
    expect(DISPLAY_WORDS).toContain('"part": "nothingChecked"')
    expect(DISPLAY_WORDS).not.toContain('nothingHidden')
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
  readonly heading: (visibility: Visibility, word: string) => Heading | undefined
  readonly eye: (part: Partial<Visibility>, word: string) => EyeReading
  readonly press: (part: Partial<Visibility>, word: string, change: Omit<ShownChange, 'column'>) => TableView
  readonly base: TableView
}

type ShownChange = Extract<SearchFilterChange, { readonly kind: 'shown' }>

interface EyeReading {
  readonly isEnabled: boolean
  readonly refusals: readonly { readonly icon: string; readonly reason: string }[]
}

function eyeOf(view: { readonly titleEntries: SearchPanelView['titleEntries']; readonly tableEntries?: SearchPanelView['tableEntries']; readonly entryRefusals?: SearchPanelView['entryRefusals'] }): EyeReading {
  const entry = [...view.titleEntries, ...(view.tableEntries ?? [])].find((one) => one.icon === 'IC-143')
  return { isEnabled: found(entry, 'the eye IC-143 among the title bar entries').isEnabled, refusals: (view.entryRefusals ?? []).filter((one) => one.icon === 'IC-143') }
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
  eye: (part, word) => eyeOf(searchViewOf({ ...startOf('searchPanel').visibility, ...part }, word)),
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
  eye: (part, word) => eyeOf(reportViewOf({ ...startOf('delayDiagnosticsReport').visibility, ...part }, word)),
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
  eye: (part, word) => eyeOf(listViewOf({ ...startOf('resourceList').visibility, ...part }, word)),
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

describe.each(PROBES)('FR-151 T-331 SQ-10 / T-347 DT-8 / T-371 RQ-1 ($name) -- 状態は一覧に出ている行から読み、初めは 1 つも入っていない', (probe) => {
  it('SQ-10 first: nothing checked, the box reads none', () => {
    expect(probe.checkedOf(probe.base.visibility)).toEqual([])
    expect(probe.heading(NO_ROW_CHECKED, '')).toBe('none')
  })

  it('SQ-10: one of the listed rows checked reads some', () => {
    const first = probe.everyKey[0] as Key
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf([first]) }, '')).toBe('some')
  })

  it('SQ-10: every listed row checked reads all', () => {
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(probe.everyKey) }, '')).toBe('all')
  })

  it('SQ-10: every row the word lists checked reads all, whatever stands unchecked out of view', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(listed) }, probe.narrowWord)).toBe('all')
  })

  it('SQ-10: only rows out of view checked reads none (the state comes from the listed rows)', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const outOfView = probe.everyKey.filter((one) => !listed.includes(one))
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(outOfView) }, probe.narrowWord)).toBe('none')
  })

  it('SQ-10: some of the listed rows checked reads some even with every row out of view checked', () => {
    const listed = probe.listed(NO_ROW_CHECKED, '')
    const outOfView = probe.everyKey.filter((one) => !probe.listed(NO_ROW_CHECKED, probe.narrowWord).includes(one))
    const narrowedListed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    expect(narrowedListed.length).toBeGreaterThan(0)
    expect(listed.length).toBeGreaterThan(narrowedListed.length)
    // WHY: the word lists the narrowed rows, none of them checked, while the rows out of view are all checked.
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(outOfView) }, probe.narrowWord)).toBe('none')
  })

  it('SQ-10: no row listed reads none', () => {
    expect(probe.heading({ ...NO_ROW_CHECKED, ...probe.visibilityOf(probe.everyKey) }, probe.emptyWord)).toBe('none')
  })
})

describe.each(PROBES)('FR-151 T-331 SQ-10 ($name) -- 一覧に出ている行のうち入っていない行があれば、一覧に出ている行をすべて入れ、一覧に出ていない行は変えない', (probe) => {
  it('SQ-10: with nothing checked, the heading press checks every listed row', () => {
    const after = headingPress(probe, {}, '', true)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey))
  })

  it('SQ-10: with some listed rows checked, the heading press checks every listed row', () => {
    const first = probe.everyKey[0] as Key
    const after = headingPress(probe, probe.visibilityOf([first]), '', true)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey))
  })

  it('SQ-10: with a word, the heading press checks the listed rows and the rows out of view stay unchecked', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const after = headingPress(probe, {}, probe.narrowWord, true)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(listed))
  })

  it('SQ-10: with a word, the rows out of view that were checked stay checked after the heading press', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const outOfView = probe.everyKey.filter((one) => !listed.includes(one))
    const after = headingPress(probe, probe.visibilityOf(outOfView), probe.narrowWord, true)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey))
  })

  it('SQ-10: with a word and some listed rows checked, the heading press completes the listed rows and leaves the rest as it was', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const outOfView = probe.everyKey.filter((one) => !listed.includes(one))
    const keptChecked = outOfView.slice(0, 1)
    const after = headingPress(probe, probe.visibilityOf([...keptChecked, ...listed.slice(0, 1)]), probe.narrowWord, true)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys([...keptChecked, ...listed]))
  })

  it('SQ-10: no row listed, the heading press adds nothing and changes no row', () => {
    const before = probe.visibilityOf(probe.everyKey.slice(0, 1))
    const after = headingPress(probe, before, probe.emptyWord, true)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey.slice(0, 1)))
  })

  it('SQ-10: the press leaves the Schedule Filter, the column filters and the sort as they were', () => {
    const after = headingPress(probe, { isScheduleFilterApplied: true }, '', true)
    expect(after.visibility.isScheduleFilterApplied).toBe(true)
    expect(after.columnFilters).toEqual(probe.base.columnFilters)
    expect(after.sort).toEqual(probe.base.sort)
  })
})

describe.each(PROBES)('FR-151 T-331 SQ-10 ($name) -- 一覧に出ている行がすべて入っていれば、表のすべての行（語や列のフィルタで一覧に出ていない行も）のチェックを外す', (probe) => {
  const ALL = (): Partial<Visibility> => probe.visibilityOf(probe.everyKey)

  it('SQ-10: with every row checked and listed, the heading press clears every row', () => {
    const after = headingPress(probe, ALL(), '', false)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('SQ-10: with a word, every row checked, the heading press clears the rows out of view as well', () => {
    const after = headingPress(probe, ALL(), probe.narrowWord, false)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('SQ-10: with a word, only the listed rows checked, the heading press clears them', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const after = headingPress(probe, probe.visibilityOf(listed), probe.narrowWord, false)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('SQ-10: the press leaves the Schedule Filter, the column filters and the sort as they were', () => {
    const after = headingPress(probe, { ...ALL(), isScheduleFilterApplied: true }, '', false)
    expect(after.visibility.isScheduleFilterApplied).toBe(true)
    expect(after.columnFilters).toEqual(probe.base.columnFilters)
    expect(after.sort).toEqual(probe.base.sort)
  })

  it('SQ-10: press then press brings the table back to nothing checked (add, then clear)', () => {
    const added = headingPress(probe, {}, '', true)
    const cleared = headingPress(probe, { ...added.visibility }, '', false)
    expect(probe.checkedOf(cleared.visibility)).toEqual([])
  })

  it('SQ-10: with a word, press then press clears the rows the first press never touched', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const outOfView = probe.everyKey.filter((one) => !listed.includes(one))
    const added = headingPress(probe, probe.visibilityOf(outOfView), probe.narrowWord, true)
    expect(probe.checkedOf(added.visibility)).toEqual(sortedKeys(probe.everyKey))
    const cleared = headingPress(probe, { ...added.visibility }, probe.narrowWord, false)
    expect(probe.checkedOf(cleared.visibility)).toEqual([])
  })

  it('SQ-10: a row box of its own (not the heading) clears only its own row, however many rows are checked', () => {
    const first = probe.everyKey[0] as Key
    const after = probe.press(ALL(), '', { kind: 'shown', keys: [first], isShown: false })
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey.slice(1)))
  })

  it('SQ-10: a row box of its own checks only its own row', () => {
    const first = probe.everyKey[0] as Key
    const after = probe.press({}, '', { kind: 'shown', keys: [first], isShown: true })
    expect(probe.checkedOf(after.visibility)).toEqual([first])
  })
})

describe('FR-099 T-371 RQ-1 -- 担当の行と（担当なし）の行', () => {
  it('RQ-1: the heading press checks the (Unassigned) row with the resources', () => {
    const after = headingPress(LIST_PROBE, {}, '', true)
    expect(after.visibility.isUnassignedShown).toBe(true)
    expect([...after.visibility.shownResourceUids].sort((a, b) => a - b)).toEqual([SATO, TANAKA, IDLE])
  })

  it('RQ-1: the heading press with a word that lists no (Unassigned) row leaves that row as it was', () => {
    const listed = LIST_PROBE.listed(NO_ROW_CHECKED, LIST_PROBE.narrowWord)
    expect(listed, 'premise: the word does not list the (Unassigned) row').not.toContain(UNASSIGNED)
    const kept = headingPress(LIST_PROBE, { isUnassignedShown: true }, LIST_PROBE.narrowWord, true)
    expect(kept.visibility.isUnassignedShown).toBe(true)
    const stayed = headingPress(LIST_PROBE, {}, LIST_PROBE.narrowWord, true)
    expect(stayed.visibility.isUnassignedShown).toBe(false)
  })

  it('RQ-1: the clearing press clears the (Unassigned) row, though the word does not list it', () => {
    const listed = LIST_PROBE.listed(NO_ROW_CHECKED, LIST_PROBE.narrowWord)
    expect(listed, 'premise: the word does not list the (Unassigned) row').not.toContain(UNASSIGNED)
    const all = LIST_PROBE.visibilityOf(listed)
    const after = headingPress(LIST_PROBE, { ...all, isUnassignedShown: true }, LIST_PROBE.narrowWord, false)
    expect(after.visibility.isUnassignedShown).toBe(false)
    expect(after.visibility.shownResourceUids).toEqual([])
  })

  it('RQ-1: the (Unassigned) row alone checked does not make the box read all of the listed resources', () => {
    expect(LIST_PROBE.heading({ ...NO_ROW_CHECKED, isUnassignedShown: true }, '')).toBe('some')
  })
})

describe('FR-151 T-330 SV-7 / T-331 SQ-10 -- 見出しに IC-122 を置かない（持たない）', () => {
  const closedPanel = (): SearchPanelSession => searchPanelOf('')

  it('SQ-10: the Search Panel opens no filter on the check column', () => {
    expect(searchPanelWithFilterOpened(sessionIn(), closedPanel(), SEARCH.base, 'SQ-10')).toBeNull()
  })

  it('SQ-10: another column keeps its IC-122 and still opens its filter', () => {
    const column = found(searchViewOf(NO_ROW_CHECKED, '').columns.find((one) => one.column === 'SQ-1'), 'the SQ-1 column view')
    expect(column.filterEntry.icon).toBe('IC-122')
    expect(column.filterEntry.isEnabled).toBe(true)
    const opened = found(searchPanelWithFilterOpened(sessionIn(), closedPanel(), SEARCH.base, 'SQ-1'), 'the panel after IC-122 on SQ-1')
    expect(found(searchPanelFromSession(sessionIn(), opened, SEARCH.base, SCHEDULE, CANVAS), 'a view').filterMenu).not.toBeNull()
  })

  it('DT-8: IC-122 on the check column of the report opens no filter', () => {
    const after = delayDiagnosticsReportAfterEntry(reportWindowOf(''), REPORT_PROBE.base, 'IC-122' as never, 'DT-8', { report: REPORT, schedule: REPORT_SCHEDULE, language: 'ja' })
    if (after === null) return
    const window = (after.window ?? reportWindowOf('')) as DelayDiagnosticsReportWindow
    const view = found(
      delayDiagnosticsReportFromWindow({ screen: { screenLanguage: 'ja' } } as unknown as ScreenSession, window, after.view, REPORT, REPORT_SCHEDULE, LAYOUT),
      'a view of the report window',
    )
    expect(view.filterMenu).toBeNull()
  })

  it('RQ-1: IC-122 on the check column of the Resource List opens no filter', () => {
    const after = resourceListAfterEntry(listWindowOf(''), LIST_PROBE.base, 'IC-122' as never, 'RQ-1', { schedule: SCHEDULE, chosenResourceUids: [], language: 'ja' })
    if (after === null) return
    const window = after.window ?? listWindowOf('')
    const view = found(resourceListFromWindow(sessionIn(), window, after.view, SCHEDULE, [], LAYOUT), 'a view of the Resource List')
    expect(view.filterMenu).toBeNull()
  })
})

describe.each(PROBES)('FR-151 T-353 TV-5 / IC-143 / JDG-2820 / JDG-2825 ($name) -- チェックの入った行が 1 つも無いときだけ IC-143 を効かなくする', (probe) => {
  it('not applied, no row checked: IC-143 is disabled and one refusal gives the reason (FR-092)', () => {
    const eye = probe.eye({}, '')
    expect(eye.isEnabled).toBe(false)
    expect(eye.refusals.length).toBe(1)
    expect(eye.refusals[0]?.reason.trim().length).toBeGreaterThan(0)
  })

  it('not applied, one row checked: IC-143 is enabled and no refusal names it', () => {
    const eye = probe.eye(probe.visibilityOf(probe.everyKey.slice(0, 1)), '')
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('JDG-2825: not applied, EVERY row checked: IC-143 is enabled and no refusal names it', () => {
    const eye = probe.eye(probe.visibilityOf(probe.everyKey), '')
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('JDG-2825: not applied, every row checked, a word lists some: IC-143 stays enabled', () => {
    const eye = probe.eye(probe.visibilityOf(probe.everyKey), probe.narrowWord)
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('not applied, a row checked that the word keeps out of view: IC-143 is enabled (the table holds a checked row)', () => {
    const listed = probe.listed(NO_ROW_CHECKED, probe.narrowWord)
    const outOfView = probe.everyKey.filter((one) => !listed.includes(one))
    const eye = probe.eye(probe.visibilityOf(outOfView.slice(0, 1)), probe.narrowWord)
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('applied, every row checked: IC-143 is enabled, so pressing releases', () => {
    const eye = probe.eye({ ...probe.visibilityOf(probe.everyKey), isScheduleFilterApplied: true }, '')
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('applied, no row checked: IC-143 stays enabled, so pressing releases (TV-5: 掛けたまま)', () => {
    const eye = probe.eye({ isScheduleFilterApplied: true }, '')
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('after the clearing heading press the table holds no checked row and the eye is off again', () => {
    const cleared = headingPress(probe, probe.visibilityOf(probe.everyKey), '', false)
    const eye = probe.eye(cleared.visibility, '')
    expect(eye.isEnabled).toBe(false)
    expect(eye.refusals.length).toBe(1)
  })

  it('after the adding heading press the eye is enabled', () => {
    const added = headingPress(probe, {}, '', true)
    expect(probe.eye(added.visibility, '').isEnabled).toBe(true)
  })
})

describe.each(PROBES)('FR-151 T-353 TV-6 / T-027 UN-20 ($name) -- 見出しのチェックボックスの 1 回は表の見え方の変更の 1 回である', (probe) => {
  it('one heading press hands back one TableView that holds the whole change, with no second press needed', () => {
    const first = probe.everyKey[0] as Key
    const after = headingPress(probe, probe.visibilityOf([first]), '', true)
    expect(Array.isArray(after)).toBe(false)
    expect(probe.checkedOf(after.visibility)).toEqual(sortedKeys(probe.everyKey))
  })

  it('one clearing heading press hands back one TableView that holds the whole change', () => {
    const after = headingPress(probe, probe.visibilityOf(probe.everyKey), probe.narrowWord, false)
    expect(Array.isArray(after)).toBe(false)
    expect(probe.checkedOf(after.visibility)).toEqual([])
  })

  it('the press changes the check list and nothing else of the view (the same single step as a row box)', () => {
    const held = viewWith(probe.base, probe.visibilityOf(probe.everyKey.slice(0, 1)))
    const after = headingPress(probe, probe.visibilityOf(probe.everyKey.slice(0, 1)), '', true)
    const { visibility: ignoredBefore, ...restBefore } = held
    const { visibility: ignoredAfter, ...restAfter } = after
    expect(ignoredBefore).not.toEqual(ignoredAfter)
    expect(restAfter).toEqual(restBefore)
  })

  it('a press that changes nothing (adding to a full list is impossible, clearing an empty one is) returns the view as it was', () => {
    const view = viewWith(probe.base, {})
    const after = probe.press({}, '', { kind: 'shown', keys: [], isShown: false, isHeading: true })
    expect(after).toEqual(view)
  })

  it('the press does not touch the view it was given', () => {
    const part = probe.visibilityOf(probe.everyKey.slice(0, 1))
    const given = viewWith(probe.base, part)
    const snapshot = JSON.parse(JSON.stringify(given)) as TableView
    probe.press(part, '', { kind: 'shown', keys: probe.listed({ ...probe.base.visibility, ...part }, ''), isShown: true, isHeading: true })
    expect(JSON.parse(JSON.stringify(given))).toEqual(snapshot)
  })
})
