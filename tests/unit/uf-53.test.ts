// Unit tests for UF-53 (browser-clipboard.ts): the one implementation of the Clipboard seam (IF-5), driven with a fake browser.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import * as browserClipboardModule from '../../src/framework/browser-clipboard/browser-clipboard'
import { browserClipboard } from '../../src/framework/browser-clipboard/browser-clipboard'
// WHY: the DOM lib declares a global Clipboard too; importing the seam's
// own name shadows it, the same thing the unit under test has to do.
import type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
  ClipboardWriting,
} from '../../src/adapter/clipboard-gateway/clipboard-gateway'

// see T-008
const T_008_R9 = {
  id: 'CHN-9',
  carries: ['picture', 'document'],
  isOutboundOnly: true,
  isValidatedIntake: false,
} as const

// see T-024
const T_024_IO_6 = {
  id: 'IO-6',
  route: 'clipboard',
  canWrite: true,
  canRead: false,
} as const

// WHY: FR-025 (CR-390) puts ONE image/png item on the board for a picture
// and forbids the SVG text beside it, so the browser owes `write` as well.
const T_003_CN_2 = {
  id: 'CN-2',
  baseline: 'Chromium',
  onlyChecked: 'Firefox',
  outOfScope: 'Safari',
} as const

// see T-064
const T_064_PI_30 = {
  id: 'PI-30',
  layer: 'Framework',
  component: 'BrowserClipboard',
  runtimeNames: ['browserClipboard'],
} as const

// WHY: the member's name is not the table's -- T-065 names the interface
// and what it supplies, and UF-46 decides the member.
const T_065_IF_5 = {
  id: 'IF-5',
  seam: 'Clipboard',
  declaredBy: 'ClipboardGateway',
  implementedBy: 'BrowserClipboard',
  member: 'writeClipboardContent',
} as const

// see T-075
const T_075_UF_53 = { id: 'UF-53', file: 'browser-clipboard.ts', purity: 'non-pure' } as const

// see FR-025
const PNG_TYPE = 'image/png'

// WHY: three, because NT-3a (MUST) makes a failure notice carry what can
// be done next, and these three do not share a next step.
const CLIPBOARD_FAULTS: readonly ClipboardFault[] = ['notPermitted', 'unsupported', 'writeFailed']

// WHY: `holds` is what the unit owes so the notice side can obey the
// row; the wording itself is the notice's own (FR-038).
const T_037_ROWS: readonly {
  readonly id: string
  readonly owes: string
  readonly holds: (faults: readonly ClipboardFault[]) => boolean
}[] = [
  {
    id: 'NT-1',
    owes: 'the refusal names which of the three happened, so words can name it',
    holds: (faults) => faults.every((fault) => /^[a-z][A-Za-z]*$/.test(fault)),
  },
  {
    id: 'NT-3a',
    owes: 'the three stay told apart, so each can carry a different next step',
    holds: (faults) => new Set(faults).size === faults.length,
  },
]

// WHY: no cap and no null/empty-collection case -- CHN-9 sets no size
// limit and neither variant of ClipboardContent admits null.
const OUTSIDE_ASCII = String.fromCodePoint(0x65e5, 0x7a0b, 0x20, 0x2014, 0x20, 0xdc, 0x6e,
  0x69, 0x63, 0x6f, 0x64, 0x65, 0x20, 0x2713)

const BOUNDARY_TEXTS: readonly { readonly why: string; readonly text: string }[] = [
  { why: 'empty', text: '' },
  { why: 'one character', text: 'x' },
  { why: 'text outside ASCII', text: OUTSIDE_ASCII },
  { why: 'a newline and a tab', text: 'a\r\nb\tc' },
  { why: 'a long payload -- no cap is set for this route', text: 'x'.repeat(200_000) },
]

