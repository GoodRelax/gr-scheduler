// CR-429: the two MSPDI schemas the cases below judge against, read at run time and held to Chapter 6.2 and A.1.

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import { pj12Fixture, pj15Fixture } from '../unit/cr-429-mspdi-fixtures'
import { mspdiText, pj15OnlyPaths, schemaFaults, schemaModel, xsdPathOf } from '../unit/cr-429-mspdi-schema'

const SPEC = join(process.cwd(), 'docs', 'spec')

const APPENDIX = unbroken(readFileSync(join(SPEC, 'A-appendix.md'), 'utf8'))

const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

const A_1_PJ15_HAS_NO_URL = 'pj15 —— 公式 URL は無い。'

const A_1_PJ15_HASH = /`mspdi_pj15\.xsd`（SHA-256 `([0-9a-f]{64})`）を正とする/

const SECTION_6_2_ONE_AUTHORITY_PER_VERSION = '**正は A.1 が版ごとに定める**。'

const SECTION_6_2_NO_FOREIGN_LINES = 'ハッシュが A.1 と合わない複製の行番号で引いてはならない（MUST NOT）。'

const EX_10_ORDER_WRAPS = 'pj15 の順は pj12 の順を包むので、pj15 だけの要素を含まなければ pj12 の順になる。'

const EX_10_NO_TYPES = '⛔ 型・説明・列挙値を写してはならない（MUST NOT）'

const CN_7_TABLE_EXCEPTION =
  '例外 —— 交換相手のスキーマの、要素の道筋ごとの子の名と順の表（表 T-033 の `EX-10`）は、スキーマから道具で作って同梱してよい。'

const CN_7_NO_TYPES = '型・説明・列挙値は含めない'

