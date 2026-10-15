// CR-760 spec-only cases: progressMarkerOf (PI-1) answers one marker -- PM-4 when late (T-021b), a diagnosed DG-1 .. DG-3 first (T-315)

import { describe, expect, it } from 'vitest'

import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  PI_1_CALL,
  PI_1_NO_COPY,
  PM_4_MUST,
  PM_4_NOT_FINISHED,
  T_021B_ALL,
  T_315_PRIORITY,
  publishedNoteOf,
} from './cr-760-clauses'
import {
  DIAGNOSED,
  MARKER_STATUS_DATE,
  MARKER_TASKS,
  calendarDayOf,
  markerDocument,
  markerTask,
  markerWithoutDiagnosis,
  progressMarkerSeam,
  type MarkerTask,
} from './cr-760-stage'
import { REQUIREMENTS, cellOf } from './cr-731-stage'
import { specTable } from './spec-table'

const DOCUMENT = markerDocument()
const STATUS_DAY = calendarDayOf(MARKER_STATUS_DATE)

const taskOf = (uid: number): Task => {
  const found = DOCUMENT.schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`premise: the document holds task ${uid}`)
  return found
}

const caseName = (task: MarkerTask): string => `${task.name} (${task.state}${task.late === null ? '' : `, late by ${task.late}`})`

describe('PI-1 progressMarkerOf -- the manuscript these cases read', () => {
  it('PI-1 publishes progressMarkerOf, says how it is called, and forbids a copy of the order', () => {
    const note = publishedNoteOf('progressMarkerOf').join('')
    expect(note).toContain(PI_1_CALL)
    expect(note).toContain(PI_1_NO_COPY)
  })

  it('T-021 puts PM-4 over the state and never on a finished task; T-021b holds every condition of PM-4; T-315 lets the smaller win', () => {
    expect(REQUIREMENTS).toContain(PM_4_MUST)
    expect(cellOf('T-021', 'PM-4', '対応する状態')).toContain(PM_4_NOT_FINISHED)
    expect(REQUIREMENTS).toContain(T_021B_ALL)
    expect(specTable('T-021b').rows.map((one) => one.id)).toEqual(['DL-1', 'DL-2', 'DL-3'])
    expect(REQUIREMENTS).toContain(T_315_PRIORITY)
    expect(specTable('T-315').rows.map((one) => one.id)).toEqual(['DG-1', 'DG-2', 'DG-3', 'DG-4'])
  })

  it('premise: the fixture holds every state of T-019a, every row of T-021b, and a finished task past its finish', () => {
    expect(new Set(MARKER_TASKS.map((one) => one.state))).toEqual(new Set(['PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5']))
    expect(new Set(MARKER_TASKS.map((one) => one.late))).toEqual(new Set([null, 'DL-1', 'DL-2', 'DL-3']))
    expect(String(taskOf(4).finish) < MARKER_STATUS_DATE, 'Done finished before the status date').toBe(true)
  })
})

describe('T-021 / T-021b -- with no diagnosis, PM-4 when late, otherwise the marker of the state', () => {
  it.each(MARKER_TASKS.map((one) => [caseName(one), one] as const))('%s', (_name, task) => {
    const marker = progressMarkerSeam()
    expect(marker(taskOf(task.uid), STATUS_DAY)).toBe(markerWithoutDiagnosis(task))
    expect(marker(taskOf(task.uid), STATUS_DAY, undefined), 'no diagnosed row is the same as none passed').toBe(markerWithoutDiagnosis(task))
  })

  it('a milestone not started past its start is late too (DL-2)', () => {
    expect(markerTask(11).late).toBe('DL-2')
    expect(progressMarkerSeam()(taskOf(11), STATUS_DAY)).toBe('PM-4')
  })

  it('a finished task whose finish has passed is never late (PM-2, not PM-4)', () => {
    expect(progressMarkerSeam()(taskOf(4), STATUS_DAY)).toBe('PM-2')
  })
})

describe('T-315 -- a diagnosed DG-1 .. DG-3 wins over PM-4 and over the state', () => {
  const late = MARKER_TASKS.filter((one) => one.late !== null)
  const onTime = MARKER_TASKS.filter((one) => one.late === null && one.state !== 'PS-2')

  it.each(DIAGNOSED)('%s wins over PM-4 on every late task', (row) => {
    for (const task of late) expect(progressMarkerSeam()(taskOf(task.uid), STATUS_DAY, row), caseName(task)).toBe(row)
  })

  it.each(DIAGNOSED)('%s wins over the state marker of every task that is not late', (row) => {
    for (const task of onTime) expect(progressMarkerSeam()(taskOf(task.uid), STATUS_DAY, row), caseName(task)).toBe(row)
  })

  it('DG-1 wins over the finished marker as well (DG-1 has no condition on the state, T-315)', () => {
    expect(progressMarkerSeam()(taskOf(4), STATUS_DAY, 'DG-1')).toBe('DG-1')
  })
})
