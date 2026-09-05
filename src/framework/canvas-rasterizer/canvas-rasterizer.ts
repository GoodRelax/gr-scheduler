// CanvasRasterizer -- public entry of this folder.
//
// @unit      UF-54   (docs/spec/05-07-design.md, table T-075)
// @component CanvasRasterizer, layer Framework (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-31
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHY THIS UNIT EXISTS, AND WHICH WAY THE DEPENDENCY POINTS. `Rasterizer`
// (IF-6 of table T-065) is DECLARED by ImageExporter, an Adapter, and
// implemented here because LR-5 of table T-061 puts the implementation of an
// inner layer's interface in the outer layer, and LY-5 of table T-060 makes
// this the layer that may touch the browser. ⛔ The declaration is imported and
// never edited from here, and nothing inner imports this file: the arrow runs
// inward only (LR-1).
//
// ⭐ NOTHING ABOUT THE EXPORT IS DECIDED HERE. FR-025 fixes the output size at
// S-81 and the scale at S-82, FR-080 fixes the picture, and table T-076 fixes
// which parts are drawn -- all of it before the call arrives. What crosses is a
// finished picture and the pixel size to paint it at. ⛔ So this file reads
// neither S-81 nor S-82: `RasterSizePx` already carries their product, and a
// second reading here would be a second place that decides an export's size.
// ⚠️ IO-4 of table T-024 is a write-only direction and this unit answers with
// bytes; it never reads an image back, so no intake is opened for FR-023.
//
// ⭐ WHAT THE CALLER MUST SUPPLY: one `Document`, at wiring time. ⛔ Only
// `createElement` is ever called on it -- no `window`, no `URL`, no `Image`, no
// `DOMException`, no `document.fonts`. The browser ARRIVES rather than being
// reached for, which is R7.3's injection and what LY-5 means by keeping the
// current values in this layer; it is also the reason this unit can be tested
// under Node, where there is no DOM to reach for in the first place.
//
// ⚠️ THREE THINGS ARE HARD ABOUT PAINTING AN SVG THROUGH A CANVAS. None of
// them is papered over; each one ends as a value the caller can read (AG-8 of
// table T-035, FR-028).
//
//   1. A TAINTED CANVAS. Feeding an <img> an SVG url taints the canvas in some
//      browsers, and a tainted canvas refuses `toBlob` / `toDataURL`. ⛔ There
//      is nothing to ask beforehand: the taint becomes visible only when the
//      bytes are asked for. So the bytes are asked for, and the `SecurityError`
//      that comes back is answered as `unsupported` -- the reason whose next
//      step, by the seam's own note, is IO-3's SVG. That is the right next step:
//      no smaller size and no second attempt changes a browser that taints.
//
//   2. FONTS. ⚠️ The usual move -- awaiting `document.fonts.ready` -- is a
//      false comfort here, so this unit does NOT make it. An SVG rendered
//      through an <img> is an isolated image: it fetches nothing and it does
//      not inherit the embedding page's faces, so a family the page loaded is
//      not a family the raster can get, however long one waits. WY-2 of table
//      T-041 makes wrong text a correctness problem and not a cosmetic one, so
//      what this unit does instead is refuse the picture that DEPENDS on a
//      fetch: every reference that is not `#...` or `data:...` is reported by
//      name. ⛔ What cannot be detected, and is therefore stated rather than
//      handled: an SVG naming a family the machine does not have falls back
//      silently. The picture that crosses this seam today names none.
//
//   3. THE INTRINSIC SIZE. Some decoders need the SVG to carry its own width
//      and height, and a decoder that has them may rasterize at THAT size and
//      then scale the bitmap -- which is how S-82's larger value would produce
//      a blurred picture instead of a bigger one. So the root tag's width and
//      height are rewritten to the pixel size asked for whenever the picture
//      carries a `viewBox`, which is what keeps the coordinates and so the
//      picture itself unchanged. ⛔ A picture with neither a `viewBox` nor a
//      size is refused rather than guessed at: a decoder would invent one and
//      the export would be silently wrong.
//
// ⭐ WY-2 OF TABLE T-041 -- two exports of one state agree. Nothing here reads
// a clock or a random source, nothing is kept between calls, and every element
// is made fresh and dropped, so one environment answers the same bytes for the
// same arguments. ⚠️ R7.4's consistency unit is ONE call: what is read from
// the machine is read inside it, and no result of a later read can change an
// earlier one. ⛔ Across two machines the bytes differ, which the seam's own
// declaration already says and which is why WY-2 compares within one
// environment.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from '../../adapter/image-exporter/image-exporter'

