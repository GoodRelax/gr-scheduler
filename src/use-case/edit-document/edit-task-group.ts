// EditDocument -- the TaskGroup aggregate.
//
// @unit      UF-12  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The commands table T-108 puts in the `TaskGroup` group: CM-26 to CM-35,
// CM-72 and CM-73.
//
// A command that asks for the value already held returns the document
// untouched, because document-change-plan.ts tells a schedule-group write by the
// `schedule` reference (FR-063).
//
// Identity arrives as a value: `TaskGroup.id` is a UUID (AT-51), which a pure
// function cannot mint (LY-5). `Task` and `Assignment` uids are the opposite
// case: `Project.uidHighWaterMark` is inside the document, so CM-28 counts them
// out here.
//
// Table T-015's HR rows have no rows of their own in table T-108: the caller
// sends them as bundles of this file's commands, which AG-3 of table T-035
// applies atomically.

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
import displayWords from '../../adapter/screen-renderer/display-words.json'

/**
 * The name a row settles on when it has none of its own (FR-032).
 *
 * Read from `display-words.json`, the one destination Chapter 6.2 gives the
 * words in `src/`, rather than typed here. A JSON import is data, not a reach
 * into a component: `check_layer_rules.py` reads a `.json` specifier as data.
 *
 * The English cell is a decision: the display language is not in the document
 * (FR-038), and what is written is a `TaskGroup.label` the exchange partner
 * receives -- the same answer `startupDisplayLanguage` gives a host FR-038 does
 * not admit. The reader's language could only arrive as a command field, which
 * is a change request.
 *
 * The empty stand-in is unreachable while `npm run gen:check` passes; it guards
 * a hand-edited generated file.
 */
const DEFAULT_ROW_NAME_ENTRY = displayWords.defaultNames.find((one) => one.use === 'row')
export const DEFAULT_ROW_NAME: string =
  DEFAULT_ROW_NAME_ENTRY === undefined ? '' : DEFAULT_ROW_NAME_ENTRY.text.en

/** CM-26 to CM-35, CM-72 and CM-73 of table T-108. */
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
       * AT-55, the place among the siblings. Not decided anywhere (FR-085 settles
       * only the parent; table T-015a covers moving rows, not making them), so
       * the caller passes it in.
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
   * CM-73 -- where HF-15's drag lands a row.
   *
   * One command for both axes: a single drag can write `parentId` and `order`
   * together, and two commands would be two undo steps for one gesture (FR-031).
   * Not `reorderTaskGroupSiblings` widened: that one is HM-8's siblings only, and
   * one row of table T-108 meaning two things is what R3.4 refuses.
   */
  | {
      readonly kind: 'moveTaskGroup'
      readonly groupId: string
      /** Where it lands. Null is the top level, which FR-085 allows. */
      readonly parentId: string | null
      /** AT-55, the place among its new siblings, counted from 0. */
      readonly order: number
    }
  /**
   * CM-72. No field: every collapsed row is the target. The zoom and place of a
   * fit press are CM-71, in the presentation aggregate.
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
 * How deep a row sits, counting the top level as 1 (IV-5, `S-125`).
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
 * The seeds plus every WBS descendant of them (CD-1 of table T-050, DU-1 of
 * table T-223). A descendant may sit on a different row (HM-10).
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
 * Every row's place in the row tree (HM-9): a preorder walk of AT-52's
 * `parentId` taking siblings in AT-55's `order`. A rank, not a `y`, so pinned,
 * folded and hidden rows keep their place.
 *
 * Written here because the same walk in `schedule.ts` is file-local (table T-064
 * publishes no entry for it) and the translator's is in an outer layer (LR-1);
 * change the copies together.
 *
 * @purity pure
 */
function rowTreeRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
  const childrenOf = new Map<string | null, TaskGroup[]>()
  const holds = new Set(groups.map((one) => one.id))
  for (const one of groups) {
    const parent = one.parentId !== null && holds.has(one.parentId) ? one.parentId : null
    const kin = childrenOf.get(parent)
    if (kin === undefined) childrenOf.set(parent, [one])
    else kin.push(one)
  }
  for (const kin of childrenOf.values()) kin.sort((a, b) => a.order - b.order)

  const rankById = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const one of childrenOf.get(parent) ?? []) {
      if (rankById.has(one.id)) continue
      rankById.set(one.id, rankById.size)
      walk(one.id)
    }
  }
  walk(null)
  // A row a `parentId` ring makes unreachable is appended rather than dropped --
  // IV-5 is where that ring is reported, and every row still needs a rank.
  for (const one of groups) if (!rankById.has(one.id)) rankById.set(one.id, rankById.size)
  return rankById
}

