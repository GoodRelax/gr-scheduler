// The two background gestures, with a reference that does not move under the
// reader: the leftmost date the ruler prints, and the count of selection
// frames. An empty spot is found by asking the app itself (PD-5 puts the
// default arrow where nothing is under the pointer).
import { open, until, count, page, close } from '../harness.mjs'

const CANVAS = '[data-role="Schedule Canvas"]'

const cursorAt = async (x, y) => {
  await page().mouse.move(x, y)
  return page().evaluate((sel) => document.querySelector(sel)?.style.cursor ?? '', CANVAS)
}

const state = () => page().evaluate(() => {
  const ruler = document.querySelector('[data-role="Time Ruler"]')
  const labels = ruler === null ? [] : [...ruler.querySelectorAll('text')]
    .map((n) => ({ x: n.getBoundingClientRect().x, t: (n.textContent ?? '').trim() }))
    .filter((o) => o.t.length > 0)
    .sort((a, b) => a.x - b.x)
  const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
  return {
    rulerLeft: labels.slice(0, 3).map((o) => o.t).join(' | '),
    frames: svg.querySelectorAll('[stroke-dasharray="2 2"]').length,
    rows: document.querySelectorAll('[data-depth]').length,
    topRow: (document.querySelector('[data-depth]')?.textContent ?? '').trim().slice(0, 18),
  }
})

const findEmpty = async () => {
  for (let y = 320; y < 1000; y += 11) {
    for (let x = 700; x < 1800; x += 37) {
      if ((await cursorAt(x, y)) === 'default') return { x, y }
    }
  }
  return null
}

async function drag(label, { button = 'left', ctrl = false, from, to }) {
  await open()
  await until(async () => (await count('svg polygon')) > 0, 'the picture lands')
  const before = await state()
  if (ctrl) await page().keyboard.down('Control')
  await page().mouse.move(from.x, from.y)
  const seen = await page().evaluate(() => {
    let got = null
    const h = (e) => { got = { ctrl: e.ctrlKey, button: e.button } }
    window.addEventListener('pointerdown', h, { capture: true, once: true })
    return new Promise((r) => setTimeout(() => r(got), 400))
  })
  await page().mouse.down({ button })
  await page().mouse.move(to.x, to.y, { steps: 4 })
  const held = await state()
  await page().mouse.up({ button })
  if (ctrl) await page().keyboard.up('Control')
  const after = await state()
  console.log(`--- ${label}: ${from.x},${from.y} -> ${to.x},${to.y} ---`)
  console.log('  the page saw on pointerdown:', JSON.stringify(seen))
  console.log('  before     :', JSON.stringify(before))
  console.log('  while held :', JSON.stringify(held))
  console.log('  after      :', JSON.stringify(after))
}

await open()
await until(async () => (await count('svg polygon')) > 0, 'the picture lands')
const empty = await findEmpty()
console.log('a point the app itself calls empty:', JSON.stringify(empty))
await close()

const from = empty ?? { x: 1000, y: 700 }
const to = { x: from.x - 250, y: from.y - 160 }
await drag('Ctrl + left drag', { ctrl: true, from, to })
await drag('middle-button drag', { button: 'middle', from, to })
await drag('plain left drag', { from, to })
await close()
