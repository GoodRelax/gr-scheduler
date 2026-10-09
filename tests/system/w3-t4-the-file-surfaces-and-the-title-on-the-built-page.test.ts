// W3 tester 4: the built page pressed in a real browser -- MK-13 Document Title, FR-096 Export Chooser, T-335 WB-10, WM-9 Esc, T-330 SV-7.

// WHY: one line, overlap, focus and a drag on a frame edge are decided by layout in a real browser; the fake DOM cannot see them.
// WHY: every word and row is read from docs/spec at read time; the page is the built dist/index.html (uc-harness).

import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { specTable, unbroken } from '../contract/spec-table'
import { VIEWPORT, icon, launch, press, settle } from '../usecase/uc-harness'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as unknown
const TEMPLATE_TEXT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')

const MK_13_ONE_PRESS =
  '（`FR-035`）を開くこと（MUST） —— 利用者が、ヘッダーの文書名をダブルクリックして編集できるようにすると定めた。⛔ 1 回の押下で開いてはならない（MUST NOT）'
const FR_096_ONE_COLUMN = '式を上の順で上から下へ 1 段に 1 つずつ並べること（MUST）'
const FR_096_NOT_SIDEWAYS =
  '⛔ 形式を横に並べてはならない（MUST NOT） —— 横に並べると選択面の幅が形式の数だけ広がり、それより狭い閲覧環境の窓では端の形式が窓の外へ出て押せない'
const FR_096_HEADING =
  'ボタンの大きさが揃わなくなる。⭐ 見出しの段は、`FR-036` の 表 T-335 の `WB-10` の題の行とすること（MUST）'
const WB_10_NO_RESIZE =
  'してはならない（MUST NOT） —— 掴めない位置へ置けば二度と動かせない（表 T-023d の `GR-19` と同じ理由）。⛔ 大きさを変えてはならない（MUST NOT）'
const WB_10_TITLE_TASK_GROUP = '題の行は `WB-7` と同じ形とし、左端に題（面の見出しの語）を、右端に `IC-52` だけを置く —— `IC-129` 〜 `IC-131` を置かない'
const WM_9_ESC =
  ' の「面」である（MUST） —— `Esc` の「開いている面」の段で閉じる（表 T-028 の `IN-4`）。⛔ **閉じたときに透かしを消してはならない（MUST NOT）'
const SV_7_LABELS =
  '「いつから」「いつまで」を宿主の日付の入力で選ばせる。2 つの日付の入力には、それぞれの左に、`FR-038` の辞書が持つ語「いつから」「いつまで」を札として置くこと（MUST）'

test.use({ viewport: VIEWPORT })

interface Rect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

