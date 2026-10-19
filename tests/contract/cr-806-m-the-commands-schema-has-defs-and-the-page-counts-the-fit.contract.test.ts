// CR-806 items 11 and 14: the commands schema has $defs, and the page counts the AI fit (CM-102, AM-7, AM-30).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it } from 'vitest'

import {
  agentApiMembers,
  type AgentApiWiring,
  type AgentWriteOutcome,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { fitWrites, type InputContext } from '../../src/adapter/input-command-translator/input-command-translator'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, stepCount, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { ChangeStep, DocumentCommand, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { bare, specTable } from './spec-table'

type Json = Record<string, unknown>

const REAL_DOCUMENT_SCHEMA = readFileSync('docs/spec/_source/grs-document.schema.json', 'utf8')
const REAL_COMMANDS_SCHEMA = readFileSync('docs/spec/_source/grs-commands.schema.json', 'utf8')
const COMMANDS_SOURCE = JSON.parse(readFileSync('docs/spec/_source/document-commands.json', 'utf8')) as {
  readonly rows: readonly Json[]
}
const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

const WAIT_MS = 2000
const POLL_MS = 20
const PAGE_HTML = new Uint8Array(Buffer.from('<!doctype html><title>t</title>\n', 'utf8'))
const COMMANDS_URI = 'grs-relay://grs-commands.schema.json'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// see T-108
const T_108_NAMES = specTable('T-108').rows.map((row) => bare(row.by['確定名'] ?? ''))
const T_108_ROW = (id: string): ReturnType<typeof specTable>['rows'][number] | undefined =>
  specTable('T-108').rows.find((row) => row.id === id)
const SOURCE_ROW = (id: string): Json | undefined => COMMANDS_SOURCE.rows.find((row) => row['id'] === id)
const ENGLISH_LINES = (row: Json | undefined): readonly string[] => ((row?.['carries'] as Json | undefined)?.['en'] ?? []) as string[]
const FIRST_SENTENCE = (text: string): string => /^[\s\S]*?\.(?=\s|$)/.exec(text)?.[0] ?? text

describe('CM-102 is in table T-108 and its source with no values', () => {
  it('the table row names fitScheduleToScreenOnPage, carries no values and takes FR-055 as its source', () => {
    const row = T_108_ROW('CM-102')
    expect(row, 'premise: T-108 holds CM-102').toBeDefined()
    expect(bare(row?.by['確定名'] ?? '')).toBe('fitScheduleToScreenOnPage')
    expect(row?.by['運ぶ値']?.trim()).toBe('—')
    expect(bare(row?.by['正'] ?? '')).toBe('FR-055')
  })

  it('the source row has the same name, an empty value list and the source FR-055', () => {
    const row = SOURCE_ROW('CM-102')
    expect(row?.['name']).toBe('fitScheduleToScreenOnPage')
    expect(row?.['values']).toEqual([])
    expect(((row?.['source'] as Json | undefined)?.['ja'] as string).includes('FR-055')).toBe(true)
  })

  it('the English description says the page computes, leaves task groups folded and is refused before a first draw', () => {
    const text = ENGLISH_LINES(SOURCE_ROW('CM-102')).join('\n')
    expect(text).toMatch(/page computes the zoom and the scroll position/)
    expect(text).toMatch(/does not unfold the task groups/)
    expect(text).toContain('resetTaskGroupTreeStates')
    expect(text).toMatch(/refused while the page has not drawn its screen/)
  })
})

describe('the commands schema holds one definition per command under $defs', () => {
  const schema = JSON.parse(REAL_COMMANDS_SCHEMA) as Json
  const defs = schema['$defs'] as Record<string, Json>

  it('every confirmed name of T-108 is a key of $defs and nothing else is', () => {
    expect(T_108_NAMES.length).toBeGreaterThan(0)
    expect(Object.keys(defs).sort()).toEqual([...T_108_NAMES].sort())
  })

  it('oneOf holds only $ref entries to those definitions, in the order of T-108', () => {
    expect(schema['oneOf']).toEqual(T_108_NAMES.map((name) => ({ $ref: `#/$defs/${name}` })))
  })

  it('each definition has its name as properties.kind.const and every English carries line in its description', () => {
    for (const row of COMMANDS_SOURCE.rows) {
      const name = row['name'] as string
      const def = defs[name]
      expect(def, `premise: $defs holds ${name}`).toBeDefined()
      const kind = ((def?.['properties'] as Json | undefined)?.['kind'] as Json | undefined)?.['const']
      expect(kind, `kind of ${name}`).toBe(name)
      const description = def?.['description'] as string
      for (const line of ENGLISH_LINES(row)) expect(description, `description of ${name}`).toContain(line)
    }
  })
})

const relays: McpRelay[] = []
const clients: StdioClient[] = []

class StdioClient {
  readonly input = new PassThrough()
  readonly output = new PassThrough()
  readonly messages: Json[] = []
  private nextId = 1
  private held = ''

  constructor() {
    this.output.on('data', (chunk: Buffer) => {
      this.held += chunk.toString('utf8')
      for (let at = this.held.indexOf('\n'); at >= 0; at = this.held.indexOf('\n')) {
        const line = this.held.slice(0, at)
        this.held = this.held.slice(at + 1)
        try {
          this.messages.push(JSON.parse(line) as Json)
        } catch {
          // WHY: a line that is not JSON cannot answer a request; the caller times out on its own id.
        }
      }
    })
  }

  newId(): number {
    return this.nextId++
  }

  send(message: Json): void {
    this.input.write(`${JSON.stringify(message)}\n`)
  }

  async answerTo(id: number): Promise<Json> {
    const deadline = Date.now() + WAIT_MS
    for (;;) {
      const found = this.messages.find((one) => one['id'] === id)
      if (found !== undefined) return found
      if (Date.now() > deadline) throw new Error(`timed out waiting for request ${String(id)}`)
      await sleep(POLL_MS)
    }
  }

  async callTool(name: string, args?: Json): Promise<Json> {
    const id = this.newId()
    this.send({ jsonrpc: '2.0', id, method: 'tools/call', params: args === undefined ? { name } : { name, arguments: args } })
    const answer = await this.answerTo(id)
    if (answer['result'] === undefined) throw new Error(`tools/call ${name} answered ${JSON.stringify(answer)}`)
    return answer['result'] as Json
  }
}

afterEach(async () => {
  for (const relay of relays.splice(0)) await Promise.race([relay.close(), sleep(WAIT_MS)])
  for (const client of clients.splice(0)) client.input.end()
})

async function startRelay(): Promise<StdioClient> {
  const client = new StdioClient()
  clients.push(client)
  const relay = await startMcpRelay({
    input: client.input,
    output: client.output,
    log: () => undefined,
    pageHtml: PAGE_HTML,
    documentSchema: REAL_DOCUMENT_SCHEMA,
    commandsSchema: REAL_COMMANDS_SCHEMA,
  } as Parameters<typeof startMcpRelay>[0])
  relays.push(relay)
  return client
}

async function readCommandsResource(client: StdioClient): Promise<Json> {
  const id = client.newId()
  client.send({ jsonrpc: '2.0', id, method: 'resources/read', params: { uri: COMMANDS_URI } })
  const answer = await client.answerTo(id)
  const contents = (answer['result'] as Json)['contents'] as Json[]
  return JSON.parse(contents[0]?.['text'] as string) as Json
}

async function schemaAnswer(client: StdioClient, args: Json): Promise<Json> {
  const result = await client.callTool('readSchema', args)
  expect(result['isError']).not.toBe(true)
  const content = result['content'] as Json[]
  return JSON.parse(content[0]?.['text'] as string) as Json
}

// see AM-30
describe('AM-30 readSchema on the commands hands a table of contents and single definitions', () => {
  it('the table of contents lists every command name in T-108 order, each with the first sentence of its description', async () => {
    const client = await startRelay()
    const toc = await schemaAnswer(client, { which: 'commands' })
    const resource = await readCommandsResource(client)
    const defs = resource['$defs'] as Record<string, Json>
    const listed = toc['defs'] as Json[]
    expect(listed.map((one) => one['name'])).toEqual(T_108_NAMES)
    for (const one of listed) {
      const name = one['name'] as string
      expect(one['about'], `about of ${name}`).toBe(FIRST_SENTENCE(defs[name]?.['description'] as string))
    }
  })

  it('with defs createDependency and setCalendar it returns exactly those two, equal to the resource entries', async () => {
    const client = await startRelay()
    const answer = await schemaAnswer(client, { which: 'commands', defs: ['createDependency', 'setCalendar'] })
    const resource = await readCommandsResource(client)
    const all = resource['$defs'] as Json
    const got = answer['defs'] as Json
    expect(Object.keys(got).sort()).toEqual(['createDependency', 'setCalendar'])
    expect(got['createDependency']).toEqual(all['createDependency'])
    expect(got['setCalendar']).toEqual(all['setCalendar'])
    expect(answer['unknown']).toEqual([])
  })
})

// see AM-7, CM-71, CM-102
interface State {
  document: Document
  history: EditHistory<ChangeStep>
}

type Loose = Record<string, unknown>

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const CHANGE_WATCHERS = emptyChangeWatchers()
const AI = 'cr-806 agent'

const startDocument = (): Document => {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const startingState = (): State => ({ document: startDocument(), history: { done: [], undone: [] } })

function wiringFor(state: State, pageFitWrites?: (() => readonly DocumentCommand[] | null) | undefined): AgentApiWiring {
  const readSnapshot = (): AgentSnapshot => ({
    defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
    document: state.document,
    documentAsWritten: state.document,
    selection: emptySelection(),
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
      deliver: (document, hasUpdatedSchedule) => notifyChangeWatchers(CHANGE_WATCHERS, { document, hasUpdatedSchedule }),
    },
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    ...(pageFitWrites === undefined ? {} : { pageFitWrites }),
    writerName: AI,
    schemaVersion: '2026-01-01T00:00:00Z',
  }
}

const FIRST_TASK = (state: State): Loose => (state.document.schedule.tasks as unknown as readonly Loose[])[0] as Loose
const FIRST_GROUP_ID = (state: State): string => (state.document.schedule.taskGroups[0] as unknown as Loose)['id'] as string
const settingsOf = (state: State): Loose => state.document.documentSettings as unknown as Loose

const FIT_ON_PAGE = { kind: 'fitScheduleToScreenOnPage' } as unknown as DocumentCommand
const renameFirst = (state: State, name: string): DocumentCommand =>
  ({ kind: 'setTaskName', taskUid: FIRST_TASK(state)['uid'], name }) as unknown as DocumentCommand

const fitCommandOf = (state: State, over: Loose = {}): DocumentCommand =>
  ({
    kind: 'fitScheduleToScreen',
    zoomX: 2.5,
    zoomY: 0.5,
    scrollDate: '2026-03-02T00:00:00',
    scrollTaskGroupId: FIRST_GROUP_ID(state),
    scrollDateFraction: 0.25,
    scrollTaskGroupFraction: 0.75,
    ...over,
  }) as unknown as DocumentCommand

const applied = (_state: State, api: ReturnType<typeof agentApiMembers>, commands: readonly DocumentCommand[]): AgentWriteOutcome =>
  api.applyCommands({ expectedStamp: api.readStamp(), commands })

const FIT_KEYS = ['zoomX', 'zoomY', 'scrollDate', 'scrollTaskGroupId', 'scrollDateFraction', 'scrollTaskGroupFraction']
const fitValuesOf = (state: State): Loose => Object.fromEntries(FIT_KEYS.map((key) => [key, settingsOf(state)[key]]))

describe('AM-7 applyCommands replaces CM-102 with the page own CM-71 write', () => {
  it('accepts the batch and the document settings hold the values the page chose', () => {
    const state = startingState()
    const chosen = fitCommandOf(state)
    const api = agentApiMembers(wiringFor(state, () => [chosen]))

    const outcome = applied(state, api, [FIT_ON_PAGE])

    expect(outcome.ok).toBe(true)
    expect(fitValuesOf(state)).toEqual({
      zoomX: 2.5,
      zoomY: 0.5,
      scrollDate: '2026-03-02T00:00:00',
      scrollTaskGroupId: FIRST_GROUP_ID(state),
      scrollDateFraction: 0.25,
      scrollTaskGroupFraction: 0.75,
    })
  })

  it('clamps the zoom of the page count to the limits', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, () => [fitCommandOf(state, { zoomX: 1000, zoomY: 0.001 })]))

    expect(applied(state, api, [FIT_ON_PAGE]).ok).toBe(true)

    expect(settingsOf(state)['zoomX']).toBe(SETTINGS_LIMITS.zoomMax)
    expect(settingsOf(state)['zoomY']).toBe(SETTINGS_LIMITS.zoomMin)
  })

  it('keeps the other command of the batch and replaces only the fit', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, () => [fitCommandOf(state)]))

    const outcome = applied(state, api, [renameFirst(state, 'renamed with the fit'), FIT_ON_PAGE])

    expect(outcome.ok).toBe(true)
    expect(FIRST_TASK(state)['name']).toBe('renamed with the fit')
    expect(settingsOf(state)['zoomX']).toBe(2.5)
    expect(settingsOf(state)['scrollDateFraction']).toBe(0.25)
  })

  it.each([
    ['absent', undefined],
    ['returning null', () => null],
  ])('with pageFitWrites %s the batch is refused as a value and the document is unchanged', (_label, pageFitWrites) => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, pageFitWrites))
    const held = state.document
    const heldHistory = state.history

    const outcome = applied(state, api, [renameFirst(state, 'must not land'), FIT_ON_PAGE])

    expect(outcome.ok).toBe(false)
    expect(state.document).toBe(held)
    expect(state.history).toBe(heldHistory)
    expect(FIRST_TASK(state)['name']).not.toBe('must not land')
  })

  // see UN-8
  it('a batch of only CM-102 stacks no undo step, since CM-71 is view-only', () => {
    const state = startingState()
    const api = agentApiMembers(wiringFor(state, () => [fitCommandOf(state)]))
    const before = stepCount(state.history)

    expect(applied(state, api, [FIT_ON_PAGE]).ok).toBe(true)

    expect(stepCount(state.history)).toBe(before)
  })
})

