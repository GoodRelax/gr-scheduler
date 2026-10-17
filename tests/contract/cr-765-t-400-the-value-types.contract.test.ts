// CR-765 spec-only tests: table T-400, the value types AV-1 to AV-14 the members of T-107 hand over, and the reasons of AV-4.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, expectTypeOf, it } from 'vitest'

import type { AgentRefusalReason } from '../../src/adapter/agent-api-endpoint/agent-api-members'
import {
  mcpToolResultOf,
  pageNotConnectedResult,
} from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import {
  T_400_HEADINGS,
  fieldAlternativesOf,
  printedMembers,
  printedValueTypes,
  quotedReasonsOf,
  typedLinesOf,
  valueRowsPointedAt,
} from './cr-765-printed-tables'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

const { members } = printedMembers()
const { caption, headings, values } = printedValueTypes()

const valueRow = (id: string) => {
  const found = values.find((one) => one.id === id)
  if (found === undefined) throw new Error(`T-400 has no row ${id}`)
  return found
}

const PREFIXES = readFileSync(join(SPEC, '_assets', 'tbl-row-id-prefixes.md'), 'utf8')
const DESIGN = readFileSync(join(SPEC, '_assets', 'design-mcp-relay.md'), 'utf8').replace(/\s+/g, ' ')

// see T-400
const EXPECTED_TYPES = [
  ['AV-1', 'AgentWriteRequest'],
  ['AV-2', 'AgentWriteOutcome'],
  ['AV-3', 'AgentRefusal'],
  ['AV-4', 'AgentRefusalReason'],
  ['AV-5', 'AgentExport'],
  ['AV-6', 'AgentFocusOutcome'],
  ['AV-7', 'AgentImportSource'],
  ['AV-8', 'AgentShownTasks'],
  ['AV-9', 'AgentDelayDiagnostics'],
  ['AV-10', 'AgentChangeReceiver'],
  ['AV-11', 'AgentWatch'],
  ['AV-12', 'AgentDialogueMessageOutcome'],
  ['AV-13', 'DialogueMessage'],
  ['AV-14', 'ChangeNotice'],
  ['AV-15', 'AgentImportOutcome'],
] as const

// see T-400
const EXPECTED_FIELDS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  'AV-1': [['expectedStamp', 'commands']],
  'AV-2': [
    ['ok', 'stamp', 'hasUpdatedSchedule'],
    ['ok', 'refusal'],
  ],
  'AV-3': [['target', 'reason', 'stamp', 'document', 'refusals', 'message']],
  'AV-4': [],
  'AV-5': [
    ['ok', 'value'],
    ['ok', 'refusal'],
  ],
  'AV-6': [
    ['ok', 'stamp', 'hasUpdatedSchedule', 'isScrolled'],
    ['ok', 'refusal'],
  ],
  'AV-7': [['document'], ['text']],
  'AV-8': [['drawnTaskUids', 'filteringTables']],
  'AV-9': [['fixProposals', 'fixLog']],
  'AV-10': [['notice']],
  'AV-11': [['hasReplacedEarlierWatch', 'stopWatching']],
  'AV-12': [
    ['ok', 'message'],
    ['ok', 'refusal'],
  ],
  'AV-13': [['sequence', 'author', 'text', 'settledAt']],
  'AV-14': [['watcher', 'document', 'messages', 'mark']],
  // see AV-15
  'AV-15': [
    ['ok', 'stamp', 'hasUpdatedSchedule'],
    ['ok', 'asked', 'stamp'],
    ['ok', 'refusal'],
  ],
}

// see AV-4
const FIXED_REASONS = [
  'staleStamp',
  'gestureInFlight',
  'editingInPlace',
  'questionAsked',
  'deliveringNotices',
  'commandRefused',
  'unknownTask',
  'notDrawnYet',
  'tooTall',
  'rasterFailed',
  'embeddedHtmlFailed',
  'notAvailable',
  'malformedRequest',
] as const satisfies readonly AgentRefusalReason[]

const A_STAMP = { fileSavedAt: 'stamp-9' }

const refusalOf = (reason: string): Record<string, unknown> => ({
  target: 'AM-7',
  reason,
  stamp: A_STAMP,
  document: null,
  refusals: [],
  what: 'refused',
})

