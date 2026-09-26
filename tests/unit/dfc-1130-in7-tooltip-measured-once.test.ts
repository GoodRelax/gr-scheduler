// DFC-1130: IN-7 and ruling JDG-728 -- an anchored tooltip is measured once, when shown, and stays put.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  ScreenView,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  FakeElement,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const TOOLTIP = bare(rowOf('T-103', 'U-53').by['確定名（英）'] ?? '')
const S_339_PX = Number.parseFloat(bare(rowOf('T-206', 'S-339').cells[1] ?? ''))

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

interface Box {
  left: number
  top: number
  width: number
  height: number
}

const TIP_WIDTH = 240
const TIP_HEIGHT = 20
const ANCHOR_SIZE = 24

const answers = {
  windowWidth: 1000,
  windowHeight: 700,
  anchors: new Map<string, Box>(),
}
let measuredLog: FakeElement[] = []

const rectOf = (box: Box) => ({
  x: box.left,
  y: box.top,
  left: box.left,
  top: box.top,
  width: box.width,
  height: box.height,
  right: box.left + box.width,
  bottom: box.top + box.height,
})

const pxOf = (element: FakeElement, property: string): number => {
  const written = styleMap(element).get(property) ?? ''
  const match = /^(-?[\d.]+)px$/.exec(written.replace(/\s/g, ''))
  return match === null ? Number.NaN : Number(match[1])
}

const isLayer = (element: FakeElement): boolean => element.getAttribute('data-role') === TOOLTIP

function layerAbove(element: FakeElement): FakeElement | null {
  let at = element.parentNode
  while (at !== null) {
    if (isLayer(at)) return at
    at = at.parentNode
  }
  return null
}

function answerFor(element: FakeElement) {
  const icon = element.getAttribute('data-icon')
  if (icon !== null && layerAbove(element) === null) {
    const box = answers.anchors.get(icon)
    if (box !== undefined) return rectOf(box)
  }
  if (isLayer(element)) {
    return rectOf({ left: 0, top: 0, width: answers.windowWidth, height: answers.windowHeight })
  }
  if (layerAbove(element) !== null) {
    const left = pxOf(element, 'left')
    const top = pxOf(element, 'top')
    return rectOf({
      left: Number.isNaN(left) ? 0 : left,
      top: Number.isNaN(top) ? 0 : top,
      width: TIP_WIDTH,
      height: TIP_HEIGHT,
    })
  }
  return rectOf({ left: 0, top: 0, width: 0, height: 0 })
}

const command = (icon: string): CommandItem => ({
  icon: icon as CommandItem['icon'],
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: `label of ${icon}`,
})

function header(title: string): AppHeaderItems {
  return {
    documentTitle: title,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [command('IC-5'), command('IC-6')],
    language: 'ja',
  }
}

function viewWith(
  tooltips: readonly Tooltip[],
  over: { title?: string; isFullScreen?: boolean } = {},
): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: over.isFullScreen ?? false, dividers: [], scrollbars: [] },
    appHeaderItems: header(over.title ?? 'Plan of the year'),
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips,
  }
}

const tipOn = (icon: string, text: string): Tooltip => ({
  anchor: { kind: 'icon', icon: icon as CommandItem['icon'] },
  text,
  assignment: null,
})

function layerOf(built: Stage): FakeElement {
  const found = selfAndDescendants(built.root()).filter(isLayer)
  if (found.length !== 1) throw new Error(`expected one tooltip layer, found ${found.length}`)
  return found[0] as FakeElement
}

function theTip(built: Stage): FakeElement {
  const tips = layerOf(built).children
  if (tips.length !== 1) throw new Error(`expected one tooltip, found ${tips.length}`)
  return tips[0] as FakeElement
}

const placementOf = (built: Stage): { left: number; top: number } => {
  const tip = theTip(built)
  return { left: pxOf(tip, 'left'), top: pxOf(tip, 'top') }
}

const tooltipMeasurements = (log: readonly FakeElement[], icon: string) => ({
  anchor: log.filter((one) => one.getAttribute('data-icon') === icon && layerAbove(one) === null)
    .length,
  windowOrTip: log.filter((one) => isLayer(one) || layerAbove(one) !== null).length,
})

function measuring<T>(run: () => T): { result: T; log: FakeElement[] } {
  measuredLog = []
  const result = run()
  const log = measuredLog
  measuredLog = []
  return { result, log }
}

