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
  type ChosenFileSaveRequest,
  type ChosenFileWrite,
  type ChosenWriteDestination,
  type DocumentFileFault,
  type DocumentFileFaultReason,
  type DocumentFileSaveRequest,
  type DocumentIdentity,
  type FileReading,
  type FileStore,
  type FileStoreFault,
  type FileStoreFaultReason,
  type FileWriting,
  type OpenedDocumentFile,
  type OpenedFileState,
  type OpenRoute,
  type ProjectIdentity,
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
 * Table T-024, the two rows that reach no file. IO-6 answers to IF-5, so it may
 * not appear among the forms this component writes; IO-5 (localStorage) reaches
 * no file either. ⚠️ IO-5 used to answer to IF-4 `DocumentStore`; CR-280
 * retired the autosave and table T-065 no longer holds that row, so IO-5 now
 * names no seam at all -- table T-206 keeps its four settings and nothing else.
 */
const T_024_ROWS_THAT_ARE_NOT_FILES = [
  { id: 'IO-5', seam: null },
  { id: 'IO-6', seam: 'IF-5' },
] as const

/** OP-2 of table T-024a: the routes one entry admits, and no third. */
const T_024A_OP2_ROUTES = ['chooser', 'drop'] as const satisfies readonly OpenRoute[]

/**
 * OP-13 of table T-024a, which CR-280 added with `SK-21` of table T-036: the
 * third route the union admits. ⚠️ NOT one of OP-2's -- OP-2 still names two
 * ("ファイル選択、およびドラッグ＆ドロップ") and every case that walks those two
 * walks them, while this one opens no chooser and re-reads the file already
 * open.
 */
const T_024A_OP13_ROUTE = 'reopen' as const satisfies OpenRoute

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
  reopen: true,
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

