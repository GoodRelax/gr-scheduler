// DFC-2912 spec-only cases: a GR-14 highlight box drag released on the range the box holds writes nothing (FR-100, T-246 HB-3..HB-12).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressedRowOf,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const TASK_GROUP_A = '2912a000-0000-4000-8000-000000000001'
const TASK_GROUP_B = '2912a000-0000-4000-8000-000000000002'
const TASK_GROUP_C = '2912a000-0000-4000-8000-000000000003'
const TASK_GROUP_D = '2912a000-0000-4000-8000-000000000004'
const TASK_GROUP_E = '2912a000-0000-4000-8000-000000000005'
const TASK_GROUP_F = '2912a000-0000-4000-8000-000000000006'
const HIGHLIGHT_ID = '2912b000-0000-4000-8000-000000000001'

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const PX_PER_DAY_AT_1X = 20 / DEFAULT_DISPLAY_RATIO

// WHY: a box over days 6..16 and task groups B..D, drawn on a six-group screen so every move has room on each side.
const RANGE = { start: day(6), finish: day(16), topTaskGroupId: TASK_GROUP_B, bottomTaskGroupId: TASK_GROUP_D }

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100 },
      calendars: schedule['calendars'],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [TASK_GROUP_A, TASK_GROUP_B, TASK_GROUP_C, TASK_GROUP_D, TASK_GROUP_E, TASK_GROUP_F].map((id, order) => ({
        id,
        parentId: null,
        name: `task group ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [{ id: HIGHLIGHT_ID, ...RANGE, strokeColor: null, cornerRadiusPx: null }],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      zoomX: PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x,
      scrollDate: '2026-04-01',
      scrollDayOffset: 0,
      scrollTaskGroupId: TASK_GROUP_A,
      scrollGroupOffset: 0,
      pinnedTaskGroupIds: [],
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

function drawnLoop(): FrameLoop {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined, showMarqueeOverlaySvg: () => undefined } as never, fixtureDocument(), SCREEN, wiring)
  for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
    for (const callback of waiting.splice(0, waiting.length)) callback(turn)
  }
  return loop
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const highlightRect = (loop: FrameLoop): ScreenRect => {
  const found = frameOf(loop).geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)
  if (found === undefined) throw new Error('the frame drew no highlight box')
  return found.box
}

const band = (loop: FrameLoop, taskGroupId: string): { readonly y: number; readonly height: number } => {
  const found = frameOf(loop).layout.taskGroups.find((one) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no task group ${taskGroupId}`)
  return { y: found.y, height: found.height }
}

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

function contextOf(loop: FrameLoop): InputContext {
  const values = frameOf(loop)
  return {
    document: loop.document(),
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-10-01',
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
}

interface Written {
  readonly kinds: readonly string[]
  readonly commands: readonly Record<string, unknown>[]
  readonly actionKind: string | null
}

const writtenBy = (action: unknown): Written => {
  const one = action as { kind?: string; writes?: readonly (readonly DocumentCommand[])[] } | null
  if (one === null || one === undefined) return { kinds: [], commands: [], actionKind: null }
  const commands = one.kind === 'changeDocument' && one.writes !== undefined ? one.writes.flat() : []
  const records = commands as unknown as readonly Record<string, unknown>[]
  return { kinds: records.map((each) => String(each['kind'])), commands: records, actionKind: one.kind ?? null }
}

// WHY: the press is built the way the shell builds it -- the hit under the point and the press row it gets -- with no premise on which row that is.
// The path is the pointer's travel after the press; the last point is where it is released.
function dragThrough(loop: FrameLoop, press: Point, path: readonly Point[]): { readonly moves: readonly Written[]; readonly release: Written } {
  const context = contextOf(loop)
  const down = pointer('down', press)
  const hit: Hit | null = itemAtPointer(frameOf(loop).geometry, press.x, press.y, grabSizesOf())
  expect(hit, 'the press lands on the highlight box').not.toBeNull()
  expect(hit?.item.kind, 'the press lands on the highlight box').toBe('highlightBox')
  const pressed: PointerPress = { at: down, hit, on: null, pressRow: pressedRowOf({ at: down, hit }, context) }
  const held = { ...context, pressed }
  const moves = path.slice(0, -1).map((at) => writtenBy(commandFromInput(pointer('move', at) as HumanInput, held).action))
  const last = path[path.length - 1] as Point
  const release = writtenBy(commandFromInput(pointer('up', last) as HumanInput, held).action)
  return { moves, release }
}

// WHY: FR-031 -- following the pointer is a picture, not an edit, so no move writes either.
function expectNoWrite(result: { readonly moves: readonly Written[]; readonly release: Written }, what: string): void {
  for (const move of result.moves) {
    expect(move.kinds, `${what}: a move wrote to the document`).toEqual([])
  }
  expect(result.release.actionKind, `${what}: the release raised a document change (FR-100)`).not.toBe('changeDocument')
  expect(result.release.kinds, `${what}: the release wrote setHighlightBoxRange`).not.toContain('setHighlightBoxRange')
  expect(result.release.kinds, `${what}: the release wrote a command`).toEqual([])
}

// WHY: a point on the left frame line, clear of the left-edge midpoint (HB-10) which sits at the box's vertical middle.
const onLeftFrameIn = (loop: FrameLoop, taskGroupId: string, shareOfBand: number): Point => {
  const box = highlightRect(loop)
  const at = band(loop, taskGroupId)
  return { x: box.x, y: at.y + at.height * shareOfBand }
}

describe('premise: the fixture draws a box wide and tall enough for these presses', () => {
  it('the box spans several day columns and bands, and the press points hit it', () => {
    const loop = drawnLoop()
    const box = highlightRect(loop)
    expect(box.width).toBeGreaterThan(4 * pxPerDay(loop))
    expect(box.height).toBeGreaterThan(2 * band(loop, TASK_GROUP_B).height)
    const hit = itemAtPointer(frameOf(loop).geometry, onLeftFrameIn(loop, TASK_GROUP_B, 0.5).x, onLeftFrameIn(loop, TASK_GROUP_B, 0.5).y, grabSizesOf())
    expect(hit?.item.kind).toBe('highlightBox')
  })
})

describe('FR-100 / GR-14 / HB-12 -- a body drag that lands on the held range writes nothing', () => {
  it('FR-100 -- (a) moved down inside the same task group and sideways less than half a day: no document write', () => {
    const loop = drawnLoop()
    const press = onLeftFrameIn(loop, TASK_GROUP_B, 0.3)
    const bandHeight = band(loop, TASK_GROUP_B).height
    const dx = 0.3 * pxPerDay(loop)
    const dy = 0.3 * bandHeight
    const end = { x: press.x + dx, y: press.y + dy }
    expect(end.y, 'premise: still inside task group B').toBeLessThan(band(loop, TASK_GROUP_B).y + bandHeight)
    expectNoWrite(dragThrough(loop, press, [{ x: press.x + dx / 2, y: press.y + dy / 2 }, end]), 'HB-3 / HB-12 down, inside the group')
  })

  // WHY: pressed on the middle of a day column, a sideways pull under half a day lands in the same column on either reading
  // of the amount (FR-103 reads the column the release falls in; HB-4 rounds to the nearest boundary).
  it('FR-100 -- (a) moved up inside the same task group and sideways less than half a day to the left: no document write', () => {
    const loop = drawnLoop()
    const box = highlightRect(loop)
    const bandD = band(loop, TASK_GROUP_D)
    const press = { x: box.x + 3.5 * pxPerDay(loop), y: box.y + box.height - 2 }
    const end = { x: press.x - 0.4 * pxPerDay(loop), y: press.y - 0.4 * bandD.height }
    expect(end.y, 'premise: still inside task group D').toBeGreaterThan(bandD.y)
    expectNoWrite(dragThrough(loop, press, [{ x: press.x - 5, y: press.y - 5 }, end]), 'HB-3 / HB-12 up, inside the group')
  })

  it('FR-100 -- (a) moved only vertically inside the same task group: no document write', () => {
    const loop = drawnLoop()
    const press = onLeftFrameIn(loop, TASK_GROUP_B, 0.3)
    const end = { x: press.x, y: press.y + 0.4 * band(loop, TASK_GROUP_B).height }
    expectNoWrite(dragThrough(loop, press, [end]), 'HB-3 vertical inside the group')
  })

  it('FR-100 -- (b) moved away past the drag threshold and back to the press point, released there: no document write', () => {
    const loop = drawnLoop()
    const press = onLeftFrameIn(loop, TASK_GROUP_B, 0.5)
    const away = { x: press.x + 3 * pxPerDay(loop), y: press.y + 1.5 * band(loop, TASK_GROUP_B).height }
    const half = { x: press.x + 1.5 * pxPerDay(loop), y: press.y + 0.75 * band(loop, TASK_GROUP_B).height }
    expectNoWrite(dragThrough(loop, press, [half, away, half, press]), 'HB-12 away and back')
  })

  it('FR-100 -- (b) pressed and released at the same point with no travel: no document write', () => {
    const loop = drawnLoop()
    const press = onLeftFrameIn(loop, TASK_GROUP_C, 0.2)
    expectNoWrite(dragThrough(loop, press, [press]), 'HB-12 still release')
  })
})

describe('FR-100 / GR-14 -- a grab point released on the boundary it already stands on writes nothing', () => {
  const corners: readonly { readonly name: string; readonly at: (box: ScreenRect) => Point }[] = [
    { name: 'top-left (HB-8)', at: (b) => ({ x: b.x, y: b.y }) },
    { name: 'bottom-right (HB-8)', at: (b) => ({ x: b.x + b.width, y: b.y + b.height }) },
    { name: 'top-right (HB-9)', at: (b) => ({ x: b.x + b.width, y: b.y }) },
    { name: 'bottom-left (HB-9)', at: (b) => ({ x: b.x, y: b.y + b.height }) },
  ]

  it.each(corners)('FR-100 -- (c) the $name corner released on the very point it was pressed: no document write', ({ at }) => {
    const loop = drawnLoop()
    const press = at(highlightRect(loop))
    expectNoWrite(dragThrough(loop, press, [press]), 'HB-4 / HB-5 corner released in place')
  })

  it.each(corners)('FR-100 -- (c) the $name corner moved a little (under half a day, under half a band) and released: no document write', ({ at }) => {
    const loop = drawnLoop()
    const box = highlightRect(loop)
    const press = at(box)
    const end = { x: press.x + 0.3 * pxPerDay(loop), y: press.y + 0.2 * band(loop, TASK_GROUP_B).height }
    expectNoWrite(dragThrough(loop, press, [{ x: press.x + 2, y: press.y + 1 }, end]), 'HB-4 / HB-5 corner nudged')
  })

  it.each(corners)('FR-100 -- (c) the $name corner moved away and back to the press point: no document write', ({ at }) => {
    const loop = drawnLoop()
    const press = at(highlightRect(loop))
    const away = { x: press.x + 2 * pxPerDay(loop), y: press.y + band(loop, TASK_GROUP_B).height }
    expectNoWrite(dragThrough(loop, press, [away, press]), 'HB-4 / HB-5 corner away and back')
  })

  it('FR-100 -- (c) the left edge midpoint (HB-7, HB-10) released on the boundary it stands on: no document write', () => {
    const loop = drawnLoop()
    const box = highlightRect(loop)
    const press = { x: box.x, y: box.y + box.height / 2 }
    expectNoWrite(dragThrough(loop, press, [{ x: press.x + 0.3 * pxPerDay(loop), y: press.y + 3 }]), 'HB-7 left midpoint nudged')
  })

  it('FR-100 -- (c) the top edge midpoint (HB-7, HB-11) released on the boundary it stands on: no document write', () => {
    const loop = drawnLoop()
    const box = highlightRect(loop)
    const press = { x: box.x + box.width / 2, y: box.y }
    expectNoWrite(dragThrough(loop, press, [{ x: press.x + 4, y: press.y + 0.2 * band(loop, TASK_GROUP_B).height }]), 'HB-7 top midpoint nudged')
  })
})

describe('GR-14 controls -- a drag that does change the range still writes setHighlightBoxRange', () => {
  it('HB-3 -- (d) a body drag across one task group top writes the range one task group down', () => {
    const loop = drawnLoop()
    const press = onLeftFrameIn(loop, TASK_GROUP_B, 0.3)
    const end = { x: press.x, y: band(loop, TASK_GROUP_C).y + 0.3 * band(loop, TASK_GROUP_C).height }
    const result = dragThrough(loop, press, [{ x: press.x, y: (press.y + end.y) / 2 }, end])
    expect(result.release.kinds, 'the release wrote setHighlightBoxRange').toContain('setHighlightBoxRange')
    const write = result.release.commands.find((one) => one['kind'] === 'setHighlightBoxRange') as Record<string, unknown>
    const text = JSON.stringify(write)
    expect(text, 'the top edge moved to C').toContain(TASK_GROUP_C)
    expect(text, 'the bottom edge moved to E').toContain(TASK_GROUP_E)
    expect(text, 'the old top edge B is gone').not.toContain(TASK_GROUP_B)
  })

  it('HB-4 -- (e) a corner dragged one day outward writes setHighlightBoxRange', () => {
    const loop = drawnLoop()
    const box = highlightRect(loop)
    const press = { x: box.x + box.width, y: box.y }
    const end = { x: press.x + pxPerDay(loop), y: press.y }
    const result = dragThrough(loop, press, [{ x: press.x + pxPerDay(loop) / 2, y: press.y }, end])
    expect(result.release.kinds, 'the release wrote setHighlightBoxRange').toContain('setHighlightBoxRange')
    const write = result.release.commands.find((one) => one['kind'] === 'setHighlightBoxRange') as Record<string, unknown>
    expect(JSON.stringify(write), 'finish moved one day later, to 17').toContain('2026-04-17')
  })
})
