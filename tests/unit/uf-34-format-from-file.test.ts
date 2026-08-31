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
//   表 T-024  IO-1   the MSPDI row. It holds both columns
//   表 T-024  IO-2   the `GRS JSON` row. It holds both columns
//   表 T-024         the note under it. ⭐ THE TWO COLUMNS ARE NOT ONE SET:
//                    「2 つの欄は、要る理由が別であるので別々に埋まる」. The
//                    first character belongs to the rows OP-1 accepts on
//                    intake; the extension belongs to every row that comes out
//                    as a FILE. So the rows fall into THREE shapes -- both
//                    columns, the extension alone, and neither (the store and
//                    the clipboard, which are not files) -- and an em dash is
//                    not a value a file may be read as
//   表 T-024         ⛔ and the fourth shape the table never writes: no row
//                    holds the first character alone. That is the invariant
//                    OP-12 rests on, because OP-12 matches BOTH sides against
//                    ONE row and could only ever half-judge such a row
//   FR-096           the name the export chooser suggests is the document name
//                    plus the extension 表 T-024 defines (MUST), and writing
//                    that extension into the requirement is forbidden (MUST
//                    NOT) -- which is why the extension column now reaches
//                    rows OP-12 must never name
//   FR-023           「先頭の BOM は受け入れ、捨てること（MUST）。BOM がある
//                    ことを理由に拒んではならない（MUST NOT）」-- the sentence
//                    OP-12's ordering exists to protect, tested here twice:
//                    once through the judgement, once through the decoder
//
// ⭐ RULE 04.2, THE ACCEPTANCE FORM. §2 of 04-verification.md asks that a
// mechanism carrying a manuscript value be accepted by「原稿の値を 1 つ変える
// と試験が落ちるか」. Every extension and every first character below is READ
// out of docs/spec/01-04-requirements.md at load time by
// tests/contract/spec-table.ts -- not one of them is typed here. So editing
// either cell of a row in table T-024 makes the cases below build different
// files and fail against an implementation still bound to the old value.
// ⭐ Which SHAPE each row holds is read the same way, so moving a row between
// the three shapes moves the cases that walk it. The acceptance comes for free
// from being table-driven; it was measured, not assumed -- three separate
// edits to table T-024 were each made and reverted, and each turned the cases
// they should red.
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