// WHY: FR-025 makes a picture bytes and not characters, so the boundaries
// of the picture arm are byte counts and byte values, not strings.
const BOUNDARY_PNGS: readonly { readonly why: string; readonly bytes: Uint8Array }[] = [
  { why: 'no bytes at all', bytes: new Uint8Array([]) },
  { why: 'one byte', bytes: new Uint8Array([137]) },
  {
    why: "a PNG's own eight-byte signature",
    bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  },
  {
    why: 'every byte value once, so no value is treated as a terminator',
    bytes: new Uint8Array(Array.from({ length: 256 }, (_one, at) => at)),
  },
  { why: 'a long payload -- no cap is set for this route', bytes: new Uint8Array(200_000) },
]

// WHY: kept in CHN-9's own row order, so a walk over this roster is a walk over the row.
const EVERY_CONTENT: readonly { readonly why: string; readonly content: ClipboardContent }[] = [
  ...BOUNDARY_PNGS.map(({ why, bytes }) => ({
    why: `picture, ${why}`,
    content: { kind: 'picture', pngBytes: bytes } as ClipboardContent,
  })),
  ...BOUNDARY_TEXTS.map(({ why, text }) => ({
    why: `document, ${why}`,
    content: { kind: 'document', text } as ClipboardContent,
  })),
]

const PICTURE: ClipboardContent = {
  kind: 'picture',
  pngBytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
}
const DOCUMENT: ClipboardContent = { kind: 'document', text: 'a document for an AI' }

const textOf = (content: ClipboardContent): string =>
  content.kind === 'picture' ? '' : content.text

const bytesOf = (content: ClipboardContent): Uint8Array =>
  content.kind === 'picture' ? content.pngBytes : new Uint8Array([])

// WHY: stands in for an argument that never arrived, so it cannot be
// mistaken for a write of the empty string.
const NO_ARGUMENT = '<no argument was passed>'

type Outcome =
  | { readonly kind: 'ok' }
  | { readonly kind: 'reject'; readonly reason: unknown }
  | { readonly kind: 'throw'; readonly reason: unknown }

// WHY: the unit reaches the two host constructors through globalThis, so
// the fake has to stand there and not be handed in.
interface HeldBlob {
  readonly parts: readonly unknown[]
  readonly type: string
}

interface HeldItem {
  readonly held: Record<string, HeldBlob>
}

class FakeBlob implements HeldBlob {
  readonly parts: readonly unknown[]
  readonly type: string
  constructor(parts: readonly unknown[], options: { type: string }) {
    this.parts = parts
    this.type = options.type
  }
}

class FakeItem implements HeldItem {
  readonly held: Record<string, HeldBlob>
  constructor(parts: Record<string, HeldBlob>) {
    this.held = parts
  }
}

const HOST = globalThis as unknown as Record<string, unknown>
let blobWas: unknown
let itemWas: unknown

beforeEach(() => {
  blobWas = HOST['Blob']
  itemWas = HOST['ClipboardItem']
  HOST['Blob'] = FakeBlob
  HOST['ClipboardItem'] = FakeItem
})

afterEach(() => {
  HOST['Blob'] = blobWas
  HOST['ClipboardItem'] = itemWas
})

interface FakeSystemClipboard {
  readonly systemClipboard: {
    writeText(text: string): Promise<void>
    write(items: readonly unknown[]): Promise<void>
  }
  readonly writes: string[]
  readonly items: (readonly HeldItem[])[]
  readonly argumentCounts: number[]
  readonly touched: string[]
}

