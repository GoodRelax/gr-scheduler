// Unit tests for UF-27 `agent-api-endpoint.ts` (the public entry), UF-28
// `agent-api-members.ts` (the eighteen members) and UF-29 `snapshot-source.ts`
// (the seam declaration) -- table T-075 of docs/spec/05-07-design.md, component
// `AgentApiEndpoint` (CP-17 of table T-062), published as PI-17 of table T-064.
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODIES (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, and of the three files only their head comments, their exported types
// and their exported signatures. Every expected value here comes from a
// requirement or a table row, never from the implementation.
//
// The rows these cases answer to:
//   table T-107   the eighteen members: the names, the order, the groups, and
//                 the part-of-speech column that says which two are properties
//   table T-035   AG-1 the version, AG-2 the optimistic lock, AG-3 atomicity,
//                 AG-4 the frozen copy, AG-6 which writers wake a watcher,
//                 AG-7 an export is a value, AG-8 a failed image is a value,
//                 AG-9 the two mid-gesture flags, AG-9a what a refusal carries,
//                 AG-10 a call that runs but leaves no step, AG-11 the
//                 utterance order
//   FR-028        accepted or refused, as a value; never a thrown exception
//   FR-063        the schedule-data instant moves only for the schedule-data
//                 group, and the writer and the settings instant are refreshed
//                 either way. ⛔ The stamp is never read as an order
//   FR-065        nothing is exposed until the install call is made
//   FR-031        one call is one step of the undo history
//   table T-067   WS-1 the three-field stamp match, WS-2 the moment, WS-3 the
//                 whole bundle dropped on one refusal
//   table T-027   UN-8 and UN-16 keep the view out of the history; UN-9 keeps
//                 the selection out of the document
//   table T-037   NT-1: a refusal says WHICH item is wrong and why
//   table T-203   S-77 and S-78, the two the view position is written into
//   FR-021        the round trip loses nothing (exercised through AM-11)
//
// Chapter 1.9 (:275) asks a test of a requirement that points at a table to be
// driven by a fixed copy of that table, one test walking every row. T_107,
// T_035_UNWIRED and T_067_WS1 below are those copies.

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
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import {
  emptyDialogueLog,
  type DialogueLog,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
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
  notifyChangeWatchers,
  unwatchChanges,
  type ChangeNotice,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { postDialogueMessage } from '../../src/use-case/post-dialogue-message/post-dialogue-message'
// ⚠️ The one reach into `Framework` this file makes, and it stands in for the
// implementor of IF-7: FR-080's export environment is the shell's to build
// (LY-5 of table T-060, MN-6 of table T-070), so the bench asks the shell for
// one instead of deciding "closed" a second time. See `exportSceneOf`.
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * Table T-107 of `_assets/tbl-glossary.md`, in the table's own order. `isProperty`
 * is the part-of-speech column: the first two rows are properties, the other
 * sixteen are verb-plus-object calls.
 */
const T_107 = [
  { row: 'AM-1', name: 'agentApiVersion', isProperty: true },
  { row: 'AM-2', name: 'schemaVersion', isProperty: true },
  { row: 'AM-3', name: 'readDocument', isProperty: false },
  { row: 'AM-4', name: 'readStamp', isProperty: false },
  { row: 'AM-5', name: 'readSelection', isProperty: false },
  { row: 'AM-6', name: 'readDialogueMessages', isProperty: false },
  { row: 'AM-7', name: 'applyCommands', isProperty: false },
  { row: 'AM-8', name: 'importDocument', isProperty: false },
  { row: 'AM-9', name: 'undoEdit', isProperty: false },
  { row: 'AM-10', name: 'redoEdit', isProperty: false },
  { row: 'AM-11', name: 'exportJson', isProperty: false },
  { row: 'AM-12', name: 'exportMspdi', isProperty: false },
  { row: 'AM-13', name: 'exportSvg', isProperty: false },
  { row: 'AM-14', name: 'exportPng', isProperty: false },
  { row: 'AM-15', name: 'exportEmbeddedHtml', isProperty: false },
  { row: 'AM-16', name: 'focusTask', isProperty: false },
  { row: 'AM-17', name: 'watchChanges', isProperty: false },
  { row: 'AM-18', name: 'postDialogueMessage', isProperty: false },
] as const

/**
 * The rows of table T-107 whose work has no entry to hand to yet, per the head
 * comment of `agent-api-members.ts`. FR-028 is what makes each one answer with
 * a value rather than throwing, so a walk of these is a walk of that MUST NOT.
 */
const T_035_UNWIRED = ['AM-8', 'AM-9', 'AM-10', 'AM-12', 'AM-14', 'AM-15'] as const

/**
 * WS-1 of table T-067 and AG-2 of table T-035: the match is made on all three
 * stamp fields, so each field on its own must be able to turn a write away.
 * The values below are only "something other than what the document holds".
 */
const T_067_WS1 = [
  { field: 'scheduleUpdatedUtc', differs: { scheduleUpdatedUtc: '2026-08-19T11:00:00Z' } },
  { field: 'lastEditedBy', differs: { lastEditedBy: 'somebody else entirely' } },
  { field: 'settingsUpdatedUtc', differs: { settingsUpdatedUtc: '2026-08-19T11:00:00Z' } },
  // ⛔ FR-063 (MUST NOT): 「刻印を順序として読んではならない」. A stamp that
  // reads EARLIER than the document's is a mismatch just the same -- an undo
  // restores one (FR-031), so "older" is not "harmless".
  { field: 'scheduleUpdatedUtc, earlier', differs: { scheduleUpdatedUtc: '1999-01-01T00:00:00Z' } },
  { field: 'settingsUpdatedUtc, earlier', differs: { settingsUpdatedUtc: '1999-01-01T00:00:00Z' } },
] as const

// ---------------------------------------------------------------------------
// The document these cases are driven by.
// ---------------------------------------------------------------------------

// BT-4 of table T-034: the one template FR-027 keeps, held as bundled GRS JSON.
// It is the only document whose values the specification has actually decided,
// so the settings, the project and the calendar come from it rather than from a
// second idea of a document invented here. Only the schedule's rows are cut
// down, so that a case that freezes and copies the whole root does not walk a
// thousand tasks each time.
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
/** A uid no task carries, for AM-16's `unknownTask`. */
const ABSENT_UID = 999_999

const FIRST_START = '2026-04-01T00:00:00'
const SECOND_START = '2026-05-01T00:00:00'

const taskOf = (uid: number, start: string, finish: string): Loose => ({
  ...(templateTasks[0] as Loose),
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: `task ${uid}`,
  start,
  finish,
  actualStart: null,
  actualDuration: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
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
    { taskUid: FIRST_UID, groupId: FIRST_GROUP_ID, stackOrder: null },
    { taskUid: SECOND_UID, groupId: SECOND_GROUP_ID, stackOrder: null },
  ],
  taskVisuals: [],
  resources: [],
  assignments: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
}

/** The stamp the document starts each case with. AT-127 to AT-129 name the three. */
const STARTING_STAMP = {
  scheduleUpdatedUtc: '2026-08-19T10:00:00Z',
  lastEditedBy: 'a person at the keyboard',
  settingsUpdatedUtc: '2026-08-19T10:00:00Z',
} as const

/** The same root with nothing in the schedule: the empty boundary. */
const EMPTY_SCHEDULE: Loose = {
  ...SMALL_SCHEDULE,
  tasks: [],
  taskGroups: [],
  taskGroupMembers: [],
}

const startingDocument = (): Document =>
  ({
    ...TEMPLATE,
    schedule: SMALL_SCHEDULE,
    documentStamp: { ...STARTING_STAMP },
    changeLog: [],
  }) as unknown as Document

// ---------------------------------------------------------------------------
// The values LY-5 of table T-060 keeps outside the three inner layers, which is
// why every one of them arrives through IF-7 rather than being read here.
// ---------------------------------------------------------------------------

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  // S-95 is stated in megabytes; the plan counts bytes.
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}

const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  rowAreaWidthWithoutPanels: 982,
}

