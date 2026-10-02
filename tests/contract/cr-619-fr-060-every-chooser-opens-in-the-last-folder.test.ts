// CR-619 spec-only tests: FR-060 / S-452 / IF-3 -- every file chooser opens in the folder last read or written.

import { afterEach, describe, expect, it } from 'vitest'

import type { ChosenFileWrite, FileStore } from '../../src/adapter/file-gateway/file-store'
import { fileSystemAccessFileStore } from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import {
  DESIGN,
  REQUIREMENTS,
  UTF8,
  settingRow,
  standInBrowser,
  standInFile,
  type StandInBrowser,
  type StandInFile,
} from './cr-610-file-flow-stage'

const PICKER_ID = String(settingRow('S-452')['default']['lit']).replace(/^'|'$/g, '')

const ONE_FOLDER = 'ファイルを選ばせる面は、目的を問わず、同じ 1 つのフォルダから開くこと（MUST）'
const LAST_HANDLE =
  '最後のそのファイルの取っ手を面に渡し、そのファイルのフォルダから開くこと（MUST）'
const NO_KNOWN_FOLDER = '起動した直後の面に、既知のフォルダ（`documents` など）を `startIn` として渡してはならない（MUST NOT）'
const CANCEL_KEEPS = '人が面を取り消したときは、渡す取っ手を変えない'
const TWO_HANDLES = '上書きする先と、選ばせる面に渡す最後に読み書きしたファイルの 2 つであり、どちらも同じ起動のあいだだけ持つ'

const BYTES = UTF8.encode('{"schemaVersion":"x"}')

interface Bench {
  readonly browser: StandInBrowser
  readonly store: FileStore
  file(name: string): StandInFile
  openChosen(file: StandInFile | 'closed'): Promise<void>
  overlay(file: StandInFile): Promise<void>
  writeChosen(file: StandInFile, extension: string, becomesOpened: boolean): Promise<void>
  lastOpen(): Record<string, unknown>
  lastSave(): Record<string, unknown>
}

function bench(): Bench {
  const browser = standInBrowser()
  const store = fileSystemAccessFileStore(browser.environment)
  const log: string[] = []
  const request = (file: StandInFile, extension: string, becomesOpened: boolean): ChosenFileWrite => ({
    bytes: BYTES,
    suggestedFileName: file.name,
    extension,
    shouldBecomeOpenedFile: becomesOpened,
    askToWriteOver: () => Promise.resolve(true),
  })
  const lastOf = (all: Record<string, unknown>[], what: string): Record<string, unknown> => {
    const found = all[all.length - 1]
    if (found === undefined) throw new Error(`no ${what} chooser was opened`)
    return found
  }
  return {
    browser,
    store,
    file: (name) => standInFile(name, BYTES, log),
    openChosen: async (file) => {
      browser.toOpen.push(file)
      const reading = await store.readFileToOpen('chooser')
      if (reading.ok) store.adoptFileReadToOpen()
    },
    overlay: async (file) => {
      browser.toOpen.push(file)
      await store.readFileToOpen('baseline')
    },
    writeChosen: async (file, extension, becomesOpened) => {
      browser.toSave.push(file)
      await store.writeChosenFile(request(file, extension, becomesOpened))
    },
    lastOpen: () => lastOf(browser.openOptions, 'open'),
    lastSave: () => lastOf(browser.saveOptions, 'save'),
  }
}

describe('FR-060 / IF-3 / S-452 -- the manuscript still says it', () => {
  it('FR-060 opens every chooser in one folder, from the last handle, never a known folder at start', () => {
    expect(REQUIREMENTS).toContain(ONE_FOLDER)
    expect(REQUIREMENTS).toContain(LAST_HANDLE)
    expect(REQUIREMENTS).toContain(NO_KNOWN_FOLDER)
    expect(REQUIREMENTS).toContain(CANCEL_KEEPS)
    expect(DESIGN).toContain(TWO_HANDLES)
  })

  it('S-452 is a picker id the browser accepts: 32 characters or fewer of letters, digits, - and _', () => {
    expect(PICKER_ID).toMatch(/^[A-Za-z0-9_-]{1,32}$/)
  })
})

describe('FR-060 (MUST) / S-452 -- every chooser is given the one id', () => {
  it('FR-060 / S-452: the first open chooser is given the S-452 id and no startIn (MUST NOT)', async () => {
    const one = bench()
    await one.openChosen('closed')
    expect(one.lastOpen()['id'], 'FR-060: the open chooser was not given S-452').toBe(PICKER_ID)
    expect(Object.keys(one.lastOpen())).not.toContain('startIn')
  })

  it('FR-060 / S-452: the first save chooser is given the S-452 id and no startIn (MUST NOT)', async () => {
    const one = bench()
    await one.writeChosen(one.file('a.json'), '.json', true)
    expect(one.lastSave()['id'], 'FR-060: the save chooser was not given S-452').toBe(PICKER_ID)
    expect(Object.keys(one.lastSave())).not.toContain('startIn')
  })

  it('FR-060: open, overlay, save and every export are given the same single id', async () => {
    const one = bench()
    await one.openChosen(one.file('a.json'))
    await one.overlay(one.file('b.json'))
    await one.writeChosen(one.file('c.json'), '.json', true)
    for (const extension of ['.xml', '.svg', '.png', '.html']) {
      await one.writeChosen(one.file(`d${extension}`), extension, false)
    }
    const ids = [...one.browser.openOptions, ...one.browser.saveOptions].map((options) => options['id'])
    expect(ids).toHaveLength(7)
    expect(new Set(ids), 'FR-060: the choosers were not given one id').toEqual(new Set([PICKER_ID]))
  })
})

