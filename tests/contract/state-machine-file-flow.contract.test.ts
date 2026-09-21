// Contract test: table T-250 SD-3 -- the fileFlow manuscript (T-290) against advanceScreenSession.

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

const FLOW = regionNamed('fileFlow')
const OTHER_REGIONS = ['screen', 'notices', 'gesture'] as const

// see T-290
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

function flowOf(session: ScreenSession): Loose {
  return regionsOf(session)['fileFlow'] as Loose
}

function kindOf(value: unknown): string {
  return String((value as Loose)['kind'])
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function withFlow(fields: Loose): ScreenSession {
  return { ...regionsOf(emptyScreenSession), fileFlow: { ...flowOf(emptyScreenSession), ...fields } } as unknown as ScreenSession
}

// see QN-1, QN-4, QN-5, NT-7
function question(row: string): Loose {
  return { manner: 'NT-7', question: row, items: [{ name: 'Task A', isShownOnAnotherRow: false }] }
}

const CHANGE_WRITES: Loose = { kind: 'changeDocument', writes: [[{ kind: 'CM-35' }]], created: null }
const START_NEW: Loose = { kind: 'startNewDocument' }
const CANDIDATES = [{ currentUid: 1, currentName: 'Task A', incomingUid: 7, incomingName: 'Task A' }]

const FILE_OPERATION_VALUES: Readonly<Record<string, readonly Loose[]>> = {
  idle: [{}],
  readingDocumentFile: ['chooser', 'drop', 'reopen', 'handed'].map((openRoute) => ({ openRoute })),
  awaitingOpenChoice: [{}],
  awaitingDiscardAnswer: [{}],
  importingDocument: [{}],
  awaitingMergeMapping: [{ mergeCandidates: CANDIDATES, unreadColumns: ['Cost'] }],
  writingDocumentFile: [{}],
}

const CONFIRMATION_VALUES: Readonly<Record<string, readonly Loose[]>> = {
  notAsked: [{}],
  questionAsked: [
    { question: question('QN-1'), owedAction: CHANGE_WRITES },
    { question: question('QN-5'), owedAction: START_NEW },
    { question: question('QN-5'), owedAction: null },
    { question: question('QN-4'), owedAction: null },
  ],
}

const ROOT_VALUES: readonly Loose[] = [
  { openedFileName: null, droppedTaskNames: [] },
  { openedFileName: 'plan.xml', droppedTaskNames: ['Task B', null] },
]

function machine(name: string): RawMachine {
  const found = FLOW.machines.find((m) => m.name === name)
  if (found === undefined) throw new Error(`T-290 lost ${name}`)
  return found
}

const OPERATION = machine('fileOperationStateMachine')
const CONFIRMATION = machine('confirmationStateMachine')

function describeValue(value: Loose): string {
  const q = value['question'] as Loose | undefined
  const owed = value['owedAction'] as Loose | null | undefined
  const parts = Object.entries(value)
    .filter(([k]) => k !== 'kind' && k !== 'question' && k !== 'owedAction' && k !== 'mergeCandidates' && k !== 'unreadColumns')
    .map(([k, v]) => `${k}=${String(v)}`)
  if (q !== undefined) parts.push(String(q['question']))
  if (owed !== undefined) parts.push(`owed=${owed === null ? 'null' : String(owed['kind'])}`)
  return parts.length === 0 ? '' : `(${parts.join(', ')})`
}

function crossedSessions(): { name: string; session: ScreenSession }[] {
  const out: { name: string; session: ScreenSession }[] = []
  for (const op of OPERATION.states) {
    for (const opCarried of FILE_OPERATION_VALUES[op.key] ?? []) {
      for (const cf of CONFIRMATION.states) {
        for (const cfCarried of CONFIRMATION_VALUES[cf.key] ?? []) {
          for (const [i, root] of ROOT_VALUES.entries()) {
            const opValue = { kind: op.key, ...opCarried }
            const cfValue = { kind: cf.key, ...cfCarried }
            out.push({
              name: `${op.key}${describeValue(opValue)} & ${cf.key}${describeValue(cfValue)} & root${i}`,
              session: withFlow({ ...root, fileOperationState: opValue, confirmationState: cfValue }),
            })
          }
        }
      }
    }
  }
  return out
}

const EVENT_VARIANTS: Readonly<Record<string, readonly Loose[]>> = {
  documentOpenAsked: ['chooser', 'drop', 'reopen'].map((openRoute) => ({ openRoute })),
  agentDocumentHanded: [{}],
  documentFileWriteAsked: [{ writeForm: { kind: 'save' } }, { writeForm: { kind: 'export', format: 'MF-1' } }],
  openChoiceAnswered: ['replace', 'merge', 'baseline'].map((openChoice) => ({ openChoice, question: question('QN-5') })),
  mergeMappingAnswered: [{ mergeMapping: { kind: 'allSame' } }, { mergeMapping: { kind: 'cancelImport' } }],
  confirmationAnswered: [{ isProceeding: true }, { isProceeding: false }],
  changeQuestionRaised: [{ question: question('QN-1'), owedAction: CHANGE_WRITES }],
  newDocumentEntryPressed: [true, false].map((hasStartupTemplate) => ({ hasStartupTemplate, question: question('QN-5') })),
  flowSurfaceClosed: ['U-56', 'U-61', 'U-62', 'U-30'].map((surfaceName) => ({ surfaceName })),
  documentFileRead: [{ question: question('QN-5') }],
  documentOpenFailed: [{}],
  mergeMappingAsked: [{ mergeCandidates: CANDIDATES, unreadColumns: ['Notes'] }],
  documentOpenLanded: [
    { droppedTaskNames: ['Task C', null], openedFileName: 'next.xml' },
    { droppedTaskNames: ['Task C'], openedFileName: null },
    { droppedTaskNames: [], openedFileName: 'next.xml' },
    { droppedTaskNames: [], openedFileName: null },
  ],
  overwriteQuestionRaised: [{ question: question('QN-4') }],
  documentFileSaved: [{ openedFileName: 'saved.xml' }, { openedFileName: null }],
  documentFileWriteEnded: [{}],
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
    .map(([k, v]) => {
      if (k === 'question') return String((v as Loose)['question'])
      if (typeof v === 'object' && v !== null) return `${k}=${JSON.stringify(v)}`
      return `${k}=${String(v)}`
    })
  return `${String(event['type'])}${parts.length === 0 ? '' : `(${parts.join(', ')})`}`
}

// see OP-4, DI-4, QN-4, MM-4, MG-6, U-56, U-61, U-62, RS-50, FR-095, OP-13
function guardHolds(guard: RawGuard, flow: Loose, event: Loose): boolean {
  if (guard.in !== undefined) {
    const [machineName, state] = guard.in.split('.')
    return kindOf(flow[fieldOf(machineName ?? '')]) === state
  }
  const operation = flow['fileOperationState'] as Loose
  const confirmation = flow['confirmationState'] as Loose
  switch (guard.name) {
    case 'isReopenRoute':
      return operation['openRoute'] === 'reopen'
    case 'isReplaceChoice':
      return event['openChoice'] === 'replace'
    case 'isProceeding':
      return event['isProceeding'] === true
    case 'hasStartupTemplate':
      return event['hasStartupTemplate'] === true
    case 'isOverwriteQuestion':
      return (confirmation['question'] as Loose | undefined)?.['question'] === 'QN-4'
    // WHY: the questions the file machine raises itself (OP-4, DI-4) owe no write; a change
    // question (FR-032, FR-099) or the new-document one (FR-095) owes the action it carries.
    case 'isFileOperationQuestion':
      return confirmation['owedAction'] === null
    case 'isImportCancelled':
      return (event['mergeMapping'] as Loose)['kind'] === 'cancelImport'
    case 'isOpenChooserSurface':
      return event['surfaceName'] === 'U-56'
    case 'isDifferenceReviewSurface':
      return event['surfaceName'] === 'U-61'
    case 'isImportReportSurface':
      return event['surfaceName'] === 'U-62'
    case 'hasDroppedTasks':
      return (event['droppedTaskNames'] as readonly unknown[]).length > 0
    default:
      throw new Error(`guard ${String(guard.name)} is named by the manuscript but not by this file's oracle`)
  }
}

function pick(cell: RawCell | undefined, flow: Loose, event: Loose): RawBranch | undefined {
  return branchesOf(cell).find((b) => (b.guard ?? []).every((g) => guardHolds(g, flow, event) !== (g.not === true)))
}

type Fired = { machine: RawMachine; branch: RawBranch }

function firing(flow: Loose, event: Loose): { machines: Fired[]; root: RawBranch | undefined } {
  const type = String(event['type'])
  const machines: Fired[] = []
  for (const m of FLOW.machines) {
    const branch = pick(m.transitions[type]?.[kindOf(flow[fieldOf(m.name)])], flow, event)
    if (branch !== undefined) machines.push({ machine: m, branch })
  }
  return { machines, root: pick(FLOW.root.transitions[type], flow, event) }
}

// see T-290, OP-3, FR-022, NT-7
function expectedEffect(branch: RawBranch, flow: Loose, event: Loose): Loose {
  const confirmation = flow['confirmationState'] as Loose
  switch (branch.effect) {
    case 'raiseFlowSurface':
      return { type: 'raiseFlowSurface', surfaceName: branch.effectArgument }
    case 'raiseNotice':
      return { type: 'raiseNotice', reason: branch.effectArgument }
    case 'readDocumentFile':
      return { type: 'readDocumentFile', openRoute: event['type'] === 'agentDocumentHanded' ? 'handed' : event['openRoute'] }
    case 'writeDocumentFile':
      return { type: 'writeDocumentFile', writeForm: event['writeForm'] }
    case 'importIncomingDocument':
      if (event['type'] === 'mergeMappingAnswered') {
        return { type: 'importIncomingDocument', answer: { kind: 'mergeMapping', mergeMapping: event['mergeMapping'] } }
      }
      if (event['type'] === 'openChoiceAnswered') {
        return { type: 'importIncomingDocument', answer: { kind: 'openChoice', openChoice: event['openChoice'] } }
      }
      return { type: 'importIncomingDocument', answer: { kind: 'openChoice', openChoice: 'replace' } }
    case 'discardIncomingDocument':
      return { type: 'discardIncomingDocument' }
    case 'answerOverwriteQuestion':
      return { type: 'answerOverwriteQuestion', isProceeding: event['isProceeding'] }
    case 'carryOutOwedAction':
      return { type: 'carryOutOwedAction', owedAction: confirmation['owedAction'] }
    default:
      throw new Error(`effect ${String(branch.effect)} is named by the manuscript but not by this file's oracle`)
  }
}

// WHY: a refusal (RS-27) leaves the operation as it was, so a self cell of the operation
// machine keeps its carried values; only entering a state takes them from the event.
function expectedCarried(target: string, before: Loose, event: Loose): Loose {
  const type = event['type']
  if (target === kindOf(before) && target !== 'questionAsked') {
    return Object.fromEntries(Object.entries(before).filter(([k]) => k !== 'kind'))
  }
  if (target === 'readingDocumentFile') return { openRoute: type === 'agentDocumentHanded' ? 'handed' : event['openRoute'] }
  if (target === 'awaitingMergeMapping') return { mergeCandidates: event['mergeCandidates'], unreadColumns: event['unreadColumns'] }
  if (target !== 'questionAsked') return {}
  if (type === 'changeQuestionRaised') return { question: event['question'], owedAction: event['owedAction'] }
  if (type === 'newDocumentEntryPressed' && kindOf(before) === 'notAsked') {
    return { question: event['question'], owedAction: START_NEW }
  }
  if (type === 'newDocumentEntryPressed') return { question: before['question'], owedAction: before['owedAction'] }
  return { question: event['question'], owedAction: null }
}

function expectedRoot(root: RawBranch | undefined, flow: Loose, event: Loose): Loose {
  const kept = { openedFileName: flow['openedFileName'], droppedTaskNames: flow['droppedTaskNames'] }
  if (root === undefined) return kept
  const carriedName = event['openedFileName']
  const name = typeof carriedName === 'string' ? carriedName : kept.openedFileName
  switch (event['type']) {
    case 'documentFileSaved':
      return { ...kept, openedFileName: name }
    case 'documentOpenLanded':
      return root.effect === 'raiseFlowSurface'
        ? { openedFileName: name, droppedTaskNames: event['droppedTaskNames'] }
        : { ...kept, openedFileName: name }
    case 'flowSurfaceClosed':
      return { ...kept, droppedTaskNames: [] }
    default:
      throw new Error(`root cell for ${String(event['type'])} has no oracle`)
  }
}

// see SD-3, SF-3, SS-5
function expectFlowStep(session: ScreenSession, event: Loose): void {
  const before = flowOf(session)
  const { machines, root } = firing(before, event)
  const result = step(session, event)
  const after = flowOf(result.state)

  for (const other of OTHER_REGIONS) {
    expect(regionsOf(result.state)[other], `SS-5: leaves ${other} at the same reference`).toBe(regionsOf(session)[other])
  }
  const rootAfter = expectedRoot(root, before, event)
  const rootChanges =
    rootAfter['openedFileName'] !== before['openedFileName'] ||
    JSON.stringify(rootAfter['droppedTaskNames']) !== JSON.stringify(before['droppedTaskNames'])
  const effectful = machines.some((f) => f.branch.effect !== undefined) || root?.effect !== undefined
  const moves = machines.some((f) => f.branch.to !== kindOf(before[fieldOf(f.machine.name)]) || f.branch.to === undefined)
  const carriesNew = machines.some((f) => {
    const now = before[fieldOf(f.machine.name)] as Loose
    const want = expectedCarried(String(f.branch.to), now, event)
    return Object.entries(want).some(([k, v]) => now[k] !== v)
  })
  if (!rootChanges && !effectful && !moves && !carriesNew) {
    expect(result.state, 'nothing changes: the same session reference').toBe(session)
    expect(result.effects, 'nothing changes: the shared NO_EFFECTS').toBe(NO_EFFECTS)
    return
  }

  for (const m of FLOW.machines) {
    const field = fieldOf(m.name)
    const f = machines.find((x) => x.machine === m)
    if (f === undefined) {
      expect(after[field], `no cell for ${m.name}: its value is kept`).toBe(before[field])
      continue
    }
    const value = after[field] as Loose
    expect(kindOf(value), `${m.name} lands on ${String(f.branch.to)}`).toBe(f.branch.to)
    for (const [k, v] of Object.entries(expectedCarried(String(f.branch.to), before[field] as Loose, event))) {
      expect(value[k], `${m.name}.${k}`).toEqual(v)
    }
  }

  expect(after['openedFileName'], 'openedFileName').toEqual(rootAfter['openedFileName'])
  expect(after['droppedTaskNames'], 'droppedTaskNames').toEqual(rootAfter['droppedTaskNames'])

  const cells = [...machines.map((f) => f.branch), ...(root === undefined ? [] : [root])]
  const expected = cells.filter((b) => b.effect !== undefined).map((b) => expectedEffect(b, before, event))
  const byType = (a: Loose, b: Loose): number => String(a['type']).localeCompare(String(b['type']))
  expect([...result.effects].map((e) => e as unknown as Loose).sort(byType), 'effects').toEqual(expected.sort(byType))
}

describe('T-290 initial kinds: emptyScreenSession holds each fileFlow machine in its initial state', () => {
  it.each(FLOW.machines.map((m) => [m.name, m] as const))('%s', (_, m) => {
    expect(kindOf(flowOf(emptyScreenSession)[fieldOf(m.name)])).toBe(m.states.find((s) => s.initial)?.key)
  })

  it('the root starts with no opened file name and no dropped task names', () => {
    expect(flowOf(emptyScreenSession)['openedFileName']).toBeNull()
    expect(flowOf(emptyScreenSession)['droppedTaskNames']).toEqual([])
  })
})

describe('SD-3 (T-290): every fileFlow state (both machines crossed, root values varied) x every fileFlow event', () => {
  const cases = crossedSessions().flatMap((s) =>
    flowEvents().map((event) => [`${s.name} x ${describeEvent(event)}`, s.session, event] as const),
  )
  it.each(cases)('%s', (_, session, event) => {
    expectFlowStep(session, event)
  })
})

describe('SS-5: screen, notices and gesture events leave the fileFlow region at the same reference', () => {
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
  }
  const busy = withFlow({
    openedFileName: 'plan.xml',
    droppedTaskNames: ['Task B'],
    fileOperationState: { kind: 'awaitingOpenChoice' },
    confirmationState: { kind: 'questionAsked', question: question('QN-5'), owedAction: null },
  })
  const cases = OTHER_REGIONS.flatMap((name) =>
    regionNamed(name).events.map((ev) => {
      const event: Loose = { type: ev.key }
      for (const c of ev.carries) event[c.name] = c.name in sample ? sample[c.name] : true
      return [`${name}/${ev.key}`, event] as const
    }),
  )
  it.each(cases)('%s', (_, event) => {
    expect(flowOf(step(busy, event).state)).toBe(flowOf(busy))
  })
})