interface ShapedRow {
  /** The row ID, so a failure names one line of the specification. */
  readonly id: string
  /** Table T-024's own value, or the em dash where the row holds none. */
  readonly extension: string
  /** Table T-024's own value, or the em dash where the row holds none. */
  readonly firstCharacter: string
  /** The 形式 cell, used only to check the row-ID-to-name binding. */
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

/** Whether table T-024 wrote a value in that column, rather than the em dash. */
const holdsExtension = (row: ShapedRow): boolean => row.extension !== EM_DASH
const holdsFirstCharacter = (row: ShapedRow): boolean => row.firstCharacter !== EM_DASH

// ⭐ The three shapes table T-024 writes, and the fourth it must never write.
// Every group below is a FILTER over the table, never a list of row IDs typed
// here: a row that changes shape in the manuscript changes group here, and the
// cases keyed off these groups change with it.

/** Shape 1 -- both columns. The rows OP-12 is allowed to name. */
const READABLE: readonly ShapedRow[] = SHAPED.filter(
  (row) => holdsExtension(row) && holdsFirstCharacter(row),
)

/** Shape 2 -- the extension alone. Files `FR-096` must suggest a name for. */
const EXTENSION_ONLY: readonly ShapedRow[] = SHAPED.filter(
  (row) => holdsExtension(row) && !holdsFirstCharacter(row),
)

/** Shape 3 -- neither column, because the row does not come out as a file. */
const NO_COLUMN: readonly ShapedRow[] = SHAPED.filter(
  (row) => !holdsExtension(row) && !holdsFirstCharacter(row),
)

/** ⛔ The fourth shape. Asserted below to be empty; never walked by a case. */
const FIRST_CHARACTER_ONLY: readonly ShapedRow[] = SHAPED.filter(
  (row) => !holdsExtension(row) && holdsFirstCharacter(row),
)

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

const formatOf = (row: ShapedRow): ExchangeFormat => {
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
    // ⚠️ The note under 表 T-024 no longer says this of BOTH columns -- only of
    // the first character:「先頭の非空白 1 文字の欄を持つのは、`OP-1` が取込で
    // 受け付ける 2 行だけである」. Holding both columns still selects the same
    // two rows only because no row holds the first character alone, which the
    // case below asserts.
    //
    // ⭐ WHICH TWO ROWS, NOT IN WHICH ORDER. OP-12 asks whether an extension
    // and a first character land on ONE row; nothing in that judgement is
    // sequential, and the two rows are a set. ⛔ This was `toEqual(['IO-1',
    // 'IO-2'])` until 2026-09-01 and went red on a reorder of the manuscript
    // that changed nothing OP-12 can see: FR-096 (MUST) now makes table T-024's
    // row order the order the save list offers its formats in, and the rows
    // were moved to read `.json .xml .html .svg .png`. That order is pinned
    // where it is a requirement -- tests/unit/uf-47-48-choosers.test.ts -- and
    // sorting here keeps this case answering only to its own rule.
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
    // 表 T-024 の注:「2 つの欄は、要る理由が別であるので別々に埋まる」-- the two
    // columns answer different needs, so "not readable" and "an em dash in both
    // columns" are NOT the same set of rows. A row that comes out as a file but
    // is never taken in holds the extension and no first character.
    // ⚠️ This assertion is what an earlier form of this case got wrong: it
    // counted the rows that are not readable and expected every one of them to
    // write the em dash twice.
    const grouped = [...READABLE, ...EXTENSION_ONLY, ...NO_COLUMN].map((row) => row.id)
    expect(grouped.length).toBe(SHAPED.length)
    expect([...grouped].sort()).toEqual(SHAPED.map((row) => row.id).sort())

    // ⭐ Each shape must actually occur, or the cases walking it below are
    // vacuous -- an empty loop is a case with no teeth (rule 04, §2).
    expect(READABLE.length).toBeGreaterThan(0)
    expect(EXTENSION_ONLY.length).toBeGreaterThan(0)
    expect(NO_COLUMN.length).toBeGreaterThan(0)
  })

  it('the table is read -> a row may hold the extension alone, but none holds the first character alone', () => {
    // ⛔ THE INVARIANT `OP-12` RESTS ON. 表 T-024a の `OP-12`:「拡張子と先頭の非
    // 空白 1 文字の両方が 表 T-024 の同じ行に合致したとき、その行の形式として読む
    // こと（MUST）」-- a rule that matches BOTH sides against ONE row. A row
    // holding a first character with no extension could only ever be
    // half-judged, so the table must never write that shape.
    expect(FIRST_CHARACTER_ONLY.map((row) => row.id)).toEqual([])

    // The same invariant stated as a set equality, so a row gaining a first
    // character without an extension fails here as well as above: the rows
    // holding a first character are exactly the rows holding both columns.
    expect(SHAPED.filter(holdsFirstCharacter).map((row) => row.id)).toEqual(
      READABLE.map((row) => row.id),
    )

    // ⚠️ The converse does NOT hold, and this is the half that changed: 表 T-024
    // の注:「拡張子の欄は、ファイルとして出る行がすべて持つ」-- so rows holding an
    // extension outnumber the readable ones.
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

describe('OP-12: a row holding only the extension is never named as a format (MUST NOT)', () => {
  // ⛔ THE ROWS OP-12 HOLDS ONLY ONE SIDE OF. 表 T-024 の注:「判別（表 T-024a の
  // `OP-12`）はその 2 行のためにあり、書出だけの形式は判別されない」. The
  // extension column reaches these rows only because `FR-096` needs a name to
  // suggest for every file, so a judgement generated from that column alone
  // would name a row whose other side the table never wrote -- and 表 T-024a の
  // `OP-12` forbids exactly that:「どちらか一方でも違うファイルを読んではならない
  // （MUST NOT）」. ⚠️ Two of these extensions belong to formats whose files
  // really do open with a character a readable row claims, which is what makes
  // the one-sided judgement look plausible rather than absurd.

  it('the table is read -> no row holding only the extension shares its extension with a readable row', () => {
    // The guard the cases below rest on: were the two sets to share a value, a
    // refusal below could not be told from an agreement about the other row.
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
        // The first character names a row and the extension names none, so it
        // is the extension side that did not agree.
        expect(refusal.mismatch).toBe('extension')
      })
    }

    it(`the ${row.id} extension over the em dash the row writes where its first character would be -> no format`, () => {
      // ⛔ A reader that took the table literally would bind this row's pair as
      // its extension and the em dash, which is a pair no file can ever be.
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
      // ⛔ The store and the clipboard are not files, so nothing names them:
      // OP-12 exists for the two rows OP-1 accepts on intake. A reader that
      // took the table literally would bind this row's pair from its two em
      // dashes.
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
