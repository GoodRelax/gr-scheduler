// Unit tests: UF-27 agent-api-endpoint, UF-28 agent-api-members and UF-29 snapshot-source.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import * as agentApiEndpoint from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentExport,
  type AgentSnapshot,
  type AgentWriteOutcome,
  type FrameSnapshot,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import {
  documentFromJson,
  mspdiFromDocument,
} from '../../src/adapter/document-codec/document-codec'
import type { ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  NOT_STORED_LIMITS,
  type EditHistory,
} from '../../src/entity/document-model/edit-history/edit-history'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  displayRatioOf,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  applyDocumentChange,
  type ChangeStep,
  type DocumentCommand,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import {
  emptyChangeWatchers,
  notifyChangeWatchers,
  unwatchChanges,
  type ChangeNotice,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
// Why: the one reach into Framework: FR-080's export environment is the shell's to build, so
// the bench asks the shell for one instead of deciding closed a second time.
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import { bare, specTable, unbroken } from '../contract/spec-table'

const LAST_SAVED_AT = '2026-10-03T09:00:00'

// Spec: T-107
const T_107 = [
  { row: 'AM-1', name: 'agentApiVersion', isProperty: true },
  { row: 'AM-2', name: 'schemaVersion', isProperty: true },
  { row: 'AM-3', name: 'readDocument', isProperty: false },
  { row: 'AM-4', name: 'readStamp', isProperty: false },
  { row: 'AM-5', name: 'readSelection', isProperty: false },
  { row: 'AM-25', name: 'readSearchRows', isProperty: false },
  { row: 'AM-28', name: 'readTableRows', isProperty: false },
  { row: 'AM-26', name: 'readShownTasks', isProperty: false },
  { row: 'AM-19', name: 'readDelayDiagnostics', isProperty: false },
  { row: 'AM-7', name: 'applyCommands', isProperty: false },
  { row: 'AM-8', name: 'importDocument', isProperty: false },
  { row: 'AM-29', name: 'requestOpenFile', isProperty: false },
  { row: 'AM-32', name: 'issueDelayFixes', isProperty: false },
  { row: 'AM-9', name: 'undoEdit', isProperty: false },
  { row: 'AM-10', name: 'redoEdit', isProperty: false },
  { row: 'AM-11', name: 'exportJson', isProperty: false },
  { row: 'AM-12', name: 'exportMspdi', isProperty: false },
  { row: 'AM-13', name: 'exportSvg', isProperty: false },
  { row: 'AM-14', name: 'exportPng', isProperty: false },
  { row: 'AM-15', name: 'exportEmbeddedHtml', isProperty: false },
  { row: 'AM-34', name: 'exportFixLogTsv', isProperty: false },
  { row: 'AM-16', name: 'focusTask', isProperty: false },
  { row: 'AM-27', name: 'showOnlyTasks', isProperty: false },
  { row: 'AM-31', name: 'runDelayDiagnostics', isProperty: false },
  { row: 'AM-33', name: 'closeWindow', isProperty: false },
  { row: 'AM-17', name: 'watchChanges', isProperty: false },
] as const

// Why: AM-30 readSchema is answered by the relay itself, so the page's surface has no such
// member (AG-12).
const SURFACE_LACKS: readonly string[] = ['AM-30']
const PROPERTY = 'プロパティ'
const AM_25_RETURNS = '語を 1 つ受け、検索パネルの 2 つの表と同じ行を返す。'

const T_035_UNWIRED = ['AM-8', 'AM-9', 'AM-10', 'AM-14', 'AM-15'] as const

// Spec: WS-1, AG-2
// Why: the values are only something other than what the document holds.
const T_067_WS1 = [
  { field: 'scheduleUpdatedAt', differs: { scheduleUpdatedAt: '2026-08-19T11:00:00Z' } },
  { field: 'lastEditedBy', differs: { lastEditedBy: 'somebody else entirely' } },
  { field: 'settingsUpdatedAt', differs: { settingsUpdatedAt: '2026-08-19T11:00:00Z' } },
  // Why: FR-063 never reads a stamp as an order: an undo restores an earlier one (FR-031), so
  // older is not harmless.
  { field: 'scheduleUpdatedAt, earlier', differs: { scheduleUpdatedAt: '1999-01-01T00:00:00Z' } },
  { field: 'settingsUpdatedAt, earlier', differs: { settingsUpdatedAt: '1999-01-01T00:00:00Z' } },
] as const

// Spec: BT-4, FR-027
// Why: the one document whose values the spec decides; only its schedule rows are cut down,
// so a case that freezes the whole root does not walk a thousand tasks.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

type Loose = Record<string, unknown>

const templateSchedule = TEMPLATE['schedule'] as Loose
const templateTasks = templateSchedule['tasks'] as readonly Loose[]
const templateGroups = templateSchedule['taskGroups'] as readonly Loose[]

const FIRST_UID = 101
const SECOND_UID = 102
const ABSENT_UID = 999_999

const FIRST_START = '2026-04-01T00:00:00'
const SECOND_START = '2026-05-01T00:00:00'

const taskOf = (uid: number, start: string, finish: string): Loose => ({
  ...(templateTasks[0] as Loose),
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name: `task ${uid}`,
  start,
  finish,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  // Why: what the dates give an unstarted Task; a GRS JSON read recounts any other value (FR-012).
  percentComplete: 0,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
})

const FIRST_GROUP: Loose = { ...(templateGroups[0] as Loose), parentId: null, order: 0 }
const SECOND_GROUP: Loose = { ...(templateGroups[1] as Loose), parentId: null, order: 1 }
const FIRST_GROUP_ID = FIRST_GROUP['id'] as string
const SECOND_GROUP_ID = SECOND_GROUP['id'] as string

const SMALL_SCHEDULE: Loose = {
  ...templateSchedule,
  tasks: [
    taskOf(FIRST_UID, FIRST_START, '2026-04-10T00:00:00'),
    taskOf(SECOND_UID, SECOND_START, '2026-05-20T00:00:00'),
  ],
  taskGroups: [FIRST_GROUP, SECOND_GROUP],
  taskGroupMembers: [
    { taskUid: FIRST_UID, taskGroupId: FIRST_GROUP_ID },
    { taskUid: SECOND_UID, taskGroupId: SECOND_GROUP_ID },
  ],
  taskVisuals: [],
  resources: [],
  assignments: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
}

const STARTING_STAMP = {
  scheduleUpdatedAt: '2026-08-19T10:00:00Z',
  lastEditedBy: 'a person at the keyboard',
  settingsUpdatedAt: '2026-08-19T10:00:00Z',
  fileSavedAt: null,
} as const

const SJ_2_NO_STEP = '`SJ-2` で `treeState` の値が 1 つも変わらないとき、`GRS` は、取り消しの段を積まないこと。'

const OPEN_SCHEDULE: Loose = {
  ...SMALL_SCHEDULE,
  taskGroups: [
    { ...FIRST_GROUP, treeState: 'expanded' },
    { ...SECOND_GROUP, treeState: 'expanded' },
  ],
}

const EMPTY_SCHEDULE: Loose = {
  ...SMALL_SCHEDULE,
  tasks: [],
  taskGroups: [],
  taskGroupMembers: [],
}

// Why: the document a read hands over holds no "$schema"; the writer adds it (DR-4).
const startingDocument = (): Document =>
  ({
    ...Object.fromEntries(Object.entries(TEMPLATE).filter(([key]) => key !== '$schema')),
    schedule: SMALL_SCHEDULE,
    documentStamp: { ...STARTING_STAMP },
    changeLog: [],
  }) as unknown as Document

// Why: LY-5 keeps these values outside the three inner layers, so each arrives through IF-7
// rather than being read here.

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  // Why: S-95 is stated in megabytes; the plan counts bytes.
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}

