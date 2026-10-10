// SingleHtmlShell -- makes the tasks drawn from the three tables' views the document holds, writes their changes as edits, and opens the window of a table whose Schedule Filter comes on (table T-353, SJ-0, OP-18).
// @unit      UF-198  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { DocumentCommand } from '../../use-case/apply-document-change/apply-document-change'
import { shownTasksRevealWrites } from '../../use-case/edit-document/edit-document'
import {
  VISIBILITY_TABLES,
  tableViewOf,
  type ScreenValuesEvent,
  type SearchPanelSession,
  type TableView,
  type TableVisibility,
  type VisibilityTable,
} from '../../use-case/advance-screen-session/advance-screen-session'
import type { DelayDiagnosticsReportWindow } from '../../adapter/screen-renderer/screen-renderer'
import { scheduleFilterLetGoOf, type ResourceListWindow } from './resource-list-window'
import type { AgentApiSeams, FrameLoopHands, FrameValues } from './frame-loop'

const SEARCH_PANEL_OPENED: ScreenValuesEvent = { type: 'searchEntryPressed' }
const SEARCH_PANEL_MINIMIZE_TOGGLED: ScreenValuesEvent = { type: 'searchPanelMinimizeToggled' }

type Schedule = Document['schedule']

export interface HeldTableWindows {
  readonly searchPanel: () => SearchPanelSession
  readonly holdSearchPanel: (panel: SearchPanelSession) => void
  readonly report: () => DelayDiagnosticsReportWindow | null
  readonly holdReport: (window: DelayDiagnosticsReportWindow | null) => void
  readonly resourceList: () => ResourceListWindow | null
  readonly reopenedResourceList: () => ResourceListWindow
  readonly holdResourceList: (window: ResourceListWindow | null) => void
}

// see TV-1, TV-2, FR-151
export type TableViewsHeld = { readonly [T in VisibilityTable]: TableView }

// see TV-1, TV-2
type TableVisibilities = { readonly [T in VisibilityTable]: TableVisibility }

export type TableViewChanges = { readonly [T in VisibilityTable]?: TableView }

/** @purity pure */
function taskUidsOf(schedule: Schedule): ReadonlySet<number> {
  return new Set(schedule.tasks.map((task) => task.uid))
}

// see TV-2, TV-13
/** @purity pure */
function resourceUidsByTask(schedule: Schedule): ReadonlyMap<number, readonly number[]> {
  const byTask = new Map<number, number[]>()
  for (const one of schedule.assignments) {
    if (one.taskUid === null || one.resourceUid === null) continue
    byTask.set(one.taskUid, [...(byTask.get(one.taskUid) ?? []), one.resourceUid])
  }
  return byTask
}

// see TV-13
/** @purity pure */
function isShownByResourceList(resourceUids: readonly number[] | undefined, hidden: ReadonlySet<number>, list: TableVisibility, isCreated: boolean): boolean {
  if (resourceUids === undefined || resourceUids.length === 0) return isCreated || !list.isUnassignedHidden
  return resourceUids.some((uid) => !hidden.has(uid))
}

// see TV-2, TV-7
/** @purity pure */
function isShownByReport(taskUid: number, hidden: ReadonlySet<number>, reportTaskUids: ReadonlySet<number> | null, isCreated: boolean): boolean {
  const isCarried = reportTaskUids?.has(taskUid) === true
  if (!isCarried) return isCreated
  return !hidden.has(taskUid)
}

// see TV-1, TV-2, TV-7, TV-13
/** @purity pure */
export function drawnTaskUidsOf(
  schedule: Schedule,
  search: TableVisibility,
  report: TableVisibility,
  reportTaskUids: ReadonlySet<number> | null,
  resourceList: TableVisibility,
  createdWhileFiltered: ReadonlySet<number>,
): ReadonlySet<number> | null {
  if (!search.isApplied && !report.isApplied && !resourceList.isApplied) return null
  const searchHidden = new Set(search.hiddenKeys)
  const reportHidden = new Set(report.hiddenKeys)
  const resourceHidden = new Set(resourceList.hiddenKeys)
  const resourcesOf = resourceList.isApplied ? resourceUidsByTask(schedule) : new Map<number, readonly number[]>()
  const drawn = schedule.tasks
    .map((task) => task.uid)
    .filter((uid) => {
      const isCreated = createdWhileFiltered.has(uid)
      if (search.isApplied && searchHidden.has(uid)) return false
      if (report.isApplied && !isShownByReport(uid, reportHidden, reportTaskUids, isCreated)) return false
      return !resourceList.isApplied || isShownByResourceList(resourcesOf.get(uid), resourceHidden, resourceList, isCreated)
    })
  return new Set(drawn)
}

