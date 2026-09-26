// G33: mspdi-codec.ts:163/170 vs task-plan-actual.ts:270/277, verbatim bodies
const S128 = 480
function durationOfMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  return `PT${Math.floor(whole / 60)}H${whole % 60}M0S`
}
function durationText(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  return `PT${Math.floor(whole / 60)}H${whole % 60}M0S`
}
function minutesPerWorkingDay(minutesPerDay: number | null): number {
  return minutesPerDay !== null && minutesPerDay > 0 ? minutesPerDay : S128
}
function minutesPerDayOf(schedule: { project: { minutesPerDay: number | null } }): number {
  const held = schedule.project.minutesPerDay
  return held !== null && held > 0 ? held : S128
}
const mins = [0, -1, -0.5, 0.5, 1.5, 59.5, 60, 61, 479.49, 1e15, 1e300, Infinity, -Infinity, NaN]
let diff = 0
for (const m of mins) { const a = durationOfMinutes(m), b = durationText(m); if (a !== b) { diff++; console.log('DIFF', m, a, b) } else console.log('eq', m, a) }
for (const p of [null, 0, -5, 1, 420, 0.5, NaN, Infinity]) { const a = minutesPerWorkingDay(p), b = minutesPerDayOf({ project: { minutesPerDay: p } }); if (!Object.is(a, b)) { diff++; console.log('DIFF mpd', p, a, b) } else console.log('eq mpd', p, a) }
console.log('differences:', diff)
