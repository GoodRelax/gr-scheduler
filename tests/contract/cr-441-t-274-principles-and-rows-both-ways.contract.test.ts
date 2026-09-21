// Contract test: table T-274's principles and the nine grab tables read both ways, and FR-104's reverse rule.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken, type SpecRow } from './spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

// see T-274
const T_274_NONE_OUTSIDE =
  '⛔ 本表の「覆う行」の欄にも上の段にも名の無い行を、表 T-266 ／ 表 T-267 ／ 表 T-268 ／ 表 T-269 ／ 表 T-270 ／ 表 T-271 ／ 表 T-272 ／ 表 T-273 ／ 表 T-020 へ足してはならない（MUST NOT）。'
const T_274_THE_EXCEPTIONS_OPEN = '⭐ 本表のどの行も覆わない行は '
const T_274_THE_EXCEPTIONS_CLOSE = ' であり、'
const COVERS = '覆う行'

// see FR-104
const FR_104_EACH_NAMES_A_TABLE =
  '⚠️ **逆に、`FR-104` 〜 `FR-110` ／ `FR-043` ／ `FR-009` ／ `FR-044` のどれも、表 T-266 ／ 表 T-267 ／ 表 T-268 ／ 表 T-269 ／ 表 T-270 ／ 表 T-271 ／ 表 T-272 ／ 表 T-273 ／ 表 T-020 のうち少なくとも 1 つを名指すこと（MUST）**'

// WHY: CR-441 section 5 claims these three numbers; the spec is measured below, and this is the claim
// WHY: it is compared with, so a later row that moves them is a red that names the claim.
const CLAIMED_ROWS = 86
const CLAIMED_COVERED = 82
const CLAIMED_EXCEPTIONS = 4

const ROW_ID = /`([A-Z]+-\d+[a-z]?)`/g
const TABLE_ID = /表 (T-\d+[a-z]?)/g

const idsIn = (text: string, pattern: RegExp): readonly string[] => [...text.matchAll(pattern)].map((one) => one[1] ?? '')

const NINE_TABLES = idsIn(T_274_NONE_OUTSIDE, TABLE_ID)

const exceptionsIn = (text: string): readonly string[] => {
  const from = text.indexOf(T_274_THE_EXCEPTIONS_OPEN)
  if (from < 0) throw new Error(`the closing paragraph of table T-274 no longer opens with ${T_274_THE_EXCEPTIONS_OPEN}`)
  const to = text.indexOf(T_274_THE_EXCEPTIONS_CLOSE, from)
  return idsIn(text.slice(from, to), ROW_ID)
}

interface Principle {
  readonly id: string
  readonly covers: readonly string[]
}

const principlesOf = (rows: readonly SpecRow[]): readonly Principle[] =>
  rows.map((row) => ({ id: row.id, covers: idsIn(row.by[COVERS] ?? '', ROW_ID) }))

interface Trace {
  readonly problems: readonly string[]
  readonly rows: number
  readonly covered: number
  readonly exceptions: number
}

// see T-274
const traceOf = (
  principles: readonly Principle[],
  tableRows: Readonly<Record<string, readonly string[]>>,
  exceptions: readonly string[],
): Trace => {
  const problems: string[] = []
  const owner = new Map<string, string>()
  for (const [table, ids] of Object.entries(tableRows)) {
    for (const id of ids) {
      if (owner.has(id)) problems.push(`${id} is a row of both ${owner.get(id)} and ${table}`)
      owner.set(id, table)
    }
  }
  const seen = new Map<string, string>()
  for (const principle of principles) {
    if (principle.covers.length === 0) problems.push(`${principle.id} covers no row`)
    for (const id of principle.covers) {
      if (!owner.has(id)) problems.push(`${principle.id} covers ${id}, which none of the nine tables holds`)
      const before = seen.get(id)
      if (before !== undefined) problems.push(`${id} belongs to both ${before} and ${principle.id}`)
      seen.set(id, principle.id)
    }
  }
  for (const id of exceptions) {
    if (!owner.has(id)) problems.push(`the exception ${id} is a row of none of the nine tables`)
    if (seen.has(id)) problems.push(`the exception ${id} is also covered by ${seen.get(id)}`)
  }
  for (const id of owner.keys()) {
    if (!seen.has(id) && !exceptions.includes(id)) problems.push(`${id} (${owner.get(id)}) belongs to no principle and is no named exception`)
  }
  return { problems, rows: owner.size, covered: [...seen.keys()].filter((id) => owner.has(id)).length, exceptions: exceptions.length }
}

