// CR-551 real-app probe: regressions for what a Playwright run on dist/index.html found (items A-E)

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'
import {
  byRole,
  selfAndDescendants,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { NO_MODS, pointerOf, rowDocument, SCREEN, taskOf } from './cr-541-stage'

interface ProbeBench {
  readonly loop: FrameLoop
  readonly frames: () => number
  readonly svg: () => string
  send(input: HumanInput): void
  aim(part: ScreenPart | null): void
  press(part: string, entry: string | null): void
  view(): ScreenView
  restore(): void
}

const partOf = (part: string, entry: string | null, extra: Record<string, unknown> = {}): ScreenPart =>
  ({
    part,
    entry,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    ...extra,
  }) as unknown as ScreenPart

function probeBench(
  document: Record<string, unknown>,
  options: { readonly fromTemplate?: boolean; readonly surface?: Partial<ScreenSurface> } = {},
): ProbeBench {
  const global = globalThis as unknown as Record<string, unknown>
  const realRaf = global['requestAnimationFrame']
  const waiting: ((time: number) => void)[] = []
  let frameCount = 0
  global['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const run of waiting.splice(0)) {
        frameCount += 1
        run(turn)
      }
    }
  }
  const views: ScreenView[] = []
  const svgs: string[] = []
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readFieldEditNotices: () => [],
    readScreenPartAt: () => aimed,
    ...options.surface,
  } as unknown as ScreenSurface
  const loop = frameLoop(
    { showSvg: (svg: string) => svgs.push(svg) } as never,
    document as never,
    SCREEN,
    { surface, language: 'ja' },
    undefined,
    undefined,
    undefined,
    options.fromTemplate === true,
  )
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    frames: () => frameCount,
    svg: () => svgs[svgs.length - 1] ?? '',
    send,
    aim: (part) => {
      aimed = part
    },
    press: (part, entry) => {
      aimed = partOf(part, entry)
      send(pointerOf('down', 80, 120))
      send(pointerOf('up', 80, 120))
      aimed = null
    },
    view: () => views[views.length - 1] as ScreenView,
    restore: () => {
      if (realRaf === undefined) delete global['requestAnimationFrame']
      else global['requestAnimationFrame'] = realRaf
    },
  }
}

const benches: ProbeBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})
const started = (document: Record<string, unknown>, options: Parameters<typeof probeBench>[1] = {}): ProbeBench => {
  const built = probeBench(document, options)
  benches.push(built)
  return built
}

const numberOf = (cell: string): number => Number(/-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))?.[0])
const settingOf = (id: string): number =>
  numberOf(specTable('T-206').rows.find((one) => one.id === id)?.by['既定'] ?? '')

const SEEDS = [
  { name: 'Alpha', start: '2026-04-06', finish: '2026-04-20' },
  { name: 'Beta', start: '2026-05-04', finish: '2026-05-29' },
  { name: 'Zeta, the task whose name ends the picture', start: '2026-06-15', finish: '2026-07-03' },
]

function seededDocument(settings: Record<string, unknown> = {}): Record<string, any> {
  const rows = SEEDS.map((_one, index) => ({ id: `g${index + 1}`, parentId: null }))
  const document = rowDocument(rows, { progressMarkerVisible: false, ...settings })
  document.schedule.tasks = SEEDS.map((one, index) =>
    taskOf(index + 1, { name: one.name, start: `${one.start}T08:00:00`, finish: `${one.finish}T17:00:00` }),
  )
  return document
}

const marginsOf = (loop: FrameLoop): { left: number; right: number; width: number } => {
  const frame = loop.current()
  const area = frame?.regions.rowArea
  const placements = frame?.layout.placements ?? []
  if (area === undefined) throw new Error('the shell has no frame')
  return {
    left: Math.min(...placements.map((one) => one.occupiedX0)) - area.x,
    right: area.x + area.width - Math.max(...placements.map((one) => one.occupiedX1)),
    width: area.width,
  }
}

