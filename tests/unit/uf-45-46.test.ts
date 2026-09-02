// Unit tests for UF-45 `clipboard-gateway.ts` (the public entry) and UF-46
// `clipboard.ts` (the declaration of the seam `Clipboard`) -- table T-075 of
// docs/spec/05-07-design.md, component `ClipboardGateway` (CP-24 of table
// T-062), published as PI-24 of table T-064.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNITS' BODIES (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule below,
// docs/spec/_source/components.json for this component's two inbound edges,
// and of the units themselves only their head comments, the four published
// types (`Clipboard`, `ClipboardContent`, `ClipboardFault`, `ClipboardWriting`)
// and the one signature `writeClipboard(clipboard, content)`. Every
// expectation below comes from a requirement or a table, never from the code.
//
// The rules these cases answer to:
//   table T-008 R-9   the clipboard is the far end of an outbound route, and
//                     the row names exactly two things that leave by it -- the
//                     picture and the document handed to an AI (FR-068), in
//                     that order. The row also records that the route is send
//                     only, so it is NOT one of the intakes FR-023 validates
//   table T-024 IO-6  write only; the current screen as a picture, for pasting
//                     without going through a download
//   FR-033            the buffer a duplication uses is the app's own, and the
//                     OS clipboard MUST NOT be read -- only writing is allowed
//   FR-068            the document a person checked on screen is copied to the
//                     clipboard from here (design :113 puts it on CP-24)
//   FR-025            this route is inside its scope and what leaves is the
//                     SAME picture (FR-080) -- so nothing is made again here
//   FR-028            what came of a call is returned as a value; throwing is
//                     forbidden (MUST NOT), and its reason forbids making a
//                     caller read an exception's text. Table T-035 AG-8 is the
//                     house form this route follows, since the clipboard is
//                     itself absent from the `Agent API` members
//                     (`_assets/tbl-glossary.md` section 6, the note under T-107)
//   table T-037       NT-1: a notice says WHICH item is wrong and why, in
//                     words. NT-3a: a failure notice carries what can be done
//                     next (MUST). Both are the notice's words to compose --
//                     FR-038 makes them language-dependent -- so what this
//                     unit owes is a classification they can be composed from
//   table T-065 IF-5  the seam `Clipboard`, declared by this component and
//                     implemented in another layer (LR-5)
//   Chapter 5.3       the declaration sits in its own file and the public
//                     entry re-exports it (MUST); nothing outside the folder
//                     reads any other file in it (MUST NOT)
//   table T-064 PI-24 the whole of what this component publishes
//
// ⛔ NOT CHECKABLE ON THE GATEWAY ITSELF, and deliberately not asserted of it:
// the output size (S-81 of table T-204), the height ceiling (S-217), and
// whether FR-020's watermark question was put to the person on this route --
// FR-025 requires all three, and LM-8 is why the last one reaches an outbound
// route. They belong where the picture is made; this unit is handed a finished
// string and cannot tell whether any of them were applied.
//
// ⭐ SECOND PASS (CR-196). The first two of those three ARE checkable now, one
// step upstream: PI-21 publishes `exportSvg`, and the manuscript's picture edge
// for this component was corrected from SvgRenderer to ImageExporter. The last
// block of this file therefore assembles a picture through PI-21's own entry
// and sends THAT down the route, so that "the picture that comes out is the
// same" (FR-025) is judged rather than assumed. ⚠️ The watermark question
// stays unreachable from here for the reason above.
//
// ⭐⭐ THIRD PASS (CR-337, 2026-09-02). FR-025 (MUST) now refuses to write a
// picture that will not fit under S-217 -- 「伸ばしても `S-217` に収まらない
// ときは、画像を書き出さないこと（MUST）。一部だけを描いてはならない
// （MUST NOT）」 -- and 「止めるのは 表 T-024 の `IO-3`（SVG）・`IO-4`（PNG）・
// `IO-6`（クリップボード）である」 puts THIS route inside that MUST. The last
// case of this file is where IO-6 answers for it.

