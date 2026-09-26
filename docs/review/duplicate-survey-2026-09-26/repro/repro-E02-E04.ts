// E02: working-calendar.ts:117-120 fixed walk span vs edit-task.ts:180 checkDay reading the document's S-119/S-120.
// E04: the five "held actual length" spellings all reach actualLengthOf; only mspdi-codec catches its throw.
type CalendarDay = { year: number; month: number; day: number }
const DATE_HEAD = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/
function dayOf(text: string | null): CalendarDay | null { // calendar-day.ts:17
  if (text === null) return null
  const hit = DATE_HEAD.exec(text.trim()); if (hit === null) return null
  const [year, month, day] = [Number(hit[1]), Number(hit[2]), Number(hit[3])]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const round = new Date(Date.UTC(year, month - 1, day))
  if (round.getUTCMonth() !== month - 1 || round.getUTCDate() !== day) return null
  return { year, month, day }
}
function compareDays(a: CalendarDay, b: CalendarDay): number { if (a.year !== b.year) return a.year - b.year; if (a.month !== b.month) return a.month - b.month; return a.day - b.day }
function serial(day: CalendarDay): number { return Date.UTC(day.year, day.month - 1, day.day) / 86400000 }
function dayFromSerial(value: number): CalendarDay { const at = new Date(value * 86400000); return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() } }
// working-calendar.ts:117-120 verbatim
const IMPORT_MIN_DAY: CalendarDay = { year: 1970, month: 1, day: 1 }
const IMPORT_MAX_DAY: CalendarDay = { year: 2200, month: 12, day: 31 }
const ACCEPTED_DAY_SPAN = serial(IMPORT_MAX_DAY) - serial(IMPORT_MIN_DAY)
// generated document-settings.ts:196,199
const SETTINGS_DEFAULTS = { importMaxDate: '2200-12-31', importMinDate: '1970-01-01' }
function workingDaysBetween(from: CalendarDay, to: CalendarDay): number { // working-calendar.ts:143-156, weekday calendar stubbed as all-working
  const start = serial(from), stop = serial(to)
  if (Math.abs(stop - start) > ACCEPTED_DAY_SPAN) throw new Error('DaySpanTooWide')
  return stop - start
}
function actualLengthOf(start: CalendarDay, lastDay: CalendarDay): number { // working-calendar.ts:198
  const order = compareDays(lastDay, start)
  if (order < 0) return -workingDaysBetween(lastDay, start)
  if (order === 0) return 1
  return workingDaysBetween(dayFromSerial(serial(start) + 1), lastDay) + 2
}
function checkDay(settings: { importMinDate: string; importMaxDate: string }, text: string) { // edit-task.ts:180
  const day = dayOf(text); if (day === null) return { ok: false, what: `is not a date: ${text}` }
  const min = dayOf(settings.importMinDate), max = dayOf(settings.importMaxDate)
  if (min !== null && compareDays(day, min) < 0) return { ok: false, what: `is before ${settings.importMinDate}: ${text}` }
  if (max !== null && compareDays(day, max) > 0) return { ok: false, what: `is after ${settings.importMaxDate}: ${text}` }
  return { ok: true, day }
}
console.log('literal == generated default:', JSON.stringify(dayOf(SETTINGS_DEFAULTS.importMinDate)) === JSON.stringify(IMPORT_MIN_DAY), JSON.stringify(dayOf(SETTINGS_DEFAULTS.importMaxDate)) === JSON.stringify(IMPORT_MAX_DAY), 'span', ACCEPTED_DAY_SPAN)
for (const settings of [SETTINGS_DEFAULTS, { importMinDate: '1970-01-01', importMaxDate: '2400-12-31' }]) {
  const a = checkDay(settings, '1970-01-01'), b = checkDay(settings, settings.importMaxDate)
  let length: string
  try { length = String(actualLengthOf(a.day!, b.day!)) } catch (e) { length = 'THROWS ' + (e as Error).message }
  console.log('bounds', settings.importMinDate, settings.importMaxDate, '| checkDay ok', a.ok, b.ok, '| actualLengthOf', length)
}
