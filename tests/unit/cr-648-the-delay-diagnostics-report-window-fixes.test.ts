// CR-648: the Delay Diagnostics Report window fixes -- DT-1 order, the dictionary words, no legend, RW-10, T-333 steps, T-352 names.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportFileNameOf,
  delayDiagnosticsReportMarkdownOf,
  exportFileNameOf,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { delayDiagnosticsReportFromWindow } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import {
  DELAY_REPORT_STATUSES,
  delayDiagnosticsReportRows,
  type DelayDiagnosticsReport,
  type Schedule,
} from '../../src/entity/document-model/schedule/schedule'
import {
  emptySearchPanelSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_SEARCH_PANEL_FONT_SIZES } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable } from '../contract/spec-table'

type Word = { readonly ja: string; readonly en: string }
type Entry = Readonly<Record<string, unknown>> & { readonly text?: Word; readonly label?: Word }

const MANUSCRIPT = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf-8')) as Record<
  string,
  readonly Entry[]
>

const wordIn = (section: string, keyField: string, key: string): Word => {
  const found = MANUSCRIPT[section]?.find((entry) => entry[keyField] === key)
  if (found?.text === undefined) throw new Error(`the dictionary has no ${section}/${key}`)
  return found.text
}

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
    task(2, 'Bravo', '2026-01-05'),
    task(3, 'Milestone', '2026-02-02', { milestone: true }),
    task(4, 'Delta', '2026-01-01'),
  ],
  resources: [],
  assignments: [],
} as unknown as Schedule

const QUANTITIES = { inheritedDelayDays: 1, selfDelayDays: 2, pushOutDays: 5, terminalsReached: 3 }

const REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2027-06-04T00:00:00',
  findings: [
    { row: 'VS-1', kind: 'suspicion', layer: 1, uid: 2, name: 'Bravo', values: { percentComplete: 0 }, proposedActualFinish: null },
    { row: 'VO-5', kind: 'omission', layer: 1, uid: 3, name: 'Milestone', values: {}, proposedActualFinish: '2027-05-07T17:00:00' },
  ],
  bottlenecks: [{ uid: 2, name: 'Bravo', ...QUANTITIES, path: [2] }, { uid: 1, name: 'Alpha', ...QUANTITIES, path: [1] }],
  terminalPushOuts: [],
  walls: [],
  unanalysedCount: 0,
  markerStates: [
    { uid: 1, row: 'DG-2' },
    { uid: 2, row: 'DG-2' },
    { uid: 3, row: 'DG-1' },
    { uid: 4, row: 'DG-4' },
  ],
  settledPushOuts: [],
  derivedWbsParents: [],
}

const sessionIn = (language: 'ja' | 'en') => ({ screen: { screenLanguage: language } }) as unknown as ScreenSession

const viewIn = (language: 'ja' | 'en') =>
  delayDiagnosticsReportFromWindow(sessionIn(language), OPENED_DELAY_DIAGNOSTICS_REPORT, REPORT, SCHEDULE, {
    canvas: { x: 0, y: 40, width: 1000, height: 600 },
    textSizeStep: 0,
  })

const STAMP = { documentName: 'Plan', madeAt: '2027/06/04 10:00' }

describe('CR-648 DT-1 -- the status order and the precedence', () => {
  it('DT-1: DG-1, the doubtful-or-missing, DG-2, DG-3, DG-4, then the settled', () => {
    expect(DELAY_REPORT_STATUSES).toEqual(['DG-1', 'doubtful', 'DG-2', 'DG-3', 'DG-4', 'settled'])
  })

  it('DT-1: a bottleneck with a T-311 finding is shown doubtful, and the summary does not count it a bottleneck', () => {
    const rows = delayDiagnosticsReportRows(REPORT, SCHEDULE)
    expect(rows.find((one) => one.taskUid === 2)?.status).toBe('doubtful')
    const bottleneck = wordIn('delayReportStatuses', 'rowId', 'DG-2').ja
    const counted = viewIn('ja')?.summary.find((one) => one.status === 'DG-2')?.text ?? ''
    expect(counted).toContain(bottleneck)
    expect(counted).toContain(' 1 ')
  })
})

