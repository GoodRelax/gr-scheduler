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

const WINDOW_SIDES = 2

// see EZ-2, IN-7
/** @purity pure */
function tooltipStyle(): string {
  return (
    `${STYLE.tooltip}font-size:${NOT_STORED_HELP_SIZES['S-204']}em;` +
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
  const words = made(host, 'span', '')
  words.textContent = tip.assignment ? `${tip.text} ` : tip.text
  drawn.append(words)
  if (tip.assignment) appendAssignment(host, drawn, tip.assignment, true)

  if (tip.at !== undefined) {
    drawn.setAttribute(
      'style',
      tooltipStyle() + `pointer-events:none;left:${tip.at.x}px;top:${tip.at.y}px;`,
    )
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

// see EZ-2, IN-7
// WHY: measured once, when shown; a window resized while it stands is not followed (IN-7).
/** @purity non-pure */
export function keepTooltipsInside(layer: HTMLElement): void {
  const room = layer.getBoundingClientRect()
  const margin = NOT_STORED_HELP_SIZES['S-339']
  for (const drawn of Array.from(layer.children)) {
    const anchorRight = anchorRightOf.get(drawn)
    if (anchorRight === undefined) continue
    const size = drawn.getBoundingClientRect()
    if (size.right <= room.right - margin) continue
    const left = Math.max(room.left + margin, anchorRight - size.width)
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

// see DC-3, IN-3
// WHY: placed after it is in the layer, since only then does it have a size to turn back by.
// TRAP: the layer carries no data-role, so readScreenPartAt never answers it and a press reaches the chart.
/** @purity non-pure */
export function showDualCursorReadout(
  host: Document,
  layer: HTMLElement,
  readout: ScreenView['dualCursorReadout'],
): void {
  if (readout === undefined) {
    if (layer.firstElementChild !== null) layer.replaceChildren()
    return
  }
  const box = made(host, 'div', readoutStyle(readout.at.x, readout.at.y))
  for (const line of readout.lines) {
    const drawn = made(host, 'div', '')
    drawn.textContent = line
    box.append(drawn)
  }
  box.setAttribute('style', readoutStyle(readout.at.x, readout.at.y))
  layer.replaceChildren(box)
  const room = layer.getBoundingClientRect()
  const size = box.getBoundingClientRect()
  const x = readout.at.x + size.width > room.width ? readout.at.x - size.width : readout.at.x
  const y = readout.at.y + size.height > room.height ? readout.at.y - size.height : readout.at.y
  if (x !== readout.at.x || y !== readout.at.y) box.setAttribute('style', readoutStyle(x, y))
}

/** @purity pure */
function readoutStyle(x: number, y: number): string {
  const size = `max(${NOT_STORED_HELP_SIZES['S-340']}px, ${NOT_STORED_HELP_SIZES['S-334']}em)`
  return (
    `${STYLE.tooltip}font-size:${size};` +
    `pointer-events:none;white-space:nowrap;max-width:none;left:${x}px;top:${y}px;`
  )
}
