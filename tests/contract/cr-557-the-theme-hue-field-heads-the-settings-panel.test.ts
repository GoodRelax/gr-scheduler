// CR-557 seams S-2 and S-4: the theme hue field of the document settings panel, from docs/spec alone.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  AppHeaderItems,
  DisplayLanguage,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { propertiesPanelStyle } from '../../src/framework/dom-screen-surface/properties-panel-drawing'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  descendants,
  matches,
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly themeHues: readonly { readonly rowId: string; readonly text: Record<DisplayLanguage, string> }[]
  readonly settings: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[]
  readonly colourField: readonly { readonly part: string; readonly text: Record<DisplayLanguage, string> }[]
}

// WHY: CR-690 -- the place moved to table T-369 (FO-2, the first field under the GRS reset entrance FO-1).
const CLAUSE_FIRST_FIELD =
  '⭐ テーマ色を選ぶ入口は、文書の設定の面（`FR-072`、面を出す入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-17`）の欄とし、置き場は `FR-072` の 表 T-369 の `FO-2` とすること（MUST）'
const CLAUSE_ROWS_IN_ORDER =
  'その欄には 表 T-305 の行を同表の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-368` 個ずつ並べ、押された行の色相で 表 T-108 の `CM-5` を 1 回発行すること（MUST）。'
const CLAUSE_SWATCH_PAINT =
  '各行の見本は、その行の色相で解いた `_assets/tbl-settings.md` の 表 T-236 の `S-151` を、いま描いている明暗の値で塗ること（MUST）'
// WHY: CR-690 -- the field is the swatch rows alone; the chosen swatch is ringed and each swatch's tooltip is its word.
const CLAUSE_NAME_AND_VALUE = '⭐ 欄の名は `FR-038` の辞書が 表 T-104 の `K-60` に持つ語とし、欄は見本の段だけとして、見本の外に行の語を書かないこと（MUST）'
const CLAUSE_TOOLTIP = '各見本のツールチップは、辞書の `themeHues` のその行の語とすること（MUST）。'
const CLAUSE_NO_ROW =
  '⚠️ 等しい行が無いとき（`Agent API` やファイルが置いた値）は、どの見本も囲まず、見本の段の下に値を数で示す。'
const CLAUSE_NO_ENTRANCES =
  '⛔ この欄に、カスタムカラーの入口・透明・テーマ追随へ戻す入口（表 T-017b の `CV-9` と `FR-007` の「戻す入口」）を並べてはならない（MUST NOT）'
const CLAUSE_READ_ONLY = '⭐ パネルが文書の設定を出しているあいだ、その欄は読むだけとすること（MUST）。'
const CLAUSE_EXCEPTION =
  '⭐ ただし、別の要求がその入口を本面の欄として置いたときは、その欄だけは、その要求に従って選ばせること（MUST） —— `FR-041` のテーマ色の欄がこれである。'

const K_60 = 'K-60'
const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']
const PREFERENCES = ['light', 'dark'] as const
type Preference = (typeof PREFERENCES)[number]
const CHANNEL_TOLERANCE = 1
const CHANNEL_MAX = 255
const HUE_TURN = 360
const SEXTANT = 30
const WHEEL = 12
const HUE_OFF_THE_ROSTER = 200

// see T-216
const S_73_DEFAULT = Number(bare(specTable('T-216').rows.find((one) => one.id === 'S-73')?.by['既定'] ?? ''))

// see T-206
const S_368 = Number(bare(specTable('T-206').rows.find((one) => one.id === 'S-368')?.by['既定'] ?? ''))

// see T-305
const ROSTER = specTable('T-305').rows.map((row) => {
  const cell = row.by['色相'] ?? ''
  return { rowId: row.id, hue: cell.includes('S-73') ? S_73_DEFAULT : Number(bare(cell)) }
})

// see T-104
const fieldNameOf = (language: DisplayLanguage): string =>
  WORDS.settings.find((one) => one.rowId === K_60)?.label[language] ?? `(no dictionary word for ${K_60})`

