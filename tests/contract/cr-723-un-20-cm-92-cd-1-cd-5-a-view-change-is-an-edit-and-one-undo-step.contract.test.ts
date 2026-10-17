// CR-723 spec-only contract: a change of a table's view is one command (CM-92) and one undo step (UN-20), and deleting a task or a resource takes its hidden-row value (CD-1, CD-5, TV-2).

import { describe, expect, it } from 'vitest'

import {
  ALPHA,
  BRAVO,
  CHARLIE,
  DATE_FILTER,
  DEFAULT_VIEW,
  SATO,
  STATUS_FILTER,
  TANAKA,
  BY_RESOURCE,
  documentText,
  heldOf,
  openedFrom,
  redone,
  scheduleFixture,
  setTableView,
  stepsOf,
  tableViewOf,
  tableViewsText,
  undone,
  view,
  written,
  type Held,
  type Loose,
  type TableView,
  type VisibilityTable,
} from './cr-723-stage'
import type { DocumentCommand } from '../../src/use-case/apply-document-change/apply-document-change'

const fresh = (): Held => heldOf(openedFrom(documentText()))
const viewIn = (held: Held, table: VisibilityTable): TableView => tableViewOf(held.document.documentSettings, table)

const HIDE_TWO: TableView = view({ visibility: { hiddenTaskUids: [ALPHA, BRAVO], hiddenResourceUids: [], isUnassignedHidden: false, isScheduleFilterApplied: false } })
const EYE_ON: TableView = view({ visibility: { hiddenTaskUids: [ALPHA, BRAVO], hiddenResourceUids: [], isUnassignedHidden: false, isScheduleFilterApplied: true } })
const FILTERED: TableView = view({ ...EYE_ON, columnFilters: [STATUS_FILTER] })
const SORTED: TableView = view({ ...FILTERED, sort: BY_RESOURCE })

describe('CM-92 -- setTableView puts one table\'s whole view into the document', () => {
  it('after the command tableViewOf reads that table as given and leaves the other two at the default', () => {
    const after = written(fresh(), [setTableView('searchPanel', SORTED)])
    expect(viewIn(after, 'searchPanel')).toEqual(SORTED)
    expect(viewIn(after, 'delayDiagnosticsReport')).toEqual(DEFAULT_VIEW)
    expect(viewIn(after, 'resourceList')).toEqual(DEFAULT_VIEW)
  })

  it('a second command for the same table replaces the view, it does not merge into it', () => {
    const once = written(fresh(), [setTableView('searchPanel', SORTED)])
    const twice = written(once, [setTableView('searchPanel', view({ columnFilters: [DATE_FILTER] }))])
    expect(viewIn(twice, 'searchPanel')).toEqual(view({ columnFilters: [DATE_FILTER] }))
  })

  it('the resource list takes the (Unassigned) row as part of its Visibility', () => {
    const asked = view({ visibility: { hiddenTaskUids: [], hiddenResourceUids: [TANAKA], isUnassignedHidden: true, isScheduleFilterApplied: true } })
    expect(viewIn(written(fresh(), [setTableView('resourceList', asked)]), 'resourceList')).toEqual(asked)
  })

  it('the schedule is the very same schedule: a view is not a schedule edit', () => {
    const before = fresh()
    const after = written(before, [setTableView('searchPanel', EYE_ON)])
    expect(after.document.schedule).toBe(before.document.schedule)
  })
})

