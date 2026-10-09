// DomScreenSurface -- the Task Group Title Tree rows with their controls, grab strips and folded counts.
// @unit      UF-105  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  TaskGroupTitle,
  TaskGroupPanel,
  ScreenView,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenSurfaceWiring, ScreenTheme } from './dom-screen-surface'
import {
  NOT_STORED_ICON_SIZES,
  NOT_STORED_TASK_GROUP_BAND_SIZES,
  NOT_STORED_TASK_GROUP_CONTROL_EDGE_SIZES,
  NOT_STORED_TASK_GROUP_GRAB_STRIP_SIZES,
  PAINT,
  ROLE,
  TASK_GROUP_GRAB_STRIP_MARK,
  STYLE,
  anchorKey,
  boxStyle,
  entranceBorderPx,
  entranceGapPx,
  entranceOuterHeightPx,
  entranceOuterWidthPx,
  entranceStateFill,
  entryFaintStyle,
  entryStyle,
  fillEntry,
  made,
  part,
  stateGround,
  themeStyle,
} from './dom-screen-surface'
import { panelEdge } from './screen-frame-drawing'

const OPEN_EVERY_ROW_ENTRY = 'IC-74'

const COLLAPSE_EVERY_ROW_ENTRY = 'IC-78'

const OPEN_LEVEL_ZERO_ENTRY = 'IC-92'

const ADD_TOP_ROW_ENTRY = 'IC-93'

const DELETE_EVERY_ROW_ENTRY = 'IC-106'

// see HF-10, HF-12
// WHY: one line, left to right; each entry's step from the right edge is read from here only.
const HEAD_RUN = [
  COLLAPSE_EVERY_ROW_ENTRY,
  OPEN_LEVEL_ZERO_ENTRY,
  OPEN_EVERY_ROW_ENTRY,
  ADD_TOP_ROW_ENTRY,
  DELETE_EVERY_ROW_ENTRY,
] as const

type HeadIcon = (typeof HEAD_RUN)[number]

export const DELETE_ROW_ENTRY = 'IC-82'

export const ADD_CHILD_ROW_ENTRY = 'IC-91'

const OPEN_ONE_LEVEL_ENTRY = 'IC-90'

export const TASK_GROUP_CONTROL_GROUND_MARK = 'data-task-group-control-ground'

const ROW_FOLDING_GRID_MARK = 'data-row-folding-grid'

const TASK_GROUP_CONTROL_PAIR_MARK = 'data-task-group-control-pair'

const GROUP_GRID_LINE_MARK = 'data-group-grid-line'

const TASK_GROUP_CONTROLS_LULL_MS = 1000

/** @purity pure */
function taskGroupControlStepPx(): number {
  return taskGroupControlBoxPx()
}

/** @purity pure */
function taskGroupControlRight(stepsFromEdge: number): string {
  return `right:${taskGroupControlRightPx(stepsFromEdge)}px;`
}

// see HF-4, T-206
// TRAP: read at the call; dom-screen-surface.ts imports this file, so a module-level read sees nothing.
/** @purity pure */
function taskGroupControlRightPx(stepsFromEdge: number): number {
  return NOT_STORED_TASK_GROUP_CONTROL_EDGE_SIZES['S-313'] + taskGroupControlStepPx() * stepsFromEdge
}

const TASK_GROUP_CONTROL_STEPS = {
  pair: 1,
  pin: 0,
  foldingGrid: 2,
} as const

const ROW_FOLDING_CELLS = {
  close: { column: 1, row: 1 },
  closeBelow: { column: 2, row: 1 },
  openOneLevel: { column: 1, row: 2 },
  open: { column: 2, row: 2 },
} as const

const ROW_CONTROL_PAIR_CELLS = {
  remove: { column: 1, row: 1 },
  addChild: { column: 1, row: 2 },
} as const

const TASK_GROUP_CONTROL_LEFTMOST_STEP = TASK_GROUP_CONTROL_STEPS.foldingGrid + 1

// see HF-1, HF-4
const TASK_GROUP_CONTROL_RANKS = 2

// see HF-1, LF-16
/** @purity pure */
function taskGroupControlLatticePx(): number {
  return entranceOuterHeightPx('S-243') * TASK_GROUP_CONTROL_RANKS
}

