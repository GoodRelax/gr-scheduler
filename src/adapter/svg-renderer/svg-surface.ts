// SvgRenderer -- declares the interface SvgSurface (table T-065 IF-1).
// @unit      UF-33   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      SvgSurface, implemented in another layer (LR-5)

export interface SvgSurface {
  showSvg(svg: string): void
}
