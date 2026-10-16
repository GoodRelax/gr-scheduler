// CR-777 spec-only tests: a tip released (GR-14) or a comment placed (AR-5) snaps to a figure point or stands where it was let go.

import { afterEach, describe, expect, it } from 'vitest'

import { commentAnchorAt } from '../../src/adapter/input-command-translator/input-command-translator'
import { restoreAnimationFrames, NO_MODIFIERS } from '../unit/cr-646-stage'
import {
  BAR_UID,
  COMMENT_ID,
  bandOf,
  april,
  columnLeft,
  commentDrawn,
  commentRow,
  commentStored,
  documentWith,
  frameOf,
  groupOf,
  snapsOfFigure,
  stage,
  tipOf,
  type Stage,
} from './cr-777-stage'

afterEach(restoreAnimationFrames)

const FREE_ROW = groupOf(3)
const READ_AT_RELEASE = '`LF-15`）が在れば、そのうち離した点にいちばん近い点へ吸着すること（MUST）'
const FREE_POINT = '。⭐ 吸着する点が無いときは、離した点そのものを自由点として持つこと（MUST）'
const NO_CENTERING = '①）。⛔ 日の列の中央にも、帯の縦の中央にも寄せてはならない（MUST NOT）'
const SHOWN_WHILE_HELD = '点（吸着する点か、ポインタの点）に線先と引出し線と線先の印を描くこと（MUST）'
const READ_WHERE_LET_GO = 'も同じ掴み代で応えること（MUST）。⭐ 線先は離した位置で読むこと（MUST）'

const minutesOf = (text: unknown): number => Date.parse(`${String(text).slice(0, 16)}:00Z`) / 60000

const undo = (built: Stage): void => built.send({ kind: 'key', key: 'Z', modifiers: { ...NO_MODIFIERS, ctrl: true } })

const dragTip = (built: Stage, to: { x: number; y: number }): void => {
  const tip = tipOf(built.loop)
  built.drag(tip.x, tip.y, to.x, to.y)
}

describe(`GR-14: ${READ_AT_RELEASE}`, () => {
  const cornerOfBar = () => {
    const built = stage(documentWith([commentRow()]))
    const corner = snapsOfFigure(built.loop, BAR_UID, 'plannedBar')[0]!
    return { built, corner }
  }

  it('a release 3px from a bar corner writes the figure, the point and the free columns at that point', () => {
    const { built, corner } = cornerOfBar()
    dragTip(built, { x: corner.at.x - 3, y: corner.at.y - 3 })
    const stored = commentStored(built.loop)
    expect([stored.anchorTaskUid, stored.anchorTaskFigure, stored.anchorSnapPoint]).toEqual([BAR_UID, 'plannedBar', 'topLeftCorner'])
    expect(stored.anchorHighlightBoxId).toBeNull()
    expect(stored.anchorTaskGroupId).toBe(groupOf(BAR_UID))
    expect(String(stored.anchorDate).slice(0, 16)).toBe('2026-04-06T00:00')
    const band = bandOf(built.loop, groupOf(BAR_UID))
    expect(band.y + band.height * (stored.anchorBandFraction ?? 0.5)).toBeCloseTo(corner.at.y, 0)
    expect(tipOf(built.loop).x).toBeCloseTo(corner.at.x, 3)
    expect(tipOf(built.loop).y).toBeCloseTo(corner.at.y, 3)
  })

  it('the box stays where it stood on the screen (CM-51), and one undo restores both columns sets', () => {
    const { built, corner } = cornerOfBar()
    const before = structuredClone(built.loop.document().schedule.commentBoxes)
    const bodyBefore = commentDrawn(built.loop)!.body
    dragTip(built, { x: corner.at.x - 3, y: corner.at.y - 3 })
    const bodyAfter = commentDrawn(built.loop)!.body
    expect(bodyAfter.x).toBeCloseTo(bodyBefore.x, 1)
    expect(bodyAfter.y).toBeCloseTo(bodyBefore.y, 1)
    expect(commentStored(built.loop).bodyOffsetPx, 'CM-51 was not written').not.toEqual({ dx: 60, dy: -60 })
    undo(built)
    expect(built.loop.document().schedule.commentBoxes).toEqual(before)
  })

  it(`${SHOWN_WHILE_HELD} -- while it is held the tip is drawn on the point it would snap to`, () => {
    const { built, corner } = cornerOfBar()
    const tip = tipOf(built.loop)
    built.send({ kind: 'pointer', phase: 'down', button: 'left', x: tip.x, y: tip.y, modifiers: { ...NO_MODIFIERS }, clickCount: 1 })
    built.send({ kind: 'pointer', phase: 'move', button: 'left', x: corner.at.x - 3, y: corner.at.y - 3, modifiers: { ...NO_MODIFIERS }, clickCount: 1 })
    expect(commentDrawn(built.loop)!.anchor.x).toBeCloseTo(corner.at.x, 3)
    expect(commentDrawn(built.loop)!.anchor.y).toBeCloseTo(corner.at.y, 3)
  })

  it('a release 3px from a milestone point snaps to the milestone figure', () => {
    const built = stage(documentWith([commentRow()]))
    const point = snapsOfFigure(built.loop, 2, 'milestone')[3]!
    dragTip(built, { x: point.at.x + 3, y: point.at.y })
    const stored = commentStored(built.loop)
    expect([stored.anchorTaskUid, stored.anchorTaskFigure, stored.anchorSnapPoint]).toEqual([2, 'milestone', 'rightMiddle'])
  })
})

