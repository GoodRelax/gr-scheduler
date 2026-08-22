// Unit tests for `formatFromFile` -- the seventh name of PI-20 (table T-064 of
// docs/spec/05-07-design.md), written in UF-34 `document-codec.ts` (table
// T-075, component `DocumentCodec`, CP-20 of table T-062).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, §1). What was read: docs/spec/ for every rule below,
// docs/review/rulings-2026-08-22/ for the decision that produced them, and of
// the unit itself only its head comment, its three published types
// (`ExchangeFormat`, `FormatMismatch`, `FormatReading`) and the one signature
// `formatFromFile(fileName: string, text: string): FormatReading`. Every
// expected value here comes from a table or a requirement, never from the
// implementation.
//
// The rules these cases answer to:
//   表 T-024a OP-12  the rule under test. Both the extension AND the first
//                    non-blank character must match THE SAME row of table
//                    T-024 (MUST); a file where either side differs may not be
//                    read (MUST NOT). The byte order mark is dropped BEFORE
//                    the first character is looked at (MUST) -- the order is
//                    part of the rule, not an optimisation
//   表 T-024a OP-1   the two rows intake accepts: IO-1 and IO-2 of table T-024
//   表 T-024  IO-1   the values, one row: `.xml` and `<`
//   表 T-024  IO-2   the values, one row: `.json` and `{`
//   表 T-024         the note under it -- only the two rows OP-1 accepts carry
//                    the two columns; the write-only rows write an em dash, so
//                    an em dash is not a value a file may be read as
//   FR-023           「先頭の BOM は受け入れ、捨てること（MUST）。BOM がある
//                    ことを理由に拒んではならない（MUST NOT）」-- the sentence
//                    OP-12's ordering exists to protect, tested here twice:
//                    once through the judgement, once through the decoder
//
// ⭐ RULE 04.2, THE ACCEPTANCE FORM. §2 of 04-verification.md asks that a
// mechanism carrying a manuscript value be accepted by「原稿の値を 1 つ変える
// と試験が落ちるか」. Every extension and every first character below is READ
// out of docs/spec/01-04-requirements.md at load time by
// tests/contract/spec-table.ts -- not one of them is typed here. So changing
// `.json` to `.grs` in table T-024, or `{` to anything else, makes the cases
// below build different files and fail against an implementation still bound
// to the old value. The acceptance comes for free from being table-driven.
// ⚠️ The two column headings and the em dash are the only strings this file
// copies from the manuscript, and each is asserted to exist before it is used,
// so a renamed column fails loudly instead of silently matching nothing.

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

// ---------------------------------------------------------------------------
// The table, read rather than copied.
// ---------------------------------------------------------------------------

/** The heading of the column CR-214 added for the extension. */
const EXTENSION = '拡張子'
/** The heading of the column CR-214 added for the first non-blank character. */
const FIRST_CHARACTER = '先頭の非空白 1 文字'
/** The heading naming the format, used only to check the two bindings below. */
const FORM = '形式'
/** The heading naming the direction, used only to cross-check which rows read. */
const DIRECTION = '方向'
/** What table T-024 writes where a row has no value for a column. */
const EM_DASH = '—'
/** The word 表 T-024a OP-1 uses for the intake direction. */
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

interface ReadableRow {
  /** The row ID, so a failure names one line of the specification. */
  readonly id: string
  /** Table T-024's own value. Never typed in this file. */
  readonly extension: string
  /** Table T-024's own value. Never typed in this file. */
  readonly firstCharacter: string
  /** The 形式 cell, used only to check the row-ID-to-name binding. */
  readonly form: string
}

const cellOf = (row: (typeof T_024.rows)[number], heading: string): string =>
  bare(row.by[heading] ?? '')

const READABLE: readonly ReadableRow[] = T_024.rows
  .filter(
    (row) => cellOf(row, EXTENSION) !== EM_DASH && cellOf(row, FIRST_CHARACTER) !== EM_DASH,
  )
  .map((row) => ({
    id: row.id,
    extension: cellOf(row, EXTENSION),
    firstCharacter: cellOf(row, FIRST_CHARACTER),
    form: cellOf(row, FORM),
  }))

const WRITE_ONLY: readonly { readonly id: string; readonly cells: readonly string[] }[] =
  T_024.rows
    .filter(
      (row) => cellOf(row, EXTENSION) === EM_DASH && cellOf(row, FIRST_CHARACTER) === EM_DASH,
    )
    .map((row) => ({
      id: row.id,
      cells: [cellOf(row, EXTENSION), cellOf(row, FIRST_CHARACTER)],
    }))

