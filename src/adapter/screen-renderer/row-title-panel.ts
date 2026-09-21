// Describes the Row Title Panel and the Row Title Tree inside it.
// @unit      UF-63   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  drawnSettingsOf,
  type ScreenRect,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type { RowExpander, RowTitle, RowTitlePanel, ScreenViewReadings } from './screen-renderer'

interface PanelIndex extends OpenAllMarks {
  readonly groupsById: ReadonlyMap<string, TaskGroup>
  readonly groupIdsWithDrawnChildren: ReadonlySet<string>
  readonly boxByGroupId: ReadonlyMap<string, ScreenRect>
  readonly groupIdsWithHiddenChild: ReadonlySet<string>
  readonly groupIdsWithAChildOutOfThePicture: ReadonlySet<string>
  readonly foldedRowCountByGroupId: ReadonlyMap<string, number>
  readonly foldedRowCountAtLevelZero: number
  readonly rootGroups: readonly TaskGroup[]
  readonly taskNameByUid: ReadonlyMap<number, string | null>
}

type IndexCore = Omit<PanelIndex, keyof OpenAllMarks>

interface OpenAllMarks {
  readonly groupIdsWithAFoldAtOrBelow: ReadonlySet<string>
  readonly groupIdsWithAKeptOpenMarkBelow: ReadonlySet<string>
  readonly isAnyRowMarkedOrFolded: boolean
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
  const roomForControlsPx = NOT_STORED_ROW_CONTROL_SIZES['S-140']
  // see FR-029
  const roomForGrabStripPx =
    NOT_STORED_ROW_GRAB_ROOM_SIZES['S-138'] * NOT_STORED_CHROME_SCALE['S-235'] +
    NOT_STORED_ROW_GRAB_ROOM_SIZES['S-218']
  const available =
    settings.rowTitlePanelWidth -
    depth * settings.rowTitleIndent -
    roomForControlsPx -
    roomForGrabStripPx
  return Math.max(0, available)
}

// see HF-5, FR-016, PI-37, T-252, DS-1, S-36
/** @purity pure */
export function rowTitleFontPxOf(depth: number, settings: DocumentSettings): number {
  const drawn = drawnSettingsOf(settings)
  return depth === 1 ? drawn.rowTitleFont * drawn.rowTitleTopScale : drawn.rowTitleFont
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

// see HF-2, KO-2
// TRAP: row-tree-entrances.ts arms IC-58 by this same test (isOpenAllBelowArmed); change both together.
/** @purity pure */
function isOpenAllBelowOn(group: TaskGroup, index: PanelIndex): boolean {
  if (index.groupIdsWithAFoldAtOrBelow.has(group.id)) return true
  if (index.groupIdsWithAKeptOpenMarkBelow.has(group.id)) return true
  return !group.isKeptOpen && index.groupIdsWithAChildOutOfThePicture.has(group.id)
}

// see HF-1
/** @purity pure */
function expanderOf(group: TaskGroup, index: PanelIndex): RowExpander {
  return {
    canOpen: isOpenAllBelowOn(group, index),
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
  const fontSizePx = rowTitleFontPxOf(depth, settings)
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
    fontPx: fontSizePx,
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

// see HF-2, HF-10, KO-2, KO-3
/** @purity pure */
function openAllMarksOf(schedule: Schedule): OpenAllMarks {
  const childrenOf = new Map<string, TaskGroup[]>()
  for (const group of schedule.taskGroups) {
    if (group.parentId !== null) childrenOf.set(group.parentId, [...(childrenOf.get(group.parentId) ?? []), group])
  }
  const folds = new Set<string>()
  const marks = new Set<string>()
  // TRAP: visited guards a parentId ring; without it the walk never returns.
  const visited = new Set<string>()
  const walk = (group: TaskGroup): void => {
    if (visited.has(group.id)) return
    visited.add(group.id)
    if (group.isCollapsed === true || group.isHidden === true) folds.add(group.id)
    for (const child of childrenOf.get(group.id) ?? []) {
      walk(child)
      if (folds.has(child.id)) folds.add(group.id)
      if (child.isKeptOpen || marks.has(child.id)) marks.add(group.id)
    }
  }
  for (const group of schedule.taskGroups) walk(group)
  return {
    groupIdsWithAFoldAtOrBelow: folds,
    groupIdsWithAKeptOpenMarkBelow: marks,
    isAnyRowMarkedOrFolded: schedule.taskGroups.some(
      (one) => one.isCollapsed === true || one.isHidden === true || one.isKeptOpen,
    ),
  }
}

// see HF-12, HF-13, HF-18
/** @purity pure */
function panelIndexOf(schedule: Schedule, readings: ScreenViewReadings, isLevelZeroFolded: boolean): IndexCore {
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
  for (const placed of readings.rowBoxes) {
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
      isLevelZeroFolded || root.isHidden === true
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
  storedSettings: DocumentSettings,
  _selection: Selection,
  session: ScreenSession,
  readings: ScreenViewReadings,
): RowTitlePanel {
  // see FR-039, T-252
  const settings = drawnSettingsOf(storedSettings)
  const isLevelZeroFolded = session.screen.levelZeroFoldState.kind === 'folded'
  const index = { ...panelIndexOf(schedule, readings, isLevelZeroFolded), ...openAllMarksOf(schedule) }
  const pinnedGroupIds = new Set(settings.pinnedGroupIds)
  const chosenGroupIds: ReadonlySet<string> = new Set(readings.selectedGroupIds)
  const grabbed = readings.rowGrabbedAt ?? null
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
  for (const placed of readings.rowBoxes) {
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

  if (pinnedTitles.length === 0 && titles.length === 0 && !isLevelZeroFolded) {
    return { pinnedTitles, titles }
  }

  return {
    pinnedTitles,
    titles,
    canOpenEveryRow: index.isAnyRowMarkedOrFolded,
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
  readonly 'S-313': number
} = {
  'S-140': 0,
  'S-313': 4,
}

// see T-206
const NOT_STORED_ROW_GRAB_ROOM_SIZES: {
  readonly 'S-138': number
  readonly 'S-218': number
} = {
  'S-138': 16,
  'S-218': 4,
}

// see T-206
const NOT_STORED_CHROME_SCALE: {
  readonly 'S-235': number
} = {
  'S-235': 0.6667,
}
// </generated>
