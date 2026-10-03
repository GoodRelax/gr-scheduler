// DomScreenSurface -- the tooltips, placed under what they point at.
// @unit      UF-112  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  ScreenView,
  Tooltip,
  TooltipAnchor,
} from '../../adapter/screen-renderer/screen-renderer'
import {
  NOT_STORED_HELP_SIZES,
  STYLE,
  anchorKey,
  appendAssignment,
  made,
} from './dom-screen-surface'

const anchorRightOf = new WeakMap<Element, number>()

const pointOf = new WeakMap<Element, Point>()

type Point = { readonly x: number; readonly y: number }

type Size = { readonly width: number; readonly height: number }

const WINDOW_SIDES = 2

const LINE_BREAK = '\n'

// see EZ-2, IN-7
// WHY: border-box, so the cap holds the padding and the border too; content-box let a capped tip end past S-339 (DFC-1476).
/** @purity pure */
function tooltipStyle(): string {
  return (
    `${STYLE.tooltip}font-size:${NOT_STORED_HELP_SIZES['S-204']}em;box-sizing:border-box;` +
    `max-width:calc(100vw - ${WINDOW_SIDES * NOT_STORED_HELP_SIZES['S-339']}px);`
  )
}

// see IN-3, EZ-2
/** @purity non-pure */
export function tooltipElement(
  host: Document,
  tip: Tooltip,
  anchorFor: (key: string, anchor: TooltipAnchor) => HTMLElement | undefined,
): HTMLElement {
  const key = anchorKey(tip.anchor)
  const drawn = made(host, 'div', tooltipStyle())
  drawn.setAttribute('role', 'tooltip')
  drawn.setAttribute('data-anchor', key)
  appendTextLines(host, drawn, tip.assignment ? `${tip.text} ` : tip.text)
  if (tip.assignment) appendAssignment(host, drawn, tip.assignment, true)

  if (tip.at !== undefined) {
    drawn.setAttribute('style', pointTipStyle(tip.at.x, tip.at.y + NOT_STORED_HELP_SIZES['S-460']))
    pointOf.set(drawn, tip.at)
    return drawn
  }

  const anchored = anchorFor(key, tip.anchor)
  if (anchored === undefined) {
    drawn.setAttribute('style', tooltipStyle() + 'left:0;top:0;')
    return drawn
  }
  const foundAt = anchored.getBoundingClientRect()
  drawn.setAttribute('style', tooltipStyle() + `left:${foundAt.left}px;top:${foundAt.bottom}px;`)
  anchorRightOf.set(drawn, foundAt.right)
  return drawn
}

// see EZ-6, IN-7
/** @purity non-pure */
function appendTextLines(host: Document, drawn: HTMLElement, text: string): void {
  const lines = text.split(LINE_BREAK)
  if (lines.length === 1) {
    const words = made(host, 'span', '')
    words.textContent = text
    drawn.append(words)
    return
  }
  for (const line of lines) {
    const row = made(host, 'div', '')
    row.textContent = line
    drawn.append(row)
  }
}

/** @purity pure */
function pointTipStyle(left: number, top: number): string {
  return tooltipStyle() + `pointer-events:none;left:${left}px;top:${top}px;`
}

// see IN-7, S-460
// WHY: one placing for every tip at the pointer's point (EZ-6, DC-3, CU-3); S-460 is never scaled.
/** @purity pure */
export function pointTipPlace(point: Point, size: Size, room: Size): { readonly left: number; readonly top: number } {
  const offset = NOT_STORED_HELP_SIZES['S-460']
  const margin = NOT_STORED_HELP_SIZES['S-339']
  const rightTurned = point.x + size.width > room.width - margin ? point.x - size.width : point.x
  const left = Math.max(margin, rightTurned)
  const below = point.y + offset
  const above = point.y - offset - size.height
  const isTurnedUp = below + size.height > room.height - margin && above >= margin
  return { left, top: isTurnedUp ? above : below }
}

