// Unit tests for UF-37 (embedded-html-codec.ts) and UF-38 (app-shell-source.ts): table T-075, component CP-20/PI-20.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromJson,
  jsonFromDocument,
  type AppShellSource,
} from '../../src/adapter/document-codec/document-codec'
import {
  exportEmbeddedHtml,
  type EmbeddedHtmlExport,
  type EmbeddedHtmlFault,
  type EmbeddedHtmlFaultReason,
} from '../../src/adapter/document-codec/embedded-html-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

// see T-024
const T_024 = [
  { row: 'IO-1', format: 'MSPDI XML', isRead: true, isWritten: true },
  { row: 'IO-2', format: 'GRS JSON', isRead: true, isWritten: true },
  { row: 'IO-3', format: 'SVG', isRead: false, isWritten: true },
  { row: 'IO-4', format: 'PNG', isRead: false, isWritten: true },
  { row: 'IO-5', format: 'localStorage', isRead: true, isWritten: true },
  { row: 'IO-7', format: 'single .html', isRead: false, isWritten: true },
  { row: 'IO-6', format: 'clipboard', isRead: false, isWritten: true },
] as const

// WHY: a retired row keeps its burnt-seat id (BT-4 stays rank 3), so this
// copy is held against the table at read time rather than trusted.
const T_034 = [
  { row: 'BT-1', rank: 1, isFedByThisUnit: true },
  { row: 'BT-2', rank: 2, isFedByThisUnit: false },
  { row: 'BT-4', rank: 3, isFedByThisUnit: false },
] as const

// see T-052
const T_052_ROOT = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'documentStamp',
  'changeLog',
] as const

// see T-052
const T_052_DR2 = [
  'project',
  'calendars',
  'tasks',
  'resources',
  'assignments',
  'taskGroups',
  'taskGroupMembers',
  'taskVisuals',
  'commentBoxes',
  'highlightBoxes',
  'taskOrigins',
  'baselineTasks',
] as const

// see FR-073
const FR_073_FORMAT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/

// WHY: FR-067 keeps the embedded content out of the body and CN-8 gives
// the artifact a policy, so the container's type must never be one of these.
const EXECUTABLE_SCRIPT_TYPES = [
  '',
  'module',
  'text/javascript',
  'text/ecmascript',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
  'application/javascript',
  'application/ecmascript',
  'application/x-ecmascript',
  'application/x-javascript',
] as const

// WHY: PND-71's ruling refuses only characters that would break the start
// tag, not a leading-letter shape, so these deliberately awkward ids pass.
const USABLE_IDS = [
  'embedded-document',
  '2024-plan',
  '9',
  'a.b',
  'a:b',
  '_x-1',
  '-leading-dash',
  'has=equals',
  '\u65e5\u672c\u8a9e',
] as const

// WHY: each of these would break the start tag or the scan that finds it
// again -- empty, whitespace, quotes, angle brackets, or a control character.
const UNUSABLE_IDS = [
  '',
  'has space',
  'has\ttab',
  'has\nnewline',
  'has\u00a0nbsp',
  'has"quote',
  "has'quote",
  'has>angle',
  'has<angle',
  'has&amp',
  'has\u0000nul',
] as const

// WHY: the bundled template is the only document the specification has
// actually decided, so these cases build on it rather than inventing one.
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

// WHY: IF-8 supplies the application's own HTML as delivered, so these
// shells are files, not DOM trees.
const ID = 'grsDocument'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

const UPPER_CASE_SHELL = '<!DOCTYPE HTML><HTML><HEAD></HEAD><BODY><P>a</P></BODY></HTML>'

const NO_BODY_SHELL = '<!doctype html><html><head><title>GRS</title></head></html>'

const NO_BODY_NO_HTML_SHELL = '<div id="app"></div>'

const EMPTY_SHELL = ''

interface CountedSource {
  readonly source: AppShellSource
  readonly reads: () => number
}

function shellSource(html: string, embeddedDocumentElementId: string): CountedSource {
  let reads = 0
  const source: AppShellSource = {
    readAppShell: async () => {
      reads += 1
      return { ok: true, appShell: { html, embeddedDocumentElementId } }
    },
  }
  return { source, reads: () => reads }
}

function unavailableSource(what: string): CountedSource {
  let reads = 0
  const source: AppShellSource = {
    readAppShell: async () => {
      reads += 1
      return { ok: false, what }
    },
  }
  return { source, reads: () => reads }
}

