// Unit tests for UF-41 `file-gateway.ts` (the public entry) and UF-42
// `file-store.ts` (the seam declaration) -- table T-075 of
// docs/spec/05-07-design.md, component `FileGateway` (CP-22 of table T-062),
// published as PI-22 of table T-064, seam IF-3 of table T-065.
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// named below; the whole of file-store.ts, which declares types and no
// function; and of file-gateway.ts only its head comment, its exported types
// and its two exported signatures. Every expected value here comes from a
// requirement or from a table, never from the implementation.
//
// The rows these cases answer to:
//   PI-22        the published names, and their purity
//   IF-3         the handle stays on the far side, so the state is asked for
//                and never held here
//   FR-060       overwrite the file that was opened; win back a lost
//                permission at startup
//   OP-2         one entry for reading, two routes (table T-024a)
//   OP-5         the validation is one shared check, and it is not this one
//   OP-3 / OP-4 / OP-6 / OP-8 / OP-9 / OP-10
//                what becomes of what was read -- none of it decided here
//   IO-1 .. IO-7 the direction column of table T-024, and the BOM its note
//                forbids
//   CN-5         UTF-8, no BOM (table T-003)
//   FR-023       this unit judges no content; its one contribution is the byte
//                count S-113 is stated in
//   S-113        read from the generated defaults, and deliberately not
//                enforced here (table T-211)
//   FR-096       one entry for writing, with the form as a field
//   FR-028 / AG-8    a failure is a value; nothing throws (table T-035)
//   NT-1 / NT-3a     a refusal says which and why, and the reasons are told
//                apart by what can be done next (table T-037)
//   UT-5         the gateway stops at text and picks no codec (table T-063)
//   LY-5 / R7.4  no current value is held here, and no second external read
//                happens part-way through handling one result
//   LM-14        opening off the disk may simply not work, and that surfaces
//                as a reason rather than as a throw (table T-004)
//
// Chapter 1.9 (:275) asks a test of a requirement that points at a table to be
// driven by a fixed copy of that table, one test walking every row. The
// rosters below are those copies.

import { describe, expect, it } from 'vitest'

import * as fileGatewayModule from '../../src/adapter/file-gateway/file-gateway'
import {
  openDocumentFile,
  saveDocumentFile,
  type ChosenFileWrite,
  type DocumentFileFault,
  type DocumentFileFaultReason,
  type DocumentFileSaveRequest,
  type FileReading,
  type FileStore,
  type FileStoreFault,
  type FileStoreFaultReason,
  type FileWriting,
  type OpenedDocumentFile,
  type OpenedFileState,
  type OpenRoute,
  type SaveFileContent,
  type SaveFileForm,
} from '../../src/adapter/file-gateway/file-gateway'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * Table T-024, the rows whose destination is a file, with the direction column
 * carried as `comesIn`. IO-1 and IO-2 have both directions; IO-3, IO-4 and
 * IO-7 only go out. That column is the whole of what decides which form can
 * stand in the position FR-060 overwrites.
 */
const T_024_FILE_ROWS = [
  { id: 'IO-1', form: 'mspdi', comesIn: true },
  { id: 'IO-2', form: 'grsJson', comesIn: true },
  { id: 'IO-3', form: 'svg', comesIn: false },
  { id: 'IO-4', form: 'png', comesIn: false },
  { id: 'IO-7', form: 'singleHtml', comesIn: false },
] as const satisfies readonly {
  readonly id: string
  readonly form: SaveFileForm
  readonly comesIn: boolean
}[]

/**
 * Table T-024, the two rows that reach no file. IO-5 answers to IF-4 and IO-6
 * to IF-5, so neither may appear among the forms this component writes.
 */
const T_024_ROWS_THAT_ARE_NOT_FILES = [
  { id: 'IO-5', seam: 'IF-4' },
  { id: 'IO-6', seam: 'IF-5' },
] as const

/** OP-2 of table T-024a: the routes one entry admits, and no third. */
const T_024A_OP2_ROUTES = ['chooser', 'drop'] as const satisfies readonly OpenRoute[]

/** IF-3: the three answers the store gives about FR-060's file. */
const IF_3_OPENED_STATES = [
  { kind: 'none' },
  { kind: 'writable', fileName: 'plan-a.json' },
  { kind: 'permissionLost', fileName: 'plan-a.json' },
] as const satisfies readonly OpenedFileState[]

/**
 * Every member of the union, as a record, so that adding or dropping one stops
 * the compiler here rather than letting a roster walk go quietly short.
 */
const EVERY_OPEN_ROUTE: Readonly<Record<OpenRoute, true>> = {
  chooser: true,
  drop: true,
}

const EVERY_STORE_REASON: Readonly<Record<FileStoreFaultReason, true>> = {
  cancelled: true,
  permissionLost: true,
  noOpenedFile: true,
  unavailable: true,
}

const EVERY_GATEWAY_REASON: Readonly<Record<DocumentFileFaultReason, true>> = {
  ...EVERY_STORE_REASON,
  notUtf8: true,
  notAnOverwriteTarget: true,
}

