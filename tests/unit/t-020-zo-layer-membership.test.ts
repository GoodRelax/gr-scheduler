// T-020: which data-zo layer group each drawn element belongs to.
import { describe, expect, it } from 'vitest'

import { cellOf, day, sceneOf, taskOf } from './cr-430-cross-section-scene'

const ELEMENT = '要素'

const says = (row: string): string => `T-020 ${row}: ${cellOf('T-020', row, ELEMENT)}`

interface Span {
  readonly start: number
  readonly end: number
}

function spanOf(svg: string, zo: string): Span {
  const open = new RegExp(`<g\\b[^>]*\\bdata-zo="${zo}"[^>]*>`).exec(svg)
  if (open === null) throw new Error(`table T-020 ${zo}: no such group in this picture`)
  const tag = /<g\b[^>]*>|<\/g>/g
  tag.lastIndex = open.index + open[0].length
  let depth = 1
  let hit: RegExpExecArray | null = tag.exec(svg)
  while (hit !== null) {
    depth += hit[0] === '</g>' ? -1 : 1
    if (depth === 0) return { start: open.index, end: hit.index + hit[0].length }
    hit = tag.exec(svg)
  }
  throw new Error(`table T-020 ${zo}: the group opened at ${open.index} never closes`)
}

const isIn = (at: number, span: Span): boolean => at >= span.start && at < span.end

interface Element {
  readonly tag: string
  readonly at: number
  readonly text: string
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const scan = /<([a-zA-Z][\w-]*)\b[^>]*>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    out.push({ tag: hit[1] as string, at: hit.index, text: hit[0] })
    hit = scan.exec(svg)
  }
  return out
}

const attribute = (text: string, name: string): string | null => {
  const hit = new RegExp(`\\b${name}="([^"]*)"`).exec(text)
  return hit === null ? null : (hit[1] as string)
}

const numberAttr = (element: Element, name: string): number => Number(attribute(element.text, name))

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