describe('A: FR-055 / S-332 -- the first fit after a template start leaves the margin on both sides', () => {
  it('the first press of IC-10 on a document that stores no place (the startup template) leaves S-332 each side', () => {
    // see FR-055, S-332, OP-10
    const built = started(seededDocument({ scrollDate: null, scrollGroupId: null }), { fromTemplate: true })
    built.press('App Header', 'IC-10')
    const { left, right, width } = marginsOf(built.loop)
    expect(left, 'the left margin').toBeCloseTo(width * settingOf('S-332'), 0)
    expect(right, 'the right margin').toBeCloseTo(width * settingOf('S-332'), 0)
  })

  it('the same on a document without a stored place that did not come from the template', () => {
    // see FR-055, S-332
    const built = started(seededDocument({ scrollDate: null, scrollGroupId: null, zoomX: 4 }))
    built.press('App Header', 'IC-10')
    const { left, right, width } = marginsOf(built.loop)
    expect(left, 'the left margin').toBeCloseTo(width * settingOf('S-332'), 0)
    expect(right, 'the right margin').toBeCloseTo(width * settingOf('S-332'), 0)
  })
})

const horizontalBarOf = (built: ProbeBench) => {
  const found = built.view().frame.scrollbars.find((one) => one.axis === 'horizontal')
  if (found === undefined) throw new Error('SC-4 draws no horizontal bar')
  return found
}

describe('B: GR-21 -- while the grip is held, the view stays inside the whole held from the press', () => {
  it('the grip follows the pointer, and where it meets the lane end the view stops with it', () => {
    // see GR-21, T-023d, FR-051
    const built = started(seededDocument({ zoomX: 4, scrollDate: '2026-03-20', scrollGroupId: 'g1' }))
    const bar = horizontalBarOf(built)
    const at = { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
    built.aim(partOf('Scrollbars', null, { scrollbarAxis: 'horizontal' }))
    built.send(pointerOf('down', at.x, at.y))
    const step = 40
    let travelled = 0
    let lastThumb = bar.thumb.x
    let sawEnd = false
    for (let turn = 0; turn < 60; turn += 1) {
      travelled += step
      built.send(pointerOf('move', at.x + travelled, at.y))
      const now = horizontalBarOf(built)
      const area = built.loop.current()?.regions.rowArea
      const layout = built.loop.current()?.layout
      if (area === undefined || layout === undefined) throw new Error('no frame')
      const contentRight = (layout.contentX0 ?? area.x) + layout.contentWidth
      expect(contentRight, `the view ran past the whole at ${travelled}px`).toBeGreaterThanOrEqual(
        area.x + area.width - 0.5,
      )
      const isAtEnd = now.thumb.x + now.thumb.width >= now.track.x + now.track.width - 0.5
      if (!isAtEnd) expect(now.thumb.x - lastThumb, `grip at ${travelled}px`).toBeCloseTo(step, 0)
      sawEnd = sawEnd || isAtEnd
      lastThumb = now.thumb.x
    }
    built.send(pointerOf('up', at.x + travelled, at.y))
    expect(sawEnd, 'premise: the drag reaches the lane end').toBe(true)
  })
})

describe('B (the vertical twin): GR-21 -- the vertical grip holds the same whole', () => {
  it('the vertical grip follows the pointer, and where it meets the lane end the view stops with it', () => {
    // see GR-21, T-023d, FR-051
    const rows = Array.from({ length: 60 }, (_one, index) => ({ id: `g${index + 1}`, parentId: null }))
    const built = started(rowDocument(rows, { progressMarkerVisible: false, zoomY: 3 }))
    const barOf = () => {
      const found = built.view().frame.scrollbars.find((one) => one.axis === 'vertical')
      if (found === undefined) throw new Error('SC-4 draws no vertical bar')
      return found
    }
    const firstRowY = (): number => built.loop.current()?.layout.rows.find((row) => row.isPinned !== true)?.y ?? 0
    const bar = barOf()
    const at = { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
    built.aim(partOf('Scrollbars', null, { scrollbarAxis: 'vertical' }))
    built.send(pointerOf('down', at.x, at.y))
    const step = 40
    let travelled = 0
    let lastThumb = bar.thumb.y
    let heldAt: number | null = null
    for (let turn = 0; turn < 40; turn += 1) {
      travelled += step
      built.send(pointerOf('move', at.x, at.y + travelled))
      const now = barOf()
      const isAtEnd = now.thumb.y + now.thumb.height >= now.track.y + now.track.height - 0.5
      if (!isAtEnd) expect(now.thumb.y - lastThumb, `grip at ${travelled}px`).toBeCloseTo(step, 0)
      if (isAtEnd && heldAt === null) heldAt = firstRowY()
      if (heldAt !== null) expect(firstRowY(), `the view moved on at ${travelled}px`).toBeCloseTo(heldAt, 0)
      lastThumb = now.thumb.y
    }
    built.send(pointerOf('up', at.x, at.y + travelled))
    expect(heldAt, 'premise: the drag reaches the lane end').not.toBeNull()
  })
})

interface PanelBench {
  readonly loop: FrameLoop
  readonly built: Stage
  readonly frames: () => number
  send(input: HumanInput): void
  // WHY: hands the input over and leaves the frame it asks for waiting, as a browser does until
  // the events of the same task (the click after a pointerup) have run.
  sendHeld(input: HumanInput): void
  drain(): void
  aim(part: ScreenPart | null): void
  view(): ScreenView
}

function panelBench(document: Record<string, unknown>): PanelBench {
  const global = globalThis as unknown as Record<string, unknown>
  const waiting: ((time: number) => void)[] = []
  let frameCount = 0
  const realRaf = global['requestAnimationFrame']
  global['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const run of waiting.splice(0)) {
        frameCount += 1
        run(turn)
      }
    }
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    hasUnsettledTextEntry: () => drawn.hasUnsettledTextEntry(),
    readFieldEditNotices: () =>
      (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: () => aimed,
    ...(typeof (drawn as unknown as Record<string, unknown>)['watchFieldCommits'] === 'function'
      ? { watchFieldCommits: (drawn as unknown as Record<string, (wake: () => void) => void>)['watchFieldCommits'] }
      : {}),
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, { surface, language: 'ja' })
  drain()
  benches.push({
    restore: () => {
      if (realRaf === undefined) delete global['requestAnimationFrame']
      else global['requestAnimationFrame'] = realRaf
    },
  } as unknown as ProbeBench)
  return {
    loop,
    built,
    frames: () => {
      drain()
      return frameCount
    },
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    sendHeld: (input) => loop.receiveInput(input),
    drain,
    aim: (part) => {
      aimed = part
    },
    view: () => views[views.length - 1] as ScreenView,
  }
}

// WHY: bubbles from the node through its parents as a browser does; the shell's own listeners sit on window.
function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): FakeEvent {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    relatedTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
  return event
}

