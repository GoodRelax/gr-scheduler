// CR-757 spec-only stage: manuscripts, a document builder with its own calendar, the write path with undo, and a frame loop.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  FieldCommit,
  PropertyField,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { bare, specTable, unbroken } from './spec-table'

export type Loose = Record<string, any>

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8').replace(/\r\n/g, '\n'))

export const REQUIREMENTS = read('01-04-requirements.md')
export const DESIGN = read('05-07-design.md')
export const GLOSSARY = read('_assets', 'tbl-glossary.md')
export const NOTICE_REASONS = read('_assets', 'tbl-notice-reasons.md')
export const STATE_MACHINE_BOOK = read('_assets', 'tbl-state-machines.md')
export const STATE_MACHINES_SOURCE = JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as {
  readonly regions: readonly Loose[]
}
const withoutBreakMarks = (_key: string, value: unknown): unknown => (typeof value === 'string' ? value.replace(/\|/g, '') : value)
export const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8'), withoutBreakMarks) as Loose

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Loose
const BUILT_VERSION: string = TEMPLATE['schemaVersion']

// see FO-17, WH-11
export function shiftWord(part: string, language: DisplayLanguage): string {
  const entry = (WORDS['wholeScheduleShiftField'] as readonly Loose[]).find((one) => one['part'] === part)
  if (entry === undefined) throw new Error(`the dictionary section wholeScheduleShiftField has no part ${part}`)
  return entry['text'][language] as string
}

// see QN-14, QN-15
export function timeZoneWord(part: string, language: DisplayLanguage): string {
  const entry = (WORDS['timeZoneField'] as readonly Loose[]).find((one) => one['part'] === part)
  if (entry === undefined) throw new Error(`the dictionary section timeZoneField has no part ${part}`)
  return entry['text'][language] as string
}

export function questionWord(rowId: string, language: DisplayLanguage): string {
  const entry = (WORDS['questions'] as readonly Loose[]).find((one) => one['rowId'] === rowId)
  if (entry === undefined) throw new Error(`the dictionary has no question ${rowId}`)
  return entry['text'][language] as string
}

