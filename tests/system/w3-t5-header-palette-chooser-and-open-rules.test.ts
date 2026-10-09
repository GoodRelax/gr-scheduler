// W3 spec-only tester 5: HF-10, FR-096, FR-053, FR-095, OP-10 and table T-109 measured on the running application.

// WHY: positions, widths and what is printed are decided by layout in a real browser; every expected value is read from docs/spec.

import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'
import { answerConfirmation, icon, press, settle } from '../usecase/uc-harness'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))

// see HF-10
const HF_10_COUNT_PLACE =
  '⭐ `HF-12` の畳み込んだタスクグループの数は、並びのいちばん左の操作子（すべて畳む）のすぐ左に置き、数の右端をその操作子の外形の左端に接すること（MUST）'
// see FR-096
const FR_096_ONE_COLUMN = '⭐ 選択面は、形式を上の順で上から下へ 1 段に 1 つずつ並べること（MUST）'
const FR_096_SAME_SIZE = '⭐ 形式のボタンは、幅も高さもすべて揃えること（MUST）'
const FR_096_WIDTH_FROM_THE_ROW =
  '⭐ 選択面の幅は、縦に並べた形式と見出しの段が決めること（MUST） —— 閲覧環境の窓の幅の割合で抑えてはならない（MUST NOT）'
// see FR-053
const FR_053_RECORDING_ON_THE_BAND =
  '⭐ ただし操作と描画を記録しているあいだ（表 T-206 の `S-206`）は、記録の入口（表 T-109 の `IC-76`）も押下状態のまま帯の `IC-53` の左に載せること（MUST）'
// see FR-095
const FR_095_BOTH_TIERS_BACK =
  '⭐ 新しく始めた後は、`FR-101` のファイルの状態を 2 段ともまだ書いていない側へ戻すこと（MUST）'
// see OP-10
const OP_10_EITHER_NULL =
  '⭐ 表示位置は `scrollDate`（`S-77`）と `scrollGroupId`（`S-78`）の組であり、どちらか一方でも `null` なら、表示位置が `null` であるとすること（MUST）'
// see T-109
const T_109_BLOCKS =
  '同じ面で同じ `群` の行を 1 つの塊に寄せ、塊どうしは塊の最初の行が本表に現れる順に、塊の中は本表の行の順に並べること（MUST）'
const T_109_GROUP_NOT_PRINTED = '⛔ 本表の `群` の欄は、この塊を決めるためだけに在る。画面に刷ってはならない（MUST NOT）'

const VIEWPORT = { width: 1920, height: 1080 }
test.use({ viewport: VIEWPORT, locale: 'ja-JP' })

// WHY: half a pixel either way is subpixel layout, not a different place.
const SUBPIXEL = 0.5

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  fileStatus: { state: string; text: { ja: string; en: string } }[]
}
const NEVER_SAVED_JA = WORDS.fileStatus.find((one) => one.state === 'neverSaved')?.text.ja ?? ''

const TEMPLATE_TEXT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')

// see S-75, S-77, S-78
const settingKey = (id: string): string => {
  const row = specTable('T-203').rows.find((one) => one.id === id)
  const key = bare(row?.by['キー'] ?? '')
  if (key === '') throw new Error(`table T-203 has no key for ${id}`)
  return key
}
const ZOOM_X = settingKey('S-75')
const SCROLL_DATE = settingKey('S-77')
const SCROLL_GROUP = settingKey('S-78')

// WHY: a headless browser has no file picker; this stands in for the host and hands over the next file (window.__w3Next).
const HOST_STUB = `(() => {
  window.__w3Next = null
  const handleOf = (name, text) => ({
    kind: 'file', name,
    getFile: async () => new File([text], name),
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    isSameEntry: async (other) => Boolean(other) && other.name === name,
    createWritable: async () => ({ write: async () => {}, close: async () => {}, abort: async () => {} }),
  })
  window.showOpenFilePicker = async () => {
    const next = window.__w3Next
    if (!next) throw new DOMException('aborted', 'AbortError')
    window.__w3Next = null
    return [handleOf(next.name, next.text)]
  }
  const original = DataTransferItem.prototype.getAsFileSystemHandle
  DataTransferItem.prototype.getAsFileSystemHandle = async function () {
    const file = this.getAsFile()
    if (!file) return original ? original.call(this) : null
    return handleOf(file.name, await file.text())
  }
})()`

/** @purity non-pure */
async function launch(page: Page): Promise<void> {
  await page.addInitScript(HOST_STUB)
  await page.goto('/')
  await page.waitForSelector('[data-role="Schedule Canvas"]')
  await settle(page)
}

