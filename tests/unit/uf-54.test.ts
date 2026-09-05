// Unit tests for UF-54 `canvas-rasterizer.ts` -- table T-075 of
// docs/spec/05-07-design.md (:303), component `CanvasRasterizer` (CP-31 of
// table T-062, :120), published as PI-31 of table T-064 (:361). It is the one
// implementation of the seam `Rasterizer` (IF-6 of table T-065, :383), which
// `ImageExporter` declares.
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below; the seam this unit realises in full, because `rasterizer.ts` (UF-40)
// is the declaration that fixes `RasterSizePx`, `RasterFaultReason`,
// `RasterFault`, `Rastering` and `Rasterizer`; and of the unit itself only its
// head comment and the one signature
// `canvasRasterizer(host: Document): Rasterizer`. No function body was read,
// and every expectation below comes from a requirement, a table, or the seam's
// own declaration -- never from what the code happens to do.
//
// THE BROWSER IS A FAKE HERE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs
// under Node with no DOM, and LY-5 of table T-060 (:51) puts the browser in
// this layer while R7.3 asks for it to be injected. So every case drives the
// unit with a hand-made host and then asserts WHAT THE UNIT DID TO IT -- which
// elements it made, what it assigned, the arguments of every call, their order,
// and the members it never touched -- not merely that a value came back.
//
// The rules these cases answer to:
//   table T-024 IO-3   (:2830) SVG, write out only. The picture that arrives IS
//                      that output; it belongs to the near side, so this unit
//                      copies it and never changes what a person receives
//   table T-024 IO-4   (:2831) PNG, write out only. The whole of what this unit
//                      produces, as bytes. No member reads an image back, so no
//                      intake is opened for FR-023
//   FR-025             (:3132) the output size is fixed at S-81 (MUST NOT let it
//                      be chosen per export) and the PNG scale is chosen from
//                      S-82. Every one of its rules -- the size, the scale, the
//                      TaskGroup-wise dropping, the blank remainder, the count
//                      that must be told -- is settled BEFORE the call arrives,
//                      so this unit decides none of them
//   FR-080             (:3073) the export is the screen shrunk by one ratio, and
//                      table T-076 (:3101-:3114) settles which UI parts are
//                      drawn. Both are settled on the near side as well
//   table T-035 AG-8   (:3493) a failed rastering comes back to the caller AS A
//                      VALUE
//   FR-028             (:3438) what came of a call is returned as a value;
//                      throwing is forbidden (MUST NOT). The RATIONALE gives the
//                      reason: making a caller read an exception's text puts the
//                      KIND of a failure at the mercy of the implementation
//   table T-037        (:3676) NT-3a (MUST): a failure notice carries what can be
//                      done next, and a notice that only says it failed is
//                      forbidden (MUST NOT). NT-5 (:3679) is FR-025's manner for
//                      telling a person what was dropped -- the near side's
//   table T-041 WY-2   (:3088) one JSON, one environment, the same PNG. So no
//                      clock, no random source, nothing kept between calls
//   table T-041 WY-3   (:3089) the screen's rectangles and the export's agree
//                      after ONE rounding rule (:3081, MUST) -- which is why a
//                      pixel size that is not a whole number of pixels cannot
//                      quietly be truncated here
//   table T-060 LY-5   (:51) the Framework is the layer that holds current
//                      values and touches the browser
//   table T-061 LR-5   (:61, MUST) the implementation of an inner layer's
//                      interface lives in the outer layer
//   Chapter 5.3        (:370) the implementing layer may not reach past the
//                      declaring folder's public entry, so the seam's types are
//                      imported from `image-exporter.ts` here as well (LR-2)
//   table T-204        (docs/spec/_assets/tbl-settings.md :195-:196) S-81
//                      `exportCanvas` = 1600 x 900 and S-82 `exportPngScale`
//                      in { 1, 2 }. Their product is what `RasterSizePx`
//                      carries. This unit must read NEITHER -- a second reading
//                      would be a second place deciding an export's size
//
// FIVE DECISIONS ARE PINNED, EACH MARKED WITH ITS OWN STATUS. Each has its own
// block at the foot of this file, per docs/development-rules/
// 06-pending-decisions.md section 3, which asks for the test that falls when a
// provisional value is overturned to be written in advance:
//   PD-130  which `RasterFaultReason` each way of refusing maps onto (provisional)
//   PD-131  a picture that would make the decoder fetch is refused (SETTLED, CR-353)
//   PD-132  what the root <svg> tag's own width and height become (provisional)
//   PD-133  a pixel size that is not a whole number of pixels is refused (SETTLED, CR-353)
//   PD-134  nothing is painted under the picture (provisional)
// Every block outside those five holds whatever those decisions turn out to be.

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

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by (Chapter 1.9, :275 --
// one test walks every row, rather than one test per row). Transcribed in
// ASCII and cited by row ID: the rule of a row stays with the row, and copying
// its prose here would put the same claim in two places (Chapter 1.9).
// ---------------------------------------------------------------------------

/**
 * Table T-064 row PI-31 -- what leaves this component: one implementation of
 * `Rasterizer`. `Rasterizer` itself is a type and is gone by run time, so the
 * factory is the only runtime name.
 */
const T_064_PI_31 = {
  id: 'PI-31',
  layer: 'Framework',
  component: 'CanvasRasterizer',
  runtimeNames: ['canvasRasterizer'],
} as const

/**
 * Table T-065 row IF-6. The member's name is not the table's -- T-065 names the
 * interface and what it supplies, and UF-40 decides the member.
 */
const T_065_IF_6 = {
  id: 'IF-6',
  seam: 'Rasterizer',
  declaredBy: 'ImageExporter',
  implementedBy: 'CanvasRasterizer',
  supplies: 'SVG to image (IO-4)',
  member: 'rasterizePng',
} as const

/** Table T-075 row UF-54 -- the unit's file and its purity. */
const T_075_UF_54 = {
  id: 'UF-54',
  component: 'CanvasRasterizer',
  file: 'canvas-rasterizer.ts',
  purity: 'semi-pure-b',
} as const

/**
 * Table T-024, the two rows that reach this unit. Both are write-out only, so
 * neither admits a member that reads an image back.
 */
const T_024_ROWS = [
  { id: 'IO-3', format: 'SVG', canWrite: true, canRead: false, note: 'size is S-81' },
  { id: 'IO-4', format: 'PNG', canWrite: true, canRead: false, note: 'scale is S-82' },
] as const

/**
 * Table T-204 rows S-81 and S-82 (docs/spec/_assets/tbl-settings.md :195-:196).
 * Held here ONLY to build the sizes a real caller would pass and to prove this
 * unit does not read them: the seam already carries their product.
 */
const T_204 = {
  s81: { id: 'S-81', key: 'exportCanvas', width: 1600, height: 900 },
  s82: { id: 'S-82', key: 'exportPngScale', values: [1, 2] },
} as const

/**
 * Table T-076 (:3101-:3114) -- which UI parts an export draws. EVERY row is
 * settled before this seam is reached (FR-080 MUST, and the seam's own note),
 * so what these cases assert is that the unit re-decides NONE of them: a
 * marker for each row goes in and each one comes out again, drawn rows and
 * not-drawn rows alike.
 */
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

/**
 * The whole of `RasterFaultReason`, as `rasterizer.ts` declares it. Three
 * because NT-3a (MUST) makes a failure notice carry what can be done next, and
 * these three do not share a next step: IO-3's SVG, the smaller value of S-82,
 * and trying again.
 */
const RASTER_FAULT_REASONS: readonly RasterFaultReason[] = [
  'unsupported',
  'tooLarge',
  'rasterFailed',
]

/**
 * The two rows of table T-037 that reach this unit. `owes` is what the unit has
 * to hand over so the notice side can obey the row; the wording itself is the
 * notice's, because FR-038 makes it depend on the display language.
 */
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

// ---------------------------------------------------------------------------
// The pictures. IO-3's output is what arrives, so these are shaped the way
// ImageExporter builds one: S-81 wide and tall, one `viewBox`, and the single
// internal reference `url(#grs-export-fit)` its clip is named by.
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

/** The one clip id an exported picture carries; internal, so `#...`. */
const FIT_CLIP_ID = 'grs-export-fit'

/** One element per row of table T-076, so a walk over the picture is a walk over the table. */
const T_076_MARKERS = T_076_ROWS.map((row) => `<g data-export-row="${row.id}"/>`).join('')

/** A picture as ImageExporter would hand one over: S-81 sized, with a viewBox. */
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

/** The size a caller computes for S-82 = 1: S-81's width and height times one. */
const SIZE_AT_SCALE_1: RasterSizePx = { widthPx: 1600, heightPx: 900 }

// ---------------------------------------------------------------------------
// The browser, as a fake. LY-5 puts the real one in this layer, and the
// signature makes it ARRIVE (R7.3) -- so `createElement` is the whole of it.
// ---------------------------------------------------------------------------

type Outcome = 'ok' | { readonly throws: unknown } | { readonly rejects: unknown }

interface HostScript {
  /** The bytes `blob.arrayBuffer()` answers with. */
  readonly pngBytes?: readonly number[]
  /** What `getContext('2d')` answers, decided by the size the canvas is at. */
  readonly contextFor?: (widthPx: number, heightPx: number) => 'context' | null
  /** A machine that will not keep the width it is given. */
  readonly keepWidth?: (askedPx: number) => number
  /** A machine that will not keep the height it is given. */
  readonly keepHeight?: (askedPx: number) => number
  readonly decode?: Outcome
  readonly drawImage?: Outcome
  readonly toBlob?: 'bytes' | 'null' | { readonly throws: unknown }
  /** A host that hands the bytes over on a later turn rather than at once. */
  readonly toBlobDeferred?: boolean
  readonly arrayBuffer?: 'bytes' | { readonly rejects: unknown }
  readonly createElement?: (tag: string) => 'make' | { readonly throws: unknown }
  /** An <img> from a browser that has no `decode` -- the API simply absent. */
  readonly imageWithoutDecode?: boolean
  /** A <canvas> from a browser that has no `toBlob`. */
  readonly canvasWithoutToBlob?: boolean
}

interface MadeElement {
  readonly tag: string
  readonly element: unknown
}

interface FakeHost {
  /** What is handed to `canvasRasterizer`. */
  readonly host: Document
  /** Every member of the host object the unit read, in order. */
  readonly hostTouched: string[]
  /** Every tag `createElement` was asked for, in order. */
  readonly tags: string[]
  /** Every element handed back, with its tag. */
  readonly made: MadeElement[]
  /** Every string assigned to an <img>'s `src`, in order. */
  readonly srcs: string[]
  /** Every member of an <img> the unit read or wrote. */
  readonly imageTouched: string[]
  /** The size each canvas was at when a context was asked of it. */
  readonly canvasSizes: { widthPx: number; heightPx: number }[]
  /** Every argument `getContext` was called with. */
  readonly contextKinds: string[]
  /** Every member of a 2D context the unit read. */
  readonly contextTouched: string[]
  /** The arguments of every `drawImage`, in order. */
  readonly drawCalls: unknown[][]
  /** The second argument of every `toBlob`, in order. */
  readonly toBlobTypes: (string | undefined)[]
  /** An ordered log of everything the unit did to this host. */
  readonly log: string[]
}

/** IO-4: PNG. The eight-byte signature, and three bytes behind it. */
const PNG_BYTES: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03]