beforeEach(() => {
  answers.windowWidth = 1000
  answers.windowHeight = 700
  answers.anchors = new Map([
    ['IC-5', { left: 100, top: 10, width: ANCHOR_SIZE, height: ANCHOR_SIZE }],
    ['IC-6', { left: 300, top: 10, width: ANCHOR_SIZE, height: ANCHOR_SIZE }],
  ])
  measuredLog = []
  vi.spyOn(FakeElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: FakeElement,
  ) {
    measuredLog.push(this)
    return answerFor(this)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function shown(): { built: Stage; show: (view: ScreenView) => FakeElement[] } {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  const show = (view: ScreenView): FakeElement[] => measuring(() => surface.showScreenView(view)).log
  return { built, show }
}

describe('IN-7 -- the settings row the case leans on', () => {
  it('S-339 (the margin to the window edge) is a positive number', () => {
    expect(S_339_PX).toBeGreaterThan(0)
    expect(unbroken(TOOLTIP)).not.toBe('')
  })
})

describe('IN-7 / JDG-728 -- a tooltip is measured once, when it is shown', () => {
  const FIRST = tipOn('IC-5', 'Undo the last edit')

  it('IN-7 (MUST) "the alignment is measured once, when the tooltip is shown" -- placed from the anchor on its first show', () => {
    const { built, show } = shown()
    const log = show(viewWith([FIRST]))
    expect(tooltipMeasurements(log, 'IC-5').anchor).toBeGreaterThan(0)
    expect(placementOf(built)).toEqual({ left: 100, top: 10 + ANCHOR_SIZE })
  })

  it('IN-7 (MUST NOT) "the window size is not read repeatedly" / JDG-728 -- another part changes and the window shrinks: same place, nothing re-read', () => {
    const { built, show } = shown()
    show(viewWith([FIRST]))
    const before = placementOf(built)

    answers.windowWidth = 300
    expect(100 + TIP_WIDTH).toBeGreaterThan(answers.windowWidth - S_339_PX)

    const log = show(viewWith([FIRST], { title: 'Another title', isFullScreen: true }))
    expect(placementOf(built)).toEqual(before)
    expect(tooltipMeasurements(log, 'IC-5')).toEqual({ anchor: 0, windowOrTip: 0 })
  })

  it('JDG-728 "the element it points at moves" -- the anchor moves and the view changes elsewhere: the tip stays', () => {
    const { built, show } = shown()
    show(viewWith([FIRST]))
    const before = placementOf(built)

    answers.anchors.set('IC-5', { left: 500, top: 60, width: ANCHOR_SIZE, height: ANCHOR_SIZE })
    const log = show(viewWith([FIRST], { title: 'Moved anchor' }))
    expect(placementOf(built)).toEqual(before)
    expect(tooltipMeasurements(log, 'IC-5')).toEqual({ anchor: 0, windowOrTip: 0 })
  })

  it('JDG-728 "placed again only when the set of tooltips changes" -- new text: measured again from the anchor where it is now', () => {
    const { built, show } = shown()
    show(viewWith([FIRST]))

    answers.anchors.set('IC-5', { left: 500, top: 60, width: ANCHOR_SIZE, height: ANCHOR_SIZE })
    const log = show(viewWith([tipOn('IC-5', 'Undo, with other words')], { title: 'Moved anchor' }))
    expect(tooltipMeasurements(log, 'IC-5').anchor).toBeGreaterThan(0)
    expect(placementOf(built)).toEqual({ left: 500, top: 60 + ANCHOR_SIZE })
  })

  it('JDG-728 "placed again only when the set of tooltips changes" -- a different anchor: placed at that anchor', () => {
    const { built, show } = shown()
    show(viewWith([FIRST]))

    const log = show(viewWith([tipOn('IC-6', 'Redo the last undone edit')]))
    expect(tooltipMeasurements(log, 'IC-6').anchor).toBeGreaterThan(0)
    expect(placementOf(built)).toEqual({ left: 300, top: 10 + ANCHOR_SIZE })
  })

  it('IN-7 (MUST) "turned back at the right edge" -- measured at show time, a tip near the right edge ends at the anchor right edge', () => {
    const { built, show } = shown()
    answers.anchors.set('IC-5', { left: 900, top: 10, width: ANCHOR_SIZE, height: ANCHOR_SIZE })
    show(viewWith([FIRST]))
    const { left } = placementOf(built)
    expect(left).toBe(900 + ANCHOR_SIZE - TIP_WIDTH)
    expect(left + TIP_WIDTH).toBeLessThanOrEqual(answers.windowWidth - S_339_PX)
  })
})