const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  taskGroupAreaWidthWithoutPanels: 982,
}

const SCREEN: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

// Why: CS-1 keeps the clock on the Framework's side, so it arrives as a value.
const READ_AT = '2026-08-20T08:30:00Z'

// Spec: ADR-001
function frameOf(document: Document): FrameSnapshot {
  const settings = document.documentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const geometry = geometryFromLayout(document.schedule, settings, layout, regions, emptySelection(), null)
  return { layout, geometry, regions }
}

// Why: asked of the real shell, so FR-080's closed panels are decided in one place; built per
// reading because the cases replace the bench's document.
function exportSceneOf(document: Document): ExportScene | null {
  return frameLoop({ showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined }, document, SCREEN).exportScene()
}

interface Bench {
  readonly api: AgentApi
  readonly writerName: string
  readonly schemaVersion: string
  // Summary: snapshotReads counts the calls that went through IF-7.
  snapshotReads: number
  document: Document
  history: EditHistory<ChangeStep>
  selection: Selection
  frame: FrameSnapshot | null
  isGestureInFlight: boolean
  isEditingInPlace: boolean
  // Why: S-94 and S-95 are not kept in the document, so a case may move them here.
  historyLimits: { maxSteps: number; maxTotalSizeBytes: number }
  readAt: string,
  localReadAt: '2026-10-03T09:00:00',
  // Summary: notices holds what a watcher installed through AM-17 was handed.
  readonly notices: ChangeNotice[]
  // Summary: writeAsPerson writes as somebody who is not this API, through the one write path.
  writeAsPerson(commands: readonly DocumentCommand[], editedBy: string): void
}

let benchCount = 0
const openBenches: Bench[] = []

// Why: each bench takes its own writer name, since the PI-15 registry is module-scoped and
// keyed by it; two benches sharing one name would share one subscription.
function bench(startWithFrame = true, schedule: Loose = SMALL_SCHEDULE): Bench {
  benchCount += 1
  const writerName = `agent under test ${benchCount}`
  const schemaVersion = TEMPLATE['schemaVersion'] as string
  const document = { ...startingDocument(), schedule } as unknown as Document

  const state = {
    snapshotReads: 0,
    document,
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
    selection: emptySelection(),
    frame: startWithFrame ? frameOf(document) : null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    isQuestionAsked: false,
    // Why: changeDeliveryStateMachine.delivering, open only while WS-7 tells
    // the watchers; the shell holds it, and so does this bench.
    isDeliveringNotices: false,
    historyLimits: { ...HISTORY_LIMITS },
    readAt: READ_AT,
    localReadAt: '2026-10-03T09:00:00',
    notices: [] as ChangeNotice[],
  }

  const snapshotOf = (): AgentSnapshot => {
    state.snapshotReads += 1
    return {
      defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
      document: state.document,
      documentAsWritten: state.document,
      selection: state.selection,
      frame: state.frame,
      // Why: the two absences travel together: an implementor with no settled size (BO-1) has
      // neither a frame nor an export environment.
      exportScene: state.frame === null ? null : exportSceneOf(state.document),
      isGestureInFlight: state.isGestureInFlight,
      isEditingInPlace: state.isEditingInPlace,
      isQuestionAsked: false,
      isDeliveringNotices: state.isDeliveringNotices,
      historyLimits: state.historyLimits,
      settingsLimits: SETTINGS_LIMITS,
      readAt: state.readAt,
      localReadAt: '2026-10-03T09:00:00',
    }
  }

  const wiring: AgentApiWiring = {
    source: { readSnapshot: snapshotOf },
    changeWatchers: CHANGE_WATCHERS,
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    // Why: handing the audience on to PI-15 after the swap (WS-7) is what a running shell does,
    // and it lets AM-17 be observed.
    audience: {
      // Trap: WS-5's judgment is the second argument of deliver and must be carried through: AG-6
      // selects a live watcher by it, and nothing downstream can work it out again.
      deliver: (document, hasUpdatedSchedule) => {
        // Why: as the shell does, open the window at the head and close it in a
        // `finally` so a throwing watcher cannot leave WS-2 refusing for ever.
        state.isDeliveringNotices = true
        try {
          notifyChangeWatchers(CHANGE_WATCHERS, { document, hasUpdatedSchedule })
        } finally {
          state.isDeliveringNotices = false
        }
      },
    },
    // Why: AgentApiWiring requires IF-6 and IF-8 but allows undefined, the shape of a loop that
    // touches no picture, so AM-14 and AM-15 answer notAvailable.
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    writerName,
    schemaVersion,
  }

  const made: Bench = {
    api: installAgentApi(wiring),
    writerName,
    schemaVersion,
    get snapshotReads() {
      return state.snapshotReads
    },
    get document() {
      return state.document
    },
    set document(next: Document) {
      state.document = next
    },
    get history() {
      return state.history
    },
    get selection() {
      return state.selection
    },
    set selection(next: Selection) {
      state.selection = next
    },
    get frame() {
      return state.frame
    },
    set frame(next: FrameSnapshot | null) {
      state.frame = next
    },
    get isGestureInFlight() {
      return state.isGestureInFlight
    },
    set isGestureInFlight(next: boolean) {
      state.isGestureInFlight = next
    },
    get isEditingInPlace() {
      return state.isEditingInPlace
    },
    set isEditingInPlace(next: boolean) {
      state.isEditingInPlace = next
    },
    get historyLimits() {
      return state.historyLimits
    },
    set historyLimits(next: { maxSteps: number; maxTotalSizeBytes: number }) {
      state.historyLimits = next
    },
    get readAt() {
      return state.readAt
    },
    set readAt(next: string) {
      state.readAt = next
    },
    notices: state.notices,
    writeAsPerson: (commands, editedBy) => {
      applyDocumentChange(
        {
          defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
          expectedStamp: state.document.documentStamp,
          commands,
          moment: { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false },
          historyLimits: state.historyLimits,
          settingsLimits: SETTINGS_LIMITS,
          editedBy,
          updatedAt: state.readAt,
        },
        wiring.holder,
        wiring.audience,
      )
    },
  } as Bench

  openBenches.push(made)
  return made
}