import { describe, expect, it } from 'vitest'

import * as clipboardGateway from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import {
  writeClipboard,
  type Clipboard,
  type ClipboardContent,
  type ClipboardFault,
  type ClipboardWriting,
} from '../../src/adapter/clipboard-gateway/clipboard-gateway'
// ⭐ PI-21, reached through its public entry only (Chapter 5.3). CR-196 moved
// the manuscript's picture edge for this component from SvgRenderer to
// ImageExporter, so the picture IO-6 carries is the one PI-21 assembles.
import {
  exportPng,
  exportSvg,
  type ExportScene,
  type Rasterizer,
} from '../../src/adapter/image-exporter/image-exporter'
import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by (Chapter 1.9, :275).
// Transcribed in ASCII and cited by row ID: the rule of a row stays with the
// row, and copying its prose here would put the same claim in two places.
// ---------------------------------------------------------------------------

/**
 * Table T-008 row R-9 -- the route whose far end is the OS clipboard.
 * `carries` is the row's own order: the picture first, then the document
 * FR-068 hands to an AI.
 */
const T_008_R9 = {
  id: 'R-9',
  from: 'D-1',
  to: 'the OS clipboard',
  carries: ['picture', 'document'],
  isOutboundOnly: true,
  /** The row's last column: send only, so FR-023's validation does not reach it. */
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
 * Table T-064 row PI-24 -- what leaves this component. `Clipboard` is a type
 * and is gone by run time, so only the function is a runtime name.
 */
const T_064_PI_24 = {
  id: 'PI-24',
  component: 'ClipboardGateway',
  published: ['Clipboard', 'writeClipboard'],
  runtimeNames: ['writeClipboard'],
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

/**
 * The whole of `ClipboardFault`. ⭐ Three because NT-3a (MUST) makes a failure
 * notice carry what can be done next, and these three do not share a next
 * step.
 */
const CLIPBOARD_FAULTS: readonly ClipboardFault[] = [
  'notPermitted',
  'unsupported',
  'writeFailed',
]

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
    owes: 'the refusal says which of the three happened, so words can name it',
    holds: (faults) => faults.every((fault) => /^[a-z][A-Za-z]*$/.test(fault)),
  },
  {
    id: 'NT-3a',
    owes: 'the three are told apart, so each can carry a different next step',
    holds: (faults) => new Set(faults).size === faults.length,
  },
]

// ---------------------------------------------------------------------------
// The payloads. ⚠️ No cap: table T-220 (Chapter 6.1) holds no invariant for
// this route and `_assets/tbl-settings.md` no size for it, so a long payload
// is a case rather than a limit.
//
// ⚠️ No `null` case and no empty-collection case: neither variant of
// `ClipboardContent` admits `null`, and the unit carries no collection at all.
// The empty string below is the boundary that stands in their place.
// ---------------------------------------------------------------------------

