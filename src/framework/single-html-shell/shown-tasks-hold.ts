// SingleHtmlShell -- makes the tasks drawn from the three tables' Visibility and Schedule Filter, and holds them to the document (table T-353, SJ-0).
// @unit      UF-198  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import { shownTasksRevealWrites } from '../../use-case/edit-document/edit-document'
import {
  EVERY_ROW_SHOWN,
  type ScreenValuesEvent,
  type SearchPanelSession,
  type TableVisibility,
  type VisibilityTable,
} from '../../use-case/advance-screen-session/advance-screen-session'
import {
  tableAfterVisibilityChange,
  tableWithScheduleFilterToggled,
  type DelayDiagnosticsReportWindow,
  type TableWindowState,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ResourceListWindow } from './resource-list-window'
import { isSizeSettled, type AgentApiSeams, type FrameLoopHands, type FrameValues } from './frame-loop'

const SEARCH_PANEL_OPENED: ScreenValuesEvent = { type: 'searchEntryPressed' }
const SEARCH_PANEL_MINIMISE_TOGGLED: ScreenValuesEvent = { type: 'searchPanelMinimiseToggled' }

type Schedule = Document['schedule']

// see TV-11
const TABLE_ORDER: readonly VisibilityTable[] = ['searchPanel', 'delayDiagnosticsReport', 'resourceList']

type VisibilityPanel = TableWindowState['panel']

export interface HeldTableWindows {
  readonly searchPanel: () => SearchPanelSession
  readonly holdSearchPanel: (panel: SearchPanelSession) => void
  readonly report: () => DelayDiagnosticsReportWindow | null
  readonly holdReport: (window: DelayDiagnosticsReportWindow | null) => void
  readonly resourceList: () => ResourceListWindow | null
  readonly holdResourceList: (window: ResourceListWindow | null) => void
  readonly dropClosedValues: () => void
}

// see TV-1, TV-2
type TableVisibilities = { readonly [T in VisibilityTable]: TableVisibility }

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
  return TABLE_ORDER.filter((table) => tables[table].isApplied)
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

// see TV-2, RO-10
/** @purity pure */
function panelWithinKeys<P extends VisibilityPanel>(panel: P, present: ReadonlySet<number>): P {
  const gone = panel.visibility.hiddenKeys.filter((key) => !present.has(key))
  return gone.length === 0 ? panel : tableAfterVisibilityChange(panel, gone, true)
}

// see TV-5, TV-8
/** @purity pure */
function panelWithFilterOff<P extends VisibilityPanel>(panel: P): P {
  return panel.visibility.isApplied ? tableWithScheduleFilterToggled(panel) : panel
}

// see TV-9
/** @purity pure */
function panelWithValuesDropped<P extends VisibilityPanel>(panel: P): P {
  return panel.visibility === EVERY_ROW_SHOWN ? panel : { ...panel, visibility: EVERY_ROW_SHOWN }
}

/** @purity non-pure */
function tablePanelsOf(windows: HeldTableWindows) {
  return {
    /** @purity semi-pure-b */
    visibilities: (): TableVisibilities => ({
      searchPanel: windows.searchPanel().visibility,
      delayDiagnosticsReport: windows.report()?.panel.visibility ?? EVERY_ROW_SHOWN,
      resourceList: windows.resourceList()?.panel.visibility ?? EVERY_ROW_SHOWN,
    }),
    /** @purity non-pure */
    change(table: VisibilityTable, next: <P extends VisibilityPanel>(panel: P) => P): void {
      if (table === 'searchPanel') return windows.holdSearchPanel(next(windows.searchPanel()))
      const report = windows.report()
      if (table === 'delayDiagnosticsReport') return report === null ? undefined : windows.holdReport({ ...report, panel: next(report.panel) })
      const list = windows.resourceList()
      if (list !== null) windows.holdResourceList({ ...list, panel: next(list.panel) })
    },
  }
}

type TablePanels = ReturnType<typeof tablePanelsOf>

// see SJ-0, TV-13
/** @purity non-pure */
function holdJumpTargetIn(panels: TablePanels, schedule: Schedule, taskUid: number, judged: { readonly reportTaskUids: ReadonlySet<number> | null; readonly created: ReadonlySet<number> }): void {
  const tables = panels.visibilities()
  const isCreated = judged.created.has(taskUid)
  if (tables.searchPanel.isApplied && tables.searchPanel.hiddenKeys.includes(taskUid)) {
    panels.change('searchPanel', (panel) => tableAfterVisibilityChange(panel, [taskUid], true))
  }
  if (tables.delayDiagnosticsReport.isApplied && !isShownByReport(taskUid, new Set(tables.delayDiagnosticsReport.hiddenKeys), judged.reportTaskUids, isCreated)) {
    const isCarried = judged.reportTaskUids?.has(taskUid) === true
    panels.change('delayDiagnosticsReport', (panel) => (isCarried ? tableAfterVisibilityChange(panel, [taskUid], true) : panelWithFilterOff(panel)))
  }
  const resourceUids = resourceUidsByTask(schedule).get(taskUid)
  if (tables.resourceList.isApplied && !isShownByResourceList(resourceUids, new Set(tables.resourceList.hiddenKeys), tables.resourceList, isCreated)) {
    panels.change('resourceList', panelWithFilterOff)
  }
}

