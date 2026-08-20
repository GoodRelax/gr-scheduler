// Unit tests for UF-53 `browser-clipboard.ts` -- table T-075 of
// docs/spec/05-07-design.md (:302), component `BrowserClipboard` (CP-30 of
// table T-062, :119), published as PI-30 of table T-064 (:360). It is the one
// implementation of the seam `Clipboard` (IF-5 of table T-065, :382).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below; the seam this unit realises in full, because `clipboard.ts` (UF-46)
// is the declaration that fixes `Clipboard`, `ClipboardContent`,
// `ClipboardFault` and `ClipboardWriting`; and of the unit itself only its head
// comment and the one signature
// `browserClipboard(systemClipboard: { writeText(text: string): Promise<void> }
// | undefined): Clipboard`. No function body was read, and every expectation
// below comes from a requirement, a table, or the seam's own declaration --
// never from what the code happens to do.
//
// ⚠️ THE BROWSER IS A FAKE HERE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest
// runs under Node with no DOM, and LY-5 of table T-060 (:44) puts the browser
// in this layer while R7.3 asks for it to be injected. So every case drives the
// unit with an object of one method and then asserts WHAT THE UNIT DID TO IT --
// the call, its count, its one argument, and the fact that nothing else on it
// was ever touched -- not merely that a value came back.
//
// The rules these cases answer to:
//   table T-008 R-9   (:421) the clipboard is the far end of an OUTBOUND route
//                     and the row names exactly two things that leave by it,
//                     the picture and the document handed to an AI (FR-068), in
//                     that order. Send only, and expressly NOT subject to the
//                     checking -- so this unit invents no rule about the string
//   table T-024 IO-6  (:2834) write only. ⛔ The row says the current screen
//                     goes to another app AS AN IMAGE; the seam hands a picture
//                     over as an SVG string and no browser CN-2 admits takes
//                     SVG as a clipboard image. The gap is PD-120 and is
//                     declared in the unit's head comment; the cases below
//                     assert the string that the seam actually carries and
//                     claim nothing about an image
//   FR-033            (:1750) the OS clipboard MUST NOT be read; the sentence
//                     says only the read is forbidden and points at R-9 for the
//                     outbound route. So the seam has one member and no read
//                     side, and no name here may offer one
//   FR-068            (:3570) the document a person has read on the AI Export
//                     Modal is copied from here (CP-24 at :113 owns the
//                     control); it arrives as `kind: 'document'`
//   FR-025            (:3132, :3134) this route is inside its scope, what
//                     leaves is the SAME picture (FR-080), and FR-020's
//                     watermark question must be put on it because LM-8 reaches
//                     an outbound route. ⛔ NOT CHECKABLE HERE and deliberately
//                     not asserted: the picture arrives already made, so this
//                     unit cannot tell whether the size (S-81), the TaskGroup-
//                     wise clipping or the watermark choice were applied. What
//                     IS checkable is that nothing is made again here, and that
//                     is asserted
//   FR-028            (:3436) what came of a call is returned as a VALUE;
//                     throwing is forbidden (MUST NOT), and the reason given is
//                     that making a caller read an exception's text puts the
//                     kind of a failure at the mercy of the implementation. So
//                     every end -- absent API, rejection, synchronous throw --
//                     is asserted to be a value, and no message may travel in it
//   table T-037       (:3669) NT-1: a notice says WHICH item is wrong and why,
//                     in words. NT-3a (MUST): a failure notice carries what can
//                     be done next, and a notice that only says it failed is
//                     forbidden. Both are the notice's words to compose --
//                     FR-038 makes them depend on the display language -- so
//                     what this unit owes is a classification they can be
//                     composed from, told apart per call
//   table T-003 CN-2  (:154) Chromium is the baseline, Firefox is kept to a
//                     check, Safari is out of scope. The parameter offers
//                     `writeText` and nothing else; these cases assert that one
//                     method is the whole of what the browser is asked for
//   table T-060 LY-5  (:44) the Framework is the layer that holds current
//                     values, and LR-5 of table T-061 (:51, MUST) puts the
//                     implementation of an inner layer's interface out here
//   Chapter 5.3       (:370) the implementing layer may not reach past the
//                     declaring folder's public entry, so the seam's types are
//                     imported from `clipboard-gateway.ts` here as well (LR-2)
//   table T-075       (:302) UF-53 is `non-pure`
//
// ⚠️ ONE PROVISIONAL DECISION IS PINNED, AND MARKED AS SUCH. docs/spec fixes
// the three values of `ClipboardFault` and their meanings but nowhere says
// which browser signal is which (searched: the whole of docs/spec for
// `NotAllowedError`, `DOMException`, `QuotaExceeded` and `AbortError` -- no
// hit). The last describe block pins the recommended reading recorded as
// PD-121, per docs/development-rules/06-pending-decisions.md section 3, which
// asks for the test that falls when a provisional value is overturned to be
// written in advance. Every other block holds whatever that decision turns out
// to be.

