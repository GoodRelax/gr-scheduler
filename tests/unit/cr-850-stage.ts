// CR-850 (spec-only) stage: one task in the first of two task groups, the scenes named after the rows of table T-378.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, vi } from 'vitest'

import {
  type HumanInput,
  type InputModifiers,
  type PointerInput,
  type PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import { dualCursorReadoutOf, guideCursorLabelOf } from '../../src/adapter/screen-renderer/tooltips'
import type {
  PropertiesPanel,
  PropertyField,
  ScreenPart,
  ScreenSurface,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { instantOf, type Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, timeAxisOf, xOfInstant } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from '../contract/spec-table'

export const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: the column headings of the settings tables are Japanese.
const HEADING_DEFAULT_VALUE = '既定値'
const HEADING_DEFAULT = '既定'

const numberOf = (table: string, id: string, heading: string): number => {
  const numbers = bare(rowOf(table, id).by[heading] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`${id} of table ${table} does not hold one number`)
  return Number(numbers[0])
}

// WHY: every number below is read from the settings tables, never held here.
export const S_1 = numberOf('T-201', 'S-1', HEADING_DEFAULT_VALUE)
export const S_8 = numberOf('T-201', 'S-8', HEADING_DEFAULT_VALUE)
export const S_85 = numberOf('T-205', 'S-85', HEADING_DEFAULT)
export const S_577 = numberOf('T-205', 'S-577', HEADING_DEFAULT)
export const S_578 = numberOf('T-205', 'S-578', HEADING_DEFAULT)
export const S_208 = numberOf('T-206', 'S-208', HEADING_DEFAULT)

// WHY: WT-4 writes S-483 when Project.defaultFinishTime is empty; the time is read from table T-209, not held here.
export const DEFAULT_FINISH_TIME = ((): string => {
  const found = Object.values(rowOf('T-209', 'S-483').by)
    .map((cell) => bare(cell))
    .join(' ')
    .match(/\b\d{2}:\d{2}:\d{2}\b/)
  if (found === null) throw new Error('S-483 of table T-209 holds no hh:mm:ss')
  return found[0]
})()

const RULER_FONT = SETTINGS_DEFAULTS['rulerFontSizePx'] as number

// WHY: FR-017 judges pxPerDay / (rulerFontSizePx * ratio / S-8) and pxPerDay = S-1 * ratio * zoomX, so the ratio cancels.
export const zoomXFor = (judged: number): number => (judged * RULER_FONT) / (S_1 * S_8)

export const TASK_GROUP_A = '85000000-0000-4000-8000-00000000000a'
export const TASK_GROUP_B = '85000000-0000-4000-8000-00000000000b'
export const SOURCE = 1

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

export interface Scene {
  readonly start: string
  readonly finish: string
  readonly statusDate: string | null
  readonly isTimeOfDayVisible: boolean
  readonly zoomX: number
  readonly scrollDate: string
  readonly scrollDateFraction: number
}

// WHY: SG-2 below the half-hour width -- judged between S-577 and S-578. 2026-10-14 is a Wednesday.
export const HOUR_TIER: Scene = {
  start: '2026-10-14T09:00:00',
  finish: '2026-10-14T12:00:00',
  statusDate: '2026-10-14T12:00:00',
  isTimeOfDayVisible: true,
  zoomX: zoomXFor((S_577 + S_578) / 2),
  scrollDate: '2026-10-14',
  scrollDateFraction: 0.25,
}

// WHY: SG-2 on the half-hour dotted-grid width (S-578 and above), kept near S-578 to stay under the zoomX ceiling.
export const HALF_HOUR_TIER: Scene = { ...HOUR_TIER, zoomX: zoomXFor(S_578 * 1.3) }

// WHY: SG-1 while the time of day is shown -- the ruler has not reached the hour tier.
export const DAY_TIER_SHOWN: Scene = {
  ...HOUR_TIER,
  statusDate: `2026-10-14T${DEFAULT_FINISH_TIME}`,
  zoomX: zoomXFor((S_85 + S_577) / 2),
  scrollDate: '2026-10-12',
  scrollDateFraction: 0,
}

// WHY: SG-1 because the time of day is hidden (FR-158).
export const TIME_HIDDEN: Scene = { ...DAY_TIER_SHOWN, isTimeOfDayVisible: false }

export function fixtureDocument(scene: Scene): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  const source = {
    uid: SOURCE,
    parentTaskUid: null,
    wbsOrder: 1,
    name: 'Source',
    start: scene.start,
    finish: scene.finish,
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
  }
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: {
        ...(schedule['project'] as Record<string, unknown>),
        startDate: '2026-10-12T08:00:00',
        statusDate: scene.statusDate,
        defaultStartTime: null,
        defaultFinishTime: null,
        uidHighWaterMark: 100,
      },
      calendars: schedule['calendars'],
      tasks: [source],
      resources: [],
      assignments: [],
      taskGroups: [TASK_GROUP_A, TASK_GROUP_B].map((id, order) => ({
        id,
        parentId: null,
        name: `task group ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [{ taskUid: SOURCE, taskGroupId: TASK_GROUP_A }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      isTimeOfDayVisible: scene.isTimeOfDayVisible,
      // WHY: the progress marker (GA-18) of an unstarted task would sit on the bar.
      isProgressMarkerVisible: false,
      zoomX: scene.zoomX,
      scrollDate: scene.scrollDate,
      scrollDateFraction: scene.scrollDateFraction,
      scrollTaskGroupId: TASK_GROUP_A,
      scrollTaskGroupFraction: 0,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

export const settingsOf = (scene: Scene): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, isTimeOfDayVisible: scene.isTimeOfDayVisible, zoomX: scene.zoomX }) as unknown as DocumentSettings

// WHY: the frame loop and the session read the wall clock for today; it is pinned to a day of the scenes.
export function pinClock(): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 8, 0, 0))
}

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

export function unpinClock(): void {
  vi.useRealTimers()
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
}

// see T-109
const surfaceOfEntrance = (entry: string): string => bare(rowOf('T-109', entry).cells[0] ?? '')

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

export interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  press(entry: string): void
  tasks(): readonly Task[]
}

export function stage(scene: Scene): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let aimed: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => aimed,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(scene), SCREEN, wiring, undefined, () => undefined)
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    send,
    press: (entry) => {
      aimed = { part: surfaceOfEntrance(entry), entry, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointer('down', { x: 600, y: 20 }))
      send(pointer('up', { x: 600, y: 20 }))
      aimed = null
    },
    tasks: () => loop.document().schedule.tasks,
  }
}

export const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
export const ALT: Partial<InputModifiers> = { alt: true }
export const PLAIN: Partial<InputModifiers> = {}

export const pointer = (phase: PointerPhase, at: Point, modifiers: Partial<InputModifiers> = {}): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
  clickCount: 1,
})

export const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

function boxOf(bar: BarGeometry | null, what: string): ScreenRect {
  if (bar === null) throw new Error(`${what} was not drawn`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export const planBox = (loop: FrameLoop, uid: number = SOURCE): ScreenRect => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not drawn`)
  return boxOf(found.plan, `the plan of Task ${uid}`)
}

export const hitAt = (loop: FrameLoop, at: Point): Hit | null =>
  itemAtPointer(frameOf(loop).geometry, at.x, at.y, grabSizesOf())

export const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

export const pxOfMinutes = (loop: FrameLoop, minutes: number): number => (minutes / 1440) * pxPerDay(loop)

export function bandOf(loop: FrameLoop, taskGroupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as unknown as { taskGroups: readonly Record<string, unknown>[] }).taskGroups.find(
    (one) => one['taskGroupId'] === taskGroupId,
  )
  if (found === undefined) throw new Error(`the frame drew no band for task group ${taskGroupId}`)
  return { y: found['y'] as number, height: found['height'] as number }
}

export function statusLineOf(loop: FrameLoop): { readonly x: number } {
  const found = frameOf(loop).geometry.statusLine as unknown as { readonly x: number } | null
  if (found === null) throw new Error('the frame drew no status line')
  return found
}

export const taskOf = (built: Stage, uid: number = SOURCE): Task => {
  const found = built.tasks().find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`no task ${uid}`)
  return found
}

export const statusDateOf = (built: Stage): string | null =>
  built.loop.document().schedule.project.statusDate as unknown as string | null

// WHY: GA-2 is pressed on the right edge itself, so the pressed point and the grabbed end are the same x.
export function planFinishGrab(built: Stage): Point {
  const box = planBox(built.loop)
  const at = { x: box.x + box.width, y: box.y + box.height / 2 }
  expect(hitAt(built.loop, at)?.grab, 'premise: the right edge of the plan bar is GA-2').toBe('GA-2')
  return at
}

// WHY: task group B holds no bar, so nothing outranks GR-16 there.
export function statusLineGrab(built: Stage): Point {
  const band = bandOf(built.loop, TASK_GROUP_B)
  const at = { x: statusLineOf(built.loop).x, y: band.y + band.height / 2 }
  expect(hitAt(built.loop, at)?.item.kind, 'premise: the point is on the status line').toBe('statusLine')
  return at
}

// WHY: the intermediate move carries the release-time keys, as a hand holding the key does.
export function dragBy(
  built: Stage,
  from: Point,
  byX: number,
  pressed: Partial<InputModifiers> = PLAIN,
  released: Partial<InputModifiers> = pressed,
): void {
  expect(Math.abs(byX), 'premise: the pull is past the drag threshold S-208').toBeGreaterThan(S_208)
  const to = { x: from.x + byX, y: from.y }
  built.send(pointer('move', from, pressed))
  built.send(pointer('down', from, pressed))
  built.send(pointer('move', to, released))
  built.send(pointer('up', to, released))
}

// see FR-072
export function settingsPanel(document: Document): PropertiesPanel {
  const session = {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: 'ja',
      helpLanguage: 'ja',
      propertiesPanelContentState: { kind: 'documentSettingsDisplayed' },
    },
  } as unknown as ScreenSession
  const readings = {
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: null,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: document.schedule.project.themeHue,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: 'documentSettings',
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  } as unknown as ScreenViewReadings
  const panel = propertiesPanelFromSelection(document.schedule, document.documentSettings, emptySelection(), session, readings)
  if (panel === null || panel.showing !== 'documentSettings') throw new Error('premise: the document settings panel is drawn')
  return panel
}

