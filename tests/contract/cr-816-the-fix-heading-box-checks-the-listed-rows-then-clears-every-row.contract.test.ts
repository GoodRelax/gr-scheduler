import { describe, expect, it } from 'vitest'

import {
  NO_DELAY_FIX_VALUES,
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportFromWindow,
  delayDiagnosticsReportWithFixHeading,
  delayDiagnosticsReportWithPick,
  delayFixValuesOf,
  type DelayDiagnosticsReportWindow,
  type DelayFixTables,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import type { Document } from '../../src/entity/document-model/document/document'
import { delayFixProposalRows } from '../../src/entity/document-model/schedule/delay-diagnostics-report-table'
import type { DelayFixRow } from '../../src/entity/document-model/schedule/delay-fixes'
import { proposeDelayFixes } from '../../src/entity/document-model/schedule/schedule'
import { NO_ROW_CHECKED, type ScreenSession, type TableView } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { FINISH_OF, FS, START_OF, diagnosed, documentOf, type TaskSpec } from './cr-731-stage'

const STATUS = '2027-05-31T17:00:00'
const CHECK_MARK = '✓'
const NO_VIEW: TableView = { visibility: NO_ROW_CHECKED, columnFilters: [], sort: null }
const LAYOUT = { canvas: { x: 0, y: 40, width: 1000, height: 600 }, textSizeStep: 0 }
const SESSION = { screen: { screenLanguage: 'en' } } as unknown as ScreenSession

const span = (uid: number, from: string, to: string, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  name: `Row${String(uid)}x`,
  start: START_OF(`2027-${from}`),
  finish: FINISH_OF(`2027-${to}`),
  ...extra,
})

// WHY: one document holding every kind of row T-373 names: automatic with a cascade, one-choice, two-choice, date candidate, by hand, read-only.
const SCENE = (): Document =>
  documentOf(
    [
      span(10, '05-10', '05-21'),
      span(11, '05-10', '05-21', { parent: 10 }),
      span(12, '05-10', '05-14', { parent: 11 }),
      span(13, '05-17', '05-26', { parent: 11 }),
      span(14, '05-10', '05-12', { parent: 10 }),
      span(21, '05-03', '05-07', { actualStart: START_OF('2027-05-03'), actualFinish: FINISH_OF('2027-05-20'), percentComplete: 100 }),
      span(22, '05-10', '05-14', { actualStart: START_OF('2027-05-12'), actualFinish: FINISH_OF('2027-05-14'), percentComplete: 100, after: [[21, FS]] }),
      span(31, '05-10', '05-21', { readOnly: true }),
      span(32, '05-10', '05-14', { parent: 31 }),
      span(33, '05-17', '05-26', { parent: 31 }),
      span(41, '05-10', '05-14', { actualStart: START_OF('2027-05-10'), percentComplete: 50 }),
      span(42, '05-17', '05-21', { actualStart: START_OF('2027-05-28'), percentComplete: 30, after: [[41, FS]] }),
      span(51, '05-10', '05-14', { actualStart: START_OF('2027-06-05'), percentComplete: 10 }),
      span(61, '05-10', '05-11'),
      span(62, '05-12', '05-13', { after: [[61, FS], [61, FS]] }),
    ],
    { statusDate: STATUS },
  )

const DOCUMENT = SCENE()
const REPORT = diagnosed(DOCUMENT)
const SCHEDULE = DOCUMENT.schedule

const OPENED: DelayDiagnosticsReportWindow = {
  ...OPENED_DELAY_DIAGNOSTICS_REPORT,
  fixes: { ...NO_DELAY_FIX_VALUES, table: 'proposals' },
}

const tablesOf = (window: DelayDiagnosticsReportWindow): DelayFixTables => ({
  proposals: delayFixProposalRows(proposeDelayFixes(DOCUMENT, REPORT, Object.values(delayFixValuesOf(window).picks)), SCHEDULE),
  log: [],
})

const withWord = (window: DelayDiagnosticsReportWindow, word: string): DelayDiagnosticsReportWindow => ({ ...window, panel: { ...window.panel, word } })