const BOUNDARY_TEXTS: readonly { readonly why: string; readonly text: string }[] = [
  { why: 'empty', text: '' },
  { why: 'one character', text: 'x' },
  {
    why: 'a picture as SvgRenderer would have made it (PI-19)',
    text: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>',
  },
  // Escaped rather than written out, so this file stays ASCII while the
  // payload does not (docs/development-rules/03-implementation.md, section 5).
  { why: 'text outside ASCII', text: '\u65e5\u7a0b \u2014 \u00dcnicode \u2713' },
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

const stringOf = (content: ClipboardContent): string =>
  content.kind === 'picture' ? content.svg : content.text

// ---------------------------------------------------------------------------
// The far side of IF-5, as a value. LR-5 puts the real one in another layer,
// so these stand in for it.
// ---------------------------------------------------------------------------

interface Recording {
  readonly clipboard: Clipboard
  readonly received: ClipboardContent[]
}

/** A seam that answers, and remembers what it was asked to write. */
function answeringClipboard(answer: ClipboardWriting): Recording {
  const received: ClipboardContent[] = []
  return {
    received,
    clipboard: {
      writeClipboardContent: (content: ClipboardContent): Promise<ClipboardWriting> => {
        received.push(content)
        return Promise.resolve(answer)
      },
    },
  }
}

/**
 * A seam whose promise rejects. ⛔ The seam's own contract says it must not,
 * but LR-5 puts the implementation in another layer, so FR-028's guarantee
 * cannot rest on that promise being kept.
 */
function rejectingClipboard(reason: unknown): Clipboard {
  return {
    writeClipboardContent: (): Promise<ClipboardWriting> => Promise.reject(reason),
  }
}

/** A seam that throws before it ever returns a promise. */
function throwingClipboard(reason: unknown): Clipboard {
  return {
    writeClipboardContent: (): Promise<ClipboardWriting> => {
      throw reason
    },
  }
}

/** A seam that records every one of its own properties the caller touched. */
function watchedClipboard(answer: ClipboardWriting): {
  readonly clipboard: Clipboard
  readonly touched: string[]
} {
  const touched: string[] = []
  const inner: Clipboard = {
    writeClipboardContent: (): Promise<ClipboardWriting> => Promise.resolve(answer),
  }
  const clipboard = new Proxy(inner, {
    get(target, key, receiver): unknown {
      if (typeof key === 'string') touched.push(key)
      return Reflect.get(target, key, receiver) as unknown
    },
  })
  return { clipboard, touched }
}

/** Every reason a seam in another layer might reject or throw with. */
const EVERY_REASON: readonly { readonly why: string; readonly reason: unknown }[] = [
  { why: 'an Error', reason: new Error('NotAllowedError: write permission denied') },
  { why: 'a string', reason: 'the clipboard is not available here' },
  { why: 'undefined', reason: undefined },
  { why: 'null', reason: null },
  { why: 'an object that is not an Error', reason: { name: 'NotAllowedError' } },
]

// ---------------------------------------------------------------------------
// The rosters themselves, before anything walks them
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  // ⛔ A walk over an empty roster passes without asserting anything. These
  // pin the counts so a vacuous case cannot go green.
  it('carries R-9\'s two payloads, the three faults, and both T-037 rows', () => {
    expect(T_008_R9.carries).toHaveLength(2)
    expect(CLIPBOARD_FAULTS).toHaveLength(3)
    expect(new Set(CLIPBOARD_FAULTS).size).toBe(3)
    expect(T_037_ROWS).toHaveLength(2)
    expect(EVERY_CONTENT).toHaveLength(BOUNDARY_TEXTS.length * T_008_R9.carries.length)
    expect(EVERY_REASON.length).toBeGreaterThan(0)
  })

  it('builds one content of every kind R-9 names, in the row\'s order', () => {
    const kinds = EVERY_CONTENT.map(({ content }) => content.kind)
    expect([...new Set(kinds)]).toEqual([...T_008_R9.carries])
  })
})

// ---------------------------------------------------------------------------
// PI-24 of table T-064, and Chapter 5.3 -- what leaves the folder
// ---------------------------------------------------------------------------