// see EZ-2, IN-7
// WHY: measured once, when shown: the surface places again only for a changed set, never for a resize (IN-7, JDG-728).
/** @purity non-pure */
export function keepTooltipsInside(layer: HTMLElement): void {
  const tooltips = Array.from(layer.children)
  if (!tooltips.some((drawn) => anchorRightOf.has(drawn) || pointOf.has(drawn))) return
  const room = layer.getBoundingClientRect()
  const margin = NOT_STORED_HELP_SIZES['S-339']
  for (const drawn of tooltips) {
    const point = pointOf.get(drawn)
    if (point !== undefined) {
      const placed = pointTipPlace(point, drawn.getBoundingClientRect(), room)
      drawn.setAttribute('style', pointTipStyle(placed.left, placed.top))
      continue
    }
    const anchorRight = anchorRightOf.get(drawn)
    if (anchorRight === undefined) continue
    const size = drawn.getBoundingClientRect()
    const fitsRight = size.right <= room.right - margin
    if (fitsRight && size.left >= room.left + margin) continue
    const left = Math.max(room.left + margin, fitsRight ? size.left : anchorRight - size.width)
    drawn.setAttribute('style', tooltipStyle() + `left:${left}px;top:${size.top}px;`)
  }
}

/** @purity non-pure */
export function tooltipAnchorTable(root: HTMLElement) {
  // WHY: one map per part, not one for the screen: a single map keeps detached nodes of rebuilt
  // parts, which measure to nothing and put a tooltip in the top-left corner.
  const anchorsByPart = new Map<string, Map<string, HTMLElement>>()

  /** @purity non-pure */
  function anchorsOf(name: string): Map<string, HTMLElement> {
    const held = anchorsByPart.get(name) ?? new Map<string, HTMLElement>()
    held.clear()
    anchorsByPart.set(name, held)
    return held
  }

  /** @purity semi-pure-b */
  function anchorFor(key: string, anchor: TooltipAnchor): HTMLElement | undefined {
    for (const held of anchorsByPart.values()) {
      const found = held.get(key)
      if (found !== undefined) return found
    }
    if (anchor.kind !== 'icon') return undefined
    return root.querySelector<HTMLElement>(`[data-icon="${anchor.icon}"]`) ?? undefined
  }

  return { anchorsOf, anchorFor }
}

const shownPointTipOf = new WeakMap<Element, string>()

// see DC-3, CU-3, IN-7
// WHY: placed after it is in the layer, since only then does it have a size to turn back by.
// TRAP: the layer carries no data-role, so readScreenPartAt never answers it and a press reaches the chart.
/** @purity non-pure */
export function showPointTip(
  host: Document,
  layer: HTMLElement,
  tip: { readonly lines: readonly string[]; readonly at: Point } | undefined,
): void {
  const key = tip === undefined ? '' : JSON.stringify(tip)
  if (shownPointTipOf.get(layer) === key) return
  shownPointTipOf.set(layer, key)
  if (tip === undefined) {
    if (layer.firstElementChild !== null) layer.replaceChildren()
    return
  }
  const box = made(host, 'div', readoutStyle(tip.at.x, tip.at.y))
  for (const line of tip.lines) {
    const drawn = made(host, 'div', '')
    drawn.textContent = line
    box.append(drawn)
  }
  layer.replaceChildren(box)
  const placed = pointTipPlace(tip.at, box.getBoundingClientRect(), layer.getBoundingClientRect())
  box.setAttribute('style', readoutStyle(placed.left, placed.top))
}

/** @purity non-pure */
export function showDualCursorReadout(
  host: Document,
  layer: HTMLElement,
  readout: ScreenView['dualCursorReadout'],
): void {
  showPointTip(host, layer, readout)
}

/** @purity pure */
function readoutStyle(x: number, y: number): string {
  const size = `max(${NOT_STORED_HELP_SIZES['S-340']}px, ${NOT_STORED_HELP_SIZES['S-334']}em)`
  return (
    `${STYLE.tooltip}font-size:${size};` +
    `pointer-events:none;white-space:nowrap;max-width:none;left:${x}px;top:${y}px;`
  )
}
