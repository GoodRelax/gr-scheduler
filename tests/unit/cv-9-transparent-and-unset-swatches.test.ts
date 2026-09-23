// CV-9 / S-324 / P-19: the transparent swatch is a checkerboard, never an ink colour; unset has a dashed edge.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type {
  AppHeaderItems,
  PropertiesPanel,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'), 'utf8'))
const SETTINGS_TABLES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8'))

const CV_9_SWATCH_IS_WHAT_IS_DRAWN =
  '名の見本は、その欄が描く形（`CV-6`）の、いま描いている明暗の値で塗ること（MUST） —— 見本と描かれる色が食い違わない。'
const S_324_NOT_DRAWN = '塗りも線も描かない。`null`（選んでいない）とは別物である（`_assets/tbl-glossary.md` の `P-19`）'
const P_19_NOT_NULL = '`null`（選んでいない）とは別物である'
const RULING_2026_09_23 = 'user ruling 2026-09-23: transparent = checkerboard swatch, unset = dashed swatch'

const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = flat[key]
  }
  return out
}

type Side = 'light' | 'dark'
const HUE = 214
const THE_TASK = 1

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  nested({ ...SETTINGS_DEFAULTS, scrollDate: '2026-01-01', scrollGroupId: 'g1', ...part }) as unknown as DocumentSettings

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: 'alpha',
    start: '2026-01-03T08:00:00',
    finish: '2026-01-10T17:00:00',
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    stop: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

const groupOf = (): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
  }) as unknown as TaskGroup

const scheduleOf = (fillColor: string | null): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: HUE,
      uidHighWaterMark: 100,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [taskOf({ uid: THE_TASK })],
    resources: [],
    assignments: [],
    taskGroups: [groupOf()],
    taskGroupMembers: [{ taskUid: THE_TASK, groupId: 'g1', stackOrder: null }],
    taskVisuals: [
      {
        taskUid: THE_TASK,
        nameAnchor: null,
        nameAlign: null,
        shapeKind: null,
        milestoneGlyph: null,
        fillColor,
        strokeColor: fillColor,
        lineWeight: null,
      },
    ],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const readingsOf = (side: Side): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    pointer: null,
    pointerRestedMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: side,
    themeHue: HUE,
    selectedGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    rowBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), groupIds: [] },
    },
  },
}

const holdingTask = (): Selection => selectionWith(emptySelection(), { kind: 'task', uid: THE_TASK } as ItemRef)

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}
const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }
const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const U_25 = bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')

const drawnPanel = (fillColor: string | null, side: Side = 'light'): FakeElement => {
  const panel = propertiesPanelFromSelection(
    scheduleOf(fillColor),
    settingsOf({ themePreference: side }),
    holdingTask(),
    SESSION,
    readingsOf(side),
  ) as PropertiesPanel
  expect(panel, 'premise: the panel is described').not.toBeNull()
  const theme: ScreenTheme = { preference: side, hue: HUE }
  const built = wire(theme, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: panel })
  return oneByRole(built.root(), U_25)
}

// WHY: the readout of the chosen colour draws one swatch per theme side; fill and stroke are set alike here.
const chosenSwatchesOf = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => one.getAttribute('data-colour-swatch') !== null)

const valueOf = (option: FakeElement): string => option.getAttribute('value') ?? option.value

// WHY: only a list that offers transparent is a colour list; other lists also hold an empty entry.
const optionsValued = (panel: FakeElement, value: string): FakeElement[] =>
  selfAndDescendants(panel)
    .filter((one) => one.tagName === 'SELECT')
    .filter((list) => selfAndDescendants(list).some((one) => one.tagName === 'OPTION' && valueOf(one) === 'transparent'))
    .flatMap((list) => selfAndDescendants(list).filter((one) => one.tagName === 'OPTION' && valueOf(one) === value))

const SOLID_COLOUR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([^)]*\)|[a-z]+)$/i

