// Use-case test for UC-011 (save the document and hand it out), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, answerConfirmation, drag, enableAgentApi, launch, openByDrop, press, readDocument, savedFiles, settle, specMismatch } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const STAMP = /\d{4}-\d\d-\d\dT\d{2}:\d{2}:\d{2}Z/g

const saveAs = async (page: Page, format: 'IO-2' | 'IO-3' | 'IO-4'): Promise<{ name: string; text: string }> => {
  const before = (await savedFiles(page)).length
  await press(page, 'IC-2')
  await page.click('[data-role="Export Chooser"] [data-format="' + format + '"]')
  await expect.poll(async () => (await savedFiles(page)).length).toBe(before + 1)
  return (await savedFiles(page))[before]!
}

const exportSvg = (page: Page): Promise<string> => page.evaluate(() => (window as any).grSchedulerAgentApi.exportSvg().value)

// see T-231
const normalisedSvg = (svg: string): string => svg.replace(STAMP, 'STAMP').replace(/-?\d+\.\d+/g, (n) => Number(n).toFixed(2)).replace(/>\s+</g, '><')

test('UC-011 save the document and hand it out (FR-096, FR-024, FR-080, FR-025, T-204 S-81, FR-027, FR-095)', async ({ page }) => {
  test.setTimeout(120000)
  specMismatch('UC-011 step 2 / FR-024, OP-10: the starting template is drawn unfitted with a null view position, and reopening its saved JSON fits it, so the same JSON draws a different picture')

  await test.step('UC-011 extension 1a: with nothing of one\'s own yet, one starting template is shown (FR-027, BT-4)', async () => {
    await launch(page)
    await enableAgentApi(page)
    const doc = await readDocument(page)
    expect(doc.schedule.tasks.length).toBeGreaterThan(0)
    expect(doc.schedule.taskGroups.length).toBeGreaterThan(0)
  })

  let saved = { name: '', text: '' }
  await test.step('UC-011 step 1: the author saves as JSON (IC-2, IO-2)', async () => {
    saved = await saveAs(page, 'IO-2')
    expect(saved.name.endsWith('.json')).toBe(true)
    expect(saved.text.trimStart().startsWith('{')).toBe(true)
  })

  await test.step('UC-011 step 2: that JSON carries enough to draw the same picture again (FR-024, OP-6)', async () => {
    const pictureBefore = normalisedSvg(await exportSvg(page))
    const documentBefore = await readDocument(page)
    await openByDrop(page, saved.name, saved.text)
    const documentAfter = await readDocument(page)
    expect(documentAfter.schedule).toEqual(documentBefore.schedule)
    expect(documentAfter.documentSettings).toEqual(documentBefore.documentSettings)
    expect.soft(normalisedSvg(await exportSvg(page)) === pictureBefore).toBe(true)
    await press(page, 'IC-13')
    const viewSet = normalisedSvg(await exportSvg(page))
    saved = await saveAs(page, 'IO-2')
    await openByDrop(page, saved.name, saved.text)
    expect(normalisedSvg(await exportSvg(page)) === viewSet).toBe(true)
  })

  await test.step('UC-011 step 3: the author writes the schedule out as images (IO-3, IO-4)', async () => {
    const svg = await saveAs(page, 'IO-3')
    expect(svg.name.endsWith('.svg')).toBe(true)
    expect(svg.text.startsWith('<svg')).toBe(true)
    const png = await saveAs(page, 'IO-4')
    expect(png.name.endsWith('.png')).toBe(true)
    expect(png.text.slice(1, 4)).toBe('PNG')
  })

  await test.step('UC-011 step 4: output size and font size live in the document, and the same document gives the same output (S-81, S-70, NS-5)', async () => {
    const settings = (await readDocument(page)).documentSettings
    const size = settings.exportCanvas
    const first = await saveAs(page, 'IO-3')
    const second = await saveAs(page, 'IO-3')
    expect(normalisedSvg(second.text)).toBe(normalisedSvg(first.text))
    expect(first.text).toContain('width="' + size.width + '"')
    expect(first.text).toContain('height="' + size.height + '"')
    expect(settings.fontScale).toBeTruthy()
    const reopened = JSON.parse(saved.text)
    expect(reopened.documentSettings.exportCanvas).toEqual(size)
    expect(reopened.documentSettings.fontScale).toBe(settings.fontScale)
  })

  await test.step('UC-011 extension 1b: starting anew with unsaved edits asks first, then shows the template (FR-095, OP-4)', async () => {
    await press(page, 'IC-23')
    await drag(page, { x: 1500, y: 1000 }, { x: 1700, y: 1000 })
    await page.keyboard.type('Unsaved work')
    await page.keyboard.press('Enter')
    await press(page, 'IC-23')
    expect((await readDocument(page)).schedule.tasks.some((t) => t.name === 'Unsaved work')).toBe(true)
    await press(page, 'IC-98')
    await expect(page.locator('[data-role="Confirmation"]')).toHaveCount(1)
    await answerConfirmation(page, 'proceed')
    await settle(page)
    const doc = await readDocument(page)
    expect(doc.schedule.tasks.some((t) => t.name === 'Unsaved work')).toBe(false)
    expect(doc.schedule.tasks.length).toBeGreaterThan(0)
  })
})
