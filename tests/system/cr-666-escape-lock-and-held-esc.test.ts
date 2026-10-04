// CR-666 on the shipped build: entering full screen locks Escape in the same press, leaving unlocks, a refusal is silent, a held Esc spends no rung.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_071_LOCK =
  '全画面表示に入ることをブラウザに求める押下の中で、閲覧環境が Keyboard Lock（`navigator.keyboard`）を持つなら `Escape` の鍵をかけることを求め、全画面表示を出たことを受けたら鍵を放すこと（MUST）'
const FR_071_SILENT =
  'ら鍵を放すこと（MUST） —— 鍵が無いと、ブラウザが `Esc` をページより先に取り、表 T-028 の `IN-4` の段より先に全画面表示を解く。⛔ 鍵を断られたこと・閲覧環境が持たないことを通知してはならない（MUST NOT）'
const IN_4_HELD_ESC =
  '示の段は、全画面表示を出ることをブラウザに求める（`FR-071` の入口の押下と同じ求め）。⛔ 押しっぱなしの `Esc` の繰り返し（`KeyboardEvent.repeat` が真の押下）で段を消費してはならない（MUST NOT）'

const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const T_109 = specTable('T-109')
const T_103 = specTable('T-103')
const FULL_SCREEN_ENTRY = `[data-icon="${rowOf(T_109, 'IC-11').id}"]`
const HELP_ENTRY = `[data-icon="${rowOf(T_109, 'IC-22').id}"]`
const HELP = `[data-role="${(rowOf(T_103, 'U-30').by['確定名（英）'] ?? '').replace(/`/g, '')}"]`
const SETTLE_MS = 600

// see FR-071
// WHY: headless Chromium has neither a window to fill nor Keyboard Lock, so these stand in for both and
// WHY: log every ask with the press it came in; a press is open from its capture listener to the next task.
const STAND_IN_BROWSER = `
  const state = { requests: 0, exits: 0, element: null, keyboard: 'grants', press: 0, inPress: null, log: [], keys: [] }
  window.__grsCr666 = state
  const opened = () => {
    state.press += 1
    state.inPress = state.press
    setTimeout(() => { state.inPress = null }, 0)
  }
  const carried = () => {
    if (state.inPress === null) state.inPress = state.press
    setTimeout(() => { state.inPress = null }, 0)
  }
  window.addEventListener('pointerdown', opened, true)
  window.addEventListener('keydown', (event) => {
    state.keys.push({ key: event.key, repeat: event.repeat })
    opened()
  }, true)
  window.addEventListener('pointerup', carried, true)
  window.addEventListener('click', carried, true)
  const tell = (element) => {
    state.element = element
    document.dispatchEvent(new Event('fullscreenchange'))
  }
  Object.defineProperty(Document.prototype, 'fullscreenElement', { configurable: true, get() { return state.element } })
  Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get() { return true } })
  Element.prototype.requestFullscreen = function () {
    state.requests += 1
    state.log.push({ what: 'request', press: state.inPress })
    const element = this
    return new Promise((resolve) => setTimeout(() => { tell(element); resolve() }, 0))
  }
  Document.prototype.exitFullscreen = function () {
    state.exits += 1
    state.log.push({ what: 'exit', press: state.inPress })
    return new Promise((resolve) => setTimeout(() => { tell(null); resolve() }, 0))
  }
  const keyboard = {
    lock(keys) {
      state.log.push({ what: 'lock', keys: JSON.stringify(keys), press: state.inPress })
      if (state.keyboard === 'refuses') return Promise.reject(new DOMException('refused by the stand-in', 'NotAllowedError'))
      return Promise.resolve()
    },
    unlock() {
      state.log.push({ what: 'unlock', press: state.inPress })
    },
  }
  Object.defineProperty(Navigator.prototype, 'keyboard', {
    configurable: true,
    get() { return state.keyboard === 'absent' ? undefined : keyboard },
  })
`

interface Logged {
  readonly what: string
  readonly keys?: string
  readonly press: number | null
}