/** IO-4 of table T-024. Nothing else is ever asked of the canvas. */
const PNG_MIME = 'image/png'

/** What the data url declares the picture to be. IO-3 of table T-024. */
const SVG_MIME = 'image/svg+xml'

/**
 * The smallest side a canvas can have.
 *
 * ⭐ Two uses, one meaning: it is the floor a requested side must clear, and it
 * is the size of the probe that asks whether this browser paints at all. ⛔ Not
 * a value of the specification -- S-81 sizes the export and is read on the near
 * side of the seam.
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
 * ⛔ `xmlns` is deliberately not among them: a namespace is declared with a url
 * but nothing is fetched from it, and treating it as a reference would refuse
 * every SVG ever written.
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
 * ⭐ A value and never a throw: FR-028 forbids the exception (MUST NOT) and
 * AG-8 of table T-035 has the caller receive a failed image as a value.
 *
 * @purity pure
 */
function failedRastering(reason: RasterFaultReason, what: string): Rastering {
  return { ok: false, fault: { reason, what } }
}

/**
 * A canvas is a whole number of pixels on each side.
 *
 * ⛔ Refused rather than rounded. A canvas truncates what it is given, so a
 * fractional size would come back as a picture at a size nobody asked for, and
 * rounding it here would make this unit decide an export's size -- which
 * FR-025 fixes at S-81, times S-82, on the near side of the seam.
 *
 * ⛔ NOT IN THE SPECIFICATION: no row says what a rasterizer does with a size
 * that is not a whole number of pixels.
 *
 * ⭐ SETTLED (CR-353, PD-133). This is a BOUNDARY OF ACCEPTANCE, not a value
 * that could be tuned: refusing is what keeps an export's size the one FR-025
 * fixed, and it is what makes a raster reproducible instead of silently
 * rounded. The ruling keeps the refusal.
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
 * ⭐ Why anything is checked at all: an SVG rendered as an image fetches
 * nothing, so a font, an icon or a picture behind such a reference is silently
 * absent from the raster while the same reference works on the screen. WY-2 of
 * table T-041 compares two exports and FR-080 compares the export with the
 * screen, and neither can be judged on a picture that lost a part without
 * saying so.
 *
 * ⛔ NOT IN THE SPECIFICATION: WY-2 makes a silently different picture a
 * defect, but no row says to refuse the picture that would become one.
 * ⚠️ The picture that crosses this seam today holds one reference and it is
 * `url(#...)`, which is internal.
 *
 * ⭐ SETTLED (CR-353, PD-131). This is a BOUNDARY OF ACCEPTANCE, not a value:
 * a picture that has to fetch cannot be rastered reproducibly, so WY-2 and
 * FR-080 would be comparing something nobody can reproduce. The ruling keeps
 * the refusal.
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
 * ⭐ `#...` points inside the picture and `data:` carries what it needs with
 * it; everything else is a fetch. An empty reference asks for nothing.
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
 * ⚠️ The quotes are tracked instead of searching for the first `>`: an
 * attribute value may hold one, and cutting there would rewrite an attribute
 * rather than the tag.
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
 * ⭐ The `viewBox` is what makes the rewrite lossless: it maps the picture's
 * own units onto whatever width and height the root declares, so declaring the
 * pixel size asked for moves nothing in the picture and rasterizes it at the
 * resolution it will be painted at.
 *
 * ⚠️ A picture that carries a size but no `viewBox` is left exactly as it is:
 * its units are its pixels, so rewriting the size would move the content
 * instead of scaling it. Such a picture is drawn to the destination rectangle
 * and may be soft when the two sizes differ -- it is still the same picture,
 * and the one that crosses this seam always carries a `viewBox`.
 *
 * ⛔ NOT IN THE SPECIFICATION: IO-3 and IO-4 of table T-024 are two rows and no
 * row says what the second does with the first's root tag. Class C -- the
 * rewrite is undone by deleting it, and the picture it produces is the same
 * picture. ⚠️ The SVG the PERSON receives (IO-3) is untouched: it is the near
 * side's, and this is a copy made for the decoder.
 *
 * @provisional PD-132
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
  // ⛔ The old pair is removed rather than shadowed: the data url is read as
  // XML, where a repeated attribute is a fatal parse error rather than a value
  // one of the two wins.
  const rest = tagText.slice('<svg'.length).replace(SIZE_ATTRIBUTE, '')
  const sized = `<svg width="${sizePx.widthPx}" height="${sizePx.heightPx}"${rest}`
  return { ok: true, svg: svg.slice(0, tag.start) + sized + svg.slice(tag.end) }
}

/**
 * The picture as something an <img> can be pointed at.
 *
 * ⭐ A `data:` url and not a blob url: `URL.createObjectURL` is a global this
 * unit would have to reach for, and one argument carrying everything is what
 * makes the unit testable without a browser (R7.3). ⚠️ The cost is length --
 * the whole picture is percent-encoded into the url.
 *
 * @purity pure
 */