const EVERY_SAVE_FORM: Readonly<Record<SaveFileForm, true>> = {
  grsJson: true,
  mspdi: true,
  svg: true,
  png: true,
  singleHtml: true,
}

const storeReasons = Object.keys(EVERY_STORE_REASON) as readonly FileStoreFaultReason[]

/**
 * CN-5 of table T-003 fixes the encoding, and RFC 3629 fixes what that
 * encoding is. One row per sequence length, so a case walks all four rather
 * than proving only that ASCII survives.
 */
const CN_5_UTF8 = [
  { why: 'one byte', text: 'A', bytes: [0x41] },
  { why: 'two bytes', text: '\u00e9', bytes: [0xc3, 0xa9] },
  { why: 'three bytes', text: '\u65e5', bytes: [0xe6, 0x97, 0xa5] },
  { why: 'four bytes', text: '\u{1f5d3}', bytes: [0xf0, 0x9f, 0x97, 0x93] },
] as const

/** Byte strings that CN-5's encoding does not admit at all. */
const NOT_UTF8 = [
  { why: 'a byte that starts no sequence', bytes: [0xff] },
  { why: 'a continuation byte with no lead', bytes: [0x80] },
  { why: 'a two byte lead followed by an ASCII byte', bytes: [0xc3, 0x28] },
  { why: 'a three byte sequence cut short', bytes: [0xe6, 0x97] },
  { why: 'a four byte sequence cut short', bytes: [0xf0, 0x9f, 0x97] },
  { why: 'a surrogate half, which this encoding never carries', bytes: [0xed, 0xa0, 0x80] },
] as const

/** The mark table T-024's note forbids ever adding (MUST NOT). */
const BYTE_ORDER_MARK = [0xef, 0xbb, 0xbf] as const

/** S-113 states its ceiling in megabytes and states the factor (table T-211). */
const BYTES_PER_MEGABYTE = 1024 * 1024

/** Read, never re-typed: rule 03 section 1 sends this to the generated value. */
const S_113_CEILING_BYTES = Number(SETTINGS_DEFAULTS['importMaxBytes']) * BYTES_PER_MEGABYTE

// ---------------------------------------------------------------------------
// A stand-in for IF-3. Records what it was asked, answers what it was told to.
// ---------------------------------------------------------------------------

interface StoreCall {
  readonly member: string
  readonly argument: unknown
}

interface StoreAnswers {
  readonly reading?: FileReading
  readonly openedState?: OpenedFileState
  readonly restored?: OpenedFileState
  readonly overwrite?: FileWriting
  readonly chosen?: FileWriting
}

interface StandIn {
  readonly store: FileStore
  readonly calls: readonly StoreCall[]
}

const UNCONFIGURED: FileStoreFault = {
  reason: 'unavailable',
  what: 'this case did not tell the stand-in what to answer for that member',
}

function storeThat(answers: StoreAnswers = {}): StandIn {
  const calls: StoreCall[] = []
  const record = (member: string, argument: unknown): void => {
    calls.push({ member, argument })
  }
  const store: FileStore = {
    readFileToOpen: async (route: OpenRoute): Promise<FileReading> => {
      record('readFileToOpen', route)
      return answers.reading ?? { ok: false, fault: UNCONFIGURED }
    },
    readOpenedFileState: async (): Promise<OpenedFileState> => {
      record('readOpenedFileState', undefined)
      return answers.openedState ?? { kind: 'none' }
    },
    restoreOpenedFilePermission: async (): Promise<OpenedFileState> => {
      record('restoreOpenedFilePermission', undefined)
      return answers.restored ?? { kind: 'none' }
    },
    overwriteOpenedFile: async (bytes: Uint8Array): Promise<FileWriting> => {
      record('overwriteOpenedFile', bytes)
      return answers.overwrite ?? { ok: false, fault: UNCONFIGURED }
    },
    writeChosenFile: async (write: ChosenFileWrite): Promise<FileWriting> => {
      record('writeChosenFile', write)
      return answers.chosen ?? { ok: false, fault: UNCONFIGURED }
    },
  }
  return { store, calls }
}

const bytesOf = (values: readonly number[]): Uint8Array => Uint8Array.from(values)

/** Builds input only. No expected value below is computed this way. */
const encoded = (text: string): Uint8Array => new TextEncoder().encode(text)

const readingOf = (bytes: Uint8Array, fileName: string): FileReading => ({
  ok: true,
  file: { bytes, fileName },
})

const writtenTo = (openedFile: OpenedFileState): FileWriting => ({ ok: true, openedFile })

const overwriteRequest = (
  form: SaveFileForm,
  content: SaveFileContent,
): DocumentFileSaveRequest => ({ destination: 'openedFile', content, form })

const chosenRequest = (
  form: SaveFileForm,
  content: SaveFileContent,
  suggestedFileName: string,
): DocumentFileSaveRequest => ({
  destination: 'chosenFile',
  content,
  form,
  suggestedFileName,
})

// ---------------------------------------------------------------------------
// Reading the two published shapes without asserting them into place.
// ---------------------------------------------------------------------------

