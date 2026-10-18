// AgentApiEndpoint -- wires the members of table T-107 to the components that do the work.
// @unit      UF-28   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure
// Generated region: the value types of table T-400, AgentApi and AGENT_API_VERSION from
// docs/spec/_source/agent-api-members.json (tables T-107, T-400). Do not edit by hand; npm run gen.

import type { Document } from '../../entity/document-model/document/document'
import {
  delayFixProposalRows,
  diagnoseDelay,
  proposeDelayFixes,
  searchRowsOf,
  workingCalendarOf,
  type DelayDiagnosticsReport,
  type DelayFixLogRow,
  type DelayFixRow,
  type SearchRows,
} from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  applyDocumentChange,
  replaceDocument,
  type ChangeAudience,
  type DocumentCommand,
  type DocumentHolder,
  type PlanRefusal,
  type Refusal,
  type ReplaceOutcome,
  type ReplacementCall,
  type ReplacementRefusal,
  type WriteMoment,
} from '../../use-case/apply-document-change/apply-document-change'
import {
  searchJumpReachOf,
  searchJumpWrites,
  searchJumpCommands,
  shownTasksRevealWrites,
  type InvariantRefusal,
  type InvariantRow,
} from '../../use-case/edit-document/edit-document'
import * as NotifyChangeWatchers from '../../use-case/notify-change-watchers/notify-change-watchers'
import * as DocumentCodec from '../document-codec/document-codec'
import { jsonFromDocument, mspdiFromDocument } from '../document-codec/document-codec'
import * as ImageExporter from '../image-exporter/image-exporter'
import {
  delayReportColumnHeadings,
  delayReportTableRows,
  filteredSearchRows,
  resourceListColumnHeadings,
  resourceListTableRows,
  taskSearchColumnHeadings,
} from '../screen-renderer/screen-renderer'
import { hasRoomBelowPinsIn } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { AgentSnapshot, SnapshotSource } from './snapshot-source'

type DocumentStamp = Document['documentStamp']

// see AG-9a, T-233
type CodecRefusalReason = Extract<DocumentCodec.JsonDecoding, { readonly ok: false }>['reason']

type ChangeNotice = NotifyChangeWatchers.ChangeNotice

// see AM-26, TV-1
// WHY: the keys of the document's tableViews, read off the document so this component gains no edge to AdvanceScreenSession.
export type VisibilityTable = keyof Document['documentSettings']['tableViews']

type SearchTableView = Document['documentSettings']['tableViews']['searchPanel']

// see AM-26, AM-16, SJ-0
// WHY: the table views are the document's (FR-151, S-560); AM-27 writes them with setTableView (CM-92).
export interface ShownTasksHolder {
  /** @purity semi-pure-b */
  readShownTasks(): AgentShownTasks
  // see SJ-0, UN-20
  // WHY: AM-16 touches no panel (SJ-9) but does SJ-0, which puts the target among the drawn tasks;
  // its view writes ride in the SJ-2 write, so the jump is one undo step.
  /** @purity semi-pure-b */
  jumpViewWrites(taskUid: number): readonly DocumentCommand[]
  // see SJ-5
  /** @purity non-pure */
  holdJumpTarget(taskUid: number): void
}

// see DX-12, RW-16
export interface DelayFixLogSource {
  /** @purity semi-pure-b */
  readDelayFixLog(): readonly DelayFixLogRow[]
}

export type AskedSurface = 'U-61'

export interface HistoryStepper {
  /** @purity non-pure */
  undoStep(expectedStamp: DocumentStamp, writer: string): ReplaceOutcome
  /** @purity non-pure */
  redoStep(expectedStamp: DocumentStamp, writer: string): ReplaceOutcome
}

// see AM-8, AG-9a
export type ImportLanding =
  | boolean
  | { readonly landed: false; readonly refusals: readonly InvariantRefusal[] }

// <generated -- do not edit by hand>
// From docs/spec/_source/agent-api-members.json (tables T-107 and T-400).
// see AV-1
export interface AgentWriteRequest {
  readonly expectedStamp: DocumentStamp
  readonly commands: readonly DocumentCommand[]
}

// see AV-2
export type AgentWriteOutcome =
  | { readonly ok: true; readonly stamp: DocumentStamp; readonly hasUpdatedSchedule: boolean }
  | { readonly ok: false; readonly refusal: AgentRefusal }

// see AV-3
export interface AgentRefusal {
  readonly target: string
  readonly reason: AgentRefusalReason
  readonly stamp: DocumentStamp
  readonly refusals: readonly Refusal[]
  readonly message: string
}

// see AV-4
export type AgentRefusalReason =
  | 'staleStamp'
  | 'notOwnStep'
  | 'gestureInFlight'
  | 'editingInPlace'
  | 'questionAsked'
  | 'deliveringNotices'
  | 'commandRefused'
  | 'unknownTask'
  | 'notDrawnYet'
  | 'tooTall'
  | 'rasterFailed'
  | 'embeddedHtmlFailed'
  | 'notAvailable'
  | 'malformedRequest'
  | CodecRefusalReason
  | InvariantRow

// see AV-5
export type AgentExport<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly refusal: AgentRefusal }

// see AV-6
export type AgentFocusOutcome =
  | {
      readonly ok: true
      readonly stamp: DocumentStamp
      readonly hasUpdatedSchedule: boolean
      readonly isScrolled: boolean
    }
  | { readonly ok: false; readonly refusal: AgentRefusal }

// see AV-7
export type AgentImportSource =
  | Document
  | { readonly document: Document }
  | { readonly text: string }

// see AV-8
export interface AgentShownTasks {
  readonly drawnTaskUids: readonly number[] | null
  readonly filteringTables: readonly VisibilityTable[]
}

// see AV-9
export interface AgentDelayDiagnostics extends DelayDiagnosticsReport {
  readonly fixProposals: readonly DelayFixRow[]
  readonly fixLog: readonly DelayFixLogRow[]
}

