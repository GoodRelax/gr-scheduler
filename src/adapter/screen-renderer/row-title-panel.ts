// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-63   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// U-22 `Row Title Panel` and the U-23 `Row Title Tree` inside it. The signature is
// fixed by the "nine unit contracts" section of screen-renderer.ts, which is why
// `_selection` stays unused: rows chosen here are `ScreenSession.selectedGroupIds`
// (FR-085, SL-1).
//
// Drawn rows are `ScreenSession.rowBoxes`, not `Schedule.taskGroups`: SC-1 of
// table T-031 needs the `Row Area`'s own numbers, and ScheduleLayout is not
// reachable from here. Folded, hidden and LOD-dropped rows therefore leave the
// panel unjudged, and `titles` keeps `rowBoxes` order rather than sorting by AT-55.
//
// The folding entrances count the drawn rows, not AT-56 alone (the note under
// table T-051, FR-029).

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { RowExpander, RowTitle, RowTitlePanel, ScreenSession } from './screen-renderer'

/**
 * What one frame is read through, built once before any row is described.
 * `boxByGroupId` also answers whether a row was drawn: the shell measures a box
 * exactly for the rows it draws.
 */
interface PanelIndex {
  readonly groupsById: ReadonlyMap<string, TaskGroup>
  /** Rows with at least one child drawn this frame: HF-11's arming. */
  readonly groupIdsWithDrawnChildren: ReadonlySet<string>
  readonly boxByGroupId: ReadonlyMap<string, ScreenRect>
  /**
   * Rows with a direct child hidden by HR-6. Not what IC-90 arms on: HF-13 and
   * RS-30 count any direct child out of the picture, of which hiding is one cause.
   */
  readonly groupIdsWithHiddenChild: ReadonlySet<string>
  /** Rows with a direct child the picture does not hold: HF-13's arming (FR-029). */
  readonly groupIdsWithAChildOutOfThePicture: ReadonlySet<string>
  /**
   * HF-18's count reads two ways: rows this row's own fold holds away, or every
   * row held away anywhere below it. The second is taken so a row counts the way
   * the head does (HF-12); an open parent of a folded child reports 1.
   * @provisional PND-412
   */
  readonly foldedRowCountByGroupId: ReadonlyMap<string, number>
  /** HF-12's count, level 0's own fold included. */
  readonly foldedRowCountAtLevelZero: number
  /** The rows of the shallowest level -- 段 0's own children, in document order. */
  readonly rootGroups: readonly TaskGroup[]
  /**
   * A map, not a per-row search of `Schedule.tasks`: this runs every frame
   * (section 5 of docs/development-rules/04-verification.md).
   */
  readonly taskNameByUid: ReadonlyMap<number, string | null>
}

/**
 * FR-085's cut mark, U+2026. Not a display word (FR-038): it is the same character
 * in every language. Escaped because source strings are ASCII (rule 03 section 5).
 */
const TRUNCATION_MARK = '\u2026'

/**
 * FR-093 does not say which characters are full-width; U+0100 is the boundary
 * ScheduleLayout's LC-5 uses, so both cut on one estimate. Rewritten rather than
 * imported because `_source/components.json` gives this component no edge to
 * ScheduleLayout -- change both together.
 *
 * @purity pure
 */
function charUnits(ch: string): number {
  return ch.charCodeAt(0) < 0x100 ? 1 : 2
}

/** @purity pure */
function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += charUnits(character)
  return units
}

/**
 * FR-093's estimate, which FR-085 requires for the row name.
 *
 * @purity pure
 */
function labelWidthPx(text: string, fontSizePx: number, settings: DocumentSettings): number {
  return labelUnits(text) * fontSizePx * settings.labelCoef
}

/**
 * The row controls' arrangement and behaviour are open.
 *
 * @provisional PND-397
 */

/**
 * The width FR-085 leaves the name.
 *
 * The generated constants are read inside the function, not copied into a module
 * constant above: they stand at the foot of this file and would be read before
 * they are assigned.
 *
 * @purity pure
 */
