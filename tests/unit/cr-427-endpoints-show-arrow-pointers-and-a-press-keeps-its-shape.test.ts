// CR-427: the four end points show T-264 arrow images of S-249 px with a centre hotspot, falling back to ew-resize.

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

const PC_5_SQUARE =
  '矢印は、`_assets/tbl-settings.md` の 表 T-206 の `S-249` を一辺とする正方形に、矢じりと軸で描くこと（MUST）'
const PC_5_COLOURS =
  '白抜きは白（`#ffffff`）の塗りと黒（`#000000`）の輪郭、塗りつぶしは黒の塗りと白の輪郭とすること（MUST）'
const PC_5_HOTSPOT = '⭐ ホットスポット（ポインタが指す点）を正方形の中心に置くこと（MUST）'
const PC_6_FALLBACK =
  '閲覧環境が画像のポインタを描けないときは、横方向の伸縮の合図（`ew-resize`）とすること（MUST）'
const T_264_NO_DISPLAY_SCALE = '⛔ 矢印の画像に表示の倍率（`FR-039`）を掛けてはならない（MUST NOT）'

describe('CR-427 -- the manuscript these cases are driven by', () => {
  it.each([PC_5_SQUARE, PC_5_COLOURS, PC_5_HOTSPOT, PC_6_FALLBACK, T_264_NO_DISPLAY_SCALE])(
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
    expect(S_249).toBe(24)
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

// see T-023d, GR-3, GR-4, GR-5, GR-6
const endsOf = (loop: FrameLoop): Readonly<Record<'PC-1' | 'PC-2' | 'PC-3' | 'PC-4', Point>> => {
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
    'PC-1': { x: plan.left - 1, y: plan.middle },
    'PC-2': { x: plan.right + 1, y: plan.middle },
    'PC-3': { x: actual.left + 1, y: actual.middle },
    'PC-4': { x: actual.right - 1, y: actual.middle },
  }
}

interface Cursor {
  readonly svg: string
  readonly hotspotX: number
  readonly hotspotY: number
  readonly fallback: string
}

// see PC-5, PC-6
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

// see PC-1, PC-2, PC-3, PC-4, PC-5
const shapeOf = (svg: string): Shape => {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? ''
  const width = Number(attributeOf(root, 'width') ?? Number.NaN)
  const height = Number(attributeOf(root, 'height') ?? Number.NaN)
  const drawn = [...svg.matchAll(/<(path|polygon|polyline|line|rect)\b[^>]*>/g)].map((one) => one[0])
  const fills = drawn.map((tag) => paintOf(tag, 'fill')).filter((one): one is string => one !== null && one !== 'none')
  const strokes = drawn
    .map((tag) => paintOf(tag, 'stroke'))
    .filter((one): one is string => one !== null && one !== 'none')
  const numbers = drawn.flatMap((tag) =>
    ((attributeOf(tag, 'd') ?? attributeOf(tag, 'points') ?? '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number),
  )
  const points: Point[] = []
  for (let at = 0; at + 1 < numbers.length; at += 2) points.push({ x: numbers[at]!, y: numbers[at + 1]! })
  const centre = width / 2
  const spread = Math.max(...points.map((one) => Math.abs(one.y - height / 2)))
  const head = points.filter((one) => Math.abs(one.y - height / 2) >= spread * 0.9)
  const headX = head.reduce((sum, one) => sum + one.x, 0) / Math.max(head.length, 1)
  return { side: width === height ? width : Number.NaN, fills, strokes, pointsLeft: headX < centre }
}

const WANTED = {
  'PC-1': { left: true, fill: '#ffffff', stroke: '#000000' },
  'PC-2': { left: false, fill: '#ffffff', stroke: '#000000' },
  'PC-3': { left: true, fill: '#000000', stroke: '#ffffff' },
  'PC-4': { left: false, fill: '#000000', stroke: '#ffffff' },
} as const

const hoverAt = (built: Bench, at: Point): string | null => {
  built.send(pointer('move', at))
  return built.latest()
}

describe('T-264 -- the image each end shows', () => {
  it.each(Object.keys(WANTED) as (keyof typeof WANTED)[])(
    `%s: an S-249 square image with a centre hotspot: ${PC_5_SQUARE}`,
    (row) => {
      const built = benchAt(DEFAULT_DISPLAY_SCALE)
      const written = hoverAt(built, endsOf(built.loop)[row])
      const cursor = cursorOf(written)
      expect(cursor, `${row}: ${written}`).not.toBeNull()
      expect(shapeOf(cursor!.svg).side, `${row}: ${PC_5_SQUARE}`).toBe(S_249)
      expect([cursor!.hotspotX, cursor!.hotspotY], `${row}: ${PC_5_HOTSPOT}`).toEqual([S_249 / 2, S_249 / 2])
    },
  )

  it.each(Object.keys(WANTED) as (keyof typeof WANTED)[])(`%s: the direction and the paint: ${PC_5_COLOURS}`, (row) => {
    const built = benchAt(DEFAULT_DISPLAY_SCALE)
    const cursor = cursorOf(hoverAt(built, endsOf(built.loop)[row]))
    expect(cursor, row).not.toBeNull()
    const shape = shapeOf(cursor!.svg)
    expect(shape.pointsLeft, `${row} points ${WANTED[row].left ? 'left' : 'right'}`).toBe(WANTED[row].left)
    expect(new Set(shape.fills), `${row}: ${PC_5_COLOURS}`).toEqual(new Set([WANTED[row].fill]))
    expect(new Set(shape.strokes), `${row}: ${PC_5_COLOURS}`).toEqual(new Set([WANTED[row].stroke]))
  })

  it.each(Object.keys(WANTED) as (keyof typeof WANTED)[])(`%s: ends with ew-resize: ${PC_6_FALLBACK}`, (row) => {
    const built = benchAt(DEFAULT_DISPLAY_SCALE)
    const cursor = cursorOf(hoverAt(built, endsOf(built.loop)[row]))
    expect(cursor, row).not.toBeNull()
    expect(cursor!.fallback, `${row}: ${PC_6_FALLBACK}`).toBe('ew-resize')
  })
})

describe(`T-264 (MUST NOT) -- ${T_264_NO_DISPLAY_SCALE}`, () => {
  it.each([DISPLAY_SCALE_STEPS[0]!, DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!])(
    'keeps the image S-249 wide and the hotspot at its centre at display scale %s',
    (scale) => {
      const built = benchAt(scale)
      for (const row of Object.keys(WANTED) as (keyof typeof WANTED)[]) {
        const cursor = cursorOf(hoverAt(built, endsOf(built.loop)[row]))
        expect(cursor, `${row} at ${scale}`).not.toBeNull()
        expect(shapeOf(cursor!.svg).side, `${row} at ${scale}: ${T_264_NO_DISPLAY_SCALE}`).toBe(S_249)
        expect(cursor!.hotspotX, `${row} at ${scale}: ${T_264_NO_DISPLAY_SCALE}`).toBe(S_249 / 2)
      }
    },
  )
})

describe('CR-427 section 9 -- what the change request leaves open', () => {
  it.skip('milestone figures and the fade corners (GR-1 / GR-2) keep their own shapes -- open: CR-427 questions 1 and 2, PND-445', () => {})
  it.skip('the 24px side is chosen again after it is seen -- open: CR-427 question 3', () => {})
})
