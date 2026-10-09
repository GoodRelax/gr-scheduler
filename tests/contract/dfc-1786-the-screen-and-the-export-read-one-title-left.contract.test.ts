// DFC-1786: BR-2 / EP-1 -- the header the application builds from a document puts the Document Title at one left, and the screen and the export both read it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import type {
  AppHeaderItems,
  TaskGroupPanel,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { appHeaderStyle, fillAppHeader } from '../../src/framework/dom-screen-surface/app-header-drawing'
import { stage, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { settingDefaultOf } from '../fixtures/setting-default'
import { bare, specTable, unbroken } from './spec-table'
import { templateDocument } from './w3-t3-frame-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const BR_2_TITLE_LEFT = '`Document Title` の左端は、席の右に `BR-7` の縦線とその両脇の隔たりを置いた右とすること（MUST）'
const BR_2_NO_MEASURING = '⛔ 字の実寸を測って題を置いてはならない（MUST NOT）'
const EP_1_ONE_ROW = '字の大きさと左の余白は、画面と書き出しが同じ 1 つの行を読むこと（MUST）'
const EP_1_NO_EXPORT_CONSTANT = '⛔ **書き出し専用の定数を持ってはならない（MUST NOT）**'

describe('DFC-1786 the manuscript these cases are driven by', () => {
  it('BR-2 and EP-1 still say it', () => {
    for (const clause of [BR_2_TITLE_LEFT, BR_2_NO_MEASURING, EP_1_ONE_ROW, EP_1_NO_EXPORT_CONSTANT]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })
})

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const setting = (id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(rowOf('T-206', id).cells[1] ?? ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`table T-206 row ${id} states no number`)
  return value
}

// see BR-2
const TITLE_LEFT = (3 * setting('S-226') + setting('S-490') * setting('S-462')) * setting('S-235') + setting('S-492')
const SEAT = setting('S-490') * setting('S-462') * setting('S-235')

const TITLE = 'Plan of record'
const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'en', helpLanguage: 'en' },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const SETTINGS = ((): DocumentSettings => {
  const heads = new Set(Object.keys(SETTINGS_DEFAULTS).map((key) => key.split('.')[0] as string))
  const built: Record<string, unknown> = {}
  for (const head of heads) built[head] = settingDefaultOf(head)
  built['displayScale'] = DEFAULT_DISPLAY_SCALE
  return built as unknown as DocumentSettings
})()

// WHY: the items are built the way the application builds them from a document, not written out by hand.
function builtItems(): AppHeaderItems {
  const document = templateDocument()
  const schedule = { ...document.schedule, project: { ...document.schedule.project, title: TITLE } }
  return appHeaderItemsFromDocument(schedule, SETTINGS, SESSION, READINGS)
}

const px = (value: string | undefined): number => Number((value ?? '').replace('px', ''))

// see BR-2, BR-7
// WHY: the left of the title strip is the header padding, the seat, the divider and the two gaps beside it, as the header lays them out.
function titleLeftOnTheScreen(items: AppHeaderItems): number {
  const built = stage()
  const header = built.host.createElement('div') as unknown as FakeElement
  header.setAttribute('data-role', 'App Header')
  header.setAttribute('style', appHeaderStyle())
  fillAppHeader(built.host, header as unknown as HTMLElement, items, new Map())
  const all = [header, ...header.children.flatMap(function walk(one: FakeElement): FakeElement[] {
    return [one, ...one.children.flatMap(walk)]
  })]
  const byRole = (role: string): FakeElement => {
    const found = all.find((one) => one.getAttribute('data-role') === role)
    if (found === undefined) throw new Error(`premise: the header draws ${role}`)
    return found
  }
  const seat = byRole('Branding').parentNode as FakeElement
  const divider = byRole('Branding Divider')
  const gap = px(styleMap(divider).get('margin-inline'))
  return px(styleMap(header).get('padding-left')) + px(styleMap(seat).get('width')) + gap + px(styleMap(divider).get('width')) + gap
}

function titleLeftInTheExport(items: AppHeaderItems): number {
  const view = {
    language: 'en',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] } as unknown as ScreenFrame,
    appHeaderItems: items,
    taskGroupPanel: { pinnedTitles: [], titles: [] } as unknown as TaskGroupPanel,
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  } as unknown as ScreenView
  const scene: ExportScene = {
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    regions: regionsFromScreen({ width: 1920, height: 1080, appHeaderHeight: 37, scrollbarThickness: 8, propertyPanelWidth: 0 }, SETTINGS),
    screenView: view,
    settings: SETTINGS,
    themePreference: 'light',
    themeHue: 214,
  }
  const answer = exportSvg(scene)
  if (!answer.ok) throw new Error('exportSvg refused the fixture')
  const tag = new RegExp(`<text\\b([^>]*)>${TITLE}</text>`).exec(answer.svg)?.[1]
  if (tag === undefined) throw new Error('EP-1: the export draws no Document Title')
  const x = Number(/\sx="([^"]*)"/.exec(tag)?.[1])
  // WHY: the picture is scaled to the export canvas width; the screen's pixels are recovered by the same ratio.
  const widthOfPicture = Number(/viewBox="0 0 ([\d.]+)/.exec(answer.svg)?.[1])
  const ratio = widthOfPicture / (scene.regions.scheduleCanvas.x + scene.regions.scheduleCanvas.width)
  return x / ratio - scene.regions.appHeader.x
}

describe('BR-2 / EP-1 (MUST): the header built from a document puts the title at one left that the screen and the export both read (DFC-1786)', () => {
  it('the screen puts the title at (3 x S-226 + S-490 x S-462) x S-235 + S-492', () => {
    expect(titleLeftOnTheScreen(builtItems())).toBeCloseTo(TITLE_LEFT, 4)
  })

  it('the seat is S-490 x S-462 x S-235 wide', () => {
    const built = stage()
    const header = built.host.createElement('div') as unknown as FakeElement
    header.setAttribute('data-role', 'App Header')
    header.setAttribute('style', appHeaderStyle())
    fillAppHeader(built.host, header as unknown as HTMLElement, builtItems(), new Map())
    const walk = (one: FakeElement): FakeElement[] => [one, ...one.children.flatMap(walk)]
    const branding = walk(header).find((one) => one.getAttribute('data-role') === 'Branding')
    expect(px(styleMap(branding?.parentNode as FakeElement).get('width'))).toBeCloseTo(SEAT, 4)
  })

  it('the export puts the title at the same left as the screen, without measuring a glyph', () => {
    const items = builtItems()
    expect(titleLeftInTheExport(items)).toBeCloseTo(titleLeftOnTheScreen(items), 1)
  })

  it('the export puts the title at the BR-2 left itself', () => {
    expect(titleLeftInTheExport(builtItems())).toBeCloseTo(TITLE_LEFT, 1)
  })
})
