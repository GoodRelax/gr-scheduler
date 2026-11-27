// Unit tests: replaceDocument swaps the whole document by the rows of table T-230.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { DocumentStamp } from '../../src/entity/document-model/document-stamp/document-stamp'
import {
  emptyHistory,
  historyWithStep,
  stepCount,
  type EditHistory,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import type {
  Assignment,
  Calendar,
  CommentBox,
  Project,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskOrigin,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  replaceDocument,
  type ChangeAudience,
  type ChangeStep,
  type DocumentHolder,
  type HeldDocument,
  type ImportCall,
  type ReplacementCall,
  type ReplaceOutcome,
  type WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import {
  importDocument,
  type ImportOutcome,
  type MergeChoices,
} from '../../src/use-case/import-document/import-document'
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { validateImportedDocument } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { specTable, unbroken } from '../contract/spec-table'
import {
  unwatchChanges,
  watchChanges,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { taskGroupDocument, shell, type ShellBench } from './cr-541-stage'

const DEFAULT_TASK_GROUP_NAME_FIXTURE = 'fixture default task group name'

const SPEC = join(process.cwd(), 'docs', 'spec')

const T_230 = specTable('T-230')

const headingWith = (needle: string): string => {
  const found = T_230.headings.find((heading) => heading.includes(needle))
  if (found === undefined) throw new Error(`table T-230 has no column mentioning ${needle}`)
  return found
}

const COL_WS3 = headingWith('WS-3')
const COL_HISTORY = headingWith('履歴')
const COL_STAMP = headingWith('刻印')
const COL_UNDO_STEP = headingWith('取り消し')

const cellOf = (row: string, column: string): string => {
  const found = T_230.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-230 has no row ${row}`)
  return found.by[column] ?? ''
}

const ROWS = T_230.rows.map((row) => row.id)

// Trap: dropping a row out of ROWS silences the cell-reading cases that would notice it.
const DRIVEN_ROWS = ROWS

// Why: every nullable column of table T-058 is spelled null, because a column left
// undefined reads as held to anything that asks.
const projectOf = (part: Partial<Project> = {}): Project => ({
  id: null,
  name: null,
  title: null,
  subject: null,
  category: null,
  company: null,
  manager: null,
  author: null,
  creationDate: null,
  revision: null,
  startDate: null,
  statusDate: null,
  minutesPerDay: null,
  minutesPerWeek: null,
  daysPerMonth: null,
  weekStartDay: null,
  calendarUid: null,
  defaultStartTime: null,
  defaultFinishTime: null,
  themeHue: 214,
  parentTaskProgressToleranceDays: 1,
  uidHighWaterMark: 0,
  importSequence: 0,
  outlineBase: 1,
  sourceFormat: 'grs',
  scheduleDataTimeZone: 'UTC+00:00',
  carry: {},
  carryElements: [],
  ...part,
})

const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
  parentTaskUid: null,
  wbsOrder: null,
  name: null,
  start: null,
  finish: null,
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
  ...part,
})

const groupOf = (part: Partial<TaskGroup> & { readonly id: string }): TaskGroup => ({
  parentId: null,
  name: null,
  derivedFromTaskUid: null,
  order: 0,
  treeState: 'auto', editPermission: null,
  color: null,
  minHeightPx: null,
  ...part,
})

const memberOf = (taskUid: number, taskGroupId: string): TaskGroupMember => ({
  taskUid,
  taskGroupId,
})

// Why: carried on both sides of every merge, so that an absent key is never mistaken for
// the conflict MG-12 asks about.
const SETTINGS_BASE = {
  scrollDate: '2026-01-05',
  scrollTaskGroupId: 'g1',
  pinnedTaskGroupIds: [] as readonly string[],
  taskGroupGap: 6,
  stackDirection: 'up',
  fontSizeStep: 'M',
  fontSizeStepSizes: { S: 12, M: 14, L: 16 },
  zoomX: 1,
  zoomY: 1,
  isBaselineVisible: true,
  isDependencyVisible: true,
  dependencyLagDefault: 0,
} as const

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_BASE, ...part }) as unknown as DocumentSettings

const scheduleOf = (part: Partial<Schedule> = {}): Schedule => ({
  project: projectOf(),
  calendars: [] as readonly Calendar[],
  tasks: [],
  resources: [] as readonly Resource[],
  assignments: [] as readonly Assignment[],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [] as readonly TaskVisual[],
  commentBoxes: [] as readonly CommentBox[],
  highlightBoxes: [],
  taskOrigins: [] as readonly TaskOrigin[],
  baselineTasks: [],
  ...part,
})

const stampOf = (part: Partial<DocumentStamp> = {}): DocumentStamp => ({
  scheduleUpdatedAt: '2026-08-20T09:00:00Z',
  lastEditedBy: 'the person at the keyboard',
  settingsUpdatedAt: '2026-08-20T09:00:00Z',
  fileSavedAt: null,
  ...part,
})

// Why: IV-6 of table T-220 wants one TaskGroupMember per Task, so no fixture builds a task without one.
const rowed = (
  tasks: readonly Task[],
  documentStamp: DocumentStamp = stampOf(),
  documentSettings: Record<string, unknown> = {},
): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleOf({
      tasks,
      taskGroups: [groupOf({ id: 'g1', name: 'task group 1', order: 0 })],
      taskGroupMembers: tasks.map((task) => memberOf(task.uid, 'g1')),
    }),
    documentSettings: settingsOf(documentSettings),
    documentStamp,
    changeLog: [],
  }) as unknown as Document

// Spec: FR-063
const EARLIER = '2026-08-10T09:00:00Z'
const NOW = '2026-08-20T09:00:00Z'
const FROM_A_FILE = '2026-08-01T12:00:00Z'
const WRITE_INSTANT = '2026-08-22T10:00:00Z'
const WRITER = 'the case at the keyboard'

const CURRENT = rowed([taskOf({ uid: 1, name: 'ours' })], stampOf())

// Why: an earlier instant on purpose, so an undo restoring it tests equality, not order.
const ONE_STEP_BACK = rowed(
  [taskOf({ uid: 1, name: 'as it was' })],
  stampOf({ scheduleUpdatedAt: EARLIER, settingsUpdatedAt: EARLIER }),
)

// Why: only the settings group moved (CM-62), so this step back carries the same
// scheduleUpdatedAt as CURRENT and an undo to it must count as not moved.
const ONE_STEP_BACK_SAME_SCHEDULE = rowed(
  [taskOf({ uid: 1, name: 'ours' })],
  stampOf({ settingsUpdatedAt: EARLIER, lastEditedBy: 'somebody else' }),
  { fontSizeStep: 'L' },
)

const OUT_OF_A_FILE = rowed(
  [taskOf({ uid: 9, name: 'from a file' })],
  stampOf({
    scheduleUpdatedAt: FROM_A_FILE,
    settingsUpdatedAt: FROM_A_FILE,
    lastEditedBy: 'somebody else',
  }),
)

const SAME_SCHEDULE_STAMP = rowed(
  [taskOf({ uid: 9, name: 'a different schedule, the same 刻' })],
  stampOf({ settingsUpdatedAt: FROM_A_FILE, lastEditedBy: 'somebody else' }),
)

// Spec: RD-7, BT-4
// Why: a document of its own and not OUT_OF_A_FILE, because a case that landed the wrong
// row's document would still pass if the rows handed in the same object.
const THE_BUNDLED_TEMPLATE = rowed(
  [taskOf({ uid: 7, name: 'the bundled template' })],
  stampOf({
    scheduleUpdatedAt: FROM_A_FILE,
    settingsUpdatedAt: FROM_A_FILE,
    lastEditedBy: 'whoever wrote the template',
  }),
)

const TEMPLATE_SAME_SCHEDULE_STAMP = rowed(
  [taskOf({ uid: 7, name: 'the bundled template' })],
  stampOf({ settingsUpdatedAt: FROM_A_FILE, lastEditedBy: 'whoever wrote the template' }),
)

// Why: wide enough that neither bound of FR-031 binds; what the bounds do is not this file's case.
const GENEROUS: HistoryLimits = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }

const oneStepOf = (
  document: Document,
  commands: readonly string[] = ['setTaskName'],
): EditHistory<ChangeStep> =>
  historyWithStep(
    emptyHistory<ChangeStep>(),
    { document, commands },
    JSON.stringify(document).length,
    GENEROUS,
  )

const heldWithOneStep = (): HeldDocument => ({
  document: CURRENT,
  history: oneStepOf(ONE_STEP_BACK),
})

const heldWithOneSettingsStep = (): HeldDocument => ({
  document: CURRENT,
  history: oneStepOf(ONE_STEP_BACK_SAME_SCHEDULE, ['setFontSizeStep']),
})

const CALM: WriteMoment = {
  gestureInFlight: false,
  editingInPlace: false,
  questionAsked: false,
  deliveringNotices: false,
}

const answersOf = (part: Partial<MergeChoices> = {}): MergeChoices => ({
  mapping: null,
  profileConflict: null,
  settingsConflict: null,
  ...part,
})

// Spec: RD-3, UN-6
const MERGE_CALL: ImportCall<'merge' | 'baseline'> = {
  incoming: rowed([taskOf({ uid: 1, name: 'theirs' })], stampOf({ lastEditedBy: 'somebody else' })),
  format: 'grsJson',
  choice: 'merge',
  // Why: OP-5 has already passed FR-023, and OP-8 finds nothing else open.
  validationPassed: true,
  anotherOpenInProgress: false,
  unsavedEditsDiscardConfirmed: true,
  merge: answersOf({ mapping: { kind: 'allSame' } }),
  defaultSettings: settingsOf(),
  importSessionId: 'session-rd-3',
}

// Spec: RD-4, OP-3, OP-4
const REPLACE_CALL: ImportCall<'replace'> = {
  incoming: OUT_OF_A_FILE,
  format: 'grsJson',
  choice: 'replace',
  validationPassed: true,
  anotherOpenInProgress: false,
  unsavedEditsDiscardConfirmed: true,
  merge: null,
  defaultSettings: settingsOf(),
  importSessionId: 'session-rd-4',
}

const acceptedImport = (outcome: ImportOutcome): Document => {
  if (!outcome.ok) throw new Error(`the import was refused: ${JSON.stringify(outcome.refusal)}`)
  return outcome.document
}

interface Delivery {
  readonly document: Document
  readonly hasUpdatedSchedule: boolean
  readonly visibleToASubscriber: Document
}

interface RunPart {
  readonly expectedStamp: DocumentStamp | null
  readonly moment: WriteMoment
}

interface Bench {
  held(): HeldDocument
  readonly swapped: HeldDocument[]
  readonly delivered: Delivery[]
  readonly order: string[]
  run(call: ReplacementCall, part?: Partial<RunPart>): ReplaceOutcome
}

function bench(start: HeldDocument, onDeliver?: (self: Bench) => void): Bench {
  let held = start
  const swapped: HeldDocument[] = []
  const delivered: Delivery[] = []
  const order: string[] = []

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      order.push('WS-6')
      swapped.push(next)
      held = next
    },
  }

  const audience: ChangeAudience = {
    deliver: (document, hasUpdatedSchedule) => {
      order.push('WS-7')
      delivered.push({ document, hasUpdatedSchedule, visibleToASubscriber: held.document })
      if (onDeliver !== undefined) onDeliver(one)
    },
  }

  const one: Bench = {
    held: () => held,
    swapped,
    delivered,
    order,
    run: (call, part = {}) =>
      replaceDocument(
        {
          defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME_FIXTURE,
          newTaskGroupId: 'fresh-task-group',
          expectedStamp: 'expectedStamp' in part ? (part.expectedStamp ?? null) : held.document.documentStamp,
          moment: part.moment ?? CALM,
          call,
        },
        holder,
        audience,
      ),
  }
  return one
}

const accepted = (outcome: ReplaceOutcome): { document: Document; hasUpdatedSchedule: boolean } => {
  if (!outcome.ok) {
    throw new Error(`the replacement was refused: ${JSON.stringify(outcome.refusal)}`)
  }
  return { document: outcome.document, hasUpdatedSchedule: outcome.hasUpdatedSchedule }
}

interface RowDrive {
  readonly start: HeldDocument
  readonly call: ReplacementCall
  readonly ws3Document: Document
  readonly ws3History: EditHistory<ChangeStep> | null
  // Summary: The two instants the last MUST under table T-230 compares, both built from the case's own fixtures.
  readonly outgoingScheduleUpdatedAt: string
  readonly incomingScheduleUpdatedAt: string
}

// Why: every row is driven with differing and with matching instants, so half the answers
// are false and a derivation can be told from a habit.
type Instants = 'differ' | 'match'

const INSTANT_FLAVORS: readonly Instants[] = ['differ', 'match']

function driveOf(row: string, instants: Instants = 'differ'): RowDrive {
  const start = instants === 'differ' ? heldWithOneStep() : heldWithOneSettingsStep()
  const stepBack = instants === 'differ' ? ONE_STEP_BACK : ONE_STEP_BACK_SAME_SCHEDULE
  const brought = instants === 'differ' ? OUT_OF_A_FILE : SAME_SCHEDULE_STAMP
  const outgoingScheduleUpdatedAt = start.document.documentStamp.scheduleUpdatedAt
  switch (row) {
    case 'RD-1': {
      const answer = undoEdit(start)
      return {
        start,
        call: { row: 'RD-1' },
        ws3Document: answer.next.document,
        ws3History: answer.next.history,
        outgoingScheduleUpdatedAt,
        incomingScheduleUpdatedAt: stepBack.documentStamp.scheduleUpdatedAt,
      }
    }
    case 'RD-2': {
      // Why: RD-2 needs something on the redo side, which only an undo can put there.
      const stepped = undoEdit(start).next
      const answer = redoEdit(stepped)
      return {
        start: stepped,
        call: { row: 'RD-2' },
        ws3Document: answer.next.document,
        ws3History: answer.next.history,
        // Why: undo left the step's document current, and redo sends back the one this case
        // started from.
        outgoingScheduleUpdatedAt: stepBack.documentStamp.scheduleUpdatedAt,
        incomingScheduleUpdatedAt: CURRENT.documentStamp.scheduleUpdatedAt,
      }
    }
    case 'RD-3': {
      // Why: this row advances the stamp, so the instant the caller hands is the one the
      // schedule group carries afterwards, since this merge overwrites a Task.
      const writeInstant = instants === 'differ' ? WRITE_INSTANT : NOW
      const answer = acceptedImport(importDocument({ ...MERGE_CALL, current: start.document }))
      return {
        start,
        call: {
          row: 'RD-3',
          importing: MERGE_CALL,
          historyLimits: GENEROUS,
          editedBy: WRITER,
          updatedAt: writeInstant,
        },
        ws3Document: answer,
        ws3History: null,
        outgoingScheduleUpdatedAt,
        incomingScheduleUpdatedAt: writeInstant,
      }
    }
    case 'RD-4': {
      const importing: ImportCall<'replace'> = { ...REPLACE_CALL, incoming: brought }
      const answer = acceptedImport(importDocument({ ...importing, current: start.document }))
      return {
        start,
        call: { row: 'RD-4', importing },
        ws3Document: answer,
        ws3History: null,
        outgoingScheduleUpdatedAt,
        incomingScheduleUpdatedAt: brought.documentStamp.scheduleUpdatedAt,
      }
    }
    case 'RD-6':
      return {
        start,
        call: { row: 'RD-6', document: brought },
        ws3Document: brought,
        ws3History: null,
        outgoingScheduleUpdatedAt,
        incomingScheduleUpdatedAt: brought.documentStamp.scheduleUpdatedAt,
      }
    case 'RD-7': {
      const template = instants === 'differ' ? THE_BUNDLED_TEMPLATE : TEMPLATE_SAME_SCHEDULE_STAMP
      const writeInstant = instants === 'differ' ? WRITE_INSTANT : NOW
      return {
        start,
        call: { row: 'RD-7', document: template, editedBy: WRITER, updatedAt: writeInstant },
        ws3Document: template,
        ws3History: null,
        outgoingScheduleUpdatedAt,
        incomingScheduleUpdatedAt: writeInstant,
      }
    }
    default:
      throw new Error(`table T-230 has grown a row this file does not drive: ${row}`)
  }
}

// Trap: typing the row count here breaks again when a row leaves or arrives; the case
// counts the row IDs and looks for that count in the closing sentence.
describe('表 T-230 -- the whole set of callers, before any of them is driven', () => {
  it('GIVEN the manuscript WHEN its rows are read THEN this file has a drive for every one', () => {
    expect(ROWS).toEqual(['RD-1', 'RD-2', 'RD-3', 'RD-4', 'RD-6', 'RD-7'])
    // Why: RD-5 is a retired seat, so the count is six over rows numbered up to seven.
    expect(ROWS).toHaveLength(6)
    const closing = unbroken(readRepoFile(join(SPEC, '05-07-design.md'), 'utf8'))
    expect(closing, 'the prose under table T-230 counts the rows it prints').toContain(
      `本表の ${ROWS.length} つが、まるごと差し替える呼び手の全数である`,
    )
    for (const instants of INSTANT_FLAVORS) {
      for (const row of ROWS) expect(() => driveOf(row, instants), `${row} / ${instants}`).not.toThrow()
    }
  })

  it('GIVEN the WS-3 column WHEN it is read THEN it names a component for four rows and the caller for two', () => {
    expect(cellOf('RD-1', COL_WS3)).toContain('UndoEdit')
    expect(cellOf('RD-2', COL_WS3)).toContain('RedoEdit')
    expect(cellOf('RD-3', COL_WS3)).toContain('ImportDocument')
    expect(cellOf('RD-4', COL_WS3)).toContain('ImportDocument')
    expect(cellOf('RD-6', COL_WS3)).toBe('呼び手が持って来る')
    expect(cellOf('RD-7', COL_WS3)).toBe('呼び手が持って来る（`01-04-requirements.md` の 表 T-342 の空の文書）')
    expect(
      ROWS.filter((row) => cellOf(row, COL_WS3).startsWith('呼び手が持って来る')),
      'the rows whose WS-3 column has the caller bring the document',
    ).toEqual(['RD-6', 'RD-7'])
  })

  it('GIVEN a caller that names no row WHEN it asks for a replacement THEN nothing is swapped and nothing is told', () => {
    const one = bench(heldWithOneStep())
    const before = one.held()
    // Trap: moving the expect inside the try lets a failing assertion pass as the unit
    // throwing; a throw and a refusal are both allowed endings, a swap is not.
    let outcome: ReplaceOutcome | 'threw'
    try {
      outcome = one.run({} as unknown as ReplacementCall)
    } catch {
      outcome = 'threw'
    }
    if (outcome !== 'threw') {
      expect(outcome.ok, 'a nameless replacement was accepted').toBe(false)
    }
    expect(one.swapped).toEqual([])
    expect(one.delivered).toEqual([])
    expect(one.held()).toBe(before)
  })
})

// Spec: WS-1, AG-2, AG-10
describe('WS-1 -- 照合するのは申告された刻印と現在の文書である', () => {
  it('GIVEN a caller that declares the CURRENT 刻印 WHEN it replaces THEN the replacement is accepted', () => {
    const one = bench(heldWithOneStep())
    const outcome = one.run(driveOf('RD-6').call, { expectedStamp: CURRENT.documentStamp })
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true)
  })

  const THREE_FIELDS: readonly (keyof DocumentStamp)[] = [
    'scheduleUpdatedAt',
    'lastEditedBy',
    'settingsUpdatedAt',
  ]
  for (const field of THREE_FIELDS) {
    it(`GIVEN a declared 刻印 differing only in \`${field}\` WHEN it replaces THEN WS-1 refuses and nothing is swapped`, () => {
      const one = bench(heldWithOneStep())
      const before = one.held()
      const outcome = one.run(driveOf('RD-6').call, {
        expectedStamp: { ...CURRENT.documentStamp, [field]: 'not what the document says' },
      })
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) {
        expect(outcome.refusal.step).toBe('WS-1')
        expect(outcome.refusal.reason).toBe('staleStamp')
      }
      expect(one.swapped).toEqual([])
      expect(one.delivered).toEqual([])
      expect(one.held()).toBe(before)
    })
  }

  it('GIVEN a caller that declares NO 刻印 WHEN it replaces THEN it is accepted -- 申告が無いことだけを理由に拒否してはならない', () => {
    const one = bench(heldWithOneStep())
    const outcome = one.run(driveOf('RD-6').call, { expectedStamp: null })
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true)
    expect(one.swapped).toHaveLength(1)
    expect(accepted(outcome).document).toEqual(OUT_OF_A_FILE)
  })

  it('GIVEN an INCOMING 刻印 that differs from the current one WHEN the current one is declared THEN it is still accepted', () => {
    expect(OUT_OF_A_FILE.documentStamp).not.toEqual(CURRENT.documentStamp)
    const one = bench(heldWithOneStep())
    const outcome = one.run(
      { row: 'RD-6', document: OUT_OF_A_FILE },
      { expectedStamp: CURRENT.documentStamp },
    )
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true)
    expect(accepted(outcome).document).toEqual(OUT_OF_A_FILE)
  })

  it('GIVEN a caller that declares the INCOMING 刻印 WHEN it replaces THEN WS-1 refuses, because the current one is what is matched', () => {
    // Why: the mirror of the case above; if WS-1 read the incoming stamp, this call would pass.
    const one = bench(heldWithOneStep())
    const outcome = one.run(
      { row: 'RD-6', document: OUT_OF_A_FILE },
      { expectedStamp: OUT_OF_A_FILE.documentStamp },
    )
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.step).toBe('WS-1')
    expect(one.swapped).toEqual([])
  })
})

