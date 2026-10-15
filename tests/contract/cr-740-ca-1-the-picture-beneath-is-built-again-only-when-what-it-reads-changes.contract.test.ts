// CR-740 from docs/spec only: T-071 CA-1 (3) holds the picture beneath while what it reads is the same, and never holds the export picture.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { partNameOf, pointer, restoreAnimationFrame, stage, wholeRow, type Point, type Stage } from './cr-740-stage'

vi.mock('../../src/adapter/svg-renderer/svg-renderer', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/adapter/svg-renderer/svg-renderer')>()
  return { ...real, svgFromSchedule: vi.fn(real.svgFromSchedule) }
})

const built = vi.mocked(svgFromSchedule)

const PICTURE_ARGUMENT = 6

/** @purity non-pure */
function picturesBuilt(picture: 'screen' | 'export'): number {
  return built.mock.calls.filter((one) => one[PICTURE_ARGUMENT] === picture).length
}

/** @purity non-pure */
function screenBuildsDuring(run: () => void): number {
  const before = picturesBuilt('screen')
  run()
  return picturesBuilt('screen') - before
}

const CA_1 = wholeRow('T-071', 'CA-1')
const CA_1_KEY = '鍵は下の絵が読むものであり、どれかが変わったフレームで組み直す'
const CA_1_NOT_THE_POINTER = '指の位置そのものを鍵に入れてはならない（MUST NOT）'
const CA_1_KEY_IS_ALL = '鍵に入れたものだけが絵に効くこと（MUST）'
const CA_1_NO_EXPORT = '書き出し（FR-080）の絵は覚えない'

beforeEach(() => {
  built.mockClear()
})

afterEach(restoreAnimationFrame)

describe('CR-740 the manuscript these cases are driven by', () => {
  it.each([
    CA_1_KEY,
    CA_1_NOT_THE_POINTER,
    CA_1_KEY_IS_ALL,
    CA_1_NO_EXPORT,
    '下の絵の SVG 文字列（表 T-065 の IF-1）',
    'ガイドカーソルの点・指が中にある実績のダミー・指が掴み代に載った進捗マーカー',
    '2 連カーソルの追従',
    '透かし',
    'テーマ',
  ])('T-071 CA-1 (3) holds %s', (clause) => {
    expect(CA_1).toContain(clause)
  })

  it('T-071 CA-2 and CA-4 count the three carry-overs of CA-1 that their own key renews', () => {
    expect(wholeRow('T-071', 'CA-2')).toContain('CA-1 の後段の 3 つはフレームの先頭で作り直さない')
    expect(wholeRow('T-071', 'CA-4')).toContain('CA-1 の後段の 3 つは、本行の外である')
  })
})

/** @purity non-pure */
function settledOn(at: Point): Stage {
  const one = stage()
  one.send(pointer('move', at.x, at.y))
  one.send(pointer('move', at.x, at.y))
  return one
}

describe(`T-071 CA-1 (3) -- the pointer moving over empty ground reads nothing new: ${CA_1_NOT_THE_POINTER}`, () => {
  it('SL-3: while a range selection is held and dragged over ground, svgFromSchedule is not called from the second frame on', () => {
    const one = stage()
    const [from, ...path] = one.ground()
    one.send(pointer('down', from!.x, from!.y))
    one.send(pointer('move', path[0]!.x, path[0]!.y))
    const overlaysBefore = one.calls.filter((call) => call.mouth === 'showMarqueeOverlaySvg').length
    const framesBefore = one.framesRun()
    const builds = screenBuildsDuring(() => {
      for (const at of [...path.slice(1), ...path, ...path.slice().reverse()]) one.send(pointer('move', at.x, at.y))
    })
    expect(one.framesRun(), 'premise: each move ran a frame').toBeGreaterThan(framesBefore)
    expect(
      one.calls.filter((call) => call.mouth === 'showMarqueeOverlaySvg').length,
      'premise: the rectangle moved, so the frames drew something',
    ).toBeGreaterThan(overlaysBefore)
    expect(builds, CA_1_NOT_THE_POINTER).toBe(0)
    one.send(pointer('up', path[0]!.x, path[0]!.y))
  })

  it('the picture the screen is handed stays the same string while it is held', () => {
    const one = stage()
    const ground = one.ground()
    one.send(pointer('move', ground[0]!.x, ground[0]!.y))
    const held = one.beneathNow()
    for (const at of ground) one.send(pointer('move', at.x, at.y))
    expect(one.beneathNow()).toBe(held)
  })
})

