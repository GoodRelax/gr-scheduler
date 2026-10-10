// CR-723 spec-only fixture: the text of a GRS JSON document with five tasks and three resources, reading nothing from src/ but the startup template.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Loose = Record<string, unknown>

export const ALPHA = 1
export const BRAVO = 2
export const CHARLIE = 3
export const DELTA = 4
export const ECHO = 5
export const SATO = 2001
export const TANAKA = 2002
export const IDLE = 2003
export const GROUP = '5c000000-0000-4000-8000-000000007230'

// WHY: the system cases scroll to a day clear of the palette so every figure is on the screen.
export const SCROLLED_CLEAR_OF_THE_PALETTE: Loose = {
  zoomX: 6,
  scrollDate: '2025-12-20T00:00:00',
  scrollDayOffset: 0,
  scrollGroupId: GROUP,
  scrollGroupOffset: 0,
}

const TASK_DAYS: readonly (readonly [number, string, string])[] = [
  [ALPHA, '2026-01-05', '2026-01-09'],
  [BRAVO, '2026-01-06', '2026-01-08'],
  [CHARLIE, '2026-01-12', '2026-01-14'],
  [DELTA, '2026-01-13', '2026-01-16'],
  [ECHO, '2026-01-15', '2026-01-17'],
]
const NAMES: Readonly<Record<number, string>> = { [ALPHA]: 'Alpha', [BRAVO]: 'Bravo', [CHARLIE]: 'Charlie', [DELTA]: 'Delta', [ECHO]: 'Echo' }

/** @purity semi-pure-b */
export function templateCopy(): Loose {
  return JSON.parse(readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')) as Loose
}

// WHY: Sato carries Alpha and Charlie, Tanaka Bravo and Delta, Echo nobody, and Idle carries no task; every field the schema asks for is present.
/** @purity semi-pure-b */
export function scheduleFixture(): Loose {
  const schedule = templateCopy()['schedule'] as Loose
  const group = (schedule['taskGroups'] as Loose[])[0] as Loose
  const resource = (schedule['resources'] as Loose[])[0] as Loose
  const tasks = TASK_DAYS.map(([uid, from, to]) => ({
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name: NAMES[uid],
    start: `${from}T00:00:00`,
    finish: `${to}T00:00:00`,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualFinish: null,
    stop: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }))
  const pairs: readonly (readonly [number, number])[] = [
    [ALPHA, SATO],
    [BRAVO, TANAKA],
    [CHARLIE, SATO],
    [DELTA, TANAKA],
  ]
  return {
    ...schedule,
    project: { ...(schedule['project'] as Loose), statusDate: '2026-01-20T17:00:00', uidHighWaterMark: 3000 },
    tasks,
    resources: [SATO, TANAKA, IDLE].map((uid) => ({ ...resource, uid, name: uid === SATO ? 'Sato Hanako' : uid === TANAKA ? 'Tanaka Jiro' : 'Idle Ken' })),
    assignments: pairs.map(([taskUid, resourceUid], at) => ({ uid: 2101 + at, taskUid, resourceUid, carry: {}, carryElements: [] })),
    taskGroups: [{ ...group, id: GROUP, parentId: null, label: 'Row', order: 0, treeState: 'expanded', minHeight: null }],
    taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, groupId: GROUP })),
    taskVisuals: tasks.map((one) => ({ taskUid: one.uid, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null })),
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }
}

/** @purity semi-pure-b */
export function documentText(settingsPart: Loose = {}, schedule: unknown = scheduleFixture()): string {
  const base = templateCopy()
  const settings = base['documentSettings'] as Loose
  return JSON.stringify({ ...base, schedule, documentSettings: { ...settings, ...settingsPart } })
}
