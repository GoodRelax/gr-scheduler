// DFC-1051 spec-only tests: FD-6 note -- the number of days a fade grab point (GA-7 / GA-8) lets one pull is a number IV-12 accepts.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { pointAnswering, scanGrabAreas } from '../unit/cr-430-bench'
import {
  FADED_UID,
  april,
  benchDocument,
  dragTo,
  frameOf,
  pressAndRelease,
  restoreAnimationFrames,
  stage,
  taskIn,
  type Stage,
} from '../unit/cr-430-stage'
import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FD_6_SAME_COUNT =
  '⛔ 本表の「期間」は暦日で数えること（MUST）。'
const FD_6_IV_12_AGREES =
  '⚠️ **表 T-220 の `IV-12` も同じ数え方に従うこと（MUST）** —— 一方が暦日、他方が稼働日だと、`FR-016` の掴み点が許した日数を不変条件が拒む'

afterEach(restoreAnimationFrames)

// WHY: a task from Mon 6 April to Mon 16 April, so the span is ten calendar days (eleven when both end days are counted);
// the other end already holds four days, so a pull of the first end past six days is more than the task can hold.
const SPAN_DAYS_AT_MOST = 11
const KEPT_END_DAYS = 4

const documentWith = (fadeInDays: number, fadeOutDays: number): ReturnType<typeof benchDocument> => {
  const document = benchDocument({ progressMarkerVisible: true })
  const faded = document.schedule.tasks.find((one) => one.uid === FADED_UID) as Task
  Object.assign(faded, { start: april(6), finish: april(16), fadeInDays, fadeOutDays })
  return document
}

const handleAt = (one: Stage, grabArea: string): Point => {
  const frame = frameOf(one.loop)
  return pointAnswering(scanGrabAreas(frame.geometry, FADED_UID, frame.taskGroupArea), grabArea)
}

const fadesOf = (one: Stage): { fadeIn: number; fadeOut: number } => {
  const task = taskIn(one.loop, FADED_UID)
  return { fadeIn: task.fadeInDays ?? 0, fadeOut: task.fadeOutDays ?? 0 }
}

function selectedTask(document: ReturnType<typeof benchDocument>): Stage {
  const one = stage(document)
  pressAndRelease(one, handleAt(one, 'GA-9'))
  expect(frameOf(one.loop).geometry.tasks.find((each) => each.taskUid === FADED_UID)?.fadeHandles.length, 'premise: FR-075 gives the selected Task its points').toBeGreaterThan(0)
  return one
}

describe('FD-6 -- the manuscript these cases are driven by', () => {
  it.each([FD_6_SAME_COUNT, FD_6_IV_12_AGREES])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`FD-6 -- ${FD_6_IV_12_AGREES.slice(-40)}`, () => {
  it('pulling the fade-in point (GA-7) as far as it goes lands, and the two fades together still fit the span', () => {
    const one = selectedTask(documentWith(1, KEPT_END_DAYS))
    expect(fadesOf(one), 'premise: the document starts in range').toEqual({ fadeIn: 1, fadeOut: KEPT_END_DAYS })
    const handle = handleAt(one, 'GA-7')
    dragTo(one, handle, handle.x + frameOf(one.loop).pxPerDay * 9)
    const after = fadesOf(one)
    expect(after.fadeIn, `${FD_6_IV_12_AGREES} -- the pull was refused, the fade-in did not move`).toBeGreaterThan(1)
    expect(after.fadeIn + after.fadeOut, 'IV-12: the sum does not exceed the span').toBeLessThanOrEqual(SPAN_DAYS_AT_MOST)
  })

  it('pulling the fade-out point (GA-8) as far as it goes lands, and the two fades together still fit the span', () => {
    const one = selectedTask(documentWith(KEPT_END_DAYS, 1))
    expect(fadesOf(one), 'premise: the document starts in range').toEqual({ fadeIn: KEPT_END_DAYS, fadeOut: 1 })
    const handle = handleAt(one, 'GA-8')
    dragTo(one, handle, handle.x - frameOf(one.loop).pxPerDay * 9)
    const after = fadesOf(one)
    expect(after.fadeOut, `${FD_6_IV_12_AGREES} -- the pull was refused, the fade-out did not move`).toBeGreaterThan(1)
    expect(after.fadeIn + after.fadeOut, 'IV-12: the sum does not exceed the span').toBeLessThanOrEqual(SPAN_DAYS_AT_MOST)
  })

  it('a pull that stays inside what the span leaves lands at the day pulled to (control)', () => {
    const one = selectedTask(documentWith(1, KEPT_END_DAYS))
    const handle = handleAt(one, 'GA-7')
    dragTo(one, handle, handle.x + frameOf(one.loop).pxPerDay * 2)
    expect(fadesOf(one).fadeIn, 'control: two days further than the one it began with').toBe(3)
  })
})