function fakeSystemClipboard(outcomes: readonly Outcome[]): FakeSystemClipboard {
  const writes: string[] = []
  const items: (readonly HeldItem[])[] = []
  const argumentCounts: number[] = []
  const touched: string[] = []
  const settle = (): Promise<void> => {
    const at = Math.min(writes.length + items.length - 1, outcomes.length - 1)
    const outcome = outcomes[at] ?? { kind: 'ok' as const }
    if (outcome.kind === 'throw') throw outcome.reason
    if (outcome.kind === 'reject') return Promise.reject(outcome.reason)
    return Promise.resolve()
  }
  const inner = {
    writeText(...args: readonly string[]): Promise<void> {
      argumentCounts.push(args.length)
      const first = args[0]
      // WHY: a call with no argument is a defect; the sentinel keeps it
      // from reading as a write of the empty string, which is a real case.
      writes.push(first === undefined ? NO_ARGUMENT : first)
      return settle()
    },
    write(...args: readonly (readonly HeldItem[])[]): Promise<void> {
      argumentCounts.push(args.length)
      items.push(args[0] ?? [])
      return settle()
    },
  }
  const systemClipboard = new Proxy(inner, {
    get(target, key, receiver): unknown {
      if (typeof key === 'string') touched.push(key)
      return Reflect.get(target, key, receiver) as unknown
    },
  })
  return { systemClipboard, writes, items, argumentCounts, touched }
}

const accepting = (): FakeSystemClipboard => fakeSystemClipboard([{ kind: 'ok' }])

// see FR-025
function onlyItem(fake: FakeSystemClipboard): HeldItem {
  expect(fake.items, 'the picture put no list on the board').toHaveLength(1)
  const list = fake.items[0] as readonly HeldItem[]
  expect(list, 'FR-025: one item and no second one').toHaveLength(1)
  return list[0] as HeldItem
}

// see FR-025
function pngOf(item: HeldItem): readonly unknown[] {
  const blob = item.held[PNG_TYPE]
  expect(blob, `the item carries no ${PNG_TYPE}`).toBeDefined()
  expect((blob as HeldBlob).type, `the blob states ${PNG_TYPE}`).toBe(PNG_TYPE)
  return (blob as HeldBlob).parts
}

function namedError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}

// WHY: what each means is not in docs/spec; these cases assert only that
// each becomes one of the three values (the mapping is PND-121, pinned below).
const EVERY_REFUSAL: readonly { readonly why: string; readonly reason: unknown }[] = [
  { why: 'the permission was refused', reason: namedError('NotAllowedError', 'Write permission denied.') },
  { why: 'the write was made outside a gesture', reason: namedError('NotAllowedError', 'Document is not focused.') },
  { why: 'the quota was exceeded', reason: namedError('QuotaExceededError', 'Clipboard quota exceeded.') },
  { why: 'the person cancelled', reason: namedError('AbortError', 'The operation was aborted.') },
  { why: 'a data error', reason: namedError('DataError', 'Unsupported data.') },
  { why: 'a plain Error with no platform name', reason: new Error('it did not finish') },
  { why: 'a string', reason: 'the clipboard is not available here' },
  { why: 'undefined', reason: undefined },
  { why: 'null', reason: null },
  { why: 'a number', reason: 0 },
  { why: 'an object that is not an Error', reason: { name: 'NotAllowedError' } },
  { why: 'an object with no name at all', reason: {} },
]

describe('the rosters these cases walk are the ones the tables state', () => {
  // WHY: a walk over an empty roster would pass without asserting anything.
  it("carries CHN-9's two payloads, the three faults, and both T-037 rows", () => {
    expect(T_008_R9.carries).toHaveLength(2)
    expect(CLIPBOARD_FAULTS).toHaveLength(3)
    expect(new Set(CLIPBOARD_FAULTS).size).toBe(3)
    expect(T_037_ROWS).toHaveLength(2)
    expect(EVERY_CONTENT).toHaveLength(BOUNDARY_PNGS.length + BOUNDARY_TEXTS.length)
    expect(BOUNDARY_PNGS.length).toBeGreaterThan(0)
    expect(EVERY_REFUSAL.length).toBeGreaterThan(0)
  })

  it("builds one content of every kind CHN-9 names, in the row's order", () => {
    const kinds = EVERY_CONTENT.map(({ content }) => content.kind)
    expect([...new Set(kinds)]).toEqual([...T_008_R9.carries])
  })
})