// Spec: WS-2, AG-9
describe('WS-2 -- 書ける時機かを見る、三つの moment', () => {
  const MOMENTS: readonly (keyof WriteMoment)[] = [
    'gestureInFlight',
    'editingInPlace',
    'deliveringNotices',
  ]

  for (const moment of MOMENTS) {
    it(`GIVEN \`${moment}\` at the moment of the call WHEN it replaces THEN WS-2 refuses, nothing is swapped and nothing is told`, () => {
      const one = bench(heldWithOneStep())
      const before = one.held()
      const outcome = one.run(driveOf('RD-6').call, { moment: { ...CALM, [moment]: true } })
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) {
        expect(outcome.refusal.step).toBe('WS-2')
        expect(outcome.refusal.reason).toBe(moment)
      }
      expect(one.swapped).toEqual([])
      expect(one.delivered).toEqual([])
      expect(one.held()).toBe(before)
    })
  }

  // Spec: RD-6, PI-15
  // Why: these two cases go through the shell; the delivery window is
  // changeDeliveryStateMachine.delivering, so only the shell's WS-7 can refuse.
  const SHELL_WATCHER = 'uf-8-9 WS-2 subscriber'
  const LONG_AGO = { seenScheduleUpdatedAt: '2000-01-01T00:00:00Z' }
  const shellDocument = (rows: number): Document =>
    taskGroupDocument(
      Array.from({ length: rows }, (_one, index) => ({ id: `row-${index + 1}`, parentId: null })),
    ) as unknown as Document
  const taskGroupsHeld = (bench: ShellBench): number => bench.loop.document().schedule.taskGroups.length

  it('GIVEN a subscriber inside WS-7 WHEN it writes back THEN it is refused -- 通知を配っているあいだの書き込みは拒否する', () => {
    // Why: the subscriber declares no moment, since it cannot know it; the shell does.
    const built = shell(shellDocument(1) as never)
    let told = 0
    let heldInside: number | null = null
    try {
      watchChanges(built.loop.agentApiSeams().changeWatchers, {
        watcher: SHELL_WATCHER,
        since: LONG_AGO,
        deliver: () => {
          told += 1
          if (told > 1) return
          built.loop.holdDocument({ row: 'RD-6', document: shellDocument(3) })
          heldInside = taskGroupsHeld(built)
        },
      })

      built.loop.holdDocument({ row: 'RD-6', document: shellDocument(2) })

      expect(told, 'premise: the outer replacement reached WS-7').toBeGreaterThan(0)
      // Why: the write from inside reached neither WS-6 nor WS-7: the document
      // held while it was refused, and afterwards, is the outer one.
      expect(heldInside).toBe(2)
      expect(taskGroupsHeld(built)).toBe(2)
      // Why: exactly one delivery, the outer one, because FR-028 queues no second one.
      expect(told).toBe(1)
    } finally {
      unwatchChanges(built.loop.agentApiSeams().changeWatchers, SHELL_WATCHER)
      built.restore()
    }
  })

  it('GIVEN the delivery window has closed WHEN the next write comes THEN it is accepted, so one refusal does not wedge the path shut', () => {
    // Why: a delivery state that never clears would refuse every write for ever after.
    const built = shell(shellDocument(1) as never)
    let told = 0
    try {
      watchChanges(built.loop.agentApiSeams().changeWatchers, {
        watcher: SHELL_WATCHER,
        since: LONG_AGO,
        deliver: () => {
          told += 1
          if (told > 1) return
          built.loop.holdDocument({ row: 'RD-6', document: shellDocument(3) })
        },
      })
      built.loop.holdDocument({ row: 'RD-6', document: shellDocument(2) })
      expect(told, 'premise: the outer replacement reached WS-7').toBeGreaterThan(0)
      expect(taskGroupsHeld(built), 'premise: the write from inside was refused').toBe(2)

      built.loop.holdDocument({ row: 'RD-6', document: shellDocument(4) })
      expect(taskGroupsHeld(built)).toBe(4)
    } finally {
      unwatchChanges(built.loop.agentApiSeams().changeWatchers, SHELL_WATCHER)
      built.restore()
    }
  })
})

