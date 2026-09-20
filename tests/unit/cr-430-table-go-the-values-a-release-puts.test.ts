// CR-430: table T-245 rows GO-5..GO-10 -- the values a released grab puts, and the ones it leaves standing.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  dayOf,
  isWorkingDay,
  workingCalendarOf,
  type CalendarDay,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { specTable, unbroken } from '../contract/spec-table'
import { pointAnswering, scanGrabAreas, type GrabScan } from './cr-430-bench'
import {
  FRESH_ARROW_UID,
  FRESH_MILESTONE_UID,
  FRESH_UID,
  BAR_UID,
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

const FR_103_STATEMENT =
  '`FR-104` の 表 T-266 の掴み代を掴んで離したとき、`GRS` は、**表 T-245 に従って**値を置き、同表が据え置くとする値を変えないこと。'
const T_245_NO_WORKING_DAY_SNAP =
  '⛔ **掴んだ端点を置いた日を、稼働日へ寄せてはならない（MUST NOT）** —— **休日に働くことがあり、寄せると人が置いた日と違う日が入る。**'
const T_245_NO_NEW_REFUSALS = '⛔ 本要求は新しい拒み方を立てない。'
const FR_043_IS_ABOUT_DRAWING =
  '⚠️ `FR-043` がダミーを予定の開始日に「立てる」と定めているのは描く位置の話であり、落とす先の話ではない。'

const T_245 = specTable('T-245')
const WHERE = '掴む場所'
const PUTS = '置く値'
const KEEPS = '据え置く値'

const cellOf = (row: string, heading: string): string => {
  const found = T_245.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-245 has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) throw new Error(`table T-245 has no column ${heading}`)
  return cell
}

const S_129 = SETTINGS_DEFAULTS['actualInitialDuration'] as number
const S_130 = SETTINGS_DEFAULTS['milestoneActualDuration'] as number

const CALENDAR = workingCalendarOf(benchDocument().schedule)

const dayValue = (text: string): CalendarDay => {
  const value = dayOf(text)
  if (value === null) throw new Error(`${text} is not a day`)
  return value
}

const nextDay = (text: string): string => {
  const [y, m, d] = text.slice(0, 10).split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

// see FR-011, S-129
const floorDayAfter = (start: string): string => {
  let at = start.slice(0, 10)
  let counted = S_129 - 1
  while (counted > 0) {
    at = nextDay(at)
    if (isWorkingDay(CALENDAR, dayValue(at))) counted -= 1
  }
  return at
}

afterEach(restoreAnimationFrames)

const built = (): Stage => stage(benchDocument())

const scanOf = (one: Stage, uid: number): GrabScan => {
  const frame = frameOf(one.loop)
  return scanGrabAreas(frame.geometry, uid, frame.rowArea)
}

const at = (one: Stage, uid: number, grabArea: string): Point => pointAnswering(scanOf(one, uid), grabArea)

const lastActualDayOf = (one: Stage, uid: number): string | null => {
  const task: Task = taskIn(one.loop, uid)
  return dayPart(task.actualFinish ?? task.stop)
}

describe('CR-430 -- the manuscript these cases are driven by', () => {
  it.each([FR_103_STATEMENT, T_245_NO_WORKING_DAY_SNAP, T_245_NO_NEW_REFUSALS, FR_043_IS_ABOUT_DRAWING])(
    'still says it, word for word: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it('table T-245 now holds GO-5 to GO-11, and each names the grab areas of table T-266', () => {
    expect(T_245.rows.map((one) => one.id)).toEqual([
      'GO-1', 'GO-2', 'GO-3', 'GO-4', 'GO-5', 'GO-6', 'GO-7', 'GO-8', 'GO-9', 'GO-10', 'GO-11',
    ])
    expect(cellOf('GO-5', WHERE)).toContain('`GA-3`')
    expect(cellOf('GO-6', WHERE)).toContain('`GA-5`')
    expect(cellOf('GO-7', WHERE)).toContain('`GA-6`')
    expect(cellOf('GO-8', WHERE)).toContain('`GA-17`')
    expect(cellOf('GO-9', WHERE)).toContain('`PE-8`')
    expect(cellOf('GO-10', WHERE)).toContain('`PE-13`')
    expect(cellOf('GO-11', WHERE)).toContain('`GA-15`')
  })
})

describe('control -- a quotation this file leans on can go red', () => {
  it('one character off the working-day rule is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(T_245_NO_WORKING_DAY_SNAP.replace('寄せてはならない', ' 寄せてはならない'))
  })
})

