// CR-721 on the shipped build: the large sample with the Search Panel or the report open, and the readers and presses the cases share.

import { expect, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { readSettledDrawnSvg } from './live-app'
import { ERP_SAMPLE, keyOf, openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

export { readSettledDrawnSvg, settle }
export type { Stage }

const T_103 = specTable('T-103')
const roleOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).cells[0] ?? '')}"]`
export const PANEL = roleOf('U-64')
export const REPORT = roleOf('U-66')
export const APP_HEADER = roleOf('U-31')
export const BAND = roleOf('U-67')
export const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id
export const TEXT_SIZE = rowOf(specTable('T-109'), 'IC-127').id
export const CLEAR = rowOf(specTable('T-109'), 'IC-153').id
export const ENTER = rowOf(specTable('T-109'), 'IC-143').id
const OPEN_SEARCH = keyOf('SK-24')

export const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(specTable(table), id).by[heading] ?? '')

export interface Box {
  readonly x: number
  readonly y: number
  readonly right: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

/** @purity non-pure */
export async function stageWith(browser: Browser, scheme: 'light' | 'dark' = 'light'): Promise<Stage> {
  const stage = await openStage(browser)
  if (scheme === 'dark') {
    await stage.page.emulateMedia({ colorScheme: 'dark' })
    await stage.page.reload()
    await readSettledDrawnSvg(stage.page)
  }
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  return stage
}

/** @purity non-pure */
export async function withSearch(browser: Browser, scheme: 'light' | 'dark' = 'light'): Promise<Stage> {
  const stage = await stageWith(browser, scheme)
  await stage.page.keyboard.press(OPEN_SEARCH)
  await settle(stage.page)
  await expect(stage.page.locator(`${PANEL} tbody tr`).first()).toBeVisible()
  return stage
}

/** @purity non-pure */
export async function withReport(browser: Browser): Promise<Stage> {
  const stage = await stageWith(browser)
  await pressSelector(stage.page, `[data-icon="${DIAGNOSE}"]`)
  await expect(stage.page.locator(`${REPORT} tbody tr`).first()).toBeVisible()
  return stage
}

/** @purity semi-pure-b */
export async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((wanted: string) => {
    const box = document.querySelector(wanted)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height }
  }, selector)
}

/** @purity non-pure */
export async function pressAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
export async function pressSelector(page: Page, selector: string): Promise<void> {
  const box = await boxOf(page, selector)
  expect(box, `${selector} is on the screen`).not.toBeNull()
  if (box !== null) await pressAt(page, box.x + box.width / 2, box.y + box.height / 2)
}

/** @purity semi-pure-b */
export async function headingColumns(page: Page, window: string): Promise<{ readonly column: string; readonly box: Box }[]> {
  return page.evaluate((asked: string) => {
    return Array.from(document.querySelectorAll(`${asked} thead th`)).map((cell) => {
      const r = cell.getBoundingClientRect()
      return { column: cell.getAttribute('data-column') ?? '', box: { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
    })
  }, window)
}

/** @purity semi-pure-b */
export async function widthsOf(page: Page, window: string): Promise<Readonly<Record<string, number>>> {
  const columns = await headingColumns(page, window)
  return Object.fromEntries(columns.map((one) => [one.column, Math.round(one.box.width * 10) / 10]))
}

/** @purity non-pure */
export async function openFilter(page: Page, window: string, column: string): Promise<void> {
  await pressSelector(page, `${window} thead th[data-column="${column}"] [data-icon="IC-122"]`)
}

/** @purity semi-pure-b */
export async function menuCount(page: Page, window: string): Promise<number> {
  return page.evaluate((asked: string) => {
    const found = document.querySelector(asked)
    return found === null ? -1 : found.querySelectorAll('[data-search-filter-menu]').length
  }, window)
}

/** @purity semi-pure-b */
export async function menuLeft(page: Page, window: string): Promise<number | null> {
  const box = await boxOf(page, `${window} [data-search-filter-menu]`)
  return box === null ? null : box.x
}

/** @purity semi-pure-b */
export async function selectedTaskUids(page: Page): Promise<readonly number[]> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readSelection(): unknown } }).grSchedulerAgentApi
    const items = (api.readSelection() as { items?: { kind: string; uid?: number }[] }).items ?? []
    return items.filter((one) => one.kind === 'task' && one.uid !== undefined).map((one) => Number(one.uid))
  })
}

/** @purity semi-pure-b */
export async function colourOfHeading(page: Page, window: string, column: string): Promise<{ readonly fill: string; readonly word: string; readonly icon: string }> {
  return page.evaluate(
    (asked: { window: string; column: string }) => {
      const cell = document.querySelector(`${asked.window} thead th[data-column="${asked.column}"]`)
      if (cell === null) throw new Error(`no heading ${asked.column}`)
      const word = cell.querySelector('span')
      const icon = cell.querySelector('[data-icon="IC-122"]')
      const paint = (one: Element | null): string => {
        if (one === null) return ''
        const style = getComputedStyle(one)
        const svg = one.querySelector('svg')
        const inner = svg === null ? '' : `${getComputedStyle(svg).color}|${getComputedStyle(svg).fill}|${getComputedStyle(svg).stroke}`
        return `${style.color}|${inner}`
      }
      return { fill: getComputedStyle(cell).backgroundColor, word: word === null ? '' : getComputedStyle(word).color, icon: paint(icon) }
    },
    { window, column },
  )
}

/** @purity non-pure */
export async function dragBorder(
  page: Page,
  window: string,
  column: string,
  dx: number,
): Promise<{ readonly start: number; readonly held: number; readonly after: number; readonly others: readonly number[]; readonly othersAfter: readonly number[] }> {
  const before = await headingColumns(page, window)
  const cell = before.find((one) => one.column === column)
  if (cell === undefined) throw new Error(`${window} draws no ${column} heading`)
  const from = { x: cell.box.right - 1, y: cell.box.y + cell.box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx / 2, from.y, { steps: 4 })
  await page.mouse.move(from.x + dx, from.y, { steps: 4 })
  await page.waitForTimeout(300)
  const held = (await headingColumns(page, window)).find((one) => one.column === column)?.box.width ?? 0
  await page.mouse.up()
  await settle(page)
  const after = await headingColumns(page, window)
  return {
    start: cell.box.width,
    held,
    after: after.find((one) => one.column === column)?.box.width ?? 0,
    others: before.filter((one) => one.column !== column).map((one) => Math.round(one.box.width)),
    othersAfter: after.filter((one) => one.column !== column).map((one) => Math.round(one.box.width)),
  }
}
