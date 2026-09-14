// Unit tests for UF-54 `canvas-rasterizer.ts` -- table T-075 of

import { describe, expect, it } from 'vitest'

import * as canvasRasterizerModule from '../../src/framework/canvas-rasterizer/canvas-rasterizer'
import { canvasRasterizer } from '../../src/framework/canvas-rasterizer/canvas-rasterizer'
import type {
  RasterFault,
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from '../../src/adapter/image-exporter/image-exporter'


const T_064_PI_31 = {
  id: 'PI-31',
  layer: 'Framework',
  component: 'CanvasRasterizer',
  runtimeNames: ['canvasRasterizer'],
} as const

const T_065_IF_6 = {
  id: 'IF-6',
  seam: 'Rasterizer',
  declaredBy: 'ImageExporter',
  implementedBy: 'CanvasRasterizer',
  supplies: 'SVG to image (IO-4)',
  member: 'rasterizePng',
} as const

const T_075_UF_54 = {
  id: 'UF-54',
  component: 'CanvasRasterizer',
  file: 'canvas-rasterizer.ts',
  purity: 'semi-pure-b',
} as const

const T_024_ROWS = [
  { id: 'IO-3', format: 'SVG', canWrite: true, canRead: false, note: 'size is S-81' },
  { id: 'IO-4', format: 'PNG', canWrite: true, canRead: false, note: 'size is S-81, no scale' },
] as const

const T_204 = {
  s81: { id: 'S-81', key: 'exportCanvas', width: 1600, height: 900 },
  grownHeights: [900, 1800],
} as const

const T_076_ROWS = [
  { id: 'EP-1', part: 'App Header', drawn: 'the band and Document Title only' },
  { id: 'EP-2', part: 'Time Ruler', drawn: 'yes' },
  { id: 'EP-3', part: 'Row Title Panel and Tree', drawn: 'yes' },
  { id: 'EP-4', part: 'row controls', drawn: 'no' },
  { id: 'EP-5', part: 'Row Area contents', drawn: 'yes' },
  { id: 'EP-6', part: 'Cursors', drawn: 'Status Line and Dual Cursor only' },
  { id: 'EP-7', part: 'Watermark', drawn: 'inside the Row Area only' },
  { id: 'EP-8', part: 'Properties Panel', drawn: 'no' },
  { id: 'EP-9', part: 'Panel Divider', drawn: 'the border line, not the control' },
  { id: 'EP-10', part: 'Scrollbars', drawn: 'no' },
  { id: 'EP-11', part: 'overlay surfaces', drawn: 'no' },
  { id: 'EP-12', part: 'operation state', drawn: 'no' },
  { id: 'EP-13', part: 'containers', drawn: 'not themselves' },
  { id: 'EP-14', part: 'Actual Operation Dummy', drawn: 'no' },
] as const

const RASTER_FAULT_REASONS: readonly RasterFaultReason[] = [
  'unsupported',
  'tooLarge',
  'rasterFailed',
]

const T_037_ROWS: readonly {
  readonly id: string
  readonly owes: string
  readonly holds: (reasons: readonly RasterFaultReason[]) => boolean
}[] = [
  {
    id: 'NT-3a',
    owes: 'the three stay told apart, so each can carry a different next step',
    holds: (reasons) => new Set(reasons).size === reasons.length,
  },
  {
    id: 'NT-1 (the manner NT-3a leans on)',
    owes: 'the reason is a classification words can be composed from, never a sentence',
    holds: (reasons) => reasons.every((reason) => /^[a-z][A-Za-z]*$/.test(reason)),
  },
]


const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

const FIT_CLIP_ID = 'grs-export-fit'

const T_076_MARKERS = T_076_ROWS.map((row) => `<g data-export-row="${row.id}"/>`).join('')

const EXPORT_PICTURE = [
  `<svg xmlns="${SVG_NS}" xmlns:xlink="${XLINK_NS}"`,
  ` width="${T_204.s81.width}" height="${T_204.s81.height}"`,
  ` viewBox="0 0 ${T_204.s81.width} ${T_204.s81.height}">`,
  `<defs><clipPath id="${FIT_CLIP_ID}"><rect x="0" y="0"`,
  ` width="${T_204.s81.width}" height="${T_204.s81.height}"/></clipPath></defs>`,
  `<g clip-path="url(#${FIT_CLIP_ID})">`,
  T_076_MARKERS,
  '<text x="8" y="24">A document title</text>',
  '</g>',
  '</svg>',
].join('')

const SIZE_AT_SCALE_1: RasterSizePx = { widthPx: 1600, heightPx: 900 }


type Outcome = 'ok' | { readonly throws: unknown } | { readonly rejects: unknown }

interface HostScript {
  readonly pngBytes?: readonly number[]
  readonly contextFor?: (widthPx: number, heightPx: number) => 'context' | null
  readonly keepWidth?: (askedPx: number) => number
  readonly keepHeight?: (askedPx: number) => number
  readonly decode?: Outcome
  readonly drawImage?: Outcome
  readonly toBlob?: 'bytes' | 'null' | { readonly throws: unknown }
  readonly toBlobDeferred?: boolean
  readonly arrayBuffer?: 'bytes' | { readonly rejects: unknown }
  readonly createElement?: (tag: string) => 'make' | { readonly throws: unknown }
  readonly imageWithoutDecode?: boolean
  readonly canvasWithoutToBlob?: boolean
}

interface MadeElement {
  readonly tag: string
  readonly element: unknown
}

interface FakeHost {
  readonly host: Document
  readonly hostTouched: string[]
  readonly tags: string[]
  readonly made: MadeElement[]
  readonly srcs: string[]
  readonly imageTouched: string[]
  readonly canvasSizes: { widthPx: number; heightPx: number }[]
  readonly contextKinds: string[]
  readonly contextTouched: string[]
  readonly drawCalls: unknown[][]
  readonly toBlobTypes: (string | undefined)[]
  readonly log: string[]
}

const PNG_BYTES: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03]

function namedError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}