describe(`GO-5 -- 実績の開始: ${cellOf('GO-5', PUTS)}`, () => {
  it('GO-5: actualStart is the released day itself', () => {
    const one = built()
    dragTo(one, at(one, BAR_UID, 'GA-3'), xOfDay(one.loop, april(7)))
    expect(dayPart(taskIn(one.loop, BAR_UID).actualStart), cellOf('GO-5', PUTS)).toBe('2026-04-07')
  })

  it(`GO-5: the last day of the actual stands: ${cellOf('GO-5', KEEPS)}`, () => {
    const one = built()
    const before = lastActualDayOf(one, BAR_UID)
    dragTo(one, at(one, BAR_UID, 'GA-3'), xOfDay(one.loop, april(7)))
    expect(lastActualDayOf(one, BAR_UID), cellOf('GO-5', KEEPS)).toBe(before)
  })

  it(`GO-5 on a rest day: ${T_245_NO_WORKING_DAY_SNAP}`, () => {
    const one = built()
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-04')), 'premise: 2026-04-04 is a rest day').toBe(false)
    dragTo(one, at(one, BAR_UID, 'GA-3'), xOfDay(one.loop, april(4)))
    expect(dayPart(taskIn(one.loop, BAR_UID).actualStart), T_245_NO_WORKING_DAY_SNAP).toBe('2026-04-04')
  })
})

describe(`GO-6 -- ダミーの開始: ${cellOf('GO-6', PUTS)}`, () => {
  const STARTS: readonly { readonly what: string; readonly uid: number; readonly grab: string }[] = [
    { what: 'GA-5', uid: FRESH_UID, grab: 'GA-5' },
    { what: 'GA-21', uid: FRESH_ARROW_UID, grab: 'GA-21' },
  ]

  it.each(STARTS)('GO-6 through $what: actualStart is the released day and the last day is the FR-011 floor', ({ what, uid, grab }) => {
    const one = built()
    dragTo(one, at(one, uid, grab), xOfDay(one.loop, april(15)))
    const task = taskIn(one.loop, uid)
    expect(dayPart(task.actualStart), `${what}: ${cellOf('GO-6', PUTS)}`).toBe('2026-04-15')
    expect(lastActualDayOf(one, uid), `${what}: ${cellOf('GO-6', PUTS)}`).toBe(floorDayAfter('2026-04-15'))
    expect(task.resumeValid, `${what}: ${cellOf('GO-6', PUTS)}`).toBe(true)
  })

  it('GO-6 leaves no end undecided', () => {
    const one = built()
    dragTo(one, at(one, FRESH_UID, 'GA-5'), xOfDay(one.loop, april(15)))
    const task = taskIn(one.loop, FRESH_UID)
    expect([task.actualStart === null, lastActualDayOf(one, FRESH_UID) === null], cellOf('GO-6', PUTS)).toEqual([
      false,
      false,
    ])
  })
})

describe(`GO-7 -- ダミーの終了: ${cellOf('GO-7', PUTS)}`, () => {
  const ENDS: readonly { readonly what: string; readonly uid: number; readonly grab: string }[] = [
    { what: 'GA-6', uid: FRESH_UID, grab: 'GA-6' },
    { what: 'GA-22', uid: FRESH_ARROW_UID, grab: 'GA-22' },
  ]

  it.each(ENDS)('GO-7 through $what: the last day is the released day and actualStart is the plan start', ({ what, uid, grab }) => {
    const one = built()
    const planStart = dayPart(taskIn(one.loop, uid).start)
    dragTo(one, at(one, uid, grab), xOfDay(one.loop, april(16)))
    const task = taskIn(one.loop, uid)
    expect(lastActualDayOf(one, uid), `${what}: ${cellOf('GO-7', PUTS)}`).toBe('2026-04-16')
    expect(dayPart(task.actualStart), `${what}: ${cellOf('GO-7', PUTS)}`).toBe(planStart)
    expect(task.resumeValid, `${what}: ${cellOf('GO-7', PUTS)}`).toBe(true)
  })

  it(`GO-7 on a rest day: ${T_245_NO_WORKING_DAY_SNAP}`, () => {
    const one = built()
    expect(isWorkingDay(CALENDAR, dayValue('2026-04-11')), 'premise: 2026-04-11 is a rest day').toBe(false)
    dragTo(one, at(one, FRESH_UID, 'GA-6'), xOfDay(one.loop, april(11)))
    expect(lastActualDayOf(one, FRESH_UID), T_245_NO_WORKING_DAY_SNAP).toBe('2026-04-11')
  })
})

