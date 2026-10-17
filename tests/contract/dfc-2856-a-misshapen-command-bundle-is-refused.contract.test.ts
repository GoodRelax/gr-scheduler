// DFC-2856: applyCommands (AM-7) refuses a command out of table T-108's shape as malformedRequest and leaves the document alone (FR-028, AG-9a).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { commandShapeFaults } from '../../src/adapter/document-codec/document-codec'
import { shell, taskGroupDocument, taskOf, TEMPLATE, type ShellBench } from '../unit/cr-541-stage'
import { unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const MEMBERS = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-agent-api-members.md'), 'utf8'))
const PUBLISHED = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-published-entries.md'), 'utf8'))

const FR_028_NO_THROW = '例外を投げてはならない（MUST NOT）'
const AV_4_MALFORMED = "`'malformedRequest'` —— 呼び方の形が違う（`FR-028`）"
const AM_7 = '| AM-7 | 書く | `applyCommands` |'
const PI_20_SHAPE = '`commandShapeFaults`'

// see T-108
const WORKING_DAY_LAG = { lagWorkingDays: 2 }
const TYPED_LAG = { lagMinutes: 120, lagUnit: 'h' }
const LAG_BASE = { kind: 'setDependencyLag', predecessorUid: 1, successorUid: 2 }

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

function stage(): { api: AgentApi; bench: ShellBench } {
  const document = taskGroupDocument([
    { id: 'g1', parentId: null },
    { id: 'g2', parentId: null },
  ])
  const tasks = document.schedule.tasks as Record<string, unknown>[]
  document.schedule.tasks = [
    tasks[0],
    taskOf(2, {
      dependencies: [{ predecessorUid: 1, linkType: 1, linkLag: 0, lagFormat: 7, carry: {}, carryElements: [] }],
    }),
  ]
  const bench = shell(document)
  benches.push(bench)
  const api = installAgentApi({
    ...bench.loop.agentApiSeams(),
    writerName: 'dfc-2856 tester',
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
  } as never)
  return { api, bench }
}

const titleOf = (bench: ShellBench): unknown => (bench.loop.document().schedule.project as { title?: unknown }).title

function write(api: AgentApi, commands: readonly unknown[]) {
  return api.applyCommands({ expectedStamp: api.readStamp(), commands: commands as never })
}

// see AG-9a
function expectRefused(commands: readonly unknown[], why: string): void {
  const { api, bench } = stage()
  const documentBefore = JSON.stringify(bench.loop.document())
  const stampBefore = JSON.stringify(api.readStamp())
  const outcome = write(api, commands)
  expect(outcome.ok, `${why} -- ${AV_4_MALFORMED}`).toBe(false)
  if (outcome.ok) return
  expect(outcome.refusal.reason, why).toBe('malformedRequest')
  expect(JSON.stringify(bench.loop.document()), `${why}: the document is left as it was`).toBe(documentBefore)
  expect(JSON.stringify(api.readStamp()), `${why}: the stamp is left as it was`).toBe(stampBefore)
}

describe('DFC-2856 -- the manuscript these cases are driven by', () => {
  it('FR-028 still forbids a throw', () => {
    expect(REQUIREMENTS).toContain(FR_028_NO_THROW)
  })
  it('AV-4 still names malformedRequest and AM-7 still names applyCommands', () => {
    expect(MEMBERS).toContain(AV_4_MALFORMED)
    expect(MEMBERS).toContain(AM_7)
  })
  it('PI-20 still publishes commandShapeFaults for this use', () => {
    expect(PUBLISHED).toContain(PI_20_SHAPE)
    expect(PUBLISHED).toContain('`malformedRequest`')
  })
})

describe('AG-9a -- applyCommands refuses a command out of table T-108 shape as malformedRequest', () => {
  it('case 1: a command of an unknown kind', () => {
    expectRefused([{ kind: 'noSuchCommand', title: 'x' }], 'unknown kind')
  })

  it('case 2: a command missing a required value (setProjectTitle without title)', () => {
    expectRefused([{ kind: 'setProjectTitle' }], 'missing title')
  })

  it('case 3: a command carrying a misspelled extra value (titel for title)', () => {
    expectRefused([{ kind: 'setProjectTitle', titel: 'Typo' }], 'misspelled titel, no title')
    expectRefused([{ kind: 'setProjectTitle', title: 'Fine', titel: 'Typo' }], 'a value the command does not carry')
  })

  it('case 4: a value of the wrong JSON type (a string where an integer is required)', () => {
    expectRefused([{ kind: 'setTaskName', taskUid: '1', name: 'Renamed' }], 'taskUid as a string')
    expectRefused([{ kind: 'moveTaskGroup', taskGroupId: 'g2', parentId: null, order: 'first' }], 'order as a string')
    expectRefused([{ kind: 'setProjectTitle', title: 42 }], 'title as a number')
  })

  it('case 5: one good command then one bad command -- the good one is NOT applied (atomic)', () => {
    const { api, bench } = stage()
    const titleBefore = titleOf(bench)
    const documentBefore = JSON.stringify(bench.loop.document())
    const stampBefore = JSON.stringify(api.readStamp())
    const outcome = write(api, [{ kind: 'setProjectTitle', title: 'DFC-2856 applied?' }, { kind: 'setProjectTitle', titel: 'bad' }])
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.refusal.reason).toBe('malformedRequest')
    expect(titleOf(bench)).toBe(titleBefore)
    expect(JSON.stringify(bench.loop.document())).toBe(documentBefore)
    expect(JSON.stringify(api.readStamp())).toBe(stampBefore)
  })

  it('FR-028: a command that is not even an object is refused as a value, not thrown', () => {
    expectRefused([null], 'null command')
    expectRefused([42], 'number command')
    expectRefused([{ title: 'no kind' }], 'no kind')
  })

  it('case 6: a well-shaped bundle is still accepted', () => {
    const { api, bench } = stage()
    const outcome = write(api, [{ kind: 'setProjectTitle', title: 'DFC-2856 well shaped' }])
    expect(outcome.ok).toBe(true)
    expect(titleOf(bench)).toBe('DFC-2856 well shaped')
  })

  it('case 6b: a well-shaped bundle of two commands is accepted and both land', () => {
    const { api, bench } = stage()
    const outcome = write(api, [
      { kind: 'setProjectTitle', title: 'DFC-2856 two' },
      { kind: 'setTaskName', taskUid: 1, name: 'Renamed by bundle' },
    ])
    expect(outcome.ok).toBe(true)
    expect(titleOf(bench)).toBe('DFC-2856 two')
  })

  it('an empty refusal still carries the AV-3 fields (target, stamp, message)', () => {
    const { api } = stage()
    const outcome = write(api, [{ kind: 'noSuchCommand' }])
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(typeof outcome.refusal.target).toBe('string')
    expect(typeof outcome.refusal.message).toBe('string')
    expect(JSON.stringify(outcome.refusal.stamp)).toBe(JSON.stringify(api.readStamp()))
  })
})

