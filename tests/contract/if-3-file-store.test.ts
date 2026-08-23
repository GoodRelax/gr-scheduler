// Contract test: IF-3 `FileStore` -- the seam between FileGateway (Adapter,
// CP-22) and FileSystemAccessFileStore (Framework, CP-28).
//
// Table T-218 row TS-5: a contract test belongs to neither side of a seam.
// Both sides of this one are green on their own today. FileGateway's cases
// stand a hand-made store in front of it, so they measure what the gateway
// asks for; the store's cases hand it a hand-made request, so they measure what
// the store is willing to be given. Neither can see whether the question one
// side hands DOWN is a question the other side ever puts -- and that is exactly
// the obligation table T-227 row DI-4 states as a MUST. So the two halves are
// bolted together here, once, with only a stand-in BROWSER underneath, and the
// tables are read at run time rather than transcribed (Chapter 1.9, :275).
//
// The specification this file is held to:
//   T-065 IF-3   `FileStore`, declared by FileGateway, implemented by
//                FileSystemAccessFileStore, supplying the reading and writing
//                of files; the handle is held by the implementation (FR-060)
//   T-227        DI-1 .. DI-5 -- what makes two documents one and the same, and
//                when the overwrite question has to be put
//   T-037 NT-7   the manner of that question: what happens is shown, and going
//                on or calling off is chosen
//   T-066 CS-4   the consistency unit of one file operation that waits for a
//                person, and the MUST NOT on reading the current value again
//                while the answer is awaited
//   T-024        the direction column -- which forms come IN as well as go out
//   T-024a       OP-1 (the two forms admitted), OP-2 (one entry, two routes),
//                OP-11 (several handed over at once)
//   T-003 CN-5   what is written out is UTF-8 without a BOM (MUST), and
//                T-024's note forbidding a BOM "for spreadsheet compatibility"
//   FR-060       the round trip closes on the file that was opened
//   FR-023       the ceiling on an intake is stated in bytes (S-113)
//
// The Japanese headings and cells below are read out of the manuscript, not
// written here: rule 03 section 5 admits Japanese where the Japanese itself is
// what is being handled, and a table's column heading is that case.
//
// ⚠️ The environment is `node` (vitest.config.ts). Everything the browser would
// supply arrives through `FileSystemAccessEnvironment`, which the Framework
// unit declares for exactly this reason, so no DOM is needed.
//
// ---- ⛔ SEVEN CASES ARE LEFT FAILING. THEY ARE FINDINGS, NOT CHORES ---------
//
// Rule 04 section 1 forbids bending an expectation to fit the code. Two gaps on
// the far side of IF-3 account for all seven, and both are in
// `src/framework/file-system-access-file-store/file-system-access-file-store.ts`:
//
//   FINDING 1 (six cases -- DI-1, DI-2, DI-3, DI-4, and both CS-4 cases)
//     `writeChosenFile` goes from the chooser straight to the write. It never
//     reads what is standing at the destination and never calls
//     `ChosenFileWrite.askToWriteOver`, so DI-4's MUST is unreachable no matter
//     what the near side or the shell prepare. `file-gateway.ts` records the
//     same absence in a STOP note beside the member it offers.
//
//   FINDING 2 (one case -- OP-11)
//     A drop of several files keeps the first, and `firstDroppedFile`'s own
//     note says the rest are ignored -- but `readDroppedFile` answers without
//     `ignoredFileCount`, which `FileReading` defines as "none were left". So
//     the fact OP-11 puts a MUST on saying is never said.
//
// ⭐ Both were confirmed to be the product and not this harness: with the store
// temporarily made to obey the order IF-3 states, and to report the count, all
// 26 cases pass. The patch was reverted.
//
// ⚠️ ONE CASE IS PARTLY VACUOUS WHILE FINDING 1 STANDS. "DI-4 -- has nothing to
// ask about where nothing was standing" is green because nothing is ever asked
// at all, not because an empty destination is exempted. Its other assertion
// (the bytes land) is live. It becomes a real case the moment finding 1 closes.

