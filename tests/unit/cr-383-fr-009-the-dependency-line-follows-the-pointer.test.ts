// CR-383 / FR-009 / DFC-591: the dependency line drawn while it is being pulled.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { IconId, ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_009_DRAFT_FOLLOWS =
  '依存線を構えて端点を押してから離すまで、ポインタの位置を入口とみなした仮の依存線を描き、ポインタに追従させること（MUST）'
const FR_009_DRAFT_ENTERS_FROM_THE_LEFT =
  'ポインタが結べる相手の上に無いあいだ、仮の線は、開始側から引き出したときも終了側から引き出したときも、線の終わりがポインタの左から水平に入り、矢じりの先がポインタに当たる形で描くこと（MUST）'
const FR_009_DRAFT_EXIT_AND_ROUTE =
  '出口と、出口からの走りと折れは 表 T-018 の出口のアンカーと 表 T-018a の経路に従い、入口だけをポインタの左に置くこと（MUST）'
const FR_009_DRAFT_OVER_A_PARTNER =
  'ポインタが結べる相手（タスクかマイルストーン）の上に在るあいだは、離したら作ることになる種別（上の段の左半分 / 右半分）の 表 T-018 の入口のアンカーと 表 T-018a の経路で仮の線を描くこと（MUST）'
const FR_009_SELF_IS_NO_PARTNER = '引き出したもの自身の上は、結べる相手に数えないこと（MUST）'
const FR_009_NO_WRITE_WHILE_PULLING = '引いているあいだ依存を文書へ書いてはならない（MUST NOT）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-009 (MUST) -- a draft line follows the pointer from press to release', FR_009_DRAFT_FOLLOWS],
  ['FR-009 (MUST) -- over nothing, the draft enters the pointer horizontally from its left', FR_009_DRAFT_ENTERS_FROM_THE_LEFT],
  ['FR-009 (MUST) -- the exit and the run follow T-018 / T-018a', FR_009_DRAFT_EXIT_AND_ROUTE],
  ['FR-009 (MUST) -- over a partner, the draft takes the anchor and route of what release makes', FR_009_DRAFT_OVER_A_PARTNER],
  ['FR-009 (MUST) -- the pulled task itself is no partner', FR_009_SELF_IS_NO_PARTNER],
  ['FR-009 (MUST NOT) -- nothing is written while pulling', FR_009_NO_WRITE_WHILE_PULLING],
]

describe('CR-383 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

type Side = 'start' | 'finish'
type Edge = 'left' | 'right'

// see T-018, FR-009
const T_018 = specTable('T-018').rows.map((row) => ({
  id: row.id,
  name: bare(row.by['名'] ?? ''),
  exit: bare(row.by['出口（先行の）'] ?? ''),
  entry: bare(row.by['入口（後続の）'] ?? ''),
}))

const LEFT_EDGE_CELL = '左辺の中央'
const RIGHT_EDGE_CELL = '右辺の中央'
const START_WORD = '開始'
const FINISH_WORD = '完了'

const edgeOf = (cell: string): Edge => {
  if (cell === LEFT_EDGE_CELL) return 'left'
  if (cell === RIGHT_EDGE_CELL) return 'right'
  throw new Error(`table T-018 names an anchor this file cannot read: ${cell}`)
}

const wordOf = (side: Side): string => (side === 'start' ? START_WORD : FINISH_WORD)

// see FR-009
// WHY: the left half is the start side and the right half the finish side, so the
// WHY: row is the one whose name reads from-side then into-side.
const rowFor = (from: Side, into: Side) => {
  const pattern = new RegExp(`（${wordOf(from)} → ${wordOf(into)}）`)
  const found = T_018.filter((row) => pattern.test(row.name))
  if (found.length !== 1) throw new Error(`table T-018 has ${found.length} rows for ${from} -> ${into}`)
  return found[0] as (typeof T_018)[number]
}

const exitEdge = (from: Side): Edge => {
  const edges = new Set((['start', 'finish'] as const).map((into) => edgeOf(rowFor(from, into).exit)))
  if (edges.size !== 1) throw new Error(`table T-018 gives ${from} two exits`)
  return [...edges][0] as Edge
}

const entryEdge = (from: Side, into: Side): Edge => edgeOf(rowFor(from, into).entry)

describe('table T-018 still reads the way these cases read it', () => {
  it('holds four kinds, and each from-side / into-side pair names one row', () => {
    expect(T_018.map((row) => row.id)).toEqual(['DP-1', 'DP-2', 'DP-3', 'DP-4'])
    for (const from of ['start', 'finish'] as const) {
      for (const into of ['start', 'finish'] as const) expect(rowFor(from, into)).toBeDefined()
    }
    expect(exitEdge('start')).toBe('left')
    expect(exitEdge('finish')).toBe('right')
  })
})

// see AR-4
const DEPENDENCY_ARMING_ENTRY: IconId = ((): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes('AR-4'))
  if (found === undefined) throw new Error('table T-109 has no entry whose 構え is AR-4')
  return found.id
})()

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ROW_A = '11111111-1111-4111-8111-111111111111'
const ROW_B = '22222222-2222-4222-8222-222222222222'
const UID_A = 1
const UID_B = 2
const PX_PER_DAY_AT_1X = 20

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
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
  }) as unknown as Task

