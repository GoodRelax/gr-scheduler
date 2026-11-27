// Unit tests: the DOM input source (UF-50) turns browser events into human inputs.

import { describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  InputSource,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  domInputSource,
  type InputHost,
  type PointerCaptureTarget,
} from '../../src/framework/dom-input-source/dom-input-source'
// Why: the contract reader takes the copy from the .md at read time, which
// keeps the roster below from falling behind a row added to table T-036.
import { specTable } from '../contract/spec-table'

// Spec: T-036
// Why: SK-1 and SK-1a are absent because their assignment cell is a dash;
// hostKey/hostCode are a common layout's, so only the physical key is shared.
const T_036_KEYS = [
  { row: 'SK-19', hostKey: 'Enter', hostCode: 'Enter', mods: {}, key: 'Enter' },
  { row: 'SK-2', hostKey: 'a', hostCode: 'KeyA', mods: { ctrl: true }, key: 'A' },
  { row: 'SK-3', hostKey: 'Delete', hostCode: 'Delete', mods: {}, key: 'Delete' },
  { row: 'SK-3', hostKey: 'Backspace', hostCode: 'Backspace', mods: {}, key: 'Backspace' },
  { row: 'SK-4', hostKey: 'c', hostCode: 'KeyC', mods: { ctrl: true }, key: 'C' },
  { row: 'SK-5', hostKey: 'v', hostCode: 'KeyV', mods: { ctrl: true }, key: 'V' },
  { row: 'SK-6', hostKey: 'z', hostCode: 'KeyZ', mods: { ctrl: true }, key: 'Z' },
  { row: 'SK-7', hostKey: 'y', hostCode: 'KeyY', mods: { ctrl: true }, key: 'Y' },
  { row: 'SK-7', hostKey: 'Z', hostCode: 'KeyZ', mods: { ctrl: true, shift: true }, key: 'Z' },
  { row: 'SK-8', hostKey: 'Escape', hostCode: 'Escape', mods: {}, key: 'Esc' },
  { row: 'SK-9', hostKey: 'F2', hostCode: 'F2', mods: {}, key: 'F2' },
  { row: 'SK-10', hostKey: 'o', hostCode: 'KeyO', mods: { ctrl: true }, key: 'O' },
  { row: 'SK-25', hostKey: 'n', hostCode: 'KeyN', mods: {}, key: 'N' },
  { row: 'SK-11', hostKey: 's', hostCode: 'KeyS', mods: { ctrl: true }, key: 'S' },
  { row: 'SK-12', hostKey: 'E', hostCode: 'KeyE', mods: { ctrl: true, shift: true }, key: 'E' },
  { row: 'SK-13', hostKey: 'F1', hostCode: 'F1', mods: {}, key: 'F1' },
  { row: 'SK-14', hostKey: 'p', hostCode: 'KeyP', mods: {}, key: 'P' },
  { row: 'SK-15', hostKey: 'F11', hostCode: 'F11', mods: {}, key: 'F11' },
  { row: 'SK-16', hostKey: '+', hostCode: 'Equal', mods: { shift: true }, key: '+' },
  { row: 'SK-16b', hostKey: '_', hostCode: 'Minus', mods: { shift: true }, key: '-' },
  { row: 'SK-16a', hostKey: '=', hostCode: 'Equal', mods: { alt: true }, key: '+' },
  { row: 'SK-16c', hostKey: '-', hostCode: 'Minus', mods: { alt: true }, key: '-' },
  { row: 'SK-22', hostKey: '+', hostCode: 'Equal', mods: { ctrl: true, shift: true }, key: '+' },
  { row: 'SK-23', hostKey: '_', hostCode: 'Minus', mods: { ctrl: true, shift: true }, key: '-' },
  { row: 'SK-18', hostKey: 'f', hostCode: 'KeyF', mods: {}, key: 'F' },
  { row: 'SK-20', hostKey: 'd', hostCode: 'KeyD', mods: { ctrl: true, shift: true }, key: 'D' },
  // Spec: SK-21
  { row: 'SK-21', hostKey: 'r', hostCode: 'KeyR', mods: { ctrl: true }, key: 'R' },
  // Spec: SK-24, FR-151
  { row: 'SK-24', hostKey: 'f', hostCode: 'KeyF', mods: { ctrl: true }, key: 'F' },
] as const

// Why: the sign keys are recognized by the physical key, and the keypad is
// the second physical key that produces each of them.
const T_036_NUMPAD = [
  { row: 'SK-16', hostKey: '+', hostCode: 'NumpadAdd', mods: { shift: true }, key: '+' },
  { row: 'SK-16b', hostKey: '-', hostCode: 'NumpadSubtract', mods: { shift: true }, key: '-' },
  { row: 'SK-22', hostKey: '+', hostCode: 'NumpadAdd', mods: { ctrl: true, shift: true }, key: '+' },
  { row: 'SK-23', hostKey: '-', hostCode: 'NumpadSubtract', mods: { ctrl: true, shift: true }, key: '-' },
] as const

// Spec: MK-6, MK-7, MK-8, MK-11
// Why: the right button has no row but is carried, because MK-10 needs to
// see the press was not this tool's; no row assigns buttons 3 and 4.
const T_023_BUTTONS = [
  { hostButton: 0, button: 'left', assigned: true },
  { hostButton: 1, button: 'middle', assigned: true },
  { hostButton: 2, button: 'right', assigned: true },
  { hostButton: 3, button: null, assigned: false },
  { hostButton: 4, button: null, assigned: false },
] as const