// see HF-6, HF-19
// WHY: hit, so the gaps between controls count as the group; as tall as the lower of the
// row's bottom and the lattice's, which may hang over the rows below.
/** @purity pure */
function taskGroupControlGroundStyle(leftmostStepsFromEdge: number): string {
  const reach = taskGroupControlRightPx(leftmostStepsFromEdge)
  return (
    'position:absolute;top:0;right:0;' +
    `height:max(100%, ${taskGroupControlLatticePx()}px);` +
    `width:${reach + taskGroupControlBoxPx()}px;` +
    `background:${PAINT.panel};pointer-events:auto;`
  )
}

// see FR-029, S-243
/** @purity pure */
function taskGroupControlBoxPx(): number {
  return entranceOuterWidthPx('S-243')
}

/** @purity pure */
function taskGroupControlWidthCss(): string {
  return `${taskGroupControlBoxPx()}px`
}

// see HF-5, FR-029
/** @purity pure */
function taskGroupControlBoxStyle(): string {
  return (
    'display:inline-flex;box-sizing:border-box;' +
    `min-width:${entranceOuterWidthPx('S-243')}px;` +
    `padding:0 ${entranceGapPx('S-243')}px;`
  )
}

// see FR-029, S-243
/** @purity pure */
function taskGroupControlGlyphGapStyle(): string {
  return `margin:${entranceGapPx('S-243')}px 0;`
}

// see HF-1, HF-4, LF-16, HF-19
/** @purity pure */
function rowControlGridStyle(columns: number, stepsFromEdge: number): string {
  const columnTracks = Array.from({ length: columns }, () => taskGroupControlWidthCss()).join(' ')
  const rowTrack = `${entranceOuterHeightPx('S-243')}px`
  const rowTracks = Array.from({ length: TASK_GROUP_CONTROL_RANKS }, () => rowTrack).join(' ')
  return (
    'position:absolute;display:grid;align-items:flex-start;' +
    `grid-template-columns:${columnTracks};` +
    `grid-template-rows:${rowTracks};` +
    `right:${taskGroupControlRightPx(stepsFromEdge)}px;` +
    'pointer-events:none;'
  )
}

/** @purity pure */
function rowControlCellStyle(cell: { readonly column: number; readonly row: number }): string {
  return `position:static;grid-column:${cell.column};grid-row:${cell.row};`
}

const FOLDED_TASK_GROUP_COUNT_MARK = 'data-folded-task-groups'

/** @purity pure */
function taskGroupBandPx(): number {
  return NOT_STORED_TASK_GROUP_BAND_SIZES['S-213']
}

// see HF-15
/** @purity pure */
function taskGroupGrabbedStyle(axis: 'position' | 'depth'): string {
  const paint = axis === 'position' ? PAINT.grabAxisPosition : PAINT.grabAxisDepth
  const band = `${taskGroupBandPx()}px solid ${paint}`
  return (
    `background:${stateGround(PAINT.heldTaskGroup, 'S-215')};` +
    (axis === 'position'
      ? `border-left:${band};border-right:${band};`
      : `border-top:${band};border-bottom:${band};`)
  )
}

// see HF-18
/** @purity pure */
function foldedTaskGroupCountStyle(rightPx: string): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  return (
    'position:absolute;top:0;pointer-events:none;' +
    rightPx +
    `min-width:${side}px;height:${side}px;line-height:${side}px;` +
    'text-align:center;font-size:0.75em;white-space:nowrap;' +
    `color:${PAINT.caution};`
  )
}

const FOLD_COUNT_MARK = '\u25be\u0020'

// see HF-12
/** @purity non-pure */
export function markFoldedTaskGroupCount(mark: HTMLElement, count: number, rightPx: string): void {
  mark.setAttribute(FOLDED_TASK_GROUP_COUNT_MARK, String(count))
  mark.textContent = FOLD_COUNT_MARK + String(count)
  mark.setAttribute('style', count > 0 ? foldedTaskGroupCountStyle(rightPx) : STYLE.hidden)
}

/** @purity non-pure */
export function foldedTaskGroupCountElement(host: Document, count: number, rightPx: string): HTMLElement {
  const mark = made(host, 'span', foldedTaskGroupCountStyle(rightPx))
  mark.setAttribute(FOLDED_TASK_GROUP_COUNT_MARK, String(count))
  mark.setAttribute('aria-hidden', 'true')
  mark.textContent = FOLD_COUNT_MARK + String(count)
  return mark
}

