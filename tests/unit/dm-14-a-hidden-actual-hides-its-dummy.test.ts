// T-240 DM-14 and FR-049: hiding the actual hides its dummy, keeps its room, and leaves it ungrabbable.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  NOT_STORED_SIZES,
  itemAtPointer,
  type GrabSizes,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type DummyGeometry,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const DM_14_DO_NOT_DRAW = '`S-228`）を切っているあいだ、ダミーを描かないこと（MUST）'
const DM_14_KEEP_THE_ROOM = 'あいだ、ダミーを描かないこと（MUST）。⭐ 占有はそのまま残すこと（MUST）'
const DM_14_PLAN_DISPLAY_DOES_NOT_DECIDE = '⛔ 予定の表示（`S-227`）で、ダミーを描くかどうかを変えてはならない（MUST NOT）'
const FR_049_HIDDEN_KEEPS_ROOM_AND_LEAVES_THE_HIT =
  'は、占有（表 T-038 の算入と、名称ラベルの位置の数え方）をそのまま残し、描かず、当たり判定から外すこと（MUST）'
const FR_049_HIDDEN_STAYS_IN_THE_ROOM = '⛔ 隠したものを占有から外してはならない（MUST NOT）'

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

const ENV: ScreenEnvironment = { width: 1200, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const SLOP: GrabSizes = NOT_STORED_SIZES

const UNDER_TEST = 1

const notStarted = (): Schedule =>
  ({
    project: {
      title: 'DM-14',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      weekStartDay: null,
      minutesPerDay: null,
      themeHue: 214,
      uidHighWaterMark: 100,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [
      {
        uid: UNDER_TEST,
        wbsParentUid: null,
        wbsOrder: null,
        name: 'Design',
        start: '2026-01-05T00:00:00',
        finish: '2026-01-23T00:00:00',
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
      } as unknown as Task,
    ],
    resources: [],
    assignments: [],
    taskGroups: [
      {
        id: 'g1',
        parentId: null,
        label: 'row',
        derivedFromTaskUid: null,
        order: 0,
        treeState: 'auto', color: null,
        height: null,
      } as unknown as TaskGroup,
    ],
    taskGroupMembers: [{ taskUid: UNDER_TEST, groupId: 'g1', stackOrder: null }],
    taskVisuals: [
      {
        taskUid: UNDER_TEST,
        shapeKind: 'rectangle',
        milestoneGlyph: null,
        fillColor: null,
        strokeColor: null,
        lineWeight: null,
      } as unknown as TaskVisual,
    ],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

interface Drawn {
  readonly geometry: ScheduleGeometry
  readonly svg: string
  readonly placed: TaskPlacement
}

const draw = (visible: { readonly plan: boolean; readonly actual: boolean }): Drawn => {
  const settings = settingsOf({
    scrollDate: '2026-01-01T00:00:00',
    scrollGroupId: 'g1',
    stackDirection: 'down',
    zoomX: 6,
    planVisible: visible.plan,
    actualVisible: visible.actual,
  })
  const schedule = notStarted()
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen')
  const placed = taskPlacement(layout, UNDER_TEST)
  if (placed === null) throw new Error('the Task was not placed')
  return { geometry, svg, placed }
}

const SHOWN = { plan: true, actual: true }
const ACTUAL_HIDDEN = { plan: true, actual: false }
const PLAN_HIDDEN = { plan: false, actual: true }

const taskOf = (drawn: Drawn): TaskGeometry => {
  const found = drawn.geometry.tasks.find((one) => one.taskUid === UNDER_TEST)
  if (found === undefined) throw new Error('the Task was not drawn')
  return found
}

const startDummyOf = (drawn: Drawn): DummyGeometry => {
  const found = taskOf(drawn).dummies.find((one) => one.grab === 'GA-5')
  if (found === undefined) throw new Error('FR-043 drew no GA-5 on a Task nobody has started')
  return found
}

interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

const numbers = (text: string): number[] => (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

const attr = (element: string, name: string): number | null => {
  const hit = new RegExp(`\\s${name}="([^"]*)"`).exec(element)
  return hit === null ? null : Number.parseFloat(hit[1] ?? '')
}

const boxesOf = (svg: string): readonly Box[] => {
  const out: Box[] = []
  for (const hit of svg.matchAll(/<polygon\b[^>]*\spoints="([^"]*)"[^>]*>/g)) {
    const values = numbers(hit[1] ?? '')
    const xs = values.filter((_, i) => i % 2 === 0)
    const ys = values.filter((_, i) => i % 2 === 1)
    if (xs.length === 0) continue
    out.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) })
  }
  for (const hit of svg.matchAll(/<rect\b[^>]*>/g)) {
    const element = hit[0]
    const x = attr(element, 'x')
    const y = attr(element, 'y')
    const width = attr(element, 'width')
    const height = attr(element, 'height')
    if (x === null || y === null || width === null || height === null) continue
    out.push({ x0: x, y0: y, x1: x + width, y1: y + height })
  }
  return out
}

const GRID = 0.01

const drawsTheInk = (svg: string, dummy: DummyGeometry): boolean =>
  boxesOf(svg).some(
    (box) =>
      Math.abs(box.x0 - dummy.ink.x) <= GRID &&
      Math.abs(box.x1 - (dummy.ink.x + dummy.ink.width)) <= GRID &&
      Math.abs(box.y0 - dummy.ink.y) <= GRID &&
      Math.abs(box.y1 - (dummy.ink.y + dummy.ink.height)) <= GRID,
  )

const pressOnTheStartHalf = (drawn: Drawn, dummy: DummyGeometry): string | null =>
  itemAtPointer(drawn.geometry, dummy.ink.x + dummy.ink.width / 4, dummy.ink.y + dummy.ink.height / 2, SLOP)
    ?.grab ?? null

describe('DM-14 premises: the rows still read this way', () => {
  it('T-240 DM-14 and FR-049 hold the clauses word for word, and S-227 / S-228 are the two display rows', () => {
    expect(REQUIREMENTS).toContain(DM_14_DO_NOT_DRAW)
    expect(REQUIREMENTS).toContain(DM_14_KEEP_THE_ROOM)
    expect(REQUIREMENTS).toContain(DM_14_PLAN_DISPLAY_DOES_NOT_DECIDE)
    expect(REQUIREMENTS).toContain(FR_049_HIDDEN_KEEPS_ROOM_AND_LEAVES_THE_HIT)
    expect(REQUIREMENTS).toContain(FR_049_HIDDEN_STAYS_IN_THE_ROOM)
    const rows = specTable('T-202').rows
    expect(JSON.stringify(rows.find((one) => one.id === 'S-227')?.by)).toContain('planVisible')
    expect(JSON.stringify(rows.find((one) => one.id === 'S-228')?.by)).toContain('actualVisible')
  })

  it('with both shown, the picture draws the dummy ink the geometry names, which is what the reader finds', () => {
    const shown = draw(SHOWN)
    expect(drawsTheInk(shown.svg, startDummyOf(shown))).toBe(true)
    expect(pressOnTheStartHalf(shown, startDummyOf(shown))).toBe('GA-5')
  })
})

describe('T-240 DM-14 (MUST): while S-228 is off the dummy is not drawn', () => {
  it('draws no dummy ink where the shown picture draws it', () => {
    const where = startDummyOf(draw(SHOWN))
    expect(drawsTheInk(draw(ACTUAL_HIDDEN).svg, where), DM_14_DO_NOT_DRAW).toBe(false)
  })

  it('answers no dummy row where the shown picture had one', () => {
    const where = startDummyOf(draw(SHOWN))
    const answer = pressOnTheStartHalf(draw(ACTUAL_HIDDEN), where)
    expect(answer, FR_049_HIDDEN_KEEPS_ROOM_AND_LEAVES_THE_HIT).not.toBe('GA-5')
    expect(answer, FR_049_HIDDEN_KEEPS_ROOM_AND_LEAVES_THE_HIT).not.toBe('GA-6')
  })
})

describe('T-240 DM-14 (MUST) and FR-049 (MUST NOT): the hidden dummy keeps its room', () => {
  it('leaves the occupancy and the counted label place exactly where they stood with the actual shown', () => {
    const hidden = draw(ACTUAL_HIDDEN).placed
    const shown = draw(SHOWN).placed
    expect(
      [hidden.occupiedX0, hidden.occupiedX1, hidden.labelX, hidden.labelPlacement, hidden.stack],
      DM_14_KEEP_THE_ROOM,
    ).toEqual([shown.occupiedX0, shown.occupiedX1, shown.labelX, shown.labelPlacement, shown.stack])
  })

  it('moves the DRAWN label onto the RF-3 reference, which is what the toggle costs', () => {
    const hidden = taskOf(draw(ACTUAL_HIDDEN)).label
    const shown = taskOf(draw(SHOWN)).label
    if (hidden === null || shown === null) throw new Error('the name label was not drawn')
    expect(hidden.y, 'only the horizontal follows the reference').toBeCloseTo(shown.y, 6)
    expect(hidden.width).toBeCloseTo(shown.width, 6)
    expect(hidden.x, 'RF-1 measures from the dummy, RF-3 from the plan start').toBeLessThan(shown.x)
  })
})

describe('T-240 DM-14 (MUST NOT): the plan display does not decide whether the dummy is drawn', () => {
  it('draws the same dummy ink with S-227 off, and it still answers GA-5', () => {
    const shown = startDummyOf(draw(SHOWN))
    const planHidden = draw(PLAN_HIDDEN)
    expect(drawsTheInk(planHidden.svg, shown), DM_14_PLAN_DISPLAY_DOES_NOT_DECIDE).toBe(true)
    expect(pressOnTheStartHalf(planHidden, shown), DM_14_PLAN_DISPLAY_DOES_NOT_DECIDE).toBe('GA-5')
  })
})
