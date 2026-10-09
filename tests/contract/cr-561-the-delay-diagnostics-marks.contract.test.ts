// CR-561 spec-only tests: the DG-1 / DG-2 / DG-3 progress marks of table T-315, chosen and drawn.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { dayOf } from '../../src/entity/document-model/schedule/calendar-day'
import { workingCalendarOf, type Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type GeometryInputs,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { taskGeometryOf } from '../../src/entity/layout-engine/schedule-geometry/task-figures'
import { layoutFromSchedule, type ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  drawnSettingsOf,
  regionsFromScreen,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable, unbroken } from './spec-table'
import { taskGroupDocument, SCREEN, taskOf } from '../unit/cr-541-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const verticalIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}
const cellOf = (table: string, id: string, heading: string): string => {
  const cell = verticalIn(table, id).by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no column ${heading} (${specTable(table).headings.join(' | ')})`)
  return cell
}
const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}
const hexOf = (cell: string): string => {
  const found = /#[0-9a-fA-F]{6}/.exec(cell)
  if (found === null) throw new Error(`no colour in ${JSON.stringify(cell)}`)
  return found[0].toLowerCase()
}
const settingIdOf = (cell: string): string => {
  const found = /S-\d+[a-z]?/.exec(cell)
  if (found === null) throw new Error(`no setting id in ${JSON.stringify(cell)}`)
  return found[0]
}

type Theme = 'light' | 'dark'
const THEME_COLUMN: Record<Theme, string> = { light: '明るいテーマ', dark: '暗いテーマ' }
// WHY: CR-616 made S-386 / S-388 / S-390 cells point at S-327; the colour is the one that row holds.
const colourOf = (id: string, theme: Theme): string => {
  const cell = cellOf('T-236', id, THEME_COLUMN[theme])
  const same = /(S-\d+[a-z]?)`?\s*に同じ/.exec(cell)
  return same === null ? hexOf(cell) : colourOf(same[1] as string, theme)
}
const ratioOf = (id: string): number => numberOf(cellOf('T-206', id, '既定'))

type DgRow = 'DG-1' | 'DG-2' | 'DG-3' | 'DG-4'
const groundIdOf = (row: DgRow): string => settingIdOf(cellOf('T-315', row, '地'))
const inkIdOf = (row: DgRow): string => settingIdOf(cellOf('T-315', row, '記号'))

const S_328 = ratioOf('S-328')
const S_329 = ratioOf('S-329')
const S_330 = ratioOf('S-330')
const S_331 = ratioOf('S-331')
const S_341 = ratioOf('S-341')
const S_391 = ratioOf('S-391')
const S_392 = ratioOf('S-392')
const S_393 = ratioOf('S-393')
const S_394 = ratioOf('S-394')
const S_396 = ratioOf('S-396')
const S_395 = ((): string => {
  const found = /`([^`]+)`/.exec(cellOf('T-206', 'S-395', '既定'))
  if (found === null) throw new Error('S-395 holds no path')
  return found[1] as string
})()

const FR_133_HIGHEST = '診断を出しているあいだ、`GRS` は、各 `Task` の進捗マーカーを 表 T-315 の状態のうち優先順の最も高いもので描くこと。'
const FR_133_OTHERS = 'どの状態にも当たらない `Task` は 表 T-021 の記号のままとする。'
const FR_133_SHAPE = '状態の区別を色だけに頼ってはならない（MUST NOT） —— 表 T-315 の記号の形でも分けること。'
const FR_133_SIZES = '色と記号の寸法は `_assets/tbl-settings.md` の `S-385` 〜 `S-396`（表 T-236 ・ 表 T-206）に従うこと（MUST）。'
const T_315_DG_4 = '`DG-4` は 表 T-021 の `PM-4` の黄そのものであり、本表は優先順の中に置くだけで、条件も色も変えない。'
const T_315_ONLY_SHOWN = '`DG-1` 〜 `DG-3` は診断を出しているあいだだけ描く。'
const FR_013_PAINT =
  '遅延診断を出しているあいだ、`FR-133` の 表 T-315 の `DG-1` 〜 `DG-3` の状態のマーカーは、同表が指す地と記号の色で塗ること（MUST）'
const FR_013_NOT_FADED = '同表の状態のマーカーも、未着手のタスクで薄くしない'

const LATE = 1
const GOING = 2
const LATER = 3
const LATE_TOO = 4

interface Stage {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

const STAGE: Stage = (() => {
  const rows = [1, 2, 3, 4].map((uid) => ({ id: `g${uid}`, parentId: null }))
  const raw = taskGroupDocument(rows, { progressMarkerVisible: true, themePreference: 'light' })
  raw.schedule.project.statusDate = '2026-05-08T17:00:00'
  raw.schedule.tasks = [
    taskOf(LATE, { name: 'Late', start: '2026-04-06T08:00:00', finish: '2026-04-24T17:00:00' }),
    taskOf(GOING, {
      name: 'Going',
      start: '2026-04-27T08:00:00',
      finish: '2026-05-29T17:00:00',
      actualStart: '2026-04-27T08:00:00',
      percentComplete: 40,
    }),
    taskOf(LATER, { name: 'Later', start: '2026-06-01T08:00:00', finish: '2026-06-19T17:00:00' }),
    taskOf(LATE_TOO, { name: 'Late too', start: '2026-04-13T08:00:00', finish: '2026-04-30T17:00:00' }),
  ]
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the stage does not decode: ${JSON.stringify(decoded.faults)}`)
  const schedule = decoded.document.schedule
  const settings = decoded.document.documentSettings
  const regions = regionsFromScreen({ ...SCREEN, propertyPanelWidth: 0 }, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  return { schedule, settings, regions, layout, geometry }
})()

