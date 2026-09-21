// SingleHtmlShell -- hands each effect the state machine returned to the runner of its kind.
// @unit      UF-123  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { SessionEffect } from '../../use-case/advance-screen-session/advance-screen-session'
import type { FrameValues } from './frame-loop'

export type EffectRunner<E> = (effect: E, frame: FrameValues | null) => void

// see UF-123, T-280, T-286, T-289, T-290, T-292, T-293
export type EffectRunners<E extends { readonly type: string }> = {
  readonly [T in E['type']]: EffectRunner<Extract<E, { readonly type: T }>>
}

// see SF-6, UF-123
/** @purity non-pure */
export function runSessionEffects(
  effects: readonly SessionEffect[],
  runners: EffectRunners<SessionEffect>,
  frame: FrameValues | null,
): void {
  for (const effect of effects) {
    const run = runners[effect.type] as EffectRunner<SessionEffect>
    run(effect, frame)
  }
}

// see UF-123
// TRAP: never reached while the shell sends no event of that region; reaching it is a wiring bug.
/** @purity pure */
export function unwiredEffect(effect: { readonly type: string }): never {
  throw new Error(`no runner is wired yet for the session effect ${effect.type}`)
}
