// CR-709 spec-only system test on the built dist/index.html: table T-024 IO-7 -- the written single .html starts with its doctype.
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VIEWPORT, launch, press, savedFiles, settle } from '../usecase/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const REQUIREMENTS = readFileSync(resolve('docs/spec/01-04-requirements.md'), 'utf8').replace(/<br>/g, '')

// WHY: ends exactly at its marker, cut from the manuscript as check 39 reads it.
// see IO-7
const IO_7_DOCTYPE = '⭐ 書き出す `.html` は、文書型の宣言 `<!DOCTYPE html>` で始めること（MUST）'

// see IC-2, T-024
const writeOut = async (page: Page, format: string): Promise<{ name: string; text: string }> => {
  const before = (await savedFiles(page)).length
  await press(page, 'IC-2')
  await page.click('[data-role="Export Chooser"] [data-format="' + format + '"]')
  await expect.poll(async () => (await savedFiles(page)).length).toBe(before + 1)
  await settle(page)
  return (await savedFiles(page))[before]!
}

test(`IO-7 premise: the clause still reads ${IO_7_DOCTYPE}`, () => {
  expect(REQUIREMENTS).toContain(IO_7_DOCTYPE)
})

test(`IO-7 (MUST): ${IO_7_DOCTYPE}`, async ({ page }) => {
  await launch(page)
  const written = await writeOut(page, 'IO-7')
  expect(written.name.toLowerCase().endsWith('.html'), 'premise: IO-7 wrote an .html').toBe(true)
  // WHY: an HTML doctype is case-insensitive; nothing, not even a blank line, may stand before it.
  expect(written.text.slice(0, '<!DOCTYPE html>'.length).toLowerCase(), IO_7_DOCTYPE).toBe('<!doctype html>')
})
