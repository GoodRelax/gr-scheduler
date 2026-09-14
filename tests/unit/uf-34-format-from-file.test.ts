// Unit tests for `formatFromFile` -- the seventh name of PI-20 (table T-064 of

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromJson,
  formatFromFile,
  type ExchangeFormat,
  type FormatMismatch,
  type FormatReading,
  type JsonDecoding,
} from '../../src/adapter/document-codec/document-codec'
import { bare, specTable } from '../contract/spec-table'


const EXTENSION = '拡張子'
const FIRST_CHARACTER = '先頭の非空白 1 文字'
const FORM = '形式'
const DIRECTION = '方向'
const EM_DASH = '—'
const INTAKE = '取込'

const T_024 = specTable('T-024')

for (const heading of [EXTENSION, FIRST_CHARACTER, FORM, DIRECTION]) {
  if (!T_024.headings.includes(heading)) {
    throw new Error(
      `table T-024 in ${T_024.file} has no ${JSON.stringify(heading)} column; ` +
        `its headings are ${JSON.stringify(T_024.headings)}`,
    )
  }
}

interface ShapedRow {
  readonly id: string
  readonly extension: string
  readonly firstCharacter: string
  readonly form: string
}

const cellOf = (row: (typeof T_024.rows)[number], heading: string): string =>
  bare(row.by[heading] ?? '')

const SHAPED: readonly ShapedRow[] = T_024.rows.map((row) => ({
  id: row.id,
  extension: cellOf(row, EXTENSION),
  firstCharacter: cellOf(row, FIRST_CHARACTER),
  form: cellOf(row, FORM),
}))

const holdsExtension = (row: ShapedRow): boolean => row.extension !== EM_DASH
const holdsFirstCharacter = (row: ShapedRow): boolean => row.firstCharacter !== EM_DASH


const READABLE: readonly ShapedRow[] = SHAPED.filter(
  (row) => holdsExtension(row) && holdsFirstCharacter(row),
)

const EXTENSION_ONLY: readonly ShapedRow[] = SHAPED.filter(
  (row) => holdsExtension(row) && !holdsFirstCharacter(row),
)

const NO_COLUMN: readonly ShapedRow[] = SHAPED.filter(
  (row) => !holdsExtension(row) && !holdsFirstCharacter(row),
)

const FIRST_CHARACTER_ONLY: readonly ShapedRow[] = SHAPED.filter(
  (row) => !holdsExtension(row) && holdsFirstCharacter(row),
)

const FORMAT_OF_ROW: Readonly<Record<string, ExchangeFormat>> = {
  'IO-1': 'mspdi',
  'IO-2': 'grsJson',
}
const FORM_WORD_OF_FORMAT: Readonly<Record<ExchangeFormat, string>> = {
  mspdi: 'MSPDI',
  grsJson: 'GRS JSON',
}

const formatOf = (row: ShapedRow): ExchangeFormat => {
  const format = FORMAT_OF_ROW[row.id]
  if (format === undefined) {
    throw new Error(
      `table T-024 row ${row.id} carries both columns but this file binds no format name to it`,
    )
  }
  return format
}

const BYTE_ORDER_MARK = '﻿'


type Refusal = Extract<FormatReading, { ok: false }>

function readAs(fileName: string, text: string): ExchangeFormat {
  const reading: FormatReading = formatFromFile(fileName, text)
  if (!reading.ok) {
    throw new Error(
      `expected a format for ${JSON.stringify(fileName)}, was refused: ${JSON.stringify(reading)}`,
    )
  }
  return reading.format
}

function refusalOf(fileName: string, text: string): Refusal {
  const reading: FormatReading = formatFromFile(fileName, text)
  if (reading.ok) {
    throw new Error(
      `expected no format for ${JSON.stringify(fileName)}, was read as ${reading.format}`,
    )
  }
  return reading
}

const named = (extension: string): string => `document${extension}`