const PROPERTIES_PANEL = bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')
const panelRootOf = (bench: PanelBench): FakeElement => byRole(bench.built.root(), PROPERTIES_PANEL)[0] as FakeElement

function taskPanel(task: Record<string, unknown> = {}, visual: Record<string, unknown> | null = null): PanelBench {
  const document = rowDocument([{ id: 'g1', parentId: null }], { progressMarkerVisible: false })
  document.schedule.tasks = [
    taskOf(1, { name: 'Alpha', start: '2026-04-06T08:00:00', finish: '2026-04-30T17:00:00', ...task }),
  ]
  if (visual !== null) {
    document.schedule.taskVisuals = [
      { taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, lineWeight: null, ...visual },
    ]
  }
  const bench = panelBench(document)
  const placement = bench.loop.current()?.layout.placements.find((one) => one.taskUid === 1)
  if (placement === undefined) throw new Error('the task is not drawn')
  const x = placement.x + placement.width / 2
  const y = placement.y + placement.height / 2
  bench.send(pointerOf('down', x, y))
  bench.send(pointerOf('up', x, y))
  bench.send({ ...pointerOf('down', x, y), clickCount: 2 } as HumanInput)
  bench.send({ ...pointerOf('up', x, y), clickCount: 2 } as HumanInput)
  if (bench.view().propertiesPanel === null) throw new Error('MK-13 did not put the property panel up')
  return bench
}

