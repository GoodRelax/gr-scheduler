// CR-796 slice 7 spec-only tests: the AI asks the person to open a file -- requestOpenFile (AM-29, QN-17, AV-15, AG-12 (6)).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentSnapshot,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { mcpToolList } from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { specTable, unbroken } from './spec-table'

type Json = Record<string, unknown>

const ROOT = process.cwd()

const TEMPLATE = JSON.parse(
  readFileSync(join(ROOT, 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Document

const REQUIREMENTS = unbroken(readFileSync(join(ROOT, 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const MEMBERS = readFileSync(join(ROOT, 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8')

const startingDocument = (): Document =>
  ({
    ...structuredClone(TEMPLATE),
    documentStamp: {
      scheduleUpdatedAt: '2026-10-18T10:00:00Z',
      fileSavedAt: '2026-10-18T10:00:00Z',
      lastEditedBy: 'a person at the keyboard',
      settingsUpdatedAt: '2026-10-18T10:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}

const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

interface Flags {
  isQuestionAsked?: boolean
  isGestureInFlight?: boolean
  isEditingInPlace?: boolean
}

interface Bench {
  readonly api: AgentApi
  readonly asked: { count: number }
  readonly state: { document: Document }
}

function benchWith(flags: Flags, hasAsker: boolean): Bench {
  const state = {
    document: startingDocument(),
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
  }
  const asked = { count: 0 }
  const readSnapshot = (): AgentSnapshot => ({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
    document: state.document,
    documentAsWritten: state.document,
    selection: emptySelection(),
    frame: null,
    exportScene: null,
    isGestureInFlight: flags.isGestureInFlight ?? false,
    isEditingInPlace: flags.isEditingInPlace ?? false,
    isQuestionAsked: flags.isQuestionAsked ?? false,
    isDeliveringNotices: false,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: '2026-10-18T08:30:00Z',
    localReadAt: '2026-10-18T09:00:00',
  })
  const wiring = {
    changeWatchers: emptyChangeWatchers(),
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next: { document: Document; history: EditHistory<ChangeStep> }) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: { deliver: () => undefined },
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    writerName: 'agent under test',
    schemaVersion: String((TEMPLATE as unknown as Json)['schemaVersion']),
    ...(hasAsker
      ? {
          askToOpenFile: () => {
            asked.count += 1
          },
        }
      : {}),
  } as unknown as AgentApiWiring
  return { api: installAgentApi(wiring), asked, state }
}

// WHY: the member is new, so it is reached through a loose type and the file compiles before and after the change.
const requestOpenFile = (api: AgentApi): Promise<Json> | Json => {
  const member = (api as unknown as { requestOpenFile?: () => Promise<Json> | Json }).requestOpenFile
  if (typeof member !== 'function') throw new Error('AM-29: the Agent API has no member requestOpenFile')
  return member.call(api)
}

const refusalOf = (outcome: Json): Json => outcome['refusal'] as Json

const lineOf = (id: string): string => MEMBERS.split(/\r?\n/).find((line) => line.startsWith(`| ${id} |`)) ?? ''

// see AM-29, QN-17, AV-15
describe('AM-29 / AG-12 (6): requestOpenFile asks the person and returns at once', () => {
  it('AG-12 (6) 問いを出したら答えを待たずに値（`_assets/tbl-agent-api-members.md` の 表 T-400 の `AV-15` の「人に問うたとき」）で返すこと（MUST）: { ok: true, asked: "QN-17", stamp }', async () => {
    const { api, asked } = benchWith({}, true)
    const stampBefore = api.readStamp()
    const outcome = await Promise.race([
      Promise.resolve(requestOpenFile(api)),
      new Promise<'waited'>((resolve) => setTimeout(() => resolve('waited'), 500)),
    ])
    expect(outcome).not.toBe('waited')
    expect(outcome).toEqual({ ok: true, asked: 'QN-17', stamp: stampBefore })
    expect(asked.count).toBe(1)
  })

  it('AV-15: the asked outcome carries no refusal and no hasUpdatedSchedule (nothing is written yet)', async () => {
    const { api } = benchWith({}, true)
    const outcome = await requestOpenFile(api)
    expect(outcome['ok']).toBe(true)
    expect(outcome).not.toHaveProperty('refusal')
    expect(outcome).not.toHaveProperty('hasUpdatedSchedule')
  })

  it('AM-29: asking writes nothing -- the stamp and the document are the same after the call', async () => {
    const { api, state } = benchWith({}, true)
    const stampBefore = api.readStamp()
    const documentBefore = JSON.stringify(state.document)
    await requestOpenFile(api)
    expect(api.readStamp()).toEqual(stampBefore)
    expect(JSON.stringify(state.document)).toBe(documentBefore)
  })

  it('AM-29: two calls ask twice -- each call is one question', async () => {
    const { api, asked } = benchWith({}, true)
    await requestOpenFile(api)
    await requestOpenFile(api)
    expect(asked.count).toBe(2)
  })
})

// see AM-29, AV-4
describe('AM-29: a page with no way to ask refuses with notAvailable', () => {
  it('AV-4: without askToOpenFile -> { ok: false, refusal: { reason: "notAvailable" } }', async () => {
    const { api } = benchWith({}, false)
    const outcome = await requestOpenFile(api)
    expect(outcome['ok']).toBe(false)
    expect(refusalOf(outcome)['reason']).toBe('notAvailable')
    expect(outcome).not.toHaveProperty('asked')
  })
})

// see AM-29, AV-4, AG-12
describe('AM-29 / AV-4: while the person is busy the question is not put, and the refusal is a value', () => {
  const busy: readonly [string, Flags][] = [
    ['questionAsked', { isQuestionAsked: true }],
    ['gestureInFlight', { isGestureInFlight: true }],
    ['editingInPlace', { isEditingInPlace: true }],
  ]

  it.each(busy)('AV-4: %s -> refused with that reason and askToOpenFile is not called', async (reason, flags) => {
    const { api, asked } = benchWith(flags, true)
    const outcome = await requestOpenFile(api)
    expect(outcome['ok']).toBe(false)
    expect(refusalOf(outcome)['reason']).toBe(reason)
    expect(outcome).not.toHaveProperty('asked')
    expect(asked.count).toBe(0)
  })

  it('AV-4: when the person is free again the same page asks', async () => {
    const flags: Flags = { isQuestionAsked: true }
    const { api, asked } = benchWith(flags, true)
    expect((await requestOpenFile(api))['ok']).toBe(false)
    flags.isQuestionAsked = false
    expect(await requestOpenFile(api)).toMatchObject({ ok: true, asked: 'QN-17' })
    expect(asked.count).toBe(1)
  })
})

// see AG-12, AM-29, T-107
describe('AG-12 (4): the MCP tool list carries requestOpenFile and the save keys', () => {
  const tools = mcpToolList() as readonly { name: string; inputSchema: Json }[]
  const toolNamed = (name: string): { name: string; inputSchema: Json } => {
    const found = tools.find((tool) => tool.name === name)
    if (found === undefined) throw new Error(`mcpToolList has no tool ${name}`)
    return found
  }
  const propertiesOf = (name: string): Json => (toolNamed(name).inputSchema['properties'] ?? {}) as Json

  it('AM-29: a tool requestOpenFile exists and takes no argument', () => {
    expect(Object.keys(propertiesOf('requestOpenFile'))).toEqual([])
  })

  it.each(['exportJson', 'exportMspdi', 'exportSvg', 'exportPng', 'exportEmbeddedHtml'])(
    'AM-11..AM-15: %s takes fileName (string) and overwrite (boolean)',
    (name) => {
      const properties = propertiesOf(name)
      expect((properties['fileName'] as Json | undefined)?.['type']).toBe('string')
      expect((properties['overwrite'] as Json | undefined)?.['type']).toBe('boolean')
    },
  )

  it.each(['readDocument', 'readStamp', 'applyCommands', 'importDocument'])('AM-11..AM-15: %s does not take fileName', (name) => {
    expect(Object.keys(propertiesOf(name))).not.toContain('fileName')
  })
})

// see AM-29, QN-17, AV-15
describe('the specification rows that name the question (AM-29, AV-15, QN-17)', () => {
  it('AM-29 is a table T-107 row for requestOpenFile that returns AV-15 and cites QN-17 and AG-12', () => {
    const row = lineOf('AM-29')
    expect(row).toContain('requestOpenFile')
    expect(row).toContain('AV-15')
    expect(row).toContain('QN-17')
    expect(row).toContain('AG-12')
  })

  it('AV-15: the "asked" field may be U-61 or QN-17', () => {
    const row = lineOf('AV-15')
    expect(row).toContain('U-61')
    expect(row).toContain('QN-17')
  })

  it('QN-17: table T-234 has the row and it cites AM-29 and AG-12', () => {
    const row = specTable('T-234').rows.find((one) => one.id === 'QN-17')
    expect(row).toBeDefined()
    expect(row?.cells.join(' ')).toContain('AM-29')
    expect(row?.cells.join(' ')).toContain('AG-12')
  })

  it('AG-12 (6): the requirement names QN-17 beside U-61 as a question that returns at once', () => {
    const at = REQUIREMENTS.indexOf('| AG-12 |')
    expect(at).toBeGreaterThan(-1)
    const row = REQUIREMENTS.slice(at, REQUIREMENTS.indexOf('\n', at))
    const six = row.slice(row.indexOf('⑥'), row.indexOf('⑦'))
    expect(six).toContain('QN-17')
    expect(six).toContain('U-61')
    expect(six).toContain('AV-15')
  })
})
