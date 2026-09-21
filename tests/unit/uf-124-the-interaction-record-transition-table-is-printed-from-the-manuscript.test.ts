// UF-124: tools/generate_state_machine_types.py prints the transition table of the manuscript, row by row.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { INTERACTION_RECORD_VALUES_TRANSITIONS } from '../../src/use-case/advance-screen-session/interaction-record-values'

type GuardTerm = { readonly name: string; readonly not?: true } | { readonly in: string }

interface Branch {
  readonly to?: string
  readonly guard?: readonly GuardTerm[]
  readonly effect?: string
  readonly effectArgument?: string
}

type Cell = Branch | readonly Branch[]

interface Manuscript {
  readonly regions: readonly {
    readonly region: string
    readonly root: { readonly transitions: Readonly<Record<string, Cell>> }
    readonly machines: readonly {
      readonly name: string
      readonly transitions: Readonly<Record<string, Readonly<Record<string, Cell>>>>
    }[]
  }[]
}

interface ManuscriptTransition {
  readonly id: string
  readonly state: string
  readonly event: string
  readonly guard: readonly GuardTerm[] | null
  readonly to: string
  readonly effect: string | null
  readonly effectArgument: string | null
}

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as Manuscript

const INTERACTION_RECORD = MANUSCRIPT.regions.find((one) => one.region === 'interactionRecord')

function guardText(guard: readonly GuardTerm[] | null): string | null {
  if (guard === null) return null
  return guard.map((term) => ('in' in term ? `in ${term.in}` : term.not === true ? `not ${term.name}` : term.name)).join(' & ')
}

function branchesOf(cell: Cell): readonly Branch[] {
  return Array.isArray(cell) ? cell : [cell as Branch]
}

function rowOf(state: string, event: string, branch: Branch, to: string): ManuscriptTransition {
  const guard = branch.guard ?? null
  const id = `${state} x ${event}${guard === null ? '' : ` [${guardText(guard) ?? ''}]`}`
  return { id, state, event, guard, to, effect: branch.effect ?? null, effectArgument: branch.effectArgument ?? null }
}

// WHY: one row per branch of every cell, the root's first and then each machine's in
// manuscript order -- the order the generator prints them in.
function transitionsOf(region: Manuscript['regions'][number] | undefined): ManuscriptTransition[] {
  if (region === undefined) return []
  const root = Object.entries(region.root.transitions).flatMap(([event, cell]) =>
    branchesOf(cell).map((branch) => rowOf(region.region, event, branch, region.region)),
  )
  const machines = region.machines.flatMap((machine) =>
    Object.entries(machine.transitions).flatMap(([event, row]) =>
      Object.entries(row).flatMap(([key, cell]) =>
        branchesOf(cell).map((branch) =>
          rowOf(`${machine.name}.${key}`, event, branch, `${machine.name}.${branch.to ?? key}`),
        ),
      ),
    ),
  )
  return [...root, ...machines]
}

function idOf(row: { readonly state: string; readonly event: string; readonly guard: string | null }): string {
  return `${row.state} x ${row.event}${row.guard === null ? '' : ` [${row.guard}]`}`
}

const TRANSITIONS = transitionsOf(INTERACTION_RECORD)

describe('the generated table of region interactionRecord against state-machines.json', () => {
  it('holds the rows of the manuscript, in its order', () => {
    expect(INTERACTION_RECORD).toBeDefined()
    expect(INTERACTION_RECORD_VALUES_TRANSITIONS.map(idOf)).toEqual(TRANSITIONS.map((row) => row.id))
  })

  it.each(TRANSITIONS.map((row) => [row.id, row] as const))(
    '%s carries its source, event, guard, target and effect unchanged',
    (id, row) => {
      const printed = INTERACTION_RECORD_VALUES_TRANSITIONS.find((one) => idOf(one) === id)
      expect(printed).toEqual({
        state: row.state,
        event: row.event,
        guard: guardText(row.guard),
        to: row.to,
        effect: row.effect,
        effectArgument: row.effectArgument,
      })
    },
  )
})
