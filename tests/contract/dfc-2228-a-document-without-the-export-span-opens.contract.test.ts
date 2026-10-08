// Contract cases for DFC-2228: a GRS JSON document without the export span keys opens (OP-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'

type Loose = Record<string, unknown>

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)
const SAMPLE_TEXT = readFileSync(join(process.cwd(), 'sample-schedule', 'Three-Year Product Plan.json'), 'utf8')
const KNOWN_VERSION = (JSON.parse(TEMPLATE_TEXT) as Loose)['schemaVersion'] as string
const SPAN_KEYS = ['fitSpanStart', 'fitSpanFinish'] as const

const TEMPLATE = ((): Document => {
  const read = documentFromJson(TEMPLATE_TEXT, KNOWN_VERSION)
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
})()

function withoutSpanKeys(text: string): string {
  const root = JSON.parse(text) as Loose
  const settings = { ...(root['documentSettings'] as Loose) }
  for (const key of SPAN_KEYS) delete settings[key]
  return JSON.stringify({ ...root, documentSettings: settings })
}

// see OP-3, OP-6
function replacedBy(incoming: Document): Document {
  const request: ImportRequest = {
    current: TEMPLATE,
    incoming,
    format: 'grsJson',
    choice: 'replace',
    validationPassed: true,
    anotherOpenInProgress: false,
    unsavedEditsDiscardConfirmed: true,
    merge: null,
    defaultSettings: TEMPLATE.documentSettings,
    importSessionId: 'dfc-2228',
  }
  const outcome = importDocument(request)
  if (!outcome.ok) throw new Error(`the replace was refused: ${JSON.stringify(outcome.refusal)}`)
  return outcome.document
}

function spanOf(settings: DocumentSettings): readonly unknown[] {
  return SPAN_KEYS.map((key) => (settings as unknown as Loose)[key])
}

describe('DFC-2228: OP-6 fills a missing export span key with its default null (S-518, S-519)', () => {
  it('a document with both keys absent reads without a refusal and opens with both ends null', () => {
    const read = documentFromJson(withoutSpanKeys(TEMPLATE_TEXT), KNOWN_VERSION)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.clampedCount).toBe(0)
    expect(spanOf(replacedBy(read.document).documentSettings)).toEqual([null, null])
  })

  it('a document with only the start dated reads the missing finish as null and pairs it (FX-1)', () => {
    const root = JSON.parse(withoutSpanKeys(TEMPLATE_TEXT)) as Loose
    const settings = { ...(root['documentSettings'] as Loose), fitSpanStart: '2026-03-02T00:00:00' }
    const read = documentFromJson(JSON.stringify({ ...root, documentSettings: settings }), KNOWN_VERSION)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const [start, finish] = spanOf(read.document.documentSettings)
    expect(start).toBe('2026-03-02T00:00:00')
    expect(String(finish).slice(0, 10)).toBe('2026-03-02')
  })

  it('the bundled sample "Three-Year Product Plan.json" opens with 0 refusals', () => {
    const read = documentFromJson(SAMPLE_TEXT, KNOWN_VERSION)
    expect(read.ok ? [] : read.faults).toEqual([])
    if (!read.ok) return
    expect(spanOf(replacedBy(read.document).documentSettings)).toEqual([null, null])
  })
})
