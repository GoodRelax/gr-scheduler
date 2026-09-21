// PI-37 screenViewFromRegions: the view is made from the root state and ScreenViewReadings, and the root is only read.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  screenViewFromRegions,
  type ScreenView,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { unbroken } from '../contract/spec-table'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const PI_37_READINGS =
  '`ScreenViewReadings`（型。描き手が根の状態のほかに読む値 —— フレームで取った値（`SF-5`）、文書から導く値（`SF-10`）、まだ根へ移していない領域の値）'
const PI_37_READ_ONLY =
  '`screenViewFromRegions`（根の状態（`PI-39` の `ScreenSession`）と `ScreenViewReadings` から `ScreenView` を作る。根の状態は読むだけである）'

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

const SETTINGS = settingsOf()
const REGIONS = regionsFromScreen(ENV, SETTINGS)

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: true,
  pointer: null,
  pointerRestedMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  }
  return value
}

const after = (...events: readonly SessionEvent[]): ScreenSession =>
  events.reduce<ScreenSession>((root, event) => advanceScreenSession(root, event).state, emptyScreenSession)

const viewOf = (root: ScreenSession): ScreenView =>
  screenViewFromRegions(REGIONS, SCHEDULE, SETTINGS, emptySelection(), root, emptyDialogueLog(), READINGS)

describe(`PI-37 -- ${PI_37_READ_ONLY}`, () => {
  it('the design still says it, word for word', () => {
    expect(DESIGN).toContain(PI_37_READINGS)
    expect(DESIGN).toContain(PI_37_READ_ONLY)
  })

  it('a deep-frozen root is read without a throw, and is the same value afterwards', () => {
    const root = after({ type: 'paletteToggled' }, { type: 'settingsEntryPressed' } as SessionEvent)
    const copy = structuredClone(root)
    deepFreeze(root)
    expect(() => viewOf(root)).not.toThrow()
    expect(root).toEqual(copy)
  })

  it('the empty root is read without a throw once frozen', () => {
    const root = deepFreeze(structuredClone(emptyScreenSession))
    expect(() => viewOf(root)).not.toThrow()
  })

  it('the language is the root language (displayLanguageChosen), not a reading', () => {
    expect(viewOf(after({ type: 'displayLanguageChosen', language: 'en' } as SessionEvent)).language).toBe('en')
    expect(viewOf(after({ type: 'displayLanguageChosen', language: 'ja' } as SessionEvent)).language).toBe('ja')
  })

  it('the Command Palette shown or not follows the root (paletteToggled)', () => {
    const before = viewOf(emptyScreenSession).commandPalette === null
    expect(viewOf(after({ type: 'paletteToggled' })).commandPalette === null).toBe(!before)
    expect(viewOf(after({ type: 'paletteToggled' }, { type: 'paletteToggled' })).commandPalette === null).toBe(before)
  })

  it('the palette minimised or not follows the root (paletteMinimiseToggled)', () => {
    const shown = emptyScreenSession
    const base = viewOf(shown).commandPalette ?? viewOf(after({ type: 'paletteToggled' })).commandPalette
    const start: readonly SessionEvent[] = viewOf(shown).commandPalette === null ? [{ type: 'paletteToggled' }] : []
    const minimised = viewOf(after(...start, { type: 'paletteMinimiseToggled' })).commandPalette
    expect(base).not.toBeNull()
    expect(minimised).not.toBeNull()
    expect(minimised?.isMinimised).toBe(!(base?.isMinimised ?? false))
  })

  it('the Properties Panel follows the root: hidden at first, the document settings after settingsEntryPressed', () => {
    expect(viewOf(emptyScreenSession).propertiesPanel).toBeNull()
    expect(viewOf(after({ type: 'settingsEntryPressed' })).propertiesPanel?.showing).toBe('documentSettings')
  })
})