// see T-103
const roleOf = (id: string): string => {
  const row = specTable('T-103').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-103 has no row ${id}`)
  return `[data-role="${(row.cells[0] ?? '').replace(/`/g, '').trim()}"]`
}

const EXPORT_CHOOSER = roleOf('U-54')
const OPEN_CHOOSER = roleOf('U-56')
const WATERMARK_UNLOCK = roleOf('U-60')
const DOCUMENT_TITLE = roleOf('U-27')

// see FR-038
/** @purity pure */
function wordsOfPart(part: string): readonly string[] {
  const found: string[] = []
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const one of node) walk(one)
      return
    }
    if (node === null || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    const text = record['text'] as { ja?: string; en?: string } | undefined
    if (record['part'] === part && text !== undefined) found.push(text.ja ?? '', text.en ?? '')
    for (const value of Object.values(record)) walk(value)
  }
  walk(WORDS)
  if (found.length === 0) throw new Error(`the dictionary holds no part ${part}`)
  return found
}

/** @purity semi-pure-b */
async function rectOf(page: Page, selector: string): Promise<Rect | null> {
  return page.evaluate((wanted: string) => {
    const box = document.querySelector(wanted)?.getBoundingClientRect()
    return box === undefined ? null : { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
  }, selector)
}

/** @purity semi-pure-b */
async function isShown(page: Page, selector: string): Promise<boolean> {
  const box = await rectOf(page, selector)
  return box !== null && box.right - box.left > 0 && box.bottom - box.top > 0
}

/** @purity semi-pure-b */
async function isTitleBeingEdited(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    const header = document.querySelector('[data-role="App Header"]')
    if (active === null || header === null || !header.contains(active)) return false
    return active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
  })
}

/** @purity non-pure */
async function openExportChooser(page: Page): Promise<void> {
  await press(page, 'IC-2')
  await expect.poll(() => isShown(page, EXPORT_CHOOSER), { message: 'IC-2 opens the Export Chooser' }).toBe(true)
}

/** @purity semi-pure-b */
async function formatBoxes(page: Page): Promise<readonly { left: number; right: number; top: number; bottom: number }[]> {
  return page.evaluate(
    (chooser: string) =>
      Array.from(document.querySelectorAll(`${chooser} [data-format]`)).map((one) => {
        const box = one.getBoundingClientRect()
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
      }),
    EXPORT_CHOOSER,
  )
}

/** @purity non-pure */
async function dragEdge(page: Page, box: Rect, dx: number, dy: number): Promise<void> {
  // WHY: one pixel inside the lower-right corner, where a resize border would be grabbed if there were one.
  const at = { x: box.right - 1, y: box.bottom - 1 }
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + dx / 2, at.y + dy / 2, { steps: 4 })
  await page.mouse.move(at.x + dx, at.y + dy, { steps: 4 })
  await page.mouse.up()
  await settle(page)
}

test.describe('the manuscript these cases are driven by', () => {
  test('01-04 still says every clause quoted here', () => {
    for (const clause of [MK_13_ONE_PRESS, FR_096_ONE_COLUMN, FR_096_NOT_SIDEWAYS, FR_096_HEADING, WB_10_NO_RESIZE, WB_10_TITLE_TASK_GROUP, WM_9_ESC, SV_7_LABELS]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })
})

test.describe(`T-023 MK-13 -- ${MK_13_ONE_PRESS}`, () => {
  test('one press on the Document Title opens no field; a double-click opens it with the focus in it', async ({ page }) => {
    await launch(page)
    const title = await rectOf(page, DOCUMENT_TITLE)
    if (title === null) throw new Error('the page draws no Document Title')
    const at = { x: (title.left + title.right) / 2, y: (title.top + title.bottom) / 2 }
    await page.mouse.click(at.x, at.y)
    await page.waitForTimeout(800)
    await settle(page)
    expect(await isTitleBeingEdited(page), MK_13_ONE_PRESS).toBe(false)
    await page.mouse.dblclick(at.x, at.y)
    await settle(page)
    expect(await isTitleBeingEdited(page), 'MK-13 (MUST): a double-click opens the same in-place field SK-9 opens').toBe(true)
  })
})

test.describe(`FR-096 -- ${FR_096_ONE_COLUMN}`, () => {
  function expectOneColumn(boxes: readonly { left: number; top: number; bottom: number }[], where: string): void {
    expect(boxes.length, 'premise: the chooser offers the formats of table T-024').toBeGreaterThan(1)
    const lefts = boxes.map((one) => one.left)
    expect(Math.max(...lefts) - Math.min(...lefts), `${FR_096_ONE_COLUMN} -- ${where}`).toBeLessThanOrEqual(1)
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index]!.top, `${FR_096_ONE_COLUMN} -- ${where}, format ${index}`).toBeGreaterThanOrEqual(boxes[index - 1]!.bottom - 1)
    }
  }

  test('the formats stand one a row, on the reference screen and on a 480 px window, every one inside the window', async ({ page }) => {
    await launch(page)
    await openExportChooser(page)
    expectOneColumn(await formatBoxes(page), 'the reference screen')
    await page.keyboard.press('Escape')
    await settle(page)
    await page.setViewportSize({ width: 480, height: 900 })
    await settle(page)
    await openExportChooser(page)
    const narrow = await formatBoxes(page)
    expectOneColumn(narrow, 'a 480 px window')
    for (const [index, one] of narrow.entries()) {
      expect(one.left, `${FR_096_NOT_SIDEWAYS} -- format ${index}, a 480 px window`).toBeGreaterThanOrEqual(0)
      expect(one.right, `${FR_096_NOT_SIDEWAYS} -- format ${index}, a 480 px window`).toBeLessThanOrEqual(480)
    }
  })
})

test.describe(`FR-096 -- ${FR_096_HEADING}`, () => {
  test('the chooser heads with the WB-10 title row: the heading word at the left, IC-52 alone at the right, above the formats', async ({ page }) => {
    await launch(page)
    await openExportChooser(page)
    const read = await page.evaluate((chooser: string) => {
      const root = document.querySelector(chooser)
      if (root === null) return null
      const icons = Array.from(root.querySelectorAll('[data-icon]')).map((one) => ({
        id: one.getAttribute('data-icon') ?? '',
        box: one.getBoundingClientRect().toJSON() as DOMRect,
      }))
      const firstFormat = root.querySelector('[data-format]')?.getBoundingClientRect().top ?? null
      const texts: { text: string; left: number; top: number; bottom: number }[] = []
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = (node.textContent ?? '').trim()
        const parent = node.parentElement
        if (text === '' || parent === null || parent.closest('[data-format]') !== null) continue
        const box = parent.getBoundingClientRect()
        texts.push({ text, left: box.left, top: box.top, bottom: box.bottom })
      }
      return { icons, firstFormat, texts }
    }, EXPORT_CHOOSER)
    if (read === null) throw new Error('the Export Chooser is not on the page')
    const headings = ['ファイルに保存', 'Save to File']
    const heading = read.texts.find((one) => headings.includes(one.text))
    expect(heading, `${FR_096_HEADING}: the title is the heading word`).toBeDefined()
    const ids = read.icons.map((one) => one.id)
    expect(ids, WB_10_TITLE_TASK_GROUP).toEqual(['IC-52'])
    const close = read.icons[0]?.box
    if (heading === undefined || close === undefined || read.firstFormat === null) return
    expect(heading.left, `${WB_10_TITLE_TASK_GROUP}: the title stands left of IC-52`).toBeLessThan(close.left)
    expect(heading.bottom > close.top && heading.top < close.bottom, `${WB_10_TITLE_TASK_GROUP}: one row`).toBe(true)
    expect(Math.max(heading.bottom, close.bottom), `${FR_096_HEADING}: the title row heads the chooser`).toBeLessThanOrEqual(read.firstFormat + 1)
  })
})

test.describe(`T-335 WB-10 -- ${WB_10_NO_RESIZE}`, () => {
  for (const [name, open] of [
    ['Export Chooser', async (page: Page) => openExportChooser(page)],
    [
      'Open Chooser',
      async (page: Page) => {
        await page.evaluate((given: string) => {
          ;(window as unknown as { __grsNextOpen: unknown }).__grsNextOpen = { name: 'same.json', text: given }
        }, TEMPLATE_TEXT)
        await press(page, 'IC-1')
      },
    ],
  ] as const) {
    test(`a drag on the ${name}'s lower-right edge does not change its size`, async ({ page }) => {
      await launch(page)
      await open(page)
      const selector = name === 'Export Chooser' ? EXPORT_CHOOSER : OPEN_CHOOSER
      await expect.poll(() => isShown(page, selector), { message: `premise: the ${name} is open` }).toBe(true)
      const before = await rectOf(page, selector)
      if (before === null) throw new Error(`the ${name} is not on the page`)
      await dragEdge(page, before, 80, 60)
      const after = await rectOf(page, selector)
      expect(after === null ? null : [after.right - after.left, after.bottom - after.top], WB_10_NO_RESIZE).toEqual([
        before.right - before.left,
        before.bottom - before.top,
      ])
    })
  }
})

