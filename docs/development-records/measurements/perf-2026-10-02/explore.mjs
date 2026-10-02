// Explore: from the startup view at display scale 175, Ctrl+wheel notches out/in; census the shade per notch.
import { chromium } from 'playwright'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const BUILD = path.resolve(process.argv[2], 'dist', 'index.html')
const SVG = '[data-role="Schedule Canvas"] svg'
async function settle(page) { await page.waitForSelector(SVG, { state: 'attached', timeout: 60000 }); let p = null; for (let i = 0; i < 120; i++) { await page.waitForTimeout(250); const n = await page.evaluate((s) => document.querySelector(s)?.outerHTML ?? null, SVG); if (n !== null && n === p) return; p = n } }
async function press(page, x, y) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(800) }
async function raiseScale(page, wanted) { for (let i = 0; i < 12; i++) { const at = await page.evaluate(() => { const b = document.querySelector('[data-icon="IC-105"]')?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null }); await press(page, at.x, at.y); const step = Number(/\d+/.exec(await page.evaluate(() => document.querySelector('[data-scale-message]')?.textContent ?? ''))?.[0]); if (step === wanted) return } throw new Error('scale') }
const census = (page) => page.evaluate((s) => { const svg = document.querySelector(s); const sh = svg.querySelector('[data-figure="non-working-days"]'); return { el: svg.querySelectorAll('*').length, shadeRuns: sh ? (sh.getAttribute('d').match(/M/g) || []).length : 0, d: sh ? sh.getAttribute("d").slice(0, 120) : null } }, SVG)
const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const page = await ctx.newPage()
await page.goto(pathToFileURL(BUILD).href); await settle(page); await raiseScale(page, 175); await page.mouse.move(0, 0); await settle(page)
const box = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }, SVG)
const cdp = await ctx.newCDPSession(page)
console.log('start', JSON.stringify(await census(page)))
const dir = Number(process.argv[3] ?? 120)
for (let i = 1; i <= Number(process.argv[4] ?? 16); i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: dir, modifiers: 2 }); await page.waitForTimeout(300); await settle(page); console.log(i, JSON.stringify(await census(page))) }
await browser.close()
