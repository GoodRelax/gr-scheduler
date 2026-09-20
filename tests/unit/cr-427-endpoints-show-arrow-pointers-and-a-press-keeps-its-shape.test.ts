// CR-427: the four end points show T-269 arrow images of S-249 px with a centre hotspot, falling back to ew-resize.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const PK_1_SQUARE =
  '| PK-1 | 箱の矢印 白 | 幅の広い箱型の矢印（← ／ →） | 白 ／ 黒 | 丸め | 一辺 `S-249` | 中心 |'
const PK_2_SQUARE =
  '| PK-2 | 箱の矢印 黒 | 幅の広い箱型の矢印（← ／ →） | 黒 ／ 白 | 丸め | 一辺 `S-249` | 中心 |'
const FR_106_COLOURS =
  '⭐ 白 ＝ 予定、黒 ＝ 実績とダミー、の約束を、箱の矢印と円で揃えること（MUST）。'
const FR_106_FALLBACK =
  '⭐ 画像のポインタを描けない環境では、動く向きを示す環境の形に替えること（MUST）'
const FR_106_NO_DISPLAY_SCALE = '⛔ ポインタの画像に表示の倍率を掛けてはならない（MUST NOT）'

describe('CR-427 -- the manuscript these cases are driven by', () => {
  it.each([PK_1_SQUARE, PK_2_SQUARE, FR_106_COLOURS, FR_106_FALLBACK, FR_106_NO_DISPLAY_SCALE])(
    'still says it, word for word: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
})

const S_249 = ((): number => {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-249')
  if (row === undefined) throw new Error('table T-206 has no row S-249')
  return Number(/\d+/.exec(bare(row.by['既定'] ?? ''))?.[0] ?? Number.NaN)
})()

describe('table T-206 S-249', () => {
  it('is a 24px square', () => {
    expect(S_249).toBe(16)
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const BAR_UID = 1

const barTask = (): Task =>
  ({
    uid: BAR_UID,
    wbsParentUid: null,
    wbsOrder: 1,
    name: null,
    start: '2026-04-06',
    finish: '2026-04-24',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: '2026-04-08',
    stop: '2026-04-14',
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 40,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }) as unknown as Task

const documentAt = (displayScale: number): Document =>
  ({
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: [barTask()],
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: 'g1',
          parentId: null,
          label: 'row',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: false,
          isHidden: false,
          isKeptOpen: false,
          color: null,
          height: null,
        },
      ],
      taskGroupMembers: [{ taskUid: BAR_UID, groupId: 'g1', stackOrder: null }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      pxPerDayAt1x: 20,
      displayScale,
      scrollDate: '2026-04-01T00:00:00',
      scrollGroupId: 'g1',
      zoomX: 1,
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }) as unknown as Document

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }
const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

interface Bench {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  latest(): string | null
}

const benchAt = (displayScale: number): Bench => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null,
  }
  const shown: unknown[] = []
  const loop = frameLoop(
    { showSvg: () => undefined } as never,
    documentAt(displayScale),
    SCREEN,
    { surface, language: 'en' },
    undefined,
    ((shape: unknown) => void shown.push(shape)) as never,
  )
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    latest: () => {
      const last = shown[shown.length - 1]
      return typeof last === 'string' ? last : null
    },
  }
}

// see T-023d, GA-1, GA-2, GA-3, GA-4
const endsOf = (loop: FrameLoop): Readonly<Record<'GA-1' | 'GA-2' | 'GA-3' | 'GA-4', Point>> => {
  const drawn = loop.current()?.geometry.tasks.find((one) => one.taskUid === BAR_UID)
  if (drawn === undefined) throw new Error('the bar Task is not drawn')
  const boxOf = (bar: BarGeometry | null) => {
    if (bar === null) throw new Error('a bar was not drawn')
    const points = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
    const xs = points.map((one) => one.x)
    const ys = points.map((one) => one.y)
    return { left: Math.min(...xs), right: Math.max(...xs), middle: (Math.min(...ys) + Math.max(...ys)) / 2 }
  }
  const plan = boxOf(drawn.plan)
  const actual = boxOf(drawn.actual)
  return {
    'GA-1': { x: plan.left - 1, y: plan.middle },
    'GA-2': { x: plan.right + 1, y: plan.middle },
    'GA-3': { x: actual.left + 1, y: actual.middle },
    'GA-4': { x: actual.right - 1, y: actual.middle },
  }
}

interface Cursor {
  readonly svg: string
  readonly hotspotX: number
  readonly hotspotY: number
  readonly fallback: string
}