// see T-379
export function whRow(id: string): string {
  const row = specTable('T-379').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-379 has no row ${id}`)
  return unbroken(row.cells.join(' | '))
}

const SPANS = [
  { ordinal: 0, fromTime: '08:00:00', toTime: '12:00:00' },
  { ordinal: 1, fromTime: '13:00:00', toTime: '17:00:00' },
]

export interface ExceptionSpec {
  readonly from: string
  readonly to: string
  readonly working: boolean
  readonly spans?: readonly (readonly [string, string])[]
  readonly recurrenceKind?: number
}

function calendarOf(exceptions: readonly ExceptionSpec[]): Loose {
  // WHY: Monday to Friday 08:00-12:00 and 13:00-17:00 (AT-73 counts 1 Sunday .. 7 Saturday), plus the exceptions a case names.
  const weekDays = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => {
    const working = dayType >= 2 && dayType <= 6
    return { ordinal, dayType, dayWorking: working, workingTimes: working ? SPANS : [], carry: {}, carryElements: [] }
  })
  return {
    uid: 1,
    name: 'Standard',
    isBaseCalendar: true,
    baseCalendarUid: null,
    ordinal: 0,
    carry: {},
    carryElements: [],
    weekDays,
    exceptions: exceptions.map((one, ordinal) => ({
      ordinal,
      name: `exception ${String(ordinal)}`,
      fromDate: `${one.from}T00:00:00`,
      toDate: `${one.to}T23:59:00`,
      dayWorking: one.working,
      recurrenceKind: one.recurrenceKind ?? 9,
      workingTimes: (one.spans ?? []).map(([fromTime, toTime], index) => ({ ordinal: index, fromTime: `${fromTime}:00`, toTime: `${toTime}:00` })),
      carry: {},
      carryElements: [],
    })),
  }
}

export interface TaskSpec {
  readonly uid: number
  readonly name?: string
  readonly start: string | null
  readonly finish: string | null
  readonly parent?: number
  readonly milestone?: boolean
  readonly deadline?: string | null
  readonly actualStart?: string | null
  readonly actualFinish?: string | null
  readonly stop?: string | null
  readonly resume?: string | null
  readonly percentComplete?: number
  readonly fadeInDays?: number | null
  readonly fadeOutDays?: number | null
  readonly after?: readonly (readonly [number, number])[]
}

export interface DocumentSpec {
  readonly tasks: readonly TaskSpec[]
  readonly exceptions?: readonly ExceptionSpec[]
  readonly startDate?: string | null
  readonly statusDate?: string | null
  readonly baselines?: readonly { readonly uid: number; readonly start: string | null; readonly finish: string | null }[]
  readonly highlights?: readonly { readonly id: string; readonly start: string; readonly end: string }[]
  readonly comments?: readonly { readonly id: string; readonly anchor: string }[]
  readonly fitSpanStart?: string | null
  readonly fitSpanFinish?: string | null
  readonly scrollDate?: string | null
}

const taskGroupIdOf = (uid: number): string => `75700000-0000-4000-8000-${String(uid).padStart(12, '0')}`

function taskText(one: TaskSpec, index: number): Loose {
  return {
    uid: one.uid,
    parentTaskUid: one.parent ?? null,
    wbsOrder: index,
    name: one.name ?? `Task ${String(one.uid)}`,
    start: one.start,
    finish: one.finish,
    milestone: one.milestone === true,
    deadline: one.deadline ?? null,
    notes: null,
    calendarUid: null,
    actualStart: one.actualStart ?? null,
    stop: one.stop ?? null,
    actualFinish: one.actualFinish ?? null,
    resume: one.resume ?? null,
    resumeValid: one.resume === undefined || one.resume === null ? null : true,
    percentComplete: one.percentComplete ?? 0,
    fadeInDays: one.fadeInDays ?? null,
    fadeOutDays: one.fadeOutDays ?? null,
    dependencies: (one.after ?? []).map(([predecessorUid, lag]) => ({
      predecessorUid,
      linkType: 1,
      linkLag: lag,
      lagFormat: 7,
      carry: {},
      carryElements: [],
    })),
    carry: {},
    carryElements: [],
  }
}

export function documentOf(spec: DocumentSpec): Document {
  const firstGroup = taskGroupIdOf(spec.tasks[0]?.uid ?? 1)
  const raw: Loose = {
    $schema: TEMPLATE['$schema'],
    schemaVersion: TEMPLATE['schemaVersion'],
    schedule: {
      project: {
        ...structuredClone(TEMPLATE['schedule'].project),
        uidHighWaterMark: 1000,
        calendarUid: 1,
        startDate: spec.startDate === undefined ? null : spec.startDate,
        statusDate: spec.statusDate === undefined ? null : spec.statusDate,
      },
      calendars: [calendarOf(spec.exceptions ?? [])],
      tasks: spec.tasks.map(taskText),
      resources: [],
      assignments: [],
      taskGroups: spec.tasks.map((one, index) => ({
        id: taskGroupIdOf(one.uid),
        parentId: one.parent === undefined ? null : taskGroupIdOf(one.parent),
        name: `row ${String(index + 1)}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'expanded',
        editPermission: null,
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: spec.tasks.map((one) => ({ taskUid: one.uid, taskGroupId: taskGroupIdOf(one.uid) })),
      taskVisuals: [],
      commentBoxes: (spec.comments ?? []).map((one) => ({
        id: one.id,
        leaderShapeKind: null,
        text: 'a note',
        anchorDate: one.anchor,
        anchorTaskGroupId: firstGroup,
        anchorBandFraction: null,
        anchorTaskUid: null,
        anchorTaskFigure: null,
        anchorHighlightBoxId: null,
        anchorSnapPoint: null,
        bodyOffsetPx: null,
        strokeColor: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
        textColor: null,
      })),
      highlightBoxes: (spec.highlights ?? []).map((one) => ({
        id: one.id,
        start: one.start,
        finish: one.end,
        topTaskGroupId: firstGroup,
        bottomTaskGroupId: firstGroup,
        strokeColor: null,
        cornerRadiusPx: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
      })),
      taskOrigins: [],
      baselineTasks: (spec.baselines ?? []).map((one) => ({
        uid: one.uid,
        name: `Task ${String(one.uid)}`,
        start: one.start,
        finish: one.finish,
        milestone: false,
      })),
    },
    documentSettings: {
      ...structuredClone(TEMPLATE['documentSettings']),
      fitSpanStart: spec.fitSpanStart ?? null,
      fitSpanFinish: spec.fitSpanFinish ?? null,
      isFitSpanFixed: false,
      scrollDate: spec.scrollDate ?? null,
      scrollTaskGroupId: firstGroup,
      scrollTaskGroupFraction: 0,
    },
    documentStamp: structuredClone(TEMPLATE['documentStamp']),
    changeLog: [],
  }
  const opened = documentFromJson(JSON.stringify(raw), BUILT_VERSION)
  if (!opened.ok) throw new Error(`the bench document is refused: ${JSON.stringify(opened.faults)}`)
  return opened.document
}

