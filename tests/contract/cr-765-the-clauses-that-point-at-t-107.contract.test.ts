// CR-765 spec-only tests: the clauses and pointers that name table T-107 follow it to tbl-agent-api-members.md.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { printedMembers, printedValueTypes } from './cr-765-printed-tables'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

const { members } = printedMembers()
const { values } = printedValueTypes()

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const PUBLISHED = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-published-entries.md'), 'utf8'))

const OP_16_NO_FILE_NO_NAME = '—— 空の段では、名が無いのか読めなかったのかが読めない。⚠️ ファイルを持たずに渡された文書（`_assets/tbl-agent-api-members.md` の 表 T-107 の `AM-8`）では ② を出さないこと（MUST）'
const PI_17_NOT_COPIED = ' `SnapshotSource`（表 T-065）。　　⚠️ 外へ公開する 26 メンバの名前は `_assets/tbl-agent-api-members.md` の 表 T-107 が持つ。　　本表に書き写さない（MUST NOT）'

const markdownUnder = (folder: string): string[] =>
  readdirSync(folder).flatMap((name) => {
    const path = join(folder, name)
    if (statSync(path).isDirectory()) return name === 'output' ? [] : markdownUnder(path)
    return name.endsWith('.md') ? [path] : []
  })

describe('OP-16 (MUST): a document handed over without a file shows no file row, and AM-8 is the member that hands it', () => {
  it('the requirement still says so, and still points at table T-107 in its new file', () => {
    expect(REQUIREMENTS).toContain(OP_16_NO_FILE_NO_NAME)
  })

  it('AM-8 is importDocument, and the source it takes (AV-7) is a document, a wrapped document or a text -- never a file name', () => {
    const importer = members.find((one) => one.id === 'AM-8')
    expect(importer?.name).toBe('importDocument')
    expect(importer?.arguments.map((argument) => argument.typeText)).toEqual(['AgentImportSource'])
    const source = values.find((one) => one.id === 'AV-7')
    expect(source?.fieldsCell).toContain('`Document`')
    expect(source?.fieldsCell).toContain('`document`: `Document`')
    expect(source?.fieldsCell).toContain('`text`: `string`')
    expect(source?.fieldsCell.toLowerCase()).not.toContain('filename')
    expect(source?.fieldsCell).not.toContain('ファイルの名前')
  })
})

describe('PI-17 (MUST NOT): table T-064 does not copy the 26 member names that table T-107 holds', () => {
  it('the row still says the names are table T-107\'s, in the file that holds it', () => {
    expect(PUBLISHED).toContain(PI_17_NOT_COPIED)
  })

  it('no member name of table T-107 is written in the row of the Agent API entry', () => {
    const row = specTable('T-064').rows.find((one) => one.id === 'PI-17')
    const text = row?.cells.join(' ') ?? ''
    expect(text).toContain('`installAgentApi`')
    for (const member of members) expect(text, member.name).not.toContain('`' + member.name + '`')
  })
})

describe('no pointer in the specification still sends a reader to the glossary for table T-107 or T-400', () => {
  const files = markdownUnder(SPEC).map((path) => [path.slice(SPEC.length + 1), unbroken(readFileSync(path, 'utf8'))] as const)

  it('the specification holds many files and each is read', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(['T-107', 'T-400'])('%s: the file named before the table is tbl-agent-api-members.md', (table) => {
    const stale = new RegExp('tbl-glossary\\.md`? の 表 ' + table)
    const found = files.filter(([, text]) => stale.test(text)).map(([name]) => name)
    expect(found).toEqual([])
  })

  it('the pointers that do name the new file are many, so the scan above is not empty-handed', () => {
    const fresh = /tbl-agent-api-members\.md`? の 表 T-107/
    expect(files.filter(([, text]) => fresh.test(text)).length).toBeGreaterThanOrEqual(3)
  })
})