function fakeHost(script: HostScript = {}): FakeHost {
  const log: string[] = []
  const hostTouched: string[] = []
  const tags: string[] = []
  const made: MadeElement[] = []
  const srcs: string[] = []
  const imageTouched: string[] = []
  const canvasSizes: { widthPx: number; heightPx: number }[] = []
  const contextKinds: string[] = []
  const contextTouched: string[] = []
  const drawCalls: unknown[][] = []
  const toBlobTypes: (string | undefined)[] = []

  const bytes = script.pngBytes ?? PNG_BYTES

  const makeBlob = (): unknown => ({
    arrayBuffer(): Promise<ArrayBuffer> {
      log.push('blob.arrayBuffer')
      const how = script.arrayBuffer ?? 'bytes'
      if (how !== 'bytes') return Promise.reject(how.rejects)
      return Promise.resolve(Uint8Array.from(bytes).buffer)
    },
  })

  const makeImage = (): unknown => {
    const inner: Record<string, unknown> = { src: '' }
    if (script.imageWithoutDecode !== true) {
      inner['decode'] = (): Promise<void> => {
        log.push('img.decode')
        const how = script.decode ?? 'ok'
        if (how === 'ok') return Promise.resolve()
        if ('throws' in how) throw how.throws
        return Promise.reject(how.rejects)
      }
    }
    return new Proxy(inner, {
      get(target, key, receiver): unknown {
        if (typeof key === 'string') imageTouched.push(key)
        return Reflect.get(target, key, receiver)
      },
      set(target, key, value, receiver): boolean {
        if (typeof key === 'string') {
          imageTouched.push(key)
          log.push(`img.${key}=`)
          if (key === 'src') srcs.push(String(value))
        }
        return Reflect.set(target, key, value, receiver)
      },
    })
  }

  const makeCanvas = (): unknown => {
    const context = new Proxy(
      {
        drawImage(...args: unknown[]): void {
          log.push('context.drawImage')
          drawCalls.push(args)
          const how = script.drawImage ?? 'ok'
          if (how !== 'ok' && 'throws' in how) throw how.throws
        },
        fillRect(): void {
          log.push('context.fillRect')
        },
        clearRect(): void {
          log.push('context.clearRect')
        },
        fillText(): void {
          log.push('context.fillText')
        },
      },
      {
        get(target, key, receiver): unknown {
          if (typeof key === 'string') contextTouched.push(key)
          return Reflect.get(target, key, receiver)
        },
      },
    )

    const inner: Record<string, unknown> = {
      width: 0,
      height: 0,
      getContext(...args: unknown[]): unknown {
        const kind = String(args[0])
        contextKinds.push(kind)
        const widthPx = Number(inner['width'])
        const heightPx = Number(inner['height'])
        canvasSizes.push({ widthPx, heightPx })
        log.push(`canvas.getContext(${kind}) at ${widthPx}x${heightPx}`)
        const answer = script.contextFor ? script.contextFor(widthPx, heightPx) : 'context'
        return answer === 'context' ? context : null
      },
    }
    if (script.canvasWithoutToBlob !== true) {
      inner['toBlob'] = (...args: unknown[]): void => {
        log.push('canvas.toBlob')
        toBlobTypes.push(args.length > 1 ? String(args[1]) : undefined)
        const how = script.toBlob ?? 'bytes'
        if (typeof how === 'object') throw how.throws
        const callback = args[0] as (blob: unknown) => void
        const blob = how === 'null' ? null : makeBlob()
        if (script.toBlobDeferred === true) queueMicrotask(() => callback(blob))
        else callback(blob)
      }
    }

    return new Proxy(inner, {
      set(target, key, value, receiver): boolean {
        if (key === 'width') {
          const kept = script.keepWidth ? script.keepWidth(Number(value)) : Number(value)
          log.push(`canvas.width=${String(value)} kept ${String(kept)}`)
          return Reflect.set(target, key, kept, receiver)
        }
        if (key === 'height') {
          const kept = script.keepHeight ? script.keepHeight(Number(value)) : Number(value)
          log.push(`canvas.height=${String(value)} kept ${String(kept)}`)
          return Reflect.set(target, key, kept, receiver)
        }
        return Reflect.set(target, key, value, receiver)
      },
    })
  }

  const innerHost = {
    createElement(...args: unknown[]): unknown {
      const tag = String(args[0])
      tags.push(tag)
      log.push(`createElement(${tag})`)
      const how = script.createElement ? script.createElement(tag) : 'make'
      if (how !== 'make') throw how.throws
      const element = tag === 'img' ? makeImage() : tag === 'canvas' ? makeCanvas() : {}
      made.push({ tag, element })
      return element
    },
  }

  const host = new Proxy(innerHost, {
    get(target, key, receiver): unknown {
      if (typeof key === 'string') hostTouched.push(key)
      return Reflect.get(target, key, receiver)
    },
  }) as unknown as Document

  return {
    host,
    hostTouched,
    tags,
    made,
    srcs,
    imageTouched,
    canvasSizes,
    contextKinds,
    contextTouched,
    drawCalls,
    toBlobTypes,
    log,
  }
}


type Settled =
  | { readonly kind: 'resolved'; readonly value: Rastering }
  | { readonly kind: 'rejected'; readonly reason: unknown }

async function settle(promise: Promise<Rastering>): Promise<Settled> {
  try {
    return { kind: 'resolved', value: await promise }
  } catch (reason: unknown) {
    return { kind: 'rejected', reason }
  }
}

async function raster(
  script: HostScript,
  svg: string,
  sizePx: RasterSizePx,
): Promise<{ readonly fake: FakeHost; readonly settled: Settled }> {
  const fake = fakeHost(script)
  const settled = await settle(canvasRasterizer(fake.host).rasterizePng(svg, sizePx))
  return { fake, settled }
}

function rasteringOf(settled: Settled, why: string): Rastering {
  expect(settled.kind, `${why}: FR-028 forbids the throw, so this must resolve`).toBe('resolved')
  if (settled.kind !== 'resolved') throw new Error(why)
  return settled.value
}

function faultOf(settled: Settled, why: string): RasterFault {
  const rastering = rasteringOf(settled, why)
  expect(rastering.ok, `${why}: AG-8 has a failed rastering come back as a value`).toBe(false)
  if (rastering.ok) throw new Error(why)
  return rastering.fault
}

function bytesOf(settled: Settled, why: string): Uint8Array {
  const rastering = rasteringOf(settled, why)
  expect(rastering.ok, `${why}: expected bytes`).toBe(true)
  if (!rastering.ok) throw new Error(why)
  return rastering.pngBytes
}

function svgGivenToDecoder(src: string): string {
  const body = src.startsWith('data:') ? src.slice(src.indexOf(',') + 1) : src
  try {
    return decodeURIComponent(body)
  } catch {
    return body
  }
}

