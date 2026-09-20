// CR-430: one sweep of 256 turns -- FR-109 keeps the labels apart, FR-108 keeps what is not drawn from answering.

import { expect, test } from '@playwright/test'

import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout, type ScheduleGeometry, type TaskGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  boxOfRect,
  boxesOverlap,
  drawingDefault,
  grabAreaRows,
  markerBoxOf,
  numberIn,
  resumeBoxOf,
  sizesOrSeam,
  specRow,
  type Box,
} from '../unit/cr-430-bench'

const TASK_UID = 1
const ROW_ID = 'sweep-row'
const PLAN_START = '2026-04-06T00:00:00'
const PLAN_FINISH = '2026-04-24T00:00:00'
const LONG_NAME = 'a name far too long to sit inside the figure it belongs to'
const SHORT_NAME = 'A'
const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 0, scrollbarThickness: 0 }
const X_SAMPLES = 300
const Y_SAMPLES = 12

const T_266_WHERE = '掴む所'

// see T-266
const FAMILY_WORDS: readonly (readonly [string, string])[] = [
  ['fade', 'フェード'],
  ['marker', '進捗マーカー'],
  ['resume', '再開アイコン'],
  ['dependency', '依存線'],
  ['dummy', 'ダミー'],
  ['actual', '実績'],
  ['plan', '予定'],
  ['plan', '本体'],
]

const familyOf = (grabArea: string): string => {
  const cell = specRow('T-266', grabArea).by[T_266_WHERE] ?? ''
  for (const [family, word] of FAMILY_WORDS) if (cell.includes(word)) return family
  throw new Error(`table T-266 row ${grabArea} names no family this sweep knows: ${cell}`)
}

const FAMILY_BY_ROW: ReadonlyMap<string, string> = new Map(grabAreaRows().map((row) => [row, familyOf(row)]))

interface Turn {
  readonly planVisible: boolean
  readonly actualVisible: boolean
  readonly progressMarkerVisible: boolean
  readonly fits: boolean
  readonly shape: 'rectangle' | 'arrow' | 'milestone' | 'dummy'
  readonly zoomX: number
  readonly actualIsEarly: boolean
}

const ZOOM_ENDS = [drawingDefault('S-54'), drawingDefault('S-55')]

const TURNS: readonly Turn[] = (() => {
  const out: Turn[] = []
  for (const planVisible of [true, false]) {
    for (const actualVisible of [true, false]) {
      for (const progressMarkerVisible of [true, false]) {
        for (const fits of [true, false]) {
          for (const shape of ['rectangle', 'arrow', 'milestone', 'dummy'] as const) {
            for (const zoomX of ZOOM_ENDS) {
              for (const actualIsEarly of [true, false]) {
                out.push({ planVisible, actualVisible, progressMarkerVisible, fits, shape, zoomX, actualIsEarly })
              }
            }
          }
        }
      }
    }
  }
  return out
})()

const nameOf = (turn: Turn): string =>
  `${turn.shape} plan=${String(turn.planVisible)} actual=${String(turn.actualVisible)} ` +
  `marker=${String(turn.progressMarkerVisible)} fits=${String(turn.fits)} ` +
  `zoomX=${String(turn.zoomX)} early=${String(turn.actualIsEarly)}`

const nestedDefaults = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = key.split('.')
    let into = out
    for (const step of path.slice(0, -1)) {
      into[step] = { ...((into[step] as Record<string, unknown> | undefined) ?? {}) }
      into = into[step] as Record<string, unknown>
    }
    into[path[path.length - 1] ?? ''] = value
  }
  return out
}

const settingsOf = (turn: Turn): DocumentSettings =>
  ({
    ...nestedDefaults(),
    scrollDate: '2026-04-01',
    scrollGroupId: ROW_ID,
    scrollDayOffset: 0,
    scrollGroupOffset: 0,
    pxPerDayAt1x: 20,
    stackDirection: 'down',
    assigneeVisible: true,
    percentCompleteVisible: true,
    planVisible: turn.planVisible,
    actualVisible: turn.actualVisible,
    progressMarkerVisible: turn.progressMarkerVisible,
    zoomX: turn.zoomX,
  }) as unknown as DocumentSettings