const SCREEN: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/** CS-1 of table T-066 keeps the clock on the Framework's side; it arrives as a value. */
const READ_AT = '2026-08-20T08:30:00Z'

/** ADR-001: the frame's three results are computed once and handed round. */
function frameOf(document: Document): FrameSnapshot {
  const settings = document.documentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const geometry = geometryFromLayout(document.schedule, settings, layout, regions, emptySelection())
  return { layout, geometry, regions }
}

/**
 * The other half of what IF-7 hands over: the environment FR-080 builds an
 * export in, which is NOT the frame above -- the two panels that requirement
 * names are closed there, so it is a second run of table T-068.
 *
 * ⭐ ASKED OF THE REAL IMPLEMENTOR rather than assembled here. FR-080's
 * "closed" is decided in ONE place (the shell, MN-6 of table T-070 and
 * ADR-001), and a second copy of that decision living in a test would be a
 * second place for the specification to have to reach. ⚠️ The loop is built
 * per reading because this bench's document is replaced by the writes the
 * cases make, and an environment built from an older one would answer AM-13
 * with a picture of a document no read of this API can return.
 */
function exportSceneOf(document: Document): ExportScene | null {
  return frameLoop({ showSvg: () => undefined }, document, SCREEN).exportScene()
}

// ---------------------------------------------------------------------------
// One running application, small enough to hold in a test.
// ---------------------------------------------------------------------------

interface Bench {
  readonly api: AgentApi
  readonly writerName: string
  readonly schemaVersion: string
  /** How many times a member went through IF-7. FR-065's "nothing runs yet". */
  snapshotReads: number
  document: Document
  history: EditHistory<ChangeStep>
  dialogue: DialogueLog
  selection: Selection
  frame: FrameSnapshot | null
  isGestureInFlight: boolean
  isEditingInPlace: boolean
  /** S-94 / S-95, which the document does not keep. A case may move them. */
  historyLimits: { maxSteps: number; maxTotalSizeBytes: number }
  readAt: string
  /** What a watcher installed through AM-17 was handed. */
  readonly notices: ChangeNotice[]
  /** A write made by somebody who is not this API, through the one write path. */
  writeAsPerson(commands: readonly DocumentCommand[], editedBy: string): void
  /** An utterance settled by somebody who is not this API. */
  speakAsPerson(text: string, author: string): void
}

let benchCount = 0
const openBenches: Bench[] = []

/**
 * A wired API over a fresh document.
 *
 * Each bench takes a writer name of its own because PI-15's registry is
 * module-scoped and keyed by that name (AG-6 gives a watcher no other identity),
 * so two benches sharing one name would share one subscription.
 */
function bench(startWithFrame = true, schedule: Loose = SMALL_SCHEDULE): Bench {
  benchCount += 1
  const writerName = `agent under test ${benchCount}`
  const schemaVersion = TEMPLATE['schemaVersion'] as string
  const document = { ...startingDocument(), schedule } as unknown as Document

  const state = {
    snapshotReads: 0,
    document,
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
    dialogue: emptyDialogueLog(),
    selection: emptySelection(),
    frame: startWithFrame ? frameOf(document) : null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    historyLimits: { ...HISTORY_LIMITS },
    readAt: READ_AT,
    notices: [] as ChangeNotice[],
  }

  const snapshotOf = (): AgentSnapshot => {
    state.snapshotReads += 1
    return {
      document: state.document,
      selection: state.selection,
      dialogue: state.dialogue,
      frame: state.frame,
      // ⚠️ The two absences travel together: an implementor that has settled no
      // size (BO-1 of table T-077) has neither a frame nor an environment to
      // export from, and a bench that had one without the other would be a
      // state no implementor can be in.
      exportScene: state.frame === null ? null : exportSceneOf(state.document),
      isGestureInFlight: state.isGestureInFlight,
      isEditingInPlace: state.isEditingInPlace,
      historyLimits: state.historyLimits,
      settingsLimits: SETTINGS_LIMITS,
      readAt: state.readAt,
    }
  }

  const wiring: AgentApiWiring = {
    source: { readSnapshot: snapshotOf },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    // WS-7 of table T-067: the audience is told after the swap. Handing it on to
    // PI-15 is what a running shell does, and it is what lets AM-17 be observed.
    audience: {
      // ⚠️ WS-5's judgement is the SECOND argument of `ChangeAudience.deliver`
      // and has to be carried through: AG-6 of table T-035 selects a live
      // watcher by it (MUST), and nothing downstream can work it out again.
      deliver: (document, hasMovedSchedule) => {
        notifyChangeWatchers({ document, hasMovedSchedule, dialogue: state.dialogue })
      },
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
        // `false` for an utterance: AG-11 is not a schedule change, which is
        // what `ConfirmedChange.hasMovedSchedule` states for this very case.
        notifyChangeWatchers({ document: state.document, hasMovedSchedule: false, dialogue: log })
      },
    },
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
    get dialogue() {
      return state.dialogue
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
          readStamp: state.document.documentStamp,
          commands,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          historyLimits: state.historyLimits,
          settingsLimits: SETTINGS_LIMITS,
          editedBy,
          updatedUtc: state.readAt,
        },
        wiring.holder,
        wiring.audience,
      )
    },
    speakAsPerson: (text, author) => {
      postDialogueMessage(
        { author, text, settledAt: state.readAt },
        wiring.dialogueHolder,
        wiring.dialogueAudience,
      )
    },
  } as Bench

  openBenches.push(made)
  return made
}