function rootTagOf(svg: string): string {
  const start = svg.indexOf('<svg')
  const end = svg.indexOf('>', start)
  return start < 0 || end < 0 ? '' : svg.slice(start, end + 1)
}

function attributesOf(tag: string): { readonly name: string; readonly value: string }[] {
  const found: { name: string; value: string }[] = []
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match = pattern.exec(tag)
  while (match !== null) {
    found.push({ name: match[1] ?? '', value: match[2] ?? match[3] ?? '' })
    match = pattern.exec(tag)
  }
  return found
}

function attributeValue(tag: string, name: string): string | undefined {
  return attributesOf(tag).find((one) => one.name === name)?.value
}

const ASCII_ONLY = /^[ -~]*$/


describe('the rosters these cases walk are the ones the tables state', () => {
  it('carries T-076 in full, the three reasons, both T-037 rows and both T-024 rows', () => {
    expect(T_076_ROWS).toHaveLength(14)
    expect(new Set(T_076_ROWS.map((row) => row.id)).size).toBe(14)
    expect(RASTER_FAULT_REASONS).toHaveLength(3)
    expect(new Set(RASTER_FAULT_REASONS).size).toBe(3)
    expect(T_037_ROWS).toHaveLength(2)
    expect(T_024_ROWS).toHaveLength(2)
    expect(T_204.grownHeights).toEqual([900, 1800])
  })

  it('builds a picture that carries one marker per row of table T-076', () => {
    for (const row of T_076_ROWS) {
      expect(EXPORT_PICTURE, row.id).toContain(`data-export-row="${row.id}"`)
    }
  })
})


describe('PI-31 of table T-064 -- one implementation of Rasterizer, and nothing else', () => {
  it('publishes the factory, and no second runtime name', () => {
    expect(Object.keys(canvasRasterizerModule).sort()).toEqual([...T_064_PI_31.runtimeNames].sort())
    expect(typeof canvasRasterizer).toBe('function')
  })

  it('takes the browser as its one argument (R7.3)', () => {
    expect(canvasRasterizer.length).toBe(1)
  })

  it('returns the seam IF-6 declares -- its one member and no other', () => {
    const rasterizer: Rasterizer = canvasRasterizer(fakeHost().host)
    expect(Object.keys(rasterizer)).toEqual([T_065_IF_6.member])
    expect(typeof rasterizer.rasterizePng).toBe('function')
    expect(rasterizer.rasterizePng.length).toBe(2)
  })

  it("resolves the seam through the declaring folder's public entry (Chapter 5.3, LR-2)", () => {
    const seam: Rasterizer | null = null
    const size: RasterSizePx | null = null
    const reason: RasterFaultReason | null = null
    const fault: RasterFault | null = null
    const rastering: Rastering | null = null
    expect([seam, size, reason, fault, rastering]).toEqual([null, null, null, null, null])
    expect(T_065_IF_6.implementedBy).toBe(T_064_PI_31.component)
    expect(T_075_UF_54.component).toBe(T_064_PI_31.component)
  })

  it('publishes no name, and offers no member, that would read an image back', () => {
    const rasterizer = canvasRasterizer(fakeHost().host)
    const names = [...Object.keys(canvasRasterizerModule), ...Object.keys(rasterizer)]
    for (const name of names) {
      expect(/read|import|decode|parse|open/i.test(name), name).toBe(false)
    }
    for (const row of T_024_ROWS) {
      expect(row.canWrite, row.id).toBe(true)
      expect(row.canRead, row.id).toBe(false)
    }
  })
})


describe('LY-5 of table T-060 -- the browser is a parameter, so this runs without one', () => {
  it('has no DOM in this process, and rasters anyway', async () => {
    const globals = globalThis as unknown as Record<string, unknown>
    expect(globals['document']).toBeUndefined()
    expect(globals['window']).toBeUndefined()
    expect(globals['Image']).toBeUndefined()

    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    expect(bytesOf(settled, 'the ordinary path')).toEqual(Uint8Array.from(PNG_BYTES))
    expect(fake.tags.length).toBeGreaterThan(0)
  })

  it('touches `createElement` on the host object and nothing else on it', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    rasteringOf(settled, 'the ordinary path')
    expect([...new Set(fake.hostTouched)]).toEqual(['createElement'])
  })

  it('asks the host for `img` and `canvas` and for no third kind of element', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    rasteringOf(settled, 'the ordinary path')
    expect([...new Set(fake.tags)].sort()).toEqual(['canvas', 'img'])
  })

  it('reaches for no global the browser owns -- btoa, fetch and object urls stay untouched', async () => {
    const globals = globalThis as unknown as Record<string, unknown>
    const urls = URL as unknown as Record<string, unknown>
    const originals = {
      btoa: globals['btoa'],
      fetch: globals['fetch'],
      createObjectURL: urls['createObjectURL'],
    }
    const used: string[] = []
    const watch = (name: string, original: unknown): ((...args: unknown[]) => unknown) =>
      (...args: unknown[]): unknown => {
        used.push(name)
        return (original as (...a: unknown[]) => unknown)(...args)
      }
    globals['btoa'] = watch('btoa', originals.btoa)
    globals['fetch'] = watch('fetch', originals.fetch)
    urls['createObjectURL'] = watch('URL.createObjectURL', originals.createObjectURL)
    try {
      const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
      rasteringOf(settled, 'the ordinary path')
      expect(svgGivenToDecoder(fake.srcs[0] ?? '')).toContain('<svg')
    } finally {
      globals['btoa'] = originals.btoa
      globals['fetch'] = originals.fetch
      urls['createObjectURL'] = originals.createObjectURL
    }
    expect(used, 'the browser ARRIVES; nothing is reached for (R7.3, LY-5)').toEqual([])
  })

  it('uses the host it was handed, and a second instance uses a second host', async () => {
    const first = fakeHost()
    const second = fakeHost()
    await settle(canvasRasterizer(first.host).rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1))
    expect(second.tags).toEqual([])
    await settle(canvasRasterizer(second.host).rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1))
    expect(second.tags.length).toBeGreaterThan(0)
    expect(first.tags).toEqual(second.tags)
  })

  it('makes nothing while only being built -- the machine is read in the member (UF-54)', () => {
    const fake = fakeHost()
    const rasterizer = canvasRasterizer(fake.host)
    expect(fake.hostTouched).toEqual([])
    expect(fake.tags).toEqual([])
    expect(rasterizer).toBeTypeOf('object')
    expect(T_075_UF_54.purity).toBe('semi-pure-b')
  })
})


