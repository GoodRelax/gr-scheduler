// The running application, as a System case of table T-218 (row TS-3) reaches
// it: which browser and which screen it is judged in, and how the drawing is got
// hold of.
//
// ⭐ WHY THE LIVE DOM AND NOT THE MARKUP. Rule 04 section 3 of
// `docs/development-rules/` says a green test is not a working application and
// names the traps this project has actually hit -- a first frame that never
// paints, and a control character that makes the deliverable's own hash stop
// matching so that nothing loads at all. Neither is visible in a string. Both
// are visible one second after a browser opens the page.

import { chromium, type Browser, type Page } from '@playwright/test'
import type { SpecRow } from '../contract/spec-table'

/**
 * The browser every case here is judged in.
 *
 * ⭐ `CN-2` of table T-003 settles the family, and `MC-5` of table T-025 names
 * the member this project measures on together with the member that may stand
 * in for it. The channel below is that stand-in. It is already installed on the
 * machine table T-025 describes, so a System case costs no browser download.
 *
 * ⭐ Named here, next to the cases, rather than as `use.channel` in
 * `playwright.config.ts`: table T-025 (MUST) has a measured value recorded
 * together with the browser it was measured in, so a case should say what it
 * was judged in rather than inherit it silently.
 */
const REFERENCE_CHANNEL = 'msedge'

/**
 * The screen of the base environment, read off the row that states it.
 *
 * ⭐ Shared rather than written down twice: `FR-080` defines the base
 * environment an export is judged in as `MC-5`'s browser together with
 * `MC-6`'s screen, so every System case that judges something written out
 * needs the same pair, and a second reader of one row is a second thing to
 * keep in step.
 *
 * ⚠️ `MC-6` settles two more things a driven browser has no answer for -- a
 * browser at full screen, and the host's own scaling. Neither is reproduced by
 * a viewport, and neither has to be: what these cases judge is whether two
 * productions of one run agree, not how many pixels either of them covered.
 *
 * ⭐ Takes the row rather than reading the manuscript itself, so it stays
 * `pure` (R7.3).
 *
 * @purity pure
 */
export function screenOf(row: SpecRow): { width: number; height: number } {
  // The manuscript writes a multiplication sign between the two numbers.
  // ⚠️ Given as an escape rather than as the character itself: rule 03 section
  // 5 keeps code ASCII, and a literal here would be invisible in a diff.
  const found = /(\d+)\s*[x\u00d7]\s*(\d+)/.exec(row.cells[row.cells.length - 1] ?? '')
  const width = Number(found?.[1] ?? '')
  const height = Number(found?.[2] ?? '')
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error(`table T-025 row ${row.id} states no screen size this file can read`)
  }
  return { width, height }
}

/**
 * ⛔ NOT DECIDED BY THE SPECIFICATION: nothing says how a UI part is marked in
 * the page, so there is no agreed handle for reaching one from outside. The
 * specification settles the part's NAME (`U-32`, spelled as
 * `_assets/tbl-glossary.md` spells it) and Chapter 5 settles which unit draws
 * it, and the shell marks the part with that name -- which is what the selector
 * below leans on. A change to that marking breaks every case here, and it
 * should: at that point the tool and the tests disagree about how the part is
 * found, and the specification cannot settle the argument.
 */
export const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'

/**
 * How long a file's clearing-up hook is given to close the reference browser.
 *
 * ⛔ CLOSING IT IS SLOW ON THIS MACHINE, AND THAT IS THE WHOLE OF IT. Measured
 * 2026-09-03 in a standalone script with nothing else running, one
 * `browser.close()` on the `msedge` channel took 21s, 70s, 90s, 144s and 163s
 * over five launches -- and 21s on the bundled browser for comparison. A hook's
 * own default is 30s, which sits inside that range, so every System file that
 * opens this browser reported red at the very end however green its cases were
 * (measured: five of the seven files in one run, all with the same message and
 * no assertion among them).
 *
 * ⛔⛔ IT IS *NOT* PAGES OR CONTEXTS PILING UP, and that theory was measured
 * before this number was chosen: a context closes in 6..18ms, the files close
 * their own in a `finally`, and the same 163s close was measured with
 * `browser.contexts()` already empty.
 *
 * ⛔ IT LOOSENS NO ASSERTION. `test.setTimeout` inside `afterAll` moves THAT
 * HOOK's allowance and nothing else; every case keeps the timeout it sets for
 * itself, so a judgement that becomes slow still fails for being slow.
 *
 * ⚠️ ONE HOME FOR THE NUMBER, next to the launch it is about, rather than six
 * copies that would drift apart the first time the machine changed.
 */
export const CLEARING_UP_MS = 300_000

/**
 * Open the reference browser.
 *
 * ⚠️ The default failure says only that an executable is missing, which reads
 * as "run the installer for the bundled browser" -- the wrong fix. Name the
 * channel and the row that chose it instead.
 *
 * @purity non-pure
 */
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

/**
 * The drawing that is on the page right now, or `null` while there is none.
 *
 * @purity semi-pure-b
 */
export async function readDrawnSvg(page: Page): Promise<string | null> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (selector: string) => document.querySelector(selector)?.outerHTML ?? null,
    DRAWN_SVG,
  )
}

/**
 * The drawing, once it has stopped changing.
 *
 * ⚠️ Waiting for the element to exist is not enough. The shell settles the
 * screen's size before the first frame and observes the host for a size it was
 * given late, so a page can legitimately draw twice on the way up -- and a case
 * that read between the two would compare one run's first frame against
 * another run's second. What is waited for is therefore two identical readings
 * in a row, not a fixed delay.
 *
 * @purity semi-pure-b
 */
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
