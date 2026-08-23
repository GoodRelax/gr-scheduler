// DocumentCodec -- public entry of this folder.
//
// @unit      UF-34   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-20
//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

// ⭐ All seven names of PI-20 leave through this file, in the table's own
// order. Six of them are the codecs beside it, and binding them is what table
// T-075 gives UF-34 to do.
//
// ⭐ The seventh, `formatFromFile`, is WRITTEN here, and this is the one unit
// of the component where it can be. OP-12 of table T-024a decides which of the
// two decoders a file is sent to, so it answers to NEITHER format's authority
// -- and UT-5 of table T-063 split `json-codec.ts` from `mspdi-codec.ts`
// exactly BY that authority. A judgement standing above both belongs to the
// unit that binds both.
// ⛔ Not a fourth codec file: table T-075 counts 71 units and names no such
// unit, and CR-213 opened one member, not a unit.
//
// ⚠️ The formats stay in separate files for the reason UT-5 of table T-063
// gives -- each answers to a different authority, and only the single .html
// reaches outside the process. ⛔ That is a reason to split the FILES. It is
// not a reason to withhold a member here: a caller that cannot reach
// `exportEmbeddedHtml` or the MSPDI pair from this entry has to read a sibling
// instead, which is exactly what Chapter 5.3 forbids (MUST NOT).
// ⚠️ An earlier note in this place claimed the MSPDI pair and the single .html
// were deliberately absent. They were absent because two agents were writing
// in this folder at once and neither was allowed to touch this file. Both are
// done; the note was false and is gone.
//
// ⭐ Each member's argument and result types come with it. A caller can
// neither hold what a member returns nor implement the seam without naming
// them, so a type left behind reopens the same MUST NOT that a member left
// behind would.
// ⛔ `Document` is not among them. It belongs to another component and leaves
// through that component's own entry; re-publishing it here would give one
// type two homes and put this component in the way of every change to it.
// ⛔ `MSPDI_NAMESPACE` is not among them either. PI-20 does not name it, and
// nothing outside this folder writes an MSPDI root. ⚠️ `BYTE_ORDER_MARK` and
// `withoutLeadingByteOrderMark` sit on the same line: `mspdi-codec.ts` exports
// them so that the three readers of this folder share ONE drop, and PI-20 does
// not name either, so neither goes any further than the folder.

import exchangeFormats from './exchange-formats.json'
import { withoutLeadingByteOrderMark } from './mspdi-codec'

export type { AppShell, AppShellReading, AppShellSource } from './app-shell-source'

export { documentFromJson, jsonFromDocument } from './json-codec'
export type { JsonDecoding, JsonFault } from './json-codec'

export { documentFromMspdi, mspdiFromDocument } from './mspdi-codec'
export type { MspdiDecoding, MspdiEncoding, MspdiFault, MspdiNotice } from './mspdi-codec'

export { exportEmbeddedHtml } from './embedded-html-codec'
export type {
  EmbeddedHtmlExport,
  EmbeddedHtmlFault,
  EmbeddedHtmlFaultReason,
} from './embedded-html-codec'

// ------------------------------------------ OP-12: which decoder, and why ---

/**
 * The two rows OP-1 accepts on intake -- `IO-1` and `IO-2` of table T-024.
 *
 * ⚠️ Spelled to match `ImportFormat` (CP-10) and `SaveFileForm` (CP-22), and
 * DECLARED rather than imported from either: the component figure draws no edge
 * from this component to those two, and CR-213 opened this member on the
 * standing condition that not one edge is added.
 * ⛔ It names the two rows; it does not hold what they say. Table T-024 has no
 * English column, so the only join it admits is the row id -- which is what
 * `exchange-formats.json` carries and what `ROW_OF_FORMAT` binds these two
 * names to.
 */
export type ExchangeFormat = 'grsJson' | 'mspdi'

