// Schedule: public entry; looks a task up by uid, drops one named dependency line and re-exports what the siblings hold.
// @unit      UF-1   (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-1

import type { Schedule, Task, TaskVisual } from './schedule-entities'

export {
  COLUMN_DEFAULTS,
  COLUMN_SHAPES,
  DATE_COLUMNS,
  DEFAULT_CALENDAR_VALUES,
} from './schedule-entities'
export type {
  Assignment,
  BaselineTask,
  Calendar,
  CarryElement,
  ColumnShape,
  CommentBox,
  Dependency,
  EntityRows,
  Exception,
  ForeignKeyColumn,
  HighlightBox,
  NestedRows,
  Project,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskOrigin,
  TaskVisual,
  WeekDay,
} from './schedule-entities'
export { planActualState, progressPointDayOf } from './plan-actual-state'
export type { PlanActualState } from './plan-actual-state'
export {
  calendarDaysBetween,
  calendarSpanOf,
  compareDays,
  dayFromSerial,
  dayOf,
  isSameDay,
  DAY_END_TIME,
  DAY_START_TIME,
  serial,
  textOfDay,
  textOfDayEnd,
  textOfDayStart,
} from './calendar-day'
export type { CalendarDay, CalendarSpan } from './calendar-day'
export {
  actualLastDay,
  actualLengthOf,
  DAILY_RECURRENCE_KIND,
  dateFromWorkingDays,
  DaySpanTooWide,
  defaultFinishTimeOf,
  defaultStartTimeOf,
  isNonRecurringException,
  isWorkingDay,
  lagOfWorkingDays,
  lagWorkingDaysOf,
  lastDayForLength,
  minutesPerWorkingDayOf,
  nextWorkingDay,
  NoWorkingDayReached,
  plannedDurationMinutesOf,
  TENTHS_OF_A_MINUTE,
  textOfFinishSide,
  textOfStartSide,
  WORKING_DAY_LAG_FORMAT,
  workingCalendarOf,
  workingDaysBetween,
} from './working-calendar'
export type { WorkingCalendar } from './working-calendar'
export { delayStart, delayWorkingDays, isDelayed } from './task-delay'
export { diagnoseDelay, parentCandidatesOf, parentTaskResolutionsOf } from './delay-diagnostics'
export type { DelayDiagnosticsReport, ParentTaskResolution } from './delay-diagnostics'
export {
  DELAY_REPORT_STATUSES,
  compareDelayFixRows,
  delayDiagnosticsReportMarkdown,
  delayDiagnosticsReportRows,
  delayFixColumnsOf,
  delayFixLogCells,
  delayFixLogRowsInOrder,
  delayFixProposalCells,
  delayFixProposalRows,
  delayFixRowsInOrder,
  delayFixValueText,
} from './delay-diagnostics-report-table'
export { DELAY_FIX_TYPES, delayFixCommands, delayFixLogRowsOf, proposeDelayFixes } from './delay-fixes'
export type {
  DelayFixCheck,
  DelayFixChoice,
  DelayFixChoiceWord,
  DelayFixCommand,
  DelayFixLink,
  DelayFixLogRow,
  DelayFixOpenField,
  DelayFixPlacement,
  DelayFixRefusal,
  DelayFixRow,
  DelayFixType,
  DelayFixValue,
} from './delay-fixes'
export type {
  DelayFixMarkdown,
  DelayFixMarkdownSection,
  DelayFixWords,
  DelayReportDates,
  DelayReportFilter,
  DelayReportReason,
  DelayReportRow,
  DelayReportStatus,
  DelayReportTextRow,
  DelayReportWords,
} from './delay-diagnostics-report-table'
export {
  customColorChosen,
  customColorOf,
  customSideOf,
  isStoredColor,
  TRANSPARENT,
} from './stored-color'
export type { CustomColor } from './stored-color'
export { scheduleViolations } from './schedule-invariants'
export type { InvariantKind, ScheduleViolation } from './schedule-invariants'
export { taskGroupNameOf } from './task-group-names'
export { isSearchWordFound, searchRowsOf } from './schedule-search'
export type { CommentBoxSearchRow, SearchRows, TaskSearchRow } from './schedule-search'

/** @purity pure */
export function taskByUid(schedule: Schedule, uid: number): Task | null {
  return schedule.tasks.find((task) => task.uid === uid) ?? null
}

// see CM-93, AT-42
// WHY: lines from one predecessor have no name of their own, so the order counts those lines alone and a deletion
// of another predecessor's line does not move it.
/** @purity pure */
export function withoutDependencyAt(task: Task, predecessorUid: number, order: number): Task | null {
  const places = task.dependencies.flatMap((one, at) => (one.predecessorUid === predecessorUid ? [at] : []))
  const place = places[order]
  if (place === undefined) return null
  return { ...task, dependencies: task.dependencies.filter((_, at) => at !== place) }
}

// see IV-23, AT-97
// WHY: a Task whose color and shape nobody chose still holds its one TaskVisual, so no reader needs
// a second way to draw a Task without one.
/** @purity pure */
export function blankTaskVisual(taskUid: number): TaskVisual {
  return {
    taskUid,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    strokeWidthPx: null,
  }
}