describe('UN-20 / FR-151 -- a change of a view is an unsaved edit and one undo step', () => {
  it('hiding rows is one step; undo brings the all-shown view back; redo hides them again', () => {
    const base = fresh()
    const hidden = written(base, [setTableView('searchPanel', HIDE_TWO)])
    expect(stepsOf(hidden)).toBe(stepsOf(base) + 1)
    expect(viewIn(undone(hidden), 'searchPanel')).toEqual(DEFAULT_VIEW)
    expect(viewIn(redone(undone(hidden)), 'searchPanel')).toEqual(HIDE_TWO)
  })

  it('undo after the hiding returns a document equal to the one that was opened', () => {
    const base = fresh()
    expect(undone(written(base, [setTableView('searchPanel', HIDE_TWO)])).document).toEqual(base.document)
  })

  it('turning the eye on is a step of its own, and undo takes only the eye back', () => {
    const hidden = written(fresh(), [setTableView('searchPanel', HIDE_TWO)])
    const on = written(hidden, [setTableView('searchPanel', EYE_ON)])
    expect(stepsOf(on)).toBe(stepsOf(hidden) + 1)
    expect(viewIn(undone(on), 'searchPanel')).toEqual(HIDE_TWO)
  })

  it('a column filter and a sort are one step each', () => {
    const on = written(fresh(), [setTableView('searchPanel', EYE_ON)])
    const filtered = written(on, [setTableView('searchPanel', FILTERED)])
    const sorted = written(filtered, [setTableView('searchPanel', SORTED)])
    expect(stepsOf(sorted)).toBe(stepsOf(on) + 2)
    expect(viewIn(undone(sorted), 'searchPanel')).toEqual(FILTERED)
    expect(viewIn(undone(undone(sorted)), 'searchPanel')).toEqual(EYE_ON)
  })

  it('releasing the eye (also by closing the window) is a step; undo turns the eye on again', () => {
    const on = written(fresh(), [setTableView('searchPanel', EYE_ON)])
    const released = written(on, [setTableView('searchPanel', view({ ...EYE_ON, visibility: { ...EYE_ON.visibility, isScheduleFilterApplied: false } }))])
    expect(stepsOf(released)).toBe(stepsOf(on) + 1)
    expect(viewIn(released, 'searchPanel').visibility.hiddenTaskUids, 'TV-8: the Visibility stays').toEqual([ALPHA, BRAVO])
    expect(viewIn(undone(released), 'searchPanel').visibility.isScheduleFilterApplied).toBe(true)
  })

  it('the bar\'s release of every table, sent as one call, is one step and one undo turns every eye back on', () => {
    const everyEyeOn: readonly DocumentCommand[] = (['searchPanel', 'delayDiagnosticsReport', 'resourceList'] as const).map((table) =>
      setTableView(table, view({ visibility: { hiddenTaskUids: [], hiddenResourceUids: [], isUnassignedHidden: false, isScheduleFilterApplied: true } })),
    )
    const on = written(fresh(), everyEyeOn)
    const off = written(
      on,
      (['searchPanel', 'delayDiagnosticsReport', 'resourceList'] as const).map((table) => setTableView(table, DEFAULT_VIEW)),
    )
    expect(stepsOf(off)).toBe(stepsOf(on) + 1)
    const back = undone(off)
    for (const table of ['searchPanel', 'delayDiagnosticsReport', 'resourceList'] as const) {
      expect(viewIn(back, table).visibility.isScheduleFilterApplied, table).toBe(true)
    }
  })

  it('the three tables change independently: a view set on one table moves nothing on the others', () => {
    const search = written(fresh(), [setTableView('searchPanel', EYE_ON)])
    const both = written(search, [setTableView('resourceList', view({ visibility: { hiddenTaskUids: [], hiddenResourceUids: [SATO], isUnassignedHidden: false, isScheduleFilterApplied: true } }))])
    expect(viewIn(both, 'searchPanel')).toEqual(EYE_ON)
    expect(viewIn(undone(both), 'resourceList')).toEqual(DEFAULT_VIEW)
    expect(viewIn(undone(both), 'searchPanel')).toEqual(EYE_ON)
  })
})