/**
 * `ST-2` of table T-014, the tie order `HM-9` uses. An absent column sorts as the
 * empty text, so the order stays total; `uid` (unique, AT-24) closes every tie.
 *
 * @purity pure
 */
function compareByStackOrder(left: Task, right: Task): number {
  const text = (a: string | null, b: string | null): number =>
    a === b ? 0 : (a ?? '') < (b ?? '') ? -1 : 1
  const byStart = text(left.start, right.start)
  if (byStart !== 0) return byStart
  const byFinish = text(left.finish, right.finish)
  if (byFinish !== 0) return -byFinish
  return left.uid - right.uid
}

/**
 * `AT-26` rebuilt from the row tree (`HM-9` of table T-015a).
 *
 * The row is the one that DRAWS the Task, read off `Schedule.taskGroupMembers`
 * (ET-5); `TaskGroup.derivedFromTaskUid` is not consulted. Only `AT-26` (a
 * `Consume` column) is rebuilt; `wbsParentUid` is not touched (HM-3).
 *
 * A Task on no row is ranked after every ranked one rather than dropped: that is
 * a broken document (IV-6) kept deterministic.
 *
 * Exported for CM-19 in edit-task.ts, which rewrites the membership this reads,
 * so it does not need another walk of its own.
 *
 * @purity pure
 */
export function tasksRankedByTheRowTree(schedule: Schedule): readonly Task[] {
  if (schedule.tasks.length === 0) return schedule.tasks
  const rankById = rowTreeRankById(schedule.taskGroups)
  const rowOfTask = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const rankOf = (task: Task): number => {
    const row = rowOfTask.get(task.uid)
    const rank = row === undefined ? undefined : rankById.get(row)
    return rank === undefined ? rankById.size : rank
  }
  const family = new Map<number | null, Task[]>()
  for (const task of schedule.tasks) {
    const kin = family.get(task.wbsParentUid)
    if (kin === undefined) family.set(task.wbsParentUid, [task])
    else kin.push(task)
  }
  const placeOf = new Map<number, number>()
  for (const kin of family.values()) {
    const ordered = [...kin].sort((a, b) => {
      const byRow = rankOf(a) - rankOf(b)
      return byRow !== 0 ? byRow : compareByStackOrder(a, b)
    })
    ordered.forEach((task, at) => placeOf.set(task.uid, at))
  }
  // A Task already holding its rank comes through untouched (FR-063, see the header).
  return schedule.tasks.map((task) => {
    const at = placeOf.get(task.uid)
    return at === undefined || task.wbsOrder === at ? task : { ...task, wbsOrder: at }
  })
}

/**
 * A document whose rows have just moved, with `AT-26` back in step (`HM-9`).
 *
 * @purity pure
 */
