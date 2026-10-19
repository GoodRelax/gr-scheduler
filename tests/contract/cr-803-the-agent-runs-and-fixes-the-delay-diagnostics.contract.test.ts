import { describe, expect, it, vi } from 'vitest'

import {
  agentApiMembers,
  type AgentApiWiring,
  type AgentWriteOutcome,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { ONE_PARENT } from './cr-731-documents'
import { TEMPLATE } from './cr-731-stage'

type Loose = Record<string, unknown>

interface State {
  document: Document
  history: EditHistory<ChangeStep>
}

interface Busy {
  isGestureInFlight?: boolean
  isEditingInPlace?: boolean
  isQuestionAsked?: boolean
}

interface Seams {
  runDelayDiagnostics?: () => void
  closeWindow?: (which: 'delayDiagnosticsReport' | 'propertiesPanel') => void
  landDelayFixes?: (rows: readonly unknown[], before: Document, after: Document) => void
}

interface WideApi {
  readDocument(includeCarry: boolean, taskUids: readonly number[], parts: readonly string[]): Document
  readDelayDiagnostics(parts: readonly string[], limit: number): Loose
  issueDelayFixes(expectedStamp: unknown, fixKeys: unknown): AgentWriteOutcome
  runDelayDiagnostics(): AgentWriteOutcome
  closeWindow(which: unknown): AgentWriteOutcome
  readStamp(): unknown
  undoEdit(expectedStamp: unknown): AgentWriteOutcome
  applyCommands(request: unknown): AgentWriteOutcome
}

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const CHANGE_WATCHERS = emptyChangeWatchers()
const WRITER = 'cr-803 agent'

const stateOf = (document: Document): State => ({ document, history: { done: [], undone: [] } })

function wiringFor(state: State, busy: Busy = {}, seams: Seams = {}): AgentApiWiring {
  const readSnapshot = (): AgentSnapshot => ({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
    document: state.document,
    documentAsWritten: state.document,
    selection: emptySelection(),
    frame: null,
    exportScene: null,
    isGestureInFlight: busy.isGestureInFlight ?? false,
    isEditingInPlace: busy.isEditingInPlace ?? false,
    isQuestionAsked: busy.isQuestionAsked ?? false,
    isDeliveringNotices: false,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: '2026-10-19T08:30:00Z',
    localReadAt: '2026-10-19T09:00:00',
  })
  const { landDelayFixes, ...windowSeams } = seams
  return {
    changeWatchers: CHANGE_WATCHERS,
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: {
      deliver: (document, hasUpdatedSchedule) => notifyChangeWatchers(CHANGE_WATCHERS, { document, hasUpdatedSchedule }),
    },
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    ...(landDelayFixes === undefined ? {} : { delayFixLog: { readDelayFixLog: () => [], landDelayFixes } }),
    ...windowSeams,
    writerName: WRITER,
    schemaVersion: String(TEMPLATE['schemaVersion']),
  } as AgentApiWiring
}

const apiOf = (state: State, busy: Busy = {}, seams: Seams = {}): WideApi =>
  agentApiMembers(wiringFor(state, busy, seams)) as unknown as WideApi

const refusalOf = (outcome: AgentWriteOutcome): Loose => {
  expect(outcome.ok, 'premise: the call was refused').toBe(false)
  return (outcome as unknown as Loose)['refusal'] as Loose
}

const taskOf = (document: Document, uid: number): Loose =>
  (document.schedule.tasks as unknown as readonly Loose[]).find((one) => one['uid'] === uid) ?? {}

const GROUP_ID = 'task-group-cr-803'

const twoTasksCreated = [
  { kind: 'createTask', shapeKind: 'rectangle', start: '2027-05-03T00:00:00', finish: '2027-05-05T00:00:00', taskGroupId: GROUP_ID },
  { kind: 'createTask', shapeKind: 'rectangle', start: '2027-05-06T00:00:00', finish: '2027-05-07T00:00:00', taskGroupId: GROUP_ID },
]

const TASK_UID = 1
const OLD_FINISH_DAY = '2027-05-21'
const NEW_FINISH_DAY = '2027-05-26'

describe('AM-31 runDelayDiagnostics -- the screen runs the diagnostics; the document and the stamp stay', () => {
  it('calls the seam once and answers ok with the unchanged stamp, no schedule change and no created uids', () => {
    const state = stateOf(ONE_PARENT())
    const run = vi.fn()
    const api = apiOf(state, {}, { runDelayDiagnostics: run })
    const stamp = structuredClone(api.readStamp())
    const held = state.document

    const outcome = api.runDelayDiagnostics()

    expect(run).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({ ok: true, stamp, hasUpdatedSchedule: false, createdUids: [] })
    expect(state.document).toBe(held)
    expect(state.history.done).toHaveLength(0)
  })

  it('is refused notAvailable when the wiring carries no seam', () => {
    const state = stateOf(ONE_PARENT())

    const refusal = refusalOf(apiOf(state).runDelayDiagnostics())

    expect(refusal['reason']).toBe('notAvailable')
  })

  it.each([
    ['gestureInFlight', { isGestureInFlight: true }],
    ['editingInPlace', { isEditingInPlace: true }],
    ['questionAsked', { isQuestionAsked: true }],
  ] as const)('is refused %s while the person is busy, and the seam is not called', (reason, busy) => {
    const state = stateOf(ONE_PARENT())
    const run = vi.fn()

    const refusal = refusalOf(apiOf(state, busy, { runDelayDiagnostics: run }).runDelayDiagnostics())

    expect(refusal['reason']).toBe(reason)
    expect(run).not.toHaveBeenCalled()
  })
})

describe('AM-33 closeWindow -- closes the report window or the properties panel and writes nothing', () => {
  it.each(['delayDiagnosticsReport', 'propertiesPanel'] as const)('passes which = %s to the seam and answers ok', (which) => {
    const state = stateOf(ONE_PARENT())
    const close = vi.fn()
    const api = apiOf(state, {}, { closeWindow: close })
    const stamp = structuredClone(api.readStamp())
    const held = state.document

    const outcome = api.closeWindow(which)

    expect(close).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledWith(which)
    expect(outcome).toEqual({ ok: true, stamp, hasUpdatedSchedule: false, createdUids: [] })
    expect(state.document).toBe(held)
  })

  it.each([['somethingElse'], [''], [null], [3]])('a bad which (%j) is malformedRequest and the seam is not called', (which) => {
    const state = stateOf(ONE_PARENT())
    const close = vi.fn()

    const refusal = refusalOf(apiOf(state, {}, { closeWindow: close }).closeWindow(which))

    expect(refusal['reason']).toBe('malformedRequest')
    expect(close).not.toHaveBeenCalled()
  })

  it('is refused notAvailable when the wiring carries no seam', () => {
    const refusal = refusalOf(apiOf(stateOf(ONE_PARENT())).closeWindow('delayDiagnosticsReport'))

    expect(refusal['reason']).toBe('notAvailable')
  })
})

describe('AM-32 issueDelayFixes -- the proposals land as one bundle, one undo step', () => {
  it('premise: the bench document lists a fix proposal', () => {
    const proposals = apiOf(stateOf(ONE_PARENT())).readDelayDiagnostics([], 0)['fixProposals'] as readonly Loose[]

    expect(proposals.length).toBeGreaterThan(0)
  })

  it('issuing [] writes the recommended rows in one write: ok, a new stamp, the document changed, the log seam fed', () => {
    const state = stateOf(ONE_PARENT())
    const land = vi.fn()
    const api = apiOf(state, {}, { landDelayFixes: land })
    const before = structuredClone(api.readStamp())
    expect(taskOf(state.document, TASK_UID)['finish']).toContain(OLD_FINISH_DAY)

    const outcome = api.issueDelayFixes(before, [])

    expect(outcome.ok).toBe(true)
    expect(taskOf(state.document, TASK_UID)['finish']).toContain(NEW_FINISH_DAY)
    expect(state.history.done).toHaveLength(1)
    expect(api.readStamp()).not.toEqual(before)
    if (outcome.ok) expect(outcome.stamp).toEqual(api.readStamp())
    expect(land).toHaveBeenCalledTimes(1)
    expect((land.mock.calls[0]?.[0] as readonly Loose[]).length).toBeGreaterThan(0)
  })

  it('naming a key from fixProposals issues that row', () => {
    const state = stateOf(ONE_PARENT())
    const api = apiOf(state)
    const proposals = api.readDelayDiagnostics(['fixProposals'], 0)['fixProposals'] as readonly Loose[]
    const key = String(proposals[0]?.['key'])

    const outcome = api.issueDelayFixes(api.readStamp(), [key])

    expect(outcome.ok).toBe(true)
    expect(taskOf(state.document, TASK_UID)['finish']).toContain(NEW_FINISH_DAY)
  })

  it('undoEdit with the new stamp takes the whole bundle back in one step', () => {
    const state = stateOf(ONE_PARENT())
    const api = apiOf(state)
    const original = state.document
    const before = structuredClone(api.readStamp())
    expect(api.issueDelayFixes(before, []).ok).toBe(true)

    const undone = api.undoEdit(api.readStamp())

    expect(undone.ok).toBe(true)
    expect(taskOf(state.document, TASK_UID)['finish']).toContain(OLD_FINISH_DAY)
    expect(api.readStamp()).toEqual(before)
    expect(state.history.done).toHaveLength(0)
    expect(JSON.stringify(state.document.schedule.tasks)).toBe(JSON.stringify(original.schedule.tasks))
  })

  it('an unknown key is malformedRequest naming it, and nothing changes', () => {
    const state = stateOf(ONE_PARENT())
    const land = vi.fn()
    const api = apiOf(state, {}, { landDelayFixes: land })
    const held = state.document

    const refusal = refusalOf(api.issueDelayFixes(api.readStamp(), ['no-such-key-803']))

    expect(refusal['reason']).toBe('malformedRequest')
    expect(String(refusal['message'])).toContain('no-such-key-803')
    expect(state.document).toBe(held)
    expect(land).not.toHaveBeenCalled()
  })

  it.each([['FA-11'], [[1, 2]], [null], [{ 0: 'a' }], [[['a']]]])('fixKeys %j is not a string list: malformedRequest', (fixKeys) => {
    const state = stateOf(ONE_PARENT())
    const api = apiOf(state)
    const held = state.document

    const refusal = refusalOf(api.issueDelayFixes(api.readStamp(), fixKeys))

    expect(refusal['reason']).toBe('malformedRequest')
    expect(state.document).toBe(held)
  })

  it('a stale expectedStamp is staleStamp and the document is not changed', () => {
    const state = stateOf(ONE_PARENT())
    const api = apiOf(state)
    const stale = { ...(api.readStamp() as Loose), lastEditedBy: 'somebody else, earlier' }
    const held = state.document

    const refusal = refusalOf(api.issueDelayFixes(stale, []))

    expect(refusal['reason']).toBe('staleStamp')
    expect(state.document).toBe(held)
  })

  it('with nothing to fix it is commandRefused and the document is not changed', () => {
    const state = stateOf(ONE_PARENT())
    const api = apiOf(state)
    expect(api.issueDelayFixes(api.readStamp(), []).ok, 'premise: the first issue lands').toBe(true)
    const held = state.document

    const refusal = refusalOf(api.issueDelayFixes(api.readStamp(), []))

    expect(refusal['reason']).toBe('commandRefused')
    expect(state.document).toBe(held)
  })
})

describe('AM-3 readDocument parts -- the caller names what it reads', () => {
  it("parts ['tasks'] keeps tasks, project, the stamp and the schema version and drops the other groups", () => {
    const state = stateOf(ONE_PARENT())

    const document = apiOf(state).readDocument(false, [], ['tasks']) as unknown as Loose
    const schedule = document['schedule'] as Loose

    expect(Object.keys(schedule)).toEqual(expect.arrayContaining(['tasks', 'project']))
    expect(schedule['calendars']).toBeUndefined()
    expect(schedule['resources']).toBeUndefined()
    expect(document['documentSettings']).toBeUndefined()
    expect(document['documentStamp']).toEqual(state.document.documentStamp)
    expect(document['schemaVersion']).toBe(TEMPLATE['schemaVersion'])
    expect((schedule['tasks'] as readonly unknown[]).length).toBe(state.document.schedule.tasks.length)
  })

  it('an empty parts list keeps everything', () => {
    const state = stateOf(ONE_PARENT())

    const document = apiOf(state).readDocument(false, [], []) as unknown as Loose
    const schedule = document['schedule'] as Loose

    expect(schedule['calendars']).toBeDefined()
    expect(schedule['resources']).toBeDefined()
    expect(schedule['assignments']).toBeDefined()
    expect(document['documentSettings']).toBeDefined()
    expect(Object.keys(schedule).sort()).toEqual(Object.keys(state.document.schedule).sort())
  })
})

describe('AM-19 readDelayDiagnostics parts and limit -- the caller narrows the report', () => {
  it("parts ['findings'] with limit 2 keeps findings plus outcome, statusDate, unreliableCount; each list has at most 2", () => {
    const api = apiOf(stateOf(ONE_PARENT()))
    const whole = api.readDelayDiagnostics([], 0)
    expect((whole['findings'] as readonly unknown[]).length, 'premise: the bench has findings').toBeGreaterThan(0)

    const narrow = api.readDelayDiagnostics(['findings'], 2)

    expect(Object.keys(narrow).sort()).toEqual(['findings', 'outcome', 'statusDate', 'unreliableCount'])
    for (const value of Object.values(narrow)) if (Array.isArray(value)) expect(value.length).toBeLessThanOrEqual(2)
    expect(narrow['outcome']).toEqual(whole['outcome'])
    expect(narrow['statusDate']).toEqual(whole['statusDate'])
    expect(narrow['unreliableCount']).toEqual(whole['unreliableCount'])
  })

  it('limit cuts every list of the whole report and 0 means no limit', () => {
    const api = apiOf(stateOf(ONE_PARENT()))
    const whole = api.readDelayDiagnostics([], 0)
    const cut = api.readDelayDiagnostics([], 1)

    for (const [key, value] of Object.entries(whole)) {
      if (!Array.isArray(value)) continue
      expect((cut[key] as readonly unknown[]).length, key).toBe(Math.min(1, value.length))
    }
  })
})

describe('AV-2 createdUids -- the uids a write made, in order', () => {
  it('a write creating two tasks answers [hwm + 1, hwm + 2]', () => {
    const state = stateOf(ONE_PARENT())
    const api = apiOf(state)
    const hwm = state.document.schedule.project.uidHighWaterMark as number

    const outcome = api.applyCommands({ expectedStamp: api.readStamp(), commands: twoTasksCreated })

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.createdUids).toEqual([hwm + 1, hwm + 2])
    expect(state.document.schedule.project.uidHighWaterMark).toBe(hwm + 2)
  })

  it('a write that creates nothing answers an empty list', () => {
    const state = stateOf(ONE_PARENT())
    const api = apiOf(state)
    const commands = [{ kind: 'setTaskName', taskUid: TASK_UID, name: 'renamed by cr-803' }]

    const outcome = api.applyCommands({ expectedStamp: api.readStamp(), commands })

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.createdUids).toEqual([])
  })
})
