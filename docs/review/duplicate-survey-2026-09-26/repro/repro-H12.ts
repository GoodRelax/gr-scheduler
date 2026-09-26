// H12: a Task's drawn left edge. schedule-task-figures.ts:349-354 (cull) vs task-figures.ts:524-526 (outside-label start).
type Placed = { x: number; width: number; actualX: number | null; actualWidth: number }
function cullExtent(placed: Placed) {
  const barLeft =
    placed.actualX === null ? placed.x : Math.min(placed.x, placed.actualX)
  const barRight =
    placed.actualX === null
      ? placed.x + placed.width
      : Math.max(placed.x + placed.width, placed.actualX + placed.actualWidth)
  return { barLeft, barRight }
}
function drawnStartOf(inputs: { showActual: boolean }, placed: Placed) {
  const drawnStart = inputs.showActual && placed.actualX !== null
    ? Math.min(placed.x, placed.actualX)
    : placed.x
  return drawnStart
}
// actual began before the plan (plan 300..400, actual 100..200), actual hidden (actualVisible false)
const placed: Placed = { x: 300, width: 100, actualX: 100, actualWidth: 100 }
console.log('showActual=false: cull left =', cullExtent(placed).barLeft, ' right =', cullExtent(placed).barRight, '; task-figures drawnStart =', drawnStartOf({ showActual: false }, placed))
console.log('showActual=true : cull left =', cullExtent(placed).barLeft, '; task-figures drawnStart =', drawnStartOf({ showActual: true }, placed))
// window [drawnLeftOf, drawnRightOf] = [0, 250]: the cull keeps the task (barLeft 100 <= 250) although nothing drawn lies inside
const drawnLeftOf = 0; const drawnRightOf = 250
const e = cullExtent(placed)
console.log('window 0..250, actual hidden: cull keeps task =', !(e.barRight < drawnLeftOf || e.barLeft > drawnRightOf), '; drawn plan 300..400 inside window =', !(400 < drawnLeftOf || 300 > drawnRightOf))
