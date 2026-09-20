// CR-430: table T-021a (PV-1..PV-5) -- the ring a marker press walks, and the actual the screen remembers.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { specTable, unbroken } from '../contract/spec-table'
import { pointAnswering, scanGrabAreas } from './cr-430-bench'
import {
  BAR_UID,
  FRESH_MILESTONE_UID,
  FRESH_UID,
  april,
  benchDocument,
  dayPart,
  frameOf,
  pressAndRelease,
  restoreAnimationFrames,
  stage,
  taskIn,
  type Stage,
} from './cr-430-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const T_270_RING = '⭐ 押下の巡り —— 未着手 → 進行中 → 完了 → 中断 → 未着手 の輪とすること（MUST）。'
const T_270_RESTORE =
  '⭐ 未着手 → 進行中 では、覚えている実績があれば戻し、無ければ予定の開始に 1 日の実績を置くこと（MUST）。'
const T_270_REMEMBER =
  '⭐ 中断 → 未着手 では実績を外し、開いているあいだ覚えること（MUST） —— 覚えた実績は文書に保存せず、`ScreenState` が持つ（`05-07-design.md` の `CP-36` / `PI-36`）。'
const T_270_MILESTONE_RING =
  '⭐ マイルストーンは 未着手 ⇄ 完了 の 2 つを巡ること（MUST） —— 完了 → 未着手 で実績の日を覚えて外し、未着手 → 完了 で覚えている実績を戻す。'
const T_270_TWO_PRESSES =
  '⚠️ 代償: 1 日の作業の完了は 2 押し（未着手 → 進行中 → 完了）であり、中断からの再開も未着手を通る 2 押しである。'
const CP_36_NOT_SAVED = '⛔ 文書に保存しない'

const T_021A = specTable('T-021a')
const BEFORE = '押す前の状態'
const AFTER = '押した後の状態'
const PUTS = '置く値'

const cellOf = (row: string, heading: string): string => {
  const found = T_021A.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-021a has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) throw new Error(`table T-021a has no column ${heading}`)
  return cell
}

const S_129 = SETTINGS_DEFAULTS['actualInitialDuration'] as number
const S_130 = SETTINGS_DEFAULTS['milestoneActualDuration'] as number

afterEach(restoreAnimationFrames)

interface Cycled {
  readonly task: Record<string, unknown>
  readonly remembered: unknown
}

const CYCLE_HOMES = [
  '../../src/use-case/edit-document/edit-task',
  '../../src/entity/document-model/schedule/schedule',
] as const

const cycleSeam = async (): Promise<(task: unknown, remembered: unknown) => Cycled> => {
  const editTask = (await import('../../src/use-case/edit-document/edit-task')) as unknown as Record<string, unknown>
  const schedule = (await import('../../src/entity/document-model/schedule/schedule')) as unknown as Record<
    string,
    unknown
  >
  for (const held of [editTask, schedule]) {
    const found = held['cycleTaskPlanActualState']
    if (typeof found === 'function') return found as (task: unknown, remembered: unknown) => Cycled
  }
  throw new Error(`seam S8: neither ${CYCLE_HOMES.join(' nor ')} exports cycleTaskPlanActualState(task, remembered)`)
}

const screenStateSeam = async (): Promise<Record<string, unknown>> =>
  (await import('../../src/entity/document-model/screen-state/screen-state')) as unknown as Record<string, unknown>

const rememberSeam = async (): Promise<(state: unknown, taskUid: number, actual: unknown) => unknown> => {
  const loaded = await screenStateSeam()
  const found = loaded['screenStateWithRememberedActual']
  if (typeof found !== 'function') {
    throw new Error('seam S8: screen-state.ts exports no screenStateWithRememberedActual(state, taskUid, actual)')
  }
  return found as (state: unknown, taskUid: number, actual: unknown) => unknown
}

const emptyState = async (): Promise<Record<string, unknown>> => {
  const loaded = await screenStateSeam()
  const found = loaded['emptyScreenState']
  if (typeof found !== 'function') throw new Error('screen-state.ts exports no emptyScreenState')
  return (found as () => Record<string, unknown>)()
}

const taskOf = (over: Record<string, unknown>): Record<string, unknown> => ({
  uid: 1,
  wbsParentUid: null,
  wbsOrder: 1,
  name: 'A',
  start: april(6),
  finish: april(24),
  milestone: false,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: 0,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
  ...over,
})

// see T-019
const NOT_STARTED = (): Record<string, unknown> => taskOf({})
const IN_PROGRESS = (): Record<string, unknown> =>
  taskOf({ actualStart: april(8), stop: april(10), resumeValid: true })
const DONE = (): Record<string, unknown> =>
  taskOf({ actualStart: april(8), actualFinish: april(10), resumeValid: false })