// The three members table T-227 hangs off are filled with what a document that
// has never stood in a file carries: DI-1's identity is all `null`, DI-3 can
// read no owner out of the destination, and DI-4's question is answered "go
// ahead". ⚠️ The stand-in store these cases use never calls `askToWriteOver`,
// so none of the three is reached here; the walk of table T-227 is driven by
// `chosenSaveOf` further down, which records what each of them was asked.
const chosenRequest = (
  form: SaveFileForm,
  content: SaveFileContent,
  suggestedFileName: string,
): DocumentFileSaveRequest => ({
  destination: 'chosenFile',
  content,
  form,
  suggestedFileName,
  identity: { projectName: null, projectId: null, fileName: null },
  projectIdentityFromText: () => null,
  confirmOverwrite: () => Promise.resolve(true),
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

  it('carries the two routes of OP-2, the third of OP-13, and the four reasons IF-3 tells apart', () => {
    expect(T_024A_OP2_ROUTES).toHaveLength(2)
    expect(Object.keys(EVERY_OPEN_ROUTE).sort()).toEqual(
      [...T_024A_OP2_ROUTES, T_024A_OP13_ROUTE].sort(),
    )
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
    // ⚠️ NOT `structuredClone` of the whole request: two members of
    // `ChosenFileSaveRequest` are calls -- DI-3's reading of the destination and
    // DI-4's question -- and a function cannot be cloned. The data half is
    // copied deeply so a mutation of the bytes would show, and the two calls are
    // carried by reference, which is what "unchanged" means for a member that is
    // a call. ⛔ The two assertions below are the ones this case always made.
    const frozen = { ...request, content: structuredClone(request.content) }
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

// ===========================================================================
// Added for table T-227 (DI-1 .. DI-6), OP-11 of table T-024a and FR-061's
// MUST NOT. Written against docs/spec only; the unit's body was not read.
//
// The rows these cases answer to:
//   DI-1   same document only where the file name AND `Project.name` AND
//          `Project.id` all three match (MUST)
//   DI-2   either side `null` in `Project.name` or `Project.id` -- MUST NOT
//          call it the same document
//   DI-3   a destination already there whose content cannot be read as
//          `GRS JSON` -- MUST NOT call it the same document
//   DI-4   a destination that cannot be called the same -- ask whether it may
//          be written over (MUST). The manner is NT-7 of table T-037
//   DI-5   FR-060's route asks nothing (MUST)
//   DI-6   a destination of zero bytes: not counted as already being there,
//          and not asked about (MUST). The row states its own precedence over
//          DI-3, and gives FR-031 as the ground
//   FR-031 asking anywhere a requirement did not ask for it is forbidden
//          (MUST NOT), so a destination table T-227 calls the same is written
//          over in silence
//   OP-11  several files handed over at once: keep the first, say how many
//          were left (MUST), and MUST NOT let the act read as refused
//   FR-061 MUST NOT build the autosave key out of DI-1 -- so no identity
//          leaves this component at all
//   FR-096 one entry for the export side (MUST), one per format forbidden
// ===========================================================================

// ---------------------------------------------------------------------------
// Fixed copies of table T-227, of OP-11 and of the identity they compare.
// ---------------------------------------------------------------------------

/** Table T-227, its rows and the subject of each. */
const T_227_ROWS = [
  { row: 'DI-1', subject: 'how the same document is recognised' },
  { row: 'DI-2', subject: 'what null means' },
  { row: 'DI-3', subject: 'a destination that cannot be read' },
  { row: 'DI-4', subject: 'the overwrite question' },
  { row: 'DI-5', subject: 'overwrite-saving the file that was opened' },
  { row: 'DI-6', subject: 'a destination of zero bytes' },
] as const

/** The document being written, with all three of DI-1's values present. */
const THIS_DOCUMENT: DocumentIdentity = {
  fileName: 'plan-a.json',
  projectName: 'Bridge Renewal',
  projectId: 'P-001',
}

/** What DI-1 reads out of the destination when the two are one and the same. */
const SAME_PROJECT: ProjectIdentity = {
  projectName: THIS_DOCUMENT.projectName,
  projectId: THIS_DOCUMENT.projectId,
}

/**
 * Multi-byte on purpose: DI-3 reads the destination through CN-5's encoding,
 * and a case that only ever carries ASCII cannot tell one decoding from another.
 */
const DESTINATION_TEXT = '{"schemaVersion":"2026-08-18","name":"\u6a4b\u306e\u66f4\u65b0"}'

/**
 * Table T-227 as a roster: one row per way the destination can stand to the
 * document being written, and whether DI-1 .. DI-3 leave it the SAME document.
 *
 * `destinationProject` is what DI-3's reading of the destination yields, with
 * `null` standing for the destination DI-3 describes -- one whose content is
 * not `GRS JSON`.
 */
const T_227_SAMENESS = [
  {
    row: 'DI-1',
    why: 'the file name and both project values all match',
    document: THIS_DOCUMENT,
    destinationFileName: 'plan-a.json',
    destinationProject: SAME_PROJECT,
    isSame: true,
  },
  {
    row: 'DI-1',
    why: 'the two project values match but the file name does not',
    document: THIS_DOCUMENT,
    destinationFileName: 'plan-b.json',
    destinationProject: SAME_PROJECT,
    isSame: false,
  },
  {
    row: 'DI-1',
    why: 'the file name and the id match but Project.name does not',
    document: THIS_DOCUMENT,
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: 'Tunnel Renewal', projectId: 'P-001' },
    isSame: false,
  },
  {
    row: 'DI-1',
    why: 'the file name and the name match but Project.id does not',
    document: THIS_DOCUMENT,
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: 'Bridge Renewal', projectId: 'P-002' },
    isSame: false,
  },
  {
    row: 'DI-2',
    why: 'Project.name is null on the destination side',
    document: THIS_DOCUMENT,
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: null, projectId: 'P-001' },
    isSame: false,
  },
  {
    row: 'DI-2',
    why: 'Project.id is null on the destination side',
    document: THIS_DOCUMENT,
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: 'Bridge Renewal', projectId: null },
    isSame: false,
  },
  {
    row: 'DI-2',
    why: 'Project.name is null on the document side',
    document: { fileName: 'plan-a.json', projectName: null, projectId: 'P-001' },
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: 'Bridge Renewal', projectId: 'P-001' },
    isSame: false,
  },
  {
    row: 'DI-2',
    why: 'Project.id is null on the document side',
    document: { fileName: 'plan-a.json', projectName: 'Bridge Renewal', projectId: null },
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: 'Bridge Renewal', projectId: 'P-001' },
    isSame: false,
  },
  {
    row: 'DI-2',
    why: 'Project.name is null on BOTH sides -- equal is still not the same',
    document: { fileName: 'plan-a.json', projectName: null, projectId: 'P-001' },
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: null, projectId: 'P-001' },
    isSame: false,
  },
  {
    row: 'DI-2',
    why: 'Project.id is null on BOTH sides -- equal is still not the same',
    document: { fileName: 'plan-a.json', projectName: 'Bridge Renewal', projectId: null },
    destinationFileName: 'plan-a.json',
    destinationProject: { projectName: 'Bridge Renewal', projectId: null },
    isSame: false,
  },
  {
    row: 'DI-1',
    why: 'the document has never been in a file, so its name matches nothing',
    document: { fileName: null, projectName: 'Bridge Renewal', projectId: 'P-001' },
    destinationFileName: 'plan-a.json',
    destinationProject: SAME_PROJECT,
    isSame: false,
  },
  {
    row: 'DI-3',
    why: 'the destination is there but cannot be read as GRS JSON',
    document: THIS_DOCUMENT,
    destinationFileName: 'plan-a.json',
    destinationProject: null,
    isSame: false,
  },
] as const satisfies readonly {
  readonly row: string
  readonly why: string
  readonly document: DocumentIdentity
  readonly destinationFileName: string
  readonly destinationProject: ProjectIdentity | null
  readonly isSame: boolean
}[]