// see AV-10
export type AgentChangeReceiver = (notice: ChangeNotice) => void

// see AV-11
export interface AgentWatch {
  readonly hasReplacedEarlierWatch: boolean
  /** @purity non-pure */
  stopWatching(): boolean
}

// see AV-15
export type AgentImportOutcome =
  | { readonly ok: true; readonly stamp: DocumentStamp; readonly hasUpdatedSchedule: boolean }
  | { readonly ok: true; readonly asked: string; readonly stamp: DocumentStamp }
  | { readonly ok: false; readonly refusal: AgentRefusal }

// see AV-16
export interface AgentSearchPage {
  readonly taskRows: SearchRows['taskRows']
  readonly commentBoxRows: SearchRows['commentBoxRows']
  readonly columns: readonly AgentTableColumn[]
  readonly taskTotal: number
  readonly offset: number
  readonly nextOffset: number | null
}

// see AV-17
export interface AgentTableColumn {
  readonly id: string
  readonly ja: string
  readonly en: string
  readonly kind: 'text' | 'date'
}

// see AV-18
export type AgentTableRows =
  | {
      readonly ok: true
      readonly table: string
      readonly columns: readonly AgentTableColumn[]
      readonly rows: readonly AgentTableRow[]
      readonly total: number
      readonly offset: number
      readonly nextOffset: number | null
    }
  | { readonly ok: false; readonly refusal: AgentRefusal }

// see AV-19
export interface AgentTableRow {
  readonly key: number | string
  readonly cells: readonly AgentTableCell[]
}

// see AV-20
export interface AgentTableCell {
  readonly column: string
  readonly text: string
}

// see AV-21
export interface AgentSavedFile {
  readonly ok: true
  readonly savedTo: string
  readonly bytes: number
  readonly backedUpTo: string | null
}

// see T-107
export interface AgentApi {
  readonly agentApiVersion: string
  readonly schemaVersion: string

  /** @purity semi-pure-b */
  readDocument(includeCarry: boolean, taskUids: readonly number[]): Document
  /** @purity semi-pure-b */
  readStamp(): DocumentStamp
  /** @purity semi-pure-b */
  readSelection(): Selection
  /** @purity semi-pure-b */
  readSearchRows(word: string, filters: 'asShown' | 'none', offset: number, limit: number): AgentSearchPage
  /** @purity semi-pure-b */
  readTableRows(table: 'delayDiagnosticsReport' | 'resourceList', word: string, filters: 'asShown' | 'none', offset: number, limit: number): AgentTableRows
  /** @purity semi-pure-b */
  readShownTasks(): AgentShownTasks
  /** @purity semi-pure-b */
  readDelayDiagnostics(): AgentDelayDiagnostics

  /** @purity non-pure */
  applyCommands(request: AgentWriteRequest): AgentWriteOutcome
  /** @purity non-pure */
  importDocument(source: AgentImportSource): Promise<AgentImportOutcome>
  /** @purity non-pure */
  requestOpenFile(): AgentImportOutcome

  /** @purity non-pure */
  undoEdit(expectedStamp: DocumentStamp): AgentWriteOutcome
  /** @purity non-pure */
  redoEdit(expectedStamp: DocumentStamp): AgentWriteOutcome

  /** @purity semi-pure-b */
  exportJson(): AgentExport<string>
  /** @purity semi-pure-b */
  exportMspdi(): AgentExport<string>
  /** @purity semi-pure-b */
  exportSvg(): AgentExport<string>
  /** @purity semi-pure-b */
  exportPng(): Promise<AgentExport<Uint8Array>>
  /** @purity semi-pure-b */
  exportEmbeddedHtml(): Promise<AgentExport<string>>

  /** @purity non-pure */
  focusTask(taskUid: number): AgentFocusOutcome
  /** @purity non-pure */
  showOnlyTasks(taskUids: readonly number[]): AgentWriteOutcome

  /** @purity non-pure */
  watchChanges(receive: AgentChangeReceiver): AgentWatch
}

// see AV-14
// WHY: declared by their own components; their field names are held against table T-400 here.
type SameFieldNames<TValue, TNames extends PropertyKey> = [keyof TValue] extends [TNames]
  ? ([TNames] extends [keyof TValue] ? true : false)
  : false
const ELSEWHERE_DECLARED_FIELDS_MATCH: [
  SameFieldNames<ChangeNotice, 'watcher' | 'stamp' | 'mark'>,
] = [true]
void ELSEWHERE_DECLARED_FIELDS_MATCH

// see AM-1, AG-1
const AGENT_API_VERSION = '2026-10-18T08:42:32Z'
// </generated>

export interface AgentApiWiring {
  readonly source: SnapshotSource
  readonly holder: DocumentHolder
  readonly audience: ChangeAudience
  // see SF-10
  readonly changeWatchers: NotifyChangeWatchers.ChangeWatchers
  // TRAP: required but possibly undefined, never optional (so too appShell and takeInDocument): an optional member lets a wiring forget it silently.
  readonly rasterizer: ImageExporter.Rasterizer | undefined
  readonly appShell: DocumentCodec.AppShellSource | undefined
  readonly takeInDocument:
    | ((incoming: Document, reading: HandedFormatReading, onAsked: (asked: AskedSurface) => void) => Promise<ImportLanding>)
    | undefined
  // see AM-26, AM-27
  readonly shownTasks: ShownTasksHolder | undefined
  // WHY: optional, unlike its siblings: the log is a screen value of the report window, and a page with no window has written none, so an absent source reads as an empty log.
  readonly delayFixLog?: DelayFixLogSource | undefined
  // WHY: optional: absent, the holder is stepped through the same use case; the shell's steps also land the screen (FR-100).
  readonly historySteps?: HistoryStepper | undefined
  // see AM-29, QN-17
  readonly askToOpenFile?: (() => void) | undefined
  // TRAP: must differ from the person's writer name, or AG-6 takes the person's edits for this API's own.
  readonly writerName: string
  readonly schemaVersion: string
}

