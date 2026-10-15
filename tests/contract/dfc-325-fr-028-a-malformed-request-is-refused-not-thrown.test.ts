// `FR-028`'s STATEMENT (docs/spec/01-04-requirements.md:3616):

import { emptyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentSnapshot,
  type AgentWriteOutcome,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  type EditHistory,
} from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type {
  ChangeStep,
  SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { specTable, unbroken } from './spec-table'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'


const FR_028_NEVER_THROWS =
  'TEMENT**: `Agent API` が有効化されているとき、`GRS` は、人が UI で行える編集・確認・出力と同じことを関数の呼び出しで行えるようにし、受理したか否かを値で返すこと。例外を投げてはならない（MUST NOT）'

const AG_9A_WHAT_A_REFUSAL_CARRIES =
  'ードのダイアログを出さずに値で返せること |\n| AG-8 | 画像化に失敗したときも、呼び出した側が**失敗を値で受け取れること** |\n| AG-9a | **拒否の値には、拒否された対象・理由の区分・現在の刻印を含めること（MUST）'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const AGENT_API_MEMBERS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'),
  'utf8',
))


const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

const STARTING_STAMP = {
  scheduleUpdatedAt: '2026-08-19T10:00:00Z',
  lastEditedBy: 'a person at the keyboard',
  settingsUpdatedAt: '2026-08-19T10:00:00Z',
} as const

const NAME_BEFORE = 'the name it started with'

const startingDocument = (): Document =>
  ({
    ...structuredClone(TEMPLATE),
    documentStamp: { ...STARTING_STAMP },
    changeLog: [],
  }) as unknown as Document

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}

const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  taskGroupAreaWidthWithoutPanels: 982,
}

const READ_AT = '2026-08-20T08:30:00Z'

interface Bench {
  readonly api: AgentApi
  readonly titleNow: () => string | null
  readonly stampNow: () => Document['documentStamp']
}

let benchCount = 0

function bench(): Bench {
  benchCount += 1
  const state = {
    document: (() => {
      const start = startingDocument()
      return {
        ...start,
        schedule: { ...start.schedule, project: { ...start.schedule.project, title: NAME_BEFORE } },
      } as unknown as Document
    })(),
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
    dialogue: emptyDialogueLog(),
  }

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
    readAt: READ_AT,
    localReadAt: '2026-10-03T09:00:00',
  })

  const wiring: AgentApiWiring = {
    changeWatchers: emptyChangeWatchers(),
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: { deliver: () => undefined },
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
    writerName: `agent under test ${benchCount}`,
    schemaVersion: TEMPLATE['schemaVersion'] as string,
  }

  return {
    api: installAgentApi(wiring),
    titleNow: () => state.document.schedule.project.title,
    stampNow: () => state.document.documentStamp,
  }
}


const MALFORMED: ReadonlyArray<{ readonly what: string; readonly request: unknown }> = [
  { what: 'nothing at all', request: undefined },
  { what: 'null', request: null },
  { what: 'a request with neither member', request: {} },
  { what: 'commands without an expectedStamp', request: { commands: [] } },
  {
    what: 'a non-empty bundle without an expectedStamp',
    request: { commands: [{ kind: 'setProjectTitle', title: 'written by a malformed call' }] },
  },
  { what: 'an expectedStamp without commands', request: { expectedStamp: { ...STARTING_STAMP } } },
  { what: 'an expectedStamp that is not an object', request: { expectedStamp: 'not a stamp', commands: [] } },
  { what: 'an expectedStamp missing one of AT-127..AT-129', request: {
    expectedStamp: { scheduleUpdatedAt: STARTING_STAMP.scheduleUpdatedAt },
    commands: [],
  } },
  {
    what: 'commands that are not a list',
    request: { expectedStamp: { ...STARTING_STAMP }, commands: 'not a list' },
  },
  {
    what: 'a command that is null',
    request: { expectedStamp: { ...STARTING_STAMP }, commands: [null] },
  },
  {
    what: 'a command naming no row of table T-108',
    request: { expectedStamp: { ...STARTING_STAMP }, commands: [{ kind: 'no such row' }] },
  },
  {
    what: 'a command of a real row whose field is spelled wrong',
    request: {
      expectedStamp: { ...STARTING_STAMP },
      commands: [{ kind: 'setStatusDate', date: '2026-08-21T00:00:00' }],
    },
  },
  {
    what: 'a command of a real row with every field missing',
    request: { expectedStamp: { ...STARTING_STAMP }, commands: [{ kind: 'createTask' }] },
  },
  {
    what: 'a command that is a string',
    request: { expectedStamp: { ...STARTING_STAMP }, commands: ['setProjectTitle'] },
  },
  { what: 'a string where a request belongs', request: 'apply my commands please' },
  { what: 'a list where a request belongs', request: [] },
]