// Spec: WS-5
describe('表 T-230 の刻印の欄 -- 行ごとに', () => {
  it('GIVEN the 刻印 column WHEN its six cells are read THEN two say 進める: the 取り込み row and the 初期化 row', () => {
    const advancing = ROWS.filter((row) => cellOf(row, COL_STAMP).includes('進める'))
    expect(advancing).toEqual(['RD-3', 'RD-7'])
    for (const row of ROWS) {
      if (advancing.includes(row)) continue
      expect(cellOf(row, COL_STAMP), row).toBe('入ってきたまま')
    }
  })

  for (const row of DRIVEN_ROWS) {
    it(`GIVEN ${row} WHEN the replacement lands THEN its 刻印 is what the 刻印 column of table T-230 says`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      const landed = accepted(one.run(drive.call)).document

      if (cellOf(row, COL_STAMP) === '入ってきたまま') {
        expect(landed.documentStamp).toEqual(drive.ws3Document.documentStamp)
        expect(landed.documentStamp.lastEditedBy).not.toBe(WRITER)
        expect(landed.documentStamp.settingsUpdatedAt).not.toBe(WRITE_INSTANT)
        expect(landed.documentStamp.scheduleUpdatedAt).not.toBe(WRITE_INSTANT)
      } else {
        expect(landed.documentStamp.lastEditedBy).toBe(WRITER)
        expect(landed.documentStamp.settingsUpdatedAt).toBe(WRITE_INSTANT)
        // Why: the precondition is read from what WS-3 answered, not from the landed document,
        // which is the thing being judged.
        expect(
          drive.ws3Document.schedule,
          'the merge this row drives is meant to change the スケジュールデータの群',
        ).not.toEqual(drive.start.document.schedule)
        expect(landed.documentStamp.scheduleUpdatedAt).toBe(WRITE_INSTANT)
      }
    })
  }
})