const NO_DROPPED_KEYS: ReadonlySet<string> = new Set()
const CARRY_KEYS: ReadonlySet<string> = new Set(['carry', 'carryElements'])

// see AG-4, AM-3
// WHY: a walk, not structuredClone or a JSON round trip: both throw on some values (FR-028).
/** @purity pure */
function frozenCopy<TValue>(value: TValue, dropped: ReadonlySet<string> = NO_DROPPED_KEYS): TValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((held: unknown) => frozenCopy(held, dropped))) as TValue
  }
  if (typeof value === 'object' && value !== null) {
    const copy: Record<string, unknown> = {}
    for (const [key, held] of Object.entries(value)) {
      if (!dropped.has(key)) copy[key] = frozenCopy(held, dropped)
    }
    return Object.freeze(copy) as TValue
  }
  return value
}

/** @purity pure */
function scheduleOfTasks(schedule: Document['schedule'], taskUids: readonly number[]): Document['schedule'] {
  const named = new Set(taskUids)
  const isNamed = (uid: number | null): boolean => uid !== null && named.has(uid)
  return {
    ...schedule,
    tasks: schedule.tasks.filter((task) => isNamed(task.uid)),
    assignments: schedule.assignments.filter((assignment) => isNamed(assignment.taskUid)),
    taskVisuals: schedule.taskVisuals.filter((visual) => isNamed(visual.taskUid)),
    taskGroupMembers: schedule.taskGroupMembers.filter((member) => isNamed(member.taskUid)),
    taskOrigins: schedule.taskOrigins.filter((origin) => isNamed(origin.taskUid)),
    baselineTasks: schedule.baselineTasks.filter((baseline) => isNamed(baseline.uid)),
  }
}

// see AM-3, FR-028
/** @purity pure */
function documentAsRead(document: Document, includeCarry: unknown, taskUids: unknown): Document {
  const isNarrowed = Array.isArray(taskUids) && taskUids.length > 0
  const narrowed = isNarrowed ? { ...document, schedule: scheduleOfTasks(document.schedule, taskUids as readonly number[]) } : document
  return frozenCopy(narrowed, includeCarry === true ? NO_DROPPED_KEYS : CARRY_KEYS)
}

type ColumnHeading = ReturnType<typeof taskSearchColumnHeadings>[number]

/** @purity pure */
function agentColumnOf(heading: ColumnHeading): AgentTableColumn {
  return { id: heading.column, ja: heading.ja, en: heading.en, kind: heading.isDate ? 'date' : 'text' }
}

// see AM-25, AM-28, AV-17, T-331
const SEARCH_PAGE_LIMIT = 100
const SEARCH_TABLE_COLUMNS: readonly AgentTableColumn[] = taskSearchColumnHeadings().map(agentColumnOf)

/** @purity pure */
function wholeNumberOr(given: unknown, fallback: number): number {
  return typeof given === 'number' && Number.isFinite(given) ? Math.max(0, Math.floor(given)) : fallback
}

// see AM-25, AM-28
/** @purity pure */
function pageBoundsOf(offset: unknown, limit: unknown): { readonly start: number; readonly end: number } {
  const start = wholeNumberOr(offset, 0)
  const count = Math.min(SEARCH_PAGE_LIMIT, Math.max(1, wholeNumberOr(limit, SEARCH_PAGE_LIMIT)))
  return { start, end: start + count }
}

// see AM-25, AV-16, S-562, S-563
/** @purity pure */
function searchPageOf(document: Document, word: string, filters: unknown, offset: unknown, limit: unknown): AgentSearchPage {
  const found = searchRowsOf(document.schedule, typeof word === 'string' ? word : '')
  const held = document.documentSettings.tableViews?.searchPanel
  const isAsShown = filters !== 'none' && held !== undefined
  const rows = isAsShown ? filteredSearchRows(found, held.columnFilters, held.sort) : found
  const { start, end } = pageBoundsOf(offset, limit)
  return {
    taskRows: rows.taskRows.slice(start, end),
    commentBoxRows: found.commentBoxRows,
    columns: SEARCH_TABLE_COLUMNS,
    taskTotal: rows.taskRows.length,
    offset: start,
    nextOffset: end < rows.taskRows.length ? end : null,
  }
}

type AgentTable = Parameters<AgentApi['readTableRows']>[0]

const TABLE_COLUMNS: Readonly<Record<AgentTable, readonly AgentTableColumn[]>> = {
  delayDiagnosticsReport: delayReportColumnHeadings().map(agentColumnOf),
  resourceList: resourceListColumnHeadings().map(agentColumnOf),
}

// see AM-28, AV-20
// WHY: the Agent API reads no screen value: not the screen language (S-99), nor the choice of resources (RO-3).
const TABLE_CELL_LANGUAGE = 'en'
const NO_CHOSEN_RESOURCES: readonly number[] = []

/** @purity pure */
function isAgentTable(table: unknown): table is AgentTable {
  return typeof table === 'string' && Object.prototype.hasOwnProperty.call(TABLE_COLUMNS, table)
}

// see AM-28, AM-19, FR-134, FR-099, S-566, S-567, S-571, S-572
/** @purity pure */
function tableRowsListedOf(document: Document, table: AgentTable, word: string, isAsShown: boolean): readonly AgentTableRow[] {
  const look = { word, isAsShown, language: TABLE_CELL_LANGUAGE } as const
  const { schedule, documentSettings } = document
  if (table === 'resourceList') return resourceListTableRows(schedule, documentSettings, NO_CHOSEN_RESOURCES, look)
  const report = diagnoseDelay(document, workingCalendarOf(schedule))
  return delayReportTableRows(report, schedule, documentSettings, look)
}

