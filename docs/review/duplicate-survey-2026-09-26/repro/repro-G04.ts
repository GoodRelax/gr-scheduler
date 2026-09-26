// G04: row-tree rank copies. taskGroupRankById (translator:1260 == invariants:132 == task-group-order:16 rowTreeRankById, text-identical)
// vs drawn-rows.ts:36 inTreeOrder (as index) vs view-place.ts:62 firstRow
type TaskGroup = { id: string; parentId: string | null; order: number; depth?: number }
function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
  const childrenOf = new Map<string | null, TaskGroup[]>()
  const holds = new Set(groups.map((group) => group.id))
  for (const group of groups) {
    const parent = group.parentId !== null && holds.has(group.parentId) ? group.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [group])
    else siblings.push(group)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)
  const rankById = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const group of childrenOf.get(parent) ?? []) {
      if (rankById.has(group.id)) continue
      rankById.set(group.id, rankById.size)
      walk(group.id)
    }
  }
  walk(null)
  for (const group of groups) if (!rankById.has(group.id)) rankById.set(group.id, rankById.size)
  return rankById
}
function inTreeOrder<T extends TaskGroup & { depth: number }>(rows: readonly T[], byId: ReadonlyMap<string, TaskGroup>): readonly T[] {
  const childrenOf = new Map<string | null, T[]>()
  for (const row of rows) {
    const parent = row.parentId !== null && byId.has(row.parentId) ? row.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [row])
    else siblings.push(row)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)
  const ordered: T[] = []
  const seen = new Set<string>()
  const walk = (parent: string | null): void => {
    for (const row of childrenOf.get(parent) ?? []) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      ordered.push(row)
      walk(row.id)
    }
  }
  walk(null)
  for (const row of rows) if (!seen.has(row.id)) ordered.push(row)
  return ordered
}
const g = (id: string, parentId: string | null, order: number): TaskGroup => ({ id, parentId, order, depth: 1 })
const cases: Record<string, TaskGroup[]> = {
  empty: [],
  flat: [g('a', null, 1), g('b', null, 0)],
  nested: [g('a', null, 0), g('a1', 'a', 0), g('b', null, 1), g('a2', 'a', 1)],
  orphan: [g('x', 'missing', 0), g('a', null, 0)],
  tie: [g('b', null, 0), g('a', null, 0)],
  cycle: [g('r', null, 0), g('c1', 'c2', 0), g('c2', 'c1', 0)],
  selfParent: [g('s', 's', 0), g('a', null, 1)],
  dupId: [g('a', null, 1), g('a', null, 0), g('b', null, 0.5)],
  nanOrder: [g('a', null, NaN), g('b', null, 0), g('c', null, -1)],
  childBeforeRootSameOrder: [g('c', 'r', 0), g('r', null, 0), g('s', null, 1)],
}
for (const [name, groups] of Object.entries(cases)) {
  const rank = taskGroupRankById(groups)
  const byId = new Map(groups.map((one) => [one.id, one]))
  const list = inTreeOrder(groups as (TaskGroup & { depth: number })[], byId).map((r) => r.id)
  const rankList = [...rank.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
  const firstRowViewPlace = [...groups].sort((a, b) => a.order - b.order)[0]?.id
  const same = JSON.stringify(list) === JSON.stringify(rankList)
  console.log(name.padEnd(26), 'rank:', JSON.stringify(rankList), same ? '== inTreeOrder' : 'inTreeOrder: ' + JSON.stringify(list), '| view-place firstRow:', firstRowViewPlace, firstRowViewPlace === rankList[0] ? '' : '<-- DIFFERS from rank 0')
}
