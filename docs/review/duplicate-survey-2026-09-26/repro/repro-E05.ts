// E05: row-tree-entrances.ts:276 isRowUnder vs task-group-folding.ts:78 isBelowRow, maps built as at :172 and :97.
type TaskGroup = { id: string; parentId: string | null }
function isRowUnder(parentOf: ReadonlyMap<string, string | null>, parentId: string | null, ancestorId: string): boolean {
  const climbed = new Set<string>()
  let at = parentId
  while (at !== null && !climbed.has(at)) {
    if (at === ancestorId) return true
    climbed.add(at)
    at = parentOf.get(at) ?? null
  }
  return false
}
function isBelowRow(row: TaskGroup, ancestorId: string | null, byId: ReadonlyMap<string, TaskGroup>): boolean {
  if (ancestorId === null) return false
  let parentId = row.parentId
  for (let steps = 0; parentId !== null && steps <= byId.size; steps++) {
    if (parentId === ancestorId) return true
    parentId = byId.get(parentId)?.parentId ?? null
  }
  return false
}
const ids = ['a', 'b', 'c', 'd', 'e']
let tried = 0, diff = 0
for (let trial = 0; trial < 300000; trial++) {
  const n = 1 + Math.floor(Math.random() * 6)
  const rows: TaskGroup[] = []
  for (let i = 0; i < n; i++) {
    const id = ids[Math.floor(Math.random() * ids.length)] // duplicate ids allowed
    const r = Math.random()
    const parentId = r < 0.25 ? null : r < 0.3 ? 'zz' : ids[Math.floor(Math.random() * ids.length)]
    rows.push({ id, parentId })
  }
  const parentOf = new Map(rows.map((one) => [one.id, one.parentId] as const))
  const byId = new Map(rows.map((row) => [row.id, row]))
  for (const row of rows) for (const anc of [...ids, 'zz']) {
    tried++
    const a = isRowUnder(parentOf, row.parentId, anc), b = isBelowRow(row, anc, byId)
    if (a !== b) { if (diff < 3) console.log('DIFFER', JSON.stringify(rows), row, anc, a, b); diff++ }
  }
}
console.log('tried', tried, 'differences', diff)
