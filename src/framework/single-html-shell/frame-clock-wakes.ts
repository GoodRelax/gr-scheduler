// SingleHtmlShell frame loop -- the waits that wake a frame when time has come (table T-078, FT-4).
// @unit      UF-163  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import {
  ENTRY_REPEAT_TIME_ELAPSED,
  isSizeSettled,
  readMonotonicMs,
  type FrameLoopHands,
} from './frame-loop'

interface RepeatTimes {
  readonly delayMs: number
  readonly intervalMs: number
}

// see FR-018, T-206
/** @purity pure */
export function repeatTimesOfHeldEntry(): RepeatTimes {
  return {
    delayMs: NOT_STORED_REPEAT_TIMES['S-172'],
    intervalMs: NOT_STORED_REPEAT_TIMES['S-173'],
  }
}

export type FrameClockWakesHands = Pick<
  FrameLoopHands,
  'readHeld' | 'readValues' | 'readEnvironment' | 'screen' | 'sendToSession' | 'ask'
>

/** @purity non-pure */
export function frameClockWakesOf(hands: FrameClockWakesHands) {
  let pointerRestingSince: number | null = null
  let callOffIconHintWait: (() => void) | null = null
  let callOffEntryRepeat: (() => void) | null = null
  // see SE-3, SE-4
  let callOffScaleMessage: (() => void) | null = null

  /** @purity non-pure */
  function beginPointerRest(): void {
    pointerRestingSince = readMonotonicMs()
    callOffIconHintWait?.()
    callOffIconHintWait = null
    if (hands.screen === undefined) return
    const wake = setTimeout(() => {
      callOffIconHintWait = null
      hands.ask()
    }, hands.readHeld().document.documentSettings.iconHintDelayMs)
    callOffIconHintWait = () => clearTimeout(wake)
  }

  // see SE-3, SE-4
  /** @purity non-pure */
  function startScaleMessageTimer(): void {
    callOffScaleMessage?.()
    const wake = setTimeout(() => {
      callOffScaleMessage = null
      hands.sendToSession({ type: 'scaleMessageTimeElapsed' }, null)
      if (isSizeSettled(hands.readEnvironment())) hands.ask()
    }, NOT_STORED_SCALE_MESSAGE_TIMES['S-244'])
    callOffScaleMessage = () => clearTimeout(wake)
  }

  // see FR-018, S-172, T-289
  /** @purity non-pure */
  function beginEntryRepeat(): void {
    endEntryRepeat()
    tickEntryRepeat(repeatTimesOfHeldEntry().delayMs)
  }

  // WHY: one wake chained per tick, not setInterval, so a late tick cannot pile onto the next.
  /** @purity non-pure */
  function tickEntryRepeat(afterMs: number): void {
    const wake = setTimeout(() => {
      callOffEntryRepeat = null
      hands.sendToSession(ENTRY_REPEAT_TIME_ELAPSED, hands.readValues())
    }, afterMs)
    callOffEntryRepeat = () => clearTimeout(wake)
  }

  /** @purity non-pure */
  function endEntryRepeat(): void {
    callOffEntryRepeat?.()
    callOffEntryRepeat = null
  }

  /** @purity semi-pure-b */
  function readPointerRestedMs(): number {
    return pointerRestingSince === null ? 0 : readMonotonicMs() - pointerRestingSince
  }

  return {
    beginPointerRest,
    startScaleMessageTimer,
    beginEntryRepeat,
    tickEntryRepeat,
    endEntryRepeat,
    readPointerRestedMs,
  }
}

export type FrameClockWakes = ReturnType<typeof frameClockWakesOf>

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_REPEAT_TIMES: {
  readonly 'S-172': number
  readonly 'S-173': number
} = {
  'S-172': 1000,
  'S-173': 120,
}

// see T-206
const NOT_STORED_SCALE_MESSAGE_TIMES: {
  readonly 'S-244': number
} = {
  'S-244': 1500,
}
// </generated>