async function opened(store: FileStore, route: OpenRoute = 'chooser'): Promise<OpenedDocumentFile> {
  const result = await openDocumentFile(store, route)
  if (!result.ok) throw new Error(`expected a file, was refused: ${JSON.stringify(result.fault)}`)
  return result.file
}

async function refusedOpen(
  store: FileStore,
  route: OpenRoute = 'chooser',
): Promise<DocumentFileFault> {
  const result = await openDocumentFile(store, route)
  if (result.ok) throw new Error('expected a refusal, a file came back')
  return result.fault
}

async function saved(store: FileStore, request: DocumentFileSaveRequest): Promise<OpenedFileState> {
  const result = await saveDocumentFile(store, request)
  if (!result.ok) throw new Error(`expected a write, was refused: ${JSON.stringify(result.fault)}`)
  return result.openedFile
}

async function refusedSave(
  store: FileStore,
  request: DocumentFileSaveRequest,
): Promise<DocumentFileFault> {
  const result = await saveDocumentFile(store, request)
  if (result.ok) throw new Error('expected a refusal, a write came back')
  return result.fault
}

const argumentOf = (calls: readonly StoreCall[], member: string): unknown => {
  const call = calls.find((one) => one.member === member)
  if (call === undefined) throw new Error(`the store was never asked ${member}`)
  return call.argument
}