// see AM-28, AV-18, T-347, T-371
/** @purity pure */
function tableRowsPageOf(document: Document, table: AgentTable, word: unknown, filters: unknown, offset: unknown, limit: unknown): AgentTableRows {
  const rows = tableRowsListedOf(document, table, typeof word === 'string' ? word : '', filters !== 'none')
  const { start, end } = pageBoundsOf(offset, limit)
  return {
    ok: true,
    table,
    columns: TABLE_COLUMNS[table],
    rows: rows.slice(start, end),
    total: rows.length,
    offset: start,
    nextOffset: end < rows.length ? end : null,
  }
}

// see HS-12, AT-140, AG-4
// WHY: the held document keeps the AT-140 it was opened with (HS-11); every stamp handed out carries the lower line's time.
/** @purity pure */
function stampHandedOut(stamp: DocumentStamp, snapshot: AgentSnapshot): DocumentStamp {
  return frozenCopy({ ...stamp, fileSavedAt: snapshot.documentAsWritten.documentStamp.fileSavedAt })
}

/** @purity pure */
function reasonOfPlanRefusal(refusal: PlanRefusal): AgentRefusalReason {
  switch (refusal.step) {
    case 'WS-1':
      return 'staleStamp'
    case 'WS-2':
      return refusal.reason
    case 'WS-3':
      return 'commandRefused'
  }
}

/** @purity pure */
function ruleOfPlanRefusal(refusal: PlanRefusal): string {
  switch (refusal.step) {
    case 'WS-1':
      return 'AG-2'
    case 'WS-2':
      return refusal.reason === 'deliveringNotices' ? 'Chapter 5.5' : 'AG-9'
    case 'WS-3':
      return 'AG-3'
  }
}

// WHY: commandRefused for an empty side of the history: AV-4 has no reason of its own, and notAvailable means a missing component.
/** @purity pure */
function reasonOfStepRefusal(refusal: ReplacementRefusal): AgentRefusalReason {
  if (refusal.step !== 'WS-3') return reasonOfPlanRefusal(refusal)
  return refusal.reason === 'notOwnStep' ? 'notOwnStep' : 'commandRefused'
}

/** @purity pure */
function stepRefusalWhat(refusal: ReplacementRefusal): string {
  if (refusal.step !== 'WS-3') return `${refusal.step} refused it; the rule is ${ruleOfPlanRefusal(refusal)}`
  if (refusal.reason === 'notOwnStep') return 'AG-10: the step was written by another writer, not by you'
  return 'FR-031: the history holds no step to move'
}

/** @purity pure */
function agentRefusal(
  target: string,
  reason: AgentRefusalReason,
  snapshot: AgentSnapshot,
  what: string,
  refusals: readonly Refusal[],
): AgentRefusal {
  // WHY: never the document, even for staleStamp (AG-2, AV-3).
  return {
    target,
    reason,
    stamp: frozenCopy(snapshot.documentAsWritten.documentStamp),
    refusals,
    message: what,
  }
}

/** @purity pure */
function notAvailable(target: string, snapshot: AgentSnapshot, missing: string): AgentRefusal {
  return agentRefusal(target, 'notAvailable', snapshot, `not built yet: ${missing}`, [])
}

// see AM-26, TV-1
// WHY: a page with no screen draws every task; it answers no product and no table.
const NO_SHOWN_TASKS: AgentShownTasks = { drawnTaskUids: null, filteringTables: [] }

// see AM-19, DX-11, DX-12, FR-155
// WHY: the proposals with no row checked or chosen by a person: AM-19 reads no screen value but the log.
/** @purity semi-pure-b */
function delayDiagnosticsWithFixes(document: Document, log: DelayFixLogSource | undefined): AgentDelayDiagnostics {
  const report = diagnoseDelay(document, workingCalendarOf(document.schedule))
  const fixProposals = delayFixProposalRows(proposeDelayFixes(document, report, []), document.schedule)
  return { ...report, fixProposals, fixLog: log?.readDelayFixLog() ?? [] }
}

// see AM-27, TV-5, AG-5, FR-028
// WHY: untyped caller input; a list naming every task hides no row, and TV-5 keeps the filter from turning on for nothing.
/** @purity pure */
function shownTasksRefusalOf(snapshot: AgentSnapshot, taskUids: unknown, held: SearchTableView): AgentRefusal | null {
  if (!Array.isArray(taskUids) || taskUids.some((uid) => typeof uid !== 'number')) {
    return agentRefusal('AM-27', 'malformedRequest', snapshot, 'taskUids is not a list of numbers', [])
  }
  const known = new Set(snapshot.document.schedule.tasks.map((task) => task.uid))
  const unknown = taskUids.filter((uid) => !known.has(uid))
  if (unknown.length > 0) return agentRefusal('AM-27', 'unknownTask', snapshot, `no task carries these uids: ${unknown.join(', ')}`, [])
  const isNothingHidden = new Set(taskUids).size === known.size
  if (isNothingHidden && !held.isScheduleFilterApplied) return agentRefusal('AM-27', 'commandRefused', snapshot, 'TV-5: no row would be hidden', [])
  return null
}

// see AM-27, CM-92, S-560, S-561
/** @purity pure */
function searchTableViewWrite(held: SearchTableView, shownTaskUids: readonly number[], isScheduleFilterApplied: boolean): DocumentCommand {
  const visibility = { shownTaskUids, shownResourceUids: [], isUnassignedShown: false, isScheduleFilterApplied }
  return { kind: 'setTableView', table: 'searchPanel', view: { visibility, columnFilters: held.columnFilters, sort: held.sort } }
}