import { describe, expect, it } from 'vitest'

import * as browserClipboardModule from '../../src/framework/browser-clipboard/browser-clipboard'
import { browserClipboard } from '../../src/framework/browser-clipboard/browser-clipboard'
// ⚠️ The DOM library declares a global `Clipboard` too, and `lib` in
// tsconfig.json admits it. Importing the seam's own name shadows it here,
// which is the same thing the unit under test has to do.
import type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
  ClipboardWriting,
} from '../../src/adapter/clipboard-gateway/clipboard-gateway'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by (Chapter 1.9, :275 --
// one test walks every row, rather than one test per row). Transcribed in
// ASCII and cited by row ID: the rule of a row stays with the row, and copying
// its prose here would put the same claim in two places (Chapter 1.9).
// ---------------------------------------------------------------------------

/**
 * Table T-008 row R-9 -- the route whose far end is the OS clipboard.
 * `carries` is the row's own order: the picture first, then the document
 * FR-068 hands to an AI.
 */
const T_008_R9 = {
  id: 'R-9',
  carries: ['picture', 'document'],
  /** The row's fifth column: write out. */
  isOutboundOnly: true,
  /** The row's last column: send only, so FR-023's checking does not reach it. */
  isValidatedIntake: false,
} as const

/** Table T-024 row IO-6 -- the direction this route has, and the one it lacks. */
const T_024_IO_6 = {
  id: 'IO-6',
  route: 'clipboard',
  canWrite: true,
  canRead: false,
} as const

/**
 * Table T-003 row CN-2 -- the browsers this specification is written for.
 * ⭐ Why a test cares: the parameter of `browserClipboard` offers `writeText`
 * and nothing else, and these three are the reason nothing more is needed.
 */
const T_003_CN_2 = {
  id: 'CN-2',
  baseline: 'Chromium',
  onlyChecked: 'Firefox',
  outOfScope: 'Safari',
} as const

/**
 * Table T-064 row PI-30 -- what leaves this component: one implementation of
 * `Clipboard`. `Clipboard` itself is a type and is gone by run time, so the
 * factory is the only runtime name.
 */
const T_064_PI_30 = {
  id: 'PI-30',
  layer: 'Framework',
  component: 'BrowserClipboard',
  runtimeNames: ['browserClipboard'],
} as const

/**
 * Table T-065 row IF-5. ⚠️ The member's name is not the table's -- T-065 names
 * the interface and what it supplies, and UF-46 decides the member.
 */
const T_065_IF_5 = {
  id: 'IF-5',
  seam: 'Clipboard',
  declaredBy: 'ClipboardGateway',
  implementedBy: 'BrowserClipboard',
  member: 'writeClipboardContent',
} as const

/** Table T-075 row UF-53 -- the unit's purity. */
const T_075_UF_53 = { id: 'UF-53', file: 'browser-clipboard.ts', purity: 'non-pure' } as const

/**
 * The whole of `ClipboardFault`, as `clipboard.ts` declares it. ⭐ Three
 * because NT-3a (MUST) makes a failure notice carry what can be done next, and
 * these three do not share a next step.
 */
const CLIPBOARD_FAULTS: readonly ClipboardFault[] = ['notPermitted', 'unsupported', 'writeFailed']

/**
 * The two rows of table T-037 that reach this unit. `holds` is what the unit
 * owes so that the notice side can obey the row; the wording itself is the
 * notice's, because FR-038 makes it depend on the display language.
 */
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

// ---------------------------------------------------------------------------
// The payloads.
//
// ⚠️ No cap: table T-220 (Chapter 6.1) holds no invariant for this route and
// `_assets/tbl-settings.md` no size for it, so a long payload is a case rather
// than a limit. R-9 is send only and expressly not subject to the checking, so
// nothing here expects a refusal on the ground of what the string is.
//
// ⚠️ No `null` payload and no empty-collection payload: neither variant of
// `ClipboardContent` admits `null` and the seam carries no collection at all.
// The empty string is the boundary that stands in their place, and the absent
// clipboard (`undefined`) is the one the parameter itself has.
// ---------------------------------------------------------------------------

/**
 * One payload of characters outside ASCII, written from its code points so
 * that the source file stays ASCII while the payload does not. U+65E5 U+7A0B
 * are two the app must carry, U+2014 U+00DC U+2713 three more from other
 * scripts. R-9 is send only and sets no rule about what a string may hold.
 */
const OUTSIDE_ASCII = String.fromCodePoint(0x65e5, 0x7a0b, 0x20, 0x2014, 0x20, 0xdc, 0x6e,
  0x69, 0x63, 0x6f, 0x64, 0x65, 0x20, 0x2713)

const BOUNDARY_TEXTS: readonly { readonly why: string; readonly text: string }[] = [
  { why: 'empty', text: '' },
  { why: 'one character', text: 'x' },
  {
    why: 'a picture as SvgRenderer would have made it (PI-19)',
    text: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect/></svg>',
  },
  // Built from code points above, so this file itself stays ASCII
  // (docs/development-rules/03-implementation.md, section 5).
  { why: 'text outside ASCII', text: OUTSIDE_ASCII },
  { why: 'a newline and a tab', text: 'a\r\nb\tc' },
  { why: 'a long payload -- no cap is set for this route', text: 'x'.repeat(200_000) },
]

/**
 * One case per payload of every kind R-9 names, kept in the row's order so a
 * walk over this roster is a walk over the row.
 */
const EVERY_CONTENT: readonly { readonly why: string; readonly content: ClipboardContent }[] = [
  ...BOUNDARY_TEXTS.map(({ why, text }) => ({
    why: `picture, ${why}`,
    content: { kind: 'picture', svg: text } as ClipboardContent,
  })),
  ...BOUNDARY_TEXTS.map(({ why, text }) => ({
    why: `document, ${why}`,
    content: { kind: 'document', text } as ClipboardContent,
  })),
]

const PICTURE: ClipboardContent = { kind: 'picture', svg: '<svg/>' }
const DOCUMENT: ClipboardContent = { kind: 'document', text: 'a document for an AI' }

/** The string each variant carries. Both variants of the seam hold one. */
const stringOf = (content: ClipboardContent): string =>
  content.kind === 'picture' ? content.svg : content.text

// ---------------------------------------------------------------------------
// The browser, as a fake. LY-5 puts the real one in this layer, and the
// signature makes it ARRIVE (R7.3) -- so one method is the whole of it.
// ---------------------------------------------------------------------------

/** Stands in for an argument that never arrived, so it cannot pass as `''`. */
const NO_ARGUMENT = '<no argument was passed>'

type Outcome =
  | { readonly kind: 'ok' }
  | { readonly kind: 'reject'; readonly reason: unknown }
  | { readonly kind: 'throw'; readonly reason: unknown }

interface FakeSystemClipboard {
  /** What is handed to `browserClipboard`. */
  readonly systemClipboard: { writeText(text: string): Promise<void> }
  /** Every string `writeText` was called with, in order. */
  readonly writes: string[]
  /** How many arguments each call carried. */
  readonly argumentCounts: number[]
  /** Every property of the object the unit read, in order. */
  readonly touched: string[]
}

/**
 * A system clipboard that answers by a script: outcome `n` for call `n`, the
 * last one repeating. It records what was written, how it was called, and
 * every property of itself that was ever read.
 */
function fakeSystemClipboard(outcomes: readonly Outcome[]): FakeSystemClipboard {
  const writes: string[] = []
  const argumentCounts: number[] = []
  const touched: string[] = []
  const inner = {
    writeText(...args: readonly string[]): Promise<void> {
      argumentCounts.push(args.length)
      const first = args[0]
      // A call carrying no argument at all is a defect, and the sentinel keeps
      // it from reading as a write of the empty string, which is a real case.
      writes.push(first === undefined ? NO_ARGUMENT : first)
      const at = Math.min(writes.length - 1, outcomes.length - 1)
      const outcome = outcomes[at] ?? { kind: 'ok' as const }
      if (outcome.kind === 'throw') throw outcome.reason
      if (outcome.kind === 'reject') return Promise.reject(outcome.reason)
      return Promise.resolve()
    },
  }
  const systemClipboard = new Proxy(inner, {
    get(target, key, receiver): unknown {
      if (typeof key === 'string') touched.push(key)
      return Reflect.get(target, key, receiver) as unknown
    },
  })
  return { systemClipboard, writes, argumentCounts, touched }
}

const accepting = (): FakeSystemClipboard => fakeSystemClipboard([{ kind: 'ok' }])

/** An error carrying a platform name, the way a browser refuses. */
function namedError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}

