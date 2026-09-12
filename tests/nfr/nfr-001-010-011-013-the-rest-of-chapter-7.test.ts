// The pass marks of table T-043 that `nfr-002-003-frame-time-is-the-interval`
// does NOT measure -- everything in Chapter 7 other than the frame time of a
// scroll, a zoom, a pan and a range select.
//
// Place and tool come from table T-218 of Chapter 7 (`docs/spec/05-07-
// design.md`), row `TS-4`: the systematic kind whose parent is `NFR-xxx` lives
// in `tests/nfr/` and is driven by Playwright, and the performance gates of
// table T-043 are run from here.
//
// ⭐ WHY THIS FILE EXISTS. Ledger row `D-313` said no measuring harness was in
// the repository at all. Half of that was refuted on 2026-09-06 -- the frame
// time file exists and produced `D-330`'s numbers -- and the ruling of
// `CR-364` (2026-09-06) chose "write the remaining measurements". These are
// the remaining measurements. ⭐⭐ The `RISK-001` gate that used to stand in
// front of a real performance run was opened by the user on 2026-09-07
// (`PD-425`): the harness is to be written and run now.
//
// ⛔ EVERY CASE PRINTS ITS RAW MEASUREMENT, not merely pass or fail. A green
// test that prints nothing cannot be refuted later, and this project has twice
// had to re-measure a number that reached it as prose.
//
// ⛔ DO NOT LOWER AN EXPECTATION TO MAKE IT GREEN. A proposal to lower a pass
// mark was put to the user on 2026-09-07 and rejected.
//
// ---------------------------------------------------------------------------
// WHICH ROWS OF TABLE T-043 THIS FILE ANSWERS, and which it deliberately does
// not:
//
//   PG-1   initial paint                     GATE      measured here
//   PG-4   no missing screen                 GATE      measured here
//   PG-5   redraws while nothing is done     GATE      measured here
//   PG-6   how many figures are drawn        record    measured here
//   PG-7   the .html's byte count            record    measured here
//   PG-8   frame time while dragging an item GATE      measured here
//   PG-9   the hit test while hovering       GATE      measured here
//   PG-10 dependency routing when dense      GATE      measured here
//   PG-11 rebuilding the overlaid layer      GATE      NOT measured -- M4
//   PG-12 crowded long labels                GATE      measured here
//   PG-14 how the cost grows with the scale  GATE      measured here
//
//   PG-2 / PG-3 belong to the frame-time file and are not repeated here.
//
// ⚠️ `PG-11` IS NOT DRIVEN AND THE REASON IS SAID RATHER THAN HIDDEN. Table
// T-043 starts it at `M4`, and it measures the time to rebuild the overlaid
// layer; this build draws no separate overlaid layer to rebuild -- the whole
// picture is one string (`SvgSurface`, `IF-1` of table T-065) -- so there is
// nothing for the row to time. A case below records that as an un-pressed row
// rather than letting a missing number read as a pass.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT OF TABLE T-025 THIS RUN DOES NOT MEET, so that no number below is
// mistaken for a base value:
//   * `MC-6` asks for the browser at full screen. A driven browser is given a
//     viewport of `MC-6`'s size instead; full screen is not reproducible from
//     a test, and `tests/system/live-app.ts` records the same limit.
//   * A driven browser's frame clock is not the host display's.
//   * `MC-4` IS met when the host's browser uses the integrated part. The
//     renderer string is read and reported every run, so a run on anything
//     else is visible rather than silent.
//
// ⭐ WHAT WAS READ OF `src/`: nothing that decides a number. The handles used
// here are the ones the System files already lean on (`[data-role]`,
// `[data-icon]`) plus `data-figure`, which the shipped picture carries on
// every figure. ⚠️ `data-figure` IS NOT SETTLED BY THE SPECIFICATION -- it is
// `SvgRenderer`'s own marking, added for `D-316` -- and it is used here only to
// find a bar to grab for `PG-8`. Nothing is judged on its spelling.
//
// ⭐ THE CLAUSES PINNED HERE ARE QUOTED VERBATIM, in Japanese, beside the
// judgement that presses each one. Rule 03 section 5 bans TRANSLATING the
// manuscript into the tree; a quotation is not a translation.
//
// ⚠️ WHY THE SHIPPED BUILD AND NOT THE DEV SERVER. The rows of table T-043 are
// gates on the thing that is handed over, and `NFR-004` makes that one
// `.html`. Run `npx vite build` first.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser, screenOf } from '../system/live-app'
import { rowOf } from '../system/sws-case'

const T025: SpecTable = specTable('T-025')

/** `MC-6` -- the screen of the base environment. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// ---------------------------------------------------------------------------
// The pass marks, each beside the clause that carries it
// ---------------------------------------------------------------------------

/**
 * `NFR-001`, verbatim:
 *
 *   表 T-025 の条件で目標規模の文書を開いたとき、`GRS` は、初期描画を 1500
 *   ミリ秒以内に完了すること。**完了とは、`NFR-011` が求める「欠けていない最初
 *   の 1 枚」が画面に出た時点をいう。**
 *
 * ⭐ THE SECOND SENTENCE IS WHY THE PAINT IS WHAT IS TIMED and not the moment
 * the drawing was written into the page: the clause says "on the screen".
 */
const FIRST_PAINT_CEILING_MS = 1500

/**
 * `NFR-002`, verbatim:
 *
 *   表 T-025 の条件と `MC-8` の区間で、`GRS` は、平均フレームレートを毎秒 60
 *   フレーム以上に保つこと。
 */
const FRAME_RATE_FLOOR = 60

/**
 * `NFR-003`, verbatim:
 *
 *   表 T-025 の条件と `MC-8` の区間で、`GRS` は、フレーム時間の 95 パーセンタ
 *   イルを 16.7 ミリ秒以内に保つこと。
 */
const FRAME_TIME_P95_CEILING_MS = 16.7

/**
 * `MC-7`, verbatim: 目標規模 | 50 行 / 1000 `Task`.
 *
 * Read off the row rather than typed, so a change to the target scale moves
 * this file with it.
 */
