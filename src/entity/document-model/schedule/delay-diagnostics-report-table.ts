// Schedule -- the rows of the Delay Diagnostics Report tables (T-347, T-374), and the report as one Markdown string (RW-6).
// @unit      UF-192  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import { dayOf, isSameDay } from './calendar-day'
import type {
  AnalysisWall,
  DelayDiagnosticsReport,
  DelayFinding,
  DelayMarkerRow,
  DelayQuantities,
} from './delay-diagnostics'
import {
  DELAY_FIX_TYPES,
  type DelayFixChoice,
  type DelayFixLink,
  type DelayFixLogRow,
  type DelayFixRow,
  type DelayFixType,
  type DelayFixValue,
} from './delay-fixes'
import type { Schedule, Task } from './schedule-entities'
import { assigneeNamesByTaskUid, compareDates, plannedFinishOf } from './schedule-search'

// see DT-1
export type DelayReportStatus = DelayMarkerRow | 'doubtful' | 'settled'

// see DT-1
export const DELAY_REPORT_STATUSES: readonly DelayReportStatus[] = ['DG-1', 'doubtful', 'DG-2', 'DG-3', 'DG-4', 'settled']

// see DT-7, DX-6
export interface DelayReportWall {
  readonly row: AnalysisWall['row']
  readonly causeName: string
}

// see DT-7
export type DelayReportReason =
  | { readonly kind: 'unreliable'; readonly findings: readonly DelayFinding[]; readonly walls: readonly DelayReportWall[] }
  | { readonly kind: 'bottleneck'; readonly quantities: DelayQuantities | null }
  | { readonly kind: 'bottleneckPath'; readonly bottleneckNames: readonly string[] }
  | { readonly kind: 'late'; readonly days: number | null }
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

const YEAR_DIGITS = 4

const MONTH_AND_DAY_DIGITS = 2

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
function reasonOf(report: DelayDiagnosticsReport, uid: number, status: DelayReportStatus, taskNames: ReadonlyMap<number, string>): DelayReportReason {
  switch (status) {
    case 'DG-1':
    case 'doubtful':
      return {
        kind: 'unreliable',
        findings: report.findings.filter((one) => one.uid === uid),
        walls: report.walls
          .filter((one) => one.stoppedUids.includes(uid))
          .map((one) => ({ row: one.row, causeName: taskNames.get(one.causeUid) ?? '' })),
      }
    case 'DG-2':
      return { kind: 'bottleneck', quantities: report.bottlenecks.find((one) => one.uid === uid) ?? null }
    case 'DG-3': {
      const below = report.bottlenecks.filter((one) => one.uid !== uid && one.path.includes(uid))
      return { kind: 'bottleneckPath', bottleneckNames: below.map((one) => one.name ?? '') }
    }
    case 'DG-4':
      return { kind: 'late', days: report.lateDays.find((one) => one.uid === uid)?.days ?? null }
    case 'settled':
      return { kind: 'settled', quantities: report.settledPushOuts.find((one) => one.uid === uid) ?? null }
  }
}

/** @purity pure */
function rowOf(
  task: Task,
  status: DelayReportStatus,
  report: DelayDiagnosticsReport,
  names: { readonly assignees: readonly string[]; readonly tasks: ReadonlyMap<number, string> },
): DelayReportRow {
  return {
    taskUid: task.uid,
    status,
    name: task.name ?? '',
    assigneeNames: names.assignees,
    percentComplete: task.percentComplete,
    plannedStart: task.start,
    plannedFinish: plannedFinishOf(task),
    actualStart: task.actualStart,
    actualFinish: task.actualFinish,
    reason: reasonOf(report, task.uid, status, names.tasks),
  }
}

