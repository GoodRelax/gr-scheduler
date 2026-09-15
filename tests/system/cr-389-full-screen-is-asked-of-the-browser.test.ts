// CR-389 / FR-071: the shipped build asks the browser for full screen, and the pressed look of IC-11 follows the browser.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const FULL_SCREEN_ENTRY = 'IC-11'
const ENTRY = `[data-icon="${FULL_SCREEN_ENTRY}"]`
const SETTLE_MS = 600

// see FR-038, RS-59
const RS_59_WORDS: readonly string[] = ((): readonly string[] => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { readonly reasons: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[] }
  const found = raw.reasons.find((one) => one.rowId === 'RS-59')
  if (found === undefined) throw new Error('the dictionary manuscript holds no reason RS-59')
  return [found.text.ja, found.text.en]
})()

// see FR-071
// WHY: headless Chromium can refuse requestFullscreen (no window to fill, no activation from a driven key),
// WHY: so these cases stand in for the browser: they count each ask and fire fullscreenchange when they accept.
const STAND_IN_BROWSER = `
  window.__grsFullScreen = { requests: 0, exits: 0, refuse: false, element: null }
  window.__grsKeys = []
  window.addEventListener('keydown', (event) => { window.__grsKeys.push(event) }, false)
  const tell = (element) => {
    window.__grsFullScreen.element = element
    document.dispatchEvent(new Event('fullscreenchange'))
  }
  Object.defineProperty(Document.prototype, 'fullscreenElement', {
    configurable: true,
    get() { return window.__grsFullScreen.element },
  })
  Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get() { return true } })
  Element.prototype.requestFullscreen = function () {
    const state = window.__grsFullScreen
    state.requests += 1
    if (state.refuse) return Promise.reject(new TypeError('refused by the stand-in browser'))
    const element = this
    return new Promise((resolve) => setTimeout(() => { tell(element); resolve() }, 0))
  }
  Document.prototype.exitFullscreen = function () {
    window.__grsFullScreen.exits += 1
    return new Promise((resolve) => setTimeout(() => { tell(null); resolve() }, 0))
  }
`

interface Seen {
  readonly requests: number
  readonly exits: number
  readonly isDocumentElement: boolean
  readonly isHeld: boolean
  readonly isPressed: boolean
  readonly notices: string
  readonly f11Prevented: readonly boolean[]
}

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error('the shipped build this file drives is not there; run `npx vite build` first (dist/index.html)')
  }
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function openTheApp(standIn: boolean): Promise<{ page: Page; close(): Promise<void> }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  if (standIn) await page.addInitScript(STAND_IN_BROWSER)
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

// see FR-071, IC-11
/** @purity semi-pure-b */
async function look(page: Page): Promise<Seen> {
  return page.evaluate((selector: string) => {
    const state = (window as unknown as { __grsFullScreen?: { requests: number; exits: number } }).__grsFullScreen
    const keys = (window as unknown as { __grsKeys?: KeyboardEvent[] }).__grsKeys ?? []
    const entry = document.querySelector(selector)
    return {
      requests: state?.requests ?? -1,
      exits: state?.exits ?? -1,
      isDocumentElement: document.fullscreenElement === document.documentElement,
      isHeld: document.fullscreenElement !== null,
      isPressed: entry !== null && entry.getAttribute('aria-pressed') === 'true',
      notices: [...document.querySelectorAll('[data-role="Notification Area"]')]
        .map((one) => one.textContent ?? '')
        .join(' '),
      f11Prevented: keys.filter((one) => one.key === 'F11').map((one) => one.defaultPrevented),
    }
  }, ENTRY)
}

/** @purity non-pure */
async function pressEntry(page: Page): Promise<Seen> {
  await page.click(ENTRY, { timeout: 8_000 })
  await page.waitForTimeout(SETTLE_MS)
  return look(page)
}

const toldRs59 = (seen: Seen): boolean => RS_59_WORDS.some((words) => seen.notices.includes(words))

test('FR-071 (MUST): IC-11 asks the browser to enter, the look follows fullscreenchange, and a second press leaves', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp(true)
  try {
    const before = await look(opened.page)
    expect(before, 'premise: not full screen, IC-11 not pressed').toMatchObject({ isHeld: false, isPressed: false })
    const entered = await pressEntry(opened.page)
    expect(entered).toMatchObject({ requests: 1, exits: 0, isDocumentElement: true, isPressed: true })
    const left = await pressEntry(opened.page)
    expect(left).toMatchObject({ requests: 1, exits: 1, isHeld: false, isPressed: false })
  } finally {
    await opened.close()
  }
})

test('FR-071: full screen left by the browser itself brings the look of IC-11 back without an ask', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp(true)
  try {
    expect(await pressEntry(opened.page)).toMatchObject({ isDocumentElement: true, isPressed: true })
    await opened.page.evaluate(() => {
      ;(window as unknown as { __grsFullScreen: { element: Element | null } }).__grsFullScreen.element = null
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    await opened.page.waitForTimeout(SETTLE_MS)
    expect(await look(opened.page)).toMatchObject({ requests: 1, exits: 0, isHeld: false, isPressed: false })
  } finally {
    await opened.close()
  }
})

test('FR-071 (MUST): the F11 keydown has its default prevented and asks the browser to enter', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp(true)
  try {
    await opened.page.keyboard.press('F11')
    await opened.page.waitForTimeout(SETTLE_MS)
    const seen = await look(opened.page)
    expect(seen.f11Prevented, 'SK-15: every F11 keydown had its default prevented').toEqual([true])
    expect(seen).toMatchObject({ requests: 1, exits: 0, isDocumentElement: true, isPressed: true })
  } finally {
    await opened.close()
  }
})

test('FR-071 (MUST): a refused ask tells RS-59 and IC-11 is not drawn pressed', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp(true)
  try {
    await opened.page.evaluate(() => {
      ;(window as unknown as { __grsFullScreen: { refuse: boolean } }).__grsFullScreen.refuse = true
    })
    const seen = await pressEntry(opened.page)
    expect(seen).toMatchObject({ requests: 1, isHeld: false, isPressed: false })
    expect(toldRs59(seen), `RS-59 is told; the Notification Area reads: ${seen.notices}`).toBe(true)
  } finally {
    await opened.close()
  }
})

test('FR-071 in the real browser: IC-11 enters full screen or tells RS-59, and the look agrees with the browser', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp(false)
  try {
    const seen = await pressEntry(opened.page)
    expect(seen.isDocumentElement || toldRs59(seen), `entered or told RS-59: ${JSON.stringify(seen)}`).toBe(true)
    expect(seen.isPressed, 'the pressed look of IC-11 is document.fullscreenElement').toBe(seen.isHeld)
    // WHY: the second half needs the browser to have accepted; a refusal was already held to RS-59 above.
    if (seen.isDocumentElement) {
      expect(await pressEntry(opened.page)).toMatchObject({ isHeld: false, isPressed: false })
    }
  } finally {
    await opened.close()
  }
})
