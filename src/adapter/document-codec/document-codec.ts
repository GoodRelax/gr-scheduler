// DocumentCodec -- public entry of this folder.
//
// @unit      UF-34   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-20
//
// Binds the codecs beside it to PI-20 and writes one name of its own,
// `formatFromFile` (OP-12 of table T-024a): which decoder a file goes to answers
// to neither format's authority, the line UT-5 of table T-063 splits
// `json-codec.ts` from `mspdi-codec.ts` along, so it belongs to the unit that
// binds both.
//
// Each member's argument and result types leave with it, or a caller would have
// to reach a sibling file.
// ⛔ `Document` is not re-published: it leaves through its own component's entry,
// and a second home would put this component in the way of every change to it.
// ⛔ Nor are `MSPDI_NAMESPACE`, `BYTE_ORDER_MARK` or `withoutLeadingByteOrderMark`:
// PI-20 names none of them, and `mspdi-codec.ts` exports the last two only so
// this folder's readers share one drop.

import exchangeFormats from './exchange-formats.json'
import { withoutLeadingByteOrderMark } from './mspdi-codec'

export type { AppShell, AppShellReading, AppShellSource } from './app-shell-source'

export { documentFromJson, jsonFromDocument } from './json-codec'
export type { FormatVersionReading, JsonDecoding, JsonFault } from './json-codec'

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
 * ⚠️ Spelled to match `ImportFormat` (CP-10) and `SaveFileForm` (CP-22) but
 * declared rather than imported: the component figure draws no edge to either.
 * It names the rows only; `ROW_OF_FORMAT` joins them by row id, the only join
 * table T-024 admits.
 */
export type ExchangeFormat = 'grsJson' | 'mspdi'

/**
 * Which side of OP-12 did not agree, so a notice can say which item is wrong
 * (NT-1 of table T-037).
 *
 * ⚠️ `both` also covers two sides naming different rows; nothing here may pick a
 * side (OP-12).
 */
export type FormatMismatch = 'extension' | 'firstCharacter' | 'both'

/**
 * What OP-12's two sides say about one file. ⛔ Not a refusal: acceptance is
 * OP-5's validation (FR-023).
 */
export type FormatReading =
  | { readonly ok: true; readonly format: ExchangeFormat }
  | {
      readonly ok: false
      readonly mismatch: FormatMismatch
      /** What was compared as the extension. `''` where the name holds no dot. */
      readonly extension: string
      /**
       * What was compared as the first character; `null` where the text holds no
       * non-blank one. ⚠️ Carried so a caller does not recompute it with a
       * built-in and undo the mark-then-blanks order.
       */
      readonly firstCharacter: string | null
    }

/**
 * What "non-blank" means for OP-12's first character: the whitespace RFC 8259
 * section 2 and XML 1.0's `S` production share.
 *
 * ⛔ Not `trimStart()` or `\s`: ECMAScript whitespace includes `U+FEFF`, so either
 * would silently eat the byte order mark and erase the drop-first order (FR-023).
 */
const BLANK_CHARACTERS: ReadonlySet<string> = new Set([' ', '\t', '\n', '\r'])

/**
 * Which row of table T-024 each format this build can decode is -- join keys,
 * not names for the rows.
 *
 * ⚠️ A row id that has moved leaves its format matching nothing, which refuses
 * files rather than opening one as the wrong format; `npm run gen:check` reports
 * the move.
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
 * ⛔ The values arrive from `exchange-formats.json`, generated from table T-024 by
 * `tools/generate_exchange_formats.py`; rule 03 section 1 forbids spelling
 * `.json` or `{` here.
 *
 * ⚠️ The artifact also carries write-only rows (FR-096), and every row that leaves
 * as a file has an extension. A row is kept only where BOTH columns are present,
 * by the test below rather than a list of row ids that would go stale.
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
 * case. Looked in OP-12, table T-024, FR-023, FR-087, FR-096 and every use of the
 * word for "extension" in docs/spec: none is about case. Compared literally,
 * because that direction is recoverable -- a `.JSON` file is refused and renamed,
 * whereas a loosened rule cannot be taken back from documents it already opened.
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
  // Each side names a row and the rows differ; see `FormatMismatch`.
  return 'both'
}

/**
 * OP-12 of table T-024a: which of the two decoders a file is sent to.
 *
 * ⛔ Two primitives, not `FileGateway`'s struct: `FileGateway -> DocumentCodec`
 * already exists, so reaching back would put a cycle in the Adapter layer (LR-3).
 *
 * ⚠️ The order of the lines below is OP-12's: drop the byte order mark, skip
 * blanks, take the first character, then compare both sides against the same row.
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

  // OP-12: both sides must land on the same row; object identity is what "the
  // same row" means here.
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