// see FR-055, IC-10, FR-031
const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

function inputContextOf(document: Document): InputContext {
  const settings = document.documentSettings
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  return {
    document,
    layout,
    geometry: geometryFromLayout(document.schedule, settings, layout, regions, emptySelection(), null),
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  }
}

describe('the published entry fitWrites counts the fit the page hands to the Agent API', () => {
  it('its first write group is exactly one fitScheduleToScreen command', () => {
    const groups = fitWrites(inputContextOf(startDocument()))

    expect(groups.length).toBeGreaterThanOrEqual(1)
    expect(groups[0]).toHaveLength(1)
    expect(groups[0]?.[0]?.kind).toBe('fitScheduleToScreen')
  })

  it('its first group, handed over as pageFitWrites, lands as the document settings', () => {
    const state = startingState()
    const first = fitWrites(inputContextOf(state.document))[0] as readonly DocumentCommand[]
    const api = agentApiMembers(wiringFor(state, () => first))

    expect(applied(state, api, [FIT_ON_PAGE]).ok).toBe(true)

    const written = first[0] as unknown as Loose
    const clamp = (value: number): number => Math.max(SETTINGS_LIMITS.zoomMin, Math.min(SETTINGS_LIMITS.zoomMax, value))
    expect(settingsOf(state)['zoomX']).toBe(clamp(written['zoomX'] as number))
    expect(settingsOf(state)['zoomY']).toBe(clamp(written['zoomY'] as number))
    expect(settingsOf(state)['scrollDate']).toBe(written['scrollDate'])
  })
})