const inClosure = (): Set<string> => {
  const seen = new Set<string>()
  const queue = members.flatMap((one) => [
    ...one.arguments.flatMap((argument) => argument.pointsAt),
    ...one.returnsPointsAt,
  ])
  while (queue.length > 0) {
    const next = queue.pop() ?? ''
    if (!/^AV-\d+$/.test(next) || seen.has(next)) continue
    seen.add(next)
    queue.push(...valueRowsPointedAt(valueRow(next).fieldsCell), ...typedLinesOf(valueRow(next).fieldsCell).flatMap((line) => line.pointsAt))
  }
  return seen
}

describe('T-400 is printed beside T-107 with fifteen rows AV-1 to AV-15 (CR-796)', () => {
  it('the shared table reader finds it in tbl-agent-api-members.md; the columns are row id, type name, fields, source', () => {
    expect(specTable('T-400').file).toBe(join('_assets', 'tbl-agent-api-members.md'))
    expect(headings).toEqual([...T_400_HEADINGS])
    expect(caption).toContain('表 T-400 — `Agent API` が受け渡す値の型')
  })

  it('the rows are AV-1 to AV-15 in order, each a distinct type name', () => {
    expect(values.map((one) => [one.id, one.bareName])).toEqual(EXPECTED_TYPES.map((one) => [...one]))
    expect(new Set(values.map((one) => one.bareName)).size).toBe(15)
    expect(valueRow('AV-5').typeName).toBe('AgentExport<TValue>')
  })

  it('the prefix AV is registered for table T-400 with its 15 rows', () => {
    const registered = PREFIXES.split('\n').find((line) => line.startsWith('| `AV` |')) ?? ''
    expect(registered).toContain('`T-400`')
    expect(registered.trim().endsWith('| 15 |')).toBe(true)
  })

  it('AV-13 and AV-14 are declared by other components and printed here with the field names of this table', () => {
    const prose = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-agent-api-members.md'), 'utf8'))
    expect(prose).toContain('`AV-13` と `AV-14` は、ほかのコンポーネント（`DialogueLog`・`NotifyChangeWatchers`）が宣言する型である')
  })
})

describe('T-400 fields, row by row', () => {
  it.each(EXPECTED_TYPES.map((one) => [one[0], one[1]] as const))('%s %s names the fields the type has', (id) => {
    expect(fieldAlternativesOf(valueRow(id).fieldsCell)).toEqual(EXPECTED_FIELDS[id]?.map((one) => [...one]))
  })
})

describe('every row of T-400 is used by a member, and every type a member names is a row of T-400', () => {
  it('the rows a member reaches, directly or through the rows it points at, are all fourteen', () => {
    expect([...inClosure()].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)))).toEqual(values.map((one) => one.id))
  })

  it('the rows a member points at directly are AV-1, AV-2, AV-5 to AV-13 and AV-15 (CR-796)', () => {
    const direct = new Set(
      members.flatMap((one) => [...one.arguments.flatMap((argument) => argument.pointsAt), ...one.returnsPointsAt]).filter((id) => id.startsWith('AV-')),
    )
    expect([...direct].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)))).toEqual([
      'AV-1',
      'AV-2',
      'AV-5',
      'AV-6',
      'AV-7',
      'AV-8',
      'AV-9',
      'AV-10',
      'AV-11',
      'AV-12',
      'AV-13',
      'AV-15',
    ])
  })

  it('a pointer to AV-n from a member sits beside the name of that very row', () => {
    for (const one of members) {
      const places = [
        ...one.arguments.map((argument) => ({ typeText: argument.typeText, pointsAt: argument.pointsAt })),
        { typeText: one.returnsType, pointsAt: one.returnsPointsAt },
      ]
      for (const place of places) {
        for (const pointer of place.pointsAt.filter((id) => id.startsWith('AV-'))) {
          expect(place.typeText, `${one.id} points at ${pointer}`).toContain(valueRow(pointer).bareName)
        }
      }
    }
  })

  it('every type a member names is a row of T-400, or points at the row of table T-064 that publishes it', () => {
    const published = specTable('T-064').rows
    const bare = new Set(values.map((one) => one.bareName))
    for (const one of members) {
      const places = [
        ...one.arguments.map((argument) => ({ typeText: argument.typeText, pointsAt: argument.pointsAt })),
        { typeText: one.returnsType, pointsAt: one.returnsPointsAt },
      ]
      for (const place of places) {
        const named = (place.typeText.match(/[A-Za-z_$][\w$]*/g) ?? []).filter(
          (word) => !['readonly', 'null', 'string', 'number', 'Promise', 'Uint8Array'].includes(word),
        )
        for (const type of named) {
          if (bare.has(type)) continue
          const row = place.pointsAt.find((id) => id.startsWith('PI-'))
          const publishedRow = published.find((candidate) => candidate.id === row)
          expect(publishedRow?.cells.join(' ') ?? '', `${one.id} names ${type}`).toContain('`' + type + '`')
        }
      }
    }
  })

  it('every type a row of T-400 writes is another row, or points at its publishing row, or at a table that exists', () => {
    const published = specTable('T-064').rows
    const bare = new Set(values.map((one) => one.bareName))
    let resolvedByTable = 0
    for (const value of values) {
      const parameters = /<(.*)>$/.exec(value.typeName)?.[1]?.split(',') ?? []
      for (const line of typedLinesOf(value.fieldsCell)) {
        for (const type of line.named) {
          if (bare.has(type) || parameters.includes(type)) continue
          const row = line.pointsAt.find((id) => id.startsWith('PI-'))
          if (row !== undefined) {
            const publishedRow = published.find((candidate) => candidate.id === row)
            expect(publishedRow?.cells.join(' ') ?? '', `${value.id} writes ${type}`).toContain('`' + type + '`')
            continue
          }
          const table = line.pointsAt.find((id) => /^T-\d+[a-z]?$/.test(id))
          expect(table, `${value.id} writes ${type} and points at nothing`).toBeDefined()
          expect(specTable(table ?? '').rows.length, `${value.id} points at ${table}`).toBeGreaterThan(0)
          resolvedByTable += 1
        }
      }
    }
    expect(resolvedByTable).toBeGreaterThan(0)
  })
})

