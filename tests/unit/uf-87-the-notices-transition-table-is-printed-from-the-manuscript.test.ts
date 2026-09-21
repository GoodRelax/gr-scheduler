// UF-87: tools/generate_state_machine_types.py prints the transition table of the manuscript, row by row.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { NOTICE_VALUES_TRANSITIONS } from '../../src/use-case/advance-screen-session/notice-values'

interface GuardTerm {
  readonly name: string
  readonly not?: true
}

interface ManuscriptTransition {
  readonly id: string
  readonly from: readonly (readonly string[])[]
  readonly event: string
  readonly guard: readonly GuardTerm[] | null
  readonly to: readonly string[] | 'self'
  readonly effect: { readonly name: string; readonly row?: string } | null
}

interface Manuscript {
  readonly regions: readonly {
    readonly region: string
    readonly transitions: readonly ManuscriptTransition[]
  }[]
}

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as Manuscript

const NOTICES = MANUSCRIPT.regions.find((one) => one.region === 'notices')

function guardText(guard: readonly GuardTerm[] | null): string | null {
  if (guard === null) return null
  return guard.map((term) => (term.not === true ? `not ${term.name}` : term.name)).join(' & ')
}

describe('the generated table of region notices against state-machines.json', () => {
  it('holds the rows of the manuscript, in its order', () => {
    expect(NOTICES).toBeDefined()
    expect(NOTICE_VALUES_TRANSITIONS.map((row) => row.id)).toEqual(
      (NOTICES?.transitions ?? []).map((row) => row.id),
    )
  })

  it.each((NOTICES?.transitions ?? []).map((row) => [row.id, row] as const))(
    '%s carries its source, event, guard, target and effect unchanged',
    (id, row) => {
      const printed = NOTICE_VALUES_TRANSITIONS.find((one) => one.id === id)
      expect(printed).toEqual({
        id,
        from: row.from,
        event: row.event,
        guard: guardText(row.guard),
        to: row.to,
        effect: row.effect?.name ?? null,
        effectArgument: row.effect?.row ?? null,
      })
    },
  )
})