describe(`T-071 CA-1 (3) -- ${CA_1_KEY}; ${CA_1_KEY_IS_ALL}`, () => {
  it('FR-048 IC-47: with the guide cursor on, each pointer move builds the picture again and moves the cursor', () => {
    const one = stage()
    const start = one.taskGroupAreaPoint(0.3)
    one.send(pointer('move', start.x, start.y))
    one.press('IC-47')
    one.send(pointer('move', start.x, start.y))
    const before = one.beneathNow()
    for (const share of [0.45, 0.6]) {
      const at = one.taskGroupAreaPoint(share)
      const was = one.beneathNow()
      expect(screenBuildsDuring(() => one.send(pointer('move', at.x, at.y))), 'the guide cursor point changed').toBeGreaterThan(0)
      expect(one.beneathNow(), 'ZO-8: the guide cursor follows the pointer').not.toBe(was)
    }
    expect(one.beneathNow()).not.toBe(before)
  })

  it('FR-043 / FR-013: the pointer entering an actual dummy builds the picture again, and leaving it builds it again', () => {
    const ground = stage().ground()
    const one = settledOn(ground[0]!)
    const onGround = one.beneathNow()
    const dummy = one.alphaDummyPoint()
    expect(screenBuildsDuring(() => one.send(pointer('move', dummy.x, dummy.y))), 'the pointer is now inside the dummy').toBeGreaterThan(0)
    expect(one.beneathNow(), 'FR-013: the dummy is drawn darker while the pointer is on it').not.toBe(onGround)
    expect(screenBuildsDuring(() => one.send(pointer('move', ground[1]!.x, ground[1]!.y))), 'the pointer left the dummy').toBeGreaterThan(0)
    expect(one.beneathNow(), 'no stale picture: back on ground the picture is the ground one').toBe(onGround)
  })

  it('T-023d GA-18 / FR-013: the pointer on the progress marker grab builds the picture again, and leaving it builds it again', () => {
    const ground = stage().ground()
    const one = settledOn(ground[0]!)
    const onGround = one.beneathNow()
    const marker = one.alphaMarkerPoint()
    expect(screenBuildsDuring(() => one.send(pointer('move', marker.x, marker.y))), 'the pointer is now on the marker grab').toBeGreaterThan(0)
    expect(one.beneathNow(), 'FR-013: the marker is drawn darker while the pointer is on it').not.toBe(onGround)
    expect(screenBuildsDuring(() => one.send(pointer('move', ground[1]!.x, ground[1]!.y))), 'the pointer left the marker').toBeGreaterThan(0)
    expect(one.beneathNow()).toBe(onGround)
  })

  it('FR-082 IC-45 / T-029a DC-1: in Dual Cursor mode the following cursor moves with the pointer, and each move builds the picture again', () => {
    const one = stage()
    const start = one.taskGroupAreaPoint(0.3)
    one.send(pointer('move', start.x, start.y))
    one.press('IC-45')
    one.send(pointer('move', start.x, start.y))
    for (const share of [0.45, 0.6]) {
      const at = one.taskGroupAreaPoint(share)
      const was = one.beneathNow()
      expect(screenBuildsDuring(() => one.send(pointer('move', at.x, at.y))), 'the dual cursor follow changed').toBeGreaterThan(0)
      expect(one.beneathNow(), 'DC-1: cursorADate follows the pointer').not.toBe(was)
    }
  })

  it('FR-020 IC-41 / S-144: hiding the watermark builds the picture again, and showing it again gives the first picture', async () => {
    const one = settledOn({ x: 600, y: 20 })
    const shown = one.beneathNow()
    const hiding = picturesBuilt('screen')
    one.press('IC-41')
    one.pressOn({ part: partNameOf('U-60'), confirmationAnswer: 'proceed' })
    // WHY: the U-60 answer is checked by an asynchronous digest; under load one timer turn is not enough.
    await vi.waitFor(() => {
      one.drain()
      expect(picturesBuilt('screen') - hiding, 'the watermark is now hidden').toBeGreaterThan(0)
    }, { timeout: 5000 })
    expect(one.beneathNow(), 'premise: ZO-12 left the picture').not.toBe(shown)
    expect(screenBuildsDuring(() => one.press('IC-41')), 'the watermark is shown again').toBeGreaterThan(0)
    expect(one.beneathNow(), 'ZO-12: the watermark is drawn again').toBe(shown)
  })

  it('FR-039 IC-16: changing the theme builds the picture again, and changing it back gives the first picture', () => {
    const one = settledOn({ x: 600, y: 20 })
    const first = one.beneathNow()
    expect(screenBuildsDuring(() => one.press('IC-16')), 'the theme changed').toBeGreaterThan(0)
    expect(one.beneathNow()).not.toBe(first)
    expect(screenBuildsDuring(() => one.press('IC-16')), 'the theme changed back').toBeGreaterThan(0)
    expect(one.beneathNow()).toBe(first)
  })
})

describe(`T-071 CA-1 (3) -- ${CA_1_NO_EXPORT}`, () => {
  it('FR-080: the export draws its own picture with svgFromSchedule, every time, and it is not the held screen string', () => {
    const one = stage()
    const ground = one.ground()
    one.send(pointer('move', ground[0]!.x, ground[0]!.y))
    one.send(pointer('move', ground[1]!.x, ground[1]!.y))
    const held = one.beneathNow()
    for (let turn = 0; turn < 2; turn += 1) {
      const before = picturesBuilt('export')
      const scene = one.loop.exportScene()
      expect(scene, 'premise: the shell has a scene to export').not.toBeNull()
      expect(picturesBuilt('export') - before, `export ${turn + 1}: the export picture is built, never taken from a hold`).toBeGreaterThan(0)
      expect(scene?.svg, 'T-076 EP-14: the export leaves the dummy out, so it is not the screen picture').not.toBe(held)
    }
  })

  it('an export does not take the place of the held screen picture: the next screen frame with the same inputs builds nothing and shows the screen string', () => {
    const one = stage()
    const ground = one.ground()
    one.send(pointer('move', ground[0]!.x, ground[0]!.y))
    one.send(pointer('move', ground[1]!.x, ground[1]!.y))
    const held = one.beneathNow()
    const scene = one.loop.exportScene()
    const shownBefore = one.calls.length
    const builds = screenBuildsDuring(() => one.send(pointer('move', ground[2]!.x, ground[2]!.y)))
    expect(builds, 'the screen inputs did not change').toBe(0)
    expect(one.beneathNow()).toBe(held)
    expect(one.calls.slice(shownBefore).map((call) => call.svg)).not.toContain(scene?.svg)
  })
})
