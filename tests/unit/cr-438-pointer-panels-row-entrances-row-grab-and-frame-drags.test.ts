// see CR-438, CR-570, UF-94, UF-96, UF-97, T-015, T-051, T-328, HF-15, FR-052, FR-053

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
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
import { editTaskGroup } from '../../src/use-case/edit-document/edit-task-group'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-surface'
import {
  commandFromInput,
  pressRowOf,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPress,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

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
    scrollGroupId: 'n1',
    stackDirection: 'down',
    rulerHeight: 48,
    rulerFont: 12,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1200, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const TASK = {
  uid: 1,
  name: 'one',
  start: '2026-01-05',
  finish: '2026-01-09',
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
} as unknown as Task

const ROWS = [
  { id: 'n1', parentId: null, order: 0 },
  { id: 'n1a', parentId: 'n1', order: 1 },
  { id: 'n1a1', parentId: 'n1a', order: 2 },
  { id: 'n2', parentId: null, order: 3 },
  { id: 'n2a', parentId: 'n2', order: 4 },
] as const

type TreeState = 'auto' | 'collapsed' | 'expanded' | 'temporarilyExpanded' | 'hidden'
type RowState = Readonly<Record<string, TreeState>>

const scheduleOf = (state: RowState): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 10 },
    calendars: [],
    tasks: [TASK],
    resources: [],
    assignments: [],
    taskGroups: ROWS.map((one) => ({
      id: one.id,
      parentId: one.parentId,
      label: one.id,
      derivedFromTaskUid: null,
      order: one.order,
      treeState: state[one.id] ?? 'auto',
      color: null,
      height: null,
    })),
    taskGroupMembers: [{ groupId: 'n1a1', taskUid: 1 }],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const contextOf = (
  state: RowState = {},
  settingsPart: Record<string, unknown> = {},
  part: Partial<InputContext> = {},
): InputContext => {
  const schedule = scheduleOf(state)
  const settings = settingsOf(settingsPart)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  return {
    document: {
      schemaVersion: '2026-01-01',
      schedule,
      documentSettings: settings,
      documentStamp: {
        scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
        lastEditedBy: 'test',
        settingsUpdatedUtc: '2026-01-01T00:00:00Z',
      },
      changeLog: [],
    } as unknown as Document,
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
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

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (phase: PointerInput['phase'], x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODS,
  clickCount: 1,
})

const partOf = (part: string, extra: Partial<ScreenPart> = {}): ScreenPart =>
  ({
    part,
    entry: null,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    ...extra,
  }) as unknown as ScreenPart

const pressOf = (at: PointerInput, on: ScreenPart, context: InputContext): PointerPress => ({
  at,
  hit: null,
  on,
  pressRow: pressRowOf({ at, hit: null }, context),
})

function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null) return []
  if (action.kind === 'changeDocument') return action.writes.flat()
  return []
}

const ofKind = (answer: TranslatedInput, kind: string): readonly Record<string, unknown>[] =>
  commandsOf(answer)
    .filter((one) => one.kind === kind)
    .map((one) => one as unknown as Record<string, unknown>)

// WHY: the command shape of a press is not the spec's; what T-328 decides is the value each
// row is left with, so the writes are replayed onto the starting values (CM-85, CM-72).
function statesAfter(answer: TranslatedInput, state: RowState): Record<string, TreeState> {
  const states: Record<string, TreeState> = Object.fromEntries(ROWS.map((one) => [one.id, state[one.id] ?? 'auto']))
  for (const one of commandsOf(answer) as readonly Record<string, any>[]) {
    if (one['kind'] === 'setTaskGroupTreeState') states[String(one['taskGroupId'])] = one['treeState']
    if (one['kind'] === 'resetTaskGroupTreeStates') {
      for (const id of Object.keys(states)) if (states[id] !== 'hidden') states[id] = 'auto'
    }
  }
  return states
}

