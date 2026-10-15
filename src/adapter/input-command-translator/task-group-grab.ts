// InputCommandTranslator -- a grabbed task group carried by HF-15 and landed as one parent-and-order write.
// @unit      UF-97   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import type { TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import { displayRatioOf, type ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { PointerInput, WheelInput } from './input-source'
import {
  CONSUMED_ELSEWHERE,
  NOT_STORED_TASK_GROUP_GRAB_SIZES,
  UNASSIGNED,
  acted,
  changed,
  hasDraggedPastThreshold,
  isCombo,
  taskGroupGrabDepthOf,
  type InputContext,
  type PointerPress,
  type TaskGroupGrabLanding,
  type TranslatedInput,
} from './input-command-translator'
import { taskGroupTurnedTo } from './wheel-input'

export type { TaskGroupGrabLanding } from './input-command-translator'

interface TaskGroupGrabTree {
  readonly byId: ReadonlyMap<string, TaskGroup>
  readonly childrenOf: ReadonlyMap<string | null, readonly TaskGroup[]>
  readonly heldId: string
}

interface TaskGroupGrabRow {
  readonly taskGroup: TaskGroup
  readonly depth: number
  readonly box: ScreenRect
}

/** @purity pure */
function taskGroupGrabTreeOf(taskGroups: readonly TaskGroup[], heldId: string): TaskGroupGrabTree {
  const byId = new Map(taskGroups.map((one) => [one.id, one]))
  const childrenOf = new Map<string | null, TaskGroup[]>()
  for (const one of taskGroups) {
    const siblings = childrenOf.get(one.parentId) ?? []
    siblings.push(one)
    childrenOf.set(one.parentId, siblings)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)
  return { byId, childrenOf, heldId }
}

// TRAP: CM-73 reads a rank among the siblings with the held one taken out, not the `order` column.
/** @purity pure */
function siblingsWithoutHeld(tree: TaskGroupGrabTree, parentId: string | null): readonly TaskGroup[] {
  return (tree.childrenOf.get(parentId) ?? []).filter((one) => one.id !== tree.heldId)
}

/** @purity pure */
function heldSubtreeOf(tree: TaskGroupGrabTree): { readonly ids: ReadonlySet<string>; readonly height: number } {
  const ids = new Set<string>()
  let level: readonly string[] = [tree.heldId]
  let height = 0
  while (level.length > 0) {
    height += 1
    for (const id of level) ids.add(id)
    level = level.flatMap((id) => (tree.childrenOf.get(id) ?? []).map((one) => one.id)).filter((id) => !ids.has(id))
  }
  return { ids, height }
}

// see HF-15, HR-6, FR-018, FR-098
// WHY: only the drawn rows count; a pinned row stands at the panel head, not at its place in the tree.
/** @purity pure */
function taskGroupGrabRowsOf(context: InputContext, tree: TaskGroupGrabTree, held: ReadonlySet<string>): readonly TaskGroupGrabRow[] {
  const pinned = new Set(context.document.documentSettings.pinnedTaskGroupIds)
  const rows: TaskGroupGrabRow[] = []
  for (const entry of context.drawnTaskGroupBoxes ?? []) {
    const taskGroup = tree.byId.get(entry.taskGroupId)
    if (taskGroup === undefined || held.has(taskGroup.id) || pinned.has(taskGroup.id)) continue
    rows.push({ taskGroup, depth: taskGroupGrabDepthOf(tree.byId, taskGroup), box: entry.box })
  }
  return rows
}

/** @purity pure */
function taskGroupGrabPlaceOf(
  tree: TaskGroupGrabTree,
  above: TaskGroupGrabRow | null,
  depth: number,
): { readonly parentId: string | null; readonly order: number } {
  if (above === null) return { parentId: null, order: 0 }
  if (depth === above.depth + 1) {
    // WHY: into a collapsed task group as its last child, kept collapsed; an open one takes it first.
    const isCollapsed = above.taskGroup.treeState === 'collapsed'
    return { parentId: above.taskGroup.id, order: isCollapsed ? siblingsWithoutHeld(tree, above.taskGroup.id).length : 0 }
  }
  let branch = above.taskGroup
  for (let at = above.depth; at > depth; at--) {
    const parent = branch.parentId === null ? undefined : tree.byId.get(branch.parentId)
    if (parent === undefined) break
    branch = parent
  }
  const rank = siblingsWithoutHeld(tree, branch.parentId).findIndex((one) => one.id === branch.id)
  return { parentId: branch.parentId, order: rank + 1 }
}

// TRAP: the DRAWN S-37 (DS-1), or the line falls behind the hand by the display ratio.
/** @purity pure */
function drawnTaskGroupIndentOf(context: InputContext): number {
  return SETTINGS_CONSTANTS.taskGroupTitleIndent * displayRatioOf(context.document.documentSettings)
}

