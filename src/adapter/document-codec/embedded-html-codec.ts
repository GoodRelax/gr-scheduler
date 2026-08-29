// DocumentCodec -- the single .html half (table T-024 IO-7).
//
// @unit      UF-37   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    semi-pure-b
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// Puts the application and one document into a single file (FR-067). Table
// T-063 UT-5 splits this off from the other two formats for two reasons at
// once: it is the only unit that calls `AppShellSource`, and it answers to
// FR-067 while GRS JSON answers to FR-024 and MSPDI to the exchange partner's
// schema.
//
// ---- ⛔ what this file does NOT do -----------------------------------------
//
// It does not READ a single .html. IO-7's direction column says export only,
// and T-075 gives UF-37 "writing the single .html" and nothing else. The other
// end is startup: BT-1 of table T-034 is the shell taking the text out of its
// own container and handing it to `documentFromJson`. FR-067's MUST on that
// end -- an unreadable document, or an entry that is not exactly one, is told
// about rather than dropped, and startup then descends to the next rank of
// table T-034 -- is the reader's to obey. What this file owes the reader is
// that a file it wrote never puts it in that position: exactly one entry,
// always.
//
// It does not judge the document either, and that is the same line
// `json-codec.ts` draws for its half. There, the question is "is this text a
// GRS JSON document at all", while FR-023's ceilings, dates and counts belong
// to ValidateImportedDocument (CP-13). Here, on the writing side, there is no
// question left of either kind: what arrives is already a `Document`, and
// whether it was lawful was settled before it reached this component. This
// file decides one thing only -- where the bytes go and how they survive.
//
// ---- ⭐ why the payload is GRS JSON ----------------------------------------
//
// FR-067 says "the application and the document", not which form the document
// takes, and the choice is forced rather than free: BT-1 hands what it finds
// to the application's own intake, IO-2 is the tool's main data form, and
// FR-024 owns what a written document has to contain -- every presentation
// value even at its default, every null column with its key still on it, and
// the format version FR-073 compares. `jsonFromDocument` already obeys all of
// that. ⛔ Do not serialize the document here: a second writer would be a
// second authority over FR-024, and the two would drift.
//
// FR-073's version rides along inside the document (DR-4's `schemaVersion`),
// which is why nothing here puts a version attribute on the container. Two
// copies of one fact is the failure FR-073's rationale is about -- a build
// that cannot tell a broken document from an old one.
//
// ---- ⚠️ how the bytes stay safe --------------------------------------------
//
// The container is a `<script>` element whose type is not a JavaScript one, so
// its content is script data: the HTML parser does no character-reference
// decoding inside it, the browser does not execute it, and nothing in it is
// rendered -- which is FR-067's "the embedded content must not leak into the
// body". The three ways bytes could still be lost are each closed:
//
//   1. ⛔ An END TO THE ELEMENT INSIDE THE PAYLOAD. `</script` closes script
//      data, and `<!--` opens the escaped state where a later `</script>` no
//      longer closes it. `embeddedJson` escapes every `<` as the six
//      characters `\u003c`, so neither sequence can occur. `<` reaches
//      JSON only inside a string literal (the structural characters are
//      braces, brackets, comma and colon), so the escape is always legal
//      there and `JSON.parse` gives back the identical value. `&` needs no
//      escape either: script data has no character references to decode it
//      into something else.
//   2. ⛔ A CONTROL CHARACTER IN THE ARTIFACT.
//      docs/development-rules/04-verification.md section 3 records this
//      failing for real -- one control character in a string key, the browser
//      rewrites it, the artifact's hash stops matching and the whole
//      application stops loading. `JSON.stringify` escapes every C0 character,
//      NUL included, as a six-character `\u00XX`, so no raw control character
//      can reach the file through the document. The one other thing written
//      here is the element id, and `isUsableElementId` holds it to ASCII
//      letters, digits, `-` and `_`.
//   3. ⛔ A HASH THAT NO LONGER MATCHES. CN-8 gives the artifact a content
//      security policy, and a policy that names script hashes is invalidated
//      by any edit to a script it covers. This file edits no existing script:
//      it writes a NEW element, and one that is not executable, so it needs no
//      hash of its own and changes none. ⛔ Never give the container a
//      JavaScript type -- that alone would turn every export into a policy
//      violation.
//
// ⚠️ Placement is the end of the body, and the reason is not taste: a payload
// put at the top of `<head>` pushes `<meta charset>` past the first 1024 bytes
// a browser reads, and the UTF-8 that CN-5 fixes stops taking effect for the
// whole file. ⚠️ It also means the container is parsed after the application's
// own script tag, so a boot that reads BT-1 must run after parsing -- which is
// what Chapter 1.4's build (Vite, whose output is a module script) does.