// Spec: MK-1, MK-4, MK-5, S-96, S-53
// Why: the divisors (40 px a line, 100 px a notch, 3 lines a notch, the
// window for a page) are a recommendation, not decided; these cases pin it.
const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2

const HOST_INNER_WIDTH = 1280
const HOST_INNER_HEIGHT = 800

const WHEEL_TURNS = [
  {
    why: 'one notch reported in pixels',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 100,
    notches: 1,
    scrollPx: { x: 0, y: 100 },
  },
  {
    why: 'the same turn away from the person',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: -100,
    notches: -1,
    scrollPx: { x: 0, y: -100 },
  },
  {
    why: 'a trackpad turn smaller than one notch',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 50,
    notches: 0.5,
    scrollPx: { x: 0, y: 50 },
  },
  {
    why: 'one notch reported in lines',
    deltaMode: DOM_DELTA_LINE,
    deltaX: 0,
    deltaY: 3,
    notches: 1,
    scrollPx: { x: 0, y: 120 },
  },
  {
    why: 'a turn of nothing at all',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 0,
    notches: 0,
    scrollPx: { x: 0, y: 0 },
  },
] as const

// Why: no row states what a sideways or page detent is worth, so notches is
// left out on purpose; the pixels are exact and the detents only nonzero.
const TURNS_WHOSE_DETENTS_NO_ROW_STATES = [
  {
    why: 'sideways, reported in pixels (MK-5)',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 100,
    deltaY: 0,
    scrollPx: { x: 100, y: 0 },
  },
  {
    why: 'sideways, reported in lines (MK-3 as a common host reports it)',
    deltaMode: DOM_DELTA_LINE,
    deltaX: 3,
    deltaY: 0,
    scrollPx: { x: 120, y: 0 },
  },
  {
    why: 'sideways by a page, measured in the host own window',
    deltaMode: DOM_DELTA_PAGE,
    deltaX: 1,
    deltaY: 0,
    scrollPx: { x: HOST_INNER_WIDTH, y: 0 },
  },
  {
    why: 'down by a page, measured in the host own window (MK-1)',
    deltaMode: DOM_DELTA_PAGE,
    deltaX: 0,
    deltaY: 1,
    scrollPx: { x: 0, y: HOST_INNER_HEIGHT },
  },
] as const

// Spec: MK-13
// Why: 500 ms and 4 px are a recommendation, not in the spec, measured
// press-to-press per button; these runs fail if it is reversed.
const MK_13_RUNS = [
  {
    why: 'two presses inside the interval, at the same point',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 400, dx: 0, hostButton: 0, count: 2 },
    ],
  },
  {
    why: 'two presses too far apart in time',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 900, dx: 0, hostButton: 0, count: 1 },
    ],
  },
  {
    why: 'two presses too far apart in place',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 400, dx: 10, hostButton: 0, count: 1 },
    ],
  },
  {
    why: 'two presses a hand tremor apart',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 400, dx: 3, hostButton: 0, count: 2 },
    ],
  },
  {
    why: 'three presses in a row',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 100, dx: 0, hostButton: 0, count: 2 },
      { afterMs: 100, dx: 0, hostButton: 0, count: 3 },
    ],
  },
  {
    // Why: a double click is two presses of the same button, so another button
    // inside the interval begins a run of its own.
    why: 'another button inside the interval does not continue the run',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 100, dx: 0, hostButton: 2, count: 1 },
    ],
  },
] as const

// Spec: NFR-010, IN-1, MK-10
const NOT_LISTENED_FOR = [
  { type: 'resize', why: 'FT-3 of 表 T-078 -- the shell observes the size' },
  { type: 'scroll', why: 'FT-3 of 表 T-078' },
  { type: 'blur', why: 'not a trigger 表 T-078 lists (NFR-010)' },
  { type: 'focus', why: 'not a trigger 表 T-078 lists (NFR-010)' },
  { type: 'visibilitychange', why: 'not a trigger 表 T-078 lists (NFR-010)' },
  { type: 'contextmenu', why: 'MK-10 -- the right button has no row in 表 T-023' },
  { type: 'pointerout', why: 'IN-1 -- leaving is not an interruption (MUST NOT)' },
  { type: 'pointerleave', why: 'IN-1 -- leaving is not an interruption (MUST NOT)' },
  { type: 'pointerover', why: 'IN-1 -- entering is not a happening either' },
  { type: 'mouseleave', why: 'IN-1 -- leaving is not an interruption (MUST NOT)' },
  { type: 'mousedown', why: 'IN-1a needs the pointer identity a mouse event lacks' },
  { type: 'click', why: 'IN-1 -- down and up are separate happenings' },
  { type: 'dblclick', why: 'MK-13 is counted here, not taken from the host' },
  { type: 'keyup', why: '表 T-036 assigns nothing to a release' },
  { type: 'keypress', why: '表 T-036 assigns nothing to it' },
] as const

const LISTENED_FOR = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'lostpointercapture',
  'wheel',
  'keydown',
] as const

// Why: a passive listener cannot stop the browser, and a window's wheel is
// passive by default, so leaving it out would let the page zoom under MK-2.
const MUST_NOT_BE_PASSIVE = ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown'] as const

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const modifiersOf = (over: Partial<InputModifiers>): InputModifiers => ({ ...NO_MODIFIERS, ...over })