describe('PI-30 of table T-064 -- one implementation of Clipboard, and nothing else', () => {
  it('publishes the factory, and no second runtime name', () => {
    expect(Object.keys(browserClipboardModule).sort()).toEqual([...T_064_PI_30.runtimeNames].sort())
    expect(typeof browserClipboard).toBe('function')
  })

  it('takes the browser as its one argument (R7.3)', () => {
    expect(browserClipboard.length).toBe(1)
  })

  it('returns the seam IF-5 declares -- its one member and no other', () => {
    const clipboard: Clipboard = browserClipboard(accepting().systemClipboard)
    expect(Object.keys(clipboard)).toEqual([T_065_IF_5.member])
    expect(typeof clipboard.writeClipboardContent).toBe('function')
    expect(clipboard.writeClipboardContent.length).toBe(1)
  })

  it('resolves the seam through the declaring folder\'s public entry (Chapter 5.3, LR-2)', () => {
    // WHY: type-only check -- that these four names resolve through
    // clipboard-gateway.ts is the assertion itself.
    const seam: Clipboard | null = null
    const content: ClipboardContent | null = null
    const fault: ClipboardFault | null = null
    const writing: ClipboardWriting | null = null
    expect([seam, content, fault, writing]).toEqual([null, null, null, null])
    expect(T_065_IF_5.implementedBy).toBe(T_064_PI_30.component)
  })
})

describe('FR-033 -- the OS clipboard is written and never read', () => {
  it('publishes no name, and offers no member, that would read the clipboard', () => {
    const clipboard = browserClipboard(accepting().systemClipboard)
    const names = [...Object.keys(browserClipboardModule), ...Object.keys(clipboard)]
    for (const name of names) {
      expect(/read|paste|receive/i.test(name), `${T_024_IO_6.id}: ${name}`).toBe(false)
    }
    expect(T_024_IO_6.canRead).toBe(false)
    expect(T_024_IO_6.canWrite).toBe(true)
    expect(T_008_R9.isOutboundOnly).toBe(true)
  })

  it('touches `write` on the browser object for a picture, and nothing else on it', async () => {
    const fake = accepting()
    const clipboard = browserClipboard(fake.systemClipboard)
    await clipboard.writeClipboardContent(PICTURE)
    expect([...new Set(fake.touched)]).toEqual(['write'])
  })

  it('touches `writeText` on the browser object for a document, and nothing else on it', async () => {
    const fake = accepting()
    const clipboard = browserClipboard(fake.systemClipboard)
    await clipboard.writeClipboardContent(DOCUMENT)
    expect([...new Set(fake.touched)]).toEqual(['writeText'])
  })

  it('writes once per call -- one request, one write', async () => {
    const fake = accepting()
    const clipboard = browserClipboard(fake.systemClipboard)
    await clipboard.writeClipboardContent(PICTURE)
    expect(fake.items).toHaveLength(1)
    expect(fake.writes).toHaveLength(0)
    await clipboard.writeClipboardContent(DOCUMENT)
    expect(fake.writes).toHaveLength(1)
    expect(fake.items).toHaveLength(1)
    expect(fake.argumentCounts).toEqual([1, 1])
  })
})