function withWbsOrderFollowingTheRows(document: Document, rows: readonly TaskGroup[]): Document {
  const moved = withSchedule(document, { taskGroups: rows })
  return withSchedule(moved, { tasks: tasksRankedByTheRowTree(moved.schedule) })
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
      // IV-1: uniqueness spans the array, which the generated schema cannot see.
      if (byId.has(command.id)) {
        refusals.push(reject('CM-26', 'IV-1', `a row already holds the id ${command.id}`))
      }
      if (!Number.isInteger(command.order)) {
        refusals.push(reject('CM-26', 'AT-55', `order is not an integer: ${command.order}`))
      }
      // FR-058 / AT-54
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
          // FR-085; the value is S-125.
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

      // The remaining columns start absent, which FR-042 gives a meaning: no
      // `color` follows the theme, no `height` follows the stack count (ST-9).
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
      // CD-2 of table T-050.
      //
      // The last row is not kept alive (table T-050's invariant). The document
      // not being empty afterwards is enforced where every road that can empty it
      // meets, `document-change-plan.ts` (WS-3 of table T-067), not per road.
      const doomedRows = new Set(doomed.rows.map((one) => one.id))
      const seeds = schedule.taskGroupMembers
        .filter((member) => doomedRows.has(member.groupId))
        .map((member) => member.taskUid)
      const doomedTasks = withWbsDescendants(schedule.tasks, seeds)

      // FR-032: only surviving rows need their name settled, and they exist
      // because CD-1 reaches Tasks on other rows.
      const kept: TaskGroup[] = []
      for (const row of groups) {
        if (doomedRows.has(row.id)) continue
        if (row.derivedFromTaskUid === null || !doomedTasks.has(row.derivedFromTaskUid)) {
          kept.push(row)
          continue
        }
        // A row already carrying a `label` settles on the one it shows (FR-058);
        // with neither, the default name (FR-032). Refusing here instead would
        // block deleting any Task FR-001 raised nameless.
        const settled =
          row.label ?? taskByUid(schedule, row.derivedFromTaskUid)?.name ?? DEFAULT_ROW_NAME
        kept.push({ ...row, label: settled, derivedFromTaskUid: null })
      }

      const survivors = schedule.tasks
        .filter((task) => !doomedTasks.has(task.uid))
        .map((task) => {
          // CD-1: DF-4 nests a dependency under its successor, so only the
          // predecessor side is left to sweep.
          const held = task.dependencies.filter((one) => !doomedTasks.has(one.predecessorUid))
          return held.length === task.dependencies.length ? task : { ...task, dependencies: held }
        })

      // CD-2: pins go (S-126) and the display position returns to null (S-78),
      // which OP-10 of table T-024a knows how to read.
      const pinned = settings.pinnedGroupIds.filter((one) => !doomedRows.has(one))
      const scrollGroupId =
        settings.scrollGroupId !== null && doomedRows.has(settings.scrollGroupId)
          ? null
          : settings.scrollGroupId
      const documentSettings =
        pinned.length !== settings.pinnedGroupIds.length || scrollGroupId !== settings.scrollGroupId
          ? { ...settings, pinnedGroupIds: pinned, scrollGroupId }
          : settings

      // `baselineTasks` is not swept: the baseline matches on `uid` rather than
      // referencing (FR-015). `resources` neither: FR-008 keeps them.
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

      // FR-033: the target's depth plus the subtree's height is the deepest
      // point after the paste, because the copied root becomes its child.
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
        // GAP: DU-2 puts copies on the copied rows, and the note under table
        // T-223 limits the same-row rule to copying a Task alone, so a WBS
        // descendant HM-10 left outside the copy has no row named for it.
        // Refusing decides nothing; any row would be one the table never named.
        refusals.push(
          reject(
            'CM-28',
            'DU-2',
            `DU-1 pulls in Tasks ${homeless.join(', ')}, which sit on no copied row, and DU-2 does not say which row their copies land on`,
          ),
        )
      }
      if (refusals.length > 0) return refused(refusals)

      // FR-033's ST-7 safety valve is not reached by this command, so no stacks
      // are counted here: DU-2 puts every copy on a copied row, which carries the
      // same Tasks and so the same stack count as the row it copies.
      //
      // A copied column keeps its value unless identity forces otherwise: only
      // the id, the uid, the copied root's `parentId` and references into the
      // copied set move. `order` and an outside `wbsParentUid` are carried over,
      // because nothing states otherwise.
      let mark = schedule.project.uidHighWaterMark
      const uidOf = new Map<number, number>()
      // FR-001 / FR-008. Sorted, so the same paste yields the same document.
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
          // FR-033
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

      // Nothing is added to `taskOrigins` (DU-1), the annotations or
      // `pinnedGroupIds` (DU-2).
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
      // FR-058 / AT-54
      if (command.label === null && row.derivedFromTaskUid === null) {
        return refused([
          reject('CM-29', 'FR-058', 'a row may hold neither a name nor a derivation source (AT-54)'),
        ])
      }
      if (row.label === command.label) return edited(document)
      // `derivedFromTaskUid` is left alone: it is the fallback when the name is
      // taken away again (FR-058).
      return edited(withRow(document, { ...row, label: command.label }))
    }

    case 'setTaskGroupColor': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-30', 'FR-042', `no such row: ${command.groupId}`)])
      }
      // GAP: not checked against CL-1 of table T-017 (FR-007), because CL-1
      // names its colours in Japanese prose and only `'transparent'` (P-19) has
      // a settled spelling; the schema types the column as a plain string.
      //
      // This command never writes null: resetting is CM-31, and transparent is
      // not a reset (FR-007).
      if (row.color === command.color) return edited(document)
      return edited(withRow(document, { ...row, color: command.color }))
    }

    case 'resetTaskGroupColor': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-31', 'FR-007', `no such row: ${command.groupId}`)])
      }
      // FR-007
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
      // A height below what the stacks need is accepted: FR-042 makes it a floor
      // widened where the band is measured, not refused here.
      //
      // null returns to the automatic height (FR-042) through this command,
      // because table T-108 has no reset row for the height.
      if (row.height === command.height) return edited(document)
      return edited(withRow(document, { ...row, height: command.height }))
    }

    case 'setTaskGroupCollapsed': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-33', 'FR-004', `no such row: ${command.groupId}`)])
      }
      // Only the column moves; what a collapsed row hides is HR-1a's, for
      // whoever draws, so `taskGroupMembers` is not touched.
      if (row.isCollapsed === command.collapsed) return edited(document)
      return edited(withRow(document, { ...row, isCollapsed: command.collapsed }))
    }

    case 'setTaskGroupHidden': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-34', 'FR-004', `no such row: ${command.groupId}`)])
      }
      // HR-6; as with HR-1a, nothing is re-parented.
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
      // HM-8 reorders siblings; moving a row to another parent is CM-73's.
      if (asked.size !== siblings.length || !siblings.every((one) => asked.has(one.id))) {
        refusals.push(
          reject('CM-35', 'HM-8', 'the list must name every child of that parent, and no other row'),
        )
      }
      if (refusals.length > 0) return refused(refusals)

      // AT-55's numbers carry only the sequence, so the rank in the list is written.
      const rank = new Map(command.orderedIds.map((id, at) => [id, at]))
      const ordered = groups.map((one) => {
        const place = rank.get(one.id)
        return place === undefined || place === one.order ? one : { ...one, order: place }
      })
      if (ordered.every((one, at) => one === groups[at])) return edited(document)
      // HM-9: `AT-26` is rebuilt from the renumbered rows; `wbsParentUid` is not
      // written (HM-3).
      return edited(withWbsOrderFollowingTheRows(document, ordered))
    }

    case 'moveTaskGroup': {
      const moved = byId.get(command.groupId)
      if (moved === undefined) {
        return refused([reject('CM-73', 'FR-005', `no such row: ${command.groupId}`)])
      }
      const refusals: Refusal[] = []
      const parent = command.parentId === null ? null : byId.get(command.parentId)
      if (command.parentId !== null && parent === undefined) {
        refusals.push(reject('CM-73', 'FR-005', `no such parent row: ${command.parentId}`))
      }
      // Read once for both HM-4 (rows that may not be the parent) and HM-3a
      // (the height against `S-125`).
      const carried = subtreeOf(groups, command.groupId)
      if (carried === null) {
        return refused([reject('CM-73', 'FR-005', `no such row: ${command.groupId}`)])
      }
      // HM-4
      if (command.parentId !== null && carried.rows.some((one) => one.id === command.parentId)) {
        refusals.push(
          reject('CM-73', 'HM-4', 'a row may not be moved under itself or its own descendant'),
        )
      }
      // HM-3a: a move to the top level puts the row at depth 1, so the parent's
      // depth counts as 0.
      const under = parent === undefined || parent === null ? 0 : depthOf(byId, parent)
      if (under + carried.height > settings.maxGroupDepth) {
        refusals.push(
          reject(
            'CM-73',
            'HM-3a',
            `the move would reach depth ${under + carried.height}, ` +
              `past S-125's ${settings.maxGroupDepth}`,
          ),
        )
      }
      if (refusals.length > 0) return refused(refusals)

      // HM-5: only `parentId` and `order` are written. The subtree follows
      // (HF-15) without a write, because every descendant names its own parent.
      const landing = Math.max(0, Math.trunc(command.order))
      const stays = groups.filter(
        (one) => one.id !== command.groupId && one.parentId === command.parentId,
      )
      const placed = [...stays.slice(0, landing), moved, ...stays.slice(landing)]
      const rank = new Map(placed.map((one, at) => [one.id, at]))
      // The siblings it left are renumbered too, so no parent's children keep a
      // gap (AT-55), as the reorder above writes the rank.
      const left = groups.filter(
        (one) => one.id !== command.groupId && one.parentId === moved.parentId,
      )
      const leftRank = new Map(left.map((one, at) => [one.id, at]))
      const next = groups.map((one) => {
        if (one.id === command.groupId) {
          const at = rank.get(one.id) ?? landing
          return one.parentId === command.parentId && one.order === at
            ? one
            : { ...one, parentId: command.parentId, order: at }
        }
        const place = rank.get(one.id) ?? leftRank.get(one.id)
        return place === undefined || place === one.order ? one : { ...one, order: place }
      })
      if (next.every((one, at) => one === groups[at])) return edited(document)
      // HM-9, as in the reorder above.
      return edited(withWbsOrderFollowingTheRows(document, next))
    }

    case 'expandAllTaskGroups': {
      // `isHidden` stays: only the collapse is discarded (HF-8, HR-6).
      //
      // One command rather than a loop of CM-33, so one press is one undo step
      // (UN-17) whatever the row count.
      //
      // `null` is not a collapse (AT-56): a row that never held one is left as
      // it is, so a document nobody collapsed comes back untouched.
      const opened = groups.map((one) =>
        one.isCollapsed === true ? { ...one, isCollapsed: false } : one,
      )
      if (opened.every((one, at) => one === groups[at])) return edited(document)
      return edited(withSchedule(document, { taskGroups: opened }))
    }
  }
}
