// DFC-2973 spec-only cases: boxes of one kind are drawn later-in-document-order in front and the front-most answers a press first (FR-019, T-020 ZO-9 / ZO-14); the PR-48 / PR-49 entrances run CM-100 / CM-101, which move the box to the end of its order, and one undo restores it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { PropertyControl, PropertyField } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { grabSizesOf, itemAtPointer, type Item } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { ScheduleGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { restoreAnimationFrames } from '../unit/cr-646-stage'
import { commandsOf } from './cr-606-stage'
import { windowStage } from './cr-731-window-stage'
import {
  MILESTONE_UID,
  SECOND_BAR_UID,
  april,
  commentDrawn,
  commentRow,
  documentWith,
  frameOf,
  groupOf,
  highlightRow,
  stage,
} from './cr-777-stage'
import { FR_019_FRONT, FR_019_ORDER, FR_019_SHAPE, FR_031_NO_STEP, bench, fieldOf, panelOf, pressOf } from './cr-786-stage'
import { specTable, unbroken } from './spec-table'
import { exportStage, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

// see T-020, ZO-9, ZO-14
const ZO_9_ORDER = 'コメントボックスどうしの前後は `FR-019` が持つ（文書の並びで後のものほど前）'
const ZO_14_ORDER = 'ハイライトボックスどうしの前後は、塗りも枠（`ZO-8`）も `FR-019` が持つ（文書の並びで後のものほど前）'
// see T-016, PR-48, PR-49
const PR_48_CELL = '押すと、そのコメントボックスをコメントボックスの並びの最後へ移し（`CM-100`）、ほかのコメントボックスより前に描く'
const PR_49_CELL = '押すと、そのハイライトボックスをハイライトボックスの並びの最後へ移し（`CM-101`）、ほかのハイライトボックスより前に描く'
// see T-108, CM-100, CM-101
const CM_100_CELL = 'コメントボックスを、コメントボックスの並びの最後（最前面）へ移す'
const CM_101_CELL = 'ハイライトボックスを、ハイライトボックスの並びの最後（最前面）へ移す'

const cellsOf = (table: string, id: string): string =>
  unbroken((specTable(table).rows.find((one) => one.id === id)?.cells ?? []).join(' '))
const commandNameOf = (id: string): string => {
  const found = /`([A-Za-z]+)`/.exec(specTable('T-108').rows.find((one) => one.id === id)?.by['確定名'] ?? '')
  if (found === null) throw new Error(`table T-108 ${id} names no command`)
  return found[1] as string
}
const CM_100 = commandNameOf('CM-100')
const CM_101 = commandNameOf('CM-101')

const A = '29730000-0000-4000-8000-00000000000a'
const B = '29730000-0000-4000-8000-00000000000b'
const C = '29730000-0000-4000-8000-00000000000c'
const H1 = '29730000-0000-4000-8000-0000000000a1'
const H2 = '29730000-0000-4000-8000-0000000000a2'
const H3 = '29730000-0000-4000-8000-0000000000a3'

// WHY: right of every task on the band of Task 4, so no task figure shares a press on the bodies.
const FREE_DATE = april(24, '00:00:00')
const OFFSET = { dx: 60, dy: -60 }
// WHY: each later body starts this far right of the earlier, less than a body width, so the bodies overlap in part.
const STEP_PX = 12

const comment = (id: string, index = 0): Record<string, unknown> =>
  commentRow({ id, text: `Box ${id.slice(-1)}`, anchorDate: FREE_DATE, anchorTaskGroupId: groupOf(SECOND_BAR_UID), bodyOffsetPx: { dx: OFFSET.dx + index * STEP_PX, dy: OFFSET.dy } })
// WHY: on the milestone band before the milestone (13 April), so no task figure shares the frame lines.
const highlight = (id: string, fillColor: string | null = null): Record<string, unknown> =>
  highlightRow({
    id,
    start: april(2, '00:00:00'),
    finish: april(5, '23:59:00'),
    topTaskGroupId: groupOf(MILESTONE_UID),
    bottomTaskGroupId: groupOf(MILESTONE_UID),
    fillColor,
  })

const commentIds = (document: Document): readonly string[] => document.schedule.commentBoxes.map((one) => one.id)
const highlightIds = (document: Document): readonly string[] => document.schedule.highlightBoxes.map((one) => one.id)

const hitAt = (geometry: ScheduleGeometry, x: number, y: number): Item | null => itemAtPointer(geometry, x, y, grabSizesOf())?.item ?? null

// WHY: the painted order of the picture: an element written later in the SVG is painted over the earlier.
const figureIndexes = (svg: string, prefix: string): readonly number[] =>
  [...svg.matchAll(/data-figure="([^"]+)"/g)].filter((one) => (one[1] ?? '').startsWith(prefix)).map((one) => one.index ?? -1)

// WHY: the ZO-9 group alone, so the selection cues ZO-10 paints over every box are not read as the box.
const zoGroupOf = (svg: string, row: string): string => {
  const from = svg.indexOf(`data-zo="${row}"`)
  if (from < 0) throw new Error(`premise: the picture has a ${row} group`)
  const next = svg.indexOf('data-zo="', from + 1)
  return svg.slice(from, next < 0 ? svg.length : next)
}

const paintedAfter = (svg: string, later: string, earlier: string): boolean => {
  const group = zoGroupOf(svg, 'ZO-9')
  const after = figureIndexes(group, `comment-${later}`)
  const before = figureIndexes(group, `comment-${earlier}`)
  if (after.length === 0 || before.length === 0) throw new Error('premise: both boxes are painted in ZO-9')
  return Math.min(...after) > Math.max(...before)
}

describe('DFC-2973 premise -- the spec still says what these cases check', () => {
  it.each([
    ['FR-019 order', REQUIREMENTS, FR_019_ORDER],
    ['FR-019 bring to front', REQUIREMENTS, FR_019_FRONT],
    ['FR-019 no shape change', REQUIREMENTS, FR_019_SHAPE],
    ['FR-031 no step for no change', REQUIREMENTS, FR_031_NO_STEP],
    ['T-020 ZO-9', cellsOf('T-020', 'ZO-9'), ZO_9_ORDER],
    ['T-020 ZO-14', cellsOf('T-020', 'ZO-14'), ZO_14_ORDER],
    ['T-016 PR-48', cellsOf('T-016', 'PR-48'), PR_48_CELL],
    ['T-016 PR-49', cellsOf('T-016', 'PR-49'), PR_49_CELL],
    ['T-108 CM-100', cellsOf('T-108', 'CM-100'), CM_100_CELL],
    ['T-108 CM-101', cellsOf('T-108', 'CM-101'), CM_101_CELL],
  ])('%s', (_name, text, clause) => {
    expect(text).toContain(clause)
  })
})

describe(`FR-019 / ZO-9 paint order -- ${ZO_9_ORDER}`, () => {
  it.each([
    [[A, B, C]],
    [[C, A, B]],
    [[B, C, A]],
  ])('comment boxes stored as %j are painted in that order, each box wholly over the earlier ones', async (order) => {
    const built = await windowStage(documentWith(order.map((id, index) => comment(id, index))))
    const svg = built.svg()
    for (let at = 1; at < order.length; at += 1) {
      expect(paintedAfter(svg, order[at] as string, order[at - 1] as string), `${order[at]} is painted after ${order[at - 1]}`).toBe(true)
    }
  })
})

describe(`FR-019 / ZO-14 / ZO-8 paint order -- ${ZO_14_ORDER}`, () => {
  it.each([
    [[H1, H2, H3]],
    [[H3, H1, H2]],
  ])('highlight boxes stored as %j: the fills are painted in that order, and the frames are painted in that order', async (order) => {
    const built = await windowStage(documentWith([], order.map((id) => highlight(id, 'red'))))
    const svg = built.svg()
    const fills = order.map((id) => figureIndexes(svg, `box-${id}-fill`)[0] ?? -1)
    const frames = order.map((id) => figureIndexes(svg, `box-${id}`).find((one) => !fills.includes(one)) ?? -1)
    expect(fills.every((one) => one >= 0), 'premise: every fill is painted').toBe(true)
    expect(frames.every((one) => one >= 0), 'premise: every frame is painted').toBe(true)
    expect([...fills].sort((x, y) => x - y)).toEqual(fills)
    expect([...frames].sort((x, y) => x - y)).toEqual(frames)
  })
})

describe(`FR-019 hit order -- ${FR_019_ORDER}`, () => {
  const geometryOf = (document: Document): ScheduleGeometry => frameOf(stage(document).loop).geometry
  const bodyOf = (geometry: ScheduleGeometry, id: string) => {
    const found = geometry.commentBoxes.find((one) => one.id === id)
    if (found === undefined) throw new Error(`premise: comment box ${id} is drawn`)
    return found.body
  }

  it.each([
    [[A, B, C], C],
    [[C, B, A], A],
    [[A, C, B], B],
  ])('three bodies stored as %j overlapping at one point: the last stored, %s, answers', (order, front) => {
    const geometry = geometryOf(documentWith(order.map((id, index) => comment(id, index))))
    const last = bodyOf(geometry, order[2] as string)
    const first = bodyOf(geometry, order[0] as string)
    const x = (last.x + first.x + first.width) / 2
    const y = first.y + first.height / 2
    for (const id of order) {
      const body = bodyOf(geometry, id)
      expect(x > body.x && x < body.x + body.width, `premise: the point lies inside body ${id}`).toBe(true)
    }
    expect(hitAt(geometry, x, y)).toEqual({ kind: 'commentBox', id: front })
  })

  it.each([
    [[H1, H2], H2],
    [[H2, H1], H1],
  ])('two highlight frames on one range stored as %j: the later, %s, answers on the shared left line', (order, front) => {
    const geometry = geometryOf(documentWith([], order.map((id) => highlight(id))))
    const box = geometry.highlightBoxes.find((one) => one.id === front)?.box
    if (box === undefined) throw new Error('premise: the frame is drawn')
    expect(hitAt(geometry, box.x, box.y + box.height / 2)).toEqual({ kind: 'highlightBox', id: front })
  })
})

describe(`CM-100 / CM-101 (T-108) -- ${FR_019_FRONT}`, () => {
  const start = (): Document =>
    documentWith(
      [A, B, C].map((id, index) => comment(id, index)),
      [H1, H2, H3].map((id) => highlight(id)),
    )

  it.each([
    [A, [B, C, A]],
    [B, [A, C, B]],
  ])(`${CM_100} on %s moves only that box to the end, keeps the others in order, and rewrites no column`, (id, expected) => {
    const held = bench(start())
    const before = structuredClone(held.document())
    const outcome = held.write([{ kind: CM_100, commentBoxId: id } as never])
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true)
    expect(commentIds(held.document())).toEqual(expected)
    for (const box of before.schedule.commentBoxes) {
      expect(held.document().schedule.commentBoxes.find((one) => one.id === box.id)).toEqual(box)
    }
    expect(highlightIds(held.document()), 'the other kind keeps its order').toEqual([H1, H2, H3])
  })

  it.each([
    [H1, [H2, H3, H1]],
    [H2, [H1, H3, H2]],
  ])(`${CM_101} on %s moves only that box to the end, keeps the others in order, and rewrites no column`, (id, expected) => {
    const held = bench(start())
    const before = structuredClone(held.document())
    const outcome = held.write([{ kind: CM_101, highlightBoxId: id } as never])
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true)
    expect(highlightIds(held.document())).toEqual(expected)
    for (const box of before.schedule.highlightBoxes) {
      expect(held.document().schedule.highlightBoxes.find((one) => one.id === box.id)).toEqual(box)
    }
    expect(commentIds(held.document()), 'the other kind keeps its order').toEqual([A, B, C])
  })

  it.each([
    [CM_100, { kind: CM_100, commentBoxId: A }, commentIds, [A, B, C]],
    [CM_101, { kind: CM_101, highlightBoxId: H1 }, highlightIds, [H1, H2, H3]],
  ] as const)('%s leaves one undo step, and one undo (FR-031) restores the order', (_name, command, idsOf, original) => {
    const held = bench(start())
    const depth = held.depth()
    held.write([command as never])
    expect(held.depth()).toBe(depth + 1)
    expect(idsOf(held.undo())).toEqual(original)
  })

  it.each([
    [CM_100, { kind: CM_100, commentBoxId: C }, commentIds, [A, B, C]],
    [CM_101, { kind: CM_101, highlightBoxId: H3 }, highlightIds, [H1, H2, H3]],
  ] as const)(`%s on the box already last changes nothing and leaves no undo step (${FR_031_NO_STEP})`, (_name, command, idsOf, original) => {
    const held = bench(start())
    const depth = held.depth()
    held.write([command as never])
    expect(idsOf(held.document())).toEqual(original)
    expect(held.depth()).toBe(depth)
  })
})

