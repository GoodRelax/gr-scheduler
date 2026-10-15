// EditDocument -- the Shift Whole Schedule: every date but the calendar moved by working days to a new start date.
// @unit      UF-207  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import {
  DATE_COLUMNS,
  DaySpanTooWide,
  NoWorkingDayReached,
  compareDays,
  dayFromSerial,
  dayOf,
  earliestPlanStartDayOf,
  finishSideDayOf,
  instantOf,
  instantOnSideReader,
  serial,
  sideOfTaskColumn,
  startSideOf,
  textOfDay,
  workingCalendarOf,
  workingDayShiftOf,
  workingSpansReader,
  type CalendarDay,
  type DateTimeSide,
  type Task,
  type WorkingDayShift,
} from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { EditResult, Refusal } from './edit-document'
import { edited, refused, reject } from './edit-document'
import { isAcceptedDay, isInsideWorkingTime } from './edit-project'

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, WholeScheduleShiftCommand).
// see T-108
export type WholeScheduleShiftCommand =
  | { readonly kind: 'shiftScheduleToStartDate'; readonly newStartDate: string }
// </generated>

const COMMAND_ROW = 'CM-99'

// see WH-7
const TASK_COLUMNS = DATE_COLUMNS.Task as readonly (keyof Task & string)[]
const BASELINE_COLUMNS = ['start', 'finish'] as const
const HIGHLIGHT_COLUMNS = DATE_COLUMNS.HighlightBox
const COMMENT_COLUMNS = DATE_COLUMNS.CommentBox
const SETTINGS_COLUMNS = ['scrollDate', 'fitSpanStart', 'fitSpanFinish'] as const

// see WH-6
const DATE_PART = /^(\s*)\d{4}-\d{2}-\d{2}/
const DATE_PART_LENGTH = 10

interface MovedText {
  readonly text: string
  readonly isPulled: boolean
  readonly isAccepted: boolean
}

// see WH-6, FR-054
// WHY: a finish at 00:00 is the end of the day before, so that day moves and the text names the day after it.
/** @purity pure */
function movedText(text: string | null, side: DateTimeSide, shift: WorkingDayShift): MovedText | null {
  if (text === null || instantOf(text) === null) return null
  const written = dayOf(text)
  const read = side === 'finish' ? finishSideDayOf(text) : written
  if (written === null || read === null) return null
  const moved = shift.moveDay(read)
  const day = compareDays(read, written) === 0 ? moved.day : dayFromSerial(serial(moved.day) + 1)
  return { text: text.replace(DATE_PART, `$1${textOfDay(day).slice(0, DATE_PART_LENGTH)}`), isPulled: moved.isPulled, isAccepted: isAcceptedDay(day) }
}

interface ShiftPass {
  readonly move: (text: string | null, side: DateTimeSide, what: string) => string | null
  readonly pulledCount: () => number
  readonly outside: () => readonly string[]
}

/** @purity pure */
function shiftPassOf(shift: WorkingDayShift): ShiftPass {
  let pulled = 0
  const outside: string[] = []
  return {
    move: (text, side, what) => {
      const moved = movedText(text, side, shift)
      if (moved === null) return text
      if (moved.isPulled) pulled += 1
      if (!moved.isAccepted) outside.push(`${what}=${String(text)}`)
      return moved.text
    },
    pulledCount: () => pulled,
    outside: () => outside,
  }
}

/** @purity pure */
function movedRow<TRow extends object>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  sideOf: (column: string) => DateTimeSide,
  pass: ShiftPass,
  what: string,
): TRow {
  let held = row
  for (const column of columns) {
    const text = row[column] as unknown as string | null
    const moved = pass.move(text, sideOf(column), `${what} ${column}`)
    if (moved !== text) held = { ...held, [column]: moved }
  }
  return held
}

// WHY: a whole-day range and a single day (WT-6 to WT-8) are read as the day written.
const AS_DAY = (): DateTimeSide => 'start'

// see WH-7, WH-8
/** @purity pure */
function movedDocument(document: Document, pass: ShiftPass): Document {
  const schedule = document.schedule
  const project = schedule.project
  const onTaskSide = (row: Task | Document['schedule']['baselineTasks'][number]) => (column: string) => sideOfTaskColumn(row, column)
  return {
    ...document,
    schedule: {
      ...schedule,
      project: {
        ...project,
        startDate: pass.move(project.startDate, 'start', 'project startDate'),
        statusDate: pass.move(project.statusDate, 'finish', 'project statusDate'),
      },
      tasks: schedule.tasks.map((task) => movedRow(task, TASK_COLUMNS, onTaskSide(task), pass, `task ${task.uid}`)),
      baselineTasks: schedule.baselineTasks.map((one) => movedRow(one, BASELINE_COLUMNS, onTaskSide(one), pass, `baseline ${one.uid}`)),
      highlightBoxes: schedule.highlightBoxes.map((box) => movedRow(box, HIGHLIGHT_COLUMNS, AS_DAY, pass, `highlightBox ${box.id}`)),
      commentBoxes: schedule.commentBoxes.map((box) => movedRow(box, COMMENT_COLUMNS, AS_DAY, pass, `commentBox ${box.id}`)),
    },
    documentSettings: movedRow(document.documentSettings, SETTINGS_COLUMNS, AS_DAY, pass, 'settings'),
  }
}