describe('CM-38 setDependencyLag -- two alternative shapes, a mix that fits neither is refused', () => {
  it('case 7a: the working-day shape is accepted', () => {
    const { api } = stage()
    const outcome = write(api, [{ ...LAG_BASE, ...WORKING_DAY_LAG }])
    expect(outcome.ok).toBe(true)
  })

  it('case 7b: the typed shape is accepted', () => {
    const { api } = stage()
    const outcome = write(api, [{ ...LAG_BASE, ...TYPED_LAG }])
    expect(outcome.ok).toBe(true)
  })

  it.each([
    ['both shapes at once', { ...WORKING_DAY_LAG, ...TYPED_LAG }],
    ['a typed shape without its unit', { lagMinutes: 120 }],
    ['a typed shape without its minutes', { lagUnit: 'h' }],
    ['a working-day lag with a unit', { ...WORKING_DAY_LAG, lagUnit: 'h' }],
    ['a unit outside the enum', { lagMinutes: 120, lagUnit: 'w' }],
    ['neither shape', {}],
  ])('case 7c: %s is refused as malformedRequest', (why, lag) => {
    expectRefused([{ ...LAG_BASE, ...lag }], why)
  })
})

describe('PI-20 -- commandShapeFaults answers whether one command fits table T-108', () => {
  it('case 8: a fitting command has no faults', () => {
    expect(commandShapeFaults({ kind: 'setProjectTitle', title: 'T' })).toEqual([])
    expect(commandShapeFaults({ kind: 'setTaskName', taskUid: 1, name: 'N' })).toEqual([])
    expect(commandShapeFaults({ kind: 'moveTaskGroup', taskGroupId: 'g2', parentId: null, order: 0 })).toEqual([])
    expect(commandShapeFaults({ ...LAG_BASE, ...WORKING_DAY_LAG })).toEqual([])
    expect(commandShapeFaults({ ...LAG_BASE, ...TYPED_LAG })).toEqual([])
  })

  it.each([
    ['unknown kind', { kind: 'noSuchCommand' }],
    ['no kind', { title: 'x' }],
    ['missing required value', { kind: 'setProjectTitle' }],
    ['misspelled extra value', { kind: 'setProjectTitle', titel: 'x' }],
    ['extra value beside a good one', { kind: 'setProjectTitle', title: 'x', titel: 'y' }],
    ['wrong JSON type (string for integer)', { kind: 'setTaskName', taskUid: '1', name: 'N' }],
    ['wrong JSON type (number for string)', { kind: 'setProjectTitle', title: 42 }],
    ['moveTaskGroup order as a string', { kind: 'moveTaskGroup', taskGroupId: 'g2', parentId: null, order: 'first' }],
    ['lag mix fitting neither shape', { ...LAG_BASE, ...WORKING_DAY_LAG, ...TYPED_LAG }],
    ['lag typed shape without unit', { ...LAG_BASE, lagMinutes: 120 }],
    ['null', null],
    ['a number', 42],
  ])('case 8: %s has at least one fault', (_why, command) => {
    const faults = commandShapeFaults(command)
    expect(faults.length).toBeGreaterThan(0)
    for (const fault of faults) {
      expect(typeof fault.at).toBe('string')
      expect(typeof fault.what).toBe('string')
    }
  })
})