const TARGET_TASKS = ((): number => {
  const cell = rowOf(T025, 'MC-7').cells[rowOf(T025, 'MC-7').cells.length - 1] ?? ''
  const found = /(\d+)\s*`?Task/.exec(cell)
  const n = Number(found?.[1] ?? '')
  if (!Number.isInteger(n)) throw new Error('table T-025 row MC-7 states no Task count this file can read')
  return n
})()

/**
 * `MC-9`, verbatim:
 *
 *   計算量の伸び方（`NFR-013`）を測る規模 | タスク数を `1×` / `2×` / `4×` /
 *   `8×` の 4 段階に変え、同じ操作を 1 段階ごとに 3 回測って中央値を採る
 *
 * ⭐ THE FOUR STEPS ARE REACHED BY GOING DOWN, not up. `MC-7` fixes the
 * bundled document at 1000 `Task`, and `AM-8` (`importDocument`) answers
 * `notAvailable` in this build -- measured, see the case below -- so a larger
 * document cannot be put in. Deleting down to an eighth gives the same four
 * steps with the same ratios: 125 / 250 / 500 / 1000.
 */
const SCALE_STEPS = [1, 2, 4, 8] as const
const SCALE_RUNS = 3

/**
 * `NFR-013`, verbatim:
 *
 *   `GRS` は、タスク数 `n` に対して、レイアウトの算出・当たり判定・依存線の経
 *   路の計算量を **`O(n log n)` 以下**とすること。`O(n²)` の算法を用いては
 *   ならない（MUST NOT）。**
 *
 * ⭐ THE CEILING IS COMPUTED, NEVER TYPED. Going from `n` to `8n` under
 * `O(n log n)` costs at most `(8n log 8n) / (n log n)` = `8 * log(8n)/log(n)`
 * times as much. Typing a number here would hide which `n` it was derived
 * from, and `D-330` recites a "10.7x" whose `n` nobody recorded.
 *
 * @purity pure
 */
function growthCeiling(smallestN: number): number {
  return 8 * (Math.log(8 * smallestN) / Math.log(smallestN))
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/** Nearest-rank percentile. @purity pure */
function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil(fraction * sorted.length))
  return sorted[rank - 1] ?? Number.NaN
}

/** @purity pure */
function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? Number.NaN
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

/** @purity pure */
function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

// ---------------------------------------------------------------------------
// The probe
// ---------------------------------------------------------------------------
//
// ⛔⛔ THE CLAUSE EVERY FRAME NUMBER BELOW OBEYS -- the preamble of table
// T-043, quoted verbatim:
//
//   「フレーム時間」とは、届いたフレームとフレームの間隔である（MUST）。描き
//   直しの呼び出しの中で過ごす時間を、フレーム時間として測ってはならない
//   （MUST NOT）
//
// ⭐ So `PG-8` / `PG-9` / `PG-10` / `PG-12` below are judged on the INTERVAL.
// The time spent inside the call is recorded beside it and never used as a
// frame time. ⚠️ `PG-14` is the one exception, and it is not a frame time at
// all: `NFR-013` constrains how the COMPUTATION grows with `n`, so the inside-
// call time is the right quantity there and the row says so where it is used.
//
// ⚠️ It is installed with `addInitScript`, which runs before the page's own
// scripts, so a bare `requestAnimationFrame(...)` resolves to the wrapper.
// The observer is attached to `document` itself, which can be observed before
// the documentElement exists -- that is how the FIRST drawing is caught for
// `PG-1` and `PG-4`.
const PROBE = `(() => {
  const state = { samples: [], marks: [], inputs: [], states: [], redraws: [], firstContentAt: 0, watching: true };
  const raw = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (callback) {
    return raw(function (stamp) {
      const enter = performance.now();
      try { callback(stamp); } finally { state.samples.push([stamp, enter, performance.now()]); }
    });
  };
  var note = function () { state.inputs.push(performance.now()); };
  window.addEventListener('pointermove', note, { capture: true, passive: true });
  window.addEventListener('wheel', note, { capture: true, passive: true });
  // TWO JOBS, AND ONLY ONE OF THEM IS EXPENSIVE. Every mutation of the canvas
  // is stamped into "redraws" -- a push and nothing else -- which is what says
  // whether a driven stretch was redrawing anything. The size and child count
  // are read ONLY while "watching" is on, because getBoundingClientRect forces
  // a layout, and reading it on every frame of a measured stretch would change
  // the very intervals being measured.
  // (No backticks in here: this whole probe is a template literal.)
  var look = function (records) {
    var touched = false;
    for (var i = 0; i < records.length; i += 1) {
      var target = records[i].target;
      var node = target.nodeType === 1 ? target : target.parentElement;
      if (node !== null && node.closest !== undefined
          && node.closest('[data-role="Schedule Canvas"]') !== null) { touched = true; break; }
    }
    if (touched) state.redraws.push(performance.now());
    if (!state.watching) return;
    var svg = document.querySelector('[data-role="Schedule Canvas"] svg');
    if (svg === null) return;
    var box = svg.getBoundingClientRect();
    state.states.push([performance.now(), Math.round(box.width), Math.round(box.height), svg.childElementCount]);
    if (state.firstContentAt === 0 && svg.childElementCount > 0 && box.width > 0 && box.height > 0) {
      state.firstContentAt = performance.now();
    }
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true });
  state.mark = function (name, edge) { state.marks.push([name, edge, performance.now()]); };
  Object.defineProperty(window, '__grsProbe', { value: state });
})();`

/**
 * ⛔⛔ WHY THE INPUT CADENCE IS MEASURED TOO. A driven browser's input does not
 * arrive at the rate a hand's does. If the build asks for one frame per input
 * event -- which is what `NFR-010` pushes every build towards -- the interval
 * between frames is the interval between the HARNESS's events, and a red would
 * say nothing about the application. A stretch whose frames are no denser than
 * its input is called INPUT-BOUND, and it is still listed.
 */
const INPUT_BOUND = 'input-bound'

/** Everything one driven stretch yielded. */
interface Segment {
  readonly name: string
  readonly frames: number
  readonly frameRate: number
  readonly intervalP95: number
  readonly intervalMean: number
  readonly intervalWorst: number
  readonly insideP95: number
  readonly insideMedian: number
  readonly inputs: number
  readonly inputMean: number
  readonly inputBound: boolean
  /**
   * Whether the driving kept the drawing being redrawn at all.
   *
   * ⛔⛔ WHY THIS DECIDES WHETHER A STRETCH IS JUDGED. `MC-8` names what it
   * measures over, verbatim: ズーム・スクロール・パン・ドラッグ・範囲選択を行っ
   * ている間、および**ポインタの移動が描き直しを起こしている間**。⚠️ **何も変
   * わらないポインタの移動は含めない** —— 描き直しが起きないので測る母数が無い
   * （`NFR-010`）.
   *
   * ⭐ So a stretch in which the input caused NO redraw is not a stretch
   * `MC-8` measures over -- there is no 母数 -- and judging it would report a
   * build as breaking `NFR-002` precisely BECAUSE it obeys `NFR-010`. The
   * number is still printed; it is simply not a gate value.
   */
  readonly redrawing: boolean
  /** How many times the canvas was rewritten between the two marks. */
  readonly redraws: number
  /**
   * Whether the driving was pointer moves rather than wheel notches.
   *
   * ⛔⛔ IT DECIDES WHETHER `inputBound` MEANS ANYTHING. The browser coalesces
   * pointer moves down to about one per frame, so for a pointer-driven stretch
   * the received input rate EQUALS the frame rate by construction however fast
   * or slow the application is -- measured 2026-09-07: 3,600 moves were
   * dispatched and 169 arrived, one per delivered frame. ⭐ For a wheel stretch
   * every notch arrives, so there the comparison really does say whether the
   * harness was the limit. ⛔ Either way the breach is still listed: this
   * changes what the caveat is worth, never whether a red is shown.
   */
  readonly pointerDriven: boolean
}

/** One step of `MC-9`. */
interface ScaleStep {
  readonly multiple: number
  readonly tasks: number
  /** Median over `SCALE_RUNS` runs of the median inside-call time, in ms. */
  readonly insideMedianMs: number
  readonly runs: readonly number[]
  readonly figures: number
  readonly characters: number
}

interface Measured {
  readonly browserVersion: string
  readonly renderer: string
  readonly tasks: number
  readonly dependencies: number
  readonly tasksWithDependencies: number
  readonly longestLabel: number
  readonly meanLabel: number
  /** `PG-1`: when the first un-missing drawing was ON SCREEN, in ms. */
  readonly firstPaintMs: number
  /** When the first drawing was written into the page, in ms -- for contrast. */
  readonly firstContentMs: number
  /** `PG-4`: every state the canvas was seen in on the way up. */
  readonly startupStates: readonly (readonly number[])[]
  readonly zeroSizedStates: number
  readonly emptyStatesAfterFirstContent: number
  /** `PG-5`: frames delivered over an untouched stretch, and how long it was. */
  readonly idleFrames: number
  readonly idleSeconds: number
  /** `PG-6`: figures actually drawn, and the picture's size. */
  readonly figuresDrawn: number
  readonly svgElements: number
  readonly svgCharacters: number
  /** `PG-7`: the shipped `.html`'s byte count. */
  readonly shippedBytes: number
  /** `PG-8` / `PG-9` / `PG-10` / `PG-12`. */
  readonly segments: readonly Segment[]
  readonly barGrabbed: string
  /** Stretches that yielded too few frames to say anything about. */
  readonly barren: readonly string[]
  /** `PG-14`. */
  readonly scale: readonly ScaleStep[]
  /** Whether `AM-8` can put a larger document in -- why `MC-9` steps down. */
  readonly importAvailable: boolean
  readonly importAnswer: string
  /** `PG-10` / `PG-12`: what was on screen while each was driven. */
  readonly dependenciesDrawn: number
  readonly labelsDrawn: number
  readonly labelCharacters: number
}

/**
 * ⛔ THE DELIVERABLE, not the sources and not the dev server. `NFR-004` row
 * `CN-1` has `dist/` hold exactly one file and that file be the `.html`.
 */
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

/** `FR-065` keeps the `Agent API` shut until a person opens it -- row `IC-20`. */
const AGENT_API_ENTRANCE = 'IC-20'

let browser: Browser | null = null
let measured: Measured | null = null
let sweepFailed: Error | null = null

test.beforeAll(async () => {
  test.setTimeout(900_000)
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npx vite build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  try {
    await page.addInitScript(PROBE)
    measured = await sweep(browser, context, page)
  } catch (thrown) {
    sweepFailed = thrown instanceof Error ? thrown : new Error(String(thrown))
  } finally {
    await context.close()
  }
})

test.afterAll(async () => {
  // ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. `CLEARING_UP_MS` of
  // `../system/live-app` carries the measurements and the reason.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
function taken(): Measured {
  if (sweepFailed !== null) throw sweepFailed
  if (measured === null) throw new Error('the sweep brought nothing back')
  return measured
}

// ---------------------------------------------------------------------------
// Driving
// ---------------------------------------------------------------------------

type Cdp = import('@playwright/test').CDPSession

interface PointerEventArgs {
  readonly type: 'mouseMoved' | 'mouseWheel' | 'mousePressed' | 'mouseReleased'
  readonly x: number
  readonly y: number
  readonly button?: 'left' | 'none'
  readonly buttons?: number
  readonly modifiers?: number
  readonly deltaX?: number
  readonly deltaY?: number
  readonly clickCount?: number
}

/**
 * Put a whole burst on the wire, in order, before awaiting any of it.
 *
 * ⛔⛔ WHY NOT `page.mouse`. Measured 2026-09-05 by the frame-time file: one
 * awaited round trip per event delivered an event every 19.1ms and the frame
 * interval came out at 19.01ms -- the signature of a measurement of the
 * HARNESS. A whole burst put on the wire at once takes the harness's own rate
 * far below the frame rate.
 *
 * @purity non-pure
 */
async function burst(cdp: Cdp, events: readonly PointerEventArgs[]): Promise<void> {
  await Promise.all(events.map((one) => cdp.send('Input.dispatchMouseEvent', { ...one })))
}

/** @purity non-pure */
async function markSegment(page: Page, name: string, edge: 'start' | 'end'): Promise<void> {
  await page.evaluate(
    ([which, side]: [string, string]) => {
      const probe = (window as unknown as { __grsProbe?: { mark(a: string, b: string): void } })
        .__grsProbe
      probe?.mark(which, side)
    },
    [name, edge] as [string, string],
  )
}

/**
 * How many events go on the wire at once, and how many times that is repeated.
 *
 * ⛔⛔ THE ROUNDS ARE NOT DECORATION, and a run without them measures nothing.
 * Measured 2026-09-07 on this build: one `Promise.all` of 90 pointer moves --
 * the whole gesture in a single burst -- reached the page as 6 events and
 * yielded 4 frames, because the browser coalesces moves down to about one per
 * frame. The same gesture sent as 150 rounds of 24 yields hundreds. ⭐ The two
 * counts below are the frame-time file's, measured there on 2026-09-05 to give
 * roughly three seconds of gesture: a wheel notch is NOT coalesced and so
 * needs far fewer rounds than a pointer move.
 */
const PER_BURST = 24
const WHEEL_ROUNDS = 26
const DRAG_ROUNDS = 150

/**
 * ⚠️ NOTHING IS WAITED FOR INSIDE THE MARKS. A `waitForTimeout` between the
 * start and the end mark puts one huge gap into the intervals and lands in the
 * 95th percentile -- measured 2026-09-07, a 600ms settle inside the window
 * reported a p95 of 604.4ms for a stretch whose frames were arriving normally.
 * The settle goes after the end mark, where it cannot be counted.
 *
 * @purity non-pure
 */
async function driveSegment(
  page: Page,
  name: string,
  step: (round: number) => Promise<void>,
  rounds: number,
): Promise<void> {
  await markSegment(page, name, 'start')
  for (let i = 0; i < rounds; i += 1) await step(i)
  await markSegment(page, name, 'end')
  await page.waitForTimeout(500)
}

/** Press an entrance of table T-109 with a real pointer. @purity non-pure */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((mark: string) => {
    const entry = document.querySelector(`[data-icon="${mark}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(800)
  return true
}

/**
 * Cut every delivered frame between the two marks of one stretch into a
 * `Segment`.
 *
 * ⚠️ SEVERAL CALLBACKS CAN SHARE ONE FRAME. The browser hands the same `stamp`
 * to every callback of one frame, so samples are grouped by `stamp`: one frame
 * has one interval and one inside-time (the sum of its callbacks).
 *
 * @purity non-pure
 */
async function segmentOf(page: Page, name: string): Promise<Segment | null> {
  const cut = await page.evaluate((which: string) => {
    const probe = (
      window as unknown as {
        __grsProbe: {
          samples: [number, number, number][]
          marks: [string, string, number][]
          inputs: number[]
          redraws: number[]
        }
      }
    ).__grsProbe
    const start = probe.marks.find((m) => m[0] === which && m[1] === 'start')?.[2]
    const end = probe.marks.find((m) => m[0] === which && m[1] === 'end')?.[2]
    if (start === undefined || end === undefined) return null
    const byStamp = new Map<number, { enter: number; inside: number }>()
    for (const [stamp, enter, leave] of probe.samples) {
      if (enter < start || enter > end) continue
      const had = byStamp.get(stamp)
      if (had === undefined) byStamp.set(stamp, { enter, inside: leave - enter })
      else had.inside += leave - enter
    }
    const frames = [...byStamp.entries()]
      .map(([stamp, one]) => ({ stamp, ...one }))
      .sort((a, b) => a.stamp - b.stamp)
    return {
      frames,
      inputs: probe.inputs.filter((at) => at >= start && at <= end),
      redraws: probe.redraws.filter((at) => at >= start && at <= end).length,
      span: end - start,
    }
  }, name)
  if (cut === null || cut.frames.length < 3) return null
  const intervals: number[] = []
  for (let i = 1; i < cut.frames.length; i += 1) {
    intervals.push((cut.frames[i]?.stamp ?? 0) - (cut.frames[i - 1]?.stamp ?? 0))
  }
  const inside = cut.frames.map((one) => one.inside)
  const first = cut.frames[0]?.stamp ?? 0
  const last = cut.frames[cut.frames.length - 1]?.stamp ?? 0
  const seconds = (last - first) / 1000
  const inputMean =
    cut.inputs.length < 2
      ? Number.NaN
      : ((cut.inputs[cut.inputs.length - 1] ?? 0) - (cut.inputs[0] ?? 0)) / (cut.inputs.length - 1)
  const meanInterval = intervals.reduce((s, o) => s + o, 0) / intervals.length
  return {
    name,
    frames: cut.frames.length,
    frameRate: round(seconds === 0 ? Number.NaN : (cut.frames.length - 1) / seconds),
    intervalP95: round(percentile(intervals, 0.95)),
    intervalMean: round(meanInterval),
    intervalWorst: round(Math.max(...intervals)),
    insideP95: round(percentile(inside, 0.95)),
    insideMedian: round(median(inside)),
    inputs: cut.inputs.length,
    inputMean: round(inputMean),
    // Frames no denser than the input that drove them: the harness is the
    // limit, not the application.
    inputBound: Number.isFinite(inputMean) && meanInterval <= inputMean * 1.15,
    // ⛔⛔ COUNTED, NOT INFERRED FROM THE TIMINGS. `redraws` is how many
    // times the canvas was actually rewritten between the two marks, stamped
    // by the probe's observer. Deciding this from the intervals would be
    // deciding it from the very numbers the gate judges; comparing the picture
    // at the two ENDS does not work either, because a gesture that returns to
    // where it started leaves an identical picture behind (measured
    // 2026-09-07: a drag of 163 frames reported "unchanged" that way).
    redrawing: cut.redraws > 0,
    redraws: cut.redraws,
    pointerDriven: false,
  }
}


// ---------------------------------------------------------------------------
// The sweep -- one launch, one pass
// ---------------------------------------------------------------------------

/** @purity non-pure */
async function sweep(live: Browser, context: BrowserContext, page: Page): Promise<Measured> {
  // --- PG-1 and PG-4: the way up -------------------------------------------
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await page.waitForSelector(DRAWN_SVG, { state: 'attached' })
  await page.waitForTimeout(2500)

  const startup = await page.evaluate(() => {
    const probe = (
      window as unknown as { __grsProbe: { states: number[][]; firstContentAt: number } }
    ).__grsProbe
    const paints = performance.getEntriesByType('paint')
    const contentful = paints.find((one) => one.name === 'first-contentful-paint')?.startTime ?? 0
    const states = probe.states
    const firstWithContent = states.findIndex((one) => (one[3] ?? 0) > 0)
    return {
      firstContentAt: probe.firstContentAt,
      firstContentfulPaint: contentful,
      states: states.slice(0, 24),
      stateCount: states.length,
      // NFR-011's two named events: a 0 x 0 window, and a drawing that is on
      // screen with nothing in it.
      zeroSized: states.filter((one) => one[1] === 0 || one[2] === 0).length,
      emptyAfterFirstContent:
        firstWithContent < 0
          ? -1
          : states.slice(firstWithContent).filter((one) => (one[3] ?? 0) === 0).length,
    }
  })

  // ⭐ The size-reading half of the observer is switched off now that PG-1 and
  // PG-4 have their states: from here on it only stamps that a redraw
  // happened, which costs a push and forces no layout.
  await page.evaluate(() => {
    ;(window as unknown as { __grsProbe: { watching: boolean } }).__grsProbe.watching = false
  })

  const about = await page.evaluate((selector: string) => {
    const svg = document.querySelector(selector)
    const all = svg === null ? [] : [...svg.querySelectorAll('*')]
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const box = svg?.getBoundingClientRect() ?? new DOMRect()
    return {
      renderer: ext ? String(gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown',
      figures: all.filter((e) => e.hasAttribute('data-figure')).length,
      elements: all.length,
      characters: svg?.outerHTML.length ?? 0,
      centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      area: { x: box.x, y: box.y, width: box.width, height: box.height },
    }
  }, DRAWN_SVG)

  // --- PG-5: nothing is done for four seconds ------------------------------
  //
  // `NFR-010`, verbatim: 利用者が操作していない間、`GRS` は、画面を描き直さな
  // いこと。
  const idleSeconds = 4
  const framesBefore = await page.evaluate(
    () => (window as unknown as { __grsProbe: { samples: unknown[] } }).__grsProbe.samples.length,
  )
  await page.waitForTimeout(idleSeconds * 1000)
  const framesAfter = await page.evaluate(
    () => (window as unknown as { __grsProbe: { samples: unknown[] } }).__grsProbe.samples.length,
  )

  // --- Open the Agent API, which the scale steps and the counts need --------
  await pressEntrance(page, AGENT_API_ENTRANCE)
  const document0 = await page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi?: Record<string, never> })
      .grSchedulerAgentApi as unknown as
      | {
          readDocument(): {
            schedule: {
              tasks: {
                uid: number
                wbsParentUid: number | null
                name: string
                dependencies?: unknown[]
              }[]
            }
          }
          importDocument(source: unknown): { accepted: boolean; refusal?: { reason?: string } }
        }
      | undefined
    if (api === undefined) return null
    const tasks = api.readDocument().schedule.tasks
    const lengths = tasks.map((t) => String(t.name ?? '').length)
    const answer = api.importDocument({ text: '{}' })
    const parents = new Set(tasks.map((t) => t.wbsParentUid).filter((u) => u !== null))
    return {
      // A `Task` nothing names as its WBS parent: dragging it moves it alone.
      leafUids: tasks.filter((t) => !parents.has(t.uid)).map((t) => t.uid),
      tasks: tasks.length,
      dependencies: tasks.reduce((n, t) => n + (t.dependencies?.length ?? 0), 0),
      withDependencies: tasks.filter((t) => (t.dependencies?.length ?? 0) > 0).length,
      longestLabel: lengths.length === 0 ? 0 : Math.max(...lengths),
      meanLabel:
        lengths.length === 0 ? 0 : Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
      importAvailable: answer.accepted,
      importAnswer: String(answer.refusal?.reason ?? (answer.accepted ? 'accepted' : 'refused')),
    }
  })
  if (document0 === null) {
    throw new Error(
      `the Agent API did not appear after its entrance ${AGENT_API_ENTRANCE} was pressed; ` +
        'the scale steps of MC-9 and the counts of PG-10 / PG-12 cannot be taken without it',
    )
  }

  const cdp = await context.newCDPSession(page)
  const barren: string[] = []
  const segments: Segment[] = []

  /** @purity non-pure */
  const collect = async (name: string, pointerDriven = false): Promise<void> => {
    const one = await segmentOf(page, name)
    if (one === null) barren.push(name)
    else segments.push({ ...one, pointerDriven })
  }

  // --- PG-8: dragging an item ----------------------------------------------
  //
  // ⭐ THE ROW THE FRAME-TIME FILE COULD NOT PRESS. It records that `MK-8` is
  // not driven because "finding a task bar in the drawing needs a handle the
  // specification does not settle", so `PG-8` got no number from it. The
  // shipped picture now carries `data-figure` on every figure (added for
  // `D-316`), which gives a bar's own rectangle. ⚠️ That marking is
  // `SvgRenderer`'s and not the specification's; it is used to FIND a bar and
  // nothing here is judged on its spelling.
  //
  // ⛔⛔ A LEAF, AND THE FIRST RUN OF THIS FILE MEASURED WHY. Taking simply the
  // first drawn plan bar takes `task-1-plan` -- the summary bar of the whole
  // product, 6,564px wide and standing for a `Task` that other rows hang from.
  // Dragging it delivered 162 frames whose redraw callback did 10.45ms of work
  // EACH, and rewrote the canvas ZERO times: the grab took nothing, and the
  // stretch measured an empty gesture at 53 frames a second. ⭐ So the bar is
  // chosen from the `Task` that nothing names as its WBS parent, and the
  // redraw count is reported beside the number so that an empty grab can never
  // pass for a drag again.
  const bar = await page.evaluate(
    ([selector, leaves]: [string, number[]]) => {
      const svg = document.querySelector(selector)
      if (svg === null) return null
      const leaf = new Set(leaves)
      const area = svg.getBoundingClientRect()
      // ⚠️ A KEY NAMES A CONTIGUOUS RUN, NOT ONE ELEMENT. D-316 lets one bar
      // take more than one SVG element under the same data-figure key -- a
      // thin bar is a line, a head polygon and its dot marks, all sharing one
      // key -- and measured across 1000 tasks, a repeated key always repeats as
      // one unbroken run in document order, never apart. Taking the FIRST
      // element that matches the pattern would silently read whichever piece of
      // the run happens to come first -- a near-zero-height line, say -- and
      // miss the rest of the same bar sitting right beside it. So a whole run is
      // folded into one rectangle before the size and position filters below
      // ever run, and what they judge is the bar, not one of its parts.
      const all = [...svg.querySelectorAll('[data-figure]')]
      let index = 0
      while (index < all.length) {
        const key = all[index]?.getAttribute('data-figure') ?? ''
        let end = index + 1
        while (end < all.length && (all[end]?.getAttribute('data-figure') ?? '') === key) end += 1
        const found = /^task-(\d+)-plan$/.exec(key)
        if (found !== null && leaf.has(Number(found[1]))) {
          const rects = all.slice(index, end).map((e) => e.getBoundingClientRect())
          const left = Math.min(...rects.map((r) => r.left))
          const top = Math.min(...rects.map((r) => r.top))
          const right = Math.max(...rects.map((r) => r.right))
          const bottom = Math.max(...rects.map((r) => r.bottom))
          const box = { x: left, y: top, width: right - left, height: bottom - top }
          if (
            box.width >= 30 &&
            box.width <= 900 &&
            box.height >= 8 &&
            box.x >= area.x + 60 &&
            box.y >= area.y + 60 &&
            box.x + box.width <= area.right - 200 &&
            box.y + box.height <= area.bottom - 120
          ) {
            return {
              key,
              x: Math.round(box.x + box.width / 2),
              y: Math.round(box.y + box.height / 2),
            }
          }
        }
        index = end
      }
      return null
    },
    [DRAWN_SVG, document0.leafUids] as [string, number[]],
  )

  if (bar !== null) {
    // ⭐ THE GRAB IS TAKEN BEFORE THE MARKS and released after them, so that
    // neither the press nor the settle after the release lands in the
    // intervals. What is measured is the moving.
    await burst(cdp, [
      { type: 'mouseMoved', x: bar.x, y: bar.y },
      { type: 'mousePressed', x: bar.x, y: bar.y, button: 'left', buttons: 1, clickCount: 1 },
    ])
    await driveSegment(
      page,
      'PG-8 drag',
      async (round) => {
        await burst(
          cdp,
          Array.from({ length: PER_BURST }, (_unused, step) => {
            const phase = (round * PER_BURST + step) / 9
            return {
              type: 'mouseMoved' as const,
              x: bar.x + Math.sin(phase) * 160,
              y: bar.y + Math.cos(phase / 3) * 40,
              button: 'left' as const,
              buttons: 1,
            }
          }),
        )
      },
      DRAG_ROUNDS,
    )
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: bar.x, y: bar.y, button: 'left', buttons: 0, clickCount: 1,
    })
    await page.waitForTimeout(500)
    await collect('PG-8 drag', true)
  } else {
    barren.push('PG-8 drag')
  }

  // --- PG-9: the hit test while the pointer is over the drawing ------------
  //
  // ⚠️ `MC-8` EXCLUDES TWO KINDS OF POINTER MOVE, verbatim: 何も変わらないポイ
  // ンタの移動は含めない ... ポインタが乗ったことによる濃さの変化と、待ち時間で
  // 出る説明だけの描き直しも含めない. So what is driven here is a plain sweep
  // across the drawing, and if it delivers no frames that IS the answer -- the
  // hit test ran with no redraw behind it, and `NFR-010` says there is then no
  // denominator to measure over. It is reported as barren rather than as a
  // pass.
  await driveSegment(
    page,
    'PG-9 hover',
    async (round) => {
      await burst(
        cdp,
        Array.from({ length: PER_BURST }, (_unused, step) => {
          const phase = (round * PER_BURST + step) / 7
          return {
            type: 'mouseMoved' as const,
            x: about.centre.x + Math.sin(phase) * (about.area.width / 5),
            y: about.centre.y + Math.cos(phase / 2) * (about.area.height / 5),
            button: 'none' as const,
            buttons: 0,
          }
        }),
      )
    },
    DRAG_ROUNDS,
  )
  await collect('PG-9 hover', true)

  // --- PG-10: dependency routes, as dense as this document gets ------------
  //
  // ⭐ DENSITY IS MADE BY ZOOMING OUT, not by inventing a document: `MC-7`
  // fixes the target scale, and the bundled document's own 509 dependencies
  // crowd together once the whole schedule is in the window. How many routes
  // were actually drawn is counted and reported beside the number, so a run
  // where nothing crowded is visible rather than silent.
  //
  // ⛔⛔ THE MAGNIFICATION IS SOUGHT, NOT ASSUMED, and the first run of this
  // file measured why. Zooming out 14 notches in one go put the schedule at a
  // magnification where NOT ONE dependency route was drawn -- `FR-018` thins
  // the drawing out as it shrinks -- and the stretch would have reported a
  // frame time for a picture with none of the thing the row is about. So the
  // zoom is stepped, the routes are counted at each step, and the step that
  // drew the most is the one the stretch is driven at.
  const countHere = async (): Promise<{
    dependencies: number
    labels: number
    labelCharacters: number
  }> =>
    page.evaluate((selector: string) => {
      const svg = document.querySelector(selector)
      const figures = svg === null ? [] : [...svg.querySelectorAll('[data-figure]')]
      const labels = svg === null ? [] : [...svg.querySelectorAll('text')]
      return {
        dependencies: figures.filter((e) => /^dep-/.test(e.getAttribute('data-figure') ?? ''))
          .length,
        labels: labels.length,
        labelCharacters: labels.reduce((n, e) => n + (e.textContent ?? '').length, 0),
      }
    }, DRAWN_SVG)

  let dense = await countHere()
  let densestStep = 0
  for (let out = 1; out <= 14; out += 1) {
    await burst(cdp, [
      {
        type: 'mouseWheel',
        x: about.centre.x,
        y: about.centre.y,
        deltaX: 0,
        deltaY: 240,
        modifiers: 2,
      },
    ])
    await page.waitForTimeout(220)
    const here = await countHere()
    if (here.dependencies > dense.dependencies) {
      dense = here
      densestStep = out
    }
  }
  // Back in to the step that drew the most routes.
  await burst(
    cdp,
    Array.from({ length: 14 - densestStep }, () => ({
      type: 'mouseWheel' as const,
      x: about.centre.x,
      y: about.centre.y,
      deltaX: 0,
      deltaY: -240,
      modifiers: 2,
    })),
  )
  await page.waitForTimeout(1200)
  dense = await countHere()

  await driveSegment(
    page,
    'PG-10 dense dependencies',
    async (round) => {
      await burst(
        cdp,
        Array.from({ length: PER_BURST }, (_unused, step) => ({
          type: 'mouseWheel' as const,
          x: about.centre.x,
          y: about.centre.y,
          deltaX: 0,
          deltaY: (round + step) % 12 < 6 ? 90 : -90,
        })),
      )
    },
    WHEEL_ROUNDS,
  )
  await collect('PG-10 dense dependencies')

  // --- PG-12: crowded labels ----------------------------------------------
  //
  // ⭐ Back in to the magnification where a label is drawn beside every bar,
  // then the same pan. The label count and their total character count are
  // reported with the number.
  await burst(
    cdp,
    Array.from({ length: 8 }, () => ({
      type: 'mouseWheel' as const,
      x: about.centre.x,
      y: about.centre.y,
      deltaX: 0,
      deltaY: -240,
      modifiers: 2,
    })),
  )
  await page.waitForTimeout(1200)
  const crowded = await page.evaluate((selector: string) => {
    const svg = document.querySelector(selector)
    const labels = svg === null ? [] : [...svg.querySelectorAll('text')]
    return {
      labels: labels.length,
      labelCharacters: labels.reduce((n, e) => n + (e.textContent ?? '').length, 0),
    }
  }, DRAWN_SVG)

  await driveSegment(
    page,
    'PG-12 crowded labels',
    async (round) => {
      await burst(
        cdp,
        Array.from({ length: PER_BURST }, (_unused, step) => ({
          type: 'mouseWheel' as const,
          x: about.centre.x,
          y: about.centre.y,
          deltaX: 0,
          deltaY: (round + step) % 12 < 6 ? 90 : -90,
        })),
      )
    },
    WHEEL_ROUNDS,
  )
  await collect('PG-12 crowded labels')

  // --- PG-14: MC-9's four steps -------------------------------------------
  //
  // ⚠️ THE QUANTITY HERE IS NOT A FRAME TIME, and the preamble of table T-043
  // does not reach it: `NFR-013` constrains how the COMPUTATION grows with
  // `n` -- レイアウトの算出・当たり判定・依存線の経路 -- so what is compared
  // across the four steps is the work done inside the redraw call. Comparing
  // frame INTERVALS across the steps would compare the display's cadence with
  // itself, which is 16.7ms at every scale and would report a growth of 1.0
  // however bad the algorithm was.
  const scale: ScaleStep[] = []
  for (const multiple of [...SCALE_STEPS].reverse()) {
    const want = Math.round((TARGET_TASKS / 8) * multiple)
    const trimmed = await page.evaluate((target: number) => {
      const api = (window as unknown as { grSchedulerAgentApi: {
        readDocument(): { schedule: { tasks: { uid: number; wbsParentUid: number | null }[] } }
        readStamp(): unknown
        applyCommands(request: unknown): { accepted: boolean; refusal?: unknown }
      } }).grSchedulerAgentApi
      const tasks = api.readDocument().schedule.tasks
      if (tasks.length <= target) return { tasks: tasks.length, accepted: true, note: 'already at or below' }
      // ⭐ LEAVES ONLY. A `Task` that something names as its WBS parent takes
      // its children with it, so the count would overshoot the step.
      const parents = new Set(tasks.map((t) => t.wbsParentUid).filter((u) => u !== null))
      const leaves = tasks.filter((t) => !parents.has(t.uid)).map((t) => t.uid)
      const victims = leaves.slice(0, tasks.length - target)
      const answer = api.applyCommands({
        readStamp: api.readStamp(),
        commands: victims.map((uid) => ({ kind: 'deleteTask', uid })),
      })
      return {
        tasks: api.readDocument().schedule.tasks.length,
        accepted: answer.accepted,
        note: answer.accepted ? '' : JSON.stringify(answer.refusal).slice(0, 160),
      }
    }, want)
    await page.waitForTimeout(900)

    const runs: number[] = []
    for (let run = 0; run < SCALE_RUNS; run += 1) {
      const name = `PG-14 x${String(multiple)} run ${String(run + 1)}`
      await driveSegment(
        page,
        name,
        async (round) => {
          await burst(
            cdp,
            Array.from({ length: PER_BURST }, (_unused, step) => ({
              type: 'mouseWheel' as const,
              x: about.centre.x,
              y: about.centre.y,
              deltaX: 0,
              deltaY: (round + step) % 12 < 6 ? 90 : -90,
            })),
          )
        },
        WHEEL_ROUNDS,
      )
      const one = await segmentOf(page, name)
      if (one !== null) runs.push(one.insideMedian)
    }
    const shape = await page.evaluate((selector: string) => {
      const svg = document.querySelector(selector)
      return {
        figures: svg === null ? 0 : svg.querySelectorAll('[data-figure]').length,
        characters: svg?.outerHTML.length ?? 0,
      }
    }, DRAWN_SVG)
    scale.push({
      multiple,
      tasks: trimmed.tasks,
      insideMedianMs: round(median(runs)),
      runs: runs.map((one) => round(one)),
      figures: shape.figures,
      characters: shape.characters,
    })
  }

  return {
    browserVersion: live.version(),
    renderer: about.renderer,
    tasks: document0.tasks,
    dependencies: document0.dependencies,
    tasksWithDependencies: document0.withDependencies,
    longestLabel: document0.longestLabel,
    meanLabel: document0.meanLabel,
    firstPaintMs: round(startup.firstContentfulPaint),
    firstContentMs: round(startup.firstContentAt),
    startupStates: startup.states,
    zeroSizedStates: startup.zeroSized,
    emptyStatesAfterFirstContent: startup.emptyAfterFirstContent,
    idleFrames: framesAfter - framesBefore,
    idleSeconds,
    figuresDrawn: about.figures,
    svgElements: about.elements,
    svgCharacters: about.characters,
    shippedBytes: statSync(SHIPPED_BUILD).size,
    segments,
    barGrabbed: bar?.key ?? '',
    barren,
    scale: [...scale].reverse(),
    importAvailable: document0.importAvailable,
    importAnswer: document0.importAnswer,
    dependenciesDrawn: dense.dependencies,
    labelsDrawn: crowded.labels,
    labelCharacters: crowded.labelCharacters,
  }
}

