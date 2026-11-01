// DFC-2911 spec-only cases: a comment box tip is a free point (AT-113, AT-114, AT-163) or snapped to one of the eight points of a task figure or highlight box (AT-164 .. AT-167); a release within the S-292 square snaps, otherwise it stands where let go; a snapped tip follows its target, falls back to a free point when the target is deleted, and the body keeps its screen px offset (FR-019, GR-14, LF-15, LF-17).

import { afterEach, describe, expect, it } from 'vitest'

import { editDocument } from '../../src/use-case/edit-document/edit-document'
import type { Document } from '../../src/entity/document-model/document/document'
import { DESIGN, ERD_DETAIL, REQUIREMENTS, restoreAnimationFrames } from '../unit/cr-646-stage'
import {
  BAR_UID,
  HIGHLIGHT_ID,
  LIMITS,
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
  stage,
  tipOf,
  type Stage,
} from './cr-777-stage'
import { specTable } from './spec-table'

afterEach(restoreAnimationFrames)

const FR_019_TWO_KINDS = 'コメントボックスの線先（留めた点）は、次の 2 つのどちらかとして持つこと（MUST）'
const FR_019_FREE = '① 自由点 —— 日時（`_assets/fig-erd-detail.md` の `AT-113`、分まで）、タスクグループ（`AT-114`）、その帯の中の高さ（`AT-163`）。'
const FR_019_SNAPPED = '② 吸着した対象の点 —— タスク（`AT-164` の `UID` と `AT-165` の図形）かハイライトボックス（`AT-166`）と、その 8 点のどれか（`AT-167`）。'
const FR_019_FOLLOW = '② の線先は、描くたびに対象の図形から点を求めること（MUST） —— 対象を動かす命令は注記を書かず、線先と本文の箱（ずれは画面の px）が対象について行く。'
const FR_019_DELETED =
  '吸着した対象を消す命令（表 T-108 の `CM-7` ・ `CM-53`、タスクグループを消して共に消える対象）は、同じ命令の中で、その対象に吸着した線先を ① の自由点に書き換えること（MUST）'
const FR_019_DELETED_VALUES = '横は対象のその点の日時（文書の日付から求める）、タスクグループは対象のもの、帯の中の高さは吸着したときの値を保つ。'
const GR_14_SQUARE =
  '離した点から縦と横へそれぞれ `S-292` の正方形の中に、描いたタスクの図形かハイライトボックスの 8 点（`05-07-design.md` の 表 T-221 の `LF-15`）が在れば、そのうち離した点にいちばん近い点へ吸着すること（MUST）'
const GR_14_FREE = '吸着する点が無いときは、離した点そのものを自由点として持つこと（MUST）'
const LF_15_ORDER = '並びは左上・上・右上・右・右下・下・左下・左（`anchorSnapPoint` の値の順）。'
const LF_15_FREE_Y = '縦は `anchorTaskGroupId` のタスクグループが描かれた帯'
const AT_167_EIGHT = '線先が吸着した、対象の 8 点のどれか —— 四隅と 4 辺の中点（`LF-15`）'

// see T-206, S-292
const S_292 = (() => {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-292')
  const found = /(\d+(?:\.\d+)?)px/.exec(row?.cells[1] ?? '')
  if (found === null) throw new Error('table T-206 S-292 holds no px value')
  return Number(found[1])
})()

const FREE_ROW = groupOf(3)
const OFFSET = { dx: 60, dy: 30 }

const minutesOf = (text: unknown): number => Date.parse(`${String(text).slice(0, 16)}:00Z`) / 60000

const dragTipTo = (built: Stage, to: { x: number; y: number }): void => {
  const tip = tipOf(built.loop)
  built.drag(tip.x, tip.y, to.x, to.y)
}

// see LF-15, AT-167
const planPointsOf = (built: Stage, uid: number) => eightPointsOf(boxOfTask(built.loop, uid, 'plan'), false)

const highlightPointsOf = (built: Stage) => {
  const drawn = frameOf(built.loop).geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)
  if (drawn === undefined) throw new Error('premise: the highlight box is drawn')
  const { x, y, width, height } = drawn.box
  return eightPointsOf({ x0: x, y0: y, x1: x + width, y1: y + height }, false)
}

const snappedToBar = (point: (typeof SNAP_ORDER)[number]): Record<string, unknown> =>
  commentRow({
    bodyOffsetPx: OFFSET,
    anchorDate: april(6, '00:00:00'),
    anchorTaskGroupId: groupOf(BAR_UID),
    anchorBandFraction: 0.2,
    anchorTaskUid: BAR_UID,
    anchorTaskFigure: 'plannedBar',
    anchorSnapPoint: point,
  })