// ---------------------------------------------------------------------------
// The rosters themselves, before anything walks them
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  // A walk over a short roster passes without asserting what it skipped. These
  // pin the counts so a vacuous case cannot go green.
  it('carries the five file rows of table T-024, two of which come in as well', () => {
    expect(T_024_FILE_ROWS).toHaveLength(5)
    expect(new Set(T_024_FILE_ROWS.map((row) => row.id)).size).toBe(5)
    expect(T_024_FILE_ROWS.filter((row) => row.comesIn)).toHaveLength(2)
    expect(T_024_FILE_ROWS.filter((row) => !row.comesIn)).toHaveLength(3)
  })

  it('names one save form per file row of table T-024, and none for IO-5 or IO-6', () => {
    expect(Object.keys(EVERY_SAVE_FORM).sort()).toEqual(
      T_024_FILE_ROWS.map((row) => row.form as string).sort(),
    )
    expect(T_024_ROWS_THAT_ARE_NOT_FILES).toHaveLength(2)
  })

  it('carries the two routes of OP-2 and the four reasons IF-3 tells apart', () => {
    expect(T_024A_OP2_ROUTES).toHaveLength(2)
    expect(Object.keys(EVERY_OPEN_ROUTE).sort()).toEqual([...T_024A_OP2_ROUTES].sort())
    expect(storeReasons).toHaveLength(4)
    expect(Object.keys(EVERY_GATEWAY_REASON)).toHaveLength(6)
    expect(IF_3_OPENED_STATES).toHaveLength(3)
  })

  it('reads S-113 from the generated defaults rather than re-typing it', () => {
    expect(Number.isInteger(S_113_CEILING_BYTES)).toBe(true)
    expect(S_113_CEILING_BYTES).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// PI-22 of table T-064 -- what leaves this folder
// ---------------------------------------------------------------------------

describe('PI-22 -- the published members of FileGateway', () => {
  it('publishes the two functions PI-22 names', () => {
    expect(typeof openDocumentFile).toBe('function')
    expect(typeof saveDocumentFile).toBe('function')
  })

  it('publishes no third function -- FR-060 startup offer is a seam member, not one', () => {
    // FR-060's second MUST is served by IF-3's own members, which the shell
    // calls. A published `restoreDocumentFilePermission` here would be a
    // fourth name PI-22 does not list.
    expect(Object.keys(fileGatewayModule).sort()).toEqual([
      'openDocumentFile',
      'saveDocumentFile',
    ])
  })

  it('re-exports the seam declared in this folder (Chapter 5.3, MUST)', () => {
    // Type-only: Chapter 5.3 makes this file the only door out of the folder,
    // so the layer that implements IF-3 must be able to reach these names
    // through it. That this compiles is the assertion.
    const seam: FileStore | null = null
    const reading: FileReading | null = null
    const writing: FileWriting | null = null
    const fault: FileStoreFault | null = null
    const write: ChosenFileWrite | null = null
    const state: OpenedFileState | null = null
    const route: OpenRoute | null = null
    expect([seam, reading, writing, fault, write, state, route].every((one) => one === null)).toBe(
      true,
    )
  })
})

// ---------------------------------------------------------------------------
// OP-2 of table T-024a -- one entry, two routes
// ---------------------------------------------------------------------------

describe('OP-2 -- one way in, and the route is a value it carries', () => {
  it('hands the store the route it was given (one case walks both)', async () => {
    for (const route of T_024A_OP2_ROUTES) {
      const stand = storeThat({ reading: readingOf(encoded('a'), 'a.json') })
      await opened(stand.store, route)
      expect(argumentOf(stand.calls, 'readFileToOpen'), route).toBe(route)
    }
  })

  it('reads through the one member, whichever route it was (no second way in)', async () => {
    for (const route of T_024A_OP2_ROUTES) {
      const stand = storeThat({ reading: readingOf(encoded('a'), 'a.json') })
      await opened(stand.store, route)
      expect(
        stand.calls.map((call) => call.member),
        route,
      ).toEqual(['readFileToOpen'])
    }
  })

  it('gives the two routes the same result for the same bytes', async () => {
    const bytes = encoded('{"schemaVersion":"2026-08-18"}')
    const byChooser = await opened(storeThat({ reading: readingOf(bytes, 'a.json') }).store, 'chooser')
    const byDrop = await opened(storeThat({ reading: readingOf(bytes, 'a.json') }).store, 'drop')
    expect(byDrop).toEqual(byChooser)
  })
})

// ---------------------------------------------------------------------------
// The ordinary read, and what UT-5 leaves out of it
// ---------------------------------------------------------------------------

describe('openDocumentFile -- one file, read and decoded, and nothing made of it', () => {
  it('gives back the text, the byte count and the name the store reported', async () => {
    const text = '{"schemaVersion":"2026-08-18"}'
    const bytes = encoded(text)
    const file = await opened(storeThat({ reading: readingOf(bytes, 'plan-a.json') }).store)
    expect(file.text).toBe(text)
    expect(file.byteLength).toBe(bytes.byteLength)
    expect(file.fileName).toBe('plan-a.json')
  })

  it('stops at text -- UT-5 leaves the choice of codec to the caller', async () => {
    const file = await opened(storeThat({ reading: readingOf(encoded('<Project/>'), 'a.xml') }).store)
    expect(Object.keys(file).sort()).toEqual(['byteLength', 'fileName', 'text'])
  })

  it('hands back text for any bytes that decode, judging none of it (OP-5, FR-023)', async () => {
    for (const text of ['', 'not a document', '<Project/>', '{"a":1}', ' ']) {
      const file = await opened(storeThat({ reading: readingOf(encoded(text), 'a') }).store)
      expect(file.text, JSON.stringify(text)).toBe(text)
    }
  })

  it('never hands back both a file and a fault', async () => {
    const good = await openDocumentFile(
      storeThat({ reading: readingOf(encoded('a'), 'a') }).store,
      'chooser',
    )
    expect(good.ok).toBe(true)
    expect(good).not.toHaveProperty('fault')

    const bad = await openDocumentFile(
      storeThat({ reading: { ok: false, fault: { reason: 'cancelled', what: 'dismissed' } } }).store,
      'chooser',
    )
    expect(bad.ok).toBe(false)
    expect(bad).not.toHaveProperty('file')
  })
})

// ---------------------------------------------------------------------------
// CN-5 of table T-003 -- the encoding rule, on the way in
// ---------------------------------------------------------------------------

describe('CN-5 -- bytes become text by one encoding, and by no other', () => {
  it('decodes every sequence length of that encoding (one case walks the roster)', async () => {
    for (const row of CN_5_UTF8) {
      const file = await opened(storeThat({ reading: readingOf(bytesOf(row.bytes), 'a') }).store)
      expect(file.text, row.why).toBe(row.text)
    }
  })

  it('refuses bytes that encoding does not admit, rather than repairing them', async () => {
    for (const row of NOT_UTF8) {
      const fault = await refusedOpen(
        storeThat({ reading: readingOf(bytesOf(row.bytes), 'a') }).store,
      )
      expect(fault.reason, row.why).toBe('notUtf8')
    }
  })

  it('lets no replacement character stand in for a byte it could not read', async () => {
    for (const row of NOT_UTF8) {
      const result = await openDocumentFile(
        storeThat({ reading: readingOf(bytesOf(row.bytes), 'a') }).store,
        'chooser',
      )
      if (result.ok) expect(result.file.text, row.why).not.toContain('\ufffd')
    }
  })
})

// ---------------------------------------------------------------------------
// FR-023 and S-113 -- the byte count, and the check that is somewhere else
// ---------------------------------------------------------------------------

describe('FR-023 -- the byte count is this unit contribution, and the ceiling is not', () => {
  it('counts bytes, not characters (S-113 states its ceiling in bytes)', async () => {
    for (const row of CN_5_UTF8) {
      const file = await opened(storeThat({ reading: readingOf(bytesOf(row.bytes), 'a') }).store)
      expect(file.byteLength, row.why).toBe(row.bytes.length)
      expect(file.text.length, row.why).toBeLessThanOrEqual(file.byteLength)
    }
    const multiByte = CN_5_UTF8[3]
    const file = await opened(storeThat({ reading: readingOf(bytesOf(multiByte.bytes), 'a') }).store)
    expect(file.byteLength).toBe(4)
    expect(file.text.length).toBeLessThan(file.byteLength)
  })

  it('reads an empty file as empty text and a count of zero', async () => {
    const file = await opened(storeThat({ reading: readingOf(bytesOf([]), 'empty.json') }).store)
    expect(file.text).toBe('')
    expect(file.byteLength).toBe(0)
    expect(file.fileName).toBe('empty.json')
  })

  it('reads a file of one byte', async () => {
    const file = await opened(storeThat({ reading: readingOf(bytesOf([0x41]), 'a') }).store)
    expect(file.text).toBe('A')
    expect(file.byteLength).toBe(1)
  })

  it('passes a file past S-113 ceiling through -- OP-5 puts that check in one place', async () => {
    const oversize = new Uint8Array(S_113_CEILING_BYTES + 1).fill(0x41)
    const file = await opened(storeThat({ reading: readingOf(oversize, 'huge.json') }).store)
    expect(file.byteLength).toBe(S_113_CEILING_BYTES + 1)
  })
})

// ---------------------------------------------------------------------------
// FR-096 and FR-060 -- one entry for writing, two destinations
// ---------------------------------------------------------------------------

describe('saveDocumentFile -- one entry, with the form as a field (FR-096)', () => {
  it('writes over the opened file through the member that names it (FR-060)', async () => {
    const stand = storeThat({ overwrite: writtenTo({ kind: 'writable', fileName: 'plan-a.json' }) })
    const state = await saved(stand.store, overwriteRequest('grsJson', { text: 'A' }))
    expect(stand.calls.map((call) => call.member)).toEqual(['overwriteOpenedFile'])
    expect(argumentOf(stand.calls, 'overwriteOpenedFile')).toEqual(bytesOf([0x41]))
    expect(state).toEqual({ kind: 'writable', fileName: 'plan-a.json' })
  })

  it('writes to a chosen file through the member that names it (FR-096)', async () => {
    const stand = storeThat({ chosen: writtenTo({ kind: 'writable', fileName: 'chosen.json' }) })
    await saved(stand.store, chosenRequest('grsJson', { text: 'A' }, 'suggested.json'))
    expect(stand.calls.map((call) => call.member)).toEqual(['writeChosenFile'])
    const write = argumentOf(stand.calls, 'writeChosenFile') as ChosenFileWrite
    expect(write.bytes).toEqual(bytesOf([0x41]))
    expect(write.suggestedFileName).toBe('suggested.json')
  })

  it('hands the suggested name over untouched, empty one included', async () => {
    for (const suggested of ['', 'a', 'plan a.json', 'plan.a.b', '\u65e5\u7a0b']) {
      const stand = storeThat({ chosen: writtenTo({ kind: 'none' }) })
      await saved(stand.store, chosenRequest('grsJson', { text: 'A' }, suggested))
      const write = argumentOf(stand.calls, 'writeChosenFile') as ChosenFileWrite
      expect(write.suggestedFileName, JSON.stringify(suggested)).toBe(suggested)
    }
  })

  it('reports the state the store gave (one case walks IF-3 three answers)', async () => {
    for (const state of IF_3_OPENED_STATES) {
      const stand = storeThat({ overwrite: writtenTo(state) })
      expect(await saved(stand.store, overwriteRequest('grsJson', { text: 'A' })), state.kind).toEqual(
        state,
      )
    }
  })

  it('writes an empty document as no bytes at all', async () => {
    const stand = storeThat({ overwrite: writtenTo({ kind: 'writable', fileName: 'a' }) })
    await saved(stand.store, overwriteRequest('grsJson', { text: '' }))
    expect(argumentOf(stand.calls, 'overwriteOpenedFile')).toEqual(bytesOf([]))
  })

  it('asks the store nothing else while handling one save (R7.4, LY-5)', async () => {
    for (const row of T_024_FILE_ROWS) {
      const stand = storeThat({
        overwrite: writtenTo({ kind: 'writable', fileName: 'a' }),
        chosen: writtenTo({ kind: 'writable', fileName: 'a' }),
      })
      const request = row.comesIn
        ? overwriteRequest(row.form, { text: 'A' })
        : chosenRequest(row.form, { text: 'A' }, 'a')
      await saved(stand.store, request)
      expect(stand.calls.map((call) => call.member), row.id).not.toContain('readOpenedFileState')
      expect(stand.calls, row.id).toHaveLength(1)
    }
  })
})

// ---------------------------------------------------------------------------
// CN-5 and table T-024 note -- the encoding rule, on the way out
// ---------------------------------------------------------------------------

describe('CN-5 -- text becomes bytes by one encoding, and never gains a mark', () => {
  it('encodes every sequence length of that encoding (one case walks the roster)', async () => {
    for (const row of CN_5_UTF8) {
      const stand = storeThat({ overwrite: writtenTo({ kind: 'writable', fileName: 'a' }) })
      await saved(stand.store, overwriteRequest('grsJson', { text: row.text }))
      expect(argumentOf(stand.calls, 'overwriteOpenedFile'), row.why).toEqual(bytesOf(row.bytes))
    }
  })

  it('prepends no byte order mark, on either destination, for any form (MUST NOT)', async () => {
    for (const row of T_024_FILE_ROWS) {
      for (const destination of ['openedFile', 'chosenFile'] as const) {
        const stand = storeThat({
          overwrite: writtenTo({ kind: 'none' }),
          chosen: writtenTo({ kind: 'none' }),
        })
        const request =
          destination === 'openedFile'
            ? overwriteRequest(row.form, { text: 'A' })
            : chosenRequest(row.form, { text: 'A' }, 'a')
        const result = await saveDocumentFile(stand.store, request)
        if (!result.ok) continue
        const written =
          destination === 'openedFile'
            ? (argumentOf(stand.calls, 'overwriteOpenedFile') as Uint8Array)
            : (argumentOf(stand.calls, 'writeChosenFile') as ChosenFileWrite).bytes
        const head = [...written.slice(0, 3)]
        expect(head, `${row.id} ${destination}`).not.toEqual([...BYTE_ORDER_MARK])
        expect(written[0], `${row.id} ${destination}`).toBe(0x41)
      }
    }
  })

  it('leaves bytes alone -- a picture is not decoded and encoded again', async () => {
    // 0x89 leads no sequence of that encoding, so a round trip through text
    // could not have given these back.
    const picture = bytesOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00])
    const stand = storeThat({ chosen: writtenTo({ kind: 'none' }) })
    await saved(stand.store, chosenRequest('png', { bytes: picture }, 'a.png'))
    const write = argumentOf(stand.calls, 'writeChosenFile') as ChosenFileWrite
    expect(write.bytes).toEqual(picture)
  })

  it('writes bytes of length zero when handed an empty byte string', async () => {
    const stand = storeThat({ chosen: writtenTo({ kind: 'none' }) })
    await saved(stand.store, chosenRequest('png', { bytes: bytesOf([]) }, 'a.png'))
    const write = argumentOf(stand.calls, 'writeChosenFile') as ChosenFileWrite
    expect(write.bytes.byteLength).toBe(0)
  })

  it('carries text back out as the same text it would read in', async () => {
    const text = '{"name":"\u65e5\u7a0b \u2014 \u00dcnicode"}'
    const stand = storeThat({ overwrite: writtenTo({ kind: 'none' }) })
    await saved(stand.store, overwriteRequest('grsJson', { text }))
    const written = argumentOf(stand.calls, 'overwriteOpenedFile') as Uint8Array
    const back = await opened(storeThat({ reading: readingOf(written, 'a') }).store)
    expect(back.text).toBe(text)
  })
})

