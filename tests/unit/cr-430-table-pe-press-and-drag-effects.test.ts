// CR-430: table T-270 (PE-0..PE-13) -- what a press and a drag do, and what FR-107 keeps still.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { InputModifiers } from '../../src/adapter/input-command-translator/input-command-translator'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { specTable } from '../contract/spec-table'
import { unbroken } from '../contract/spec-table'
import { pointAnswering, scanGrabAreas, type GrabScan } from './cr-430-bench'
import {
  ARROW_UID,
  BAR_UID,
  DONE_UID,
  FADED_UID,
  FRESH_ARROW_UID,
  FRESH_MILESTONE_UID,
  FRESH_UID,
  MILESTONE_UID,
  PAUSED_UID,
  WIDE_UID,
  april,
  benchDocument,
  dayPart,
  dragTo,
  drawnTask,
  frameOf,
  pointer,
  pressAndRelease,
  restoreAnimationFrames,
  stage,
  taskIn,
  xOfDay,
  type Stage,
} from './cr-430-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_107_ONLY_THESE =
  '`GRS` は、日程表の上の直接操作では、実績の日付を、利用者が実績（ダミーを含む）を掴んで意図して動かしたとき、または進捗マーカーを押す・引くとき（表 T-270 の `PE-8` 〜 `PE-10` と同表の「押下の巡り」の段）にだけ変えること（MUST）。'
const FR_107_NOT_ON_THE_SIDE = 'ほかの操作のついでに変えてはならない（MUST NOT）。'
const T_270_EVERY_ROAD = '⭐ 実績を直接動かす経路の全数は本表が持つ（MUST）。'
const T_270_NO_OTHER_ROAD = '⛔ 本表に無い直接操作で実績の日付を変えてはならない（MUST NOT）。'
const T_270_PAUSED_MARKER =
  '⚠️ 中断のあいだ、進捗マーカーを引いても何もしない（`PE-10`） —— 停止日を動かすのは実績の終了の端（`PE-3`）である。'
const T_270_SELECTS =
  '⭐ タスクに属する行（`PE-1` 〜 `PE-11`）は、押して離せばそのタスクを選ぶこと（MUST）'
const FR_105_NO_TEXT_SELECTION =
  '`Schedule Canvas`（`Time Ruler` の帯を含む）の上の押下と引く操作で、字の選択を始めてはならない（MUST NOT）。'
const FR_105_MODIFIED_TOO =
  '修飾キーを付けた割当の無い引く操作も同じである —— 表 T-023 の `MK-12` の「ブラウザの既定動作に委ねる」に、この 1 つの例外を置く。'
const T_270_PE_0_EVERYWHERE = '⚠️ `Schedule Canvas` の上で字の選択を始めない規則は、押下でも引く操作でも同じである —— 表 T-270 の `PE-0` が全数を持つ。'
const FR_105_RIGHT_BUTTON_LEFT_ALONE =
  '⛔ 右ボタンの押下は止めてはならない（MUST NOT） —— 右ボタンは字の選択を始めないので本要求の対象ではなく、' +
  '表 T-023 は右ボタンに行を与えていないから、既定の文脈メニューは閲覧環境のものである。'

const T_270 = specTable('T-270')
const GRABBED = '掴んだもの'
const ON_RELEASE = '押して離す（動かさない）'
const SIDEWAYS = '横に引く'
const DOWNWARDS = '縦に引く（行を移る）'

const cellOf = (row: string, heading: string): string => {
  const found = T_270.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-270 has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) throw new Error(`table T-270 has no column ${heading}`)
  return cell
}

afterEach(restoreAnimationFrames)

const built = (): Stage => stage(benchDocument())

const scanOf = (one: Stage, uid: number): GrabScan => {
  const frame = frameOf(one.loop)
  return scanGrabAreas(frame.geometry, uid, frame.rowArea)
}

const at = (one: Stage, uid: number, grabArea: string): Point => pointAnswering(scanOf(one, uid), grabArea)