describe('PI-24 of table T-064 -- the whole of what ClipboardGateway publishes', () => {
  it('publishes `writeClipboard`, and no second runtime member', () => {
    expect(Object.keys(clipboardGateway).sort()).toEqual([...T_064_PI_24.runtimeNames].sort())
    expect(typeof writeClipboard).toBe('function')
  })

  it('re-exports the seam declared in this folder (Chapter 5.3, MUST)', () => {
    // Type-only: T-065 IF-5 names the interface, and Chapter 5.3 forbids the
    // implementing layer to reach past this file for it. That these four names
    // resolve through the public entry is the assertion.
    const seam: Clipboard | null = null
    const content: ClipboardContent | null = null
    const fault: ClipboardFault | null = null
    const writing: ClipboardWriting | null = null
    expect([seam, content, fault, writing]).toEqual([null, null, null, null])
  })

  it('takes the seam first and the content second', () => {
    expect(writeClipboard.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// FR-033 (MUST NOT) and IO-6 -- one way out, and no way back in
// ---------------------------------------------------------------------------

describe('FR-033 -- the OS clipboard is written and never read', () => {
  it('publishes no member that would read the clipboard', () => {
    for (const name of Object.keys(clipboardGateway)) {
      expect(/read|paste|receive/i.test(name), `${T_024_IO_6.id}: ${name}`).toBe(false)
    }
    expect(T_024_IO_6.canRead).toBe(false)
    expect(T_008_R9.isOutboundOnly).toBe(true)
  })

  it('touches the one member of the seam and nothing else on it', async () => {
    const { clipboard, touched } = watchedClipboard({ ok: true })
    await writeClipboard(clipboard, PICTURE)
    expect(touched).toEqual([T_065_IF_5.member])
  })

  it('asks the seam once per call -- one request, one write', async () => {
    const { clipboard, received } = answeringClipboard({ ok: true })
    await writeClipboard(clipboard, PICTURE)
    expect(received).toHaveLength(1)
    await writeClipboard(clipboard, DOCUMENT)
    expect(received).toHaveLength(2)
  })

  it('refuses nothing of its own -- R-9 is send only, so FR-023 does not reach it', async () => {
    expect(T_008_R9.isValidatedIntake).toBe(false)
    for (const { why, content } of EVERY_CONTENT) {
      const { clipboard, received } = answeringClipboard({ ok: true })
      const writing = await writeClipboard(clipboard, content)
      expect(received, why).toHaveLength(1)
      expect(writing, why).toEqual({ ok: true })
    }
  })
})

// ---------------------------------------------------------------------------
// R-9 of table T-008 and IO-6 of table T-024 -- what goes out, unchanged
// ---------------------------------------------------------------------------

describe('R-9 of table T-008 -- both payloads leave, exactly as they arrived', () => {
  it('hands every payload of both kinds to the seam (one case walks the row)', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const { clipboard, received } = answeringClipboard({ ok: true })
      await writeClipboard(clipboard, content)
      expect(received[0], why).toEqual(content)
      expect(received[0], why).toBe(content)
    }
  })

  it('sends the same picture it was given -- nothing is made again here (FR-025)', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const { clipboard, received } = answeringClipboard({ ok: true })
      await writeClipboard(clipboard, content)
      const sent = received[0]
      expect(sent?.kind, why).toBe(content.kind)
      expect(sent === undefined ? '' : stringOf(sent), why).toBe(stringOf(content))
    }
  })

  it('leaves the content it was handed as it found it', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const frozen = Object.freeze({ ...content }) as ClipboardContent
      const { clipboard } = answeringClipboard({ ok: true })
      await expect(writeClipboard(clipboard, frozen), why).resolves.toEqual({ ok: true })
      expect(frozen, why).toEqual(content)
    }
  })

  it('answers a promise rather than acting into the dark', () => {
    const { clipboard } = answeringClipboard({ ok: true })
    const answer = writeClipboard(clipboard, DOCUMENT)
    expect(typeof answer.then).toBe('function')
    return answer
  })
})

// ---------------------------------------------------------------------------
// FR-028 -- what came of the call is a value; nothing is thrown (MUST NOT)
// ---------------------------------------------------------------------------

