// H10: boxOfPoints (svg-renderer.ts:85) vs boxOfPath (item-hit-area.ts:123); cornersOfBar (schedule-task-figures.ts:110) vs bandOfBar (item-hit-area.ts:208).
type Point = { x: number; y: number }
type Rect = { x: number; y: number; width: number; height: number }
type Bar = { form: 'outline'; points: Point[] } | { form: 'line'; from: Point; to: Point; strokeWidth: number; head: Point[] | null; dots: { at: Point; radius: number }[] }
function boxOfPoints(path: Point[]): Rect | null {
  const first = path[0]
  if (first === undefined) return null
  let left = first.x; let right = first.x; let top = first.y; let bottom = first.y
  for (const one of path) { left = Math.min(left, one.x); right = Math.max(right, one.x); top = Math.min(top, one.y); bottom = Math.max(bottom, one.y) }
  return { x: left, y: top, width: right - left, height: bottom - top }
}
function boxOfPath(points: Point[]): Rect | null {
  if (points.length === 0) return null
  const xs = points.map((one) => one.x); const ys = points.map((one) => one.y)
  const x = Math.min(...xs); const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}
const rightOf = (r: Rect) => r.x + r.width; const bottomOf = (r: Rect) => r.y + r.height
function merged(a: Rect | null, b: Rect | null): Rect | null {
  if (a === null) return b
  if (b === null) return a
  const x = Math.min(a.x, b.x); const y = Math.min(a.y, b.y)
  return { x, y, width: Math.max(rightOf(a), rightOf(b)) - x, height: Math.max(bottomOf(a), bottomOf(b)) - y }
}
function cornersOfBar(bar: Bar): Point[] {
  if (bar.form === 'outline') return bar.points
  const out = [bar.from, bar.to, ...(bar.head ?? [])]
  for (const dot of bar.dots) { out.push({ x: dot.at.x - dot.radius, y: dot.at.y - dot.radius }); out.push({ x: dot.at.x + dot.radius, y: dot.at.y + dot.radius }) }
  return out
}
function bandOfBar(bar: Bar | null): Rect | null {
  if (bar === null) return null
  if (bar.form === 'outline') return boxOfPath(bar.points)
  const half = bar.strokeWidth / 2
  let box = boxOfPath([{ x: bar.from.x, y: bar.from.y - half }, { x: bar.to.x, y: bar.to.y + half }, ...(bar.head ?? [])])
  for (const dot of bar.dots) { const side = dot.radius * 2; box = merged(box, { x: dot.at.x - dot.radius, y: dot.at.y - dot.radius, width: side, height: side }) }
  return box
}
let diff = 0
for (let i = 0; i < 20000; i++) {
  const n = 1 + Math.floor(Math.random() * 8)
  const pts = Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * 2000, y: (Math.random() - 0.5) * 2000 }))
  if (JSON.stringify(boxOfPoints(pts)) !== JSON.stringify(boxOfPath(pts))) diff++
}
console.log('boxOfPoints vs boxOfPath, 20000 random paths: differing =', diff, '; empty ->', boxOfPoints([]), boxOfPath([]))
const line: Bar = { form: 'line', from: { x: 10, y: 50 }, to: { x: 100, y: 50 }, strokeWidth: 4, head: null, dots: [] }
console.log('line bar 10..100 at y=50, strokeWidth 4:')
console.log(' mask / selection frame box (boxOfPoints(cornersOfBar)) =', JSON.stringify(boxOfPoints(cornersOfBar(line))))
console.log(' hit band (bandOfBar)                                  =', JSON.stringify(bandOfBar(line)))