const viewOf = (window: DelayDiagnosticsReportWindow) =>
  delayDiagnosticsReportFromWindow(SESSION, window, NO_VIEW, REPORT, SCHEDULE, LAYOUT, tablesOf(window))!

const listedKeysOf = (window: DelayDiagnosticsReportWindow): string[] =>
  viewOf(window).rows.flatMap((row) => ('fix' in row && row.fix !== null ? [row.fix.key] : []))

const press = (window: DelayDiagnosticsReportWindow, isChecked: boolean, listedKeys = listedKeysOf(window)): DelayDiagnosticsReportWindow =>
  delayDiagnosticsReportWithFixHeading(window, tablesOf(window), { isChecked, listedKeys })

const checkOf = (window: DelayDiagnosticsReportWindow, key: string): DelayDiagnosticsReportWindow =>
  delayDiagnosticsReportWithPick(window, { kind: 'fixPick', column: 'FM-1', key, part: 'check', value: CHECK_MARK })

const CLEARED = press(OPENED, false)
const CHECKED_ALL = press(CLEARED, true)

const rowsIn = (window: DelayDiagnosticsReportWindow): readonly DelayFixRow[] => tablesOf(window).proposals
const ofKind = (window: DelayDiagnosticsReportWindow, kind: DelayFixRow['fixKind']): DelayFixRow[] => rowsIn(window).filter((row) => row.fixKind === kind)
const keyOf = (row: DelayFixRow): string => row.key
const checkedKeysIn = (window: DelayDiagnosticsReportWindow): string[] => rowsIn(window).filter((row) => row.checked).map(keyOf)
const footerNumberOf = (window: DelayDiagnosticsReportWindow): number => Number(/\d+/.exec(viewOf(window).fixFooter!.count)![0])
const onCellsIn = (window: DelayDiagnosticsReportWindow): number => viewOf(window).rows.filter((row) => 'fix' in row && row.fix?.check === 'on').length
const taskNamed = (uid: number): string => `Row${String(uid)}x`

const rowOfTask = (window: DelayDiagnosticsReportWindow, uid: number): DelayFixRow => {
  const found = rowsIn(window).filter((row) => row.taskUid === uid && row.causedBy === null && row.fixKind === 'choose' && row.choices.length === 1)
  expect(found, `one one-choice row on task ${String(uid)}`).toHaveLength(1)
  return found[0]!
}

describe('the scene holds every kind of row the heading has to tell apart', () => {
  it('has automatic, one-choice, two-choice, date candidate, by-hand, read-only and cascade rows', () => {
    const rows = rowsIn(OPENED)
    expect(rows.some((row) => row.fixKind === 'automatic' && row.isCheckable)).toBe(true)
    expect(rows.some((row) => row.fixKind === 'choose' && row.choices.length === 1)).toBe(true)
    expect(rows.some((row) => row.fixKind === 'choose' && row.choices.length >= 2)).toBe(true)
    expect(rows.some((row) => row.fixKind === 'suggestedDate')).toBe(true)
    expect(rows.some((row) => row.fixKind === 'byHand')).toBe(true)
    expect(rows.some((row) => row.refusal === 'readOnly')).toBe(true)
    expect(rows.some((row) => row.causedBy !== null)).toBe(true)
  })
})

// see FM-1, JDG-2920
describe('T-374 FM-1 -- the heading state follows whether any proposal row is checked', () => {
  it('showAt is the place of the FM-1 column on the proposals table', () => {
    const view = viewOf(OPENED)
    expect(view.showAt).toBe(view.columns.findIndex((one) => one.column === 'FM-1'))
    expect(view.showAt).toBeGreaterThanOrEqual(0)
  })

  it('reads checked while some row is checked, and the scene opens with the automatic rows checked', () => {
    expect(checkedKeysIn(OPENED).length).toBeGreaterThan(0)
    expect(viewOf(OPENED).showHeading).toBe('checked')
  })

  it('reads empty once no row is checked', () => {
    expect(checkedKeysIn(CLEARED)).toEqual([])
    expect(viewOf(CLEARED).showHeading).toBe('empty')
  })

  it('reads empty on a table with no proposal row at all', () => {
    const view = delayDiagnosticsReportFromWindow(SESSION, OPENED, NO_VIEW, REPORT, SCHEDULE, LAYOUT, { proposals: [], log: [] })!
    expect(view.showHeading).toBe('empty')
  })

  it('reads checked again as soon as one row is checked by the person', () => {
    const [one] = ofKind(CLEARED, 'suggestedDate')
    expect(viewOf(checkOf(CLEARED, one!.key)).showHeading).toBe('checked')
  })

  it('reads checked when the only checked row is kept out of the list by the word', () => {
    const [target] = ofKind(CLEARED, 'suggestedDate').filter((row) => row.taskUid !== 51)
    const window = withWord(checkOf(CLEARED, target!.key), taskNamed(51))
    expect(listedKeysOf(window)).not.toContain(target!.key)
    expect(viewOf(window).showHeading).toBe('checked')
  })
})