/**
 * OP-11 of table T-024a: how many files came in the same hand-over and were
 * left behind. A store that says nothing left nothing, which `FileReading`
 * states, so the absent case is one of the rows.
 */
const OP_11_COUNTS = [
  { why: 'one file, so the store counts nothing', reported: undefined, told: 0 },
  { why: 'one file, and the store says so', reported: 0, told: 0 },
  { why: 'two arrived, one was left', reported: 1, told: 1 },
  { why: 'a whole folder was dropped', reported: 11, told: 11 },
] as const

// ---------------------------------------------------------------------------
// A stand-in for IF-3 that plays `writeChosenFile` the way its own note fixes:
// point at the destination, read what is there, ask `askToWriteOver`, and write
// only on a `true`.
// ---------------------------------------------------------------------------

interface AskingStandIn {
  readonly store: FileStore
  readonly calls: readonly StoreCall[]
  /** Every answer `askToWriteOver` gave, in the order it gave them. */
  readonly permissions: readonly boolean[]
}

/**
 * IF-3's own wording: a `false` answer is `cancelled`, not a failure -- the
 * person called the write off exactly as they may call the chooser off.
 */
const CANCELLED_BY_THE_ANSWER: FileStoreFault = {
  reason: 'cancelled',
  what: 'the overwrite question was answered no, so nothing was written',
}

function storeAt(
  destination: ChosenWriteDestination,
  onWrite: FileWriting = writtenTo({ kind: 'none' }),
): AskingStandIn {
  const calls: StoreCall[] = []
  const permissions: boolean[] = []
  const store: FileStore = {
    readFileToOpen: async (route: OpenRoute): Promise<FileReading> => {
      calls.push({ member: 'readFileToOpen', argument: route })
      return { ok: false, fault: UNCONFIGURED }
    },
    readOpenedFileState: async (): Promise<OpenedFileState> => {
      calls.push({ member: 'readOpenedFileState', argument: undefined })
      return { kind: 'none' }
    },
    restoreOpenedFilePermission: async (): Promise<OpenedFileState> => {
      calls.push({ member: 'restoreOpenedFilePermission', argument: undefined })
      return { kind: 'none' }
    },
    overwriteOpenedFile: async (bytes: Uint8Array): Promise<FileWriting> => {
      calls.push({ member: 'overwriteOpenedFile', argument: bytes })
      return onWrite
    },
    writeChosenFile: async (write: ChosenFileWrite): Promise<FileWriting> => {
      calls.push({ member: 'writeChosenFile', argument: write })
      const mayWrite = await write.askToWriteOver(destination)
      permissions.push(mayWrite)
      if (!mayWrite) return { ok: false, fault: CANCELLED_BY_THE_ANSWER }
      calls.push({ member: 'putTheBytesDown', argument: write.bytes })
      return onWrite
    },
  }
  return { store, calls, permissions }
}