describe('IO-4 of table T-024 -- one finished picture becomes PNG bytes', () => {
  it('answers the bytes the canvas gave, as a Uint8Array', async () => {
    const { settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    const bytes = bytesOf(settled, 'the ordinary path')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect([...bytes]).toEqual([...PNG_BYTES])
  })

  it('asks the canvas for PNG, once, and reads the blob once', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    expect(fake.toBlobTypes).toEqual(['image/png'])
    expect(fake.log.filter((one) => one === 'canvas.toBlob')).toHaveLength(1)
    expect(fake.log.filter((one) => one === 'blob.arrayBuffer')).toHaveLength(1)
  })

  it('takes the bytes from a callback that answers on a later turn', async () => {
    const { settled } = await raster({ toBlobDeferred: true }, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    expect([...bytesOf(settled, 'a deferred callback')]).toEqual([...PNG_BYTES])
  })

  it('gives the canvas exactly the pixel size it was asked for', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    expect(fake.canvasSizes).toEqual([{ widthPx: 1600, heightPx: 900 }])
    expect(fake.contextKinds).toEqual(['2d'])
  })

  it('paints the decoded image over the whole canvas, once', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const image = fake.made.find((one) => one.tag === 'img')?.element
    expect(fake.drawCalls).toHaveLength(1)
    expect(fake.drawCalls[0]?.[0], 'the image it decoded, not another').toBe(image)
    expect(fake.drawCalls[0]?.slice(1)).toEqual([0, 0, 1600, 900])
  })

  it('decodes before it paints, and paints before it asks for bytes', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const at = (event: string): number => fake.log.findIndex((one) => one === event)
    expect(at('img.src=')).toBeGreaterThanOrEqual(0)
    expect(at('img.decode')).toBeGreaterThan(at('img.src='))
    expect(at('context.drawImage')).toBeGreaterThan(at('img.decode'))
    expect(at('canvas.toBlob')).toBeGreaterThan(at('context.drawImage'))
    expect(at('blob.arrayBuffer')).toBeGreaterThan(at('canvas.toBlob'))
  })

  it('walks the grown heights -- each size of table T-204 reaches the canvas as given', async () => {
    for (const heightPx of T_204.grownHeights) {
      const sizePx: RasterSizePx = { widthPx: T_204.s81.width, heightPx }
      const { fake, settled } = await raster({}, EXPORT_PICTURE, sizePx)
      const why = `${T_204.s81.id} grown to ${heightPx}`
      bytesOf(settled, why)
      expect(fake.canvasSizes, why).toEqual([{ widthPx: sizePx.widthPx, heightPx: sizePx.heightPx }])
      expect(fake.drawCalls[0]?.slice(1), why).toEqual([0, 0, sizePx.widthPx, sizePx.heightPx])
    }
  })

  it('does not read S-81 -- a size that is not it is painted just the same', async () => {
    const odd: RasterSizePx = { widthPx: 7, heightPx: 11 }
    const { fake, settled } = await raster({}, EXPORT_PICTURE, odd)
    bytesOf(settled, 'a size that is not S-81')
    expect(fake.canvasSizes).toEqual([{ widthPx: 7, heightPx: 11 }])
    expect(fake.canvasSizes[0]?.widthPx).not.toBe(T_204.s81.width)
  })

  it('invents no ceiling of its own -- a huge size a machine accepts is painted', async () => {
    const huge: RasterSizePx = { widthPx: 1_000_000, heightPx: 1_000_000 }
    const { fake, settled } = await raster({}, EXPORT_PICTURE, huge)
    bytesOf(settled, 'a machine that accepts a million pixels')
    expect(fake.canvasSizes).toEqual([{ widthPx: 1_000_000, heightPx: 1_000_000 }])
  })
})


describe('IO-3 of table T-024 -- the SVG that arrives is copied, never changed', () => {
  it('hands the decoder a url that carries the picture itself', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    expect(fake.srcs).toHaveLength(1)
    const given = svgGivenToDecoder(fake.srcs[0] ?? '')
    expect(given).toContain('<svg')
    expect(given).toContain('</svg>')
  })

  it('walks table T-076 -- every row it carries in, it carries out', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const given = svgGivenToDecoder(fake.srcs[0] ?? '')
    for (const row of T_076_ROWS) {
      const marker = `data-export-row="${row.id}"`
      const count = given.split(marker).length - 1
      expect(count, `${row.id} (${row.part}, drawn: ${row.drawn})`).toBe(1)
    }
  })

  it('changes nothing but the root tag -- the body is the same characters', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const given = svgGivenToDecoder(fake.srcs[0] ?? '')
    const bodyIn = EXPORT_PICTURE.slice(rootTagOf(EXPORT_PICTURE).length)
    const bodyOut = given.slice(rootTagOf(given).length)
    expect(bodyOut).toBe(bodyIn)
  })

  it('keeps the internal clip reference, which is the one an export carries', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const given = svgGivenToDecoder(fake.srcs[0] ?? '')
    expect(given).toContain(`url(#${FIT_CLIP_ID})`)
    expect(given).toContain(`id="${FIT_CLIP_ID}"`)
  })

  it('reads the namespace declarations as declarations, not as things to fetch', async () => {
    const { settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    const rastering = rasteringOf(settled, 'a picture with both namespaces')
    expect(rastering.ok).toBe(true)
  })

  it('does not write the size it was handed', async () => {
    const sizePx = { widthPx: 1600, heightPx: 900 }
    const { settled } = await raster({}, EXPORT_PICTURE, sizePx)
    bytesOf(settled, 'the ordinary path')
    expect(sizePx).toEqual({ widthPx: 1600, heightPx: 900 })
  })

  it('accepts a frozen size -- nothing of the caller is written', async () => {
    const sizePx = Object.freeze({ widthPx: 1600, heightPx: 900 })
    const { settled } = await raster({}, EXPORT_PICTURE, sizePx)
    expect(rasteringOf(settled, 'a frozen size').ok).toBe(true)
  })
})


