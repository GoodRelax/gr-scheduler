// NFR tests: frame time is the interval between delivered frames, judged by NFR-002 and NFR-003.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import {
  CLEARING_UP_MS,
  DRAWN_SVG,
  launchReferenceBrowser,
  readSettledDrawnSvg,
  screenOf,
} from '../system/live-app'
import { rowOf } from '../system/sws-case'

const T024: SpecTable = specTable('T-024')
const T025: SpecTable = specTable('T-025')
const T034: SpecTable = specTable('T-034')
const T103: SpecTable = specTable('T-103')
const T107: SpecTable = specTable('T-107')
const T204: SpecTable = specTable('T-204')
const T226: SpecTable = specTable('T-226')
const T233: SpecTable = specTable('T-233')

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

const AM_1 = bare(rowOf(T107, 'AM-1').cells[1] ?? '')
const AM_3 = bare(rowOf(T107, 'AM-3').cells[1] ?? '')
const AM_8 = bare(rowOf(T107, 'AM-8').cells[1] ?? '')
const AM_11 = bare(rowOf(T107, 'AM-11').cells[1] ?? '')
const AM_12 = bare(rowOf(T107, 'AM-12').cells[1] ?? '')
const AM_13 = bare(rowOf(T107, 'AM-13').cells[1] ?? '')
const AM_14 = bare(rowOf(T107, 'AM-14').cells[1] ?? '')
const AM_15 = bare(rowOf(T107, 'AM-15').cells[1] ?? '')

const EXPORT_CHOOSER = bare(rowOf(T103, 'U-54').cells[0] ?? '')
const NOTIFICATION_AREA = bare(rowOf(T103, 'U-57').cells[0] ?? '')

const AGENT_API_ENTRANCE = 'IC-20'

const EXPORT_ENTRANCE = /IC-\d+[a-z]?/.exec(rowOf(T103, 'U-54').cells[0] ?? '')?.[0] ?? 'IC-2'

// Spec: NFR-002
const FRAME_RATE_FLOOR = 60

// Spec: NFR-003
const FRAME_TIME_P95_CEILING_MS = 16.7

const EXPORT_CANVAS = sizeOf(rowOf(T204, 'S-81'))

const EXPORT_HEIGHT_CAP = numberIn(rowOf(T204, 'S-217').by['既定値'] ?? '')

const TEMPLATE_TASKS = numberIn(rowOf(T226, 'TP-6').cells[1] ?? '')

const TARGET_SCALE = rowOf(T025, 'MC-7').cells[1] ?? ''

// Why: taken through rowOf rather than typed, so the file fails to load when table
// T-233 loses either row.
const REASON_NOT_YET = rowOf(T233, 'RS-40').id
const REASON_FALLBACK = rowOf(T233, 'RS-27').id

/** @purity semi-pure-mutable */
function reasonWords(specTableRowId: string): readonly string[] {
  const shape = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons?: { specTableRowId?: string; text?: Record<string, string> }[] }
  const found = (shape.reasons ?? []).find((one) => one.specTableRowId === specTableRowId)
  return Object.values(found?.text ?? {}).filter((one) => one.length > 0)
}

/** @purity pure */
function sizeOf(row: SpecRow): { width: number; height: number } {
  const stated = row.by['既定値'] ?? row.cells[row.cells.length - 2] ?? ''
  const found = /(\d+)\s*[x×]\s*(\d+)/.exec(stated)
  const width = Number(found?.[1] ?? '')
  const height = Number(found?.[2] ?? '')
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error(`table T-204 row ${row.id} states no size this file can read: ${stated}`)
  }
  return { width, height }
}

/** @purity pure */
function numberIn(cell: string): number {
  return Number(/-?\d+(?:\.\d+)?/.exec(cell.replace(/,/g, ''))?.[0] ?? Number.NaN)
}

// Why: installed by addInitScript, before the page's own scripts, so a bare
// requestAnimationFrame in the application resolves to this wrapper.
const FRAME_PROBE = `(() => {
  const state = { samples: [], marks: [], inputs: [] };
  const raw = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (callback) {
    return raw(function (stamp) {
      const enter = performance.now();
      try {
        callback(stamp);
      } finally {
        state.samples.push([stamp, enter, performance.now()]);
      }
    });
  };
  // ⛔ THE GUARD AGAINST MEASURING THE HARNESS. See INPUT_BOUND below.
  var note = function () { state.inputs.push(performance.now()); };
  window.addEventListener('pointermove', note, { capture: true, passive: true });
  window.addEventListener('wheel', note, { capture: true, passive: true });
  state.mark = function (name, edge) { state.marks.push([name, edge, performance.now()]); };
  Object.defineProperty(window, '__grsFrameProbe', { value: state });
})();`

// Why: NFR-010 pushes a build to one frame per input event, and a driven browser's input
// comes at the harness's rate, so a stretch no denser than its input is named input-bound.
const INPUT_BOUND = 'input-bound'

interface Frame {
  readonly stamp: number
  readonly enter: number
  readonly inside: number
}

interface Segment {
  readonly name: string
  readonly frames: number
  readonly frameRate: number
  readonly intervalP95: number
  readonly intervalMean: number
  readonly intervalWorst: number
  readonly insideP95: number
  readonly insideMean: number
  readonly inputs: number
  readonly inputMean: number
  readonly inputBound: boolean
}

/** @purity pure */
function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil(fraction * sorted.length))
  return sorted[rank - 1] ?? Number.NaN
}

/** @purity pure */
function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN
  return values.reduce((sum, one) => sum + one, 0) / values.length
}

/** @purity pure */
function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

interface MemberAnswer {
  readonly member: string
  readonly kind: string
  readonly answer: string
  readonly notAvailable: boolean
}

interface PngAttempt {
  readonly shape: string
  readonly width: number
  readonly height: number
  readonly answer: string
}

interface Measured {
  readonly browserVersion: string
  readonly userAgent: string
  readonly renderer: string
  readonly hardwareConcurrency: number
  readonly agentApiVersion: string
  readonly tasks: number
  readonly segments: readonly Segment[]
  readonly barren: readonly string[]
  readonly members: readonly MemberAnswer[]
  readonly png: readonly PngAttempt[]
  readonly embeddedHtmlLength: number
  readonly embeddedReopened: boolean
  readonly embeddedTasks: number
  readonly embeddedNote: string
  readonly comparatorIgnoresBytes: boolean
  readonly mspdiImported: boolean
  readonly mspdiImportAnswers: readonly string[]
  readonly mspdiRoundTripEqual: boolean
  readonly mspdiFirstDifference: string
  readonly chooserStood: boolean
  readonly chooserText: string
  readonly unwritable: readonly string[]
  readonly pressedFormat: string
  readonly chooserStoodAfterPress: boolean
  readonly noticeText: string
}

