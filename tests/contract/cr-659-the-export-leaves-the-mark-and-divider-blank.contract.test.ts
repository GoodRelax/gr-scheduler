// CR-659 spec-only cases: BR-6 / EP-1 -- the export draws neither the GRS mark nor the divider and puts the title where BR-2 puts it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import { brandingPlaceOf } from '../../src/adapter/screen-renderer/app-header-items'
import type { AppHeaderItems, TaskGroupPanel, ScreenFrame, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { settingDefaultOf } from '../fixtures/setting-default'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const BR_6 = '| BR-6 | 書き出し | 書き出す絵とクリップボードへコピーする絵での扱いは、表 T-076 の `EP-1` に従うこと（MUST）'
const BR_6_BLANK = '`Branding` も `BR-7` の縦線も描かず、席と縦線の分を空白のまま残し、`Document Title` を画面と同じ位置に置く。'
const EP_1_SAME_ROWS = '席の幅は同書の 表 T-206 の `S-490` と `S-462` から、隔たりは `S-226` から、太さは `S-492` から決まり、画面も書き出しも同じ行を読む。'
const EP_1_NO_DIVIDER = '⭐ 縦線（表 T-349 の `BR-7`）も描かず、その分も空白のまま残す'
const BR_2_THREE_INSETS = '題の左の余白は、`S-226` の 3 つ分（帯の左端から席まで、縦線の左、縦線の右）と席の幅を足して `S-235` を掛け、縦線の太さ（同表の `S-492`）を足した長さであり'

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

// see BR-2, EP-1
const TITLE_LEFT = (3 * setting('S-226') + setting('S-490') * setting('S-462')) * setting('S-235') + setting('S-492')

// see T-236
const colourIn = (id: string, column: string, hue: number): string => {
  const cell = (rowOf('T-236', id).by[column] ?? '').trim()
  const named = /^`(S-\d+)`/.exec(cell)
  if (named !== null) return colourIn(named[1] as string, column, hue)
  return bare(cell).replace(/`/g, '').replace(/\bH\b/g, String(hue))
}

const HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))

type DisplayWords = { readonly branding: readonly { readonly part: string; readonly text: { readonly ja: string; readonly en: string } }[] }
const LOGO = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as DisplayWords
).branding.find((one) => one.part === 'logo')?.text.en ?? ''

const TITLE = 'Plan of record'

const ITEMS: AppHeaderItems = {
  brandingText: LOGO,
  // see BR-2, EP-1
  ...brandingPlaceOf(),
  documentTitle: TITLE,
  openedFileName: 'plan.json',
  fileSavedAt: '2026-05-04T03:02:01Z',
  fileSavedByteLength: 123456,
  fileNeverSavedText: 'not saved',
  commands: [],
  language: 'en',
}

const VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as unknown as ScreenFrame,
  appHeaderItems: ITEMS,
  taskGroupPanel: { pinnedTitles: [], titles: [] } as unknown as TaskGroupPanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const SETTINGS = ((): DocumentSettings => {
  const heads = new Set(Object.keys(SETTINGS_DEFAULTS).map((key) => key.split('.')[0] as string))
  const built: Record<string, unknown> = {}
  for (const head of heads) built[head] = settingDefaultOf(head)
  built['displayScale'] = DEFAULT_DISPLAY_SCALE
  return built as unknown as DocumentSettings
})()

// see S-81
const S_81_WIDTH = Number(/\d+/.exec(bare(rowOf('T-204', 'S-81').by['既定'] ?? ''))?.[0])

const sceneOf = (preference: 'light' | 'dark'): ExportScene => ({
  svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  regions: regionsFromScreen({ width: 1920, height: 1080, appHeaderHeight: 37, scrollbarThickness: 8, propertyPanelWidth: 0 }, SETTINGS),
  screenView: VIEW,
  settings: SETTINGS,
  themePreference: preference,
  themeHue: HUE,
})

const pictureOf = (scene: ExportScene): string => {
  const answer = exportSvg(scene)
  if (!answer.ok) throw new Error('exportSvg refused the fixture')
  return answer.svg
}

describe('CR-659 -- the clauses these cases are driven by', () => {
  it('BR-2, BR-6 and EP-1 still read this way', () => {
    for (const clause of [BR_6, BR_6_BLANK, EP_1_SAME_ROWS, EP_1_NO_DIVIDER, BR_2_THREE_INSETS]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
    expect(LOGO, 'premise: the dictionary holds the GRS word').not.toBe('')
  })
})

describe(`CR-659 BR-6 "${BR_6}"`, () => {
  for (const preference of ['light', 'dark'] as const) {
    it(`${preference}: the picture holds no GRS text and nothing in the divider colour`, () => {
      const svg = pictureOf(sceneOf(preference))
      const texts = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((one) => one[1] ?? '')
      expect(texts.filter((one) => one.includes(LOGO)), 'EP-1: Branding is not drawn').toEqual([])
      const divider = colourIn('S-493', preference === 'dark' ? '暗いテーマ' : '明るいテーマ', HUE)
      expect(divider, 'premise: S-493 resolves to a colour').not.toBe('')
      const strokes = [...svg.matchAll(/<(?:line|rect|path)\b[^>]*>/g)].map((one) => one[0])
      expect(strokes.filter((tag) => tag.includes(`"${divider}"`)), 'EP-1: no divider line').toEqual([])
    })

    it(`${preference}: the title x is (3 x S-226 + S-490 x S-462) x S-235 + S-492 times the picture ratio`, () => {
      const scene = sceneOf(preference)
      const svg = pictureOf(scene)
      const tag = new RegExp(`<text\\b([^>]*)>${TITLE}</text>`).exec(svg)?.[1]
      expect(tag, 'EP-1: the Document Title is drawn').toBeDefined()
      const x = Number(/\sx="([^"]*)"/.exec(tag ?? '')?.[1])
      const ratio = S_81_WIDTH / (scene.regions.scheduleCanvas.x + scene.regions.scheduleCanvas.width)
      expect(x).toBeCloseTo((scene.regions.appHeader.x + TITLE_LEFT) * ratio, 1)
    })
  }
})
