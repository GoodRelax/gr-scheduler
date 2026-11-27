// NFR tests: the pass marks of table T-043 other than the frame time of a scroll, a zoom, a pan and a range select.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser, screenOf } from '../system/live-app'
import { rowOf } from '../system/sws-case'

const T025: SpecTable = specTable('T-025')

// Why: a driven browser is given a viewport of MC-6's size, since full screen cannot be reproduced.
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// Spec: NFR-001, NFR-011
// Why: the paint is timed, not the write into the page, because NFR-001 counts the first complete
// picture on the screen.
const FIRST_PAINT_CEILING_MS = 1500

// Spec: NFR-002
const FRAME_RATE_FLOOR = 60

// Spec: NFR-003
const FRAME_TIME_P95_CEILING_MS = 16.7

// Spec: MC-7
// Why: read off the row rather than typed, so a change to the target scale moves this file with it.
const TARGET_TASKS = ((): number => {
  const mc7 = rowOf(T025, 'MC-7')
  const cell = mc7.cells[mc7.cells.length - ('traces' in mc7.by ? 2 : 1)] ?? ''
  const found = /(\d+)\s*`?Task/.exec(cell)
  const n = Number(found?.[1] ?? '')
  if (!Number.isInteger(n)) throw new Error('table T-025 row MC-7 states no Task count this file can read')
  return n
})()

// Spec: MC-9
// Why: the four steps are reached by deleting down from MC-7's 1000 tasks, because AM-8 cannot import
// a larger document in this build; the ratios stay 1, 2, 4 and 8.
const SCALE_STEPS = [1, 2, 4, 8] as const
const SCALE_RUNS = 3

// Spec: NFR-013
// Why: the ceiling is computed from n, never typed, since a typed number hides which n it came from.
/** @purity pure */
function growthCeiling(smallestN: number): number {
  return 8 * (Math.log(8 * smallestN) / Math.log(smallestN))
}

// Summary: percentile() takes the nearest-rank value.
/** @purity pure */
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

// Why: frame numbers are judged on the interval and the inside-call time is only recorded; PG-14 uses
// the inside-call time, because NFR-013 limits how the computation grows.
// Why: addInitScript runs before the page's scripts, and document is observed before its root exists,
// so the first drawing is caught for PG-1 and PG-4.
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

// Why: a driven browser's input is not a hand's; when frames are no denser than the input, the harness
// is the limit, so such a stretch is marked input-bound and still listed.
const INPUT_BOUND = 'input-bound'

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
  // Why: MC-8 measures only while input causes redraws (NFR-010), so a stretch that redrew nothing is
  // printed but not judged, else a build would fail for obeying NFR-010.
  readonly redrawing: boolean
  readonly redraws: number
  // Why: the browser coalesces pointer moves to about one per frame, so for a pointer stretch
  // inputBound says nothing; wheel notches all arrive. A breach is listed either way.
  readonly pointerDriven: boolean
}

interface ScaleStep {
  readonly multiple: number
  readonly tasks: number
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
  readonly firstPaintMs: number
  readonly firstContentMs: number
  readonly startupStates: readonly (readonly number[])[]
  readonly zeroSizedStates: number
  readonly emptyStatesAfterFirstContent: number
  readonly idleFrames: number
  readonly idleSeconds: number
  readonly figuresDrawn: number
  readonly svgElements: number
  readonly svgCharacters: number
  readonly shippedBytes: number
  readonly segments: readonly Segment[]
  readonly barGrabbed: string
  readonly barren: readonly string[]
  readonly scale: readonly ScaleStep[]
  readonly importAvailable: boolean
  readonly importAnswer: string
  readonly dependenciesDrawn: number
  readonly labelsDrawn: number
  readonly labelCharacters: number
}

// Why: the deliverable, not the sources or the dev server: NFR-004 (CN-1) makes dist/ hold one .html.
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

// Spec: FR-065
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
  // Why: this is the hook's own time allowance, not an assertion's.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-mutable */
function taken(): Measured {
  if (sweepFailed !== null) throw sweepFailed
  if (measured === null) throw new Error('the sweep brought nothing back')
  return measured
}

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

// Why: not page.mouse: one awaited round trip per event measured the harness, not the app, so a whole
// burst goes on the wire at once.
/** @purity non-pure */
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

// Why: the browser coalesces one burst of moves into a few events, so a gesture goes as many rounds;
// wheel notches are not coalesced and need far fewer rounds.
const PER_BURST = 24
const WHEEL_ROUNDS = 26
const DRAG_ROUNDS = 150

// Trap: a wait between the marks puts one huge gap into the intervals and lands in the p95; settle
// after the end mark.
/** @purity non-pure */
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

/** @purity non-pure */
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

// Why: the browser hands one stamp to every callback of a frame, so samples are grouped by stamp into
// one interval and one summed inside-time per frame.
/** @purity non-pure */
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
    inputBound: Number.isFinite(inputMean) && meanInterval <= inputMean * 1.15,
    // Why: redraws are counted by the observer, not inferred from the intervals the gate judges, nor from
    // the end pictures, which match when a gesture returns to where it started.
    redrawing: cut.redraws > 0,
    redraws: cut.redraws,
    pointerDriven: false,
  }
}


/** @purity non-pure */
async function sweep(live: Browser, context: BrowserContext, page: Page): Promise<Measured> {
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
      zeroSized: states.filter((one) => one[1] === 0 || one[2] === 0).length,
      emptyAfterFirstContent:
        firstWithContent < 0
          ? -1
          : states.slice(firstWithContent).filter((one) => (one[3] ?? 0) === 0).length,
    }
  })

  // Why: the size reading is switched off once PG-1 and PG-4 have their states, so from here the
  // observer only stamps a redraw, which forces no layout.
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
      center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      area: { x: box.x, y: box.y, width: box.width, height: box.height },
    }
  }, DRAWN_SVG)

  // Spec: NFR-010
  const idleSeconds = 4
  const framesBefore = await page.evaluate(
    () => (window as unknown as { __grsProbe: { samples: unknown[] } }).__grsProbe.samples.length,
  )
  await page.waitForTimeout(idleSeconds * 1000)
  const framesAfter = await page.evaluate(
    () => (window as unknown as { __grsProbe: { samples: unknown[] } }).__grsProbe.samples.length,
  )

  await pressEntrance(page, AGENT_API_ENTRANCE)
  const document0 = await page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi?: Record<string, never> })
      .grSchedulerAgentApi as unknown as
      | {
          readDocument(): {
            schedule: {
              tasks: {
                uid: number
                parentTaskUid: number | null
                name: string
                dependencies?: unknown[]
              }[]
            }
          }
          importDocument(source: unknown): { ok: boolean; refusal?: { reason?: string } }
        }
      | undefined
    if (api === undefined) return null
    const tasks = api.readDocument().schedule.tasks
    const lengths = tasks.map((t) => String(t.name ?? '').length)
    const answer = api.importDocument({ text: '{}' })
    const parents = new Set(tasks.map((t) => t.parentTaskUid).filter((u) => u !== null))
    return {
      // Why: a Task nothing names as its parent moves alone when dragged.
      leafUids: tasks.filter((t) => !parents.has(t.uid)).map((t) => t.uid),
      tasks: tasks.length,
      dependencies: tasks.reduce((n, t) => n + (t.dependencies?.length ?? 0), 0),
      withDependencies: tasks.filter((t) => (t.dependencies?.length ?? 0) > 0).length,
      longestLabel: lengths.length === 0 ? 0 : Math.max(...lengths),
      meanLabel:
        lengths.length === 0 ? 0 : Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
      importAvailable: answer.ok,
      importAnswer: String(answer.refusal?.reason ?? (answer.ok ? 'accepted' : 'refused')),
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

  // Why: a leaf bar is grabbed for MK-8, found by its data-figure mark, which is not the spec's; the summary
  // bar grabbed nothing and measured an empty gesture, so the redraw count is reported beside it.
  const bar = await page.evaluate(
    ([selector, leaves]: [string, number[]]) => {
      const svg = document.querySelector(selector)
      if (svg === null) return null
      const leaf = new Set(leaves)
      const area = svg.getBoundingClientRect()
      // Why: one key names a contiguous run of elements, so the run is folded into one rectangle before the
      // filters; otherwise the first piece of a bar would be judged alone.
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
    // Why: the grab is taken before the marks and released after them, so only the moving is measured.
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

  // Why: MC-8 excludes moves that change nothing, so a plain sweep that delivers no frames is reported
  // as barren rather than as a pass.
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
            x: about.center.x + Math.sin(phase) * (about.area.width / 5),
            y: about.center.y + Math.cos(phase / 2) * (about.area.height / 5),
            button: 'none' as const,
            buttons: 0,
          }
        }),
      )
    },
    DRAG_ROUNDS,
  )
  await collect('PG-9 hover', true)

  // Why: density comes from zooming out the MC-7 document; the zoom is stepped and the routes counted,
  // because FR-018 thins the drawing and one large step drew no route at all.
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
        x: about.center.x,
        y: about.center.y,
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
  await burst(
    cdp,
    Array.from({ length: 14 - densestStep }, () => ({
      type: 'mouseWheel' as const,
      x: about.center.x,
      y: about.center.y,
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
          x: about.center.x,
          y: about.center.y,
          deltaX: 0,
          deltaY: (round + step) % 12 < 6 ? 90 : -90,
        })),
      )
    },
    WHEEL_ROUNDS,
  )
  await collect('PG-10 dense dependencies')

  await burst(
    cdp,
    Array.from({ length: 8 }, () => ({
      type: 'mouseWheel' as const,
      x: about.center.x,
      y: about.center.y,
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
          x: about.center.x,
          y: about.center.y,
          deltaX: 0,
          deltaY: (round + step) % 12 < 6 ? 90 : -90,
        })),
      )
    },
    WHEEL_ROUNDS,
  )
  await collect('PG-12 crowded labels')

  // Why: PG-14 compares the work inside the redraw call, not intervals, which are 16.7ms at every scale
  // and would report a growth of 1.0 however bad the algorithm.
  const scale: ScaleStep[] = []
  for (const multiple of [...SCALE_STEPS].reverse()) {
    const want = Math.round((TARGET_TASKS / 8) * multiple)
    const trimmed = await page.evaluate((target: number) => {
      const api = (window as unknown as { grSchedulerAgentApi: {
        readDocument(): { schedule: { tasks: { uid: number; parentTaskUid: number | null }[] } }
        readStamp(): unknown
        applyCommands(request: unknown): { ok: boolean; refusal?: unknown }
      } }).grSchedulerAgentApi
      const tasks = api.readDocument().schedule.tasks
      if (tasks.length <= target) return { tasks: tasks.length, accepted: true, note: 'already at or below' }
      // Why: only leaves are deleted, because a parent takes its children with it and overshoots the step.
      const parents = new Set(tasks.map((t) => t.parentTaskUid).filter((u) => u !== null))
      const leaves = tasks.filter((t) => !parents.has(t.uid)).map((t) => t.uid)
      const victims = leaves.slice(0, tasks.length - target)
      const answer = api.applyCommands({
        expectedStamp: api.readStamp(),
        commands: victims.map((uid) => ({ kind: 'deleteTask', taskUid: uid })),
      })
      return {
        tasks: api.readDocument().schedule.tasks.length,
        accepted: answer.ok,
        note: answer.ok ? '' : JSON.stringify(answer.refusal).slice(0, 160),
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
              x: about.center.x,
              y: about.center.y,
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

// Spec: T-025, MC-4, MC-5
// Why: every case prints its raw measurement, since a green test that prints nothing cannot be
// refuted later.
test('T-025 -- the numbers are recorded together with the browser and the machine', () => {
  const m = taken()
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
  // Why: a record, not a gate: a run on anything but MC-4's integrated GPU must be visible.
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
  // Why: neither is a gate, since T-043 marks both record-only; a judgment would invent a ceiling.
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
  // Why: PG-11 of table T-043 is not pressed: it starts at M4, and this build draws no overlaid layer.
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

// Spec: NFR-001, NFR-002, NFR-003, NFR-010, NFR-011, NFR-013, T-043
// Why: the one case that can go red is last, since a failure followed by another case leaves the
// run unfinished, and every number must print first.
// Trap: lowering a pass mark here to make a run green hides a real breach, and no check stops it.
test('PG-1 / PG-4 / PG-5 / PG-8 / PG-9 / PG-10 / PG-12 / PG-14 -- the gates of table T-043', () => {
  const m = taken()
  const broken: string[] = []

  if (!(m.firstPaintMs <= FIRST_PAINT_CEILING_MS)) {
    broken.push(
      `PG-1: the first un-missing drawing was on screen at ${String(m.firstPaintMs)} ms, ` +
        `past the ${String(FIRST_PAINT_CEILING_MS)} ms of NFR-001`,
    )
  }

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

  if (m.idleFrames > 0) {
    broken.push(
      `PG-5: ${String(m.idleFrames)} frames were drawn over ${String(m.idleSeconds)} seconds in ` +
        'which nothing was done, and NFR-010 allows none',
    )
  }

  for (const one of m.segments) {
    if (one.name.startsWith('PG-14')) continue
    // Why: a stretch that redrew nothing is not one MC-8 measures over; judging it would fail a build
    // for obeying NFR-010.
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
