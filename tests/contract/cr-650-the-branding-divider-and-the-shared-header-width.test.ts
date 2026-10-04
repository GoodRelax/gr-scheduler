// CR-650 spec-only tests: T-349 BR-1/2/6/7, T-076 EP-1 and T-341 HS-9/10 against numbers read from docs/spec.

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import type { AppHeaderItems, ScreenFrame, ScreenView, RowTitlePanel } from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { appHeaderStyle, fillAppHeader } from '../../src/framework/dom-screen-surface/app-header-drawing'
import {
  NOT_STORED_DOCUMENT_TITLE_SIZES,
  PAINT,
  SCREEN_COLOURS,
  themeStyle,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { stage, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { settingDefaultOf } from '../fixtures/setting-default'
import { bare, specTable } from './spec-table'

// WHY: the headings of tables T-206 and T-236 are Japanese; written as escapes to keep this file ASCII.
const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)
const LIGHT_COLUMN = String.fromCharCode(0x660e, 0x308b, 0x3044, 0x30c6, 0x30fc, 0x30de)
const DARK_COLUMN = String.fromCharCode(0x6697, 0x3044, 0x30c6, 0x30fc, 0x30de)

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const numberIn = (cell: string, what: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`${what} states no number: ${JSON.stringify(cell)}`)
  return value
}

// see T-206
const setting = (id: string): number => numberIn(rowOf('T-206', id).by[DEFAULT_COLUMN] ?? '', `T-206 ${id}`)

const S_225 = setting('S-225')
const S_226 = setting('S-226')
const S_235 = setting('S-235')
const S_461 = setting('S-461')
const S_462 = setting('S-462')
const S_490 = setting('S-490')
const S_491 = setting('S-491')
const S_492 = setting('S-492')
const S_210 = setting('S-210')
const S_449 = setting('S-449')