// see FM-1, IC-122
describe('T-374 FM-1 -- the column opens no filter', () => {
  const rows = { report: REPORT, schedule: SCHEDULE, language: 'en' as const, fixTables: tablesOf(OPENED) }

  it('IC-122 on FM-1 leaves no filter open', () => {
    const step = delayDiagnosticsReportAfterEntry(OPENED, NO_VIEW, 'IC-122', 'FM-1', rows)
    expect(step?.window?.panel.filters.open ?? null).not.toBe('FM-1')
  })

  it('IC-122 on a filterable column of the same table still opens its filter', () => {
    const step = delayDiagnosticsReportAfterEntry(OPENED, NO_VIEW, 'IC-122', 'FM-4', rows)
    expect(step?.window?.panel.filters.open).toBe('FM-4')
  })
})

// see FM-1, JDG-2920, JDG-2921
describe('T-374 FM-1 -- pressed while empty, the heading checks every listed row that can take a check', () => {
  it('checks the automatic rows that take a check', () => {
    const rows = ofKind(CHECKED_ALL, 'automatic').filter((row) => row.causedBy === null && row.refusal === null)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.checked, row.key).toBe(true)
  })

  it('checks the choose rows that have one choice, taking that one choice', () => {
    const rows = ofKind(CHECKED_ALL, 'choose').filter((row) => row.choices.length === 1)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.checked, row.key).toBe(true)
      expect(row.chosen ?? row.choices[0]!.key).toBe(row.choices[0]!.key)
    }
  })

  it('checks the date candidate rows too (JDG-2921) and keeps the candidate date they carry', () => {
    const before = ofKind(CLEARED, 'suggestedDate').filter((row) => row.refusal === null)
    const after = ofKind(CHECKED_ALL, 'suggestedDate').filter((row) => row.refusal === null)
    expect(after.length).toBeGreaterThan(0)
    expect(after.map((row) => row.checked)).toEqual(after.map(() => true))
    expect(after.map((row) => row.after)).toEqual(before.map((row) => row.after))
  })

  it('leaves the by-hand rows without a check', () => {
    const rows = ofKind(CHECKED_ALL, 'byHand')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.checked, row.key).toBe(false)
  })

  it('leaves the read-only rows without a check', () => {
    const rows = rowsIn(CHECKED_ALL).filter((row) => row.refusal === 'readOnly')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.checked, row.key).toBe(false)
  })

  it('leaves the choose rows of two or more choices unchecked and unchosen', () => {
    const rows = ofKind(CHECKED_ALL, 'choose').filter((row) => row.choices.length >= 2)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.checked, row.key).toBe(false)
      expect(row.chosen, row.key).toBeNull()
    }
  })

  it('checks only automatic, choose and date candidate origin rows', () => {
    const kinds = rowsIn(CHECKED_ALL).filter((row) => row.checked && row.causedBy === null).map((row) => row.fixKind)
    expect(new Set(kinds)).toEqual(new Set(['automatic', 'choose', 'suggestedDate']))
  })

  it('leaves the unlisted rows as they were', () => {
    const word = withWord(CLEARED, taskNamed(51))
    const listed = listedKeysOf(word)
    expect(listed.length).toBeGreaterThan(0)
    const after = press(word, true, listed)
    const unlisted = rowsIn(after).filter((row) => !listed.includes(row.key))
    expect(unlisted.length).toBeGreaterThan(0)
    for (const row of unlisted) expect(row.checked, row.key).toBe(false)
    expect(rowOfTask(after, 51).checked).toBe(true)
  })

  it('does not check a cascade row whose origin is unchecked', () => {
    const cascade = rowsIn(CLEARED).filter((row) => row.causedBy !== null)
    expect(cascade.length).toBeGreaterThan(0)
    const after = press(CLEARED, true, cascade.map(keyOf))
    expect(checkedKeysIn(after)).toEqual([])
    expect(viewOf(after).showHeading).toBe('empty')
  })

  it('is no change at all when nothing is listed', () => {
    expect(checkedKeysIn(press(CLEARED, true, []))).toEqual([])
  })
})