// Why: one registry for every bench, as a single shell holds one (SF-10).
const CHANGE_WATCHERS = emptyChangeWatchers()

afterEach(() => {
  // Why: the PI-15 registry outlives one case; without unwatching, a later case's notice would
  // reach an earlier case's receiver.
  for (const one of openBenches) unwatchChanges(CHANGE_WATCHERS, one.writerName)
  openBenches.length = 0
})

const RENAME = { kind: 'setProjectTitle', title: 'a new document name' } as const
// Why: CM-1 refuses an empty document name (FR-035), which makes it the second half of an
// AG-3 bundle that must be dropped whole.
const BAD_RENAME = { kind: 'setProjectTitle', title: '' } as const
// Why: UN-13 keeps the theme in the presentation group, so FR-063 does not move the
// schedule-data instant for it.
const RECOLOR = { kind: 'setThemeMonochrome', isThemeMonochrome: true } as const

function accepted<TOutcome extends { readonly ok: boolean }>(
  outcome: TOutcome,
): Extract<TOutcome, { ok: true }> {
  if (!outcome.ok) {
    throw new Error(`expected acceptance, was refused: ${JSON.stringify((outcome as { refusal?: unknown }).refusal)}`)
  }
  return outcome as Extract<TOutcome, { ok: true }>
}

function refused<TOutcome extends { readonly ok: boolean }>(
  outcome: TOutcome,
): Extract<TOutcome, { ok: false }> {
  if (outcome.ok) throw new Error('expected a refusal, was accepted')
  return outcome as Extract<TOutcome, { ok: false }>
}

function exported<TValue>(answer: AgentExport<TValue>): TValue {
  if (!answer.ok) throw new Error(`expected a value, was refused: ${JSON.stringify(answer.refusal)}`)
  return answer.value
}

function reachable(value: unknown, seen = new Set<unknown>()): readonly object[] {
  if (value === null || typeof value !== 'object') return []
  if (seen.has(value)) return []
  seen.add(value)
  const found: object[] = [value]
  for (const one of Object.values(value as Record<string, unknown>)) {
    found.push(...reachable(one, seen))
  }
  return found
}

// Spec: AG-4
const everythingFrozen = (value: unknown): boolean => reachable(value).every(Object.isFrozen)

// Spec: AG-4
function sharesNothingWith(answer: unknown, held: unknown): boolean {
  const theirs = new Set<object>(reachable(held))
  return reachable(answer).every((one) => !theirs.has(one))
}

// Spec: T-107
function callEveryMember(api: AgentApi): void {
  void api.agentApiVersion
  void api.schemaVersion
  api.readDocument(false, [], [])
  api.readStamp()
  api.readSelection()
  api.readSearchRows('', 'asShown', 0, 100)
  api.applyCommands({ expectedStamp: api.readStamp(), commands: [RENAME] })
  api.importDocument({ text: '{}' })
  api.undoEdit(api.readStamp())
  api.redoEdit(api.readStamp())
  api.exportJson()
  api.exportMspdi()
  api.exportSvg()
  // Why: void, not awaited: the walk asks whether a call throws; these two answer promises that
  // never reject (the next case pins it), so nothing is left unhandled.
  void api.exportPng()
  void api.exportEmbeddedHtml()
  api.focusTask(FIRST_UID)
  api.watchChanges(() => undefined).stopWatching()
}

describe('UF-27 installAgentApi -- FR-065 / PI-17', () => {
  it('answers with the surface and places it nowhere: no table states the name', () => {
    const before = new Set(Reflect.ownKeys(globalThis))
    const made = bench().api
    const added = Reflect.ownKeys(globalThis).filter((key) => !before.has(key))

    expect(added).toEqual([])
    expect(typeof made).toBe('object')
  })

  it('starts nothing on its own: no snapshot is read and no watcher is registered (FR-065)', () => {
    const one = bench()

    expect(one.snapshotReads).toBe(0)
    // Why: had the install subscribed, a person's write would reach a receiver this case never
    // gave, and the AG-6 own-write rule would be untestable.
    one.writeAsPerson([RENAME], 'a person at the keyboard')
    expect(one.notices).toHaveLength(0)
  })

  it('two installations are two surfaces (nothing in the folder is shared state)', () => {
    expect(bench().api).not.toBe(bench().api)
  })

  it('publishes the two runtime names PI-17 lists (installAgentApi, answerRelayedCall), and re-publishes the seam as a type', () => {
    // Why: SnapshotSource, the other half of PI-17, is a type and leaves nothing at run time; the
    // import at the head of this file proves its re-publication.
    expect([...Object.keys(agentApiEndpoint)].sort()).toEqual(['answerRelayedCall', 'installAgentApi'])
  })
})

describe('table T-107 -- the roster', () => {
  const api = () => bench().api

  it('carries every row of table T-107, spelled as the table spells it', () => {
    const made = api() as unknown as Record<string, unknown>
    for (const row of T_107) {
      expect(Object.hasOwn(made, row.name), `${row.row} ${row.name} is missing`).toBe(true)
    }
  })

  it('carries the part of speech each row declares (property, or verb plus object)', () => {
    const made = api() as unknown as Record<string, unknown>
    for (const row of T_107) {
      const isCallable = typeof made[row.name] === 'function'
      expect(isCallable, `${row.row} ${row.name}`).toBe(!row.isProperty)
    }
  })

  it('the copy is table T-107 in its own order, names and parts of speech', () => {
    const table = specTable('T-107').rows.filter((row) => !SURFACE_LACKS.includes(row.id))
    expect(T_107.map((row) => row.row)).toEqual(table.map((row) => row.id))
    expect(T_107.map((row) => row.name)).toEqual(table.map((row) => bare(row.by['確定名'] ?? '')))
    expect(T_107.map((row) => row.isProperty)).toEqual(
      table.map((row) => (row.by['品詞と純粋性'] ?? '').startsWith(PROPERTY)),
    )
    expect(unbroken(specTable('T-107').rows.find((row) => row.id === 'AM-25')?.by['何を担うか'] ?? '')).toContain(
      AM_25_RETURNS,
    )
  })

  it('carries no member table T-107 does not list (PI-17 publishes the roster and nothing beside it)', () => {
    const names = Object.keys(api())
    expect(names).toHaveLength(T_107.length)
    expect([...names].sort()).toEqual([...T_107.map((row) => row.name)].sort())
  })

  it('keeps the table order, which rule 03 asks a printed order to be kept in', () => {
    expect(Object.keys(api())).toEqual(T_107.map((row) => row.name))
  })
})

