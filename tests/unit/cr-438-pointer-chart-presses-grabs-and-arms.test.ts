// CR-438 stage-5 spec-only cases for pointer input on the chart: UF-30, UF-95, UF-98, UF-99, UF-101 (T-023a, T-109, T-029a, T-245, T-246, T-266, T-270, T-023b, T-023c).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenValues,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-surface'
import {
  commandFromInput,
  pressRowOf,
  selectionFromInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const held = built[head]
    const group = (typeof held === 'object' && held !== null ? held : {}) as Record<string, unknown>
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...nestedFrom(SETTINGS_DEFAULTS),
    scrollDate: '2026-01-01',
    scrollGroupId: 'g1',
    stackDirection: 'down',
    rulerHeight: 48,
    rulerFont: 12,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1200, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const SCHEDULE = {
  project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 10 },
  calendars: [],
  tasks: [
    taskOf({ uid: 1, name: 'one', start: '2026-01-05', finish: '2026-01-09' }),
    taskOf({
      uid: 2,
      name: 'two',
      start: '2026-01-12',
      finish: '2026-01-16',
      dependencies: [{ predecessorUid: 1, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
    }),
  ],
  resources: [],
  assignments: [],
  taskGroups: Array.from({ length: 8 }, (_unused, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    height: null,
  })),
  taskGroupMembers: [
    { groupId: 'g1', taskUid: 1 },
    { groupId: 'g2', taskUid: 2 },
  ],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [
    {
      id: 'h1',
      startDate: '2026-01-05',
      endDate: '2026-01-09',
      topGroupId: 'g4',
      bottomGroupId: 'g4',
      strokeColor: null,
      cornerRadiusPx: null,
    },
  ],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const documentOf = (settings: DocumentSettings): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule: SCHEDULE,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const contextOf = (settingsPart: Record<string, unknown> = {}, part: Partial<InputContext> = {}): InputContext => {
  const settings = settingsOf(settingsPart)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(SCHEDULE, settings, regions)
  return {
    document: documentOf(settings),
    layout,
    geometry: geometryFromLayout(SCHEDULE, settings, layout, regions, emptySelection()),
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 1.1,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
    ...part,
  }
}

const BASE = contextOf()
const LAYOUT = BASE.layout

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (
  phase: PointerInput['phase'],
  x: number,
  y: number,
  part: Partial<PointerInput> = {},
): PointerInput => ({ kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODS, clickCount: 1, ...part })

const MS_PER_DAY = 86400000
const serialOf = (text: string): number =>
  Date.UTC(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10))) / MS_PER_DAY
const ORIGIN_SERIAL = serialOf('2026-01-01')
const leftXOfDay = (text: string): number => LAYOUT.originX + (serialOf(text) - ORIGIN_SERIAL) * LAYOUT.pxPerDay
const midXOfDay = (text: string): number => leftXOfDay(text) + LAYOUT.pxPerDay / 2

const rowOf = (groupId: string) => {
  const row = LAYOUT.rows.find((one) => one.groupId === groupId)
  if (row === undefined) throw new Error(`no row ${groupId} in the layout`)
  return row
}
const midYOfRow = (groupId: string): number => rowOf(groupId).y + rowOf(groupId).height / 2

type Armed = ScreenValues['armModeState']

const armedWith = (armed: Armed): ScreenValues => ({ ...emptyScreenSession.screen, armModeState: armed })

interface Gesture {
  readonly answer: TranslatedInput
  readonly selection: Selection
}

function gesture(
  from: PointerInput,
  to: PointerInput,
  hit: Hit | null,
  part: Partial<InputContext> = {},
  settingsPart: Record<string, unknown> = {},
  on: ScreenPart | null = null,
): Gesture {
  const idle = contextOf(settingsPart, part)
  const pressed = { at: from, hit, on, pressRow: pressRowOf({ at: from, hit }, idle) }
  const held = contextOf(settingsPart, { ...part, pressed })
  return { answer: commandFromInput(to, held), selection: selectionFromInput(to, held) }
}

function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const ofKind = (answer: TranslatedInput, kind: string): readonly Record<string, unknown>[] =>
  commandsOf(answer)
    .filter((one) => one.kind === kind)
    .map((one) => one as unknown as Record<string, unknown>)

const dayOf = (value: unknown): string => String(value).slice(0, 10)

const TASK_1_BODY: Hit = { item: { kind: 'task', taskUid: 1 }, grab: 'GA-9' }