// Spec: WS-4, T-027
describe('表 T-230 の取り消しの 1 段の欄 -- 行ごとに', () => {
  it('GIVEN the 取り消しの 1 段 column WHEN its six cells are read THEN five say 積まない and one delegates to 表 T-027', () => {
    const delegating = ROWS.filter((row) => cellOf(row, COL_UNDO_STEP).includes('T-027'))
    expect(delegating).toEqual(['RD-3'])
    for (const row of ROWS) {
      if (row === 'RD-3') continue
      expect(cellOf(row, COL_UNDO_STEP), row).toBe('積まない')
    }
  })

  for (const row of DRIVEN_ROWS) {
    if (row === 'RD-3') continue
    it(`GIVEN ${row} (積まない) WHEN the replacement lands THEN no 段 was pushed`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      accepted(one.run(drive.call))

      const expected =
        drive.ws3History !== null
          ?
            stepCount(drive.ws3History)
          :
            0
      expect(stepCount(one.held().history)).toBe(expected)
    })
  }

  // Spec: UN-6, MM-1
  it('GIVEN RD-3 (表 T-027 に従う) WHEN a 合流での上書き lands THEN one 段 is pushed, because UN-6 files it under 対象', () => {
    const un6 = specTable('T-027').rows.find((one) => one.id === 'UN-6')
    expect(un6?.by['区分']).toBe('対象')
    expect(un6?.by['操作']).toContain('合流での上書き')

    const drive = driveOf('RD-3')
    const before = stepCount(drive.start.history)
    const one = bench(drive.start)
    accepted(one.run(drive.call))
    expect(stepCount(one.held().history)).toBe(before + 1)

    const back = undoEdit(one.held())
    expect(back.undone).toBe(true)
    expect(back.next.document.schedule).toEqual(drive.start.document.schedule)
  })
})