async function exported(html: string, elementId: string, document: Document): Promise<string> {
  const made = await exportEmbeddedHtml(shellSource(html, elementId).source, document)
  if (!made.ok) throw new Error(`expected a file, was refused: ${JSON.stringify(made.fault)}`)
  return made.html
}

async function refused(
  html: string,
  elementId: string,
  document: Document,
): Promise<EmbeddedHtmlFault> {
  const made = await exportEmbeddedHtml(shellSource(html, elementId).source, document)
  if (made.ok) throw new Error('expected a refusal, was given a file')
  return made.fault
}

// WHY: deliberately naive -- it does not step over script content the
// way an HTML parser does, which is why the lookalike cases count tags.
function containerStarts(html: string, elementId: string): readonly number[] {
  const pattern = new RegExp(`<script\\b[^<>]*\\sid="${elementId}"[^<>]*>`, 'gi')
  const at: number[] = []
  for (const match of html.matchAll(pattern)) {
    if (match.index !== undefined) at.push(match.index)
  }
  return at
}

interface Container {
  readonly startTag: string
  readonly payload: string
  readonly begin: number
  readonly end: number
}

function onlyContainer(html: string, elementId: string): Container {
  const starts = containerStarts(html, elementId)
  expect(starts, 'exactly one entry (FR-067)').toHaveLength(1)
  const begin = starts[0] ?? -1
  const closeStart = html.indexOf('>', begin)
  const startTag = html.slice(begin, closeStart + 1)
  const payloadBegin = closeStart + 1
  const payloadEnd = html.indexOf('</script', payloadBegin)
  expect(payloadEnd, 'the container is closed').toBeGreaterThanOrEqual(0)
  const end = html.indexOf('>', payloadEnd) + 1
  return { startTag, payload: html.slice(payloadBegin, payloadEnd), begin, end }
}

function typeAttributeOf(startTag: string): string | null {
  const found = /\stype="([^"]*)"/i.exec(startTag)
  return found === null ? null : (found[1] ?? null)
}

function parsedPayload(html: string, elementId: string): Root {
  return JSON.parse(onlyContainer(html, elementId).payload) as Root
}

describe('the rosters these cases walk are the ones the tables state', () => {
  // WHY: a walk over an empty roster would pass without asserting anything.
  it('carries the row counts of table T-024, table T-034 and table T-052', () => {
    expect(T_024).toHaveLength(7)
    expect(T_034).toHaveLength(3)
    expect(T_052_ROOT).toHaveLength(5)
    expect(T_052_DR2).toHaveLength(12)
    expect(new Set(T_052_ROOT).size).toBe(5)
    expect(new Set(T_052_DR2).size).toBe(12)
  })

  // WHY: a hand copy of a table is what falls behind; held against the
  // manuscript here so a stale row id or rank cannot stay green.
  it('⭐ holds that copy of table T-034 against the table, ID and 順 both', () => {
    const table = specTable('T-034')
    expect(table.rows.map((row) => row.id)).toEqual(T_034.map((rank) => rank.row))
    expect(table.rows.map((row) => bare(row.by['順'] ?? ''))).toEqual(
      T_034.map((rank) => String(rank.rank)),
    )
  })

  it('carries the id rosters PND-71 draws the line between', () => {
    expect(USABLE_IDS.length).toBeGreaterThan(0)
    expect(UNUSABLE_IDS.length).toBeGreaterThan(0)
    expect(EXECUTABLE_SCRIPT_TYPES.length).toBeGreaterThan(0)
  })

  it('reads a bundled template that is a whole GRS JSON document (FR-027)', () => {
    expect(validateDocument(TEMPLATE).errors).toEqual([])
    expect(String(TEMPLATE['schemaVersion'])).toMatch(FR_073_FORMAT)
    expect((templateSchedule['tasks'] as unknown[]).length).toBeGreaterThan(0)
  })
})

describe('UF-38 app-shell-source.ts -- the seam of IF-8', () => {
  it('leaves the folder through the public entry (Chapter 5.3, PI-20 of table T-064)', () => {
    // WHY: type-only check -- that this compiles is the assertion itself.
    const seam: AppShellSource | null = null
    expect(seam).toBeNull()
  })

  it('supplies the HTML as a value, and the id of the element BT-1 reads', async () => {
    const reading = await shellSource(PLAIN_SHELL, ID).source.readAppShell()
    expect(reading.ok).toBe(true)
    if (!reading.ok) return
    expect(reading.appShell.html).toBe(PLAIN_SHELL)
    expect(reading.appShell.embeddedDocumentElementId).toBe(ID)
  })

  it('tells one failure apart from none -- NT-3a needs no reason enum here', async () => {
    // WHY: NT-3a only tells reasons apart where the next step differs,
    // and there is exactly one next step here: export IO-2 on its own.
    const reading = await unavailableSource('the artifact could not be read back').source.readAppShell()
    expect(reading.ok).toBe(false)
    if (reading.ok) return
    expect(reading.what.length).toBeGreaterThan(0)
    expect(reading).not.toHaveProperty('reason')
  })
})

