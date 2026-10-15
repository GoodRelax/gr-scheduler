// CR-768 spec-only cases: the copies of table T-024 and T-229 in src are generated, equal the tables, and a planted drift is caught by the generators.

import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import exportFormats from '../../src/adapter/screen-renderer/export-formats.json'
import { DELAY_DIAGNOSTICS_REPORT_EXTENSION, delayDiagnosticsReportFileNameOf } from '../../src/adapter/screen-renderer/screen-renderer'
import { EDITED_BY_SCREEN } from '../../src/framework/single-html-shell/frame-loop'
import {
  extensionOf,
  fileRows,
  generatedRegions,
  offeredRows,
  quotedMembers,
  regionHolding,
  sourceText,
} from './cr-768-table-t-024'
import { bare, specTable } from './spec-table'

const STORE = 'src/framework/file-system-access-file-store/file-system-access-file-store.ts'
const GATEWAY = 'src/adapter/file-gateway/file-gateway.ts'
const FLOW = 'src/framework/single-html-shell/document-file-flow.ts'
const FRAME_LOOP = 'src/framework/single-html-shell/frame-loop.ts'
const DOCUMENT = 'src/entity/document-model/document/document.ts'

const T_024_IS_THE_SOURCE = '⭐ **媒体の型の欄も、ファイルとして出る行がすべて持つ** —— `FR-096` が保存の選択面に渡す値の正が本表である。'
const T_229_ALL_THREE = '**本表の 3 行が、文書へ書き込む入口の全数である**'
const ED_1_WORD_HEADING = '書く語'

function readPublishedEntry(row: string): string {
  const text = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8')
  return text.split('\n').find((line) => line.startsWith(`| ${row} |`)) ?? ''
}

const PI_37 = readPublishedEntry('PI-37')

const pairsOf = (region: string): readonly (readonly [string, string])[] =>
  [...region.matchAll(/'(\.[a-z0-9]+)': '([^']+)'/g)].map((one) => [one[1] ?? '', one[2] ?? ''] as const)

describe('CR-768 -- the manuscript these cases read', () => {
  it('T-024 names itself the source of the media types, and T-229 is the full list of lastEditedBy words', () => {
    expect(sourceText('docs/spec/01-04-requirements.md')).toContain(T_024_IS_THE_SOURCE)
    expect(sourceText('docs/spec/01-04-requirements.md')).toContain(T_229_ALL_THREE)
  })
})

describe('FR-096 / T-024 -- the copies of the table in src are generated regions that equal the table', () => {
  it('MEDIA_TYPE_OF_EXTENSION lies in a generated region and holds the extension and media type of every file row, in the order of the table, and no other pair', () => {
    const region = regionHolding(STORE, 'MEDIA_TYPE_OF_EXTENSION')
    expect(region).toContain('docs/spec/01-04-requirements.md (table T-024)')
    expect(pairsOf(region)).toEqual(fileRows().map((one) => [one.extension, one.mediaType]))
  })

  it('the file store declares MEDIA_TYPE_OF_EXTENSION once, and that once is inside the generated region', () => {
    const declarations = sourceText(STORE).match(/const MEDIA_TYPE_OF_EXTENSION\b/g) ?? []
    expect(declarations).toHaveLength(1)
    expect(regionHolding(STORE, 'const MEDIA_TYPE_OF_EXTENSION')).toContain('const MEDIA_TYPE_OF_EXTENSION')
  })

  it('SaveFileForm (FileGateway) lists the offered rows of the table in its order', () => {
    const region = regionHolding(GATEWAY, 'type SaveFileForm')
    expect(region).toContain('docs/spec/01-04-requirements.md (table T-024)')
    expect(quotedMembers(region.slice(region.indexOf('type SaveFileForm')))).toEqual(offeredRows().map((one) => one.id))
  })

  it('SAVE_FILE_FORMS (the shell) lists the same rows in the same order', () => {
    const region = regionHolding(FLOW, 'SAVE_FILE_FORMS')
    expect(region).toContain('docs/spec/01-04-requirements.md (table T-024)')
    expect(quotedMembers(region.slice(region.indexOf('SAVE_FILE_FORMS')))).toEqual(offeredRows().map((one) => one.id))
  })

  it('the offered rows reach the chooser through export-formats.json: formats are the offered rows and files are every file row', () => {
    expect(exportFormats.formats.map((one) => [one.rowId, one.extension])).toEqual(offeredRows().map((one) => [one.id, one.extension]))
    expect(exportFormats.files.map((one) => [one.rowId, one.extension])).toEqual(fileRows().map((one) => [one.id, one.extension]))
    expect(exportFormats.files.map((one) => one.rowId)).toContain('IO-8')
    expect(exportFormats.formats.map((one) => one.rowId)).not.toContain('IO-8')
  })

  it('ROOT_KEYS (the document model) lists the root properties of the published GRS JSON schema, in its order', () => {
    const schema = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8')) as {
      readonly properties: Readonly<Record<string, unknown>>
    }
    const region = regionHolding(DOCUMENT, 'const ROOT_KEYS')
    expect(quotedMembers(region.slice(region.indexOf('const ROOT_KEYS')))).toEqual(Object.keys(schema.properties))
  })
})