// see T-305
const hueWordOf = (rowId: string, language: DisplayLanguage): string =>
  WORDS.themeHues.find((one) => one.rowId === rowId)?.text[language] ?? `(no dictionary word for ${rowId})`

// see T-236
function s151Formula(preference: Preference): { readonly s: number; readonly l: number } {
  const row = specTable('T-236').rows.find((one) => one.id === 'S-151')
  const cell = bare(row?.by[preference === 'light' ? '明るいテーマ' : '暗いテーマ'] ?? '')
  const found = /^hsl\(H\s+([\d.]+)%\s+([\d.]+)%\)$/.exec(cell)
  if (found === null) throw new Error(`table T-236 S-151 (${preference}) is not an hsl(H s% l%) formula: ${cell}`)
  return { s: Number(found[1]), l: Number(found[2]) }
}

type Rgb = readonly [number, number, number]

// see T-236
function rgbOfHsl(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
  const s = saturationPercent / 100
  const l = lightnessPercent / 100
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + hue / SEXTANT) % WHEEL
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * CHANNEL_MAX
  }
  return [channel(0), channel(8), channel(4)]
}

function rgbOfPaint(paint: string): Rgb | null {
  const text = paint.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex !== null) {
    const value = Number.parseInt(hex[1] ?? '', 16)
    return [(value >> 16) & CHANNEL_MAX, (value >> 8) & CHANNEL_MAX, value & CHANNEL_MAX]
  }
  const hsl = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(text)
  if (hsl !== null) {
    return rgbOfHsl(((Number(hsl[1]) % HUE_TURN) + HUE_TURN) % HUE_TURN, Number(hsl[2]), Number(hsl[3]))
  }
  const rgb = /^rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/.exec(text)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

// see CF-2, CF-3, S-525
// WHY: since CR-683 "solved" includes table T-366: CF-3's measured line puts k = 2 on TH-3..TH-5 (light) and TH-10 (dark).
const SHIFTED_ROWS: Readonly<Record<Preference, readonly string[]>> = { light: ['TH-3', 'TH-4', 'TH-5'], dark: ['TH-10'] }
const MEASURED_SHIFT = 2
const S_525_RATIO = 1

const expectedPaintOf = (hue: number, preference: Preference, rowId: string): Rgb => {
  const { s, l } = s151Formula(preference)
  const shift = SHIFTED_ROWS[preference].includes(rowId) ? MEASURED_SHIFT * S_525_RATIO : 0
  return rgbOfHsl(hue, s, l + (preference === 'dark' ? shift : -shift))
}

const sameRgb = (left: Rgb, right: Rgb): boolean =>
  left.every((value, index) => Math.abs(value - (right[index] ?? Number.NaN)) <= CHANNEL_TOLERANCE)

// WHY: seam S-2 names the swatch paint per row but not the member that carries it, so any
// string list of the roster's length whose every entry is a colour is taken as the paint.
function paintsOf(control: PropertyControl): readonly string[] {
  const places: unknown[] = [
    ...Object.values(control as unknown as Record<string, unknown>),
    ...Object.values((control.colour ?? {}) as unknown as Record<string, unknown>),
  ]
  const found = places.find(
    (one): one is readonly string[] =>
      Array.isArray(one) &&
      one.length === ROSTER.length &&
      one.every((entry) => typeof entry === 'string' && rgbOfPaint(entry) !== null),
  )
  if (found === undefined) {
    throw new Error(`seam S-2: the ${K_60} control carries no per-row swatch paint: ${JSON.stringify(control)}`)
  }
  return found
}

const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const TEMPLATE = templateDocument()

interface Look {
  readonly hue: number
  readonly language: DisplayLanguage
  readonly preference: Preference
  readonly monochrome: boolean
}

const PLAIN: Look = { hue: S_73_DEFAULT, language: 'ja', preference: 'light', monochrome: false }

