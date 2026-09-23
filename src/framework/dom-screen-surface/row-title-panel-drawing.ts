// DomScreenSurface -- the Row Title Tree rows with their controls, grab strips and folded counts.
// @unit      UF-105  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  RowTitle,
  RowTitlePanel,
  ScreenView,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenSurfaceWiring, ScreenTheme } from './dom-screen-surface'
import {
  NOT_STORED_ICON_SIZES,
  NOT_STORED_ROW_BAND_SIZES,
  NOT_STORED_ROW_CONTROL_EDGE_SIZES,
  NOT_STORED_ROW_GRAB_STRIP_SIZES,
  PAINT,
  ROLE,
  ROW_GRAB_STRIP_MARK,
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

// see HF-20, HF-4
const HEAD_PAIR_RANKS = {
  remove: 0,
  add: 1,
} as const

export const DELETE_ROW_ENTRY = 'IC-82'

export const ADD_CHILD_ROW_ENTRY = 'IC-91'

const OPEN_ONE_LEVEL_ENTRY = 'IC-90'

export const ROW_CONTROL_GROUND_MARK = 'data-row-control-ground'

const ROW_FOLDING_GRID_MARK = 'data-row-folding-grid'

const ROW_CONTROL_PAIR_MARK = 'data-row-control-pair'

const ROW_CONTROLS_LULL_MS = 1000

/** @purity pure */
function rowControlStepPx(): number {
  return rowControlBoxPx()
}

/** @purity pure */
function rowControlRight(stepsFromEdge: number): string {
  return `right:${rowControlRightPx(stepsFromEdge)}px;`
}

// see HF-4, T-206
// TRAP: read at the call; dom-screen-surface.ts imports this file, so a module-level read sees nothing.
/** @purity pure */
function rowControlRightPx(stepsFromEdge: number): number {
  return NOT_STORED_ROW_CONTROL_EDGE_SIZES['S-313'] + rowControlStepPx() * stepsFromEdge
}

const ROW_CONTROL_STEPS = {
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

const ROW_CONTROL_LEFTMOST_STEP = ROW_CONTROL_STEPS.foldingGrid + 1

// see HF-1, HF-4
const ROW_CONTROL_RANKS = 2

// see HF-1, LF-16
/** @purity pure */
function rowControlLatticePx(): number {
  return entranceOuterHeightPx('S-243') * ROW_CONTROL_RANKS
}

// see HF-6, HF-19
// WHY: hit, so the gaps between controls count as the group; as tall as the lower of the
// row's bottom and the lattice's, which may hang over the rows below.
/** @purity pure */
function rowControlGroundStyle(leftmostStepsFromEdge: number): string {
  const reach = rowControlRightPx(leftmostStepsFromEdge)
  return (
    'position:absolute;top:0;right:0;' +
    `height:max(100%, ${rowControlLatticePx()}px);` +
    `width:${reach + rowControlBoxPx()}px;` +
    `background:${PAINT.panel};pointer-events:auto;`
  )
}

// see FR-029, S-243
/** @purity pure */
function rowControlBoxPx(): number {
  return entranceOuterWidthPx('S-243')
}

/** @purity pure */
function rowControlWidthCss(): string {
  return `${rowControlBoxPx()}px`
}

// see HF-5, FR-029
/** @purity pure */
function rowControlBoxStyle(): string {
  return (
    'display:inline-flex;box-sizing:border-box;' +
    `min-width:${entranceOuterWidthPx('S-243')}px;` +
    `padding:0 ${entranceGapPx('S-243')}px;`
  )
}

// see FR-029, S-243
/** @purity pure */
function rowControlGlyphGapStyle(): string {
  return `margin:${entranceGapPx('S-243')}px 0;`
}

// see HF-1, HF-4, LF-16, HF-19
/** @purity pure */
function rowControlGridStyle(columns: number, stepsFromEdge: number): string {
  const columnTracks = Array.from({ length: columns }, () => rowControlWidthCss()).join(' ')
  const rowTrack = `${entranceOuterHeightPx('S-243')}px`
  const rowTracks = Array.from({ length: ROW_CONTROL_RANKS }, () => rowTrack).join(' ')
  return (
    'position:absolute;display:grid;align-items:flex-start;' +
    `grid-template-columns:${columnTracks};` +
    `grid-template-rows:${rowTracks};` +
    `right:${rowControlRightPx(stepsFromEdge)}px;` +
    'pointer-events:none;'
  )
}

/** @purity pure */
function rowControlCellStyle(cell: { readonly column: number; readonly row: number }): string {
  return `position:static;grid-column:${cell.column};grid-row:${cell.row};`
}

const FOLDED_ROW_COUNT_MARK = 'data-folded-rows'

/** @purity pure */
function rowBandPx(): number {
  return NOT_STORED_ROW_BAND_SIZES['S-213']
}

// see HF-15
/** @purity pure */
function rowGrabbedStyle(axis: 'position' | 'depth'): string {
  const paint = axis === 'position' ? PAINT.grabAxisPosition : PAINT.grabAxisDepth
  const band = `${rowBandPx()}px solid ${paint}`
  return (
    `background:${stateGround(PAINT.heldRow, 'S-215')};` +
    (axis === 'position'
      ? `border-left:${band};border-right:${band};`
      : `border-top:${band};border-bottom:${band};`)
  )
}

// see HF-18
/** @purity pure */
function foldedRowCountStyle(rightPx: string): string {
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
export function markFoldedRowCount(mark: HTMLElement, count: number, rightPx: string): void {
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.textContent = FOLD_COUNT_MARK + String(count)
  mark.setAttribute('style', count > 0 ? foldedRowCountStyle(rightPx) : STYLE.hidden)
}

/** @purity non-pure */
export function foldedRowCountElement(host: Document, count: number, rightPx: string): HTMLElement {
  const mark = made(host, 'span', foldedRowCountStyle(rightPx))
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.setAttribute('aria-hidden', 'true')
  mark.textContent = FOLD_COUNT_MARK + String(count)
  return mark
}

// see GR-20, HF-15
/** @purity pure */
function rowGrabStripStyle(isHeld: boolean): string {
  const width = NOT_STORED_ICON_SIZES['S-138']
  return (
    `flex:none;width:${width}px;cursor:${isHeld ? 'grabbing' : 'grab'};pointer-events:auto;` +
    'text-align:center;' +
    `color:${isHeld ? PAINT.heldRow : PAINT.grabStrip};font-size:0.75em;user-select:none;`
  )
}

// see FR-029, HF-5, T-109
/** @purity non-pure */
function rowControlElement(
  host: Document,
  role: string | null,
  icon: string,
  canAct: boolean,
): HTMLElement {
  const style =
    (canAct ? STYLE.rowControl : STYLE.rowControl + STYLE.rowControlFaintInk) +
    rowControlBoxStyle()
  const control = role === null ? made(host, 'button', style) : part(host, 'button', role, style)
  control.setAttribute('type', 'button')
  control.setAttribute('data-icon', icon)
  control.setAttribute('aria-label', icon)
  if (!canAct) control.setAttribute('aria-disabled', 'true')
  fillEntry(host, control, icon, rowControlGlyphGapStyle())
  return control
}

// see FR-098, GR-20, HF-4, HF-15, HF-18
/** @purity non-pure */
function rowTitleElement(host: Document, title: RowTitle, isPinned: boolean): HTMLElement {
  const row = made(
    host,
    'div',
    // TRAP: the indent is the only inset; other padding lets the browser cut the name
    // silently, since isLabelTruncated records only FR-085's cut.
    boxStyle(title.box) +
      STYLE.rowTitle +
      `gap:${NOT_STORED_ROW_GRAB_STRIP_SIZES['S-218']}px;` +
      `padding:0 0 0 ${title.indentPx}px;` +
      // TRAP: title.isPinned, not the isPinned argument, which only says which list is built.
      (title.isPinned ? `background:${stateGround(PAINT.pinnedRow, 'S-214')};` : '') +
      (title.heldOnAxis == null ? '' : rowGrabbedStyle(title.heldOnAxis)),
  )
  if (title.heldOnAxis != null) row.setAttribute('data-held-axis', title.heldOnAxis)
  if (isPinned) row.setAttribute('data-role', ROLE.pinnedRow)
  row.setAttribute('data-group-id', title.groupId)
  row.setAttribute('data-depth', String(title.depth))
  row.setAttribute('data-pinned', String(title.isPinned))
  row.setAttribute('data-selected', String(title.isSelected))
  row.setAttribute('data-truncated', String(title.isLabelTruncated))
  if (title.isSelected) row.setAttribute('aria-selected', 'true')

  if (!title.isPinned) {
    const grab = made(host, 'div', rowGrabStripStyle(title.heldOnAxis != null))
    grab.setAttribute(ROW_GRAB_STRIP_MARK, 'true')
    grab.textContent = '⋮⋮'
    grab.setAttribute('aria-hidden', 'true')
    row.append(grab)
  }

  // TRAP: the size goes on the name alone; on the row the em-sized marks would follow it (HF-5).
  const label = made(host, 'span', STYLE.rowLabel + `font-size:${title.fontPx}px;`)
  label.textContent = title.label

  // TRAP: append the ground before every control: with no z-index, paint order is tree order.
  const ground = made(
    host,
    'div',
    rowControlGroundStyle(ROW_CONTROL_LEFTMOST_STEP),
  )
  ground.setAttribute(ROW_CONTROL_GROUND_MARK, 'true')
  ground.setAttribute('aria-hidden', 'true')
  row.append(ground)
  row.append(label)

  const foldingGrid = made(host, 'div', rowControlGridStyle(2, ROW_CONTROL_STEPS.foldingGrid))
  foldingGrid.setAttribute(ROW_FOLDING_GRID_MARK, 'true')
  row.append(foldingGrid)

  if (title.expander !== null) {
    const open = rowControlElement(host, ROLE.rowExpander, 'IC-58', title.expander.canOpen)
    open.setAttribute('data-can-open', String(title.expander.canOpen))
    open.setAttribute(
      'style',
      open.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.open),
    )
    foldingGrid.append(open)

    const close = rowControlElement(host, ROLE.rowExpander, 'IC-59', title.expander.canClose)
    close.setAttribute('data-can-close', String(title.expander.canClose))
    close.setAttribute(
      'style',
      close.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.close),
    )
    foldingGrid.append(close)

    const closeBelow = rowControlElement(
      host,
      ROLE.rowExpander,
      'IC-77',
      title.expander.canCloseBelow,
    )
    closeBelow.setAttribute('data-can-close-below', String(title.expander.canCloseBelow))
    closeBelow.setAttribute(
      'style',
      closeBelow.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.closeBelow),
    )
    foldingGrid.append(closeBelow)
  }

  // TRAP: outside the expander block: expander is null on a leaf, where HF-13 still draws IC-90.
  const openOneLevel = rowControlElement(
    host,
    ROLE.rowExpander,
    OPEN_ONE_LEVEL_ENTRY,
    title.canOpenOneLevel ?? true,
  )
  openOneLevel.setAttribute('data-can-open-one-level', String(title.canOpenOneLevel ?? true))
  openOneLevel.setAttribute(
    'style',
    openOneLevel.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.openOneLevel),
  )
  foldingGrid.append(openOneLevel)

  const controlPair = made(host, 'div', rowControlGridStyle(1, ROW_CONTROL_STEPS.pair))
  controlPair.setAttribute(ROW_CONTROL_PAIR_MARK, 'true')
  row.append(controlPair)

  const remove = rowControlElement(host, null, DELETE_ROW_ENTRY, true)
  remove.setAttribute(
    'style',
    remove.getAttribute('style') + rowControlCellStyle(ROW_CONTROL_PAIR_CELLS.remove),
  )
  controlPair.append(remove)

  const addChild = rowControlElement(
    host,
    null,
    ADD_CHILD_ROW_ENTRY,
    title.canAddChildRow ?? true,
  )
  addChild.setAttribute('data-can-add-child-row', String(title.canAddChildRow ?? true))
  addChild.setAttribute(
    'style',
    addChild.getAttribute('style') + rowControlCellStyle(ROW_CONTROL_PAIR_CELLS.addChild),
  )
  controlPair.append(addChild)

  const pin = rowControlElement(host, ROLE.rowPin, 'IC-60', true)
  pin.setAttribute('data-pinned', String(title.isPinned))
  pin.setAttribute('aria-pressed', String(title.isPinned))
  pin.setAttribute(
    'style',
    pin.getAttribute('style') +
      rowControlRight(ROW_CONTROL_STEPS.pin) +
      entranceStateFill(title.isPinned ? ['EN-3'] : []) +
      (title.isPinned ? 'visibility:visible;' : ''),
  )
  row.append(pin)

  const foldedRows = title.foldedRowCount ?? 0
  if (foldedRows > 0) {
    row.append(
      foldedRowCountElement(
        host,
        foldedRows,
        rowControlRight(ROW_CONTROL_STEPS.pin),
      ),
    )
    row.setAttribute(
      'style',
      (row.getAttribute('style') ?? '') +
        `box-shadow:inset ${rowBandPx()}px 0 0 0 ${PAINT.caution};`,
    )
  }
  return row
}