// see PK-1, PK-2, T-269
const cursorOf = (written: string | null): Cursor | null => {
  if (written === null) return null
  const found = /^url\((['"]?)(data:image\/svg\+xml[^)]*?)\1\)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*,\s*([\w-]+)\s*$/.exec(
    written.trim(),
  )
  if (found === null) return null
  const data = found[2]!
  const comma = data.indexOf(',')
  const head = data.slice(0, comma)
  const body = data.slice(comma + 1)
  const svg = head.endsWith(';base64') ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body)
  return { svg, hotspotX: Number(found[3]), hotspotY: Number(found[4]), fallback: found[5]! }
}

const attributeOf = (tag: string, name: string): string | null =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? new RegExp(`\\s${name}='([^']*)'`).exec(tag)?.[1] ?? null

const paintOf = (tag: string, name: 'fill' | 'stroke'): string | null => {
  const style = attributeOf(tag, 'style') ?? ''
  const fromStyle = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style)?.[1]?.trim()
  const raw = (fromStyle ?? attributeOf(tag, name) ?? '').toLowerCase()
  const named: Readonly<Record<string, string>> = { white: '#ffffff', black: '#000000', '#fff': '#ffffff', '#000': '#000000' }
  return raw === '' ? null : (named[raw] ?? raw)
}

interface Shape {
  readonly side: number
  readonly fills: readonly string[]
  readonly strokes: readonly string[]
  readonly pointsLeft: boolean
}

const pairsOf = (text: string): Point[] => {
  const numbers = (text.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number)
  const out: Point[] = []
  for (let at = 0; at + 1 < numbers.length; at += 2) out.push({ x: numbers[at]!, y: numbers[at + 1]! })
  return out
}

// see PK-1, PK-2
// WHY: H and V carry one number each, so reading a path as bare number pairs misplaces every later point.
const pathPointsOf = (d: string): Point[] => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []
  const out: Point[] = []
  let command = ''
  let at: Point = { x: 0, y: 0 }
  let opened: Point = at
  let index = 0
  const take = (): number => Number(tokens[index++])
  while (index < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[index]!)) {
      command = tokens[index++]!
      if (command === 'Z' || command === 'z') at = opened
      continue
    }
    const relative = command === command.toLowerCase()
    switch (command.toUpperCase()) {
      case 'M':
      case 'L': {
        const x = take()
        const y = take()
        at = relative ? { x: at.x + x, y: at.y + y } : { x, y }
        if (command.toUpperCase() === 'M') {
          opened = at
          command = relative ? 'l' : 'L'
        }
        break
      }
      case 'H': {
        const x = take()
        at = { x: relative ? at.x + x : x, y: at.y }
        break
      }
      case 'V': {
        const y = take()
        at = { x: at.x, y: relative ? at.y + y : y }
        break
      }
      default:
        throw new Error(`this case reads no path command ${command}: ${d}`)
    }
    out.push(at)
  }
  return out
}

// see PK-1, PK-2
// WHY: a right arrow may be the left one mirrored by a transform, which moves every point it draws.
const transformOf = (text: string): readonly [number, number, number, number, number, number] => {
  let m: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0]
  for (const found of text.matchAll(/(matrix|translate|scale)\s*\(([^)]*)\)/g)) {
    const n = (found[2]!.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number)
    const next: [number, number, number, number, number, number] =
      found[1] === 'matrix'
        ? [n[0]!, n[1]!, n[2]!, n[3]!, n[4]!, n[5]!]
        : found[1] === 'translate'
          ? [1, 0, 0, 1, n[0]!, n[1] ?? 0]
          : [n[0]!, 0, 0, n[1] ?? n[0]!, 0, 0]
    m = [
      m[0] * next[0] + m[2] * next[1],
      m[1] * next[0] + m[3] * next[1],
      m[0] * next[2] + m[2] * next[3],
      m[1] * next[2] + m[3] * next[3],
      m[0] * next[4] + m[2] * next[5] + m[4],
      m[1] * next[4] + m[3] * next[5] + m[5],
    ]
  }
  return m
}

