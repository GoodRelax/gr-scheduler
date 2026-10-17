// DFC-2980: FR-107 table T-270 rows PE-8 / PE-10 -- a progress marker pulled with many moves.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import { unbroken } from '../contract/spec-table'
import { boxOfBar, markerBoxOf, pointAnswering, scanGrabAreas, type Box } from './cr-430-bench'
import {
  BAR_UID,
  FRESH_UID,
  PAUSED_UID,
  WIDE_UID,
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
} from './cr-430-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const SETTINGS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8'))

const PE_8_ROW_PULLS_THE_END =
  '| PE-8 | 進捗マーカー（`===` で実績の右に立つ。実績はダミーを含む。中断のあいだを除く）'
const PE_10_PULLS_NOTHING = '| PE-10 | 進捗マーカー（それ以外 —— 実績の中・`--->`・◆・中断のあいだ）'
const FOLLOW_PE_8 = '⭐ 進捗マーカーを引いているあいだ（`FR-107` の 表 T-270 の `PE-8`）は、置くことになる実績の終了を描いて示すこと（MUST）。'
const MARKER_PULLS_AND_PRESSES = '⚠️ 進捗マーカーは押す的と引く的を兼ねるので、引く場面（`PE-8`）では追従する。'
const IN_1_RELEASE_COMMITS = '⚠️ **確定は 表 T-028 の `IN-1` に従う**（離した時点）。'
const THRESHOLD_SPLITS_PRESS_FROM_PULL =
  '押した点から横か縦のどちらかへ `S-208` を超えて離せば引く、どちらも超えなければ押して離すである。'
const LP_1_MARKER_AT_START_WHEN_IT_FITS = '| LP-1 | `===` | 出す | 入る | 基準の開始から `S-584` だけ右 |'
const LP_2_MARKER_AT_END_WHEN_IT_DOES_NOT = '| LP-2 | `===` | 出す | 入らない | 基準の終了から `S-584` だけ右 |'
const RF_1_REFERENCE_IS_THE_ACTUAL =
  '| RF-1 | する | 実績（ダミーを含む —— まだ始まっていない実績はダミーであり、幅は 表 T-240 の `DM-3`、マイルストーンはダミーの菱形） |'

const GO_9_ROW_START = '| GO-9 | 進捗マーカーを引く（`FR-107` の 表 T-270 の `PE-8`） |'
const GO_9_ACTUAL_RIGHT = '実績の右に立つときは、実績の最後の日 ＝ 離した所そのもの（`GO-3` と同じ所作）。'
const GO_9_DUMMY_RIGHT = '未着手のダミーの右に立つときは、`actualStart` ＝ 予定の開始日'
const GO_9_LEFT_OF_PLAN_START = '⚠️ 予定の開始より左で離したときは、予定の開始に表 T-240 の `DM-2` の長さの実績を置く'

// see S-208
const DRAG_THRESHOLD_PX = (() => {
  const row = SETTINGS.split('\n').find((line) => line.startsWith('| S-208 |'))
  const found = row === undefined ? null : /\|\s*(\d+)px\b/.exec(row)
  if (found === null) throw new Error('premise: table T-206 row S-208 states no pixel distance')
  return Number(found[1])
})()

afterEach(restoreAnimationFrames)

describe('DFC-2980 -- the manuscript these cases are driven by', () => {
  it.each([
    PE_8_ROW_PULLS_THE_END,
    PE_10_PULLS_NOTHING,
    FOLLOW_PE_8,
    MARKER_PULLS_AND_PRESSES,
    IN_1_RELEASE_COMMITS,
    THRESHOLD_SPLITS_PRESS_FROM_PULL,
    LP_1_MARKER_AT_START_WHEN_IT_FITS,
    LP_2_MARKER_AT_END_WHEN_IT_DOES_NOT,
    RF_1_REFERENCE_IS_THE_ACTUAL,
    GO_9_ROW_START,
    GO_9_ACTUAL_RIGHT,
    GO_9_DUMMY_RIGHT,
    GO_9_LEFT_OF_PLAN_START,
  ])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('control -- a quotation can go red: one character off is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(GO_9_ACTUAL_RIGHT.replace('離した所そのもの', ' 離した所そのもの'))
  })

  it('S-208 states the pull distance in pixels', () => {
    expect(DRAG_THRESHOLD_PX).toBeGreaterThan(0)
  })
})