// WHY: a T-236 cell either spells a colour or names the row it copies (S-493 names S-149).
const colourOf = (id: string, column: string, seen: readonly string[] = []): string => {
  const cell = (rowOf('T-236', id).by[column] ?? '').trim()
  const named = /^`(S-\d+)`/.exec(cell)
  if (named !== null) {
    const next = named[1] as string
    if (seen.includes(next)) throw new Error(`T-236 ${id} names a loop through ${next}`)
    return colourOf(next, column, [...seen, id])
  }
  return bare(cell).replace(/`/g, '')
}

const huedAt = (written: string, hue: number): string => written.replace(/\bH\b/g, String(hue))

const HUE = 214

// see BR-2, EP-1 -- CR-659: the divider's two sides are S-226, no longer S-491
const TITLE_LEFT = (3 * S_226 + S_490 * S_462) * S_235 + S_492

const px = (value: string | undefined): number => Number((value ?? '').replace('px', ''))

const LOGO = displayWords.branding.find((one) => one.part === 'logo')?.text.ja ?? ''


describe('CR-650 -- T-206 / T-236 rows read from the manuscript', () => {
  it('T-206 S-225 S-226 S-461 S-462 S-490 S-491 S-492: the screen constants hold the values the manuscript states', () => {
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-225']).toBe(S_225)
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']).toBe(S_226)
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-461']).toBe(S_461)
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-462']).toBe(S_462)
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-490']).toBe(S_490)
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-491']).toBe(S_491)
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-492']).toBe(S_492)
  })

  it('BR-1 S-490 S-225 S-235: the Branding glyph (S-490 x S-235) is smaller than the Document Title (S-225 x S-235)', () => {
    expect(S_490 * S_235).toBeLessThan(S_225 * S_235)
  })

  it('HS-7 S-210 S-449: the lower line coefficient is not larger than the upper one', () => {
    expect(S_210).toBeLessThanOrEqual(S_449)
  })

  it('BR-2 EP-1: both rows give the title left edge as (3 x S-226 + seat) x S-235 + S-492', () => {
    const br2 = rowOf('T-349', 'BR-2').cells.join(' ')
    const ep1 = rowOf('T-076', 'EP-1').cells.join(' ')
    const inOrder = (text: string, ids: readonly string[]): boolean => {
      let at = 0
      for (const id of ids) {
        const found = text.indexOf(`\`${id}\``, at)
        if (found < 0) return false
        at = found + id.length
      }
      return true
    }
    expect(inOrder(br2, ['S-226', 'S-235', 'S-492']), 'BR-2 names the rows of its sum in order').toBe(true)
    expect(br2.includes('`S-491`'), 'BR-2 no longer spaces the divider by S-491 (CR-659)').toBe(false)
    expect(inOrder(ep1, ['BR-2', 'BR-7']), 'EP-1 takes the left margin from BR-2 and the divider of BR-7').toBe(true)
    expect(inOrder(ep1, ['S-490', 'S-462', 'S-226', 'S-492']), 'EP-1 names where the seat, gap and width come from').toBe(true)
  })

  it('T-236 S-493: the divider colour resolves to S-149 of the theme, in light and in dark', () => {
    const row = SCREEN_COLOURS['S-493']
    expect(row, 'premise: the screen holds S-493').toBeDefined()
    const light = huedAt(colourOf('S-493', LIGHT_COLUMN), HUE)
    const dark = huedAt(colourOf('S-493', DARK_COLUMN), HUE)
    expect(light).toBe(huedAt(colourOf('S-149', LIGHT_COLUMN), HUE))
    expect(dark).toBe(huedAt(colourOf('S-149', DARK_COLUMN), HUE))
    expect(themeStyle({ preference: 'light', hue: HUE })).toContain(`--gr-brandingDivider:${light};`)
    expect(themeStyle({ preference: 'dark', hue: HUE })).toContain(`--gr-brandingDivider:${dark};`)
  })

  it('T-236 S-146: the ground var the title is painted with resolves to S-146 in light and in dark', () => {
    const light = huedAt(colourOf('S-146', LIGHT_COLUMN), HUE)
    const dark = huedAt(colourOf('S-146', DARK_COLUMN), HUE)
    expect(themeStyle({ preference: 'light', hue: HUE })).toContain(`--gr-ground:${light};`)
    expect(themeStyle({ preference: 'dark', hue: HUE })).toContain(`--gr-ground:${dark};`)
  })
})


const ITEMS: AppHeaderItems = {
  brandingText: LOGO,
  documentTitle: 'a document',
  openedFileName: 'a-file-name-that-goes-on-and-on.json',
  fileSavedAt: '2026-05-04T03:02:01Z',
  fileSavedByteLength: 123456,
  fileNeverSavedText: 'not saved',
  commands: [],
  language: 'ja',
}

const drawnHeader = () => {
  const built = stage()
  const header = built.host.createElement('div') as unknown as FakeElement
  header.setAttribute('data-role', 'App Header')
  header.setAttribute('style', appHeaderStyle())
  fillAppHeader(built.host, header as unknown as HTMLElement, ITEMS, new Map())
  const all = [
    header,
    ...header.children.flatMap(function walk(one: FakeElement): FakeElement[] {
      return [one, ...one.children.flatMap(walk)]
    }),
  ]
  const byRole = (role: string): FakeElement => {
    const found = all.find((one) => one.getAttribute('data-role') === role)
    if (found === undefined) throw new Error(`premise: the header draws ${role}`)
    return found
  }
  return { header, byRole }
}