// Why: the fake carries only the members InputHost and PointerCaptureTarget
// declare, so a unit that reached for another would fail rather than pass.

interface Registration {
  readonly type: string
  readonly listener: EventListenerOrEventListenerObject
  readonly capture: boolean
}

type Fake<T> = T & { preventDefault(): void; preventedCount(): number }

function withPreventDefault<T extends object>(fields: T): Fake<T> {
  let prevented = 0
  return {
    ...fields,
    preventDefault(): void {
      prevented += 1
    },
    preventedCount(): number {
      return prevented
    },
  }
}

const captureOf = (options: boolean | AddEventListenerOptions | undefined): boolean =>
  typeof options === 'boolean' ? options : (options?.capture ?? false)

interface HostOptions {
  readonly innerWidth?: number
  readonly innerHeight?: number
}

interface FakeHost {
  readonly host: InputHost
  readonly added: readonly Registration[]
  readonly removed: readonly Registration[]
  optionsFor(type: string): boolean | AddEventListenerOptions | undefined
  live(): readonly Registration[]
  readonly captureCalls: string[]
  send(type: string, event: object): void
}

const isSameRegistration = (a: Registration, b: Registration): boolean =>
  a.type === b.type && a.listener === b.listener && a.capture === b.capture

function fakeHost(options: HostOptions = {}): FakeHost {
  const added: Registration[] = []
  const removed: Registration[] = []
  // Why: the live set is its own list, not derived from the two logs: a
  // handler registered, removed and registered again is live at the end.
  const alive: Registration[] = []
  const optionsByType = new Map<string, boolean | AddEventListenerOptions | undefined>()
  const captureCalls: string[] = []
  let held: number | null = null

  const documentElement: PointerCaptureTarget = {
    setPointerCapture(pointerId: number): void {
      captureCalls.push(`set:${pointerId}`)
      held = pointerId
    },
    releasePointerCapture(pointerId: number): void {
      captureCalls.push(`release:${pointerId}`)
      if (held === pointerId) held = null
    },
    hasPointerCapture(pointerId: number): boolean {
      captureCalls.push(`has:${pointerId}`)
      return held === pointerId
    },
  }

  const host: InputHost = {
    addEventListener(type, listener, listenerOptions): void {
      const made: Registration = { type, listener, capture: captureOf(listenerOptions) }
      added.push(made)
      optionsByType.set(type, listenerOptions)
      // Why: a host ignores a second registration of the same triple; without
      // this a unit that registered twice would look as if it reported twice.
      if (!alive.some((one) => isSameRegistration(one, made))) alive.push(made)
    },
    removeEventListener(type, listener, listenerOptions): void {
      const gone: Registration = { type, listener, capture: captureOf(listenerOptions) }
      removed.push(gone)
      const at = alive.findIndex((one) => isSameRegistration(one, gone))
      if (at >= 0) alive.splice(at, 1)
    },
    innerWidth: options.innerWidth ?? HOST_INNER_WIDTH,
    innerHeight: options.innerHeight ?? HOST_INNER_HEIGHT,
    document: { documentElement },
  }

  return {
    host,
    added,
    removed,
    captureCalls,
    optionsFor: (type) => optionsByType.get(type),
    live: () => [...alive],
    send(type, event): void {
      for (const one of alive.filter((each) => each.type === type)) {
        if (typeof one.listener === 'function') one.listener(event as unknown as Event)
        else one.listener.handleEvent(event as unknown as Event)
      }
    },
  }
}

interface PointerFields {
  pointerId: number
  button: number
  clientX: number
  clientY: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  timeStamp: number
  // Why: unlike clientX/clientY on purpose; the pointer tables are read in
  // the window's frame, so a unit reading these would place everything elsewhere.
  pageX: number
  pageY: number
  screenX: number
  screenY: number
  offsetX: number
  offsetY: number
}

function hostPointer(over: Partial<PointerFields> = {}): Fake<PointerFields> {
  return withPreventDefault<PointerFields>({
    pointerId: 7,
    button: 0,
    clientX: 100,
    clientY: 50,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    timeStamp: 1000,
    pageX: -11,
    pageY: -12,
    screenX: -21,
    screenY: -22,
    offsetX: -31,
    offsetY: -32,
    ...over,
  })
}

interface WheelFields {
  clientX: number
  clientY: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  timeStamp: number
  deltaX: number
  deltaY: number
  deltaMode: number
  pageX: number
  pageY: number
}

function hostWheel(over: Partial<WheelFields> = {}): Fake<WheelFields> {
  return withPreventDefault<WheelFields>({
    clientX: 200,
    clientY: 120,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    timeStamp: 2000,
    deltaX: 0,
    deltaY: 100,
    deltaMode: DOM_DELTA_PIXEL,
    pageX: -11,
    pageY: -12,
    ...over,
  })
}

interface KeyFields {
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  timeStamp: number
}

function hostKey(over: Partial<KeyFields> = {}): Fake<KeyFields> {
  return withPreventDefault<KeyFields>({
    key: 'Escape',
    code: 'Escape',
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    timeStamp: 3000,
    ...over,
  })
}

const withMods = <T extends { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }>(
  mods: Partial<InputModifiers>,
): Partial<T> =>
  ({
    ctrlKey: mods.ctrl ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
    metaKey: mods.meta ?? false,
  }) as Partial<T>

