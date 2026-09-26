// H07: Stop from an actual length. json-codec.ts:284-304 (+ caller :335-343) vs mspdi-codec.ts:620-640.
// lastDayForLength / indexOfCalendar / isWorkingDayAt copied verbatim from working-calendar.ts:43-73,209-223 (exceptions omitted: none in the inputs).
type Day = { year: number; month: number; day: number }
const serial = (d: Day) => Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86400000)
const dayFromSerial = (s: number): Day => { const t = new Date(s * 86400000); return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() } }
const textOfDay = (d: Day) => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
const dayOf = (t: string | null): Day | null => { if (t === null) return null; const [y, m, d] = t.split('-').map(Number); return { year: y!, month: m!, day: d! } }
const ACCEPTED_DAY_SPAN = serial({ year: 2200, month: 12, day: 31 }) - serial({ year: 1970, month: 1, day: 1 })
class NoWorkingDayReached extends Error { calendarUid: number; constructor(calendarUid: number) { super(`table T-214: calendar ${calendarUid} works no day inside the accepted range`); this.calendarUid = calendarUid } }
type WeekDay = { dayType: number | null; dayWorking: boolean | null }
type Within = { calendar: { uid: number }; weekDays: WeekDay[] }
function indexOfCalendar(within: Within) {
  const worksWeekday: (boolean | undefined)[] = new Array<boolean | undefined>(8)
  for (const weekDay of within.weekDays) {
    const dayType = weekDay.dayType
    if (dayType === null || dayType < 1 || dayType > 7) continue
    if (worksWeekday[dayType] === undefined) worksWeekday[dayType] = weekDay.dayWorking === true
  }
  return { worksWeekday }
}
function isWorkingDayAt(index: { worksWeekday: (boolean | undefined)[] }, atSerial: number): boolean {
  const weekday = new Date(atSerial * 86400000).getUTCDay() + 1
  return index.worksWeekday[weekday] === true
}
function lastDayForLength(within: Within, start: Day, length: number): Day {
  if (length === 0) return start
  if (length < 0) throw new Error('not used')
  const index = indexOfCalendar(within)
  let at = serial(start)
  let remaining = length - 1
  let walked = 0
  while (remaining > 0) {
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    at += 1
    if (isWorkingDayAt(index, at)) remaining -= 1
  }
  return dayFromSerial(at)
}
type Task = { uid: number; actualStart: string | null; actualFinish: string | null; stop: string | null; carry: Record<string, string> }

// json-codec.ts:284-304 body, wrapped as documentFromJson :335-343 wraps it
function jsonRead(tasksIn: Task[], lengthByTaskIndex: Map<number, unknown>, within: Within) {
  try {
    const tasks = tasksIn.map((task, index) => {
      if (!lengthByTaskIndex.has(index)) return task
      const carriedStop = task.carry['Stop']
      if (carriedStop !== undefined) {
        const carry = Object.fromEntries(Object.entries(task.carry).filter(([name]) => name !== 'Stop'))
        return { ...task, stop: carriedStop, carry }
      }
      const start = dayOf(task.actualStart)
      const length = lengthByTaskIndex.get(index)
      if (task.actualFinish !== null || start === null || typeof length !== 'number') return task
      return { ...task, stop: textOfDay(lastDayForLength(within, start, length)) }
    })
    return { ok: true, tasks }
  } catch (why) {
    return { ok: false, refused: `/schedule/tasks an actual length could not be placed as a day: ${why instanceof Error ? why.message : String(why)}` }
  }
}
// mspdi-codec.ts:620-640 body (days handed in directly instead of workingDaysOfActualDuration)
function mspdiRead(tasksIn: Task[], daysOf: Map<number, number>, within: Within) {
  const notices: string[] = []
  const tasks = tasksIn.map((task) => {
    const start = dayOf(task.actualStart)
    if (task.stop !== null || task.actualFinish !== null || start === null) return task
    const at = `/Project/Tasks/Task[uid=${task.uid}]`
    const days = daysOf.get(task.uid) ?? null
    if (days === null) return task
    try {
      return { ...task, stop: textOfDay(lastDayForLength(within, start, days)) }
    } catch (why) {
      notices.push(`${at}/Stop could not be counted: ${why instanceof Error ? why.message : String(why)}`)
      return task
    }
  })
  return { ok: true, tasks, notices }
}

const noWork: Within = { calendar: { uid: 1 }, weekDays: [1, 2, 3, 4, 5, 6, 7].map((t) => ({ dayType: t, dayWorking: false })) }
const monFri: Within = { calendar: { uid: 1 }, weekDays: [1, 2, 3, 4, 5, 6, 7].map((t) => ({ dayType: t, dayWorking: t >= 2 && t <= 6 })) }
const two = (): Task[] => [
  { uid: 1, actualStart: '2026-01-05', actualFinish: null, stop: null, carry: {} },
  { uid: 2, actualStart: '2026-01-05', actualFinish: null, stop: null, carry: {} },
]
console.log('case A: calendar with no working weekday; task 1 length 3, task 2 length 1')
console.log(' json :', JSON.stringify(jsonRead(two(), new Map([[0, 3], [1, 1]]), noWork)))
console.log(' mspdi:', JSON.stringify(mspdiRead(two(), new Map([[1, 3], [2, 1]]), noWork)))
console.log('case B: Mon-Fri calendar; task 1 length 100000 working days, task 2 length 5')
console.log(' json :', JSON.stringify(jsonRead(two(), new Map([[0, 100000], [1, 5]]), monFri)))
console.log(' mspdi:', JSON.stringify(mspdiRead(two(), new Map([[1, 100000], [2, 5]]), monFri)))
