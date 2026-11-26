// Unit tests: SL-3 and ZO-6 draw the range-selection rectangle while it is held and drop it on release.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture builds documents from the untyped template and patches requestAnimationFrame */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

function rowOf(tableId: string, specTableRowId: string): Readonly<Record<string, string>> {
  const found = specTable(tableId).rows.find((one) => one.id === specTableRowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${specTableRowId}`)
  return found.by
}

function ruleOf(tableId: string, specTableRowId: string): string {
  const found = specTable(tableId).rows.find((one) => one.id === specTableRowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${specTableRowId}`)
  const cell = found.cells[found.cells.length - 2]
  if (cell === undefined || cell.length === 0) {
    throw new Error(`table ${tableId} row ${specTableRowId} states nothing`)
  }
  return cell
}

const numbersIn = (cell: string): readonly number[] =>
  (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

const oneNumberOf = (where: string, cell: string): number => {
  const found = numbersIn(cell)
  const [only, ...rest] = found
  if (only === undefined || rest.length !== 0) {
    throw new Error(`${where}: the value is not one number, it is ${cell}`)
  }
  return only
}

const FRAME_STROKE = oneNumberOf('table T-206 row S-174', rowOf('T-206', 'S-174')['既定'] ?? '')

const FRAME_DASH: readonly number[] = (() => {
  const cell = rowOf('T-206', 'S-175')['既定'] ?? ''
  const found = numbersIn(cell)
  if (found.length !== 2) {
    throw new Error(`table T-206 row S-175: the dash is not a pair of numbers, it is ${cell}`)
  }
  return found
})()

// Why: BT-4 (FR-027) gives the calendar, the project and the settings; the task
// groups and the Task are written out here so that what is drawn can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

// Why: AT-51 types TaskGroup.id as a UUID, so the fixture ids are UUIDs.
const TASK_GROUPS = [
  '4a000000-0000-4000-8000-000000000001',
  '4a000000-0000-4000-8000-000000000002',
  '4a000000-0000-4000-8000-000000000003',
  '4a000000-0000-4000-8000-000000000004',
  '4a000000-0000-4000-8000-000000000005',
  '4a000000-0000-4000-8000-000000000006',
] as const

const ALPHA_UID = 1
const ALPHA_NAME = 'Alpha'
const ALPHA_TASK_GROUP = TASK_GROUPS[2] as string

const BAND_ABOVE = TASK_GROUPS[0] as string
const BAND_BELOW = TASK_GROUPS[4] as string

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const PX_PER_DAY_AT_1X = 20

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
    parentTaskUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  name: label,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', color: null,
  minHeightPx: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        // Why: no status date: the CU-1 line runs the height of the Task Group Area and
        // would cross every drag below.
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      // Why: the Task has a name so the ZO-5 label is in the picture; it is the
      // frontmost thing ZO-6 must stand in front of.
      tasks: [task({ uid: ALPHA_UID, name: ALPHA_NAME, start: day(8), finish: day(16) })],
      resources: [],
      assignments: [],
      taskGroups: TASK_GROUPS.map((id, i) => group(id, i, `R${i + 1}`)),
      taskGroupMembers: [{ taskUid: ALPHA_UID, taskGroupId: ALPHA_TASK_GROUP }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      // Why: S-1 is a constant; the stored zoomX (S-75) carries the day width this fixture draws at.
      zoomX: PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x,
      // Why: pinned so every y below reads from the top of a band.
      stackDirection: 'down',
      scrollDate: '2026-04-01',
      scrollDateFraction: 0,
      scrollTaskGroupId: TASK_GROUPS[0],
      scrollTaskGroupFraction: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  readonly pictures: readonly string[]
  overlay(): string
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: host() drains the requestAnimationFrame queue on demand and keeps every picture it is handed.
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  const pictures: string[] = []
  let overlay = ''
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: {
      showSvg: (svg: string) => {
        pictures.push(svg)
      },
      showMarqueeOverlaySvg: (svg: string) => {
        overlay = svg
      },
    },
    pictures,
    overlay: () => overlay,
    runAnimationFrames: () => {
      // Why: bounded, so a loop that asks for a frame inside a frame, which NFR-010
      // forbids, ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

// Why: the surface answers null everywhere, so every press lands on the schedule's
// drawing area, the one place table T-023a rules.
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton; readonly ctrl?: boolean } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS, ctrl: options.ctrl ?? false },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  picture(): string
  drawn(): number
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, screenPane())
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // Why: the first frame is owed by the loop being made, not by FT-3, so it is
  // drained before any case reads the picture.
  pen.runAnimationFrames()
  const picture = (): string => {
    const last = pen.pictures[pen.pictures.length - 1]
    if (last === undefined) throw new Error('the loop has drawn nothing at all')
    return last + pen.overlay()
  }
  return { loop, send, picture, drawn: () => pen.pictures.length }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