describe('WY-2 of table T-041 -- two calls with the same arguments agree', () => {
  it('gives the decoder the same url twice, and the same bytes', async () => {
    const fake = fakeHost()
    const rasterizer = canvasRasterizer(fake.host)
    const first = await settle(rasterizer.rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1))
    const second = await settle(rasterizer.rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1))
    expect(fake.srcs).toHaveLength(2)
    expect(fake.srcs[0]).toBe(fake.srcs[1])
    expect([...bytesOf(first, 'first call')]).toEqual([...bytesOf(second, 'second call')])
  })

  it('makes its elements fresh each call and keeps nothing between them', async () => {
    const fake = fakeHost()
    const rasterizer = canvasRasterizer(fake.host)
    await settle(rasterizer.rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1))
    const afterOne = fake.made.length
    await settle(rasterizer.rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1))
    expect(fake.made).toHaveLength(afterOne * 2)
    const elements = fake.made.map((one) => one.element)
    expect(new Set(elements).size, 'no element is reused').toBe(elements.length)
  })

  it('does not let one call change what a later one answers', async () => {
    const broken = fakeHost({ toBlob: 'null' })
    const rasterizer = canvasRasterizer(broken.host)
    const failed = await settle(rasterizer.rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1))
    expect(rasteringOf(failed, 'a canvas that gave no bytes').ok).toBe(false)

    const good = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    const alone = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    expect([...bytesOf(good.settled, 'after a failure')]).toEqual([
      ...bytesOf(alone.settled, 'on its own'),
    ])
    expect(good.fake.srcs).toEqual(alone.fake.srcs)
  })

  it('reads no clock and no random source -- two runs give one url', async () => {
    const first = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    const second = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    expect(first.fake.srcs).toEqual(second.fake.srcs)
    expect(first.fake.log).toEqual(second.fake.log)
  })
})


const EVERY_REFUSAL: readonly { readonly why: string; readonly script: HostScript }[] = [
  {
    why: 'the host cannot make an element at all -- the API absent',
    script: { createElement: () => ({ throws: namedError('NotSupportedError', 'no elements') }) },
  },
  {
    why: 'the host refuses to make a canvas but makes an image',
    script: {
      createElement: (tag) =>
        tag === 'canvas' ? { throws: namedError('NotSupportedError', 'no canvas') } : 'make',
    },
  },
  {
    why: 'the image has no `decode` -- an older browser',
    script: { imageWithoutDecode: true },
  },
  {
    why: 'the canvas has no `toBlob`',
    script: { canvasWithoutToBlob: true },
  },
  {
    why: 'decoding rejected -- the picture did not finish',
    script: { decode: { rejects: namedError('EncodingError', 'The source image cannot be decoded.') } },
  },
  {
    why: 'decoding threw where the call was made, not on a later turn',
    script: { decode: { throws: namedError('InvalidStateError', 'not decodable') } },
  },
  {
    why: 'the permission was refused -- a tainted canvas will not give bytes',
    script: { toBlob: { throws: namedError('SecurityError', 'Tainted canvases may not be exported.') } },
  },
  {
    why: 'the quota was exceeded',
    script: { toBlob: { throws: namedError('QuotaExceededError', 'out of memory') } },
  },
  {
    why: 'the person cancelled',
    script: { toBlob: { throws: namedError('AbortError', 'The operation was aborted.') } },
  },
  {
    why: 'the canvas gave no bytes',
    script: { toBlob: 'null' },
  },
  {
    why: 'reading the blob rejected',
    script: { arrayBuffer: { rejects: namedError('NotReadableError', 'unreadable') } },
  },
  {
    why: 'painting threw',
    script: { drawImage: { throws: namedError('InvalidStateError', 'broken image') } },
  },
  {
    why: 'there is no 2D context at all',
    script: { contextFor: () => null },
  },
  {
    why: 'a context for a small canvas but not for this size',
    script: { contextFor: (widthPx, heightPx) => (widthPx === 1 && heightPx === 1 ? 'context' : null) },
  },
  {
    why: 'the canvas did not keep the size it was given',
    script: { keepWidth: () => 4096 },
  },
  {
    why: 'the machine threw a string rather than an error',
    script: { toBlob: { throws: 'no canvas here' } },
  },
  {
    why: 'the machine threw undefined',
    script: { toBlob: { throws: undefined } },
  },
  {
    why: 'the machine threw an object with no name',
    script: { toBlob: { throws: {} } },
  },
]

describe('FR-028 (MUST NOT) and AG-8 of table T-035 -- a failure is a value', () => {
  it('resolves for every way a host can refuse, and never rejects', async () => {
    expect(EVERY_REFUSAL.length).toBeGreaterThan(0)
    for (const { why, script } of EVERY_REFUSAL) {
      const { settled } = await raster(script, EXPORT_PICTURE, SIZE_AT_SCALE_1)
      expect(settled.kind, why).toBe('resolved')
      const fault = faultOf(settled, why)
      expect(RASTER_FAULT_REASONS, why).toContain(fault.reason)
    }
  })

  it('does not throw where the call is made, even for a host that throws at once', () => {
    const fake = fakeHost({
      createElement: () => ({ throws: namedError('NotSupportedError', 'no elements') }),
    })
    const rasterizer = canvasRasterizer(fake.host)
    expect(() => rasterizer.rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1)).not.toThrow()
  })

  it('answers a promise, always -- the caller has one shape to handle', () => {
    const fake = fakeHost({
      createElement: () => ({ throws: namedError('NotSupportedError', 'no elements') }),
    })
    const answer = canvasRasterizer(fake.host).rasterizePng(EXPORT_PICTURE, SIZE_AT_SCALE_1)
    expect(typeof (answer as { then?: unknown }).then).toBe('function')
    return answer.then((rastering) => {
      expect(rastering.ok).toBe(false)
    })
  })

  it('carries one reason and one detail, and nothing else, on a failure', async () => {
    for (const { why, script } of EVERY_REFUSAL) {
      const { settled } = await raster(script, EXPORT_PICTURE, SIZE_AT_SCALE_1)
      const rastering = rasteringOf(settled, why)
      expect(Object.keys(rastering).sort(), why).toEqual(['fault', 'ok'])
      const fault = faultOf(settled, why)
      expect(Object.keys(fault).sort(), why).toEqual(['reason', 'what'])
    }
  })

  it('carries the bytes and nothing else on success', async () => {
    const { settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    const rastering = rasteringOf(settled, 'the ordinary path')
    expect(Object.keys(rastering).sort()).toEqual(['ok', 'pngBytes'])
  })
})