function svgDataUrl(svg: string): string {
  return `data:${SVG_MIME};charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * What a thrown thing calls itself.
 *
 * ⛔ The `name` and never the message: FR-028's RATIONALE refuses to let the
 * KIND of a failure depend on an implementation's wording, and a browser's
 * message is also written in the reader's language, which would put non-ASCII
 * into a log this project keeps in ASCII. ⚠️ Read as a property rather than
 * with `instanceof DOMException`, because that class is a browser global and
 * this unit reaches for none.
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
 * ⭐ It is what separates the seam's two reasons without inventing a ceiling: a
 * machine that cannot give a context for the smallest canvas there is has no
 * way to raster (`unsupported`), while one that can, and still refused the size
 * asked for, refused the SIZE (`tooLarge`). ⛔ A number for the largest canvas
 * would be an invented threshold, and it differs per browser and per machine.
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
 * ⚠️ `toBlob` may throw where it stands rather than call back -- that is what a
 * tainted canvas does -- and the promise carries that out to the one caller,
 * which reads it.
 *
 * @purity semi-pure-b
 */
function pngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), PNG_MIME))
}

/**
 * One picture, painted at one size.
 *
 * ⭐ The steps are in the order in which they can be judged: what can be seen
 * in the arguments alone comes first, then what the machine has to be asked.
 * Each failure is answered with the one reason of `RasterFaultReason` whose
 * next step would actually help, because NT-3a of table T-037 makes a failure
 * notice carry what can be done next.
 *
 * ⛔ WHICH REASON EACH FAILURE GETS IS NOT IN THE SPECIFICATION. The seam
 * names three reasons and the requirement names none of the ways a browser
 * refuses, so the mapping below is this unit's: `unsupported` where no size and
 * no retry would change the answer, `tooLarge` where a smaller one would,
 * `rasterFailed` for everything that was attempted and did not finish. Class C
 * -- one reason per branch, and nothing is saved. ⚠️ The three next steps the
 * seam's declaration gives are what each branch was chosen against.
 *
 * @provisional PD-130
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
  // ⚠️ A canvas holds its size as a whole number in a fixed range, so a size it
  // will not take comes back changed rather than as a refusal.
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
    // ⭐ Decoded before it is drawn: an image drawn before it is ready paints
    // nothing, and a blank export is the failure WY-2 cannot see. ⚠️ A browser
    // too old to have `decode` lands in the same catch as one that could not
    // read the picture -- both leave the same next step, which is to try again
    // somewhere else.
    await image.decode()
    context.drawImage(image, 0, 0, sizePx.widthPx, sizePx.heightPx)
  } catch (error: unknown) {
    return failedRastering('rasterFailed', `${WHAT_DECODE}: ${errorName(error)}`)
  }

  // ⛔ Nothing is painted under the picture. A ground colour is not this unit's
  // to choose -- what an export shows is FR-080's and table T-076's -- so the
  // parts the picture leaves clear stay clear in the PNG. ⚠️ NOT IN THE
  // SPECIFICATION: no row says whether IO-4's PNG keeps a transparent ground.
  // Class C -- one line to add, and nothing is saved. @provisional PD-134
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
 * ⭐ `host` is the document the elements are made in -- the shell hands over
 * the real one at wiring time. ⛔ `createElement` is the only member ever
 * called on it, so a test supplies an object with that one member and needs no
 * browser.
 *
 * ⚠️ `pure` although the unit's own tag is `semi-pure-b`: making the object
 * reads nothing and keeps nothing, so R7.1 classifies it by what IT does. The
 * machine is read only when a picture is asked for, which is where that tag is.
 *
 * @purity pure
 */
export function canvasRasterizer(host: Document): Rasterizer {
  return {
    /**
     * Paint one finished picture at one size (IO-4 of table T-024).
     *
     * ⛔ The promise cannot reject, whatever the machine does. FR-028 forbids
     * the exception (MUST NOT) and AG-8 of table T-035 has every ending arrive
     * as a value, so the last thing that could still throw -- making an element
     * at all -- is caught here rather than left to the caller. ⚠️ `exportPng`
     * guards this seam a second time on purpose; that guard is its promise to
     * ITS callers, not permission for this side to break the MUST NOT.
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
