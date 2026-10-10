// CR-727 spec-only contract: how the DOM surface draws the Drop Cue (U-68) -- its place, rim, ground, words, press-through and layer (FR-087 T-024a OP-17, T-337 UZ-1, S-151, S-214, S-553).

import { describe, expect, it } from 'vitest'

import { colorOf } from '../../src/adapter/svg-renderer/svg-renderer'
import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  byRole,
  descendants,
  resolved,
  selfAndDescendants,
  serialize,
  stage,
  styleMap,
  wiringOf,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { settingNumber } from '../fixtures/setting-number'
import { GENERATED_WORDS, LANGUAGES, REGIONS, inLanguage, specText, viewOf } from './cr-727-stage'
import { specTable, unbroken } from './spec-table'

// see T-024a, OP-17
const opCell = (): string => unbroken(specTable('T-024a').rows.find((one) => one.id === 'OP-17')?.by['規則'] ?? '')

const OP_17_RIM_AND_GROUND =
  '`_assets/tbl-settings.md` の 表 T-236 の `S-151` を 表 T-206 の `S-214` の濃さで敷き、内側の縁を `S-151` の色、太さ `S-553` の線で囲み、中央に案内の語（`FR-038` の辞書）を置く。'
const OP_17_SAME_TYPE = '字は `Notification Area`（`U-57`）の字と同じとする。'
const OP_17_NO_PRESS =
  '重ね順は `FR-152` の 表 T-337 の `UZ-1` とし、押下を受けない —— ドロップを受けるのは今どおりウィンドウ全体である（`OP-2`）。'
const OP_17_AREA = '案内は `Schedule Canvas`（`U-32`）の範囲を覆い'
const UZ_1_MUST = '押下を受けず、下へ通すこと（MUST）'
const UZ_1_ROW = 'UZ-1'
const FR_152_FRONT_TAKES_THE_PRESS = '⭐ 押下は、その点で最も手前に描かれた UI パーツが受けること（MUST）。'
const FR_152_REQUIREMENTS = specText('01-04-requirements.md')

const CUE_ROLE = 'Drop Cue'
const THEMES: readonly ScreenTheme[] = [
  { preference: 'light', hue: 214 },
  { preference: 'dark', hue: 214 },
  { preference: 'light', hue: 30 },
]

const entered = { type: 'fileDragEntered', isOpenAccepted: true } as const
const shownSession = (): ScreenSession => advanceScreenSession(emptyScreenSession, entered as never).state

interface Drawn {
  readonly built: Stage
  show(session: ScreenSession): void
}

function surfaceUnder(theme: ScreenTheme): Drawn {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, theme))
  built.surface = surface
  return { built, show: (session) => surface.showScreenView(viewOf(session)) }
}

const cueOf = (built: Stage): FakeElement => {
  const found = byRole(built.root(), CUE_ROLE)
  if (found.length !== 1) throw new Error(`expected one [data-role="${CUE_ROLE}"], found ${found.length}`)
  return found[0] as FakeElement
}

const pxOf = (element: FakeElement, property: string): number => {
  const written = (styleMap(element).get(property) ?? '').replace(/\s/g, '')
  const match = /^(-?[\d.]+)px$/.exec(written)
  return match === null ? Number.NaN : Number(match[1])
}

const textOf = (element: FakeElement): string => element.textContent.trim()

interface Rim {
  readonly width: number
  readonly style: string
  readonly color: string
}

// WHY: no row says how the rim is spelled, so the shorthand and the three longhands are both read.
function rimOf(built: Stage, element: FakeElement): Rim {
  const style = styleMap(element)
  const shorthand = /^(-?[\d.]+)px\s+(\w+)\s+(.+)$/.exec((style.get('border') ?? '').trim())
  if (shorthand !== null) {
    return { width: Number(shorthand[1]), style: shorthand[2] ?? '', color: resolved(built, shorthand[3] ?? '') }
  }
  return {
    width: pxOf(element, 'border-width'),
    style: (style.get('border-style') ?? '').trim(),
    color: resolved(built, style.get('border-color') ?? ''),
  }
}

