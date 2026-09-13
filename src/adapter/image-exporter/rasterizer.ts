// ImageExporter -- declares the interface Rasterizer (table T-065 IF-6).
// @unit      UF-40   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    n/a
// @seam      Rasterizer, implemented in another layer (LR-5)

export interface RasterSizePx {
  readonly widthPx: number
  readonly heightPx: number
}

export type RasterFaultReason =
  | 'unsupported'
  | 'tooLarge'
  | 'rasterFailed'

export interface RasterFault {
  readonly reason: RasterFaultReason
  readonly what: string
}

export type Rastering =
  | { readonly ok: true; readonly pngBytes: Uint8Array }
  | { readonly ok: false; readonly fault: RasterFault }

export interface Rasterizer {
  /** @purity semi-pure-b */
  rasterizePng(svg: string, sizePx: RasterSizePx): Promise<Rastering>
}
