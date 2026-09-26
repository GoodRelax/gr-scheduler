// G03 extra pair: scroll anchor from a left x. translator dayAnchorAt (:516, unitFraction :500) vs fit-zoom.ts:145 fittedLeftEdge.
// dateAtX / xFromDay / serialOf verbatim from time-axis.ts:56/71/14.
type CalendarDay = { year: number; month: number; day: number }
type Axis = { pxPerDay: number; originDay: CalendarDay | null; originX: number }
const MS_PER_DAY = 86400000
function serialOf(day: CalendarDay): number { return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY) }
function dateAtX(layout: Axis, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const span = (x - layout.originX) / layout.pxPerDay
  const whole = Math.round(span)
  const days = Math.abs(span - whole) < 1e-9 ? whole : Math.floor(span)
  const foundAt = new Date((serialOf(layout.originDay) + days) * MS_PER_DAY)
  return { year: foundAt.getUTCFullYear(), month: foundAt.getUTCMonth() + 1, day: foundAt.getUTCDate() }
}
function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number, day: CalendarDay): number { return originX + (serialOf(day) - originSerial) * pxPerDay }
function xFromDay(layout: Axis, day: CalendarDay): number { const origin = layout.originDay; if (origin === null) return layout.originX; return xOnTimeAxis(serialOf(origin), layout.pxPerDay, layout.originX, day) }
function unitFraction(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0 && value > -1e-9) return 0
  const dropped = value - Math.floor(value)
  return dropped < 1 ? dropped : 0
}
function translatorOffset(layout: Axis, x: number) { const day = dateAtX(layout, x); if (day === null || !(layout.pxPerDay > 0)) return null; return unitFraction((x - xFromDay(layout, day)) / layout.pxPerDay) }
function fitOffset(chosen: Axis, leftX: number) { if (!(chosen.pxPerDay > 0)) return null; const day = dateAtX(chosen, leftX); if (day === null) return null; const into = (leftX - xFromDay(chosen, day)) / chosen.pxPerDay; return into > 0 && into < 1 ? into : 0 }
let diffs = 0, tried = 0
const origin = { year: 2026, month: 1, day: 1 }
for (const pxPerDay of [0.37, 1, 3.3, 17.123456, 1e-7, 1e7]) for (const originX of [0, 213.7, -1e6]) {
  for (let i = -2000; i <= 2000; i++) {
    const x = originX + i * pxPerDay * 0.1234567 + (i % 7) * 1e-10
    tried++
    const a = translatorOffset({ pxPerDay, originDay: origin, originX }, x), b = fitOffset({ pxPerDay, originDay: origin, originX }, x)
    if (a !== b && !(Math.abs((a ?? 0) - (b ?? 0)) < 1e-12)) { if (diffs < 5) console.log('DIFFER pxPerDay', pxPerDay, 'originX', originX, 'x', x, 'translator', a, 'fit', b); diffs++ }
  }
}
console.log('tried', tried, 'differences', diffs)
