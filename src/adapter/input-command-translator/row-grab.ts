// InputCommandTranslator -- a grabbed row carried by HF-15 and landed as an order or depth write.
// @unit      UF-97   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import type { TaskGroup } from '../../entity/document-model/schedule/schedule'
import { displayRatioOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { PointerInput } from './input-source'
import {
  CONSUMED_ELSEWHERE,
  NOT_STORED_ROW_GRAB_SIZES,
  UNASSIGNED,
  acted,
  changed,
  nothingToDo,
  rowDepthOfGroup,
  rowGrabDepthOf,
  type InputContext,
  type PointerPress,
  type RowGrabAxis,
  type SpentEntranceSituation,
  type TranslatedInput,
} from './input-command-translator'

/** @purity pure */
function rowGrabSiblings(
  rows: readonly TaskGroup[],
  parentId: string | null,
  heldGroupId: string,
): readonly TaskGroup[] {
  return rows
    .filter((one) => one.id !== heldGroupId && one.parentId === parentId)
    .sort((a, b) => a.order - b.order)
}

/** @purity pure */
function rowGrabSubtreeHeight(rows: readonly TaskGroup[], rootId: string): number {
  let height = 0
  let level: readonly string[] = [rootId]
  const seen = new Set<string>()
  while (level.length > 0) {
    height += 1
    for (const id of level) seen.add(id)
    const above = level
    level = rows
      .filter((one) => !seen.has(one.id) && one.parentId !== null && above.includes(one.parentId))
      .map((one) => one.id)
  }
  return height
}

interface RowGrabLanding {
  readonly parentId: string | null
  readonly order: number
  readonly depth: number
}

interface RowGrabStep {
  readonly landing: RowGrabLanding
  readonly situation: SpentEntranceSituation | null
}

// see HF-15, FR-085
/** @purity pure */
function rowGrabLandingOf(
  context: InputContext,
  heldGroupId: string,
  steps: number,
): RowGrabStep | null {
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const held = byId.get(heldGroupId)
  if (held === undefined) return null

  const cap = context.document.documentSettings.maxGroupDepth
  const height = rowGrabSubtreeHeight(rows, heldGroupId)
  const startSiblings = rows
    .filter((one) => one.parentId === held.parentId)
    .sort((a, b) => a.order - b.order)
  // TRAP: CM-73 reads a rank among siblings, not the `order` column; orders 0, 2, 7 must answer 0, 1, 2.
  const startOrder = Math.max(
    0,
    startSiblings.findIndex((one) => one.id === heldGroupId),
  )
  let landing: RowGrabLanding = {
    parentId: held.parentId,
    order: startOrder,
    depth: rowGrabDepthOf(byId, held),
  }

  const taken = Math.abs(steps)
  const deeper = steps > 0
  for (let step = 0; step < taken; step++) {
    if (deeper) {
      const siblings = rowGrabSiblings(rows, landing.parentId, heldGroupId)
      const above = siblings[landing.order - 1]
      if (above === undefined) return { landing, situation: 'noSiblingAboveToNestUnder' }
      if (rowGrabDepthOf(byId, above) + height > cap) {
        return { landing, situation: 'groupDepthLimitReached' }
      }
      landing = {
        parentId: above.id,
        // TRAP: a count, not `orderPastLastChild` (largest plus one); CM-73 reads a rank.
        order: rowGrabSiblings(rows, above.id, heldGroupId).length,
        depth: landing.depth + 1,
      }
      continue
    }
    if (landing.parentId === null) return { landing, situation: 'rowIsAtTheShallowestLevel' }
    const parent = byId.get(landing.parentId)
    if (parent === undefined) return { landing, situation: null }
    const uncles = rowGrabSiblings(rows, parent.parentId, heldGroupId)
    landing = {
      parentId: parent.parentId,
      order: uncles.findIndex((one) => one.id === parent.id) + 1,
      depth: Math.max(1, landing.depth - 1),
    }
  }
  return { landing, situation: null }
}

interface RowGrabPlace {
  readonly parentId: string | null
  readonly order: number
  readonly atY: number
  readonly isOwn: boolean
}

// see HF-15
/** @purity pure */
function rowGrabPlacesInDrawingOrder(
  context: InputContext,
  heldGroupId: string,
): readonly RowGrabPlace[] {
  const drawn = context.drawnRowBoxes
  if (drawn === undefined) return []
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const held = byId.get(heldGroupId)
  if (held === undefined) return []
  const depth = rowGrabDepthOf(byId, held)
  const parentsWithADrawnChild = new Set<string>()
  for (const entry of drawn) {
    const parentId = byId.get(entry.groupId)?.parentId
    if (parentId !== undefined && parentId !== null) parentsWithADrawnChild.add(parentId)
  }

  const placeOrderOf = (row: TaskGroup): number => {
    const among = rows
      .filter((one) => one.parentId === row.parentId)
      .sort((a, b) => a.order - b.order)
    const at = among.findIndex((one) => one.id === row.id)
    if (at < 0) return 0
    return among.slice(0, at).filter((one) => one.id !== heldGroupId).length
  }

  const places: RowGrabPlace[] = []
  // WHY: two consecutive places with the same landing are merged, or a drag between them never moves.
  const put = (place: RowGrabPlace): void => {
    const last = places[places.length - 1]
    if (last !== undefined && last.parentId === place.parentId && last.order === place.order) return
    places.push(place)
  }

  let runParentId: string | null | undefined = undefined
  let runOrderAfter = 0
  let runBottom = 0
  const closeRun = (): void => {
    if (runParentId === undefined) return
    put({ parentId: runParentId, order: runOrderAfter, atY: runBottom, isOwn: false })
    runParentId = undefined
  }

  for (const entry of drawn) {
    const row = byId.get(entry.groupId)
    if (row === undefined) continue
    const rowDepth = rowGrabDepthOf(byId, row)
    if (rowDepth > depth) continue
    if (rowDepth === depth) {
      if (runParentId !== undefined && runParentId !== row.parentId) closeRun()
      const order = placeOrderOf(row)
      const isOwn = row.id === heldGroupId
      put({ parentId: row.parentId, order, atY: entry.box.y, isOwn })
      runParentId = row.parentId
      // TRAP: not one past the held row; with it taken out, before and after it are one place,
      // and counting past it would hide the end RS-39 is told against.
      runOrderAfter = isOwn ? order : order + 1
      runBottom = entry.box.y + entry.box.height
      continue
    }
    closeRun()
    // TRAP: the one place `treeState` must be read; a collapsed group has no drawn child to hide it.
    if (
      depth > 1 &&
      rowDepth === depth - 1 &&
      row.treeState !== 'collapsed' &&
      !parentsWithADrawnChild.has(row.id)
    ) {
      put({ parentId: row.id, order: 0, atY: entry.box.y + entry.box.height, isOwn: false })
    }
  }
  closeRun()
  return places
}

// see HF-15, RS-39
/** @purity pure */
function rowGrabPositionOf(
  context: InputContext,
  heldGroupId: string,
  travelY: number,
): { readonly place: RowGrabPlace; readonly situation: SpentEntranceSituation | null } | null {
  const drawn = context.drawnRowBoxes
  if (drawn === undefined) return null
  const heldBox = drawn.find((one) => one.groupId === heldGroupId)?.box
  if (heldBox === undefined) return null
  const places = rowGrabPlacesInDrawingOrder(context, heldGroupId)
  const ownAt = places.findIndex((one) => one.isOwn)
  if (ownAt < 0) return null
  const own = places[ownAt]
  if (own === undefined) return null
  if (travelY < 0 && ownAt === 0) return { place: own, situation: 'noPlaceLeftInThatDirection' }
  if (travelY > 0 && ownAt === places.length - 1) {
    return { place: own, situation: 'noPlaceLeftInThatDirection' }
  }
  // WHY: the row's carried top edge, not the pointer's y, or the row jumps the instant it is touched.
  const carriedTo = heldBox.y + travelY
  let best = own
  for (const place of places) {
    const reach = Math.abs(place.atY - carriedTo)
    const standing = Math.abs(best.atY - carriedTo)
    if (reach < standing || (reach === standing && place.isOwn)) best = place
  }
  return { place: best, situation: null }
}

// see HF-15, S-37, DS-1
// TRAP: the DRAWN S-37, not the stored one. The panel draws the indent at the display
// ratio, so a stored step would leave the row behind the hand by that ratio every step.
/** @purity pure */
function drawnRowIndentOf(context: InputContext): number {
  const settings = context.document.documentSettings
  return settings.rowTitleIndent * displayRatioOf(settings)
}

// see HF-15, S-37
/** @purity pure */
function rowGrabDepthSteps(context: InputContext, at: PointerInput, press: PointerPress): number {
  const indent = drawnRowIndentOf(context)
  if (!(indent > 0)) return 0
  // WHY: truncated, not rounded; rounding moves the row half a step before the hand.
  return Math.trunc((at.x - press.at.x) / indent)
}

// see HF-15, S-208
/** @purity pure */
function rowGrabAxisAt(at: PointerInput, press: PointerPress): RowGrabAxis | null {
  const settled = press.rowGrabAxis
  if (settled !== null && settled !== undefined) return settled
  const across = Math.abs(at.x - press.at.x)
  const down = Math.abs(at.y - press.at.y)
  const threshold = NOT_STORED_ROW_GRAB_SIZES['S-208']
  if (across <= threshold && down <= threshold) return null
  // WHY: exactly diagonal travel passed neither threshold first, so it settles nothing yet.
  if (across === down) return null
  return across > down ? 'depth' : 'position'
}

// see GR-20
/** @purity pure */
export function grabbedRowGroupId(press: PointerPress): string | null {
  const on = press.on
  // TRAP: a pinned row is refused only because the surface draws no strip on it.
  if (on === null || on.isRowGrabStrip !== true) return null
  return on.rowGroupId
}

// see HF-15
/** @purity pure */
export function rowGrabFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null) return UNASSIGNED
  const groupId = grabbedRowGroupId(press)
  if (groupId === null) return UNASSIGNED
  // WHY: a caller that does not record the axis cannot hold it (as `paletteFollow` refuses).
  if (press.rowGrabAxis === undefined) return UNASSIGNED
  const axis = rowGrabAxisAt(input, press)
  if (axis === null) return UNASSIGNED
  if (axis === 'position') {
    const found = rowGrabPositionOf(context, groupId, input.y - press.at.y)
    if (found === null) return UNASSIGNED
    return acted({
      kind: 'followRowGrab',
      groupId,
      axis,
      atDepth: rowDepthOfGroup(context, groupId),
      atY: found.place.atY,
      resistedPx: rowGrabResistedPx(input.x - press.at.x, drawnRowIndentOf(context)),
    })
  }
  const step = rowGrabLandingOf(context, groupId, rowGrabDepthSteps(context, input, press))
  if (step === null) return UNASSIGNED
  return acted({
    kind: 'followRowGrab',
    groupId,
    axis,
    atDepth: step.landing.depth,
    atY: null,
    resistedPx: rowGrabResistedPx(input.y - press.at.y, rowGrabRowHeightOf(context, groupId)),
  })
}

