// DFC-947: a chosen task whose plan is hidden and whose only drawn figure is the dummy still gets its dashed frame (SL-8, T-240).

import { describe, expect, it } from 'vitest'

import { figuresKeyed } from '../fixtures/svg-selected-scene'
import { day, sceneOf, taskOf, type Rect } from '../unit/cr-430-cross-section-scene'

const NOT_STARTED = taskOf({ uid: 1, name: 'not started', start: day(2), finish: day(8) })

const framesOf = (settings: Readonly<Record<string, unknown>>) => {
  const scene = sceneOf({ tasks: [NOT_STARTED], selectTaskUid: 1, settings })
  const dummies = (scene.geometry as unknown as { tasks: readonly { dummies: readonly { ink: Rect }[] }[] }).tasks[0]?.dummies ?? []
  const frames = figuresKeyed(scene.svg(), 'task-1-frame')
  return { dummies, frames }
}

const rectOf = (attributes: Readonly<Record<string, string>>): Rect => ({
  x: Number(attributes['x']),
  y: Number(attributes['y']),
  width: Number(attributes['width']),
  height: Number(attributes['height']),
})

const TOLERANCE = 0.02

describe('DFC-947: the frame goes round the figures that are drawn, the dummy among them (SL-8, T-240)', () => {
  it('SL-8 premise: with the plan shown a chosen task is framed', () => {
    expect(framesOf({}).frames).toHaveLength(1)
  })

  it('SL-8 premise: with the plan hidden and no actual, only the dummy is drawn', () => {
    const { dummies } = framesOf({ planVisible: false })
    expect(dummies.length).toBeGreaterThan(0)
  })

  it('SL-8 a chosen task with the plan hidden is framed round its dummy (DFC-947)', () => {
    expect(framesOf({ planVisible: false }).frames).toHaveLength(1)
  })

  it('SL-8 the frame of a dummy-only task encloses every drawn dummy (DFC-947)', () => {
    const { dummies, frames } = framesOf({ planVisible: false })
    const frame = rectOf(frames[0] ?? {})
    for (const one of dummies) {
      expect(frame.x).toBeLessThanOrEqual(one.ink.x + TOLERANCE)
      expect(frame.y).toBeLessThanOrEqual(one.ink.y + TOLERANCE)
      expect(frame.x + frame.width).toBeGreaterThanOrEqual(one.ink.x + one.ink.width - TOLERANCE)
      expect(frame.y + frame.height).toBeGreaterThanOrEqual(one.ink.y + one.ink.height - TOLERANCE)
    }
  })
})