const HF_13_BY_T_328 = '⭐ 押した行と隠した直下の子が取る値は 表 T-328 の `oneLevelOpenPressed` の行に従うこと（MUST）'
const HF_11_BY_T_328 = '⭐ 畳むときに行が取る値は 表 T-328 の `allBelowFoldPressed` の行に従うこと（MUST）'
const HF_10_BY_T_328 = '⭐ 押したときに行と段 0 が取る値は 表 T-328 の `everyRowOpenPressed` の行と根の升に従うこと（MUST）'
const HF_2_BY_T_328 = '⭐ 押したときに行が取る値は、`_assets/tbl-state-machines.md` の 表 T-328 の `allBelowOpenPressed` の行に従うこと（MUST）'
const UN_14_ONE_PRESS_ONE_STEP = '⭐ 1 回の押下が書き換える行の木の状態は、行がいくつでも同じ 1 段に入れること（MUST）'
const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

function pressRowEntry(entry: string, rowGroupId: string | null, context: InputContext): TranslatedInput {
  const panel = context.regions.rowTitlePanel
  const down = pointerOf('down', panel.x + 20, panel.y + 40)
  const on = partOf('Row Title Panel', { entry: entry as ScreenPart['entry'], rowGroupId })
  return commandFromInput(
    pointerOf('up', down.x, down.y),
    { ...context, pressed: pressOf(down, on, context) },
  )
}

describe('UF-96 tables T-015 / T-051 / T-328 (FR-004, FR-018) -- the row entrances', () => {
  it.each([HF_13_BY_T_328, HF_11_BY_T_328, HF_10_BY_T_328, HF_2_BY_T_328, UN_14_ONE_PRESS_ONE_STEP])('the manuscript holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it(`HF-13 / HR-7: IC-90 makes only the pressed row expanded and leaves the folded child alone, in one write -- ${HF_13_BY_T_328}`, () => {
    const state: RowState = { n1: 'collapsed', n1a: 'collapsed' }
    const answer = pressRowEntry('IC-90', 'n1', contextOf(state))
    expect(statesAfter(answer, state)).toEqual({ n1: 'expanded', n1a: 'collapsed', n1a1: 'auto', n2: 'auto', n2a: 'auto' })
    const action = answer.action
    if (action === null || action.kind !== 'changeDocument') throw new Error('no write')
    expect(action.writes, UN_14_ONE_PRESS_ONE_STEP).toHaveLength(1)
  })

  it(`HF-11 / HR-4: IC-77 folds the pressed row with its subtree, not the other root -- ${HF_11_BY_T_328}`, () => {
    const state: RowState = { n1: 'expanded', n1a: 'temporarilyExpanded', n1a1: 'auto', n2: 'expanded' }
    const answer = pressRowEntry('IC-77', 'n1', contextOf(state))
    expect(statesAfter(answer, state)).toEqual({ n1: 'collapsed', n1a: 'collapsed', n1a1: 'collapsed', n2: 'expanded', n2a: 'auto' })
  })

  it(`HF-10 / HR-1: IC-74 at the head opens what was folded and leaves expanded alone -- ${HF_10_BY_T_328}`, () => {
    const state: RowState = { n2: 'collapsed', n1: 'expanded' }
    const answer = pressRowEntry('IC-74', null, contextOf(state))
    expect(statesAfter(answer, state)).toEqual({ n1: 'expanded', n1a: 'temporarilyExpanded', n1a1: 'auto', n2: 'temporarilyExpanded', n2a: 'auto' })
  })

  it(`HF-2 / HR-3: IC-58 gives the pressed row and the non-leaf rows under it temporarilyExpanded -- ${HF_2_BY_T_328}`, () => {
    const state: RowState = { n1: 'collapsed', n1a: 'expanded', n1a1: 'collapsed', n2: 'expanded' }
    const answer = pressRowEntry('IC-58', 'n1', contextOf(state))
    expect(statesAfter(answer, state)).toEqual({ n1: 'temporarilyExpanded', n1a: 'expanded', n1a1: 'auto', n2: 'expanded', n2a: 'auto' })
  })
})

const S_37 = Number(/\d+(?:\.\d+)?/.exec(bare(specTable('T-201').rows.find((one) => one.id === 'S-37')?.by['既定値'] ?? ''))?.[0])