// see TV-1, TV-11, AM-26
/** @purity pure */
function appliedTablesOf(tables: TableVisibilities): readonly VisibilityTable[] {
  return VISIBILITY_TABLES.filter((table) => tables[table].isApplied)
}

// see TV-6
/** @purity pure */
function keysShownAgain(before: TableVisibility, after: TableVisibility): { readonly keys: readonly number[]; readonly isUnassigned: boolean } {
  if (!before.isApplied || !after.isApplied || before === after) return { keys: [], isUnassigned: false }
  const still = new Set(after.hiddenKeys)
  return {
    keys: before.hiddenKeys.filter((key) => !still.has(key)),
    isUnassigned: before.isUnassignedHidden && !after.isUnassignedHidden,
  }
}

// see TV-6, TV-13
/** @purity pure */
function tasksOfResourcesShownAgain(schedule: Schedule, shown: ReturnType<typeof keysShownAgain>): readonly number[] {
  if (shown.keys.length === 0 && !shown.isUnassigned) return []
  const resources = new Set(shown.keys)
  const assigned = resourceUidsByTask(schedule)
  return schedule.tasks
    .map((task) => task.uid)
    .filter((uid) => {
      const of = assigned.get(uid) ?? []
      return of.length === 0 ? shown.isUnassigned : of.some((resourceUid) => resources.has(resourceUid))
    })
}

// see TV-6, SJ-2
/** @purity pure */
function tasksShownAgain(schedule: Schedule, before: TableVisibilities, after: TableVisibilities): readonly number[] {
  const present = taskUidsOf(schedule)
  const fromSearch = keysShownAgain(before.searchPanel, after.searchPanel).keys
  const fromReport = keysShownAgain(before.delayDiagnosticsReport, after.delayDiagnosticsReport).keys
  const fromResources = tasksOfResourcesShownAgain(schedule, keysShownAgain(before.resourceList, after.resourceList))
  return [...new Set([...fromSearch, ...fromReport, ...fromResources])].filter((uid) => present.has(uid))
}

// see TV-6, SJ-0
/** @purity pure */
function viewWithKeyShown(view: TableView, key: number): TableView {
  const visibility = view.visibility
  return { ...view, visibility: { ...visibility, hiddenKeys: visibility.hiddenKeys.filter((one) => one !== key) } }
}

// see TV-8, SJ-0
/** @purity pure */
function viewWithFilterOff(table: VisibilityTable, view: TableView): TableView {
  const letGo = scheduleFilterLetGoOf(table, view)
  return letGo === null ? view : letGo.view
}

// see CM-92, UN-20, TV-6
/** @purity pure */
function tableViewWrites(document: Document, held: TableViewsHeld, changes: TableViewChanges): readonly DocumentCommand[] {
  const tables = VISIBILITY_TABLES.filter((table) => !isSameView(changes[table] ?? held[table], held[table]))
  if (tables.length === 0) return []
  const viewAfter = (table: VisibilityTable): TableView => changes[table] ?? held[table]
  const before = visibilitiesOf(held)
  const after = { searchPanel: viewAfter('searchPanel').visibility, delayDiagnosticsReport: viewAfter('delayDiagnosticsReport').visibility, resourceList: viewAfter('resourceList').visibility }
  const reveal = shownTasksRevealWrites(document, tasksShownAgain(document.schedule, before, after))
  const views: readonly DocumentCommand[] = tables.map((table) => ({ kind: 'setTableView', table, view: viewAfter(table) }))
  return [...views, ...reveal]
}

// WHY: by content, so an entry answering an equal view writes no empty undo step.
/** @purity pure */
function isSameView(a: TableView, b: TableView): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}

/** @purity pure */
function visibilitiesOf(views: TableViewsHeld): TableVisibilities {
  return {
    searchPanel: views.searchPanel.visibility,
    delayDiagnosticsReport: views.delayDiagnosticsReport.visibility,
    resourceList: views.resourceList.visibility,
  }
}

