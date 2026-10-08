// CR-712 wave 2 spec-only cases on the shipped build: NT-2 -- a timed notice leaves after S-542, held while the pointer is over it.

import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, unbroken } from '../contract/spec-table'
import { VIEWPORT, launch } from '../usecase/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly reasons: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[]
}

const NT_2_GONE_AFTER_S_542 =
  'その通知は、立ってから `_assets/tbl-settings.md` の 表 T-206 の `S-542` が経ったら、人の操作を待たずに消すこと（MUST）'
const NT_2_NOT_COUNTED_UNDER_THE_POINTER = 'ポインタがその通知の箱の上にある間は数えないこと（MUST）'
const NT_2_COUNTED_AGAIN_AFTER_LEAVING = '箱から離れたら `S-542` を始めから数え直すこと（MUST）'
const NT_2_COUNTED_AGAIN_WHEN_BUNDLED = '同じ理由が上がって `NT-3` で束ねたときも、始めから数え直すこと（MUST）'
const NT_2_ONLY_TIMED_ROWS = '時間で消すのは、表 T-233 の表示の仕方が「時間で消す」の理由の通知だけとする（MUST）'
const NT_2_OK_STILL_DISMISSES = '`NT-8` の消し方（`OK`・`Enter`・`Esc`）はそのまま当たる —— 先に人が消してよい。'

const NOTIFICATION_AREA = '[data-role="Notification Area"]'

const COPY_PROMPT = 'IC-115'

// WHY: a margin either side of each deadline, wide enough for a frame and a poll, narrow enough to tell a pause from a restart.
const MARGIN_MS = 700

const POLL_MS = 100

// see T-206, S-542
/** @purity pure */
function s542Ms(): number {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-542')
  if (row === undefined) throw new Error('table T-206 has no row S-542')
  const found = /(\d+)\s*ms/.exec(row.cells.join(' '))
  if (found === null) throw new Error('S-542 states no time in ms')
  return Number(found[1])
}

