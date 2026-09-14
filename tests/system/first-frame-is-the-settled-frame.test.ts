// The first frame the shipped build draws must equal the settled frame (DFC-230).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// see NFR-004
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

const T025: SpecTable = specTable('T-025')

// see T-025
const SCREEN_ROW = 'MC-6'

const BASE_SCREEN = screenOf(rowOf(T025, SCREEN_ROW))

// TRAP: renaming this attribute breaks silently unless
// tests/system/rows-fixed-with-nothing-holding-them.test.ts is updated too.
const DRAWN_ROW = '[data-depth]'

interface Frame {
  readonly at: number
  readonly tree: string
}

interface Recorded {
  readonly ticks: number
  readonly frames: readonly Frame[]
}

interface DrawnRow {
  readonly depth: string
  readonly top: number
  readonly height: number
}

const RECORDER = 'grsFirstFrameRecord'

// WHY: not an assertion -- only when to stop watching, set well past the
// worst-case wrong-tree window so a slow machine is watched through it.
const QUIET_MS = 1_500
const LEAST_WATCHED_MS = 5_000
const WATCH_DEADLINE_MS = 60_000

/** @purity semi-pure-b */
async function readRecorded(page: Page): Promise<Recorded> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (name: string) => {
      const held = (window as unknown as Record<string, Recorded | undefined>)[name]
      if (held === undefined) return { ticks: -1, frames: [] }
      return { ticks: held.ticks, frames: held.frames.map((one) => ({ at: one.at, tree: one.tree })) }
    },
    RECORDER,
  )
}

// WHY: polls the page's own notches, not the screen -- the notches are what
// the comparison uses, so quiet there means quiet for the comparison.
/** @purity non-pure */
async function watchUntilQuiet(page: Page): Promise<Recorded> {
  const started = Date.now()
  let recorded = await readRecorded(page)
  let changedAt = Date.now()
  while (Date.now() - started < WATCH_DEADLINE_MS) {
    await page.waitForTimeout(250)
    const now = await readRecorded(page)
    if (now.frames.length !== recorded.frames.length) changedAt = Date.now()
    recorded = now
    if (Date.now() - started >= LEAST_WATCHED_MS && Date.now() - changedAt >= QUIET_MS) {
      return recorded
    }
  }
  throw new Error(
    `the drawn tree was still changing after ${WATCH_DEADLINE_MS}ms (${recorded.frames.length} ` +
      'distinct trees so far), so this run has no settled frame to compare the first one with',
  )
}

/** @purity pure */
function rowsOf(frame: Frame): readonly DrawnRow[] {
  return JSON.parse(frame.tree) as DrawnRow[]
}

/** @purity pure */
function describe(frame: Frame): string {
  const rows = rowsOf(frame)
  const drawn = rows.map((row) => `d${row.depth}@${row.top}+${row.height}`).join(' ')
  return `at ${frame.at}ms, ${rows.length} rows: ${drawn}`
}

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npm run build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
})

// WHY: closing the reference browser can outlast a hook's default
// timeout; the measured allowance is applied explicitly here.
test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

test('DFC-230: the first tree the shipped build draws is the tree it settles on', async () => {
  test.setTimeout(300_000)
  if (browser === null) throw new Error('the reference browser was not opened')
  // TRAP: this must stay the first page opened in this browser process --
  // the fault only shows on that page.
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  await context.addInitScript(
    (asked: { name: string; row: string }) => {
      const held: { ticks: number; frames: { at: number; tree: string }[] } = {
        ticks: 0,
        frames: [],
      }
      ;(window as unknown as Record<string, unknown>)[asked.name] = held
      const treeNow = (): string =>
        JSON.stringify(
          Array.from(document.querySelectorAll(asked.row)).map((row) => {
            const box = row.getBoundingClientRect()
            return {
              depth: row.getAttribute('data-depth') ?? '',
              top: Math.round(box.top),
              height: Math.round(box.height),
            }
          }),
        )
      const tick = (): void => {
        held.ticks += 1
        const tree = treeNow()
        const last = held.frames[held.frames.length - 1]
        if (last === undefined || last.tree !== tree) {
          held.frames.push({ at: Math.round(performance.now()), tree })
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    },
    { name: RECORDER, row: DRAWN_ROW },
  )
  const page = await context.newPage()
  try {
    await page.goto(pathToFileURL(SHIPPED_BUILD).href)
    // WHY: not a fixed pause -- only gets the run past the first drawing so
    // the recorder below has something to watch.
    await readSettledDrawnSvg(page)
    const recorded = await watchUntilQuiet(page)

    expect(
      recorded.ticks,
      'the page ran no animation frame, so no frame of this run was looked at and the ' +
        'comparison below would be vacuous',
    ).toBeGreaterThan(10)
    const drawn = recorded.frames.filter((frame) => rowsOf(frame).length > 0)
    const first = drawn[0]
    const settled = drawn[drawn.length - 1]
    expect(
      first === undefined || settled === undefined ? 0 : drawn.length,
      'no frame of this run held a single drawn row, so there is no tree to compare',
    ).toBeGreaterThan(0)
    if (first === undefined || settled === undefined) return
    expect(
      rowsOf(settled).length,
      'the tree this run settled on holds fewer than two rows, which is too little to tell ' +
        'a shifted tree from an unshifted one',
    ).toBeGreaterThan(1)

    // WHY: compares the trees themselves, not their descriptions -- each
    // description also carries the moment it was notched at.
    expect(
      first.tree,
      'a tree was drawn before the screen size was settled: table T-077 row BO-1 (MUST NOT) ' +
        'has nothing drawn until the size is known, and `BO-5` puts the first frame after it. ' +
        `Over ${recorded.frames.length} distinct trees this run first showed [${describe(first)}] ` +
        `and settled on [${describe(settled)}]`,
    ).toBe(settled.tree)
  } finally {
    await context.close()
  }
})