// ---------------------------------------------------------------------------
// What was measured -- printed, so that a later reader can refute it
// ---------------------------------------------------------------------------

test('T-025 -- the numbers are recorded together with the browser and the machine', () => {
  const m = taken()
  // `MC-5` (MUST): 基準ブラウザの版を、測った値と対にして記録すること。
  // `MC-4`: 内蔵 GPU（Intel UHD Graphics）.
  console.log(
    [
      `browser: ${m.browserVersion}`,
      `renderer (MC-4): ${m.renderer}`,
      `screen (MC-6): ${String(BASE_SCREEN.width)} x ${String(BASE_SCREEN.height)}`,
      `document (MC-7): ${String(m.tasks)} Task, ${String(m.dependencies)} dependencies on ` +
        `${String(m.tasksWithDependencies)} Task, longest label ${String(m.longestLabel)} ` +
        `characters, mean ${String(m.meanLabel)}`,
    ].join('\n'),
  )
  expect(m.browserVersion).not.toBe('')
  // ⛔ NOT A GATE, A RECORD. `MC-4` names the integrated part as the base, and
  // a run on anything else has to be visible rather than silent.
  if (!/Intel/i.test(m.renderer)) {
    console.log(
      `⚠️ MC-4 asks for the integrated GPU (Intel UHD Graphics) and this run drew with ` +
        `${m.renderer}; the numbers below are not base values.`,
    )
  }
})