test.describe(`WM-9 -- ${WM_9_ESC}`, () => {
  test('Esc closes the watermark unlock surface and the watermark stays drawn', async ({ page }) => {
    await launch(page)
    const marks = (): Promise<number> => page.evaluate(() => document.querySelectorAll('[data-role="Schedule Canvas"] [data-role="Watermark"]').length)
    const before = await marks()
    expect(before, 'premise: the watermark is drawn').toBeGreaterThan(0)
    await press(page, 'IC-41')
    await expect.poll(() => isShown(page, WATERMARK_UNLOCK), { message: 'IC-41 raises U-60 (WM-6)' }).toBe(true)
    await page.keyboard.press('Escape')
    await settle(page)
    expect(await isShown(page, WATERMARK_UNLOCK), `${WM_9_ESC}: Esc closes the surface (IN-4)`).toBe(false)
    expect(await marks(), WM_9_ESC).toBe(before)
  })
})

test.describe(`T-330 SV-7 -- ${SV_7_LABELS}`, () => {
  test('a date column filter shows its two date inputs, each with its dictionary word standing at its left', async ({ page }) => {
    await launch(page)
    await page.keyboard.press('Control+f')
    await settle(page)
    const panel = '[data-role="Search Panel"]'
    await expect.poll(() => isShown(page, panel), { message: 'SK-24 opens the Search Panel' }).toBe(true)
    const filters = page.locator(`${panel} ${icon('IC-122')}`)
    const count = await filters.count()
    let found = false
    for (let index = 0; index < count && !found; index += 1) {
      await filters.nth(index).click()
      await settle(page)
      found = (await page.locator(`${panel} input[type="date"]`).count()) === 2
      if (!found) {
        await filters.nth(index).click()
        await settle(page)
      }
    }
    expect(found, 'premise: one column filter of the Search Panel is a date filter with two date inputs').toBe(true)
    const from = wordsOfPart('dateFrom')
    const to = wordsOfPart('dateTo')
    const placed = await page.evaluate((within: string) => {
      const root = document.querySelector(within)
      const inputs = Array.from(root?.querySelectorAll('input[type="date"]') ?? []).map((one) => one.getBoundingClientRect().toJSON() as DOMRect)
      const words: { text: string; box: DOMRect }[] = []
      const walker = document.createTreeWalker(root ?? document.body, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = (node.textContent ?? '').trim()
        if (text !== '' && node.parentElement !== null) words.push({ text, box: node.parentElement.getBoundingClientRect().toJSON() as DOMRect })
      }
      return inputs.map((input) => {
        const beside = words.filter((one) => one.box.right <= input.left + 1 && one.box.bottom > input.top && one.box.top < input.bottom)
        beside.sort((a, b) => b.box.right - a.box.right)
        return beside[0]?.text ?? null
      })
    }, panel)
    expect(placed.length, SV_7_LABELS).toBe(2)
    expect(from, `${SV_7_LABELS}: the first input is labelled at its left`).toContain(placed[0])
    expect(to, `${SV_7_LABELS}: the second input is labelled at its left`).toContain(placed[1])
  })
})
