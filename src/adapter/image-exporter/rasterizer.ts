// ImageExporter -- declares the interface Rasterizer (table T-065 IF-6).
//
// @unit      UF-40   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    n/a
// @seam      Rasterizer, implemented in another layer (LR-5)
//
// A seam because rastering needs the browser, which LR-6 keeps out of the inner
// layers (IF-6; CP-31 `CanvasRasterizer` implements it).
//
// Nothing is decided on the far side: every FR-025 / FR-080 rule is settled
// before the call, so no part of FR-080's same-picture promise lands in a layer
// this component cannot test.
//
// Write only (IO-4 of table T-024). A read member would open an intake FR-023
// requires validated, with nothing here to validate it.

/**
 * Named in pixels because they are not the SVG's own units (S-81, FR-025); the
 * same size, with no multiplier (FR-025).
 */
export interface RasterSizePx {
  readonly widthPx: number
  readonly heightPx: number
}

/**
 * A classification, never a sentence (FR-028); the words are the notice's (NT-1
 * of table T-037, FR-038).
 *
 * One value per next step NT-3a asks the notice to offer: the SVG (IO-3), an
 * exchange format (IO-2 / IO-7 / IO-1 / IO-3 of table T-024), or trying again.
 */
export type RasterFaultReason =
  /** There is no way to raster here at all -- this browser, or this way of opening the app. */
  | 'unsupported'
  /** The size asked for is more than this machine will paint. */
  | 'tooLarge'
  /** It was attempted and did not finish. */
  | 'rasterFailed'

/** Shaped like `FileStoreFault`, `JsonFault` and `Refusal` (FR-028, AG-8). */
export interface RasterFault {
  readonly reason: RasterFaultReason
  /** Detail for the log and for the notice's body. Never the only thing said. */
  readonly what: string
}

/**
 * Bytes, not a handle or a URL: LR-6 keeps browser types out, and
 * `OpenedFileContent` already carries file contents as bytes.
 */
export type Rastering =
  | { readonly ok: true; readonly pngBytes: Uint8Array }
  | { readonly ok: false; readonly fault: RasterFault }

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface Rasterizer {
  /**
   * Answers with a value (AG-8 of table T-035, NT-3a).
   *
   * A promise because the image decodes after the call returns. It must not
   * reject (FR-028); `exportPng` does not take that on trust.
   *
   * Two machines paint different bytes for one picture; WY-2 of table T-041
   * compares exports made in one environment.
   *
   * @purity semi-pure-b
   */
  rasterizePng(svg: string, sizePx: RasterSizePx): Promise<Rastering>
}