test('PG-1 / PG-4 -- the way up, and every state the canvas was seen in', () => {
  const m = taken()
  console.log(
    [
      `PG-1 first contentful paint: ${String(m.firstPaintMs)} ms ` +
        `(ceiling ${String(FIRST_PAINT_CEILING_MS)} ms, NFR-001)`,
      `PG-1 drawing written into the page at: ${String(m.firstContentMs)} ms ` +
        '(recorded for contrast -- NFR-001 counts the moment it is ON SCREEN)',
      `PG-4 canvas states seen on the way up: ${String(m.startupStates.length)}`,
      `PG-4 states with a 0-sized canvas: ${String(m.zeroSizedStates)}`,
      `PG-4 empty states after the first with content: ${String(m.emptyStatesAfterFirstContent)}`,
      `PG-4 states: ${JSON.stringify(m.startupStates)}`,
    ].join('\n'),
  )
  expect(m.firstPaintMs).toBeGreaterThan(0)
})

test('PG-5 -- how many frames arrived while nothing was done', () => {
  const m = taken()
  console.log(
    `PG-5 frames over ${String(m.idleSeconds)} untouched seconds: ${String(m.idleFrames)} ` +
      '(NFR-010: 利用者が操作していない間、画面を描き直さないこと)',
  )
  expect(m.idleSeconds).toBe(4)
})