describe('FR-025 (MUST) -- a picture goes as one image/png item and nothing beside it', () => {
  it('puts exactly one item on the board, carrying exactly one type', async () => {
    const fake = accepting()
    const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE)
    expect(writing).toEqual({ ok: true })
    const item = onlyItem(fake)
    expect(Object.keys(item.held)).toEqual([PNG_TYPE])
  })

  it('⛔ puts no text/plain and no image/svg+xml beside it (MUST NOT)', async () => {
    const fake = accepting()
    await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE)
    const item = onlyItem(fake)
    expect(Object.keys(item.held)).not.toContain('text/plain')
    expect(Object.keys(item.held)).not.toContain('image/svg+xml')
    expect(fake.writes, 'no characters were written anywhere').toEqual([])
  })

  it('sends the very bytes it was given -- nothing is made again here', async () => {
    for (const { why, content } of EVERY_CONTENT.filter((one) => one.content.kind === 'picture')) {
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      expect(writing, why).toEqual({ ok: true })
      expect(pngOf(onlyItem(fake)), why).toEqual([bytesOf(content)])
    }
  })

  it('answers `unsupported` when the browser cannot put an image on the board', async () => {
    // WHY: the picture arm needs three things of the host -- `write`, `Blob`
    // and `ClipboardItem` -- and any one of them missing is the same answer.
    const held = { Blob: HOST['Blob'], ClipboardItem: HOST['ClipboardItem'] }
    const bare = { writeText: (): Promise<void> => Promise.resolve() }
    expect(await browserClipboard(bare).writeClipboardContent(PICTURE)).toEqual({
      ok: false,
      fault: 'unsupported',
    })
    for (const missing of ['Blob', 'ClipboardItem']) {
      HOST[missing] = undefined
      const fake = accepting()
      expect(
        await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE),
        `the host has no ${missing}`,
      ).toEqual({ ok: false, fault: 'unsupported' })
      expect(fake.items, `the host has no ${missing}`).toEqual([])
      HOST[missing] = held[missing as 'Blob' | 'ClipboardItem']
    }
  })

  it('still writes the text kinds through `writeText`, which needs none of that', async () => {
    const bare = { writeText: (): Promise<void> => Promise.resolve() }
    expect(await browserClipboard(bare).writeClipboardContent(DOCUMENT)).toEqual({ ok: true })
  })
})

describe('LY-5 of table T-060 -- the browser is a parameter, so this runs without one', () => {
  it('has no DOM in this process, and writes anyway', async () => {
    const host = globalThis as { document?: unknown; navigator?: { clipboard?: unknown } }
    expect(host.document).toBeUndefined()
    expect(host.navigator?.clipboard).toBeUndefined()

    const fake = accepting()
    const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(DOCUMENT)
    expect(writing).toEqual({ ok: true })
    expect(fake.writes).toEqual([textOf(DOCUMENT)])
  })

  it('uses the object it was handed, and a second instance uses a second object', async () => {
    const first = accepting()
    const second = accepting()
    await browserClipboard(first.systemClipboard).writeClipboardContent(PICTURE)
    await browserClipboard(second.systemClipboard).writeClipboardContent(DOCUMENT)
    expect(pngOf(onlyItem(first))).toEqual([bytesOf(PICTURE)])
    expect(second.writes).toEqual([textOf(DOCUMENT)])
  })

  it('writes nothing while only being built -- the effect is in the member (UF-53)', () => {
    const fake = accepting()
    const clipboard = browserClipboard(fake.systemClipboard)
    expect(fake.writes).toEqual([])
    expect(fake.items).toEqual([])
    expect(clipboard).toBeTypeOf('object')
    expect(T_075_UF_53.purity).toBe('non-pure')
  })

  it('holds no state between calls -- each answer belongs to its own call', async () => {
    // WHY: NT-3a needs a notice to say what to do next about THIS item;
    // an instance that remembered an earlier refusal could not.
    const fake = fakeSystemClipboard([
      { kind: 'reject', reason: new Error('the first one did not finish') },
      { kind: 'ok' },
      { kind: 'reject', reason: new Error('the third one did not finish') },
    ])
    const clipboard = browserClipboard(fake.systemClipboard)
    const first = await clipboard.writeClipboardContent(PICTURE)
    const second = await clipboard.writeClipboardContent(DOCUMENT)
    const third = await clipboard.writeClipboardContent(PICTURE)
    expect(first.ok).toBe(false)
    expect(second).toEqual({ ok: true })
    expect(third.ok).toBe(false)
    expect(fake.items).toHaveLength(2)
    expect(fake.writes).toEqual([textOf(DOCUMENT)])
  })
})