// see AM-27, TV-5, TV-6, TV-8, UN-20, FR-100
// WHY: one setTableView and the TV-6 reveal writes in one step (JDG-1868); WS-1 gets the stamp just read, as AM-16 does.
/** @purity non-pure */
function showOnlyTasksThrough(wiring: AgentApiWiring, snapshot: AgentSnapshot, taskUids: readonly number[]): AgentWriteOutcome {
  const held = snapshot.document.documentSettings.tableViews.searchPanel
  const stamp = snapshot.document.documentStamp
  if (Array.isArray(taskUids) && taskUids.length === 0) {
    if (!held.isScheduleFilterApplied) return { ok: true, stamp: frozenCopy(snapshot.documentAsWritten.documentStamp), hasUpdatedSchedule: false }
    return writeThroughTheOnePath(wiring, snapshot, 'AM-27', stamp, [searchTableViewWrite(held, held.shownTaskUids, false)])
  }
  const refusal = shownTasksRefusalOf(snapshot, taskUids, held)
  if (refusal !== null) return { ok: false, refusal }
  const named = new Set(taskUids)
  const shownTaskUids = snapshot.document.schedule.tasks.map((task) => task.uid).filter((uid) => named.has(uid))
  const opened = held.isScheduleFilterApplied ? [...named].filter((uid) => !held.shownTaskUids.includes(uid)) : []
  const commands = [searchTableViewWrite(held, shownTaskUids, true), ...shownTasksRevealWrites(snapshot.document, opened)]
  return writeThroughTheOnePath(wiring, snapshot, 'AM-27', stamp, commands)
}

// see AM-16, SJ-0, SJ-2, SJ-5, SJ-9, SJ-10
/** @purity non-pure */
function focusTaskThrough(wiring: AgentApiWiring, snapshot: AgentSnapshot, taskUid: number): AgentFocusOutcome {
  const frame = snapshot.frame
  if (frame === null) {
    return {
      ok: false,
      refusal: agentRefusal('AM-16', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
    }
  }

  const schedule = snapshot.document.schedule
  if (!schedule.tasks.some((held) => held.uid === taskUid)) {
    return {
      ok: false,
      refusal: agentRefusal('AM-16', 'unknownTask', snapshot, 'no task carries this uid', []),
    }
  }

  const member = schedule.taskGroupMembers.find((held) => held.taskUid === taskUid)
  const hasRoom = hasRoomBelowPinsIn(frame.layout, frame.regions.taskGroupArea, member?.taskGroupId ?? null)
  const target = { kind: 'task', taskUid } as const
  const plan = searchJumpWrites(snapshot.document, target, hasRoom, searchJumpReachOf(frame.layout, frame.geometry, frame.regions.taskGroupArea, target))
  const commands = [...(wiring.shownTasks?.jumpViewWrites(taskUid) ?? []), ...searchJumpCommands(plan, frame.unstoredZoom ?? null)]
  // WHY: WS-1 gets the stamp just read: the caller named a task, not a document it read,
  // so a concurrent edit does not refuse it.
  const written = writeThroughTheOnePath(wiring, snapshot, 'AM-16', snapshot.document.documentStamp, commands)
  if (written.ok) wiring.shownTasks?.holdJumpTarget(taskUid)
  return written.ok ? { ...written, isScrolled: !plan.isBlockedByPinnedTaskGroups } : written
}

// see FR-073
interface HandedFormatReading {
  readonly unreadColumns: readonly string[]
  readonly isNewerFormat: boolean
  // see FR-012, RS-52
  readonly recountedCount: number
}

// see AM-8, AG-9a
type HandedReading =
  | {
      readonly ok: true
      readonly document: Document
      readonly unreadColumns: readonly string[]
      readonly isNewerFormat: boolean
      readonly recountedCount: number
    }
  | { readonly ok: false; readonly reason: AgentRefusalReason; readonly what: string }

type HandedText =
  | { readonly ok: true; readonly json: string }
  | { readonly ok: false; readonly what: string }

const NONE_OF_THE_SHAPES =
  'AM-8 takes the document, { document } or { text }; none of the three was given'

// WHY: every shape is decoded by the codec, so { document } and the bare document refuse
// exactly what { text } refuses, with the codec's reason (DFC-911).
/** @purity pure */
function handedDocument(
  handed: AgentImportSource,
  greatestKnownSchemaVersion: string,
): HandedReading {
  const given = textOfHanded(handed)
  if (!given.ok) return { ok: false, reason: 'malformedRequest', what: given.what }
  const read = DocumentCodec.documentFromJson(given.json, greatestKnownSchemaVersion)
  if (read.ok) {
    const isNewerFormat = read.formatVersion === 'newerThanKnown'
    return {
      ok: true,
      document: read.document,
      unreadColumns: read.unreadColumns,
      isNewerFormat,
      recountedCount: read.recountedCount,
    }
  }
  const faults = read.faults.map((one) => `${one.at} ${one.what}`).join('; ')
  const what = `the codec refused it (${read.reason}): ${faults}`
  return { ok: false, reason: read.reason, what }
}

/** @purity pure */
function textOfHanded(handed: AgentImportSource): HandedText {
  if (handed === null || typeof handed !== 'object') return { ok: false, what: NONE_OF_THE_SHAPES }
  const bag = handed as Record<string, unknown>
  if (typeof bag['text'] === 'string') return { ok: true, json: bag['text'] }
  const named = bag['document']
  if (named !== null && typeof named === 'object') return serializedDocument(named)
  return typeof bag['schedule'] === 'object' && bag['schedule'] !== null
    ? serializedDocument(handed)
    : { ok: false, what: NONE_OF_THE_SHAPES }
}

// WHY: caught despite ST-7: a handed value may hold a cycle or a bigint, and writing either
// as JSON throws, which FR-028 forbids passing on.
/** @purity pure */
function serializedDocument(value: object): HandedText {
  try {
    return { ok: true, json: jsonFromDocument(value as Document) }
  } catch (thrown) {
    const what = `the handed document cannot be written as JSON: ${messageOf(thrown)}`
    return { ok: false, what }
  }
}

const KIND_FIELD = '/kind'

/** @purity pure */
function commandKindText(command: unknown): string {
  const kind = typeof command === 'object' && command !== null ? (command as { readonly kind?: unknown }).kind : undefined
  return typeof kind === 'string' ? `kind ${JSON.stringify(kind)}` : 'no kind'
}

// see FR-028, AG-9a, T-108
// WHY: judged before the one path, so a bundle out of shape is refused without touching the document (DFC-2856).
/** @purity pure */
function malformedWriteRequestWhat(request: AgentWriteRequest): string | null {
  if (request === null || typeof request !== 'object'
    || (request.expectedStamp as unknown) === null
    || typeof request.expectedStamp !== 'object'
    || !Array.isArray(request.commands)) {
    return 'applyCommands takes { expectedStamp, commands }; one of the two is missing or not its shape'
  }
  for (const [index, command] of (request.commands as readonly unknown[]).entries()) {
    const fault = DocumentCodec.commandShapeFaults(command)[0]
    if (fault !== undefined && fault.at === KIND_FIELD) {
      return `command ${index} has ${commandKindText(command)}, which is not a command kind applyCommands takes (see grs-commands.schema.json)`
    }
    if (fault !== undefined) {
      return `command ${index} (${commandKindText(command)}) is not the shape grs-commands.schema.json gives that kind: ` +
        `${fault.at === '' ? 'it' : `the field ${fault.at}`} ${fault.what}`
    }
  }
  return null
}

// see AG-5
/** @purity non-pure */
function writeThroughTheOnePath(
  wiring: AgentApiWiring,
  snapshot: AgentSnapshot,
  target: string,
  expectedStamp: DocumentStamp,
  commands: readonly DocumentCommand[],
): AgentWriteOutcome {
  let outcome
  // WHY: caught despite ST-7: untyped caller input enters here, and planning a malformed
  // command throws, which FR-028 forbids passing on.
  try {
    outcome = planAndApply(wiring, snapshot, expectedStamp, commands)
  } catch (thrown) {
    return {
      ok: false,
      refusal: agentRefusal(
        target,
        'malformedRequest',
        snapshot,
        `a command of the batch does not have the shape grs-commands.schema.json gives its kind: ${messageOf(thrown)}`,
        [],
      ),
    }
  }

  if (!outcome.ok) {
    const { refusal } = outcome
    return {
      ok: false,
      refusal: agentRefusal(
        target,
        reasonOfPlanRefusal(refusal),
        snapshot,
        `${refusal.step} refused it; the rule is ${ruleOfPlanRefusal(refusal)}`,
        refusal.step === 'WS-3' ? refusal.refusals : [],
      ),
    }
  }

  return {
    ok: true,
    stamp: stampHandedOut(outcome.document.documentStamp, snapshot),
    hasUpdatedSchedule: outcome.hasUpdatedSchedule,
  }
}

/** @purity pure */
export function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown)
}

