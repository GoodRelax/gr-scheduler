// DFC-2131, DFC-640: the arrow head a dependency line is drawn with is the triangle the hit test grabs (S-19, S-300, SWS-3, PI-6).

import { describe, expect, it } from 'vitest'

import { RATIO, day, sceneOf, stored, taskOf, type Pt } from '../unit/cr-430-cross-section-scene'

const PREDECESSOR = 1
const SUCCESSOR = 2

const LINKED = [
  taskOf({ uid: PREDECESSOR, name: 'first', start: day(2), finish: day(6) }),
  taskOf({
    uid: SUCCESSOR,
    name: 'second',
    start: day(10),
    finish: day(14),
    dependencies: [{ predecessorUid: PREDECESSOR, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
  }),
]

interface Triangle {
  readonly base: number
  readonly height: number
}

interface Geometry {
  readonly dependencies: readonly { readonly head?: readonly Pt[] }[]
}

const distance = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)

const triangleOf = (corners: readonly Pt[]): Triangle => {
  const [tip, left, right] = corners as [Pt, Pt, Pt]
  const middle = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
  return { base: distance(left, right), height: distance(tip, middle) }
}

// WHY: the marker is a path of three corners in the marker's own box; that is the only place the drawn triangle is written.
const drawnTriangleOf = (svg: string): Triangle => {
  const marker = /<marker\b[^>]*>[\s\S]*?<\/marker>/.exec(svg)
  if (marker === null) throw new Error('the picture holds no <marker> for the dependency arrow')
  const d = /<path d="([^"]+)"/.exec(marker[0])
  if (d === null) throw new Error('the dependency marker holds no path')
  const corners = [...d[1]!.matchAll(/[ML]\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/g)].map((one) => ({ x: Number(one[1]), y: Number(one[2]) }))
  expect(corners).toHaveLength(3)
  return triangleOf(corners)
}

const heldTriangleOf = (geometry: unknown): Triangle => {
  const head = (geometry as Geometry).dependencies[0]?.head
  if (head === undefined) throw new Error('the dependency geometry carries no head')
  return triangleOf(head)
}

// see T-201
const S_19 = stored('S-19')
const S_300 = stored('S-300')
const SCENE = sceneOf({ tasks: LINKED })

describe('DFC-2131 / DFC-640: the drawn arrow head is the hit-test head (S-19, S-300, SWS-3, PI-6)', () => {
  it('S-300 the drawn base equals the held base', () => {
    expect(drawnTriangleOf(SCENE.svg()).base).toBeCloseTo(heldTriangleOf(SCENE.geometry).base, 1)
  })

  it('S-19 the drawn height equals the held height', () => {
    expect(drawnTriangleOf(SCENE.svg()).height).toBeCloseTo(heldTriangleOf(SCENE.geometry).height, 1)
  })

  it('S-300 the drawn base is S-300 scaled by the display ratio, not S-19 (DFC-2131)', () => {
    expect(drawnTriangleOf(SCENE.svg()).base).toBeCloseTo(S_300 * RATIO, 1)
  })

  it('S-19 the drawn height is S-19 scaled by the display ratio (DFC-2131)', () => {
    expect(drawnTriangleOf(SCENE.svg()).height).toBeCloseTo(S_19 * RATIO, 1)
  })

  it('S-19 / S-300 the height and the base are two values, so the drawn triangle is not square (DFC-2131)', () => {
    const drawn = drawnTriangleOf(SCENE.svg())
    expect(S_19).not.toBe(S_300)
    expect(drawn.base / drawn.height).toBeCloseTo(S_300 / S_19, 2)
  })
})
