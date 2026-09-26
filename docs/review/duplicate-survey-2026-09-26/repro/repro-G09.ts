// G09: the row slab. zoom-and-fit.ts:325 rowPointIn vs row-scroll.ts:11 scrollOffsetOf (+ rowAreaY); inverse translator:546 rowAnchorIn
type Row = { groupId: string; y: number; height: number }
type Anchor = { scrollGroupId: string | null; scrollGroupOffset: number }
function rowPointIn(rows: readonly Row[], anchor: Anchor): number | null {
  const at = rows.findIndex((row) => row.groupId === anchor.scrollGroupId)
  if (at < 0) return null
  const row = rows[at]; if (row === undefined) return null
  const below = rows[at + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  const into = Number.isFinite(anchor.scrollGroupOffset) ? anchor.scrollGroupOffset : 0
  return row.y + into * slab
}
function scrollOffsetOf(rows: readonly Row[], settings: Anchor, rowAreaY: number): number {
  const anchoredAt = rows.findIndex((row) => row.groupId === settings.scrollGroupId)
  if (anchoredAt < 0) return 0
  const held = Number.isFinite(settings.scrollGroupOffset) ? settings.scrollGroupOffset : 0
  const carriedRows = Math.floor(held)
  const landedAt = Math.min(rows.length - 1, Math.max(0, anchoredAt + carriedRows))
  const row = rows[landedAt]; if (row === undefined) return 0
  const below = rows[landedAt + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  return row.y + (held - carriedRows) * slab - rowAreaY
}
const rows: Row[] = [{ groupId: 'a', y: 100, height: 20 }, { groupId: 'b', y: 124, height: 60 }, { groupId: 'c', y: 190, height: 30 }]
const rowAreaY = 100
for (const [id, off] of [['a', 0], ['a', 0.5], ['b', 0.5], ['c', 0.5], ['a', 1.5], ['a', 2.25], ['b', -0.5], ['a', -0.5], ['a', NaN], ['c', 3], ['zz', 0.5]] as [string, number][]) {
  const p = rowPointIn(rows, { scrollGroupId: id, scrollGroupOffset: off })
  const s = scrollOffsetOf(rows, { scrollGroupId: id, scrollGroupOffset: off }, rowAreaY) + rowAreaY
  console.log(`${id} offset ${off}`.padEnd(16), 'rowPointIn', p, '| scrollOffsetOf+rowAreaY', s, p === s ? '' : '<-- DIFFER')
}
