type ScreenRect = { x: number; y: number; width: number; height: number }
function ttRectHoldsPoint(area: ScreenRect, x: number, y: number): boolean { return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height } // tooltips.ts:98
function srRectHoldsPoint(area: ScreenRect, x: number, y: number): boolean { return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height } // screen-regions.ts:52
function overlaysInside(area: ScreenRect, pointer: { x: number; y: number }): boolean { // schedule-overlays.ts:169-173 (inline)
  return pointer.x >= area.x && pointer.x <= area.x + area.width && pointer.y >= area.y && pointer.y <= area.y + area.height }
function ihaIsInsideRect(x: number, y: number, box: ScreenRect): boolean { return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height } // item-hit-area.ts:77
const rowArea = { x: 300, y: 100, width: 800, height: 500 }
const pts = [[300, 100], [700, 300], [1100, 300], [700, 600], [1100, 600], [299.999, 300], [NaN, 300]]
for (const [x, y] of pts) {
  const r = [ttRectHoldsPoint(rowArea, x, y), srRectHoldsPoint(rowArea, x, y), overlaysInside(rowArea, { x, y }), ihaIsInsideRect(x, y, rowArea)]
  console.log(`(${x},${y})`, 'tooltips/screen-regions/overlays/itemHitArea =', r.join(','), new Set(r).size === 1 ? 'equal' : 'DIFFER')
}
