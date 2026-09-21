// Contract test: table T-290 unsavedEditsStateMachine (figure F-036) against advanceScreenSession.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { emptyFileFlowValues } from '../../src/use-case/advance-screen-session/file-flow-values'
import { NO_EFFECTS } from '../../src/use-case/advance-screen-session/session-step'

type Loose = Record<string, unknown>
type RawGuard = { readonly name?: string; readonly not?: boolean; readonly in?: string }
type RawBranch = { readonly to?: string; readonly guard?: readonly RawGuard[]; readonly effect?: string }
type RawCell = RawBranch | readonly RawBranch[]
type RawState = { readonly key: string; readonly initial: boolean; readonly parent: string | null; readonly carries: readonly unknown[] }
type RawMachine = {
  readonly name: string
  readonly states: readonly RawState[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell>>>>
}
type RawEvent = { readonly key: string; readonly carries: readonly { readonly name: string }[] }
type RawRegion = { readonly region: string; readonly events: readonly RawEvent[]; readonly machines: readonly RawMachine[] }

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

const FLOW = regionNamed('fileFlow')
const OTHER_REGIONS = REGIONS.map((r) => r.region).filter((name) => name !== FLOW.region)
const UNSAVED = FLOW.machines.find((m) => m.name === 'unsavedEditsStateMachine')
if (UNSAVED === undefined) throw new Error('T-290 lost unsavedEditsStateMachine')
const MACHINE: RawMachine = UNSAVED

const UNSAVED_ONLY = ['documentEditLanded', 'newDocumentLanded', 'startupDocumentHeld'] as const
const SHARED = ['documentOpenLanded', 'documentFileSaved'] as const

function flowOf(session: ScreenSession): Loose {
  return (session as unknown as Loose)['fileFlow'] as Loose
}

function unsavedOf(session: ScreenSession): Loose {
  return flowOf(session)['unsavedEditsState'] as Loose
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function withFlow(fields: Loose): ScreenSession {
  return { ...(emptyScreenSession as unknown as Loose), fileFlow: { ...flowOf(emptyScreenSession), ...fields } } as unknown as ScreenSession
}

function question(row: string): Loose {
  return { manner: 'NT-7', question: row, items: [{ name: 'Task A', isShownOnAnotherRow: false }] }
}

const CANDIDATES = [{ currentUid: 1, currentName: 'Task A', incomingUid: 7, incomingName: 'Task A' }]

const OPERATIONS: readonly Loose[] = [
  { kind: 'idle' },
  { kind: 'readingDocumentFile', openRoute: 'reopen' },
  { kind: 'readingDocumentFile', openRoute: 'drop' },
  { kind: 'awaitingOpenChoice' },
  { kind: 'awaitingDiscardAnswer' },
  { kind: 'importingDocument' },
  { kind: 'awaitingMergeMapping', mergeCandidates: CANDIDATES, unreadColumns: ['Cost'] },
  { kind: 'writingDocumentFile' },
]

const CONFIRMATIONS: readonly Loose[] = [
  { kind: 'notAsked' },
  { kind: 'questionAsked', question: question('QN-5'), owedAction: null },
  { kind: 'questionAsked', question: question('QN-1'), owedAction: { kind: 'changeDocument', writes: [[{ kind: 'CM-35' }]], created: null } },
]

const ROOTS: readonly Loose[] = [
  { openedFileName: null, droppedTaskNames: [] },
  { openedFileName: 'plan.xml', droppedTaskNames: ['Task B'] },
]

const EVENT_VARIANTS: Readonly<Record<string, readonly Loose[]>> = {
  documentOpenAsked: ['chooser', 'drop', 'reopen'].map((openRoute) => ({ openRoute })),
  agentDocumentHanded: [{}],
  documentFileWriteAsked: [{ writeForm: { kind: 'save' } }, { writeForm: { kind: 'export', format: 'MF-1' } }],
  openChoiceAnswered: ['replace', 'merge', 'baseline'].map((openChoice) => ({ openChoice, question: question('QN-5') })),
  mergeMappingAnswered: [{ mergeMapping: { kind: 'allSame' } }, { mergeMapping: { kind: 'cancelImport' } }],
  confirmationAnswered: [{ isProceeding: true }, { isProceeding: false }],
  changeQuestionRaised: [{ question: question('QN-1'), owedAction: { kind: 'changeDocument', writes: [], created: null } }],
  newDocumentEntryPressed: [true, false].map((hasStartupTemplate) => ({ hasStartupTemplate, question: question('QN-5') })),
  flowSurfaceClosed: ['U-56', 'U-61', 'U-62'].map((surfaceName) => ({ surfaceName })),
  documentFileRead: [{ question: question('QN-5') }],
  documentOpenFailed: [{}],
  mergeMappingAsked: [{ mergeCandidates: CANDIDATES, unreadColumns: ['Notes'] }],
  documentOpenLanded: [
    { droppedTaskNames: [], openedFileName: 'next.xml', openChoice: 'replace' },
    { droppedTaskNames: ['Task C'], openedFileName: null, openChoice: 'replace' },
    { droppedTaskNames: [], openedFileName: null, openChoice: 'merge' },
    { droppedTaskNames: ['Task C'], openedFileName: 'next.xml', openChoice: 'baseline' },
  ],
  overwriteQuestionRaised: [{ question: question('QN-4') }],
  documentFileSaved: [{ openedFileName: 'saved.xml' }, { openedFileName: null }],
  documentFileWriteEnded: [{}],
  documentEditLanded: [{}],
  newDocumentLanded: [{}],
  startupDocumentHeld: [{}],
}

function flowEvents(): Loose[] {
  return FLOW.events.flatMap((ev) => {
    const variants = EVENT_VARIANTS[ev.key]
    if (variants === undefined) throw new Error(`no sample for fileFlow/${ev.key}`)
    return variants.map((v) => ({ type: ev.key, ...v }))
  })
}

function describeEvent(event: Loose): string {
  const parts = Object.entries(event)
    .filter(([k]) => k !== 'type')
    .map(([k, v]) => (k === 'question' ? String((v as Loose)['question']) : `${k}=${JSON.stringify(v)}`))
  return `${String(event['type'])}${parts.length === 0 ? '' : `(${parts.join(', ')})`}`
}

function guardHolds(guard: RawGuard, event: Loose): boolean {
  if (guard.name === 'isReplaceChoice') return event['openChoice'] === 'replace'
  throw new Error(`guard ${JSON.stringify(guard)} is named by the manuscript but not by this file's oracle`)
}

function expectedKind(from: string, event: Loose): string | undefined {
  const cell = MACHINE.transitions[String(event['type'])]?.[from]
  if (cell === undefined) return undefined
  const branches = Array.isArray(cell) ? (cell as readonly RawBranch[]) : [cell as RawBranch]
  return branches.find((b) => (b.guard ?? []).every((g) => guardHolds(g, event) !== (g.not === true)))?.to
}

function other(kind: string): string {
  return kind === 'nothingUnsaved' ? 'editsUnsaved' : 'nothingUnsaved'
}

type Context = { name: string; fields: Loose }

function contexts(): Context[] {
  const out: Context[] = []
  for (const op of OPERATIONS) {
    for (const cf of CONFIRMATIONS) {
      for (const [i, root] of ROOTS.entries()) {
        const opName = `${String(op['kind'])}${op['openRoute'] === undefined ? '' : `(${String(op['openRoute'])})`}`
        const cfName = `${String(cf['kind'])}${cf['question'] === undefined ? '' : `(${String((cf['question'] as Loose)['question'])})`}`
        out.push({ name: `${opName} & ${cfName} & root${i}`, fields: { ...root, fileOperationState: op, confirmationState: cf } })
      }
    }
  }
  return out
}

function cellCases(): (readonly [string, string, Loose, Loose])[] {
  return MACHINE.states.flatMap((s) =>
    contexts().flatMap((c) =>
      flowEvents().map((event) => [`${s.key} & ${c.name} x ${describeEvent(event)}`, s.key, c.fields, event] as const),
    ),
  )
}

describe('T-290 manuscript: unsavedEditsStateMachine holds the two states and five events the table names', () => {
  it('states nothingUnsaved (initial) and editsUnsaved, flat, carrying no values', () => {
    expect(MACHINE.states.map((s) => [s.key, s.initial, s.parent, s.carries.length])).toEqual([
      ['nothingUnsaved', true, null, 0],
      ['editsUnsaved', false, null, 0],
    ])
  })

  it('every cell of the table, the absent pairs included', () => {
    const table: Record<string, Record<string, string | undefined>> = {}
    for (const ev of FLOW.events) {
      table[ev.key] = Object.fromEntries(
        MACHINE.states.map((s) => [
          s.key,
          [...new Set(EVENT_VARIANTS[ev.key]?.map((v) => expectedKind(s.key, { type: ev.key, ...v }) ?? '—'))].join('|'),
        ]),
      )
    }
    expect(Object.keys(MACHINE.transitions).sort()).toEqual([...SHARED, ...UNSAVED_ONLY].sort())
    expect(table['documentEditLanded']).toEqual({ nothingUnsaved: 'editsUnsaved', editsUnsaved: '—' })
    expect(table['documentOpenLanded']).toEqual({
      nothingUnsaved: '—|editsUnsaved',
      editsUnsaved: 'nothingUnsaved|—',
    })
    for (const key of ['documentFileSaved', 'newDocumentLanded', 'startupDocumentHeld']) {
      expect(table[key], key).toEqual({ nothingUnsaved: '—', editsUnsaved: 'nothingUnsaved' })
    }
    for (const ev of FLOW.events.filter((e) => !(e.key in MACHINE.transitions))) {
      expect(table[ev.key], ev.key).toEqual({ nothingUnsaved: '—', editsUnsaved: '—' })
    }
    expect(FLOW.events.find((e) => e.key === 'documentOpenLanded')?.carries.map((c) => c.name)).toContain('openChoice')
  })
})

describe('T-290 initial state: the root\'s empty session holds nothingUnsaved', () => {
  it('emptyScreenSession.fileFlow.unsavedEditsState is nothingUnsaved and carries nothing else', () => {
    expect(unsavedOf(emptyScreenSession)).toEqual({ kind: MACHINE.states.find((s) => s.initial)?.key })
  })

  it('emptyFileFlowValues is the value the root session holds', () => {
    expect(emptyFileFlowValues.unsavedEditsState).toEqual({ kind: 'nothingUnsaved' })
    expect(flowOf(emptyScreenSession)['unsavedEditsState']).toEqual(emptyFileFlowValues.unsavedEditsState)
  })
})

describe('SD-3 (T-290): every unsavedEditsStateMachine state x every fileFlow event, crossed with the other two machines', () => {
  it.each(cellCases())('%s', (_, kind, fields, event) => {
    const before = { kind }
    const session = withFlow({ ...fields, unsavedEditsState: before })
    const after = unsavedOf(step(session, event).state)
    const want = expectedKind(kind, event)
    if (want === undefined) {
      expect(after, 'SF-3 / NFR-010: a — cell keeps the same reference').toBe(before)
      return
    }
    expect(after, 'the machine carries no values').toEqual({ kind: want })
  })
})

describe('OP-3: the choice is read from the landing, both ways of the guarded pair', () => {
  const landed = (openChoice: string): Loose => ({ type: 'documentOpenLanded', droppedTaskNames: [], openedFileName: null, openChoice })
  const importing = (kind: string): ScreenSession =>
    withFlow({ fileOperationState: { kind: 'importingDocument' }, unsavedEditsState: { kind } })

  it('どちらになるかを`GRS` が勝手に決めてはならない（MUST NOT）', () => {
    for (const openChoice of ['merge', 'baseline']) {
      expect(unsavedOf(step(importing('nothingUnsaved'), landed(openChoice)).state), openChoice).toEqual({ kind: 'editsUnsaved' })
      const edited = importing('editsUnsaved')
      expect(unsavedOf(step(edited, landed(openChoice)).state), openChoice).toBe(unsavedOf(edited))
    }
    const clean = importing('nothingUnsaved')
    expect(unsavedOf(step(clean, landed('replace')).state)).toBe(unsavedOf(clean))
    expect(unsavedOf(step(importing('editsUnsaved'), landed('replace')).state)).toEqual({ kind: 'nothingUnsaved' })
  })
})

describe('FR-100: the machine is what says whether unsaved edits exist', () => {
  const run = (events: readonly Loose[]): string[] => {
    let session = emptyScreenSession
    return events.map((event) => {
      session = step(session, event).state
      return String(unsavedOf(session)['kind'])
    })
  }

  it('`GRS` は、**離れる前に宿主の警告が出るようにすること（MUST）', () => {
    expect(
      run([
        { type: 'documentEditLanded' },
        { type: 'documentEditLanded' },
        { type: 'documentFileSaved', openedFileName: 'a.xml' },
        { type: 'documentEditLanded' },
        { type: 'newDocumentLanded' },
        { type: 'documentEditLanded' },
        { type: 'startupDocumentHeld' },
      ]),
    ).toEqual(['editsUnsaved', 'editsUnsaved', 'nothingUnsaved', 'editsUnsaved', 'nothingUnsaved', 'editsUnsaved', 'nothingUnsaved'])
  })

  it('未保存の編集が無いときに出させてはならない（MUST NOT）', () => {
    const quiet = flowEvents().filter((e) => e['type'] !== 'documentEditLanded' && !(e['type'] === 'documentOpenLanded' && e['openChoice'] !== 'replace'))
    for (const event of quiet) {
      expect(unsavedOf(step(emptyScreenSession, event).state), describeEvent(event)).toBe(unsavedOf(emptyScreenSession))
    }
  })
})

describe('orthogonality: unsavedEditsStateMachine and the other two fileFlow machines do not read each other', () => {
  const pairs = MACHINE.states.flatMap((s) =>
    contexts().flatMap((c) =>
      flowEvents().map((event) => [`${s.key} vs ${other(s.key)} & ${c.name} x ${describeEvent(event)}`, s.key, c.fields, event] as const),
    ),
  )

  it.each(pairs)('%s', (_, kind, fields, event) => {
    const one = step(withFlow({ ...fields, unsavedEditsState: { kind } }), event)
    const two = step(withFlow({ ...fields, unsavedEditsState: { kind: other(kind) } }), event)
    const pick = (s: ScreenSession): Loose => {
      const { unsavedEditsState: _drop, ...rest } = flowOf(s)
      return rest
    }
    expect(pick(one.state), 'root, fileOperationState and confirmationState ignore this machine').toEqual(pick(two.state))
    expect(one.effects, 'effects ignore this machine').toEqual(two.effects)
  })

  const ownCases = contexts().flatMap((c) =>
    MACHINE.states.flatMap((s) => UNSAVED_ONLY.map((type) => [`${s.key} & ${c.name} x ${type}`, s.key, c.fields, type] as const)),
  )

  it.each(ownCases)('%s: fileOperationState, confirmationState and root stay the same reference; no effect', (_, kind, fields, type) => {
    const session = withFlow({ ...fields, unsavedEditsState: { kind } })
    const result = step(session, { type })
    const before = flowOf(session)
    const after = flowOf(result.state)
    for (const key of ['fileOperationState', 'confirmationState', 'openedFileName', 'droppedTaskNames']) {
      expect(after[key], key).toBe(before[key])
    }
    expect(result.effects).toBe(NO_EFFECTS)
    if (expectedKind(kind, { type }) === undefined) expect(result.state, 'SF-3: the same session reference').toBe(session)
  })

  it('a — cell of this machine on a shared event with nothing else moving returns the same session and NO_EFFECTS', () => {
    const cases: [string, Loose][] = [
      ['nothingUnsaved', { type: 'documentOpenLanded', droppedTaskNames: [], openedFileName: null, openChoice: 'replace' }],
      ['editsUnsaved', { type: 'documentOpenLanded', droppedTaskNames: [], openedFileName: null, openChoice: 'merge' }],
      ['nothingUnsaved', { type: 'documentFileSaved', openedFileName: null }],
    ]
    for (const [kind, event] of cases) {
      const session = withFlow({ unsavedEditsState: { kind } })
      const result = step(session, event)
      expect(result.state, `${kind} x ${describeEvent(event)}`).toBe(session)
      expect(result.effects).toBe(NO_EFFECTS)
    }
  })
})

describe('SS-5: every event of the other regions leaves unsavedEditsState at the same reference', () => {
  const sample: Record<string, unknown> = {
    surfaceName: 'U-56',
    target: 'surface',
    rung: 'confirmation',
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
    fieldRow: 'PR-1',
    created: { kind: 'task', uid: 3 },
    pickedObjects: { items: [{ kind: 'task', uid: 1 }], ordered: true },
  }
  const cases = OTHER_REGIONS.flatMap((name) =>
    regionNamed(name).events.map((ev) => {
      const event: Loose = { type: ev.key }
      for (const c of ev.carries) event[c.name] = c.name in sample ? sample[c.name] : true
      return [`${name}/${ev.key}`, event] as const
    }),
  )
  it.each(cases)('%s', (_, event) => {
    const edited = withFlow({ unsavedEditsState: { kind: 'editsUnsaved' } })
    expect(unsavedOf(step(edited, event).state)).toBe(unsavedOf(edited))
  })
})