const SHORT_NAME = 'Q'
const LONG_NAME = 'Alpha that will not fit inside its own actual'

// WHY: a short name lets the tentative actual grow until the name fits (table T-273 LP-1), which stands the marker inside it.
/** @purity pure */
function documentWith(over: { readonly name?: string; readonly planFinish?: string; readonly zoomX?: number }): Document {
  const base = benchDocument({ isProgressMarkerVisible: true, ...(over.zoomX === undefined ? {} : { zoomX: over.zoomX }) })
  return {
    ...base,
    schedule: {
      ...base.schedule,
      tasks: base.schedule.tasks.map((one) =>
        one.uid === FRESH_UID || one.uid === BAR_UID
          ? {
              ...one,
              ...(over.name === undefined ? {} : { name: over.name }),
              ...(over.planFinish === undefined ? {} : { finish: over.planFinish }),
            }
          : one,
      ),
    },
  }
}

interface Look {
  readonly travel: number
  readonly actual: Box | null
  readonly marker: Box | null
  readonly pointerDay: string
  readonly actualLastDay: string | null
  readonly actualFirstDay: string | null
}

/** @purity pure */
function lookAt(one: Stage, uid: number, pointerX: number, travel: number): Look {
  const drawn = drawnTask(one.loop, uid)
  const actual = drawn.actual === null ? null : boxOfBar(drawn.actual, `Task ${String(uid)} tentative actual`)
  return {
    travel,
    actual,
    marker: markerBoxOf(drawn),
    pointerDay: dayUnder(one.loop, pointerX),
    actualLastDay: actual === null ? null : dayUnder(one.loop, actual.x1 - 0.5),
    actualFirstDay: actual === null ? null : dayUnder(one.loop, actual.x0 + 0.5),
  }
}

/** @purity pure */
const markerStandsInsideActual = (look: Look): boolean =>
  look.actual !== null &&
  look.marker !== null &&
  (look.marker.x0 + look.marker.x1) / 2 >= look.actual.x0 &&
  (look.marker.x0 + look.marker.x1) / 2 <= look.actual.x1

interface Pull {
  readonly trace: readonly Look[]
  readonly planStart: string | null
}

// WHY: one send() per move, as a real drag does; the bench draws a frame inside each send().
/** @purity non-pure */
function pull(one: Stage, uid: number, stepPx: number, releaseDay: string): Pull {
  const frame = frameOf(one.loop)
  const pressedAt = pointAnswering(scanGrabAreas(frame.geometry, uid, frame.taskGroupArea), 'GA-18')
  const releaseX = xOfDay(one.loop, releaseDay)
  const planStart = dayPart(taskIn(one.loop, uid).start)
  const direction = releaseX >= pressedAt.x ? 1 : -1
  const trace: Look[] = []
  one.send(pointer('down', pressedAt.x, pressedAt.y))
  let x = pressedAt.x
  while (Math.abs(releaseX - x) > stepPx) {
    x += direction * stepPx
    one.send(pointer('move', x, pressedAt.y))
    trace.push(lookAt(one, uid, x, x - pressedAt.x))
  }
  if (x !== releaseX) {
    one.send(pointer('move', releaseX, pressedAt.y))
    trace.push(lookAt(one, uid, releaseX, releaseX - pressedAt.x))
  }
  one.send(pointer('up', releaseX, pressedAt.y))
  return { trace, planStart }
}

/** @purity pure */
const lastActualDayOf = (one: Stage, uid: number): string | null => {
  const task = taskIn(one.loop, uid)
  return dayPart(task.actualFinish ?? task.stop)
}

/** @purity pure */
const pastThreshold = (trace: readonly Look[]): readonly Look[] =>
  trace.filter((look) => Math.abs(look.travel) > DRAG_THRESHOLD_PX)