function dateEntryOf(bench: PanelBench, row: string, index: number): FakeElement {
  const found = selfAndDescendants(panelRootOf(bench)).filter(
    (one) => one.getAttribute('data-field-row') === row && one.tagName === 'INPUT' && one.getAttribute('type') === 'date',
  )[index]
  if (found === undefined) throw new Error(`the panel drew no date entry for ${row}`)
  // WHY: a browser reflects the type attribute onto the property; the shared fake does not.
  ;(found as unknown as { type: string | null }).type = found.getAttribute('type')
  return found
}

const keyInput = (key: string): HumanInput => ({ kind: 'key', key, modifiers: { ...NO_MODS } })

// WHY: what a browser raises for a key pressed in the field: keydown at the field, bubbling to the
// panel, then to window where the shell's input source hears it.
function pressKeyIn(bench: PanelBench, entry: FakeElement, key: string): void {
  raise(bench.built, entry, 'keydown', { key })
  bench.send(keyInput(key))
  raise(bench.built, entry, 'keyup', { key })
}

// WHY: measured on Edge (Chromium) 2026-09-24 with the built app: a script that sets the value of the
// focused date entry makes the entry raise focusin again, inside the setter.
const typedBy = new WeakMap<FakeElement, (next: string) => void>()

function focusIn(bench: PanelBench, entry: FakeElement): void {
  let held = String((entry as unknown as { value: unknown }).value ?? '')
  typedBy.set(entry, (next) => {
    held = next
  })
  Object.defineProperty(entry, 'value', {
    configurable: true,
    get: () => held,
    set: (next: string) => {
      held = next
      raise(bench.built, entry, 'focusin')
    },
  })
  entry.focus()
  raise(bench.built, entry, 'focusin')
}

// WHY: a blur by script raises focusout and nothing the shell hears; the next input is a move.
function blurOut(bench: PanelBench, entry: FakeElement): void {
  raise(bench.built, entry, 'focusout')
  bench.send(pointerOf('move', 5, SCREEN.height - 20))
}

describe('C: FR-006 -- an emptied date field commits with the events a browser raises', () => {
  for (const commit of ['blur', 'Enter'] as const) {
    it(`deadline emptied by Delete and settled by ${commit} writes null`, () => {
      // see FR-006, T-016, PR-10
      const bench = taskPanel({ deadline: '2026-12-15T17:00:00' })
      const entry = dateEntryOf(bench, 'PR-10', 0)
      focusIn(bench, entry)
      pressKeyIn(bench, entry, 'Delete')
      if (commit === 'Enter') pressKeyIn(bench, entry, 'Enter')
      else blurOut(bench, entry)
      expect(bench.loop.document().schedule.tasks[0]?.deadline).toBeNull()
    })

    it(`start emptied by Delete and settled by ${commit} writes nothing and shows the old value again`, () => {
      // see FR-006, T-016, PR-3
      const bench = taskPanel()
      const before = bench.loop.document().schedule.tasks[0]?.start
      const entry = dateEntryOf(bench, 'PR-3', 0)
      const shownBefore = String(entry.value)
      focusIn(bench, entry)
      pressKeyIn(bench, entry, 'Delete')
      if (commit === 'Enter') pressKeyIn(bench, entry, 'Enter')
      else blurOut(bench, entry)
      expect(bench.loop.document().schedule.tasks[0]?.start, 'writes nothing').toBe(before)
      expect(String(dateEntryOf(bench, 'PR-3', 0).value), 'the field shows the old value again').toBe(shownBefore)
    })

    it(`a date typed into the deadline field (input, change) and settled by ${commit} is written`, () => {
      // see FR-006, T-016, PR-10
      const bench = taskPanel({ deadline: '2026-12-15T17:00:00' })
      const entry = dateEntryOf(bench, 'PR-10', 0)
      focusIn(bench, entry)
      typedBy.get(entry)?.('2026-11-20')
      raise(bench.built, entry, 'input')
      raise(bench.built, entry, 'change')
      if (commit === 'Enter') pressKeyIn(bench, entry, 'Enter')
      else blurOut(bench, entry)
      expect(String(bench.loop.document().schedule.tasks[0]?.deadline).slice(0, 10)).toBe('2026-11-20')
    })
  }
})

