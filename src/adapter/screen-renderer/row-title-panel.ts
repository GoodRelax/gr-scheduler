// Describes the Row Title Panel and the Row Title Tree inside it.
// @unit      UF-63   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { RowExpander, RowTitle, RowTitlePanel, ScreenSession } from './screen-renderer'

interface PanelIndex {
  readonly groupsById: ReadonlyMap<string, TaskGroup>
  readonly groupIdsWithDrawnChildren: ReadonlySet<string>
  readonly boxByGroupId: ReadonlyMap<string, ScreenRect>
  readonly groupIdsWithHiddenChild: ReadonlySet<string>
  readonly groupIdsWithAChildOutOfThePicture: ReadonlySet<string>
  // STOP: spec does not decide whether HF-18 counts only this row's fold or every fold
  // below it. Looked in HF-18, HF-12. @provisional PND-412
  readonly foldedRowCountByGroupId: ReadonlyMap<string, number>
  readonly foldedRowCountAtLevelZero: number
  readonly rootGroups: readonly TaskGroup[]
  readonly taskNameByUid: ReadonlyMap<number, string | null>
}

const TRUNCATION_MARK = '\u2026'

// TRAP: U+0100 is the boundary ScheduleLayout's LC-5 uses; change both together.
/** @purity pure */
function charUnits(ch: string): number {
  return ch.charCodeAt(0) < 0x100 ? 1 : 2
}

/** @purity pure */
function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += charUnits(character)
  return units
}

/** @purity pure */
function labelWidthPx(text: string, fontSizePx: number, settings: DocumentSettings): number {
  return labelUnits(text) * fontSizePx * settings.labelCoef
}

/** @purity pure */
function availableLabelWidthPx(depth: number, settings: DocumentSettings): number {
  // STOP: spec does not decide the row controls' arrangement and behaviour. Looked in HF-1, FR-102
  // @provisional PND-397
  const roomForControlsPx = NOT_STORED_ROW_CONTROL_SIZES['S-140']
  const roomForGrabStripPx =
    NOT_STORED_ROW_GRAB_ROOM_SIZES['S-138'] + NOT_STORED_ROW_GRAB_ROOM_SIZES['S-218']
  const available =
    settings.rowTitlePanelWidth -
    depth * settings.rowTitleIndent -
    roomForControlsPx -
    roomForGrabStripPx
  return Math.max(0, available)
}

/** @purity pure */
function rowTitleFontPx(depth: number, settings: DocumentSettings): number {
  return depth === 1 ? settings.rowTitleFont * settings.rowTitleTopScale : settings.rowTitleFont
}

/** @purity pure */
function labelCutToFit(
  text: string,
  availableWidthPx: number,
  fontSizePx: number,
  settings: DocumentSettings,
): string {
  if (labelWidthPx(text, fontSizePx, settings) <= availableWidthPx) return text

  const unitWidthPx = fontSizePx * settings.labelCoef
  const widthForKeptPx = availableWidthPx - labelWidthPx(TRUNCATION_MARK, fontSizePx, settings)
  let units = 0
  let kept = ''
  for (const character of text) {
    const grown = units + charUnits(character)
    if (grown * unitWidthPx > widthForKeptPx) break
    units = grown
    kept += character
  }
  return kept + TRUNCATION_MARK
}

// TRAP: the maxGroupDepth cap is the only thing that ends this climb on a parentId ring.
/** @purity pure */
function rowDepth(
  group: TaskGroup,
  groupsById: ReadonlyMap<string, TaskGroup>,
  settings: DocumentSettings,
): number {
  let depth = 1
  let parentId = group.parentId
  while (parentId !== null && depth < settings.maxGroupDepth) {
    const parent = groupsById.get(parentId)
    if (parent === undefined) return depth
    depth += 1
    parentId = parent.parentId
  }
  return depth
}

// see HF-1
/** @purity pure */
function expanderOf(group: TaskGroup, index: PanelIndex): RowExpander {
  return {
    canOpen: (index.foldedRowCountByGroupId.get(group.id) ?? 0) > 0,
    canClose: index.boxByGroupId.has(group.id),
    canCloseBelow: index.groupIdsWithDrawnChildren.has(group.id),
  }
}