const occupiedBy = (fileName: string, text: string): ChosenWriteDestination => ({
  kind: 'occupied',
  fileName,
  bytes: encoded(text),
})

const NOTHING_THERE: ChosenWriteDestination = { kind: 'empty' }

interface ChosenSave {
  readonly request: DocumentFileSaveRequest
  /** Every text DI-3's reading was handed, in order. */
  readonly textsRead: readonly string[]
  /** How many times DI-4's question was put to the person. */
  readonly timesAsked: () => number
}

function chosenSaveOf(
  identity: DocumentIdentity,
  destinationProject: ProjectIdentity | null,
  answer: boolean,
  overrides: {
    readonly form?: SaveFileForm
    readonly content?: SaveFileContent
    readonly suggestedFileName?: string
  } = {},
): ChosenSave {
  const textsRead: string[] = []
  let asked = 0
  const request: ChosenFileSaveRequest = {
    destination: 'chosenFile',
    content: overrides.content ?? { text: '{"schemaVersion":"2026-08-18"}' },
    form: overrides.form ?? 'grsJson',
    suggestedFileName: overrides.suggestedFileName ?? 'plan-a.json',
    identity,
    projectIdentityFromText: (text: string): ProjectIdentity | null => {
      textsRead.push(text)
      return destinationProject
    },
    confirmOverwrite: async (): Promise<boolean> => {
      asked += 1
      return answer
    },
  }
  return { request, textsRead, timesAsked: () => asked }
}

const readingWithIgnored = (
  bytes: Uint8Array,
  fileName: string,
  ignoredFileCount: number | undefined,
): FileReading =>
  ignoredFileCount === undefined
    ? { ok: true, file: { bytes, fileName } }
    : { ok: true, file: { bytes, fileName }, ignoredFileCount }

// ---------------------------------------------------------------------------

describe('the rosters for table T-227 and for OP-11 are the ones the tables state', () => {
  it('GIVEN table T-227 WHEN its rows are counted THEN there are six, DI-1 .. DI-6', () => {
    expect(T_227_ROWS).toHaveLength(6)
    expect(T_227_ROWS.map((entry) => entry.row)).toEqual([
      'DI-1',
      'DI-2',
      'DI-3',
      'DI-4',
      'DI-5',
      'DI-6',
    ])
  })

  it('GIVEN the sameness roster WHEN it is counted THEN one row is the same document and eleven are not', () => {
    // A walk that never met the SAME case would prove only that a question is
    // always asked, which FR-031 forbids just as flatly as DI-4 requires one.
    expect(T_227_SAMENESS.filter((row) => row.isSame)).toHaveLength(1)
    expect(T_227_SAMENESS.filter((row) => !row.isSame)).toHaveLength(11)
    expect(new Set(T_227_SAMENESS.map((row) => row.row))).toEqual(new Set(['DI-1', 'DI-2', 'DI-3']))
  })

  it('GIVEN OP-11 WHEN the roster is counted THEN the absent count and three stated ones are in it', () => {
    expect(OP_11_COUNTS).toHaveLength(4)
    expect(OP_11_COUNTS.filter((row) => row.reported === undefined)).toHaveLength(1)
  })
})

