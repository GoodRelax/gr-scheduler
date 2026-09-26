// FR-110 table T-020: the back-to-front order the schedule is drawn in.

import { describe, expect, it } from 'vitest'

import { specTable } from './spec-table'
import { cellOf, day, sceneOf, taskOf, type DrawWish, type Scene } from '../unit/cr-430-cross-section-scene'

const RANK = '順'
const ELEMENT = '要素'

const says = (row: string): string =>
  `T-020 ${row} [${RANK}: ${cellOf('T-020', row, RANK)}] ${ELEMENT}: ${cellOf('T-020', row, ELEMENT)}`

const FR_110_ONE_TABLE_DECIDES =
  '`GRS` は、日程表に描くものの前後（どれが手前に見えるか）を 1 つの表で決めること（MUST）。'
const FR_110_LABELS_IN_FRONT_OF_LINES =
  '名称・担当と進捗・進捗マーカーは、線と形より手前に描くこと（MUST）。'
const FR_110_THE_THREE_IN_FRONT =
  '選択の枠・構えて引いている仮の依存線・範囲選択の矩形は、それよりさらに手前とすること（MUST）。'
const ZO_THE_ACTUAL_NEVER_COVERS_THE_NAME = '**実績バーが名称ラベルを覆ってはならない（MUST NOT）。**'
const ZO_6_ONLY_WHILE_HELD =
  '⛔ **握っているあいだだけ描き、離したら消すこと（MUST）** —— **離した時点で残るのは選択そのものであり、矩形ではない**'
const ZO_THE_ROW_ORDER_IS_NOT_THE_ID_ORDER =
  '本表の並び順と行 ID の順は一致しない —— ほかの行から名指されている行 ID を変えないためである。'

const numberIn = (text: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(text)
  if (found === null) throw new Error(`no number in ${JSON.stringify(text)}`)
  return Number(found[0])
}

const ROWS = specTable('T-020').rows.map((row) => ({
  id: row.id,
  rank: numberIn(row.by[RANK] ?? ''),
}))

const COMMENT_BOX = {
  id: 'c1',
  leaderShapeKind: 'calloutBox',
  text: 'a note',
  anchorDate: '2026-03-10',
  anchorGroupId: 'g1',
  bodyOffsetPx: { dx: 40, dy: -30 },
}

const HIGHLIGHT_BOX = {
  id: 'h1',
  startDate: '2026-03-05',
  endDate: '2026-03-20',
  topGroupId: 'g1',
  bottomGroupId: 'g1',
  strokeColor: null,
  cornerRadiusPx: null,
}

const TENTATIVE_LINK = {
  predecessorUid: 1,
  successorUid: 2,
  linkType: 1,
  pattern: 'RP-1',
  points: [
    { x: 400, y: 100 },
    { x: 500, y: 140 },
  ],
}

const richScene = (): Scene =>
  sceneOf({
    tasks: [
      taskOf({
        uid: 1,
        name: 'the first',
        start: day(2),
        finish: day(8),
        actualStart: day(12),
        stop: day(16),
        resume: day(22),
        resumeValid: true,
        percentComplete: 40,
      }),
      taskOf({
        uid: 2,
        name: 'the second',
        start: day(10),
        finish: day(24),
        actualStart: day(10),
        actualFinish: day(18),
        percentComplete: 70,
        dependencies: [
          { predecessorUid: 1, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] },
        ],
      }),
    ],
    shapeKind: 'rectangle',
    assignedTaskUids: [1, 2],
    commentBoxes: [COMMENT_BOX],
    highlightBoxes: [HIGHLIGHT_BOX],
    statusDate: day(14),
    selectTaskUid: 1,
    settings: {
      assigneeVisible: true,
      percentCompleteVisible: true,
      dualCursorVisible: true,
      progressMarkerVisible: true, // see S-63
    },
  })

const EVERYTHING: DrawWish = {
  pointer: { x: 500, y: 120 },
  marquee: { x: 300, y: 95, width: 120, height: 40 },
  watermark: { openedBy: 'a reader', stampedAt: '2026-03-01T00:00:00' },
  tentativeLink: TENTATIVE_LINK,
  follow: { side: 'date1', x: 420 },
}

const layersOf = (svg: string): readonly string[] =>
  [...svg.matchAll(/data-zo="([^"]+)"/g)].map((one) => one[1] as string)

const drawnOrder = (): readonly string[] => layersOf(richScene().svg(EVERYTHING))

const firstIndexOf = (order: readonly string[], id: string): number => order.indexOf(id)