// see S-324, P-19
const isCheckerboard = (element: FakeElement): boolean => {
  const background = (styleMap(element).get('background') ?? styleMap(element).get('background-image') ?? '').toLowerCase()
  return /gradient\(/.test(background)
}

const paintsSolid = (element: FakeElement): readonly string[] => {
  const style = styleMap(element)
  const found: string[] = []
  for (const property of ['background', 'background-color', 'color', 'fill']) {
    const value = (style.get(property) ?? '').trim()
    if (value === '' || /gradient\(/.test(value) || value === 'transparent' || value === 'inherit') continue
    if (SOLID_COLOUR.test(value) || value === 'none') found.push(`${property}:${value}`)
  }
  return found
}

const hasDashedEdge = (element: FakeElement): boolean => {
  const style = styleMap(element)
  const edges = ['border', 'border-style', 'outline', 'outline-style'].map((one) => (style.get(one) ?? '').toLowerCase())
  return edges.some((one) => one.includes('dashed'))
}

describe('CV-9 / S-324 / P-19 -- the manuscript these cases hang on', () => {
  it.each([
    ['CV-9', REQUIREMENTS, CV_9_SWATCH_IS_WHAT_IS_DRAWN],
    ['S-324', SETTINGS_TABLES, S_324_NOT_DRAWN],
    ['P-19', GLOSSARY, P_19_NOT_NULL],
  ])('%s still says it, word for word', (_row, text, clause) => {
    expect(text).toContain(clause)
  })
})

describe('CV-9 -- the transparent swatch is not drawn as an ink colour', () => {
  for (const side of ['light', 'dark'] as const) {
    it(`${side}: the chosen transparent colour is shown as a checkerboard, not a solid colour (MUST)`, () => {
      const swatches = chosenSwatchesOf(drawnPanel('transparent', side))
      expect(swatches.length, 'premise: the readout shows the light and dark sides').toBeGreaterThanOrEqual(2)
      for (const swatch of swatches) {
        expect(paintsSolid(swatch), `${S_324_NOT_DRAWN}; ${RULING_2026_09_23}`).toEqual([])
        expect(isCheckerboard(swatch), RULING_2026_09_23).toBe(true)
        expect(hasDashedEdge(swatch), `${P_19_NOT_NULL} -- transparent is not unset`).toBe(false)
      }
    })

    it(`${side}: the transparent entry of the list is a checkerboard, not a solid colour (MUST)`, () => {
      const options = optionsValued(drawnPanel(null, side), 'transparent')
      expect(options.length, 'premise: the list offers transparent').toBeGreaterThan(0)
      for (const option of options) {
        expect(paintsSolid(option).filter((one) => !one.startsWith('color:')), `${S_324_NOT_DRAWN}; ${RULING_2026_09_23}`).toEqual([])
        expect(isCheckerboard(option), RULING_2026_09_23).toBe(true)
      }
    })
  }
})

describe('P-19 -- unset is told apart from transparent', () => {
  it('an unset colour shows a dashed swatch, and transparent does not (MUST)', () => {
    const unset = chosenSwatchesOf(drawnPanel(null))
    expect(unset.length, 'premise: the readout shows the sides').toBeGreaterThanOrEqual(2)
    for (const swatch of unset) expect(hasDashedEdge(swatch), `${P_19_NOT_NULL}; ${RULING_2026_09_23}`).toBe(true)
    for (const swatch of chosenSwatchesOf(drawnPanel('transparent'))) {
      expect(hasDashedEdge(swatch), `${P_19_NOT_NULL}; ${RULING_2026_09_23}`).toBe(false)
    }
  })

  it('a named colour shows a solid swatch with no dashed edge (control)', () => {
    for (const swatch of chosenSwatchesOf(drawnPanel('red'))) {
      expect(hasDashedEdge(swatch)).toBe(false)
      expect(isCheckerboard(swatch)).toBe(false)
    }
  })

  it('the unset entry of the list has a dashed edge (MUST)', () => {
    const options = optionsValued(drawnPanel('red'), '')
    expect(options.length, 'premise: the list offers unset').toBeGreaterThan(0)
    for (const option of options) expect(hasDashedEdge(option), `${P_19_NOT_NULL}; ${RULING_2026_09_23}`).toBe(true)
  })
})