describe('table T-227 DI-1 / DI-2 / DI-3 -- when a destination is this same document', () => {
  it('GIVEN a destination already holding a file WHEN a chosen write is prepared THEN the question is put only where DI-1 .. DI-3 refuse to call it the same (one case walks the roster)', async () => {
    for (const row of T_227_SAMENESS) {
      const save = chosenSaveOf(row.document, row.destinationProject, true)
      const stand = storeAt(occupiedBy(row.destinationFileName, DESTINATION_TEXT))

      const result = await saveDocumentFile(stand.store, save.request)

      expect(save.timesAsked(), `${row.row}: ${row.why}`).toBe(row.isSame ? 0 : 1)
      expect(stand.permissions, `${row.row}: ${row.why}`).toEqual([true])
      expect(result.ok, `${row.row}: ${row.why}`).toBe(true)
    }
  })

  it('GIVEN a destination table T-227 calls this same document WHEN it is written THEN it is written over in silence (DI-4 asks only where it is not the same; FR-031 MUST NOT)', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, SAME_PROJECT, false)
    const stand = storeAt(occupiedBy('plan-a.json', DESTINATION_TEXT))

    const result = await saveDocumentFile(stand.store, save.request)

    // `confirmOverwrite` here would answer `false`; a write that went ahead
    // proves the question was never put.
    expect(save.timesAsked()).toBe(0)
    expect(stand.permissions).toEqual([true])
    expect(stand.calls.map((call) => call.member)).toEqual(['writeChosenFile', 'putTheBytesDown'])
    expect(result.ok).toBe(true)
  })

  it('GIVEN a destination that is already there WHEN DI-3 judges it THEN its bytes are read once, by CN-5 encoding', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, SAME_PROJECT, true)
    const stand = storeAt(occupiedBy('plan-a.json', DESTINATION_TEXT))

    await saveDocumentFile(stand.store, save.request)

    expect(save.textsRead).toEqual([DESTINATION_TEXT])
  })

  it('GIVEN nothing at the destination WHEN a chosen write happens THEN no question is put (table T-227 has none to ask; FR-031 MUST NOT)', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, SAME_PROJECT, false)
    const stand = storeAt(NOTHING_THERE)

    const result = await saveDocumentFile(stand.store, save.request)

    expect(save.timesAsked()).toBe(0)
    expect(save.textsRead).toEqual([])
    expect(stand.permissions).toEqual([true])
    expect(result.ok).toBe(true)
  })

  it('GIVEN a destination whose bytes are not CN-5 encoded at all WHEN it is judged THEN it is not this document and the question is put (DI-3, DI-4 MUST)', async () => {
    // DI-3: a destination whose content cannot be read as `GRS JSON` MUST NOT
    // be called the same document, and DI-4 then puts a MUST on asking. Bytes
    // that CN-5's encoding does not admit cannot be that JSON by any reading.
    const save = chosenSaveOf(THIS_DOCUMENT, null, true)
    const stand = storeAt({
      kind: 'occupied',
      fileName: 'plan-a.json',
      bytes: bytesOf([0xff, 0xfe, 0x00]),
    })

    const result = await saveDocumentFile(stand.store, save.request)

    expect(save.timesAsked()).toBe(1)
    expect(result.ok).toBe(true)
  })

  it('GIVEN a chosen write WHEN nothing at all is being written THEN the destination is still judged (the empty document case)', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, null, true, { content: { text: '' } })
    const stand = storeAt(occupiedBy('plan-a.json', DESTINATION_TEXT))

    const result = await saveDocumentFile(stand.store, save.request)

    expect(save.timesAsked()).toBe(1)
    expect(result.ok).toBe(true)
  })
})