type Diagnostics = { readonly shown: boolean; readonly symbolByUid: ReadonlyMap<number, 'DG-1' | 'DG-2' | 'DG-3'> }

// WHY: taskGeometryOf is the one exported reader of GeometryInputs, the seam that carries delayDiagnostics.
function inputsOf(diagnostics: Diagnostics | undefined): GeometryInputs {
  const drawn = drawnSettingsOf(STAGE.settings)
  const base = {
    settings: drawn,
    layout: STAGE.layout,
    within: workingCalendarOf(STAGE.schedule),
    taskByUid: new Map(STAGE.schedule.tasks.map((task) => [task.uid, task])),
    statusDate: dayOf(STAGE.schedule.project.statusDate),
    showPlan: drawn.planVisible,
    showActual: drawn.actualVisible,
    selectedTaskUids: new Set<number>(),
    selectedLinks: new Set<string>(),
    dummyFromByStart: new Map(),
    dummyEndByFrom: new Map(),
  }
  return (diagnostics === undefined ? base : { ...base, delayDiagnostics: diagnostics }) as unknown as GeometryInputs
}

function taskFigureOf(uid: number, diagnostics: Diagnostics | undefined): TaskGeometry {
  const task = STAGE.schedule.tasks.find((one) => one.uid === uid)
  const placed = STAGE.layout.placements.find((one) => one.taskUid === uid)
  if (task === undefined || placed === undefined) throw new Error(`the stage placed no task ${uid}`)
  return taskGeometryOf(inputsOf(diagnostics), task, placed)
}

const todayOf = (uid: number): TaskGeometry => {
  const found = STAGE.geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`the geometry holds no task ${uid}`)
  return found
}

const MAP = new Map<number, 'DG-1' | 'DG-2' | 'DG-3'>()
const shownWith = (uid: number, symbol: 'DG-1' | 'DG-2' | 'DG-3'): Diagnostics => ({
  shown: true,
  symbolByUid: new Map([...MAP, [uid, symbol]]),
})

function pictureOf(uid: number, diagnostics: Diagnostics | undefined, theme: Theme): string {
  const swapped = taskFigureOf(uid, diagnostics)
  const geometry: ScheduleGeometry = {
    ...STAGE.geometry,
    tasks: STAGE.geometry.tasks.map((one) => (one.taskUid === uid ? swapped : one)),
  }
  return svgFromSchedule(
    STAGE.schedule,
    STAGE.settings,
    STAGE.layout,
    geometry,
    STAGE.regions,
    emptySelection(),
    'screen',
    { themePreference: theme, guideCursorMode: 'none' },
  )
}

