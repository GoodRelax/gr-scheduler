// Schedule -- the rows of the Delay Diagnostics Report table (T-347), and the report as one Markdown string (RW-6).
// @unit      UF-192  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import type {
  AnalysisWall,
  DelayDiagnosticsReport,
  DelayFinding,
  DelayMarkerRow,
  DelayQuantities,
} from './delay-diagnostics'
import type { Schedule, Task } from './schedule-entities'
import { assigneeNamesByTaskUid, compareDates, plannedFinishOf } from './schedule-search'

// see DT-1
export type DelayReportStatus = DelayMarkerRow | 'doubtful' | 'settled'

// see DT-1
export const DELAY_REPORT_STATUSES: readonly DelayReportStatus[] = ['DG-1', 'doubtful', 'DG-2', 'DG-3', 'DG-4', 'settled']

// see DT-7
export type DelayReportReason =
  | { readonly kind: 'unreliable'; readonly findings: readonly DelayFinding[]; readonly walls: readonly AnalysisWall[] }
  | { readonly kind: 'bottleneck'; readonly quantities: DelayQuantities | null }
  | { readonly kind: 'bottleneckPath'; readonly bottleneckNames: readonly string[] }
  | { readonly kind: 'late' }
  | { readonly kind: 'settled'; readonly quantities: DelayQuantities | null }

// see T-347
export interface DelayReportRow {
  readonly taskUid: number
  readonly status: DelayReportStatus
  readonly name: string
  readonly assigneeNames: readonly string[]
  readonly percentComplete: number | null
  readonly plannedStart: string | null
  readonly plannedFinish: string | null
  readonly actualStart: string | null
  readonly actualFinish: string | null
  readonly reason: DelayReportReason
}

export interface DelayReportTextRow {
  readonly status: DelayReportStatus
  readonly cells: readonly string[]
}

// see RW-6
export interface DelayReportFilter {
  readonly word: string
  readonly columns: readonly { readonly heading: string; readonly condition: string }[]
}

// see RW-6, T-315
export interface DelayReportWords {
  readonly heading: string
  readonly documentName: string
  readonly madeAt: string
  readonly filter: string
  readonly none: string
  readonly columns: readonly string[]
  readonly statuses: Readonly<Record<DelayReportStatus, { readonly symbol: string; readonly word: string }>>
}

// see RW-4, RW-6
export interface DelayReportDates {
  readonly documentName: string
  readonly statusDateLine: string
  readonly madeAt: string
  readonly summaryLine: string
}

const MARKDOWN_LINE_BREAKS = /\r\n|\r|\n/g

const STATUS_RANKS: ReadonlyMap<DelayReportStatus, number> = new Map(DELAY_REPORT_STATUSES.map((status, rank) => [status, rank]))

/** @purity pure */
function statusRank(status: DelayReportStatus): number {
  return STATUS_RANKS.get(status) ?? DELAY_REPORT_STATUSES.length
}

/** @purity pure */
function earlierStatus(held: DelayReportStatus | undefined, status: DelayReportStatus): DelayReportStatus {
  return held === undefined || statusRank(status) < statusRank(held) ? status : held
}

// see DT-1, DX-3, DX-8, DX-9
/** @purity pure */
function delayReportStatusesOf(report: DelayDiagnosticsReport): ReadonlyMap<number, DelayReportStatus> {
  const statuses = new Map<number, DelayReportStatus>()
  const note = (uid: number, status: DelayReportStatus): void => void statuses.set(uid, earlierStatus(statuses.get(uid), status))
  for (const one of report.markerStates) note(one.uid, one.row)
  for (const one of report.findings) note(one.uid, 'doubtful')
  for (const one of report.settledPushOuts) note(one.uid, 'settled')
  return statuses
}