/**
 * Which side of OP-12 did not agree.
 *
 * ⭐ Named rather than left as a bare "no": NT-1 of table T-037 requires a
 * notice to say WHICH item is wrong, and a nullable format cannot tell a file
 * named `.json` that opens with `<` from one that is neither format at all.
 *
 * ⚠️ `both` also covers the case where each side names a row and the two rows
 * differ. Nothing here may pick a side there -- OP-12's whole reason is that
 * deciding on one side alone shows a person a broken `GRS JSON` as an MSPDI
 * error.
 */
export type FormatMismatch = 'extension' | 'firstCharacter' | 'both'

/**
 * What OP-12's two sides say about one file.
 *
 * ⛔ NOT A REFUSAL. OP-12's own caution says this judgement decides only which
 * decoder the file is sent to; whether the file is ACCEPTED is OP-5's
 * validation (FR-023), which runs on what the decoder produced.
 */
export type FormatReading =
  | { readonly ok: true; readonly format: ExchangeFormat }
  | {
      readonly ok: false
      readonly mismatch: FormatMismatch
      /** What was compared as the extension. `''` where the name holds no dot. */
      readonly extension: string
      /**
       * What was compared as the first character. `null` where the text holds
       * no non-blank one.
       *
       * ⭐ Carried rather than left for the caller to work out again: finding
       * it is the ORDERED step -- mark first, blanks second -- and a caller
       * recomputing it with a built-in is precisely how that order gets undone.
       */
      readonly firstCharacter: string | null
    }

/**
 * The four characters RFC 8259 and XML 1.0 agree on, and the whole of what
 * "non-blank" means for OP-12's first character.
 *
 * ⛔ NOT `trimStart()`, and NOT a `\s` class. ECMAScript's WhiteSpace includes
 * `U+FEFF`, so either would eat the byte order mark on the way to the first
 * character -- doing the drop OP-12 requires to happen BEFORE this step, in
 * silence, and erasing the order FR-023 puts a MUST NOT behind. The set is the
 * two judged grammars' own: RFC 8259 section 2 for `GRS JSON`, and XML 1.0's
 * `S` production for MSPDI.
 */
const BLANK_CHARACTERS: ReadonlySet<string> = new Set([' ', '\t', '\n', '\r'])

/**
 * Which row of table T-024 each format this build can decode is.
 *
 * ⭐ Join keys, NOT names for the rows: the row id is the only join table T-024
 * admits, and the two spellings on the left are names `src/` already had.
 * ⚠️ A row of the generated roster this map does not name is not a format this
 * build can decode, so it is never offered; and a row id that has MOVED leaves
 * its format matching nothing, which refuses files rather than opening one as
 * the wrong format. `npm run gen:check` is what says the roster moved.
 */
const ROW_OF_FORMAT: Readonly<Record<ExchangeFormat, string>> = {
  grsJson: 'IO-2',
  mspdi: 'IO-1',
}

interface ReadableFormat {
  readonly format: ExchangeFormat
  readonly extension: string
  readonly firstCharacter: string
}

/**
 * The rows OP-12 may name, each joined to the name this build uses for it.
 *
 * ⛔ The two values arrive from `exchange-formats.json`, which
 * `tools/generate_exchange_formats.py` writes out of table T-024. Rule 03
 * section 1 forbids spelling `.json` or `{` here.
 *
 * ⚠️ THE ARTIFACT CARRIES MORE ROWS THAN THIS ROSTER WANTS. It used to hold only
 * the rows a file may be read AS; `FR-096` needs every row with an out
 * direction, so the generator writes the write-only ones too.
 * ⛔ AN EXTENSION DOES NOT MEAN OP-12 JUDGES THAT ROW. Table T-024 fills the
 * extension column for every row that leaves as a FILE, so `IO-3` / `IO-4` /
 * `IO-7` arrive here with an extension and no first character, and only the row
 * that is no file at all is empty in both columns. ⚠️ An earlier note here said
 * the write-only rows came with both columns empty; that shape is what broke,
 * and reading either column alone as "this row is readable" is what would break
 * next. OP-12 judges a READING, which has two sides -- so the roster keeps a row
 * only where BOTH columns are there, by the test below rather than by a second
 * list of row ids that would go stale.
 */