/** @purity pure */
function rowNameOf(group: TaskGroup, index: PanelIndex): string | null {
  if (group.label !== null) return group.label
  if (group.derivedFromTaskUid === null) return null
  return index.taskNameByUid.get(group.derivedFromTaskUid) ?? null
}

interface HeldRow {
  readonly depth: number
  readonly atY: number | null
  readonly axis: 'position' | 'depth'
  readonly resistedPx: number
}

/** @purity pure */
function rowTitleOf(
  group: TaskGroup,
  box: ScreenRect,
  isPinned: boolean,
  index: PanelIndex,
  settings: DocumentSettings,
  chosenGroupIds: ReadonlySet<string>,
  held: HeldRow | null,
): RowTitle {
  const depth = held?.depth ?? rowDepth(group, index.groupsById, settings)
  const fontSizePx = rowTitleFontPx(depth, settings)
  const wholeLabel = rowNameOf(group, index)
  const shownLabel =
    wholeLabel === null
      ? null
      : labelCutToFit(wholeLabel, availableLabelWidthPx(depth, settings), fontSizePx, settings)

  return {
    groupId: group.id,
    depth,
    box: heldBox(box, held),
    indentPx: depth * settings.rowTitleIndent,
    label: shownLabel,
    wholeLabel,
    isLabelTruncated: shownLabel !== null && shownLabel !== wholeLabel,
    expander: expanderOf(group, index),
    canOpenOneLevel: index.groupIdsWithAChildOutOfThePicture.has(group.id),
    canAddChildRow: depth < settings.maxGroupDepth,
    isPinned,
    // STOP: spec does not decide where the panel's chosen rows are held. Looked in SL-1, FR-085
    // @provisional PND-142
    isSelected: chosenGroupIds.has(group.id),
    foldedRowCount: index.foldedRowCountByGroupId.get(group.id) ?? 0,
    heldOnAxis: held === null ? null : held.axis,
  }
}
/** @purity pure */
function heldBox(box: ScreenRect, held: HeldRow | null): ScreenRect {
  if (held === null) return box
  const y = held.atY ?? box.y
  return held.axis === 'position'
    ? { ...box, x: box.x + held.resistedPx, y }
    : { ...box, y: y + held.resistedPx }
}

// see HF-12, HF-13, HF-18
/** @purity pure */
function panelIndexOf(schedule: Schedule, session: ScreenSession): PanelIndex {
  const groupsById = new Map<string, TaskGroup>()
  const groupIdsWithHiddenChild = new Set<string>()
  const groupIdsWithAChildOutOfThePicture = new Set<string>()
  const childrenByParentId = new Map<string | null, TaskGroup[]>()
  for (const group of schedule.taskGroups) {
    groupsById.set(group.id, group)
    const siblings = childrenByParentId.get(group.parentId)
    if (siblings === undefined) childrenByParentId.set(group.parentId, [group])
    else siblings.push(group)
    if (group.parentId === null) continue
    if (group.isHidden === true) groupIdsWithHiddenChild.add(group.parentId)
  }

  const boxByGroupId = new Map<string, ScreenRect>()
  for (const placed of session.rowBoxes) {
    if (boxByGroupId.has(placed.groupId)) continue
    boxByGroupId.set(placed.groupId, placed.box)
  }

  for (const [parentId, children] of childrenByParentId) {
    if (parentId === null) continue
    if (children.some((child) => !boxByGroupId.has(child.id))) {
      groupIdsWithAChildOutOfThePicture.add(parentId)
    }
  }

  const groupIdsWithDrawnChildren = new Set<string>()
  for (const group of schedule.taskGroups) {
    if (group.parentId === null) continue
    if (!boxByGroupId.has(group.id)) continue
    groupIdsWithDrawnChildren.add(group.parentId)
  }

  const taskNameByUid = new Map<number, string | null>()
  for (const task of schedule.tasks) {
    if (taskNameByUid.has(task.uid)) continue
    taskNameByUid.set(task.uid, task.name)
  }

  const foldedRowCountByGroupId = new Map<string, number>()
  const subtreeSizeByGroupId = new Map<string, number>()
  const orderedDeepestFirst: TaskGroup[] = []
  // TRAP: visited guards a parentId ring; without it the walk never returns.
  const visited = new Set<string>()
  const walkDeepestFirst = (parentId: string | null): void => {
    for (const child of childrenByParentId.get(parentId) ?? []) {
      if (visited.has(child.id)) continue
      visited.add(child.id)
      walkDeepestFirst(child.id)
      orderedDeepestFirst.push(child)
    }
  }
  walkDeepestFirst(null)
  for (const group of orderedDeepestFirst) {
    let subtreeSize = 1
    let folded = 0
    for (const child of childrenByParentId.get(group.id) ?? []) {
      const childSubtree = subtreeSizeByGroupId.get(child.id) ?? 1
      subtreeSize += childSubtree
      folded +=
        group.isCollapsed === true || child.isHidden === true
          ? childSubtree
          : (foldedRowCountByGroupId.get(child.id) ?? 0)
    }
    subtreeSizeByGroupId.set(group.id, subtreeSize)
    foldedRowCountByGroupId.set(group.id, folded)
  }

  const rootGroups = childrenByParentId.get(null) ?? []
  let foldedRowCountAtLevelZero = 0
  for (const root of rootGroups) {
    const subtreeSize = subtreeSizeByGroupId.get(root.id) ?? 1
    foldedRowCountAtLevelZero +=
      session.isLevelZeroFolded === true || root.isHidden === true
        ? subtreeSize
        : (foldedRowCountByGroupId.get(root.id) ?? 0)
  }

  return {
    groupsById,
    groupIdsWithDrawnChildren,
    groupIdsWithHiddenChild,
    groupIdsWithAChildOutOfThePicture,
    boxByGroupId,
    foldedRowCountByGroupId,
    foldedRowCountAtLevelZero,
    rootGroups,
    taskNameByUid,
  }
}

