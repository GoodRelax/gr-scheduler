// Paints a finished SVG picture into PNG bytes through a browser canvas.
// @unit      UF-54   (docs/spec/05-07-design.md, table T-075)
// @component CanvasRasterizer, layer Framework (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-31

import type {
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from '../../adapter/image-exporter/image-exporter'

const PNG_MIME = 'image/png'

const SVG_MIME = 'image/svg+xml'

const SMALLEST_SIDE_PX = 1

const TAINTED_ERROR = 'SecurityError'

// TRAP: the leading whitespace is what keeps stroke-width from matching as width.
const SIZE_ATTRIBUTE = /\s+(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*')/g
const VIEW_BOX_ATTRIBUTE = /\sviewBox\s*=\s*(?:"[^"]*"|'[^']*')/
const WIDTH_ATTRIBUTE = /\swidth\s*=/
const HEIGHT_ATTRIBUTE = /\sheight\s*=/

// TRAP: xmlns stays out; a namespace url is never fetched, and matching it refuses every svg.
const FETCHED_ATTRIBUTE = /\s(?:xlink:href|href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\)/g

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

/** @purity pure */
function failedRastering(reason: RasterFaultReason, what: string): Rastering {
  return { ok: false, fault: { reason, what } }
}

/** @purity pure */
function isPaintableSize(sizePx: RasterSizePx): boolean {
  const isPaintableSide = (side: number): boolean =>
    Number.isInteger(side) && side >= SMALLEST_SIDE_PX
  return isPaintableSide(sizePx.widthPx) && isPaintableSide(sizePx.heightPx)
}

/** @purity pure */
function fetchedReference(svg: string): string | null {
  const references: string[] = []
  for (const hit of svg.matchAll(FETCHED_ATTRIBUTE)) references.push(hit[1] ?? hit[2] ?? '')
  for (const hit of svg.matchAll(CSS_URL)) references.push(hit[1] ?? hit[2] ?? hit[3] ?? '')
  const fetched = references.find((reference) => isFetched(reference))
  if (fetched !== undefined) return fetched
  return CSS_IMPORT.test(svg) ? '@import' : null
}

/** @purity pure */
function isFetched(reference: string): boolean {
  const target = reference.trim().toLowerCase()
  if (target === '') return false
  return !target.startsWith('#') && !target.startsWith('data:')
}

interface RootTag {
  readonly start: number
  readonly end: number
}

/** @purity pure */
function rootSvgTag(svg: string): RootTag | null {
  const start = svg.indexOf('<svg')
  if (start === -1) return null
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

type SizedPicture =
  | { readonly ok: true; readonly svg: string }
  | { readonly ok: false; readonly what: string }

// STOP: spec does not decide how the root svg size is fitted to the raster. Looked in IO-3, IO-4
// @provisional PND-132
/** @purity pure */
function sizedSvg(svg: string, sizePx: RasterSizePx): SizedPicture {
  const tag = rootSvgTag(svg)
  if (tag === null) return { ok: false, what: WHAT_NO_ROOT_TAG }
  const tagText = svg.slice(tag.start, tag.end)
  if (!VIEW_BOX_ATTRIBUTE.test(tagText)) {
    const hasIntrinsicSize = WIDTH_ATTRIBUTE.test(tagText) && HEIGHT_ATTRIBUTE.test(tagText)
    return hasIntrinsicSize ? { ok: true, svg } : { ok: false, what: WHAT_NO_SIZE }
  }
  // TRAP: remove the old width and height; a repeated attribute is a fatal XML error.
  const rest = tagText.slice('<svg'.length).replace(SIZE_ATTRIBUTE, '')
  const sized = `<svg width="${sizePx.widthPx}" height="${sizePx.heightPx}"${rest}`
  return { ok: true, svg: svg.slice(0, tag.start) + sized + svg.slice(tag.end) }
}

/** @purity pure */
function svgDataUrl(svg: string): string {
  return `data:${SVG_MIME};charset=utf-8,${encodeURIComponent(svg)}`
}

/** @purity pure */
function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''
  const named: unknown = (error as { readonly name?: unknown }).name
  return typeof named === 'string' ? named : ''
}

// WHY: probes a 1px canvas instead of a largest-canvas number, which differs per machine.
/** @purity semi-pure-b */
function canPaintAtAll(host: Document): boolean {
  const probe = host.createElement('canvas')
  probe.width = SMALLEST_SIDE_PX
  probe.height = SMALLEST_SIDE_PX
  return probe.getContext('2d') !== null
}

/** @purity semi-pure-b */
function pngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), PNG_MIME))
}

// STOP: spec does not decide which host refusal maps to which fault reason. Looked in IF-6, NT-3a
// @provisional PND-130
/** @purity semi-pure-b */
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
    // TRAP: an image drawn before it is decoded paints nothing, a blank no check sees.
    await image.decode()
    context.drawImage(image, 0, 0, sizePx.widthPx, sizePx.heightPx)
  } catch (error: unknown) {
    return failedRastering('rasterFailed', `${WHAT_DECODE}: ${errorName(error)}`)
  }

  // STOP: spec does not decide whether the PNG keeps transparency. Looked in IO-4, FR-080, T-076
  // @provisional PND-134
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

// see PI-31, IF-6
/** @purity pure */
export function canvasRasterizer(host: Document): Rasterizer {
  return {
    /** @purity semi-pure-b */
    async rasterizePng(svg: string, sizePx: RasterSizePx): Promise<Rastering> {
      try {
        return await paintPng(host, svg, sizePx)
      } catch (error: unknown) {
        return failedRastering('rasterFailed', `${WHAT_UNEXPECTED}: ${errorName(error)}`)
      }
    },
  }
}