// ⭐ The one thing the table cannot give: table T-024 has no English column, so
// the join between a row and the name this build uses for it is the row ID
// alone -- exactly what the unit's own `ExchangeFormat` doc says. The binding is
// declared here and then CHECKED against the 形式 cell below, so a wrong binding
// fails rather than quietly swapping the two formats.
const FORMAT_OF_ROW: Readonly<Record<string, ExchangeFormat>> = {
  'IO-1': 'mspdi',
  'IO-2': 'grsJson',
}
const FORM_WORD_OF_FORMAT: Readonly<Record<ExchangeFormat, string>> = {
  mspdi: 'MSPDI',
  grsJson: 'GRS JSON',
}

const formatOf = (row: ReadableRow): ExchangeFormat => {
  const format = FORMAT_OF_ROW[row.id]
  if (format === undefined) {
    throw new Error(
      `table T-024 row ${row.id} carries both columns but this file binds no format name to it`,
    )
  }
  return format
}

/** U+FEFF. FR-023 says it is accepted and dropped, never a reason to refuse. */
const BYTE_ORDER_MARK = '﻿'

// ---------------------------------------------------------------------------
// Reading the published shape without asserting it into place.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------

describe('table T-024: the values OP-12 compares against', () => {
  it('the table is read -> exactly the two rows OP-1 accepts on intake carry both columns', () => {
    // 表 T-024 の注: 「2 つの欄を持つのは、`OP-1` が取込で受け付ける 2 行だけである」
    expect(READABLE.map((row) => row.id)).toEqual(['IO-1', 'IO-2'])
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

  it('the table is read -> the remaining rows write an em dash in both columns', () => {
    expect(WRITE_ONLY.length).toBe(T_024.rows.length - READABLE.length)
    expect(WRITE_ONLY.length).toBeGreaterThan(0)
    for (const row of WRITE_ONLY) {
      expect(row.cells, `table T-024 row ${row.id}`).toEqual([EM_DASH, EM_DASH])
    }
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
        // 「どちらか一方でも違うファイルを読んではならない（MUST NOT）」-- and the
        // caution under OP-12 says nothing here may pick a side, because deciding
        // on one side alone is exactly what shows a person a broken `GRS JSON` as
        // an MSPDI error.
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
      // ⭐ The acceptance form of rule 04.2 made concrete: the comparison is
      // against the WHOLE value table T-024 writes, so a near miss is a miss.
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
      // FR-023:「先頭の BOM は受け入れ、捨てること（MUST）。BOM があることを
      // 理由に拒んではならない（MUST NOT）」. OP-12 states the order for this
      // reason in as many words, so reading the mark AS the first character
      // breaks that MUST NOT.
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
      // FR-023 drops「先頭の BOM」-- the LEADING one. A U+FEFF that blank space
      // precedes is not at the head of the file and is therefore content, and
      // it is not blank under either judged grammar (RFC 8259 section 2 for
      // `GRS JSON`, XML 1.0's `S` production for MSPDI).
      // ⭐ This is also the case that tells the required order apart from
      // `trimStart()` and from a `\s` class: ECMAScript's WhiteSpace includes
      // U+FEFF, so either would swallow this mark and read the file anyway --
      // the same leniency that would make FR-023's MUST look satisfied while
      // the drop OP-12 demands FIRST never happened.
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
      // ⭐ Where the mark is dropped first, there is no non-blank character
      // left. Where it is not, the character reported would be the mark itself
      // -- which is how this case tells the two orders apart.
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

describe("table T-024's em dash is not a value a file may be read as", () => {
  for (const row of WRITE_ONLY) {
    it(`row ${row.id} writes an em dash in both columns -> a file spelled with the em dash is never read as a format`, () => {
      // ⛔ The write-only rows are not formats a file may be read AS: OP-12
      // exists for the two rows OP-1 accepts on intake. A reader that took the
      // table literally would bind `.—` and `—` as this row's pair.
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

// ---------------------------------------------------------------------------
// The same MUST NOT, one step further down the road.
//
// OP-12 only chooses the decoder; FR-023 forbids refusing a file BECAUSE it
// carries a byte order mark. So the mark must survive the judgement AND the
// decoder it hands the file to, or the sentence is broken anyway.
// ---------------------------------------------------------------------------

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
    // The two rules in the one order they run in: judge, then decode.
    const jsonRow = READABLE.find((row) => formatOf(row) === 'grsJson')
    if (jsonRow === undefined) throw new Error('table T-024 no longer carries a `GRS JSON` row')
    const text = BYTE_ORDER_MARK + TEMPLATE_TEXT
    expect(text.startsWith(BYTE_ORDER_MARK + jsonRow.firstCharacter)).toBe(true)
    expect(readAs(named(jsonRow.extension), text)).toBe('grsJson')
    expect(documentFromJson(text).ok).toBe(true)
  })
})
