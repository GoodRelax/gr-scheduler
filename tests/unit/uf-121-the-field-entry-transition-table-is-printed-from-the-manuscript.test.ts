// UF-121: tools/generate_state_machine_types.py prints the transition table of the manuscript, row by row.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FIELD_ENTRY_VALUES_TRANSITIONS } from '../../src/use-case/advance-screen-session/field-entry-values'

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

const FIELD_ENTRY = MANUSCRIPT.regions.find((one) => one.region === 'fieldEntry')

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

const TRANSITIONS = transitionsOf(FIELD_ENTRY)

describe('the generated table of region fieldEntry against state-machines.json', () => {
  it('holds the rows of the manuscript, in its order', () => {
    expect(FIELD_ENTRY).toBeDefined()
    expect(FIELD_ENTRY_VALUES_TRANSITIONS.map(idOf)).toEqual(TRANSITIONS.map((row) => row.id))
  })

  it.each(TRANSITIONS.map((row) => [row.id, row] as const))(
    '%s carries its source, event, guard, target and effect unchanged',
    (id, row) => {
      const printed = FIELD_ENTRY_VALUES_TRANSITIONS.find((one) => idOf(one) === id)
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

// WHY: R4.4 has every case of a cell stated; a guard on the kind of what was created leaves
// the other kind open, and the printed cell says what happens to it.
describe('the printed table of region fieldEntry states every case of a cell once', () => {
  const printed = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8')
  const printedRow = (event: string, firstTarget: string): string =>
    printed.split(/\r?\n/).find((line) => line.startsWith(`| \`fieldEntry/${event}\` | → ${firstTarget}`)) ?? ''

  it('prints the fall-through beside the root cell guarded on a created row', () => {
    const row = printedRow('creationLanded', '自己 [not `isCreatedTask`]')
    expect(row).toContain('それ以外 → —')
  })

  it('prints the fall-through in both naming cells guarded on a created task', () => {
    const row = printedRow('creationLanded', '`namingCreatedTask` [`isCreatedTask`]')
    expect(row.split('それ以外 → —')).toHaveLength(3)
  })

  it('prints no fall-through where a cell has no guard', () => {
    const row = printedRow('fieldFocusAsked', '`fieldFocusWanted`')
    expect(row).not.toBe('')
    expect(row).not.toContain('それ以外')
  })
})