test('PG-6 / PG-7 -- the two rows table T-043 marks 記録のみ', () => {
  const m = taken()
  console.log(
    [
      `PG-6 figures drawn: ${String(m.figuresDrawn)} of ${String(m.svgElements)} elements, ` +
        `${String(m.svgCharacters)} characters of SVG`,
      `PG-7 shipped .html: ${String(m.shippedBytes)} bytes`,
    ].join('\n'),
  )
  // ⛔ NEITHER IS A GATE. Table T-043 marks both 記録のみ, and `PG-7`'s own
  // cell says 上限は定めない。増え方を見る. A judgement here would invent a
  // ceiling the specification refuses to state.
  expect(m.svgElements).toBeGreaterThan(0)
  expect(m.shippedBytes).toBeGreaterThan(0)
})

test('PG-8 / PG-9 / PG-10 / PG-12 -- the interval, and the time inside the call', () => {
  const m = taken()
  console.log(`grabbed for PG-8: ${m.barGrabbed === '' ? '(no bar found)' : m.barGrabbed}`)
  console.log(
    `PG-10 dependency routes drawn while it was driven: ${String(m.dependenciesDrawn)}`,
  )
  console.log(
    `PG-12 labels drawn while it was driven: ${String(m.labelsDrawn)}, ` +
      `${String(m.labelCharacters)} characters in total`,
  )
  for (const one of m.segments) {
    console.log(
      `${one.name}: ${String(one.frames)} frames, ${String(one.frameRate)} fps, ` +
        `interval mean ${String(one.intervalMean)} ms / p95 ${String(one.intervalP95)} ms / ` +
        `worst ${String(one.intervalWorst)} ms, inside the call median ` +
        `${String(one.insideMedian)} ms / p95 ${String(one.insideP95)} ms, ` +
        `${String(one.inputs)} input events every ${String(one.inputMean)} ms` +
        (one.inputBound
          ? one.pointerDriven
            ? ` (${INPUT_BOUND}, but pointer moves are coalesced to one per frame, so this ` +
              'says nothing either way)'
            : ` ⛔ ${INPUT_BOUND}`
          : '') +
        `, ${String(one.redraws)} redraws` +
        (one.redrawing ? '' : ' ⛔ nothing was redrawn: outside MC-8, not a gate value'),
    )
  }
  for (const name of m.barren) {
    console.log(`${name}: too few frames to say anything about -- reported, not passed`)
  }
  // ⚠️ `PG-11` has no number and the reason is stated rather than left blank.
  console.log(
    'PG-11 (rebuilding the overlaid layer): NOT PRESSED. Table T-043 starts it at M4, and ' +
      'this build draws no separate overlaid layer -- the whole picture is one string ' +
      '(IF-1 of table T-065) -- so there is nothing for the row to time.',
  )
  expect(m.segments.length + m.barren.length).toBeGreaterThan(0)
})

