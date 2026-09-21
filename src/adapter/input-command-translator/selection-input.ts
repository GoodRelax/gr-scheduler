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
  pressRowOf,
  type GrabRow,
  type InputContext,
} from './input-command-translator'

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
  }
}

/** @purity pure */
function everythingSelectable(context: InputContext): readonly ItemRef[] {
  const geometry = context.geometry
  const schedule = context.document.schedule
  const all: ItemRef[] = []
  for (const task of geometry.tasks) {
    all.push({ kind: 'task', uid: task.taskUid })
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

  const press = context.pressed
  if (press === null) return held
  if (press.on !== null) return held
  if (!isOnRowArea(context, press.at.x, press.at.y)) return held

  const isAdding = press.at.modifiers.shift

  switch (pressRowOf(press, context)) {
    case 'PTD-3': {
      const grab: GrabRow | null = press.hit === null ? null : grabRowOf(press.hit)
      const ref = press.hit === null ? null : itemRefOf(context.document.schedule, press.hit.item)
      if (ref === null || grab === null) return held
      if (grab === 'GA-20' && !hasDraggedPastThreshold(press, input)) return held
      if (isAdding) {
        return isSelected(held, ref) ? selectionWithout(held, ref) : selectionWith(held, ref)
      }
      const isWholeMoved =
        BODY_GRAB_ROWS.has(grab) && isSelected(held, ref) && hasDraggedPastThreshold(press, input)
      return isWholeMoved ? held : selectionWith(emptySelection(), ref)
    }
    case 'PTD-5': {
      const rect = marqueeRect(press.at, input)
      if (rect.width === 0 && rect.height === 0) {
        return isAdding ? held : emptySelection()
      }
      const caught: ItemRef[] = []
      for (const item of itemsInMarquee(context.geometry, rect)) {
        const ref = itemRefOf(context.document.schedule, item)
        if (ref !== null) caught.push(ref)
      }
      return isAdding ? selectionOfAll([...held.items, ...caught]) : selectionOfAll(caught)
    }
    default:
      return held
  }
}
