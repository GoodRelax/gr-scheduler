// PND-235: inside GR-14 a comment box over a highlight box answers first (T-023d closing text, ZO-8/ZO-9).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type CommentGeometry,
  type Point,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const INSIDE_PASSES_THROUGH =
  '⛔ 囲んだ内側を掴み代にしてはならない（MUST NOT） —— 内側の押下は下のタスクへ素通しにすること（MUST）。'
const BODY_NOT_THROUGH =
  '⛔ 本文の箱の中を素通しにしてはならない（MUST NOT） —— 箱は不透明に描くので、素通しにすると見えないタスクを掴むことになる（`FR-108`）。'
const ANCHOR_ON_SHAPES = '⭐ 線先はタスクやマイルストーンの上に置く取っ手なので、描いた形の上でも同じ掴み代で応えること（MUST）。'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const ROW = (n: number): string => `3a000000-0000-4000-8000-00000000000${n}`
const ROWS = [1, 2, 3, 4, 5, 6].map((n, index) => ({
  id: ROW(n),
  parentId: null,
  label: `row ${n}`,
  derivedFromTaskUid: null,
  order: index,
  isCollapsed: false,
  isHidden: false,
  color: null,
  height: null,
}))

const HIGHLIGHT_ID = '3b000000-0000-4000-8000-000000000001'
const COMMENT_ID = '3c000000-0000-4000-8000-000000000001'

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

interface Placing {
  readonly anchorDay: number
  readonly anchorRow: number
  readonly bodyOffsetPx: { readonly dx: number; readonly dy: number }
}

function documentOf(placing: Placing): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100 },
      calendars: schedule['calendars'],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: structuredClone(ROWS),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [
        {
          id: COMMENT_ID,
          leaderShapeKind: 'polyline',
          text: 'Note',
          anchorDate: day(placing.anchorDay),
          anchorGroupId: ROW(placing.anchorRow),
          bodyOffsetPx: { ...placing.bodyOffsetPx },
        },
      ],
      highlightBoxes: [
        {
          id: HIGHLIGHT_ID,
          startDate: day(6),
          endDate: day(20),
          topGroupId: ROW(2),
          bottomGroupId: ROW(5),
          strokeColor: null,
          cornerRadiusPx: null,
        },
      ],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      pxPerDayAt1x: 20 / DEFAULT_DISPLAY_RATIO,
      scrollDate: '2026-04-01',
      scrollDayOffset: 0,
      scrollGroupId: ROW(1),
      scrollGroupOffset: 0,
      pinnedGroupIds: [],
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

function geometryOf(placing: Placing): ScheduleGeometry {
  const document = documentOf(placing)
  const schedule = document.schedule as Schedule
  const settings = document.documentSettings as DocumentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  return geometryFromLayout(schedule, settings, layout, regions, emptySelection())
}

const highlightOf = (geometry: ScheduleGeometry): ScreenRect => {
  const found = geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)
  if (found === undefined) throw new Error('the geometry drew no highlight box')
  return found.box
}

const commentOf = (geometry: ScheduleGeometry): CommentGeometry => {
  const found = geometry.commentBoxes.find((one) => one.id === COMMENT_ID)
  if (found === undefined) throw new Error('the geometry drew no comment box')
  return found
}

const inside = (at: Point, box: ScreenRect, by = 0): boolean =>
  at.x >= box.x + by && at.x <= box.x + box.width - by && at.y >= box.y + by && at.y <= box.y + box.height - by

// WHY: measure once at a zero offset, not guess pixels: the body size follows its text (FR-097).
function placedWithBodyAt(anchorDay: number, anchorRow: number, bottomLeft: (body: ScreenRect, box: ScreenRect) => Point): ScheduleGeometry {
  const first = geometryOf({ anchorDay, anchorRow, bodyOffsetPx: { dx: 0, dy: 0 } })
  const drawn = commentOf(first)
  const offsetDrawn = { x: drawn.body.x - drawn.anchor.x, y: drawn.body.y + drawn.body.height - drawn.anchor.y }
  const target = bottomLeft(drawn.body, highlightOf(first))
  const want = { x: target.x - drawn.anchor.x, y: target.y - drawn.anchor.y }
  const second = geometryOf({ anchorDay, anchorRow, bodyOffsetPx: { dx: want.x - offsetDrawn.x, dy: want.y - offsetDrawn.y } })
  return second
}

const hitAt = (geometry: ScheduleGeometry, at: Point) => itemAtPointer(geometry, at.x, at.y, grabSizesOf())