// Why: PG-2 and PG-3 gate the thing handed over, and NFR-004 row CN-1 makes that one
// .html, so the shipped build is pressed rather than the sources or the dev server.
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

const MSPDI_SAMPLE = join(process.cwd(), 'sample-schedule', 'sample-small-website-renewal.en.xml')

let browser: Browser | null = null
let scratch: string | null = null
let measured: Measured | null = null
let sweepFailed: Error | null = null

test.beforeAll(async () => {
  test.setTimeout(600_000)
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npx vite build` first ' +
        '(dist/index.html)',
    )
  }
  scratch = mkdtempSync(join(tmpdir(), 'grs-nfr-'))
  browser = await launchReferenceBrowser()
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  try {
    await page.addInitScript(FRAME_PROBE)
    await page.goto(pathToFileURL(SHIPPED_BUILD).href)
    await readSettledDrawnSvg(page)
    measured = await sweep(browser, context, page)
  } catch (thrown) {
    sweepFailed = thrown instanceof Error ? thrown : new Error(String(thrown))
  } finally {
    await context.close()
  }
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  if (scratch !== null) rmSync(scratch, { recursive: true, force: true })
  await browser?.close()
})

/** @purity semi-pure-mutable */
function taken(): Measured {
  if (sweepFailed !== null) throw sweepFailed
  if (measured === null) throw new Error('the sweep brought nothing back')
  return measured
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

/** @purity non-pure */
async function markSegment(page: Page, name: string, edge: 'start' | 'end'): Promise<void> {
  await page.evaluate(
    ([which, side]: [string, string]) => {
      const probe = (window as unknown as { __grsFrameProbe?: { mark(a: string, b: string): void } })
        .__grsFrameProbe
      probe?.mark(which, side)
    },
    [name, edge] as [string, string],
  )
}

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

type Cdp = import('@playwright/test').CDPSession

// Why: page.mouse awaits a round trip per event, which paced the frames to the harness;
// a whole burst on the wire first leaves the application as the only limit.
async function burst(cdp: Cdp, events: readonly PointerEventArgs[]): Promise<void> {
  await Promise.all(events.map((one) => cdp.send('Input.dispatchMouseEvent', { ...one })))
}

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
  // Why: what the stretch set going settles first, so its frames do not count in the next.
  await page.waitForTimeout(500)
}

// Spec: MK-6, PTD-5
// Why: a fixed point can land on the Command Palette, and MK-6 then times a palette press.
const BARE_SPOT_STEP_PX = 12
const BARE_SPOT_CLEARANCE_PX = 8

// Why: a task group's own ground on every side, read just before the press, wherever the palette stands.
/** @purity semi-pure-mutable */
async function bareCanvasPoint(
  page: Page,
  near: { readonly x: number; readonly y: number },
): Promise<{ readonly x: number; readonly y: number } | null> {
  return page.evaluate(
    ([selector, at, step, clearance]: [string, { x: number; y: number }, number, number]) => {
      const drawing = document.querySelector(selector)
      if (drawing === null) return null
      const box = drawing.getBoundingClientRect()
      const palette = document.querySelector('[data-role="Command Palette"]')?.getBoundingClientRect() ?? null
      const isGround = (x: number, y: number): boolean => {
        if (palette !== null && x >= palette.left && x <= palette.right && y >= palette.top && y <= palette.bottom) {
          return false
        }
        const hit = document.elementFromPoint(x, y)
        if (hit === null || !drawing.contains(hit) || hit === drawing) return false
        if (hit.closest('[data-role]')?.getAttribute('data-role') !== 'Schedule Canvas') return false
        const name = hit.closest('[data-figure]')?.getAttribute('data-figure') ?? ''
        return name.startsWith('task-group-') || name === 'non-working-days'
      }
      const around = [[0, 0], [clearance, 0], [-clearance, 0], [0, clearance], [0, -clearance]]
      const spots: { x: number; y: number; far: number }[] = []
      for (let y = box.top + clearance; y <= box.bottom - clearance; y += step) {
        for (let x = box.left + clearance; x <= box.right - clearance; x += step) {
          spots.push({ x, y, far: Math.hypot(x - at.x, y - at.y) })
        }
      }
      spots.sort((a, b) => a.far - b.far)
      const found = spots.find((one) => around.every(([dx, dy]) => isGround(one.x + (dx ?? 0), one.y + (dy ?? 0))))
      return found === undefined ? null : { x: found.x, y: found.y }
    },
    [DRAWN_SVG, near, BARE_SPOT_STEP_PX, BARE_SPOT_CLEARANCE_PX] as [string, { x: number; y: number }, number, number],
  )
}

const SEARCH_PANEL = `[data-role="${bare(rowOf(T103, 'U-64').cells[0] ?? '')}"]`
const OPEN_SEARCH = chordOf(rowOf(specTable('T-036'), 'SK-24'))
const BORDER_STRETCH = 'GR-28 column border'
const BORDER_FRAMES = 241
const BORDER_ROUNDS_CAP = 600
const BORDER_CHECK_EVERY = 10
const BORDER_SWING_PX = 40

// Spec: SK-24
/** @purity pure */
function chordOf(row: SpecRow): string {
  return (row.cells[1] ?? '')
    .replace(/`|\*/g, '')
    .trim()
    .split(/\s*＋\s*/)
    .map((part) => (part === 'Ctrl' ? 'Control' : part.length === 1 ? part.toLowerCase() : part))
    .join('+')
}

/** @purity semi-pure-mutable */
async function framesSince(page: Page, name: string): Promise<number> {
  return page.evaluate((which: string) => {
    const probe = (window as unknown as { __grsFrameProbe?: { samples: [number, number, number][]; marks: [string, string, number][] } })
      .__grsFrameProbe
    const start = probe?.marks.find(([n, edge]) => n === which && edge === 'start')?.[2]
    if (probe === undefined || start === undefined) return 0
    return new Set(probe.samples.filter(([, enter]) => enter >= start).map(([stamp]) => stamp)).size
  }, name)
}

/** @purity semi-pure-mutable */
async function headingWidth(page: Page, column: string): Promise<number> {
  return page.evaluate(
    (asked: { panel: string; column: string }) =>
      document.querySelector(`${asked.panel} thead th[data-column="${asked.column}"]`)?.getBoundingClientRect().width ?? -1,
    { panel: SEARCH_PANEL, column },
  )
}

