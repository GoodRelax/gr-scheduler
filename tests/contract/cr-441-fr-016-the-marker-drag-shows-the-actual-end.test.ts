// FR-016: while the progress marker of table T-270 PE-8 is dragged, the actual end it will put is drawn.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import { pointAnswering, scanGrabAreas } from '../unit/cr-430-bench'
import {
  BAR_UID,
  FRESH_UID,
  actualBox,
  april,
  benchDocument,
  dayPart,
  dayUnder,
  drawnTask,
  frameOf,
  pointer,
  restoreAnimationFrames,
  stage,
  taskIn,
  xOfDay,
  type Stage,
} from '../unit/cr-430-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_016_THE_MARKER_SHOWS_THE_END =
  '⭐ 進捗マーカーを引いているあいだ（`FR-107` の 表 T-270 の `PE-8`）は、置くことになる実績の終了を描いて示すこと（MUST）。'
const FR_016_THE_MARKER_FOLLOWS = '⚠️ 進捗マーカーは押す的と引く的を兼ねるので、引く場面（`PE-8`）では追従する。'
const FR_106_THE_MARKER_IS_A_FINGER =
  '⭐ 押す役と引く役を兼ねる進捗マーカー（表 T-270 の `PE-8`）は、押す役の形（指）とすること（MUST）。'

const GRABBED = '掴んだもの'

afterEach(restoreAnimationFrames)

const markerOf = (one: Stage, uid: number): { readonly x: number; readonly y: number } => {
  const frame = frameOf(one.loop)
  return pointAnswering(scanGrabAreas(frame.geometry, uid, frame.rowArea), 'GA-18')
}

const lastActualDayOf = (one: Stage, uid: number): string | null => {
  const task = taskIn(one.loop, uid)
  return dayPart(task.actualFinish ?? task.stop)
}

// WHY: either figure may carry the picture of the actual to be put -- an actual bar or the dummy
// WHY: that stands for it -- so the right end of whichever is drawn is read, not one member's name.
const drawnEndOf = (one: Stage, uid: number): number => {
  const drawn = drawnTask(one.loop, uid)
  if (drawn.actual !== null) return actualBox(one.loop, uid).x1
  const ends = drawn.dummies.map((dummy) => dummy.ink.x + dummy.ink.width)
  if (ends.length === 0) throw new Error(`Task ${String(uid)} draws neither an actual nor a dummy`)
  return Math.max(...ends)
}

const hold = (one: Stage, uid: number, isoDay: string): void => {
  const from = markerOf(one, uid)
  one.send(pointer('down', from.x, from.y))
  one.send(pointer('move', xOfDay(one.loop, isoDay), from.y))
}

describe('FR-016 / FR-106 -- the manuscript these cases are driven by', () => {
  it.each([FR_016_THE_MARKER_SHOWS_THE_END, FR_016_THE_MARKER_FOLLOWS, FR_106_THE_MARKER_IS_A_FINGER])(
    'still says it, word for word: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it('PE-8 is the marker right of an actual, and the actual includes the dummy', () => {
    const grabbed = specTable('T-270').rows.find((row) => row.id === 'PE-8')?.by[GRABBED] ?? ''
    expect(grabbed).toContain('実績の右に立つ')
    expect(grabbed).toContain('実績はダミーを含む')
  })
})

describe(`FR-016: ${FR_016_THE_MARKER_SHOWS_THE_END}`, () => {
  const CASES = [
    { what: 'right of an actual', uid: BAR_UID },
    { what: 'right of a dummy', uid: FRESH_UID },
  ] as const

  it.each(CASES)('$what: the drawn actual ends on the day under the pointer while the marker is held', ({ uid }) => {
    const one = stage(benchDocument({ progressMarkerVisible: true })) // see S-63
    const target = april(17)
    hold(one, uid, target)
    const end = drawnEndOf(one, uid)
    expect(dayUnder(one.loop, end - 1), FR_016_THE_MARKER_SHOWS_THE_END).toBe(dayPart(target))
    expect(dayUnder(one.loop, end + 1), FR_016_THE_MARKER_SHOWS_THE_END).not.toBe(dayPart(target))
  })

  it.each(CASES)('$what: the drawn end moves with the pointer, day by day', ({ uid }) => {
    const one = stage(benchDocument({ progressMarkerVisible: true }))
    hold(one, uid, april(15))
    const first = drawnEndOf(one, uid)
    const from = markerOf(one, uid)
    one.send(pointer('move', xOfDay(one.loop, april(19)), from.y))
    expect(drawnEndOf(one, uid) - first, FR_016_THE_MARKER_FOLLOWS).toBeCloseTo(frameOf(one.loop).pxPerDay * 4, 6)
  })

  it.each(CASES)('$what: the picture is not the document -- nothing is stored until the release', ({ uid }) => {
    const one = stage(benchDocument({ progressMarkerVisible: true }))
    const before = lastActualDayOf(one, uid)
    hold(one, uid, april(17))
    expect(lastActualDayOf(one, uid), FR_016_THE_MARKER_SHOWS_THE_END).toBe(before)
  })
})
