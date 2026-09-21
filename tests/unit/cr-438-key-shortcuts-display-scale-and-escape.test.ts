// CR-438 stage-5 spec-only cases for key input: UF-90, UF-93, UF-101, UF-102 (T-036, T-252, T-260, T-028, T-023c).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { escapeTarget, type EscapeTarget } from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
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
import {
  commandFromInput,
  escapeContextOf,
  selectionFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { DISPLAY_SCALE_STEPS, DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'

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

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

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
  project: { calendarUid: null, statusDate: '2026-02-01T00:00:00', themeHue: 214, title: null, uidHighWaterMark: 10 },
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
  taskGroups: Array.from({ length: 6 }, (_unused, index) => ({
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
  commentBoxes: [
    { id: 'c1', leaderShapeKind: null, text: null, anchorDate: '2026-01-06', anchorGroupId: 'g3', bodyOffsetPx: null },
  ],
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
    zoomStep: 1.5,
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

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const keyOf = (key: string, mods: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key,
  modifiers: { ...NO_MODS, ...mods },
})

function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const ofKind = (answer: TranslatedInput, kind: string): readonly Record<string, unknown>[] =>
  commandsOf(answer)
    .filter((one) => one.kind === kind)
    .map((one) => one as unknown as Record<string, unknown>)

describe('UF-90 table T-036 (FR-070) -- a key press becomes the operation its row assigns', () => {
  it('SK-6: Ctrl+Z asks to undo, and MK-10 stops the browser default for it', () => {
    const answer = commandFromInput(keyOf('Z', { ctrl: true }), contextOf())
    expect(answer.action?.kind).toBe('undoEdit')
    expect(answer.isBrowserDefaultStopped).toBe(true)
  })

  it('SK-7: both of its spellings (Ctrl+Y, Ctrl+Shift+Z) ask to redo, never to undo', () => {
    expect(commandFromInput(keyOf('Y', { ctrl: true }), contextOf()).action?.kind).toBe('redoEdit')
    expect(commandFromInput(keyOf('Z', { ctrl: true, shift: true }), contextOf()).action?.kind).toBe('redoEdit')
  })

  it('SK-10 / SK-11 / SK-21: Ctrl+O opens, Ctrl+S saves, Ctrl+R reads the open file again', () => {
    expect(commandFromInput(keyOf('O', { ctrl: true }), contextOf()).action?.kind).toBe('openDocumentFile')
    expect(commandFromInput(keyOf('S', { ctrl: true }), contextOf()).action?.kind).toBe('saveDocumentFile')
    const reread = commandFromInput(keyOf('R', { ctrl: true }), contextOf())
    expect(reread.action?.kind).toBe('reopenDocumentFile')
    expect(reread.isBrowserDefaultStopped).toBe(true)
  })

  it('SK-16b: Shift+- narrows the time axis only (zoomX down, zoomY unchanged)', () => {
    const zoomed = ofKind(commandFromInput(keyOf('-', { shift: true }), contextOf({ zoomX: 2, zoomY: 1.5 })), 'setZoom')
    expect(zoomed).toHaveLength(1)
    expect(zoomed[0]!['zoomX'] as number).toBeLessThan(2)
    expect(zoomed[0]!['zoomY']).toBeCloseTo(1.5, 10)
  })

  it('SK-16c: Alt+- narrows the row axis only (zoomY down, zoomX unchanged)', () => {
    const zoomed = ofKind(commandFromInput(keyOf('-', { alt: true }), contextOf({ zoomX: 2, zoomY: 1.5 })), 'setZoom')
    expect(zoomed).toHaveLength(1)
    expect(zoomed[0]!['zoomY'] as number).toBeLessThan(1.5)
    expect(zoomed[0]!['zoomX']).toBeCloseTo(2, 10)
  })

  it('MK-10 (MUST NOT) / T-036 note: Ctrl+ + without Shift is the browser zoom and is left alone', () => {
    for (const key of ['+', '-', '0']) {
      const answer = commandFromInput(keyOf(key, { ctrl: true }), contextOf())
      expect(answer.action, `Ctrl+${key}`).toBeNull()
      expect(answer.isBrowserDefaultStopped, `Ctrl+${key}`).toBe(false)
    }
  })
})

describe('UF-93 FR-039 / table T-260 -- one step of the display scale, and the message it raises', () => {
  const top = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!
  const bottom = DISPLAY_SCALE_STEPS[0]!
  const stepAfter = (scale: number): number => DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.indexOf(scale) + 1]!
  const stepBefore = (scale: number): number => DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.indexOf(scale) - 1]!

  it('reads the steps of S-234 from the manuscript (premise)', () => {
    expect(DISPLAY_SCALE_STEPS.length).toBeGreaterThan(2)
    expect(DISPLAY_SCALE_STEPS).toContain(DEFAULT_DISPLAY_SCALE)
  })

  it('SK-22 at the default step writes the NEXT step in the type column order (FR-039, CM-74)', () => {
    const answer = commandFromInput(keyOf('+', { ctrl: true, shift: true }), contextOf({ displayScale: DEFAULT_DISPLAY_SCALE }))
    const written = ofKind(answer, 'setDisplayScale')
    expect(written).toHaveLength(1)
    expect(written[0]!['scale']).toBe(stepAfter(DEFAULT_DISPLAY_SCALE))
    expect(answer.displayScaleShown).toEqual({ end: null })
  })

  it('SK-23 at the default step writes the PREVIOUS step', () => {
    const answer = commandFromInput(keyOf('-', { ctrl: true, shift: true }), contextOf({ displayScale: DEFAULT_DISPLAY_SCALE }))
    expect(ofKind(answer, 'setDisplayScale').map((one) => one['scale'])).toEqual([stepBefore(DEFAULT_DISPLAY_SCALE)])
  })

  it('SE-1 / SE-2 / FR-039 (MUST NOT wrap): SK-22 at the top step writes nothing and says "max"', () => {
    const answer = commandFromInput(keyOf('+', { ctrl: true, shift: true }), contextOf({ displayScale: top }))
    expect(ofKind(answer, 'setDisplayScale')).toEqual([])
    expect(answer.displayScaleShown).toEqual({ end: 'max' })
  })

  it('SE-1 / SE-2: SK-23 at the bottom step writes nothing and says "min"', () => {
    const answer = commandFromInput(keyOf('-', { ctrl: true, shift: true }), contextOf({ displayScale: bottom }))
    expect(ofKind(answer, 'setDisplayScale')).toEqual([])
    expect(answer.displayScaleShown).toEqual({ end: 'min' })
  })

  it('SE-1: SK-17 raises the message too, and brings the display scale back to the default step', () => {
    const answer = commandFromInput(
      keyOf('0', { ctrl: true, shift: true }),
      contextOf({ displayScale: top, zoomX: 3, zoomY: 0.5 }),
    )
    expect(answer.displayScaleShown).toBeDefined()
    expect(ofKind(answer, 'setDisplayScale').map((one) => one['scale'])).toEqual([DEFAULT_DISPLAY_SCALE])
  })
})

const ONE_TASK_SELECTED: Selection = selectionWith(emptySelection(), { kind: 'task', uid: 1 })
const ARMED_BOX: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, armModeState: { kind: 'highlightBoxArmed' } },
}

