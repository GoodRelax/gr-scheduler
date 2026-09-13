// DocumentCodec -- the single .html half (table T-024 IO-7).
//
// @unit      UF-37   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    semi-pure-b
//
// Puts the application and one document into a single file (FR-067). UT-5 of
// table T-063 splits it from the other formats: it alone calls `AppShellSource`.
//
// ---- what this file does NOT do -------------------------------------------
//
// It does not READ a single .html: IO-7 is export only. Startup reads it (BT-1
// of table T-034, via `documentFromJson`) and obeys FR-067's rule on an
// unreadable or not-exactly-one entry; this file owes it exactly one entry.
//
// It does not judge the document: what arrives is already a `Document` whose
// lawfulness was settled earlier (`json-codec.ts` draws the same line). This
// file decides only where the bytes go and how they survive.
//
// ---- why the payload is GRS JSON ------------------------------------------
//
// BT-1 hands what it finds to the application's own intake, and FR-024 owns
// what a written document contains, which `jsonFromDocument` already obeys.
// ⛔ Do not serialize the document here: a second writer would drift from FR-024.
// FR-073's version rides inside the document (DR-4's `schemaVersion`), so the
// container carries no version attribute -- one fact, one copy.
//
// ---- how the bytes stay safe ----------------------------------------------
//
// The container is a `<script>` of a non-JavaScript type: its content is script
// data -- not decoded, executed or rendered (FR-067). The three ways bytes could
// still be lost are each closed:
//
//   1. ⛔ An end to the element inside the payload. `</script` closes script
//      data, and after `<!--` a `</script>` no longer does, so `embeddedJson`
//      escapes every `<` as `\u003c`. JSON holds `<` only inside strings, so
//      the escape is legal and `JSON.parse` returns the same value. `&` needs
//      no escape: script data decodes no character references.
//   2. ⛔ A control character in the artifact: the browser rewrites it and the
//      artifact's hash stops matching (rule 04 section 3). `JSON.stringify`
//      escapes every C0 character, and `isUsableElementId` refuses them in the
//      id.
//   3. ⛔ A hash that no longer matches CN-8's content security policy. This
//      file edits no existing script and adds a non-executable one, so no hash
//      changes. ⛔ Never give the container a JavaScript type.
//
// ⚠️ Placed at the end of the body: at the top of `<head>` it would push
// `<meta charset>` past the first 1024 bytes a browser reads, and CN-5's UTF-8
// would stop taking effect. So a boot reading BT-1 must run after parsing,
// which Vite's module script does (Chapter 1.4).

import type { Document } from '../../entity/document-model/document/document'
import type { AppShellSource } from './app-shell-source'
import { jsonFromDocument } from './json-codec'

/** Why a single .html could not be assembled. */
export type EmbeddedHtmlFaultReason =
  /** The application could not read its own HTML (compare LM-14). */
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
   * ⛔ Refused rather than tidied: FR-067 has the reader complain unless there
   * is exactly one entry, and this side cannot know which of two the reader
   * would take.
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
 * Not in docs/spec: it must be a type no browser runs as script, or point 3 of
 * the header fails. ⚠️ Every exported file carries it, so changing it changes
 * the exchanged file.
 */
const CONTAINER_TYPE = 'application/json'

/**
 * The characters an element id may NOT contain.
 *
 * Stated as what is refused, since each would break the start tag this file
 * writes, `<script type="..." id="${elementId}">`, or the scan that finds it:
 *
 *   - whitespace would begin a second attribute;
 *   - `"` or `'` would close the value (`idOfStartTag` reads both quotings);
 *   - `<` or `>` would end or reopen the tag (`containerSpans` stops at `>`);
 *   - `&` would be decoded as a character reference;
 *   - a C0 control or `\x7f` would be rewritten by the browser (point 2 of the
 *     header). An acceptance boundary is loosened only later, never
 *     tightened (rule 06 class F).
 *
 * ⛔ An empty id is refused too: it names no element.
 * Everything else is accepted, a leading digit, `.` and `:` included: the one
 * selector built from this id (`single-html-shell.ts`) goes through
 * `CSS.escape()`.
 */
const BREAKING_ELEMENT_ID_CHARACTER = /[\s"'<>&\x00-\x1f\x7f]/

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
  return elementId !== '' && !BREAKING_ELEMENT_ID_CHARACTER.test(elementId)
}

/**
 * The document, as the bytes that go inside the container.
 *
 * `jsonFromDocument` writes it, so FR-024 has one implementation. The escape is
 * point 1 of the header.
 *
 * @purity pure
 */
function embeddedJson(document: Document): string {
  return jsonFromDocument(document).replaceAll('<', '\\u003c')
}

/**
 * One container, complete.
 *
 * ⚠️ The whole element: a container found in the HTML is replaced entire, since
 * a start tag an older build wrote is not one this build can vouch for. The
 * shell owns only the id (`app-shell-source.ts`).
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
 * Steps over each element's content, so markup-like strings inside a bundle's
 * script are never taken for tags. An unterminated script runs to the end of
 * the file, as in a browser.
 *
 * ⛔ A start tag is read to its first `>`; `isUsableElementId` keeps that
 * character out of the one attribute this side writes.
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
 * ⚠️ The end of the body, for the charset reason in the header. Without
 * `</body>` or `</html>`, the end of the text.
 *
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
 * Replace the one that is there, add one where there is none, refuse where
 * there are two -- the half of FR-067 the writing side can keep.
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
  // ⚠️ Only the element is replaced, not the newline around it, so re-exporting
  // an export neither grows the file nor moves the container.
  return { ok: true, html: `${html.slice(0, only.begin)}${container}${html.slice(only.end)}` }
}

// ------------------------------------------- what is published: the export ---
//
// R7.7's order: everything above is `pure`; this one reads the seam.

/**
 * The application and one document, as a single .html (table T-024 IO-7).
 *
 * Returns the file as a value (AM-15 of table T-107, AG-7 of table T-035);
 * writing it to disk is FileGateway's (`singleHtml` form, FR-096).
 *
 * The one external read comes first and nothing external is read after it
 * (R7.3, R7.4), so the assembly can be tested without a browser.
 *
 * ⚠️ Failures come back as values (FR-028, R7.10); each reason names what can
 * be done next (NT-3a of table T-037).
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