interface Case {
  readonly what: string
  readonly uid: number
  readonly make: () => Document
  readonly stepPx: number
  readonly releaseDay: string
  readonly startsOn: string | null
  readonly expectsMarkerInside: boolean
}

const shortPlan = (): Document => documentWith({ name: SHORT_NAME, planFinish: april(8) })
const named = (): Document => documentWith({ name: SHORT_NAME })
const narrow = (): Document => documentWith({ name: SHORT_NAME, zoomX: 0.5 })
const wordy = (): Document => documentWith({ name: LONG_NAME })

const CASES: readonly Case[] = [
  { what: 'not started, 1 px steps, release inside the plan', uid: FRESH_UID, make: named, stepPx: 1, releaseDay: april(14), startsOn: null, expectsMarkerInside: true },
  { what: 'not started, 5 px steps, release inside the plan', uid: FRESH_UID, make: named, stepPx: 5, releaseDay: april(14), startsOn: null, expectsMarkerInside: true },
  { what: 'not started, 5 px steps, release at the plan end', uid: FRESH_UID, make: named, stepPx: 5, releaseDay: april(24), startsOn: null, expectsMarkerInside: true },
  { what: 'not started, 1 px steps, release past the plan end', uid: FRESH_UID, make: named, stepPx: 1, releaseDay: april(28), startsOn: null, expectsMarkerInside: true },
  { what: 'not started, 5 px steps, release far past the plan end', uid: FRESH_UID, make: named, stepPx: 5, releaseDay: april(30), startsOn: null, expectsMarkerInside: true },
  { what: 'not started, short plan pulled past its end', uid: FRESH_UID, make: shortPlan, stepPx: 3, releaseDay: april(20), startsOn: null, expectsMarkerInside: true },
  { what: 'not started, narrow day width', uid: FRESH_UID, make: narrow, stepPx: 2, releaseDay: april(28), startsOn: null, expectsMarkerInside: true },
  { what: 'not started, long name, 5 px steps', uid: FRESH_UID, make: wordy, stepPx: 5, releaseDay: april(20), startsOn: null, expectsMarkerInside: false },
  { what: 'in progress, 1 px steps, release a little right of the actual', uid: BAR_UID, make: named, stepPx: 1, releaseDay: april(13), startsOn: '2026-04-08', expectsMarkerInside: true },
  { what: 'in progress, 5 px steps, release at the plan end', uid: BAR_UID, make: named, stepPx: 5, releaseDay: april(24), startsOn: '2026-04-08', expectsMarkerInside: true },
  { what: 'in progress, 1 px steps, release past the plan end', uid: BAR_UID, make: named, stepPx: 1, releaseDay: april(28), startsOn: '2026-04-08', expectsMarkerInside: true },
  { what: 'in progress, 5 px steps, release far past the plan end', uid: BAR_UID, make: named, stepPx: 5, releaseDay: april(30), startsOn: '2026-04-08', expectsMarkerInside: true },
  { what: 'in progress, short plan pulled past its end', uid: BAR_UID, make: shortPlan, stepPx: 3, releaseDay: april(20), startsOn: '2026-04-08', expectsMarkerInside: true },
  { what: 'in progress, narrow day width', uid: BAR_UID, make: narrow, stepPx: 2, releaseDay: april(28), startsOn: '2026-04-08', expectsMarkerInside: true },
  { what: 'in progress, long name, 5 px steps', uid: BAR_UID, make: wordy, stepPx: 5, releaseDay: april(20), startsOn: '2026-04-08', expectsMarkerInside: false },
]

