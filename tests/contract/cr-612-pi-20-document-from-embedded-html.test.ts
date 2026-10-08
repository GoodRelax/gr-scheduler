// CR-612 spec-only tests: PI-20 documentFromEmbeddedHtml and OP-12 -- a single .html is read without a DOM, in FR-067's order.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import * as codec from '../../src/adapter/document-codec/document-codec'
import type { AppShellReading, AppShellSource } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { REQUIREMENTS, TEMPLATE_TEXT, here, there } from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

type EmbeddedReading = { readonly ok: true; readonly document: Document } | { readonly ok: false }
type DocumentFromEmbeddedHtml = (html: string, elementIds: readonly string[], greatestKnownVersion: string) => EmbeddedReading

const PUBLISHED = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8')
const VERSION = (JSON.parse(TEMPLATE_TEXT) as { schemaVersion: string }).schemaVersion
const DOCUMENT_ID = 'embedded-document'
const TEMPLATE_ID = 'startup-template-under-test'

const READ_ORDER =
  '開く道では、埋め込まれた文書の入れ口を読み、それが無ければ初期テンプレートの容れ物を読むこと（MUST）'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

function reader(): DocumentFromEmbeddedHtml {
  const found = (codec as unknown as Record<string, unknown>)['documentFromEmbeddedHtml']
  expect(typeof found, 'PI-20: DocumentCodec does not publish documentFromEmbeddedHtml').toBe('function')
  return found as DocumentFromEmbeddedHtml
}

const container = (id: string, document: unknown): string =>
  `<script type="application/json" id="${id}">${codec.jsonFromDocument(document as never).replace(/</g, '\\u003c')}</script>`

const page = (...containers: string[]): string =>
  PLAIN_SHELL.replace('<script type="module">', `${containers.join('')}<script type="module">`)

const shellSource = (html: string): AppShellSource => ({
  readAppShell: async () =>
    ({ ok: true, appShell: { html, embeddedDocumentElementId: DOCUMENT_ID, omittedElementIds: [] } }) as AppShellReading,
})

function titleOf(reading: EmbeddedReading): unknown {
  return reading.ok ? (reading.document as unknown as { schedule: { project: { title: unknown } } }).schedule.project.title : null
}

describe('PI-20 / IO-7 / FR-067 -- the manuscript still says it', () => {
  it('PI-20 publishes documentFromEmbeddedHtml beside exportEmbeddedHtml', () => {
    expect(PUBLISHED).toContain('`documentFromEmbeddedHtml`')
  })

  it('IO-7 is read as well as written, and starts with <', () => {
    const row = specTable('T-024').rows.find((one) => one.id === 'IO-7')
    expect(row?.cells.join(' ')).toContain('取込 / 書出')
    expect(row?.cells.join(' ')).toContain('`<`')
    expect(REQUIREMENTS).toContain(READ_ORDER)
  })
})

describe('OP-1 -- the open route accepts every row of T-024 that comes in', () => {
  it('OP-1: the rows accepted are the T-024 rows whose direction includes import, and IO-7 is one', () => {
    const op1 = specTable('T-024a').rows.find((one) => one.id === 'OP-1')
    expect(op1?.cells.join(' ')).toContain('方向に取込を持つ行')
    const incoming = specTable('T-024')
      .rows.filter((one) => one.cells.some((cell) => cell.includes('取込')))
      .map((one) => one.id)
    expect(incoming).toEqual(expect.arrayContaining(['IO-1', 'IO-2', 'IO-7']))
  })

  it('OP-1 / OP-12: the generated format list gives IO-7 the extension .html and the first character <', () => {
    const formats = JSON.parse(readFileSync(join(process.cwd(), 'src', 'adapter', 'document-codec', 'exchange-formats.json'), 'utf8')) as unknown
    const rows: { rowId: string; extension: string | null; firstCharacter: string | null }[] = []
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) for (const one of node) walk(one)
      else if (node !== null && typeof node === 'object') {
        const record = node as Record<string, unknown>
        if (typeof record['rowId'] === 'string') rows.push(record as never)
        else for (const value of Object.values(record)) walk(value)
      }
    }
    walk(formats)
    expect(rows.find((one) => one.rowId === 'IO-7')).toMatchObject({ extension: '.html', firstCharacter: '<' })
  })

  it('OP-1 / IO-7: a single .html handed to the open route is read, not refused for its extension', () => {
    const reading = codec.formatFromFile('handed.html', '<!doctype html>')
    expect(reading.ok, 'OP-1: the open route refuses .html').toBe(true)
  })
})

