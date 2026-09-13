// Reports the person's pointer, wheel and key input from the browser window.
// @unit      UF-50   (docs/spec/05-07-design.md, table T-075)
// @component DomInputSource, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-27

import type {
  HumanInput,
  InputModifiers,
  InputSource,
  InputWatcher,
  PointerButton,
  PointerInput,
} from '../../adapter/input-command-translator/input-command-translator'

export interface PointerCaptureTarget {
  setPointerCapture(pointerId: number): void
  releasePointerCapture(pointerId: number): void
  hasPointerCapture(pointerId: number): boolean
}

export interface InputHost {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void
  readonly innerWidth: number
  readonly innerHeight: number
  readonly document: { readonly documentElement: PointerCaptureTarget }
}

const HOST_BUTTON = { left: 0, middle: 1, right: 2 } as const

const DELTA_IN_LINES = 1
const DELTA_IN_PAGES = 2

const HOST_ESCAPE = 'Escape'
const ESCAPE_KEY = 'Esc'

// STOP: spec does not decide if signs are read by physical key or character. Looked in T-036
// @provisional PND-93
const SIGN_BY_CODE: Readonly<Record<string, string>> = {
  Equal: '+',
  NumpadAdd: '+',
  Minus: '-',
  NumpadSubtract: '-',
  Digit0: '0',
  Numpad0: '0',
}

// STOP: spec does not decide the double-click time and distance. Looked in MK-13, S-124
// @provisional PND-90
const DOUBLE_CLICK_WITHIN_MS = 500
/** @provisional PND-90 */
const DOUBLE_CLICK_WITHIN_PX = 4

// STOP: spec does not decide one wheel notch in lines or pixels. Looked in S-96
// @provisional PND-91
const PIXELS_PER_LINE = 40
/** @provisional PND-91 */
const PIXELS_PER_NOTCH = 100
/** @provisional PND-91 */
const LINES_PER_NOTCH = 3

// STOP: spec does not decide the button and click count of a hover move. Looked in IN-1, MK-13
// @provisional PND-92
const HOVER_BUTTON: PointerButton = 'left'
/** @provisional PND-92 */
const HOVER_CLICK_COUNT = 0

interface Gesture {
  readonly pointerId: number
  readonly button: PointerButton
  readonly clickCount: number
  // STOP: spec does not decide if a press the tool did not take is captured. Looked in IN-1a
  // @provisional PND-94
  readonly isHeld: boolean
}

interface PreviousPress {
  readonly button: PointerButton
  readonly x: number
  readonly y: number
  readonly at: number
  readonly count: number
}

/** @purity pure */
function buttonOf(hostButton: number): PointerButton | null {
  if (hostButton === HOST_BUTTON.left) return 'left'
  if (hostButton === HOST_BUTTON.middle) return 'middle'
  if (hostButton === HOST_BUTTON.right) return 'right'
  return null
}

/** @purity pure */
function modifiersOf(event: {
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
}): InputModifiers {
  return { ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, meta: event.metaKey }
}

// STOP: spec does not decide if and how unassigned keys are reported. Looked in T-036, MK-10
// @provisional PND-95
/** @purity pure */
function keyOf(event: { readonly key: string; readonly code: string }): string {
  const physical = SIGN_BY_CODE[event.code]
  if (physical !== undefined) return physical
  if (event.key.length === 1) return event.key.toUpperCase()
  if (event.key === HOST_ESCAPE) return ESCAPE_KEY
  return event.key
}

/** @purity pure */
function pixelsPerUnit(deltaMode: number, pageSize: number): number {
  if (deltaMode === DELTA_IN_LINES) return PIXELS_PER_LINE
  if (deltaMode === DELTA_IN_PAGES) return pageSize
  return 1
}

/** @purity pure */
function unitsPerNotch(deltaMode: number): number {
  if (deltaMode === DELTA_IN_LINES) return LINES_PER_NOTCH
  if (deltaMode === DELTA_IN_PAGES) return 1
  return PIXELS_PER_NOTCH
}

/** @purity pure */
function wheelTurn(
  event: { readonly deltaX: number; readonly deltaY: number; readonly deltaMode: number },
  pageWidth: number,
  pageHeight: number,
): { readonly notches: number; readonly scrollPx: { readonly x: number; readonly y: number } } {
  const turned = event.deltaY !== 0 ? event.deltaY : event.deltaX
  return {
    notches: turned / unitsPerNotch(event.deltaMode),
    scrollPx: {
      x: event.deltaX * pixelsPerUnit(event.deltaMode, pageWidth),
      y: event.deltaY * pixelsPerUnit(event.deltaMode, pageHeight),
    },
  }
}

// see MK-13
/** @purity pure */
function isSameRun(
  before: PreviousPress,
  button: PointerButton,
  pointer: { readonly clientX: number; readonly clientY: number; readonly timeStamp: number },
): boolean {
  if (before.button !== button) return false
  if (pointer.timeStamp - before.at > DOUBLE_CLICK_WITHIN_MS) return false
  if (Math.abs(pointer.clientX - before.x) > DOUBLE_CLICK_WITHIN_PX) return false
  return Math.abs(pointer.clientY - before.y) <= DOUBLE_CLICK_WITHIN_PX
}

// TRAP: a window wheel listener is passive by default, and a passive preventDefault is ignored.
const MAY_STOP_DEFAULT: AddEventListenerOptions = { passive: false }
const NOTHING_TO_STOP: AddEventListenerOptions = { passive: true }

