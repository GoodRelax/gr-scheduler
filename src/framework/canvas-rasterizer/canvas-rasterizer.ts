// CanvasRasterizer -- public entry of this folder.
//
// @unit      UF-54   (docs/spec/05-07-design.md, table T-075)
// @component CanvasRasterizer, layer Framework (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-31
//
// Implements `Rasterizer` (IF-6 of table T-065), declared by ImageExporter:
// LR-5 of table T-061 puts an inner layer's interface implementation outside
// it, and LY-5 of table T-060 lets this layer touch the browser.
//
// Nothing about the export is decided here: FR-025, FR-080 and table T-076 fix
// size and picture before the call, so S-81 is not read -- a second reading
// would be a second place deciding the size. IO-4 is write-only, so no intake
// is opened for FR-023.
//
// The caller hands in one `Document` and only `createElement` is called on it,
// so the browser arrives by injection (R7.3) and the unit runs under Node.
//
// Painting an SVG through a canvas has three traps; each ends as a value the
// caller can read (AG-8 of table T-035, FR-028):
//
//   1. A tainted canvas refuses `toBlob`, and the taint shows only then. The
//      `SecurityError` is answered `unsupported`, whose next step is IO-3's
//      SVG: no smaller size or retry changes a browser that taints.
//   2. Fonts. An SVG in an <img> fetches nothing and inherits no page faces, so
//      awaiting `document.fonts.ready` would not help. Every reference that is
//      not `#...` or `data:...` is refused by name instead (WY-2 of table
//      T-041). ⛔ A family the machine lacks falls back silently, undetectably.
//   3. Intrinsic size. A decoder may rasterize at the SVG's own size and scale
//      the bitmap, blurring it, so with a `viewBox` the root width and height
//      are rewritten to the size asked for; with neither, the picture is refused.
//
// WY-2: no clock, random source or kept state, so one environment answers the
// same bytes; across machines they differ, which is why WY-2 compares within
// one. The consistency unit is one call (R7.4).

