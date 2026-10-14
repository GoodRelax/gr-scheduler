// CR-758 spec-only cases (written from docs/spec alone): dependency lines clear of the labels and markers, and the landed line answering where it is drawn.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { answersAtPointer, grabSizesOf, pointerWalkOf } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { arrowHeadOf, geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { labelLayoutOf, outwardStartOf } from '../../src/entity/layout-engine/schedule-layout/label-placement'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf, regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { displayRatioAt } from '../fixtures/display-scale'
import { bare, specTable, unbroken } from './spec-table'

const rowOf = (table: string, id: string): { readonly cells: readonly string[]; readonly by: Readonly<Record<string, string>> } => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => rowOf(table, id).cells.join(' | ')

// WHY: the T-273 notes live outside the table rows, so the clause is read from the requirements text itself.
const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  if (found === null) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return Number(found[0])
}

// WHY: the column headings are the Japanese words of the manuscript; spelled by code point to keep this file ASCII.
const DEFAULT_OF_T201 = String.fromCharCode(0x65e2, 0x5b9a, 0x5024)
const DEFAULT_OF_T206 = String.fromCharCode(0x65e2, 0x5b9a)
const BENDS_OF_T222 = String.fromCharCode(0x6298, 0x308c, 0x70b9)

// see T-201
const T201 = (id: string): number => numberIn(bare(rowOf('T-201', id).by[DEFAULT_OF_T201] ?? ''))
// see T-206
const T206 = (id: string): number => numberIn(bare(rowOf('T-206', id).by[DEFAULT_OF_T206] ?? ''))

