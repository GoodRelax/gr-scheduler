// Public entry of DocumentCodec: binds the codecs and picks the decoder for a file.
// @unit      UF-34   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-20

import exchangeFormats from './exchange-formats.json'
import { withoutLeadingByteOrderMark } from './mspdi-codec'

export type { AppShell, AppShellReading, AppShellSource } from './app-shell-source'

export { documentFromJson, jsonFromDocument } from './json-codec'
export type { FormatVersionReading, JsonDecoding, JsonFault } from './json-codec'

export { documentFromMspdi, mspdiFromDocument } from './mspdi-codec'
export type { MspdiDecoding, MspdiEncoding, MspdiFault, MspdiNotice } from './mspdi-codec'

export { documentFromEmbeddedHtml, exportEmbeddedHtml } from './embedded-html-codec'
export type {
  EmbeddedHtmlExport,
  EmbeddedHtmlFault,
  EmbeddedHtmlFaultReason,
  EmbeddedHtmlReading,
} from './embedded-html-codec'

export type ExchangeFormat = 'grsJson' | 'mspdi' | 'singleHtml'

export type FormatMismatch = 'extension' | 'firstCharacter' | 'both'

export type FormatReading =
  | { readonly ok: true; readonly format: ExchangeFormat }
  | {
      readonly ok: false
      readonly mismatch: FormatMismatch
      readonly extension: string
      readonly firstCharacter: string | null
    }

// TRAP: not trimStart() or \s: both eat U+FEFF and undo the drop-the-mark-first order.
const BLANK_CHARACTERS: ReadonlySet<string> = new Set([' ', '\t', '\n', '\r'])

interface ReadableFormat {
  readonly format: ExchangeFormat
  readonly extension: string
  readonly firstCharacter: string
}

// see T-024, OP-1
// TRAP: a row table T-024 lets in with no decoder named here stops this module from loading, never silently.
/** @purity pure */
function formatOfReadableRow(rowId: string): ExchangeFormat {
  switch (rowId) {
    case 'IO-2':
      return 'grsJson'
    case 'IO-1':
      return 'mspdi'
    case 'IO-7':
      return 'singleHtml'
  }
  throw new Error(`table T-024 row ${rowId} comes in, and DocumentCodec has no decoder for it`)
}

const READABLE_FORMATS: readonly ReadableFormat[] = exchangeFormats.formats.flatMap((row) => {
  const { extension, firstCharacter } = row
  if (extension === null || firstCharacter === null) return []
  return [{ format: formatOfReadableRow(row.rowId), extension, firstCharacter }]
})

// see T-024
/** @purity pure */
export function extensionOfFormat(rowId: string): string {
  return exchangeFormats.formats.find((one) => one.rowId === rowId)?.extension ?? ''
}

/** @purity pure */
function firstNonBlankCharacter(text: string): string | null {
  for (const character of withoutLeadingByteOrderMark(text)) {
    if (!BLANK_CHARACTERS.has(character)) return character
  }
  return null
}

// STOP: spec does not decide whether the extension comparison ignores case. Looked in OP-12, T-024, FR-096 (PND-458)
/** @purity pure */
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
  return 'both'
}

// see OP-12, T-024
// WHY: the row is chosen by the pair; two readable rows share their first character, so one column names no row.
/** @purity pure */
export function formatFromFile(fileName: string, text: string): FormatReading {
  const extension = extensionOf(fileName)
  const firstCharacter = firstNonBlankCharacter(text)
  const byExtension = READABLE_FORMATS.find((row) => row.extension === extension) ?? null
  const byFirstCharacter =
    firstCharacter === null
      ? null
      : (READABLE_FORMATS.find((row) => row.firstCharacter === firstCharacter) ?? null)

  if (byExtension !== null && byExtension.firstCharacter === firstCharacter) {
    return { ok: true, format: byExtension.format }
  }
  return {
    ok: false,
    mismatch: mismatchOf(byExtension, byFirstCharacter),
    extension,
    firstCharacter,
  }
}