describe('table T-227 DI-6 -- a destination of zero bytes, and the row it outranks', () => {
  it('GIVEN a destination the store calls occupied but holding no bytes WHEN table T-227 is applied THEN nothing is asked and the bytes go down (DI-6 MUST, over DI-3)', async () => {
    // ⭐ THE ORDER IS THE WHOLE CASE. DI-6 states its own precedence over DI-3,
    // and DI-3 is the row that refuses a destination it cannot read as
    // `GRS JSON`. No bytes decode as that, so DI-3 would refuse every zero-byte
    // destination and DI-4 would then put the question DI-6 forbids. The row
    // can therefore only be obeyed by measuring the destination BEFORE trying
    // to decode it, and this case is what holds the code to that order.
    //
    // ⚠️ The stand-in reports `occupied`, not `empty`, on purpose: that is the
    // arm on which the two rows collide, and the only arm a near side can get
    // wrong. The other arm is `NOTHING_THERE` in the block above, and neither
    // store is wrong -- IF-3 asks no store to tell a file a save chooser just
    // created from one that was already standing empty, which is exactly the
    // pair DI-6 says cannot be told apart.
    //
    // The reader is set to refuse (DI-3's answer) and the person's answer is
    // "call it off", so a question that WAS put would show in every assertion
    // below rather than in one.
    const save = chosenSaveOf(THIS_DOCUMENT, null, false)
    const stand = storeAt(occupiedBy('plan-a.json', ''))

    const result = await saveDocumentFile(stand.store, save.request)

    // This one is DI-6's own MUST, and nothing else in the case is.
    expect(save.timesAsked()).toBe(0)
    // ⛔ STRICTER THAN THE ROW, DELIBERATELY, AND THE SPECIFICATION IS SILENT
    // ON IT. DI-6 fixes the OUTCOME -- not counted as already being there, not
    // asked about -- and no MUST forbids reading the destination anyway and
    // then discarding what came back. So an implementation that decoded first
    // and let DI-6 win afterwards would satisfy the row and fail this line.
    // ⭐ It is asserted regardless because the outcome alone cannot tell "DI-6
    // was read first" from "DI-3 was read and then overruled", and DI-6 states
    // a PRECEDENCE, which is a claim about order that has no other observable.
    // If a ruling says a pointless read is admissible, this line is the one to
    // drop -- not the one above it.
    expect(save.textsRead).toEqual([])
    expect(stand.permissions).toEqual([true])
    expect(stand.calls.map((call) => call.member)).toEqual(['writeChosenFile', 'putTheBytesDown'])
    expect(result.ok).toBe(true)
  })

  it('GIVEN a destination holding one single byte that is not GRS JSON WHEN it is judged THEN the question is put (DI-3 did not change; DI-6 turns on the count, not on being unreadable)', async () => {
    // The sibling of the case above, one byte away from it. DI-6 turns on the
    // byte count alone; being unreadable is DI-3's condition and still reaches
    // DI-4's MUST. A code path that read DI-6 as "unreadable means let it
    // through" would pass the case above and fail this one.
    const save = chosenSaveOf(THIS_DOCUMENT, null, true)
    const stand = storeAt(occupiedBy('plan-a.json', 'x'))

    const result = await saveDocumentFile(stand.store, save.request)

    expect(save.textsRead).toEqual(['x'])
    expect(save.timesAsked()).toBe(1)
    expect(stand.permissions).toEqual([true])
    expect(result.ok).toBe(true)
  })

  it('GIVEN destinations of zero and of one byte WHEN each is written THEN the boundary DI-6 draws sits at zero (one case walks both sides)', async () => {
    for (const side of [
      { why: 'zero bytes -- DI-6 applies', text: '', asked: 0 },
      { why: 'one byte -- DI-3 applies', text: 'x', asked: 1 },
    ]) {
      const save = chosenSaveOf(THIS_DOCUMENT, null, true)
      const stand = storeAt(occupiedBy('plan-a.json', side.text))

      const result = await saveDocumentFile(stand.store, save.request)

      expect(save.timesAsked(), side.why).toBe(side.asked)
      expect(result.ok, side.why).toBe(true)
    }
  })
})

describe('table T-227 DI-4 -- the overwrite question and the answer to it', () => {
  it('GIVEN a destination that is not this document WHEN the person says go on THEN the bytes are put down (DI-4 MUST)', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, null, true)
    const stand = storeAt(occupiedBy('someone-elses.json', DESTINATION_TEXT))

    const result = await saveDocumentFile(stand.store, save.request)

    expect(save.timesAsked()).toBe(1)
    expect(stand.permissions).toEqual([true])
    expect(stand.calls.map((call) => call.member)).toEqual(['writeChosenFile', 'putTheBytesDown'])
    expect(result.ok).toBe(true)
  })

  it('GIVEN a destination that is not this document WHEN the person calls it off THEN nothing is written (the error path)', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, null, false)
    const stand = storeAt(occupiedBy('someone-elses.json', DESTINATION_TEXT))

    const result = await saveDocumentFile(stand.store, save.request)

    expect(save.timesAsked()).toBe(1)
    expect(stand.permissions).toEqual([false])
    expect(stand.calls.map((call) => call.member)).toEqual(['writeChosenFile'])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fault.reason).toBe('cancelled')
  })

  it('GIVEN one chosen write WHEN the destination is not this document THEN the question is put exactly once, before anything is written', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, null, true)
    const stand = storeAt(occupiedBy('someone-elses.json', DESTINATION_TEXT))

    await saveDocumentFile(stand.store, save.request)

    expect(save.timesAsked()).toBe(1)
    const members = stand.calls.map((call) => call.member)
    expect(members.indexOf('putTheBytesDown')).toBeGreaterThan(members.indexOf('writeChosenFile'))
  })

  it('GIVEN two chosen writes in a row WHEN each meets a destination that is not this document THEN each is asked about on its own', async () => {
    for (const answer of [true, false]) {
      const save = chosenSaveOf(THIS_DOCUMENT, null, answer)
      const stand = storeAt(occupiedBy('someone-elses.json', DESTINATION_TEXT))
      await saveDocumentFile(stand.store, save.request)
      expect(save.timesAsked(), `answer ${String(answer)}`).toBe(1)
      expect(stand.permissions, `answer ${String(answer)}`).toEqual([answer])
    }
  })

  it('GIVEN any of table T-024 file forms WHEN it lands on a destination that is not this document THEN the question is put all the same (one case walks table T-024)', async () => {
    for (const row of T_024_FILE_ROWS) {
      const save = chosenSaveOf(THIS_DOCUMENT, null, true, {
        form: row.form,
        content: { bytes: bytesOf([1, 2, 3]) },
      })
      const stand = storeAt(occupiedBy('someone-elses.json', DESTINATION_TEXT))

      const result = await saveDocumentFile(stand.store, save.request)

      expect(save.timesAsked(), row.id).toBe(1)
      expect(result.ok, row.id).toBe(true)
    }
  })
})

