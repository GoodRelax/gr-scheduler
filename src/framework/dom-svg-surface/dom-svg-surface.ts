// DomSvgSurface: implements SvgSurface (table T-065 IF-1) in the page.
// @unit      UF-49   (docs/spec/05-07-design.md, table T-075)
// @component DomSvgSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-26

import type { SvgSurface } from '../../adapter/svg-renderer/svg-renderer'

// see IF-1
// WHY: on the host's top-left over the picture beneath; it takes no point, so IF-9's answer is the same with or without it.
const MARQUEE_OVERLAY_PLACEMENT = 'position:absolute;left:0;top:0;pointer-events:none'

/** @purity non-pure */
export function domSvgSurface(host: Element): SvgSurface {
  let last = ''
  let lastOverlay = ''
  let overlay: Element | null = null
  return {
    showSvg(svg: string): void {
      if (svg === last) return
      last = svg
      // TRAP: innerHTML is safe only for the escaped output of svgFromSchedule and marqueeOverlaySvg;
      // other markup reaching this seam is not validated (FR-023).
      host.innerHTML = svg
      if (overlay !== null) host.append(overlay)
    },
    showMarqueeOverlaySvg(svg: string): void {
      if (svg === lastOverlay) return
      lastOverlay = svg
      overlay?.remove()
      overlay = null
      if (svg === '') return
      host.insertAdjacentHTML('beforeend', svg)
      overlay = host.lastElementChild
      overlay?.setAttribute('style', `${overlay.getAttribute('style') ?? ''};${MARQUEE_OVERLAY_PLACEMENT}`)
    },
  }
}