test('PG-14 -- the four steps of MC-9, and what O(n log n) allows between them', () => {
  const m = taken()
  console.log(
    `AM-8 (importDocument) answered "${m.importAnswer}", so MC-9's four steps were reached by ` +
      'deleting down from the target scale rather than by putting a larger document in',
  )
  for (const step of m.scale) {
    console.log(
      `PG-14 x${String(step.multiple)}: ${String(step.tasks)} Task -> inside the call ` +
        `median ${String(step.insideMedianMs)} ms over ${String(step.runs.length)} runs ` +
        `${JSON.stringify(step.runs)}, ${String(step.figures)} figures, ` +
        `${String(step.characters)} characters`,
    )
  }
  const smallest = m.scale.find((one) => one.multiple === 1)
  const largest = m.scale.find((one) => one.multiple === 8)
  if (smallest !== undefined && largest !== undefined && smallest.insideMedianMs > 0) {
    const grew = largest.insideMedianMs / smallest.insideMedianMs
    const ceiling = growthCeiling(smallest.tasks)
    console.log(
      `PG-14 growth from ${String(smallest.tasks)} to ${String(largest.tasks)} Task: ` +
        `${String(round(grew))}x, and O(n log n) allows at most ` +
        `${String(round(ceiling))}x (= 8 * log(8n)/log(n) at n=${String(smallest.tasks)})`,
    )
  }
  expect(m.scale.length).toBe(SCALE_STEPS.length)
})

