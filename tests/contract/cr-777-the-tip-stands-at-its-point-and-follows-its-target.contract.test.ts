// CR-777 spec-only tests: where a comment box tip is drawn (LF-15), its eight snap points, the snap reach (S-292) and the follow.

import { afterEach, describe, expect, it } from 'vitest'

import { editDocument } from '../../src/use-case/edit-document/edit-document'
import { anchorSnapAt, grabSizesOf } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { anchorSnapsOf, type HighlightGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { restoreAnimationFrames } from '../unit/cr-646-stage'
import {
  BAR_UID,
  HIGHLIGHT_ID,
  LIMITS,
  MILESTONE_UID,
  OTHER_COMMENT_ID,
  SECOND_BAR_UID,
  SNAP_ORDER,
  april,
  bandOf,
  boxOfTask,
  columnLeft,
  commentDrawn,
  commentRow,
  commentStored,
  documentWith,
  eightPointsOf,
  frameOf,
  groupOf,
  highlightRow,
  snapsOf,
  snapsOfFigure,
  stage,
  taskDrawn,
  tipOf,
} from './cr-777-stage'

afterEach(restoreAnimationFrames)

const FREE_ROW = groupOf(3)
const GROUP_LINE = '線先は離した位置で読むこと'
const TWO_KINDS = 'トボックスの線先（留めた点）は、次の 2 つのどちらかとして持つこと（MUST）'
const DRAW_TIME = 'る所である。⭐ ② の線先は、描くたびに対象の図形から点を求めること（MUST）'
const NOT_DRAWN = 'ループを畳んだ、実績を隠した）は、そのコメントボックスを描かないこと（MUST）'
const BROKEN_SET = 'つ、図形か点が欠ける）は ① の自由点に描き、文書を書き換えないこと（MUST）'
const NEAREST = '`LF-15`）が在れば、そのうち離した点にいちばん近い点へ吸着すること（MUST）'

describe(`FR-019 / LF-15: ${TWO_KINDS} -- the free point`, () => {
  it('a 12:00 instant stands in the middle of its day column, and a null fraction is the middle of the band', () => {
    const built = stage(documentWith([commentRow({ anchorDate: april(15, '12:00:00') })]))
    const tip = tipOf(built.loop)
    const band = bandOf(built.loop, FREE_ROW)
    expect(tip.x).toBeCloseTo(columnLeft(built.loop, april(15)) + frameOf(built.loop).layout.pxPerDay / 2, 1)
    expect(tip.y).toBeCloseTo(band.y + band.height / 2, 3)
  })

  it('00:00 stands at the left edge of the column and 18:00 three quarters across it', () => {
    const built = stage(
      documentWith([
        commentRow({ anchorDate: april(15, '00:00:00') }),
        commentRow({ id: OTHER_COMMENT_ID, anchorDate: april(16, '18:00:00') }),
      ]),
    )
    const perDay = frameOf(built.loop).layout.pxPerDay
    expect(tipOf(built.loop).x).toBeCloseTo(columnLeft(built.loop, april(15)), 1)
    expect(tipOf(built.loop, OTHER_COMMENT_ID).x).toBeCloseTo(columnLeft(built.loop, april(16)) + 0.75 * perDay, 1)
  })

  it('the height is the band top plus the band height times the fraction: 0, a quarter and 1', () => {
    for (const fraction of [0, 0.25, 1]) {
      const built = stage(documentWith([commentRow({ anchorBandFraction: fraction })]))
      const band = bandOf(built.loop, FREE_ROW)
      expect(tipOf(built.loop).y, `fraction ${fraction}`).toBeCloseTo(band.y + band.height * fraction, 3)
    }
  })

  it('the point follows the minute: 12:00 and 12:30 of the same day differ by half an hour of the column', () => {
    const noon = stage(documentWith([commentRow({ anchorDate: april(15, '12:00:00') })]))
    const half = stage(documentWith([commentRow({ anchorDate: april(15, '12:30:00') })]))
    const perDay = frameOf(noon.loop).layout.pxPerDay
    expect(tipOf(half.loop).x - tipOf(noon.loop).x).toBeCloseTo(perDay / 48, 2)
  })
})

describe('FR-019 / LF-15: the eight points of a drawn figure', () => {
  const built = stage(
    documentWith([], [highlightRow()]),
  )

  it('a bar offers its bounding box corners and side middles, in the order topLeft to left (AT-167)', () => {
    for (const [uid, figure, name] of [
      [BAR_UID, 'plannedBar', 'plan'],
      [BAR_UID, 'actualBar', 'actual'],
    ] as const) {
      const snaps = snapsOfFigure(built.loop, uid, figure)
      const expected = eightPointsOf(boxOfTask(built.loop, uid, name), false)
      expect(snaps.map((one) => one.target.snapPoint), `${figure} order`).toEqual([...SNAP_ORDER])
      snaps.forEach((one, index) => {
        expect(one.at.x, `${figure} ${SNAP_ORDER[index]} x`).toBeCloseTo(expected[index]!.x, 3)
        expect(one.at.y, `${figure} ${SNAP_ORDER[index]} y`).toBeCloseTo(expected[index]!.y, 3)
      })
    }
  })

  it('a milestone corner stands halfway between the two side middles next to it, so it lies on the drawn shape', () => {
    const snaps = snapsOfFigure(built.loop, MILESTONE_UID, 'milestone')
    const expected = eightPointsOf(boxOfTask(built.loop, MILESTONE_UID, 'milestoneFigure'), true)
    expect(snaps.map((one) => one.target.snapPoint)).toEqual([...SNAP_ORDER])
    snaps.forEach((one, index) => {
      expect(one.at.x, `${SNAP_ORDER[index]} x`).toBeCloseTo(expected[index]!.x, 3)
      expect(one.at.y, `${SNAP_ORDER[index]} y`).toBeCloseTo(expected[index]!.y, 3)
    })
  })

  it('a highlight box offers the eight points of the box it draws, and the tasks are listed before the boxes', () => {
    const snaps = snapsOf(built.loop)
    const box = frameOf(built.loop).geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)!.box
    const mine = snaps.filter((one) => one.target.kind === 'highlightBox' && one.target.highlightBoxId === HIGHLIGHT_ID)
    const expected = eightPointsOf({ x0: box.x, x1: box.x + box.width, y0: box.y, y1: box.y + box.height }, false)
    expect(mine.map((one) => one.target.snapPoint)).toEqual([...SNAP_ORDER])
    mine.forEach((one, index) => {
      expect(one.at.x).toBeCloseTo(expected[index]!.x, 3)
      expect(one.at.y).toBeCloseTo(expected[index]!.y, 3)
    })
    const firstBox = snaps.findIndex((one) => one.target.kind === 'highlightBox')
    const lastTask = snaps.map((one) => one.target.kind).lastIndexOf('task')
    expect(lastTask, 'a task point after a highlight box point').toBeLessThan(firstBox)
  })

  it('every drawn figure contributes eight points and nothing else is listed', () => {
    const { geometry } = frameOf(built.loop)
    const figures = geometry.tasks.reduce(
      (count, one) =>
        count + [one.shapeKind === 'milestone' ? null : one.plan, one.actual, one.milestoneFigure].filter((bar) => bar !== null).length,
      0,
    )
    expect(snapsOf(built.loop)).toHaveLength((figures + geometry.highlightBoxes.length) * 8)
  })
})

