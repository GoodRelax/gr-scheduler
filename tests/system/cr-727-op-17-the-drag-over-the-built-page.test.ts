// CR-727 spec-only system tests on the built dist/index.html: the window counts file drags in and out (OP-17, FT-1), so moving over a child never hides the Drop Cue.
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VIEWPORT, launch, settle } from '../usecase/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const SPEC = resolve('docs', 'spec')
const OP_17_TEXT = readFileSync(resolve(SPEC, '01-04-requirements.md'), 'utf8')
const WORDS = JSON.parse(readFileSync(resolve(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  dropCue: { part: string; text: { ja: string; en: string } }[]
}
const CUE_WORDS = WORDS.dropCue.find((one) => one.part === 'dropToOpen')?.text

const OP_17_SAME_UI = '⚠️ ドラッグがウィンドウの中の別の UI パーツへ移るだけでは消さない。'
const OP_17_OUTSIDE = 'ドラッグがウィンドウの外へ出たとき、とドロップしたときは消すこと（MUST）'
const OP_17_ONLY_FILES = 'ファイルを持つドラッグ（閲覧環境が渡す `dataTransfer.types` に `Files` が在るもの）がウィンドウの上に来たら、ドロップの案内（`_assets/tbl-glossary.md` の `U-68`）を出すこと（MUST）'
const OP_17_REFUSED = '⚠️ ドロップしても受け付けないあいだ'
const CUE = '[data-role="Drop Cue"]'
// WHY: a drop of something the app cannot read raises a notice and no chooser, so the dragged file is a real GRS JSON document.
const DOCUMENT_TEXT = readFileSync(resolve('src', 'framework', 'single-html-shell', 'empty-document.json'), 'utf8')

test('the clauses these cases drive are still in the manuscript', () => {
  const flat = OP_17_TEXT.replace(/\r?\n/g, '')
  for (const clause of [OP_17_SAME_UI, OP_17_OUTSIDE, OP_17_ONLY_FILES, OP_17_REFUSED]) expect(flat).toContain(clause)
  expect(CUE_WORDS?.en).toBeTruthy()
})

type Kind = 'dragenter' | 'dragleave' | 'drop'

// WHY: a browser fires dragenter on the element it enters and dragleave on the one it leaves, so the page is driven the same way, element by element.
const fire = async (page: Page, kind: Kind, selector: string, withFiles = true): Promise<void> => {
  await page.evaluate(
    ({ kind, selector, withFiles, text }) => {
      const transfer = new DataTransfer()
      if (withFiles) transfer.items.add(new File([text], 'dragged.json'))
      else transfer.setData('text/plain', 'just words')
      const target = (selector === 'window' ? document.body : document.querySelector(selector)) as Element
      target.dispatchEvent(new DragEvent(kind, { bubbles: true, cancelable: true, dataTransfer: transfer }))
    },
    { kind, selector, withFiles, text: DOCUMENT_TEXT },
  )
}

const CANVAS = '[data-role="Schedule Canvas"]'
const HEADER = '[data-role="App Header"]'

// WHY: the cue is drawn by the frame that follows the event, so the page is read after it settles.
const cueCount = async (page: Page): Promise<number> => {
  await settle(page)
  return page.locator(CUE).count()
}

test('OP-17 (MUST): a drag carrying files over the window shows the cue, over the Schedule Canvas, with the dictionary words', async ({ page }) => {
  await launch(page)
  await fire(page, 'dragenter', CANVAS)
  await expect.poll(() => cueCount(page), 'OP-17: no cue appeared for a file drag').toBe(1)
  const cue = page.locator(CUE)
  await expect(cue).toHaveText(CUE_WORDS?.en ?? '')
  // WHY: U-32 is the screen region under the App Header (ScreenRegions.scheduleCanvas); the element carrying the role also runs behind the header.
  const rects = await page.evaluate(
    ({ cue, header }) => {
      const a = (document.querySelector(cue) as Element).getBoundingClientRect()
      const h = (document.querySelector(header) as Element).getBoundingClientRect()
      return { cue: [a.x, a.y, a.width, a.height], below: [0, h.bottom, window.innerWidth, window.innerHeight - h.bottom] }
    },
    { cue: CUE, header: HEADER },
  )
  expect(rects.cue, 'OP-17: the cue does not cover the Schedule Canvas, the window below the App Header').toEqual(rects.below)
})

test('OP-17: the rim is a solid 3px line (S-553) and the box takes no pointer (UZ-1)', async ({ page }) => {
  await launch(page)
  await fire(page, 'dragenter', CANVAS)
  await expect.poll(() => cueCount(page)).toBe(1)
  const read = await page.evaluate((cue) => {
    const box = document.querySelector(cue) as HTMLElement
    const style = getComputedStyle(box)
    const everything = [box, ...Array.from(box.querySelectorAll('*'))] as HTMLElement[]
    const r = box.getBoundingClientRect()
    const under = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return {
      width: style.borderTopWidth,
      line: style.borderTopStyle,
      noPointer: everything.map((one) => getComputedStyle(one).pointerEvents),
      centreIsInsideCue: under !== null && box.contains(under),
    }
  }, CUE)
  expect(read.width).toBe('3px')
  expect(read.line).toBe('solid')
  expect(new Set(read.noPointer)).toEqual(new Set(['none']))
  expect(read.centreIsInsideCue, 'UZ-1 (MUST): 押下を受けず、下へ通す -- the point under the cue is answered by the cue').toBe(false)
})

test('OP-17 (MUST NOT): a drag without Files shows no cue', async ({ page }) => {
  await launch(page)
  await fire(page, 'dragenter', CANVAS, false)
  expect(await cueCount(page)).toBe(0)
})

test('OP-17: moving from one part inside the window onto another does not hide the cue; leaving the window does', async ({ page }) => {
  await launch(page)
  await fire(page, 'dragenter', CANVAS)
  await expect.poll(() => cueCount(page)).toBe(1)
  // STEP: the browser enters the next element first and then leaves the previous one
  await fire(page, 'dragenter', HEADER)
  await fire(page, 'dragleave', CANVAS)
  expect(await cueCount(page), `${OP_17_SAME_UI} -- the cue went away on a move inside the window`).toBe(1)
  // STEP: back onto the first and on again, then the one that is the window's edge
  await fire(page, 'dragenter', CANVAS)
  await fire(page, 'dragleave', HEADER)
  expect(await cueCount(page)).toBe(1)
  await fire(page, 'dragleave', CANVAS)
  expect(await cueCount(page), `${OP_17_OUTSIDE} -- the cue stayed after the drag left the window`).toBe(0)
})

test('OP-17: a drag that comes back after leaving shows the cue again', async ({ page }) => {
  await launch(page)
  await fire(page, 'dragenter', CANVAS)
  await expect.poll(() => cueCount(page)).toBe(1)
  await fire(page, 'dragleave', CANVAS)
  expect(await cueCount(page)).toBe(0)
  await fire(page, 'dragenter', CANVAS)
  await expect.poll(() => cueCount(page)).toBe(1)
})

test('OP-17 (MUST): dropping takes the cue down, and the drop opens the file as before (OP-2)', async ({ page }) => {
  await launch(page)
  await fire(page, 'dragenter', CANVAS)
  await expect.poll(() => cueCount(page)).toBe(1)
  await fire(page, 'drop', CANVAS)
  await expect(page.locator('[data-role="Open Chooser"]'), 'OP-2: the drop did not open the file').toHaveCount(1)
  expect(await cueCount(page), `${OP_17_OUTSIDE} -- the cue stayed after the drop`).toBe(0)
})

test('OP-17: after a drop, the next drag starts counting from the window again (a drop leaves no depth behind)', async ({ page }) => {
  await launch(page)
  // STEP: two nested entries, then the drop, which the browser ends with no dragleave for either
  await fire(page, 'dragenter', CANVAS)
  await fire(page, 'dragenter', HEADER)
  await fire(page, 'drop', HEADER)
  await expect(page.locator('[data-role="Open Chooser"]')).toHaveCount(1)
  await page.click('[data-role="Open Chooser"] [data-icon="IC-71"]')
  await settle(page)
  await page.waitForTimeout(200)
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) {
    await page.click('[data-role="Confirmation"] [data-confirmation-answer="proceed"]')
    await settle(page)
  }
  await expect(page.locator('[data-role="Open Chooser"]')).toHaveCount(0)
  await fire(page, 'dragenter', CANVAS)
  await expect.poll(() => cueCount(page), 'the earlier drop left a depth behind, so the new drag is not seen as entering').toBe(1)
  await fire(page, 'dragleave', CANVAS)
  expect(await cueCount(page), 'the earlier drop left a depth behind, so the drag leaving is not seen').toBe(0)
})

test('OP-17 (MUST NOT): while an open chooser stands the app would refuse a drop, so no cue is shown', async ({ page }) => {
  await launch(page)
  await fire(page, 'dragenter', CANVAS)
  await fire(page, 'drop', CANVAS)
  await expect(page.locator('[data-role="Open Chooser"]')).toHaveCount(1)
  await fire(page, 'dragleave', CANVAS)
  await fire(page, 'dragenter', CANVAS)
  expect(await cueCount(page), `${OP_17_REFUSED} -- the cue invites a drop that RS-27 refuses`).toBe(0)
})