const datesOf = (one: Stage, uid: number): Readonly<Record<string, string | null>> => {
  const task: Task = taskIn(one.loop, uid)
  return {
    start: dayPart(task.start),
    finish: dayPart(task.finish),
    actualStart: dayPart(task.actualStart),
    stop: dayPart(task.stop),
    actualFinish: dayPart(task.actualFinish),
    resume: dayPart(task.resume),
  }
}

const lastActualDayOf = (one: Stage, uid: number): string | null => {
  const task: Task = taskIn(one.loop, uid)
  return dayPart(task.actualFinish ?? task.stop)
}

const rowIdOf = (one: Stage, uid: number): string | null => {
  const found = one.loop.document().schedule.taskGroupMembers.find((member) => member.taskUid === uid)
  return found === undefined ? null : found.groupId
}

describe('CR-430 -- the manuscript these cases are driven by', () => {
  it.each([
    FR_107_ONLY_THESE,
    FR_107_NOT_ON_THE_SIDE,
    T_270_EVERY_ROAD,
    T_270_NO_OTHER_ROAD,
    T_270_PAUSED_MARKER,
    T_270_SELECTS,
    FR_105_NO_TEXT_SELECTION,
    FR_105_MODIFIED_TOO,
    T_270_PE_0_EVERYWHERE,
    FR_105_RIGHT_BUTTON_LEFT_ALONE,
  ])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-270 holds PE-0 to PE-13 and nothing else', () => {
    expect(T_270.rows.map((one) => one.id)).toEqual([
      'PE-0',
      'PE-1',
      'PE-2',
      'PE-3',
      'PE-4',
      'PE-5',
      'PE-6',
      'PE-7',
      'PE-8',
      'PE-9',
      'PE-10',
      'PE-11',
      'PE-12',
      'PE-13',
    ])
  })
})

describe('control -- a quotation this file leans on can go red', () => {
  it('one character off the FR-107 statement is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(FR_107_ONLY_THESE.replace('だけ変えること', 'だけ変えぬこと'))
  })
})

describe('PE-0 -- 日程表のどこでも, a press and a drag start no text selection', () => {
  const MODIFIER_TURNS: readonly InputModifiers[] = [
    { ctrl: false, shift: false, alt: false, meta: false },
    { ctrl: true, shift: false, alt: false, meta: false },
    { ctrl: false, shift: true, alt: false, meta: false },
    { ctrl: false, shift: false, alt: true, meta: false },
    { ctrl: true, shift: true, alt: false, meta: false },
    { ctrl: true, shift: false, alt: true, meta: false },
    { ctrl: false, shift: true, alt: true, meta: false },
    { ctrl: true, shift: true, alt: true, meta: false },
  ]

  const places = (one: Stage): readonly { readonly what: string; readonly at: Point }[] => {
    const frame = frameOf(one.loop)
    const mid = (box: { x0: number; x1: number; y0: number; y1: number }): Point => ({
      x: (box.x0 + box.x1) / 2,
      y: (box.y0 + box.y1) / 2,
    })
    return [
      { what: 'Row Area', at: mid(frame.rowArea) },
      { what: 'Time Ruler', at: mid(frame.ruler) },
    ]
  }

  it.each(MODIFIER_TURNS)(`PE-0: a press is stopped with %j: ${FR_105_NO_TEXT_SELECTION}`, (modifiers) => {
    const one = built()
    for (const place of places(one)) {
      const press = pointer('down', place.at.x, place.at.y, modifiers)
      expect(one.loop.isBrowserDefaultStopped(press), `${place.what}: ${FR_105_NO_TEXT_SELECTION}`).toBe(true)
    }
  })

  it.each(MODIFIER_TURNS)(`PE-0: a drag is stopped with %j: ${FR_105_MODIFIED_TOO}`, (modifiers) => {
    const one = built()
    for (const place of places(one)) {
      const press = pointer('down', place.at.x, place.at.y, modifiers)
      one.loop.isBrowserDefaultStopped(press)
      one.send(press)
      const move = pointer('move', place.at.x + 40, place.at.y, modifiers)
      expect(one.loop.isBrowserDefaultStopped(move), `${place.what}: ${FR_105_MODIFIED_TOO}`).toBe(true)
      one.send(pointer('up', place.at.x + 40, place.at.y, modifiers))
    }
  })

  it(`PE-0: table T-270 names the whole canvas, word for word: ${cellOf('PE-0', GRABBED)}`, () => {
    const grabbed = cellOf('PE-0', GRABBED)
    expect(grabbed).toContain('Schedule Canvas')
    expect(grabbed).toContain('Time Ruler')
    expect(cellOf('PE-0', ON_RELEASE), grabbed).toBe('字の選択を始めない')
    expect(cellOf('PE-0', SIDEWAYS), grabbed).toBe('字の選択を始めない')
    expect(cellOf('PE-0', DOWNWARDS), grabbed).toBe('字の選択を始めない')
  })

  it.each(MODIFIER_TURNS)(`PE-0: a right-button press is left alone with %j: ${FR_105_RIGHT_BUTTON_LEFT_ALONE}`, (modifiers) => {
    const one = built()
    for (const place of places(one)) {
      const press = pointer('down', place.at.x, place.at.y, modifiers, 'right')
      expect(
        one.loop.isBrowserDefaultStopped(press),
        `${place.what}: ${FR_105_RIGHT_BUTTON_LEFT_ALONE}`,
      ).toBe(false)
    }
  })
})

