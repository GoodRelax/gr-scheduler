// DFC-2910 spec-only cases: pulling a comment box body or its leader line moves only the box (CM-51, new offset = offset at press + amount pulled) and leaves the tip columns alone; pulling the tip moves only the tip (table T-023d closing GR-14 paragraph, S-291).

import { afterEach, describe, expect, it } from 'vitest'

import { NO_MODIFIERS, REQUIREMENTS, restoreAnimationFrames } from '../unit/cr-646-stage'
import {
  BAR_UID,
  april,
  bandOf,
  columnLeft,
  commentDrawn,
  commentRow,
  commentStored,
  documentWith,
  frameOf,
  groupOf,
  stage,
  tipOf,
  type Stage,
} from './cr-777-stage'
import { specTable, unbroken } from './spec-table'

afterEach(restoreAnimationFrames)

const GR_14_BODY_ONLY =
  '本体（本文の箱の全体）か引出し線（線から左右へ同表の `S-291`）を掴んで引いたときは、本文の箱だけを動かし、線先は動かさないこと（MUST）'
const GR_14_TIP_COLUMNS_KEPT = '本文の箱は引いた量だけ動かし、線先の日とタスクグループは今のままとする'
const GR_14_CM_51_ONLY = 'その動きは、`_assets/tbl-document-commands.md` の 表 T-108 の `CM-51`（ずれ）だけを書くこと（MUST） —— `CM-50`（線先）は書かない。'
const GR_14_NEW_OFFSET = '新しいずれは、押したときのずれに引いた量を足したものとする。'
const GR_14_TIP_ONLY = '線先（線先から同表の `S-292`）を掴んで引いたときは、線先だけを動かし、本文の箱を画面の上で動かさないこと（MUST）'
const S_291_NOTE = '引けば本文の箱だけが動き、線先は動かない'

const FREE_ROW = groupOf(3)
// WHY: the free tip stands in the third band (FREE_ROW); this offset and pull keep the box inside the Task Group Area.
const START_OFFSET = { dx: 60, dy: -30 }
const PULL = { dx: 60, dy: 20 }

const undo = (built: Stage): void => built.send({ kind: 'key', key: 'Z', modifiers: { ...NO_MODIFIERS, ctrl: true } })

// WHY: every tip column FR-019 names (AT-113, AT-114, AT-163 .. AT-167); a body pull must leave all of them as they were.
const tipColumnsOf = (built: Stage) => {
  const row = commentStored(built.loop)
  return {
    anchorDate: row.anchorDate,
    anchorTaskGroupId: row.anchorTaskGroupId,
    anchorBandFraction: row.anchorBandFraction,
    anchorTaskUid: row.anchorTaskUid,
    anchorTaskFigure: row.anchorTaskFigure,
    anchorHighlightBoxId: row.anchorHighlightBoxId,
    anchorSnapPoint: row.anchorSnapPoint,
  }
}

const bodyOf = (built: Stage) => {
  const drawn = commentDrawn(built.loop)
  if (drawn === null) throw new Error('premise: the comment box is drawn')
  return drawn.body
}

// WHY: FR-019 puts the body's lower-left corner at tip + offset; with dx > 0 and dy < 0 LF-17 picks that corner, so the leader runs tip -> lower-left corner.
const leaderMiddleOf = (built: Stage) => {
  const tip = tipOf(built.loop)
  const body = bodyOf(built)
  return { x: (tip.x + body.x) / 2, y: (tip.y + body.y + body.height) / 2 }
}