function markOf(svg: string, uid: number): string {
  const key = new RegExp(`data-figure="task-${uid}-marker(?:-[^"]*)?"`)
  const parts: string[] = []
  const groups: boolean[] = []
  let inText = false
  for (const one of svg.matchAll(/<\/?[a-zA-Z][^>]*>|[^<]+/g)) {
    const token = one[0]
    const inside = groups.some(Boolean)
    if (token.startsWith('</g')) {
      if (groups.pop() === true) parts.push(token)
      continue
    }
    if (/^<g\b/.test(token) && !token.endsWith('/>')) {
      const mine = inside || key.test(token)
      groups.push(mine)
      if (mine) parts.push(token)
      continue
    }
    if (inText) {
      parts.push(token)
      if (token.startsWith('</text')) inText = false
      continue
    }
    if (inside || key.test(token)) {
      parts.push(token)
      if (/^<text\b/.test(token) && !token.endsWith('/>') && !inside) inText = true
    }
  }
  return parts.join('')
}

const shapesIn = (svg: string): string[] =>
  [...svg.matchAll(/<(circle|ellipse|line|path|rect|polygon|polyline)\b[^>]*>/g)].map((one) => one[0])
const paintOf = (shape: string, name: 'fill' | 'stroke'): string =>
  (new RegExp(`\\b${name}="([^"]+)"`).exec(shape)?.[1] ?? '').toLowerCase()
const attr = (shape: string, name: string): number => Number(new RegExp(`\\b${name}="([^"]+)"`).exec(shape)?.[1] ?? 'NaN')
const textsIn = (svg: string): { tag: string; text: string }[] =>
  [...svg.matchAll(/(<text\b[^>]*>)([\s\S]*?)<\/text>/g)].map((one) => ({ tag: one[1] as string, text: (one[2] as string).replace(/<[^>]*>/g, '').trim() }))

interface Pt {
  readonly x: number
  readonly y: number
}
const SAMPLES = 16

function sampledPath(d: string): Pt[] {
  const tokens = [...d.matchAll(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)].map((one) => one[0])
  const out: Pt[] = []
  let at = 0
  let command = ''
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let lastControl: Pt | null = null
  const next = (): number => Number(tokens[at++])
  const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) => {
    for (let i = 1; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES
      const u = 1 - t
      out.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      })
    }
  }
  while (at < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[at] as string)) command = tokens[at++] as string
    const relative = command === command.toLowerCase()
    const ox = relative ? x : 0
    const oy = relative ? y : 0
    switch (command.toUpperCase()) {
      case 'M': {
        x = ox + next(); y = oy + next(); startX = x; startY = y
        out.push({ x, y })
        command = relative ? 'l' : 'L'
        lastControl = null
        break
      }
      case 'L': { x = ox + next(); y = oy + next(); out.push({ x, y }); lastControl = null; break }
      case 'H': { x = ox + next(); out.push({ x, y }); lastControl = null; break }
      case 'V': { y = oy + next(); out.push({ x, y }); lastControl = null; break }
      case 'C': {
        const p1 = { x: ox + next(), y: oy + next() }
        const p2 = { x: ox + next(), y: oy + next() }
        const p3 = { x: ox + next(), y: oy + next() }
        cubic({ x, y }, p1, p2, p3)
        lastControl = p2; x = p3.x; y = p3.y
        break
      }
      case 'S': {
        const p1 = lastControl === null ? { x, y } : { x: 2 * x - lastControl.x, y: 2 * y - lastControl.y }
        const p2 = { x: ox + next(), y: oy + next() }
        const p3 = { x: ox + next(), y: oy + next() }
        cubic({ x, y }, p1, p2, p3)
        lastControl = p2; x = p3.x; y = p3.y
        break
      }
      case 'Q': {
        const q = { x: ox + next(), y: oy + next() }
        const p3 = { x: ox + next(), y: oy + next() }
        cubic({ x, y }, { x: x + (2 / 3) * (q.x - x), y: y + (2 / 3) * (q.y - y) },
          { x: p3.x + (2 / 3) * (q.x - p3.x), y: p3.y + (2 / 3) * (q.y - p3.y) }, p3)
        lastControl = null; x = p3.x; y = p3.y
        break
      }
      case 'A': {
        let rx = Math.abs(next())
        let ry = Math.abs(next())
        const phi = (next() * Math.PI) / 180
        const large = next() !== 0
        const sweep = next() !== 0
        const x2 = ox + next()
        const y2 = oy + next()
        const cos = Math.cos(phi)
        const sin = Math.sin(phi)
        const dx = (x - x2) / 2
        const dy = (y - y2) / 2
        const x1p = cos * dx + sin * dy
        const y1p = -sin * dx + cos * dy
        const scale = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
        if (scale > 1) { rx *= Math.sqrt(scale); ry *= Math.sqrt(scale) }
        const numerator = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
        const root = Math.sqrt(Math.max(0, numerator / (rx * rx * y1p * y1p + ry * ry * x1p * x1p))) * (large === sweep ? -1 : 1)
        const cxp = (root * rx * y1p) / ry
        const cyp = (-root * ry * x1p) / rx
        const cx = cos * cxp - sin * cyp + (x + x2) / 2
        const cy = sin * cxp + cos * cyp + (y + y2) / 2
        const angle = (ux: number, uy: number, vx: number, vy: number) =>
          Math.sign(ux * vy - uy * vx || 1) * Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy)))))
        const theta = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
        let delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
        if (!sweep && delta > 0) delta -= 2 * Math.PI
        if (sweep && delta < 0) delta += 2 * Math.PI
        const steps = SAMPLES * 4
        for (let i = 1; i <= steps; i += 1) {
          const t = theta + (delta * i) / steps
          out.push({ x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos })
        }
        x = x2; y = y2; lastControl = null
        break
      }
      case 'Z': { x = startX; y = startY; out.push({ x, y }); lastControl = null; break }
      default:
        throw new Error(`unread path command ${command} in ${d}`)
    }
  }
  return out
}