import type { Document } from '../../entity/document-model/document/document'
import type { AppShellSource } from './app-shell-source'
import { jsonFromDocument } from './json-codec'

/** Why a single .html could not be assembled. */
export type EmbeddedHtmlFaultReason =
  /**
   * The application could not read its own HTML. ⚠️ LM-14's neighbourhood:
   * opened straight off the disk, a file cannot always be read back.
   */
  | 'appShellUnavailable'
  /**
   * The shell named its container with something that cannot be written into a
   * start tag. ⛔ Refused rather than repaired -- a repaired id names an
   * element the reader would no longer find.
   */
  | 'unusableElementId'
  /**
   * The application's own HTML already carries more than one container.
   *
   * ⛔ Refused rather than tidied. FR-067 has the reader complain when the
   * entry is not exactly one, and this side cannot know which of two the
   * reader will take, so writing into either would be picking a winner on the
   * reader's behalf. ⚠️ This build cannot produce such a file; one means the
   * HTML was assembled by something else.
   *
   * @provisional PD-70
   */
  | 'moreThanOneEntry'

export interface EmbeddedHtmlFault {
  readonly reason: EmbeddedHtmlFaultReason
  /** Detail for the log and for the notice's body. Never the only thing said. */
  readonly what: string
}

export type EmbeddedHtmlExport =
  | { readonly ok: true; readonly html: string }
  | { readonly ok: false; readonly fault: EmbeddedHtmlFault }

/**
 * The container's type attribute.
 *
 * ⛔ Not in docs/spec, and not free either: it has to be a type no browser
 * treats as a script, or point 3 of the header comment stops holding. See
 * PD-70.
 *
 * @provisional PD-70
 */
const CONTAINER_TYPE = 'application/json'

/**
 * The ids that can be written into a start tag and found again.
 *
 * ⛔ Not in docs/spec: no table names the container, so no table constrains
 * what may name it. The shape below is the classic HTML id -- an ASCII letter
 * followed by letters, digits, `-` and `_` -- which is narrower than today's
 * HTML allows and deliberately so. Point 2 of the header comment is the
 * reason. See PD-71.
 *
 * @provisional PD-71
 */
const USABLE_ELEMENT_ID = /^[A-Za-z][A-Za-z0-9_-]*$/

/** Half-open, as the names say: `begin` is the `<`, `end` is past the `>`. */
interface ElementSpan {
  readonly begin: number
  readonly end: number
}

/** @purity pure */
function fault(reason: EmbeddedHtmlFaultReason, what: string): EmbeddedHtmlFault {
  return { reason, what }
}

/** @purity pure */
function isUsableElementId(elementId: string): boolean {
  return USABLE_ELEMENT_ID.test(elementId)
}

/**
 * The document, as the bytes that go inside the container.
 *
 * ⭐ `jsonFromDocument` writes it, so FR-024 has exactly one implementation.
 * The escape is point 1 of the header comment.
 *
 * @purity pure
 */
function embeddedJson(document: Document): string {
  return jsonFromDocument(document).replaceAll('<', '\\u003c')
}

/**
 * One container, complete.
 *
 * ⚠️ The whole element, start tag included. This component owns the markup and
 * the shell owns only the id (see `app-shell-source.ts`), so a container found
 * in the HTML is replaced entire rather than filled in: a start tag written by
 * an older build is not one this build can vouch for.
 *
 * @purity pure
 */
function containerHtml(elementId: string, json: string): string {
  return `<script type="${CONTAINER_TYPE}" id="${elementId}">${json}</script>`
}

/**
 * The value of the `id` attribute of one start tag, or `null` if it has none.
 *
 * @purity pure
 */
function idOfStartTag(startTag: string): string | null {
  const found = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(startTag)
  if (found === null) return null
  return found[1] ?? found[2] ?? found[3] ?? null
}

/**
 * Where the next `<script` start tag begins at or after `from`, or -1.
 *
 * ⚠️ Only a tag name that ends there counts: `<scripting` is not one.
 *
 * @purity pure
 */
function indexOfScriptStart(lowerHtml: string, from: number): number {
  const NAME = '<script'
  for (let at = lowerHtml.indexOf(NAME, from); at >= 0; at = lowerHtml.indexOf(NAME, at + 1)) {
    // charAt gives '' past the end, which ends the tag name as surely as '>'.
    if (!/[a-z0-9]/.test(lowerHtml.charAt(at + NAME.length))) return at
  }
  return -1
}

