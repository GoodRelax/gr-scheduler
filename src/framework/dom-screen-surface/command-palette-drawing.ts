// DomScreenSurface -- the Command Palette: its grab band, minimise entry, groups and rules.
// @unit      UF-108  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { CommandPalette } from '../../adapter/screen-renderer/screen-renderer'
import {
  NOT_STORED_ARMED_LABEL_SIZES,
  NOT_STORED_PALETTE_GROUP_RULE_SIZES,
  NOT_STORED_PALETTE_ROW_CAP,
  PAINT,
  ROLE,
  STYLE,
  anchorKey,
  anchoredEntry,
  commandEntry,
  fillEntry,
  made,
  part,
} from './dom-screen-surface'

export const PALETTE_GRAB_BAND_ENTRY = 'IC-53'

// see FR-053
/** @purity pure */
export function paletteGroupRuleStyle(): string {
  const [thickness, clearance] = NOT_STORED_PALETTE_GROUP_RULE_SIZES['S-143']
  return (
    `height:${thickness}px;margin:${clearance}px;` +
    `background:${PAINT.rule};pointer-events:none;`
  )
}

// see FR-053, S-488
/** @purity pure */
export function paletteColumnsOf(entranceCount: number, perRowCap: number): number {
  if (entranceCount <= 0) return 0
  const rows = Math.ceil(entranceCount / perRowCap)
  return Math.ceil(entranceCount / rows)
}

/** @purity pure */
export function paletteColumnsStyle(entranceCount: number): string {
  const columns = paletteColumnsOf(entranceCount, NOT_STORED_PALETTE_ROW_CAP['S-488'])
  return `grid-template-columns:repeat(${columns},auto);`
}

// WHY: screen px on purpose (FR-053, IC-54, S-489); S-235 would take it below FR-077's S-8.
/** @purity pure */
export function armedLabelStyle(): string {
  return `font-size:${NOT_STORED_ARMED_LABEL_SIZES['S-489']}px;`
}

/** @purity pure */
function cornerStyle(at: { readonly x: number; readonly y: number }): string {
  return `position:absolute;left:${at.x}px;top:${at.y}px;`
}

// see GR-19, FR-053
/** @purity non-pure */
function grabBandElement(
  host: Document,
  palette: CommandPalette,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const { grabBandHeight: heightPx, minimise, isMinimised } = palette
  const band = made(host, 'div', STYLE.paletteGrabBand + `height:${heightPx}px;`)
  band.setAttribute('data-icon', PALETTE_GRAB_BAND_ENTRY)
  fillEntry(host, band, PALETTE_GRAB_BAND_ENTRY)
  // see FR-053, FR-102
  const record = palette.bandRecord ?? null
  if (record !== null) band.prepend(anchoredEntry(host, record, anchors))

  const toggle = commandEntry(host, minimise)
  toggle.setAttribute('style', toggle.getAttribute('style') + STYLE.paletteMinimise)
  toggle.setAttribute('aria-pressed', String(isMinimised))
  anchors.set(anchorKey({ kind: 'icon', icon: minimise.icon }), toggle)
  band.append(toggle)
  return band
}

// see U-26, FR-053
/** @purity non-pure */
export function paletteElement(
  host: Document,
  palette: CommandPalette,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const drawn = part(
    host,
    'div',
    ROLE.commandPalette,
    cornerStyle(palette.at) + STYLE.commandPalette,
  )
  const laid: HTMLElement[] = []
  for (const group of palette.groups) {
    if (laid.length > 0) laid.push(made(host, 'div', paletteGroupRuleStyle()))
    const box = part(host, 'div', ROLE.paletteGroups, STYLE.paletteGroup)
    const columns = paletteColumnsStyle(group.commands.length)
    const commands = part(host, 'div', ROLE.paletteCommands, STYLE.paletteCommands + columns)
    for (const item of group.commands) {
      commands.append(anchoredEntry(host, item, anchors))
    }
    box.append(commands)
    laid.push(box)
  }
  const armed =
    palette.armedText === null ? null : made(host, 'div', STYLE.armedText + armedLabelStyle())
  if (armed !== null) armed.textContent = palette.armedText

  // TRAP: the band is a child of the palette part, never a sibling: PALETTE_FAINT_CSS uses
  // :hover, which a sibling band would not keep matching while held.
  const band = grabBandElement(host, palette, anchors)
  anchors.set(anchorKey({ kind: 'icon', icon: PALETTE_GRAB_BAND_ENTRY }), band)

  if (palette.isMinimised) {
    drawn.replaceChildren(band)
    return drawn
  }
  const contents = made(host, 'div', STYLE.paletteContents)
  contents.replaceChildren(...laid, ...(armed === null ? [] : [armed]))

  drawn.replaceChildren(band, contents)
  return drawn
}