describe('AM-1 / AM-2 -- the two versions', () => {
  it('AM-1 answers a value a caller can compare before it goes on (AG-1)', () => {
    const version = bench().api.agentApiVersion
    expect(version).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/)
  })

  it('AM-1 is the date-time of JDG-2741 -- the tripwire rule 06 asks PND-60 to leave behind', () => {
    // Why: no table states the starting value, so this case is the tripwire that falls over when
    // the pending decision is settled the other way.
    expect(bench().api.agentApiVersion).toBe('2026-10-19T01:15:00Z')
  })

  it("AM-2 answers the build's version, not the open document's (T-107 AM-2)", () => {
    const one = bench()
    expect(one.api.schemaVersion).toBe(one.schemaVersion)
  })

  it("AM-2 keeps answering the build's version after the document is replaced", () => {
    const one = bench()
    one.document = { ...one.document, schemaVersion: '1970-01-01' } as Document
    expect(one.api.schemaVersion).toBe(one.schemaVersion)
    expect(one.api.readDocument(false, [], []).schemaVersion).toBe('1970-01-01')
  })
})

describe('AM-3 to AM-5 -- AG-4, a frozen copy in both of its words', () => {
  it('AM-3 answers a copy that shares nothing with the running document', () => {
    const one = bench()
    // Why: carry and carryElements are left out unless asked for, so ask for them to compare the whole (see AM-3)
    const read = one.api.readDocument(true, [], [])

    expect(read).toEqual(one.document)
    expect(sharesNothingWith(read, one.document)).toBe(true)
  })

  it('AM-3 answers a value that is frozen all the way down', () => {
    expect(everythingFrozen(bench().api.readDocument(false, [], []))).toBe(true)
  })

  it('AM-3: writing to what was handed over does not change the application (AG-4)', () => {
    const one = bench()
    const read = one.api.readDocument(false, [], []) as unknown as Loose
    const titleBefore = (one.document.schedule as unknown as Loose)['project']

    // Why: AG-4 states the outcome, not the mechanism: in a module a frozen value throws on write,
    // so the throw is the freeze working; the row cares about the line after it.
    expect(() => {
      read['schemaVersion'] = 'tampered'
    }).toThrow()
    expect((one.document.schedule as unknown as Loose)['project']).toBe(titleBefore)
    expect(one.document.schemaVersion).not.toBe('tampered')
  })

  it('AM-4 answers a frozen copy of the stamp, with the four fields DR-4 names', () => {
    const one = bench()
    const stamp = one.api.readStamp()

    expect(stamp).toEqual(one.document.documentStamp)
    expect(stamp).not.toBe(one.document.documentStamp)
    expect(Object.isFrozen(stamp)).toBe(true)
    // Spec: AT-140, DR-4
    expect([...Object.keys(stamp)].sort()).toEqual([
      'fileSavedAt',
      'lastEditedBy',
      'scheduleUpdatedAt',
      'settingsUpdatedAt',
    ])
  })

  it('AM-5 answers a frozen copy of the selection, keeping the order SL-7b keeps', () => {
    const one = bench()
    one.selection = selectionWith(
      selectionWith(emptySelection(), { kind: 'task', uid: SECOND_UID }),
      { kind: 'task', uid: FIRST_UID },
    )
    const read = one.api.readSelection()

    expect(read).toEqual(one.selection)
    expect(sharesNothingWith(read, one.selection)).toBe(true)
    expect(everythingFrozen(read)).toBe(true)
    expect(read.items.map((item) => (item.kind === 'task' ? item.uid : null))).toEqual([
      SECOND_UID,
      FIRST_UID,
    ])
  })

  it('AM-5 answers the empty selection when nothing is picked (UN-9 keeps it out of the document)', () => {
    const one = bench()
    expect(one.api.readSelection().items).toEqual([])
    expect(one.api.readDocument(false, [], []) as unknown as Loose).not.toHaveProperty('selection')
  })

  it('every read answers the value as it now stands, never a value cached at install', () => {
    const one = bench()
    const before = one.api.readStamp()
    accepted(one.api.applyCommands({ expectedStamp: before, commands: [RENAME] }))

    expect(one.api.readStamp()).not.toEqual(before)
    expect(one.api.readDocument(false, [], []).schedule.project.title).toBe(RENAME.title)
  })

  it('a read is answered mid-gesture, because CS-2 froze the document at pointer-down', () => {
    const one = bench()
    one.isGestureInFlight = true
    one.isEditingInPlace = true

    expect(() => one.api.readDocument(false, [], [])).not.toThrow()
    expect(one.api.readDocument(false, [], []).schemaVersion).toBe(one.document.schemaVersion)
    expect(one.api.readStamp()).toEqual(one.document.documentStamp)
  })
})

describe('AM-7 applyCommands -- the ordinary case', () => {
  it('accepts a bundle written against the current stamp and answers the stamp after it', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(outcome.stamp).toEqual(one.document.documentStamp)
    expect(one.document.schedule.project.title).toBe(RENAME.title)
  })

  it('moves the schedule-data instant for a schedule-data change and says so (FR-063)', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(outcome.hasUpdatedSchedule).toBe(true)
    expect(outcome.stamp.scheduleUpdatedAt).toBe(READ_AT)
  })

  it('does NOT move the schedule instant for a presentation-group change (FR-063 MUST NOT)', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RECOLOR] }),
    )

    expect(outcome.hasUpdatedSchedule).toBe(false)
    expect(outcome.stamp.scheduleUpdatedAt).toBe(STARTING_STAMP.scheduleUpdatedAt)
  })

  it('refreshes who wrote and when even when the schedule instant did not move (FR-063 MUST)', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RECOLOR] }),
    )

    expect(outcome.stamp.lastEditedBy).toBe(one.writerName)
    expect(outcome.stamp.settingsUpdatedAt).toBe(READ_AT)
    expect(outcome.stamp.settingsUpdatedAt).not.toBe(STARTING_STAMP.settingsUpdatedAt)
  })

  it('records the write under the name AM-17 subscribes with (AG-6 needs one name)', () => {
    const one = bench()
    accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))
    expect(one.document.documentStamp.lastEditedBy).toBe(one.writerName)
  })

  it('is one step of the undo history, however many commands the bundle held (FR-031)', () => {
    const one = bench()
    accepted(
      one.api.applyCommands({
        expectedStamp: one.api.readStamp(),
        commands: [RENAME, { kind: 'setStatusDate', statusDate: '2026-08-20T00:00:00' }],
      }),
    )

    expect(one.history.done).toHaveLength(1)
  })

  it('answers with a value for an empty bundle rather than throwing (FR-028)', () => {
    const one = bench()
    const outcome = one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [] })

    expect(typeof outcome.ok).toBe('boolean')
    expect(one.document.documentStamp.scheduleUpdatedAt).toBe(STARTING_STAMP.scheduleUpdatedAt)
  })
})