interface Harness {
  readonly fake: FakeHost
  readonly source: InputSource
  readonly heard: HumanInput[]
  readonly asked: HumanInput[]
  readonly order: string[]
  answer(next: boolean | ((input: HumanInput) => boolean)): void
  watch(): void
}

function harness(options: HostOptions = {}): Harness {
  const fake = fakeHost(options)
  const heard: HumanInput[] = []
  const asked: HumanInput[] = []
  const order: string[] = []
  let answer: (input: HumanInput) => boolean = () => false

  const source = domInputSource(fake.host, (input) => {
    asked.push(input)
    order.push('ask')
    return answer(input)
  })

  return {
    fake,
    source,
    heard,
    asked,
    order,
    answer(next): void {
      answer = typeof next === 'function' ? next : () => next
    },
    watch(): void {
      source.watchInput((input) => {
        heard.push(input)
        order.push('hear')
      })
    },
  }
}

function pressAndRelease(
  run: Harness,
  over: Partial<PointerFields> = {},
): { down: Fake<PointerFields>; up: Fake<PointerFields> } {
  const down = hostPointer(over)
  run.fake.send('pointerdown', down)
  const up = hostPointer({ ...over, timeStamp: (over.timeStamp ?? 1000) + 10 })
  run.fake.send('pointerup', up)
  return { down, up }
}

const pointers = (run: Harness): readonly PointerInput[] =>
  run.heard.filter((one): one is PointerInput => one.kind === 'pointer')

describe('the rosters these cases walk are the ones the tables state', () => {
  it('names every row of 表 T-036 that carries an assignment', () => {
    const assigned = specTable('T-036')
      .rows.filter((row) => !/^[—-]$/.test((row.by['割当'] ?? '').trim()))
      .map((row) => row.id)
    const covered = new Set<string>([
      ...T_036_KEYS.map((one) => one.row),
      ...T_036_NUMPAD.map((one) => one.row),
    ])
    expect(assigned.length).toBeGreaterThan(0)
    expect(assigned.filter((id) => !covered.has(id))).toEqual([])
  })

  it('leaves out only the rows whose assignment cell is `—` (SK-1 / SK-1a)', () => {
    const unassigned = specTable('T-036')
      .rows.filter((row) => /^[—-]$/.test((row.by['割当'] ?? '').trim()))
      .map((row) => row.id)
    expect(unassigned).toEqual(['SK-1', 'SK-1a'])
  })

  it('runs where no browser exists, so a reach for a global would fail (R7.3)', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined')
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined')
    expect(typeof (globalThis as { PointerEvent?: unknown }).PointerEvent).toBe('undefined')
    expect(typeof (globalThis as { WheelEvent?: unknown }).WheelEvent).toBe('undefined')
  })
})

describe('IF-2 of 表 T-065 -- the seam this unit implements', () => {
  it('publishes watchInput and unwatchInput, and nothing beside them', () => {
    const run = harness()
    expect(Object.keys(run.source).sort()).toEqual(['unwatchInput', 'watchInput'])
    expect(typeof run.source.watchInput).toBe('function')
    expect(typeof run.source.unwatchInput).toBe('function')
  })

  it('registers nothing until someone watches (NFR-010: no frame without a trigger)', () => {
    const run = harness()
    expect(run.fake.added).toEqual([])
    expect(run.fake.captureCalls).toEqual([])
  })

  it('reports no size, no time and no date on any happening (the note under 表 T-078)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer())
    run.fake.send('wheel', hostWheel())
    run.fake.send('keydown', hostKey())

    const forbidden = ['timeStamp', 'time', 'at', 'width', 'height', 'innerWidth', 'innerHeight']
    for (const input of run.heard) {
      for (const name of forbidden) {
        expect(Object.keys(input)).not.toContain(name)
      }
    }
  })

  it('does nothing when unwatchInput is called with nothing watching', () => {
    const run = harness()
    expect(() => run.source.unwatchInput()).not.toThrow()
    expect(run.fake.removed).toEqual([])
    expect(run.fake.captureCalls).toEqual([])
  })

  it('keeps one watcher, replaced by a second call rather than added to', () => {
    const run = harness()
    const first: HumanInput[] = []
    const second: HumanInput[] = []
    run.source.watchInput((input) => first.push(input))
    run.source.watchInput((input) => second.push(input))
    run.fake.send('keydown', hostKey())

    expect(first).toEqual([])
    expect(second).toHaveLength(1)
  })

  it('stops reporting after unwatchInput, and takes its registrations back', () => {
    const run = harness()
    run.watch()
    run.source.unwatchInput()

    expect(run.fake.live()).toEqual([])
    for (const type of LISTENED_FOR) {
      run.fake.send(type, hostPointer())
    }
    expect(run.heard).toEqual([])
  })

  it('can be watched again after unwatchInput', () => {
    const run = harness()
    run.watch()
    run.source.unwatchInput()
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'F1', code: 'F1' }))

    expect(run.heard).toHaveLength(1)
  })
})

