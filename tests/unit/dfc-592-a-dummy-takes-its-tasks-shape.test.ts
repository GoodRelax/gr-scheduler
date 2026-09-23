import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Calendar,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

const EVERY_DAY_WORKED = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((ordinal) => ({
    ordinal,
    dayType: ordinal,
    dayWorking: true,
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
} as unknown as Calendar

const task = (over: Readonly<Record<string, unknown>>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
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
    ...over,
  }) as unknown as Task

const visualOf = (shapeKind: string): TaskVisual =>
  ({
    taskUid: 1,
    shapeKind,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }) as unknown as TaskVisual

const scheduleOf = (one: Task, shapeKind: string): Schedule =>
  ({
    project: {
      id: null, name: null, title: null, subject: null, category: null, company: null,
      manager: null, author: null, created: null, revision: null, lastSaved: null,
      startDate: '2026-03-01T00:00:00', statusDate: null, minutesPerDay: null,
      minutesPerWeek: null, daysPerMonth: null, weekStartDay: null,
      calendarUid: EVERY_DAY_WORKED.uid, themeHue: 214, uidHighWaterMark: 1000,
      importSeq: 0, carry: {}, carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks: [one],
    resources: [],
    assignments: [],
    taskGroups: [
      {
        id: 'g1', parentId: null, label: 'g1', derivedFromTaskUid: null, order: 0,
        isCollapsed: false, isHidden: false, color: null, height: null,
      } as unknown as TaskGroup,
    ],
    taskGroupMembers: [
      { taskUid: 1, groupId: 'g1', stackOrder: null },
    ] as unknown as readonly TaskGroupMember[],
    taskVisuals: [visualOf(shapeKind)],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8 }

const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

const draw = (schedule: Schedule): string => {
  const settings = settingsOf({ zoomX: 3, scrollDate: day(1), stackDirection: 'down' })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  return svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen')
}

const notStarted = (shapeKind: string): string =>
  draw(scheduleOf(task({ start: day(4), finish: day(14) }), shapeKind))

const oneWorkingDayActual = (shapeKind: string): string =>
  draw(
    scheduleOf(
      task({
        start: day(4),
        finish: day(14),
        actualStart: day(6),
        actualFinish: day(6),
        percentComplete: 100,
      }),
      shapeKind,
    ),
  )

const signatureOf = (svg: string, figure: string): readonly string[] =>
  [...svg.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*>/g)]
    .filter((hit) => hit[1] !== 'g' && hit[0].includes(`data-figure="${figure}"`))
    .map((hit) => {
      const points = /\spoints="([^"]*)"/.exec(hit[0])
      return points === null
        ? (hit[1] as string)
        : `${hit[1] as string}/${(points[1] as string).trim().split(/\s+/).length}`
    })

const SHAPES = [
  { row: 'SH-1', shapeKind: 'rectangle' },
  { row: 'SH-2', shapeKind: 'chevron' },
  { row: 'SH-3', shapeKind: 'arrow' },
  { row: 'SH-4', shapeKind: 'endpointSpan' },
] as const

describe('T-240 DM-4 / DM-10: ⭐ 印は、長さ 1 稼働日の実績と同じ形で描くこと（MUST）', () => {
  for (const { row, shapeKind } of SHAPES) {
    it(`T-012 ${row} (${shapeKind}): the dummy is the same figure as a 1-working-day actual`, () => {
      const actual = signatureOf(oneWorkingDayActual(shapeKind), 'task-1-actual')
      const dummy = signatureOf(notStarted(shapeKind), 'task-1-dummies')
      expect(actual.length, `${row}: a 1-working-day actual is drawn`).toBeGreaterThan(0)
      expect(dummy.length, `${row}: T-240 DM-2 one dummy mark is drawn`).toBeGreaterThan(0)
      expect(dummy, `T-240 DM-4 for T-012 ${row}`).toEqual(actual)
    })
  }
})