describe('table T-227 DI-5 -- FR-060 route asks nothing', () => {
  it('GIVEN a document saved over the file it was opened from WHEN it is written THEN no chosen write and no question happen (DI-5 MUST)', async () => {
    const stand = storeAt(
      occupiedBy('someone-elses.json', DESTINATION_TEXT),
      writtenTo({ kind: 'writable', fileName: 'plan-a.json' }),
    )

    const result = await saveDocumentFile(
      stand.store,
      overwriteRequest('grsJson', { text: '{"schemaVersion":"2026-08-18"}' }),
    )

    expect(stand.calls.map((call) => call.member)).toEqual(['overwriteOpenedFile'])
    expect(stand.permissions).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('GIVEN FR-060 route WHEN the request is inspected THEN it carries no identity and no question to put (DI-5)', () => {
    // DI-5's reason: were the question put here it would fire every time the
    // project was renamed. The arm has nowhere to carry a renaming to compare.
    const request = overwriteRequest('grsJson', { text: 'A' })
    expect(Object.keys(request).sort()).toEqual(['content', 'destination', 'form'])
  })

  it('GIVEN both forms that come in WHEN each is overwrite-saved THEN neither is asked about (one case walks the two)', async () => {
    for (const row of T_024_FILE_ROWS.filter((one) => one.comesIn)) {
      const stand = storeAt(NOTHING_THERE, writtenTo({ kind: 'writable', fileName: 'plan-a.json' }))
      await saveDocumentFile(stand.store, overwriteRequest(row.form, { text: 'A' }))
      expect(stand.permissions, row.id).toEqual([])
    }
  })
})

describe('OP-11 of table T-024a -- several files handed over at once', () => {
  it('GIVEN a hand-over the store left files out of WHEN it is read THEN the number left is told (one case walks the roster, MUST)', async () => {
    for (const row of OP_11_COUNTS) {
      const stand = storeThat({
        reading: readingWithIgnored(encoded('{"a":1}'), 'first.json', row.reported),
      })

      const result = await openDocumentFile(stand.store, 'drop')

      expect(result.ok, row.why).toBe(true)
      if (result.ok) expect(result.ignoredFileCount, row.why).toBe(row.told)
    }
  })

  it('GIVEN files were left behind WHEN the read comes back THEN the one that WAS opened comes with it (MUST NOT read as refused)', async () => {
    const stand = storeThat({
      reading: readingWithIgnored(encoded('{"a":1}'), 'first.json', 4),
    })

    const result = await openDocumentFile(stand.store, 'drop')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.file.fileName).toBe('first.json')
      expect(result.file.text).toBe('{"a":1}')
      expect(result.ignoredFileCount).toBe(4)
    }
  })

  it('GIVEN the chooser route WHEN files were left behind THEN the count rides out the same way (OP-2 has one entry, not one per route)', async () => {
    const stand = storeThat({
      reading: readingWithIgnored(encoded('{"a":1}'), 'first.json', 2),
    })

    const result = await openDocumentFile(stand.store, 'chooser')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.ignoredFileCount).toBe(2)
  })

  it('GIVEN the read was refused WHEN the answer comes back THEN it carries no count at all (one case walks the four reasons)', async () => {
    for (const reason of storeReasons) {
      const stand = storeThat({
        reading: { ok: false, fault: { reason, what: `the store said ${reason}` } },
      })

      const result = await openDocumentFile(stand.store, 'drop')

      expect(result.ok, reason).toBe(false)
      expect(Object.keys(result).sort(), reason).toEqual(['fault', 'ok'])
    }
  })

  it('GIVEN the OP-11 count WHEN it is carried THEN no list of the names that were left goes with it (NT-5 asks the fact, not the names)', async () => {
    const stand = storeThat({
      reading: readingWithIgnored(encoded('{"a":1}'), 'first.json', 3),
    })

    const result = await openDocumentFile(stand.store, 'drop')

    expect(Object.keys(result).sort()).toEqual(['file', 'ignoredFileCount', 'ok'])
  })
})