describe('表 T-230 の履歴の欄 -- 行ごとに', () => {
  it('GIVEN the 履歴 column WHEN its six cells are read THEN they are 問う先が答えたもの ×2, いまのものを残す, 捨てる, 空にする, 捨てる', () => {
    expect(ROWS.map((row) => cellOf(row, COL_HISTORY))).toEqual([
      '問う先が答えたものを据える',
      '問う先が答えたものを据える',
      'いまのものを残す',
      '捨てる',
      '空にする',
      '捨てる',
    ])
  })

  for (const row of ['RD-1', 'RD-2']) {
    const asked = row === 'RD-1' ? 'UndoEdit' : 'RedoEdit'
    it(`GIVEN ${row} WHEN the replacement lands THEN the 履歴 is exactly the one ${asked} answered with`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      accepted(one.run(drive.call))
      expect(drive.ws3History).not.toBeNull()
      expect(one.held().history).toEqual(drive.ws3History)
    })
  }

  it('GIVEN RD-3 (いまのものを残す) WHEN the merge lands THEN what could be undone before can still be undone after', () => {
    const drive = driveOf('RD-3')
    const one = bench(drive.start)
    accepted(one.run(drive.call))

    // Why: one undo takes back the merge, and the second reaches the step the history
    // already held, which is the one that had to survive.
    const first = undoEdit(one.held())
    expect(first.undone).toBe(true)
    const second = undoEdit(first.next)
    expect(second.undone, 'the 段 the history already held was thrown away').toBe(true)
    expect(second.next.document.schedule).toEqual(ONE_STEP_BACK.schedule)
  })

  for (const row of ['RD-4', 'RD-6']) {
    it(`GIVEN ${row} (${cellOf(row, COL_HISTORY)}) WHEN the replacement lands THEN nothing is left to undo and nothing to redo`, () => {
      const drive = driveOf(row)
      expect(stepCount(drive.start.history), 'the case starts with something to lose').toBe(1)

      const one = bench(drive.start)
      accepted(one.run(drive.call))

      expect(stepCount(one.held().history)).toBe(0)
      expect(undoEdit(one.held()).undone).toBe(false)
      expect(redoEdit(one.held()).redone).toBe(false)
    })
  }

  it('GIVEN RD-4 without OP-4 answered WHEN it replaces THEN WS-3 refuses and the 履歴 is still there', () => {
    // Why: the path does not ask for the confirmation (ImportDocument does), so an
    // unconfirmed replacement comes back as a WS-3 refusal with the holder untouched.
    const start = heldWithOneStep()
    const one = bench(start)
    const outcome = one.run({
      row: 'RD-4',
      importing: { ...REPLACE_CALL, unsavedEditsDiscardConfirmed: false },
    })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.refusal.step).toBe('WS-3')
    expect(one.swapped).toEqual([])
    expect(one.held()).toBe(start)
    expect(stepCount(one.held().history)).toBe(1)
  })
})