describe('table T-024: the values OP-12 compares against', () => {
  it('the table is read -> exactly the two rows OP-1 accepts on intake carry both columns', () => {
    expect([...READABLE.map((row) => row.id)].sort()).toEqual(['IO-1', 'IO-2'])
  })

  it('the table is read -> every row carrying both columns is a row whose direction includes intake', () => {
    const intake = T_024.rows.filter((row) => (row.by[DIRECTION] ?? '').includes(INTAKE))
    expect(intake.map((row) => row.id)).toEqual(READABLE.map((row) => row.id))
  })

  it('the table is read -> each readable row names the format this build binds to its row ID', () => {
    for (const row of READABLE) {
      expect(row.form, `table T-024 row ${row.id}`).toContain(FORM_WORD_OF_FORMAT[formatOf(row)])
    }
  })

  it('the table is read -> every row holds one of three shapes, and all three occur', () => {
    const grouped = [...READABLE, ...EXTENSION_ONLY, ...NO_COLUMN].map((row) => row.id)
    expect(grouped.length).toBe(SHAPED.length)
    expect([...grouped].sort()).toEqual(SHAPED.map((row) => row.id).sort())

    expect(READABLE.length).toBeGreaterThan(0)
    expect(EXTENSION_ONLY.length).toBeGreaterThan(0)
    expect(NO_COLUMN.length).toBeGreaterThan(0)
  })

  it('the table is read -> a row may hold the extension alone, but none holds the first character alone', () => {
    expect(FIRST_CHARACTER_ONLY.map((row) => row.id)).toEqual([])

    expect(SHAPED.filter(holdsFirstCharacter).map((row) => row.id)).toEqual(
      READABLE.map((row) => row.id),
    )

    expect(SHAPED.filter(holdsExtension).length).toBeGreaterThan(READABLE.length)
  })
})

describe('OP-12: both sides agree on one row -> that row is the format', () => {
  for (const row of READABLE) {
    it(`a name ending in the ${row.id} extension whose first character is the ${row.id} one -> read as ${row.id}`, () => {
      expect(readAs(named(row.extension), row.firstCharacter)).toBe(formatOf(row))
    })

    it(`the ${row.id} extension and first character with a body after it -> still read as ${row.id}`, () => {
      expect(readAs(named(row.extension), `${row.firstCharacter}\n  rest of the file\n`)).toBe(
        formatOf(row),
      )
    })

    it(`a directory path ending in the ${row.id} extension -> read as ${row.id}`, () => {
      expect(readAs(`some/folder/plan.and.more${row.extension}`, row.firstCharacter)).toBe(
        formatOf(row),
      )
    })
  }
})

describe('OP-12: one side differs -> the file is not read (MUST NOT)', () => {
  for (const mine of READABLE) {
    for (const theirs of READABLE) {
      if (mine.id === theirs.id) continue

      it(`the ${mine.id} extension with the ${theirs.id} first character -> no format, and neither row is picked`, () => {
        const refusal = refusalOf(named(mine.extension), theirs.firstCharacter)
        expect(refusal.extension).toBe(mine.extension)
        expect(refusal.firstCharacter).toBe(theirs.firstCharacter)
        const mismatch: FormatMismatch = refusal.mismatch
        expect(mismatch).toBe('both')
      })
    }
  }

  for (const row of READABLE) {
    it(`the ${row.id} first character under an extension no row of table T-024 carries -> no format`, () => {
      const unknown = '.txt'
      expect(
        READABLE.some((other) => other.extension === unknown),
        'the extension this case relies on being unknown is now in table T-024',
      ).toBe(false)
      const refusal = refusalOf(named(unknown), row.firstCharacter)
      expect(refusal.extension).toBe(unknown)
      expect(refusal.firstCharacter).toBe(row.firstCharacter)
      expect(refusal.mismatch).toBe('extension')
    })

    it(`the ${row.id} first character under a name holding no dot at all -> no format, and the extension compared was empty`, () => {
      const refusal = refusalOf('document', row.firstCharacter)
      expect(refusal.extension).toBe('')
      expect(refusal.firstCharacter).toBe(row.firstCharacter)
      expect(refusal.mismatch).toBe('extension')
    })

    it(`the ${row.id} extension carrying a first character no row of table T-024 carries -> no format`, () => {
      const alien = 'x'
      expect(
        READABLE.some((other) => other.firstCharacter === alien),
        'the character this case relies on being unknown is now in table T-024',
      ).toBe(false)
      const refusal = refusalOf(named(row.extension), `\n  ${alien}yz`)
      expect(refusal.extension).toBe(row.extension)
      expect(refusal.firstCharacter).toBe(alien)
      expect(refusal.mismatch).toBe('firstCharacter')
    })

    it(`the ${row.id} extension one character short of the table's value -> no format`, () => {
      const shortened = row.extension.slice(0, -1)
      expect(READABLE.some((other) => other.extension === shortened)).toBe(false)
      expect(refusalOf(named(shortened), row.firstCharacter).extension).toBe(shortened)
    })
  }

  it('neither the extension nor the first character names a row -> no format, and both sides are reported', () => {
    const refusal = refusalOf('notes.txt', 'hello')
    expect(refusal.extension).toBe('.txt')
    expect(refusal.firstCharacter).toBe('h')
    expect(refusal.mismatch).toBe('both')
  })
})