// ---------------------------------------------------------------------------
// The direction column of table T-024 -- which form may hold FR-060 position
// ---------------------------------------------------------------------------

describe('table T-024 direction column -- what may become the file FR-060 overwrites', () => {
  // PD-20: whether a save to a file the person chose REDEFINES FR-060's target
  // is not settled anywhere in docs/spec -- FR-060 names the file that was
  // opened and FR-096 names a chosen destination, and no row joins the two. So
  // this walk asserts only the half the direction column does settle: a form
  // that never comes in cannot close a round trip, so it cannot take the
  // position. For IO-1 and IO-2 the case records that the row was visited and
  // asserts nothing about the value.
  it('never lets an out-only form take that position (one case walks table T-024)', async () => {
    for (const row of T_024_FILE_ROWS) {
      const stand = storeThat({ chosen: writtenTo({ kind: 'none' }) })
      await saved(stand.store, chosenRequest(row.form, { text: 'A' }, 'a'))
      const write = argumentOf(stand.calls, 'writeChosenFile') as ChosenFileWrite
      expect(typeof write.shouldBecomeOpenedFile, row.id).toBe('boolean')
      if (!row.comesIn) expect(write.shouldBecomeOpenedFile, row.id).toBe(false)
    }
  })

  it('refuses to overwrite the opened file with a form that only goes out', async () => {
    for (const row of T_024_FILE_ROWS.filter((one) => !one.comesIn)) {
      const stand = storeThat({ overwrite: writtenTo({ kind: 'none' }) })
      const fault = await refusedSave(stand.store, overwriteRequest(row.form, { text: 'A' }))
      expect(fault.reason, row.id).toBe('notAnOverwriteTarget')
      expect(stand.calls, row.id).toHaveLength(0)
    }
  })

  it('accepts the two forms that come in as overwrite targets', async () => {
    for (const row of T_024_FILE_ROWS.filter((one) => one.comesIn)) {
      const stand = storeThat({ overwrite: writtenTo({ kind: 'writable', fileName: 'a' }) })
      await saved(stand.store, overwriteRequest(row.form, { text: 'A' }))
      expect(stand.calls.map((call) => call.member), row.id).toEqual(['overwriteOpenedFile'])
    }
  })
})