afterEach(() => {
  // PI-15's registry outlives one case, so every subscription this file made is
  // taken back. Without it, a later case's notice would reach an earlier
  // case's receiver.
  for (const one of openBenches) unwatchChanges(one.writerName)
  openBenches.length = 0
})

// ---------------------------------------------------------------------------
// Helpers that read the answers without asserting them into place.
// ---------------------------------------------------------------------------

const RENAME = { kind: 'setProjectTitle', title: 'a new document name' } as const
// CM-1 refuses an empty document name (FR-035), which is what makes it the
// second half of an AG-3 bundle that must be dropped whole.
const BAD_RENAME = { kind: 'setProjectTitle', title: '' } as const
// UN-13 of table T-027 keeps the theme in the presentation group, so FR-063
// does not move the schedule-data instant for it.
const RECOLOUR = { kind: 'setThemeMonochrome', monochrome: true } as const

function accepted(outcome: AgentWriteOutcome): Extract<AgentWriteOutcome, { accepted: true }> {
  if (!outcome.accepted) {
    throw new Error(`expected acceptance, was refused: ${JSON.stringify(outcome.refusal)}`)
  }
  return outcome
}

function refused(outcome: AgentWriteOutcome): Extract<AgentWriteOutcome, { accepted: false }> {
  if (outcome.accepted) throw new Error('expected a refusal, was accepted')
  return outcome
}

function exported<TValue>(answer: AgentExport<TValue>): TValue {
  if (!answer.ok) throw new Error(`expected a value, was refused: ${JSON.stringify(answer.refusal)}`)
  return answer.value
}

/** Every object and array reachable from a value, the value itself included. */
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

/** AG-4's second word: nothing the caller was handed can be written to. */
const everythingFrozen = (value: unknown): boolean => reachable(value).every(Object.isFrozen)

/** AG-4's first word: not one object is shared with the running application. */
function sharesNothingWith(answer: unknown, held: unknown): boolean {
  const theirs = new Set<object>(reachable(held))
  return reachable(answer).every((one) => !theirs.has(one))
}

/** Every member of table T-107 called once, in the table's order. */
function callEveryMember(api: AgentApi): void {
  void api.agentApiVersion
  void api.schemaVersion
  api.readDocument()
  api.readStamp()
  api.readSelection()
  api.readDialogueMessages()
  api.applyCommands({ readStamp: api.readStamp(), commands: [RENAME] })
  api.importDocument({ text: '{}' })
  api.undoEdit()
  api.redoEdit()
  api.exportJson()
  api.exportMspdi()
  api.exportSvg()
  api.exportPng()
  api.exportEmbeddedHtml()
  api.focusTask(FIRST_UID)
  api.watchChanges(() => undefined).stopWatching()
  api.postDialogueMessage('a settled utterance')
}

// ---------------------------------------------------------------------------
// UF-27 -- installation. FR-065 and PI-17.
// ---------------------------------------------------------------------------

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
    // If the install had subscribed, a person's write would reach a receiver
    // this case never gave it, and AG-6's own-write rule would be untestable.
    one.writeAsPerson([RENAME], 'a person at the keyboard')
    expect(one.notices).toHaveLength(0)
  })

  it('two installations are two surfaces (nothing in the folder is shared state)', () => {
    expect(bench().api).not.toBe(bench().api)
  })

  it('publishes one runtime name, PI-17s own, and re-publishes the seam as a type', () => {
    // The other half of PI-17 is `SnapshotSource`, which is a declaration and
    // leaves nothing behind at run time -- the import at the head of this file
    // is what proves Chapter 5.3s re-publication MUST, since no test outside
    // the folder may reach past this entry to get at it.
    expect(Object.keys(agentApiEndpoint)).toEqual(['installAgentApi'])
  })
})

// ---------------------------------------------------------------------------
// UF-28 -- the roster. Table T-107.
// ---------------------------------------------------------------------------

describe('table T-107 -- the roster of eighteen', () => {
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

  it('carries no nineteenth member (PI-17 publishes the roster and nothing beside it)', () => {
    const names = Object.keys(api())
    expect(names).toHaveLength(T_107.length)
    expect([...names].sort()).toEqual([...T_107.map((row) => row.name)].sort())
  })

  it('keeps the table order, which rule 03 asks a printed order to be kept in', () => {
    expect(Object.keys(api())).toEqual(T_107.map((row) => row.name))
  })
})

// ---------------------------------------------------------------------------
// AM-1 and AM-2 -- the two versions.
// ---------------------------------------------------------------------------