const taskOf = (turn: Turn): Task => {
  const milestone = turn.shape === 'milestone'
  const actual =
    turn.shape === 'dummy'
      ? { actualStart: null, stop: null, resumeValid: null }
      : turn.actualIsEarly
        ? { actualStart: '2026-04-02T00:00:00', stop: milestone ? '2026-04-02T00:00:00' : '2026-04-12T00:00:00', resumeValid: true }
        : { actualStart: '2026-04-10T00:00:00', stop: milestone ? '2026-04-10T00:00:00' : '2026-04-28T00:00:00', resumeValid: true }
  return {
    uid: TASK_UID,
    wbsParentUid: null,
    wbsOrder: 1,
    name: turn.fits ? SHORT_NAME : LONG_NAME,
    start: PLAN_START,
    finish: milestone ? PLAN_START : PLAN_FINISH,
    milestone,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualFinish: null,
    resume: null,
    percentComplete: 40,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...actual,
  } as unknown as Task
}

const scheduleOf = (turn: Turn): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: [taskOf(turn)],
    taskGroups: [{ id: ROW_ID, parentId: null, order: 0, height: null }],
    taskGroupMembers: [{ groupId: ROW_ID, taskUid: TASK_UID }],
    taskVisuals: [{ taskUid: TASK_UID, shapeKind: turn.shape === 'dummy' ? 'rectangle' : turn.shape }],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

interface Scene {
  readonly turn: Turn
  readonly drawn: TaskGeometry | null
  readonly geometry: ScheduleGeometry
  readonly rowArea: Box
}

const sceneOf = (turn: Turn): Scene => {
  const settings = settingsOf(turn)
  const regions = regionsFromScreen(ENV, settings)
  const schedule = scheduleOf(turn)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  const drawn = geometry.tasks.find((one) => one.taskUid === TASK_UID) ?? null
  const area = regions.rowArea
  return {
    turn,
    drawn,
    geometry,
    rowArea: { x0: area.x, x1: area.x + area.width, y0: area.y, y1: area.y + area.height },
  }
}

let held: readonly Scene[] | null = null

const scenes = (): readonly Scene[] => {
  if (held === null) held = TURNS.map(sceneOf)
  return held
}

const labelBoxesOf = (scene: Scene): readonly (readonly [string, Box])[] => {
  const out: (readonly [string, Box])[] = []
  if (scene.drawn === null) return out
  const name = boxOfRect(scene.drawn.label)
  if (name !== null) out.push(['name', name])
  const assignee = boxOfRect(scene.drawn.assigneeLabel)
  if (assignee !== null) out.push(['assignee and percent', assignee])
  const marker = markerBoxOf(scene.drawn)
  if (marker !== null) out.push(['marker', marker])
  const resume = resumeBoxOf(scene.drawn)
  if (resume !== null) out.push(['resume icon', resume])
  return out
}