const PAUSED = (): Record<string, unknown> =>
  taskOf({ actualStart: april(8), stop: april(10), resume: null, resumeValid: false })
const MILESTONE_NOT_STARTED = (): Record<string, unknown> =>
  taskOf({ start: april(13), finish: april(13), milestone: true })
const MILESTONE_DONE = (): Record<string, unknown> =>
  taskOf({ start: april(13), finish: april(13), milestone: true, actualStart: april(17), actualFinish: april(17), resumeValid: false })

const day = (value: unknown): string | null => dayPart(value as string | null)

const lastOf = (task: Record<string, unknown>): string | null =>
  day(task['actualFinish'] ?? task['stop'])

describe('CR-430 -- the manuscript these cases are driven by', () => {
  it.each([T_270_RING, T_270_RESTORE, T_270_REMEMBER, T_270_MILESTONE_RING, T_270_TWO_PRESSES])(
    'still says it, word for word: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it(`CP-36 keeps the remembered actual off the document: ${CP_36_NOT_SAVED}`, () => {
    expect(DESIGN).toContain(CP_36_NOT_SAVED)
  })

  it('table T-021a holds PV-1 to PV-5, and the ring it walks', () => {
    expect(T_021A.rows.map((one) => one.id)).toEqual(['PV-1', 'PV-2', 'PV-3', 'PV-4', 'PV-5'])
    expect([cellOf('PV-1', BEFORE), cellOf('PV-1', AFTER)]).toEqual(['未着手', '**進行中**'])
    expect([cellOf('PV-2', BEFORE), cellOf('PV-2', AFTER)]).toEqual(['進行中', '完了'])
    expect([cellOf('PV-3', BEFORE), cellOf('PV-3', AFTER)]).toEqual(['完了', '中断'])
    expect([cellOf('PV-4', BEFORE), cellOf('PV-4', AFTER)]).toEqual(['中断', '**未着手**'])
    expect(cellOf('PV-5', BEFORE)).toContain('マイルストーンの 未着手 ⇄ 完了')
  })
})

describe('control -- a quotation this file leans on can go red', () => {
  it('one character off the ring is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(T_270_RING.replace('未着手 → 進行中', '未着手 → 中断'))
  })
})

describe('PV-1 -- 未着手 → 進行中', () => {
  it('PV-1: with nothing remembered, one day of actual stands on the plan start', async () => {
    const cycle = await cycleSeam()
    const after = cycle(NOT_STARTED(), null)
    expect(day(after.task['actualStart']), cellOf('PV-1', PUTS)).toBe(day(NOT_STARTED()['start']))
    expect(lastOf(after.task), cellOf('PV-1', PUTS)).toBe(day(NOT_STARTED()['start']))
    expect(after.task['resumeValid'], cellOf('PV-1', PUTS)).toBe(true)
  })

  it('PV-1: the plan duration is not put', async () => {
    expect(S_129, 'premise: the actual a grab puts is S-129 working days long').toBe(1)
    const cycle = await cycleSeam()
    const after = cycle(NOT_STARTED(), null)
    expect(lastOf(after.task), cellOf('PV-1', PUTS)).not.toBe(day(NOT_STARTED()['finish']))
  })

  it(`PV-1: a remembered actual comes back: ${T_270_RESTORE}`, async () => {
    const cycle = await cycleSeam()
    const removed = cycle(PAUSED(), null)
    const back = cycle(removed.task, removed.remembered)
    expect(day(back.task['actualStart']), T_270_RESTORE).toBe(day(PAUSED()['actualStart']))
    expect(lastOf(back.task), T_270_RESTORE).toBe(lastOf(PAUSED()))
  })
})

describe('PV-2 -- 進行中 → 完了', () => {
  it('PV-2: actualFinish takes the stop, and the stop is emptied in the same replacement', async () => {
    const cycle = await cycleSeam()
    const after = cycle(IN_PROGRESS(), null)
    expect(day(after.task['actualFinish']), cellOf('PV-2', PUTS)).toBe(day(IN_PROGRESS()['stop']))
    expect(after.task['stop'], cellOf('PV-2', PUTS)).toBeNull()
    expect(after.task['resumeValid'], cellOf('PV-2', PUTS)).toBe(false)
  })

  it('PV-2: neither end moves', async () => {
    const cycle = await cycleSeam()
    const after = cycle(IN_PROGRESS(), null)
    expect([day(after.task['actualStart']), lastOf(after.task)], cellOf('PV-2', PUTS)).toEqual([
      day(IN_PROGRESS()['actualStart']),
      lastOf(IN_PROGRESS()),
    ])
  })
})

