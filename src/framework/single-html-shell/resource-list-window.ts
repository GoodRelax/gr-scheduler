// SingleHtmlShell -- answers the Resource List window's entries: its opening, its table and frame, and IC-66 (table T-370).
// @unit      UF-200  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { DocumentCommand } from '../../use-case/apply-document-change/apply-document-change'
import { confirmationOwedByResourceDeletion } from '../../use-case/edit-document/edit-document'
import type { FileFlowOwedAction, TableView, VisibilityTable } from '../../use-case/advance-screen-session/advance-screen-session'
import {
  resourceListAfterEntry,
  type DisplayLanguage,
  type IconId,
  type TableWindowState,
} from '../../adapter/screen-renderer/screen-renderer'
import { DELAY_DIAGNOSTICS_REPORT_SURFACE } from './delay-diagnostics-report-window'
import type { HeldTableWindows, ShownTasksHold } from './shown-tasks-hold'
import { CONFIRMATION_MANNER, NOTHING_TO_DO_REASON, isQuestionAskedIn, type FrameLoopHands, type FrameValues } from './frame-loop'

export const RESOURCE_LIST_SURFACE = 'Resource List'

const SCHEDULE_FILTER_BAR_SURFACE = 'Schedule Filter Bar'

const SCHEDULE_FILTER_ENTRY: IconId = 'IC-143'

const RESOURCE_LIST_ENTRY: IconId = 'IC-62'

const RESOURCE_DELETE_ENTRY: IconId = 'IC-66'

const TEXT_SIZE_ENTRY: IconId = 'IC-127'

// see RO-1, RO-6, S-545, S-546
export type ResourceListWindow = TableWindowState

interface ResourceListRows {
  readonly schedule: Schedule
  readonly language: DisplayLanguage
  readonly chosenResourceUids: readonly number[]
}

interface ResourceListHeld extends ResourceListRows {
  readonly window: ResourceListWindow
  readonly view: TableView
}

interface TableWindowEntryPressed {
  readonly entry: IconId
  readonly surface: string | null
  readonly filterColumn: string | null
  readonly listed: readonly string[] | null
}

type HeldResourceList = Pick<HeldTableWindows, 'resourceList' | 'holdResourceList'> & {
  readonly reopenedResourceList: () => ResourceListWindow
}

// see RO-1, TV-8, UN-20, CM-92
// WHY: closing a table's window lets its Schedule Filter go as an edit, so an undo puts it back (TV-8).
/** @purity pure */
export function scheduleFilterLetGoOf(table: VisibilityTable, view: TableView): Extract<DocumentCommand, { readonly kind: 'setTableView' }> | null {
  if (!view.visibility.isApplied) return null
  return { kind: 'setTableView', table, view: { ...view, visibility: { ...view.visibility, isApplied: false } } }
}

// see RO-1, WB-6, S-546
/** @purity pure */
export function tableWindowReopened<W extends TableWindowState>(held: W | null, closed: W | null, opened: W): W {
  if (held === null) return closed === null ? opened : { ...closed, shown: 'normal', isInFront: true }
  return { ...held, shown: held.shown === 'minimized' ? 'normal' : held.shown, isInFront: true }
}

// see RW-5, RO-6, UZ-6
/** @purity pure */
export function withTableWindowInFront<R extends TableWindowState, L extends TableWindowState>(
  before: { readonly report: R | null; readonly resourceList: L | null },
  after: { readonly report: R | null; readonly resourceList: L | null },
): { readonly report: R | null; readonly resourceList: L | null } {
  const isListFronted = after.resourceList?.isInFront === true && before.resourceList?.isInFront !== true
  const isReportFronted = after.report?.isInFront === true && before.report?.isInFront !== true
  if (isListFronted && after.report !== null) return { ...after, report: { ...after.report, isInFront: false } }
  if (isReportFronted && after.resourceList !== null) return { ...after, resourceList: { ...after.resourceList, isInFront: false } }
  return after
}

// see T-370, RO-1, RO-2, RO-3, SV-7, SV-8, WB-2, WB-3, TV-8, UN-20
/** @purity non-pure */
function answerResourceListEntry(
  entry: IconId,
  filterColumn: string | null,
  held: ResourceListHeld | null,
  outlets: { readonly holdWindow: (window: ResourceListWindow | null) => void; readonly writeView: (view: TableView) => void },
  listed?: readonly string[] | null,
): boolean {
  if (held === null) return false
  const answer = resourceListAfterEntry(held.window, held.view, entry, filterColumn, held, listed)
  if (answer === null) return false
  outlets.writeView(answer.view)
  outlets.holdWindow(answer.window)
  return true
}

// see T-370, RO-1, RO-10, TV-8, U-67, IC-127, UN-20
// WHY: null hands the entry on; another table window reaches the search panel only with IC-127, the size of S-429.
/** @purity non-pure */
export function answerTableWindowEntry(
  pressed: TableWindowEntryPressed,
  windows: HeldResourceList,
  shownTasks: Pick<ShownTasksHold, 'turnOffEveryFilter' | 'views' | 'writeViews'>,
  rows: ResourceListRows & { readonly hands: FrameLoopHands; readonly frame: FrameValues },
): boolean | null {
  const { entry, surface } = pressed
  if (entry === RESOURCE_DELETE_ENTRY) return answerResourceDeletion(rows.hands, rows.frame)
  if (surface === SCHEDULE_FILTER_BAR_SURFACE) {
    if (entry !== SCHEDULE_FILTER_ENTRY) return null
    shownTasks.turnOffEveryFilter(rows.frame)
    return true
  }
  if (entry === RESOURCE_LIST_ENTRY && surface !== RESOURCE_LIST_SURFACE) {
    windows.holdResourceList(windows.reopenedResourceList())
    return true
  }
  const window = windows.resourceList()
  const held = surface === RESOURCE_LIST_SURFACE && window !== null ? { ...rows, window, view: shownTasks.views().resourceList } : null
  const outlets = { holdWindow: windows.holdResourceList, writeView: (view: TableView) => shownTasks.writeViews({ resourceList: view }, rows.frame) }
  if (answerResourceListEntry(entry, pressed.filterColumn, held, outlets, pressed.listed)) return true
  const isOtherTableWindow = surface === RESOURCE_LIST_SURFACE || surface === DELAY_DIAGNOSTICS_REPORT_SURFACE
  if (!isOtherTableWindow || entry === TEXT_SIZE_ENTRY) return null
  return false
}

// see RO-10, FR-099, CD-5
/** @purity non-pure */
function answerResourceDeletion(hands: FrameLoopHands, frame: FrameValues): boolean {
  const chosen = hands.readSession().selection.chosenResources
  if (chosen.length === 0) {
    hands.raiseNotice(NOTHING_TO_DO_REASON, null)
    return true
  }
  const writes: readonly DocumentCommand[] = [{ kind: 'deleteResource', uids: chosen }]
  const owedQuestion = confirmationOwedByResourceDeletion(chosen, hands.readHeld().document)
  if (owedQuestion === null || isQuestionAskedIn(hands.readSession())) {
    hands.writeDocument(writes, frame)
    return true
  }
  const owedAction: FileFlowOwedAction = { kind: 'changeDocument', writes: [writes], created: null }
  hands.sendToSession({ type: 'changeQuestionRaised', question: { manner: CONFIRMATION_MANNER, ...owedQuestion }, owedAction }, frame)
  return true
}