describe('FR-061 (MUST NOT) -- no identity leaves this component to become an autosave key', () => {
  it('GIVEN a file was opened WHEN the answer comes back THEN it carries the text, the byte count and the name, and no project values', async () => {
    const stand = storeThat({ reading: readingOf(encoded('{"a":1}'), 'plan-a.json') })

    const file = await opened(stand.store)

    expect(Object.keys(file).sort()).toEqual(['byteLength', 'fileName', 'text'])
  })

  it('GIVEN a chosen write that was handed an identity WHEN it succeeds THEN the identity is nowhere in the answer', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, SAME_PROJECT, true)
    const stand = storeAt(
      occupiedBy('plan-a.json', DESTINATION_TEXT),
      writtenTo({ kind: 'writable', fileName: 'plan-a.json' }),
    )

    const result = await saveDocumentFile(stand.store, save.request)

    expect(result.ok).toBe(true)
    expect(Object.keys(result).sort()).toEqual(['ok', 'openedFile'])
    expect(JSON.stringify(result)).not.toContain(String(THIS_DOCUMENT.projectId))
    expect(JSON.stringify(result)).not.toContain(String(THIS_DOCUMENT.projectName))
  })

  it('GIVEN the identity it was handed WHEN a chosen write runs THEN the identity is left as it was found', async () => {
    const identity: DocumentIdentity = { ...THIS_DOCUMENT }
    const before = structuredClone(identity)
    const save = chosenSaveOf(identity, null, true)
    const stand = storeAt(occupiedBy('someone-elses.json', DESTINATION_TEXT))

    await saveDocumentFile(stand.store, save.request)

    expect(identity).toEqual(before)
  })
})

describe('FR-096 -- one entry for the export side, table T-227 hanging off it', () => {
  it('GIVEN the two destinations WHEN each is written THEN both go through the one published function (MUST; one per format MUST NOT)', async () => {
    const overwrite = storeAt(
      NOTHING_THERE,
      writtenTo({ kind: 'writable', fileName: 'plan-a.json' }),
    )
    const chosen = chosenSaveOf(THIS_DOCUMENT, SAME_PROJECT, true)
    const chosenStand = storeAt(occupiedBy('plan-a.json', DESTINATION_TEXT))

    const written = await saveDocumentFile(overwrite.store, overwriteRequest('grsJson', { text: 'A' }))
    const exported = await saveDocumentFile(chosenStand.store, chosen.request)

    expect(written.ok).toBe(true)
    expect(exported.ok).toBe(true)
    expect(Object.keys(fileGatewayModule).sort()).toEqual(['openDocumentFile', 'saveDocumentFile'])
  })

  it('GIVEN a chosen write WHEN the store is handed the request THEN the suggested name and the T-227 question travel together', async () => {
    const save = chosenSaveOf(THIS_DOCUMENT, null, true, { suggestedFileName: 'export-1.json' })
    const stand = storeAt(occupiedBy('someone-elses.json', DESTINATION_TEXT))

    await saveDocumentFile(stand.store, save.request)

    const write = argumentOf(stand.calls, 'writeChosenFile') as ChosenFileWrite
    expect(write.suggestedFileName).toBe('export-1.json')
    expect(typeof write.askToWriteOver).toBe('function')
  })
})
