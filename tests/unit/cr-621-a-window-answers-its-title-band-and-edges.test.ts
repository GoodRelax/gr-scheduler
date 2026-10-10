// CR-621: every window answers GR-24 (title band) and GR-25 (edges) the same way, and an entrance or a part in front answers alone.

import { describe, expect, it } from 'vitest'

import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { NOT_STORED_HELP_SIZES, SCREEN_Z_ORDER_ATTRIBUTE } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  WINDOW_GRAB_ATTRIBUTE,
  windowPartAt,
  windowPartOf,
  type PlacedWindow,
} from '../../src/framework/dom-screen-surface/window-frame-drawing'

class FakeNode {
  constructor(
    private readonly attributes: Readonly<Record<string, string>>,
    readonly parentElement: FakeNode | null,
  ) {}

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  contains(other: FakeNode): boolean {
    for (let node: FakeNode | null = other; node !== null; node = node.parentElement) if (node === this) return true
    return false
  }
}

const asElement = (node: FakeNode | null): Element | null => node as unknown as Element | null

const BOX = { x: 100, y: 100, width: 400, height: 300 }

const RANGE = { x: 0, y: 0, width: 1000, height: 800 }

const REACH = NOT_STORED_HELP_SIZES['S-426']

const placedAs = (shown: PlacedWindow['shown']): PlacedWindow => ({
  window: 'searchPanel',
  shown,
  place: BOX,
  box: BOX,
  range: RANGE,
})

const WINDOW_LAYER = new FakeNode({ [SCREEN_Z_ORDER_ATTRIBUTE]: 'UZ-6' }, null)

const WINDOW = new FakeNode({}, WINDOW_LAYER)

const TITLE_ROW = new FakeNode({ [WINDOW_GRAB_ATTRIBUTE]: 'true' }, WINDOW)

const TITLE_WORD = new FakeNode({}, TITLE_ROW)

const BODY_CELL = new FakeNode({}, WINDOW)

const FRONT_LAYER = new FakeNode({ [SCREEN_Z_ORDER_ATTRIBUTE]: 'UZ-1' }, null)

const FRONT_PART = new FakeNode({}, FRONT_LAYER)

const PART_OF_WINDOW: ScreenPart = windowPartOf('U-64')

const answerAt = (shown: PlacedWindow['shown'], x: number, y: number, first: FakeNode | null, walked: ScreenPart | null = null) =>
  windowPartAt(asElement(WINDOW), placedAs(shown), { x, y, first: asElement(first), walked }, PART_OF_WINDOW)

describe('CR-621 one frame for every window (GR-24, GR-25, WB-8, WB-9)', () => {
  it('a press on the title band of a normal window grabs it to move (GR-24)', () => {
    expect(answerAt('normal', 200, 110, TITLE_WORD)?.windowGrab).toMatchObject({ window: 'searchPanel', region: 'titleBand', windowBox: BOX })
  })

  it('a minimized window still moves by its title band, but has no edge (WB-2, GR-25)', () => {
    expect(answerAt('minimized', 200, 110, TITLE_WORD)?.windowGrab?.region).toBe('titleBand')
    expect(answerAt('minimized', BOX.x + BOX.width + REACH - 1, 200, null)).toBeNull()
  })

  it('a point just outside the right edge of a normal window grabs that edge, and the floor is S-423 x S-424', () => {
    const grab = answerAt('normal', BOX.x + BOX.width + REACH - 1, 200, null)?.windowGrab
    expect(grab).toMatchObject({
      region: 'right',
      floor: { width: NOT_STORED_HELP_SIZES['S-423'], height: NOT_STORED_HELP_SIZES['S-424'] },
    })
  })

  it('a corner grabs both sides (GR-25)', () => {
    expect(answerAt('normal', BOX.x + 1, BOX.y + BOX.height - 1, BODY_CELL)?.windowGrab?.region).toBe('bottomLeft')
  })

  it('a maximized window neither moves nor resizes (WB-3)', () => {
    expect(answerAt('maximized', 200, 110, TITLE_WORD)?.windowGrab).toBeUndefined()
    expect(answerAt('maximized', BOX.x + BOX.width + REACH - 1, 200, null)).toBeNull()
  })

  it('a point inside the body away from the edges is the window, not a grab', () => {
    const answer = answerAt('normal', 300, 250, BODY_CELL)
    expect(answer?.part).toBe('U-64')
    expect(answer?.windowGrab).toBeUndefined()
  })

  it('an entrance answers alone, even on the title band', () => {
    const entrance: ScreenPart = { ...windowPartOf('U-64'), entry: 'IC-52' }
    expect(answerAt('normal', 200, 110, TITLE_WORD, entrance)).toBe(entrance)
  })

  it('a part drawn in front of the window answers alone, even over its edge (T-337)', () => {
    const front = windowPartOf('U-1')
    expect(answerAt('normal', BOX.x + BOX.width + REACH - 1, 200, FRONT_PART, front)).toBe(front)
  })

  it('no window drawn answers what the walk found', () => {
    const walked = windowPartOf('U-1')
    expect(windowPartAt(null, null, { x: 0, y: 0, first: null, walked }, PART_OF_WINDOW)).toBe(walked)
  })
})
