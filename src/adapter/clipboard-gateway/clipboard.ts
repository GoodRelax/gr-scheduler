// ClipboardGateway -- declares the interface Clipboard (table T-065 IF-5).
// @unit      UF-46   (docs/spec/05-07-design.md, table T-075)
// @component ClipboardGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      Clipboard, implemented in another layer (LR-5)

export type ClipboardContent =
  | {
      readonly kind: 'picture'
      readonly svg: string
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