describe('FT-1 of 表 T-078 -- seven listeners, every one a pointer or a key', () => {
  it('registers exactly the seven, on the window itself (MK-10)', () => {
    const run = harness()
    run.watch()
    expect(run.fake.added.map((one) => one.type).sort()).toEqual([...LISTENED_FOR].sort())
  })

  it('registers none of the happenings no table lists (one case walks the roster)', () => {
    const run = harness()
    run.watch()
    const registered = new Set(run.fake.added.map((one) => one.type))
    const wrong = NOT_LISTENED_FOR.filter((one) => registered.has(one.type))
    expect(wrong.map((one) => `${one.type} -- ${one.why}`)).toEqual([])
  })

  it('registers no listener passively where MK-10 has to stop the browser', () => {
    const run = harness()
    run.watch()
    for (const type of MUST_NOT_BE_PASSIVE) {
      const options = run.fake.optionsFor(type)
      expect(typeof options === 'object' && options !== null && options.passive).toBe(false)
    }
  })

  it('removes every listener it registered, and no other', () => {
    const run = harness()
    run.watch()
    const registered = run.fake.added.map((one) => `${one.type}/${one.capture}`)
    run.source.unwatchInput()
    const taken = run.fake.removed.map((one) => `${one.type}/${one.capture}`)

    expect(taken.sort()).toEqual(registered.sort())
    for (const one of run.fake.removed) {
      expect(run.fake.added.some((made) => made.listener === one.listener)).toBe(true)
    }
  })
})

describe('IN-1 -- a pointer operation settles on release, not on press', () => {
  it('reports the press, the moves and the release as four happenings', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ clientX: 100, clientY: 50, timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ clientX: 140, clientY: 60, timeStamp: 1050 }))
    run.fake.send('pointermove', hostPointer({ clientX: 180, clientY: 70, timeStamp: 1080 }))
    run.fake.send('pointerup', hostPointer({ clientX: 180, clientY: 70, timeStamp: 1100 }))

    expect(run.heard).toEqual([
      { kind: 'pointer', phase: 'down', button: 'left', x: 100, y: 50, modifiers: NO_MODIFIERS, clickCount: 1 },
      { kind: 'pointer', phase: 'move', button: 'left', x: 140, y: 60, modifiers: NO_MODIFIERS, clickCount: 1 },
      { kind: 'pointer', phase: 'move', button: 'left', x: 180, y: 70, modifiers: NO_MODIFIERS, clickCount: 1 },
      { kind: 'pointer', phase: 'up', button: 'left', x: 180, y: 70, modifiers: NO_MODIFIERS, clickCount: 1 },
    ])
  })

  it('reads the position from the window frame of reference (表 T-023a 〜 T-023d)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ clientX: 640, clientY: 400 }))

    expect(pointers(run)[0]?.x).toBe(640)
    expect(pointers(run)[0]?.y).toBe(400)
  })

  it('keeps reporting a drag that has run past the window (MUST NOT read it as an interruption)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ clientX: 10, clientY: 10, timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ clientX: -400, clientY: -300, timeStamp: 1050 }))
    run.fake.send('pointermove', hostPointer({ clientX: 4000, clientY: 3000, timeStamp: 1080 }))
    run.fake.send('pointerup', hostPointer({ clientX: 4000, clientY: 3000, timeStamp: 1100 }))

    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'move', 'move', 'up'])
    expect(pointers(run).some((one) => one.phase === 'lost')).toBe(false)
  })

  it('holds the pointer on the long-lived root element so the drag keeps arriving', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 7 }))

    expect(run.fake.captureCalls).toContain('set:7')
  })

  it('gives the pointer back when the gesture settles', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { pointerId: 7 })

    expect(run.fake.captureCalls).toContain('release:7')
  })

  it('holds only a press this tool assigned, and still settles one it did not (PND-94)', () => {
    // Why: holding an unassigned press would send its compatibility mouse events away from a
    // text field; the undecided choice not to hold it rests IN-1a on the host's capture.
    const run = harness()
    run.answer((input) => input.kind === 'pointer' && input.button === 'left')
    run.watch()

    run.fake.send('pointerdown', hostPointer({ button: 2, pointerId: 3, timeStamp: 1000 }))
    expect(run.fake.captureCalls.filter((one) => one.startsWith('set:'))).toEqual([])

    run.fake.send('pointerup', hostPointer({ button: 2, pointerId: 3, timeStamp: 1100 }))
    expect(pointers(run).map((one) => `${one.phase}/${one.button}`)).toEqual([
      'down/right',
      'up/right',
    ])

    run.fake.send('pointerdown', hostPointer({ button: 0, pointerId: 4, timeStamp: 1400 }))
    expect(run.fake.captureCalls).toContain('set:4')
  })
})

describe('表 T-023 -- the buttons (one case walks the roster)', () => {
  it('maps the host numbering onto PointerButton, and drops what no row names', () => {
    for (const row of T_023_BUTTONS) {
      const run = harness()
      run.watch()
      run.fake.send('pointerdown', hostPointer({ button: row.hostButton }))

      if (row.assigned) {
        expect(pointers(run).map((one) => one.button)).toEqual([row.button])
      } else {
        expect(run.heard).toEqual([])
      }
    }
  })

  it('reports the right button although no row assigns it (MK-10 needs the difference)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 2 }))

    expect(pointers(run)[0]?.button).toBe('right')
  })

  it('carries the press button on every move and release of that gesture (MK-8)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 1, timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ button: -1, timeStamp: 1050 }))
    run.fake.send('pointerup', hostPointer({ button: 1, timeStamp: 1100 }))

    expect(pointers(run).map((one) => one.button)).toEqual(['middle', 'middle', 'middle'])
  })
})