describe('OP-12: the byte order mark is dropped BEFORE the first character is read (MUST)', () => {
  for (const row of READABLE) {
    it(`a ${row.id} file a spreadsheet tool wrote with a leading byte order mark -> still read as ${row.id}`, () => {
      expect(readAs(named(row.extension), BYTE_ORDER_MARK + row.firstCharacter)).toBe(
        formatOf(row),
      )
    })

    it(`a ${row.id} file with a byte order mark and then blank lines -> the mark goes first, the blanks after, so it is read as ${row.id}`, () => {
      expect(
        readAs(named(row.extension), `${BYTE_ORDER_MARK}\n\t   \r\n${row.firstCharacter}`),
      ).toBe(formatOf(row))
    })

    it(`a ${row.id} file whose mark comes AFTER blank space -> not a leading mark, so it is the first character and there is no format`, () => {
      const refusal = refusalOf(
        named(row.extension),
        `  \n${BYTE_ORDER_MARK}  ${row.firstCharacter}`,
      )
      expect(refusal.firstCharacter).toBe(BYTE_ORDER_MARK)
      expect(refusal.mismatch).toBe('firstCharacter')
    })

    it(`blank space before the ${row.id} first character and no mark at all -> read as ${row.id}`, () => {
      expect(readAs(named(row.extension), ` \t\r\n  ${row.firstCharacter}`)).toBe(formatOf(row))
    })

    it(`a ${row.id} name over a file holding nothing but a byte order mark -> no format, and no first character was found`, () => {
      const refusal = refusalOf(named(row.extension), BYTE_ORDER_MARK)
      expect(refusal.firstCharacter).toBe(null)
      expect(refusal.mismatch).toBe('firstCharacter')
    })
  }
})

describe('OP-12: a file with no first character to compare', () => {
  for (const row of READABLE) {
    it(`a ${row.id} name over an empty file -> no format, because there is no character to agree`, () => {
      const refusal = refusalOf(named(row.extension), '')
      expect(refusal.extension).toBe(row.extension)
      expect(refusal.firstCharacter).toBe(null)
      expect(refusal.mismatch).toBe('firstCharacter')
    })

    it(`a ${row.id} name over a file of blank space only -> no format`, () => {
      const refusal = refusalOf(named(row.extension), ' \t\r\n   ')
      expect(refusal.firstCharacter).toBe(null)
      expect(refusal.mismatch).toBe('firstCharacter')
    })
  }

  it('an empty file under no extension at all -> no format, and both sides are reported as missing', () => {
    const refusal = refusalOf('document', '')
    expect(refusal.extension).toBe('')
    expect(refusal.firstCharacter).toBe(null)
    expect(refusal.mismatch).toBe('both')
  })
})