const rankOf = (id: string): number => {
  const found = ROWS.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-020 has no row ${id}`)
  return found.rank
}

const isBackToFront = (order: readonly string[], ranked: readonly { id: string; rank: number }[]): boolean => {
  const seen = ranked
    .filter((one) => order.includes(one.id))
    .map((one) => ({ rank: one.rank, at: order.indexOf(one.id) }))
    .sort((a, b) => a.rank - b.rank)
  return seen.every((one, index) => index === 0 || one.at > (seen[index - 1] as { at: number }).at)
}

describe('T-020 -- every row of the table is a drawn layer, in the order the table gives', () => {
  it(`premise: ${FR_110_ONE_TABLE_DECIDES}`, () => {
    expect(ROWS.length, FR_110_ONE_TABLE_DECIDES).toBe(13)
    expect([...ROWS].map((one) => one.rank).sort((a, b) => a - b), FR_110_ONE_TABLE_DECIDES).toEqual(
      Array.from({ length: 13 }, (_, index) => index + 1),
    )
  })

  for (const row of ROWS) {
    it(`${says(row.id)} -- the layer is drawn, and every lower rank is drawn behind it`, () => {
      const order = drawnOrder()
      expect(order, says(row.id)).toContain(row.id)
      const here = firstIndexOf(order, row.id)
      for (const other of ROWS) {
        if (!order.includes(other.id) || other.id === row.id) continue
        const there = firstIndexOf(order, other.id)
        if (other.rank < row.rank) expect(there, `${says(other.id)} behind ${says(row.id)}`).toBeLessThan(here)
        else expect(there, `${says(other.id)} in front of ${says(row.id)}`).toBeGreaterThan(here)
      }
    })
  }
})

describe('T-020 -- the rules FR-110 states in words', () => {
  it(ZO_THE_ACTUAL_NEVER_COVERS_THE_NAME, () => {
    const order = drawnOrder()
    expect(firstIndexOf(order, 'ZO-2'), ZO_THE_ACTUAL_NEVER_COVERS_THE_NAME).toBeGreaterThanOrEqual(0)
    expect(firstIndexOf(order, 'ZO-5'), ZO_THE_ACTUAL_NEVER_COVERS_THE_NAME).toBeGreaterThan(
      firstIndexOf(order, 'ZO-2'),
    )
  })

  it(FR_110_LABELS_IN_FRONT_OF_LINES, () => {
    const order = drawnOrder()
    for (const behind of ['ZO-1', 'ZO-2', 'ZO-4']) {
      expect(firstIndexOf(order, 'ZO-5'), FR_110_LABELS_IN_FRONT_OF_LINES).toBeGreaterThan(
        firstIndexOf(order, behind),
      )
      expect(firstIndexOf(order, 'ZO-3'), FR_110_LABELS_IN_FRONT_OF_LINES).toBeGreaterThan(
        firstIndexOf(order, behind),
      )
    }
  })

  it(FR_110_THE_THREE_IN_FRONT, () => {
    const order = drawnOrder()
    for (const front of ['ZO-10', 'ZO-11', 'ZO-6']) {
      expect(firstIndexOf(order, front), FR_110_THE_THREE_IN_FRONT).toBeGreaterThan(
        firstIndexOf(order, 'ZO-5'),
      )
      expect(rankOf(front), FR_110_THE_THREE_IN_FRONT).toBeGreaterThan(rankOf('ZO-5'))
    }
  })

  it(ZO_6_ONLY_WHILE_HELD, () => {
    const held = layersOf(richScene().svg(EVERYTHING))
    const released = layersOf(richScene().svg({ ...EVERYTHING, marquee: null }))
    expect(held, ZO_6_ONLY_WHILE_HELD).toContain('ZO-6')
    expect(released, ZO_6_ONLY_WHILE_HELD).not.toContain('ZO-6')
  })

  it(ZO_THE_ROW_ORDER_IS_NOT_THE_ID_ORDER, () => {
    const written = ROWS.map((one) => one.id)
    const byId = [...ROWS]
      .map((one) => one.id)
      .sort((a, b) => numberIn(a) - numberIn(b) || a.localeCompare(b))
    expect(written, ZO_THE_ROW_ORDER_IS_NOT_THE_ID_ORDER).not.toEqual(byId)
  })
})

describe('T-020 control -- the order check refuses a swapped pair', () => {
  const sound = [...ROWS].sort((a, b) => a.rank - b.rank).map((one) => one.id)

  it('accepts the order the table gives', () => {
    expect(isBackToFront(sound, ROWS)).toBe(true)
  })

  it('refuses the order with the name label drawn behind the actual bar', () => {
    const swapped = [...sound]
    const name = swapped.indexOf('ZO-5')
    const actual = swapped.indexOf('ZO-2')
    swapped[name] = 'ZO-2'
    swapped[actual] = 'ZO-5'
    expect(isBackToFront(swapped, ROWS)).toBe(false)
  })

  it('refuses the order with the marquee rectangle sent to the back', () => {
    expect(isBackToFront(['ZO-6', ...sound.filter((one) => one !== 'ZO-6')], ROWS)).toBe(false)
  })
})
