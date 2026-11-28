// Contract tests: the scrollbar grip starts where the view is and follows the pointer while held.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake host patches a browser global and the sessions are loose shapes */

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

// Why: FR-052 read backwards: the gap between the Task Group Lanes and the Properties Panel
// is the lane plus canvasPadding, so these regions leave a lane of LANE_THICKNESS.
const LANE_THICKNESS = 10
const CANVAS_PADDING = 4
const TASK_GROUP_AREA = rect(200, 100, 800, 400)

const REGIONS: ScreenRegions = {
  appHeader: rect(0, 0, 1400, 40),
  taskGroupPanel: rect(20, 100, 180, 400),
  timeRuler: rect(200, 60, 800, 40),
  taskGroupArea: TASK_GROUP_AREA,
  scheduleCanvas: rect(20, 60, 1180, 440),
  propertiesPanel: rect(
    TASK_GROUP_AREA.x + TASK_GROUP_AREA.width + LANE_THICKNESS + CANVAS_PADDING,
    100,
    186,
    400,
  ),
}

const SETTINGS = { canvasPadding: CANVAS_PADDING } as unknown as DocumentSettings
const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, fullScreenModeState: { kind: 'normal' } },
}

const sessionWith = (extent: {
  contentWidth: number
  contentHeight: number
  visibleHeight: number
  offsetX?: number
  offsetY?: number
}): any => ({
  notices: [],
  mergeCandidates: [],
  droppedTaskNames: [],
  missingTaskNames: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: extent,
})

const barOf = (readings: any, axis: 'horizontal' | 'vertical') => {
  const found = screenFrameFromRegions(REGIONS, SETTINGS, ROOT, readings).scrollbars.find(
    (one) => one.axis === axis,
  )
  if (found === undefined) throw new Error(`SC-4 of table T-031 draws no ${axis} bar`)
  return found
}

