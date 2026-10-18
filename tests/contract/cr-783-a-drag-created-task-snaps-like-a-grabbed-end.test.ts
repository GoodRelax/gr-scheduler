// CR-783 spec-only cases: FR-001 table T-239 TC-6 / TC-10 -- a drag-created task reads its ends in the T-378 unit, like a grabbed end.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressedRowOf,
  type InputAction,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { screenEventFromInput } from '../../src/adapter/input-command-translator/screen-state-input'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { snapMinutesOf, xFromDay } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { advanceScreenSession, emptyScreenSession, type ScreenValues } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { bare, specTable } from './spec-table'

// WHY: the TC-6 clause is copied verbatim, so that the check that counts held MUST clauses finds it in this file's bytes.
const TC_6_THE_DRAWN_SPAN_IS_READ_AS_SNAPPED_INSTANTS =
  '⭐ 引いた期間は、押した点を開始、離した点を終了とし（左へ引けば入れ替える）、`FR-103` の 表 T-378 の単位で寄せた瞬間として読むこと（MUST）'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: the column headings of the spec tables are Japanese; they are written as escapes to keep the logic ASCII.
const HEADING_DEFAULT_VALUE = '既定値'
const HEADING_DEFAULT = '既定'
const HEADING_VALUE = '値'
const HEADING_ARM = '構え'
const HEADING_WHAT = '何の入口か'
const HEADING_SURFACE = '面'

const numberOf = (table: string, id: string, heading: string): number => {
  const numbers = bare(rowOf(table, id).by[heading] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`${id} of table ${table} does not hold one number`)
  return Number(numbers[0])
}

// WHY: S-482 / S-483 hold the default start / finish times of T-350, written hh:mm:ss.
const timeOf = (table: string, id: string): string => {
  const found = /\d{2}:\d{2}:\d{2}/.exec(bare(rowOf(table, id).by[HEADING_VALUE] ?? ''))
  if (found === null) throw new Error(`${id} of table ${table} holds no time`)
  return found[0]
}

const S_1 = numberOf('T-201', 'S-1', HEADING_DEFAULT_VALUE)
const S_8 = numberOf('T-201', 'S-8', HEADING_DEFAULT_VALUE)
const S_577 = numberOf('T-205', 'S-577', HEADING_DEFAULT)
const S_578 = numberOf('T-205', 'S-578', HEADING_DEFAULT)
const S_208 = numberOf('T-206', 'S-208', HEADING_DEFAULT)
const DEFAULT_START_TIME = timeOf('T-209', 'S-482')
const DEFAULT_FINISH_TIME = timeOf('T-209', 'S-483')

// see T-109, T-023b
// WHY: the entrance that arms one shape row is read from the table, never named here.
interface Entrance {
  readonly row: string
  readonly surface: string
}

function entranceArming(arm: string, shapeRow: string | null): Entrance {
  const found = specTable('T-109').rows.filter(
    (row) => bare(row.by[HEADING_ARM] ?? '') === arm && (shapeRow === null || bare(row.by[HEADING_WHAT] ?? '') === shapeRow),
  )
  const first = found[0]
  if (first === undefined || (shapeRow !== null && found.length !== 1)) {
    throw new Error(`table T-109 arms ${arm} ${shapeRow ?? ''} from ${found.length} entrances`)
  }
  return { row: first.id, surface: bare(first.by[HEADING_SURFACE] ?? '') }
}

const RECTANGLE = entranceArming('AR-2', 'SH-1')
const MILESTONE = entranceArming('AR-3', null)

