// The one-step shape every region of the screen session shares.
// @unit      UF-85   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure

// see SF-2
export type Step<S, E> = { readonly state: S; readonly effects: readonly E[] }

// see SF-3
export const NO_EFFECTS: readonly never[] = Object.freeze([])

// see SF-3, SD-3
/** @purity pure */
export function unchanged<S, E>(state: S): Step<S, E> {
  return { state, effects: NO_EFFECTS }
}

// see SF-4
/** @purity pure */
export function assertNever(x: never): never {
  throw new Error(`unhandled case: ${String(x)}`)
}