// see T-201
const keyOf = (id: string): string => {
  const cell = rowOf('T-201', id).cells.find((one) => /^`[A-Za-z][A-Za-z0-9]*`$/.test(one.trim()))
  if (cell === undefined) throw new Error(`table T-201 row ${id} names no key`)
  return cell.trim().replace(/`/g, '')
}

// see T-222
const bendsOfPattern = (id: string): number => numberIn(rowOf('T-222', id).by[BENDS_OF_T222] ?? '')

// see T-273
const lineHolding = (tokens: readonly string[]): string => {
  const found = REQUIREMENTS.split(String.fromCharCode(10)).find((line) => tokens.every((token) => line.includes(token)))
  if (found === undefined) throw new Error(`the requirements hold no line naming ${tokens.join(', ')}`)
  return found
}

const FITS_NOTE_TOKENS = ['`S-584`', '`S-32`', '`S-31`', '`S-260`', 'MUST'] as const

describe('CR-758 -- the manuscript these cases are driven by', () => {
  it.each([
    ['T-273 LP-1', 'T-273', 'LP-1', ['`S-584`', '`S-32`']],
    ['T-273 LP-2', 'T-273', 'LP-2', ['`S-584`', '`S-32`']],
    ['T-273 LP-5', 'T-273', 'LP-5', ['`S-584`', '`S-32`']],
    ['T-273 LP-7', 'T-273', 'LP-7', ['`S-584`', '`S-301`']],
    ['T-221 LF-5', 'T-221', 'LF-5', ['`VG-2`', '`x2`']],
    ['T-222 RP-2', 'T-222', 'RP-2', ['`x1`', '`LF-5`', '`x2`', '`RP-4`']],
    ['T-222 RP-3', 'T-222', 'RP-3', ['`RP-2`']],
    ['T-303 EL-19', 'T-303', 'EL-19', ['`GA-19`', '`GA-24`', '`PE-12`', '`FR-108`', 'MUST']],
    ['T-303 EL-16', 'T-303', 'EL-16', ['`HT-1`', '`VG-4`', '`EL-19`']],
    ['T-266 GA-19', 'T-266', 'GA-19', ['`S-285`']],
  ] as const)('%s still names the rows these cases read', (_name, table, id, tokens) => {
    const text = rowText(table, id)
    for (const token of tokens) expect(text, `${table} ${id}`).toContain(token)
  })

  it('the T-273 fits note names S-584 with S-32, S-31 and S-260', () => {
    expect(lineHolding(FITS_NOTE_TOKENS).length).toBeGreaterThan(0)
  })

  it('T-018 DP-1 and DP-2 bend counts read 0 / 4; T-222 RP-2 and RP-3 read 4', () => {
    for (const id of ['DP-1', 'DP-2']) {
      expect(rowOf('T-018', id).cells.map((one) => one.trim()), `T-018 ${id}`).toContain('0 / 4')
    }
    expect(bendsOfPattern('RP-2'), 'T-222 RP-2').toBe(4)
    expect(bendsOfPattern('RP-3'), 'T-222 RP-3').toBe(4)
    expect(bendsOfPattern('RP-4'), 'T-222 RP-4').toBe(4)
  })
})


const SIX_ROWS = ['S-19', 'S-298', 'S-299', 'S-300', 'S-302', 'S-584'] as const

describe('CR-758 case 1 -- T-201 defaults equal the generated constants', () => {
  it('T-201 S-584 is the key progressMarkerEdgeGap', () => {
    expect(keyOf('S-584')).toBe('progressMarkerEdgeGap')
  })

  it.each(SIX_ROWS)('T-201 %s: the generated value equals the manuscript default', (id) => {
    const key = keyOf(id)
    const constants = SETTINGS_CONSTANTS as unknown as Readonly<Record<string, unknown>>
    const defaults = SETTINGS_DEFAULTS as Readonly<Record<string, unknown>>
    const generated = constants[key] ?? defaults[key]
    expect(generated, `T-201 ${id} ${key}`).toBe(T201(id))
  })
})

type Loose = Record<string, unknown>

interface Pt {
  readonly x: number
  readonly y: number
}

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Bar {
  readonly form: 'outline' | 'line'
  readonly points?: readonly Pt[]
  readonly from?: Pt
  readonly to?: Pt
  readonly strokeWidth?: number
}

interface DrawnTask {
  readonly taskUid: number
  readonly plan: Bar | null
  readonly actual: Bar | null
  readonly milestoneFigure: Bar | null
  readonly dummies: readonly { readonly ink: Rect }[]
  readonly marker: { readonly center: Pt; readonly radius: number } | null
  readonly label: Rect | null
  readonly assigneeLabel: Rect | null
}

interface Line {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly linkType: number
  readonly pattern: string
  readonly points: readonly Pt[]
  readonly elision: string
  readonly drawnPoints: readonly Pt[]
  readonly continuation: { readonly dots: readonly Pt[]; readonly radius: number } | null
  readonly strokeWidth?: number
  readonly head?: readonly Pt[]
  readonly wholeRouteHead?: readonly Pt[]
}

interface Placed {
  readonly taskUid: number
  readonly groupId: string
  readonly x: number
  readonly width: number
  readonly y: number
  readonly height: number
  readonly planHeight: number
}

interface GroupPlaced {
  readonly groupId: string
  readonly y: number
  readonly height: number
}

interface TaskWish {
  readonly uid: number
  readonly group: string
  readonly start: number
  readonly finish: number
  readonly name?: string
  readonly milestone?: boolean
  readonly shapeKind?: string
  readonly preds?: readonly (readonly [number, number])[]
  readonly assigned?: string
  readonly percent?: number
}

interface SceneWish {
  readonly groups: readonly string[]
  readonly tasks: readonly TaskWish[]
  readonly displayScale?: number
  readonly scrollDay?: number
  readonly settings?: Loose
}

interface Scene {
  readonly geometry: unknown
  readonly ratio: number
  readonly area: Rect
  readonly lines: readonly Line[]
  readonly drawn: readonly DrawnTask[]
  readonly placements: readonly Placed[]
  readonly groups: readonly GroupPlaced[]
  readonly line: (predecessorUid: number, successorUid: number) => Line
  readonly task: (uid: number) => DrawnTask
  readonly placed: (uid: number) => Placed
  readonly group: (id: string) => GroupPlaced
}

const FS = 1
const SF = 2

const SCREEN = { width: 2400, height: 1400, appHeaderHeight: 48, scrollbarThickness: 8, propertyPanelWidth: 0 }

const BASE_DAY = Date.UTC(2026, 2, 1)
const dateOf = (n: number, close: boolean): string =>
  `${new Date(BASE_DAY + n * 86400000).toISOString().slice(0, 10)}T${close ? '17' : '00'}:00:00`

const EVERY_DAY_WORKED = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((ordinal) => ({
    ordinal,
    dayType: ordinal,
    dayWorking: true,
    workingTimes: [],
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
}

const taskOf = (wish: TaskWish): Task =>
  ({
    uid: wish.uid,
    parentTaskUid: null,
    wbsOrder: null,
    name: wish.name ?? `t${wish.uid}`,
    start: dateOf(wish.start, false),
    finish: wish.milestone === true ? dateOf(wish.start, false) : dateOf(wish.finish, true),
    milestone: wish.milestone === true ? true : null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: dateOf(wish.start, false),
    stop: null,
    actualFinish: wish.milestone === true ? dateOf(wish.start, false) : dateOf(wish.finish, true),
    resume: null,
    resumeValid: null,
    percentComplete: wish.percent ?? 100,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: (wish.preds ?? []).map(([predecessorUid, linkType]) => ({
      predecessorUid,
      linkType,
      lag: null,
      lagFormat: null,
      carry: {},
      carryElements: [],
    })),
    carry: {},
    carryElements: [],
  }) as unknown as Task

const scheduleOf = (wish: SceneWish): Schedule => {
  const assigned = wish.tasks.filter((one) => one.assigned !== undefined)
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
      created: null,
      revision: null,
      startDate: dateOf(0, false),
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
      importSeq: 0,
      carry: {},
      carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks: wish.tasks.map(taskOf),
    resources: assigned.map((one, index) => ({
      uid: 500 + index,
      name: one.assigned,
      resourceKind: 1,
      isCostResource: false,
      calendarUid: null,
      carry: {},
      carryElements: [],
    })),
    assignments: assigned.map((one, index) => ({
      uid: 600 + index,
      taskUid: one.uid,
      resourceUid: 500 + index,
      carry: {},
      carryElements: [],
    })),
    taskGroups: wish.groups.map((id, order) => ({
      id,
      parentId: null,
      label: id,
      derivedFromTaskUid: null,
      order,
      treeState: 'auto',
      editGroup: null,
      color: null,
      minHeight: null,
    })),
    taskGroupMembers: wish.tasks.map((one) => ({ taskUid: one.uid, groupId: one.group })),
    taskVisuals: wish.tasks.map((one) => ({
      taskUid: one.uid,
      shapeKind: one.shapeKind ?? (one.milestone === true ? 'milestone' : 'rectangle'),
      milestoneGlyph: null,
      fillColor: null,
      strokeColor: null,
      strokeWidthPx: null,
    })),
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

const settingsOf = (over: Loose = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown> | undefined) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

const sceneOf = (wish: SceneWish): Scene => {
  const displayScale = wish.displayScale ?? 100
  const settings = settingsOf({
    zoomX: 8,
    scrollDate: dateOf(wish.scrollDay ?? -3, false),
    stackDirection: 'down',
    progressMarkerVisible: true,
    assigneeVisible: true,
    percentCompleteVisible: true,
    displayScale,
    ...(wish.settings ?? {}),
  })
  const schedule = scheduleOf(wish)
  const regions = regionsFromScreen(SCREEN as never, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  const lines = (geometry as unknown as { readonly dependencies: readonly Line[] }).dependencies
  const drawn = (geometry as unknown as { readonly tasks: readonly DrawnTask[] }).tasks
  const typedLayout = layout as unknown as { readonly placements: readonly Placed[]; readonly taskGroups: readonly GroupPlaced[] }
  return {
    geometry,
    ratio: displayRatioAt(displayScale),
    area: (regions as unknown as { readonly taskGroupArea: Rect }).taskGroupArea,
    lines,
    drawn,
    placements: typedLayout.placements,
    groups: typedLayout.taskGroups,
    line: (p, s) => {
      const found = lines.find((one) => one.predecessorUid === p && one.successorUid === s)
      if (found === undefined) throw new Error(`premise: the geometry holds no line ${p} -> ${s}`)
      return found
    },
    task: (uid) => {
      const found = drawn.find((one) => one.taskUid === uid)
      if (found === undefined) throw new Error(`premise: task ${uid} was not drawn`)
      return found
    },
    placed: (uid) => {
      const found = typedLayout.placements.find((one) => one.taskUid === uid)
      if (found === undefined) throw new Error(`premise: task ${uid} was not placed`)
      return found
    },
    group: (id) => {
      const found = typedLayout.taskGroups.find((one) => one.groupId === id)
      if (found === undefined) throw new Error(`premise: task group ${id} was not laid out`)
      return found
    },
  }
}

const EPS = 1e-6

// WHY: a route may carry a repeated point or a straight-through point; neither is a bend.
const simplified = (points: readonly Pt[]): readonly Pt[] => {
  const unique: Pt[] = []
  for (const one of points) {
    const last = unique[unique.length - 1]
    if (last === undefined || Math.abs(last.x - one.x) > EPS || Math.abs(last.y - one.y) > EPS) unique.push(one)
  }
  const out: Pt[] = []
  for (const one of unique) {
    while (out.length >= 2) {
      const a = out[out.length - 2]!
      const b = out[out.length - 1]!
      const cross = (b.x - a.x) * (one.y - b.y) - (b.y - a.y) * (one.x - b.x)
      if (Math.abs(cross) > 1e-6) break
      out.pop()
    }
    out.push(one)
  }
  return out
}

const bendsOf = (points: readonly Pt[]): number => Math.max(0, simplified(points).length - 2)

const isHorizontal = (a: Pt, b: Pt): boolean => Math.abs(a.y - b.y) <= EPS && Math.abs(a.x - b.x) > EPS
const isVertical = (a: Pt, b: Pt): boolean => Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) > EPS

const distanceToSegment = (p: Pt, a: Pt, b: Pt): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

const distanceToPath = (p: Pt, path: readonly Pt[]): number => {
  let best = Number.POSITIVE_INFINITY
  for (let at = 1; at < path.length; at += 1) best = Math.min(best, distanceToSegment(p, path[at - 1]!, path[at]!))
  return best
}

const samplesOnSegment = (a: Pt, b: Pt, step = 0.05): readonly Pt[] => {
  const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step))
  return Array.from({ length: count + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / count, y: a.y + ((b.y - a.y) * i) / count }))
}

const samplesInTriangle = (tri: readonly Pt[], steps = 60): readonly Pt[] => {
  const [a, b, c] = tri as readonly [Pt, Pt, Pt]
  const out: Pt[] = []
  for (let i = 0; i <= steps; i += 1) {
    for (let j = 0; j <= steps - i; j += 1) {
      const u = i / steps
      const v = j / steps
      const w = 1 - u - v
      out.push({ x: a.x * u + b.x * v + c.x * w, y: a.y * u + b.y * v + c.y * w })
    }
  }
  return out
}

// WHY: touching is not overlapping; a point exactly on the edge does not count.
const insideRect = (p: Pt, r: Rect, pad: number): boolean =>
  p.x > r.x - pad + 1e-4 && p.x < r.x + r.width + pad - 1e-4 && p.y > r.y - pad + 1e-4 && p.y < r.y + r.height + pad - 1e-4

const insideCircle = (p: Pt, c: Pt, radius: number, pad: number): boolean => Math.hypot(p.x - c.x, p.y - c.y) < radius + pad - 1e-4

const rightOfBar = (bar: Bar): number =>
  bar.form === 'line' ? Math.max(bar.from!.x, bar.to!.x) : Math.max(...(bar.points ?? []).map((one) => one.x))
const leftOfBar = (bar: Bar): number =>
  bar.form === 'line' ? Math.min(bar.from!.x, bar.to!.x) : Math.min(...(bar.points ?? []).map((one) => one.x))
const bottomOfBar = (bar: Bar): number =>
  bar.form === 'line' ? Math.max(bar.from!.y, bar.to!.y) : Math.max(...(bar.points ?? []).map((one) => one.y))
const topOfBar = (bar: Bar): number =>
  bar.form === 'line' ? Math.min(bar.from!.y, bar.to!.y) : Math.min(...(bar.points ?? []).map((one) => one.y))

// see S-18, VG-4
const LINE_WIDTH = (ratio: number): number => T201('S-18') * ratio

const LP = (id: string): string => `T-273 ${id} [${rowText('T-273', id)}]`

describe('CR-758 case 2 -- T-273 LP-1 / LP-2 / LP-5 / LP-7 and the fits sum', () => {
  const SCALES = [50, 100, 200] as const
  const plainTask = taskOf({ uid: 1, group: 'g', start: 0, finish: 5 })

  it.each(SCALES)('display scale %i: LP-1 / LP-2 / LP-5 / LP-7 put the marker left S-584 (drawn) off the bar edge', (scale) => {
    const drawnSettings = drawnSettingsOf(settingsOf({ displayScale: scale }))
    const ratio = displayRatioAt(scale)
    const gap = T201('S-584') * ratio
    const diameter = T201('S-22') * ratio
    const labelGap = T201('S-32') * ratio
    const milestoneGap = T201('S-301') * ratio
    const wide = { x: 100, width: 2000, fitWidth: 2000, nameFloor: 100 }
    const narrow = { x: 100, width: 30, fitWidth: 30, nameFloor: 100 }
    const diamond = { x: 100, width: 12, fitWidth: 12, nameFloor: 100 }

    const lp1 = labelLayoutOf('rectangle', wide, 40, diameter, true, wide.x + wide.width, drawnSettings)
    expect(lp1.fits, `premise: ${LP('LP-1')}`).toBe(true)
    expect(lp1.markerLeft, LP('LP-1')).toBeCloseTo(wide.x + gap, 6)
    expect(lp1.nameX, LP('LP-1')).toBeCloseTo(wide.x + gap + diameter + labelGap, 6)

    const outward = outwardStartOf(narrow.x + narrow.width, plainTask, 'rectangle', diameter)
    expect(outward, 'premise: no resume icon, so the outward start is the basis end').toBeCloseTo(narrow.x + narrow.width, 6)
    const lp2 = labelLayoutOf('rectangle', narrow, 400, diameter, true, outward, drawnSettings)
    expect(lp2.fits, `premise: ${LP('LP-2')}`).toBe(false)
    expect(lp2.markerLeft, LP('LP-2')).toBeCloseTo(narrow.x + narrow.width + gap, 6)
    expect(lp2.nameX, LP('LP-2')).toBeCloseTo(narrow.x + narrow.width + gap + diameter + labelGap, 6)

    for (const shapeKind of ['arrow', 'endpointSpan'] as const) {
      for (const reference of [wide, narrow]) {
        const lp5 = labelLayoutOf(shapeKind, reference, 400, diameter, true, reference.x + reference.width, drawnSettings)
        expect(lp5.markerLeft, `${shapeKind} width ${reference.width}: ${LP('LP-5')}`).toBeCloseTo(reference.x + gap, 6)
      }
    }

    const lp7 = labelLayoutOf('milestone', diamond, 40, diameter, true, diamond.x + diamond.width, drawnSettings)
    expect(lp7.markerLeft, LP('LP-7')).toBeCloseTo(diamond.x + diamond.width + gap, 6)
    expect(lp7.nameX, LP('LP-7')).toBeCloseTo(diamond.x + diamond.width + gap + diameter + milestoneGap, 6)
  })

  it.each(SCALES)(`display scale %i: the T-273 fits sum includes S-584 (${lineHolding(FITS_NOTE_TOKENS)})`, (scale) => {
    const drawnSettings = drawnSettingsOf(settingsOf({ displayScale: scale }))
    const ratio = displayRatioAt(scale)
    const gap = T201('S-584') * ratio
    const diameter = T201('S-22') * ratio
    const labelGap = T201('S-32') * ratio
    const textWidth = 60
    const withoutGap = diameter + labelGap + textWidth + T206('S-260')
    const withGap = gap + withoutGap
    const fitsAt = (width: number): boolean =>
      labelLayoutOf('rectangle', { x: 100, width, fitWidth: width, nameFloor: 100 }, textWidth, diameter, true, 100 + width, drawnSettings).fits
    expect(fitsAt(withoutGap), 'a name that fit exactly without S-584 no longer fits').toBe(false)
    expect(fitsAt(withGap - gap / 2), 'short of the sum by half of S-584: does not fit').toBe(false)
    expect(fitsAt(withGap + 1e-6), 'the sum with S-584: fits').toBe(true)
  })
})

const RP = (id: string): string => `T-222 ${id} [${rowText('T-222', id)}]`

interface RouteShape {
  readonly firstRun: number
  readonly lastRun: number
  readonly x1: number
  readonly x2: number
  readonly corridorY: number
}

// see T-222
const fourBendShapeOf = (line: Line, label: string): RouteShape => {
  const route = simplified(line.points)
  expect(route.length, `${label}: four bends`).toBe(6)
  const [p0, p1, p2, p3, p4, p5] = route as readonly [Pt, Pt, Pt, Pt, Pt, Pt]
  expect(isHorizontal(p0, p1), `${label}: the exit run is horizontal`).toBe(true)
  expect(isVertical(p1, p2), `${label}: then vertical at x1`).toBe(true)
  expect(isHorizontal(p2, p3), `${label}: then the corridor run`).toBe(true)
  expect(isVertical(p3, p4), `${label}: then vertical at x2`).toBe(true)
  expect(isHorizontal(p4, p5), `${label}: then the entry run`).toBe(true)
  return { firstRun: Math.abs(p1.x - p0.x), lastRun: Math.abs(p5.x - p4.x), x1: p1.x, x2: p4.x, corridorY: p2.y }
}

describe('CR-758 case 3 -- T-222 RP-2 / RP-3 route through the corridor with four bends', () => {
  const two = (pred: TaskWish, succ: TaskWish, groups: readonly string[] = ['a', 'b']): Scene =>
    sceneOf({ groups, tasks: [pred, succ] })

  const cases = [
    {
      name: 'FS down, x2 >= x1',
      pattern: 'RP-2',
      scene: () => two({ uid: 1, group: 'a', start: 0, finish: 5 }, { uid: 2, group: 'b', start: 12, finish: 18, preds: [[1, FS]] }),
    },
    {
      name: 'FS up, x2 >= x1',
      pattern: 'RP-3',
      scene: () => two({ uid: 1, group: 'b', start: 0, finish: 5 }, { uid: 2, group: 'a', start: 12, finish: 18, preds: [[1, FS]] }),
    },
    {
      name: 'SF down, mirrored x2 >= x1',
      pattern: 'RP-2',
      scene: () => two({ uid: 1, group: 'a', start: 12, finish: 18 }, { uid: 2, group: 'b', start: 0, finish: 5, preds: [[1, SF]] }),
    },
    {
      name: 'SF up, mirrored x2 >= x1',
      pattern: 'RP-3',
      scene: () => two({ uid: 1, group: 'b', start: 12, finish: 18 }, { uid: 2, group: 'a', start: 0, finish: 5, preds: [[1, SF]] }),
    },
  ] as const

  it.each(cases)('$name: pattern $pattern, four bends, exit run S-298 and entry run S-299 (drawn)', ({ pattern, scene }) => {
    const one = scene()
    const line = one.line(1, 2)
    expect(line.pattern, RP(pattern)).toBe(pattern)
    expect(bendsOf(line.points), `${RP(pattern)} -- bends (T-222 ${BENDS_OF_T222})`).toBe(bendsOfPattern(pattern))
    const shape = fourBendShapeOf(line, RP(pattern))
    expect(shape.firstRun, `${RP(pattern)}: x1 is the exit edge plus S-298 (T-222 preface)`).toBeCloseTo(T201('S-298') * one.ratio, 6)
    expect(shape.lastRun, `${RP(pattern)}: x2 is the entry edge less S-299 (T-222 preface)`).toBeCloseTo(T201('S-299') * one.ratio, 6)
    const pred = one.placed(1)
    const succ = one.placed(2)
    const [upper, lower] = pred.y < succ.y ? [pred, succ] : [succ, pred]
    expect(shape.corridorY, `${RP(pattern)}: the corridor runs between the two lanes (LF-5)`).toBeGreaterThan(upper.y + upper.planHeight)
    expect(shape.corridorY, `${RP(pattern)}: the corridor runs between the two lanes (LF-5)`).toBeLessThan(lower.y)
  })

  it('T-018 DP-1 / DP-2: every FS and SF route bends 0 or 4 times', () => {
    const layouts: readonly (readonly [string, string, number, number, number, number])[] = [
      ['a', 'b', 0, 5, 12, 18],
      ['b', 'a', 0, 5, 12, 18],
      ['a', 'b', 0, 10, 3, 8],
      ['b', 'a', 0, 10, 3, 8],
      ['a', 'c', 0, 5, 12, 18],
      ['c', 'a', 0, 5, 12, 18],
      ['a', 'c', 0, 10, 3, 8],
      ['a', 'b', 12, 18, 0, 5],
      ['b', 'a', 12, 18, 0, 5],
    ]
    for (const linkType of [FS, SF]) {
      for (const [pg, sg, ps, pf, ss, sf] of layouts) {
        const one = sceneOf({
          groups: ['a', 'b', 'c'],
          tasks: [
            { uid: 1, group: pg, start: ps, finish: pf },
            { uid: 2, group: sg, start: ss, finish: sf, preds: [[1, linkType]] },
          ],
        })
        const line = one.line(1, 2)
        const bends = bendsOf(line.points)
        expect([0, 4], `T-018 ${linkType === FS ? 'DP-1' : 'DP-2'} ${pg}->${sg} ${ps}-${pf} / ${ss}-${sf}: ${line.pattern}`).toContain(bends)
      }
    }
    const sameLane = sceneOf({
      groups: ['a'],
      tasks: [
        { uid: 1, group: 'a', start: 0, finish: 5 },
        { uid: 2, group: 'a', start: 20, finish: 25, preds: [[1, FS]] },
      ],
    })
    expect(sameLane.line(1, 2).pattern, `premise: ${RP('RP-1')}`).toBe('RP-1')
    expect(bendsOf(sameLane.line(1, 2).points), 'T-018 DP-1: RP-1 has no bend').toBe(0)
  })
})

describe('CR-758 case 4 -- T-221 LF-5 places the corridor beside the predecessor', () => {
  const LF5 = `T-221 LF-5 [${rowText('T-221', 'LF-5')}]`

  const corridorOf = (one: Scene): number => fourBendShapeOf(one.line(1, 2), LF5).corridorY

  it('going down over one lane: the corridor keeps the offset it has between adjacent lanes, above the skipped lane', () => {
    const adjacent = sceneOf({
      groups: ['a', 'b'],
      tasks: [
        { uid: 1, group: 'a', start: 0, finish: 5 },
        { uid: 2, group: 'b', start: 12, finish: 18, preds: [[1, FS]] },
      ],
    })
    const skip = sceneOf({
      groups: ['a', 'm', 'b'],
      tasks: [
        { uid: 1, group: 'a', start: 0, finish: 5 },
        { uid: 3, group: 'm', start: 30, finish: 36 },
        { uid: 2, group: 'b', start: 12, finish: 18, preds: [[1, FS]] },
      ],
    })
    expect(skip.line(1, 2).pattern, `premise: ${RP('RP-2')}`).toBe('RP-2')
    const offsetAdjacent = corridorOf(adjacent) - adjacent.placed(1).y
    const offsetSkip = corridorOf(skip) - skip.placed(1).y
    expect(offsetSkip, `${LF5} -- the lane right below the predecessor, not midway to the successor`).toBeCloseTo(offsetAdjacent, 3)
    const skipped = skip.group('m')
    expect(corridorOf(skip), `${LF5} -- not across the skipped lane`).toBeLessThan(skipped.y)
    expect(corridorOf(skip), `${LF5} -- below the predecessor`).toBeGreaterThan(skip.placed(1).y + skip.placed(1).planHeight)
  })

  it('going up over one lane: mirrored -- the corridor keeps its adjacent offset, below the skipped lane', () => {
    const adjacent = sceneOf({
      groups: ['b', 'a'],
      tasks: [
        { uid: 2, group: 'b', start: 12, finish: 18, preds: [[1, FS]] },
        { uid: 1, group: 'a', start: 0, finish: 5 },
      ],
    })
    const skip = sceneOf({
      groups: ['b', 'm', 'a'],
      tasks: [
        { uid: 2, group: 'b', start: 12, finish: 18, preds: [[1, FS]] },
        { uid: 3, group: 'm', start: 30, finish: 36 },
        { uid: 1, group: 'a', start: 0, finish: 5 },
      ],
    })
    expect(skip.line(1, 2).pattern, `premise: ${RP('RP-3')}`).toBe('RP-3')
    const offsetAdjacent = adjacent.placed(1).y - corridorOf(adjacent)
    const offsetSkip = skip.placed(1).y - corridorOf(skip)
    expect(offsetSkip, `${LF5} -- the lane right above the predecessor, not midway to the successor`).toBeCloseTo(offsetAdjacent, 3)
    // WHY: LF-5 reads the lane's bottom, its Task's bottom; the group band also holds the trailing VG-2 gap (LF-2).
    const skipped = skip.placed(3)
    expect(corridorOf(skip), `${LF5} -- not across the skipped lane`).toBeGreaterThan(skipped.y + skipped.planHeight)
    expect(corridorOf(skip), `${LF5} -- above the predecessor`).toBeLessThan(skip.placed(1).y)
  })

  it('RP-4 over one lane reads the same corridor as RP-2 (both read LF-5)', () => {
    const rp2 = sceneOf({
      groups: ['a', 'm', 'b'],
      tasks: [
        { uid: 1, group: 'a', start: 0, finish: 5 },
        { uid: 3, group: 'm', start: 30, finish: 36 },
        { uid: 2, group: 'b', start: 12, finish: 18, preds: [[1, FS]] },
      ],
    })
    const rp4 = sceneOf({
      groups: ['a', 'm', 'b'],
      tasks: [
        { uid: 1, group: 'a', start: 0, finish: 10 },
        { uid: 3, group: 'm', start: 30, finish: 36 },
        { uid: 2, group: 'b', start: 3, finish: 8, preds: [[1, FS]] },
      ],
    })
    expect(rp4.line(1, 2).pattern, `premise: ${RP('RP-4')}`).toBe('RP-4')
    expect(corridorOf(rp4) - rp4.placed(1).y, LF5).toBeCloseTo(corridorOf(rp2) - rp2.placed(1).y, 3)
  })

  it('LF-5 adjacent lanes: the corridor is the midpoint of the two lanes, as before', () => {
    const one = sceneOf({
      groups: ['a', 'b'],
      tasks: [
        { uid: 1, group: 'a', start: 0, finish: 5 },
        { uid: 2, group: 'b', start: 12, finish: 18, preds: [[1, FS]] },
      ],
    })
    const pred = one.task(1)
    const succ = one.task(2)
    const predBottom = bottomOfBar(pred.plan!)
    const succTop = topOfBar(succ.plan!)
    expect(corridorOf(one), LF5).toBeCloseTo((predBottom + succTop) / 2, 1)
  })
})

// WHY: one task per task group, so the route patterns are set by the dates alone (no RP-1 in the sample).
// WHY: the milestone carries no link: by S-303, S-302 and RF-1 its own label and marker stand where a line meets it.
const SAMPLE_GROUPS = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'] as const
const SAMPLE_TASKS: readonly TaskWish[] = [
  { uid: 8, group: 'g0', start: 53, finish: 58, name: 'Review', preds: [[6, FS]] },
  { uid: 1, group: 'g1', start: 0, finish: 2, name: 'Requirements analysis and sign-off', assigned: 'Ada' },
  { uid: 2, group: 'g2', start: 9, finish: 15, name: 'Design', preds: [[1, FS]], assigned: 'A very long assignee name', percent: 60 },
  { uid: 3, group: 'g3', start: 17, finish: 40, name: 'Build', preds: [[2, FS]], percent: 40 },
  { uid: 4, group: 'g4', start: 10, finish: 22, name: 'Prototype', preds: [[1, FS]] },
  { uid: 5, group: 'g5', start: 42, finish: 42, name: 'Gate', milestone: true },
  { uid: 6, group: 'g6', start: 44, finish: 50, name: 'Release', preds: [[3, FS]] },
  { uid: 7, group: 'g7', start: 3, finish: 9, name: 'Training', preds: [[2, FS]] },
]

// WHY: half the default zoom keeps every task on screen at display scale 200 (EL-3 throughout).
const SAMPLE_SETTINGS: Loose = { zoomX: 4 }

interface Overlap {
  readonly line: string
  readonly part: 'core' | 'head'
  readonly end: number
  readonly box: 'marker' | 'label' | 'assigneeLabel'
}

const overlapsOf = (one: Scene): readonly Overlap[] => {
  const out: Overlap[] = []
  const halfWidth = LINE_WIDTH(one.ratio) / 2
  for (const line of one.lines) {
    const name = `${line.predecessorUid}->${line.successorUid} ${line.pattern}`
    const core = line.drawnPoints.length > 0 ? line.drawnPoints : line.points
    const corePoints = core.flatMap((p, i) => (i === 0 ? [] : samplesOnSegment(core[i - 1]!, p)))
    const headPoints = line.head === undefined || line.head.length < 3 ? [] : samplesInTriangle(line.head)
    for (const end of [line.predecessorUid, line.successorUid]) {
      const drawn = one.drawn.find((t) => t.taskUid === end)
      if (drawn === undefined) continue
      const parts: readonly (readonly ['core' | 'head', readonly Pt[], number])[] = [
        ['core', corePoints, halfWidth],
        ['head', headPoints, 0],
      ]
      for (const [part, points, pad] of parts) {
        if (drawn.marker !== null && points.some((p) => insideCircle(p, drawn.marker!.center, drawn.marker!.radius, pad))) {
          out.push({ line: name, part, end, box: 'marker' })
        }
        if (drawn.label !== null && points.some((p) => insideRect(p, drawn.label!, pad))) out.push({ line: name, part, end, box: 'label' })
        if (drawn.assigneeLabel !== null && points.some((p) => insideRect(p, drawn.assigneeLabel!, pad))) {
          out.push({ line: name, part, end, box: 'assigneeLabel' })
        }
      }
    }
  }
  return out
}

describe('CR-758 case 5 -- a sample-50-like schedule: lines stay clear of their ends\' markers and labels', () => {
  const SCALES = [50, 100, 200] as const

  it.each(SCALES)('display scale %i: no dependency core or head overlaps the marker, name label or assignee label of its ends (JDG-1900; RT-5 crossings of other lanes not counted)', (scale) => {
    const one = sceneOf({ groups: SAMPLE_GROUPS, tasks: SAMPLE_TASKS, displayScale: scale, settings: SAMPLE_SETTINGS })
    expect(one.lines.length, 'premise: every link is drawn').toBe(6)
    for (const line of one.lines) expect(line.elision, `premise: ${line.predecessorUid}->${line.successorUid} both ends seen`).toBe('EL-3')
    const patterns = new Set(one.lines.map((line) => line.pattern))
    for (const wanted of ['RP-2', 'RP-3', 'RP-4']) expect(patterns.has(wanted), `premise: the sample holds a ${wanted} line`).toBe(true)
    expect(one.task(2).assigneeLabel, 'premise: the long assignee label is drawn').not.toBeNull()
    expect(overlapsOf(one)).toEqual([])
  })

  it.each(SCALES)('display scale %i: the drawn markers stand S-584 (drawn) off their bar edge (LP-1 / LP-2 / LP-7)', (scale) => {
    const one = sceneOf({ groups: SAMPLE_GROUPS, tasks: SAMPLE_TASKS, displayScale: scale, settings: SAMPLE_SETTINGS })
    const gap = T201('S-584') * one.ratio
    const leftOf = (uid: number): number => {
      const marker = one.task(uid).marker
      expect(marker, `premise: task ${uid} draws a marker`).not.toBeNull()
      return marker!.center.x - marker!.radius
    }
    const basisOf = (uid: number): Bar => {
      const drawn = one.task(uid)
      const basis = drawn.actual ?? drawn.milestoneFigure ?? drawn.plan
      expect(basis, `premise: task ${uid} has a basis`).not.toBeNull()
      return basis!
    }
    expect(leftOf(1), LP('LP-2')).toBeCloseTo(rightOfBar(basisOf(1)) + gap, 3)
    expect(leftOf(5), LP('LP-7')).toBeCloseTo(rightOfBar(basisOf(5)) + gap, 3)
    if (scale === 100) expect(leftOf(3), LP('LP-1')).toBeCloseTo(leftOfBar(basisOf(3)) + gap, 3)
  })
})

type Landed = { readonly predecessorUid: number; readonly successorUid: number } | null

const FAR = 400

// see EL-5
const offLeft = (): Scene =>
  sceneOf({
    groups: ['a', 'b'],
    tasks: [
      { uid: 1, group: 'a', start: 0, finish: 5 },
      { uid: 2, group: 'b', start: FAR, finish: FAR + 5, preds: [[1, FS]] },
    ],
    scrollDay: FAR - 10,
  })

const hitAt = (one: Scene, landed: Landed, at: Pt): { readonly item: Loose; readonly grab: string } | null => {
  const walk = pointerWalkOf(one.geometry as never, grabSizesOf(), landed as never)
  return answersAtPointer(walk, at.x, at.y).hit as unknown as { readonly item: Loose; readonly grab: string } | null
}

const isTheLine = (hit: { readonly item: Loose } | null): boolean =>
  hit !== null && hit.item['kind'] === 'dependency' && hit.item['predecessorUid'] === 1 && hit.item['successorUid'] === 2

const LANDED: Landed = { predecessorUid: 1, successorUid: 2 }

// see EL-19, GA-19
const longRunOf = (one: Scene): { readonly y: number; readonly x: number } => {
  const line = one.line(1, 2)
  const shape = fourBendShapeOf(line, RP(line.pattern))
  const seenLeft = Math.max(shape.x1, one.area.x)
  const x = seenLeft + (shape.x2 - seenLeft) / 3
  expect(shape.x2 - x, 'premise: the press is far from the short line').toBeGreaterThan(50)
  expect(x, 'premise: the press is inside the Task Group Area').toBeGreaterThan(one.area.x + 5)
  return { y: shape.corridorY, x }
}

describe('CR-758 case 6 -- T-303 EL-19: the landed line answers on its drawn whole route', () => {
  it('premise: the predecessor is off screen, the successor seen (EL-5), routed RP-2', () => {
    const one = offLeft()
    const line = one.line(1, 2)
    expect(line.elision).toBe('EL-5')
    expect(line.pattern).toBe('RP-2')
    expect(one.placed(1).x + one.placed(1).width).toBeLessThan(one.area.x)
    expect(one.placed(2).x).toBeGreaterThan(one.area.x)
    expect(line.continuation, 'the unlanded line carries the mark (EL-9)').not.toBeNull()
  })

  it('PI-6 / EL-19: every line carries wholeRouteHead, the arrowHeadOf the whole route at the drawn S-19 / S-300', () => {
    for (const one of [offLeft(), sceneOf({ groups: SAMPLE_GROUPS, tasks: SAMPLE_TASKS, settings: SAMPLE_SETTINGS })]) {
      for (const line of one.lines) {
        const expected = arrowHeadOf(line.points as never, T201('S-19') * one.ratio, T201('S-300') * one.ratio)
        expect(line.wholeRouteHead, `${line.predecessorUid}->${line.successorUid} ${line.elision}`).toBeDefined()
        const got = line.wholeRouteHead ?? []
        expect(got.length).toBe(expected.length)
        got.forEach((p, i) => {
          expect(p.x).toBeCloseTo(expected[i]!.x, 6)
          expect(p.y).toBeCloseTo(expected[i]!.y, 6)
        })
      }
    }
  })

  it('EL-19 / GA-19: with the line landed, a press on the long drawn run selects the dependency', () => {
    const one = offLeft()
    const at = longRunOf(one)
    const hit = hitAt(one, LANDED, at)
    expect(isTheLine(hit), `T-303 EL-19: ${JSON.stringify(hit)}`).toBe(true)
    expect(hit?.grab, 'T-266 GA-19').toBe('GA-19')
  })

  it('EL-19 / GA-24: with the line landed, a press on the old continuation mark where no line is drawn answers neither the mark nor a jump', () => {
    const one = offLeft()
    const line = one.line(1, 2)
    const dots = line.continuation?.dots ?? []
    expect(dots.length, 'premise: the unlanded line carries three dots (EL-9)').toBe(3)
    const band = LINE_WIDTH(one.ratio) / 2 + T206('S-285')
    const clear = dots.filter((dot) => distanceToPath(dot, line.points) > band + 1)
    expect(clear.length, 'premise: at least one old dot lies off the drawn whole route').toBeGreaterThan(0)
    for (const dot of clear) {
      const hit = hitAt(one, LANDED, dot)
      expect(hit?.grab ?? null, `T-266 GA-24 at ${JSON.stringify(dot)}`).not.toBe('GA-24')
      expect(isTheLine(hit), `T-303 EL-19 at ${JSON.stringify(dot)}: ${JSON.stringify(hit)}`).toBe(false)
    }
  })
})

describe('CR-758 case 7 -- the change is scoped to the landed line', () => {
  it('without landed, the same press on the long run does not hit the elided line (EL-5)', () => {
    const one = offLeft()
    const at = longRunOf(one)
    expect(isTheLine(hitAt(one, null, at)), 'T-303 EL-5 draws only the short line').toBe(false)
  })

  it('a different landed line leaves this one elided', () => {
    const one = offLeft()
    const at = longRunOf(one)
    expect(isTheLine(hitAt(one, { predecessorUid: 7, successorUid: 8 }, at))).toBe(false)
  })
})

describe('CR-758 case 8 -- T-303 EL-16: the landed line keeps the unmarked width + S-285 band', () => {
  it('EL-16 / GA-19: the band across the long run is the unmarked width / 2 + S-285 each side, not widened by S-447', () => {
    const one = offLeft()
    const at = longRunOf(one)
    const inside = LINE_WIDTH(one.ratio) / 2 + T206('S-285')
    const widened = inside + T206('S-447') / 2
    for (const sign of [-1, 1]) {
      expect(isTheLine(hitAt(one, LANDED, { x: at.x, y: at.y + sign * (inside - 0.25) })), `GA-19 inside at ${sign}`).toBe(true)
      expect(isTheLine(hitAt(one, LANDED, { x: at.x, y: at.y + sign * (inside + T206('S-447') / 4) })), `EL-16: not widened by S-447 at ${sign}`).toBe(false)
      expect(widened).toBeGreaterThan(inside + T206('S-447') / 4)
    }
  })
})

describe('CR-758 case 9 -- FR-013 / T-266 GA-18: the S-584 gap between the bar edge and the marker answers the marker', () => {
  const SCALES = [50, 100, 200] as const
  const PLAN_SIDE: readonly string[] = ['GA-2', 'GA-9', 'GA-15']

  // WHY: a T-266 cell cites T-206 grab sizes only, so GA-18 points at FR-013, which names the S-584 gap.
  it('T-266 GA-18 points at FR-013, and T-267 HT-3 names S-584', () => {
    expect(rowText('T-266', 'GA-18'), 'T-266 GA-18').toContain('`FR-013`')
    expect(rowText('T-267', 'HT-3'), 'T-267 HT-3').toContain('`S-584`')
    expect(lineHolding(['`S-584`', 'MUST NOT']).length, 'FR-013').toBeGreaterThan(0)
    expect(lineHolding(['`FR-104`', '`GA-18`']).length, 'FR-013 names GA-18 as what answers the gap').toBeGreaterThan(0)
  })

  const pressOf = (one: Scene, at: Pt): { readonly item: Loose; readonly grab: string } | null => {
    const walk = pointerWalkOf(one.geometry as never, grabSizesOf(), null)
    return answersAtPointer(walk, at.x, at.y).hit as unknown as { readonly item: Loose; readonly grab: string } | null
  }

  const cases = [
    { row: 'LP-2', uid: 1, before: ['GA-4', 'GA-2'] },
    { row: 'LP-7', uid: 5, before: ['GA-16', 'GA-15'] },
  ] as const

  for (const { row, uid, before } of cases) {
    it.each(SCALES)(`T-273 ${row}, display scale %i: a press in the middle of the gap answers the progress marker (GA-18), not the plan (GA-2 / GA-9 / GA-15)`, (scale) => {
      const one = sceneOf({ groups: SAMPLE_GROUPS, tasks: SAMPLE_TASKS, displayScale: scale, settings: SAMPLE_SETTINGS })
      const drawn = one.task(uid)
      const basis = drawn.actual ?? drawn.milestoneFigure
      expect(basis, `premise: task ${uid} has an actual basis (RF-1)`).not.toBeNull()
      expect(drawn.marker, `premise: task ${uid} draws a marker`).not.toBeNull()
      const edge = rightOfBar(basis!)
      const markerLeft = drawn.marker!.center.x - drawn.marker!.radius
      expect(markerLeft - edge, `premise: ${row} stands the marker right of the edge`).toBeGreaterThan(0.5)
      // WHY: off the exit run of the lines leaving this end -- T-268 orders the line, and HT-3 lifts the marker only on its drawn box.
      const at = { x: (edge + markerLeft) / 2, y: drawn.marker!.center.y - drawn.marker!.radius * 0.9 }
      const band = LINE_WIDTH(one.ratio) / 2 + T206('S-285')
      for (const line of one.lines) expect(distanceToPath(at, line.drawnPoints), `premise: the press is off line ${line.predecessorUid}->${line.successorUid}`).toBeGreaterThan(band + 0.25)
      const hit = pressOf(one, at)
      expect(hit?.grab ?? null, `FR-013 / T-266 GA-18 at ${row}: ${JSON.stringify(hit)}`).toBe('GA-18')
      expect(hit?.item, `GA-18 belongs to task ${uid}`).toEqual({ kind: 'task', taskUid: uid })
      expect(PLAN_SIDE, `FR-013 MUST NOT at ${row}`).not.toContain(hit?.grab ?? '')
    })

    it.each(SCALES)(`T-273 ${row}, display scale %i: a press just left of the edge still answers the end (${before.join(' / ')})`, (scale) => {
      const one = sceneOf({ groups: SAMPLE_GROUPS, tasks: SAMPLE_TASKS, displayScale: scale, settings: SAMPLE_SETTINGS })
      const drawn = one.task(uid)
      const basis = drawn.actual ?? drawn.milestoneFigure
      expect(basis, `premise: task ${uid} has an actual basis (RF-1)`).not.toBeNull()
      const hit = pressOf(one, { x: rightOfBar(basis!) - 1, y: drawn.marker!.center.y })
      expect(before as readonly string[], `T-266 left of the edge at ${row}: ${JSON.stringify(hit)}`).toContain(hit?.grab ?? '')
      expect(hit?.item, `task ${uid}`).toEqual({ kind: 'task', taskUid: uid })
    })
  }
})