/** An error carrying a platform name, the way a browser refuses. */
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
        // PD-134: nothing may be painted under the picture. These exist so that
        // a call to one of them is recorded rather than being a TypeError that
        // FR-028 would turn into an indistinguishable value.
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

// ---------------------------------------------------------------------------
// Helpers the cases share.
// ---------------------------------------------------------------------------

type Settled =
  | { readonly kind: 'resolved'; readonly value: Rastering }
  | { readonly kind: 'rejected'; readonly reason: unknown }

/**
 * FR-028 (MUST NOT) forbids the throw, so nothing here may `await` a call
 * directly: a rejection has to be observable as a case rather than as a test
 * error.
 */
async function settle(promise: Promise<Rastering>): Promise<Settled> {
  try {
    return { kind: 'resolved', value: await promise }
  } catch (reason: unknown) {
    return { kind: 'rejected', reason }
  }
}

/** Runs one rastering against a fresh fake and returns both. */
async function raster(
  script: HostScript,
  svg: string,
  sizePx: RasterSizePx,
): Promise<{ readonly fake: FakeHost; readonly settled: Settled }> {
  const fake = fakeHost(script)
  const settled = await settle(canvasRasterizer(fake.host).rasterizePng(svg, sizePx))
  return { fake, settled }
}

/** The value a resolved call carries, or a failure that names what came instead. */
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

