// FR-085's arithmetic: how much room a row's name is given.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  RowTitle,
  RowTitlePanel,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable } from '../contract/spec-table'
import {
  DEFAULT_DISPLAY_RATIO,
  DEFAULT_DISPLAY_SCALE,
  S_235,
} from '../fixtures/display-scale'

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

const numberIn = (cell: string): number => {
  const hit = /-?\d+(?:\.\d+)?/.exec(bare(cell))
  if (hit === null) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return Number(hit[0])
}

// see T-206, S-140
const S_140 = numberIn(rowOf('T-206', 'S-140')['既定'] ?? '')

// see T-206, S-138, T-023d, GR-20
const S_138 = numberIn(rowOf('T-206', 'S-138')['既定'] ?? '')

// see T-206, S-218
const S_218 = numberIn(rowOf('T-206', 'S-218')['既定'] ?? '')

// see FR-029, T-252
const GRAB_STRIP_ROOM = S_138 * S_235 + S_218

// see T-216, S-73
const THEME_HUE = numberIn(rowOf('T-216', 'S-73')['既定'] ?? '')

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const PANEL = settingsOf({
  displayScale: DEFAULT_DISPLAY_SCALE,
  rowTitlePanelWidth: 400, // see S-79
  rowTitleIndent: 20, // see S-37
  rowTitleFont: 20, // see S-36
  rowTitleTopScale: 1, // see S-38
  labelCoef: 0.5, // see S-30
  maxGroupDepth: 5, // see S-125
  truncateUnits: 120, // see S-35
  pinnedGroupIds: [], // see S-126
  pinnedRowMax: 5, // see S-127
})

const panelWith = (part: Record<string, unknown>): DocumentSettings =>
  settingsOf({ ...(PANEL as unknown as Record<string, unknown>), ...part })

// see FR-093
const perCharacter = (settings: DocumentSettings): number => {
  const flat = settings as unknown as Record<string, number>
  return (flat['rowTitleFont'] as number) * (flat['labelCoef'] as number)
}

// see FR-039, T-252
const drawnPanelOf = (settings: DocumentSettings): number => {
  const flat = settings as unknown as Record<string, number>
  return Math.max(
    (flat['rowTitlePanelWidth'] as number) * DEFAULT_DISPLAY_RATIO,
    (flat['rowTitleIndent'] as number) * DEFAULT_DISPLAY_RATIO * (flat['maxGroupDepth'] as number) +
      S_138 * S_235 +
      26 * S_235 * 4,
  )
}

// see FR-093, FR-039
const drawnPerCharacter = (settings: DocumentSettings): number =>
  perCharacter(settings) * DEFAULT_DISPLAY_RATIO