// see SJ-0, TV-13, UN-20
/** @purity pure */
function jumpViewChangesOf(
  views: TableViewsHeld,
  schedule: Schedule,
  taskUid: number,
  judged: { readonly reportTaskUids: ReadonlySet<number> | null; readonly created: ReadonlySet<number> },
): TableViewChanges {
  const isCreated = judged.created.has(taskUid)
  const search = views.searchPanel.visibility
  const isSearchHiding = search.isApplied && search.hiddenKeys.includes(taskUid)
  const report = views.delayDiagnosticsReport.visibility
  const isReportHiding = report.isApplied && !isShownByReport(taskUid, new Set(report.hiddenKeys), judged.reportTaskUids, isCreated)
  const isCarried = judged.reportTaskUids?.has(taskUid) === true
  const list = views.resourceList.visibility
  const resourceUids = resourceUidsByTask(schedule).get(taskUid)
  const isListHiding = list.isApplied && !isShownByResourceList(resourceUids, new Set(list.hiddenKeys), list, isCreated)
  return {
    ...(isSearchHiding ? { searchPanel: viewWithKeyShown(views.searchPanel, taskUid) } : {}),
    ...(isReportHiding ? { delayDiagnosticsReport: isCarried ? viewWithKeyShown(views.delayDiagnosticsReport, taskUid) : viewWithFilterOff('delayDiagnosticsReport', views.delayDiagnosticsReport) } : {}),
    ...(isListHiding ? { resourceList: viewWithFilterOff('resourceList', views.resourceList) } : {}),
  }
}

// see TV-1, FR-151, DFC-1820
/** @purity non-pure */
function tableViewsKeeper() {
  let readFrom: DocumentSettings['tableViews'] | null = null
  let held: TableViewsHeld | null = null
  return (settings: DocumentSettings): TableViewsHeld => {
    if (held !== null && settings.tableViews === readFrom) return held
    readFrom = settings.tableViews
    held = {
      searchPanel: tableViewOf(settings, 'searchPanel'),
      delayDiagnosticsReport: tableViewOf(settings, 'delayDiagnosticsReport'),
      resourceList: tableViewOf(settings, 'resourceList'),
    }
    return held
  }
}

// see TV-7, TV-13
/** @purity non-pure */
function createdTasksKeeper() {
  let created: ReadonlySet<number> = new Set()
  let preview: { readonly held: Schedule; readonly drawn: Schedule; readonly created: ReadonlySet<number>; readonly with: ReadonlySet<number> } | null = null
  return {
    /** @purity semi-pure-b */
    read: (): ReadonlySet<number> => created,
    // see TV-7
    // WHY: a task only a preview holds (a copy being dragged) counts as made, so it is drawn while it is dragged.
    /** @purity non-pure */
    readFor(held: Schedule, drawn: Schedule): ReadonlySet<number> {
      if (drawn === held) return created
      if (preview?.held === held && preview.drawn === drawn && preview.created === created) return preview.with
      const present = taskUidsOf(held)
      const made = drawn.tasks.map((task) => task.uid).filter((uid) => !present.has(uid))
      preview = { held, drawn, created, with: new Set([...created, ...made]) }
      return preview.with
    },
    /** @purity non-pure */
    note(before: Schedule, after: Schedule, isFiltered: boolean): void {
      if (!isFiltered || before.tasks === after.tasks) return
      const held = new Set(before.tasks.map((task) => task.uid))
      const made = after.tasks.map((task) => task.uid).filter((uid) => !held.has(uid))
      if (made.length > 0) created = new Set([...created, ...made])
    },
    /** @purity non-pure */
    keepWithin(present: ReadonlySet<number>, isFiltered: boolean): void {
      if (created.size === 0) return
      const kept = isFiltered ? [...created].filter((uid) => present.has(uid)) : []
      if (kept.length !== created.size) created = new Set(kept)
    },
  }
}

// see TV-1, TV-3, TD-8, DFC-1820
// WHY: one set per held input, so the picture inputs keep their identity while nothing they read moved (DFC-1820).
/** @purity non-pure */
function drawnSetKeeper() {
  let read: readonly unknown[] = []
  let set: ReadonlySet<number> | null = null
  return (schedule: Schedule, tables: TableVisibilities, reportTaskUids: ReadonlySet<number> | null, created: ReadonlySet<number>) => {
    const inputs = [schedule, tables.searchPanel, tables.delayDiagnosticsReport, reportTaskUids, tables.resourceList, created]
    if (inputs.length === read.length && inputs.every((one, at) => one === read[at])) return set
    read = inputs
    set = drawnTaskUidsOf(schedule, tables.searchPanel, tables.delayDiagnosticsReport, reportTaskUids, tables.resourceList, created)
    return set
  }
}