/** @purity non-pure */
async function openByDrop(page: Page, name: string, text: string): Promise<void> {
  await page.evaluate(
    ({ name, text }) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([text], name))
      const target = document.querySelector('[data-role="Schedule Canvas"]') as Element
      for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
    },
    { name, text },
  )
  await page.waitForSelector('[data-role="Open Chooser"]')
  await page.click(icon('IC-71', '[data-role="Open Chooser"]'))
  await page.waitForTimeout(200)
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await answerConfirmation(page, 'proceed')
  await settle(page)
}

interface Rect {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

/** @purity semi-pure-b */
async function rectOf(page: Page, selector: string): Promise<Rect | null> {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector)
    if (element === null) return null
    const r = element.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
  }, selector)
}

/** @purity pure */
function documentWith(edit: (root: Record<string, any>) => void): string {
  const root = JSON.parse(TEMPLATE_TEXT) as Record<string, any>
  edit(root)
  return JSON.stringify(root)
}

// see T-109
interface IconRow {
  readonly id: string
  readonly surfaces: readonly string[]
  readonly group: string
}

const T_109: readonly IconRow[] = specTable('T-109').rows.map((row) => ({
  id: row.id,
  surfaces: bareAll(row.by['面'] ?? ''),
  group: bare(row.by['群'] ?? ''),
}))

const NO_GROUP = '—'

/** @purity pure */
function expectedOrderOn(surface: string): readonly string[] {
  const rows = T_109.filter((row) => row.surfaces.includes(surface) && row.group !== NO_GROUP && row.group !== '')
  const blocks: string[] = []
  for (const row of rows) if (!blocks.includes(row.group)) blocks.push(row.group)
  return blocks.flatMap((group) => rows.filter((row) => row.group === group).map((row) => row.id))
}

/** @purity semi-pure-b */
async function drawnOrderOn(page: Page, role: string): Promise<readonly string[]> {
  return page.evaluate((role) => {
    const root = document.querySelector(`[data-role="${role}"]`)
    if (root === null) return []
    const placed = [...root.querySelectorAll('[data-icon]')].map((element) => {
      const r = element.getBoundingClientRect()
      return { id: element.getAttribute('data-icon') ?? '', top: Math.round(r.top), left: r.left }
    })
    placed.sort((a, b) => a.top - b.top || a.left - b.left)
    return placed.map((one) => one.id)
  }, role)
}

