// DomSvgSurface -- public entry of this folder.
//
// @unit      UF-49   (docs/spec/05-07-design.md, table T-075)
// @component DomSvgSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-26
//
// Implements SvgSurface (table T-065 IF-1, CP-26). A component of its own
// because building the picture is `pure` and showing it is not (5.3, R7.9).

import type { SvgSurface } from '../../adapter/svg-renderer/svg-renderer'

/**
 * `innerHTML` is safe only because the one string that reaches it is
 * svgFromSchedule's, which escapes every document value. Do not widen it to
 * arbitrary markup: this seam has no validator behind it (FR-023).
 *
 * @purity non-pure
 */
export function domSvgSurface(host: Element): SvgSurface {
  let last = ''
  return {
    showSvg(svg: string): void {
      // An identical picture is common (table T-078 FT-4 wakes a frame for a
      // timer), and rewriting the tree would discard the browser's paint work.
      if (svg === last) return
      last = svg
      host.innerHTML = svg
    },
  }
}
