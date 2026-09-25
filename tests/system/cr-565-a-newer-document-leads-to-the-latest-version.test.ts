// CR-565 on the shipped build: a dropped newer document opens, tells RS-63, and leads to S-350 by a link (FR-073).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable } from '../contract/spec-table'
import { DOWNLOAD_ADDRESS, DOWNLOAD_URL_SEAT } from '../fixtures/download-address'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const NOTIFICATION_AREA = bare(rowOf(specTable('T-103'), 'U-57').cells[0] ?? '')
const REPLACE_ENTRANCE = rowOf(specTable('T-109'), 'IC-71').id
const OPEN_ENTRANCE = rowOf(specTable('T-109'), 'IC-1').id
const CONFIRMATION = `[data-role="${bare(rowOf(specTable('T-103'), 'U-55').cells[0] ?? '')}"]`
const PROCEED_WORD: string = (() => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { confirmation: { answer: string; text: { en: string } }[] }
  const found = raw.confirmation.find((one) => one.answer === 'proceed')
  if (found === undefined) throw new Error('the dictionary holds no proceed answer')
  return found.text.en
})()

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

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown>

const RS_63_WORDS: readonly string[] = (() => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: { rowId: string; text: { ja: string; en: string } }[] }
  const found = raw.reasons.find((one) => one.rowId === 'RS-63')
  if (found === undefined) throw new Error('the dictionary holds no RS-63')
  return [found.text.ja, found.text.en]
})()

const HANDED_TITLE = 'Handed over by a drop'

const newerDocument = (): string => {
  const root = structuredClone(TEMPLATE)
  const known = String(root['schemaVersion'])
  root['schemaVersion'] = `9${known.slice(1)}`
  ;((root['schedule'] as Record<string, unknown>)['project'] as Record<string, unknown>)['title'] = HANDED_TITLE
  return JSON.stringify(root)
}

interface Seen {
  readonly toldRs63: boolean
  readonly links: readonly { readonly text: string; readonly target: string; readonly rel: string }[]
  readonly seatLeft: boolean
  readonly noticeText: string
  readonly title: string
}

let browser: Browser | null = null
let seen: Seen | null = null
let failed: Error | null = null

test.beforeAll(async () => {
  test.setTimeout(120_000)
  if (!existsSync(SHIPPED_BUILD)) throw new Error('run `npm run build` first (dist/index.html)')
  browser = await launchReferenceBrowser()
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  try {
    // WHY: a real file chooser cannot be answered from a test; the page is handed
    // a chooser that answers with the newer document, as a person would pick it.
    await page.addInitScript((text: string) => {
      const file = new File([text], 'newer.json', { type: 'application/json' })
      const handle = {
        kind: 'file',
        name: file.name,
        getFile: async () => file,
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
      }
      ;(window as unknown as Record<string, unknown>)['showOpenFilePicker'] = async () => [handle]
    }, newerDocument())
    await page.goto(pathToFileURL(SHIPPED_BUILD).href)
    await readSettledDrawnSvg(page)
    await pressIcon(page, OPEN_ENTRANCE)
    await page.waitForTimeout(1_500)
    await pressIcon(page, REPLACE_ENTRANCE)
    await page.waitForTimeout(1_000)
    const proceed = await page.$(`${CONFIRMATION} button:has-text(${JSON.stringify(PROCEED_WORD)})`)
    if (proceed !== null) await proceed.click({ timeout: 3_000 })
    await page.waitForTimeout(1_500)
    seen = await page.evaluate(
      (given: { address: string; seat: string; words: string[]; notices: string }) => {
        const onPage = document.body.textContent ?? ''
        return {
          toldRs63: given.words.some((said) => onPage.includes(said)),
          links: Array.from(document.querySelectorAll('a'))
            .filter((link) => link.getAttribute('href') === given.address)
            .map((link) => ({
              text: (link.textContent ?? '').trim(),
              target: link.getAttribute('target') ?? '',
              rel: link.getAttribute('rel') ?? '',
            })),
          seatLeft: onPage.includes(given.seat),
          noticeText: Array.from(document.querySelectorAll(`[data-role="${given.notices}"]`))
            .map((node) => (node.textContent ?? '').trim())
            .join(' | '),
          title: document.querySelector('[data-role="Document Title"]')?.textContent ?? '',
        }
      },
      { address: DOWNLOAD_ADDRESS, seat: DOWNLOAD_URL_SEAT, words: [...RS_63_WORDS], notices: NOTIFICATION_AREA },
    )
  } catch (thrown) {
    failed = thrown instanceof Error ? thrown : new Error(String(thrown))
  } finally {
    await context.close()
  }
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

test('FR-073 -- a newer document with nothing unread tells RS-63, and its link opens S-350 in a new tab with no reference', () => {
  if (failed !== null) throw failed
  if (seen === null) throw new Error('the sweep did not run')
  expect(seen.title, 'the newer document replaced the open one').toContain(HANDED_TITLE)
  expect(seen.toldRs63, `RS-63 was not told; the ${NOTIFICATION_AREA} said ${JSON.stringify(seen.noticeText)}`).toBe(true)
  expect(seen.links.length, 'FR-073 (MUST): no link on the page has S-350 as its href').toBeGreaterThan(0)
  for (const link of seen.links) {
    expect(link.text, 'FR-073 (MUST): the link reads S-350 itself').toBe(DOWNLOAD_ADDRESS)
    expect(link.target, 'FR-073 (MUST): the link opens a new tab').toBe('_blank')
    expect(link.rel.split(/\s+/), 'FR-073 (MUST NOT): no reference to this page').toEqual(
      expect.arrayContaining(['noopener', 'noreferrer']),
    )
  }
  expect(seen.seatLeft, 'FR-073 (MUST NOT): the seat was printed instead of S-350').toBe(false)
})
