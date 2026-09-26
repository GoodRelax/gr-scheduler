// CR-585 spec-only tests: the theme hue swatches are the one exception and keep their hues under monochrome.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  AppHeaderItems,
  PropertiesPanel,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  descendants,
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const CLAUSE_MONOCHROME =
  '⭐ モノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、同書の 表 T-236 のすべての行を（色相の欄が ○ の行も — の行も）、日程の図の中にも画面の枠（罫 `S-149`・パネルの地 `S-150`・強調 `S-151`・掴み代の印 `S-231`・文字 `S-147`・押下の緑 `S-183` ほか）にも、無彩色にして描くこと（MUST）'
const CLAUSE_EXCEPTION =
  '⚠️ 例外は、上の段落のテーマの色相の欄の見本だけである —— 見本は 表 T-305 の各行の色相で解いた `S-151` で塗り、モノクロを効かせない（上の段落の MUST NOT）。'
const CLAUSE_NO_MONOCHROME = '⛔ 見本にモノクロ（`S-74`）を効かせてはならない（MUST NOT）'

const K_60 = 'K-60'
const PREFERENCES = ['light', 'dark'] as const
type Preference = (typeof PREFERENCES)[number]
const CHANNEL_TOLERANCE = 1
const CHANNEL_MAX = 255
const PERCENT = 100
const HUE_TURN = 360
const SEXTANT = 30
const WHEEL = 12

// see T-216
const S_73_DEFAULT = Number(bare(specTable('T-216').rows.find((one) => one.id === 'S-73')?.by['既定'] ?? ''))

// see T-305
const ROSTER = specTable('T-305').rows.map((row) => {
  const cell = row.by['色相'] ?? ''
  return { rowId: row.id, hue: cell.includes('S-73') ? S_73_DEFAULT : Number(bare(cell)) }
})

// see T-236
function s151(preference: Preference): { readonly s: number; readonly l: number } {
  const row = specTable('T-236').rows.find((one) => one.id === 'S-151')
  const cell = bare(row?.by[preference === 'light' ? '明るいテーマ' : '暗いテーマ'] ?? '')
  const found = /^hsl\(H\s+([\d.]+)%\s+([\d.]+)%\)$/.exec(cell)
  if (found === null) throw new Error(`table T-236 S-151 (${preference}) is not hsl(H s% l%): ${cell}`)
  return { s: Number(found[1]), l: Number(found[2]) }
}

type Rgb = readonly [number, number, number]

function rgbOfHsl(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
  const s = saturationPercent / PERCENT
  const l = lightnessPercent / PERCENT
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + hue / SEXTANT) % WHEEL
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * CHANNEL_MAX
  }
  return [channel(0), channel(8), channel(4)]
}

function rgbOf(paint: string): Rgb | null {
  const text = paint.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex !== null) {
    const n = Number.parseInt(hex[1] ?? '', 16)
    return [(n >> 16) & CHANNEL_MAX, (n >> 8) & CHANNEL_MAX, n & CHANNEL_MAX]
  }
  const hsl = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(text)
  if (hsl !== null) {
    return rgbOfHsl(((Number(hsl[1]) % HUE_TURN) + HUE_TURN) % HUE_TURN, Number(hsl[2]), Number(hsl[3]))
  }
  const rgb = /^rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/.exec(text)
  return rgb === null ? null : [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
}

const wantedOf = (hue: number, preference: Preference): Rgb => {
  const { s, l } = s151(preference)
  return rgbOfHsl(hue, s, l)
}

const sameRgb = (left: Rgb, right: Rgb): boolean =>
  left.every((value, index) => Math.abs(value - (right[index] ?? Number.NaN)) <= CHANNEL_TOLERANCE)

const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const TEMPLATE = templateDocument()

function settingsPanel(preference: Preference, hue: number): PropertiesPanel {
  const schedule = { ...TEMPLATE.schedule, project: { ...TEMPLATE.schedule.project, themeHue: hue } }
  const settings = { ...TEMPLATE.documentSettings, themeMonochrome: true }
  const session = {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: 'ja',
      helpLanguage: 'ja',
      themePreference: preference,
      propertiesPanelContentState: { kind: 'documentSettingsDisplayed', returnSubject: null },
    },
  } as unknown as ScreenSession
  const readings = {
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    isDialogueFieldVisible: true,
    pointer: null,
    pointerRestedMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: preference,
    themeHue: hue,
    isMilestoneListOpen: false,
    isPaletteMinimised: false,
    dualCursorFollowing: null,
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesSubject: null,
    propertiesShowing: 'documentSettings',
    notices: [],
    confirmation: null,
    rowBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  } as unknown as ScreenViewReadings
  const panel = propertiesPanelFromSelection(schedule, settings as never, emptySelection(), session, readings)
  if (panel === null) throw new Error('premise: the panel showing the document settings is drawn')
  return panel
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW = {
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
} as unknown as ScreenView

// see U-25
const U_25 = bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')

const HEADER_HEIGHT = { 'App Header': 37 }

// WHY: the fixture's paintedGround drops the spaces an hsl() needs, so the ground is read here.
function groundsOf(built: Stage, element: FakeElement): string[] {
  const style = styleMap(element)
  const written = ['background-color', 'background', 'fill']
    .map((property) => style.get(property) ?? '')
    .concat(element.getAttribute('fill') ?? '')
    .filter((one) => one.trim() !== '')
  return written.map((one) => {
    const named = /^var\((--[A-Za-z0-9-]+)\)$/.exec(one.trim())
    return named === null ? one.trim() : (styleMap(built.root()).get(named[1] ?? '') ?? one).trim()
  })
}

// WHY: the swatch buttons are drawn on a surface whose own theme has monochrome on, so a greying
// applied by the chrome (say, a var() of a greyed row) would reach them.
function drawnSwatchGrounds(preference: Preference, hue: number): string[][] {
  const built = wire({ preference, hue, monochrome: true }, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: settingsPanel(preference, hue) })
  const panel = oneByRole(built.root(), U_25)
  const inField = (node: FakeElement): boolean => {
    let at: FakeElement | null = node
    while (at !== null && at !== panel) {
      if (at.getAttribute('data-field-row') === K_60) return true
      at = at.parentNode
    }
    return false
  }
  return descendants(panel)
    .filter(inField)
    .filter((one) => one.tagName === 'BUTTON' && one.getAttribute('data-icon') === null)
    .map((button) => selfAndDescendants(button).flatMap((one) => groundsOf(built, one)))
}

describe(`CR-585 (6) FR-041 "${CLAUSE_EXCEPTION}"`, () => {
  it('every quoted clause is in the specification as written', () => {
    for (const clause of [CLAUSE_MONOCHROME, CLAUSE_EXCEPTION, CLAUSE_NO_MONOCHROME]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })

  for (const preference of PREFERENCES) {
    it(`"${CLAUSE_NO_MONOCHROME}" -- ${preference}, S-74 on in the document and on the screen theme`, () => {
      const grounds = drawnSwatchGrounds(preference, S_73_DEFAULT)
      expect(grounds, 'one swatch button per T-305 row').toHaveLength(ROSTER.length)
      ROSTER.forEach((row, index) => {
        const wanted = wantedOf(row.hue, preference)
        const found = (grounds[index] ?? []).some((one) => {
          const rgb = rgbOf(one)
          return rgb !== null && sameRgb(rgb, wanted)
        })
        expect(found, `${row.rowId} (hue ${row.hue}, ${preference}): ${JSON.stringify(grounds[index])} holds no rgb(${wanted.map(Math.round).join(',')})`).toBe(true)
      })
    })
  }
})