function rowText(table: string, id: string): string {
  const row = specTable(table).rows.find((each) => each.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

function filesUnder(folder: string): readonly string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

const SCHEMA_MARKUP = ['minOccurs', 'maxOccurs', 'xsd:enumeration', 'xsd:restriction', 'xsd:documentation', 'xsd:simpleType']

describe('A.1 and Chapter 6.2 -- which copy of pj15 the cases read', () => {
  it('A.1: names no URL for pj15 and one SHA-256 for its schema', () => {
    expect(APPENDIX).toContain(A_1_PJ15_HAS_NO_URL)
    expect(A_1_PJ15_HASH.exec(APPENDIX), 'A.1 names the SHA-256 of mspdi_pj15.xsd').not.toBeNull()
  })

  it('Chapter 6.2: the local pj15 copy is the one A.1 names, so its line numbers may be cited', () => {
    expect(DESIGN).toContain(SECTION_6_2_ONE_AUTHORITY_PER_VERSION)
    expect(DESIGN).toContain(SECTION_6_2_NO_FOREIGN_LINES)
    const named = A_1_PJ15_HASH.exec(APPENDIX)?.[1]
    const held = createHash('sha256').update(readFileSync(xsdPathOf('pj15'))).digest('hex')
    expect(held).toBe(named)
  })
})

describe('EX-10 -- the order pj15 declares wraps the order pj12 declares', () => {
  it('EX-10: the row still says so', () => {
    expect(rowText('T-033', 'EX-10')).toContain(EX_10_ORDER_WRAPS)
  })

  it('EX-10: every element path of pj12 is a path of pj15, and pj15 adds at least one', () => {
    const newer = schemaModel('pj15').byPath
    const missing = [...schemaModel('pj12').byPath.keys()].filter((path) => !newer.has(path))
    expect(missing).toEqual([])
    expect(pj15OnlyPaths().length).toBeGreaterThan(0)
  })

  it('EX-10: under every parent, pj12`s order is pj15`s order with the pj15-only names taken out', () => {
    const newer = schemaModel('pj15').byPath
    const faults: string[] = []
    for (const [path, older] of schemaModel('pj12').byPath) {
      const decl = newer.get(path)
      if (older.content.kind === 'simple' || decl === undefined || decl.content.kind === 'simple') continue
      const olderNames = older.content.children.map((each) => each.name)
      const kept = decl.content.children.map((each) => each.name).filter((name) => olderNames.includes(name))
      if (decl.content.kind !== older.content.kind) faults.push(`${path}: ${older.content.kind} became ${decl.content.kind}`)
      if (kept.join(' ') !== olderNames.join(' ')) faults.push(`${path}: the shared names changed order`)
    }
    expect(faults).toEqual([])
  })

  it('EX-10: pj15 has xsd:all parents, the ones where the arrived order is kept', () => {
    const all = [...schemaModel('pj15').byPath.entries()].filter(([, decl]) => decl.content.kind === 'all')
    expect(all.length).toBeGreaterThan(0)
  })
})

describe('the judge the cases use -- it has to refuse before its passes mean anything', () => {
  it('EX-1: the pj12 file the cases read is valid against both schemas', () => {
    const text = mspdiText(pj12Fixture({ outlineCodes: true }))
    expect(schemaFaults(text, 'pj12')).toEqual([])
    expect(schemaFaults(text, 'pj15')).toEqual([])
  })

  it('EX-1: the pj15 file is valid against pj15 and refused by pj12 for exactly its pj15-only elements', () => {
    const text = mspdiText(pj15Fixture())
    expect(schemaFaults(text, 'pj15')).toEqual([])
    const refused = schemaFaults(text, 'pj12')
    expect(refused).toHaveLength(pj15OnlyPaths().length)
    for (const path of pj15OnlyPaths()) expect(refused).toContain(`${path}: not declared here`)
  })

  it('EX-1: a child moved out of xsd:sequence order, a missing required child and a mistyped value are all refused', () => {
    const text = mspdiText(pj12Fixture())
    const moved = text.replace(/(<SaveVersion>12<\/SaveVersion>)([\s\S]*?)(<Name>Bridge programme<\/Name>)/, '$3$2$1')
    const noCurrency = text.replace(/<CurrencyCode>EUR<\/CurrencyCode>/, '')
    const mistyped = text.replace('<MinutesPerDay>480</MinutesPerDay>', '<MinutesPerDay>eight hours</MinutesPerDay>')
    expect(moved).not.toBe(text)
    expect(schemaFaults(moved, 'pj12')).toContain('Project: children out of order (Name, SaveVersion, Title, StartDate, FinishDate, CurrencyCode, CalendarUID, MinutesPerDay, MinutesPerWeek, DaysPerMonth, WeekStartDay, ExtendedAttributes, Calendars, Tasks, Resources, Assignments)')
    expect(schemaFaults(noCurrency, 'pj12')).toContain('Project/CurrencyCode: required, missing')
    expect(schemaFaults(mistyped, 'pj12')).toContain('Project/MinutesPerDay: "eight hours" is not an xsd:integer')
  })
})

describe('CN-7 and EX-10 -- the child-order table carries names and order only', () => {
  it('CN-7: the row admits the generated table and keeps types, descriptions and enumerations out of it', () => {
    expect(rowText('T-003', 'CN-7')).toContain(CN_7_TABLE_EXCEPTION)
    expect(rowText('T-003', 'CN-7')).toContain(CN_7_NO_TYPES)
    expect(rowText('T-033', 'EX-10')).toContain(EX_10_NO_TYPES)
  })

  it('CN-7 / EX-10: no file under src/ carries schema markup or a sentence of either schema`s documentation', () => {
    const sentences = [...new Set([...schemaModel('pj12').documentation, ...schemaModel('pj15').documentation])].filter(
      (sentence) => sentence.length >= 40,
    )
    expect(sentences.length).toBeGreaterThan(100)
    const found: string[] = []
    for (const path of filesUnder(join(process.cwd(), 'src'))) {
      const text = readFileSync(path, 'utf8')
      for (const word of SCHEMA_MARKUP) if (text.includes(word)) found.push(`${path}: ${word}`)
      for (const sentence of sentences) if (text.includes(sentence)) found.push(`${path}: "${sentence.slice(0, 50)}"`)
    }
    expect(found).toEqual([])
  })
})
