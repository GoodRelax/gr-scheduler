// E34: task-paste.ts:40-66 pasteTaskSubtree vs edit-task-group.ts:288-340 (pasteTaskGroupSubtree), carry + minting order.
// Carry step copied from task-plan-actual.ts:208,262-264 (planDatesEdited, dated branch; Manual* rebuild omitted: no Manual* in input).
const CARRIED_SLACKS: readonly string[] = ['FreeSlack', 'TotalSlack', 'StartSlack', 'FinishSlack']
type Task = { uid: number; carry: Record<string, string> }
const planDatesEditedCarry = (task: Task): Task => ({ ...task, carry: Object.fromEntries(Object.entries(task.carry).filter(([name]) => !CARRIED_SLACKS.includes(name))) })
const tasks: Task[] = [{ uid: 5, carry: { FreeSlack: '4800', TotalSlack: '4800', Hyperlink: 'x' } }, { uid: 3, carry: {} }]
const subtree = new Set([5, 3]); const hw = 10
// task-paste: mints in document order, runs planDatesEdited
let mark = hw; const remapA = new Map<number, number>(); for (const t of tasks) if (subtree.has(t.uid)) remapA.set(t.uid, ++mark)
const a = tasks.filter((t) => subtree.has(t.uid)).map((t) => planDatesEditedCarry({ ...t, uid: remapA.get(t.uid)! }))
// row paste: mints in sorted order, copies ...task as is
mark = hw; const remapB = new Map<number, number>(); for (const uid of [...subtree].sort((x, y) => x - y)) remapB.set(uid, ++mark)
const b = tasks.filter((t) => remapB.has(t.uid)).map((t) => ({ ...t, uid: remapB.get(t.uid)! }))
console.log('pasteTaskSubtree      :', JSON.stringify(a))
console.log('pasteTaskGroupSubtree :', JSON.stringify(b))