// see GR-20, HF-15
/** @purity pure */
function taskGroupGrabStripStyle(isHeld: boolean): string {
  const width = NOT_STORED_ICON_SIZES['S-138']
  return (
    `flex:none;width:${width}px;cursor:${isHeld ? 'grabbing' : 'grab'};pointer-events:auto;` +
    'text-align:center;' +
    `color:${isHeld ? PAINT.heldTaskGroup : PAINT.grabStrip};font-size:0.75em;user-select:none;`
  )
}

interface TaskGroupAnchors {
  readonly anchors: Map<string, HTMLElement>
  readonly groupId: string
}

// see FR-029, HF-5, T-109, IN-3, DFC-1720
/** @purity non-pure */
function taskGroupControlElement(
  host: Document,
  role: string | null,
  icon: string,
  canAct: boolean,
  anchoredIn: TaskGroupAnchors,
): HTMLElement {
  const style =
    (canAct ? STYLE.taskGroupControl : STYLE.taskGroupControl + STYLE.taskGroupControlFaintInk) +
    taskGroupControlBoxStyle()
  const control = role === null ? made(host, 'button', style) : part(host, 'button', role, style)
  control.setAttribute('type', 'button')
  control.setAttribute('data-icon', icon)
  control.setAttribute('aria-label', icon)
  if (!canAct) control.setAttribute('aria-disabled', 'true')
  fillEntry(host, control, icon, taskGroupControlGlyphGapStyle())
  anchoredIn.anchors.set(anchorKey({ kind: 'icon', icon, groupId: anchoredIn.groupId }), control)
  return control
}

