// G40 withTask: edit-dependency.ts:50 vs edit-task.ts:143 (+ sameRow :135, withSchedule :129)
// G51 wbs subtree: edit-task-group.ts:120 wbsSubtreesOf vs edit-task.ts:197 wbsSubtreeOf
// G60 settings unflatten: document-file-flow.ts:149 defaultDocumentSettings vs json-codec.ts:88 settingDefaultOf
// NEW-1 day serial: calendar-day.ts:45/101 vs input-command-translator.ts:419/425 vs schedule-grid.ts:70/75 vs time-axis.ts:61
let diff = 0
const show = (label: string, a: unknown, b: unknown) => {
  const sa = JSON.stringify(a), sb = JSON.stringify(b)
  if (sa !== sb) { diff++; console.log('DIFF', label, '\n  first :', sa, '\n  second:', sb) } else console.log('eq  ', label, sa)
}
// ---------- G40
type Task = { uid: number; wbsParentUid: number | null; dependencies: unknown[] }
type Doc = { schedule: { tasks: Task[] } }
function withTaskDep(document: Doc, task: Task): Doc {
  const tasks = document.schedule.tasks.map((one) => (one.uid === task.uid ? task : one))
  return { ...document, schedule: { ...document.schedule, tasks } }
}
function sameRow<T extends object>(a: T, b: T): boolean {
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key])
}
function withTaskEdit(document: Doc, next: Task): Doc {
  const held = document.schedule.tasks.find((one) => one.uid === next.uid)
  if (held !== undefined && sameRow(held, next)) return document
  const tasks = document.schedule.tasks.map((one) => (one.uid === next.uid ? next : one))
  return { ...document, schedule: { ...document.schedule, tasks } }
}
const deps: unknown[] = []
const doc: Doc = { schedule: { tasks: [{ uid: 1, wbsParentUid: null, dependencies: deps }] } }
const t1 = doc.schedule.tasks[0]!
show('withTask no-op {...held} -> same reference?', withTaskDep(doc, { ...t1 }) === doc, withTaskEdit(doc, { ...t1 }) === doc)
show('withTask new dependencies array -> same reference?', withTaskDep(doc, { ...t1, dependencies: [...deps] }) === doc,
  withTaskEdit(doc, { ...t1, dependencies: [...deps] }) === doc)
show('withTask unknown uid -> same reference?', withTaskDep(doc, { uid: 9, wbsParentUid: null, dependencies: [] }) === doc,
  withTaskEdit(doc, { uid: 9, wbsParentUid: null, dependencies: [] }) === doc)
// ---------- G51
function wbsSubtreesOf(tasks: readonly Task[], seeds: Iterable<number>): Set<number> {
  const held = new Set<number>(seeds)
  for (let grew = true; grew; ) {
    grew = false
    for (const task of tasks) {
      if (task.wbsParentUid === null || held.has(task.uid)) continue
      if (held.has(task.wbsParentUid)) { held.add(task.uid); grew = true }
    }
  }
  return held
}
function wbsSubtreeOf(schedule: { tasks: Task[] }, root: number): Set<number> {
  const held = new Set<number>([root])
  for (let grew = true; grew; ) {
    grew = false
    for (const task of schedule.tasks) {
      if (task.wbsParentUid !== null && held.has(task.wbsParentUid) && !held.has(task.uid)) { held.add(task.uid); grew = true }
    }
  }
  return held
}
const T = (uid: number, p: number | null): Task => ({ uid, wbsParentUid: p, dependencies: [] })
const trees: Record<string, [Task[], number[]]> = {
  'child before parent': [[T(3, 2), T(2, 1), T(1, null), T(4, null)], [1]],
  'missing root uid': [[T(1, null), T(2, 99)], [99]],
  'self loop': [[T(1, 1), T(2, 1)], [1]],
  '2-cycle outside seed': [[T(1, 2), T(2, 1), T(3, null)], [3]],
  '2-cycle seeded': [[T(1, 2), T(2, 1), T(3, 2)], [1]],
  'two seeds (paste loops per source)': [[T(1, null), T(2, 1), T(5, null), T(6, 5)], [1, 5]],
}
for (const [name, [tasks, seeds]] of Object.entries(trees)) {
  const union = new Set<number>(); for (const s of seeds) for (const u of wbsSubtreeOf({ tasks }, s)) union.add(u)
  show('subtree ' + name, [...wbsSubtreesOf(tasks, seeds)].sort(), [...union].sort())
}
// ---------- G60
function defaultDocumentSettings(DEFAULTS: Record<string, unknown>): Record<string, unknown> {
  const built: Record<string, unknown> = {}
  for (const [dotted, value] of Object.entries(DEFAULTS)) {
    const path = dotted.split('.'); const leaf = path.pop(); if (leaf === undefined) continue
    let foundAt = built
    for (const step of path) {
      const standing = foundAt[step]
      const group = typeof standing === 'object' && standing !== null ? (standing as Record<string, unknown>) : {}
      foundAt[step] = group; foundAt = group
    }
    foundAt[leaf] = value
  }
  return built
}
function settingDefaultOf(DEFAULTS: Record<string, unknown>, key: string): unknown {
  if (Object.hasOwn(DEFAULTS, key)) return DEFAULTS[key]
  const prefix = `${key}.`
  const members = Object.entries(DEFAULTS).filter(([dotted]) => dotted.startsWith(prefix))
  if (members.length === 0) return undefined
  return Object.fromEntries(members.map(([dotted, value]) => [dotted.slice(prefix.length), value]))
}
const today = { fontMin: 8, 'fontScaleSizes.S': 12, 'fontScaleSizes.M': 14, dualCursor: null }
for (const key of ['fontMin', 'fontScaleSizes', 'dualCursor', 'nope'])
  show('settings default today ' + key, defaultDocumentSettings(today)[key], settingDefaultOf(today, key))
const threeDeep = { 'a.b.c': 1, 'a.d': 2 }
show('settings default a 3-segment key a.b.c', defaultDocumentSettings(threeDeep)['a'], settingDefaultOf(threeDeep, 'a'))
const leafAndGroup = { a: 5, 'a.b': 1 }
show('settings default key both a leaf and a group', defaultDocumentSettings(leafAndGroup)['a'], settingDefaultOf(leafAndGroup, 'a'))
// ---------- NEW-1
const MS = 86400000
type Day = { year: number; month: number; day: number }
const serialA = (d: Day) => Date.UTC(d.year, d.month - 1, d.day) / 86400000            // calendar-day.ts:45
const serialB = (d: Day) => Math.floor(Date.UTC(d.year, d.month - 1, d.day) / MS)     // input-command-translator.ts:419, schedule-grid.ts:70
const fromA = (v: number): Day => { const at = new Date(v * 86400000); return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() } }
const fromB = (v: number): Day => { const at = new Date(v * MS); return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() } }
for (const d of [{ year: 2026, month: 9, day: 26 }, { year: 1969, month: 12, day: 31 }, { year: 50, month: 1, day: 1 }, { year: 2200, month: 12, day: 31 }, { year: 2026, month: 2, day: 30 }])
  show('serial ' + JSON.stringify(d), [serialA(d), fromA(serialA(d))], [serialB(d), fromB(serialB(d))])
for (const v of [0, -1, 20000.5, -0.5]) show('fromSerial ' + v, fromA(v), fromB(v))
console.log('differences:', diff)