function bandOf(loop: FrameLoop, taskGroupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as any).taskGroups.find((one: any) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no band for task group ${taskGroupId}`)
  return { y: found.y as number, height: found.height as number }
}

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

// Summary: boxOfBar() bounds a bar in either T-012 form, an area to fill or a line with ends.
function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  if (points.length === 0) throw new Error(`${what} came out with no points`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const planBox = (loop: FrameLoop): Box => boxOfBar(drawnTask(loop, ALPHA_UID).plan, "Alpha's bar")

// Why: SL-1 excludes task groups from the targets, so a press in an empty band
// hits nothing.
const pressPoint = (loop: FrameLoop): Point => {
  const band = bandOf(loop, BAND_ABOVE)
  return { x: planBox(loop).x0 - 40, y: band.y + band.height / 2 }
}

const enclosingPoint = (loop: FrameLoop): Point => {
  const band = bandOf(loop, BAND_BELOW)
  return { x: planBox(loop).x1 + 40, y: band.y + band.height / 2 }
}

const emptyDragPoint = (loop: FrameLoop): Point => {
  const band = bandOf(loop, TASK_GROUPS[1] as string)
  return { x: planBox(loop).x0 - 15, y: band.y + band.height / 2 }
}

interface Element {
  readonly tag: string
  // Why: where the element opens in the string is its place in the paint order.
  readonly at: number
  readonly text: string
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const scan = /<([a-zA-Z][\w-]*)\b[^>]*>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    out.push({ tag: hit[1] as string, at: hit.index, text: hit[0] })
    hit = scan.exec(svg)
  }
  return out
}

const attribute = (element: string, name: string): string | null => {
  const hit = new RegExp(`\\b${name}="([^"]*)"`).exec(element)
  return hit === null ? null : (hit[1] as string)
}

const paintedOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter((drawn) => drawn.tag !== 'svg')

