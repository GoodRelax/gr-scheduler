// EditDocument -- the Task and TaskVisual aggregate.
//
// @unit      UF-11   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// CM-6 to CM-25 of table T-108. The `Task` and `TaskVisual` groups share one
// aggregate because a `TaskVisual` row exists only for its `Task` (AT-97 is its
// key and foreign key at once; UT-2 of table T-063).
//
// Validates and returns a new Document; settles nothing (CP-9), and a refusal
// is a value, never a thrown error (AG-8).
//
// A command that changes nothing returns the SAME document:
// `document-change-plan.ts` moves FR-063's schedule instant by comparing the
// schedule reference.

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  COLUMN_SHAPES,
  calendarDaysBetween,
  compareDays,
  dateFromWorkingDays,
  dayOf,
  nextWorkingDay,
  planActualState,
  taskByUid,
  textOfDay,
  workingCalendarOf,
  workingDaysBetween,
  type Assignment,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskVisual,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'
// FR-032's default row name is the dictionary's (FR-038), read in
// `edit-task-group.ts`. HM-9 has one row-tree walk for CM-19 here and CM-35 /
// CM-73 there, so it is imported rather than written twice.
import { DEFAULT_ROW_NAME, tasksRankedByTheRowTree } from './edit-task-group'

/** The five shapes of table T-012 (AT-100). */
export type TaskShapeKind = NonNullable<TaskVisual['shapeKind']>

/** The figures table T-012's SH-5 names, in the area order S-48 fixes (AT-101). */
export type TaskMilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

/** The three weights of table T-017's CL-2 (AT-104). */
export type TaskLineWeight = NonNullable<TaskVisual['lineWeight']>

/** The three alignments FR-002 names (AT-99). */
export type TaskNameAlign = NonNullable<TaskVisual['nameAlign']>

/**
 * The five rows of table T-019, each carrying the values that row places.
 *
 * The row id is the discriminant because table T-019 holds the values GRS
 * places; reading a state back is table T-019a and `planActualState`, hence no
 * reuse of `PlanActualState`. PA-1's `resumeValid` cell is a dash, not empty,
 * so CM-13 leaves that column as it found it.
 */
export type PlanActualPlacement =
  | { readonly row: 'PA-1' }
  | { readonly row: 'PA-2'; readonly actualStart: string; readonly actualDuration: number }
  | {
      readonly row: 'PA-3'
      readonly actualStart: string
      readonly actualDuration: number
      readonly resume: string
    }
  | { readonly row: 'PA-4'; readonly actualStart: string; readonly actualDuration: number }
  | {
      readonly row: 'PA-5'
      readonly actualStart: string
      readonly actualDuration: number
      readonly actualFinish: string
    }

/**
 * Which faint dummy handle of table T-023d the hand grabbed (FR-043).
 *
 * The row id is the value because GR-9 and GR-17 write different columns, and
 * it cannot be derived from the rest of the command: both handles stand on one
 * drawn mark, split down its middle by table T-023d's closing rule, so only the
 * hit test knows which half was pressed. GR-18 is one place (table T-023d), so a
 * milestone takes the start handle's answer.
 */
export type ActualGrabHold = 'GR-9' | 'GR-17' | 'GR-18'

/** CM-6 to CM-25 of table T-108. */
export type TaskCommand =
  // ---------------------------------------------------------- `Task` (14) ----
  | {
      readonly kind: 'createTask'
      /** FR-001: the shape the palette is holding. `Task.milestone` follows it. */
      readonly shapeKind: TaskShapeKind
      readonly start: string
      readonly finish: string
      /**
       * The row the drag's vertical position points at (FR-001), and the id of
       * the row FR-001 creates when the document has none: AT-51 is a UUID and
       * minting one is not pure, so it arrives as a value like CM-3's date.
       */
      readonly groupId: string
    }
  | { readonly kind: 'deleteTask'; readonly uid: number }
  | { readonly kind: 'pasteTaskSubtree'; readonly sourceUid: number }
  | { readonly kind: 'setTaskName'; readonly uid: number; readonly name: string | null }
  | { readonly kind: 'setTaskNotes'; readonly uid: number; readonly notes: string | null }
  | {
      readonly kind: 'setTaskPlanDates'
      readonly uid: number
      readonly start: string
      readonly finish: string
    }
  | { readonly kind: 'setTaskDeadline'; readonly uid: number; readonly deadline: string | null }
  | {
      readonly kind: 'setTaskPlanActualState'
      readonly uid: number
      readonly place: PlanActualPlacement
    }
  | {
      readonly kind: 'beginTaskActual'
      readonly uid: number
      /**
       * Which handle the hand took (table T-023d). Carried, not guessed:
       * `input-command-translator.ts` reads it off the hit, and nothing later can
       * recover it.
       */
      readonly grabbed: ActualGrabHold
      /**
       * The day the hand let the handle go on (FR-043). Not moved to a working
       * day (table T-023d's closing rule), and not the day the dummy is drawn
       * on, which FR-043 keeps as a separate rule.
       */
      readonly droppedDay: string
    }
  | { readonly kind: 'cycleTaskPlanActualState'; readonly uid: number }
  | { readonly kind: 'setTaskFadeInDays'; readonly uid: number; readonly days: number | null }
  | { readonly kind: 'setTaskFadeOutDays'; readonly uid: number; readonly days: number | null }
  | { readonly kind: 'setTaskWbsParent'; readonly uid: number; readonly parentUid: number | null }
  | { readonly kind: 'moveTaskToTaskGroup'; readonly uid: number; readonly groupId: string }
  // ---------------------------------------------------- `TaskVisual` (6) ----
  | { readonly kind: 'setTaskVisualShapeKind'; readonly uid: number; readonly shapeKind: TaskShapeKind }
  | {
      readonly kind: 'setTaskVisualMilestoneGlyph'
      readonly uid: number
      readonly glyph: TaskMilestoneGlyph | null
    }
  | {
      readonly kind: 'setTaskVisualColors'
      readonly uid: number
      readonly fillColor: string | null
      readonly strokeColor: string | null
    }
  | { readonly kind: 'resetTaskVisualColors'; readonly uid: number }
  | {
      readonly kind: 'setTaskVisualLineWeight'
      readonly uid: number
      readonly lineWeight: TaskLineWeight | null
    }
  | {
      readonly kind: 'setTaskVisualNamePlacement'
      readonly uid: number
      /** AT-98: an integer 0 to 8, or null for FR-002's automatic placement. */
      readonly nameAnchor: number | null
      readonly nameAlign: TaskNameAlign | null
    }