describe('FR-067 -- the application and one document, as one file', () => {
  it('gives back a file that carries the whole shell and exactly one entry', async () => {
    const html = await exported(PLAIN_SHELL, ID, SMALL)
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('<title>GRS</title>')
    expect(containerStarts(html, ID)).toHaveLength(1)
  })

  it('returns the file as a value, with no download in it (AG-7, AM-15 of table T-107)', async () => {
    const made: EmbeddedHtmlExport = await exportEmbeddedHtml(
      shellSource(PLAIN_SHELL, ID).source,
      SMALL,
    )
    expect(made.ok).toBe(true)
    if (!made.ok) return
    expect(typeof made.html).toBe('string')
    expect(made).not.toHaveProperty('fault')
  })

  it('never hands back both a file and a fault', async () => {
    const good = await exportEmbeddedHtml(shellSource(PLAIN_SHELL, ID).source, SMALL)
    expect(good.ok).toBe(true)
    expect(good).not.toHaveProperty('fault')
    const bad = await exportEmbeddedHtml(shellSource(PLAIN_SHELL, 'has space').source, SMALL)
    expect(bad.ok).toBe(false)
    expect(bad).not.toHaveProperty('html')
  })

  it('writes an entry for the empty document, the one-row document and the whole one', async () => {
    for (const [why, document] of [
      ['no rows at all', EMPTY],
      ['one row', SINGLE],
      ['the bundled template whole', WHOLE],
    ] as const) {
      const html = await exported(PLAIN_SHELL, ID, document)
      expect(containerStarts(html, ID), why).toHaveLength(1)
      expect(JSON.parse(onlyContainer(html, ID).payload), why).toBeTypeOf('object')
    }
  })
})