describe('table T-037 -- what the notice is given to say', () => {
  it('walks both rows over the three reasons the seam declares', () => {
    for (const row of T_037_ROWS) {
      expect(row.holds(RASTER_FAULT_REASONS), `${row.id}: ${row.owes}`).toBe(true)
    }
  })

  it('names something in `what` for every way a host can refuse (NT-3a)', async () => {
    for (const { why, script } of EVERY_REFUSAL) {
      const fault = faultOf(await raster(script, EXPORT_PICTURE, SIZE_AT_SCALE_1).then((oneRect) => oneRect.settled), why)
      expect(typeof fault.what, why).toBe('string')
      expect(fault.what.trim().length, `${why}: a notice that says only that it failed is forbidden`)
        .toBeGreaterThan(0)
    }
  })

  it('keeps `what` to printable ASCII, whatever the machine said', async () => {
    const shouted = String.fromCodePoint(0x753b, 0x50cf, 0x5316, 0x306b, 0x5931, 0x6557)
    for (const script of [
      { toBlob: { throws: namedError('SecurityError', shouted) } },
      { decode: { rejects: namedError('EncodingError', shouted) } },
      { drawImage: { throws: namedError('InvalidStateError', shouted) } },
    ] as const) {
      const fault = faultOf(await raster(script, EXPORT_PICTURE, SIZE_AT_SCALE_1).then((oneRect) => oneRect.settled), shouted)
      expect(ASCII_ONLY.test(fault.what), fault.what).toBe(true)
      expect(fault.what).not.toContain(shouted)
    }
  })
})


const NOT_A_PICTURE: readonly { readonly why: string; readonly svg: string }[] = [
  { why: 'empty', svg: '' },
  { why: 'blank space only', svg: '   \n\t ' },
  { why: 'not markup at all', svg: 'a picture' },
  { why: 'markup that is not an svg root', svg: '<html><body>no</body></html>' },
  { why: 'a root with neither a viewBox nor a size', svg: `<svg xmlns="${SVG_NS}"><rect/></svg>` },
]

describe('the boundaries of what may arrive', () => {
  it('refuses what is not a picture, as a value, naming something', async () => {
    for (const { why, svg } of NOT_A_PICTURE) {
      const fault = faultOf(await raster({}, svg, SIZE_AT_SCALE_1).then((oneRect) => oneRect.settled), why)
      expect(RASTER_FAULT_REASONS, why).toContain(fault.reason)
      expect(fault.what.length, why).toBeGreaterThan(0)
    }
  })

  it('paints the smallest canvas there is -- one pixel by one pixel', async () => {
    const one: RasterSizePx = { widthPx: 1, heightPx: 1 }
    const { fake, settled } = await raster({}, EXPORT_PICTURE, one)
    bytesOf(settled, 'one pixel by one pixel')
    expect(fake.canvasSizes).toEqual([{ widthPx: 1, heightPx: 1 }])
  })

  it('paints a picture that carries only a root tag', async () => {
    const bare = `<svg xmlns="${SVG_NS}" viewBox="0 0 10 10"></svg>`
    const { settled } = await raster({}, bare, SIZE_AT_SCALE_1)
    expect(rasteringOf(settled, 'a picture with no content').ok).toBe(true)
  })

  it('answers a value even when a caller lies about the types', async () => {
    const lies: readonly { readonly why: string; readonly svg: unknown; readonly sizePx: unknown }[] = [
      { why: 'a picture that is null', svg: null, sizePx: SIZE_AT_SCALE_1 },
      { why: 'a picture that is undefined', svg: undefined, sizePx: SIZE_AT_SCALE_1 },
      { why: 'a picture that is not a string', svg: 42, sizePx: SIZE_AT_SCALE_1 },
      { why: 'a size that is null', svg: EXPORT_PICTURE, sizePx: null },
      { why: 'a size that is undefined', svg: EXPORT_PICTURE, sizePx: undefined },
      { why: 'a size missing its height', svg: EXPORT_PICTURE, sizePx: { widthPx: 1600 } },
    ]
    for (const { why, svg, sizePx } of lies) {
      const fake = fakeHost()
      const rasterizer = canvasRasterizer(fake.host)
      expect(() => rasterizer.rasterizePng(svg as string, sizePx as RasterSizePx), why).not.toThrow()
      const settled = await settle(rasterizer.rasterizePng(svg as string, sizePx as RasterSizePx))
      expect(settled.kind, why).toBe('resolved')
      const fault = faultOf(settled, why)
      expect(RASTER_FAULT_REASONS, why).toContain(fault.reason)
      expect(fault.what.length, why).toBeGreaterThan(0)
    }
  })

  it('answers empty bytes when the machine gives empty bytes', async () => {
    const { settled } = await raster({ pngBytes: [] }, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    const bytes = bytesOf(settled, 'a zero-length blob')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes).toHaveLength(0)
  })
})


const PD_130_MAPPING: readonly {
  readonly why: string
  readonly script: HostScript
  readonly reason: RasterFaultReason
}[] = [
  {
    why: 'no 2D context even for a one-pixel canvas -- no size and no retry would help',
    script: { contextFor: () => null },
    reason: 'unsupported',
  },
  {
    why: 'the bytes were refused because the canvas is tainted',
    script: { toBlob: { throws: namedError('SecurityError', 'Tainted canvases may not be exported.') } },
    reason: 'unsupported',
  },
  {
    why: 'no context for this size, but a one-pixel canvas gets one',
    script: { contextFor: (widthPx, heightPx) => (widthPx === 1 && heightPx === 1 ? 'context' : null) },
    reason: 'tooLarge',
  },
  {
    why: 'the canvas kept a narrower width than it was given',
    script: { keepWidth: () => 4096 },
    reason: 'tooLarge',
  },
  {
    why: 'the canvas kept a shorter height than it was given',
    script: { keepHeight: () => 2048 },
    reason: 'tooLarge',
  },
  {
    why: 'decoding did not finish',
    script: { decode: { rejects: namedError('EncodingError', 'cannot decode') } },
    reason: 'rasterFailed',
  },
  {
    why: 'painting did not finish',
    script: { drawImage: { throws: namedError('InvalidStateError', 'broken image') } },
    reason: 'rasterFailed',
  },
  {
    why: 'the canvas produced no bytes',
    script: { toBlob: 'null' },
    reason: 'rasterFailed',
  },
  {
    why: 'reading the blob did not finish',
    script: { arrayBuffer: { rejects: namedError('NotReadableError', 'unreadable') } },
    reason: 'rasterFailed',
  },
  {
    why: 'the host threw where nothing was expected',
    script: { createElement: () => ({ throws: namedError('NotSupportedError', 'no elements') }) },
    reason: 'rasterFailed',
  },
  {
    why: 'the quota was exceeded -- attempted, did not finish',
    script: { toBlob: { throws: namedError('QuotaExceededError', 'out of memory') } },
    reason: 'rasterFailed',
  },
  {
    why: 'the person cancelled -- attempted, did not finish',
    script: { toBlob: { throws: namedError('AbortError', 'The operation was aborted.') } },
    reason: 'rasterFailed',
  },
]