type ShiftPlan = { readonly shift: WorkingDayShift | null; readonly currentStart: CalendarDay | null } | { readonly refusal: Refusal }

// see WH-1, WH-2, WH-3, WH-9
/** @purity pure */
function shiftPlanOf(document: Document, newStartDate: string): ShiftPlan {
  const newStart = dayOf(newStartDate)
  if (newStart === null) return { refusal: reject(COMMAND_ROW, 'FR-159', `not a date: ${newStartDate}`) }
  if (!isAcceptedDay(newStart)) return { refusal: reject(COMMAND_ROW, 'IV-14', `the new start date leaves the accepted days (table T-214): ${newStartDate}`) }
  const currentStart = earliestPlanStartDayOf(document.schedule.tasks)
  if (currentStart === null) return { shift: null, currentStart }
  const shift = workingDayShiftOf(workingCalendarOf(document.schedule), currentStart, newStart)
  return { shift: shift.workingDays === 0 ? null : shift, currentStart }
}

// see T-214, IV-14
// TRAP: only the walks' own refusals become IV-14; anything else is a fault and is thrown on.
/** @purity pure */
function walkRefusalOf(error: unknown): Refusal {
  if (error instanceof NoWorkingDayReached || error instanceof DaySpanTooWide) return reject(COMMAND_ROW, 'IV-14', error.message)
  throw error
}

// see CM-99, FR-159, T-379, WH-9, WH-10
// WHY: no task with a start, or no working day to move, writes nothing and leaves no undo step (WH-9).
/** @purity pure */
export function wholeScheduleShifted(document: Document, command: WholeScheduleShiftCommand): EditResult {
  try {
    const plan = shiftPlanOf(document, command.newStartDate)
    if ('refusal' in plan) return refused([plan.refusal])
    if (plan.shift === null) return edited(document)
    const pass = shiftPassOf(plan.shift)
    const moved = movedDocument(document, pass)
    const outside = pass.outside()
    if (outside.length > 0) return refused([reject(COMMAND_ROW, 'IV-14', `the shift leaves the accepted days (table T-214): ${outside.join(', ')}`)])
    return edited(moved)
  } catch (error) {
    return refused([walkRefusalOf(error)])
  }
}

/** @purity pure */
function dayKeyOf(day: CalendarDay): string {
  return textOfDay(day).slice(0, DATE_PART_LENGTH)
}

// see WH-11, BS-3
/** @purity pure */
function outsideTaskCountOf(document: Document, moved: Document): number {
  const within = workingCalendarOf(document.schedule)
  const spansOf = workingSpansReader(within)
  const onSide = instantOnSideReader(within)
  return moved.schedule.tasks.filter((task) => {
    const start = onSide(task.start, startSideOf(task))
    const finish = onSide(task.finish, 'finish')
    return (start !== null && !isInsideWorkingTime(spansOf, start, 'start')) || (finish !== null && !isInsideWorkingTime(spansOf, finish, 'finish'))
  }).length
}

// see WH-11
/** @purity pure */
function shiftExampleOf(tasks: readonly Task[], shift: WorkingDayShift) {
  const task = tasks.find((one) => instantOf(one.start) !== null)
  const day = task === undefined ? null : earliestPlanStartDayOf([task])
  if (task === undefined || day === null) return null
  return { name: task.name, before: dayKeyOf(day), after: dayKeyOf(shift.moveDay(day).day) }
}

// see WH-11, QN-15, FR-159
// WHY: what the question shows before the write; null when the Apply button would move nothing (WH-12).
/** @purity pure */
export function wholeScheduleShiftPreviewOf(document: Document, newStartDate: string) {
  try {
    const plan = shiftPlanOf(document, newStartDate)
    if ('refusal' in plan || plan.shift === null || plan.currentStart === null) return null
    const shift = plan.shift
    const pass = shiftPassOf(shift)
    const moved = movedDocument(document, pass)
    return {
      currentStart: dayKeyOf(plan.currentStart),
      typedStart: newStartDate,
      newStart: dayKeyOf(shift.toZero),
      isNewStartNonWorking: shift.isNewStartNonWorking,
      workingDays: shift.workingDays,
      taskCount: moved.schedule.tasks.filter((task, at) => task !== document.schedule.tasks[at]).length,
      pulledCount: pass.pulledCount(),
      outsideCount: outsideTaskCountOf(document, moved),
      example: shiftExampleOf(document.schedule.tasks, shift),
    }
  } catch (error) {
    walkRefusalOf(error)
    return null
  }
}
