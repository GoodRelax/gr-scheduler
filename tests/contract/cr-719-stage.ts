// CR-719: the shared bench the spec-only cr-719-*.test.ts files drive the import check, the frame loop and the file flow through.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { HumanInput, InputModifiers } from '../../src/adapter/input-command-translator/input-command-translator'
import type { DisplayLanguage, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { blankTaskVisual, type Project, type Task } from '../../src/entity/document-model/schedule/schedule'
import { frameLoop, type FrameEnvironment, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { validateImportedDocument, type ImportCandidate, type ImportVerdict } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { specTable, unbroken, type SpecRow } from './spec-table'
import { taskGroupDocument, taskOf as jsonTaskOf } from '../unit/cr-541-stage'

export const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

export const DISPLAY_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { reasons: { rowId: string; text: { ja: string; en: string }; nextStep?: { ja: string; en: string } }[] }

/** @purity pure */
export function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** @purity pure */
export function wordsOf(rowId: string): { ja: string; en: string; nextStepJa: string; nextStepEn: string } {
  const found = DISPLAY_WORDS.reasons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return { ja: found.text.ja, en: found.text.en, nextStepJa: found.nextStep?.ja ?? '', nextStepEn: found.nextStep?.en ?? '' }
}

// see FR-076
/** @purity pure */
export function filled(words: string): string {
  return words.replace(/\{(\w+)\}/g, (_whole, name: string) => {
    const value = (SETTINGS_CONSTANTS as Record<string, unknown>)[name]
    if (value === undefined) throw new Error(`the settings constants hold no ${name}`)
    return String(value)
  })
}

// see S-113, S-114, S-115
export const LIMITS = {
  bytes: Number(SETTINGS_CONSTANTS['importMaxBytes']),
  items: Number(SETTINGS_CONSTANTS['importMaxItems']),
  depth: Number(SETTINGS_CONSTANTS['importMaxDepth']),
}
export const BYTES_PER_MEGABYTE = 1024 * 1024

export const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
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

const projectOf = (): Project => ({
  id: null,
  name: null,
  title: 'A',
  subject: null,
  category: null,
  company: null,
  manager: null,
  author: null,
  created: null,
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
  parentProgressToleranceDays: 1,
  uidHighWaterMark: 0,
  importSeq: 0,
  outlineBase: 1,
  sourceFormat: 'grs',
  carry: {},
  carryElements: [],
})

export const documentOf = (tasks: readonly Task[]): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: projectOf(),
      calendars: [],
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: tasks.map((one) => blankTaskVisual(one.uid)),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {},
    documentStamp: { scheduleUpdatedUtc: '2026-08-17T00:00:00Z', lastEditedBy: 'user', settingsUpdatedUtc: '2026-08-17T00:00:00Z' },
    changeLog: [],
  }) as unknown as Document

export const goodTask = (uid: number, part: Partial<Task> = {}): Task =>
  taskOf({ uid, name: `t${uid}`, start: '2026-01-05', finish: '2026-01-09', ...part })

export const verdictOf = (
  tasks: readonly Task[],
  byteLength = 1024,
  emptyRowTaskUids: readonly number[] = [],
): ImportVerdict => validateImportedDocument({ document: documentOf(tasks), byteLength, emptyRowTaskUids } as ImportCandidate)

export const refusalsOf = (verdict: ImportVerdict): readonly { rule: string; notice: string }[] =>
  verdict.ok ? [] : verdict.refusals.map((one) => ({ rule: one.rule, notice: one.notice }))

export const rulesOf = (verdict: ImportVerdict): readonly string[] => refusalsOf(verdict).map((one) => one.rule)

export const chainOfDepth = (depth: number): readonly Task[] =>
  Array.from({ length: depth }, (_, index) => goodTask(index + 1, { parentTaskUid: index === 0 ? null : index }))

const GROUP = 'task-group-1'

export function grsJsonOf(count: number, shape: (task: Record<string, unknown>, index: number) => void = () => undefined): string {
  const draft = taskGroupDocument([{ id: GROUP, parentId: null }])
  draft.schedule.project.uidHighWaterMark = count
  draft.schedule.tasks = Array.from({ length: count }, (_, index) => {
    const task = jsonTaskOf(index + 1, { name: `T${index + 1}` })
    shape(task, index)
    return task
  })
  draft.schedule.taskGroupMembers = draft.schedule.tasks.map((one: Record<string, unknown>) => ({ taskUid: one['uid'], groupId: GROUP }))
  draft.schedule.taskVisuals = draft.schedule.tasks.map((one: Record<string, unknown>) => blankTaskVisual(one['uid'] as number))
  return JSON.stringify(draft)
}

export function assertReadable(text: string): void {
  const read = documentFromJson(text)
  expect(read.ok, `premise: the bench file is GRS JSON: ${read.ok ? '' : JSON.stringify(read.faults).slice(0, 300)}`).toBe(true)
}

export const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

// see BT-4
export function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const SCREEN: FrameEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

// WHY: any happening spends a settled value; a pointer move decides nothing else.
const SPENDING_HAPPENING: HumanInput = {
  kind: 'pointer',
  phase: 'move',
  button: 'left',
  x: 500,
  y: 400,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
} as HumanInput

export interface SettleLoop {
  settle(commit: { row: string; key: unknown; text: string }): void
  notices(): readonly { text: string; manner: string; nextSteps: readonly string[]; dismissText: string; raisedNotices: readonly { reason: string }[] }[]
  document(): Document
}

/** @purity non-pure */
export function settleLoop(document: Document): SettleLoop {
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  let held: unknown = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => {
      const one = held
      held = null
      return one as never
    },
    readScreenPartAt: () => null as ScreenPart | null,
  }
  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, wiring)
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
  }
  runFrames()
  return {
    settle: (commit) => {
      held = commit
      loop.receiveInput(SPENDING_HAPPENING)
      runFrames()
    },
    notices: () => (views[views.length - 1]?.notices ?? []) as never,
    document: () => loop.document(),
  }
}

export function firstTask(document: Document): Task {
  const task = document.schedule.tasks[0]
  if (task === undefined) throw new Error('the bundled template holds no Task')
  return task
}