describe('PV-3 -- 完了 → 中断', () => {
  it('PV-3: the stop takes the old actualFinish, and resume is emptied', async () => {
    const cycle = await cycleSeam()
    const after = cycle(DONE(), null)
    expect(day(after.task['stop']), cellOf('PV-3', PUTS)).toBe(day(DONE()['actualFinish']))
    expect(after.task['actualFinish'], cellOf('PV-3', PUTS)).toBeNull()
    expect(after.task['resume'], cellOf('PV-3', PUTS)).toBeNull()
    expect(after.task['resumeValid'], cellOf('PV-3', PUTS)).toBe(false)
  })

  it('PV-3: the last day of the actual survives the move', async () => {
    const cycle = await cycleSeam()
    const after = cycle(DONE(), null)
    expect(lastOf(after.task), cellOf('PV-3', PUTS)).toBe(lastOf(DONE()))
  })
})

describe('PV-4 -- 中断 → 未着手', () => {
  it('PV-4: the actual and the resume day are emptied', async () => {
    const cycle = await cycleSeam()
    const after = cycle(PAUSED(), null)
    expect(
      [after.task['actualStart'], after.task['actualFinish'], after.task['stop'], after.task['resume']],
      cellOf('PV-4', PUTS),
    ).toEqual([null, null, null, null])
    expect(after.task['resumeValid'], cellOf('PV-4', PUTS)).toBe(false)
  })

  it(`PV-4: what was taken off is remembered: ${T_270_REMEMBER}`, async () => {
    const cycle = await cycleSeam()
    const after = cycle(PAUSED(), null)
    expect(after.remembered, T_270_REMEMBER).not.toBeNull()
    expect(JSON.stringify(after.remembered), T_270_REMEMBER).toContain(String(day(PAUSED()['actualStart'])))
  })
})

describe('PV-5 -- マイルストーンの 未着手 ⇄ 完了', () => {
  it('PV-5: 未着手 → 完了 puts both ends on the plan day', async () => {
    expect(S_130, 'premise: a milestone actual has no length').toBe(0)
    const cycle = await cycleSeam()
    const after = cycle(MILESTONE_NOT_STARTED(), null)
    expect(day(after.task['actualStart']), cellOf('PV-5', PUTS)).toBe(day(MILESTONE_NOT_STARTED()['start']))
    expect(lastOf(after.task), cellOf('PV-5', PUTS)).toBe(day(MILESTONE_NOT_STARTED()['start']))
  })

  it(`PV-5: 完了 → 未着手 remembers the day and takes it off: ${T_270_MILESTONE_RING}`, async () => {
    const cycle = await cycleSeam()
    const after = cycle(MILESTONE_DONE(), null)
    expect([after.task['actualStart'], after.task['actualFinish'], after.task['stop']], cellOf('PV-5', PUTS)).toEqual([
      null,
      null,
      null,
    ])
    expect(after.remembered, T_270_MILESTONE_RING).not.toBeNull()
  })

  it(`PV-5: an imported actual that differs from start comes back exactly, not the plan day: ${cellOf('PV-5', PUTS)}`, async () => {
    // WHY: an imported milestone can carry an actual day the plan start never had; PV-1 and PV-4
    // WHY: already prove the bar-Task ring restores a remembered actual, but every PV-5 case above
    // WHY: only ever cycles a milestone whose remembered actual equals its plan start, so the
    // WHY: restore branch (done -> not-started -> done) is never told apart from re-reading start.
    expect(
      day(MILESTONE_DONE()['actualStart']),
      'premise: the imported milestone actual differs from the plan start',
    ).not.toBe(day(MILESTONE_DONE()['start']))
    const cycle = await cycleSeam()
    const removed = cycle(MILESTONE_DONE(), null)
    const back = cycle(removed.task, removed.remembered)
    expect(day(back.task['actualStart']), cellOf('PV-5', PUTS)).toBe(day(MILESTONE_DONE()['actualStart']))
    expect(lastOf(back.task), cellOf('PV-5', PUTS)).toBe(lastOf(MILESTONE_DONE()))
    expect(
      day(back.task['actualStart']),
      `${cellOf('PV-5', PUTS)} -- not the plan start`,
    ).not.toBe(day(MILESTONE_DONE()['start']))
  })

  it(`PV-5: a milestone never stands in 進行中 or 中断: ${T_270_MILESTONE_RING}`, async () => {
    const cycle = await cycleSeam()
    const first = cycle(MILESTONE_NOT_STARTED(), null)
    const second = cycle(first.task, first.remembered)
    expect([second.task['actualStart'], second.task['stop']], T_270_MILESTONE_RING).toEqual([null, null])
  })
})