// Why: a second drawing of the same picture may spell a marker id and its url()
// reference differently, so both are blanked before comparing.
const settledText = (element: Element): string =>
  element.text.replace(/(id="|url\(#)[^"')]*/g, '$1')

const onlyIn = (picture: string, other: string): readonly Element[] => {
  const there = paintedOf(other).map(settledText)
  return paintedOf(picture).filter((drawn) => !there.includes(settledText(drawn)))
}

const dashedRectsIn = (elements: readonly Element[]): readonly Element[] =>
  elements.filter((drawn) => drawn.tag === 'rect' && attribute(drawn.text, 'stroke-dasharray') !== null)

const numberAttribute = (element: Element, name: string): number => {
  const stated = attribute(element.text, name)
  if (stated === null) throw new Error(`this element states no ${name}: ${element.text}`)
  return Number(stated)
}

// Why: found as the one dashed rect the held drag added, so the case names no
// markup of its own.
function marqueeOf(held: string, before: string): Element {
  const added = onlyIn(held, before)
  const rects = dashedRectsIn(added)
  if (rects.length !== 1) {
    throw new Error(
      'table T-023c SL-3: 握っているあいだ、取ろうとしている矩形を描くこと（MUST） -- ' +
        `the held picture added ${added.length} element(s), ${rects.length} of them a dashed rect`,
    )
  }
  return rects[0] as Element
}

// Why: found by the name itself: T-273 draws the label inside the shape and the
// fixture holds one named Task, so the text is the only handle.
function labelStartsAt(svg: string): number {
  const written = svg.indexOf(ALPHA_NAME)
  if (written < 0) {
    throw new Error(`the picture draws no label for ${ALPHA_NAME}, so ZO-5 is not in it`)
  }
  const opens = svg.lastIndexOf('<', written)
  if (opens < 0) throw new Error('the label is not inside an element')
  return opens
}

function boxOfElement(element: Element): Box | null {
  const number = (name: string): number => Number(attribute(element.text, name))
  if (element.tag === 'rect') {
    const x = number('x')
    const y = number('y')
    const w = number('width')
    const h = number('height')
    if ([x, y, w, h].some((one) => !Number.isFinite(one))) return null
    return { x0: x, x1: x + w, y0: y, y1: y + h }
  }
  if (element.tag === 'polygon' || element.tag === 'polyline') {
    const stated = attribute(element.text, 'points')
    if (stated === null) return null
    const found = (stated.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    if (found.length < 4) return null
    const xs = found.filter((_, i) => i % 2 === 0)
    const ys = found.filter((_, i) => i % 2 === 1)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }
  return null
}

// Why: found by its geometry: the element standing on the box the frame gave the
// plan bar is the bar, whichever T-012 form it took.
function planBarStartsAt(loop: FrameLoop, svg: string): number {
  const wanted = planBox(loop)
  const near = (a: number, b: number): boolean => Math.abs(a - b) <= CORNER_PX
  const found = paintedOf(svg).filter((element) => {
    const box = boxOfElement(element)
    return (
      box !== null &&
      near(box.x0, wanted.x0) &&
      near(box.x1, wanted.x1) &&
      near(box.y0, wanted.y0) &&
      near(box.y1, wanted.y1)
    )
  })
  const first = found[0]
  if (first === undefined) {
    throw new Error('no element of the picture stands on the box the frame gave the plan bar')
  }
  return first.at
}

const askedFor = (from: Point, to: Point): Box => ({
  x0: Math.min(from.x, to.x),
  x1: Math.max(from.x, to.x),
  y0: Math.min(from.y, to.y),
  y1: Math.max(from.y, to.y),
})

// Why: one pixel is this file's own figure: no row states one and SL-3 raises no
// new value, so it only absorbs rounding.
const CORNER_PX = 1

// Why: a unit case, not TS-3: TW-2 needs an SWS parent, and none of SWS-1, SWS-2,
// SWS-3, SWS-4, SWS-5, SWS-6, SWS-7 or SWS-8 reaches a range selection.
// Spec: SL-3, ZO-6, S-174, S-175, S-151
describe('the manuscript still states the two rules this file is about', () => {
  it('has SL-3 draw the rectangle being taken while the drag is held (MUST)', () => {
    const rule = ruleOf('T-023c', 'SL-3')
    expect(
      rule,
      'table T-023c SL-3: 握っているあいだ、取ろうとしている矩形を描くこと（MUST）',
    ).toContain('範囲で選ぶドラッグを握っている間、`GRS` は、取ろうとしている矩形を描くこと')
    expect(rule, 'and the reason it gives').toContain(
      '描かないと、「完全に囲まれた」かどうかを人が離す前に確かめられない',
    )
  })

  it('sends the four values SL-3 names to rows that already exist', () => {
    const rule = ruleOf('T-023c', 'SL-3')
    for (const named of ['S-174', 'S-175', 'S-151', 'ZO-6']) {
      expect(rule, `table T-023c SL-3 names ${named}`).toContain(named)
    }
    expect(rule, 'table T-023c SL-3: ⛔ 新しい値を起こさない').toContain('新しい値を起こさない')
    expect(rule, 'table T-023c SL-3: どれも `SL-8` の選択の枠が既に読んでいる行である').toContain(
      '`SL-8` の選択の枠が既に読んでいる行である',
    )
    expect(FRAME_STROKE, 'table T-206 S-174 -- 選択の枠の太さ').toBeGreaterThan(0)
    expect(FRAME_DASH.length, 'table T-206 S-175 -- 描く長さと空ける長さの組').toBe(2)
    expect(rowOf('T-236', 'S-151')['色'], 'table T-236 S-151 -- 強調の色').toContain('強調')
  })

  it('puts ZO-6 at the front of the stacking order, and only while it is held', () => {
    const table = specTable('T-020')
    const last = table.rows[table.rows.length - 1]
    expect(last?.id, 'table T-020 is ordered 背面から前面へ, so the front row is the last').toBe(
      'ZO-6',
    )
    const rule = ruleOf('T-020', 'ZO-6')
    expect(rule, 'table T-020 ZO-6: 範囲選択の矩形（表 T-023c の `SL-3`）').toContain('SL-3')
    expect(rule, 'table T-020 ZO-6: 握っているあいだだけ描き、離したら消すこと（MUST）').toContain(
      '範囲選択（表 T-023c の `SL-3`）で押下を握っている間だけ、`GRS` は範囲選択の矩形を描くこと',
    )
    expect(rule, 'and the reason it gives').toContain(
      '離した時点で残るのは選択そのものであり、矩形ではない',
    )
    expect(rowOf('T-020', 'ZO-6')['順'], 'table T-020 ZO-6: 6（最前面）').toContain('最前面')
  })

  // Spec: PTD-5, PTD-7, AR-1
  it('leaves the range selection to a plain drag on empty ground (PTD-5)', () => {
    const rows = specTable('T-023a').rows.map((one) => one.id)
    expect(rows[0], 'table T-023a: 上から評価し、最初に成立した行で確定すること（MUST）').toBe(
      'PTD-7',
    )
    expect(rows[rows.length - 1], 'table T-023a: PTD-5 is the last row, reached only when nothing above held').toBe('PTD-5')
    const found = specTable('T-023a').rows.find((one) => one.id === 'PTD-5')
    expect(found?.by['結果'], 'table T-023a PTD-5: 範囲選択').toContain('範囲選択')
  })
})

describe('the fixture gives a drag empty ground to start on and a Task to enclose', () => {
  it('draws the Task, with the press point clear of it', () => {
    const built = stage()
    const box = planBox(built.loop)
    expect(box.x1, 'Alpha is drawn').toBeGreaterThan(box.x0)
    const at = pressPoint(built.loop)
    const inside = at.x >= box.x0 && at.x <= box.x1 && at.y >= box.y0 && at.y <= box.y1
    // Why: a press that landed on the Task would be PTD-3's, and every case below
    // would be measuring a grab.
    expect(inside, 'the press point stands on the Task').toBe(false)
  })

  it('lets one drag enclose the Task completely, and another enclose nothing', () => {
    const built = stage()
    const box = planBox(built.loop)
    const around = askedFor(pressPoint(built.loop), enclosingPoint(built.loop))
    expect(around.x0).toBeLessThan(box.x0)
    expect(around.x1).toBeGreaterThan(box.x1)
    expect(around.y0).toBeLessThan(box.y0)
    expect(around.y1).toBeGreaterThan(box.y1)
    const empty = askedFor(pressPoint(built.loop), emptyDragPoint(built.loop))
    expect(empty.x1, 'the empty drag stops short of the Task').toBeLessThan(box.x0)
  })
})

// Why: the markup, a literal colour, what a release takes, SL-4's Shift and the
// clipping edge are unstated or other rows', so no case asserts them.
// Spec: SL-3, SL-8, S-174, S-175, S-151
describe('table T-023c SL-3: the rectangle being taken is drawn while it is held', () => {
  it('adds one rectangle to the picture that was not there before (MUST)', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    // Why: marqueeOf() itself fails with the row quoted when no such rectangle is drawn.
    const rect = marqueeOf(built.picture(), before)
    expect(rect.tag).toBe('rect')
  })

  it('draws it on the two corners of the drag -- the press and the pointer', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const rect = marqueeOf(built.picture(), before)
    const asked = askedFor(from, to)
    expect(
      Math.abs(numberAttribute(rect, 'x') - asked.x0),
      'table T-023c SL-3: 取ろうとしている矩形 -- its left edge is the drag',
    ).toBeLessThanOrEqual(CORNER_PX)
    expect(Math.abs(numberAttribute(rect, 'y') - asked.y0), 'its top edge').toBeLessThanOrEqual(
      CORNER_PX,
    )
    expect(
      Math.abs(numberAttribute(rect, 'width') - (asked.x1 - asked.x0)),
      'its width',
    ).toBeLessThanOrEqual(CORNER_PX)
    expect(
      Math.abs(numberAttribute(rect, 'height') - (asked.y1 - asked.y0)),
      'its height',
    ).toBeLessThanOrEqual(CORNER_PX)
  })

  it('redraws it as the pointer moves, so a person can see what is enclosed', () => {
    // Why: a rectangle frozen at the first move would not let a person check what
    // is enclosed before letting go.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', (from.x + to.x) / 2, (from.y + to.y) / 2))
    const half = marqueeOf(built.picture(), before)
    built.send(pointer('move', to.x, to.y))
    const whole = marqueeOf(built.picture(), before)
    expect(
      numberAttribute(whole, 'width'),
      'table T-023c SL-3: the rectangle stopped following the pointer sideways',
    ).toBeGreaterThan(numberAttribute(half, 'width'))
    expect(
      numberAttribute(whole, 'height'),
      'table T-023c SL-3: the rectangle stopped following the pointer downwards',
    ).toBeGreaterThan(numberAttribute(half, 'height'))
  })

  it('draws it at the thickness S-174 states and the dash S-175 states', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const rect = marqueeOf(built.picture(), before)
    expect(numberAttribute(rect, 'stroke-width'), 'table T-206 S-174 -- 選択の枠の太さ').toBe(
      FRAME_STROKE,
    )
    const dash = numbersIn(attribute(rect.text, 'stroke-dasharray') ?? '')
    expect(dash, 'table T-206 S-175 -- 描く長さと空ける長さの組').toEqual([...FRAME_DASH])
  })

  it('draws it in the color the selection frame already wears (S-151)', () => {
    // Why: the colour is not written here: SL-3 reuses the row the SL-8 frame reads,
    // so the case compares the marquee with the frame this run paints.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const marquee = marqueeOf(built.picture(), before)
    built.send(pointer('up', to.x, to.y))
    const left = dashedRectsIn(onlyIn(built.picture(), before))
    expect(
      left.length,
      'table T-023c SL-8: the release left no dashed frame, so there is nothing to compare against',
    ).toBe(1)
    const frame = left[0] as Element
    expect(
      attribute(marquee.text, 'stroke'),
      'table T-023c SL-3: 色は 表 T-236 の `S-151` -- the row `SL-8` already reads',
    ).toBe(attribute(frame.text, 'stroke'))
  })
})