describe('PND-130 (provisional) -- the three reasons and what each is read from', () => {
  it('walks the whole mapping', async () => {
    expect(new Set(PD_130_MAPPING.map((one) => one.reason)).size).toBe(3)
    for (const { why, script, reason } of PD_130_MAPPING) {
      const fault = faultOf(await raster(script, EXPORT_PICTURE, SIZE_AT_SCALE_1).then((oneRect) => oneRect.settled), why)
      expect(fault.reason, why).toBe(reason)
    }
  })

  it('tells `unsupported` from `tooLarge` by probing a one-pixel canvas', async () => {
    const { fake, settled } = await raster(
      { contextFor: (widthPx, heightPx) => (widthPx === 1 && heightPx === 1 ? 'context' : null) },
      EXPORT_PICTURE,
      SIZE_AT_SCALE_1,
    )
    expect(faultOf(settled, 'a size this machine will not paint').reason).toBe('tooLarge')
    expect(fake.canvasSizes, 'a one-pixel canvas was asked for a context').toContainEqual({
      widthPx: 1,
      heightPx: 1,
    })
  })

  it('does not call a machine that refuses everything `tooLarge`', async () => {
    const fault = faultOf(
      await raster({ contextFor: () => null }, EXPORT_PICTURE, SIZE_AT_SCALE_1).then((oneRect) => oneRect.settled),
      'no context at any size',
    )
    expect(fault.reason).toBe('unsupported')
  })

  it('does not call a machine that painted and then refused `unsupported`, except when tainted', async () => {
    for (const { why, script } of [
      { why: 'no bytes', script: { toBlob: 'null' as const } },
      { why: 'the blob would not read', script: { arrayBuffer: { rejects: new Error('x') } } },
      { why: 'decoding failed', script: { decode: { rejects: new Error('x') } } },
    ]) {
      const fault = faultOf(await raster(script, EXPORT_PICTURE, SIZE_AT_SCALE_1).then((oneRect) => oneRect.settled), why)
      expect(fault.reason, why).toBe('rasterFailed')
    }
  })
})


function pictureCarrying(inner: string): string {
  return [
    `<svg xmlns="${SVG_NS}" xmlns:xlink="${XLINK_NS}"`,
    ' width="1600" height="900" viewBox="0 0 1600 900">',
    inner,
    '</svg>',
  ].join('')
}

const PD_131_FETCHES: readonly { readonly why: string; readonly inner: string; readonly named: string }[] = [
  {
    why: 'an <image> pointing at another host',
    inner: '<image href="https://example.invalid/logo.png" x="0" y="0"/>',
    named: 'https://example.invalid/logo.png',
  },
  {
    why: 'an <image> using the older xlink spelling',
    inner: '<image xlink:href="http://example.invalid/logo.png" x="0" y="0"/>',
    named: 'http://example.invalid/logo.png',
  },
  {
    why: 'a paint served from a url',
    inner: '<rect fill="url(https://example.invalid/paint.svg#p)" width="8" height="8"/>',
    named: 'https://example.invalid/paint.svg#p',
  },
  {
    why: 'a stylesheet pulled in from elsewhere',
    inner: '<style>@import url("https://example.invalid/theme.css");</style>',
    named: 'https://example.invalid/theme.css',
  },
  {
    why: 'a reference relative to the page, which an isolated image has no page for',
    inner: '<image href="./logo.png" x="0" y="0"/>',
    named: './logo.png',
  },
  {
    why: 'a reference rooted at the site',
    inner: '<image href="/assets/logo.png" x="0" y="0"/>',
    named: '/assets/logo.png',
  },
]

const PD_131_SELF_CONTAINED: readonly { readonly why: string; readonly inner: string }[] = [
  { why: 'a reference into the picture itself', inner: `<g clip-path="url(#${FIT_CLIP_ID})"><rect/></g>` },
  { why: 'an href into the picture itself', inner: '<use href="#a"/><g id="a"><rect/></g>' },
  { why: 'the older xlink spelling of the same', inner: '<use xlink:href="#a"/><g id="a"><rect/></g>' },
  {
    why: 'an image carried in the picture as data',
    inner: '<image href="data:image/png;base64,iVBORw0KGgo=" x="0" y="0"/>',
  },
  { why: 'no reference at all', inner: '<rect width="8" height="8"/>' },
]