/**
 * Every shape a browser -- or a host standing in for one -- might refuse with.
 * ⛔ What each MEANS is not in docs/spec; these cases assert only that each
 * becomes one of the three values. The mapping itself is PD-121, pinned in the
 * last block alone.
 */
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

// ---------------------------------------------------------------------------
// The rosters themselves, before anything walks them
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  // ⛔ A walk over an empty roster passes without asserting anything. These
  // pin the counts so a vacuous case cannot go green.
  it("carries R-9's two payloads, the three faults, and both T-037 rows", () => {
    expect(T_008_R9.carries).toHaveLength(2)
    expect(CLIPBOARD_FAULTS).toHaveLength(3)
    expect(new Set(CLIPBOARD_FAULTS).size).toBe(3)
    expect(T_037_ROWS).toHaveLength(2)
    expect(EVERY_CONTENT).toHaveLength(BOUNDARY_TEXTS.length * T_008_R9.carries.length)
    expect(EVERY_REFUSAL.length).toBeGreaterThan(0)
  })

  it("builds one content of every kind R-9 names, in the row's order", () => {
    const kinds = EVERY_CONTENT.map(({ content }) => content.kind)
    expect([...new Set(kinds)]).toEqual([...T_008_R9.carries])
  })
})

// ---------------------------------------------------------------------------
// PI-30 of table T-064, IF-5 of table T-065, and Chapter 5.3 -- what leaves
// ---------------------------------------------------------------------------

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
    // Type-only: the four names below are imported from `clipboard-gateway.ts`
    // at the head of this file, which is the entry Chapter 5.3 makes the only
    // way in. That they resolve there is the assertion.
    const seam: Clipboard | null = null
    const content: ClipboardContent | null = null
    const fault: ClipboardFault | null = null
    const writing: ClipboardWriting | null = null
    expect([seam, content, fault, writing]).toEqual([null, null, null, null])
    expect(T_065_IF_5.implementedBy).toBe(T_064_PI_30.component)
  })
})