/** @purity pure */
function writeMomentOf(snapshot: AgentSnapshot): WriteMoment {
  return {
    gestureInFlight: snapshot.isGestureInFlight,
    editingInPlace: snapshot.isEditingInPlace,
    questionAsked: snapshot.isQuestionAsked,
    deliveringNotices: snapshot.isDeliveringNotices,
  }
}

/** @purity non-pure */
function historyStepsOnHolder(wiring: AgentApiWiring): HistoryStepper {
  const replaceAt = (call: ReplacementCall, expectedStamp: DocumentStamp): ReplaceOutcome => {
    const snapshot = wiring.source.readSnapshot()
    const input = { expectedStamp, moment: writeMomentOf(snapshot), call, defaultTaskGroupName: snapshot.defaultTaskGroupName }
    return replaceDocument({ ...input, newTaskGroupId: globalThis.crypto.randomUUID() }, wiring.holder, wiring.audience)
  }
  return {
    /** @purity non-pure */
    undoStep: (expectedStamp, writer) => replaceAt({ row: 'RD-1', writer }, expectedStamp),
    /** @purity non-pure */
    redoStep: (expectedStamp, writer) => replaceAt({ row: 'RD-2', writer }, expectedStamp),
  }
}

// WHY: WS-1 gets the caller's stamp, and an undo answers the stamp it restored (T-230 keeps it as it came in).
/** @purity non-pure */
function historyStepThrough(wiring: AgentApiWiring, snapshot: AgentSnapshot, row: 'RD-1' | 'RD-2', expectedStamp: DocumentStamp): AgentWriteOutcome {
  const target = row === 'RD-1' ? 'AM-9' : 'AM-10'
  if ((expectedStamp as unknown) === null || typeof expectedStamp !== 'object') {
    return { ok: false, refusal: agentRefusal(target, 'malformedRequest', snapshot, `${target} takes expectedStamp; it is missing or not its shape`, []) }
  }
  const steps = wiring.historySteps ?? historyStepsOnHolder(wiring)
  const outcome = row === 'RD-1' ? steps.undoStep(expectedStamp, wiring.writerName) : steps.redoStep(expectedStamp, wiring.writerName)
  if (!outcome.ok) {
    return { ok: false, refusal: agentRefusal(target, reasonOfStepRefusal(outcome.refusal), snapshot, stepRefusalWhat(outcome.refusal), []) }
  }
  return { ok: true, stamp: stampHandedOut(outcome.document.documentStamp, snapshot), hasUpdatedSchedule: outcome.hasUpdatedSchedule }
}

/** @purity non-pure */
function planAndApply(
  wiring: AgentApiWiring,
  snapshot: AgentSnapshot,
  expectedStamp: DocumentStamp,
  commands: readonly DocumentCommand[],
): ReturnType<typeof applyDocumentChange> {
  return applyDocumentChange(
    {
      expectedStamp,
      commands,
      moment: writeMomentOf(snapshot),
      historyLimits: snapshot.historyLimits,
      settingsLimits: snapshot.settingsLimits,
      defaultTaskGroupName: snapshot.defaultTaskGroupName,
      editedBy: wiring.writerName,
      updatedAt: snapshot.readAt,
    },
    wiring.holder,
    wiring.audience,
  )
}

