// CR-650 system case: T-341 HS-8 / HS-9 / HS-10 and T-349 BR-7 measured on the running application.

// WHY: overlap, clipping and the header height are decided by layout in a real browser; the fake DOM cannot see them.
// WHY: every number asserted is read out of docs/spec at read time, never measured locally.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T025: SpecTable = specTable('T-025')
const T206: SpecTable = specTable('T-206')

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  return value
}

/** @purity pure */
function settingOf(id: string): number {
  return numberIn(rowOf(T206, id).cells[1] ?? '', `table T-206 row ${id}`)
}

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))
const S_235 = settingOf('S-235')
const S_491 = settingOf('S-491')
const S_492 = settingOf('S-492')

// see HS-9, HS-10, BR-7
const GAP_PX = S_491 * S_235

// WHY: half a pixel either way is subpixel layout, not a different gap.
const SUBPIXEL = 0.75

// see IC-1, IC-71, U-55
const OPEN_ENTRANCE = rowOf(specTable('T-109'), 'IC-1').id
const REPLACE_ENTRANCE = rowOf(specTable('T-109'), 'IC-71').id
const CONFIRMATION = `[data-role="${bare(rowOf(specTable('T-103'), 'U-55').cells[0] ?? '')}"]`
const PROCEED_WORD: string = (() => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { confirmation: { answer: string; text: { en: string } }[] }
  const found = raw.confirmation.find((one) => one.answer === 'proceed')
  if (found === undefined) throw new Error('the dictionary holds no proceed answer')
  return found.text.en
})()

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown>

const LONG_TITLE = `${'A document title long enough to fill the whole header strip '.repeat(6)}TITLE-END`
const LONG_NAME = `HEAD-${'a-file-name-that-keeps-going-'.repeat(8)}TAIL.json`

/** @purity pure */
function longTitledDocument(): string {
  const root = structuredClone(TEMPLATE)
  ;((root['schedule'] as Record<string, unknown>)['project'] as Record<string, unknown>)['title'] = LONG_TITLE
  return JSON.stringify(root)
}

interface Box {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

interface Measured {
  readonly header: Box
  readonly divider: Box
  readonly ground: Box
  readonly title: Box
  readonly status: Box
  readonly name: Box
  readonly savedAt: Box
  readonly commands: Box
  readonly nameText: string
  readonly hitNameTail: string | null
  readonly hitSavedAt: string | null
  readonly headerHeightWithoutStatus: number
  readonly nameGlyphs: Box
  readonly headerBorderTop: number
  readonly headerBorderBottom: number
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function openStubbed(baseURL: string | undefined): Promise<{ page: Page; close(): Promise<void> }> {
  if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ baseURL, viewport: BASE_SCREEN })
  // WHY: a real file chooser cannot be answered from a test; it is handed one that answers with a long-named file.
  await context.addInitScript((given: { name: string; text: string }) => {
    const file = new File([given.text], given.name, { type: 'application/json' })
    const handle = {
      kind: 'file',
      name: file.name,
      getFile: async () => file,
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
    }
    ;(window as unknown as Record<string, unknown>)['showOpenFilePicker'] = async () => [handle]
  }, { name: LONG_NAME, text: longTitledDocument() })
  const page = await context.newPage()
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return { page, close: async () => context.close() }
}

/** @purity semi-pure-b */
async function headerHeight(page: Page): Promise<number> {
  return page.evaluate(
    () => document.querySelector('[data-role="App Header"]')?.getBoundingClientRect().height ?? -1,
  )
}