describe('PE-1 -- 予定の本体', () => {
  it(`PE-1 sideways: ${cellOf('PE-1', SIDEWAYS)}`, () => {
    const one = built()
    const before = datesOf(one, BAR_UID)
    const from = at(one, BAR_UID, 'GA-9')
    dragTo(one, from, xOfDay(one.loop, april(20)))
    const after = datesOf(one, BAR_UID)
    expect(after['start'], 'the plan moved').not.toBe(before['start'])
    expect(after['actualStart'], cellOf('PE-1', SIDEWAYS)).toBe(before['actualStart'])
    expect(after['stop'], cellOf('PE-1', SIDEWAYS)).toBe(before['stop'])
  })

  it(`PE-1 downwards: ${cellOf('PE-1', DOWNWARDS)}`, () => {
    const one = built()
    const before = datesOf(one, BAR_UID)
    const beforeRow = rowIdOf(one, BAR_UID)
    const from = at(one, BAR_UID, 'GA-9')
    const band = frameOf(one.loop).rowArea
    dragTo(one, from, from.x, from.y + (band.y1 - band.y0) / 8)
    expect(rowIdOf(one, BAR_UID), 'the Task moved to another row').not.toBe(beforeRow)
    expect(datesOf(one, BAR_UID), cellOf('PE-1', DOWNWARDS)).toEqual(before)
  })
})

describe('PE-2 -- 予定の端', () => {
  it(`PE-2 sideways: ${cellOf('PE-2', SIDEWAYS)}`, () => {
    const one = built()
    const before = datesOf(one, BAR_UID)
    dragTo(one, at(one, BAR_UID, 'GA-2'), xOfDay(one.loop, april(20)))
    const after = datesOf(one, BAR_UID)
    expect(after['finish'], cellOf('PE-2', SIDEWAYS)).toBe('2026-04-20')
    expect(after['start'], cellOf('PE-2', SIDEWAYS)).toBe(before['start'])
    expect(after['actualStart'], FR_107_NOT_ON_THE_SIDE).toBe(before['actualStart'])
    expect(after['stop'], FR_107_NOT_ON_THE_SIDE).toBe(before['stop'])
  })
})

describe('PE-3 -- 実績の端', () => {
  it(`PE-3 sideways: ${cellOf('PE-3', SIDEWAYS)}`, () => {
    const one = built()
    const before = datesOf(one, BAR_UID)
    dragTo(one, at(one, BAR_UID, 'GA-4'), xOfDay(one.loop, april(16)))
    const after = datesOf(one, BAR_UID)
    expect(lastActualDayOf(one, BAR_UID), cellOf('PE-3', SIDEWAYS)).toBe('2026-04-16')
    expect(after['actualStart'], cellOf('PE-3', SIDEWAYS)).toBe(before['actualStart'])
    expect(after['start'], FR_107_NOT_ON_THE_SIDE).toBe(before['start'])
    expect(after['finish'], FR_107_NOT_ON_THE_SIDE).toBe(before['finish'])
  })
})