// see FR-134, T-347
/** @purity pure */
export function delayDiagnosticsReportRows(report: DelayDiagnosticsReport, schedule: Schedule): readonly DelayReportRow[] {
  const statuses = delayReportStatusesOf(report)
  const assignees = assigneeNamesByTaskUid(schedule)
  const tasks = new Map(schedule.tasks.map((task) => [task.uid, task.name ?? '']))
  const rows = schedule.tasks.flatMap((task) => {
    const status = statuses.get(task.uid)
    return status === undefined ? [] : [rowOf(task, status, report, { assignees: assignees.get(task.uid) ?? [], tasks })]
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
function labeled(label: string, value: string): string {
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

// see FR-134, FR-155, RW-4, RW-6, IC-108, IC-140
// WHY: the one string IC-108 copies and IC-140 writes, so the two never differ (CR-617 decision 5).
/** @purity pure */
export function delayDiagnosticsReportMarkdown(
  rows: readonly DelayReportTextRow[],
  filter: DelayReportFilter,
  words: DelayReportWords,
  dates: DelayReportDates,
  fixes?: DelayFixMarkdown,
): string {
  return [
    `# ${words.heading}`,
    '',
    labeled(words.documentName, dates.documentName),
    labeled('', dates.statusDateLine),
    labeled(words.madeAt, dates.madeAt),
    labeled(words.filter, filterText(filter, words.none)),
    '',
    dates.summaryLine,
    '',
    ...tableLines(rows, words),
    ...fixMarkdownLines(fixes, words),
    '',
  ].join('\n')
}

type DelayFixTable = 'proposals' | 'log'

const LINK_ARROW = '\u2192'

const CHECK_MARK = '\u2713'

const DATES_JOIN = ' / '

const LINKS_JOIN = ', '

const MINUTE_OF_TEXT = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/

// see T-374, FM-4, FM-7, FM-8
export interface DelayFixWords {
  readonly empty: string
  readonly suggested: string
  readonly choosePlaceholder: string
  readonly openFieldHint: string
  readonly cascadePrefix: string
  readonly readOnlyReason: string
  readonly fixTypeOf: (fixType: DelayFixType) => string
  readonly findingOf: (findingRow: string, taskUid: number) => string
  readonly columnOf: (column: string) => string
  readonly choiceOf: (choice: DelayFixChoice) => string
  readonly taskNameOf: (taskUid: number) => string
  readonly linkTypeOf: (linkType: number) => string
}

// see RW-6, T-374
export interface DelayFixMarkdownSection {
  readonly heading: string
  readonly filter: DelayReportFilter
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

// see RW-6
// WHY: log is null while the log holds no row, so no log section is written then.
export interface DelayFixMarkdown {
  readonly proposals: DelayFixMarkdownSection
  readonly log: DelayFixMarkdownSection | null
}

// see T-374
/** @purity pure */
function tableOfColumn(column: string): DelayFixTable | 'both' | null {
  switch (column) {
    case 'FM-1':
    case 'FM-3':
      return 'proposals'
    case 'FM-2':
      return 'log'
    case 'FM-4':
    case 'FM-5':
    case 'FM-6':
    case 'FM-7':
    case 'FM-8':
      return 'both'
    default:
      return null
  }
}

// see T-374
// WHY: the caller hands the dictionary's column roster (delayFixColumns), so the order lives in one generated place.
/** @purity pure */
export function delayFixColumnsOf(table: DelayFixTable, columns: readonly string[]): readonly string[] {
  return columns.filter((column) => {
    const held = tableOfColumn(column)
    return held === table || held === 'both'
  })
}

/** @purity pure */
function fixTypeRank(fixType: DelayFixType): number {
  return DELAY_FIX_TYPES.indexOf(fixType)
}

// see T-374, T-373
/** @purity pure */
export function compareDelayFixRows(schedule: Schedule): (a: DelayFixRow, b: DelayFixRow) => number {
  const startOf = new Map(schedule.tasks.map((task) => [task.uid, task.start]))
  const layerOf = (row: DelayFixRow): number => row.layer ?? Number.POSITIVE_INFINITY
  return (a, b) =>
    fixTypeRank(a.fixType) - fixTypeRank(b.fixType) ||
    layerOf(a) - layerOf(b) ||
    b.depth - a.depth ||
    compareDates(startOf.get(a.taskUid) ?? null, startOf.get(b.taskUid) ?? null) ||
    a.taskUid - b.taskUid ||
    a.applyOrder - b.applyOrder
}

// see T-374
// WHY: a chain row stays right under the row that raised it, whatever order the person sorts by.
/** @purity pure */
export function delayFixRowsInOrder(
  rows: readonly DelayFixRow[],
  compare: (a: DelayFixRow, b: DelayFixRow) => number,
): readonly DelayFixRow[] {
  const keys = new Set(rows.map((row) => row.key))
  const chainsOf = new Map<string, DelayFixRow[]>()
  for (const row of rows) {
    if (row.causedBy !== null && keys.has(row.causedBy)) chainsOf.set(row.causedBy, [...(chainsOf.get(row.causedBy) ?? []), row])
  }
  const ordered: DelayFixRow[] = []
  const place = (row: DelayFixRow): void => {
    ordered.push(row)
    for (const chain of [...(chainsOf.get(row.key) ?? [])].sort(compare)) place(chain)
  }
  for (const row of rows.filter((one) => one.causedBy === null || !keys.has(one.causedBy)).sort(compare)) place(row)
  return ordered
}

// see T-374, DX-11
/** @purity pure */
export function delayFixProposalRows(rows: readonly DelayFixRow[], schedule: Schedule): readonly DelayFixRow[] {
  return delayFixRowsInOrder(rows, compareDelayFixRows(schedule))
}

// see T-374, DX-12
/** @purity pure */
export function delayFixLogRowsInOrder(rows: readonly DelayFixLogRow[]): readonly DelayFixLogRow[] {
  return [...rows].sort((a, b) => b.fixedAt.localeCompare(a.fixedAt) || a.order - b.order)
}

/** @purity pure */
function dateCellText(text: string | null, words: DelayFixWords): string {
  const day = dayOf(text)
  if (day === null) return words.empty
  return [String(day.year).padStart(YEAR_DIGITS, '0'), ...[day.month, day.day].map((one) => String(one).padStart(MONTH_AND_DAY_DIGITS, '0'))].join('/')
}

/** @purity pure */
function linkText(link: DelayFixLink, words: DelayFixWords): string {
  const ends = `${words.taskNameOf(link.predecessorUid)} ${LINK_ARROW} ${words.taskNameOf(link.successorUid)}`
  return `${ends} (${words.linkTypeOf(link.linkType)})`
}

// see FM-7
/** @purity pure */
export function delayFixValueText(value: DelayFixValue, words: DelayFixWords): string {
  switch (value.kind) {
    case 'empty':
      return words.empty
    case 'date':
      return dateCellText(value.text, words)
    case 'dates':
      return value.texts.map((text) => dateCellText(text, words)).join(DATES_JOIN)
    case 'flag':
      return value.value ? CHECK_MARK : ''
    case 'links':
      return value.links.length === 0 ? words.empty : value.links.map((link) => linkText(link, words)).join(LINKS_JOIN)
  }
}

// see FM-8
/** @purity pure */
function proposalAfterText(row: DelayFixRow, words: DelayFixWords): string {
  const after = row.after === null ? '' : delayFixValueText(row.after, words)
  if (row.refusal === 'readOnly') return words.readOnlyReason
  switch (row.fixType) {
    case 'byHand':
      return words.openFieldHint
    case 'choose': {
      const chosen = row.choices.find((one) => one.key === row.chosen)
      return chosen === undefined ? words.choosePlaceholder : words.choiceOf(chosen)
    }
    case 'suggestedDate':
      return row.after?.kind === 'date' && isSameDay(row.after.text, row.suggested) ? `${after} ${words.suggested}` : after
    case 'automatic':
      return after
  }
}

/** @purity pure */
function findingCellText(findingRow: string, taskUid: number, isCascade: boolean, words: DelayFixWords): string {
  const finding = words.findingOf(findingRow, taskUid)
  return isCascade ? `${words.cascadePrefix} ${finding}` : finding
}

/** @purity pure */
function minuteText(fixedAt: string): string {
  const hit = MINUTE_OF_TEXT.exec(fixedAt)
  return hit === null ? fixedAt : `${hit[1]}/${hit[2]}/${hit[3]} ${hit[4]}:${hit[5]}`
}

// see T-374
/** @purity pure */
function sharedCellOf(column: string, row: DelayFixRow | DelayFixLogRow, isCascade: boolean, words: DelayFixWords): string {
  switch (column) {
    case 'FM-4':
      return findingCellText(row.findingRow, row.taskUid, isCascade, words)
    case 'FM-5':
      return row.taskName ?? ''
    case 'FM-6':
      return row.column === null ? '' : words.columnOf(row.column)
    case 'FM-7':
      return delayFixValueText(row.before, words)
    default:
      return ''
  }
}

// see T-374
/** @purity pure */
function proposalCellOf(column: string, row: DelayFixRow, words: DelayFixWords): string {
  switch (column) {
    case 'FM-1':
      return row.checked ? CHECK_MARK : ''
    case 'FM-3':
      return words.fixTypeOf(row.fixType)
    case 'FM-8':
      return proposalAfterText(row, words)
    default:
      return sharedCellOf(column, row, row.causedBy !== null, words)
  }
}

// see T-374
/** @purity pure */
function logCellOf(column: string, row: DelayFixLogRow, words: DelayFixWords): string {
  switch (column) {
    case 'FM-2':
      return minuteText(row.fixedAt)
    case 'FM-8':
      return delayFixValueText(row.after, words)
    default:
      return sharedCellOf(column, row, row.isCascade, words)
  }
}

// see T-374, RW-6
/** @purity pure */
export function delayFixProposalCells(row: DelayFixRow, words: DelayFixWords, columns: readonly string[]): readonly string[] {
  return delayFixColumnsOf('proposals', columns).map((column) => proposalCellOf(column, row, words))
}

// see T-374, RW-6
/** @purity pure */
export function delayFixLogCells(row: DelayFixLogRow, words: DelayFixWords, columns: readonly string[]): readonly string[] {
  return delayFixColumnsOf('log', columns).map((column) => logCellOf(column, row, words))
}

/** @purity pure */
function plainTableLines(columns: readonly string[], rows: readonly (readonly string[])[]): readonly string[] {
  const line = (cells: readonly string[]): string => `| ${cells.map(markdownCell).join(' | ')} |`
  return [line(columns), line(columns.map(() => '---')), ...rows.map(line)]
}

// see RW-6
/** @purity pure */
function fixSectionLines(section: DelayFixMarkdownSection, words: DelayReportWords): readonly string[] {
  return [
    '',
    `## ${section.heading}`,
    '',
    labeled(words.filter, filterText(section.filter, words.none)),
    '',
    ...plainTableLines(section.columns, section.rows),
  ]
}

// see RW-6
/** @purity pure */
function fixMarkdownLines(fixes: DelayFixMarkdown | undefined, words: DelayReportWords): readonly string[] {
  if (fixes === undefined) return []
  return [...fixSectionLines(fixes.proposals, words), ...(fixes.log === null ? [] : fixSectionLines(fixes.log, words))]
}