import type {
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from '../../adapter/image-exporter/image-exporter'

/** IO-4 of table T-024. */
const PNG_MIME = 'image/png'

/** What the data url declares the picture to be. IO-3 of table T-024. */
const SVG_MIME = 'image/svg+xml'

/**
 * The smallest side a canvas can have: the floor a requested side must clear,
 * and the size of the probe in `canPaintAtAll`. Not a specification value.
 */
const SMALLEST_SIDE_PX = 1

/** The name a browser gives the error a tainted canvas throws. */
const TAINTED_ERROR = 'SecurityError'

/** ⚠️ `stroke-width` is not `width`: the pattern requires a space before it. */
const SIZE_ATTRIBUTE = /\s+(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*')/g
const VIEW_BOX_ATTRIBUTE = /\sviewBox\s*=\s*(?:"[^"]*"|'[^']*')/
const WIDTH_ATTRIBUTE = /\swidth\s*=/
const HEIGHT_ATTRIBUTE = /\sheight\s*=/

/**
 * The attributes a decoder would fetch.
 *
 * ⛔ Not `xmlns`: a namespace url is never fetched, and counting it would refuse
 * every SVG.
 */
const FETCHED_ATTRIBUTE = /\s(?:xlink:href|href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

/** The same, inside a style: `url(...)` is how CSS fetches. */
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\)/g

/** ⚠️ `@import "..."` fetches without a `url(...)` around it. */
const CSS_IMPORT = /@import\b/

const WHAT_NOT_WHOLE_PIXELS = 'a side is not a whole number of pixels, one or more'
const WHAT_FETCHES = 'the picture reaches outside itself, which an image cannot do'
const WHAT_NO_ROOT_TAG = 'the picture carries no root svg tag'
const WHAT_NO_SIZE = 'the picture carries neither a viewBox nor a width and height'
const WHAT_SIZE_REFUSED = 'the canvas did not keep the size it was given'
const WHAT_NO_CONTEXT_HERE = 'this browser gives no 2d drawing context at all'
const WHAT_NO_CONTEXT_THIS_SIZE = 'no 2d drawing context came back for a canvas this size'
const WHAT_DECODE = 'the picture was not decoded and drawn'
const WHAT_NO_BYTES = 'the canvas produced no bytes'
const WHAT_TAINTED = 'this browser taints a canvas drawn from an svg, so the bytes are refused'
const WHAT_BYTES = 'the bytes were not read back from the canvas'
const WHAT_UNEXPECTED = 'the browser threw instead of answering'

/**
 * Every failed exit of this unit.
 *
 * A value, never a throw (FR-028, AG-8 of table T-035).
 *
 * @purity pure
 */
function failedRastering(reason: RasterFaultReason, what: string): Rastering {
  return { ok: false, fault: { reason, what } }
}

/**
 * A canvas is a whole number of pixels on each side.
 *
 * Refused rather than rounded: a canvas truncates, and rounding here would make
 * this unit decide an export's size, which FR-025 fixes. No row states this;
 * it is an acceptance boundary, not a tunable value.
 *
 * @purity pure
 */
function isPaintableSize(sizePx: RasterSizePx): boolean {
  const isPaintableSide = (side: number): boolean =>
    Number.isInteger(side) && side >= SMALLEST_SIDE_PX
  return isPaintableSide(sizePx.widthPx) && isPaintableSide(sizePx.heightPx)
}

/**
 * A reference the decoder would have to fetch, or `null` when the picture is
 * self-contained.
 *
 * An SVG rendered as an image fetches nothing, so what sits behind such a
 * reference would be silently missing from the raster, and WY-2 / FR-080 could
 * not be judged on it. No row states the refusal; it is an acceptance boundary.
 *
 * @purity pure
 */
function fetchedReference(svg: string): string | null {
  const references: string[] = []
  for (const hit of svg.matchAll(FETCHED_ATTRIBUTE)) references.push(hit[1] ?? hit[2] ?? '')
  for (const hit of svg.matchAll(CSS_URL)) references.push(hit[1] ?? hit[2] ?? hit[3] ?? '')
  const fetched = references.find((reference) => isFetched(reference))
  if (fetched !== undefined) return fetched
  return CSS_IMPORT.test(svg) ? '@import' : null
}

/**
 * `#...` points inside the picture and `data:` carries what it needs; anything
 * else is a fetch. An empty reference asks for nothing.
 *
 * @purity pure
 */
function isFetched(reference: string): boolean {
  const target = reference.trim().toLowerCase()
  if (target === '') return false
  return !target.startsWith('#') && !target.startsWith('data:')
}

/** Where the root `<svg ...>` tag starts and where it ends. */
interface RootTag {
  readonly start: number
  readonly end: number
}

/**
 * The root tag's range, or `null` when the string carries no root tag.
 *
 * ⚠️ Quotes are tracked instead of taking the first `>`, which an attribute
 * value may hold.
 *
 * @purity pure
 */
function rootSvgTag(svg: string): RootTag | null {
  const start = svg.indexOf('<svg')
  if (start === -1) return null
  // ⛔ `<svgfoo` is a different element: a tag name ends at a delimiter.
  const afterName = svg[start + '<svg'.length]
  if (afterName === undefined || /[^\s/>]/.test(afterName)) return null
  let quote = ''
  for (let foundAt = start + '<svg'.length; foundAt < svg.length; foundAt += 1) {
    const character = svg[foundAt] ?? ''
    if (quote !== '') {
      if (character === quote) quote = ''
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      return { start, end: foundAt + 1 }
    }
  }
  return null
}

/** The picture a decoder can size, or why it cannot be given one. */
type SizedPicture =
  | { readonly ok: true; readonly svg: string }
  | { readonly ok: false; readonly what: string }

/**
 * The same picture, carrying the intrinsic size the decoder needs.
 *
 * The `viewBox` makes the rewrite lossless: it maps the picture's own units
 * onto whatever width and height the root declares.
 * ⚠️ A picture with a size but no `viewBox` is left as it is -- its units are
 * its pixels, so rewriting would move the content -- and may come out soft.
 *
 * Not stated by IO-3 / IO-4 of table T-024; class C. The SVG the person
 * receives (IO-3) is untouched: this is a copy for the decoder.
 *
 * @provisional PND-132
 * @purity pure
 */
function sizedSvg(svg: string, sizePx: RasterSizePx): SizedPicture {
  const tag = rootSvgTag(svg)
  if (tag === null) return { ok: false, what: WHAT_NO_ROOT_TAG }
  const tagText = svg.slice(tag.start, tag.end)
  if (!VIEW_BOX_ATTRIBUTE.test(tagText)) {
    const hasIntrinsicSize = WIDTH_ATTRIBUTE.test(tagText) && HEIGHT_ATTRIBUTE.test(tagText)
    return hasIntrinsicSize ? { ok: true, svg } : { ok: false, what: WHAT_NO_SIZE }
  }
  // ⛔ The old pair is removed, not shadowed: the data url is read as XML, where
  // a repeated attribute is a fatal parse error.
  const rest = tagText.slice('<svg'.length).replace(SIZE_ATTRIBUTE, '')
  const sized = `<svg width="${sizePx.widthPx}" height="${sizePx.heightPx}"${rest}`
  return { ok: true, svg: svg.slice(0, tag.start) + sized + svg.slice(tag.end) }
}

/**
 * The picture as something an <img> can be pointed at.
 *
 * A `data:` url, not a blob url: `URL.createObjectURL` is a global this unit
 * would have to reach for (R7.3). The cost is length.
 *
 * @purity pure
 */
function svgDataUrl(svg: string): string {
  return `data:${SVG_MIME};charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * What a thrown thing calls itself.
 *
 * The `name`, never the message: the message is implementation wording
 * (FR-028) and may be non-ASCII. Read as a property, not with `instanceof
 * DOMException`, which is a browser global.
 *
 * @purity pure
 */
function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''
  const named: unknown = (error as { readonly name?: unknown }).name
  return typeof named === 'string' ? named : ''
}

/**
 * Whether this browser paints at all, asked only once a size has been refused.
 *
 * Tells `unsupported` (no context even at the smallest size) from `tooLarge`
 * (this size refused) without a largest-canvas number, which would be invented
 * and differs per browser and machine.
 *
 * @purity semi-pure-b
 */
function canPaintAtAll(host: Document): boolean {
  const probe = host.createElement('canvas')
  probe.width = SMALLEST_SIDE_PX
  probe.height = SMALLEST_SIDE_PX
  return probe.getContext('2d') !== null
}

/**
 * The PNG the canvas holds, or `null` when it could make none.
 *
 * ⚠️ `toBlob` may throw instead of calling back (a tainted canvas does); the
 * promise carries that to the caller.
 *
 * @purity semi-pure-b
 */
function pngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), PNG_MIME))
}

/**
 * One picture, painted at one size.
 *
 * The arguments are judged first, then the machine is asked. Each failure gets
 * the `RasterFaultReason` whose next step would help (NT-3a of table T-037):
 * `unsupported` where no size or retry changes the answer, `tooLarge` where a
 * smaller size would, `rasterFailed` for anything attempted that did not
 * finish. The mapping is not in the specification; class C.
 *
 * @provisional PND-130
 * @purity semi-pure-b
 */
async function paintPng(host: Document, svg: string, sizePx: RasterSizePx): Promise<Rastering> {
  if (!isPaintableSize(sizePx)) {
    return failedRastering(
      'rasterFailed',
      `${WHAT_NOT_WHOLE_PIXELS}: ${sizePx.widthPx} x ${sizePx.heightPx}`,
    )
  }
  const reference = fetchedReference(svg)
  if (reference !== null) {
    return failedRastering('rasterFailed', `${WHAT_FETCHES}: ${reference}`)
  }
  const picture = sizedSvg(svg, sizePx)
  if (!picture.ok) return failedRastering('rasterFailed', picture.what)

  const canvas = host.createElement('canvas')
  canvas.width = sizePx.widthPx
  canvas.height = sizePx.heightPx
  // ⚠️ A size the canvas will not take comes back changed, not refused.
  if (canvas.width !== sizePx.widthPx || canvas.height !== sizePx.heightPx) {
    return failedRastering('tooLarge', WHAT_SIZE_REFUSED)
  }
  const context = canvas.getContext('2d')
  if (context === null) {
    return canPaintAtAll(host)
      ? failedRastering('tooLarge', WHAT_NO_CONTEXT_THIS_SIZE)
      : failedRastering('unsupported', WHAT_NO_CONTEXT_HERE)
  }

  try {
    const image = host.createElement('img')
    image.src = svgDataUrl(picture.svg)
    // Decoded before drawn: an image drawn early paints nothing, a blank export
    // WY-2 cannot see. A browser without `decode` lands in the same catch.
    await image.decode()
    context.drawImage(image, 0, 0, sizePx.widthPx, sizePx.heightPx)
  } catch (error: unknown) {
    return failedRastering('rasterFailed', `${WHAT_DECODE}: ${errorName(error)}`)
  }

  // Nothing is painted under the picture: what an export shows is FR-080's and
  // table T-076's, so clear parts stay clear. No row says whether IO-4's PNG
  // keeps transparency; class C. @provisional PND-134
  try {
    const blob = await pngBlob(canvas)
    if (blob === null) return failedRastering('rasterFailed', WHAT_NO_BYTES)
    return { ok: true, pngBytes: new Uint8Array(await blob.arrayBuffer()) }
  } catch (error: unknown) {
    return errorName(error) === TAINTED_ERROR
      ? failedRastering('unsupported', WHAT_TAINTED)
      : failedRastering('rasterFailed', `${WHAT_BYTES}: ${errorName(error)}`)
  }
}

/**
 * The one implementation of `Rasterizer` (PI-31 of table T-064, CP-31).
 *
 * `pure` although the unit is `semi-pure-b`: making the object reads and keeps
 * nothing (R7.1); the machine is read only in `rasterizePng`.
 *
 * @purity pure
 */
export function canvasRasterizer(host: Document): Rasterizer {
  return {
    /**
     * Paint one finished picture at one size (IO-4 of table T-024).
     *
     * ⛔ The promise never rejects (FR-028, AG-8), so even making an element is
     * caught here. `exportPng` guards the seam again for its own callers; that
     * is no leave for this side to throw.
     *
     * @purity semi-pure-b
     */
    async rasterizePng(svg: string, sizePx: RasterSizePx): Promise<Rastering> {
      try {
        return await paintPng(host, svg, sizePx)
      } catch (error: unknown) {
        return failedRastering('rasterFailed', `${WHAT_UNEXPECTED}: ${errorName(error)}`)
      }
    },
  }
}