describe('CR-648 FR-038 -- the report prints the dictionary words, in ja and en', () => {
  it('T-347: the column headings are the dictionary words of DT-1 .. DT-7, in the table order', () => {
    const rows = specTable('T-347').rows.map((one) => one.id)
    for (const language of ['ja', 'en'] as const) {
      expect(viewIn(language)?.columns.map((one) => one.heading)).toEqual(rows.map((row) => wordIn('delayReportColumns', 'rowId', row)[language]))
    }
  })

  it('DT-1 / T-315: the DG-1 status word is the one table T-315 names', () => {
    const named = (specTable('T-315').rows.find((one) => one.id === 'DG-1')?.by['状態'] ?? '').split(' / ')[0]?.trim()
    expect(wordIn('delayReportStatuses', 'rowId', 'DG-1').ja).toBe(named)
  })

  it('DT-7 / T-312 / VO-5: the milestone finding prints the question and the candidate achieved date', () => {
    const milestone = viewIn('ja')?.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === 3)
    expect(milestone?.cells[6]).toBe(`${wordIn('delayReportReasons', 'part', 'milestoneAchieved').ja}（達成日の候補: 2027/05/07）`)
  })

  it('DT-7 / T-311 / VS-6: the dictionary holds the told words of table T-311, its slots named in ASCII', () => {
    const told = specTable('T-311').rows.find((one) => one.id === 'VS-6')?.by['告げる語'] ?? ''
    const slotted = told
      .replace(/^「|」$/g, '')
      .replace('{親の点}', '{parent}')
      .replace('{最も左}', '{leftmost}')
      .replace('{最も右}', '{rightmost}')
      .replace('{日数}', '{days}')
      .replace('{許す日数}', '{tolerance}')
    expect(wordIn('delayReportReasons', 'part', 'parentProgressOutside').ja).toBe(slotted)
  })

  it('DT-7 / T-311 / VS-6: the parent-progress doubt prints its told words, filled with the points, the days and the tolerance', () => {
    const values = {
      parentPoint: '2027-05-03T08:00:00',
      leftmostPoint: '2027-05-10T08:00:00',
      leftmostUid: 1,
      rightmostPoint: '2027-05-12T08:00:00',
      rightmostUid: 2,
      outsideWorkingDays: 5,
      parentProgressToleranceDays: 1,
    }
    const report: DelayDiagnosticsReport = {
      ...REPORT,
      findings: [{ row: 'VS-6', kind: 'suspicion', layer: 4, uid: 4, name: 'Delta', values, proposedActualFinish: null }],
    }
    const slots = { parent: '2027/05/03', leftmost: '2027/05/10', rightmost: '2027/05/12', days: '5', tolerance: '1' }
    for (const language of ['ja', 'en'] as const) {
      const view = delayDiagnosticsReportFromWindow(sessionIn(language), OPENED_DELAY_DIAGNOSTICS_REPORT, report, SCHEDULE, {
        canvas: { x: 0, y: 40, width: 1000, height: 600 },
        textSizeStep: 0,
      })
      const delta = view?.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === 4)
      const expected = Object.entries(slots).reduce(
        (text, [slot, value]) => text.replace(`{${slot}}`, value),
        wordIn('delayReportReasons', 'part', 'parentProgressOutside')[language],
      )
      expect(expected).not.toContain('{')
      expect(delta?.cells[6]).toBe(expected)
    }
  })

  it('DT-7: a bottleneck reason fills the pattern with DQ-4, DQ-2, DQ-3 and the end tasks reached', () => {
    const alpha = viewIn('en')?.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === 1)
    expect(alpha?.cells[6]).toBe('Delaying the whole schedule by 5 working days (inherited 1, own 2; reaches 3 end tasks)')
  })

  it('IC-108: the ja label is Copy', () => {
    const copy = MANUSCRIPT['icons']?.find((entry) => entry['rowId'] === 'IC-108')
    expect(copy?.label).toEqual({ ja: 'Copy', en: 'Copy' })
  })
})