/** @purity non-pure */
async function pressIcon(page: Page, icon: string): Promise<void> {
  const at = await page.evaluate((one: string) => {
    const entry = document.querySelector(`[data-icon="${one}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) throw new Error(`the entrance ${icon} is not on the screen`)
  await page.mouse.click(at.x, at.y)
}

/** @purity non-pure */
async function openLongNamed(page: Page): Promise<void> {
  await pressIcon(page, OPEN_ENTRANCE)
  await page.waitForTimeout(1_500)
  await pressIcon(page, REPLACE_ENTRANCE)
  await page.waitForTimeout(1_000)
  const proceed = await page.$(`${CONFIRMATION} button:has-text(${JSON.stringify(PROCEED_WORD)})`)
  if (proceed !== null) await proceed.click({ timeout: 3_000 })
  await expect(page.locator('[data-role="Document Title"]').first()).toHaveText(LONG_TITLE, { timeout: 15_000 })
  await expect(page.locator('[data-role="Opened File Name"]')).toHaveText(LONG_NAME, { timeout: 15_000 })
  await page.waitForTimeout(500)
}

/** @purity semi-pure-b */
async function measure(page: Page): Promise<Measured> {
  return page.evaluate(() => {
    const one = (role: string): Element => {
      const found = document.querySelector(`[data-role="${role}"]`)
      if (found === null) throw new Error(`the page has no ${role}`)
      return found
    }
    const box = (role: string) => {
      const rect = one(role).getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    }
    const roleAt = (x: number, y: number): string | null =>
      document.elementFromPoint(x, y)?.closest('[data-role]')?.getAttribute('data-role') ?? null
    const name = box('Opened File Name')
    const savedAt = box('File Saved At')
    const middle = (part: { top: number; bottom: number }) => (part.top + part.bottom) / 2
    const status = one('File Status') as HTMLElement
    const was = status.style.display
    status.style.display = 'none'
    const headerHeightWithoutStatus = one('App Header').getBoundingClientRect().height
    status.style.display = was
    return {
      header: box('App Header'),
      divider: box('Branding Divider'),
      ground: box('Document Title Ground'),
      title: box('Document Title'),
      status: box('File Status'),
      name,
      savedAt,
      commands: box('Header Commands'),
      nameText: one('Opened File Name').textContent ?? '',
      hitNameTail: roleAt(name.right - 2, middle(name)),
      hitSavedAt: roleAt((savedAt.left + savedAt.right) / 2, middle(savedAt)),
      headerHeightWithoutStatus,
      nameGlyphs: (() => {
        const range = document.createRange()
        range.selectNodeContents(one('Opened File Name'))
        const rect = range.getBoundingClientRect()
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      })(),
      headerBorderTop: Number.parseFloat(getComputedStyle(one('App Header')).borderTopWidth) || 0,
      headerBorderBottom: Number.parseFloat(getComputedStyle(one('App Header')).borderBottomWidth) || 0,
    }
  })
}

test('CR-650 HS-8 HS-9 HS-10 BR-7: a long title and a long file name share the header', async ({ baseURL }) => {
  test.setTimeout(120_000)
  const opened = await openStubbed(baseURL)
  try {
    const page = opened.page
    const heightBefore = await headerHeight(page)
    await openLongNamed(page)
    const seen = await measure(page)

    expect(seen.header.bottom - seen.header.top, 'HS-8: a file name does not change the App Header height').toBeCloseTo(
      heightBefore,
      1,
    )
    expect(
      seen.headerHeightWithoutStatus,
      'HS-8: the App Header height equals its height with the two-line box not drawn',
    ).toBeCloseTo(seen.header.bottom - seen.header.top, 1)

    // WHY: the band's own frame line is not the band; the divider runs between its inner edges.
    expect(seen.divider.right - seen.divider.left, 'BR-7: the divider is S-492 px wide').toBeCloseTo(S_492, 1)
    expect(seen.divider.top, 'BR-7: the divider reaches the top of the band').toBeLessThanOrEqual(
      seen.header.top + seen.headerBorderTop + SUBPIXEL,
    )
    expect(seen.divider.bottom, 'BR-7: the divider reaches the bottom of the band').toBeGreaterThanOrEqual(
      seen.header.bottom - seen.headerBorderBottom - SUBPIXEL,
    )
    expect(seen.ground.left - seen.divider.right, 'BR-7: S-491 x S-235 right of the divider').toBeCloseTo(GAP_PX, 0)

    expect(seen.commands.left - seen.status.right, 'HS-9: S-491 x S-235 between the box and Header Commands').toBeCloseTo(
      GAP_PX,
      0,
    )
    expect(Math.abs(seen.name.right - seen.savedAt.right), 'HS-9: both lines are right-aligned').toBeLessThanOrEqual(
      SUBPIXEL,
    )
    expect(seen.nameText, 'HS-10 MUST NOT: the end of the name is not elided').toBe(LONG_NAME)

    expect(
      seen.ground.right,
      'HS-10 MUST NOT: the title and its gap end left of the lower line, which is never covered',
    ).toBeLessThanOrEqual(seen.savedAt.left + SUBPIXEL)
    expect(seen.hitSavedAt, 'HS-10 MUST NOT: the lower line stays on top where it is drawn').toBe('File Saved At')
    expect(seen.hitNameTail, 'HS-10: the tail (extension side) of the name stays visible').toBe('Opened File Name')
    expect(
      seen.nameGlyphs.left,
      'HS-10: the head of the name lies left of where the name can be seen (under the title or past the shared width)',
    ).toBeLessThan(Math.max(seen.name.left, seen.ground.right) - 1)
    expect(seen.nameGlyphs.right, 'HS-10: the tail of the name ends inside its box').toBeLessThanOrEqual(
      seen.name.right + SUBPIXEL,
    )
    expect(seen.title.right, 'HS-10: the title is cut inside its ground').toBeLessThanOrEqual(
      seen.ground.right - GAP_PX + SUBPIXEL,
    )
  } finally {
    await opened.close()
  }
})
