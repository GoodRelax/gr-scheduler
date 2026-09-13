// DomSvgSurface: implements SvgSurface (table T-065 IF-1) in the page.
// @unit      UF-49   (docs/spec/05-07-design.md, table T-075)
// @component DomSvgSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-26

import type { SvgSurface } from '../../adapter/svg-renderer/svg-renderer'

/** @purity non-pure */
export function domSvgSurface(host: Element): SvgSurface {
  let last = ''
  return {
    showSvg(svg: string): void {
      if (svg === last) return
      last = svg
      // TRAP: innerHTML is safe only for svgFromSchedule's escaped output; other markup
      // reaching this seam is not validated (FR-023).
      host.innerHTML = svg
    },
  }
}