// see FR-098, GR-20, HF-4, HF-15, HF-18
/** @purity non-pure */
function taskGroupTitleElement(host: Document, title: TaskGroupTitle, isPinned: boolean, anchoredIn: TaskGroupAnchors): HTMLElement {
  const row = made(
    host,
    'div',
    // TRAP: the indent is the only inset; other padding lets the browser cut the name
    // silently, since isLabelTruncated records only FR-085's cut.
    boxStyle(title.box) +
      STYLE.taskGroupTitle +
      `gap:${NOT_STORED_TASK_GROUP_GRAB_STRIP_SIZES['S-218']}px;` +
      `padding:0 0 0 ${title.indentPx}px;` +
      // TRAP: title.isPinned, not the isPinned argument, which only says which list is built.
      (title.isPinned ? `background:${stateGround(PAINT.pinnedTaskGroup, 'S-214')};` : '') +
      (title.heldOnAxis == null ? '' : taskGroupGrabbedStyle(title.heldOnAxis)),
  )
  if (title.heldOnAxis != null) row.setAttribute('data-held-axis', title.heldOnAxis)
  if (isPinned) row.setAttribute('data-role', ROLE.pinnedTaskGroup)
  row.setAttribute('data-group-id', title.groupId)
  row.setAttribute('data-depth', String(title.depth))
  row.setAttribute('data-pinned', String(title.isPinned))
  row.setAttribute('data-selected', String(title.isSelected))
  row.setAttribute('data-truncated', String(title.isLabelTruncated))
  if (title.isSelected) row.setAttribute('aria-selected', 'true')

  if (!title.isPinned) {
    const grab = made(host, 'div', taskGroupGrabStripStyle(title.heldOnAxis != null))
    grab.setAttribute(TASK_GROUP_GRAB_STRIP_MARK, 'true')
    grab.textContent = '⋮⋮'
    grab.setAttribute('aria-hidden', 'true')
    row.append(grab)
  }

  // TRAP: the size goes on the name alone; on the row the em-sized marks would follow it (HF-5).
  const label = made(host, 'span', STYLE.taskGroupLabel + `font-size:${title.fontPx}px;`)
  label.textContent = title.label

  // TRAP: append the ground before every control: with no z-index, paint order is tree order.
  const ground = made(
    host,
    'div',
    taskGroupControlGroundStyle(TASK_GROUP_CONTROL_LEFTMOST_STEP),
  )
  ground.setAttribute(TASK_GROUP_CONTROL_GROUND_MARK, 'true')
  ground.setAttribute('aria-hidden', 'true')
  row.append(ground)
  row.append(label)

  const foldingGrid = made(host, 'div', rowControlGridStyle(2, TASK_GROUP_CONTROL_STEPS.foldingGrid))
  foldingGrid.setAttribute(ROW_FOLDING_GRID_MARK, 'true')
  row.append(foldingGrid)

  if (title.expander !== null) {
    const open = taskGroupControlElement(host, ROLE.taskGroupExpander, 'IC-58', title.expander.canOpen, anchoredIn)
    open.setAttribute('data-can-open', String(title.expander.canOpen))
    open.setAttribute(
      'style',
      open.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.open),
    )
    foldingGrid.append(open)

    const close = taskGroupControlElement(host, ROLE.taskGroupExpander, 'IC-59', title.expander.canClose, anchoredIn)
    close.setAttribute('data-can-close', String(title.expander.canClose))
    close.setAttribute(
      'style',
      close.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.close),
    )
    foldingGrid.append(close)

    const closeBelow = taskGroupControlElement(host, ROLE.taskGroupExpander, 'IC-77', title.expander.canCloseBelow, anchoredIn)
    closeBelow.setAttribute('data-can-close-below', String(title.expander.canCloseBelow))
    closeBelow.setAttribute(
      'style',
      closeBelow.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.closeBelow),
    )
    foldingGrid.append(closeBelow)
  }

  // TRAP: outside the expander block: expander is null on a leaf, where HF-13 still draws IC-90.
  const openOneLevel = taskGroupControlElement(host, ROLE.taskGroupExpander, OPEN_ONE_LEVEL_ENTRY, title.canOpenOneLevel ?? true, anchoredIn)
  openOneLevel.setAttribute('data-can-open-one-level', String(title.canOpenOneLevel ?? true))
  openOneLevel.setAttribute(
    'style',
    openOneLevel.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.openOneLevel),
  )
  foldingGrid.append(openOneLevel)

  const controlPair = made(host, 'div', rowControlGridStyle(1, TASK_GROUP_CONTROL_STEPS.pair))
  controlPair.setAttribute(TASK_GROUP_CONTROL_PAIR_MARK, 'true')
  row.append(controlPair)

  const remove = taskGroupControlElement(host, null, DELETE_ROW_ENTRY, true, anchoredIn)
  remove.setAttribute(
    'style',
    remove.getAttribute('style') + rowControlCellStyle(ROW_CONTROL_PAIR_CELLS.remove),
  )
  controlPair.append(remove)

  const addChild = taskGroupControlElement(host, null, ADD_CHILD_ROW_ENTRY, title.canAddChildTaskGroup ?? true, anchoredIn)
  addChild.setAttribute('data-can-add-child-task-group', String(title.canAddChildTaskGroup ?? true))
  addChild.setAttribute(
    'style',
    addChild.getAttribute('style') + rowControlCellStyle(ROW_CONTROL_PAIR_CELLS.addChild),
  )
  controlPair.append(addChild)

  const pin = taskGroupControlElement(host, ROLE.taskGroupPin, 'IC-60', true, anchoredIn)
  pin.setAttribute('data-pinned', String(title.isPinned))
  pin.setAttribute('aria-pressed', String(title.isPinned))
  pin.setAttribute(
    'style',
    pin.getAttribute('style') +
      taskGroupControlRight(TASK_GROUP_CONTROL_STEPS.pin) +
      entranceStateFill(title.isPinned ? ['EN-3'] : []) +
      (title.isPinned ? 'visibility:visible;' : ''),
  )
  row.append(pin)

  const foldedTaskGroups = title.foldedTaskGroupCount ?? 0
  if (foldedTaskGroups > 0) {
    row.append(
      foldedTaskGroupCountElement(
        host,
        foldedTaskGroups,
        taskGroupControlRight(TASK_GROUP_CONTROL_STEPS.pin),
      ),
    )
    row.setAttribute(
      'style',
      (row.getAttribute('style') ?? '') +
        `box-shadow:inset ${taskGroupBandPx()}px 0 0 0 ${PAINT.caution};`,
    )
  }
  return row
}

