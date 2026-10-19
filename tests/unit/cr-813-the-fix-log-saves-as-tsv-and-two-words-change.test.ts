// CR-813 spec-only cases: RW-20 / IO-9 / IC-169 (the Fix Log saves as .tsv), FM-6 (Property), PTL-15 (derived parent label).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  DELAY_FIX_LOG_EXTENSION,
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayFixLogFileNameOf,
  delayFixLogTsvOf,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  NO_DELAY_FIX_VALUES,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import {
  delayFixLogTsv,
  type DelayDiagnosticsReport,
  type DelayFixLogRow,
  type Schedule,
} from '../../src/entity/document-model/schedule/schedule'
import { NO_ROW_CHECKED, type ScreenSession, type TableView } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable } from '../contract/spec-table'

type Word = { readonly ja: string; readonly en: string }
type Entry = Readonly<Record<string, unknown>> & { readonly text?: Word; readonly label?: Word; readonly hint?: Word }

const read = (...parts: string[]): string => readFileSync(join(process.cwd(), ...parts), 'utf-8')

const MANUSCRIPT = JSON.parse(read('docs', 'spec', '_source', 'display-words.json')) as Record<string, readonly Entry[]>
const GENERATED_COPY = JSON.parse(read('src', 'adapter', 'screen-renderer', 'display-words.json')) as Record<string, readonly Entry[]>

const wordIn = (book: Record<string, readonly Entry[]>, section: string, keyField: string, key: string): Word => {
  const found = book[section]?.find((entry) => entry[keyField] === key)
  const word = found?.text ?? found?.label
  if (word === undefined) throw new Error(`the dictionary has no ${section}/${key}`)
  return word
}

const BOM = '﻿'
const LANGUAGES = ['ja', 'en'] as const


const task = (uid: number, name: string, start: string) => ({
  uid,
  name,
  start: `${start}T08:00:00`,
  finish: `${start}T17:00:00`,
  milestone: false,
  actualStart: null,
  actualFinish: null,
  percentComplete: 0,
})

const SCHEDULE = {
  tasks: [task(1, 'Alpha', '2027-05-10'), task(2, 'Bravo', '2027-05-11'), task(3, 'Gamma\tTab', '2027-05-12')],
  project: { minutesPerDay: null },
  resources: [],
  assignments: [],
} as unknown as Schedule

const REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2027-06-04T00:00:00',
  findings: [],
  bottlenecks: [],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
}

const NO_VIEW: TableView = { visibility: NO_ROW_CHECKED, columnFilters: [], sort: null }
const sessionIn = (language: 'ja' | 'en') => ({ screen: { screenLanguage: language } }) as unknown as ScreenSession
const LAYOUT = { canvas: { x: 0, y: 40, width: 1000, height: 600 }, textSizeStep: 0 }

const logRow = (over: Partial<DelayFixLogRow> & Pick<DelayFixLogRow, 'fixedAt' | 'order' | 'taskUid' | 'taskName'>): DelayFixLogRow => ({
  fixRow: 'FA-11',
  findingRow: 'VC-11',
  column: 'PR-4',
  before: { kind: 'date', text: '2027-05-20' },
  after: { kind: 'date', text: '2027-05-22' },
  isCascade: false,
  ...over,
})

// WHY: given out of order on purpose; the default order of the log is newest fixed time first, then the order in the bundle (T-374).
const OLDEST = logRow({ fixedAt: '2027-05-02T09:00:00', order: 0, taskUid: 1, taskName: 'Alpha' })
const NEWEST_FIRST_IN_BUNDLE = logRow({ fixedAt: '2027-05-03T10:30:00', order: 0, taskUid: 2, taskName: 'Bravo' })
const NEWEST_SECOND_IN_BUNDLE = logRow({
  fixedAt: '2027-05-03T10:30:00',
  order: 1,
  taskUid: 3,
  taskName: 'Gamma\tTab',
  column: 'PR-8',
  before: { kind: 'flag', value: true },
  after: { kind: 'flag', value: false },
})
const LOG = [OLDEST, NEWEST_SECOND_IN_BUNDLE, NEWEST_FIRST_IN_BUNDLE]
const FIX_TABLES = { proposals: [], log: LOG }

const windowOn = (table: 'diagnosis' | 'proposals' | 'log'): DelayDiagnosticsReportWindow => ({
  ...OPENED_DELAY_DIAGNOSTICS_REPORT,
  fixes: { ...NO_DELAY_FIX_VALUES, table },
})

const tsvIn = (language: 'ja' | 'en', fixTables = FIX_TABLES): string =>
  delayFixLogTsvOf(windowOn('log'), REPORT, SCHEDULE, language, fixTables)

const linesOf = (text: string): string[][] => {
  expect(text.startsWith(BOM), 'the text starts with a BOM').toBe(true)
  return text
    .slice(1)
    .split('\r\n')
    .map((line) => line.split('\t'))
}