// see FR-085, FR-098
/** @purity pure */
export function rowTitlePanelFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  _selection: Selection,
  session: ScreenSession,
): RowTitlePanel {
  const index = panelIndexOf(schedule, session)
  const pinnedGroupIds = new Set(settings.pinnedGroupIds)
  const chosenGroupIds: ReadonlySet<string> = new Set(session.selectedGroupIds)

  const grabbed = session.rowGrabbedAt ?? null
  const heldOf = (groupId: string): HeldRow | null =>
    grabbed === null || grabbed.groupId !== groupId
      ? null
      : {
          depth: grabbed.depth,
          atY: grabbed.atY,
          axis: grabbed.axis,
          resistedPx: grabbed.resistedPx,
        }

  const pinnedTitles: RowTitle[] = []
  for (const groupId of pinnedGroupIds) {
    const group = index.groupsById.get(groupId)
    const box = index.boxByGroupId.get(groupId)
    if (group === undefined || box === undefined) continue
    pinnedTitles.push(rowTitleOf(group, box, true, index, settings, chosenGroupIds, null))
  }

  const describedGroupIds = new Set(pinnedGroupIds)
  const titles: RowTitle[] = []
  for (const placed of session.rowBoxes) {
    if (describedGroupIds.has(placed.groupId)) continue
    const group = index.groupsById.get(placed.groupId)
    if (group === undefined) continue
    describedGroupIds.add(placed.groupId)
    titles.push(
      rowTitleOf(
        group,
        placed.box,
        false,
        index,
        settings,
        chosenGroupIds,
        heldOf(group.id),
      ),
    )
  }

  const isLevelZeroFolded = session.isLevelZeroFolded === true
  if (pinnedTitles.length === 0 && titles.length === 0 && !isLevelZeroFolded) {
    return { pinnedTitles, titles }
  }

  return {
    pinnedTitles,
    titles,
    canOpenEveryRow: index.foldedRowCountAtLevelZero > 0,
    canCloseEveryRow:
      !isLevelZeroFolded && index.rootGroups.some((row) => index.boxByGroupId.has(row.id)),
    canOpenLevelZero: isLevelZeroFolded
      ? index.rootGroups.length > 0
      : index.rootGroups.some((row) => row.isHidden === true),
    foldedRowCount: index.foldedRowCountAtLevelZero,
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_ROW_CONTROL_SIZES: {
  readonly 'S-140': number
} = {
  'S-140': 0,
}

// see T-206
export const NOT_STORED_ROW_GRAB_ROOM_SIZES: {
  readonly 'S-138': number
  readonly 'S-218': number
} = {
  'S-138': 16,
  'S-218': 4,
}
// </generated>
