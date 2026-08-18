// SvgRenderer -- declares the interface SvgSurface (table T-065 IF-1).
//
// @unit      UF-33   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      SvgSurface, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface SvgSurface {
  /**
   * Put the finished SVG on the screen.
   *
   * ⭐ A string, not a node tree. SvgRenderer is `pure` (table T-075 UF-32),
   * so what crosses this seam has to be a value; building nodes would need
   * the browser, which LR-6 keeps out of the inner layers and which 5.3 puts
   * on the far side of this declaration.
   *
   * ⚠️ Takes the whole picture rather than a patch. Table T-078 already limits
   * how often a frame runs, so the cost this saves is not the one that
   * matters, and a patch protocol would put the diffing rule -- which no
   * requirement states -- inside a seam.
   */
  showSvg(svg: string): void
}
