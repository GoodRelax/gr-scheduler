// The marquee rectangle, drawn into the real page in each of the three ways,
// so the shape can be judged from pixels rather than from words.
import { open, page, shot, close } from '../harness.mjs'

await open()

// A patch of the Row Area with several bars in it.
const BOX = { x: 260, y: 300, w: 520, h: 220 }
const CLIP = { x: 170, y: 260, width: 760, height: 300 }

const OPTIONS = [
  { name: 'marquee-a', stroke: 'hsl(214 59% 32%)', width: 2, dash: '2 2', fill: 'none' },
  { name: 'marquee-b', stroke: 'hsl(214 14% 87%)', width: 1, dash: '', fill: 'none' },
  { name: 'marquee-c', stroke: 'hsl(214 59% 32%)', width: 2, dash: '2 2',
    fill: 'hsl(214 59% 32%)', fillOpacity: '0.12' },
]

for (const o of OPTIONS) {
  await page().evaluate((opt) => {
    document.getElementById('probe-marquee')?.remove()
    const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
    const box = { x: 260, y: 300, w: 520, h: 220 }
    const host = svg.getBoundingClientRect()
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    r.id = 'probe-marquee'
    r.setAttribute('x', String(box.x - host.x))
    r.setAttribute('y', String(box.y - host.y))
    r.setAttribute('width', String(box.w))
    r.setAttribute('height', String(box.h))
    r.setAttribute('fill', opt.fill)
    if (opt.fillOpacity) r.setAttribute('fill-opacity', opt.fillOpacity)
    r.setAttribute('stroke', opt.stroke)
    r.setAttribute('stroke-width', String(opt.width))
    if (opt.dash) r.setAttribute('stroke-dasharray', opt.dash)
    svg.appendChild(r)
  }, o)
  await shot(o.name, CLIP)
  console.log('shot', o.name)
}

// And the same patch with nothing drawn -- what a drag looks like today.
await page().evaluate(() => document.getElementById('probe-marquee')?.remove())
await shot('marquee-none', CLIP)
console.log('shot marquee-none', JSON.stringify(BOX))
await close()