describe('FR-028 -- a refusal is a value, and this entry never throws', () => {
  it('gives back the seam\'s success as it stands', async () => {
    const { clipboard } = answeringClipboard({ ok: true })
    const writing = await writeClipboard(clipboard, PICTURE)
    expect(writing).toEqual({ ok: true })
    expect(Object.keys(writing)).toEqual(['ok'])
  })

  it('gives back each fault the seam names, unchanged (one case walks the three)', async () => {
    for (const fault of CLIPBOARD_FAULTS) {
      const { clipboard } = answeringClipboard({ ok: false, fault })
      const writing = await writeClipboard(clipboard, PICTURE)
      expect(writing, fault).toEqual({ ok: false, fault })
    }
  })

  it('resolves a value when the seam\'s promise rejects, for every reason', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const writing = await writeClipboard(rejectingClipboard(reason), PICTURE)
      expect(writing, why).toEqual({ ok: false, fault: 'writeFailed' })
    }
  })

  it('resolves a value when the seam throws before it returns a promise', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const writing = await writeClipboard(throwingClipboard(reason), DOCUMENT)
      expect(writing, why).toEqual({ ok: false, fault: 'writeFailed' })
    }
  })

  it('never throws and never rejects, for any payload and any reason', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      for (const { why: whyReason, reason } of EVERY_REASON) {
        const where = `${why} / ${whyReason}`
        const rejected = writeClipboard(rejectingClipboard(reason), content)
        await expect(rejected, where).resolves.toHaveProperty('ok', false)
        const thrown = writeClipboard(throwingClipboard(reason), content)
        await expect(thrown, where).resolves.toHaveProperty('ok', false)
      }
    }
  })

  it('lets no message from the far side reach the caller', async () => {
    // ⛔ FR-028's reason: reading an exception's text makes the kind of a
    // failure implementation-dependent. So the browser's own sentence may not
    // travel with the value.
    const sentence = 'NotAllowedError: Write permission denied.'
    const writing = await writeClipboard(rejectingClipboard(new Error(sentence)), PICTURE)
    expect(Object.keys(writing).sort()).toEqual(['fault', 'ok'])
    expect(JSON.stringify(writing)).not.toContain('NotAllowed')
    expect(JSON.stringify(writing)).not.toContain(sentence)
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

  it('names which refusal happened, and carries no prose of its own (NT-1)', async () => {
    for (const fault of CLIPBOARD_FAULTS) {
      const { clipboard } = answeringClipboard({ ok: false, fault })
      const writing = await writeClipboard(clipboard, DOCUMENT)
      expect(writing.ok, fault).toBe(false)
      if (writing.ok) continue
      expect(writing.fault, fault).toBe(fault)
      // ⭐ A classification, not a sentence: the words belong to the notice,
      // which composes them in the display language (FR-038).
      expect(writing.fault, fault).not.toContain(' ')
      expect(Object.keys(writing).sort(), fault).toEqual(['fault', 'ok'])
    }
  })

  it('tells success and refusal apart by `ok` alone, never by an absence', async () => {
    const good = await writeClipboard(answeringClipboard({ ok: true }).clipboard, PICTURE)
    expect(good.ok).toBe(true)
    expect(good).not.toHaveProperty('fault')
    for (const fault of CLIPBOARD_FAULTS) {
      const bad = await writeClipboard(answeringClipboard({ ok: false, fault }).clipboard, PICTURE)
      expect(bad.ok, fault).toBe(false)
      expect(bad, fault).toHaveProperty('fault')
    }
  })

  it('reports a rejection as one of the three, so a next step exists (NT-3a)', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const writing = await writeClipboard(rejectingClipboard(reason), PICTURE)
      expect(writing.ok, why).toBe(false)
      if (writing.ok) continue
      expect(CLIPBOARD_FAULTS, why).toContain(writing.fault)
    }
  })
})

// ---------------------------------------------------------------------------
// IO-6 of table T-024 -- the picture that leaves by this route is the one
// ImageExporter assembled, and it is the same picture IO-3 and IO-4 carry
//
// ⭐ WHY THIS BLOCK EXISTS. FR-025 (:3145) puts this route inside its own scope:
// "the route that sends to the clipboard (IO-6) is also within this
// requirement's scope. It only skips the download dialogue; the picture that
// comes out is the same (FR-080)." CR-196 corrected the manuscript's own edge
// for exactly that reason -- the picture ClipboardGateway is handed comes from
// ImageExporter (PI-21), not from SvgRenderer -- and WY-2 of table T-041 makes
// "the same picture" a judgement rather than a wish.
//
// ⛔ These cases do NOT claim that this unit builds a picture. It does not, and
// the case above ("nothing is made again here") is what pins that. What they
// pin is the other half: the string that goes out on R-9 is IO-3's own output,
// unaltered, and the gateway is the one place all three routes meet.
// ---------------------------------------------------------------------------

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

