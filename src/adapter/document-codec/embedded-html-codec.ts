// Puts the application and one document into a single .html file.
// @unit      UF-37   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    semi-pure-b

import type { Document } from '../../entity/document-model/document/document'
import type { AppShellSource } from './app-shell-source'
import { jsonFromDocument } from './json-codec'

export type EmbeddedHtmlFaultReason =
  | 'appShellUnavailable'
  | 'unusableElementId'
  | 'moreThanOneEntry'

export interface EmbeddedHtmlFault {
  readonly reason: EmbeddedHtmlFaultReason
  readonly what: string
}

export type EmbeddedHtmlExport =
  | { readonly ok: true; readonly html: string }
  | { readonly ok: false; readonly fault: EmbeddedHtmlFault }

const CONTAINER_TYPE = 'application/json'

const BREAKING_ELEMENT_ID_CHARACTER = /[\s"'<>&\x00-\x1f\x7f]/

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

/** @purity pure */
function embeddedJson(document: Document): string {
  return jsonFromDocument(document).replaceAll('<', '\\u003c')
}

/** @purity pure */
function containerHtml(elementId: string, json: string): string {
  return `<script type="${CONTAINER_TYPE}" id="${elementId}">${json}</script>`
}

/** @purity pure */
function idOfStartTag(startTag: string): string | null {
  const found = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(startTag)
  if (found === null) return null
  return found[1] ?? found[2] ?? found[3] ?? null
}

/** @purity pure */
function indexOfScriptStart(lowerHtml: string, from: number): number {
  const NAME = '<script'
  for (let at = lowerHtml.indexOf(NAME, from); at >= 0; at = lowerHtml.indexOf(NAME, at + 1)) {
    if (!/[a-z0-9]/.test(lowerHtml.charAt(at + NAME.length))) return at
  }
  return -1
}

/** @purity pure */
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

// WHY: not at the top of <head>: that pushes <meta charset> past the first 1024 bytes a browser reads.
/** @purity pure */
function indexOfInsertion(html: string): number {
  const lower = html.toLowerCase()
  const body = lower.lastIndexOf('</body')
  if (body >= 0) return body
  const root = lower.lastIndexOf('</html')
  if (root >= 0) return root
  return html.length
}

/** @purity pure */
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
  return { ok: true, html: `${html.slice(0, only.begin)}${container}${html.slice(only.end)}` }
}

// see IO-7, FR-067
/** @purity semi-pure-b */
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