export const oneFieldOf = (panel: PropertiesPanel, row: string): PropertyField => {
  const found = panel.fields.filter((one) => one.row === row)
  if (found.length !== 1) throw new Error(`expected one field of row ${row}, got ${found.length}`)
  return found[0] as PropertyField
}

const CURSOR_SCREEN: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

const readingsAt = (at: Point | null): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: at,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: 214,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

export type Placed = { readonly cursorADate: string; readonly cursorBDate: string } | null

// see CU-3, DC-3
export function cursorScene(scene: Scene) {
  const document = fixtureDocument(scene)
  const settings = document.documentSettings as DocumentSettings
  const regions = regionsFromScreen(CURSOR_SCREEN, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const axis = timeAxisOf(settings, regions)
  const middleY = regions.taskGroupArea.y + regions.taskGroupArea.height / 2
  const pointAt = (text: string): Point => ({ x: xOfInstant(axis, instantOf(text) as number), y: middleY })
  const guideSession = {
    ...emptyScreenSession,
    screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja', guideCursorMode: 'single-vertical' },
  } as unknown as ScreenSession
  const label = (at: Point): string | null => guideCursorLabelOf(regions, settings, guideSession, readingsAt(at), [])?.text ?? null
  const readout = (following: 'placingCursorA' | 'placingCursorB', placed: Placed, at: Point): readonly string[] | null => {
    const session = {
      ...emptyScreenSession,
      screen: {
        ...emptyScreenSession.screen,
        screenLanguage: 'ja',
        helpLanguage: 'ja',
        dualCursorModeState: { kind: 'on', child: { kind: following } },
        dualCursor: placed,
      },
    } as unknown as ScreenSession
    return dualCursorReadoutOf(regions, settings, session, readingsAt(at))?.lines ?? null
  }
  return { document, settings, regions, layout, axis, pointAt, label, readout }
}
