// DomScreenSurface -- the Command Palette: its grab band, minimise entry, groups and rules.
// @unit      UF-108  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { CommandItem, CommandPalette } from '../../adapter/screen-renderer/screen-renderer'
import {
  NOT_STORED_PALETTE_GROUP_RULE_SIZES,
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

const PALETTE_GRAB_BAND_ENTRY = 'IC-53'

// see FR-053
/** @purity pure */
export function paletteGroupRuleStyle(): string {
  const [thickness, clearance] = NOT_STORED_PALETTE_GROUP_RULE_SIZES['S-143']
  return (
    `height:${thickness}px;margin:${clearance}px;` +
    `background:${PAINT.rule};pointer-events:none;`
  )
}

/** @purity pure */
function cornerStyle(at: { readonly x: number; readonly y: number }): string {
  return `position:absolute;left:${at.x}px;top:${at.y}px;`
}

// see GR-19, FR-053
/** @purity non-pure */
function grabBandElement(
  host: Document,
  heightPx: number,
  minimise: CommandItem,
  isMinimised: boolean,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const band = made(host, 'div', STYLE.paletteGrabBand + `height:${heightPx}px;`)
  band.setAttribute('data-icon', PALETTE_GRAB_BAND_ENTRY)
  fillEntry(host, band, PALETTE_GRAB_BAND_ENTRY)

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
    const commands = part(host, 'div', ROLE.paletteCommands, STYLE.paletteCommands)
    for (const item of group.commands) {
      commands.append(anchoredEntry(host, item, anchors))
    }
    box.append(commands)
    laid.push(box)
  }
  const armed =
    palette.armedText === null ? null : made(host, 'div', STYLE.armedText)
  if (armed !== null) armed.textContent = palette.armedText

  // TRAP: the band is a child of the palette part, never a sibling: PALETTE_FAINT_CSS uses
  // :hover, which a sibling band would not keep matching while held.
  const band = grabBandElement(
    host,
    palette.grabBandHeight,
    palette.minimise,
    palette.isMinimised,
    anchors,
  )
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
