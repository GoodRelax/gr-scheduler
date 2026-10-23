// DFC-2951 spec-only cases: a comment box placed with the armed press (AR-5) is written with the S-600 offset so its tip and leader stand out at the lower left (FR-019, LF-17), is selected at once with the focus in the PR-21 text field (createdCommentBoxSelected), and shows the PK-8 palm over its body and leader (FR-106).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { KeyInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import { leaderOf, type CommentGeometry, type Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { pointerOf } from '../unit/cr-541-stage'
import { pointer, restoreAnimationFrames, stage as hoverStage, type Stage as HoverStage } from '../unit/cr-430-stage'
import { windowStage, type WindowStage } from './cr-731-window-stage'
import { COMMENT_ID, april, bandOf, columnLeft, commentDrawn, commentRow, documentWith, frameOf, groupOf, tipOf } from './cr-777-stage'
import { specTable, unbroken } from './spec-table'

afterEach(restoreAnimationFrames)

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))
const STATE_MACHINES = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-state-machines.md'), 'utf8'))

// see FR-019, CM-46, S-600
const FR_019_PLACED_OFFSET =
  '置くとき（`_assets/tbl-document-commands.md` の 表 T-108 の `CM-46`）は、本文のずれを `{ dx: S-600, dy: −S-600 }` とすること（MUST） —— 本文の箱を線先から右上へずらし、線先と引出し線を箱の左下から外へ出す'
// see FR-019, LF-17
const FR_019_ZERO_HAS_NO_LEADER = 'ずれ 0 の箱は線先が本文の箱の左下隅に重なり、引出し線が描かれない'
// see FR-019, AR-5, PR-21
const FR_019_SELECT_AND_FOCUS =
  '構えて置いたとき（表 T-023b の `AR-5`）は、置いたコメントボックスを選び、プロパティパネルを出して本文の欄（`_assets/tbl-property-items.md` の 表 T-016 の `PR-21`）に焦点を置くこと（MUST）'
// see LF-17
const LF_17_INSIDE_NO_LEADER = '留めた点が本文の箱の中（縁を含む）に在るときは、引出し線を描かない'
// see FR-019, AR-5
const SM_CREATED_FROM_NOTHING = '→ `objectsSelected`（`selectedObjects` は置いたコメントボックス 1 つ）'
const SM_CREATED_REPLACES = '→ 自己（`selectedObjects` を置いたコメントボックス 1 つに置き換える）'
// see FR-106, PK-8
const FR_106_PALM =
  'コメントボックスの本体と引出し線の掴み代（表 T-023d の `GR-14`、`_assets/tbl-settings.md` の 表 T-206 の `S-291`）では、表 T-269 の `PK-8` とすること（MUST）'
const FR_106_MOVE =
  'コメントボックスの線先の掴み代（表 T-023d の `GR-14`、`_assets/tbl-settings.md` の 表 T-206 の `S-292`）では、表 T-269 の `PK-11` とすること（MUST）'