/** P-19 of the glossary: the one colour spelling the specification fixes. */
const TRANSPARENT = 'transparent'

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

/** @purity pure */
function withSchedule(document: Document, schedule: Schedule): Document {
  return { ...document, schedule }
}

/**
 * Whether two rows of the same entity carry the same values, so a command that
 * changed nothing does not move the schedule instant (FR-063).
 *
 * List and map columns compare by reference, which is exact here: every arm
 * builds its next row by spreading the held one.
 *
 * @purity pure
 */
function sameRow<T extends object>(a: T, b: T): boolean {
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key])
}

/** @purity pure */
function withTask(document: Document, next: Task): Document {
  const held = document.schedule.tasks.find((one) => one.uid === next.uid)
  if (held !== undefined && sameRow(held, next)) return document
  const tasks = document.schedule.tasks.map((one) => (one.uid === next.uid ? next : one))
  return withSchedule(document, { ...document.schedule, tasks })
}

/** @purity pure */
function withVisual(document: Document, next: TaskVisual): Document {
  const held = document.schedule.taskVisuals
  const foundAt = held.findIndex((one) => one.taskUid === next.taskUid)
  // No row and an all-null row are the same task, so an absent row compares as
  // blank; otherwise a no-op would append a null row and move the instant.
  const standing = foundAt < 0 ? blankVisual(next.taskUid) : held[foundAt]
  if (standing !== undefined && sameRow(standing, next)) return document
  const taskVisuals = foundAt < 0 ? [...held, next] : held.map((one, index) => (index === foundAt ? next : one))
  return withSchedule(document, { ...document.schedule, taskVisuals })
}

/**
 * The row that stands for "nothing chosen": every ET-11 column but the key is
 * nullable, and AT-100 to AT-104 read `null` as not specified.
 *
 * @purity pure
 */
function blankVisual(taskUid: number): TaskVisual {
  return {
    taskUid,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }
}

/**
 * The `TaskVisual` of a task, built blank when the document holds none. That is
 * what lets CM-20 to CM-25 work on a task nobody has styled yet.
 *
 * @purity pure
 */
function visualOf(schedule: Schedule, taskUid: number): TaskVisual {
  return schedule.taskVisuals.find((one) => one.taskUid === taskUid) ?? blankVisual(taskUid)
}

/**
 * Whether a task is drawn as a milestone: a null `shapeKind` resolves from
 * `Task.milestone` (AT-100), and the two cannot disagree (FR-001, FR-083).
 *
 * @purity pure
 */
function isMilestone(task: Task, visual: TaskVisual): boolean {
  return visual.shapeKind === null ? task.milestone === true : visual.shapeKind === 'milestone'
}

/** Either the day a stored date names, or what is wrong with it. */
type DayCheck =
  | { readonly ok: true; readonly day: CalendarDay }
  | { readonly ok: false; readonly what: string }

/**
 * Whether a date about to be stored may be: it must name a day and sit inside
 * table T-214's accepted range (IV-14), whose S-119 / S-120 the document holds.
 *
 * @purity pure
 */
function checkDay(settings: DocumentSettings, text: string): DayCheck {
  const day = dayOf(text)
  if (day === null) return { ok: false, what: `is not a date: ${text}` }
  const min = dayOf(settings.importMinDate)
  const max = dayOf(settings.importMaxDate)
  if (min !== null && compareDays(day, min) < 0) {
    return { ok: false, what: `is before ${settings.importMinDate}: ${text}` }
  }
  if (max !== null && compareDays(day, max) > 0) {
    return { ok: false, what: `is after ${settings.importMaxDate}: ${text}` }
  }
  return { ok: true, day }
}

/**
 * The planned span in worked days (FR-012), half-open as `workingDaysBetween`
 * counts it, or null when either end is missing.
 *
 * @purity pure
 */
function planSpanOf(within: WorkingCalendar, task: Task): number | null {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (start === null || finish === null) return null
  return workingDaysBetween(within, start, finish)
}

/**
 * The planned span in CALENDAR days, the unit of a fade (FD-6 of table T-012a,
 * IV-12); counting worked days would refuse fades FR-016's handle allowed.
 * Half-open, so a one-day plan spans 0 and a fade of 0 stays expressible (FD-7).
 *
 * @purity pure
 */
function fadeSpanOf(task: Task): number | null {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (start === null || finish === null) return null
  return calendarDaysBetween(start, finish)
}