// see AM-11, DV-12
/** @purity pure */
function mspdiOfSnapshot(snapshot: AgentSnapshot): string {
  return mspdiFromDocument(snapshot.document, snapshot.localReadAt).text
}

/** @purity semi-pure-b */
function importLandingOutcome(landing: ImportLanding, after: AgentSnapshot): AgentWriteOutcome {
  // TRAP: `!landing` compiles but takes a refusal object for a landed import.
  if (landing === true) {
    return { ok: true, stamp: frozenCopy(after.documentAsWritten.documentStamp), hasUpdatedSchedule: true }
  }
  const refusals = landing === false ? [] : landing.refusals
  const first = refusals[0]
  return {
    ok: false,
    refusal: first === undefined
      ? agentRefusal(
        'AM-8',
        'commandRefused',
        after,
        'the import did not land: answered MM-4, refused by OP-5, or OP-8 held',
        [],
      )
      : agentRefusal(
        'AM-8',
        first.rule,
        after,
        `FR-023 refused it; the row is ${first.rule}: ${first.what}`,
        refusals,
      ),
  }
}

// see AM-8, AG-12, AV-15, DFC-3252
// WHY: answers as soon as the person is asked; waiting for the answer outlasts the MCP client's request.
/** @purity non-pure */
async function importHandedDocument(
  wiring: AgentApiWiring,
  handedSource: AgentImportSource,
): Promise<AgentImportOutcome> {
  const { source } = wiring
  const snapshot = source.readSnapshot()
  const road = wiring.takeInDocument
  if (road === undefined) {
    return { ok: false, refusal: notAvailable('AM-8', snapshot, 'the wiring carries no import road') }
  }
  const incoming = handedDocument(handedSource, wiring.schemaVersion)
  if (!incoming.ok) {
    return { ok: false, refusal: agentRefusal('AM-8', incoming.reason, snapshot, incoming.what, []) }
  }
  let answerAsked: (outcome: AgentImportOutcome) => void = () => undefined
  const asked = new Promise<AgentImportOutcome>((resolve) => {
    answerAsked = resolve
  })
  const onAsked = (surface: AskedSurface): void =>
    answerAsked({ ok: true, asked: surface, stamp: frozenCopy(source.readSnapshot().documentAsWritten.documentStamp) })
  // TRAP: a person answers U-61 during this await; take a fresh snapshot after it.
  const settled = road(incoming.document, incoming, onAsked).then((landing) =>
    importLandingOutcome(landing, source.readSnapshot()))
  return Promise.race([asked, settled])
}

const OPEN_FILE_QUESTION = 'QN-17'

// see AM-29, AG-12, FR-087, AG-6
/** @purity non-pure */
function askToOpenFileThrough(wiring: AgentApiWiring): AgentImportOutcome {
  const snapshot = wiring.source.readSnapshot()
  const ask = wiring.askToOpenFile
  if (ask === undefined) return { ok: false, refusal: notAvailable('AM-29', snapshot, 'the wiring carries no file window') }
  const busy = snapshot.isGestureInFlight
    ? 'gestureInFlight'
    : snapshot.isEditingInPlace ? 'editingInPlace' : snapshot.isQuestionAsked ? 'questionAsked' : null
  if (busy !== null) {
    return { ok: false, refusal: agentRefusal('AM-29', busy, snapshot, 'the person is busy on the page; try again shortly', []) }
  }
  ask()
  return { ok: true, asked: OPEN_FILE_QUESTION, stamp: frozenCopy(snapshot.documentAsWritten.documentStamp) }
}