// ---------------------------------------------------------------------------
// FR-033 (MUST NOT) and IO-6 -- one way out, and no way back in
// ---------------------------------------------------------------------------

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

  it('touches `writeText` on the browser object and nothing else on it', async () => {
    const fake = accepting()
    const clipboard = browserClipboard(fake.systemClipboard)
    await clipboard.writeClipboardContent(PICTURE)
    expect([...new Set(fake.touched)]).toEqual(['writeText'])
  })

  it('writes once per call -- one request, one write', async () => {
    const fake = accepting()
    const clipboard = browserClipboard(fake.systemClipboard)
    await clipboard.writeClipboardContent(PICTURE)
    expect(fake.writes).toHaveLength(1)
    await clipboard.writeClipboardContent(DOCUMENT)
    expect(fake.writes).toHaveLength(2)
    expect(fake.argumentCounts).toEqual([1, 1])
  })
})

// ---------------------------------------------------------------------------
// LY-5 of table T-060 and R7.3 -- the browser ARRIVES; it is never reached for
// ---------------------------------------------------------------------------

describe('LY-5 of table T-060 -- the browser is a parameter, so this runs without one', () => {
  it('has no DOM in this process, and writes anyway', async () => {
    const host = globalThis as { document?: unknown; navigator?: { clipboard?: unknown } }
    expect(host.document).toBeUndefined()
    expect(host.navigator?.clipboard).toBeUndefined()

    const fake = accepting()
    const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(DOCUMENT)
    expect(writing).toEqual({ ok: true })
    expect(fake.writes).toEqual([stringOf(DOCUMENT)])
  })

  it('uses the object it was handed, and a second instance uses a second object', async () => {
    const first = accepting()
    const second = accepting()
    await browserClipboard(first.systemClipboard).writeClipboardContent(PICTURE)
    await browserClipboard(second.systemClipboard).writeClipboardContent(DOCUMENT)
    expect(first.writes).toEqual([stringOf(PICTURE)])
    expect(second.writes).toEqual([stringOf(DOCUMENT)])
  })

  it('writes nothing while only being built -- the effect is in the member (UF-53)', () => {
    const fake = accepting()
    const clipboard = browserClipboard(fake.systemClipboard)
    expect(fake.writes).toEqual([])
    expect(clipboard).toBeTypeOf('object')
    expect(T_075_UF_53.purity).toBe('non-pure')
  })

  it('holds no state between calls -- each answer belongs to its own call', async () => {
    // ⭐ NT-3a needs a notice to say what to do next about THIS item; an
    // instance that remembered an earlier refusal could not.
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
    expect(fake.writes).toEqual([stringOf(PICTURE), stringOf(DOCUMENT), stringOf(PICTURE)])
  })
})