/**
 * The SVG the decoder was handed. There is no `URL.createObjectURL` in this
 * process and R7.3 forbids reaching for one, so the only way an <img> can be
 * given a picture is a url that carries the text itself.
 */
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

/** Every attribute of a tag, in the order written, so a repeat can be counted. */
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

/** Every printable ASCII character and nothing else. */
const ASCII_ONLY = /^[ -~]*$/

// ---------------------------------------------------------------------------
// The rosters themselves, before anything walks them
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  // A walk over an empty roster passes without asserting anything. These pin
  // the counts so a vacuous case cannot go green.
  it('carries T-076 in full, the three reasons, both T-037 rows and both T-024 rows', () => {
    expect(T_076_ROWS).toHaveLength(14)
    expect(new Set(T_076_ROWS.map((row) => row.id)).size).toBe(14)
    expect(RASTER_FAULT_REASONS).toHaveLength(3)
    expect(new Set(RASTER_FAULT_REASONS).size).toBe(3)
    expect(T_037_ROWS).toHaveLength(2)
    expect(T_024_ROWS).toHaveLength(2)
    expect(T_204.s82.values).toEqual([1, 2])
  })

  it('builds a picture that carries one marker per row of table T-076', () => {
    for (const row of T_076_ROWS) {
      expect(EXPORT_PICTURE, row.id).toContain(`data-export-row="${row.id}"`)
    }
  })
})