import { describe, expect, it } from 'vitest'
import { specTable } from './spec-table'
import {
  openDocumentFile,
  saveDocumentFile,
  type ChosenFileSaveRequest,
  type DocumentIdentity,
  type ProjectIdentity,
  type SaveFileForm,
} from '../../src/adapter/file-gateway/file-gateway'
import {
  fileSystemAccessFileStore,
  type DropEvent,
  type DroppedItem,
  type FileHandle,
  type FileSystemAccessEnvironment,
  type ReadableFile,
  type WritableFileStream,
} from '../../src/framework/file-system-access-file-store/file-system-access-file-store'

const T024 = specTable('T-024')
const T227 = specTable('T-227')

// --------------------------------------------------------- the case roster --
//
// Chapter 1.9 (:275): one test walks every row of the table rather than one
// test per row. Registering at declaration time -- not from inside the case --
// keeps the roster complete even when a case fails or is skipped.

interface SeamCase {
  readonly rows: readonly string[]
  readonly title: string
}

const CASES: SeamCase[] = []

/** Declares one case, and gives back the name a failure prints. */
const seamCase = (rows: readonly string[], title: string): string => {
  CASES.push({ rows, title })
  return `${rows.join(' ')} -- ${title}`
}

// ------------------------------------------------------- the stand-in disk --

const UTF8 = new TextEncoder()

/** A fresh `ArrayBuffer` holding a copy of these bytes. */
const bufferOf = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

/** A copy of whatever a writable stream was handed, as plain bytes. */
const bytesOf = (data: BufferSource): Uint8Array =>
  Uint8Array.from(
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  )

const joined = (chunks: readonly Uint8Array[]): Uint8Array => {
  const all = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0))
  let at = 0
  for (const chunk of chunks) {
    all.set(chunk, at)
    at += chunk.byteLength
  }
  return all
}

/**
 * One place on the stand-in disk, and a record of everything done to it.
 *
 * ⭐ `null` content is a place nothing ever occupied. It is told apart from a
 * file standing empty because DI-3 turns on the destination already BEING
 * there, and both hold zero bytes.
 */
interface StandInFile {
  readonly handle: FileHandle
  content(): Uint8Array | null
  /** How many writes were closed. */
  writes(): number
}

const standInFile = (
  name: string,
  initial: Uint8Array | null,
  log: string[],
): StandInFile => {
  let content = initial
  let writes = 0

  const readable = (): ReadableFile => {
    log.push(`read ${name}`)
    const at = content ?? new Uint8Array(0)
    return {
      name,
      // ⭐ Bytes. S-113 states the intake ceiling in bytes (FR-023), so this is
      // the number the far side has to be able to report.
      size: at.byteLength,
      arrayBuffer: () => Promise.resolve(bufferOf(at)),
    }
  }

  const handle: FileHandle = {
    kind: 'file',
    name,
    getFile: () => Promise.resolve(readable()),
    createWritable: (): Promise<WritableFileStream> => {
      const chunks: Uint8Array[] = []
      log.push(`open-write ${name}`)
      return Promise.resolve({
        write: (data: BufferSource) => {
          chunks.push(bytesOf(data))
          return Promise.resolve()
        },
        close: () => {
          writes += 1
          log.push(`write ${name}`)
          content = joined(chunks)
          return Promise.resolve()
        },
        abort: () => Promise.resolve(),
      })
    },
    queryPermission: () => Promise.resolve('granted' as const),
    requestPermission: () => Promise.resolve('granted' as const),
  }

  return {
    handle,
    content: () => content,
    writes: () => writes,
  }
}

// ------------------------------------------------------ the stand-in browser --

interface StandInBrowser {
  readonly environment: FileSystemAccessEnvironment
  /** Let go of these files over the window, the way a person does. */
  drop(files: readonly StandInFile[]): Promise<void>
}

