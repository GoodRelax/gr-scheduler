// CR-541: where a comment box stands when its offset or its anchor date is null (FR-019).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { REQUIREMENTS, rowDocument, SCREEN } from './cr-541-stage'

const Q23 = '⭐ ずれが `null` の箱（まだ一度も引かれていない箱）は、ずれを `{ dx: 0, dy: 0 }` として置くこと（MUST）'
const Q24 = '⭐ 留める日（`_assets/fig-erd-detail.md` の `AT-113`）が `null` の箱も描き、掴めるようにすること（MUST）'
const Q25 = '⭐ そのときは、留める行の、文書の開始日（同書の `AT-12`、`Project.startDate`）の位置を留めた点とすること（MUST）'

const box = (id: string, anchorGroupId: string, anchorDate: string | null, text: string | null) => ({
  id,
  leaderShapeKind: null,
  text,
  anchorDate,
  anchorGroupId,
  bodyOffsetPx: null,
})

function drawn(commentBoxes: readonly Record<string, unknown>[]) {
  const document = rowDocument(
    [
      { id: 'row-1', parentId: null },
      { id: 'row-2', parentId: null },
      { id: 'row-3', parentId: null },
    ],
    { scrollDate: '2026-03-23' },
    { tasks: [], taskGroupMembers: [], commentBoxes },
  ) as unknown as Document
  const settings = document.documentSettings
  const regions = regionsFromScreen(SCREEN as never, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const geometry = geometryFromLayout(document.schedule, settings, layout, regions, emptySelection())
  const rowY = (id: string): number => {
    const found = layout.rows.find((one) => one.groupId === id)
    if (found === undefined) throw new Error(`row ${id} is not drawn`)
    return found.y
  }
  return { document, geometry, rowY }
}

const commentOf = (geometry: ReturnType<typeof drawn>['geometry'], id: string) =>
  geometry.commentBoxes.find((one) => one.id === id)

describe('CR-541 -- the clauses still stand in the manuscript', () => {
  it.each([Q23, Q24, Q25])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('FR-019 -- a box with no offset', () => {
  it(Q23, () => {
    const { geometry } = drawn([box('c-dated', 'row-2', '2026-04-08', 'a note')])
    const comment = commentOf(geometry, 'c-dated')
    expect(comment, 'premise: the box is drawn').toBeDefined()
    expect(comment!.body.x, 'the body\'s left edge stands on the anchored point').toBeCloseTo(comment!.anchor.x, 6)
    expect(comment!.body.y + comment!.body.height, 'the body\'s lower edge stands on the anchored point').toBeCloseTo(
      comment!.anchor.y,
      6,
    )
  })
})

describe('FR-019 -- a box with no anchor date', () => {
  it(Q24, () => {
    const { geometry } = drawn([box('c-dateless', 'row-2', null, 'a dateless note')])
    const comment = commentOf(geometry, 'c-dateless')
    expect(comment, 'the box is drawn').toBeDefined()
    const inside = { x: comment!.body.x + comment!.body.width / 2, y: comment!.body.y + comment!.body.height / 2 }
    const hit = itemAtPointer(geometry, inside.x, inside.y, grabSizesOf())
    expect(hit?.item, 'a press on its body takes the box').toEqual({ kind: 'commentBox', id: 'c-dateless' })
  })

  it(Q25, () => {
    const { document, geometry, rowY } = drawn([
      box('c-dateless', 'row-1', null, 'a dateless note'),
      box('c-on-start', 'row-3', document_start(), 'a note on the start date'),
    ])
    const dateless = commentOf(geometry, 'c-dateless')
    const onStart = commentOf(geometry, 'c-on-start')
    expect(dateless, 'premise: the dateless box is drawn').toBeDefined()
    expect(onStart, 'premise: the twin on the start date is drawn').toBeDefined()
    expect(document.schedule.project.startDate?.slice(0, 10)).toBe(document_start())
    expect(dateless!.anchor.x, 'the point is at the document start date').toBeCloseTo(onStart!.anchor.x, 6)
    expect(dateless!.anchor.y - rowY('row-1'), 'on its own row').toBeCloseTo(onStart!.anchor.y - rowY('row-3'), 6)
  })
})

function document_start(): string {
  return String(rowDocument([{ id: 'x', parentId: null }]).schedule.project.startDate).slice(0, 10)
}