const PRINCIPLES = principlesOf(specTable('T-274').rows)
const TABLE_ROWS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  NINE_TABLES.map((table) => [table, specTable(table).rows.map((row) => row.id)]),
)
const EXCEPTIONS = exceptionsIn(REQUIREMENTS)

describe('table T-274 -- the manuscript this case reads', () => {
  it.each([T_274_NONE_OUTSIDE, FR_104_EACH_NAMES_A_TABLE])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('names nine tables and seven principles', () => {
    expect(NINE_TABLES).toHaveLength(9)
    expect(PRINCIPLES.map((one) => one.id)).toEqual(['PP-1', 'PP-2', 'PP-3', 'PP-4', 'PP-5', 'PP-6', 'PP-7'])
  })
})

describe(`table T-274 both ways: ${T_274_NONE_OUTSIDE}`, () => {
  const trace = traceOf(PRINCIPLES, TABLE_ROWS, EXCEPTIONS)

  it('every principle covers at least one row, and every row of the nine tables has one principle or is a named exception', () => {
    expect(trace.problems).toEqual([])
  })

  it.each(PRINCIPLES)('$id covers at least one row', (principle) => {
    expect(principle.covers.length, `${principle.id}: ${COVERS}`).toBeGreaterThan(0)
  })

  it(`counts ${CLAIMED_ROWS} rows, ${CLAIMED_COVERED} covered and ${CLAIMED_EXCEPTIONS} exceptions (CR-441 section 5)`, () => {
    expect([trace.rows, trace.covered, trace.exceptions]).toEqual([CLAIMED_ROWS, CLAIMED_COVERED, CLAIMED_EXCEPTIONS])
    expect(trace.covered + trace.exceptions).toBe(trace.rows)
  })
})

describe('control -- the both-ways trace goes red when either direction breaks', () => {
  const clean = (): Trace => traceOf(PRINCIPLES, TABLE_ROWS, EXCEPTIONS)
  const withCovers = (id: string, covers: (before: readonly string[]) => readonly string[]): readonly Principle[] =>
    PRINCIPLES.map((one) => (one.id === id ? { id, covers: covers(one.covers) } : one))

  it('the unmutated manuscript is clean (premise)', () => {
    expect(clean().problems).toEqual([])
  })

  const BREAKS: readonly { readonly what: string; readonly trace: () => Trace }[] = [
    {
      what: 'a principle loses its only row (PP-5 without RF-1)',
      trace: () => traceOf(withCovers('PP-5', () => []), TABLE_ROWS, EXCEPTIONS),
    },
    {
      what: 'one row drops out of a principle column (PK-5 out of PP-6)',
      trace: () => traceOf(withCovers('PP-6', (before) => before.filter((id) => id !== 'PK-5')), TABLE_ROWS, EXCEPTIONS),
    },
    {
      what: 'a principle names a row none of the nine tables holds',
      trace: () => traceOf(withCovers('PP-1', (before) => [...before, 'no-such-row']), TABLE_ROWS, EXCEPTIONS),
    },
    {
      what: 'a row is covered by two principles (RF-1 also in PP-3)',
      trace: () => traceOf(withCovers('PP-3', (before) => [...before, 'RF-1']), TABLE_ROWS, EXCEPTIONS),
    },
    {
      what: 'a table gains a row nobody names',
      trace: () => traceOf(PRINCIPLES, { ...TABLE_ROWS, 'T-270': [...(TABLE_ROWS['T-270'] ?? []), 'unnamed-row'] }, EXCEPTIONS),
    },
    {
      what: 'a named exception is dropped from the closing paragraph',
      trace: () => traceOf(PRINCIPLES, TABLE_ROWS, EXCEPTIONS.filter((id) => id !== 'PE-13')),
    },
    {
      what: 'a covered row is also named an exception',
      trace: () => traceOf(PRINCIPLES, TABLE_ROWS, [...EXCEPTIONS, 'PE-8']),
    },
  ]

  it.each(BREAKS)('red: $what', ({ trace }) => {
    expect(trace().problems.length).toBeGreaterThan(0)
  })
})

