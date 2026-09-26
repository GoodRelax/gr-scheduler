// E09: row-grab.ts:241 drawnRowIndentOf vs row-title-panel.ts:171 via screen-regions.ts:121 drawnSettingsOf (rowTitleIndent only).
const S236 = 0.625
function displayRatioOf(s: { displayScale: number }): number { const step = s.displayScale; const held = typeof step === 'number' && Number.isFinite(step) ? step : 100; return (held / 100) * S236 }
function drawnRowIndentOf(s: { displayScale: number; rowTitleIndent: number }): number { return s.rowTitleIndent * displayRatioOf(s) }
function drawnIndent(s: { displayScale: number; rowTitleIndent: number }): number { const ratio = displayRatioOf(s); if (!(ratio > 0)) return s.rowTitleIndent; return ratio !== 1 ? s.rowTitleIndent * ratio : s.rowTitleIndent }
for (const displayScale of [50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 160, 0, -100]) for (const rowTitleIndent of [16, 0, 7.3]) {
  const a = drawnRowIndentOf({ displayScale, rowTitleIndent }), b = drawnIndent({ displayScale, rowTitleIndent })
  if (a !== b || displayScale === 0) console.log('E09 displayScale', displayScale, 'indent', rowTitleIndent, 'row-grab', a, 'panel', b, a === b ? 'equal' : 'DIFFER')
}
// E12: row-tree-entrances.ts:205 orderPastLastChild vs task-create.ts:73-75 (root rows).
type Row = { parentId: string | null; order: number }
function orderPastLastChild(rows: Row[], parentGroupId: string | null): number {
  let lastOrder: number | null = null
  for (const row of rows) { if (row.parentId !== parentGroupId) continue; if (lastOrder === null || row.order > lastOrder) lastOrder = row.order }
  return lastOrder === null ? 0 : lastOrder + 1
}
function taskCreateOrder(rows: Row[]): number { return rows.filter((one) => one.parentId === null).reduce((best, one) => Math.max(best, one.order), -1) + 1 }
for (const orders of [[], [0, 1, 2], [0, 5], [-5, -3], [-1], [-2, 0], [3.5]]) {
  const rows = orders.map((order) => ({ parentId: null, order }))
  const a = orderPastLastChild(rows, null), b = taskCreateOrder(rows)
  console.log('E12 root orders', JSON.stringify(orders), 'entrance', a, 'task-create', b, a === b ? 'equal' : 'DIFFER')
}
// E13: schedule-layout.ts:399-404 vs task-group-order.ts:42 compareByStackOrder.
type T = { start: string | null; finish: string | null; uid: number }
const layoutCmp = (a: T, b: T) => (a.start ?? '').localeCompare(b.start ?? '') || (b.finish ?? '').localeCompare(a.finish ?? '') || a.uid - b.uid
function compareByStackOrder(left: T, right: T): number {
  const text = (a: string | null, b: string | null): number => a === b ? 0 : (a ?? '') < (b ?? '') ? -1 : 1
  const byStart = text(left.start, right.start); if (byStart !== 0) return byStart
  const byFinish = text(left.finish, right.finish); if (byFinish !== 0) return -byFinish
  return left.uid - right.uid
}
const texts: (string | null)[] = [null, '2026-01-05T00:00:00', '2026-01-05', '2026-01-05T08:00:00', '2026-01-05 07:00:00', '2026-01-06T00:00:00', '2025-12-31T00:00:00', '2026-01-05T8:00:00', '1999-01-01T00:00:00', '2026-11-05T00:00:00']
let tried = 0, diff = 0
for (const s1 of texts) for (const s2 of texts) for (const f1 of texts) for (const f2 of texts) {
  const a = { start: s1, finish: f1, uid: 1 }, b = { start: s2, finish: f2, uid: 2 }
  tried++
  if (Math.sign(layoutCmp(a, b)) !== Math.sign(compareByStackOrder(a, b))) { if (diff < 2) console.log('E13 DIFFER', a, b, layoutCmp(a, b), compareByStackOrder(a, b)); diff++ }
}
console.log('E13 reachable-form pairs', tried, 'differences', diff)
const e = { start: '', finish: null, uid: 1 }, n = { start: null, finish: null, uid: 2 }
console.log("E13 start '' vs null: layout", layoutCmp(e, n), layoutCmp(n, e), '| task-group-order', compareByStackOrder(e, n), compareByStackOrder(n, e))
