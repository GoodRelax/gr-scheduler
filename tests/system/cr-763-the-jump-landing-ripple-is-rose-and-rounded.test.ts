// CR-763 on the dev build: the jump landing ripple of T-332 SJ-10 (2) is the S-587 rose, S-556 wide, S-588 rounded.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { BASE_SCREEN, openDocument, pressEntrance } from './cr-570-tree-state-stage'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { rowOf } from './sws-case'
import { taskGroupsDocument } from './w3-t1-stage'

const numberIn = (cell: string): number => Number(cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)?.[0])
const T206 = (id: string): number => numberIn(unbroken(rowOf(specTable('T-206'), id).by['既定'] ?? ''))
const S_556 = T206('S-556')
const S_586 = T206('S-588')
const S_585_LIGHT = bare(rowOf(specTable('T-236'), 'S-587').by['明るいテーマ'] ?? '')

const SJ_10_RIPPLE =
  '② 波紋 —— 印を付けた時から、囲みと同じ色・太さ・角の丸みの矩形を、`S-558` の長さのあいだに囲みの所から各辺 `S-559` だけ外へ広げながら、不透明から透明へ消す。'
const SJ_10_MONO = '⭐ モノクロ（`FR-041`）では、色は表 T-236 のほかの行と同じく灰にし、線を太さ `S-556` の中で 2 本に分ける'
const S_586_EDGES = '内の縁は `S-588` − `S-556` の半分（0 を下回れば直角）'

// see S-588
// WHY: a CSS outline follows the box's border-radius from the line's inner edge, so the box rounds by half a line less.
const INNER_EDGE_RADIUS = Math.max(0, S_586 - S_556 / 2)

const RIPPLE = '[data-role="Jump Landing Ripple"]'
const AGENT_API = rowOf(specTable('T-109'), 'IC-20').id
const TARGET_UID = 25
const CHANNEL_TOLERANCE = 1

type Rgb = readonly [number, number, number]

