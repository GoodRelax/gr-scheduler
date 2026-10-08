// DFC-2301 guard: a pan (PTD-1) asks the IC-12..IC-15 ends no more, and a zoom still moves them (FR-029).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import { pointerOf } from '../unit/cr-541-stage'
import { paletteStage, surfaceOfEntrance, type PaletteStage } from './wp-p1-palette-stage'

const asked = vi.hoisted(() => ({ count: 0 }))

vi.mock('../../src/adapter/input-command-translator/zoom-and-fit', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/adapter/input-command-translator/zoom-and-fit')>()
  return {
    ...original,
    zoomEntranceEndsOf: (...args: Parameters<typeof original.zoomEntranceEndsOf>) => {
      asked.count += 1
      return original.zoomEntranceEndsOf(...args)
    },
  }
})

const TIME_OUT = 'IC-12'
const TIME_IN = 'IC-13'
const PAN_FROM = { x: 760, y: 420 }
const PAN_STEPS = 12
const PAN_STEP_PX = 9

const CTRL = { ctrl: true }

const send = async (built: PaletteStage, input: HumanInput): Promise<void> => {
  await built.key(input as never)
}

const placeOf = (built: PaletteStage) => {
  const settings = built.loop.document().documentSettings
  return [settings.scrollDate, settings.scrollDayOffset, settings.scrollGroupId, settings.scrollGroupOffset]
}

async function pan(built: PaletteStage): Promise<void> {
  await send(built, pointerOf('down', PAN_FROM.x, PAN_FROM.y, CTRL))
  for (let step = 1; step <= PAN_STEPS; step += 1) {
    await send(built, pointerOf('move', PAN_FROM.x - step * PAN_STEP_PX, PAN_FROM.y - step * PAN_STEP_PX, CTRL))
  }
  await send(built, pointerOf('up', PAN_FROM.x - PAN_STEPS * PAN_STEP_PX, PAN_FROM.y - PAN_STEPS * PAN_STEP_PX, CTRL))
}

const isEnabled = (built: PaletteStage, icon: string): boolean => {
  const found = built.last().appHeaderItems.commands.filter((one) => one.icon === icon)
  if (found.length !== 1) throw new Error(`the App Header carries ${found.length} items for ${icon}`)
  return (found[0] as { isEnabled: boolean }).isEnabled
}

describe('DFC-2301 -- a pan keeps the IC-12..IC-15 ends without asking them again', () => {
  beforeEach(() => {
    asked.count = 0
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('control: the stage draws the ends at least once', async () => {
    await paletteStage()
    expect(asked.count).toBeGreaterThan(0)
  })

  it('a pan moves the view place and asks the ends no more once the place is stored', async () => {
    const built = await paletteStage()
    await pan(built)
    const before = placeOf(built)
    const states = [TIME_OUT, TIME_IN].map((icon) => isEnabled(built, icon))
    asked.count = 0
    await pan(built)
    expect(placeOf(built), 'precondition: the Ctrl drag panned nothing').not.toEqual(before)
    expect(asked.count).toBe(0)
    expect([TIME_OUT, TIME_IN].map((icon) => isEnabled(built, icon))).toEqual(states)
  })

  it('a zoom to the time-axis end still turns IC-12 faint, and a pan afterwards keeps it faint', async () => {
    const built = await paletteStage()
    for (let press = 0; press < 80 && isEnabled(built, TIME_OUT); press += 1) {
      await built.press(surfaceOfEntrance(TIME_OUT), TIME_OUT)
    }
    expect(isEnabled(built, TIME_OUT), 'IC-12 never reached its end').toBe(false)
    await pan(built)
    expect(isEnabled(built, TIME_OUT)).toBe(false)
    await built.press(surfaceOfEntrance(TIME_IN), TIME_IN)
    expect(isEnabled(built, TIME_OUT)).toBe(true)
  })
})
