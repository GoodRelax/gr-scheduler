// Contract test: table T-250 SD-3 -- the fieldEntry manuscript (T-292) against advanceScreenSession.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NO_EFFECTS } from '../../src/use-case/advance-screen-session/session-step'

type Loose = Record<string, unknown>
type RawGuard = { readonly name?: string; readonly not?: boolean; readonly in?: string }
type RawBranch = {
  readonly to?: string
  readonly guard?: readonly RawGuard[]
  readonly effect?: string
  readonly effectArgument?: string
}
type RawCell = RawBranch | readonly RawBranch[]
type RawState = { readonly key: string; readonly initial: boolean }
type RawMachine = {
  readonly name: string
  readonly states: readonly RawState[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell>>>>
}
type RawEvent = { readonly key: string; readonly carries: readonly { readonly name: string }[] }
type RawRegion = {
  readonly region: string
  readonly events: readonly RawEvent[]
  readonly machines: readonly RawMachine[]
  readonly root: { readonly transitions: Readonly<Record<string, RawCell>> }
}

const REGIONS = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8')) as {
    readonly regions: readonly RawRegion[]
  }
).regions

function regionNamed(name: string): RawRegion {
  const region = REGIONS.find((r) => r.region === name)
  if (region === undefined) throw new Error(`state-machines.json has no region "${name}"`)
  return region
}

const ENTRY = regionNamed('fieldEntry')
const OTHER_REGIONS = REGIONS.map((r) => r.region).filter((name) => name !== ENTRY.region)

// see T-292
function fieldOf(machineName: string): string {
  return machineName.replace(/Machine$/, '')
}

function branchesOf(cell: RawCell | undefined): readonly RawBranch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly RawBranch[]) : [cell as RawBranch]
}

function regionsOf(session: ScreenSession): Loose {
  return session as unknown as Loose
}

function entryOf(session: ScreenSession): Loose {
  return regionsOf(session)['fieldEntry'] as Loose
}