const COLUMN_ROWS_OF_THE_LOG = ['FM-2', 'FM-4', 'FM-9', 'FM-5', 'FM-6', 'FM-7', 'FM-8']
const TSV_PARTS = ['tsvTaskUid', 'tsvBeforeUid', 'tsvAfterUid']

describe('T-374 FM-6 -- the heading word is Property / プロパティ', () => {
  it('FM-6 reads プロパティ in ja and Property in en, in the manuscript and in its generated copy', () => {
    for (const book of [MANUSCRIPT, GENERATED_COPY]) {
      expect(wordIn(book, 'delayFixColumns', 'rowId', 'FM-6')).toEqual({ ja: 'プロパティ', en: 'Property' })
    }
  })

  it('FM-6 is the heading of the Fix Log property column in the file (ja and en)', () => {
    for (const language of LANGUAGES) {
      const heading = linesOf(tsvIn(language))[0]!
      expect(heading[4]).toBe(wordIn(MANUSCRIPT, 'delayFixColumns', 'rowId', 'FM-6')[language])
    }
  })

  it('FM-6 still stands in table T-374 at the place the property column holds', () => {
    const ids = specTable('T-374').rows.map((one) => one.id)
    expect(ids).toContain('FM-6')
  })
})

describe('PTL-15 (2) -- the derived parent label is 「（推定(自明)）」 / (inferred)', () => {
  it('derivedParent is "{name}（推定(自明)）" in ja and "{name} (inferred)" in en, in the manuscript and its copy', () => {
    for (const book of [MANUSCRIPT, GENERATED_COPY]) {
      expect(wordIn(book, 'propertyField', 'part', 'derivedParent')).toEqual({
        ja: '{name}（推定(自明)）',
        en: '{name} (inferred)',
      })
    }
  })

  it('the spec row PTL-15 (2) names the same suffix', () => {
    const row = specTable('T-351').rows.find((one) => one.id === 'PTL-15')
    expect(JSON.stringify(row)).toContain('（推定(自明)）')
  })
})

describe('IC-169 -- the word and the hint of the entrance', () => {
  it('the label is 「.tsv で保存」 / "Save As .tsv" in the manuscript and in the generated copy', () => {
    for (const book of [MANUSCRIPT, GENERATED_COPY]) {
      expect(wordIn(book, 'icons', 'rowId', 'IC-169')).toEqual({ ja: '.tsv で保存', en: 'Save As .tsv' })
    }
  })

  it('table T-109 holds IC-169 under the Delay Diagnostics Report', () => {
    const row = specTable('T-109').rows.find((one) => one.id === 'IC-169')
    expect(row, 'T-109 has an IC-169 row').toBeDefined()
    expect(JSON.stringify(row)).toContain('Delay Diagnostics Report')
  })
})

describe('RW-20 -- the dictionary words of the three uid headings', () => {
  it('delayFixes holds tsvTaskUid, tsvBeforeUid and tsvAfterUid with the words the spec names', () => {
    expect(wordIn(MANUSCRIPT, 'delayFixes', 'part', 'tsvTaskUid')).toEqual({ ja: 'タスク UID', en: 'Task UID' })
    expect(wordIn(MANUSCRIPT, 'delayFixes', 'part', 'tsvBeforeUid')).toEqual({ ja: '修正前 UID', en: 'Before UID' })
    expect(wordIn(MANUSCRIPT, 'delayFixes', 'part', 'tsvAfterUid')).toEqual({ ja: '修正後 UID', en: 'After UID' })
  })
})


describe('RW-20 -- delayFixLogTsv builds the text: BOM, TAB, CRLF, one space for a tab or a break', () => {
  it('starts with U+FEFF, joins cells with TAB and lines with CRLF, heading first, no trailing break', () => {
    const text = delayFixLogTsv(['h1', 'h2', 'h3'], [['a', 'b', 'c'], ['d', 'e', 'f']])
    expect(text.charCodeAt(0)).toBe(0xfeff)
    expect(text.slice(1)).toBe('h1\th2\th3\r\na\tb\tc\r\nd\te\tf')
    expect(text.slice(1).split('\r\n')[0]).toBe('h1\th2\th3')
  })

  it('a tab, an LF, a CR and a CRLF inside a cell each become exactly one space', () => {
    const text = delayFixLogTsv(['x'], [['a\tb'], ['a\nb'], ['a\rb'], ['a\r\nb'], ['a\t\tb']])
    expect(text.slice(1).split('\r\n')).toEqual(['x', 'a b', 'a b', 'a b', 'a b', 'a  b'])
  })

  it('a tab or a break inside a heading is also one space, so the line keeps its cell count', () => {
    const text = delayFixLogTsv(['one\ttwo', 'three\nfour'], [['a', 'b']])
    const [heading, row] = text.slice(1).split('\r\n')
    expect(heading!.split('\t')).toEqual(['one two', 'three four'])
    expect(row!.split('\t')).toHaveLength(2)
  })

  it('a heading line alone (no rows) is the whole text after the BOM', () => {
    expect(delayFixLogTsv(['a', 'b'], [])).toBe(`${BOM}a\tb`)
  })

  it('an empty cell stays empty between two tabs', () => {
    expect(delayFixLogTsv(['a', 'b', 'c'], [['1', '', '']]).slice(1)).toBe('a\tb\tc\r\n1\t\t')
  })
})