const boxOf = (element: Element): Box | null => {
  if (element.tag === 'rect') {
    const x = numberAttr(element, 'x')
    const y = numberAttr(element, 'y')
    const w = numberAttr(element, 'width')
    const h = numberAttr(element, 'height')
    if (![x, y, w, h].every(Number.isFinite)) return null
    return { x0: x, x1: x + w, y0: y, y1: y + h }
  }
  if (element.tag === 'polygon' || element.tag === 'polyline') {
    const stated = attribute(element.text, 'points')
    if (stated === null) return null
    const found = (stated.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    if (found.length < 4) return null
    const xs = found.filter((_, i) => i % 2 === 0)
    const ys = found.filter((_, i) => i % 2 === 1)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }
  return null
}

const shapesOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter((one) => one.tag !== 'g' && one.tag !== 'svg')

const settledText = (element: Element): string => element.text.replace(/(id="|url\(#)[^"')]*/g, '$1')

const onlyIn = (picture: string, other: string): readonly Element[] => {
  const there = shapesOf(other).map(settledText)
  return shapesOf(picture).filter((one) => !there.includes(settledText(one)))
}

describe(`${says('ZO-2')} (PND-209)`, () => {
  it('T-020 ZO-2: the dummy of a Task with no actual is inside the ZO-2 group, not ZO-1', () => {
    const scene = sceneOf({
      tasks: [taskOf({ uid: 1, name: 'Solo', start: day(2), finish: day(6) })],
      shapeKind: 'rectangle',
    })
    const dummies = scene.taskOf(1).dummies
    expect(
      dummies.length,
      'table T-240 DM-1: a Task with no actual is drawn one dummy, at the plan start',
    ).toBeGreaterThan(0)
    const ink = dummies[0]!.ink
    const svg = scene.svg()
    const near = (a: number, b: number): boolean => Math.abs(a - b) <= 0.5
    const onTheDummy = shapesOf(svg).filter((one) => {
      const box = boxOf(one)
      return (
        box !== null &&
        near(box.x0, ink.x) &&
        near(box.y0, ink.y) &&
        near(box.x1 - box.x0, ink.width) &&
        near(box.y1 - box.y0, ink.height)
      )
    })
    expect(
      onTheDummy.length,
      'no element of the picture stands on the box the geometry gave the dummy (ink)',
    ).toBeGreaterThan(0)
    const zo2 = spanOf(svg, 'ZO-2')
    for (const one of onTheDummy) {
      expect(isIn(one.at, zo2), says('ZO-2')).toBe(true)
    }
    const zo1 = spanOf(svg, 'ZO-1')
    for (const one of onTheDummy) {
      expect(isIn(one.at, zo1), 'ZO-2 (dummy) must not be ZO-1 (plan bar)').toBe(false)
    }
  })
})

const HIGHLIGHT_BOX = {
  id: 'h1',
  startDate: '2026-03-05',
  endDate: '2026-03-20',
  topGroupId: 'g1',
  bottomGroupId: 'g1',
  strokeColor: null,
  cornerRadiusPx: null,
}

const COMMENT_BOX = {
  id: 'c1',
  leaderShapeKind: 'calloutBox',
  text: 'a note',
  anchorDate: '2026-03-10',
  anchorGroupId: 'g1',
  bodyOffsetPx: { dx: 40, dy: -30 },
}

describe(`${says('ZO-8')} / ${says('ZO-9')} (PND-238)`, () => {
  const anchorTask = () => taskOf({ uid: 1, name: 'Anchor', start: day(2), finish: day(24) })

  const bothBoxes = sceneOf({
    tasks: [anchorTask()],
    highlightBoxes: [HIGHLIGHT_BOX],
    commentBoxes: [COMMENT_BOX],
  })
  const noHighlight = sceneOf({ tasks: [anchorTask()], commentBoxes: [COMMENT_BOX] })
  const noComment = sceneOf({ tasks: [anchorTask()], highlightBoxes: [HIGHLIGHT_BOX] })

  it('T-020 ZO-8: the highlight box frame is inside ZO-8, not ZO-9', () => {
    const svg = bothBoxes.svg()
    const added = onlyIn(svg, noHighlight.svg())
    expect(
      added.length,
      'the highlight box drew nothing new against the comment-only picture',
    ).toBeGreaterThan(0)
    const zo8 = spanOf(svg, 'ZO-8')
    const zo9 = spanOf(svg, 'ZO-9')
    for (const one of added) {
      expect(isIn(one.at, zo8), says('ZO-8')).toBe(true)
      expect(isIn(one.at, zo9), 'ZO-8 (highlight frame) must not be ZO-9 (comment box)').toBe(false)
    }
  })

  it('T-020 ZO-9: the comment box is inside ZO-9, not ZO-8', () => {
    const svg = bothBoxes.svg()
    const added = onlyIn(svg, noComment.svg())
    expect(
      added.length,
      'the comment box drew nothing new against the highlight-only picture',
    ).toBeGreaterThan(0)
    const zo8 = spanOf(svg, 'ZO-8')
    const zo9 = spanOf(svg, 'ZO-9')
    for (const one of added) {
      expect(isIn(one.at, zo9), says('ZO-9')).toBe(true)
      expect(isIn(one.at, zo8), 'ZO-9 (comment box) must not be ZO-8 (highlight frame)').toBe(false)
    }
  })
})

describe(`${says('ZO-8')} (PND-312, table T-029 CU-2)`, () => {
  it('T-020 ZO-8: the dual cursor pair is inside ZO-8, below ZO-3 and ZO-5', () => {
    const inProgress = () =>
      taskOf({
        uid: 1,
        name: 'Anchor',
        start: day(2),
        finish: day(24),
        actualStart: day(2),
        percentComplete: 40,
      })
    const withCursor = sceneOf({
      tasks: [inProgress()],
      settings: { dualCursor: { date1: day(6), date2: day(14) }, progressMarkerVisible: true },
    })
    const withoutCursor = sceneOf({ tasks: [inProgress()], settings: { progressMarkerVisible: true } })
    const svg = withCursor.svg()
    const added = onlyIn(svg, withoutCursor.svg())
    expect(added.length, 'table T-029 CU-2: a set dualCursor drew nothing new').toBeGreaterThan(0)
    const zo8 = spanOf(svg, 'ZO-8')
    const zo3 = spanOf(svg, 'ZO-3')
    const zo5 = spanOf(svg, 'ZO-5')
    for (const one of added) {
      expect(isIn(one.at, zo8), says('ZO-8')).toBe(true)
      expect(isIn(one.at, zo3), 'ZO-8 (dual cursor) must not be ZO-3 (progress marker)').toBe(false)
      expect(isIn(one.at, zo5), 'ZO-8 (dual cursor) must not be ZO-5 (name label)').toBe(false)
    }
    expect(zo8.end, 'table T-020: ZO-8 (rank 6) is entirely behind ZO-3 (rank 7)').toBeLessThanOrEqual(
      zo3.start,
    )
  })
})

describe(`${says('ZO-6')} (PND-363, table T-023c SL-3)`, () => {
  it('T-020 ZO-6: the held range-selection rectangle is inside ZO-6, after ZO-12', () => {
    const scene = sceneOf({
      tasks: [taskOf({ uid: 1, name: 'Anchor', start: day(2), finish: day(24) })],
    })
    const watermark = { openedBy: 'a reader', stampedAt: '2026-03-01T00:00:00' }
    const held = scene.svg({ marquee: { x: 300, y: 95, width: 120, height: 40 }, watermark })
    const released = scene.svg({ marquee: null, watermark })
    const added = onlyIn(held, released).filter((one) => one.tag === 'rect')
    expect(added.length, 'table T-023c SL-3: the held picture added no rectangle').toBe(1)
    const rect = added[0]!
    const zo6 = spanOf(held, 'ZO-6')
    const zo12 = spanOf(held, 'ZO-12')
    expect(isIn(rect.at, zo6), says('ZO-6')).toBe(true)
    expect(
      rect.at,
      'table T-020: ZO-6 (range-selection rectangle, rank 13) comes after ZO-12 (watermark, rank 12)',
    ).toBeGreaterThanOrEqual(zo12.end)
  })
})