interface Ground {
  readonly paint: string
  readonly percent: number
}

// WHY: a translucent ground is spelled as color-mix() or as an alpha color; both are read, neither is demanded.
function groundOf(built: Stage, element: FakeElement): Ground | null {
  const written = (styleMap(element).get('background-color') ?? styleMap(element).get('background') ?? '').trim()
  const mixed = /^color-mix\(\s*in srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/.exec(written)
  if (mixed !== null) return { paint: resolved(built, mixed[1] ?? ''), percent: Number(mixed[2]) }
  return null
}

const RGB_CHANNELS = 3
const PERCENT = 100
const CHANNEL_MAX = 255
const CHANNEL_TOLERANCE = 1

function rgbOf(text: string): readonly number[] | null {
  const value = text.trim().toLowerCase().replace(/\s+/g, '')
  const hsl = /^hsl\((-?[\d.]+)(?:deg)?[,/]?([\d.]+)%[,/]?([\d.]+)%\)$/.exec(value)
  if (hsl !== null) {
    const hue = ((Number(hsl[1]) % 360) + 360) % 360
    const s = Number(hsl[2]) / PERCENT
    const l = Number(hsl[3]) / PERCENT
    const a = s * Math.min(l, 1 - l)
    const channel = (n: number): number => {
      const k = (n + hue / 30) % 12
      return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * CHANNEL_MAX
    }
    return [channel(0), channel(8), channel(4)]
  }
  const hex = /^#([0-9a-f]{6})$/.exec(value)
  if (hex !== null) {
    const n = Number.parseInt(hex[1] ?? '', 16)
    return [(n >> 16) & CHANNEL_MAX, (n >> 8) & CHANNEL_MAX, n & CHANNEL_MAX]
  }
  const rgb = /^rgb\(([\d.]+)[,]?([\d.]+)[,]?([\d.]+)\)$/.exec(value)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

function sameColor(drawn: string, expected: string): boolean {
  const left = rgbOf(drawn)
  const right = rgbOf(expected)
  if (left === null || right === null || left.length !== RGB_CHANNELS || right.length !== RGB_CHANNELS) return false
  return left.every((one, index) => Math.abs(one - (right[index] ?? Number.NaN)) <= CHANNEL_TOLERANCE)
}

// see S-151, PI-19
const accentOf = (theme: ScreenTheme): string => colorOf('S-151', theme.hue, theme.preference === 'dark', false)

const wordOf = (language: DisplayLanguage): string =>
  GENERATED_WORDS['dropCue']?.find((one) => one.part === 'dropToOpen')?.text?.[language] ?? ''

// WHY: the cue is "the ground the words sit on" so the text lives somewhere under the cue box.
const wordsUnder = (cue: FakeElement): FakeElement[] => selfAndDescendants(cue).filter((one) => textOf(one) !== '' && one.children.every((child) => textOf(child) === ''))

describe('CR-727 the manuscript these cases are driven by', () => {
  it('OP-17 still says how the cue is laid, colored, worded and layered, word for word', () => {
    for (const clause of [OP_17_AREA, OP_17_RIM_AND_GROUND, OP_17_SAME_TYPE, OP_17_NO_PRESS]) {
      expect(opCell()).toContain(clause)
    }
    expect(FR_152_REQUIREMENTS).toContain(FR_152_FRONT_TAKES_THE_PRESS)
  })

  it('S-214 is 9 and S-553 is 3, read from the settings source', () => {
    expect(settingNumber('S-214')).toBeGreaterThan(0)
    expect(settingNumber('S-553')).toBeGreaterThan(0)
  })
})

describe('FR-087 OP-17 -- the cue is drawn only while the view carries one', () => {
  it('a hidden cue leaves no [data-role="Drop Cue"] on the surface', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(emptyScreenSession)
    expect(byRole(built.root(), CUE_ROLE)).toHaveLength(0)
  })

  it('a shown cue is one box, and it is taken down again when the drag leaves', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    expect(byRole(built.root(), CUE_ROLE)).toHaveLength(1)
    show(advanceScreenSession(shownSession(), { type: 'fileDragLeft' } as never).state)
    expect(byRole(built.root(), CUE_ROLE), 'OP-17: the cue stayed after the drag left').toHaveLength(0)
  })

  it('drawing the same shown view twice keeps one box', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    show(shownSession())
    expect(byRole(built.root(), CUE_ROLE)).toHaveLength(1)
  })
})