// see OP-18, TV-8, TV-12, WB-2, AM-27
/** @purity non-pure */
function openSearchPanelMinimized(hands: FrameLoopHands, windows: HeldTableWindows, isReplaced: boolean): void {
  const shown = hands.readSession().screen.searchPanelDisplayState
  if (shown.kind === 'hidden') hands.sendToSession(SEARCH_PANEL_OPENED, hands.readValues())
  if (shown.kind === 'hidden' || (isReplaced && shown.child.kind === 'normal')) hands.sendToSession(SEARCH_PANEL_MINIMIZE_TOGGLED, hands.readValues())
  const panel = windows.searchPanel()
  if (panel.table !== 'tasks') windows.holdSearchPanel({ ...panel, table: 'tasks' })
}

// see OP-18, TV-8, TV-12, WB-2, FR-130, S-445, S-564
// WHY: the report's table is narrowed by the diagnosis, so its filter coming on starts the diagnosis (OP-18).
/** @purity non-pure */
function openTableWindowMinimized(
  table: VisibilityTable,
  opener: { readonly hands: FrameLoopHands; readonly windows: HeldTableWindows; readonly startDelayDiagnostics: () => void },
  isReplaced: boolean,
): void {
  const { windows } = opener
  if (table === 'searchPanel') return openSearchPanelMinimized(opener.hands, windows, isReplaced)
  if (table === 'delayDiagnosticsReport') {
    const wasClosed = windows.report() === null
    if (wasClosed) opener.startDelayDiagnostics()
    const report = windows.report()
    if (report !== null && (wasClosed || isReplaced)) windows.holdReport({ ...report, shown: 'minimized' })
    return
  }
  const list = windows.resourceList()
  if (list === null || isReplaced) windows.holdResourceList({ ...(list ?? windows.reopenedResourceList()), shown: 'minimized' })
}

// see OP-18, TV-8, AM-27
/** @purity non-pure */
function appliedFilterFollower() {
  let seen: DocumentSettings['tableViews'] | null = null
  let wasApplied: TableVisibilities | null = null
  let isReplaced = true
  return {
    /** @purity non-pure */
    noteReplaced: (): void => void (isReplaced = true),
    /** @purity non-pure */
    follow(settings: DocumentSettings, tables: TableVisibilities, open: (table: VisibilityTable, isReplaced: boolean) => void): void {
      if (settings.tableViews === seen && !isReplaced) return
      const replaced = isReplaced
      const before = wasApplied
      seen = settings.tableViews
      wasApplied = tables
      isReplaced = false
      for (const table of appliedTablesOf(tables)) if (replaced || before?.[table].isApplied !== true) open(table, replaced)
    },
  }
}

// see TV-8, SV-14, UN-20
/** @purity non-pure */
function searchPanelClosingFollower() {
  let wasShown = false
  return (isShown: boolean): boolean => {
    const isClosed = wasShown && !isShown
    wasShown = isShown
    return isClosed
  }
}

type Diagnosis = { readonly readReportTaskUids: () => ReadonlySet<number> | null; readonly startDelayDiagnostics: () => void }

type CreatedTasks = ReturnType<typeof createdTasksKeeper>

// see CM-92, UN-20, TV-6, TV-8, SJ-0
/** @purity non-pure */
function tableViewWriterOf(hands: FrameLoopHands, windows: HeldTableWindows, views: () => TableViewsHeld, judged: { readonly diagnosis: Diagnosis; readonly created: CreatedTasks }) {
  const writeViews = (changes: TableViewChanges, frame: FrameValues | null = hands.readValues()): void => {
    const writes = tableViewWrites(hands.readHeld().document, views(), changes)
    if (writes.length > 0 && frame !== null) hands.writeDocument(writes, frame)
  }
  const jumpViewWrites = (taskUid: number): readonly DocumentCommand[] => {
    const document = hands.readHeld().document
    const of = { reportTaskUids: judged.diagnosis.readReportTaskUids(), created: judged.created.read() }
    return tableViewWrites(document, views(), jumpViewChangesOf(views(), document.schedule, taskUid, of)).filter((one) => one.kind === 'setTableView')
  }
  return {
    writeViews,
    jumpViewWrites,
    letScheduleFilterGo: (table: VisibilityTable, frame: FrameValues | null = hands.readValues()): void =>
      writeViews({ [table]: viewWithFilterOff(table, views()[table]) }, frame),
    /** @purity non-pure */
    holdSearchStep(step: { readonly panel: SearchPanelSession; readonly view: TableView }, frame: FrameValues): void {
      writeViews({ searchPanel: step.view }, frame)
      windows.holdSearchPanel(step.panel)
    },
    turnOffEveryFilter: (frame: FrameValues | null): void =>
      writeViews(Object.fromEntries(VISIBILITY_TABLES.map((table) => [table, viewWithFilterOff(table, views()[table])])), frame),
  }
}