// see HF-15, S-212
/** @purity pure */
function rowGrabResistedPx(travelPx: number, stepPx: number): number {
  const furthest = Math.abs(stepPx) * NOT_STORED_ROW_GRAB_SIZES['S-212']
  return Math.max(-furthest, Math.min(furthest, travelPx))
}

/** @purity pure */
function rowGrabRowHeightOf(context: InputContext, heldGroupId: string): number {
  const placed = (context.drawnRowBoxes ?? []).find((one) => one.groupId === heldGroupId)
  return placed === undefined ? 0 : placed.box.height
}

// see HF-15
/** @purity pure */
export function commandFromRowGrab(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
  heldGroupId: string,
): TranslatedInput {
  const axis = rowGrabAxisAt(release, press)
  if (axis === null) {
    return acted({
      kind: 'chooseRow',
      groupId: heldGroupId,
      isExtending: press.at.modifiers.shift,
    })
  }
  const held = context.document.schedule.taskGroups.find((one) => one.id === heldGroupId)
  if (axis === 'position') {
    const found = rowGrabPositionOf(context, heldGroupId, release.y - press.at.y)
    if (found === null) return CONSUMED_ELSEWHERE
    if (found.situation !== null) return nothingToDo(found.situation)
    // WHY: not written: an accepted write marks unsaved edits even if nothing moved.
    if (found.place.isOwn) return CONSUMED_ELSEWHERE
    return changed([
      {
        kind: 'moveTaskGroup',
        groupId: heldGroupId,
        parentId: found.place.parentId,
        order: found.place.order,
      },
    ])
  }
  const steps = rowGrabDepthSteps(context, release, press)
  if (steps === 0) return CONSUMED_ELSEWHERE
  const step = rowGrabLandingOf(context, heldGroupId, steps)
  if (step === null) return CONSUMED_ELSEWHERE
  const landing = step.landing
  // WHY: judged by the parent, not the step count; every depth step changes the parent.
  if (held !== undefined && held.parentId === landing.parentId) {
    return step.situation === null ? CONSUMED_ELSEWHERE : nothingToDo(step.situation)
  }
  return changed([
    {
      kind: 'moveTaskGroup',
      groupId: heldGroupId,
      parentId: landing.parentId,
      order: landing.order,
    },
  ])
}
