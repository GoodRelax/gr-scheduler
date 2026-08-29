import { open, press, until, count, page, close } from '../harness.mjs'
const IDS = ['IC-27','IC-28','IC-29','IC-30','IC-31','IC-32','IC-33','IC-34',
             'IC-83','IC-84','IC-85','IC-86','IC-87','IC-88','IC-89']
const sig = (x, y) => page().evaluate(([px, py]) => {
  for (const n of document.querySelectorAll('[data-role="Schedule Canvas"] svg polygon,[data-role="Schedule Canvas"] svg path')) {
    const r = n.getBoundingClientRect()
    if (Math.abs(r.x + r.width / 2 - px) < 30 && Math.abs(r.y + r.height / 2 - py) < 30 && r.width > 20) {
      const d = n.getAttribute('d') ?? ''
      return n.tagName === 'path'
        ? `path/${(d.match(/M/g) ?? []).length}sub`
        : `poly/${(n.getAttribute('points') ?? '').trim().split(/\s+/).length}pt`
    }
  }
  return 'none'
}, [x, y])

await open()
await until(async () => (await count('svg polygon')) > 0, 'lands')
await press('IC-50'); await page().waitForTimeout(250)
await press('IC-27')
const X = 700, Y = 460
await page().mouse.move(X, Y); await page().mouse.down(); await page().mouse.move(X + 8, Y + 8); await page().mouse.up()
await page().waitForTimeout(350)
await page().mouse.move(X, Y); await page().mouse.down(); await page().mouse.up()
await page().waitForTimeout(150)
const out = []
for (const id of IDS) {
  await press(id)
  await page().waitForTimeout(120)
  out.push(`${id}=${await sig(X, Y)}`)
}
console.log(out.join('\n'))
await close()