describe(`GR-14 / S-292: ${NEAREST} -- anchorSnapAt`, () => {
  const built = stage(documentWith([], [highlightRow()]))
  const reach = grabSizesOf()['S-292']
  const { geometry } = frameOf(built.loop)
  const topLeft = snapsOfFigure(built.loop, BAR_UID, 'plannedBar')[0]!

  it('the reach is the 6px of S-292', () => {
    expect(reach).toBe(6)
  })

  it('a point inside the square reach picks the nearest point; the same offset just outside returns null', () => {
    const near = anchorSnapAt(geometry, topLeft.at.x - 5.5, topLeft.at.y, grabSizesOf())
    expect(near?.target).toEqual(topLeft.target)
    const outside = anchorSnapAt(geometry, topLeft.at.x - 6.5, topLeft.at.y - 6.5, grabSizesOf())
    expect(outside).toBeNull()
  })

  it('the square reach counts each axis alone: 5.5px across and 5.5px down still snaps', () => {
    const diagonal = anchorSnapAt(geometry, topLeft.at.x - 5.5, topLeft.at.y - 5.5, grabSizesOf())
    expect(diagonal?.target).toEqual(topLeft.target)
  })

  it('a point on none of the eight points of any figure, far from them, snaps to nothing', () => {
    const band = bandOf(built.loop, FREE_ROW)
    const column = columnLeft(built.loop, april(28))
    expect(anchorSnapAt(geometry, column, band.y + band.height / 2, grabSizesOf())).toBeNull()
  })

  it('an equal distance takes the earlier point of the same figure', () => {
    const narrow: HighlightGeometry = {
      id: 'narrow',
      box: { x: 100, y: 100, width: 8, height: 40 },
      cornerRadiusPx: null,
      strokeWidthPx: 1,
      fillColor: null,
      fillOpacity: 1,
      hasSideHandles: { leftRight: true, topBottom: true },
    }
    const empty = { tasks: [], highlightBoxes: [narrow] }
    expect(anchorSnapAt(empty, 102, 100, grabSizesOf())?.target.snapPoint).toBe('topLeftCorner')
    expect(anchorSnapAt(empty, 106, 100, grabSizesOf())?.target.snapPoint).toBe('topMiddle')
  })

  it('an equal distance takes a task figure before a highlight box', () => {
    const over: HighlightGeometry = {
      id: 'over',
      box: { x: topLeft.at.x, y: topLeft.at.y, width: 40, height: 20 },
      cornerRadiusPx: null,
      strokeWidthPx: 1,
      fillColor: null,
      fillOpacity: 1,
      hasSideHandles: { leftRight: true, topBottom: true },
    }
    const both = { tasks: geometry.tasks, highlightBoxes: [over] }
    const snap = anchorSnapAt(both, topLeft.at.x, topLeft.at.y, grabSizesOf())
    expect(snap?.target.kind).toBe('task')
    expect(anchorSnapsOf(both.tasks, both.highlightBoxes).findIndex((one) => one.target.kind === 'highlightBox')).toBeGreaterThan(0)
  })
})