type Matrix = readonly [number, number, number, number, number, number]
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]
const times = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
]
function matrixOf(transform: string): Matrix {
  let m = IDENTITY
  for (const one of transform.matchAll(/(translate|scale|matrix)\s*\(([^)]*)\)/g)) {
    const v = (one[2] as string).split(/[\s,]+/).filter((s) => s !== '').map(Number)
    if (one[1] === 'translate') m = times(m, [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0])
    else if (one[1] === 'scale') m = times(m, [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0])
    else m = times(m, v as unknown as Matrix)
  }
  return m
}
const applied = (m: Matrix, p: Pt): Pt => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] })

interface Drawn {
  readonly tag: string
  readonly points: Pt[]
}
function drawnShapesOf(mark: string): Drawn[] {
  const out: Drawn[] = []
  const stack: Matrix[] = [IDENTITY]
  for (const one of mark.matchAll(/<\/?[a-zA-Z]+\b[^>]*>/g)) {
    const tag = one[0]
    if (tag.startsWith('</g')) { stack.pop(); continue }
    const own = /\btransform="([^"]+)"/.exec(tag)
    const m = times(stack[stack.length - 1] as Matrix, own === null ? IDENTITY : matrixOf(own[1] as string))
    if (/^<g\b/.test(tag)) { if (!tag.endsWith('/>')) stack.push(m); continue }
    let points: Pt[] = []
    if (tag.startsWith('<path')) points = sampledPath(/\bd="([^"]+)"/.exec(tag)?.[1] ?? '')
    else if (tag.startsWith('<line')) points = [{ x: attr(tag, 'x1'), y: attr(tag, 'y1') }, { x: attr(tag, 'x2'), y: attr(tag, 'y2') }]
    else if (tag.startsWith('<circle')) {
      const r = attr(tag, 'r')
      points = [0, 1, 2, 3].map((k) => ({ x: attr(tag, 'cx') + r * Math.cos((k * Math.PI) / 2), y: attr(tag, 'cy') + r * Math.sin((k * Math.PI) / 2) }))
    } else if (/^<(polygon|polyline)/.test(tag)) {
      const values = (/\bpoints="([^"]+)"/.exec(tag)?.[1] ?? '').split(/[\s,]+/).filter((s) => s !== '').map(Number)
      for (let i = 0; i + 1 < values.length; i += 2) points.push({ x: values[i] as number, y: values[i + 1] as number })
    } else continue
    out.push({ tag, points: points.map((p) => applied(m, p)) })
  }
  return out
}
const boxOf = (points: readonly Pt[]) => ({
  minX: Math.min(...points.map((p) => p.x)),
  maxX: Math.max(...points.map((p) => p.x)),
  minY: Math.min(...points.map((p) => p.y)),
  maxY: Math.max(...points.map((p) => p.y)),
})