/**
 * Every `<script>` element carrying that id.
 *
 * ⭐ Walks element by element and steps over each one's content, so the text
 * inside a script -- which is where a bundle keeps strings that can look like
 * markup -- is never mistaken for a tag.
 *
 * ⚠️ An unterminated script is taken to run to the end of the file, which is
 * what a browser does with one too.
 *
 * ⛔ A start tag is read as far as its first `>`, so an attribute value
 * holding one would cut it short. The container this file writes never has
 * such a value -- `isUsableElementId` is what makes that true of the only
 * attribute this side supplies.
 *
 * @purity pure
 */
function containerSpans(html: string, elementId: string): readonly ElementSpan[] {
  const spans: ElementSpan[] = []
  const lower = html.toLowerCase()
  let foundAt = 0
  while (foundAt < html.length) {
    const begin = indexOfScriptStart(lower, foundAt)
    if (begin < 0) break
    const startTagEnd = html.indexOf('>', begin)
    if (startTagEnd < 0) break
    const closeTag = lower.indexOf('</script', startTagEnd + 1)
    const closeTagEnd = closeTag < 0 ? -1 : html.indexOf('>', closeTag)
    const end = closeTagEnd < 0 ? html.length : closeTagEnd + 1
    if (idOfStartTag(html.slice(begin, startTagEnd + 1)) === elementId) {
      spans.push({ begin, end })
    }
    foundAt = end
  }
  return spans
}

/**
 * Where a container goes when the HTML has none yet.
 *
 * ⚠️ The end of the body, for the charset reason in the header comment. A
 * fragment with neither `</body>` nor `</html>` takes it at the end, which is
 * the same position by another route.
 *
 * @provisional PD-70
 * @purity pure
 */
function indexOfInsertion(html: string): number {
  const lower = html.toLowerCase()
  const body = lower.lastIndexOf('</body')
  if (body >= 0) return body
  const root = lower.lastIndexOf('</html')
  if (root >= 0) return root
  return html.length
}

/**
 * The application's HTML with exactly one container in it, holding that JSON.
 *
 * ⭐ The whole placement rule, in one pure function: replace the one that is
 * there, add one where there is none, refuse where there are two. That is what
 * makes "exactly one entry" true of every file this component writes, which is
 * the half of FR-067 the writing side can keep.
 *
 * @purity pure
 */
function htmlWithContainer(html: string, elementId: string, json: string): EmbeddedHtmlExport {
  const spans = containerSpans(html, elementId)
  if (spans.length > 1) {
    return {
      ok: false,
      fault: fault(
        'moreThanOneEntry',
        `the application's own HTML carries ${spans.length} elements with the id ${elementId}`,
      ),
    }
  }

  const container = containerHtml(elementId, json)
  const only = spans[0]
  if (only === undefined) {
    const foundAt = indexOfInsertion(html)
    return { ok: true, html: `${html.slice(0, foundAt)}${container}\n${html.slice(foundAt)}` }
  }
  // ⚠️ The element is replaced, the newline around it is not, so re-exporting
  // an export neither grows the file nor moves the container.
  return { ok: true, html: `${html.slice(0, only.begin)}${container}${html.slice(only.end)}` }
}

// ------------------------------------------- what is published: the export ---
//
// R7.7's order: everything above is `pure`; this one reads the seam.

/**
 * The application and one document, as a single .html (table T-024 IO-7).
 *
 * ⭐ Returns the file as a value. AM-15 of table T-107 says so for the Agent
 * API's side of it, and AG-7 of table T-035 forbids an export that can only
 * arrive through a download dialogue. Who writes it to disk is FileGateway's
 * business (`singleHtml` is one of its forms), and FR-096 keeps the one entry
 * that chooses between the forms outside this component.
 *
 * ⭐ The one external read happens first and nothing external is read after
 * it (R7.3, R7.4). Everything from there on is the pure assembly above, which
 * is what lets the interesting half be tested without a browser.
 *
 * ⚠️ Failures come back as values: FR-028 forbids throwing across this
 * boundary (MUST NOT) and AG-8 has the caller receive a failure as a value.
 * Every reason names what can be done next, which NT-3a of table T-037
 * requires of the notice that follows.
 *
 * @purity semi-pure-b
 */
export async function exportEmbeddedHtml(
  source: AppShellSource,
  document: Document,
): Promise<EmbeddedHtmlExport> {
  const reading = await source.readAppShell()
  if (!reading.ok) return { ok: false, fault: fault('appShellUnavailable', reading.what) }

  const { html, embeddedDocumentElementId } = reading.appShell
  if (!isUsableElementId(embeddedDocumentElementId)) {
    return {
      ok: false,
      fault: fault(
        'unusableElementId',
        'the id the shell gave its container cannot be written into a start tag safely',
      ),
    }
  }

  return htmlWithContainer(html, embeddedDocumentElementId, embeddedJson(document))
}