const groupRow = (id: string, order: number) => ({
  id,
  parentId: null,
  label: `row ${order}`,
  derivedFromTaskUid: null,
  order,
  isCollapsed: false,
  isHidden: false,
  color: null,
  height: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE)
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks: [
        task({ uid: UID_A, name: 'A', start: '2026-04-06', finish: '2026-04-10' }),
        task({ uid: UID_B, name: 'B', start: '2026-04-20', finish: '2026-04-24' }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [groupRow(ROW_A, 0), groupRow(ROW_B, 1)],
      taskGroupMembers: [
        { taskUid: UID_A, groupId: ROW_A, stackOrder: null },
        { taskUid: UID_B, groupId: ROW_B, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...template.documentSettings,
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
      dependencyVisible: true,
      progressLineVisible: false,
    },
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }
const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const TOLERANCE_PX = 1

const inside = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const realRaf = (globalThis as any).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  svg(): string
}

function stage(): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const pictures: string[] = []
  const run = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (x, y): ScreenPart | null =>
      inside(PALETTE_BOX, { x, y })
        ? {
            part: 'Command Palette',
            entry: DEPENDENCY_ARMING_ENTRY,
            format: null,
            rowGroupId: null,
            resourceUid: null,
            dividerPanel: null,
            noticeDismissKey: null,
          }
        : null,
  }
  const loop = frameLoop(
    { showSvg: (svg: string) => void pictures.push(svg) } as any,
    fixtureDocument(),
    SCREEN,
    { surface, language: 'en' },
  )
  run()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      run()
    },
    svg: () => {
      if (pictures.length === 0) throw new Error('the loop never handed the surface a picture')
      return pictures[pictures.length - 1] as string
    },
  }
}

