// The first frame the shipped build lets a person see -- ledger row D-230 of
// `docs/development-records/defects.md`.
//
// ⭐ WHAT IS ASSERTED, IN ONE LINE: on a cold page, the FIRST tree that can be
// observed is the SAME tree that stands there once the screen's size has
// settled -- the same number of rows, the same tiers, the same y in the same
// order.
//
// ⭐ THE SPECIFICATION, VERBATIM. Table T-077 (`docs/spec/05-07-design.md:584`,
// 「起動の順序」) is sourced to `NFR-011`. Its first row:
//
//   BO-1 | 1 | 「画面の寸法を確定させ、`ScreenRegions`（`CP-35`）を求める。
//              **寸法が確定するまで 1 枚も描かない**」 | `NFR-011`
//
// and the rule printed under the same table (`:596`):
//
//   「上から順に通すこと（MUST）。前の段が済む前に次の段へ進んではならない
//    （MUST NOT）—— `BO-1` を飛ばすと寸法の無い 1 枚が、`BO-3` を飛ばすと位置
//    の決まらない 1 枚が出る。どちらも `NFR-011` が禁じている。」
//
// `BO-5` of the same table is 「最初の 1 枚を出す」, step 5 of 5. So the first
// frame a person can see is, by the table's own order, a frame drawn AFTER the
// size was settled -- there is no other frame the table allows to exist.
//
// `NFR-011` itself (`docs/spec/01-04-requirements.md:4195`) states it without a
// table: 「起動して最初に表示するとき、`GRS` は、空白のまま残る画面も、内容が
// 欠けたまま出る画面も出さないこと（MUST NOT）。」 and its RATIONALE names the
// very event watched for here: 「寸法が確定する前の 1 フレームで 0x0 の窓が出る
// こと」。
//
// ⛔⛔ WHAT IS **NOT** ASSERTED: that a ninth row does not appear, and that the
// tree does not sit 24px high. Those are the SYMPTOMS the ledger measured, not
// a rule -- no row of the specification says how many rows this document draws
// on this screen, or where its first row's top edge lands. A case written
// against a symptom would go green the day the document or the screen changed,
// while the frame was still being drawn before the size was known. So what is
// compared is the product against ITSELF a moment later: every number in the
// comparison is read off the settled frame at run time, and not one is typed in.
//
// ⛔ WHY THIS IS NOT A CASE OF `tests/system/measured-sweep.test.ts`, WHICH IS
// WHERE A SHIPPED-BUILD CASE OTHERWISE BELONGS. The ledger row says the fault
// shows 「ブラウザプロセスの最初の 1 ページのときだけ」, and that sweep's
// `beforeAll` already opens that page and waits for it to settle before its
// first case runs -- by the time any case there could look, the frame in
// question is an hour gone and every further context of that browser is a warm
// one. Riding the sweep would mean installing this recorder in the sweep's own
// `beforeAll`, ahead of the `goto` that all twenty-three of its cases share.
// ⇒ A file of its own, which pays for one further browser launch and nothing
// else. It is the only cost this measurement has.
//
// ⭐ HOW THE FIRST FRAME IS CAUGHT: THE PAGE NOTCHES ITSELF. A test that waited
// a chosen number of milliseconds and then read would be reading whatever
// happened to be on the screen at that moment -- and the ledger measured the
// wrong tree standing from 133ms to somewhere between 196ms and 1760ms, so any
// fixed wait either lands inside that window and calls the wrong tree the right
// one, or lands after it and never sees the fault at all. Instead an init
// script -- installed before the build's own script runs -- keeps an animation
// frame loop that reads the tree every frame from the very first one and keeps
// a reading only when it differs from the one before. The case then compares
// the first non-empty reading with the last, whenever those happened to fall.
//
// ⚠️ MEASURED 2026-09-03 THAT THE READING ITSELF DOES NOT HIDE THE FAULT.
// Reading a row's box forces the layout the fault is about, so the recorder was
// run against the shipped build twice before this case was written: both runs
// recorded exactly two distinct trees, nine rows then eight, the second one
// 24px lower -- the ledger's own numbers.
//
// ⛔ NO `swsCase` IS DECLARED HERE, for the reason
// `tests/system/measured-sweep.test.ts` and `tests/system/open-defect-pins.test.ts`
// both give: table T-219 (row TW-2) has Chapter 9's cases GENERATED from those
// declarations and hung from an `SWS-xxx` node, and none of `SWS-1`..`SWS-8` is
// about the order a start-up draws in. The rows this case leans on are quoted
// in prose above instead.
//
// ⛔ THIS CASE IS NOT `test.fail()`, though the row is open. Rule 04 section 2
// asks for the expectation the specification states, and the specification
// states that this holds; marking it expected-to-fail would make the suite
// assert that the product is broken. While the row is open the case is red, and
// red is the correct report. `tests/system/open-defect-pins.test.ts` carries
// D-230 on its ledger gate, so the day the row leaves the ledger that gate says
// so.
//
// ⭐ WHAT WOULD MAKE IT GO RED: any frame drawn before the App Header's height
// is known -- which is what the ledger row measured -- because such a frame
// puts a different tree on the screen than the settled one. It also goes red if
// the build stops drawing rows at all, and it fails loudly rather than passing
// if the recorder never ran a frame.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What is pressed, and on what screen
// ---------------------------------------------------------------------------

