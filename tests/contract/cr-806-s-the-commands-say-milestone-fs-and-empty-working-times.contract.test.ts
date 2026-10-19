// CR-806 spec-only cases: CM-36 says a milestone end makes the line FS (FR-009); CM-39 refuses empty working times (IV-24, S-580, S-582)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { BEFORE_ALL, FINISH_OF, START_OF, documentOf, taskIn, type TaskSpec } from './cr-731-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

// see T-018, DP-1, DP-4
const FS = 1
const SS = 3

type Loose = Record<string, any>

const SCHEMA = JSON.parse(readFileSync(join(SPEC, '_source', 'grs-commands.schema.json'), 'utf8')) as Loose
const SETTINGS = JSON.parse(readFileSync(join(SPEC, '_source', 'settings.json'), 'utf8')) as unknown

// WHY: the schema may keep each branch inline under oneOf or under $defs keyed by the command name.
function branchOf(name: string): Loose {
  const inline = (SCHEMA['oneOf'] as readonly Loose[] | undefined)?.find((one) => one['properties']?.['kind']?.['const'] === name)
  if (inline !== undefined) return inline
  const defined = SCHEMA['$defs']?.[name] as Loose | undefined
  if (defined !== undefined) return defined
  throw new Error(`no branch for the command ${name} in grs-commands.schema.json`)
}

const descriptionOf = (name: string): string => String(branchOf(name)['description'] ?? '')

// WHY: the settings book nests rows at an unknown depth; find the object whose id is the row id.
function findRow(node: unknown, id: string): Loose | null {
  if (node === null || typeof node !== 'object') return null
  if (!Array.isArray(node) && (node as Loose)['id'] === id) return node as Loose
  for (const child of Array.isArray(node) ? node : Object.values(node as Loose)) {
    const found = findRow(child, id)
    if (found !== null) return found
  }
  return null
}

const span = (uid: number, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  start: START_OF('2027-05-10'),
  finish: FINISH_OF('2027-05-12'),
  ...extra,
})

function dependencyDocument(firstIsMilestone: boolean, secondIsMilestone: boolean): Document {
  return documentOf([span(1, { milestone: firstIsMilestone }), span(2, { milestone: secondIsMilestone })], { statusDate: BEFORE_ALL })
}

function linkTypeAfter(document: Document, predecessorEdge: 'start' | 'finish', successorEdge: 'start' | 'finish'): unknown {
  const command = { kind: 'createDependency', predecessorUid: 1, successorUid: 2, predecessorEdge, successorEdge } as unknown as DocumentCommand
  const result = editDocument(document, command, LIMITS, 'row')
  if (!result.ok) throw new Error(`CM-36 was refused: ${JSON.stringify(result.refusals)}`)
  const lines = taskIn(result.document, 2)['dependencies'] as readonly Loose[]
  const one = lines.find((line) => line['predecessorUid'] === 1)
  if (one === undefined) throw new Error('no dependency was made')
  return one['linkType']
}

describe('CR-806 CM-36: the createDependency text says a milestone end makes the line FS', () => {
  const text = descriptionOf('createDependency')

  it('names the milestone and finish-to-start in the schema description', () => {
    expect(text).toMatch(/milestone/i)
    expect(text).toMatch(/finish-to-start/i)
  })

  it('FR-009 table T-018 numbers FS as 1 and SS as 3', () => {
    const table = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8')
    expect(table).toMatch(/\| DP-1 \| 1 \| FS/)
    expect(table).toMatch(/\| DP-4 \| 3 \| SS/)
  })

  it('a milestone predecessor with start/start lands FS', () => {
    expect(linkTypeAfter(dependencyDocument(true, false), 'start', 'start')).toBe(FS)
  })

  it('a milestone successor with finish/finish lands FS', () => {
    expect(linkTypeAfter(dependencyDocument(false, true), 'finish', 'finish')).toBe(FS)
  })

  it('two normal tasks with start/start land SS', () => {
    expect(linkTypeAfter(dependencyDocument(false, false), 'start', 'start')).toBe(SS)
  })
})

describe('CR-806 CM-39: the setCalendar text refuses an empty workingTimes and names the default spans', () => {
  const text = descriptionOf('setCalendar')
  const row580 = findRow(SETTINGS, 'S-580')
  const spans = (row580?.['value']?.['spans'] ?? []) as readonly (readonly string[])[]
  const printed = spans.map((pair) => `${pair[0]}-${pair[1]}`)

  it('says an empty list is refused', () => {
    expect(text).toMatch(/empty/i)
    expect(text).toMatch(/refused/i)
  })

  it('names the two default spans', () => {
    expect(text).toContain('08:00:00-12:00:00')
    expect(text).toContain('13:00:00-17:00:00')
  })

  it('the named spans equal the S-580 spans of settings.json', () => {
    expect(row580).not.toBeNull()
    expect(printed).toEqual(['08:00:00-12:00:00', '13:00:00-17:00:00'])
  })

  it('the description states the S-582 maximum', () => {
    const maximum = findRow(SETTINGS, 'S-582')
    expect(maximum).not.toBeNull()
    expect(text).toContain('1 to 5')
  })
})

describe('CR-806 CM-39 / IV-24: behaviour of setCalendar through editDocument', () => {
  const document = (): Document => documentOf([span(1)], { statusDate: BEFORE_ALL })
  const setCalendar = (workingTimes: readonly unknown[]) =>
    editDocument(document(), { kind: 'setCalendar', workingTimes } as unknown as DocumentCommand, LIMITS, 'row')

  it('refuses an empty workingTimes and names IV-24', () => {
    const result = setCalendar([])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusals.map((one) => one.rule)).toContain('IV-24')
  })

  it('accepts the two S-580 spans', () => {
    const spans = (findRow(SETTINGS, 'S-580')?.['value']?.['spans'] ?? []) as readonly (readonly string[])[]
    const result = setCalendar(spans.map((pair, ordinal) => ({ ordinal, fromTime: pair[0], toTime: pair[1] })))
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    expect(result.ok).toBe(true)
  })
})