// see AM-27, TV-5, TV-8, PND-712
// WHY: the Agent API hands the search table's whole Visibility; a filter turned on shows a hidden panel minimised.
/** @purity non-pure */
function holdAgentSearchVisibility(hands: FrameLoopHands, panels: TablePanels, visibility: TableVisibility): void {
  panels.change('searchPanel', (panel) => ({ ...panel, visibility }))
  if (visibility.isApplied && hands.readSession().screen.searchPanelDisplayState.kind === 'hidden') {
    hands.sendToSession(SEARCH_PANEL_OPENED, hands.readValues())
    hands.sendToSession(SEARCH_PANEL_MINIMISE_TOGGLED, hands.readValues())
  }
  if (isSizeSettled(hands.readEnvironment())) hands.ask()
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

// see TV-2, TV-7
/** @purity non-pure */
function keepTablesWithinSchedule(panels: TablePanels, schedule: Schedule): void {
  const tasks = taskUidsOf(schedule)
  const resources = new Set(schedule.resources.map((resource) => resource.uid))
  panels.change('searchPanel', (panel) => panelWithinKeys(panel, tasks))
  panels.change('delayDiagnosticsReport', (panel) => panelWithinKeys(panel, tasks))
  panels.change('resourceList', (panel) => panelWithinKeys(panel, resources))
}

// see TV-1, TV-2, TV-6, TV-7, TV-8, TV-9, TV-13, SJ-0, SJ-9, EL-21, AM-26, AM-27
/** @purity non-pure */
export function shownTasksHoldOf(hands: FrameLoopHands, windows: HeldTableWindows, readReportTaskUids: () => ReadonlySet<number> | null) {
  const panels = tablePanelsOf(windows)
  const created = createdTasksKeeper()
  const drawnSetOf = drawnSetKeeper()
  const isFiltered = (): boolean => appliedTablesOf(panels.visibilities()).length > 0
  const drawnSet = (drawn?: Schedule): ReadonlySet<number> | null => {
    const held = hands.readHeld().document.schedule
    const schedule = drawn ?? held
    return drawnSetOf(schedule, panels.visibilities(), readReportTaskUids(), created.readFor(held, schedule))
  }
  const openShownAgain = (before: TableVisibilities, frame: FrameValues): void => {
    const document = hands.readHeld().document
    const writes = shownTasksRevealWrites(document, tasksShownAgain(document.schedule, before, panels.visibilities()))
    if (writes.length > 0) hands.writeDocument(writes, frame)
  }
  const holdJumpTarget = (taskUid: number): void =>
    holdJumpTargetIn(panels, hands.readHeld().document.schedule, taskUid, { reportTaskUids: readReportTaskUids(), created: created.read() })
  return {
    drawnSet,
    visibilities: panels.visibilities,
    appliedTables: (): readonly VisibilityTable[] => appliedTablesOf(panels.visibilities()),
    keepWithinSchedule(schedule: Schedule): void {
      keepTablesWithinSchedule(panels, schedule)
      created.keepWithin(taskUidsOf(schedule), isFiltered())
    },
    holdJumpTarget,
    holdCreatedTasks: (before: Schedule, after: Schedule): void => created.note(before, after, isFiltered()),
    turnOffEveryFilter: (): void => TABLE_ORDER.forEach((table) => panels.change(table, panelWithFilterOff)),
    end(): void {
      TABLE_ORDER.forEach((table) => panels.change(table, panelWithValuesDropped))
      windows.dropClosedValues()
    },
    openShownAgain,
    /** @purity non-pure */
    holdChangeRevealing(change: () => void, frame: FrameValues): void {
      const before = panels.visibilities()
      change()
      openShownAgain(before, frame)
    },
    agentHolder: (): NonNullable<AgentApiSeams['shownTasks']> => agentShownTasksHolderOf(hands, panels, { drawnSet, holdJumpTarget }),
  }
}

// see AM-26, AM-27, SJ-0
/** @purity non-pure */
function agentShownTasksHolderOf(
  hands: FrameLoopHands,
  panels: TablePanels,
  hold: { readonly drawnSet: () => ReadonlySet<number> | null; readonly holdJumpTarget: (taskUid: number) => void },
): NonNullable<AgentApiSeams['shownTasks']> {
  return {
    readShownTasks: () => {
      const drawn = hold.drawnSet()
      return { drawnTaskUids: drawn === null ? null : [...drawn], tables: appliedTablesOf(panels.visibilities()) }
    },
    readSearchVisibility: (): TableVisibility => panels.visibilities().searchPanel,
    holdShownTasks: (visibility: TableVisibility): void => holdAgentSearchVisibility(hands, panels, visibility),
    holdJumpTarget: hold.holdJumpTarget,
  }
}