// see FM-1, JDG-2920
describe('T-374 FM-1 -- pressed while checked, the heading clears every row, listed or not', () => {
  it('clears every row of the scene', () => {
    expect(rowsIn(CLEARED).filter((row) => row.checked && row.isCheckable)).toEqual([])
    expect(checkedKeysIn(CLEARED)).toEqual([])
  })

  it('clears the rows the word keeps out of the list', () => {
    const word = withWord(OPENED, taskNamed(51))
    const listed = listedKeysOf(word)
    expect(checkedKeysIn(word).some((key) => !listed.includes(key))).toBe(true)
    expect(checkedKeysIn(press(word, false, listed))).toEqual([])
  })

  it('clears a row the person checked, a date candidate or a chosen two-choice row alike', () => {
    const [candidate] = ofKind(CLEARED, 'suggestedDate')
    const [pick] = ofKind(CLEARED, 'choose').filter((row) => row.choices.length >= 2)
    const picked = delayDiagnosticsReportWithPick(checkOf(CLEARED, candidate!.key), {
      kind: 'fixPick',
      column: 'FM-8',
      key: pick!.key,
      part: 'choice',
      value: pick!.choices[0]!.key,
    })
    expect(checkedKeysIn(picked)).toEqual(expect.arrayContaining([candidate!.key, pick!.key]))
    expect(checkedKeysIn(press(picked, false))).toEqual([])
  })

  it('check then clear leaves the table empty again', () => {
    const again = press(CHECKED_ALL, false)
    expect(checkedKeysIn(again)).toEqual([])
    expect(viewOf(again).showHeading).toBe('empty')
  })
})

// see RW-12, FM-1
describe('T-346 RW-12 -- the n count follows the heading press', () => {
  it('is 0 after the heading clears every row, and IC-157 and IC-158 do not act', () => {
    const view = viewOf(CLEARED)
    expect(footerNumberOf(CLEARED)).toBe(0)
    const writers = view.fixFooter!.entries.filter((one) => one.icon === 'IC-157' || one.icon === 'IC-158')
    expect(writers).toHaveLength(2)
    for (const entry of writers) expect(entry.isEnabled, entry.icon).toBe(false)
  })

  it('counts the rows the heading checked: it equals the rows shown checked', () => {
    expect(onCellsIn(CHECKED_ALL)).toBeGreaterThan(0)
    expect(footerNumberOf(CHECKED_ALL)).toBe(onCellsIn(CHECKED_ALL))
  })

  it('grows by the listed rows only', () => {
    const after = press(withWord(CLEARED, taskNamed(51)), true)
    expect(footerNumberOf(after)).toBe(1)
    expect(footerNumberOf(withWord(after, ''))).toBe(1)
  })

  it('counts the checked rows the word keeps out of the list', () => {
    expect(footerNumberOf(withWord(OPENED, taskNamed(51)))).toBe(footerNumberOf(OPENED))
  })
})

// see FR-155, FM-1
describe('FR-155 -- the heading writes nothing to the document', () => {
  it('the reducer answers a window and leaves the document as it was', () => {
    const snapshot = JSON.stringify(DOCUMENT)
    const after = press(OPENED, false)
    expect(JSON.stringify(DOCUMENT)).toBe(snapshot)
    expect(after.panel).toEqual(OPENED.panel)
    expect(after.shown).toBe(OPENED.shown)
    expect(delayFixValuesOf(after).table).toBe('proposals')
    expect(delayFixValuesOf(after).views).toEqual(delayFixValuesOf(OPENED).views)
  })
})