/** @purity non-pure */
function panelCornerEntryElement(
  host: Document,
  icon: string,
  stepsFromEdge: number,
): HTMLElement {
  const entry = made(host, 'button', panelCornerEntryStyle(stepsFromEdge, true))
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

// see HF-10
/** @purity pure */
function panelCornerEntryStyle(stepsFromEdge: number, canAct: boolean): string {
  return (
    (canAct ? entryStyle('S-243') : entryFaintStyle('S-243')) +
    STYLE.panelCornerEntry +
    `right:${panelCornerRightPx(stepsFromEdge)}px;`
  )
}

// see HF-10, T-206
// WHY: the head stands S-313 off the right edge, the same distance as the row controls (HF-4).
// TRAP: read at the call; dom-screen-surface.ts imports this file, so a module-level read sees nothing.
/** @purity pure */
function panelCornerRightPx(stepsFromEdge: number): number {
  return NOT_STORED_TASK_GROUP_CONTROL_EDGE_SIZES['S-313'] + panelCornerStepPx() * stepsFromEdge
}

// see FR-029, S-237
// TRAP: step by the width the host paints; a border thinner than one device pixel is
// painted at 1px, so the box outgrows entranceOuterWidthPx and the entries lap (DFC-160).
/** @purity pure */
function panelCornerStepPx(): number {
  return entranceOuterHeightPx('S-243') + Math.ceil(entranceBorderPx()) * 2
}

/** @purity pure */
function headStepFromEdge(icon: HeadIcon): number {
  return HEAD_RUN.length - 1 - HEAD_RUN.indexOf(icon)
}

// see HF-10, HF-12
// WHY: the count's right edge touches the left edge of the leftmost entry, one step past the run.
/** @purity pure */
export function headFoldedTaskGroupCountRight(): string {
  return `right:${panelCornerRightPx(HEAD_RUN.length)}px;`
}

/** @purity non-pure */
function markPanelCornerEntry(
  entry: HTMLElement,
  stepsFromEdge: number,
  canAct: boolean | undefined,
): void {
  const usable = canAct !== false
  entry.setAttribute('style', panelCornerEntryStyle(stepsFromEdge, usable))
  entry.setAttribute('data-enabled', String(usable))
  if (usable) entry.removeAttribute('aria-disabled')
  else entry.setAttribute('aria-disabled', 'true')
}

export interface HeadEntries {
  readonly openEveryTaskGroup: HTMLElement
  readonly collapseEveryTaskGroup: HTMLElement
  readonly openLevelZero: HTMLElement
  readonly addTopTaskGroup: HTMLElement
  readonly deleteEveryTaskGroup: HTMLElement
}

/** @purity non-pure */
function headEntryElement(host: Document, icon: HeadIcon): HTMLElement {
  return panelCornerEntryElement(host, icon, headStepFromEdge(icon))
}

/** @purity non-pure */
function markHeadEntry(
  entry: HTMLElement,
  icon: HeadIcon,
  canAct: boolean | undefined,
): void {
  markPanelCornerEntry(entry, headStepFromEdge(icon), canAct)
}

// see HF-10, HF-12, HF-16, HF-17, HF-20
/** @purity non-pure */
export function headEntryElements(host: Document): HeadEntries {
  return {
    openEveryTaskGroup: headEntryElement(host, OPEN_EVERY_ROW_ENTRY),
    collapseEveryTaskGroup: headEntryElement(host, COLLAPSE_EVERY_ROW_ENTRY),
    openLevelZero: headEntryElement(host, OPEN_LEVEL_ZERO_ENTRY),
    addTopTaskGroup: headEntryElement(host, ADD_TOP_ROW_ENTRY),
    deleteEveryTaskGroup: headEntryElement(host, DELETE_EVERY_ROW_ENTRY),
  }
}

// see HF-10, HF-17, HF-20
/** @purity non-pure */
export function markHeadEntries(entries: HeadEntries, panel: TaskGroupPanel): void {
  markHeadEntry(entries.collapseEveryTaskGroup, COLLAPSE_EVERY_ROW_ENTRY, panel.canCloseEveryTaskGroup)
  markHeadEntry(entries.openLevelZero, OPEN_LEVEL_ZERO_ENTRY, panel.canOpenLevelZero)
  markHeadEntry(entries.openEveryTaskGroup, OPEN_EVERY_ROW_ENTRY, panel.canOpenEveryTaskGroup)
  markHeadEntry(entries.addTopTaskGroup, ADD_TOP_ROW_ENTRY, true)
  markHeadEntry(entries.deleteEveryTaskGroup, DELETE_EVERY_ROW_ENTRY, true)
}

// WHY: inferred from row tops: ScreenFrame carries no corner rectangle and no ruler height.
/** @purity pure */
export function taskGroupsTopPx(panel: TaskGroupPanel): number | null {
  let top: number | null = null
  for (const title of panel.pinnedTitles) {
    if (top === null || title.box.y < top) top = title.box.y
  }
  for (const title of panel.titles) {
    if (top === null || title.box.y < top) top = title.box.y
  }
  return top
}

// see U-22, FR-098
/** @purity non-pure */
export function fillTaskGroupTitleTree(
  host: Document,
  tree: HTMLElement,
  panel: TaskGroupPanel,
  anchors: Map<string, HTMLElement>,
): void {
  const drawn: HTMLElement[] = []
  for (const title of panel.pinnedTitles) {
    const row = taskGroupTitleElement(host, title, true, { anchors, groupId: title.groupId })
    anchors.set(anchorKey({ kind: 'taskGroupTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  for (const title of panel.titles) {
    const row = taskGroupTitleElement(host, title, false, { anchors, groupId: title.groupId })
    anchors.set(anchorKey({ kind: 'taskGroupTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  // WHY: after the rows, whose opaque ground would hide a line set before them; a hovered
  // row's z-index still lifts its controls over the lines (HF-19).
  for (const line of panel.groupGridLines ?? []) {
    const rule = made(host, 'div', boxStyle(line) + STYLE.groupGridLine)
    rule.setAttribute(GROUP_GRID_LINE_MARK, 'true')
    rule.setAttribute('aria-hidden', 'true')
    drawn.push(rule)
  }
  tree.replaceChildren(...drawn)
}

// TRAP: no term may read style or geometry off the tree; a forced layout costs what the key saves.
/** @purity non-pure */
export function taskGroupControlsMeasureKey(
  view: ScreenView,
  theme: ScreenTheme,
  headerHeightPx: number,
): string {
  const edge = panelEdge(view.frame, 'taskGroupPanel')
  const taskGroupsDrawn =
    view.taskGroupPanel.pinnedTitles.length + view.taskGroupPanel.titles.length > 0
  return [
    rowControlGridStyle(2, TASK_GROUP_CONTROL_STEPS.foldingGrid),
    rowControlGridStyle(1, TASK_GROUP_CONTROL_STEPS.pair),
    taskGroupControlBoxStyle(),
    taskGroupControlGlyphGapStyle(),
    String(taskGroupsDrawn),
    view.language,
    themeStyle(theme),
    String(edge === null ? 'none' : edge.x),
    String(headerHeightPx),
  ].join('|')
}

/** @purity non-pure */
export function taskGroupControlsHeightReporter(
  taskGroupTitleTree: HTMLElement,
  readClockMs: () => number,
  wiring: Pick<ScreenSurfaceWiring, 'onTaskGroupControlsHeightPx'>,
): (measuredAgainst: string) => void {
  let taskGroupControlsHeightPx = 0
  let taskGroupControlsMeasuredAgainst: string | null = null
  let taskGroupControlsPanelDrawnAtMs = 0

  // see LF-16, HF-19
  /** @purity non-pure */
  function reportRowControlsHeight(measuredAgainst: string): void {
    const drawnAtMs = readClockMs()
    const endsALull = drawnAtMs - taskGroupControlsPanelDrawnAtMs >= TASK_GROUP_CONTROLS_LULL_MS
    taskGroupControlsPanelDrawnAtMs = drawnAtMs
    if (
      !endsALull &&
      taskGroupControlsHeightPx !== 0 &&
      measuredAgainst === taskGroupControlsMeasuredAgainst
    )
      return
    taskGroupControlsMeasuredAgainst = measuredAgainst
    let tallest = taskGroupControlsHeightPx
    const stacked = `[${ROW_FOLDING_GRID_MARK}],[${TASK_GROUP_CONTROL_PAIR_MARK}]`
    for (const box of taskGroupTitleTree.querySelectorAll(stacked)) {
      tallest = Math.max(tallest, box.getBoundingClientRect().height)
    }
    if (tallest === taskGroupControlsHeightPx) return
    taskGroupControlsHeightPx = tallest
    wiring.onTaskGroupControlsHeightPx?.(tallest)
  }

  return reportRowControlsHeight
}
