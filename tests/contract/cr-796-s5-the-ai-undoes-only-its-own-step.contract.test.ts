// CR-796 slice 5: the AI undoes only its own step (AM-9, AM-10, AV-4, AG-2, AG-10, RD-1, RD-2).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  agentApiMembers,
  type AgentApiWiring,
  type AgentWriteOutcome,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog, type DialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { unbroken } from './spec-table'

type Loose = Record<string, unknown>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Loose & { readonly schedule: Loose }

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const MEMBERS_TABLE = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8'))

const OPENED_STAMP = {
  scheduleUpdatedAt: '2026-03-04T05:06:07Z',
  settingsUpdatedAt: '2026-03-04T05:06:07Z',
  lastEditedBy: 'template',
  fileSavedAt: null,
}

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const CHANGE_WATCHERS = emptyChangeWatchers()

// WHY: ED-1 is the word a write made from the screen signs with; ED-2 is the name the Agent API caller declares.
const PERSON = 'user'
const AI = 'cr-796 s5 agent'
const OTHER_AI = 'cr-796 s5 other agent'

interface State {
  document: Document
  history: EditHistory<ChangeStep>
  dialogue: DialogueLog
}

function wiringFor(state: State, writerName: string): AgentApiWiring {
  const readSnapshot = (): AgentSnapshot => ({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
    document: state.document,
    documentAsWritten: state.document,
    selection: emptySelection(),
    dialogue: state.dialogue,
    frame: null,
    exportScene: null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    isQuestionAsked: false,
    isDeliveringNotices: false,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: '2026-10-18T08:30:00Z',
    localReadAt: '2026-10-18T09:00:00',
  })
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
      deliver: (document, hasUpdatedSchedule) =>
        notifyChangeWatchers(CHANGE_WATCHERS, { document, hasUpdatedSchedule, dialogue: state.dialogue }),
    },
    dialogueHolder: {
      read: () => state.dialogue,
      replace: (next) => {
        state.dialogue = next
      },
    },
    dialogueAudience: {
      deliver: (log) => {
        state.dialogue = log
      },
    },
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    writerName,
    schemaVersion: String(TEMPLATE['schemaVersion']),
  }
}

const templateTasks = TEMPLATE.schedule['tasks'] as readonly Loose[]
const FIRST_UID = templateTasks[0]?.['uid'] as number
const SECOND_UID = templateTasks[1]?.['uid'] as number
const FIRST_NAME = String(templateTasks[0]?.['name'])

function startingState(): State {
  const document = {
    ...structuredClone(TEMPLATE),
    documentStamp: { ...OPENED_STAMP },
    changeLog: [],
  } as unknown as Document
  return { document, history: { done: [], undone: [] }, dialogue: emptyDialogueLog() }
}

const nameOf = (state: State, uid = FIRST_UID): unknown =>
  ((state.document.schedule.tasks as unknown as readonly Loose[]).find((one) => one['uid'] === uid) ?? {})['name']

const rename = (uid: number, name: string): never => ({ kind: 'setTaskName', taskUid: uid, name }) as never

const writeAs = (state: State, writer: string, uid: number, name: string): AgentWriteOutcome => {
  const api = agentApiMembers(wiringFor(state, writer))
  return api.applyCommands({ expectedStamp: api.readStamp(), commands: [rename(uid, name)] })
}

const refusalOf = (outcome: AgentWriteOutcome): Loose => {
  expect(outcome.ok, 'premise: the call was refused').toBe(false)
  return (outcome as unknown as Loose)['refusal'] as Loose
}

