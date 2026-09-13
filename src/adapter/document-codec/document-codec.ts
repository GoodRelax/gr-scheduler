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

export { exportEmbeddedHtml } from './embedded-html-codec'
export type {
  EmbeddedHtmlExport,
  EmbeddedHtmlFault,
  EmbeddedHtmlFaultReason,
} from './embedded-html-codec'

export type ExchangeFormat = 'grsJson' | 'mspdi'

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

const ROW_OF_FORMAT: Readonly<Record<ExchangeFormat, string>> = {
  grsJson: 'IO-2',
  mspdi: 'IO-1',
}

interface ReadableFormat {
  readonly format: ExchangeFormat
  readonly extension: string
  readonly firstCharacter: string
}

const READABLE_FORMATS: readonly ReadableFormat[] = (
  Object.keys(ROW_OF_FORMAT) as readonly ExchangeFormat[]
).flatMap((format) => {
  const row = exchangeFormats.formats.find((one) => one.rowId === ROW_OF_FORMAT[format])
  if (row === undefined) return []
  const { extension, firstCharacter } = row
  if (extension === null || firstCharacter === null) return []
  return [{ format, extension, firstCharacter }]
})

/** @purity pure */
function firstNonBlankCharacter(text: string): string | null {
  for (const character of withoutLeadingByteOrderMark(text)) {
    if (!BLANK_CHARACTERS.has(character)) return character
  }
  return null
}

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

// see OP-12
/** @purity pure */
export function formatFromFile(fileName: string, text: string): FormatReading {
  const extension = extensionOf(fileName)
  const firstCharacter = firstNonBlankCharacter(text)
  const byExtension = READABLE_FORMATS.find((row) => row.extension === extension) ?? null
  const byFirstCharacter =
    firstCharacter === null
      ? null
      : (READABLE_FORMATS.find((row) => row.firstCharacter === firstCharacter) ?? null)

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