describe('CHN-9 of table T-008 -- both payloads leave as they arrived', () => {
  it('hands every payload of both kinds to the browser (one case walks the row)', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      expect(writing, why).toEqual({ ok: true })
      if (content.kind === 'picture') {
        expect(pngOf(onlyItem(fake)), why).toEqual([bytesOf(content)])
        continue
      }
      expect(fake.writes, why).toHaveLength(1)
      expect(fake.writes[0], why).toBe(textOf(content))
    }
  })

  it('leaves the content it was handed as it found it', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const frozen = Object.freeze({ ...content }) as ClipboardContent
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(frozen)
      expect(writing, why).toEqual({ ok: true })
      expect(frozen, why).toEqual(content)
    }
  })

  it('refuses nothing of its own -- CHN-9 is send only, so FR-023 does not reach it', async () => {
    expect(T_008_R9.isValidatedIntake).toBe(false)
    // WHY: the empty string and the long one are the boundaries an
    // invented length rule would have caught; both must go out untouched.
    for (const boundary of ['', 'x'.repeat(200_000)]) {
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent({
        kind: 'document',
        text: boundary,
      })
      expect(writing, `length ${boundary.length}`).toEqual({ ok: true })
      expect(fake.writes[0], `length ${boundary.length}`).toBe(boundary)
    }
    // WHY: the picture arm counts bytes, so its boundaries are byte counts.
    for (const bytes of [new Uint8Array([]), new Uint8Array(200_000)]) {
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent({
        kind: 'picture',
        pngBytes: bytes,
      })
      expect(writing, `${bytes.length} bytes`).toEqual({ ok: true })
      expect(pngOf(onlyItem(fake)), `${bytes.length} bytes`).toEqual([bytes])
    }
  })

  it('answers a promise rather than acting into the dark', () => {
    const answer = browserClipboard(accepting().systemClipboard).writeClipboardContent(DOCUMENT)
    expect(typeof answer.then).toBe('function')
    return answer
  })
})

describe('CN-2 of table T-003 -- what the browser has to offer for each payload', () => {
  it('is served by `write` for a picture and `writeText` for a document, for every payload', async () => {
    expect([T_003_CN_2.baseline, T_003_CN_2.onlyChecked, T_003_CN_2.outOfScope]).toHaveLength(3)
    for (const { why, content } of EVERY_CONTENT) {
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      expect(writing, why).toEqual({ ok: true })
      expect([...new Set(fake.touched)], why).toEqual([
        content.kind === 'picture' ? 'write' : 'writeText',
      ])
    }
  })

  it('asks for no media type of the text arm -- the argument is the string itself', async () => {
    for (const { why, content } of EVERY_CONTENT.filter((one) => one.content.kind !== 'picture')) {
      const fake = accepting()
      await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      expect(fake.argumentCounts, why).toEqual([1])
      expect(typeof fake.writes[0], why).toBe('string')
      expect(fake.writes[0], why).toBe(textOf(content))
    }
  })

  it('names the media type of the picture arm exactly once, on the blob and on the item', async () => {
    for (const { why, content } of EVERY_CONTENT.filter((one) => one.content.kind === 'picture')) {
      const fake = accepting()
      await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      expect(fake.argumentCounts, why).toEqual([1])
      expect(Object.keys(onlyItem(fake).held), why).toEqual([PNG_TYPE])
    }
  })
})

