// G66: translator ARMED_BY_ENTRY + armedByEntry (verbatim, input-command-translator.ts:784-816) through command-palette armedEntry (verbatim, command-palette.ts:250-265) vs icon-roster.json arms/armsShape
import { readFileSync } from 'node:fs'
// TRAP: the arm types shapeKind and glyph as bare strings; a misspelling here compiles and arms nothing.
const ARMED_BY_ENTRY: Record<string, any> = {
  'IC-23': { kind: 'taskShapeArmed', shapeKind: 'rectangle' },
  'IC-24': { kind: 'taskShapeArmed', shapeKind: 'chevron' },
  'IC-25': { kind: 'taskShapeArmed', shapeKind: 'arrow' },
  'IC-26': { kind: 'taskShapeArmed', shapeKind: 'endpointSpan' },
  'IC-27': { kind: 'milestoneShapeArmed', glyph: 'circle' },
  'IC-28': { kind: 'milestoneShapeArmed', glyph: 'hexagon' },
  'IC-29': { kind: 'milestoneShapeArmed', glyph: 'pentagon' },
  'IC-30': { kind: 'milestoneShapeArmed', glyph: 'diamond' },
  'IC-31': { kind: 'milestoneShapeArmed', glyph: 'square' },
  'IC-32': { kind: 'milestoneShapeArmed', glyph: 'star' },
  'IC-33': { kind: 'milestoneShapeArmed', glyph: 'triangleUp' },
  'IC-34': { kind: 'milestoneShapeArmed', glyph: 'triangleDown' },
  'IC-83': { kind: 'milestoneShapeArmed', glyph: 'file' },
  'IC-84': { kind: 'milestoneShapeArmed', glyph: 'box' },
  'IC-85': { kind: 'milestoneShapeArmed', glyph: 'floppyDisk' },
  'IC-86': { kind: 'milestoneShapeArmed', glyph: 'cylinder' },
  'IC-87': { kind: 'milestoneShapeArmed', glyph: 'person' },
  'IC-88': { kind: 'milestoneShapeArmed', glyph: 'smile' },
  'IC-89': { kind: 'milestoneShapeArmed', glyph: 'beerMug' },
  'IC-35': { kind: 'commentBoxArmed' },
  'IC-36': { kind: 'highlightBoxArmed' },
  'IC-61': { kind: 'dependencyArmed' },
}

/** @purity pure */
function armedByEntry(entry: string): any {
  return Object.prototype.hasOwnProperty.call(ARMED_BY_ENTRY, entry)
    ? (ARMED_BY_ENTRY[entry] as any)
    : null
}

function armedEntry(armed: any): any {
  switch (armed.kind) {
    case 'notArmed':
      return { row: 'AR-1', shape: null }
    case 'taskShapeArmed':
      return { row: 'AR-2', shape: armed.shapeKind }
    case 'milestoneShapeArmed':
      return { row: 'AR-3', shape: armed.glyph }
    case 'dependencyArmed':
      return { row: 'AR-4', shape: null }
    case 'commentBoxArmed':
      return { row: 'AR-5', shape: null }
    case 'highlightBoxArmed':
      return { row: 'AR-6', shape: null }
  }
}
const roster = JSON.parse(readFileSync('src/adapter/screen-renderer/icon-roster.json', 'utf8'))
const rows: any[] = roster.icons ?? Object.values(roster).find(Array.isArray)
let diffs = 0, checked = 0
for (const r of rows) {
  const a = armedByEntry(r.rowId)
  const viaPalette = a === null ? { row: null, shape: null } : armedEntry(a)
  const want = { row: r.arms ?? null, shape: r.armsShape ?? null }
  checked++
  if (JSON.stringify(viaPalette) !== JSON.stringify(want)) { diffs++; console.log('DIFFER', r.rowId, 'translator->palette', JSON.stringify(viaPalette), 'roster', JSON.stringify(want)) }
}
for (const odd of ['__proto__', 'constructor', 'toString', 'IC-999', '']) if (armedByEntry(odd) !== null) console.log('odd key answered', odd)
console.log('roster entries checked', checked, 'differences', diffs)