describe('PE-8 / GO-9 -- the marker right of the actual is pulled with many moves and the release puts the values of GO-9', () => {
  it.each(CASES)('$what', (one) => {
    const built = stage(one.make())
    const done = pull(built, one.uid, one.stepPx, one.releaseDay)
    const expectedStart = one.startsOn ?? done.planStart
    const dragging = pastThreshold(done.trace)
    expect(dragging.length, 'premise: the pull went past the S-208 distance in many moves').toBeGreaterThan(2)
    if (one.expectsMarkerInside) {
      expect(
        dragging.some(markerStandsInsideActual),
        'premise: the tentative marker stood inside the tentative actual (LP-1) at some move',
      ).toBe(true)
    }
    for (const look of dragging) {
      const where = `${one.what}: at ${String(look.travel)} px of travel`
      expect(look.actual, `${where}: ${FOLLOW_PE_8}`).not.toBeNull()
      expect(look.actualLastDay, `${where}: the pulled actual ends where the pointer is (GO-9, GO-3)`).toBe(look.pointerDay)
      expect(look.actualFirstDay, `${where}: the pulled actual starts where GO-9 puts actualStart`).toBe(expectedStart)
    }
    expect(lastActualDayOf(built, one.uid), `${one.what}: ${GO_9_ACTUAL_RIGHT}`).toBe(dayPart(one.releaseDay))
    expect(dayPart(taskIn(built.loop, one.uid).actualStart), `${one.what}: ${GO_9_DUMMY_RIGHT}`).toBe(expectedStart)
  })

  it('1 px steps and 5 px steps that end on the same point put the same values', () => {
    const fine = stage(named())
    const coarse = stage(named())
    pull(fine, FRESH_UID, 1, april(20))
    pull(coarse, FRESH_UID, 5, april(20))
    expect(
      [dayPart(taskIn(fine.loop, FRESH_UID).actualStart), lastActualDayOf(fine, FRESH_UID)],
      GO_9_ROW_START,
    ).toEqual([dayPart(taskIn(coarse.loop, FRESH_UID).actualStart), lastActualDayOf(coarse, FRESH_UID)])
  })
})

describe('GO-9 -- released left of the plan start the actual is one dummy long on the plan start', () => {
  it('not started, pulled left over many moves: actualStart is the plan start and the actual is S-129 long', () => {
    expect(SETTINGS_CONSTANTS.actualInitialDuration, 'premise: S-129 is one working day').toBe(1)
    const built = stage(named())
    const done = pull(built, FRESH_UID, 3, april(3))
    expect(dayPart(taskIn(built.loop, FRESH_UID).actualStart), GO_9_LEFT_OF_PLAN_START).toBe(done.planStart)
    expect(lastActualDayOf(built, FRESH_UID), GO_9_LEFT_OF_PLAN_START).toBe(done.planStart)
  })
})

describe('PE-10 -- a marker anywhere else does nothing when pulled, however many moves', () => {
  const UNCHANGED: readonly { readonly what: string; readonly uid: number }[] = [
    { what: 'inside a wide actual', uid: WIDE_UID },
    { what: 'in a pause', uid: PAUSED_UID },
  ]

  it.each(UNCHANGED)('$what', ({ what, uid }) => {
    const built = stage(named())
    const before = structuredClone(taskIn(built.loop, uid))
    const unpressed = structuredClone(drawnTask(built.loop, uid))
    const frame = frameOf(built.loop)
    const pressedAt = pointAnswering(scanGrabAreas(frame.geometry, uid, frame.taskGroupArea), 'GA-18')
    const releaseX = xOfDay(built.loop, april(28))
    expect(unpressed.marker, 'premise: the task draws a marker').not.toBeNull()
    built.send(pointer('down', pressedAt.x, pressedAt.y))
    let moved = 0
    for (let x = pressedAt.x + 5; x < releaseX; x += 5) {
      built.send(pointer('move', x, pressedAt.y))
      if (x - pressedAt.x > DRAG_THRESHOLD_PX) {
        moved += 1
        expect(structuredClone(drawnTask(built.loop, uid)), `${what}: ${PE_10_PULLS_NOTHING}`).toEqual(unpressed)
      }
    }
    built.send(pointer('up', releaseX, pressedAt.y))
    expect(moved, 'premise: the pull was many moves past S-208').toBeGreaterThan(2)
    const after = taskIn(built.loop, uid)
    expect(
      [after.actualStart, after.stop, after.actualFinish, after.resume],
      `${what}: ${PE_10_PULLS_NOTHING}`,
    ).toEqual([before.actualStart, before.stop, before.actualFinish, before.resume])
  })
})