/** Lets every pending promise of the seam settle before the case looks. */
const settled = async (): Promise<void> => {
  for (let turn = 0; turn < 4; turn += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

const standInBrowser = (
  toOpen: readonly StandInFile[] | null,
  toSave: StandInFile | null,
  log: string[],
): StandInBrowser => {
  const listeners: ((event: DropEvent) => void)[] = []

  const environment: FileSystemAccessEnvironment = {
    openFilePicker:
      toOpen === null
        ? undefined
        : () => {
            log.push('chooser open')
            return Promise.resolve(toOpen.map((file) => file.handle))
          },
    saveFilePicker:
      toSave === null
        ? undefined
        : () => {
            log.push('chooser save')
            return Promise.resolve(toSave.handle)
          },
    dropSurface: {
      addEventListener: (type, listener) => {
        if (type === 'drop') listeners.push(listener)
      },
    },
  }

  return {
    environment,
    drop: async (files) => {
      const items: DroppedItem[] = files.map((file) => ({
        kind: 'file',
        // ⚠️ A drop's items are alive only while the event is being handled,
        // so this hands the file over synchronously, as a browser does.
        getAsFile: () => {
          const opened = file.handle
          return {
            name: opened.name,
            size: file.content()?.byteLength ?? 0,
            arrayBuffer: () => Promise.resolve(bufferOf(file.content() ?? new Uint8Array(0))),
          }
        },
        getAsFileSystemHandle: () => Promise.resolve(file.handle),
      }))
      const event: DropEvent = {
        preventDefault: () => undefined,
        dataTransfer: { types: ['Files'], items },
      }
      for (const listener of listeners) listener(event)
      await settled()
    },
  }
}

// ------------------------------------------------------------ the documents --
//
// ⛔ NOT `GRS JSON`. Nothing on this seam parses: the gateway hands bytes to
// whichever codec the caller chose, and the two project values DI-1 compares
// arrive as arguments. So the characters below only have to be told apart.

const MINE = 'the document this test is saving'
const SOMEBODY_ELSE = 'a file that belongs to another document'
/** ⭐ Multi-byte on purpose: S-113 counts bytes, not characters. */
const WITH_A_WIDE_CHARACTER = 'sigma Σ and a kanji 日'

const MY_IDENTITY: DocumentIdentity = {
  fileName: 'plan.json',
  projectName: 'Alpha',
  projectId: 'P-1',
}

/** What the destination's characters say about the document standing there. */
type IdentityReader = (text: string) => ProjectIdentity | null

interface AskRecord {
  /** The characters the destination was read as, in order. */
  readonly identityReads: string[]
  /** How many times NT-7's question was actually put. */
  questions: number
}

const chosenSave = (
  fields: {
    readonly text: string
    readonly form: SaveFileForm
    readonly identity: DocumentIdentity
    readonly identityOfDestination: IdentityReader
    readonly answer: boolean
  },
  record: AskRecord,
  log: string[],
): ChosenFileSaveRequest => ({
  destination: 'chosenFile',
  content: { text: fields.text },
  form: fields.form,
  suggestedFileName: fields.identity.fileName ?? 'untitled',
  identity: fields.identity,
  projectIdentityFromText: (text) => {
    record.identityReads.push(text)
    log.push('judge')
    return fields.identityOfDestination(text)
  },
  confirmOverwrite: () => {
    record.questions += 1
    log.push('ask')
    return Promise.resolve(fields.answer)
  },
})

const emptyRecord = (): AskRecord => ({ identityReads: [], questions: 0 })

/** The same project values on both sides, so DI-1 can match all three. */
const SAME_PROJECT: IdentityReader = () => ({ projectName: 'Alpha', projectId: 'P-1' })

// ==========================================================================
// Table T-227 -- walked through the whole seam
// ==========================================================================

describe('IF-3 FileStore -- table T-227, from the gateway through to the disk', () => {
  it(
    seamCase(
      ['DI-1'],
      'writes without asking when the file name and both project values match',
    ),
    async () => {
      // DI-1 (MUST): the three values are what make two documents the same, and
      // "only when all three match" is a judgement that cannot be reached
      // without looking at what is standing at the destination.
      const log: string[] = []
      const destination = standInFile(
        MY_IDENTITY.fileName ?? '',
        UTF8.encode(SOMEBODY_ELSE),
        log,
      )
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)
      const record = emptyRecord()

      const saving = await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form: 'grsJson',
            identity: MY_IDENTITY,
            identityOfDestination: SAME_PROJECT,
            answer: false,
          },
          record,
          log,
        ),
      )

      expect(record.identityReads, `DI-1: the destination was never judged (${log.join(', ')})`)
        .toHaveLength(1)
      expect(record.questions, 'DI-1: the same document was asked about').toBe(0)
      expect(saving.ok).toBe(true)
      expect(destination.content()).toEqual(UTF8.encode(MINE))
    },
  )

  it(
    seamCase(
      ['DI-2', 'DI-4'],
      'asks when either side leaves a project value out',
    ),
    async () => {
      // DI-2 (MUST NOT): a `null` on either side may not be called the same
      // document -- both columns are ones the exchange partner may omit. DI-4
      // (MUST) then requires the question.
      const log: string[] = []
      const destination = standInFile('plan.json', UTF8.encode(SOMEBODY_ELSE), log)
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)
      const record = emptyRecord()

      await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form: 'grsJson',
            identity: { fileName: 'plan.json', projectName: 'Alpha', projectId: null },
            identityOfDestination: SAME_PROJECT,
            answer: true,
          },
          record,
          log,
        ),
      )

      expect(record.questions, `DI-2/DI-4: nothing was asked (${log.join(', ')})`).toBe(1)
    },
  )

  it(
    seamCase(
      ['DI-3', 'DI-4'],
      'asks when the destination cannot be read as this format',
    ),
    async () => {
      // DI-3 (MUST NOT): a destination whose characters do not read as
      // `GRS JSON` is a destination whose owner is unknown, and an unknown
      // owner is not the same document. DI-4 then requires the question.
      const log: string[] = []
      const destination = standInFile('plan.json', UTF8.encode(SOMEBODY_ELSE), log)
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)
      const record = emptyRecord()

      await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form: 'grsJson',
            identity: MY_IDENTITY,
            identityOfDestination: () => null,
            answer: true,
          },
          record,
          log,
        ),
      )

      expect(record.questions, `DI-3/DI-4: nothing was asked (${log.join(', ')})`).toBe(1)
    },
  )

  it(
    seamCase(['DI-4'], 'puts the question exactly once, and calling off writes nothing'),
    async () => {
      // DI-4 (MUST): a destination that cannot be called the same document is
      // asked about. NT-7 of table T-037 (MUST) is the manner -- going on or
      // calling off is CHOSEN -- so an answer of "call off" that still wrote
      // would make the choice mean nothing.
      const log: string[] = []
      const standing = UTF8.encode(SOMEBODY_ELSE)
      const destination = standInFile('someone-elses.json', standing, log)
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)
      const record = emptyRecord()

      await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form: 'grsJson',
            identity: MY_IDENTITY,
            identityOfDestination: () => ({ projectName: 'Beta', projectId: 'P-2' }),
            answer: false,
          },
          record,
          log,
        ),
      )

      expect(record.questions, `DI-4: the MUST was never reached (${log.join(', ')})`).toBe(1)
      expect(destination.content(), 'DI-4/NT-7: calling off still wrote').toEqual(standing)
      expect(destination.writes()).toBe(0)
    },
  )

  it(
    seamCase(['DI-4'], 'has nothing to ask about where nothing was standing'),
    async () => {
      // DI-4 asks about "a destination that cannot be called the same
      // document". FR-096 sends only an EXISTING file to this table, so a place
      // nothing occupied is past the whole table before any row is read.
      const log: string[] = []
      const destination = standInFile('brand-new.json', null, log)
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)
      const record = emptyRecord()

      const saving = await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form: 'grsJson',
            identity: MY_IDENTITY,
            identityOfDestination: SAME_PROJECT,
            answer: false,
          },
          record,
          log,
        ),
      )

      expect(record.questions, 'DI-4: an empty destination was asked about').toBe(0)
      expect(saving.ok).toBe(true)
      expect(destination.content()).toEqual(UTF8.encode(MINE))
    },
  )

  it(
    seamCase(['DI-5'], 'never asks on the route that overwrites the opened file'),
    async () => {
      // DI-5 (MUST): the file that was opened is, by definition, this
      // document's own file. The type carries the rule -- the `openedFile` arm
      // has nowhere to put a question -- and this holds the behaviour to it:
      // no chooser is opened and the bytes land.
      const log: string[] = []
      const opened = standInFile('plan.json', UTF8.encode(SOMEBODY_ELSE), log)
      const browser = standInBrowser([opened], null, log)
      const store = fileSystemAccessFileStore(browser.environment)

      await openDocumentFile(store, 'chooser')
      const saving = await saveDocumentFile(store, {
        destination: 'openedFile',
        content: { text: MINE },
        form: 'grsJson',
      })

      expect(saving.ok, `DI-5: the overwrite failed (${log.join(', ')})`).toBe(true)
      expect(opened.content()).toEqual(UTF8.encode(MINE))
      expect(log.filter((entry) => entry === 'chooser save')).toEqual([])
    },
  )

  it('every row of table T-227 is walked by a case above (Chapter 1.9, :275)', () => {
    const walked = new Set(CASES.flatMap((one) => one.rows))
    const missing = T227.rows.map((row) => row.id).filter((id) => !walked.has(id))
    expect(missing, `table T-227 rows with no case: ${missing.join(', ')}`).toEqual([])
  })
})