describe('IN-1a -- the drag ends as an abort when the pointer is lost (表 T-035 AG-9)', () => {
  it('turns pointercancel into a lost that carries what the press carried', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 1, clientX: 100, clientY: 50, timeStamp: 1000 }))
    run.fake.send('pointercancel', hostPointer({ button: 1, clientX: 300, clientY: 90, timeStamp: 1100 }))

    expect(pointers(run)[1]).toEqual({
      kind: 'pointer',
      phase: 'lost',
      button: 'middle',
      x: 300,
      y: 90,
      modifiers: NO_MODIFIERS,
      clickCount: 1,
    })
  })

  it('turns lostpointercapture during a gesture into a lost', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1000 }))
    run.fake.send('lostpointercapture', hostPointer({ timeStamp: 1100 }))

    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'lost'])
  })

  it('does not abort a settled gesture after the fact (lostpointercapture after an up)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    run.fake.send('lostpointercapture', hostPointer({ timeStamp: 1200 }))

    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'up'])
  })

  it('reports nothing at all when no gesture was in flight', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointercancel', hostPointer())
    run.fake.send('lostpointercapture', hostPointer())

    expect(run.heard).toEqual([])
  })

  it('carries the press count on the lost, so a double click abort is still a double', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1200 }))
    run.fake.send('pointercancel', hostPointer({ timeStamp: 1300 }))

    expect(pointers(run).at(-1)?.clickCount).toBe(2)
  })

  it('leaves the gesture ended, so the next press starts a fresh one', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 1, timeStamp: 1000 }))
    run.fake.send('pointercancel', hostPointer({ button: 1, timeStamp: 1100 }))
    run.fake.send('pointermove', hostPointer({ button: -1, timeStamp: 1200 }))

    expect(pointers(run).at(-1)).toEqual({
      kind: 'pointer',
      phase: 'move',
      button: 'left',
      x: 100,
      y: 50,
      modifiers: NO_MODIFIERS,
      clickCount: 0,
    })
  })

  it('gives the pointer back when the gesture is aborted', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 9 }))
    const before = run.fake.captureCalls.length
    run.fake.send('pointercancel', hostPointer({ pointerId: 9 }))

    expect(run.fake.captureCalls.slice(before)).toContain('release:9')
  })

  it('drops the gesture and gives the pointer back when watching stops (AG-9)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 5 }))
    const before = run.heard.length
    run.source.unwatchInput()

    expect(run.fake.captureCalls).toContain('release:5')
    expect(run.heard).toHaveLength(before)

    run.watch()
    run.fake.send('pointermove', hostPointer({ timeStamp: 1500 }))
    expect(pointers(run).at(-1)?.clickCount).toBe(0)
  })
})

describe('MK-10 -- the browser is stopped only for an input this tool assigned', () => {
  it('stops the browser when the answer says the input was assigned', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    const event = hostKey({ key: 's', code: 'KeyS', ctrlKey: true })
    run.fake.send('keydown', event)

    expect(event.preventedCount()).toBe(1)
  })

  it('leaves the browser alone when the answer says it was not (MUST NOT)', () => {
    const run = harness()
    run.answer(false)
    run.watch()
    const event = hostKey({ key: 'p', code: 'KeyP', ctrlKey: true })
    run.fake.send('keydown', event)

    expect(event.preventedCount()).toBe(0)
    expect(run.heard).toHaveLength(1)
  })

  it('asks about the very happening it is about to report', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('wheel', hostWheel({ ctrlKey: true }))

    expect(run.asked).toEqual(run.heard)
  })

  it('asks BEFORE the watcher runs, so Esc is judged against the state it consumes (IN-4)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'Escape', code: 'Escape' }))
    run.fake.send('pointerdown', hostPointer())
    run.fake.send('wheel', hostWheel())

    expect(run.order).toEqual(['ask', 'hear', 'ask', 'hear', 'ask', 'hear'])
  })

  it('never asks about a lost happening, and never stops the browser for one (IN-1a)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1000 }))
    const asked = run.asked.length
    const cancel = hostPointer({ timeStamp: 1100 })
    run.fake.send('pointercancel', cancel)

    expect(run.asked).toHaveLength(asked)
    expect(cancel.preventedCount()).toBe(0)
    expect(pointers(run).at(-1)?.phase).toBe('lost')
  })

  it('lets Esc reach the browser when there is nothing to consume (IN-4a, MUST)', () => {
    // Why: IN-4a is why MK-10's answer is injected: with nothing to consume the
    // caller answers false, and the key must reach the browser.
    const run = harness()
    run.answer((input) => input.kind !== 'key' || input.key !== 'Esc')
    run.watch()
    const escape = hostKey({ key: 'Escape', code: 'Escape' })
    const other = hostKey({ key: 'f', code: 'KeyF' })
    run.fake.send('keydown', escape)
    run.fake.send('keydown', other)

    expect(escape.preventedCount()).toBe(0)
    expect(other.preventedCount()).toBe(1)
  })

  it('lets Ctrl+C and Ctrl+V through during unsettled text entry (IN-5a, MUST)', () => {
    // Why: no special case is needed: the caller answers false while text entry
    // is unsettled, so the pair reach the browser.
    const run = harness()
    run.answer(false)
    run.watch()
    const copy = hostKey({ key: 'c', code: 'KeyC', ctrlKey: true })
    const paste = hostKey({ key: 'v', code: 'KeyV', ctrlKey: true })
    run.fake.send('keydown', copy)
    run.fake.send('keydown', paste)

    expect(copy.preventedCount()).toBe(0)
    expect(paste.preventedCount()).toBe(0)
    expect(run.heard.map((one) => (one.kind === 'key' ? one.key : one.kind))).toEqual(['C', 'V'])
  })

  // Spec: MK-12, MK-10
  it('leaves an unassigned modifier drag to the browser (MK-12, MUST NOT)', () => {
    const run = harness()
    run.answer(false)
    run.watch()
    const altDrag = hostPointer({ altKey: true, timeStamp: 1000 })
    run.fake.send('pointerdown', altDrag)
    run.fake.send('pointermove', hostPointer({ altKey: true, clientX: 160, timeStamp: 1040 }))
    run.fake.send('pointerup', hostPointer({ altKey: true, clientX: 160, timeStamp: 1080 }))

    expect(altDrag.preventedCount()).toBe(0)
    expect(run.fake.captureCalls.filter((one) => one.startsWith('set:'))).toEqual([])
    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'move', 'up'])
  })

  it('stops the browser exactly once for one happening', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    const event = hostWheel({ ctrlKey: true })
    run.fake.send('wheel', event)

    expect(event.preventedCount()).toBe(1)
  })

  it('asks nothing and stops nothing while no one is watching', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.source.unwatchInput()
    const event = hostKey({ key: 's', code: 'KeyS', ctrlKey: true })
    run.fake.send('keydown', event)

    expect(run.asked).toEqual([])
    expect(event.preventedCount()).toBe(0)
  })
})