// ---------------------------------------------------------------------------
// PI-31 of table T-064, IF-6 of table T-065, Chapter 5.3 -- what leaves
// ---------------------------------------------------------------------------

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
    // Type-only: the five names below are imported from `image-exporter.ts` at
    // the head of this file, which Chapter 5.3 makes the only way in. That they
    // resolve there is the assertion.
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

// ---------------------------------------------------------------------------
// LY-5 of table T-060 and R7.3 -- the browser ARRIVES; it is never reached for
// ---------------------------------------------------------------------------

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
    // Node keeps all three of these, so their mere absence proves nothing.
    // Each is wrapped so that a call would be recorded, then put back.
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
      // The picture reached the decoder anyway, so the url carries it.
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

// ---------------------------------------------------------------------------
// The ordinary path -- IO-4, and what the unit DID to the machine
// ---------------------------------------------------------------------------

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

  it('walks S-82 -- both scales of table T-204 reach the canvas as given', async () => {
    for (const scale of T_204.s82.values) {
      const sizePx: RasterSizePx = {
        widthPx: T_204.s81.width * scale,
        heightPx: T_204.s81.height * scale,
      }
      const { fake, settled } = await raster({}, EXPORT_PICTURE, sizePx)
      const why = `${T_204.s82.id} = ${scale}`
      bytesOf(settled, why)
      expect(fake.canvasSizes, why).toEqual([{ widthPx: sizePx.widthPx, heightPx: sizePx.heightPx }])
      expect(fake.drawCalls[0]?.slice(1), why).toEqual([0, 0, sizePx.widthPx, sizePx.heightPx])
    }
  })

  it('reads neither S-81 nor S-82 -- a size that is neither is painted just the same', async () => {
    // A second reading of table T-204 here would be a second place deciding an
    // export's size, which FR-025 (MUST NOT) fixes on the near side.
    const odd: RasterSizePx = { widthPx: 7, heightPx: 11 }
    const { fake, settled } = await raster({}, EXPORT_PICTURE, odd)
    bytesOf(settled, 'a size that is not S-81 times S-82')
    expect(fake.canvasSizes).toEqual([{ widthPx: 7, heightPx: 11 }])
    expect(fake.canvasSizes[0]?.widthPx).not.toBe(T_204.s81.width)
  })

  it('invents no ceiling of its own -- a huge size a machine accepts is painted', async () => {
    // PD-130's grounds: a maximum would be a number no table holds, and it
    // differs per browser and per machine. The probe replaces it.
    const huge: RasterSizePx = { widthPx: 1_000_000, heightPx: 1_000_000 }
    const { fake, settled } = await raster({}, EXPORT_PICTURE, huge)
    bytesOf(settled, 'a machine that accepts a million pixels')
    expect(fake.canvasSizes).toEqual([{ widthPx: 1_000_000, heightPx: 1_000_000 }])
  })
})