describe('FR-028 -- the failure paths all come back as values', () => {
  it('answers `unsupported` when the browser has no clipboard to write to', async () => {
    // WHY: the signature takes navigator.clipboard, which is ABSENT
    // rather than empty when there is none.
    for (const { why, content } of EVERY_CONTENT) {
      const writing = await browserClipboard(undefined).writeClipboardContent(content)
      expect(writing, why).toEqual({ ok: false, fault: 'unsupported' })
    }
  })

  it('takes the absent clipboard at wiring time without complaint (CP-25)', () => {
    // WHY: the shell wires this once at start-up; if absence were an
    // error, it would fail during boot, where FR-028's value cannot help.
    const clipboard = browserClipboard(undefined)
    expect(Object.keys(clipboard)).toEqual([T_065_IF_5.member])
  })

  it('answers a value when the browser rejects, for every refusal', async () => {
    for (const { why, reason } of EVERY_REFUSAL) {
      const fake = fakeSystemClipboard([{ kind: 'reject', reason }])
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE)
      expect(writing.ok, why).toBe(false)
      if (writing.ok) continue
      expect(CLIPBOARD_FAULTS, why).toContain(writing.fault)
      expect(fake.items, why).toHaveLength(1)
    }
  })

  it('answers a value when the browser throws before it returns a promise', async () => {
    for (const { why, reason } of EVERY_REFUSAL) {
      const fake = fakeSystemClipboard([{ kind: 'throw', reason }])
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(DOCUMENT)
      expect(writing.ok, why).toBe(false)
      if (writing.ok) continue
      expect(CLIPBOARD_FAULTS, why).toContain(writing.fault)
      expect(fake.writes, why).toHaveLength(1)
    }
  })

  it('never throws and never rejects, for any payload and any refusal', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      for (const { why: whyRefusal, reason } of EVERY_REFUSAL) {
        const where = `${why} / ${whyRefusal}`
        const rejecting = browserClipboard(
          fakeSystemClipboard([{ kind: 'reject', reason }]).systemClipboard,
        ).writeClipboardContent(content)
        await expect(rejecting, where).resolves.toHaveProperty('ok', false)
        const throwing = browserClipboard(
          fakeSystemClipboard([{ kind: 'throw', reason }]).systemClipboard,
        ).writeClipboardContent(content)
        await expect(throwing, where).resolves.toHaveProperty('ok', false)
      }
    }
  })

  it('answers `{ ok: true }` and nothing more when the write finishes', async () => {
    const writing = await browserClipboard(accepting().systemClipboard).writeClipboardContent(PICTURE)
    expect(writing).toEqual({ ok: true })
    expect(Object.keys(writing)).toEqual(['ok'])
  })

  it("lets no message from the browser reach the caller", async () => {
    // WHY: FR-028's reason -- reading an exception's text would make the
    // kind of a failure implementation-dependent.
    const sentence = 'Write permission denied by the user agent.'
    const fake = fakeSystemClipboard([
      { kind: 'reject', reason: namedError('NotAllowedError', sentence) },
    ])
    const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE)
    expect(Object.keys(writing).sort()).toEqual(['fault', 'ok'])
    expect(JSON.stringify(writing)).not.toContain(sentence)
    expect(JSON.stringify(writing)).not.toContain('denied')
  })
})