// Spec: T-023d, GR-21, SC-4
describe('DFC-298 -- GR-21 is 帯の中の、いま見えている範囲を表す区間, so it has a start', () => {
  // Why: four times the lane, so a quarter is on screen and the grip has room to travel.
  const WHOLE_WIDTH = TASK_GROUP_AREA.width * 4
  const WHOLE_HEIGHT = TASK_GROUP_AREA.height * 4

  it('lays the grip at the lane 1 corner while nothing has been scrolled', () => {
    const bar = barOf(
      sessionWith({
        contentWidth: WHOLE_WIDTH,
        contentHeight: WHOLE_HEIGHT,
        visibleHeight: TASK_GROUP_AREA.height,
        offsetX: 0,
        offsetY: 0,
      }),
      'horizontal',
    )
    expect(bar.thumb.x).toBe(bar.track.x)
  })

  it('moves the grip by the same fraction of the lane that the view has moved of the whole', () => {
    const offsetX = WHOLE_WIDTH / 4
    const offsetY = WHOLE_HEIGHT / 4
    const session = sessionWith({
      contentWidth: WHOLE_WIDTH,
      contentHeight: WHOLE_HEIGHT,
      visibleHeight: TASK_GROUP_AREA.height,
      offsetX,
      offsetY,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')
    expect(sideways.thumb.x - sideways.track.x).toBeCloseTo(sideways.track.width / 4, 6)
    expect(downwards.thumb.y - downwards.track.y).toBeCloseTo(downwards.track.height / 4, 6)
  })

  it('never lets the grip hang out of the lane it has to be grabbed in', () => {
    const session = sessionWith({
      contentWidth: WHOLE_WIDTH,
      contentHeight: WHOLE_HEIGHT,
      visibleHeight: TASK_GROUP_AREA.height,
      offsetX: WHOLE_WIDTH - TASK_GROUP_AREA.width,
      offsetY: WHOLE_HEIGHT - TASK_GROUP_AREA.height,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')
    expect(sideways.thumb.x).toBeGreaterThanOrEqual(sideways.track.x)
    expect(sideways.thumb.x + sideways.thumb.width).toBeCloseTo(
      sideways.track.x + sideways.track.width,
      6,
    )
    expect(downwards.thumb.y + downwards.thumb.height).toBeLessThanOrEqual(
      downwards.track.y + downwards.track.height + 1e-6,
    )
  })

  it('leaves the grip at the corner for a session that carries no offset at all', () => {
    // Why: the offset pair is optional, and absent must read as not scrolled;
    // a build that read it otherwise would move the grip on no place at all.
    const bar = barOf(
      sessionWith({
        contentWidth: WHOLE_WIDTH,
        contentHeight: WHOLE_HEIGHT,
        visibleHeight: TASK_GROUP_AREA.height,
      }),
      'horizontal',
    )
    expect(bar.thumb.x).toBe(bar.track.x)
  })
})

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

// Spec: BT-4, FR-027
const fixtureDocument = (): Document =>
  JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as unknown as Document

// Spec: OP-10, T-024a, FR-055, S-77, S-78
// Why: at the fit the whole schedule is in view and the grip has no room to run; a scroll keeps the fit's zoom (DFC-2410).
const placedDocument = (): Document => {
  const held = fixtureDocument() as any
  const first = held.schedule.taskGroups.find((one: any) => one.parentId === null && one.order === 0)
  held.documentSettings = {
    ...held.documentSettings,
    scrollDate: `${String(held.schedule.project.startDate).slice(0, 10)}T00:00:00`,
    scrollTaskGroupId: first.id,
  }
  return held as Document
}

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 40,
  // Why: not zero; a lane of no thickness is one no press could land on.
  scrollbarThickness: 12,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

// Summary: host stands in for requestAnimationFrame, which node lacks, and runs the queued frames when asked.
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
  }
}

interface Pane {
  readonly wiring: ScreenWiring
  last(): ScreenView
}

function pane(): Pane {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    // Why: the side that drew a part says where it is, so the lanes are read from the
    // ScreenFrame handed over; this fake never decides where a lane stands.
    readScreenPartAt: (x, y): ScreenPart | null => {
      const view = views[views.length - 1]
      if (view === undefined) return null
      for (const bar of view.frame.scrollbars) {
        const lane = bar.track
        const inside =
          x >= lane.x && x < lane.x + lane.width && y >= lane.y && y < lane.y + lane.height
        if (inside) {
          return {
            part: 'Scrollbars',
            entry: null,
            format: null,
            taskGroupId: null,
            resourceUid: null,
            dividerPanel: null,
            noticeDismissKey: null,
            scrollbarAxis: bar.axis,
          }
        }
      }
      return null
    },
  }
  return {
    wiring: { surface, language: 'en' },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  readonly pane: Pane
  send(input: HumanInput): void
}

function stage(document: Document = fixtureDocument()): Stage {
  const drawn = pane()
  const pen = host()
  const loop = frameLoop(pen.surface as any, document, SCREEN, drawn.wiring)
  pen.runAnimationFrames()
  return {
    loop,
    pane: drawn,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
  }
}

// Spec: FR-051, S-77, S-177, S-78, S-176
const placeOf = (loop: FrameLoop): string => {
  const settings = (loop.document() as any).documentSettings
  return JSON.stringify([
    settings.scrollDate,
    settings.scrollDateFraction,
    settings.scrollTaskGroupId,
    settings.scrollTaskGroupFraction,
  ])
}

function gripCenterOf(shown: Pane, axis: 'horizontal' | 'vertical'): { x: number; y: number } {
  const bar = shown.last().frame.scrollbars.find((one) => one.axis === axis)
  if (bar === undefined) throw new Error(`SC-4 of table T-031 draws no ${axis} bar`)
  return { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
}

// Spec: T-023d, GR-21, AG-9, UN-8, FR-051, FR-076
describe('DFC-420 -- table T-023d has GR-21 follow the pointer while it is held', () => {
  const TRAVEL = 60

  it.each(['horizontal', 'vertical'] as const)(
    'moves the display position on the MOVE and not only on the release (%s)',
    (axis) => {
      const one = stage()
      const from = gripCenterOf(one.pane, axis)
      one.send(pointer('down', from.x, from.y))
      const atPress = placeOf(one.loop)
      one.send(
        pointer(
          'move',
          axis === 'horizontal' ? from.x + TRAVEL : from.x,
          axis === 'horizontal' ? from.y : from.y + TRAVEL,
        ),
      )
      // Why: only that the place moved is asserted; no spec row fixes how far one pixel
      // of pointer carries the picture.
      expect(placeOf(one.loop)).not.toBe(atPress)
    },
  )

  it.each(['horizontal', 'vertical'] as const)(
    'keeps the grip under the pointer, piece after piece (%s)',
    (axis) => {
      // Why: two moves, red both ways: no follow leaves the grip still (0, not 60), and a follow
      // that does not record what it applied measures from the press (180, not 120).
      const along = (point: { x: number; y: number }): number =>
        axis === 'horizontal' ? point.x : point.y
      const to = (from: { x: number; y: number }, by: number) =>
        axis === 'horizontal'
          ? pointer('move', from.x + by, from.y)
          : pointer('move', from.x, from.y + by)

      const one = stage(placedDocument())
      // Why: a warm-up drag first, so the measured drag is never the first write after the open.
      const warm = gripCenterOf(one.pane, axis)
      one.send(pointer('down', warm.x, warm.y))
      one.send(to(warm, TRAVEL))
      one.send(
        axis === 'horizontal'
          ? pointer('up', warm.x + TRAVEL, warm.y)
          : pointer('up', warm.x, warm.y + TRAVEL),
      )

      const from = gripCenterOf(one.pane, axis)
      const began = along(from)
      one.send(pointer('down', from.x, from.y))
      one.send(to(from, TRAVEL))
      // Why: one pixel of slack is the drawn rectangle's rounding: the place is kept in days
      // and task groups and comes back as a fraction of one.
      expect(Math.abs(along(gripCenterOf(one.pane, axis)) - began - TRAVEL)).toBeLessThan(1)
      one.send(to(from, TRAVEL * 2))
      expect(Math.abs(along(gripCenterOf(one.pane, axis)) - began - TRAVEL * 2)).toBeLessThan(1)
    },
  )

  it('raises no telling for a write it made while the grip was held', () => {
    // Why: each refused mid-drag write raised a telling (FR-076), which is how the FR-102
    // record showed the defect; this case pins that symptom.
    const one = stage()
    const from = gripCenterOf(one.pane, 'horizontal')
    one.send(pointer('down', from.x, from.y))
    one.send(pointer('move', from.x + TRAVEL, from.y))
    expect(one.pane.last().notices.length).toBe(0)
  })
})