describe('CR-648 RW-4 / RW-6 / RW-10 -- the summary line, no legend, the flame, the fixed columns', () => {
  const lines = delayDiagnosticsReportMarkdownOf(OPENED_DELAY_DIAGNOSTICS_REPORT, REPORT, SCHEDULE, 'ja', STAMP).split('\n')

  it('RW-6: the Markdown holds one summary line and no legend section', () => {
    const summary = lines.filter((line) => line.startsWith(wordIn('delayReportSummary', 'part', 'statusDate').ja.replace(' {date}', '')))
    expect(summary).toHaveLength(1)
    expect(lines.some((line) => line.startsWith('## '))).toBe(false)
  })

  it('RW-6: DG-2 is written with the flame U+1F525 before its word', () => {
    expect(lines.some((line) => line.includes(`\u{1F525} ${wordIn('delayReportStatuses', 'rowId', 'DG-2').ja}`))).toBe(true)
  })

  it('RW-4: the view holds no legend', () => {
    expect(viewIn('ja')).not.toHaveProperty('legend')
  })

  it('RW-10: DT-1, DT-3 and DT-4 are fixed and DT-2, DT-5 .. DT-7 scroll under them', () => {
    const columns = viewIn('ja')?.columns ?? []
    expect(columns.filter((one) => one.isFixed).map((one) => one.column)).toEqual(['DT-1', 'DT-3', 'DT-4'])
    expect(columns.filter((one) => !one.isFixed).map((one) => one.column)).toEqual(['DT-2', 'DT-5', 'DT-6', 'DT-7'])
  })
})

describe('CR-648 T-333 / S-429 -- three text steps, the first is the default', () => {
  it('T-333: the steps are the table rows in order', () => {
    const steps = specTable('T-333').rows.map((one) => Number(bare(one.by['値'] ?? '').replace(/\D+$/, '')))
    expect(Object.values(NOT_STORED_SEARCH_PANEL_FONT_SIZES)).toEqual(steps)
    expect(steps).toHaveLength(3)
  })

  it('S-429: a panel opens at the first step (S-430)', () => {
    expect(emptySearchPanelSession.textSizeStep).toBe(Object.keys(NOT_STORED_SEARCH_PANEL_FONT_SIZES).indexOf('S-430'))
  })
})

describe('CR-648 T-352 / FR-096 / RW-7 -- one rule shapes every suggested name', () => {
  it('FN-1 .. FN-4: spaces and OS-forbidden characters become _, non-ASCII drops, runs fold, ends trim', () => {
    expect(exportFileNameOf('Sample Project - Press N to start a new one', '.json')).toBe('Sample_Project_-_Press_N_to_start_a_new_one.json')
    expect(exportFileNameOf('a/b\\c:d*e?f"g<h>i|j', '.svg')).toBe('a_b_c_d_e_f_g_h_i_j.svg')
    expect(exportFileNameOf('新製品 v2', '.png')).toBe('v2.png')
    expect(exportFileNameOf('  .plan__x.  ', '.html')).toBe('plan_x.html')
  })

  it('FN-5: a name with nothing left is schedule for FR-096', () => {
    expect(exportFileNameOf('新製品の日程', '.json')).toBe('schedule.json')
    expect(exportFileNameOf('', '.xml')).toBe('schedule.xml')
  })

  it('RW-7 / FN-5: the report name is the shaped title, delay-diagnostics and the status date; an empty title is left out', () => {
    expect(delayDiagnosticsReportFileNameOf('Sample Project - Press N to start a new one', REPORT.statusDate)).toBe(
      'Sample_Project_-_Press_N_to_start_a_new_one_delay-diagnostics_2027-06-04.md',
    )
    expect(delayDiagnosticsReportFileNameOf('新製品の日程', REPORT.statusDate)).toBe('delay-diagnostics_2027-06-04.md')
  })
})
