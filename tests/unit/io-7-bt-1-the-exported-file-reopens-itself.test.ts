// Unit tests for the round trip table T-024's row IO-7 promises: the single
// `.html` `exportEmbeddedHtml` (UF-37, PI-20 of table T-064, AM-15 of table
// T-107) writes is the same file `chooseStartupDocument` (UF-23, PI-14) opens
// next, at BT-1 of table T-034 -- and the document that comes back is the one
// that went in.
//
// ⛔ WRITTEN WITHOUT READING THE UNITS' BODIES (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, and of the units under test only their published types and
// signatures, taken from how tests/unit/uf-23.test.ts and
// tests/unit/uf-37-38.test.ts already call them. The one non-spec file this
// case reads is src/framework/single-html-shell/startup-template.json, a
// bundled GRS JSON *document* (data, not logic) -- the same fixture
// tests/unit/uf-37-38.test.ts already builds its own documents from, for the
// reason its own comment gives: it is the one document the specification has
// actually decided the values of.
//
// The rules these cases answer to:
//   IO-7 of table T-024   row: 単一 `.html`, direction 書出のみ (export
//              only). Its own 備考 column says who reads it back: 「読む側
//              は表 T-034 の `BT-1`」 -- IO-7 is not itself discriminated
//              on open (⚠️ 01-04-requirements.md :2968 -- 「`IO-7` もその欄
//              を持たない」), because reading one is BT-1's job, not a
//              second decoder.
//   FR-067     STATEMENT: 「GRS は、本体と文書を合わせた 1 つの `.html` を
//              作れるようにすること」. RATIONALE names table T-034's BT-1 as
//              the row that opens it back.
//   BT-1 of table T-034   rank 1, 出どころ「ファイルに埋め込まれた文書」.
//   BT-2's note (:3372)   the literal claim this file exists to protect:
//              「求める体験は 表 T-024 の `IO-7`（単一 HTML の書き出し）と
//              `BT-1` が既に果たす —— 書き出した `.html` をダブルクリック
//              すると、埋め込んだ日程が開く」. ⛔ The note also carries a
//              2026-09-05 PoC's measured byte counts and a hash value --
//              those numbers are NOT copied into this file (they are not a
//              promise of the prose, they are one measurement of it).
//   FR-062     STATEMENT: 「起動したとき、GRS は、表 T-034 の順で最初に開く
//              文書を決めること」 -- BT-1 outranks a handed document (BT-2)
//              and the template (BT-4), which is the other half of the
//              experience the BT-2 note claims IO-7 + BT-1 already deliver.
//   FR-024     what a written document contains -- referenced only insofar as
//              it is why re-exporting the document the chooser opened should
//              reproduce the same bytes (a fixed point), not re-tested here
//              in full (tests/unit/uf-37-38.test.ts already walks table
//              T-052's root and DR-2 keys for what IO-7 writes).
//
// ⭐ WHAT THIS FILE ADDS THAT WAS NOT ALREADY THERE. tests/unit/
// uf-37-38.test.ts already has a section titled "the round trip" that writes
// with `exportEmbeddedHtml` and reads the payload back with
// `documentFromJson`, asserting the document is unchanged -- so the codec
// half of this promise already had cases before this file existed.
// tests/unit/uf-23.test.ts already drives `chooseStartupDocument` through
// table T-034's order -- but only against synthetic, already-resolved
// candidates, never against a document that actually went through
// `exportEmbeddedHtml` first. Nothing composes the two: writing the file with
// the real writer, treating that file as the shell BT-1 reads at the next
// launch, and confirming table T-034's order still picks BT-1 and hands back
// the original document with no notices. That composition -- the literal
// claim of the BT-2 note above -- is what this file is for.

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

// ---------------------------------------------------------------------------
// Table T-034, held against the manuscript rather than hand-copied (Chapter
// 1.9 :275 asks a table-driven test to be driven by a fixed copy; the copy
// here is read at test time so it cannot fall behind the table the way a
// hand copy can -- the same reasoning tests/unit/uf-37-38.test.ts gives for
// doing this to the same table).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// A document the specification has actually decided the values of.
// ---------------------------------------------------------------------------

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

/** The same root with every array of the schedule cut to `rows` entries. */
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

/** The root with the one project name every case that needs a second, tellable document bends. */
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

// ---------------------------------------------------------------------------
// The shell IO-7 embeds into, and IF-8's declared shape for reading one back
// (`AppShellSource` / `readAppShell`) -- the same shape
// tests/unit/uf-37-38.test.ts drives `exportEmbeddedHtml` through.
// ---------------------------------------------------------------------------

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

/**
 * Pulls the one container's payload text out of a written file. ⚠️ A
 * deliberately naive scanner, same as tests/unit/uf-37-38.test.ts's own --
 * not an HTML parser, just enough to find `<script id="...">...</script>`.
 * There is no published reader for this (uf-37-38.test.ts's own case
 * "walks table T-024 -- IO-7 is the single .html and it is export only"
 * asserts document-codec.ts's public entry exports nothing matching
 * `/fromhtml|fromembedded/i`) -- extracting the payload is the caller's job,
 * same as it would be for whatever in the Framework layer reads BT-1 for
 * real.
 */
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

/**
 * IO-7's writer, then BT-1's read of the file it just wrote -- exactly the
 * two steps the BT-2 note (table T-034, :3372) claims already compose into
 * "double-click the written .html and the embedded schedule opens".
 */
async function writtenAndReopened(document: Document): Promise<{ html: string; reopened: Document }> {
  const made = await exportEmbeddedHtml(shellSource(PLAIN_SHELL, ID), document)
  if (!made.ok) throw new Error(`IO-7 refused to write: ${JSON.stringify(made.fault)}`)
  const read = documentFromJson(embeddedPayload(made.html, ID))
  if (!read.ok) throw new Error(`BT-1 could not read the embedded payload back: ${JSON.stringify(read.faults)}`)
  return { html: made.html, reopened: read.document }
}

// ---------------------------------------------------------------------------
// The round trip a launch actually takes: IO-7 writes, BT-1 opens.
// ---------------------------------------------------------------------------

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

      // FR-067's rationale names BT-1 as the row that opens what IO-7 wrote.
      expect(choice.row, why).toBe('BT-1')
      // The document that comes back is the one that went in -- not merely
      // one that parses, but the same values (FR-067's "本体と文書を合わせ
      // た 1 つの .html を作れる" only means something if the document
      // survives the trip).
      expect(choice.document, why).toEqual(document)
      // FR-062 does not ask BT-1 to explain itself when it wins outright --
      // nothing above it failed, so there is nothing to tell (FR-076).
      expect(choice.notices, why).toEqual([])
    }
  })

  it('BT-1 still outranks a handed document and the template, per table T-034 (FR-062)', async () => {
    // The BT-2 note's whole point is that IO-7 + BT-1 already deliver the
    // experience BT-2 itself is not implemented for -- which only holds if
    // BT-1 keeps winning the order even when the lower ranks also have
    // something to offer, not merely when they are empty.
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
    // Same hazard tests/unit/uf-37-38.test.ts checks at the codec boundary
    // alone ("loses nothing that is hostile to HTML on the way through") --
    // repeated here through chooseStartupDocument too, since BT-1's reader is
    // the point of this file, not the codec in isolation.
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
    // FR-024's rationale for fixing the written form is "同じ JSON から同じ
    // 出力を得るため" (RATIONALE of FR-021, :2947, echoed at :3283). Chained
    // through BT-1: opening what was written and writing it again, with
    // nothing edited in between, should reproduce the identical file.
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