describe(`GR-14: ${FREE_POINT} / ${NO_CENTERING}`, () => {
  it('a release away from every point writes the instant and the height of the release point', () => {
    const built = stage(documentWith([commentRow()]))
    const band = bandOf(built.loop, FREE_ROW)
    const perDay = frameOf(built.loop).layout.pxPerDay
    const to = { x: columnLeft(built.loop, april(27)) + 0.25 * perDay, y: band.y + 0.3 * band.height }
    dragTip(built, to)
    const stored = commentStored(built.loop)
    expect([stored.anchorTaskUid, stored.anchorTaskFigure, stored.anchorHighlightBoxId, stored.anchorSnapPoint]).toEqual([null, null, null, null])
    expect(stored.anchorTaskGroupId).toBe(FREE_ROW)
    expect(Math.abs(minutesOf(stored.anchorDate) - minutesOf(april(27, '06:00:00')))).toBeLessThanOrEqual(2)
    expect(stored.anchorBandFraction ?? Number.NaN).toBeCloseTo(0.3, 2)
    expect(tipOf(built.loop).x).toBeCloseTo(to.x, 0)
    expect(tipOf(built.loop).y).toBeCloseTo(to.y, 0)
  })

  it('the point is not pulled to the middle of the day column or of the band', () => {
    const built = stage(documentWith([commentRow()]))
    const band = bandOf(built.loop, FREE_ROW)
    const to = { x: columnLeft(built.loop, april(27)) + 2, y: band.y + 0.1 * band.height }
    dragTip(built, to)
    expect(Math.abs(tipOf(built.loop).y - (band.y + band.height / 2))).toBeGreaterThan(band.height * 0.3)
    expect(Math.abs(tipOf(built.loop).x - to.x)).toBeLessThan(1)
  })

  it(`${READ_WHERE_LET_GO} -- the amount pulled is not what is read`, () => {
    const built = stage(documentWith([commentRow()]))
    const band = bandOf(built.loop, FREE_ROW)
    const tip = tipOf(built.loop)
    const to = { x: columnLeft(built.loop, april(27)) + 5, y: band.y + 0.6 * band.height }
    built.drag(tip.x + 4, tip.y, to.x, to.y)
    expect(tipOf(built.loop).x).toBeCloseTo(to.x, 0)
  })

  it('a release over no drawn task group moves nothing', () => {
    const built = stage(documentWith([commentRow()]))
    const before = structuredClone(built.loop.document().schedule.commentBoxes)
    const last = bandOf(built.loop, groupOf(4))
    dragTip(built, { x: columnLeft(built.loop, april(27)) + 5, y: last.y + last.height + 120 })
    expect(built.loop.document().schedule.commentBoxes).toEqual(before)
  })
})