describe('table T-037 -- the refusal carries what the notice needs', () => {
  it('holds every row of the fixed copy (one case walks both)', () => {
    for (const row of T_037_ROWS) {
      expect(row.holds(CLIPBOARD_FAULTS), `${row.id}: ${row.owes}`).toBe(true)
    }
  })

  it('names a classification and carries no prose of its own (NT-1)', async () => {
    for (const { why, reason } of EVERY_REFUSAL) {
      const fake = fakeSystemClipboard([{ kind: 'reject', reason }])
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(DOCUMENT)
      expect(writing.ok, why).toBe(false)
      if (writing.ok) continue
      // WHY: a classification, not a sentence -- the words belong to the
      // notice, composed in the display language (FR-038).
      expect(writing.fault, why).not.toContain(' ')
      expect(Object.keys(writing).sort(), why).toEqual(['fault', 'ok'])
    }
  })

  it('tells success and refusal apart by `ok` alone, never by an absence', async () => {
    const good = await browserClipboard(accepting().systemClipboard).writeClipboardContent(PICTURE)
    expect(good.ok).toBe(true)
    expect(good).not.toHaveProperty('fault')
    const bad = await browserClipboard(undefined).writeClipboardContent(PICTURE)
    expect(bad.ok).toBe(false)
    expect(bad).toHaveProperty('fault')
  })

  it('says WHICH item failed when one of several does (NT-1, NT-3a)', async () => {
    // WHY: NT-3a forbids a notice that only says something failed; the
    // notice can only name the item if each answer belongs to its own write.
    const fake = fakeSystemClipboard([
      { kind: 'ok' },
      { kind: 'reject', reason: namedError('QuotaExceededError', 'quota') },
      { kind: 'ok' },
    ])
    const clipboard = browserClipboard(fake.systemClipboard)
    const answers: ClipboardWriting[] = []
    for (const content of [DOCUMENT, PICTURE, DOCUMENT]) {
      answers.push(await clipboard.writeClipboardContent(content))
    }
    expect(answers.map((one) => one.ok)).toEqual([true, false, true])
    expect(fake.writes).toEqual([textOf(DOCUMENT), textOf(DOCUMENT)])
    expect(fake.items).toHaveLength(1)
  })

  it('gives the absent clipboard its own fault, so its next step differs', async () => {
    // WHY: "ask again" and "this browser has none" are different next
    // steps, which is why ClipboardFault keeps them apart at all.
    const absent = await browserClipboard(undefined).writeClipboardContent(PICTURE)
    const refused = await browserClipboard(
      fakeSystemClipboard([{ kind: 'reject', reason: namedError('NotAllowedError', 'no') }])
        .systemClipboard,
    ).writeClipboardContent(PICTURE)
    expect(absent).toEqual({ ok: false, fault: 'unsupported' })
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.fault).not.toBe('unsupported')
  })
})

const PD_121_MAPPING: readonly {
  readonly why: string
  readonly reason: unknown
  readonly fault: ClipboardFault
}[] = [
  {
    why: 'the permission was refused',
    reason: namedError('NotAllowedError', 'Write permission denied.'),
    fault: 'notPermitted',
  },
  {
    why: 'the write was made outside a gesture -- one and the same refusal',
    reason: namedError('NotAllowedError', 'Document is not focused.'),
    fault: 'notPermitted',
  },
  {
    why: 'the quota was exceeded',
    reason: namedError('QuotaExceededError', 'Clipboard quota exceeded.'),
    fault: 'writeFailed',
  },
  {
    why: 'the person cancelled',
    reason: namedError('AbortError', 'The operation was aborted.'),
    fault: 'writeFailed',
  },
  {
    why: 'a plain Error with no platform name',
    reason: new Error('it did not finish'),
    fault: 'writeFailed',
  },
  { why: 'a string, which is not an object at all', reason: 'no clipboard', fault: 'writeFailed' },
  { why: 'undefined', reason: undefined, fault: 'writeFailed' },
  { why: 'null', reason: null, fault: 'writeFailed' },
]

describe('PND-121 (provisional) -- NotAllowedError is the refusal read as notPermitted', () => {
  it('walks the whole mapping for a rejected promise', async () => {
    expect(PD_121_MAPPING.filter((one) => one.fault === 'notPermitted')).toHaveLength(2)
    for (const { why, reason, fault } of PD_121_MAPPING) {
      const fake = fakeSystemClipboard([{ kind: 'reject', reason }])
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE)
      expect(writing, why).toEqual({ ok: false, fault })
    }
  })

  it('reads a synchronous throw the same way -- both ends land in one catch', async () => {
    for (const { why, reason, fault } of PD_121_MAPPING) {
      const fake = fakeSystemClipboard([{ kind: 'throw', reason }])
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(DOCUMENT)
      expect(writing, why).toEqual({ ok: false, fault })
    }
  })

  it('never answers `unsupported` for a browser that was there and refused', async () => {
    // WHY: the clipboard existed and was called; unsupported is for a
    // browser that has none, which would send the notice down the wrong step.
    for (const { why, reason } of EVERY_REFUSAL) {
      const fake = fakeSystemClipboard([{ kind: 'reject', reason }])
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE)
      expect(writing, why).not.toEqual({ ok: false, fault: 'unsupported' })
      expect(fake.items, why).toHaveLength(1)
    }
  })
})