describe('AM-7 applyCommands -- AG-2, the optimistic lock', () => {
  it('turns a write away when any one of the three stamp fields differs (WS-1, MUST)', () => {
    for (const row of T_067_WS1) {
      const one = bench()
      const stale = { ...one.api.readStamp(), ...row.differs }
      const outcome = refused(one.api.applyCommands({ expectedStamp: stale, commands: [RENAME] }))

      expect(outcome.refusal.reason, row.field).toBe('staleStamp')
      expect(one.document.schedule.project.title, row.field).not.toBe(RENAME.title)
    }
  })

  it('answers a stale write with the current stamp and NO document (AG-2, MUST NOT)', () => {
    const one = bench()
    const stale = { ...one.api.readStamp(), scheduleUpdatedAt: '1999-01-01T00:00:00Z' }
    const outcome = refused(one.api.applyCommands({ expectedStamp: stale, commands: [RENAME] }))

    // Why: a staleStamp refusal carries only the stamp (see AG-2, AV-3)
    expect(outcome.refusal).not.toHaveProperty('document')
    expect(outcome.refusal.stamp).toEqual(one.document.documentStamp)
  })

  it('carries the whole current stamp, so the caller can retry from the answer (AG-2)', () => {
    const one = bench()
    const stale = { ...one.api.readStamp(), scheduleUpdatedAt: '1999-01-01T00:00:00Z' }
    const first = refused(one.api.applyCommands({ expectedStamp: stale, commands: [RENAME] }))

    const retry = accepted(
      one.api.applyCommands({ expectedStamp: first.refusal.stamp, commands: [RENAME] }),
    )
    expect(retry.hasUpdatedSchedule).toBe(true)
  })
})

describe('AM-7 applyCommands -- AG-3, one refusal drops the bundle', () => {
  it('leaves the document untouched when a later command is refused (WS-3, MUST)', () => {
    const one = bench()
    const before = one.document

    const outcome = refused(
      one.api.applyCommands({
        expectedStamp: one.api.readStamp(),
        commands: [{ kind: 'setStatusDate', statusDate: '2026-08-20T00:00:00' }, BAD_RENAME],
      }),
    )

    expect(outcome.refusal.reason).toBe('commandRefused')
    expect(one.document).toBe(before)
    expect(one.document.schedule.project.statusDate).toBe(before.schedule.project.statusDate)
  })

  it('leaves no undo step behind when the bundle was dropped (WS-3 before WS-4)', () => {
    const one = bench()
    refused(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [BAD_RENAME] }))
    expect(one.history.done).toHaveLength(0)
  })
})

describe('AM-7 applyCommands -- AG-9, a person is part way through something', () => {
  it('is turned away mid-gesture, and the refusal says which of the two it was (WS-2)', () => {
    const one = bench()
    one.isGestureInFlight = true

    const outcome = refused(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }),
    )
    expect(outcome.refusal.reason).toBe('gestureInFlight')
  })

  it('is turned away while an in-place edit is unsettled, under its own reason (WS-2)', () => {
    const one = bench()
    one.isEditingInPlace = true

    const outcome = refused(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }),
    )
    expect(outcome.refusal.reason).toBe('editingInPlace')
  })

  it('accepts again once the gesture has ended (IN-1a is why the flag must be able to fall)', () => {
    const one = bench()
    one.isGestureInFlight = true
    refused(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))

    one.isGestureInFlight = false
    expect(accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] })))
      .toBeTruthy()
  })
})

describe('IF-7 -- every current value arrives over the seam (LY-5 of table T-060)', () => {
  it('hands the write path the zoom and Task Group Area bounds it was given (S-97 / S-98 / FR-052)', () => {
    const one = bench()
    // Why: FR-052 is judged against a bound only the snapshot carries, so the refusal is the
    // evidence that the bound traveled.
    const { refusal } = refused(
      one.api.applyCommands({
        expectedStamp: one.api.readStamp(),
        commands: [
          {
            kind: 'setTaskGroupPanelWidthPx',
            // Why: the bound is drawn px and CM-67 writes a stored width, which FR-039 scales on the way in.
            taskGroupPanelWidthPx:
              SETTINGS_LIMITS.taskGroupAreaWidthWithoutPanels / displayRatioOf(one.document.documentSettings),
          },
        ],
      }),
    )

    expect(refusal.reason).toBe('commandRefused')
    expect(refusal.refusals.map((each) => each.rule)).toContain('FR-052')
  })

  it('hands the write path the history bound it was given (S-94)', () => {
    const one = bench()
    one.historyLimits = { ...one.historyLimits, maxSteps: 1 }

    accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))
    accepted(
      one.api.applyCommands({
        expectedStamp: one.api.readStamp(),
        commands: [{ kind: 'setStatusDate', statusDate: '2026-08-20T00:00:00' }],
      }),
    )

    expect(one.history.done).toHaveLength(1)
  })

  it('reads the seam once per call, and never part way through one (R7.4 / CS-3)', () => {
    const one = bench()
    const before = one.snapshotReads

    one.api.readDocument(false, [], [])
    expect(one.snapshotReads).toBe(before + 1)

    one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] })
    expect(one.snapshotReads).toBe(before + 3)
  })
})

describe('Chapter 5.5 -- a write attempted while notices are going out', () => {
  it('is turned away as a value, not as a throw, and says which step refused it', () => {
    const one = bench()
    let fromInside: AgentWriteOutcome | null = null
    one.api.watchChanges(() => {
      fromInside = one.api.applyCommands({
        expectedStamp: one.api.readStamp(),
        commands: [RECOLOR],
      })
    })

    one.writeAsPerson([RENAME], 'a person at the keyboard')

    expect(fromInside).not.toBeNull()
    const outcome = refused(fromInside as unknown as AgentWriteOutcome)
    expect(outcome.refusal.reason).toBe('deliveringNotices')
    expect(outcome.refusal.target).toBe('AM-7')
  })
})