describe('PE-4 -- ダミー（タスク。=== と --->）', () => {
  const DUMMY_SHAPES: readonly { readonly what: string; readonly uid: number; readonly ends: readonly string[] }[] = [
    { what: '===', uid: FRESH_UID, ends: ['GA-6', 'GA-5'] },
    { what: '--->', uid: FRESH_ARROW_UID, ends: ['GA-22', 'GA-21'] },
  ]

  it.each(DUMMY_SHAPES)(`PE-4 sideways on $what: ${cellOf('PE-4', SIDEWAYS)}`, ({ what, uid, ends }) => {
    const one = built()
    expect(datesOf(one, uid)['actualStart'], `${what}: premise: the Task has no actual`).toBeNull()
    const scan = scanOf(one, uid)
    const end = ends.find((row) => scan.points.has(row)) ?? ends[0]!
    dragTo(one, pointAnswering(scan, end), xOfDay(one.loop, april(15)))
    expect(datesOf(one, uid)['actualStart'], `${what}: ${cellOf('PE-4', SIDEWAYS)}`).not.toBeNull()
    expect(lastActualDayOf(one, uid), `${what}: ${cellOf('PE-4', SIDEWAYS)}`).not.toBeNull()
  })
})

describe('PE-5 -- ダミー（◆）', () => {
  it(`PE-5 sideways: ${cellOf('PE-5', SIDEWAYS)}`, () => {
    const one = built()
    expect(datesOf(one, FRESH_MILESTONE_UID)['actualStart'], 'premise: no actual yet').toBeNull()
    dragTo(one, at(one, FRESH_MILESTONE_UID, 'GA-17'), xOfDay(one.loop, april(16)))
    const after = datesOf(one, FRESH_MILESTONE_UID)
    expect(after['actualStart'], cellOf('PE-5', SIDEWAYS)).toBe('2026-04-16')
    expect(lastActualDayOf(one, FRESH_MILESTONE_UID), cellOf('PE-5', SIDEWAYS)).toBe('2026-04-16')
  })
})

describe('PE-6 -- ◆ の予定', () => {
  // WHY: the released day is not asserted: no row says whether a milestone plan
  // WHY: reads the released position or the dragged amount (reported as a gap).
  it(`PE-6 sideways: ${cellOf('PE-6', SIDEWAYS)}`, () => {
    const one = built()
    const before = datesOf(one, MILESTONE_UID)
    dragTo(one, at(one, MILESTONE_UID, 'GA-15'), xOfDay(one.loop, april(10)))
    const after = datesOf(one, MILESTONE_UID)
    expect(after['start'], cellOf('PE-6', SIDEWAYS)).not.toBe(before['start'])
    expect(after['finish'], cellOf('PE-6', SIDEWAYS)).toBe(after['start'])
    expect(after['actualStart'], FR_107_NOT_ON_THE_SIDE).toBe(before['actualStart'])
    expect(after['stop'], FR_107_NOT_ON_THE_SIDE).toBe(before['stop'])
  })

  it(`PE-6 downwards: ${cellOf('PE-6', DOWNWARDS)}`, () => {
    const one = built()
    const before = datesOf(one, MILESTONE_UID)
    const beforeRow = rowIdOf(one, MILESTONE_UID)
    const from = at(one, MILESTONE_UID, 'GA-15')
    const band = frameOf(one.loop).rowArea
    dragTo(one, from, from.x, from.y + (band.y1 - band.y0) / 8)
    expect(rowIdOf(one, MILESTONE_UID), 'the milestone moved to another row').not.toBe(beforeRow)
    expect(datesOf(one, MILESTONE_UID), cellOf('PE-6', DOWNWARDS)).toEqual(before)
  })
})