describe('D: CV-9 / JDG-397 -- a press on a colour swatch lands in the frame its press asked for', () => {
  it('the swatch press writes the colour, draws it and lets undo be pressed without a further input', () => {
    // see CV-9, T-078, FT-1, IF-9
    const bench = taskPanel({}, null)
    const swatch = selfAndDescendants(panelRootOf(bench)).find(
      (one) => one.tagName === 'BUTTON' && (one.getAttribute('data-colour-choice') ?? '') !== '' && one.getAttribute('aria-pressed') !== 'true',
    )
    if (swatch === undefined) throw new Error('the panel drew no colour swatch')
    const name = swatch.getAttribute('data-colour-choice')
    ;(swatch as unknown as { dispatchEvent: (event: Event) => boolean }).dispatchEvent = (event) => {
      raise(bench.built, swatch, event.type)
      return true
    }
    const area = bench.loop.current()?.regions.propertiesPanel
    if (area === undefined) throw new Error('no frame')
    const at = { x: area.x + area.width / 2, y: area.y + area.height / 2 }
    bench.aim(partOf(PROPERTIES_PANEL, null))
    raise(bench.built, swatch, 'pointerdown')
    bench.send(pointerOf('down', at.x, at.y))
    raise(bench.built, swatch, 'pointerup')
    bench.sendHeld(pointerOf('up', at.x, at.y))
    raise(bench.built, swatch, 'click')
    bench.drain()
    const visual = bench.loop.document().schedule.taskVisuals.find((one) => one.taskUid === 1)
    const written = [visual?.fillColor, visual?.strokeColor]
    expect(written, 'the document holds the chosen name').toContain(name)
    const undo = bench.view().appHeaderItems.commands.find((one) => one.icon === 'IC-5')
    expect(undo?.isEnabled, 'undo (IC-5) can be pressed').toBe(true)
    const shown = bench.view().propertiesPanel?.fields.map((one) => one.text) ?? []
    expect(shown.some((one) => one.split(' ').includes(name ?? '')), 'the field shows the chosen name').toBe(true)
  })
})

describe('E: FR-051 E-14 -- the schedule is drawn only on the ground its row bands paint', () => {
  it('every layer of table T-020 sits inside one clip: the Row Area widened by canvasPadding to the vertical bar', () => {
    // see FR-051, EP-5, T-020
    const rows = Array.from({ length: 40 }, (_one, index) => ({ id: `g${index + 1}`, parentId: null }))
    const document = rowDocument(rows, { progressMarkerVisible: false, zoomY: 2 })
    const built = started(document)
    const svg = built.svg()
    const frame = built.loop.current()
    if (frame === undefined || frame === null) throw new Error('no frame')
    const area = frame.regions.rowArea
    const padding = Number(built.loop.document().documentSettings.canvasPadding)
    const clip = /<clipPath id="(grs-ground-clip-[^"]+)"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"\/>/.exec(svg)
    expect(clip, 'a ground clip is drawn').not.toBeNull()
    const [, id, x, y, width, height] = clip as RegExpExecArray
    expect(Number(x)).toBeCloseTo(area.x, 1)
    expect(Number(y)).toBeCloseTo(area.y, 1)
    expect(Number(width), 'up to the left edge of the vertical bar').toBeCloseTo(area.width + padding, 1)
    expect(Number(height), 'down to the Row Area bottom, above the canvasPadding and the horizontal bar').toBeCloseTo(area.height, 1)
    const stack: string[] = []
    let layers = 0
    for (const tag of svg.matchAll(/<(\/?)g\b([^>]*?)(\/?)>/g)) {
      if (tag[1] === '/') {
        stack.pop()
        continue
      }
      if (tag[3] === '/') continue
      const attributes = tag[2] ?? ''
      if (/\bdata-zo="/.test(attributes)) {
        layers += 1
        expect(stack.some((one) => one.includes(`url(#${id})`)), `layer ${attributes}`).toBe(true)
      }
      stack.push(attributes)
    }
    expect(layers, 'premise: layers were drawn').toBeGreaterThan(0)
  })
})
