// SingleHtmlShell -- holds the Search Panel's checked tasks against the document and the screen (table T-353, SJ-0).
// @unit      UF-198  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import { shownTasksRevealWrites } from '../../use-case/edit-document/edit-document'
import type {
  ScreenSession,
  ScreenValuesEvent,
  SearchPanelSession,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { searchPanelAfterFilterChange } from '../../adapter/screen-renderer/screen-renderer'
import { isSizeSettled, type AgentApiSeams, type FrameLoopHands, type FrameValues } from './frame-loop'

const SEARCH_PANEL_OPENED: ScreenValuesEvent = { type: 'searchEntryPressed' }
const SEARCH_PANEL_MINIMISE_TOGGLED: ScreenValuesEvent = { type: 'searchPanelMinimiseToggled' }

const SHOW_COLUMN = 'SQ-10'

type Schedule = Document['schedule']

type HeldShownTasks = ReturnType<NonNullable<AgentApiSeams['shownTasks']>['readShownTasks']>

interface HeldSearchPanel {
  readonly searchPanel: () => SearchPanelSession
  readonly holdSearchPanel: (panel: SearchPanelSession) => void
}

// see TV-1, TV-3, TD-8, DFC-1820
// WHY: one set per held list, so the picture inputs keep their identity while no box is ticked (DFC-1820).
/** @purity non-pure */
function shownSetKeeper(): (panel: SearchPanelSession) => ReadonlySet<number> | null {
  let list: readonly number[] | null = null
  let set: ReadonlySet<number> | null = null
  return (panel) => {
    if (!panel.showOnlyChecked) return null
    if (panel.shownTaskUids !== list) {
      list = panel.shownTaskUids
      set = new Set(list)
    }
    return set
  }
}

// see SJ-0, TV-6, TV-7
/** @purity pure */
function panelWithShownChange(session: ScreenSession, panel: SearchPanelSession, taskUids: readonly number[], isShown: boolean): SearchPanelSession {
  if (taskUids.length === 0) return panel
  return searchPanelAfterFilterChange(session, panel, { kind: 'shown', column: SHOW_COLUMN, taskUids, isShown }) ?? panel
}

// see SJ-0, SJ-9
/** @purity pure */
function panelWithJumpTarget(session: ScreenSession, panel: SearchPanelSession, taskUid: number): SearchPanelSession {
  if (!panel.showOnlyChecked || panel.shownTaskUids.includes(taskUid)) return panel
  return panelWithShownChange(session, panel, [taskUid], true)
}

// see TV-6, SJ-2
/** @purity pure */
function shownTasksToOpen(before: SearchPanelSession, after: SearchPanelSession): readonly number[] {
  if (!after.showOnlyChecked) return []
  if (!before.showOnlyChecked) return after.shownTaskUids
  if (after.shownTaskUids === before.shownTaskUids) return []
  const held = new Set(before.shownTaskUids)
  return after.shownTaskUids.filter((uid) => !held.has(uid))
}

// see TV-7
/** @purity pure */
function panelWithCreatedTasks(session: ScreenSession, panel: SearchPanelSession, before: Schedule, after: Schedule): SearchPanelSession {
  if (!panel.showOnlyChecked || before.tasks === after.tasks) return panel
  const held = new Set(before.tasks.map((task) => task.uid))
  return panelWithShownChange(session, panel, after.tasks.filter((task) => !held.has(task.uid)).map((task) => task.uid), true)
}

// see AM-26, AM-27, TV-8, PND-712
/** @purity non-pure */
function shownTasksHolderOf(hands: FrameLoopHands, windows: HeldSearchPanel): NonNullable<AgentApiSeams['shownTasks']> {
  const holdShownTasks = (shown: HeldShownTasks): void => {
    windows.holdSearchPanel({ ...windows.searchPanel(), shownTaskUids: shown.taskUids, showOnlyChecked: shown.isShowOnlyChecked })
    if (shown.isShowOnlyChecked && hands.readSession().screen.searchPanelDisplayState.kind === 'hidden') {
      hands.sendToSession(SEARCH_PANEL_OPENED, hands.readValues())
      hands.sendToSession(SEARCH_PANEL_MINIMISE_TOGGLED, hands.readValues())
    }
    if (isSizeSettled(hands.readEnvironment())) hands.ask()
  }
  return {
    readShownTasks: () => ({ taskUids: windows.searchPanel().shownTaskUids, isShowOnlyChecked: windows.searchPanel().showOnlyChecked }),
    holdShownTasks,
    holdJumpTarget(taskUid): void {
      const panel = windows.searchPanel()
      const next = panelWithJumpTarget(hands.readSession(), panel, taskUid)
      if (next !== panel) holdShownTasks({ taskUids: next.shownTaskUids, isShowOnlyChecked: next.showOnlyChecked })
    },
  }
}

// see TV-2
/** @purity non-pure */
function shownWithinScheduleKeeper(): (session: ScreenSession, panel: SearchPanelSession, schedule: Schedule) => SearchPanelSession {
  let readSchedule: Schedule | null = null
  let readList: readonly number[] | null = null
  return (session, panel, schedule) => {
    if (panel.shownTaskUids.length === 0 || (schedule === readSchedule && panel.shownTaskUids === readList)) return panel
    const present = new Set(schedule.tasks.map((task) => task.uid))
    const kept = panelWithShownChange(session, panel, panel.shownTaskUids.filter((uid) => !present.has(uid)), false)
    readSchedule = schedule
    readList = kept.shownTaskUids
    return kept
  }
}

// see TV-1, TV-2, TV-6, TV-7, TV-9, SJ-0, SJ-9, EL-21, AM-26, AM-27
/** @purity non-pure */
export function shownTasksHoldOf(hands: FrameLoopHands, windows: HeldSearchPanel) {
  const shownSetOf = shownSetKeeper()
  const shownWithinSchedule = shownWithinScheduleKeeper()
  const hold = (panel: SearchPanelSession): void => windows.holdSearchPanel(panel)
  const openNewlyShown = (before: SearchPanelSession, frame: FrameValues): void => {
    const taskUids = shownTasksToOpen(before, windows.searchPanel())
    const document = hands.readHeld().document
    const writes = shownTasksRevealWrites(document, taskUids)
    if (writes.length > 0) hands.writeDocument(writes, frame)
  }
  return {
    drawnSet: (): ReadonlySet<number> | null => shownSetOf(windows.searchPanel()),
    keepWithinSchedule: (schedule: Schedule): void => hold(shownWithinSchedule(hands.readSession(), windows.searchPanel(), schedule)),
    holdJumpTarget: (taskUid: number): void => {
      const panel = windows.searchPanel()
      const next = panelWithJumpTarget(hands.readSession(), panel, taskUid)
      if (next !== panel) hold(next)
    },
    holdCreatedTasks: (before: Schedule, after: Schedule): void =>
      hold(panelWithCreatedTasks(hands.readSession(), windows.searchPanel(), before, after)),
    end: (): void => hold({ ...windows.searchPanel(), shownTaskUids: [], showOnlyChecked: false }),
    openNewlyShown,
    holdOpeningShown: (panel: SearchPanelSession, frame: FrameValues): void => {
      const before = windows.searchPanel()
      hold(panel)
      openNewlyShown(before, frame)
    },
    agentHolder: (): NonNullable<AgentApiSeams['shownTasks']> => shownTasksHolderOf(hands, windows),
  }
}