interface Reading {
  readonly mark: string
  readonly centre: Pt
  readonly radius: number
  readonly grounds: string[]
  readonly ink: Drawn[]
  readonly dots: { cx: number; cy: number; r: number }[]
  readonly strokes: Drawn[]
}

function readingOf(uid: number, diagnostics: Diagnostics | undefined, theme: Theme, groundId: string, inkId: string): Reading {
  const mark = markOf(pictureOf(uid, diagnostics, theme), uid)
  const figure = taskFigureOf(uid, diagnostics).marker
  const ground = colourOf(groundId, theme)
  const ink = colourOf(inkId, theme)
  const grounds = shapesIn(mark).filter((one) => one.startsWith('<circle') && paintOf(one, 'fill') === ground)
  const inked = drawnShapesOf(mark).filter(
    (one) => !grounds.includes(one.tag) && (paintOf(one.tag, 'fill') === ink || paintOf(one.tag, 'stroke') === ink),
  )
  const dots = inked
    .filter((one) => paintOf(one.tag, 'fill') === ink && paintOf(one.tag, 'stroke') !== ink && !/\bd="[^"]*[CcSsQq]/.test(one.tag))
    .map((one) => {
      const box = boxOf(one.points)
      return { cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2, r: (box.maxX - box.minX) / 2 }
    })
  const strokes = inked.filter((one) => paintOf(one.tag, 'stroke') === ink)
  return {
    mark,
    centre: figure?.centre ?? { x: NaN, y: NaN },
    radius: figure?.radius ?? NaN,
    grounds,
    ink: inked,
    dots,
    strokes,
  }
}

function delayBarWidth(theme: Theme): number {
  const today = readingOf(LATE, undefined, theme, 'S-326', 'S-327')
  const bar = today.strokes[0]
  if (bar === undefined) throw new Error(`premise: PM-4 draws a stroked bar: ${today.mark}`)
  return attr(bar.tag, 'stroke-width')
}

