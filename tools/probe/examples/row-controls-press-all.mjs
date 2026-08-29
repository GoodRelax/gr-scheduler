// Press EVERY entry of the row title panel, one per fresh page, and say which
// ones did nothing.
//
// ⭐⭐ WHAT THIS FOUND (2026-08-30, the ledger's D-142). Six of the thirty-five
// presses moved nothing, and all six were the "open" control -- IC-58 on five
// rows and IC-74 at the panel's head. ⛔ THE FIRST SUSPICION WAS WRONG: the
// wiring was not stale. Fold something first and the very same control works.
// The real fault is that a DISARMED entry and an ARMED one are identical on
// screen -- same opacity, same colour, same `pointer` cursor, no `disabled`
// attribute -- so at startup, when nothing is folded, every "open" on screen is
// dead and nothing says so.
//
// ⛔ WHY ONE FRESH PAGE PER PRESS. Folding a row changes which controls the
// next row even carries. Measuring them all on one page measures the presses
// that came before, not the press at hand.
//
// ⛔ WHY THE REGION AND NOT THE DOM. The row controls are not descendants of
// `[data-role="Row Title Panel"]`; an earlier probe queried inside that element
// and concluded IC-82 was never drawn.
//
//   node tools/probe/examples/row-controls-press-all.mjs
import {
  open, rows, rowPanel, hoverRow, panelEntries, pressPanelEntry, pointerAway, close,
} from '../harness.mjs'

/** A board wide enough that any of the seven entries would disturb it. */
const board = (p) => p.evaluate(() => ({
  rows: document.querySelectorAll('[data-depth]').length,
  pinned: document.querySelectorAll('[data-pinned="true"]').length,
  arming: [...document.querySelectorAll('[data-can-open]')]
    .map((n) => n.getAttribute('data-can-open')).join(''),
  roles: [...new Set([...document.querySelectorAll('[data-role]')]
    .map((n) => n.getAttribute('data-role')))].sort().join(','),
  texts: document.querySelectorAll('svg text').length,
}))

const p = await open()
console.log('panel', JSON.stringify(await rowPanel()))

// Plan on one page; act on a fresh one per press.
const plan = [{ y: null, where: 'panel head', icon: 'IC-74' },
              { y: null, where: 'panel head', icon: 'IC-78' }]
await pointerAway()
for (const row of await rows()) {
  await hoverRow(row.y)
  for (const e of await panelEntries(row.y)) {
    plan.push({ y: row.y, where: `d=${row.depth} "${row.text.slice(0, 17)}"`, icon: e.icon })
  }
}
console.log(`${plan.length} presses\n`)

const dead = []
for (const item of plan) {
  const page = await open({ settle: 1200 })
  if (item.y !== null) await hoverRow(item.y)
  const was = await board(page)
  if (!await pressPanelEntry(item.y, item.icon)) {
    console.log(`MISSING ${item.icon} ${item.where}`)
    continue
  }
  await page.waitForTimeout(500)
  const now = await board(page)
  const moved = Object.keys(was).filter((k) => was[k] !== now[k])
  if (moved.length === 0) dead.push(`${item.icon} ${item.where}`)
  console.log(`${moved.length ? 'MOVED' : 'DEAD '} ${item.icon} ${item.where} ${moved.join(' ')}`)
}

console.log(`\nDEAD ${dead.length} / ${plan.length}`)
for (const d of dead) console.log('  ' + d)
console.log('\n⛔ A dead entry is not proof of a dead wire -- arm it and press again.')
await close()