// see FR-085
const roomInPixels = (settings: DocumentSettings, depth: number): number => {
  const flat = settings as unknown as Record<string, number>
  return (
    drawnPanelOf(settings) -
    depth * (flat['rowTitleIndent'] as number) * DEFAULT_DISPLAY_RATIO -
    S_140 -
    GRAB_STRIP_ROOM
  )
}

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, language: 'ja' },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const readingsWith = (part: Partial<ScreenViewReadings>): ScreenViewReadings => ({ ...READINGS, ...part })

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (groups: readonly TaskGroup[]): Schedule =>
  ({
    project: { title: null, themeHue: THEME_HUE, uidHighWaterMark: 0 },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const boxAt = (index: number): ScreenRect => ({ x: 0, y: index * 24, width: 400, height: 24 })

const drawn = (...groupIds: readonly string[]): ScreenViewReadings =>
  readingsWith({ rowBoxes: groupIds.map((groupId, index) => ({ groupId, box: boxAt(index) })) })

const deepestTitle = (depth: number, label: string, settings: DocumentSettings): RowTitle => {
  const ids = Array.from({ length: depth }, (_unused, index) => `g${index + 1}`)
  const groups = ids.map((id, index) =>
    groupOf({ id, parentId: index === 0 ? null : `g${index}`, label, order: index }),
  )
  const panel: RowTitlePanel = rowTitlePanelFromSchedule(
    scheduleOf(groups),
    settings,
    emptySelection(),
    ROOT,
    drawn(...ids),
  )
  const found = [...panel.pinnedTitles, ...panel.titles].filter(
    (one) => one.groupId === `g${depth}`,
  )
  expect(found.length, `exactly one title for g${depth}`).toBe(1)
  return found[0] as RowTitle
}

const keptOf = (settings: DocumentSettings, depth: number): number => {
  for (let length = 1; length <= 400; length += 1) {
    if (deepestTitle(depth, 'x'.repeat(length), settings).isLabelTruncated) return length - 1
  }
  throw new Error('no half-width name of any length was cut by this panel')
}

describe('FR-085 (MUST) -- the room for a name is the panel less the indent, S-140, S-138 and S-218', () => {
  const DEPTHS = [1, 2, 3] as const

  it.each(DEPTHS)(
    '⭐ gives a depth %i row exactly `S-79` − depth x `S-37` − `S-140` − `S-138` − `S-218`',
    (depth) => {
      expect(
        keptOf(PANEL, depth),
        'FR-085: 描いた幅どうしの引き算を、描いた 1 文字の幅で割った文字数',
      ).toBe(Math.floor(roomInPixels(PANEL, depth) / drawnPerCharacter(PANEL)))
    },
  )

  it('⭐ keeps NO room for the row controls, because S-140 is 0 -- but the grab strip still costs', () => {
    expect(S_140, 'table T-206 still prints S-140 as 0px').toBe(0)

    const flat = PANEL as unknown as Record<string, number>
    const wholePanelLessIndentLessGrabStrip = Math.floor(
      (drawnPanelOf(PANEL) -
        1 * (flat['rowTitleIndent'] as number) * DEFAULT_DISPLAY_RATIO -
        GRAB_STRIP_ROOM) /
        drawnPerCharacter(PANEL),
    )

    expect(keptOf(PANEL, 1)).toBe(wholePanelLessIndentLessGrabStrip)
  })

  it('⛔ the sum really is being measured -- moving S-79 by one character moves the cut by one', () => {
    const one = perCharacter(PANEL)

    expect(keptOf(panelWith({ rowTitlePanelWidth: 400 + one }), 1) - keptOf(PANEL, 1)).toBe(1)
    expect(keptOf(panelWith({ rowTitleIndent: 20 + one }), 1) - keptOf(PANEL, 1)).toBe(-1)
  })

  it('takes the indent once PER STEP OF DEPTH, not once for the whole chain', () => {
    const step = (PANEL as unknown as Record<string, number>)['rowTitleIndent'] as number
    const perStep = step / perCharacter(PANEL)

    expect(keptOf(PANEL, 1) - keptOf(PANEL, 2)).toBe(perStep)
    expect(keptOf(PANEL, 2) - keptOf(PANEL, 3)).toBe(perStep)
    expect(keptOf(PANEL, 1) - keptOf(PANEL, 3)).toBe(2 * perStep)
  })

  it('has a FOURTH term: the grab strip and its gap cost `S-138` + `S-218` at every panel width', () => {
    for (const width of [300, 400, 500, 640]) {
      const wider = panelWith({ rowTitlePanelWidth: width })
      const flat = wider as unknown as Record<string, number>
      const lessIndentOnly =
        drawnPanelOf(wider) -
        2 * (flat['rowTitleIndent'] as number) * DEFAULT_DISPLAY_RATIO -
        S_140

      expect(keptOf(wider, 2), `at a panel of ${width}px`).toBe(
        Math.floor((lessIndentOnly - GRAB_STRIP_ROOM) / drawnPerCharacter(wider)),
      )
      expect(
        keptOf(wider, 2),
        `S-138 x S-235 と S-218 を引かない幅と同じ文字数になっている: ${width}px`,
      ).not.toBe(Math.floor(lessIndentOnly / drawnPerCharacter(wider)))
    }
  })
})

describe('the specification still says what these cases copy', () => {
  it('table T-206 still holds S-140, and FR-085 still names it as the third term', () => {
    expect(specTable('T-206').rows.map((row) => row.id)).toContain('S-140')
    expect(rowOf('T-206', 'S-140')['値'] ?? '').toContain('`FR-085`')
  })

  it('table T-206 holds S-138 and S-218, and S-218 says it is a term of FR-085', () => {
    const ids = specTable('T-206').rows.map((row) => row.id)
    expect(ids).toContain('S-138')
    expect(ids).toContain('S-218')
    expect(rowOf('T-206', 'S-218')['保存しない理由'] ?? '').toContain('`FR-085`')
    expect(rowOf('T-206', 'S-218')['値'] ?? '').toContain('`GR-20`')
    expect(rowOf('T-023d', 'GR-20')['場所'] ?? '').toContain('`S-138`')
  })
})