test.describe('W3-T5 -- the manuscript these cases are driven by', () => {
  test('01-04 still says each clause, word for word', () => {
    for (const clause of [HF_10_COUNT_PLACE, FR_096_ONE_COLUMN, FR_096_SAME_SIZE, FR_096_WIDTH_FROM_THE_ROW, FR_053_RECORDING_ON_THE_BAND, FR_095_BOTH_TIERS_BACK, OP_10_EITHER_NULL]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })

  test('table T-109 still says each clause, word for word', () => {
    for (const clause of [T_109_BLOCKS, T_109_GROUP_NOT_PRINTED]) expect(GLOSSARY, clause).toContain(clause)
  })
})

test(`HF-10: "${HF_10_COUNT_PLACE}"`, async ({ page }) => {
  await launch(page)
  await press(page, 'IC-78')
  const control = await rectOf(page, `[data-role="Task Group Panel"] ${icon('IC-78')}`)
  const count = await rectOf(page, '[data-role="Task Group Panel"] [data-folded-task-groups]')
  expect(control, 'the collapse-all control is drawn').not.toBeNull()
  expect(count, 'HF-12: the number of folded task groups is shown once every task group is folded').not.toBeNull()
  expect(Math.abs((count?.right ?? 0) - (control?.left ?? 0)), HF_10_COUNT_PLACE).toBeLessThanOrEqual(SUBPIXEL)
  expect(count?.left ?? 0, 'the number stands to the left, outside the row of controls').toBeLessThan(control?.left ?? 0)
})

test(`FR-096: "${FR_096_ONE_COLUMN}" / "${FR_096_SAME_SIZE}" / "${FR_096_WIDTH_FROM_THE_ROW}"`, async ({ page }) => {
  await launch(page)
  const measure = async (): Promise<{ chooser: Rect; buttons: Rect[] }> => {
    await press(page, 'IC-2')
    const chooser = await rectOf(page, '[data-role="Export Chooser"]')
    const buttons = await page.evaluate(() =>
      [...document.querySelectorAll('[data-role="Export Chooser"] [data-format]')].map((element) => {
        const r = element.getBoundingClientRect()
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
      }),
    )
    if (chooser === null) throw new Error('the Export Chooser did not open')
    await page.keyboard.press('Escape')
    await settle(page)
    return { chooser, buttons }
  }
  const wide = await measure()
  expect(wide.buttons.length, 'premise: the chooser shows more than one format').toBeGreaterThan(1)
  const first = wide.buttons[0] as Rect
  for (const [index, button] of wide.buttons.entries()) {
    expect(Math.abs(button.width - first.width), FR_096_SAME_SIZE).toBeLessThanOrEqual(SUBPIXEL)
    expect(Math.abs(button.height - first.height), FR_096_SAME_SIZE).toBeLessThanOrEqual(SUBPIXEL)
    expect(Math.abs(button.left - first.left), FR_096_ONE_COLUMN).toBeLessThanOrEqual(SUBPIXEL)
    const above = wide.buttons[index - 1]
    if (above !== undefined) expect(button.top, `${FR_096_ONE_COLUMN} -- format ${index} stands below format ${index - 1}`).toBeGreaterThanOrEqual(above.bottom - SUBPIXEL)
  }

  // WHY: a window 1.5 times the chooser; a width held to half the window or less would wrap or shrink the buttons here.
  await page.setViewportSize({ width: Math.floor(wide.chooser.width * 1.5), height: VIEWPORT.height })
  await settle(page)
  const narrow = await measure()
  expect(narrow.buttons.length).toBe(wide.buttons.length)
  for (const button of narrow.buttons) {
    expect(Math.abs(button.left - (narrow.buttons[0] as Rect).left), FR_096_ONE_COLUMN).toBeLessThanOrEqual(SUBPIXEL)
    expect(Math.abs(button.width - first.width), FR_096_WIDTH_FROM_THE_ROW).toBeLessThanOrEqual(SUBPIXEL)
    expect(Math.abs(button.height - first.height), FR_096_WIDTH_FROM_THE_ROW).toBeLessThanOrEqual(SUBPIXEL)
  }
  expect(Math.abs(narrow.chooser.width - wide.chooser.width), FR_096_WIDTH_FROM_THE_ROW).toBeLessThanOrEqual(SUBPIXEL)
  expect(narrow.chooser.width, FR_096_WIDTH_FROM_THE_ROW).toBeGreaterThanOrEqual(first.width)
})

test(`FR-053: "${FR_053_RECORDING_ON_THE_BAND}"`, async ({ page }) => {
  await launch(page)
  const palette = '[data-role="Command Palette"]'
  expect(await rectOf(page, `${palette} ${icon('IC-75')}`), 'premise: the palette stands at start').not.toBeNull()

  await page.click(icon('IC-75', palette))
  await settle(page)
  expect(await page.locator(`${palette} ${icon('IC-76')}`).count(), 'premise: not recording, the band carries no IC-76').toBe(0)
  await page.click(icon('IC-75', palette))
  await settle(page)

  await page.click(icon('IC-76', palette))
  await settle(page)
  await page.click(icon('IC-75', palette))
  await settle(page)
  const drawn = await page.evaluate((palette) => [...document.querySelectorAll(`${palette} [data-icon]`)].map((one) => one.getAttribute('data-icon')), palette)
  expect([...drawn].sort(), 'minimised: the band holds IC-53, IC-75 and, while recording, IC-76 only').toEqual(['IC-53', 'IC-75', 'IC-76'])
  expect(await page.getAttribute(`${palette} ${icon('IC-76')}`, 'aria-pressed'), FR_053_RECORDING_ON_THE_BAND).toBe('true')
  const recording = await rectOf(page, `${palette} ${icon('IC-76')}`)
  const grabMark = await rectOf(page, `${palette} ${icon('IC-53')} > svg`)
  expect(grabMark, 'IC-53 draws its mark on the band').not.toBeNull()
  expect(recording?.right ?? Infinity, FR_053_RECORDING_ON_THE_BAND).toBeLessThanOrEqual((grabMark?.left ?? -Infinity) + SUBPIXEL)

  await page.click(icon('IC-75', palette))
  await settle(page)
  await page.click(icon('IC-76', palette))
  await settle(page)
})

test(`FR-095: "${FR_095_BOTH_TIERS_BACK}"`, async ({ page }) => {
  await launch(page)
  const opened = documentWith((root) => {
    root['documentStamp']['fileSavedUtc'] = '2026-10-01T03:04:05Z'
  })
  await openByDrop(page, 'w3-t5-opened.json', opened)
  expect(await page.locator('[data-role="Opened File Name"]').innerText(), 'premise: the upper tier names the opened file').toContain('w3-t5-opened')
  expect(await page.locator('[data-role="File Saved At"]').innerText(), 'premise: the lower tier shows a time (HS-6)').not.toBe(NEVER_SAVED_JA)

  await press(page, 'IC-98')
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await answerConfirmation(page, 'proceed')
  await settle(page)
  expect((await page.locator('[data-role="Opened File Name"]').innerText()).trim(), FR_095_BOTH_TIERS_BACK).toBe('')
  expect((await page.locator('[data-role="File Saved At"]').innerText()).trim(), `${FR_095_BOTH_TIERS_BACK} (HS-5)`).toBe(NEVER_SAVED_JA)
})

test(`OP-10: "${OP_10_EITHER_NULL}"`, async ({ page }) => {
  await launch(page)
  const firstRow = (JSON.parse(TEMPLATE_TEXT) as { schedule: { taskGroups: { id: string }[] } }).schedule.taskGroups[0]?.id ?? ''
  // WHY: OP-10 rules the picture drawn at open; the fit entrance (IC-10, FR-055) draws the picture it would choose.
  const pictureOf = async (): Promise<Readonly<Record<string, readonly number[]>>> =>
    page.evaluate(() => {
      const boxes: Record<string, number[]> = {}
      for (const element of document.querySelectorAll('[data-role="Schedule Canvas"] [data-figure]')) {
        const r = element.getBoundingClientRect()
        boxes[element.getAttribute('data-figure') ?? ''] = [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 2) / 2)
      }
      return boxes
    })
  const differences = (a: Readonly<Record<string, readonly number[]>>, b: Readonly<Record<string, readonly number[]>>): readonly string[] => {
    const shared = Object.keys(a).filter((key) => key in b)
    if (shared.length < 5) return [`only ${shared.length} figures drawn in both pictures`]
    return shared.filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
  }
  // WHY: a zoom no fit would choose, so a kept place is told apart from a fitted one.
  const ODD_ZOOM = 0.37
  const openedPicture = async (date: string | null, group: string | null) => {
    await openByDrop(
      page,
      'w3-t5-view.json',
      documentWith((root) => {
        root['documentSettings'][ZOOM_X] = ODD_ZOOM
        root['documentSettings'][SCROLL_DATE] = date
        root['documentSettings'][SCROLL_GROUP] = group
      }),
    )
    const atOpen = await pictureOf()
    await press(page, 'IC-10')
    return { atOpen, fitted: await pictureOf() }
  }

  const both = await openedPicture('2026-01-05', firstRow)
  expect(differences(both.atOpen, both.fitted).length, 'premise: a place with both halves is drawn as written, not as the fit').toBeGreaterThan(0)

  for (const [date, group] of [['2026-01-05', null], [null, firstRow]] as const) {
    const one = await openedPicture(date, group)
    expect(differences(one.atOpen, one.fitted), `${OP_10_EITHER_NULL} -- scrollDate=${String(date)}, scrollGroupId=${String(group)}`).toEqual([])
  }
})