// Spec: ZO-6, ZO-5, ZO-1
describe('table T-020 ZO-6: the rectangle stands in front, and goes when the button does', () => {
  it('paints it in front of the name label, the row directly below it (ZO-5)', () => {
    // Why: measured against ZO-5, not the string's end: the time ruler is in its own
    // region (U-19 above U-50), and no row orders regions.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    const held = built.picture()
    const rect = marqueeOf(held, before)
    expect(
      rect.at,
      'table T-020 ZO-6: 6（最前面）—— the rectangle is painted behind the name label (ZO-5)',
    ).toBeGreaterThan(labelStartsAt(held))
    expect(
      rect.at,
      'table T-020 ZO-6: 6（最前面）—— the rectangle is painted behind the plan bar (ZO-1)',
    ).toBeGreaterThan(planBarStartsAt(built.loop, held))
  })

  it('takes it away again when the button is let go (MUST)', () => {
    // Why: the drag encloses nothing, so what is left can only be the rectangle or
    // nothing, and no selection frame can confuse the case.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = emptyDragPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    marqueeOf(built.picture(), before)
    const drawnWhileHeld = built.drawn()
    built.send(pointer('up', to.x, to.y))
    expect(
      built.drawn(),
      'the release drew no new picture at all, so the rectangle is still on the screen',
    ).toBeGreaterThan(drawnWhileHeld)
    expect(
      dashedRectsIn(onlyIn(built.picture(), before)),
      'table T-020 ZO-6: 握っているあいだだけ描き、離したら消すこと（MUST）',
    ).toEqual([])
  })

  it('leaves the selection behind and not the rectangle', () => {
    // Why: the drag encloses the Task, so something is left, and it stands on the
    // Task's own box (SL-8), not on the drag's.
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = enclosingPoint(built.loop)
    built.send(pointer('down', from.x, from.y))
    built.send(pointer('move', to.x, to.y))
    built.send(pointer('up', to.x, to.y))
    const left = dashedRectsIn(onlyIn(built.picture(), before))
    expect(
      left.length,
      'table T-020 ZO-6: 離した時点で残るのは選択そのもの -- nothing was left at all',
    ).toBe(1)
    const asked = askedFor(from, to)
    const frame = left[0] as Element
    expect(
      numberAttribute(frame, 'width'),
      'table T-020 ZO-6: 残るのは……矩形ではない -- the drag rectangle stayed on the screen',
    ).toBeLessThan(asked.x1 - asked.x0 - CORNER_PX)
  })
})

// Spec: PTD-1, PTD-5
describe('table T-023a: a pan is not a range selection, so it draws no rectangle', () => {
  it('draws nothing of SL-3 for the `Ctrl` drag PTD-1 takes first', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = emptyDragPoint(built.loop)
    built.send(pointer('down', from.x, from.y, { ctrl: true }))
    built.send(pointer('move', to.x, to.y, { ctrl: true }))
    expect(
      dashedRectsIn(onlyIn(built.picture(), before)),
      'table T-023a PTD-1: パン。構えと当たりによらず優先する -- a pan drew a range-selection rectangle',
    ).toEqual([])
  })

  it('draws nothing of SL-3 for a middle-button drag either', () => {
    const built = stage()
    const before = built.picture()
    const from = pressPoint(built.loop)
    const to = emptyDragPoint(built.loop)
    built.send(pointer('down', from.x, from.y, { button: 'middle' }))
    built.send(pointer('move', to.x, to.y, { button: 'middle' }))
    expect(
      dashedRectsIn(onlyIn(built.picture(), before)),
      'table T-023a PTD-1: 中ボタンドラッグ -- a pan drew a range-selection rectangle',
    ).toEqual([])
  })
})
