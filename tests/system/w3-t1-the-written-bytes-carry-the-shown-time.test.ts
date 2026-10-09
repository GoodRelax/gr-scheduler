// W3 spec-only cases on the shipped build: FR-101 table HS-11 -- the AT-140 the written bytes carry is the time the lower line shows.

import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { unbroken } from '../contract/spec-table'
import { VIEWPORT, enableAgentApi, icon, launch, openByDrop, savedFiles, settle } from '../usecase/uc-harness'
import { taskGroupsDocument } from './w3-t1-stage'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: the constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const HS_11 =
  '`AT-140` には、保存（表 T-340 の `SX-1`）ではその保存の時刻（書けた後に下段が出す時刻）を、ほかでは書くときに下段が示している時刻を入れること（MUST）'

const FILE_SAVED_AT = '[data-role="File Saved At"]'

// see HS-2
/** @purity semi-pure-b */
async function shownTimeAsUtc(page: Page): Promise<string | null> {
  const said = (await page.locator(FILE_SAVED_AT).textContent()) ?? ''
  const found = /(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(said)
  if (found === null) return null
  const [, y, mo, d, h, mi, s] = found.map(Number) as [number, number, number, number, number, number, number]
  return new Date(y, mo - 1, d, h, mi, s).toISOString().slice(0, 19)
}

// WHY: a single .html carries the app's own code before the document; the document is the last stamp in the text.
/** @purity pure */
function lastStampOf(text: string): string | null {
  const all = [...text.matchAll(/"fileSavedUtc"\s*:\s*(null|"(\d{4}-\d\d-\d\dT[0-9]{2}:[0-9]{2}:[0-9]{2})[^"]*")/g)]
  const last = all[all.length - 1]
  return last === undefined ? 'absent' : (last[2] ?? null)
}

/** @purity non-pure */
async function savedOnce(page: Page): Promise<string | null> {
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, 'w3-t1-stamp.json', taskGroupsDocument({ rows: 2 }))
  await page.waitForTimeout(1_100)
  await page.keyboard.press('Control+s')
  await settle(page)
  return shownTimeAsUtc(page)
}

test.describe('W3-T1 the manuscript this case is driven by', () => {
  test('HS-11 still reads this way', () => {
    expect(REQUIREMENTS).toContain(HS_11)
  })
})

test.describe(`HS-11 (MUST): ${HS_11.slice(-40)}`, () => {
  test.setTimeout(180_000)

  test('SX-1: a save writes the time the lower line shows once the write is done', async ({ page }) => {
    const shown = await savedOnce(page)
    expect(shown, 'premise: the lower line shows a time after the save').not.toBeNull()
    const written = await savedFiles(page)
    expect(written.length, 'premise: Ctrl+S wrote one file').toBeGreaterThan(0)
    expect(lastStampOf(written[written.length - 1]?.text ?? '')).toBe(shown)
  })

  test('IO-7: a single .html written later carries the time the lower line shows when it is written', async ({ page }) => {
    const shown = await savedOnce(page)
    expect(shown, 'premise: the lower line shows the save time').not.toBeNull()
    await page.waitForTimeout(2_100)
    const before = (await savedFiles(page)).length
    await page.click(icon('IC-2'))
    await settle(page)
    await page.click('[data-role="Export Chooser"] [data-format="IO-7"]')
    await settle(page)
    const written = await savedFiles(page)
    expect(written.length, 'premise: the chooser wrote the .html').toBeGreaterThan(before)
    expect(lastStampOf(written[written.length - 1]?.text ?? ''), 'the chooser path').toBe(shown)
  })

  test('IO-7 through AM-15: the single .html the Agent API answers carries the time the lower line shows', async ({ page }) => {
    const shown = await savedOnce(page)
    expect(shown, 'premise: the lower line shows the save time').not.toBeNull()
    await page.waitForTimeout(2_100)
    const viaAgent = await page.evaluate(async () => {
      const answer = (await (window as any).grSchedulerAgentApi.exportEmbeddedHtml()) as unknown
      return typeof answer === 'string' ? answer : String((answer as { value?: unknown }).value ?? '')
    })
    expect(lastStampOf(viaAgent), 'the Agent API path (AM-15)').toBe(shown)
  })
})
