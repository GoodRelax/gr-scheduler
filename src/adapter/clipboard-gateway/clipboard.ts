// ClipboardGateway -- declares the interface Clipboard (table T-065 IF-5).
//
// @unit      UF-46   (docs/spec/05-07-design.md, table T-075)
// @component ClipboardGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      Clipboard, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHY THE COMPONENT EXISTS. The clipboard is a destination that is neither a
// file nor the document: table T-008 gives it a row of its own (R-9) as the
// far end of a route, and reaching it needs the browser, which LR-6 keeps out
// of the inner layers. IF-5 puts that reach on the far side of this
// declaration, so everything on this side stays a value.
//
// ⛔ ONE WAY, AND NO READ SIDE MAY BE ADDED. FR-033 says the buffer a
// duplication uses is the app's own and forbids reading the OS clipboard
// (MUST NOT); the reason it gives is that text from outside cannot be read as
// task data. Table T-008 carries the consequence -- R-9 is an outbound route
// and therefore not one of the intakes FR-023 validates. ⚠️ A read member here
// would open an intake that nothing checks, which is why the absence is stated
// rather than left to be noticed.
//
// ⭐ WHY EVERY CONTENT IS A STRING. R-9 names the things that leave this way,
// and `_source/components.json` draws this component's two inbound edges to
// match: "text out" from DocumentCodec and "picture out" from
// SvgRenderer. Both of those publish a string (PI-19 / PI-20). ⭐ The third,
// FR-102's record, has no inbound edge of its own because it is not made by
// another component: the shell keeps it out of the happenings it receives and
// the frames it runs, and SingleHtmlShell already has the "clipboard out" edge
// it travels on. ⚠️ The picture
// edge goes to SvgRenderer and NOT to ImageExporter -- AgentApiEndpoint is the
// component that has both, because AG-8 makes it answer for a raster too. So
// what this seam carries as a picture is the SVG string. ⛔ Should that reading
// ever be overturned, the change is one variant of `ClipboardContent` plus the
// edge in the manuscript; nothing else in this folder depends on it.
//
// ⛔ NOT DECIDED HERE, AND NOT CHECKABLE HERE: sizing, clipping, and whether
// the watermark question was put to the person. FR-025 says the clipboard
// route is inside its scope -- the picture that leaves this way is the same
// picture (FR-080) -- and it requires FR-020's choice to be put on this route
// too, because LM-8 reaches an outbound route. Those belong where the picture
// is made. This component receives one already made and cannot tell whether
// they were applied. Searched: FR-025, FR-020, table T-076, table T-008 R-9.
//
// ⚠️ The DOM library declares a global `Clipboard` as well. Table T-065 fixes
// this name, so it stays; the implementing component (CP-30) has to import
// this one rather than let the global win.

/**
 * What leaves through this route. The two variants are table T-008 R-9's own
 * two, in the order that row names them.
 *
 * ⭐ Discriminated rather than one string with a media type beside it: the two
 * differ in which requirement they answer to, not in how they are encoded, and
 * a media type here would be a browser fact stated one layer too far in
 * (LR-6). The layer that implements this seam is the one that knows what a
 * clipboard will take.
 */
export type ClipboardContent =
  | {
      /**
       * IO-6 of table T-024: the current screen, for pasting into a document
       * without going through a download.
       */
      readonly kind: 'picture'
      /**
       * The picture as SvgRenderer made it (PI-19). ⛔ Not re-rendered here:
       * FR-025 says what goes out this way is the same picture, and a second
       * rendering is exactly how it would stop being the same one.
       */
      readonly svg: string
    }
  | {
      /**
       * FR-068: the document a person has just read on the `AI Export Modal`
       * (U-30) and wants to hand to an AI.
       */
      readonly kind: 'document'
      /**
       * The text DocumentCodec made (PI-20). ⚠️ Which format that is belongs to
       * that component, not to this one -- table T-024 marks IO-2 as the
       * machine-facing one.
       */
      readonly text: string
    }
  | {
      /**
       * FR-102: the record of the happenings and the frames a person asked for
       * and then stopped, handed over so that it can be PASTED into a report.
       *
       * ⭐ THE THIRD THING R-9 CARRIES, AND NOT A NEW ROUTE. FR-102 (MUST)
       * sends the record this way in as many words, and table T-008's R-9 names
       * it in its own contents column beside the picture and the document -- so
       * the route is the one that was already there. ⛔ A second seam for it
       * would be the duplication rule 03 forbids.
       * ⚠️ IT IS NOT A DOCUMENT, though both variants carry a string. FR-102
       * (MUST NOT) keeps the contents of the document OUT of the record, so a
       * caller that read this as a document would be reading something that by
       * requirement holds no schedule at all.
       */
      readonly kind: 'record'
      /**
       * The record as the side that kept it wrote it. ⛔ Not composed here and
       * not re-read: FR-102 (MUST) puts the count of what was dropped at its
       * head, and only the side that dropped it knows that number.
       */
      readonly text: string
    }

/**
 * Why the clipboard did not take it.
 *
 * ⭐ A classification, never a sentence. FR-028 forbids throwing (MUST NOT) and
 * gives the reason: making a caller read an exception's text puts the kind of
 * a failure at the mercy of the implementation. A worded failure would do the
 * same. The words are the notice's (NT-1 of table T-037 requires them) and
 * they depend on the display language (FR-038), which is the screen's business
 * and not this layer's.
 *
 * ⭐ Three values, because NT-3a (MUST) makes a failure notice carry what can
 * be done next, and these three do not share a next step. ⚠️ Anything finer
 * would be guesswork: a browser reports a denied permission and a write made
 * outside a person's gesture as one and the same refusal, so they are one
 * value here rather than two the implementing side would have to invent a
 * difference between.
 */
export type ClipboardFault =
  /** The browser would not allow it. The person can ask for it again directly. */
  | 'notPermitted'
  /** This browser, or this way of opening the app, has no clipboard to write to. */
  | 'unsupported'
  /** It was allowed, attempted, and did not finish. */
  | 'writeFailed'

/**
 * What came of one write. ⭐ Success carries nothing: the clipboard gives back
 * no receipt, and inventing one would be a claim this side cannot support.
 */
export type ClipboardWriting =
  | { readonly ok: true }
  | { readonly ok: false; readonly fault: ClipboardFault }

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface Clipboard {
  /**
   * Put one content on the clipboard. The whole of what IF-5 supplies.
   *
   * ⭐ Answers, and does not just act. NT-3a (MUST) forbids telling a person of
   * a failure without telling them what to do next, and no next step can be
   * chosen if the write is a shout into the dark.
   *
   * ⚠️ FR-028 is the rule that forbids the throw, and it is worth saying that
   * this route is not itself an `Agent API` member -- `_assets/tbl-glossary.md`
   * §6 excludes it, because a clipboard has no counterpart that receives a
   * value. What carries over is the form: AG-8 of table T-035 already answers
   * for a picture that would not be made, by handing back a value.
   *
   * ⭐ A promise, because on the far side of this seam the permission and the
   * gesture are settled after the call returns. ⛔ It must not reject: FR-028
   * forbids the exception, and a refusal is one of `ClipboardFault`'s values.
   * ⚠️ The entry of this folder does not take that promise on trust -- see
   * `writeClipboard`.
   *
   * @purity non-pure
   */
  writeClipboardContent(content: ClipboardContent): Promise<ClipboardWriting>
}