// Spec: MC-8, MC-10, GR-28, SV-18
/** @purity non-pure */
async function driveColumnBorder(page: Page, cdp: Cdp, perBurst: number): Promise<void> {
  await page.keyboard.press(OPEN_SEARCH)
  await page.waitForTimeout(800)
  const grip = await page.evaluate((panel: string) => {
    const cells = Array.from(document.querySelectorAll(`${panel} thead th[data-column]`)).filter((one) => !one.hasAttribute('data-no-border'))
    const boxes = cells.map((cell) => ({ column: cell.getAttribute('data-column') ?? '', box: cell.getBoundingClientRect() }))
    const leftmost = boxes.sort((a, b) => a.box.left - b.box.left)[0]
    if (leftmost === undefined) return null
    return { column: leftmost.column, x: leftmost.box.right - 1, y: (leftmost.box.top + leftmost.box.bottom) / 2, width: leftmost.box.width }
  }, SEARCH_PANEL)
  if (grip === null) throw new Error(`${BORDER_STRETCH}: ${OPEN_SEARCH} opened no ${SEARCH_PANEL} with a bordered heading`)
  await burst(cdp, [
    { type: 'mouseMoved', x: grip.x, y: grip.y },
    { type: 'mousePressed', x: grip.x, y: grip.y, button: 'left', buttons: 1, clickCount: 1 },
  ])
  // Why: the swing only widens from the press, so no move lands on the S-425 floor where nothing redraws.
  const swing = (round: number): PointerEventArgs[] =>
    Array.from({ length: perBurst }, (_unused, step) => ({
      type: 'mouseMoved' as const,
      x: grip.x + BORDER_SWING_PX * (1 - Math.cos((round * perBurst + step) / 7)),
      y: grip.y,
      button: 'left' as const,
      buttons: 1,
    }))
  await markSegment(page, BORDER_STRETCH, 'start')
  for (let round = 0; round < BORDER_ROUNDS_CAP; round += 1) {
    await burst(cdp, swing(round))
    if (round % BORDER_CHECK_EVERY === BORDER_CHECK_EVERY - 1 && (await framesSince(page, BORDER_STRETCH)) >= BORDER_FRAMES) break
  }
  await markSegment(page, BORDER_STRETCH, 'end')
  await burst(cdp, [{ type: 'mouseMoved', x: grip.x + BORDER_SWING_PX, y: grip.y, button: 'left', buttons: 1 }])
  await page.waitForTimeout(300)
  const held = await headingWidth(page, grip.column)
  await burst(cdp, [{ type: 'mouseReleased', x: grip.x + BORDER_SWING_PX, y: grip.y, button: 'left', buttons: 0, clickCount: 1 }])
  await page.waitForTimeout(500)
  if (Math.abs(held - grip.width - BORDER_SWING_PX) > 1) {
    throw new Error(`${BORDER_STRETCH}: ${grip.column} held ${held}px, not ${grip.width}px + ${BORDER_SWING_PX}px, so the pull never took`)
  }
}

