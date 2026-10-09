// DFC-1353, DFC-1659, DFC-2164: only the Document Title is bold (S-463); every other letter is S-529, table heads included (FR-039).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import type { ScreenView, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import { searchPanelFromSession } from '../../src/adapter/screen-renderer/search-panel'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenRect, ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { searchTableElement } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { selfAndDescendants, stage, styleMap, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'

const weightRow = (id: string): number => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  const found = /\d+/.exec(bare(row?.by['既定'] ?? ''))
  if (found === null) throw new Error(`table T-206 row ${id} states no weight`)
  return Number(found[0])
}

// see T-206
const S_463 = weightRow('S-463')
const S_529 = weightRow('S-529')

// WHY: the browser makes these bold unless a rule says otherwise, which is what FR-039 asks to be put back.
const BOLD_BY_DEFAULT = new Set(['TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'B', 'STRONG'])

const numberOfWeight = (written: string): number => {
  const flat = written.trim().toLowerCase()
  if (flat === 'normal') return 400
  if (flat === 'bold') return 700
  return Number(flat)
}

// WHY: an explicit weight on the element or the nearest ancestor that states one, else the browser's own for the tag.
const weightOf = (element: FakeElement): number => {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const written = styleMap(at).get('font-weight')
    if (written !== undefined) return numberOfWeight(written)
    if (BOLD_BY_DEFAULT.has(at.tagName)) return 700
  }
  return 400
}

const VIEW = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: 'the document title',
    openedFileName: 'a-file.grs.json',
    fileSavedAt: '2026-08-29T01:02:03Z',
    fileSavedByteLength: 48213,
    fileNeverSavedText: 'never saved',
    commands: [],
    language: 'ja',
  },
  taskGroupPanel: {
    pinnedTitles: [],
    titles: [
      {
        groupId: 'g1', depth: 1, fontPx: 20, indentPx: 4, box: { x: 0, y: 100, width: 300, height: 40 },
        label: 'a task group name', wholeLabel: 'a task group name', isLabelTruncated: false,
        expander: { canOpen: true, canClose: true, canCloseBelow: false }, isPinned: false, isSelected: false,
      },
    ],
  },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [{ anchor: { kind: 'task', taskUid: 1 }, text: 'first line\nsecond line', assignment: null, at: { x: 40, y: 60 } }],
} as unknown as ScreenView

const drawnScreen = () => {
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 37 })
  surfaceOf(built).showScreenView(VIEW)
  return selfAndDescendants(built.root())
}

const hasOwnText = (element: FakeElement): boolean =>
  element.childNodes.some((one) => 'data' in one && typeof one.data === 'string' && one.data.trim() !== '')

describe('DFC-1353: the Document Title is drawn S-463 bold on the screen and in the picture (FR-039)', () => {
  it('FR-039 premise: S-463 is a weight of its own, apart from S-529', () => {
    expect(S_463).toBeGreaterThan(S_529)
  })

  it('FR-039 the Document Title on the screen has the S-463 weight', () => {
    const title = drawnScreen().find((one) => one.getAttribute('data-role') === 'Document Title')
    expect(title).toBeDefined()
    expect(weightOf(title as FakeElement)).toBe(S_463)
  })

  it('FR-039 / EP-1 the Document Title in the exported picture has the S-463 weight', () => {
    const settings = SETTINGS_DEFAULTS as unknown as DocumentSettings
    const regions: ScreenRegions = {
      appHeader: { x: 0, y: 0, width: 1000, height: 56 },
      scheduleCanvas: { x: 0, y: 56, width: 1000, height: 744 },
      taskGroupPanel: { x: 0, y: 56, width: settings.taskGroupPanelWidth, height: 744 },
      timeRuler: { x: settings.taskGroupPanelWidth, y: 56, width: 1000 - settings.taskGroupPanelWidth, height: settings.rulerHeight },
      propertiesPanel: { x: 1000, y: 56, width: 0, height: 744 },
      taskGroupArea: { x: settings.taskGroupPanelWidth, y: 56 + settings.rulerHeight, width: 1000 - settings.taskGroupPanelWidth, height: 700 },
    }
    const scene = {
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="11" r="3"/></svg>',
      regions,
      screenView: VIEW,
      settings,
      themePreference: 'light',
      themeHue: 214,
    } as unknown as ExportScene
    const answer = exportSvg(scene)
    if (!answer.ok) throw new Error('exportSvg refused a small picture')
    const found = /<text([^<>]*)>the document title<\/text>/.exec(answer.svg)
    expect(found, 'the picture draws the title').not.toBeNull()
    expect(Number(/font-weight="([^"]*)"/.exec(found?.[1] ?? '')?.[1])).toBe(S_463)
  })
})

describe('DFC-1659: every other letter on the screen is S-529 (FR-039)', () => {
  it('FR-039 premise: the drawn screen holds text outside the Document Title', () => {
    const texts = drawnScreen().filter((one) => hasOwnText(one) && one.getAttribute('data-role') !== 'Document Title')
    expect(texts.length).toBeGreaterThan(2)
  })

  it('FR-039 no element but the Document Title draws its letters in any weight but S-529', () => {
    const odd = drawnScreen()
      .filter((one) => hasOwnText(one) && one.getAttribute('data-role') !== 'Document Title')
      .filter((one) => weightOf(one) !== S_529)
      .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? ''}] ${weightOf(one)}`)
    expect(odd).toEqual([])
  })

  it('FR-039 a heading, table head or bold tag never keeps the browser weight', () => {
    const left = drawnScreen()
      .filter((one) => BOLD_BY_DEFAULT.has(one.tagName) && styleMap(one).get('font-weight') === undefined)
      .map((one) => one.tagName)
    expect(left).toEqual([])
  })
})

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose

const SEARCH_SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: [1, 2, 3].map((uid) => ({
    ...firstOf('tasks'),
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name: `task ${uid}`,
    start: `2026-01-0${uid}T00:00:00`,
    finish: `2026-01-1${uid}T00:00:00`,
    milestone: false,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    dependencies: [],
  })),
  taskGroups: [{ ...firstOf('taskGroups'), id: 'task-group-top', parentId: null, order: 0, label: 'Program', derivedFromTaskUid: null, treeState: 'expanded' }],
  taskGroupMembers: [1, 2, 3].map((uid) => ({ taskUid: uid, groupId: 'task-group-top' })),
  resources: [],
  assignments: [],
  commentBoxes: [],
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }

const searchViewOf = (): SearchPanelView => {
  const shown = advanceScreenSession(emptyScreenSession, { type: 'searchEntryPressed' } as unknown as SessionEvent).state
  const session = { ...shown, screen: { ...shown.screen, screenLanguage: 'ja', helpLanguage: 'ja' } } as unknown as ScreenSession
  const view = searchPanelFromSession(session, emptySearchPanelSession, SEARCH_SCHEDULE, CANVAS)
  if (view === null) throw new Error('a shown search panel has a view')
  return view
}

describe('DFC-2164: the heads of the Search Panel table are drawn S-529 too (FR-039)', () => {
  const heads = (): readonly FakeElement[] => {
    const box = searchTableElement(stage().host, searchViewOf(), 14) as unknown as FakeElement
    return selfAndDescendants(box).filter((one) => one.tagName === 'TH')
  }

  it('FR-039 premise: the table has heads', () => {
    expect(heads().length).toBeGreaterThan(0)
  })

  it('FR-039 every head of the table is drawn in the S-529 weight', () => {
    expect(heads().map(weightOf)).toEqual(heads().map(() => S_529))
  })
})