// ==========================================================================
// Table T-066 CS-4 -- the consistency unit of one operation that waits
// ==========================================================================

describe('IF-3 FileStore -- CS-4 of table T-066: what is collected, and when', () => {
  it(
    seamCase(
      ['CS-4'],
      'reads the destination before the question and not again after the answer',
    ),
    async () => {
      // CS-4 (MUST NOT): while the person is answering, the current value is
      // not read again -- what would land otherwise is a mixture of the value
      // the operation started from and one that moved while it waited. At this
      // seam that means the destination is read ONCE, the question is put on
      // that reading, and the bytes that go down are the ones the caller handed
      // over before the wait began.
      const log: string[] = []
      const destination = standInFile('someone-elses.json', UTF8.encode(SOMEBODY_ELSE), log)
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)
      const record = emptyRecord()

      await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form: 'grsJson',
            identity: MY_IDENTITY,
            identityOfDestination: () => ({ projectName: 'Beta', projectId: 'P-2' }),
            answer: true,
          },
          record,
          log,
        ),
      )

      const askedAt = log.indexOf('ask')
      const wroteAt = log.indexOf('write someone-elses.json')
      expect(askedAt, `CS-4: the question was never put (${log.join(', ')})`).toBeGreaterThan(-1)
      expect(wroteAt).toBeGreaterThan(askedAt)
      // ⭐ The reading the question was asked ABOUT is the last one: a second
      // read after the answer would be the re-read CS-4 forbids.
      expect(log.lastIndexOf('read someone-elses.json')).toBeLessThan(askedAt)
      expect(destination.content()).toEqual(UTF8.encode(MINE))
    },
  )

  it(
    seamCase(['CS-4'], 'lands the bytes the operation began with, not a later reading'),
    async () => {
      // CS-4 collects "everything the operation needs from the current value"
      // AT THE MOMENT IT STARTS. The seam therefore carries the content as a
      // value: there is no member the store may call to fetch it again once the
      // question is open. This case moves the destination underneath the wait
      // and requires the answer to be about what was collected.
      const log: string[] = []
      const destination = standInFile('someone-elses.json', UTF8.encode(SOMEBODY_ELSE), log)
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)
      const record = emptyRecord()

      const saving = await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form: 'grsJson',
            identity: MY_IDENTITY,
            identityOfDestination: (text) => {
              expect(text, 'CS-4: the judgement saw characters other than the destination')
                .toBe(SOMEBODY_ELSE)
              return { projectName: 'Beta', projectId: 'P-2' }
            },
            answer: true,
          },
          record,
          log,
        ),
      )

      expect(saving.ok).toBe(true)
      expect(destination.content()).toEqual(UTF8.encode(MINE))
      expect(record.identityReads).toEqual([SOMEBODY_ELSE])
    },
  )

  // ⛔ CS-4's LANDING CLAUSE IS NOT REACHABLE FROM THIS SEAM. The row also says
  // the landing is done through `replaceDocument` (MUST), and the caller-by-
  // caller treatment is table T-230's -- RD-6 for the startup document, RD-5
  // for the autosave. Neither is observable here: IF-3 carries bytes, and no
  // member of it names a row of table T-230. Holding it would mean driving the
  // shell, and the shell's file-open path does not land at all today -- OP-3 of
  // table T-024a has no surface to ask its three-way question on. See the
  // report that accompanies this file.
})