function availableLabelWidthPx(depth: number, settings: DocumentSettings): number {
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

/**
 * S-36, scaled by S-38 on a depth-1 row. Not scaled by `fontScale` (S-70): FR-039
 * extends it to the ruler only, and applying it here would move every cut.
 *
 * @purity pure
 */
function rowTitleFontPx(depth: number, settings: DocumentSettings): number {
  return depth === 1 ? settings.rowTitleFont * settings.rowTitleTopScale : settings.rowTitleFont
}

/**
 * FR-085's cut (not `truncateUnits`, S-35). The mark is paid for out of the same
 * width, or the result overflows by one mark. A width too small for the mark still
 * gets the mark alone, so the cut stays visible on the narrowest panels.
 *
 * @purity pure
 */
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

/**
 * Depth 1 is a root row (S-125). The `maxGroupDepth` cap also ends the climb on a
 * `parentId` ring, which `schedule.ts` reports (IV-18) rather than refuses, so no
 * visited set is needed.
 *
 * @purity pure
 */
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

/**
 * HF-1's row controls, three of the four (HF-13's is `RowTitle.canOpenOneLevel`).
 * Each is armed only when its press would change the drawn rows (the note under
 * table T-051), so a fold left on an undrawn row arms nothing.
 *
 * @purity pure
 */
function expanderOf(group: TaskGroup, index: PanelIndex): RowExpander {
  return {
    // HF-2 ties this to HF-18's number.
    canOpen: (index.foldedRowCountByGroupId.get(group.id) ?? 0) > 0,
    // HF-3: hiding a drawn row always removes that row.
    canClose: index.boxByGroupId.has(group.id),
    // HR-4 folds this row, so only its drawn children change the picture.
    canCloseBelow: index.groupIdsWithDrawnChildren.has(group.id),
  }
}

/**
 * AT-53, else the derived-from Task's name (FR-058). FR-058 is not in UF-63's row
 * of table T-075, but this panel is the one place a row's name is shown.
 *
 * A UID naming no `Task` answers `null` rather than throwing: IV-8 and FR-032 keep
 * it from arriving, a renderer that refused would hide the row that needs repair,
 * and `null` is what an unnamed `Task` (AT-27) already gives.
 *
 * @purity pure
 */
function rowNameOf(group: TaskGroup, index: PanelIndex): string | null {
  if (group.label !== null) return group.label
  if (group.derivedFromTaskUid === null) return null
  return index.taskNameByUid.get(group.derivedFromTaskUid) ?? null
}

/** What HF-15's grab makes of the row it holds, or `null` on every other row. */
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
  // A held depth is drawn, not written: `parentId` changes on release (CM-73).
  // The name is cut at the drawn depth, since FR-085 subtracts the row's depth.
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
    // Drawn, not written: `TaskGroup.order` changes on release (CM-73). Other rows
    // open no gap for it: tables T-103 and T-109 give no part or entrance for one.
    box: heldBox(box, held),
    // The same product `availableLabelWidthPx` subtracts.
    indentPx: depth * settings.rowTitleIndent,
    label: shownLabel,
    // No reader in `src/` remains, but `RowTitle` in screen-renderer.ts declares it,
    // so it is filled until that contract retires it.
    wholeLabel,
    // The fitting branch returns the name unchanged, so no second measurement is
    // needed. A name that itself ends in the mark cannot collide with a cut: a cut
    // result fits with the mark, and a name that reached the cut did not.
    isLabelTruncated: shownLabel !== null && shownLabel !== wholeLabel,
    expander: expanderOf(group, index),
    canOpenOneLevel: index.groupIdsWithAChildOutOfThePicture.has(group.id),
    // `depth` is clamped to `maxGroupDepth` by `rowDepth`, so a row beyond FR-004's
    // cap answers `false` rather than arming an entrance the write side refuses.
    canAddChildRow: depth < settings.maxGroupDepth,
    isPinned,
    // A `Set`, not a scan: once per row on every frame (rule 04 section 5).
    //
    // @provisional PND-142
    isSelected: chosenGroupIds.has(group.id),
    // Zero included: the drawing side is where zero becomes nothing drawn.
    foldedRowCount: index.foldedRowCountByGroupId.get(group.id) ?? 0,
    heldOnAxis: held === null ? null : held.axis,
  }
}

/**
 * Where a held row is drawn: along the live axis, and nudged along the refused one
 * by `resistedPx`, which already carries S-212. A picture, never a write. `atY` is
 * `null` on the depth axis, which leaves the row at the y the layout gave it.
 *
 * @purity pure
 */