interface Seen {
  readonly requests: number
  readonly exits: number
  readonly isFullScreen: boolean
  readonly log: readonly Logged[]
  readonly keys: readonly { readonly key: string; readonly repeat: boolean }[]
  readonly notices: string
  readonly isHelpShown: boolean
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

/** @purity non-pure */
async function openTheApp(keyboard: 'grants' | 'refuses' | 'absent'): Promise<{ page: Page; close(): Promise<void> }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  await page.addInitScript(STAND_IN_BROWSER)
  await page.addInitScript(`window.__grsCr666.keyboard = ${JSON.stringify(keyboard)}`)
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

/** @purity semi-pure-b */
async function look(page: Page): Promise<Seen> {
  return page.evaluate((help: string) => {
    const state = (window as unknown as { __grsCr666: Record<string, unknown> }).__grsCr666
    const shown = document.querySelector(help)
    const box = shown?.getBoundingClientRect()
    return {
      requests: state['requests'] as number,
      exits: state['exits'] as number,
      isFullScreen: document.fullscreenElement === document.documentElement,
      log: state['log'] as Logged[],
      keys: state['keys'] as { key: string; repeat: boolean }[],
      notices: [...document.querySelectorAll('[data-role="Notification Area"]')].map((one) => one.textContent ?? '').join(' '),
      isHelpShown: box !== undefined && box.width > 0 && box.height > 0,
    }
  }, HELP)
}

/** @purity non-pure */
async function pressEntry(page: Page, selector: string): Promise<Seen> {
  await page.click(selector, { timeout: 8_000 })
  await page.waitForTimeout(SETTLE_MS)
  return look(page)
}

/** @purity non-pure */
async function leaveByTheBrowser(page: Page): Promise<Seen> {
  await page.evaluate(() => {
    const state = (window as unknown as { __grsCr666: { element: Element | null } }).__grsCr666
    state.element = null
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  await page.waitForTimeout(SETTLE_MS)
  return look(page)
}

const asked = (seen: Seen, what: string): readonly Logged[] => seen.log.filter((one) => one.what === what)

test.describe('CR-666 the manuscript these cases are driven by', () => {
  for (const [name, clause] of [
    ['FR-071 (MUST) lock in the press, unlock on leaving', FR_071_LOCK],
    ['FR-071 (MUST NOT) a refused or absent lock is not told', FR_071_SILENT],
    ['IN-4 (MUST NOT) a held Esc spends no rung', IN_4_HELD_ESC],
  ] as const) {
    test(`01-04 still says it, word for word: ${name}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
})

test(`FR-071 (MUST): ${FR_071_LOCK}`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp('grants')
  try {
    const entered = await pressEntry(opened.page, FULL_SCREEN_ENTRY)
    expect(entered.isFullScreen, 'premise: the stand-in entered full screen').toBe(true)
    const locks = asked(entered, 'lock')
    const requests = asked(entered, 'request')
    expect(locks.map((one) => one.keys), 'one lock, of Escape').toEqual([JSON.stringify(['Escape'])])
    expect(requests).toHaveLength(1)
    expect(locks[0]?.press, 'the lock is asked inside a press').not.toBeNull()
    expect(locks[0]?.press, 'the lock is asked in the same press as the request').toBe(requests[0]?.press)
    expect(asked(entered, 'unlock'), 'nothing is unlocked while full screen holds').toEqual([])

    const left = await leaveByTheBrowser(opened.page)
    expect(left.isFullScreen).toBe(false)
    expect(asked(left, 'unlock'), 'leaving full screen unlocks once').toHaveLength(1)
  } finally {
    await opened.close()
  }
})

test('FR-071 (MUST): leaving by the entrance unlocks after the browser tells it left, and entering again locks again', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp('grants')
  try {
    await pressEntry(opened.page, FULL_SCREEN_ENTRY)
    const left = await pressEntry(opened.page, FULL_SCREEN_ENTRY)
    expect(left).toMatchObject({ requests: 1, exits: 1, isFullScreen: false })
    const order = left.log.map((one) => one.what)
    expect(order.filter((what) => what === 'unlock'), 'one unlock').toHaveLength(1)
    expect(order.indexOf('unlock'), 'the unlock follows the exit').toBeGreaterThan(order.indexOf('exit'))
    const again = await pressEntry(opened.page, FULL_SCREEN_ENTRY)
    expect(asked(again, 'lock'), 'the second entry locks again').toHaveLength(2)
  } finally {
    await opened.close()
  }
})

for (const keyboard of ['refuses', 'absent'] as const) {
  test(`FR-071 (MUST NOT), the keyboard ${keyboard}: ${FR_071_SILENT}`, async () => {
    test.setTimeout(180_000)
    const opened = await openTheApp(keyboard)
    try {
      const before = await look(opened.page)
      const entered = await pressEntry(opened.page, FULL_SCREEN_ENTRY)
      expect(entered.isFullScreen, 'full screen is entered all the same').toBe(true)
      expect(entered.notices, 'nothing is told').toBe(before.notices)
      const left = await pressEntry(opened.page, FULL_SCREEN_ENTRY)
      expect(left.isFullScreen).toBe(false)
      expect(left.notices, 'nothing is told on leaving either').toBe(before.notices)
    } finally {
      await opened.close()
    }
  })
}

test(`IN-4 (MUST NOT): ${IN_4_HELD_ESC}`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp('grants')
  try {
    const page = opened.page
    expect((await pressEntry(page, FULL_SCREEN_ENTRY)).isFullScreen, 'premise: full screen').toBe(true)
    expect((await pressEntry(page, HELP_ENTRY)).isHelpShown, 'premise: the help is open').toBe(true)

    await page.keyboard.down('Escape')
    await page.waitForTimeout(SETTLE_MS)
    const first = await look(page)
    expect(first.isHelpShown, 'the first Esc closes the open window').toBe(false)
    expect(first).toMatchObject({ isFullScreen: true, exits: 0 })

    await page.keyboard.down('Escape')
    await page.keyboard.down('Escape')
    await page.waitForTimeout(SETTLE_MS)
    const held = await look(page)
    const escapes = held.keys.filter((one) => one.key === 'Escape')
    expect(escapes.map((one) => one.repeat), 'premise: the browser saw one press and two repeats').toEqual([false, true, true])
    expect(held, 'the repeats spend no rung: full screen stays').toMatchObject({ isFullScreen: true, exits: 0 })

    await page.keyboard.up('Escape')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(SETTLE_MS)
    expect(await look(page), 'a fresh Esc spends the last rung, full screen').toMatchObject({ isFullScreen: false, exits: 1 })
  } finally {
    await opened.close()
  }
})
