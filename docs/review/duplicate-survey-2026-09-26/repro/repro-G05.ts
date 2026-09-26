// G05: row depth. translator:1167 rowGrabDepthOf == edit-task-group.ts:81 depthOf (text-identical)
// extra: row-title-panel.ts:102 rowDepth (cap maxGroupDepth), drawn-rows.ts:20-27 inline (guard <= maxGroupDepth)
type TaskGroup = { id: string; parentId: string | null }
function rowGrabDepthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number {
  let depth = 1
  let foundAt = row.parentId
  for (let guard = 0; foundAt !== null && guard <= byId.size; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    depth += 1
    foundAt = parent.parentId
  }
  return depth
}
function rowDepth(group: TaskGroup, groupsById: ReadonlyMap<string, TaskGroup>, settings: { maxGroupDepth: number }): number {
  let depth = 1
  let parentId = group.parentId
  while (parentId !== null && depth < settings.maxGroupDepth) {
    const parent = groupsById.get(parentId)
    if (parent === undefined) return depth
    depth += 1
    parentId = parent.parentId
  }
  return depth
}
function drawnDepth(group: TaskGroup, byId: ReadonlyMap<string, TaskGroup>, settings: { maxGroupDepth: number }): number {
  let depth = 1
  for (let foundAt = group.parentId, guard = 0; foundAt !== null && guard <= settings.maxGroupDepth; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    depth += 1
    foundAt = parent.parentId
  }
  return depth
}
const chain = (n: number): TaskGroup[] => Array.from({ length: n }, (_, i) => ({ id: 'g' + i, parentId: i === 0 ? null : 'g' + (i - 1) }))
const settings = { maxGroupDepth: 5 }
const cases: Record<string, [TaskGroup[], string]> = {
  root: [chain(1), 'g0'], depth5: [chain(5), 'g4'], depth6: [chain(6), 'g5'], depth8: [chain(8), 'g7'],
  orphan: [[{ id: 'x', parentId: 'missing' }], 'x'],
  ring2: [[{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }], 'a'],
  selfRing: [[{ id: 's', parentId: 's' }], 's'],
  ring10: [Array.from({ length: 10 }, (_, i) => ({ id: 'r' + i, parentId: 'r' + ((i + 1) % 10) })), 'r0'],
}
for (const [name, [rows, id]] of Object.entries(cases)) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const row = byId.get(id)!
  const a = rowGrabDepthOf(byId, row), b = rowDepth(row, byId, settings), c = drawnDepth(row, byId, settings)
  console.log(name.padEnd(8), 'rowGrabDepthOf/depthOf', a, '| row-title-panel rowDepth', b, '| drawn-rows', c, a === b && b === c ? '' : '<-- DIFFER')
}