// ---------------------------------------------------------------------------
// FR-028 and AG-8 of table T-035 -- a failure is a value
// ---------------------------------------------------------------------------

describe('FR-028 / AG-8 -- failures come back as values, and nothing throws', () => {
  it('gives the store reason back on a read (one case walks all four)', async () => {
    for (const reason of storeReasons) {
      const stand = storeThat({ reading: { ok: false, fault: { reason, what: `store: ${reason}` } } })
      const fault = await refusedOpen(stand.store)
      expect(fault.reason, reason).toBe(reason)
    }
  })

  it('gives the store reason back on either kind of write (one case walks all four)', async () => {
    for (const reason of storeReasons) {
      const fault: FileStoreFault = { reason, what: `store: ${reason}` }
      const overwriting = storeThat({ overwrite: { ok: false, fault } })
      expect(
        (await refusedSave(overwriting.store, overwriteRequest('grsJson', { text: 'A' }))).reason,
        reason,
      ).toBe(reason)
      const choosing = storeThat({ chosen: { ok: false, fault } })
      expect(
        (await refusedSave(choosing.store, chosenRequest('grsJson', { text: 'A' }, 'a'))).reason,
        reason,
      ).toBe(reason)
    }
  })

  it('says nothing is open rather than writing somewhere else (FR-060, the empty case)', async () => {
    const stand = storeThat({
      overwrite: { ok: false, fault: { reason: 'noOpenedFile', what: 'nothing is open' } },
    })
    const fault = await refusedSave(stand.store, overwriteRequest('grsJson', { text: 'A' }))
    expect(fault.reason).toBe('noOpenedFile')
    expect(stand.calls.map((call) => call.member)).toEqual(['overwriteOpenedFile'])
  })

  it('keeps a lost permission tellable apart from a plain failure (FR-060 second MUST)', async () => {
    const lost = storeThat({
      overwrite: { ok: false, fault: { reason: 'permissionLost', what: 'the grant is gone' } },
    })
    const broken = storeThat({
      overwrite: { ok: false, fault: { reason: 'unavailable', what: 'the disk said no' } },
    })
    const lostFault = await refusedSave(lost.store, overwriteRequest('grsJson', { text: 'A' }))
    const brokenFault = await refusedSave(broken.store, overwriteRequest('grsJson', { text: 'A' }))
    expect(lostFault.reason).toBe('permissionLost')
    expect(brokenFault.reason).toBe('unavailable')
    expect(lostFault.reason).not.toBe(brokenFault.reason)
  })

  it('keeps a dismissal tellable apart, so NT-3a can leave it un-notified', async () => {
    const reading = await refusedOpen(
      storeThat({ reading: { ok: false, fault: { reason: 'cancelled', what: 'dismissed' } } }).store,
    )
    const writing = await refusedSave(
      storeThat({ chosen: { ok: false, fault: { reason: 'cancelled', what: 'dismissed' } } }).store,
      chosenRequest('grsJson', { text: 'A' }, 'a'),
    )
    expect(reading.reason).toBe('cancelled')
    expect(writing.reason).toBe('cancelled')
  })

  it('reports LM-14 own case as a reason rather than as a silent success', async () => {
    const stand = storeThat({
      overwrite: { ok: false, fault: { reason: 'unavailable', what: 'opened off the disk' } },
    })
    const result = await saveDocumentFile(stand.store, overwriteRequest('grsJson', { text: 'A' }))
    expect(result.ok).toBe(false)
    expect(result).not.toHaveProperty('openedFile')
  })

  it('throws for none of the failures either function can meet', async () => {
    for (const reason of storeReasons) {
      const fault: FileStoreFault = { reason, what: `store: ${reason}` }
      await expect(
        openDocumentFile(storeThat({ reading: { ok: false, fault } }).store, 'chooser'),
      ).resolves.toHaveProperty('ok', false)
      await expect(
        saveDocumentFile(
          storeThat({ overwrite: { ok: false, fault } }).store,
          overwriteRequest('grsJson', { text: 'A' }),
        ),
      ).resolves.toHaveProperty('ok', false)
    }
    for (const row of NOT_UTF8) {
      await expect(
        openDocumentFile(
          storeThat({ reading: readingOf(bytesOf(row.bytes), 'a') }).store,
          'chooser',
        ),
      ).resolves.toHaveProperty('ok', false)
    }
    for (const row of T_024_FILE_ROWS.filter((one) => !one.comesIn)) {
      await expect(
        saveDocumentFile(storeThat().store, overwriteRequest(row.form, { text: 'A' })),
      ).resolves.toHaveProperty('ok', false)
    }
  })
})

