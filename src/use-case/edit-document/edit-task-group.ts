// EditDocument -- the TaskGroup aggregate.
//
// @unit      UF-12  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The eleven commands table T-108 puts in the `TaskGroup` group: CM-26 to
// CM-35, and CM-72.
//
// ⚠️ All eleven write a `TaskGroup` column, which is schedule-group data, so each
// of them rebuilds `document.schedule` and FR-063 moves the schedule instant for it.
// A command that asks for the value already held rebuilds NOTHING and returns
// the document untouched -- document-change-plan.ts reads the schedule
// REFERENCE, so a rebuild that changed no value would move that instant for a
// write that changed nothing.
//
// ⚠️ Identity arrives as a value. `TaskGroup.id` is a UUID (AT-51) and a pure
// function cannot mint one; LY-5 leaves the outside to the Framework, the same
// reason CM-3 takes its day as an argument. `Task` and `Assignment` uids are
// the opposite case -- FR-001 and FR-008 make `Project.uidHighWaterMark` the
// source of both (MUST), and that is inside the document, so CM-28 counts them
// out here.
//
// ⚠️ Confirming a delete (FR-032) and telling people what went (FR-076) are
// not this file's business: it validates and returns a new Document, and CP-9
// settles nothing.
//
// ⚠️ Table T-015's HR-1 to HR-5 (collapse all, expand the children of a row,
// ...) have no rows of their own in table T-108, which is the full census of
// commands. They are BUNDLES of CM-33 over the rows they name, and AG-3 of
// table T-035 already applies a bundle atomically.
//
// ⭐ HF-8 of table T-051 is the one that is NOT a bundle: CM-72 gives it a row
// of its own because FR-031 makes one press of the fit ONE undo step, and a
// bundle of CM-33 would make the step count depend on how many rows the
// document holds.
//
// ⚠️ It is not the public entry of its component (Chapter 5.3, MUST NOT).