/** @purity non-pure */
function panelCornerEntryElement(
  host: Document,
  icon: string,
  stepsFromEdge: number,
  rank = 0,
): HTMLElement {
  const entry = made(host, 'button', panelCornerEntryStyle(stepsFromEdge, true, rank))
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

// see HF-10, HF-20
/** @purity pure */
function panelCornerEntryStyle(stepsFromEdge: number, canAct: boolean, rank = 0): string {
  return (
    (canAct ? entryStyle('S-243') : entryFaintStyle('S-243')) +
    STYLE.panelCornerEntry +
    `right:${panelCornerStepPx() * stepsFromEdge}px;` +
    (rank === 0 ? '' : `top:${panelCornerStepPx() * rank}px;`)
  )
}

// see FR-029, S-237
// TRAP: step by the width the host paints; a border thinner than one device pixel is
// painted at 1px, so the box outgrows entranceOuterWidthPx and the entries lap (DFC-160).
/** @purity pure */
function panelCornerStepPx(): number {
  return entranceOuterHeightPx('S-243') + Math.ceil(entranceBorderPx()) * 2
}

/** @purity pure */
export function headFoldedRowCountRight(): string {
  return `right:${panelCornerStepPx() * 4}px;`
}

/** @purity non-pure */
export function markPanelCornerEntry(
  entry: HTMLElement,
  stepsFromEdge: number,
  canAct: boolean | undefined,
  rank = 0,
): void {
  const usable = canAct !== false
  entry.setAttribute('style', panelCornerEntryStyle(stepsFromEdge, usable, rank))
  entry.setAttribute('data-enabled', String(usable))
  if (usable) entry.removeAttribute('aria-disabled')
  else entry.setAttribute('aria-disabled', 'true')
}

// see HF-17
/** @purity non-pure */
function addTopRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, ADD_TOP_ROW_ENTRY, 0, HEAD_PAIR_RANKS.add)
}