// ---------------------------------------------------------------------------
// NT-1 and NT-3a of table T-037 -- a refusal says which, and why
// ---------------------------------------------------------------------------

describe('NT-1 / NT-3a -- every refusal carries a reason and words behind it', () => {
  const everyRefusal = async (): Promise<readonly { why: string; fault: DocumentFileFault }[]> => {
    const faults: { why: string; fault: DocumentFileFault }[] = []
    for (const reason of storeReasons) {
      const fault: FileStoreFault = { reason, what: `the store could not: ${reason}` }
      faults.push({
        why: `read refused with ${reason}`,
        fault: await refusedOpen(storeThat({ reading: { ok: false, fault } }).store),
      })
      faults.push({
        why: `overwrite refused with ${reason}`,
        fault: await refusedSave(
          storeThat({ overwrite: { ok: false, fault } }).store,
          overwriteRequest('grsJson', { text: 'A' }),
        ),
      })
      faults.push({
        why: `chosen write refused with ${reason}`,
        fault: await refusedSave(
          storeThat({ chosen: { ok: false, fault } }).store,
          chosenRequest('grsJson', { text: 'A' }, 'a'),
        ),
      })
    }
    for (const row of NOT_UTF8) {
      faults.push({
        why: `read refused for ${row.why}`,
        fault: await refusedOpen(storeThat({ reading: readingOf(bytesOf(row.bytes), 'a') }).store),
      })
    }
    for (const row of T_024_FILE_ROWS.filter((one) => !one.comesIn)) {
      faults.push({
        why: `overwrite refused for ${row.id}`,
        fault: await refusedSave(storeThat().store, overwriteRequest(row.form, { text: 'A' })),
      })
    }
    return faults
  }

  it('gathers a refusal for every reason the two functions can raise', async () => {
    const raised = new Set((await everyRefusal()).map((one) => one.fault.reason))
    expect([...raised].sort()).toEqual(Object.keys(EVERY_GATEWAY_REASON).sort())
  })

  it('says why in words, never by the reason token alone', async () => {
    for (const { why, fault } of await everyRefusal()) {
      expect(typeof fault.what, why).toBe('string')
      expect(fault.what.trim().length, why).toBeGreaterThan(0)
      expect(fault.what, why).not.toBe(fault.reason)
    }
  })

  // A case asserting that a refused read names the FILE was written and then
  // dropped: NT-1's item is instantiated by FR-023 as a row and a column of the
  // content, and this unit judges no content. Whether the refusal must carry
  // the name of the file it refused is therefore open, and the failure arm of
  // `DocumentFileOpening` carries no name today, so no caller can supply one.
  it('tells the reasons apart by what can be done next (NT-3a), cancelling included', async () => {
    const raised = (await everyRefusal()).map((one) => one.fault.reason)
    expect(raised).toContain('cancelled')
    expect(new Set(raised).size).toBe(Object.keys(EVERY_GATEWAY_REASON).length)
  })
})

