// The running application, judged live: which browser, which screen, and how the drawing is read.

import { chromium, type Browser, type Page } from '@playwright/test'
import type { SpecRow } from '../contract/spec-table'

// see T-025
const REFERENCE_CHANNEL = 'msedge'

// see FR-080
/** @purity pure */
export function screenOf(row: SpecRow): { width: number; height: number } {
  // WHY: written as an escape, not the character itself, to keep this file ASCII.
  const found = /(\d+)\s*[x\u00d7]\s*(\d+)/.exec(row.cells[row.cells.length - 1] ?? '')
  const width = Number(found?.[1] ?? '')
  const height = Number(found?.[2] ?? '')
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error(`table T-025 row ${row.id} states no screen size this file can read`)
  }
  return { width, height }
}

// TRAP: this selector must match the "Schedule Canvas" role the shell
// marks the drawing with; drifting apart breaks every case here silently.
export const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'

// WHY: closing this browser channel measured much slower than a hook's
// default timeout, so the allowance is set explicitly here.
export const CLEARING_UP_MS = 300_000

// WHY: the default failure message suggests installing the bundled
// browser, which is the wrong fix here.
/** @purity non-pure */
export async function launchReferenceBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: REFERENCE_CHANNEL })
  } catch (cause) {
    throw new Error(
      `the browser channel ${JSON.stringify(REFERENCE_CHANNEL)} that table T-025 row MC-5 ` +
        'allows as the reference could not be started on this machine',
      { cause },
    )
  }
}

/** @purity semi-pure-b */
export async function readDrawnSvg(page: Page): Promise<string | null> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (selector: string) => document.querySelector(selector)?.outerHTML ?? null,
    DRAWN_SVG,
  )
}

// WHY: the shell may legitimately draw twice while the screen size
// settles, so this waits for two identical readings, not a fixed delay.
/** @purity semi-pure-b */
export async function readSettledDrawnSvg(page: Page): Promise<string> {
  const quietMs = 250
  const deadline = Date.now() + 30_000
  await page.waitForSelector(DRAWN_SVG, { state: 'attached' })
  let previous = await readDrawnSvg(page)
  while (Date.now() < deadline) {
    await page.waitForTimeout(quietMs)
    const current = await readDrawnSvg(page)
    if (current !== null && current === previous) return current
    previous = current
  }
  throw new Error(`the drawing at ${DRAWN_SVG} was still changing after 30s`)
}
