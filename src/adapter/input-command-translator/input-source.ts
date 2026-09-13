// The InputSource seam that reports pointer, wheel and key happenings.
// @unit      UF-31   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    n/a
// @seam      InputSource, implemented in another layer (LR-5)

export type PointerButton = 'left' | 'middle' | 'right'

export interface InputModifiers {
  readonly ctrl: boolean
  readonly shift: boolean
  readonly alt: boolean
  readonly meta: boolean
}

export type PointerPhase = 'down' | 'move' | 'up' | 'lost'

export interface PointerInput {
  readonly kind: 'pointer'
  readonly phase: PointerPhase
  readonly button: PointerButton
  readonly x: number
  readonly y: number
  readonly modifiers: InputModifiers
  readonly clickCount: number
}

export interface WheelInput {
  readonly kind: 'wheel'
  readonly x: number
  readonly y: number
  readonly modifiers: InputModifiers
  readonly notches: number
  readonly scrollPx: { readonly x: number; readonly y: number }
}

export interface KeyInput {
  readonly kind: 'key'
  readonly key: string
  readonly modifiers: InputModifiers
}

export type HumanInput = PointerInput | WheelInput | KeyInput

export type InputWatcher = (input: HumanInput) => void

// see IF-2
export interface InputSource {
  /** @purity non-pure */
  watchInput(receive: InputWatcher): void

  /** @purity non-pure */
  unwatchInput(): void
}