// ==========================================================================
// Table T-003 CN-5 -- what crosses the seam is bytes
// ==========================================================================

describe('IF-3 FileStore -- CN-5 of table T-003: the encoding rule, applied once', () => {
  it(seamCase(['CN-5'], 'writes UTF-8'), async () => {
    const log: string[] = []
    const destination = standInFile('plan.json', null, log)
    const browser = standInBrowser(null, destination, log)
    const store = fileSystemAccessFileStore(browser.environment)

    await saveDocumentFile(
      store,
      chosenSave(
        {
          text: WITH_A_WIDE_CHARACTER,
          form: 'grsJson',
          identity: MY_IDENTITY,
          identityOfDestination: SAME_PROJECT,
          answer: true,
        },
        emptyRecord(),
        log,
      ),
    )

    expect(destination.content()).toEqual(UTF8.encode(WITH_A_WIDE_CHARACTER))
  })

  it(seamCase(['CN-5'], 'adds no BOM'), async () => {
    // CN-5 (MUST): what is written out carries no BOM. Table T-024's own note
    // forbids adding one "for spreadsheet compatibility" (MUST NOT) because it
    // breaks MSPDI.
    const log: string[] = []
    const destination = standInFile('plan.json', null, log)
    const browser = standInBrowser(null, destination, log)
    const store = fileSystemAccessFileStore(browser.environment)

    await saveDocumentFile(
      store,
      chosenSave(
        {
          text: WITH_A_WIDE_CHARACTER,
          form: 'grsJson',
          identity: MY_IDENTITY,
          identityOfDestination: SAME_PROJECT,
          answer: true,
        },
        emptyRecord(),
        log,
      ),
    )

    const written = destination.content() ?? new Uint8Array(0)
    expect([written[0], written[1], written[2]]).not.toEqual([0xef, 0xbb, 0xbf])
  })

  it(
    seamCase(['S-113'], 'reports the byte count of what was read, not the character count'),
    async () => {
      // FR-023 holds the intake ceiling, and `_assets/tbl-settings.md` states
      // S-113 in bytes. A count of decoded characters would let a file through
      // that the ceiling exists to stop, so the number that leaves this seam
      // has to be the one the file occupied.
      const log: string[] = []
      const bytes = UTF8.encode(WITH_A_WIDE_CHARACTER)
      const opened = standInFile('plan.json', bytes, log)
      const browser = standInBrowser([opened], null, log)
      const store = fileSystemAccessFileStore(browser.environment)

      const opening = await openDocumentFile(store, 'chooser')

      expect(opening.ok, `the open failed (${log.join(', ')})`).toBe(true)
      if (!opening.ok) return
      expect(opening.file.text).toBe(WITH_A_WIDE_CHARACTER)
      expect(bytes.byteLength).toBeGreaterThan(WITH_A_WIDE_CHARACTER.length)
      expect(opening.file.byteLength).toBe(bytes.byteLength)
      expect(opening.file.fileName).toBe('plan.json')
    },
  )
})