/**
 * ⛔ Rule 03 forbids re-typing a value the specification holds, so S-81 and
 * every other key arrive through `SETTINGS_DEFAULTS`, which `npm run gen`
 * writes out of `docs/spec/_source/settings.json`.
 */
const EXPORT_SETTINGS = nestedFrom(SETTINGS_DEFAULTS) as unknown as DocumentSettings

/** A screen of the export's base environment. 1000 wide, so FR-080's ratio is 1.6. */
const EXPORT_SCREEN = { width: 1000, height: 800, appHeaderHeight: 56 } as const

const EXPORT_REGIONS: ScreenRegions = (() => {
  const canvasHeight = EXPORT_SCREEN.height - EXPORT_SCREEN.appHeaderHeight
  const rowAreaWidth =
    EXPORT_SCREEN.width - EXPORT_SETTINGS.canvasPadding - EXPORT_SETTINGS.rowTitlePanelWidth
  return {
    appHeader: { x: 0, y: 0, width: EXPORT_SCREEN.width, height: EXPORT_SCREEN.appHeaderHeight },
    scheduleCanvas: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SCREEN.width,
      height: canvasHeight,
    },
    rowTitlePanel: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SETTINGS.rowTitlePanelWidth,
      height: canvasHeight,
    },
    timeRuler: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: rowAreaWidth,
      height: EXPORT_SETTINGS.rulerHeight,
    },
    // FR-080 (MUST): the properties panel goes into an export CLOSED, so the
    // base environment hands over a region of no width.
    propertiesPanel: {
      x: EXPORT_SCREEN.width,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: 0,
      height: canvasHeight,
    },
    rowArea: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight + EXPORT_SETTINGS.rulerHeight,
      width: rowAreaWidth,
      height: canvasHeight - EXPORT_SETTINGS.rulerHeight - EXPORT_SETTINGS.canvasPadding,
    },
  }
})()

/** The base environment of FR-080: the panel and the palette closed, nothing overlaid. */
const EXPORT_VIEW: ScreenView = {
  // S-99. Inert here: FR-080's picture carries no word this component chooses.
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: 'a document on its way to the clipboard',
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    // FR-038: the header's half of the language reading, the same value the
    // view above carries.
    language: 'ja',
  },
  rowTitlePanel: {
    pinnedTitles: [],
    titles: [
      {
        groupId: 'g1',
        depth: 1,
        // S-37 x depth 1, the product FR-085 subtracts before the cut.
        indentPx: EXPORT_SETTINGS.rowTitleIndent,
        box: { x: 0, y: 120, width: EXPORT_SETTINGS.rowTitlePanelWidth, height: 60 },
        label: 'a row that reaches the picture',
        // Nothing was cut, which the `RowTitle` contract fixes as
        // `wholeLabel === label` with `isLabelTruncated` false.
        wholeLabel: 'a row that reaches the picture',
        isLabelTruncated: false,
        expander: { canOpen: true, canClose: true, canCloseBelow: false },
        isPinned: false,
        isSelected: false,
      },
    ],
  },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const EXPORT_SCENE: ExportScene = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" data-from="svg-renderer"><circle cx="7" cy="11" r="3"/></svg>',
  regions: EXPORT_REGIONS,
  screenView: EXPORT_VIEW,
  settings: EXPORT_SETTINGS,
}

/**
 * The same scene on a screen of another height.
 *
 * ⭐ FR-080 takes the ratio off S-81's WIDTH over the screen's width, so the
 * width is left alone and only the height moves; the picture is then the
 * screen's height times that ratio, which is what S-217 is compared against.
 * ⛔ No number here is typed: S-81 and S-217 both arrive through
 * `EXPORT_SETTINGS`, which `npm run gen` writes out of the manuscript.
 */