// Spec: MC-8, MK-1, MK-2, MK-6, MK-7, PTD-1, PTD-5
// Why: MK-8 (dragging an item) is not driven: finding a task bar needs a handle the spec
// does not settle, and a stretch at a guessed point would time whatever it hit.
/** @purity non-pure */
async function sweep(
  live: Browser,
  context: import('@playwright/test').BrowserContext,
  page: Page,
): Promise<Measured> {
  const center = await page.evaluate((selector: string) => {
    const svg = document.querySelector(selector)
    const box = (svg ?? document.body).getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, w: box.width, h: box.height }
  }, DRAWN_SVG)

  const cdp = await context.newCDPSession(page)
  const CTRL = 2
  const PER_BURST = 24
  // Why: the browser folds pointer moves to about one a frame but delivers every wheel
  // notch, so a drag needs more rounds than a wheel for the same three seconds.
  const WHEEL_ROUNDS = 26
  const DRAG_ROUNDS = 150

  const sweepPath = (round: number, held: number, count: number): PointerEventArgs[] =>
    Array.from({ length: count }, (_unused, step) => {
      const phase = (round * count + step) / 7
      return {
        type: 'mouseMoved' as const,
        x: center.x + Math.sin(phase) * (center.w / 5),
        y: center.y + Math.cos(phase / 2) * (center.h / 5),
        button: 'left' as const,
        buttons: 1,
        modifiers: held,
      }
    })

  // Why: the first frames after the page settles carry one-time costs, so a warm-up runs
  // first and summarize drops it.
  await driveSegment(
    page,
    'warm-up',
    async () => {
      await burst(cdp, [
        { type: 'mouseMoved', x: center.x, y: center.y },
        { type: 'mouseWheel', x: center.x, y: center.y, deltaX: 0, deltaY: 60 },
      ])
    },
    8,
  )

  await driveSegment(
    page,
    'MK-1 scroll',
    async (round) => {
      await burst(
        cdp,
        Array.from({ length: PER_BURST }, (_unused, step) => ({
          type: 'mouseWheel' as const,
          x: center.x,
          y: center.y,
          deltaX: 0,
          deltaY: (round + step) % 12 < 6 ? 90 : -90,
        })),
      )
    },
    WHEEL_ROUNDS,
  )

  await driveSegment(
    page,
    'MK-2 zoom',
    async (round) => {
      await burst(
        cdp,
        Array.from({ length: PER_BURST }, (_unused, step) => ({
          type: 'mouseWheel' as const,
          x: center.x,
          y: center.y,
          deltaX: 0,
          deltaY: (round + step) % 8 < 4 ? 80 : -80,
          modifiers: CTRL,
        })),
      )
    },
    WHEEL_ROUNDS,
  )

  await burst(cdp, [
    { type: 'mouseMoved', x: center.x, y: center.y, modifiers: CTRL },
    {
      type: 'mousePressed',
      x: center.x,
      y: center.y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
      modifiers: CTRL,
    },
  ])
  await driveSegment(
    page,
    'MK-7 pan',
    async (round) => {
      await burst(cdp, sweepPath(round, CTRL, PER_BURST))
    },
    DRAG_ROUNDS,
  )
  await burst(cdp, [
    { type: 'mouseReleased', x: center.x, y: center.y, button: 'left', buttons: 0, clickCount: 1 },
  ])

  const from = await bareCanvasPoint(page, { x: center.x - center.w / 3, y: center.y - center.h / 3 })
  if (from === null) throw new Error('MK-6 found no spot in the drawing that hits nothing to press on')
  await burst(cdp, [
    { type: 'mouseMoved', x: from.x, y: from.y },
    { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 },
  ])
  await driveSegment(
    page,
    'MK-6 range select',
    async (round) => {
      await burst(cdp, sweepPath(round, 0, PER_BURST))
    },
    DRAG_ROUNDS,
  )
  const isMarqueeDrawn = await page.evaluate(
    (selector: string) => document.querySelector(`${selector} [data-figure="marquee"]`) !== null,
    DRAWN_SVG,
  )
  await burst(cdp, [
    { type: 'mouseReleased', x: center.x, y: center.y, button: 'left', buttons: 0, clickCount: 1 },
  ])
  if (!isMarqueeDrawn) throw new Error(`MK-6 pressed at ${from.x},${from.y} but drew no range-select frame`)
  await page.waitForTimeout(300)

  await driveColumnBorder(page, cdp, PER_BURST)

  const raw = await page.evaluate(() => {
    const probe = (
      window as unknown as {
        __grsFrameProbe?: {
          samples: [number, number, number][]
          marks: [string, string, number][]
          inputs: number[]
        }
      }
    ).__grsFrameProbe
    return { samples: probe?.samples ?? [], marks: probe?.marks ?? [], inputs: probe?.inputs ?? [] }
  })

  const { segments, barren } = summarize(raw.samples, raw.marks, raw.inputs)

  const environment = await page.evaluate(() => {
    let renderer = ''
    try {
      const gl = document.createElement('canvas').getContext('webgl')
      const info = gl?.getExtension('WEBGL_debug_renderer_info')
      if (gl !== null && gl !== undefined && info !== null && info !== undefined) {
        renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      }
    } catch {
      renderer = ''
    }
    return {
      userAgent: navigator.userAgent,
      renderer,
      hardwareConcurrency: navigator.hardwareConcurrency,
    }
  })

  if (!(await pressEntrance(page, AGENT_API_ENTRANCE))) {
    throw new Error(
      `the entrance ${AGENT_API_ENTRANCE} that FR-065 has open the Agent API is not on the screen`,
    )
  }
  const opened = await page.evaluate(
    () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
  )
  if (opened !== 'object') {
    throw new Error(`pressing ${AGENT_API_ENTRANCE} did not publish grSchedulerAgentApi`)
  }

  const memberNames = [AM_11, AM_12, AM_13, AM_14, AM_15]
  const members = await page.evaluate(async (names: string[]) => {
    type Bag = Record<string, unknown>
    const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
    const out: { member: string; kind: string; answer: string; notAvailable: boolean }[] = []
    for (const name of names) {
      const fn = api[name]
      if (typeof fn !== 'function') {
        out.push({ member: name, kind: typeof fn, answer: '(not a function)', notAvailable: false })
        continue
      }
      let answer: unknown
      try {
        answer = await (fn as () => unknown).call(api)
      } catch (thrown) {
        answer = { threw: String(thrown) }
      }
      // Why: the refusal is read out of the envelope, never as a substring: AM-15 returns the
      // application's own build, which holds the literal notAvailable.
      const envelope = answer !== null && typeof answer === 'object' ? (answer as Bag) : null
      const refusal =
        envelope?.['ok'] === false ? ((envelope['refusal'] ?? {}) as Bag) : undefined
      const payload = envelope?.['ok'] === true ? envelope['value'] : answer
      const shown = typeof payload === 'string' ? payload : JSON.stringify(payload)
      out.push({
        member: name,
        kind: typeof answer,
        answer:
          refusal === undefined
            ? String(shown ?? '').slice(0, 400)
            : String(JSON.stringify(refusal) ?? '').slice(0, 400),
        notAvailable: String(refusal?.['reason'] ?? '').toLowerCase() === 'notavailable',
      })
    }
    return out
  }, memberNames)

  const agentApiVersion = await page.evaluate((name: string) => {
    const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
      .grSchedulerAgentApi
    return String(api?.[name] ?? '')
  }, AM_1)

  const tasks = await page.evaluate(async (name: string) => {
    type Bag = Record<string, unknown>
    const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
    const fn = api[name]
    if (typeof fn !== 'function') return -1
    try {
      const doc = (await (fn as () => unknown).call(api)) as { schedule?: { tasks?: unknown } }
      return Array.isArray(doc?.schedule?.tasks) ? (doc.schedule.tasks as unknown[]).length : -1
    } catch {
      return -1
    }
  }, AM_3)

  const png = await measurePng(page)
  const embedded = await measureEmbeddedHtml(live, page, scratch ?? tmpdir())
  const mspdi = await measureMspdiRoundTrip(page)
  const chooser = await measureChooser(page, members)

  return {
    browserVersion: live.version(),
    userAgent: environment.userAgent,
    renderer: environment.renderer,
    hardwareConcurrency: environment.hardwareConcurrency,
    agentApiVersion,
    tasks,
    segments,
    barren,
    members,
    png,
    ...embedded,
    ...mspdi,
    ...chooser,
  }
}

/** @purity pure */
function summarize(
  samples: readonly [number, number, number][],
  marks: readonly [string, string, number][],
  inputs: readonly number[],
): { segments: Segment[]; barren: string[] } {
  // Why: the browser hands one stamp to every callback of a frame, so samples group by
  // stamp and a frame's inside time is the sum of its callbacks.
  const byStamp = new Map<number, { enter: number; inside: number }>()
  for (const [stamp, enter, leave] of samples) {
    const held = byStamp.get(stamp)
    if (held === undefined) byStamp.set(stamp, { enter, inside: leave - enter })
    else held.inside += leave - enter
  }
  const frames: Frame[] = [...byStamp.entries()]
    .map(([stamp, one]) => ({ stamp, enter: one.enter, inside: one.inside }))
    .sort((a, b) => a.enter - b.enter)

  const segments: Segment[] = []
  const barren: string[] = []
  const names = [...new Set(marks.map(([name]) => name))].filter((name) => name !== 'warm-up')
  for (const name of names) {
    const start = marks.find(([n, edge]) => n === name && edge === 'start')?.[2]
    const end = marks.find(([n, edge]) => n === name && edge === 'end')?.[2]
    if (start === undefined || end === undefined) continue
    const mine = frames.filter((frame) => frame.enter >= start && frame.enter <= end)
    if (mine.length < 10) {
      barren.push(`${name}: ${mine.length} delivered frame(s) over ${round(end - start)}ms`)
      continue
    }
    const intervals: number[] = []
    for (let i = 1; i < mine.length; i += 1) {
      const previous = mine[i - 1]
      const current = mine[i]
      if (previous === undefined || current === undefined) continue
      intervals.push(current.stamp - previous.stamp)
    }
    const insides = mine.map((frame) => frame.inside)
    const first = mine[0]
    const last = mine[mine.length - 1]
    const span = (last?.stamp ?? 0) - (first?.stamp ?? 0)
    const myInputs = inputs.filter((at) => at >= start && at <= end)
    const inputMean = myInputs.length > 1 ? (end - start) / (myInputs.length - 1) : Number.NaN
    const intervalMean = mean(intervals)
    segments.push({
      name,
      frames: mine.length,
      frameRate: span > 0 ? round(((mine.length - 1) * 1000) / span) : Number.NaN,
      intervalP95: round(percentile(intervals, 0.95)),
      intervalMean: round(intervalMean),
      intervalWorst: round(Math.max(...intervals)),
      insideP95: round(percentile(insides, 0.95)),
      insideMean: round(mean(insides)),
      inputs: myInputs.length,
      inputMean: round(inputMean),
      inputBound: !(Number.isFinite(inputMean) && inputMean * 1.5 < intervalMean),
    })
  }
  return { segments, barren }
}