describe('RW-20 -- delayFixLogTsvOf writes the Fix Log table with the uid cells', () => {
  it('the heading is the Fix Log column words in table order, then the three uid words (ja)', () => {
    const heading = linesOf(tsvIn('ja'))[0]!
    expect(heading).toEqual([
      '日時',
      '指摘',
      'タスク種別',
      'タスク',
      'プロパティ',
      '修正前',
      '修正後',
      'タスク UID',
      '修正前 UID',
      '修正後 UID',
    ])
  })

  it('the heading is built from the dictionary words, in ja and in en', () => {
    for (const language of LANGUAGES) {
      const expected = [
        ...COLUMN_ROWS_OF_THE_LOG.map((row) => wordIn(MANUSCRIPT, 'delayFixColumns', 'rowId', row)[language]),
        ...TSV_PARTS.map((part) => wordIn(MANUSCRIPT, 'delayFixes', 'part', part)[language]),
      ]
      expect(linesOf(tsvIn(language))[0], language).toEqual(expected)
    }
  })

  it('the heading in en reads Date and Time .. Property .. Task UID, Before UID, After UID', () => {
    const heading = linesOf(tsvIn('en'))[0]!
    expect(heading[0]).toBe('Date and Time')
    expect(heading[4]).toBe('Property')
    expect(heading.slice(-3)).toEqual(['Task UID', 'Before UID', 'After UID'])
  })

  it('there is one line for each Fix Log row after the heading, and every line holds ten cells', () => {
    const lines = linesOf(tsvIn('ja'))
    expect(lines).toHaveLength(1 + LOG.length)
    for (const line of lines) expect(line).toHaveLength(10)
  })

  it('the rows follow the Fix Log order: the newest fixed time first, then the order within the bundle', () => {
    const lines = linesOf(tsvIn('ja')).slice(1)
    expect(lines.map((line) => line[7])).toEqual(['2', '3', '1'])
  })

  it('each row ends with its own task uid and two empty cells (no current fix value points at a Task)', () => {
    const lines = linesOf(tsvIn('ja')).slice(1)
    for (const line of lines) {
      expect(line[7]).toMatch(/^\d+$/)
      expect(line[8]).toBe('')
      expect(line[9]).toBe('')
    }
  })

  it('the cells before the uids read as the table shows them: time, finding, property, before, after', () => {
    const lines = linesOf(tsvIn('ja')).slice(1)
    const [first, second, third] = lines
    expect(first![0]).toBe('2027/05/03 10:30')
    expect(second![0]).toBe('2027/05/03 10:30')
    expect(third![0]).toBe('2027/05/02 09:00')
    const finding = wordIn(MANUSCRIPT, 'delayReportAspects', 'rowId', 'VC-11').ja
    expect(third![1]).toContain(finding)
    expect(third![3]).toContain('Alpha')
    expect(third![4]).toBe(wordIn(MANUSCRIPT, 'properties', 'rowId', 'PR-4').ja)
    expect(third![5]).toBe('2027/05/20')
    expect(third![6]).toBe('2027/05/22')
  })

  it('a tab inside a task name does not add a cell: the name carries one space instead', () => {
    const lines = linesOf(tsvIn('ja')).slice(1)
    const withTab = lines.find((line) => line[7] === '3')!
    expect(withTab).toHaveLength(10)
    expect(withTab[3]).toContain('Gamma Tab')
  })

  it('the file is the same rows in en: the time stays, the words follow the language', () => {
    const lines = linesOf(tsvIn('en')).slice(1)
    expect(lines.map((line) => line[7])).toEqual(['2', '3', '1'])
    expect(lines[2]![0]).toBe('2027/05/02 09:00')
    expect(lines[2]![4]).toBe(wordIn(MANUSCRIPT, 'properties', 'rowId', 'PR-4').en)
  })

  it('a Fix Log with no row is the heading alone', () => {
    const lines = linesOf(tsvIn('ja', { proposals: [], log: [] }))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toHaveLength(10)
  })

  it('the proposals are not part of the file (RW-20 writes the Fix Log table)', () => {
    const lines = linesOf(tsvIn('ja', { proposals: [], log: [OLDEST] }))
    expect(lines).toHaveLength(2)
  })
})