const shapeSpelling = (rowId: string): string =>
  bare(rowOf('T-012', rowId).by[HEADING_VALUE] ?? '').replace(/'/g, '')

const TASK_GROUP_A = '78300000-0000-4000-8000-00000000000a'
const TASK_GROUP_B = '78300000-0000-4000-8000-00000000000b'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const RULER_FONT = SETTINGS_DEFAULTS['rulerFontSizePx'] as number

// WHY: FR-017 judges pxPerDay / (rulerFontSizePx * ratio / S-8) and pxPerDay = S-1 * ratio * zoomX, so the ratio cancels.
const zoomXFor = (judged: number): number => (judged * RULER_FONT) / (S_1 * S_8)

interface Scene {
  readonly isTimeOfDayVisible: boolean
  readonly zoomX: number
}

function fixtureDocument(scene: Scene): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: {
        ...(schedule['project'] as Record<string, unknown>),
        startDate: '2026-10-12T08:00:00',
        statusDate: null,
        uidHighWaterMark: 100,
      },
      calendars: schedule['calendars'],
      tasks: [],
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
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      isTimeOfDayVisible: scene.isTimeOfDayVisible,
      zoomX: scene.zoomX,
      scrollDate: '2026-10-14',
      scrollDateFraction: 0.25,
      scrollTaskGroupId: TASK_GROUP_A,
      scrollTaskGroupFraction: 0,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

// WHY: SG-2 -- judged between S-577 and S-578.
const HOUR_TIER: Scene = { isTimeOfDayVisible: true, zoomX: zoomXFor((S_577 + S_578) / 2) }
// WHY: SG-3 -- judged over S-578, kept under the FR-016 zoomX ceiling by staying near S-578.
const HALF_HOUR_TIER: Scene = { isTimeOfDayVisible: true, zoomX: zoomXFor(S_578 * 1.3) }
// WHY: SG-1 by hiding the time of day.
const TIME_HIDDEN: Scene = { isTimeOfDayVisible: false, zoomX: HOUR_TIER.zoomX }
// WHY: SG-1 by a scale under the hour tier while the time of day is shown.
const BELOW_HOUR_TIER: Scene = { isTimeOfDayVisible: true, zoomX: zoomXFor(S_577 * 0.5) }

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

function loopOf(scene: Scene): FrameLoop {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(scene), SCREEN, wiring, undefined, () => undefined)
  for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
    for (const callback of waiting.splice(0, waiting.length)) callback(turn)
  }
  return loop
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const PLAIN: Partial<InputModifiers> = {}
const ALT: Partial<InputModifiers> = { alt: true }

const pointer = (phase: PointerPhase, at: { x: number; y: number }, modifiers: Partial<InputModifiers> = {}): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
  clickCount: 1,
})

