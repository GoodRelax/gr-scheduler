// Schedule: public entry; looks a task up by uid and re-exports what the siblings hold.
// @unit      UF-1   (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-1

import type { Schedule, Task } from './schedule-entities'

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
export { planActualState } from './plan-actual-state'
export type { PlanActualState } from './plan-actual-state'
export {
  calendarDaysBetween,
  calendarSpanOf,
  compareDays,
  dayOf,
  textOfDay,
} from './calendar-day'
export type { CalendarDay, CalendarSpan } from './calendar-day'
export {
  actualLastDay,
  actualLengthOf,
  dateFromWorkingDays,
  DaySpanTooWide,
  isWorkingDay,
  lastDayForLength,
  nextWorkingDay,
  NoWorkingDayReached,
  workingCalendarOf,
  workingDaysBetween,
} from './working-calendar'
export type { WorkingCalendar } from './working-calendar'
export { delayStart, delayWorkingDays, isDelayed } from './task-delay'
export {
  customColourChosen,
  customColourOf,
  customSideOf,
  isStoredColour,
} from './stored-colour'
export type { CustomColour } from './stored-colour'
export { scheduleViolations } from './schedule-invariants'
export type { InvariantKind, ScheduleViolation } from './schedule-invariants'

/** @purity pure */
export function taskByUid(schedule: Schedule, uid: number): Task | null {
  return schedule.tasks.find((task) => task.uid === uid) ?? null
}