describe('UF-30 table T-023a (FR-016) -- the first row that holds decides the press', () => {
  const at = pointerOf('down', midXOfDay('2026-01-06'), midYOfRow('g1'))

  it('PTD-1 before PTD-3: a Ctrl-only left press on a hit item is a pan', () => {
    expect(pressRowOf({ at: { ...at, modifiers: { ...NO_MODS, ctrl: true } }, hit: TASK_1_BODY }, BASE)).toBe('PTD-1')
  })

  it('PTD-1 / MK-12: Ctrl+Shift is not "Ctrl only", so the same press on nothing is PTD-5', () => {
    expect(pressRowOf({ at: { ...at, modifiers: { ...NO_MODS, ctrl: true, shift: true } }, hit: null }, BASE)).toBe('PTD-5')
  })

  it('PTD-2 before PTD-3: in the Dual Cursor mode a press on an item makes no hit', () => {
    expect(pressRowOf({ at, hit: TASK_1_BODY }, { ...BASE, dualCursorFollowing: 'date1' })).toBe('PTD-2')
  })

  it('PTD-3 before PTD-4: an armed shape does not win over a hit', () => {
    const armed = { ...BASE, screen: armedWith({ kind: 'taskShapeArmed', shapeKind: 'rectangle' }) }
    expect(pressRowOf({ at, hit: TASK_1_BODY }, armed)).toBe('PTD-3')
    expect(pressRowOf({ at, hit: null }, armed)).toBe('PTD-4')
  })

  it('PTD-4a: a dependency arm on nothing is PTD-4a, not PTD-4', () => {
    expect(pressRowOf({ at, hit: null }, { ...BASE, screen: armedWith({ kind: 'dependencyArmed' }) })).toBe('PTD-4a')
  })
})

