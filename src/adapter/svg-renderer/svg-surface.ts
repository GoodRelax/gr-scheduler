// SvgRenderer -- declares the interface SvgSurface (table T-065 IF-1).
//
// @unit      UF-33   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      SvgSurface, implemented in another layer (LR-5)

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface SvgSurface {
  /**
   * A string, not a node tree: SvgRenderer is `pure` (table T-075 UF-32), and
   * building nodes needs the browser, which LR-6 keeps out of the inner layers.
   *
   * The whole picture, not a patch: table T-078 already limits how often a
   * frame runs, and a patch would put a diffing rule no requirement states
   * inside a seam.
   */
  showSvg(svg: string): void
}
