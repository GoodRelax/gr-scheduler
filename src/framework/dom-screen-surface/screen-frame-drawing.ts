// DomScreenSurface -- the Panel Divider bands and lines and the Scrollbars, drawn from the frame.
// @unit      UF-103  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { ScreenFrame } from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  ROLE,
  SCROLLBAR_AXIS_ATTRIBUTE,
  STYLE,
  anchorKey,
  boxStyle,
  made,
  part,
} from './dom-screen-surface'

/** @purity pure */
function boxStyleWithin(box: ScreenRect, container: ScreenRect): string {
  return boxStyle({
    x: box.x - container.x,
    y: box.y - container.y,
    width: box.width,
    height: box.height,
  })
}

/** @purity pure */
export function panelEdge(
  frame: ScreenFrame,
  panel: 'rowTitlePanel' | 'propertiesPanel',
): ScreenRect | null {
  const divider = frame.dividers.find((one) => one.panel === panel)
  return divider === undefined ? null : divider.line
}

/** @purity pure */
export function horizontalScrollbar(frame: ScreenFrame): ScreenFrame['scrollbars'][number] | undefined {
  return frame.scrollbars.find((one) => one.axis === 'horizontal')
}

// see U-21, U-24, SC-4, GR-22
/** @purity non-pure */
export function fillScreenFrame(
  host: Document,
  layer: HTMLElement,
  bandLayer: HTMLElement,
  frame: ScreenFrame,
  anchors: Map<string, HTMLElement>,
): void {
  const drawn: HTMLElement[] = []
  const bands: HTMLElement[] = []
  for (const divider of frame.dividers) {
    const band = part(host, 'div', ROLE.panelDivider, boxStyle(divider.band) + STYLE.dividerBand)
    band.setAttribute('data-panel', divider.panel)
    bands.push(band)
    drawn.push(made(host, 'div', boxStyle(divider.line) + STYLE.dividerLine))
  }
  bandLayer.replaceChildren(...bands)
  for (const bar of frame.scrollbars) {
    const track = part(host, 'div', ROLE.scrollbars, boxStyle(bar.track) + STYLE.scrollbarTrack)
    track.setAttribute(SCROLLBAR_AXIS_ATTRIBUTE, bar.axis)
    // TRAP: the thumb stays inside the track: readScreenPartAt reads data-axis off ancestors.
    track.append(
      made(host, 'div', boxStyleWithin(bar.thumb, bar.track) + STYLE.scrollbarThumb),
    )
    anchors.set(anchorKey({ kind: 'scrollbar', axis: bar.axis }), track)
    drawn.push(track)
  }
  layer.replaceChildren(...drawn)
}