describe('T-229 -- EDITED_BY_SCREEN is the word of ED-1', () => {
  const word = bare(specTable('T-229').rows.find((one) => one.id === 'ED-1')?.by[ED_1_WORD_HEADING] ?? '')

  it('ED-1 gives one plain word, and the frame loop exports exactly that word', () => {
    expect(word).toMatch(/^[A-Za-z][A-Za-z0-9-]*$/)
    expect(EDITED_BY_SCREEN).toBe(word)
  })

  it('the constant lies in a generated region and is declared once', () => {
    expect(regionHolding(FRAME_LOOP, 'EDITED_BY_SCREEN')).toContain('docs/spec/01-04-requirements.md (table T-229)')
    expect(sourceText(FRAME_LOOP).match(/const EDITED_BY_SCREEN\b/g) ?? []).toHaveLength(1)
  })
})

describe('PI-37 / RW-7 -- DELAY_DIAGNOSTICS_REPORT_EXTENSION is the extension of IO-8, published once', () => {
  it('the ScreenRenderer publishes the name, and its value is the extension of IO-8', () => {
    expect(PI_37).toContain('DELAY_DIAGNOSTICS_REPORT_EXTENSION')
    expect(PI_37).toContain('`IO-8`')
    expect(DELAY_DIAGNOSTICS_REPORT_EXTENSION).toBe(extensionOf('IO-8'))
  })

  it('the proposed name of the report ends with it, and no other source file spells the extension of a file row outside a generated region', () => {
    expect(delayDiagnosticsReportFileNameOf('plan', '2026-10-01').endsWith(extensionOf('IO-8'))).toBe(true)
    const holders = sourceFiles('src').filter((file) => {
      const text = sourceText(file)
      const outside = generatedRegions(text).reduce((rest, region) => rest.replace(region, ''), text)
      return outside.includes(`'${extensionOf('IO-8')}'`) || outside.includes(`"${extensionOf('IO-8')}"`)
    })
    expect(holders, 'RW-7: the extension of IO-8 has one home').toEqual([])
  })
})

