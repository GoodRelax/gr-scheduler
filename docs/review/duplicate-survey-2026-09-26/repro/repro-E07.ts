// E07: mspdi-codec.ts:1060 taskDepths vs mspdi-imported-rows.ts:24-26 depth sweep (verbatim fragment).
type Task = { uid: number; wbsParentUid: number | null }
function taskDepths(tasks: readonly Task[]): ReadonlyMap<number, number> {
  const parents = new Map<number, number | null>()
  for (const task of tasks) parents.set(task.uid, task.wbsParentUid)
  const depths = new Map<number, number>()
  for (const task of tasks) {
    let depth = 1
    let foundAt = task.wbsParentUid
    for (let steps = 0; steps < tasks.length && foundAt !== null; steps += 1) {
      depth += 1
      foundAt = parents.get(foundAt) ?? null
    }
    depths.set(task.uid, depth)
  }
  return depths
}
function sweepDepths(tasks: readonly Task[]): ReadonlyMap<number, number> {
  const depths = new Map<number, number>()
  for (const task of tasks) {
    const parentDepth = task.wbsParentUid === null ? 0 : depths.get(task.wbsParentUid) ?? 0
    const depth = parentDepth + 1
    depths.set(task.uid, depth)
  }
  return depths
}
const cases: Record<string, Task[]> = {
  'parent first chain': [{ uid: 1, wbsParentUid: null }, { uid: 2, wbsParentUid: 1 }, { uid: 3, wbsParentUid: 2 }],
  'child before parent': [{ uid: 2, wbsParentUid: 1 }, { uid: 1, wbsParentUid: null }],
  'dangling parent': [{ uid: 2, wbsParentUid: 99 }],
  'duplicate uid (stack-built, levels 1,2,3)': [{ uid: 1, wbsParentUid: null }, { uid: 2, wbsParentUid: 1 }, { uid: 1, wbsParentUid: 2 }],
}
for (const [name, tasks] of Object.entries(cases)) {
  const a = JSON.stringify([...taskDepths(tasks)]), b = JSON.stringify([...sweepDepths(tasks)])
  console.log(name, '| taskDepths', a, '| sweep', b, a === b ? 'equal' : 'DIFFER')
}
