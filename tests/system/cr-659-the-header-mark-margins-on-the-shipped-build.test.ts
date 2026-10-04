// CR-659 on the shipped build: T-349 BR-2 / BR-7 and S-462 -- the GRS mark's two margins, the divider's sides, the title's left edge.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable, unbroken, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const BR_2_SEAT =
  '| BR-2 | 席 | 帯の左端から、同書の 表 T-206 の `S-226` に `S-235` を掛けた長さだけ右を左端とし、幅が `S-490` × 同表の `S-462` × `S-235` の席を取ること（MUST）'
const BR_2_GLYPH = '字は、左の縁（`BR-3`）が席の左端に接するように置き、縦は `Document Title` と同じく帯の縦の中央に置くこと（MUST）'
const BR_2_TITLE = '⭐ `Document Title` の左端は、席の右に `BR-7` の縦線とその両脇の隔たりを置いた右とすること（MUST）'
const BR_2_NOT_MEASURED = '表 T-076 の `EP-1` が書き出しでも同じ行から題を置く。⛔ 字の実寸を測って題を置いてはならない（MUST NOT）'
const BR_7_LINE = '席の右に、帯の上端から下端までの縦線を 1 本引き、`Branding` と `Document Title` を隔てること（MUST）'
const BR_7_SIDES = '縦線の左右に、帯の左端から席までと同じ隔たり —— 同書の 表 T-206 の `S-226` に `S-235` を掛けた長さ —— を空けること（MUST）'
const BR_7_NOT_A_GLYPH = '書体による違いは同表の `S-462` の注が持つ。⛔ 縦線を字（縦棒など）で書いてはならない（MUST NOT）'
const HS_9_COMMANDS =
  '2 段の箱と `Header Commands` のあいだは、`_assets/tbl-settings.md` の 表 T-206 の `S-491` に `S-235` を掛けた隔たりとすること（MUST）'
const S_462_DEFAULT_FONT = '値は既定の書体（`Yu Gothic UI`）の `GRS` の幅 1.82 に両側の縁（`S-461` × 2 ＝ 0.10）を足した長さである'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const T206: SpecTable = specTable('T-206')

/** @purity pure */
function settingOf(id: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec((rowOf(T206, id).cells[1] ?? '').replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`table T-206 row ${id} states no number`)
  return value
}

const S_226 = settingOf('S-226')
const S_235 = settingOf('S-235')
const S_461 = settingOf('S-461')
const S_462 = settingOf('S-462')
const S_490 = settingOf('S-490')
const S_491 = settingOf('S-491')
const S_492 = settingOf('S-492')

// see BR-2, BR-7
const INSET_PX = S_226 * S_235
const SEAT_PX = S_490 * S_462 * S_235
const TITLE_LEFT_PX = (3 * S_226 + S_490 * S_462) * S_235 + S_492

// WHY: S-462's note gives the default font a margin match within one pixel; layout rounds below that.
const ONE_PX = 1
const SUBPIXEL = 0.75

interface Header {
  readonly innerLeft: number
  readonly innerTop: number
  readonly innerBottom: number
  readonly seat: { readonly left: number; readonly right: number }
  readonly inkLeft: number
  readonly inkRight: number
  readonly divider: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
  readonly dividerText: string
  readonly ground: { readonly left: number }
  readonly status: { readonly right: number }
  readonly commands: { readonly left: number }
}

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) throw new Error('build the shipped app first (dist/index.html)')
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// see BR-2, BR-3, BR-7
// WHY: the ink of GRS is the advance box moved by canvas measureText's bounding box, widened by the rim S-461 on each side.
/** @purity semi-pure-b */
async function readHeader(page: Page): Promise<Header> {
  return page.evaluate((rim: number) => {
    const one = (role: string): HTMLElement => {
      const found = document.querySelector(`[data-role="${role}"]`)
      if (found === null) throw new Error(`the page has no ${role}`)
      return found as HTMLElement
    }
    const header = one('App Header')
    const outer = header.getBoundingClientRect()
    const style = getComputedStyle(header)
    const branding = one('Branding')
    const range = document.createRange()
    range.selectNodeContents(branding)
    const advance = range.getBoundingClientRect()
    const font = getComputedStyle(branding)
    const canvas = document.createElement('canvas').getContext('2d')
    if (canvas === null) throw new Error('no canvas')
    canvas.font = `${font.fontStyle} ${font.fontWeight} ${font.fontSize} ${font.fontFamily}`
    const text = branding.textContent ?? ''
    const metrics = canvas.measureText(text)
    const fontPx = Number.parseFloat(font.fontSize)
    const box = (role: string) => {
      const rect = one(role).getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    }
    // WHY: the seat is the box holding the Branding link, the one the header lays out beside the divider.
    const seat = (branding.parentElement ?? branding).getBoundingClientRect()
    return {
      innerLeft: outer.left + (Number.parseFloat(style.borderLeftWidth) || 0),
      innerTop: outer.top + (Number.parseFloat(style.borderTopWidth) || 0),
      innerBottom: outer.bottom - (Number.parseFloat(style.borderBottomWidth) || 0),
      seat: { left: seat.left, right: seat.right },
      inkLeft: advance.left - metrics.actualBoundingBoxLeft - fontPx * rim,
      inkRight: advance.left + metrics.actualBoundingBoxRight + fontPx * rim,
      divider: box('Branding Divider'),
      dividerText: one('Branding Divider').textContent ?? '',
      ground: box('Document Title Ground'),
      status: box('File Status'),
      commands: box('Header Commands'),
    }
  }, S_461)
}

