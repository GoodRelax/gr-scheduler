// File: AdvanceScreenSession: The one-step shape every region of the screen session shares.
// @unit      UF-85   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure

export type Step<S, E> = { readonly state: S; readonly effects: readonly E[] }

export const NO_EFFECTS: readonly never[] = Object.freeze([])

// Spec: SF-3, SD-3
/** @purity pure */
export function unchanged<S, E>(state: S): Step<S, E> {
  return { state, effects: NO_EFFECTS }
}

// Spec: SF-4
/** @purity pure */
export function assertNever(x: never): never {
  throw new Error(`unhandled case: ${String(x)}`)
}