// ---------------------------------------------------------------------------
// The gates
// ---------------------------------------------------------------------------
//
// ⛔ THE ONE CASE THAT CAN GO RED IS THE LAST IN THE FILE. A failure followed
// by another case has been measured in this project to leave the run
// unfinished, and every number above has to be printed before anything fails.

test('PG-1 / PG-4 / PG-5 / PG-8 / PG-9 / PG-10 / PG-12 / PG-14 -- the gates of table T-043', () => {
  const m = taken()
  const broken: string[] = []

  // --- PG-1 / NFR-001 ------------------------------------------------------
  // 表 T-025 の条件で目標規模の文書を開いたとき、`GRS` は、初期描画を 1500 ミリ
  // 秒以内に完了すること。
  if (!(m.firstPaintMs <= FIRST_PAINT_CEILING_MS)) {
    broken.push(
      `PG-1: the first un-missing drawing was on screen at ${String(m.firstPaintMs)} ms, ` +
        `past the ${String(FIRST_PAINT_CEILING_MS)} ms of NFR-001`,
    )
  }

  // --- PG-4 / NFR-011 ------------------------------------------------------
  // 起動して最初に表示するとき、`GRS` は、空白のまま残る画面も、内容が欠けたま
  // ま出る画面も出さないこと（MUST NOT）。
  // ⭐ The two events NFR-011's RATIONALE names: 寸法が確定する前の 1 フレーム
  // で 0×0 の窓が出ること and 全体を収める位置が決まる前の初期表示が出ること.
  if (m.zeroSizedStates > 0) {
    broken.push(
      `PG-4: the canvas was seen at a zero size ${String(m.zeroSizedStates)} times on the way ` +
        'up, which is the 0 x 0 window NFR-011 names',
    )
  }
  if (m.emptyStatesAfterFirstContent > 0) {
    broken.push(
      `PG-4: the canvas was seen empty ${String(m.emptyStatesAfterFirstContent)} times AFTER it ` +
        'had already been drawn with content, which is a missing screen (NFR-011)',
    )
  }

  // --- PG-5 / NFR-010 ------------------------------------------------------
  // 利用者が操作していない間、`GRS` は、画面を描き直さないこと。
  if (m.idleFrames > 0) {
    broken.push(
      `PG-5: ${String(m.idleFrames)} frames were drawn over ${String(m.idleSeconds)} seconds in ` +
        'which nothing was done, and NFR-010 allows none',
    )
  }

  // --- PG-8 / PG-9 / PG-10 / PG-12 -- NFR-002 and NFR-003 ------------------
  //
  // ⛔⛔ JUDGED ON THE INTERVAL AND ON NOTHING ELSE, which the preamble of
  // table T-043 makes a MUST: 「フレーム時間」とは、届いたフレームとフレームの
  // 間隔である（MUST）。描き直しの呼び出しの中で過ごす時間を、フレーム時間とし
  // て測ってはならない（MUST NOT）.
  for (const one of m.segments) {
    if (one.name.startsWith('PG-14')) continue
    // ⛔⛔ A STRETCH THAT REDREW NOTHING IS NOT ONE `MC-8` MEASURES OVER, and
    // judging it would fail a build for obeying `NFR-010`. `MC-8`, verbatim:
    // 何も変わらないポインタの移動は含めない —— 描き直しが起きないので測る母数
    // が無い（`NFR-010`）. ⭐ Whether it redrew was measured by comparing the
    // picture either side of the stretch, never inferred from the timings this
    // very judgement is about. The numbers are printed above regardless.
    if (!one.redrawing) continue
    if (one.frameRate < FRAME_RATE_FLOOR) {
      broken.push(
        `NFR-002 ${one.name}: ${String(one.frameRate)} frames per second, below the ` +
          `${String(FRAME_RATE_FLOOR)} of NFR-002` +
          (one.inputBound && !one.pointerDriven ? ` (⛔ ${INPUT_BOUND})` : ''),
      )
    }
    if (one.intervalP95 > FRAME_TIME_P95_CEILING_MS) {
      broken.push(
        `NFR-003 ${one.name}: the 95th percentile of the interval between delivered frames is ` +
          `${String(one.intervalP95)} ms, past the ${String(FRAME_TIME_P95_CEILING_MS)} ms of ` +
          `NFR-003 (inside the call it was ${String(one.insideP95)} ms, which is NOT a frame ` +
          'time)' +
          (one.inputBound && !one.pointerDriven ? ` (⛔ ${INPUT_BOUND})` : ''),
      )
    }
  }

  // --- PG-14 / NFR-013 -----------------------------------------------------
  // `GRS` は、タスク数 `n` に対して、レイアウトの算出・当たり判定・依存線の経路
  // の計算量を `O(n log n)` 以下とすること。
  const smallest = m.scale.find((one) => one.multiple === 1)
  const largest = m.scale.find((one) => one.multiple === 8)
  if (smallest !== undefined && largest !== undefined && smallest.insideMedianMs > 0) {
    const grew = largest.insideMedianMs / smallest.insideMedianMs
    const ceiling = growthCeiling(smallest.tasks)
    if (grew > ceiling) {
      broken.push(
        `PG-14 / NFR-013: going from ${String(smallest.tasks)} to ${String(largest.tasks)} ` +
          `Task grew the work inside the redraw call by ${String(round(grew))}x, past the ` +
          `${String(round(ceiling))}x that O(n log n) allows`,
      )
    }
  }

  expect(broken, `\n${broken.join('\n')}\n`).toEqual([])
})