describe('MK-12 -- all four modifiers travel together on every happening', () => {
  const COMBINATIONS: readonly Partial<InputModifiers>[] = [
    {},
    { ctrl: true },
    { shift: true },
    { alt: true },
    { meta: true },
    { ctrl: true, shift: true },
    { ctrl: true, alt: true },
    { ctrl: true, shift: true, alt: true, meta: true },
  ]

  it('carries them on a pointer happening', () => {
    for (const mods of COMBINATIONS) {
      const run = harness()
      run.watch()
      run.fake.send('pointerdown', hostPointer(withMods<PointerFields>(mods)))
      expect(run.heard[0]?.modifiers).toEqual(modifiersOf(mods))
    }
  })

  it('carries them on a wheel happening', () => {
    for (const mods of COMBINATIONS) {
      const run = harness()
      run.watch()
      run.fake.send('wheel', hostWheel(withMods<WheelFields>(mods)))
      expect(run.heard[0]?.modifiers).toEqual(modifiersOf(mods))
    }
  })

  it('carries them on a key happening', () => {
    for (const mods of COMBINATIONS) {
      const run = harness()
      run.watch()
      run.fake.send('keydown', hostKey({ key: 'f', code: 'KeyF', ...withMods<KeyFields>(mods) }))
      expect(run.heard[0]?.modifiers).toEqual(modifiersOf(mods))
    }
  })

  it('carries them on a move and a release too, as they stood at that moment', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ timeStamp: 1050, shiftKey: true }))
    run.fake.send('pointerup', hostPointer({ timeStamp: 1100, shiftKey: true, altKey: true }))

    expect(run.heard.map((one) => one.modifiers)).toEqual([
      NO_MODIFIERS,
      modifiersOf({ shift: true }),
      modifiersOf({ shift: true, alt: true }),
    ])
  })
})

describe('MK-13 -- the count of presses in a row (one case walks the runs)', () => {
  it('answers the count each press of each run must carry', () => {
    for (const run of MK_13_RUNS) {
      const test = harness()
      test.watch()
      let at = 1000
      let x = 100
      const counts: number[] = []
      for (const press of run.presses) {
        at += press.afterMs
        x += press.dx
        test.fake.send('pointerdown', hostPointer({ button: press.hostButton, clientX: x, timeStamp: at }))
        at += 10
        test.fake.send('pointerup', hostPointer({ button: press.hostButton, clientX: x, timeStamp: at }))
        counts.push(pointers(test).at(-2)?.clickCount ?? -1)
      }
      expect({ why: run.why, counts }).toEqual({
        why: run.why,
        counts: run.presses.map((press) => press.count),
      })
    }
  })

  it('gives the release the same count as its press', () => {
    const run = harness()
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    pressAndRelease(run, { timeStamp: 1300 })

    expect(pointers(run).map((one) => one.clickCount)).toEqual([1, 1, 2, 2])
  })

  it('gives a move the count of the press that began the gesture', () => {
    const run = harness()
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1300 }))
    run.fake.send('pointermove', hostPointer({ timeStamp: 1320 }))

    expect(pointers(run).at(-1)?.clickCount).toBe(2)
  })

  it('answers 0 for a move with no press in flight', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointermove', hostPointer({ timeStamp: 1000 }))

    expect(pointers(run).at(-1)).toEqual({
      kind: 'pointer',
      phase: 'move',
      button: 'left',
      x: 100,
      y: 50,
      modifiers: NO_MODIFIERS,
      clickCount: 0,
    })
  })

  it('reads the moment off the event, not off a clock it was handed', () => {
    // Why: the host reports the presses 100 ms apart on its own timeline, the
    // only one the seam mentions; a unit reading Date.now() would answer 1.
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 5_000_000 }))
    run.fake.send('pointerup', hostPointer({ timeStamp: 5_000_010 }))
    run.fake.send('pointerdown', hostPointer({ timeStamp: 5_000_100 }))

    expect(pointers(run).at(-1)?.clickCount).toBe(2)
  })
})