describe('PE-7 -- ◆ の実績', () => {
  it(`PE-7 sideways: ${cellOf('PE-7', SIDEWAYS)}`, () => {
    const one = built()
    const before = datesOf(one, MILESTONE_UID)
    dragTo(one, at(one, MILESTONE_UID, 'GA-16'), xOfDay(one.loop, april(21)))
    const after = datesOf(one, MILESTONE_UID)
    expect(after['actualStart'], cellOf('PE-7', SIDEWAYS)).toBe('2026-04-21')
    expect(after['start'], FR_107_NOT_ON_THE_SIDE).toBe(before['start'])
    expect(after['finish'], FR_107_NOT_ON_THE_SIDE).toBe(before['finish'])
  })
})

describe('PE-8 -- 進捗マーカー（=== で実績の右に立つ）', () => {
  it(`PE-8 sideways: ${cellOf('PE-8', SIDEWAYS)}`, () => {
    const one = built()
    const drawn = drawnTask(one.loop, BAR_UID)
    expect(drawn.marker, 'premise: a marker is drawn on the bar Task').not.toBeNull()
    const before = datesOf(one, BAR_UID)
    dragTo(one, at(one, BAR_UID, 'GA-18'), xOfDay(one.loop, april(17)))
    expect(lastActualDayOf(one, BAR_UID), cellOf('PE-8', SIDEWAYS)).toBe('2026-04-17')
    expect(datesOf(one, BAR_UID)['actualStart'], cellOf('PE-8', SIDEWAYS)).toBe(before['actualStart'])
  })
})

describe('PE-9 -- 進捗マーカー（=== で未着手のダミーの右に立つ）', () => {
  it(`PE-9 sideways: ${cellOf('PE-9', SIDEWAYS)}`, () => {
    const one = built()
    expect(datesOf(one, FRESH_UID)['actualStart'], 'premise: the Task has not started').toBeNull()
    dragTo(one, at(one, FRESH_UID, 'GA-18'), xOfDay(one.loop, april(15)))
    const after = datesOf(one, FRESH_UID)
    expect(after['actualStart'], cellOf('PE-9', SIDEWAYS)).toBe(dayPart(april(6)))
    expect(lastActualDayOf(one, FRESH_UID), cellOf('PE-9', SIDEWAYS)).toBe('2026-04-15')
  })
})

describe('PE-10 -- 進捗マーカー（それ以外）', () => {
  const ELSEWHERE: readonly { readonly what: string; readonly uid: number }[] = [
    { what: '実績の中', uid: WIDE_UID },
    { what: '--->', uid: ARROW_UID },
    { what: '◆', uid: MILESTONE_UID },
    { what: '中断のあいだ', uid: PAUSED_UID },
  ]

  it.each(ELSEWHERE)(`PE-10 on $what: ${cellOf('PE-10', SIDEWAYS)}`, ({ what, uid }) => {
    const one = built()
    const before = datesOf(one, uid)
    dragTo(one, at(one, uid, 'GA-18'), xOfDay(one.loop, april(22)))
    expect(datesOf(one, uid), `${what}: ${cellOf('PE-10', SIDEWAYS)}`).toEqual(before)
  })

  it(`PE-10 during a pause moves nothing: ${T_270_PAUSED_MARKER}`, () => {
    const one = built()
    const before = datesOf(one, PAUSED_UID)
    const from = at(one, PAUSED_UID, 'GA-18')
    const to = xOfDay(one.loop, april(6))
    // WHY: a day far to the left -- the marker of this Task stands within a pixel of april(11), and
    // WHY: a travel under the threshold is a press, which the ring of table T-021a answers instead.
    expect(Math.abs(from.x - to), 'premise: the drag is longer than a press').toBeGreaterThan(8)
    dragTo(one, from, to)
    expect(datesOf(one, PAUSED_UID), T_270_PAUSED_MARKER).toEqual(before)
  })
})

