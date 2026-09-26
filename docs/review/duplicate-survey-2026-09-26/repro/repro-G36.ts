// G36: schedule-invariants.ts:67 nestingOf / :158 dateBreaches / IV-10 / IV-14 (:596)
//  vs validate-imported-document.ts:92 wbsShapeOf / :58 sweepDateColumns / FR-012 (:246-258) / :221-230
type CalendarDay = { year: number; month: number; day: number }
const DATE_HEAD = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/
function dayOf(text: string | null): CalendarDay | null {
  if (text === null) return null
  const hit = DATE_HEAD.exec(text.trim())
  if (hit === null) return null
  const [year, month, day] = [Number(hit[1]), Number(hit[2]), Number(hit[3])]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const round = new Date(Date.UTC(year, month - 1, day))
  if (round.getUTCMonth() !== month - 1 || round.getUTCDate() !== day) return null
  return { year, month, day }
}
function compareDays(a: CalendarDay, b: CalendarDay): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}
type Task = { uid: number; wbsParentUid: number | null; start: string | null; finish: string | null; [k: string]: unknown }
// ---- entity copy (schedule-invariants.ts:67-127)
function nestingOf<TKey, TRow>(rows: readonly TRow[], keyOf: (row: TRow) => TKey, parentOf: (row: TRow) => TKey | null) {
  const byKey = new Map<TKey, TRow>()
  for (const row of rows) byKey.set(keyOf(row), row)
  const depthByKey = new Map<TKey, number>()
  const unsettled = new Set<TKey>()
  const rings: (readonly TKey[])[] = []
  for (const row of rows) {
    const from = keyOf(row)
    if (depthByKey.has(from) || unsettled.has(from)) continue
    const chain: TKey[] = []
    const positionOnChain = new Map<TKey, number>()
    let base = 0
    let ring: readonly TKey[] | null = null
    let underRing = false
    let at: TRow | undefined = row
    while (at !== undefined) {
      const key = keyOf(at)
      if (unsettled.has(key)) { underRing = true; break }
      const repeated = positionOnChain.get(key)
      if (repeated !== undefined) { ring = chain.slice(repeated); break }
      const settled = depthByKey.get(key)
      if (settled !== undefined) { base = settled; break }
      positionOnChain.set(key, chain.length)
      chain.push(key)
      const parent = parentOf(at)
      at = parent === null ? undefined : byKey.get(parent)
    }
    if (ring !== null) { rings.push(ring); for (const key of chain) unsettled.add(key) }
    else if (underRing) { for (const key of chain) unsettled.add(key) }
    else { let depth = base + chain.length; for (const key of chain) { depthByKey.set(key, depth); depth -= 1 } }
  }
  return { depthByKey, rings }
}
// ---- use-case copy (validate-imported-document.ts:92-146)
function wbsShapeOf(tasks: readonly Task[]) {
  const byUid = new Map<number, Task>()
  for (const task of tasks) byUid.set(task.uid, task)
  const depthByUid = new Map<number, number>()
  const broken = new Set<number>()
  const rings: (readonly number[])[] = []
  for (const task of tasks) {
    if (depthByUid.has(task.uid) || broken.has(task.uid)) continue
    const chain: number[] = []
    const positionOnChain = new Map<number, number>()
    let base = 0
    let ring: readonly number[] | null = null
    let underRing = false
    let at: Task | undefined = task
    while (at !== undefined) {
      if (broken.has(at.uid)) { underRing = true; break }
      const repeated = positionOnChain.get(at.uid)
      if (repeated !== undefined) { ring = chain.slice(repeated); break }
      const settled = depthByUid.get(at.uid)
      if (settled !== undefined) { base = settled; break }
      positionOnChain.set(at.uid, chain.length)
      chain.push(at.uid)
      const parentUid: number | null = at.wbsParentUid
      at = parentUid === null ? undefined : byUid.get(parentUid)
    }
    if (ring !== null) { rings.push(ring); for (const uid of chain) broken.add(uid) }
    else if (underRing) { for (const uid of chain) broken.add(uid) }
    else { let depth = base + chain.length; for (const uid of chain) { depthByUid.set(uid, depth); depth -= 1 } }
  }
  return { depthByUid, rings }
}
type Accepted = { min: CalendarDay; max: CalendarDay }
// ---- entity copy (schedule-invariants.ts:158-184)
function dateBreaches(row: any, columns: string[], at: string, accepted: Accepted | null) {
  let found: any[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    if (day === null) { found ??= []; found.push({ at: `${at}/${column}`, what: `${JSON.stringify(value)} names no day` }); continue }
    if (accepted === null) continue
    if (compareDays(day, accepted.min) < 0) { found ??= []; found.push({ at: `${at}/${column}`, what: `${value} is before importMinDate` }) }
    else if (compareDays(day, accepted.max) > 0) { found ??= []; found.push({ at: `${at}/${column}`, what: `${value} is after importMaxDate` }) }
  }
  return found ?? []
}
// ---- use-case copy (validate-imported-document.ts:58-84)
function sweepDateColumns(row: any, columns: string[], at: string, accepted: Accepted) {
  let found: any[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    if (day === null) { found ??= []; found.push({ rule: 'IV-14', at: `${at}/${column}`, what: `${JSON.stringify(value)} names no day` }); continue }
    if (compareDays(day, accepted.min) < 0) { found ??= []; found.push({ rule: 'S-119', at: `${at}/${column}`, what: `${value} is before importMinDate` }) }
    else if (compareDays(day, accepted.max) > 0) { found ??= []; found.push({ rule: 'S-120', at: `${at}/${column}`, what: `${value} is after importMaxDate` }) }
  }
  return found ?? []
}
const COLS = ['start', 'finish', 'deadline', 'actualStart', 'stop', 'actualFinish', 'resume']
// the two call sites' handling of an unreadable bound (invariants :596-618 / validate :221-243)
function iv14(task: any, minT: string, maxT: string) {
  const min = dayOf(minT), max = dayOf(maxT)
  const accepted = min !== null && max !== null ? { min, max } : null
  return dateBreaches(task, COLS, '/schedule/tasks/0', accepted).map((b) => b.at + ' ' + b.what)
}
function validateDates(task: any, minT: string, maxT: string) {
  const min = dayOf(minT), max = dayOf(maxT)
  const accepted = min !== null && max !== null ? { min, max } : null
  return accepted === null ? [] : sweepDateColumns(task, COLS, '/schedule/tasks/0', accepted).map((b) => b.at + ' ' + b.what)
}
let diff = 0
const show = (label: string, a: unknown, b: unknown) => {
  const sa = JSON.stringify(a), sb = JSON.stringify(b)
  if (sa !== sb) { diff++; console.log('DIFF', label, '\n  entity  :', sa, '\n  usecase :', sb) } else console.log('eq  ', label, sa)
}
const t = (uid: number, p: number | null): Task => ({ uid, wbsParentUid: p, start: null, finish: null })
const wbsCases: Record<string, Task[]> = {
  empty: [], single: [t(1, null)], selfLoop: [t(1, 1)], twoCycle: [t(1, 2), t(2, 1)], tailIntoRing: [t(3, 1), t(1, 2), t(2, 1)],
  missingParent: [t(1, 99), t(2, 1)], dupUid: [t(1, null), t(1, 1)],
  deepChain: Array.from({ length: 8 }, (_, i) => t(i + 1, i === 0 ? null : i)),
  twoRings: [t(1, 2), t(2, 1), t(3, 4), t(4, 3), t(5, 3)],
}
for (const [name, tasks] of Object.entries(wbsCases)) {
  const e = nestingOf(tasks, (x) => x.uid, (x) => x.wbsParentUid), u = wbsShapeOf(tasks)
  show('wbs ' + name, { d: [...e.depthByKey], r: e.rings }, { d: [...u.depthByUid], r: u.rings })
}
const dateCases: [string, any, string, string][] = [
  ['in range', { start: '2026-01-01', finish: '2026-01-02T08:00:00' }, '1990-01-01', '2100-12-31'],
  ['before min', { start: '1980-01-01' }, '1990-01-01', '2100-12-31'],
  ['after max', { finish: '2200-01-01' }, '1990-01-01', '2100-12-31'],
  ['unreadable value', { start: 'nope', deadline: '' }, '1990-01-01', '2100-12-31'],
  ['Feb 30', { start: '2026-02-30' }, '1990-01-01', '2100-12-31'],
  ['unreadable value + unreadable importMinDate', { start: 'nope' }, 'garbage', '2100-12-31'],
  ['out of range + unreadable importMaxDate', { start: '1800-01-01' }, '1990-01-01', ''],
  ['non-string value', { start: 20260101 }, '1990-01-01', '2100-12-31'],
]
for (const [name, row, mn, mx] of dateCases) show('dates ' + name, iv14(row, mn, mx), validateDates(row, mn, mx))
// FR-012 order (validate :252-258) vs IV-10 (invariants :516-523): same expression in both files
const order = (task: any) => { const s = dayOf(task.start), f = dayOf(task.finish); return s !== null && f !== null && compareDays(f, s) < 0 }
for (const task of [{ start: '2026-01-02', finish: '2026-01-01' }, { start: '2026-01-01', finish: '2026-01-01' },
  { start: null, finish: '2026-01-01' }, { start: '2026-01-02T23:00', finish: '2026-01-02T01:00' }])
  show('order ' + JSON.stringify(task), order(task), order(task))
console.log('differences:', diff)