import type { Document } from '../../entity/document-model/document/document'
import type {
  Assignment,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/** CM-26 to CM-35 and CM-72 of table T-108. */
export type TaskGroupCommand =
  | {
      readonly kind: 'createTaskGroup'
      /** AT-51, minted outside -- see the note at the top of the file. */
      readonly id: string
      /** FR-085: any existing row, or null for one that belongs nowhere. */
      readonly parentId: string | null
      readonly label: string | null
      /** FR-058: the row shows this Task's name when `label` is null. */
      readonly derivedFromTaskUid: number | null
      /**
       * AT-55, the place among the siblings.
       *
       * ⛔ WHERE a new row lands among its siblings is not decided anywhere:
       * FR-085 settles the parent ("既存のどの `TaskGroup` の子にもでき、どこ
       * にも属さない最上位にもできる") and says nothing about the order, and
       * table T-015a covers moving rows, not making them. This file will not
       * decide it either, so the caller passes the value in.
       */
      readonly order: number
    }
  | { readonly kind: 'deleteTaskGroup'; readonly groupId: string }
  | {
      readonly kind: 'pasteTaskGroupSubtree'
      /** The row that was copied. Its whole subtree comes with it (DU-2). */
      readonly sourceGroupId: string
      /** FR-033: the copy lands under the SELECTED row; null = top level. */
      readonly targetGroupId: string | null
      /** A fresh id for each copied row, keyed by the id of the row it copies. */
      readonly newGroupIds: Readonly<Record<string, string>>
    }
  | { readonly kind: 'setTaskGroupLabel'; readonly groupId: string; readonly label: string | null }
  | { readonly kind: 'setTaskGroupColor'; readonly groupId: string; readonly color: string }
  | { readonly kind: 'resetTaskGroupColor'; readonly groupId: string }
  | { readonly kind: 'setTaskGroupHeight'; readonly groupId: string; readonly height: number | null }
  | { readonly kind: 'setTaskGroupCollapsed'; readonly groupId: string; readonly collapsed: boolean }
  | { readonly kind: 'setTaskGroupHidden'; readonly groupId: string; readonly hidden: boolean }
  | {
      readonly kind: 'reorderTaskGroupSiblings'
      /** The parent whose children are being reordered; null = the top level. */
      readonly parentId: string | null
      /** Every child of that parent, in the order asked for (HM-8). */
      readonly orderedIds: readonly string[]
    }
  /**
   * CM-72 -- HF-8's half of one fit press.
   *
   * ⚠️ It carries no field. Every collapsed row is the target, so there is no
   * row to name; the second half of the press, CM-71, carries the zoom and the
   * place and lives in the presentation aggregate.
   */
  | { readonly kind: 'expandAllTaskGroups' }

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

/** @purity pure */
function withSchedule(document: Document, part: Partial<Schedule>): Document {
  return { ...document, schedule: { ...document.schedule, ...part } }
}

/** Replaces one row and nothing else. @purity pure */
function withRow(document: Document, row: TaskGroup): Document {
  return withSchedule(document, {
    taskGroups: document.schedule.taskGroups.map((one) => (one.id === row.id ? row : one)),
  })
}

/**
 * How deep a row sits, counting the top level as 1 -- the count IV-5 measures
 * against `S-125`, and the one `drawnGroups` walks in schedule-layout.ts.
 *
 * @purity pure
 */
function depthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number {
  let depth = 1
  let foundAt = row.parentId
  // A `parentId` cycle already breaks IV-5; the step count stops the walk
  // rather than letting a broken document hang a pure function.
  for (let guard = 0; foundAt !== null && guard <= byId.size; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    depth += 1
    foundAt = parent.parentId
  }
  return depth
}

/** A row and everything under it, in document order, with its own height. */
interface Subtree {
  readonly rows: readonly TaskGroup[]
  /** 1 for a row with no children -- the count `S-125` bounds. */
  readonly height: number
}

/** @purity pure */
function subtreeOf(groups: readonly TaskGroup[], rootId: string): Subtree | null {
  const root = groups.find((one) => one.id === rootId)
  if (root === undefined) return null
  const rows: TaskGroup[] = []
  const seen = new Set<string>()
  let level: readonly TaskGroup[] = [root]
  let height = 0
  while (level.length > 0) {
    height += 1
    for (const one of level) {
      rows.push(one)
      seen.add(one.id)
    }
    const above = level
    // `seen` is what stops a `parentId` cycle (IV-5 broken) from looping.
    level = groups.filter((one) => !seen.has(one.id) && above.some((up) => up.id === one.parentId))
  }
  return { rows, height }
}

/**
 * The seeds plus every WBS descendant of them, which is what CD-1 of table
 * T-050 reaches from each `Task` and what DU-1 of table T-223 copies.
 *
 * ⚠️ A WBS descendant may sit on a DIFFERENT row -- HM-10 leaves the children
 * behind when a bar is moved -- and FR-032 says so in as many words when it
 * asks the confirmation to mark those Tasks.
 *
 * @purity pure
 */
function withWbsDescendants(tasks: readonly Task[], seeds: Iterable<number>): ReadonlySet<number> {
  const held = new Set<number>(seeds)
  for (let grew = true; grew; ) {
    grew = false
    for (const task of tasks) {
      if (task.wbsParentUid === null || held.has(task.uid)) continue
      if (held.has(task.wbsParentUid)) {
        held.add(task.uid)
        grew = true
      }
    }
  }
  return held
}

/**
 * Runs one TaskGroup command against the document.
 *
 * @purity pure
 */
export function editTaskGroup(document: Document, command: TaskGroupCommand): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const groups = schedule.taskGroups
  const byId = new Map(groups.map((one) => [one.id, one]))

  switch (command.kind) {
    case 'createTaskGroup': {
      const refusals: Refusal[] = []
      // IV-1 is the one condition the generated schema cannot see: the shape of
      // the id is a single column and the schema types it (AT-51, format uuid),
      // but uniqueness spans the whole array.
      if (byId.has(command.id)) {
        refusals.push(reject('CM-26', 'IV-1', `a row already holds the id ${command.id}`))
      }
      if (!Number.isInteger(command.order)) {
        refusals.push(reject('CM-26', 'AT-55', `order is not an integer: ${command.order}`))
      }
      // FR-058: "指定も導出元も無い行を作ってはならない（MUST NOT）". AT-54 says
      // the same from the column's side, and IV-8 is what tests it.
      if (command.label === null && command.derivedFromTaskUid === null) {
        refusals.push(
          reject('CM-26', 'FR-058', 'a row may hold neither a name nor a derivation source (AT-54)'),
        )
      }
      if (
        command.derivedFromTaskUid !== null &&
        taskByUid(schedule, command.derivedFromTaskUid) === null
      ) {
        refusals.push(
          reject('CM-26', 'IV-2', `no Task holds the uid ${command.derivedFromTaskUid}`),
        )
      }
      if (command.parentId !== null) {
        const parent = byId.get(command.parentId)
        if (parent === undefined) {
          refusals.push(reject('CM-26', 'FR-085', `no such parent row: ${command.parentId}`))
        } else if (depthOf(byId, parent) >= settings.maxGroupDepth) {
          // FR-085: "上限に達している親の下に作らせてはならない（MUST NOT）".
          // The value is S-125; the rule and the reason are FR-004's.
          refusals.push(
            reject(
              'CM-26',
              'FR-085',
              `the parent is already at the depth S-125 allows (${settings.maxGroupDepth})`,
            ),
          )
        }
      }
      if (refusals.length > 0) return refused(refusals)

      // The four remaining columns start absent, and FR-042 gives both of the
      // meaningful ones their meaning when absent: no `color` follows the theme
      // through the depth and the row's place, no `height` is decided by the
      // stack count (ST-9). A new row is neither collapsed nor hidden.
      const row: TaskGroup = {
        id: command.id,
        parentId: command.parentId,
        label: command.label,
        derivedFromTaskUid: command.derivedFromTaskUid,
        order: command.order,
        isCollapsed: null,
        isHidden: null,
        color: null,
        height: null,
      }
      return edited(withSchedule(document, { taskGroups: [...groups, row] }))
    }

    case 'deleteTaskGroup': {
      const doomed = subtreeOf(groups, command.groupId)
      if (doomed === null) {
        return refused([reject('CM-27', 'FR-032', `no such row: ${command.groupId}`)])
      }
      // CD-2 of table T-050: the rows below go with it, and so does every Task
      // on any of them, each of those cascading CD-1. Deleting every row is a
      // reachable state, and FR-001 says so ("`FR-032` は行を 1 つも無い状態に
      // できる"), so nothing here keeps the last row alive.
      const doomedRows = new Set(doomed.rows.map((one) => one.id))
      const seeds = schedule.taskGroupMembers
        .filter((member) => doomedRows.has(member.groupId))
        .map((member) => member.taskUid)
      const doomedTasks = withWbsDescendants(schedule.tasks, seeds)

      // FR-032: "`Task` を消す前に、その `Task` を名前の導出元にしている行の名前
      // を確定させ、`derivedFromTaskUid` を空にすること（MUST）". Only rows that
      // SURVIVE need it -- and they exist, because CD-1 reaches Tasks that sit
      // on other rows.
      const stranded: string[] = []
      const kept: TaskGroup[] = []
      for (const row of groups) {
        if (doomedRows.has(row.id)) continue
        if (row.derivedFromTaskUid === null || !doomedTasks.has(row.derivedFromTaskUid)) {
          kept.push(row)
          continue
        }
        // FR-058 shows the derived name only when none was given, so a row that
        // already carries a `label` settles on the one it is showing.
        const settled = row.label ?? taskByUid(schedule, row.derivedFromTaskUid)?.name ?? null
        if (settled === null) {
          stranded.push(row.id)
          continue
        }
        kept.push({ ...row, label: settled, derivedFromTaskUid: null })
      }
      if (stranded.length > 0) {
        // ⛔ GAP. FR-032 forbids BOTH outcomes here and decides neither: the
        // row may not keep a `derivedFromTaskUid` that points at a Task which
        // is going, and it may not be left with no name and no source (AT-54).
        // When the Task it derives from has no name (AT-27 admits null), there
        // is no name to settle on. Refusing is the only move that invents no
        // rule.
        return refused([
          reject(
            'CM-27',
            'FR-032',
            `the name of ${stranded.join(', ')} cannot be settled: the Task it derives from has no name`,
          ),
        ])
      }

      const survivors = schedule.tasks
        .filter((task) => !doomedTasks.has(task.uid))
        .map((task) => {
          // CD-1 takes "その `Task` を端点とする依存". DF-4 nests a dependency
          // under its SUCCESSOR, so the successor's own array goes with it and
          // what is left to sweep is the predecessor side.
          const held = task.dependencies.filter((one) => !doomedTasks.has(one.predecessorUid))
          return held.length === task.dependencies.length ? task : { ...task, dependencies: held }
        })

      // CD-2 sends the pins after the row (S-126) and returns the display
      // position to null (S-78) rather than dropping it: null is "the person
      // has not chosen a place yet", which OP-10 of table T-024a knows how to
      // read. The presentation group moves with the schedule here, and FR-063
      // still moves the schedule instant because the schedule moved.
      const pinned = settings.pinnedGroupIds.filter((one) => !doomedRows.has(one))
      const scrollGroupId =
        settings.scrollGroupId !== null && doomedRows.has(settings.scrollGroupId)
          ? null
          : settings.scrollGroupId
      const documentSettings =
        pinned.length !== settings.pinnedGroupIds.length || scrollGroupId !== settings.scrollGroupId
          ? { ...settings, pinnedGroupIds: pinned, scrollGroupId }
          : settings

      // ⚠️ `baselineTasks` is NOT swept. CD-1 does not list it, and the ERD
      // makes the baseline a match on `uid` rather than a reference, so no
      // dangling pointer is left behind (FR-015).
      // ⚠️ `resources` is NOT swept either: CD-5 is a row of its own, and
      // FR-008 keeps a resource alive after its assignment is gone.
      return edited({
        ...document,
        schedule: {
          ...schedule,
          taskGroups: kept,
          tasks: survivors,
          taskGroupMembers: schedule.taskGroupMembers.filter(
            (one) => !doomedTasks.has(one.taskUid) && !doomedRows.has(one.groupId),
          ),
          taskVisuals: schedule.taskVisuals.filter((one) => !doomedTasks.has(one.taskUid)),
          taskOrigins: schedule.taskOrigins.filter((one) => !doomedTasks.has(one.taskUid)),
          assignments: schedule.assignments.filter(
            (one) => one.taskUid === null || !doomedTasks.has(one.taskUid),
          ),
          commentBoxes: schedule.commentBoxes.filter(
            (one) => one.anchorGroupId === null || !doomedRows.has(one.anchorGroupId),
          ),
          highlightBoxes: schedule.highlightBoxes.filter(
            (one) =>
              !(one.topGroupId !== null && doomedRows.has(one.topGroupId)) &&
              !(one.bottomGroupId !== null && doomedRows.has(one.bottomGroupId)),
          ),
        },
        documentSettings,
      })
    }

    case 'pasteTaskGroupSubtree': {
      const copied = subtreeOf(groups, command.sourceGroupId)
      if (copied === null) {
        return refused([reject('CM-28', 'FR-033', `no such row: ${command.sourceGroupId}`)])
      }
      const target = command.targetGroupId === null ? null : byId.get(command.targetGroupId)
      if (command.targetGroupId !== null && target === undefined) {
        return refused([
          reject('CM-28', 'FR-033', `no such row to paste under: ${command.targetGroupId}`),
        ])
      }
      const refusals: Refusal[] = []

      // FR-033: "貼り付け後の `TaskGroup` の深さが `FR-004` の上限を超える複製を
      // 受け付けてはならない（MUST NOT）。部分木は貼り付け後の最深部で測る".
      // The target's own depth plus the subtree's height IS that deepest point,
      // because the copied root becomes the target's child.
      const under = target === undefined || target === null ? 0 : depthOf(byId, target)
      if (under + copied.height > settings.maxGroupDepth) {
        refusals.push(
          reject(
            'CM-28',
            'FR-033',
            `the copy would reach depth ${under + copied.height}, past S-125's ${settings.maxGroupDepth}`,
          ),
        )
      }

      const idOf = new Map<string, string>()
      const taken = new Set<string>()
      for (const row of copied.rows) {
        const fresh = command.newGroupIds[row.id]
        if (fresh === undefined) {
          refusals.push(reject('CM-28', 'AT-51', `no new id was given for the copy of ${row.id}`))
        } else if (byId.has(fresh) || taken.has(fresh)) {
          refusals.push(reject('CM-28', 'IV-1', `the id ${fresh} is already in use`))
        } else {
          taken.add(fresh)
          idOf.set(row.id, fresh)
        }
      }

      // DU-2: every Task on the copied rows, each cascading DU-1 -- which
      // reaches its WBS descendants.
      const copiedRows = new Set(copied.rows.map((one) => one.id))
      const rowOf = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
      const seeds = schedule.taskGroupMembers
        .filter((member) => copiedRows.has(member.groupId))
        .map((member) => member.taskUid)
      const copiedTasks = withWbsDescendants(schedule.tasks, seeds)
      const homeless = [...copiedTasks].filter((uid) => {
        const row = rowOf.get(uid)
        return row === undefined || !copiedRows.has(row)
      })
      if (homeless.length > 0) {
        // ⛔ GAP. DU-2 says "複製した `Task` は複製した行に載せる", and the note
        // under table T-223 takes the other rule ("複製元と同じ行に載せる") away
        // by declaring it the rule for copying a Task ALONE. A WBS descendant
        // that HM-10 left on a row outside the copy therefore has no row named
        // for it: its source row was not copied. Refusing is the only move that
        // decides nothing -- leaving the copy off a row breaks IV-6, and putting
        // it on one picks a row the table never named.
        refusals.push(
          reject(
            'CM-28',
            'DU-2',
            `DU-1 pulls in Tasks ${homeless.join(', ')}, which sit on no copied row, and DU-2 does not say which row their copies land on`,
          ),
        )
      }
      if (refusals.length > 0) return refused(refusals)

      // ⚠️ ST-7's safety valve (FR-033: "段が表 T-014 の `ST-7` の安全弁に達した
      // ときは、貼り付けを受け付けずに通知すること") cannot be reached by THIS
      // command, so nothing counts stacks here -- which matters, because the
      // count is made of drawn occupancy (table T-038) and belongs to the
      // layout. That MUST sits in the paragraph about a copied Task landing on
      // its source's own row, where the count does grow. DU-2 puts every copy
      // on the COPIED row instead: no existing row gains a Task, and each new
      // row carries the same Tasks as the row it copies, so its stack count is
      // the one that row already has.
      //
      // ⚠️ A copied column keeps its value unless identity forces otherwise.
      // Only the id, the uid, the copied root's `parentId` (FR-033 puts it
      // under the selected row) and references INTO the copied set move. In
      // particular `order` is carried over -- where a copy lands among its new
      // siblings is not stated anywhere, and a copy keeping the column it
      // copied is what duplicating is; writing some other number there would be
      // this file deciding. The same goes for a `wbsParentUid` that points
      // OUTSIDE the copy: carrying it over keeps IV-2 and IV-4 sound, where
      // emptying it would be a decision nobody made.
      let mark = schedule.project.uidHighWaterMark
      const uidOf = new Map<number, number>()
      // FR-001: "新しい `Task` の `UID` は `Project.uidHighWaterMark` に従って
      // 採ること（MUST）。実在する `UID` の最大値から採ってはならない（MUST
      // NOT）". FR-008 puts `Assignment` on the same counter. Sorted, so the
      // same paste on the same document yields the same document.
      for (const uid of [...copiedTasks].sort((a, b) => a - b)) uidOf.set(uid, ++mark)

      const newRows: TaskGroup[] = []
      for (const row of copied.rows) {
        const fresh = idOf.get(row.id)
        if (fresh === undefined) continue
        const parentId =
          row.id === command.sourceGroupId
            ? command.targetGroupId
            : row.parentId === null
              ? null
              : (idOf.get(row.parentId) ?? row.parentId)
        newRows.push({ ...row, id: fresh, parentId })
      }

      const newTasks: Task[] = []
      for (const task of schedule.tasks) {
        const fresh = uidOf.get(task.uid)
        if (fresh === undefined) continue
        newTasks.push({
          ...task,
          uid: fresh,
          wbsParentUid:
            task.wbsParentUid === null
              ? null
              : (uidOf.get(task.wbsParentUid) ?? task.wbsParentUid),
          // FR-033: "複製した部分木の内側で閉じている依存だけを複製すること
          // （MUST）。部分木の外へ出る依存を複製してはならない（MUST NOT）".
          dependencies: task.dependencies
            .filter((one) => uidOf.has(one.predecessorUid))
            .map((one) => ({
              ...one,
              predecessorUid: uidOf.get(one.predecessorUid) ?? one.predecessorUid,
            })),
        })
      }

      const newMembers: TaskGroupMember[] = []
      for (const member of schedule.taskGroupMembers) {
        const freshUid = uidOf.get(member.taskUid)
        const freshRow = idOf.get(member.groupId)
        if (freshUid === undefined || freshRow === undefined) continue
        newMembers.push({ ...member, taskUid: freshUid, groupId: freshRow })
      }

      const newVisuals: TaskVisual[] = []
      for (const visual of schedule.taskVisuals) {
        const fresh = uidOf.get(visual.taskUid)
        if (fresh !== undefined) newVisuals.push({ ...visual, taskUid: fresh })
      }

      const newAssignments: Assignment[] = []
      for (const assignment of schedule.assignments) {
        if (assignment.taskUid === null) continue
        const fresh = uidOf.get(assignment.taskUid)
        if (fresh === undefined) continue
        newAssignments.push({ ...assignment, uid: ++mark, taskUid: fresh })
      }

      // ⛔ Nothing is added to `taskOrigins`: DU-1 forbids it (MUST NOT), so
      // the copies are not offered to the merge. Nothing is added to the
      // annotations or to `pinnedGroupIds` either -- DU-2 forbids both, and the
      // reasons are under table T-223 (a doubled note on the same day, and a
      // silently filled S-127).
      return edited(
        withSchedule(document, {
          project: { ...schedule.project, uidHighWaterMark: mark },
          taskGroups: [...groups, ...newRows],
          tasks: [...schedule.tasks, ...newTasks],
          taskGroupMembers: [...schedule.taskGroupMembers, ...newMembers],
          taskVisuals: [...schedule.taskVisuals, ...newVisuals],
          assignments: [...schedule.assignments, ...newAssignments],
        }),
      )
    }

    case 'setTaskGroupLabel': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-29', 'FR-085', `no such row: ${command.groupId}`)])
      }
      // FR-058's MUST NOT again, from the other direction: taking the name away
      // from a row that has no derivation source leaves AT-54 unsatisfiable.
      if (command.label === null && row.derivedFromTaskUid === null) {
        return refused([
          reject('CM-29', 'FR-058', 'a row may hold neither a name nor a derivation source (AT-54)'),
        ])
      }
      if (row.label === command.label) return edited(document)
      // ⚠️ `derivedFromTaskUid` is left alone. FR-058 makes the derived name
      // what a row shows when none was given, so naming a row does not have to
      // forget where the fallback came from, and nothing asks for that.
      return edited(withRow(document, { ...row, label: command.label }))
    }

    case 'setTaskGroupColor': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-30', 'FR-042', `no such row: ${command.groupId}`)])
      }
      // ⛔ GAP: the value is NOT checked against the palette. FR-007 requires
      // the choice to come from table T-017's CL-1 (MUST) and FR-028 puts the
      // Agent API on the same footing as the screen, so the check belongs here
      // -- but CL-1 names its eleven colours in Japanese prose and only the
      // eleventh has a settled spelling (`'transparent'`, P-19 of the
      // glossary). The generated schema types the column as a plain string.
      // There is nothing to compare against, so nothing is compared.
      //
      // ⚠️ A colour and no colour are different states, which is why CM-31 is a
      // row of its own: FR-007 says "透明を選ぶことは戻すことにならない", so
      // this command never writes null.
      if (row.color === command.color) return edited(document)
      return edited(withRow(document, { ...row, color: command.color }))
    }

    case 'resetTaskGroupColor': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-31', 'FR-007', `no such row: ${command.groupId}`)])
      }
      // FR-007: "指定した色をテーマ追随へ戻せること（MUST）。`Task` の線色・塗り
      // 色と行の色のいずれもである" -- without this entrance a row that was once
      // coloured would never follow `themeHue` again.
      if (row.color === null) return edited(document)
      return edited(withRow(document, { ...row, color: null }))
    }

    case 'setTaskGroupHeight': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-32', 'FR-042', `no such row: ${command.groupId}`)])
      }
      if (command.height !== null && !Number.isInteger(command.height)) {
        return refused([reject('CM-32', 'AT-59', `height is not an integer: ${command.height}`)])
      }
      // ⚠️ A height BELOW what the stacks need is accepted as it stands, and
      // that is FR-042's own decision: "指定した高さは下限として扱うこと
      // （MUST）。段数がそれより高い帯を要するときは、指定を超えて広げること
      // （MUST）。段を落として指定に収めてはならない（MUST NOT）". The widening
      // happens where the band is measured, not here -- and the requirement
      // gives the reason for putting the floor there rather than refusing:
      // stacks grow when Tasks are added, so a height that was legal when it
      // was saved would otherwise turn illegal by itself.
      //
      // ⚠️ null goes back to the automatic height (FR-042: "高さの指定が無い行
      // は、段数から自動で決めること"). It arrives through this command because
      // table T-108 holds no reset row for the height, the way CM-31 is one for
      // the colour.
      if (row.height === command.height) return edited(document)
      return edited(withRow(document, { ...row, height: command.height }))
    }

    case 'setTaskGroupCollapsed': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-33', 'FR-004', `no such row: ${command.groupId}`)])
      }
      // ⚠️ Only the column moves. What a collapsed row hides -- the rows below
      // it and the Tasks on them -- is HR-1a's rule for whoever draws, and it
      // forbids moving those Tasks onto the parent row (MUST NOT), so nothing
      // here touches `taskGroupMembers`.
      if (row.isCollapsed === command.collapsed) return edited(document)
      return edited(withRow(document, { ...row, isCollapsed: command.collapsed }))
    }

    case 'setTaskGroupHidden': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-34', 'FR-004', `no such row: ${command.groupId}`)])
      }
      // HR-6 keeps the hidden state in the document (MUST) -- without it a
      // round trip would bring the hidden rows back and WY-1 would fail. Same
      // as HR-1a, the rows below and their Tasks are not re-parented (MUST
      // NOT).
      if (row.isHidden === command.hidden) return edited(document)
      return edited(withRow(document, { ...row, isHidden: command.hidden }))
    }

    case 'reorderTaskGroupSiblings': {
      const refusals: Refusal[] = []
      if (command.parentId !== null && !byId.has(command.parentId)) {
        refusals.push(reject('CM-35', 'FR-005', `no such parent row: ${command.parentId}`))
      }
      const siblings = groups.filter((one) => one.parentId === command.parentId)
      const asked = new Set(command.orderedIds)
      if (asked.size !== command.orderedIds.length) {
        refusals.push(reject('CM-35', 'HM-8', 'the same row is named twice'))
      }
      // HM-8 reorders SIBLINGS: a list that leaves one out, or brings in a row
      // from another parent, does not describe an order of this parent's
      // children, and moving a row to another parent is CM-18's and HM-3a's
      // business, not this command's.
      if (asked.size !== siblings.length || !siblings.every((one) => asked.has(one.id))) {
        refusals.push(
          reject('CM-35', 'HM-8', 'the list must name every child of that parent, and no other row'),
        )
      }
      if (refusals.length > 0) return refused(refusals)

      // The column only has to yield the sequence asked for (AT-55, "同じ親の下
      // での並び"); its numbers carry nothing else, so the rank in the list is
      // the value written.
      const rank = new Map(command.orderedIds.map((id, at) => [id, at]))
      const ordered = groups.map((one) => {
        const place = rank.get(one.id)
        return place === undefined || place === one.order ? one : { ...one, order: place }
      })
      if (ordered.every((one, at) => one === groups[at])) return edited(document)
      // ⛔ GAP: HM-9 ("並べ替えた順序も WBS へ伝わること（MUST）") is NOT carried
      // out. It needs a mapping from the order of rows onto `Task.wbsOrder`,
      // and no requirement or table gives one: a row holds Tasks from anywhere
      // in the WBS (HM-10), and the two axes are deliberately independent
      // (HM-3). Nothing here writes `wbsOrder`.
      return edited(withSchedule(document, { taskGroups: ordered }))
    }

    case 'expandAllTaskGroups': {
      // HF-8: one press of the fit throws away every collapse a person made,
      // and it is the only operation that does. ⚠️ The hidden state STAYS --
      // HF-8 discards the collapse alone, and HR-6 keeps `isHidden` in the
      // document so a round trip brings it back (WY-1).
      //
      // ⭐ ONE command, never a loop of CM-33. FR-031 makes one press one undo
      // step (UN-17), and pushing one step per row would make the step count
      // depend on how many rows the document holds.
      //
      // ⭐ NOTHING IS REFUSED and no row is named: a document with no collapse
      // in it comes back untouched, so FR-063 leaves the schedule instant where
      // it stood (the file note above says why the reference is what answers).
      //
      // ⚠️ `null` is not a collapse. AT-56 lets the column be absent, and a row
      // that never held one is left exactly as it is rather than written to
      // `false` -- writing it would rebuild the schedule, and move the instant,
      // for a document nobody had collapsed.
      const opened = groups.map((one) =>
        one.isCollapsed === true ? { ...one, isCollapsed: false } : one,
      )
      if (opened.every((one, at) => one === groups[at])) return edited(document)
      return edited(withSchedule(document, { taskGroups: opened }))
    }
  }
}
