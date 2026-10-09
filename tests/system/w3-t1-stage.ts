// W3 spec-only stage on the shipped build: a document of N one-task task groups, opened through IC-1 / IC-71, read through the Agent API.

import { expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateDocument } from '../fixtures/grs-document'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { $schema: string; schemaVersion: string; schedule: Record<string, any>; documentSettings: Record<string, unknown>; documentStamp: unknown }

export interface TaskGroupsDocument {
  readonly rows: number
  readonly settings?: Readonly<Record<string, unknown>>
  readonly title?: string
  readonly parentTaskOf?: Readonly<Record<number, number>>
  readonly milestoneUids?: readonly number[]
}

export const rowIdOf = (index: number): string => `5c000000-0000-4000-8000-${String(700000000000 + index)}`
export const taskGroupLabelOf = (index: number): string => `Row ${String(index + 1).padStart(2, '0')}`
export const taskNameOf = (index: number): string => `Task ${String(index + 1).padStart(2, '0')}`

// WHY: March 2026 runs Mon 2 .. Fri 6; every task takes Mon..Wed of the week after the previous one's start, wrapping at 4 weeks.
const startOf = (index: number): string => `2026-03-${String(2 + (index % 4) * 7).padStart(2, '0')}T08:00:00`
const finishOf = (index: number): string => `2026-03-${String(4 + (index % 4) * 7).padStart(2, '0')}T17:00:00`

/** @purity pure */
export function taskGroupsDocument(asked: TaskGroupsDocument): string {
  const indexes = Array.from({ length: asked.rows }, (_one, index) => index)
  const milestones = new Set(asked.milestoneUids ?? [])
  const built = {
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      ...TEMPLATE.schedule,
      project: { ...TEMPLATE.schedule['project'], title: asked.title ?? 'Span plan', statusDate: null, uidHighWaterMark: 1000 },
      tasks: indexes.map((index) => ({
        uid: index + 1,
        parentTaskUid: asked.parentTaskOf?.[index + 1] ?? null,
        wbsOrder: index + 1,
        name: taskNameOf(index),
        start: startOf(index),
        finish: milestones.has(index + 1) ? startOf(index) : finishOf(index),
        milestone: milestones.has(index + 1),
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
      })),
      resources: [],
      assignments: [],
      taskGroups: indexes.map((index) => ({
        ...TEMPLATE.schedule['taskGroups'][0],
        id: rowIdOf(index),
        parentId: null,
        label: taskGroupLabelOf(index),
        order: index,
        treeState: 'auto',
        minHeight: null,
      })),
      taskGroupMembers: indexes.map((index) => ({ taskUid: index + 1, groupId: rowIdOf(index) })),
      taskVisuals: indexes.map((index) => ({
        taskUid: index + 1,
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
      ...TEMPLATE.documentSettings,
      scrollDate: '2026-02-20T00:00:00',
      scrollDayOffset: 0,
      scrollGroupId: rowIdOf(0),
      scrollGroupOffset: 0,
      ...(asked.settings ?? {}),
    },
    documentStamp: TEMPLATE.documentStamp,
    changeLog: [],
  }
  const checked = validateDocument(built)
  expect(checked.errors, 'the fixture is a document the schema accepts').toEqual([])
  return JSON.stringify(built)
}

/** @purity semi-pure-b */
export async function readDocumentOf(page: Page): Promise<any> {
  return page.evaluate(() => (window as unknown as { grSchedulerAgentApi: { readDocument(): unknown } }).grSchedulerAgentApi.readDocument())
}

/** @purity non-pure */
export async function applyCommandsOf(page: Page, commands: readonly unknown[]): Promise<any> {
  return page.evaluate(async (list: readonly unknown[]) => {
    const api = (window as unknown as { grSchedulerAgentApi: { readStamp(): unknown; applyCommands(request: unknown): unknown } })
      .grSchedulerAgentApi
    return await api.applyCommands({ readStamp: api.readStamp(), commands: list })
  }, commands)
}

/** @purity semi-pure-b */
export async function exportSvgOf(page: Page): Promise<any> {
  return page.evaluate(async () => {
    const api = (window as unknown as { grSchedulerAgentApi: { exportSvg(): unknown } }).grSchedulerAgentApi
    return await api.exportSvg()
  })
}