describe('PND-235 premises: the clauses these cases are driven by', () => {
  it('T-023d still passes the highlight inside through, keeps the comment body opaque, and lets the anchor answer on shapes', () => {
    expect(REQUIREMENTS).toContain(INSIDE_PASSES_THROUGH)
    expect(REQUIREMENTS).toContain(BODY_NOT_THROUGH)
    expect(REQUIREMENTS).toContain(ANCHOR_ON_SHAPES)
  })

  it('T-020 paints the comment box (ZO-9) over the highlight frame (ZO-8)', () => {
    const rows = specTable('T-020').rows
    const zo8 = rows.find((one) => one.id === 'ZO-8')
    const zo9 = rows.find((one) => one.id === 'ZO-9')
    if (zo8 === undefined || zo9 === undefined) throw new Error('table T-020 lost ZO-8 or ZO-9')
    expect(JSON.stringify(zo8.by)).toContain('ハイライトボックスの枠')
    expect(JSON.stringify(zo9.by)).toContain('コメントボックス')
    expect(rows.indexOf(zo9)).toBeGreaterThan(rows.indexOf(zo8))
  })
})

describe('PND-235 -- a comment box over a highlight box inside GR-14', () => {
  it('a press on a comment body that covers a highlight frame grabs the comment box', () => {
    const geometry = placedWithBodyAt(10, 4, (body, box) => ({
      x: box.x + box.width / 2 - body.width / 2,
      y: box.y + body.height / 2,
    }))
    const box = highlightOf(geometry)
    const body = commentOf(geometry).body
    const onFrame: Point = { x: box.x + box.width / 2, y: box.y }
    if (!inside(onFrame, body, 1)) {
      throw new Error(`premise: the frame point ${JSON.stringify(onFrame)} is not under the body ${JSON.stringify(body)}`)
    }
    const hit = hitAt(geometry, onFrame)
    expect(hit?.item, BODY_NOT_THROUGH).toEqual({ kind: 'commentBox', id: COMMENT_ID })
    expect(hit?.grab).toBe('GR-14')
  })

  it('a comment box inside a highlight box interior is grabbed, and the interior itself answers nothing', () => {
    const geometry = placedWithBodyAt(9, 4, (body, box) => ({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2 + body.height / 2,
    }))
    const box = highlightOf(geometry)
    const comment = commentOf(geometry)
    const bodyCentre: Point = { x: comment.body.x + comment.body.width / 2, y: comment.body.y + comment.body.height / 2 }
    for (const corner of [
      { x: comment.body.x, y: comment.body.y },
      { x: comment.body.x + comment.body.width, y: comment.body.y + comment.body.height },
      comment.anchor,
    ]) {
      if (!inside(corner, box, 10)) throw new Error(`premise: the comment is not inside the highlight interior (${JSON.stringify(corner)} vs ${JSON.stringify(box)})`)
    }
    expect(hitAt(geometry, bodyCentre)?.item, 'the comment inside the highlight must stay grabbable').toEqual({
      kind: 'commentBox',
      id: COMMENT_ID,
    })

    const emptyInterior: Point = { x: box.x + 12, y: box.y + box.height - 12 }
    if (inside(emptyInterior, comment.body, -8)) throw new Error('premise: the empty interior point touches the comment body')
    expect(hitAt(geometry, emptyInterior), INSIDE_PASSES_THROUGH).toBeNull()
  })

  it('a comment anchor within a highlight corner margin grabs the anchor', () => {
    const drawn = geometryOf({ anchorDay: 3, anchorRow: 2, bodyOffsetPx: { dx: 60, dy: -60 } })
    const anchor = commentOf(drawn).anchor
    const box = highlightOf(drawn)
    const nudge = grabSizesOf()['S-230'] / 2
    // WHY: move the drawn box, not the stored range: a row's half height already equals both reaches added.
    for (const side of [1, -1]) {
      const corner: Point = { x: anchor.x + side * nudge, y: anchor.y + side * nudge }
      const geometry: ScheduleGeometry = {
        ...drawn,
        highlightBoxes: drawn.highlightBoxes.map((one) =>
          one.id === HIGHLIGHT_ID ? { ...one, box: { ...box, x: corner.x, y: corner.y } } : one,
        ),
      }
      const hit = hitAt(geometry, anchor)
      expect(hit?.item, `corner at ${side > 0 ? 'lower right' : 'upper left'} of the anchor`).toEqual({
        kind: 'commentBox',
        id: COMMENT_ID,
      })
      expect(hit?.boxPart, ANCHOR_ON_SHAPES).toEqual({ kind: 'anchor' })
    }
  })
})
