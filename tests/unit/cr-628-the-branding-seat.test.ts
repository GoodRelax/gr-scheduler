// CR-628 part 2: the Branding link stands in its own seat left of the Document Title, and the title starts where the seat ends.

import { describe, expect, it } from 'vitest'

import type { AppHeaderItems } from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import { appHeaderStyle, fillAppHeader } from '../../src/framework/dom-screen-surface/app-header-drawing'
import {
  NOT_STORED_DOCUMENT_TITLE_SIZES,
  NOT_STORED_HELP_SIZES,
  PAINT,
  SCREEN_COLOURS,
  chromeScaledPx,
  themeStyle,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { stage, styleMap, type FakeElement } from '../fixtures/fake-browser'

const LOGO = displayWords.branding.find((one) => one.part === 'logo')?.text.ja ?? ''

const ITEMS: AppHeaderItems = {
  brandingText: LOGO,
  documentTitle: 'a document',
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: 'not saved',
  commands: [],
  language: 'ja',
}

const SIZES = NOT_STORED_DOCUMENT_TITLE_SIZES

const drawnHeader = () => {
  const built = stage()
  const header = built.host.createElement('div') as unknown as FakeElement
  header.setAttribute('data-role', 'App Header')
  header.setAttribute('style', appHeaderStyle())
  fillAppHeader(built.host, header as unknown as HTMLElement, ITEMS, new Map())
  const all = [header, ...header.children.flatMap(function walk(one: FakeElement): FakeElement[] {
    return [one, ...one.children.flatMap(walk)]
  })]
  const byRole = (role: string): FakeElement => {
    const found = all.find((one) => one.getAttribute('data-role') === role)
    if (found === undefined) throw new Error(`premise: the header draws ${role}`)
    return found
  }
  return { header, all, branding: byRole('Branding'), title: byRole('Document Title') }
}

const px = (value: string | undefined): number => Number((value ?? '').replace('px', ''))

describe('BR-1 / BR-4 -- the Branding is a link to S-459, before the Document Title', () => {
  it('an <a> with the dictionary word, S-459 in a new tab, no opener and no referrer', () => {
    const { all, branding, title } = drawnHeader()
    expect(LOGO, 'premise: the dictionary holds the logo word').not.toBe('')
    expect(branding.tagName.toLowerCase()).toBe('a')
    expect(branding.textContent).toBe(LOGO)
    expect(branding.getAttribute('href')).toBe(NOT_STORED_HELP_SIZES['S-459'])
    expect(branding.getAttribute('target')).toBe('_blank')
    expect(branding.getAttribute('rel')?.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']))
    expect(all.indexOf(branding)).toBeLessThan(all.indexOf(title))
  })

  it('BR-1: the glyphs are the Document Title size, normal weight, in S-147', () => {
    const { branding, title } = drawnHeader()
    const style = styleMap(branding)
    expect(px(style.get('font-size'))).toBeCloseTo(chromeScaledPx(SIZES['S-225']), 6)
    expect(style.get('font-size')).toBe(styleMap(title).get('font-size'))
    expect(style.get('font-weight')).toBe('normal')
    expect(style.get('color')).toBe(PAINT.ink)
  })
})

describe('BR-3 -- the rim is S-461 of the glyph size in S-464, under the fill', () => {
  it('stroke width is twice the rim, its colour S-464, painted before the fill', () => {
    const style = styleMap(drawnHeader().branding)
    const rim = chromeScaledPx(SIZES['S-225']) * SIZES['S-461']
    expect(px(style.get('-webkit-text-stroke-width'))).toBeCloseTo(2 * rim, 6)
    expect(style.get('-webkit-text-stroke-color')).toBe(PAINT.brandingRim)
    expect(style.get('paint-order')).toBe('stroke fill')
    expect(px(style.get('padding-left')), 'the left rim touches the seat edge').toBeCloseTo(rim, 6)
  })

  it('the rim colour is S-464 of the theme in light and in dark', () => {
    const row = SCREEN_COLOURS['S-464']
    expect(row, 'premise: table T-236 holds S-464').toBeDefined()
    expect(themeStyle({ preference: 'light', hue: 214 })).toContain(`--gr-brandingRim:${row?.light};`)
    expect(themeStyle({ preference: 'dark', hue: 214 })).toContain(`--gr-brandingRim:${row?.dark};`)
  })
})

describe('BR-2 -- the seat, and the title at its right edge', () => {
  it('the seat is S-225 x S-462 x S-235 wide and never shrinks', () => {
    const seat = drawnHeader().branding.parentNode as FakeElement
    const style = styleMap(seat)
    expect(px(style.get('width'))).toBeCloseTo(chromeScaledPx(SIZES['S-225'] * SIZES['S-462']), 6)
    expect(style.get('flex-shrink')).toBe('0')
  })

  it('the title follows the seat in one flex item with no gap, so its left is (S-226 + S-225 x S-462) x S-235', () => {
    const { header, branding, title } = drawnHeader()
    const seat = branding.parentNode as FakeElement
    const block = seat.parentNode as FakeElement
    expect(title.parentNode, 'the seat and the title share one flex item').toBe(block)
    expect(block.children.indexOf(seat) + 1).toBe(block.children.indexOf(title))
    expect(styleMap(block).has('gap'), 'no gap stands between the seat and the title').toBe(false)
    const inset = px(styleMap(header).get('padding-left'))
    const left = inset + px(styleMap(seat).get('width'))
    expect(left).toBeCloseTo(chromeScaledPx(SIZES['S-226'] + SIZES['S-225'] * SIZES['S-462']), 6)
  })
})
