// The running application, judged live: which browser, which screen, and how the drawing is read.

import { chromium, type Browser, type Page } from '@playwright/test'
import { bare, specTable, type SpecRow } from '../contract/spec-table'

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

// see S-56, U-50
// WHY: the drawing reaches canvasPadding past the Task Group Area, where a press answers nothing.
const CANVAS_PADDING_PX = Number(/\d+/.exec(bare(specTable('T-201').rows.find((one) => one.id === 'S-56')?.by['既定値'] ?? ''))?.[0] ?? '')

// see MK-13, T-266, RV-6, FR-051
// WHY: MK-13 opens the panel only from a Task's own body, label or actual; a marker, resume icon, dependency
// or status line over the bar answers first in T-266 (RV-6 moved one bar middle onto a resume icon).
/** @purity semi-pure-b */
export async function taskBodyPoint(page: Page): Promise<{ uid: string; x: number; y: number } | null> {
  if (!Number.isFinite(CANVAS_PADDING_PX)) throw new Error('table T-201 row S-56 states no number')
  return page.evaluate(
    /** @purity semi-pure-b */
    ({ selector, padding }: { selector: string; padding: number }) => {
      const bars = Array.from(document.querySelectorAll('[data-role="Scrollbars"]'))
        .map((one) => one.getBoundingClientRect())
        .filter((box) => box.height > box.width)
      const reach = Math.min(Infinity, ...bars.map((box) => box.left - padding))
      const drawing = document.querySelector(selector)
      const figures = Array.from(drawing?.querySelectorAll('[data-figure]') ?? [])
      const isGround = (name: string): boolean =>
        /^(task-group-|ruler-)/.test(name) || name === 'non-working-days' || name.endsWith('-mask')
      const along = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]
      for (const plan of Array.from(drawing?.querySelectorAll('[data-figure$="-plan"]') ?? [])) {
        const uid = /^task-(\d+)-plan$/.exec(plan.getAttribute('data-figure') ?? '')?.[1]
        const box = plan.getBoundingClientRect()
        // WHY: wide and tall enough that a press inside it is not on an end grab.
        if (uid === undefined || box.width < 30 || box.height < 6) continue
        const own = new Set([`task-${uid}-plan`, `task-${uid}-actual`, `task-${uid}-label`])
        const others = figures
          .filter((one) => {
            const name = one.getAttribute('data-figure') ?? ''
            return !own.has(name) && !isGround(name)
          })
          .map((one) => one.getBoundingClientRect())
        const y = box.top + box.height / 2
        for (const share of along) {
          const x = box.left + box.width * share
          const covered = others.some((one) => x >= one.left && x <= one.right && y >= one.top && y <= one.bottom)
          if (covered || x >= reach || document.elementFromPoint(x, y) !== plan) continue
          return { uid, x, y }
        }
      }
      return null
    },
    { selector: DRAWN_SVG, padding: CANVAS_PADDING_PX },
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
