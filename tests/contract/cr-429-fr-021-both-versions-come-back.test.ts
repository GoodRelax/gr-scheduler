// CR-429: a pj12 file and a pj15 file each come back from an unedited round trip, valid and equal.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import { accepted, pj12Fixture, pj15Fixture, writtenText } from '../unit/cr-429-mspdi-fixtures'
import {
  holdsPj15OnlyElement,
  mspdiText,
  normalizedMspdi,
  parseXml,
  pathsIn,
  pj15OnlyPaths,
  reversedByName,
  schemaFaults,
  textAt,
} from '../unit/cr-429-mspdi-schema'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_021_READS_BY_T_265 = '**取り込むときの読み方は表 T-265 に従うこと（MUST）。**'

const EX_1_BOTH_VERSIONS =
  '書き出したものは、pj15 だけが持つ要素を含まないとき pj12 に、含むとき pj15 に妥当であること（MUST）。'

const NR_6_NAMES = '名前の違う子どうしの順は比べない。'

const NR_6_SAME_NAME = '⛔ 同じ名前の子の順は比べる'

function rowText(table: string, id: string): string {
  const row = specTable(table).rows.find((each) => each.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

function roundTrip(text: string): string {
  return writtenText(accepted(text).document)
}

describe('the rows these cases answer to', () => {
  it('FR-021, EX-1, NR-6: the clauses are still where the cases found them', () => {
    expect(REQUIREMENTS).toContain(FR_021_READS_BY_T_265)
    expect(rowText('T-033', 'EX-1')).toContain(EX_1_BOTH_VERSIONS)
    expect(rowText('T-228', 'NR-6')).toContain(NR_6_NAMES)
    expect(rowText('T-228', 'NR-6')).toContain(NR_6_SAME_NAME)
  })

  it('NR-6: the comparison forgets the order of differently named children and keeps that of same-named ones', () => {
    const text = mspdiText(pj12Fixture())
    const swappedNames = mspdiText(reversedByName(pj12Fixture()))
    const swappedTasks = text.replace(
      /(<Task>[\s\S]*?<UID>2<\/UID>[\s\S]*?<\/Task>)(\s*)(<Task>[\s\S]*?<UID>3<\/UID>[\s\S]*?<\/Task>)/,
      '$3$2$1',
    )
    expect(swappedTasks).not.toBe(text)
    expect(normalizedMspdi(swappedNames)).toEqual(normalizedMspdi(text))
    expect(normalizedMspdi(swappedTasks)).not.toEqual(normalizedMspdi(text))
  })
})

describe('FR-021 -- a pj12 file, read and written without an edit', () => {
  it('FR-021, EX-1: comes back valid against pj12', () => {
    const text = mspdiText(pj12Fixture())
    const back = roundTrip(text)
    expect(holdsPj15OnlyElement(parseXml(back))).toBe(false)
    expect(schemaFaults(back, 'pj12')).toEqual([])
  })

  it('FR-021, NR-6: comes back equal to the file once T-228 has normalized both', () => {
    const text = mspdiText(pj12Fixture())
    expect(normalizedMspdi(roundTrip(text))).toEqual(normalizedMspdi(text))
  })

  it('DV-2: SaveVersion comes back as it arrived', () => {
    expect(textAt(parseXml(roundTrip(mspdiText(pj12Fixture()))), 'SaveVersion')).toBe('12')
  })

  it('EX-1, EX-10 (DFC-563): a pj12 file holding an OutlineCode comes back valid against pj12', () => {
    const text = mspdiText(pj12Fixture({ outlineCodes: true }))
    expect(schemaFaults(text, 'pj12')).toEqual([])
    expect(schemaFaults(roundTrip(text), 'pj12')).toEqual([])
  })

  it('FR-021, NR-6 (DFC-563): the OutlineCode file comes back equal as well', () => {
    const text = mspdiText(pj12Fixture({ outlineCodes: true }))
    expect(normalizedMspdi(roundTrip(text))).toEqual(normalizedMspdi(text))
  })
})

describe('FR-021 -- a pj15 file holding every element pj15 adds, read and written without an edit', () => {
  it('EX-1: the file is valid against pj15 and not against pj12 -- the case needs both halves', () => {
    const text = mspdiText(pj15Fixture())
    expect(schemaFaults(text, 'pj15')).toEqual([])
    expect(schemaFaults(text, 'pj12')).not.toEqual([])
  })

  it('FR-021, EX-1, EX-10: comes back valid against pj15', () => {
    expect(schemaFaults(roundTrip(mspdiText(pj15Fixture())), 'pj15')).toEqual([])
  })

  it('FR-021: keeps every element pj15 adds over pj12', () => {
    const written = new Set(pathsIn(parseXml(roundTrip(mspdiText(pj15Fixture())))))
    expect(pj15OnlyPaths().filter((path) => !written.has(path))).toEqual([])
  })

  it('FR-021, NR-6: comes back equal to the file once T-228 has normalized both', () => {
    const text = mspdiText(pj15Fixture())
    expect(normalizedMspdi(roundTrip(text))).toEqual(normalizedMspdi(text))
  })

  it('DV-2: SaveVersion 14 comes back as it arrived', () => {
    expect(textAt(parseXml(roundTrip(mspdiText(pj15Fixture()))), 'SaveVersion')).toBe('14')
  })
})