// WHY: the example below table T-379 (CR-757 section 4.6): the calendar holds the one holiday 2029-03-20 (Tuesday).
export const HOLIDAY_2029_03_20: ExceptionSpec = { from: '2029-03-20', to: '2029-03-20', working: false }

export const TASK_A = 1
export const MILESTONE_M = 2
export const TASK_B = 3
export const TASK_C = 4

// WHY: one value in every column WH-7 names, laid on the rows of the worked example of CR-757 section 4.6.
export const WORKED = (): Document =>
  documentOf({
    exceptions: [HOLIDAY_2029_03_20],
    tasks: [
      {
        uid: TASK_A,
        name: 'Task A',
        start: '2028-04-04T08:00:00',
        finish: '2028-04-07T17:00:00',
        actualStart: '2028-04-04T08:00:00',
        stop: '2028-04-05T17:00:00',
        resume: '2028-04-06T08:00:00',
        actualFinish: '2028-04-07T17:00:00',
        percentComplete: 100,
      },
      { uid: MILESTONE_M, name: 'Milestone M', start: '2028-04-14T17:00:00', finish: '2028-04-14T17:00:00', milestone: true },
      {
        uid: TASK_B,
        name: 'Task B',
        start: '2028-05-01T08:00:00',
        finish: '2028-05-02T17:00:00',
        deadline: '2028-05-06T17:00:00',
        percentComplete: 40,
        fadeInDays: 2,
        fadeOutDays: 3,
        after: [[TASK_A, 4800]],
      },
      { uid: TASK_C, name: 'Task C', start: '2028-04-05', finish: '2028-04-08T00:00:00' },
    ],
    startDate: '2028-04-03T08:00:00',
    statusDate: '2028-04-10T17:00:00',
    baselines: [{ uid: TASK_A, start: '2028-04-05T08:00:00', finish: '2028-04-11T17:00:00' }],
    highlights: [{ id: 'hb-weekend', start: '2028-04-29T00:00:00', end: '2028-04-30T23:59:00' }],
    comments: [{ id: 'cb-note', anchor: '2028-03-31T00:00:00' }],
    fitSpanStart: '2028-04-04T00:00:00',
    fitSpanFinish: '2028-05-02T23:59:00',
    scrollDate: '2028-04-10T00:00:00',
  })

export const NEW_START = '2029-03-05'

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

export interface Held {
  readonly document: Document
  readonly history: EditHistory<ChangeStep>
}

export const heldOf = (document: Document): Held => ({ document, history: EMPTY_HISTORY })

export const shiftTo = (newStartDate: string): DocumentCommand =>
  ({ kind: 'shiftScheduleToStartDate', newStartDate }) as unknown as DocumentCommand

export function planned(held: Held, commands: readonly DocumentCommand[]): ReturnType<typeof planDocumentChange> {
  return planDocumentChange({
    defaultTaskGroupName: 'Row',
    document: held.document,
    expectedStamp: held.document.documentStamp,
    commands,
    moment: CALM,
    history: held.history,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'tester',
    updatedAt: '2028-05-02T00:00:00Z',
  })
}

export function written(held: Held, commands: readonly DocumentCommand[]): Held {
  const plan = planned(held, commands)
  if (!plan.ok) throw new Error(`refused: ${JSON.stringify(plan.refusal)}`)
  return { document: plan.document, history: plan.history }
}

export function undone(held: Held): Held {
  const outcome = undoEdit(held)
  if (!outcome.undone) throw new Error('nothing to undo')
  return outcome.next
}

export function redone(held: Held): Held {
  const outcome = redoEdit(held)
  if (!outcome.redone) throw new Error('nothing to redo')
  return outcome.next
}

export const stepsOf = (held: Held): number => held.history.done.length

export function taskIn(document: Document, uid: number): Loose {
  const found = (document.schedule.tasks as unknown as readonly Loose[]).find((one) => one['uid'] === uid)
  if (found === undefined) throw new Error(`the document holds no task ${String(uid)}`)
  return found
}

type Raf = (callback: (time: number) => void) => number
const globalRaf = globalThis as unknown as { requestAnimationFrame?: Raf }
const REAL_RAF = globalRaf.requestAnimationFrame