// see PR-48, PR-49
const pressControlOf = (field: PropertyField): PropertyControl => {
  const found = field.controls.filter((one) => one.press !== undefined)
  if (found.length !== 1) throw new Error(`expected one press entrance in ${field.row}, got ${found.length}`)
  return found[0] as PropertyControl
}

describe(`PR-48 / PR-49 (T-016) -- ${PR_48_CELL}`, () => {
  const start = (): Document => documentWith([comment(A, 0), comment(B, 1)], [highlight(H1), highlight(H2)])

  it(`pressing PR-48 of the selected back comment box makes ${CM_100} for it`, () => {
    const field = fieldOf(panelOf(start(), { kind: 'commentBox', id: A }, 'en'), 'PR-48')
    expect(commandsOf(start(), pressOf(field, pressControlOf(field)))).toEqual([{ kind: CM_100, commentBoxId: A }])
  })

  it(`pressing PR-49 of the selected back highlight box makes ${CM_101} for it`, () => {
    const field = fieldOf(panelOf(start(), { kind: 'highlightBox', id: H1 }, 'en'), 'PR-49')
    expect(commandsOf(start(), pressOf(field, pressControlOf(field)))).toEqual([{ kind: CM_101, highlightBoxId: H1 }])
  })
})

// WHY: the whole road a person takes: place a box over a stored one, press the stored one, press its button, undo.
describe('FR-019 through the frame loop: PR-48 brings a covered comment box to the front, and one undo puts it back', () => {
  const BACK_TEXT = 'Covered box'

  async function scene(): Promise<{ built: ExportStage; front: string; overlap: { x: number; y: number } }> {
    const built = exportStage(documentWith([commentRow({ ...comment(A), text: BACK_TEXT })]))
    const old = commentDrawn(built.loop, A)!.body
    await built.take('IC-35')
    await built.click(old.x + old.width / 2, old.y + old.height + 6)
    const ids = commentIds(built.loop.document())
    if (ids.length !== 2 || ids[0] !== A) throw new Error(`premise: a second box was placed after the stored one, got ${JSON.stringify(ids)}`)
    const front = ids[1] as string
    const placed = commentDrawn(built.loop, front)!.body
    const overlap = {
      x: (placed.x + Math.min(placed.x + placed.width, old.x + old.width)) / 2,
      y: (Math.max(placed.y, old.y) + Math.min(placed.y + placed.height, old.y + old.height)) / 2,
    }
    const inside = (body: typeof old): boolean =>
      overlap.x > body.x && overlap.x < body.x + body.width && overlap.y > body.y && overlap.y < body.y + body.height
    if (!inside(old) || !inside(placed)) throw new Error('premise: the placed body overlaps the stored one')
    await built.click(old.x + 3, old.y + 3)
    const shown = built.lastView().propertiesPanel?.fields.find((one) => one.row === 'PR-21')?.text
    if (shown !== BACK_TEXT) throw new Error(`premise: the stored box is selected and shown, got ${shown}`)
    return { built, front, overlap }
  }

  const pressBringToFront = async (built: ExportStage): Promise<void> => {
    const field = built.lastView().propertiesPanel?.fields.find((one) => one.row === 'PR-48')
    if (field === undefined) throw new Error('premise: the panel shows PR-48 for the selected comment box')
    built.commitNext(pressOf(field, pressControlOf(field)))
    await built.pointAt(1, 1)
  }

  it('before the press: the placed box is painted over the stored one and answers in the overlap', async () => {
    const { built, front, overlap } = await scene()
    expect(paintedAfter((await windowStage(built.loop.document())).svg(), front, A)).toBe(true)
    expect(hitAt(frameOf(built.loop).geometry, overlap.x, overlap.y)).toEqual({ kind: 'commentBox', id: front })
  })

  it('pressing [Bring to Front] (PR-48) moves the stored box to the end of the order', async () => {
    const { built, front } = await scene()
    await pressBringToFront(built)
    expect(commentIds(built.loop.document())).toEqual([front, A])
  })

  it('after the press the stored box is painted in front and answers a press in the overlap', async () => {
    const { built, front, overlap } = await scene()
    await pressBringToFront(built)
    expect(paintedAfter((await windowStage(built.loop.document())).svg(), A, front)).toBe(true)
    expect(hitAt(frameOf(built.loop).geometry, overlap.x, overlap.y)).toEqual({ kind: 'commentBox', id: A })
  })

  it('one undo (IC-5, FR-031) restores the order, and the placed box stays', async () => {
    const { built, front } = await scene()
    await pressBringToFront(built)
    await built.take('IC-5')
    expect(commentIds(built.loop.document())).toEqual([A, front])
  })
})
