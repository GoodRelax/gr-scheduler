// G34: mspdi-codec.ts:1157 writtenConstraintOfGrs (export, grs document) vs
//      task-plan-actual.ts:223 datedPlanOf + :235 pinnedToStart (edit, MSPDI-sourced document).
// Both produce the EX-11 pin {ConstraintType, ConstraintDate, Duration}. Inlined: dayOf, textOfDay,
// serial, a Mon-Fri workingDaysBetween with the DaySpanTooWide guard of working-calendar.ts:144-156.
type Day = { year: number; month: number; day: number }
const dayOf = (t: string | null): Day | null => {
  if (t === null) return null
  const h = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(t.trim()); if (!h) return null
  const [y, m, d] = [Number(h[1]), Number(h[2]), Number(h[3])]
  const r = new Date(Date.UTC(y, m - 1, d)); if (r.getUTCMonth() !== m - 1 || r.getUTCDate() !== d) return null
  return { year: y, month: m, day: d }
}
const pad = (n: number, w: number) => String(n).padStart(w, '0')
const textOfDay = (d: Day) => `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}T00:00:00`
const serial = (d: Day) => Date.UTC(d.year, d.month - 1, d.day) / 86400000
const ACCEPTED_DAY_SPAN = serial({ year: 2200, month: 12, day: 31 }) - serial({ year: 1970, month: 1, day: 1 })
function workingDaysBetween(from: Day, to: Day): number {
  const start = serial(from), stop = serial(to)
  if (Math.abs(stop - start) > ACCEPTED_DAY_SPAN) throw new Error('DaySpanTooWide')
  const step = stop < start ? -1 : 1
  let counted = 0
  for (let at = start; at !== stop; at += step) {
    const wd = new Date((step > 0 ? at : at - 1) * 86400000).getUTCDay()
    if (wd !== 0 && wd !== 6) counted += step
  }
  return counted
}
const S128 = 480
const durationText = (m: number) => { const w = Math.max(0, Math.round(m)); return `PT${Math.floor(w / 60)}H${w % 60}M0S` }
const mpd = (p: number | null) => (p !== null && p > 0 ? p : S128)
type Task = { uid: number; start: string | null; finish: string | null; carry: Record<string, string> }
// export copy (mspdi-codec.ts:1157-1178), for a grs document
function writtenConstraintOfGrs(task: Task, minutesPerDay: number | null, notices: string[]): Record<string, string> {
  const start = dayOf(task.start), finish = dayOf(task.finish)
  if (start === null || finish === null) return {}
  const constraint: Record<string, string> = { ConstraintType: '2', ConstraintDate: textOfDay(start) }
  if (task.carry['Duration'] !== undefined) return constraint
  try {
    const span = workingDaysBetween(start, finish)
    return { ...constraint, Duration: durationText(span * mpd(minutesPerDay)) }
  } catch (why) { notices.push(String(why)); return constraint }
}
// edit copy (task-plan-actual.ts:223-242), for an MSPDI-sourced document
function pinnedOnEdit(task: Task, minutesPerDay: number | null): Record<string, string> | 'no dates' {
  const start = dayOf(task.start), finish = dayOf(task.finish)
  if (start === null || finish === null) return 'no dates'
  const duration = durationText(workingDaysBetween(start, finish) * mpd(minutesPerDay))
  return { ConstraintType: '2', ConstraintDate: textOfDay(start), Duration: duration }
}
let diff = 0
const cases: [string, Task, number | null][] = [
  ['one week', { uid: 1, start: '2026-01-05', finish: '2026-01-12', carry: {} }, null],
  ['same day', { uid: 1, start: '2026-01-05', finish: '2026-01-05', carry: {} }, 420],
  ['finish before start', { uid: 1, start: '2026-01-12', finish: '2026-01-05', carry: {} }, null],
  ['weekend only', { uid: 1, start: '2026-01-10', finish: '2026-01-12', carry: {} }, null],
  ['only a finish', { uid: 1, start: null, finish: '2026-01-05', carry: {} }, null],
  ['span over 230 years', { uid: 1, start: '1900-01-01', finish: '2200-01-01', carry: {} }, null],
]
for (const [name, task, m] of cases) {
  const notices: string[] = []
  const a = writtenConstraintOfGrs(task, m, notices)
  let b: unknown
  try { b = pinnedOnEdit(task, m) } catch (why) { b = 'THROWS ' + String(why) }
  const sa = JSON.stringify(a) + (notices.length ? ' +notice' : ''), sb = JSON.stringify(b)
  const same = sa === sb || (Object.keys(a).length === 0 && b === 'no dates')
  if (!same) { diff++; console.log('DIFF', name, '\n  export:', sa, '\n  edit  :', sb) } else console.log('eq  ', name, sa)
}
console.log('differences:', diff)
