// CR-786 spec-only tests: where two boxes of one kind overlap, the one drawn in front (later in the array) answers (FR-019).

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { grabSizesOf, itemAtPointer, type Item } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { ScheduleGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { restoreAnimationFrames } from '../unit/cr-646-stage'
import {
  MILESTONE_UID,
  SECOND_BAR_UID,
  april,
  commentRow,
  documentWith,
  frameOf,
  groupOf,
  highlightRow,
  stage,
} from './cr-777-stage'
import { FR_019_ORDER, REQUIREMENTS } from './cr-786-stage'

afterEach(restoreAnimationFrames)

const FRONT = '78600000-0000-4000-8000-000000000011'
const BACK = '78600000-0000-4000-8000-000000000012'

// WHY: past the last task (20 April) and inside the drawn days, so no task shape shares the press.
const FREE_DATE = april(24, '00:00:00')
const BODY_OFFSET = { dx: 60, dy: -60 }
// WHY: the second body is pushed right by less than a body width, so the two overlap only in part.
const PART_SHIFT_PX = 30
// WHY: highlight boxes on the milestone band, before the milestone (13 April), so no task shape shares the frame.
const BOX_START = april(2, '00:00:00')
const BOX_FINISH = april(5, '23:59:00')

const geometryOf = (document: Document): ScheduleGeometry => frameOf(stage(document).loop).geometry

const hitAt = (geometry: ScheduleGeometry, x: number, y: number): Item | null =>
  itemAtPointer(geometry, x, y, grabSizesOf())?.item ?? null

const comment = (id: string, dx: number = BODY_OFFSET.dx): Record<string, unknown> =>
  commentRow({ id, anchorDate: FREE_DATE, anchorTaskGroupId: groupOf(SECOND_BAR_UID), bodyOffsetPx: { ...BODY_OFFSET, dx } })

const highlight = (id: string): Record<string, unknown> =>
  highlightRow({ id, start: BOX_START, finish: BOX_FINISH, topTaskGroupId: groupOf(MILESTONE_UID), bottomTaskGroupId: groupOf(MILESTONE_UID) })

const bodyOf = (geometry: ScheduleGeometry, id: string) => {
  const found = geometry.commentBoxes.find((one) => one.id === id)
  if (found === undefined) throw new Error(`premise: comment box ${id} is drawn`)
  return found.body
}

const frameBoxOf = (geometry: ScheduleGeometry, id: string) => {
  const found = geometry.highlightBoxes.find((one) => one.id === id)
  if (found === undefined) throw new Error(`premise: highlight box ${id} is drawn`)
  return found.box
}

describe('CR-786 premise', () => {
  it('FR-019 holds the clause these cases quote', () => {
    expect(REQUIREMENTS).toContain(FR_019_ORDER)
  })
})

describe(`FR-019 comment box body -- ${FR_019_ORDER}`, () => {
  it.each([
    [[BACK, FRONT], FRONT],
    [[FRONT, BACK], BACK],
  ])('two bodies on one spot in the order %j: the later one, %s, answers the press', (order, later) => {
    const geometry = geometryOf(documentWith(order.map((id) => comment(id))))
    const body = bodyOf(geometry, later)
    const hit = hitAt(geometry, body.x + body.width / 2, body.y + body.height / 2)
    expect(hit).toEqual({ kind: 'commentBox', id: later })
  })

  it('where only the earlier body lies, the earlier box answers (control)', () => {
    const geometry = geometryOf(documentWith([comment(BACK), comment(FRONT, BODY_OFFSET.dx + PART_SHIFT_PX)]))
    const back = bodyOf(geometry, BACK)
    expect(bodyOf(geometry, FRONT).x, 'premise: the front body starts right of the back body').toBeGreaterThan(back.x)
    const hit = hitAt(geometry, back.x + PART_SHIFT_PX / 2, back.y + back.height / 2)
    expect(hit).toEqual({ kind: 'commentBox', id: BACK })
  })

  it('in the overlap of two bodies shifted apart, the later box answers', () => {
    const geometry = geometryOf(documentWith([comment(BACK), comment(FRONT, BODY_OFFSET.dx + PART_SHIFT_PX)]))
    const front = bodyOf(geometry, FRONT)
    const back = bodyOf(geometry, BACK)
    const x = (front.x + back.x + back.width) / 2
    expect(x, 'premise: the point is inside both bodies').toBeLessThan(back.x + back.width)
    expect(hitAt(geometry, x, back.y + back.height / 2)).toEqual({ kind: 'commentBox', id: FRONT })
  })
})

describe(`FR-019 highlight box frame -- ${FR_019_ORDER}`, () => {
  it.each([
    [[BACK, FRONT], FRONT],
    [[FRONT, BACK], BACK],
  ])('two frames on one range in the order %j: the later one, %s, answers a press on the left frame line', (order, later) => {
    const geometry = geometryOf(documentWith([], order.map((id) => highlight(id))))
    const box = frameBoxOf(geometry, later)
    expect(hitAt(geometry, box.x, box.y + box.height / 2)).toEqual({ kind: 'highlightBox', id: later })
  })

  it.each([
    [[BACK, FRONT], FRONT],
    [[FRONT, BACK], BACK],
  ])('two frames on one range in the order %j: the later one, %s, answers a press on the top frame line', (order, later) => {
    const geometry = geometryOf(documentWith([], order.map((id) => highlight(id))))
    const box = frameBoxOf(geometry, later)
    expect(hitAt(geometry, box.x + box.width / 2, box.y)).toEqual({ kind: 'highlightBox', id: later })
  })
})