/** @purity non-pure */
async function measurePng(page: Page): Promise<PngAttempt[]> {
  return page.evaluate(
    async (member: string) => {
      type Bag = Record<string, unknown>
      const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
      const fn = api[member]
      const out: {
        shape: string
        width: number
        height: number
        answer: string
      }[] = []

      const asDataUrl = async (value: unknown): Promise<string> => {
        if (typeof value === 'string') return value.startsWith('data:') ? value : ''
        if (value instanceof Blob) {
          return await new Promise<string>((settle) => {
            const reader = new FileReader()
            reader.onload = () => settle(String(reader.result ?? ''))
            reader.onerror = () => settle('')
            reader.readAsDataURL(value)
          })
        }
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
          const bytes = new Uint8Array(
            value instanceof ArrayBuffer ? value : (value as ArrayBufferView).buffer,
          )
          let binary = ''
          for (const byte of bytes) binary += String.fromCharCode(byte)
          return `data:image/png;base64,${btoa(binary)}`
        }
        if (value !== null && typeof value === 'object') {
          for (const held of Object.values(value as Bag)) {
            const nested = await asDataUrl(held)
            if (nested !== '') return nested
          }
        }
        return ''
      }

      {
        if (typeof fn !== 'function') {
          out.push({ shape: typeof fn, width: -1, height: -1, answer: '(not a function)' })
          return out
        }
        // Why: the spec settles no argument shape for this member, so it is called with nothing
        // and with an empty bag, and the first answer holding a picture is kept.
        let picture = ''
        let answer = ''
        for (const argument of [undefined, {}]) {
          let value: unknown
          try {
            value = await (fn as (a: unknown) => unknown).call(api, argument)
          } catch (thrown) {
            value = { threw: String(thrown) }
          }
          const shown = typeof value === 'string' ? value.slice(0, 120) : JSON.stringify(value)
          if (answer === '') answer = String(shown ?? '').slice(0, 300)
          picture = await asDataUrl(value)
          if (picture !== '') break
        }
        if (picture === '') {
          out.push({ shape: 'no picture', width: -1, height: -1, answer })
          return out
        }
        const size = await new Promise<{ w: number; h: number }>((settle) => {
          const image = new Image()
          image.onload = () => settle({ w: image.naturalWidth, h: image.naturalHeight })
          image.onerror = () => settle({ w: -1, h: -1 })
          image.src = picture
        })
        out.push({ shape: 'picture', width: size.w, height: size.h, answer })
      }
      return out
    },
    AM_14,
  )
}

/** @purity non-pure */
async function measureEmbeddedHtml(
  live: Browser,
  page: Page,
  into: string,
): Promise<{
  embeddedHtmlLength: number
  embeddedReopened: boolean
  embeddedTasks: number
  embeddedNote: string
}> {
  const html = await page.evaluate(async (member: string) => {
    type Bag = Record<string, unknown>
    const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
    const fn = api[member]
    if (typeof fn !== 'function') return { text: '', note: `${member} is ${typeof fn}` }
    try {
      const value = await (fn as () => unknown).call(api)
      // Why: AM-15 answers an AgentExport envelope; a bare string is still taken, so either
      // face of the member reads.
      if (typeof value === 'string') return { text: value, note: '' }
      const bag = value !== null && typeof value === 'object' ? (value as Bag) : null
      const held = bag?.['ok'] === true ? bag['value'] : undefined
      if (typeof held === 'string') return { text: held, note: '' }
      return { text: '', note: String(JSON.stringify(value) ?? '').slice(0, 300) }
    } catch (thrown) {
      return { text: '', note: String(thrown).slice(0, 300) }
    }
  }, AM_15)

  if (html.text.length === 0) {
    return {
      embeddedHtmlLength: 0,
      embeddedReopened: false,
      embeddedTasks: -1,
      embeddedNote: html.note,
    }
  }

  const written = join(into, 'embedded.html')
  writeFileSync(written, html.text, 'utf8')
  const context = await live.newContext({ viewport: BASE_SCREEN })
  const reopened = await context.newPage()
  try {
    await reopened.goto(pathToFileURL(written).href)
    await readSettledDrawnSvg(reopened)
    const publishedApi = await pressEntrance(reopened, AGENT_API_ENTRANCE)
    if (!publishedApi) {
      return {
        embeddedHtmlLength: html.text.length,
        embeddedReopened: true,
        embeddedTasks: -1,
        embeddedNote: `the reopened file has no ${AGENT_API_ENTRANCE} entrance to read it through`,
      }
    }
    const tasks = await reopened.evaluate(async (member: string) => {
      type Bag = Record<string, unknown>
      const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
      const fn = api[member]
      if (typeof fn !== 'function') return -1
      const doc = (await (fn as () => unknown).call(api)) as { schedule?: { tasks?: unknown } }
      return Array.isArray(doc?.schedule?.tasks) ? (doc.schedule.tasks as unknown[]).length : -1
    }, AM_3)
    return {
      embeddedHtmlLength: html.text.length,
      embeddedReopened: true,
      embeddedTasks: tasks,
      embeddedNote: '',
    }
  } catch (thrown) {
    return {
      embeddedHtmlLength: html.text.length,
      embeddedReopened: false,
      embeddedTasks: -1,
      embeddedNote: String(thrown).slice(0, 300),
    }
  } finally {
    await context.close()
  }
}

// Spec: NR-1, NR-2, NR-3
// Why: NR-4 and NR-5 of table T-228 are not applied, so a difference the round trip
// reports may still be one of those two.
const XML_CANONICALIZER = `(xml) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  const out = [];
  const walk = (node) => {
    if (node.nodeType === 1) {
      const name = (node.namespaceURI || '') + '|' + node.localName;
      const attrs = Array.from(node.attributes)
        .filter((a) => a.name !== 'xmlns' && a.prefix !== 'xmlns')
        .map((a) => (a.namespaceURI || '') + '|' + a.localName + '=' + JSON.stringify(a.value))
        .sort();
      out.push('<' + name + ' ' + attrs.join(' ') + '>');
      for (const child of node.childNodes) walk(child);
      out.push('</' + name + '>');
    } else if (node.nodeType === 3) {
      const text = (node.nodeValue || '').trim();
      if (text !== '') out.push(JSON.stringify(text));
    }
  };
  walk(doc.documentElement);
  return out.join('');
}`