function sourceFiles(folder: string): readonly string[] {
  const found: string[] = []
  for (const entry of readdirSync(join(process.cwd(), folder), { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`
    if (entry.isDirectory()) found.push(...sourceFiles(path))
    else if (entry.name.endsWith('.ts')) found.push(path)
  }
  return found
}

interface Run {
  readonly status: number | null
  readonly out: string
}

describe('npm run gen:check -- the generators catch a planted drift (run on a scratch copy outside the repository)', () => {
  const generators = ['generate_exchange_formats', 'generate_entity_types', 'generate_display_words'] as const
  const REQUIREMENTS_IN_COPY = ['docs', 'spec', '01-04-requirements.md']
  let scratch = ''

  const pathOf = (...parts: readonly string[]): string => join(scratch, ...parts)

  const run = (generator: (typeof generators)[number]): Run => {
    const done = spawnSync('python', [join('tools', `${generator}.py`), '--check'], {
      cwd: scratch,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    expect(done.error, 'python could not be started').toBeUndefined()
    return { status: done.status, out: `${done.stdout}${done.stderr}` }
  }

  // WHY: one copy for the whole group; each case plants one change, reads, and puts the file back.
  function planted(relative: readonly string[], from: string, to: string, readers: readonly (typeof generators)[number][]): readonly Run[] {
    const path = pathOf(...relative)
    const original = readFileSync(path, 'utf8')
    expect(original, `premise: ${relative.join('/')} holds ${from}`).toContain(from)
    writeFileSync(path, original.replace(from, to))
    try {
      return readers.map(run)
    } finally {
      writeFileSync(path, original)
    }
  }

  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), 'grs-cr-768-'))
    cpSync(join(process.cwd(), 'docs', 'spec'), pathOf('docs', 'spec'), { recursive: true })
    cpSync(join(process.cwd(), 'src'), pathOf('src'), { recursive: true })
    cpSync(join(process.cwd(), 'tools'), pathOf('tools'), { recursive: true })
  }, 120_000)

  afterAll(() => {
    if (scratch !== '') rmSync(scratch, { recursive: true, force: true })
  })

  it('control: on an untouched copy all three generators say the tree matches the tables', () => {
    for (const generator of generators) expect(run(generator), generator).toMatchObject({ status: 0 })
  }, 60_000)

  it('the scripts of package.json run all three checks under gen:check', () => {
    const scripts = (JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { readonly scripts: Record<string, string> }).scripts
    for (const check of ['formats:check', 'types:check', 'words:check']) {
      expect(scripts['gen:check'], check).toContain(`npm run ${check}`)
    }
  })

  it('a media type changed in T-024 leaves the file store region behind: the type generator names the file store', () => {
    const [types] = planted(REQUIREMENTS_IN_COPY, '| `.html` | `text/x-grs-html` |', '| `.html` | `text/html` |', ['generate_entity_types'])
    expect(types?.status).not.toBe(0)
    expect(types?.out).toContain('file-system-access-file-store.ts')
  }, 60_000)

  it('an extension changed on IO-8 drifts the exchange formats and the file store', () => {
    const [formats, types] = planted(REQUIREMENTS_IN_COPY, '| 書出のみ | `.md` |', '| 書出のみ | `.txt` |', ['generate_exchange_formats', 'generate_entity_types'])
    expect(formats?.status).not.toBe(0)
    expect(formats?.out).toContain('exchange-formats.json')
    expect(types?.status).not.toBe(0)
    expect(types?.out).toContain('file-system-access-file-store.ts')
  }, 60_000)

  it('IO-8 turned to offered drifts the chooser roster, the dictionary check and the two save-form regions', () => {
    const [formats, types, words] = planted(
      REQUIREMENTS_IN_COPY,
      '`text/x-grs-markdown` | 出さない |',
      '`text/x-grs-markdown` | 出す |',
      ['generate_exchange_formats', 'generate_entity_types', 'generate_display_words'],
    )
    expect(formats?.status).not.toBe(0)
    expect(formats?.out).toContain('export-formats.json')
    expect(types?.status).not.toBe(0)
    expect(types?.out).toContain('file-gateway.ts')
    expect(types?.out).toContain('document-file-flow.ts')
    expect(words?.status).not.toBe(0)
    expect(words?.out).toContain('IO-8')
  }, 60_000)

  it('the word of ED-1 changed drifts the frame loop region', () => {
    const [types] = planted(REQUIREMENTS_IN_COPY, '| ED-1 | 画面を操作する人 | `user` |', '| ED-1 | 画面を操作する人 | `person` |', ['generate_entity_types'])
    expect(types?.status).not.toBe(0)
    expect(types?.out).toContain('frame-loop.ts')
  }, 60_000)

  it.each([
    [STORE, "'.png': 'image/png'", "'.png': 'image/x-png'"],
    [GATEWAY, "'IO-3' | 'IO-4'", "'IO-3'"],
    [FLOW, "'IO-3', 'IO-4']", "'IO-3']"],
    [FRAME_LOOP, "export const EDITED_BY_SCREEN = 'user'", "export const EDITED_BY_SCREEN = 'me'"],
  ])('a hand edit inside the generated region of %s is caught (%s)', (file, from, to) => {
    const [types] = planted(file.split('/'), from, to, ['generate_entity_types'])
    expect(types?.status).not.toBe(0)
    expect(types?.out).toContain(file.split('/').pop())
  }, 60_000)
})
