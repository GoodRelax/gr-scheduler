// DomSvgSurface -- public entry of this folder.
//
// @unit      UF-49   (docs/spec/05-07-design.md, table T-075)
// @component DomSvgSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-26
//
// The implementation of SvgSurface (table T-065 IF-1). CP-26 gives it one job:
// put the string SvgRenderer built onto the page.
//
// ⭐ Why this is a component of its own, next to a name so close to it: 5.3
// says it in as many words -- the one that BUILDS the picture is `pure` and the
// one that SHOWS it is not, and R7.9 splits a pure side from a non-pure one.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { SvgSurface } from '../../adapter/svg-renderer/svg-renderer'

/**
 * A surface that writes into one element.
 *
 * ⚠️ `innerHTML` is deliberate and safe here: the only string that ever
 * reaches it is the one svgFromSchedule built, which escapes every value it
 * takes from the document. ⛔ Do not widen this to arbitrary markup -- FR-023
 * treats anything that arrived from outside as untrusted, and this seam has no
 * validator behind it.
 *
 * @purity non-pure
 */
export function domSvgSurface(host: Element): SvgSurface {
  let last = ''
  return {
    showSvg(svg: string): void {
      // A frame that redraws the identical picture is not rare -- table T-078
      // FT-4 wakes one for a timer that may change nothing visible -- and
      // rewriting the tree would throw away the browser's own paint work.
      if (svg === last) return
      last = svg
      host.innerHTML = svg
    },
  }
}
