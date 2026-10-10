// CR-722 spec-only stage: a small document with two resources, the three tables' Visibility, and the seam names of CR-722 section 5.1.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { TableVisibility, VisibilityTable } from '../../src/use-case/advance-screen-session/screen-values'
import { drawnTaskUidsOf } from '../../src/framework/single-html-shell/shown-tasks-hold'

import { unbroken } from './spec-table'

export type { TableVisibility, VisibilityTable }

export const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

type Loose = Record<string, unknown>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose
const D = (day: string): string => `${day}T00:00:00`

export const ALPHA = 1
export const BRAVO = 2
export const CHARLIE = 3
export const DELTA = 4
export const ECHO = 5
export const SATO = 2001
export const TANAKA = 2002
export const IDLE = 2003

// WHY: Alpha is Sato's, Bravo Tanaka's, Charlie both, Delta and Echo nobody's; Idle carries no task (RQ-4 reads 0).
const TASKS: readonly { readonly uid: number; readonly name: string; readonly day: string }[] = [
  { uid: ALPHA, name: 'Alpha', day: '2026-04-01' },
  { uid: BRAVO, name: 'Bravo', day: '2026-04-02' },
  { uid: CHARLIE, name: 'Charlie', day: '2026-04-03' },
  { uid: DELTA, name: 'Delta', day: '2026-04-06' },
  { uid: ECHO, name: 'Echo', day: '2026-04-07' },
]
const PAIRS: readonly (readonly [number, number])[] = [
  [ALPHA, SATO],
  [BRAVO, TANAKA],
  [CHARLIE, SATO],
  [CHARLIE, TANAKA],
]
const G_ONE = 'g-one'

export function scheduleWith(pairs: readonly (readonly [number, number])[] = PAIRS): Schedule {
  return {
    ...TEMPLATE.schedule,
    tasks: TASKS.map((spec) => ({
      ...firstOf('tasks'),
      uid: spec.uid,
      parentTaskUid: null,
      wbsOrder: spec.uid,
      name: spec.name,
      start: D(spec.day),
      finish: D(spec.day),
      milestone: false,
      percentComplete: 0,
      dependencies: [],
      notes: null,
      actualStart: null,
      stop: null,
      actualFinish: null,
      resume: null,
      resumeValid: null,
    })),
    resources: [
      { ...firstOf('resources'), uid: SATO, name: 'Sato Hanako' },
      { ...firstOf('resources'), uid: TANAKA, name: 'Tanaka Jiro' },
      { ...firstOf('resources'), uid: IDLE, name: 'Idle Ken' },
    ],
    assignments: pairs.map(([taskUid, resourceUid], at) => ({ ...firstOf('assignments'), uid: 3000 + at, taskUid, resourceUid })),
    taskGroups: [{ ...firstOf('taskGroups'), id: G_ONE, parentId: null, order: 0, label: 'Row', derivedFromTaskUid: null, treeState: 'expanded' }],
    taskGroupMembers: TASKS.map((one) => ({ taskUid: one.uid, groupId: G_ONE })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

export const SCHEDULE = scheduleWith()
export const ALL_TASKS: readonly number[] = TASKS.map((one) => one.uid)

// see TV-2
export const ALL_SHOWN: TableVisibility = { hiddenKeys: [], isUnassignedHidden: false, isApplied: false }

export const visibility = (part: Partial<TableVisibility>): TableVisibility => ({ ...ALL_SHOWN, ...part })

// WHY: section 5.1 names the arguments but not whether a table is passed bare or inside its session; this value reads as both.
const table = (held: TableVisibility): TableVisibility => ({ ...held, visibility: held }) as unknown as TableVisibility

// WHY: section 5.1 does not say whether a uid collection is an array or a set; this value answers includes, has and iteration.
export function uids(list: readonly number[]): readonly number[] {
  return Object.assign([...list], { has: (uid: number): boolean => list.includes(uid), size: list.length })
}

export interface Tables {
  readonly search?: TableVisibility
  readonly report?: TableVisibility
  readonly reportTaskUids?: readonly number[] | null
  readonly resourceList?: TableVisibility
  readonly created?: readonly number[]
}

// see TV-1, TV-2, TV-7, TV-13
export function drawn(tables: Tables, schedule: Schedule = SCHEDULE): readonly number[] | null {
  const made = drawnTaskUidsOf(
    schedule,
    table(tables.search ?? ALL_SHOWN),
    table(tables.report ?? ALL_SHOWN),
    tables.reportTaskUids === undefined ? null : tables.reportTaskUids === null ? null : uids(tables.reportTaskUids),
    table(tables.resourceList ?? ALL_SHOWN),
    uids(tables.created ?? []),
  ) as Iterable<number> | null
  return made === null ? null : [...made].sort((a, b) => a - b)
}

// WHY: the dictionary is the spec's own file; a word is read from it, never retyped here.
type Words = Record<DisplayLanguage, string>
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as Record<
  string,
  readonly { readonly part?: string; readonly rowId?: string; readonly name?: string; readonly text?: Words; readonly heading?: Words }[]
>

export function wordOf(group: string, key: string, language: DisplayLanguage): string {
  const found = (WORDS[group] ?? []).find((one) => one.part === key || one.rowId === key || one.name === key)
  const text = found?.text ?? found?.heading
  if (text === undefined) throw new Error(`the dictionary has no ${group}/${key}`)
  return text[language]
}

// see TV-11
export const SURFACE_OF: Readonly<Record<VisibilityTable, string>> = {
  searchPanel: 'Search Panel',
  delayDiagnosticsReport: 'Delay Diagnostics Report',
  resourceList: 'Resource List',
}