describe('AM-1 / AM-2 -- the two versions', () => {
  it('AM-1 answers a value a caller can compare before it goes on (AG-1)', () => {
    const version = bench().api.agentApiVersion
    expect(Number.isFinite(version)).toBe(true)
  })

  it('AM-1 is 1 -- the tripwire rule 06 asks PD-60 to leave behind', () => {
    // Nothing in table T-035, table T-107, `_assets/tbl-settings.md` or Chapter
    // 6.1 states the starting value. This case is what falls over when the
    // pending decision is settled the other way.
    expect(bench().api.agentApiVersion).toBe(1)
  })

  it("AM-2 answers the build's version, not the open document's (T-107 AM-2)", () => {
    const one = bench()
    expect(one.api.schemaVersion).toBe(one.schemaVersion)
  })

  it("AM-2 keeps answering the build's version after the document is replaced", () => {
    const one = bench()
    one.document = { ...one.document, schemaVersion: '1970-01-01' } as Document
    expect(one.api.schemaVersion).toBe(one.schemaVersion)
    expect(one.api.readDocument().schemaVersion).toBe('1970-01-01')
  })
})

// ---------------------------------------------------------------------------
// AM-3 to AM-6 -- AG-4's frozen copy.
// ---------------------------------------------------------------------------

describe('AM-3 to AM-6 -- AG-4, a frozen copy in both of its words', () => {
  it('AM-3 answers a copy that shares nothing with the running document', () => {
    const one = bench()
    const read = one.api.readDocument()

    expect(read).toEqual(one.document)
    expect(sharesNothingWith(read, one.document)).toBe(true)
  })

  it('AM-3 answers a value that is frozen all the way down', () => {
    expect(everythingFrozen(bench().api.readDocument())).toBe(true)
  })

  it('AM-3: writing to what was handed over does not change the application (AG-4)', () => {
    const one = bench()
    const read = one.api.readDocument() as unknown as Loose
    const titleBefore = (one.document.schedule as unknown as Loose)['project']

    // AG-4 states the outcome, not the mechanism: a frozen value refuses the
    // write in strict mode, and this file is a module, so the throw is the
    // freeze doing its work. What the row cares about is the line after it.
    expect(() => {
      read['schemaVersion'] = 'tampered'
    }).toThrow()
    expect((one.document.schedule as unknown as Loose)['project']).toBe(titleBefore)
    expect(one.document.schemaVersion).not.toBe('tampered')
  })

  it('AM-4 answers a frozen copy of the stamp, with the three fields DR-4 names', () => {
    const one = bench()
    const stamp = one.api.readStamp()

    expect(stamp).toEqual(one.document.documentStamp)
    expect(stamp).not.toBe(one.document.documentStamp)
    expect(Object.isFrozen(stamp)).toBe(true)
    expect([...Object.keys(stamp)].sort()).toEqual([
      'lastEditedBy',
      'scheduleUpdatedUtc',
      'settingsUpdatedUtc',
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
    expect(one.api.readDocument() as unknown as Loose).not.toHaveProperty('selection')
  })

  it('AM-6 answers nothing while the log is empty', () => {
    expect(bench().api.readDialogueMessages()).toEqual([])
  })

  it('AM-6 answers one settled utterance, frozen and copied (AG-11)', () => {
    const one = bench()
    one.speakAsPerson('please move the survey phase', 'a person at the keyboard')
    const read = one.api.readDialogueMessages()

    expect(read).toHaveLength(1)
    expect(read[0]?.text).toBe('please move the survey phase')
    expect(everythingFrozen(read)).toBe(true)
    expect(sharesNothingWith(read, one.dialogue)).toBe(true)
  })

  it('every read answers the value as it now stands, never a value cached at install', () => {
    const one = bench()
    const before = one.api.readStamp()
    accepted(one.api.applyCommands({ readStamp: before, commands: [RENAME] }))

    expect(one.api.readStamp()).not.toEqual(before)
    expect(one.api.readDocument().schedule.project.title).toBe(RENAME.title)
  })

  it('a read is answered mid-gesture, because CS-2 froze the document at pointer-down', () => {
    const one = bench()
    one.isGestureInFlight = true
    one.isEditingInPlace = true

    expect(() => one.api.readDocument()).not.toThrow()
    expect(one.api.readDocument().schemaVersion).toBe(one.document.schemaVersion)
    expect(one.api.readStamp()).toEqual(one.document.documentStamp)
  })
})

// ---------------------------------------------------------------------------
// AM-7 -- the write. AG-2, AG-3, AG-9, AG-9a, FR-031, FR-063.
// ---------------------------------------------------------------------------

describe('AM-7 applyCommands -- the ordinary case', () => {
  it('accepts a bundle written against the current stamp and answers the stamp after it', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(outcome.stamp).toEqual(one.document.documentStamp)
    expect(one.document.schedule.project.title).toBe(RENAME.title)
  })

  it('moves the schedule-data instant for a schedule-data change and says so (FR-063)', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(outcome.hasMovedSchedule).toBe(true)
    expect(outcome.stamp.scheduleUpdatedUtc).toBe(READ_AT)
  })

  it('does NOT move the schedule instant for a presentation-group change (FR-063 MUST NOT)', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RECOLOUR] }),
    )

    expect(outcome.hasMovedSchedule).toBe(false)
    expect(outcome.stamp.scheduleUpdatedUtc).toBe(STARTING_STAMP.scheduleUpdatedUtc)
  })

  it('refreshes who wrote and when even when the schedule instant did not move (FR-063 MUST)', () => {
    const one = bench()
    const outcome = accepted(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RECOLOUR] }),
    )

    expect(outcome.stamp.lastEditedBy).toBe(one.writerName)
    expect(outcome.stamp.settingsUpdatedUtc).toBe(READ_AT)
    expect(outcome.stamp.settingsUpdatedUtc).not.toBe(STARTING_STAMP.settingsUpdatedUtc)
  })

  it('records the write under the name AM-17 subscribes with (AG-6 needs one name)', () => {
    const one = bench()
    accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))
    expect(one.document.documentStamp.lastEditedBy).toBe(one.writerName)
  })

  it('is one step of the undo history, however many commands the bundle held (FR-031)', () => {
    const one = bench()
    accepted(
      one.api.applyCommands({
        readStamp: one.api.readStamp(),
        commands: [RENAME, { kind: 'setStatusDate', date: '2026-08-20T00:00:00' }],
      }),
    )

    expect(one.history.done).toHaveLength(1)
  })

  it('answers with a value for an empty bundle rather than throwing (FR-028)', () => {
    const one = bench()
    const outcome = one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [] })

    expect(typeof outcome.accepted).toBe('boolean')
    expect(one.document.documentStamp.scheduleUpdatedUtc).toBe(STARTING_STAMP.scheduleUpdatedUtc)
  })
})

