// Is the vertical pan 等倍, or does it land only on rows?
import { open, until, count, page, close } from '../harness.mjs'

const marker = () => page().evaluate(() => {
  const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
  const ys = [...svg.querySelectorAll('polygon')]
    .map((n) => n.getBoundingClientRect())
    .filter((r) => r.width > 20 && r.height > 4)
    .map((r) => Math.round(r.y * 10) / 10)
  return ys.length === 0 ? null : Math.min(...ys)
})

await open()
await until(async () => (await count('svg polygon')) > 0, 'the picture lands')
const base = await marker()
console.log('top bar y before:', base)
await page().keyboard.down('Control')
await page().mouse.move(1000, 800)
await page().mouse.down()
const seen = []
for (let dy = 2; dy <= 80; dy += 2) {
  await page().mouse.move(1000, 800 - dy)
  seen.push({ dy, moved: Math.round(((await marker()) - base) * 10) / 10 })
}
await page().mouse.up()
await page().keyboard.up('Control')
console.log('pointer dy -> picture moved by:')
console.log(seen.map((s) => `${s.dy}:${s.moved}`).join('  '))
const dead = seen.filter((s, i) => i > 0 && s.moved === seen[i - 1].moved)
console.log('steps where the picture did NOT move:', dead.length, 'of', seen.length - 1)
await close()