describe(`FR-087 OP-17 -- ${OP_17_AREA} (U-32)`, () => {
  it('the box sits exactly on the Schedule Canvas rectangle', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    const cue = cueOf(built)
    const area = REGIONS.scheduleCanvas
    expect(styleMap(cue).get('position'), serialize(cue)).toBe('absolute')
    expect({
      left: pxOf(cue, 'left'),
      top: pxOf(cue, 'top'),
      width: pxOf(cue, 'width'),
      height: pxOf(cue, 'height'),
    }).toEqual({ left: area.x, top: area.y, width: area.width, height: area.height })
  })

  it('the rim is on the inside edge, so the drawn box stays the size of the Schedule Canvas', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    expect(styleMap(cueOf(built)).get('box-sizing'), '内側の縁').toBe('border-box')
  })
})

describe(`FR-087 OP-17 -- ${OP_17_RIM_AND_GROUND}`, () => {
  it.each(THEMES)('the rim is a solid S-553 px line in the S-151 color (%o)', (theme) => {
    const { built, show } = surfaceUnder(theme)
    show(shownSession())
    const rim = rimOf(built, cueOf(built))
    expect(rim.width).toBe(settingNumber('S-553'))
    expect(rim.style).toBe('solid')
    expect(sameColor(rim.color, accentOf(theme)), `rim ${rim.color} vs S-151 ${accentOf(theme)}`).toBe(true)
  })

  it.each(THEMES)('the ground is S-151 laid at the S-214 density (%o)', (theme) => {
    const { built, show } = surfaceUnder(theme)
    show(shownSession())
    const ground = groundOf(built, cueOf(built))
    expect(ground, `the cue's ground is not a translucent S-151: ${serialize(cueOf(built))}`).not.toBeNull()
    expect(ground?.percent).toBe(settingNumber('S-214'))
    expect(sameColor(ground?.paint ?? '', accentOf(theme)), `ground ${ground?.paint} vs S-151 ${accentOf(theme)}`).toBe(true)
  })

  it.each(LANGUAGES)('the words are the dictionary line dropCue.dropToOpen (%s), once, in the cue', (language) => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(inLanguage(shownSession(), language))
    const cue = cueOf(built)
    expect(wordOf(language)).not.toBe('')
    expect(textOf(cue)).toBe(wordOf(language))
    expect(wordsUnder(cue)).toHaveLength(1)
  })

  it('the words follow the language when it changes while the cue stays', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(inLanguage(shownSession(), 'ja'))
    show(inLanguage(shownSession(), 'en'))
    expect(textOf(cueOf(built))).toBe(wordOf('en'))
  })

  it('the words sit at the center of the cue', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    const style = styleMap(cueOf(built))
    const display = (style.get('display') ?? '').trim()
    const centered = (property: string): boolean => (style.get(property) ?? '').trim() === 'center'
    const isCenteringBox =
      (['flex', 'inline-flex', 'grid'].includes(display) && centered('align-items') && centered('justify-content')) ||
      (display === 'grid' && (style.get('place-items') ?? '').trim() === 'center')
    expect(isCenteringBox, `中央に案内の語を置く: ${serialize(cueOf(built))}`).toBe(true)
  })
})

// WHY: no row names a font; "the same as the Notification Area" is read as the same font declarations on the way down to the text.
function fontDeclarationsOn(built: Stage, text: FakeElement): readonly string[] {
  const root = built.root()
  const found: string[] = []
  for (let at: FakeElement | null = text; at !== null && at !== root; at = at.parentNode) {
    for (const [property, value] of styleMap(at)) {
      if (!/^(font|line-height|letter-spacing|text-transform)/.test(property)) continue
      if (value === 'inherit') continue
      found.push(`${property}:${value}`)
    }
  }
  return found.sort()
}

