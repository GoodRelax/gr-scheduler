// Pins what the spec asks of the dividers and scrollbars the DOM surface draws (CR-439).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  byRole,
  FakeElement,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

// WHY: readScreenPartAt walks up by parentElement, which the shared fake does not carry.
if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

function rowText(table: string, id: string): string {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(found.cells.join(' '))
}

function englishName(id: string): string {
  const found = specTable('T-103').rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-103 has no row ${id}`)
  return bare(found.by['確定名（英）'] ?? '')
}

const IF_9_DRAW = '作った記述を画面に載せ'
const IF_9_PART_AT = '画面上の点がどの UI パーツ（表 T-103）のどの入口（表 T-109）の上か'
const SC_4 = '横・縦とも常時表示する。内容が収まっていても消さない'
const FR_052_NO_BAND =
  'プロパティパネルを出していないあいだ（`S-99h`）、その境界に掴み帯を敷かないこと（MUST）'

const SCROLLBARS = englishName('U-21')
const PANEL_DIVIDER = englishName('U-24')

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })

function viewWith(frame: ScreenView['frame']): ScreenView {
  return {
    language: 'ja',
    frame,
    appHeaderItems: {
      documentTitle: null,
      openedFileName: null,
      fileSavedAt: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
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
}

const FITTING_SCROLLBARS: ScreenView['frame']['scrollbars'] = [
  { axis: 'horizontal', track: rect(0, 580, 800, 12), thumb: rect(0, 580, 800, 12) },
  { axis: 'vertical', track: rect(788, 40, 12, 540), thumb: rect(788, 40, 12, 540) },
]

const ROW_TITLE_DIVIDER = {
  panel: 'rowTitlePanel' as const,
  band: rect(170, 40, 8, 500),
  line: rect(173, 40, 1, 500),
}

function drawn(frame: ScreenView['frame']): { built: Stage; surface: ScreenSurface } {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(frame))
  return { built, surface }
}

function partOn(built: Stage, surface: ScreenSurface, node: FakeElement): ScreenPart | null {
  ;(built.host as unknown as { elementFromPoint: (x: number, y: number) => FakeElement }).elementFromPoint =
    () => node
  return surface.readScreenPartAt(1, 1)
}

function answersOver(built: Stage, surface: ScreenSurface): ScreenPart[] {
  const out: ScreenPart[] = []
  for (const node of selfAndDescendants(built.root())) {
    const part = partOn(built, surface, node)
    if (part !== null) out.push(part)
  }
  return out
}

describe('CR-439 screen frame -- the clauses still stand', () => {
  it('IF-9, SC-4 and FR-052 still say what these cases test', () => {
    expect(rowText('T-065', 'IF-9')).toContain(IF_9_DRAW)
    expect(rowText('T-065', 'IF-9')).toContain(IF_9_PART_AT)
    expect(rowText('T-031', 'SC-4')).toContain(SC_4)
    expect(REQUIREMENTS).toContain(FR_052_NO_BAND)
    expect(SCROLLBARS).toBe('Scrollbars')
    expect(PANEL_DIVIDER).toBe('Panel Divider')
  })
})

describe('SC-4 -- 横・縦とも常時表示する。内容が収まっていても消さない', () => {
  it('both scrollbars are drawn even when each thumb fills its track', () => {
    const { built } = drawn({ isFullScreen: false, dividers: [], scrollbars: FITTING_SCROLLBARS })

    const bars = byRole(built.root(), SCROLLBARS)
    const axes = bars.map((one) => one.getAttribute('data-axis')).sort()
    expect(axes).toEqual(['horizontal', 'vertical'])
    for (const bar of bars) {
      const style = styleMap(bar)
      expect(style.get('display')).not.toBe('none')
      expect(style.get('visibility')).not.toBe('hidden')
    }
  })

  it('IF-9 画面上の点がどの UI パーツ -- a press on each bar answers U-21 and its axis', () => {
    const { built, surface } = drawn({
      isFullScreen: false,
      dividers: [],
      scrollbars: FITTING_SCROLLBARS,
    })

    const bars = answersOver(built, surface).filter((one) => one.scrollbarAxis !== undefined)
    const axes = [...new Set(bars.map((one) => one.scrollbarAxis))].sort()
    expect(axes).toEqual(['horizontal', 'vertical'])
    for (const one of bars) expect(one.part).toBe(SCROLLBARS)
  })

  it('IF-9 作った記述を画面に載せ -- each track stands where the description puts it', () => {
    const { built } = drawn({ isFullScreen: false, dividers: [], scrollbars: FITTING_SCROLLBARS })

    for (const bar of FITTING_SCROLLBARS) {
      const node = byRole(built.root(), SCROLLBARS).find(
        (one) => one.getAttribute('data-axis') === bar.axis,
      )
      expect(node, `no ${bar.axis} scrollbar`).toBeDefined()
      const style = styleMap(node as FakeElement)
      expect(style.get('left')).toBe(`${bar.track.x}px`)
      expect(style.get('top')).toBe(`${bar.track.y}px`)
      expect(style.get('width')).toBe(`${bar.track.width}px`)
      expect(style.get('height')).toBe(`${bar.track.height}px`)
    }
  })
})

describe('Panel Divider (U-24) -- IF-9 and FR-052', () => {
  it('IF-9 画面上の点がどの UI パーツ -- a press on the band answers U-24 and which panel it bounds', () => {
    const { built, surface } = drawn({
      isFullScreen: false,
      dividers: [ROW_TITLE_DIVIDER],
      scrollbars: [],
    })

    const bands = byRole(built.root(), PANEL_DIVIDER)
    expect(bands).toHaveLength(1)
    const part = partOn(built, surface, bands[0] as FakeElement)
    expect(part?.part).toBe(PANEL_DIVIDER)
    expect(part?.dividerPanel).toBe('rowTitlePanel')
    expect(part?.entry ?? null).toBeNull()
    expect(part?.format ?? null).toBeNull()
  })

  it('IF-9 作った記述を画面に載せ -- the band covers the rectangle the description gives', () => {
    const { built } = drawn({ isFullScreen: false, dividers: [ROW_TITLE_DIVIDER], scrollbars: [] })

    const style = styleMap(byRole(built.root(), PANEL_DIVIDER)[0] as FakeElement)
    expect(style.get('left')).toBe(`${ROW_TITLE_DIVIDER.band.x}px`)
    expect(style.get('top')).toBe(`${ROW_TITLE_DIVIDER.band.y}px`)
    expect(style.get('width')).toBe(`${ROW_TITLE_DIVIDER.band.width}px`)
    expect(style.get('height')).toBe(`${ROW_TITLE_DIVIDER.band.height}px`)
  })

  it('FR-052 その境界に掴み帯を敷かないこと -- no Properties Panel divider in the description, no band for it', () => {
    const { built, surface } = drawn({
      isFullScreen: false,
      dividers: [ROW_TITLE_DIVIDER],
      scrollbars: FITTING_SCROLLBARS,
    })

    const panels = answersOver(built, surface)
      .map((one) => one.dividerPanel)
      .filter((one) => one !== null && one !== undefined)
    expect([...new Set(panels)]).toEqual(['rowTitlePanel'])
    for (const band of byRole(built.root(), PANEL_DIVIDER)) {
      expect(band.getAttribute('data-panel')).not.toBe('propertiesPanel')
    }
  })

  it('a redraw without dividers removes the band the previous frame drew', () => {
    const built = stage({ 'App Header': 37 })
    const surface = domScreenSurface(wiringOf(built, THEME))
    surface.showScreenView(
      viewWith({ isFullScreen: false, dividers: [ROW_TITLE_DIVIDER], scrollbars: [] }),
    )
    surface.showScreenView(viewWith({ isFullScreen: false, dividers: [], scrollbars: [] }))

    expect(byRole(built.root(), PANEL_DIVIDER)).toHaveLength(0)
  })
})
