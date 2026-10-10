// CR-731 spec-only stage: small documents the viewpoints of T-310 to T-312 find, the seam names of CR-731 section 5 (looked up, never assumed), and the one write path.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
import { specTable, unbroken } from './spec-table'

export type Loose = Record<string, unknown>

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8'))

export const REQUIREMENTS = read('01-04-requirements.md')
export const DESIGN = read('05-07-design.md')
export const GLOSSARY = read('_assets', 'tbl-glossary.md')
export const SETTINGS_BOOK = read('_assets', 'tbl-settings.md')
export const STATE_MACHINE_BOOK = read('_assets', 'tbl-state-machines.md')
export const STATE_MACHINES_SOURCE = JSON.parse(
  readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8'),
) as { readonly regions: readonly Record<string, any>[] }
export const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as Record<string, any>
export const SETTINGS_SOURCE = JSON.parse(readFileSync(join(SPEC, '_source', 'settings.json'), 'utf8')) as unknown

export const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>
export const BUILT_VERSION: string = TEMPLATE['schemaVersion']


declare global {
  interface ImportMeta {
    glob(pattern: string, options: { readonly eager: true }): Record<string, Record<string, unknown>>
  }
}

const DELAY_FIXES_FILE = import.meta.glob('../../src/entity/document-model/schedule/delay-fixes.ts', { eager: true })

function seamNamed(name: string): ((...args: any[]) => unknown) | null {
  for (const module of [...Object.values(DELAY_FIXES_FILE), scheduleEntry as unknown as Record<string, unknown>]) {
    const found = module[name]
    if (typeof found === 'function') return found as (...args: any[]) => unknown
  }
  return null
}

export function hasSeam(name: string): boolean {
  return seamNamed(name) !== null
}

export function seam(name: string): (...args: any[]) => unknown {
  const found = seamNamed(name)
  if (found === null) {
    throw new Error(
      `CR-731 section 5: ${name} is not exported from src/entity/document-model/schedule/delay-fixes.ts (nor from the Schedule entry)`,
    )
  }
  return found
}

export interface FixRow {
  readonly fixRow: string
  readonly findingRow: string
  readonly taskUid: number
  readonly column: unknown
  readonly before: unknown
  readonly after: unknown
  readonly fixType: 'automatic' | 'choose' | 'suggestedDate' | 'byHand'
  readonly choices?: readonly unknown[] | null
  readonly causedBy?: unknown
  readonly refusal?: unknown
  readonly [key: string]: unknown
}

export const FIX_TYPES = ['automatic', 'choose', 'suggestedDate', 'byHand'] as const


export interface TaskSpec {
  readonly uid: number
  readonly name?: string
  readonly start: string
  readonly finish: string
  readonly parent?: number
  readonly actualStart?: string
  readonly actualFinish?: string
  readonly stop?: string
  readonly resume?: string
  readonly resumeValid?: boolean
  readonly percentComplete?: number
  readonly milestone?: boolean
  readonly after?: readonly (readonly [number, number, number?])[]
  readonly readOnly?: boolean
  readonly derivedUnder?: number
}

export interface DocumentSpec {
  readonly statusDate: string | null
  readonly sourceFormat?: string
}

const at = (day: string, time: string): string => `${day}T${time}`
export const START_OF = (day: string): string => at(day, '08:00:00')
export const FINISH_OF = (day: string): string => at(day, '17:00:00')

export const FS = 1

function dependencyOf(predecessorUid: number, linkType: number, lag: number): Loose {
  return { predecessorUid, linkType, lag, lagFormat: 7, carry: {}, carryElements: [] }
}

const groupIdOf = (uid: number): string => `cccccccc-0000-4000-8000-${String(uid).padStart(12, '0')}`