function settingsPanel(look: Partial<Look> = {}): PropertiesPanel {
  const { hue, language, preference, monochrome } = { ...PLAIN, ...look }
  const schedule = { ...TEMPLATE.schedule, project: { ...TEMPLATE.schedule.project, themeHue: hue } }
  const settings = { ...TEMPLATE.documentSettings, themeMonochrome: monochrome }
  const session: ScreenSession = {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: language,
      helpLanguage: language,
      themePreference: preference,
      propertiesPanelContentState: { kind: 'documentSettingsDisplayed' },
    },
  } as unknown as ScreenSession
  const readings = {
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    isDialogueFieldVisible: true,
    pointer: null,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
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
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  } as unknown as ScreenViewReadings
  const panel = propertiesPanelFromSelection(schedule, settings as never, emptySelection(), session, readings)
  if (panel === null) throw new Error('premise: the panel showing the document settings is drawn')
  return panel
}

function hueField(panel: PropertiesPanel): PropertyField {
  const first = panel.fields[0]
  if (first === undefined) throw new Error('the document settings panel has no field at all')
  return first
}

function hueControl(panel: PropertiesPanel): PropertyControl {
  const field = hueField(panel)
  const control = field.controls[0]
  if (field.row !== K_60 || field.controls.length !== 1 || control === undefined) {
    throw new Error(`seam S-2: the first field is not ${K_60} with one control: ${JSON.stringify(field)}`)
  }
  return control
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
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

function drawnHueField(look: Partial<Look> = {}): FakeElement[] {
  const { hue, preference } = { ...PLAIN, ...look }
  const theme: ScreenTheme = { preference, hue }
  const built = wire(theme, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: settingsPanel(look) })
  const panel = oneByRole(built.root(), U_25)
  const inField = (node: FakeElement): boolean => {
    let at: FakeElement | null = node
    while (at !== null && at !== panel) {
      if (at.getAttribute('data-field-row') === K_60) return true
      at = at.parentNode
    }
    return false
  }
  return descendants(panel).filter(inField)
}

// WHY: the panel's own commands are icon entries (data-icon) and may be drawn beside the first
// field; they are not entrances of this field.
const buttonsOf = (field: readonly FakeElement[]): FakeElement[] =>
  field.filter((one) => one.tagName === 'BUTTON' && one.getAttribute('data-icon') === null)

const SELECTED_MARKS = ['aria-pressed', 'aria-checked', 'aria-selected', 'aria-current']

const isMarkedSelected = (node: FakeElement): boolean =>
  SELECTED_MARKS.some((name) => {
    const held = node.getAttribute(name)
    return held !== null && held !== 'false'
  }) || node.getAttribute('data-selected') !== null

function tracksOf(template: string): number {
  const repeated = /^repeat\(\s*(\d+)\s*,/.exec(template.trim())
  if (repeated !== null) return Number(repeated[1])
  let depth = 0
  let count = 0
  let inToken = false
  for (const character of template.trim()) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    const isGap = depth === 0 && /\s/.test(character)
    if (!isGap && !inToken) count += 1
    inToken = !isGap
  }
  return count
}

function columnsOfGrid(grid: FakeElement): number | null {
  const inline = styleMap(grid).get('grid-template-columns')
  if (inline !== undefined) return tracksOf(inline)
  for (const rule of propertiesPanelStyle().split('}')) {
    const [selectors, body] = rule.split('{')
    if (selectors === undefined || body === undefined) continue
    const declared = /grid-template-columns\s*:\s*([^;]+)/.exec(body)
    if (declared === null) continue
    const selected = selectors.split(',').some((one) => {
      const last = one.trim().split(/\s+/).pop() ?? ''
      const parts = last.match(/\[[^\]]+\]|\.[\w-]+|^[a-z]+/gi) ?? []
      return parts.length > 0 && parts.every((part) => matches(grid, part))
    })
    if (selected) return tracksOf(declared[1] ?? '')
  }
  return null
}

