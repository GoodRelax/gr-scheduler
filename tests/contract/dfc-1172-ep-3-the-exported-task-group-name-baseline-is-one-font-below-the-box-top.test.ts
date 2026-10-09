// DFC-1172: the exported task group name stands with its baseline one font size below the top of its task group title box (EP-3).

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { RATIO, stored } from '../unit/cr-430-cross-section-scene'

const SETTINGS = SETTINGS_DEFAULTS as unknown as DocumentSettings
const SCREEN = { width: 1000, height: 800, appHeaderHeight: 56 } as const
const PANEL_WIDTH = SETTINGS.taskGroupPanelWidth
const CANVAS_HEIGHT = SCREEN.height - SCREEN.appHeaderHeight

const REGIONS: ScreenRegions = {
  appHeader: { x: 0, y: 0, width: SCREEN.width, height: SCREEN.appHeaderHeight },
  scheduleCanvas: { x: 0, y: SCREEN.appHeaderHeight, width: SCREEN.width, height: CANVAS_HEIGHT },
  taskGroupPanel: { x: 0, y: SCREEN.appHeaderHeight, width: PANEL_WIDTH, height: CANVAS_HEIGHT },
  timeRuler: { x: PANEL_WIDTH, y: SCREEN.appHeaderHeight, width: SCREEN.width - PANEL_WIDTH, height: SETTINGS.rulerHeight },
  propertiesPanel: { x: SCREEN.width, y: SCREEN.appHeaderHeight, width: 0, height: CANVAS_HEIGHT },
  taskGroupArea: {
    x: PANEL_WIDTH,
    y: SCREEN.appHeaderHeight + SETTINGS.rulerHeight,
    width: SCREEN.width - PANEL_WIDTH,
    height: CANVAS_HEIGHT - SETTINGS.rulerHeight,
  },
}

const PICTURE_SCALE = SETTINGS_CONSTANTS.exportCanvas.width / SCREEN.width

interface Placed {
  readonly top: number
  readonly height: number
  readonly depth: number
  readonly name: string
}

// see T-201, FR-039
// WHY: EP-3 names the font by the table: S-36, times S-38 at depth 1, times the drawn ratio of FR-039.
const fontOf = (depth: number): number => stored('S-36') * (depth === 1 ? stored('S-38') : 1) * RATIO

const viewOf = (rows: readonly Placed[]): ScreenView =>
  ({
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: 'a document',
      openedFileName: null,
      fileSavedAt: null,
      fileSavedByteLength: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
    },
    taskGroupPanel: {
      pinnedTitles: [],
      titles: rows.map((one, index) => ({
        groupId: `g${index + 1}`,
        depth: one.depth,
        fontPx: fontOf(one.depth),
        indentPx: 0,
        box: { x: 0, y: one.top, width: PANEL_WIDTH, height: one.height },
        label: one.name,
        wholeLabel: one.name,
        isLabelTruncated: false,
        expander: { canOpen: true, canClose: true, canCloseBelow: false },
        isPinned: false,
        isSelected: false,
      })),
    },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }) as unknown as ScreenView

const pictureOf = (rows: readonly Placed[]): string => {
  const scene = {
    svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="11" r="3"/></svg>',
    regions: REGIONS,
    screenView: viewOf(rows),
    settings: SETTINGS,
    themePreference: 'light',
    themeHue: 214,
  } as unknown as ExportScene
  const answer = exportSvg(scene)
  if (!answer.ok) throw new Error('exportSvg refused a small picture')
  return answer.svg
}

const baselineOf = (svg: string, name: string): { readonly y: number; readonly fontSize: number } => {
  const found = new RegExp(`<text([^<>]*)>${name}</text>`).exec(svg)
  if (found === null) throw new Error(`the picture drew no text for ${name}`)
  const y = Number.parseFloat(/\by="([^"]*)"/.exec(found[1] ?? '')?.[1] ?? 'NaN')
  const fontSize = Number.parseFloat(/\bfont-size="([^"]*)"/.exec(found[1] ?? '')?.[1] ?? 'NaN')
  return { y, fontSize }
}

const CASES: readonly Placed[] = [
  { top: 120, height: 60, depth: 1, name: 'first' },
  { top: 200, height: 24, depth: 2, name: 'second' },
  { top: 260, height: 90, depth: 3, name: 'third' },
]

describe('DFC-1172: the baseline of an exported task group name is the box top plus the name font size (EP-3)', () => {
  const svg = pictureOf(CASES)

  for (const one of CASES) {
    it(`EP-3 the baseline of "${one.name}" is its box top plus its font size (depth ${one.depth}, box ${one.height} high)`, () => {
      const drawn = baselineOf(svg, one.name)
      expect(drawn.y).toBeCloseTo((one.top + fontOf(one.depth)) * PICTURE_SCALE, 1)
    })

    it(`EP-3 the baseline offset of "${one.name}" equals the font size the picture draws it in`, () => {
      const drawn = baselineOf(svg, one.name)
      expect(drawn.y - one.top * PICTURE_SCALE).toBeCloseTo(drawn.fontSize, 1)
    })
  }

  it('EP-3 the offset does not depend on how high the box is', () => {
    const tall = baselineOf(pictureOf([{ top: 120, height: 200, depth: 1, name: 'tall' }]), 'tall')
    const short = baselineOf(pictureOf([{ top: 120, height: 20, depth: 1, name: 'short' }]), 'short')
    expect(tall.y).toBeCloseTo(short.y, 3)
  })
})
