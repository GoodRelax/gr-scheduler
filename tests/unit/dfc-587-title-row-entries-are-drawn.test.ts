// DFC-587: the entrances the surface draws on the title rows of the help and the Properties Panel.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenState,
  screenStateWithSurface,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  DisplayLanguage,
  OpenModal,
  PropertiesPanel,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { openModalFromScreenState } from '../../src/adapter/screen-renderer/open-modals'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  oneByRole,
  selfAndDescendants,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, bareAll, specTable } from '../contract/spec-table'

const H_SURFACE = String.fromCodePoint(0x9762)
const H_DEFAULT = String.fromCodePoint(0x65e2, 0x5b9a)

const T_109 = specTable('T-109')

const rowsPlacedOn = (surface: string): readonly string[] =>
  T_109.rows.filter((row) => bareAll(row.by[H_SURFACE] ?? '').includes(surface)).map((row) => row.id)

const onlyRowOf = (id: string): Readonly<Record<string, string>> => {
  const found = T_109.rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table T-109 no longer has row ${id}`)
  return found.by
}

const LEGEND_ROW = 'IC-102'
const CLOSE_ROW = 'IC-52'
const HELP_SURFACE = bare(onlyRowOf(LEGEND_ROW)[H_SURFACE] ?? '')
const PANEL_SURFACE = 'Properties Panel'
const PANEL_ROWS = rowsPlacedOn(PANEL_SURFACE)

const THEME_HUE = Number(bare(specTable('T-216').rows.find((row) => row.id === 'S-73')?.by[H_DEFAULT] ?? ''))
const THEME: ScreenTheme = { preference: 'light', hue: THEME_HUE }

const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { readonly icons: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[] }

const legendWord = (language: DisplayLanguage): string =>
  WORDS.icons.find((one) => one.rowId === LEGEND_ROW)?.label[language] ?? ''

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const sessionOf = (part: Partial<ScreenSession> = {}): ScreenSession => ({
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  ...part,
})

const THE_TASK = 1

const ONE_TASK = {
  project: {
    id: null, name: null, title: null, subject: null, category: null, company: null,
    manager: null, author: null, created: null, revision: null, lastSaved: null,
    startDate: null, statusDate: null, minutesPerDay: null, minutesPerWeek: null,
    daysPerMonth: null, weekStartDay: null, calendarUid: null, themeHue: THEME_HUE,
    uidHighWaterMark: THE_TASK, importSeq: 0, carry: {}, carryElements: [],
  },
  calendars: [],
  tasks: [
    {
      uid: THE_TASK, wbsParentUid: null, wbsOrder: null, name: 'a task', start: null, finish: null,
      milestone: null, deadline: null, notes: null, calendarUid: null, actualStart: null,
      actualDuration: null, actualFinish: null, resume: null, resumeValid: null,
      percentComplete: null, fadeInDays: null, fadeOutDays: null, dependencies: [],
      carry: {}, carryElements: [],
    } as unknown as Task,
  ],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [
    {
      taskUid: THE_TASK, nameAnchor: null, nameAlign: null, shapeKind: null,
      milestoneGlyph: null, fillColor: null, strokeColor: null, lineWeight: null,
    } as unknown as TaskVisual,
  ],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const nested = (flat: Readonly<Record<string, unknown>>): DocumentSettings => {
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
  return out as unknown as DocumentSettings
}

const SETTINGS = nested(SETTINGS_DEFAULTS as Readonly<Record<string, unknown>>)

const HOLDING_THE_TASK: Selection = selectionWith(emptySelection(), { kind: 'task', uid: THE_TASK })

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null, openedFileName: null, fileSavedAt: null,
    fileNeverSavedText: '', commands: [], language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const HEADING_MARK = 'HelpHeadingMarkForDfc587'

const entrancesIn = (root: FakeElement): readonly string[] =>
  selfAndDescendants(root)
    .map((one) => one.getAttribute('data-icon'))
    .filter((one): one is string => one !== null)

function innermostShowing(root: FakeElement, text: string): FakeElement {
  const found = selfAndDescendants(root).filter(
    (one) => one.textContent.trim() === text && !one.children.some((child) => child.textContent.trim() === text),
  )
  if (found.length === 0) throw new Error(`nothing shows "${text}": ${whatWasDrawn(root)}`)
  return found[0] as FakeElement
}

function commonAncestor(one: FakeElement, other: FakeElement): FakeElement {
  const chain = new Set<FakeElement>()
  for (let at: FakeElement | null = other; at !== null; at = at.parentNode) chain.add(at)
  for (let at: FakeElement | null = one; at !== null; at = at.parentNode) if (chain.has(at)) return at
  throw new Error('the two nodes share no ancestor')
}

function drawnHelp(language: DisplayLanguage): FakeElement {
  const state = screenStateWithSurface(emptyScreenState(), HELP_SURFACE)
  const modal = openModalFromScreenState(state, ONE_TASK, sessionOf({ language }))
  if (modal === null) throw new Error('the help is open but nothing describes it')
  const built = wire(THEME, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, language, openModal: { ...modal, heading: HEADING_MARK } as OpenModal })
  return oneByRole(built.root(), HELP_SURFACE)
}

function helpTitleRow(help: FakeElement, language: DisplayLanguage): FakeElement {
  const row = commonAncestor(innermostShowing(help, HEADING_MARK), innermostShowing(help, legendWord(language)))
  expect(row, `${language}: the title and the legend share a row inside the help`).not.toBe(help)
  return row
}

function drawnPanel(showing: 'selection' | 'documentSettings'): FakeElement {
  const panel = propertiesPanelFromSelection(ONE_TASK, SETTINGS, HOLDING_THE_TASK, sessionOf({ propertiesShowing: showing }))
  if (panel === null) throw new Error(`the panel is showing ${showing} but nothing describes it`)
  const built = wire(THEME, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: panel as PropertiesPanel })
  return oneByRole(built.root(), PANEL_SURFACE)
}

describe('DFC-587 premises read from the manuscript', () => {
  it('T-109 places the legend on the help and at least the close entrance on the panel', () => {
    expect(HELP_SURFACE).toBe('Help Modal')
    expect(rowsPlacedOn(HELP_SURFACE)).toContain(CLOSE_ROW)
    expect(PANEL_ROWS).toContain(CLOSE_ROW)
    for (const language of LANGUAGES) expect(legendWord(language), language).not.toBe('')
  })
})

describe('DFC-587 help title row: the entrances drawn on it', () => {
  it('FR-036 (MUST): ヘルプの題の行は、左から、題 … 凡例（`IC-102`）・表示言語の切替（`FR-038` の `IC-21`）・閉じる入口（`IC-52`）の順に並べ、閉じる入口を右端に置くこと（MUST）', () => {
    for (const language of LANGUAGES) {
      const row = helpTitleRow(drawnHelp(language), language)
      const entrances = entrancesIn(row)
      expect(entrances.filter((one) => one === CLOSE_ROW).length, `${language}: ${whatWasDrawn(row)}`).toBe(1)
      expect(entrances[entrances.length - 1], `${language}: ${whatWasDrawn(row)}`).toBe(CLOSE_ROW)
    }
  })
})

describe('DFC-587 Properties Panel: the entrances drawn on it', () => {
  it('FR-029 (MUST): アイコンの名簿と置き場は `_assets/tbl-glossary.md` の 表 T-109 に、各アイコンの図形は同書の 図 F-019 に従うこと（MUST）', () => {
    for (const showing of ['selection', 'documentSettings'] as const) {
      const panel = drawnPanel(showing)
      const entrances = entrancesIn(panel)
      for (const row of PANEL_ROWS) expect(entrances, `${showing} ${row}: ${whatWasDrawn(panel)}`).toContain(row)
    }
  })

  it('FR-029 (MUST NOT): 同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）', () => {
    for (const showing of ['selection', 'documentSettings'] as const) {
      const panel = drawnPanel(showing)
      const entrances = entrancesIn(panel)
      for (const row of PANEL_ROWS) {
        expect(entrances.filter((one) => one === row).length, `${showing} ${row}: ${whatWasDrawn(panel)}`).toBe(1)
      }
    }
  })
})
