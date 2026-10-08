// CR-610 / CR-611 / CR-612 spec-only system tests on the built dist/index.html: HS-8, SX-1, SK-25, FR-067 and RS-67 through the UI.
import { expect, test, type Page } from '@playwright/test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { VIEWPORT, answerConfirmation, enableAgentApi, launch, press, readDocument, savedFiles, settle } from '../usecase/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const DIST = readFileSync(resolve('dist/index.html'), 'utf8')
const WORDS = JSON.parse(readFileSync(resolve('docs/spec/_source/display-words.json'), 'utf8')) as { reasons: { rowId: string; text: { ja: string; en: string } }[] }
const RS_67 = WORDS.reasons.find((one) => one.rowId === 'RS-67')
const LOWER_LINE = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} {2}(\d+\.\d\[kB\])$/
const EMBEDDED = 'id="embedded-document"'

// see FR-027
const templateContainerId = (): string | null => /<script type="application\/json" id="([^"]+)"/.exec(DIST.replace(/<script type="module">[\s\S]*?<\/script>/g, ''))?.[1] ?? null

// see HS-3
const sizeSpelling = (bytes: number): string => `${(Math.floor((bytes + 50) / 100) / 10).toFixed(1)}[kB]`

// see IC-2, T-024
const writeOut = async (page: Page, format: string): Promise<{ name: string; text: string }> => {
  const before = (await savedFiles(page)).length
  await press(page, 'IC-2')
  await page.click('[data-role="Export Chooser"] [data-format="' + format + '"]')
  await expect.poll(async () => (await savedFiles(page)).length).toBe(before + 1)
  await settle(page)
  return (await savedFiles(page))[before]!
}

// see OP-2
const drop = async (page: Page, name: string, text: string): Promise<void> => {
  await page.evaluate(
    ({ name, text }) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([text], name))
      const target = document.querySelector('[data-role="Schedule Canvas"]') as Element
      for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
    },
    { name, text },
  )
  await settle(page)
}

// see HS-8, U-31
const headerHeights = (page: Page): Promise<{ shown: number; hidden: number; inside: boolean }> =>
  page.evaluate(() => {
    const header = document.querySelector('[data-role="App Header"]') as HTMLElement
    const name = document.querySelector('[data-role="Opened File Name"]') as HTMLElement
    const moment = document.querySelector('[data-role="File Saved At"]') as HTMLElement
    let box: HTMLElement = name
    while (!box.contains(moment)) box = box.parentElement as HTMLElement
    const outer = header.getBoundingClientRect()
    const inside = [name, moment].every((one) => {
      const r = one.getBoundingClientRect()
      return r.top >= outer.top - 0.5 && r.bottom <= outer.bottom + 0.5
    })
    const shown = outer.height
    const kept = box.style.display
    box.style.display = 'none'
    const hidden = header.getBoundingClientRect().height
    box.style.display = kept
    return { shown, hidden, inside }
  })

test('SX-1 / HS-1 / HS-2 / HS-3: a GRS JSON written through IC-2 names the file, the time and the size in the header', async ({ page }) => {
  await launch(page)
  const saved = await writeOut(page, 'IO-2')
  await expect(page.locator('[data-role="Opened File Name"]')).toHaveText(saved.name)
  const lower = (await page.locator('[data-role="File Saved At"]').innerText()).trim()
  expect(lower, 'HS-1 / HS-2 / HS-3: the lower line is not `yyyy/mm/dd hh:mm:ss  n.n[kB]`').toMatch(LOWER_LINE)
  expect(LOWER_LINE.exec(lower)?.[1]).toBe(sizeSpelling(new TextEncoder().encode(saved.text).byteLength))
})

test('HS-8: the two lines do not count toward the App Header height and stay inside it at the default 16px ground', async ({ page }) => {
  await launch(page)
  const before = (await savedFiles(page)).length
  // STEP: SK-11 names the file in every build, so both lines hold text before the header is measured
  await page.keyboard.press('Control+s')
  await expect.poll(async () => (await savedFiles(page)).length).toBe(before + 1)
  await settle(page)
  await expect(page.locator('[data-role="Opened File Name"]'), 'precondition: the upper line is empty').not.toHaveText('')
  const measured = await headerHeights(page)
  expect(Math.abs(measured.shown - measured.hidden), `HS-8: the file status made the header ${measured.shown} instead of ${measured.hidden}`).toBeLessThanOrEqual(0.5)
  expect(measured.inside, 'HS-8: a line is clipped by the App Header at the default ground').toBe(true)
})

