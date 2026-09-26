// G65: translator TASK_SHAPE_KINDS/TASK_MILESTONE_GLYPHS + taskShapeKindOf/milestoneGlyphOf (verbatim :618-655) vs generated COLUMN_SHAPES.TaskVisual choices (schedule-entities.ts:425-426) as field-commit.ts:71 isVisualChoice reads them
const TASK_SHAPE_KINDS: Record<string, true> = {
  rectangle: true,
  chevron: true,
  arrow: true,
  endpointSpan: true,
  milestone: true,
}

/** @purity pure */
function taskShapeKindOf(name: string): string | null {
  return Object.prototype.hasOwnProperty.call(TASK_SHAPE_KINDS, name)
    ? name
    : null
}

const TASK_MILESTONE_GLYPHS: Record<string, true> = {
  circle: true,
  hexagon: true,
  pentagon: true,
  diamond: true,
  square: true,
  star: true,
  triangleUp: true,
  triangleDown: true,
  file: true,
  box: true,
  floppyDisk: true,
  cylinder: true,
  person: true,
  smile: true,
  beerMug: true,
}

/** @purity pure */
function milestoneGlyphOf(name: string): string | null {
  return Object.prototype.hasOwnProperty.call(TASK_MILESTONE_GLYPHS, name)
    ? name
    : null
}
const COLUMN = {
    shapeKind: { kind: 'enum', choices: ['rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone'], min: null, max: null, isNullable: true },
    milestoneGlyph: { kind: 'enum', choices: ['circle', 'hexagon', 'pentagon', 'diamond', 'square', 'star', 'triangleUp', 'triangleDown', 'file', 'box', 'floppyDisk', 'cylinder', 'person', 'smile', 'beerMug'], min: null, max: null, isNullable: true },
} as any
const isVisualChoice = (column: string, value: string): boolean => COLUMN[column]?.choices?.includes(value) ?? false
const probes = [...COLUMN.shapeKind.choices, ...COLUMN.milestoneGlyph.choices, '__proto__', 'constructor', 'toString', 'hasOwnProperty', '', 'Rectangle', 'circle ', 'valueOf']
let diffs = 0
for (const p of probes) {
  if ((taskShapeKindOf(p) !== null) !== isVisualChoice('shapeKind', p)) { diffs++; console.log('shapeKind DIFFER', p) }
  if ((milestoneGlyphOf(p) !== null) !== isVisualChoice('milestoneGlyph', p)) { diffs++; console.log('glyph DIFFER', p) }
}
console.log('probes', probes.length, 'differences', diffs)