describe('AR-5: placing a comment reads the press point the same way', () => {
  const place = (build: (b: Stage) => { x: number; y: number }) => {
    const empty = stage(documentWith([]))
    const at = build(empty)
    empty.pressEntry('Command Palette', 'IC-35')
    empty.click(at.x, at.y)
    const boxes = empty.loop.document().schedule.commentBoxes
    expect(boxes, 'premise: the press placed one comment box').toHaveLength(1)
    return { built: empty, stored: boxes[0]! }
  }

  it('a press on empty ground 5.5px from a bar corner (each way) snaps to it', () => {
    const { stored } = place((b) => {
      const corner = snapsOfFigure(b.loop, 3, 'plannedBar')[0]!
      return { x: corner.at.x - 5.5, y: corner.at.y - 5.5 }
    })
    expect([stored.anchorTaskUid, stored.anchorTaskFigure, stored.anchorSnapPoint]).toEqual([3, 'plannedBar', 'topLeftCorner'])
  })

  it('a press away from every point stands free at the press point, not at the column or band middle', () => {
    const { built, stored } = place((b) => {
      const band = bandOf(b.loop, FREE_ROW)
      return { x: columnLeft(b.loop, april(27)) + 0.25 * frameOf(b.loop).layout.pxPerDay, y: band.y + 0.3 * band.height }
    })
    expect(stored.anchorTaskUid).toBeNull()
    expect(stored.anchorTaskGroupId).toBe(FREE_ROW)
    expect(Math.abs(minutesOf(stored.anchorDate) - minutesOf(april(27, '06:00:00')))).toBeLessThanOrEqual(2)
    expect(stored.anchorBandFraction ?? Number.NaN).toBeCloseTo(0.3, 2)
    expect(frameOf(built.loop).geometry.commentBoxes).toHaveLength(1)
  })
})

describe('commentAnchorAt: the one reading both ways share', () => {
  const stageFrame = () => {
    const built = stage(documentWith([commentRow({ id: COMMENT_ID })]))
    const { layout, geometry } = frameOf(built.loop)
    return { built, layout, geometry }
  }

  it('a point within the reach of a figure point answers the snap and its position', () => {
    const { built, layout, geometry } = stageFrame()
    const corner = snapsOfFigure(built.loop, BAR_UID, 'plannedBar')[0]!
    const answer = commentAnchorAt(layout, geometry, corner.at.x - 3, corner.at.y - 3)
    if (!('anchor' in answer)) throw new Error('premise: a placed anchor was answered')
    expect([answer.anchor.taskUid, answer.anchor.taskFigure, answer.anchor.snapPoint]).toEqual([BAR_UID, 'plannedBar', 'topLeftCorner'])
    expect(answer.at.x).toBeCloseTo(corner.at.x, 3)
    expect(answer.at.y).toBeCloseTo(corner.at.y, 3)
  })

  it('a point away from every figure point answers a free anchor at the pointer, with the target keys left out or null', () => {
    const { built, layout, geometry } = stageFrame()
    const band = bandOf(built.loop, FREE_ROW)
    const x = columnLeft(built.loop, april(27)) + 5
    const y = band.y + 0.4 * band.height
    const answer = commentAnchorAt(layout, geometry, x, y)
    if (!('anchor' in answer)) throw new Error('premise: a placed anchor was answered')
    expect(answer.at).toEqual({ x, y })
    expect(answer.anchor.taskGroupId).toBe(FREE_ROW)
    expect(answer.anchor.taskUid ?? null).toBeNull()
    expect(answer.anchor.highlightBoxId ?? null).toBeNull()
    expect(answer.anchor.snapPoint ?? null).toBeNull()
  })

  it('a point under no drawn task group and near no point answers a refusal and no anchor', () => {
    const { built, layout, geometry } = stageFrame()
    const last = bandOf(built.loop, groupOf(4))
    const answer = commentAnchorAt(layout, geometry, columnLeft(built.loop, april(27)) + 5, last.y + last.height + 120)
    expect('anchor' in answer).toBe(false)
  })
})