describe('AV-4: the reasons a refusal carries, and what the relay returns of them', () => {
  const printed = quotedReasonsOf(valueRow('AV-4').fieldsCell)

  it('thirteen quoted reasons, then the codec reasons of table T-233 and the invariant rows of table T-220', () => {
    expect(printed).toEqual([...FIXED_REASONS])
    expect(new Set(printed).size).toBe(13)
    const rest = valueRow('AV-4').fieldsCell.split(/<br\s*\/?>/i).map((line) => line.trim())
    expect(rest.some((line) => line.startsWith('`CodecRefusalReason`（表 T-233）'))).toBe(true)
    expect(rest.some((line) => line.startsWith('`InvariantRow`（表 T-064 の `PI-9`）'))).toBe(true)
    expect(rest[0]).toContain('⛔ 1 つの値へ潰さない（`AG-9a`）')
  })

  it('the type holds those thirteen and the two other families, and nothing else', () => {
    expectTypeOf<Exclude<AgentRefusalReason, `IV-${number}` | `RS-${number}`>>().toEqualTypeOf<(typeof FIXED_REASONS)[number]>()
  })

  it.each(FIXED_REASONS.map((reason) => [reason] as const))('%s: the relay hands a page refusal on with the reason unchanged and as a value', (reason) => {
    const result = { ok: false, refusal: refusalOf(reason) }
    const answered = mcpToolResultOf('applyCommands', { result })
    expect(answered.isError ?? false).toBe(false)
    expect(answered.structuredContent).toEqual(result)
    expect((answered.structuredContent?.['refusal'] as { reason: string }).reason).toBe(reason)
  })

  it('the reasons a table T-233 row id or a table T-220 row id gives pass through the same way', () => {
    for (const reason of ['RS-61', 'RS-62', 'IV-2']) {
      const result = { ok: false, refusal: refusalOf(reason) }
      const answered = mcpToolResultOf('exportJson', { result })
      expect((answered.structuredContent?.['refusal'] as { reason: string }).reason).toBe(reason)
    }
  })

  it('the one reason the relay makes itself is pageNotConnected, which design 5 names and AV-4 does not list', () => {
    const URL = 'http://127.0.0.1:50123/#abcdefABCDEF0123456789_-'
    const refusal = pageNotConnectedResult(URL).structuredContent?.['refusal'] as { reason: string; target: string; stamp: unknown }
    expect(refusal.reason).toBe('pageNotConnected')
    expect(printed).not.toContain(refusal.reason)
    expect(DESIGN).toContain('理由の区分は `pageNotConnected` とし、開く URL を添える')
    expect(DESIGN).toContain('ページが無いので現在の刻印は無く、刻印の欄は空とする')
    expect(refusal.stamp).toBeNull()
  })
})