describe(`FR-087 OP-17 -- ${OP_17_SAME_TYPE}`, () => {
  it('the cue words declare the same font properties as the words of a notice', () => {
    const noticed = surfaceUnder(THEMES[0] as ScreenTheme)
    const view = viewOf(emptyScreenSession)
    noticed.built.surface?.showScreenView({
      ...view,
      notices: [
        {
          manner: 'NT-1',
          mannerText: 'Not accepted',
          text: 'NOTICE-WORDS',
          nextSteps: [],
          affectedCount: null,
          dismissText: 'Close',
          dismissKey: 'Enter',
          raisedNotices: [],
        },
      ],
    } as never)
    const noticeText = selfAndDescendants(byRole(noticed.built.root(), 'Notification Area')[0] as FakeElement).find(
      (one) => one.children.every((child) => textOf(child) === '') && textOf(one) === 'NOTICE-WORDS',
    )
    expect(noticeText, 'premise: the notice words are drawn').toBeDefined()

    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    const words = wordsUnder(cueOf(built))[0] as FakeElement
    expect(fontDeclarationsOn(built, words)).toEqual(fontDeclarationsOn(noticed.built, noticeText as FakeElement))
  })
})

describe(`FR-087 OP-17 / FR-152 T-337 UZ-1 -- ${OP_17_NO_PRESS}`, () => {
  it('UZ-1 names the Drop Cue part, and says it takes no press and passes it down', () => {
    const row = unbroken((specTable('T-337').rows.find((one) => one.id === UZ_1_ROW)?.cells ?? []).join(' | '))
    expect(row).toContain('`U-68`')
    expect(row).toContain(UZ_1_MUST)
  })

  it('the box and everything inside it sets pointer-events:none, so a press goes through to what lies below', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    const cue = cueOf(built)
    for (const one of selfAndDescendants(cue)) {
      expect((styleMap(one).get('pointer-events') ?? '').trim(), `UZ-1 (MUST) 押下を受けず、下へ通す: ${serialize(one)}`).toBe('none')
    }
  })

  it('no layer above the cue, up to the root, takes a press either', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    const root = built.root()
    for (let at: FakeElement | null = cueOf(built).parentNode; at !== null; at = at.parentNode) {
      expect((styleMap(at).get('pointer-events') ?? '').trim(), serialize(at)).not.toBe('auto')
      if (at === root) break
    }
  })

  it('the cue takes no key or pointer listener and is not a control', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    const mine = new Set(selfAndDescendants(cueOf(built)))
    const heard = built.world.registrations.filter((one) => mine.has(one.node))
    expect(heard, 'U-68: 押せるものを持たない').toEqual([])
    for (const one of mine) expect(['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA']).not.toContain(one.tagName)
  })

  it('the cue lies in the UZ-1 layer, the front-most layer of the screen', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(shownSession())
    let layer: string | null = null
    let z = Number.NaN
    for (let at: FakeElement | null = cueOf(built); at !== null; at = at.parentNode) {
      const id = at.getAttribute('data-uz')
      if (id !== null) {
        layer = id
        z = Number((styleMap(at).get('z-index') ?? '').trim())
        break
      }
    }
    expect(layer).toBe(UZ_1_ROW)
    const others = selfAndDescendants(built.root())
      .filter((one) => one.getAttribute('data-uz') !== null && one.getAttribute('data-uz') !== UZ_1_ROW)
      .map((one) => ({ id: one.getAttribute('data-uz') ?? '', z: Number((styleMap(one).get('z-index') ?? '').trim()) }))
    expect(others.length).toBeGreaterThan(0)
    for (const other of others) expect(z, `${other.id} is in front of the Drop Cue`).toBeGreaterThan(other.z)
  })
})

describe('FR-087 OP-17 -- one cue whatever the file count', () => {
  it('the cue words are drawn by one box only, not by a second part of the surface', () => {
    const { built, show } = surfaceUnder(THEMES[0] as ScreenTheme)
    show(inLanguage(shownSession(), 'ja'))
    const holders = descendants(built.root()).filter((one) => one.children.length === 0 && textOf(one) === wordOf('ja'))
    expect(holders).toHaveLength(1)
  })
})
