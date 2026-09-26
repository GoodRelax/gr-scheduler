const S178 = 2
function selectedLineWidth(own: number, selected: boolean): number { return selected ? own * S178 : own } // svg-renderer.ts:119
const geomWidth = (ownWidth: number, isSelected: boolean) => (isSelected ? ownWidth * S178 : ownWidth) // dependency-route.ts:205
for (const [w, s] of [[1.5, true], [1.5, false], [0, true], [NaN, true], [0.1, true]] as [number, boolean][]) console.log('S-178', w, s, selectedLineWidth(w, s), geomWidth(w, s))
type Dep = { predecessorUid: number }
type Task = { uid: number; dependencies: Dep[] }
type Item = { kind: 'dependency'; successorUid: number; ordinal: number }
function rendererSelectedLinks(tasks: Task[], marks: Item[]): Set<string> { // svg-renderer.ts:478-485 verbatim
  const selectedLinks = new Set<string>()
  const linksOfTask = new Map(tasks.map((one) => [one.uid, one.dependencies]))
  for (const item of marks) { if (item.kind !== 'dependency') continue; const link = linksOfTask.get(item.successorUid)?.[item.ordinal]; if (link !== undefined) selectedLinks.add(`${link.predecessorUid}>${item.successorUid}`) }
  return selectedLinks
}
function selectedLinksOf(tasks: Task[], items: Item[]): Set<string> { // dependency-route.ts:135 verbatim
  const picked = new Set<string>()
  for (const item of items) { if (item.kind === 'dependency') picked.add(`${item.successorUid}#${item.ordinal}`) }
  const out = new Set<string>()
  if (picked.size === 0) return out
  for (const successor of tasks) { for (const [ordinal, link] of successor.dependencies.entries()) { if (picked.has(`${successor.uid}#${ordinal}`)) out.add(`${link.predecessorUid}>${successor.uid}`) } }
  return out
}
const docs: [string, Task[], Item[]][] = [
  ['normal', [{ uid: 1, dependencies: [] }, { uid: 2, dependencies: [{ predecessorUid: 1 }] }], [{ kind: 'dependency', successorUid: 2, ordinal: 0 }]],
  ['ordinal out of range', [{ uid: 2, dependencies: [{ predecessorUid: 1 }] }], [{ kind: 'dependency', successorUid: 2, ordinal: 5 }]],
  ['duplicate uid 2 (invalid doc)', [{ uid: 2, dependencies: [{ predecessorUid: 1 }] }, { uid: 2, dependencies: [{ predecessorUid: 3 }] }], [{ kind: 'dependency', successorUid: 2, ordinal: 0 }]],
]
for (const [name, tasks, items] of docs) { const a = [...rendererSelectedLinks(tasks, items)].sort().join(' '); const b = [...selectedLinksOf(tasks, items)].sort().join(' '); console.log('links', name, '| renderer:', a, '| geometry:', b, a === b ? 'equal' : 'DIFFER') }
