// DomScreenSurface -- the tooltips, placed under what they point at.
// @unit      UF-112  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { Tooltip, TooltipAnchor } from '../../adapter/screen-renderer/screen-renderer'
import {
  NOT_STORED_HELP_SIZES,
  STYLE,
  anchorKey,
  appendAssignment,
  made,
} from './dom-screen-surface'

// see EZ-2
/** @purity pure */
function tooltipStyle(): string {
  return `${STYLE.tooltip}font-size:${NOT_STORED_HELP_SIZES['S-204']}em;`
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

  // STOP: spec does not decide where EZ-6's tooltip stands. Looked in IN-3, EZ-6
  // @provisional PND-391
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
  return drawn
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