// see AM-9, RD-1, AG-10
describe('AM-9 undoEdit -- the AI takes back its own step; the stamp comes back as it came in (RD-1)', () => {
  it('the name is back and the stamp is the one from before the AI wrote', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    const before = structuredClone(api.readStamp())
    expect(before).toEqual(OPENED_STAMP)

    const written = api.applyCommands({ expectedStamp: before, commands: [rename(FIRST_UID, 'renamed by the AI')] })
    expect(written.ok, 'premise: the AI write was accepted').toBe(true)
    expect(nameOf(state)).toBe('renamed by the AI')
    const after = api.readStamp()
    expect(after).not.toEqual(before)

    const undone = api.undoEdit(after)

    expect(undone.ok).toBe(true)
    expect(nameOf(state)).toBe(FIRST_NAME)
    expect(api.readStamp()).toEqual(before)
    expect(state.document.documentStamp).toEqual(OPENED_STAMP)
    if (undone.ok) expect(undone.stamp).toEqual(before)
  })

  it('RD-1: walking the history adds no step of its own -- a second undo finds nothing', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    api.applyCommands({ expectedStamp: api.readStamp(), commands: [rename(FIRST_UID, 'renamed by the AI')] })
    expect(api.undoEdit(api.readStamp()).ok).toBe(true)
    const restored = state.document

    const again = api.undoEdit(api.readStamp())

    expect(again.ok).toBe(false)
    expect(state.document).toBe(restored)
  })

  it('only the newest step is taken back: a person step below the AI step stays', () => {
    const state = startingState()
    expect(writeAs(state, PERSON, SECOND_UID, 'renamed by the person').ok).toBe(true)
    const api = agentApiMembers(wiringFor(state, AI))
    expect(api.applyCommands({ expectedStamp: api.readStamp(), commands: [rename(FIRST_UID, 'renamed by the AI')] }).ok).toBe(true)

    const undone = api.undoEdit(api.readStamp())

    expect(undone.ok).toBe(true)
    expect(nameOf(state, FIRST_UID)).toBe(FIRST_NAME)
    expect(nameOf(state, SECOND_UID)).toBe('renamed by the person')
  })
})

// see AM-10, RD-2
describe('AM-10 redoEdit -- the AI puts its own undone step back, stamp as it came in (RD-2)', () => {
  it('after undoEdit, redoEdit(currentStamp) brings the AI name and the stamp the write had', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    api.applyCommands({ expectedStamp: api.readStamp(), commands: [rename(FIRST_UID, 'renamed by the AI')] })
    const written = structuredClone(api.readStamp())
    expect(api.undoEdit(written).ok).toBe(true)

    const redone = api.redoEdit(api.readStamp())

    expect(redone.ok).toBe(true)
    expect(nameOf(state)).toBe('renamed by the AI')
    expect(api.readStamp()).toEqual(written)
    if (redone.ok) expect(redone.stamp).toEqual(written)
  })

  it('a redo with nothing undone is refused and the document is the same value', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    const held = state.document

    const outcome = api.redoEdit(api.readStamp())

    expect(outcome.ok).toBe(false)
    expect(state.document).toBe(held)
  })
})

// see AM-9, AM-10, AV-4, AG-10
describe("AV-4 'notOwnStep' -- the AI does not silently take back or put back a step a person wrote", () => {
  it('a person edit on top, then the AI undoEdit(currentStamp): refused notOwnStep, the edit stays', () => {
    const state = startingState()
    expect(writeAs(state, AI, FIRST_UID, 'renamed by the AI').ok).toBe(true)
    expect(writeAs(state, PERSON, FIRST_UID, 'renamed by the person').ok).toBe(true)
    const api = agentApiMembers(wiringFor(state, AI))
    const current = structuredClone(api.readStamp())
    const held = state.document

    const refusal = refusalOf(api.undoEdit(current))

    expect(refusal['reason']).toBe('notOwnStep')
    expect(refusal['stamp']).toEqual(current)
    expect(nameOf(state)).toBe('renamed by the person')
    expect(state.document).toBe(held)
    expect(api.readStamp()).toEqual(current)
  })

  it('a step written under another writer name is not the AI step either', () => {
    const state = startingState()
    expect(writeAs(state, OTHER_AI, FIRST_UID, 'renamed by the other agent').ok).toBe(true)
    const api = agentApiMembers(wiringFor(state, AI))

    const refusal = refusalOf(api.undoEdit(api.readStamp()))

    expect(refusal['reason']).toBe('notOwnStep')
    expect(nameOf(state)).toBe('renamed by the other agent')
  })

  it('the same writer name that wrote the step may take it back, from a fresh api value', () => {
    const state = startingState()
    expect(writeAs(state, AI, FIRST_UID, 'renamed by the AI').ok).toBe(true)
    const again = agentApiMembers(wiringFor(state, AI))

    expect(again.undoEdit(again.readStamp()).ok).toBe(true)
    expect(nameOf(state)).toBe(FIRST_NAME)
  })

  it('a step the person undid cannot be redone by the AI: refused notOwnStep, nothing moves', () => {
    const state = startingState()
    expect(writeAs(state, PERSON, FIRST_UID, 'renamed by the person').ok).toBe(true)
    const person = agentApiMembers(wiringFor(state, PERSON))
    expect(person.undoEdit(person.readStamp()).ok, 'premise: the person may undo their own step').toBe(true)
    const api = agentApiMembers(wiringFor(state, AI))
    const held = state.document

    const refusal = refusalOf(api.redoEdit(api.readStamp()))

    expect(refusal['reason']).toBe('notOwnStep')
    expect(state.document).toBe(held)
    expect(nameOf(state)).toBe(FIRST_NAME)
  })

  it('a step the AI undid can be redone by that AI, but not by another writer', () => {
    const state = startingState()
    expect(writeAs(state, AI, FIRST_UID, 'renamed by the AI').ok).toBe(true)
    const api = agentApiMembers(wiringFor(state, AI))
    expect(api.undoEdit(api.readStamp()).ok).toBe(true)
    const other = agentApiMembers(wiringFor(state, OTHER_AI))
    const held = state.document

    expect(refusalOf(other.redoEdit(other.readStamp()))['reason']).toBe('notOwnStep')
    expect(state.document).toBe(held)
    expect(api.redoEdit(api.readStamp()).ok).toBe(true)
    expect(nameOf(state)).toBe('renamed by the AI')
  })
})

