// EditHistory: the undo and redo history.
// @unit      UF-4   (docs/spec/05-07-design.md, table T-075)
// @component EditHistory, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-4
// Generated region at the end: docs/spec/_source/settings.json. Do not edit by hand; npm run gen.

export interface HistoryLimits {
  readonly maxSteps: number
  readonly maxTotalSizeBytes: number
}

interface HeldStep<TStep> {
  readonly step: TStep
  readonly sizeBytes: number
}

export interface EditHistory<TStep> {
  readonly done: readonly HeldStep<TStep>[]
  readonly undone: readonly HeldStep<TStep>[]
}

const EMPTY: EditHistory<never> = { done: [], undone: [] }

/** @purity pure */
export function emptyHistory<TStep>(): EditHistory<TStep> {
  return EMPTY as EditHistory<TStep>
}

/** @purity pure */
export function stepCount<TStep>(history: EditHistory<TStep>): number {
  return history.done.length
}

/** @purity pure */
function totalSize<TStep>(held: readonly HeldStep<TStep>[]): number {
  return held.reduce((sum, one) => sum + one.sizeBytes, 0)
}

/** @purity pure */
export function historyWithStep<TStep>(
  history: EditHistory<TStep>,
  step: TStep,
  sizeBytes: number,
  limits: HistoryLimits,
): EditHistory<TStep> {
  let done: HeldStep<TStep>[] = [...history.done, { step, sizeBytes }]
  while (done.length > Math.max(0, limits.maxSteps)) done = done.slice(1)
  while (done.length > 1 && totalSize(done) > limits.maxTotalSizeBytes) done = done.slice(1)
  return { done, undone: [] }
}

export interface HistoryMove<TStep> {
  readonly history: EditHistory<TStep>
  readonly step: TStep | null
}

/** @purity pure */
export function previousStep<TStep>(history: EditHistory<TStep>): HistoryMove<TStep> {
  const held = history.done[history.done.length - 1]
  if (held === undefined) return { history, step: null }
  return {
    history: { done: history.done.slice(0, -1), undone: [held, ...history.undone] },
    step: held.step,
  }
}

/** @purity pure */
export function nextStep<TStep>(history: EditHistory<TStep>): HistoryMove<TStep> {
  const held = history.undone[0]
  if (held === undefined) return { history, step: null }
  return {
    history: { done: [...history.done, held], undone: history.undone.slice(1) },
    step: held.step,
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_LIMITS: {
  readonly 'S-94': number
  readonly 'S-95': number
} = {
  'S-94': 50,
  'S-95': 64,
}
// </generated>