describe('PND-131 -- SETTLED (CR-353) -- a picture that would have to fetch is refused', () => {
  it('walks every kind of outside reference and names it', async () => {
    expect(PD_131_FETCHES.length).toBeGreaterThan(0)
    for (const { why, inner, named } of PD_131_FETCHES) {
      const { fake, settled } = await raster({}, pictureCarrying(inner), SIZE_AT_SCALE_1)
      const fault = faultOf(settled, why)
      expect(fault.reason, why).toBe('rasterFailed')
      expect(fault.what, `${why}: NT-3a needs the notice to say WHICH reference`).toContain(named)
      expect(fake.drawCalls, `${why}: nothing half-painted is handed back`).toHaveLength(0)
    }
  })

  it('paints every picture that needs nothing fetched', async () => {
    for (const { why, inner } of PD_131_SELF_CONTAINED) {
      const { settled } = await raster({}, pictureCarrying(inner), SIZE_AT_SCALE_1)
      expect(rasteringOf(settled, why).ok, why).toBe(true)
    }
  })

  it('paints the picture ImageExporter actually builds -- one internal reference', async () => {
    const { settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    expect(rasteringOf(settled, 'the picture that crosses this seam today').ok).toBe(true)
  })
})


const PD_132_ROOTS: readonly {
  readonly why: string
  readonly svg: string
  readonly outcome: 'rewritten' | 'untouched' | 'refused'
}[] = [
  {
    why: 'a viewBox and a size -- the picture an export carries',
    svg: `<svg xmlns="${SVG_NS}" width="1600" height="900" viewBox="0 0 1600 900"><rect/></svg>`,
    outcome: 'rewritten',
  },
  {
    why: 'a viewBox and no size',
    svg: `<svg xmlns="${SVG_NS}" viewBox="0 0 1600 900"><rect/></svg>`,
    outcome: 'rewritten',
  },
  {
    why: 'a viewBox and a size given in per cent',
    svg: `<svg xmlns="${SVG_NS}" width="100%" height="100%" viewBox="0 0 1600 900"><rect/></svg>`,
    outcome: 'rewritten',
  },
  {
    why: 'a size and no viewBox -- the units are already the pixels',
    svg: `<svg xmlns="${SVG_NS}" width="1600" height="900"><rect/></svg>`,
    outcome: 'untouched',
  },
  {
    why: 'neither a viewBox nor a size',
    svg: `<svg xmlns="${SVG_NS}"><rect/></svg>`,
    outcome: 'refused',
  },
]

describe('PND-132 (provisional) -- what becomes of the root <svg> tag', () => {
  it('walks every shape a root tag can arrive in', async () => {
    const sizePx: RasterSizePx = { widthPx: 3200, heightPx: 1800 }
    for (const { why, svg, outcome } of PD_132_ROOTS) {
      const { fake, settled } = await raster({}, svg, sizePx)
      if (outcome === 'refused') {
        const fault = faultOf(settled, why)
        expect(fault.reason, why).toBe('rasterFailed')
        expect(fake.srcs, `${why}: nothing is guessed at and handed to a decoder`).toHaveLength(0)
        continue
      }
      bytesOf(settled, why)
      const given = svgGivenToDecoder(fake.srcs[0] ?? '')
      const root = rootTagOf(given)
      if (outcome === 'untouched') {
        expect(given, why).toBe(svg)
        continue
      }
      expect(attributeValue(root, 'width'), why).toMatch(/^3200(px)?$/)
      expect(attributeValue(root, 'height'), why).toMatch(/^1800(px)?$/)
      expect(attributeValue(root, 'viewBox'), `${why}: the viewBox is what keeps it lossless`)
        .toBe('0 0 1600 900')
      const names = attributesOf(root).map((one) => one.name)
      expect(names.filter((name) => name === 'width'), why).toHaveLength(1)
      expect(names.filter((name) => name === 'height'), why).toHaveLength(1)
    }
  })

  it('keeps the namespace and everything else the root carried', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const root = rootTagOf(svgGivenToDecoder(fake.srcs[0] ?? ''))
    expect(attributeValue(root, 'xmlns')).toBe(SVG_NS)
    expect(attributeValue(root, 'xmlns:xlink')).toBe(XLINK_NS)
  })

  it('writes the size the caller asked for, not S-81', async () => {
    const sizePx: RasterSizePx = { widthPx: 3200, heightPx: 1800 }
    const { fake, settled } = await raster({}, EXPORT_PICTURE, sizePx)
    bytesOf(settled, 'a size larger than S-81')
    const root = rootTagOf(svgGivenToDecoder(fake.srcs[0] ?? ''))
    expect(attributeValue(root, 'width')).not.toBe(String(T_204.s81.width))
    expect(attributeValue(root, 'width')).toMatch(/^3200(px)?$/)
  })
})


const PD_133_SIZES: readonly { readonly why: string; readonly sizePx: RasterSizePx }[] = [
  { why: 'a fractional width', sizePx: { widthPx: 1600.5, heightPx: 900 } },
  { why: 'a fractional height', sizePx: { widthPx: 1600, heightPx: 900.25 } },
  { why: 'a width below one pixel', sizePx: { widthPx: 0.5, heightPx: 900 } },
  { why: 'a width of no pixels', sizePx: { widthPx: 0, heightPx: 900 } },
  { why: 'a height of no pixels', sizePx: { widthPx: 1600, heightPx: 0 } },
  { why: 'a negative width', sizePx: { widthPx: -1600, heightPx: 900 } },
  { why: 'a width that is not a number', sizePx: { widthPx: Number.NaN, heightPx: 900 } },
  { why: 'a width without end', sizePx: { widthPx: Number.POSITIVE_INFINITY, heightPx: 900 } },
]

describe('PND-133 -- SETTLED (CR-353) -- a size a canvas cannot be is refused, not rounded', () => {
  it('walks every size that is not whole pixels', async () => {
    for (const { why, sizePx } of PD_133_SIZES) {
      const { fake, settled } = await raster({}, EXPORT_PICTURE, sizePx)
      const fault = faultOf(settled, why)
      expect(fault.reason, why).toBe('rasterFailed')
      expect(fault.what, `${why}: NT-3a needs the notice to name the size received`)
        .toContain(String(sizePx.widthPx))
      expect(fake.canvasSizes, `${why}: nothing is painted at a size nobody asked for`).toHaveLength(0)
    }
  })

  it('accepts the whole numbers on either side of the refusal', async () => {
    for (const sizePx of [
      { widthPx: 1, heightPx: 1 },
      { widthPx: 1600, heightPx: 900 },
      { widthPx: 1601, heightPx: 901 },
      { widthPx: 3200, heightPx: 1800 },
    ]) {
      const why = `${sizePx.widthPx}x${sizePx.heightPx}`
      const { fake, settled } = await raster({}, EXPORT_PICTURE, sizePx)
      bytesOf(settled, why)
      expect(fake.canvasSizes, why).toEqual([{ widthPx: sizePx.widthPx, heightPx: sizePx.heightPx }])
    }
  })
})


describe('PND-134 (provisional) -- the picture is the only thing drawn', () => {
  it('touches `drawImage` on the context and no other way of painting', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    expect([...new Set(fake.contextTouched)]).toEqual(['drawImage'])
  })

  it('paints nothing before the picture', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const painting = fake.log.filter((one) => one.startsWith('context.'))
    expect(painting).toEqual(['context.drawImage'])
  })

  it('sets no ground on the canvas element either', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const written = fake.log.filter((one) => one.startsWith('canvas.') && one.includes('='))
    for (const one of written) {
      expect(/width=|height=/.test(one), one).toBe(true)
    }
  })

  it('writes nothing on the image but its source', async () => {
    const { fake, settled } = await raster({}, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    bytesOf(settled, 'the ordinary path')
    const written = fake.log.filter((one) => one.startsWith('img.') && one.endsWith('='))
    expect(written).toEqual(['img.src='])
  })
})
