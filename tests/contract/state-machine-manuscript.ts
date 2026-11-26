// Reads docs/spec/_source/state-machines.json (stateMachines[], NDD appendix A.6) as the region view of state_machine_source.py, test side.
import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

type Json = Record<string, any>

const INITIAL = 'initial'
const BRANCH_KEYS: readonly (readonly [string, string])[] = [
  ['to', 'target'],
  ['guard', 'guard'],
  ['effect', 'effect'],
  ['effectArgument', 'xEffectArgument'],
  ['evidence', 'xEvidence'],
  ['note', 'xNote'],
]

const parentOf = (key: string): string | null => {
  const at = key.lastIndexOf('.')
  return at < 0 ? null : key.slice(0, at)
}

function viewMachine(machine: Json): Json {
  const transitions = machine['transitions'] as readonly Json[]
  const initials = new Set(transitions.filter((t) => t['source'] === INITIAL).map((t) => t['target'] as string))
  const states = (machine['states'] as readonly string[]).map((key) => ({
    key,
    parent: parentOf(key),
    initial: initials.has(key),
    ...(machine['xStates'] as Json)[key],
  }))
  const table: Record<string, Record<string, Json[]>> = {}
  for (const one of transitions) {
    if (one['source'] === INITIAL) continue
    const row = (table[one['trigger'] as string] ??= {})
    const branch: Json = {}
    for (const [viewKey, sourceKey] of BRANCH_KEYS) if (sourceKey in one) branch[viewKey] = one[sourceKey]
    ;(row[one['source'] as string] ??= []).push(branch)
  }
  const cells: Record<string, Record<string, Json | Json[]>> = {}
  for (const [event, row] of Object.entries(table)) {
    cells[event] = Object.fromEntries(Object.entries(row).map(([source, b]) => [source, b.length === 1 ? (b[0] as Json) : b]))
  }
  return { name: machine['name'], states, transitions: cells, unhandled: machine['unhandled'] ?? [] }
}

// Why: the tests assert the content of the tables, not the layout of the file; one view keeps them on what the generators read.
export function readStateMachineView(): Json {
  const doc = JSON.parse(
    readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
  ) as Json
  const machines = doc['stateMachines'] as readonly Json[]
  return {
    $comment: doc['$comment'],
    ...(doc['xPriorities'] === undefined ? {} : { priorities: doc['xPriorities'] }),
    guardLanguage: doc['xGuardLanguage'],
    regions: (doc['xRegions'] as readonly Json[]).map((region) => ({
      ...region,
      machines: machines.filter((m) => m['xRegion'] === region['region']).map(viewMachine),
    })),
  }
}
