// EditDocument -- the Task and TaskVisual aggregate.
//
// @unit      UF-11   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The twenty commands table T-108 puts in the `Task` group (CM-6 to CM-19) and
// in the `TaskVisual` group (CM-20 to CM-25). Table T-063's UT-2 splits the
// aggregates apart by the reason they change, and these two groups change for
// one reason: a `TaskVisual` row exists only for a `Task` and is keyed by it
// (AT-97 is its primary key and its foreign key at once).
//
// ⚠️ This file VALIDATES and returns a new Document. It settles nothing (CP-9),
// and a refusal is a VALUE, never a thrown error (AG-8).
//
// ⚠️ Every command here reaches schedule-group data, so every one that really
// changes something rebuilds `document.schedule` -- and every one that changes
// nothing returns the SAME document. document-change-plan.ts decides whether
// FR-063 moves the schedule instant by comparing the schedule reference, so a
// rebuild on a no-op would move that instant with nothing behind it.
//
// ⚠️ It is not the public entry of its component (Chapter 5.3, MUST NOT).

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  compareDays,
  dateFromWorkingDays,
  dayOf,
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

/** The five shapes of table T-012 (AT-100). */
export type TaskShapeKind = NonNullable<TaskVisual['shapeKind']>

/** The eight figures table T-012's SH-5 names, in the area order S-48 fixes (AT-101, CR-172). */
export type TaskMilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

/** The three weights of table T-017's CL-2 (AT-104, CR-172). */
export type TaskLineWeight = NonNullable<TaskVisual['lineWeight']>

/** The three alignments FR-002 names (AT-99, CR-172). */
export type TaskNameAlign = NonNullable<TaskVisual['nameAlign']>

/**
 * The five rows of table T-019, each carrying the values that row calls あり.
 *
 * ⭐ The row id IS the discriminant, because table T-019 is "`GRS` がその状態に
 * するときに置く値" -- the command names a row and the row names the columns.
 * Reading the state back is a different table (T-019a) and a different member
 * (`planActualState`), which is why this type does not reuse `PlanActualState`.
 *
 * ⚠️ `PA-1` carries nothing: its four columns are 空 and its `resumeValid` cell
 * is `—`, which is not the same as 空 -- the table puts NO value there, so
 * CM-13 leaves that column as it found it.
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
       * The row the drag's vertical position points at (FR-001). When the
       * document holds no row with this id, FR-001 requires one to be created,
       * and this is its identifier -- AT-51 is a UUID and minting one is not a
       * pure act, so it arrives as a value the way CM-3's date does.
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
  | { readonly kind: 'beginTaskActual'; readonly uid: number }
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
 * Whether two rows of the same entity carry the same values.
 *
 * ⚠️ This is what keeps a command that changed nothing from moving the
 * schedule instant. document-change-plan.ts reads `schedule !== schedule` to
 * apply FR-063, so rebuilding the group for a value that did not move would
 * move that instant with nothing behind it. Columns that hold a list or a map are
 * compared by reference, which is exact here: every arm below builds its next
 * row by spreading the held one, so those columns keep the same object unless
 * the arm replaced them on purpose.
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
  const at = held.findIndex((one) => one.taskUid === next.taskUid)
  // A task with no row and a task with an all-null row are the same task, so
  // the absent row is compared as the blank one -- otherwise a command that
  // chose nothing would append a row full of nulls and move the schedule instant.
  const standing = at < 0 ? blankVisual(next.taskUid) : held[at]
  if (standing !== undefined && sameRow(standing, next)) return document
  const taskVisuals = at < 0 ? [...held, next] : held.map((one, index) => (index === at ? next : one))
  return withSchedule(document, { ...document.schedule, taskVisuals })
}

/**
 * The row that stands for "nothing chosen".
 *
 * Every column of ET-11 but the key is nullable, and AT-100 through AT-104 read
 * `null` as "not specified" -- so a task with no row and a task with an all-null
 * row are drawn alike.
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
 * Whether a task is drawn as a milestone.
 *
 * AT-100 states the resolution in as many words: `null` = `Task.milestone` から
 * 解く. The two can never disagree -- FR-001 sets `milestone` from the shape it
 * creates with and forbids an entrance that flips the boolean alone, and FR-083
 * forbids crossing between SH-1..SH-4 and SH-5.
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
 * Whether a date this aggregate is about to store may be stored.
 *
 * Two things are checked. The text has to name a day at all, and IV-14 requires
 * every date column of the document to sit inside the range table T-214 accepts
 * -- S-119 and S-120 are held in the presentation group, so a pure function can
 * read them from the document it was handed.
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
 * The planned span in worked days, or null when the task does not name both
 * ends. FR-012 fixes the unit -- 稼働日 -- and forbids counting the days
 * inclusively, "含めると期間 0 が存在しなくなり、この規定が空振りする".
 * `workingDaysBetween` counts the half-open span, which is that same count.
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
 * FR-012's formula, and the only copy of it.
 *
 * ⭐ The requirement asks for exactly this: "この式を 1 か所に閉じ込め、呼ぶ側が
 * 式の中身に依存しない形にすること" (MUST), because whether an exchange partner
 * reads the exported figure the same way is untested (LM-7) and the formula may
 * yet be changed. Every command below that moves one of its inputs calls here
 * rather than doing arithmetic of its own.
 *
 * ⚠️ No clamp to 0..100 (MUST NOT): 予定 100 日のタスクを 80 日で終えれば 80、
 * 120 日かかれば 120. Whether a task is finished is `actualFinish`, not 100.
 *
 * ⚠️ A zero-length plan is not divided by (MUST NOT). 100 when `actualFinish`
 * is there, 0 when it is not -- and that covers more than milestones, since
 * UC-001 拡張 2a makes tasks whose start and finish are the same day.
 *
 * ⚠️ A task missing `start` or `finish` keeps whatever it holds. FR-012 forbids
 * showing such a task at all, but EX-5's 中身のない行 is excepted from that
 * (MUST) and none of the three computations run for it.
 *
 * @purity pure
 */