describe('BT-1 of table T-034 -- the payload is what the application itself reads', () => {
  it('walks table T-034 and feeds rank 1 and no other', () => {
    for (const rank of T_034) {
      if (rank.isFedByThisUnit) {
        expect(rank.row, 'the embedded document is rank 1').toBe('BT-1')
        expect(rank.rank).toBe(1)
      } else {
        expect(rank.rank, `${rank.row} is not this writer's business`).toBeGreaterThan(1)
      }
    }
    expect(T_034.filter((rank) => rank.isFedByThisUnit)).toHaveLength(1)
  })

  it('walks table T-024 -- IO-7 is the single .html and it is export only', async () => {
    for (const io of T_024) {
      if (io.format !== 'single .html') continue
      expect(io.row).toBe('IO-7')
      expect(io.isWritten).toBe(true)
      // WHY: export only -- there is nothing here to hand a file back to.
      expect(io.isRead).toBe(false)
    }
    const entry = (await import('../../src/adapter/document-codec/document-codec')) as unknown as Root
    const readers = Object.keys(entry).filter((name) => /fromhtml|fromembedded/i.test(name))
    expect(readers).toEqual([])
  })

  it('writes table T-052 whole -- one case walks all five root keys (FR-024)', async () => {
    const payload = parsedPayload(await exported(PLAIN_SHELL, ID, SMALL), ID)
    expect(Object.keys(payload).sort()).toEqual([...T_052_ROOT].sort())
    for (const key of T_052_ROOT) expect(payload, key).toHaveProperty(key)
  })

  it('writes the twelve DR-2 keys of the schedule-data group', async () => {
    const payload = parsedPayload(await exported(PLAIN_SHELL, ID, SMALL), ID)
    const schedule = payload['schedule'] as Group
    expect(Object.keys(schedule).sort()).toEqual([...T_052_DR2].sort())
  })

  it('embeds a payload the generated GRS JSON schema accepts', async () => {
    const payload = parsedPayload(await exported(PLAIN_SHELL, ID, WHOLE), ID)
    const result = validateDocument(payload)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('embeds exactly what jsonFromDocument writes -- FR-024 keeps one writer', async () => {
    // WHY: a second serializer would be a second authority over FR-024's
    // three MUSTs, and the two would drift.
    const payload = parsedPayload(await exported(PLAIN_SHELL, ID, SMALL), ID)
    expect(payload).toEqual(JSON.parse(jsonFromDocument(SMALL)))
  })

  it('keeps a null column key and all, and every presentation value (FR-024)', async () => {
    const payload = parsedPayload(await exported(PLAIN_SHELL, ID, SMALL), ID)
    const project = (payload['schedule'] as Group)['project'] as Group
    const templateProject = templateSchedule['project'] as Group
    const nullColumns = Object.keys(templateProject).filter((key) => templateProject[key] === null)
    expect(nullColumns.length, 'the template carries a null column').toBeGreaterThan(0)
    for (const key of nullColumns) {
      expect(Object.hasOwn(project, key), `${key} keeps its key`).toBe(true)
      expect(project[key], `${key} keeps its null`).toBeNull()
    }
    const settings = payload['documentSettings'] as Group
    expect(Object.keys(settings).sort()).toEqual(
      Object.keys(TEMPLATE['documentSettings'] as Group).sort(),
    )
  })

  it('carries the format version inside the document and nowhere else (FR-073)', async () => {
    const html = await exported(PLAIN_SHELL, ID, SMALL)
    const container = onlyContainer(html, ID)
    const payload = JSON.parse(container.payload) as Root
    expect(payload['schemaVersion']).toBe(TEMPLATE['schemaVersion'])
    expect(String(payload['schemaVersion'])).toMatch(FR_073_FORMAT)
    // WHY: two copies of one fact is the failure FR-073 is about -- a
    // build that cannot tell a broken document from an old one.
    expect(container.startTag.toLowerCase()).not.toContain('version')
  })
})

describe('FR-067 -- the embedded content does not leak into the body (CN-8)', () => {
  it('puts the document in a script element, so nothing of it is rendered', async () => {
    const container = onlyContainer(await exported(PLAIN_SHELL, ID, SMALL), ID)
    expect(container.startTag.toLowerCase().startsWith('<script')).toBe(true)
    expect(container.startTag).toContain(`id="${ID}"`)
  })

  it('never gives the container a type a browser executes (one case walks the roster)', async () => {
    const container = onlyContainer(await exported(PLAIN_SHELL, ID, SMALL), ID)
    const type = typeAttributeOf(container.startTag)
    expect(type, 'the container declares a type').not.toBeNull()
    for (const executable of EXECUTABLE_SCRIPT_TYPES) {
      expect(String(type).trim().toLowerCase(), executable).not.toBe(executable)
    }
  })

  it('leaves the shell own scripts byte for byte, so no policy hash moves (CN-8)', async () => {
    const html = await exported(PLAIN_SHELL, ID, SMALL)
    expect(html).toContain('<script type="module">boot()</script>')
    expect(html.split('<script type="module">boot()</script>')).toHaveLength(2)
  })

  it('writes a payload with no `<` in it at all, so nothing can end the element', async () => {
    // WHY: `</script` ends script data and `<!--` opens a state where a
    // later `</script>` no longer closes it; blocking `<` blocks both.
    const hostile = documentOf(
      rootWithProjectName(rootOfSize(2), 'a </script> b <!-- c <script> d <'),
    )
    const container = onlyContainer(await exported(PLAIN_SHELL, ID, hostile), ID)
    expect(container.payload).not.toContain('<')
    expect(container.payload.toLowerCase()).not.toContain('</script')
    expect(container.payload).not.toContain('<!--')
    const payload = JSON.parse(container.payload) as Root
    const project = (payload['schedule'] as Group)['project'] as Group
    expect(project['name']).toBe('a </script> b <!-- c <script> d <')
  })

  it('escapes every `<`, and only `<`, so the text still parses to the same value', async () => {
    const hostile = documentOf(rootWithProjectName(rootOfSize(2), '< << <a & > "q"'))
    const container = onlyContainer(await exported(PLAIN_SHELL, ID, hostile), ID)
    // WHY: `<` replaces every `<`, the six characters shown literally.
    expect(container.payload).toBe(jsonFromDocument(hostile).replaceAll('<', '\\u003c'))
    expect(JSON.parse(container.payload)).toEqual(JSON.parse(jsonFromDocument(hostile)))
    // WHY: `&` needs no escape -- script data has no character references to decode.
    expect(container.payload).toContain('&')
  })

  it('lets no raw control character reach the artifact through the document', async () => {
    // WHY: a raw control character can make a browser rewrite the file so
    // its hash stops matching, and the whole application fails to load.
    const hostile = documentOf(rootWithProjectName(rootOfSize(2), 'a\u0000b\u0007c\u001fd\u007fe'))
    const container = onlyContainer(await exported(PLAIN_SHELL, ID, hostile), ID)
    // WHY: only the document's own control characters are checked here --
    // a serializer's own line break is not one of the document's bytes.
    for (const raw of ['\u0000', '\u0007', '\u001f']) {
      expect(container.payload, JSON.stringify(raw)).not.toContain(raw)
    }
    expect(container.payload).toContain('\\u0000')
    // eslint-disable-next-line no-control-regex
    expect(container.payload.replaceAll('\n', '')).not.toMatch(/[\u0000-\u001f]/)
    const payload = JSON.parse(container.payload) as Root
    const project = (payload['schedule'] as Group)['project'] as Group
    expect(project['name']).toBe('a\u0000b\u0007c\u001fd\u007fe')
  })

  it('carries text outside ASCII through unharmed (CN-5: UTF-8)', async () => {
    // WHY: written as escapes so this file stays ASCII; the value is not.
    const name = '\u65e5\u7a0b \u2014 \u00dcnicode \u2713'
    const document = documentOf(rootWithProjectName(rootOfSize(2), name))
    const payload = parsedPayload(await exported(PLAIN_SHELL, ID, document), ID)
    const project = (payload['schedule'] as Group)['project'] as Group
    expect(project['name']).toBe(name)
  })

  it('writes no byte order mark of its own (CN-5)', async () => {
    const html = await exported(PLAIN_SHELL, ID, SMALL)
    expect(html.charCodeAt(0)).not.toBe(0xfeff)
    expect(html.startsWith(PLAIN_SHELL.slice(0, 40))).toBe(true)
  })
})

describe('the container goes at the end of the body (PND-70, grounds CN-5)', () => {
  it('puts it immediately before the last `</body>`, changing nothing before it', async () => {
    const html = await exported(PLAIN_SHELL, ID, SMALL)
    const container = onlyContainer(html, ID)
    const bodyEnd = html.toLowerCase().lastIndexOf('</body>')
    expect(container.begin).toBeLessThan(bodyEnd)
    expect(html.slice(container.end, bodyEnd)).toMatch(/^\s*$/)
    const shellBodyEnd = PLAIN_SHELL.toLowerCase().lastIndexOf('</body>')
    expect(html.slice(0, shellBodyEnd)).toBe(PLAIN_SHELL.slice(0, shellBodyEnd))
    expect(html.endsWith(PLAIN_SHELL.slice(shellBodyEnd))).toBe(true)
  })

  it('finds `</BODY>` however it is cased', async () => {
    const html = await exported(UPPER_CASE_SHELL, ID, SMALL)
    const container = onlyContainer(html, ID)
    const bodyEnd = html.toLowerCase().lastIndexOf('</body>')
    expect(container.begin).toBeLessThan(bodyEnd)
    expect(html.slice(container.end, bodyEnd)).toMatch(/^\s*$/)
  })

  it('falls back to the last `</html>` when there is no body', async () => {
    const html = await exported(NO_BODY_SHELL, ID, SMALL)
    const container = onlyContainer(html, ID)
    const htmlEnd = html.toLowerCase().lastIndexOf('</html>')
    expect(container.begin).toBeLessThan(htmlEnd)
    expect(html.slice(container.end, htmlEnd)).toMatch(/^\s*$/)
  })

  it('appends when there is neither, and when the shell is empty', async () => {
    for (const [why, shell] of [
      ['no body and no html', NO_BODY_NO_HTML_SHELL],
      ['an empty shell', EMPTY_SHELL],
    ] as const) {
      const html = await exported(shell, ID, SMALL)
      const container = onlyContainer(html, ID)
      expect(html.startsWith(shell), why).toBe(true)
      expect(container.begin, why).toBeGreaterThanOrEqual(shell.length)
      expect(html.slice(container.end), why).toMatch(/^\s*$/)
    }
  })

  it('keeps `<meta charset>` inside the first 1024 bytes (the reason: CN-5)', async () => {
    // WHY: a payload at the top of <head> would push the charset
    // declaration past what a browser reads first, defeating CN-5.
    const filler = '<p>x</p>'.repeat(200)
    const shell = `<!doctype html><html><head><meta charset="utf-8"></head><body>${filler}</body></html>`
    const html = await exported(shell, ID, WHOLE)
    expect(html.length, 'the fixture is bigger than the window').toBeGreaterThan(1024)
    expect(html.slice(0, 1024)).toContain('<meta charset="utf-8">')
  })
})

describe('FR-067 -- a file this writer wrote carries exactly one entry', () => {
  it('replaces the one that is there rather than adding a second', async () => {
    const once = await exported(PLAIN_SHELL, ID, SMALL)
    const twice = await exported(once, ID, SINGLE)
    expect(containerStarts(twice, ID)).toHaveLength(1)
    expect(parsedPayload(twice, ID)).toEqual(JSON.parse(jsonFromDocument(SINGLE)))
  })

  it('re-exports without growing the file or moving the container', async () => {
    const once = await exported(PLAIN_SHELL, ID, SMALL)
    const twice = await exported(once, ID, SMALL)
    expect(twice).toBe(once)
    const third = await exported(twice, ID, SMALL)
    expect(third).toBe(once)
  })

  it('replaces the whole element, start tag and all, leaving the rest untouched', async () => {
    const once = await exported(PLAIN_SHELL, ID, WHOLE)
    const before = onlyContainer(once, ID)
    const again = await exported(once, ID, EMPTY)
    const after = onlyContainer(again, ID)
    expect(after.begin).toBe(before.begin)
    expect(again.slice(0, before.begin)).toBe(once.slice(0, before.begin))
    expect(again.slice(after.end)).toBe(once.slice(before.end))
    expect(after.startTag).toBe(before.startTag)
  })

  it('refuses when the shell already carries two entries, and says which id', async () => {
    // WHY: refused rather than tidied -- this side cannot know which of
    // the two entries the reader would take (PND-70).
    const one = await exported(PLAIN_SHELL, ID, SMALL)
    const container = onlyContainer(one, ID)
    const twoEntries =
      one.slice(0, container.end) + one.slice(container.begin, container.end) + one.slice(container.end)
    expect(containerStarts(twoEntries, ID)).toHaveLength(2)
    const fault = await refused(twoEntries, ID, SMALL)
    expect(fault.reason).toBe('moreThanOneEntry')
    expect(fault.what.length).toBeGreaterThan(0)
  })

  it('leaves a shell it refused exactly as it found it -- nothing half written', async () => {
    const one = await exported(PLAIN_SHELL, ID, SMALL)
    const container = onlyContainer(one, ID)
    const twoEntries =
      one.slice(0, container.end) + one.slice(container.begin, container.end) + one.slice(container.end)
    const before = twoEntries
    await refused(twoEntries, ID, SMALL)
    expect(twoEntries).toBe(before)
  })
})

describe('markup that only looks like an entry is not one', () => {
  const lookalike = `<script type="application/json" id="${ID}">`

  it('steps over a script body that quotes a container start tag', async () => {
    const shell =
      '<!doctype html><html><head></head><body>' +
      `<script type="module">var a = '${lookalike}';</script>` +
      `<script type="module">var b = '${lookalike}';</script>` +
      '</body></html>'
    expect(containerStarts(shell, ID), 'the fixture holds two lookalikes').toHaveLength(2)

    const html = await exported(shell, ID, SMALL)
    // WHY: not a refusal and not a replacement of a lookalike -- one real
    // entry is added and the two quoted ones are left where they were.
    expect(containerStarts(html, ID)).toHaveLength(3)
    expect(html).toContain(`var a = '${lookalike}';`)
    expect(html).toContain(`var b = '${lookalike}';`)
    const bodyEnd = html.toLowerCase().lastIndexOf('</body>')
    const added = html.lastIndexOf(lookalike)
    expect(added).toBeLessThan(bodyEnd)
    const payloadEnd = html.indexOf('</script', added)
    expect(JSON.parse(html.slice(added + lookalike.length, payloadEnd))).toEqual(
      JSON.parse(jsonFromDocument(SMALL)),
    )
  })

  it('replaces the one real entry even when a script body quotes another', async () => {
    const shell =
      '<!doctype html><html><head></head><body>' +
      `<script type="module">var a = '${lookalike}';</script>` +
      '</body></html>'
    const once = await exported(shell, ID, SMALL)
    expect(containerStarts(once, ID)).toHaveLength(2)
    const twice = await exported(once, ID, SINGLE)
    expect(containerStarts(twice, ID)).toHaveLength(2)
    expect(twice).toContain(`var a = '${lookalike}';`)
    const added = twice.lastIndexOf(lookalike)
    const payloadEnd = twice.indexOf('</script', added)
    expect(JSON.parse(twice.slice(added + lookalike.length, payloadEnd))).toEqual(
      JSON.parse(jsonFromDocument(SINGLE)),
    )
  })
})

const FAULT_ROSTER: readonly {
  readonly reason: EmbeddedHtmlFaultReason
  readonly why: string
  readonly run: () => Promise<EmbeddedHtmlExport>
}[] = [
  {
    reason: 'appShellUnavailable',
    why: 'the seam said not-ok (LM-14: a file cannot always read itself back)',
    run: () => exportEmbeddedHtml(unavailableSource('read of the artifact failed').source, SMALL),
  },
  {
    reason: 'unusableElementId',
    why: 'the shell named its container with something no start tag can carry',
    run: () => exportEmbeddedHtml(shellSource(PLAIN_SHELL, 'has"quote').source, SMALL),
  },
  {
    reason: 'moreThanOneEntry',
    why: 'the shell already carries two entries',
    run: async () => {
      const one = await exported(PLAIN_SHELL, ID, SMALL)
      const container = onlyContainer(one, ID)
      const two =
        one.slice(0, container.end) +
        one.slice(container.begin, container.end) +
        one.slice(container.end)
      return exportEmbeddedHtml(shellSource(two, ID).source, SMALL)
    },
  },
]

describe('FR-028 -- a failure is a value, never a throw (AG-8 of table T-035)', () => {
  it('carries all three reasons of the roster, and no two the same', () => {
    expect(FAULT_ROSTER).toHaveLength(3)
    expect(new Set(FAULT_ROSTER.map((entry) => entry.reason)).size).toBe(3)
  })

  it('walks every reason: nothing thrown, a fault value, the reason named', async () => {
    for (const entry of FAULT_ROSTER) {
      let made: EmbeddedHtmlExport | null = null
      let thrown: unknown = null
      try {
        made = await entry.run()
      } catch (error: unknown) {
        thrown = error
      }
      // WHY: FR-028 forbids a throw across this boundary.
      expect(thrown, entry.why).toBeNull()
      expect(made?.ok, entry.why).toBe(false)
      if (made === null || made.ok) continue
      expect(made.fault.reason, entry.why).toBe(entry.reason)
      expect(made).not.toHaveProperty('html')
    }
  })

  it('says why in words for every reason (NT-1 of table T-037)', async () => {
    for (const entry of FAULT_ROSTER) {
      const made = await entry.run()
      expect(made.ok, entry.why).toBe(false)
      if (made.ok) continue
      // WHY: NT-1 forbids a marker alone; a sentence has to sit beside it.
      expect(typeof made.fault.what, entry.why).toBe('string')
      expect(made.fault.what.trim().length, entry.why).toBeGreaterThan(0)
      expect(made.fault.what, entry.why).not.toBe(made.fault.reason)
    }
  })

  it('hands on what the seam said, so the notice can name the item (NT-1)', async () => {
    const said = 'the artifact could not be read back from disk'
    const made = await exportEmbeddedHtml(unavailableSource(said).source, SMALL)
    expect(made.ok).toBe(false)
    if (made.ok) return
    expect(made.fault.reason).toBe('appShellUnavailable')
    expect(made.fault.what).toContain(said)
  })

  it('names the item it refused, and says why beside the marker (NT-1)', async () => {
    // WHY: `reason` is the marker, `what` is the sentence beside it;
    // whether the item's value must be echoed back is not settled here.
    const fault: EmbeddedHtmlFault = await refused(PLAIN_SHELL, 'has space', SMALL)
    expect(fault.reason).toBe('unusableElementId')
    expect(fault.what).not.toBe(fault.reason)
    expect(fault.what.trim().length).toBeGreaterThan(0)
  })

  it('does not fail over an empty seam message -- it is still one failure', async () => {
    const made = await exportEmbeddedHtml(unavailableSource('').source, SMALL)
    expect(made.ok).toBe(false)
    if (made.ok) return
    expect(made.fault.reason).toBe('appShellUnavailable')
    expect(typeof made.fault.what).toBe('string')
  })
})

describe('PND-71 -- the element id this component accepts from the shell', () => {
  it('accepts every plain ASCII id of the roster and writes it into the start tag', async () => {
    for (const elementId of USABLE_IDS) {
      const html = await exported(PLAIN_SHELL, elementId, SMALL)
      const container = onlyContainer(html, elementId)
      expect(container.startTag, elementId).toContain(`id="${elementId}"`)
    }
  })

  it('refuses every id outside the shape rather than repairing it', async () => {
    // WHY: a repaired id names an element BT-1 would then fail to find.
    for (const elementId of UNUSABLE_IDS) {
      const made = await exportEmbeddedHtml(shellSource(PLAIN_SHELL, elementId).source, SMALL)
      expect(made.ok, JSON.stringify(elementId)).toBe(false)
      if (made.ok) continue
      expect(made.fault.reason, JSON.stringify(elementId)).toBe(
        'unusableElementId',
      )
    }
  })

  it('writes nothing at all when it refuses an id', async () => {
    for (const elementId of UNUSABLE_IDS) {
      const made = await exportEmbeddedHtml(shellSource(PLAIN_SHELL, elementId).source, SMALL)
      expect(made).not.toHaveProperty('html')
    }
  })
})

describe('the round trip -- write the file, read the document back out of it', () => {
  it('gives back an equal document through the entry BT-1 reads', async () => {
    for (const [why, document] of [
      ['no rows at all', EMPTY],
      ['one row', SINGLE],
      ['two rows', SMALL],
      ['the bundled template whole', WHOLE],
    ] as const) {
      const html = await exported(PLAIN_SHELL, ID, document)
      const read = documentFromJson(onlyContainer(html, ID).payload)
      expect(read.ok, why).toBe(true)
      if (!read.ok) continue
      expect(read.document, why).toEqual(document)
    }
  })

  it('loses nothing that is hostile to HTML on the way through', async () => {
    const name = 'a </script> <!-- \u0000 \u65e5\u7a0b & "q" \\u003c'
    const document = documentOf(rootWithProjectName(rootOfSize(2), name))
    const html = await exported(PLAIN_SHELL, ID, document)
    const read = documentFromJson(onlyContainer(html, ID).payload)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.document).toEqual(document)
    expect(read.document.schedule.project.name).toBe(name)
  })

  it('settles after one turn -- exporting the document it read back gives the same file', async () => {
    const once = await exported(PLAIN_SHELL, ID, SMALL)
    const read = documentFromJson(onlyContainer(once, ID).payload)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const twice = await exported(PLAIN_SHELL, ID, read.document)
    expect(twice).toBe(once)
  })
})

// WHY: deep-freezes so a write into the argument throws rather than passing silently.
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  return Object.freeze(value)
}

