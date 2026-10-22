// CR-825: table T-064 PI-1 edgeInstantOf -- the one edge rule the layout and the baseline outline read (RV-1, RV-6, BL-2, FR-054).

import { describe, expect, it } from 'vitest'

import { dayOf, edgeInstantOf, MINUTES_PER_CALENDAR_DAY, serial } from '../../src/entity/document-model/schedule/schedule'

const NOTE_HIDDEN =
  '表示しないときは丸 1 日の列で、開始の側はその日の始まり、終了の側は `finishSideDayFrom` の日の翌暦日の始まり —— `00:00` の終わりは前の日を閉じる（`FR-054`、`05-07-design.md` の 表 T-069 の `RV-1`・`RV-6`）。'
const NOTE_VISIBLE = '時刻を表示するときは、日時の字をその側で読んだ瞬間（`FR-158`）。'
const NOTE_CALL = '側で読んだ瞬間を返す読み手（時刻を表示するときだけ呼ぶ）'
const NOTE_UNREADABLE = '字が読めなければ無い'
const FR_054_FINISH_DAY = '終了の側は 1 分前の瞬間の日とすること（MUST） —— 終了の `00:00:00` は前の日の終わりである。'
const RV_1_VISIBLE = '時刻を表示しているとき（`01-04-requirements.md` の `FR-158`）は、右端は終わりの瞬間の位置、左端は開始の瞬間の位置、マイルストーンの菱形は開始の瞬間の位置を中心に立つ。'

const HIDDEN_ROWS: ReadonlyArray<readonly [string, 'start' | 'finish', string, number]> = [
  ['2026-03-10', 'start', '2026-03-10', 0],
  ['2026-03-10', 'finish', '2026-03-10', 1],
  ['2026-03-10T13:00:00', 'start', '2026-03-10', 0],
  ['2026-03-10T00:00:00', 'start', '2026-03-10', 0],
  ['2026-03-10T00:00:00', 'finish', '2026-03-10', 0],
  ['2026-03-10T13:00:00', 'finish', '2026-03-10', 1],
  ['2026-03-10T23:59:00', 'finish', '2026-03-10', 1],
  ['2026-03-10T00:01:00', 'finish', '2026-03-10', 1],
  ['2026-03-31T00:00:00', 'finish', '2026-03-31', 0],
  ['2026-03-31', 'finish', '2026-03-31', 1],
]

function dayStartOf(text: string, calendarDaysAfter: number): number {
  const day = dayOf(text)
  if (day === null) throw new Error('fixed data must be readable: ' + text)
  return serial(day) * MINUTES_PER_CALENDAR_DAY + calendarDaysAfter * MINUTES_PER_CALENDAR_DAY
}

const neverCalled = (): number | null => {
  throw new Error('instantAt must not be called')
}

describe('edgeInstantOf with the time of day hidden -- ' + NOTE_HIDDEN, () => {
  for (const [text, side, expectedDay, after] of HIDDEN_ROWS) {
    it(`${side} edge of ${text} stands at the start of ${expectedDay} + ${after} day(s)`, () => {
      const edge = edgeInstantOf(text, side, neverCalled, false, dayOf)
      expect(edge).toBe(dayStartOf(expectedDay, after))
    })
  }

  it('a finish edge is always a whole-day boundary (' + FR_054_FINISH_DAY + ')', () => {
    for (const [text, side] of HIDDEN_ROWS) {
      const edge = edgeInstantOf(text, side, neverCalled, false, dayOf)
      expect(edge).not.toBeNull()
      expect((edge as number) % MINUTES_PER_CALENDAR_DAY).toBe(0)
    }
  })

  it('the finish edge is one day after the start edge of the same date-only text, and equal for a 00:00:00 finish', () => {
    const start = edgeInstantOf('2026-05-04', 'start', neverCalled, false, dayOf) as number
    const finish = edgeInstantOf('2026-05-04', 'finish', neverCalled, false, dayOf) as number
    expect(finish - start).toBe(MINUTES_PER_CALENDAR_DAY)
    const closed = edgeInstantOf('2026-05-04T00:00:00', 'finish', neverCalled, false, dayOf) as number
    expect(closed).toBe(start)
  })

  it(NOTE_CALL + ' -- the instant reader is not called while hidden', () => {
    let calls = 0
    edgeInstantOf('2026-03-10T13:00:00', 'finish', () => ((calls += 1), 12345), false, dayOf)
    edgeInstantOf('2026-03-10T13:00:00', 'start', () => ((calls += 1), 12345), false, dayOf)
    expect(calls).toBe(0)
  })

  it('reads the day through the given dayAt reader and passes it the text', () => {
    const seen: Array<string | null> = []
    const reader = (text: string | null) => (seen.push(text), dayOf(text))
    edgeInstantOf('2026-03-10', 'start', neverCalled, false, reader)
    expect(seen).toContain('2026-03-10')
  })

  it(NOTE_UNREADABLE + ' -- unreadable text gives null', () => {
    for (const side of ['start', 'finish'] as const) {
      expect(edgeInstantOf('not a date', side, neverCalled, false, dayOf)).toBeNull()
      expect(edgeInstantOf(null, side, neverCalled, false, dayOf)).toBeNull()
      expect(edgeInstantOf('2026-03-10', side, neverCalled, false, () => null)).toBeNull()
    }
  })
})

describe('edgeInstantOf with the time of day visible -- ' + NOTE_VISIBLE, () => {
  const READ_INSTANT = 29_000_000 + 13 * 60

  for (const side of ['start', 'finish'] as const) {
    it(`${side} edge is exactly what instantAt returns (${RV_1_VISIBLE})`, () => {
      const dayAtNeverCalled = () => {
        throw new Error('dayAt is not needed when the time of day is visible')
      }
      expect(edgeInstantOf('2026-03-10T13:00:00', side, () => READ_INSTANT, true, dayAtNeverCalled)).toBe(READ_INSTANT)
    })

    it(`${side} edge is null when instantAt returns null`, () => {
      expect(edgeInstantOf('2026-03-10T13:00:00', side, () => null, true, dayOf)).toBeNull()
    })

    it(`${side} edge keeps a 00:00:00 reading as the instant itself, not as the day before`, () => {
      const midnight = dayStartOf('2026-03-10', 0)
      expect(edgeInstantOf('2026-03-10T00:00:00', side, () => midnight, true, dayOf)).toBe(midnight)
    })
  }
})
