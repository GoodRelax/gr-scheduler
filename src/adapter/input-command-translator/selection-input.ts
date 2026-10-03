// InputCommandTranslator -- decides the next selection from an input by table T-023c.
// @unit      UF-101  (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { escapeTarget } from '../../entity/document-model/screen-state/screen-state'
import {
  taskByUid,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import {
  selectionOfAll,
  selectionWith,
  selectionWithout,
  emptySelection,
  isSelected,
  type ItemRef,
  type Selection,
} from '../../entity/document-model/selection/selection'
import {
  isTaskDrawn,
  itemsInMarquee,
  type Item,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type {
  HumanInput,
  PointerInput,
} from './input-source'
import {
  KEY,
  escapeContextOf,
  grabRowOf,
  hasDraggedPastThreshold,
  isCombo,
  isOnRowArea,
  isParentPickingCtrlClick,
  isSwallowedSecondPress,
  pressRowOf,
  type GrabRow,
  type InputContext,
  type PointerPress,
} from './input-command-translator'
import { isContinuationMarkClick } from './item-grab'

// see PE-1, PE-6
const BODY_GRAB_ROWS: ReadonlySet<string> = new Set(['GA-9', 'GA-14', 'GA-15'])

/** @purity pure */
function itemRefOf(schedule: Schedule, item: Item): ItemRef | null {
  switch (item.kind) {
    case 'task':
      return { kind: 'task', uid: item.taskUid }
    case 'dependency': {
      const successor = taskByUid(schedule, item.successorUid)
      if (successor === null) return null
      const ordinal = successor.dependencies.findIndex(
        (one) => one.predecessorUid === item.predecessorUid,
      )
      return ordinal < 0 ? null : { kind: 'dependency', successorUid: item.successorUid, ordinal }
    }
    case 'highlightBox':
      return { kind: 'highlightBox', id: item.id }
    case 'commentBox':
      return { kind: 'commentBox', id: item.id }
    case 'statusLine':
      return { kind: 'statusLine' }
    case 'wbsParentLink':
      return item.isStated ? { kind: 'wbsParentLink', childUid: item.childUid } : null
  }
}

// see SL-2, T-023c
// WHY: the progress marker of a Task nothing else draws still answers its own act (JDG-187); it picks nothing.
/** @purity pure */
function pickableRefOf(context: InputContext, item: Item): ItemRef | null {
  if (item.kind !== 'task') return itemRefOf(context.document.schedule, item)
  const isDrawn = context.geometry.tasks.some((task) => task.taskUid === item.taskUid && isTaskDrawn(task))
  return isDrawn ? itemRefOf(context.document.schedule, item) : null
}

// see SL-5, T-023c
/** @purity pure */
function everythingSelectable(context: InputContext): readonly ItemRef[] {
  const geometry = context.geometry
  const schedule = context.document.schedule
  const all: ItemRef[] = []
  for (const task of geometry.tasks) {
    if (isTaskDrawn(task)) all.push({ kind: 'task', uid: task.taskUid })
  }
  for (const line of geometry.dependencies) {
    const ref = itemRefOf(schedule, {
      kind: 'dependency',
      predecessorUid: line.predecessorUid,
      successorUid: line.successorUid,
    })
    if (ref !== null) all.push(ref)
  }
  for (const box of geometry.commentBoxes) {
    all.push({ kind: 'commentBox', id: box.id })
  }
  for (const box of geometry.highlightBoxes) {
    all.push({ kind: 'highlightBox', id: box.id })
  }
  if (geometry.statusLine !== null) all.push({ kind: 'statusLine' })
  return all
}

/** @purity pure */
function marqueeRect(from: PointerInput, to: PointerInput): ScreenRect {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  }
}

// see EL-18, T-023c
// WHY: a press on a surface part, and the second press EL-18 swallows, leave the selection as it is.
/** @purity pure */
function chartPressOf(context: InputContext): PointerPress | null {
  const press = context.pressed
  if (press === null || press.on !== null) return null
  return isSwallowedSecondPress(press, context) ? null : press
}

// see T-023a, SL-4, WL-3, WL-10
/** @purity pure */
function pickRowOf(press: PointerPress, release: PointerInput, context: InputContext): string {
  return isParentPickingCtrlClick(press, release, context) ? 'PTD-3' : pressRowOf(press, context)
}

// see SL-7, WL-5
/** @purity pure */
function isChoiceKeptByDrag(grab: GrabRow, ref: ItemRef, press: PointerPress, release: PointerInput,
                           context: InputContext): boolean {
  const isArmedForParents = context.screen.armModeState.kind === 'wbsParentArmed'
  const isDragGrab = BODY_GRAB_ROWS.has(grab) || isArmedForParents
  return isDragGrab && isSelected(context.selection, ref) && hasDraggedPastThreshold(press, release)
}

// see SL-3
/** @purity pure */
function caughtInMarquee(context: InputContext, rect: ScreenRect): readonly ItemRef[] {
  return itemsInMarquee(context.geometry, rect).flatMap((item) => itemRefOf(context.document.schedule, item) ?? [])
}

// see T-023c
/** @purity pure */
export function selectionFromInput(input: HumanInput, context: InputContext): Selection {
  const held = context.selection

  if (input.kind === 'key') {
    const isSelectAll = isCombo(input.modifiers, true, false, false) && input.key === KEY.a
    if (isSelectAll && !context.isTextEntryUnsettled) {
      return selectionOfAll(everythingSelectable(context))
    }
    if (
      isCombo(input.modifiers, false, false, false) &&
      input.key === KEY.escape &&
      escapeTarget(escapeContextOf(context)) === 'selection'
    ) {
      return emptySelection()
    }
    if (
      isCombo(input.modifiers, false, false, false) &&
      input.key === KEY.enter &&
      context.isNoticeStanding !== true &&
      !context.isTextEntryUnsettled &&
      context.isPropertiesPanelShowing !== true
    ) {
      return emptySelection()
    }
    return held
  }
  if (input.kind !== 'pointer' || input.phase !== 'up') return held

  const press = chartPressOf(context)
  if (press === null) return held
  if (!isOnRowArea(context, press.at.x, press.at.y)) return held

  const isAdding = press.at.modifiers.shift || isParentPickingCtrlClick(press, input, context)

  switch (pickRowOf(press, input, context)) {
    case 'PTD-3': {
      const grab: GrabRow | null = press.hit === null ? null : grabRowOf(press.hit)
      const ref = press.hit === null ? null : pickableRefOf(context, press.hit.item)
      if (isContinuationMarkClick(press, input)) return emptySelection()
      if (ref === null || grab === null) return held
      if (grab === 'GA-20' && !hasDraggedPastThreshold(press, input)) return held
      if (isAdding) {
        return isSelected(held, ref) ? selectionWithout(held, ref) : selectionWith(held, ref)
      }
      return isChoiceKeptByDrag(grab, ref, press, input, context) ? held : selectionWith(emptySelection(), ref)
    }
    case 'PTD-5': {
      const rect = marqueeRect(press.at, input)
      if (rect.width === 0 && rect.height === 0) {
        return isAdding ? held : emptySelection()
      }
      const caught = caughtInMarquee(context, rect)
      return isAdding ? selectionOfAll([...held.items, ...caught]) : selectionOfAll(caught)
    }
    default:
      return held
  }
}
