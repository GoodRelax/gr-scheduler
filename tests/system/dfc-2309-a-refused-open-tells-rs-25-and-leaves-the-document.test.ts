// DFC-2309 / DFC-1261 / DFC-656 spec-only system test on the built dist/index.html: a file that IC-1 opens and the reader refuses as RS-25 is told by NT-1 (FR-076, table T-233) and the open document does not change (FR-023).
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VIEWPORT, answerConfirmation, enableAgentApi, icon, launch, notificationText, press, readDocument, settle } from '../usecase/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const SPEC = resolve('docs', 'spec')
const REQUIREMENTS = readFileSync(resolve(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n')
const REASONS_TABLE = readFileSync(resolve(SPEC, '_assets', 'tbl-notice-reasons.md'), 'utf8').replace(/\r\n/g, '\n')
const WORDS = JSON.parse(readFileSync(resolve(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  reasons: { rowId: string; text: { ja: string; en: string }; nextStep: { ja: string; en: string } }[]
}

const NT_1_SAYS_WHY_IN_WORDS = 'どの項目が、なぜ誤りかを文字で示すこと（MUST）'
const NT_1_ROW = '| NT-1 | 入力を受け付けないとき |'
const FR_023_NO_PARTIAL_APPLY = '部分的に適用してはならない（MUST NOT）'
const RS_25_IS_SHOWN_BY_NT_1 = /^\| RS-25 \|[^|]*\| `NT-1` \| 出す \|/m

const RS_25 = WORDS.reasons.find((one) => one.rowId === 'RS-25')
const RS_11 = WORDS.reasons.find((one) => one.rowId === 'RS-11')

// WHY: a conforming GRS JSON has a schema address, a version and a schedule; none of these has any of them.
const BROKEN_JSON = '{"x":'
const OFF_SHAPE_JSON = '{"x":1}'
// WHY: the open route reads the single document container of a .html; its id is the one the shipped page uses for an embedded document.
const htmlHoldingOffShapeContent = (): string =>
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>GRS</title></head><body><div id="app"></div>' +
  `<script type="application/json" id="embedded-document">${OFF_SHAPE_JSON}</script></body></html>\n`

// WHY: the headless stand-in for the file picker hands over the next file; IC-1 then reads it as a person's open would.
const openThroughIc1 = async (page: Page, name: string, text: string): Promise<void> => {
  await page.evaluate(
    (given: { name: string; text: string }) => {
      ;(window as unknown as { __grsNextOpen: unknown }).__grsNextOpen = given
    },
    { name, text },
  )
  await press(page, 'IC-1')
  if (await page.locator('[data-role="Open Chooser"]').count()) {
    await page.click(icon('IC-71', '[data-role="Open Chooser"]'))
    await settle(page)
  }
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await answerConfirmation(page, 'proceed')
  await settle(page)
}

test('the clauses this test is driven by still stand', () => {
  expect(REQUIREMENTS.replace(/<br>/g, '')).toContain(NT_1_SAYS_WHY_IN_WORDS)
  expect(REQUIREMENTS).toContain(NT_1_ROW)
  expect(REQUIREMENTS.replace(/<br>/g, '')).toContain(FR_023_NO_PARTIAL_APPLY)
  expect(REASONS_TABLE, 'T-233 RS-25 is shown through NT-1').toMatch(RS_25_IS_SHOWN_BY_NT_1)
  expect(RS_25?.text.en.length ?? 0, 'the dictionary holds RS-25 text').toBeGreaterThan(0)
  expect(RS_25?.nextStep.en.length ?? 0, 'the dictionary holds RS-25 next step').toBeGreaterThan(0)
  expect(RS_25?.text.ja.length ?? 0, 'the dictionary holds RS-25 text in ja').toBeGreaterThan(0)
  expect(RS_25?.nextStep.ja.length ?? 0, 'the dictionary holds RS-25 next step in ja').toBeGreaterThan(0)
  expect(RS_11, 'the dictionary holds RS-11 (the control)').toBeDefined()
})

const REFUSED_SCENES: { scene: string; name: string; text: () => string }[] = [
  { scene: 'a syntactically broken JSON (DFC-656)', name: 'broken.json', text: () => BROKEN_JSON },
  { scene: 'a well-formed JSON of an off shape (DFC-2309, DFC-1261)', name: 'off-shape.json', text: () => OFF_SHAPE_JSON },
  { scene: 'a .html whose single document container holds off-shape content', name: 'off-shape.html', text: htmlHoldingOffShapeContent },
]

for (const { scene, name, text } of REFUSED_SCENES) {
  test(`${NT_1_SAYS_WHY_IN_WORDS}: opening ${scene} through IC-1 tells RS-25 with its next step and the open document does not change`, async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    const before = JSON.stringify(await readDocument(page))
    await openThroughIc1(page, name, text())
    const told = await notificationText(page)
    expect(told, `NT-1 says which item and why in words -- what stands: ${told.slice(0, 200)}`).toContain(RS_25?.text.en ?? '')
    expect(told, 'NT-1 adds a hint for the correction (the next step)').toContain(RS_25?.nextStep.en ?? '')
    expect(JSON.stringify(await readDocument(page)), 'the refused file changed nothing').toBe(before)
  })
}

test('control: a plain .txt through IC-1 tells RS-11 and the open document does not change', async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  const before = JSON.stringify(await readDocument(page))
  await openThroughIc1(page, 'hello.txt', 'hello')
  const told = await notificationText(page)
  expect(told, `what stands: ${told.slice(0, 200)}`).toContain(RS_11?.text.en ?? '')
  expect(told, 'RS-25 is not told for a file that is not a format').not.toContain(RS_25?.text.en ?? '')
  expect(JSON.stringify(await readDocument(page)), 'the refused file changed nothing').toBe(before)
})
