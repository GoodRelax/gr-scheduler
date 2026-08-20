// ImageExporter -- declares the interface Rasterizer (table T-065 IF-6).
//
// @unit      UF-40   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    n/a
// @seam      Rasterizer, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHY THE SEAM EXISTS. IF-6 supplies "SVG から画像へ (IO-4)", and turning a
// picture into pixels needs the browser, which LR-6 keeps out of the inner
// layers and which 5.3 puts on the far side of this declaration. CP-31
// (`CanvasRasterizer`) is the one implementation.
//
// ⭐ NOTHING IS DECIDED ON THE FAR SIDE. Every rule of FR-025 and FR-080 -- the
// ratio, the output size, which UI parts are drawn, which `TaskGroup`s are
// dropped -- is settled before this seam is reached. What crosses is a finished
// picture and the pixel size to paint it at. ⚠️ That is deliberate: FR-080's
// RATIONALE makes the export the same picture as the screen, and a seam that
// let the far side choose a size or a fit would put part of that promise in the
// layer this component cannot test.
//
// ⛔ ONE DIRECTION, AND NO READ SIDE MAY BE ADDED. IO-4 of table T-024 admits
// writing only. A member that read an image back would open an intake, and
// FR-023 validates every intake -- there would be nothing here to validate it
// with.

/**
 * The pixel size the raster is painted at.
 *
 * ⭐ Pixels, and named so, because they are NOT the picture's own units: the
 * SVG that crosses this seam is `exportCanvas` (S-81) wide, and these are that
 * size multiplied by `exportPngScale` (S-82). ⚠️ The multiplication happens on
 * the near side -- S-82 is a value of the presentation group and this seam is
 * on the far side of the layer that may read it.
 */
export interface RasterSizePx {
  readonly widthPx: number
  readonly heightPx: number
}

/**
 * Why no image was made.
 *
 * ⭐ A classification, never a sentence, for the reason `ClipboardFault` gives:
 * FR-028 forbids throwing (MUST NOT) because reading an exception's text puts
 * the KIND of a failure at the mercy of the implementation, and a worded
 * failure would do the same. The words a person reads are the notice's (NT-1 of
 * table T-037) and depend on the display language (FR-038), which is the
 * screen's business.
 *
 * ⭐ Three values, because NT-3a of table T-037 (MUST) makes a failure notice
 * carry what can be done next, and these three do not share a next step: the
 * first leaves the SVG (IO-3) as the way out, the second leaves the smaller of
 * `exportPngScale`'s two values, and the third leaves trying again.
 */
export type RasterFaultReason =
  /** There is no way to raster here at all -- this browser, or this way of opening the app. */
  | 'unsupported'
  /** The size asked for is more than this machine will paint. */
  | 'tooLarge'
  /** It was attempted and did not finish. */
  | 'rasterFailed'

/**
 * One reason, and the detail behind it.
 *
 * ⚠️ Shaped like `FileStoreFault`, `JsonFault` and `Refusal` rather than like an
 * exception: FR-028 forbids the throw and AG-8 of table T-035 has a failed
 * image come back as a value.
 */
export interface RasterFault {
  readonly reason: RasterFaultReason
  /** Detail for the log and for the notice's body. Never the only thing said. */
  readonly what: string
}

/**
 * What came of one rastering. ⭐ The bytes, not a handle or a URL: LR-6 keeps
 * the browser's own types out, and `OpenedFileContent` already settles that a
 * file's contents travel through this tree as bytes.
 */
export type Rastering =
  | { readonly ok: true; readonly pngBytes: Uint8Array }
  | { readonly ok: false; readonly fault: RasterFault }

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface Rasterizer {
  /**
   * Paint one finished picture at one size. The whole of what IF-6 supplies.
   *
   * ⭐ Answers, and does not just act. AG-8 of table T-035 requires the caller
   * to receive a failure as a value, and NT-3a forbids telling a person that
   * something failed without telling them what to do next -- neither is
   * possible if the call is a shout into the dark.
   *
   * ⭐ A promise, because on the far side an image has to be decoded before it
   * can be painted, and that is settled after the call returns. ⛔ It must not
   * reject: FR-028 forbids the exception, and every way this can fail is one of
   * `RasterFaultReason`'s values. ⚠️ The entry of this folder does not take
   * that on trust -- see `exportPng`.
   *
   * ⚠️ Reads the machine's own painting, so it is not deterministic in the way
   * a pure function is: two machines answer with different bytes for the same
   * picture. WY-2 of table T-041 compares two exports made in one environment,
   * which is why that stays a judgeable rule.
   *
   * @purity semi-pure-b
   */
  rasterizePng(svg: string, sizePx: RasterSizePx): Promise<Rastering>
}
