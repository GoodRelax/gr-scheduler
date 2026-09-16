// The drawn ratio of FR-039 and the two thirds of S-235, read from the manuscript.

import { bare, bareAll, specTable } from '../contract/spec-table'

const TYPE_COLUMN = String.fromCharCode(0x578b)
const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see T-206
export const S_236 = numberIn(bare(rowOf('T-206', 'S-236').by[DEFAULT_COLUMN] ?? ''))

// see T-206
export const S_235 = numberIn(bare(rowOf('T-206', 'S-235').by[DEFAULT_COLUMN] ?? ''))

// see T-202
export const DISPLAY_SCALE_STEPS: readonly number[] = bareAll(
  rowOf('T-202', 'S-234').by[TYPE_COLUMN] ?? '',
).map(Number)

// see T-202
export const DEFAULT_DISPLAY_SCALE = numberIn(bare(rowOf('T-202', 'S-234').by[DEFAULT_COLUMN] ?? ''))

// see FR-039
/** @purity pure */
export function displayRatioAt(displayScale: number): number {
  return (displayScale / 100) * S_236
}

// see FR-039
export const DEFAULT_DISPLAY_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)