const targetOf = (built: Stage) => {
  const row = commentStored(built.loop)
  return [row.anchorTaskUid, row.anchorTaskFigure, row.anchorHighlightBoxId, row.anchorSnapPoint]
}

const accepted = (result: ReturnType<typeof editDocument>): Document => {
  if (!result.ok) throw new Error(`premise: the command was accepted, was ${JSON.stringify(result.refusals)}`)
  return result.document
}

describe('DFC-2911 -- the clauses these cases hold are the manuscript words', () => {
  it('FR-019, table T-023d closing GR-14 paragraph, LF-15 and AT-167 still say what the cases press', () => {
    for (const clause of [FR_019_TWO_KINDS, FR_019_FREE, FR_019_SNAPPED, FR_019_FOLLOW, FR_019_DELETED, FR_019_DELETED_VALUES, GR_14_SQUARE, GR_14_FREE]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    expect(DESIGN).toContain(LF_15_ORDER)
    expect(DESIGN).toContain(LF_15_FREE_Y)
    expect(ERD_DETAIL).toContain(AT_167_EIGHT)
    expect(S_292, 'S-292 is a positive px value').toBeGreaterThan(0)
  })
})

describe('GR-14 / S-292 / LF-15: a release within the S-292 square of a point snaps to it', () => {
  it('GR-14 / AT-164 / AT-165 / AT-167: a release diagonally inside the square of the planned bar upper-right corner snaps there', () => {
    const built = stage(documentWith([commentRow({ bodyOffsetPx: OFFSET })]))
    const corner = planPointsOf(built, BAR_UID)[2]!
    const reach = S_292 - 0.5
    dragTipTo(built, { x: corner.x + reach, y: corner.y - reach })
    expect(targetOf(built)).toEqual([BAR_UID, 'plannedBar', null, 'topRightCorner'])
    expect(tipOf(built.loop).x).toBeCloseTo(corner.x, 1)
    expect(tipOf(built.loop).y).toBeCloseTo(corner.y, 1)
  })

  it('GR-14 / AT-166 / AT-167: a release inside the square of the highlight box lower-right corner snaps to the box', () => {
    const built = stage(documentWith([commentRow({ bodyOffsetPx: OFFSET })], [highlightRow()]))
    const corner = highlightPointsOf(built)[4]!
    dragTipTo(built, { x: corner.x - 3, y: corner.y - 2 })
    expect(targetOf(built)).toEqual([null, null, HIGHLIGHT_ID, 'bottomRightCorner'])
    expect(tipOf(built.loop).x).toBeCloseTo(corner.x, 1)
    expect(tipOf(built.loop).y).toBeCloseTo(corner.y, 1)
  })
})

describe('GR-14 / FR-019 ①: a release outside every square stands free where it was let go', () => {
  it('GR-14 / AT-113 / AT-114 / AT-163: a release S-292 + 1 px left of the bar left middle keeps no target and stands at the release point', () => {
    const built = stage(documentWith([commentRow({ bodyOffsetPx: OFFSET })]))
    const leftMiddle = planPointsOf(built, BAR_UID)[7]!
    const to = { x: leftMiddle.x - S_292 - 1, y: leftMiddle.y }
    dragTipTo(built, to)
    expect(targetOf(built)).toEqual([null, null, null, null])
    const stored = commentStored(built.loop)
    expect(stored.anchorTaskGroupId).toBe(groupOf(BAR_UID))
    const band = bandOf(built.loop, groupOf(BAR_UID))
    expect(band.y + band.height * (stored.anchorBandFraction ?? 0.5)).toBeCloseTo(to.y, 1)
    expect(tipOf(built.loop).x).toBeCloseTo(to.x, 0)
    expect(tipOf(built.loop).y).toBeCloseTo(to.y, 1)
  })

  it('GR-14 / AT-113: the free instant keeps the time inside the day column (to the minute), not the column middle', () => {
    const built = stage(documentWith([commentRow({ bodyOffsetPx: OFFSET })]))
    const band = bandOf(built.loop, FREE_ROW)
    const to = { x: columnLeft(built.loop, april(27)) + 0.75 * frameOf(built.loop).layout.pxPerDay, y: band.y + 0.8 * band.height }
    dragTipTo(built, to)
    const stored = commentStored(built.loop)
    expect(stored.anchorTaskUid).toBeNull()
    expect(Math.abs(minutesOf(stored.anchorDate) - minutesOf(april(27, '18:00:00')))).toBeLessThanOrEqual(2)
    expect(stored.anchorBandFraction ?? Number.NaN).toBeCloseTo(0.8, 2)
  })
})

describe('FR-019 ②: a snapped tip follows its target and the body keeps its screen px offset', () => {
  it('FR-019 / CM-11: moving the bar writes no comment column, and the tip and body are drawn at the moved corner', () => {
    const document = documentWith([snappedToBar('topRightCorner')])
    const before = stage(document)
    const bodyDelta = (built: Stage) => {
      const drawn = commentDrawn(built.loop)!
      return { dx: drawn.body.x - drawn.anchor.x, dy: drawn.body.y - drawn.anchor.y }
    }
    const deltaBefore = bodyDelta(before)
    const moved = accepted(
      editDocument(document, { kind: 'setTaskPlanDates', taskUid: BAR_UID, start: april(13, '00:00:00'), finish: april(17, '17:00:00') } as never, LIMITS, 'row'),
    )
    expect(moved.schedule.commentBoxes).toEqual(document.schedule.commentBoxes)
    restoreAnimationFrames()
    const after = stage(moved)
    const corner = planPointsOf(after, BAR_UID)[2]!
    expect(corner.x - planPointsOf(before, BAR_UID)[2]!.x, 'premise: the bar moved right').toBeGreaterThan(0)
    expect(tipOf(after.loop).x).toBeCloseTo(corner.x, 1)
    expect(tipOf(after.loop).y).toBeCloseTo(corner.y, 1)
    expect(bodyDelta(after).dx).toBeCloseTo(deltaBefore.dx, 3)
    expect(bodyDelta(after).dy).toBeCloseTo(deltaBefore.dy, 3)
  })

  it('FR-019 / CM-54: resizing the highlight box writes no comment column, and the tip stands at the new corner', () => {
    const comment = commentRow({
      bodyOffsetPx: OFFSET,
      anchorDate: april(8, '00:00:00'),
      anchorTaskGroupId: groupOf(2),
      anchorBandFraction: 0,
      anchorHighlightBoxId: HIGHLIGHT_ID,
      anchorSnapPoint: 'topLeftCorner',
    })
    const document = documentWith([comment], [highlightRow()])
    const range = { start: april(20, '00:00:00'), finish: april(23, '23:59:00'), topTaskGroupId: groupOf(3), bottomTaskGroupId: groupOf(4) }
    const moved = accepted(editDocument(document, { kind: 'setHighlightBoxRange', highlightBoxId: HIGHLIGHT_ID, range } as never, LIMITS, 'row'))
    expect(moved.schedule.commentBoxes).toEqual(document.schedule.commentBoxes)
    const after = stage(moved)
    const corner = highlightPointsOf(after)[0]!
    expect(tipOf(after.loop).x).toBeCloseTo(corner.x, 1)
    expect(tipOf(after.loop).y).toBeCloseTo(corner.y, 1)
  })
})

describe('FR-019: deleting the target turns the tip into a free point in the same command', () => {
  it('FR-019 / CM-7: deleting the task clears AT-164 .. AT-167, writes the corner instant and keeps the task group and band height', () => {
    const document = documentWith([snappedToBar('topLeftCorner')])
    const after = accepted(editDocument(document, { kind: 'deleteTask', taskUid: BAR_UID } as never, LIMITS, 'row'))
    const row = after.schedule.commentBoxes[0]!
    expect([row.anchorTaskUid, row.anchorTaskFigure, row.anchorHighlightBoxId, row.anchorSnapPoint]).toEqual([null, null, null, null])
    expect(String(row.anchorDate).slice(0, 16)).toBe('2026-04-06T00:00')
    expect(row.anchorTaskGroupId).toBe(groupOf(BAR_UID))
    expect(row.anchorBandFraction).toBe(0.2)
  })

  it('FR-019 / CM-53: deleting the highlight box clears AT-166 and AT-167 and writes the corner instant', () => {
    const comment = commentRow({
      bodyOffsetPx: OFFSET,
      anchorDate: april(8, '00:00:00'),
      anchorTaskGroupId: groupOf(2),
      anchorBandFraction: 0,
      anchorHighlightBoxId: HIGHLIGHT_ID,
      anchorSnapPoint: 'topLeftCorner',
    })
    const document = documentWith([comment], [highlightRow()])
    const after = accepted(editDocument(document, { kind: 'deleteHighlightBox', highlightBoxId: HIGHLIGHT_ID } as never, LIMITS, 'row'))
    const row = after.schedule.commentBoxes[0]!
    expect([row.anchorTaskUid, row.anchorTaskFigure, row.anchorHighlightBoxId, row.anchorSnapPoint]).toEqual([null, null, null, null])
    expect(String(row.anchorDate).slice(0, 16)).toBe('2026-04-08T00:00')
    expect(row.anchorBandFraction).toBe(0)
  })
})