describe('AG-9a / NT-1 -- what a refusal carries', () => {
  it('names the row of table T-107 that was called, the category, and the current stamp (MUST)', () => {
    const one = bench()
    one.isGestureInFlight = true
    const { refusal } = refused(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(refusal.target).toBe('AM-7')
    expect(typeof refusal.reason).toBe('string')
    // Spec: AG-9a, UC-012
    // Why: AG-9a still words the third field as a version FR-063 no longer has; the whole current
    // stamp stands in its place.
    expect(refusal.stamp).toEqual(one.document.documentStamp)
    expect(Object.keys(refusal)).not.toContain('revision')
  })

  it('carries no document when the stamp was not the thing at fault (AG-2 names one case)', () => {
    const one = bench()
    one.isEditingInPlace = true
    const { refusal } = refused(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(refusal).not.toHaveProperty('document')
  })

  it('says WHICH command was wrong and which rule refused it (NT-1 of table T-037)', () => {
    const one = bench()
    const { refusal } = refused(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [BAD_RENAME] }),
    )

    expect(refusal.refusals.length).toBeGreaterThan(0)
    for (const each of refusal.refusals) {
      // Why: a refusal that names a row ID can be traced back to table T-108 and to the requirement
      // that owns the rule.
      expect(each.command).toMatch(/^CM-\d+$/)
      expect(each.rule.length).toBeGreaterThan(0)
      expect(each.what.length).toBeGreaterThan(0)
    }
  })

  it('says nothing about commands when nothing was refused by WS-3', () => {
    const one = bench()
    one.isGestureInFlight = true
    const { refusal } = refused(
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(refusal.refusals).toEqual([])
  })
})

describe('AM-16 focusTask -- the view, not the schedule', () => {
  it('writes the two rows table T-107 names for it, S-77 and S-78', () => {
    const one = bench()
    expect(one.document.documentSettings.scrollDate).toBeNull()
    expect(one.document.documentSettings.scrollTaskGroupId).toBeNull()

    accepted(one.api.focusTask(FIRST_UID))

    expect(one.document.documentSettings.scrollDate).not.toBeNull()
    expect(one.document.documentSettings.scrollTaskGroupId).not.toBeNull()
  })


  // Why: the old place (group at the top, start S-428 inside) is retired and not asserted here;
  // the SJ-5 and SJ-6 tests hold the place that replaced it.
  it('names a TaskGroup id in S-78, not an integer (table T-203 says so in as many words)', () => {
    const one = bench()
    accepted(one.api.focusTask(FIRST_UID))

    const written = one.document.documentSettings.scrollTaskGroupId
    expect(one.document.schedule.taskGroups.map((group) => group.id)).toContain(written)
  })

  it(`leaves no undo step when no task group opens: SJ-2 ${SJ_2_NO_STEP}, and UN-8 keeps scrolling out`, () => {
    expect(unbroken(specTable('T-332').rows.find((row) => row.id === 'SJ-2')?.by['定め'] ?? '')).toContain(SJ_2_NO_STEP)
    const one = bench(true, OPEN_SCHEDULE)
    accepted(one.api.focusTask(FIRST_UID))
    expect(one.history.done).toHaveLength(0)
  })

  it('moves no part of the stamp when no task group opens: a scroll alone is outside T-027 (FR-063, CR-807)', () => {
    const one = bench(true, OPEN_SCHEDULE)
    const outcome = accepted(one.api.focusTask(FIRST_UID))

    expect(outcome.hasUpdatedSchedule).toBe(false)
    expect(outcome.stamp.scheduleUpdatedAt).toBe(STARTING_STAMP.scheduleUpdatedAt)
    expect(outcome.stamp.lastEditedBy).toBe(STARTING_STAMP.lastEditedBy)
    expect(outcome.stamp.settingsUpdatedAt).toBe(STARTING_STAMP.settingsUpdatedAt)
  })

  it('refuses a uid no task carries, as a value, naming its own row (FR-028 / AG-9a)', () => {
    const one = bench()
    const { refusal } = refused(one.api.focusTask(ABSENT_UID))

    expect(refusal.target).toBe('AM-16')
    expect(refusal.reason).toBe('unknownTask')
    expect(one.document.documentSettings.scrollDate).toBeNull()
  })

  it('refuses before a frame has settled the dimensions (BO-1 / NFR-011)', () => {
    const one = bench(false)
    const { refusal } = refused(one.api.focusTask(FIRST_UID))

    expect(refusal.target).toBe('AM-16')
    expect(refusal.reason).toBe('notDrawnYet')
  })

  it('is turned away mid-gesture by the same WS-2 step every write goes through', () => {
    const one = bench()
    one.isGestureInFlight = true
    const { refusal } = refused(one.api.focusTask(FIRST_UID))

    expect(refusal.reason).toBe('gestureInFlight')
  })
})

describe('AM-11 exportJson -- AG-7 and the round trip', () => {
  it('answers the GRS JSON as a value, as a value (AG-7)', () => {
    const text = exported(bench().api.exportJson())
    expect(typeof text).toBe('string')
    expect(() => JSON.parse(text) as unknown).not.toThrow()
  })

  it('round trips: what AM-11 wrote reads back as what AM-3 answers (FR-021)', () => {
    const one = bench()
    const read = documentFromJson(exported(one.api.exportJson()))

    expect(read.ok, JSON.stringify(read.ok ? [] : read.faults)).toBe(true)
    // Why: the whole document, so carry and carryElements are asked for (see AM-3)
    if (read.ok) expect(read.document).toEqual(one.api.readDocument(true, [], []))
  })

  it('writes the document as it now stands, not as it stood at install', () => {
    const one = bench()
    accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))
    const read = documentFromJson(exported(one.api.exportJson()))

    expect(read.ok).toBe(true)
    if (read.ok) expect(read.document.schedule.project.title).toBe(RENAME.title)
  })
})

describe('AM-12 exportMspdi -- wired 2026-09-05, no longer a refusal (AG-7, FR-028)', () => {
  it('answers the MSPDI text as a value, not the AM-12 refusal the roster once expected', () => {
    const one = bench()
    const answer = one.api.exportMspdi()

    expect(answer.ok).toBe(true)
    if (answer.ok) expect(typeof answer.value).toBe('string')
  })

  it('adds no rule of its own: the value is exactly what mspdiFromDocument answers for the same document', () => {
    const one = bench()
    const text = exported(one.api.exportMspdi())

    expect(text).toBe(mspdiFromDocument(one.document, LAST_SAVED_AT).text)
  })
})