const READABLE_FORMATS: readonly ReadableFormat[] = (
  // `Object.keys` widens to `string[]`; the declaration above already fixes
  // the keys to the union, so this narrows back to what was written.
  Object.keys(ROW_OF_FORMAT) as readonly ExchangeFormat[]
).flatMap((format) => {
  const row = exchangeFormats.formats.find((one) => one.rowId === ROW_OF_FORMAT[format])
  if (row === undefined) return []
  const { extension, firstCharacter } = row
  if (extension === null || firstCharacter === null) return []
  return [{ format, extension, firstCharacter }]
})

/**
 * The first character OP-12 compares, or `null` where the text has none.
 *
 * @purity pure
 */
function firstNonBlankCharacter(text: string): string | null {
  // OP-12 (MUST): the mark goes before the first character is looked at.
  for (const character of withoutLeadingByteOrderMark(text)) {
    if (!BLANK_CHARACTERS.has(character)) return character
  }
  return null
}

/**
 * The tail of a file name from its last dot, `''` where it holds none.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: whether this comparison ignores
 * case. OP-12 requires the extension to match the row and says nothing about
 * case; table T-024 spells `.xml` and `.json` in lower case; searched OP-12,
 * table T-024, FR-023, FR-087, FR-096 and every occurrence of the word for
 * "extension" in docs/spec -- all four sit in this one rule and the table it
 * points at, and none is about case.
 * ⭐ Compared literally until it is decided, because that is the recoverable
 * direction: a file named `.JSON` is refused and the person renames it,
 * whereas a rule loosened here accepts files under a rule nobody wrote and
 * cannot be taken back from the documents it has already opened.
 *
 * @purity pure
 */
function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot)
}

/** @purity pure */
function mismatchOf(
  byExtension: ReadableFormat | null,
  byFirstCharacter: ReadableFormat | null,
): FormatMismatch {
  if (byExtension === null && byFirstCharacter === null) return 'both'
  if (byExtension === null) return 'extension'
  if (byFirstCharacter === null) return 'firstCharacter'
  // Each side names a row and the rows differ, so neither side is the one that
  // is wrong. See `FormatMismatch`.
  return 'both'
}

/**
 * OP-12 of table T-024a: which of the two decoders a file is sent to.
 *
 * ⛔ Two primitives, not `FileGateway`'s struct. The component figure draws
 * `FileGateway -> DocumentCodec` with the label `format`, so reaching back for
 * that struct would put a cycle inside the Adapter layer, which LR-3 of table
 * T-061 forbids (MUST).
 *
 * ⭐ The ORDER is part of the rule, and it is the order of the lines below:
 * drop a leading byte order mark, skip blanks, take the first character, then
 * compare BOTH sides against the SAME row. OP-12 states the drop as a MUST and
 * says why -- done later, it refuses a spreadsheet tool's `GRS JSON` for the
 * one reason FR-023 forbids refusing it for.
 *
 * ⚠️ It says no rather than guessing: OP-12 forbids reading a file where
 * either side differs (MUST NOT). ⚠️ And saying no is not refusing the file --
 * see `FormatReading`.
 *
 * @purity pure
 */
export function formatFromFile(fileName: string, text: string): FormatReading {
  const extension = extensionOf(fileName)
  const firstCharacter = firstNonBlankCharacter(text)
  const byExtension = READABLE_FORMATS.find((row) => row.extension === extension) ?? null
  const byFirstCharacter =
    firstCharacter === null
      ? null
      : (READABLE_FORMATS.find((row) => row.firstCharacter === firstCharacter) ?? null)

  // OP-12 (MUST): the row is read as the format only when BOTH sides land on
  // it. Object identity is what "the same row" means here.
  if (byExtension !== null && byExtension === byFirstCharacter) {
    return { ok: true, format: byExtension.format }
  }
  return {
    ok: false,
    mismatch: mismatchOf(byExtension, byFirstCharacter),
    extension,
    firstCharacter,
  }
}