describe('OP-12: a row holding only the extension is never named as a format (MUST NOT)', () => {

  it('the table is read -> no row holding only the extension shares its extension with a readable row', () => {
    for (const row of EXTENSION_ONLY) {
      expect(
        READABLE.some((other) => other.extension === row.extension),
        `table T-024 row ${row.id}`,
      ).toBe(false)
    }
  })

  for (const row of EXTENSION_ONLY) {
    for (const readable of READABLE) {
      it(`the ${row.id} extension over a body opening with the ${readable.id} first character -> no format`, () => {
        const refusal = refusalOf(named(row.extension), readable.firstCharacter)
        expect(refusal.extension).toBe(row.extension)
        expect(refusal.firstCharacter).toBe(readable.firstCharacter)
        expect(refusal.mismatch).toBe('extension')
      })
    }

    it(`the ${row.id} extension over the em dash the row writes where its first character would be -> no format`, () => {
      const refusal = refusalOf(named(row.extension), EM_DASH)
      expect(refusal.extension).toBe(row.extension)
      expect(refusal.firstCharacter).toBe(EM_DASH)
      expect(refusal.mismatch).toBe('both')
    })

    it(`the ${row.id} extension over an empty file -> no format, and no first character was found`, () => {
      const refusal = refusalOf(named(row.extension), '')
      expect(refusal.extension).toBe(row.extension)
      expect(refusal.firstCharacter).toBe(null)
      expect(refusal.mismatch).toBe('both')
    })
  }
})

describe("table T-024's em dash is not a value a file may be read as", () => {
  for (const row of NO_COLUMN) {
    it(`row ${row.id} holds neither column -> a file spelled with the em dash is never read as a format`, () => {
      expect(formatFromFile(named(`.${EM_DASH}`), EM_DASH).ok).toBe(false)
      expect(formatFromFile(named(`.${EM_DASH}`), `${EM_DASH} something`).ok).toBe(false)
    })
  }

  it('an em dash as the first character under a readable extension -> no format', () => {
    for (const row of READABLE) {
      expect(formatFromFile(named(row.extension), EM_DASH).ok, `row ${row.id}`).toBe(false)
    }
  })
})


const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')

describe('FR-023: a leading byte order mark is accepted and dropped, never a reason to refuse', () => {
  it('the bundled startup template without a mark -> decoded (the control this file rests on)', () => {
    expect(documentFromJson(TEMPLATE_TEXT).ok).toBe(true)
  })

  it('the same `GRS JSON` with a leading byte order mark -> decoded, not refused', () => {
    const read: JsonDecoding = documentFromJson(BYTE_ORDER_MARK + TEMPLATE_TEXT)
    if (!read.ok) {
      throw new Error(
        'FR-023:「BOM があることを理由に拒んではならない（MUST NOT）」-- refused with ' +
          JSON.stringify(read.faults),
      )
    }
    expect(read.ok).toBe(true)
  })

  it('the same `GRS JSON` with and without the mark -> the same document, so the mark was dropped and nothing else', () => {
    const plain = documentFromJson(TEMPLATE_TEXT)
    const marked = documentFromJson(BYTE_ORDER_MARK + TEMPLATE_TEXT)
    if (!plain.ok || !marked.ok) throw new Error('both readings were expected to succeed')
    expect(JSON.stringify(marked.document)).toBe(JSON.stringify(plain.document))
  })

  it('a `GRS JSON` name and a marked body -> OP-12 sends it to the JSON decoder, which decodes it', () => {
    const jsonRow = READABLE.find((row) => formatOf(row) === 'grsJson')
    if (jsonRow === undefined) throw new Error('table T-024 no longer carries a `GRS JSON` row')
    const text = BYTE_ORDER_MARK + TEMPLATE_TEXT
    expect(text.startsWith(BYTE_ORDER_MARK + jsonRow.firstCharacter)).toBe(true)
    expect(readAs(named(jsonRow.extension), text)).toBe('grsJson')
    expect(documentFromJson(text).ok).toBe(true)
  })
})
