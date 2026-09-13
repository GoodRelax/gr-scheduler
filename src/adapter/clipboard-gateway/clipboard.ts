// ClipboardGateway -- declares the interface Clipboard (table T-065 IF-5).
//
// @unit      UF-46   (docs/spec/05-07-design.md, table T-075)
// @component ClipboardGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      Clipboard, implemented in another layer (LR-5)
//
// The clipboard is a destination that is neither a file nor the document (CHN-9
// of table T-008), and reaching it needs the browser (LR-6); IF-5 puts that reach
// on the far side of this declaration.
//
// ⛔ One way; no read member may be added. FR-033 (MUST NOT) forbids reading the
// OS clipboard, and CHN-9 is outbound, so a read member would open an intake that
// FR-023 validates nowhere.
//
// Every content is a string: the inbound edges in `_source/components.json` come
// from DocumentCodec and SvgRenderer, which publish strings (PI-19 / PI-20), and
// FR-102's record travels on SingleHtmlShell's "clipboard out" edge. ⚠️ The
// picture edge goes to SvgRenderer, not ImageExporter, so a picture is the SVG
// string; overturning that is one variant of `ClipboardContent` plus the edge.
//
// ⛔ NOT CHECKABLE HERE: sizing, clipping, and FR-020's watermark choice on this
// route (FR-025, LM-8) belong where the picture is made, and a picture that
// arrives made cannot show whether they were applied. Looked in FR-025, FR-020,
// table T-076, table T-008 CHN-9.
//
// ⚠️ The DOM library declares a global `Clipboard` too; table T-065 fixes this
// name, so CP-30 must import this one rather than let the global win.

/**
 * What leaves through this route: the contents CHN-9 of table T-008 names.
 *
 * Discriminated rather than a string with a media type: the variants differ in
 * which requirement they answer to, and a media type would be a browser fact one
 * layer too far in (LR-6).
 */
export type ClipboardContent =
  | {
      /** IO-6 of table T-024: the current screen, pasted without a download. */
      readonly kind: 'picture'
      /**
       * The picture as SvgRenderer made it (PI-19). ⛔ Not re-rendered here: a
       * second rendering is how it would stop being the same picture (FR-025).
       */
      readonly svg: string
    }
  | {
      /** FR-068: the document read on the `AI Export Modal` (U-30). */
      readonly kind: 'document'
      /** The text DocumentCodec made (PI-20); which format is that component's. */
      readonly text: string
    }
  | {
      /**
       * FR-102: the record a person asked for and stopped, for pasting. It rides
       * CHN-9 rather than a second seam.
       * ⚠️ Not a document, though both carry a string: FR-102 (MUST NOT) keeps the
       * document's contents out of the record.
       */
      readonly kind: 'record'
      /**
       * The record as the side that kept it wrote it. ⛔ Not composed here: the
       * count of what was dropped heads it (FR-102), and only that side knows it.
       */
      readonly text: string
    }

/**
 * Why the clipboard did not take it.
 *
 * A classification, never a sentence: the words are the notice's (NT-1, FR-038),
 * and FR-028 keeps a failure's kind out of wording.
 *
 * One value per next step (NT-3a). ⚠️ No finer: a browser reports a denied
 * permission and a write outside a gesture as the same refusal.
 */
export type ClipboardFault =
  /** The browser would not allow it. The person can ask for it again directly. */
  | 'notPermitted'
  /** This browser, or this way of opening the app, has no clipboard to write to. */
  | 'unsupported'
  /** It was allowed, attempted, and did not finish. */
  | 'writeFailed'

/** What came of one write. Success carries nothing: the clipboard gives no receipt. */
export type ClipboardWriting =
  | { readonly ok: true }
  | { readonly ok: false; readonly fault: ClipboardFault }

// The members are decided here: table T-065 names only the interface.
export interface Clipboard {
  /**
   * Put one content on the clipboard -- the whole of what IF-5 supplies.
   *
   * Answers rather than just acting, so a failure notice can name a next step
   * (NT-3a). This route is not an `Agent API` member (`_assets/tbl-glossary.md`
   * section 6), but it takes AG-8's form of answering with a value.
   *
   * A promise, because the permission and the gesture settle after the call.
   * ⛔ It must not reject (FR-028); ⚠️ `writeClipboard` does not trust that anyway.
   *
   * @purity non-pure
   */
  writeClipboardContent(content: ClipboardContent): Promise<ClipboardWriting>
}
