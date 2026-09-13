// EditHistory -- public entry of this folder.
//
// @unit      UF-4   (docs/spec/05-07-design.md, table T-075)
// @component EditHistory, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-4
//
// FR-031.
//
// ⚠️ PART of this file is generated. The marked region at the bottom -- search
// for NOT_STORED_LIMITS -- comes from docs/spec/_source/settings.json (table
// T-206) and is overwritten by `npm run gen`; `npm run gen:check` fails if it
// has drifted. Everything above the marker is hand written. Do not edit by hand
// inside that region: edit the manuscript instead.
// ⛔ Do not spell the marker in a comment: the generator takes the first one as
// the region.
//
// The step type is generic: table T-027 says which operations make a step, and
// what a step carries is the recorder's business.
// The bounds (S-94, S-95 of table T-206) arrive as an argument: they belong to
// the running machine, not the document.
// A pure function cannot measure memory, so the caller states each step's size.

export interface HistoryLimits {
  /** S-94 of table T-206: how many steps may be kept. */
  readonly maxSteps: number
  /** S-95 of table T-206: the total the kept steps may occupy. */
  readonly maxTotalSizeBytes: number
}

interface HeldStep<TStep> {
  readonly step: TStep
  readonly sizeBytes: number
}

export interface EditHistory<TStep> {
  /** Oldest first; undo takes from the end. */
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
  return held.reduce((sum, one) => sum + one.sizeBytes, 0)
}

/**
 * A new edit drops `undone`: what was undone cannot be replayed on top of a
 * different history. Then the oldest steps go until both bounds hold (FR-031).
 *
 * @purity pure
 */
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
  /** The step to undo or redo, absent when there was none. */
  readonly step: TStep | null
}

/**
 * The caller applies the step it is handed; this unit only moves it across.
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

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ Reading this is NOT the same as taking it: the value still
 * arrives as an argument, because table T-206 keeps these out of the
 * document on purpose (the environment may hold a larger one). This
 * is what a caller passes when it has nothing better.
 */
export const NOT_STORED_LIMITS: {
  /** S-94 */
  readonly 'S-94': number
  /** S-95, in MB */
  readonly 'S-95': number
} = {
  'S-94': 50,
  'S-95': 64,
}
// </generated>