// see T-107
/** @purity non-pure */
export function agentApiMembers(wiring: AgentApiWiring): AgentApi {
  const { source } = wiring

  return {
    agentApiVersion: AGENT_API_VERSION,
    schemaVersion: wiring.schemaVersion,

    /** @purity semi-pure-b */
    readDocument: (includeCarry: boolean, taskUids: readonly number[]): Document =>
      documentAsRead(source.readSnapshot().documentAsWritten, includeCarry, taskUids),

    /** @purity semi-pure-b */
    readStamp(): DocumentStamp {
      return frozenCopy(source.readSnapshot().documentAsWritten.documentStamp)
    },

    /** @purity semi-pure-b */
    readSelection(): Selection {
      return frozenCopy(source.readSnapshot().selection)
    },

    // see AM-25, AM-19
    // WHY: no delay diagnosis here, so late is only a planned day past the status date (T-021b) and
    // (?), the bottleneck and (!!) never show; the precise analysis is readDelayDiagnostics'.
    /** @purity semi-pure-b */
    readSearchRows: (word: string, filters: 'asShown' | 'none', offset: number, limit: number): AgentSearchPage =>
      frozenCopy(searchPageOf(source.readSnapshot().document, word, filters, offset, limit)),

    // see AM-28, AG-9a
    /** @purity semi-pure-b */
    readTableRows(table: AgentTable, word: string, filters: 'asShown' | 'none', offset: number, limit: number): AgentTableRows {
      const snapshot = source.readSnapshot()
      if (!isAgentTable(table)) {
        const refusal = agentRefusal('AM-28', 'malformedRequest', snapshot, `no such table: ${String(table)}`, [])
        return { ok: false, refusal }
      }
      return frozenCopy(tableRowsPageOf(snapshot.document, table, word, filters, offset, limit))
    },

    /** @purity semi-pure-b */
    readShownTasks: (): AgentShownTasks => frozenCopy(wiring.shownTasks?.readShownTasks() ?? NO_SHOWN_TASKS),

    // see AM-19, FR-134, AG-4
    // WHY: diagnosed afresh, never the shell's held report: AM-19 writes no screen value, so it
    // answers whether or not S-445 is on.
    /** @purity semi-pure-b */
    readDelayDiagnostics(): AgentDelayDiagnostics {
      const document = source.readSnapshot().document
      return frozenCopy(delayDiagnosticsWithFixes(document, wiring.delayFixLog))
    },

    /** @purity non-pure */
    applyCommands(request: AgentWriteRequest): AgentWriteOutcome {
      const snapshot = source.readSnapshot()
      const malformed = malformedWriteRequestWhat(request)
      if (malformed !== null) {
        return { ok: false, refusal: agentRefusal('AM-7', 'malformedRequest', snapshot, malformed, []) }
      }
      return writeThroughTheOnePath(
        wiring,
        snapshot,
        'AM-7',
        request.expectedStamp,
        request.commands,
      )
    },

    /** @purity non-pure */
    importDocument: (handedSource: AgentImportSource): Promise<AgentImportOutcome> =>
      importHandedDocument(wiring, handedSource),

    /** @purity non-pure */
    requestOpenFile: (): AgentImportOutcome => askToOpenFileThrough(wiring),

    /** @purity non-pure */
    undoEdit: (expectedStamp: DocumentStamp): AgentWriteOutcome =>
      historyStepThrough(wiring, source.readSnapshot(), 'RD-1', expectedStamp),

    /** @purity non-pure */
    redoEdit: (expectedStamp: DocumentStamp): AgentWriteOutcome =>
      historyStepThrough(wiring, source.readSnapshot(), 'RD-2', expectedStamp),

    /** @purity semi-pure-b */
    exportJson(): AgentExport<string> {
      return { ok: true, value: jsonFromDocument(source.readSnapshot().documentAsWritten) }
    },

    /** @purity semi-pure-b */
    exportMspdi(): AgentExport<string> {
      return { ok: true, value: mspdiOfSnapshot(source.readSnapshot()) }
    },

    /** @purity semi-pure-b */
    exportSvg(): AgentExport<string> {
      const snapshot = source.readSnapshot()

      if (snapshot.isGestureInFlight || snapshot.isEditingInPlace) {
        const reason = snapshot.isGestureInFlight ? 'gestureInFlight' : 'editingInPlace'
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-13',
            reason,
            snapshot,
            'AG-4 with AG-9: the picture would not match what a read answers',
            [],
          ),
        }
      }

      // TRAP: draw from exportScene, not frame: a frame has the screen's size, not the one IO-3 fixes.
      const scene = snapshot.exportScene
      if (scene === null) {
        return {
          ok: false,
          refusal: agentRefusal('AM-13', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      const picture = ImageExporter.exportSvg(scene)
      if (!picture.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-13',
            'tooTall',
            snapshot,
            'FR-025 with S-217: grown to the ceiling, the picture still does not fit (MUST NOT draw part of one)',
            [],
          ),
        }
      }
      return { ok: true, value: picture.svg }
    },

    /** @purity semi-pure-b */
    async exportPng(): Promise<AgentExport<Uint8Array>> {
      const snapshot = source.readSnapshot()

      if (snapshot.isGestureInFlight || snapshot.isEditingInPlace) {
        const reason = snapshot.isGestureInFlight ? 'gestureInFlight' : 'editingInPlace'
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-14',
            reason,
            snapshot,
            'AG-4 with AG-9: the picture would not match what a read answers',
            [],
          ),
        }
      }

      const scene = snapshot.exportScene
      if (scene === null) {
        return {
          ok: false,
          refusal: agentRefusal('AM-14', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      const seam = wiring.rasterizer
      if (seam === undefined) {
        return {
          ok: false,
          refusal: notAvailable('AM-14', snapshot, 'the wiring carries no Rasterizer (IF-6)'),
        }
      }

      // TRAP: refusals after this await keep the earlier snapshot; a fresh read would carry
      // a stamp this call never stood at (CS-4).
      const painted = await ImageExporter.exportPng(seam, scene)
      if (!painted.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-14',
            'tooTall',
            snapshot,
            'FR-025 with S-217: grown to the ceiling, the picture still does not fit (MUST NOT draw part of one)',
            [],
          ),
        }
      }
      if (!painted.png.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-14',
            'rasterFailed',
            snapshot,
            `IF-6 could not paint it (${painted.png.fault.reason}): ${painted.png.fault.what}`,
            [],
          ),
        }
      }
      return { ok: true, value: painted.png.pngBytes }
    },

    /** @purity semi-pure-b */
    async exportEmbeddedHtml(): Promise<AgentExport<string>> {
      const snapshot = source.readSnapshot()
      const seam = wiring.appShell
      if (seam === undefined) {
        return {
          ok: false,
          refusal: notAvailable('AM-15', snapshot, 'the wiring carries no AppShellSource (IF-8)'),
        }
      }
      const made = await DocumentCodec.exportEmbeddedHtml(seam, snapshot.documentAsWritten)
      if (!made.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-15',
            'embeddedHtmlFailed',
            snapshot,
            `UT-5 could not assemble it (${made.fault.reason}): ${made.fault.what}`,
            [],
          ),
        }
      }
      return { ok: true, value: made.html }
    },

    /** @purity non-pure */
    focusTask: (taskUid: number): AgentFocusOutcome => focusTaskThrough(wiring, source.readSnapshot(), taskUid),

    /** @purity non-pure */
    showOnlyTasks: (taskUids: readonly number[]): AgentWriteOutcome => showOnlyTasksThrough(wiring, source.readSnapshot(), taskUids),

    /** @purity non-pure */
    watchChanges(receive: AgentChangeReceiver): AgentWatch {
      const snapshot = source.readSnapshot()
      const hasReplacedEarlierWatch = NotifyChangeWatchers.watchChanges(wiring.changeWatchers, {
        watcher: wiring.writerName,
        since: { seenScheduleUpdatedAt: snapshot.document.documentStamp.scheduleUpdatedAt },
        deliver: receive,
      })

      return {
        hasReplacedEarlierWatch,
        /** @purity non-pure */
        stopWatching(): boolean {
          return NotifyChangeWatchers.unwatchChanges(wiring.changeWatchers, wiring.writerName)
        },
      }
    },
  }
}
