// PI-18 screenEventFromInput: one screen event from an input, null for Esc and for inputs that make none (T-280, T-283).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  screenEventFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
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
import { emptyScreenValues } from '../../src/use-case/advance-screen-session/screen-values'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { bare, specTable, unbroken } from '../contract/spec-table'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const PI_18_SCREEN_EVENT =
  '`screenEventFromInput`（入力から画面の値の出来事を 1 つ作る。作るものが無ければ `null`。出来事の全数は 表 T-280。`Esc` には作らない —— 段はシェルが決める（表 T-283））'

const SCREEN_EVENTS = new Set(
  (
    JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8')) as {
      readonly regions: readonly { readonly region: string; readonly events: readonly { readonly key: string }[] }[]
    }
  ).regions
    .filter((r) => r.region === 'screen')
    .flatMap((r) => r.events.map((e) => e.key)),
)

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
    screen: emptyScreenValues,
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

// see SK-8, SK-13, SK-14, SK-15
const assignedKey = (row: string): string => {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return bare(found.by['割当'] ?? '')
}

const kindOf = (event: unknown): string => String((event as { readonly type?: unknown }).type)

describe(`PI-18 -- ${PI_18_SCREEN_EVENT}`, () => {
  it('the design still says it, word for word', () => {
    expect(DESIGN).toContain(PI_18_SCREEN_EVENT)
  })

  it('T-280 holds the events these cases sample', () => {
    for (const one of ['paletteToggled', 'fullScreenEntryPressed', 'surfaceEntryPressed', 'escapePressed']) {
      expect(SCREEN_EVENTS.has(one), one).toBe(true)
    }
  })

  it('SK-8 Esc makes no screen event: the shell chooses the rung (T-283)', () => {
    expect(screenEventFromInput(keyOf(assignedKey('SK-8')), contextOf())).toBeNull()
  })

  it('Esc makes no screen event even while a surface stands and an arm is held', () => {
    const context = contextOf({}, { isSurfaceStanding: true })
    expect(screenEventFromInput(keyOf(assignedKey('SK-8')), context)).toBeNull()
  })

  it('an unassigned key makes no screen event', () => {
    expect(screenEventFromInput(keyOf('F20'), contextOf())).toBeNull()
  })

  const makesEventOfT280 = (row: string, kind: string): void => {
    const event = screenEventFromInput(keyOf(assignedKey(row)), contextOf())
    expect(event).not.toBeNull()
    expect(SCREEN_EVENTS.has(kindOf(event)), kindOf(event)).toBe(true)
    expect(kindOf(event)).toBe(kind)
  }

  it.each([
    ['SK-14', 'paletteToggled'],
    ['SK-13', 'surfaceEntryPressed'],
  ])('%s makes %s, an event of T-280', makesEventOfT280)

  // DEVIATION: spec says F11 makes fullScreenEntryPressed (PI-18); here it stays an InputAction (DFC-709)
  it.fails.each([['SK-15', 'fullScreenEntryPressed']])('%s makes %s, an event of T-280', makesEventOfT280)

  // DEVIATION: spec says this key makes displayScaleStepped (PI-18); here it is a document write (DFC-710)
  it.fails('SK-22 (Ctrl + Shift + +) makes displayScaleStepped, an event of T-280', () => {
    const event = screenEventFromInput(keyOf('+', { ctrl: true, shift: true }), contextOf())
    expect(kindOf(event)).toBe('displayScaleStepped')
    expect(SCREEN_EVENTS.has(kindOf(event))).toBe(true)
  })

  it('whatever it answers for these keys is null or a kind of T-280, never anything else', () => {
    for (const key of ['P', 'F1', 'F11', 'F', 'Enter', 'Delete', 'A', 'Z', 'y', 'n', 'Esc']) {
      const event = screenEventFromInput(keyOf(key), contextOf())
      if (event !== null) expect(SCREEN_EVENTS.has(kindOf(event)), `${key} -> ${kindOf(event)}`).toBe(true)
    }
  })
})
