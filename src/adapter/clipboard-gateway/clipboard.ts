// ClipboardGateway -- declares the interface Clipboard (table T-065 IF-5).
// @unit      UF-46   (docs/spec/05-07-design.md, table T-075)
// @component ClipboardGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      Clipboard, implemented in another layer (LR-5)

// see FR-025
// TRAP: PNG bytes, never SVG text: FR-025 puts one image/png item on the board and
// forbids the SVG text beside it, so a text-shaped picture arm cannot be honoured.
export type ClipboardContent =
  | {
      readonly kind: 'picture'
      readonly pngBytes: Uint8Array
    }
  | {
      readonly kind: 'document'
      readonly text: string
    }
  | {
      readonly kind: 'record'
      readonly text: string
    }

export type ClipboardFault =
  | 'notPermitted'
  | 'unsupported'
  | 'writeFailed'

export type ClipboardWriting =
  | { readonly ok: true }
  | { readonly ok: false; readonly fault: ClipboardFault }

export interface Clipboard {
  /** @purity non-pure */
  writeClipboardContent(content: ClipboardContent): Promise<ClipboardWriting>
}