// ==========================================================================
// FR-060 -- which file the next overwrite goes to
// ==========================================================================

/**
 * The forms of table T-024 that come IN as well as go out.
 *
 * ⭐ Read out of the direction column rather than listed here: OP-1 of table
 * T-024a admits exactly the rows that can be opened, and FR-060's round trip
 * closes on a file that was opened. A form that only ever goes out therefore
 * cannot be the file the next overwrite goes to -- and moving a row's direction
 * in the manuscript has to break this, not be silently ignored.
 */
const FORM_OF_ROW: Readonly<Record<string, SaveFileForm>> = {
  'IO-1': 'mspdi',
  'IO-2': 'grsJson',
  'IO-3': 'svg',
  'IO-4': 'png',
  'IO-7': 'singleHtml',
}

const saveForms = T024.rows
  .filter((row) => FORM_OF_ROW[row.id] !== undefined)
  .map((row) => ({
    id: row.id,
    form: FORM_OF_ROW[row.id] as SaveFileForm,
    /** The direction cell of table T-024. 「取込」 is the way in. */
    comesIn: (row.by['方向'] ?? '').includes('取込'),
  }))

describe('IF-3 FileStore -- FR-060: the file the round trip closes on', () => {
  it('table T-024 still names all five forms this seam can write', () => {
    expect(saveForms.map((one) => one.id)).toEqual(['IO-1', 'IO-2', 'IO-3', 'IO-4', 'IO-7'])
    expect(saveForms.filter((one) => one.comesIn).map((one) => one.form).sort()).toEqual([
      'grsJson',
      'mspdi',
    ])
  })

  it.each(saveForms)(
    seamCase(
      ['IO-n'],
      'only a form the direction column lets IN becomes the file to overwrite ($id)',
    ),
    async ({ id, form, comesIn }) => {
      const log: string[] = []
      const destination = standInFile(`export-${id}.out`, null, log)
      const browser = standInBrowser(null, destination, log)
      const store = fileSystemAccessFileStore(browser.environment)

      await saveDocumentFile(
        store,
        chosenSave(
          {
            text: MINE,
            form,
            identity: MY_IDENTITY,
            identityOfDestination: SAME_PROJECT,
            answer: true,
          },
          emptyRecord(),
          log,
        ),
      )

      const state = await store.readOpenedFileState()
      expect(
        state.kind === 'none' ? 'not the overwrite target' : 'the overwrite target',
        `${id}: direction is ${comesIn ? 'in and out' : 'out only'}`,
      ).toBe(comesIn ? 'the overwrite target' : 'not the overwrite target')
    },
  )

  it.each(saveForms.filter((one) => !one.comesIn))(
    seamCase(['IO-n'], 'refuses to overwrite the opened file with an out-only form ($id)'),
    async ({ form }) => {
      // FR-060's overwrite replaces the file that was OPENED, and OP-1 admits
      // only the two forms of table T-024 whose direction lets them in. Writing
      // one of the others over it would leave a file GRS cannot read back, and
      // the next overwrite would have nowhere to go.
      const log: string[] = []
      const opened = standInFile('plan.json', UTF8.encode(SOMEBODY_ELSE), log)
      const browser = standInBrowser([opened], null, log)
      const store = fileSystemAccessFileStore(browser.environment)

      await openDocumentFile(store, 'chooser')
      const saving = await saveDocumentFile(store, {
        destination: 'openedFile',
        content: { text: MINE },
        form,
      })

      expect(saving.ok).toBe(false)
      expect(opened.content()).toEqual(UTF8.encode(SOMEBODY_ELSE))
    },
  )

  it(seamCase(['FR-060'], 'has nothing to overwrite before a file has been opened'), async () => {
    const log: string[] = []
    const browser = standInBrowser(null, null, log)
    const store = fileSystemAccessFileStore(browser.environment)

    expect((await store.readOpenedFileState()).kind).toBe('none')
    const saving = await saveDocumentFile(store, {
      destination: 'openedFile',
      content: { text: MINE },
      form: 'grsJson',
    })
    // ⛔ THE REASON IS NOT THE SPECIFICATION'S. FR-060 fixes only that the
    // overwrite goes to the file that was opened; the vocabulary of faults is
    // IF-3's own. Only the refusal is held here.
    expect(saving.ok).toBe(false)
  })

  it(seamCase(['FR-060'], 'remembers the file that was opened, by name'), async () => {
    const log: string[] = []
    const opened = standInFile('plan.json', UTF8.encode(SOMEBODY_ELSE), log)
    const browser = standInBrowser([opened], null, log)
    const store = fileSystemAccessFileStore(browser.environment)

    await openDocumentFile(store, 'chooser')
    const state = await store.readOpenedFileState()

    expect(state.kind).toBe('writable')
    expect(state.kind === 'none' ? null : state.fileName).toBe('plan.json')
  })
})