describe('UF-102 / UF-101 table T-028 IN-4 (FR-040) -- Esc consumes one level, in the row order', () => {
  it('IN-4 (MUST NOT put the selection before the arm): with both, Esc drops the arm and keeps the selection', () => {
    const context = contextOf({}, { screen: ARMED_BOX.screen, selection: ONE_TASK_SELECTED })
    const esc = keyOf('Esc')
    const rung: EscapeTarget | null = escapeTarget(escapeContextOf(context))
    expect(rung, 'IN-4 (MUST NOT): the arm stands above the selection').toBe('armed')
    const stepped = advanceScreenSession(ARMED_BOX, { type: 'escapePressed', rung: rung as EscapeTarget }).state
    expect(stepped.screen.armModeState.kind).toBe('notArmed')
    expect(selectionFromInput(esc, context)).toEqual(ONE_TASK_SELECTED)
  })

  it('IN-4: with only a selection left, Esc empties the selection and is consumed', () => {
    const context = contextOf({}, { selection: ONE_TASK_SELECTED })
    const esc = keyOf('Esc')
    expect(selectionFromInput(esc, context).items).toEqual([])
    expect(commandFromInput(esc, context).isBrowserDefaultStopped).toBe(true)
  })

  it('IN-4a (MUST): with nothing to consume, Esc reaches the browser', () => {
    const answer = commandFromInput(keyOf('Esc'), contextOf())
    expect(answer.isBrowserDefaultStopped).toBe(false)
    expect(answer.action).toBeNull()
  })
})

describe('UF-101 table T-023c (FR-081) -- SK-2 selects every SL-1 kind and makes no order', () => {
  it('SL-5 / SL-1: Ctrl+A takes a task, the dependency, both boxes and the status line', () => {
    const chosen = selectionFromInput(keyOf('A', { ctrl: true }), contextOf())
    const kinds = new Set(chosen.items.map((one) => one.kind))
    expect([...kinds].sort()).toEqual(['commentBox', 'dependency', 'highlightBox', 'statusLine', 'task'])
    expect(chosen.items.filter((one) => one.kind === 'task')).toHaveLength(2)
  })

  it('SL-7b (MUST NOT make an order): the whole-selection is not ordered', () => {
    expect(selectionFromInput(keyOf('A', { ctrl: true }), contextOf()).ordered).toBe(false)
  })
})