// see HF-20, IC-106
/** @purity non-pure */
function deleteEveryRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, DELETE_EVERY_ROW_ENTRY, 0, HEAD_PAIR_RANKS.remove)
}

// see HF-10, HF-12, HF-16, HF-17, HF-20
/** @purity non-pure */
export function headEntryElements(host: Document) {
  return {
    openEveryRow: panelCornerEntryElement(host, OPEN_EVERY_ROW_ENTRY, 1),
    collapseEveryRow: panelCornerEntryElement(host, COLLAPSE_EVERY_ROW_ENTRY, 2),
    openLevelZero: panelCornerEntryElement(host, OPEN_LEVEL_ZERO_ENTRY, 3),
    addTopRow: addTopRowElement(host),
    deleteEveryRow: deleteEveryRowElement(host),
  }
}

// see HF-17, HF-20
/** @purity non-pure */
export function markHeadPair(addTopRow: HTMLElement, deleteEveryRow: HTMLElement): void {
  markPanelCornerEntry(addTopRow, 0, true, HEAD_PAIR_RANKS.add)
  markPanelCornerEntry(deleteEveryRow, 0, true, HEAD_PAIR_RANKS.remove)
}

// WHY: inferred from row tops: ScreenFrame carries no corner rectangle and no ruler height.
/** @purity pure */
export function rowsTopPx(panel: RowTitlePanel): number | null {
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
export function fillRowTitleTree(
  host: Document,
  tree: HTMLElement,
  panel: RowTitlePanel,
  anchors: Map<string, HTMLElement>,
): void {
  const drawn: HTMLElement[] = []
  for (const title of panel.pinnedTitles) {
    const row = rowTitleElement(host, title, true)
    anchors.set(anchorKey({ kind: 'rowTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  for (const title of panel.titles) {
    const row = rowTitleElement(host, title, false)
    anchors.set(anchorKey({ kind: 'rowTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  tree.replaceChildren(...drawn)
}

// TRAP: no term may read style or geometry off the tree; a forced layout costs what the key saves.
/** @purity non-pure */
export function rowControlsMeasureKey(
  view: ScreenView,
  theme: ScreenTheme,
  headerHeightPx: number,
): string {
  const edge = panelEdge(view.frame, 'rowTitlePanel')
  const rowsDrawn =
    view.rowTitlePanel.pinnedTitles.length + view.rowTitlePanel.titles.length > 0
  return [
    rowControlGridStyle(2, ROW_CONTROL_STEPS.foldingGrid),
    rowControlGridStyle(1, ROW_CONTROL_STEPS.pair),
    rowControlBoxStyle(),
    rowControlGlyphGapStyle(),
    String(rowsDrawn),
    view.language,
    themeStyle(theme),
    String(edge === null ? 'none' : edge.x),
    String(headerHeightPx),
  ].join('|')
}

/** @purity non-pure */
export function rowControlsHeightReporter(
  rowTitleTree: HTMLElement,
  readClockMs: () => number,
  wiring: Pick<ScreenSurfaceWiring, 'onRowControlsHeightPx'>,
): (measuredAgainst: string) => void {
  let rowControlsHeightPx = 0
  let rowControlsMeasuredAgainst: string | null = null
  let rowControlsPanelDrawnAtMs = 0

  // see LF-16, HF-19
  /** @purity non-pure */
  function reportRowControlsHeight(measuredAgainst: string): void {
    const drawnAtMs = readClockMs()
    const endsALull = drawnAtMs - rowControlsPanelDrawnAtMs >= ROW_CONTROLS_LULL_MS
    rowControlsPanelDrawnAtMs = drawnAtMs
    if (
      !endsALull &&
      rowControlsHeightPx !== 0 &&
      measuredAgainst === rowControlsMeasuredAgainst
    )
      return
    rowControlsMeasuredAgainst = measuredAgainst
    let tallest = rowControlsHeightPx
    const stacked = `[${ROW_FOLDING_GRID_MARK}],[${ROW_CONTROL_PAIR_MARK}]`
    for (const box of rowTitleTree.querySelectorAll(stacked)) {
      tallest = Math.max(tallest, box.getBoundingClientRect().height)
    }
    if (tallest === rowControlsHeightPx) return
    rowControlsHeightPx = tallest
    wiring.onRowControlsHeightPx?.(tallest)
  }

  return reportRowControlsHeight
}