/** @purity pure */
function wordsOf(rowId: string): readonly string[] {
  const found = WORDS.reasons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no ${rowId}`)
  return [found.text.ja, found.text.en]
}

// WHY: the host clipboard is replaced, so the copy succeeds (RS-65) or is refused (RS-15) whatever the browser allows.
const CLIPBOARD_STAND_IN = (refuse: boolean): void => {
  const board = navigator.clipboard as unknown as Record<string, unknown> | undefined
  if (board === undefined) return
  const answer = async (): Promise<void> => {
    if (refuse) throw new DOMException('refused by the test', 'NotAllowedError')
  }
  board['writeText'] = answer
  board['write'] = answer
}

/** @purity non-pure */
async function openWithClipboard(page: Page, refuse: boolean): Promise<void> {
  await page.addInitScript(CLIPBOARD_STAND_IN, refuse)
  await launch(page)
}

/** @purity semi-pure-b */
async function told(page: Page, rowId: string): Promise<boolean> {
  const said = await page.evaluate(
    (area: string) => Array.from(document.querySelectorAll(area)).map((one) => one.textContent ?? '').join(' | '),
    NOTIFICATION_AREA,
  )
  return wordsOf(rowId).some((words) => said.includes(words))
}

/** @purity semi-pure-b */
async function noticeBox(page: Page, rowId: string): Promise<{ x: number; y: number; w: number; h: number } | null> {
  return page.evaluate(
    ({ area, words }: { area: string; words: readonly string[] }) => {
      const holder = document.querySelector(area)
      if (holder === null) return null
      const says = (one: Element): boolean => words.some((word) => (one.textContent ?? '').includes(word))
      const card = Array.from(holder.children).find(says) ?? (says(holder) ? holder : null)
      if (card === null) return null
      const box = card.getBoundingClientRect()
      return { x: box.x, y: box.y, w: box.width, h: box.height }
    },
    { area: NOTIFICATION_AREA, words: wordsOf(rowId) },
  )
}

// see NT-2
/** @purity non-pure */
async function moveAwayFromNotices(page: Page): Promise<void> {
  const area = await page.evaluate((selector: string) => {
    const box = document.querySelector(selector)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x, y: box.y, w: box.width, h: box.height }
  }, NOTIFICATION_AREA)
  const inside = (x: number, y: number): boolean =>
    area !== null && x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h
  const spots = [
    { x: 40, y: VIEWPORT.height - 40 },
    { x: VIEWPORT.width - 40, y: VIEWPORT.height - 40 },
    { x: 40, y: VIEWPORT.height / 2 },
    { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 },
  ]
  const spot = spots.find((one) => !inside(one.x, one.y)) ?? spots[0]!
  await page.mouse.move(spot.x, spot.y)
}

// see IC-115, FR-068
/** @purity non-pure */
async function pressCopy(page: Page): Promise<void> {
  const at = await page.evaluate((icon: string) => {
    const box = document.querySelector(`[data-icon="${icon}"]`)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, COPY_PROMPT)
  expect(at, `${COPY_PROMPT} is on the screen`).not.toBeNull()
  await page.mouse.move(at!.x, at!.y)
  await page.mouse.down()
  await page.mouse.up()
  await moveAwayFromNotices(page)
}

/** @purity non-pure */
async function firstTold(page: Page, rowId: string): Promise<number> {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (await told(page, rowId)) return Date.now()
    await page.waitForTimeout(POLL_MS)
  }
  throw new Error(`${rowId} was never told`)
}

/** @purity non-pure */
async function waitUntil(page: Page, at: number): Promise<void> {
  const left = at - Date.now()
  if (left > 0) await page.waitForTimeout(left)
}

test.describe('NT-2 still reads as CR-712 E-04 wrote it', () => {
  test('the clauses this file presses are in the manuscript', () => {
    for (const clause of [
      NT_2_GONE_AFTER_S_542,
      NT_2_NOT_COUNTED_UNDER_THE_POINTER,
      NT_2_COUNTED_AGAIN_AFTER_LEAVING,
      NT_2_COUNTED_AGAIN_WHEN_BUNDLED,
      NT_2_ONLY_TIMED_ROWS,
      NT_2_OK_STILL_DISMISSES,
    ]) {
      expect(REQUIREMENTS).toContain(clause)
    }
  })
})

test.describe(`NT-2 (MUST): ${NT_2_GONE_AFTER_S_542}`, () => {
  test.setTimeout(90_000)

  test('RS-65, a timed notice, stands until S-542 and is gone after it with nothing pressed', async ({ page }) => {
    const s542 = s542Ms()
    await openWithClipboard(page, false)
    await pressCopy(page)
    const shown = await firstTold(page, 'RS-65')
    await waitUntil(page, shown + s542 - MARGIN_MS)
    expect(await told(page, 'RS-65'), 'still standing just before S-542').toBe(true)
    await waitUntil(page, shown + s542 + MARGIN_MS * 2)
    expect(await told(page, 'RS-65'), NT_2_GONE_AFTER_S_542).toBe(false)
  })

  test(`${NT_2_NOT_COUNTED_UNDER_THE_POINTER} / ${NT_2_COUNTED_AGAIN_AFTER_LEAVING}`, async ({ page }) => {
    const s542 = s542Ms()
    await openWithClipboard(page, false)
    await pressCopy(page)
    const shown = await firstTold(page, 'RS-65')
    await waitUntil(page, shown + s542 / 2)
    const box = await noticeBox(page, 'RS-65')
    expect(box, 'the RS-65 notice has a box to point at').not.toBeNull()
    await page.mouse.move(box!.x + box!.w / 2, box!.y + box!.h / 2)
    await waitUntil(page, shown + s542 + MARGIN_MS * 2)
    expect(await told(page, 'RS-65'), NT_2_NOT_COUNTED_UNDER_THE_POINTER).toBe(true)
    await moveAwayFromNotices(page)
    const left = Date.now()
    // STEP: past where a resumed count would end (half of S-542), short of a restarted one
    await waitUntil(page, left + s542 / 2 + MARGIN_MS)
    expect(await told(page, 'RS-65'), NT_2_COUNTED_AGAIN_AFTER_LEAVING).toBe(true)
    await waitUntil(page, left + s542 + MARGIN_MS * 2)
    expect(await told(page, 'RS-65'), 'gone S-542 after the pointer left').toBe(false)
  })

  test(NT_2_COUNTED_AGAIN_WHEN_BUNDLED, async ({ page }) => {
    const s542 = s542Ms()
    await openWithClipboard(page, false)
    await pressCopy(page)
    const shown = await firstTold(page, 'RS-65')
    await waitUntil(page, shown + s542 * 0.6)
    await pressCopy(page)
    const again = Date.now()
    await waitUntil(page, shown + s542 + MARGIN_MS)
    expect(await told(page, 'RS-65'), 'the bundled card counts from the second raise').toBe(true)
    await waitUntil(page, again + s542 + MARGIN_MS * 2)
    expect(await told(page, 'RS-65'), 'gone S-542 after the second raise').toBe(false)
  })

  test(`${NT_2_ONLY_TIMED_ROWS} -- RS-15, a shown notice, is still standing after S-542`, async ({ page }) => {
    const s542 = s542Ms()
    await openWithClipboard(page, true)
    await pressCopy(page)
    const shown = await firstTold(page, 'RS-15')
    await waitUntil(page, shown + s542 + MARGIN_MS * 2)
    expect(await told(page, 'RS-15'), NT_2_ONLY_TIMED_ROWS).toBe(true)
  })

  test(`${NT_2_OK_STILL_DISMISSES} -- Esc takes the timed notice away before S-542`, async ({ page }) => {
    await openWithClipboard(page, false)
    await pressCopy(page)
    const shown = await firstTold(page, 'RS-65')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(POLL_MS * 3)
    expect(Date.now() - shown, 'premise: the check ran before S-542').toBeLessThan(s542Ms())
    expect(await told(page, 'RS-65'), NT_2_OK_STILL_DISMISSES).toBe(false)
  })
})
