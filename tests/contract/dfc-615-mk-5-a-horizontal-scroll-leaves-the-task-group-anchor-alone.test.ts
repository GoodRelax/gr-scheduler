// DFC-615 spec-only cases: T-023 MK-5 -- Ctrl + Shift + wheel scrolls sideways only; the task group the view starts at, and the part of it, stay put at every display scale.

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import { DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'
import { REQUIREMENTS, taskGroupDocument, shell, type TaskGroupSeed, type ShellBench } from '../unit/cr-541-stage'

// see MK-5
const MK_5_ROW = '| MK-5 | Ctrl ＋ Shift ＋ ホイール | 横スクロール | — |'

const TASK_GROUP_COUNT = 60
const SEATED_TASK_GROUP = 'task-group-20'
const SEATED_TASK_GROUP_PART = 0.3
const NOTCHES = 12

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const rows = (): TaskGroupSeed[] =>
  Array.from({ length: TASK_GROUP_COUNT }, (_unused, index) => ({ id: `task-group-${index + 1}`, parentId: null }))

const bench = (displayScale: number, zoomY: number): ShellBench => {
  const built = shell(
    taskGroupDocument(rows(), { displayScale, zoomY, scrollGroupId: SEATED_TASK_GROUP, scrollGroupOffset: SEATED_TASK_GROUP_PART }),
  )
  benches.push(built)
  return built
}

const sidewaysWheel = (built: ShellBench, direction: 1 | -1): HumanInput => {
  const area = built.loop.current()?.regions.taskGroupArea
  if (area === undefined) throw new Error('premise: a frame was drawn')
  return {
    kind: 'wheel',
    x: area.x + area.width / 2,
    y: area.y + area.height / 2,
    modifiers: { ctrl: true, shift: true, alt: false, meta: false },
    notches: direction,
    scrollPx: { x: 0, y: direction * 100 },
  }
}

const settingsOf = (built: ShellBench) => built.loop.document().documentSettings as unknown as Record<string, unknown>

describe('DFC-615 premise -- the clause these cases press still stands', () => {
  it(MK_5_ROW, () => {
    expect(REQUIREMENTS).toContain(MK_5_ROW)
  })
})

describe('T-023 MK-5 -- a sideways scroll leaves the task group anchor where it was', () => {
  it.each(DISPLAY_SCALE_STEPS.flatMap((scale) => [1, 0.5, 2.5].map((zoomY) => [scale, zoomY] as const)))(
    'display scale %d, zoomY %d: every notch moves the date and none moves the task group or the place inside it',
    (scale, zoomY) => {
      const built = bench(scale, zoomY)
      const start = { ...settingsOf(built) }
      const seen = new Set<unknown>()
      for (const direction of [1, -1] as const) {
        for (let notch = 0; notch < NOTCHES; notch++) {
          built.send(sidewaysWheel(built, direction))
          const now = settingsOf(built)
          expect(now['scrollGroupId'], MK_5_ROW).toBe(start['scrollGroupId'])
          expect(now['scrollGroupOffset'], MK_5_ROW).toBe(start['scrollGroupOffset'])
          seen.add(`${String(now['scrollDate'])}/${String(now['scrollDayOffset'])}`)
        }
      }
      expect(seen.size, 'premise: the sideways scroll moved the view across').toBeGreaterThan(1)
    },
  )
})