const headerPart = (entry: string): ScreenPart =>
  ({
    part: 'App Header',
    entry,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as unknown as ScreenPart

describe('UF-30 table T-109 -- a pressed App Header entrance answers its row', () => {
  const header = BASE.regions.appHeader
  const down = pointerOf('down', header.x + 10, header.y + header.height / 2)
  const up = pointerOf('up', header.x + 10, header.y + header.height / 2)
  const press = (entry: string): TranslatedInput => gesture(down, up, null, {}, {}, headerPart(entry)).answer

  it('IC-5 undoes and IC-6 redoes (FR-031), the same operations as SK-6 / SK-7', () => {
    expect(press('IC-5').action?.kind).toBe('undoEdit')
    expect(press('IC-6').action?.kind).toBe('redoEdit')
  })

  it('IC-10 fits the whole schedule (FR-055, CM-71)', () => {
    expect(ofKind(press('IC-10'), 'fitScheduleToScreen')).toHaveLength(1)
  })
})

describe('UF-95 table T-029a (FR-082) -- a click in the Dual Cursor mode', () => {
  it('DC-2 (MUST): the following side is fixed where clicked, and the other side starts following', () => {
    const y = midYOfRow('g3')
    const { answer } = gesture(
      pointerOf('down', midXOfDay('2026-01-12'), y),
      pointerOf('up', midXOfDay('2026-01-12'), y),
      null,
      { dualCursorFollowing: 'date1' },
      { dualCursor: { date1: '2026-01-05', date2: '2026-01-20' } },
    )
    const action = answer.action
    expect(action?.kind).toBe('setDualCursorFollowing')
    if (action === null || action.kind !== 'setDualCursorFollowing') throw new Error('not a Dual Cursor answer')
    expect(action.following).toBe('date2')
    expect(action.placed?.kind).toBe('setDualCursor')
    if (action.placed === null || action.placed.kind !== 'setDualCursor') throw new Error('nothing placed')
    expect(dayOf(action.placed.date1)).toBe('2026-01-12')
    expect(dayOf(action.placed.date2)).toBe('2026-01-20')
  })
})

describe('UF-98 tables T-266 / T-270 / T-246 (FR-104, FR-107, FR-016) -- what a grab on the chart writes', () => {
  const DEPENDENCY_LINE: Hit = { item: { kind: 'dependency', predecessorUid: 1, successorUid: 2 }, grab: 'GA-19' }
  const lineAt = { x: midXOfDay('2026-01-10'), y: midYOfRow('g1') }
  const taskOneChosen = selectionWith(emptySelection(), { kind: 'task', uid: 1 })

  it('PE-12 / SL-2: pressing a dependency line and letting go chooses it in place of the old choice', () => {
    const { answer, selection } = gesture(
      pointerOf('down', lineAt.x, lineAt.y),
      pointerOf('up', lineAt.x, lineAt.y),
      DEPENDENCY_LINE,
      { selection: taskOneChosen },
    )
    expect(selection.items).toEqual([{ kind: 'dependency', successorUid: 2, ordinal: 0 }])
    expect(commandsOf(answer)).toEqual([])
  })

  it('PE-12: dragging a dependency line sideways writes nothing', () => {
    const { answer } = gesture(
      pointerOf('down', lineAt.x, lineAt.y),
      pointerOf('up', lineAt.x + 3 * LAYOUT.pxPerDay, lineAt.y),
      DEPENDENCY_LINE,
    )
    expect(commandsOf(answer)).toEqual([])
  })

  it('HB-4 (T-246): a right corner let go nearer a column boundary sets endDate to the day left of it', () => {
    const corner: Hit = {
      item: { kind: 'highlightBox', id: 'h1' },
      grab: 'GR-14',
      boxPart: { kind: 'corner', horizontal: 'right', vertical: 'top' },
    }
    const top = rowOf('g4').y + 1
    const { answer } = gesture(
      pointerOf('down', leftXOfDay('2026-01-10'), top),
      pointerOf('up', leftXOfDay('2026-01-12') + 0.3 * LAYOUT.pxPerDay, top),
      corner,
    )
    const written = ofKind(answer, 'setHighlightBoxRange')
    expect(written).toHaveLength(1)
    const range = written[0]!['range'] as Record<string, unknown>
    expect(written[0]!['id']).toBe('h1')
    expect(dayOf(range['startDate'])).toBe('2026-01-05')
    expect(dayOf(range['endDate'])).toBe('2026-01-11')
    expect([range['topGroupId'], range['bottomGroupId']]).toEqual(['g4', 'g4'])
  })
})

describe('UF-99 table T-023b (FR-019) -- an arm put to a drag on nothing', () => {
  it('AR-6: an armed highlight box surrounds the dragged range, rows by identifier', () => {
    const { answer } = gesture(
      pointerOf('down', midXOfDay('2026-01-20'), midYOfRow('g3')),
      pointerOf('up', midXOfDay('2026-01-24'), midYOfRow('g5')),
      null,
      { screen: armedWith({ kind: 'highlightBoxArmed' }) },
    )
    const created = ofKind(answer, 'createHighlightBox')
    expect(created).toHaveLength(1)
    expect(created[0]!['id']).toBe('highlight-box-minted-outside')
    const range = created[0]!['range'] as Record<string, unknown>
    expect([dayOf(range['startDate']), dayOf(range['endDate'])]).toEqual(['2026-01-20', '2026-01-24'])
    expect([range['topGroupId'], range['bottomGroupId']]).toEqual(['g3', 'g5'])
  })

  it('AR-1: the same drag with nothing armed creates nothing', () => {
    const { answer } = gesture(
      pointerOf('down', midXOfDay('2026-01-20'), midYOfRow('g3')),
      pointerOf('up', midXOfDay('2026-01-24'), midYOfRow('g5')),
      null,
    )
    expect(ofKind(answer, 'createHighlightBox')).toEqual([])
  })
})

describe('UF-101 table T-023c (FR-081) -- choosing with the pointer', () => {
  it('SL-2: a click on a second task replaces the first', () => {
    const at = { x: midXOfDay('2026-01-13'), y: midYOfRow('g2') }
    const { selection } = gesture(
      pointerOf('down', at.x, at.y),
      pointerOf('up', at.x, at.y),
      { item: { kind: 'task', taskUid: 2 }, grab: 'GA-9' },
      { selection: selectionWith(emptySelection(), { kind: 'task', uid: 1 }) },
    )
    expect(selection.items).toEqual([{ kind: 'task', uid: 2 }])
  })

  it('SL-6 / MK-11: a bare click on nothing lets the selection go', () => {
    const at = { x: midXOfDay('2026-01-25'), y: midYOfRow('g6') }
    const { selection } = gesture(pointerOf('down', at.x, at.y), pointerOf('up', at.x, at.y), null, {
      selection: selectionWith(emptySelection(), { kind: 'task', uid: 1 }),
    })
    expect(selection.items).toEqual([])
  })
})

describe('UF-30 table T-023a PTD-1 (FR-016) -- the pan follows the pointer', () => {
  it('PTD-1 / MK-7: a Ctrl drag three days to the right brings the left edge three days earlier', () => {
    const y = midYOfRow('g6')
    const from = pointerOf('down', midXOfDay('2026-01-20'), y, { modifiers: { ...NO_MODS, ctrl: true } })
    const to = pointerOf('up', from.x + 3 * LAYOUT.pxPerDay, y, { modifiers: { ...NO_MODS, ctrl: true } })
    const { answer } = gesture(from, to, null)
    const scrolled = ofKind(answer, 'setScrollPosition')
    expect(scrolled).toHaveLength(1)
    const leftEdge = serialOf(String(scrolled[0]!['scrollDate'])) + (scrolled[0]!['scrollDayOffset'] as number)
    expect(leftEdge - serialOf('2026-01-01')).toBeCloseTo(-3, 6)
  })
})
