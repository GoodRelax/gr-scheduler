// Shared mechanics for the use-case tests of table T-334 row VT-1 (place TS-1).
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const APP_URL = pathToFileURL(resolve('dist/index.html')).href
export const VIEWPORT = { width: 1920, height: 1080 }

// WHY: a headless browser has no file picker and no file handles; these stand in for the host
// dialogs, record what is written (__grsSaved) and hand over the next file (__grsNextOpen).
const HOST_STUB = `(() => {
  const saved = []
  window.__grsSaved = saved
  window.__grsNextOpen = null
  const fileHandle = (name, text) => ({
    kind: 'file',
    name,
    getFile: async () => new File([text], name),
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    isSameEntry: async (other) => Boolean(other) && other.name === name,
    createWritable: async () => {
      const parts = []
      return {
        write: async (chunk) => {
          if (typeof chunk === 'string') parts.push(chunk)
          else if (chunk instanceof Blob) parts.push(await chunk.text())
          else if (chunk && chunk.type === 'write') parts.push(typeof chunk.data === 'string' ? chunk.data : await new Blob([chunk.data]).text())
          else parts.push(await new Blob([chunk]).text())
        },
        close: async () => { text = parts.join(''); saved.push({ name, text }) },
        abort: async () => {},
      }
    },
  })
  window.__grsFileHandle = fileHandle
  window.showOpenFilePicker = async () => {
    const next = window.__grsNextOpen
    if (!next) throw new DOMException('aborted', 'AbortError')
    window.__grsNextOpen = null
    return [fileHandle(next.name, next.text)]
  }
  window.showSaveFilePicker = async (options) => fileHandle((options && options.suggestedName) || 'saved', '')
  const original = DataTransferItem.prototype.getAsFileSystemHandle
  DataTransferItem.prototype.getAsFileSystemHandle = async function () {
    const file = this.getAsFile()
    if (!file) return original ? original.call(this) : null
    return fileHandle(file.name, await file.text())
  }
})()`

export type GrsDocument = {
  schedule: {
    project: Record<string, unknown>
    tasks: Array<Record<string, any>>
    resources: Array<Record<string, any>>
    assignments: Array<Record<string, any>>
    taskGroups: Array<Record<string, any>>
    taskGroupMembers: Array<Record<string, any>>
    taskVisuals: Array<Record<string, any>>
    commentBoxes: Array<Record<string, any>>
    highlightBoxes: Array<Record<string, any>>
    [key: string]: unknown
  }
  documentSettings: Record<string, any>
  documentStamp: Record<string, any>
  changeLog: Array<Record<string, any>>
}

export type Box = { x: number; y: number; w: number; h: number }

export const readSample = (name: string): string => readFileSync(resolve('sample-schedule', name), 'utf8')

// TRAP: a fixed wait misreads a cold first paint; wait until one reading repeats.
export const settle = async (page: Page, probe?: () => Promise<unknown>): Promise<void> => {
  const read = probe ?? (() => page.evaluate(() => document.querySelectorAll('[data-figure]').length + ':' + document.body.innerText.length))
  let last = JSON.stringify(await read())
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150)
    const now = JSON.stringify(await read())
    if (now === last) return
    last = now
  }
}

export const launch = async (page: Page): Promise<void> => {
  await page.addInitScript(HOST_STUB)
  await page.goto(APP_URL)
  await page.waitForSelector('[data-role="Schedule Canvas"]')
  await settle(page)
}

export const icon = (id: string, within = ''): string => (within ? within + ' ' : '') + '[data-icon="' + id + '"]'

// TRAP: the hint of the last pressed entry covers its neighbour until the pointer leaves it.
export const press = async (page: Page, id: string, within = ''): Promise<void> => {
  await page.mouse.move(VIEWPORT.width / 2, 14)
  await page.waitForTimeout(50)
  await page.click(icon(id, within))
  await settle(page)
}

// see IC-20, FR-065
export const enableAgentApi = async (page: Page): Promise<void> => {
  await page.click(icon('IC-20'))
  await expect.poll(() => page.evaluate(() => typeof (window as any).grSchedulerAgentApi)).toBe('object')
}

export const readDocument = (page: Page): Promise<GrsDocument> => page.evaluate(() => (window as any).grSchedulerAgentApi.readDocument())

export const answerConfirmation = async (page: Page, answer: 'proceed' | 'cancel'): Promise<void> => {
  const button = page.locator('[data-role="Confirmation"] [data-confirmation-answer="' + answer + '"]')
  await button.click()
  await settle(page)
}

// see FR-087, OP-2
export const dropFile = async (page: Page, name: string, text: string): Promise<void> => {
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
}