// ---------------------------------------------------------------------------
// IO-3 of table T-024 -- the picture is the near side's, and comes back whole
// ---------------------------------------------------------------------------

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
    // `xmlns` and `xmlns:xlink` carry http urls and are not references at all.
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

// ---------------------------------------------------------------------------
// WY-2 of table T-041 -- one environment, one answer
// ---------------------------------------------------------------------------

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
    // A failing call first, then a good one on a fresh host: the second must be
    // exactly the answer a first call would have given.
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

// ---------------------------------------------------------------------------
// FR-028 and AG-8 of table T-035 -- every ending is a value
// ---------------------------------------------------------------------------

/**
 * Every way a host can refuse, from the API simply being absent to a promise
 * rejecting. What each MEANS is PD-130 and is pinned in its own block; these
 * cases assert only that each ends as a VALUE and names something.
 */
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
    // FR-028's RATIONALE keeps the KIND of a failure off the exception's text,
    // and this project writes log output in ASCII. A message the machine wrote
    // is neither this project's words nor necessarily ASCII.
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

// ---------------------------------------------------------------------------
// Boundaries -- the empty picture, the one-pixel canvas, what is not an SVG
// ---------------------------------------------------------------------------

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
    // The seam admits neither `null` nor a half-built size, so nothing here is
    // a shape a compiled caller can pass. FR-028's MUST NOT has no exception
    // clause, though, and the near side does not take the promise on trust --
    // so a lie has to come back as a value too, not as a rejection.
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
    // A canvas that hands back a zero-length blob has not failed; it has
    // answered. AG-8 separates the two, and only a fault may be `ok: false`.
    const { settled } = await raster({ pngBytes: [] }, EXPORT_PICTURE, SIZE_AT_SCALE_1)
    const bytes = bytesOf(settled, 'a zero-length blob')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// PD-130 (provisional) -- which reason each way of refusing maps onto
//
// docs/spec names the three reasons (the seam's own declaration, from NT-3a of
// table T-037) but nowhere says which browser signal is which. Searched: the
// whole of docs/spec for `SecurityError`, `getContext`, `toBlob`, `canvas` and
// `tainted` -- no hit. The mapping below is the recommendation recorded as
// PD-130, chosen against the three next steps the seam gives each reason.
// Overturning it fails exactly these assertions and nothing else.
// ---------------------------------------------------------------------------

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