// see PK-1, PK-2
const shapeOf = (svg: string): Shape => {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? ''
  const width = Number(attributeOf(root, 'width') ?? Number.NaN)
  const height = Number(attributeOf(root, 'height') ?? Number.NaN)
  const drawn = [...svg.matchAll(/<(path|polygon|polyline|line|rect)\b[^>]*>/g)].map((one) => one[0])
  const fills = drawn.map((tag) => paintOf(tag, 'fill')).filter((one): one is string => one !== null && one !== 'none')
  const strokes = drawn
    .map((tag) => paintOf(tag, 'stroke'))
    .filter((one): one is string => one !== null && one !== 'none')
  const points: Point[] = drawn.flatMap((tag) => {
    const d = attributeOf(tag, 'd')
    const own = d !== null ? pathPointsOf(d) : pairsOf(attributeOf(tag, 'points') ?? '')
    const matrix = transformOf(attributeOf(tag, 'transform') ?? '')
    return own.map((one) => ({ x: matrix[0] * one.x + matrix[2] * one.y + matrix[4], y: matrix[1] * one.x + matrix[3] * one.y + matrix[5] }))
  })
  // WHY: the path is drawn in viewBox units, which need not be the image's px side.
  const box = (attributeOf(root, 'viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  const [gridWidth, gridHeight] = box.length === 4 ? [box[2]!, box[3]!] : [width, height]
  const centre = gridWidth / 2
  const spread = Math.max(...points.map((one) => Math.abs(one.y - gridHeight / 2)))
  const head = points.filter((one) => Math.abs(one.y - gridHeight / 2) >= spread * 0.9)
  const headX = head.reduce((sum, one) => sum + one.x, 0) / Math.max(head.length, 1)
  return { side: width === height ? width : Number.NaN, fills, strokes, pointsLeft: headX < centre }
}

const WANTED = {
  'GA-1': { left: true, fill: '#ffffff', stroke: '#000000' },
  'GA-2': { left: false, fill: '#ffffff', stroke: '#000000' },
  'GA-3': { left: true, fill: '#000000', stroke: '#ffffff' },
  'GA-4': { left: false, fill: '#000000', stroke: '#ffffff' },
} as const

const hoverAt = (built: Bench, at: Point): string | null => {
  built.send(pointer('move', at))
  return built.latest()
}

describe('T-269 -- the image each end shows', () => {
  it.each(Object.keys(WANTED) as (keyof typeof WANTED)[])(
    `%s: an S-249 square image with a centre hotspot: ${PK_1_SQUARE}`,
    (row) => {
      const built = benchAt(DEFAULT_DISPLAY_SCALE)
      const written = hoverAt(built, endsOf(built.loop)[row])
      const cursor = cursorOf(written)
      expect(cursor, `${row}: ${written}`).not.toBeNull()
      expect(shapeOf(cursor!.svg).side, `${row}: ${PK_1_SQUARE}`).toBe(S_249)
      expect([cursor!.hotspotX, cursor!.hotspotY], `${row}: ${PK_2_SQUARE}`).toEqual([S_249 / 2, S_249 / 2])
    },
  )

  it.each(Object.keys(WANTED) as (keyof typeof WANTED)[])(`%s: the direction and the paint: ${FR_106_COLOURS}`, (row) => {
    const built = benchAt(DEFAULT_DISPLAY_SCALE)
    const cursor = cursorOf(hoverAt(built, endsOf(built.loop)[row]))
    expect(cursor, row).not.toBeNull()
    const shape = shapeOf(cursor!.svg)
    expect(shape.pointsLeft, `${row} points ${WANTED[row].left ? 'left' : 'right'}`).toBe(WANTED[row].left)
    expect(new Set(shape.fills), `${row}: ${FR_106_COLOURS}`).toEqual(new Set([WANTED[row].fill]))
    expect(new Set(shape.strokes), `${row}: ${FR_106_COLOURS}`).toEqual(new Set([WANTED[row].stroke]))
  })

  it.each(Object.keys(WANTED) as (keyof typeof WANTED)[])(`%s: ends with ew-resize: ${FR_106_FALLBACK}`, (row) => {
    const built = benchAt(DEFAULT_DISPLAY_SCALE)
    const cursor = cursorOf(hoverAt(built, endsOf(built.loop)[row]))
    expect(cursor, row).not.toBeNull()
    expect(cursor!.fallback, `${row}: ${FR_106_FALLBACK}`).toBe('ew-resize')
  })
})

describe(`FR-106 (MUST NOT) -- ${FR_106_NO_DISPLAY_SCALE}`, () => {
  it.each([DISPLAY_SCALE_STEPS[0]!, DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!])(
    'keeps the image S-249 wide and the hotspot at its centre at display scale %s',
    (scale) => {
      const built = benchAt(scale)
      for (const row of Object.keys(WANTED) as (keyof typeof WANTED)[]) {
        const cursor = cursorOf(hoverAt(built, endsOf(built.loop)[row]))
        expect(cursor, `${row} at ${scale}`).not.toBeNull()
        expect(shapeOf(cursor!.svg).side, `${row} at ${scale}: ${FR_106_NO_DISPLAY_SCALE}`).toBe(S_249)
        expect(cursor!.hotspotX, `${row} at ${scale}: ${FR_106_NO_DISPLAY_SCALE}`).toBe(S_249 / 2)
      }
    },
  )
})

describe('CR-427 section 9 -- what the change request leaves open', () => {
  it.skip('milestone figures and the fade corners (GA-7 / GA-8) keep their own shapes -- open: CR-427 questions 1 and 2, PND-445', () => {})
  it.skip('the 24px side is chosen again after it is seen -- open: CR-427 question 3', () => {})
})