// see OP-3, OP-4, IC-71, IC-72, IC-73
export const openByDrop = async (page: Page, name: string, text: string, choice: 'IC-71' | 'IC-72' | 'IC-73' = 'IC-71'): Promise<void> => {
  await dropFile(page, name, text)
  await page.click(icon(choice, '[data-role="Open Chooser"]'))
  await page.waitForTimeout(200)
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await answerConfirmation(page, 'proceed')
  await settle(page)
}

export const figureBox = (page: Page, figure: string): Promise<Box | null> =>
  page.evaluate((figure) => {
    const element = document.querySelector('[data-figure="' + figure + '"]')
    if (!element) return null
    const r = element.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }, figure)

export const elementBox = (page: Page, selector: string): Promise<Box | null> =>
  page.evaluate((selector) => {
    const element = document.querySelector(selector)
    if (!element) return null
    const r = element.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }, selector)

export const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }, modifiers: Array<'Control' | 'Shift' | 'Alt'> = []): Promise<void> => {
  for (const key of modifiers) await page.keyboard.down(key)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  const steps = 8
  for (let i = 1; i <= steps; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
  await page.mouse.up()
  for (const key of modifiers) await page.keyboard.up(key)
  await settle(page)
}

// WHY: ruler tick figures carry their day number since 1970-01-01, so they give the time axis.
export const dayAxis = async (page: Page): Promise<{ xOf: (day: number) => number; dayOf: (x: number) => number }> => {
  const ticks = await page.evaluate(() =>
    [...document.querySelectorAll('[data-figure*="-tick-"]')]
      .map((e) => ({ day: Number((e.getAttribute('data-figure') ?? '').split('-tick-')[1]), x: e.getBoundingClientRect().x }))
      .filter((t) => Number.isFinite(t.day)),
  )
  if (ticks.length < 2) throw new Error('fewer than two ruler ticks are drawn')
  ticks.sort((a, b) => a.day - b.day)
  const a = ticks[0]!
  const b = ticks[ticks.length - 1]!
  const perDay = (b.x - a.x) / (b.day - a.day)
  return { xOf: (day) => a.x + (day - a.day) * perDay, dayOf: (x) => a.day + (x - a.x) / perDay }
}

export const dayNumber = (isoDate: string): number => Math.round(Date.parse(isoDate.slice(0, 10) + 'T00:00:00Z') / 86400000)

export const bandAt = (page: Page, y: number): Promise<string | null> =>
  page.evaluate((y) => {
    for (const e of document.querySelectorAll('[data-figure^="row-"][data-figure$="-band"]')) {
      const r = e.getBoundingClientRect()
      if (r.y <= y && y < r.y + r.height) return (e.getAttribute('data-figure') ?? '').slice(4, -5)
    }
    return null
  }, y)

export const rowSelector = (groupId: string): string => '[data-role="Row Title Tree"] [data-group-id="' + groupId + '"]'

export const groupIdOfRowNamed = (page: Page, name: string): Promise<string | null> =>
  page.evaluate((name) => {
    for (const row of document.querySelectorAll('[data-role="Row Title Tree"] [data-group-id]')) {
      const span = row.querySelector(':scope > span')
      if (span && span.textContent === name) return row.getAttribute('data-group-id')
    }
    return null
  }, name)

// TRAP: row controls are drawn only while the pointer is over the row name (HF-6).
export const revealRow = async (page: Page, groupId: string): Promise<void> => {
  const row = page.locator(rowSelector(groupId))
  for (const direction of [1, -1]) {
    for (let i = 0; i < 25 && (await row.count()) === 0; i++) {
      await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2)
      await page.mouse.wheel(0, direction * 300)
      await settle(page)
    }
  }
  const box = (await row.count()) ? await row.boundingBox() : null
  if (box && box.y + box.height > VIEWPORT.height) {
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2)
    await page.mouse.wheel(0, box.y + box.height - VIEWPORT.height + 200)
    await settle(page)
  }
}

export const pressRowControl = async (page: Page, groupId: string, id: string): Promise<void> => {
  await revealRow(page, groupId)
  const row = page.locator(rowSelector(groupId))
  await row.locator(':scope > span').first().hover()
  await row.locator(icon(id)).click()
  await settle(page)
}

export const notificationText = (page: Page): Promise<string> => page.locator('[data-role="Notification Area"]').innerText()

export const savedFiles = (page: Page): Promise<Array<{ name: string; text: string }>> => page.evaluate(() => (window as any).__grsSaved)

// WHY: GRS_UC_SHOW_MISMATCH=1 runs a known mismatch as an ordinary case, so its failing assertion is shown.
export const specMismatch = (reason: string): void => test.fail(process.env['GRS_UC_SHOW_MISMATCH'] !== '1', reason)
