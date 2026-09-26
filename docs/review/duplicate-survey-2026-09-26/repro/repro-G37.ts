// G37: uid issuing.
// (a) paste minting order: task-paste.ts:39-41 (schedule.tasks order) vs edit-task-group.ts:288-291 (sorted by uid)
type Task = { uid: number }
function taskPasteRemap(tasks: Task[], subtree: Set<number>, mark0: number) {
  let mark = mark0; const remap = new Map<number, number>()
  for (const one of tasks) if (subtree.has(one.uid)) remap.set(one.uid, ++mark)
  return [...remap.entries()].sort((a, b) => a[0] - b[0])
}
function groupPasteRemap(copiedTasks: Set<number>, mark0: number) {
  let mark = mark0; const uidOf = new Map<number, number>()
  for (const uid of [...copiedTasks].sort((a, b) => a - b)) uidOf.set(uid, ++mark)
  return [...uidOf.entries()].sort((a, b) => a[0] - b[0])
}
for (const tasks of [[{ uid: 3 }, { uid: 5 }], [{ uid: 5 }, { uid: 3 }]]) {
  const subtree = new Set([3, 5])
  const a = taskPasteRemap(tasks, subtree, 10), b = groupPasteRemap(subtree, 10)
  console.log('tasks order', JSON.stringify(tasks.map((t) => t.uid)), 'task-paste', JSON.stringify(a), 'edit-task-group', JSON.stringify(b), JSON.stringify(a) === JSON.stringify(b) ? '' : '<-- DIFFER')
}
// (b) true high water: mspdi-codec.ts:355 (spread Math.max) vs import-document.ts:504 highWaterOf (loop)
function mspdiHigh(mark: number, uids: number[]) { return Math.max(mark, ...uids) }
function loopHigh(mark: number, uids: number[]) { let top = mark; for (const u of uids) top = Math.max(top, u); return top }
for (const n of [0, 3, 100000, 200000, 1000000]) {
  const uids = Array.from({ length: n }, (_, i) => i + 1)
  let a: unknown; try { a = mspdiHigh(0, uids) } catch (e) { a = (e as Error).name + ': ' + (e as Error).message }
  const b = loopHigh(0, uids)
  console.log('rows', n, 'mspdi spread', a, '| loop', b, a === b ? '' : '<-- DIFFER')
}
console.log('NaN uid: spread', mspdiHigh(1, [NaN, 2]), 'loop', loopHigh(1, [NaN, 2]))