/** @purity non-pure */
async function measureMspdiRoundTrip(page: Page): Promise<{
  comparatorIgnoresBytes: boolean
  mspdiImported: boolean
  mspdiImportAnswers: string[]
  mspdiRoundTripEqual: boolean
  mspdiFirstDifference: string
}> {
  const source = existsSync(MSPDI_SAMPLE) ? readFileSync(MSPDI_SAMPLE, 'utf8') : ''
  return page.evaluate(
    async ([canonizerSource, importMember, exportMember, given]: [
      string,
      string,
      string,
      string,
    ]) => {
      type Bag = Record<string, unknown>
      const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
      // eslint-disable-next-line no-eval -- the canonicalizer travels into the page as source text
      const canonical = eval(`(${canonizerSource})`) as (xml: string) => string | null

      // Why: the comparator is first shown two documents whose bytes differ in prefix, attribute
      // order, whitespace and self-closing spelling, so a pass is never a byte comparison.
      const pair: string[] = [
        '<a:R xmlns:a="urn:x" y="1" x="2">\n  <a:C/>\n</a:R>',
        '<b:R xmlns:b="urn:x" x="2" y="1"><b:C></b:C></b:R>',
      ]
      const left = pair[0] ?? ''
      const right = pair[1] ?? ''
      const comparatorIgnoresBytes =
        left !== right && canonical(left) !== null && canonical(left) === canonical(right)

      if (given === '') {
        return {
          comparatorIgnoresBytes,
          mspdiImported: false,
          mspdiImportAnswers: ['no document of this format is in the tree to put in'],
          mspdiRoundTripEqual: false,
          mspdiFirstDifference: '',
        }
      }

      const answers: string[] = []
      let imported = false
      const takeIn = api[importMember]
      if (typeof takeIn !== 'function') {
        answers.push(`${importMember} is ${typeof takeIn}`)
      } else {
        // Why: only { text } can carry MSPDI text; the other AgentImportSource shapes take a
        // Document, and a string there came back malformedRequest, not a refused document.
        for (const [shape, argument] of [['{ text }', { text: given }]] as [string, unknown][]) {
          let answer: unknown
          try {
            answer = await (takeIn as (a: unknown) => unknown).call(api, argument)
          } catch (thrown) {
            answer = { threw: String(thrown) }
          }
          const shown = String(JSON.stringify(answer) ?? '').slice(0, 200)
          answers.push(`${shape} -> ${shown}`)
          // Why: the verdict is read from the ok field, never matched in the text, since an
          // accepted outcome also holds hasUpdatedSchedule: false.
          const outcome = answer !== null && typeof answer === 'object' ? (answer as Bag) : null
          if (outcome?.['ok'] === true) {
            imported = true
            break
          }
        }
      }

      let roundTripEqual = false
      let firstDifference = ''
      const writeOut = api[exportMember]
      if (imported && typeof writeOut === 'function') {
        let written: unknown
        try {
          written = await (writeOut as () => unknown).call(api)
        } catch (thrown) {
          written = { threw: String(thrown) }
        }
        const wrapper = written !== null && typeof written === 'object' ? (written as Bag) : null
        const carried = typeof written === 'string' ? written : wrapper?.['ok'] === true ? wrapper['value'] : undefined
        if (typeof carried === 'string') {
          const before = canonical(given)
          const after = canonical(carried)
          roundTripEqual = before !== null && after !== null && before === after
          if (!roundTripEqual && before !== null && after !== null) {
            let at = 0
            while (at < before.length && at < after.length && before[at] === after[at]) at += 1
            firstDifference =
              `at ${at}: in ${JSON.stringify(before.slice(at, at + 90))} ` +
              `out ${JSON.stringify(after.slice(at, at + 90))}`
          }
        } else {
          firstDifference = `${exportMember} answered ${String(JSON.stringify(written) ?? '').slice(0, 200)}`
        }
      }

      return {
        comparatorIgnoresBytes,
        mspdiImported: imported,
        mspdiImportAnswers: answers,
        mspdiRoundTripEqual: roundTripEqual,
        mspdiFirstDifference: firstDifference,
      }
    },
    [XML_CANONICALIZER, AM_8, AM_12, source] as [string, string, string, string],
  )
}

/** @purity pure */
function unwritableFormats(members: readonly MemberAnswer[]): string[] {
  const byMember: Record<string, string> = {
    [AM_12]: 'IO-1',
    [AM_13]: 'IO-3',
    [AM_14]: 'IO-4',
    [AM_15]: 'IO-7',
  }
  const out: string[] = []
  for (const one of members) {
    const row = byMember[one.member]
    if (row === undefined) continue
    if (!one.notAvailable && one.answer !== '(not a function)') continue
    out.push(bare(rowOf(T024, row).cells[0] ?? row))
  }
  return out
}

