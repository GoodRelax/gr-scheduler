# Build lm19-swap.mjs from the fix tree's lm-19 probe (scratch only, gitignored).
s = open('fix/tools/probe/examples/lm-19-frame-time-baseline.mjs', encoding='utf-8').read()
def rep(o, n):
    global s
    assert s.count(o) == 1, o[:60]
    s = s.replace(o, n)
rep("const ROOT = path.resolve(HERE, '../../..')", "const ROOT = path.resolve(process.env.TREE)")
rep("  await page.addInitScript(probeSource)\n",
"""  await page.addInitScript(probeSource)
  const SWAP = process.env.SWAP ?? 'none'
  await page.addInitScript((variant) => {
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
    const onText = (svg, f) => svg.replace(/<text\b[^>]*>/g, f)
    const swaps = {
      none: (v) => v,
      nomask: (v) => v.replace(/ mask="url\(#[^)]*\)"/g, ''),
      nofont: (v) => onText(v, (t) => t.replace(/ font-family="[^"]*"/, '')),
      nohalo: (v) => onText(v, (t) => t.replace(/ stroke="[^"]*" stroke-width="[^"]*"/, '').replace(' stroke-linejoin="round" paint-order="stroke"', '')),
      nomaskdefs: (v) => v.replace(/ mask="url\(#[^)]*\)"/g, '').replace(/<mask\b[\s\S]*?<\/mask>/g, ''),
    }
    const chain = variant.split('+').map((k) => swaps[k])
    window.__swapSeen = { calls: 0, before: 0, after: 0 }
    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: true,
      get() { return d.get.call(this) },
      set(v) {
        if (typeof v === 'string' && v.startsWith('<svg')) {
          window.__swapSeen.calls += 1
          window.__swapSeen.before = v.length
          for (const f of chain) v = f(v)
          window.__swapSeen.after = v.length
        }
        d.set.call(this, v)
      },
    })
  }, SWAP)
""")
# QUICK: only MK-1 and MK-2, no pan/select, no write cost.
rep("  await burst(cdp, [\n    { type: 'mouseMoved', x: box.x, y: box.y, modifiers: CTRL },",
"  const QUICK = process.env.QUICK === '1'\n  if (!QUICK) {\n  await burst(cdp, [\n    { type: 'mouseMoved', x: box.x, y: box.y, modifiers: CTRL },")
rep("  rounds['MK-6 range select'] = await driveStretch(page, 'MK-6 range select',\n    (r) => burst(cdp, path_(r, 0)), args.samples)\n  await burst(cdp, [{ type: 'mouseReleased', x: box.x, y: box.y, button: 'left', buttons: 0, clickCount: 1 }])\n",
"  rounds['MK-6 range select'] = await driveStretch(page, 'MK-6 range select',\n    (r) => burst(cdp, path_(r, 0)), args.samples)\n  await burst(cdp, [{ type: 'mouseReleased', x: box.x, y: box.y, button: 'left', buttons: 0, clickCount: 1 }])\n  }\n")
rep("  for (let i = 0; i < args.writes; i += 1) {", "  for (let i = 0; i < (QUICK ? 0 : args.writes); i += 1) {")
rep("  if (writeInputToRedrawEnd.length === 0 && args.writes > 0)", "  if (!QUICK && writeInputToRedrawEnd.length === 0 && args.writes > 0)")
# Trace MK-1 on all threads when TRACE names a file.
rep("  rounds['MK-1 scroll'] = await driveStretch(page, 'MK-1 scroll',\n    (r) => burst(cdp, wheels(r, 12, 90, 0)), args.samples)\n",
"""  if (process.env.TRACE) await browser.startTracing(page, { path: process.env.TRACE, categories: ['toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'cc', 'gpu', 'viz', 'benchmark', 'input', 'blink', 'skia'] })
  rounds['MK-1 scroll'] = await driveStretch(page, 'MK-1 scroll',
    (r) => burst(cdp, wheels(r, 12, 90, 0)), args.samples)
  if (process.env.TRACE) await browser.stopTracing()
""")
rep("    notMeasured: [],\n  }\n", """    notMeasured: [],
    swap: { variant: SWAP, seen: await page.evaluate(() => window.__swapSeen) },
    census: await page.evaluate(() => {
      const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
      const tags = {}
      for (const e of svg.querySelectorAll('*')) tags[e.tagName] = (tags[e.tagName] ?? 0) + 1
      return { total: svg.querySelectorAll('*').length, chars: svg.outerHTML.length, masked: svg.querySelectorAll('[mask]').length,
        textWithFont: svg.querySelectorAll('text[font-family]').length, textWithHalo: svg.querySelectorAll('text[paint-order]').length, tags }
    }),
  }
""")
open('lm19-swap.mjs', 'w', encoding='utf-8').write(s)
print('ok')