// ==========================================================================
// Table T-024a -- the way in
// ==========================================================================

describe('IF-3 FileStore -- table T-024a: the one entry and its two routes', () => {
  it(seamCase(['OP-2'], 'reads a chosen file and a dropped file through the same entry'), async () => {
    // OP-2 (MUST NOT): no second way in. The two routes differ only in how the
    // person points at the file, so both arrive through `openDocumentFile`.
    const chooserLog: string[] = []
    const chosen = standInFile('chosen.json', UTF8.encode(MINE), chooserLog)
    const chooserStore = fileSystemAccessFileStore(
      standInBrowser([chosen], null, chooserLog).environment,
    )
    const byChooser = await openDocumentFile(chooserStore, 'chooser')

    const dropLog: string[] = []
    const letGo = standInFile('dropped.json', UTF8.encode(MINE), dropLog)
    const dropBrowser = standInBrowser(null, null, dropLog)
    const dropStore = fileSystemAccessFileStore(dropBrowser.environment)
    await dropBrowser.drop([letGo])
    const byDrop = await openDocumentFile(dropStore, 'drop')

    expect(byChooser.ok, `chooser route: ${chooserLog.join(', ')}`).toBe(true)
    expect(byDrop.ok, `drop route: ${dropLog.join(', ')}`).toBe(true)
    if (!byChooser.ok || !byDrop.ok) return
    expect(byChooser.file.text).toBe(MINE)
    expect(byDrop.file.text).toBe(MINE)
  })

  it(
    seamCase(['OP-11'], 'keeps the first of several and states how many were left'),
    async () => {
      // OP-11 (MUST): the first is accepted and the rest are reported as left
      // behind. (MUST NOT) the act may not read as refused -- one file IS open
      // -- so the count rides beside the file that was opened, on the success.
      const log: string[] = []
      const first = standInFile('first.json', UTF8.encode(MINE), log)
      const second = standInFile('second.json', UTF8.encode(SOMEBODY_ELSE), log)
      const third = standInFile('third.json', UTF8.encode(SOMEBODY_ELSE), log)
      const browser = standInBrowser(null, null, log)
      const store = fileSystemAccessFileStore(browser.environment)

      await browser.drop([first, second, third])
      const opening = await openDocumentFile(store, 'drop')

      expect(opening.ok, `OP-11: the act read as refused (${log.join(', ')})`).toBe(true)
      if (!opening.ok) return
      expect(opening.file.fileName).toBe('first.json')
      expect(opening.file.text).toBe(MINE)
      expect(opening.ignoredFileCount).toBe(2)
    },
  )

  it(seamCase(['OP-11'], 'leaves nothing behind when one file arrives'), async () => {
    const log: string[] = []
    const only = standInFile('only.json', UTF8.encode(MINE), log)
    const browser = standInBrowser(null, null, log)
    const store = fileSystemAccessFileStore(browser.environment)

    await browser.drop([only])
    const opening = await openDocumentFile(store, 'drop')

    expect(opening.ok).toBe(true)
    if (!opening.ok) return
    expect(opening.ignoredFileCount).toBe(0)
  })
})