function rgbOf(text: string): Rgb {
  const value = text.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(value)
  if (hex !== null) {
    const n = Number.parseInt(hex[1] ?? '', 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  throw new Error(`not a color this test can read: ${JSON.stringify(text)}`)
}

const sameRgb = (left: Rgb, right: Rgb): boolean => left.every((value, at) => Math.abs(value - (right[at] ?? Number.NaN)) <= CHANNEL_TOLERANCE)
const lightnessOf = (rgb: Rgb): number => (Math.max(...rgb) + Math.min(...rgb)) / 2

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

// WHY: the dev server serves the source under test; the open-file picker stand-in hands over the next document
// (the shape tests/system/cr-570-tree-state-stage.ts uses on the shipped build).
/** @purity non-pure */
async function openWith(settings: Readonly<Record<string, unknown>>): Promise<Opened> {
  if (browser === null) throw new Error('no browser')
  const baseURL = test.info().project.use.baseURL
  if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
  const context = await browser.newContext({ baseURL, viewport: BASE_SCREEN, colorScheme: 'light' })
  await context.addInitScript(() => {
    const held = { next: { name: '', text: '' }, written: [] as string[] }
    ;(window as unknown as Record<string, unknown>)['grsCr570'] = held
    ;(window as unknown as Record<string, unknown>)['showOpenFilePicker'] = async () => [
      {
        kind: 'file',
        name: held.next.name,
        getFile: async () => new File([held.next.text], held.next.name),
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        isSameEntry: async () => false,
      },
    ]
  })
  const page = await context.newPage()
  await page.goto('/')
  await readSettledDrawnSvg(page)
  expect(await pressEntrance(page, AGENT_API), 'FR-065: the Agent API entrance is on the screen').toBe(true)
  const text = taskGroupsDocument({ rows: 40, settings: { zoomX: 6, scrollDate: '2026-02-25T00:00:00', ...settings } })
  expect(validateDocument(JSON.parse(text)).errors, 'the fixture is a document the schema accepts').toEqual([])
  await openDocument(page, 'cr-763-ripple.json', text)
  return { page, close: async () => context.close() }
}

interface RippleStyle {
  readonly outlineColor: string
  readonly outlineStyle: string
  readonly outlineWidth: string
  readonly borderRadius: string
  readonly jumpLanding: string
}

// WHY: the ripple lasts S-557 x S-558 from the landing, so it is read in the same evaluation that asks AM-16 to jump.
/** @purity non-pure */
async function jumpAndReadRipple(page: Page, uid: number): Promise<RippleStyle | null> {
  return page.evaluate(
    async (asked: { uid: number; ripple: string }) => {
      const api = (window as unknown as { grSchedulerAgentApi: { focusTask(uid: number): unknown } }).grSchedulerAgentApi
      await api.focusTask(asked.uid)
      const started = performance.now()
      while (performance.now() - started < 900) {
        const found = document.querySelector(asked.ripple)
        if (found !== null) {
          const style = getComputedStyle(found)
          return {
            outlineColor: style.outlineColor,
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            borderRadius: style.borderTopLeftRadius,
            jumpLanding: style.getPropertyValue('--gr-jumpLanding').trim(),
          }
        }
        await new Promise((done) => setTimeout(done, 10))
      }
      return null
    },
    { uid, ripple: RIPPLE },
  )
}

test.describe(`CR-763 -- T-332 SJ-10 ${SJ_10_RIPPLE}`, () => {
  test.setTimeout(180_000)

  test('premise: the manuscript still says it', () => {
    const cell = unbroken(rowOf(specTable('T-332'), 'SJ-10').cells.join(' | '))
    for (const clause of [SJ_10_RIPPLE, SJ_10_MONO]) expect(cell, clause).toContain(clause)
    expect(unbroken(rowOf(specTable('T-206'), 'S-588').cells.join(' | ')), S_586_EDGES).toContain(S_586_EDGES)
  })

  test('light theme: the ripple is a solid S-556 outline in the S-587 color, its box rounded so the line\'s middle has S-588', async () => {
    const opened = await openWith({})
    try {
      const ripple = await jumpAndReadRipple(opened.page, TARGET_UID)
      expect(ripple, 'SJ-10 (2): a ripple starts on the jump').not.toBeNull()
      expect(sameRgb(rgbOf(ripple!.outlineColor), rgbOf(S_585_LIGHT)), `S-587 light: ${ripple!.outlineColor} against ${S_585_LIGHT}`).toBe(true)
      expect(sameRgb(rgbOf(ripple!.jumpLanding), rgbOf(S_585_LIGHT)), `--gr-jumpLanding: ${ripple!.jumpLanding}`).toBe(true)
      expect(ripple!.outlineStyle, 'a solid line, as the ring').toBe('solid')
      expect(Number.parseFloat(ripple!.outlineWidth), 'S-556').toBeCloseTo(S_556, 1)
      expect(Number.parseFloat(ripple!.borderRadius), `border-radius ${ripple!.borderRadius}`).toBeCloseTo(INNER_EDGE_RADIUS, 1)
    } finally {
      await opened.close()
    }
  })

  test('monochrome: the ripple is a double outline (two lines in the S-556 band), grey keeping S-587\'s lightness', async () => {
    const opened = await openWith({ themeMonochrome: true })
    try {
      const ripple = await jumpAndReadRipple(opened.page, TARGET_UID)
      expect(ripple, 'SJ-10 (2): a ripple starts on the jump').not.toBeNull()
      const rgb = rgbOf(ripple!.outlineColor)
      expect(Math.abs(rgb[0] - rgb[1]) <= CHANNEL_TOLERANCE && Math.abs(rgb[1] - rgb[2]) <= CHANNEL_TOLERANCE, `grey: ${ripple!.outlineColor}`).toBe(true)
      expect(Math.abs(lightnessOf(rgb) - lightnessOf(rgbOf(S_585_LIGHT))), `keeps the lightness of ${S_585_LIGHT}`).toBeLessThanOrEqual(CHANNEL_TOLERANCE)
      expect(ripple!.outlineStyle, SJ_10_MONO).toBe('double')
      expect(Number.parseFloat(ripple!.outlineWidth), 'S-556').toBeCloseTo(S_556, 1)
      expect(Number.parseFloat(ripple!.borderRadius)).toBeCloseTo(INNER_EDGE_RADIUS, 1)
    } finally {
      await opened.close()
    }
  })
})