// see OP-18, TV-7, TV-8, TV-9
// WHY: once at the head of a frame: a closed search panel lets its filter go, and a filter come on opens its window.
/** @purity non-pure */
function frameFollowerOf(hands: FrameLoopHands, windows: HeldTableWindows, views: () => TableViewsHeld, held: { readonly diagnosis: Diagnosis; readonly created: CreatedTasks; readonly letGo: (table: VisibilityTable) => void }) {
  const filters = appliedFilterFollower()
  const isSearchPanelClosed = searchPanelClosingFollower()
  const opener = { hands, windows, startDelayDiagnostics: held.diagnosis.startDelayDiagnostics }
  const isSearchPanelShown = (): boolean => hands.readSession().screen.searchPanelDisplayState.kind !== 'hidden'
  return {
    /** @purity non-pure */
    followFrame(): void {
      if (isSearchPanelClosed(isSearchPanelShown()) && views().searchPanel.visibility.isApplied) held.letGo('searchPanel')
      const document = hands.readHeld().document
      const visibilities = visibilitiesOf(views())
      held.created.keepWithin(taskUidsOf(document.schedule), appliedTablesOf(visibilities).length > 0)
      filters.follow(document.documentSettings, visibilities, (table, isReplaced) => openTableWindowMinimized(table, opener, isReplaced))
      isSearchPanelClosed(isSearchPanelShown())
    },
    // WHY: the replaced document's own views stand; the report is closed unless its filter is on (OP-18).
    /** @purity non-pure */
    noteDocumentReplaced(closeReport: () => void): void {
      held.created.keepWithin(new Set(), false)
      filters.noteReplaced()
      if (!views().delayDiagnosticsReport.visibility.isApplied) closeReport()
    },
  }
}

// see TV-1, TV-2, TV-6, TV-7, TV-8, TV-9, TV-13, SJ-0, SJ-9, EL-21, AM-26, AM-27, OP-18, UN-20
/** @purity non-pure */
export function shownTasksHoldOf(hands: FrameLoopHands, windows: HeldTableWindows, diagnosis: Diagnosis) {
  const viewsOf = tableViewsKeeper()
  const created = createdTasksKeeper()
  const drawnSetOf = drawnSetKeeper()
  const views = (): TableViewsHeld => viewsOf(hands.readHeld().document.documentSettings)
  const visibilities = (): TableVisibilities => visibilitiesOf(views())
  const isFiltered = (): boolean => appliedTablesOf(visibilities()).length > 0
  const drawnSet = (drawn?: Schedule): ReadonlySet<number> | null => {
    const held = hands.readHeld().document.schedule
    const schedule = drawn ?? held
    return drawnSetOf(schedule, visibilities(), diagnosis.readReportTaskUids(), created.readFor(held, schedule))
  }
  const writer = tableViewWriterOf(hands, windows, views, { diagnosis, created })
  return {
    ...writer,
    ...frameFollowerOf(hands, windows, views, { diagnosis, created, letGo: writer.letScheduleFilterGo }),
    drawnSet,
    views,
    visibilities,
    appliedTables: (): readonly VisibilityTable[] => appliedTablesOf(visibilities()),
    holdCreatedTasks: (before: Schedule, after: Schedule): void => created.note(before, after, isFiltered()),
    agentHolder: (): NonNullable<AgentApiSeams['shownTasks']> => agentShownTasksHolderOf(visibilities, { drawnSet, jumpViewWrites: writer.jumpViewWrites }),
  }
}

export type ShownTasksHold = ReturnType<typeof shownTasksHoldOf>

// see AM-26, AM-27, SJ-0, UN-20
// WHY: AM-16 writes the view changes in its own SJ-2 write (one undo step); holdJumpTarget is
// left to the frame loop, which owes the landing (SJ-5).
/** @purity non-pure */
function agentShownTasksHolderOf(
  visibilities: () => TableVisibilities,
  hold: { readonly drawnSet: () => ReadonlySet<number> | null; readonly jumpViewWrites: (taskUid: number) => readonly DocumentCommand[] },
): NonNullable<AgentApiSeams['shownTasks']> {
  return {
    readShownTasks: () => {
      const drawn = hold.drawnSet()
      return { drawnTaskUids: drawn === null ? null : [...drawn], tables: appliedTablesOf(visibilities()) }
    },
    jumpViewWrites: hold.jumpViewWrites,
    holdJumpTarget: () => undefined,
  }
}