// see HF-15, S-37, FR-004, HM-3a
/** @purity pure */
export function taskGroupGrabLandingAt(
  context: InputContext,
  heldGroupId: string,
  at: { readonly x: number; readonly y: number },
  press: PointerPress,
): TaskGroupGrabLanding | null {
  const tree = taskGroupGrabTreeOf(context.document.schedule.taskGroups, heldGroupId)
  const held = tree.byId.get(heldGroupId)
  if (held === undefined) return null
  const subtree = heldSubtreeOf(tree)
  const rows = taskGroupGrabRowsOf(context, tree, subtree.ids)
  const gap = rows.filter((row) => row.box.y + row.box.height / 2 < at.y).length
  const above = rows[gap - 1] ?? null
  const below = rows[gap] ?? null
  const lowest = below === null ? 1 : below.depth
  // WHY: only the held task group itself stays within S-125; a subtree reaching past it is asked on release (QN-16).
  const highest = Math.min(above === null ? 1 : above.depth + 1, SETTINGS_CONSTANTS.maxGroupDepth)
  if (highest < lowest) return null
  const indent = drawnTaskGroupIndentOf(context)
  const steps = indent > 0 ? Math.round((at.x - press.at.x) / indent) : 0
  const depth = Math.max(lowest, Math.min(highest, taskGroupGrabDepthOf(tree.byId, held) + steps))
  const gapY = above !== null ? above.box.y + above.box.height : (below?.box.y ?? at.y)
  const isPastDepthCap = depth + subtree.height - 1 > SETTINGS_CONSTANTS.maxGroupDepth
  return { ...taskGroupGrabPlaceOf(tree, above, depth), depth, gapY, lineIndentPx: depth * indent, isPastDepthCap }
}

type TaskGroupMove = Extract<DocumentCommand, { readonly kind: 'moveTaskGroup' }>

interface TaskGroupLift {
  readonly taskGroupId: string
  readonly parentId: string | null
  readonly afterId: string
}

// see HF-15, QN-16
/** @purity pure */
function taskGroupLiftsOf(tree: TaskGroupGrabTree, landing: Pick<TaskGroupGrabLanding, 'parentId' | 'depth'>): readonly TaskGroupLift[] {
  const cap = SETTINGS_CONSTANTS.maxGroupDepth
  const lifts: TaskGroupLift[] = []
  const chain: (string | null)[] = []
  chain[landing.depth - 1] = landing.parentId
  const walk = (id: string, depth: number): void => {
    chain[depth] = id
    const parentId = chain[cap - 1]
    const afterId = chain[cap]
    if (depth > cap && parentId !== undefined && afterId !== undefined && afterId !== null) lifts.push({ taskGroupId: id, parentId, afterId })
    for (const child of tree.childrenOf.get(id) ?? []) walk(child.id, depth + 1)
  }
  walk(tree.heldId, landing.depth)
  return lifts
}

// see HF-15, CM-73
/** @purity pure */
function withChildPlaced(childIds: Map<string | null, string[]>, id: string, from: string | null, to: string | null, at: number): void {
  childIds.set(from, (childIds.get(from) ?? []).filter((one) => one !== id))
  const siblings = childIds.get(to) ?? []
  childIds.set(to, [...siblings.slice(0, at), id, ...siblings.slice(at)])
}

// see HF-15, QN-16, CM-73, HM-3a, HM-12
// WHY: read after the held move, in tree order; each order is CM-73's rank among the new siblings.
/** @purity pure */
export function taskGroupLiftMovesAfter(
  taskGroups: readonly TaskGroup[],
  heldGroupId: string,
  landing: Pick<TaskGroupGrabLanding, 'parentId' | 'order' | 'depth'>,
): readonly TaskGroupMove[] {
  const tree = taskGroupGrabTreeOf(taskGroups, heldGroupId)
  const heldParentId = tree.byId.get(heldGroupId)?.parentId
  if (heldParentId === undefined) return []
  const childIds = new Map([...tree.childrenOf].map(([parentId, children]) => [parentId, children.map((one) => one.id)]))
  withChildPlaced(childIds, heldGroupId, heldParentId, landing.parentId, landing.order)
  const lastPlacedAfter = new Map<string, string>()
  const commands: TaskGroupMove[] = []
  for (const lift of taskGroupLiftsOf(tree, landing)) {
    const from = tree.byId.get(lift.taskGroupId)?.parentId ?? null
    const siblings = (childIds.get(lift.parentId) ?? []).filter((id) => id !== lift.taskGroupId)
    const order = siblings.indexOf(lastPlacedAfter.get(lift.afterId) ?? lift.afterId) + 1
    withChildPlaced(childIds, lift.taskGroupId, from, lift.parentId, order)
    lastPlacedAfter.set(lift.afterId, lift.taskGroupId)
    commands.push({ kind: 'moveTaskGroup', taskGroupId: lift.taskGroupId, parentId: lift.parentId, order })
  }
  return commands
}