const partOf = (entrance: Entrance): ScreenPart =>
  ({
    part: entrance.surface,
    entry: entrance.row,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as unknown as ScreenPart

const screenAfter = (screen: ScreenValues, event: ReturnType<typeof screenEventFromInput>): ScreenValues =>
  event === null ? screen : advanceScreenSession({ ...emptyScreenSession, screen }, event).state.screen

function contextOf(loop: FrameLoop, screen: ScreenValues): InputContext {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return {
    document: loop.document(),
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen,
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-10-01',
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
}

// WHY: the palette entrance is pressed as the shell presses it, so the arm stands as it would for a person.
function armedBy(loop: FrameLoop, entrance: Entrance): ScreenValues {
  const at = { x: 40, y: 200 }
  const down = pointer('down', at)
  const bareContext = contextOf(loop, emptyScreenSession.screen)
  const press: PointerPress = {
    at: down,
    hit: null,
    on: partOf(entrance),
    pressRow: pressedRowOf({ at: down, hit: null }, { screen: bareContext.screen, dualCursorFollowing: null, selection: emptySelection() }),
  }
  const atPress: InputContext = { ...bareContext, pressed: press }
  const afterDown = screenAfter(bareContext.screen, screenEventFromInput(down, atPress))
  return screenAfter(afterDown, screenEventFromInput(pointer('up', at), { ...atPress, screen: afterDown }))
}

const MINUTES_PER_DAY = 1440
const DAY = { year: 2026, month: 10, day: 14 }

// WHY: an x for a wall-clock minute of 2026-10-14, read off the exported day-to-x map so no pixel is held here.
const xAt = (loop: FrameLoop, minuteOfDay: number): number => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return xFromDay(values.layout, DAY) + (minuteOfDay / MINUTES_PER_DAY) * values.layout.pxPerDay
}

const at = (hour: number, minute: number): number => hour * 60 + minute

const groupBY = (loop: FrameLoop): number => {
  const found = loop.current()?.layout.taskGroups.find((one) => one.taskGroupId === TASK_GROUP_B)
  if (found === undefined) throw new Error('the frame drew no task group B')
  return found.y + found.height / 2
}

interface Created {
  readonly shapeKind: string
  readonly start: string
  readonly finish: string
  readonly taskGroupId: string
}

function creations(action: InputAction | null): readonly Created[] {
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat().filter((one) => (one as { kind: string }).kind === 'createTask') as unknown as readonly Created[]
}

interface Drag {
  readonly scene: Scene
  readonly entrance: Entrance
  readonly pressMinute: number
  readonly releaseMinute: number
  readonly pressDay?: number
  readonly releaseDay?: number
  readonly pressed?: Partial<InputModifiers>
  readonly released?: Partial<InputModifiers>
}

// WHY: the release is read through the translator against the press it got, the way the shell runs both.
function createdByDrag(drag: Drag): readonly Created[] {
  const loop = loopOf(drag.scene)
  const armed = armedBy(loop, drag.entrance)
  const y = groupBY(loop)
  const pressAt = { x: xAt(loop, drag.pressMinute + (drag.pressDay ?? 0) * MINUTES_PER_DAY), y }
  const releaseAt = { x: xAt(loop, drag.releaseMinute + (drag.releaseDay ?? 0) * MINUTES_PER_DAY), y }
  const down = pointer('down', pressAt, drag.pressed)
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  const hit = itemAtPointer(values.geometry, pressAt.x, pressAt.y, grabSizesOf())
  const base = contextOf(loop, armed)
  const press: PointerPress = { at: down, hit, on: null, pressRow: pressedRowOf({ at: down, hit }, base) }
  const atPress: InputContext = { ...base, pressed: press }
  const afterDown = screenAfter(armed, screenEventFromInput(down, atPress))
  const up = pointer('up', releaseAt, drag.released)
  return creations(commandFromInput(up, { ...atPress, screen: afterDown }).action)
}

const theOne = (made: readonly Created[]): Created => {
  expect(made.length, 'the drag planned one createTask').toBe(1)
  return made[0] as Created
}

const spanOf = (made: readonly Created[]): { start: string; finish: string } => {
  const one = theOne(made)
  return { start: one.start, finish: one.finish }
}

const settingsOf = (scene: Scene): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, isTimeOfDayVisible: scene.isTimeOfDayVisible, zoomX: scene.zoomX }) as unknown as DocumentSettings

describe('premise: the scenes sit on the T-378 rows they are named after', () => {
  it.each([
    ['SG-2 hour tier', HOUR_TIER, 60],
    ['SG-3 30-minute tier', HALF_HOUR_TIER, 30],
    ['SG-1 time hidden', TIME_HIDDEN, MINUTES_PER_DAY],
    ['SG-1 time shown below the hour tier', BELOW_HOUR_TIER, MINUTES_PER_DAY],
  ])('%s', (_name, scene, minutes) => {
    const loop = loopOf(scene)
    expect(snapMinutesOf(loop.current()?.layout.pxPerDay as number, settingsOf(scene), false)).toBe(minutes)
  })

  it('the bar shape and the milestone are armed by an entrance the spec names', () => {
    expect(RECTANGLE.surface).toBe('Command Palette')
    expect(armedBy(loopOf(HOUR_TIER), RECTANGLE).armModeState.kind).toBe('taskShapeArmed')
    expect(armedBy(loopOf(HOUR_TIER), MILESTONE).armModeState.kind).toBe('milestoneShapeArmed')
  })
})