describe('PI-20 documentFromEmbeddedHtml -- one container, by the ids in the order given', () => {
  it('PI-20: what exportEmbeddedHtml writes comes back as the same document (IO-7 round trip)', async () => {
    const read = reader()
    const made = await codec.exportEmbeddedHtml(shellSource(PLAIN_SHELL), here())
    expect(made.ok, 'precondition: IO-7 refused to write').toBe(true)
    if (!made.ok) return
    const back = read(made.html, [DOCUMENT_ID], VERSION)
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.document).toEqual(here())
  })

  it('PI-20: content hostile to HTML survives the round trip', async () => {
    const read = reader()
    const hostile = JSON.parse(JSON.stringify(here())) as { schedule: { project: { title: string } } }
    hostile.schedule.project.title = 'a </script> <!-- & "q" \\u003c'
    const document = codec.documentFromJson(codec.jsonFromDocument(hostile as never))
    if (!document.ok) throw new Error('precondition: the hostile document is not GRS JSON')
    const made = await codec.exportEmbeddedHtml(shellSource(PLAIN_SHELL), document.document)
    if (!made.ok) throw new Error('precondition: IO-7 refused to write')
    expect(titleOf(read(made.html, [DOCUMENT_ID], VERSION))).toBe(hostile.schedule.project.title)
  })

  it('FR-067: the embedded document is read before the template container', () => {
    const html = page(container(TEMPLATE_ID, there()), container(DOCUMENT_ID, here()))
    expect(titleOf(reader()(html, [DOCUMENT_ID, TEMPLATE_ID], VERSION))).toBe('Here')
  })

  it('FR-067: with no embedded document, the template container is read', () => {
    const html = page(container(TEMPLATE_ID, there()))
    expect(titleOf(reader()(html, [DOCUMENT_ID, TEMPLATE_ID], VERSION))).toBe('There')
  })

  it('FR-067 / RS-67: an .html holding neither container is refused', () => {
    expect(reader()(PLAIN_SHELL, [DOCUMENT_ID, TEMPLATE_ID], VERSION).ok).toBe(false)
  })

  it('FR-067 / RS-67: two embedded documents are refused even when a template container is there', () => {
    const html = page(container(DOCUMENT_ID, here()), container(DOCUMENT_ID, there()), container(TEMPLATE_ID, there()))
    expect(reader()(html, [DOCUMENT_ID, TEMPLATE_ID], VERSION).ok).toBe(false)
  })

  it('BT-1: the start-up route passes the embedded id alone, so a template container alone is not read', () => {
    const html = page(container(TEMPLATE_ID, there()))
    expect(reader()(html, [DOCUMENT_ID], VERSION).ok).toBe(false)
  })

  it('IO-7 / OP-5: a container whose text is not GRS JSON is refused like IO-2', () => {
    const html = page(`<script type="application/json" id="${DOCUMENT_ID}">{ "not": "a document" }</script>`)
    expect(reader()(html, [DOCUMENT_ID], VERSION).ok).toBe(false)
  })
})

describe('OP-12 -- the pair of extension and first character names one row', () => {
  it('OP-12 / IO-7: .html starting with < is read, and not as MSPDI', () => {
    const reading = codec.formatFromFile('plan.html', '<!doctype html><html></html>')
    expect(reading.ok, 'OP-12: an .html starting with < was refused').toBe(true)
    if (reading.ok) expect(reading.format).not.toBe('mspdi')
  })

  it('OP-12: a BOM is dropped before the first character of an .html is looked at', () => {
    expect(codec.formatFromFile('plan.html', '\uFEFF  <!doctype html>').ok).toBe(true)
  })

  it('OP-12 / IO-1: .xml starting with < is still MSPDI', () => {
    expect(codec.formatFromFile('plan.xml', '<?xml version="1.0"?><Project/>')).toEqual({ ok: true, format: 'mspdi' })
  })

  it('OP-12 (MUST NOT): .html starting with { is not read', () => {
    expect(codec.formatFromFile('plan.html', '{"schemaVersion":"x"}').ok).toBe(false)
  })
})