describe('CD-1 / TV-2 -- deleting a task takes its "hidden" value out of the searched and reported tables, and undo puts it back', () => {
  const holding = (): Held =>
    written(fresh(), [
      setTableView('searchPanel', view({ visibility: { hiddenTaskUids: [ALPHA, BRAVO], hiddenResourceUids: [], isUnassignedHidden: false, isScheduleFilterApplied: true } })),
      setTableView('delayDiagnosticsReport', view({ visibility: { hiddenTaskUids: [ALPHA, CHARLIE], hiddenResourceUids: [], isUnassignedHidden: false, isScheduleFilterApplied: false } })),
    ])

  it('the deleted uid leaves both tables\' hidden lists and the others stay', () => {
    const after = written(holding(), [{ kind: 'deleteTask', taskUid: ALPHA } as unknown as DocumentCommand])
    expect(viewIn(after, 'searchPanel').visibility.hiddenTaskUids).toEqual([BRAVO])
    expect(viewIn(after, 'delayDiagnosticsReport').visibility.hiddenTaskUids).toEqual([CHARLIE])
  })

  it('the eyes and the filters of those tables are not touched by the delete', () => {
    const after = written(holding(), [{ kind: 'deleteTask', taskUid: ALPHA } as unknown as DocumentCommand])
    expect(viewIn(after, 'searchPanel').visibility.isScheduleFilterApplied).toBe(true)
  })

  it('the delete is one step and its undo restores the task and both hidden values', () => {
    const before = holding()
    const after = written(before, [{ kind: 'deleteTask', taskUid: ALPHA } as unknown as DocumentCommand])
    expect(stepsOf(after)).toBe(stepsOf(before) + 1)
    const back = undone(after)
    expect(viewIn(back, 'searchPanel').visibility.hiddenTaskUids).toEqual([ALPHA, BRAVO])
    expect(viewIn(back, 'delayDiagnosticsReport').visibility.hiddenTaskUids).toEqual([ALPHA, CHARLIE])
    expect(back.document.schedule.tasks.map((one) => one.uid)).toContain(ALPHA)
  })

  it('deleting a task that was not hidden leaves every hidden list as it was', () => {
    const before = holding()
    const after = written(before, [{ kind: 'deleteTask', taskUid: 5 } as unknown as DocumentCommand])
    expect(viewIn(after, 'searchPanel')).toEqual(viewIn(before, 'searchPanel'))
    expect(viewIn(after, 'delayDiagnosticsReport')).toEqual(viewIn(before, 'delayDiagnosticsReport'))
  })

  it('a descendant task that was hidden goes with its parent, and its value with it (TV-2)', () => {
    const schedule = scheduleFixture()
    const tasks = (schedule['tasks'] as Loose[]).map((one) => (one['uid'] === BRAVO ? { ...one, parentTaskUid: ALPHA } : one))
    const text = documentText({ tableViews: tableViewsText({ searchPanel: HIDE_TWO, delayDiagnosticsReport: DEFAULT_VIEW, resourceList: DEFAULT_VIEW }) }, { ...schedule, tasks })
    const after = written(heldOf(openedFrom(text)), [{ kind: 'deleteTask', taskUid: ALPHA } as unknown as DocumentCommand])
    expect(after.document.schedule.tasks.map((one) => one.uid)).not.toContain(BRAVO)
    expect(viewIn(after, 'searchPanel').visibility.hiddenTaskUids).toEqual([])
  })
})

describe('CD-5 / TV-2 -- deleting a resource takes its "hidden" value out of the resource list, and undo puts it back', () => {
  const holding = (): Held =>
    written(fresh(), [setTableView('resourceList', view({ visibility: { hiddenTaskUids: [], hiddenResourceUids: [SATO, TANAKA], isUnassignedHidden: true, isScheduleFilterApplied: true } }))])

  it('the deleted resource leaves the hidden list, the other stays, and the (Unassigned) row is as it was', () => {
    const after = written(holding(), [{ kind: 'deleteResources', resourceUids: [TANAKA] } as unknown as DocumentCommand])
    expect(viewIn(after, 'resourceList').visibility).toEqual({ hiddenTaskUids: [], hiddenResourceUids: [SATO], isUnassignedHidden: true, isScheduleFilterApplied: true })
  })

  it('no task is deleted with the resource', () => {
    const before = holding()
    const after = written(before, [{ kind: 'deleteResources', resourceUids: [TANAKA] } as unknown as DocumentCommand])
    expect(after.document.schedule.tasks.map((one) => one.uid)).toEqual(before.document.schedule.tasks.map((one) => one.uid))
  })

  it('the delete is one step and undo restores the resource and its hidden value', () => {
    const before = holding()
    const after = written(before, [{ kind: 'deleteResources', resourceUids: [TANAKA] } as unknown as DocumentCommand])
    expect(stepsOf(after)).toBe(stepsOf(before) + 1)
    const back = undone(after)
    expect(viewIn(back, 'resourceList').visibility.hiddenResourceUids).toEqual([SATO, TANAKA])
    expect(back.document.schedule.resources.map((one) => one.uid)).toContain(TANAKA)
  })
})
