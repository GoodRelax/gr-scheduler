// DFC-722: an empty or null comment body gives a box no smaller than T-215's font size in width and height (FR-097).

import { describe, expect, it } from 'vitest'

import { cellOf, day, sceneOf, taskOf } from '../unit/cr-430-cross-section-scene'

const FONT_SIZE_OF = { S: 'S-121', M: 'S-122', L: 'S-123' } as const

const floorOf = (scale: keyof typeof FONT_SIZE_OF): number => Number(cellOf('T-215', FONT_SIZE_OF[scale], '値').replace(/[^\d.]/g, ''))

const box = (text: string | null) => ({
  id: 'c1',
  leaderShapeKind: 'calloutBox',
  text,
  anchorDate: '2026-03-10',
  anchorGroupId: 'g1',
  bodyOffsetPx: null,
})

interface Body {
  readonly width: number
  readonly height: number
}

const bodyOf = (text: string | null, fontScale: keyof typeof FONT_SIZE_OF): Body => {
  const scene = sceneOf({
    tasks: [taskOf({ uid: 1, name: 'only', start: day(2), finish: day(8) })],
    commentBoxes: [box(text)],
    settings: { fontScale },
  })
  const found = (scene.geometry as unknown as { commentBoxes: readonly { body: Body }[] }).commentBoxes[0]
  if (found === undefined) throw new Error('the comment box was not drawn')
  return found.body
}

describe('DFC-722: an empty or null body is no smaller than the font size (FR-097, T-215)', () => {
  for (const scale of ['S', 'M', 'L'] as const) {
    for (const [name, text] of [['empty', ''], ['null', null]] as const) {
      it(`FR-097 a ${name} body is at least the T-215 font size wide at fontScale ${scale}`, () => {
        expect(bodyOf(text, scale).width).toBeGreaterThanOrEqual(floorOf(scale))
      })

      it(`FR-097 a ${name} body is at least the T-215 font size high at fontScale ${scale}`, () => {
        expect(bodyOf(text, scale).height).toBeGreaterThanOrEqual(floorOf(scale))
      })
    }
  }

  for (const coefficient of [0.3, 1]) {
    it(`FR-097 the floor does not move with S-30 labelCoef ${coefficient} (MUST NOT use a full-width character)`, () => {
      const scene = sceneOf({
        tasks: [taskOf({ uid: 1, name: 'only', start: day(2), finish: day(8) })],
        commentBoxes: [box('')],
        settings: { labelCoef: coefficient },
      })
      const found = (scene.geometry as unknown as { commentBoxes: readonly { body: Body }[] }).commentBoxes[0]
      expect(found?.body.width).toBeGreaterThanOrEqual(floorOf('M'))
    })
  }
})