// see DT-7, DX-4
/** @purity pure */
function reasonOf(report: DelayDiagnosticsReport, uid: number, status: DelayReportStatus): DelayReportReason {
  switch (status) {
    case 'DG-1':
    case 'doubtful':
      return {
        kind: 'unreliable',
        findings: report.findings.filter((one) => one.uid === uid),
        walls: report.walls.filter((one) => one.causeUid === uid),
      }
    case 'DG-2':
      return { kind: 'bottleneck', quantities: report.bottlenecks.find((one) => one.uid === uid) ?? null }
    case 'DG-3': {
      const below = report.bottlenecks.filter((one) => one.uid !== uid && one.path.includes(uid))
      return { kind: 'bottleneckPath', bottleneckNames: below.map((one) => one.name ?? '') }
    }
    case 'DG-4':
      // DEVIATION: DFC-1772 -- the report holds no DX-10, so the delay days of DT-7 are not carried.
      return { kind: 'late' }
    case 'settled':
      return { kind: 'settled', quantities: report.settledPushOuts.find((one) => one.uid === uid) ?? null }
  }
}

/** @purity pure */
function rowOf(task: Task, status: DelayReportStatus, report: DelayDiagnosticsReport, names: readonly string[]): DelayReportRow {
  return {
    taskUid: task.uid,
    status,
    name: task.name ?? '',
    assigneeNames: names,
    percentComplete: task.percentComplete,
    plannedStart: task.start,
    plannedFinish: plannedFinishOf(task),
    actualStart: task.actualStart,
    actualFinish: task.actualFinish,
    reason: reasonOf(report, task.uid, status),
  }
}

// see FR-134, T-347
/** @purity pure */
export function delayDiagnosticsReportRows(report: DelayDiagnosticsReport, schedule: Schedule): readonly DelayReportRow[] {
  const statuses = delayReportStatusesOf(report)
  const assignees = assigneeNamesByTaskUid(schedule)
  const rows = schedule.tasks.flatMap((task) => {
    const status = statuses.get(task.uid)
    return status === undefined ? [] : [rowOf(task, status, report, assignees.get(task.uid) ?? [])]
  })
  return rows.sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) || compareDates(a.plannedStart, b.plannedStart) || a.taskUid - b.taskUid,
  )
}

// see RW-6
/** @purity pure */
function markdownCell(text: string): string {
  return text.replace(MARKDOWN_LINE_BREAKS, ' ').replace(/\|/g, '\\|')
}

/** @purity pure */
function labelled(label: string, value: string): string {
  return label === '' ? `- ${value}` : `- ${label}: ${value}`
}

/** @purity pure */
function statusText(words: DelayReportWords, status: DelayReportStatus): string {
  const { symbol, word } = words.statuses[status]
  return symbol === '' ? word : `${symbol} ${word}`
}

/** @purity pure */
function filterText(filter: DelayReportFilter, none: string): string {
  const word = filter.word === '' ? [] : [filter.word]
  const columns = filter.columns.map((one) => `${one.heading} ${one.condition}`)
  const parts = [...word, ...columns]
  return parts.length === 0 ? none : parts.join(', ')
}

/** @purity pure */
function tableLines(rows: readonly DelayReportTextRow[], words: DelayReportWords): readonly string[] {
  const line = (cells: readonly string[]): string => `| ${cells.map(markdownCell).join(' | ')} |`
  return [
    line(words.columns),
    line(words.columns.map(() => '---')),
    ...rows.map((row) => line([statusText(words, row.status), ...row.cells.slice(1)])),
  ]
}

// see FR-134, RW-4, RW-6, IC-108, IC-140
// WHY: the one string IC-108 copies and IC-140 writes, so the two never differ (CR-617 decision 5).
/** @purity pure */
export function delayDiagnosticsReportMarkdown(
  rows: readonly DelayReportTextRow[],
  filter: DelayReportFilter,
  words: DelayReportWords,
  dates: DelayReportDates,
): string {
  return [
    `# ${words.heading}`,
    '',
    labelled(words.documentName, dates.documentName),
    labelled('', dates.statusDateLine),
    labelled(words.madeAt, dates.madeAt),
    labelled(words.filter, filterText(filter, words.none)),
    '',
    dates.summaryLine,
    '',
    ...tableLines(rows, words),
    '',
  ].join('\n')
}