const barBox = (bar: TaskGeometry['plan']): Box | null => {
  if (bar === null) return null
  const points = bar.form === 'outline' ? bar.points : [bar.from, bar.to, ...(bar.head ?? [])]
  const xs = points.map((one) => one.x).filter((one) => Number.isFinite(one))
  const ys = points.map((one) => one.y).filter((one) => Number.isFinite(one))
  if (xs.length === 0 || ys.length === 0) return null
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const dummyBoxesOf = (drawn: TaskGeometry): readonly Box[] =>
  drawn.dummies.map((one) => ({
    x0: one.ink.x,
    x1: one.ink.x + one.ink.width,
    y0: one.ink.y,
    y1: one.ink.y + one.ink.height,
  }))

const bandOf = (scene: Scene): Box | null => {
  if (scene.drawn === null) return scene.rowArea
  const parts: Box[] = labelBoxesOf(scene).map(([, box]) => box)
  for (const bar of [scene.drawn.plan, scene.drawn.actual, scene.drawn.milestoneFigure]) {
    const box = barBox(bar)
    if (box !== null) parts.push(box)
  }
  parts.push(...dummyBoxesOf(scene.drawn))
  if (parts.length === 0) return null
  const margin = 16
  return {
    x0: Math.max(Math.min(...parts.map((one) => one.x0)) - margin, scene.rowArea.x0 + 1),
    x1: Math.min(Math.max(...parts.map((one) => one.x1)) + margin, scene.rowArea.x1 - 1),
    y0: Math.max(Math.min(...parts.map((one) => one.y0)) - margin, scene.rowArea.y0 + 1),
    y1: Math.min(Math.max(...parts.map((one) => one.y1)) + margin, scene.rowArea.y1 - 1),
  }
}

const answeredIn = (scene: Scene): ReadonlySet<string> => {
  const band = bandOf(scene)
  const answered = new Set<string>()
  if (band === null || band.x1 <= band.x0 || band.y1 <= band.y0) return answered
  const sizes = sizesOrSeam()
  const stepX = Math.max((band.x1 - band.x0) / X_SAMPLES, 1)
  const stepY = Math.max((band.y1 - band.y0) / Y_SAMPLES, 1)
  for (let y = band.y0; y <= band.y1; y += stepY) {
    for (let x = band.x0; x <= band.x1; x += stepX) {
      const hit = itemAtPointer(scene.geometry, x, y, sizes)
      if (hit === null) continue
      if (hit.item.kind !== 'task' || hit.item.taskUid !== TASK_UID) continue
      answered.add(hit.grab)
    }
  }
  return answered
}

// see FR-108
const allowedIn = (scene: Scene): ReadonlySet<string> => {
  const turn = scene.turn
  const out = new Set<string>()
  if (scene.drawn === null) return out
  for (const [row, family] of FAMILY_BY_ROW) {
    if (family === 'plan' && turn.planVisible) out.add(row)
    if ((family === 'actual' || family === 'dummy') && turn.actualVisible) out.add(row)
    if (family === 'marker' && turn.progressMarkerVisible) out.add(row)
    if (family === 'resume' && turn.progressMarkerVisible && turn.actualVisible) out.add(row)
  }
  return out
}

// see T-266
const inkOf = (drawn: TaskGeometry, family: string): readonly Box[] => {
  if (family === 'marker') {
    const box = markerBoxOf(drawn)
    return box === null ? [] : [box]
  }
  if (family === 'dummy') return dummyBoxesOf(drawn)
  const bars = family === 'plan' ? [drawn.plan, drawn.milestoneFigure] : [drawn.actual]
  return bars.map(barBox).filter((one): one is Box => one !== null)
}

const touches = (a: Box, b: Box): boolean => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1

// see FR-108
// WHY: the frame clips the scrolling layer to the row area, so a figure whose
// WHY: whole ink sits outside that area is not drawn in this frame and carries
// WHY: no grab area. Reading the display setting alone would ask FR-104 about
// WHY: a bar the author cannot see -- at the high end of the zoom one day is
// WHY: over a thousand px wide, and most of the figure is off the right edge.
const showsInFrame = (scene: Scene, family: string): boolean =>
  scene.drawn !== null && inkOf(scene.drawn, family).some((box) => touches(box, scene.rowArea))

// see FR-104, FR-108, L-2
const wantedIn = (scene: Scene): readonly string[] => {
  const out: string[] = []
  if (scene.drawn === null) return out
  if (scene.turn.planVisible) out.push('plan')
  if (scene.turn.actualVisible) out.push(scene.turn.shape === 'dummy' ? 'dummy' : 'actual')
  if (scene.turn.progressMarkerVisible) out.push('marker')
  return out.filter((family) => showsInFrame(scene, family))
}

test('the sweep covers 256 turns of the seven axes CR-430 names', () => {
  expect(TURNS.length).toBe(256)
  expect(new Set(TURNS.map(nameOf)).size).toBe(256)
  expect(ZOOM_ENDS).toEqual(
    ['S-54', 'S-55'].map((id) => numberIn(specRow('T-201', id).by['既定値'] ?? '')),
  )
})

test('FR-109: the name, the assignee and percent, the marker and the resume icon never overlap', () => {
  const broken: string[] = []
  const counted = scenes().map((scene) => labelBoxesOf(scene).length)
  expect(
    Math.max(...counted),
    'premise: some turn draws more than one of 名称・担当者・進捗・進捗マーカー・再開アイコン, or this case asserts nothing',
  ).toBeGreaterThan(1)
  for (const scene of scenes()) {
    const boxes = labelBoxesOf(scene)
    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        const [oneName, oneBox] = boxes[a] ?? ['', { x0: 0, x1: 0, y0: 0, y1: 0 }]
        const [twoName, twoBox] = boxes[b] ?? ['', { x0: 0, x1: 0, y0: 0, y1: 0 }]
        if (boxesOverlap(oneBox, twoBox)) broken.push(`${nameOf(scene.turn)}: ${oneName} over ${twoName}`)
      }
    }
  }
  expect(broken, 'FR-109 (MUST): 名称・担当者・進捗・進捗マーカー・再開アイコンを互いに重ねず').toEqual([])
})