function heldBox(box: ScreenRect, held: HeldRow | null): ScreenRect {
  if (held === null) return box
  const y = held.atY ?? box.y
  return held.axis === 'position'
    ? { ...box, x: box.x + held.resistedPx, y }
    : { ...box, y: y + held.resistedPx }
}

/**
 * @purity pure
 */
function panelIndexOf(schedule: Schedule, session: ScreenSession): PanelIndex {
  const groupsById = new Map<string, TaskGroup>()
  const groupIdsWithHiddenChild = new Set<string>()
  const groupIdsWithAChildOutOfThePicture = new Set<string>()
  // Level 0's children sit under the key `null` (HR-2 makes the head level 0), so
  // one map serves the rows and the head.
  const childrenByParentId = new Map<string | null, TaskGroup[]>()
  for (const group of schedule.taskGroups) {
    groupsById.set(group.id, group)
    const siblings = childrenByParentId.get(group.parentId)
    if (siblings === undefined) childrenByParentId.set(group.parentId, [group])
    else siblings.push(group)
    if (group.parentId === null) continue
    // The child's own `isHidden` only: a row under a hidden one is not reachable
    // from a drawn parent anyway (HR-6).
    if (group.isHidden === true) groupIdsWithHiddenChild.add(group.parentId)
  }

  const boxByGroupId = new Map<string, ScreenRect>()
  for (const placed of session.rowBoxes) {
    if (boxByGroupId.has(placed.groupId)) continue
    boxByGroupId.set(placed.groupId, placed.box)
  }

  // HF-13's targets, counted on the drawn side (FR-029): a direct child kept out by
  // this row's fold, by HR-6 or by the display amount (FR-018).
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

  // First wins, as in `boxByGroupId`: `uid` is ET-2's key (AT-24), and preferring
  // the last writer of a repeated one would invent a rule.
  const taskNameByUid = new Map<number, string | null>()
  for (const task of schedule.tasks) {
    if (taskNameByUid.has(task.uid)) continue
    taskNameByUid.set(task.uid, task.name)
  }

  // HF-18's and HF-12's counts in one post-order walk (NFR-013): a child that is
  // folded away or hidden gives its whole subtree, any other child its own count.
  // Hidden rows count (HF-18); the display amount's drops do not, so
  // `boxByGroupId` is not read here.
  // `visited` guards a `parentId` ring, which `schedule.ts` reports (IV-18) rather
  // than refuses.
  const foldedRowCountByGroupId = new Map<string, number>()
  const subtreeSizeByGroupId = new Map<string, number>()
  const orderedDeepestFirst: TaskGroup[] = []
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
  // Level 0 counts as a row does (HR-2): its own fold (S-211) holds every root away.
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

/**
 * The pinned titles and the rest, for one frame, as a partition: a pinned row is
 * not also described at its place (FR-098). Pinned titles follow `pinnedGroupIds`
 * (S-126) order, and the `Set` also drops an id listed twice.
 *
 * Not trimmed to `pinnedRowMax` (S-127): FR-098 applies that bound to new pins only.
 * A pinned row with no box is skipped, not reported: the display amount (FR-018)
 * may stop drawing it, and CD-2 of table T-050 removes the pin with its row.
 *
 * @purity pure
 */
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

  // No row described and level 0 open: the head entrances stay absent (see
  // `RowTitlePanel`). A folded head still answers, since HF-12 has it show its
  // count when no row is drawn.
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
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_ROW_CONTROL_SIZES: {
  /** S-140, in px */
  readonly 'S-140': number
} = {
  'S-140': 0,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands because the arithmetic
 * is its own: FR-085 (MUST) cuts the row name at what is left of the
 * panel once the indent, the room the row controls keep and the room
 * GR-20 of table T-023d keeps are taken off, and nothing on IF-9
 * carries a length for a caller to hand in. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them.
 * ⭐ The cut they settle IS in the exported picture (EP-3 of table
 * T-076), which is why FR-085 (MUST NOT) refuses an export width of
 * its own -- so these are not values a screen may hold alone.
 */
export const NOT_STORED_ROW_GRAB_ROOM_SIZES: {
  /** S-138, in px */
  readonly 'S-138': number
  /** S-218, in px */
  readonly 'S-218': number
} = {
  'S-138': 16,
  'S-218': 4,
}
// </generated>
