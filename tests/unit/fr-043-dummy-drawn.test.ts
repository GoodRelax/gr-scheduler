// Unit tests: the Actual Dummy (U-52) is drawn, DM-3 wide, and left out of the export.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from '../contract/spec-table'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import type {
  Calendar,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { exportSvg } from '../../src/adapter/image-exporter/image-exporter'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { DEFAULT_DISPLAY_RATIO, DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'

const rowOf = (tableId: string, specTableRowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === specTableRowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${specTableRowId}`)
  return found.by
}

const S_180 = rowOf('T-206', 'S-180')
const EP_14 = rowOf('T-076', 'EP-14')
const GA_1 = rowOf('T-266', 'GA-1')
const GA_5 = rowOf('T-266', 'GA-5')
const GA_6 = rowOf('T-266', 'GA-6')
const GA_17 = rowOf('T-266', 'GA-17')
const GA_18 = rowOf('T-266', 'GA-18')
const NS_3 = rowOf('T-231', 'NS-3')

const REQUIREMENTS = unbroken(
  readRepoFile(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_043_A_MILESTONE_DUMMY_IS_THE_SAME_DAY_ACTUAL =
  '`GRS` は、マイルストーンのダミーを、予定と実績のマイルストーンが同じ日にあるときの絵で実績をダミーに置き換えた姿とし、大きさ・縦位置・重ね順を同じ日の実績のマイルストーンと同じにして描くこと（`DM-8` / `DM-9`、`05-07-design.md` の 表 T-221 の `LF-10`）。'

const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

// Spec: NS-3
// Why: a coordinate read back from a picture is on the NS-3 grid, so comparisons are made on that
// grid; it is the rounding NS-3 applies to both sides, not an invented tolerance.
const GRID = ((): number => {
  // Trap: the cell names NS-1 before the grid, so the first bare number is that 1; take the number before px.
  const [first] = numbersOf(/\d+(?:\.\d+)?\s*px/.exec(NS_3['規則'] ?? '')?.[0] ?? '')
  if (first === undefined || first <= 0) {
    throw new Error(`table T-231 row NS-3 states no grid: ${NS_3['規則']}`)
  }
  return first
})()

const onGrid = (value: number): number => Math.round(value / GRID) * GRID
const sameOnGrid = (value: number, other: number): boolean =>
  Math.abs(onGrid(value) - onGrid(other)) < GRID / 2

// Spec: S-180, DM-3
// Why: named as the upper bound, not the width, so no case quietly reads it as the width; read
// from the manuscript because S-180 is not stored and has no generated constant.
const DUMMY_WIDTH_UPPER_BOUND = ((): number => {
  const [only, ...rest] = numbersOf(S_180['既定'] ?? '')
  if (only === undefined || rest.length !== 0) {
    throw new Error(`table T-206 row S-180: the default is not one number, it is ${S_180['既定']}`)
  }
  return only
})()

// Spec: S-1, FR-017
const PX_PER_DAY_AT_1X = ((): number => {
  const value = SETTINGS_CONSTANTS['pxPerDayAt1x']
  if (typeof value !== 'number' || value <= 0) throw new Error('S-1 is not a positive number')
  return value
})()

// Spec: FR-017
const dayWidthAt = (zoomX: number): number =>
  PX_PER_DAY_AT_1X * zoomX * DEFAULT_DISPLAY_RATIO

// Spec: T-206, T-240
const S_247 = ((): number => {
  const [only, ...rest] = numbersOf(rowOf('T-206', 'S-247')['既定'] ?? '')
  if (only === undefined || rest.length !== 0) throw new Error('table T-206 row S-247 states no one ratio')
  return only
})()

// Spec: T-240, FR-039
const MARKER_DIAMETER = ((): number => {
  const value = SETTINGS_CONSTANTS['markerSize']
  if (typeof value !== 'number' || value <= 0) throw new Error('S-22 is not a positive number')
  return value * DEFAULT_DISPLAY_RATIO
})()

// Spec: T-240
const drawnWidthAt = (_zoomX: number): number =>
  Math.min(MARKER_DIAMETER * S_247, DUMMY_WIDTH_UPPER_BOUND)

// Spec: T-240, FR-017
const NARROW_DAY_ZOOM = 0.5 / DEFAULT_DISPLAY_RATIO
// Spec: T-240, FR-017
const WIDE_DAY_ZOOM = 8 / DEFAULT_DISPLAY_RATIO

const DM_3_THE_WIDTH =
  '`GRS` は、ダミーを描く幅を、ダミーを描くタスクの進捗ステータスマークの径に `_assets/tbl-settings.md` の 表 T-206 の `S-247` を掛けた幅と、表 T-206 の `S-180` の小さい方とすること。'
const DM_3_NOT_CUT_BY_A_DAY =
  '`GRS` は、ダミーを描く幅の左端を `DM-1` の位置に揃えること。`GRS` は、印の幅を 1 日ぶんの幅で切らないこと。'

// Summary: settingsOf expands the dotted keys of SETTINGS_DEFAULTS into the nested shape the type has.
const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

// Why: every weekday is worked, so days count plainly; FR-054 resolves the one calendar through
// Project.calendarUid.
const EVERY_DAY_WORKED = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((oneNode) => ({
    ordinal: oneNode,
    dayType: oneNode,
    dayWorking: true,
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
} as unknown as Calendar

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    parentTaskUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  }) as unknown as Task

const taskGroup = (id: string, order: number): TaskGroup =>
  ({
    id,
    parentId: null,
    name: id,
    derivedFromTaskUid: null,
    order,
    treeState: 'auto', color: null,
    minHeightPx: null,
  }) as unknown as TaskGroup

const taskVisual = (taskUid: number, shapeKind: string): TaskVisual =>
  ({
    taskUid,
    shapeKind,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    strokeWidthPx: null,
    ...(shapeKind === 'milestone' ? { milestoneGlyph: 'diamond' } : {}),
  }) as unknown as TaskVisual

// Summary: scheduleOf draws tasks[i] on task group taskGroupIds[i], and the task groups come out sorted.
const scheduleOf = (
  tasks: readonly Task[],
  taskGroupIds: readonly string[],
  visuals: readonly TaskVisual[],
): Schedule => {
  const ids = [...new Set(taskGroupIds)].sort()
  return {
    project: {
      id: null,
      name: null,
      title: null,
      subject: null,
      category: null,
      company: null,
      manager: null,
      author: null,
      creationDate: null,
      revision: null,
      startDate: '2026-03-01T00:00:00',
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: EVERY_DAY_WORKED.uid,
      defaultStartTime: null,
      defaultFinishTime: null,
      themeHue: 214,
      uidHighWaterMark: 1000,
      importSequence: 0,
      carry: {},
      carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: ids.map((id, i) => taskGroup(id, i)),
    taskGroupMembers: tasks.map((one, i) => ({
      taskUid: one.uid,
      taskGroupId: taskGroupIds[i] ?? ids[0] ?? 'g1',
    })) as unknown as readonly TaskGroupMember[],
    taskVisuals: visuals,
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

// Spec: BO-1
const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8, propertyPanelWidth: 0 }

const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

// Why: one task group stands above the Task under test, so it is not at the edge.
const UNDER_TEST = 1

// Spec: FR-043, S-129
const ACTUAL_INITIAL_DURATION = ((): number => {
  const value = SETTINGS_CONSTANTS['actualInitialDuration']
  if (typeof value !== 'number') throw new Error('S-129 is not a number')
  return value
})()

// Spec: S-131, FR-013
const DUMMY_OPACITY = ((): number => {
  const value = SETTINGS_CONSTANTS['dummyOpacity']
  if (typeof value !== 'number') throw new Error('S-131 is not a number')
  return value
})()

// Spec: S-5, LF-9
// Why: the same ratio sizes GA-17's square, so its side is read from the settings, not typed as
// a pixel.
const ACTUAL_OF_PLAN = ((): number => {
  const value = SETTINGS_CONSTANTS['actualOfPlan']
  if (typeof value !== 'number') throw new Error('S-5 is not a number')
  return value
})()

interface Drawn {
  readonly regions: ReturnType<typeof regionsFromScreen>
  readonly layout: ReturnType<typeof layoutFromSchedule>
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly svg: string
}

// Spec: T-068, PI-19
const draw = (schedule: Schedule, zoomX: number): Drawn => {
  // Why: scrollDate (S-77) pins the left edge of the Task Group Lanes, so the two documents a case
  // compares are drawn on the same axis.
  const settings = settingsOf({
    zoomX,
    zoomY: 1 / DEFAULT_DISPLAY_RATIO,
    scrollDate: day(1),
    stackDirection: 'down',
    displayScale: DEFAULT_DISPLAY_SCALE,
    isProgressMarkerVisible: true, // Spec: S-63
  })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  return {
    regions,
    layout,
    geometry,
    // Why: every picture this helper builds is the screen's (EP-14's other arm); the export cases go
    // through exportScene and exportSvg.
    svg: svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen', { themePreference: 'light', guideCursorMode: 'none' }),
  }
}

const geometryOf = (drawn: Drawn, uid: number) => {
  const found = drawn.geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`no geometry for Task ${uid}`)
  return found
}

const notStartedSchedule = (): Schedule =>
  scheduleOf(
    [
      task({ uid: UNDER_TEST, start: day(5), finish: day(15) }),
      task({ uid: 2, start: day(2), finish: day(3) }),
    ],
    ['g2', 'g1'],
    [taskVisual(UNDER_TEST, 'rectangle'), taskVisual(2, 'rectangle')],
  )

// Summary: startedSchedule is notStartedSchedule with the actual GA-5 would place, and nothing else changed.
const startedSchedule = (): Schedule =>
  scheduleOf(
    [
      task({
        uid: UNDER_TEST,
        start: day(5),
        finish: day(15),
        actualStart: day(5),
        stop: day(5 + ACTUAL_INITIAL_DURATION - 1),
        resumeValid: true,
      }),
      task({ uid: 2, start: day(2), finish: day(3) }),
    ],
    ['g2', 'g1'],
    [taskVisual(UNDER_TEST, 'rectangle'), taskVisual(2, 'rectangle')],
  )

// Spec: GA-1
// Why: the rectangle beside the milestone is the ruler: its left edge is where the milestone's
// day column begins, and nothing else hands a milestone's day a pixel.
const milestoneSchedule = (): Schedule =>
  scheduleOf(
    [
      task({ uid: UNDER_TEST, start: day(5), finish: day(5), milestone: true }),
      task({ uid: 2, start: day(5), finish: day(15) }),
    ],
    ['g2', 'g1'],
    [taskVisual(UNDER_TEST, 'milestone'), taskVisual(2, 'rectangle')],
  )

const startedMilestoneSchedule = (): Schedule =>
  scheduleOf(
    [
      task({
        uid: UNDER_TEST,
        start: day(5),
        finish: day(5),
        milestone: true,
        actualStart: day(5),
        stop: day(5),
        resumeValid: true,
      }),
      task({ uid: 2, start: day(5), finish: day(15) }),
    ],
    ['g2', 'g1'],
    [taskVisual(UNDER_TEST, 'milestone'), taskVisual(2, 'rectangle')],
  )

// Why: figures are judged by bounding rectangle (WY-3), never by tag or attribute name, since
// the spec does not say which SVG element carries a width or a left edge.

interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

interface Figure {
  readonly tag: string
  // Summary: text is the element exactly as written, the key two pictures are differenced on.
  readonly text: string
  // Why: null for text: FR-093 forbids measuring glyphs, so this file never claims a text box.
  readonly box: Box | null
  // Summary: opacity multiplies every enclosing group opacity into the element's own.
  readonly opacity: number
  // Spec: FR-041
  readonly colors: readonly string[]
}

const ELEMENT = /<(\/?)([A-Za-z][\w-]*)((?:[^<>"]|"[^"]*")*?)(\/?)>/g

const attrOf = (attrs: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1] ?? null

const numberAttr = (attrs: string, name: string, fallback = 0): number => {
  const raw = attrOf(attrs, name)
  return raw === null ? fallback : Number.parseFloat(raw)
}

const boxOfPoints = (points: readonly (readonly [number, number])[]): Box | null => {
  if (points.length === 0) return null
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

const pointsOf = (raw: string): (readonly [number, number])[] =>
  raw
    .trim()
    .split(/\s+/)
    .filter((pair) => pair !== '')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return [x ?? Number.NaN, y ?? Number.NaN] as const
    })

// Why: throws on any bending command: an arc or a curve has a hull wider than its control points,
// so measuring one would answer a width the picture does not draw.
const boxOfPath = (d: string): Box | null => {
  const commands = d.match(/[A-Za-z]/g) ?? []
  const bending = commands.filter((one) => !'MmLlHhVvZz'.includes(one))
  if (bending.length > 0) {
    throw new Error(`this file cannot measure a path drawn with ${bending.join('')}`)
  }
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const points: (readonly [number, number])[] = []
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push([numbers[i] ?? Number.NaN, numbers[i + 1] ?? Number.NaN] as const)
  }
  return boxOfPoints(points)
}

const boxOfElement = (tag: string, attrs: string): Box | null => {
  switch (tag) {
    case 'rect': {
      const x = numberAttr(attrs, 'x')
      const y = numberAttr(attrs, 'y')
      return { x0: x, y0: y, x1: x + numberAttr(attrs, 'width'), y1: y + numberAttr(attrs, 'height') }
    }
    case 'circle': {
      const r = numberAttr(attrs, 'r')
      const cx = numberAttr(attrs, 'cx')
      const cy = numberAttr(attrs, 'cy')
      return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }
    }
    case 'ellipse': {
      const rx = numberAttr(attrs, 'rx')
      const ry = numberAttr(attrs, 'ry')
      const cx = numberAttr(attrs, 'cx')
      const cy = numberAttr(attrs, 'cy')
      return { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry }
    }
    case 'line':
      return boxOfPoints([
        [numberAttr(attrs, 'x1'), numberAttr(attrs, 'y1')],
        [numberAttr(attrs, 'x2'), numberAttr(attrs, 'y2')],
      ])
    case 'polygon':
    case 'polyline':
      return boxOfPoints(pointsOf(attrOf(attrs, 'points') ?? ''))
    case 'path':
      return boxOfPath(attrOf(attrs, 'd') ?? '')
    default:
      return null
  }
}

const ownOpacityOf = (attrs: string): number => {
  for (const name of ['opacity', 'fill-opacity', 'stroke-opacity']) {
    const raw = attrOf(attrs, name)
    if (raw !== null) return Number.parseFloat(raw)
  }
  return 1
}

// Summary: figuresOf lists every leaf figure a picture draws, with the groups above it folded in.
const figuresOf = (svg: string): readonly Figure[] => {
  const out: Figure[] = []
  const opacities: number[] = []
  const effective = (): number => opacities.reduce((a, b) => a * b, 1)
  ELEMENT.lastIndex = 0
  for (let hit = ELEMENT.exec(svg); hit !== null; hit = ELEMENT.exec(svg)) {
    const [text, closing, tag = '', attrs = '', selfClosing] = hit
    if (closing === '/') {
      if (tag === 'g' || tag === 'svg') opacities.pop()
      continue
    }
    if (tag === 'g' || tag === 'svg') {
      if (selfClosing !== '/') opacities.push(ownOpacityOf(attrs))
      continue
    }
    if (tag === 'defs' || tag === 'clipPath' || tag === 'marker') continue
    out.push({
      tag,
      text,
      box: boxOfElement(tag, attrs),
      opacity: effective() * ownOpacityOf(attrs),
      colors: ['fill', 'stroke']
        .map((name) => attrOf(attrs, name))
        .filter((one): one is string => one !== null),
    })
  }
  return out
}

// Summary: onlyIn answers what the first picture draws and the second does not, element for element.
const onlyIn = (one: string, other: string): readonly Figure[] => {
  const theirs = new Set(figuresOf(other).map((figure) => figure.text))
  return figuresOf(one).filter((figure) => !theirs.has(figure.text))
}

const spansX = (box: Box | null, x: number): boolean =>
  box !== null && onGrid(box.x0) - GRID / 2 <= onGrid(x) && onGrid(x) <= onGrid(box.x1) + GRID / 2

const unionOf = (figures: readonly Figure[]): Box => {
  const boxes = figures.map((one) => one.box).filter((one): one is Box => one !== null)
  if (boxes.length === 0) throw new Error('nothing is drawn here')
  return {
    x0: Math.min(...boxes.map((oneBar) => oneBar.x0)),
    y0: Math.min(...boxes.map((oneBar) => oneBar.y0)),
    x1: Math.max(...boxes.map((oneBar) => oneBar.x1)),
    y1: Math.max(...boxes.map((oneBar) => oneBar.y1)),
  }
}

// Why: the subtraction isolates the dummy, as plan bar and band are written alike in both; the
// marker survives it too (PM-1a, PM-1), but GA-18 puts it outside GA-6, off any dummy's x.
const drawnAt = (withDummy: string, withoutDummy: string, x: number): readonly Figure[] =>
  onlyIn(withDummy, withoutDummy).filter((figure) => spansX(figure.box, x))

// Spec: LF-10
const actualMilestoneShapeOf = (started: Drawn): string => {
  const actual = geometryOf(started, UNDER_TEST).actual
  if (actual === null || actual.form !== 'outline') {
    throw new Error('the twin drew no actual milestone figure')
  }
  return shapeOf(actual.points.map((one) => [one.x, one.y] as const))
}

// Spec: S-180
const actualBandOf = (started: Drawn): Box => {
  const actual = geometryOf(started, UNDER_TEST).actual
  if (actual === null || actual.form !== 'outline') throw new Error('the twin drew no actual bar')
  const box = boxOfPoints(actual.points.map((one) => [one.x, one.y] as const))
  if (box === null) throw new Error('the actual bar has no points')
  return box
}

// Why: throws on anything but a polygon, as boxOfPath does on a curve: a figure this file cannot
// read is one it may not report a shape for.
const verticesOf = (figure: Figure): readonly (readonly [number, number])[] => {
  if (figure.tag !== 'polygon') {
    throw new Error(`this file cannot read the outline of a <${figure.tag}>`)
  }
  const raw = /(?:^|\s)points="([^"]*)"/.exec(figure.text)?.[1]
  if (raw === undefined) throw new Error('the polygon carries no points')
  return pointsOf(raw)
}

// Spec: FR-043, LF-10
// Why: the dummy and the actual figure never share a size, so each is normalized to its own box;
// a diamond and a rectangle normalize differently, so they cannot be mistaken.
const shapeOf = (points: readonly (readonly [number, number])[]): string => {
  const box = boxOfPoints(points)
  if (box === null || box.x1 - box.x0 <= 0 || box.y1 - box.y0 <= 0) {
    throw new Error('an outline with no extent has no shape to compare')
  }
  return points
    .map(
      ([x, y]) =>
        `${((x - box.x0) / (box.x1 - box.x0)).toFixed(3)},` +
        `${((y - box.y0) / (box.y1 - box.y0)).toFixed(3)}`,
    )
    .join(' ')
}

const RECTANGLE_SHAPE = shapeOf([
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
])

const sameBoxAs = (box: Box | null, other: Box | null): boolean =>
  box !== null &&
  other !== null &&
  sameOnGrid(box.x0, other.x0) &&
  sameOnGrid(box.x1, other.x1) &&
  sameOnGrid(box.y0, other.y0) &&
  sameOnGrid(box.y1, other.y1)

// Spec: GA-1
// Why: taken from the geometry, not the ink, since a stroke straddles an edge and would answer
// half a line too wide.
const planBoxOf = (drawn: Drawn, uid: number): Box => {
  const plan = geometryOf(drawn, uid).plan
  if (plan === null || plan.form !== 'outline') throw new Error(`Task ${uid} drew no plan bar`)
  const box = boxOfPoints(plan.points.map((one) => [one.x, one.y] as const))
  if (box === null) throw new Error(`Task ${uid}'s plan bar has no points`)
  return box
}

// Spec: GA-5, GA-6, DM-1, S-129, FR-017
// Why: the grab side is still two although one mark is drawn; inkExpectedOf answers what is
// drawn.
const grabColumnsOf = (fresh: Drawn, zoomX: number): readonly { readonly grab: string; readonly x0: number; readonly x1: number }[] => {
  const left = planBoxOf(fresh, UNDER_TEST).x0
  const dayWidth = dayWidthAt(zoomX)
  const width = drawnWidthAt(zoomX)
  const gr9 = left
  const gr17 = gr9 + ACTUAL_INITIAL_DURATION * dayWidth
  return [
    { grab: 'GA-5', x0: gr9, x1: gr9 + width },
    { grab: 'GA-6', x0: gr17, x1: gr17 + width },
  ]
}

// Spec: FR-043
// Why: one entry, and that is the claim: FR-043 draws one mark.
const inkExpectedOf = (fresh: Drawn, zoomX: number): readonly { readonly grab: string; readonly x0: number; readonly x1: number }[] =>
  grabColumnsOf(fresh, zoomX).slice(0, 1)

const actualFigureBoxOf = (started: Drawn): Box => {
  const actual = geometryOf(started, UNDER_TEST).actual
  if (actual === null || actual.form !== 'outline') {
    throw new Error('the twin drew no actual milestone figure')
  }
  const box = boxOfPoints(actual.points.map((one) => [one.x, one.y] as const))
  if (box === null) throw new Error('the twin actual milestone figure has no points')
  return box
}

const gr18InkBoxOf = (fresh: Drawn): Box => {
  const dummy = geometryOf(fresh, UNDER_TEST).dummies.find((one) => one.grab === 'GA-17')
  if (dummy === undefined) throw new Error('FR-043 drew no GA-17 for a milestone nobody has started')
  const { x, y, width, height } = dummy.ink
  return { x0: x, y0: y, x1: x + width, y1: y + height }
}

// Spec: GA-17, S-5
// Why: read off the plan figure's own box, which is drawn the full plan height, so the formula
// of taskGeometryOf is not reworked here.
const gr18SquareSideOf = (fresh: Drawn): number => {
  const plan = planBoxOf(fresh, UNDER_TEST)
  return (plan.y1 - plan.y0) * ACTUAL_OF_PLAN
}

// Spec: GA-17, GA-18
// Why: selected without an x so a case may measure one; the marker is named by its own center,
// and no ink throws, so no case passes over a picture with no dummy.
const gr18InkOf = (fresh: Drawn, started: Drawn): readonly Figure[] => {
  const marker = geometryOf(fresh, UNDER_TEST).marker
  if (marker === null) {
    throw new Error('FR-013 drew no not-started marker, so the dummy cannot be told from it')
  }
  const isTheMarker = (box: Box): boolean =>
    sameOnGrid((box.x0 + box.x1) / 2, marker.center.x) &&
    sameOnGrid((box.y0 + box.y1) / 2, marker.center.y)
  const found = onlyIn(fresh.svg, started.svg).filter(
    (one) => one.box !== null && !isTheMarker(one.box),
  )
  if (found.length === 0) {
    throw new Error('the picture draws nothing at GA-17 for a milestone nobody has started')
  }
  return found
}

// Spec: S-180, S-5, S-6
// Why: the marker is named by its center, since the band and the marker's square share a rounded
// top and bottom; selecting on the band alone answers two figures for one mark.
const dummyFiguresOf = (fresh: Drawn, started: Drawn): readonly Figure[] => {
  const band = actualBandOf(started)
  const marker = geometryOf(fresh, UNDER_TEST).marker
  const isTheMarker = (box: Box): boolean =>
    marker !== null &&
    sameOnGrid((box.x0 + box.x1) / 2, marker.center.x) &&
    sameOnGrid((box.y0 + box.y1) / 2, marker.center.y)
  return onlyIn(fresh.svg, started.svg).filter(
    (figure) =>
      figure.box !== null &&
      !isTheMarker(figure.box) &&
      sameOnGrid(figure.box.y0, band.y0) &&
      sameOnGrid(figure.box.y1, band.y1),
  )
}

const dummyInkOf = (fresh: Drawn, started: Drawn): readonly Box[] =>
  dummyFiguresOf(fresh, started)
    .map((figure) => figure.box as Box)
    .sort((one, other) => one.x0 - other.x0)

// Why: the readers are run once over a control whose dummies this file spliced in, so a broken
// reader cannot pass; the control is the started picture, dummy-free by a row, not by EP-14.

// Summary: spliced adds ink that begins at each x0 and runs width, in the actual bar's band.
const spliced = (svg: string, inks: readonly { readonly x0: number }[], width: number, band: Box, fill: string): string => {
  const figures = inks
    .map(
      (ink) =>
        `<g opacity="${DUMMY_OPACITY}">` +
        `<rect x="${ink.x0}" y="${band.y0}"` +
        ` width="${width}" height="${band.y1 - band.y0}" fill="${fill}"/></g>`,
    )
    .join('')
  return svg.replace('</svg>', `${figures}</svg>`)
}

describe('the reader this file measures pictures with', () => {
  it('finds ink that obeys FR-043, FR-013 and S-180, and nothing where none is drawn', () => {
    const fresh = draw(notStartedSchedule(), NARROW_DAY_ZOOM)
    const started = draw(startedSchedule(), NARROW_DAY_ZOOM)
    const band = actualBandOf(started)
    const bar = figuresOf(started.svg).filter((one) => sameBoxAs(one.box, band))
    const fill = bar.flatMap((one) => one.colors)[0]
    expect(fill).toBeDefined()
    // Why: the control splices two figures on purpose: a reader that stops after the first figure
    // would pass every one-mark case below.
    const expected = grabColumnsOf(fresh, NARROW_DAY_ZOOM)
    const width = drawnWidthAt(NARROW_DAY_ZOOM)
    const obedient = spliced(started.svg, expected, width, band, fill!)

    // Why: exactly two, as two were put there: a reader that over-collected would answer more, and
    // one that measured the wrong element the wrong rectangle.
    const found = dummyInkOf({ ...fresh, svg: obedient }, started)
    expect(found).toHaveLength(2)
    for (const [i, ink] of expected.entries()) {
      expect(onGrid(found[i]!.x0), `${ink.grab} left`).toBeCloseTo(onGrid(ink.x0), 2)
      expect(onGrid(found[i]!.x1), `${ink.grab} right`).toBeCloseTo(onGrid(ink.x1), 2)
    }
    // Why: the other way: with the splices gone the reader must find nothing, or every case that a
    // dummy is drawn would pass over a picture that draws none.
    expect(dummyInkOf(started, started)).toHaveLength(0)
  })
})

// Spec: FR-043, S-180
// Why: no paint order is asserted, as no row of T-020 (ZO-1, ZO-1a, ZO-2, ZO-3, ZO-4, ZO-5) names
// U-52; nor the drag preview of GA-21 and GA-22, as no picture here is handed a gesture.
describe('FR-043 / table T-206 S-180 -- the Actual Dummy is drawn', () => {
  it('S-180 is still the row that bounds the drawn width DM-3 gives, and S-247 the ratio to the marker', () => {
    // Why: a guard, not the claim: if a row moved, the cases after it would be the wrong ones rather
    // than a failure of the code.
    expect(S_180['値']).toContain('DM-3')
    expect(S_180['値']).toContain('描く幅の上限')
    expect(rowOf('T-206', 'S-247')['値']).toContain('DM-3')
    expect(REQUIREMENTS).toContain(DM_3_THE_WIDTH)
    expect(REQUIREMENTS).toContain(DM_3_NOT_CUT_BY_A_DAY)
    // Spec: T-266
    expect(GA_1['基準点']).toContain('予定の左端')
    expect(GA_5['基準点']).toContain('予定の開始')
    expect(GA_5['基準点']).not.toContain('翌稼働日')
    expect(GA_6['基準点']).toContain('ダミーの右端')
    expect(GA_17['基準点']).toContain('ダミーの菱形の中心')
    expect(REQUIREMENTS).toContain(FR_043_A_MILESTONE_DUMMY_IS_THE_SAME_DAY_ACTUAL)
    expect(DUMMY_WIDTH_UPPER_BOUND).toBeGreaterThan(0)
  })

  it('⭐ the two magnifications put one day on either side of the DM-3 width, which S-180 does not cap here', () => {
    // Why: a pair of zooms whose days both exceed the mark could not tell DM-3 from the retired min(1 day, S-180).
    expect(dayWidthAt(NARROW_DAY_ZOOM)).toBeLessThan(drawnWidthAt(NARROW_DAY_ZOOM))
    expect(dayWidthAt(WIDE_DAY_ZOOM)).toBeGreaterThan(drawnWidthAt(WIDE_DAY_ZOOM))
    expect(MARKER_DIAMETER * S_247).toBeLessThan(DUMMY_WIDTH_UPPER_BOUND)
    expect(drawnWidthAt(NARROW_DAY_ZOOM)).toBeCloseTo(drawnWidthAt(WIDE_DAY_ZOOM), 6)
  })

  it('the two documents differ only in the actual, so the difference of the pictures is the dummy', () => {
    // Spec: FR-011
    // Why: the plan bar is written identically in both pictures, so it is differenced away rather
    // than mistaken for a dummy.
    const fresh = draw(notStartedSchedule(), NARROW_DAY_ZOOM)
    const started = draw(startedSchedule(), NARROW_DAY_ZOOM)
    expect(geometryOf(started, UNDER_TEST).plan).toEqual(geometryOf(fresh, UNDER_TEST).plan)
    expect(geometryOf(fresh, UNDER_TEST).dummies.map((one) => one.grab)).toEqual(['GA-5', 'GA-6'])
    expect(geometryOf(started, UNDER_TEST).dummies).toHaveLength(0)
  })

  for (const zoomX of [NARROW_DAY_ZOOM, WIDE_DAY_ZOOM]) {
    const days = `${onGrid(dayWidthAt(zoomX))}px/day`

    it(`FR-043 (MUST) shows the handle at ${days}: the picture draws ONE figure`, () => {
      // Spec: FR-043
      // Why: a live hit target with nothing drawn is not shown; one figure is drawn, while the two
      // grab rows stay, as asserted below.
      const fresh = draw(notStartedSchedule(), zoomX)
      const started = draw(startedSchedule(), zoomX)
      expect(geometryOf(fresh, UNDER_TEST).dummies.map((one) => one.grab)).toEqual([
        'GA-5',
        'GA-6',
      ])
      expect(dummyInkOf(fresh, started)).toHaveLength(1)
    })

    it(`⛔ FR-043 (MUST NOT) draws no second mark at GA-6's day at ${days}`, () => {
      const fresh = draw(notStartedSchedule(), zoomX)
      const started = draw(startedSchedule(), zoomX)
      const columns = grabColumnsOf(fresh, zoomX)
      const gr9 = columns[0]!
      const gr17 = columns[1]!
      const found = dummyInkOf(fresh, started)
      expect(found).toHaveLength(1)
      expect(onGrid(found[0]!.x0), 'the one mark stands on GA-5 の日の列').toBeCloseTo(
        onGrid(gr9.x0),
        2,
      )
      // Why: DM-3 lets the one mark cover GA-6's column where a day is narrower than the mark, so a second mark is one that BEGINS there.
      expect(
        found.filter((one) => onGrid(one.x0) >= onGrid(gr17.x0) - GRID / 2),
        'FR-043 (MUST NOT): a second mark is drawn at GA-6',
      ).toHaveLength(0)
    })

    it(`⭐ T-240 DM-3 (MUST) draws the dummy min(marker diameter x S-247, S-180) wide, whatever the day, at ${days}: ${DM_3_THE_WIDTH}`, () => {
      // Why: the same width at both zooms is the rule; a mark cut to one day at the narrow zoom is the retired reading.
      const fresh = draw(notStartedSchedule(), zoomX)
      const started = draw(startedSchedule(), zoomX)
      const expected = inkExpectedOf(fresh, zoomX)
      const found = dummyInkOf(fresh, started)
      expect(found).toHaveLength(expected.length)
      for (const [i, ink] of expected.entries()) {
        expect(onGrid(found[i]!.x1 - found[i]!.x0), `${ink.grab} at ${days}: ${DM_3_NOT_CUT_BY_A_DAY}`).toBeCloseTo(
          onGrid(ink.x1 - ink.x0),
          2,
        )
      }
    })

    it(`⭐ FR-043 (MUST) begins the dummy at its day column's left edge at ${days}`, () => {
      // Why: the left edge is counted in days from the plan bar's own left edge, which GA-1 makes the plan start day's column.
      const fresh = draw(notStartedSchedule(), zoomX)
      const started = draw(startedSchedule(), zoomX)
      const expected = inkExpectedOf(fresh, zoomX)
      const found = dummyInkOf(fresh, started)
      expect(found).toHaveLength(expected.length)
      for (const [i, ink] of expected.entries()) {
        expect(onGrid(found[i]!.x0), `${ink.grab} at ${days}`).toBeCloseTo(onGrid(ink.x0), 2)
      }
    })

    // Spec: IMPS-442
    it(`⛔ T-240 DM-1: the dummy ink starts in the plan start day's column, clear of GA-1, and stays in it where the day is wider than the mark, at ${days}`, () => {
      const fresh = draw(notStartedSchedule(), zoomX)
      const started = draw(startedSchedule(), zoomX)
      const planStartColumnBegins = planBoxOf(fresh, UNDER_TEST).x0
      const planStartColumnEnds = planStartColumnBegins + dayWidthAt(zoomX)
      const found = dummyInkOf(fresh, started)
      expect(found.length, `no dummy ink was drawn at ${days}`).toBeGreaterThan(0)
      for (const ink of found) {
        expect(onGrid(ink.x0) + GRID, '**ダミーを描く位置は、予定の開始日とすること（MUST）').toBeGreaterThanOrEqual(
          onGrid(planStartColumnBegins),
        )
        expect(onGrid(ink.x0) - GRID, 'ること（MUST）。**⛔ **翌稼働日へずらしてはならない（MUST NOT）').toBeLessThan(
          onGrid(planStartColumnEnds),
        )
        // Why: DM-3 accepts that a mark wider than one day covers the days to its right, so the right edge is held only where the day is wider.
        if (dayWidthAt(zoomX) >= drawnWidthAt(zoomX)) {
          expect(onGrid(ink.x1) - GRID).toBeLessThanOrEqual(onGrid(planStartColumnEnds))
        }
      }
    })
  }

  // Spec: IMPS-1708, IMPS-435
  it('S-180 governs the horizontal only: the dummy stands in the actual bar band', () => {
    // Spec: S-180, S-257, S-260
    // Why: the band is read off the twin's actual bar, the actual FR-043 places when GA-5 is
    // grabbed, so this case knows no figure size.
    expect(S_180['保存しない理由']).toContain('縦の広がりは実績の帯に従う')
    const fresh = draw(notStartedSchedule(), NARROW_DAY_ZOOM)
    const started = draw(startedSchedule(), NARROW_DAY_ZOOM)
    const band = actualBandOf(started)
    // Why: walked over the ink, not the dummies rows: one row draws no mark yet stays a grab target,
    // and one mark is all there is to measure the vertical on.
    for (const ink of inkExpectedOf(fresh, NARROW_DAY_ZOOM)) {
      const drawnFigures = drawnAt(fresh.svg, started.svg, ink.x0 + 1)
      expect(drawnFigures.length, `nothing is drawn at ${ink.grab}`).toBeGreaterThan(0)
      const box = unionOf(drawnFigures)
      expect(onGrid(box.y0), `${ink.grab} top`).toBeCloseTo(onGrid(band.y0), 2)
      expect(onGrid(box.y1), `${ink.grab} bottom`).toBeCloseTo(onGrid(band.y1), 2)
    }
  })

  // Spec: IMPS-491
  it('FR-013 (MUST) draws it faint, at S-131', () => {
    // Spec: FR-013, S-131
    const fresh = draw(notStartedSchedule(), NARROW_DAY_ZOOM)
    const started = draw(startedSchedule(), NARROW_DAY_ZOOM)
    const inks = dummyFiguresOf(fresh, started)
    // Why: the count is here only so the loop cannot be empty: a faintness case over no ink would be
    // green whatever the picture did.
    expect(inks.length, 'no dummy ink to judge the faintness of').toBe(1)
    for (const figure of inks) {
      expect(figure.opacity, 'a dummy is not faint').toBeCloseTo(DUMMY_OPACITY, 6)
    }
  })

  it('FR-041 keeps the dummy on the actual bar colors and gives it none of its own', () => {
    // Spec: FR-013, FR-041
    const fresh = draw(notStartedSchedule(), NARROW_DAY_ZOOM)
    const started = draw(startedSchedule(), NARROW_DAY_ZOOM)
    // Why: the actual bar is found by its rectangle, the band, not by any tag or attribute name.
    const band = actualBandOf(started)
    const bar = figuresOf(started.svg).filter((one) => sameBoxAs(one.box, band))
    expect(bar.length, 'the twin drew no actual bar').toBeGreaterThan(0)
    const inherited = new Set(bar.flatMap((one) => one.colors))
    const inks = dummyFiguresOf(fresh, started)
    // Why: one, for the reason the faintness case states its count: an empty loop proves nothing.
    expect(inks.length, 'no dummy ink to judge the colors of').toBe(1)
    for (const figure of inks) {
      for (const color of figure.colors) {
        if (color === 'none') continue
        expect(inherited, `a dummy paints itself ${color}`).toContain(color)
      }
    }
  })

  for (const zoomX of [NARROW_DAY_ZOOM, WIDE_DAY_ZOOM]) {
    const days = `${onGrid(dayWidthAt(zoomX))}px/day`

    // Spec: DM-7
    it(`GA-17 (MUST): a milestone not started draws one dummy, the same square as its own actual figure at ${days}`, () => {
      // Spec: FR-043, FR-104, GA-16, S-130
      // Why: a milestone has no actual bar, so its dummy box is a square the size of its own actual
      // figure, read off the plan figure's box by gr18SquareSideOf.
      const fresh = draw(milestoneSchedule(), zoomX)
      const started = draw(startedMilestoneSchedule(), zoomX)
      const dummies = geometryOf(fresh, UNDER_TEST).dummies
      expect(dummies.map((one) => one.grab)).toEqual(['GA-17'])
      const box = unionOf(gr18InkOf(fresh, started))
      const side = gr18SquareSideOf(fresh)
      expect(onGrid(box.x1 - box.x0), 'GA-17 width').toBeCloseTo(onGrid(side), 2)
      expect(onGrid(box.y1 - box.y0), 'GA-17 height').toBeCloseTo(onGrid(side), 2)
    })

    // Spec: IMPS-444
    it(`GA-17 (MUST) is centered where the same-day actual milestone figure is centered at ${days}`, () => {
      const fresh = draw(milestoneSchedule(), zoomX)
      const started = draw(startedMilestoneSchedule(), zoomX)
      const box = gr18InkBoxOf(fresh)
      const twin = actualFigureBoxOf(started)
      expect(onGrid((box.x0 + box.x1) / 2), FR_043_A_MILESTONE_DUMMY_IS_THE_SAME_DAY_ACTUAL).toBeCloseTo(
        onGrid((twin.x0 + twin.x1) / 2),
        2,
      )
    })

    it(`⛔ FR-043 (MUST NOT) draws GA-17 as anything but a rectangle at ${days}`, () => {
      // Spec: FR-043
      // Why: the MUST NOT half on its own, so a figure that is neither the rectangle nor the
      // milestone's own still fails the next case rather than passing both.
      const fresh = draw(milestoneSchedule(), zoomX)
      const started = draw(startedMilestoneSchedule(), zoomX)
      const ink = gr18InkOf(fresh, started)
      expect(ink.length, 'no dummy ink to judge the figure of').toBe(1)
      expect(shapeOf(verticesOf(ink[0]!))).not.toBe(RECTANGLE_SHAPE)
    })

    it(`⭐ FR-043 (MUST) draws GA-17 as the milestone's own actual figure at ${days}`, () => {
      // Spec: FR-043, LF-10
      // Why: compared with a drawing the spec puts beside it, the started twin, not a value from src;
      // both are normalized to their own boxes, the same figure at two sizes.
      const fresh = draw(milestoneSchedule(), zoomX)
      const started = draw(startedMilestoneSchedule(), zoomX)
      const ink = gr18InkOf(fresh, started)
      expect(ink.length, 'no dummy ink to judge the figure of').toBe(1)
      expect(shapeOf(verticesOf(ink[0]!))).toBe(actualMilestoneShapeOf(started))
    })

    // Spec: IMPS-445
    it(`FR-043 (MUST) draws GA-17's box where the same-day actual milestone figure stands at ${days}`, () => {
      const fresh = draw(milestoneSchedule(), zoomX)
      const started = draw(startedMilestoneSchedule(), zoomX)
      const box = gr18InkBoxOf(fresh)
      const twin = actualFigureBoxOf(started)
      expect(onGrid(box.x0), 'GA-17 left').toBeCloseTo(onGrid(twin.x0), 2)
      expect(onGrid(box.x1), 'GA-17 right').toBeCloseTo(onGrid(twin.x1), 2)
      expect(onGrid(box.y0), 'GA-17 top').toBeCloseTo(onGrid(twin.y0), 2)
      expect(onGrid(box.y1), 'GA-17 bottom').toBeCloseTo(onGrid(twin.y1), 2)
    })

  }

})

// Summary: TwoPictures holds the screen picture and the exported one, from one running shell.
interface TwoPictures {
  readonly screen: string
  // Summary: exportInner is the picture the export is assembled from; exportWhole is the export.
  readonly exportInner: string
  readonly exportWhole: string
  readonly geometry: ReturnType<typeof geometryFromLayout>
  readonly ratio: number
}

const shellPictures = (schedule: Schedule): TwoPictures => {
  const base = structuredClone(startupTemplate) as unknown as Document
  const settings = settingsOf({ stackDirection: 'down', isProgressMarkerVisible: true })
  const document = {
    ...base,
    schedule,
    documentSettings: settings,
  } as unknown as Document
  const painted: string[] = []
  const loop = frameLoop({ showMarqueeOverlaySvg: () => undefined, showSvg: (one: string) => painted.push(one) }, document, SCREEN)
  const screen = painted[painted.length - 1]
  const scene = loop.exportScene()
  const frame = loop.current()
  if (screen === undefined || scene === null || frame === null) {
    throw new Error('BO-1 has settled no size, so there is no picture to compare')
  }
  // Spec: S-99h, FR-080
  // Why: a hidden panel is 0 wide, so the export environment is the one the screen is already in
  // and the two pictures compare figure for figure.
  expect(frame.regions.propertiesPanel.width).toBe(0)
  // Why: exportSvg refuses past the S-217 ceiling; this fixture is nowhere near it, so a refusal
  // is a fixture bug, not FR-025's MUST NOT.
  const whole = exportSvg(scene)
  if (!whole.ok) {
    throw new Error('exportSvg refused a picture this fixture expected to fit (FR-025, S-217)')
  }
  return {
    screen,
    exportInner: scene.svg,
    exportWhole: whole.svg,
    geometry: frame.geometry,
    ratio: SETTINGS_CONSTANTS.exportCanvas.width / SCREEN.width,
  }
}

const taskGeometryOf = (pictures: TwoPictures, uid: number) => {
  const found = pictures.geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`no geometry for Task ${uid}`)
  return found
}