/**
 * FR-012's formula, kept in this one place (FR-012); every command that moves
 * one of its inputs calls here.
 *
 * No clamp to 0..100, and no division by a zero-length plan: 100 when
 * `actualFinish` is set, else 0, which covers same-day tasks too (UC-001 2a).
 * A task missing `start` or `finish` keeps what it holds (EX-5).
 *
 * @purity pure
 */
function percentCompleteOf(within: WorkingCalendar, task: Task): number | null {
  const span = planSpanOf(within, task)
  if (span === null) return task.percentComplete
  // A missing `actualDuration` counts as no work done: FR-090 reads a
  // not-started task's figure as 0.
  if (span === 0) return task.actualFinish !== null ? 100 : 0
  return Math.round(((task.actualDuration ?? 0) / span) * 100)
}

/**
 * A task with FR-012's stored figure brought back in step with its inputs.
 * Exported so `edit-calendar.ts` recounts by this same formula (FR-012).
 *
 * @purity pure
 */
export function repriced(within: WorkingCalendar, task: Task): Task {
  return { ...task, percentComplete: percentCompleteOf(within, task) }
}

/**
 * The exchange partner's element the note under table T-019 calls the last
 * column. Not a `Task` column: G-13 of table T-005 keeps it as an original value
 * in `Task.carry`, under MSPDI's spelling.
 */
const CARRIED_STOP = 'Stop'

/**
 * The task with its imported `Stop` dropped, because a person edited its actuals
 * (the note under table T-019).
 *
 * The exporter (`writtenStop` in `mspdi-codec.ts`) writes the carried value
 * while it exists and computes one otherwise. Only this unit knows a person
 * edited the task, and no column records it, so the fact is spent here.
 * Only the commands that edit actuals call this: dropping `Stop` for a plan
 * date, deadline, name or fade would change a file table T-033 requires back
 * unchanged.
 *
 * @purity pure
 */
function actualsEdited(task: Task): Task {
  if (task.carry[CARRIED_STOP] === undefined) return task
  return {
    ...task,
    carry: Object.fromEntries(
      Object.entries(task.carry).filter(([name]) => name !== CARRIED_STOP),
    ),
  }
}

/**
 * A task and its WBS descendants. IV-4 forbids a cycle in `wbsParentUid`, so
 * the sweep terminates; it is written as a sweep rather than a recursion
 * because the rows arrive in no particular parent-before-child order.
 *
 * @purity pure
 */
function wbsSubtreeOf(schedule: Schedule, root: number): ReadonlySet<number> {
  const held = new Set<number>([root])
  for (let grew = true; grew; ) {
    grew = false
    for (const task of schedule.tasks) {
      if (task.wbsParentUid !== null && held.has(task.wbsParentUid) && !held.has(task.uid)) {
        held.add(task.uid)
        grew = true
      }
    }
  }
  return held
}

/**
 * Runs one Task or TaskVisual command against the document.
 *
 * @purity pure
 */