test('CR-659 the manuscript this file is driven by: BR-2, BR-7, HS-9 and S-462 still read this way', () => {
  for (const clause of [BR_2_SEAT, BR_2_GLYPH, BR_2_TITLE, BR_2_NOT_MEASURED, BR_7_LINE, BR_7_SIDES, BR_7_NOT_A_GLYPH, HS_9_COMMANDS]) {
    expect(REQUIREMENTS, clause).toContain(clause)
  }
  expect(unbroken(rowOf(T206, 'S-462').cells.join(' '))).toContain(S_462_DEFAULT_FONT)
})

const CASES = [
  { theme: 'light', locale: 'ja-JP' },
  { theme: 'dark', locale: 'ja-JP' },
  { theme: 'light', locale: 'en-US' },
  { theme: 'dark', locale: 'en-US' },
] as const

for (const { theme, locale } of CASES) {
  test(`BR-2 BR-7 HS-9 S-462 (MUST), ${theme}, ${locale}: the mark's margins, the divider's sides and the title's left edge`, async () => {
    test.setTimeout(180_000)
    if (browser === null) throw new Error('the reference browser was not opened')
    const context = await browser.newContext({ viewport: SCREEN, colorScheme: theme, locale })
    try {
      const page = await context.newPage()
      await page.goto(pathToFileURL(SHIPPED_BUILD).href)
      await readSettledDrawnSvg(page)
      const seen = await readHeader(page)

      expect(seen.seat.left - seen.innerLeft, `${BR_2_SEAT}: the seat starts S-226 x S-235 in`).toBeCloseTo(INSET_PX, 0)
      expect(seen.seat.right - seen.seat.left, 'BR-2: the seat is S-490 x S-462 x S-235 wide').toBeCloseTo(SEAT_PX, 0)
      expect(Math.abs(seen.inkLeft - seen.seat.left), `${BR_2_GLYPH}: the rimmed glyph touches the seat's left`).toBeLessThanOrEqual(ONE_PX)

      expect(seen.divider.left - seen.seat.right, `${BR_7_SIDES}: left of the divider`).toBeCloseTo(INSET_PX, 0)
      expect(seen.ground.left - seen.divider.right, `${BR_7_SIDES}: right of the divider`).toBeCloseTo(INSET_PX, 0)
      expect(seen.divider.right - seen.divider.left, 'BR-7: S-492 wide').toBeCloseTo(S_492, 1)
      expect(seen.divider.top, `${BR_7_LINE}: from the top`).toBeLessThanOrEqual(seen.innerTop + SUBPIXEL)
      expect(seen.divider.bottom, `${BR_7_LINE}: to the bottom`).toBeGreaterThanOrEqual(seen.innerBottom - SUBPIXEL)
      expect(seen.dividerText.trim(), BR_7_NOT_A_GLYPH).toBe('')

      const leftMargin = seen.inkLeft - seen.innerLeft
      const rightMargin = seen.divider.left - seen.inkRight
      expect(Math.abs(rightMargin - leftMargin), `S-462 / BR-7: right margin ${rightMargin.toFixed(2)} vs left ${leftMargin.toFixed(2)}`).toBeLessThanOrEqual(ONE_PX)

      expect(seen.ground.left - seen.innerLeft, `${BR_2_TITLE}: (3 x S-226 + seat) x S-235 + S-492`).toBeCloseTo(TITLE_LEFT_PX, 0)
      expect(seen.commands.left - seen.status.right, `${HS_9_COMMANDS}`).toBeCloseTo(S_491 * S_235, 0)
    } finally {
      await context.close()
    }
  })
}