export function documentOf(tasks: readonly TaskSpec[], spec: DocumentSpec): Document {
  const seeds = tasks.map((one) => ({ id: groupIdOf(one.uid), parentId: one.parent === undefined && one.derivedUnder === undefined ? null : groupIdOf((one.parent ?? one.derivedUnder) as number) }))
  const taskText = (one: TaskSpec): Loose => ({
    uid: one.uid,
    parentTaskUid: one.parent ?? null,
    wbsOrder: one.uid,
    name: one.name ?? `Task ${String(one.uid)}`,
    start: one.start,
    finish: one.finish,
    milestone: one.milestone === true,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: one.actualStart ?? null,
    stop: one.stop ?? null,
    actualFinish: one.actualFinish ?? null,
    resume: one.resume ?? null,
    resumeValid: one.resumeValid ?? null,
    percentComplete: one.percentComplete ?? 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: (one.after ?? []).map(([predecessor, linkType, lag]) => dependencyOf(predecessor, linkType, lag ?? 0)),
    carry: {},
    carryElements: [],
  })
  const raw: Loose = {
    $schema: TEMPLATE['$schema'],
    schemaVersion: TEMPLATE['schemaVersion'],
    schedule: {
      project: {
        ...structuredClone(TEMPLATE['schedule'].project),
        uidHighWaterMark: 1000,
        statusDate: spec.statusDate,
        ...(spec.sourceFormat === undefined ? {} : { sourceFormat: spec.sourceFormat }),
      },
      calendars: structuredClone(TEMPLATE['schedule'].calendars),
      tasks: tasks.map(taskText),
      resources: [],
      assignments: [],
      taskGroups: seeds.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `row ${String(index + 1)}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'expanded',
        editGroup: tasks[index]?.readOnly === true ? 'imported-plan' : null,
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, groupId: groupIdOf(one.uid) })),
      taskVisuals: tasks.map((one) => ({
        taskUid: one.uid,
        shapeKind: null,
        milestoneGlyph: null,
        fillColor: null,
        strokeColor: null,
        strokeWidthPx: null,
      })),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE['documentSettings']),
      scrollDate: '2027-05-01T00:00:00',
      scrollGroupId: seeds[0]?.id ?? null,
      scrollGroupOffset: 0,
      zoomY: 1,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE['documentStamp']),
    changeLog: [],
  }
  const opened = documentFromJson(JSON.stringify(raw), BUILT_VERSION)
  if (!opened.ok) throw new Error(`the bench document is refused: ${JSON.stringify(opened.faults)}`)
  return opened.document
}

export const BEFORE_ALL = '2027-05-01T00:00:00'


export function diagnosed(document: Document): any {
  const make = (scheduleEntry as unknown as { diagnoseDelay?: (d: Document, c: unknown) => unknown }).diagnoseDelay
  if (typeof make !== 'function') throw new Error('S-1: the Schedule entry (schedule.ts) publishes no diagnoseDelay')
  return make(document, scheduleEntry.workingCalendarOf(document.schedule))
}

export function findingRowsOf(document: Document): string[] {
  return (diagnosed(document).findings as readonly { row: string }[]).map((one) => one.row)
}

export function rowsOf(result: unknown): readonly FixRow[] {
  if (Array.isArray(result)) return result as readonly FixRow[]
  const inside = (result as { rows?: unknown } | null)?.rows
  if (Array.isArray(inside)) return inside as readonly FixRow[]
  throw new Error('proposeDelayFixes answered neither a list of DelayFixRow nor an object holding one under rows')
}

// WHY: the third argument (`checks`) is named by CR-731 section 5 and by nothing else; its shape is the one thing the specification leaves open.
// A case that does not need it calls with none; a case that does names the shapes it tried.
const NO_CHECKS: readonly unknown[] = [undefined, [], new Set<string>(), new Map<string, boolean>(), {}]

export function proposed(document: Document, checks?: unknown): readonly FixRow[] {
  const propose = seam('proposeDelayFixes')
  const report = diagnosed(document)
  if (checks !== undefined) return rowsOf(propose(document, report, checks))
  let last: unknown = null
  for (const candidate of NO_CHECKS) {
    try {
      return rowsOf(propose(document, report, candidate))
    } catch (failure) {
      last = failure
    }
  }
  throw last instanceof Error ? last : new Error('proposeDelayFixes refused every empty form of checks')
}

export const machineRows = (rows: readonly FixRow[]): readonly FixRow[] =>
  rows.filter((one) => one.fixType === 'automatic' && (one.refusal === null || one.refusal === undefined))

export const rowsFor = (rows: readonly FixRow[], findingRow: string): readonly FixRow[] =>
  rows.filter((one) => one.findingRow === findingRow)

export const rowsOfFix = (rows: readonly FixRow[], fixRow: string): readonly FixRow[] => rows.filter((one) => one.fixRow === fixRow)

export function oneRow(rows: readonly FixRow[], findingRow: string, taskUid?: number): FixRow {
  const found = rows.filter((one) => one.findingRow === findingRow && (taskUid === undefined || one.taskUid === taskUid))
  if (found.length !== 1) {
    throw new Error(
      `expected one proposal row for ${findingRow}${taskUid === undefined ? '' : ` on task ${String(taskUid)}`}, got ${String(found.length)}: ` +
        JSON.stringify(rows.map((one) => [one.fixRow, one.findingRow, one.taskUid])),
    )
  }
  return found[0] as FixRow
}

export function dayTextIn(value: unknown): string[] {
  return [...JSON.stringify(value ?? null).matchAll(/(\d{4})[/-](\d{2})[/-](\d{2})/g)].map((one) => `${one[1]}-${one[2]}-${one[3]}`)
}

export function commandsOf(rows: readonly FixRow[]): readonly DocumentCommand[] {
  const made = seam('delayFixCommands')(rows)
  if (!Array.isArray(made)) throw new Error('delayFixCommands answered no list of commands')
  return made as readonly DocumentCommand[]
}


const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
export const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
export const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

export interface Held {
  readonly document: Document
  readonly history: EditHistory<ChangeStep>
}

export const heldOf = (document: Document): Held => ({ document, history: EMPTY_HISTORY })

export function planned(held: Held, commands: readonly DocumentCommand[]): ReturnType<typeof planDocumentChange> {
  return planDocumentChange({
    defaultTaskGroupName: 'Row',
    document: held.document,
    readStamp: held.document.documentStamp,
    commands,
    moment: CALM,
    history: held.history,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'tester',
    updatedUtc: '2027-05-02T00:00:00Z',
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

export const dayOf = (value: unknown): string | null => (typeof value === 'string' ? value.slice(0, 10) : null)


export function cellOf(table: string, id: string, heading: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${heading}`)
  return unbroken(cell)
}

export function rowText(table: string, id: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.cells.join(' | '))
}

export function iconWord(rowId: string, field: 'label' | 'hint', language: 'ja' | 'en'): string | undefined {
  const entry = (WORDS['icons'] as readonly Record<string, any>[]).find((one) => one['rowId'] === rowId)
  return entry?.[field]?.[language]
}

export function lazily<T>(make: () => T): () => T {
  let made: { readonly value: T } | null = null
  return () => {
    made ??= { value: make() }
    return made.value
  }
}