test(`T-109: "${T_109_BLOCKS}"`, async ({ page }) => {
  await launch(page)
  for (const [surface, role] of [['App Header', 'Header Commands'], ['Command Palette', 'Command Palette']] as const) {
    const drawn = await drawnOrderOn(page, role)
    const expected = expectedOrderOn(surface)
    const grouped = new Set(expected)
    const drawnGrouped = drawn.filter((id) => grouped.has(id))
    expect(drawnGrouped.length, `premise: ${surface} draws grouped entrances`).toBeGreaterThan(1)
    expect(drawnGrouped, `${surface}: ${T_109_BLOCKS}`).toEqual(expected.filter((id) => drawnGrouped.includes(id)))
  }
})

test(`T-109: "${T_109_GROUP_NOT_PRINTED}"`, async ({ page }) => {
  await launch(page)
  const groups = [...new Set(T_109.map((row) => row.group).filter((group) => group !== NO_GROUP && group !== ''))]
  expect(groups.length, 'premise: table T-109 names groups').toBeGreaterThan(1)
  const printed = await page.evaluate(() => {
    const words = new Set<string>()
    for (const element of document.querySelectorAll('body *')) {
      const own = [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent ?? '').join('').trim()
      if (own !== '') words.add(own)
      for (const name of ['aria-label', 'title']) {
        const value = element.getAttribute(name)
        if (value !== null && value.trim() !== '') words.add(value.trim())
      }
    }
    return [...words]
  })
  expect(printed.length, 'premise: the screen prints words').toBeGreaterThan(10)
  expect(printed.filter((word) => groups.includes(word)), T_109_GROUP_NOT_PRINTED).toEqual([])
})
