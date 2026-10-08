// DFC-556 spec-only cases: T-028 IN-2 -- with a dependency line armed (AR-4), a place that hits nothing on the Row Area gives the drawing signal (crosshair), the same signal a figure arm gives there; it is never the host default.

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop, type PointerShape } from '../../src/framework/single-html-shell/frame-loop'
import { pointerOf, rowDocument, SCREEN } from '../unit/cr-541-stage'
import { specTable } from './spec-table'

const IN_2_DRAWING_SIGNAL = '構えているときは作図の合図（閲覧環境の `crosshair`）'
const IN_2_DEPENDENCY_EMPTY = '何にも当たらない場所は作図の合図とすること（MUST）'
const DRAWING_SIGNAL = 'crosshair'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-109, T-023b
const entranceOfArm = (arm: string): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes(arm))
  if (found === undefined) throw new Error(`table T-109 has no entry whose arm is ${arm}`)
  return found.id
}
const FIGURE_ARM_ENTRANCE = entranceOfArm('AR-2')
const DEPENDENCY_ARM_ENTRANCE = entranceOfArm('AR-4')

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  const scope = globalThis as { requestAnimationFrame?: unknown }
  if (realRaf === undefined) delete scope.requestAnimationFrame
  else scope.requestAnimationFrame = realRaf
})

interface Bench {
  readonly loop: FrameLoop
  arm(entrance: string): void
  shapeAtEmptyRowArea(): PointerShape | null
}

const ROW = 'dddddddd-0000-4000-8000-00000000000d'

function bench(): Bench {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const frames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let part: ScreenPart | null = null
  const surface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  const shown: (PointerShape | null)[] = []
  const loop = frameLoop(
    { showSvg: () => undefined } as never,
    rowDocument([{ id: ROW, parentId: null }]) as never,
    SCREEN,
    { surface, language: 'ja' },
    undefined,
    (shape) => {
      shown.push(shape)
    },
  )
  frames()
  const send = (kind: 'down' | 'up' | 'move', x: number, y: number): void => {
    loop.receiveInput(pointerOf(kind, x, y))
    frames()
  }
  return {
    loop,
    arm: (entrance) => {
      part = {
        part: 'Command Palette',
        entry: entrance,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart
      send('down', 80, 120)
      send('up', 80, 120)
      part = null
    },
    shapeAtEmptyRowArea: () => {
      const area = loop.current()?.regions.rowArea
      if (area === undefined) throw new Error('the loop has run no frame')
      shown.length = 0
      send('move', area.x + area.width - 40, area.y + area.height - 40)
      if (shown.length === 0) throw new Error('the loop was never asked what shape the pointer takes')
      return shown[shown.length - 1] ?? null
    },
  }
}

describe('DFC-556 -- the manuscript these cases are driven by', () => {
  it('T-028 IN-2: an armed pointer is the drawing signal, and the armed dependency line names the empty place', () => {
    const cells = rowOf('T-028', 'IN-2').cells.join(' ')
    expect(cells).toContain(IN_2_DRAWING_SIGNAL)
    expect(cells).toContain(IN_2_DEPENDENCY_EMPTY)
  })

  it('T-109: one entrance arms a figure (AR-2) and one arms a dependency line (AR-4)', () => {
    expect(FIGURE_ARM_ENTRANCE).not.toBe(DEPENDENCY_ARM_ENTRANCE)
  })
})

describe('DFC-556 -- IN-2 on a place that hits nothing on the Row Area', () => {
  it('control: with nothing armed the place gives a shape other than the drawing signal (PTD-5 is a range selection)', () => {
    const built = bench()
    expect(built.shapeAtEmptyRowArea()).not.toBe(DRAWING_SIGNAL)
  })

  it('control: with a figure armed (AR-2) the place gives the drawing signal', () => {
    const built = bench()
    built.arm(FIGURE_ARM_ENTRANCE)
    expect(built.shapeAtEmptyRowArea()).toBe(DRAWING_SIGNAL)
  })

  it('with a dependency line armed (AR-4) the place gives the drawing signal, not the host default', () => {
    const built = bench()
    built.arm(DEPENDENCY_ARM_ENTRANCE)
    const shape = built.shapeAtEmptyRowArea()
    expect(shape, 'IN-2: a null leaves the host default').not.toBeNull()
    expect(shape).toBe(DRAWING_SIGNAL)
  })
})
