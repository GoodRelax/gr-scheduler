// CR-617 / CR-639 / DFC-1711 / CR-648: the report window -- T-347 rows, the T-346 window, and the one Markdown string of IC-108 and IC-140.

import { describe, expect, it } from 'vitest'

import type { ChosenFileWrite, FileStore } from '../../src/adapter/file-gateway/file-gateway'
import type { Clipboard, ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportFileNameOf,
  delayDiagnosticsReportMarkdownOf,
  delayDiagnosticsReportWithColumnWidth,
  delayDiagnosticsReportWithFilterClosed,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { delayDiagnosticsReportFromWindow } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import {
  delayDiagnosticsReportMarkdown,
  delayDiagnosticsReportRows,
  type DelayDiagnosticsReport,
  type Schedule,
} from '../../src/entity/document-model/schedule/schedule'
import type { ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_SEARCH_PANEL_SIZES } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { columnWidthPx } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import { answerDelayDiagnosticsReportEntry } from '../../src/framework/single-html-shell/delay-diagnostics-report-window'

const task = (uid: number, name: string, start: string, extra: Record<string, unknown> = {}) => ({
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

const SCHEDULE = {
  tasks: [
    task(1, 'Alpha', '2026-03-02'),
    task(2, 'Bravo', '2026-01-05', { percentComplete: 40, actualStart: '2026-01-05T08:00:00' }),
    task(3, 'Charlie', '2026-02-02'),
    task(4, 'Delta', '2026-01-01'),
    task(5, 'Echo', '2026-01-01', { actualStart: '2026-01-01T08:00:00', actualFinish: '2026-01-09T17:00:00', percentComplete: 100 }),
    task(6, 'Foxtrot|Pipe', '2026-04-01'),
    task(7, 'Golf', '2026-05-01'),
  ],
  resources: [{ uid: 10, name: 'Ann' }],
  assignments: [{ uid: 100, taskUid: 2, resourceUid: 10 }],
} as unknown as Schedule

const QUANTITIES = { inheritedDelayDays: 1, selfDelayDays: 2, pushOutDays: 5, terminalsReached: 2 }

const REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [
    { row: 'VC-3', kind: 'contradiction', layer: 1, uid: 1, name: 'Alpha', values: { start: '2026-03-02' }, proposedActualFinish: null },
    { row: 'VS-1', kind: 'suspicion', layer: 1, uid: 6, name: 'Foxtrot|Pipe', values: { percentComplete: 0 }, proposedActualFinish: null },
  ],
  bottlenecks: [{ uid: 2, name: 'Bravo', ...QUANTITIES, path: [3, 2] }],
  terminalPushOuts: [],
  walls: [],
  unanalysedCount: 1,
  markerStates: [
    { uid: 1, row: 'DG-1' },
    { uid: 2, row: 'DG-2' },
    { uid: 3, row: 'DG-3' },
    { uid: 4, row: 'DG-4' },
    { uid: 2, row: 'DG-4' },
  ],
  settledPushOuts: [{ uid: 5, name: 'Echo', ...QUANTITIES }],
  derivedParentTasks: [],
  lateDays: [],
}

const SESSION = { screen: { screenLanguage: 'ja' } } as unknown as ScreenSession

const CANVAS = { x: 0, y: 40, width: 1000, height: 600 }

const viewOf = (window: DelayDiagnosticsReportWindow) =>
  delayDiagnosticsReportFromWindow(SESSION, window, REPORT, SCHEDULE, { canvas: CANVAS, textSizeStep: 1 })

const withWord = (word: string): DelayDiagnosticsReportWindow => ({
  ...OPENED_DELAY_DIAGNOSTICS_REPORT,
  panel: { ...OPENED_DELAY_DIAGNOSTICS_REPORT.panel, word },
})


// see T-347
const REPORT_ORDER: readonly string[] = ['DT-1', 'DT-3', 'DT-4', 'DT-2', 'DT-5', 'DT-6', 'DT-7']

describe('T-347 -- the rows of the report table (FR-134, DT-1)', () => {
  const rows = delayDiagnosticsReportRows(REPORT, SCHEDULE)

  it('holds one row per Task, under the first status of DT-1 it holds', () => {
    expect(rows.map((one) => [one.taskUid, one.status])).toEqual([
      [1, 'DG-1'],
      [6, 'doubtful'],
      [2, 'DG-2'],
      [3, 'DG-3'],
      [4, 'DG-4'],
      [5, 'settled'],
    ])
  })

  it('leaves out a Task with no status (T-347 lists only marked, found or settled Tasks)', () => {
    expect(rows.map((one) => one.taskUid)).not.toContain(7)
  })

  it('carries DT-2 as SQ-2 does, and the reason of DT-7 by status', () => {
    expect(rows.find((one) => one.taskUid === 2)?.assigneeNames).toEqual(['Ann'])
    expect(rows.find((one) => one.taskUid === 3)?.reason).toEqual({ kind: 'bottleneckPath', bottleneckNames: ['Bravo'] })
    expect(rows.find((one) => one.taskUid === 1)?.reason.kind).toBe('unreliable')
  })

  it('orders a status by the oldest Task.start, then by Task.uid (the doubtful before DG-4, CR-648)', () => {
    const tied: DelayDiagnosticsReport = { ...REPORT, markerStates: [1, 3, 4].map((uid) => ({ uid, row: 'DG-4' as const })) }
    expect(delayDiagnosticsReportRows(tied, SCHEDULE).map((one) => one.taskUid)).toEqual([1, 6, 4, 3, 5])
  })
})

describe('T-346 -- the report window (RW-2, RW-3, RW-4, RW-9)', () => {
  const view = viewOf(OPENED_DELAY_DIAGNOSTICS_REPORT)

  it('RW-2: the title row holds IC-127, IC-129, IC-130 and IC-52, and no IC-118 or IC-119', () => {
    expect(view?.titleEntries.map((one) => one.icon)).toEqual(['IC-127', 'IC-129', 'IC-130', 'IC-52'])
    expect(view?.tableEntries).toEqual([])
  })

  it('RW-3: the line under the title holds IC-140 then IC-108, before the word field', () => {
    expect(view?.toolEntries.map((one) => one.icon)).toEqual(['IC-140', 'IC-108'])
  })

  it('RW-4: the summary counts every status and DX-7, and the view holds no legend (CR-648)', () => {
    expect(view).not.toHaveProperty('legend')
    expect(view?.summary.at(-1)?.text).toContain('1')
    expect(view?.summary).toHaveLength(8)
  })

  it('T-347: the columns are DT-1, DT-3, DT-4, DT-2, DT-5, DT-6, DT-7, and the name cell DT-4 is the one a press jumps from', () => {
    expect(view?.columns.map((one) => one.column)).toEqual(REPORT_ORDER)
    expect(view?.jumpAt).toBe(REPORT_ORDER.indexOf('DT-4'))
  })

  it('RW-9 / CR-639: a column starts at S-475 .. S-481 and a held width replaces it', () => {
    const columns = view?.columns ?? []
    expect(columns.map(columnWidthPx)).toEqual(
      ['S-475', 'S-477', 'S-478', 'S-476', 'S-479', 'S-480', 'S-481'].map(
        (row) => NOT_STORED_SEARCH_PANEL_SIZES[row as keyof typeof NOT_STORED_SEARCH_PANEL_SIZES],
      ),
    )
    const widened = delayDiagnosticsReportWithColumnWidth(OPENED_DELAY_DIAGNOSTICS_REPORT, 'DT-4', 333)
    expect(viewOf(widened)?.columns[REPORT_ORDER.indexOf('DT-4')]?.width).toBe(333)
  })

  it('DT-3, DT-5 and DT-6 write 40%, yyyy/mm/dd and an open actual range', () => {
    const bravo = view?.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === 2)
    expect(bravo?.cells[REPORT_ORDER.indexOf('DT-3')]).toBe('40%')
    expect(bravo?.cells[REPORT_ORDER.indexOf('DT-5')]).toBe('2026/01/05')
    expect(bravo?.cells[REPORT_ORDER.indexOf('DT-6')]).toBe('2026/01/05 -')
  })

  it('RW-3: the word keeps the rows whose DT-1 .. DT-5 hold it', () => {
    expect(viewOf(withWord('ann'))?.rows.map((one) => one.status)).toEqual(['DG-2'])
  })

  it('draws nothing while no window or no report is held (RW-1)', () => {
    expect(delayDiagnosticsReportFromWindow(SESSION, null, REPORT, SCHEDULE, { canvas: CANVAS, textSizeStep: 1 })).toBeNull()
  })
})

describe('T-346 / T-335 -- the window entries (WB-2, WB-3, WB-5, SV-7, SV-8, SV-14)', () => {
  const rows = { report: REPORT, schedule: SCHEDULE, language: 'ja' as const }
  const after = (window: DelayDiagnosticsReportWindow, entry: string, column: string | null = null) =>
    delayDiagnosticsReportAfterEntry(window, entry, column, rows)

  it('IC-129 minimises and restores; IC-130 maximises and IC-131 restores', () => {
    const minimised = after(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-129')?.window
    expect(minimised?.shown).toBe('minimised')
    expect(after(minimised as DelayDiagnosticsReportWindow, 'IC-129')?.window?.shown).toBe('normal')
    const maximised = after(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-130')?.window
    expect(maximised?.shown).toBe('maximised')
    expect(after(maximised as DelayDiagnosticsReportWindow, 'IC-131')?.window?.shown).toBe('normal')
  })

  it('IC-52 closes the window alone (RW-1)', () => {
    expect(after(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-52')).toEqual({ window: null })
  })

  it('IC-122 opens a column filter, IC-124 sorts it, and Esc closes the filter first', () => {
    const opened = after(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-122', 'DT-4')?.window as DelayDiagnosticsReportWindow
    expect(opened.panel.filters.open).toBe('DT-4')
    const sorted = after(opened, 'IC-124')?.window as DelayDiagnosticsReportWindow
    expect(sorted.panel.sort).toEqual({ column: 'DT-4', direction: 'descending' })
    expect(viewOf(sorted)?.rows.map((one) => one.cells[REPORT_ORDER.indexOf('DT-4')])).toEqual(['Foxtrot|Pipe', 'Echo', 'Delta', 'Charlie', 'Bravo', 'Alpha'])
    expect(delayDiagnosticsReportWithFilterClosed(sorted)?.panel.filters.open).toBeNull()
    expect(delayDiagnosticsReportWithFilterClosed(OPENED_DELAY_DIAGNOSTICS_REPORT)).toBeNull()
  })

  it('an entry the window does not hold is not answered', () => {
    expect(after(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-1')).toBeNull()
  })
})

describe('RW-6 / RW-7 -- the Markdown string and the file name', () => {
  const stamp = { documentName: 'Plan', madeAt: '2026/10/03 10:00' }
  const text = delayDiagnosticsReportMarkdownOf(OPENED_DELAY_DIAGNOSTICS_REPORT, REPORT, SCHEDULE, 'ja', stamp)
  const lines = text.split('\n')

  it('opens with the heading, then the document name, the status date and the moment it was made', () => {
    expect(lines[0]).toMatch(/^# /)
    expect(lines.slice(2, 5)).toEqual(['- 文書名: Plan', '- 基準日 2026/01/02', '- 作った日時: 2026/10/03 10:00'])
  })

  it('writes the table rows in the window order, with a cell pipe escaped', () => {
    const table = lines.filter((line) => line.startsWith('| '))
    expect(table).toHaveLength(2 + 6)
    expect(table.some((line) => line.includes('Foxtrot\\|Pipe'))).toBe(true)
  })

  it('is the same string for the same window, so IC-108 and IC-140 never differ', () => {
    expect(delayDiagnosticsReportMarkdownOf(OPENED_DELAY_DIAGNOSTICS_REPORT, REPORT, SCHEDULE, 'ja', stamp)).toBe(text)
  })

  it('names the filter that stands, and the rows it keeps', () => {
    const filtered = delayDiagnosticsReportMarkdownOf(withWord('Bravo'), REPORT, SCHEDULE, 'ja', stamp)
    expect(filtered).toContain('- 絞り込み: Bravo')
    expect(filtered.split('\n').filter((line) => line.startsWith('| '))).toHaveLength(3)
  })

  it('delayDiagnosticsReportMarkdown writes the summary line it is handed, and no legend (CR-648)', () => {
    const words = {
      heading: 'H',
      documentName: 'Doc',
      madeAt: 'Made',
      filter: 'Filter',
      none: 'none',
      columns: ['a', 'b'],
      statuses: Object.fromEntries(
        ['DG-1', 'doubtful', 'DG-2', 'DG-3', 'DG-4', 'settled'].map((status) => [status, { symbol: '', word: status }]),
      ) as never,
    }
    const dates = { documentName: 'D', statusDateLine: 'S', madeAt: 'M', summaryLine: 'ONE LINE' }
    const written = delayDiagnosticsReportMarkdown([], { word: '', columns: [] }, words, dates)
    expect(written).toContain('- Filter: none')
    expect(written.split('\n').filter((line) => line === 'ONE LINE')).toHaveLength(1)
    expect(written).not.toMatch(/^## /m)
  })

  it('RW-7: the name is the document name, delay-diagnostics and the status date, whatever the language (CR-648)', () => {
    expect(delayDiagnosticsReportFileNameOf('Plan', REPORT.statusDate)).toBe('Plan_delay-diagnostics_2026-01-02.md')
  })
})

describe('IC-108 / IC-140 -- the shell hands the string out', () => {
  const held = { window: OPENED_DELAY_DIAGNOSTICS_REPORT, report: REPORT, schedule: SCHEDULE, documentName: 'Plan', language: 'ja' as const }

  const outletsOf = (copied: ClipboardContent[], written: ChosenFileWrite[], kept: (DelayDiagnosticsReportWindow | null)[]) => ({
    clipboard: {
      writeClipboardContent: async (content: ClipboardContent) => {
        copied.push(content)
        return { ok: true as const }
      },
    } satisfies Clipboard,
    files: {
      writeChosenFile: async (write: ChosenFileWrite) => {
        written.push(write)
        return { ok: true as const, openedFile: { kind: 'none' as const } }
      },
    } as unknown as FileStore,
    confirmOverwrite: async () => false,
    raiseCopyRefused: () => undefined,
    raiseFileFault: () => undefined,
    holdWindow: (window: DelayDiagnosticsReportWindow | null) => void kept.push(window),
  })

  it('IC-108 copies the Markdown string as a document text', async () => {
    const copied: ClipboardContent[] = []
    expect(answerDelayDiagnosticsReportEntry('IC-108', null, held, outletsOf(copied, [], []))).toBe(true)
    await Promise.resolve()
    expect(copied[0]?.kind).toBe('document')
    expect(copied[0]?.kind === 'document' ? copied[0].text : '').toMatch(/^# /)
  })

  it('IC-140 writes a .md file under the RW-7 name, which never becomes the opened file', async () => {
    const written: ChosenFileWrite[] = []
    expect(answerDelayDiagnosticsReportEntry('IC-140', null, held, outletsOf([], written, []))).toBe(true)
    await Promise.resolve()
    expect(written[0]?.suggestedFileName).toBe('Plan_delay-diagnostics_2026-01-02.md')
    expect(written[0]?.extension).toBe('.md')
    expect(written[0]?.shouldBecomeOpenedFile).toBe(false)
  })

  it('IC-140 asks before an occupied destination, and not before an empty one', async () => {
    let asked = 0
    const answers: boolean[] = []
    const outlets = {
      ...outletsOf([], [], []),
      confirmOverwrite: async () => {
        asked += 1
        return false
      },
    }
    const occupied = { kind: 'occupied' as const, fileName: 'a.md', bytes: new Uint8Array([1]) }
    for (const there of [{ kind: 'empty' as const }, occupied]) {
      const files = {
        writeChosenFile: async (write: ChosenFileWrite) => {
          answers.push(await write.askToWriteOver(there))
          return { ok: true as const, openedFile: { kind: 'none' as const } }
        },
      } as unknown as FileStore
      answerDelayDiagnosticsReportEntry('IC-140', null, held, { ...outlets, files })
      await new Promise((done) => setTimeout(done, 0))
    }
    expect(answers).toEqual([true, false])
    expect(asked).toBe(1)
  })

  it('IC-52 hands the shell no window, and nothing is answered while no report is held', () => {
    const kept: (DelayDiagnosticsReportWindow | null)[] = []
    expect(answerDelayDiagnosticsReportEntry('IC-52', null, held, outletsOf([], [], kept))).toBe(true)
    expect(kept).toEqual([null])
    expect(answerDelayDiagnosticsReportEntry('IC-52', null, null, outletsOf([], [], kept))).toBe(false)
  })
})