describe('@purity semi-pure-b -- one external read, then pure assembly', () => {
  it('reads the seam exactly once, whatever the answer is (R7.3, R7.4)', async () => {
    const good = shellSource(PLAIN_SHELL, ID)
    await exportEmbeddedHtml(good.source, SMALL)
    expect(good.reads()).toBe(1)

    const refusedId = shellSource(PLAIN_SHELL, 'has space')
    await exportEmbeddedHtml(refusedId.source, SMALL)
    expect(refusedId.reads(), 'the id comes from the seam, so it is read first').toBe(1)

    const unavailable = unavailableSource('no')
    await exportEmbeddedHtml(unavailable.source, SMALL)
    expect(unavailable.reads()).toBe(1)
  })

  it('leaves the document it was handed as it found it', async () => {
    const document = deepFreeze(documentOf(rootOfSize(2)))
    const before = structuredClone(document) as Document
    await expect(exportEmbeddedHtml(shellSource(PLAIN_SHELL, ID).source, document)).resolves.toBeDefined()
    expect(document).toEqual(before)
  })

  it('gives the same file every time the seam gives the same answer', async () => {
    const first = await exported(PLAIN_SHELL, ID, SMALL)
    const second = await exported(PLAIN_SHELL, ID, SMALL)
    expect(second).toBe(first)
  })

  it('does not remember the shell between calls -- it asks again every time', async () => {
    const source = shellSource(PLAIN_SHELL, ID)
    await exportEmbeddedHtml(source.source, SMALL)
    await exportEmbeddedHtml(source.source, SMALL)
    expect(source.reads()).toBe(2)
  })
})

describe('PND-70 -- the container markup, now SETTLED (CR-353; docs/development-rules/06 section 3)', () => {
  it('writes `<script type="application/json" id="...">` and closes it', async () => {
    // WHY: the container's exact markup is not named by docs/spec; pinned
    // here so only a ruling that changes it should make this case fall.
    const html = await exported(PLAIN_SHELL, ID, SMALL)
    const container = onlyContainer(html, ID)
    expect(container.startTag).toBe(`<script type="application/json" id="${ID}">`)
    expect(html.slice(container.end - '</script>'.length, container.end)).toBe('</script>')
  })
})

describe('PI-20 of table T-064 -- the names this component publishes', () => {
  // WHY: exportEmbeddedHtml has no way out through the public entry, so
  // every caller of IO-7 would break Chapter 5.3's one-entry MUST NOT.
  it('LEFT FAILING ON PURPOSE: exportEmbeddedHtml does not leave through the public entry (Chapter 5.3 / PI-20, MUST)', async () => {
    const entry = (await import('../../src/adapter/document-codec/document-codec')) as unknown as Root
    expect(typeof entry['exportEmbeddedHtml']).toBe('function')
  })
})