describe('DFC-2910 -- the clauses these cases hold are the manuscript words', () => {
  it('table T-023d closing GR-14 paragraph and table T-206 S-291 still say what the cases press', () => {
    for (const clause of [GR_14_BODY_ONLY, GR_14_TIP_COLUMNS_KEPT, GR_14_CM_51_ONLY, GR_14_NEW_OFFSET, GR_14_TIP_ONLY]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    const s291 = specTable('T-206').rows.find((one) => one.id === 'S-291')
    expect(s291, 'table T-206 has a row S-291').toBeDefined()
    expect(unbroken(s291!.cells.join(' '))).toContain(S_291_NOTE)
  })
})

describe('GR-14 / CM-51: a pull on the body moves only the box', () => {
  const pulledBody = (part: Record<string, unknown> = {}) => {
    const built = stage(documentWith([commentRow({ bodyOffsetPx: START_OFFSET, ...part })]))
    const tipBefore = tipOf(built.loop)
    const bodyBefore = bodyOf(built)
    const columnsBefore = tipColumnsOf(built)
    const from = { x: bodyBefore.x + bodyBefore.width / 2, y: bodyBefore.y + bodyBefore.height / 2 }
    built.drag(from.x, from.y, from.x + PULL.dx, from.y + PULL.dy)
    return { built, tipBefore, bodyBefore, columnsBefore }
  }

  it('GR-14 / AT-113 / AT-114 / AT-163: the tip columns of a free tip are unchanged after a body pull', () => {
    const { built, columnsBefore } = pulledBody()
    expect(tipColumnsOf(built)).toEqual(columnsBefore)
  })

  it('GR-14 / CM-51: the new offset is the offset at press plus the amount pulled', () => {
    const { built } = pulledBody()
    expect(commentStored(built.loop).bodyOffsetPx).toEqual({ dx: START_OFFSET.dx + PULL.dx, dy: START_OFFSET.dy + PULL.dy })
  })

  it('GR-14: on the screen the tip stays and the box moves by the amount pulled', () => {
    const { built, tipBefore, bodyBefore } = pulledBody()
    expect(tipOf(built.loop).x).toBeCloseTo(tipBefore.x, 3)
    expect(tipOf(built.loop).y).toBeCloseTo(tipBefore.y, 3)
    expect(bodyOf(built).x).toBeCloseTo(bodyBefore.x + PULL.dx, 3)
    expect(bodyOf(built).y).toBeCloseTo(bodyBefore.y + PULL.dy, 3)
  })

  it('GR-14 / AT-164 .. AT-167: a tip snapped to a task keeps its target and point after a body pull', () => {
    // WHY: the bar stands in the top band, so the box hangs below-right of the tip to stay inside the Task Group Area.
    const { built, columnsBefore } = pulledBody({
      bodyOffsetPx: { dx: 60, dy: 30 },
      anchorTaskGroupId: groupOf(BAR_UID),
      anchorDate: april(6, '00:00:00'),
      anchorTaskUid: BAR_UID,
      anchorTaskFigure: 'plannedBar',
      anchorSnapPoint: 'topLeftCorner',
    })
    expect(columnsBefore.anchorTaskUid, 'premise: the tip was snapped').toBe(BAR_UID)
    expect(commentStored(built.loop).bodyOffsetPx, 'premise: the pull reached the body').toEqual({ dx: 60 + PULL.dx, dy: 30 + PULL.dy })
    expect(tipColumnsOf(built)).toEqual(columnsBefore)
  })

  it('GR-14 / CM-51: one undo brings back the offset written by the body pull', () => {
    const { built } = pulledBody()
    undo(built)
    expect(commentStored(built.loop).bodyOffsetPx).toEqual(START_OFFSET)
  })
})

describe('GR-14 / S-291: a pull on the leader line moves only the box', () => {
  it('GR-14 / S-291 / CM-51: pulling the leader middle keeps every tip column and adds the pull to the offset', () => {
    const built = stage(documentWith([commentRow({ bodyOffsetPx: START_OFFSET })]))
    const columnsBefore = tipColumnsOf(built)
    const tipBefore = tipOf(built.loop)
    const from = leaderMiddleOf(built)
    built.drag(from.x, from.y, from.x + PULL.dx, from.y + PULL.dy)
    expect(tipColumnsOf(built)).toEqual(columnsBefore)
    expect(commentStored(built.loop).bodyOffsetPx).toEqual({ dx: START_OFFSET.dx + PULL.dx, dy: START_OFFSET.dy + PULL.dy })
    expect(tipOf(built.loop).x).toBeCloseTo(tipBefore.x, 3)
    expect(tipOf(built.loop).y).toBeCloseTo(tipBefore.y, 3)
  })
})

describe('GR-14 / S-292: a pull on the tip moves only the tip', () => {
  it('GR-14: the tip goes to the release point and the box stays where it stood on the screen', () => {
    const built = stage(documentWith([commentRow({ bodyOffsetPx: START_OFFSET })]))
    const bodyBefore = bodyOf(built)
    const tip = tipOf(built.loop)
    const band = bandOf(built.loop, FREE_ROW)
    const to = { x: columnLeft(built.loop, april(27)) + 0.5 * frameOf(built.loop).layout.pxPerDay, y: band.y + 0.25 * band.height }
    built.drag(tip.x, tip.y, to.x, to.y)
    expect(tipOf(built.loop).x).toBeCloseTo(to.x, 0)
    expect(tipOf(built.loop).y).toBeCloseTo(to.y, 0)
    expect(bodyOf(built).x).toBeCloseTo(bodyBefore.x, 1)
    expect(bodyOf(built).y).toBeCloseTo(bodyBefore.y, 1)
  })
})