describe('表 T-230 の `WS-3` の位置に立つもの -- 行ごとに', () => {
  for (const row of DRIVEN_ROWS) {
    it(`GIVEN ${row} WHEN the replacement lands THEN the document is the one ${cellOf(row, COL_WS3)} answered with`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      const landed = accepted(one.run(drive.call)).document

      // Why: the stamp is left to the stamp-column cases; everything else must be what WS-3 answered.
      expect(landed.schedule).toEqual(drive.ws3Document.schedule)
      expect(landed.documentSettings).toEqual(drive.ws3Document.documentSettings)
      expect(landed.schemaVersion).toBe(drive.ws3Document.schemaVersion)
    })
  }

  for (const row of ['RD-6']) {
    it(`GIVEN ${row} (呼び手が持って来る) WHEN the replacement lands THEN the caller's own document lands unchanged`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      const landed = accepted(one.run(drive.call)).document
      expect(landed).toEqual(OUT_OF_A_FILE)
    })
  }

  it('GIVEN a document FR-023 would refuse WHEN RD-6 brings it THEN it still lands -- 入ってくる文書を検証し直してはならない', () => {
    // Why: RD-6 is the startup road (FR-062), whose document OP-5 and FR-023 already checked.
    const outOfRange = rowed(
      [taskOf({ uid: 3, name: 'written long ago', start: '1801-05-04', finish: '1801-05-08' })],
      stampOf({ scheduleUpdatedAt: FROM_A_FILE, settingsUpdatedAt: FROM_A_FILE }),
    )
    // Why: the bounds are the tool's constants (table T-214); the fixture only has to be one
    // FR-023 turns away, and the next line asserts that it is.
    const verdict = validateImportedDocument(
      { document: outOfRange, byteLength: 1024, emptyRowTaskUids: [] },
    )
    expect(verdict.ok, 'the fixture is meant to be one FR-023 turns away').toBe(false)

    const one = bench(heldWithOneStep())
    const landed = accepted(one.run({ row: 'RD-6', document: outOfRange })).document
    expect(landed).toEqual(outOfRange)
  })
})