describe('AM-13 exportSvg -- the picture as a value', () => {
  it('answers a picture once a frame has been computed', () => {
    const svg = exported(bench().api.exportSvg())
    expect(svg.startsWith('<svg')).toBe(true)
  })

  it('refuses as a value before a frame has settled (BO-1, NFR-011, FR-028)', () => {
    const answer = bench(false).api.exportSvg()

    expect(answer.ok).toBe(false)
    if (!answer.ok) {
      expect(answer.refusal.target).toBe('AM-13')
      expect(answer.refusal.reason).toBe('notDrawnYet')
    }
  })

  it('answers with a value rather than throwing while a gesture is in flight (FR-028)', () => {
    // Why: AG-9 states the refusal for writes only and nothing states one for a picture; every row
    // states the answer is a value, so that is what this case pins.
    const one = bench()
    one.isGestureInFlight = true

    const answer = one.api.exportSvg()
    expect(typeof answer.ok).toBe('boolean')
    if (!answer.ok) {
      // Spec: AG-9a
      expect(answer.refusal.target).toBe('AM-13')
      expect(typeof answer.refusal.reason).toBe('string')
      expect(answer.refusal.stamp).toEqual(one.document.documentStamp)
    }
  })
})

describe('the five rows with nowhere to hand the work -- FR-028 and AG-8', () => {
  // Why: every call is awaited, since AM-14 and AM-15 answer promises and await on a plain value
  // answers that value, so one shape walks all five rows.
  const callOf: Record<
    string,
    (api: AgentApi) => Promise<{ readonly target: string } | null>
  > = {
    'AM-8': async (api) => {
      const answer = await api.importDocument({ text: '{}' })
      return answer.ok ? null : answer.refusal
    },
    'AM-9': async (api) => {
      const answer = api.undoEdit(api.readStamp())
      return answer.ok ? null : answer.refusal
    },
    'AM-10': async (api) => {
      const answer = api.redoEdit(api.readStamp())
      return answer.ok ? null : answer.refusal
    },
    'AM-14': async (api) => {
      const answer = await api.exportPng()
      return answer.ok ? null : answer.refusal
    },
    'AM-15': async (api) => {
      const answer = await api.exportEmbeddedHtml()
      return answer.ok ? null : answer.refusal
    },
  }

  it('answers each one with a refusal VALUE that names its own row (FR-028 MUST NOT throw)', async () => {
    const api = bench().api
    for (const row of T_035_UNWIRED) {
      const call = callOf[row]
      expect(call, row).toBeDefined()
      const refusal = call === undefined ? null : await call(api)
      expect(refusal, `${row} answered as if it had done the work`).not.toBeNull()
      expect(refusal?.target, row).toBe(row)
    }
  })

  it('none of them touches the document (a wrong answer wearing a right shape)', async () => {
    const one = bench()
    const before = one.document
    for (const row of T_035_UNWIRED) await callOf[row]?.(one.api)
    expect(one.document).toBe(before)
  })
})

describe('AM-17 watchChanges -- AG-6', () => {
  it('wakes for a write somebody else settled', () => {
    const one = bench()
    one.api.watchChanges((notice) => one.notices.push(notice))

    one.writeAsPerson([RENAME], 'a person at the keyboard')

    expect(one.notices).toHaveLength(1)
    // Why: the notice carries the stamp; the caller reads again what it needs (see AV-14, AG-6)
    expect(one.notices[0]?.stamp).toEqual(one.api.readStamp())
    expect(one.api.readDocument(false, [], []).schedule.project.title).toBe(RENAME.title)
  })

  it('is NOT woken by its own write (AG-6, MUST NOT)', () => {
    const one = bench()
    one.api.watchChanges((notice) => one.notices.push(notice))

    accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))

    expect(one.notices).toEqual([])
  })

  it('is told only what happens from now on -- the tripwire PND-62 asks for', () => {
    // Why: AG-6 says nothing of what a watcher that never received anything is owed; this case
    // falls over when the pending decision is settled the other way.
    const one = bench()
    one.writeAsPerson([RENAME], 'a person at the keyboard')

    one.api.watchChanges((notice) => one.notices.push(notice))
    expect(one.notices).toEqual([])
    one.writeAsPerson([{ kind: 'setProjectTitle', title: 'said after' }], 'a person at the keyboard')

    expect(one.notices).toHaveLength(1)
  })

  it('hands back a way to stop, since table T-107 has no member for it', () => {
    const one = bench()
    const watch = one.api.watchChanges((notice) => one.notices.push(notice))

    expect(watch.stopWatching()).toBe(true)
    one.writeAsPerson([RENAME], 'a person at the keyboard')
    expect(one.notices).toEqual([])
    expect(watch.stopWatching()).toBe(false)
  })

  it('says when a second subscription replaced the first under the one AG-6 identity', () => {
    const one = bench()
    expect(one.api.watchChanges(() => undefined).hasReplacedEarlierWatch).toBe(false)
    expect(one.api.watchChanges(() => undefined).hasReplacedEarlierWatch).toBe(true)
  })
})

describe('the boundaries -- empty, one, and the bound itself', () => {
  it('answers every row of table T-107 over a document whose schedule is empty', () => {
    expect(() => callEveryMember(bench(true, EMPTY_SCHEDULE).api)).not.toThrow()
  })

  it('AM-3 and AM-11 still answer for an empty schedule, and still round trip (FR-021)', () => {
    const one = bench(true, EMPTY_SCHEDULE)

    expect(one.api.readDocument(false, [], []).schedule.tasks).toEqual([])
    const read = documentFromJson(exported(one.api.exportJson()))
    expect(read.ok, JSON.stringify(read.ok ? [] : read.faults)).toBe(true)
    if (read.ok) expect(read.document).toEqual(one.api.readDocument(true, [], []))
  })

  it('AM-16 refuses over an empty schedule, because no uid names a task there', () => {
    const { refusal } = refused(bench(true, EMPTY_SCHEDULE).api.focusTask(FIRST_UID))

    expect(refusal.target).toBe('AM-16')
    expect(refusal.reason).toBe('unknownTask')
  })

  it('AM-7 takes a bundle of one and a bundle of many as one step each (FR-031)', () => {
    const one = bench()
    accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))
    accepted(
      one.api.applyCommands({
        expectedStamp: one.api.readStamp(),
        commands: [
          { kind: 'setStatusDate', statusDate: '2026-08-20T00:00:00' },
          { kind: 'setThemeHue', themeHue: 200 },
          { kind: 'setProjectTitle', title: 'a third name' },
        ],
      }),
    )

    expect(one.history.done).toHaveLength(2)
  })

  it('AM-7 keeps only as many steps as the bound the seam handed over (S-94, one step)', () => {
    const one = bench()
    one.historyLimits = { ...one.historyLimits, maxSteps: 1 }
    accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))
    accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RENAME] }))

    expect(one.history.done).toHaveLength(1)
  })

  it('AM-7 runs a command table T-027 excludes and leaves no step (AG-10, MUST)', () => {
    const one = bench()
    // Spec: UN-16
    const outcome = accepted(
      one.api.applyCommands({
        expectedStamp: one.api.readStamp(),
        commands: [{ kind: 'setTaskGroupPanelWidthPx', taskGroupPanelWidthPx: 200 }],
      }),
    )

    expect(outcome.hasUpdatedSchedule).toBe(false)
    expect(one.history.done).toHaveLength(0)
    expect(one.document.documentSettings.taskGroupPanelWidthPx).toBe(200)
  })
})