// Spec: DM-1, FR-017, FR-055
const dayWidthOf = (pictures: TwoPictures, schedule: Schedule, one: number, other: number): number => {
  const gr9At = (uid: number): number => {
    const found = taskGeometryOf(pictures, uid).dummies.find((dummy) => dummy.grab === 'GA-5')
    if (found === undefined) throw new Error(`Task ${uid} has no GA-5`)
    return found.at.x
  }
  const startDayOf = (uid: number): number => {
    const start = schedule.tasks.find((task) => task.uid === uid)?.start ?? null
    if (start === null) throw new Error(`Task ${uid} has no plan start`)
    return Date.parse(`${start.slice(0, 10)}T00:00:00Z`) / 86_400_000
  }
  return (gr9At(one) - gr9At(other)) / (startDayOf(one) - startDayOf(other))
}

describe('EP-14 of table T-076 -- an export draws no dummy, and moves nothing', () => {
  it('EP-14 is still the row that keeps U-52 out and leaves its room alone', () => {
    // Spec: EP-14, U-52
    expect(EP_14['UI パーツ']).toContain('U-52')
    expect(EP_14['描くか']).toContain('描かない')
    expect(EP_14['理由と扱い']).toContain('場所は空けない')
    // Spec: GA-18
    // Why: GA-18's row is why a dummy may not simply be deleted for an export.
    expect(GA_18['掴む所']).toContain('進捗ステータスマーク')
  })

  it('EP-14 (MUST NOT): what the screen draws for the dummy is not in the export', () => {
    const schedule = notStartedSchedule()
    const pictures = shellPictures(schedule)
    const dummies = taskGeometryOf(pictures, UNDER_TEST).dummies
    expect(dummies.map((one) => one.grab)).toEqual(['GA-5', 'GA-6'])
    // Why: the DM-3 width, which no day width enters, so the zoom passed here changes nothing.
    const width = drawnWidthAt(1)
    expect(dayWidthOf(pictures, schedule, UNDER_TEST, 2)).toBeGreaterThan(0)
    // Why: the precondition is part of the claim: a picture that draws no dummy because none is
    // drawn anywhere obeys no requirement.
    const anchor = dummies.find((one) => one.grab === 'GA-5')
    if (anchor === undefined) throw new Error('the shell drew no GA-5 to look for')
    const dropped = drawnAt(pictures.screen, pictures.exportInner, anchor.at.x + width / 2)
    expect(
      dropped.length,
      'the screen draws nothing at GA-5 that the export leaves out',
    ).toBeGreaterThan(0)
    // Why: measured against every Task's dummies, as EP-14 keeps U-52 out altogether; both rows are
    // swept, since this half says what may go missing and must not assume where the mark stands.
    const everyDummyX = pictures.geometry.tasks.flatMap((one) =>
      one.dummies.map((dummy) => dummy.at.x),
    )
    const isADummy = (figure: Figure): boolean =>
      figure.box !== null &&
      everyDummyX.some((x) => spansX(figure.box, x + width / 2)) &&
      onGrid(figure.box.x1 - figure.box.x0) <= onGrid(width) + GRID
    for (const figure of onlyIn(pictures.screen, pictures.exportInner)) {
      expect(isADummy(figure), `the export also dropped ${figure.text}`).toBe(true)
    }

    // Spec: EP-5, U-2
    // Why: the clause is worth writing only if it falls when something T-076 keeps is missing, so
    // the plan bar is taken out of the export too and the reading must refuse it.
    const plan = taskGeometryOf(pictures, UNDER_TEST).plan
    if (plan === null || plan.form !== 'outline') throw new Error('the Task drew no plan bar')
    const planBox = boxOfPoints(plan.points.map((one) => [one.x, one.y] as const))
    const bar = figuresOf(pictures.exportInner).find((one) => sameBoxAs(one.box, planBox))
    expect(bar, 'EP-5 already fails: the export has no plan bar to take out').toBeDefined()
    const alsoMissingTheBar = pictures.exportInner.replace(bar!.text, '')
    expect(onlyIn(pictures.screen, alsoMissingTheBar).some((one) => !isADummy(one))).toBe(true)
  })

  it('EP-5 keeps the not-started Progress Status Mark in the export, at the screen x', () => {
    // Spec: EP-5, GA-18, U-5
    // Why: emptying dummies for the export would satisfy EP-14 and take the marker with it, as its
    // x hangs off GA-6; EP-5 draws the marker in the export, so it must survive.
    const pictures = shellPictures(notStartedSchedule())
    const marker = taskGeometryOf(pictures, UNDER_TEST).marker
    expect(marker?.symbol).toBe('PM-1a')
    const atTheMarker = (svg: string): readonly string[] =>
      figuresOf(svg)
        .filter(
          (one) =>
            one.box !== null &&
            sameOnGrid((one.box.x0 + one.box.x1) / 2, marker!.center.x) &&
            sameOnGrid((one.box.y0 + one.box.y1) / 2, marker!.center.y),
        )
        .map((one) => one.text)
        .sort()
    expect(atTheMarker(pictures.exportInner).length, 'the export drew no not-started marker')
      .toBeGreaterThan(0)
    // Spec: EP-14
    expect(atTheMarker(pictures.exportInner)).toEqual(atTheMarker(pictures.screen))
  })

  // Spec: IMPS-957
  it('EP-14 leaves the room: the plan bar is written identically in both pictures', () => {
    // Spec: EP-14
    const pictures = shellPictures(notStartedSchedule())
    const plan = taskGeometryOf(pictures, UNDER_TEST).plan
    if (plan === null || plan.form !== 'outline') throw new Error('the Task drew no plan bar')
    const planBox = boxOfPoints(plan.points.map((one) => [one.x, one.y] as const))
    const sameBox = (svg: string): readonly string[] =>
      figuresOf(svg)
        .filter((one) => sameBoxAs(one.box, planBox))
        .map((one) => one.text)
        .sort()
    expect(sameBox(pictures.exportInner)).toEqual(sameBox(pictures.screen))
    expect(sameBox(pictures.screen).length).toBeGreaterThan(0)
  })

  // Spec: IMPS-948
  it('WY-3 of table T-041: one ratio carries the screen picture into the export', () => {
    // Spec: WY-3, FR-080
    const pictures = shellPictures(notStartedSchedule())
    const scales = [...pictures.exportWhole.matchAll(/scale\(([^)]*)\)/g)].map((hit) => hit[1] ?? '')
    expect(scales.length).toBe(1)
    expect(numbersOf(scales[0] ?? '')).toHaveLength(1)
    expect(Number.parseFloat(scales[0] ?? 'NaN')).toBeCloseTo(pictures.ratio, 2)
    // Why: the received picture goes into the scaled group untouched, so a part T-076 keeps is at its
    // screen coordinate times the ratio and nothing else.
    expect(pictures.exportWhole).toContain(pictures.exportInner)
  })
})