// ---------------------------------------------------------------------------
// LY-4 and PI-22 purity -- what each function is allowed to touch
// ---------------------------------------------------------------------------

describe('purity -- openDocumentFile reads outside and writes nothing', () => {
  it('calls no member that writes', async () => {
    for (const route of T_024A_OP2_ROUTES) {
      const stand = storeThat({ reading: readingOf(encoded('A'), 'a') })
      await opened(stand.store, route)
      const members = stand.calls.map((call) => call.member)
      expect(members, route).not.toContain('overwriteOpenedFile')
      expect(members, route).not.toContain('writeChosenFile')
      expect(members, route).not.toContain('restoreOpenedFilePermission')
    }
  })

  it('leaves the bytes it was handed as it found them', async () => {
    const bytes = encoded('{"a":1}')
    const before = Uint8Array.from(bytes)
    await opened(storeThat({ reading: readingOf(bytes, 'a') }).store)
    expect(bytes).toEqual(before)
  })

  it('answers the same store the same way every time', async () => {
    const bytes = encoded('{"a":1}')
    const first = await opened(storeThat({ reading: readingOf(bytes, 'a') }).store)
    const second = await opened(storeThat({ reading: readingOf(bytes, 'a') }).store)
    expect(second).toEqual(first)
  })
})

describe('purity -- saveDocumentFile keeps no current value of its own (LY-5)', () => {
  it('leaves the request and its bytes as it found them', async () => {
    const bytes = bytesOf([0x89, 0x50, 0x4e, 0x47])
    const before = Uint8Array.from(bytes)
    const request = chosenRequest('png', { bytes }, 'a.png')
    const frozen = structuredClone(request) as DocumentFileSaveRequest
    await saved(storeThat({ chosen: writtenTo({ kind: 'none' }) }).store, request)
    expect(bytes).toEqual(before)
    expect(request).toEqual(frozen)
  })

  it('remembers nothing from one call to the next', async () => {
    const first = storeThat({ chosen: writtenTo({ kind: 'writable', fileName: 'chosen.json' }) })
    await saved(first.store, chosenRequest('grsJson', { text: 'A' }, 'chosen.json'))

    // A second store, and a second call, must be answered by that store alone:
    // IF-3 keeps the handle, so nothing here can carry the first call forward.
    const second = storeThat({
      overwrite: { ok: false, fault: { reason: 'noOpenedFile', what: 'nothing is open' } },
    })
    const fault = await refusedSave(second.store, overwriteRequest('grsJson', { text: 'A' }))
    expect(fault.reason).toBe('noOpenedFile')
  })

  it('asks the store, never a remembered answer, for what may be overwritten', async () => {
    // IF-3 is asked and not cached: the same request against two stores gives
    // two answers, which a held value could not do.
    const writable = storeThat({ overwrite: writtenTo({ kind: 'writable', fileName: 'a' }) })
    const lost = storeThat({ overwrite: writtenTo({ kind: 'permissionLost', fileName: 'a' }) })
    expect(await saved(writable.store, overwriteRequest('grsJson', { text: 'A' }))).toEqual({
      kind: 'writable',
      fileName: 'a',
    })
    expect(await saved(lost.store, overwriteRequest('grsJson', { text: 'A' }))).toEqual({
      kind: 'permissionLost',
      fileName: 'a',
    })
  })
})
