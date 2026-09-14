// Unit tests for the round trip IO-7 (table T-024) and BT-1 (table T-034) promise: what exportEmbeddedHtml writes, chooseStartupDocument reopens unchanged.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, type AppShellSource } from '../../src/adapter/document-codec/document-codec'
import { exportEmbeddedHtml } from '../../src/adapter/document-codec/embedded-html-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  chooseStartupDocument,
  type StartupCandidates,
} from '../../src/use-case/choose-startup-document/choose-startup-document'
import { bare, specTable } from '../contract/spec-table'

describe('table T-034 still names the seat this round trip depends on', () => {
  it('BT-1 is rank 1, and its source is a file with the document embedded', () => {
    const table = specTable('T-034')
    const bt1 = table.rows.find((row) => row.id === 'BT-1')
    expect(bt1, 'table T-034 has a row BT-1').toBeDefined()
    expect(bare(bt1!.by['順'] ?? '')).toBe('1')
    expect(bt1!.by['出どころ'] ?? '').toContain('ファイルに埋め込まれた文書')
  })

  it('BT-2 and BT-4 both still rank below BT-1', () => {
    const table = specTable('T-034')
    const ranked = ['BT-2', 'BT-4'].map((id) => {
      const row = table.rows.find((one) => one.id === id)
      expect(row, `table T-034 has a row ${id}`).toBeDefined()
      return Number(bare(row!.by['順'] ?? ''))
    })
    for (const order of ranked) expect(order).toBeGreaterThan(1)
  })
})

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')
const TEMPLATE = JSON.parse(TEMPLATE_TEXT) as Record<string, unknown>

type Root = Record<string, unknown>
type Group = Record<string, unknown>

const templateSchedule = TEMPLATE['schedule'] as Group

function rootOfSize(rows: number): Root {
  return {
    ...TEMPLATE,
    schedule: Object.fromEntries(
      Object.entries(templateSchedule).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.slice(0, rows) : value,
      ]),
    ),
  }
}

function rootWithProjectName(base: Root, name: string): Root {
  const schedule = base['schedule'] as Group
  const project = schedule['project'] as Group
  return { ...base, schedule: { ...schedule, project: { ...project, name } } }
}

function documentOf(root: Root): Document {
  const read = documentFromJson(JSON.stringify(root))
  if (!read.ok) {
    throw new Error(`the fixture is not a GRS JSON document: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const WHOLE = documentOf(TEMPLATE)
const SMALL = documentOf(rootOfSize(2))
const SINGLE = documentOf(rootOfSize(1))
const EMPTY = documentOf(rootOfSize(0))
const HANDED = documentOf(rootWithProjectName(rootOfSize(2), 'the document handed at startup'))

const ID = 'grsDocument'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

function shellSource(html: string, embeddedDocumentElementId: string): AppShellSource {
  return {
    readAppShell: async () => ({ ok: true, appShell: { html, embeddedDocumentElementId } }),
  }
}

// WHY: no published payload reader exists; a minimal scanner (not an HTML
// WHY: parser) finds the <script id=...> container, matching the caller's job.
function embeddedPayload(html: string, elementId: string): string {
  const pattern = new RegExp(`<script\\b[^<>]*\\sid="${elementId}"[^<>]*>`, 'i')
  const start = pattern.exec(html)
  if (start === null || start.index === undefined) {
    throw new Error(`no container with id ${elementId} in the written file`)
  }
  const closeStart = html.indexOf('>', start.index)
  const payloadBegin = closeStart + 1
  const payloadEnd = html.indexOf('</script', payloadBegin)
  if (payloadEnd < 0) throw new Error('the container is not closed')
  return html.slice(payloadBegin, payloadEnd)
}

async function writtenAndReopened(document: Document): Promise<{ html: string; reopened: Document }> {
  const made = await exportEmbeddedHtml(shellSource(PLAIN_SHELL, ID), document)
  if (!made.ok) throw new Error(`IO-7 refused to write: ${JSON.stringify(made.fault)}`)
  const read = documentFromJson(embeddedPayload(made.html, ID))
  if (!read.ok) throw new Error(`BT-1 could not read the embedded payload back: ${JSON.stringify(read.faults)}`)
  return { html: made.html, reopened: read.document }
}

describe('IO-7 / BT-1 -- the round trip the BT-2 note of table T-034 claims (FR-067, FR-062)', () => {
  it('what exportEmbeddedHtml writes, chooseStartupDocument opens next as BT-1, unchanged', async () => {
    for (const [why, document] of [
      ['no rows at all', EMPTY],
      ['one row', SINGLE],
      ['a few rows', SMALL],
      ['the bundled template whole', WHOLE],
    ] as const) {
      const { reopened } = await writtenAndReopened(document)

      const choice = chooseStartupDocument({
        embedded: { kind: 'read', document: reopened },
        handed: { kind: 'none' },
        template: WHOLE,
      } satisfies StartupCandidates)

      expect(choice.row, why).toBe('BT-1')
      expect(choice.document, why).toEqual(document)
      expect(choice.notices, why).toEqual([])
    }
  })

  it('BT-1 still outranks a handed document and the template, per table T-034 (FR-062)', async () => {
    const { reopened } = await writtenAndReopened(SMALL)

    const choice = chooseStartupDocument({
      embedded: { kind: 'read', document: reopened },
      handed: { kind: 'read', document: HANDED },
      template: WHOLE,
    } satisfies StartupCandidates)

    expect(choice.row).toBe('BT-1')
    expect(choice.document).toEqual(SMALL)
    expect(choice.document).not.toEqual(HANDED)
    expect(choice.notices).toEqual([])
  })

  it('content hostile to HTML still comes back unchanged through the whole path', async () => {
    const name = 'a </script> <!-- \u0000 日程 & "q" \\u003c'
    const document = documentOf(rootWithProjectName(rootOfSize(2), name))
    const { reopened } = await writtenAndReopened(document)

    const choice = chooseStartupDocument({
      embedded: { kind: 'read', document: reopened },
      handed: { kind: 'none' },
      template: WHOLE,
    } satisfies StartupCandidates)

    expect(choice.row).toBe('BT-1')
    expect(choice.document).toEqual(document)
    expect(choice.document.schedule.project.name).toBe(name)
  })

  it('settles after one turn: the document BT-1 opens re-exports to the same file (FR-024)', async () => {
    const first = await writtenAndReopened(SMALL)

    const choice = chooseStartupDocument({
      embedded: { kind: 'read', document: first.reopened },
      handed: { kind: 'none' },
      template: WHOLE,
    } satisfies StartupCandidates)
    expect(choice.row).toBe('BT-1')

    const again = await exportEmbeddedHtml(shellSource(PLAIN_SHELL, ID), choice.document)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.html).toBe(first.html)
  })
})