// ---------------------------------------------------------------------------
// R-9 of table T-008, IO-6 of table T-024, FR-025 -- what goes out, unchanged
// ---------------------------------------------------------------------------

describe("R-9 of table T-008 -- both payloads leave as the string they arrived as", () => {
  it('hands every payload of both kinds to the browser (one case walks the row)', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      expect(writing, why).toEqual({ ok: true })
      expect(fake.writes, why).toHaveLength(1)
      expect(fake.writes[0], why).toBe(stringOf(content))
    }
  })

  it('sends the picture it was given -- nothing is made again here (FR-025)', async () => {
    for (const { why, content } of EVERY_CONTENT.filter((one) => one.content.kind === 'picture')) {
      const fake = accepting()
      await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      // ⛔ Not a re-rendering, not a re-serialization: the same characters.
      expect(fake.writes[0], why).toBe(stringOf(content))
      expect(fake.writes[0]?.length, why).toBe(stringOf(content).length)
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

  it('refuses nothing of its own -- R-9 is send only, so FR-023 does not reach it', async () => {
    expect(T_008_R9.isValidatedIntake).toBe(false)
    // ⛔ The empty string and the long one are the boundaries an invented
    // length rule would have caught; both must go out untouched.
    for (const boundary of ['', 'x'.repeat(200_000)]) {
      const fake = accepting()
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent({
        kind: 'document',
        text: boundary,
      })
      expect(writing, `length ${boundary.length}`).toEqual({ ok: true })
      expect(fake.writes[0], `length ${boundary.length}`).toBe(boundary)
    }
  })

  it('answers a promise rather than acting into the dark', () => {
    const answer = browserClipboard(accepting().systemClipboard).writeClipboardContent(DOCUMENT)
    expect(typeof answer.then).toBe('function')
    return answer
  })
})

// ---------------------------------------------------------------------------
// CN-2 of table T-003 -- one method is the whole of what the browser is asked
// ---------------------------------------------------------------------------

describe('CN-2 of table T-003 -- writeText is all the browser has to offer', () => {
  it('is served by an object of one method, for every payload of both kinds', async () => {
    expect([T_003_CN_2.baseline, T_003_CN_2.onlyChecked, T_003_CN_2.outOfScope]).toHaveLength(3)
    for (const { why, content } of EVERY_CONTENT) {
      // ⭐ No `write`, no `ClipboardItem`, no `Blob`: none of the browsers
      // CN-2 admits takes SVG as a clipboard image, so a path needing them
      // would be dead code on every one of them (R2.9). The object below has
      // nothing but `writeText` and must be enough.
      const bare = { writeText: (): Promise<void> => Promise.resolve() }
      const writing = await browserClipboard(bare).writeClipboardContent(content)
      expect(writing, why).toEqual({ ok: true })
    }
  })

  it('asks for no media type -- the argument is the string itself', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const fake = accepting()
      await browserClipboard(fake.systemClipboard).writeClipboardContent(content)
      expect(fake.argumentCounts, why).toEqual([1])
      expect(typeof fake.writes[0], why).toBe('string')
      expect(fake.writes[0], why).toBe(stringOf(content))
    }
  })
})