describe('AM-7 applyCommands -- AG-2, the optimistic lock', () => {
  it('turns a write away when any one of the three stamp fields differs (WS-1, MUST)', () => {
    for (const row of T_067_WS1) {
      const one = bench()
      const stale = { ...one.api.readStamp(), ...row.differs }
      const outcome = refused(one.api.applyCommands({ readStamp: stale, commands: [RENAME] }))

      expect(outcome.refusal.reason, row.field).toBe('staleStamp')
      expect(one.document.schedule.project.title, row.field).not.toBe(RENAME.title)
    }
  })

  it('answers a stale write WITH the current document (AG-2, MUST)', () => {
    const one = bench()
    const stale = { ...one.api.readStamp(), scheduleUpdatedUtc: '1999-01-01T00:00:00Z' }
    const outcome = refused(one.api.applyCommands({ readStamp: stale, commands: [RENAME] }))

    expect(outcome.refusal.document).not.toBeNull()
    expect(outcome.refusal.document).toEqual(one.document)
    expect(everythingFrozen(outcome.refusal.document)).toBe(true)
  })

  it('carries the whole current stamp, so the caller can retry from the answer (AG-2)', () => {
    const one = bench()
    const stale = { ...one.api.readStamp(), scheduleUpdatedUtc: '1999-01-01T00:00:00Z' }
    const first = refused(one.api.applyCommands({ readStamp: stale, commands: [RENAME] }))

    const retry = accepted(
      one.api.applyCommands({ readStamp: first.refusal.stamp, commands: [RENAME] }),
    )
    expect(retry.hasMovedSchedule).toBe(true)
  })
})

describe('AM-7 applyCommands -- AG-3, one refusal drops the bundle', () => {
  it('leaves the document untouched when a later command is refused (WS-3, MUST)', () => {
    const one = bench()
    const before = one.document

    const outcome = refused(
      one.api.applyCommands({
        readStamp: one.api.readStamp(),
        commands: [{ kind: 'setStatusDate', date: '2026-08-20T00:00:00' }, BAD_RENAME],
      }),
    )

    expect(outcome.refusal.reason).toBe('commandRefused')
    expect(one.document).toBe(before)
    expect(one.document.schedule.project.statusDate).toBe(before.schedule.project.statusDate)
  })

  it('leaves no undo step behind when the bundle was dropped (WS-3 before WS-4)', () => {
    const one = bench()
    refused(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [BAD_RENAME] }))
    expect(one.history.done).toHaveLength(0)
  })
})

describe('AM-7 applyCommands -- AG-9, a person is part way through something', () => {
  it('is turned away mid-gesture, and the refusal says which of the two it was (WS-2)', () => {
    const one = bench()
    one.isGestureInFlight = true

    const outcome = refused(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }),
    )
    expect(outcome.refusal.reason).toBe('gestureInFlight')
  })

  it('is turned away while an in-place edit is unsettled, under its own reason (WS-2)', () => {
    const one = bench()
    one.isEditingInPlace = true

    const outcome = refused(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }),
    )
    expect(outcome.refusal.reason).toBe('editingInPlace')
  })

  it('accepts again once the gesture has ended (IN-1a is why the flag must be able to fall)', () => {
    const one = bench()
    one.isGestureInFlight = true
    refused(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))

    one.isGestureInFlight = false
    expect(accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] })))
      .toBeTruthy()
  })
})

describe('IF-7 -- every current value arrives over the seam (LY-5 of table T-060)', () => {
  it('hands the write path the zoom and Row Area bounds it was given (S-97 / S-98 / FR-052)', () => {
    const one = bench()
    // FR-052 is judged against `rowAreaWidthWithoutPanels`, which only the
    // snapshot carries. A pair that overruns it can be refused only if the
    // bound travelled, so the refusal IS the evidence that it did.
    const { refusal } = refused(
      one.api.applyCommands({
        readStamp: one.api.readStamp(),
        commands: [
          {
            kind: 'setPanelWidths',
            rowTitlePanelWidth: SETTINGS_LIMITS.rowAreaWidthWithoutPanels,
            propertyPanelWidth: SETTINGS_LIMITS.rowAreaWidthWithoutPanels,
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

    accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))
    accepted(
      one.api.applyCommands({
        readStamp: one.api.readStamp(),
        commands: [{ kind: 'setStatusDate', date: '2026-08-20T00:00:00' }],
      }),
    )

    expect(one.history.done).toHaveLength(1)
  })

  it('reads the seam once per call, and never part way through one (R7.4 / CS-3)', () => {
    const one = bench()
    const before = one.snapshotReads

    one.api.readDocument()
    expect(one.snapshotReads).toBe(before + 1)

    one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] })
    // Two calls were made above: AM-4 and AM-7.
    expect(one.snapshotReads).toBe(before + 3)
  })
})

