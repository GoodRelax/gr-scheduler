// CR-772 spec-only cases: through the frame loop, one drag writes once and undoes in one step, Esc writes nothing, and the edges and the wheel send the panel (HF-15).

import { afterEach, describe, expect, it, vi } from 'vitest'

import { numberIn, rowOf } from '../unit/cr-541-stage'
import { COUNT, idOf, key, shell, wheel, type Shell } from './cr-772-shell-stage'

const S_208 = numberIn(rowOf('T-206', 'S-208').by['既定'] ?? '')
const S_597 = numberIn(rowOf('T-206', 'S-597').by['既定'] ?? '')
const PAST = S_208 + 3
const FIRST = idOf(0)

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  vi.restoreAllMocks()
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

const rootsOf = (built: Shell): readonly string[] =>
  (built.loop.document().schedule.taskGroups as unknown as { id: string; parentId: string | null; order: number }[])
    .filter((one) => one.parentId === null)
    .sort((a, b) => a.order - b.order)
    .map((one) => one.id)

const scrollOf = (built: Shell): unknown => {
  const settings = built.loop.document().documentSettings
  return { id: settings.scrollTaskGroupId, offset: settings.scrollTaskGroupFraction }
}

const firstShown = (built: Shell): string | undefined => built.lastView().taskGroupPanel?.titles[0]?.taskGroupId

const ORIGINAL = Array.from({ length: COUNT }, (_one, at) => idOf(at))

function carry(built: Shell, id: string): { x: number; y: number } {
  const at = built.press(id)
  built.move(at.x + 2, at.y + PAST)
  return at
}

describe('HF-15 -- one drag writes once, and one undo takes it back', () => {
  it('a task group carried to another gap and let go stands there; one Ctrl+Z puts it back', () => {
    const built = shell()
    const home = built.stripPoint(idOf(2))
    const target = built.stripPoint(idOf(6)).y - 2
    built.press(idOf(2))
    built.move(home.x + 2, home.y + PAST)
    built.move(home.x + 2, target)
    built.release(home.x + 2, target)
    const moved = rootsOf(built)
    expect(moved.indexOf(idOf(2))).toBe(5)
    expect(moved).not.toEqual(ORIGINAL)
    built.send(key('Z', { ctrl: true }))
    expect(rootsOf(built)).toEqual(ORIGINAL)
  })

  it('Esc while carrying writes nothing, and the release after it writes nothing', () => {
    const built = shell()
    const at = carry(built, idOf(2))
    built.move(at.x + 2, built.stripPoint(idOf(8)).y)
    built.send(key('Esc'))
    built.release(at.x + 2, built.stripPoint(idOf(8)).y)
    expect(rootsOf(built)).toEqual(ORIGINAL)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('a release before the travel passes S-208 only chooses the task group', () => {
    const built = shell()
    const at = built.press(idOf(2))
    built.release(at.x + 1, at.y + 1)
    expect(rootsOf(built)).toEqual(ORIGINAL)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    expect(built.lastView().taskGroupPanel?.titles.find((one) => one.taskGroupId === idOf(2))?.isSelected).toBe(true)
  })

  it('a release where it stood writes nothing', () => {
    const built = shell()
    const at = carry(built, idOf(2))
    built.release(at.x + 2, at.y + PAST)
    expect(rootsOf(built)).toEqual(ORIGINAL)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})

describe('HF-15 -- the panel is sent from the edges while a task group is carried', () => {
  const clockAt = (ms: number): void => void vi.spyOn(performance, 'now').mockReturnValue(ms)

  it('in the band at the bottom edge the panel scrolls, the stored place stays until the release, and the release writes it once', () => {
    const built = shell()
    clockAt(1000)
    const at = carry(built, idOf(2))
    const area = built.area()
    const bottom = area.y + area.height - 2
    const before = scrollOf(built)
    expect(firstShown(built)).toBe(FIRST)
    built.move(at.x + 2, bottom)
    clockAt(1500)
    built.move(at.x + 2, bottom)
    clockAt(2000)
    built.move(at.x + 2, bottom)
    expect(firstShown(built)).not.toBe(FIRST)
    expect(scrollOf(built)).toEqual(before)
    const shown = firstShown(built)
    built.release(at.x + 2, bottom)
    expect(scrollOf(built)).not.toEqual(before)
    expect(firstShown(built)).toBe(shown)
  })

  it('Esc discards the scroll the carry turned', () => {
    const built = shell()
    clockAt(1000)
    const at = carry(built, idOf(2))
    const area = built.area()
    const bottom = area.y + area.height - 2
    const before = scrollOf(built)
    built.move(at.x + 2, bottom)
    clockAt(2000)
    built.move(at.x + 2, bottom)
    expect(firstShown(built)).not.toBe(FIRST)
    built.send(key('Esc'))
    built.release(at.x + 2, bottom)
    expect(scrollOf(built)).toEqual(before)
    expect(rootsOf(built)).toEqual(ORIGINAL)
  })

  it('inside the panel, deeper than S-597 from the edge, time passing does not scroll', () => {
    const built = shell()
    clockAt(1000)
    const at = carry(built, idOf(2))
    const area = built.area()
    const inner = area.y + area.height - S_597 - 8
    built.move(at.x + 2, inner)
    clockAt(3000)
    built.move(at.x + 2, inner)
    expect(firstShown(built)).toBe(FIRST)
  })
})

describe('HF-15 -- the wheel sends the panel while a task group is held, and the drop is chosen again', () => {
  it('turns the rows, keeps the line drawn, and the release writes the place the screen showed', () => {
    const built = shell()
    const at = carry(built, idOf(2))
    const middle = built.area().y + built.area().height / 2
    built.move(at.x + 2, middle)
    expect(built.lastView().taskGroupPanel?.dropCue).not.toBeNull()
    const before = scrollOf(built)
    built.send(wheel(at.x + 2, middle, 400))
    expect(firstShown(built)).not.toBe(FIRST)
    expect(scrollOf(built)).toEqual(before)
    const cue = built.lastView().taskGroupPanel?.dropCue
    expect(cue).not.toBeNull()
    expect(cue?.lineY).toBeGreaterThan(built.area().y - 1)
    expect(cue?.lineY).toBeLessThan(built.area().y + built.area().height + 1)
    const shown = firstShown(built)
    built.release(at.x + 2, middle)
    expect(scrollOf(built)).not.toEqual(before)
    expect(firstShown(built)).toBe(shown)
  })
})
