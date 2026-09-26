// G08: open-arming tests. row-tree-entrances.ts:161/168/181 vs row-title-panel.ts:212 openArmingOf.
// keptInViewByTreeState and pinned are held empty; depthLimit is a parameter (same value handed to both).
type G = { id: string; parentId: string | null }
function isRowUnder(parentOf: ReadonlyMap<string, string | null>, parentId: string | null, ancestorId: string): boolean {
  const climbed = new Set<string>(); let at = parentId
  while (at !== null && !climbed.has(at)) { if (at === ancestorId) return true; climbed.add(at); at = parentOf.get(at) ?? null }
  return false
}
function rowDepth(group: G, byId: ReadonlyMap<string, G>, max: number): number {
  let depth = 1; let parentId = group.parentId
  while (parentId !== null && depth < max) { const p = byId.get(parentId); if (p === undefined) return depth; depth += 1; parentId = p.parentId }
  return depth
}
function drawnDepth(group: G, byId: ReadonlyMap<string, G>, max: number): number {
  let depth = 1
  for (let at = group.parentId, guard = 0; at !== null && guard <= max; guard++) { const p = byId.get(at); if (p === undefined) break; depth += 1; at = p.parentId }
  return depth
}
function translator(rows: G[], placed: Set<string>, depthOfPlaced: Map<string, number>, depthLimit: number, id: string) {
  const every = rows.some((r) => !placed.has(r.id))
  const parentOf = new Map(rows.map((o) => [o.id, o.parentId] as const))
  const below = placed.has(id) && rows.some((r) => !placed.has(r.id) && isRowUnder(parentOf, r.parentId, id))
  const one = placed.has(id) && rows.some((c) => { if (c.parentId !== id) return false; const d = depthOfPlaced.get(c.id); if (d === undefined) return true; return !(d <= depthLimit) })
  return { every, below, one }
}
function panel(rows: G[], placed: Set<string>, depthLimit: number, max: number, id: string) {
  const byId = new Map(rows.map((g) => [g.id, g]))
  const below = new Set<string>()
  for (const g of rows) { if (placed.has(g.id)) continue; const climbed = new Set<string>(); for (let at = g.parentId; at !== null && !climbed.has(at);) { climbed.add(at); below.add(at); at = byId.get(at)?.parentId ?? null } }
  const toOpen = new Set<string>()
  for (const c of rows) { if (c.parentId === null) continue; const drawn = placed.has(c.id) && rowDepth(c, byId, max) <= depthLimit; if (!drawn) toOpen.add(c.parentId) }
  return { every: rows.some((g) => !placed.has(g.id)), below: below.has(id), one: toOpen.has(id) }
}
const chain = (n: number): G[] => Array.from({ length: n }, (_, i) => ({ id: 'g' + i, parentId: i === 0 ? null : 'g' + (i - 1) }))
const max = 5
type Case = [string, G[], string[], number, string]
const cases: Case[] = [
  ['all placed', chain(3), ['g0', 'g1', 'g2'], 5, 'g1'],
  ['leaf unplaced', chain(3), ['g0', 'g1'], 5, 'g1'],
  ['grandchild unplaced', chain(3), ['g0', 'g1'], 5, 'g0'],
  ['limit 2, g2 placed', chain(3), ['g0', 'g1', 'g2'], 2, 'g1'],
  ['depth 6 placed, limit 5', chain(6), ['g0', 'g1', 'g2', 'g3', 'g4', 'g5'], 5, 'g4'],
  ['ring a<->b + root placed', [{ id: 'r', parentId: null }, { id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }], ['r', 'a'], 5, 'a'],
  ['orphan unplaced', [{ id: 'r', parentId: null }, { id: 'o', parentId: 'gone' }], ['r'], 5, 'r'],
  ['asked row unplaced', chain(3), ['g0'], 5, 'g1'],
]
for (const [name, rows, placedIds, limit, id] of cases) {
  const placed = new Set(placedIds)
  const byId = new Map(rows.map((g) => [g.id, g]))
  const depthOfPlaced = new Map(placedIds.map((p) => [p, drawnDepth(byId.get(p)!, byId, max)]))
  const t = translator(rows, placed, depthOfPlaced, limit, id), p = panel(rows, placed, limit, max, id)
  console.log(name.padEnd(26), 'translator', JSON.stringify(t), 'panel', JSON.stringify(p), JSON.stringify(t) === JSON.stringify(p) ? '' : '<-- DIFFER')
}