// see IF-2, PI-27
/** @purity non-pure */
export function domInputSource(
  host: InputHost,
  isBrowserDefaultStopped: (input: HumanInput) => boolean,
): InputSource {
  let watcher: InputWatcher | null = null
  let gesture: Gesture | null = null
  let previousPress: PreviousPress | null = null

  /** @purity non-pure */
  function report(input: HumanInput): void {
    const receive = watcher
    if (receive !== null) receive(input)
  }

  // see MK-10
  /** @purity non-pure */
  function deliver(input: HumanInput, event: { preventDefault(): void }): void {
    // TRAP: asked before the watcher runs; Esc consumes a level, so later reads a changed screen.
    if (isBrowserDefaultStopped(input)) event.preventDefault()
    report(input)
  }

  // TRAP: capture on the root; the svg subtree is replaced every draw and loses its capture.
  /** @purity non-pure */
  function holdPointer(pointerId: number): void {
    host.document.documentElement.setPointerCapture(pointerId)
  }

  /** @purity non-pure */
  function releasePointer(pointerId: number): void {
    const root = host.document.documentElement
    if (root.hasPointerCapture(pointerId)) root.releasePointerCapture(pointerId)
  }

  /** @purity non-pure */
  function pressCount(
    button: PointerButton,
    pointer: { readonly clientX: number; readonly clientY: number; readonly timeStamp: number },
  ): number {
    const before = previousPress
    const count = before !== null && isSameRun(before, button, pointer) ? before.count + 1 : 1
    previousPress = {
      button,
      x: pointer.clientX,
      y: pointer.clientY,
      at: pointer.timeStamp,
      count,
    }
    return count
  }

  /** @purity non-pure */
  function onPointerDown(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    if (gesture !== null) return
    const button = buttonOf(pointer.button)
    if (button === null) return

    const input: PointerInput = {
      kind: 'pointer',
      phase: 'down',
      button,
      x: pointer.clientX,
      y: pointer.clientY,
      modifiers: modifiersOf(pointer),
      clickCount: pressCount(button, pointer),
    }
    const isHeld = isBrowserDefaultStopped(input)
    if (isHeld) {
      pointer.preventDefault()
      holdPointer(pointer.pointerId)
    }
    gesture = { pointerId: pointer.pointerId, button, clickCount: input.clickCount, isHeld }
    report(input)
  }

  /** @purity non-pure */
  function onPointerMove(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    const held = gesture
    if (held !== null && held.pointerId !== pointer.pointerId) return
    deliver(
      {
        kind: 'pointer',
        phase: 'move',
        button: held === null ? HOVER_BUTTON : held.button,
        x: pointer.clientX,
        y: pointer.clientY,
        modifiers: modifiersOf(pointer),
        clickCount: held === null ? HOVER_CLICK_COUNT : held.clickCount,
      },
      pointer,
    )
  }

  /** @purity non-pure */
  function onPointerUp(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    const held = gesture
    if (held === null || held.pointerId !== pointer.pointerId) return
    if (buttonOf(pointer.button) !== held.button) return

    const input: PointerInput = {
      kind: 'pointer',
      phase: 'up',
      button: held.button,
      x: pointer.clientX,
      y: pointer.clientY,
      modifiers: modifiersOf(pointer),
      clickCount: held.clickCount,
    }
    // TRAP: cleared before reporting, so the watcher sees a settled gesture.
    gesture = null
    if (held.isHeld) releasePointer(pointer.pointerId)
    deliver(input, pointer)
  }

  // see IN-1a
  /** @purity non-pure */
  function onPointerLost(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    const held = gesture
    if (held === null || held.pointerId !== pointer.pointerId) return
    gesture = null
    if (held.isHeld) releasePointer(pointer.pointerId)
    report({
      kind: 'pointer',
      phase: 'lost',
      button: held.button,
      x: pointer.clientX,
      y: pointer.clientY,
      modifiers: modifiersOf(pointer),
      clickCount: held.clickCount,
    })
  }

  /** @purity non-pure */
  function onWheel(event: Event): void {
    if (watcher === null) return
    const wheel = event as WheelEvent
    const turn = wheelTurn(wheel, host.innerWidth, host.innerHeight)
    deliver(
      {
        kind: 'wheel',
        x: wheel.clientX,
        y: wheel.clientY,
        modifiers: modifiersOf(wheel),
        notches: turn.notches,
        scrollPx: turn.scrollPx,
      },
      wheel,
    )
  }

  /** @purity non-pure */
  function onKeyDown(event: Event): void {
    if (watcher === null) return
    const key = event as KeyboardEvent
    deliver({ kind: 'key', key: keyOf(key), modifiers: modifiersOf(key) }, key)
  }

  const listeners: readonly (readonly [
    string,
    (event: Event) => void,
    AddEventListenerOptions,
  ])[] = [
    ['pointerdown', onPointerDown, MAY_STOP_DEFAULT],
    ['pointermove', onPointerMove, MAY_STOP_DEFAULT],
    ['pointerup', onPointerUp, MAY_STOP_DEFAULT],
    ['pointercancel', onPointerLost, NOTHING_TO_STOP],
    ['lostpointercapture', onPointerLost, NOTHING_TO_STOP],
    ['wheel', onWheel, MAY_STOP_DEFAULT],
    ['keydown', onKeyDown, MAY_STOP_DEFAULT],
  ]

  return {
    /** @purity non-pure */
    watchInput(receive: InputWatcher): void {
      if (watcher === null) {
        for (const [type, listener, options] of listeners) {
          host.addEventListener(type, listener, options)
        }
      }
      watcher = receive
    },

    /** @purity non-pure */
    unwatchInput(): void {
      if (watcher === null) return
      watcher = null
      for (const [type, listener, options] of listeners) {
        host.removeEventListener(type, listener, options)
      }
      const held = gesture
      gesture = null
      previousPress = null
      if (held !== null && held.isHeld) releasePointer(held.pointerId)
    },
  }
}