function percentCompleteOf(within: WorkingCalendar, task: Task): number | null {
  const span = planSpanOf(within, task)
  if (span === null) return task.percentComplete
  // FR-090 settles the not-started case from the other side: it forbids drawing
  // the label there because 完了率は 0 -- so the missing `actualDuration` counts
  // as no work done, not as no answer.
  if (span === 0) return task.actualFinish !== null ? 100 : 0
  return Math.round(((task.actualDuration ?? 0) / span) * 100)
}

/** A task with FR-012's stored figure brought back in step with its inputs. @purity pure */
function repriced(within: WorkingCalendar, task: Task): Task {
  return { ...task, percentComplete: percentCompleteOf(within, task) }
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
  // FR-054 keeps ONE calendar per document and design 5.4 requires everyone who
  // counts worked days to call the same member: "数え方を 3 か所に書いてはなら
  // ない（MUST NOT）", naming this aggregate as one of the three callers.
  const within = workingCalendarOf(schedule)

  // Nineteen of the twenty commands name a task that has to be there already;
  // CM-6 is the one that makes one. IV-2 is the row refused, because every one
  // of those nineteen would otherwise write a key pointing at nothing.
  const named =
    command.kind === 'createTask'
      ? null
      : taskByUid(schedule, command.kind === 'pasteTaskSubtree' ? command.sourceUid : command.uid)
  if (command.kind !== 'createTask' && named === null) {
    const uid = command.kind === 'pasteTaskSubtree' ? command.sourceUid : command.uid
    return refused([reject(TABLE_T108_ROWS[command.kind], 'IV-2', `no Task with uid ${uid}`)])
  }
  // Looked up once so the arms below do not each repeat the guard. The cast is
  // sound because the branch above returned for every kind but `createTask`,
  // and that arm reads nothing from here.
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
      // FR-012: `finish` が `start` より前の入力を受け付けてはならない（MUST
      // NOT）, and 丸めて `finish` = `start` にしてはならない（MUST NOT）.
      // ⚠️ The equal-day case is NOT an error: FR-001 requires a click, and a
      // drag shorter than a day, to make a task whose two dates are the same.
      // Collapsing a short drag happens before this, where pixels are still
      // pixels -- this aggregate only ever sees days.
      if (compareDays(finish.day, start.day) < 0) {
        return refused([reject('CM-6', 'FR-012', 'finish is before start')])
      }

      // FR-001: 新しい `Task` の `UID` は `Project.uidHighWaterMark` に従って採る
      // こと（MUST）。実在する `UID` の最大値から採ってはならない（MUST NOT）
      // -- taking the live maximum would re-issue a uid that undo had freed.
      const uid = schedule.project.uidHighWaterMark + 1
      const created: Task = {
        uid,
        // FR-001: 作ったタスクに WBS の親を与えないこと（MUST）. The row and the
        // WBS are different axes (HM-3), and CM-18 is the entrance to the other.
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

      // FR-001: 作ったタスクは、ドラッグを始めた縦位置が指す `TaskGroup` に載せる
      // こと（MUST）。指す `TaskGroup` が無いときは行を 1 つ作ってそこへ載せる
      // こと（MUST）. IV-6 wants exactly one member per task, so the member is
      // made here whichever branch runs.
      const held = schedule.taskGroups.find((one) => one.id === command.groupId)
      let taskGroups = schedule.taskGroups
      if (held === undefined) {
        // ⛔ MISSING: nothing decides where the row FR-001 creates goes. AT-55
        // `order` is not nullable and AT-52 `parentId` is, so a value has to be
        // put in both, and FR-001, FR-085 and FR-058 all stay silent. Appended
        // after the last top-level row, which is the placement that disturbs no
        // existing row's order. This line is a decision of this file.
        const order = schedule.taskGroups
          .filter((one) => one.parentId === null)
          .reduce((best, one) => Math.max(best, one.order), -1) + 1
        const made: TaskGroup = {
          id: command.groupId,
          parentId: null,
          // FR-001: その場で作った行は名前の指定を持たないので、載せたタスクを
          // その行の名前の導出元とすること（MUST）. IV-8 forbids leaving both
          // `label` and `derivedFromTaskUid` empty, and FR-058 says the same.
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
      // ST-6: 積み順は自動割当のみとし、人が段を手で指定する手段を設けない
      // （MUST NOT）-- AT-62's null is that automatic assignment.
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
      // CD-1 of table T-050 names what goes with a `Task`: その `Task` の WBS の
      // 子孫、`TaskVisual`、`TaskOrigin`、`TaskGroupMember`、その `Task` を端点と
      // する依存、その `Task` を指す割当.
      const doomed = wbsSubtreeOf(schedule, command.uid)

      // FR-032: `Task` を消す前に、その `Task` を名前の導出元にしている行の名前を
      // 確定させ、`derivedFromTaskUid` を空にすること（MUST）。名前も導出元も無い
      // 行を残してはならない（MUST NOT）. The row itself survives -- HM-6 keeps
      // its name, colour, height and collapse.
      const taskGroups: TaskGroup[] = []
      for (const group of schedule.taskGroups) {
        if (group.derivedFromTaskUid === null || !doomed.has(group.derivedFromTaskUid)) {
          taskGroups.push(group)
          continue
        }
        // FR-058: 器の名前を指定しなかった行は、その行の導出元となったタスクの
        // 名前を表示すること（MUST）-- so the name to settle is `label` when the
        // row has one and the source task's name when it does not.
        const source = taskByUid(schedule, group.derivedFromTaskUid)
        const settled = group.label ?? source?.name ?? null
        if (settled === null) {
          // ⛔ MISSING: the specification does not say what the settled name is
          // when the derivation source has no name of its own. Refusing rather
          // than choosing one, because writing the row's `label` back as null
          // leaves exactly the row IV-8 and FR-032 forbid.
          return refused([
            reject('CM-7', 'IV-8', `row ${group.id} derives its name from uid ${group.derivedFromTaskUid}, which has none`),
          ])
        }
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
      // DU-1 of table T-223 names what comes along: その `Task` の WBS の子孫、
      // `TaskVisual`、`TaskGroupMember`、部分木の内側で閉じた依存、その `Task` を
      // 指す割当。⛔ `TaskOrigin` は複製してはならない（MUST NOT）-- a copy did
      // not come from the exchange partner, so it is not matched on merge.
      //
      // ⛔ MISSING: FR-033 requires the paste to be refused when the stack has
      // reached ST-7's safety valve (`stackSafetyCap`, S-89), and that count
      // cannot be taken here: ST-1 counts overlap by 描画上の占有幅 and table
      // T-038 states 日付の範囲だけで数えてはならない（MUST NOT）, which puts
      // the number in the layout, not in a document-only function. Neither this
      // signature nor the specification says who passes it in. The check is
      // absent, not silently answered.
      const subtree = wbsSubtreeOf(schedule, command.sourceUid)

      // AT-20: 発番済みの `uid` の最大値。複製（`FR-033`）の採番はここに従う. The
      // walk is in the document's own order, so which copy gets which uid is a
      // function of the document rather than of how the subtree was collected.
      let mark = schedule.project.uidHighWaterMark
      const remap = new Map<number, number>()
      for (const one of schedule.tasks) if (subtree.has(one.uid)) remap.set(one.uid, ++mark)

      const copies = schedule.tasks
        .filter((one) => subtree.has(one.uid))
        .map((one) => ({
          ...one,
          uid: remap.get(one.uid) as number,
          // ⛔ MISSING: FR-033 fixes the ROW of a copied task (複製した `Task` は、
          // 複製元と同じ行に載せること（MUST）) but names no attachment point in
          // the WBS for a Task paste -- its 貼り付け先は、選んでいる行の子とする
          // こと（MUST） speaks of 行 and 最上位, which is DU-2's TaskGroup paste.
          // The subtree's root is kept beside its original, so the copy is a WBS
          // sibling; every inner link is remapped so the copy is a subtree and
          // not a fan of roots. The root's placement is a decision of this file.
          wbsParentUid:
            one.uid === command.sourceUid
              ? one.wbsParentUid
              : (remap.get(one.wbsParentUid as number) as number),
          // FR-033: 複製した部分木の内側で閉じている依存だけを複製すること
          // （MUST）。部分木の外へ出る依存を複製してはならない（MUST NOT）--
          // otherwise every paste hangs one more line off the same predecessor.
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
      // FR-008 puts new `Assignment` uids under the same water mark (MUST), and
      // its ban on two assignments of the same Task-and-Resource pair cannot
      // bite here, because every copy points at a task that did not exist yet.
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
      // FR-091 gives the value an entrance and nothing more: 名称ラベルをどこへ
      // 描くかは `FR-002` が定める。本要求は値を入れる手段だけを定める. AT-27 is
      // nullable and no rule bars an empty name here -- FR-035's ban on the empty
      // string is about the document title (CM-1) alone.
      return edited(withTask(document, { ...task, name: command.name }))

    case 'setTaskNotes': // CM-10
      // PR-2 of table T-016, editable because the row carries no 読み取り専用.
      return edited(withTask(document, { ...task, notes: command.notes }))

    case 'setTaskPlanDates': { // CM-11 ⭐
      // ⭐ The two dates are one command because FR-012's MUST NOT reads them
      // together -- `finish` が `start` より前の入力を受け付けてはならない -- and
      // a per-column entrance could not state it.
      const start = checkDay(settings, command.start)
      const finish = checkDay(settings, command.finish)
      if (!start.ok || !finish.ok) {
        const faults: Refusal[] = []
        if (!start.ok) faults.push(reject('CM-11', 'IV-14', `start ${start.what}`))
        if (!finish.ok) faults.push(reject('CM-11', 'IV-14', `finish ${finish.what}`))
        return refused(faults)
      }
      // FR-012 (MUST NOT), and IV-10 holds the same thing as an invariant.
      // ⚠️ Not rounded to `finish` = `start`: 丸めて `finish` = `start` にして
      // はならない（MUST NOT）-- that would change data without saying so.
      if (compareDays(finish.day, start.day) < 0) {
        return refused([reject('CM-11', 'FR-012', 'finish is before start')])
      }
      // IV-12: `fadeInDays` と `fadeOutDays` の和が、その `Task` の期間を超えない
      // こと. Shortening the plan is the other way to break it, so the pair is
      // measured against the span this command is about to write.
      const fade = (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0)
      const span = workingDaysBetween(within, start.day, finish.day)
      if (fade > span) {
        return refused([
          reject('CM-11', 'IV-12', `fade of ${fade} worked days does not fit a plan of ${span}`),
        ])
      }
      const moved = { ...task, start: command.start, finish: command.finish }
      // FR-012: 日付を編集したときは再計算すること. The denominator moved.
      // ⚠️ The command carries no completion figure: 人に直接入力させないこと
      // （MUST NOT）, and PR-9 marks the column 読み取り専用.
      return edited(withTask(document, repriced(within, moved)))
    }

    case 'setTaskDeadline': { // CM-12
      // PR-10 of table T-016. FR-045 keeps it a mark of its own -- 期限の超過を
      // 遅れの判定に含めない -- so nothing else moves when it is placed.
      if (command.deadline !== null) {
        const checked = checkDay(settings, command.deadline)
        if (!checked.ok) return refused([reject('CM-12', 'IV-14', `deadline ${checked.what}`)])
      }
      return edited(withTask(document, { ...task, deadline: command.deadline }))
    }

    case 'setTaskPlanActualState': { // CM-13 ⭐
      // ⭐ Five columns, one command, because table T-019 states them as a row:
      // a per-column entrance would let a person build a state no row holds.
      //
      // ⚠️ This PLACES table T-019's values. It must never become a filter over
      // what the document may hold: 「表 T-019 の 5 つから外れる入力を受け付け
      // ない」という形にしてはならない（MUST NOT）-- an exchange partner leaves
      // `Stop` / `Resume` / `ResumeValid` on a task that was suspended and then
      // finished, and that shape matches no row of this table.
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
      if (faults.length > 0) return refused(faults)

      let placed: Task
      switch (place.row) {
        case 'PA-1': // 未着手 -- four columns 空.
          // ⚠️ `resumeValid` is left alone: the cell is `—`, not 空. PS-1 tests
          // `actualStart` only, so the state is reached whatever it holds.
          placed = { ...task, actualStart: null, actualDuration: null, actualFinish: null, resume: null }
          break
        case 'PA-2': // 進行中
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: place.actualDuration,
            actualFinish: null,
            resume: null,
            resumeValid: true,
          }
          break
        case 'PA-3': // 中断・再開予定あり
          // FR-044 states the same pairing from the other side: 再開予定日を置いた
          // とき、`resumeValid` を `true` にすること（MUST）-- without it PS-3
          // catches the task first and the date changes nothing.
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: place.actualDuration,
            actualFinish: null,
            resume: place.resume,
            resumeValid: true,
          }
          break
        case 'PA-4': // 中断・再開日未定 -- 「中止」と同じもの (MUST NOT invent a concept for it).
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: place.actualDuration,
            actualFinish: null,
            resume: null,
            resumeValid: false,
          }
          break
        case 'PA-5': // 完了
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: place.actualDuration,
            actualFinish: place.actualFinish,
            resume: null,
            resumeValid: false,
          }
          break
      }
      // ⛔ MISSING: FR-010 requires the imported `Stop` to be written back
      // untouched 人がそのタスクの実績を編集していないあいだ, and to be replaced
      // by the computed value 人がそのタスクの実績を編集したときに限り. No column
      // records that a person edited a task's actuals, and no requirement says
      // which unit drops or marks the carried value. `carry` is left as it is.
      return edited(withTask(document, repriced(within, placed)))
    }

    case 'beginTaskActual': { // CM-14 ⭐
      // FR-043 opens this entrance only while the task is 未着手: `Task` が未着手
      // であるあいだ、... 掴みシロを 2 つ ... 示すこと.
      if (planActualState(task) !== 'notStarted') {
        return refused([reject('CM-14', 'FR-043', 'the task has already been started')])
      }
      // 掴んで置く値は、実績開始日 ＝ 予定の開始日 (MUST), so a task with no
      // planned start has nothing to copy. FR-012 forbids showing such a task
      // at all, which is why this is a refusal and not a second rule.
      if (dayOf(task.start) === null) {
        return refused([reject('CM-14', 'FR-043', 'the task has no planned start to copy')])
      }
      // ⭐ Three columns at once, and the same three whichever handle was
      // grabbed: どちらが掴まれたときも実績開始日と実績期間（`actualDuration`）と
      // `resumeValid`（`true`）を置くこと（MUST）。開始点を掴んだときは終了点を
      // その既定の位置で、終了点を掴んだときは開始点を予定の開始日で確定させる
      // こと（MUST）-- neither end is ever left undecided, so neither end is a
      // parameter here.
      //
      // ⚠️ The planned start is copied as text rather than rebuilt through
      // `textOfDay`: the requirement says 実績開始日 ＝ 予定の開始日, and copying
      // makes the two columns name the same day whatever form that day arrived
      // in -- GRS reads the lexical date part and no time (FR-054).
      const visual = visualOf(schedule, task.uid)
      // S-129 by default; S-130 for a milestone, which 実績バーを持たない (点なの
      // で長さを持たない) and so takes a duration of zero.
      const duration = isMilestone(task, visual)
        ? settings.milestoneActualDuration
        : settings.actualInitialDuration
      const begun: Task = {
        ...task,
        actualStart: task.start,
        actualDuration: duration,
        resumeValid: true,
      }
      // ⛔ MISSING: the carried `Stop` -- see CM-13.
      return edited(withTask(document, repriced(within, begun)))
    }

    case 'cycleTaskPlanActualState': { // CM-15 ⭐
      // Table T-021a: 印を押して状態を確定したときに置く値. Four rows, and the
      // state read by table T-019a picks which one runs.
      const state = planActualState(task)
      let turned: Task
      switch (state) {
        case 'notStarted': { // PV-1: 未着手 → 完了
          // `actualStart` ＝ `start`、`actualFinish` ＝ `finish`、`actualDuration`
          // ＝ 予定の期間、`resumeValid` ＝ `false`.
          // ⚠️ FR-011 requires this one press to be possible: 未着手のタスクを
          // 1 押しで完了にできること（MUST）.
          const span = planSpanOf(within, task)
          if (span === null) {
            return refused([reject('CM-15', 'FR-012', 'the task does not name both plan dates')])
          }
          // Both plan dates are copied as text -- the same reason as CM-14.
          turned = {
            ...task,
            actualStart: task.start,
            actualFinish: task.finish,
            actualDuration: span,
            resumeValid: false,
          }
          break
        }
        case 'inProgress': { // PV-2: 進行中 → 完了
          // `actualFinish` ＝ 実績バーの右端、`resumeValid` ＝ `false`。左端も右端
          // も動かさない. RV-1 of table T-069 states the right end: `actualStart`
          // に `actualDuration` を稼働日で加えた日.
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
          // `actualFinish` と `resume` を空にし、`resumeValid` を `false` にする。
          // ⚠️ `resume` を空にするのは、取り込んだ完了タスクが過去の再開日を持ち
          // うるためである -- leaving it would land on PS-4 with a date in the past.
          turned = { ...task, actualFinish: null, resume: null, resumeValid: false }
          break
        case 'suspendedResumeUnknown':
        case 'suspendedResumePlanned': // PV-4: 中断 → 進行中
          // `resume` を空にし、`resumeValid` を `true` にする。実績は `FR-011` の
          // とおり動かさない。⚠️ 未着手へ戻してはならない（MUST NOT）-- PA-1 holds
          // no actuals at all, so going back there would erase what a person put
          // in. Erasing actuals belongs to undo (FR-031) and to PR-4..PR-8.
          turned = { ...task, resume: null, resumeValid: true }
          break
      }
      // ⛔ MISSING: the carried `Stop` -- see CM-13.
      return edited(withTask(document, repriced(within, turned)))
    }

    case 'setTaskFadeInDays': // CM-16
    case 'setTaskFadeOutDays': { // CM-17
      const row = command.kind === 'setTaskFadeInDays' ? 'CM-16' : 'CM-17'
      const days = command.days
      if (days !== null) {
        // FD-7 of table T-012a names the three conditions a fade has to meet and
        // says 丸めずに拒否する: いずれも 0 以上, フェードを持つタスクは終了日を
        // 持つこと, and `fadeIn` + `fadeOut` が期間を超えないこと. IV-11 and IV-12
        // hold the last two as document invariants, on every path.
        if (!Number.isInteger(days) || days < 0) {
          return refused([reject(row, 'FD-7', `fade days must be a whole number of days, not ${days}`)])
        }
        if (task.finish === null) {
          return refused([reject(row, 'IV-11', 'a task with a fade must have a finish')])
        }
        const span = planSpanOf(within, task)
        const other = command.kind === 'setTaskFadeInDays' ? task.fadeOutDays : task.fadeInDays
        // ⚠️ When `start` is missing the span cannot be measured, so IV-12 is not
        // judged rather than judged on a guess. IV-11 has already refused the
        // case the requirement actually names.
        if (span !== null && days + (other ?? 0) > span) {
          return refused([
            reject(row, 'IV-12', `fade of ${days + (other ?? 0)} worked days does not fit a plan of ${span}`),
          ])
        }
      }
      // FR-075: 既定値は `null` とし、`0` と区別すること（MUST）-- `null` は元の
      // ファイルに無い, `0` は明示的なゼロ, and the export writes the extended
      // attribute for one and not for the other.
      const faded =
        command.kind === 'setTaskFadeInDays'
          ? { ...task, fadeInDays: days }
          : { ...task, fadeOutDays: days }
      return edited(withTask(document, faded))
    }

    case 'setTaskWbsParent': { // CM-18
      // HM-1 of table T-015a: 階層の変更を WBS へ反映する. HM-2 keeps the uid,
      // which is why this writes `wbsParentUid` and nothing else.
      //
      // ⚠️ No depth cap is applied. HM-3a bounds the depth by FR-004's limit,
      // and S-125 is `TaskGroup` の深さ。WBS の深さではない -- FR-004 states
      // WBS の深さをクランプしてはならない（MUST NOT） and FR-033 repeats it as
      // WBS の深さには上限が無い.
      if (command.parentUid !== null) {
        if (taskByUid(schedule, command.parentUid) === null) {
          return refused([reject('CM-18', 'IV-2', `no Task with uid ${command.parentUid}`)])
        }
        // HM-4: 自分の子孫を親にする移動を受け付けてはならない（MUST NOT）--
        // 循環になる. IV-4 forbids the resulting loop. The self case is the
        // subtree's own root, so one test covers both.
        if (wbsSubtreeOf(schedule, command.uid).has(command.parentUid)) {
          return refused([
            reject('CM-18', 'HM-4', `uid ${command.parentUid} is inside the subtree of ${command.uid}`),
          ])
        }
      }
      return edited(withTask(document, { ...task, wbsParentUid: command.parentUid }))
    }

    case 'moveTaskToTaskGroup': { // CM-19
      // HM-3: タスクバーを別の行へ移す操作では WBS を変えてはならない（MUST NOT）
      // -- 行の移動と階層の移動は別の操作である. HM-10 is the consequence: 移るの
      // は掴んだ `Task` だけであり, its WBS children stay on the row they were on.
      // So exactly one `TaskGroupMember` is rewritten and no task is touched.
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
      return edited(withSchedule(document, { ...schedule, taskGroupMembers }))
    }

    case 'setTaskVisualShapeKind': { // CM-20
      const visual = visualOf(schedule, command.uid)
      // FR-083: 表 T-012 の `SH-1` 〜 `SH-4` と `SH-5`（マイルストーン）の間で
      // 変えてはならない（MUST NOT）-- 点と期間で持つデータが違う, so a task with
      // a duration has nowhere to put its finish and a point has no duration.
      const wanted = command.shapeKind === 'milestone'
      if (isMilestone(task, visual) !== wanted) {
        return refused([
          reject('CM-20', 'FR-083', 'a milestone and a task with a duration are not interchangeable'),
        ])
      }
      // ⚠️ `Task.milestone` is NOT written. AT-100 says the visual 描画の形だけを
      // 決める。`Task.milestone` を変えない, and FR-001 forbids an entrance that
      // changes the boolean alone (MUST NOT).
      return edited(withVisual(document, { ...visual, shapeKind: command.shapeKind }))
    }

    case 'setTaskVisualMilestoneGlyph': { // CM-21
      // FR-078: 表 T-012 の `SH-5` が挙げる図形から選べるようにすること -- eight
      // of them, and AT-101 counts eight.
      //
      // CR-172 spelled the eight (circle / hexagon / pentagon / diamond /
      // square / star / triangleUp / triangleDown), in the order SH-5 prints
      // them, which S-48 fixes as the order of their areas. `TaskMilestoneGlyph`
      // now carries membership, so no runtime test is written here -- the same
      // way `setTaskVisualShapeKind` leaves it to `TaskShapeKind`.
      //
      // ⚠️ Not refused for a task that is not a milestone: AT-101 says the column
      // is only READ while `shapeKind` is `'milestone'`, which is not a bar on
      // holding a value.
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, milestoneGlyph: command.glyph }))
    }

    case 'setTaskVisualColors': { // CM-22 ⭐
      // ⭐ The two colours are one command because the MUST NOT spans them:
      // 塗りと輪郭を同時に透明にすることを許してはならない, held as IV-9. Two
      // separate entrances could not state it -- either one alone is legal.
      if (command.fillColor === TRANSPARENT && command.strokeColor === TRANSPARENT) {
        return refused([reject('CM-22', 'IV-9', 'the fill and the stroke may not both be transparent')])
      }
      // ⛔ MISSING: FR-007 has the colour picked 表 T-017 のパレット色から, and
      // CL-1 lists eleven of them in words (白 / 黒 / 濃い灰色 / ... / 透明). Only
      // 透明 has a spelling (P-19); AT-102 and AT-103 are plain strings. The
      // palette membership cannot be tested here, so it is not tested.
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
      // FR-007: 指定した色をテーマ追随へ戻せること（MUST）。戻す入口が無いと色は
      // 片道になり、一度でも触った要素はテーマを変えても永久に取り残される.
      // ⭐ Both colours together, because the state being restored is "nothing
      // chosen" and AT-102 / AT-103 spell that `null` = テーマから解く.
      // ⚠️ This is why 透明 cannot serve: 「透明」は選んだ値であって「指定して
      // いない」とは別物なので、透明を選ぶことは戻すことにならない.
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, fillColor: null, strokeColor: null }))
    }

    case 'setTaskVisualLineWeight': { // CM-24
      // FR-007: 線の太さは色に頼らない識別手段として必須である. CL-2 of table
      // T-017 names three -- 細 / 中 / 太 -- and CR-172 spelled them thin /
      // medium / thick, at the same time narrowing AT-104's type column to
      // 列挙（3 値）: the older wording, 列挙（`'thin'` ほか 3 値）, could be read
      // as four. `TaskLineWeight` carries membership.
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, lineWeight: command.lineWeight }))
    }

    case 'setTaskVisualNamePlacement': { // CM-25 ⭐
      // ⭐ The anchor and the alignment are one command because FR-002 states
      // them as one 指定: 位置の指定は 9 点アンカーと左詰め / 中央 / 右詰めで持つ
      // こと（MUST）, and its automatic placement is off as soon as a person has
      // moved the label (既定は自動配置とし、人が動かしたときだけ指定が残る).
      // ⚠️ Not pixels: ピクセル座標で持ってはならない（MUST NOT）-- 縦横独立ズーム
      // でずれる. That is why AT-98 is an index and not a coordinate.
      //
      // The alignment is settled: CR-172 read AT-99's 列挙（`'left'` ほか 3 値）
      // as three in all -- FR-002's prose names three placements and no fourth
      // appears anywhere in docs/spec -- spelled them left / center / right, and
      // narrowed the type column to 列挙（3 値）. `TaskNameAlign` carries
      // membership. ⚠️ Automatic placement is NOT a fourth member; the column
      // being nullable is what holds it.
      //
      // ✅ CR-181 closed the hole this used to carry: AT-98 fixed the range
      // 0..8 while NO table said which index was which of the nine points, so
      // the number was stored unmapped and nothing could tell 0 from 8. AT-98
      // now numbers the nine points of the bounding box in reading order,
      // 0 top-left to 8 bottom-right.
      //
      // ⚠️ This entry still checks the RANGE and nothing else, which is all it
      // can: every index in it is a legal place to put a label, so there is no
      // further rule to apply here. Table T-013 remains a different question --
      // it decides where the label goes when nobody chose an anchor.
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