const applying = (api: AgentApi, request: unknown): AgentWriteOutcome =>
  api.applyCommands(request as never)


describe('DFC-325 -- the manuscript these cases are driven by', () => {
  it('still forbids the Agent API to throw, without qualifying it', () => {
    expect(REQUIREMENTS).toContain(FR_028_NEVER_THROWS)
    expect(FR_028_NEVER_THROWS).toContain('受理したか否かを値で返すこと。例外を投げてはならない（MUST NOT）')
  })

  it('still requires a refusal to carry the target, the category and the stamp', () => {
    expect(REQUIREMENTS).toContain(AG_9A_WHAT_A_REFUSAL_CARRIES)
  })

  it('still puts applyCommands on AM-7, answering by value, and points it at FR-028', () => {
    const row = specTable('T-107').rows.find((one) => one.id === 'AM-7')
    expect(row?.cells.join(' ')).toContain('`applyCommands`')
    expect(row?.cells.join(' ')).toContain('受理したか否かを値で返す')
    expect(row?.cells.join(' ')).toContain('`FR-028`')
    expect(AGENT_API_MEMBERS).toContain('| AM-7 | 書く | `applyCommands` |')
  })
})


describe('FR-028 / AM-7 -- the well-formed shape still works', () => {
  it('accepts a bundle whose expectedStamp matches, and writes it', () => {
    const it_ = bench()
    expect(it_.titleNow()).toBe(NAME_BEFORE)
    const answer = applying(it_.api, {
      expectedStamp: it_.stampNow(),
      commands: [{ kind: 'setProjectTitle', title: 'a name the agent chose' }],
    })
    expect(answer.ok, JSON.stringify(answer)).toBe(true)
    expect(it_.titleNow()).toBe('a name the agent chose')
  })

  it('accepts an empty bundle whose expectedStamp matches', () => {
    const it_ = bench()
    const answer = applying(it_.api, { expectedStamp: it_.stampNow(), commands: [] })
    expect(answer.ok, JSON.stringify(answer)).toBe(true)
  })

  it('answers accepted with the stamp a caller holds for its next AG-2 check', () => {
    const it_ = bench()
    const answer = applying(it_.api, {
      expectedStamp: it_.stampNow(),
      commands: [{ kind: 'setProjectTitle', title: 'another name' }],
    })
    expect(answer.ok).toBe(true)
    if (answer.ok) {
      expect(answer.stamp).toEqual(it_.stampNow())
      expect(answer.stamp.scheduleUpdatedAt).not.toBe(STARTING_STAMP.scheduleUpdatedAt)
    }
  })
})


describe('FR-028 (MUST NOT) -- a malformed request is refused, never thrown', () => {
  it.each(MALFORMED)('does not throw for $what', ({ request }) => {
    const it_ = bench()
    expect(() => applying(it_.api, request)).not.toThrow()
  })

  it.each(MALFORMED)('answers a REFUSAL for $what', ({ request }) => {
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.ok, JSON.stringify(answer)).toBe(false)
  })

  it.each(MALFORMED)('leaves the document untouched for $what', ({ request }) => {
    const it_ = bench()
    const before = it_.titleNow()
    const stampBefore = it_.stampNow()
    applying(it_.api, request)
    expect(it_.titleNow()).toBe(before)
    expect(it_.stampNow()).toEqual(stampBefore)
  })
})


describe('T-035 AG-9a (MUST) -- what every refusal carries', () => {
  it.each(MALFORMED)('names the target that was refused, for $what', ({ request }) => {
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(typeof answer.refusal.target).toBe('string')
    expect(answer.refusal.target.length).toBeGreaterThan(0)
  })

  it.each(MALFORMED)('carries a category for the reason, for $what', ({ request }) => {
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(typeof answer.refusal.reason).toBe('string')
    expect(answer.refusal.reason.length).toBeGreaterThan(0)
  })

  it.each(MALFORMED)('carries the CURRENT stamp, all three values, for $what', ({ request }) => {
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(answer.refusal.stamp).toEqual(it_.stampNow())
    expect(Object.keys(answer.refusal.stamp).sort()).toEqual([
      'lastEditedBy',
      'scheduleUpdatedAt',
      'settingsUpdatedAt',
    ])
  })

  it('the stamp a refusal carries is good enough to retry with', () => {
    const it_ = bench()
    const refused = applying(it_.api, { commands: [] })
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    const retried = applying(it_.api, {
      expectedStamp: refused.refusal.stamp,
      commands: [{ kind: 'setProjectTitle', title: 'the retry landed' }],
    })
    expect(retried.ok, JSON.stringify(retried)).toBe(true)
    expect(it_.titleNow()).toBe('the retry landed')
  })
})
