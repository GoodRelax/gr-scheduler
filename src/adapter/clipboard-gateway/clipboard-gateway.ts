// ClipboardGateway: writes through the Clipboard seam and answers with a value.
// @unit      UF-45   (docs/spec/05-07-design.md, table T-075)
// @component ClipboardGateway, layer Adapter (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-24

import type { Clipboard, ClipboardContent, ClipboardWriting } from './clipboard'

export type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
  ClipboardWriting,
} from './clipboard'

/** @purity non-pure */
export async function writeClipboard(
  clipboard: Clipboard,
  content: ClipboardContent,
): Promise<ClipboardWriting> {
  try {
    return await clipboard.writeClipboardContent(content)
  } catch {
    return { ok: false, fault: 'writeFailed' }
  }
}
