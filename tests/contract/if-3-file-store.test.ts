// Contract test: IF-3 FileStore -- the seam between FileGateway (Adapter, CP-22) and FileSystemAccessFileStore (Framework, CP-28).

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

interface SeamCase {
  readonly rows: readonly string[]
  readonly title: string
}

const CASES: SeamCase[] = []

const seamCase = (rows: readonly string[], title: string): string => {
  CASES.push({ rows, title })
  return `${rows.join(' ')} -- ${title}`
}

const UTF8 = new TextEncoder()

const bufferOf = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

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

// WHY: null and empty content are kept apart although DI-6 (T-227) gives them
// WHY: the same answer, to prove neither is asked about, not to distinguish them.
interface StandInFile {
  readonly handle: FileHandle
  content(): Uint8Array | null
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
      // see FR-023, S-113
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

interface StandInBrowser {
  readonly environment: FileSystemAccessEnvironment
  drop(files: readonly StandInFile[]): Promise<void>
}

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
        // WHY: a drop's items live only while the event is handled, so the file
        // WHY: is handed over synchronously here, as a real browser does.
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

const MINE = 'the document this test is saving'
const SOMEBODY_ELSE = 'a file that belongs to another document'
// see S-113
const WITH_A_WIDE_CHARACTER = 'sigma Σ and a kanji 日'

const MY_IDENTITY: DocumentIdentity = {
  fileName: 'plan.json',
  projectName: 'Alpha',
  projectId: 'P-1',
}

type IdentityReader = (text: string) => ProjectIdentity | null

interface AskRecord {
  readonly identityReads: string[]
  // see NT-7
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
  // see FR-096
  extension: extensionOfForm(fields.form),
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

const SAME_PROJECT: IdentityReader = () => ({ projectName: 'Alpha', projectId: 'P-1' })

describe('IF-3 FileStore -- table T-227, from the gateway through to the disk', () => {
  it(
    seamCase(
      ['DI-1'],
      'writes without asking when the file name and both project values match',
    ),
    async () => {
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

  it(
    seamCase(
      ['DI-6'],
      'writes over a destination of no bytes in silence, and still asks where one byte stands',
    ),
    async () => {
      const sides = [
        {
          why: 'DI-6: the destination holds nothing',
          standing: new Uint8Array(0),
          asked: 0,
          decoded: 0,
        },
        {
          why: 'DI-3 then DI-4: one byte is standing there',
          standing: UTF8.encode('x'),
          asked: 1,
          decoded: 1,
        },
      ]

      for (const side of sides) {
        const log: string[] = []
        const destination = standInFile('standing.json', side.standing, log)
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
              identityOfDestination: () => null,
              answer: true,
            },
            record,
            log,
          ),
        )

        expect(record.questions, `${side.why} (${log.join(', ')})`).toBe(side.asked)
        expect(record.identityReads, side.why).toHaveLength(side.decoded)
        expect(saving.ok, side.why).toBe(true)
        expect(destination.content(), side.why).toEqual(UTF8.encode(MINE))
      }
    },
  )

  it('every row of table T-227 is walked by a case above (Chapter 1.9, :275)', () => {
    const walked = new Set(CASES.flatMap((one) => one.rows))
    const missing = T227.rows.map((row) => row.id).filter((id) => !walked.has(id))
    expect(missing, `table T-227 rows with no case: ${missing.join(', ')}`).toEqual([])
  })
})

describe('IF-3 FileStore -- CS-4 of table T-066: what is collected, and when', () => {
  it(
    seamCase(
      ['CS-4'],
      'reads the destination before the question and not again after the answer',
    ),
    async () => {
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
      expect(log.lastIndexOf('read someone-elses.json')).toBeLessThan(askedAt)
      expect(destination.content()).toEqual(UTF8.encode(MINE))
    },
  )

  it(
    seamCase(['CS-4'], 'lands the bytes the operation began with, not a later reading'),
    async () => {
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

})

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

// see T-024, OP-1, FR-060
const FORM_OF_ROW: Readonly<Record<string, SaveFileForm>> = {
  'IO-1': 'mspdi',
  'IO-2': 'grsJson',
  'IO-3': 'svg',
  'IO-4': 'png',
  'IO-7': 'singleHtml',
}

// WHY: extension is read from table T-024, never typed, so FR-096 keeps one
// WHY: source of truth; declared as a function so chosenSave can call it later.
function extensionOfForm(form: SaveFileForm): string {
  const row = T024.rows.find((one) => FORM_OF_ROW[one.id] === form)
  if (row === undefined) throw new Error(`table T-024 has no row for the form ${form}`)
  return /`([^`]+)`/.exec(row.by['拡張子'] ?? '')?.[1] ?? ''
}

const saveForms = T024.rows
  .filter((row) => FORM_OF_ROW[row.id] !== undefined)
  .map((row) => ({
    id: row.id,
    form: FORM_OF_ROW[row.id] as SaveFileForm,
    comesIn: (row.by['方向'] ?? '').includes('取込'),
  }))

describe('IF-3 FileStore -- FR-060: the file the round trip closes on', () => {
  it('table T-024 still names all five forms this seam can write', () => {
    expect([...saveForms.map((one) => one.id)].sort()).toEqual([
      'IO-1',
      'IO-2',
      'IO-3',
      'IO-4',
      'IO-7',
    ])
    expect(saveForms.filter((one) => one.comesIn).map((one) => one.form).sort()).toEqual([
      'grsJson',
      'mspdi',
    ])
    for (const one of saveForms) {
      expect(
        extensionOfForm(one.form),
        `table T-024 row ${one.id} gives the form ${one.form} no extension, so FR-096 has ` +
          'nothing to hold the written name to',
      ).not.toBe('')
    }
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

describe('IF-3 FileStore -- table T-024a: the one entry and its two routes', () => {
  it(seamCase(['OP-2'], 'reads a chosen file and a dropped file through the same entry'), async () => {
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
