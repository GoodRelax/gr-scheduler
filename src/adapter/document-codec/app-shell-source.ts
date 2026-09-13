// DocumentCodec -- declares the interface AppShellSource (table T-065 IF-8).
//
// @unit      UF-38   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    n/a
// @seam      AppShellSource, implemented in another layer (LR-5)
//
// IF-8 supplies the application's own HTML, needed to make IO-7:
//   1. It crosses as a value: only SingleHtmlShell (CP-25) can obtain it, and
//      only DocumentCodec (CP-20) may assemble IO-7.
//   2. Obtaining it is `semi-pure-b`, as PI-20 classifies `exportEmbeddedHtml`,
//      its one caller.
//   3. It can fail, as a value (FR-028, AG-8); LM-14 is the case of a file
//      opened straight off the disk.
//
// The shell also supplies WHERE the document goes: the embedding container is
// the shell's (CP-25), and BT-1 of table T-034 reads it.
//
// ⛔ The id `embedded-document` is fixed by a contract with writers outside this
// build (an agent may assemble a single .html from a copy of the artifact), in
// section 5-1 of previous-project-result/10-agent-interface/agent-interface-spec-ja.md.
// It passes `isUsableElementId` in embedded-html-codec.ts.
//
// ⛔ Not a constant exported from DocumentCodec: PI-20 publishes no such member,
// and check 26b refuses a name crossing a folder boundary without a row. The id
// reaches no stored file (IO-7 is write-only), so changing it is one line.
//
// ⚠️ index.html carries no container in this build, so the first export takes
// the writer's "add one" branch, and BT-1 must read a missing element as nothing
// embedded, not only an empty one.
//
// The shell supplies the id; this component owns the container's markup
// (embedded-html-codec.ts), which FR-067 requires be neither rendered nor executed.

/**
 * The application as it was delivered, and where a document may be put into it.
 *
 * ⚠️ The artifact's HTML, not a serialization of the live DOM, which would carry
 * a screen's worth of nodes and grow with every export made from an export.
 */
export interface AppShell {
  /**
   * The application's own HTML, whole -- text, so the side assembling IO-7 needs
   * no browser.
   *
   * ⚠️ May already carry an embedded document (a run started from an export);
   * what happens to it is `exportEmbeddedHtml`'s rule.
   */
  readonly html: string
  /**
   * The `id` of the element BT-1 reads the embedded document out of:
   * `embedded-document` (see the file header).
   *
   * ⛔ Kept `string`, not that literal: the seam carries whatever id
   * `AppShell.html` was assembled with, and a literal type would make
   * `unusableElementId` unreachable for HTML this build did not assemble.
   * `isUsableElementId` in `embedded-html-codec.ts` holds the accepted shape
   * (plain ASCII, nothing that ends an attribute or a tag); an id outside it is
   * refused, not repaired, because a repaired id names an element the reader
   * would not find.
   */
  readonly embeddedDocumentElementId: string
}

/**
 * One attempt at reading the application's own HTML.
 *
 * No reason enum, unlike `FileStoreFault`: NT-3a of table T-037 separates reasons
 * only when the next step differs, and here it is always exporting the document
 * on its own (IO-2).
 */
export type AppShellReading =
  | { readonly ok: true; readonly appShell: AppShell }
  | { readonly ok: false; readonly what: string }

// The members are decided here: table T-065 names only the interface.
export interface AppShellSource {
  /**
   * Read the application's own HTML, and say where a document goes in it.
   * `semi-pure-b`.
   *
   * One member, so `exportEmbeddedHtml` collects everything external before it
   * assembles (R7.4). A promise, because an implementation may fetch the file it
   * was loaded from; the result is still a value (AG-7).
   *
   * ⛔ Asked, never remembered: the shell may be a different file next run.
   */
  readAppShell(): Promise<AppShellReading>
}