test('SK-25 / FR-095 / T-342: N with nothing unsaved asks nothing and leaves the empty document', async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2)
  await page.keyboard.press('n')
  await settle(page)
  await expect(page.locator('[data-role="Confirmation"]'), 'FR-095: N asked with nothing unsaved').toHaveCount(0)
  const document = await readDocument(page)
  expect(document.schedule.tasks).toEqual([])
  expect(document.schedule.taskGroups).toHaveLength(1)
})

test('FR-067 (MUST NOT): a single .html written out carries the embedded document and no template container', async ({ page }) => {
  await launch(page)
  const template = templateContainerId()
  expect(template, 'FR-027: the shipped page has no template container to leave out').not.toBeNull()
  const written = await writeOut(page, 'IO-7')
  expect(written.text.split(EMBEDDED).length - 1).toBe(1)
  expect(written.text).not.toContain(`id="${template}"`)
})

test('FR-067 (MUST): a single .html written out opens through the open route of another GRS (OP-3 first)', async ({ page }) => {
  await launch(page)
  const written = await writeOut(page, 'IO-7')
  await drop(page, written.name, written.text)
  await expect(page.locator('[data-role="Open Chooser"]'), 'FR-067: the exported .html was not offered OP-3').toHaveCount(1)
})

test('FR-067 (MUST): the shipped index.html opened through the open route opens the template (T-226)', async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  await drop(page, 'index.html', DIST)
  await expect(page.locator('[data-role="Open Chooser"]'), 'FR-067: the own index.html of the app was refused').toHaveCount(1)
  await page.click('[data-role="Open Chooser"] [data-icon="IC-71"]')
  await settle(page)
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await answerConfirmation(page, 'proceed')
  const document = await readDocument(page)
  expect(document.schedule.tasks).toHaveLength(1000)
  expect(document.schedule.taskGroups).toHaveLength(100)
})

test('RS-67 / NT-1: an .html GRS cannot open is refused with RS-67', async ({ page }) => {
  await launch(page)
  await drop(page, 'other.html', '<!doctype html><html><body><p>not GRS</p></body></html>')
  await expect(page.locator('[data-role="Open Chooser"]')).toHaveCount(0)
  const told = await page.locator('[data-role="Notification Area"]').innerText()
  expect([RS_67?.text.en, RS_67?.text.ja].some((words) => words !== undefined && told.includes(words)), 'RS-67 was not told').toBe(true)
})

// see BT-1, BT-4, FR-067
const startFrom = async (page: Page, html: string): Promise<void> => {
  const path = join(mkdtempSync(join(tmpdir(), 'grs-cr-612-')), 'handed.html')
  writeFileSync(path, html)
  await page.goto(pathToFileURL(path).href)
  await page.waitForSelector('[data-role="Schedule Canvas"]')
  await settle(page)
}

test('FR-067 / RS-67 / BT-4: an exported .html holding two embedded documents tells RS-67 and starts empty', async ({ page }) => {
  await launch(page)
  const written = await writeOut(page, 'IO-7')
  const container = /<script[^>]*id="embedded-document"[^>]*>[\s\S]*?<\/script>/.exec(written.text)?.[0] ?? ''
  expect(container, 'precondition: the written .html holds no embedded document').not.toBe('')
  await startFrom(page, written.text.replace('</body>', container + '</body>'))
  const told = await page.locator('[data-role="Notification Area"]').innerText()
  expect([RS_67?.text.en, RS_67?.text.ja].some((words) => words !== undefined && told.includes(words)), 'FR-067: RS-67 was not told at start-up').toBe(true)
  await enableAgentApi(page)
  const document = await readDocument(page)
  expect(document.schedule.tasks, 'BT-4: the exported .html did not fall to the empty document').toEqual([])
})