describe('IO-9 -- the .tsv format row', () => {
  it('table T-024 holds IO-9 as TSV, write only, .tsv, text/tab-separated-values', () => {
    const row = specTable('T-024').rows.find((one) => one.id === 'IO-9')
    expect(row, 'T-024 has IO-9').toBeDefined()
    const text = JSON.stringify(row)
    expect(text).toContain('TSV')
    expect(text).toContain('.tsv')
    expect(text).toContain('text/tab-separated-values')
  })

  it('DELAY_FIX_LOG_EXTENSION is .tsv', () => {
    expect(DELAY_FIX_LOG_EXTENSION).toBe('.tsv')
  })
})

describe('RW-20 / RW-7 / T-352 -- the name the chooser proposes', () => {
  it('"My Plan" at 2026-10-19 09:41:07 is My_Plan_fix-log_2026-10-19-0941.tsv', () => {
    expect(delayFixLogFileNameOf('My Plan', '2026-10-19T09:41:07', '.tsv')).toBe('My_Plan_fix-log_2026-10-19-0941.tsv')
  })

  it('a moment without seconds gives the same name', () => {
    expect(delayFixLogFileNameOf('My Plan', '2026-10-19T09:41', '.tsv')).toBe('My_Plan_fix-log_2026-10-19-0941.tsv')
  })

  it('FN-5: an empty document name drops the body and the underscore after it', () => {
    expect(delayFixLogFileNameOf('', '2026-10-19T09:41:07', '.tsv')).toBe('fix-log_2026-10-19-0941.tsv')
  })

  it('FN-2 / FN-5: a name of non-ASCII letters only is shaped to empty and dropped', () => {
    expect(delayFixLogFileNameOf('新製品の日程', '2026-10-19T09:41:07', '.tsv')).toBe('fix-log_2026-10-19-0941.tsv')
  })

  it('FN-1 / FN-3 / FN-4: the document name is shaped by T-352 before it is joined', () => {
    expect(delayFixLogFileNameOf('a/b:c  d', '2026-10-19T23:05:00', '.tsv')).toBe('a_b_c_d_fix-log_2026-10-19-2305.tsv')
  })

  it('fix-log does not follow the display language; the name ends in the extension given', () => {
    const name = delayFixLogFileNameOf('Plan', '2026-01-02T03:04:05', DELAY_FIX_LOG_EXTENSION)
    expect(name).toBe('Plan_fix-log_2026-01-02-0304.tsv')
    expect(name.endsWith('.tsv')).toBe(true)
  })
})


const footerEntriesOf = (table: 'diagnosis' | 'proposals' | 'log', fixTables = FIX_TABLES): readonly string[] => {
  const view = delayDiagnosticsReportFromWindow(sessionIn('ja'), windowOn(table), NO_VIEW, REPORT, SCHEDULE, LAYOUT, fixTables)
  expect(view, 'the report view is built').not.toBeNull()
  return (view!.fixFooter?.entries ?? []).map((one) => one.icon as string)
}

describe('RW-20 / RW-12 -- the footer under the Fix Log holds IC-169, and no other table does', () => {
  it('on the Fix Log table the footer holds IC-169', () => {
    expect(footerEntriesOf('log')).toContain('IC-169')
  })

  it('on the Proposals table the footer does not hold IC-169', () => {
    expect(footerEntriesOf('proposals')).not.toContain('IC-169')
  })

  it('on the diagnosis table the footer does not hold IC-169', () => {
    expect(footerEntriesOf('diagnosis')).not.toContain('IC-169')
  })

  it('the Fix Log footer is reached by pressing IC-156 and then holds IC-169, with the IC-157 / IC-158 entries left to the proposals', () => {
    const step = delayDiagnosticsReportAfterEntry(OPENED_DELAY_DIAGNOSTICS_REPORT, NO_VIEW, 'IC-156', null, {
      report: REPORT,
      schedule: SCHEDULE,
      language: 'ja',
      fixTables: FIX_TABLES,
    })
    expect(step, 'IC-156 acts when the log holds rows').not.toBeNull()
    const view = delayDiagnosticsReportFromWindow(
      sessionIn('ja'),
      step!.window as DelayDiagnosticsReportWindow,
      step!.view,
      REPORT,
      SCHEDULE,
      LAYOUT,
      FIX_TABLES,
    )
    const icons = (view!.fixFooter?.entries ?? []).map((one) => one.icon as string)
    expect(icons).toContain('IC-169')
    expect(icons).not.toContain('IC-157')
    expect(icons).not.toContain('IC-158')
  })

  it('IC-169 is left of anything else in the footer (left-aligned, RW-20)', () => {
    expect(footerEntriesOf('log')[0]).toBe('IC-169')
  })
})