describe('WS-6 then WS-7 -- 差し替えの後に通知を配る', () => {
  for (const row of DRIVEN_ROWS) {
    it(`GIVEN ${row} WHEN the replacement is accepted THEN WS-6 runs once, first, and WS-7 once after it`, () => {
      const drive = driveOf(row)
      const one = bench(drive.start)
      accepted(one.run(drive.call))
      expect(one.order).toEqual(['WS-6', 'WS-7'])
      expect(one.swapped).toHaveLength(1)
      expect(one.delivered).toHaveLength(1)
    })
  }

  it('GIVEN a subscriber reading the holder inside WS-7 WHEN it is told THEN it sees the NEW document, never the old one', () => {
    // Why: the expected document is named here, not taken from the outcome, because three of
    // the unit's own outputs agreeing would agree just as well on the wrong document.
    const drive = driveOf('RD-6')
    const one = bench(drive.start)
    const landed = accepted(one.run(drive.call)).document
    expect(one.delivered[0]?.visibleToASubscriber).toEqual(OUT_OF_A_FILE)
    expect(one.delivered[0]?.visibleToASubscriber).toEqual(landed)
    expect(one.delivered[0]?.visibleToASubscriber).not.toEqual(CURRENT)
  })

  it('GIVEN an accepted replacement WHEN WS-7 runs THEN it is handed the very document WS-6 put in place', () => {
    const drive = driveOf('RD-6')
    const one = bench(drive.start)
    const outcome = accepted(one.run(drive.call))
    expect(one.swapped[0]?.document).toEqual(OUT_OF_A_FILE)
    expect(one.delivered[0]?.document).toEqual(OUT_OF_A_FILE)
    expect(one.delivered[0]?.document).toEqual(outcome.document)
    expect(one.swapped[0]?.document).toEqual(outcome.document)
  })

  it('GIVEN a refused write WHEN it is turned away THEN neither WS-6 nor WS-7 runs', () => {
    const one = bench(heldWithOneStep())
    one.run(driveOf('RD-6').call, { moment: { ...CALM, gestureInFlight: true } })
    expect(one.order).toEqual([])
  })
})

describe('スケジュールデータの群が動いたか -- 出て行く文書と入ってくる文書の等値で導く', () => {
  it('GIVEN two different `scheduleUpdatedAt` WHEN the replacement lands THEN WS-7 is told the schedule moved', () => {
    expect(OUT_OF_A_FILE.documentStamp.scheduleUpdatedAt).not.toBe(
      CURRENT.documentStamp.scheduleUpdatedAt,
    )
    const one = bench(heldWithOneStep())
    const outcome = accepted(one.run({ row: 'RD-6', document: OUT_OF_A_FILE }))
    expect(outcome.hasUpdatedSchedule).toBe(true)
    expect(one.delivered[0]?.hasUpdatedSchedule).toBe(true)
  })

  it('GIVEN two equal `scheduleUpdatedAt` WHEN the replacement lands THEN WS-7 is told it did not move, however different the rest is', () => {
    // Why: the judgement is the equality of scheduleUpdatedAt alone, not of the stamp,
    // because AG-6 must not fire on a write that moved only the settings group.
    expect(SAME_SCHEDULE_STAMP.documentStamp.scheduleUpdatedAt).toBe(
      CURRENT.documentStamp.scheduleUpdatedAt,
    )
    expect(SAME_SCHEDULE_STAMP.documentStamp).not.toEqual(CURRENT.documentStamp)
    const one = bench(heldWithOneStep())
    const outcome = accepted(one.run({ row: 'RD-6', document: SAME_SCHEDULE_STAMP }))
    expect(outcome.hasUpdatedSchedule).toBe(false)
    expect(one.delivered[0]?.hasUpdatedSchedule).toBe(false)
  })

  it('GIVEN an undo restoring an EARLIER 刻 WHEN it lands THEN it still counts as moved -- an equality, never an order', () => {
    const drive = driveOf('RD-1')
    expect(drive.ws3Document.documentStamp.scheduleUpdatedAt).toBe(EARLIER)
    expect(EARLIER < NOW, 'the restored 刻 is the EARLIER of the two').toBe(true)

    const one = bench(drive.start)
    const outcome = accepted(one.run(drive.call))
    expect(outcome.hasUpdatedSchedule).toBe(true)
    expect(one.delivered[0]?.hasUpdatedSchedule).toBe(true)
  })

  it('GIVEN every drive WHEN their two 刻 are compared THEN half differ and half match, so the row-by-row case can answer either way', () => {
    // Why: if every drive expected moved, a unit that never judged would pass the case below.
    const expectations = INSTANT_FLAVORS.map((instants) =>
      ROWS.map((row) => {
        const drive = driveOf(row, instants)
        return drive.outgoingScheduleUpdatedAt !== drive.incomingScheduleUpdatedAt
      }),
    )
    expect(expectations[0], 'the `differ` flavor must expect 動いた on every row').toEqual(
      ROWS.map(() => true),
    )
    expect(expectations[1], 'the `match` flavor must expect 動いていない on every row').toEqual(
      ROWS.map(() => false),
    )
  })

  it('GIVEN every drivable row of table T-230, driven both ways WHEN each lands THEN WS-7 is told the equality of the two 刻 THE CASE SET UP', () => {
    // Trap: reading either instant out of one.held() makes the expectation a copy of the
    // answer, and a unit comparing the wrong pair of instants stays green.
    for (const instants of INSTANT_FLAVORS) {
      for (const row of DRIVEN_ROWS) {
        const where = `${row} / ${instants}`
        const drive = driveOf(row, instants)

        expect(drive.start.document.documentStamp.scheduleUpdatedAt, where).toBe(
          drive.outgoingScheduleUpdatedAt,
        )
        if (cellOf(row, COL_STAMP) === '入ってきたまま') {
          expect(drive.ws3Document.documentStamp.scheduleUpdatedAt, where).toBe(
            drive.incomingScheduleUpdatedAt,
          )
        }

        const moved = drive.outgoingScheduleUpdatedAt !== drive.incomingScheduleUpdatedAt
        const one = bench(drive.start)
        const outcome = accepted(one.run(drive.call))
        expect(outcome.hasUpdatedSchedule, where).toBe(moved)
        expect(one.delivered[0]?.hasUpdatedSchedule, where).toBe(moved)
      }
    }
  })

  it('GIVEN a caller that declares no 刻印 WHEN it replaces THEN the answer still follows the two DOCUMENTS, not the declaration', () => {
    // Why: a write with no declaration at all must still be answered, which a derivation
    // reading expectedStamp could not do.
    for (const instants of INSTANT_FLAVORS) {
      const drive = driveOf('RD-6', instants)
      const moved = drive.outgoingScheduleUpdatedAt !== drive.incomingScheduleUpdatedAt
      const one = bench(drive.start)
      const outcome = accepted(one.run(drive.call, { expectedStamp: null }))
      expect(outcome.hasUpdatedSchedule, instants).toBe(moved)
      expect(one.delivered[0]?.hasUpdatedSchedule, instants).toBe(moved)
    }
  })
})

