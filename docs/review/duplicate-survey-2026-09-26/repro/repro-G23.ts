type Task = { fadeInDays: number | null; fadeOutDays: number | null }
// schedule-layout.ts:201 clampedFade (rectangle branch; kind fixed to 'rectangle')
function clampedFade(task: Task, kind: string, span: number, pxPerDay: number) {
  if (kind !== 'rectangle' && kind !== 'chevron') return { fadeIn: 0, fadeOut: 0 }
  const asPixels = (days: number | null): number => Math.max(0, (days ?? 0) * pxPerDay)
  const rawIn = asPixels(task.fadeInDays); const rawOut = asPixels(task.fadeOutDays)
  if (rawIn + rawOut <= span) return { fadeIn: rawIn, fadeOut: rawOut }
  if (kind === 'chevron') { const ratio = span / (rawIn + rawOut); return { fadeIn: rawIn * ratio, fadeOut: rawOut * ratio } }
  const fadeIn = Math.min(rawIn, span)
  return { fadeIn, fadeOut: Math.min(rawOut, span - fadeIn) }
}
// item-grab.ts:500 clampedFadeDays
function clampedFadeDays(task: Task, grab: 'GA-7' | 'GA-8', pulled: number, span: number): number {
  const room = grab === 'GA-7' ? span : span - (task.fadeInDays ?? 0)
  return Math.min(Math.max(0, pulled), Math.max(0, room))
}
// task-appearance.ts:61-66 setTaskFadeDays refusal predicate (IV-12)
function refusedBySetFade(task: Task, which: 'in' | 'out', days: number, span: number): boolean {
  if (!Number.isInteger(days) || days < 0) return true
  const other = which === 'in' ? task.fadeOutDays : task.fadeInDays
  return days + (other ?? 0) > span
}
// schedule-invariants.ts:555-558 IV-12 and task-plan-actual.ts:303-305
function iv12(task: Task, span: number): boolean { if (task.fadeInDays === null && task.fadeOutDays === null) return false; return (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0) > span }
function planDatesRefuse(task: Task, span: number): boolean { const fade = (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0); return fade > span }
const ppd = 1, span = 10
const cases: [string, Task, 'GA-7' | 'GA-8', number][] = [
  ['in, out=0, pull 8', { fadeInDays: 0, fadeOutDays: 0 }, 'GA-7', 8],
  ['in, out=4, pull 8', { fadeInDays: 0, fadeOutDays: 4 }, 'GA-7', 8],
  ['in, out=4, pull 15', { fadeInDays: 0, fadeOutDays: 4 }, 'GA-7', 15],
  ['out, in=3, pull 9', { fadeInDays: 3, fadeOutDays: 0 }, 'GA-8', 9],
  ['out, in=-3 (invalid), pull 12', { fadeInDays: -3, fadeOutDays: 0 }, 'GA-8', 12],
]
for (const [name, task, grab, pulled] of cases) {
  const days = clampedFadeDays(task, grab, pulled, span)
  const next: Task = grab === 'GA-7' ? { ...task, fadeInDays: days } : { ...task, fadeOutDays: days }
  const drawn = clampedFade(next, 'rectangle', span * ppd, ppd)
  const drawnDays = grab === 'GA-7' ? drawn.fadeIn / ppd : drawn.fadeOut / ppd
  const refused = refusedBySetFade(task, grab === 'GA-7' ? 'in' : 'out', days, span)
  console.log(name.padEnd(30), `handle clamp=${days}`, `layout clamp of same=${drawnDays}`, `setTaskFadeDays refuses=${refused}`, `IV-12 after=${iv12(next, span)}`, `planDates check=${planDatesRefuse(next, span)}`)
}
