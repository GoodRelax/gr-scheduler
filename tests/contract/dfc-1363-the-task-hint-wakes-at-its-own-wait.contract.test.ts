// DFC-1363: the frame wake for the task description waits S-439, and the frame wake for the icon description waits S-124 -- two clocks (FR-092 EZ-2, EZ-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { frameClockWakesOf, type FrameClockWakesHands } from '../../src/framework/single-html-shell/frame-clock-wakes'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const SETTINGS_TABLES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8'))

const EZ_2_WAIT = 'ポインタがアイコンに入ってから `_assets/tbl-settings.md` の `S-124` が経ったら、そのアイコンの説明を出すこと（MUST）。'
const EZ_2_FROM_ENTERING = '⭐ 待ちは、ポインタがそのアイコンに入った時から数えること（MUST）。'
const EZ_6_WAIT =
  '日程の上でポインタが `_assets/tbl-settings.md` の `S-439` のあいだ止まったら、そこに当たったものの説明を、表 T-348 の行で出すこと（MUST）。'
const EZ_6_TWO_VALUES = '⚠️ 待ち時間は `S-439` とし、`EZ-2` の待ち（`S-124`）とは別の値として持つこと（MUST）'
const EZ_6_FROM_THE_STOP = '⚠️ 待ちを数え始めるのは、`EZ-2` と違い、ポインタが止まった時である'
const S_439_APART = '⚠️ **`S-124` とは別の値である** —— 片方を選び直しても、もう片方は動かない（`EZ-6`）。'
const S_439_LONGER = '⚠️ **500 は、利用者が選んだ値である** —— アイコンの説明（`S-124`）より長いのは'
const S_439_FROM_THE_STOP = '⚠️ **待ちは、ポインタがタスクの上で止まった時から数える**（`EZ-6`）'
const S_124_FROM_ENTERING = '⚠️ **待ちは、ポインタがアイコンに入った時から数える**（`EZ-2`）'

// see T-212
const T_212 = specTable('T-212')

/** @purity pure */
function rowOfT212(id: string): { key: string; ms: number } {
  const row = T_212.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-212 has no row ${id}`)
  const found = /(\d+(?:\.\d+)?)/.exec(bare(row.by['値'] ?? ''))
  if (found === null) throw new Error(`table T-212 row ${id} states no number`)
  return { key: bare(row.by['名前'] ?? ''), ms: Number(found[1]) }
}

const ICON_WAIT = rowOfT212('S-124')
const TASK_WAIT = rowOfT212('S-439')

interface Rig {
  readonly ask: ReturnType<typeof vi.fn>
  readonly wakes: ReturnType<typeof frameClockWakesOf>
}

/** @purity non-pure */
function rig(): Rig {
  const ask = vi.fn()
  // WHY: a wait is armed only while a screen is present; its contents are not read by the wake.
  const hands = {
    readValues: vi.fn(),
    readEnvironment: vi.fn(),
    screen: {},
    sendToSession: vi.fn(),
    ask: (): void => {
      ask()
    },
  } as unknown as FrameClockWakesHands
  return { ask, wakes: frameClockWakesOf(hands) }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('DFC-1363 -- the manuscript these cases are driven by', () => {
  it.each([EZ_2_WAIT, EZ_2_FROM_ENTERING, EZ_6_WAIT, EZ_6_TWO_VALUES, EZ_6_FROM_THE_STOP])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([S_439_APART, S_439_LONGER, S_439_FROM_THE_STOP, S_124_FROM_ENTERING])('table T-212 still says: %s', (clause) => {
    expect(SETTINGS_TABLES).toContain(clause)
  })

  it('the build holds S-124 and S-439 under their own keys at the values table T-212 states', () => {
    expect(ICON_WAIT.key, 'S-124 names a key').toBe('iconHintDelayMs')
    expect(TASK_WAIT.key, 'S-439 names a key').toBe('taskHintDelayMs')
    expect(SETTINGS_CONSTANTS.iconHintDelayMs, 'S-124').toBe(ICON_WAIT.ms)
    expect(SETTINGS_CONSTANTS.taskHintDelayMs, 'S-439').toBe(TASK_WAIT.ms)
  })
})

describe(`DFC-1363 -- EZ-6: ${EZ_6_FROM_THE_STOP}`, () => {
  it('a pointer rest wakes a frame at S-439, and not a millisecond earlier', () => {
    const { ask, wakes } = rig()
    wakes.beginPointerRest()
    vi.advanceTimersByTime(TASK_WAIT.ms - 1)
    expect(ask, `no wake before S-439 (${TASK_WAIT.ms} ms) -- ${EZ_6_WAIT}`).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(ask, `one wake at S-439 (${TASK_WAIT.ms} ms) -- ${EZ_6_WAIT}`).toHaveBeenCalledTimes(1)
  })

  it(`a pointer rest alone raises no wake at the icon wait S-124 -- ${S_439_LONGER}`, () => {
    expect(ICON_WAIT.ms, `premise: ${S_439_LONGER}`).toBeLessThan(TASK_WAIT.ms)
    const { ask, wakes } = rig()
    wakes.beginPointerRest()
    vi.advanceTimersByTime(ICON_WAIT.ms)
    expect(ask, `the task description waits S-439, not S-124 -- ${EZ_6_TWO_VALUES}`).not.toHaveBeenCalled()
  })

  it('a second pointer rest restarts the task wait: one wake, S-439 after the latest rest', () => {
    const { ask, wakes } = rig()
    const moved = Math.max(1, Math.floor(TASK_WAIT.ms / 2))
    wakes.beginPointerRest()
    vi.advanceTimersByTime(moved)
    wakes.beginPointerRest()
    vi.advanceTimersByTime(TASK_WAIT.ms - moved)
    expect(ask, 'no wake S-439 after the first rest once the pointer rested again').not.toHaveBeenCalled()
    vi.advanceTimersByTime(moved - 1)
    expect(ask, 'no wake before S-439 after the latest rest').not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(ask, 'one wake S-439 after the latest rest').toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(TASK_WAIT.ms)
    expect(ask, 'the first rest left no wake of its own behind').toHaveBeenCalledTimes(1)
  })
})

describe(`DFC-1363 -- EZ-2: ${EZ_2_FROM_ENTERING}`, () => {
  it('entering a hint target wakes a frame at S-124, and not a millisecond earlier', () => {
    const { ask, wakes } = rig()
    wakes.beginHintTargetDwell()
    vi.advanceTimersByTime(ICON_WAIT.ms - 1)
    expect(ask, `no wake before S-124 (${ICON_WAIT.ms} ms) -- ${EZ_2_WAIT}`).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(ask, `one wake at S-124 (${ICON_WAIT.ms} ms) -- ${EZ_2_WAIT}`).toHaveBeenCalledTimes(1)
  })
})