/**
 * ⛔ THE DELIVERABLE, not the sources and not the dev server. The ledger row
 * records the fault on the shipped build, and `NFR-004` row `CN-1` has `dist/`
 * hold exactly one file. This file only presses it, and says so loudly when it
 * is not there.
 */
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

const T025: SpecTable = specTable('T-025')

/** The row of table T-025 that fixes the screen of the base environment. */
const SCREEN_ROW = 'MC-6'

const BASE_SCREEN = screenOf(rowOf(T025, SCREEN_ROW))

/**
 * ⛔ NOT DECIDED BY THE SPECIFICATION: nothing says how a drawn row is marked
 * in the page. `tests/system/rows-fixed-with-nothing-holding-them.test.ts`
 * reads the drawn rows through the same attribute, so a change to the marking
 * breaks both files at once, as it should -- at that point the tool and the
 * tests disagree about how a row is found and the specification cannot settle
 * the argument.
 */
const DRAWN_ROW = '[data-depth]'

// ---------------------------------------------------------------------------
// The recorder the page runs on itself
// ---------------------------------------------------------------------------

/** One reading of the tree, kept only when it differs from the one before it. */
interface Frame {
  readonly at: number
  readonly tree: string
}

/** What the page notched: how many frames it looked at, and what it saw. */
interface Recorded {
  readonly ticks: number
  readonly frames: readonly Frame[]
}

/** One drawn row, as the page reported it. */
interface DrawnRow {
  readonly depth: string
  readonly top: number
  readonly height: number
}

/** Where the recorder hangs itself on the page. */
const RECORDER = 'grsFirstFrameRecord'

/**
 * How long the tree must stand unchanged before the run is called settled, and
 * the least the run is watched for whatever it does.
 *
 * ⚠️ NEITHER IS AN ASSERTION. The comparison itself holds no time in it: what
 * is compared is the first reading against the last, whenever they fell. These
 * two only decide when to stop watching, and they are set well past the
 * 1760ms upper edge the ledger measured for the window the wrong tree stands
 * in, so that a slow machine is watched through it rather than judged inside
 * it.
 */
const QUIET_MS = 1_500
const LEAST_WATCHED_MS = 5_000
const WATCH_DEADLINE_MS = 60_000

/**
 * What the page notched so far.
 *
 * @purity semi-pure-b
 */
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

/**
 * Watch until the tree has stood unchanged for `QUIET_MS`.
 *
 * ⚠️ Polling the page's own notches rather than the screen: the notches are
 * what the comparison is made of, so the run is quiet exactly when they stop
 * arriving.
 *
 * @purity non-pure
 */
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

/** The rows of one notched reading. @purity pure */
function rowsOf(frame: Frame): readonly DrawnRow[] {
  return JSON.parse(frame.tree) as DrawnRow[]
}

/** One reading, written out for a person to read in a failure. @purity pure */
function describe(frame: Frame): string {
  const rows = rowsOf(frame)
  const drawn = rows.map((row) => `d${row.depth}@${row.top}+${row.height}`).join(' ')
  return `at ${frame.at}ms, ${rows.length} rows: ${drawn}`
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

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

// ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. Closing the reference browser
// passes a hook's 30s default on this machine -- measured at 21s..163s over five
// launches -- so a file that did not raise this reported red at the very end
// however green its cases were. `CLEARING_UP_MS` of `./live-app` carries the
// measurements and why the contexts are not what is slow.
test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// GOES RED IF: the build puts a tree on the screen before the screen's size is
// settled -- `BO-1` of table T-077 (MUST NOT), quoted at the head of this file.
// The first tree a person could have seen is then not the tree the run settles
// on, and both are printed.
test('D-230: the first tree the shipped build draws is the tree it settles on', async () => {
  test.setTimeout(300_000)
  if (browser === null) throw new Error('the reference browser was not opened')
  // ⛔ THE FIRST PAGE OF THIS BROWSER PROCESS, and the ledger row says that is
  // the only page the fault shows on. Nothing may open a page before this one.
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  await context.addInitScript(
    (asked: { name: string; row: string }) => {
      const held: { ticks: number; frames: { at: number; tree: string }[] } = {
        ticks: 0,
        frames: [],
      }
      ;(window as unknown as Record<string, unknown>)[asked.name] = held
      /** The tree as it stands this frame. */
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
    // ⚠️ Not a fixed pause, and not what the comparison rests on: this only
    // gets the run past the point where a drawing exists at all.
    await readSettledDrawnSvg(page)
    const recorded = await watchUntilQuiet(page)

    // ⛔ THE GUARDS COME FIRST, so that a recorder that reached nothing fails
    // for reaching nothing rather than passing on two empty trees.
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

    // `BO-1` of table T-077 (MUST NOT): 「寸法が確定するまで 1 枚も描かない」.
    // The first tree that could be seen must therefore be the settled tree.
    // ⚠️ THE TREES ARE COMPARED, NOT THEIR DESCRIPTIONS: a description carries
    // the moment it was notched at, and no two readings share one.
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