const sceneOfScreenHeight = (screenHeight: number): ExportScene => {
  const canvasHeight = screenHeight - EXPORT_SCREEN.appHeaderHeight
  const withHeight = (rect: ScreenRegions['rowArea']): ScreenRegions['rowArea'] => ({
    ...rect,
    height: canvasHeight,
  })
  return {
    ...EXPORT_SCENE,
    regions: {
      ...EXPORT_REGIONS,
      scheduleCanvas: withHeight(EXPORT_REGIONS.scheduleCanvas),
      rowTitlePanel: withHeight(EXPORT_REGIONS.rowTitlePanel),
      propertiesPanel: withHeight(EXPORT_REGIONS.propertiesPanel),
      rowArea: {
        ...EXPORT_REGIONS.rowArea,
        height: canvasHeight - EXPORT_SETTINGS.rulerHeight - EXPORT_SETTINGS.canvasPadding,
      },
    },
  }
}

/** The `width`/`height` of the outermost element of a picture, as numbers. */
const rootSizeOf = (svg: string): { readonly width: number; readonly height: number } => {
  const root = /<svg((?:[^<>"]|"[^"]*")*)>/.exec(svg)?.[1] ?? ''
  const attr = (name: string): number =>
    Number.parseFloat(new RegExp(`${name}="([^"]*)"`).exec(root)?.[1] ?? 'NaN')
  return { width: attr('width'), height: attr('height') }
}

/** A rasterizer that answers without looking, so IO-4 can be compared to IO-3. */
const STILL_RASTERIZER: Rasterizer = {
  rasterizePng: () => Promise.resolve({ ok: true, pngBytes: Uint8Array.from([0x89, 0x50]) }),
}

/**
 * `exportSvg`/`exportPng` no longer answer with a picture unconditionally --
 * CR-337 (2026-09-02) has FR-025 refuse the whole thing past S-217's ceiling.
 * Every fixture in this `describe` is nowhere near that ceiling, so a refusal
 * here is a fixture bug, not the MUST NOT this file is silent about.
 *
 * ⭐ ONE HELPER, USED BY EVERY CASE THAT ASSUMED A PICTURE BEFORE CR-337.
 * Unwrapping inline at each call site would be the same three lines repeated.
 */
const fitOrThrow = <T extends { readonly ok: boolean }>(result: T): Extract<T, { readonly ok: true }> => {
  if (!result.ok) {
    throw new Error('CR-337: exportSvg/exportPng refused a picture this fixture expected to fit (S-217)')
  }
  return result as Extract<T, { readonly ok: true }>
}

describe('IO-6 of table T-024 -- the picture on this route is IO-3\'s own', () => {
  it('GIVEN the picture ImageExporter assembled WHEN it leaves by the clipboard THEN the seam is handed that very string (IO-6, FR-025 :3145)', async () => {
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    const { clipboard, received } = answeringClipboard({ ok: true })

    await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })

    expect(received).toHaveLength(1)
    const sent = received[0]
    expect(sent?.kind).toBe('picture')
    expect(sent === undefined ? '' : stringOf(sent)).toBe(assembled.svg)
  })

  it('GIVEN IO-6 payload WHEN its root is read THEN it is exportCanvas wide and tall, as IO-3 is (S-81 of table T-204)', async () => {
    // FR-025 (MUST NOT): the output size is fixed at S-81 and never chosen at
    // each export -- and this route "only skips the download dialogue".
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    const { clipboard, received } = answeringClipboard({ ok: true })

    await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })

    const sent = received[0]
    // ⭐⭐ THE WIDTH IS S-81's AND THE HEIGHT IS NOT, SINCE CR-333. FR-025 reads
    // 「幅は `S-81` の幅に固定すること（MUST）。高さは、絵が収まるところまで伸ば
    // すこと（MUST）」 and 「伸ばしてよいのはその `S-217` までとすること
    // （MUST）」 -- so S-81's height is the FLOOR and S-217 is the ceiling.
    const size = rootSizeOf(sent === undefined ? '' : stringOf(sent))
    expect(size.width).toBe(EXPORT_SETTINGS.exportCanvas.width)
    expect(size.height).toBeGreaterThanOrEqual(EXPORT_SETTINGS.exportCanvas.height)
    expect(size.height).toBeLessThanOrEqual(EXPORT_SETTINGS.exportCanvasHeightCap)
  })

  it('GIVEN one state WHEN IO-3, IO-4 and IO-6 each take their picture THEN all three carry one drawing (WY-2 of table T-041)', async () => {
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    const both = fitOrThrow(await exportPng(STILL_RASTERIZER, EXPORT_SCENE))
    const { clipboard, received } = answeringClipboard({ ok: true })

    await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })

    // IO-3 against IO-4 -- one assembly, so one string.
    expect(both.svg).toBe(assembled.svg)
    // IO-4 against IO-6 -- the clipboard carries what the rasterizer painted.
    const sent = received[0]
    expect(sent === undefined ? '' : stringOf(sent)).toBe(both.svg)
  })

  // ⛔⛔ THE CASE THAT STOOD HERE WAS DELETED, NOT REWRITTEN (CR-337). It was
  // 「GIVEN a picture that FR-025 cut down WHEN it leaves by the clipboard THEN
  // the gateway neither restores nor re-cuts it」, and its whole premise was
  // `droppedGroupIds` -- a picture FR-025 had cut a `TaskGroup` off the bottom
  // of. FR-025 now reads 「書き出さないと決めた以上、落とす規則は無くなった」,
  // so no such picture can exist to be sent, restored or re-cut. The case below
  // is what IO-6 owes the rule instead.
  it('GIVEN a scene too tall for S-217 WHEN IO-6 is taken THEN nothing reaches the clipboard (FR-025 MUST, CR-337)', async () => {
    // ⭐⭐ THE RULE, VERBATIM (FR-025): 「伸ばしても `S-217` に収まらないときは、
    // 画像を書き出さないこと（MUST）。一部だけを描いてはならない（MUST NOT）」,
    // and 「止めるのは 表 T-024 の `IO-3`（SVG）・`IO-4`（PNG）・`IO-6`
    // （クリップボード）である」. ⚠️ IO-6 carries IO-3's own picture
    // (CR-196's edge), so the route has nothing to send once IO-3 is refused --
    // and this case walks the route both ways to show the difference is the
    // ceiling and nothing else.
    // GOES RED IF: `exportSvg` answers a picture for the tall scene, which
    // would put a silently-cut drawing on somebody's clipboard.
    const ratio = EXPORT_SETTINGS.exportCanvas.width / EXPORT_SCREEN.width
    const overCeiling = EXPORT_SETTINGS.exportCanvasHeightCap / ratio + 1
    expect(overCeiling * ratio, 'the fixture is past S-217').toBeGreaterThan(
      EXPORT_SETTINGS.exportCanvasHeightCap,
    )

    const sentFor = async (screenHeight: number): Promise<readonly ClipboardContent[]> => {
      const { clipboard, received } = answeringClipboard({ ok: true })
      const answer = exportSvg(sceneOfScreenHeight(screenHeight))
      // ⛔ THE ROUTE ITSELF: there is a picture to send, or there is not.
      if (answer.ok) await writeClipboard(clipboard, { kind: 'picture', svg: answer.svg })
      return received
    }

    expect(await sentFor(overCeiling), 'nothing may go out for a scene that will not fit').toHaveLength(0)
    // The other side of the edge, so that the emptiness above is the ceiling's
    // doing and not the fixture's.
    expect(await sentFor(EXPORT_SCREEN.height), 'a scene that fits still goes out').toHaveLength(1)
  })

  it('GIVEN the clipboard refuses WHEN an assembled picture is sent THEN the refusal is a value and the picture is untouched (FR-028)', async () => {
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    for (const fault of CLIPBOARD_FAULTS) {
      const { clipboard } = answeringClipboard({ ok: false, fault })
      const writing = await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })
      expect(writing, fault).toEqual({ ok: false, fault })
    }
    expect(fitOrThrow(exportSvg(EXPORT_SCENE)).svg).toBe(assembled.svg)
  })
})