// see FR-104
const REQUIREMENT_LINES = REQUIREMENTS.split('\n')

const blockOf = (uid: string, lines: readonly string[] = REQUIREMENT_LINES): string => {
  const at = lines.findIndex((line) => line.trim() === `**UID**: ${uid}`)
  if (at < 0) throw new Error(`01-04-requirements.md holds no requirement ${uid}`)
  let from = at
  while (from > 0 && !lines[from]!.startsWith('#')) from -= 1
  let to = at + 1
  while (to < lines.length && !lines[to]!.startsWith('#')) to += 1
  return lines.slice(from, to).join('\n')
}

const requirementsNamedIn = (clause: string): readonly string[] => {
  const out: string[] = []
  const text = clause.split('のどれも')[0] ?? ''
  for (const part of text.split('／')) {
    const ids = idsIn(part, ROW_ID).map((id) => Number(id.replace('FR-', '')))
    if (ids.length === 2) for (let n = ids[0]!; n <= ids[1]!; n += 1) out.push(`FR-${String(n).padStart(3, '0')}`)
    else for (const n of ids) out.push(`FR-${String(n).padStart(3, '0')}`)
  }
  return out
}

// WHY: a table's own caption line is where the table sits, not a naming of it.
const tablesNamedIn = (block: string): readonly string[] =>
  idsIn(block.replace(/\*\*表 T-\d+[a-z]? —[^\n]*/g, ''), TABLE_ID)

const OWNERS = requirementsNamedIn(FR_104_EACH_NAMES_A_TABLE)
const OWNED_TABLES = idsIn(FR_104_EACH_NAMES_A_TABLE.split('のどれも')[1] ?? '', TABLE_ID)

describe(`FR-104 RATIONALE: ${FR_104_EACH_NAMES_A_TABLE}`, () => {
  it('names ten requirements and the nine tables of table T-274', () => {
    expect(OWNERS).toEqual(['FR-104', 'FR-105', 'FR-106', 'FR-107', 'FR-108', 'FR-109', 'FR-110', 'FR-043', 'FR-009', 'FR-044'])
    expect(OWNED_TABLES).toEqual(NINE_TABLES)
  })

  it.each(OWNERS)('%s names at least one of the nine tables', (uid) => {
    const named = tablesNamedIn(blockOf(uid)).filter((table) => OWNED_TABLES.includes(table))
    expect(named.length, `${uid}: ${FR_104_EACH_NAMES_A_TABLE}`).toBeGreaterThan(0)
  })

  it('control: a requirement with every naming stripped out goes red', () => {
    const stripped = REQUIREMENT_LINES.map((line) => line.replace(/表 T-\d+[a-z]?/g, ''))
    expect(tablesNamedIn(blockOf('FR-044', stripped))).toEqual([])
  })

  it("control: the table's own caption is not counted as a naming", () => {
    expect(tablesNamedIn('**表 T-270 — 掴んだものを押す・引いたときの効果**')).toEqual([])
  })
})