describe(`FR-019: ${DRAW_TIME}`, () => {
  const snapped = (part: Record<string, unknown> = {}): Record<string, unknown> =>
    commentRow({
      anchorTaskGroupId: groupOf(BAR_UID),
      anchorTaskUid: BAR_UID,
      anchorTaskFigure: 'plannedBar',
      anchorSnapPoint: 'topMiddle',
      ...part,
    })

  it('the tip stands on the named point of the named figure', () => {
    const built = stage(documentWith([snapped()]))
    const box = boxOfTask(built.loop, BAR_UID, 'plan')
    expect(tipOf(built.loop).x).toBeCloseTo((box.x0 + box.x1) / 2, 3)
    expect(tipOf(built.loop).y).toBeCloseTo(box.y0, 3)
  })

  it('moving the task writes no comment column and the redrawn tip stands on the moved bar', () => {
    const before = stage(documentWith([snapped()]))
    const document = before.loop.document()
    const result = editDocument(
      document,
      { kind: 'setTaskPlanDates', taskUid: BAR_UID, start: april(12, '00:00:00'), finish: april(16, '17:00:00') },
      LIMITS,
      'row',
    )
    if (!result.ok) throw new Error(`premise: the move is accepted, was ${JSON.stringify(result.refusals)}`)
    expect(result.document.schedule.commentBoxes).toEqual(document.schedule.commentBoxes)
    const after = stage(result.document)
    const box = boxOfTask(after.loop, BAR_UID, 'plan')
    expect(box.x0, 'premise: the bar moved right').toBeGreaterThan(boxOfTask(before.loop, BAR_UID, 'plan').x0)
    expect(tipOf(after.loop).x).toBeCloseTo((box.x0 + box.x1) / 2, 3)
    expect(tipOf(after.loop).y).toBeCloseTo(box.y0, 3)
  })

  it('a tip snapped to a highlight box stands on that box and follows it', () => {
    const built = stage(
      documentWith([commentRow({ anchorHighlightBoxId: HIGHLIGHT_ID, anchorSnapPoint: 'bottomRightCorner' })], [highlightRow()]),
    )
    const box = frameOf(built.loop).geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)!.box
    expect(tipOf(built.loop).x).toBeCloseTo(box.x + box.width, 3)
    expect(tipOf(built.loop).y).toBeCloseTo(box.y + box.height, 3)
  })

  it(`${NOT_DRAWN} -- an actual bar that is hidden`, () => {
    const built = stage(documentWith([snapped({ anchorTaskFigure: 'actualBar' })], [], { isActualVisible: false }))
    expect(taskDrawn(built.loop, BAR_UID)?.actual ?? null, 'premise: the actual bar is not drawn').toBeNull()
    expect(commentStored(built.loop).anchorTaskUid, 'the document was rewritten').toBe(BAR_UID)
    expect(commentDrawn(built.loop)).toBeNull()
  })

  it(`${NOT_DRAWN} -- a task the frame does not draw`, () => {
    const hidden = documentWith([snapped({ anchorTaskUid: SECOND_BAR_UID, anchorTaskGroupId: groupOf(SECOND_BAR_UID) })])
    const group = hidden.schedule.taskGroups.find((one) => one.id === groupOf(SECOND_BAR_UID))!
    ;(group as { treeState: string }).treeState = 'hidden'
    const built = stage(hidden)
    expect(taskDrawn(built.loop, SECOND_BAR_UID), 'premise: the task is not drawn').toBeNull()
    expect(commentDrawn(built.loop)).toBeNull()
  })

  it(`${BROKEN_SET} -- a target without a figure and a point, and two targets at once`, () => {
    const free = stage(documentWith([commentRow()]))
    const freeTip = tipOf(free.loop)
    const lone = stage(documentWith([commentRow({ anchorTaskUid: BAR_UID })]))
    expect(tipOf(lone.loop)).toEqual(freeTip)
    expect(commentStored(lone.loop).anchorTaskUid, 'the document was rewritten').toBe(BAR_UID)
    const twice = stage(
      documentWith(
        [
          commentRow({
            anchorTaskUid: BAR_UID,
            anchorTaskFigure: 'plannedBar',
            anchorHighlightBoxId: HIGHLIGHT_ID,
            anchorSnapPoint: 'topMiddle',
          }),
        ],
        [highlightRow()],
      ),
    )
    expect(tipOf(twice.loop)).toEqual(freeTip)
    expect(commentStored(twice.loop).anchorHighlightBoxId, 'the document was rewritten').toBe(HIGHLIGHT_ID)
  })
})

describe(`LF-15: ${GROUP_LINE} -- the tip of a snapped box is drawn from the figure each frame`, () => {
  it('the free columns of a snapped box are not what is drawn', () => {
    const built = stage(
      documentWith([
        commentRow({
          anchorDate: april(28, '00:00:00'),
          anchorTaskGroupId: FREE_ROW,
          anchorTaskUid: MILESTONE_UID,
          anchorTaskFigure: 'milestone',
          anchorSnapPoint: 'leftMiddle',
        }),
      ]),
    )
    const snap = snapsOfFigure(built.loop, MILESTONE_UID, 'milestone').find((one) => one.target.snapPoint === 'leftMiddle')!
    expect(tipOf(built.loop).x).toBeCloseTo(snap.at.x, 3)
    expect(tipOf(built.loop).y).toBeCloseTo(snap.at.y, 3)
  })
})
