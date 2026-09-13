// BrowserClipboard: implements Clipboard (table T-065 IF-5) over the browser's clipboard.
// @unit      UF-53   (docs/spec/05-07-design.md, table T-075)
// @component BrowserClipboard, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-30

import type {
  Clipboard,
  ClipboardContent,
  ClipboardFault,
} from '../../adapter/clipboard-gateway/clipboard-gateway'

// WHY: a picture goes as SVG text, not PNG: there is no edge to CanvasRasterizer (FR-025).
/** @purity pure */
function textFromContent(content: ClipboardContent): string {
  return content.kind === 'picture' ? content.svg : content.text
}

// STOP: spec does not decide which host refusal reads as notPermitted.
// Looked in FR-028, NT-3a, IF-5. @provisional PND-121
/** @purity pure */
function faultFromThrown(thrown: unknown): ClipboardFault {
  const isRefused =
    typeof thrown === 'object' &&
    thrown !== null &&
    'name' in thrown &&
    thrown.name === 'NotAllowedError'
  return isRefused ? 'notPermitted' : 'writeFailed'
}

/** @purity pure */
export function browserClipboard(
  systemClipboard: { writeText(text: string): Promise<void> } | undefined,
): Clipboard {
  return {
    /** @purity non-pure */
    async writeClipboardContent(content: ClipboardContent) {
      if (systemClipboard === undefined) return { ok: false, fault: 'unsupported' }
      try {
        await systemClipboard.writeText(textFromContent(content))
        return { ok: true }
      } catch (thrown) {
        return { ok: false, fault: faultFromThrown(thrown) }
      }
    },
  }
}
