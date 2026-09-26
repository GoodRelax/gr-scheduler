// G01/G02: serial <-> day copies, verbatim bodies
type CalendarDay = { year: number; month: number; day: number }
const MS_PER_DAY = 86400000
// calendar-day.ts:45
function serial(day: CalendarDay): number { return Date.UTC(day.year, day.month - 1, day.day) / 86400000 }
// calendar-day.ts:101
function dayFromSerialE(value: number): CalendarDay { const at = new Date(value * 86400000); return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() } }
// input-command-translator.ts:420 (== schedule-grid.ts:69 serialOf == time-axis.ts:14 serialOf)
function serialOfDay(day: CalendarDay): number { return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY) }
// input-command-translator.ts:425 (== schedule-grid.ts:74 dayOfSerial)
function dayFromSerialT(serial: number): CalendarDay { const at = new Date(serial * MS_PER_DAY); return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() } }
// time-axis.ts:60-61 inline
function dayInlineTA(s: number): CalendarDay { const foundAt = new Date(s * MS_PER_DAY); return { year: foundAt.getUTCFullYear(), month: foundAt.getUTCMonth() + 1, day: foundAt.getUTCDate() } }
// calendar-day.ts:36
function compareDays(a: CalendarDay, b: CalendarDay): number { if (a.year !== b.year) return a.year - b.year; if (a.month !== b.month) return a.month - b.month; return a.day - b.day }
// input-command-translator.ts:1293
function compareDay(a: CalendarDay, b: CalendarDay): number { return serialOfDay(a) - serialOfDay(b) }
// calendar-day.ts:51
function calendarDaysBetween(from: CalendarDay, to: CalendarDay): number { return serial(to) - serial(from) }
// working-calendar.ts:71 vs schedule-grid.ts:80
function wcWeekday(s: number) { return new Date(s * 86400000).getUTCDay() + 1 }
function sgWeekdayOf(day: CalendarDay): number { return new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay() }

const days: CalendarDay[] = [
  { year: 2026, month: 9, day: 26 }, { year: 1969, month: 12, day: 31 }, { year: 1900, month: 1, day: 1 }, { year: 1, month: 1, day: 1 },
  { year: 50, month: 1, day: 1 }, { year: 1950, month: 1, day: 1 }, { year: 1000, month: 1, day: 1 }, { year: 2026, month: 1, day: 32 }, { year: 2026, month: 2, day: 1 },
  { year: 2026, month: 13, day: 1 }, { year: 2026, month: 1, day: 1.5 }, { year: 275760, month: 9, day: 13 }, { year: 275760, month: 9, day: 14 }, { year: NaN, month: 1, day: 1 }, { year: -1, month: 1, day: 1 },
]
const eq = (a: unknown, b: unknown) => Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b)
let diffs = 0
for (const d of days) {
  if (!eq(serial(d), serialOfDay(d))) { diffs++; console.log('serial differs', d, serial(d), serialOfDay(d)) }
  if (!eq(sgWeekdayOf(d) + 1, wcWeekday(serial(d)))) console.log('weekday numbering', d, sgWeekdayOf(d), wcWeekday(serial(d)))
}
for (const s of [0, -1, -719162, -25567, 20000, 1.5, -0.5, 1e8, 1e8 + 1, NaN, Infinity]) {
  const a = dayFromSerialE(s), b = dayFromSerialT(s), c = dayInlineTA(s)
  if (!eq(a, b) || !eq(a, c)) { diffs++; console.log('dayFromSerial differs', s, a, b, c) }
}
for (const a of days) for (const b of days) {
  const x = Math.sign(compareDays(a, b)), y = Math.sign(compareDay(a, b))
  if (!eq(x, y)) console.log('compare differs', JSON.stringify(a), JSON.stringify(b), 'compareDays', compareDays(a, b), 'compareDay', compareDay(a, b))
  if (!eq(calendarDaysBetween(a, b), serialOfDay(b) - serialOfDay(a))) console.log('between differs', a, b)
}
console.log('serial/dayFromSerial diffs', diffs)