describe('MK-1 〜 MK-5 -- one wheel happening carries detents and pixels', () => {
  it('answers both magnitudes for every way a host reports a turn (one case walks the roster)', () => {
    for (const turn of WHEEL_TURNS) {
      const run = harness()
      run.watch()
      run.fake.send(
        'wheel',
        hostWheel({ deltaMode: turn.deltaMode, deltaX: turn.deltaX, deltaY: turn.deltaY }),
      )

      expect({ why: turn.why, heard: run.heard[0] }).toEqual({
        why: turn.why,
        heard: {
          kind: 'wheel',
          x: 200,
          y: 120,
          modifiers: NO_MODIFIERS,
          notches: turn.notches,
          scrollPx: { x: turn.scrollPx.x, y: turn.scrollPx.y },
        },
      })
    }
  })

  it('answers the pixels exactly, and some detents, for the turns no row measures', () => {
    for (const turn of TURNS_WHOSE_DETENTS_NO_ROW_STATES) {
      const run = harness()
      run.watch()
      run.fake.send(
        'wheel',
        hostWheel({
          deltaMode: turn.deltaMode,
          deltaX: turn.deltaX,
          deltaY: turn.deltaY,
          shiftKey: true,
        }),
      )
      const heard = run.heard[0]

      expect({ why: turn.why, scrollPx: heard?.kind === 'wheel' ? heard.scrollPx : null }).toEqual({
        why: turn.why,
        scrollPx: { x: turn.scrollPx.x, y: turn.scrollPx.y },
      })
      expect(heard?.kind === 'wheel' && heard.notches !== 0).toBe(true)
    }
  })

  it('reports where the pointer was, because MK-2 zooms about that point', () => {
    const run = harness()
    run.watch()
    run.fake.send('wheel', hostWheel({ clientX: 640, clientY: 400 }))

    expect(run.heard[0]).toMatchObject({ kind: 'wheel', x: 640, y: 400 })
  })

  it('measures a page in the host own window, not in an invented page size', () => {
    const tall = harness({ innerWidth: 400, innerHeight: 300 })
    tall.watch()
    tall.fake.send('wheel', hostWheel({ deltaMode: DOM_DELTA_PAGE, deltaX: 1, deltaY: 1 }))

    expect(tall.heard[0]).toMatchObject({ scrollPx: { x: 400, y: 300 } })
  })

  it('does not settle which row a turn belongs to -- the modifiers travel unread', () => {
    const run = harness()
    run.watch()
    run.fake.send('wheel', hostWheel({ ctrlKey: true, shiftKey: true }))

    expect(run.heard[0]).toMatchObject({
      kind: 'wheel',
      modifiers: modifiersOf({ ctrl: true, shift: true }),
      notches: 1,
    })
  })
})

describe('表 T-036 -- the key is spelled as the assignment column spells it', () => {
  it('maps every assigned row from what a host reports (one case walks the table)', () => {
    const wrong: string[] = []
    for (const row of [...T_036_KEYS, ...T_036_NUMPAD]) {
      const run = harness()
      run.watch()
      run.fake.send(
        'keydown',
        hostKey({ key: row.hostKey, code: row.hostCode, ...withMods<KeyFields>(row.mods) }),
      )
      const heard = run.heard[0]
      const key = heard?.kind === 'key' ? heard.key : '(nothing reported)'
      if (key !== row.key) {
        wrong.push(`${row.row}: host ${row.hostKey}/${row.hostCode} answered ${key}, wants ${row.key}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('carries the modifiers beside the key, so the case of a letter means nothing else', () => {
    const run = harness()
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'p', code: 'KeyP' }))
    run.fake.send('keydown', hostKey({ key: 'P', code: 'KeyP', shiftKey: true }))

    expect(run.heard).toEqual([
      { kind: 'key', key: 'P', modifiers: NO_MODIFIERS },
      { kind: 'key', key: 'P', modifiers: modifiersOf({ shift: true }) },
    ])
  })

  it('reports a key no row assigns rather than swallowing it (PND-95)', () => {
    const run = harness()
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'ArrowUp', code: 'ArrowUp' }))

    expect(run.heard).toEqual([{ kind: 'key', key: 'ArrowUp', modifiers: NO_MODIFIERS }])
  })

  it('reports no release: 表 T-036 assigns nothing to one', () => {
    const run = harness()
    run.watch()
    expect(run.fake.added.map((one) => one.type)).not.toContain('keyup')
  })
})

// Why: a throwing capture API is not tested: InputSource has no channel to
// answer with, and no requirement chooses swallowing or letting it out.
describe('the happenings that arrive out of order', () => {
  it('does not throw on a release with no press before it', () => {
    const run = harness()
    run.watch()
    expect(() => run.fake.send('pointerup', hostPointer())).not.toThrow()
  })

  it('does not throw on a second release of the same gesture', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    expect(() => run.fake.send('pointerup', hostPointer({ timeStamp: 1200 }))).not.toThrow()
  })

  it('does not throw on a press that is never released', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 1, timeStamp: 1000 }))
    expect(() => run.fake.send('pointerdown', hostPointer({ pointerId: 2, timeStamp: 1100 }))).not.toThrow()
  })

  it('does not throw when unwatchInput is called twice', () => {
    const run = harness()
    run.watch()
    run.source.unwatchInput()
    expect(() => run.source.unwatchInput()).not.toThrow()
  })
})
