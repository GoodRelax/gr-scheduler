// EditHistory -- public entry of this folder.
//
// @unit      UF-4   (docs/spec/05-07-design.md, table T-075)
// @component EditHistory, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-4
//
// FR-031 holds the rule: undo the previous edit, redo what was undone, and
// keep a bound on both the number of steps and the total memory, dropping the
// oldest step once either is passed.
//
// Two things this unit deliberately does not decide:
//
//   - What a step IS. Table T-027 says which operations make one; what the
//     step carries is the business of whoever records it. So the type is
//     generic, and the history stays a value with no knowledge of documents.
//   - The bounds. S-94 and S-95 sit in table T-206, the values that are NOT
//     saved in the document -- they belong to the machine that is running, so
//     they arrive as an argument and are never read from here.
//
// Measuring the memory a step occupies is not something a pure function can do,
// so the caller states the size of the step it is adding.

export interface HistoryLimits {
  /** S-94 of table T-206: how many steps may be kept. */
  readonly maxSteps: number
  /** S-95 of table T-206: the total the kept steps may occupy. */
  readonly maxTotalSize: number
}

interface HeldStep<TStep> {
  readonly step: TStep
  readonly size: number
}

export interface EditHistory<TStep> {
  /** Oldest first. Everything before `position` can be undone. */
  readonly done: readonly HeldStep<TStep>[]
  /** Most recently undone first: what redo will replay. */
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
  return held.reduce((sum, one) => sum + one.size, 0)
}

/**
 * Push one step. A new edit makes redo unreachable -- what was undone can no
 * longer be replayed on top of a different history -- so `undone` is dropped.
 * Then the oldest steps go until both bounds hold again (FR-031).
 *
 * @purity pure
 */
export function historyWithStep<TStep>(
  history: EditHistory<TStep>,
  step: TStep,
  size: number,
  limits: HistoryLimits,
): EditHistory<TStep> {
  let done: HeldStep<TStep>[] = [...history.done, { step, size }]
  while (done.length > Math.max(0, limits.maxSteps)) done = done.slice(1)
  while (done.length > 1 && totalSize(done) > limits.maxTotalSize) done = done.slice(1)
  return { done, undone: [] }
}

export interface HistoryMove<TStep> {
  readonly history: EditHistory<TStep>
  /** The step to undo or redo, absent when there was none. */
  readonly step: TStep | null
}

/**
 * Take one step off the undo side. The caller applies the step it is handed;
 * this unit only moves it across.
 *
 * @purity pure
 */
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