// ---------------------------------------------------------------------------
// FR-028 -- every end is a value; nothing is thrown (MUST NOT)
// ---------------------------------------------------------------------------

describe('FR-028 -- the failure paths all come back as values', () => {
  it('answers `unsupported` when the browser has no clipboard to write to', async () => {
    // The seam's own words for this value: "This browser, or this way of
    // opening the app, has no clipboard to write to." The signature says to
    // pass `navigator.clipboard`, which is ABSENT rather than empty there.
    for (const { why, content } of EVERY_CONTENT) {
      const writing = await browserClipboard(undefined).writeClipboardContent(content)
      expect(writing, why).toEqual({ ok: false, fault: 'unsupported' })
    }
  })

  it('takes the absent clipboard at wiring time without complaint (CP-25)', () => {
    // ⛔ The shell wires this once at start-up. If the absence were an error,
    // it would be one during boot, where FR-028's value cannot help anybody.
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
      expect(fake.writes, why).toHaveLength(1)
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
    // ⛔ FR-028's reason: reading an exception's text makes the kind of a
    // failure implementation-dependent. So the browser's own sentence may not
    // travel with the value.
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

// ---------------------------------------------------------------------------
// NT-1 and NT-3a of table T-037 -- what a notice can be composed from
// ---------------------------------------------------------------------------

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
      // ⭐ A classification, not a sentence: the words belong to the notice,
      // which composes them in the display language (FR-038).
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
    // ⛔ NT-3a forbids a notice that says only that something failed. The
    // notice side can only name the item if the answer to each write belongs
    // to that write.
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
    expect(fake.writes).toEqual([stringOf(DOCUMENT), stringOf(PICTURE), stringOf(DOCUMENT)])
  })

  it('gives the absent clipboard its own fault, so its next step differs', async () => {
    // ⭐ NT-3a: "ask for it again" and "this browser has none" are different
    // next steps, which is why `ClipboardFault` keeps them apart at all.
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

// ---------------------------------------------------------------------------
// PD-121 -- WHICH browser signal is read as which fault. PROVISIONAL.
//
// ⛔ docs/spec fixes the three values and their meanings and says nothing about
// the signals: searched the whole of docs/spec for `NotAllowedError`,
// `DOMException`, `QuotaExceeded` and `AbortError`, with no hit, and neither
// FR-028 nor NT-3a nor IF-5 names one. The recommendation recorded as PD-121 is
// pinned here alone -- rule 06 section 3 asks for the test that falls when a
// provisional value is overturned to be written in advance, and this is it.
// ⚠️ If the decision is overturned, THIS BLOCK is what to change; nothing above
// depends on the mapping.
// ---------------------------------------------------------------------------

/**
 * The recommendation: only a refusal naming itself `NotAllowedError` is read as
 * `notPermitted`, because `clipboard.ts` records that a browser reports a
 * denied permission and a write outside a gesture as one and the same refusal,
 * and that one refusal is the one that carries this name. Everything else
 * claims less.
 */
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

describe('PD-121 (provisional) -- NotAllowedError is the refusal read as notPermitted', () => {
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
    // ⭐ The clipboard existed and was called; `unsupported` is the value for
    // the browser that has none, and reporting it here would send the notice
    // down the wrong next step (NT-3a).
    for (const { why, reason } of EVERY_REFUSAL) {
      const fake = fakeSystemClipboard([{ kind: 'reject', reason }])
      const writing = await browserClipboard(fake.systemClipboard).writeClipboardContent(PICTURE)
      expect(writing, why).not.toEqual({ ok: false, fault: 'unsupported' })
      expect(fake.writes, why).toHaveLength(1)
    }
  })
})