describe('Chapter 5.5 -- a write attempted while notices are going out', () => {
  it('is turned away as a value, not as a throw, and says which step refused it', () => {
    const one = bench()
    let fromInside: AgentWriteOutcome | null = null
    one.api.watchChanges(() => {
      fromInside = one.api.applyCommands({
        readStamp: one.api.readStamp(),
        commands: [RECOLOUR],
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
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(refusal.target).toBe('AM-7')
    expect(typeof refusal.reason).toBe('string')
    // ⚠ AG-9a still words the third as 「現在の版数」, a value FR-063 no longer
    // has; what stands in its place is the whole current stamp, which is also
    // what the row exists for (「そのまま再試行に使える形にする」, UC-012 拡張 3a).
    expect(refusal.stamp).toEqual(one.document.documentStamp)
    expect(Object.keys(refusal)).not.toContain('revision')
  })

  it('carries no document when the stamp was not the thing at fault (AG-2 names one case)', () => {
    const one = bench()
    one.isEditingInPlace = true
    const { refusal } = refused(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(refusal.document).toBeNull()
  })

  it('says WHICH command was wrong and which rule refused it (NT-1 of table T-037)', () => {
    const one = bench()
    const { refusal } = refused(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [BAD_RENAME] }),
    )

    expect(refusal.refusals.length).toBeGreaterThan(0)
    for (const each of refusal.refusals) {
      // The first column of a table is the row ID (Chapter 1.9 :274), so a
      // refusal that names one can be traced back to table T-108 and to the
      // requirement that owns the rule.
      expect(each.command).toMatch(/^CM-\d+$/)
      expect(each.rule.length).toBeGreaterThan(0)
      expect(each.what.length).toBeGreaterThan(0)
    }
  })

  it('says nothing about commands when nothing was refused by WS-3', () => {
    const one = bench()
    one.isGestureInFlight = true
    const { refusal } = refused(
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }),
    )

    expect(refusal.refusals).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// AM-16 -- focusTask. AG-10, UN-8, table T-203.
// ---------------------------------------------------------------------------

describe('AM-16 focusTask -- the view, not the schedule', () => {
  it('writes the two rows table T-107 names for it, S-77 and S-78', () => {
    const one = bench()
    expect(one.document.documentSettings.scrollDate).toBeNull()
    expect(one.document.documentSettings.scrollGroupId).toBeNull()

    accepted(one.api.focusTask(FIRST_UID))

    expect(one.document.documentSettings.scrollDate).not.toBeNull()
    expect(one.document.documentSettings.scrollGroupId).not.toBeNull()
  })

  it('puts the task at the corner of the Row Area -- the tripwire PD-61 asks for', () => {
    // Nothing in FR-055, table T-203 or table T-107 states WHERE in the view a
    // focused task should land. This case is what falls over when the pending
    // decision is settled another way.
    const one = bench()
    accepted(one.api.focusTask(SECOND_UID))

    expect(one.document.documentSettings.scrollDate).toBe(SECOND_START)
    expect(one.document.documentSettings.scrollGroupId).toBe(SECOND_GROUP_ID)
  })

  it('names a TaskGroup id in S-78, not an integer (table T-203 says so in as many words)', () => {
    const one = bench()
    accepted(one.api.focusTask(FIRST_UID))

    const written = one.document.documentSettings.scrollGroupId
    expect(one.document.schedule.taskGroups.map((group) => group.id)).toContain(written)
  })

  it('leaves no undo step: UN-8 puts scrolling outside table T-027 (AG-10, MUST)', () => {
    const one = bench()
    accepted(one.api.focusTask(FIRST_UID))
    expect(one.history.done).toHaveLength(0)
  })

  it('does not move the schedule instant, and still refreshes the writer and the time (FR-063)', () => {
    const one = bench()
    const outcome = accepted(one.api.focusTask(FIRST_UID))

    expect(outcome.hasMovedSchedule).toBe(false)
    expect(outcome.stamp.scheduleUpdatedUtc).toBe(STARTING_STAMP.scheduleUpdatedUtc)
    expect(outcome.stamp.lastEditedBy).toBe(one.writerName)
    expect(outcome.stamp.settingsUpdatedUtc).toBe(READ_AT)
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

// ---------------------------------------------------------------------------
// AM-11 to AM-15 -- the exports. AG-7, AG-8, FR-021, FR-028.
// ---------------------------------------------------------------------------

describe('AM-11 exportJson -- AG-7 and the round trip', () => {
  it('answers the GRS JSON as a value, with no dialogue of any kind (AG-7)', () => {
    const text = exported(bench().api.exportJson())
    expect(typeof text).toBe('string')
    expect(() => JSON.parse(text) as unknown).not.toThrow()
  })

  it('round trips: what AM-11 wrote reads back as what AM-3 answers (FR-021)', () => {
    const one = bench()
    const read = documentFromJson(exported(one.api.exportJson()))

    expect(read.ok, JSON.stringify(read.ok ? [] : read.faults)).toBe(true)
    if (read.ok) expect(read.document).toEqual(one.api.readDocument())
  })

  it('writes the document as it now stands, not as it stood at install', () => {
    const one = bench()
    accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))
    const read = documentFromJson(exported(one.api.exportJson()))

    expect(read.ok).toBe(true)
    if (read.ok) expect(read.document.schedule.project.title).toBe(RENAME.title)
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
    // AG-9 states the refusal for WRITES only, and nothing states one for a
    // picture. What every row does state is that the answer is a value, so that
    // is what this case pins.
    const one = bench()
    one.isGestureInFlight = true

    const answer = one.api.exportSvg()
    expect(typeof answer.ok).toBe('boolean')
    if (!answer.ok) {
      // AG-9a fixes the three a refusal carries, whichever member raised it.
      expect(answer.refusal.target).toBe('AM-13')
      expect(typeof answer.refusal.reason).toBe('string')
      expect(answer.refusal.stamp).toEqual(one.document.documentStamp)
    }
  })
})

describe('the six rows with nowhere to hand the work -- FR-028 and AG-8', () => {
  const callOf: Record<string, (api: AgentApi) => { readonly target: string } | null> = {
    'AM-8': (api) => {
      const answer = api.importDocument({ text: '{}' })
      return answer.accepted ? null : answer.refusal
    },
    'AM-9': (api) => {
      const answer = api.undoEdit()
      return answer.accepted ? null : answer.refusal
    },
    'AM-10': (api) => {
      const answer = api.redoEdit()
      return answer.accepted ? null : answer.refusal
    },
    'AM-12': (api) => {
      const answer = api.exportMspdi()
      return answer.ok ? null : answer.refusal
    },
    'AM-14': (api) => {
      const answer = api.exportPng()
      return answer.ok ? null : answer.refusal
    },
    'AM-15': (api) => {
      const answer = api.exportEmbeddedHtml()
      return answer.ok ? null : answer.refusal
    },
  }

  it('answers each one with a refusal VALUE that names its own row (FR-028 MUST NOT throw)', () => {
    const api = bench().api
    for (const row of T_035_UNWIRED) {
      const call = callOf[row]
      expect(call, row).toBeDefined()
      const refusal = call?.(api) ?? null
      expect(refusal, `${row} answered as if it had done the work`).not.toBeNull()
      expect(refusal?.target, row).toBe(row)
    }
  })

  it('none of them touches the document (a wrong answer wearing a right shape)', () => {
    const one = bench()
    const before = one.document
    for (const row of T_035_UNWIRED) callOf[row]?.(one.api)
    expect(one.document).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// AM-17 -- watching. AG-6.
// ---------------------------------------------------------------------------

describe('AM-17 watchChanges -- AG-6', () => {
  it('wakes for a write somebody else settled', () => {
    const one = bench()
    one.api.watchChanges((notice) => one.notices.push(notice))

    one.writeAsPerson([RENAME], 'a person at the keyboard')

    expect(one.notices).toHaveLength(1)
    expect(one.notices[0]?.document?.schedule.project.title).toBe(RENAME.title)
  })

  it('is NOT woken by its own write (AG-6, MUST NOT)', () => {
    const one = bench()
    one.api.watchChanges((notice) => one.notices.push(notice))

    accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))

    expect(one.notices).toEqual([])
  })

  it('is NOT woken by its own utterance either (AG-6 selects on the same name)', () => {
    const one = bench()
    one.api.watchChanges((notice) => one.notices.push(notice))

    one.api.postDialogueMessage('a thing the agent said')

    expect(one.notices).toEqual([])
  })

  it('wakes for an utterance somebody else settled, although NO instant moved (AG-11)', () => {
    // AG-11: 「発話は日程データではないので日程データの群の刻を動かさない
    // （`FR-063`）。それでも監視は起きること（`AG-6`）」.
    const one = bench()
    const before = one.api.readStamp()
    one.api.watchChanges((notice) => one.notices.push(notice))

    one.speakAsPerson('wait -- why did you do that', 'a person at the keyboard')

    expect(one.notices).toHaveLength(1)
    expect(one.notices[0]?.messages.map((message) => message.text)).toEqual([
      'wait -- why did you do that',
    ])
    expect(one.notices[0]?.document).toBeNull()
    // ⭐ The watcher woke and not one of the stamp's three fields moved -- the
    // dialogue's own order is what carried it (AG-11, MUST).
    expect(one.api.readStamp()).toEqual(before)
    expect(one.notices[0]?.mark.seenScheduleUpdatedUtc).toBe(before.scheduleUpdatedUtc)
    expect(one.notices[0]?.mark.seenSequence).toBe(1)
  })

  it('is told only what happens from now on -- the tripwire PD-62 asks for', () => {
    // AG-6 says only "what I have not received yet", and nothing states what a
    // watcher that has never received anything is owed. This case is what falls
    // over when the pending decision is settled the other way.
    const one = bench()
    one.speakAsPerson('said before anybody was watching', 'a person at the keyboard')

    one.api.watchChanges((notice) => one.notices.push(notice))
    one.speakAsPerson('said after', 'a person at the keyboard')

    expect(one.notices).toHaveLength(1)
    expect(one.notices[0]?.messages.map((message) => message.text)).toEqual(['said after'])
  })

  it('hands back a way to stop, since table T-107 has no nineteenth member for it', () => {
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

// ---------------------------------------------------------------------------
// AM-18 -- the utterance. AG-11.
// ---------------------------------------------------------------------------

describe('AM-18 postDialogueMessage -- AG-11', () => {
  it('answers the message the log gave a sequence to', () => {
    const one = bench()
    const posted = one.api.postDialogueMessage('the survey phase now ends a week later')

    expect(posted.text).toBe('the survey phase now ends a week later')
    expect(posted.sequence).toBe(1)
    expect(one.api.readDialogueMessages()).toHaveLength(1)
  })

  it('records the author under the name AM-17 subscribes with (AG-6 compares against it)', () => {
    const one = bench()
    expect(one.api.postDialogueMessage('anything').author).toBe(one.writerName)
  })

  it('takes the time from the snapshot rather than reading a clock (CS-1, LY-5)', () => {
    const one = bench()
    one.readAt = '2027-01-02T03:04:05Z'
    expect(one.api.postDialogueMessage('anything').settledAt).toBe('2027-01-02T03:04:05Z')
  })

  it("moves no instant, so a caller's AG-2 lock survives a post (AG-11)", () => {
    const one = bench()
    const before = one.api.readStamp()

    one.api.postDialogueMessage('anything')

    expect(one.api.readStamp()).toEqual(before)
    expect(accepted(one.api.applyCommands({ readStamp: before, commands: [RENAME] }))).toBeTruthy()
  })

  it('counts in an order of its own, rising by one past what the log already held', () => {
    const one = bench()
    one.speakAsPerson('first', 'a person at the keyboard')
    one.speakAsPerson('second', 'a person at the keyboard')

    expect(one.api.postDialogueMessage('third').sequence).toBe(3)
    expect(one.api.readDialogueMessages().map((message) => message.text)).toEqual([
      'first',
      'second',
      'third',
    ])
  })

  it('answers with a value for empty text, since no row states a rule it could fail', () => {
    const one = bench()
    const posted = one.api.postDialogueMessage('')

    expect(posted.text).toBe('')
    expect(one.api.readDialogueMessages()).toHaveLength(1)
  })
})

describe('the boundaries -- empty, one, and the bound itself', () => {
  it('answers every row of table T-107 over a document whose schedule is empty', () => {
    expect(() => callEveryMember(bench(true, EMPTY_SCHEDULE).api)).not.toThrow()
  })

  it('AM-3 and AM-11 still answer for an empty schedule, and still round trip (FR-021)', () => {
    const one = bench(true, EMPTY_SCHEDULE)

    expect(one.api.readDocument().schedule.tasks).toEqual([])
    const read = documentFromJson(exported(one.api.exportJson()))
    expect(read.ok, JSON.stringify(read.ok ? [] : read.faults)).toBe(true)
    if (read.ok) expect(read.document).toEqual(one.api.readDocument())
  })

  it('AM-16 refuses over an empty schedule, because no uid names a task there', () => {
    const { refusal } = refused(bench(true, EMPTY_SCHEDULE).api.focusTask(FIRST_UID))

    expect(refusal.target).toBe('AM-16')
    expect(refusal.reason).toBe('unknownTask')
  })

  it('AM-7 takes a bundle of one and a bundle of many as one step each (FR-031)', () => {
    const one = bench()
    accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))
    accepted(
      one.api.applyCommands({
        readStamp: one.api.readStamp(),
        commands: [
          { kind: 'setStatusDate', date: '2026-08-20T00:00:00' },
          { kind: 'setThemeHue', hue: 200 },
          { kind: 'setProjectTitle', title: 'a third name' },
        ],
      }),
    )

    expect(one.history.done).toHaveLength(2)
  })

  it('AM-7 keeps only as many steps as the bound the seam handed over (S-94, one step)', () => {
    const one = bench()
    one.historyLimits = { ...one.historyLimits, maxSteps: 1 }
    accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))
    accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RENAME] }))

    expect(one.history.done).toHaveLength(1)
  })

  it('AM-7 runs a command table T-027 excludes and leaves no step (AG-10, MUST)', () => {
    const one = bench()
    // UN-16 of table T-027: the panel widths are where you look, not what the
    // schedule says. The call is not refused, and it leaves nothing to undo.
    const outcome = accepted(
      one.api.applyCommands({
        readStamp: one.api.readStamp(),
        commands: [{ kind: 'setPanelWidths', rowTitlePanelWidth: 200, propertyPanelWidth: 300 }],
      }),
    )

    expect(outcome.hasMovedSchedule).toBe(false)
    expect(one.history.done).toHaveLength(0)
    expect(one.document.documentSettings.rowTitlePanelWidth).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// FR-028 -- nothing on this surface throws, and nothing on it is a promise.
// ---------------------------------------------------------------------------

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

  it('answers no promise from any row (an exception a caller cannot see is the same fault)', () => {
    const one = bench()
    const isThenable = (value: unknown): boolean =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { then?: unknown }).then === 'function'

    const answers: unknown[] = [
      one.api.readDocument(),
      one.api.readStamp(),
      one.api.readSelection(),
      one.api.readDialogueMessages(),
      one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [] }),
      one.api.importDocument({ text: '{}' }),
      one.api.undoEdit(),
      one.api.redoEdit(),
      one.api.exportJson(),
      one.api.exportMspdi(),
      one.api.exportSvg(),
      one.api.exportPng(),
      one.api.exportEmbeddedHtml(),
      one.api.focusTask(FIRST_UID),
      one.api.postDialogueMessage('anything'),
    ]

    for (const answer of answers) expect(isThenable(answer)).toBe(false)
  })

  it('a subscriber that throws does not turn an accepted write into an exception', () => {
    const one = bench()
    one.api.watchChanges(() => {
      throw new Error('a subscriber that misbehaves')
    })

    // The write is somebody else's, so AG-6 does wake the watcher that throws.
    expect(() => one.writeAsPerson([RENAME], 'a person at the keyboard')).not.toThrow()
    expect(() =>
      accepted(one.api.applyCommands({ readStamp: one.api.readStamp(), commands: [RECOLOUR] })),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// AM-13 `exportSvg`, second pass -- what table T-107 says the picture IS
//
// ⭐ Table T-107 row AM-13 (`_assets/tbl-glossary.md` :328) gives the member one
// job and two sources: "the picture of the screen, shrunk, returned as a value",
// from "table T-024's IO-3 / FR-080". Table T-024 row IO-3
// (01-04-requirements.md :2838) then fixes the one measurable thing about that
// picture: "SVG | write only | the screen's output | the output size is S-81 of
// table T-204", and S-81 is `exportCanvas`, 1600 x 900.
//
// ⭐ FR-080's own words for the picture AM-13 owes: "the WHOLE of the screen GRS
// occupies, shrunk by the ratio of `exportCanvas`'s width to the screen's
// width", with table T-076 deciding which UI parts reach it and FR-025 deciding
// what is dropped down the page. CR-196 opened PI-21's `exportSvg` for exactly
// this reason -- WY-2 of table T-041 judges the SVG and the PNG of one state to
// be one drawing, and before that entry existed "the SVG route alone went
// through neither table T-076's assembly nor the TaskGroup cut" (A-appendix.md
// :101).
//
// ⚠️ These cases are driven from the settings of the document under test, so
// they follow `docs/spec/_source/settings.json` rather than a number typed here.
// ---------------------------------------------------------------------------

/** Table T-024 row IO-3, copied. */
const T_024_IO_3 = {
  id: 'IO-3',
  format: 'SVG',
  canWrite: true,
  canRead: false,
  sizeRow: 'S-81',
} as const

/** The `width`/`height` of a picture's outermost element, as numbers. */
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
    const canvas = one.document.documentSettings.exportCanvas

    expect(T_024_IO_3.sizeRow).toBe('S-81')
    expect(rootSizeOf(svg)).toEqual({ width: canvas.width, height: canvas.height })
  })

  it('GIVEN a settled frame WHEN AM-13 answers THEN what comes back is one SVG document, not a fragment', () => {
    const svg = exported(bench().api.exportSvg())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('GIVEN one unchanged state WHEN AM-13 answers twice THEN the same picture comes back both times (WY-2 premise)', () => {
    // WY-2 of table T-041 rests on the same state giving the same picture; CS-1
    // of table T-066 (design :448) states the failure mode -- read the clock
    // inside a frame and the picture moves between two calls of one minute.
    const one = bench()
    expect(exported(one.api.exportSvg())).toBe(exported(one.api.exportSvg()))
  })

  it('GIVEN a document whose schedule is empty WHEN AM-13 answers THEN a picture still comes back as a value', () => {
    // The empty boundary. FR-025 (MUST) leaves the remainder of a short picture
    // blank rather than filling it, so an empty schedule is a picture, not a
    // refusal.
    const one = bench(true, EMPTY_SCHEDULE)
    const answer = one.api.exportSvg()

    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    const canvas = one.document.documentSettings.exportCanvas
    expect(rootSizeOf(answer.value)).toEqual({ width: canvas.width, height: canvas.height })
  })

  it('GIVEN no frame has settled WHEN AM-13 answers THEN the refusal is a value naming its own row (FR-028, AG-9a)', () => {
    // The error path, restated against the second-pass cases above so that a
    // picture and a refusal cannot both be answered by one shape.
    const answer = bench(false).api.exportSvg()

    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(answer.refusal.target).toBe('AM-13')
    expect(Object.keys(answer).sort()).toEqual(['ok', 'refusal'])
  })
})