describe(`the ring of table T-270: ${T_270_RING}`, () => {
  it('four presses on a bar Task come back to 未着手', async () => {
    const cycle = await cycleSeam()
    let held: Cycled = { task: NOT_STARTED(), remembered: null }
    const seen: string[] = []
    for (let turn = 0; turn < 4; turn += 1) {
      held = cycle(held.task, held.remembered)
      seen.push(`${String(day(held.task['actualStart']))}/${String(lastOf(held.task))}/${String(held.task['resumeValid'])}`)
    }
    expect([held.task['actualStart'], held.task['actualFinish'], held.task['stop']], `${T_270_RING} (${seen.join(' ')})`).toEqual([
      null,
      null,
      null,
    ])
  })

  it(`two presses take a one-day job to 完了: ${T_270_TWO_PRESSES}`, async () => {
    const cycle = await cycleSeam()
    const first = cycle(NOT_STARTED(), null)
    const second = cycle(first.task, first.remembered)
    expect(second.task['actualFinish'], T_270_TWO_PRESSES).not.toBeNull()
    expect(second.task['stop'], T_270_TWO_PRESSES).toBeNull()
  })
})

describe('ScreenState -- where the remembered actual is kept', () => {
  it('an empty ScreenState remembers nothing', async () => {
    const state = await emptyState()
    const held = state['rememberedActuals']
    expect(held, 'seam S8: ScreenState has no rememberedActuals').toBeDefined()
    expect(JSON.stringify(held), 'seam S8: an empty ScreenState remembers no actual').not.toContain('actualStart')
  })

  it(`the writer puts one in and takes it out again: ${T_270_REMEMBER}`, async () => {
    const withRemembered = await rememberSeam()
    const state = await emptyState()
    const actual = { actualStart: april(8), stop: april(10), actualFinish: null, resume: null }
    const put = withRemembered(state, BAR_UID, actual) as Record<string, unknown>
    expect(JSON.stringify(put['rememberedActuals']), T_270_REMEMBER).toContain(String(day(april(8))))
    const cleared = withRemembered(put, BAR_UID, null) as Record<string, unknown>
    expect(JSON.stringify(cleared['rememberedActuals']), T_270_REMEMBER).not.toContain(String(day(april(8))))
  })

  it(`what is remembered never reaches the document: ${CP_36_NOT_SAVED}`, () => {
    const one = stage(benchDocument())
    const marker = (built: Stage, uid: number): Point => {
      const frame = frameOf(built.loop)
      return pointAnswering(scanGrabAreas(frame.geometry, uid, frame.rowArea), 'GA-18')
    }
    const started: Task = taskIn(one.loop, BAR_UID)
    // WHY: the bench opens on a running Task (an actual, no actualFinish), so the not-started rung
    // WHY: is three presses along the ring of table T-021a, not four.
    expect([started.actualStart !== null, started.actualFinish], 'premise: the bench opens 進行中').toEqual([
      true,
      null,
    ])
    for (let turn = 0; turn < 3; turn += 1) pressAndRelease(one, marker(one, BAR_UID))
    const task: Task = taskIn(one.loop, BAR_UID)
    expect([task.actualStart, task.actualFinish, task.stop], `${T_270_RING} / ${CP_36_NOT_SAVED}`).toEqual([
      null,
      null,
      null,
    ])
    expect(JSON.stringify(one.loop.document()), CP_36_NOT_SAVED).not.toContain('remembered')
    pressAndRelease(one, marker(one, BAR_UID))
    const back: Task = taskIn(one.loop, BAR_UID)
    expect([back.actualStart, back.stop], T_270_RING).toEqual([started.actualStart, started.stop])
  })
})

describe('the ring through the product', () => {
  it('PV-1 through the product: a press on an unstarted Task marker starts it', () => {
    const one = stage(benchDocument())
    const frame = frameOf(one.loop)
    pressAndRelease(one, pointAnswering(scanGrabAreas(frame.geometry, FRESH_UID, frame.rowArea), 'GA-18'))
    const task: Task = taskIn(one.loop, FRESH_UID)
    expect(dayPart(task.actualStart), cellOf('PV-1', PUTS)).toBe(dayPart(task.start))
  })

  it(`two presses on a milestone marker come back to 未着手: ${T_270_MILESTONE_RING}`, () => {
    const one = stage(benchDocument())
    const marker = (): Point => {
      const frame = frameOf(one.loop)
      return pointAnswering(scanGrabAreas(frame.geometry, FRESH_MILESTONE_UID, frame.rowArea), 'GA-18')
    }
    pressAndRelease(one, marker())
    expect(dayPart(taskIn(one.loop, FRESH_MILESTONE_UID).actualStart), T_270_MILESTONE_RING).not.toBeNull()
    pressAndRelease(one, marker())
    expect(taskIn(one.loop, FRESH_MILESTONE_UID).actualStart, T_270_MILESTONE_RING).toBeNull()
  })
})
