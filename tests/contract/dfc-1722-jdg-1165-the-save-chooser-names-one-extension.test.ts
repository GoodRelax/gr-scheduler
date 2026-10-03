// DFC-1722 / JDG-1165 tests: the save chooser offers the one extension of the chosen row, never .htm and kin.

import { describe, expect, it } from 'vitest'

import type { ChosenFileWrite } from '../../src/adapter/file-gateway/file-store'
import { fileSystemAccessFileStore } from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { REQUIREMENTS, UTF8, standInBrowser, standInFile } from './cr-610-file-flow-stage'
import { bare, specTable } from './spec-table'

const FR_096_ENDS_WITH = '書き出した先の名前が、選んだ行の拡張子で終わることを保証すること（MUST）'
const RW_7_ENDS_WITH = '書いた名前が `.md` で終わることを保証する（`FR-096` の拡張子の定めと同じ）'

// WHY: the media types Chromium's own table maps to more than one extension -- the ones a key must not be.
const MANY_EXTENSION_TYPES = ['text/html', 'image/svg+xml', 'text/xml', 'text/markdown', 'text/plain']

const extensionOfRow = (id: string): string => {
  const found = specTable('T-024').rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-024 has no row ${id}`)
  const cell = found.by['拡張子']
  if (cell === undefined) throw new Error('table T-024 has no column 拡張子')
  return bare(cell).replace(/`/g, '').trim()
}

const markdownExtension = (): string => {
  const found = specTable('T-346').rows.find((one) => one.id === 'RW-7')
  const cell = found?.cells.join(' ') ?? ''
  const extension = /`(\.[a-z]+)`\s*で終わる/.exec(cell)?.[1]
  if (extension === undefined) throw new Error(`RW-7 names no extension: ${cell}`)
  return extension
}

async function saveOptionsFor(extension: string): Promise<Record<string, unknown>> {
  const browser = standInBrowser()
  const store = fileSystemAccessFileStore(browser.environment)
  browser.toSave.push(standInFile(`plan${extension}`, UTF8.encode('x'), []))
  const write: ChosenFileWrite = {
    bytes: UTF8.encode('x'),
    suggestedFileName: `plan${extension}`,
    extension,
    shouldBecomeOpenedFile: false,
    askToWriteOver: () => Promise.resolve(true),
  }
  await store.writeChosenFile(write)
  const options = browser.saveOptions[0]
  if (options === undefined) throw new Error('no save chooser was opened')
  return options
}

const typesOf = (options: Record<string, unknown>): Record<string, unknown>[] =>
  Array.isArray(options['types']) ? (options['types'] as Record<string, unknown>[]) : []

describe('DFC-1722 -- the clauses read here are still in the specification', () => {
  it('FR-096 and RW-7 (T-346) still ask the written name to end with the chosen extension', () => {
    expect(REQUIREMENTS).toContain(FR_096_ENDS_WITH)
    expect(REQUIREMENTS).toContain(RW_7_ENDS_WITH)
    expect(extensionOfRow('IO-7')).toBe('.html')
  })
})

describe('JDG-1165 / FR-096 -- the save chooser is told one extension and nothing that widens it', () => {
  const rows = [
    { what: 'IO-7 single HTML', extension: () => extensionOfRow('IO-7') },
    { what: 'IO-3 SVG', extension: () => extensionOfRow('IO-3') },
    { what: 'RW-7 delay diagnostics report', extension: markdownExtension },
  ]
  for (const row of rows) {
    it(`${row.what}: one type, one accept key, the one extension, no description`, async () => {
      const extension = row.extension()
      const types = typesOf(await saveOptionsFor(extension))
      expect(types, `${extension}: the types handed to the chooser`).toHaveLength(1)
      const type = types[0] as Record<string, unknown>
      // WHY: a description is free text the browser shows; JDG-1165 leaves the label to the OS.
      expect(Object.keys(type), extension).toEqual(['accept'])
      const accept = type['accept'] as Record<string, unknown>
      const keys = Object.keys(accept)
      expect(keys, extension).toHaveLength(1)
      expect(accept[keys[0] as string], extension).toEqual([extension])
    })

    it(`${row.what}: the accept key is an unregistered x- type no browser table widens`, async () => {
      const extension = row.extension()
      const accept = (typesOf(await saveOptionsFor(extension))[0]?.['accept'] ?? {}) as Record<string, unknown>
      for (const key of Object.keys(accept)) {
        expect(MANY_EXTENSION_TYPES, `${extension}: ${key}`).not.toContain(key)
        expect(key, `${extension}: RFC 6838 3.4 keeps x- subtypes out of every registry`).toMatch(/^[a-z]+\/x-[-a-z0-9]+$/)
      }
    })
  }

  it('control: GRS JSON (IO-2) keeps its registered type, which names .json alone', async () => {
    const extension = extensionOfRow('IO-2')
    const accept = (typesOf(await saveOptionsFor(extension))[0]?.['accept'] ?? {}) as Record<string, unknown>
    expect(accept).toEqual({ 'application/json': [extension] })
  })
})