// see T-217, S-600
const S_600 = ((): number => {
  const row = specTable('T-217').rows.find((one) => one.id === 'S-600')
  const found = /[0-9]+/.exec((row?.by['既定'] ?? '').replace(/`/g, ''))
  if (found === null) throw new Error('table T-217 row S-600 holds no number')
  return Number(found[0])
})()

// see T-269, PK-8, PK-11
const PALM = 'grab'
const MOVE = ((): string => {
  const cell = specTable('T-269').rows.find((one) => one.id === 'PK-11')?.by['形'] ?? ''
  const found = /`([a-z-]+)`/.exec(cell)
  if (found === null) throw new Error('table T-269 PK-11 names no environment shape')
  return found[1] as string
})()

const BODY_FIELD = 'PR-21'
// WHY: task group of Task 3 in the cr-777 document; 27 April is right of every task, so the press snaps to nothing (AR-5).
const FREE_GROUP = groupOf(3)
const FREE_DAY = april(27)
const PIXEL = 0.5
// WHY: a stored box on the band of Task 4, right of every task, so its body lies inside the Task Group Area and over no figure.
const OLD_TEXT = 'Note of the box pressed before'
const lowBox = (): Record<string, unknown> =>
  commentRow({ anchorTaskGroupId: groupOf(4), anchorDate: april(24, '00:00:00'), text: OLD_TEXT })

const freePointOf = (built: { loop: Parameters<typeof frameOf>[0] }): Point => {
  const band = bandOf(built.loop, FREE_GROUP)
  return { x: columnLeft(built.loop, FREE_DAY) + 0.4 * frameOf(built.loop).layout.pxPerDay, y: band.y + 0.4 * band.height }
}

const insideArea = (loop: Parameters<typeof frameOf>[0], rect: { x: number; y: number; width: number; height: number }): boolean => {
  const area = frameOf(loop).regions.taskGroupArea
  return rect.x >= area.x && rect.y >= area.y && rect.x + rect.width <= area.x + area.width && rect.y + rect.height <= area.y + area.height
}

// WHY: the stage's key() hands any input to the frame loop and turns the frames; a pointer goes the same road.
const pointAt = (built: WindowStage, phase: 'down' | 'up', x: number, y: number): Promise<void> =>
  built.key(pointerOf(phase, x, y) as unknown as KeyInput)

async function placedOn(document: Document): Promise<{ built: WindowStage; at: Point }> {
  const built = await windowStage(document)
  const at = freePointOf(built)
  const area = frameOf(built.loop).regions.taskGroupArea
  if (at.x < area.x || at.x > area.x + area.width || at.y < area.y || at.y > area.y + area.height) {
    throw new Error(`premise: the free point ${JSON.stringify(at)} is inside the Task Group Area`)
  }
  await built.press('IC-35')
  await pointAt(built, 'down', at.x, at.y)
  await pointAt(built, 'up', at.x, at.y)
  return { built, at }
}

const placedBoxOf = (built: WindowStage): CommentGeometry => {
  const boxes = built.loop.document().schedule.commentBoxes
  if (boxes.length !== 1) throw new Error(`premise: one comment box placed, found ${boxes.length}`)
  const drawn = commentDrawn(built.loop, boxes[0]!.id)
  if (drawn === null) throw new Error('premise: the placed box is drawn')
  return drawn
}

describe('DFC-2951 premise -- the spec still says what these cases check', () => {
  it.each([
    ['FR-019 placed offset', REQUIREMENTS, FR_019_PLACED_OFFSET],
    ['FR-019 zero offset draws no leader', REQUIREMENTS, FR_019_ZERO_HAS_NO_LEADER],
    ['FR-019 select and focus PR-21', REQUIREMENTS, FR_019_SELECT_AND_FOCUS],
    ['LF-17 no leader from inside', DESIGN, LF_17_INSIDE_NO_LEADER],
    ['createdCommentBoxSelected from nothingSelected', STATE_MACHINES, SM_CREATED_FROM_NOTHING],
    ['createdCommentBoxSelected from objectsSelected', STATE_MACHINES, SM_CREATED_REPLACES],
    ['FR-106 PK-8 on body and leader', REQUIREMENTS, FR_106_PALM],
    ['FR-106 PK-11 on the tip', REQUIREMENTS, FR_106_MOVE],
  ])('%s', (_name, text, clause) => {
    expect(text).toContain(clause)
  })

  it('T-217 S-600 is a positive whole number of px', () => {
    expect(Number.isInteger(S_600)).toBe(true)
    expect(S_600).toBeGreaterThan(0)
  })
})

describe('FR-019 / CM-46 / S-600 -- the armed press (AR-5) stores the body offset { dx: S-600, dy: -S-600 }', () => {
  it('the placed box holds bodyOffsetPx = { dx: S-600, dy: -S-600 }, not null and not zero', async () => {
    const { built } = await placedOn(documentWith([]))
    const stored = built.loop.document().schedule.commentBoxes
    expect(stored).toHaveLength(1)
    expect(stored[0]!.bodyOffsetPx).toEqual({ dx: S_600, dy: -S_600 })
  })

  it('FR-019 / LF-17: the drawn tip stands S-600 left of and S-600 below the bottom-left corner of the body', async () => {
    const { built } = await placedOn(documentWith([]))
    const box = placedBoxOf(built)
    expect(box.body.x - box.anchor.x).toBeCloseTo(S_600, 1)
    expect(box.anchor.y - (box.body.y + box.body.height)).toBeCloseTo(S_600, 1)
  })

  it('FR-019 / LF-17: the tip is outside the body, so a leader is drawn from the tip to the bottom-left corner', async () => {
    const { built } = await placedOn(documentWith([]))
    const box = placedBoxOf(built)
    const leader = leaderOf(box)
    expect(leader, 'a leader is drawn').not.toBeNull()
    const first = leader![0]!
    const last = leader![leader!.length - 1]!
    expect(first.x).toBeCloseTo(box.anchor.x, 1)
    expect(first.y).toBeCloseTo(box.anchor.y, 1)
    expect(last.x).toBeCloseTo(box.body.x, 1)
    expect(last.y).toBeCloseTo(box.body.y + box.body.height, 1)
  })

  it('FR-019: the tip stands where the press was made (the offset moves the body, not the tip)', async () => {
    const { built, at } = await placedOn(documentWith([]))
    const box = placedBoxOf(built)
    expect(Math.abs(box.anchor.x - at.x)).toBeLessThanOrEqual(PIXEL)
    expect(Math.abs(box.anchor.y - at.y)).toBeLessThanOrEqual(PIXEL)
  })

  it('control (FR-019 zero offset, LF-17): a box stored with offset { 0, 0 } draws no leader', () => {
    const built = hoverStage(documentWith([commentRow({ bodyOffsetPx: { dx: 0, dy: 0 } })]))
    const box = commentDrawn(built.loop)
    expect(box).not.toBeNull()
    expect(leaderOf(box!)).toBeNull()
  })
})

describe(`FR-019 / AR-5: ${FR_019_SELECT_AND_FOCUS}`, () => {
  it('the properties panel is up showing the selection, and its fields are those of a comment box (PR-21 among them)', async () => {
    const { built } = await placedOn(documentWith([]))
    const panel = built.last().propertiesPanel
    expect(panel, 'the panel is up').not.toBeNull()
    expect(panel!.showing).toBe('selection')
    expect(panel!.fields.map((one) => one.row)).toContain(BODY_FIELD)
  })

  it('the focus stands in the PR-21 text field of the panel (the element the browser focuses)', async () => {
    const { built } = await placedOn(documentWith([]))
    expect(built.focusedRow()).toBe(BODY_FIELD)
  })

  it('the panel shows the placed box alone, even when another comment box was pressed (selected) before', async () => {
    const built = await windowStage(documentWith([lowBox()]))
    const other = commentDrawn(built.loop)!.body
    expect(insideArea(built.loop, other), 'premise: the old body lies inside the Task Group Area').toBe(true)
    await pointAt(built, 'down', other.x + other.width / 2, other.y + other.height / 2)
    await pointAt(built, 'up', other.x + other.width / 2, other.y + other.height / 2)
    const at = freePointOf(built)
    await built.press('IC-35')
    await pointAt(built, 'down', at.x, at.y)
    await pointAt(built, 'up', at.x, at.y)
    const boxes = built.loop.document().schedule.commentBoxes
    expect(boxes).toHaveLength(2)
    const panel = built.last().propertiesPanel
    expect(panel?.showing).toBe('selection')
    const bodyFields = panel?.fields.filter((one) => one.row === BODY_FIELD) ?? []
    expect(bodyFields, 'the panel shows one body field').toHaveLength(1)
    expect(bodyFields[0]!.text, 'the body field is the placed box, not the one pressed before').not.toBe(OLD_TEXT)
    expect(built.focusedRow()).toBe(BODY_FIELD)
  })
})

// WHY: the selection region of the session, read as the table of selectionStateMachine prints it.
type Loose = Record<string, unknown>
const CREATED = { type: 'createdCommentBoxSelected', createdCommentBoxId: 'box-new' } as unknown as SessionEvent
const withSelection = (selectionState: Loose): ScreenSession => {
  const base = emptyScreenSession as unknown as Loose
  return { ...base, selection: { ...(base['selection'] as Loose), selectionState } } as unknown as ScreenSession
}
const selectionAfter = (session: ScreenSession): Loose =>
  ((advanceScreenSession(session, CREATED).state as unknown as Loose)['selection'] as Loose)['selectionState'] as Loose

describe('selectionStateMachine: createdCommentBoxSelected', () => {
  it(`nothingSelected ${SM_CREATED_FROM_NOTHING}`, () => {
    const after = selectionAfter(withSelection({ kind: 'nothingSelected' }))
    expect(after['kind']).toBe('objectsSelected')
    expect((after['selectedObjects'] as Loose)['items']).toEqual([{ kind: 'commentBox', id: 'box-new' }])
  })

  it(`objectsSelected ${SM_CREATED_REPLACES}`, () => {
    const after = selectionAfter(
      withSelection({
        kind: 'objectsSelected',
        selectedObjects: { items: [{ kind: 'task', uid: 1 }, { kind: 'commentBox', id: 'box-old' }], isOrdered: true },
      }),
    )
    expect(after['kind']).toBe('objectsSelected')
    expect((after['selectedObjects'] as Loose)['items']).toEqual([{ kind: 'commentBox', id: 'box-new' }])
  })
})

// see FR-106, T-269
const lastShape = (built: HoverStage, at: Point): string | null => {
  built.send(pointer('move', at.x, at.y))
  const all = built.shown()
  return all.length === 0 ? null : (all[all.length - 1] ?? null)
}
const hovered = (): { built: HoverStage; box: CommentGeometry } => {
  const built = hoverStage(documentWith([lowBox()]))
  const box = commentDrawn(built.loop, COMMENT_ID)
  if (box === null) throw new Error('premise: the comment box is drawn')
  if (!insideArea(built.loop, box.body)) throw new Error('premise: the body lies inside the Task Group Area')
  return { built, box }
}

describe(`FR-106: ${FR_106_PALM}`, () => {
  it('the middle of the body shows the palm (PK-8)', () => {
    const { built, box } = hovered()
    expect(lastShape(built, { x: box.body.x + box.body.width / 2, y: box.body.y + box.body.height / 2 })).toBe(PALM)
  })

  it('a point near the top-right corner inside the body shows the palm (PK-8)', () => {
    const { built, box } = hovered()
    expect(lastShape(built, { x: box.body.x + box.body.width - 2, y: box.body.y + 2 })).toBe(PALM)
  })

  it('the middle of the leader shows the palm (PK-8)', () => {
    const { built, box } = hovered()
    const leader = leaderOf(box)
    if (leader === null || leader.length < 2) throw new Error('premise: the box draws a leader')
    const a = leader[0]!
    const b = leader[1]!
    expect(lastShape(built, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })).toBe(PALM)
  })

  it(`control (${FR_106_MOVE}): the tip shows the move shape, not the palm`, () => {
    const { built } = hovered()
    expect(lastShape(built, tipOf(built.loop))).toBe(MOVE)
  })
})