test('FR-108: nothing the frame did not draw answers the pointer', () => {
  const broken: string[] = []
  for (const scene of scenes()) {
    const allowed = allowedIn(scene)
    for (const row of answeredIn(scene)) {
      if (!allowed.has(row)) broken.push(`${nameOf(scene.turn)}: ${row} (${FAMILY_BY_ROW.get(row) ?? '?'}) answered`)
    }
  }
  expect(broken, 'FR-108 (MUST): 描いていない編集対象を掴めないようにし').toEqual([])
})

test('every family the frame did draw answers somewhere, at both ends of the zoom', () => {
  const silent: string[] = []
  const wantedAt = new Map<number, Set<string>>(ZOOM_ENDS.map((zoom) => [zoom, new Set<string>()]))
  for (const scene of scenes()) {
    const answered = answeredIn(scene)
    const families = new Set([...answered].map((row) => FAMILY_BY_ROW.get(row) ?? '?'))
    for (const family of wantedIn(scene)) {
      wantedAt.get(scene.turn.zoomX)?.add(family)
      if (!families.has(family)) silent.push(`${nameOf(scene.turn)}: ${family} answered nowhere`)
    }
  }
  for (const zoom of ZOOM_ENDS) {
    expect(
      [...(wantedAt.get(zoom) ?? new Set<string>())].sort(),
      `premise: zoomX=${String(zoom)} draws more than one family inside the row area, or that end of the zoom asserts nothing`,
    ).not.toHaveLength(0)
    expect((wantedAt.get(zoom) ?? new Set<string>()).size).toBeGreaterThan(1)
  }
  expect(silent, 'FR-104 (MUST): 描いているそれぞれをポインタで指して操作できるようにすること').toEqual([])
})

test('control: a turn that hides everything leaves no grab area allowed', () => {
  const blind = scenes().find(
    (scene) =>
      !scene.turn.planVisible && !scene.turn.actualVisible && !scene.turn.progressMarkerVisible && scene.drawn !== null,
  )
  expect(blind, 'the sweep holds a drawn turn with every display off').toBeDefined()
  expect([...allowedIn(blind!)], 'FR-108 (MUST)').toEqual([])
  const seeing = scenes().find(
    (scene) =>
      scene.turn.planVisible && scene.turn.actualVisible && scene.turn.progressMarkerVisible && scene.drawn !== null,
  )
  expect(
    [...allowedIn(seeing!)].length,
    'and a turn with every display on allows the whole of table T-266',
  ).toBeGreaterThan(0)
})

// see L-2, FR-108
test('a Task the task LOD drops answers nowhere at all', () => {
  const dropped = scenes().filter((scene) => scene.drawn === null)
  expect(dropped.length, 'L-2 drops narrow Tasks, so the low end of the zoom has some').toBeGreaterThan(0)
  expect(dropped.length, 'and it does not drop every turn').toBeLessThan(TURNS.length)
  const answering = dropped.flatMap((scene) => [...answeredIn(scene)].map((row) => `${nameOf(scene.turn)}: ${row}`))
  expect(answering, 'FR-108 (MUST): LOD で描かないタスク（表 T-005a）').toEqual([])
})
