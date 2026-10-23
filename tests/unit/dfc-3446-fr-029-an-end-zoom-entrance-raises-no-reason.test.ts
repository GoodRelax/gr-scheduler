// DFC-3446 spec-only cases: T-260 SE-5 / FR-029 -- an IC-14 pressed at the T-262 ZE-2 lower end, or an IC-15 pressed at the ZE-3 ceiling, shows the end message and carries no FR-029 reason to the notice mechanism.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { DISPLAY_WORDS, REQUIREMENTS, shell, taskGroupDocument, type ShellBench, type TaskGroupSeed } from './cr-541-stage'

// WHY: RS-27 (the FR-029 fallback) shows nothing, so a carried reason is only visible on the seam every event goes through (notices/noticeRaised).
const seen = vi.hoisted(() => ({ raised: [] as string[] }))

vi.mock('../../src/use-case/advance-screen-session/advance-screen-session', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/use-case/advance-screen-session/advance-screen-session')>()
  return {
    ...real,
    advanceScreenSession: (session: never, event: { type: string; reason?: string }) => {
      if (event.type === 'noticeRaised' && typeof event.reason === 'string') seen.raised.push(event.reason)
      return (real.advanceScreenSession as (a: never, b: unknown) => unknown)(session, event)
    },
  }
})

const SE_5_NO_REASON =
  '⭐ 端の段で押して倍率が変わらなかった入口（`SE-1` の後段と、縦軸のズームの 表 T-262 の `ZE-2` / `ZE-3`）には、`FR-029` の行えない理由の通知を出してはならない（MUST NOT）'
const SE_5_STILL_FAINT = '⚠️ その入口を `FR-029` のとおり薄く描くことは変わらない'
const FR_029_THE_EXCEPTION =
  '⚠️ 表示の倍率と縦軸のズームの入口を端の段で押したときは、この通知を出さない —— その例外は `FR-039` の 表 T-260 の `SE-5` が持つ。'
const FR_029_CARRY_WHEN_PRESSED = '押されたときに限り、行えない理由を通知の仕組みへ運ぶこと（MUST）'
const ZE_5_THE_MESSAGE = '`ZE-2` と `ZE-3` のときは、`FR-039` の 表 T-260 のメッセージを出すこと（MUST）'

describe('DFC-3446 -- the manuscript these cases are driven by (JDG-300 Q9 as landed)', () => {
  it.each([
    ['T-260 SE-5 (MUST NOT) -- no FR-029 reason for an end press of ZE-2 / ZE-3', SE_5_NO_REASON],
    ['T-260 SE-5 -- the entrance is still faint', SE_5_STILL_FAINT],
    ['FR-029 -- the exception is held by SE-5', FR_029_THE_EXCEPTION],
    ['FR-029 (MUST) -- the rule the exception lifts', FR_029_CARRY_WHEN_PRESSED],
    ['T-262 ZE-5 (MUST) -- the end message instead', ZE_5_THE_MESSAGE],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const A = 'dddddddd-0000-4000-8000-000000000001'
const B = 'dddddddd-0000-4000-8000-000000000002'
const C = 'dddddddd-0000-4000-8000-000000000003'
const Z = 'dddddddd-0000-4000-8000-000000000004'

const DEEP: readonly TaskGroupSeed[] = [
  { id: A, parentId: null },
  { id: B, parentId: A },
  { id: C, parentId: B },
  { id: Z, parentId: null },
]

const endWord = (end: 'min' | 'max'): string => {
  const found = (DISPLAY_WORDS['scaleEcho'] as { end: string; text: { ja: string } }[]).find((one) => one.end === end)
  if (found === undefined) throw new Error(`the dictionary holds no scaleEcho word for ${end}`)
  return found.text.ja
}

const benches: ShellBench[] = []

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    now: Date.UTC(2026, 9, 24, 3, 0, 0),
  })
  seen.raised.length = 0
})

afterEach(() => {
  for (const one of benches.splice(0, benches.length)) one.restore()
  vi.useRealTimers()
})

function bench(): ShellBench {
  const built = shell(taskGroupDocument(DEEP, { zoomX: 1, zoomY: 1, displayScale: DEFAULT_DISPLAY_SCALE }))
  benches.push(built)
  return built
}

const zoomY = (built: ShellBench): number => built.loop.document().documentSettings.zoomY as number
const press = (built: ShellBench, icon: string): void => built.press('App Header', icon, null)
const isEnabled = (built: ShellBench, icon: string): boolean | undefined =>
  built.last().appHeaderItems.commands.find((one) => one.icon === icon)?.isEnabled

// WHY: the end is reached by pressing the entrance itself, so the scene stands where ZE-2 / ZE-3 put it for this window.
function pressToEnd(built: ShellBench, icon: string): number {
  for (let turn = 0; turn < 60; turn += 1) {
    const before = zoomY(built)
    press(built, icon)
    if (zoomY(built) === before) return before
  }
  throw new Error(`${icon} had not stopped after 60 presses`)
}

describe('DFC-3446 -- control: the seam sees a raised reason', () => {
  it('a startup notice raised on the loop is seen as noticeRaised', () => {
    const built = bench()
    built.loop.raiseStartupNotice('RS-25')
    vi.advanceTimersByTime(0)
    expect(seen.raised).toContain('RS-25')
  })
})

describe('DFC-3446 -- T-260 SE-5 an end press of IC-14 / IC-15 carries no FR-029 reason', () => {
  it.each([
    ['IC-14', 'T-262 ZE-2 lower end', 'min'],
    ['IC-15', 'T-262 ZE-3 ceiling', 'max'],
  ] as const)('%s pressed at the %s: the end message stands, the entrance is faint, and no reason is raised', (icon, _end, word) => {
    const built = bench()
    const stopped = pressToEnd(built, icon)
    seen.raised.length = 0
    const noticesBefore = built.last().notices.length
    press(built, icon)
    expect(zoomY(built), 'premise: the press changed no zoom').toBe(stopped)
    expect(built.last().scaleMessage ?? '', `premise: ${ZE_5_THE_MESSAGE}`).toContain(endWord(word))
    expect(isEnabled(built, icon), SE_5_STILL_FAINT).toBe(false)
    expect(seen.raised, `${SE_5_NO_REASON} (raised: ${JSON.stringify(seen.raised)})`).toEqual([])
    expect(built.last().notices.length, SE_5_NO_REASON).toBe(noticesBefore)
  })
})