describe('PD-130 (provisional) -- the three reasons and what each is read from', () => {
  it('walks the whole mapping', async () => {
    expect(new Set(PD_130_MAPPING.map((one) => one.reason)).size).toBe(3)
    for (const { why, script, reason } of PD_130_MAPPING) {
      const fault = faultOf(await raster(script, EXPORT_PICTURE, SIZE_AT_SCALE_1).then((oneRect) => oneRect.settled), why)
      expect(fault.reason, why).toBe(reason)
    }
  })

  it('tells `unsupported` from `tooLarge` by probing a one-pixel canvas', async () => {
    // The grounds for the split: a ceiling would be a number no table holds and
    // it differs per browser and per machine, so the machine is asked instead.
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
    // NT-3a: `tooLarge` would send the person to the smaller value of S-82,
    // which cannot help a browser that paints nothing at all.
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

// ---------------------------------------------------------------------------
// PD-131 -- SETTLED (CR-353) -- a picture that would make the decoder fetch is
// refused
//
// docs/spec does not say whether an external reference is refused or painted
// anyway. The ruling kept the recommendation: refuse it, with the offending
// reference named in `what`, because an SVG rendered through an <img> fetches
// nothing, so what is behind such a reference is silently absent from the
// raster while it still shows on the screen -- and neither WY-2 nor WY-3 can
// be judged on a picture that lost a part without saying so.
// ---------------------------------------------------------------------------

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

describe('PD-131 -- SETTLED (CR-353) -- a picture that would have to fetch is refused', () => {
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

// ---------------------------------------------------------------------------
// PD-132 (provisional) -- the root tag's own width and height
//
// Table T-024 has IO-3 and IO-4 as two rows and no row says what the second
// does with the first's root tag. The recommendation: rewrite the pair to the
// pixel size when the picture carries a `viewBox` (which is what makes the
// rewrite lossless), leave it exactly as it is when it carries a size and no
// `viewBox` (the units are the pixels, so rewriting would move the content),
// and refuse when it carries neither (a decoder would invent a size and the
// export would be silently wrong).
// ---------------------------------------------------------------------------

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

describe('PD-132 (provisional) -- what becomes of the root <svg> tag', () => {
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
      // A data url is read as XML, where a repeated attribute is fatal.
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
    // S-82's larger value must give a bigger picture, not a blurred one: a
    // decoder handed the old intrinsic size may raster at THAT size and scale
    // the bitmap afterwards.
    const sizePx: RasterSizePx = { widthPx: 3200, heightPx: 1800 }
    const { fake, settled } = await raster({}, EXPORT_PICTURE, sizePx)
    bytesOf(settled, 'S-82 at its larger value')
    const root = rootTagOf(svgGivenToDecoder(fake.srcs[0] ?? ''))
    expect(attributeValue(root, 'width')).not.toBe(String(T_204.s81.width))
    expect(attributeValue(root, 'width')).toMatch(/^3200(px)?$/)
  })
})

// ---------------------------------------------------------------------------
// PD-133 -- SETTLED (CR-353) -- a pixel size that is not whole pixels is
// refused
//
// A canvas truncates what it is given, so a fractional size comes back as a
// picture at a size nobody asked for, and WY-3 (which compares the screen's
// rectangles against the export's after ONE rounding rule, :3081 MUST) cannot
// be judged on it. Rounding it here would make this unit decide an export's
// size, which FR-025 fixes at S-81 times S-82 on the near side. The ruling
// kept the refusal.
// ---------------------------------------------------------------------------

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

describe('PD-133 -- SETTLED (CR-353) -- a size a canvas cannot be is refused, not rounded', () => {
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

// ---------------------------------------------------------------------------
// PD-134 (provisional) -- nothing is painted under the picture
//
// What an export shows is FR-080's and table T-076's, and no key of table T-204
// holds a ground colour for the export. Choosing one here would be this unit
// deciding what the export looks like.
// ---------------------------------------------------------------------------

describe('PD-134 (provisional) -- the picture is the only thing drawn', () => {
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