function planBox(loop: FrameLoop, uid: number): ScreenRect {
  const drawn = loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)
  const bar: BarGeometry | null | undefined = drawn?.plan
  if (bar === null || bar === undefined) throw new Error(`Task ${uid} drew no plan bar`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

const midY = (box: ScreenRect): number => box.y + box.height / 2

// see FR-009
// WHY: a quarter in from each end keeps the probe clear of the midpoint rule,
// WHY: which is not what these cases are about.
const halfProbe = (box: ScreenRect, side: Side): Point => ({
  x: box.x + box.width * (side === 'start' ? 0.25 : 0.75),
  y: midY(box),
})

const anchor = (box: ScreenRect, edge: Edge): Point => ({
  x: edge === 'left' ? box.x : box.x + box.width,
  y: midY(box),
})

function emptyPlace(loop: FrameLoop): Point {
  const b = planBox(loop, UID_B)
  const a = planBox(loop, UID_A)
  return { x: b.x + b.width + 4 * PX_PER_DAY_AT_1X, y: midY(a) }
}

function arm(built: Stage): void {
  const at = { x: PALETTE_BOX.x + PALETTE_BOX.width / 2, y: PALETTE_BOX.y + PALETTE_BOX.height / 2 }
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

const attribute = (element: string, name: string): string | null =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(element)?.[1] ?? null

// see GD-6
function arrowedLines(svg: string): readonly (readonly Point[])[] {
  return [...svg.matchAll(/<polyline\b[^>]*>/g)]
    .map((hit) => hit[0])
    .filter((element) => attribute(element, 'marker-end') !== null)
    .map((element) =>
      (attribute(element, 'points') ?? '')
        .trim()
        .split(/\s+/)
        .map((pair) => {
          const [x, y] = pair.split(',').map(Number)
          return { x: x as number, y: y as number }
        }),
    )
}

function onlyArrowedLine(svg: string, why: string): readonly Point[] {
  const lines = arrowedLines(svg)
  expect(lines, `${why}: exactly one arrowed line stands in the picture`).toHaveLength(1)
  return lines[0] as readonly Point[]
}

const near = (a: Point | undefined, b: Point): boolean =>
  a !== undefined && Math.abs(a.x - b.x) <= TOLERANCE_PX && Math.abs(a.y - b.y) <= TOLERANCE_PX

const dependenciesHeld = (loop: FrameLoop): string =>
  JSON.stringify(loop.document().schedule.tasks.map((one) => one.dependencies))

describe('the bench -- a released line is drawn where the frame says, before any draft is asked for', () => {
  it('creates a dependency by press-drag-release, and the picture draws it on the frame geometry', () => {
    const built = stage()
    arm(built)
    const from = halfProbe(planBox(built.loop, UID_A), 'finish')
    const into = halfProbe(planBox(built.loop, UID_B), 'start')
    expect(arrowedLines(built.svg()), 'premise: no dependency before the drag').toHaveLength(0)
    built.send(pointer('down', from))
    built.send(pointer('move', into))
    built.send(pointer('up', into))
    const made = built.loop.current()?.geometry.dependencies ?? []
    expect(made, 'FR-009: releasing on B made one dependency').toHaveLength(1)
    const drawn = onlyArrowedLine(built.svg(), 'the released dependency')
    expect(drawn.length).toBe(made[0]?.points.length)
    made[0]?.points.forEach((point, at) => expect(near(drawn[at], point), `point ${at}`).toBe(true))
  })
})

describe(`FR-009 (MUST) -- over nothing: ${FR_009_DRAFT_ENTERS_FROM_THE_LEFT}`, () => {
  for (const from of ['start', 'finish'] as const) {
    it(`pulled from the ${from} side, the draft leaves T-018's exit and its arrow tip is the pointer, entered from the left`, () => {
      const built = stage()
      arm(built)
      const source = planBox(built.loop, UID_A)
      const at = emptyPlace(built.loop)
      // STEP: press on the source half, then move to an empty place without releasing
      built.send(pointer('down', halfProbe(source, from)))
      built.send(pointer('move', at))

      const line = onlyArrowedLine(built.svg(), `${FR_009_DRAFT_FOLLOWS} -- pulled from ${from}`)
      const exit = anchor(source, exitEdge(from))
      expect(near(line[0], exit), `${FR_009_DRAFT_EXIT_AND_ROUTE} -- first point ${JSON.stringify(line[0])} vs ${JSON.stringify(exit)}`).toBe(true)
      const second = line[1] as Point
      expect(
        exitEdge(from) === 'left' ? second.x < exit.x : second.x > exit.x,
        'T-018a RT-2: the run leaves the bar outward',
      ).toBe(true)
      const tip = line[line.length - 1] as Point
      const before = line[line.length - 2] as Point
      expect(near(tip, at), `${FR_009_DRAFT_ENTERS_FROM_THE_LEFT} -- tip ${JSON.stringify(tip)} vs pointer ${JSON.stringify(at)}`).toBe(true)
      expect(Math.abs(before.y - at.y) <= TOLERANCE_PX, 'the last run is horizontal').toBe(true)
      expect(before.x < at.x, 'the last run comes in from the left of the pointer').toBe(true)
    })
  }

  it('follows the pointer: a second move moves the tip with it', () => {
    const built = stage()
    arm(built)
    const at = emptyPlace(built.loop)
    const later = { x: at.x + 2 * PX_PER_DAY_AT_1X, y: at.y }
    built.send(pointer('down', halfProbe(planBox(built.loop, UID_A), 'finish')))
    built.send(pointer('move', at))
    built.send(pointer('move', later))
    const line = onlyArrowedLine(built.svg(), FR_009_DRAFT_FOLLOWS)
    expect(near(line[line.length - 1], later), FR_009_DRAFT_FOLLOWS).toBe(true)
  })
})

describe(`FR-009 (MUST) -- over a partner: ${FR_009_DRAFT_OVER_A_PARTNER}`, () => {
  for (const from of ['start', 'finish'] as const) {
    for (const into of ['start', 'finish'] as const) {
      it(`${from} side into the ${into} half of B: the draft ends on T-018's entry and matches the line release makes`, () => {
        const built = stage()
        arm(built)
        const target = planBox(built.loop, UID_B)
        const over = halfProbe(target, into)
        // STEP: press on A, move over B, read the draft, then release on the same point
        built.send(pointer('down', halfProbe(planBox(built.loop, UID_A), from)))
        built.send(pointer('move', over))
        const draft = onlyArrowedLine(built.svg(), `draft ${from} -> ${into}`)
        const entry = anchor(target, entryEdge(from, into))
        expect(
          near(draft[draft.length - 1], entry),
          `${FR_009_DRAFT_OVER_A_PARTNER} -- ${rowFor(from, into).id}: tip ${JSON.stringify(draft[draft.length - 1])} vs ${JSON.stringify(entry)}`,
        ).toBe(true)

        built.send(pointer('up', over))
        const made = onlyArrowedLine(built.svg(), `released ${from} -> ${into}`)
        expect(draft.length, `${FR_009_DRAFT_OVER_A_PARTNER} -- same route as ${rowFor(from, into).id}`).toBe(made.length)
        made.forEach((point, at) => expect(near(draft[at], point), `route point ${at}`).toBe(true))
      })
    }
  }
})

describe(`FR-009 (MUST) -- ${FR_009_SELF_IS_NO_PARTNER}`, () => {
  it('over the other half of the pulled task itself, the draft still ends at the pointer from its left', () => {
    const built = stage()
    arm(built)
    const source = planBox(built.loop, UID_A)
    const over = halfProbe(source, 'finish')
    built.send(pointer('down', halfProbe(source, 'start')))
    built.send(pointer('move', over))
    const line = onlyArrowedLine(built.svg(), FR_009_SELF_IS_NO_PARTNER)
    const before = line[line.length - 2] as Point
    expect(near(line[line.length - 1], over), `${FR_009_SELF_IS_NO_PARTNER} -- tip is the pointer`).toBe(true)
    expect(before.x < over.x && Math.abs(before.y - over.y) <= TOLERANCE_PX).toBe(true)
  })
})

describe(`FR-009 (MUST NOT) -- ${FR_009_NO_WRITE_WHILE_PULLING}`, () => {
  it('holds the same dependencies through every move before the release', () => {
    const built = stage()
    arm(built)
    const held = dependenciesHeld(built.loop)
    built.send(pointer('down', halfProbe(planBox(built.loop, UID_A), 'finish')))
    for (const at of [emptyPlace(built.loop), halfProbe(planBox(built.loop, UID_B), 'start')]) {
      built.send(pointer('move', at))
      expect(arrowedLines(built.svg()).length, 'premise: the draft is being drawn').toBe(1)
      expect(dependenciesHeld(built.loop), FR_009_NO_WRITE_WHILE_PULLING).toBe(held)
    }
  })
})
