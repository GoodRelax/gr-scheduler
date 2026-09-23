// PND-318: a GA-20 release on a suspended Task with actualStart but no stop writes nothing (GO-10 needs a stop day).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { specTable, unbroken } from '../contract/spec-table'
import { pointAnswering, scanGrabAreas } from './cr-430-bench'
import {
  PAUSED_UID,
  april,
  benchDocument,
  dayPart,
  dragTo,
  frameOf,
  restoreAnimationFrames,
  stage,
  taskIn,
  xOfDay,
  type Stage,
} from './cr-430-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const T_245_NO_NEW_REFUSALS = '⛔ 本要求は新しい拒み方を立てない。'

afterEach(restoreAnimationFrames)

const withoutStop = (): Document => {
  const document = benchDocument({ progressMarkerVisible: true }) // see S-63
  const tasks = document.schedule.tasks.map((one) => (one.uid === PAUSED_UID ? { ...one, stop: null } : one))
  return { ...document, schedule: { ...document.schedule, tasks } }
}

const resumeIconOf = (one: Stage) => {
  const frame = frameOf(one.loop)
  return pointAnswering(scanGrabAreas(frame.geometry, PAUSED_UID, frame.rowArea), 'GA-20')
}

describe('PND-318 premises: the clauses this case is driven by', () => {
  it('GO-10 still reads the push-back from the stop day, and T-245 raises no new refusal', () => {
    const row = specTable('T-245').rows.find((one) => one.id === 'GO-10')
    if (row === undefined) throw new Error('table T-245 has no row GO-10')
    expect(JSON.stringify(row.by)).toContain('停止日の翌日')
    expect(REQUIREMENTS).toContain(T_245_NO_NEW_REFUSALS)
  })

  it('control: with a stop day the same GA-20 release writes resume', () => {
    const one = stage(benchDocument({ progressMarkerVisible: true }))
    dragTo(one, resumeIconOf(one), xOfDay(one.loop, april(22)))
    expect(dayPart(taskIn(one.loop, PAUSED_UID).resume)).toBe('2026-04-22')
  })
})

describe('PND-318 -- GA-20 on a suspended Task that has no stop day', () => {
  it('GA-20 release on a suspended Task with actualStart but no stop leaves the document unchanged', () => {
    const one = stage(withoutStop())
    const paused = taskIn(one.loop, PAUSED_UID)
    if (paused.actualStart === null || paused.stop !== null) {
      throw new Error('premise: the Task must hold actualStart and no stop')
    }
    const press = resumeIconOf(one)
    const before = JSON.stringify(one.loop.document().schedule)
    dragTo(one, press, xOfDay(one.loop, april(22)))
    expect(JSON.stringify(one.loop.document().schedule), 'GO-10 has no stop day to read from').toBe(before)
  })
})