/** @purity non-pure */
async function measureChooser(
  page: Page,
  members: readonly MemberAnswer[],
): Promise<{
  chooserStood: boolean
  chooserText: string
  unwritable: string[]
  pressedFormat: string
  chooserStoodAfterPress: boolean
  noticeText: string
}> {
  const unwritable = unwritableFormats(members)
  await pressEntrance(page, EXPORT_ENTRANCE)
  const surface = await page.evaluate((role: string) => {
    const found = document.querySelector(`[data-role="${role}"]`)
    return { stood: found !== null, text: (found?.textContent ?? '').replace(/\s+/g, ' ').trim() }
  }, EXPORT_CHOOSER)

  let pressedFormat = ''
  if (surface.stood) {
    for (const format of unwritable) {
      const hit = await page.evaluate(
        ([role, name]: [string, string]) => {
          const panel = document.querySelector(`[data-role="${role}"]`)
          if (panel === null) return null
          const wanted = name.replace(/[^A-Za-z0-9.]/g, '').toLowerCase()
          const entries = [...panel.querySelectorAll('*')].filter((node) => {
            const text = (node.textContent ?? '').replace(/[^A-Za-z0-9.]/g, '').toLowerCase()
            return text.includes(wanted) && node.children.length === 0
          })
          const chosen = entries[0] ?? null
          if (chosen === null) return null
          const box = chosen.getBoundingClientRect()
          if (box.width === 0 || box.height === 0) return null
          return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
        },
        [EXPORT_CHOOSER, format] as [string, string],
      )
      if (hit === null) continue
      await page.mouse.move(hit.x, hit.y)
      await page.mouse.down()
      await page.mouse.up()
      await page.waitForTimeout(1000)
      pressedFormat = format
      break
    }
  }

  const after = await page.evaluate(
    ([chooserRole, noticeRole]: [string, string]) => ({
      stood: document.querySelector(`[data-role="${chooserRole}"]`) !== null,
      notice: (document.querySelector(`[data-role="${noticeRole}"]`)?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
      whole: (document.body.textContent ?? '').replace(/\s+/g, ' ').trim(),
    }),
    [EXPORT_CHOOSER, NOTIFICATION_AREA] as [string, string],
  )

  // Why: with no Notification Area the whole page is read, as a telling may stand under
  // another marking, and the message says so instead of crediting the missing part.
  const noticeText =
    after.notice === ''
      ? `(no [data-role="${NOTIFICATION_AREA}"] in the page; the whole page said) ` +
        after.whole.slice(0, 400)
      : after.notice.slice(0, 900)

  return {
    chooserStood: surface.stood,
    chooserText: surface.text.slice(0, 600),
    unwritable,
    pressedFormat,
    chooserStoodAfterPress: after.stood,
    noticeText,
  }
}

// Spec: T-025, MC-5
test('T-025 -- the numbers are recorded together with the browser they were taken in', () => {
  const m = taken()
  expect(m.browserVersion, 'no browser version was recorded beside the numbers').not.toBe('')
  expect(m.userAgent, 'no user agent was recorded beside the numbers').not.toBe('')
  expect(
    `${m.browserVersion} | ${m.userAgent} | renderer ${JSON.stringify(m.renderer)} | ` +
      `${String(m.hardwareConcurrency)} logical cores | Agent API ${m.agentApiVersion}`,
  ).not.toBe('')
})

test('MC-8 -- every driven stretch delivered frames to measure', () => {
  const m = taken()
  expect(
    m.segments.length,
    'not one stretch of MC-8 yielded frames; barren: ' + m.barren.join(' ;; '),
  ).toBeGreaterThan(0)
  // Why: a stretch that asks for no frame is an NFR-010 finding, not an NFR-002 one, so
  // it is only printed here and named in the last case.
  expect(m.segments.map((one) => `${one.name}: ${String(one.frames)} frames`).join(' ;; ')).not.toBe(
    '',
  )
})

test('T-043 -- the interval between frames and the time inside the call are two numbers', () => {
  // Why: the two numbers must part, since if they coincided either would pass NFR-003 and
  // the probe would no longer tell the interval from the time inside the call.
  const m = taken()
  const usable = m.segments.filter((one) => one.frames >= 30)
  expect(
    usable.length,
    'no stretch delivered the 30 frames this comparison needs; ' +
      m.segments.map((one) => `${one.name}: ${String(one.frames)}`).join(' ;; '),
  ).toBeGreaterThan(0)

  const shown = usable
    .map(
      (one) =>
        `${one.name}: interval p95 ${String(one.intervalP95)}ms / mean ${String(one.intervalMean)}ms ` +
        `vs inside p95 ${String(one.insideP95)}ms / mean ${String(one.insideMean)}ms ` +
        `(${String(one.frames)} frames, ${String(one.inputs)} input events one every ` +
        `${String(one.inputMean)}ms${one.inputBound ? `, ${INPUT_BOUND}` : ''})`,
    )
    .join('\n  ')

  // Why: a frame's interval holds all the browser does around the call, so on average it
  // cannot be the shorter of the two.
  for (const one of usable) {
    expect(
      one.intervalMean,
      `${one.name}: the interval between frames (${String(one.intervalMean)}ms) came out no ` +
        `larger than the time spent inside the call (${String(one.insideMean)}ms), so this file ` +
        `is not measuring the two things table T-043 separates\n  ${shown}`,
    ).toBeGreaterThan(one.insideMean)
  }

  const widest = Math.max(...usable.map((one) => Math.abs(one.intervalP95 - one.insideP95)))
  expect(
    widest,
    'the two numbers table T-043 separates came out within 1ms of each other in every ' +
      `stretch, so nothing here would notice one being taken for the other\n  ${shown}`,
  ).toBeGreaterThan(1)
})

// Spec: FR-021, SWS-6
test('FR-021 -- the comparison is of canonical XML, never of the bytes', () => {
  const m = taken()
  expect(
    m.comparatorIgnoresBytes,
    'the comparator this file judges the round trip by did not call two byte-different but ' +
      'canonically identical documents the same, so it would be comparing bytes',
  ).toBe(true)
})

// Spec: NFR-002, NFR-003, MC-4, MC-7, TP-6, FR-025, FR-067, BT-1, FR-021, FR-029, FR-076, NT-1
// Trap: a case placed after this one is left unrun when this one fails, so this stays
// the last case of the file.
test('NFR-002 / NFR-003 / FR-025 / FR-067 / FR-021 / FR-029 -- the gates and the three roads', () => {
  const m = taken()
  const unmet: string[] = []
  // Trap: only a scene the spec makes conditional and this build does not enter goes in
  // recorded; a clause the spec asks for put here would pass unseen.
  const recorded: string[] = []
  const stamp =
    `[measured in ${m.browserVersion}, renderer ${JSON.stringify(m.renderer)}, ` +
    `${String(m.tasks)} Task]`

  if (m.browserVersion === '') {
    unmet.push('no browser version was recorded, so no number in this run may stand as a value')
  }

  if (m.tasks < TEMPLATE_TASKS) {
    unmet.push(
      `the document that was measured holds ${String(m.tasks)} Task, fewer than the ` +
        `${String(TEMPLATE_TASKS)} of TP-6, so the load is below MC-7's ${TARGET_SCALE.replace(/\*/g, '')}`,
    )
  }

  for (const one of m.segments) {
    const both =
      `interval p95 ${String(one.intervalP95)}ms, mean ${String(one.intervalMean)}ms, worst ` +
      `${String(one.intervalWorst)}ms over ${String(one.frames)} frames; time inside the redraw ` +
      `call p95 ${String(one.insideP95)}ms, mean ${String(one.insideMean)}ms; ` +
      `${String(one.inputs)} input events, one every ${String(one.inputMean)}ms` +
      (one.inputBound
        ? ` -- ⛔ ${INPUT_BOUND}: the frames are no denser than the harness's own input, so this ` +
          'number is NOT a gate value and the stretch has to be driven from a real device before ' +
          'it can be'
        : '')
    if (!(one.frameRate >= FRAME_RATE_FLOOR)) {
      unmet.push(
        `NFR-002 ${one.name}: ${String(one.frameRate)} frames per second, below ` +
          `${String(FRAME_RATE_FLOOR)} -- ${both} ${stamp}`,
      )
    }
    if (!(one.intervalP95 <= FRAME_TIME_P95_CEILING_MS)) {
      unmet.push(
        `NFR-003 ${one.name}: the 95th percentile of the frame time is ` +
          `${String(one.intervalP95)}ms, over ${String(FRAME_TIME_P95_CEILING_MS)}ms -- ${both} ` +
          stamp,
      )
    }
  }
  for (const note of m.barren) {
    unmet.push(`a stretch of MC-8 delivered too few frames to judge -- ${note}`)
  }

  // Why: a test cannot pin the machine's GPU, so it reads the renderer and refuses the
  // numbers as gate values when the renderer names no integrated part.
  const integrated = /intel|uhd|iris/i.test(m.renderer)
  const discrete = /nvidia|geforce|radeon|rtx|gtx/i.test(m.renderer)
  if (!integrated) {
    unmet.push(
      `MC-4 was not met: the renderer is ${JSON.stringify(m.renderer)}, which does not name the ` +
        'integrated part MC-4 fixes the measurement to, so the numbers above are not gate values',
    )
  }
  if (discrete) {
    unmet.push(
      `MC-4's MUST NOT was broken: the renderer ${JSON.stringify(m.renderer)} names a discrete part`,
    )
  }

  for (const attempt of m.png) {
    if (attempt.width < 0) {
      unmet.push(
        `FR-025: ${AM_14} produced no picture; it answered ${JSON.stringify(attempt.answer)}`,
      )
      continue
    }
    if (attempt.width !== EXPORT_CANVAS.width) {
      unmet.push(
        `FR-025: the picture is ${String(attempt.width)}px wide, not S-81's fixed width of ` +
          `${String(EXPORT_CANVAS.width)}`,
      )
    }
    if (attempt.height < EXPORT_CANVAS.height) {
      unmet.push(
        `FR-025: the picture is ${String(attempt.height)}px high, below S-81's height of ` +
          `${String(EXPORT_CANVAS.height)} -- the height is stretched from there, never cut below it`,
      )
    }
    if (attempt.height > EXPORT_HEIGHT_CAP) {
      unmet.push(
        `FR-025: the picture is ${String(attempt.height)}px high, past S-217's cap of ` +
          `${String(EXPORT_HEIGHT_CAP)}`,
      )
    }
  }

  if (m.embeddedHtmlLength === 0) {
    unmet.push(
      `FR-067: ${AM_15} wrote no .html; it answered ${JSON.stringify(m.embeddedNote)} ` +
        `(row ${bare(rowOf(T034, 'BT-1').cells[1] ?? 'BT-1')} has that file's embedded document ` +
        'win at startup, so nothing downstream of it can be judged)',
    )
  } else if (!m.embeddedReopened) {
    unmet.push(
      `FR-067 / BT-1: the ${String(m.embeddedHtmlLength)}-byte .html did not come up when opened ` +
        `on its own: ${m.embeddedNote}`,
    )
  } else if (m.embeddedTasks !== m.tasks) {
    unmet.push(
      `FR-067 / BT-1: the reopened file came up holding ${String(m.embeddedTasks)} Task where the ` +
        `run that wrote it held ${String(m.tasks)}${m.embeddedNote === '' ? '' : ` (${m.embeddedNote})`}`,
    )
  }

  if (!existsSync(MSPDI_SAMPLE)) {
    unmet.push(
      `FR-021 could not be pressed: no document of the format of row IO-1 is at ${MSPDI_SAMPLE} ` +
        '(the checkout has no sample-schedule/ file)',
    )
  } else if (!m.mspdiImported) {
    // Why: recorded, not counted: by OP-12 a handed text has no extension to be read as
    // MSPDI, and by FR-022 every AM-8 call waits on U-61 for a person.
    recorded.push(
      `FR-021 was not pressed end to end: ${AM_8} takes IO-2 (GRS JSON) as text and raises U-61 ` +
        `for a person on every call, so an unattended MSPDI round trip has no road -- ` +
        m.mspdiImportAnswers.join(' ;; '),
    )
  } else if (!m.mspdiRoundTripEqual) {
    unmet.push(
      `FR-021: what came back out is not the document that went in, compared canonically -- ` +
        m.mspdiFirstDifference,
    )
  }

  const notYet = reasonWords(REASON_NOT_YET)
  const fallback = reasonWords(REASON_FALLBACK)
  if (m.unwritable.length === 0) {
    // Why: with every format writable RS-40 has no scene, and raising it would tell a false
    // reason (DFC-334); the branch is recorded, not an expectation lowered.
    recorded.push(
      'FR-029 had no occasion: every format of table T-024 answered through the Agent API, so ' +
        'no format is one this build cannot write yet and RS-40 has no scene -- ' +
        m.members.map((one) => `${one.member} -> ${one.answer.slice(0, 60)}`).join(' ;; '),
    )
  } else if (!m.chooserStood) {
    unmet.push(
      `FR-029: pressing ${EXPORT_ENTRANCE} stood no part named ${JSON.stringify(EXPORT_CHOOSER)}, ` +
        `so the formats this build cannot write (${m.unwritable.join(', ')}) cannot be chosen at all`,
    )
  } else if (m.pressedFormat === '') {
    unmet.push(
      `FR-029: the ${EXPORT_CHOOSER} carries no entry for any of ${m.unwritable.join(', ')}; it ` +
        `said ${JSON.stringify(m.chooserText.slice(0, 300))}`,
    )
  } else {
    const told = notYet.some((words) => m.noticeText.includes(words))
    const fellBack = fallback.some((words) => words !== '' && m.noticeText.includes(words))
    if (!told) {
      unmet.push(
        `FR-029: pressing ${m.pressedFormat} told no reason ${REASON_NOT_YET} ` +
          `(${JSON.stringify(notYet.join(' / '))}); what stood was ` +
          JSON.stringify(m.noticeText.slice(0, 300)),
      )
    }
    if (fellBack && !told) {
      unmet.push(
        `FR-029: the fallback ${REASON_FALLBACK} was carried while ${REASON_NOT_YET} is the ` +
          'matching row for this scene',
      )
    }
    if (!told && !m.chooserStoodAfterPress) {
      unmet.push(
        `FR-029: the ${EXPORT_CHOOSER} closed on the press and no reason was told, so the choice ` +
          'went quiet',
      )
    }
  }

  // Why: every stretch is printed, passing ones too, since PG-2 and PG-3 keep the difference
  // from the last run and a number that never leaves the run cannot be differenced.
  const table = m.segments
    .map(
      (one) =>
        `${one.name}: ${String(one.frameRate)} fps | frame time p95 ${String(one.intervalP95)}ms ` +
        `mean ${String(one.intervalMean)}ms worst ${String(one.intervalWorst)}ms | inside the ` +
        `call p95 ${String(one.insideP95)}ms mean ${String(one.insideMean)}ms | ` +
        `${String(one.inputs)} input events one every ${String(one.inputMean)}ms` +
        (one.inputBound ? ` | ⛔ ${INPUT_BOUND}` : ''),
    )
    .join('\n      ')

  const noted =
    recorded.length === 0 ? '' : `\n\n  recorded, not counted:\n  - ${recorded.join('\n  - ')}`

  expect(
    unmet,
    `the shipped build did not meet ${String(unmet.length)} clause(s) ${stamp}:\n  - ` +
      unmet.join('\n  - ') +
      `\n\n  measured:\n      ${table}\n${noted}`,
  ).toEqual([])
})
