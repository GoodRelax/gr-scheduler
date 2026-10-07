// W3 spec-only tester 5: table T-033 EX-15 -- the exported root keeps the namespace URI the imported root named.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: the startup template (BT-4) is a document made without importing MSPDI; no schema file is read here.
const TEMPLATE_TEXT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')

/** @purity pure */
function currentDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error(`the bundled template was refused: ${JSON.stringify(read).slice(0, 400)}`)
  return read.document
}

// see EX-15
const EX_15_KEEP_THE_IMPORTED_URI =
  '書き出す根の要素（`Project`）の名前空間 URI は、取り込んだ文書では取込元の根が名乗った URI のまま書くこと（MUST）'
const EX_15_PJ12_WHEN_NOT_IMPORTED = 'MSPDI を取り込まずに作った文書では、pj12 の `targetNamespace`（`http://schemas.microsoft.com/project/2007`）を書くこと（MUST）'
const EX_15_THE_PARTNER_URI = '⚠️ 交換相手が自ら書く URI は `http://schemas.microsoft.com/project` であり、公式スキーマの `targetNamespace` と違う'

/** @purity pure */
function uriIn(clause: string, nth: number): string {
  const found = [...clause.matchAll(/`(http:\/\/[^`]+)`/g)][nth]?.[1]
  if (found === undefined) throw new Error(`the clause names no URI #${nth}: ${clause}`)
  return found
}

const PJ12_URI = uriIn(EX_15_PJ12_WHEN_NOT_IMPORTED, 0)
const PARTNER_URI = uriIn(EX_15_THE_PARTNER_URI, 0)
// WHY: a third URI no reader writes, so a kept value cannot be confused with either default.
const ANOTHER_URI = 'http://example.invalid/w3-t5/project'
const A_MOMENT = '2026-10-07T09:00:00'

/** @purity pure */
function rootNamespaceOf(xml: string): string | null {
  return /<Project\b[^>]*?\sxmlns="([^"]*)"/.exec(xml)?.[1] ?? null
}

/** @purity pure */
function withRootNamespace(xml: string, uri: string): string {
  const before = rootNamespaceOf(xml)
  if (before === null) throw new Error('the export carries no root namespace to replace')
  return xml.replace(`xmlns="${before}"`, `xmlns="${uri}"`)
}

/** @purity pure */
function exportedAfterImporting(uri: string): string {
  const source = withRootNamespace(mspdiFromDocument(currentDocument(), A_MOMENT).text, uri)
  const read = documentFromMspdi(source, currentDocument())
  if (!read.ok) throw new Error(`the import was refused: ${JSON.stringify(read.faults)}`)
  return mspdiFromDocument(read.document, A_MOMENT).text
}

describe('W3-T5 -- the manuscript these cases are driven by', () => {
  it.each([EX_15_KEEP_THE_IMPORTED_URI, EX_15_PJ12_WHEN_NOT_IMPORTED, EX_15_THE_PARTNER_URI])('01-04 EX-15 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('the two URIs EX-15 names differ', () => {
    expect(PJ12_URI).not.toBe(PARTNER_URI)
  })
})

describe(`EX-15 "${EX_15_KEEP_THE_IMPORTED_URI}"`, () => {
  it.each([
    ['the URI the exchange partner writes', PARTNER_URI],
    ['the pj12 targetNamespace', PJ12_URI],
    ['a URI neither default names', ANOTHER_URI],
  ])('imported with %s, the export writes that URI on the root', (_name, uri) => {
    expect(rootNamespaceOf(exportedAfterImporting(uri)), EX_15_KEEP_THE_IMPORTED_URI).toBe(uri)
  })
})

describe(`EX-15 "${EX_15_PJ12_WHEN_NOT_IMPORTED}"`, () => {
  it('the startup template, never imported, is written with the pj12 targetNamespace', () => {
    expect(rootNamespaceOf(mspdiFromDocument(currentDocument(), A_MOMENT).text)).toBe(PJ12_URI)
  })
})