// Why: RD-7's cells are compared with RD-4's rather than typed, because the manuscript
// derives one from the other, and a re-ruling of either row then fails here.
describe('表 T-230 RD-7 -- 扱いは `RD-4` と同じであり、選んだのではなく導いた', () => {
  it('GIVEN RD-7 WHEN its history and undo-step columns are read THEN each is RD-4のもの', () => {
    expect(cellOf('RD-7', COL_STAMP)).not.toBe(cellOf('RD-4', COL_STAMP))
    for (const column of [COL_HISTORY, COL_UNDO_STEP]) {
      expect(cellOf('RD-7', column), `表 T-230 RD-7 / ${column}`).toBe(cellOf('RD-4', column))
    }
    // Why: RD-4's cells differ from the other rows', so the sameness is a claim, not a tautology.
    expect(cellOf('RD-7', COL_HISTORY)).not.toBe(cellOf('RD-6', COL_HISTORY))
    expect(cellOf('RD-7', COL_UNDO_STEP)).not.toBe(cellOf('RD-3', COL_UNDO_STEP))
  })

  it('GIVEN RD-7 WHEN its WS-3 column is read THEN the document is the empty one of table T-342', () => {
    expect(cellOf('RD-4', COL_WS3)).toContain('ImportDocument')
    expect(cellOf('RD-7', COL_WS3), 'the empty document of table T-342').toContain('T-342')
  })

  it('GIVEN RD-7 WHEN its 正 column is read THEN it is `FR-095` ／ `OP-4`', () => {
    const source = headingWith('正')
    expect(cellOf('RD-7', source)).toContain('FR-095')
    expect(cellOf('RD-7', source)).toContain('OP-4')
    expect(cellOf('RD-4', source), 'RD-4 answers to OP-4 too').toContain('OP-4')
  })

  it('履歴: RD-7 (捨てる) leaves nothing to undo and nothing to redo', () => {
    const drive = driveOf('RD-7')
    expect(stepCount(drive.start.history), 'the case starts with something to lose').toBe(1)
    const one = bench(drive.start)
    accepted(one.run(drive.call))
    expect(stepCount(one.held().history)).toBe(0)
    expect(undoEdit(one.held()).undone).toBe(false)
    expect(redoEdit(one.held()).redone).toBe(false)
  })

  it('刻印: RD-7 (進める) lands the stamp this write mints, not the one the document brought', () => {
    const drive = driveOf('RD-7')
    const one = bench(drive.start)
    const landed = accepted(one.run(drive.call)).document
    expect(landed.documentStamp.lastEditedBy).toBe(WRITER)
    expect(landed.documentStamp.settingsUpdatedAt).toBe(WRITE_INSTANT)
    expect(landed.documentStamp.scheduleUpdatedAt).toBe(WRITE_INSTANT)
    expect(landed.documentStamp.fileSavedAt).toBe(drive.ws3Document.documentStamp.fileSavedAt)
  })

  it('取り消しの 1 段: RD-7 (積まない) pushes none', () => {
    const drive = driveOf('RD-7')
    const one = bench(drive.start)
    accepted(one.run(drive.call))
    expect(stepCount(one.held().history)).toBe(0)
  })

  it('`WS-3`: the template the caller brought lands, and WS-6 then WS-7 run once each', () => {
    const drive = driveOf('RD-7')
    const one = bench(drive.start)
    const landed = accepted(one.run(drive.call)).document
    const { documentStamp: _landedStamp, ...landedContents } = landed
    const { documentStamp: _broughtStamp, ...broughtContents } = THE_BUNDLED_TEMPLATE
    expect(landedContents).toEqual(broughtContents)
    expect(landed).not.toEqual(OUT_OF_A_FILE)
    expect(one.order).toEqual(['WS-6', 'WS-7'])
    expect(one.swapped).toHaveLength(1)
    expect(one.delivered).toHaveLength(1)
    expect(one.delivered[0]?.visibleToASubscriber).toEqual(landed)
  })
})