function kindOf(value: unknown): string {
  return String((value as Loose)['kind'])
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function withEntry(fields: Loose): ScreenSession {
  return { ...regionsOf(emptyScreenSession), fieldEntry: { ...entryOf(emptyScreenSession), ...fields } } as unknown as ScreenSession
}

// see MK-13, FR-035, FR-091, HF-14, IN-5b
const FIELD_ROWS = ['PR-1', 'AT-53', 'PR-16', 'PR-21', 'U-27'] as const
const TASK_FIELD = 'PR-1'
const ROW_FIELD = 'AT-53'
const NAMED_UID = 5

const STATE_VALUES: Readonly<Record<string, Readonly<Record<string, readonly Loose[]>>>> = {
  createdTaskNamingStateMachine: { idle: [{}], namingCreatedTask: [{ createdTaskUid: NAMED_UID }] },
  fieldFocusWantStateMachine: { idle: [{}], fieldFocusWanted: FIELD_ROWS.map((fieldRow) => ({ fieldRow })) },
}

const EVENT_VARIANTS: Readonly<Record<string, readonly Loose[]>> = {
  fieldFocusAsked: FIELD_ROWS.map((fieldRow) => ({ fieldRow })),
  creationLanded: [
    { created: { kind: 'task', uid: NAMED_UID } },
    { created: { kind: 'task', uid: 9 } },
    { created: { kind: 'row', groupId: 'group1' } },
  ],
  fieldFocusLanded: [{}],
  fieldFocusWithdrawn: [{}],
  choiceMoved: [{}],
}

function describeCarried(value: Loose): string {
  const parts = Object.entries(value)
    .filter(([k]) => k !== 'kind' && k !== 'type')
    .map(([k, v]) => `${k}=${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
  return parts.length === 0 ? '' : `(${parts.join(', ')})`
}

function crossedSessions(): { name: string; session: ScreenSession }[] {
  let combos: { name: string; fields: Loose }[] = [{ name: '', fields: {} }]
  for (const m of ENTRY.machines) {
    const values = m.states.flatMap((s) =>
      (STATE_VALUES[m.name]?.[s.key] ?? []).map((carried) => ({ kind: s.key, ...carried })),
    )
    combos = combos.flatMap((c) =>
      values.map((v) => ({
        name: `${c.name}${c.name === '' ? '' : ' & '}${kindOf(v)}${describeCarried(v)}`,
        fields: { ...c.fields, [fieldOf(m.name)]: v },
      })),
    )
  }
  return combos.map((c) => ({ name: c.name, session: withEntry(c.fields) }))
}

function entryEvents(): Loose[] {
  return ENTRY.events.flatMap((ev) => {
    const variants = EVENT_VARIANTS[ev.key]
    if (variants === undefined) throw new Error(`no sample for fieldEntry/${ev.key}`)
    return variants.map((v) => ({ type: ev.key, ...v }))
  })
}

function guardHolds(guard: RawGuard, event: Loose): boolean {
  switch (guard.name) {
    case 'isCreatedTask':
      return (event['created'] as Loose | undefined)?.['kind'] === 'task'
    default:
      throw new Error(`guard ${String(guard.name)} is named by the manuscript but not by this file's oracle`)
  }
}

function pick(cell: RawCell | undefined, event: Loose): RawBranch | undefined {
  return branchesOf(cell).find((b) => (b.guard ?? []).every((g) => guardHolds(g, event) !== (g.not === true)))
}

// WHY: the T-292 notes say which carried value a cell writes; FR-091 names the created
// task, HF-14 the added row, so a creation asks for PR-1 or AT-53.
function expectedCarried(target: string, event: Loose): Loose {
  const created = event['created'] as Loose | undefined
  if (target === 'namingCreatedTask') return { createdTaskUid: created?.['uid'] }
  if (target !== 'fieldFocusWanted') return {}
  if (event['type'] === 'fieldFocusAsked') return { fieldRow: event['fieldRow'] }
  return { fieldRow: created?.['kind'] === 'task' ? TASK_FIELD : ROW_FIELD }
}

// see HF-17
function expectedEffect(branch: RawBranch, event: Loose): Loose {
  if (branch.effect === 'bringCreatedRowIntoSight') {
    return { type: 'bringCreatedRowIntoSight', groupId: (event['created'] as Loose)['groupId'] }
  }
  throw new Error(`effect ${String(branch.effect)} is named by the manuscript but not by this file's oracle`)
}

// see SD-3, SF-3, SS-5
function expectEntryStep(session: ScreenSession, event: Loose): void {
  const type = String(event['type'])
  const before = entryOf(session)
  const fired = ENTRY.machines.flatMap((m) => {
    const branch = pick(m.transitions[type]?.[kindOf(before[fieldOf(m.name)])], event)
    return branch === undefined ? [] : [{ machine: m, branch }]
  })
  const root = pick(ENTRY.root.transitions[type], event)
  const cells = [...fired.map((f) => f.branch), ...(root === undefined ? [] : [root])]
  const expectedEffects = cells.filter((b) => b.effect !== undefined).map((b) => expectedEffect(b, event))
  const changes = fired.filter((f) => {
    const now = before[fieldOf(f.machine.name)] as Loose
    if (kindOf(now) !== f.branch.to) return true
    return Object.entries(expectedCarried(String(f.branch.to), event)).some(([k, v]) => now[k] !== v)
  })

  const result = step(session, event)
  const after = entryOf(result.state)
  for (const other of OTHER_REGIONS) {
    expect(regionsOf(result.state)[other], `SS-5: leaves ${other} at the same reference`).toBe(regionsOf(session)[other])
  }
  if (changes.length === 0 && expectedEffects.length === 0) {
    expect(result.state, 'nothing changes: the same session reference').toBe(session)
    expect(result.effects, 'nothing changes: the shared NO_EFFECTS').toBe(NO_EFFECTS)
    return
  }

  for (const m of ENTRY.machines) {
    const field = fieldOf(m.name)
    const f = fired.find((x) => x.machine === m)
    if (f === undefined || !changes.includes(f)) {
      expect(after[field], `${m.name}: nothing written, so its value is kept`).toBe(before[field])
      continue
    }
    const value = after[field] as Loose
    expect(kindOf(value), `${m.name} lands on ${String(f.branch.to)}`).toBe(f.branch.to)
    for (const [k, v] of Object.entries(expectedCarried(String(f.branch.to), event))) {
      expect(value[k], `${m.name}.${k}`).toEqual(v)
    }
  }
  expect(result.effects.map((e) => e as unknown as Loose), 'effects').toEqual(expectedEffects)
}

describe('T-292 initial kinds: emptyScreenSession holds each fieldEntry machine in its initial state', () => {
  it.each(ENTRY.machines.map((m) => [m.name, m] as const))('%s', (_, m) => {
    expect(kindOf(entryOf(emptyScreenSession)[fieldOf(m.name)])).toBe(m.states.find((s) => s.initial)?.key)
  })
})

describe('SD-3 (T-292): every fieldEntry state (both machines crossed) x every fieldEntry event', () => {
  const cases = crossedSessions().flatMap((s) =>
    entryEvents().map((event) => [`${s.name} x ${String(event['type'])}${describeCarried(event)}`, s.session, event] as const),
  )
  it.each(cases)('%s', (_, session, event) => {
    expectEntryStep(session, event)
  })
})

describe('SS-5: every event of the other regions leaves the fieldEntry region at the same reference', () => {
  const question = { manner: 'NT-7', question: 'QN-5', items: [] }
  const sample: Record<string, unknown> = {
    surfaceName: 'U-56',
    target: 'surface',
    rung: 'textEntry',
    armKind: 'dependencyArmed',
    shapeKind: null,
    glyph: null,
    subject: { selection: { items: [], ordered: false }, groupIds: [] },
    date: '2026-01-05',
    percent: 100,
    end: 'max',
    language: 'en',
    taskUid: 1,
    rememberedActual: null,
    reason: 'RS-27',
    affectedCount: null,
    silentWatchers: 1,
    pressRow: 'PTD-5',
    pressedOn: null,
    axis: 'position',
    openRoute: 'chooser',
    writeForm: { kind: 'save' },
    openChoice: 'merge',
    question,
    mergeMapping: { kind: 'allSame' },
    isProceeding: false,
    owedAction: { kind: 'startNewDocument' },
    hasStartupTemplate: false,
    mergeCandidates: [],
    unreadColumns: [],
    droppedTaskNames: [],
    openedFileName: null,
  }
  const busy = withEntry({
    createdTaskNamingState: { kind: 'namingCreatedTask', createdTaskUid: NAMED_UID },
    fieldFocusWantState: { kind: 'fieldFocusWanted', fieldRow: TASK_FIELD },
  })
  const cases = OTHER_REGIONS.flatMap((name) =>
    regionNamed(name).events.map((ev) => {
      const event: Loose = { type: ev.key }
      for (const c of ev.carries) event[c.name] = c.name in sample ? sample[c.name] : true
      return [`${name}/${ev.key}`, event] as const
    }),
  )
  it.each(cases)('%s', (_, event) => {
    expect(entryOf(step(busy, event).state)).toBe(entryOf(busy))
  })
})