describe('FR-028 -- accepted or refused, always as a value', () => {
  it('answers every row of table T-107 without throwing, in an ordinary state', () => {
    expect(() => callEveryMember(bench().api)).not.toThrow()
  })

  it('answers every row without throwing before a frame has settled', () => {
    expect(() => callEveryMember(bench(false).api)).not.toThrow()
  })

  it('answers every row without throwing while a person is mid-gesture', () => {
    const one = bench()
    one.isGestureInFlight = true
    one.isEditingInPlace = true
    expect(() => callEveryMember(one.api)).not.toThrow()
  })

  // Spec: FR-028, FR-022, IO-4
  // Why: FR-028 forbids the throw, not the wait; AM-8 (FR-022 waits for U-61) and AM-14 (IO-4
  // decodes first) must be promises, so only the ten that need no wait are pinned here.
  it('answers no promise from the ten rows that need no wait (FR-028)', () => {
    const one = bench()
    const isThenable = (value: unknown): boolean =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { then?: unknown }).then === 'function'

    const answers: unknown[] = [
      one.api.readDocument(false, [], []),
      one.api.readStamp(),
      one.api.readSelection(),
      one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [] }),
      one.api.undoEdit(one.api.readStamp()),
      one.api.redoEdit(one.api.readStamp()),
      one.api.exportJson(),
      one.api.exportMspdi(),
      one.api.exportSvg(),
      one.api.focusTask(FIRST_UID),
    ]

    for (const answer of answers) expect(isThenable(answer)).toBe(false)
  })

  // Why: a rejected promise is an exception the caller must catch, and AG-8 asks for the failure
  // as a value; AM-8 is judged on ok, the verdict key of AgentWriteOutcome.
  it('AM-8, AM-14 and AM-15 answer a promise that SETTLES, never one that rejects', async () => {
    const one = bench()
    await expect(one.api.importDocument({ text: '{}' })).resolves.toHaveProperty('ok')
    await expect(one.api.exportPng()).resolves.toHaveProperty('ok')
    await expect(one.api.exportEmbeddedHtml()).resolves.toHaveProperty('ok')
  })

  it('a subscriber that throws does not turn an accepted write into an exception', () => {
    const one = bench()
    one.api.watchChanges(() => {
      throw new Error('a subscriber that misbehaves')
    })

    // Why: the write is somebody else's, so AG-6 does wake the watcher that throws.
    expect(() => one.writeAsPerson([RENAME], 'a person at the keyboard')).not.toThrow()
    expect(() =>
      accepted(one.api.applyCommands({ expectedStamp: one.api.readStamp(), commands: [RECOLOR] })),
    ).not.toThrow()
  })
})

// Spec: T-024, IO-3
const T_024_IO_3 = {
  id: 'IO-3',
  format: 'SVG',
  canWrite: true,
  canRead: false,
  sizeRow: 'S-81',
} as const

function rootSizeOf(svg: string): { readonly width: number; readonly height: number } {
  const root = /<svg((?:[^<>"]|"[^"]*")*)>/.exec(svg)?.[1] ?? ''
  const attr = (name: string): number =>
    Number.parseFloat(new RegExp(`${name}="([^"]*)"`).exec(root)?.[1] ?? 'NaN')
  return { width: attr('width'), height: attr('height') }
}

describe('AM-13 exportSvg -- the picture is the EXPORT (IO-3 of table T-024, S-81)', () => {
  it('GIVEN a settled frame WHEN AM-13 answers THEN the picture is exportCanvas wide and tall (IO-3, S-81 of table T-204)', () => {
    const one = bench()
    const svg = exported(one.api.exportSvg())
    const canvas = SETTINGS_CONSTANTS.exportCanvas

    expect(T_024_IO_3.sizeRow).toBe('S-81')
    // Spec: FR-025, S-217
    const size = rootSizeOf(svg)
    expect(size.width).toBe(canvas.width)
    expect(size.height).toBeGreaterThanOrEqual(canvas.height)
    expect(size.height).toBeLessThanOrEqual(SETTINGS_CONSTANTS.exportCanvasHeightCap)
  })

  it('GIVEN a settled frame WHEN AM-13 answers THEN what comes back is one SVG document, not a fragment', () => {
    const svg = exported(bench().api.exportSvg())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('GIVEN one unchanged state WHEN AM-13 answers twice THEN the same picture comes back both times (WY-2 premise)', () => {
    // Spec: WY-2, CS-1
    // Why: reading the clock inside a frame would move the picture between two calls, so two
    // answers of one state are compared.
    const one = bench()
    expect(exported(one.api.exportSvg())).toBe(exported(one.api.exportSvg()))
  })

  it('GIVEN a document whose schedule is empty WHEN AM-13 answers THEN a picture still comes back as a value', () => {
    // Spec: FR-025
    // Why: the empty boundary: a short picture's remainder is left blank, so an empty schedule is
    // a picture, not a refusal.
    const one = bench(true, EMPTY_SCHEDULE)
    const answer = one.api.exportSvg()

    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    const canvas = SETTINGS_CONSTANTS.exportCanvas
    // Spec: FR-025, S-217
    const size = rootSizeOf(answer.value)
    expect(size.width).toBe(canvas.width)
    expect(size.height).toBeGreaterThanOrEqual(canvas.height)
    expect(size.height).toBeLessThanOrEqual(SETTINGS_CONSTANTS.exportCanvasHeightCap)
  })

  it('GIVEN no frame has settled WHEN AM-13 answers THEN the refusal is a value naming its own row (FR-028, AG-9a)', () => {
    // Why: the error path, set against the cases above so that a picture and a refusal cannot
    // both be answered by one shape.
    const answer = bench(false).api.exportSvg()

    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(answer.refusal.target).toBe('AM-13')
    expect(Object.keys(answer).sort()).toEqual(['ok', 'refusal'])
  })
})