describe('UF-97 table T-051 HF-15 (FR-004) -- a row carried by its grab strip', () => {
  it('HF-15 (MUST): one step to the right makes the row the last child of the sibling just above it', () => {
    const idle = contextOf()
    const row = idle.layout.rows.find((one) => one.groupId === 'n2')
    if (row === undefined) throw new Error('n2 is not drawn')
    const down = pointerOf('down', idle.regions.rowTitlePanel.x + 4, row.y + row.height / 2)
    const on = partOf('Row Title Panel', { rowGroupId: 'n2', isRowGrabStrip: true })
    const pressed = pressOf(down, on, idle)
    const to = down.x + 1.2 * S_37 * DEFAULT_DISPLAY_RATIO
    const answer = commandFromInput(pointerOf('up', to, down.y), {
      ...idle,
      pressed: { ...pressed, rowGrabAxis: 'depth' },
    })
    const moved = ofKind(answer, 'moveTaskGroup')
    expect(moved.map((one) => [one['groupId'], one['parentId']])).toEqual([['n2', 'n1']])
  })
})

describe('UF-94 FR-052 / FR-053 -- dragging the parts of the frame', () => {
  it('FR-053 / GR-19: the palette grab band moves the palette by the pointer travel and writes no document', () => {
    const idle = contextOf()
    const down = pointerOf('down', 600, 300)
    const pressed = pressOf(down, partOf('Command Palette', { entry: 'IC-53' as ScreenPart['entry'] }), idle)
    const answer = commandFromInput(pointerOf('up', 640, 330), { ...idle, pressed })
    expect(answer.action).toEqual({ kind: 'moveCommandPalette', by: { dx: 40, dy: 30 } })
  })

  it('FR-052 / T-252: widening the row title panel stores the drawn width divided by the display ratio', () => {
    const idle = contextOf()
    const stored = (idle.document.documentSettings as unknown as { rowTitlePanelWidth: number }).rowTitlePanelWidth
    const panel = idle.regions.rowTitlePanel
    expect(panel.width).toBeCloseTo(stored * DEFAULT_DISPLAY_RATIO, 6)
    const down = pointerOf('down', panel.x + panel.width, panel.y + panel.height / 2)
    const pressed = pressOf(down, partOf('Panel Divider', { dividerPanel: 'rowTitlePanel' }), idle)
    const answer = commandFromInput(pointerOf('up', down.x + 40, down.y), { ...idle, pressed })
    const widths = ofKind(answer, 'setPanelWidths')
    expect(widths).toHaveLength(1)
    expect(widths[0]!['rowTitlePanelWidth']).toBeCloseTo(stored + 40 / DEFAULT_DISPLAY_RATIO, 6)
  })
})

describe('UF-94 / UF-97 while held and where the row lands (FR-053, HF-15)', () => {
  it('FR-053 (MUST): while the palette grab band is held, the palette follows the pointer', () => {
    const idle = contextOf()
    const down = pointerOf('down', 600, 300)
    const pressed = pressOf(down, partOf('Command Palette', { entry: 'IC-53' as ScreenPart['entry'] }), idle)
    const held = commandFromInput(pointerOf('move', 625, 280), { ...idle, pressed: { ...pressed, followedTo: { x: 600, y: 300 } } })
    expect(held.action).toEqual({ kind: 'moveCommandPalette', by: { dx: 25, dy: -20 } })
  })

  it('HF-15 (MUST): after one step right, the row is the LAST child of the sibling just above it', () => {
    const idle = contextOf()
    const row = idle.layout.rows.find((one) => one.groupId === 'n2')
    if (row === undefined) throw new Error('n2 is not drawn')
    const down = pointerOf('down', idle.regions.rowTitlePanel.x + 4, row.y + row.height / 2)
    const on = partOf('Row Title Panel', { rowGroupId: 'n2', isRowGrabStrip: true })
    const to = down.x + 1.2 * S_37 * DEFAULT_DISPLAY_RATIO
    const answer = commandFromInput(pointerOf('up', to, down.y), {
      ...idle,
      pressed: { ...pressOf(down, on, idle), rowGrabAxis: 'depth' },
    })
    const moves = commandsOf(answer).filter((one) => one.kind === 'moveTaskGroup')
    expect(moves).toHaveLength(1)
    const result = editTaskGroup(idle.document, moves[0] as Parameters<typeof editTaskGroup>[1], 'Row')
    if (!result.ok) throw new Error('the move was refused')
    const children = result.document.schedule.taskGroups
      .filter((one) => one.parentId === 'n1')
      .sort((a, b) => a.order - b.order)
      .map((one) => one.id)
    expect(children[children.length - 1]).toBe('n2')
    expect(children).toContain('n1a')
  })
})
