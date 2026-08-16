// Unit tests for the layoutEngine units of wave W2.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.

import { describe, expect, it } from 'vitest'

import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import {
  regionAtPointer,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// A whole DocumentSettings is 97 keys; regionsFromScreen reads five of them, so
// the cases below carry only those. Same idiom as document-model.test.ts.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  part as unknown as DocumentSettings

/** The five keys regionsFromScreen reads, at values that make the sums easy to check. */
const SETTINGS = settingsOf({
  appHeaderMaxHeight: 56, // S-116
  rowTitlePanelWidth: 170, // S-79
  propertyPanelWidth: 280, // S-80
  rulerHeight: 48, // S-2
  canvasPadding: 10, // S-56
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8, // half of the 17px Windows draws, per FR-051
}

describe('ScreenRegions (PI-35)', () => {
  it('FR-051 caps the measured header at appHeaderMaxHeight', () => {
    const tall = regionsFromScreen({ ...ENV, appHeaderHeight: 80 }, SETTINGS)
    expect(tall.appHeader.height).toBe(56)
    // The canvas takes whatever the capped header leaves.
    expect(tall.scheduleCanvas).toEqual({ x: 0, y: 56, width: 1000, height: 644 })
  })

  it('leaves a header shorter than the cap alone', () => {
    const short = regionsFromScreen({ ...ENV, appHeaderHeight: 40 }, SETTINGS)
    expect(short.appHeader.height).toBe(40)
    expect(short.scheduleCanvas.y).toBe(40)
  })

  it('FR-052 takes the padding, both panels and the vertical scrollbar off the Row Area width', () => {
    // 1000 - 10 padding - 170 titles - 280 properties - 8 scrollbar.
    expect(regionsFromScreen(ENV, SETTINGS).rowArea.width).toBe(532)
  })

  it('U-50 puts the Row Area inside the Row Title Panel and below the ruler band', () => {
    const { rowArea } = regionsFromScreen(ENV, SETTINGS)
    expect(rowArea.x).toBe(170)
    expect(rowArea.y).toBe(56 + 48)
  })

  it('takes the ruler band, the padding and the horizontal scrollbar off the Row Area height', () => {
    // 644 canvas - 48 band - 10 padding - 8 scrollbar.
    expect(regionsFromScreen(ENV, SETTINGS).rowArea.height).toBe(578)
  })

  it('leaves exactly the padding and the scrollbar between the Row Area and what follows it', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    const rightGap = r.propertiesPanel.x - (r.rowArea.x + r.rowArea.width)
    const bottomGap =
      r.scheduleCanvas.y + r.scheduleCanvas.height - (r.rowArea.y + r.rowArea.height)
    expect(rightGap).toBe(10 + 8)
    expect(bottomGap).toBe(10 + 8)
  })

  it('gives the Row Title Panel the whole canvas height, so it owns the corner under the ruler', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(r.rowTitlePanel).toEqual({ x: 0, y: 56, width: 170, height: 644 })
    expect(regionAtPointer(r, 50, 60)).toBe('rowTitlePanel')
  })

  it('SC-2 spans the Time Ruler across the Row Area, not across the panels', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(r.timeRuler).toEqual({ x: 170, y: 56, width: 532, height: 48 })
  })

  it('FR-052 reports a width of zero or less rather than clamping it', () => {
    const wide = settingsOf({ ...SETTINGS, rowTitlePanelWidth: 600, propertyPanelWidth: 400 })
    // 1000 - 10 - 600 - 400 - 8 is negative, and that IS the answer FR-052 tests.
    expect(regionsFromScreen(ENV, wide).rowArea.width).toBeLessThanOrEqual(0)
  })

  it('answers with the innermost region a point falls in', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 200, 200)).toBe('rowArea')
    expect(regionAtPointer(r, 200, 60)).toBe('timeRuler')
    expect(regionAtPointer(r, 50, 200)).toBe('rowTitlePanel')
    expect(regionAtPointer(r, 800, 200)).toBe('propertiesPanel')
    expect(regionAtPointer(r, 500, 10)).toBe('appHeader')
  })

  it('treats every region as half-open, so an edge belongs to what comes next', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    // The Row Area's own corner is inside it.
    expect(regionAtPointer(r, 170, 104)).toBe('rowArea')
    // Its right edge is not: 170 + 532 = 702 falls into the scrollbar lane.
    expect(regionAtPointer(r, 702, 200)).toBe('scheduleCanvas')
  })

  it('falls through to the canvas in the padding and the scrollbar lanes', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 710, 200)).toBe('scheduleCanvas')
    expect(regionAtPointer(r, 400, 690)).toBe('scheduleCanvas')
  })

  it('returns null outside the window', () => {
    const r = regionsFromScreen(ENV, SETTINGS)
    expect(regionAtPointer(r, 1200, 200)).toBeNull()
    expect(regionAtPointer(r, 200, -1)).toBeNull()
  })
})
