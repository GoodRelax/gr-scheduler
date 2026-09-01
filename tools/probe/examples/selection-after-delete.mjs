// Ctrl+A, Delete, confirm, then arm a palette shape: the notice that used to
// appear came from a selection still pointing at deleted tasks.
import { open, press, key, until, count, roles, page, close }
  from '../harness.mjs'

const notices = () => page().evaluate(() =>
  [...document.querySelectorAll('[data-role]')]
    .filter((n) => (n.getAttribute('data-role') ?? '').includes('Notification'))
    .map((n) => (n.textContent ?? '').trim())
    .filter((t) => t.length > 0))

await open()
await until(async () => (await count('svg polygon')) > 0, 'the picture lands')
await page().mouse.move(1000, 700)
await key('Control+a')
await page().waitForTimeout(200)
await key('Delete')
// ⛔ THE ANSWER IS A WORD BUTTON, NOT AN ICON, from 2026-09-02 (NT-7 of table
// T-037). It carries `data-confirmation-answer` and no `data-icon`, so `IC-69`
// and `IC-70` were retired from table T-109 and figure F-019. `press()` only
// knows `data-icon`, so the button is reached with a real pointer at its centre.
const PROCEED = '[data-confirmation-answer="proceed"]'
const asked = await until(async () => (await count(PROCEED)) === 1,
  'the confirmation stands', { timeout: 3000 }).catch(() => false)
console.log('confirmation asked:', asked !== false)
if (asked !== false) {
  const box = await (await page().$(PROCEED)).boundingBox()
  await page().mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page().mouse.down()
  await page().mouse.up()
}
await page().waitForTimeout(500)
console.log('polygons left     :', await count('svg polygon'))
console.log('notices before arming:', JSON.stringify(await notices()))

// arm a task shape from the palette -- the press the user reported
const armed = await press("IC-23")
console.log('pressed a palette shape:', armed)
await page().waitForTimeout(600)
console.log('notices after arming :', JSON.stringify(await notices()))
console.log('roles on screen      :', (await roles()).filter((r) => r.includes('Notification')))
await close()