// see HF-15, S-597, S-598
/** @purity pure */
export function taskGroupGrabScrollSpeedAt(pointerY: number, panelTop: number, panelBottom: number): number {
  const band = NOT_STORED_TASK_GROUP_GRAB_SIZES['S-597']
  const fastest = NOT_STORED_TASK_GROUP_GRAB_SIZES['S-598']
  if (!(band > 0)) return 0
  const fromTop = pointerY - panelTop
  if (fromTop < band) return -fastest * Math.min(1, (band - fromTop) / band)
  const fromBottom = panelBottom - pointerY
  if (fromBottom < band) return fastest * Math.min(1, (band - fromBottom) / band)
  return 0
}

// see HF-15, MK-1
// WHY: WS-2 refuses a write mid-gesture, so the turn is handed to the shell to hold until release.
/** @purity pure */
export function taskGroupGrabWheel(input: WheelInput, context: InputContext): TranslatedInput | null {
  const press = context.pressed
  if (press === null || grabbedTaskGroupId(press) === null) return null
  if (!isCombo(input.modifiers, false, false, false) || input.scrollPx.y === 0) return CONSUMED_ELSEWHERE
  return acted({ kind: 'scrollTaskGroupGrab', to: taskGroupTurnedTo(context, input.scrollPx.y) })
}

/** @purity pure */
export function grabbedTaskGroupId(press: PointerPress): string | null {
  const on = press.on
  // TRAP: a pinned task group is refused only because the surface draws no strip on it.
  if (on === null || on.isTaskGroupGrabStrip !== true) return null
  return on.taskGroupId
}

// WHY: once carried, a hand brought back within S-208 still carries; it no longer chooses.
/** @purity pure */
function isTaskGroupGrabCarried(press: PointerPress, at: PointerInput): boolean {
  return press.isTaskGroupGrabCarried === true || hasDraggedPastThreshold(press, at)
}

// see HF-15
/** @purity pure */
export function taskGroupGrabFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null) return UNASSIGNED
  const taskGroupId = grabbedTaskGroupId(press)
  // WHY: a caller that does not record the carry cannot hold it (as `paletteFollow` refuses).
  if (taskGroupId === null || press.isTaskGroupGrabCarried === undefined) return UNASSIGNED
  if (!isTaskGroupGrabCarried(press, input)) return UNASSIGNED
  const area = context.regions.taskGroupArea
  return acted({
    kind: 'followTaskGroupGrab',
    taskGroupId,
    landing: taskGroupGrabLandingAt(context, taskGroupId, input, press),
    scrollSpeed: taskGroupGrabScrollSpeedAt(input.y, area.y, area.y + area.height),
  })
}

/** @purity pure */
function isWhereItStands(context: InputContext, heldTaskGroupId: string, landing: TaskGroupGrabLanding): boolean {
  const taskGroups = context.document.schedule.taskGroups
  const held = taskGroups.find((one) => one.id === heldTaskGroupId)
  if (held === undefined || held.parentId !== landing.parentId) return false
  const siblings = taskGroups.filter((one) => one.parentId === held.parentId).sort((a, b) => a.order - b.order)
  return siblings.findIndex((one) => one.id === heldTaskGroupId) === landing.order
}

const DEPTH_CAP_QUESTION = 'QN-16'

// see HF-15, FR-085, CM-73, QN-16
/** @purity pure */
export function commandFromRowGrab(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
  heldTaskGroupId: string,
): TranslatedInput {
  if (!isTaskGroupGrabCarried(press, release)) {
    return acted({
      kind: 'chooseTaskGroup',
      taskGroupId: heldTaskGroupId,
      isExtending: press.at.modifiers.shift,
    })
  }
  const landing = taskGroupGrabLandingAt(context, heldTaskGroupId, release, press)
  // WHY: not written: an accepted write marks unsaved edits even if nothing moved.
  if (landing === null || isWhereItStands(context, heldTaskGroupId, landing)) return CONSUMED_ELSEWHERE
  const move: TaskGroupMove = { kind: 'moveTaskGroup', taskGroupId: heldTaskGroupId, parentId: landing.parentId, order: landing.order }
  if (!landing.isPastDepthCap) return changed([move])
  // WHY: one write, so Yes lands it as one undo step; ApplyDocumentChange holds S-125 at its end (HM-3a).
  const lifts = taskGroupLiftMovesAfter(context.document.schedule.taskGroups, heldTaskGroupId, landing)
  return acted({ kind: 'changeDocument', writes: [[move, ...lifts]], question: DEPTH_CAP_QUESTION })
}
