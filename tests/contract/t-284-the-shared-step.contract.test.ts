// Contract test: table T-284 (the one-step shape every region shares) and table T-285 (adding a region).

import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { assertNever, NO_EFFECTS, unchanged } from '../../src/use-case/advance-screen-session/session-step'
import { bare, specTable, unbroken } from './spec-table'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const T284_LEAD =
  '全領域が共有する 1 段の形の約束を 表 T-284 に示す。領域のユニットと公開エントリは、本表の名前と約束に従うこと（MUST）'
const T285_LEAD = '状態機械に領域を 1 つ足す手順を 表 T-285 に示す。領域を足すときは、本表の段の順に従うこと（MUST）'

type Loose = Record<string, unknown>
type Region = {
  readonly region: string
  readonly unit: string
  readonly events: readonly unknown[]
  readonly machines: readonly {
    readonly states: readonly unknown[]
    readonly transitions: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  }[]
}

const REGIONS = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8')) as {
    readonly regions: readonly Region[]
  }
).regions

function regionsOf(session: ScreenSession): Loose {
  return session as unknown as Loose
}

function axesOf(region: unknown): Loose {
  return region as Loose
}

function isAxis(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'kind' in value
}

describe(`table T-284: ${T284_LEAD}`, () => {
  it('the lead-in is the manuscript sentence, and the table holds SS-1..SS-6 naming the exports tested here', () => {
    expect(DESIGN).toContain(T284_LEAD)
    const names = specTable('T-284').rows.map((r) => `${r.id} ${bare(r.by['名前'] ?? '')}`)
    expect(names).toEqual([
      'SS-1 Step<S, E>',
      'SS-2 NO_EFFECTS',
      'SS-3 unchanged',
      'SS-4 assertNever',
      'SS-5 advanceScreenSession',
      'SS-6 emptyScreenSession',
    ])
  })

  it('SS-1: a step carries the whole next state and the effects in one value', () => {
    const result = advanceScreenSession(emptyScreenSession, { type: 'paletteToggled' } as SessionEvent)
    expect(Object.keys(result).sort()).toEqual(['effects', 'state'])
    expect(Object.keys(regionsOf(result.state)).sort()).toEqual(Object.keys(regionsOf(emptyScreenSession)).sort())
    expect(Array.isArray(result.effects)).toBe(true)
  })

  it('SS-2: NO_EFFECTS is an empty frozen list', () => {
    expect(NO_EFFECTS).toEqual([])
    expect(Object.isFrozen(NO_EFFECTS)).toBe(true)
  })

  it('SS-2: the one NO_EFFECTS is what every unchanged step carries', () => {
    const nothing = advanceScreenSession(emptyScreenSession, { type: 'scaleMessageTimeElapsed' } as SessionEvent)
    expect(nothing.effects).toBe(NO_EFFECTS)
    expect(unchanged({ any: 'state' }).effects).toBe(NO_EFFECTS)
  })

  it('SS-3: unchanged returns the same state reference with NO_EFFECTS', () => {
    const state = { any: 'state' }
    const result = unchanged(state)
    expect(result.state).toBe(state)
    expect(result.effects).toBe(NO_EFFECTS)
  })

  it('SS-4: assertNever throws when a kind reaches it at run time', () => {
    expect(() => assertNever('unhandled' as never)).toThrow()
  })

  it('SS-5: an event that touches one axis leaves every other axis and every other region at the same reference', () => {
    const result = advanceScreenSession(emptyScreenSession, { type: 'paletteToggled' } as SessionEvent)
    const before = regionsOf(emptyScreenSession)
    const after = regionsOf(result.state)
    expect(after).not.toBe(before)
    const touched = axesOf(after['screen'])
    const untouched = axesOf(before['screen'])
    expect(touched['paletteDisplayState']).not.toBe(untouched['paletteDisplayState'])
    for (const axis of Object.keys(untouched).filter((k) => k !== 'paletteDisplayState' && isAxis(untouched[k]))) {
      expect(touched[axis], axis).toBe(untouched[axis])
    }
    for (const region of Object.keys(before).filter((k) => k !== 'screen')) {
      expect(after[region], region).toBe(before[region])
    }
  })

  it('SS-5: when no region changes and nothing is effected, the root reference comes back', () => {
    const result = advanceScreenSession(emptyScreenSession, { type: 'pointerRestElapsed' } as SessionEvent)
    expect(result.state).toBe(emptyScreenSession)
    expect(result.effects).toBe(NO_EFFECTS)
  })

  it('SS-6: emptyScreenSession composes exactly the regions of the manuscript', () => {
    expect(Object.keys(regionsOf(emptyScreenSession)).sort()).toEqual(REGIONS.map((r) => r.region).sort())
  })
})

// WHY: RA-6..RA-8 (a spec-only tester, the shell wiring, the frame time) leave no mark
// in the tree that a file could read, and the ORDER of the steps is not observable.
describe(`table T-285: ${T285_LEAD}`, () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly scripts: Readonly<Record<string, string>>
  }
  const t075 = specTable('T-075').rows
  const ut11 = specTable('T-063').rows.find((r) => r.id === 'UT-11')

  it('the lead-in is the manuscript sentence', () => {
    expect(DESIGN).toContain(T285_LEAD)
  })

  it.each(REGIONS.map((r) => [r.region, r] as const))('RA-1: region %s has states, events and transitions', (_, r) => {
    expect(r.machines.flatMap((m) => m.states).length).toBeGreaterThan(0)
    expect(r.events.length).toBeGreaterThan(0)
    expect(r.machines.flatMap((m) => Object.values(m.transitions).flatMap((row) => Object.keys(row))).length).toBeGreaterThan(0)
  })

  it.each([
    ['gen', 'machines'],
    ['gen', 'machines:types'],
    ['gen:check', 'machines:check'],
    ['gen:check', 'machines:types:check'],
  ])('RA-2: npm run %s runs %s', (script, step) => {
    expect(packageJson.scripts[script]).toMatch(new RegExp(`npm run ${step}( |$)`))
  })

  it('RA-2: the machines scripts run both state-machine generators', () => {
    expect(packageJson.scripts['machines']).toContain('state_machines_json_to_md.py')
    expect(packageJson.scripts['machines:types']).toContain('generate_state_machine_types.py')
  })

  it.each(REGIONS.map((r) => [r.region, r] as const))('RA-3: region %s has its unit file and a T-075 row', (_, r) => {
    expect(existsSync(join(process.cwd(), r.unit))).toBe(true)
    const rows = t075.filter((row) => bare(row.by['ユニット'] ?? '') === basename(r.unit))
    expect(rows.map((row) => bare(row.by['コンポーネント'] ?? ''))).toEqual(['AdvanceScreenSession'])
  })

  it.each(REGIONS.map((r) => [r.region, r] as const))('RA-4: UT-11 names the unit of region %s', (_, r) => {
    expect(ut11).toBeDefined()
    expect(ut11?.by['ユニット'] ?? '').toContain(`\`${basename(r.unit)}\``)
  })

  it.each(REGIONS.map((r) => [r.region, r] as const))('RA-5: emptyScreenSession composes region %s', (region) => {
    expect(Object.keys(regionsOf(emptyScreenSession))).toContain(region)
  })
})