export function restoreAnimationFrames(): void {
  if (REAL_RAF === undefined) delete globalRaf.requestAnimationFrame
  else globalRaf.requestAnimationFrame = REAL_RAF
}

const SCREEN: FrameEnvironment = { width: 1500, height: 950, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: 'down' | 'up' | 'move', x: number, y: number): PointerInput =>
  ({ kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODIFIERS, clickCount: 1 }) as PointerInput

// see T-103
const partNameOf = (id: string): string => bare(specTable('T-103').rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')
const surfaceOfEntry = (entry: string): string => bare(specTable('T-109').rows.find((one) => one.id === entry)?.by['面'] ?? '')
export const CONFIRMATION_PART = partNameOf('U-55')

// see T-036
export function keyOf(id: string): KeyInput {
  const cell = specTable('T-036').rows.find((one) => one.id === id)?.by['割当'] ?? ''
  const parts = [...(cell.split('／')[0] ?? '').matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? '')
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return { kind: 'key', key: last, modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') } } as KeyInput
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

export const FO_17 = 'FO-17'

export interface ShiftStage {
  readonly loop: FrameLoop
  press(input: HumanInput): Promise<void>
  take(entry: string): Promise<void>
  commit(column: 'newStartDate' | 'entry', text: string): Promise<void>
  commitField(row: string, key: Loose, text: string): Promise<void>
  answer(answer: 'proceed' | 'cancel'): Promise<void>
  lastView(): ScreenView
  allViews(): readonly ScreenView[]
  shiftField(): PropertyField
}

export async function shiftStage(document: Document, language: DisplayLanguage = 'ja'): Promise<ShiftStage> {
  const waiting: ((time: number) => void)[] = []
  globalRaf.requestAnimationFrame = (callback) => {
    waiting.push(callback)
    return waiting.length
  }
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let drawnPart: ScreenPart | null = null
  let nextCommit: FieldCommit | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readFieldCommit: () => {
      const held = nextCommit
      nextCommit = null
      return held
    },
    readFieldEditNotices: () => [],
    readScreenPartAt: () => drawnPart,
  } as unknown as ScreenSurface
  const loop = frameLoop(
    { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    document,
    SCREEN,
    { surface, language } as unknown as ScreenWiring,
  )
  runFrames()
  const turn = async (): Promise<void> => {
    runFrames()
    await settle()
    runFrames()
    await settle()
    runFrames()
  }
  const press = async (input: HumanInput): Promise<void> => {
    loop.receiveInput(input)
    await turn()
  }
  // WHY: as the host does, the change event of a field comes after the release that asked the frame (runAskedFrame spends it).
  const releaseThenCommit = async (commit: FieldCommit): Promise<void> => {
    loop.receiveInput(pointer('down', 3, 3))
    loop.receiveInput(pointer('up', 3, 3))
    nextCommit = commit
    await turn()
  }
  const pressPart = async (part: Loose): Promise<void> => {
    drawnPart = {
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      ...part,
    } as unknown as ScreenPart
    loop.receiveInput(pointer('down', 2, 2))
    runFrames()
    loop.receiveInput(pointer('up', 2, 2))
    runFrames()
    drawnPart = null
    await turn()
  }
  const lastView = (): ScreenView => {
    const view = views[views.length - 1]
    if (view === undefined) throw new Error('the surface was given no description')
    return view
  }
  const stage: ShiftStage = {
    loop,
    press,
    take: (entry) => pressPart({ part: surfaceOfEntry(entry), entry }),
    commit: async (column, text) => {
      await releaseThenCommit({ row: FO_17, key: { holder: 'wholeScheduleShift', column }, text } as unknown as FieldCommit)
    },
    commitField: async (row, key, text) => {
      await releaseThenCommit({ row, key, text } as unknown as FieldCommit)
    },
    answer: (answer) => pressPart({ part: CONFIRMATION_PART, confirmationAnswer: answer }),
    lastView,
    allViews: () => views,
    shiftField: () => {
      const found = lastView().propertiesPanel?.fields.filter((one) => one.row === FO_17) ?? []
      if (found.length !== 1) throw new Error(`expected one ${FO_17} field on the settings face, got ${String(found.length)}`)
      return found[0] as PropertyField
    },
  }
  // WHY: every case starts on the settings face (IC-17), where FO-17 stands.
  await stage.take('IC-17')
  return stage
}