describe('CR-557 -- the manuscript still says what these cases read', () => {
  it.each([
    CLAUSE_FIRST_FIELD,
    CLAUSE_ROWS_IN_ORDER,
    CLAUSE_SWATCH_PAINT,
    CLAUSE_NAME_AND_VALUE,
    CLAUSE_TOOLTIP,
    CLAUSE_NO_ROW,
    CLAUSE_NO_ENTRANCES,
    CLAUSE_READ_ONLY,
    CLAUSE_EXCEPTION,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('premise: S-368 is a positive integer and the S-73 default is on the roster', () => {
    expect(Number.isInteger(S_368) && S_368 > 0).toBe(true)
    expect(ROSTER[0]?.hue).toBe(S_73_DEFAULT)
    expect(ROSTER.some((one) => one.hue === HUE_OFF_THE_ROSTER)).toBe(false)
  })
})

describe('CR-557 S-2 -- the first field of the document settings panel is K-60', () => {
  it(`FR-041 "${CLAUSE_FIRST_FIELD}"`, () => {
    const panel = settingsPanel()
    expect(panel.showing).toBe('documentSettings')
    expect(panel.fields[0]?.row).toBe(K_60)
    expect(panel.fields.filter((one) => one.row === K_60)).toHaveLength(1)
  })

  it.each(LANGUAGES)(`FR-041 "${CLAUSE_NAME_AND_VALUE}" -- %s`, (language) => {
    const field = hueField(settingsPanel({ language }))
    expect(field.name).toBe(fieldNameOf(language))
    expect(field.isEditable).toBe(true)
  })

  it.each(ROSTER.map((one) => [one.rowId, one.hue] as const))(
    `FR-041 "${CLAUSE_TOOLTIP}" -- the swatch holding themeHue %s's value carries its word when themeHue is %s`,
    (rowId, hue) => {
      for (const language of LANGUAGES) {
        const control = hueControl(settingsPanel({ hue, language }))
        const at = (control.choiceValues ?? []).indexOf(control.text)
        expect(at, 'the stored hue is one swatch value').toBeGreaterThanOrEqual(0)
        expect(control.choices?.[at]).toBe(hueWordOf(rowId, language))
      }
    },
  )

  it.each(LANGUAGES)(`FR-041 "${CLAUSE_ROWS_IN_ORDER}" -- choices and values in T-305 order, %s`, (language) => {
    const control = hueControl(settingsPanel({ language }))
    expect(control.key).toEqual({ holder: 'project', column: 'themeHue' })
    expect(control.choiceValues).toEqual(ROSTER.map((one) => String(one.hue)))
    expect(control.choices).toEqual(ROSTER.map((one) => hueWordOf(one.rowId, language)))
  })

  it(`FR-041 "${CLAUSE_NO_ROW}" -- themeHue ${HUE_OFF_THE_ROSTER} is shown as the number`, () => {
    const field = hueField(settingsPanel({ hue: HUE_OFF_THE_ROSTER }))
    expect(field.text).toBe(String(HUE_OFF_THE_ROSTER))
    expect(hueControl(settingsPanel({ hue: HUE_OFF_THE_ROSTER })).choiceValues).toEqual(ROSTER.map((one) => String(one.hue)))
  })
})

describe('CR-557 S-2 -- each swatch is S-151 solved at its row hue (table T-236)', () => {
  for (const preference of PREFERENCES) {
    it(`FR-041 "${CLAUSE_SWATCH_PAINT}" -- ${preference}`, () => {
      const paints = paintsOf(hueControl(settingsPanel({ preference })))
      ROSTER.forEach((row, index) => {
        const drawn = rgbOfPaint(paints[index] ?? '')
        const wanted = expectedPaintOf(row.hue, preference, row.rowId)
        expect(drawn !== null && sameRgb(drawn, wanted), `${row.rowId} (${preference}): ${paints[index]} vs rgb(${wanted.map(Math.round).join(',')})`).toBe(true)
      })
    })

  }

  it(`FR-041 "${CLAUSE_SWATCH_PAINT}" -- the paint does not follow the document hue`, () => {
    const standing = paintsOf(hueControl(settingsPanel()))
    const moved = paintsOf(hueControl(settingsPanel({ hue: HUE_OFF_THE_ROSTER })))
    expect(moved).toEqual(standing)
  })
})

describe('CR-557 S-2 -- nothing else enters the field, and every other setting is read only', () => {
  it(`FR-041 "${CLAUSE_NO_ENTRANCES}" -- the control offers the roster and nothing else`, () => {
    const control = hueControl(settingsPanel())
    expect(control.choiceValues).toEqual(ROSTER.map((one) => String(one.hue)))
    expect(control.choices).toHaveLength(ROSTER.length)
    expect(control.colour?.theme).toBeUndefined()
    expect(control.colour?.customWord ?? '').toBe('')
  })

  it(`FR-072 "${CLAUSE_READ_ONLY}" / "${CLAUSE_EXCEPTION}"`, () => {
    // WHY: table T-369 (CR-690) orders the fields under this one: FO-3 K-125, FO-4 K-85, FO-5 K-143, FO-6 K-71,
    // FO-7 (read-out), FO-8 IC-44, FO-9 K-142, FO-10 K-141, FO-11 (read-out and its copy entrance), FO-12 K-140.
    const placed = ['K-125', 'K-85', 'K-143', 'K-71', 'IC-44', 'K-142', 'K-141', 'K-140']
    const withControls = ['K-125', 'K-85', 'K-143', 'K-71', 'IC-44', 'K-142', 'K-141', 'FX-6', 'K-140']
    const rest = settingsPanel().fields.slice(1)
    expect(rest.length, 'premise: the panel shows other settings too').toBeGreaterThan(0)
    expect(rest.filter((one) => one.isEditable).map((one) => one.row)).toEqual(placed)
    expect(rest.filter((one) => one.controls.length > 0).map((one) => one.row)).toEqual(withControls)
  })
})

describe('CR-557 S-4 -- the drawn field: buttons in a grid of S-368 per line', () => {
  it(`FR-041 "${CLAUSE_ROWS_IN_ORDER}" -- one button per T-305 row, S-368 to a line`, () => {
    const buttons = buttonsOf(drawnHueField())
    expect(buttons).toHaveLength(ROSTER.length)
    const grid = buttons[0]?.parentNode ?? null
    expect(grid, 'the swatches stand in one container').not.toBeNull()
    if (grid === null) return
    expect(buttons.every((one) => one.parentNode === grid)).toBe(true)
    expect(styleMap(grid).get('display') ?? 'grid (from the style sheet)').toContain('grid')
    expect(columnsOfGrid(grid)).toBe(S_368)
  })

  it(`FR-041 "${CLAUSE_NO_ENTRANCES}" -- no colour input, no transparent, no theme entrance is drawn`, () => {
    const field = drawnHueField()
    expect(field.filter((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'color')).toEqual([])
    expect(field.filter((one) => one.getAttribute('data-colour-choice') === 'transparent')).toEqual([])
    const entranceWords = WORDS.colourField
      .filter((one) => ['custom', 'theme', 'themeHint'].includes(one.part))
      .map((one) => one.text.ja)
    const texts = field.flatMap((one) => selfAndDescendants(one)).map((one) => one.textContent ?? '')
    for (const word of entranceWords) expect(texts.filter((text) => text === word), word).toEqual([])
  })

  it(`FR-041 "${CLAUSE_NO_ROW}" -- themeHue ${HUE_OFF_THE_ROSTER}: no swatch is shown chosen`, () => {
    const standing = buttonsOf(drawnHueField()).map(isMarkedSelected)
    expect(standing, 'premise: at the S-73 default the TH-1 swatch alone is shown chosen').toEqual(
      ROSTER.map((_, index) => index === 0),
    )
    expect(buttonsOf(drawnHueField({ hue: HUE_OFF_THE_ROSTER })).filter(isMarkedSelected)).toEqual([])
  })
})