describe('CR-650 BR-7 -- the divider between the Branding and the Document Title', () => {
  it('BR-7: the divider is a drawn element with no glyph in it', () => {
    const divider = drawnHeader().byRole('Branding Divider')
    expect(divider.textContent.trim(), 'BR-7 MUST NOT: the divider is not written as a character').toBe('')
    expect(divider.children.length).toBe(0)
  })

  it('BR-7 S-492: the divider is S-492 px wide, not scaled by S-235', () => {
    const style = styleMap(drawnHeader().byRole('Branding Divider'))
    expect(px(style.get('width'))).toBe(S_492)
    expect(style.get('flex-shrink'), 'a 1px line squeezed by flex would vanish').toBe('0')
  })

  it('BR-7 S-493: the divider is painted in the S-493 colour', () => {
    const style = styleMap(drawnHeader().byRole('Branding Divider'))
    expect(style.get('background') ?? style.get('background-color')).toBe(PAINT.brandingDivider)
  })

  // CR-659 retired the S-491 gap here (JDG-1350): the divider's two sides are the inset left of the mark.
  it('BR-7 S-226: the gap on both sides of the divider is S-226 x S-235, the same as the inset left of the seat', () => {
    const { header, byRole } = drawnHeader()
    const style = styleMap(header)
    expect(style.get('display')).toMatch(/flex/)
    expect(style.get('column-gap') ?? style.get('gap'), 'no flex gap: each side is named by its own row').toBeUndefined()
    expect(px(style.get('padding-left'))).toBeCloseTo(S_226 * S_235, 2)
    const divider = styleMap(byRole('Branding Divider'))
    expect(px(divider.get('margin-inline'))).toBeCloseTo(S_226 * S_235, 2)
    expect(divider.get('margin'), 'the shorthand would override the sides').toBeUndefined()
  })

  it('HS-9 S-491: Header Commands stand S-491 x S-235 right of the title and file strip', () => {
    const style = styleMap(drawnHeader().byRole('Header Commands'))
    expect(px(style.get('margin-left'))).toBeCloseTo(S_491 * S_235, 2)
  })

  it('BR-2 BR-7: header order is Branding seat, divider, title and file strip, Header Commands', () => {
    const { header } = drawnHeader()
    const roles = header.children.map(
      (one) => one.getAttribute('data-role') ?? one.children[0]?.getAttribute('data-role') ?? '',
    )
    expect(roles).toEqual(['Branding', 'Branding Divider', 'Title And File Strip', 'Header Commands'])
  })
})

describe('CR-650 HS-9 / HS-10 -- the title and the file status share one width', () => {
  it('HS-9: the Opened File Name and its File Status carry no width cap', () => {
    const { byRole } = drawnHeader()
    for (const role of ['Opened File Name', 'File Status']) {
      const style = styleMap(byRole(role))
      expect(style.get('max-width'), `${role} max-width`).toBeUndefined()
      expect(style.get('width'), `${role} width`).toBeUndefined()
    }
  })

  it('HS-9: the title and the file status stand in one strip between the divider and the Header Commands', () => {
    const { header, byRole } = drawnHeader()
    const strip = byRole('Title And File Strip')
    expect(strip.parentNode).toBe(header)
    expect(strip.children.map((one) => one.getAttribute('data-role'))).toEqual(['Document Title Ground', 'File Status'])
    expect(byRole('Document Title').parentNode).toBe(byRole('Document Title Ground'))
    expect(byRole('File Status').children.map((one) => one.getAttribute('data-role'))).toEqual([
      'Opened File Name',
      'File Saved At',
    ])
  })

  it('HS-10 S-491 S-146: the title ground keeps an S-491 x S-235 gap on its right, painted in S-146', () => {
    const style = styleMap(drawnHeader().byRole('Document Title Ground'))
    expect(px(style.get('padding-right'))).toBeCloseTo(S_491 * S_235, 2)
    expect(style.get('background') ?? style.get('background-color')).toBe(PAINT.ground)
  })
})


const SETTINGS = ((): DocumentSettings => {
  const heads = new Set(Object.keys(SETTINGS_DEFAULTS).map((key) => key.split('.')[0] as string))
  const built: Record<string, unknown> = {}
  for (const head of heads) built[head] = settingDefaultOf(head)
  built['displayScale'] = DEFAULT_DISPLAY_SCALE
  return built as unknown as DocumentSettings
})()

// see S-81
const S_81_WIDTH = numberIn(rowOf('T-204', 'S-81').by[DEFAULT_COLUMN] ?? '', 'T-204 S-81')

const TITLE = 'Plan of record'

const VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as unknown as ScreenFrame,
  appHeaderItems: { ...ITEMS, documentTitle: TITLE, language: 'en' },
  rowTitlePanel: { pinnedTitles: [], titles: [] } as unknown as RowTitlePanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const SCREENS = [
  { width: 1373, height: 773, appHeaderHeight: 37 },
  { width: 1920, height: 1080, appHeaderHeight: 37 },
  { width: 1100, height: 700, appHeaderHeight: 30 },
] as const

const sceneOn = (screen: (typeof SCREENS)[number], preference: 'light' | 'dark' = 'light'): ExportScene => ({
  svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  regions: regionsFromScreen(
    { ...screen, scrollbarThickness: 8, propertyPanelWidth: 0 },
    SETTINGS,
  ),
  screenView: VIEW,
  settings: SETTINGS,
  themePreference: preference,
  themeHue: HUE,
})

const pictureOf = (scene: ExportScene): string => {
  const answer = exportSvg(scene)
  if (!answer.ok) throw new Error('exportSvg refused a fixture under S-217')
  return answer.svg
}

const ratioOf = (scene: ExportScene): number => S_81_WIDTH / (scene.regions.scheduleCanvas.x + scene.regions.scheduleCanvas.width)

const attrOf = (tag: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]

describe('CR-650 EP-1 / BR-6 -- the export picture leaves the seat and the divider blank', () => {
  it.each(SCREENS)('EP-1 BR-6: no Branding text is drawn ($width x $height)', (screen) => {
    const svg = pictureOf(sceneOn(screen))
    expect(LOGO, 'premise: the dictionary holds the logo word').not.toBe('')
    const texts = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((one) => one[1] ?? '')
    expect(texts.filter((one) => one.includes(LOGO)), 'EP-1: the Branding is not drawn').toEqual([])
  })

  it.each(SCREENS)('EP-1 BR-6 BR-7: no divider line is drawn in the header band ($width x $height)', (screen) => {
    for (const preference of ['light', 'dark'] as const) {
      const scene = sceneOn(screen, preference)
      const svg = pictureOf(scene)
      const ratio = ratioOf(scene)
      const bandBottom = (scene.regions.appHeader.y + scene.regions.appHeader.height) * ratio
      const dividerColour = huedAt(colourOf('S-493', preference === 'dark' ? DARK_COLUMN : LIGHT_COLUMN), HUE)
      expect(svg.includes(dividerColour), `EP-1: nothing in the picture is painted ${dividerColour}`).toBe(false)
      const thin = [...svg.matchAll(/<(rect|line|path|polyline)\b[^>]*>/g)].map((one) => one[0]).filter((tag) => {
        if (tag.startsWith('<line') || tag.startsWith('<path') || tag.startsWith('<polyline')) {
          const y1 = Number(attrOf(tag, 'y1') ?? attrOf(tag, 'y') ?? NaN)
          return !(y1 > bandBottom - 0.01)
        }
        const y = Number(attrOf(tag, 'y') ?? 0)
        const width = Number(attrOf(tag, 'width') ?? NaN)
        return y < bandBottom - 0.01 && width < S_81_WIDTH / 2
      })
      expect(thin, 'EP-1: the header band holds no line and no narrow box').toEqual([])
    }
  })

  it.each(SCREENS)(
    'EP-1 BR-2 S-226 S-490 S-462 S-492 S-235: the title x is the screen left margin times the picture ratio ($width x $height)',
    (screen) => {
      const scene = sceneOn(screen)
      const svg = pictureOf(scene)
      const tag = new RegExp(`<text\\b([^>]*)>${TITLE}</text>`).exec(svg)?.[1]
      expect(tag, 'EP-1: the Document Title is drawn').toBeDefined()
      const x = Number(attrOf(tag ?? '', 'x'))
      const ratio = ratioOf(scene)
      expect(x).toBeCloseTo((scene.regions.appHeader.x + TITLE_LEFT) * ratio, 1)
    },
  )
})