describe('FR-060 (MUST) -- the chooser opens where the last file was read or written', () => {
  it('FR-060: after a file is opened through the chooser, the save chooser starts in it', async () => {
    const one = bench()
    const read = one.file('a.json')
    await one.openChosen(read)
    await one.writeChosen(one.file('b.json'), '.json', true)
    expect(one.lastSave()['startIn'], 'FR-060: the save chooser was not given the file read').toBe(read.handle)
  })

  it('FR-060: after a save through the chooser, the open chooser starts in the file written', async () => {
    const one = bench()
    const written = one.file('b.json')
    await one.writeChosen(written, '.json', true)
    await one.openChosen('closed')
    expect(one.lastOpen()['startIn']).toBe(written.handle)
  })

  it('FR-060 / OP-9: an overlay read moves the folder but not the save target', async () => {
    const one = bench()
    await one.openChosen(one.file('a.json'))
    const overlaid = one.file('c.json')
    await one.overlay(overlaid)
    await expect(one.store.readOpenedFileState()).resolves.toEqual({ kind: 'writable', fileName: 'a.json' })
    await one.openChosen('closed')
    expect(one.lastOpen()['startIn'], 'FR-060: the overlay read did not move the folder').toBe(overlaid.handle)
  })

  it('FR-060 / T-024: an export (SVG, PNG, single .html, MSPDI) moves the folder', async () => {
    for (const extension of ['.svg', '.png', '.html', '.xml']) {
      const one = bench()
      await one.openChosen(one.file('a.json'))
      const exported = one.file(`d${extension}`)
      await one.writeChosen(exported, extension, false)
      await one.openChosen('closed')
      expect(one.lastOpen()['startIn'], `FR-060: the ${extension} export did not move the folder`).toBe(exported.handle)
    }
  })

  it('FR-060 / OP-2: a file opened by drop moves the folder', async () => {
    const one = bench()
    const dropped = one.file('e.json')
    one.browser.drop(dropped)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const reading = await one.store.readFileToOpen('drop')
    expect(reading.ok, 'precondition: the drop was not read').toBe(true)
    await one.writeChosen(one.file('f.json'), '.json', true)
    expect(one.lastSave()['startIn'], 'FR-060: the dropped file did not move the folder').toBe(dropped.handle)
  })

  it('FR-060 / SK-11: an overwrite of the opened file moves the folder back to it', async () => {
    const one = bench()
    const opened = one.file('a.json')
    await one.openChosen(opened)
    await one.writeChosen(one.file('d.svg'), '.svg', false)
    const overwrite = await one.store.overwriteOpenedFile(BYTES)
    expect(overwrite.ok, 'precondition: SK-11 did not write over a.json').toBe(true)
    await one.openChosen('closed')
    expect(one.lastOpen()['startIn'], 'FR-060: the SK-11 overwrite did not move the folder').toBe(opened.handle)
  })

  it('FR-060: a chooser the person closes leaves the handle as it was', async () => {
    const one = bench()
    const read = one.file('a.json')
    await one.openChosen(read)
    await one.openChosen('closed')
    await one.openChosen('closed')
    expect(one.lastOpen()['startIn'], 'FR-060: closing the chooser changed the handle').toBe(read.handle)
  })
})

describe('FR-060 (MUST NOT) -- nothing is stored', () => {
  const scope = globalThis as Record<string, unknown>
  const held = { localStorage: scope['localStorage'], indexedDB: scope['indexedDB'] }

  afterEach(() => {
    scope['localStorage'] = held.localStorage
    scope['indexedDB'] = held.indexedDB
  })

  it('FR-060: neither the folder nor the handle reaches localStorage or IndexedDB', async () => {
    const writes: string[] = []
    scope['localStorage'] = {
      setItem: (key: string) => writes.push(`localStorage:${key}`),
      getItem: () => null,
      removeItem: () => undefined,
    }
    scope['indexedDB'] = { open: (name: string) => writes.push(`indexedDB:${name}`) }
    const one = bench()
    await one.openChosen(one.file('a.json'))
    await one.writeChosen(one.file('b.json'), '.json', true)
    await one.overlay(one.file('c.json'))
    await one.openChosen('closed')
    expect(writes).toEqual([])
  })
})