export function editTask(document: Document, command: TaskCommand): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  // One calendar per document, counted through the one member (FR-054, design 5.4).
  const within = workingCalendarOf(schedule)

  // Every command but CM-6 and CM-7 names a task that must already exist (IV-2).
  const named =
    command.kind === 'createTask'
      ? null
      : taskByUid(schedule, command.kind === 'pasteTaskSubtree' ? command.sourceUid : command.uid)
  // CM-7 is exempt: IV-2 is a foreign-key invariant, and deleting a missing Task
  // writes no key. It has to be: FR-032's select-all delete plans one CM-7 per
  // task in ONE bundle, CD-1 of table T-050 lets an earlier one carry off whole
  // WBS subtrees, and refusing a later one would throw the bundle away (AG-3).
  const missingTargetIsRefused = command.kind !== 'createTask' && command.kind !== 'deleteTask'
  if (missingTargetIsRefused && named === null) {
    const uid = command.kind === 'pasteTaskSubtree' ? command.sourceUid : command.uid
    return refused([reject(TABLE_T108_ROWS[command.kind], 'IV-2', `no Task with uid ${uid}`)])
  }
  // Looked up once. The cast is sound for the guarded commands; `createTask`
  // reads nothing from it, and `deleteTask` reads `command.uid` instead.
  const task = named as Task

  switch (command.kind) {
    case 'createTask': { // CM-6 ⭐
      const start = checkDay(settings, command.start)
      const finish = checkDay(settings, command.finish)
      if (!start.ok || !finish.ok) {
        const faults: Refusal[] = []
        if (!start.ok) faults.push(reject('CM-6', 'IV-14', `start ${start.what}`))
        if (!finish.ok) faults.push(reject('CM-6', 'IV-14', `finish ${finish.what}`))
        return refused(faults)
      }
      // FR-012 refuses finish before start. Equal days are not an error (FR-001's
      // click makes such a task); a short drag is collapsed earlier, in pixels.
      if (compareDays(finish.day, start.day) < 0) {
        return refused([reject('CM-6', 'FR-012', 'finish is before start')])
      }

      // FR-001: the uid follows `uidHighWaterMark`, so a uid freed by undo is
      // never issued again.
      const uid = schedule.project.uidHighWaterMark + 1
      const created: Task = {
        uid,
        // FR-001: no WBS parent; the row and the WBS are different axes (HM-3).
        wbsParentUid: null,
        wbsOrder: null,
        // FR-091 gives the name its own entrance, taken right after this one.
        name: null,
        start: command.start,
        finish: command.finish,
        // FR-001: milestone true for SH-5 and false for every other shape (MUST).
        milestone: command.shapeKind === 'milestone',
        deadline: null,
        notes: null,
        calendarUid: null,
        actualStart: null,
        actualDuration: null,
        actualFinish: null,
        resume: null,
        resumeValid: null,
        percentComplete: null,
        // FR-075: 既定値は `null` とし、`0` と区別すること（MUST）.
        fadeInDays: null,
        fadeOutDays: null,
        dependencies: [],
        carry: {},
        carryElements: [],
      }
      const tasks = [...schedule.tasks, repriced(within, created)]

      // AT-100 resolves a null `shapeKind` from `Task.milestone`, which cannot
      // tell SH-1 from SH-2, so the shape the palette held is written down.
      const taskVisuals = [...schedule.taskVisuals, { ...visualOf(schedule, uid), shapeKind: command.shapeKind }]

      // FR-001: the task goes on the row the drag started on, or on a new row;
      // IV-6 wants exactly one member per task, so the member is made either way.
      const held = schedule.taskGroups.find((one) => one.id === command.groupId)
      let taskGroups = schedule.taskGroups
      if (held === undefined) {
        // Where FR-001's new row goes is not stated (AT-55 `order` is required;
        // FR-001, FR-085 and FR-058 are silent). Appended after the last top-level
        // row, which disturbs no existing order; a decision of this file.
        const order = schedule.taskGroups
          .filter((one) => one.parentId === null)
          .reduce((best, one) => Math.max(best, one.order), -1) + 1
        const made: TaskGroup = {
          id: command.groupId,
          parentId: null,
          // FR-001 / FR-058: the new row takes its name from this task (IV-8).
          label: null,
          derivedFromTaskUid: uid,
          order,
          isCollapsed: null,
          isHidden: null,
          color: null,
          height: null,
        }
        taskGroups = [...schedule.taskGroups, made]
      }
      // ST-6: the stack order is assigned automatically (AT-62 null).
      const taskGroupMembers = [
        ...schedule.taskGroupMembers,
        { taskUid: uid, groupId: command.groupId, stackOrder: null },
      ]
      return edited(
        withSchedule(document, {
          ...schedule,
          project: { ...schedule.project, uidHighWaterMark: uid },
          tasks,
          taskVisuals,
          taskGroups,
          taskGroupMembers,
        }),
      )
    }

    case 'deleteTask': { // CM-7
      // `named` may be null here (see the CM-7 exemption above); nothing below
      // reads it. CD-1 of table T-050 names what goes with a `Task`.
      const doomed = wbsSubtreeOf(schedule, command.uid)

      // FR-032: settle each row's name before its source Task goes; HM-6 keeps
      // the row itself.
      const taskGroups: TaskGroup[] = []
      for (const group of schedule.taskGroups) {
        if (group.derivedFromTaskUid === null || !doomed.has(group.derivedFromTaskUid)) {
          taskGroups.push(group)
          continue
        }
        // The name is `label`, else the source task's name (FR-058), else the
        // default name (FR-032). Refusing here instead would make every task
        // drawn on empty space undeletable. The row comes out with a real
        // `label` and a null `derivedFromTaskUid` (IV-8, AT-54).
        const source = taskByUid(schedule, group.derivedFromTaskUid)
        const settled = group.label ?? source?.name ?? DEFAULT_ROW_NAME
        taskGroups.push({ ...group, label: settled, derivedFromTaskUid: null })
      }

      const tasks = schedule.tasks
        .filter((one) => !doomed.has(one.uid))
        // A dependency lives on the successor, so the ones pointing INTO the
        // deleted subtree have to be cut from the tasks that survive.
        .map((one) =>
          one.dependencies.some((link) => doomed.has(link.predecessorUid))
            ? { ...one, dependencies: one.dependencies.filter((link) => !doomed.has(link.predecessorUid)) }
            : one,
        )
      return edited(
        withSchedule(document, {
          ...schedule,
          tasks,
          taskVisuals: schedule.taskVisuals.filter((one) => !doomed.has(one.taskUid)),
          taskOrigins: schedule.taskOrigins.filter((one) => !doomed.has(one.taskUid)),
          taskGroupMembers: schedule.taskGroupMembers.filter((one) => !doomed.has(one.taskUid)),
          // CD-5 is the other direction: a `Resource` outlives its assignments.
          // Nothing here touches `resources`.
          assignments: schedule.assignments.filter(
            (one) => one.taskUid === null || !doomed.has(one.taskUid),
          ),
          taskGroups,
        }),
      )
    }

    case 'pasteTaskSubtree': { // CM-8 ⭐
      // DU-1 of table T-223 names what is copied; `TaskOrigin` is not, since a
      // copy did not come from the exchange partner.
      //
      // STOP -- FR-033's refusal at ST-7's stack cap (S-89) is not checked: ST-1
      // counts overlap by drawn width (table T-038), which puts the number in
      // the layout, and neither this signature nor the specification says who
      // passes it in.
      const subtree = wbsSubtreeOf(schedule, command.sourceUid)

      // AT-20: copies take uids under the water mark in document order, so the
      // numbering depends on the document, not on how the subtree was collected.
      let mark = schedule.project.uidHighWaterMark
      const remap = new Map<number, number>()
      for (const one of schedule.tasks) if (subtree.has(one.uid)) remap.set(one.uid, ++mark)

      const copies = schedule.tasks
        .filter((one) => subtree.has(one.uid))
        .map((one) => ({
          ...one,
          uid: remap.get(one.uid) as number,
          // STOP -- FR-033 fixes a copied task's ROW but names no WBS attachment
          // for a Task paste (its "child of the selected row" is DU-2's TaskGroup
          // paste). The root stays beside its original as a WBS sibling and inner
          // links are remapped; a decision of this file.
          wbsParentUid:
            one.uid === command.sourceUid
              ? one.wbsParentUid
              : (remap.get(one.wbsParentUid as number) as number),
          // FR-033: only dependencies closed inside the subtree are copied.
          dependencies: one.dependencies
            .filter((link) => subtree.has(link.predecessorUid))
            .map((link) => ({ ...link, predecessorUid: remap.get(link.predecessorUid) as number })),
        }))

      const visualCopies = schedule.taskVisuals
        .filter((one) => subtree.has(one.taskUid))
        .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
      const memberCopies = schedule.taskGroupMembers
        .filter((one) => subtree.has(one.taskUid))
        .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
      // FR-008: new assignment uids under the same water mark; its duplicate-pair
      // ban cannot bite, since every copy points at a new task.
      const assignmentCopies: Assignment[] = schedule.assignments
        .filter((one) => one.taskUid !== null && subtree.has(one.taskUid))
        .map((one) => ({ ...one, uid: ++mark, taskUid: remap.get(one.taskUid as number) as number }))

      return edited(
        withSchedule(document, {
          ...schedule,
          project: { ...schedule.project, uidHighWaterMark: mark },
          tasks: [...schedule.tasks, ...copies],
          taskVisuals: [...schedule.taskVisuals, ...visualCopies],
          taskGroupMembers: [...schedule.taskGroupMembers, ...memberCopies],
          assignments: [...schedule.assignments, ...assignmentCopies],
        }),
      )
    }

    case 'setTaskName': // CM-9
      // FR-091. AT-27 is nullable; FR-035's empty-string ban is the title's (CM-1).
      return edited(withTask(document, { ...task, name: command.name }))

    case 'setTaskNotes': // CM-10
      // PR-2 of table T-016, editable because the row carries no 読み取り専用.
      return edited(withTask(document, { ...task, notes: command.notes }))

    case 'setTaskPlanDates': { // CM-11 ⭐
      // One command for both dates because FR-012's ordering rule spans them.
      const start = checkDay(settings, command.start)
      const finish = checkDay(settings, command.finish)
      if (!start.ok || !finish.ok) {
        const faults: Refusal[] = []
        if (!start.ok) faults.push(reject('CM-11', 'IV-14', `start ${start.what}`))
        if (!finish.ok) faults.push(reject('CM-11', 'IV-14', `finish ${finish.what}`))
        return refused(faults)
      }
      // FR-012 and IV-10: refused, never rounded to `finish` = `start`.
      if (compareDays(finish.day, start.day) < 0) {
        return refused([reject('CM-11', 'FR-012', 'finish is before start')])
      }
      // IV-12: shortening the plan can break the fade sum, so it is measured
      // against the span about to be written.
      const fade = (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0)
      // Calendar days (FD-6 of table T-012a, IV-12); see `fadeSpanOf`.
      const span = calendarDaysBetween(start.day, finish.day)
      if (fade > span) {
        return refused([
          reject('CM-11', 'IV-12', `fade of ${fade} days does not fit a plan of ${span}`),
        ])
      }
      const moved = { ...task, start: command.start, finish: command.finish }
      // FR-012: the denominator moved. No completion figure is carried (PR-9).
      return edited(withTask(document, repriced(within, moved)))
    }

    case 'setTaskDeadline': { // CM-12
      // PR-10 of table T-016; FR-045 keeps it apart from lateness, so nothing else moves.
      if (command.deadline !== null) {
        const checked = checkDay(settings, command.deadline)
        if (!checked.ok) return refused([reject('CM-12', 'IV-14', `deadline ${checked.what}`)])
      }
      return edited(withTask(document, { ...task, deadline: command.deadline }))
    }

    case 'setTaskPlanActualState': { // CM-13 ⭐
      // One command for five columns because table T-019 states them as a row.
      // It places values and must never filter what a document may hold (table
      // T-019): an exchange partner leaves shapes that match no row.
      const place = command.place
      const faults: Refusal[] = []
      const dates: readonly (readonly [string, string])[] =
        place.row === 'PA-1'
          ? []
          : place.row === 'PA-3'
            ? [['actualStart', place.actualStart], ['resume', place.resume]]
            : place.row === 'PA-5'
              ? [['actualStart', place.actualStart], ['actualFinish', place.actualFinish]]
              : [['actualStart', place.actualStart]]
      for (const [label, text] of dates) {
        const checked = checkDay(settings, text)
        if (!checked.ok) faults.push(reject('CM-13', 'IV-14', `${label} ${checked.what}`))
      }
      // The one gate on a backwards actual: only this command takes
      // `actualDuration` from outside (CM-14 writes S-129 / S-130, and CM-15's
      // PV-1 a span CM-11 keeps non-negative), so it covers GR-5, GR-6, the Agent
      // API and the property panel.
      // Refused because AT-39 types `percentComplete` as 0 or more and FR-012's
      // formula would make it negative; FR-012 forbids clamping and table T-023d
      // forbids moving the drop day. A refusal leaves no undo step (FR-031).
      //
      // STOP -- what the actual pair should do when one end crosses the other is
      // not stated: table T-220 has no invariant over `actualStart` and
      // `actualDuration` as IV-10 has for the plan, and GR-5 / GR-6 of table
      // T-023d name only the columns they move.
      const laid = place.row === 'PA-1' ? null : place.actualDuration
      if (laid !== null && laid < 0) {
        faults.push(
          reject('CM-13', 'AT-39', `an actual of ${laid} worked days ends before it starts`),
        )
      }
      if (faults.length > 0) return refused(faults)

      // FR-011: a started actual is floored at S-129, in worked days so the dummy
      // and the smallest actual match at every zoom; a milestone at S-130, read
      // as FR-043 reads it (PV-1 of table T-021a). Not S-49, the plan's floor
      // (FR-011, FR-094). PA-1 keeps its null.
      const floorOfActual = isMilestone(task, visualOf(schedule, task.uid))
        ? settings.milestoneActualDuration
        : settings.actualInitialDuration
      const heldDuration = laid === null ? null : Math.max(laid, floorOfActual)

      let placed: Task
      switch (place.row) {
        case 'PA-1': // 未着手 -- four columns 空.
          // `resumeValid` is left alone: the cell is a dash, not empty.
          placed = { ...task, actualStart: null, actualDuration: null, actualFinish: null, resume: null }
          break
        case 'PA-2': // 進行中
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: null,
            resume: null,
            resumeValid: true,
          }
          break
        case 'PA-3': // 中断・再開予定あり
          // FR-044: a resume date sets `resumeValid` true, or PS-3 catches the task first.
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: null,
            resume: place.resume,
            resumeValid: true,
          }
          break
        case 'PA-4': // 中断・再開日未定 -- 「中止」と同じもの (MUST NOT invent a concept for it).
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: null,
            resume: null,
            resumeValid: false,
          }
          break
        case 'PA-5': // 完了
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: place.actualFinish,
            resume: null,
            resumeValid: false,
          }
          break
      }
      // The carried `Stop` is dropped: this is an edit of the actuals (`actualsEdited`).
      return edited(withTask(document, repriced(within, actualsEdited(placed))))
    }

    case 'beginTaskActual': { // CM-14 ⭐
      // FR-043: only while the task is not started.
      if (planActualState(task) !== 'notStarted') {
        return refused([reject('CM-14', 'FR-043', 'the task has already been started')])
      }
      // FR-043: whichever handle, the same three columns (`actualStart`,
      // `actualDuration`, `resumeValid`) with different values; `command.grabbed`
      // says which end the dropped day lands on.
      const visual = visualOf(schedule, task.uid)
      const isDrawnAsMilestone = isMilestone(task, visual)
      // S-129, or S-130 for a milestone, which has no actual bar.
      const duration = isDrawnAsMilestone
        ? settings.milestoneActualDuration
        : settings.actualInitialDuration
      // The dropped day, not derived from the plan (FR-043), not moved to a
      // working day (table T-023d), and bounded by IV-14 like every stored date.
      const dropped = checkDay(settings, command.droppedDay)
      if (!dropped.ok) {
        return refused([reject('CM-14', 'IV-14', `droppedDay ${dropped.what}`)])
      }
      // The shape does not change the day (FR-043); only the span differs (S-130).
      //
      // GR-17, the finish handle, pins the start at GR-9's day (table T-023d,
      // FR-043). A start can still be placed by grabbing: the mark is split down
      // its middle and its left half answers GR-9. Which pixel answers which row
      // is `item-hit-area.ts`'s to decide.
      if (command.grabbed === 'GR-17') {
        // GR-9's day, read as the drawing side reads it (FR-043, FR-054).
        // `nextWorkingDay`, not `dateFromWorkingDays(planStart, 1)`: the latter is
        // a half-open end bound and lands a Friday start on the Saturday.
        // `schedule-layout.ts` uses the same member, so mark and day cannot drift.
        const planStart = dayOf(task.start)
        if (planStart === null) {
          return refused([
            reject('CM-14', 'FR-043', 'the task names no plan start for the finish handle to fix its start by'),
          ])
        }
        const pinned = nextWorkingDay(within, planStart)
        // The length is what the drag said, counted from the pinned start to the
        // dropped day without moving either end (table T-023d); a drag of nothing
        // gives S-129. Not clamped (FR-043).
        const pulled: Task = {
          ...task,
          actualStart: textOfDay(pinned),
          actualDuration: workingDaysBetween(within, pinned, dropped.day),
          resumeValid: true,
        }
        // ⭐ The carried `Stop` is let go of here too -- see CM-13.
        return edited(withTask(document, repriced(within, actualsEdited(pulled))))
      }
      // GR-9 and GR-18: the dropped day is the actual start and the finish takes
      // the default length (`duration`). GR-18 comes here because its row is one
      // place (table T-023d). `tests/system/open-defect-pins.test.ts` drops the
      // hold at two distances and requires two different days.
      const begun: Task = {
        ...task,
        actualStart: textOfDay(dropped.day),
        actualDuration: duration,
        resumeValid: true,
      }
      // The carried `Stop` is dropped: starting a task writes its actuals.
      return edited(withTask(document, repriced(within, actualsEdited(begun))))
    }

    case 'cycleTaskPlanActualState': { // CM-15 ⭐
      // Table T-021a: the state read by table T-019a picks the row that runs.
      const state = planActualState(task)
      let turned: Task
      switch (state) {
        case 'notStarted': { // PV-1: 未着手 → 完了
          // PV-1 of table T-021a: `actualStart` = `start` and `actualDuration` =
          // S-129 (S-130 for a milestone), chosen exactly as CM-14 chooses it.
          const from = dayOf(task.start)
          if (from === null) {
            return refused([reject('CM-15', 'FR-012', 'the task does not name both plan dates')])
          }
          const visual = visualOf(schedule, task.uid)
          const duration = isMilestone(task, visual)
            ? settings.milestoneActualDuration
            : settings.actualInitialDuration
          // `actualFinish` is read exactly as PV-2 reads it (table T-021a).
          turned = {
            ...task,
            actualStart: task.start,
            actualFinish: textOfDay(dateFromWorkingDays(within, from, duration)),
            actualDuration: duration,
            resumeValid: false,
          }
          break
        }
        case 'inProgress': { // PV-2: 進行中 → 完了
          // PV-2: RV-1 of table T-069 gives the right end.
          const from = dayOf(task.actualStart)
          if (from === null || task.actualDuration === null) {
            return refused([reject('CM-15', 'FR-011', 'the actual bar has no right end to read')])
          }
          // A day GRS decided itself, so it is written in the exchange partner's
          // own type at midnight (EX-7) rather than copied from anywhere.
          turned = {
            ...task,
            actualFinish: textOfDay(dateFromWorkingDays(within, from, task.actualDuration)),
            resumeValid: false,
          }
          break
        }
        case 'finished': // PV-3: 完了 → 中断（再開日未定）
          // PV-3: `resume` is cleared because an imported finished task can hold a
          // past resume date, which would land on PS-4.
          turned = { ...task, actualFinish: null, resume: null, resumeValid: false }
          break
        case 'suspendedResumeUnknown':
        case 'suspendedResumePlanned': // PV-4: 中断 → 進行中
          // PV-4: back to in progress, never to PA-1, which would erase the
          // actuals (erasing is undo's, FR-031, and PR-4 .. PR-8's).
          turned = { ...task, resume: null, resumeValid: true }
          break
      }
      // The carried `Stop` is dropped: every row of table T-021a writes an actual.
      return edited(withTask(document, repriced(within, actualsEdited(turned))))
    }

    case 'setTaskFadeInDays': // CM-16
    case 'setTaskFadeOutDays': { // CM-17
      const row = command.kind === 'setTaskFadeInDays' ? 'CM-16' : 'CM-17'
      const days = command.days
      if (days !== null) {
        // FD-7 of table T-012a: refused, never rounded; IV-11 and IV-12 hold two
        // of its conditions on every path.
        if (!Number.isInteger(days) || days < 0) {
          return refused([reject(row, 'FD-7', `fade days must be a whole number of days, not ${days}`)])
        }
        if (task.finish === null) {
          return refused([reject(row, 'IV-11', 'a task with a fade must have a finish')])
        }
        // ⛔ `fadeSpanOf`, not `planSpanOf`: FD-6 counts this one in calendar days.
        const span = fadeSpanOf(task)
        const other = command.kind === 'setTaskFadeInDays' ? task.fadeOutDays : task.fadeInDays
        // Without `start` the span is unknown, so IV-12 is not judged on a guess.
        if (span !== null && days + (other ?? 0) > span) {
          return refused([
            reject(row, 'IV-12', `fade of ${days + (other ?? 0)} days does not fit a plan of ${span}`),
          ])
        }
      }
      // FR-075: `null` (absent from the file) is distinct from `0`, and the
      // export writes the extended attribute for one and not the other.
      const faded =
        command.kind === 'setTaskFadeInDays'
          ? { ...task, fadeInDays: days }
          : { ...task, fadeOutDays: days }
      return edited(withTask(document, faded))
    }

    case 'setTaskWbsParent': { // CM-18
      // HM-1 of table T-015a; HM-2 keeps the uid, so only `wbsParentUid` changes.
      // No depth cap: S-125 bounds `TaskGroup` depth, not WBS depth (FR-004).
      if (command.parentUid !== null) {
        if (taskByUid(schedule, command.parentUid) === null) {
          return refused([reject('CM-18', 'IV-2', `no Task with uid ${command.parentUid}`)])
        }
        // HM-4 / IV-4: a descendant may not become the parent; the subtree
        // includes its root, so one test covers the self case.
        if (wbsSubtreeOf(schedule, command.uid).has(command.parentUid)) {
          return refused([
            reject('CM-18', 'HM-4', `uid ${command.parentUid} is inside the subtree of ${command.uid}`),
          ])
        }
      }
      return edited(withTask(document, { ...task, wbsParentUid: command.parentUid }))
    }

    case 'moveTaskToTaskGroup': { // CM-19
      // HM-3: moving a bar to another row never changes its WBS parent (AT-25);
      // the order among siblings follows the row tree (HM-9), and WBS children
      // keep their own rows (HM-10). So one membership is rewritten and
      // `wbsOrder` (AT-26) is rebuilt below.
      if (!schedule.taskGroups.some((one) => one.id === command.groupId)) {
        return refused([reject('CM-19', 'IV-2', `no TaskGroup with id ${command.groupId}`)])
      }
      const member = schedule.taskGroupMembers.find((one) => one.taskUid === command.uid)
      if (member === undefined) {
        // IV-6: どの `Task` も、ちょうど 1 つの `TaskGroupMember` から指されること.
        return refused([reject('CM-19', 'IV-6', `uid ${command.uid} is on no row`)])
      }
      if (member.groupId === command.groupId) return edited(document)
      const taskGroupMembers = schedule.taskGroupMembers.map((one) =>
        one.taskUid === command.uid ? { ...one, groupId: command.groupId } : one,
      )
      // HM-9: the moved bar's rank among its WBS siblings follows its new row's
      // place in the row tree, by the walk CM-35 and CM-73 also take; it is not
      // told apart from the bars already there.
      const moved: Schedule = { ...schedule, taskGroupMembers }
      return edited(withSchedule(document, { ...moved, tasks: tasksRankedByTheRowTree(moved) }))
    }

    case 'setTaskVisualShapeKind': { // CM-20
      const visual = visualOf(schedule, command.uid)
      // FR-083: no change between SH-1 .. SH-4 and SH-5, because a point and a
      // span hold different data.
      const wanted = command.shapeKind === 'milestone'
      if (isMilestone(task, visual) !== wanted) {
        return refused([
          reject('CM-20', 'FR-083', 'a milestone and a task with a duration are not interchangeable'),
        ])
      }
      // `Task.milestone` is not written (AT-100, FR-001).
      return edited(withVisual(document, { ...visual, shapeKind: command.shapeKind }))
    }

    case 'setTaskVisualMilestoneGlyph': { // CM-21
      // FR-078: one of the figures table T-012's SH-5 names (AT-101).
      //
      // Judged here, not left to `TaskMilestoneGlyph`: a type is gone at run
      // time, and the Agent API (AM-7 of table T-107) must pass the same
      // validation as the pointer's road (AG-5 of table T-108). The choices come
      // from the generated `COLUMN_SHAPES`, never a list written here (table T-016).
      // `null` clears the column, and a task that is not a milestone may hold a
      // value: AT-101 only limits when it is read.
      if (
        command.glyph !== null
        && !(COLUMN_SHAPES.TaskVisual.milestoneGlyph?.choices ?? []).includes(command.glyph)
      ) {
        return refused([
          reject('CM-21', 'FR-078', 'the figure is not one of those table T-012 SH-5 names'),
        ])
      }
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, milestoneGlyph: command.glyph }))
    }

    case 'setTaskVisualColors': { // CM-22 ⭐
      // One command for both colours because IV-9 spans them.
      if (command.fillColor === TRANSPARENT && command.strokeColor === TRANSPARENT) {
        return refused([reject('CM-22', 'IV-9', 'the fill and the stroke may not both be transparent')])
      }
      // STOP -- FR-007's palette membership (CL-1 of table T-017) cannot be
      // tested: only transparent has a spelling (P-19), and AT-102 / AT-103 are
      // plain strings.
      const visual = visualOf(schedule, command.uid)
      return edited(
        withVisual(document, {
          ...visual,
          fillColor: command.fillColor,
          strokeColor: command.strokeColor,
        }),
      )
    }

    case 'resetTaskVisualColors': { // CM-23 ⭐
      // FR-007: both colours back to theme-following (`null`, AT-102 / AT-103).
      // Transparent cannot serve: it is a chosen value, not "not specified".
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, fillColor: null, strokeColor: null }))
    }

    case 'setTaskVisualLineWeight': { // CM-24
      // FR-007, CL-2 of table T-017 (AT-104); `TaskLineWeight` carries membership.
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, lineWeight: command.lineWeight }))
    }

    case 'setTaskVisualNamePlacement': { // CM-25 ⭐
      // One command because FR-002 states anchor and alignment as one choice; not
      // pixels (FR-002), hence AT-98 is an index. Automatic placement is the null
      // column, not a fourth alignment. Only the range is checked: every index
      // 0 to 8 is a legal place (AT-98), and table T-013 is the automatic case.
      if (
        command.nameAnchor !== null &&
        (!Number.isInteger(command.nameAnchor) || command.nameAnchor < 0 || command.nameAnchor > 8)
      ) {
        return refused([
          reject('CM-25', 'AT-98', `the name anchor is an integer 0 to 8, not ${command.nameAnchor}`),
        ])
      }
      const visual = visualOf(schedule, command.uid)
      return edited(
        withVisual(document, {
          ...visual,
          nameAnchor: command.nameAnchor,
          nameAlign: command.nameAlign,
        }),
      )
    }
  }
}

/**
 * The row of table T-108 each `kind` came from, for the one refusal raised
 * before the switch is reached. The map is exhaustive by its type, so a command
 * added to the union above without a row here does not compile.
 */
const TABLE_T108_ROWS: Readonly<Record<TaskCommand['kind'], string>> = {
  createTask: 'CM-6',
  deleteTask: 'CM-7',
  pasteTaskSubtree: 'CM-8',
  setTaskName: 'CM-9',
  setTaskNotes: 'CM-10',
  setTaskPlanDates: 'CM-11',
  setTaskDeadline: 'CM-12',
  setTaskPlanActualState: 'CM-13',
  beginTaskActual: 'CM-14',
  cycleTaskPlanActualState: 'CM-15',
  setTaskFadeInDays: 'CM-16',
  setTaskFadeOutDays: 'CM-17',
  setTaskWbsParent: 'CM-18',
  moveTaskToTaskGroup: 'CM-19',
  setTaskVisualShapeKind: 'CM-20',
  setTaskVisualMilestoneGlyph: 'CM-21',
  setTaskVisualColors: 'CM-22',
  resetTaskVisualColors: 'CM-23',
  setTaskVisualLineWeight: 'CM-24',
  setTaskVisualNamePlacement: 'CM-25',
}