describe(`GO-8 -- マイルストーンのダミー: ${cellOf('GO-8', PUTS)}`, () => {
  it('GO-8: both ends land on the released day', () => {
    const one = built()
    dragTo(one, at(one, FRESH_MILESTONE_UID, 'GA-17'), xOfDay(one.loop, april(16)))
    const task = taskIn(one.loop, FRESH_MILESTONE_UID)
    expect(dayPart(task.actualStart), cellOf('GO-8', PUTS)).toBe('2026-04-16')
    expect(lastActualDayOf(one, FRESH_MILESTONE_UID), cellOf('GO-8', PUTS)).toBe('2026-04-16')
    expect(task.resumeValid, cellOf('GO-8', PUTS)).toBe(true)
  })

  it('GO-8: S-130 keeps the milestone actual a point', () => {
    expect(S_130, 'premise: a milestone actual has no length').toBe(0)
    const one = built()
    dragTo(one, at(one, FRESH_MILESTONE_UID, 'GA-17'), xOfDay(one.loop, april(16)))
    expect(dayPart(taskIn(one.loop, FRESH_MILESTONE_UID).actualStart), cellOf('GO-8', PUTS)).toBe(
      lastActualDayOf(one, FRESH_MILESTONE_UID),
    )
  })
})

describe(`GO-9 -- 進捗マーカーを引く: ${cellOf('GO-9', PUTS)}`, () => {
  it('GO-9 through PE-8: the last day is the released day', () => {
    const one = built()
    const before = dayPart(taskIn(one.loop, BAR_UID).actualStart)
    dragTo(one, at(one, BAR_UID, 'GA-18'), xOfDay(one.loop, april(18)))
    expect(lastActualDayOf(one, BAR_UID), cellOf('GO-9', PUTS)).toBe('2026-04-18')
    expect(dayPart(taskIn(one.loop, BAR_UID).actualStart), cellOf('GO-9', KEEPS)).toBe(before)
  })

  it('GO-9 through PE-9: actualStart is the plan start and the last day is the released day', () => {
    const one = built()
    const planStart = dayPart(taskIn(one.loop, FRESH_UID).start)
    dragTo(one, at(one, FRESH_UID, 'GA-18'), xOfDay(one.loop, april(17)))
    expect(dayPart(taskIn(one.loop, FRESH_UID).actualStart), cellOf('GO-9', PUTS)).toBe(planStart)
    expect(lastActualDayOf(one, FRESH_UID), cellOf('GO-9', PUTS)).toBe('2026-04-17')
  })

  it('GO-9: released left of the plan start, one day of actual stands on the plan start', () => {
    const one = built()
    const planStart = dayPart(taskIn(one.loop, FRESH_UID).start)
    dragTo(one, at(one, FRESH_UID, 'GA-18'), xOfDay(one.loop, april(3)))
    expect(dayPart(taskIn(one.loop, FRESH_UID).actualStart), cellOf('GO-9', PUTS)).toBe(planStart)
    expect(lastActualDayOf(one, FRESH_UID), cellOf('GO-9', PUTS)).toBe(floorDayAfter(planStart ?? ''))
  })
})

describe(`GO-10 -- 再開アイコンを引く: ${cellOf('GO-10', PUTS)}`, () => {
  it('GO-10: resume is the released day and resumeValid is true', () => {
    const one = built()
    dragTo(one, at(one, PAUSED_UID, 'GA-20'), xOfDay(one.loop, april(22)))
    const task = taskIn(one.loop, PAUSED_UID)
    expect(dayPart(task.resume), cellOf('GO-10', PUTS)).toBe('2026-04-22')
    expect(task.resumeValid, cellOf('GO-10', PUTS)).toBe(true)
  })

  it('GO-10: released before the day after the stop, it is pushed back, not refused', () => {
    const one = built()
    const stopDay = dayPart(taskIn(one.loop, PAUSED_UID).stop)
    dragTo(one, at(one, PAUSED_UID, 'GA-20'), xOfDay(one.loop, april(8)))
    const task = taskIn(one.loop, PAUSED_UID)
    expect(dayPart(task.resume), cellOf('GO-10', PUTS)).toBe(nextDay(stopDay ?? ''))
    expect(task.resumeValid, `${cellOf('GO-10', PUTS)} / ${T_245_NO_NEW_REFUSALS}`).toBe(true)
  })

  it(`GO-10: the actual dates stand: ${cellOf('GO-10', KEEPS)}`, () => {
    const one = built()
    const before = [dayPart(taskIn(one.loop, PAUSED_UID).actualStart), lastActualDayOf(one, PAUSED_UID)]
    dragTo(one, at(one, PAUSED_UID, 'GA-20'), xOfDay(one.loop, april(22)))
    expect(
      [dayPart(taskIn(one.loop, PAUSED_UID).actualStart), lastActualDayOf(one, PAUSED_UID)],
      cellOf('GO-10', KEEPS),
    ).toEqual(before)
  })
})