describe('CR-561 -- the clauses these cases quote are still in the specification', () => {
  it('FR-133, T-315 and FR-013 still say what the cases below read', () => {
    for (const clause of [FR_133_HIGHEST, FR_133_OTHERS, FR_133_SHAPE, FR_133_SIZES, T_315_DG_4, T_315_ONLY_SHOWN, FR_013_PAINT, FR_013_NOT_FADED]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })

  it('premise: the stage gives the four Tasks the marks of today (T-021)', () => {
    expect(todayOf(LATE).marker?.symbol).toBe('PM-4')
    expect(todayOf(LATE_TOO).marker?.symbol).toBe('PM-4')
    expect(todayOf(LATER).marker?.symbol).toBe('PM-1a')
    expect(todayOf(GOING).marker?.symbol).not.toBe('PM-4')
    // WHY: the hand-built inputs must match the ones geometryFromLayout builds, or each case reads another stage.
    for (const uid of [LATE, GOING, LATER, LATE_TOO]) {
      expect(taskFigureOf(uid, undefined).marker, `task ${uid}`).toEqual(todayOf(uid).marker)
    }
  })
})

describe('FR-133 / T-315 -- the mark takes the DG state while the diagnostics are shown', () => {
  for (const symbol of ['DG-1', 'DG-2', 'DG-3'] as const) {
    it(`${symbol}: ${FR_133_HIGHEST.slice(0, 40)}... -- a Task in the map shows ${symbol}`, () => {
      for (const uid of [LATE, GOING, LATER]) {
        expect(taskFigureOf(uid, shownWith(uid, symbol)).marker?.symbol, `task ${uid}`).toBe(symbol)
      }
    })
  }

  it(`DG-1 .. DG-3: ${FR_133_HIGHEST.slice(0, 40)}... -- geometryFromLayout carries the input to every Task`, () => {
    const shown: Diagnostics = { shown: true, symbolByUid: new Map([[LATE, 'DG-1'], [GOING, 'DG-2'], [LATER, 'DG-3']]) }
    const whole = geometryFromLayout(STAGE.schedule, STAGE.settings, STAGE.layout, STAGE.regions, emptySelection(), null, shown)
    const symbolOf = (uid: number) => whole.tasks.find((one) => one.taskUid === uid)?.marker?.symbol
    expect([symbolOf(LATE), symbolOf(GOING), symbolOf(LATER), symbolOf(LATE_TOO)]).toEqual(['DG-1', 'DG-2', 'DG-3', 'PM-4'])
  })

  it(`${T_315_ONLY_SHOWN} -- shown false keeps the mark of today (control)`, () => {
    for (const uid of [LATE, GOING, LATER]) {
      const hidden: Diagnostics = { shown: false, symbolByUid: shownWith(uid, 'DG-2').symbolByUid }
      expect(taskFigureOf(uid, hidden).marker, `task ${uid}`).toEqual(todayOf(uid).marker)
    }
  })

  it(`${T_315_ONLY_SHOWN} -- no delayDiagnostics on the inputs keeps the mark of today (control)`, () => {
    for (const uid of [LATE, GOING, LATER]) expect(taskFigureOf(uid, undefined).marker, `task ${uid}`).toEqual(todayOf(uid).marker)
  })

  it(`${FR_133_OTHERS} -- shown, but the Task is not in the map (control)`, () => {
    const others: Diagnostics = { shown: true, symbolByUid: new Map([[LATE_TOO, 'DG-1']]) }
    for (const uid of [LATE, GOING, LATER]) expect(taskFigureOf(uid, others).marker, `task ${uid}`).toEqual(todayOf(uid).marker)
  })

  it(`DG-4: ${T_315_DG_4} -- a late Task outside the map stays PM-4 while shown`, () => {
    const shown: Diagnostics = { shown: true, symbolByUid: new Map([[LATE, 'DG-2'], [GOING, 'DG-3']]) }
    expect(taskFigureOf(LATE_TOO, shown).marker?.symbol).toBe('PM-4')
    expect(taskFigureOf(LATE_TOO, shown).marker).toEqual(todayOf(LATE_TOO).marker)
  })
})

describe('FR-013 / T-315 -- the ground and the ink of each DG mark, both themes', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const row of ['DG-1', 'DG-2', 'DG-3'] as const) {
      it(`${row} (${theme}): 同表が指す地 -- the ground is ${groundIdOf(row)}`, () => {
        const read = readingOf(LATE, shownWith(LATE, row), theme, groundIdOf(row), inkIdOf(row))
        expect(read.grounds.length, `the drawn mark: ${read.mark}`).toBeGreaterThanOrEqual(1)
      })

      it(`${row} (${theme}): 同表が指す記号の色 -- the symbol is painted ${inkIdOf(row)}`, () => {
        const read = readingOf(LATE, shownWith(LATE, row), theme, groundIdOf(row), inkIdOf(row))
        const ink = colourOf(inkIdOf(row), theme)
        const texts = textsIn(read.mark).filter((one) => paintOf(one.tag, 'fill') === ink)
        expect(read.ink.length + texts.length, `ink ${ink} in ${read.mark}`).toBeGreaterThanOrEqual(1)
      })
    }

    it(`DG-4 (${theme}): ${T_315_DG_4.slice(0, 30)}... -- PM-4 keeps S-326 while shown, and no DG ground (control)`, () => {
      const shown: Diagnostics = { shown: true, symbolByUid: new Map([[LATE, 'DG-2']]) }
      const read = readingOf(LATE_TOO, shown, theme, groundIdOf('DG-4'), inkIdOf('DG-4'))
      expect(groundIdOf('DG-4'), 'premise: T-315 names S-326 for DG-4').toBe('S-326')
      expect(read.grounds.length, read.mark).toBeGreaterThanOrEqual(1)
      for (const row of ['DG-1', 'DG-2', 'DG-3'] as const) {
        const other = colourOf(groundIdOf(row), theme)
        expect(shapesIn(read.mark).some((one) => paintOf(one, 'fill') === other), `${row} ground in ${read.mark}`).toBe(false)
      }
    })

    it(`${T_315_ONLY_SHOWN} (${theme}) -- shown false draws the ground of today, no DG ground (control)`, () => {
      const hidden: Diagnostics = { shown: false, symbolByUid: new Map([[LATE, 'DG-1']]) }
      const read = readingOf(LATE, hidden, theme, 'S-326', 'S-327')
      expect(read.grounds.length, read.mark).toBeGreaterThanOrEqual(1)
      for (const row of ['DG-1', 'DG-2', 'DG-3'] as const) {
        const other = colourOf(groundIdOf(row), theme)
        expect(shapesIn(read.mark).some((one) => paintOf(one, 'fill') === other), `${row} ground in ${read.mark}`).toBe(false)
      }
    })
  }
})