// see AM-9, AM-10, AG-2, AV-3
describe("AG-2 on the history walk -- a stale expectedStamp is refused 'staleStamp' and nothing changes", () => {
  it('undoEdit with the stamp from before the AI write: staleStamp with the current stamp', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    const stale = structuredClone(api.readStamp())
    api.applyCommands({ expectedStamp: stale, commands: [rename(FIRST_UID, 'renamed by the AI')] })
    const held = state.document

    const refusal = refusalOf(api.undoEdit(stale))

    expect(refusal['reason']).toBe('staleStamp')
    expect(refusal['stamp']).toEqual(api.readStamp())
    expect(refusal['document']).toBeUndefined()
    expect(state.document).toBe(held)
    expect(nameOf(state)).toBe('renamed by the AI')
  })

  it('redoEdit with a stale stamp: staleStamp, the undone step stays undone', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    api.applyCommands({ expectedStamp: api.readStamp(), commands: [rename(FIRST_UID, 'renamed by the AI')] })
    const stale = structuredClone(api.readStamp())
    expect(api.undoEdit(stale).ok).toBe(true)
    const held = state.document

    const refusal = refusalOf(api.redoEdit(stale))

    expect(refusal['reason']).toBe('staleStamp')
    expect(state.document).toBe(held)
  })

  it('a stale stamp is refused as stale even when the top step is a person step', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    const stale = structuredClone(api.readStamp())
    expect(writeAs(state, PERSON, FIRST_UID, 'renamed by the person').ok).toBe(true)

    expect(refusalOf(api.undoEdit(stale))['reason']).toBe('staleStamp')
    expect(nameOf(state)).toBe('renamed by the person')
  })
})

// see AM-9, AM-10
describe('AM-9 / AM-10 with nothing to walk -- a refusal and the document untouched', () => {
  it('undoEdit on a document nobody has changed: ok false, the same document value, the stamp unchanged', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    const held = state.document

    const outcome = api.undoEdit(api.readStamp())

    expect(outcome.ok).toBe(false)
    expect(state.document).toBe(held)
    expect(api.readStamp()).toEqual(OPENED_STAMP)
    expect(state.history.done).toHaveLength(0)
  })

  it('undoEdit after the one step is spent: ok false and the restored document stays', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, AI))
    api.applyCommands({ expectedStamp: api.readStamp(), commands: [rename(FIRST_UID, 'renamed by the AI')] })
    api.undoEdit(api.readStamp())
    const restored = state.document

    expect(api.undoEdit(api.readStamp()).ok).toBe(false)
    expect(state.document).toBe(restored)
  })
})

// see AM-9, AM-10, AV-4, AG-10
describe('the specification still says what these cases assert', () => {
  it('requirements AG-10 keeps the own-step clause verbatim', () => {
    expect(REQUIREMENTS).toContain(
      '`Agent API` の取り消し・やり直し（`_assets/tbl-agent-api-members.md` の 表 T-107 の `AM-9`・`AM-10`）は、戻す段・進める段を呼んだ書き手自身が書いたときだけ受けること（MUST）',
    )
  })

  it('AM-9 and AM-10 name notOwnStep and the writer ED-2; AV-4 lists notOwnStep', () => {
    const row = (id: string): string => MEMBERS_TABLE.split('\n').find((line) => line.startsWith(`| ${id} |`)) ?? ''
    for (const id of ['AM-9', 'AM-10']) {
      expect(row(id), id).toContain('notOwnStep')
      expect(row(id), id).toContain('ED-2')
    }
    expect(row('AM-9')).toContain('RD-1')
    expect(row('AM-10')).toContain('RD-2')
    expect(row('AV-4')).toContain("'notOwnStep'")
  })
})