describe(`FR-001 / T-239 TC-6 -- ${TC_6_THE_DRAWN_SPAN_IS_READ_AS_SNAPPED_INSTANTS}`, () => {
  const bar = (drag: Omit<Drag, 'entrance'>): Drag => ({ ...drag, entrance: RECTANGLE })

  describe('(a) time shown, hour tier (SG-2)', () => {
    it('a drag from about 9:10 to about 11:40 creates 09:00 to 12:00', () => {
      const made = createdByDrag(bar({ scene: HOUR_TIER, pressMinute: at(9, 10), releaseMinute: at(11, 40) }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T09:00:00', finish: '2026-10-14T12:00:00' })
      expect(theOne(made).shapeKind).toBe(shapeSpelling('SH-1'))
      expect(theOne(made).taskGroupId, 'the task group pressed in').toBe(TASK_GROUP_B)
    })
  })

  describe('(b) time shown, 30-minute tier (SG-3)', () => {
    it('the same drag creates 09:00 to 11:30', () => {
      const made = createdByDrag(bar({ scene: HALF_HOUR_TIER, pressMinute: at(9, 10), releaseMinute: at(11, 40) }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T09:00:00', finish: '2026-10-14T11:30:00' })
    })
  })

  describe('(c) Alt is read at release (SG-4)', () => {
    it('pressed without Alt and released with Alt creates 09:10 to 11:40', () => {
      const made = createdByDrag(bar({ scene: HOUR_TIER, pressMinute: at(9, 10), releaseMinute: at(11, 40), released: ALT }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T09:10:00', finish: '2026-10-14T11:40:00' })
    })

    it('pressed with Alt and released without Alt is not a 1-minute span', () => {
      const made = createdByDrag(bar({ scene: HOUR_TIER, pressMinute: at(9, 10), releaseMinute: at(11, 40), pressed: ALT }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T09:00:00', finish: '2026-10-14T12:00:00' })
    })

    it('pressed and released with Alt creates the 1-minute span at the 30-minute tier too', () => {
      const made = createdByDrag(
        bar({ scene: HALF_HOUR_TIER, pressMinute: at(9, 10), releaseMinute: at(11, 40), pressed: ALT, released: ALT }),
      )
      expect(spanOf(made)).toEqual({ start: '2026-10-14T09:10:00', finish: '2026-10-14T11:40:00' })
    })
  })

  describe('(d) a right-to-left drag gives the same task as a left-to-right one', () => {
    it.each([
      ['hour tier', HOUR_TIER, PLAIN],
      ['30-minute tier', HALF_HOUR_TIER, PLAIN],
      ['1-minute (Alt at release)', HOUR_TIER, ALT],
    ])('%s', (_name, scene, released) => {
      const rightward = createdByDrag(bar({ scene, pressMinute: at(9, 10), releaseMinute: at(11, 40), released }))
      const leftward = createdByDrag(bar({ scene, pressMinute: at(11, 40), releaseMinute: at(9, 10), released }))
      expect(spanOf(leftward)).toEqual(spanOf(rightward))
    })
  })

  describe('(e) two ends that snap to the same instant span one unit in the pulled direction', () => {
    it('hour tier, rightward: start to start plus one hour', () => {
      const made = createdByDrag(bar({ scene: HOUR_TIER, pressMinute: at(8, 35), releaseMinute: at(9, 25) }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T09:00:00', finish: '2026-10-14T10:00:00' })
    })

    it('hour tier, leftward: end minus one hour to end', () => {
      const made = createdByDrag(bar({ scene: HOUR_TIER, pressMinute: at(9, 25), releaseMinute: at(8, 35) }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T08:00:00', finish: '2026-10-14T09:00:00' })
    })

    it('30-minute tier, rightward: start to start plus 30 minutes', () => {
      const made = createdByDrag(bar({ scene: HALF_HOUR_TIER, pressMinute: at(8, 50), releaseMinute: at(9, 10) }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T09:00:00', finish: '2026-10-14T09:30:00' })
    })

    it('30-minute tier, leftward: end minus 30 minutes to end', () => {
      const made = createdByDrag(bar({ scene: HALF_HOUR_TIER, pressMinute: at(9, 10), releaseMinute: at(8, 50) }))
      expect(spanOf(made)).toEqual({ start: '2026-10-14T08:30:00', finish: '2026-10-14T09:00:00' })
    })

    it.each([
      ['hour tier', HOUR_TIER, at(8, 35), at(9, 25)],
      ['30-minute tier', HALF_HOUR_TIER, at(8, 50), at(9, 10)],
    ])('premise: the %s pull is past S-208', (_name, scene, from, to) => {
      const loop = loopOf(scene)
      expect(Math.abs(xAt(loop, to) - xAt(loop, from))).toBeGreaterThan(S_208)
    })
  })

  describe('(f) a day unit keeps the day reading with the T-350 default times', () => {
    it('time hidden: the pressed day starts at the default start, the released day ends at the default finish', () => {
      const made = createdByDrag(bar({ scene: TIME_HIDDEN, pressMinute: at(12, 0), releaseMinute: at(12, 0), releaseDay: 2 }))
      expect(spanOf(made)).toEqual({ start: `2026-10-14T${DEFAULT_START_TIME}`, finish: `2026-10-16T${DEFAULT_FINISH_TIME}` })
    })

    it('time hidden, right to left: the same task', () => {
      const made = createdByDrag(bar({ scene: TIME_HIDDEN, pressMinute: at(12, 0), pressDay: 2, releaseMinute: at(12, 0) }))
      expect(spanOf(made)).toEqual({ start: `2026-10-14T${DEFAULT_START_TIME}`, finish: `2026-10-16T${DEFAULT_FINISH_TIME}` })
    })

    it('time shown below the hour tier: the nearest day boundaries, start day to the day ending at the released boundary', () => {
      const made = createdByDrag(
        bar({ scene: BELOW_HOUR_TIER, pressMinute: at(8, 0), releaseMinute: at(16, 0), releaseDay: 2 }),
      )
      expect(spanOf(made)).toEqual({ start: `2026-10-14T${DEFAULT_START_TIME}`, finish: `2026-10-16T${DEFAULT_FINISH_TIME}` })
    })
  })
})

describe('FR-001 / T-239 TC-10 -- a milestone at a finer unit is placed at the snapped press instant', () => {
  const milestone = (drag: Omit<Drag, 'entrance'>): Drag => ({ ...drag, entrance: MILESTONE })

  it.each([
    ['hour tier (SG-2)', HOUR_TIER, '2026-10-14T10:00:00'],
    ['30-minute tier (SG-3)', HALF_HOUR_TIER, '2026-10-14T09:30:00'],
  ])('(g) dragged at the %s: start and finish are that instant', (_name, scene, instant) => {
    const made = createdByDrag(milestone({ scene, pressMinute: at(9, 40) - (scene === HALF_HOUR_TIER ? 20 : 0), releaseMinute: at(13, 20) }))
    expect(spanOf(made)).toEqual({ start: instant, finish: instant })
  })

  it('(g) a plain press at the hour tier lands where the dragged one does', () => {
    const pressed = createdByDrag(milestone({ scene: HOUR_TIER, pressMinute: at(9, 40), releaseMinute: at(9, 40) }))
    const dragged = createdByDrag(milestone({ scene: HOUR_TIER, pressMinute: at(9, 40), releaseMinute: at(13, 20) }))
    expect(spanOf(dragged)).toEqual(spanOf(pressed))
  })
})
