// DocumentCodec -- declares the interface AppShellSource (table T-065 IF-8).
//
// @unit      UF-38   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    n/a
// @seam      AppShellSource, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ---- what IF-8 fixes, and what is therefore decided here --------------------
//
// IF-8 says this seam supplies "the application's own HTML, which is needed to
// make IO-7". One sentence, and it settles three things before any member is
// written:
//
//   1. The HTML crosses as a VALUE. Only SingleHtmlShell (CP-25) can obtain
//      it -- it is the artifact CN-1 ships as one file, and CP-25 is the
//      component that knows where that file came from -- while only
//      DocumentCodec (CP-20) may assemble IO-7, because the document's bytes
//      are its business. Neither side can do the other's half, which is what a
//      seam is for.
//   2. Obtaining it is `semi-pure-b`: the answer comes from outside and is
//      neither cheap nor certain. That is already PI-20's classification of
//      `exportEmbeddedHtml`, the one member that calls this seam (table T-063
//      UT-5 gives that as the reason the single .html was split off).
//   3. It can fail, and the failure is a value. FR-028 forbids throwing across
//      this boundary (MUST NOT) and AG-8 of table T-035 has the caller receive
//      a failure as a value. LM-14 is the concrete case: opened straight off
//      the disk, an application cannot always read its own source back.
//
// ---- ⭐ the second thing that crosses: WHERE the document goes --------------
//
// ⚠️ The element that carries the embedded document belongs to the SHELL, not
// to this component. CP-25's responsibility column says the shell "holds the
// embedding container", and BT-1 of table T-034 -- the first place startup
// looks for a document -- is that container being read. The reader names it;
// this seam carries the name inward so the writer can aim at it.
//
// ⛔ Do not replace this with a constant exported from DocumentCodec. The
// shell would then import a value across a layer boundary in order to find its
// own container, and table T-064's PI-20 fixes what this component publishes
// -- six members, none of them such a constant.
//
// ⭐ The division that follows, and the one thing an implementer must not get
// wrong: the shell owns the container's ID, this component owns its MARKUP
// (see embedded-html-codec.ts). The reader needs only the id. The writer needs
// the markup to be an element whose content is neither rendered nor executed,
// and that is FR-067's business rather than something the shell may vary.

/**
 * The application as it was delivered, and where a document may be put into
 * it.
 *
 * ⚠️ "As it was delivered" means the HTML of the artifact, not the DOM the
 * running application has since built. A serialization of the live DOM would
 * carry a screen's worth of nodes that FR-067 never asked for, and the file
 * would grow every time it was exported from an export.
 */
export interface AppShell {
  /**
   * The application's own HTML, whole.
   *
   * ⭐ Text, not a node tree -- the same reason `SvgSurface` passes a string:
   * what crosses a seam has to be a value, and the side that assembles IO-7 is
   * not allowed to need a browser to do it.
   *
   * ⚠️ May already carry an embedded document, and that is normal: an
   * application started from a single .html export is reading its own source
   * when it answers this. What happens to that copy is the writer's rule, not
   * the shell's -- see `exportEmbeddedHtml`.
   */
  readonly html: string
  /**
   * The `id` attribute of the element BT-1 reads the embedded document out of.
   *
   * ⭐ The shell chooses it because the shell is what reads it.
   *
   * ⛔ Plain ASCII, and nothing that could end an attribute or a tag: this
   * value is written into a start tag and thereby into the artifact, where a
   * stray character costs more than a wrong value would --
   * docs/development-rules/04-verification.md section 3 records an entire
   * build that stopped loading because one control character reached a string
   * key. `isUsableElementId` in `embedded-html-codec.ts` holds the exact
   * shape; an id outside it is refused rather than repaired, because a
   * repaired id names an element the reader would then fail to find.
   */
  readonly embeddedDocumentElementId: string
}

/**
 * One attempt at reading the application's own HTML.
 *
 * ⭐ No reason enum, unlike `FileStoreFault`. NT-3a of table T-037 makes the
 * reason worth telling apart only when the next step differs, and there is one
 * next step here whatever went wrong: export the document on its own instead
 * (IO-2), because the single .html is the one form that needs the application
 * to be able to read itself.
 */
export type AppShellReading =
  | { readonly ok: true; readonly appShell: AppShell }
  | { readonly ok: false; readonly what: string }

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface AppShellSource {
  /**
   * Read the application's own HTML, and say where a document goes in it.
   * `semi-pure-b`.
   *
   * ⭐ One member, not two, so that R7.4 can be obeyed on this side of the
   * seam: `exportEmbeddedHtml` collects everything external before it starts
   * assembling, and two members would let a second read land in the middle of
   * the assembly.
   *
   * ⚠️ A promise, because an implementation may have to fetch the file it was
   * loaded from. AG-7 is still satisfied -- what comes back is a value and no
   * download dialogue is involved.
   *
   * ⛔ Asked, never remembered. The shell may be a different file from one run
   * to the next, and there is no version of this question whose answer keeps.
   */
  readAppShell(): Promise<AppShellReading>
}