describe('PE-11 -- フェードの掴み点', () => {
  it(`PE-11 sideways: ${cellOf('PE-11', SIDEWAYS)}`, () => {
    const one = built()
    const body = at(one, FADED_UID, 'GA-9')
    pressAndRelease(one, body)
    const drawn = drawnTask(one.loop, FADED_UID)
    expect(drawn.fadeHandles.length, 'premise: FR-075 gives the selected Task its points').toBeGreaterThan(0)
    const before = taskIn(one.loop, FADED_UID)
    const handle = at(one, FADED_UID, 'GA-7')
    dragTo(one, handle, handle.x + frameOf(one.loop).pxPerDay * 3)
    const after = taskIn(one.loop, FADED_UID)
    expect(
      [after.fadeInDays, after.fadeOutDays],
      cellOf('PE-11', SIDEWAYS),
    ).not.toEqual([before.fadeInDays, before.fadeOutDays])
  })
})

describe('PE-12 -- 依存線', () => {
  it(`PE-12 sideways: ${cellOf('PE-12', SIDEWAYS)}`, () => {
    const one = built()
    const line = frameOf(one.loop).geometry.dependencies[0]
    expect(line, 'premise: the bench draws one dependency').toBeDefined()
    const points = line!.points
    const middle = points[Math.floor(points.length / 2)]!
    const before = JSON.stringify(one.loop.document().schedule.tasks)
    dragTo(one, middle, middle.x + 60)
    expect(JSON.stringify(one.loop.document().schedule.tasks), cellOf('PE-12', SIDEWAYS)).toBe(before)
  })
})

describe('PE-13 -- 再開アイコン', () => {
  it(`PE-13 on release: ${cellOf('PE-13', ON_RELEASE)}`, () => {
    const one = built()
    const before = JSON.stringify(one.loop.document().schedule)
    pressAndRelease(one, at(one, PAUSED_UID, 'GA-20'))
    expect(JSON.stringify(one.loop.document().schedule), cellOf('PE-13', ON_RELEASE)).toBe(before)
  })

  it(`PE-13 sideways: ${cellOf('PE-13', SIDEWAYS)}`, () => {
    const one = built()
    dragTo(one, at(one, PAUSED_UID, 'GA-20'), xOfDay(one.loop, april(22)))
    const after = taskIn(one.loop, PAUSED_UID)
    expect(dayPart(after.resume), cellOf('PE-13', SIDEWAYS)).toBe('2026-04-22')
    expect(after.resumeValid, cellOf('PE-13', SIDEWAYS)).toBe(true)
  })
})

describe('T-270 closing -- a Task row is selected by a press that does not move', () => {
  it.each([BAR_UID, FRESH_UID, FADED_UID])(`${T_270_SELECTS}: Task %s`, (uid) => {
    const one = built()
    pressAndRelease(one, at(one, uid, 'GA-9'))
    expect(drawnTask(one.loop, uid).fadeHandles.length, T_270_SELECTS).toBeGreaterThan(0)
  })

  it(`${T_270_SELECTS} -- and the one before it is replaced`, () => {
    const one = built()
    pressAndRelease(one, at(one, FADED_UID, 'GA-9'))
    pressAndRelease(one, at(one, BAR_UID, 'GA-9'))
    expect(drawnTask(one.loop, FADED_UID).fadeHandles.length, T_270_SELECTS).toBe(0)
  })
})

describe('T-270 closing -- a completed Task keeps its actual when the plan is dragged', () => {
  it(`${T_270_NO_OTHER_ROAD}`, () => {
    const one = built()
    const before = datesOf(one, DONE_UID)
    dragTo(one, at(one, DONE_UID, 'GA-9'), xOfDay(one.loop, april(12)))
    const after = datesOf(one, DONE_UID)
    expect(after['actualStart'], T_270_NO_OTHER_ROAD).toBe(before['actualStart'])
    expect(after['actualFinish'], T_270_NO_OTHER_ROAD).toBe(before['actualFinish'])
  })
})

describe('control -- the bench can tell one released day from another', () => {
  it('two different releases of PE-2 put two different finishes', () => {
    const one = built()
    dragTo(one, at(one, BAR_UID, 'GA-2'), xOfDay(one.loop, april(20)))
    const first = datesOf(one, BAR_UID)['finish']
    const two = built()
    dragTo(two, at(two, BAR_UID, 'GA-2'), xOfDay(two.loop, april(22)))
    expect(datesOf(two, BAR_UID)['finish']).not.toBe(first)
  })
})
