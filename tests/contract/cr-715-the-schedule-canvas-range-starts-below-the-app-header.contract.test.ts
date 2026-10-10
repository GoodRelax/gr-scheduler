// CR-715: the Schedule Canvas's range starts at the App Header's lower edge; the element carrying its role is a drawing layer over the window.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { unbroken } from './spec-table'

const GLOSSARY = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'), 'utf8'))
const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const U_32_NOT_THE_BOX =
  '⛔ `Schedule Canvas` の範囲を、`data-role` に `Schedule Canvas` を持つ要素の箱から読んではならない（MUST NOT）'
const U_32_THE_RANGE = '範囲は、`App Header`（`U-31`）の下の縁からウィンドウの下の端までの、ウィンドウの全幅とする'
const U_32_THE_BAND = 'スケジュールフィルタの帯（`U-67`）が出ているあいだは、その帯の下の縁から'
const U_32_THE_LAYER =
  'ページの中で `data-role` に `Schedule Canvas` を持つ要素は、ウィンドウの左上の角 (0, 0) からウィンドウ全体を覆う描画の層であり、`App Header` の帯の上も含む —— 範囲とは別である'
const WB_3_THE_RANGE = '`Schedule Canvas`（`U-32`）の全体 —— `App Header` の下の縁からウィンドウの下の端まで。'

// see FR-036
const LOW_SCREEN = { width: 1280, height: 627 }
const HEADER_PX = 40
const BAND_PX = 24

const EMPTY_DOCUMENT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'empty-document.json'), 'utf8')

/** @purity non-pure */
function emptySettings(): Parameters<typeof regionsFromScreen>[1] {
  const decoded = documentFromJson(EMPTY_DOCUMENT)
  if (!decoded.ok) throw new Error(`the empty document does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document.documentSettings
}

const SCREEN: ScreenEnvironment = { ...LOW_SCREEN, appHeaderHeight: HEADER_PX, scrollbarThickness: 8, propertyPanelWidth: 0 }

describe('CR-715 -- the manuscript these cases are driven by', () => {
  it.each([
    ['U-32 (MUST NOT) -- the range is not read from the box of the element with the role', GLOSSARY, U_32_NOT_THE_BOX],
    ['U-32 -- the range runs from the App Header lower edge to the window bottom', GLOSSARY, U_32_THE_RANGE],
    ['U-32 -- the U-67 band moves the range down while it shows', GLOSSARY, U_32_THE_BAND],
    ['U-32 -- the element with the role is a drawing layer over the whole window', GLOSSARY, U_32_THE_LAYER],
    ['WB-3 -- a maximized window takes the range, not the layer', REQUIREMENTS, WB_3_THE_RANGE],
  ])('still says it, word for word: %s', (_name, text, clause) => {
    expect(text).toContain(clause)
  })
})

describe('U-32 -- the range the layout solves starts at the App Header lower edge', () => {
  it(`${U_32_THE_RANGE}: at 1280 x 627 the range is the window below the header, full width`, () => {
    const regions = regionsFromScreen(SCREEN, emptySettings())
    const header = regions.appHeader
    const range = regions.scheduleCanvas
    expect(header.y, 'the App Header stands at the top of the window').toBe(0)
    expect(header.height, 'the App Header has a height of its own').toBeGreaterThan(0)
    expect(range.y, U_32_NOT_THE_BOX).toBe(header.y + header.height)
    expect(range.x).toBe(0)
    expect(range.width).toBe(LOW_SCREEN.width)
    expect(range.y + range.height).toBe(LOW_SCREEN.height)
  })

  it(`${U_32_THE_BAND}: the range starts at the band lower edge`, () => {
    const regions = regionsFromScreen({ ...SCREEN, topBandHeight: BAND_PX }, emptySettings())
    const header = regions.appHeader
    const range = regions.scheduleCanvas
    expect(range.y).toBe(header.y + header.height + BAND_PX)
    expect(range.y + range.height).toBe(LOW_SCREEN.height)
  })
})