describe('FR-133 / T-315 -- the shape of each symbol', () => {
  it('DG-1: `?`（S-392 〜 S-394、点は S-330 ・ S-331） -- one dot, and a stroked hook', () => {
    const read = readingOf(LATE, shownWith(LATE, 'DG-1'), 'light', 'S-389', 'S-390')
    const texts = textsIn(read.mark).map((one) => one.text)
    expect(texts, `a '?' drawn as text is not the shape T-315 sizes: ${read.mark}`).not.toContain('?')
    expect(read.dots.length, `one dot: ${read.mark}`).toBe(1)
    expect(read.strokes.length, `a stroked line: ${read.mark}`).toBeGreaterThanOrEqual(1)
    const dot = read.dots[0] as { cx: number; cy: number; r: number }
    expect(dot.r, 'S-331: the dot radius').toBeCloseTo(S_331 * read.radius, 1)
    expect(dot.cy - read.centre.y, 'S-330 x S-341: the dot centre below the centre').toBeCloseTo(S_330 * S_341 * read.radius, 1)
  })

  it('DG-1: `?` の鉤（S-392 ・ S-393）と縦の線の下端（S-394） -- the hook top and the stem bottom', () => {
    // WHY: counted from the top of the mark, whose diameter is the unit; the hook top is its centre less its radius.
    const read = readingOf(LATE, shownWith(LATE, 'DG-1'), 'light', 'S-389', 'S-390')
    const diameter = 2 * read.radius
    const top = read.centre.y - read.radius
    const box = boxOf(read.strokes.flatMap((one) => one.points))
    expect(box.minY - top, 'S-392 - S-393: the top of the hook').toBeCloseTo((S_392 - S_393) * diameter, 1)
    expect(box.maxY - top, 'S-394: the bottom of the stem').toBeCloseTo(S_394 * diameter, 1)
    expect(box.maxY, 'the stem ends above the dot').toBeLessThan((read.dots[0]?.cy ?? 0) - (read.dots[0]?.r ?? 0))
  })

  it('DG-1: 線の太さは S-328 -- the line is as thick as the bar of PM-4 (S-24 x S-328)', () => {
    const read = readingOf(LATE, shownWith(LATE, 'DG-1'), 'light', 'S-389', 'S-390')
    expect(S_328, 'premise: S-328 is read').toBeGreaterThan(0)
    for (const one of read.strokes) expect(attr(one.tag, 'stroke-width')).toBeCloseTo(delayBarWidth('light'), 1)
  })

  it('DG-2: 炎（S-395 ・ S-396） -- the flame is S-395 scaled to S-396 x the diameter, filled with S-388', () => {
    const read = readingOf(LATE, shownWith(LATE, 'DG-2'), 'light', 'S-387', 'S-388')
    const ink = colourOf('S-388', 'light')
    const unit = sampledPath(S_395)
    const flames = read.ink.filter((one) => one.tag.startsWith('<path') && paintOf(one.tag, 'fill') === ink && one.points.length === unit.length)
    expect(flames.length, `a filled path shaped as S-395 (${unit.length} samples): ${read.mark}`).toBe(1)
    const drawn = (flames[0] as Drawn).points
    const side = S_396 * 2 * read.radius
    const ub = boxOf(unit)
    const db = boxOf(drawn)
    expect((db.maxX - db.minX) / (ub.maxX - ub.minX), 'S-396: the scale').toBeCloseTo(side, 1)
    expect((db.maxY - db.minY) / (ub.maxY - ub.minY), 'S-396: one scale both ways').toBeCloseTo(side, 1)
    const ox = db.minX - side * ub.minX
    const oy = db.minY - side * ub.minY
    const worst = Math.max(...unit.map((p, i) => Math.hypot(ox + side * p.x - (drawn[i] as Pt).x, oy + side * p.y - (drawn[i] as Pt).y)))
    expect(worst, 'S-395: every sample of the drawn flame is on the S-395 path').toBeLessThan(0.1)
  })

  it('DG-3: `!!`（中心の間隔 S-391） -- two bars and two dots, S-391 x the diameter apart', () => {
    const read = readingOf(LATE, shownWith(LATE, 'DG-3'), 'light', 'S-385', 'S-386')
    expect(textsIn(read.mark).map((one) => one.text), read.mark).not.toContain('!!')
    expect(read.dots.length, `two dots: ${read.mark}`).toBe(2)
    expect(read.strokes.length, `two bars: ${read.mark}`).toBe(2)
    const a = read.dots[0] as { cx: number }
    const b = read.dots[1] as { cx: number }
    expect(Math.abs(a.cx - b.cx), 'S-391: the centres of the two !').toBeCloseTo(S_391 * 2 * read.radius, 1)
    const barXs = read.strokes.map((one) => { const box = boxOf(one.points); return (box.minX + box.maxX) / 2 }).sort((x, y) => x - y)
    const dotXs = read.dots.map((one) => one.cx).sort((x, y) => x - y)
    expect(barXs[0], 'each bar stands over its dot').toBeCloseTo(dotXs[0] as number, 1)
    expect(barXs[1], 'each bar stands over its dot').toBeCloseTo(dotXs[1] as number, 1)
  })

  it('DG-3: 各 `!` は S-328 〜 S-331 ・ S-341 -- bar width, bar bottom, dot centre, dot radius', () => {
    const read = readingOf(LATE, shownWith(LATE, 'DG-3'), 'light', 'S-385', 'S-386')
    const half = S_341 * read.radius
    expect(read.strokes.length, read.mark).toBe(2)
    for (const bar of read.strokes) {
      expect(attr(bar.tag, 'stroke-width'), 'S-328').toBeCloseTo(delayBarWidth('light'), 1)
      expect(boxOf(bar.points).maxY - read.centre.y, 'S-329 x S-341: the bar bottom').toBeCloseTo(S_329 * half, 1)
    }
    expect(read.dots.length, read.mark).toBe(2)
    for (const dot of read.dots) {
      expect(dot.cy - read.centre.y, 'S-330 x S-341: the dot centre').toBeCloseTo(S_330 * half, 1)
      expect(dot.r, 'S-331: the dot radius').toBeCloseTo(S_331 * read.radius, 1)
    }
  })

  it(`${FR_133_SHAPE.slice(0, 20)}... -- no two of DG-1 .. DG-3 and PM-4 draw the same ink shapes (control)`, () => {
    const signature = (row: DgRow, uid: number, diagnostics: Diagnostics | undefined): string => {
      const read = readingOf(uid, diagnostics, 'light', groundIdOf(row), inkIdOf(row))
      const bent = read.strokes.some((one) => { const box = boxOf(one.points); return box.maxX - box.minX > read.radius * S_331 })
      return `${read.dots.length} dots / ${read.strokes.length} strokes / ${read.ink.length} inked / bent ${String(bent)}`
    }
    const signatures = [
      signature('DG-1', LATE, shownWith(LATE, 'DG-1')),
      signature('DG-2', LATE, shownWith(LATE, 'DG-2')),
      signature('DG-3', LATE, shownWith(LATE, 'DG-3')),
      signature('DG-4', LATE, undefined),
    ]
    expect(new Set(signatures).size, signatures.join(' | ')).toBe(4)
  })
})

describe('FR-013 -- a DG mark on a Task not yet started is not faded', () => {
  const opacities = (mark: string): number[] =>
    [...mark.matchAll(/\b(?:opacity|fill-opacity|stroke-opacity)(?:="|:\s*)([0-9.]+)/g)].map((one) => Number(one[1]))

  it('premise (control): PM-1a on the same Task is drawn faint, so the measure can see fading', () => {
    const mark = markOf(pictureOf(LATER, undefined, 'light'), LATER)
    expect(Math.min(1, ...opacities(mark)), mark).toBeLessThan(1)
  })

  for (const row of ['DG-1', 'DG-2', 'DG-3'] as const) {
    it(`${row}: ${FR_013_NOT_FADED}`, () => {
      const read = readingOf(LATER, shownWith(LATER, row), 'light', groundIdOf(row), inkIdOf(row))
      expect(read.grounds.length, `premise: the ${row} ground is drawn: ${read.mark}`).toBeGreaterThanOrEqual(1)
      expect(Math.min(1, ...opacities(read.mark)), read.mark).toBe(1)
    })
  }
})

